import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-control-flow-asm',
  title: 'Control Flow and Functions in Assembly',
  summary: 'How if/else, loops and switch become compares, jumps and tables; what strength reduction, unrolling, inlining and tail calls do to your code; and how the optimizer reasons about aliasing and undefined behavior.',
  minutes: 20,
  objectives: [
    'Translate if/else and loops into the compare-and-jump patterns compilers emit, including loop rotation',
    'Recognize strength reduction (pointer stepping, lea, magic-number division) and loop unrolling in -O2 output',
    'Predict whether a switch becomes a jump table, a lookup table or a tree of compares',
    'Explain how inlining and tail calls change the code, and why neither is guaranteed',
    'Explain how pointer aliasing and undefined behavior shape what the optimizer may do',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'if/else is a compare and a jump',
      blocks: [
        {
          type: 'p',
          text: 'The CPU has no `if`. It has conditional jumps: "if the flags say so, set the program counter to that label; otherwise fall through to the next instruction". Every `if`, loop and `&&` you write becomes some arrangement of these. Here is a gameplay reaction with real `-O2` output:',
        },
        {
          type: 'code',
          title: 'react.cpp',
          code: `void playHitSound();
void playBlockSound();
int gReactions = 0;

void react(int damage) {
    if (damage > 0) {
        playHitSound();
    } else {
        playBlockSound();
    }
    ++gReactions;
}`,
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2 -masm=intel',
          code: `_Z5reacti:
    sub     rsp, 8
    test    edi, edi
    jle     .L2
    call    _Z12playHitSoundv@PLT
    add     DWORD PTR gReactions[rip], 1
    add     rsp, 8
    ret
.L2:
    call    _Z14playBlockSoundv@PLT
    add     DWORD PTR gReactions[rip], 1
    add     rsp, 8
    ret`,
          annotations: [
            { lines: 2, text: 'Align the stack to 16 bytes for the calls (previous unit).' },
            { lines: 3, text: 'Compare `damage` with zero.' },
            { lines: 4, text: 'The condition is **inverted**: `damage > 0` becomes "jump to the else-branch if `damage <= 0`". The then-branch falls straight through.' },
            { lines: '6-8', text: 'GCC **duplicated** the shared tail (`++gReactions`, epilogue, `ret`) into both branches rather than jumping to a common exit: one fewer jump on each path.' },
          ],
        },
        {
          type: 'p',
          text: 'The compiler chooses which branch falls through. A not-taken branch is slightly cheaper and keeps the hot path contiguous in the instruction cache, so compilers guess which side is more likely. You can tell them with C++20\'s `[[likely]]` and `[[unlikely]]`. Mark the hit as `[[unlikely]]` and GCC flips the layout: `test edi, edi` / `jg .L6`, with `playBlockSound` falling through and the hit path moved out of line.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not use cmov here?',
          text: 'In the previous unit, small `if`s became branch-free `cmov`s. That only works when both sides can be **computed safely and cheaply** and the condition merely selects a value. Here each side calls a function with side effects (it plays a sound), and you cannot call both and keep one result. Whenever a branch guards side effects, memory accesses that might fault, or expensive work, it stays a real jump, and its cost depends on the branch predictor (next unit).',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'Which of these functions can GCC compile **without any conditional jump**, using `cmov` or `setcc` instead?',
      options: [
        { text: '`void hit(Enemy* e) { if (e) e->hp -= 10; }`', why: 'The store through `e` may only happen when `e` is non-null; executing it unconditionally could fault. A null check guarding a memory access needs a real branch.' },
        { text: '`int pick(bool crit, int a, int b) { return crit ? a * 2 : b; }`', correct: true, why: 'Both values are cheap and safe to compute, and the condition only selects one. This is the textbook `cmov` case.' },
        { text: '`void tick(bool paused) { if (!paused) updateWorld(); }`', why: 'A function call with side effects cannot be executed "just in case". The call must be skipped with a jump.' },
        { text: '`int sumTo(int n) { int s = 0; for (int i = 0; i < n; ++i) s += i; return s; }`', why: 'A loop needs a backward conditional jump (unless the compiler replaces it with a closed formula, which GCC does not do here). Repetition cannot be expressed with `cmov`.' },
      ],
      explanation:
        'A conditional move turns control dependence into data dependence: compute both candidates, then pick one. That is only legal when computing the unused candidate has no side effects and cannot fault, and only profitable when both are cheap. Function calls, guarded loads and stores, and loops keep their jumps.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Loops: rotated, with the index gone',
      blocks: [
        {
          type: 'p',
          text: 'A `for` loop becomes a check before the loop, a body, and a conditional jump **backward**. Look closely at what happened to `i`:',
        },
        {
          type: 'code',
          title: 'sum.cpp',
          code: `int sumHp(const int* hp, int n) {
    int total = 0;
    for (int i = 0; i < n; ++i) {
        total += hp[i];
    }
    return total;
}`,
        },
        {
          "type": "algo",
          "view": "array",
          "code": "_Z5sumHpPKii:\n    test    esi, esi\n    jle     .L4\n    movsx   rsi, esi\n    xor     eax, eax\n    lea     rdx, [rdi+rsi*4]\n.L3:\n    add     eax, DWORD PTR [rdi]\n    add     rdi, 4\n    cmp     rdi, rdx\n    jne     .L3\n    ret\n.L4:\n    xor     eax, eax\n    ret",
          "lang": "text",
          "interval": 1100,
          "caption": "Real `g++ -O2` output (alignment directives removed), traced in gdb with `hp = {30, 45, 25}`. The boxes are the array in memory; the arrows are the pointer registers.",
          "frames": [
            {
              "note": "Call `sumHp(hp, 3)`: `rdi` points at `hp[0]`, `esi` = 3. `eax` holds a leftover value.",
              "array": [
                30,
                45,
                25
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "rdi",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "eax (total)",
                  "?"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "–"
                ]
              ]
            },
            {
              "note": "`test esi, esi` checks n against zero: n = 3 is positive, so SF = 0 and ZF = 0.",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 0,
                  "label": "rdi",
                  "color": "orange"
                }
              ],
              "lines": [
                2
              ],
              "vars": [
                [
                  "eax (total)",
                  "?"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`jle` is not taken (3 > 0), so the loop runs at least once.",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 0,
                  "label": "rdi",
                  "color": "orange"
                }
              ],
              "lines": [
                3
              ],
              "vars": [
                [
                  "eax (total)",
                  "?"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`movsx rsi, esi` sign-extends n to 64 bits so it can be used in an address.",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 0,
                  "label": "rdi",
                  "color": "orange"
                }
              ],
              "lines": [
                4
              ],
              "vars": [
                [
                  "eax (total)",
                  "?"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`xor eax, eax` sets `total` = 0 (shorter than `mov eax, 0`).",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 0,
                  "label": "rdi",
                  "color": "orange"
                }
              ],
              "lines": [
                5
              ],
              "vars": [
                [
                  "eax (total)",
                  "0"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "1"
                ]
              ]
            },
            {
              "note": "`lea rdx, [rdi+rsi*4]` computes the end pointer `&hp[3]`, one past the last element. `i` itself is gone.",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 0,
                  "label": "rdi",
                  "color": "orange"
                },
                {
                  "index": 3,
                  "label": "rdx (end)",
                  "color": "blue"
                }
              ],
              "lines": [
                6
              ],
              "vars": [
                [
                  "eax (total)",
                  "0"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "1"
                ]
              ]
            },
            {
              "note": "`add eax, [rdi]` adds the element `rdi` points at: total = 30.",
              "array": [
                30,
                45,
                25
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
                  "label": "rdi",
                  "color": "orange"
                },
                {
                  "index": 3,
                  "label": "rdx (end)",
                  "color": "blue"
                }
              ],
              "lines": [
                8
              ],
              "vars": [
                [
                  "eax (total)",
                  "30"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`add rdi, 4` steps the pointer to the next `int` (4 bytes).",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 1,
                  "label": "rdi",
                  "color": "orange"
                },
                {
                  "index": 3,
                  "label": "rdx (end)",
                  "color": "blue"
                }
              ],
              "lines": [
                9
              ],
              "vars": [
                [
                  "eax (total)",
                  "30"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`cmp rdi, rdx` subtracts the end pointer from `rdi` (discarding the result): ZF = 0.",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 1,
                  "label": "rdi",
                  "color": "orange"
                },
                {
                  "index": 3,
                  "label": "rdx (end)",
                  "color": "blue"
                }
              ],
              "lines": [
                10
              ],
              "vars": [
                [
                  "eax (total)",
                  "30"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "ZF = 0, so `jne` jumps back to the top of the loop.",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 1,
                  "label": "rdi",
                  "color": "orange"
                },
                {
                  "index": 3,
                  "label": "rdx (end)",
                  "color": "blue"
                }
              ],
              "lines": [
                11
              ],
              "vars": [
                [
                  "eax (total)",
                  "30"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`add eax, [rdi]` adds the element `rdi` points at: total = 75.",
              "array": [
                30,
                45,
                25
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
                  "label": "rdi",
                  "color": "orange"
                },
                {
                  "index": 3,
                  "label": "rdx (end)",
                  "color": "blue"
                }
              ],
              "lines": [
                8
              ],
              "vars": [
                [
                  "eax (total)",
                  "75"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`add rdi, 4` steps the pointer to the next `int` (4 bytes).",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 2,
                  "label": "rdi",
                  "color": "orange"
                },
                {
                  "index": 3,
                  "label": "rdx (end)",
                  "color": "blue"
                }
              ],
              "lines": [
                9
              ],
              "vars": [
                [
                  "eax (total)",
                  "75"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`cmp rdi, rdx` subtracts the end pointer from `rdi` (discarding the result): ZF = 0.",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 2,
                  "label": "rdi",
                  "color": "orange"
                },
                {
                  "index": 3,
                  "label": "rdx (end)",
                  "color": "blue"
                }
              ],
              "lines": [
                10
              ],
              "vars": [
                [
                  "eax (total)",
                  "75"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "ZF = 0, so `jne` jumps back to the top of the loop.",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 2,
                  "label": "rdi",
                  "color": "orange"
                },
                {
                  "index": 3,
                  "label": "rdx (end)",
                  "color": "blue"
                }
              ],
              "lines": [
                11
              ],
              "vars": [
                [
                  "eax (total)",
                  "75"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`add eax, [rdi]` adds the element `rdi` points at: total = 100.",
              "array": [
                30,
                45,
                25
              ],
              "marks": [
                {
                  "index": 2,
                  "color": "green"
                }
              ],
              "pointers": [
                {
                  "index": 2,
                  "label": "rdi",
                  "color": "orange"
                },
                {
                  "index": 3,
                  "label": "rdx (end)",
                  "color": "blue"
                }
              ],
              "lines": [
                8
              ],
              "vars": [
                [
                  "eax (total)",
                  "100"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`add rdi, 4` steps the pointer to the next `int` (4 bytes).",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 3,
                  "label": "rdi, rdx",
                  "color": "orange"
                }
              ],
              "lines": [
                9
              ],
              "vars": [
                [
                  "eax (total)",
                  "100"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`cmp rdi, rdx` subtracts the end pointer from `rdi` (discarding the result): ZF = 1.",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 3,
                  "label": "rdi, rdx",
                  "color": "orange"
                }
              ],
              "lines": [
                10
              ],
              "vars": [
                [
                  "eax (total)",
                  "100"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "1"
                ]
              ]
            },
            {
              "note": "ZF = 1: `rdi` reached the end pointer, so `jne` falls through.",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 3,
                  "label": "rdi, rdx",
                  "color": "orange"
                }
              ],
              "lines": [
                11
              ],
              "vars": [
                [
                  "eax (total)",
                  "100"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "1"
                ]
              ]
            },
            {
              "note": "`ret` returns `total` = 100 in `eax`.",
              "array": [
                30,
                45,
                25
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 3,
                  "label": "rdi, rdx",
                  "color": "orange"
                }
              ],
              "lines": [
                12
              ],
              "vars": [
                [
                  "eax (total)",
                  "100"
                ],
                [
                  "esi (n)",
                  "3"
                ],
                [
                  "ZF",
                  "1"
                ]
              ]
            }
          ]
        },
        {
          type: 'list',
          items: [
            '**Loop rotation.** The condition is tested once up front (`test`/`jle`, skipping the loop when `n <= 0`) and then at the **bottom** of each iteration. A `while` loop becomes a guarded `do`-`while`, so each iteration runs one conditional jump instead of a jump plus a test.',
            '**Strength reduction.** `hp[i]` would need `hp + i*4` every iteration. GCC instead keeps a pointer in `rdi` and adds 4 to it, and compares it against a precomputed end pointer `rdx`. The variable `i` no longer exists at all: this is exactly the iterator loop `for (p = hp; p != end; ++p)`.',
            '**Four instructions per element**: `add`, `add`, `cmp`, `jne`. Modern cores can run such a loop at about one iteration per cycle, limited by the chain of additions into `eax`.',
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'No SIMD at -O2? Not here',
          text: 'GCC 12 and later do vectorize at `-O2`, but only under a "very cheap" cost model that rejects loops needing extra code for leftover elements, like this one with an unknown `n`. At `-O3` the same function becomes about 50 lines of SSE code that adds four `int`s per instruction. The SIMD lesson in the Modern CPUs unit reads that output.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'numeric',
      prompt: 'Count the instructions the `sumHp` listing above executes for `n = 100`, from the first `test` up to and including `ret` (do not count labels or alignment padding).',
      answer: 406,
      unit: 'instructions',
      hint: 'Five setup instructions run once, then four per iteration, then the final `ret`.',
      explanation:
        'Setup: `test`, `jle`, `movsx`, `xor`, `lea` = 5. Each of the 100 iterations runs `add`, `add`, `cmp`, `jne` = 400. Then `ret` = 1. Total **406**, about 4 per element. This kind of count is the "instruction count" term of the performance equation you will meet in the Performance unit; the animation\'s three iterations ran 5 + 12 + 1 = 18 by the same rule (plus one alignment `nop`).',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Strength reduction and loop unrolling',
      blocks: [
        {
          type: 'p',
          text: '**[[strength-reduction|Strength reduction]]** replaces an expensive operation with cheaper ones that compute the same thing. You have already seen `x * 5` become `lea eax, [rdi+rdi*4]` and the loop index become a stepping pointer. Division is the dramatic case: a 32-bit `div` takes roughly 10–30 cycles depending on the core, while a multiply takes about 3. So for a **constant** divisor the compiler multiplies by a precomputed reciprocal instead:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2: unsigned div10(unsigned x) { return x / 10; }',
          code: `_Z5div10j:
    mov     eax, edi
    mov     edx, 3435973837
    imul    rax, rdx
    shr     rax, 35
    ret`,
          annotations: [
            { lines: 3, text: '3435973837 / 2³⁵ ≈ 0.1000000000058. Multiplying by it and shifting right 35 bits divides by 10, with the constant chosen so the result is **exact** for every 32-bit input.' },
            { lines: 4, text: 'A 64-bit multiply of the zero-extended `x`.' },
            { lines: 5, text: 'Keep the top bits: dividing by 2³⁵ is a shift.' },
          ],
        },
        {
          type: 'code',
          title: 'magic.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <cstdio>

// What GCC emits for x / 10 (unsigned):
//   mov eax, edi ; mov edx, 3435973837 ; imul rax, rdx ; shr rax, 35
std::uint32_t div10(std::uint32_t x) {
    std::uint64_t product = std::uint64_t{x} * 3435973837u;
    return static_cast<std::uint32_t>(product >> 35);
}

int main() {
    volatile std::uint32_t ten = 10;   // forces a real div
    std::uint64_t checked = 0, wrong = 0;
    for (std::uint64_t x = 0; x <= 0xFFFFFFFF; x += 101) {
        auto v = static_cast<std::uint32_t>(x);
        ++checked;
        if (div10(v) != v / ten) ++wrong;
    }
    if (div10(0xFFFFFFFF) != 0xFFFFFFFF / ten) ++wrong;
    std::printf("checked %llu values, %llu wrong\\n",
                static_cast<unsigned long long>(checked),
                static_cast<unsigned long long>(wrong));

    // Signed division truncates toward zero; a shift rounds down.
    const int samples[] = {9, -9, -16};
    for (int x : samples) {
        int biased = (x < 0 ? x + 7 : x) >> 3;   // GCC's fix
        std::printf("%3d / 8 = %2d   %3d >> 3 = %2d   biased: %2d\\n",
                    x, x / 8, x, x >> 3, biased);
    }
}`,
          output: 'checked 42524429 values, 0 wrong\n  9 / 8 =  1     9 >> 3 =  1   biased:  1\n -9 / 8 = -1    -9 >> 3 = -2   biased: -1\n-16 / 8 = -2   -16 >> 3 = -2   biased: -2',
          annotations: [
            { lines: 12, text: 'Reading a `volatile` divisor stops the compiler from applying the very same trick to `v / ten`, so the comparison really uses the CPU\'s `div` instruction. (An exhaustive check of all 2³² inputs, done separately, also finds no mismatch.)' },
            { lines: '25-29', text: 'Why signed division by 8 is not just `sar eax, 3`: C++ rounds toward zero, an arithmetic shift rounds toward minus infinity. For negative `x` they differ unless you first add 7.' },
          ],
        },
        {
          type: 'p',
          text: 'That bias is exactly what GCC emits for `int x / 8`: `test edi, edi` / `lea eax, 7[rdi]` / `cmovns eax, edi` / `sar eax, 3`. For `unsigned x / 8` it is a single `shr eax, 3`. Signedness has a cost even when the math looks identical.',
        },
        {
          type: 'p',
          text: '**[[loop-unrolling|Loop unrolling]]** does several iterations\' work per trip around the loop. GCC does not unroll at `-O2` by default; with `-funroll-loops`, the heart of `sumHp` becomes:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2 -funroll-loops (main loop excerpt)',
          code: `.L3:
    add     eax, DWORD PTR [rdi]
    add     rdi, 32
    add     eax, DWORD PTR -28[rdi]
    add     eax, DWORD PTR -24[rdi]
    add     eax, DWORD PTR -20[rdi]
    add     eax, DWORD PTR -16[rdi]
    add     eax, DWORD PTR -12[rdi]
    add     eax, DWORD PTR -8[rdi]
    add     eax, DWORD PTR -4[rdi]
    cmp     rdi, rcx
    jne     .L3`,
          annotations: [
            { lines: 3, text: 'The pointer advances by 8 elements (32 bytes) at once, and the next seven loads use negative displacements from it.' },
            { lines: '11-12', text: 'One compare and one jump per **8** elements instead of per element: 11 instructions for 8 elements, versus 32. A separate prologue (not shown, about 45 more lines) handles the `n % 8` leftover elements first.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Unrolling is not free',
          text: 'Unrolling cuts loop overhead and gives the out-of-order core more independent work, but the code grows (this function went from 15 lines of assembly to 65), which costs instruction-cache space shared with the rest of your frame. Here it also cannot break the real bottleneck: every `add` still waits for the previous one through `eax`. That is why compilers unroll selectively, and why the big wins in this loop come from SIMD, which uses several accumulators at once.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'numeric',
      prompt: 'GCC computes `unsigned x / 10` as `(x * 3435973837) >> 35`. What is 3435973837 / 2³⁵? Give 4 decimal places.',
      answer: 0.1,
      tolerance: 0.00005,
      hint: '2³⁵ = 34,359,738,368.',
      explanation:
        '3,435,973,837 / 34,359,738,368 ≈ 0.1000000000058, just a hair above 1/10. Multiplying by this and dropping the low 35 bits is multiplying by 0.1 in fixed-point arithmetic. The tiny excess is chosen so that the rounding error never reaches the next integer for any 32-bit `x`, which is why the result is exact. Compilers derive such constants for every divisor (the method is due to Granlund and Montgomery, 1994).',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'switch: jump tables, lookup tables and compare trees',
      blocks: [
        {
          type: 'p',
          text: 'A `switch` has no single translation. The compiler looks at the case values and picks a strategy. Three real examples from one file:',
        },
        {
          type: 'code',
          title: 'weapons.cpp',
          code: `enum class Weapon { Sword, Bow, Staff, Axe, Dagger, Spear };

void swing(); void shoot(); void cast();
void chop();  void stab();  void thrust();

void attack(Weapon w) {
    switch (w) {
        case Weapon::Sword:  swing();  break;
        case Weapon::Bow:    shoot();  break;
        case Weapon::Staff:  cast();   break;
        case Weapon::Axe:    chop();   break;
        case Weapon::Dagger: stab();   break;
        case Weapon::Spear:  thrust(); break;
    }
}`,
          annotations: [
            { lines: 1, text: 'Six dense values, 0 through 5.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2: a jump table (excerpt, directives removed)',
          code: `_Z6attack6Weapon:
    cmp     edi, 5
    ja      .L5
    lea     rdx, .L8[rip]
    mov     edi, edi
    movsx   rax, DWORD PTR [rdx+rdi*4]
    add     rax, rdx
    jmp     rax
.L8:
    .long   .L13-.L8
    .long   .L12-.L8
    .long   .L11-.L8
    .long   .L10-.L8
    .long   .L9-.L8
    .long   .L7-.L8
.L9:
    jmp     _Z4stabv@PLT
    ...`,
          annotations: [
            { lines: '2-3', text: 'One **unsigned** compare checks both ends of the range: a negative value looks huge as unsigned, so `ja` (above) catches it too. Out of range: skip to `.L5` (return).' },
            { lines: '4-8', text: 'Load the table entry for `w`, add the table\'s own address, jump there. The entries are 32-bit **offsets** relative to the table, which keeps the code position-independent.' },
            { lines: '10-15', text: 'Six entries, one per case, in case order. The assembler places this table in `.rodata` (the `.section` directive is not shown).' },
            { lines: 17, text: 'Each case is a tail call (`jmp` instead of `call` + `ret`), explained shortly.' },
          ],
        },
        {
          type: 'p',
          text: 'When every case only **returns a constant**, GCC goes one step further and replaces the code with a data table. `int baseDamage(Weapon w)` returning 12, 9, 7, 15, 5, 11 compiles to a bounds check plus `mov eax, DWORD PTR [rax+rdi*4]` from a 24-byte array named `CSWTCH.1` holding those six numbers. No jumps at all.',
        },
        {
          type: 'p',
          text: 'For **sparse** values such as 3, 40, 404, 1000, 5000, 9001, a table would be mostly holes, so GCC builds a binary search out of compares: test 1000 first, then search the lower or upper half (finishing with a `sete` and a `cmov`). The [[jump-table]] is just one tool.',
        },
        {
          type: 'table',
          headers: ['Case values', 'Typical code', 'Cost'],
          rows: [
            ['Dense, each case does work', 'jump table: bounds check + indirect `jmp`', 'O(1), one indirect branch'],
            ['Dense, each case returns a constant', 'lookup table in `.rodata`', 'O(1), one load, no branches'],
            ['Sparse', 'tree of compares (binary search)', 'O(log n) branches'],
            ['Two or three cases', 'plain `if`/`else` chain', 'a few branches'],
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Interpreters and state machines',
          text: 'A jump table ends in an **indirect** branch, which the CPU must predict by target address. A bytecode interpreter or AI state machine whose next case is effectively random mispredicts often. That is why fast interpreters use tricks such as "threaded" dispatch (one indirect jump at the end of each handler), and why `switch` over data in a hot loop deserves a look in the profiler.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'Which switch is GCC most likely to compile into a jump table (`jmp rax` through a table of addresses or offsets)?',
      options: [
        { text: 'A switch on an `int` with cases 1, 100, 10000 and 1000000, each calling a different function', why: 'The values are far apart. A table covering 1…1000000 would have almost a million unused entries, so the compiler uses compares instead.' },
        { text: 'A switch on a `char` with cases `\'a\'` through `\'h\'`, each calling a different function', correct: true, why: 'Eight consecutive values whose cases do different work: a dense range, perfect for an 8-entry jump table plus one bounds check.' },
        { text: 'A switch on a `bool` with cases `true` and `false`', why: 'Two cases are cheaper as one test and one conditional jump than as a table lookup and indirect jump.' },
        { text: 'A switch on an enum with cases 0 through 7, each returning a different constant', why: 'Dense, yes, but when every case just returns a value, GCC uses a **lookup table** of the values (like `CSWTCH.1`), with no jump at all.' },
      ],
      explanation:
        'Compilers weigh table size against the number of compares. Dense ranges with real work per case get a jump table; dense ranges that just produce values get a data table; sparse values get a binary search; tiny switches get plain branches. The exact thresholds are compiler heuristics, so check the output when it matters.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Function calls and inlining',
      blocks: [
        {
          type: 'code',
          title: 'inline.cpp',
          code: `static int square(int x) { return x * x; }
int area() { return square(3) + square(4); }

__attribute__((noinline)) int cube(int x) {
    return x * x * x;
}
int volume() { return cube(3); }`,
          annotations: [
            { lines: 4, text: 'A GCC/Clang attribute that forbids inlining, so we can see a real call. MSVC spells it `__declspec(noinline)`.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2 -masm=intel',
          code: `_Z4areav:
    mov     eax, 25
    ret
_Z4cubei:
    mov     eax, edi
    imul    eax, edi
    imul    eax, edi
    ret
_Z6volumev:
    mov     edi, 3
    jmp     _Z4cubei`,
          annotations: [
            { lines: 2, text: '`square` was inlined twice, and then the whole expression `3*3 + 4*4` was **evaluated at compile time**. No call, no multiply, just the answer.' },
            { lines: '10-11', text: 'Without inlining, the compiler cannot see that `cube(3)` is 27. It must pass 3 in `edi` and transfer control (here with `jmp`, a tail call).' },
          ],
        },
        {
          type: 'p',
          text: '**[[function-inlining|Inlining]]** pastes a function\'s body into its caller. Saving the `call` and `ret` is the small win. The big win is that the combined code is optimized **together**: constants propagate into the body, branches on known values disappear, loops over known sizes unroll or vectorize, and values stay in registers instead of following the calling convention.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not inline everything?',
          text: 'Code size. Every inlined copy is another copy in the instruction cache, and a hot loop that no longer fits in it runs slower. Recursive functions cannot be fully inlined, and a function defined in another `.cpp` file is invisible to the compiler unless you use [[link-time-optimization|LTO]]. So compilers use cost models: tiny functions (getters, operators, math helpers) are almost always inlined at `-O2`, big ones rarely.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'FORCEINLINE',
          text: 'Unreal\'s `FORCEINLINE` maps to `__forceinline` (MSVC) or `__attribute__((always_inline))` (Clang): a strong request that overrides the cost model. Engines use it on tiny math functions such as `FVector` operators, where a missed inline in a debug-ish build costs real frame time. Overuse it and builds get slower and binaries bigger.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'truefalse',
      prompt: 'Marking a function `inline` forces the compiler to inline it at every call site.',
      answer: false,
      explanation:
        'In modern C++ the `inline` keyword mainly means "this definition may appear in several translation units", which is what lets you define functions in headers (the linker keeps one copy of the weak symbol). Whether a call is actually inlined is the optimizer\'s decision: it inlines non-`inline` functions all the time (like `square` above) and may decline `inline` ones. Compiler-specific attributes (`always_inline`, `__forceinline`) are the stronger requests.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Tail calls: reusing the frame',
      blocks: [
        {
          type: 'p',
          text: 'You have now seen `jmp` where you expected `call` several times: `volume` ends with `jmp _Z4cubei`, and each case of the weapon switch with `jmp _Z4stabv@PLT`. When a call is the **last thing a function does**, its own frame is no longer needed. Instead of `call f` followed by `ret`, the compiler tears down its frame and **jumps** to `f`; when `f` returns, it returns straight to our caller. That is a [[tail-call]].',
        },
        {
          type: 'p',
          text: 'For recursion this turns stack growth into a loop. GCC goes further than you might expect: even the "naive" factorial, whose multiply happens *after* the recursive call, becomes a loop, because the compiler knows integer multiplication is associative and can keep a running product:',
        },
        {
          type: 'code',
          title: 'fact.cpp',
          code: `long factNaive(long n) {
    if (n <= 1) return 1;
    return n * factNaive(n - 1);
}`,
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2 -masm=intel',
          code: `_Z9factNaivel:
    mov     eax, 1
    cmp     rdi, 1
    jle     .L21
.L22:
    mov     rdx, rdi
    sub     rdi, 1
    imul    rax, rdx
    cmp     rdi, 1
    jne     .L22
.L21:
    ret`,
          annotations: [
            { lines: 2, text: 'An accumulator the source never declared, starting at 1.' },
            { lines: '5-10', text: 'The recursion is gone: a loop multiplies `rax` by `n`, `n - 1`, … down to 2. No calls, constant stack space.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Never rely on it',
          text: 'C++ does not guarantee tail calls. At `-O0` the same function recurses for real and a deep enough call overflows the stack, so code that only works with the optimization breaks in debug builds. Destructors that must run after the call, or arguments whose address escapes, also prevent it. Clang offers `[[clang::musttail]]` to make a tail call mandatory (or a compile error); otherwise, write the loop yourself.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'What the optimizer may assume',
      blocks: [
        {
          type: 'p',
          text: 'The optimizer may make any change that leaves the program\'s observable behavior the same: the [[as-if-rule]]. Two things limit and empower it in ways that surprise people. The first is **[[pointer-aliasing|aliasing]]**:',
        },
        {
          type: 'compare',
          left: {
            title: 'may alias (g++ -O2)',
            tone: 'neutral',
            lang: 'text',
            code: `// void addTwice(int* a, const int* b)
//   { *a += *b; *a += *b; }
mov     eax, DWORD PTR [rsi]
add     eax, DWORD PTR [rdi]
mov     DWORD PTR [rdi], eax
add     eax, DWORD PTR [rsi]
mov     DWORD PTR [rdi], eax
ret`,
          },
          right: {
            title: 'promised not to (__restrict)',
            tone: 'good',
            lang: 'text',
            code: `// void addTwiceR(int* __restrict a,
//   const int* __restrict b) { same body }
mov     eax, DWORD PTR [rsi]
add     eax, eax
add     DWORD PTR [rdi], eax
ret`,
          },
        },
        {
          type: 'p',
          text: 'On the left, `a` and `b` might point at the same `int`. Then the first store changes `*b`, so the compiler must store and **re-read** `*b` (line 6). On the right, `__restrict` promises they never overlap, so `*b` is read once and doubled. In engine code this shows up as loops that refuse to vectorize because an output array might overlap an input array.',
        },
        {
          type: 'p',
          text: 'The second is **[[undefined-behavior]]**. The optimizer assumes your program never has any, and reasons forward from that. You saw `x + 1 < x` become `false` in the previous unit. Dereferencing a pointer is a promise that it is not null:',
        },
        {
          type: 'code',
          title: 'readhp.cpp',
          code: `struct Enemy { int hp; int armor; };

int readHp(const Enemy* e) {
    int hp = e->hp;
    if (e == nullptr) return -1;
    return hp;
}`,
          annotations: [
            { lines: 4, text: 'If `e` were null, this line would already be undefined behavior. So from here on, the compiler may assume `e` is not null.' },
            { lines: 5, text: 'Therefore this test is always false, and the compiler deletes it.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2 -masm=intel',
          code: `_Z6readHpPK5Enemy:
    mov     eax, DWORD PTR [rdi]
    ret`,
          annotations: [
            { lines: 2, text: 'The null check is gone. A null `e` now crashes on the load instead of returning -1.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why would a compiler do this to you?',
          text: 'Because the same reasoning, applied to correct code, is what makes C++ fast. After inlining, redundant null checks, impossible overflow checks and dead branches pile up everywhere, and removing them is a large part of what `-O2` buys. The compiler cannot tell your deliberate-but-wrong check from a redundant one. Write checks **before** the operation they guard, and let `-fsanitize=undefined,address` catch the cases you miss.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'bug',
      prompt: 'A crash report shows `applyPoison` crashing with a null `target`, even though the code clearly checks for null. In the `-O2` build the check does not exist. Tap the line that lets the compiler remove it.',
      code: `struct Actor {
    int hp;
    int poisonTicks;
};

void applyPoison(Actor* target, int ticks) {
    int before = target->poisonTicks;
    if (target == nullptr) {
        return;
    }
    target->poisonTicks = before + ticks;
}`,
      bugLines: [7],
      explanation:
        'Line 7 dereferences `target` before the check. A null `target` there is undefined behavior, so the optimizer concludes `target` cannot be null and deletes lines 8–10 as dead code, exactly as GCC did to `readHp`. With a null pointer the program now faults on line 7 (or worse, if the offset is large enough to land on mapped memory). Move the read below the check: test first, then dereference.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'order',
      prompt: 'Put the steps of GCC\'s jump-table dispatch for `switch (w)` (cases 0–5) in order.',
      linesAreCode: false,
      lines: [
        'Compare `w` with 5 as an unsigned number and jump to the default if above',
        'Load the 32-bit table entry at `table + w*4`',
        'Add the table\'s base address to the entry to get the case address',
        'Jump indirectly to that address',
      ],
      distractors: ['Compare `w` with each case value in turn until one matches', 'Call the case code and return to the switch'],
      explanation:
        'The bounds check must come first, because reading `table[w]` for an out-of-range `w` would read past the table and jump to garbage. The entry is an offset relative to the table (for position independence), so it is added to the base before the indirect `jmp`. Comparing against each case in turn is the strategy for sparse switches, and the cases are jumped to, not called.',
    },
  ],
  takeaways: [
    '`if`/`else` becomes a compare plus a conditional jump, usually with the condition inverted so the then-branch falls through; `[[likely]]`/`[[unlikely]]` steer the layout.',
    'Branches that guard side effects or memory accesses stay jumps; cheap, safe value selections become `cmov`/`setcc`.',
    'Loops are rotated (test at the bottom) and strength-reduced: the index often disappears into a pointer compared with an end pointer.',
    'Constant multiplications become `lea`/shifts and constant divisions become a multiply by a magic reciprocal; signed division costs extra instructions to round toward zero.',
    'A switch becomes a jump table, a lookup table or a compare tree depending on how dense its cases are and what they do.',
    'Inlining matters mainly because it lets the combined code be optimized together; tail calls turn `call`+`ret` into `jmp`. Neither is guaranteed.',
    'Possible aliasing forces reloads; undefined behavior lets the optimizer delete checks that come after the operation they were meant to guard.',
  ],
  reading: [
    {
      title: 'Compiler Explorer',
      url: 'https://godbolt.org/',
      source: 'other',
      note: 'Try each example with -O0, -O2 and -O3, and add `-funroll-loops` or `[[unlikely]]` to see the layouts change.',
    },
    {
      title: 'Computer Systems: A Programmer\'s Perspective (CS:APP)',
      url: 'https://csapp.cs.cmu.edu/',
      source: 'book',
      note: 'Section 3.6 on control (conditional moves, loops, switch statements) and chapter 5 on optimizing program performance.',
    },
    {
      title: 'Agner Fog: Optimizing software in C++',
      url: 'https://www.agner.org/optimize/',
      source: 'article',
      note: 'Manual 1, chapter "Optimizations in the compiler", lists what compilers can and cannot do, with aliasing and inlining in detail.',
    },
    {
      title: 'C++ attribute: likely, unlikely',
      url: 'https://en.cppreference.com/w/cpp/language/attributes/likely',
      source: 'cppreference',
      note: 'The C++20 attributes for branch layout hints, and their caveats.',
    },
  ],
};
