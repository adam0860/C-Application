import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-io-performance',
  title: 'Buffering, Caching and Asynchronous I/O',
  summary:
    'The page cache, read-ahead and write-back, what fsync really costs, memory-mapped files, direct and asynchronous I/O (io_uring, IOCP), and how engines stream assets without hitches.',
  minutes: 22,
  objectives: [
    'Trace data through the buffering layers (your process, the page cache, the drive cache) and say which failures lose data at each layer',
    'Predict page-cache hits and misses with read-ahead, and use access hints such as `posix_fadvise` and `FILE_FLAG_SEQUENTIAL_SCAN`',
    'Explain write-back, dirty pages and the cost of `fsync`, and keep durability work off the game thread',
    'Use `mmap` to read a pak file, and explain its page-fault behaviour, its risks and when direct I/O is the better choice',
    'Describe asynchronous I/O with io_uring and Windows overlapped I/O with completion ports, and design a background asset streamer that never blocks the frame',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Where your bytes wait',
      blocks: [
        {
          type: 'p',
          text: "Disks are slow and RAM is fast, so every layer of the I/O stack keeps a copy of recently used data. That makes I/O fast, and it makes reasoning about I/O tricky: when `write` returns, your bytes may have travelled only one layer. Here are the layers a save file passes through:",
        },
        {
          type: 'figure',
          svg: "<svg viewBox=\"0 0 520 280\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"14\" y=\"12\" width=\"300\" height=\"42\" rx=\"4\" class=\"f-blue\" fill-opacity=\"0.14\"/><rect x=\"14\" y=\"12\" width=\"300\" height=\"42\" rx=\"4\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.5\"/><text x=\"24\" y=\"30\" font-size=\"12\" text-anchor=\"start\" class=\"t-blue\" font-weight=\"700\">std::ofstream / FILE* buffer</text><text x=\"24\" y=\"46\" font-size=\"10.5\" text-anchor=\"start\">in your process</text><text x=\"506\" y=\"38\" font-size=\"10.5\" text-anchor=\"end\" class=\"t-red\">lost if the process crashes</text><line x1=\"40\" y1=\"54\" x2=\"40\" y2=\"78\" class=\"s-gray\" stroke-width=\"1.4\"/><path d=\"M40 84 L36.5 78 L43.5 78 Z\" class=\"f-gray\"/><text x=\"52\" y=\"73\" font-size=\"10.5\" text-anchor=\"start\" class=\"t-gray\">flush(), buffer full, or destructor → write()</text><rect x=\"14\" y=\"84\" width=\"300\" height=\"42\" rx=\"4\" class=\"f-green\" fill-opacity=\"0.14\"/><rect x=\"14\" y=\"84\" width=\"300\" height=\"42\" rx=\"4\" fill=\"none\" class=\"s-green\" stroke-width=\"1.5\"/><text x=\"24\" y=\"102\" font-size=\"12\" text-anchor=\"start\" class=\"t-green\" font-weight=\"700\">kernel page cache (dirty pages)</text><text x=\"24\" y=\"118\" font-size=\"10.5\" text-anchor=\"start\">in kernel RAM</text><text x=\"506\" y=\"110\" font-size=\"10.5\" text-anchor=\"end\" class=\"t-red\">lost on kernel panic or power loss</text><line x1=\"40\" y1=\"126\" x2=\"40\" y2=\"150\" class=\"s-gray\" stroke-width=\"1.4\"/><path d=\"M40 156 L36.5 150 L43.5 150 Z\" class=\"f-gray\"/><text x=\"52\" y=\"145\" font-size=\"10.5\" text-anchor=\"start\" class=\"t-gray\">fsync() now, or background writeback (~5–30 s)</text><rect x=\"14\" y=\"156\" width=\"300\" height=\"42\" rx=\"4\" class=\"f-orange\" fill-opacity=\"0.14\"/><rect x=\"14\" y=\"156\" width=\"300\" height=\"42\" rx=\"4\" fill=\"none\" class=\"s-orange\" stroke-width=\"1.5\"/><text x=\"24\" y=\"174\" font-size=\"12\" text-anchor=\"start\" class=\"t-orange\" font-weight=\"700\">drive write cache</text><text x=\"24\" y=\"190\" font-size=\"10.5\" text-anchor=\"start\">DRAM on the SSD/HDD</text><text x=\"506\" y=\"182\" font-size=\"10.5\" text-anchor=\"end\" class=\"t-red\">lost on power loss (unless PLP)</text><line x1=\"40\" y1=\"198\" x2=\"40\" y2=\"222\" class=\"s-gray\" stroke-width=\"1.4\"/><path d=\"M40 228 L36.5 222 L43.5 222 Z\" class=\"f-gray\"/><text x=\"52\" y=\"217\" font-size=\"10.5\" text-anchor=\"start\" class=\"t-gray\">FLUSH / FUA command (fsync sends it)</text><rect x=\"14\" y=\"228\" width=\"300\" height=\"42\" rx=\"4\" class=\"f-purple\" fill-opacity=\"0.14\"/><rect x=\"14\" y=\"228\" width=\"300\" height=\"42\" rx=\"4\" fill=\"none\" class=\"s-purple\" stroke-width=\"1.5\"/><text x=\"24\" y=\"246\" font-size=\"12\" text-anchor=\"start\" class=\"t-purple\" font-weight=\"700\">flash cells / platters</text><text x=\"24\" y=\"262\" font-size=\"10.5\" text-anchor=\"start\">durable</text><text x=\"506\" y=\"254\" font-size=\"10.5\" text-anchor=\"end\" class=\"t-green\">survives power loss</text></svg>",
          alt: 'Four stacked layers. A std::ofstream or FILE* buffer in your process, lost if the process crashes, is drained by write() into the kernel page cache, lost on kernel panic or power loss. Background writeback or fsync moves it to the drive write cache, lost on power loss unless the drive has power-loss protection. A FLUSH or FUA command moves it to flash cells or platters, which survive power loss.',
          caption: 'Each arrow is a separate step with its own trigger. Only the bottom layer survives a power cut.',
        },
        {
          type: 'p',
          text: "The top layer is the user-space buffer inside `FILE*` or `std::ofstream`, which you met in the *System Calls from C++* lesson: it turns thousands of tiny writes into a few `write` calls. This lesson is about the layer below it, the kernel's [[page-cache]], and about what to do when even that is not the right tool.",
        },
        {
          type: 'definition',
          term: 'Page cache',
          text: 'Kernel memory holding pages of file data, indexed by (file, offset). Every buffered `read` is served from it and every buffered `write` lands in it. On Linux it is unified with virtual memory: the same physical pages back `read`, `write` and `mmap` of a file. Windows\' Cache Manager plays the same role.',
        },
        {
          type: 'p',
          text: "The page cache uses whatever RAM programs are not using, and gives it back when they need it. That is why a freshly booted machine \"has\" lots of free memory and a busy one has almost none, without anything being wrong:",
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Real output: memory on a Linux VM (MiB)',
          code: `$ free -m
               total        used        free      shared  buff/cache   available
Mem:            8024        1233        6057          12         965        6790`,
          annotations: [
            { lines: 3, text: '`buff/cache` is mostly the page cache: 965 MiB of file data kept around in case it is needed again. `available` counts it as reclaimable, which is why it exceeds `free`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why cache in the kernel and not just in each program?',
          text: 'A kernel cache is **shared**: the shader cache your game wrote yesterday, the DLLs every process loads, the level a second game instance reads, all come from one copy in RAM. It survives your process exiting, so a relaunched game loads faster the second time. And only the kernel knows the global memory picture, so only it can decide fairly what to evict. The cost is one extra copy per `read`, from the cache into your buffer.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Reads: hits, misses and read-ahead',
      blocks: [
        {
          type: 'p',
          text: "A `read` that finds its pages in the cache is a **hit**: a `memcpy` from kernel memory, microseconds. A **miss** blocks the thread while the kernel fetches the pages from the device. The kernel's best trick for avoiding misses is [[read-ahead]]: when it sees a file being read sequentially, it fetches the *next* pages in the same request, before you ask for them, so the next several reads hit.",
        },
        {
          "type": "algo",
          "view": "array",
          "interval": 1300,
          "caption": "Reads through a tiny page cache with LRU eviction and a 4-page read-ahead window. Cells are cache slots; values are file page numbers.",
          "frames": [
            {
              "note": "A 6-page cache in front of the disk (real caches hold millions of pages). The game reads a file page by page.",
              "array": [
                "·",
                "·",
                "·",
                "·",
                "·",
                "·"
              ],
              "vars": [
                [
                  "read page",
                  "—"
                ],
                [
                  "hits",
                  "0"
                ],
                [
                  "misses",
                  "0"
                ],
                [
                  "disk requests",
                  "0"
                ]
              ]
            },
            {
              "note": "Page 0: **miss**. The access looks sequential, so one request reads pages 0–3 (read-ahead, blue).",
              "array": [
                0,
                1,
                2,
                3,
                "·",
                "·"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "orange"
                },
                {
                  "index": 1,
                  "color": "blue"
                },
                {
                  "index": 2,
                  "color": "blue"
                },
                {
                  "index": 3,
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "read page",
                  "0"
                ],
                [
                  "hits",
                  "0"
                ],
                [
                  "misses",
                  "1"
                ],
                [
                  "disk requests",
                  "1"
                ]
              ]
            },
            {
              "note": "Page 1: **hit**. Copied from RAM, no disk access.",
              "array": [
                0,
                1,
                2,
                3,
                "·",
                "·"
              ],
              "marks": [
                {
                  "index": 1,
                  "color": "green"
                }
              ],
              "vars": [
                [
                  "read page",
                  "1"
                ],
                [
                  "hits",
                  "1"
                ],
                [
                  "misses",
                  "1"
                ],
                [
                  "disk requests",
                  "1"
                ]
              ]
            },
            {
              "note": "Page 2: **hit**. Copied from RAM, no disk access.",
              "array": [
                0,
                1,
                2,
                3,
                "·",
                "·"
              ],
              "marks": [
                {
                  "index": 2,
                  "color": "green"
                }
              ],
              "vars": [
                [
                  "read page",
                  "2"
                ],
                [
                  "hits",
                  "2"
                ],
                [
                  "misses",
                  "1"
                ],
                [
                  "disk requests",
                  "1"
                ]
              ]
            },
            {
              "note": "Page 3: **hit**. Copied from RAM, no disk access.",
              "array": [
                0,
                1,
                2,
                3,
                "·",
                "·"
              ],
              "marks": [
                {
                  "index": 3,
                  "color": "green"
                }
              ],
              "vars": [
                [
                  "read page",
                  "3"
                ],
                [
                  "hits",
                  "3"
                ],
                [
                  "misses",
                  "1"
                ],
                [
                  "disk requests",
                  "1"
                ]
              ]
            },
            {
              "note": "Page 4: **miss**. The access looks sequential, so one request reads pages 4–7 (read-ahead, blue). Evicts LRU pages 0, 1.",
              "array": [
                6,
                7,
                2,
                3,
                4,
                5
              ],
              "marks": [
                {
                  "index": 4,
                  "color": "orange"
                },
                {
                  "index": 5,
                  "color": "blue"
                },
                {
                  "index": 0,
                  "color": "blue"
                },
                {
                  "index": 1,
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "read page",
                  "4"
                ],
                [
                  "hits",
                  "3"
                ],
                [
                  "misses",
                  "2"
                ],
                [
                  "disk requests",
                  "2"
                ]
              ]
            },
            {
              "note": "Page 5: **hit**. Copied from RAM, no disk access.",
              "array": [
                6,
                7,
                2,
                3,
                4,
                5
              ],
              "marks": [
                {
                  "index": 5,
                  "color": "green"
                }
              ],
              "vars": [
                [
                  "read page",
                  "5"
                ],
                [
                  "hits",
                  "4"
                ],
                [
                  "misses",
                  "2"
                ],
                [
                  "disk requests",
                  "2"
                ]
              ]
            },
            {
              "note": "Page 6: **hit**. Copied from RAM, no disk access.",
              "array": [
                6,
                7,
                2,
                3,
                4,
                5
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "green"
                }
              ],
              "vars": [
                [
                  "read page",
                  "6"
                ],
                [
                  "hits",
                  "5"
                ],
                [
                  "misses",
                  "2"
                ],
                [
                  "disk requests",
                  "2"
                ]
              ]
            },
            {
              "note": "Page 7: **hit**. Copied from RAM, no disk access.",
              "array": [
                6,
                7,
                2,
                3,
                4,
                5
              ],
              "marks": [
                {
                  "index": 1,
                  "color": "green"
                }
              ],
              "vars": [
                [
                  "read page",
                  "7"
                ],
                [
                  "hits",
                  "6"
                ],
                [
                  "misses",
                  "2"
                ],
                [
                  "disk requests",
                  "2"
                ]
              ]
            },
            {
              "note": "Page 2 again: still cached, **hit**. Read-ahead did not evict it yet.",
              "array": [
                6,
                7,
                2,
                3,
                4,
                5
              ],
              "marks": [
                {
                  "index": 2,
                  "color": "green"
                }
              ],
              "vars": [
                [
                  "read page",
                  "2"
                ],
                [
                  "hits",
                  "7"
                ],
                [
                  "misses",
                  "2"
                ],
                [
                  "disk requests",
                  "2"
                ]
              ]
            },
            {
              "note": "Page 20: **miss**, and not sequential: read just that page. Evicts LRU page 3.",
              "array": [
                6,
                7,
                2,
                20,
                4,
                5
              ],
              "marks": [
                {
                  "index": 3,
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "read page",
                  "20"
                ],
                [
                  "hits",
                  "7"
                ],
                [
                  "misses",
                  "3"
                ],
                [
                  "disk requests",
                  "3"
                ]
              ]
            },
            {
              "note": "Page 3: **miss**, and not sequential: read just that page. Evicts LRU page 4.",
              "array": [
                6,
                7,
                2,
                20,
                3,
                5
              ],
              "marks": [
                {
                  "index": 4,
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "read page",
                  "3"
                ],
                [
                  "hits",
                  "7"
                ],
                [
                  "misses",
                  "4"
                ],
                [
                  "disk requests",
                  "4"
                ]
              ]
            },
            {
              "note": "11 reads, **7 hits**, 4 misses, 4 disk requests. Sequential access is nearly free; random access pays full price.",
              "array": [
                6,
                7,
                2,
                20,
                3,
                5
              ],
              "vars": [
                [
                  "read page",
                  "—"
                ],
                [
                  "hits",
                  "7"
                ],
                [
                  "misses",
                  "4"
                ],
                [
                  "disk requests",
                  "4"
                ]
              ]
            }
          ]
        },
        {
          type: 'p',
          text: "Linux starts with a small read-ahead window and grows it while the access stays sequential, up to a per-device maximum (`read_ahead_kb`, commonly 128 KiB). Random access shrinks it back. Eviction approximates [[lru]]: Linux keeps *active* and *inactive* lists so that a single large sequential scan does not flush out pages used over and over.",
        },
        {
          type: 'p',
          text: 'You can help the kernel by saying how you will read a file:',
        },
        {
          type: 'table',
          headers: ['Intent', 'POSIX / Linux', 'Windows'],
          rows: [
            ['Reading straight through', '`posix_fadvise(fd, 0, 0, POSIX_FADV_SEQUENTIAL)`', '`FILE_FLAG_SEQUENTIAL_SCAN` in `CreateFileW`'],
            ['Jumping around', '`POSIX_FADV_RANDOM` (disables read-ahead)', '`FILE_FLAG_RANDOM_ACCESS`'],
            ['Will need this range soon', '`POSIX_FADV_WILLNEED` or `readahead()`', '`PrefetchVirtualMemory` on a mapped view'],
            ['Done with it, do not cache', '`POSIX_FADV_DONTNEED`', '`FILE_FLAG_NO_BUFFERING` (direct I/O)'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Benchmarking loads? Mind the cache',
          text: "The second time you load a level, it usually comes from RAM, not the SSD. A load-time measurement that ignores this will look great on the developer's machine and terrible on a player's first launch. Measure cold loads deliberately: on Linux, `echo 3 > /proc/sys/vm/drop_caches` as root; on Windows, reboot or use a tool that flushes the standby list.",
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'numeric',
      prompt: 'A tool reads a **1 MiB** file from start to end with `read()` calls of **4 KiB** each, and nothing of the file is cached. Use a simplified model: every miss reads the requested page plus the following pages, **128 KiB** in total, in one disk request. How many `read()` calls miss the page cache?',
      hint: 'Each miss brings in 128 KiB. How many 128 KiB chunks make 1 MiB?',
      answer: 8,
      unit: 'misses',
      explanation: 'There are 1,048,576 / 4,096 = 256 reads. The first read misses and pulls in pages 0 to 31 (128 KiB), so reads 2 to 32 hit; the 33rd misses and fetches the next 128 KiB, and so on: 1 MiB / 128 KiB = **8** misses and 248 hits, a hit rate of about 97%. Real Linux starts with a smaller window and ramps up, and it also reads ahead *asynchronously* when you approach the end of the window, so a steady sequential reader often never waits at all.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Writes: dirty pages, writeback and fsync',
      blocks: [
        {
          type: 'p',
          text: "A buffered `write` copies your data into page-cache pages, marks them **dirty**, and returns. Background *flusher* threads write dirty pages back later. That delay is a feature: a file rewritten ten times in a second is written to disk once, temporary files deleted quickly never reach the disk at all, and writes can be sorted and merged into big sequential requests.",
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Real output: Linux writeback settings (defaults, kernel 6.18)',
          code: `$ cat /proc/sys/vm/dirty_expire_centisecs \\
      /proc/sys/vm/dirty_writeback_centisecs \\
      /proc/sys/vm/dirty_background_ratio /proc/sys/vm/dirty_ratio
3000
500
10
20`,
          annotations: [
            { lines: 4, text: 'Dirty data older than 30 s is eligible for writeback…' },
            { lines: 5, text: '…and the flusher threads wake every 5 s to look for it.' },
            { lines: 6, text: 'When dirty pages exceed 10% of available memory, background writeback starts regardless of age.' },
            { lines: 7, text: 'At 20%, a process that keeps writing is **throttled**: its `write` calls block until writeback catches up. A game that dumps gigabytes of logs or a shader cache can hit this and stall.' },
          ],
        },
        {
          type: 'p',
          text: "[[fsync]] cuts through all of that for one file: it writes the file's dirty pages and the metadata needed to find them, waits for the device to report completion, and sends a cache **FLUSH** (or uses FUA writes) so the drive's own volatile cache is emptied too. `fdatasync` skips metadata that is not needed to read the data back, such as the modification time. On Windows, `FlushFileBuffers` does the job, and a handle opened with `FILE_FLAG_WRITE_THROUGH` makes every write behave as if followed by a flush.",
        },
        {
          type: 'table',
          headers: ['Device', 'Typical cost of one fsync of a small file'],
          rows: [
            ['HDD', 'Several ms to tens of ms: rotations and seeks for data, journal and metadata'],
            ['Consumer NVMe SSD', 'Roughly 0.1 ms to a few ms, because flushing its DRAM cache to flash is slow'],
            ['Datacenter SSD with power-loss protection', 'Tens of µs: capacitors guarantee the cache, so a flush can return at once'],
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'fsync belongs on a background thread',
          text: "Even a 2 ms fsync is 12% of a 60 fps [[frame-budget]], and its latency is unpredictable: it may have to wait for unrelated dirty data or a journal commit. So games never fsync on the game or render thread. They hand the bytes to a save thread, which does the write-temp-fsync-rename sequence while the game shows a spinning save icon. Where many small files must become durable together, **batch** them: write them all, then fsync each (the kernel can overlap the work), or pack them into one file with one fsync.",
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'numeric',
      prompt: 'An autosave writes **25** small files and calls `fsync` after each one, directly on the game thread. On this player\'s drive each `fsync` takes **4 ms**, and everything else is negligible. How many milliseconds does the game thread stall?',
      hint: 'The fsyncs run one after another on the same thread.',
      answer: 100,
      unit: 'ms',
      explanation: '25 × 4 ms = **100 ms**: six whole frames at 60 fps, a hitch every player will notice. Moving the work to a save thread removes the stall from the frame entirely, and packing the 25 files into one save container cuts it to one fsync of the data plus one of the directory. The same 100 ms on an HDD-based console of the previous generation could have been ten times longer.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Bypassing the cache: direct I/O',
      blocks: [
        {
          type: 'p',
          text: "The page cache is the right default, but not always. If you will read 4 GB of video or texture data exactly once, caching it evicts things that *will* be reused, and the extra copy from cache to your buffer costs CPU and memory bandwidth. Programs that manage their own cache, such as databases and some engine streaming systems, would rather have the device DMA straight into their buffers. That is [[direct-io]]: `O_DIRECT` on Linux, `FILE_FLAG_NO_BUFFERING` on Windows.",
        },
        {
          type: 'code',
          title: 'direct_read.cpp (fragment)',
          code: `int fd = open("level3.pak", O_RDONLY | O_DIRECT);
// Buffer, offset and length must be multiples of the
// device's logical block size (often 512 B or 4 KiB).
constexpr std::size_t kAlign = 4096;
void* buf = std::aligned_alloc(kAlign, 1 << 20);  // 1 MiB
ssize_t n = pread(fd, buf, 1 << 20, 64 * kAlign);
// ... use buf ...
std::free(buf);`,
          annotations: [
            { lines: 1, text: '`O_DIRECT` asks the kernel to skip the page cache and DMA between the device and your buffer.' },
            { lines: '2-5', text: 'The price is alignment. A misaligned buffer, offset or size fails with `EINVAL` (or, on some file systems, silently falls back to buffered I/O). On Windows, `FILE_FLAG_NO_BUFFERING` has the same sector-alignment rules.' },
            { lines: 6, text: 'No read-ahead happens either: with direct I/O you are responsible for issuing large, well-ordered requests, ideally many at once (see asynchronous I/O below).' },
          ],
        },
        {
          type: 'table',
          headers: ['Aspect', 'Buffered `read`', 'Direct I/O', '`mmap`'],
          rows: [
            ['Copies', 'Device → cache → your buffer', 'Device → your buffer', 'Device → cache, which *is* your memory'],
            ['Read-ahead, caching', 'Automatic', 'None: you do it', 'Automatic'],
            ['Alignment rules', 'None', 'Strict', 'Page-aligned offsets'],
            ['Good for', 'Almost everything', 'Huge one-shot reads, own caches', 'Random access into big read-mostly files'],
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: 'Opening a save file with `O_DIRECT` makes every `write` durable when it returns, so `fsync` is no longer needed.',
      answer: false,
      explanation: "`O_DIRECT` only bypasses the **page cache**. The data can still sit in the drive's volatile write cache, and file metadata (the new size, newly allocated blocks) still goes through the file system's normal, cached path. You still need `fsync` (or `O_DSYNC`/`O_SYNC`) for durability. Direct I/O is a performance tool, not a durability guarantee.",
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Memory-mapped files',
      blocks: [
        {
          type: 'p',
          text: "`mmap` turns a file into memory. The kernel reserves a range of your address space and points its [[page-table]] entries at the file's pages in the page cache. Nothing is read up front: the first touch of each page triggers a [[page-fault]], the kernel reads the page (with read-ahead) if needed, maps it, and your load instruction simply continues. Afterwards, reading the asset is reading memory, with no system call and no copy. That is a [[memory-mapped-file]], which you met in the memory unit; here we use it for I/O.",
        },
        {
          type: 'code',
          runnable: true,
          title: 'mmap_pak.cpp',
          code: "#include <cstdint>\n#include <cstdio>\n#include <cstring>\n#include <fcntl.h>\n#include <string>\n#include <sys/mman.h>\n#include <unistd.h>\n\nstruct TocEntry {                  // table of contents record\n    char name[24];\n    std::uint32_t offset, size;    // where the asset's bytes are\n};\n\n// Build a tiny pak file: count, table of contents, then data.\nvoid buildPak(const char* path) {\n    const char* names[] = {\"hero.mesh\", \"rock.tex\", \"boom.wav\"};\n    const char* blobs[] = {\"MESH:v=1200\", \"TEX:256x256\",\n                           \"WAV:0.8s\"};\n    std::uint32_t count = 3;\n    std::string file(reinterpret_cast<char*>(&count), 4);\n    std::uint32_t off = 4 + count * sizeof(TocEntry);\n    std::string data;\n    for (int i = 0; i < 3; ++i) {\n        TocEntry e{};\n        std::strncpy(e.name, names[i], sizeof e.name - 1);\n        e.offset = off + std::uint32_t(data.size());\n        e.size = std::uint32_t(std::strlen(blobs[i]));\n        file.append(reinterpret_cast<char*>(&e), sizeof e);\n        data += blobs[i];\n    }\n    file += data;\n    int fd = open(path, O_WRONLY | O_CREAT | O_TRUNC, 0644);\n    if (write(fd, file.data(), file.size()) == -1)\n        std::perror(\"write\");\n    close(fd);\n}\n\nint main() {\n    const auto path = \"/tmp/forge_pak_\" + std::to_string(getpid());\n    buildPak(path.c_str());\n\n    int fd = open(path.c_str(), O_RDWR);\n    off_t size = lseek(fd, 0, SEEK_END);\n    void* p = mmap(nullptr, size, PROT_READ | PROT_WRITE,\n                   MAP_SHARED, fd, 0);\n    if (p == MAP_FAILED) { std::perror(\"mmap\"); return 1; }\n    const char* base = static_cast<const char*>(p);\n\n    std::uint32_t count;\n    std::memcpy(&count, base, 4);\n    std::printf(\"pak: %lld bytes, %u assets\\n\", (long long)size,\n                count);\n    for (std::uint32_t i = 0; i < count; ++i) {\n        TocEntry e;\n        std::memcpy(&e, base + 4 + i * sizeof e, sizeof e);\n        std::printf(\"  %-10s @%3u  \\\"%.*s\\\"\\n\", e.name, e.offset,\n                    int(e.size), base + e.offset);\n    }\n\n    // Writing through the mapping changes the page cache, so\n    // ordinary read() calls see it at once.\n    static_cast<char*>(p)[size - 4] = '9';\n    char tail[5] = {};\n    if (pread(fd, tail, 4, size - 4) != 4) std::perror(\"pread\");\n    std::printf(\"pread sees: %s\\n\", tail);\n\n    munmap(p, size);\n    close(fd);\n    unlink(path.c_str());\n}",
          output: "pak: 130 bytes, 3 assets\n  hero.mesh  @100  \"MESH:v=1200\"\n  rock.tex   @111  \"TEX:256x256\"\n  boom.wav   @122  \"WAV:0.8s\"\npread sees: 9.8s",
          annotations: [
            { lines: '9-12', text: 'A miniature pak format: a count, a table of contents of (name, offset, size), then the asset bytes back to back.' },
            { lines: '44-45', text: 'Map the whole file. `MAP_SHARED` means the mapping *is* the page-cache copy: other processes and `read` see changes. `MAP_PRIVATE` would give copy-on-write pages instead.' },
            { lines: '49-50', text: 'Parsing the header is just reading memory. `memcpy` into a local avoids misaligned access and strict-aliasing problems with a raw cast.' },
            { lines: '56-57', text: 'Each asset is a pointer and a length into the mapping: zero copies. Engines hand such views directly to decoders.' },
            { lines: '62-65', text: 'A store through the mapping dirties the page-cache page, so `pread` sees the change instantly. Writeback (or `msync`) puts it on disk later.' },
          ],
        },
        {
          type: 'p',
          text: "On Windows the same thing takes two steps: `CreateFileMappingW` creates a *section* object for the file, and `MapViewOfFile` maps a view of it. Many engines map their pak or archive files this way, so the OS, not the engine, decides which parts stay in RAM.",
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The hidden costs of mmap',
          text: "**Faults are invisible blocking I/O.** Any innocent-looking load from the mapping can stall your thread for a disk read, and nothing in the code warns you; touch a cold page on the game thread and you have a hitch. Prefault ranges you are about to use (`MAP_POPULATE`, `madvise(MADV_WILLNEED)`, `PrefetchVirtualMemory`) from a loading thread. **Errors become signals**: if the file is truncated or the device fails, the access raises `SIGBUS` (an `EXCEPTION_IN_PAGE_ERROR` structured exception on Windows) instead of returning an error code. And each 4 KiB fault costs a trap into the kernel, so streaming a huge file through small faults can be slower than large `read` calls.",
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'The game maps `world.pak` with `mmap` at startup. Twenty minutes later, the render thread reads a texture header from the mapping for the first time, and that frame takes 9 ms longer. What most likely happened?',
      options: [
        { text: 'The mapping expired and had to be recreated', why: 'Mappings stay valid until `munmap` or process exit.' },
        { text: 'The page was not resident, so the load instruction page-faulted and the thread blocked while the kernel read it from disk', correct: true, why: 'With mmap, I/O happens implicitly on first touch (or after the page was evicted). The thread blocks inside the fault handler, invisible in the source code.' },
        { text: 'mmap copies the whole file into RAM at startup, which slowed down the rest of the game', why: 'mmap reads nothing up front; that laziness is exactly why the first access is the slow one.' },
        { text: 'Reading a mapped file always requires a system call per access', why: 'Once a page is mapped, accesses are ordinary loads with no system call. Only the fault costs a trip into the kernel.' },
      ],
      explanation: 'Memory-mapped I/O replaces explicit `read` calls with page faults, which keeps code simple but moves the blocking to wherever the first touch happens. The fix is to make the first touch happen somewhere harmless: prefault the texture\'s range from a streaming thread before the render thread needs it, or read it explicitly into a buffer you control. The page may also have been evicted under memory pressure since startup, which a mapped file allows silently.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Asynchronous I/O: io_uring and completion ports',
      blocks: [
        {
          type: 'p',
          text: "So far, every read blocks *some* thread. To keep an NVMe SSD busy you need dozens of requests in flight, and one blocked thread per request does not scale: threads cost memory and context switches. **Asynchronous I/O** separates submitting a request from collecting its result, so one thread can keep many requests in flight. (Non-blocking mode, `O_NONBLOCK`, does not help here: regular files always count as \"ready\", so reads still wait for the disk.)",
        },
        {
          type: 'p',
          text: "On Linux the modern interface is [[io-uring]] (Linux 5.1, 2019). The application and the kernel share two ring buffers in memory: a **submission queue** where you place requests, and a **completion queue** where the kernel places results. One `io_uring_enter` system call can submit hundreds of requests, and in polling mode no system call is needed at all:",
        },
        {
          type: 'code',
          title: 'uring_read.cpp (needs liburing; not runnable here)',
          code: `#include <liburing.h>

io_uring ring;
io_uring_queue_init(64, &ring, 0);         // 64-entry rings

for (int i = 0; i < 16; ++i) {             // queue 16 reads
    io_uring_sqe* sqe = io_uring_get_sqe(&ring);
    io_uring_prep_read(sqe, fd, bufs[i], kChunk, i * kChunk);
    io_uring_sqe_set_data64(sqe, i);       // tag: which chunk
}
io_uring_submit(&ring);                    // one system call

for (int done = 0; done < 16; ++done) {
    io_uring_cqe* cqe;
    io_uring_wait_cqe(&ring, &cqe);        // or peek: no wait
    auto chunk = io_uring_cqe_get_data64(cqe);
    int result = cqe->res;                 // bytes, or -errno
    io_uring_cqe_seen(&ring, cqe);         // free the slot
}`,
          annotations: [
            { lines: 4, text: 'Creates the shared submission and completion rings.' },
            { lines: '7-9', text: 'Each submission queue entry (SQE) describes one operation: here a read of `kChunk` bytes at a given offset. The user-data tag comes back with the result.' },
            { lines: 11, text: 'Sixteen reads, one system call. The kernel issues them to the device in parallel.' },
            { lines: '14-18', text: 'Completions (CQEs) arrive in whatever order the device finishes. A game would *peek* once per frame instead of waiting.' },
          ],
        },
        {
          type: 'p',
          text: "Windows has had asynchronous file I/O far longer. Open a file with `FILE_FLAG_OVERLAPPED`, and `ReadFile` returns at once with `ERROR_IO_PENDING`; the result arrives later. The scalable way to collect results is an [[iocp|I/O completion port]]: you associate handles with the port, and a small pool of threads calls `GetQueuedCompletionStatus` to pick up finished requests. Windows 11 also added an *I/O ring* API modelled on the same submission/completion idea, and [[directstorage]] follows the same pattern for game assets: submit reads in large batches, collect completions later.",
        },
        {
          type: 'code',
          title: 'iocp_read.cpp (Windows only, not runnable here)',
          code: `HANDLE file = CreateFileW(L"level3.pak", GENERIC_READ,
    FILE_SHARE_READ, nullptr, OPEN_EXISTING,
    FILE_FLAG_OVERLAPPED, nullptr);
HANDLE port = CreateIoCompletionPort(file, nullptr,
                                     /*key*/ 1, 0);
OVERLAPPED ov{};
ov.Offset = 64 * 1024;                     // where to read
ReadFile(file, buf, kChunk, nullptr, &ov); // returns at once

DWORD bytes; ULONG_PTR key; OVERLAPPED* done;
GetQueuedCompletionStatus(port, &bytes, &key, &done,
                          INFINITE);       // a worker waits`,
          annotations: [
            { lines: 3, text: '`FILE_FLAG_OVERLAPPED` makes every read and write on this handle asynchronous.' },
            { lines: '4-5', text: 'Associating the handle with a completion port routes its completions there.' },
            { lines: '6-8', text: 'The `OVERLAPPED` structure carries the file offset (there is no shared file position for async I/O) and identifies the request. It must stay alive until the request completes.' },
            { lines: '11-12', text: 'A worker thread blocks here, not on the read; one port can serve thousands of outstanding requests across many files and sockets.' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'order',
      prompt: 'Put the life of one io_uring read in order.',
      linesAreCode: false,
      lines: [
        'Take a free submission queue entry and fill it in with io_uring_prep_read',
        'Call io_uring_submit so the kernel sees the new entry',
        'The kernel issues the read to the device, which completes it',
        'The kernel writes a completion entry with the result into the completion queue',
        'The application reads the completion and marks it seen to free the slot',
      ],
      distractors: ['The application blocks inside read() until the data arrives'],
      explanation: "Submission and completion are separate steps connected by two shared rings. The application can submit many entries before one `io_uring_submit`, and it is free to do other work between submitting and reaping, which is the entire point. Marking the completion seen advances the ring's head so the kernel can reuse the slot. Blocking inside `read` is the synchronous model that io_uring replaces.",
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Streaming assets without hitches',
      blocks: [
        {
          type: 'p',
          text: "Everything in this unit comes together in an engine's streaming system. Its job is to load gigabytes of meshes, textures and audio while the player moves, without ever making a frame late. A few principles cover most of it:",
        },
        {
          type: 'list',
          items: [
            "**Pack assets into big files.** A [[pak-file]] holds thousands of assets with a table of contents, so the engine pays for one `open` and one path lookup instead of thousands, can read neighbouring assets in one large request, and can compress and sign everything at once. Unreal Engine has long used `.pak` files, and newer versions add *IoStore* containers (`.utoc` and `.ucas`) designed for its newer asynchronous loader.",
            "**Never block the game thread on I/O.** All reads, decompression and file-system calls happen on loading threads or through asynchronous APIs. The game thread only submits requests and polls for completions.",
            "**Prioritise and budget.** Requests carry priorities (what the camera sees now beats the next area's audio), and the work done per frame on completions, such as creating GPU resources, is capped so one frame never absorbs a burst.",
            "**Keep the device busy with large, parallel requests.** One 1 MiB read beats 256 reads of 4 KiB; many in flight beat one at a time on NVMe. This is what [[directstorage]] and console I/O APIs are optimised for.",
          ],
        },
        {
          type: 'p',
          text: "Here is the core of such a system in standard C++: a loader thread that owns all blocking I/O, and a frame loop that polls futures and never waits.",
        },
        {
          type: 'code',
          runnable: true,
          title: 'streamer.cpp',
          code: "#include <chrono>\n#include <condition_variable>\n#include <cstdio>\n#include <deque>\n#include <fcntl.h>\n#include <future>\n#include <mutex>\n#include <string>\n#include <thread>\n#include <unistd.h>\n#include <vector>\n\nstruct Request {\n    off_t offset;\n    std::size_t size;\n    std::promise<std::string> done;    // fulfilled by the loader\n};\n\n// One background thread does all the blocking file I/O.\nclass Streamer {\n    int fd_;\n    std::mutex m_;\n    std::condition_variable_any cv_;   // can wait on a stop_token\n    std::deque<Request> queue_;\n    std::jthread worker_;              // declared last: starts last\npublic:\n    explicit Streamer(int fd)\n        : fd_(fd), worker_([this](std::stop_token st) {\n              run(st);\n          }) {}\n    std::future<std::string> load(off_t off, std::size_t n) {\n        std::lock_guard lock(m_);\n        queue_.push_back({off, n, {}});\n        cv_.notify_one();\n        return queue_.back().done.get_future();\n    }\nprivate:\n    void run(std::stop_token st) {\n        for (;;) {\n            std::unique_lock lock(m_);\n            cv_.wait(lock, st, [&] { return !queue_.empty(); });\n            if (queue_.empty()) return;          // stop requested\n            Request r = std::move(queue_.front());\n            queue_.pop_front();\n            lock.unlock();                       // never do I/O\n            std::string buf(r.size, '\\0');       // under the lock\n            ssize_t got = pread(fd_, buf.data(), r.size, r.offset);\n            buf.resize(got > 0 ? std::size_t(got) : 0);\n            r.done.set_value(std::move(buf));\n        }\n    }\n};\n\nint main() {\n    using namespace std::chrono_literals;\n    const auto path = \"/tmp/forge_stream_\" + std::to_string(getpid());\n    int fd = open(path.c_str(), O_RDWR | O_CREAT | O_TRUNC, 0644);\n    const std::string pak = \"HEROMESH\" \"ROCKTEXTURE\" \"MUSIC\";\n    if (write(fd, pak.data(), pak.size()) == -1) return 1;\n\n    std::vector<std::future<std::string>> pending;\n    {\n        Streamer streamer(fd);\n        pending.push_back(streamer.load(0, 8));\n        pending.push_back(streamer.load(8, 11));\n        pending.push_back(streamer.load(19, 5));\n\n        std::size_t next = 0;\n        while (next < pending.size()) {      // the game loop\n            // ... simulate and render one frame here ...\n            std::this_thread::sleep_for(1ms);\n            while (next < pending.size() &&  // poll, never block\n                   pending[next].wait_for(0s)\n                       == std::future_status::ready) {\n                std::printf(\"asset %zu ready: %s\\n\", next,\n                            pending[next].get().c_str());\n                ++next;\n            }\n        }\n    }                                        // jthread stops, joins\n    std::printf(\"done; the frame loop never blocked on I/O\\n\");\n    close(fd);\n    unlink(path.c_str());\n}",
          output: "asset 0 ready: HEROMESH\nasset 1 ready: ROCKTEXTURE\nasset 2 ready: MUSIC\ndone; the frame loop never blocked on I/O",
          annotations: [
            { lines: '13-17', text: 'A request carries a byte range inside the pak and a `std::promise` the loader fulfils with the bytes.' },
            { lines: '23-25', text: '`condition_variable_any` can wait on a `std::stop_token`, so stopping the `std::jthread` also wakes the waiting loader: no lost wake-up at shutdown. `worker_` is declared last, so it is constructed after the queue it uses and destroyed (joined) first.' },
            { lines: '31-36', text: 'Called from the game thread: push the request and return a future at once. The lock is held only for the queue operation.' },
            { lines: 41, text: 'Sleep until there is work or a stop is requested.' },
            { lines: '45-47', text: 'Release the lock **before** the blocking `pread`. Holding a mutex across I/O would make the game thread\'s next `load` call wait for the disk, reintroducing the hitch we are avoiding.' },
            { lines: '69-79', text: 'The frame loop polls with a zero timeout, handles completions in request order (so the output is deterministic), and keeps rendering in between.' },
            { lines: 80, text: 'Leaving the scope destroys the `Streamer`: the `jthread` requests stop, the loader wakes and returns, and the destructor joins it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'From this sketch to a real engine',
          text: "A production streamer adds priorities (a heap instead of a FIFO), several loader threads or one io_uring/IOCP/DirectStorage queue with many requests in flight, decompression jobs on the engine's job system, cancellation when the player turns around, and memory budgets so streaming never pushes the game past its console allocation. The shape stays the same: submit cheaply, complete elsewhere, consume a bounded amount per frame.",
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'numeric',
      prompt: 'An old code path loads a **48 MB** texture pack synchronously on the game thread, from a drive that delivers **400 MB/s** for this read. How long is the stall in frames at 60 fps (16.67 ms per frame)? Round to 1 decimal place.',
      hint: 'First the stall in ms: 48 / 400 seconds.',
      answer: 7.2,
      tolerance: 0.05,
      unit: 'frames',
      explanation: '48 MB / 400 MB/s = 0.12 s = 120 ms, and 120 / 16.67 ≈ **7.2** frames. The player sees a freeze of over a tenth of a second, and frame-time graphs show one enormous spike. Moved to a loading thread, the same read costs the game thread nothing: the texture appears a few frames later, ideally while a lower-resolution mip is displayed in its place. That is the whole philosophy of streaming: latency is acceptable, stalls are not.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'bug',
      prompt: 'Players report a hitch every time a new enemy type appears for the first time in a level. Tap the line responsible.',
      code: `void EnemySpawner::spawn(const EnemyType& type, Vec3 pos) {
    if (!meshCache.contains(type.meshPath)) {
        std::ifstream in(type.meshPath, std::ios::binary);
        meshCache[type.meshPath] = Mesh::parse(in);
    }
    Enemy& e = enemies.emplace_back(type, pos);
    e.mesh = &meshCache[type.meshPath];
    e.playSpawnAnimation();
}`,
      bugLines: [3, 4],
      explanation: "`spawn` runs on the game thread, and the first time a type appears, line 3 opens the mesh file and line 4 reads and parses it synchronously: a path lookup, possibly page-cache misses and disk reads, all inside one frame. That is the hitch. The fix is to request the mesh **before** it is needed (when the level or wave is set up, or when spawners come into range) through the asynchronous streamer, and to spawn only once the mesh is loaded, or show a placeholder until then. Caching the result (line 2) only helps the second time.",
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'A Windows 11 game on an NVMe SSD needs to load about 2 GB of compressed texture data per level, as thousands of reads, while the player keeps playing. Which approach fits best?',
      options: [
        { text: 'Map the pak file and let the render thread touch the textures it needs', why: 'Every cold page becomes a blocking page fault on the render thread: exactly the hitches streaming must avoid.' },
        { text: 'One loader thread calling `std::ifstream::read` for one asset at a time', why: 'It keeps the frame safe, but with one request in flight the SSD sits mostly idle, and decompression would still load CPU cores.' },
        { text: 'Batch the reads through DirectStorage (or a deep queue of overlapped I/O), with decompression off the game thread', correct: true, why: 'Many requests in flight keep the NVMe queues full, completions are collected without blocking, and decompression runs on the GPU or worker threads.' },
        { text: 'Open the files with `FILE_FLAG_WRITE_THROUGH` so the cache is bypassed', why: 'Write-through only affects writes. It does nothing for read throughput.' },
      ],
      explanation: "The device can deliver gigabytes per second only if it has many requests queued, and the frame stays smooth only if no frame thread ever waits. Batched asynchronous I/O gets both. DirectStorage packages this for Windows and Xbox, with GPU decompression on PC (Xbox Series consoles use a hardware decompression block); on Linux the same design maps onto io_uring. The other options each break one of the two rules.",
    },
  ],
  takeaways: [
    'Data passes through your process buffer, the kernel page cache and the drive cache before it is durable; each layer survives different failures.',
    'The page cache serves reads from RAM and grows a read-ahead window for sequential access; access hints (`posix_fadvise`, `FILE_FLAG_SEQUENTIAL_SCAN`) help it guess.',
    'Buffered writes become dirty pages written back after seconds; `fsync`/`FlushFileBuffers` forces data and the drive cache to stable storage and costs milliseconds, so keep it off frame threads and batch it.',
    'Direct I/O (`O_DIRECT`, `FILE_FLAG_NO_BUFFERING`) skips the cache for huge one-shot reads but demands aligned buffers and does not imply durability.',
    '`mmap` gives zero-copy access through page faults, which hide blocking I/O and turn errors into signals; prefault off the game thread.',
    'Asynchronous I/O separates submission from completion: io_uring on Linux, overlapped I/O with completion ports (and I/O rings) on Windows, DirectStorage for game assets.',
    'Streaming systems pack assets into pak files, never block the game thread, prioritise and budget per frame, and keep many large requests in flight.',
  ],
  reading: [
    {
      title: 'mmap(2) — Linux manual page',
      url: 'https://man7.org/linux/man-pages/man2/mmap.2.html',
      source: 'other',
      note: 'MAP_SHARED vs MAP_PRIVATE, MAP_POPULATE, and the SIGBUS cases for mapped files.',
    },
    {
      title: 'io_uring(7) — Linux manual page',
      url: 'https://man7.org/linux/man-pages/man7/io_uring.7.html',
      source: 'other',
      note: 'The submission and completion rings explained, with the rules for ordering and memory barriers.',
    },
    {
      title: 'posix_fadvise(2) — Linux manual page',
      url: 'https://man7.org/linux/man-pages/man2/posix_fadvise.2.html',
      source: 'other',
      note: 'The access-pattern hints and how Linux maps them onto read-ahead.',
    },
    {
      title: 'I/O Completion Ports (Microsoft Learn)',
      url: 'https://learn.microsoft.com/en-us/windows/win32/fileio/i-o-completion-ports',
      source: 'other',
      note: 'How overlapped I/O, completion ports and their thread pools fit together on Windows.',
    },
    {
      title: 'File Caching (Microsoft Learn)',
      url: 'https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching',
      source: 'other',
      note: 'The Windows cache manager, lazy writing and the flags that change caching behaviour.',
    },
    {
      title: 'DirectStorage on GitHub',
      url: 'https://github.com/microsoft/DirectStorage',
      source: 'other',
      note: 'Microsoft\'s samples and documentation for batched, GPU-decompressed asset streaming.',
    },
  ],
};
