import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-memory-allocation',
  title: 'Memory Allocators',
  summary:
    'How `new` and `malloc` really get memory (brk, mmap and VirtualAlloc), how allocators manage it with free lists, splitting and coalescing, the two kinds of fragmentation, the kernel\'s buddy and slab allocators (with a buddy simulator in C++), and why game engines use arenas, pools and strict memory budgets.',
  minutes: 22,
  objectives: [
    'Trace how `new` reaches the OS through `malloc`, `brk`/`mmap` on Linux and `VirtualAlloc` on Windows',
    'Explain block headers, free lists, splitting, coalescing and fit policies',
    'Distinguish internal from external fragmentation and give an example of each',
    'Run a buddy allocator by hand and in C++, finding a block\'s buddy with XOR',
    'Explain the slab allocator and its user-space cousin, the pool allocator',
    'Write a per-frame arena allocator with correct alignment, and explain memory budgets on consoles',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Where `new` gets its memory',
      blocks: [
        {
          type: 'p',
          text: 'In C++ Fundamentals, `new` simply "allocated on the [[heap-memory|heap]]". There are really two layers. The **OS** hands out memory in pages, through system calls, to whole processes. A **user-space allocator** (`malloc` in the C library, which `operator new` calls by default) buys pages from the OS in bulk and carves them into the small blocks your program asks for, because a system call per `new Bullet` would be absurdly slow.',
        },
        {
          type: 'list',
          items: [
            '**Linux, small requests:** glibc grows the classic heap by moving the **[[program-break]]** up with `brk`.',
            '**Linux, large requests:** above a threshold (128 KiB by default, adjusted dynamically), glibc gives the block its own anonymous `mmap`, so `free` can return it to the OS immediately with `munmap`.',
            '**Windows:** heaps (`HeapAlloc`, which the C runtime\'s `malloc` uses) are built on `VirtualAlloc`, which works in two steps: **reserve** a range of addresses, then **commit** pages within it.',
          ],
        },
        {
          type: 'p',
          text: 'You can watch the Linux side with `strace`. The program calls `malloc(1000)`, `malloc(1 << 20)`, then frees both, printing a marker before each step:',
        },
        {
          type: 'code',
          title: 'alloc_demo.cpp',
          code: `#include <cstdio>
#include <cstdlib>

int main() {
    std::setvbuf(stdout, nullptr, _IONBF, 0);
    std::puts("-- small");
    void* small = std::malloc(1000);
    std::puts("-- big");
    void* big = std::malloc(1 << 20);
    std::puts("-- free big");
    std::free(big);
    std::puts("-- free small");
    std::free(small);
    std::puts("-- done");
}`,
          annotations: [
            { lines: '5', text: 'Unbuffered output, so each marker becomes its own `write` system call and lines up with the allocator\'s calls in the trace.' },
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Real strace output (newline writes omitted, one line wrapped)',
          code: `$ strace -e trace=brk,mmap,munmap,write ./alloc_demo
... (startup: the loader maps libc and friends) ...
write(1, "-- small", 8)                 = 8
brk(NULL)                               = 0x5643ded00000
brk(0x5643ded21000)                     = 0x5643ded21000
write(1, "-- big", 6)                   = 6
mmap(NULL, 1052672, PROT_READ|PROT_WRITE,
     MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0x7f88f824f000
write(1, "-- free big", 11)             = 11
munmap(0x7f88f824f000, 1052672)         = 0
write(1, "-- free small", 13)           = 13
write(1, "-- done", 7)                  = 7
+++ exited with 0 +++`,
        },
        {
          type: 'p',
          text: 'The 1000-byte request made glibc extend the heap by `0x21000` bytes (132 KiB), far more than asked, so the next few hundred small allocations need no system call at all. The 1 MiB request got its own mapping of 1,052,672 bytes (1 MiB plus a page for the header, rounded to pages), and `free` handed it straight back. Freeing the small block made **no** system call: the memory stays in the process for reuse.',
        },
        {
          type: 'code',
          title: 'Windows: reserve, then commit (not runnable on Linux)',
          code: `#include <windows.h>

// Reserve 1 GiB of address space for a streaming pool.
void* base = VirtualAlloc(nullptr, 1ull << 30, MEM_RESERVE,
                          PAGE_NOACCESS);
// Commit the first 64 MiB so it can be used.
void* pool = VirtualAlloc(base, 64ull << 20, MEM_COMMIT,
                          PAGE_READWRITE);
// ... later, release the whole reservation at once.
VirtualFree(base, 0, MEM_RELEASE);`,
          annotations: [
            { lines: '4-5', text: 'Reserving only claims addresses. It costs no RAM and no paging-file space, and reservations are aligned to the 64 KiB *allocation granularity*.' },
            { lines: '7-8', text: 'Committing charges the pages against the system **commit limit** (RAM plus paging file). Physical frames are still only assigned on first touch, as demand-zero pages.' },
            { lines: '10', text: '`MEM_RELEASE` with size 0 frees the entire reservation made by the first call.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why reserve and commit separately?',
          text: 'Reserving a big contiguous range up front lets a structure grow in place without ever moving: an engine can reserve 4 GiB for a pool, commit pages as it fills, and keep every pointer into it valid. The same trick on Linux is `mmap` with `PROT_NONE`, then `mprotect` to enable pages as needed.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'Why does glibc serve a 4 MiB `malloc` with its own `mmap` instead of carving it from the `brk` heap?',
      options: [
        {
          text: 'So `free` can give it back to the OS at once, and a big hole cannot get trapped below live blocks in the heap',
          correct: true,
          why: 'The heap can only shrink from its top. A large block freed in the middle of the heap would stay reserved; a separate mapping can always be unmapped.',
        },
        {
          text: 'Because `brk` cannot grow the heap by more than one page at a time',
          why: '`brk` can move the break by any amount; that is not the limitation.',
        },
        {
          text: 'Because memory from `mmap` is faster to access than heap memory',
          why: 'Once mapped, both are ordinary anonymous pages and are equally fast.',
        },
        {
          text: 'Because the kernel forbids heaps larger than 128 KiB',
          why: '128 KiB is glibc\'s default threshold for using `mmap`, a tuning choice, not a kernel limit.',
        },
      ],
      explanation:
        'The program break is a single boundary, so the classic heap behaves like a stack of pages. Large, long-lived or randomly freed blocks fragment it, so allocators give them separate mappings. The cost is a system call (and later a TLB shootdown) per large allocation, which is why the threshold is not tiny.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Free lists: splitting and coalescing',
      blocks: [
        {
          type: 'p',
          text: 'Inside its pages, an allocator must answer two questions fast: where is a free block big enough for this request, and how big is the block being freed? `free(p)` gets only a pointer, so most allocators put a small **header** just before each block recording its size and whether it is free. Free blocks are linked into a **[[free-list]]**:',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 208" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="70" width="12" height="40" rx="0" class="f-gray" fill-opacity="0.35"/><rect x="14" y="70" width="12" height="40" rx="0" fill="none" class="s-gray" stroke-width="1"/><rect x="26" y="70" width="56.16" height="40" rx="0" class="f-orange" fill-opacity="0.2"/><rect x="26" y="70" width="56.16" height="40" rx="0" fill="none" class="s-orange" stroke-width="1"/><text x="54.08" y="88" font-size="11.5" text-anchor="middle" class="t-orange" font-weight="700">A</text><text x="54.08" y="102" font-size="10" text-anchor="middle">48 B</text><rect x="82.16" y="70" width="12" height="40" rx="0" class="f-gray" fill-opacity="0.35"/><rect x="82.16" y="70" width="12" height="40" rx="0" fill="none" class="s-gray" stroke-width="1"/><rect x="94.16" y="70" width="33.44" height="40" rx="0" class="f-green" fill-opacity="0.2"/><rect x="94.16" y="70" width="33.44" height="40" rx="0" fill="none" class="s-green" stroke-width="1"/><text x="110.88" y="88" font-size="11.5" text-anchor="middle" class="t-green" font-weight="700">free</text><text x="110.88" y="102" font-size="10" text-anchor="middle">32 B</text><rect x="127.6" y="70" width="12" height="40" rx="0" class="f-gray" fill-opacity="0.35"/><rect x="127.6" y="70" width="12" height="40" rx="0" fill="none" class="s-gray" stroke-width="1"/><rect x="139.6" y="70" width="78.88" height="40" rx="0" class="f-orange" fill-opacity="0.2"/><rect x="139.6" y="70" width="78.88" height="40" rx="0" fill="none" class="s-orange" stroke-width="1"/><text x="179.04" y="88" font-size="11.5" text-anchor="middle" class="t-orange" font-weight="700">B</text><text x="179.04" y="102" font-size="10" text-anchor="middle">64 B</text><rect x="218.48" y="70" width="12" height="40" rx="0" class="f-gray" fill-opacity="0.35"/><rect x="218.48" y="70" width="12" height="40" rx="0" fill="none" class="s-gray" stroke-width="1"/><rect x="230.48" y="70" width="124.32" height="40" rx="0" class="f-green" fill-opacity="0.2"/><rect x="230.48" y="70" width="124.32" height="40" rx="0" fill="none" class="s-green" stroke-width="1"/><text x="292.64" y="88" font-size="11.5" text-anchor="middle" class="t-green" font-weight="700">free</text><text x="292.64" y="102" font-size="10" text-anchor="middle">96 B</text><rect x="354.8" y="70" width="12" height="40" rx="0" class="f-gray" fill-opacity="0.35"/><rect x="354.8" y="70" width="12" height="40" rx="0" fill="none" class="s-gray" stroke-width="1"/><rect x="366.8" y="70" width="44.8" height="40" rx="0" class="f-orange" fill-opacity="0.2"/><rect x="366.8" y="70" width="44.8" height="40" rx="0" fill="none" class="s-orange" stroke-width="1"/><text x="389.2" y="88" font-size="11.5" text-anchor="middle" class="t-orange" font-weight="700">C</text><text x="389.2" y="102" font-size="10" text-anchor="middle">40 B</text><rect x="411.6" y="70" width="12" height="40" rx="0" class="f-gray" fill-opacity="0.35"/><rect x="411.6" y="70" width="12" height="40" rx="0" fill="none" class="s-gray" stroke-width="1"/><rect x="423.6" y="70" width="56.16" height="40" rx="0" class="f-green" fill-opacity="0.2"/><rect x="423.6" y="70" width="56.16" height="40" rx="0" fill="none" class="s-green" stroke-width="1"/><text x="451.68" y="88" font-size="11.5" text-anchor="middle" class="t-green" font-weight="700">free</text><text x="451.68" y="102" font-size="10" text-anchor="middle">48 B</text><text x="14" y="126" font-size="10.5" text-anchor="start" class="t-gray">gray = header (size, free flag); the pointer malloc returns points just past it</text><text x="14" y="24" font-size="11" text-anchor="start" class="t-green" font-weight="700">head</text><path d="M28,30 L28,44 L88.16,44 L88.16,63" fill="none" class="s-green" stroke-width="1.3"/><path d="M88.2,68.0 L90.9,62.0 L85.5,62.0 Z" class="f-green"/><path d="M88.16,68 L88.16,44 L224.48,44 L224.48,63" fill="none" class="s-green" stroke-width="1.3"/><path d="M224.5,68.0 L227.2,62.0 L221.8,62.0 Z" class="f-green"/><path d="M224.48,68 L224.48,44 L417.6,44 L417.6,63" fill="none" class="s-green" stroke-width="1.3"/><path d="M417.6,68.0 L420.3,62.0 L414.9,62.0 Z" class="f-green"/><text x="14" y="150" font-size="10.5" text-anchor="start">malloc(20): first fit takes the 32 B block; best fit also picks it (smallest that fits).</text><text x="14" y="166" font-size="10.5" text-anchor="start">malloc(80): only the 96 B block fits, so it is split: 80 B used, 16 B left free.</text><text x="14" y="182" font-size="10.5" text-anchor="start">free(C): C's neighbours are both free, so all three coalesce into one block.</text><text x="14" y="198" font-size="10.5" text-anchor="start" class="t-red">Without coalescing: 176 B free in total, yet no request over 96 B can succeed.</text></svg>`,
          alt: 'A row of heap blocks, each preceded by a gray header: used A 48 bytes, free 32, used B 64, free 96, used C 40, free 48. Green arrows from a head pointer link the three free blocks.',
          caption: 'A heap with headers and a free list threaded through the free blocks themselves.',
        },
        {
          type: 'list',
          items: [
            '**Splitting:** a request smaller than the chosen free block takes the front part; the rest stays on the free list as a smaller block.',
            '**Coalescing:** when a block is freed, merge it with free neighbours. Without this the heap decays into slivers that no request fits.',
            '**Fit policy:** *first fit* takes the first block that is big enough (fast); *best fit* searches for the smallest that fits (less waste, slower); *next fit* resumes where the last search stopped.',
          ],
        },
        {
          type: 'p',
          text: 'Real allocators avoid long list walks with **segregated free lists**: separate lists (bins) per size class, so a 48-byte request goes straight to the 48-byte bin. glibc adds per-thread caches (tcache) so most `malloc` and `free` calls touch no shared state and take no lock; jemalloc, mimalloc and Windows\' segment heap use similar ideas.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Why heap corruption crashes far away',
          text: 'Headers sit right next to your data. Writing one element past the end of an array overwrites the next block\'s header, and nothing notices until a later `free` or `malloc` trusts that header, sometimes seconds later in unrelated code. Sanitizers (`-fsanitize=address`) and debug heaps put guard bytes or guard pages around blocks to catch the write when it happens.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'numeric',
      prompt: 'A simple allocator puts a 16-byte header before every block and rounds each block\'s payload up to a multiple of 16 bytes. How many bytes of heap does `malloc(20)` consume?',
      answer: 48,
      unit: 'bytes',
      explanation:
        'The payload rounds up from 20 to 32, plus the 16-byte header: **48 bytes** for 20 requested, 140% overhead. This is why allocating millions of tiny objects one by one wastes memory as well as time, and why engines group small objects into pools and arrays. (glibc\'s exact layout differs, but its minimum chunk on 64-bit Linux is 32 bytes.)',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Two kinds of fragmentation',
      blocks: [
        {
          type: 'p',
          text: '**[[memory-fragmentation|Fragmentation]]** is memory you have but cannot use. It comes in two forms that trade against each other:',
        },
        {
          type: 'compare',
          left: {
            title: 'External fragmentation',
            tone: 'neutral',
            text: 'Free memory is split into pieces **between** allocated blocks, too small for a request even though the total is large. Typical of variable-size allocation: segments, `malloc`. In the figure, 176 bytes are free but no request over 96 bytes can succeed.',
          },
          right: {
            title: 'Internal fragmentation',
            tone: 'neutral',
            text: 'Memory wasted **inside** allocated blocks because sizes are rounded up. Typical of fixed-size schemes: pages, size classes, buddy blocks. A 4 KiB page holding a 100-byte object wastes 3,996 bytes.',
          },
        },
        {
          type: 'p',
          text: 'Long-running programs suffer most. A game that plays for hours, allocating and freeing textures, strings and entities of every size, can reach a state where a 64 MiB texture allocation fails with 500 MiB "free". On a PC the allocator quietly asks the OS for more address space; on a console with a fixed budget, that is a crash in the third hour of a play session that never happened in a 10-minute test.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Fighting fragmentation by lifetime',
          text: 'The best defence is to keep objects with different **lifetimes** apart: level data in one region freed all at once at level end, per-frame temporaries in a region reset every frame, long-lived systems in another. Objects that die together never leave holes between survivors.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'True or false: with glibc on Linux, calling `free` on a 200-byte block returns that memory to the operating system.',
      answer: false,
      explanation:
        'False. The block goes back on the allocator\'s free lists (or its thread cache) for reuse by later `malloc` calls; the process\'s memory footprint does not shrink. glibc only gives memory back when the free space at the *top* of the heap exceeds a trim threshold (moving the break down), or immediately for blocks that had their own `mmap`. That is why a process\'s resident size often stays high after it frees lots of small objects.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'The buddy allocator',
      blocks: [
        {
          type: 'p',
          text: 'The kernel needs to allocate physical frames, often several contiguous ones (for DMA buffers, huge pages, kernel stacks), and to coalesce them again quickly. The **[[buddy-allocator|buddy allocator]]** trades internal fragmentation for very cheap splitting and merging. Every block is a power of two in size. To allocate, round the request up to a power of two; take a free block of that size, or split a bigger one in half repeatedly. The two halves of a split are **buddies**.',
        },
        {
  "type": "algo",
  "view": "graph",
  "width": 440,
  "height": 250,
  "nodes": [
    {
      "id": "n1",
      "x": 220,
      "y": 36,
      "label": "1024"
    },
    {
      "id": "n2",
      "x": 125,
      "y": 92,
      "label": "512"
    },
    {
      "id": "n3",
      "x": 315,
      "y": 92,
      "label": "512"
    },
    {
      "id": "n4",
      "x": 78,
      "y": 148,
      "label": "256"
    },
    {
      "id": "n5",
      "x": 172,
      "y": 148,
      "label": "256"
    },
    {
      "id": "n6",
      "x": 268,
      "y": 148,
      "label": "256"
    },
    {
      "id": "n7",
      "x": 362,
      "y": 148,
      "label": "256"
    },
    {
      "id": "n8",
      "x": 54,
      "y": 204,
      "label": "128"
    },
    {
      "id": "n9",
      "x": 101,
      "y": 204,
      "label": "128"
    },
    {
      "id": "n10",
      "x": 149,
      "y": 204,
      "label": "128"
    },
    {
      "id": "n11",
      "x": 196,
      "y": 204,
      "label": "128"
    },
    {
      "id": "n12",
      "x": 244,
      "y": 204,
      "label": "128"
    },
    {
      "id": "n13",
      "x": 291,
      "y": 204,
      "label": "128"
    },
    {
      "id": "n14",
      "x": 339,
      "y": 204,
      "label": "128"
    },
    {
      "id": "n15",
      "x": 386,
      "y": 204,
      "label": "128"
    }
  ],
  "edges": [
    {
      "from": "n1",
      "to": "n2"
    },
    {
      "from": "n1",
      "to": "n3"
    },
    {
      "from": "n2",
      "to": "n4"
    },
    {
      "from": "n2",
      "to": "n5"
    },
    {
      "from": "n3",
      "to": "n6"
    },
    {
      "from": "n3",
      "to": "n7"
    },
    {
      "from": "n4",
      "to": "n8"
    },
    {
      "from": "n4",
      "to": "n9"
    },
    {
      "from": "n5",
      "to": "n10"
    },
    {
      "from": "n5",
      "to": "n11"
    },
    {
      "from": "n6",
      "to": "n12"
    },
    {
      "from": "n6",
      "to": "n13"
    },
    {
      "from": "n7",
      "to": "n14"
    },
    {
      "from": "n7",
      "to": "n15"
    }
  ],
  "interval": 2000,
  "frames": [
    {
      "note": "A 1024-byte pool is one free block (green). Blocks are 128, 256, 512 or 1024 bytes; a gray node has been split into two buddies.",
      "hidden": [
        "n2",
        "n3",
        "n4",
        "n5",
        "n6",
        "n7",
        "n8",
        "n9",
        "n10",
        "n11",
        "n12",
        "n13",
        "n14",
        "n15"
      ],
      "nodeColors": [
        {
          "id": "n1",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "n1",
          "text": "free"
        }
      ],
      "vars": [
        [
          "free lists",
          "128:[]  256:[]  512:[]  1024:[0]"
        ]
      ]
    },
    {
      "note": "A requests 100 bytes, rounded up to 128 (28 bytes of internal fragmentation): split down to 128. A gets offset 0.",
      "hidden": [
        "n6",
        "n7",
        "n10",
        "n11",
        "n12",
        "n13",
        "n14",
        "n15"
      ],
      "nodeColors": [
        {
          "id": "n1",
          "color": "gray"
        },
        {
          "id": "n2",
          "color": "gray"
        },
        {
          "id": "n3",
          "color": "green"
        },
        {
          "id": "n4",
          "color": "gray"
        },
        {
          "id": "n5",
          "color": "green"
        },
        {
          "id": "n8",
          "color": "orange"
        },
        {
          "id": "n9",
          "color": "green"
        },
        {
          "id": "n8",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "n3",
          "text": "free"
        },
        {
          "id": "n5",
          "text": "free"
        },
        {
          "id": "n8",
          "text": "A"
        },
        {
          "id": "n9",
          "text": "free"
        }
      ],
      "vars": [
        [
          "free lists",
          "128:[128]  256:[256]  512:[512]  1024:[]"
        ]
      ]
    },
    {
      "note": "B requests 240 bytes, rounded up to 256 (16 bytes of internal fragmentation): a free 256 block already exists. B gets offset 256.",
      "hidden": [
        "n6",
        "n7",
        "n10",
        "n11",
        "n12",
        "n13",
        "n14",
        "n15"
      ],
      "nodeColors": [
        {
          "id": "n1",
          "color": "gray"
        },
        {
          "id": "n2",
          "color": "gray"
        },
        {
          "id": "n3",
          "color": "green"
        },
        {
          "id": "n4",
          "color": "gray"
        },
        {
          "id": "n5",
          "color": "orange"
        },
        {
          "id": "n8",
          "color": "orange"
        },
        {
          "id": "n9",
          "color": "green"
        },
        {
          "id": "n5",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "n3",
          "text": "free"
        },
        {
          "id": "n5",
          "text": "B"
        },
        {
          "id": "n8",
          "text": "A"
        },
        {
          "id": "n9",
          "text": "free"
        }
      ],
      "vars": [
        [
          "free lists",
          "128:[128]  256:[]  512:[512]  1024:[]"
        ]
      ]
    },
    {
      "note": "C requests 60 bytes, rounded up to 128 (68 bytes of internal fragmentation): a free 128 block already exists. C gets offset 128.",
      "hidden": [
        "n6",
        "n7",
        "n10",
        "n11",
        "n12",
        "n13",
        "n14",
        "n15"
      ],
      "nodeColors": [
        {
          "id": "n1",
          "color": "gray"
        },
        {
          "id": "n2",
          "color": "gray"
        },
        {
          "id": "n3",
          "color": "green"
        },
        {
          "id": "n4",
          "color": "gray"
        },
        {
          "id": "n5",
          "color": "orange"
        },
        {
          "id": "n8",
          "color": "orange"
        },
        {
          "id": "n9",
          "color": "orange"
        },
        {
          "id": "n9",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "n3",
          "text": "free"
        },
        {
          "id": "n5",
          "text": "B"
        },
        {
          "id": "n8",
          "text": "A"
        },
        {
          "id": "n9",
          "text": "C"
        }
      ],
      "vars": [
        [
          "free lists",
          "128:[]  256:[]  512:[512]  1024:[]"
        ]
      ]
    },
    {
      "note": "D requests 500 bytes, rounded up to 512 (12 bytes of internal fragmentation): a free 512 block already exists. D gets offset 512.",
      "hidden": [
        "n6",
        "n7",
        "n10",
        "n11",
        "n12",
        "n13",
        "n14",
        "n15"
      ],
      "nodeColors": [
        {
          "id": "n1",
          "color": "gray"
        },
        {
          "id": "n2",
          "color": "gray"
        },
        {
          "id": "n3",
          "color": "orange"
        },
        {
          "id": "n4",
          "color": "gray"
        },
        {
          "id": "n5",
          "color": "orange"
        },
        {
          "id": "n8",
          "color": "orange"
        },
        {
          "id": "n9",
          "color": "orange"
        },
        {
          "id": "n3",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "n3",
          "text": "D"
        },
        {
          "id": "n5",
          "text": "B"
        },
        {
          "id": "n8",
          "text": "A"
        },
        {
          "id": "n9",
          "text": "C"
        }
      ],
      "vars": [
        [
          "free lists",
          "128:[]  256:[]  512:[]  1024:[]"
        ]
      ]
    },
    {
      "note": "Free A. Its buddy at offset 128 is still in use, so no merge: the block just goes on the 128 free list.",
      "hidden": [
        "n6",
        "n7",
        "n10",
        "n11",
        "n12",
        "n13",
        "n14",
        "n15"
      ],
      "nodeColors": [
        {
          "id": "n1",
          "color": "gray"
        },
        {
          "id": "n2",
          "color": "gray"
        },
        {
          "id": "n3",
          "color": "orange"
        },
        {
          "id": "n4",
          "color": "gray"
        },
        {
          "id": "n5",
          "color": "orange"
        },
        {
          "id": "n8",
          "color": "green"
        },
        {
          "id": "n9",
          "color": "orange"
        },
        {
          "id": "n8",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "n3",
          "text": "D"
        },
        {
          "id": "n5",
          "text": "B"
        },
        {
          "id": "n8",
          "text": "free"
        },
        {
          "id": "n9",
          "text": "C"
        }
      ],
      "vars": [
        [
          "free lists",
          "128:[0]  256:[]  512:[]  1024:[]"
        ]
      ]
    },
    {
      "note": "Free C. Its buddy is free too, so they merge into 256.",
      "hidden": [
        "n6",
        "n7",
        "n8",
        "n9",
        "n10",
        "n11",
        "n12",
        "n13",
        "n14",
        "n15"
      ],
      "nodeColors": [
        {
          "id": "n1",
          "color": "gray"
        },
        {
          "id": "n2",
          "color": "gray"
        },
        {
          "id": "n3",
          "color": "orange"
        },
        {
          "id": "n4",
          "color": "green"
        },
        {
          "id": "n5",
          "color": "orange"
        },
        {
          "id": "n4",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "n3",
          "text": "D"
        },
        {
          "id": "n4",
          "text": "free"
        },
        {
          "id": "n5",
          "text": "B"
        }
      ],
      "vars": [
        [
          "free lists",
          "128:[]  256:[0]  512:[]  1024:[]"
        ]
      ]
    },
    {
      "note": "Free B. Its buddy is free too, so they merge into 512.",
      "hidden": [
        "n4",
        "n5",
        "n6",
        "n7",
        "n8",
        "n9",
        "n10",
        "n11",
        "n12",
        "n13",
        "n14",
        "n15"
      ],
      "nodeColors": [
        {
          "id": "n1",
          "color": "gray"
        },
        {
          "id": "n2",
          "color": "green"
        },
        {
          "id": "n3",
          "color": "orange"
        },
        {
          "id": "n2",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "n2",
          "text": "free"
        },
        {
          "id": "n3",
          "text": "D"
        }
      ],
      "vars": [
        [
          "free lists",
          "128:[]  256:[]  512:[0]  1024:[]"
        ]
      ]
    },
    {
      "note": "Free D. Its buddy is free too, so they merge into 1024.",
      "hidden": [
        "n2",
        "n3",
        "n4",
        "n5",
        "n6",
        "n7",
        "n8",
        "n9",
        "n10",
        "n11",
        "n12",
        "n13",
        "n14",
        "n15"
      ],
      "nodeColors": [
        {
          "id": "n1",
          "color": "green"
        },
        {
          "id": "n1",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "n1",
          "text": "free"
        }
      ],
      "vars": [
        [
          "free lists",
          "128:[]  256:[]  512:[]  1024:[0]"
        ]
      ]
    }
  ],
  "caption": "Buddy allocation on a 1024-byte pool, matching the C++ program. Orange = allocated, green = free block, gray = split, blue = the block this step touched."
},
        {
          type: 'p',
          text: 'Finding a block\'s buddy needs no search. Blocks of size `s` start at multiples of `s`, and the two halves of a parent differ only in the bit worth `s`, so `buddy = offset XOR size`. When a block is freed, check whether its buddy is on the free list for that size; if so, merge, and repeat one level up. Here is the same allocator in C++:',
        },
        {
          type: 'code',
          title: 'buddy.cpp',
          runnable: true,
          code: `#include <array>
#include <cstddef>
#include <format>
#include <iostream>
#include <optional>
#include <set>
#include <string>

// A buddy allocator managing offsets in a 1024-byte pool.
// Order k means a block of 128 << k bytes: 128, 256, 512, 1024.
class Buddy {
public:
    static constexpr std::size_t kMin = 128, kOrders = 4;
    Buddy() { free_[kOrders - 1].insert(0); }   // one 1024 block

    std::optional<std::size_t> alloc(std::size_t bytes) {
        std::size_t want = 0;                    // smallest order
        while ((kMin << want) < bytes) ++want;   // that fits
        std::size_t k = want;
        while (k < kOrders && free_[k].empty()) ++k;
        if (k == kOrders) return std::nullopt;   // out of memory
        const std::size_t off = *free_[k].begin();
        free_[k].erase(free_[k].begin());
        while (k > want) {                       // split in halves
            --k;
            free_[k].insert(off + (kMin << k));  // upper half free
        }
        return off;
    }

    void release(std::size_t off, std::size_t bytes) {
        std::size_t k = 0;
        while ((kMin << k) < bytes) ++k;
        while (k + 1 < kOrders) {
            const std::size_t buddy = off ^ (kMin << k); // flip
            if (!free_[k].contains(buddy)) break;  // buddy in use
            free_[k].erase(buddy);                 // merge
            off &= ~(kMin << k);                   // lower half
            ++k;
        }
        free_[k].insert(off);
    }

    std::string freeLists() const {
        std::string s;
        for (std::size_t k = 0; k < kOrders; ++k) {
            s += std::format(" {}:[", kMin << k);
            for (std::size_t off : free_[k])
                s += std::format(" {}", off);
            s += " ]";
        }
        return s;
    }

private:
    std::array<std::set<std::size_t>, kOrders> free_;
};

int main() {
    Buddy b;
    const std::array<std::pair<char, std::size_t>, 4> reqs{
        {{'A', 100}, {'B', 240}, {'C', 60}, {'D', 500}}};
    std::array<std::size_t, 4> at{};
    for (std::size_t i = 0; i < reqs.size(); ++i) {
        at[i] = b.alloc(reqs[i].second).value();
        std::cout << std::format("alloc {} ({:3} B) at {:4} |{}\\n",
            reqs[i].first, reqs[i].second, at[i], b.freeLists());
    }
    for (std::size_t i : {0, 2, 1, 3}) {
        b.release(at[i], reqs[i].second);
        std::cout << std::format("free  {}            |{}\\n",
            reqs[i].first, b.freeLists());
    }
}`,
          output: "alloc A (100 B) at    0 | 128:[ 128 ] 256:[ 256 ] 512:[ 512 ] 1024:[ ]\nalloc B (240 B) at  256 | 128:[ 128 ] 256:[ ] 512:[ 512 ] 1024:[ ]\nalloc C ( 60 B) at  128 | 128:[ ] 256:[ ] 512:[ 512 ] 1024:[ ]\nalloc D (500 B) at  512 | 128:[ ] 256:[ ] 512:[ ] 1024:[ ]\nfree  A            | 128:[ 0 ] 256:[ ] 512:[ ] 1024:[ ]\nfree  C            | 128:[ ] 256:[ 0 ] 512:[ ] 1024:[ ]\nfree  B            | 128:[ ] 256:[ ] 512:[ 0 ] 1024:[ ]\nfree  D            | 128:[ ] 256:[ ] 512:[ ] 1024:[ 0 ]",
          annotations: [
            { lines: '13-14', text: 'Four orders: 128, 256, 512 and 1024 bytes. The pool starts as a single free block of the top order.' },
            { lines: '17-18', text: 'Round the request up to the smallest order that fits. This is where internal fragmentation comes from: 60 bytes still takes 128.' },
            { lines: '20-21', text: 'Find the smallest order with a free block, possibly larger than needed.' },
            { lines: '24-27', text: 'Split down: each step keeps the lower half and puts the upper half (`off + size`) on the free list one order down.' },
            { lines: '35', text: 'The buddy is found by flipping one bit of the offset. No searching, no headers.' },
            { lines: '36-39', text: 'If the buddy is free, remove it from its list, merge, and continue one order up. Clearing the bit (`&= ~size`) gives the merged block\'s start.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Linux\'s page allocator',
          text: 'Linux manages physical memory with a buddy allocator over orders 0 to 10, from single 4 KiB pages up to 4 MiB blocks. `cat /proc/buddyinfo` prints how many free blocks of each order every memory zone has: a machine with plenty of order-0 blocks but no high-order ones is free but fragmented, and huge-page allocations will fail or trigger compaction.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'numeric',
      prompt: 'In a buddy allocator, a free block of size `0x2000` starts at offset `0x6000`. At what offset does its buddy start? Answer in hex.',
      answer: '0x4000',
      inputBase: 16,
      label: 'buddy offset =',
      explanation:
        '`0x6000 XOR 0x2000` = **`0x4000`**. The two blocks are the halves of the `0x4000`-sized parent starting at `0x4000`: one covers `0x4000` to `0x5FFF`, the other `0x6000` to `0x7FFF`. If both are free they merge into that parent, whose own buddy is at `0x4000 XOR 0x4000` = `0x0000`.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'numeric',
      prompt: 'A buddy allocator with a 4 KiB minimum block receives a request for 33 KiB. How many KiB inside the block it returns are wasted?',
      answer: 31,
      unit: 'KiB',
      explanation:
        'The smallest power-of-two block that fits 33 KiB is 64 KiB, so **31 KiB** (almost half) is internal fragmentation. Requests just above a power of two are the buddy system\'s worst case, which is why the kernel uses it for page-granularity allocations and puts slab caches on top for small objects.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'The slab allocator',
      blocks: [
        {
          type: 'p',
          text: 'Most kernel allocations are small objects of a few fixed types: inodes, directory entries, process descriptors, network buffers. Rounding each to a power of two would waste memory, and general-purpose free lists would fragment. Jeff Bonwick\'s **[[slab-allocator|slab allocator]]** (SunOS 5.4, 1994) gives each object type its own **cache**:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Slabs', text: 'A cache gets one or more pages from the buddy allocator and divides each into equal slots sized for exactly its object type. That page is a *slab*.' },
            { title: 'Allocate', text: 'Pop a free slot from a partially used slab. Constant time, no searching, no per-object header.' },
            { title: 'Free', text: 'Push the slot back onto its slab\'s free list. A slab whose slots are all free can be returned to the buddy allocator.' },
          ],
        },
        {
          type: 'p',
          text: 'Objects of one type sit together, so there is no external fragmentation between types, and recently freed objects are still warm in cache when reused. Linux\'s implementation today is **SLUB** (the original SLAB and the tiny SLOB were removed in 6.8 and 6.4), and `kmalloc` is a family of slab caches for common sizes; `/proc/slabinfo` lists them.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'The engine version: pool allocators',
          text: 'A **[[pool-allocator]]** is a user-space slab: one block divided into equal slots, with the free slots linked through the slots themselves, so allocate and free are a couple of pointer operations. Engines use pools for projectiles, particles, network packets and components: things created and destroyed constantly, all the same size.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'fill',
      prompt: 'Match each allocator to what it is built for.',
      template: 'The kernel allocates physical page frames with the ___ allocator, and fixed-size kernel objects with the ___ allocator. A game resets a ___ allocator once per frame, and keeps its bullets in a ___ allocator.',
      templateIsCode: false,
      blanks: [{ answers: ['buddy'] }, { answers: ['slab'] }, { answers: ['linear', 'arena'] }, { answers: ['pool'] }],
      wordBank: ['buddy', 'slab', 'linear', 'pool', 'best-fit', 'garbage-collected'],
      explanation:
        'Buddy: power-of-two blocks of pages, cheap splitting and merging. Slab: one cache per object type, on top of buddy. Linear (arena): bump a pointer, reset everything at once, ideal for per-frame temporaries. Pool: fixed-size slots with O(1) allocate and free, ideal for many identical short-lived objects.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Why game engines bring their own allocators',
      blocks: [
        {
          type: 'p',
          text: 'General-purpose `malloc` is good on average, but games care about the worst case and about control. A big title allocates millions of times per frame from many threads; it cannot afford lock contention, unpredictable latency, page faults mid-frame or slowly growing fragmentation. So engines put their own allocators in front of the OS, each matched to a lifetime:',
        },
        {
          type: 'code',
          title: 'frame_arena.cpp',
          runnable: true,
          code: `#include <array>
#include <cstddef>
#include <iostream>
#include <memory>
#include <memory_resource>
#include <new>
#include <vector>

// A per-frame linear (bump) allocator: allocation is an align and
// an add; everything is freed at once when the frame ends.
class FrameArena {
public:
    explicit FrameArena(std::size_t bytes)
        : buffer_(new std::byte[bytes]), size_(bytes) {}
    ~FrameArena() { delete[] buffer_; }
    FrameArena(const FrameArena&) = delete;
    FrameArena& operator=(const FrameArena&) = delete;

    void* allocate(std::size_t bytes, std::size_t align) {
        // Round up to a multiple of align (a power of two).
        const std::size_t start = (used_ + align - 1) & ~(align-1);
        if (start + bytes > size_) throw std::bad_alloc{};
        used_ = start + bytes;
        return buffer_ + start;
    }
    void reset() { used_ = 0; }          // "free" the whole frame
    std::size_t used() const { return used_; }

private:
    std::byte* buffer_;        // new[] gives max_align_t alignment
    std::size_t size_;
    std::size_t used_ = 0;
};

struct Particle { float x, y, vx, vy; };  // 16 bytes, align 4

int main() {
    FrameArena arena{64 * 1024};
    for (int frame = 0; frame < 2; ++frame) {
        arena.allocate(3, 1);                    // a short string
        arena.allocate(sizeof(double), alignof(double));
        void* raw = arena.allocate(100 * sizeof(Particle),
                                   alignof(Particle));
        auto* ps = static_cast<Particle*>(raw);
        std::construct_at(ps, Particle{0, 0, 1, 1});
        std::cout << "frame " << frame << ": " << arena.used()
                  << " bytes used\\n";
        arena.reset();                   // end of frame
    }

    // The standard library's version of the same idea (C++17).
    std::array<std::byte, 1024> stackBuffer;
    std::pmr::monotonic_buffer_resource pool{stackBuffer.data(),
                                             stackBuffer.size()};
    std::pmr::vector<int> hits{&pool};
    for (int i = 0; i < 10; ++i) hits.push_back(i * i);
    std::cout << "pmr vector holds " << hits.size()
              << " ints, last = " << hits.back() << '\\n';
}`,
          output: "frame 0: 1616 bytes used\nframe 1: 1616 bytes used\npmr vector holds 10 ints, last = 81",
          annotations: [
            { lines: '13-14', text: 'One big block, allocated once at startup. In an engine it would come from `VirtualAlloc` or `mmap` and be pre-faulted during loading.' },
            { lines: '19-25', text: 'Allocation is an align-up and an add: a handful of instructions, no locks, no headers, no searching. This is the **[[arena-allocator|arena]]** (linear or bump) allocator.' },
            { lines: '21', text: 'Round `used_` up to a multiple of `align` with the classic mask trick, valid because alignments are powers of two. Skipping this hands out misaligned memory, which is undefined behaviour.' },
            { lines: '26', text: 'Freeing is resetting one integer. Nothing is freed individually, so destructors are not called: arenas suit trivially destructible data, or code that destroys objects deliberately.' },
            { lines: '40-41', text: '3 bytes, then 8-byte alignment for the double moves to offset 8, ending at 16; then 1,600 bytes of particles: 1,616 used, identical every frame.' },
            { lines: '45', text: '`std::construct_at` (C++20) starts the object\'s lifetime in the raw memory, the modern spelling of placement `new`.' },
            { lines: '52-55', text: 'The standard library has the same idea: `std::pmr::monotonic_buffer_resource` bumps through a buffer, here one on the stack, and any `std::pmr` container can use it.' },
          ],
        },
        {
          type: 'table',
          headers: ['Allocator', 'Lifetime it fits', 'Typical engine use'],
          rows: [
            ['Frame (linear) arena, often double-buffered', 'One frame (or two, when the render thread lags a frame behind)', 'Temporary arrays, command lists, strings built for this frame'],
            ['Level or scene arena', 'Until the level unloads', 'Level geometry and data loaded together and freed together'],
            ['Pool', 'Arbitrary, but one size', 'Particles, projectiles, components, packets'],
            ['General heap (tagged)', 'Arbitrary', 'Everything else, tracked by category'],
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Memory budgets on consoles',
          text: 'A console has a fixed amount of RAM shared by CPU and GPU and no swap for the game. Xbox Series X, for example, has 16 GB, of which 13.5 GB is available to the game. Studios split that into **budgets** per category (textures, meshes, audio, animation, gameplay, streaming headroom), tag every allocation with its category and fail the build or flag a test run that exceeds one. Running out is a crash, not a slowdown, so memory is planned as carefully as frame time.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'On PC, running out looks different',
          text: 'Linux **[[overcommit|overcommits]]**: `new` of a huge buffer usually succeeds, and the failure comes later as the OOM killer terminating the process when the pages are touched. Windows charges commits against RAM plus the paging file, so `VirtualAlloc(MEM_COMMIT)` or `new` fails up front (throwing `std::bad_alloc`), but the system may page heavily before that. Either way, catching `std::bad_alloc` is not a memory strategy; budgets are.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'bug',
      prompt: 'A teammate\'s arena runs fine in a test with only `int` and `float` data, but crashes in a SIMD math routine that allocates `alignas(16)` vectors from it. Tap the faulty line.',
      code: `class Arena {
public:
    void* allocate(std::size_t bytes, std::size_t align) {
        void* p = base_ + used_;
        used_ += bytes;
        if (used_ > size_) throw std::bad_alloc{};
        return p;
    }
private:
    std::byte* base_;
    std::size_t size_;
    std::size_t used_ = 0;
};`,
      bugLines: [4],
      explanation:
        'Line 4 ignores `align`: the returned pointer is wherever the previous allocation ended. After a 6-byte allocation, a 16-byte-aligned vector lands at offset 6. Using a misaligned object is undefined behaviour; aligned SIMD loads such as `_mm_load_ps` fault on x86, and some console and ARM instructions do too. Round up first: `used_ = (used_ + align - 1) & ~(align - 1);` (alignments are powers of two). As a second bug, the bounds check happens after `used_` is already advanced; it should check `start + bytes > size_` before committing.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'Each frame, your particle system builds a temporary sorted array of 50,000 visible particle indices, uses it for rendering, and discards it. Which allocation strategy fits best?',
      options: [
        {
          text: 'A per-frame linear arena that is reset at the end of the frame',
          correct: true,
          why: 'The data lives exactly one frame. Bumping a pointer costs almost nothing, there is no fragmentation, and the memory is reused (already faulted in and cache-warm) every frame.',
        },
        {
          text: '`new int[50\'000]` and `delete[]` every frame',
          why: 'It works, but goes through the general allocator each frame. A 200 KB block may even be a fresh `mmap` and `munmap`, with page faults and possibly TLB shootdowns every frame.',
        },
        {
          text: 'A pool allocator with 4-byte slots, one index per allocation',
          why: '50,000 separate allocations for one array is pure overhead. Pools suit many independent objects with individual lifetimes, not one array.',
        },
        {
          text: 'A buddy allocator, because its blocks are powers of two',
          why: 'Buddy allocation rounds 200 KB up to 256 KB and still manages blocks individually. Nothing here needs splitting or merging.',
        },
      ],
      explanation:
        'Choose allocators by **lifetime** and **size pattern**. "Everything allocated this frame dies at the end of this frame" is the arena\'s ideal case, which is why nearly every engine has a frame allocator. (A `std::vector` kept between frames and `clear()`ed would also work: it keeps its capacity.)',
    },
  ],
  takeaways: [
    '`new` calls `malloc`, which buys memory from the OS in bulk: `brk` for the small-object heap and `mmap` for large blocks on Linux, `VirtualAlloc` (reserve, then commit) on Windows.',
    'Allocators track blocks with **headers** and **free lists**, **split** big blocks and **coalesce** freed neighbours; segregated size classes and per-thread caches make them fast.',
    '**External** fragmentation is free memory in unusable pieces between blocks; **internal** fragmentation is waste inside rounded-up blocks.',
    'The kernel\'s **buddy allocator** manages power-of-two blocks of frames; a block\'s buddy is `offset XOR size`, so merging is cheap. **Slab** caches sit on top for fixed-size objects.',
    'Engines match allocators to lifetimes: **frame arenas**, level arenas, **pools**, and a tagged general heap, all aligned correctly.',
    'Consoles have fixed RAM and no swap for the game, so memory is managed with **budgets** per category; on PC, Linux overcommits and Windows fails commits.',
  ],
  reading: [
    {
      title: 'OSTEP chapter 14: Interlude: Memory API',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-api.pdf',
      source: 'book',
      note: 'malloc, free, brk and mmap, and the common bugs in using them.',
    },
    {
      title: 'OSTEP chapter 17: Free-Space Management',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf',
      source: 'book',
      note: 'Headers, splitting, coalescing, fit policies, segregated lists, slab and buddy allocation.',
    },
    {
      title: 'std::pmr::monotonic_buffer_resource (cppreference)',
      url: 'https://en.cppreference.com/w/cpp/memory/monotonic_buffer_resource',
      source: 'cppreference',
      note: 'The standard library\'s arena allocator and how polymorphic allocators plug into containers.',
    },
    {
      title: 'VirtualAlloc function (Microsoft Learn)',
      url: 'https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualalloc',
      source: 'other',
      note: 'Reserve versus commit, allocation granularity and large pages.',
    },
  ],
};
