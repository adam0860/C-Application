import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-locks',
  title: 'Race Conditions and Locks',
  summary:
    'Why `counter++` loses updates at the instruction level, what a lock must guarantee, and how locks are really built: from disabling interrupts, through test-and-set spinlocks and ticket locks, to the futexes underneath `std::mutex`.',
  minutes: 22,
  objectives: [
    'Trace a lost update through the load, add and store instructions of `counter++`, including a context switch in the middle',
    'State the requirements of a lock: mutual exclusion, progress, bounded waiting, and acceptable performance',
    'Explain why disabling interrupts is not a general lock and why a plain `bool` flag fails',
    'Build a spinlock from `std::atomic_flag` and a fair ticket lock from `fetch_add`',
    'Decide when spinning beats blocking, and explain how a futex lets `std::mutex` avoid system calls when uncontended',
    'Reason about lock granularity and contention',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: '`counter++` at the instruction level',
      blocks: [
        {
          type: 'p',
          text: 'In C++ Fundamentals (*Data Races, Mutexes and Locks*) two threads lost thousands of kills from a shared counter, and a `std::mutex` fixed it. Here you will see the failure the way the machine sees it, and then build the lock yourself, all the way down to the operating system.',
        },
        {
          type: 'p',
          text: 'Compile `++counter` without optimization and look at the machine code. The single C++ expression is three instructions: **load** the value into a register, **add** one, **store** it back.',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'objdump -d -M intel, g++ -O0, real output',
          code: `<inc()>:
    mov    eax,DWORD PTR [rip+0x2edd]   # <counter>
    add    eax,0x1
    mov    DWORD PTR [rip+0x2ed4],eax   # <counter>`,
          annotations: [
            { lines: 2, text: 'Load: copy `counter` from memory into the `eax` register. From here on the thread works on a private copy.' },
            { lines: 3, text: 'Modify the copy. Memory still holds the old value.' },
            { lines: 4, text: 'Store the copy back, overwriting whatever is in memory now.' },
          ],
        },
        {
          type: 'p',
          text: 'Registers belong to the thread. If the timer interrupt fires between the add and the store, the kernel saves this thread\'s `eax` in its control block and runs another thread, which reads the old value from memory. Step through it:',
        },
        {
  "type": "algo",
  "view": "array",
  "code": "mov eax, [counter]   ; load\nadd eax, 1          ; modify\nmov [counter], eax  ; store",
  "interval": 1400,
  "caption": "`++counter` compiled without optimization is three instructions. A context switch between them loses an update.",
  "frames": [
    {
      "note": "Both threads are about to run `++counter`. Memory holds 0. One core, so they take turns.",
      "array": [
        "—",
        0,
        "—"
      ],
      "marks": [],
      "pointers": [
        {
          "index": 0,
          "label": "T1 eax",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "counter",
          "color": "purple"
        },
        {
          "index": 2,
          "label": "T2 eax",
          "color": "teal"
        }
      ],
      "vars": [
        [
          "CPU runs",
          "—"
        ],
        [
          "increments done",
          "0"
        ]
      ]
    },
    {
      "note": "T1 **loads** `counter` (0) into its `eax`.",
      "array": [
        0,
        0,
        "—"
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
          "label": "T1 eax",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "counter",
          "color": "purple"
        },
        {
          "index": 2,
          "label": "T2 eax",
          "color": "teal"
        }
      ],
      "vars": [
        [
          "CPU runs",
          "T1"
        ],
        [
          "increments done",
          "0"
        ]
      ],
      "lines": [
        1
      ]
    },
    {
      "note": "T1 **adds** 1. Its register says 1, but memory still says 0.",
      "array": [
        1,
        0,
        "—"
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
          "label": "T1 eax",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "counter",
          "color": "purple"
        },
        {
          "index": 2,
          "label": "T2 eax",
          "color": "teal"
        }
      ],
      "vars": [
        [
          "CPU runs",
          "T1"
        ],
        [
          "increments done",
          "0"
        ]
      ],
      "lines": [
        2
      ]
    },
    {
      "note": "**Timer interrupt.** The kernel saves T1's registers (eax = 1) in T1's TCB and switches to T2.",
      "array": [
        1,
        0,
        "—"
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
          "label": "T1 eax",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "counter",
          "color": "purple"
        },
        {
          "index": 2,
          "label": "T2 eax",
          "color": "teal"
        }
      ],
      "vars": [
        [
          "CPU runs",
          "T2"
        ],
        [
          "increments done",
          "0"
        ],
        [
          "T1 TCB",
          "eax = 1 (saved)"
        ]
      ]
    },
    {
      "note": "T2 loads `counter`. Memory still holds **0**: T1's update exists only in T1's saved registers.",
      "array": [
        1,
        0,
        0
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
          "label": "T1 eax",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "counter",
          "color": "purple"
        },
        {
          "index": 2,
          "label": "T2 eax",
          "color": "teal"
        }
      ],
      "vars": [
        [
          "CPU runs",
          "T2"
        ],
        [
          "increments done",
          "0"
        ],
        [
          "T1 TCB",
          "eax = 1 (saved)"
        ]
      ],
      "lines": [
        1
      ]
    },
    {
      "note": "T2 adds 1 in its own `eax`.",
      "array": [
        1,
        0,
        1
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
          "label": "T1 eax",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "counter",
          "color": "purple"
        },
        {
          "index": 2,
          "label": "T2 eax",
          "color": "teal"
        }
      ],
      "vars": [
        [
          "CPU runs",
          "T2"
        ],
        [
          "increments done",
          "0"
        ],
        [
          "T1 TCB",
          "eax = 1 (saved)"
        ]
      ],
      "lines": [
        2
      ]
    },
    {
      "note": "T2 stores 1. One increment done, memory is correct so far.",
      "array": [
        1,
        1,
        1
      ],
      "marks": [
        {
          "index": 2,
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
          "label": "T1 eax",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "counter",
          "color": "purple"
        },
        {
          "index": 2,
          "label": "T2 eax",
          "color": "teal"
        }
      ],
      "vars": [
        [
          "CPU runs",
          "T2"
        ],
        [
          "increments done",
          "1"
        ],
        [
          "T1 TCB",
          "eax = 1 (saved)"
        ]
      ],
      "lines": [
        3
      ]
    },
    {
      "note": "Later T1 is scheduled again. The kernel restores eax = 1 from T1's TCB. T1 has no idea it was paused.",
      "array": [
        1,
        1,
        1
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
          "label": "T1 eax",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "counter",
          "color": "purple"
        },
        {
          "index": 2,
          "label": "T2 eax",
          "color": "teal"
        }
      ],
      "vars": [
        [
          "CPU runs",
          "T1"
        ],
        [
          "increments done",
          "1"
        ]
      ]
    },
    {
      "note": "T1 stores its stale 1 over T2's 1. Two increments ran, but `counter` is **1**: a lost update.",
      "array": [
        1,
        1,
        1
      ],
      "marks": [
        {
          "index": 0,
          "color": "orange"
        },
        {
          "index": 1,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "T1 eax",
          "color": "blue"
        },
        {
          "index": 1,
          "label": "counter",
          "color": "purple"
        },
        {
          "index": 2,
          "label": "T2 eax",
          "color": "teal"
        }
      ],
      "vars": [
        [
          "CPU runs",
          "T1"
        ],
        [
          "increments done",
          "2"
        ]
      ],
      "lines": [
        3
      ]
    }
  ]
},
        {
          type: 'p',
          text: 'The bug needs no second core. On one core, a [[context-switch]] at the wrong instruction is enough. On several cores it is worse, because both threads really do run the three instructions at the same time.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'One instruction is not one atomic operation',
          text: 'With `-O2`, GCC compiles `++counter` to a single instruction, `add DWORD PTR [rip+…],0x1`. That instruction cannot be split by an interrupt, but the CPU still executes it as a read, an add and a write to memory, and another **core** can slip its own read-modify-write in between. A `std::atomic<int>` compiles to `lock add DWORD PTR [rip+…],0x1` instead (real output). The `lock` prefix makes the core hold the cache line exclusively for the whole read-modify-write, using the [[cache-coherence]] protocol from Computer Architecture. And the unsynchronized version is still a [[data-race]], so it is undefined behavior whatever instructions it happens to compile to.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'numeric',
      prompt: 'Two threads each run `++counter` **three** times, starting from `counter = 0`. Each increment is the three instructions load, add, store, and the scheduler may interleave the two threads\' instructions in any order. What is the **smallest** possible final value of `counter`?',
      answer: 2,
      hint: 'Losing updates needs a thread to store a stale value late. Try to make one thread\'s very first load be stored back at the very end.',
      explanation:
        'The answer is **2**, not 1 or 3; a brute-force check of every interleaving gives final values 2, 3, 4, 5 and 6. To reach 2: T1 loads 0. T2 runs two full increments (counter = 2). T1 adds and stores 1, wiping them out. T2 loads that 1. T1 runs its remaining two increments (counter = 3). T2 adds and stores 2. Every thread\'s last store wins, and T2\'s last store carries a value read early. It cannot reach 1: every store writes at least 1, and the thread whose store comes last loaded that value *after* its own earlier store, so it read at least 1 and stores at least 2. With any *n* ≥ 2 increments per thread the minimum is still 2: six (or six million) increments can collapse to two.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Critical sections and what a lock must guarantee',
      blocks: [
        {
          type: 'p',
          text: 'The three instructions are a [[critical-section]]: code that touches shared state and must not run in two threads at once. A **lock** protects it. Before the section a thread calls `lock()`, which returns only when the thread may enter; afterwards it calls `unlock()`. The lock itself is just a variable whose value says whether some thread is inside.',
        },
        {
          type: 'p',
          text: 'Textbooks list the requirements any correct lock must meet:',
        },
        {
          type: 'table',
          headers: ['Requirement', 'Meaning', 'What breaks without it'],
          rows: [
            ['**Mutual exclusion**', 'At most one thread is inside the critical section at any time', 'Lost updates, torn data structures'],
            ['**Progress**', 'If the lock is free and threads want it, one of them gets it; the decision cannot be postponed forever by threads that are not trying', 'Everyone waits for nobody: a lock that can stall with the door open'],
            ['**Bounded waiting** (fairness)', 'Once a thread asks, there is a limit on how many others can enter ahead of it', 'Starvation: an unlucky thread never gets in'],
            ['**Performance**', 'Low cost when uncontended; little wasted CPU when contended; scales with cores', 'A correct lock that makes the game slower than single-threaded'],
          ],
        },
        {
          type: 'p',
          text: 'The obvious first attempt uses a plain flag:',
        },
        {
          type: 'compare',
          left: {
            title: 'Broken: check, then set',
            tone: 'bad',
            code: `bool busy = false;

void lock() {
    while (busy) { }   // wait until free
    busy = true;       // claim it
}
void unlock() { busy = false; }`,
            text: 'Thread A sees `busy == false` and leaves the loop. Before it sets the flag, thread B also sees `false`. Both set it and both enter. The check and the set are two steps, the same disease as `counter++`. (It is also a data race on `busy`, so the compiler may even hoist the load out of the loop.)',
          },
          right: {
            title: 'What we need',
            tone: 'good',
            text: 'The check and the set must happen as **one indivisible step**: "set the flag, and tell me whether it was already set". No amount of clever ordering of ordinary loads and stores gives that cheaply on modern hardware, so the CPU provides special instructions for it.',
          },
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Locks made of plain loads and stores',
          text: 'Dekker (1960s) and Peterson (1981) found mutual-exclusion algorithms that use only ordinary reads and writes. They are beautiful and they appear in every textbook, but as the *Memory Models and Atomics* lesson in Computer Architecture showed, they assume sequential consistency. On real x86 or ARM hardware, with store buffers, they fail unless every access is `seq_cst`, and they only work for a fixed number of threads. Nobody builds production locks that way.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'If `while (busy) { }` and `busy = true;` are on adjacent lines, a thread is preempted between them so rarely that the plain `bool` lock is safe in practice.',
      answer: false,
      explanation:
        'Preemption is not even required: on a multicore CPU, two threads can execute the check at the **same instant** on different cores, both see `false`, and both enter. Rare bugs are the worst kind, because they survive testing and appear on players\' machines, with different core counts and timing. And because `busy` is a plain `bool` accessed from several threads, the program has a data race and undefined behavior on top of the logic bug. Mutual exclusion needs an atomic read-modify-write.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Why not just disable interrupts?',
      blocks: [
        {
          type: 'p',
          text: 'On a single-core machine there is a blunt solution. The only way another thread can run in the middle of your critical section is a timer or device interrupt that leads to a context switch. So: disable interrupts (`cli` on x86) at the start of the critical section, enable them (`sti`) at the end. Nothing can interrupt you, so nothing can interleave with you.',
        },
        {
          type: 'list',
          items: [
            '**It is privileged.** `cli` is a kernel-mode instruction; in user mode it faults. And rightly so: a program allowed to switch off interrupts could keep the CPU forever, by accident or on purpose, and the OS would never get it back.',
            '**It does nothing on multicore.** Disabling interrupts affects only the current core. A thread on another core walks straight into the critical section.',
            '**It loses events.** While interrupts are off, a disk completion or network packet must wait; hold them off too long and interrupts can be missed or delayed, hurting latency for everything.',
            '**It is slow** on modern CPUs relative to an uncontended atomic instruction.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the kernel still does it, briefly',
          text: 'Inside the kernel, code shared with an interrupt handler must be protected from that handler, which might run on the same core in the middle of the critical section and try to take the same lock, deadlocking against itself. Linux therefore has `spin_lock_irqsave`, which disables interrupts **on this core** (against the handler) and takes a spinlock (against other cores). The critical section is kept to a few instructions. It is a kernel tool for a kernel problem, never a user-space lock.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: 'A student proposes protecting a game\'s shared particle buffer by disabling interrupts around each update. Which is the **most fundamental** reason this cannot work in a normal game on Windows or Linux?',
      options: [
        { text: 'Disabling interrupts makes the critical section slower than a mutex', why: 'It may well be slower, but even an infinitely fast version would still be wrong for the reasons below.' },
        { text: 'User-mode code is not allowed to disable interrupts, and even in the kernel it would only stop preemption on one core while other cores keep running', correct: true, why: 'Both halves are fatal. The instruction faults in user mode, and on a multicore CPU it would not exclude the other cores anyway.' },
        { text: 'The C++ standard does not define interrupts, so the compiler would remove the instructions', why: 'Compilers do not remove inline `cli`/`sti`. The problem is the hardware and OS rules, not the language.' },
        { text: 'Interrupts are already disabled while user code runs', why: 'The opposite: user code always runs with interrupts enabled, which is how the timer interrupt lets the OS take the CPU back.' },
      ],
      explanation:
        'Disabling interrupts was the classic lock on uniprocessor machines and is still used for tiny kernel critical sections. For everything else, mutual exclusion needs a mechanism that works across cores: an atomic read-modify-write instruction that the coherence protocol makes indivisible across the whole machine.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Hardware help: test-and-set and compare-and-swap',
      blocks: [
        {
          type: 'p',
          text: 'Every multicore CPU provides atomic read-modify-write instructions. The three you meet most:',
        },
        {
          type: 'table',
          headers: ['Primitive', 'Does atomically', 'x86-64', 'C++'],
          rows: [
            ['**[[test-and-set|Test-and-set]]** (exchange)', 'Write a new value, return the old one', '`xchg`', '`atomic_flag::test_and_set`, `atomic::exchange`'],
            ['**Compare-and-swap** ([[compare-exchange|CAS]])', 'If the value equals *expected*, write *desired*; report success and the value seen', '`lock cmpxchg`', '`compare_exchange_strong` / `_weak`'],
            ['**Fetch-and-add**', 'Add, return the old value', '`lock xadd`', '`atomic::fetch_add`'],
          ],
        },
        {
          type: 'p',
          text: 'ARM chips build all of these from a pair called load-linked/store-conditional (`ldxr`/`stxr`): the store fails if anyone touched the location since the load, and the code retries. Newer ARM cores (ARMv8.1 and later) also have single-instruction atomics. Either way, test-and-set is enough for a [[spinlock|lock]]: set the flag, and if its **old** value was clear, you got it. Step through two cores contending:',
        },
        {
  "type": "algo",
  "view": "graph",
  "nodes": [
    {
      "id": "T1",
      "x": 70,
      "y": 60,
      "label": "T1"
    },
    {
      "id": "T2",
      "x": 70,
      "y": 200,
      "label": "T2"
    },
    {
      "id": "L",
      "x": 230,
      "y": 130,
      "label": "flag 0"
    },
    {
      "id": "C",
      "x": 370,
      "y": 130,
      "label": "counter 0"
    }
  ],
  "edges": [
    {
      "from": "T1",
      "to": "L"
    },
    {
      "from": "T2",
      "to": "L"
    },
    {
      "from": "L",
      "to": "C",
      "label": "guards"
    }
  ],
  "width": 440,
  "height": 260,
  "code": "std::atomic_flag locked; // clear=free\n\nvoid worker() {\n  while (locked.test_and_set(acq))\n    ;  // spin: someone holds it\n  ++counter;  // critical section\n  locked.clear(rel);\n}",
  "interval": 1300,
  "caption": "A test-and-set spinlock (`acq`/`rel` are short for `std::memory_order_acquire`/`release`). Green = holds the lock, orange = acting, red flag = locked.",
  "frames": [
    {
      "note": "The lock is free (`flag` clear). Both threads, on different cores, want the critical section.",
      "lines": [
        1
      ],
      "nodeLabels": [
        {
          "id": "L",
          "label": "flag 0"
        },
        {
          "id": "C",
          "label": "counter 0"
        }
      ],
      "nodeColors": [
        {
          "id": "L",
          "color": "gray"
        }
      ],
      "nodeNotes": [
        {
          "id": "T1",
          "text": "running"
        },
        {
          "id": "T2",
          "text": "running"
        }
      ],
      "edgeColors": [],
      "vars": [
        [
          "flag",
          "0"
        ],
        [
          "counter",
          "0"
        ],
        [
          "holder",
          "nobody"
        ]
      ]
    },
    {
      "note": "T1: `test_and_set` atomically sets the flag and returns the **old** value, 0 (false). T1 owns the lock.",
      "lines": [
        4
      ],
      "nodeLabels": [
        {
          "id": "L",
          "label": "flag 1"
        },
        {
          "id": "C",
          "label": "counter 0"
        }
      ],
      "nodeColors": [
        {
          "id": "T1",
          "color": "green"
        },
        {
          "id": "L",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "T1",
          "text": "holds lock"
        },
        {
          "id": "T2",
          "text": "running"
        }
      ],
      "edgeColors": [
        {
          "from": "T1",
          "to": "L",
          "color": "green"
        }
      ],
      "vars": [
        [
          "flag",
          "1"
        ],
        [
          "counter",
          "0"
        ],
        [
          "holder",
          "T1"
        ]
      ]
    },
    {
      "note": "T2: `test_and_set` returns 1 (true): the flag was already set. Setting it again changes nothing. T2 loops.",
      "lines": [
        4
      ],
      "nodeLabels": [
        {
          "id": "L",
          "label": "flag 1"
        },
        {
          "id": "C",
          "label": "counter 0"
        }
      ],
      "nodeColors": [
        {
          "id": "T1",
          "color": "green"
        },
        {
          "id": "T2",
          "color": "orange"
        },
        {
          "id": "L",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "T1",
          "text": "holds lock"
        },
        {
          "id": "T2",
          "text": "spun 1×"
        }
      ],
      "edgeColors": [
        {
          "from": "T1",
          "to": "L",
          "color": "green"
        },
        {
          "from": "T2",
          "to": "L",
          "color": "red"
        }
      ],
      "vars": [
        [
          "flag",
          "1"
        ],
        [
          "counter",
          "0"
        ],
        [
          "holder",
          "T1"
        ]
      ]
    },
    {
      "note": "T1 runs the critical section while T2 burns its core retrying.",
      "lines": [
        6
      ],
      "nodeLabels": [
        {
          "id": "L",
          "label": "flag 1"
        },
        {
          "id": "C",
          "label": "counter 1"
        }
      ],
      "nodeColors": [
        {
          "id": "T1",
          "color": "green"
        },
        {
          "id": "L",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "T1",
          "text": "holds lock"
        },
        {
          "id": "T2",
          "text": "spun 1×"
        }
      ],
      "edgeColors": [
        {
          "from": "T1",
          "to": "L",
          "color": "green"
        },
        {
          "from": "L",
          "to": "C",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "flag",
          "1"
        ],
        [
          "counter",
          "1"
        ],
        [
          "holder",
          "T1"
        ]
      ]
    },
    {
      "note": "T2 tries again: still 1. Each attempt is a locked write to the flag's cache line.",
      "lines": [
        4
      ],
      "nodeLabels": [
        {
          "id": "L",
          "label": "flag 1"
        },
        {
          "id": "C",
          "label": "counter 1"
        }
      ],
      "nodeColors": [
        {
          "id": "T1",
          "color": "green"
        },
        {
          "id": "T2",
          "color": "orange"
        },
        {
          "id": "L",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "T1",
          "text": "holds lock"
        },
        {
          "id": "T2",
          "text": "spun 2×"
        }
      ],
      "edgeColors": [
        {
          "from": "T1",
          "to": "L",
          "color": "green"
        },
        {
          "from": "T2",
          "to": "L",
          "color": "red"
        }
      ],
      "vars": [
        [
          "flag",
          "1"
        ],
        [
          "counter",
          "1"
        ],
        [
          "holder",
          "T1"
        ]
      ]
    },
    {
      "note": "T1 calls `clear` (a release store). The lock is free again.",
      "lines": [
        7
      ],
      "nodeLabels": [
        {
          "id": "L",
          "label": "flag 0"
        },
        {
          "id": "C",
          "label": "counter 1"
        }
      ],
      "nodeColors": [
        {
          "id": "T1",
          "color": "orange"
        },
        {
          "id": "L",
          "color": "gray"
        }
      ],
      "nodeNotes": [
        {
          "id": "T1",
          "text": "running"
        },
        {
          "id": "T2",
          "text": "spun 2×"
        }
      ],
      "edgeColors": [],
      "vars": [
        [
          "flag",
          "0"
        ],
        [
          "counter",
          "1"
        ],
        [
          "holder",
          "nobody"
        ]
      ]
    },
    {
      "note": "T2's next `test_and_set` returns 0. T2 wins the lock; the acquire order makes T1's write to `counter` visible.",
      "lines": [
        4
      ],
      "nodeLabels": [
        {
          "id": "L",
          "label": "flag 1"
        },
        {
          "id": "C",
          "label": "counter 1"
        }
      ],
      "nodeColors": [
        {
          "id": "T2",
          "color": "green"
        },
        {
          "id": "L",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "T1",
          "text": "running"
        },
        {
          "id": "T2",
          "text": "holds lock"
        }
      ],
      "edgeColors": [
        {
          "from": "T2",
          "to": "L",
          "color": "green"
        }
      ],
      "vars": [
        [
          "flag",
          "1"
        ],
        [
          "counter",
          "1"
        ],
        [
          "holder",
          "T2"
        ]
      ]
    },
    {
      "note": "T2 increments. Exactly one thread was ever inside the critical section.",
      "lines": [
        6
      ],
      "nodeLabels": [
        {
          "id": "L",
          "label": "flag 1"
        },
        {
          "id": "C",
          "label": "counter 2"
        }
      ],
      "nodeColors": [
        {
          "id": "T2",
          "color": "green"
        },
        {
          "id": "L",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "T1",
          "text": "running"
        },
        {
          "id": "T2",
          "text": "holds lock"
        }
      ],
      "edgeColors": [
        {
          "from": "T2",
          "to": "L",
          "color": "green"
        },
        {
          "from": "L",
          "to": "C",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "flag",
          "1"
        ],
        [
          "counter",
          "2"
        ],
        [
          "holder",
          "T2"
        ]
      ]
    },
    {
      "note": "T2 releases. Two increments, `counter` = 2. T2 spun 2 times while waiting.",
      "lines": [
        7
      ],
      "nodeLabels": [
        {
          "id": "L",
          "label": "flag 0"
        },
        {
          "id": "C",
          "label": "counter 2"
        }
      ],
      "nodeColors": [
        {
          "id": "T2",
          "color": "orange"
        },
        {
          "id": "L",
          "color": "gray"
        }
      ],
      "nodeNotes": [
        {
          "id": "T1",
          "text": "running"
        },
        {
          "id": "T2",
          "text": "spun 2×"
        }
      ],
      "edgeColors": [],
      "vars": [
        [
          "flag",
          "0"
        ],
        [
          "counter",
          "2"
        ],
        [
          "holder",
          "nobody"
        ]
      ]
    }
  ]
},
        {
          type: 'code',
          runnable: true,
          title: 'spinlock.cpp',
          code: `#include <atomic>
#include <iostream>
#include <thread>
#include <vector>

class Spinlock {
public:
    void lock() {
        while (flag_.test_and_set(std::memory_order_acquire)) {
            while (flag_.test(std::memory_order_relaxed)) {
                // read-only wait: no writes to the cache line
            }
        }
    }
    void unlock() {
        flag_.clear(std::memory_order_release);
    }
private:
    std::atomic_flag flag_;        // C++20: starts clear
};

Spinlock spin;
long long score = 0;

int main() {
    std::vector<std::jthread> threads;
    for (int t = 0; t < 4; ++t) {
        threads.emplace_back([] {
            for (int i = 0; i < 100000; ++i) {
                spin.lock();
                ++score;
                spin.unlock();
            }
        });
    }
    threads.clear();               // join all four
    std::cout << "score = " << score << '\\n';
}`,
          output: 'score = 400000',
          annotations: [
            { lines: 9, text: 'Test-and-set: set the flag and return the old value. `false` means it was clear, so this thread now owns the lock. `acquire` ordering makes the previous owner\'s writes visible to us.' },
            { lines: '10-12', text: '**Test-and-test-and-set**: while the lock is busy, only *read* the flag (`test`, C++20). Reads are served from this core\'s cache. Retrying `test_and_set` in a tight loop would write the line on every attempt, bouncing it between cores and slowing down the owner too.' },
            { lines: 16, text: '`clear` with `release` ordering publishes everything written inside the critical section before the lock appears free.' },
            { lines: 19, text: 'Since C++20 a default-constructed `atomic_flag` is clear; before that you needed `ATOMIC_FLAG_INIT`.' },
            { lines: 6, text: '`Spinlock` has `lock` and `unlock`, so it satisfies the *BasicLockable* requirements and works with `std::lock_guard` too.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Be polite while spinning',
          text: 'Real spinlocks put a pause hint in the wait loop: `_mm_pause()` on x86 (the `pause` instruction) or `yield` on ARM. It saves power, avoids a pipeline flush when the lock is released, and on a CPU with [[simultaneous-multithreading|hyper-threading]] gives the sibling hardware thread, which might be the lock owner, more of the core.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: 'Complete the minimal spinlock.',
      template: `class Spinlock {
public:
    void lock() {
        while (flag_.___(std::memory_order_acquire)) {
            // spin
        }
    }
    void unlock() {
        flag_.___(std::memory_order____);
    }
private:
    std::atomic_flag flag_;
};`,
      blanks: [{ answers: ['test_and_set'] }, { answers: ['clear'] }, { answers: ['release'] }],
      wordBank: ['test_and_set', 'clear', 'release', 'acquire', 'relaxed', 'load', 'store'],
      explanation:
        '`test_and_set` atomically sets the flag and returns its previous value, so the loop exits exactly when this thread changed it from clear to set. `clear` resets it. The orders pair up: `acquire` on taking the lock and `release` on giving it up mean everything the previous owner wrote inside the critical section is visible to the next owner. With `relaxed` on both, the lock would still exclude, but the protected data could appear stale or half-written.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Ticket locks: taking turns fairly',
      blocks: [
        {
          type: 'p',
          text: 'The test-and-set spinlock gives mutual exclusion and progress, but not **bounded waiting**. When the lock is released, whichever core happens to win the next race gets it, and the thread that just released it, with the line still hot in its cache, often wins again. An unlucky thread can wait indefinitely: [[starvation]].',
        },
        {
          type: 'p',
          text: 'A **[[ticket-lock|ticket lock]]** works like the number dispenser at a deli counter. `fetch_add` hands out tickets in order; the lock serves them in the same order:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'ticket_lock.cpp',
          code: `#include <atomic>
#include <iostream>
#include <thread>
#include <vector>

class TicketLock {
public:
    void lock() {
        const unsigned my = next_.fetch_add(1, std::memory_order_relaxed);
        while (serving_.load(std::memory_order_acquire) != my) {
            std::this_thread::yield();   // let the holder run
        }
    }
    void unlock() {
        const unsigned n = serving_.load(std::memory_order_relaxed);
        serving_.store(n + 1, std::memory_order_release);
    }
private:
    std::atomic<unsigned> next_{0};     // next ticket to hand out
    std::atomic<unsigned> serving_{0};  // ticket now allowed in
};

TicketLock lock;
long long score = 0;

int main() {
    std::vector<std::jthread> threads;
    for (int t = 0; t < 4; ++t) {
        threads.emplace_back([] {
            for (int i = 0; i < 100000; ++i) {
                lock.lock();
                ++score;
                lock.unlock();
            }
        });
    }
    threads.clear();
    std::cout << "score = " << score << '\\n';
}`,
          output: 'score = 400000',
          annotations: [
            { lines: 9, text: 'Take a ticket. `fetch_add` guarantees every thread gets a different number, in the order they arrived.' },
            { lines: 10, text: 'Wait until the "now serving" display shows my number. Threads enter strictly in ticket order: bounded waiting.' },
            { lines: 11, text: 'See the warning below for why this line is not optional here.' },
            { lines: '15-16', text: 'Only the holder writes `serving_`, so a plain load and store (no read-modify-write) is enough to call the next number.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Fairness has a dark side: we watched it hang',
          text: 'The first version of this program spun without `yield()`. On the course\'s 2-core test machine, with 4 threads, it had not finished after **two minutes**; with `yield()` it takes about a second. A ticket lock must hand the lock to one specific thread. If the scheduler has preempted that thread, every other waiter spins uselessly for whole time slices until it runs again. A test-and-set lock would just let someone else in. Fairness and oversubscription (more threads than cores) are a terrible combination for spinning.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Linux spinlocks',
          text: 'Linux switched its kernel spinlocks to ticket locks in 2.6.25 (2008) for fairness, then in 4.2 (2015) to **queued spinlocks**, an MCS-style design in which each waiter spins on its own cache line instead of one shared counter, so a release disturbs only the next waiter\'s cache rather than every waiter\'s.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'numeric',
      prompt: 'A ticket lock currently has `next_ == 7` and `serving_ == 4`. Every thread that has taken a ticket is either holding the lock or waiting for it. How many threads are **waiting**?',
      answer: 2,
      unit: 'threads',
      hint: 'Tickets handed out so far are 0 to 6. Which of them have already been served and released?',
      explanation:
        'Tickets 0 to 3 have finished (that is why `serving_` reached 4). Tickets 4, 5 and 6 are outstanding: 7 − 4 = 3 threads. One of them, ticket 4, holds the lock, so **2** are waiting, and they will enter in the order 5, then 6. The difference `next_ − serving_` is the queue length including the holder, which is a cheap contention metric some engines log.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Spin or block?',
      blocks: [
        {
          type: 'p',
          text: 'A spinning thread occupies a core doing nothing useful. That is fine if the lock will be free in a few hundred nanoseconds, and a disaster if the owner has been preempted and will not run again for a whole [[time-slice]]. With *N* threads on one core, a holder that gets preempted makes each of the other *N* − 1 threads burn its entire slice spinning before the holder runs again.',
        },
        {
          type: 'table',
          headers: ['Aspect', 'Spin', 'Block (sleep)'],
          rows: [
            ['Cost to wait', 'Burns a core the whole time', 'Two context switches (sleep, wake) and a few microseconds of latency'],
            ['Best when', 'Critical sections are tiny, the owner is running on another core, threads ≤ cores', 'Critical sections are long or the owner may block or be preempted'],
            ['Must use when', 'You cannot sleep: interrupt handlers, the scheduler itself', 'Waiting may be long: I/O, another thread\'s work'],
          ],
        },
        {
          type: 'p',
          text: 'Blocking means asking the OS to take the thread off the CPU until the lock is released, which needs a kernel-maintained **wait queue** per lock and a way to wake exactly the right thread. Calling `yield()` in the loop is a halfway house: it gives up the CPU but leaves the thread runnable, so with many waiters the scheduler may keep picking spinners instead of the owner.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Two-phase locks',
          text: 'Most real mutexes combine both: **spin briefly, then sleep**. If the lock frees up within the spin, you saved two context switches; if not, you sleep and waste no more CPU. Windows exposes the knob in `InitializeCriticalSectionAndSpinCount`, and glibc has an "adaptive" mutex type (`PTHREAD_MUTEX_ADAPTIVE_NP`) that spins for a while first.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Spinlocks in games',
          text: 'Spinlocks are tempting in engine code because the uncontended case looks fast in a microbenchmark. In a shipped game on a player\'s PC, your threads share cores with the browser, the voice chat and the anti-virus, so the lock owner *will* get preempted sometimes, and every spinner then wastes its slice. That shows up as rare frame spikes that are hard to reproduce. Prefer `std::mutex`, which already spins a little in good implementations, unless measurements prove otherwise.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'In which situation is a pure spinlock the **best** choice?',
      options: [
        { text: 'Protecting a save-file write that takes 30 ms, on a 4-core PC running 12 game threads', why: 'A long critical section plus more threads than cores is the worst case for spinning: waiters burn whole time slices.' },
        { text: 'Protecting a 20-instruction update in kernel code that also runs inside an interrupt handler, on a multicore machine', correct: true, why: 'Interrupt handlers cannot sleep, so blocking is impossible, and the section is tiny. This is exactly where kernels use spinlocks (with interrupts disabled on the local core).' },
        { text: 'A worker thread waiting for the streaming thread to finish loading a texture', why: 'Loading can take milliseconds or more, and it is a wait for an event, not for a lock. Use a condition variable, future or semaphore so the worker sleeps.' },
        { text: 'Any lock in a single-core embedded system, because spinning has no overhead there', why: 'On a single core spinning is pointless: the owner cannot release the lock while the spinner occupies the only core, so the spinner just wastes its time slice.' },
      ],
      explanation:
        'Spin only when the expected wait is shorter than the cost of sleeping and waking (a few microseconds), the owner is running on another core, or sleeping is not allowed. Otherwise block. When in doubt, use a mutex that spins briefly before sleeping.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Futexes: how std::mutex is built',
      blocks: [
        {
          type: 'p',
          text: 'Blocking needs the kernel, but [[system-call|system calls]] cost hundreds of nanoseconds even when they do nothing. Most locks are uncontended most of the time, so a lock that entered the kernel on every `lock()` would be slow for no reason. Linux\'s answer (2002) is the **[[futex]]**, "fast user-space mutex": the lock state lives in an ordinary integer in your memory, and the kernel only provides a wait queue keyed by that integer\'s address.',
        },
        {
          type: 'list',
          items: [
            '`futex(&word, FUTEX_WAIT, val)`: put me to sleep **if `word` still equals `val`**. The kernel checks and sleeps atomically with respect to wakeups, so a wake that happens just before the sleep cannot be lost.',
            '`futex(&word, FUTEX_WAKE, n)`: wake up to *n* threads sleeping on `word`.',
          ],
        },
        {
          type: 'figure',
          svg: "<svg viewBox=\"0 0 520 330\" xmlns=\"http://www.w3.org/2000/svg\"><text x=\"12\" y=\"20\" font-size=\"12\" class=\"t-gray\">user space (your process)</text><rect x=\"190\" y=\"40\" width=\"140\" height=\"56\" rx=\"6\" fill=\"currentColor\" fill-opacity=\"0.08\" stroke=\"currentColor\" stroke-width=\"1.8\" class=\"s-purple f-purple\"/><text x=\"260\" y=\"62\" text-anchor=\"middle\" font-size=\"12\" class=\"t-purple\">std::atomic&lt;int&gt; state</text><text x=\"260\" y=\"84\" text-anchor=\"middle\" font-size=\"16\" font-family=\"monospace\" class=\"t-purple\">2</text><text x=\"260\" y=\"112\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\">0 free \u00b7 1 locked \u00b7 2 locked, sleepers</text><rect x=\"24\" y=\"40\" width=\"96\" height=\"40\" rx=\"6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" class=\"s-green\"/><text x=\"72\" y=\"58\" text-anchor=\"middle\" font-size=\"12\" class=\"t-green\">T1 (owner)</text><text x=\"72\" y=\"73\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\">running</text><path d=\"M120,60 L180,64\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-green\"/><path d=\"M190,65 L180,59 L179,69 Z\" class=\"f-green\"/><text x=\"150\" y=\"52\" text-anchor=\"middle\" font-size=\"10\" class=\"t-green\">CAS 0\u21921</text><text x=\"150\" y=\"88\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\">fast path:</text><text x=\"150\" y=\"100\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\">no syscall</text><rect x=\"400\" y=\"40\" width=\"96\" height=\"40\" rx=\"6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" class=\"s-orange\"/><text x=\"448\" y=\"58\" text-anchor=\"middle\" font-size=\"12\" class=\"t-orange\">T2, T3</text><text x=\"448\" y=\"73\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\">found it locked</text><path d=\"M400,60 L340,64\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-orange\"/><path d=\"M330,65 L340,59 L341,69 Z\" class=\"f-orange\"/><text x=\"370\" y=\"52\" text-anchor=\"middle\" font-size=\"10\" class=\"t-orange\">set 2</text><path d=\"M0,150 L520,150\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-dasharray=\"6 4\" class=\"s-gray\"/><text x=\"12\" y=\"172\" font-size=\"12\" class=\"t-gray\">kernel</text><path d=\"M484,80 L484,240\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-orange\"/><path d=\"M484,250 L478,238 L490,238 Z\" class=\"f-orange\"/><text x=\"476\" y=\"190\" text-anchor=\"end\" font-size=\"10\" class=\"t-orange\">futex(WAIT,</text><text x=\"476\" y=\"203\" text-anchor=\"end\" font-size=\"10\" class=\"t-orange\">&amp;state, 2)</text><rect x=\"150\" y=\"190\" width=\"220\" height=\"44\" rx=\"6\" fill=\"currentColor\" fill-opacity=\"0.06\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-blue f-blue\"/><text x=\"260\" y=\"208\" text-anchor=\"middle\" font-size=\"12\" class=\"t-blue\">futex hash table</text><text x=\"260\" y=\"225\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\">bucket chosen by the address of state</text><rect x=\"380\" y=\"250\" width=\"64\" height=\"30\" rx=\"5\" fill=\"currentColor\" fill-opacity=\"0.1\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-orange f-orange\"/><text x=\"412\" y=\"270\" text-anchor=\"middle\" font-size=\"11\">T2 asleep</text><rect x=\"452\" y=\"250\" width=\"64\" height=\"30\" rx=\"5\" fill=\"currentColor\" fill-opacity=\"0.1\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-orange f-orange\"/><text x=\"484\" y=\"270\" text-anchor=\"middle\" font-size=\"11\">T3 asleep</text><path d=\"M260,234 L260,265 L370,265\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.2\" class=\"s-blue\"/><path d=\"M380,265 L370,259 L370,271 Z\" class=\"f-blue\"/><text x=\"300\" y=\"256\" font-size=\"10\" class=\"t-blue\">wait queue</text><path d=\"M72,80 L72,206 L140,206\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-green\" stroke-dasharray=\"4 3\"/><path d=\"M150,206 L140,200 L140,212 Z\" class=\"f-green\"/><text x=\"80\" y=\"128\" font-size=\"10\" class=\"t-green\">unlock: exchange 0,</text><text x=\"80\" y=\"141\" font-size=\"10\" class=\"t-green\">old was 2, so</text><text x=\"72\" y=\"228\" text-anchor=\"middle\" font-size=\"10\" class=\"t-green\">futex(WAKE, 1)</text><text x=\"260\" y=\"312\" text-anchor=\"middle\" font-size=\"11\" class=\"t-gray\">The kernel only gets involved when a thread must actually sleep or be woken.</text></svg>",
          alt: 'In user space, T1 takes the lock by compare-and-swap of the state word from 0 to 1 without a system call. T2 and T3 find it locked, set the state to 2, and call futex WAIT, which places them on a kernel wait queue found through a futex hash table keyed by the state word\'s address. On unlock, T1 exchanges the state to 0, sees the old value 2, and calls futex WAKE to wake one sleeper.',
          caption: 'The lock lives in your memory. The kernel holds only the sleepers, filed under the word\'s address.',
        },
        {
          type: 'p',
          text: 'This is the classic three-state mutex from Ulrich Drepper\'s paper *Futexes Are Tricky*, written with `std::atomic` and the raw system call:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'futex_mutex.cpp (Linux only)',
          code: `#include <linux/futex.h>
#include <sys/syscall.h>
#include <unistd.h>
#include <atomic>
#include <iostream>
#include <thread>
#include <vector>

// 0 = unlocked, 1 = locked, 2 = locked and someone may be asleep
class FutexMutex {
public:
    void lock() {
        int c = 0;
        if (state_.compare_exchange_strong(c, 1,
                std::memory_order_acquire)) {
            return;                         // fast path: no syscall
        }
        if (c != 2) {
            c = state_.exchange(2, std::memory_order_acquire);
        }
        while (c != 0) {                    // slow path: sleep
            futex(FUTEX_WAIT_PRIVATE, 2);
            c = state_.exchange(2, std::memory_order_acquire);
        }
    }
    void unlock() {
        if (state_.exchange(0, std::memory_order_release) == 2) {
            futex(FUTEX_WAKE_PRIVATE, 1);   // wake one sleeper
        }
    }
private:
    void futex(int op, int val) {
        syscall(SYS_futex, reinterpret_cast<int*>(&state_), op, val,
                nullptr, nullptr, 0);
    }
    std::atomic<int> state_{0};
};

FutexMutex m;
long long score = 0;

int main() {
    static_assert(sizeof(std::atomic<int>) == sizeof(int));
    std::vector<std::jthread> threads;
    for (int t = 0; t < 4; ++t) {
        threads.emplace_back([] {
            for (int i = 0; i < 100000; ++i) {
                m.lock();
                ++score;
                m.unlock();
            }
        });
    }
    threads.clear();
    std::cout << "score = " << score << '\\n';
}`,
          output: 'score = 400000',
          annotations: [
            { lines: '14-17', text: 'Fast path: one CAS from 0 to 1. When nobody else wants the lock, `lock()` costs one atomic instruction and never enters the kernel.' },
            { lines: '18-20', text: 'Contended: mark the lock as "2, there may be sleepers" so that the eventual `unlock` knows it has to wake someone. If the exchange returns 0, the lock was freed meanwhile and we now own it (in state 2, which only costs a harmless extra wake later).' },
            { lines: '21-24', text: 'Sleep in the kernel, but only if the word is still 2. If the owner unlocked in the meantime, `FUTEX_WAIT` returns at once and we retry. That check-and-sleep is what makes lost wakeups impossible.' },
            { lines: '27-29', text: 'Unlock: set 0. Only if the old value was 2 can anyone be asleep, so only then pay for the `FUTEX_WAKE` system call.' },
            { lines: '33-34', text: 'glibc has no `futex()` wrapper, so we use `syscall`. `_PRIVATE` tells the kernel the word is not shared with other processes, which makes the hash lookup cheaper.' },
          ],
        },
        {
          type: 'p',
          text: 'Real `std::mutex` works the same way. With libstdc++ it wraps glibc\'s `pthread_mutex_t`, which is futex-based. A single-threaded loop of 1,000,000 lock/unlock pairs under `strace -c` made exactly **one** futex call in the whole run (from library start-up, not the mutex): an uncontended lock is a user-space atomic, not a system call.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Windows and C++20',
          text: 'Windows offers the same idea as `WaitOnAddress` / `WakeByAddressSingle` (Windows 8 and later), and its slim reader/writer lock `SRWLOCK` keeps its state in one pointer-sized word; Microsoft\'s STL builds `std::mutex` on `SRWLOCK`. C++20 exposes futex-style waiting directly: `std::atomic<T>::wait(old)` blocks while the value equals `old`, and `notify_one()` wakes a waiter. On Linux, libstdc++ implements them with futexes.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'order',
      prompt: 'Two threads use the three-state futex mutex. Put the events in order, starting from an unlocked mutex.',
      lines: [
        'T1: CAS 0 → 1 succeeds; T1 owns the lock without a system call',
        'T2: CAS fails, so T2 exchanges the state to 2',
        'T2: `futex(WAIT, &state, 2)`; the kernel sees 2 and puts T2 to sleep',
        'T1: unlock exchanges the state to 0 and sees the old value 2',
        'T1: `futex(WAKE, &state, 1)`; the kernel makes T2 runnable',
        'T2: wakes, exchanges the state to 2, sees the old value 0, and owns the lock',
      ],
      linesAreCode: false,
      explanation:
        'T2 can only sleep after marking the state 2, and T1\'s unlock only issues a wake because it found that 2. If T1 had unlocked between T2\'s exchange and T2\'s `FUTEX_WAIT`, the state would be 0, not 2, and the kernel would refuse to sleep, returning immediately so T2 retries: that compare-before-sleep inside the kernel is the whole trick. T2 sets the state to 2 again on wake-up because it cannot know whether other sleepers remain, so it errs on the side of a possibly unnecessary wake.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'concept',
      title: 'Lock granularity and contention',
      blocks: [
        {
          type: 'p',
          text: 'A correct lock can still destroy performance if every thread needs it all the time. **Contention**, threads waiting for the same lock, serializes them: four workers contending on one lock run about as fast as one worker, plus the cost of all that waiting. You reduce contention in three ways: hold locks for less time, lock smaller pieces of data, or stop sharing.',
        },
        {
          type: 'table',
          headers: ['Strategy', 'Example', 'Cost'],
          rows: [
            ['One big lock', 'One mutex for the whole entity system', 'Simple and safe; scales to about one core'],
            ['Lock per structure', 'Separate locks for the audio queue, the log and the asset registry', 'Easy; watch the order when you need two'],
            ['Lock striping', 'A hash map with one lock per group of buckets', 'Scales well; operations across stripes (resize, iterate) get hard'],
            ['Per-thread data, merged later', 'Each worker counts stats or collects draw calls locally, merged once per frame', 'Fastest: no lock in the hot path at all'],
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'The Big Kernel Lock',
          text: 'When Linux 2.0 added multiprocessor support in 1996, it protected the entire kernel with one lock, so only one CPU could execute kernel code at a time. Correctness came for free and scalability did not. Kernel developers spent the next fifteen years breaking it into thousands of fine-grained locks; the Big Kernel Lock was finally removed in Linux 2.6.39 in 2011. Python\'s Global Interpreter Lock is the same trade-off, made for the same reason.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Even a free lock is shared memory',
          text: 'Every acquire writes the lock\'s cache line, so a lock taken by many cores bounces between their caches even when nobody waits: tens to a hundred-plus nanoseconds per transfer. Two unrelated locks in the same cache line contend through [[false-sharing]]. Give hot locks their own line (`alignas(std::hardware_destructive_interference_size)`), and prefer data that each thread owns.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Smaller locks, new bugs',
          text: 'Splitting a lock is not free in correctness either. An invariant that spans two pieces of data ("gold in all accounts adds up to the same total") now spans two locks, so an operation must hold both, which raises the deadlock risk of the next unit. And locking each *call* is not the same as locking each *operation*, as the next question shows.',
        },
      ],
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'bug',
      prompt: '`Inventory` locks its mutex inside every member function. Several threads call `tryLoot`, and inventories occasionally end up with **more** than `maxSlots` items. Tap the line where the race is.',
      code: `class Inventory {
public:
    int count() const {
        std::lock_guard lock{m_};
        return static_cast<int>(items_.size());
    }
    void add(Item item) {
        std::lock_guard lock{m_};
        items_.push_back(std::move(item));
    }
private:
    mutable std::mutex m_;
    std::vector<Item> items_;
};

bool tryLoot(Inventory& inv, Item item) {
    if (inv.count() < maxSlots) {
        inv.add(std::move(item));
        return true;
    }
    return false;
}`,
      bugLines: [17, 18],
      hint: 'Every individual access is locked. What is not?',
      explanation:
        'There is no data race, but there is a **race condition** (an atomicity violation): the check on line 17 and the add on line 18 each take the lock separately, and between them another thread can add the last free slot. Both threads saw 19 of 20 slots used and both add. The fix is to make check-and-add one critical section, for example a member `bool tryAdd(Item item)` that holds `m_` across both steps. Locks protect invariants only if they cover the whole operation that must appear indivisible.',
    },
    // ------------------------------------------------------------------ 17
    {
      kind: 'truefalse',
      prompt: 'On Linux, every call to `std::mutex::lock()` enters the kernel, which is why mutexes are slower than atomics.',
      answer: false,
      explanation:
        'An uncontended `std::mutex::lock()` is one atomic compare-and-swap in user space, thanks to the futex design: the kernel is called only when a thread actually has to sleep or be woken. A mutex costs more than a single atomic increment because it needs at least two atomic operations (lock and unlock) and is contended for longer, not because of system calls. Measure contention, not the mere presence of a mutex.',
    },
  ],
  takeaways: [
    '`++counter` is load, add, store. A context switch or another core between them loses updates; a locked instruction such as `lock add` makes it indivisible.',
    'A lock must give mutual exclusion, progress and bounded waiting, and should be cheap when uncontended.',
    'Disabling interrupts works only in the kernel and only on one core; user-space locks need atomic read-modify-write instructions.',
    'A test-and-set spinlock is a few lines with `std::atomic_flag`; test-and-test-and-set reduces cache-line traffic, and ticket locks add FIFO fairness.',
    'Spin only for very short waits when the owner is running; otherwise block. Fair spinlocks and oversubscription are a disastrous mix.',
    'A futex keeps the lock word in user memory and the wait queue in the kernel, so `std::mutex` costs no system call unless there is contention.',
    'Reduce contention by holding locks briefly, splitting them sensibly or not sharing at all, and lock whole operations, not individual calls.',
  ],
  reading: [
    {
      title: 'Operating Systems: Three Easy Pieces, "Locks" chapter',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf',
      source: 'book',
      note: 'Builds locks from interrupts, test-and-set, compare-and-swap, ticket locks and Linux futexes, with the same criteria as this lesson.',
    },
    {
      title: 'futex(2) — Linux manual page',
      url: 'https://man7.org/linux/man-pages/man2/futex.2.html',
      source: 'other',
      note: 'The exact semantics of `FUTEX_WAIT` and `FUTEX_WAKE`, and why the kernel compares the value before sleeping.',
    },
    {
      title: 'std::atomic_flag',
      url: 'https://en.cppreference.com/w/cpp/atomic/atomic_flag',
      source: 'cppreference',
      note: 'The only type guaranteed lock-free on every platform, with `test_and_set`, `clear`, and the C++20 `test`, `wait` and `notify`.',
    },
    {
      title: 'Slim Reader/Writer (SRW) Locks',
      url: 'https://learn.microsoft.com/en-us/windows/win32/sync/slim-reader-writer--srw--locks',
      source: 'other',
      note: 'The lightweight Windows lock that sits under Microsoft\'s `std::mutex`.',
    },
  ],
};
