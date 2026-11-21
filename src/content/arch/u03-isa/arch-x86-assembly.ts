import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-x86-assembly',
  title: 'Reading x86-64 Assembly',
  summary: 'Read real g++ -O2 output for your own functions: registers, mov/lea/add/imul, addressing modes, flags with cmp/test/jcc/cmov, and why -O0 code looks so different.',
  minutes: 20,
  objectives: [
    'Generate Intel-syntax assembly for your C++ and read GCC\'s output conventions',
    'Name the x86-64 registers and sub-registers, and explain why writing a 32-bit register zeroes the upper half',
    'Read mov, lea, add, sub, imul, movsx/movzx and the [base + index*scale + disp] addressing mode',
    'Explain how cmp/test set the flags and how jcc, setcc and cmov consume them, including signed vs unsigned conditions',
    'Explain why -O0 output stores every variable in memory and -O2 output does not',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Why a game programmer reads assembly',
      blocks: [
        {
          type: 'p',
          text: 'You will rarely *write* [[assembly-language|assembly]]. You will read it often. A profiler such as VTune, Superluminal, PIX or `perf` shows the hottest instructions of a function, not its C++ lines. A crash dump from a shipped (optimized) build points at an instruction address. And when you wonder whether the compiler vectorized a loop or inlined a call, the assembly is the only honest answer.',
        },
        {
          type: 'p',
          text: 'Getting it is one command. Throughout this course, assembly comes from GCC 13 on x86-64 Linux with these flags:',
        },
        {
          type: 'code',
          lang: 'shell',
          code: `g++ -std=c++20 -O2 -S -masm=intel \\
    -fno-asynchronous-unwind-tables -fcf-protection=none \\
    damage.cpp -o damage.s
# or disassemble a compiled object file:
objdump -d -M intel damage.o`,
          annotations: [
            { lines: 1, text: '`-S` stops after compiling and writes assembly. `-masm=intel` picks Intel syntax (the default on Linux is AT&T).' },
            { lines: 2, text: 'Noise removal only. `-fcf-protection=none` drops the `endbr64` landing-pad instructions of Intel CET, which Ubuntu\'s GCC adds by default. `-fno-asynchronous-unwind-tables` drops the `.cfi_*` unwind directives in C code, but C++ keeps them for exception handling, so the listings in this course also delete those directive lines. The instructions are otherwise identical.' },
            { lines: 5, text: '`objdump` shows the same code with addresses and the raw bytes of each instruction.' },
          ],
        },
        {
          type: 'p',
          text: 'Two syntaxes exist for the same machine code. Intel syntax (used by Intel\'s and AMD\'s manuals, MSVC and Visual Studio\'s disassembly window) writes the **destination first**. AT&T syntax (GNU tools\' default) writes it last and decorates everything. The same instruction from `return e[i].hp;`, with the C++ shown in the next cards:',
        },
        {
          type: 'compare',
          left: {
            title: 'Intel syntax (this course)',
            tone: 'good',
            lang: 'text',
            code: `sal     rsi, 4
mov     eax, DWORD PTR 12[rsi+rdi]
ret`,
          },
          right: {
            title: 'AT&T syntax (GNU default)',
            tone: 'neutral',
            lang: 'text',
            code: `salq    $4, %rsi
movl    12(%rsi,%rdi), %eax
ret`,
          },
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'GCC\'s Intel dialect',
          text: 'GCC prints a constant displacement *before* the bracket: `12[rsi+rdi]` means the address `rsi + rdi + 12`. `objdump`, MSVC and the Intel manuals write the same operand as `[rsi+rdi*1+0xc]`. Both mean exactly the same thing.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Compiler Explorer',
          text: 'The Run button on any C++ example in this app opens it in [Compiler Explorer](https://godbolt.org/), which colors each C++ line and the instructions it produced. It is the fastest way to answer "what did the compiler do with this?"',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The registers and their nicknames',
      blocks: [
        {
          type: 'p',
          text: 'x86-64 has 16 64-bit [[general-purpose-register|general-purpose registers]]. Eight have historical names from the 16-bit 8086 (`rax`, `rbx`, `rcx`, `rdx`, `rsi`, `rdi`, `rbp`, `rsp`); the other eight are numbered `r8`–`r15`. Each one can also be used at narrower widths:',
        },
        {
          type: 'figure',
          svg: '<svg viewBox="0 0 520 210" xmlns="http://www.w3.org/2000/svg"><text x="23.8" y="16" text-anchor="middle" font-size="10" class="t-gray">63</text><text x="263.8" y="16" text-anchor="middle" font-size="10" class="t-gray">31</text><text x="383.8" y="16" text-anchor="middle" font-size="10" class="t-gray">15</text><text x="443.8" y="16" text-anchor="middle" font-size="10" class="t-gray">7</text><text x="496.2" y="16" text-anchor="middle" font-size="10" class="t-gray">0</text><rect x="20.0" y="24" width="480.0" height="30" rx="3" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" class="s-blue"/><text x="260.0" y="44" text-anchor="middle" font-size="13" font-family="monospace" class="t-blue">rax (64 bits)</text><rect x="260.0" y="62" width="240.0" height="30" rx="3" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" class="s-green"/><text x="380.0" y="82" text-anchor="middle" font-size="13" font-family="monospace" class="t-green">eax (32)</text><rect x="380.0" y="100" width="120.0" height="30" rx="3" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" class="s-purple"/><text x="440.0" y="120" text-anchor="middle" font-size="13" font-family="monospace" class="t-purple">ax (16)</text><rect x="380.0" y="138" width="60.0" height="30" rx="3" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" class="s-orange"/><text x="410.0" y="158" text-anchor="middle" font-size="13" font-family="monospace" class="t-orange">ah</text><rect x="440.0" y="138" width="60.0" height="30" rx="3" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" class="s-orange"/><text x="470.0" y="158" text-anchor="middle" font-size="13" font-family="monospace" class="t-orange">al</text><text x="20" y="84" font-size="12" class="t-gray">writing eax zeroes</text><text x="20" y="100" font-size="12" class="t-gray">bits 63..32 of rax</text><text x="20" y="128" font-size="12" class="t-gray">writing ax, ah or al</text><text x="20" y="144" font-size="12" class="t-gray">leaves the other bits alone</text><text x="20" y="194" font-size="12">Same for rdi/edi/di/dil and r8/r8d/r8w/r8b (ah exists only for rax–rdx)</text></svg>',
          alt: 'The 64-bit register rax drawn as a bar, with eax as its low 32 bits, ax as its low 16 bits, and ah and al as the high and low bytes of ax.',
          caption: 'One register, four names. An `int` lives in `eax`/`edi`; a pointer or `long` in `rax`/`rdi`; a `char` or `bool` in `al`/`dil`.',
        },
        {
          type: 'table',
          headers: ['Register', 'Usual job in compiled code (System V, Linux/macOS)'],
          rows: [
            ['`rdi`, `rsi`, `rdx`, `rcx`, `r8`, `r9`', 'The first six integer or pointer arguments, in that order'],
            ['`rax`', 'The return value (`eax` for an `int`, `al` for a `bool`)'],
            ['`xmm0`–`xmm7`', 'Floating-point arguments; `xmm0` also returns a `float` or `double`'],
            ['`rsp`', 'The [[stack-pointer]]: top of the call stack'],
            ['`rip`', 'The [[program-counter|instruction pointer]]; code reads globals as `[rip + offset]`'],
            ['`rflags`', 'Condition [[cpu-flags|flags]] set by arithmetic'],
          ],
        },
        {
          type: 'p',
          text: 'The rule in the figure is the one that confuses everyone at first: **writing a 32-bit register zeroes the upper 32 bits** of the 64-bit register, while writing an 8- or 16-bit register leaves the rest untouched. Real output for converting an `unsigned` to `unsigned long`:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ -O2: unsigned long widenU(unsigned x) { return x; }',
          code: `_Z6widenUj:
    mov     eax, edi
    ret`,
          annotations: [
            { lines: 2, text: 'A plain 32-bit copy is all it takes: writing `eax` clears bits 63–32 of `rax`, which *is* zero extension. Widening a signed `int` instead needs `movsx rax, edi` (sign extension).' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why zero the top half?',
          text: 'If a 32-bit write kept the old upper bits, the result would depend on the register\'s *previous* value, so every 32-bit operation would have to wait for whatever last wrote that register. Out-of-order CPUs hate such false dependencies. AMD defined x86-64 so 32-bit writes start fresh; 8- and 16-bit writes kept the old merging behavior for compatibility, which is why compilers avoid them.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'numeric',
      prompt: '`rax` holds `0x1122334455667788`. The CPU executes `mov eax, -1`. What does `rax` hold now? Answer in hex.',
      inputBase: 16,
      answer: '0x00000000FFFFFFFF',
      alsoAccept: [4294967295],
      answerText: '0x00000000_FFFFFFFF',
      label: '`rax` =',
      hint: 'What is -1 as a 32-bit pattern, and what happens to bits 63–32?',
      explanation:
        '-1 as 32 bits is `0xFFFFFFFF`. Writing it to `eax` replaces the low half and **zeroes** the high half, so `rax` = `0x00000000_FFFFFFFF` (4,294,967,295), not -1 and not `0x11223344_FFFFFFFF`. Had the instruction been `mov ax, -1`, only the low 16 bits would change: `0x11223344_5566FFFF`.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Your first functions: mov, add, lea, imul',
      blocks: [
        {
          type: 'p',
          text: 'Here are three tiny functions and GCC\'s complete `-O2` output for each. Arguments arrive in `edi`, `esi`, `edx` (the low halves of `rdi`, `rsi`, `rdx`, because they are `int`s) and the result leaves in `eax`:',
        },
        {
          type: 'code',
          title: 'arith.cpp',
          code: `int add3(int a, int b, int c) {
    return a + b + c;
}
int times5(int x) {
    return x * 5;
}
int mul(int a, int b) {
    return a * b;
}`,
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2 -masm=intel (directives removed)',
          code: `_Z4add3iii:
    add     edi, esi
    lea     eax, [rdi+rdx]
    ret
_Z6times5i:
    lea     eax, [rdi+rdi*4]
    ret
_Z3mulii:
    mov     eax, edi
    imul    eax, esi
    ret`,
          annotations: [
            { lines: 1, text: 'Labels are [[name-mangling|mangled]] names: `_Z4add3iii` is "a 4-character name `add3` taking `int, int, int`". Pipe the output through `c++filt` to demangle.' },
            { lines: 2, text: '`add edi, esi`: `edi = edi + esi`. Two-operand form: the destination is also the first source.' },
            { lines: 3, text: '`lea` ("load effective address") computes an address-style expression **without touching memory**. Here it is just a three-operand add: `eax = rdi + rdx`.' },
            { lines: 6, text: '`x * 5` as `x + x*4`, using the addressing hardware\'s scale factor. One cheap instruction instead of a multiply.' },
            { lines: '9-10', text: 'A general multiply: copy `a` into the return register, then `imul eax, esi` (`eax *= esi`, keeping the low 32 bits).' },
          ],
        },
        {
          type: 'table',
          headers: ['Instruction', 'Meaning'],
          rows: [
            ['`mov dst, src`', '`dst = src` (register, memory or constant; at most one memory operand)'],
            ['`add dst, src` / `sub dst, src`', '`dst += src` / `dst -= src`, and set the flags'],
            ['`imul dst, src`', '`dst *= src` (low bits of the product)'],
            ['`lea dst, [expr]`', '`dst = expr`, address arithmetic with no memory access and no flags'],
            ['`movsx` / `movzx`', 'copy and widen with sign or zero extension (`char`→`int`, `int`→`long`)'],
            ['`ret`', 'return to the caller (the next lesson shows how)'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does the compiler love lea?',
          text: 'Most x86 arithmetic is destructive (`add edi, esi` overwrites `edi`) and sets the flags. `lea` gives a **non-destructive** three-operand add with an optional shift by 1, 2, 4 or 8 and a constant, all in one instruction, and it leaves the flags alone. It was built for computing addresses, but an address is just an integer.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Addressing modes: [base + index*scale + disp]',
      blocks: [
        {
          type: 'p',
          text: 'Any x86-64 memory operand can be written as `[base + index*scale + displacement]`, where base and index are registers, scale is 1, 2, 4 or 8, and displacement is a 32-bit signed constant. This one [[addressing-mode]] covers almost every C++ access pattern. The `DWORD PTR` (4 bytes) or `QWORD PTR` (8 bytes) in front says how many bytes to read or write.',
        },
        {
          type: 'code',
          title: 'access.cpp',
          code: `struct Enemy { int id; float x, y; int hp; };  // 16 bytes

int load(const int* p, long i) {
    return p[i];
}
int enemyHp(const Enemy* e, long i) {
    return e[i].hp;
}
void heal(int* hp, long i, int amount) {
    hp[i] += amount;
}`,
          annotations: [
            { lines: 1, text: '`hp` sits at byte offset 12 inside each 16-byte `Enemy`.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2 -masm=intel',
          code: `_Z4loadPKil:
    mov     eax, DWORD PTR [rdi+rsi*4]
    ret
_Z7enemyHpPK5Enemyl:
    sal     rsi, 4
    mov     eax, DWORD PTR 12[rsi+rdi]
    ret
_Z4healPili:
    add     DWORD PTR [rdi+rsi*4], edx
    ret`,
          annotations: [
            { lines: 2, text: '`p[i]` is `*(p + i)`, and pointer arithmetic scales by `sizeof(int)` = 4. Base `rdi` = `p`, index `rsi` = `i`, scale 4.' },
            { lines: 5, text: '`sizeof(Enemy)` = 16 is not a legal scale (max 8), so GCC shifts `i` left by 4 first (`sal` = shift arithmetic left, the same as `shl`): `rsi = i * 16`.' },
            { lines: 6, text: 'Base + index + displacement 12 = `&e[i].hp`. Struct field offsets become displacements.' },
            { lines: 9, text: 'x86-64 arithmetic can read and write memory directly (the previous lesson\'s register-memory ISA).' },
          ],
        },
        {
          type: 'table',
          headers: ['C++', 'Operand'],
          rows: [
            ['`*p` (an `int*`)', '`DWORD PTR [rdi]`'],
            ['`p->hp` (field at offset 12)', '`DWORD PTR 12[rdi]`'],
            ['`p[i]` (`int`, `float`)', '`DWORD PTR [rdi+rsi*4]`'],
            ['`q[i]` (`double`, `long`, any pointer)', '`QWORD PTR [rdi+rsi*8]`'],
            ['`arr[i].field` (struct of 8 bytes)', '`DWORD PTR off[rdi+rsi*8]`'],
            ['a global `gScore`', '`DWORD PTR gScore[rip]`, relative to the instruction pointer'],
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Element sizes of 1, 2, 4 or 8 bytes are free to index',
          text: 'Indexing an array of 4- or 8-byte elements folds into the load itself. Other sizes cost an extra shift or multiply per access, which is one tiny reason engines like power-of-two component sizes. Far more important, as later units show, is how many elements fit in each 64-byte cache line.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'numeric',
      prompt: 'An instruction reads `QWORD PTR 16[rdi+rsi*8]`. If `rdi` = `0x1000` and `rsi` = 3, what address does it read from? Answer in hex.',
      inputBase: 16,
      answer: '0x1028',
      alsoAccept: [4136],
      label: 'address =',
      hint: 'Effective address = base + index × scale + displacement. Watch out: the displacement 16 is decimal.',
      explanation:
        'Base `0x1000` + index 3 × scale 8 = 24 + displacement 16 gives `0x1000 + 40` = `0x1028`. In C++ terms this could be `obj->arr[i]` where `arr` is an array of 8-byte values starting 16 bytes into the object. The CPU computes this sum in its address-generation unit as part of the load, at no extra cost.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Flags, compares and conditional instructions',
      blocks: [
        {
          type: 'p',
          text: 'x86-64 makes decisions in two halves. Arithmetic instructions set bits in the [[cpu-flags|flags register]] as a side effect, and conditional instructions read them later:',
        },
        {
          type: 'table',
          headers: ['Flag', 'Set when the result…', 'Used by'],
          rows: [
            ['ZF (zero)', 'is zero', '`je`/`jne`, `sete`, `cmove` (equal / not equal)'],
            ['SF (sign)', 'has its top bit set (negative if signed)', '`js`/`jns`, `cmovs`'],
            ['CF (carry)', 'overflowed as an **unsigned** number (carry or borrow)', '`jb`/`ja` (below/above: unsigned)'],
            ['OF (overflow)', 'overflowed as a **signed** number', '`jl`/`jg` (less/greater: signed, combine SF and OF)'],
          ],
        },
        {
          type: 'p',
          text: 'The flags are easy to compute yourself. This program does in C++ what `cmp a, b` does in silicon, then evaluates the signed condition `jl` (taken when SF ≠ OF) and the unsigned condition `jb` (taken when CF = 1):',
        },
        {
          type: 'code',
          title: 'flags.cpp',
          runnable: true,
          code: `#include <climits>
#include <cstdint>
#include <cstdio>

// What "cmp a, b" leaves in the flags: it computes a - b
// on 32 bits and keeps only these four bits.
struct Flags { bool zf, sf, cf, of; };

Flags cmp32(std::uint32_t a, std::uint32_t b) {
    std::uint32_t r = a - b;                  // wraps, like hardware
    bool sa = a >> 31, sb = b >> 31, sr = r >> 31;
    return {
        r == 0,                // ZF: result is zero
        sr,                    // SF: top bit of the result
        a < b,                 // CF: unsigned borrow
        sa != sb && sr != sa,  // OF: signed overflow
    };
}

void show(int a, int b) {
    Flags f = cmp32(static_cast<std::uint32_t>(a),
                    static_cast<std::uint32_t>(b));
    bool jl = f.sf != f.of;    // signed "less"
    bool jb = f.cf;            // unsigned "below"
    std::printf("cmp %d, %d: ZF=%d SF=%d CF=%d OF=%d jl:%s jb:%s\\n",
                a, b, f.zf, f.sf, f.cf, f.of,
                jl ? "yes" : "no", jb ? "yes" : "no");
}

int main() {
    show(5, 5);
    show(3, 7);
    show(-1, 1);   // signed: -1 < 1; unsigned: 0xFFFFFFFF > 1
    show(7, 3);
    show(INT_MIN, 1);  // a - b overflows: SF alone lies
}`,
          output: 'cmp 5, 5: ZF=1 SF=0 CF=0 OF=0 jl:no jb:no\ncmp 3, 7: ZF=0 SF=1 CF=1 OF=0 jl:yes jb:yes\ncmp -1, 1: ZF=0 SF=1 CF=0 OF=0 jl:yes jb:no\ncmp 7, 3: ZF=0 SF=0 CF=0 OF=0 jl:no jb:no\ncmp -2147483648, 1: ZF=0 SF=0 CF=0 OF=1 jl:yes jb:no',
          annotations: [
            { lines: 10, text: 'The subtraction is done on `uint32_t`, which wraps modulo 2³², exactly like the hardware. (Doing it on `int` could overflow, which is undefined behavior in C++.)' },
            { lines: 15, text: 'CF is the unsigned borrow: it is set when `a < b` as unsigned numbers.' },
            { lines: 16, text: 'OF is set when two operands of different signs produce a result whose sign differs from `a`: the true difference did not fit in 32 signed bits.' },
            { lines: 23, text: '"Signed less than" is SF ≠ OF, not just SF: when the subtraction overflows, the sign bit is wrong, and OF corrects it.' },
            { lines: 33, text: 'The same bit patterns, two answers: as signed, -1 < 1; as unsigned, `0xFFFFFFFF` is far above 1. The compiler picks `jl` or `jb` from the C++ types.' },
            { lines: 35, text: '`INT_MIN - 1` overflows to `0x7FFFFFFF`, a positive-looking result (SF = 0), yet `INT_MIN < 1`. OF = 1 rescues the signed comparison.' },
          ],
        },
        {
          type: 'p',
          text: '`cmp a, b` computes `a - b` and throws the result away, keeping only the flags. `test a, b` does the same with `a & b`; `test x, x` is the idiomatic "compare `x` with zero". Then a **jump** (`jcc`), a **set** (`setcc`, writes 0 or 1 into a byte register) or a **[[conditional-move]]** (`cmovcc`) reads the flags:',
        },
        {
          type: 'code',
          title: 'compare.cpp',
          code: `bool isDead(int hp) { return hp <= 0; }
bool belowU(unsigned a, unsigned b) { return a < b; }
int clampMin(int x) { return x < 0 ? 0 : x; }
int maxOf(int a, int b) { return a > b ? a : b; }`,
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2 -masm=intel',
          code: `_Z6isDeadi:
    test    edi, edi
    setle   al
    ret
_Z6belowUjj:
    cmp     edi, esi
    setb    al
    ret
_Z8clampMini:
    xor     eax, eax
    test    edi, edi
    cmovns  eax, edi
    ret
_Z5maxOfii:
    cmp     edi, esi
    mov     eax, esi
    cmovge  eax, edi
    ret`,
          annotations: [
            { lines: '2-3', text: '`hp <= 0`: test `hp` against itself, then `setle` ("set if less or equal", a **signed** condition) writes 0 or 1 into `al`. A `bool` returns in `al`.' },
            { lines: 7, text: 'For `unsigned` operands the compiler uses `setb` ("below"), which reads the carry flag. Same `<` in C++, different instruction: the type decides.' },
            { lines: '10-12', text: '`xor eax, eax` is the standard way to zero a register (2 bytes, recognized by the CPU as dependency-free). Then: if `x` is **n**ot **s**igned (≥ 0), move `x` into `eax`.' },
            { lines: '15-17', text: 'No branch at all: start with `b`, and if `a >= b` overwrite it with `a`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why separate the compare from the decision?',
          text: 'One `cmp` can feed several conditional instructions, and ordinary arithmetic sets the flags for free, so `sub` followed by `js` needs no compare at all. The cost is hidden state that every instruction may change, which complicates out-of-order hardware. RISC-V decided the other way: it has **no flags register**, and its branches compare two registers themselves (`blt a0, a1, label`).',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why cmov instead of a branch?',
          text: 'A conditional jump makes the CPU guess the direction; a wrong guess costs a pipeline flush of roughly 15–20 cycles on modern desktop cores. A `cmov` always executes and can never be mispredicted, so for small, unpredictable decisions (clamping, min/max) compilers prefer it. The Branch Prediction lesson measures this trade-off.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Watch it run: one function, instruction by instruction',
      blocks: [
        {
          type: 'p',
          text: 'Here is a damage function with two clamps. GCC compiles it to seven instructions with no branches at all:',
        },
        {
          type: 'code',
          title: 'damage.cpp',
          code: `int applyDamage(int hp, int dmg, int armor) {
    int dealt = dmg - armor;
    if (dealt < 0) dealt = 0;
    int left = hp - dealt;
    return left < 0 ? 0 : left;
}`,
          annotations: [
            { lines: 2, text: 'Armor absorbs part of the hit…' },
            { lines: 3, text: '…but never heals: a negative `dealt` becomes 0.' },
            { lines: 5, text: 'Health never drops below zero.' },
          ],
        },
        {
          "type": "algo",
          "view": "array",
          "code": "_Z11applyDamageiii:\n    sub     esi, edx\n    mov     eax, 0\n    cmovs   esi, eax\n    mov     eax, 0\n    sub     edi, esi\n    cmovns  eax, edi\n    ret",
          "lang": "text",
          "interval": 1300,
          "caption": "Real `g++ -O2` output, traced in gdb for two calls. Each box is a register; orange marks a register whose value the instruction just changed. SF and ZF are flag bits set by `sub`.",
          "frames": [
            {
              "note": "Call `applyDamage(10, 8, 12)`. The arguments arrive in `edi`, `esi` and `edx`; `eax` holds a leftover value.",
              "array": [
                "10",
                "8",
                "12",
                "?"
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "gray"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "gray"
                }
              ],
              "vars": [
                [
                  "SF",
                  "–"
                ],
                [
                  "ZF",
                  "–"
                ]
              ]
            },
            {
              "note": "`sub esi, edx`: `esi` = dmg - armor. The result also sets the flags; SF (sign flag) = 1 because the result is negative.",
              "array": [
                "10",
                "-4",
                "12",
                "?"
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
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "orange"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "gray"
                }
              ],
              "lines": [
                2
              ],
              "vars": [
                [
                  "SF",
                  "1"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`mov eax, 0` loads the fallback value. GCC uses `mov`, not `xor eax, eax`, because `xor` would overwrite the flags that `cmovs` still needs.",
              "array": [
                "10",
                "-4",
                "12",
                "0"
              ],
              "marks": [
                {
                  "index": 3,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "gray"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "orange"
                }
              ],
              "lines": [
                3
              ],
              "vars": [
                [
                  "SF",
                  "1"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`cmovs esi, eax`: SF = 1, so the move happens. `esi` is now `dealt` = 0.",
              "array": [
                "10",
                "0",
                "12",
                "0"
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
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "orange"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "gray"
                }
              ],
              "lines": [
                4
              ],
              "vars": [
                [
                  "SF",
                  "1"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`mov eax, 0` again: the fallback for the final clamp.",
              "array": [
                "10",
                "0",
                "12",
                "0"
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 0,
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "gray"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "gray"
                }
              ],
              "lines": [
                5
              ],
              "vars": [
                [
                  "SF",
                  "1"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`sub edi, esi`: `edi` = hp - dealt = 10; SF = 0.",
              "array": [
                "10",
                "0",
                "12",
                "0"
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 0,
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "gray"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "gray"
                }
              ],
              "lines": [
                6
              ],
              "vars": [
                [
                  "SF",
                  "0"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`cmovns eax, edi`: \"move if not sign\". SF = 0, so the move happens. `eax` = 10.",
              "array": [
                "10",
                "0",
                "12",
                "10"
              ],
              "marks": [
                {
                  "index": 3,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "gray"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "orange"
                }
              ],
              "lines": [
                7
              ],
              "vars": [
                [
                  "SF",
                  "0"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`ret`: the result 10 is in `eax`, where the caller expects it.",
              "array": [
                "10",
                "0",
                "12",
                "10"
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 0,
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "gray"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "gray"
                }
              ],
              "lines": [
                8
              ],
              "vars": [
                [
                  "SF",
                  "0"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "Call `applyDamage(5, 20, 3)`. The arguments arrive in `edi`, `esi` and `edx`; `eax` holds a leftover value.",
              "array": [
                "5",
                "20",
                "3",
                "?"
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "gray"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "gray"
                }
              ],
              "vars": [
                [
                  "SF",
                  "–"
                ],
                [
                  "ZF",
                  "–"
                ]
              ]
            },
            {
              "note": "`sub esi, edx`: `esi` = dmg - armor. The result also sets the flags; SF (sign flag) = 0 because the result is not negative.",
              "array": [
                "5",
                "17",
                "3",
                "?"
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
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "orange"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "gray"
                }
              ],
              "lines": [
                2
              ],
              "vars": [
                [
                  "SF",
                  "0"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`mov eax, 0` loads the fallback value. GCC uses `mov`, not `xor eax, eax`, because `xor` would overwrite the flags that `cmovs` still needs.",
              "array": [
                "5",
                "17",
                "3",
                "0"
              ],
              "marks": [
                {
                  "index": 3,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "gray"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "orange"
                }
              ],
              "lines": [
                3
              ],
              "vars": [
                [
                  "SF",
                  "0"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`cmovs esi, eax`: SF = 0, so the move does not happen. `esi` is now `dealt` = 17.",
              "array": [
                "5",
                "17",
                "3",
                "0"
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 0,
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "gray"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "gray"
                }
              ],
              "lines": [
                4
              ],
              "vars": [
                [
                  "SF",
                  "0"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`mov eax, 0` again: the fallback for the final clamp.",
              "array": [
                "5",
                "17",
                "3",
                "0"
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 0,
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "gray"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "gray"
                }
              ],
              "lines": [
                5
              ],
              "vars": [
                [
                  "SF",
                  "0"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`sub edi, esi`: `edi` = hp - dealt = -12; SF = 1.",
              "array": [
                "-12",
                "17",
                "3",
                "0"
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
                  "label": "edi",
                  "color": "orange"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "gray"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "gray"
                }
              ],
              "lines": [
                6
              ],
              "vars": [
                [
                  "SF",
                  "1"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`cmovns eax, edi`: \"move if not sign\". SF = 1, so the move does not happen. `eax` = 0.",
              "array": [
                "-12",
                "17",
                "3",
                "0"
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 0,
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "gray"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "gray"
                }
              ],
              "lines": [
                7
              ],
              "vars": [
                [
                  "SF",
                  "1"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            },
            {
              "note": "`ret`: the result 0 is in `eax`, where the caller expects it.",
              "array": [
                "-12",
                "17",
                "3",
                "0"
              ],
              "marks": [],
              "pointers": [
                {
                  "index": 0,
                  "label": "edi",
                  "color": "gray"
                },
                {
                  "index": 1,
                  "label": "esi",
                  "color": "gray"
                },
                {
                  "index": 2,
                  "label": "edx",
                  "color": "gray"
                },
                {
                  "index": 3,
                  "label": "eax",
                  "color": "gray"
                }
              ],
              "lines": [
                8
              ],
              "vars": [
                [
                  "SF",
                  "1"
                ],
                [
                  "ZF",
                  "0"
                ]
              ]
            }
          ]
        },
        {
          type: 'p',
          text: 'Two details are worth slowing down for. First, **the `if` disappeared**: both clamps became `cmov`s that read the sign flag set by the preceding `sub`. Second, GCC loads the constant 0 with `mov eax, 0` (5 bytes) rather than the usual `xor eax, eax` (2 bytes), because `xor` would overwrite the flags that the next `cmov` still needs. Every instruction choice has a reason.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'GCC produced this for a function `int f(int a, int b)`. Which C++ body matches it?',
      code: `_Z1fii:
    cmp     edi, esi
    mov     eax, esi
    cmovle  eax, edi
    ret`,
      lang: 'text',
      options: [
        { text: '`return a < b ? b : a;`', why: 'That is the maximum. Here `eax` starts as `b` and is replaced by `a` when `a <= b`, so the smaller value wins.' },
        { text: '`return a <= b ? a : b;`', correct: true, why: '`cmp edi, esi` compares `a` with `b`; `eax` = `b`; if `a <= b` (signed), `eax` = `a`. That is `std::min(a, b)`.' },
        { text: '`return a - b;`', why: '`cmp` computes `a - b` only to set the flags and discards the result. Nothing subtracted ends up in `eax`.' },
        { text: '`return a <= b;`', why: 'A `bool` result would be produced with `setle al`, giving 0 or 1. Here `eax` receives one of the inputs.' },
      ],
      explanation:
        'Read it in three moves: the arguments are `a` (`edi`) and `b` (`esi`); the result starts as `b`; `cmovle` replaces it with `a` when `a <= b` by a **signed** comparison (`le`, not `be`). That is the minimum. When a function has a conditional move, ask: what is the default value, and what replaces it under which condition?',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: '-O0 vs -O2: why debug code looks so different',
      blocks: [
        {
          type: 'p',
          text: 'Compile `add3` without optimization and the three-instruction function balloons:',
        },
        {
          type: 'compare',
          left: {
            title: 'g++ -O0 (debug)',
            tone: 'bad',
            lang: 'text',
            code: `_Z4add3iii:
    push    rbp
    mov     rbp, rsp
    mov     DWORD PTR -4[rbp], edi
    mov     DWORD PTR -8[rbp], esi
    mov     DWORD PTR -12[rbp], edx
    mov     edx, DWORD PTR -4[rbp]
    mov     eax, DWORD PTR -8[rbp]
    add     edx, eax
    mov     eax, DWORD PTR -12[rbp]
    add     eax, edx
    pop     rbp
    ret`,
          },
          right: {
            title: 'g++ -O2 (release)',
            tone: 'good',
            lang: 'text',
            code: `_Z4add3iii:
    add     edi, esi
    lea     eax, [rdi+rdx]
    ret`,
          },
        },
        {
          type: 'p',
          text: 'At `-O0`, GCC gives **every variable a home in memory** on the stack frame (`-4[rbp]` is `a`, `-8[rbp]` is `b`, `-12[rbp]` is `c`). Each statement loads what it needs from memory and stores its result back. Nothing is kept in registers between statements.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'This is a feature, not laziness',
          text: 'Unoptimized code exists for the [[debugger]]. Because every variable has one fixed memory location, you can stop on any line, inspect or **change** any variable, and continue, and the program will use your new value. Each C++ statement maps to a contiguous block of instructions, so stepping line by line works. At `-O2` variables live in registers that are reused, statements are merged and reordered, and the debugger says "value optimized out".',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Debug builds and games',
          text: 'Unoptimized C++ can run several times slower than release, and template-heavy code (containers, math libraries) suffers most, because thousands of tiny functions are no longer inlined. That is why studios ship *development* configurations that are optimized but keep debug info, and why Unreal\'s DebugGame and Development configurations exist. GCC\'s `-Og` is a middle ground: optimizations that do not hurt debugging.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Read optimized code',
          text: 'When you study assembly for performance, always look at the build you ship. `-O0` output tells you about the compiler\'s debugging conventions, not about your code\'s speed.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'bug',
      prompt: 'This helper should detect that adding 1 to `x` would overflow. GCC 13 at `-O2` compiles it to just `xor eax, eax` / `ret`: it always returns `false`. Tap the line responsible.',
      code: `#include <climits>

// Returns true if x + 1 would overflow an int.
bool willOverflow(int x) {
    return x + 1 < x;
}

bool safeIncrement(int& score) {
    if (willOverflow(score)) return false;
    ++score;
    return true;
}`,
      bugLines: [5],
      explanation:
        'Signed [[integer-overflow]] is [[undefined-behavior]], so the compiler may assume `x + 1` never overflows. Under that assumption `x + 1 < x` is always false, and GCC folds the function to `return false` (`xor eax, eax`). The check vanishes exactly when you need it. Test **before** doing the arithmetic: `return x == INT_MAX;` (that is what `<climits>` is for), or use `__builtin_add_overflow`. Unsigned arithmetic wraps by definition, so the same pattern would work for `unsigned`.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'A survival kit for reading compiler output',
      blocks: [
        {
          type: 'p',
          text: 'Real compiler output is full of idioms that look strange until you know them. These cover most of what you will meet in a profiler:',
        },
        {
          type: 'table',
          headers: ['You see', 'It means'],
          rows: [
            ['`xor eax, eax`', '`eax = 0` (shorter than `mov eax, 0`; the CPU knows it does not depend on the old value)'],
            ['`test edi, edi` then `je`/`jle`/`js`', 'compare with zero'],
            ['`lea eax, [rdi+rdi*2]`', 'arithmetic, here `x * 3`; no memory is touched'],
            ['`movsx` / `movsxd` / `cdqe`', 'sign-extend a signed value to a wider register'],
            ['`movzx`', 'zero-extend (`unsigned char` → `int`)'],
            ['`sal`/`shl`, `sar`, `shr`', 'shifts: left, arithmetic right (signed), logical right (unsigned)'],
            ['`nop`, `nop DWORD PTR [rax]`', 'padding so a loop or function starts at an aligned address'],
            ['`.L3:`', 'a local label: the target of a jump inside the function'],
            ['`call foo@PLT`', 'a call to a function in another file or a shared library'],
            ['`endbr64`', 'a landing pad for Intel CET control-flow protection; ignore it'],
          ],
        },
        {
          type: 'p',
          text: 'And three habits that make reading faster:',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Find the arguments and the result.** Know which registers hold which parameters, and track what ends up in `eax`/`rax`/`xmm0` before `ret`.',
            '**Find the loops.** A backwards jump (`jne .L3` where `.L3` is above) is a loop. In a profile, that is where the time goes.',
            '**Find the memory operands.** Anything in brackets is a load or store, and those, not the arithmetic, usually decide speed.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'fill',
      prompt: 'Complete GCC\'s `-O2` output for `long scaled(const long* p, long i) { return p[i] * 3; }`. The pointer arrives in `rdi`, the index in `rsi`.',
      template: `_Z6scaledPKll:
    ___     rax, QWORD PTR [rdi+rsi*___]
    ___     rax, [rax+rax*2]
    ret`,
      blanks: [{ answers: ['mov'] }, { answers: ['8'] }, { answers: ['lea'] }],
      wordBank: ['mov', '8', 'lea', '4', 'imul', 'add', 'movzx', '3'],
      explanation:
        'Loading `p[i]` reads 8 bytes (`QWORD PTR`) at `p + i*8`, because `sizeof(long)` is 8 on Linux. Multiplying by 3 is `x + x*2`, which `lea` computes in one instruction without touching memory or the flags. `imul rax, rax, 3` would also be correct, but GCC prefers the cheaper `lea` for small constants like 3, 5 and 9.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'truefalse',
      prompt: '`lea eax, [rdi+rsi*4]` reads 4 bytes from memory at address `rdi + rsi*4`.',
      answer: false,
      explanation:
        '`lea` only **computes** the address and puts the number in `eax`; it never accesses memory. Compare `mov eax, DWORD PTR [rdi+rsi*4]`, which computes the same address and then loads from it. Compilers exploit this constantly to do multiply-and-add arithmetic in one instruction, and `lea` cannot fault even on an invalid address, because it never dereferences it.',
    },
  ],
  takeaways: [
    'Generate assembly with `g++ -O2 -S -masm=intel` (or `objdump -d -M intel`) and read the build you ship, not `-O0`.',
    'x86-64 has 16 general-purpose registers with 32/16/8-bit sub-names; writing a 32-bit register zeroes the upper 32 bits.',
    'On System V, integer arguments arrive in `rdi, rsi, rdx, rcx, r8, r9` and results leave in `rax`/`eax` (or `xmm0` for floating point).',
    'Memory operands take the form `[base + index*scale + disp]`; array indexing and struct fields fold into a single load or store, and `lea` reuses the same arithmetic without touching memory.',
    '`cmp`/`test` set flags; `jcc`, `setcc` and `cmov` read them. Signed comparisons (`l`, `g`) and unsigned ones (`b`, `a`) use different flags.',
    '-O0 gives every variable a stack slot so debuggers can inspect and modify it; -O2 keeps values in registers and can fold away code whose behavior is undefined.',
  ],
  reading: [
    {
      title: 'Compiler Explorer',
      url: 'https://godbolt.org/',
      source: 'other',
      note: 'Paste any function, choose x86-64 gcc with -O2, and hover over instructions for documentation.',
    },
    {
      title: 'Computer Systems: A Programmer\'s Perspective (CS:APP)',
      url: 'https://csapp.cs.cmu.edu/',
      source: 'book',
      note: 'Chapter 3, "Machine-Level Representation of Programs", is the classic deep treatment of x86-64 as compilers use it.',
    },
    {
      title: 'Agner Fog: Optimizing subroutines in assembly language',
      url: 'https://www.agner.org/optimize/',
      source: 'article',
      note: 'Manual 2 explains registers, addressing modes and idioms such as zeroing with xor; manual 4 lists latencies per instruction.',
    },
    {
      title: 'x86 calling conventions (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/X86_calling_conventions',
      source: 'article',
      note: 'A quick reference for which registers carry arguments on each platform, ahead of the next lesson.',
    },
  ],
};
