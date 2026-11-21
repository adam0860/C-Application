import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: "os-kernel-user-mode",
  title: "Kernel Mode, Traps and System Calls",
  summary: "How the CPU enforces the user/kernel boundary, the three ways into the kernel, what a system call does step by step, and what it costs.",
  minutes: 20,
  objectives: [
    "Explain privilege levels (x86 rings, ARM exception levels) and what user-mode code is forbidden to do",
    "Classify an event as an interrupt, an exception (fault) or a trap, and say where execution continues afterwards",
    "Describe how the kernel's trap table and per-thread kernel stack make entering the kernel safe",
    "Trace a `write` system call from your C++ through the `syscall` instruction and back, register by register",
    "Estimate the direct and indirect cost of system calls and explain why games batch them",
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: "The CPU enforces the boundary",
      blocks: [
        {
          type: 'p',
          text: "The last lesson said the kernel runs privileged and your game does not. That rule cannot be enforced by software alone: if the kernel had to check every instruction your program runs, it would *be* an interpreter, and far too slow. So the **CPU** keeps track of the current privilege level and checks every instruction and every memory access in hardware, at full speed.",
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 290">
<circle cx="140" cy="145" r="128" class="f-blue" fill-opacity="0.12" stroke="none"/>
<circle cx="140" cy="145" r="128" fill="none" class="s-blue" stroke-width="1.6"/>
<circle cx="140" cy="145" r="96" class="f-gray" fill-opacity="0.10" stroke="none"/>
<circle cx="140" cy="145" r="96" fill="none" class="s-gray" stroke-width="1.2" stroke-dasharray="4 3"/>
<circle cx="140" cy="145" r="66" class="f-gray" fill-opacity="0.10" stroke="none"/>
<circle cx="140" cy="145" r="66" fill="none" class="s-gray" stroke-width="1.2" stroke-dasharray="4 3"/>
<circle cx="140" cy="145" r="38" class="f-orange" fill-opacity="0.25" stroke="none"/>
<circle cx="140" cy="145" r="38" fill="none" class="s-orange" stroke-width="1.8"/>
<text x="140" y="142" font-size="12" font-weight="700" text-anchor="middle">Ring 0</text>
<text x="140" y="157" font-size="10" text-anchor="middle">kernel</text>
<text x="140" y="96" font-size="11" text-anchor="middle" class="t-gray">Ring 1</text>
<text x="140" y="66" font-size="11" text-anchor="middle" class="t-gray">Ring 2</text>
<text x="140" y="34" font-size="12" font-weight="700" text-anchor="middle" class="t-blue">Ring 3</text>
<text x="140" y="256" font-size="10" text-anchor="middle" class="t-blue">your game, shell</text>
<text x="292" y="30" font-size="12" font-weight="700">x86-64</text>
<text x="292" y="50" font-size="10.5"><tspan font-weight="700" class="t-orange">Ring 0</tspan> kernel mode: every instruction,</text>
<text x="292" y="64" font-size="10.5">all memory, I/O ports, control registers</text>
<text x="292" y="84" font-size="10.5"><tspan font-weight="700" class="t-gray">Rings 1–2</tspan> exist, but mainstream</text>
<text x="292" y="98" font-size="10.5">OSes use only two levels</text>
<text x="292" y="118" font-size="10.5"><tspan font-weight="700" class="t-blue">Ring 3</tspan> user mode: privileged</text>
<text x="292" y="132" font-size="10.5">instructions fault; only your own pages</text>
<line x1="292" y1="150" x2="510" y2="150" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<text x="292" y="172" font-size="12" font-weight="700">ARMv8 / AArch64</text>
<rect x="292" y="182" width="214" height="22" rx="4" class="f-purple" fill-opacity="0.12" stroke="none"/>
<text x="300" y="197" font-size="10.5"><tspan font-weight="700">EL3</tspan> secure monitor (firmware)</text>
<rect x="292" y="206" width="214" height="22" rx="4" class="f-teal" fill-opacity="0.12" stroke="none"/>
<text x="300" y="221" font-size="10.5"><tspan font-weight="700">EL2</tspan> hypervisor</text>
<rect x="292" y="230" width="214" height="22" rx="4" class="f-orange" fill-opacity="0.16" stroke="none"/>
<text x="300" y="245" font-size="10.5"><tspan font-weight="700">EL1</tspan> OS kernel</text>
<rect x="292" y="254" width="214" height="22" rx="4" class="f-blue" fill-opacity="0.14" stroke="none"/>
<text x="300" y="269" font-size="10.5"><tspan font-weight="700">EL0</tspan> applications</text>
</svg>`,
          alt: "Concentric x86 protection rings: ring 0 in the centre is the kernel, rings 1 and 2 are unused, ring 3 on the outside holds applications. Beside it, ARMv8 exception levels: EL3 secure monitor, EL2 hypervisor, EL1 OS kernel, EL0 applications.",
          caption: "x86 has four [[protection-ring|rings]], but Windows, Linux and macOS use only ring 0 ([[kernel-mode]]) and ring 3 ([[user-mode]]). ARM numbers its levels the other way round.",
        },
        {
          type: 'p',
          text: "On x86-64 the current privilege level lives in the low two bits of the code-segment register. In ring 3 the CPU refuses, among others:",
        },
        {
          type: 'list',
          items: [
            "`hlt` (stop the CPU until the next interrupt), `lidt` / `lgdt` (install the tables that say where interrupts go),",
            "`mov cr3, …` (switch page tables, which would let you map any physical memory) and `wrmsr` (reconfigure the CPU, including the system-call entry point),",
            "`in` / `out` port I/O and `cli` (disable interrupts), unless the kernel explicitly grants them,",
            "any load or store to a page whose page-table entry is marked *supervisor only*, which is how kernel memory stays invisible even though it is mapped in every address space.",
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why the privileged list looks like this",
          text: "Each forbidden instruction would let a program escape the OS's control. Change `cr3` and you choose your own page tables, so memory isolation is gone. Disable interrupts and the timer can never take the CPU back, so time sharing is gone. Rewrite the interrupt table or the system-call entry point and *your* code runs the next time anybody enters the kernel. The privileged set is exactly the set of controls that keep the illusions honest.",
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: "Try it: a privileged instruction from user mode",
      blocks: [
        {
          type: 'p',
          text: "Let's break the rule on purpose. GCC's inline assembly lets C++ emit a single `hlt`. This only builds for x86-64, and it is meant to crash.",
        },
        {
          type: 'code',
          title: "hlt.cpp (crashes on purpose)",
          code: `#include <cstdio>

int main() {
    std::puts("About to execute HLT from user mode...");
    std::fflush(stdout);
    asm volatile("hlt");   // privileged: ring 0 only
    std::puts("You will never see this line.");
}`,
          annotations: [
            { lines: 5, text: "Flush now, or the message could die in the stdio buffer with the process." },
            { lines: 6, text: "The CPU checks the privilege level, sees ring 3, and raises a *general-protection fault* instead of halting." },
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          title: "Real run on Linux",
          code: `$ bash -c './hlt; echo "exit status: $?"'
About to execute HLT from user mode...
bash: line 1: 23823 Segmentation fault      ./hlt
exit status: 139

$ strace ./hlt 2>&1 | tail -2
--- SIGSEGV {si_signo=SIGSEGV, si_code=SI_KERNEL, si_addr=NULL} ---
+++ killed by SIGSEGV +++`,
          annotations: [
            { lines: 3, text: "The fault entered the kernel; the kernel decided this process broke the rules and killed it with the signal `SIGSEGV`." },
            { lines: 4, text: "Shells report \"killed by signal *n*\" as exit status 128 + *n*. `SIGSEGV` is signal 11, so 139." },
            { lines: 6, text: "`SI_KERNEL` means the kernel itself sent the signal, here because of a protection fault rather than a bad address." },
          ],
        },
        {
          type: 'p',
          text: "Nothing bad happened to the machine. That is the point: user mode can *try* anything, and the worst outcome is that the offending process dies. On Windows the same instruction raises the structured exception `STATUS_PRIVILEGED_INSTRUCTION` (`0xC0000096`), which, if unhandled, ends the process and can produce a crash dump.",
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'numeric',
      prompt: "A crashed build of your game exits on Linux and the shell reports **exit status 134**. Using the 128 + *n* rule, which signal number killed it?",
      answer: 6,
      label: "Signal",
      hint: "Subtract 128.",
      explanation: "134 − 128 = 6, which is `SIGABRT` on Linux. That is the signal `std::abort()` raises, and a failed `assert` or an uncaught C++ exception (via `std::terminate`) ends in `abort`. So 134 usually means \"the program gave up on purpose\", while 139 (`SIGSEGV`, 11) means \"the CPU and kernel caught it touching something it must not\". Reading exit codes this way is a quick first step in triaging crashes from CI or test farms.",
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: "Three ways into the kernel",
      blocks: [
        {
          type: 'p',
          text: "Your program is running in user mode. The CPU switches to kernel mode only when one of three kinds of event happens. All three use the same hardware path: save a little state, raise the privilege level, jump to a handler the kernel installed.",
        },
        {
          type: 'table',
          headers: ["Kind", "Caused by", "Timing", "Examples", "Afterwards"],
          rows: [
            ["**Interrupt**", "A device outside the CPU", "Asynchronous: arrives between any two instructions", "Timer tick, network packet, disk I/O complete, controller input", "Resume the interrupted instruction stream (or switch to another process)"],
            ["**Exception** (fault)", "The instruction itself fails", "Synchronous: same instruction, same data, same fault", "Page fault, divide error, general-protection fault (our `hlt`)", "Fix and **retry** the instruction (page fault) or kill the process"],
            ["**Trap**", "An instruction that asks to enter the kernel", "Synchronous and intentional", "`syscall`, `int3` breakpoint", "Continue at the **next** instruction"],
          ],
        },
        {
          type: 'p',
          text: "You met the hardware side of [[hardware-interrupt|interrupts]] in the Computer Architecture course: a device raises a line and the CPU runs a handler instead of polling. The OS's view adds one crucial interrupt: the **timer**. The kernel programs a timer to interrupt every few milliseconds, which guarantees it gets the CPU back from any program, even one stuck in `while (true) {}`.",
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why a page fault retries but a system call continues",
          text: "A page fault means \"this instruction could not finish yet\": the data was on disk, or the page had not been allocated. The kernel fixes the cause and re-runs the same instruction, and your code never knows. A system call is a request that *completed*: the kernel did the work and execution continues after the `syscall` instruction. Getting this wrong would either repeat side effects or skip work.",
        },
        {
          type: 'callout',
          variant: 'tip',
          title: "Breakpoints are traps",
          text: "When you set a breakpoint in Visual Studio or gdb, the debugger overwrites the first byte of that instruction with `0xCC`, the one-byte `int3` instruction. Executing it traps into the kernel, which stops your process and notifies the debugger. Data breakpoints (\"break when this address changes\") instead use the CPU's debug registers, which is why you can only have four of them at once on x86.",
        },
        {
          type: 'callout',
          variant: 'note',
          title: "Terminology varies",
          text: "Intel's manuals call all synchronous events *exceptions* and split them into faults, traps and aborts. OSTEP uses *trap* mostly for system calls. Linux code says \"trap\" for most exceptions. The three-way split above (device interrupt, faulting instruction, deliberate trap) is the idea that matters.",
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'mcq',
      prompt: "Your game reads a texture from a memory-mapped pak file. The page is not in RAM yet, so the load instruction cannot complete. What happens?",
      options: [
        { text: "An interrupt from the SSD stops the game, and the read is abandoned", why: "The event is caused by *this instruction*, so it is synchronous: an exception, not a device interrupt. (The SSD will raise an interrupt later, when the data has arrived.)" },
        { text: "A page fault enters the kernel, which reads the page from storage, maps it, and re-runs the same load instruction", correct: true, why: "A page fault is a fault-type exception: the kernel fixes the cause and the faulting instruction is retried, invisibly to your code (apart from the time it took)." },
        { text: "The load returns zero and the game continues with a black texture", why: "The hardware never returns made-up data. Either the access completes correctly or it faults." },
        { text: "The CPU executes a `syscall` on the game's behalf to request the page", why: "System calls are deliberate requests written in the program. Page faults happen without any request; the hardware raises them." },
      ],
      explanation: "Memory-mapped files rely on exactly this: touching an unmapped page traps into the kernel, which brings the data in and retries. It is why the first touch of mapped data can stall for tens of microseconds while later touches are as fast as normal memory, which matters when a streaming system maps large pak files.",
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: "The trap table and the kernel stack",
      blocks: [
        {
          type: 'p',
          text: "If user code could jump into the kernel at an address of its choosing, it could skip straight past a permission check. So the CPU only enters the kernel at addresses the kernel registered in advance. At boot, while it is still privileged, the kernel fills in a **[[trap-table|trap table]]**:",
        },
        {
          type: 'list',
          items: [
            "On x86 the **interrupt descriptor table** (IDT) has 256 entries, one per vector: 14 is the page fault, 13 the general-protection fault, 3 the `int3` breakpoint, others belong to devices and the timer. The kernel loads its address with the privileged `lidt` instruction.",
            "The fast `syscall` instruction has its own entry point, stored in a model-specific register with the privileged `wrmsr` instruction.",
          ],
        },
        {
          type: 'p',
          text: "The second safety rule concerns the stack. When the CPU enters the kernel, the kernel must not use your stack: your stack pointer could point anywhere, including at kernel memory, and another thread of your process could modify that stack while the kernel was using it. So every thread also has a small **[[kernel-stack]]** (16 KiB on x86-64 Linux) that only the kernel can touch. Entering the kernel switches to it, and the user's registers are saved there.",
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why every thread needs its own kernel stack",
          text: "A thread can be stopped *in the middle of* kernel code: blocked inside `read` waiting for the disk, for example. Its half-finished kernel call chain has to live somewhere while other threads run, and that somewhere is its kernel stack. One kernel stack per thread is what lets the kernel juggle thousands of sleeping system calls at once.",
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: "A bank with one door",
          text: "Customers (user code) cannot walk into the vault. They go through a single counter (the trap table's fixed entry points), fill in a form with a request number (the system-call number), and a teller (the kernel), working at her own desk (the kernel stack), decides whether to do it.",
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: "During a system call, the Linux kernel saves your registers on your thread's normal user-mode stack, just below your current stack frame.",
      answer: false,
      explanation: "The kernel never trusts or uses the user stack. The entry code switches to the thread's private kernel stack first and saves the user registers there. Your stack pointer could be garbage, could point into kernel memory, or could be modified by another thread at the same moment; any of these would let user code corrupt or spy on the kernel.",
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: "A system call, step by step",
      blocks: [
        {
          type: 'p',
          text: "A [[system-call]] is a function call that crosses the privilege boundary. On x86-64 Linux the contract is simple: put the call's number in `rax`, its arguments in `rdi`, `rsi`, `rdx`, `r10`, `r8`, `r9`, and execute `syscall`. The result comes back in `rax`. Here is glibc's real `write` wrapper (glibc 2.39, from `gdb`, fast path only):",
        },
        {
          type: 'code',
          lang: 'text',
          title: "disassemble write (Intel syntax)",
          code: `mov    eax, 0x1                   ; system-call number: write
syscall                           ; enter the kernel
cmp    rax, 0xfffffffffffff000    ; -4095 .. -1 means error
ja     error                      ; unsigned compare
ret                               ; success: rax = bytes written
error:
neg    eax                        ; -EBADF -> EBADF
mov    DWORD PTR fs:[rdx], eax    ; errno (thread-local)
mov    rax, 0xffffffffffffffff    ; return -1
ret`,
          annotations: [
            { lines: 1, text: "Your three arguments are already in `rdi`, `rsi`, `rdx`, because that is also where the normal calling convention puts a function's first three arguments. The wrapper only adds the number." },
            { lines: 2, text: "`syscall` saves the return address in `rcx` and the flags in `r11`, switches to ring 0 and jumps to the kernel's registered entry point. That is why the fourth argument uses `r10` instead of `rcx`." },
            { lines: '3-4', text: "The kernel returns errors as small negative numbers. Read as unsigned, they are the top 4095 values, so a single comparison spots them." },
            { lines: '7-9', text: "The C convention is different: return −1 and store the positive error code in `errno`, which lives in thread-local storage (the `fs` segment) so threads do not overwrite each other's errors." },
          ],
        },
        {
  "type": "algo",
  "view": "graph",
  "width": 480,
  "height": 280,
  "nodes": [
    {
      "id": "app",
      "x": 60,
      "y": 50,
      "label": "app"
    },
    {
      "id": "libc",
      "x": 200,
      "y": 50,
      "label": "libc"
    },
    {
      "id": "entry",
      "x": 200,
      "y": 165,
      "label": "entry"
    },
    {
      "id": "table",
      "x": 310,
      "y": 165,
      "label": "tbl"
    },
    {
      "id": "sys",
      "x": 420,
      "y": 165,
      "label": "sys"
    },
    {
      "id": "drv",
      "x": 420,
      "y": 235,
      "label": "tty"
    },
    {
      "id": "ret",
      "x": 80,
      "y": 235,
      "label": "exit"
    }
  ],
  "edges": [
    {
      "from": "app",
      "to": "libc",
      "directed": true
    },
    {
      "from": "libc",
      "to": "entry",
      "label": "syscall",
      "directed": true
    },
    {
      "from": "entry",
      "to": "table",
      "directed": true
    },
    {
      "from": "table",
      "to": "sys",
      "directed": true
    },
    {
      "from": "sys",
      "to": "drv",
      "directed": true
    },
    {
      "from": "drv",
      "to": "ret",
      "directed": true
    },
    {
      "from": "ret",
      "to": "libc",
      "label": "sysret",
      "directed": true
    }
  ],
  "code": "write(1, msg, 15);   // your C++\nmov eax, 1           ; number: write\nsyscall              ; enter kernel\n; entry: kernel stack,\n;   save user registers\ndispatch on rax      ; ksys_write\n; vfs_write -> tty driver\n; restore regs, sysret\ncmp rax, -4096       ; error?\nret                  ; returns 15",
  "lang": "text",
  "interval": 1800,
  "frames": [
    {
      "note": "Your code calls `write(1, msg, 15)`: an ordinary function call into glibc. Arguments travel in `rdi`, `rsi`, `rdx` as usual.",
      "nodeColors": [
        {
          "id": "app",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "app",
          "to": "libc",
          "color": "orange"
        }
      ],
      "lines": [
        1
      ],
      "vars": [
        [
          "mode",
          "user (ring 3)"
        ],
        [
          "rdi",
          "1 (fd)"
        ],
        [
          "rsi",
          "msg"
        ],
        [
          "rdx",
          "15"
        ]
      ]
    },
    {
      "note": "The glibc wrapper puts the **system-call number** for `write` (1 on x86-64) in `rax`. Still plain user-mode code.",
      "nodeColors": [
        {
          "id": "app",
          "color": "green"
        },
        {
          "id": "libc",
          "color": "orange"
        }
      ],
      "lines": [
        2
      ],
      "vars": [
        [
          "mode",
          "user (ring 3)"
        ],
        [
          "rax",
          "1"
        ],
        [
          "rdi",
          "1 (fd)"
        ],
        [
          "rsi",
          "msg"
        ],
        [
          "rdx",
          "15"
        ]
      ]
    },
    {
      "note": "`syscall` switches the CPU to ring 0 and jumps to the one entry point the kernel registered at boot. The CPU saves the return address in `rcx` and the flags in `r11`.",
      "nodeColors": [
        {
          "id": "app",
          "color": "green"
        },
        {
          "id": "libc",
          "color": "green"
        },
        {
          "id": "entry",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "libc",
          "to": "entry",
          "color": "orange"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "mode",
          "kernel (ring 0)"
        ],
        [
          "rax",
          "1"
        ],
        [
          "rcx",
          "return addr"
        ]
      ]
    },
    {
      "note": "Kernel entry code switches to this thread's **kernel stack** and pushes every user register, so they can be restored exactly later.",
      "nodeColors": [
        {
          "id": "app",
          "color": "green"
        },
        {
          "id": "libc",
          "color": "green"
        },
        {
          "id": "entry",
          "color": "orange"
        }
      ],
      "lines": [
        4,
        5
      ],
      "vars": [
        [
          "mode",
          "kernel (ring 0)"
        ],
        [
          "rax",
          "1"
        ],
        [
          "stack",
          "kernel stack"
        ]
      ]
    },
    {
      "note": "The kernel checks that `rax` is a valid number and uses it to pick the handler from its **system-call table**: number 1 is `write`.",
      "nodeColors": [
        {
          "id": "app",
          "color": "green"
        },
        {
          "id": "libc",
          "color": "green"
        },
        {
          "id": "entry",
          "color": "green"
        },
        {
          "id": "table",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "entry",
          "to": "table",
          "color": "orange"
        }
      ],
      "lines": [
        6
      ],
      "vars": [
        [
          "mode",
          "kernel (ring 0)"
        ],
        [
          "rax",
          "1"
        ],
        [
          "handler",
          "ksys_write"
        ]
      ]
    },
    {
      "note": "`ksys_write` looks up fd 1 in the process's file table, checks permissions, then copies 15 bytes from your buffer into the terminal driver.",
      "nodeColors": [
        {
          "id": "app",
          "color": "green"
        },
        {
          "id": "libc",
          "color": "green"
        },
        {
          "id": "entry",
          "color": "green"
        },
        {
          "id": "table",
          "color": "green"
        },
        {
          "id": "sys",
          "color": "orange"
        },
        {
          "id": "drv",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "sys",
          "to": "drv",
          "color": "orange"
        }
      ],
      "lines": [
        7
      ],
      "vars": [
        [
          "mode",
          "kernel (ring 0)"
        ],
        [
          "fd 1",
          "terminal"
        ],
        [
          "bytes",
          "15"
        ]
      ]
    },
    {
      "note": "Return path: the result (15) goes in `rax`, the saved user registers are restored, and `sysret` drops back to ring 3 right after the `syscall` instruction.",
      "nodeColors": [
        {
          "id": "app",
          "color": "green"
        },
        {
          "id": "libc",
          "color": "green"
        },
        {
          "id": "entry",
          "color": "green"
        },
        {
          "id": "table",
          "color": "green"
        },
        {
          "id": "sys",
          "color": "green"
        },
        {
          "id": "drv",
          "color": "green"
        },
        {
          "id": "ret",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "drv",
          "to": "ret",
          "color": "orange"
        }
      ],
      "lines": [
        8
      ],
      "vars": [
        [
          "mode",
          "kernel (ring 0)"
        ],
        [
          "rax",
          "15"
        ]
      ]
    },
    {
      "note": "Back in glibc, in user mode. A value from −4095 to −1 would be an error code: glibc would store it in `errno` and return −1. 15 is a success.",
      "nodeColors": [
        {
          "id": "entry",
          "color": "green"
        },
        {
          "id": "table",
          "color": "green"
        },
        {
          "id": "sys",
          "color": "green"
        },
        {
          "id": "drv",
          "color": "green"
        },
        {
          "id": "ret",
          "color": "green"
        },
        {
          "id": "libc",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "ret",
          "to": "libc",
          "color": "orange"
        }
      ],
      "lines": [
        9
      ],
      "vars": [
        [
          "mode",
          "user (ring 3)"
        ],
        [
          "rax",
          "15"
        ]
      ]
    },
    {
      "note": "`write` returns 15 to your code. One function call from your side; two privilege changes and a few hundred instructions underneath.",
      "nodeColors": [
        {
          "id": "libc",
          "color": "green"
        },
        {
          "id": "entry",
          "color": "green"
        },
        {
          "id": "table",
          "color": "green"
        },
        {
          "id": "sys",
          "color": "green"
        },
        {
          "id": "drv",
          "color": "green"
        },
        {
          "id": "ret",
          "color": "green"
        },
        {
          "id": "app",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "app",
          "to": "libc",
          "color": "orange"
        }
      ],
      "lines": [
        10
      ],
      "vars": [
        [
          "mode",
          "user (ring 3)"
        ],
        [
          "return",
          "15"
        ]
      ]
    }
  ],
  "caption": "One `write` on x86-64 Linux. Top row: user mode. Lower rows: kernel mode. Instructions are from glibc 2.39's real wrapper; the kernel steps are summarized."
},
        {
          type: 'callout',
          variant: 'why',
          title: "Why a number instead of an address?",
          text: "User code names the service by a small integer, never by a kernel address. The kernel checks the number against the table size and picks the handler itself, so a malicious program cannot redirect the kernel to code of its choice. The numbers are part of Linux's stable ABI: `write` has been 1 on x86-64 since the port began, and old binaries keep working.",
        },
        {
          type: 'deepdive',
          title: "Calling the kernel with no C library at all",
          blocks: [
            {
              type: 'p',
              text: "Nothing magic is hidden in glibc. With inline assembly you can issue the instruction yourself. This builds only for x86-64 Linux:",
            },
            {
              type: 'code',
              title: "raw_syscall.cpp",
              runnable: true,
              code: `#include <cstddef>

// write(fd, buf, len) without the C library. x86-64 Linux only.
long rawWrite(int fd, const void* buf, std::size_t len) {
    long ret;
    asm volatile("syscall"
                 : "=a"(ret)                    // rax: result
                 : "a"(1L),                     // rax = 1: write
                   "D"(static_cast<long>(fd)),  // rdi = fd
                   "S"(buf),                    // rsi = buffer
                   "d"(len)                     // rdx = length
                 : "rcx", "r11", "memory");     // clobbered
    return ret;
}

int main() {
    const char msg[] = "hello from a raw syscall\\n";
    long n = rawWrite(1, msg, sizeof msg - 1);
    long bad = rawWrite(42, msg, 1);            // fd 42 is not open
    const char ok[] = "bad fd gave -9, which is -EBADF\\n";
    if (n == 25 && bad == -9) rawWrite(1, ok, sizeof ok - 1);
}`,
              output: "hello from a raw syscall\nbad fd gave -9, which is -EBADF",
              annotations: [
                { lines: '6-12', text: "GCC constraint letters pick registers: `a` is `rax`, `D` is `rdi`, `S` is `rsi`, `d` is `rdx`. The clobber list tells the compiler that `syscall` destroys `rcx` and `r11` and may read memory." },
                { lines: 19, text: "Without glibc there is no `errno`: you get the raw kernel convention, a negative error number. 9 is `EBADF`, \"bad file descriptor\"." },
              ],
            },
            {
              type: 'p',
              text: "On 64-bit ARM Linux the instruction is `svc #0`, with the number in `x8` and arguments in `x0`–`x5`. In practice you call the portable `syscall(SYS_write, …)` function from `<unistd.h>` when you need a call glibc does not wrap, and the real wrappers otherwise.",
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'order',
      prompt: "Put the steps of a `write` system call on x86-64 Linux in order.",
      linesAreCode: false,
      lines: [
        "The glibc wrapper puts the system-call number in `rax` (arguments are already in registers)",
        "The `syscall` instruction switches to kernel mode and jumps to the registered entry point",
        "Kernel entry code switches to the thread's kernel stack and saves the user registers",
        "The kernel uses `rax` to find the `write` handler and runs it",
        "The kernel restores the user registers and returns to user mode with `sysret`",
        "The wrapper checks `rax`, setting `errno` and returning −1 if it is an error code",
      ],
      distractors: ["The kernel copies the user's stack frame onto the kernel stack"],
      explanation: "Every system call follows this shape: prepare in user mode, trap through a fixed entry, save state on a private kernel stack, dispatch by number, undo the save, return, and translate the result into the C convention. The distractor describes something the kernel deliberately never does: it saves registers, not your stack, and it does not trust your stack at all.",
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: "What a system call costs",
      blocks: [
        {
          type: 'p',
          text: "A system call is far more expensive than a function call, even when the kernel does almost nothing. This program measures the tiniest call there is, plus a clock read for comparison:",
        },
        {
          type: 'code',
          title: "syscall_cost.cpp",
          runnable: true,
          code: `#include <chrono>
#include <cstdio>
#include <sys/syscall.h>
#include <unistd.h>

int main() {
    using Clock = std::chrono::steady_clock;
    constexpr int N = 1'000'000;

    auto t0 = Clock::now();
    for (int i = 0; i < N; ++i) {
        syscall(SYS_getppid);           // tiny system call
    }
    auto t1 = Clock::now();
    for (int i = 0; i < N; ++i) {
        auto t = Clock::now();          // vDSO: no kernel entry
        (void)t;
    }
    auto t2 = Clock::now();

    auto perCall = [](auto d) {
        return std::chrono::duration<double, std::nano>(d).count() / N;
    };
    std::printf("getppid system call: %6.1f ns\\n", perCall(t1 - t0));
    std::printf("steady_clock::now(): %6.1f ns\\n", perCall(t2 - t1));
}`,
          annotations: [
            { lines: 12, text: "`getppid` just reads one field of the process record: almost pure entry/exit overhead. We call it through `syscall()` so that no library could cache the answer." },
            { lines: 16, text: "On Linux the clock is read through the [[vdso]], kernel-provided code mapped into your process that reads the time without entering the kernel." },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: "One run on the Linux VM that built this course (yours will differ)",
          code: `getppid system call:  113.8 ns
steady_clock::now():   30.1 ns`,
        },
        {
          type: 'p',
          text: "Roughly 100 ns of **direct cost** per call on this machine, a few hundred CPU cycles: the mode switch, saving and restoring registers, the entry and exit code, and security mitigations added after the 2018 Meltdown and Spectre disclosures (on affected CPUs, switching page tables on every entry). A plain function call costs about a nanosecond.",
        },
        {
          type: 'p',
          text: "The **indirect cost** is harder to see. Kernel code and data evict some of your cache lines, [[tlb]] entries and branch-predictor history, so your code runs slower for a while *after* the call returns. The FlexSC study (OSDI 2010) measured user code running at a noticeably lower instructions-per-cycle for thousands of cycles after each system call.",
        },
        {
          type: 'callout',
          variant: 'perf',
          title: "Clocks are cheap on purpose",
          text: "Games read the clock several times per frame for timing and profiling, so OSes make it nearly free. Linux uses the vDSO; Windows' `QueryPerformanceCounter` normally reads the CPU's invariant time-stamp counter in user mode too. Both avoid a system call. Sleeping, waiting and I/O, on the other hand, always enter the kernel.",
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'numeric',
      prompt: "A tool writes a 1 MiB (1,048,576-byte) file **one byte per `write` call**. If each call costs 200 ns, how many milliseconds are spent on system calls alone? Round to the nearest millisecond.",
      answer: 210,
      tolerance: 1,
      unit: "ms",
      hint: "One call per byte; 1 ms = 1,000,000 ns.",
      explanation: "1,048,576 calls × 200 ns = 209,715,200 ns ≈ 210 ms, before the disk does any real work. Writing the same data in 4 KiB chunks needs 256 calls, about 0.05 ms. Same bytes, about 4,000 times fewer crossings. This is why buffered streams exist, and why `std::endl` (which forces a flush, so usually a system call) in a hot loop is a classic performance bug.",
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: "Why games batch work",
      blocks: [
        {
          type: 'p',
          text: "If each crossing costs hundreds of nanoseconds plus cache damage, the winning strategy is obvious: cross less often, and do more per crossing. Engines apply this everywhere.",
        },
        {
          type: 'table',
          headers: ["Area", "Naive", "Batched"],
          rows: [
            ["Logging", "One `write` (or `std::endl`) per message", "Append to a per-frame buffer, flush once a frame or from a logging thread"],
            ["Asset loading", "Thousands of small `read` calls per file", "Large reads from a few big pak files, or memory-map them"],
            ["Async I/O", "One request, one wait, repeat", "Queue many requests and submit them at once: Linux `io_uring`, Windows DirectStorage"],
            ["Graphics", "A driver call per draw that talks to the kernel", "D3D12/Vulkan record command buffers in user mode; only submitting a batch of them involves the kernel"],
            ["Networking", "One `sendto` per small message", "Pack a frame's worth of updates into one UDP datagram"],
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: "In Unreal Engine",
          text: "Unreal's log output goes through `FOutputDevice` objects that buffer and, by default, write from a dedicated thread, so `UE_LOG` on the game thread does not pay a system call per line. Its pak files and IoStore containers exist largely so that thousands of small assets become a few large, well-ordered reads.",
        },
        {
          type: 'callout',
          variant: 'note',
          title: "Windows does the same thing differently",
          text: "On Windows, `WriteFile` in `kernelbase.dll` calls `NtWriteFile` in `ntdll.dll`, whose stub loads a *system service number* into `eax` and executes `syscall`. Unlike Linux, Windows does **not** promise stable numbers: they change between builds, so programs must call the documented DLL functions and never issue raw system calls themselves.",
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'bug',
      prompt: "This per-frame telemetry function is called 60 times a second with 500 entities, and the profiler shows the game thread spending milliseconds inside the kernel. Tap the line that causes it.",
      code: `void writeTelemetry(std::ofstream& out,
                    const std::vector<Entity>& entities) {
    for (const Entity& e : entities) {
        out << e.id << ',' << e.x << ',' << e.y
            << std::endl;
    }
}`,
      bugLines: [5],
      hint: "What does `std::endl` do besides writing a newline?",
      explanation: "`std::endl` writes `'\\n'` **and flushes** the stream, so every entity becomes a separate `write` system call: 500 calls a frame, 30,000 a second, each with its direct and indirect cost. Writing `'\\n'` instead lets the stream's buffer collect thousands of bytes and hand them to the kernel in a few large writes. Flush once at the end of the frame (or let a logging thread do it) if you need the data on disk promptly.",
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'truefalse',
      prompt: "On Linux, every call to `std::chrono::steady_clock::now()` enters the kernel through a `clock_gettime` system call.",
      answer: false,
      explanation: "glibc routes `clock_gettime` to the vDSO, a small piece of kernel-provided code mapped read-only into every process. It reads the hardware time-stamp counter and kernel-maintained conversion data directly in user mode, so no privilege switch happens (the measurement above shows about 30 ns versus about 114 ns for a real system call). `strace` will not even show these calls. The kernel only gets involved if the clock source cannot be read from user mode.",
    },
  ],
  takeaways: [
    "The CPU enforces privilege in hardware: x86 runs the kernel in ring 0 and applications in ring 3 (ARM: EL1 and EL0); privileged instructions and supervisor pages fault in user mode.",
    "The kernel is entered only through interrupts (asynchronous, from devices and the timer), exceptions (the instruction faulted, e.g. page faults, then retried or fatal) and traps (deliberate, e.g. `syscall`, `int3`).",
    "Entry points come from the kernel's trap table (IDT and the `syscall` MSR), and the kernel always switches to a per-thread kernel stack before saving user registers.",
    "On x86-64 Linux a system call puts its number in `rax` and arguments in `rdi`, `rsi`, `rdx`, `r10`, `r8`, `r9`; errors come back as −4095..−1, which glibc turns into −1 plus `errno`.",
    "A system call costs on the order of 100 ns directly, plus cache and TLB disruption afterwards, so games batch I/O, logging, GPU submission and networking.",
  ],
  reading: [
    {
      title: "OSTEP chapter 6: Mechanism: Limited Direct Execution",
      url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
      source: 'book',
      note: "Traps, trap tables and the kernel stack, explained with timelines; the first half covers this lesson.",
    },
    {
      title: "syscall(2) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man2/syscall.2.html",
      source: 'other',
      note: "The table of instructions, number registers and argument registers for every architecture Linux supports.",
    },
    {
      title: "syscalls(2) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man2/syscalls.2.html",
      source: 'other',
      note: "The full list of Linux system calls and the kernel version that introduced each one.",
    },
    {
      title: "vdso(7) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man7/vdso.7.html",
      source: 'other',
      note: "Which calls skip the kernel entirely and how the vDSO is mapped into every process.",
    },
    {
      title: "Protection ring",
      url: "https://en.wikipedia.org/wiki/Protection_ring",
      source: 'article',
      note: "History of hardware privilege levels from Multics to x86 and ARM, including hypervisor modes.",
    },
  ],
};
