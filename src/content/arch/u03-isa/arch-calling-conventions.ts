import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-calling-conventions',
  title: 'Calling Conventions and the Stack Frame',
  summary: 'What call and ret really do, how stack frames are built and torn down, how Linux and Windows pass arguments and structs, and why a buffer overrun can hijack the return address.',
  minutes: 20,
  objectives: [
    'Explain the call stack in hardware terms: rsp, push/pop, call/ret and the return address',
    'Read a function prologue and epilogue, with and without a frame pointer',
    'Compare the System V AMD64 and Microsoft x64 conventions: argument registers, red zone, shadow space and stack alignment',
    'Distinguish callee-saved from caller-saved registers and predict which values survive a call',
    'Predict how structs are passed and returned on each platform',
    'Explain how stack overflows and buffer overruns corrupt return addresses, and how canaries, NX, ASLR and shadow stacks defend against it',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The call stack is just memory and one register',
      blocks: [
        {
          type: 'p',
          text: 'In C++ Fundamentals you pictured the [[call-stack]] as a pile of [[stack-frame|stack frames]], one per active call. In hardware there is no special stack memory at all: the stack is an ordinary region of RAM, and the only thing that makes it a stack is the [[stack-pointer]] register `rsp`, which holds the address of the top item. On x86-64 the stack **grows down**: pushing moves `rsp` to lower addresses.',
        },
        {
          type: 'table',
          headers: ['Instruction', 'Does exactly this'],
          rows: [
            ['`push rbx`', '`rsp -= 8;` then store `rbx` at `[rsp]`'],
            ['`pop rbx`', 'load `rbx` from `[rsp]`; then `rsp += 8`'],
            ['`call f`', 'push the address of the *next* instruction, then jump to `f`'],
            ['`ret`', 'pop an address into `rip` (the program counter)'],
          ],
        },
        {
          type: 'p',
          text: 'The pushed address is the **[[return-address]]**. It is the only thing that connects a function to its caller: `ret` does not know who called it, it simply jumps to whatever 8 bytes sit at `[rsp]`. Here is a real call, linked and disassembled:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'objdump -d -M intel game (g++ 13 -O2)',
          code: `    1054:   bf 03 00 00 00          mov    edi,0x3
    1059:   e8 12 01 00 00          call   1170 <_Z8nextWavei>
    105e:   8b 15 ac 2f 00 00       mov    edx,DWORD PTR [rip+0x2fac]`,
          annotations: [
            { lines: 1, text: 'The argument 3 goes into `edi` first.' },
            { lines: 2, text: '`e8` is `call` with a 32-bit offset **relative to the next instruction**: `0x105e + 0x112 = 0x1170`. Before jumping, it pushes `0x105e`.' },
            { lines: 3, text: 'When `nextWave` executes `ret`, it pops `0x105e` into `rip` and execution continues right here.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why grow down?',
          text: 'Historically, a process put its code and heap at low addresses and the stack at the top of memory, so the two could grow toward each other and share the free space between them without either needing a fixed size. Nothing in modern x86-64 hardware would stop an upward-growing stack, but `push`, `pop`, `call` and `ret` are defined to go down, and every ABI follows.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Watch the stack grow and shrink',
      blocks: [
        {
          type: 'p',
          text: 'This program makes two nested calls. It is compiled at `-O0`, so every function builds a classic frame and every variable gets a stack slot, which makes the stack easy to watch. The animation below is a real gdb trace, one instruction per step.',
        },
        {
          type: 'code',
          title: 'frames.cpp (compiled with g++ -O0)',
          code: `long clampHp(long hp) {
    return hp < 0 ? 0 : hp;
}
long takeHit(long hp, long dmg) {
    long left = hp - dmg;
    return clampHp(left);
}
int main() {
    long hp = takeHit(30, 45);
    return static_cast<int>(hp);
}`,
          annotations: [
            { lines: '1-3', text: 'A **leaf** function: it calls nothing. Watch where it keeps `hp`.' },
            { lines: 5, text: '`left` = 30 - 45 = -15, stored in `takeHit`\'s frame.' },
            { lines: 9, text: '`long` is used so each value fills one 8-byte stack slot.' },
          ],
        },
        {
          "type": "algo",
          "view": "array",
          "code": "_Z7clampHpl:\n    push    rbp\n    mov     rbp, rsp\n    mov     QWORD PTR -8[rbp], rdi\n    mov     rax, QWORD PTR -8[rbp]\n    mov     edx, 0\n    test    rax, rax\n    cmovs   rax, rdx\n    pop     rbp\n    ret\n_Z7takeHitll:\n    push    rbp\n    mov     rbp, rsp\n    sub     rsp, 32\n    mov     QWORD PTR -24[rbp], rdi\n    mov     QWORD PTR -32[rbp], rsi\n    mov     rax, QWORD PTR -24[rbp]\n    sub     rax, QWORD PTR -32[rbp]\n    mov     QWORD PTR -8[rbp], rax\n    mov     rax, QWORD PTR -8[rbp]\n    mov     rdi, rax\n    call    _Z7clampHpl\n    leave\n    ret\nmain:\n    push    rbp\n    mov     rbp, rsp\n    sub     rsp, 16\n    mov     esi, 45\n    mov     edi, 30\n    call    _Z7takeHitll\n    mov     QWORD PTR -8[rbp], rax\n    mov     rax, QWORD PTR -8[rbp]\n    leave\n    ret",
          "lang": "text",
          "interval": 1100,
          "caption": "Real -O0 code from g++ 13 (`-O0 -fcf-protection=none`), traced instruction by instruction in gdb. Slot 0 is the highest address; the stack grows to the right. Purple = return address, teal = saved `rbp`, orange = just written, faded = below `rsp` (dead).",
          "frames": [
            {
              "note": "`main` has just been called: slot 0 holds its return address into the C library. Each box is one 8-byte slot; addresses fall to the right.",
              "array": [
                "ret",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                }
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "rsp",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "in",
                  "main"
                ],
                [
                  "rsp",
                  "…63d8"
                ],
                [
                  "rbp",
                  "…6470"
                ],
                [
                  "rax",
                  "?"
                ]
              ],
              "dim": [
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12
              ]
            },
            {
              "note": "`push rbp` saves the caller's frame pointer; `rsp` moves down 8 bytes.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 1,
                  "label": "rsp",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "in",
                  "main"
                ],
                [
                  "rsp",
                  "…63d0"
                ],
                [
                  "rbp",
                  "…6470"
                ],
                [
                  "rax",
                  "?"
                ]
              ],
              "dim": [
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12
              ],
              "lines": [
                26
              ]
            },
            {
              "note": "`mov rbp, rsp`: `rbp` now marks the base of `main`'s frame.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 1,
                  "label": "rsp, rbp",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "in",
                  "main"
                ],
                [
                  "rsp",
                  "…63d0"
                ],
                [
                  "rbp",
                  "…63d0"
                ],
                [
                  "rax",
                  "?"
                ]
              ],
              "dim": [
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12
              ],
              "lines": [
                27
              ]
            },
            {
              "note": "`sub rsp, 16` reserves two slots for `main`'s locals. Nothing is written yet, so they hold leftover bytes.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 3,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 1,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "main"
                ],
                [
                  "rsp",
                  "…63c0"
                ],
                [
                  "rbp",
                  "…63d0"
                ],
                [
                  "rax",
                  "?"
                ]
              ],
              "dim": [
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12
              ],
              "lines": [
                28
              ]
            },
            {
              "note": "The second argument, 45, goes into `esi`. Arguments travel in registers, not on the stack.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 3,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 1,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "main"
                ],
                [
                  "rsp",
                  "…63c0"
                ],
                [
                  "rbp",
                  "…63d0"
                ],
                [
                  "rax",
                  "?"
                ]
              ],
              "dim": [
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12
              ],
              "lines": [
                29
              ]
            },
            {
              "note": "The first argument, 30, goes into `edi`.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 3,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 1,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "main"
                ],
                [
                  "rsp",
                  "…63c0"
                ],
                [
                  "rbp",
                  "…63d0"
                ],
                [
                  "rax",
                  "?"
                ]
              ],
              "dim": [
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12
              ],
              "lines": [
                30
              ]
            },
            {
              "note": "`call` pushes the return address (the next instruction in `main`) and jumps to `takeHit`.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 4,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 1,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "takeHit"
                ],
                [
                  "rsp",
                  "…63b8"
                ],
                [
                  "rbp",
                  "…63d0"
                ],
                [
                  "rax",
                  "?"
                ]
              ],
              "dim": [
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12
              ],
              "lines": [
                31
              ]
            },
            {
              "note": "`takeHit`'s prologue starts: save `main`'s `rbp`.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 5,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 1,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "takeHit"
                ],
                [
                  "rsp",
                  "…63b0"
                ],
                [
                  "rbp",
                  "…63d0"
                ],
                [
                  "rax",
                  "?"
                ]
              ],
              "dim": [
                6,
                7,
                8,
                9,
                10,
                11,
                12
              ],
              "lines": [
                12
              ]
            },
            {
              "note": "`rbp` now marks the base of `takeHit`'s frame.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 5,
                  "label": "rsp, rbp",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "in",
                  "takeHit"
                ],
                [
                  "rsp",
                  "…63b0"
                ],
                [
                  "rbp",
                  "…63b0"
                ],
                [
                  "rax",
                  "?"
                ]
              ],
              "dim": [
                6,
                7,
                8,
                9,
                10,
                11,
                12
              ],
              "lines": [
                13
              ]
            },
            {
              "note": "`sub rsp, 32` reserves four slots (keeping `rsp` 16-byte aligned for the next call).",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 9,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 5,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "takeHit"
                ],
                [
                  "rsp",
                  "…6390"
                ],
                [
                  "rbp",
                  "…63b0"
                ],
                [
                  "rax",
                  "?"
                ]
              ],
              "dim": [
                10,
                11,
                12
              ],
              "lines": [
                14
              ]
            },
            {
              "note": "At -O0 the compiler spills the argument `hp` (30) from `rdi` to its stack home at `rbp-24`.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "?",
                "?",
                "30",
                "?",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 8,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 9,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 5,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "takeHit"
                ],
                [
                  "rsp",
                  "…6390"
                ],
                [
                  "rbp",
                  "…63b0"
                ],
                [
                  "rax",
                  "?"
                ]
              ],
              "dim": [
                10,
                11,
                12
              ],
              "lines": [
                15
              ]
            },
            {
              "note": "`dmg` (45) is spilled from `rsi` to `rbp-32`.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "?",
                "?",
                "30",
                "45",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 9,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 9,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 5,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "takeHit"
                ],
                [
                  "rsp",
                  "…6390"
                ],
                [
                  "rbp",
                  "…63b0"
                ],
                [
                  "rax",
                  "?"
                ]
              ],
              "dim": [
                10,
                11,
                12
              ],
              "lines": [
                16
              ]
            },
            {
              "note": "Reload `hp` into `rax`. At -O0, every use of a variable reads memory.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "?",
                "?",
                "30",
                "45",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 9,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 5,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "takeHit"
                ],
                [
                  "rsp",
                  "…6390"
                ],
                [
                  "rbp",
                  "…63b0"
                ],
                [
                  "rax",
                  "30"
                ]
              ],
              "dim": [
                10,
                11,
                12
              ],
              "lines": [
                17
              ]
            },
            {
              "note": "`rax` = 30 - 45 = -15.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "?",
                "?",
                "30",
                "45",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 9,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 5,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "takeHit"
                ],
                [
                  "rsp",
                  "…6390"
                ],
                [
                  "rbp",
                  "…63b0"
                ],
                [
                  "rax",
                  "-15"
                ]
              ],
              "dim": [
                10,
                11,
                12
              ],
              "lines": [
                18
              ]
            },
            {
              "note": "Store `left` (-15) at `rbp-8`.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 6,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 9,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 5,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "takeHit"
                ],
                [
                  "rsp",
                  "…6390"
                ],
                [
                  "rbp",
                  "…63b0"
                ],
                [
                  "rax",
                  "-15"
                ]
              ],
              "dim": [
                10,
                11,
                12
              ],
              "lines": [
                19
              ]
            },
            {
              "note": "Reload `left` straight back. -O0 never keeps a value in a register across statements.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 9,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 5,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "takeHit"
                ],
                [
                  "rsp",
                  "…6390"
                ],
                [
                  "rbp",
                  "…63b0"
                ],
                [
                  "rax",
                  "-15"
                ]
              ],
              "dim": [
                10,
                11,
                12
              ],
              "lines": [
                20
              ]
            },
            {
              "note": "Copy `left` into `rdi`: it is `clampHp`'s first argument.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "?",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 9,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 5,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "takeHit"
                ],
                [
                  "rsp",
                  "…6390"
                ],
                [
                  "rbp",
                  "…63b0"
                ],
                [
                  "rax",
                  "-15"
                ]
              ],
              "dim": [
                10,
                11,
                12
              ],
              "lines": [
                21
              ]
            },
            {
              "note": "`call` pushes the return address into `takeHit` and jumps to `clampHp`.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "?",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 10,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 5,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "clampHp"
                ],
                [
                  "rsp",
                  "…6388"
                ],
                [
                  "rbp",
                  "…63b0"
                ],
                [
                  "rax",
                  "-15"
                ]
              ],
              "dim": [
                11
              ],
              "lines": [
                22
              ]
            },
            {
              "note": "`clampHp` saves `takeHit`'s `rbp`.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "rbp",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "purple"
                },
                {
                  "index": 11,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 11,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 5,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "clampHp"
                ],
                [
                  "rsp",
                  "…6380"
                ],
                [
                  "rbp",
                  "…63b0"
                ],
                [
                  "rax",
                  "-15"
                ]
              ],
              "lines": [
                2
              ]
            },
            {
              "note": "`rbp` = `rsp`. A leaf function needs no `sub rsp`.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "rbp",
                "?"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "purple"
                },
                {
                  "index": 11,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 11,
                  "label": "rsp, rbp",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "in",
                  "clampHp"
                ],
                [
                  "rsp",
                  "…6380"
                ],
                [
                  "rbp",
                  "…6380"
                ],
                [
                  "rax",
                  "-15"
                ]
              ],
              "lines": [
                3
              ]
            },
            {
              "note": "`hp` is stored at `rbp-8`, *below* `rsp`: the 128-byte red zone, safe because this leaf calls nobody.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "rbp",
                "-15"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "purple"
                },
                {
                  "index": 11,
                  "color": "teal"
                },
                {
                  "index": 12,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 11,
                  "label": "rsp, rbp",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "in",
                  "clampHp"
                ],
                [
                  "rsp",
                  "…6380"
                ],
                [
                  "rbp",
                  "…6380"
                ],
                [
                  "rax",
                  "-15"
                ]
              ],
              "lines": [
                4
              ]
            },
            {
              "note": "Load `hp` (-15) into `rax`.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "rbp",
                "-15"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "purple"
                },
                {
                  "index": 11,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 11,
                  "label": "rsp, rbp",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "in",
                  "clampHp"
                ],
                [
                  "rsp",
                  "…6380"
                ],
                [
                  "rbp",
                  "…6380"
                ],
                [
                  "rax",
                  "-15"
                ]
              ],
              "lines": [
                5
              ]
            },
            {
              "note": "`edx` = 0, the value to use if `hp` is negative.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "rbp",
                "-15"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "purple"
                },
                {
                  "index": 11,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 11,
                  "label": "rsp, rbp",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "in",
                  "clampHp"
                ],
                [
                  "rsp",
                  "…6380"
                ],
                [
                  "rbp",
                  "…6380"
                ],
                [
                  "rax",
                  "-15"
                ]
              ],
              "lines": [
                6
              ]
            },
            {
              "note": "`test rax, rax` sets SF = 1 because -15 is negative.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "rbp",
                "-15"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "purple"
                },
                {
                  "index": 11,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 11,
                  "label": "rsp, rbp",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "in",
                  "clampHp"
                ],
                [
                  "rsp",
                  "…6380"
                ],
                [
                  "rbp",
                  "…6380"
                ],
                [
                  "rax",
                  "-15"
                ]
              ],
              "lines": [
                7
              ]
            },
            {
              "note": "`cmovs` copies 0 into `rax` because SF = 1. `rax` is the return value.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "rbp",
                "-15"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "purple"
                },
                {
                  "index": 11,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 11,
                  "label": "rsp, rbp",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "in",
                  "clampHp"
                ],
                [
                  "rsp",
                  "…6380"
                ],
                [
                  "rbp",
                  "…6380"
                ],
                [
                  "rax",
                  "0"
                ]
              ],
              "lines": [
                8
              ]
            },
            {
              "note": "`pop rbp` restores `takeHit`'s frame pointer.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "rbp",
                "-15"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "purple"
                },
                {
                  "index": 11,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 10,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 5,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "clampHp"
                ],
                [
                  "rsp",
                  "…6388"
                ],
                [
                  "rbp",
                  "…63b0"
                ],
                [
                  "rax",
                  "0"
                ]
              ],
              "dim": [
                11
              ],
              "lines": [
                9
              ]
            },
            {
              "note": "`ret` pops the return address into `rip`: execution resumes in `takeHit`. The dead slots below `rsp` still hold their old bytes.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "rbp",
                "-15"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "purple"
                },
                {
                  "index": 11,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 9,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 5,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "takeHit"
                ],
                [
                  "rsp",
                  "…6390"
                ],
                [
                  "rbp",
                  "…63b0"
                ],
                [
                  "rax",
                  "0"
                ]
              ],
              "dim": [
                10,
                11,
                12
              ],
              "lines": [
                10
              ]
            },
            {
              "note": "`leave` (= `mov rsp, rbp; pop rbp`) tears down the whole frame in one instruction.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "rbp",
                "-15"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "purple"
                },
                {
                  "index": 11,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 4,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 1,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "takeHit"
                ],
                [
                  "rsp",
                  "…63b8"
                ],
                [
                  "rbp",
                  "…63d0"
                ],
                [
                  "rax",
                  "0"
                ]
              ],
              "dim": [
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12
              ],
              "lines": [
                23
              ]
            },
            {
              "note": "`ret` pops the return address and resumes `main`, with the result (0) in `rax`.",
              "array": [
                "ret",
                "rbp",
                "?",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "rbp",
                "-15"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "purple"
                },
                {
                  "index": 11,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 3,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 1,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "main"
                ],
                [
                  "rsp",
                  "…63c0"
                ],
                [
                  "rbp",
                  "…63d0"
                ],
                [
                  "rax",
                  "0"
                ]
              ],
              "dim": [
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12
              ],
              "lines": [
                24
              ]
            },
            {
              "note": "`main` stores the result into its local `hp` at `rbp-8`.",
              "array": [
                "ret",
                "rbp",
                "0",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "rbp",
                "-15"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "purple"
                },
                {
                  "index": 11,
                  "color": "teal"
                },
                {
                  "index": 2,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 3,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 1,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "main"
                ],
                [
                  "rsp",
                  "…63c0"
                ],
                [
                  "rbp",
                  "…63d0"
                ],
                [
                  "rax",
                  "0"
                ]
              ],
              "dim": [
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12
              ],
              "lines": [
                32
              ]
            },
            {
              "note": "Reload it into `rax` as `main`'s return value.",
              "array": [
                "ret",
                "rbp",
                "0",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "rbp",
                "-15"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "purple"
                },
                {
                  "index": 11,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 3,
                  "label": "rsp",
                  "color": "orange"
                },
                {
                  "index": 1,
                  "label": "rbp",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "in",
                  "main"
                ],
                [
                  "rsp",
                  "…63c0"
                ],
                [
                  "rbp",
                  "…63d0"
                ],
                [
                  "rax",
                  "0"
                ]
              ],
              "dim": [
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12
              ],
              "lines": [
                33
              ]
            },
            {
              "note": "`leave` pops `main`'s frame. Next, `ret` returns to the C library, which calls `exit`.",
              "array": [
                "ret",
                "rbp",
                "0",
                "?",
                "ret",
                "rbp",
                "-15",
                "?",
                "30",
                "45",
                "ret",
                "rbp",
                "-15"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "teal"
                },
                {
                  "index": 4,
                  "color": "purple"
                },
                {
                  "index": 5,
                  "color": "teal"
                },
                {
                  "index": 10,
                  "color": "purple"
                },
                {
                  "index": 11,
                  "color": "teal"
                }
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "rsp",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "in",
                  "main"
                ],
                [
                  "rsp",
                  "…63d8"
                ],
                [
                  "rbp",
                  "…6470"
                ],
                [
                  "rax",
                  "0"
                ]
              ],
              "dim": [
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12
              ],
              "lines": [
                34
              ]
            }
          ]
        },
        {
          type: 'p',
          text: 'Three things to notice. Each `call` pushes a return address (purple) and each prologue pushes the caller\'s `rbp` (teal), so frames are chained together. Popping a frame only **moves `rsp`**: the dead values (-15, 30, 45) are still in memory afterwards, faded but intact. That is why a pointer to a local variable "still works" for a while after its function returns, and why that bug is so treacherous. And `clampHp` wrote its local *below* `rsp`, into the red zone, explained later in this lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'numeric',
      prompt: 'Just before a `call` instruction executes, `rsp` = `0x7FFF_E040`. What is `rsp` at the first instruction of the called function? Answer in hex.',
      answer: '0x7FFFE038',
      alsoAccept: [2147475512],
      answerText: '0x7FFF_E038',
      label: '`rsp` =',
      hint: '`call` pushes one 8-byte value.',
      explanation:
        '`call` pushes the 8-byte return address, and pushing moves `rsp` **down**: `0x7FFFE040 - 8 = 0x7FFFE038`. So at function entry, `[rsp]` is the return address and the caller\'s data starts at `rsp + 8`. This is also why every function starts with `rsp` 8 bytes "off" from a multiple of 16, which matters for alignment later in this lesson.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Prologue, epilogue and the frame pointer',
      blocks: [
        {
          type: 'p',
          text: 'The [[function-prologue|prologue]] you saw in the animation (`push rbp`, `mov rbp, rsp`, `sub rsp, N`) builds a frame; the epilogue (`leave` = `mov rsp, rbp` + `pop rbp`, then `ret`) tears it down. With a [[frame-pointer]], every function\'s frame looks like this:',
        },
        {
          type: 'figure',
          svg: '<svg viewBox="0 0 520 370" xmlns="http://www.w3.org/2000/svg"><g transform="translate(-40 0)"><text x="255.0" y="18" text-anchor="middle" font-size="12" class="t-gray">higher addresses</text><rect x="150" y="30" width="210" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="255.0" y="50.0" text-anchor="middle" font-size="13" class="t-gray">… caller\'s locals …</text><rect x="150" y="60" width="210" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="255.0" y="80.0" text-anchor="middle" font-size="13" class="t-gray">stack argument 8</text><text x="368" y="80.0" font-size="12" font-family="monospace" class="t-gray">rbp+24</text><rect x="150" y="90" width="210" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="255.0" y="110.0" text-anchor="middle" font-size="13" class="t-gray">stack argument 7</text><text x="368" y="110.0" font-size="12" font-family="monospace" class="t-gray">rbp+16</text><rect x="150" y="120" width="210" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-purple"/><text x="255.0" y="140.0" text-anchor="middle" font-size="13" class="t-purple">return address</text><text x="368" y="140.0" font-size="12" font-family="monospace" class="t-gray">rbp+8</text><rect x="150" y="150" width="210" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-teal"/><text x="255.0" y="170.0" text-anchor="middle" font-size="13" class="t-teal">saved rbp</text><text x="368" y="170.0" font-size="12" font-family="monospace" class="t-gray">rbp+0</text><rect x="150" y="180" width="210" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-green"/><text x="255.0" y="200.0" text-anchor="middle" font-size="13" class="t-green">saved rbx, r12…</text><text x="368" y="200.0" font-size="12" font-family="monospace" class="t-gray">rbp-8 …</text><rect x="150" y="210" width="210" height="50" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-blue"/><text x="255.0" y="240.0" text-anchor="middle" font-size="13" class="t-blue">locals and spills</text><text x="368" y="240.0" font-size="12" font-family="monospace" class="t-gray">rbp-16 …</text><rect x="150" y="260" width="210" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="255.0" y="280.0" text-anchor="middle" font-size="13" class="t-gray">outgoing args / padding</text><rect x="150" y="290" width="210" height="40" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-orange" stroke-dasharray="5 4"/><text x="255.0" y="315.0" text-anchor="middle" font-size="13" class="t-orange">red zone (128 bytes)</text><text x="368" y="315.0" font-size="12" font-family="monospace" class="t-gray">below rsp</text><text x="255.0" y="350" text-anchor="middle" font-size="12" class="t-gray">lower addresses (the stack grows this way)</text><path d="M100,180 L140,180" stroke="currentColor" stroke-width="2" class="s-blue" fill="none"/><path d="M140,175 L150,180 L140,185 Z" class="f-blue"/><text x="94" y="184" text-anchor="end" font-size="13" font-family="monospace" class="t-blue">rbp</text><path d="M100,290 L140,290" stroke="currentColor" stroke-width="2" class="s-orange" fill="none"/><path d="M140,285 L150,290 L140,295 Z" class="f-orange"/><text x="94" y="294" text-anchor="end" font-size="13" font-family="monospace" class="t-orange">rsp</text><path d="M437,32 L445,32 L445,148 L437,148" fill="none" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="453" y="94.0" font-size="12" class="t-gray">caller\'s frame</text><path d="M437,152 L445,152 L445,288 L437,288" fill="none" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="453" y="224.0" font-size="12" class="t-gray">callee\'s frame</text></g></svg>',
          alt: 'A System V stack frame drawn top (high addresses) to bottom: caller\'s locals, stack arguments 8 and 7 at rbp+24 and rbp+16, the return address at rbp+8, the saved rbp at rbp+0 where rbp points, saved callee-saved registers, locals and spills, outgoing arguments, then rsp, and the 128-byte red zone below rsp.',
          caption: 'A System V AMD64 frame with a frame pointer. Arguments sit at **positive** offsets from `rbp`, locals at **negative** ones. The return address is always at `rbp+8`.',
        },
        {
          type: 'p',
          text: 'Following the chain of saved `rbp` values from frame to frame gives every caller in turn, which is how a debugger or profiler produces a backtrace cheaply. But look back at the `-O2` code in the previous lesson: there was no `push rbp` anywhere. GCC enables `-fomit-frame-pointer` at `-O1` and above on x86-64, and addresses locals relative to `rsp` instead.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why omit the frame pointer, and why some put it back',
          text: 'Omitting it saves two instructions per call and frees `rbp` as a 16th general-purpose register, which mattered a lot on register-starved 32-bit x86. Debuggers then unwind the stack using DWARF unwind tables (Windows: `.pdata`/`.xdata`). The cost lands on **sampling profilers**, which must unwind thousands of stacks per second; walking `rbp` chains is far cheaper and more robust. Fedora 38 and Ubuntu 24.04 therefore rebuilt their packages with `-fno-omit-frame-pointer`, accepting a cost usually measured at around 1% or less in exchange for much better profiles.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'In your own game',
          text: 'If your profiler shows broken or truncated call stacks in an optimized build, compile with `-fno-omit-frame-pointer` (GCC/Clang). On Windows, x64 code always carries unwind tables, so tools such as Superluminal and PIX can walk the stack either way.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'mcq',
      prompt: 'A team compiles its engine with `-O2 -fno-omit-frame-pointer`. What changes?',
      options: [
        { text: 'Functions can no longer be inlined', why: 'Inlining is unaffected. The flag only changes how non-inlined functions set up their frames.' },
        { text: 'Every non-leaf function again gets `push rbp` / `mov rbp, rsp`, `rbp` is no longer available for other values, and profilers can walk stacks by following saved `rbp` values', correct: true, why: 'That is the whole trade: a couple of instructions per call and one fewer register, in exchange for cheap, reliable stack walking.' },
        { text: 'Local variables are kept in memory instead of registers, as at -O0', why: 'Register allocation still happens. Only `rbp` is reserved; all other values still live in registers when possible.' },
        { text: 'The program uses more stack because return addresses are stored twice', why: 'Each call still pushes one return address. The extra stack use is the 8-byte saved `rbp` per frame.' },
      ],
      explanation:
        'A frame pointer is a convention, not a hardware feature: `rbp` is an ordinary register that the code agrees to point at the saved-`rbp` slot of the current frame. Keeping it costs one register and two instructions per call (often unmeasurable); omitting it makes stack walking depend on unwind tables. Large engines and Linux distributions have increasingly chosen to keep it for the sake of profiling.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Two conventions: System V and Microsoft x64',
      blocks: [
        {
          type: 'p',
          text: 'Separately compiled functions can only call each other if both sides agree on where arguments go, where results come back and which registers may be destroyed. That agreement is the **[[calling-convention]]**, part of the platform\'s [[abi|ABI]]. x86-64 has two in wide use:',
        },
        {
          type: 'table',
          headers: ['Rule', 'System V AMD64 (Linux, macOS, BSD)', 'Microsoft x64 (Windows, Xbox)'],
          rows: [
            ['Integer/pointer args', '`rdi, rsi, rdx, rcx, r8, r9`', '`rcx, rdx, r8, r9`'],
            ['Floating-point args', '`xmm0`–`xmm7`', '`xmm0`–`xmm3` (by position, shared with the integer slots)'],
            ['Further args', 'pushed on the stack', 'on the stack, above the shadow space'],
            ['Return value', '`rax` (and `rdx`), `xmm0` (and `xmm1`)', '`rax`, `xmm0`'],
            ['Below `rsp`', '128-byte [[red-zone]]', 'no red zone'],
            ['Caller must reserve', 'nothing', '32 bytes of [[shadow-space]]'],
            ['`rsp` at the `call`', 'multiple of 16', 'multiple of 16'],
          ],
        },
        {
          type: 'p',
          text: 'Here is the same caller compiled for both platforms by the same compiler, Clang 18 (`-O2`, Intel syntax), so only the convention differs:',
        },
        {
          type: 'code',
          title: 'wave.cpp',
          code: `long long sum8(long long a, long long b, long long c,
               long long d, long long e, long long f,
               long long g, long long h);
long long callSum8() {
    return sum8(1, 2, 3, 4, 5, 6, 7, 8);
}`,
        },
        {
          type: 'compare',
          left: {
            title: 'System V (--target=x86_64-linux-gnu)',
            tone: 'neutral',
            lang: 'text',
            code: `push    rax
mov     edi, 1
mov     esi, 2
mov     edx, 3
mov     ecx, 4
mov     r8d, 5
mov     r9d, 6
push    8
push    7
call    _Z4sum8xxxxxxxx@PLT
add     rsp, 16
pop     rcx
ret`,
          },
          right: {
            title: 'Microsoft x64 (--target=x86_64-pc-windows-msvc)',
            tone: 'neutral',
            lang: 'text',
            code: `sub     rsp, 72
mov     qword ptr [rsp + 56], 8
mov     qword ptr [rsp + 48], 7
mov     qword ptr [rsp + 40], 6
mov     qword ptr [rsp + 32], 5
mov     ecx, 1
mov     edx, 2
mov     r8d, 3
mov     r9d, 4
call    "?sum8@@YA_J_J0000000@Z"
nop
add     rsp, 72
ret`,
          },
        },
        {
          type: 'list',
          items: [
            'System V passes six arguments in registers and pushes 7 and 8. The odd-looking `push rax` at the start just moves `rsp` by 8 so that it is 16-byte aligned at the `call`; `pop rcx` undoes it.',
            'Windows passes four in registers. Arguments 5–8 go at `[rsp+32]` and up, because `[rsp]` to `[rsp+31]` is the shadow space the callee may use to save `rcx, rdx, r8, r9`.',
            '`mov edi, 1` sets all 64 bits of `rdi`: writing a 32-bit register zeroes the top half (previous lesson), and the encoding is shorter.',
            'The mangled names differ too: Itanium (`_Z4sum8…`) vs MSVC (`?sum8@@…`). Name mangling is part of the ABI.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why do two conventions exist?',
          text: 'They were designed separately in the early 2000s by different groups for different needs. System V favors more register arguments and a red zone for fast leaf functions. Microsoft favored simple, uniform rules for debuggers, varargs and its structured exception handling: every function that calls another has a fixed-size frame and complete unwind information. Neither is "right"; each platform simply had to pick one and never change it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'fill',
      prompt: 'Fill in where the arguments of `void spawn(int type, float x, float y, Enemy* out)` arrive. Note that integer and floating-point arguments are counted separately on System V but by position on Windows.',
      templateIsCode: false,
      template: 'On Linux (System V): `type` in ___, `x` in `xmm0`, `y` in `xmm1`, `out` in ___. On Windows (x64): `type` in ___, `x` in `xmm1`, `y` in `xmm2`, `out` in ___.',
      blanks: [{ answers: ['edi', 'rdi'] }, { answers: ['rsi'] }, { answers: ['ecx', 'rcx'] }, { answers: ['r9'] }],
      wordBank: ['edi', 'rsi', 'ecx', 'r9', 'rdx', 'r8', 'xmm3', 'rax'],
      explanation:
        'System V keeps two independent counters: integer/pointer arguments take `rdi, rsi, rdx…` in order and floating-point ones take `xmm0, xmm1…`, so `out` is only the second *integer* argument and lands in `rsi`. Windows assigns by **position**: argument 1 uses `rcx`/`xmm0`, argument 2 `rdx`/`xmm1`, 3 `r8`/`xmm2`, 4 `r9`/`xmm3`, whatever their types. So `x` (position 2) is in `xmm1` and `out` (position 4) in `r9`.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Who saves which registers?',
      blocks: [
        {
          type: 'p',
          text: 'A function needs registers for its own work, but its caller may have values parked in them. The convention splits the registers into two groups: [[callee-saved-register|callee-saved and caller-saved]].',
        },
        {
          type: 'table',
          headers: ['Group', 'System V AMD64', 'Microsoft x64'],
          rows: [
            ['**Callee-saved** (preserved across calls)', '`rbx, rbp, r12–r15` (and `rsp`)', '`rbx, rbp, rdi, rsi, r12–r15`, `xmm6–xmm15` (and `rsp`)'],
            ['**Caller-saved** (any call may destroy them)', '`rax, rcx, rdx, rsi, rdi, r8–r11`, all `xmm`', '`rax, rcx, rdx, r8–r11`, `xmm0–xmm5`'],
          ],
        },
        {
          type: 'code',
          title: 'attack.cpp',
          code: `int rollDice(int sides);   // defined elsewhere

int attack(int strength) {
    int roll = rollDice(20);
    return roll + strength;
}`,
          annotations: [
            { lines: 4, text: '`strength` arrived in a caller-saved register (`edi`/`ecx`) that this call will reuse for its own argument, so it must be parked somewhere safe until line 5.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Linux (clang 18 -O2)',
            tone: 'neutral',
            lang: 'text',
            code: `_Z6attacki:
push    rbx
mov     ebx, edi
mov     edi, 20
call    _Z8rollDicei@PLT
add     eax, ebx
pop     rbx
ret`,
          },
          right: {
            title: 'Windows (clang 18 -O2)',
            tone: 'neutral',
            lang: 'text',
            code: `"?attack@@YAHH@Z":
push    rsi
sub     rsp, 32
mov     esi, ecx
mov     ecx, 20
call    "?rollDice@@YAHH@Z"
add     eax, esi
add     rsp, 32
pop     rsi
ret`,
          },
        },
        {
          type: 'p',
          text: 'On Linux, `attack` keeps `strength` in `rbx`, which `rollDice` promises to preserve. But `attack` must keep the same promise to *its* caller, so it saves the old `rbx` with `push` and restores it with `pop`. Windows does the same with `rsi`, which is callee-saved there but not on Linux, and also reserves the 32-byte shadow space with `sub rsp, 32`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why split the registers at all?',
          text: 'If *all* registers were caller-saved, every caller would have to spill every live value around every call. If all were callee-saved, every small function would have to save and restore every register it touched. The split gives short leaf functions plenty of free scratch registers (the caller-saved ones) while giving callers a few registers that survive calls for long-lived values. The exact split is a tuning decision, which is one reason System V and Windows differ.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'On Linux x86-64, a function keeps a value in a register and then calls a function compiled in another file. In which register is the value **guaranteed** to survive the call without the caller saving it?',
      options: [
        { text: '`rax`', why: '`rax` holds the callee\'s return value, so it is certainly overwritten.' },
        { text: '`rdi`', why: '`rdi` is the first argument register and caller-saved. The callee may freely overwrite it.' },
        { text: '`r12`', correct: true, why: '`r12` is callee-saved in System V: if the callee uses it, it must save and restore it.' },
        { text: '`r11`', why: '`r11` is a scratch register on System V (the `syscall` instruction even overwrites it). It is caller-saved.' },
      ],
      explanation:
        'System V\'s callee-saved set is `rbx, rbp, r12, r13, r14, r15` (plus `rsp`). Compilers put values that must live across calls into these registers, which is why you so often see `push rbx` or `push r12` at the start of a non-leaf function and the matching `pop` at the end. Values in caller-saved registers must be stored somewhere safe before a call, or recomputed afterwards.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'The red zone, the shadow space and the 16-byte rule',
      blocks: [
        {
          type: 'p',
          text: '**The [[red-zone]] (System V only).** The 128 bytes just below `rsp` belong to the current function: the ABI promises that nothing, not even a signal handler, will overwrite them. A leaf function can therefore use them for locals without adjusting `rsp` at all. That is what `clampHp` did in the animation: `mov QWORD PTR -8[rbp], rdi` with `rbp` equal to `rsp`.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'No red zone in kernels',
          text: 'When a hardware interrupt arrives in kernel mode, the CPU pushes its state onto the *current* stack, right on top of any red zone. Kernel code (and other interrupt-driven code, such as some embedded firmware) is therefore compiled with `-mno-red-zone`.',
        },
        {
          type: 'p',
          text: '**The [[shadow-space]] (Windows only).** Every Windows caller reserves 32 bytes just above the return address, one 8-byte home for each register argument. The callee may spill `rcx, rdx, r8, r9` there, which makes debugging and variadic functions such as `printf` simple: all arguments end up in one contiguous block. The caller pays for it even when the callee never uses it.',
        },
        {
          type: 'p',
          text: '**The 16-byte rule (both).** At every `call` instruction, `rsp` must be a multiple of 16. Since `call` pushes 8 bytes, every function starts with `rsp` ≡ 8 (mod 16) and must adjust by an odd multiple of 8 before it calls anything. That explains `push rbx` in `attack` (one push: aligned again), `push rax` in `callSum8`, and Windows\' `sub rsp, 72` (64 bytes of space + 8).',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why insist on 16-byte alignment?',
          text: 'So that functions can keep 16-byte SSE values (`__m128`, a `Vec4` of floats) on the stack and use aligned vector loads and stores, which fault on misaligned addresses. Promising alignment at every call is cheaper than having every such function realign its own stack. Violate it (in hand-written assembly or a bad JIT) and code typically runs fine until some library function executes `movaps` on the stack and crashes.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'numeric',
      prompt: 'On Windows x64, a function has no locals and saves no registers. Its only job is to call `spawn(a, b, c, d, e, f)` with six 8-byte integer arguments. How many bytes must its prologue subtract from `rsp` (`sub rsp, N`)?',
      answer: 56,
      unit: 'bytes',
      hint: 'Add the shadow space and the stack arguments, then remember that `rsp` ≡ 8 (mod 16) on entry and must be a multiple of 16 at the call.',
      explanation:
        '32 bytes of shadow space + 2 stack arguments × 8 bytes = 48. On entry `rsp` ≡ 8 (mod 16) because of the pushed return address, and 48 is a multiple of 16, so subtracting it would leave `rsp` misaligned at the call; add 8 more: **56**. Clang 18 produces exactly `sub rsp, 56`, stores 5 and 6 at `[rsp+32]` and `[rsp+40]`, and passes 1–4 in `rcx, rdx, r8, r9`.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Passing and returning structs',
      blocks: [
        {
          type: 'p',
          text: 'Small structs travel in registers; big ones go through memory. The rules differ sharply between platforms, and game math types live right at the boundary:',
        },
        {
          type: 'code',
          title: 'vec.cpp',
          code: `struct Vec2  { float x, y; };          //  8 bytes
struct Vec3  { float x, y, z; };       // 12 bytes
struct Stats { long hp, mana, xp; };   // 24 bytes (Linux)

Vec2 addV2(Vec2 a, Vec2 b) { return {a.x + b.x, a.y + b.y}; }
Stats makeStats(long hp) { return {hp, 50, 0}; }`,
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Linux, System V (g++ 13 -O2)',
          code: `_Z5addV24Vec2S_:
    addps   xmm0, xmm1
    ret
_Z9makeStatsl:
    mov     QWORD PTR [rdi], rsi
    mov     rax, rdi
    mov     QWORD PTR 8[rdi], 50
    mov     QWORD PTR 16[rdi], 0
    ret`,
          annotations: [
            { lines: 2, text: 'Each `Vec2` arrives packed in one SSE register (`x` and `y` side by side), and one `addps` adds both components at once. The result returns in `xmm0`.' },
            { lines: '5-8', text: '`Stats` is 24 bytes, more than the 16-byte limit for registers. The caller passes a **hidden pointer** to the return slot in `rdi`, so `hp` shifts to `rsi`. The callee writes the fields there and returns the pointer in `rax`.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Windows x64 (clang 18 -O2): the same addV2',
          code: `?addV2@@YA?AUVec2@@U1@0@Z:
    movd    xmm0, ecx
    shr     rcx, 32
    movd    xmm1, ecx
    movd    xmm2, edx
    addss   xmm2, xmm0
    shr     rdx, 32
    movd    xmm0, edx
    addss   xmm0, xmm1
    movd    eax, xmm2
    movd    ecx, xmm0
    shl     rcx, 32
    or      rax, rcx
    ret`,
          annotations: [
            { lines: '2-4', text: 'Microsoft x64 passes an 8-byte struct in an **integer** register (`rcx`), whatever its members are. The callee unpacks the floats into SSE registers with shifts and moves…' },
            { lines: '10-13', text: '…and packs the result back into `rax`. Thirteen instructions instead of one.' },
          ],
        },
        {
          type: 'table',
          headers: ['Struct', 'System V', 'Microsoft x64'],
          rows: [
            ['≤ 16 bytes, trivially copyable', 'split into 8-byte chunks; each goes in a general or SSE register by its contents', 'only sizes 1, 2, 4 or 8 go in a general register; anything else by pointer to a copy'],
            ['Larger', 'copied onto the stack', 'by pointer to a caller-made copy'],
            ['Returned, too large for registers', 'hidden pointer in `rdi`, returned in `rax`', 'hidden pointer in `rcx`, returned in `rax`'],
            ['Non-trivial copy constructor or destructor', 'by invisible reference (pointer)', 'by invisible reference (pointer)'],
          ],
        },
        {
          type: 'p',
          text: 'You can predict the basic decision from two type properties the compiler also checks: size and trivial copyability. This program applies a simplified version of both platforms\' rules:',
        },
        {
          type: 'code',
          title: 'abi.cpp',
          runnable: true,
          code: `#include <cstdio>
#include <string>
#include <type_traits>

struct Vec2   { float x, y; };
struct Vec3   { float x, y, z; };
struct Stats  { long long hp, mana, xp; };
struct Handle { int id; ~Handle() {} };   // user-provided dtor

template <typename T>
void report(const char* name) {
    constexpr bool trivial = std::is_trivially_copyable_v<T>;
    // System V: <= 16 bytes and trivially copyable -> registers
    bool sysvRegs = trivial && sizeof(T) <= 16;
    // Microsoft x64: size 1, 2, 4 or 8 and trivially copyable
    bool winRegs = trivial && (sizeof(T) == 1 || sizeof(T) == 2 ||
                               sizeof(T) == 4 || sizeof(T) == 8);
    std::printf("%-12s %2zu bytes  SysV:%-9s Win:%s\\n", name,
                sizeof(T), sysvRegs ? "registers" : "memory",
                winRegs ? "register" : "memory");
}

int main() {
    report<Vec2>("Vec2");
    report<Vec3>("Vec3");
    report<Stats>("Stats");
    report<Handle>("Handle");
    report<std::string>("std::string");
}`,
          output: 'Vec2          8 bytes  SysV:registers Win:register\nVec3         12 bytes  SysV:registers Win:memory\nStats        24 bytes  SysV:memory    Win:memory\nHandle        4 bytes  SysV:memory    Win:memory\nstd::string  32 bytes  SysV:memory    Win:memory',
          annotations: [
            { lines: 8, text: 'A user-provided destructor makes `Handle` non-trivially copyable, even though it holds a single `int`.' },
            { lines: 14, text: 'The real System V algorithm also classifies each 8-byte chunk as integer or SSE (and has rules for `long double` and unaligned fields); size and triviality decide the common cases.' },
            { lines: '16-17', text: 'Microsoft x64: only power-of-two sizes up to 8 bytes fit in a register.' },
            { lines: 28, text: '`std::string` is 32 bytes in libstdc++ and has a non-trivial copy constructor, so it always goes through memory. That is one more reason to pass strings by `const&` or `std::string_view`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why DirectXMath uses __vectorcall',
          text: 'Under the default Windows convention, a 16-byte `XMVECTOR` or a 12-byte `Vec3` goes through memory on every call, as the table shows. Microsoft added `__vectorcall`, which passes up to six vector arguments in `xmm0`–`xmm5`; DirectXMath\'s `XM_CALLCONV` macro selects it and its `FXMVECTOR`/`GXMVECTOR` typedefs follow its rules. The cheapest fix of all is inlining: math functions small enough to inline never pay any calling convention.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Why non-trivial types go by reference',
          text: 'If a type has a user-provided destructor or copy constructor, the object must have a real address so that constructor and destructor can run on it. The ABI therefore passes a pointer to a temporary the caller created, even if the struct is one `int`: GCC compiles `int idOf(Handle h)` to `mov eax, DWORD PTR [rdi]` when `Handle` has a destructor, but to `mov eax, edi` when it does not.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'truefalse',
      prompt: 'A `struct Vec3 { float x, y, z; };` (12 bytes) is passed in SSE registers both on Linux (System V) and on Windows (Microsoft x64).',
      answer: false,
      explanation:
        'On System V a 12-byte all-float struct is split into two 8-byte chunks, each passed in an SSE register (`xmm0` holds `x, y`; `xmm1` holds `z`). Microsoft x64 only passes structs of exactly 1, 2, 4 or 8 bytes in registers; a 12-byte `Vec3` is copied to memory and passed by pointer. Clang\'s Windows output for a `Vec3` function loads the fields from `[rdx]` for exactly this reason. Cross-platform engines often pass small math types by `const&` or force inlining to sidestep the difference.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Stack overflows and smashed return addresses',
      blocks: [
        {
          type: 'p',
          text: 'Two different disasters share the stack. A **[[stack-overflow]]** happens when the stack runs out: deep or infinite recursion, or a huge local array. The main thread\'s stack is typically 8 MiB on Linux (`ulimit -s`) and 1 MiB on Windows; below it the OS keeps an unmapped *guard page*, so the overflowing push faults and the program dies with a segmentation fault or a stack-overflow exception.',
        },
        {
          type: 'p',
          text: 'A **[[buffer-overflow|buffer overrun]]** on the stack is worse, because nothing faults right away. Locals sit *below* the return address, and arrays are indexed *upward*, so writing past the end of a local array marches straight toward the saved registers and the return address:',
        },
        {
          type: 'code',
          title: 'greet.cpp',
          code: `void readName(char* dst, const char* src);   // copies src

void greet(const char* input) {
    char name[16];
    readName(name, input);
}`,
          annotations: [
            { lines: 4, text: 'A 16-byte buffer on the stack.' },
            { lines: 5, text: 'If `readName` copies more than 16 bytes, the extra bytes overwrite whatever lies above `name`.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2 (Ubuntu enables -fstack-protector-strong by default)',
          code: `_Z5greetPKc:
    sub     rsp, 40
    mov     rsi, rdi
    mov     rax, QWORD PTR fs:40
    mov     QWORD PTR 24[rsp], rax
    xor     eax, eax
    mov     rdi, rsp
    call    _Z8readNamePcPKc@PLT
    mov     rax, QWORD PTR 24[rsp]
    sub     rax, QWORD PTR fs:40
    jne     .L5
    add     rsp, 40
    ret
.L5:
    call    __stack_chk_fail@PLT`,
          annotations: [
            { lines: '4-5', text: 'The **[[stack-canary]]**: a random value, unique per process and kept in thread-local storage at `fs:40`, is copied into the frame at `rsp+24`, between `name` and the return address.' },
            { lines: 6, text: 'Clear `rax` so the canary value does not linger in a register.' },
            { lines: 7, text: '`name` lives at `rsp+0` to `rsp+15`.' },
            { lines: '9-11', text: 'Before returning, compare the stored canary with the original. An overrun long enough to reach the return address must have overwritten it.' },
            { lines: 15, text: 'Mismatch: abort with "stack smashing detected" instead of executing `ret` with a corrupted address.' },
          ],
        },
        {
          type: 'figure',
          svg: '<svg viewBox="0 0 520 300" xmlns="http://www.w3.org/2000/svg"><text x="220.0" y="18" text-anchor="middle" font-size="12" class="t-gray">higher addresses</text><rect x="120" y="30" width="200" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="220.0" y="50.0" text-anchor="middle" font-size="13" class="t-gray">… caller\'s frame …</text><text x="112" y="50.0" text-anchor="end" font-size="12" font-family="monospace" class="t-gray"></text><rect x="120" y="60" width="200" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-purple"/><text x="220.0" y="80.0" text-anchor="middle" font-size="13" class="t-purple">return address</text><text x="112" y="80.0" text-anchor="end" font-size="12" font-family="monospace" class="t-gray">rsp+40</text><rect x="120" y="90" width="200" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="220.0" y="110.0" text-anchor="middle" font-size="13" class="t-gray">(alignment padding)</text><text x="112" y="110.0" text-anchor="end" font-size="12" font-family="monospace" class="t-gray">rsp+32</text><rect x="120" y="120" width="200" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-green"/><text x="220.0" y="140.0" text-anchor="middle" font-size="13" class="t-green">stack canary</text><text x="112" y="140.0" text-anchor="end" font-size="12" font-family="monospace" class="t-gray">rsp+24</text><rect x="120" y="150" width="200" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="220.0" y="170.0" text-anchor="middle" font-size="13" class="t-gray">(unused)</text><text x="112" y="170.0" text-anchor="end" font-size="12" font-family="monospace" class="t-gray">rsp+16</text><rect x="120" y="180" width="200" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-blue"/><text x="220.0" y="200.0" text-anchor="middle" font-size="13" class="t-blue">name[8..15]</text><text x="112" y="200.0" text-anchor="end" font-size="12" font-family="monospace" class="t-gray">rsp+8</text><rect x="120" y="210" width="200" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-blue"/><text x="220.0" y="230.0" text-anchor="middle" font-size="13" class="t-blue">name[0..7]</text><text x="112" y="230.0" text-anchor="end" font-size="12" font-family="monospace" class="t-gray">rsp+0</text><path d="M60,240 L110,240" stroke="currentColor" stroke-width="2" class="s-orange" fill="none"/><path d="M110,235 L120,240 L110,245 Z" class="f-orange"/><text x="54" y="244" text-anchor="end" font-size="13" font-family="monospace" class="t-orange">rsp</text><text x="220.0" y="262" text-anchor="middle" font-size="12" class="t-gray">lower addresses</text><path d="M344,230 L344,85" stroke="currentColor" stroke-width="2.5" class="s-red" fill="none"/><path d="M338,87 L344,75 L350,87 Z" class="f-red"/><text x="356" y="120" font-size="12" class="t-red">writing past name</text><text x="356" y="137" font-size="12" class="t-red">runs upward: first the</text><text x="356" y="154" font-size="12" class="t-red">canary, then the</text><text x="356" y="171" font-size="12" class="t-red">return address</text></svg>',
          alt: 'The frame of greet: name occupies rsp+0 to rsp+15, an unused slot at rsp+16, the stack canary at rsp+24, alignment padding at rsp+32 and the return address at rsp+40. A red arrow shows an overrun moving upward from name through the canary to the return address.',
          caption: 'The real frame of `greet`. Writing more than 24 bytes into `name` reaches the canary; more than 40 bytes reaches the return address.',
        },
        {
          type: 'p',
          text: 'Without a canary, `ret` would jump wherever the overwritten bytes point. If the input came from a network packet or a save file, an attacker chooses those bytes. This is the classic stack-smashing attack, and it is why every modern platform layers several defenses:',
        },
        {
          type: 'list',
          items: [
            '**Stack canaries** (`-fstack-protector-strong`, MSVC `/GS`): detect the overwrite before `ret`.',
            '**Non-executable stack** (NX/DEP): the stack\'s pages are marked no-execute, so injected code cannot run there.',
            '**[[aslr|ASLR]]**: randomized addresses, so the attacker does not know where to jump.',
            '**Shadow stacks** (Intel CET, Arm GCS): the CPU keeps a second, protected copy of each return address and faults on `ret` if they differ. Windows and Linux (6.6 and later) support CET shadow stacks for user programs.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Defenses are not a fix',
          text: 'Every one of these mitigations has been bypassed in some scenario, and none of them makes the overrun defined behavior: in C++ it is [[undefined-behavior]] the moment you write past the array. The fix is in the source: `std::string`, `std::array` with `.at()` in tools and debug builds, bounded copies, and sanitizers (`-fsanitize=address`) in testing.',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'bug',
      prompt: 'This save-file loader copies a player name from untrusted file data into a stack buffer. Tap the line that can corrupt the return address.',
      code: `#include <cstddef>
#include <cstring>

struct SaveHeader {
    std::size_t nameLen;      // read from the file
    const char* nameBytes;    // points into the file data
};

void loadPlayer(const SaveHeader& h) {
    char name[32];
    std::memcpy(name, h.nameBytes, h.nameLen);
    name[31] = '\\0';
    // ... use name ...
}`,
      bugLines: [11],
      explanation:
        'The copy length comes straight from the file. A crafted save with `nameLen` = 200 writes 168 bytes past `name`, over the canary, any saved registers and the return address. That is undefined behavior; in practice either `__stack_chk_fail` aborts, or (with no canary) `ret` jumps to an address the file chose. Line 12 does not help: it runs after the damage. Clamp first, `std::memcpy(name, h.nameBytes, std::min(h.nameLen, sizeof(name) - 1));`, or better, use `std::string(h.nameBytes, h.nameLen)` after validating the length. Several console exploits have started exactly this way, with a crafted save file.',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'order',
      prompt: 'Put the events of one non-leaf function call on Linux x86-64 in order, starting in the caller.',
      linesAreCode: false,
      lines: [
        'Caller loads the arguments into `rdi`, `rsi`, …',
        '`call` pushes the return address and jumps to the callee',
        'Prologue pushes callee-saved registers it will use and subtracts from `rsp`',
        'The function body runs and leaves its result in `rax`',
        'Epilogue adds back to `rsp` and pops the saved registers',
        '`ret` pops the return address into `rip`',
      ],
      distractors: ['The caller pushes `rax` so that the callee cannot overwrite it'],
      explanation:
        'Arguments must be in place before the jump, and the return address is pushed by `call` itself. The prologue and epilogue mirror each other, so the stack is exactly as `call` left it when `ret` executes: `[rsp]` must be the return address. The distractor is wrong twice: `rax` is caller-saved but holds no caller data the callee needs to respect, and it is where the result comes back. If the caller had a live value in `rax`, it would save it somewhere itself or keep it in a callee-saved register.',
    },
  ],
  takeaways: [
    'The stack is ordinary memory plus `rsp`; on x86-64 it grows down. `call` pushes the return address and jumps; `ret` pops it into `rip`.',
    'A prologue saves registers and reserves space; the epilogue undoes it. Optimized x86-64 code usually omits the frame pointer, which saves a register but makes stack walking depend on unwind tables.',
    'System V passes six integer arguments in `rdi, rsi, rdx, rcx, r8, r9` and has a 128-byte red zone; Windows passes four in `rcx, rdx, r8, r9` and requires 32 bytes of shadow space. Both keep `rsp` 16-byte aligned at every call.',
    'Callee-saved registers (System V: `rbx, rbp, r12–r15`) survive calls, so functions that use them push and pop them; everything else may be clobbered.',
    'Small trivially copyable structs travel in registers (System V up to 16 bytes; Windows only 1, 2, 4 or 8 bytes); large ones use memory and a hidden return pointer; non-trivial types go by invisible reference.',
    'Locals sit below the return address, so a stack buffer overrun can overwrite it. Canaries, NX, ASLR and shadow stacks mitigate this; bounds checks prevent it.',
  ],
  reading: [
    {
      title: 'x86 calling conventions (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/X86_calling_conventions',
      source: 'article',
      note: 'Side-by-side tables of the System V and Microsoft x64 rules, plus the older 32-bit conventions.',
    },
    {
      title: 'Agner Fog: Calling conventions for different C++ compilers and operating systems',
      url: 'https://www.agner.org/optimize/',
      source: 'article',
      note: 'Manual 5 compares register use, struct passing and name mangling across compilers and platforms in detail.',
    },
    {
      title: 'Computer Systems: A Programmer\'s Perspective (CS:APP)',
      url: 'https://csapp.cs.cmu.edu/',
      source: 'book',
      note: 'Section 3.7 on procedures and section 3.10 on buffer overflows and their defenses.',
    },
    {
      title: 'Stack buffer overflow (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Stack_buffer_overflow',
      source: 'article',
      note: 'How stack smashing works and how canaries, NX and ASLR respond.',
    },
    {
      title: 'Compiler Explorer',
      url: 'https://godbolt.org/',
      source: 'other',
      note: 'Compare the same function under x86-64 gcc (System V) and x64 msvc (Windows) to see both conventions.',
    },
  ],
};
