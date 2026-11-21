import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-page-replacement',
  title: 'Page Faults and Page Replacement',
  summary:
    'What happens when a page is not in memory: demand paging, minor and major page faults, swapping, the FIFO, LRU, optimal and clock replacement policies with fault counts from a C++ simulator, Belady\'s anomaly, working sets and thrashing, and memory-mapped files.',
  minutes: 22,
  objectives: [
    'Describe how the kernel handles a page fault, step by step, and distinguish minor from major faults',
    'Count page faults for FIFO, LRU and optimal replacement on a reference string',
    'Explain Belady\'s anomaly and why LRU and OPT are immune to it',
    'Trace the clock algorithm and explain how use and dirty bits let the OS approximate LRU cheaply',
    'Explain working sets and thrashing, and what Linux and Windows do when memory runs out',
    'Map a file into memory with `mmap` and explain when that helps and when it hurts',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Beyond physical memory',
      blocks: [
        {
          type: 'p',
          text: 'The present bit from the last lesson lets the OS do something remarkable: keep pages of a process **somewhere other than RAM**. A page can be not yet allocated (the program has never touched it), still in a file (code that has not run yet), or evicted to disk in **[[swap-space]]** (the paging file on Windows). Its PTE says "not present", and the process never knows.',
        },
        {
          type: 'p',
          text: 'When the program touches such a page, the MMU raises a **[[page-fault]]** and the kernel takes over. Despite the name, most faults are not errors; they are the OS doing work it postponed. This is **[[demand-paging|demand paging]]**: nothing is loaded or allocated until it is used.',
        },
        {
          type: 'table',
          headers: ['Kind', 'What the kernel does', 'Typical cost'],
          rows: [
            ['Minor (soft) fault', 'Maps a page that needs no disk I/O: a zero-filled page on first touch, a copy-on-write copy, a page already in the page cache', 'About a microsecond'],
            ['Major (hard) fault', 'Reads the page from disk: from swap, or from the file backing it', 'Tens of µs on NVMe, around 10 ms on a hard drive'],
            ['Invalid access', 'No valid mapping, or the access breaks permissions: deliver `SIGSEGV` (Linux) or an access violation (Windows)', 'Your crash'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why be lazy?',
          text: 'Programs ask for far more than they use. A game reserves a big pool "just in case", a library maps a large table it consults twice, a process links 50 MB of code and runs 5 MB of it. Demand paging makes all of that free until touched. Swapping then lets memory that *was* used but has gone idle (the launcher behind your game, a browser tab) make room for memory that is in use now.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'A major fault is a disaster for a frame',
          text: 'DRAM answers in about 100 ns. An NVMe read takes tens of microseconds, a hard disk around ten milliseconds: up to 100,000 times slower. A game thread that hits a few major faults in one frame will hitch, which is why games load and touch what they need on the loading screen, and why a PC that starts swapping makes games stutter long before it makes them crash.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'order',
      prompt: 'A program touches a page that was swapped out. Put the steps of handling the fault in order.',
      lines: [
        'The MMU finds the present bit clear, raises a page fault and traps into the kernel',
        'The kernel looks up the address in the process\'s memory areas and finds where the page is stored in swap',
        'It obtains a free frame, evicting another page (and writing it out if dirty) if none is free',
        'It starts the disk read and blocks the faulting thread, letting the scheduler run something else',
        'When the I/O completes, it fills in the page-table entry with the frame and sets the present bit',
        'It returns from the trap, re-executing the instruction that faulted',
      ],
      distractors: ['It skips the faulting instruction, since that access already failed'],
      linesAreCode: false,
      explanation:
        'The faulting instruction is **restarted**, not skipped: from the program\'s point of view the access simply took a long time. Note step 4: a major fault blocks only the faulting thread, and the CPU runs other work during the disk read, exactly the I/O overlap from the scheduling unit.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Watching faults happen',
      blocks: [
        {
          type: 'p',
          text: 'The kernel counts faults per process, and `getrusage` reports them. This program maps 1 MiB of fresh anonymous memory and touches one byte per page, twice:',
        },
        {
          type: 'code',
          title: 'count_faults.cpp',
          runnable: true,
          code: `#include <sys/mman.h>
#include <sys/resource.h>
#include <unistd.h>
#include <cstddef>
#include <iostream>

long minorFaults() {
    rusage u{};
    getrusage(RUSAGE_SELF, &u);
    return u.ru_minflt;
}

long touchEveryPage(char* bytes, std::size_t pages,
                    std::size_t page, char value) {
    const long before = minorFaults();
    for (std::size_t i = 0; i < pages; ++i)
        bytes[i * page] = value;            // one write per page
    return minorFaults() - before;
}

int main() {
    const auto page =
        static_cast<std::size_t>(sysconf(_SC_PAGESIZE));
    const std::size_t pages = 256;          // 1 MiB of 4 KiB pages
    const std::size_t size = pages * page;
    void* mem = mmap(nullptr, size, PROT_READ | PROT_WRITE,
                     MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (mem == MAP_FAILED) {
        std::cout << "mmap failed\\n";
        return 1;
    }
    madvise(mem, size, MADV_NOHUGEPAGE);    // keep 4 KiB pages
    auto* bytes = static_cast<char*>(mem);

    const long first = touchEveryPage(bytes, pages, page, 1);
    const long second = touchEveryPage(bytes, pages, page, 2);
    std::cout << "first pass: a fault for every page? "
              << (first >= static_cast<long>(pages) ? "yes" : "no")
              << "\\nsecond pass: any faults? "
              << (second == 0 ? "no" : "yes") << '\\n';
    munmap(mem, size);
}`,
          output: "first pass: a fault for every page? yes\nsecond pass: any faults? no",
          annotations: [
            { lines: '7-11', text: '`ru_minflt` counts minor faults (no I/O), `ru_majflt` major ones. On Windows, `GetProcessMemoryInfo` reports a combined `PageFaultCount`.' },
            { lines: '26-27', text: '`mmap` of anonymous memory only creates a valid *area*. No frames are allocated and no page-table entries are filled in yet.' },
            { lines: '32', text: 'Ask for normal 4 KiB pages. With transparent huge pages, the kernel might back the region with one 2 MiB page and take a single fault, which would make the demonstration less clear.' },
            { lines: '35', text: 'First touch of each page: a minor fault, in which the kernel allocates a zeroed frame and maps it. 256 pages, at least 256 faults.' },
            { lines: '36', text: 'Second pass: all pages are present, the TLB and page tables do their job, and the kernel is never involved.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Pre-faulting for smooth frames',
          text: 'If a game allocates a large buffer and first writes it mid-frame, the frame pays a fault per page: 256 MiB is 65,536 minor faults, easily tens of milliseconds. Touch big buffers during loading, or ask for them pre-faulted: `MAP_POPULATE` with `mmap` on Linux, or simply writing to them once. `mlock` and `VirtualLock` additionally keep pages from being evicted later.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'True or false: if a program\'s page-fault counter is going up, it is touching memory it should not.',
      answer: false,
      explanation:
        'False. Nearly all page faults are normal: first touches of new memory, copy-on-write after `fork`, code pages being loaded from the executable, swapped pages coming back. Only faults on addresses outside any valid area, or that break permissions, are bugs, and those end the process with `SIGSEGV` or an access violation rather than incrementing a counter.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Choosing a victim',
      blocks: [
        {
          type: 'p',
          text: 'When a fault needs a frame and none is free, the OS must **evict** a page. Choose badly and the evicted page is needed again immediately, causing another fault. Treat RAM as a cache for the pages of all processes, and the goal is the cache\'s: minimise misses. The classic policies, evaluated on a **reference string** (the sequence of pages accessed):',
        },
        {
          type: 'list',
          items: [
            '**OPT** (Bélády, 1966): evict the page whose next use is **furthest in the future**. Provably optimal, and impossible to implement, since it needs the future. It is the yardstick for the others.',
            '**FIFO**: evict the page that has been in memory longest. Simple, but it happily evicts a page used constantly just because it arrived early.',
            '**Random**: surprisingly decent, and immune to pathological patterns.',
            '**[[lru|LRU]]** (least recently used): evict the page unused for longest, betting that the recent past predicts the near future (temporal locality).',
          ],
        },
        {
          type: 'code',
          title: 'replacement_sim.cpp',
          runnable: true,
          code: `#include <algorithm>
#include <cstddef>
#include <iostream>
#include <string>
#include <vector>

using Refs = std::vector<int>;
enum class Policy { FIFO, LRU, OPT, Clock };

int countFaults(const Refs& refs, std::size_t frames, Policy p) {
    std::vector<int> page;          // page held by each frame
    std::vector<std::size_t> stamp; // FIFO: loaded, LRU: last used
    std::vector<bool> used;         // clock's use (reference) bit
    std::size_t hand = 0;           // clock hand
    int faults = 0;
    for (std::size_t t = 0; t < refs.size(); ++t) {
        const int r = refs[t];
        const auto hit = std::ranges::find(page, r);
        if (hit != page.end()) {                    // hit
            const auto i =
                static_cast<std::size_t>(hit - page.begin());
            if (p == Policy::LRU) stamp[i] = t;
            used[i] = true;
            continue;
        }
        ++faults;
        if (page.size() < frames) {                 // free frame
            page.push_back(r);
            stamp.push_back(t);
            used.push_back(true);
            continue;
        }
        std::size_t victim = 0;
        if (p == Policy::FIFO || p == Policy::LRU) {
            victim = static_cast<std::size_t>(
                std::ranges::min_element(stamp) - stamp.begin());
        } else if (p == Policy::OPT) {  // next use furthest away
            std::size_t best = 0;
            for (std::size_t i = 0; i < frames; ++i) {
                std::size_t next = t + 1;
                while (next < refs.size() && refs[next] != page[i])
                    ++next;
                if (next > best) { best = next; victim = i; }
            }
        } else {                                    // clock
            while (used[hand]) {
                used[hand] = false;                 // second chance
                hand = (hand + 1) % frames;
            }
            victim = hand;
            hand = (hand + 1) % frames;
        }
        page[victim] = r;
        stamp[victim] = t;
        used[victim] = true;
    }
    return faults;
}

void compare(const char* label, const Refs& refs) {
    std::cout << label << ", 3 frames:";
    for (auto [name, p] : {std::pair{" FIFO", Policy::FIFO},
                           {" LRU", Policy::LRU},
                           {" Clock", Policy::Clock},
                           {" OPT", Policy::OPT}})
        std::cout << name << ' ' << countFaults(refs, 3, p);
    std::cout << '\\n';
}

int main() {
    compare("textbook", {7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1,
                         2, 0});
    compare("hot page", {1, 2, 3, 1, 4, 1, 5, 1, 2, 1, 3, 1});

    const Refs belady{1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5};
    for (std::size_t f : {3, 4})
        std::cout << "Belady's string, FIFO, " << f << " frames: "
                  << countFaults(belady, f, Policy::FIFO)
                  << " faults\\n";
}`,
          output: "textbook, 3 frames: FIFO 12 LRU 11 Clock 12 OPT 8\nhot page, 3 frames: FIFO 9 LRU 7 Clock 8 OPT 6\nBelady's string, FIFO, 3 frames: 9 faults\nBelady's string, FIFO, 4 frames: 10 faults",
          annotations: [
            { lines: '11-14', text: 'One slot per frame: the page it holds, a timestamp (load time for FIFO, last use for LRU) and the use bit that the clock algorithm reads.' },
            { lines: '19-25', text: 'A hit: LRU refreshes the timestamp, and the "hardware" sets the use bit. FIFO deliberately ignores hits, which is its weakness.' },
            { lines: '34-36', text: 'FIFO and LRU share code: evict the smallest timestamp. Only what the timestamp *means* differs.' },
            { lines: '37-44', text: 'OPT looks ahead in the reference string for each resident page\'s next use and evicts the one used furthest away (or never again).' },
            { lines: '45-52', text: 'Clock: advance the hand, clearing use bits, until a frame with use bit 0 turns up. The next card animates it.' },
          ],
        },
        {
          type: 'p',
          text: 'On the "hot page" string, page 1 is used every other access. FIFO evicts it anyway when its turn comes; LRU never does. OPT shows how far from perfect both are.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'numeric',
      prompt: 'Three frames, initially empty. Using **FIFO**, how many page faults does the reference string 1 2 3 1 4 2 5 1 2 3 cause?',
      hint: 'Write the three frames after each reference; FIFO ignores hits when choosing the victim.',
      answer: 8,
      unit: 'faults',
      explanation:
        '1, 2, 3 fault (3). 1 hits. 4 faults and evicts 1, the oldest (4). 2 hits. 5 faults and evicts 2 (5). 1 faults and evicts 3 (6). 2 faults and evicts 4 (7). 3 faults and evicts 5 (8). **8 faults**. Notice FIFO evicted page 1 one access after it was used. OPT manages 6 on this string.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Belady\'s anomaly',
      blocks: [
        {
          type: 'p',
          text: 'Surely more memory means fewer faults? For FIFO, not always. The simulator\'s last two lines show it: on the string 1 2 3 4 1 2 5 1 2 3 4 5, FIFO takes **9** faults with 3 frames and **10** with 4. This is **[[belady-anomaly|Belady\'s anomaly]]**, found in 1969 by the same László Bélády who described OPT.',
        },
        {
          type: 'p',
          text: 'LRU and OPT never show it, because they are **stack algorithms**: the set of pages they hold with *n* frames is always a subset of what they would hold with *n* + 1, so every hit with *n* frames is also a hit with *n* + 1. FIFO lacks this property; its contents depend on arrival order in a way that a bigger memory can make worse.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why this matters beyond trivia',
          text: 'It shows that a replacement policy should rank pages by **how they are used**, not by when they arrived. And it is a warning for any cache you build, such as a texture or asset cache in an engine: with a FIFO-style policy, doubling the budget may not help, and in odd cases can hurt.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'numeric',
      prompt: 'Using **LRU** with **4** frames, how many faults does Belady\'s string 1 2 3 4 1 2 5 1 2 3 4 5 cause?',
      answer: 8,
      unit: 'faults',
      explanation:
        '1 2 3 4 fault (4). 1 and 2 hit. 5 faults and evicts 3, the least recently used (5). 1 and 2 hit. 3 faults and evicts 4 (6). 4 faults and evicts 5 (7). 5 faults and evicts 1 (8). **8 faults**, against 10 for LRU with 3 frames: more memory helped, as it always does for a stack algorithm. FIFO with 4 frames needs 10.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Approximating LRU: the clock',
      blocks: [
        {
          type: 'p',
          text: 'True LRU needs to know the order of *every* access, which would mean updating a timestamp or a list on every load and store: impossible at memory speed. Instead the hardware offers one cheap hint, the **use bit** (accessed bit) in each PTE, set whenever the page is touched. The OS can read and clear it. The **[[clock-algorithm|clock algorithm]]** builds an LRU approximation from that one bit:',
        },
        {
  "type": "algo",
  "view": "array",
  "interval": 1500,
  "frames": [
    {
      "note": "Three frames, empty. Each cell will show page:use bit. The reference string is 1 2 3 1 4 1 5 1 2 1 3 1: page 1 is hot, like data a game touches every frame.",
      "array": [
        "·",
        "·",
        "·"
      ],
      "pointers": [
        {
          "index": 0,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "faults",
          "0"
        ]
      ]
    },
    {
      "note": "Reference 1: fault. A free frame is available, so page 1 goes into frame 0.",
      "array": [
        "1:1",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 0,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          " [1]"
        ],
        [
          "faults",
          "1"
        ]
      ]
    },
    {
      "note": "Reference 2: fault. A free frame is available, so page 2 goes into frame 1.",
      "array": [
        "1:1",
        "2:1",
        "·"
      ],
      "marks": [
        {
          "index": 1,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          "1 [2]"
        ],
        [
          "faults",
          "2"
        ]
      ]
    },
    {
      "note": "Reference 3: fault. A free frame is available, so page 3 goes into frame 2.",
      "array": [
        "1:1",
        "2:1",
        "3:1"
      ],
      "marks": [
        {
          "index": 2,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          "1 2 [3]"
        ],
        [
          "faults",
          "3"
        ]
      ]
    },
    {
      "note": "Reference 1: **hit** in frame 0. The hardware sets its use bit; nothing else happens.",
      "array": [
        "1:1",
        "2:1",
        "3:1"
      ],
      "marks": [
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          "1 2 3 [1]"
        ],
        [
          "faults",
          "3"
        ]
      ]
    },
    {
      "note": "Reference 4: fault, no free frame. The hand sweeps: frames 0, 1, 2 had use bit 1, so each gets a second chance (bit cleared).",
      "array": [
        "1:0",
        "2:0",
        "3:0"
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          "1 2 3 1 [4]"
        ],
        [
          "faults",
          "4"
        ]
      ]
    },
    {
      "note": "Frame 0 (page 1) has use bit 0: evict it and load page 4. The hand moves past it.",
      "array": [
        "4:1",
        "2:0",
        "3:0"
      ],
      "marks": [
        {
          "index": 0,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          "1 2 3 1 [4]"
        ],
        [
          "faults",
          "4"
        ]
      ]
    },
    {
      "note": "Reference 1: fault, no free frame. Frame 1 (page 2) has use bit 0: evict it and load page 1. The hand moves past it.",
      "array": [
        "4:1",
        "1:1",
        "3:0"
      ],
      "marks": [
        {
          "index": 1,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          "1 2 3 1 4 [1]"
        ],
        [
          "faults",
          "5"
        ]
      ]
    },
    {
      "note": "Reference 5: fault, no free frame. Frame 2 (page 3) has use bit 0: evict it and load page 5. The hand moves past it.",
      "array": [
        "4:1",
        "1:1",
        "5:1"
      ],
      "marks": [
        {
          "index": 2,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          "1 2 3 1 4 1 [5]"
        ],
        [
          "faults",
          "6"
        ]
      ]
    },
    {
      "note": "Reference 1: **hit** in frame 1. The hardware sets its use bit; nothing else happens.",
      "array": [
        "4:1",
        "1:1",
        "5:1"
      ],
      "marks": [
        {
          "index": 1,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          "1 2 3 1 4 1 5 [1]"
        ],
        [
          "faults",
          "6"
        ]
      ]
    },
    {
      "note": "Reference 2: fault, no free frame. The hand sweeps: frames 0, 1, 2 had use bit 1, so each gets a second chance (bit cleared).",
      "array": [
        "4:0",
        "1:0",
        "5:0"
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          "1 2 3 1 4 1 5 1 [2]"
        ],
        [
          "faults",
          "7"
        ]
      ]
    },
    {
      "note": "Frame 0 (page 4) has use bit 0: evict it and load page 2. The hand moves past it.",
      "array": [
        "2:1",
        "1:0",
        "5:0"
      ],
      "marks": [
        {
          "index": 0,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          "1 2 3 1 4 1 5 1 [2]"
        ],
        [
          "faults",
          "7"
        ]
      ]
    },
    {
      "note": "Reference 1: **hit** in frame 1. The hardware sets its use bit; nothing else happens.",
      "array": [
        "2:1",
        "1:1",
        "5:0"
      ],
      "marks": [
        {
          "index": 1,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          "1 2 3 1 4 1 5 1 2 [1]"
        ],
        [
          "faults",
          "7"
        ]
      ]
    },
    {
      "note": "Reference 3: fault, no free frame. The hand sweeps: frame 1 had use bit 1, so it gets a second chance (bit cleared).",
      "array": [
        "2:1",
        "1:0",
        "5:0"
      ],
      "marks": [
        {
          "index": 1,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          "1 2 3 1 4 1 5 1 2 1 [3]"
        ],
        [
          "faults",
          "8"
        ]
      ]
    },
    {
      "note": "Frame 2 (page 5) has use bit 0: evict it and load page 3. The hand moves past it.",
      "array": [
        "2:1",
        "1:0",
        "3:1"
      ],
      "marks": [
        {
          "index": 2,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          "1 2 3 1 4 1 5 1 2 1 [3]"
        ],
        [
          "faults",
          "8"
        ]
      ]
    },
    {
      "note": "Reference 1: **hit** in frame 1. The hardware sets its use bit; nothing else happens.",
      "array": [
        "2:1",
        "1:1",
        "3:1"
      ],
      "marks": [
        {
          "index": 1,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "hand"
        }
      ],
      "vars": [
        [
          "refs",
          "1 2 3 1 4 1 5 1 2 1 3 [1]"
        ],
        [
          "faults",
          "8"
        ]
      ]
    },
    {
      "note": "Done: 8 faults. On the same string FIFO takes 9 (it keeps evicting hot page 1), true LRU 7 and the optimal policy 6.",
      "array": [
        "2:1",
        "1:1",
        "3:1"
      ],
      "marks": [
        {
          "index": 0,
          "color": "green"
        },
        {
          "index": 1,
          "color": "green"
        },
        {
          "index": 2,
          "color": "green"
        }
      ],
      "vars": [
        [
          "faults",
          "8"
        ]
      ]
    }
  ],
  "caption": "The clock algorithm with three frames. Cells show page:use bit; the hand is the arrow."
},
        {
          type: 'p',
          text: 'A page that was used since the hand last passed gets a **second chance**: its bit is cleared and the hand moves on. A page untouched for a full sweep is evicted. When every page has been used recently, clock degrades to FIFO for one sweep, as at the fourth fault above; with real workloads, where only part of memory is hot, it tracks LRU closely.',
        },
        {
          type: 'list',
          items: [
            '**Dirty pages:** evicting a clean page is free (the copy on disk is current), a dirty one costs a write. Real implementations prefer clean, unused pages and write dirty ones back in the background.',
            '**Linux** keeps active and inactive lists per memory zone and promotes or demotes pages based on the accessed bit; since 6.1 its *multi-generational LRU* sorts pages into several age generations.',
            '**Windows** gives each process a **working set** and, under memory pressure, trims pages from working sets onto standby lists, from which they can be reclaimed cheaply if touched again.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'In the clock algorithm, every resident page has its use bit set when a fault occurs. What happens?',
      options: [
        {
          text: 'The hand sweeps a full circle clearing every bit, then evicts the page where it started, behaving like FIFO for that fault',
          correct: true,
          why: 'Every page gets its second chance in one sweep; after a full lap the first page has bit 0 and is evicted. With no recency information left, clock cannot do better than FIFO here.',
        },
        {
          text: 'No page can be evicted, so the fault fails and the process is killed',
          why: 'Clearing bits always terminates within one lap, so clock always finds a victim.',
        },
        {
          text: 'The page with the oldest timestamp is evicted',
          why: 'Clock keeps no timestamps; that is the point of using a single hardware bit.',
        },
        {
          text: 'The hand stops at the first page and evicts it without clearing any bits',
          why: 'A page with use bit 1 is never evicted immediately; it first gets its second chance.',
        },
      ],
      explanation:
        'Clock\'s quality depends on how much information the use bits carry. If the hand sweeps too rarely, every bit is 1 and it degrades to FIFO; real kernels scan continuously in the background so the bits stay meaningful.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Working sets and thrashing',
      blocks: [
        {
          type: 'p',
          text: 'Peter Denning\'s **[[working-set|working set]]** of a process is the set of pages it used in the recent past, say the last few hundred milliseconds. It changes as the program moves between phases (loading, the main menu, a level), but at any moment it is the memory the process needs to run without faulting constantly.',
        },
        {
          type: 'p',
          text: 'If the working sets of all running processes fit in RAM, faults are rare and the system runs well. If they do not, every process keeps evicting pages that another one (or itself) needs a moment later. The system spends its time servicing major faults: the disk is saturated, the CPUs are mostly idle, and everything crawls. That is **[[thrashing]]**, and adding more processes makes it worse.',
        },
        {
          type: 'list',
          items: [
            '**Admission control:** run fewer things at once, so the remaining working sets fit. Some systems suspend whole processes rather than let everyone thrash.',
            '**Linux** overcommits memory by default ([[overcommit]]); when it truly runs out, the **OOM killer** chooses a process (usually a big one) and kills it.',
            '**Windows** never overcommits: every committed page is backed by RAM or the paging file, so allocations fail cleanly with an error instead, and the paging file grows if allowed.',
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Budgets instead of swap',
          text: 'Consoles do not swap game memory to disk at all, so a game that exceeds its memory budget does not slow down; it crashes or fails an allocation. Engines therefore track memory per category (textures, meshes, audio, gameplay) against fixed budgets and stream assets in and out explicitly, which is the game-level version of managing a working set. On PC the same game may "work" while over budget and stutter because Windows is paging.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'A build server compiles shaders with 32 parallel jobs. It slows to a crawl: CPU use is 15%, the disk is at 100% and the page-fault rate is enormous. What is the best fix?',
      options: [
        {
          text: 'Run fewer jobs at once so their combined working sets fit in RAM',
          correct: true,
          why: 'Thrashing comes from total demand exceeding memory. Reducing concurrency lets the remaining jobs keep their working sets resident; the build finishes much sooner.',
        },
        {
          text: 'Run more jobs, because the CPU is mostly idle',
          why: 'The CPU is idle because processes are waiting for page faults. More jobs means more memory demand and even more thrashing.',
        },
        {
          text: 'Switch the kernel from LRU to FIFO replacement',
          why: 'No replacement policy can help when the working sets do not fit; FIFO would be worse, not better.',
        },
        {
          text: 'Raise the build jobs\' scheduling priority',
          why: 'They are not waiting for the CPU, they are waiting for the disk. Priority changes nothing.',
        },
      ],
      explanation:
        'Low CPU, saturated disk and a huge fault rate are thrashing\'s signature. The cure is less total memory demand (fewer jobs, smaller jobs) or more RAM; the replacement policy only matters when the working set fits.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Memory-mapped files',
      blocks: [
        {
          type: 'p',
          text: 'Demand paging works for files too. `mmap` with a file descriptor ([[memory-mapped-file|memory-mapped file]]) makes a region of your address space *be* the file: reading the memory reads the file, page by page through faults, and the pages come from the kernel\'s **[[page-cache]]**, the same cache `read()` uses, without copying them into a buffer of yours.',
        },
        {
          type: 'code',
          title: 'map_save_file.cpp',
          runnable: true,
          code: `#include <fcntl.h>
#include <sys/mman.h>
#include <unistd.h>
#include <cstdio>
#include <cstring>
#include <iostream>
#include <string_view>

int main() {
    const char* path = "save_slot.bin";
    const std::string_view initial = "HP=050 GOLD=0100";

    // Create a small "save file" with ordinary write().
    int fd = open(path, O_RDWR | O_CREAT | O_TRUNC, 0644);
    if (fd == -1) { std::perror("open"); return 1; }
    if (write(fd, initial.data(), initial.size()) !=
        static_cast<ssize_t>(initial.size())) {
        std::perror("write");
        return 1;
    }

    // Map it and edit it as if it were an array in memory.
    void* p = mmap(nullptr, initial.size(), PROT_READ | PROT_WRITE,
                   MAP_SHARED, fd, 0);
    if (p == MAP_FAILED) { std::perror("mmap"); return 1; }
    close(fd);                         // the mapping stays valid
    char* save = static_cast<char*>(p);
    std::memcpy(save + 3, "100", 3);   // HP=100
    msync(p, initial.size(), MS_SYNC); // flush to the file now
    munmap(p, initial.size());

    // Read it back through the normal file API.
    char buf[32] = {};
    fd = open(path, O_RDONLY);
    if (fd == -1) { std::perror("open"); return 1; }
    const ssize_t n = read(fd, buf, sizeof buf - 1);
    close(fd);
    unlink(path);
    std::cout << "file now holds: "
              << std::string_view(buf, n > 0 ? n : 0) << '\\n';
}`,
          output: "file now holds: HP=100 GOLD=0100",
          annotations: [
            { lines: '14-20', text: 'Create the file with ordinary `open` and `write`, checking both. A mapping cannot extend a file, so the file must already be as long as the region you map.' },
            { lines: '23-25', text: '`MAP_SHARED` means writes go to the file (and are visible to other processes mapping it). `MAP_PRIVATE` would give copy-on-write pages: your changes would stay private. `mmap` returns `MAP_FAILED`, not `nullptr`, on error.' },
            { lines: '26', text: 'The mapping holds its own reference to the file, so the descriptor can be closed straight away.' },
            { lines: '28', text: 'An ordinary memory write. The page is marked dirty, and the kernel writes it back to the file eventually.' },
            { lines: '29', text: '`msync` with `MS_SYNC` forces the write-back now. Without it, the data reaches the file "soon", which is not good enough for anything that must survive a crash.' },
          ],
        },
        {
          type: 'table',
          headers: ['Pros', 'Cons'],
          rows: [
            ['No copy from kernel buffers into yours', 'Each first touch is a fault that can stall the thread unpredictably'],
            ['Pages shared between processes (that is how shared libraries load)', 'I/O errors arrive as `SIGBUS` on access, not as return values'],
            ['Random access with plain pointers; only the pages you touch are read', 'The OS must guess the access pattern unless you hint with `madvise`'],
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Pak files and streaming',
          text: 'Engines pack assets into large archive files ([[pak-file|pak files]]; Unreal also has IoStore containers). Mapping an archive is attractive for read-only lookups, but a game cannot afford a surprise major fault on the game thread, so modern streaming uses explicit asynchronous reads instead (and DirectStorage on Windows), keeping control of when I/O happens. The Storage unit covers asynchronous I/O. On Windows, `CreateFileMapping` plus `MapViewOfFile` is the equivalent of `mmap`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'bug',
      prompt: 'This asset loader maps a file read-only. When the file is missing a permission, the loader crashes inside `parseHeader` instead of reporting an error. Tap the faulty line.',
      code: `const void* mapAsset(int fd, std::size_t size) {
    void* p = mmap(nullptr, size, PROT_READ, MAP_PRIVATE,
                   fd, 0);
    if (p == nullptr) {
        std::perror("mmap");
        return nullptr;
    }
    parseHeader(static_cast<const char*>(p));
    return p;
}`,
      bugLines: [4],
      explanation:
        '`mmap` reports failure by returning `MAP_FAILED`, which is `(void*)-1`, **not** `nullptr` (a successful mapping could even legitimately be near address 0 in principle). The check never fires, `parseHeader` dereferences address `0xffffffffffffffff`, and the process dies with `SIGSEGV`. Compare with `MAP_FAILED`, then read `errno` for the reason (`EACCES` here). Every POSIX call has its own error convention; check the man page, not your instinct.',
    },
  ],
  takeaways: [
    'Clearing the **present** bit lets pages live outside RAM; touching one raises a **page fault** that the kernel resolves and then **restarts** the instruction.',
    '**Minor** faults (first touch, copy-on-write, page-cache hits) cost about a microsecond; **major** faults need disk I/O and can cost milliseconds, a disaster inside a frame.',
    'Replacement policies: **OPT** is the ideal yardstick, **LRU** approximates it via recency, **FIFO** ignores use and suffers **Belady\'s anomaly**.',
    'The **clock** algorithm approximates LRU with one hardware use bit per page, giving recently used pages a second chance; dirty pages cost a write to evict.',
    'When working sets exceed RAM the system **thrashes**; the fix is less concurrency or more memory. Linux overcommits and uses the OOM killer, Windows fails commits cleanly.',
    '`mmap` turns file I/O into demand paging: no copies, shared pages, but unpredictable faults and `SIGBUS` on I/O errors.',
  ],
  reading: [
    {
      title: 'OSTEP chapter 21: Beyond Physical Memory: Mechanisms',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys.pdf',
      source: 'book',
      note: 'Swap space, the present bit and the page-fault control flow.',
    },
    {
      title: 'OSTEP chapter 22: Beyond Physical Memory: Policies',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf',
      source: 'book',
      note: 'OPT, FIFO, random, LRU, clock and thrashing, with workload experiments.',
    },
    {
      title: 'mmap(2) — Linux manual page',
      url: 'https://man7.org/linux/man-pages/man2/mmap.2.html',
      source: 'other',
      note: 'MAP_SHARED versus MAP_PRIVATE, MAP_POPULATE, and the SIGBUS and SIGSEGV cases.',
    },
    {
      title: 'OSTEP chapter 23: Complete Virtual Memory Systems',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-complete.pdf',
      source: 'book',
      note: 'How VAX/VMS and Linux put all of this together, including Linux\'s page cache and 2Q-style lists.',
    },
  ],
};
