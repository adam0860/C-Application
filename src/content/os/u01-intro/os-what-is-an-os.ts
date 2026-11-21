import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: "os-what-is-an-os",
  title: "What Is an Operating System?",
  summary: "The OS as illusionist and referee: virtualizing the CPU and memory, managing concurrency and persistence, and the kernel designs that do it.",
  minutes: 18,
  objectives: [
    "Describe the two jobs of an operating system: creating convenient illusions (abstraction) and sharing hardware safely (resource management)",
    "Explain what it means to virtualize the CPU and memory, and show it with a C++ program",
    "Name the three big themes of the course (virtualization, concurrency, persistence) and what each gives your C++ code",
    "Distinguish kernel space from user space and say why only the kernel runs privileged",
    "Compare monolithic, microkernel and hybrid kernels, and place Linux, Windows NT and macOS XNU among them",
    "Trace how batch systems, time sharing and protection grew out of real problems",
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: "Everything your game asks for",
      blocks: [
        {
          type: 'p',
          text: "Think about what a game does in its first second. It allocates hundreds of megabytes, opens pak files, starts a render thread, a loading thread and an audio thread, talks to the GPU, reads the controller and opens a network socket. Your C++ never touches a disk controller or a network card. Something else does that work on your behalf: the **operating system**.",
        },
        {
          type: 'definition',
          term: "Operating system",
          text: "The software that sits between programs and hardware. It turns raw, awkward, shared hardware into convenient private abstractions (processes, address spaces, files, sockets), and it decides who gets which resource, when, and what they are allowed to touch. Its core, the part that runs with full hardware privilege, is the [[os-kernel|kernel]].",
        },
        {
          type: 'p',
          text: "Here is an ordinary C++ program. Every interesting line quietly asks the OS for something.",
        },
        {
          type: 'code',
          title: "services.cpp",
          runnable: true,
          code: `#include <fstream>
#include <iostream>
#include <thread>
#include <vector>

int main() {
    std::vector<int> scores(1'000'000);          // 4 MB of memory
    std::ofstream save{"/tmp/forge_slot1.sav"};  // a file
    save << "level 3\\n";
    save.close();
    std::jthread loader{[] { /* stream assets */ }};  // a thread
    loader.join();
    std::cout << "saved, loader finished\\n";     // the terminal
}`,
          output: "saved, loader finished",
          annotations: [
            { lines: 7, text: "The allocator inside the C++ runtime asks the kernel for more address space (on Linux with `brk` or `mmap`). The kernel decides which physical RAM backs it, and only when you first touch each page." },
            { lines: 8, text: "Opening a file needs the kernel: it walks the directory tree, checks your permissions and hands back a small integer that names the open file." },
            { lines: 9, text: "The bytes go into a buffer inside `std::ofstream` first. Only `close()` (or a full buffer) sends them to the kernel in one call." },
            { lines: 11, text: "A thread is a kernel object. The library reserves an 8 MiB stack for it and asks the kernel to create a new schedulable thread that shares this process's memory." },
            { lines: 13, text: "Even printing is a request: the program cannot drive a terminal or a pipe itself, so it asks the kernel to write 23 bytes to its standard output." },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why not let programs drive the hardware themselves?",
          text: "Two reasons. **Convenience:** without an OS every game would ship its own driver for every SSD, GPU and network card, and its own code to lay out files on disk. **Safety:** a program with direct hardware access can read another program's memory, wipe the disk or hog the CPU forever. The OS solves both: it writes the hard code once, and it is the only code allowed to run it.",
        },
        {
          type: 'deepdive',
          title: "Watching the requests with strace",
          blocks: [
            {
              type: 'p',
              text: "On Linux, `strace` prints every request a program makes to the kernel. This is a trimmed excerpt of the real trace of `services.cpp` (we cut the start-up lines and shortened some arguments with `…`):",
            },
            {
              type: 'code',
              lang: 'text',
              title: "strace -f ./services (excerpt)",
              code: `brk(0x55d56050c000)                     = 0x55d56050c000
openat(AT_FDCWD, "/tmp/forge_slot1.sav", O_WRONLY|O_CREAT|O_TRUNC, 0666) = 3
write(3, "level 3\\n", 8)                 = 8
close(3)                                = 0
mmap(NULL, 8392704, PROT_NONE, MAP_PRIVATE|MAP_ANONYMOUS|MAP_STACK, -1, 0) = 0x7f357dbff000
clone3({flags=CLONE_VM|CLONE_FS|CLONE_FILES|CLONE_SIGHAND|CLONE_THREAD|…}, 88) = 13301
futex(0x7f357e3ff990, FUTEX_WAIT_BITSET|FUTEX_CLOCK_REALTIME, 13301, …) = 0
write(1, "saved, loader finished\\n", 23)  = 23
exit_group(0)                           = ?`,
              annotations: [
                { lines: 1, text: "`brk` grows the heap: this is the vector's 4 MB." },
                { lines: '2-4', text: "Open, write, close: the file appears as descriptor 3, because 0, 1 and 2 are already taken by standard input, output and error." },
                { lines: '5-6', text: "Reserve the new thread's stack, then `clone3` creates the thread. Flags such as `CLONE_VM` say \"share my memory\"." },
                { lines: 7, text: "`join()` sleeps in the kernel (a futex wait) until the thread exits." },
              ],
            },
            {
              type: 'p',
              text: "You will learn to read traces like this one in [[system-call|system calls]] and the next two lessons.",
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: "In `services.cpp`, which line runs **without** asking the kernel for anything at the moment it executes?",
      options: [
        { text: "`save << \"level 3\\n\";`", correct: true, why: "Right. The stream only copies 8 bytes into its own buffer in your process's memory. The kernel sees them later, when `close()` flushes the buffer with one `write`." },
        { text: "`std::ofstream save{\"/tmp/forge_slot1.sav\"};`", why: "Opening a file always needs the kernel: only it can look up the path, check permissions and create the file." },
        { text: "`std::jthread loader{...};`", why: "Threads are created and scheduled by the kernel (`clone3` on Linux, `CreateThread` underneath on Windows)." },
        { text: "`std::cout << \"saved, loader finished\\n\";`", why: "The text may wait in a buffer for a moment, but sooner or later a `write` request must deliver it. A program cannot drive a terminal or a pipe by itself." },
      ],
      explanation: "Libraries add a layer between your code and the OS, and the layer often batches work. Formatting and buffering happen in user space at full speed; only the final transfer crosses into the kernel. Keeping that distinction in mind explains a lot of performance behaviour you will measure later in this unit.",
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: "The illusionist: virtualizing the CPU",
      blocks: [
        {
          type: 'p',
          text: "A gaming PC has perhaps 8 to 16 cores, yet Task Manager shows hundreds of processes and thousands of threads. Each one is written as if it owned a CPU: a loop that runs top to bottom, never asking permission. The OS keeps that promise by **time sharing**: it runs one program on a core for a few milliseconds, stops it, saves its registers, and runs another. Switch fast enough and every program appears to run continuously. This is what [OSTEP](https://pages.cs.wisc.edu/~remzi/OSTEP/) calls **virtualizing the CPU**.",
        },
        {
          type: 'p',
          text: "The OS designers split the job in two, and you will see this split throughout the course:",
        },
        {
          type: 'list',
          items: [
            "**Mechanism**: *how* to switch from one program to another safely. That is the context switch, built on hardware help such as the timer interrupt. Unit 2 covers it.",
            "**Policy**: *which* program should run next and for how long. That is the scheduler. Unit 3 covers it.",
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why separate mechanism from policy?",
          text: "Mechanisms are hard to write and rarely change; policies depend on the workload and change often. Linux swapped its default scheduling policy (CFS for EEVDF, in kernel 6.6) without touching how a context switch works. Keeping them apart lets the OS tune decisions without risking the machinery underneath.",
        },
        {
          type: 'callout',
          variant: 'perf',
          title: "Your frame is somebody else's time slice",
          text: "At 60 fps you have 16.7 ms per frame. If the OS decides that another program should run on the core your render thread was using, your thread waits, and a frame can miss its deadline. Much of the scheduling and threading material later in this course is really about stutter.",
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'numeric',
      prompt: "Your game, a voice-chat app, a browser and two background updaters are all CPU-bound and share **one** core. The OS gives each a 4 ms time slice in turn (round robin). When the game's slice ends, how many milliseconds pass before the game runs again?",
      answer: 16,
      unit: "ms",
      hint: "Count the slices that must run before the game's turn comes back.",
      explanation: "The four other programs each get a 4 ms slice first: 4 × 4 = 16 ms. That is almost a whole 60 fps frame. Real schedulers are smarter (they favour interactive programs and you rarely have one core), but the arithmetic shows why a busy machine makes games stutter, and why engines care about which cores their threads run on.",
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: "The illusionist: virtualizing memory",
      blocks: [
        {
          type: 'p',
          text: "The second illusion is memory. Every process sees its own private [[address-space]]: a huge range of [[virtual-address|virtual addresses]] that starts near zero and belongs to it alone. With the [[mmu]] the OS translates each virtual address to wherever the data really sits in physical RAM, so two processes can use the *same* address for *different* data.",
        },
        {
          type: 'p',
          text: "The program below proves it. `fork()`, which you will study properly in the next unit, makes a copy of the running process. The copy changes a global variable and reports the variable's address back through a pipe.",
        },
        {
          type: 'code',
          title: "private_memory.cpp",
          runnable: true,
          code: `#include <cstdint>
#include <iostream>
#include <sys/wait.h>
#include <unistd.h>

int g_gold = 100;   // one global variable

int main() {
    int fds[2];
    if (pipe(fds) == -1) return 1;

    pid_t pid = fork();   // clone this whole process
    if (pid == -1) return 1;
    if (pid == 0) {       // the copy (child)
        g_gold = 999;     // change *our* g_gold
        auto addr = reinterpret_cast<std::uintptr_t>(&g_gold);
        if (write(fds[1], &addr, sizeof addr) != sizeof addr)
            _exit(1);
        std::cout << "child:  g_gold = " << g_gold << std::endl;
        _exit(0);
    }
    std::uintptr_t childAddr = 0;
    if (read(fds[0], &childAddr, sizeof childAddr) !=
        sizeof childAddr)
        return 1;
    waitpid(pid, nullptr, 0);   // let the child finish first
    auto mine = reinterpret_cast<std::uintptr_t>(&g_gold);
    std::cout << "parent: g_gold = " << g_gold << '\\n';
    std::cout << "same virtual address in both? "
              << (mine == childAddr ? "yes" : "no") << '\\n';
}`,
          output: "child:  g_gold = 999\nparent: g_gold = 100\nsame virtual address in both? yes",
          annotations: [
            { lines: 6, text: "A global lives at a fixed virtual address chosen when the program was loaded." },
            { lines: 12, text: "After `fork()` there are two processes running this same code. In the child `fork` returns 0; in the parent it returns the child's process ID." },
            { lines: '15-18', text: "The child writes 999 into `g_gold` and sends the numeric value of `&g_gold` through the pipe, a one-way byte channel the kernel provides." },
            { lines: 19, text: "`std::endl` flushes. `_exit` ends the process immediately without flushing C++ stream buffers, so without the flush this line could vanish." },
            { lines: '26-30', text: "The parent still sees 100 at the **same** address. Same virtual address, different physical memory: each process has its own page tables." },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why give every process a private address space?",
          text: "**Isolation:** a bug or an exploit in one program cannot scribble over another, or over the kernel. **Simplicity:** the compiler and linker can place code and data at convenient addresses without knowing what else is running. **Flexibility:** the OS can move data around in RAM, share read-only pages such as `libc.so` between processes, or keep rarely used pages on disk, all invisibly. You will build this machinery in unit 4.",
        },
        {
          type: 'callout',
          variant: 'note',
          title: "Two meanings of \"virtualization\"",
          text: "Here virtualization means giving each *program* the illusion of its own CPU and memory. Unit 9 covers the other meaning: virtual *machines*, where a hypervisor gives each whole operating system the illusion of its own hardware. The ideas are close relatives.",
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: "Because the child and the parent print the same address for `g_gold`, the child's `g_gold = 999` must have overwritten the parent's copy in RAM.",
      answer: false,
      explanation: "The address both processes print is a **virtual** address. Each process has its own page tables, so the same virtual address maps to different physical memory. (In fact `fork` lets them share the physical page until one of them writes, then gives the writer a private copy: this is copy-on-write, coming next unit.) Comparing pointers between two processes tells you nothing about whether they share data.",
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: "Concurrency and persistence",
      blocks: [
        {
          type: 'p',
          text: "Virtualization is the first of three themes that organize this course. The other two:",
        },
        {
          type: 'list',
          items: [
            "**Concurrency.** The kernel is itself a concurrent program: interrupts can arrive at any instruction, and several cores run kernel code at once. It must solve the same races you met with `std::mutex`, and it gives you threads, locks and condition variables to solve yours. You already know [[data-race|data races]] from C++; units 5 and 6 show how locks are built and how engines organize work into job systems.",
            "**Persistence.** RAM forgets everything when power fails. The OS keeps data on SSDs through **file systems**, which must stay consistent even if the machine crashes in the middle of an update. That is why careful games save by writing a temporary file and renaming it over the old save (unit 7).",
          ],
        },
        {
          type: 'table',
          headers: ["Theme", "What the OS provides", "C++ you write on top", "Units"],
          rows: [
            ["Virtualization", "processes, address spaces, scheduling", "`fork`/`CreateProcess`, `new`, allocators, `mmap`", "2–4"],
            ["Concurrency", "threads, locks, condition variables, semaphores", "`std::jthread`, `std::mutex`, job systems", "5–6"],
            ["Persistence", "files, directories, crash consistency", "`std::filesystem`, `std::ofstream`, async I/O", "7"],
            ["(and around them)", "pipes, sockets, permissions, VMs", "IPC, UDP game networking, sandboxing", "8–9"],
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: "Illusionist and referee",
          text: "The OS is a stage magician who makes one CPU look like a hundred and a few gigabytes of RAM look like a private universe for each program. It is also a referee: it enforces the rules (who may touch what), shares the field fairly, and throws out any player who breaks them. Every mechanism in this course serves one of those two roles.",
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: "Complete the summary of the three themes.",
      templateIsCode: false,
      template: "Making one CPU look like many is called ___ of the CPU. Running several threads that share data safely is the problem of ___. Keeping a save file intact across a power cut is the problem of ___.",
      blanks: [
        { answers: ["virtualization"] },
        { answers: ["concurrency"] },
        { answers: ["persistence"] },
      ],
      wordBank: ["virtualization", "concurrency", "persistence", "compilation", "emulation", "caching"],
      explanation: "These are OSTEP's \"three easy pieces\". Virtualization creates the illusions (CPU, memory), concurrency is about many things happening at once safely, and persistence is about data that must outlive a process or a crash. Emulation and caching are real techniques, but they are tools used inside these themes, not the themes themselves.",
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: "The referee: kernel space and user space",
      blocks: [
        {
          type: 'p',
          text: "An illusion is only safe if programs cannot break it. So the CPU itself supports (at least) two privilege levels. The [[os-kernel|kernel]] runs in [[kernel-mode]]: it may execute every instruction and touch all memory and devices. Everything else, your game included, runs in [[user-mode]], where the hardware refuses privileged instructions and only lets you touch memory the kernel mapped for you.",
        },
        {
          type: 'list',
          items: [
            "**Kernel space**: the kernel's code and data, mapped at addresses user code cannot access, plus everything it manages (page tables, process records, device drivers).",
            "**User space**: your process's own memory and code, and all the libraries you link, including the C and C++ standard libraries.",
          ],
        },
        {
          type: 'p',
          text: "Note what is *not* in the kernel: `std::vector`, `printf`, `std::thread`'s class, `malloc`. These are ordinary user-space libraries. They ask the kernel for services through a narrow, checked doorway called the [[system-call|system call]], the subject of the next two lessons.",
        },
        {
          type: 'callout',
          variant: 'warning',
          title: "Kernel code has no safety net",
          text: "A crash in user space kills one process. A bug in kernel mode can take down the whole machine. On 19 July 2024 a faulty content update to CrowdStrike's Falcon security driver, which runs in the Windows kernel, crashed about 8.5 million PCs into a blue screen, grounding flights worldwide. This is also the debate around kernel-level anti-cheat drivers: they see more than user-mode code can, but any bug in them is a kernel bug on the player's machine.",
        },
        {
          type: 'callout',
          variant: 'note',
          title: "Separation kernels in defence systems",
          text: "Military avionics push isolation further. Separation kernels such as Green Hills INTEGRITY-178 and Wind River VxWorks 653 split one processor into partitions with fixed memory and fixed CPU time, so flight-critical and mission software can share hardware without being able to interfere with each other. Same idea as user vs kernel space, enforced much more strictly.",
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      multi: true,
      prompt: "Which of these run in **user mode** on Linux or Windows? Select all that apply.",
      options: [
        { text: "The code inside `std::vector::push_back`", correct: true, why: "The standard library is ordinary code linked into your process. It runs with exactly your privileges." },
        { text: "`malloc` / `operator new`", correct: true, why: "The allocator is a user-space library. It occasionally asks the kernel for more address space, but its own bookkeeping runs in your process." },
        { text: "The code that handles a page fault", why: "Page-fault handling edits page tables and talks to storage, which requires kernel mode." },
        { text: "The GPU driver's kernel-mode part that programs the device", why: "Programming device registers and handling device interrupts is privileged. (Modern GPU drivers also have a large user-mode part that builds command buffers; only the kernel-mode part touches the hardware directly.)" },
        { text: "Your game's `main` function", correct: true, why: "Every application starts and stays in user mode; it only enters the kernel briefly through system calls, interrupts and faults." },
      ],
      explanation: "The rule of thumb: if it is a library you link or code you wrote, it runs in user mode with your process's privileges. Only the kernel and kernel-mode drivers run privileged. The boundary between the two is crossed in a controlled way, which is exactly what the next lesson dissects.",
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: "How kernels are built: monolithic, micro, hybrid",
      blocks: [
        {
          type: 'p',
          text: "Once you decide that some code must run privileged, you must decide *how much*. The answer splits kernels into three families.",
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 330">
<text x="86" y="18" font-size="13" font-weight="700" text-anchor="middle">Monolithic</text>
<text x="260" y="18" font-size="13" font-weight="700" text-anchor="middle">Microkernel</text>
<text x="434" y="18" font-size="13" font-weight="700" text-anchor="middle">Hybrid</text>
<line x1="4" y1="128" x2="516" y2="128" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.6"/>
<text x="514" y="122" font-size="9" text-anchor="end" opacity="0.75">user mode</text>
<text x="514" y="140" font-size="9" text-anchor="end" opacity="0.75">kernel mode</text>
<rect x="14" y="40" width="64" height="34" rx="5" class="f-blue" fill-opacity="0.14" stroke="none"/>
<rect x="14" y="40" width="64" height="34" rx="5" fill="none" class="s-blue" stroke-width="1.4"/>
<text x="46" y="61" font-size="11" text-anchor="middle">Game</text>
<rect x="94" y="40" width="64" height="34" rx="5" class="f-blue" fill-opacity="0.14" stroke="none"/>
<rect x="94" y="40" width="64" height="34" rx="5" fill="none" class="s-blue" stroke-width="1.4"/>
<text x="126" y="61" font-size="11" text-anchor="middle">Browser</text>
<rect x="14" y="148" width="144" height="150" rx="6" class="f-orange" fill-opacity="0.14" stroke="none"/>
<rect x="14" y="148" width="144" height="150" rx="6" fill="none" class="s-orange" stroke-width="1.6"/>
<text x="86" y="166" font-size="10" text-anchor="middle" font-weight="700">one kernel image</text>
<text x="86" y="186" font-size="10" text-anchor="middle">system-call interface</text>
<text x="86" y="204" font-size="10" text-anchor="middle">scheduler · memory</text>
<text x="86" y="222" font-size="10" text-anchor="middle">file systems · VFS</text>
<text x="86" y="240" font-size="10" text-anchor="middle">network stack</text>
<text x="86" y="258" font-size="10" text-anchor="middle">device drivers</text>
<text x="86" y="284" font-size="9" text-anchor="middle" font-style="italic">all share one address space</text>
<line x1="46" y1="74" x2="46" y2="141" stroke="currentColor" stroke-width="1.3"/>
<path d="M46,147 L42.5,139 L49.5,139 Z" fill="currentColor"/>
<line x1="126" y1="74" x2="126" y2="141" stroke="currentColor" stroke-width="1.3"/>
<path d="M126,147 L122.5,139 L129.5,139 Z" fill="currentColor"/>
<text x="86" y="318" font-size="10" text-anchor="middle" class="t-gray">Linux, FreeBSD</text>
<rect x="186" y="40" width="58" height="34" rx="5" class="f-blue" fill-opacity="0.14" stroke="none"/>
<rect x="186" y="40" width="58" height="34" rx="5" fill="none" class="s-blue" stroke-width="1.4"/>
<text x="215" y="61" font-size="11" text-anchor="middle">Game</text>
<rect x="276" y="34" width="62" height="24" rx="5" class="f-purple" fill-opacity="0.14" stroke="none"/>
<rect x="276" y="34" width="62" height="24" rx="5" fill="none" class="s-purple" stroke-width="1.4"/>
<text x="307" y="50" font-size="10" text-anchor="middle">file server</text>
<rect x="276" y="64" width="62" height="24" rx="5" class="f-purple" fill-opacity="0.14" stroke="none"/>
<rect x="276" y="64" width="62" height="24" rx="5" fill="none" class="s-purple" stroke-width="1.4"/>
<text x="307" y="80" font-size="10" text-anchor="middle">net server</text>
<rect x="276" y="94" width="62" height="24" rx="5" class="f-purple" fill-opacity="0.14" stroke="none"/>
<rect x="276" y="94" width="62" height="24" rx="5" fill="none" class="s-purple" stroke-width="1.4"/>
<text x="307" y="110" font-size="10" text-anchor="middle">drivers</text>
<rect x="196" y="160" width="128" height="62" rx="6" class="f-orange" fill-opacity="0.14" stroke="none"/>
<rect x="196" y="160" width="128" height="62" rx="6" fill="none" class="s-orange" stroke-width="1.6"/>
<text x="260" y="180" font-size="10" text-anchor="middle" font-weight="700">tiny kernel</text>
<text x="260" y="198" font-size="10" text-anchor="middle">IPC · scheduling</text>
<text x="260" y="213" font-size="10" text-anchor="middle">address spaces</text>
<line x1="215" y1="74" x2="236" y2="153" stroke="currentColor" stroke-width="1.3"/>
<path d="M237.5,159 L232.2,151.9 L239,150.1 Z" fill="currentColor"/>
<line x1="290" y1="153" x2="300" y2="124" stroke="currentColor" stroke-width="1.3"/>
<path d="M302,118 L302.6,126.8 L296,124.5 Z" fill="currentColor"/>
<text x="260" y="246" font-size="9" text-anchor="middle" font-style="italic">services talk by messages</text>
<text x="260" y="260" font-size="9" text-anchor="middle" font-style="italic">through the kernel (IPC)</text>
<text x="260" y="318" font-size="10" text-anchor="middle" class="t-gray">seL4, QNX, MINIX 3</text>
<rect x="368" y="40" width="58" height="34" rx="5" class="f-blue" fill-opacity="0.14" stroke="none"/>
<rect x="368" y="40" width="58" height="34" rx="5" fill="none" class="s-blue" stroke-width="1.4"/>
<text x="397" y="61" font-size="11" text-anchor="middle">Game</text>
<rect x="436" y="40" width="70" height="34" rx="5" class="f-purple" fill-opacity="0.14" stroke="none"/>
<rect x="436" y="40" width="70" height="34" rx="5" fill="none" class="s-purple" stroke-width="1.4"/>
<text x="471" y="55" font-size="10" text-anchor="middle">some services</text>
<text x="471" y="67" font-size="10" text-anchor="middle">in user mode</text>
<rect x="362" y="148" width="148" height="150" rx="6" class="f-orange" fill-opacity="0.14" stroke="none"/>
<rect x="362" y="148" width="148" height="150" rx="6" fill="none" class="s-orange" stroke-width="1.6"/>
<text x="436" y="168" font-size="10" text-anchor="middle">executive / BSD layer:</text>
<text x="436" y="184" font-size="10" text-anchor="middle">files, network, memory,</text>
<text x="436" y="200" font-size="10" text-anchor="middle">drivers, graphics</text>
<rect x="376" y="216" width="120" height="42" rx="5" class="f-teal" fill-opacity="0.16" stroke="none"/>
<rect x="376" y="216" width="120" height="42" rx="5" fill="none" class="s-teal" stroke-width="1.4"/>
<text x="436" y="233" font-size="10" text-anchor="middle">microkernel-style</text>
<text x="436" y="248" font-size="10" text-anchor="middle">core (NT kernel, Mach)</text>
<text x="436" y="284" font-size="9" text-anchor="middle" font-style="italic">still one address space</text>
<line x1="397" y1="74" x2="397" y2="141" stroke="currentColor" stroke-width="1.3"/>
<path d="M397,147 L393.5,139 L400.5,139 Z" fill="currentColor"/>
<text x="436" y="318" font-size="10" text-anchor="middle" class="t-gray">Windows NT, macOS XNU</text>
</svg>`,
          alt: "Three columns. Monolithic: applications call into one large kernel containing the system-call interface, scheduler, memory manager, file systems, network stack and drivers. Microkernel: a tiny kernel provides IPC, scheduling and address spaces, while the file server, network server and drivers run as user-mode processes. Hybrid: a large kernel-mode executive with drivers and graphics sits on a microkernel-style core.",
          caption: "Everything below the dashed line runs in kernel mode. The microkernel moves services above the line, into ordinary isolated processes.",
        },
        {
          type: 'table',
          headers: ["Design", "Idea", "Strength", "Weakness", "Examples"],
          rows: [
            ["[[monolithic-kernel|Monolithic]]", "All OS services in one privileged program", "Fast: services call each other directly", "One buggy driver can crash or compromise everything", "Linux, FreeBSD"],
            ["[[microkernel|Microkernel]]", "Kernel does only IPC, scheduling, address spaces; the rest are user processes", "Small trusted core; a crashed driver can be restarted", "Messages between servers cost extra mode switches and copies", "seL4, QNX, MINIX 3"],
            ["[[hybrid-kernel|Hybrid]]", "Microkernel-style layering, but services kept in kernel mode for speed", "Structure plus speed", "Most code is still privileged, as in a monolith", "Windows NT, macOS XNU"],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why most desktops chose speed",
          text: "Every boundary crossing costs time. When the file system is a separate process, reading a file means messages from your game to the kernel, to the file server, to the disk driver and back. Early microkernels such as Mach were measurably slower, so Linux stayed monolithic and Windows NT even moved its window manager and graphics code (`win32k.sys`) *into* the kernel in NT 4.0. Modern microkernels like seL4 made IPC far cheaper, and they win where a small, verifiable trusted core matters more than raw speed.",
        },
        {
          type: 'p',
          text: "Real systems blur the lines. Linux loads drivers as **kernel modules** at run time, but they still run privileged in the kernel's address space. Windows moved part of the graphics stack out: since Vista a display driver has a user-mode half that builds GPU command buffers and a kernel-mode half that talks to the device, and a hung GPU can be reset (TDR) instead of crashing the system. macOS XNU combines the Mach microkernel with a BSD layer in one kernel image; its IOKit drivers are written in a restricted subset of C++, and DriverKit (macOS 10.15+) now runs many drivers in user space.",
        },
        {
          type: 'callout',
          variant: 'history',
          title: "\"LINUX is obsolete\"",
          text: "In January 1992 Andrew Tanenbaum, author of the MINIX microkernel, posted that a monolithic design like Linux's was a step backwards. Linus Torvalds replied that it worked and was fast. The Tanenbaum–Torvalds debate is still a classic read; both sides were partly right. In 2009 the seL4 team published a machine-checked proof that their microkernel's C code matches its specification, and DARPA's HACMS programme later used seL4 on a Boeing unmanned helicopter that professional red teams failed to break into.",
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: "An engine team wants a crashing audio driver to cost a glitch, not a system crash, and they accept some extra latency per call. Which kernel design matches that wish best?",
      options: [
        { text: "A monolithic kernel, because drivers can call the scheduler directly", why: "Direct calls are fast, but a driver in a monolithic kernel runs privileged in the kernel's address space. Its crash is a kernel crash." },
        { text: "A microkernel, because the driver runs as an isolated user-mode server that can be restarted", correct: true, why: "Isolation is exactly what a microkernel buys: a failing driver process dies alone and can be restarted, at the price of IPC on every request." },
        { text: "A hybrid kernel, because it puts drivers in user mode by definition", why: "Hybrids such as NT and XNU keep most drivers in kernel mode for speed. Some user-mode driver frameworks exist, but that is not what \"hybrid\" means." },
        { text: "It makes no difference: a driver crash always reboots the machine", why: "It depends on where the driver runs. Restartable user-mode drivers are one of the main selling points of microkernels such as QNX and MINIX 3." },
      ],
      explanation: "Kernel design is a trade between performance and fault isolation. The more code runs privileged, the faster services can cooperate, and the larger the amount of code that can bring the machine down. Mainstream desktop systems sit at the fast end; safety-critical systems, from cars to avionics, often choose the isolated end.",
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: "A short history: each problem built a mechanism",
      blocks: [
        {
          type: 'p',
          text: "Operating systems did not appear fully formed. Almost every mechanism in this course was invented to fix a specific, expensive problem.",
        },
        {
          type: 'table',
          headers: ["Era", "Problem", "Invention"],
          rows: [
            ["1950s: batch systems (GM-NAA I/O, 1956)", "A machine worth millions sat idle while a human loaded the next job", "A resident monitor runs jobs back to back"],
            ["1960s: multiprogramming (IBM OS/360, 1964)", "The CPU idled while one job waited for tape or disk", "Keep several jobs in memory and run another during I/O. Now jobs need **protection** from each other"],
            ["1960s: time sharing (CTSS 1961, Multics)", "Programmers waited hours for batch results", "A timer interrupt switches between interactive users many times a second"],
            ["1969–73: Unix", "OSes were huge and tied to one machine", "A small kernel, \"everything is a file\", processes created with `fork`, rewritten in C in 1973 so it could be ported"],
            ["1980s: PCs (MS-DOS, 1981)", "Cheap single-user machines", "Almost no OS: no protection, one program at a time, any bug could crash the machine"],
            ["1990s: Linux (1991), Windows NT (1993)", "PCs needed real protection and multitasking", "Protected, preemptive, multiuser kernels on commodity hardware. NT was led by Dave Cutler, who had designed DEC's VMS"],
            ["2000s on: Mac OS X (2001), phones, consoles", "Many devices, security threats, power limits", "XNU, Linux-based Android, sandboxing, hypervisors"],
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: "The OS under a console game",
          text: "Consoles run real operating systems too. PlayStation's system software is derived from FreeBSD. Xbox runs a hypervisor that hosts a stripped-down Windows-based OS for the game next to a separate OS for the dashboard and apps. Both reserve some cores and memory for the system, which is why console memory budgets are always quoted as \"available to games\", not as total RAM.",
        },
        {
          type: 'callout',
          variant: 'note',
          title: "Real-time operating systems",
          text: "Desktop OSes optimize for throughput and responsiveness on average. A **real-time OS** (VxWorks, QNX, INTEGRITY, FreeRTOS) instead guarantees worst-case deadlines: a flight-control loop must run every few milliseconds, every time. VxWorks drives the Mars rovers and much defence hardware. Unit 3 returns to real-time scheduling, and to why a game is only \"soft\" real-time.",
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'order',
      prompt: "Put these operating-system milestones in chronological order, oldest first.",
      linesAreCode: false,
      lines: [
        "CTSS demonstrates time sharing at MIT",
        "Unix is written at Bell Labs",
        "MS-DOS ships with the IBM PC",
        "Linus Torvalds announces Linux",
        "Windows NT 3.1 is released",
      ],
      explanation: "1961, 1969, 1981, 1991, 1993. Notice the arc: time sharing (CTSS) invented the ideas, Unix made them small and portable, MS-DOS briefly threw protection away to fit cheap PCs, and Linux and NT brought protected, preemptive multitasking back to commodity hardware. Today's Windows is still the NT kernel.",
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'concept',
      title: "What this means for your C++",
      blocks: [
        {
          type: 'p',
          text: "You will not write a kernel in this course. You will learn what the kernel does underneath the C++ you write every day, because that is where performance cliffs, stutters and nasty bugs come from:",
        },
        {
          type: 'list',
          items: [
            "Every `std::` facility that does I/O, threads or large allocations ends in a request to the kernel. Knowing what each request costs tells you what to batch and what to keep off the hot path.",
            "The scheduler decides when your render thread runs. Frame pacing, `Sleep` precision and thread priorities are scheduler questions.",
            "Virtual memory explains page faults during level loads, why memory-mapped pak files work, and why consoles budget memory so carefully.",
            "Files and crash consistency decide whether a power cut corrupts a save game.",
            "Isolation and permissions are why anti-cheat, sandboxing and crash reporters are designed the way they are.",
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: "Linux and Windows side by side",
          text: "Runnable examples in this course use the POSIX API (Linux, macOS), because it is small and easy to compile anywhere with g++. The ideas carry over directly to Windows, which is where you develop and where PC games ship; each lesson shows the Win32 equivalent, such as `CreateProcessW` for `fork` + `exec` or `WriteFile` for `write`. On Windows you can run the POSIX examples under WSL.",
        },
      ],
    },
  ],
  takeaways: [
    "An operating system turns shared, awkward hardware into private, convenient abstractions (illusionist) and decides who may use what (referee).",
    "Virtualizing the CPU means time sharing cores among many programs; virtualizing memory means giving each process a private address space, so the same virtual address can hold different data in two processes.",
    "The course follows three themes: virtualization, concurrency and persistence, plus IPC, networking and security around them.",
    "Only the kernel runs in kernel mode; your code and all the libraries you link run in user mode and ask the kernel for services through system calls.",
    "Monolithic kernels (Linux) trade isolation for speed, microkernels (seL4, QNX) trade speed for isolation, and hybrids (Windows NT, macOS XNU) keep a layered design but run most services privileged.",
    "Most OS mechanisms (protection, time sharing, preemption) were invented to solve a concrete problem of their era.",
  ],
  reading: [
    {
      title: "OSTEP chapter 2: Introduction to Operating Systems",
      url: "https://pages.cs.wisc.edu/~remzi/OSTEP/intro.pdf",
      source: 'book',
      note: "The spine of this course; this chapter introduces virtualization, concurrency and persistence with tiny C programs like ours.",
    },
    {
      title: "Operating Systems: Three Easy Pieces (book page)",
      url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
      source: 'book',
      note: "Free chapters for the whole course; bookmark it.",
    },
    {
      title: "Tanenbaum–Torvalds debate",
      url: "https://en.wikipedia.org/wiki/Tanenbaum%E2%80%93Torvalds_debate",
      source: 'article',
      note: "The 1992 argument over monolithic versus microkernel design, with links to the original posts.",
    },
    {
      title: "The seL4 microkernel",
      url: "https://sel4.systems/",
      source: 'other',
      note: "The formally verified microkernel; see the pages on its proofs and its use in defence and aerospace.",
    },
    {
      title: "Processes and Threads (Microsoft Learn)",
      url: "https://learn.microsoft.com/en-us/windows/win32/procthread/processes-and-threads",
      source: 'other',
      note: "Windows' view of the same abstractions this course builds on.",
    },
  ],
};
