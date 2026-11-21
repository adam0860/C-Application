import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-threads',
  title: 'Threads',
  summary:
    'What a thread really is to the operating system: what threads share and keep private, kernel threads versus user threads and fibers, what pthreads and std::thread do underneath, what a thread costs, and how thread_local works.',
  minutes: 20,
  objectives: [
    'Explain the difference between a process and a thread in terms of address space, resources and execution state',
    'List what threads in one process share (heap, globals, code, file descriptors) and what each keeps private (registers, stack, TLS, errno, signal mask)',
    'Compare the 1:1, N:1 and M:N threading models and explain what fibers are and why engines use them',
    'Describe what `std::thread` and `pthread_create` ask the kernel to do, and what creating a thread costs',
    'Use `thread_local` correctly and explain how the `fs` register makes it work on x86-64',
    'Predict how threads interact with `fork`, `exit`, crashes and signals',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'A thread is one CPU\'s worth of state',
      blocks: [
        {
          type: 'p',
          text: 'In C++ Fundamentals (*Threads and std::jthread*) you started threads with `std::thread` and `std::jthread`. This unit looks at the same threads from the operating system\'s side: what the kernel keeps for each one, what a switch between them costs, and why engines bother with fibers and job systems.',
        },
        {
          type: 'p',
          text: 'A process, as the previous units built it, bundles two different things. The first is a **container of resources**: an address space, open files, a working directory and credentials. The second is an **execution state**: a program counter, a stack pointer and the other registers, saying where the program is and what it is doing. A [[thread]] separates the two. A process is the container, and each thread is one execution state running inside it.',
        },
        {
          type: 'definition',
          term: 'Thread',
          text: 'An independent sequence of execution inside a process, with its own registers (including the program counter and stack pointer), its own stack and its own thread-local storage, sharing the process\'s address space and resources with the other threads in it. The OS schedules threads, not processes.',
        },
        {
          type: 'figure',
          svg: "<svg viewBox=\"0 0 520 380\" xmlns=\"http://www.w3.org/2000/svg\"><text x=\"200\" y=\"16\" text-anchor=\"middle\" font-size=\"12\" class=\"t-gray\">high addresses</text><rect x=\"110\" y=\"24\" width=\"180\" height=\"26\" fill=\"currentColor\" fill-opacity=\"0.04\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-dasharray=\"4 3\" class=\"s-gray\"/><text x=\"200\" y=\"41\" text-anchor=\"middle\" font-size=\"12\" class=\"t-gray\">kernel (no user access)</text><rect x=\"110\" y=\"56\" width=\"180\" height=\"54\" fill=\"currentColor\" fill-opacity=\"0.08\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-blue f-blue\"/><text x=\"200\" y=\"88\" text-anchor=\"middle\" font-size=\"13\" class=\"t-blue\">main thread stack \u2193</text><rect x=\"110\" y=\"122\" width=\"180\" height=\"14\" fill=\"currentColor\" fill-opacity=\"0.18\" stroke=\"currentColor\" stroke-width=\"1.2\" class=\"s-orange f-orange\"/><text x=\"200\" y=\"133\" text-anchor=\"middle\" font-size=\"10\">TLS (render)</text><rect x=\"110\" y=\"136\" width=\"180\" height=\"34\" fill=\"currentColor\" fill-opacity=\"0.08\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-orange f-orange\"/><text x=\"200\" y=\"157\" text-anchor=\"middle\" font-size=\"13\" class=\"t-orange\">render thread stack \u2193</text><rect x=\"110\" y=\"170\" width=\"180\" height=\"9\" fill=\"currentColor\" fill-opacity=\"0.35\" stroke=\"currentColor\" stroke-width=\"1\" class=\"s-red f-red\"/><rect x=\"110\" y=\"186\" width=\"180\" height=\"14\" fill=\"currentColor\" fill-opacity=\"0.18\" stroke=\"currentColor\" stroke-width=\"1.2\" class=\"s-green f-green\"/><text x=\"200\" y=\"197\" text-anchor=\"middle\" font-size=\"10\">TLS (audio)</text><rect x=\"110\" y=\"200\" width=\"180\" height=\"34\" fill=\"currentColor\" fill-opacity=\"0.08\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-green f-green\"/><text x=\"200\" y=\"221\" text-anchor=\"middle\" font-size=\"13\" class=\"t-green\">audio thread stack \u2193</text><rect x=\"110\" y=\"234\" width=\"180\" height=\"9\" fill=\"currentColor\" fill-opacity=\"0.35\" stroke=\"currentColor\" stroke-width=\"1\" class=\"s-red f-red\"/><text x=\"200\" y=\"262\" text-anchor=\"middle\" font-size=\"12\" class=\"t-gray\">\u22ee unmapped / mmap \u22ee</text><rect x=\"110\" y=\"274\" width=\"180\" height=\"30\" fill=\"currentColor\" fill-opacity=\"0.08\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-purple f-purple\"/><text x=\"200\" y=\"294\" text-anchor=\"middle\" font-size=\"13\" class=\"t-purple\">heap \u2191</text><rect x=\"110\" y=\"304\" width=\"180\" height=\"24\" fill=\"currentColor\" fill-opacity=\"0.08\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-purple f-purple\"/><text x=\"200\" y=\"320\" text-anchor=\"middle\" font-size=\"12\" class=\"t-purple\">globals (.data, .bss)</text><rect x=\"110\" y=\"328\" width=\"180\" height=\"24\" fill=\"currentColor\" fill-opacity=\"0.08\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-purple f-purple\"/><text x=\"200\" y=\"344\" text-anchor=\"middle\" font-size=\"12\" class=\"t-purple\">code (.text)</text><text x=\"200\" y=\"372\" text-anchor=\"middle\" font-size=\"12\" class=\"t-gray\">low addresses</text><path d=\"M300,174 L312,174\" stroke=\"currentColor\" stroke-width=\"1\" class=\"s-red\"/><text x=\"316\" y=\"178\" font-size=\"11\" class=\"t-red\">guard page</text><path d=\"M300,238 L312,238\" stroke=\"currentColor\" stroke-width=\"1\" class=\"s-red\"/><text x=\"316\" y=\"242\" font-size=\"11\" class=\"t-red\">guard page</text><path d=\"M100,276 L92,276 L92,350 L100,350\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-purple\"/><text x=\"86\" y=\"304\" text-anchor=\"end\" font-size=\"12\" class=\"t-purple\">shared by</text><text x=\"86\" y=\"320\" text-anchor=\"end\" font-size=\"12\" class=\"t-purple\">every thread</text><path d=\"M100,58 L92,58 L92,232 L100,232\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-gray\"/><text x=\"86\" y=\"140\" text-anchor=\"end\" font-size=\"12\" class=\"t-gray\">one stack</text><text x=\"86\" y=\"156\" text-anchor=\"end\" font-size=\"12\" class=\"t-gray\">and TLS block</text><text x=\"86\" y=\"172\" text-anchor=\"end\" font-size=\"12\" class=\"t-gray\">per thread</text><rect x=\"400\" y=\"62\" width=\"104\" height=\"44\" rx=\"6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-blue\"/><text x=\"452\" y=\"80\" text-anchor=\"middle\" font-size=\"12\" class=\"t-blue\">main TCB</text><text x=\"452\" y=\"97\" text-anchor=\"middle\" font-size=\"11\" font-family=\"monospace\">rip rsp fs \u2026</text><rect x=\"400\" y=\"128\" width=\"104\" height=\"44\" rx=\"6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-orange\"/><text x=\"452\" y=\"146\" text-anchor=\"middle\" font-size=\"12\" class=\"t-orange\">render TCB</text><text x=\"452\" y=\"163\" text-anchor=\"middle\" font-size=\"11\" font-family=\"monospace\">rip rsp fs \u2026</text><rect x=\"400\" y=\"192\" width=\"104\" height=\"44\" rx=\"6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-green\"/><text x=\"452\" y=\"210\" text-anchor=\"middle\" font-size=\"12\" class=\"t-green\">audio TCB</text><text x=\"452\" y=\"227\" text-anchor=\"middle\" font-size=\"11\" font-family=\"monospace\">rip rsp fs \u2026</text><path d=\"M400,98 L300,98\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-blue\"/><path d=\"M300,98 L310,93 L310,103 Z\" class=\"f-blue\"/><path d=\"M400,162 L300,162\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-orange\"/><path d=\"M300,162 L310,157 L310,167 Z\" class=\"f-orange\"/><path d=\"M400,226 L300,226\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-green\"/><path d=\"M300,226 L310,221 L310,231 Z\" class=\"f-green\"/><text x=\"452\" y=\"262\" text-anchor=\"middle\" font-size=\"11\" class=\"t-gray\">kept by the kernel:</text><text x=\"452\" y=\"277\" text-anchor=\"middle\" font-size=\"11\" class=\"t-gray\">saved registers,</text><text x=\"452\" y=\"292\" text-anchor=\"middle\" font-size=\"11\" class=\"t-gray\">state, priority</text><text x=\"350\" y=\"90\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\">saved rsp</text></svg>",
          alt: 'A process address space from high to low addresses: the kernel region, the main thread stack, a render thread stack with its TLS block on top and a guard page below, an audio thread stack with its TLS block and guard page, unmapped space, then the heap, globals and code, which are bracketed as shared by every thread. On the right, three thread control blocks (main, render, audio) each hold saved registers and point at their own stack.',
          caption: 'Three threads in one address space. Each has its own stack (glibc puts a new thread\'s TLS block at the top of its stack mapping and a guard page below it), and the kernel keeps a control block per thread holding its saved registers. The heap, globals and code are shared by all of them.',
        },
        {
          type: 'p',
          text: 'Because every thread sees the same address space, a pointer means the same thing in every thread. A thread can hand another thread a pointer to a heap object, or even to a local variable on its own stack, and the other thread can use it directly. Two processes cannot do that without setting up shared memory first.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just use several processes?',
          text: 'You can, and browsers do, for isolation. But threads win when the parts of a program need to **share a lot of data quickly**: a game\'s render thread reads the scene the game thread just built, and worker threads write animation poses straight into arrays the renderer uses. With threads that sharing is free, because it is the same memory. Threads are also cheaper to create and to switch between, as you will measure below. The price is that nothing protects threads from each other: one thread\'s stray write or crash affects them all.',
        },
        {
          type: 'p',
          text: 'Threads earn their keep in three ways. **Parallelism**: on a multicore CPU, several threads of one program run at the same instant. **Overlapping waits**: while one thread blocks in a slow `read` from disk, another keeps computing. **Responsiveness**: a dedicated audio thread keeps feeding the sound card even while the game thread has a slow frame.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'What threads share, and what each one keeps',
      blocks: [
        {
          type: 'table',
          headers: ['Shared by all threads of a process', 'Private to each thread'],
          rows: [
            ['The address space: code, globals, the heap, memory-mapped files', 'Registers, including the program counter and stack pointer'],
            ['Open file descriptors (or Windows handles)', 'Its stack (and so its local variables)'],
            ['Process ID, user and group IDs, current working directory', 'Thread ID'],
            ['Signal **handlers** (what each signal does)', 'Signal **mask** (which signals it blocks)'],
            ['Resource limits', 'Thread-local storage, including `errno`'],
            ['Memory-mapped files and shared libraries', 'Scheduling state: priority, CPU affinity, whether it is running, ready or blocked'],
          ],
        },
        {
          type: 'p',
          text: 'The program below shows all three kinds of storage. `totalHits` is a global, so every thread updates the same object (it is atomic, so that is safe). `myHits` is `thread_local`, so each thread gets its own copy. `base` is a local on each thread\'s stack. And the threads write their results into `main`\'s stack through references, which works because the stack is just memory in the shared address space.',
        },
        {
          type: 'code',
          runnable: true,
          title: 'shared_vs_private.cpp',
          code: `#include <atomic>
#include <functional>
#include <iostream>
#include <thread>
#include <vector>

std::atomic<int> totalHits{0};     // one copy, shared by all
thread_local int myHits = 0;       // one copy PER THREAD

void worker(int id, int& result) {
    int base = id * 100;           // lives on this thread's stack
    for (int i = 0; i < 1000; ++i) {
        ++myHits;
        totalHits.fetch_add(1);
    }
    result = base + myHits;        // writes into main's stack
}

int main() {
    int results[3] = {};
    {
        std::vector<std::jthread> threads;
        for (int id = 0; id < 3; ++id) {
            threads.emplace_back(worker, id, std::ref(results[id]));
        }
    }                              // jthreads join here
    for (int r : results) std::cout << r << '\\n';
    std::cout << "totalHits: " << totalHits << '\\n';
    std::cout << "main's myHits: " << myHits << '\\n';
}`,
          output: '1000\n1100\n1200\ntotalHits: 3000\nmain\'s myHits: 0',
          annotations: [
            { lines: 7, text: 'A global: one object in the data segment, visible to every thread. Shared and written, so it must be atomic (or locked).' },
            { lines: 8, text: '`thread_local`: every thread that touches `myHits` gets its own zero-initialized copy. No sharing, so no lock is needed.' },
            { lines: 11, text: 'Each call of `worker` runs on a different thread, so each `base` is on a different stack.' },
            { lines: 16, text: '`result` refers to an element of `results`, which lives in `main`\'s stack frame. Another thread can write there because all stacks are in one address space. Each thread writes a different element, so there is no data race.' },
            { lines: 26, text: 'Leaving the block destroys the `jthread`s, which joins them. After a join, everything the thread wrote is visible to `main`.' },
            { lines: 29, text: 'Each worker counted 1000 in its own `myHits`. The main thread never touched its copy, which is still 0.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Private is a convention, not a protection',
          text: 'A thread\'s stack is private only in the sense that nobody else *normally* uses it. Nothing stops another thread from writing to it through a pointer. If a thread returns from the function that owns a local while another thread still holds a pointer to it, that pointer dangles, exactly like returning a pointer to a local from a function. Stacks are not protected from each other; only the guard page below each stack catches overflows.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      multi: true,
      prompt: 'A game has a render thread and an audio thread in the same process. Which of these does **each thread have its own copy of**? Select all that apply.',
      options: [
        { text: 'The stack pointer and program counter', correct: true, why: 'Each thread is its own execution state, so each has its own registers. When a thread is not running, the kernel saves them in its control block.' },
        { text: 'The heap', why: 'There is one heap per process. Memory one thread allocates with `new` can be used and deleted by any other thread.' },
        { text: '`errno`', correct: true, why: '`errno` is thread-local, so a failing `read` on the audio thread cannot overwrite the error code the render thread is about to check.' },
        { text: 'The table of open file descriptors', why: 'File descriptors belong to the process. A file opened by the loading thread can be read by any thread using the same descriptor number.' },
        { text: 'The signal mask', correct: true, why: 'Each thread chooses which signals it blocks with `pthread_sigmask`. The handlers themselves are shared by the whole process.' },
      ],
      explanation:
        'The rule of thumb: anything describing **where a thread is in its execution** (registers, stack, signal mask, `errno`, other TLS) is per thread, and anything describing **the program\'s resources** (memory, descriptors, handlers, IDs) belongs to the process and is shared. That split is why threads can share data for free, and also why any shared data needs synchronization.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'What the kernel sees',
      blocks: [
        {
          type: 'p',
          text: 'For each thread the kernel keeps a **thread control block** (TCB): the saved registers, the scheduling state and priority, and a pointer to the process it belongs to. When the scheduler switches threads, it saves the current registers into one TCB and loads them from another.',
        },
        {
          type: 'p',
          text: 'Linux has no separate thread object. Every schedulable thing is a *task* (a `task_struct`), and a new thread is just a task created with `clone` flags saying what to share with its creator. Tracing a one-line program that starts a `std::thread` shows exactly what glibc asks for:',
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Real output, trimmed and wrapped (Linux 6.18, glibc 2.39)',
          code: `$ strace -f -e trace=mmap,mprotect,clone3 ./one_thread
...
mmap(NULL, 8392704, PROT_NONE,
     MAP_PRIVATE|MAP_ANONYMOUS|MAP_STACK, -1, 0) = 0x7fd34cfff000
mprotect(0x7fd34d000000, 8388608, PROT_READ|PROT_WRITE) = 0
clone3({flags=CLONE_VM|CLONE_FS|CLONE_FILES|CLONE_SIGHAND|
        CLONE_THREAD|CLONE_SYSVSEM|CLONE_SETTLS|
        CLONE_PARENT_SETTID|CLONE_CHILD_CLEARTID, ...,
        stack=0x7fd34cfff000, stack_size=0x7fff80,
        tls=0x7fd34d7ff6c0}, 88) = 23180`,
          annotations: [
            { lines: '3-4', text: 'glibc reserves 8 MiB plus one 4 KiB page for the new thread\'s stack, all inaccessible at first (`PROT_NONE`).' },
            { lines: 5, text: 'It then makes the top 8 MiB readable and writable. The lowest page stays `PROT_NONE`: the **guard page**. Overflowing the stack hits it and crashes cleanly instead of silently corrupting whatever lies below.' },
            { lines: '6-8', text: 'The share-everything flags. `CLONE_VM`: same address space. `CLONE_FILES`: same descriptor table. `CLONE_SIGHAND`: same signal handlers. `CLONE_THREAD`: same thread group, so the same PID. `CLONE_SETTLS`: point the new task\'s `fs` register at its TLS block.' },
            { lines: '9-10', text: 'The new stack and the TLS block, which sits at the top of the stack mapping. The return value, 23180, is the new thread\'s ID.' },
          ],
        },
        {
          type: 'p',
          text: 'Leave those flags out and the same `clone` call creates a new *process*, which is what `fork` does. Threads and processes are two ends of one mechanism on Linux. All the threads of a process form a **thread group**: `getpid()` returns the group\'s ID (the main thread\'s ID) in every thread, and `gettid()` returns each thread\'s own ID.',
        },
        {
          type: 'code',
          runnable: true,
          title: 'tid.cpp',
          code: `#include <unistd.h>
#include <iostream>
#include <thread>

int main() {
    const pid_t pid = getpid();
    const pid_t mainTid = gettid();
    std::cout << "main:   tid == pid? "
              << (mainTid == pid ? "yes" : "no") << '\\n';
    std::jthread worker{[pid, mainTid] {
        std::cout << "worker: same pid?  "
                  << (getpid() == pid ? "yes" : "no") << '\\n';
        std::cout << "worker: new tid?   "
                  << (gettid() != mainTid ? "yes" : "no") << '\\n';
    }};
}`,
          output: 'main:   tid == pid? yes\nworker: same pid?  yes\nworker: new tid?   yes',
          annotations: [
            { lines: 7, text: '`gettid` (glibc 2.30 and later) returns the kernel\'s ID for the calling thread. The program prints comparisons, not the IDs themselves, because the numbers change on every run.' },
            { lines: 9, text: 'The main thread\'s ID equals the process ID: it is the thread group leader.' },
            { lines: '11-14', text: 'A second thread sees the same PID but has its own thread ID.' },
          ],
        },
        {
          type: 'p',
          text: 'Tools show the same thing. Here is a toy "engine" that names its threads with `pthread_setname_np` and then sleeps; `ps -L` lists one line per thread (`LWP`, light-weight process, is the thread ID) and `/proc/<pid>/task` has one directory per thread:',
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Real output',
          code: `$ ./engine &
$ ps -L -o pid,lwp,nlwp,comm -p $(pgrep -x game)
  PID   LWP NLWP COMMAND
14741 14741    5 game
14741 14743    5 render
14741 14744    5 audio
14741 14745    5 worker-0
14741 14746    5 worker-1
$ ls /proc/14741/task
14741  14743  14744  14745  14746`,
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Windows',
          text: 'Windows keeps the two ideas as separate kernel objects: a **process** (`EPROCESS`) owns the address space and handle table, and each **thread** (`ETHREAD`/`KTHREAD`) is what the scheduler runs. A process starts with one thread, more are added with `CreateThread`, and the process ends when its last thread exits. Process and thread IDs come from the same pool, so they never collide.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why a thread switch is cheaper than a process switch',
          text: 'Switching between two threads of the **same** process saves and restores registers but keeps the address space, so the kernel does not load a new page-table root and the [[tlb]] entries stay valid. Switching to another process changes the address space, and the new process then starts with cold TLB entries and caches. Both still cost a trip into the kernel.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'truefalse',
      prompt: 'On Linux, calling `getpid()` from a thread started with `std::thread` returns a different number than calling it from `main`.',
      answer: false,
      explanation:
        'All threads of a process belong to one **thread group**, and `getpid()` returns the group\'s ID, which is the same in every thread. Each thread does have a distinct kernel task ID, which `gettid()` returns and `ps -L` shows in the `LWP` column. (Very old Linux threading, LinuxThreads before NPTL in 2.6, really did give each thread its own PID, which broke POSIX; NPTL and `CLONE_THREAD` fixed it.)',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Kernel threads, user threads and fibers',
      blocks: [
        {
          type: 'p',
          text: 'The threads so far are **kernel threads**: the kernel knows each one, schedules it and can run several in parallel on different cores. But a thread is only registers plus a stack, and a program can switch between register sets itself, in user mode, without telling the kernel. That gives **user-level threads**, and the question becomes how many user threads map onto how many kernel threads.',
        },
        {
          type: 'table',
          headers: ['Model', 'How it works', 'Strength', 'Weakness', 'Examples'],
          rows: [
            ['**1:1**', 'Every user thread is a kernel thread', 'True parallelism; a blocking call blocks only that thread', 'Creating and switching go through the kernel', 'Linux NPTL, Windows threads, `std::thread` everywhere'],
            ['**N:1**', 'Many user threads share one kernel thread, switched by a user-space library', 'Switching is a few nanoseconds; no kernel calls', 'No parallelism, and one blocking system call stalls every user thread', 'Early Java "green threads", GNU Pth'],
            ['**M:N**', 'Many user threads multiplexed onto several kernel threads', 'Cheap switching *and* parallelism', 'Two schedulers that do not know about each other; hard to get right', 'Go goroutines, Solaris threads before Solaris 9'],
          ],
        },
        {
          type: 'p',
          text: 'Mainstream operating systems settled on 1:1 because the kernel needs to know about every thread that might block or run on a core. A **fiber** is the engine programmer\'s version of a user thread: a stack plus a saved register set, switched **cooperatively**. A fiber runs until it explicitly yields to another fiber; nothing preempts it. Windows has fibers built in (`ConvertThreadToFiber`, `CreateFiber`, `SwitchToFiber`), and POSIX systems have the older `ucontext` functions. Step through a fiber switch:',
        },
        {
  "type": "algo",
  "view": "array",
  "code": "void fiberBody() {\n    print(\"fiber: load chunk A\");\n    swapcontext(&fiberCtx, &mainCtx);\n    print(\"fiber: load chunk B\");\n    swapcontext(&fiberCtx, &mainCtx);\n    print(\"fiber: done\");\n}   // returns to uc_link (mainCtx)\n\nint main() {\n    makecontext(&fiberCtx, fiberBody, 0);\n    for (int frame = 1; frame <= 3; ++frame) {\n        print(\"main: frame\", frame);\n        swapcontext(&mainCtx, &fiberCtx);\n    }\n}",
  "interval": 1300,
  "caption": "Two execution contexts, one thread: `swapcontext` saves one set of registers and loads the other.",
  "frames": [
    {
      "note": "`makecontext` points `fiberCtx` at `fiberBody` and at its own 64 KiB stack. Nothing runs on it yet.",
      "array": [
        "running",
        "not started"
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
          "label": "main stack",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "fiber stack",
          "color": "purple"
        }
      ],
      "lines": [
        10
      ],
      "vars": [
        [
          "CPU runs",
          "main"
        ],
        [
          "mainCtx holds",
          "—"
        ],
        [
          "fiberCtx holds",
          "—"
        ],
        [
          "last output",
          "—"
        ]
      ]
    },
    {
      "note": "Main prints frame 1. Only one thread exists; it is running on the main stack.",
      "array": [
        "running",
        "not started"
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
          "label": "main stack",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "fiber stack",
          "color": "purple"
        }
      ],
      "lines": [
        12
      ],
      "vars": [
        [
          "CPU runs",
          "main"
        ],
        [
          "mainCtx holds",
          "—"
        ],
        [
          "fiberCtx holds",
          "—"
        ],
        [
          "last output",
          "main: frame 1"
        ]
      ]
    },
    {
      "note": "`swapcontext` stores main's registers in `mainCtx`, loads `fiberCtx` and jumps. Same thread, different stack: no kernel scheduler involved.",
      "array": [
        "saved",
        "running"
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
          "label": "main stack",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "fiber stack",
          "color": "purple"
        }
      ],
      "lines": [
        13
      ],
      "vars": [
        [
          "CPU runs",
          "fiber"
        ],
        [
          "mainCtx holds",
          "rip → line 13, rsp → main stack"
        ],
        [
          "fiberCtx holds",
          "—"
        ],
        [
          "last output",
          "main: frame 1"
        ]
      ]
    },
    {
      "note": "The fiber runs its first chunk of work on its own stack.",
      "array": [
        "saved",
        "running"
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
          "label": "main stack",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "fiber stack",
          "color": "purple"
        }
      ],
      "lines": [
        2
      ],
      "vars": [
        [
          "CPU runs",
          "fiber"
        ],
        [
          "mainCtx holds",
          "rip → line 13, rsp → main stack"
        ],
        [
          "fiberCtx holds",
          "—"
        ],
        [
          "last output",
          "fiber: load chunk A"
        ]
      ]
    },
    {
      "note": "The fiber **yields**: its registers go into `fiberCtx`, main's come back. Main continues after its `swapcontext` call.",
      "array": [
        "running",
        "saved"
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
          "label": "main stack",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "fiber stack",
          "color": "purple"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "CPU runs",
          "main"
        ],
        [
          "mainCtx holds",
          "rip → line 13, rsp → main stack"
        ],
        [
          "fiberCtx holds",
          "rip → line 4, rsp → fiber stack"
        ],
        [
          "last output",
          "fiber: load chunk A"
        ]
      ]
    },
    {
      "note": "Main prints frame 2. Only one thread exists; it is running on the main stack.",
      "array": [
        "running",
        "saved"
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
          "label": "main stack",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "fiber stack",
          "color": "purple"
        }
      ],
      "lines": [
        12
      ],
      "vars": [
        [
          "CPU runs",
          "main"
        ],
        [
          "mainCtx holds",
          "rip → line 13, rsp → main stack"
        ],
        [
          "fiberCtx holds",
          "rip → line 4, rsp → fiber stack"
        ],
        [
          "last output",
          "main: frame 2"
        ]
      ]
    },
    {
      "note": "Main resumes the fiber. It continues exactly where it stopped, with its locals intact on its stack.",
      "array": [
        "saved",
        "running"
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
          "label": "main stack",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "fiber stack",
          "color": "purple"
        }
      ],
      "lines": [
        13
      ],
      "vars": [
        [
          "CPU runs",
          "fiber"
        ],
        [
          "mainCtx holds",
          "rip → line 13, rsp → main stack"
        ],
        [
          "fiberCtx holds",
          "rip → line 4, rsp → fiber stack"
        ],
        [
          "last output",
          "main: frame 2"
        ]
      ]
    },
    {
      "note": "Second chunk of work.",
      "array": [
        "saved",
        "running"
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
          "label": "main stack",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "fiber stack",
          "color": "purple"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "CPU runs",
          "fiber"
        ],
        [
          "mainCtx holds",
          "rip → line 13, rsp → main stack"
        ],
        [
          "fiberCtx holds",
          "rip → line 4, rsp → fiber stack"
        ],
        [
          "last output",
          "fiber: load chunk B"
        ]
      ]
    },
    {
      "note": "Yield again. A fiber switches only when it **chooses** to: cooperative scheduling.",
      "array": [
        "running",
        "saved"
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
          "label": "main stack",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "fiber stack",
          "color": "purple"
        }
      ],
      "lines": [
        5
      ],
      "vars": [
        [
          "CPU runs",
          "main"
        ],
        [
          "mainCtx holds",
          "rip → line 13, rsp → main stack"
        ],
        [
          "fiberCtx holds",
          "rip → line 6, rsp → fiber stack"
        ],
        [
          "last output",
          "fiber: load chunk B"
        ]
      ]
    },
    {
      "note": "Main prints frame 3. Only one thread exists; it is running on the main stack.",
      "array": [
        "running",
        "saved"
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
          "label": "main stack",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "fiber stack",
          "color": "purple"
        }
      ],
      "lines": [
        12
      ],
      "vars": [
        [
          "CPU runs",
          "main"
        ],
        [
          "mainCtx holds",
          "rip → line 13, rsp → main stack"
        ],
        [
          "fiberCtx holds",
          "rip → line 6, rsp → fiber stack"
        ],
        [
          "last output",
          "main: frame 3"
        ]
      ]
    },
    {
      "note": "Third resume.",
      "array": [
        "saved",
        "running"
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
          "label": "main stack",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "fiber stack",
          "color": "purple"
        }
      ],
      "lines": [
        13
      ],
      "vars": [
        [
          "CPU runs",
          "fiber"
        ],
        [
          "mainCtx holds",
          "rip → line 13, rsp → main stack"
        ],
        [
          "fiberCtx holds",
          "rip → line 6, rsp → fiber stack"
        ],
        [
          "last output",
          "main: frame 3"
        ]
      ]
    },
    {
      "note": "The fiber prints its last line and returns from `fiberBody`.",
      "array": [
        "saved",
        "running"
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
          "label": "main stack",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "fiber stack",
          "color": "purple"
        }
      ],
      "lines": [
        6
      ],
      "vars": [
        [
          "CPU runs",
          "fiber"
        ],
        [
          "mainCtx holds",
          "rip → line 13, rsp → main stack"
        ],
        [
          "fiberCtx holds",
          "rip → line 6, rsp → fiber stack"
        ],
        [
          "last output",
          "fiber: done"
        ]
      ]
    },
    {
      "note": "Returning from a context's function jumps to its `uc_link`, so control lands back in main. The program prints \"main: fiber finished\".",
      "array": [
        "running",
        "finished"
      ],
      "marks": [
        {
          "index": 0,
          "color": "orange"
        },
        {
          "index": 1,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "main stack",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "fiber stack",
          "color": "purple"
        }
      ],
      "lines": [
        7
      ],
      "vars": [
        [
          "CPU runs",
          "main"
        ],
        [
          "mainCtx holds",
          "rip → line 13, rsp → main stack"
        ],
        [
          "fiberCtx holds",
          "—"
        ],
        [
          "last output",
          "fiber: done"
        ]
      ]
    }
  ]
},
        {
          type: 'code',
          runnable: true,
          title: 'fiber.cpp (POSIX ucontext)',
          code: `#include <ucontext.h>
#include <iostream>

ucontext_t mainCtx;
ucontext_t fiberCtx;
char fiberStack[64 * 1024];

void fiberBody() {
    std::cout << "fiber: load chunk A\\n";
    swapcontext(&fiberCtx, &mainCtx);
    std::cout << "fiber: load chunk B\\n";
    swapcontext(&fiberCtx, &mainCtx);
    std::cout << "fiber: done\\n";
}

int main() {
    getcontext(&fiberCtx);
    fiberCtx.uc_stack.ss_sp = fiberStack;
    fiberCtx.uc_stack.ss_size = sizeof fiberStack;
    fiberCtx.uc_link = &mainCtx;
    makecontext(&fiberCtx, fiberBody, 0);

    for (int frame = 1; frame <= 3; ++frame) {
        std::cout << "main: frame " << frame << '\\n';
        swapcontext(&mainCtx, &fiberCtx);
    }
    std::cout << "main: fiber finished\\n";
}`,
          output: 'main: frame 1\nfiber: load chunk A\nmain: frame 2\nfiber: load chunk B\nmain: frame 3\nfiber: done\nmain: fiber finished',
          annotations: [
            { lines: '4-6', text: 'A context is a saved register set. The fiber gets its own 64 KiB stack, here a global array: any memory will do.' },
            { lines: '17-21', text: 'Initialize the fiber\'s context from the current one, give it its stack, say where to go when its function returns (`uc_link`), and set its entry point.' },
            { lines: 10, text: 'Yield: save the fiber\'s registers into `fiberCtx`, load `mainCtx`. The fiber\'s locals stay on its stack until it is resumed.' },
            { lines: 25, text: 'Resume: save main\'s registers and jump into the fiber. There is still only **one** kernel thread in this process.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why game engines like fibers',
          text: 'A job running on a worker thread sometimes has to wait for other jobs. If it blocks the **thread**, a core sits idle. If it is running on a **fiber**, the worker can park that fiber, switch to another fiber and keep the core busy, then resume the first fiber later, possibly on another worker. The switch costs about as much as a function call because it never enters the kernel. Naughty Dog built its PS4 engine this way; the next unit looks at its job system.',
        },
        {
          type: 'deepdive',
          title: 'Why real fiber libraries do not use swapcontext',
          blocks: [
            {
              type: 'p',
              text: '`swapcontext` also saves and restores the **signal mask**, and the signal mask lives in the kernel. Under `strace`, the fiber program above makes 7 `rt_sigprocmask` system calls, one per context operation, which makes each switch hundreds of times slower than it needs to be. The `ucontext` functions were also removed from POSIX in 2008 (glibc still provides them). Libraries such as Boost.Context switch fibers with a few lines of assembly that save only the callee-saved registers and swap the stack pointer: on x86-64 System V that is `rbx`, `rbp`, `r12` to `r15`, `rsp` and the return address, because the calling convention says the caller has already saved everything else.',
            },
            {
              type: 'code',
              title: 'Windows fibers (not runnable here: Win32 API)',
              code: `#include <windows.h>

void* mainFiber = nullptr;

void CALLBACK LoaderFiber(void*) {
    LoadChunk('A');
    SwitchToFiber(mainFiber);    // yield
    LoadChunk('B');
    SwitchToFiber(mainFiber);
}

int main() {
    mainFiber = ConvertThreadToFiber(nullptr);
    void* loader = CreateFiber(64 * 1024, LoaderFiber, nullptr);
    SwitchToFiber(loader);       // runs chunk A
    SwitchToFiber(loader);       // runs chunk B
    DeleteFiber(loader);
}`,
              annotations: [
                { lines: 13, text: 'A thread must become a fiber itself before it can switch to other fibers.' },
                { lines: 14, text: 'Allocates a 64 KiB stack and a context. The fiber does not start until something switches to it.' },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'mcq',
      prompt: 'A server uses an **N:1** user-level thread library: 200 user threads multiplexed on one kernel thread. One user thread calls a blocking `read()` on a socket that has no data yet. What happens?',
      options: [
        { text: 'Only that user thread waits; the library runs the other 199 meanwhile', why: 'That is what a 1:1 or M:N model gives you. Here the kernel sees only one thread, and that thread is now asleep inside `read`.' },
        { text: 'The whole process stops running until the data arrives, because its only kernel thread is blocked in the kernel', correct: true, why: 'The kernel blocks the one thread it knows about. The user-level scheduler never gets the CPU back to switch to another user thread.' },
        { text: '`read()` fails immediately with `EAGAIN`', why: 'Only a descriptor in non-blocking mode does that. N:1 libraries often switch descriptors to non-blocking mode precisely to avoid this problem, but a plain blocking `read` simply blocks.' },
        { text: 'The kernel moves the other user threads to a new kernel thread', why: 'The kernel does not know user threads exist, so it cannot move them anywhere.' },
      ],
      explanation:
        'This is the classic weakness of N:1 threading, and the same thing applies to fibers in a game engine: a fiber that makes a blocking system call blocks its worker thread and every fiber that worker would have run. Fiber-based job systems therefore keep blocking I/O off the workers, on dedicated I/O threads or asynchronous I/O, and use fiber switches only for waiting on *other jobs*.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'The thread API: pthreads under std::thread',
      blocks: [
        {
          type: 'p',
          text: 'On Linux, `std::thread` is a thin wrapper over **POSIX threads** (pthreads): libstdc++ calls `pthread_create`, which allocates the stack and calls `clone3` as traced above. On Windows, Microsoft\'s library calls `_beginthreadex`, which wraps `CreateThread`. Here is the raw POSIX API, in its C style:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'pthread_sum.cpp',
          code: `#include <pthread.h>
#include <cstring>
#include <iostream>

struct Job {
    int first;
    int last;
    long sum;
};

void* sumRange(void* arg) {
    auto* job = static_cast<Job*>(arg);
    for (int i = job->first; i <= job->last; ++i) {
        job->sum += i;
    }
    return nullptr;
}

int main() {
    Job jobs[2] = {{1, 500, 0}, {501, 1000, 0}};
    pthread_t tids[2];
    for (int i = 0; i < 2; ++i) {
        int rc = pthread_create(&tids[i], nullptr, sumRange, &jobs[i]);
        if (rc != 0) {
            std::cerr << "pthread_create: " << std::strerror(rc) << '\\n';
            return 1;
        }
    }
    for (pthread_t t : tids) {
        pthread_join(t, nullptr);
    }
    std::cout << "sum = " << jobs[0].sum + jobs[1].sum << '\\n';
}`,
          output: 'sum = 500500',
          annotations: [
            { lines: 11, text: 'The start routine must have exactly this C signature: one `void*` in, one `void*` out. Arguments travel through the pointer, so you pack them into a struct.' },
            { lines: 23, text: '`nullptr` attributes means the defaults (joinable, default stack size). A `pthread_attr_t` can set the stack size, the scheduling policy and priority, or create the thread detached.' },
            { lines: '24-27', text: 'pthreads functions **return** an error number instead of setting `errno`. `EAGAIN` here means a limit was reached (too many threads, or no memory for another stack).' },
            { lines: 30, text: '`pthread_join` waits for the thread to exit and frees its resources. A thread that is never joined or detached leaks its stack and ID, like a zombie process.' },
          ],
        },
        {
          type: 'table',
          headers: ['Task', 'POSIX', 'C++', 'Win32'],
          rows: [
            ['Create', '`pthread_create`', '`std::thread`, `std::jthread`', '`CreateThread` / `_beginthreadex`'],
            ['Wait for exit', '`pthread_join`', '`join()` (automatic in `jthread`)', '`WaitForSingleObject(h, INFINITE)`'],
            ['Let it run unattended', '`pthread_detach`', '`detach()`', '`CloseHandle(h)`'],
            ['Own ID', '`pthread_self`, `gettid`', '`std::this_thread::get_id()`', '`GetCurrentThreadId`'],
            ['Stack size', '`pthread_attr_setstacksize`', '(none)', '`dwStackSize` argument'],
            ['Name for debuggers', '`pthread_setname_np` (15 chars)', '(none)', '`SetThreadDescription`'],
            ['Priority, affinity', '`pthread_setschedparam`, `pthread_setaffinity_np`', '(none)', '`SetThreadPriority`, `SetThreadAffinityMask`'],
          ],
        },
        {
          type: 'p',
          text: 'Standard C++ deliberately covers only what every platform can do. For the rest, `native_handle()` gives you the underlying `pthread_t` or Windows `HANDLE`, so you can name a thread so it shows up in debuggers, profilers and crash dumps:',
        },
        {
          type: 'code',
          code: `std::jthread render{renderLoop};
#if defined(_WIN32)
SetThreadDescription(render.native_handle(), L"Render");
#else
pthread_setname_np(render.native_handle(), "render");
#endif`,
          annotations: [
            { lines: 3, text: '`SetThreadDescription` (Windows 10 version 1607 and later) takes a wide string with no practical length limit. Visual Studio, PIX and crash dumps show it.' },
            { lines: 5, text: 'Linux limits names to 15 characters plus the terminator, and `ps -L`, `top -H` and `gdb` show them.' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'fill',
      prompt: 'Complete the POSIX code that starts a loader thread and waits for it to finish.',
      template: `void* loadLevel(void* arg);

pthread_t loader;
int rc = ___(&loader, nullptr, loadLevel, &request);
if (rc != 0) {
    std::cerr << std::strerror(rc) << '\\n';
}
// ... do other work ...
___(loader, nullptr);`,
      blanks: [{ answers: ['pthread_create'] }, { answers: ['pthread_join'] }],
      wordBank: ['pthread_create', 'pthread_join', 'pthread_detach', 'fork', 'waitpid', 'clone'],
      explanation:
        '`pthread_create(&id, attr, start, arg)` starts `start(arg)` on a new thread and stores its ID; `pthread_join(id, &result)` waits for it to exit and collects the `void*` it returned. `pthread_detach` is the opposite choice (never join; free resources automatically at exit), and `fork`/`waitpid` are the *process* equivalents. Note that the error check uses the return value: pthreads functions do not set `errno`.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'What a new thread costs',
      blocks: [
        {
          type: 'p',
          text: 'Creating a thread is much cheaper than creating a process, but it is not free. Here is what the work above adds up to:',
        },
        {
          type: 'list',
          items: [
            '**A user stack.** glibc reserves 8 MiB of address space by default (the `ulimit -s` value at program start) plus a guard page. Only pages the thread actually touches use physical memory, so the reservation is cheap, but it is not free: the `mmap` and `mprotect` calls, and later the page faults for each touched page.',
            '**A kernel stack and control block.** Each thread gets its own kernel stack (16 KiB on x86-64 Linux) for running system calls and interrupts, plus its `task_struct`.',
            '**A TLS block** with every `thread_local` variable in the program, initialized for the new thread.',
            '**The system call itself** and scheduler bookkeeping, then the same again in reverse when the thread exits and is joined.',
          ],
        },
        {
          type: 'p',
          text: 'Measured on the course\'s Linux test machine (`-O2`, 2,000 iterations each, averaged), creating and joining an empty thread took about **12 µs**. Doing the same with a process, `fork` then `waitpid`, took about **106 µs**, and that process was tiny; `fork` gets slower as the parent\'s page tables grow. A plain function call takes well under a nanosecond.',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Real output of a timing program (times vary by machine and run)',
          code: `thread create+join: 11.9929 us
fork+waitpid:       106.738 us`,
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why engines create their threads once',
          text: 'Twelve microseconds sounds small, but a game frame at 60 Hz is 16,667 µs, and an engine may run hundreds of small tasks per frame. Creating a thread per task would spend more time in thread creation than in the tasks. So engines create about one worker per core at startup and feed them work through queues: a [[thread-pool]]. The next unit builds one.',
        },
        {
          type: 'p',
          text: 'Stack sizes differ by platform, and the default is a reservation, not a guarantee. On Windows the default reservation is **1 MiB**, set in the executable header by the linker\'s `/STACK` option. Deep recursion that is fine on the main thread can overflow a worker\'s smaller stack, and standard C++ has no way to ask for a bigger one; use `pthread_attr_setstacksize` or the `dwStackSize` argument of `CreateThread` when you need to.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Address space is a budget too',
          text: 'On 64-bit systems, 8 MiB per thread is a drop in a 128 TiB ocean. On 32-bit targets, with 2 to 3 GiB of user address space, a few hundred threads with 8 MiB stacks could exhaust the address space even though they used little physical memory. That is one reason old servers with thread-per-connection designs hit limits well below the number of connections they needed.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'numeric',
      prompt: 'A tool spawns **64** worker threads on Linux, each with glibc\'s default 8 MiB stack. Ignoring guard pages, how many MiB of virtual address space do their stacks reserve?',
      answer: 512,
      unit: 'MiB',
      hint: 'The reservation is per thread, whether or not the stack is used.',
      explanation:
        '64 × 8 MiB = **512 MiB** of address space. Physical memory is a different number: a worker that never goes deeper than a few kilobytes of stack touches only a page or two, and only touched pages get physical frames, so the resident cost might be well under 1 MiB in total. This is why virtual size (`VSZ` in `ps`) looks alarming for heavily threaded programs while resident size (`RSS`) does not.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'thread_local, and how TLS works',
      blocks: [
        {
          type: 'p',
          text: 'A `thread_local` variable has one instance per thread. It is created when the thread starts (or, for a block-scope `thread_local` like the one below, on first use in that thread) and destroyed when the thread exits. It is perfect for per-thread caches, scratch buffers, random number generators and statistics, anything you want to avoid locking.',
        },
        {
          type: 'code',
          runnable: true,
          title: 'tls_scratch.cpp',
          code: `#include <iostream>
#include <thread>
#include <vector>

struct Scratch {
    explicit Scratch(int id) : owner{id} {
        std::cout << "  scratch built for thread " << owner << '\\n';
    }
    ~Scratch() {
        std::cout << "  scratch freed for thread " << owner << '\\n';
    }
    int owner;
    std::vector<int> buffer;
};

Scratch& scratchFor(int id) {
    thread_local Scratch s{id};   // one per thread, built on first use
    return s;
}

void pathfind(int id, int requests) {
    for (int r = 0; r < requests; ++r) {
        Scratch& s = scratchFor(id);
        s.buffer.push_back(r);      // no lock: nobody else sees it
    }
    std::cout << "  thread " << id << " used "
              << scratchFor(id).buffer.size() << " slots\\n";
}

int main() {
    for (int id = 1; id <= 2; ++id) {
        std::cout << "start thread " << id << '\\n';
        std::jthread t{pathfind, id, id * 3};
    }                                 // joined here, TLS destroyed
    std::cout << "main done\\n";
}`,
          output: 'start thread 1\n  scratch built for thread 1\n  thread 1 used 3 slots\n  scratch freed for thread 1\nstart thread 2\n  scratch built for thread 2\n  thread 2 used 6 slots\n  scratch freed for thread 2\nmain done',
          annotations: [
            { lines: 17, text: 'A block-scope `thread_local` is initialized the first time **each thread** reaches this line, so the `id` argument from that thread\'s first call is used.' },
            { lines: 24, text: 'Each thread pushes into its own vector, so there is no data race and no lock.' },
            { lines: '31-34', text: 'Each `jthread` is destroyed at the end of its loop iteration, which joins it. The threads therefore run one after the other here, which keeps the output order fixed.' },
            { lines: 9, text: 'The destructor runs **on the exiting thread**, as part of thread exit, before `join` returns.' },
          ],
        },
        {
          type: 'p',
          text: 'How does one name refer to a different object in each thread? On x86-64 Linux, each thread\'s TLS block sits at a fixed offset from an address held in the **`fs` segment register**, and the kernel loads that thread\'s value into `fs` on every switch (that is what `CLONE_SETTLS` set up). Compare the code GCC generates for a `thread_local int` and a global `int`:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'objdump -d -M intel (g++ -O2), real output',
          code: `<bumpTls()>:
    mov    eax,DWORD PTR fs:0xfffffffffffffffc
    add    eax,0x1
    mov    DWORD PTR fs:0xfffffffffffffffc,eax
<bumpGlobal()>:
    mov    eax,DWORD PTR [rip+0x2e9a]   # <global_hits>
    add    eax,0x1
    mov    DWORD PTR [rip+0x2e91],eax   # <global_hits>`,
          annotations: [
            { lines: '2-4', text: 'TLS: the address is "4 bytes below wherever `fs` points". Same instruction count as a global, just a segment prefix.' },
            { lines: '6-8', text: 'A global: one fixed address relative to the instruction pointer, the same for every thread.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Windows, and the slow path',
          text: 'On x64 Windows the `gs` register points at each thread\'s **Thread Environment Block** (TEB), which holds a pointer to its TLS array; `thread_local` (or the older `__declspec(thread)`) and the `TlsAlloc`/`TlsGetValue` API both use it. On both systems, a `thread_local` defined in a dynamically loaded library (`.so`/`.dll`) may need a function call such as `__tls_get_addr` on first access, and a `thread_local` with a non-trivial constructor adds an "already initialized?" check. In a hot loop, copy it to a local.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: '`errno` is thread-local',
          text: 'In single-threaded C, `errno` was a global. With threads that would be a disaster: a failing call on one thread would overwrite the error another thread was about to read. POSIX therefore requires `errno` to be thread-local; glibc defines it as a macro that reads the calling thread\'s copy.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'bug',
      prompt: 'The HUD thread and the leaderboard thread both call `formatScore`, and players occasionally see one player\'s score next to another player\'s name. Tap the line that causes it.',
      code: `#include <cstdio>

const char* formatScore(int score) {
    static char buf[16];
    std::snprintf(buf, sizeof buf, "%07d", score);
    return buf;
}

void drawHud(int score) {
    drawText(formatScore(score));
}

void uploadLeaderboard(int score) {
    sendScore(formatScore(score));
}`,
      bugLines: [4],
      hint: 'How many copies of `buf` exist?',
      explanation:
        'A `static` local has **one** instance for the whole program, so both threads format into the same 16 bytes. One thread can overwrite the buffer while the other is still reading it: a data race, which is undefined behavior and here shows up as mixed-up scores. Old C functions such as `strtok`, `ctime` and `localtime` have exactly this flaw, which is why `strtok_r` and `localtime_r` exist. The quickest fix is `thread_local char buf[16];`, which gives each thread its own buffer. Returning a `std::string` by value is cleaner still: then no buffer is shared at all, and the pointer cannot be invalidated by the next call on the same thread either.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Threads and the rest of the process',
      blocks: [
        {
          type: 'p',
          text: 'Most process-level operations were designed before threads existed, and they act on the **whole process**. Each of these surprises people the first time:',
        },
        {
          type: 'list',
          items: [
            '**`exit()` from any thread ends every thread.** So does returning from `main`. Other threads are not unwound: their destructors do not run, and a thread in the middle of writing a save file stops mid-write. Join or stop your threads before leaving `main`; `std::jthread` makes that automatic.',
            '**A crash in any thread kills the process.** A segmentation fault in a worker thread is delivered as `SIGSEGV` to the process, and the default action terminates all threads. The crash dump then contains every thread\'s stack, which is why naming threads pays off when you read one.',
            '**Signals go to the process, and any one thread that has not blocked the signal may run the handler.** Programs that care usually block signals in every thread except one dedicated signal-handling thread.',
            '**`fork()` copies only the calling thread.** The child gets a copy of the whole address space, including every mutex, but only one thread. A mutex that another thread held at that instant is copied in the locked state, and its owner does not exist in the child, so it will never be unlocked.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'fork in a multithreaded program',
          text: 'Between `fork` and `exec`, the child of a multithreaded program may only call **async-signal-safe** functions (the list in `man 7 signal-safety`: `write`, `dup2`, `close`, `execve`, `_exit` and similar). `malloc`, `printf` and anything that takes a lock may deadlock, because another thread might have held that lock when `fork` happened. To start another program, call `exec` immediately or use `posix_spawn`. Windows has no `fork` at all; `CreateProcess` builds a new process from scratch, which sidesteps the problem.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Threads arrived late',
          text: 'Unix processes had a single thread for almost two decades. POSIX threads were standardized in 1995 (POSIX.1c), Linux got its current 1:1 implementation, NPTL, in 2003 with kernel 2.6, and C++ only gained `std::thread` in C++11. `fork`, signals and `errno` all predate threads, which is why their thread rules feel bolted on: they were.',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'bug',
      prompt: 'A tool keeps a logging thread running and sometimes launches a converter program. Occasionally the child process hangs forever before the converter starts. Tap the line that causes it.',
      code: `std::mutex logMutex;

void log(const std::string& msg) {
    std::lock_guard lock{logMutex};
    std::cerr << msg << '\\n';
}

void launchConverter(const char* path) {
    pid_t pid = fork();
    if (pid == 0) {
        log("child: starting converter");
        execlp("texconv", "texconv", path, nullptr);
        _exit(127);
    }
    waitpid(pid, nullptr, 0);
}`,
      bugLines: [11],
      hint: 'What if the logging thread held `logMutex` at the moment of `fork`?',
      explanation:
        'The child contains only the thread that called `fork`. If the logging thread was inside `log` at that instant, the child\'s copy of `logMutex` is locked and its owner does not exist in the child, so `log` on line 11 waits forever. Even `std::cerr` and `malloc` take internal locks that can be stuck the same way. Between `fork` and `exec` call only async-signal-safe functions: remove the log call (or log from the parent), keep `execlp` and `_exit`, or use `posix_spawn`, which does the fork-and-exec safely in one call.',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'concept',
      title: 'Engine threads and the OS',
      blocks: [
        {
          type: 'p',
          text: 'A typical PC or console engine runs a handful of long-lived, named threads plus a pool of workers, roughly one per remaining core:',
        },
        {
          type: 'table',
          headers: ['Thread', 'Job', 'What it needs from the OS'],
          rows: [
            ['Game ([[game-thread|main]])', 'Input, gameplay, simulation, building the frame', 'Steady scheduling; never blocked on I/O'],
            ['Render (and in Unreal, RHI)', 'Turn the frame into GPU commands, one frame behind the game thread', 'Its own core most of the time'],
            ['Audio', 'Mix voices into a buffer every few milliseconds', 'High priority and low latency; must never wait on a lock the game thread holds'],
            ['Streaming / I/O', 'Load and decompress assets', 'Allowed to block in `read`, so kept off the workers'],
            ['Workers', 'Run jobs: animation, physics, culling, particles', 'One per spare core, rarely blocking'],
          ],
        },
        {
          type: 'p',
          text: 'The OS decides where and when each thread runs, but you can give it hints. **Priority** says who should run first when there are more ready threads than cores. **Affinity** restricts which cores a thread may run on ([[cpu-affinity]]). Consoles give a game a fixed set of cores, so engines there pin one worker per core. On PC, other programs share the machine, and hard pinning can leave a thread waiting for a busy core while another sits idle; most engines leave PC affinity alone or only set soft preferences.',
        },
        {
          type: 'code',
          title: 'Windows (not runnable here: Win32 API)',
          code: `HANDLE audio = audioThread.native_handle();
SetThreadPriority(audio, THREAD_PRIORITY_HIGHEST);

// Or let the Multimedia Class Scheduler Service manage it:
DWORD taskIndex = 0;
HANDLE mmcss = AvSetMmThreadCharacteristicsW(L"Pro Audio",
                                             &taskIndex);

// Console-style pinning: worker i on core i (use sparingly on PC)
SetThreadAffinityMask(workers[i].native_handle(),
                      DWORD_PTR{1} << i);`,
          annotations: [
            { lines: 2, text: 'Thread priorities are relative to the process\'s priority class. Raising a thread that does a lot of work can starve others, including your own render thread.' },
            { lines: '5-7', text: 'MMCSS, from `avrt.dll` (link `Avrt.lib`), boosts registered audio and game threads in a controlled way. Undo it with `AvRevertMmThreadCharacteristics` before the thread exits.' },
            { lines: '10-11', text: 'An affinity mask has one bit per logical processor. `std::jthread::native_handle()` returns the Windows `HANDLE` with Microsoft\'s library.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal',
          text: 'Unreal creates these threads for you (`FRunnableThread::Create` with an `EThreadPriority`), names them, and sizes its task-graph worker pool from the core count. In Unreal Insights or a crash dump you will see `GameThread`, `RenderThread`, `RHIThread`, `AudioMixerRenderThread` and numbered `Foreground Worker` and `Background Worker` threads.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Embedded and military systems',
          text: 'In a real-time OS such as VxWorks or an ARINC 653 avionics partition, threads (often called tasks) usually have fixed priorities assigned at design time, and the scheduler always runs the highest-priority ready task. That determinism is the point: you can prove a control loop meets its deadline. It also creates the priority-inversion hazard that the next unit\'s Mars Pathfinder story is about.',
        },
      ],
    },
    // ------------------------------------------------------------------ 17
    {
      kind: 'order',
      prompt: 'Put in order what happens when you construct a `std::thread` on Linux with glibc.',
      lines: [
        'libstdc++ copies the callable and its arguments into a heap-allocated state object',
        'glibc\'s `pthread_create` maps a stack with a guard page and sets up a TLS block',
        'glibc calls `clone3` with `CLONE_VM | CLONE_THREAD | CLONE_SETTLS` and the other sharing flags',
        'The kernel creates a task that shares the address space and puts it on a run queue',
        'When scheduled, the new thread starts in a glibc start routine that calls your function',
      ],
      linesAreCode: false,
      explanation:
        'Each step needs the previous one. The arguments are copied first, which is why `std::thread` copies by default and you need `std::ref` to share. The stack and TLS block must exist before `clone3`, because the system call takes their addresses. The kernel creates the task, but it runs only when the scheduler picks it, so the constructor may return before your function has started. That is the race behind the classic bug of passing a pointer to a local that goes out of scope before the thread reads it.',
    },
  ],
  takeaways: [
    'A process is a container (address space, descriptors, IDs); a thread is an execution state (registers, stack, TLS) inside it. The OS schedules threads.',
    'Threads share the heap, globals, code and descriptors for free, which is their power and their danger: shared, written data needs synchronization.',
    'On Linux a thread is a task created by `clone` with sharing flags: same PID (thread group), own TID, own stack with a guard page, own TLS through `fs`.',
    'Mainstream OSes use 1:1 threading. Fibers are cooperative user-level contexts; they switch without the kernel but block their whole thread on a blocking system call.',
    'Creating a thread costs microseconds and a stack reservation (8 MiB on glibc, 1 MiB on Windows by default), so engines create threads once and reuse them.',
    '`thread_local` gives each thread its own instance, created on first use (block scope) or thread start and destroyed at thread exit; `errno` works this way.',
    '`exit`, crashes and signals act on the whole process, and `fork` copies only the calling thread: call only async-signal-safe functions before `exec`.',
  ],
  reading: [
    {
      title: 'Operating Systems: Three Easy Pieces, "Concurrency: An Introduction" and "Interlude: Thread API"',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/',
      source: 'book',
      note: 'The free textbook this course follows; these two short chapters cover threads and the pthreads API.',
    },
    {
      title: 'pthreads(7) — Linux manual page',
      url: 'https://man7.org/linux/man-pages/man7/pthreads.7.html',
      source: 'other',
      note: 'Exactly which attributes are per process and which are per thread, and the history of LinuxThreads versus NPTL.',
    },
    {
      title: 'clone(2) — Linux manual page',
      url: 'https://man7.org/linux/man-pages/man2/clone.2.html',
      source: 'other',
      note: 'Every sharing flag, including `CLONE_THREAD` and `CLONE_SETTLS`, explained.',
    },
    {
      title: 'Processes and Threads (Win32)',
      url: 'https://learn.microsoft.com/en-us/windows/win32/procthread/processes-and-threads',
      source: 'other',
      note: 'Microsoft\'s overview of processes, threads, fibers, thread pools, priorities and affinity on Windows.',
    },
    {
      title: 'Concurrency support library',
      url: 'https://en.cppreference.com/w/cpp/thread',
      source: 'cppreference',
      note: 'The standard C++ thread API, including `std::jthread` and `native_handle`.',
    },
  ],
};
