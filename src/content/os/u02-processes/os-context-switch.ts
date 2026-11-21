import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: "os-context-switch",
  title: "Limited Direct Execution and Context Switches",
  summary: "How the OS runs your code at full speed yet keeps control: limited direct execution, the timer interrupt and preemption, what a context switch saves and restores, what it costs, and user-level threads and fibers.",
  minutes: 20,
  objectives: [
    "Explain limited direct execution and the two problems it solves: restricted operations and regaining the CPU",
    "Compare cooperative and preemptive multitasking and explain the role of the timer interrupt",
    "List what a context switch saves and restores, in order, and where each piece of state is kept",
    "Estimate the direct and indirect costs of context switches and explain why thread switches are cheaper than process switches",
    "Describe user-level threads and fibers, and why game engines use them for job systems",
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: "Run directly, but keep control",
      blocks: [
        {
          type: 'p',
          text: "The fastest way to run your game is to let it run: load its code, point the CPU at `main`, and get out of the way. No interpreter, no checks per instruction. That is **direct execution**, and it is what every OS does. But a CPU running your code is, by definition, not running the kernel. Two problems follow:",
        },
        {
          type: 'list',
          ordered: true,
          items: [
            "**Restricted operations.** How does the program do I/O or allocate memory without being allowed to touch the hardware? You know this answer from unit 1: user mode plus traps. The program asks; the kernel checks and acts.",
            "**Switching between processes.** If your code owns the CPU, how does the kernel ever get it back, to run someone else or to stop a runaway loop?",
          ],
        },
        {
          type: 'p',
          text: "OSTEP calls the solution [[limited-direct-execution]]: programs run directly on the hardware, but within limits the hardware enforces, and the kernel arranges to be woken up regularly. This lesson is about problem 2.",
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why not just interpret or check every instruction?",
          text: "Emulators do exactly that, and they run guest code many times slower than native. A game loses most of its frame budget that way. Hardware-enforced limits (privilege levels, page protections, the timer) cost nothing while your code runs normally and only cost something at the rare moments the kernel takes over. Paying only for the exceptions is the core idea behind almost every fast OS mechanism.",
        },
        {
          type: 'table',
          headers: ["Phase", "Kernel (kernel mode)", "Hardware", "Program (user mode)"],
          rows: [
            ["Boot", "install trap table; start the interval timer", "remember handler addresses; tick the timer", "(not started yet)"],
            ["Run", "create process, set up its kernel stack, return-from-trap into it", "restore registers, switch to user mode, jump to `main`", "runs `main` directly on the CPU"],
            ["Every few ms", "handler decides: keep running, or switch", "timer interrupt: save registers, enter kernel mode", "(interrupted, unaware)"],
          ],
          caption: "Limited direct execution, after OSTEP chapter 6. The kernel's control rests on two things it set up at boot: the trap table and the timer.",
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: "Cooperative versus preemptive multitasking",
      blocks: [
        {
          type: 'p',
          text: "One way to get the CPU back is to wait for it. In **cooperative** multitasking the kernel only runs when a program enters it, through a system call or an explicit \"yield\". Well-behaved programs yield often. Windows 3.x and the classic Mac OS (up to Mac OS 9) worked this way, and a single program stuck in `while (true) {}` froze the entire machine: the only cure was the reset button.",
        },
        {
          type: 'p',
          text: "**Preemptive** multitasking does not trust programs. At boot the kernel programs a hardware timer to raise an interrupt periodically. Whatever is running, the interrupt drags the CPU into the kernel's timer handler, which can then decide to [[preemption|preempt]] the current thread: stop it and run another. A program cannot disable the timer, because that requires a privileged instruction.",
        },
        {
          type: 'code',
          title: "a runaway loop (fragment)",
          code: `void waitForAssets() {
    while (!g_assetsReady) {
        // spin: no system call, no yield
    }
}`,
          annotations: [
            { lines: '2-4', text: "Under cooperative multitasking this loop never gives the CPU back, so the loader that would set `g_assetsReady` never runs: a permanent hang. Under preemption the timer interrupt still takes the CPU away every few milliseconds, so other threads progress (although this loop still wastes a whole core)." },
          ],
        },
        {
          type: 'p',
          text: "How often does the timer fire? Linux kernels are typically built with a tick of 250 or 1000 Hz and stop the tick on idle cores. Windows' default timer interval is 15.625 ms (64 Hz); a program can request a finer one with `timeBeginPeriod`, which matters for `Sleep` precision and frame pacing (see [[timer-resolution]] in the scheduling unit). The tick is only the *chance* to switch: how long a thread may run, its [[time-slice]], is the scheduler's policy.",
        },
        {
          type: 'callout',
          variant: 'history',
          title: "Cooperation survives inside your process",
          text: "Cooperative scheduling did not disappear; it moved into user space. Fibers, coroutines and job systems switch between tasks only at points the code chooses, which makes switches cheap and predictable. The danger is the same as in Windows 3.1: one task that never yields stalls everything scheduled on that thread. The end of this lesson comes back to it.",
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: "A bug puts one of your game's threads into an infinite loop that makes no system calls. On a modern preemptive OS, what lets the other threads and processes keep running?",
      options: [
        { text: "The compiler inserts yield points into every loop", why: "Compilers do no such thing for native code. Some managed runtimes insert safepoints, but those serve the garbage collector, not the OS." },
        { text: "The periodic timer interrupt forces the CPU into the kernel, whose scheduler can switch to another thread", correct: true, why: "The timer is the one event a user program cannot prevent or ignore. It guarantees the kernel regains control at least once per tick." },
        { text: "The loop eventually triggers a page fault, which hands control to the kernel", why: "A tight loop over the same few pages never faults. Faults are not a reliable way to regain control." },
        { text: "The other threads run on other cores, so the kernel never needs to interrupt the loop", why: "Other cores help only if there are enough of them. With more runnable threads than cores, and on a single core, preemption is what saves the system." },
      ],
      explanation: "Preemption rests on hardware: a timer interrupt the kernel set up while it was privileged and that user code cannot turn off. The same mechanism lets a debugger or Task Manager kill a hung game. The loop is still a bug, though: it burns a core and its time slice on nothing, which hurts the threads that do real work.",
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: "What a context switch saves and restores",
      blocks: [
        {
          type: 'p',
          text: "A [[context-switch]] is the act of stopping one thread on a CPU and resuming another. The thread being stopped must later continue *exactly* where it was, so everything the CPU holds for it has to be saved somewhere first. Step through a switch on a toy CPU with three registers:",
        },
        {
  "type": "algo",
  "view": "array",
  "code": "user code runs on the CPU\ntimer interrupt (hardware):\n  kernel mode; sp = kstack\n  push user pc, sp\nentry code: push other regs\nhandler: slice used up?\n  schedule(): pick next\nswitch_to: save sp, load B's sp\nreturn-from-trap: pop regs\niretq: pop pc, sp; user mode",
  "lang": "text",
  "interval": 1900,
  "frames": [
    {
      "note": "`A` runs in user mode. Its registers live in the CPU: `pc` = A:10, `ax` = 5. `B` is not running; its registers were saved the last time it stopped.",
      "array": [
        "usr",
        "A:10",
        "uA",
        "5",
        "·",
        "·",
        "·",
        "B:20",
        "uB",
        "100"
      ],
      "marks": [
        {
          "index": 0,
          "color": "orange"
        },
        {
          "index": 1,
          "color": "orange"
        },
        {
          "index": 2,
          "color": "orange"
        },
        {
          "index": 3,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "CPU"
        },
        {
          "index": 5,
          "label": "A saved",
          "color": "blue"
        },
        {
          "index": 8,
          "label": "B saved",
          "color": "purple"
        }
      ],
      "lines": [
        1
      ],
      "vars": [
        [
          "running",
          "A"
        ]
      ]
    },
    {
      "note": "`A` executes one instruction (`ax += 1`). Nothing in the kernel is involved: this is direct execution.",
      "array": [
        "usr",
        "A:11",
        "uA",
        "6",
        "·",
        "·",
        "·",
        "B:20",
        "uB",
        "100"
      ],
      "marks": [
        {
          "index": 1,
          "color": "orange"
        },
        {
          "index": 3,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "CPU"
        },
        {
          "index": 5,
          "label": "A saved",
          "color": "blue"
        },
        {
          "index": 8,
          "label": "B saved",
          "color": "purple"
        }
      ],
      "lines": [
        1
      ],
      "vars": [
        [
          "running",
          "A"
        ]
      ]
    },
    {
      "note": "**Timer interrupt.** The *hardware* switches to kernel mode, moves to A's kernel stack (`kA`), and saves A's user `pc` and `sp` there.",
      "array": [
        "krn",
        "irq",
        "kA",
        "6",
        "A:11",
        "uA",
        "·",
        "B:20",
        "uB",
        "100"
      ],
      "marks": [
        {
          "index": 0,
          "color": "red"
        },
        {
          "index": 1,
          "color": "red"
        },
        {
          "index": 2,
          "color": "red"
        },
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "CPU"
        },
        {
          "index": 5,
          "label": "A saved",
          "color": "blue"
        },
        {
          "index": 8,
          "label": "B saved",
          "color": "purple"
        }
      ],
      "lines": [
        2,
        3,
        4
      ],
      "vars": [
        [
          "running",
          "A"
        ]
      ]
    },
    {
      "note": "The kernel's entry code (*software*) pushes the remaining registers, here `ax` = 6. A's user state is now completely saved.",
      "array": [
        "krn",
        "irq",
        "kA",
        "6",
        "A:11",
        "uA",
        "6",
        "B:20",
        "uB",
        "100"
      ],
      "marks": [
        {
          "index": 6,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "CPU"
        },
        {
          "index": 5,
          "label": "A saved",
          "color": "blue"
        },
        {
          "index": 8,
          "label": "B saved",
          "color": "purple"
        }
      ],
      "lines": [
        5
      ],
      "vars": [
        [
          "running",
          "A"
        ]
      ]
    },
    {
      "note": "The interrupt handler sees A's time slice is used up and calls the scheduler, which picks `B`.",
      "array": [
        "krn",
        "irq",
        "kA",
        "6",
        "A:11",
        "uA",
        "6",
        "B:20",
        "uB",
        "100"
      ],
      "marks": [
        {
          "index": 1,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "CPU"
        },
        {
          "index": 5,
          "label": "A saved",
          "color": "blue"
        },
        {
          "index": 8,
          "label": "B saved",
          "color": "purple"
        }
      ],
      "lines": [
        6,
        7
      ],
      "vars": [
        [
          "running",
          "A"
        ],
        [
          "decision",
          "switch A → B"
        ]
      ]
    },
    {
      "note": "`switch_to`: save A's kernel stack pointer in A's PCB, load B's. One register changes, and the CPU is now \"inside\" B's earlier interrupt.",
      "array": [
        "krn",
        "irq",
        "kB",
        "6",
        "A:11",
        "uA",
        "6",
        "B:20",
        "uB",
        "100"
      ],
      "marks": [
        {
          "index": 2,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "CPU"
        },
        {
          "index": 5,
          "label": "A saved",
          "color": "blue"
        },
        {
          "index": 8,
          "label": "B saved",
          "color": "purple"
        }
      ],
      "lines": [
        8
      ],
      "vars": [
        [
          "running",
          "B"
        ]
      ]
    },
    {
      "note": "Return-from-trap path on B's kernel stack: pop B's saved registers. `ax` becomes 100 again.",
      "array": [
        "krn",
        "irq",
        "kB",
        "100",
        "A:11",
        "uA",
        "6",
        "B:20",
        "uB",
        "100"
      ],
      "marks": [
        {
          "index": 3,
          "color": "green"
        },
        {
          "index": 9,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "CPU"
        },
        {
          "index": 5,
          "label": "A saved",
          "color": "blue"
        },
        {
          "index": 8,
          "label": "B saved",
          "color": "purple"
        }
      ],
      "lines": [
        9
      ],
      "vars": [
        [
          "running",
          "B"
        ]
      ]
    },
    {
      "note": "`iretq` restores B's `pc` and `sp` and drops to user mode. `B` continues exactly where it was stopped.",
      "array": [
        "usr",
        "B:20",
        "uB",
        "100",
        "A:11",
        "uA",
        "6",
        "·",
        "·",
        "·"
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
      "pointers": [
        {
          "index": 1,
          "label": "CPU"
        },
        {
          "index": 5,
          "label": "A saved",
          "color": "blue"
        },
        {
          "index": 8,
          "label": "B saved",
          "color": "purple"
        }
      ],
      "lines": [
        10
      ],
      "vars": [
        [
          "running",
          "B"
        ]
      ]
    },
    {
      "note": "`B` runs (`ax *= 2`). From B's point of view, nothing happened while it was away.",
      "array": [
        "usr",
        "B:21",
        "uB",
        "200",
        "A:11",
        "uA",
        "6",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 1,
          "color": "orange"
        },
        {
          "index": 3,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "CPU"
        },
        {
          "index": 5,
          "label": "A saved",
          "color": "blue"
        },
        {
          "index": 8,
          "label": "B saved",
          "color": "purple"
        }
      ],
      "lines": [
        1
      ],
      "vars": [
        [
          "running",
          "B"
        ]
      ]
    },
    {
      "note": "Next timer interrupt: the same dance in reverse. B's `pc`, `sp` and `ax` are saved on B's kernel stack.",
      "array": [
        "krn",
        "irq",
        "kB",
        "200",
        "A:11",
        "uA",
        "6",
        "B:21",
        "uB",
        "200"
      ],
      "marks": [
        {
          "index": 0,
          "color": "red"
        },
        {
          "index": 7,
          "color": "purple"
        },
        {
          "index": 8,
          "color": "purple"
        },
        {
          "index": 9,
          "color": "purple"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "CPU"
        },
        {
          "index": 5,
          "label": "A saved",
          "color": "blue"
        },
        {
          "index": 8,
          "label": "B saved",
          "color": "purple"
        }
      ],
      "lines": [
        2,
        3,
        4,
        5
      ],
      "vars": [
        [
          "running",
          "B"
        ]
      ]
    },
    {
      "note": "Switch to A's kernel stack, pop A's registers, return to user mode: `A` resumes at A:11 with `ax` = 6, as if never interrupted.",
      "array": [
        "usr",
        "A:11",
        "uA",
        "6",
        "·",
        "·",
        "·",
        "B:21",
        "uB",
        "200"
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
        },
        {
          "index": 3,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "CPU"
        },
        {
          "index": 5,
          "label": "A saved",
          "color": "blue"
        },
        {
          "index": 8,
          "label": "B saved",
          "color": "purple"
        }
      ],
      "lines": [
        8,
        9,
        10
      ],
      "vars": [
        [
          "running",
          "A"
        ]
      ]
    }
  ],
  "caption": "A toy CPU with three registers. Cells 0–3 are the CPU (mode `usr`/`krn`, pc, sp, ax); 4–6 and 7–9 are the user registers saved for A and B. `kA`/`kB` are kernel stacks, `uA`/`uB` user stacks."
},
        {
          type: 'p',
          text: "Notice the **two different saves**, a detail OSTEP stresses:",
        },
        {
          type: 'list',
          items: [
            "**User registers** are saved when the timer interrupt arrives: partly by the hardware (instruction pointer, stack pointer, flags) and the rest by the kernel's entry code, all onto the interrupted thread's [[kernel-stack]]. This happens on *every* interrupt or system call, switch or not.",
            "**Kernel registers** are saved by the switch routine itself (Linux: `__switch_to_asm`): the callee-saved registers and the kernel stack pointer of the old thread go into its PCB, and the new thread's are loaded. Changing the kernel stack pointer is the moment the switch really happens.",
          ],
        },
        {
          type: 'table',
          headers: ["State", "Saved where", "When"],
          rows: [
            ["User instruction pointer, stack pointer, flags", "old thread's kernel stack", "by the CPU on the interrupt"],
            ["Other general-purpose registers", "old thread's kernel stack", "by the kernel entry code"],
            ["Kernel stack pointer, callee-saved kernel registers", "old thread's PCB (`task_struct`)", "by the switch routine"],
            ["FPU/SSE/AVX registers (over 2 KB with AVX-512)", "per-thread save area (`XSAVE`)", "on switch; Linux defers the reload until the thread returns to user mode"],
            ["Page-table root (`cr3`)", "the process's memory descriptor", "loaded only if the new thread belongs to a **different process**"],
            ["Thread-local storage base (`fs`)", "PCB", "on switch"],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why the switch routine is written in assembly",
          text: "C++ cannot express \"save my callee-saved registers, swap the stack pointer, and continue on a different stack\". A function that calls `switch_to(A, B)` *returns* in thread B's context, from B's earlier call to `switch_to`. No language-level construct describes a function that returns to a different caller than the one that called it, so every kernel implements this core in a few lines of assembly.",
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'order',
      prompt: "Process A is running in user mode when the timer fires, and the kernel decides to run process B. Put the steps in order (following OSTEP's limited-direct-execution protocol).",
      linesAreCode: false,
      lines: [
        "The timer interrupt fires; the CPU switches to kernel mode and saves A's user registers on A's kernel stack",
        "The CPU jumps to the kernel's timer handler from the trap table",
        "The scheduler picks B, and the switch routine saves A's kernel registers into A's PCB",
        "The switch routine loads B's kernel registers from B's PCB, switching to B's kernel stack (and to B's page tables)",
        "Return-from-trap restores B's user registers from B's kernel stack and switches to user mode",
        "B continues from the instruction where it was last interrupted",
      ],
      distractors: ["A's user registers are copied directly into B's registers"],
      explanation: "The key is the two-level save: hardware and entry code save *user* state on the kernel stack at the interrupt; the switch routine saves and restores *kernel* state through the PCBs. When B's kernel stack is loaded, the return-from-trap path naturally pops B's user registers, saved the last time B was interrupted. A's and B's registers never touch each other directly.",
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: "What a context switch costs",
      blocks: [
        {
          type: 'p',
          text: "The classic way to measure a switch is a ping-pong: two processes pinned to the same CPU pass one byte back and forth through two pipes. Each hand-off forces the sender to block and the receiver to run.",
        },
        {
          type: 'code',
          title: "pingpong.cpp (Linux)",
          runnable: true,
          code: `#include <chrono>
#include <cstdio>
#include <sched.h>
#include <sys/wait.h>
#include <unistd.h>

int main() {
    cpu_set_t one;
    CPU_ZERO(&one);
    CPU_SET(0, &one);
    sched_setaffinity(0, sizeof one, &one);   // both on CPU 0

    int ab[2], ba[2];
    if (pipe(ab) == -1 || pipe(ba) == -1) return 1;
    constexpr int N = 200'000;
    char c = 'x';

    pid_t pid = fork();
    if (pid == 0) {                       // child: echo back
        for (int i = 0; i < N; ++i) {
            if (read(ab[0], &c, 1) != 1) _exit(1);
            if (write(ba[1], &c, 1) != 1) _exit(1);
        }
        _exit(0);
    }
    auto t0 = std::chrono::steady_clock::now();
    for (int i = 0; i < N; ++i) {
        if (write(ab[1], &c, 1) != 1) return 1;
        if (read(ba[0], &c, 1) != 1) return 1;
    }
    auto t1 = std::chrono::steady_clock::now();
    waitpid(pid, nullptr, 0);
    double ns = std::chrono::duration<double, std::nano>(t1 - t0)
                    .count();
    // Each round trip = 2 switches + 4 system calls.
    std::printf("%.2f us per round trip\\n", ns / N / 1000);
    std::printf("~%.2f us per switch (incl. 2 syscalls)\\n",
                ns / N / 2 / 1000);
}`,
          annotations: [
            { lines: '8-11', text: "Pin to one CPU so every hand-off is a real switch. On two cores the processes could each spin on their own core." },
            { lines: 11, text: "Affinity is inherited across `fork`, so the child is pinned too." },
            { lines: '21-22', text: "The child blocks in `read` until the parent writes, then writes back and blocks again." },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: "Two runs on the Linux VM that built this course (yours will differ)",
          code: `2.11 us per round trip
~1.05 us per switch (incl. 2 syscalls)

2.12 us per round trip
~1.06 us per switch (incl. 2 syscalls)`,
        },
        {
          type: 'p',
          text: "About a microsecond of **direct cost** per switch here, including two system calls (about 0.1 µs each, as measured in unit 1). That buys saving and restoring registers, running the scheduler, and switching page tables. The **indirect cost** comes afterwards: the new thread finds caches full of the old thread's data, the branch predictors trained on someone else's code, and possibly an empty [[tlb]]. Refilling them can cost more than the switch itself, especially for threads with large working sets.",
        },
        {
          type: 'callout',
          variant: 'perf',
          title: "Thread switches are cheaper than process switches",
          text: "Threads of the same process share one address space, so switching between them skips the `cr3` reload, and every TLB entry stays valid. Between processes the page tables change. x86 CPUs with PCID (used by Linux since 4.14) can tag TLB entries by address space so that a switch does not flush them all, but the new process's working set still has to be brought back into the caches.",
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'numeric',
      prompt: "A core switches threads every 1 ms. Each switch costs 5 µs in total (direct cost plus the cache and TLB refill afterwards). What percentage of the core's time goes to switching? Give the answer in percent, to two decimal places if needed.",
      answer: 0.5,
      tolerance: 0.01,
      unit: "%",
      hint: "5 µs out of every 1,000 µs.",
      explanation: "5 µs / 1,000 µs = 0.005 = 0.5%. Negligible, which is why preemptive multitasking is affordable. Now shrink the interval: switching every 50 µs (say, a job system that blocks its OS threads on tiny jobs) costs 10% of the core. Switch overhead is a function of *frequency*, so designs that block and wake threads thousands of times per frame pay heavily, while designs that keep threads running and hand them work through queues do not.",
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'truefalse',
      prompt: "Switching between the render thread and the audio thread of the same game requires loading a different page-table root into `cr3`.",
      answer: false,
      explanation: "Both threads live in the same process and therefore the same address space, so the page tables stay the same: the kernel switches registers and stacks only. That is why a thread switch is cheaper than a process switch, and why the TLB entries the render thread built remain valid for the audio thread. Only switching to a thread of a *different* process changes `cr3`.",
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: "Voluntary and involuntary switches",
      blocks: [
        {
          type: 'p',
          text: "A thread leaves the CPU in one of two ways. A **voluntary** switch happens when it blocks: `read` waiting for the disk, `sleep_for`, a contended mutex, `join`. An **involuntary** switch happens when the scheduler preempts it: its time slice ran out, or a higher-priority thread woke up. Linux counts both for every thread:",
        },
        {
          type: 'code',
          title: "switch_counts.cpp (Linux)",
          runnable: true,
          code: `#include <chrono>
#include <fstream>
#include <iostream>
#include <string>
#include <thread>

void printSwitchCounts(const char* label) {
    std::ifstream status{"/proc/self/status"};
    std::cout << label << '\\n';
    for (std::string line; std::getline(status, line);)
        if (line.find("ctxt_switches") != std::string::npos)
            std::cout << "  " << line << '\\n';
}

int main() {
    using namespace std::chrono_literals;
    for (int i = 0; i < 100; ++i)
        std::this_thread::sleep_for(1ms);      // blocks: voluntary
    printSwitchCounts("after 100 sleeps:");

    auto end = std::chrono::steady_clock::now() + 2s;
    volatile unsigned long spin = 0;
    while (std::chrono::steady_clock::now() < end)
        spin = spin + 1;                       // CPU-bound
    printSwitchCounts("after 2 s of spinning:");
}`,
          annotations: [
            { lines: '17-18', text: "Each `sleep_for` blocks the thread in the kernel: one voluntary switch per call." },
            { lines: '22-24', text: "A busy loop never blocks, so it only leaves the CPU when it is preempted." },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: "Real run: three copies at once on a 2-core VM",
          code: `after 100 sleeps:
  voluntary_ctxt_switches:	100
  nonvoluntary_ctxt_switches:	0
after 2 s of spinning:
  voluntary_ctxt_switches:	100
  nonvoluntary_ctxt_switches:	211`,
          annotations: [
            { lines: 6, text: "Three spinning processes competed for two cores, so the scheduler kept preempting them. A single copy run alone on the same VM saw 84 here: preemption only becomes frequent when there is competition." },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: "Frame pacing and sleep",
          text: "A frame limiter that calls `Sleep(1)` makes a voluntary switch and wakes on the next timer tick, which at Windows' default 15.6 ms resolution can overshoot by a whole frame. Engines therefore raise the timer resolution, sleep for most of the remaining time and spin briefly for the rest, or use waitable timers. Too many involuntary switches on the game or render thread, visible in tools like Unreal Insights or PIX as gaps where the thread was not running, mean too many busy threads for the cores available.",
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: "User-level threads and fibers",
      blocks: [
        {
          type: 'p',
          text: "Everything above happens in the kernel. But saving one set of registers and loading another needs no privilege at all, as long as both sets belong to the same process. A **user-level thread**, or **fiber**, is an execution context (registers plus its own stack) that your program switches to *by itself*, without entering the kernel. POSIX's `ucontext` functions show the mechanism in a few lines:",
        },
        {
          type: 'code',
          title: "fiber.cpp (Linux)",
          runnable: true,
          code: `#include <iostream>
#include <ucontext.h>
#include <vector>

ucontext_t g_main;            // the main loop's saved registers
ucontext_t g_loader;          // the fiber's saved registers

void loaderFiber() {
    for (int chunk = 1; chunk <= 3; ++chunk) {
        std::cout << "  loader: decoded chunk " << chunk << '\\n';
        swapcontext(&g_loader, &g_main);   // yield to main
    }
    std::cout << "  loader: done\\n";
}   // returning resumes uc_link (main)

int main() {
    std::vector<char> stack(64 * 1024);    // the fiber's own stack
    getcontext(&g_loader);
    g_loader.uc_stack.ss_sp = stack.data();
    g_loader.uc_stack.ss_size = stack.size();
    g_loader.uc_link = &g_main;            // where to go at the end
    makecontext(&g_loader, loaderFiber, 0);

    for (int frame = 1; frame <= 4; ++frame) {
        std::cout << "frame " << frame << ": main loop\\n";
        swapcontext(&g_main, &g_loader);   // run loader until it yields
    }
}`,
          output: "frame 1: main loop\n  loader: decoded chunk 1\nframe 2: main loop\n  loader: decoded chunk 2\nframe 3: main loop\n  loader: decoded chunk 3\nframe 4: main loop\n  loader: done",
          annotations: [
            { lines: '5-6', text: "A `ucontext_t` is a little PCB in user space: saved registers, a stack, and where to continue." },
            { lines: 11, text: "`swapcontext` saves the current registers into the first argument and loads the second: a context switch that never enters the scheduler. (glibc's version does make one quick `rt_sigprocmask` system call per switch, to save and restore the signal mask; engine fiber libraries skip even that.) The loader resumes right here next time." },
            { lines: 17, text: "Every fiber needs its own stack, because it must keep its call chain while suspended. Here it lives in an ordinary vector." },
            { lines: 26, text: "One OS thread, two execution contexts, interleaved at exactly the points the code chose: cooperative multitasking inside one thread." },
          ],
        },
        {
          type: 'table',
          headers: ["Aspect", "Kernel threads", "Fibers / user-level threads"],
          rows: [
            ["Switched by", "the kernel scheduler, at any instruction", "your code, at explicit yield points"],
            ["Switch cost", "around a microsecond, plus a system call", "tens of nanoseconds: save and load registers"],
            ["Run in parallel on several cores", "yes", "only by running them on several kernel threads"],
            ["A blocking system call", "blocks just that thread", "blocks **every** fiber on that kernel thread"],
            ["APIs", "`std::thread`, `CreateThread`", "`CreateFiber`/`SwitchToFiber` (Windows), `ucontext` (POSIX, obsolescent), Boost.Context"],
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: "Fibers in game engines",
          text: "Naughty Dog's engine for *The Last of Us Remastered* runs a few worker threads, each locked to a CPU core, and around 160 fibers on top of them (Christian Gyrling, GDC 2015). A job that must wait for other jobs simply switches to another fiber instead of blocking its thread, so the cores never sit idle and the kernel almost never switches threads. Unit 6 builds job systems like this. C++20 coroutines are a stackless relative: the compiler turns the function into a state machine, so suspension needs no separate stack at all.",
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: "In a fiber-based job system, one job calls a blocking `read()` on a slow network drive. What happens to the other fibers scheduled on the same worker thread?",
      options: [
        { text: "Nothing: the kernel switches to another fiber while `read` waits", why: "The kernel does not know fibers exist. It only sees one thread, and it blocks that thread." },
        { text: "They all stall until `read` returns, because their kernel thread is blocked", correct: true, why: "Fibers multiplex one kernel thread. If that thread blocks in the kernel, no code at all runs on it, so no other fiber can be switched in." },
        { text: "The fiber library catches the system call and turns it into an asynchronous one automatically", why: "Plain fiber libraries cannot intercept arbitrary system calls. Some runtimes wrap specific I/O functions, but a raw `read` blocks." },
        { text: "The job system's other threads pick up those fibers immediately", why: "A suspended fiber's state lives on its own stack and could be resumed elsewhere, but the fiber that is *inside* `read` is stuck on that thread, and the others are only moved if the scheduler was built to steal them." },
      ],
      explanation: "This is the fundamental limit of user-level threads: the kernel schedules kernel threads, not fibers. Engines therefore keep blocking calls off the fiber workers: I/O goes through asynchronous APIs (overlapped I/O, `io_uring`, DirectStorage) or dedicated I/O threads, and job code only waits on other jobs, which the fiber scheduler understands.",
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'bug',
      prompt: "This job runs as a fiber in a cooperative job system with one fiber worker per core. When it runs, the core it is on stops doing any other work, and the load never finishes if the streaming job is queued on the same worker. Tap the faulty line.",
      code: `void spawnEnemiesJob(JobContext& ctx) {
    ctx.run(streamEnemyMeshesJob);       // queue the dependency
    while (!g_meshesLoaded.load()) {
        // wait for the streaming job
    }
    for (const SpawnPoint& p : ctx.level().spawnPoints) {
        spawnEnemy(p);
    }
}`,
      bugLines: [3],
      hint: "In a cooperative system, who switches to the streaming job?",
      explanation: "The loop busy-waits without ever yielding. Fibers are switched only when code yields, so the worker thread keeps running this loop forever, and if `streamEnemyMeshesJob` sits in the same worker's queue it can never run: a livelock exactly like Windows 3.1's frozen desktop. The fix is to wait *through the job system* (for example `ctx.waitFor(counter)`), which suspends this fiber and lets the worker run other jobs, including the one it depends on.",
    },
  ],
  takeaways: [
    "Limited direct execution runs programs directly on the CPU in user mode; the kernel keeps control through traps for restricted operations and a timer interrupt for regaining the CPU.",
    "Cooperative multitasking trusts programs to yield; preemptive multitasking uses the timer interrupt, which user code cannot disable, so a runaway loop cannot freeze the system.",
    "A context switch saves user registers on the kernel stack at the interrupt, then saves and restores kernel registers and stacks through the PCBs, plus FPU state and, between processes, the page-table root.",
    "A switch costs about a microsecond directly plus cache, TLB and branch-predictor refill afterwards; thread switches within a process skip the page-table change and are cheaper.",
    "Fibers and user-level threads switch in user space at explicit yield points, which is cheap and predictable but blocks every fiber on a thread when one of them makes a blocking system call.",
  ],
  reading: [
    {
      title: "OSTEP chapter 6: Mechanism: Limited Direct Execution",
      url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
      source: 'book',
      note: "The two-level register save and the full timeline of a timer-driven switch; this lesson follows its figures.",
    },
    {
      title: "Parallelizing the Naughty Dog Engine Using Fibers (GDC 2015)",
      url: "https://www.gdcvault.com/play/1022186/Parallelizing-the-Naughty-Dog-Engine",
      source: 'video',
      note: "Christian Gyrling's talk on worker threads, fibers and job counters in a shipped engine.",
    },
    {
      title: "Fibers (Microsoft Learn)",
      url: "https://learn.microsoft.com/en-us/windows/win32/procthread/fibers",
      source: 'other',
      note: "Windows' fiber API: ConvertThreadToFiber, CreateFiber and SwitchToFiber.",
    },
    {
      title: "timeBeginPeriod function (Microsoft Learn)",
      url: "https://learn.microsoft.com/en-us/windows/win32/api/timeapi/nf-timeapi-timebeginperiod",
      source: 'other',
      note: "How Windows timer resolution works, including the per-process behaviour of recent Windows versions.",
    },
    {
      title: "Context switch",
      url: "https://en.wikipedia.org/wiki/Context_switch",
      source: 'article',
      note: "Overview of what is saved, hardware support and measured costs.",
    },
  ],
};
