import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: "os-processes",
  title: "The Process",
  summary: "What a process really is: a program brought to life with its own address space, threads and kernel record, how its memory is laid out, the states it moves through, and how to inspect it on Linux and Windows.",
  minutes: 18,
  objectives: [
    "Distinguish a program (a file) from a process (a running instance with its own state)",
    "Sketch a process's address-space layout and say where code, globals, heap, mappings and stacks live",
    "List what the kernel stores in a process control block and why each part is needed",
    "Trace a process through the new, ready, running, blocked and zombie states",
    "Inspect processes with `/proc`, `ps`, Task Manager and Process Explorer",
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: "Program versus process",
      blocks: [
        {
          type: 'p',
          text: "`MyGame.exe` sitting on your SSD is a **program**: a file of machine code, initial data and metadata (ELF on Linux, PE on Windows). Double-click it twice and you get two **processes**: two running instances of the same program, each with its own memory, its own open files and its own progress through the code. A program is a recipe; a process is somebody cooking it.",
        },
        {
          type: 'definition',
          term: "Process",
          text: "A running instance of a program: a private address space (code, data, heap, stacks), one or more threads of execution with their registers, and the kernel resources it holds (open files, sockets, permissions), all described by a kernel record called the process control block. It is the OS's unit of isolation and resource ownership. See [[process]].",
        },
        {
          type: 'p',
          text: "Since C++ Fundamentals you have written multithreaded programs. The relationship is simple: a process **owns** resources, and a [[thread]] is a path of execution **inside** a process. All threads of a process share its memory and open files but each has its own registers and stack. The scheduler runs threads; memory protection is drawn around processes.",
        },
        {
          type: 'p',
          text: "On Linux every process can look at its own kernel record through the pseudo-file `/proc/self/status`. This program prints two lines of it, before and after starting a thread:",
        },
        {
          type: 'code',
          title: "proc_self.cpp",
          runnable: true,
          code: `#include <fstream>
#include <iostream>
#include <latch>
#include <string>
#include <thread>

// Print the State: and Threads: lines of /proc/self/status.
void show(const char* when) {
    std::ifstream status{"/proc/self/status"};
    std::cout << when << '\\n';
    for (std::string line; std::getline(status, line);) {
        if (line.rfind("State:", 0) == 0 ||
            line.rfind("Threads:", 0) == 0) {
            line.replace(line.find('\\t'), 1, " ");
            std::cout << "  " << line << '\\n';
        }
    }
}

int main() {
    show("at start:");
    std::latch done{1};
    std::jthread worker{[&] { done.wait(); }};   // a second thread
    show("with a worker thread:");
    done.count_down();                           // let it finish
}`,
          output: "at start:\n  State: R (running)\n  Threads: 1\nwith a worker thread:\n  State: R (running)\n  Threads: 2",
          annotations: [
            { lines: 9, text: "`/proc` is not on disk. Reading it asks the kernel to format its live data about this process as text. `self` always means \"the process doing the reading\"." },
            { lines: 14, text: "The kernel separates key and value with a tab; we swap it for a space to keep the output tidy." },
            { lines: 23, text: "The worker blocks on the latch, so it is guaranteed to exist while we read the status a second time." },
            { lines: 24, text: "Same process, same memory, now two threads. The state is R because the thread reading the file is, naturally, running." },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why the OS needs the process abstraction",
          text: "The kernel needs a unit to hang things on: whose memory is this page, who may write this file, whom do we bill for this CPU time, what do we clean up when it crashes. The process is that unit. When a process exits, however it exits, the kernel walks its record and frees everything: memory, descriptors, sockets, locks. That is why a crashed game never leaks RAM *after* it dies, even though it may have leaked plenty while running.",
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: "You launch two copies of your game for local split-screen testing. Which statement is true?",
      options: [
        { text: "They share one address space because they come from the same `.exe`", why: "Each process gets its own address space. The OS may share the read-only *physical* pages of the code between them, but neither can see the other's data." },
        { text: "They are two processes running the same program; each has its own memory, threads and open files", correct: true, why: "One program, two independent instances. A crash or a memory corruption in one cannot affect the other." },
        { text: "The second launch just adds threads to the first process", why: "Launching an executable creates a new process. Only code inside a process can create threads in it." },
        { text: "They must use different global variables because globals live in the `.exe` file", why: "The file holds only the *initial* values. Each process gets its own copy of every global when it is loaded." },
      ],
      explanation: "A program is passive: bytes in a file. Each time it is started, the OS creates a fresh process, loads the program into a new address space and starts one thread at its entry point. Sharing between processes only happens when you ask for it explicitly (pipes, sockets, shared memory, files), which is the subject of unit 8.",
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: "Inside the address space",
      blocks: [
        {
          type: 'p',
          text: "Every process sees the same *shape* of memory, laid out by the loader and the kernel when the program starts. Here is a real 64-bit Linux process, with addresses from one run:",
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 404">
<text x="340" y="12" font-size="9.5" font-weight="700" class="t-gray">one real run (Linux)</text>
<rect x="120" y="20" width="210" height="42" class="f-gray" fill-opacity="0.25" stroke="none"/>
<rect x="120" y="20" width="210" height="42" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="225.0" y="38.0" font-size="11" font-weight="700" text-anchor="middle">kernel space</text>
<text x="225.0" y="52.0" font-size="9.5" text-anchor="middle">off-limits to user-mode code</text>
<text x="340" y="60" font-size="9.5">0xffff_8000_0000_0000 ↑</text>
<line x1="120" y1="62" x2="120" y2="84" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4"/>
<line x1="330" y1="62" x2="330" y2="84" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4"/>
<text x="225.0" y="76.5" font-size="9" text-anchor="middle" font-style="italic" class="t-gray">non-canonical hole</text>
<rect x="120" y="84" width="210" height="38" class="f-green" fill-opacity="0.16" stroke="none"/>
<rect x="120" y="84" width="210" height="38" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="225.0" y="100.0" font-size="11" font-weight="700" text-anchor="middle">stack ↓</text>
<text x="225.0" y="114.0" font-size="9.5" text-anchor="middle">locals, return addresses</text>
<text x="340" y="96" font-size="9.5">0x7ffc_477f_c7dc  &amp;local</text>
<line x1="120" y1="122" x2="120" y2="148" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4"/>
<line x1="330" y1="122" x2="330" y2="148" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4"/>
<rect x="120" y="148" width="210" height="46" class="f-purple" fill-opacity="0.16" stroke="none"/>
<rect x="120" y="148" width="210" height="46" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="225.0" y="164" font-size="11" font-weight="700" text-anchor="middle">memory-mapped region ↓</text>
<text x="225.0" y="177" font-size="9.5" text-anchor="middle">libc.so, ld.so, thread stacks,</text>
<text x="225.0" y="190" font-size="9.5" text-anchor="middle">big mallocs, mapped files</text>
<text x="340" y="160" font-size="9.5">0x7fbe_7e80_0000  libc.so</text>
<line x1="120" y1="194" x2="120" y2="242" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4"/>
<line x1="330" y1="194" x2="330" y2="242" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4"/>
<text x="225.0" y="221.5" font-size="9" text-anchor="middle" font-style="italic" class="t-gray">huge unmapped gap</text>
<rect x="120" y="242" width="210" height="38" class="f-orange" fill-opacity="0.16" stroke="none"/>
<rect x="120" y="242" width="210" height="38" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="225.0" y="258.0" font-size="11" font-weight="700" text-anchor="middle">heap ↑</text>
<text x="225.0" y="272.0" font-size="9.5" text-anchor="middle">malloc / new</text>
<text x="340" y="254" font-size="9.5">0x5571_ab7e_a2a0  malloc(16)</text>
<line x1="120" y1="280" x2="120" y2="296" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4"/>
<line x1="330" y1="280" x2="330" y2="296" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4"/>
<rect x="120" y="296" width="210" height="26" class="f-blue" fill-opacity="0.16" stroke="none"/>
<rect x="120" y="296" width="210" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="225.0" y="313.0" font-size="10.5" text-anchor="middle">.data / .bss: globals, statics</text>
<text x="340" y="312" font-size="9.5">0x5571_71fe_c010  &amp;g_init</text>
<rect x="120" y="322" width="210" height="26" class="f-blue" fill-opacity="0.16" stroke="none"/>
<rect x="120" y="322" width="210" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="225.0" y="339.0" font-size="10.5" text-anchor="middle">.rodata: literals, constants</text>
<rect x="120" y="348" width="210" height="26" class="f-blue" fill-opacity="0.16" stroke="none"/>
<rect x="120" y="348" width="210" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="225.0" y="365.0" font-size="10.5" text-anchor="middle">.text: machine code</text>
<text x="340" y="364" font-size="9.5">0x5571_71fe_9209  &amp;main</text>
<line x1="120" y1="374" x2="120" y2="398" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4"/>
<line x1="330" y1="374" x2="330" y2="398" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4"/>
<text x="225.0" y="389.5" font-size="9" text-anchor="middle" font-style="italic" class="t-gray">unmapped: null page</text>
<text x="340" y="396" font-size="9.5">0x0</text>
<line x1="98" y1="394" x2="98" y2="28" stroke="currentColor" stroke-width="1.4"/>
<path d="M98,22 L94.5,30 L101.5,30 Z" fill="currentColor"/>
<text x="86" y="209.0" font-size="10" text-anchor="middle" transform="rotate(-90 86 209.0)">higher addresses</text>
</svg>`,
          alt: "A tall bar from address 0 at the bottom to kernel space at the top. From the bottom: an unmapped null page, .text machine code, .rodata constants, .data and .bss globals, the heap growing upward, a huge unmapped gap, the memory-mapped region with libc.so, ld.so, thread stacks and large allocations growing downward, a gap, the main stack growing downward, a non-canonical hole, and kernel space at the top. Real addresses from one run are listed beside each region.",
          caption: "The arrows show which way each region grows. The gaps are enormous: the user half of the space is 128 TiB, and almost none of it is mapped.",
        },
        {
          type: 'table',
          headers: ["Region", "Holds", "Comes from"],
          rows: [
            ["`.text`", "machine code", "the executable file, mapped read + execute"],
            ["`.rodata`", "string literals, `const` tables, vtables", "the file, read-only"],
            ["`.data`", "globals and statics with non-zero initial values", "the file, then private copy-on-write"],
            ["`.bss`", "globals and statics that start at zero", "*not* in the file: zero-filled pages on first touch"],
            ["heap", "small `new` / `malloc` blocks", "grown by the allocator (`brk` or `mmap`)"],
            ["mapped region", "shared libraries, thread stacks, big allocations, `mmap`ed files", "`mmap`"],
            ["stack", "main thread's frames: locals, return addresses", "set up by the kernel at `exec`, grows on demand (8 MiB limit by default on Linux)"],
          ],
        },
        {
          type: 'code',
          title: "layout_order.cpp",
          runnable: true,
          code: `#include <cstdint>
#include <iostream>
#include <memory>

int g_initialized = 42;     // .data
int g_zeroed;               // .bss
void marker() {}            // .text

int main() {
    int local = 0;                                 // stack
    auto small = std::make_unique<int>(7);         // heap
    auto big = std::make_unique<char[]>(1 << 24); // 16 MiB: mmap

    auto at = [](const void* p) {
        return reinterpret_cast<std::uintptr_t>(p);
    };
    auto code = reinterpret_cast<std::uintptr_t>(&marker);
    std::cout << std::boolalpha
        << "code < data : " << (code < at(&g_initialized)) << '\\n'
        << "data < bss  : " << (at(&g_initialized) < at(&g_zeroed))
        << '\\n'
        << "bss  < heap : " << (at(&g_zeroed) < at(small.get()))
        << '\\n'
        << "heap < mmap : " << (at(small.get()) < at(big.get()))
        << '\\n'
        << "mmap < stack: " << (at(big.get()) < at(&local)) << '\\n';
}`,
          output: "code < data : true\ndata < bss  : true\nbss  < heap : true\nheap < mmap : true\nmmap < stack: true",
          annotations: [
            { lines: '5-7', text: "One object in each static region. (We use `marker` rather than `main`, because C++ forbids taking the address of `main`.)" },
            { lines: 12, text: "glibc serves large requests (128 KiB and up by default) with their own `mmap` instead of the heap, so this block lands in the mapped region." },
            { lines: '18-26', text: "We print comparisons, not addresses: [[aslr]] moves every region on every run, but on x86-64 Linux the *order* stays the same, so this output is stable." },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why .bss exists",
          text: "A zero-initialized global array of a million `int`s needs 4 MB of memory but no information: every byte is zero. Storing those zeros in the executable would only make downloads and loads slower. So the file just records \"4 MB of `.bss` here\", and the kernel maps fresh zero-filled pages the first time each one is touched. Pages you never touch never use RAM at all.",
        },
        {
          type: 'callout',
          variant: 'note',
          title: "On Windows",
          text: "The ideas are identical but the layout differs: the executable image and DLLs are placed at randomized bases, heaps are created with `HeapCreate`/`VirtualAlloc` instead of a single `brk` heap, and each thread's stack is a separate reservation (1 MiB by default for the main thread). Sysinternals **VMMap** draws a process's address space region by region, the Windows counterpart of `/proc/<pid>/maps`.",
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'numeric',
      prompt: "A program on x86-64 Linux gains a new global `int g_grid[1'000'000];` with **no initializer**. By how many bytes does the size of the stripped executable *file* (built with `g++ -O2 -s`) grow? (We measured it with `ls -l` and `size`.)",
      answer: 0,
      unit: "bytes",
      hint: "Which section does a zero-initialized global go into, and what does that section store in the file?",
      explanation: "It grows by 0 bytes: the array goes into `.bss`, which `size` showed growing by 4,000,024 bytes while the stripped file stayed at exactly 14,336 bytes. Only the section's length is recorded. (Without `-s` the file keeps a symbol table, and the new name adds a few dozen bytes there, but still nothing for the array itself.) Writing `= {1}` instead moved it into `.data`, and the stripped file jumped to 4,014,352 bytes, because now the initial contents must be stored. Large zeroed tables are free on disk and cost RAM only for the pages you touch.",
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: "The process control block",
      blocks: [
        {
          type: 'p',
          text: "For each process the kernel keeps a record called the [[process-control-block]] (PCB). It is everything the kernel needs to stop the process, resume it later, account for it and clean up after it.",
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 326">
<text x="14" y="16" font-size="12" font-weight="700">Process control block</text>
<text x="14" y="32" font-size="9.5" class="t-gray">Linux: task_struct · Windows: EPROCESS + ETHREAD</text>
<rect x="14" y="44" width="290" height="34" class="f-blue" fill-opacity="0.13" stroke="none"/>
<rect x="14" y="44" width="290" height="34" fill="none" stroke="currentColor" stroke-width="1.1"/>
<rect x="14" y="44" width="5" height="34" class="f-blue" stroke="none"/>
<text x="28" y="58" font-size="10.5" font-weight="700">identity</text>
<text x="28" y="71" font-size="9.5">PID 4182 · parent PID 4100 · user ID</text>
<rect x="14" y="78" width="290" height="34" class="f-orange" fill-opacity="0.13" stroke="none"/>
<rect x="14" y="78" width="290" height="34" fill="none" stroke="currentColor" stroke-width="1.1"/>
<rect x="14" y="78" width="5" height="34" class="f-orange" stroke="none"/>
<text x="28" y="92" font-size="10.5" font-weight="700">state</text>
<text x="28" y="105" font-size="9.5">RUNNING · READY · BLOCKED · ZOMBIE</text>
<rect x="14" y="112" width="290" height="34" class="f-red" fill-opacity="0.13" stroke="none"/>
<rect x="14" y="112" width="290" height="34" fill="none" stroke="currentColor" stroke-width="1.1"/>
<rect x="14" y="112" width="5" height="34" class="f-red" stroke="none"/>
<text x="28" y="126" font-size="10.5" font-weight="700">CPU context</text>
<text x="28" y="139" font-size="9.5">saved registers: pc, sp, rax… flags</text>
<rect x="14" y="146" width="290" height="34" class="f-purple" fill-opacity="0.13" stroke="none"/>
<rect x="14" y="146" width="290" height="34" fill="none" stroke="currentColor" stroke-width="1.1"/>
<rect x="14" y="146" width="5" height="34" class="f-purple" stroke="none"/>
<text x="28" y="160" font-size="10.5" font-weight="700">memory</text>
<text x="28" y="173" font-size="9.5">page-table root (CR3) · region list</text>
<rect x="14" y="180" width="290" height="34" class="f-teal" fill-opacity="0.13" stroke="none"/>
<rect x="14" y="180" width="290" height="34" fill="none" stroke="currentColor" stroke-width="1.1"/>
<rect x="14" y="180" width="5" height="34" class="f-teal" stroke="none"/>
<text x="28" y="194" font-size="10.5" font-weight="700">open files</text>
<text x="28" y="207" font-size="9.5">fd table: 0, 1, 2, 3 …</text>
<rect x="14" y="214" width="290" height="34" class="f-green" fill-opacity="0.13" stroke="none"/>
<rect x="14" y="214" width="290" height="34" fill="none" stroke="currentColor" stroke-width="1.1"/>
<rect x="14" y="214" width="5" height="34" class="f-green" stroke="none"/>
<text x="28" y="228" font-size="10.5" font-weight="700">scheduling</text>
<text x="28" y="241" font-size="9.5">priority · CPU time used · queue links</text>
<rect x="14" y="248" width="290" height="34" class="f-gray" fill-opacity="0.13" stroke="none"/>
<rect x="14" y="248" width="290" height="34" fill="none" stroke="currentColor" stroke-width="1.1"/>
<rect x="14" y="248" width="5" height="34" class="f-gray" stroke="none"/>
<text x="28" y="262" font-size="10.5" font-weight="700">family, signals</text>
<text x="28" y="275" font-size="9.5">children list · pending signals · limits</text>
<rect x="360" y="89.0" width="148" height="48" rx="5" class="f-red" fill-opacity="0.14" stroke="none"/>
<rect x="360" y="89.0" width="148" height="48" rx="5" fill="none" class="s-red" stroke-width="1.4"/>
<text x="434.0" y="105.0" font-size="9.5" font-weight="700" text-anchor="middle">kernel stack</text>
<text x="434.0" y="118.0" font-size="9.5" text-anchor="middle">user registers pushed</text>
<text x="434.0" y="131.0" font-size="9.5" text-anchor="middle">at the last trap</text>
<line x1="304" y1="129.0" x2="354" y2="129.0" stroke="currentColor" stroke-width="1.3"/>
<path d="M360,129.0 L352,125.5 L352,132.5 Z" fill="currentColor"/>
<rect x="360" y="141.0" width="148" height="48" rx="5" class="f-purple" fill-opacity="0.14" stroke="none"/>
<rect x="360" y="141.0" width="148" height="48" rx="5" fill="none" class="s-purple" stroke-width="1.4"/>
<text x="434.0" y="157.0" font-size="9.5" font-weight="700" text-anchor="middle">page tables</text>
<text x="434.0" y="170.0" font-size="9.5" text-anchor="middle">virtual → physical</text>
<text x="434.0" y="183.0" font-size="9.5" text-anchor="middle">for this process only</text>
<line x1="304" y1="163.0" x2="354" y2="163.0" stroke="currentColor" stroke-width="1.3"/>
<path d="M360,163.0 L352,159.5 L352,166.5 Z" fill="currentColor"/>
<rect x="360" y="245.0" width="148" height="62" rx="5" class="f-teal" fill-opacity="0.14" stroke="none"/>
<rect x="360" y="245.0" width="148" height="62" rx="5" fill="none" class="s-teal" stroke-width="1.4"/>
<text x="434.0" y="261.0" font-size="9.5" font-weight="700" text-anchor="middle">open-file objects</text>
<text x="434.0" y="274.0" font-size="9.5" text-anchor="middle">3 → save.dat, offset 120</text>
<text x="434.0" y="287.0" font-size="9.5" text-anchor="middle">1 → terminal</text>
<text x="434.0" y="300.0" font-size="9.5" text-anchor="middle">(shared after fork)</text>
<polyline points="304,197.0 334,197.0 334,267.0 354,267.0" fill="none" stroke="currentColor" stroke-width="1.3"/>
<path d="M360,267.0 L352,263.5 L352,270.5 Z" fill="currentColor"/>
<text x="14" y="302" font-size="9.5" font-style="italic" class="t-gray">One PCB per process; the kernel keeps them all in lists and trees.</text>
</svg>`,
          alt: "A process control block drawn as a stack of rows: identity (PID, parent PID, user ID), state, CPU context (saved registers), memory (page-table root and region list), open files (descriptor table), scheduling (priority, CPU time, queue links), and family and signals. Arrows lead from the CPU context row to the kernel stack holding saved user registers, from memory to the page tables, and from open files to the open-file objects.",
          caption: "The PCB is mostly pointers to other kernel structures. Some of them, such as the open-file objects, can be shared between processes.",
        },
        {
          type: 'list',
          items: [
            "**Identity**: the process ID (PID), the parent's PID, the user and group it runs as (used for every permission check).",
            "**State**: running, ready, blocked, zombie… (next card), plus the exit status once it has finished.",
            "**CPU context**: the saved registers that let a stopped process continue exactly where it was. On x86-64 Linux they sit on the thread's [[kernel-stack]], with a pointer kept in the task record.",
            "**Memory**: the root of its page tables (the value loaded into the CPU's `cr3` register when it runs) and the list of mapped regions you saw in the figure above.",
            "**Open files**: the descriptor table from the last unit, pointing at shared open-file objects.",
            "**Scheduling and accounting**: priority, CPU time used, links into the scheduler's queues.",
          ],
        },
        {
          type: 'table',
          headers: ["Aspect", "Linux", "Windows"],
          rows: [
            ["Per-thread record", "`task_struct` (in `include/linux/sched.h`)", "`ETHREAD` (contains `KTHREAD`)"],
            ["Per-process record", "no separate struct: threads of one process share `mm`, `files`, … and a thread-group ID", "`EPROCESS` (contains `KPROCESS`)"],
            ["What `getpid()` returns", "the thread-group ID: the same for all threads", "`GetCurrentProcessId()`: the process's ID"],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why Linux has no separate process struct",
          text: "Linux treats a process and a thread as the same kind of object, a *task*, that can share more or less with its parent. `fork` creates a task that shares nothing (copies everything); creating a thread uses the same `clone` call with flags such as `CLONE_VM` and `CLONE_FILES` meaning \"share my memory and my descriptor table\". You saw those flags in the `strace` of `std::jthread` in the first lesson. Windows instead keeps two kinds of object: the process owns resources and threads run inside it.",
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: "On Linux, a game process with a main thread, a render thread and six job-system workers has eight `task_struct` records in the kernel.",
      answer: true,
      explanation: "Each thread is a task with its own `task_struct`: its own registers, kernel stack, state and scheduling data. The eight tasks point to the *same* memory descriptor and file table and share one thread-group ID, which is what `getpid()` reports and what `ps` shows as the PID. Tools such as `top -H` or `ps -L` list the individual tasks.",
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: "Process states",
      blocks: [
        {
          type: 'p',
          text: "At any instant a single core runs one thread. Everything else is waiting, either for a turn on a CPU or for some event. The OS tracks this with a small set of [[process-state|states]]:",
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 280">
<rect x="14" y="20" width="92" height="44" rx="18" class="f-gray" fill-opacity="0.16" stroke="none"/>
<rect x="14" y="20" width="92" height="44" rx="18" fill="none" class="s-gray" stroke-width="1.8"/>
<text x="60.0" y="41.0" font-size="12.5" font-weight="700" text-anchor="middle">New</text>
<text x="60.0" y="54.0" font-size="9" text-anchor="middle" class="t-gray">being created</text>
<rect x="80" y="118" width="112" height="48" rx="18" class="f-blue" fill-opacity="0.16" stroke="none"/>
<rect x="80" y="118" width="112" height="48" rx="18" fill="none" class="s-blue" stroke-width="1.8"/>
<text x="136.0" y="141.0" font-size="12.5" font-weight="700" text-anchor="middle">Ready</text>
<text x="136.0" y="154.0" font-size="9" text-anchor="middle" class="t-gray">Linux: R</text>
<rect x="328" y="118" width="112" height="48" rx="18" class="f-orange" fill-opacity="0.16" stroke="none"/>
<rect x="328" y="118" width="112" height="48" rx="18" fill="none" class="s-orange" stroke-width="1.8"/>
<text x="384.0" y="141.0" font-size="12.5" font-weight="700" text-anchor="middle">Running</text>
<text x="384.0" y="154.0" font-size="9" text-anchor="middle" class="t-gray">Linux: R, on a CPU</text>
<rect x="204" y="214" width="112" height="48" rx="18" class="f-purple" fill-opacity="0.16" stroke="none"/>
<rect x="204" y="214" width="112" height="48" rx="18" fill="none" class="s-purple" stroke-width="1.8"/>
<text x="260.0" y="237.0" font-size="12.5" font-weight="700" text-anchor="middle">Blocked</text>
<text x="260.0" y="250.0" font-size="9" text-anchor="middle" class="t-gray">Linux: S or D</text>
<rect x="414" y="20" width="96" height="44" rx="18" class="f-red" fill-opacity="0.16" stroke="none"/>
<rect x="414" y="20" width="96" height="44" rx="18" fill="none" class="s-red" stroke-width="1.8"/>
<text x="462.0" y="41.0" font-size="12.5" font-weight="700" text-anchor="middle">Zombie</text>
<text x="462.0" y="54.0" font-size="9" text-anchor="middle" class="t-gray">Linux: Z</text>
<polyline points="60,64 60,90 118,90 118.0,111.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M118,118 L122.0,109.0 L114.0,109.0 Z" fill="currentColor"/>
<text x="64" y="84" font-size="10" text-anchor="start" font-style="italic">admitted</text>
<polyline points="192,132 321.0,132.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M328,132 L319.0,128.0 L319.0,136.0 Z" fill="currentColor"/>
<text x="260" y="125" font-size="10" text-anchor="middle" font-style="italic">dispatched by scheduler</text>
<polyline points="328,154 199.0,154.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M192,154 L201.0,158.0 L201.0,150.0 Z" fill="currentColor"/>
<text x="260" y="170" font-size="10" text-anchor="middle" font-style="italic">preempted: timer interrupt</text>
<polyline points="400,166 400,238 323.0,238.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M316,238 L325.0,242.0 L325.0,234.0 Z" fill="currentColor"/>
<text x="406" y="200" font-size="10" text-anchor="start" font-style="italic">waits: read(), lock,</text>
<text x="406" y="213" font-size="10" font-style="italic">sleep, waitpid()</text>
<polyline points="204,238 136,238 136.0,173.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M136,166 L132.0,175.0 L140.0,175.0 Z" fill="currentColor"/>
<text x="144" y="200" font-size="10" text-anchor="start" font-style="italic">I/O done / woken</text>
<polyline points="440,128 462,128 462.0,71.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M462,64 L458.0,73.0 L466.0,73.0 Z" fill="currentColor"/>
<text x="468" y="100" font-size="10" text-anchor="start" font-style="italic">exit()</text>
<text x="406" y="38" font-size="9" text-anchor="end" class="t-gray">stays until the</text><text x="406" y="50" font-size="9" text-anchor="end" class="t-gray">parent calls wait()</text>
</svg>`,
          alt: "State diagram. New goes to Ready when admitted. Ready goes to Running when dispatched by the scheduler. Running goes back to Ready when preempted by a timer interrupt, to Blocked when it waits for I/O, a lock, sleep or waitpid, and to Zombie on exit. Blocked goes to Ready when the I/O completes or it is woken. A zombie stays until the parent calls wait.",
          caption: "The three core states are ready, running and blocked. Note the one-way arrow out of Blocked: a woken process becomes *ready*, not running.",
        },
        {
          type: 'list',
          items: [
            "**Ready**: could run right now, waiting in a queue for a CPU.",
            "**Running**: executing on a CPU.",
            "**Blocked** (waiting, sleeping): cannot run until something happens: data from disk or network, a lock being released, a timer expiring, a child exiting.",
            "**New** and **Zombie**: the edges of life. A zombie has finished, has released its memory, but keeps its PCB so the parent can read its exit status.",
          ],
        },
        {
  "type": "algo",
  "view": "graph",
  "width": 470,
  "height": 270,
  "nodes": [
    {
      "id": "new",
      "x": 50,
      "y": 40,
      "label": "New"
    },
    {
      "id": "ready",
      "x": 130,
      "y": 140,
      "label": "Rdy"
    },
    {
      "id": "running",
      "x": 330,
      "y": 140,
      "label": "Run"
    },
    {
      "id": "blocked",
      "x": 230,
      "y": 225,
      "label": "Blk"
    },
    {
      "id": "zombie",
      "x": 420,
      "y": 40,
      "label": "Zmb"
    }
  ],
  "edges": [
    {
      "from": "new",
      "to": "ready",
      "label": "admit",
      "directed": true
    },
    {
      "from": "ready",
      "to": "running",
      "label": "dispatch",
      "directed": true
    },
    {
      "from": "running",
      "to": "ready",
      "label": "preempt",
      "directed": true
    },
    {
      "from": "running",
      "to": "blocked",
      "label": "wait",
      "directed": true
    },
    {
      "from": "blocked",
      "to": "ready",
      "label": "wake",
      "directed": true
    },
    {
      "from": "running",
      "to": "zombie",
      "label": "exit",
      "directed": true
    }
  ],
  "interval": 1700,
  "frames": [
    {
      "note": "Two processes are being created: `A` (the game) and `B` (an asset loader). Neither may run yet.",
      "nodeNotes": [
        {
          "id": "new",
          "text": "A, B"
        }
      ],
      "nodeColors": [
        {
          "id": "new",
          "color": "blue"
        }
      ],
      "edgeColors": [],
      "vars": [
        [
          "time",
          "0 ms"
        ],
        [
          "CPU",
          "idle"
        ],
        [
          "ready queue",
          "empty"
        ]
      ]
    },
    {
      "note": "The kernel finishes setting them up and admits both to the **ready** queue.",
      "nodeNotes": [
        {
          "id": "ready",
          "text": "A, B"
        }
      ],
      "nodeColors": [
        {
          "id": "ready",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "new",
          "to": "ready",
          "color": "orange"
        },
        {
          "from": "new",
          "to": "ready",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "time",
          "1 ms"
        ],
        [
          "CPU",
          "idle"
        ],
        [
          "ready queue",
          "A, B"
        ]
      ]
    },
    {
      "note": "The scheduler dispatches `A`: it is now **running** on the one CPU.",
      "nodeNotes": [
        {
          "id": "running",
          "text": "A"
        },
        {
          "id": "ready",
          "text": "B"
        }
      ],
      "nodeColors": [
        {
          "id": "running",
          "color": "orange"
        },
        {
          "id": "ready",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "ready",
          "to": "running",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "time",
          "1 ms"
        ],
        [
          "CPU",
          "A"
        ],
        [
          "ready queue",
          "B"
        ]
      ]
    },
    {
      "note": "A timer interrupt fires: `A` has used its slice, so the kernel **preempts** it and dispatches `B`.",
      "nodeNotes": [
        {
          "id": "ready",
          "text": "A"
        },
        {
          "id": "running",
          "text": "B"
        }
      ],
      "nodeColors": [
        {
          "id": "ready",
          "color": "blue"
        },
        {
          "id": "running",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "running",
          "to": "ready",
          "color": "orange"
        },
        {
          "from": "ready",
          "to": "running",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "time",
          "5 ms"
        ],
        [
          "CPU",
          "B"
        ],
        [
          "ready queue",
          "A"
        ]
      ]
    },
    {
      "note": "`B` calls `read()` on a file that is not in memory. It **blocks** until the disk answers, and `A` gets the CPU back.",
      "nodeNotes": [
        {
          "id": "running",
          "text": "A"
        },
        {
          "id": "blocked",
          "text": "B"
        }
      ],
      "nodeColors": [
        {
          "id": "running",
          "color": "orange"
        },
        {
          "id": "blocked",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "running",
          "to": "blocked",
          "color": "orange"
        },
        {
          "from": "ready",
          "to": "running",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "time",
          "6 ms"
        ],
        [
          "CPU",
          "A"
        ],
        [
          "ready queue",
          "empty"
        ]
      ]
    },
    {
      "note": "`A` spawns a helper, `C`. It starts in the **new** state.",
      "nodeNotes": [
        {
          "id": "running",
          "text": "A"
        },
        {
          "id": "blocked",
          "text": "B"
        },
        {
          "id": "new",
          "text": "C"
        }
      ],
      "nodeColors": [
        {
          "id": "running",
          "color": "orange"
        },
        {
          "id": "blocked",
          "color": "blue"
        },
        {
          "id": "new",
          "color": "blue"
        }
      ],
      "edgeColors": [],
      "vars": [
        [
          "time",
          "7 ms"
        ],
        [
          "CPU",
          "A"
        ],
        [
          "ready queue",
          "empty"
        ]
      ]
    },
    {
      "note": "`C` is admitted to the ready queue. `A` keeps running; `B` is still blocked.",
      "nodeNotes": [
        {
          "id": "running",
          "text": "A"
        },
        {
          "id": "blocked",
          "text": "B"
        },
        {
          "id": "ready",
          "text": "C"
        }
      ],
      "nodeColors": [
        {
          "id": "running",
          "color": "orange"
        },
        {
          "id": "blocked",
          "color": "blue"
        },
        {
          "id": "ready",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "new",
          "to": "ready",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "time",
          "7 ms"
        ],
        [
          "CPU",
          "A"
        ],
        [
          "ready queue",
          "C"
        ]
      ]
    },
    {
      "note": "The disk interrupt arrives: `B`'s data is ready, so the kernel **wakes** it. Woken does not mean running: `B` goes to the ready queue.",
      "nodeNotes": [
        {
          "id": "running",
          "text": "A"
        },
        {
          "id": "ready",
          "text": "B, C"
        }
      ],
      "nodeColors": [
        {
          "id": "running",
          "color": "orange"
        },
        {
          "id": "ready",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "blocked",
          "to": "ready",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "time",
          "9 ms"
        ],
        [
          "CPU",
          "A"
        ],
        [
          "ready queue",
          "B, C"
        ]
      ]
    },
    {
      "note": "Timer interrupt again: `A` is preempted and `C`, first in the queue, is dispatched.",
      "nodeNotes": [
        {
          "id": "ready",
          "text": "A, B"
        },
        {
          "id": "running",
          "text": "C"
        }
      ],
      "nodeColors": [
        {
          "id": "ready",
          "color": "blue"
        },
        {
          "id": "running",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "running",
          "to": "ready",
          "color": "orange"
        },
        {
          "from": "ready",
          "to": "running",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "time",
          "10 ms"
        ],
        [
          "CPU",
          "C"
        ],
        [
          "ready queue",
          "A, B"
        ]
      ]
    },
    {
      "note": "`C` calls `exit()`. It becomes a **zombie**: its memory is freed, but its PID and exit status wait for the parent. `B` is dispatched.",
      "nodeNotes": [
        {
          "id": "ready",
          "text": "A"
        },
        {
          "id": "running",
          "text": "B"
        },
        {
          "id": "zombie",
          "text": "C"
        }
      ],
      "nodeColors": [
        {
          "id": "ready",
          "color": "blue"
        },
        {
          "id": "running",
          "color": "orange"
        },
        {
          "id": "zombie",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "running",
          "to": "zombie",
          "color": "orange"
        },
        {
          "from": "ready",
          "to": "running",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "time",
          "11 ms"
        ],
        [
          "CPU",
          "B"
        ],
        [
          "ready queue",
          "A"
        ]
      ]
    },
    {
      "note": "Timer: `B` is preempted and `A` runs again. `A` calls `waitpid()` on `C`, collects its exit status, and the zombie disappears for good.",
      "nodeNotes": [
        {
          "id": "running",
          "text": "A"
        },
        {
          "id": "ready",
          "text": "B"
        }
      ],
      "nodeColors": [
        {
          "id": "running",
          "color": "orange"
        },
        {
          "id": "ready",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "running",
          "to": "ready",
          "color": "orange"
        },
        {
          "from": "ready",
          "to": "running",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "time",
          "15 ms"
        ],
        [
          "CPU",
          "A"
        ],
        [
          "ready queue",
          "B"
        ]
      ]
    }
  ],
  "caption": "A one-CPU simulation with three processes. The names under each state are the processes in it; only legal transitions are allowed."
},
        {
          type: 'callout',
          variant: 'why',
          title: "Why blocking is the most important state",
          text: "A blocked process uses **no CPU at all**. Instead of spinning in a loop asking \"is the data here yet?\", it sleeps on a wait queue, and the interrupt that signals completion moves it back to ready. This is what lets one machine run hundreds of processes: most of them are blocked most of the time, waiting for input, network packets or timers. Burning CPU while waiting (busy-waiting) is only worth it for waits shorter than the cost of blocking and waking, a trade-off you will meet again with spinlocks.",
        },
        {
          type: 'callout',
          variant: 'perf',
          title: "Woken is not running",
          text: "When the disk finishes your asset read, your loading thread becomes *ready*, but it only runs when the scheduler gives it a CPU. On a busy machine that wait can be longer than the I/O itself. This is one reason engines keep the number of busy threads at or below the number of cores.",
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'order',
      prompt: "A small tool process starts, reads one file from disk, and exits. Put its life in order.",
      linesAreCode: false,
      lines: [
        "Admitted: created and placed in the ready queue",
        "Dispatched: runs on a CPU and calls `read()`",
        "Blocked: sleeps until the disk delivers the data",
        "Woken: returns to the ready queue when the disk interrupt arrives",
        "Dispatched again: processes the data and calls `exit()`",
        "Zombie: waits for its parent to collect the exit status",
      ],
      distractors: ["Woken: jumps straight back onto the CPU it left"],
      explanation: "The path new → ready → running → blocked → ready → running → zombie is the most common life of any process that does I/O. The distractor is the classic misconception: an I/O completion never puts a process directly on a CPU. It makes the process ready, and the scheduler decides when it runs.",
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: "Seeing processes: /proc, ps and Task Manager",
      blocks: [
        {
          type: 'p',
          text: "Linux exposes every process as a directory `/proc/<pid>/`: `status` (state, memory, thread count), `maps` (the address-space regions), `fd/` (one entry per open descriptor), `cmdline`, and more. Tools such as `ps` and `top` simply read these files. Here is a real `ps` listing of a test program that has three children: one that has exited but was never waited for, one sleeping, and one stuck in an infinite loop:",
        },
        {
          type: 'code',
          lang: 'shell',
          title: "ps -o pid,ppid,stat,cmd (real output)",
          code: `  PID  PPID STAT CMD
 1715  1714 S    ./zdemo
 1717  1715 Z    [zdemo] <defunct>
 1718  1715 S    ./zdemo
 1719  1715 R    ./zdemo`,
          annotations: [
            { lines: 2, text: "The parent sleeps in `sleep(2)`: state **S**, interruptible sleep (blocked)." },
            { lines: 3, text: "**Z**: a zombie. It has exited; `<defunct>` means only its PCB is left." },
            { lines: 4, text: "This child called `pause()`, which blocks until a signal arrives." },
            { lines: 5, text: "**R**: running or ready. Linux does not distinguish the two in `ps`; both are \"runnable\"." },
          ],
        },
        {
          type: 'table',
          headers: ["ps code", "Meaning", "State in our diagram"],
          rows: [
            ["`R`", "running or runnable", "Running or Ready"],
            ["`S`", "interruptible sleep: waiting for an event, wakes on signals", "Blocked"],
            ["`D`", "uninterruptible sleep, usually inside disk I/O; even `kill -9` waits", "Blocked"],
            ["`T`", "stopped by a signal or a debugger", "(suspended)"],
            ["`Z`", "zombie: exited, not yet reaped", "Zombie"],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: "On Windows",
          text: "Task Manager's **Details** tab lists processes with PID, status and memory; add the *Threads* and *Handles* columns to see how many of each a process owns. Sysinternals **Process Explorer** goes further: the process tree, every thread with its state (Running, Ready, Wait) and stack, and every open handle. On Windows, states belong to threads; a process is just the container. Process Explorer is the first tool to open when a game \"hangs\" on Windows: if its main thread is in a Wait state, look at what it is waiting for.",
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: "During a level load, `ps` shows your game's loader thread in state `D` for several seconds and `kill -9` does not end the process immediately. What is the most likely explanation?",
      options: [
        { text: "The thread is in an infinite loop", why: "A CPU-bound loop shows up as `R`, and `kill -9` ends it at once." },
        { text: "The thread is blocked in uninterruptible I/O, such as reading from a slow or failing disk", correct: true, why: "`D` means the thread sleeps inside the kernel in a section that cannot be interrupted, typically waiting for a block device. Signals, even SIGKILL, are delivered only when it leaves that section." },
        { text: "The process is a zombie and is waiting for its parent", why: "Zombies show as `Z`, and they have no running threads at all." },
        { text: "The scheduler has given the thread the lowest priority", why: "Low priority affects how often a *runnable* thread runs; it would show as `R` or `S`, not `D`." },
      ],
      explanation: "`D` is the state to worry about on Linux: the thread is blocked deep in the kernel, usually on storage, and cannot be woken early. Long `D` stretches point at slow, overloaded or failing I/O devices (or network file systems). It is also a reminder that blocking I/O on a thread you care about, like the game thread, can stall it for an unbounded time.",
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: "One game, several processes",
      blocks: [
        {
          type: 'p',
          text: "A shipped game is usually one main process with many threads. But around it you will find others, each split off for a reason the process abstraction provides:",
        },
        {
          type: 'table',
          headers: ["Process", "Why it is separate"],
          rows: [
            ["Launcher / store client", "Updates and patches the game, which it cannot do while the game's files are in use"],
            ["Crash reporter", "Must survive the game's crash to collect a dump and upload it. Unreal's `CrashReportClient` is a separate executable for this reason"],
            ["Shader compile workers", "The editor farms compilation out to `ShaderCompileWorker` processes: parallel, and a compiler crash cannot take the editor down"],
            ["Anti-cheat service", "Runs with different privileges (often with a kernel driver) and must not be tamperable from the game's address space"],
            ["Browser-based UI (CEF)", "Chromium puts renderers in separate sandboxed processes so a compromised web page cannot read the game's memory"],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Processes are the unit of failure and of trust",
          text: "Threads share everything, so a wild pointer in any thread can corrupt every other thread's data. A separate process can only be reached through channels the OS controls. The price is memory (each process has its own heap, libraries' writable data and page tables), slower communication (IPC instead of shared variables), and start-up time. Engines pay it exactly where isolation is worth more than speed.",
        },
      ],
    },
  ],
  takeaways: [
    "A program is a file; a process is a running instance with a private address space, one or more threads and kernel resources, described by a process control block.",
    "The address space holds `.text`, `.rodata`, `.data`, `.bss`, the heap, a large mapped region (libraries, thread stacks, big allocations, mapped files) and the stack; zero-initialized `.bss` costs nothing in the file.",
    "The PCB stores identity, state, saved CPU context, memory (page-table root, regions), open files and scheduling data; Linux uses one `task_struct` per thread, Windows `EPROCESS` plus `ETHREAD`.",
    "Processes move between ready, running and blocked; a woken process becomes ready, not running, and a finished one is a zombie until its parent collects its status.",
    "`/proc/<pid>/`, `ps` (R, S, D, T, Z) and Task Manager or Process Explorer let you see all of this on a live system.",
  ],
  reading: [
    {
      title: "OSTEP chapter 4: The Abstraction: The Process",
      url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-intro.pdf",
      source: 'book',
      note: "Process creation, states and the xv6 process structure; short and clear.",
    },
    {
      title: "proc(5) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man5/proc.5.html",
      source: 'other',
      note: "Every file under /proc/<pid>/, including status, maps and fd.",
    },
    {
      title: "ps(1) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man1/ps.1.html",
      source: 'other',
      note: "See \"PROCESS STATE CODES\" for the meaning of R, S, D, T and Z.",
    },
    {
      title: "Processes and Threads (Microsoft Learn)",
      url: "https://learn.microsoft.com/en-us/windows/win32/procthread/processes-and-threads",
      source: 'other',
      note: "How Windows divides resources between processes and execution between threads.",
    },
    {
      title: "Process control block",
      url: "https://en.wikipedia.org/wiki/Process_control_block",
      source: 'article',
      note: "A compact overview of what operating systems keep per process.",
    },
  ],
};
