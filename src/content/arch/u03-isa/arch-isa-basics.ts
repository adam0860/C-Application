import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-isa-basics',
  title: 'Instruction Set Architectures',
  summary: 'The contract between your compiler and the silicon: registers, load/store vs register-memory, instruction encodings, RISC vs CISC, and the ISAs inside PCs, consoles and phones.',
  minutes: 18,
  objectives: [
    'Explain what an ISA specifies and how it differs from a microarchitecture',
    'Describe the programmer-visible machine: registers, the program counter and byte-addressed memory',
    'Contrast load/store ISAs (RISC-V, ARM64) with register-memory ISAs (x86-64) using real compiler output',
    'Decode a RISC-V instruction from its 32 bits and explain why x86-64 instructions vary from 1 to 15 bytes',
    'Explain why modern x86-64 CPUs translate instructions into micro-ops, and which ISAs run PCs, consoles and phones today',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The contract between software and silicon',
      blocks: [
        {
          type: 'p',
          text: 'In C++ Fundamentals you saw the [[compiler]] turn your code into [[machine-code]]. But machine code for *what*, exactly? The answer is an **[[isa|instruction set architecture]]** (ISA): the precise list of instructions a family of processors understands, and what each one does to the machine\'s state.',
        },
        {
          type: 'p',
          text: 'An ISA is a **contract**. On one side, the compiler promises to emit only instructions from the list. On the other, every chip that implements the ISA promises to execute them exactly as specified. Neither side needs to know anything else about the other.',
        },
        {
          type: 'table',
          headers: ['The ISA specifies (the contract)', 'The microarchitecture decides (the implementation)'],
          rows: [
            ['Which instructions exist and what they do', 'How many instructions start per cycle'],
            ['How many registers there are and how wide', 'How deep the pipeline is'],
            ['How memory is addressed; byte order', 'Cache sizes and latencies'],
            ['How instructions are encoded as bits', 'How branches are predicted'],
            ['What happens on errors and interrupts', 'Clock speed and power use'],
          ],
        },
        {
          type: 'p',
          text: 'The right-hand column is the [[microarchitecture]]. AMD\'s Zen 2 (inside the PS5 and Xbox Series X) and Intel\'s Golden Cove are wildly different designs, yet both run the same x86-64 binaries, because both implement the same ISA.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why split the contract from the implementation?',
          text: 'Binary compatibility. Software outlives hardware: a game compiled for x86-64 in 2010 still runs on a 2025 CPU that did not exist when it shipped. Hardware designers can reinvent everything below the ISA (pipelines, caches, predictors) every generation without breaking a single program. The price is that the ISA itself is almost impossible to change, so its early decisions stay with us for decades.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Like the C++ standard and your compiler',
          text: 'The ISO C++ standard says what `std::sort` must do; GCC, Clang and MSVC each implement it differently. Your code depends only on the standard. An ISA is the hardware\'s standard, and each microarchitecture is one vendor\'s implementation of it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The programmer\'s model: registers, PC and memory',
      blocks: [
        {
          type: 'p',
          text: 'Every mainstream ISA presents the same basic machine to software:',
        },
        {
          type: 'list',
          items: [
            '**Registers**: a small set of named, fixed-size storage slots inside the CPU. Arithmetic reads and writes [[general-purpose-register|general-purpose registers]].',
            '**The [[program-counter]]** (PC; `rip` on x86-64): the address of the next instruction. Execution is "fetch the instruction at PC, do it, move PC on", forever.',
            '**Memory**: one huge array of bytes, indexed by address. Your code and your data both live there; the CPU fetches instructions from it just like data.',
          ],
        },
        {
          type: 'table',
          headers: ['ISA', 'Integer registers', 'Width', 'Notable'],
          rows: [
            ['x86-64', '16 (`rax` … `r15`)', '64-bit', '`rsp` is the stack pointer; 8 were inherited from 16-bit x86'],
            ['ARM64 (AArch64)', '31 (`x0` … `x30`)', '64-bit', 'Register number 31 means the stack pointer or zero, depending on the instruction'],
            ['RISC-V (RV64)', '32 (`x0` … `x31`)', '64-bit', '`x0` is hard-wired to zero'],
          ],
        },
        {
          type: 'p',
          text: 'Why so few? Each instruction must name its registers in a handful of bits: 4 bits pick one of 16, 5 bits pick one of 32. An instruction naming three registers spends 12 or 15 bits on that alone. More registers means longer instructions, a bigger and slower register file, and more state to save on every context switch.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Registers are the fastest memory you have',
          text: 'Reading a register is effectively free inside an instruction. An L1 cache hit typically costs around 4–5 cycles and a trip to DRAM a few hundred (exact figures vary by microarchitecture; the memory hierarchy unit measures them). The compiler\'s *register allocator* works hard to keep your hot variables in registers; when it runs out, it *spills* values to the stack.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: '16 names, hundreds of physical registers',
          text: 'Modern out-of-order cores have far more physical registers than the ISA exposes (typically 150–300) and rename the architectural ones onto them on the fly. That is a microarchitecture trick, covered in the Modern CPUs unit; the ISA still lets software name only 16.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which of these are defined by the **ISA**, so that every x86-64 chip must agree on them? Select all that apply.',
      options: [
        { text: 'There are 16 general-purpose integer registers', correct: true, why: 'Register names and count are encoded in instructions, so they are part of the contract. A program compiled to use `r15` must find `r15` on every x86-64 chip.' },
        { text: 'The L1 data cache holds 32 KiB', why: 'Cache size is a microarchitecture choice. Zen 2 and Golden Cove have different L1 sizes, and programs run correctly on both; only speed changes.' },
        { text: '`imul eax, esi` multiplies and keeps the low 32 bits of the product', correct: true, why: 'What an instruction computes is the heart of the ISA. If chips disagreed, programs would produce different results.' },
        { text: 'A taken branch costs about 15–20 cycles when mispredicted', why: 'Misprediction cost depends on pipeline depth, a microarchitecture detail. The ISA says only what a branch does, never how long it takes.' },
        { text: 'The bytes `c3` mean `ret`', correct: true, why: 'The binary encoding is part of the ISA. A chip that decoded `c3` differently could not run existing binaries.' },
      ],
      explanation:
        'A rule of thumb: if changing it would make an existing binary compute a **different result**, it belongs to the ISA. If it would only make the binary **faster or slower**, it belongs to the microarchitecture. That is exactly why you profile on your target hardware: correctness is portable across a family, performance is not.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'numeric',
      prompt: 'RISC-V has 32 integer registers. An `add rd, rs1, rs2` instruction names three of them (one destination, two sources). How many bits of the 32-bit instruction are spent on register numbers?',
      answer: 15,
      unit: 'bits',
      hint: 'How many bits does it take to pick one of 32 things?',
      explanation:
        'Choosing one of 32 registers takes log₂(32) = 5 bits, and there are three register fields: 3 × 5 = 15 bits, nearly half the instruction. Doubling the register count to 64 would cost 18 bits and leave too little room for the opcode and immediates. This is the real limit on register counts in fixed-width ISAs.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Load/store vs register-memory',
      blocks: [
        {
          type: 'p',
          text: 'The biggest philosophical split between ISAs is **who may touch memory**. Take a one-line function and compile it for three ISAs:',
        },
        {
          type: 'code',
          title: 'heal.cpp',
          code: `void heal(int* hp, long i, int amount) {
    hp[i] += amount;
}`,
          annotations: [
            { lines: 2, text: 'Read an `int` from memory, add to it, write it back. Arguments arrive in registers (the next lessons explain which).' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'x86-64: g++ 13 -O2 -masm=intel',
          code: `_Z4healPili:
    add     DWORD PTR [rdi+rsi*4], edx
    ret`,
          annotations: [
            { lines: 2, text: 'One instruction computes the address `hp + i*4`, loads the `int`, adds `amount` (in `edx`) and stores the result. x86-64 is a **register-memory** ISA: arithmetic may use a memory operand.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'RISC-V (RV64GC): clang 18 -O2',
          code: `_Z4healPili:
    slli    a1, a1, 2
    add     a0, a0, a1
    lw      a1, 0(a0)
    add     a1, a1, a2
    sw      a1, 0(a0)
    ret`,
          annotations: [
            { lines: 2, text: 'Shift `i` left by 2: `i * 4`, the byte offset of `hp[i]`.' },
            { lines: 3, text: 'Address = `hp + i*4`. RISC-V arguments arrive in `a0`, `a1`, `a2`.' },
            { lines: 4, text: '`lw` (load word) is the only way to read memory.' },
            { lines: 5, text: 'Arithmetic works on registers only.' },
            { lines: 6, text: '`sw` (store word) is the only way to write memory.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'ARM64: clang 18 -O2',
          code: `_Z4healPili:
    lsl     x8, x1, #2
    ldr     w9, [x0, x8]
    add     w9, w9, w2
    str     w9, [x0, x8]
    ret`,
          annotations: [
            { lines: '3-5', text: 'Same shape: load, add in registers, store. ARM64 can at least add a register offset inside the load/store address, saving RISC-V\'s separate `add`.' },
          ],
        },
        {
          type: 'p',
          text: 'RISC-V and ARM64 are **[[load-store-architecture|load/store]]** ISAs: only loads and stores touch memory, and everything else works on registers. That costs more instructions, but each one does at most one simple thing.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why would anyone want more instructions?',
          text: 'Because simple, uniform instructions are easy to **pipeline** (the Processor Design unit builds one). If every instruction does at most one memory access and one ALU operation, the hardware can overlap many of them in a regular assembly line. An instruction that loads, adds *and* stores needs three steps of very different kinds, which complicates every stage. Which design wins is the RISC vs CISC story, coming up shortly.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'See it yourself',
          text: 'Paste the function into [Compiler Explorer](https://godbolt.org/) and switch the compiler between "x86-64 gcc", "RISC-V rv64gc clang" and "ARM64 gcc". Compilers for most ISAs are one dropdown away.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'Because x86-64 can write `add DWORD PTR [rdi+rsi*4], edx` as one instruction, it avoids the separate load and store that RISC-V needs, so the memory traffic is lower.',
      answer: false,
      explanation:
        'The *instruction count* is lower, but the work is the same: the CPU still reads the `int` from memory, adds, and writes it back. Inside the core, that one instruction is split into load, add and store operations (micro-ops, coming up shortly). What x86-64 saves is code size and decode bandwidth, not memory accesses.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Instructions are just bits: RISC-V encoding',
      blocks: [
        {
          type: 'p',
          text: 'Machine code is numbers. Each instruction\'s **[[instruction-encoding|encoding]]** packs an opcode (which operation), register numbers and sometimes an *immediate* (a constant baked into the instruction) into a fixed set of bit fields. RISC-V is the cleanest example. Here is a function and its real disassembly:',
        },
        {
          type: 'code',
          title: 'bonus.cpp',
          code: `long addBonus(long hp, long bonus) {
    return hp + bonus + 100;
}`,
        },
        {
          type: 'code',
          lang: 'text',
          title: 'clang 18 --target=riscv64 -march=rv64g -O2, then llvm-objdump -d',
          code: `0000000000000000 <_Z8addBonusll>:
       0: 33 05 b5 00   add     a0, a0, a1
       4: 13 05 45 06   addi    a0, a0, 0x64
       8: 67 80 00 00   ret`,
          annotations: [
            { lines: 2, text: 'The bytes are shown in memory order. RISC-V is little-endian, so the 32-bit word is `0x00B50533`.' },
            { lines: 3, text: '`addi` adds an immediate: `0x64` = 100 is encoded inside the instruction itself.' },
            { lines: 4, text: '`ret` is really `jalr x0, 0(ra)`: jump to the address in the return-address register `ra`.' },
          ],
        },
        {
          type: 'figure',
          svg: '<svg viewBox="0 0 520 230" xmlns="http://www.w3.org/2000/svg"><text x="20" y="18" font-size="13" font-weight="600">R-type: add a0, a0, a1 = 0x00B50533</text><text x="27.5" y="30" text-anchor="middle" font-size="9" class="t-gray">31</text><text x="117.5" y="30" text-anchor="middle" font-size="9" class="t-gray">25</text><text x="132.5" y="30" text-anchor="middle" font-size="9" class="t-gray">24</text><text x="192.5" y="30" text-anchor="middle" font-size="9" class="t-gray">20</text><text x="207.5" y="30" text-anchor="middle" font-size="9" class="t-gray">19</text><text x="267.5" y="30" text-anchor="middle" font-size="9" class="t-gray">15</text><text x="282.5" y="30" text-anchor="middle" font-size="9" class="t-gray">14</text><text x="312.5" y="30" text-anchor="middle" font-size="9" class="t-gray">12</text><text x="327.5" y="30" text-anchor="middle" font-size="9" class="t-gray">11</text><text x="387.5" y="30" text-anchor="middle" font-size="9" class="t-gray">7</text><text x="402.5" y="30" text-anchor="middle" font-size="9" class="t-gray">6</text><text x="492.5" y="30" text-anchor="middle" font-size="9" class="t-gray">0</text><rect x="20" y="34" width="105" height="44" rx="3" fill="currentColor" fill-opacity="0.06" class="s-green" stroke="currentColor" stroke-width="1.5"/><text x="72.5" y="50" text-anchor="middle" font-size="11" class="t-gray">funct7</text><text x="72.5" y="69" text-anchor="middle" font-size="12" font-family="monospace">0000000</text><text x="72.5" y="96" text-anchor="middle" font-size="11" class="t-green">add</text><rect x="125" y="34" width="75" height="44" rx="3" fill="currentColor" fill-opacity="0.06" class="s-blue" stroke="currentColor" stroke-width="1.5"/><text x="162.5" y="50" text-anchor="middle" font-size="11" class="t-gray">rs2</text><text x="162.5" y="69" text-anchor="middle" font-size="12" font-family="monospace">01011</text><text x="162.5" y="96" text-anchor="middle" font-size="11" class="t-blue">x11 = a1</text><rect x="200" y="34" width="75" height="44" rx="3" fill="currentColor" fill-opacity="0.06" class="s-blue" stroke="currentColor" stroke-width="1.5"/><text x="237.5" y="50" text-anchor="middle" font-size="11" class="t-gray">rs1</text><text x="237.5" y="69" text-anchor="middle" font-size="12" font-family="monospace">01010</text><text x="237.5" y="96" text-anchor="middle" font-size="11" class="t-blue">x10 = a0</text><rect x="275" y="34" width="45" height="44" rx="3" fill="currentColor" fill-opacity="0.06" class="s-green" stroke="currentColor" stroke-width="1.5"/><text x="297.5" y="50" text-anchor="middle" font-size="11" class="t-gray">f3</text><text x="297.5" y="69" text-anchor="middle" font-size="12" font-family="monospace">000</text><text x="297.5" y="96" text-anchor="middle" font-size="11" class="t-green">add</text><rect x="320" y="34" width="75" height="44" rx="3" fill="currentColor" fill-opacity="0.06" class="s-blue" stroke="currentColor" stroke-width="1.5"/><text x="357.5" y="50" text-anchor="middle" font-size="11" class="t-gray">rd</text><text x="357.5" y="69" text-anchor="middle" font-size="12" font-family="monospace">01010</text><text x="357.5" y="96" text-anchor="middle" font-size="11" class="t-blue">x10 = a0</text><rect x="395" y="34" width="105" height="44" rx="3" fill="currentColor" fill-opacity="0.06" class="s-orange" stroke="currentColor" stroke-width="1.5"/><text x="447.5" y="50" text-anchor="middle" font-size="11" class="t-gray">opcode</text><text x="447.5" y="69" text-anchor="middle" font-size="12" font-family="monospace">0110011</text><text x="447.5" y="96" text-anchor="middle" font-size="11" class="t-orange">OP</text><text x="20" y="142" font-size="13" font-weight="600">I-type: addi a0, a0, 100 = 0x06450513</text><text x="27.5" y="154" text-anchor="middle" font-size="9" class="t-gray">31</text><text x="192.5" y="154" text-anchor="middle" font-size="9" class="t-gray">20</text><text x="207.5" y="154" text-anchor="middle" font-size="9" class="t-gray">19</text><text x="267.5" y="154" text-anchor="middle" font-size="9" class="t-gray">15</text><text x="282.5" y="154" text-anchor="middle" font-size="9" class="t-gray">14</text><text x="312.5" y="154" text-anchor="middle" font-size="9" class="t-gray">12</text><text x="327.5" y="154" text-anchor="middle" font-size="9" class="t-gray">11</text><text x="387.5" y="154" text-anchor="middle" font-size="9" class="t-gray">7</text><text x="402.5" y="154" text-anchor="middle" font-size="9" class="t-gray">6</text><text x="492.5" y="154" text-anchor="middle" font-size="9" class="t-gray">0</text><rect x="20" y="158" width="180" height="44" rx="3" fill="currentColor" fill-opacity="0.06" class="s-purple" stroke="currentColor" stroke-width="1.5"/><text x="110.0" y="174" text-anchor="middle" font-size="11" class="t-gray">imm[11:0]</text><text x="110.0" y="193" text-anchor="middle" font-size="12" font-family="monospace">000001100100</text><text x="110.0" y="220" text-anchor="middle" font-size="11" class="t-purple">100 (signed 12-bit)</text><rect x="200" y="158" width="75" height="44" rx="3" fill="currentColor" fill-opacity="0.06" class="s-blue" stroke="currentColor" stroke-width="1.5"/><text x="237.5" y="174" text-anchor="middle" font-size="11" class="t-gray">rs1</text><text x="237.5" y="193" text-anchor="middle" font-size="12" font-family="monospace">01010</text><text x="237.5" y="220" text-anchor="middle" font-size="11" class="t-blue">x10 = a0</text><rect x="275" y="158" width="45" height="44" rx="3" fill="currentColor" fill-opacity="0.06" class="s-green" stroke="currentColor" stroke-width="1.5"/><text x="297.5" y="174" text-anchor="middle" font-size="11" class="t-gray">f3</text><text x="297.5" y="193" text-anchor="middle" font-size="12" font-family="monospace">000</text><text x="297.5" y="220" text-anchor="middle" font-size="11" class="t-green">addi</text><rect x="320" y="158" width="75" height="44" rx="3" fill="currentColor" fill-opacity="0.06" class="s-blue" stroke="currentColor" stroke-width="1.5"/><text x="357.5" y="174" text-anchor="middle" font-size="11" class="t-gray">rd</text><text x="357.5" y="193" text-anchor="middle" font-size="12" font-family="monospace">01010</text><text x="357.5" y="220" text-anchor="middle" font-size="11" class="t-blue">x10 = a0</text><rect x="395" y="158" width="105" height="44" rx="3" fill="currentColor" fill-opacity="0.06" class="s-orange" stroke="currentColor" stroke-width="1.5"/><text x="447.5" y="174" text-anchor="middle" font-size="11" class="t-gray">opcode</text><text x="447.5" y="193" text-anchor="middle" font-size="12" font-family="monospace">0010011</text><text x="447.5" y="220" text-anchor="middle" font-size="11" class="t-orange">OP-IMM</text></svg>',
          alt: 'Bit fields of two RISC-V instructions. R-type add a0, a0, a1: funct7 0000000, rs2 01011 (x11), rs1 01010 (x10), funct3 000, rd 01010 (x10), opcode 0110011. I-type addi a0, a0, 100: a 12-bit immediate 000001100100, rs1 x10, funct3 000, rd x10, opcode 0010011.',
          caption: 'The two instructions above, field by field. Register fields (blue) sit at the **same bit positions** in both formats, and the opcode (orange) is always the low 7 bits.',
        },
        {
          type: 'p',
          text: 'Notice the design. The opcode is always in bits 6–0, `rd` always in 11–7, `rs1` always in 19–15. The decoder can start reading registers **before** it even knows which instruction this is, because the fields never move. The I-type format gives up `rs2` and `funct7` to make room for a 12-bit signed immediate, so `addi` can add any constant from -2048 to 2047 in one instruction; bigger constants need a second instruction (`lui`) to build the upper bits.',
        },
        {
          type: 'p',
          text: 'Because the fields never move, decoding is nothing but shifts and masks, the same bit manipulation you would write in C++:',
        },
        {
          type: 'code',
          title: 'rvdecode.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <cstdio>

// Decode the fields of a RISC-V R-type or I-type instruction.
void decode(std::uint32_t w) {
    std::uint32_t opcode = w & 0x7F;           // bits 6..0
    std::uint32_t rd     = (w >> 7) & 0x1F;    // bits 11..7
    std::uint32_t funct3 = (w >> 12) & 0x7;    // bits 14..12
    std::uint32_t rs1    = (w >> 15) & 0x1F;   // bits 19..15
    std::printf("0x%08X  opcode=0x%02X rd=x%u rs1=x%u f3=%u",
                w, opcode, rd, rs1, funct3);
    if (opcode == 0x33) {                      // R-type (OP)
        std::uint32_t rs2 = (w >> 20) & 0x1F;
        std::uint32_t funct7 = w >> 25;
        std::printf(" rs2=x%u f7=0x%02X\\n", rs2, funct7);
    } else if (opcode == 0x13) {               // I-type (OP-IMM)
        auto imm = static_cast<std::int32_t>(w) >> 20;  // sign-extends
        std::printf(" imm=%d\\n", imm);
    }
}

int main() {
    decode(0x00B50533);   // add  a0, a0, a1
    decode(0x06450513);   // addi a0, a0, 100
    decode(0xFFF50513);   // addi a0, a0, -1
}`,
          output: '0x00B50533  opcode=0x33 rd=x10 rs1=x10 f3=0 rs2=x11 f7=0x00\n0x06450513  opcode=0x13 rd=x10 rs1=x10 f3=0 imm=100\n0xFFF50513  opcode=0x13 rd=x10 rs1=x10 f3=0 imm=-1',
          annotations: [
            { lines: '6-9', text: 'Each field is "shift right to bit 0, then mask": `0x1F` keeps 5 bits (a register number), `0x7` keeps 3, `0x7F` keeps 7. A hardware decoder is exactly these wires, with no shifting needed.' },
            { lines: 12, text: '`0x33` is the OP opcode used by `add`, `sub`, `and`, …; `funct3` and `funct7` then pick which one.' },
            { lines: 17, text: 'Casting to signed and shifting right by 20 drags the sign bit down, so `0xFFF` becomes -1. Since C++20, `>>` on a negative signed value is defined as an arithmetic shift.' },
            { lines: 25, text: 'The third word has all 12 immediate bits set: `addi a0, a0, -1`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why fixed 32-bit instructions?',
          text: 'With every instruction exactly 4 bytes long, the CPU knows where the next one starts without decoding the current one. A wide core can grab 16 or 32 bytes and decode 4 or 8 instructions **in parallel**. The cost is density: even `ret` takes 4 bytes. RISC-V\'s optional C extension adds 16-bit forms of common instructions (compiled for the default `rv64gc`, `addBonus` shrinks from 12 bytes to 8), and ARM64 stays strictly 32-bit.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'numeric',
      prompt: 'The RISC-V word `0x3E850513` is an `addi a0, a0, imm`. Its immediate is the top 12 bits (bits 31–20), read as a **signed** two\'s complement number. What is the immediate in decimal?',
      answer: 1000,
      hint: 'Take the top three hex digits. Is the highest bit set?',
      explanation:
        'The top 12 bits are the first three hex digits: `0x3E8`. Its top bit is 0, so the value is positive: 3×256 + 14×16 + 8 = 1000. So this is `addi a0, a0, 1000`. Had the top digit been 8 or more (for example `0xFFF`), the immediate would be negative: `0xFFF` is -1. That sign bit is why `addi` reaches only -2048…2047.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'x86-64: 1 to 15 bytes per instruction',
      blocks: [
        {
          type: 'p',
          text: 'Now the same `addBonus` on x86-64, disassembled with `objdump -d -M intel` (GCC 13, `-O2 -fcf-protection=none`):',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'objdump -d -M intel bonus.o',
          code: `0000000000000000 <_Z8addBonusll>:
   0:   48 8d 44 37 64          lea    rax,[rdi+rsi*1+0x64]
   5:   c3                      ret`,
          annotations: [
            { lines: 2, text: 'Five bytes: `48` is a REX prefix (it says "64-bit operands"), `8d` is the opcode for `lea`, `44` and `37` encode the registers and the addressing form, and `64` is the displacement 100. One instruction does both additions.' },
            { lines: 3, text: 'One byte. `c3` has meant "return" since the 8086 in 1978.' },
          ],
        },
        {
          type: 'table',
          headers: ['ISA (compiler)', 'Instructions', 'Bytes of code'],
          rows: [
            ['x86-64 (g++ 13 -O2)', '2', '6'],
            ['RV64GC, with 16-bit compressed forms (clang 18 -O2)', '3', '8'],
            ['ARM64 (clang 18 -O2)', '3', '12'],
            ['RV64G, 32-bit forms only (clang 18 -O2)', '3', '12'],
          ],
        },
        {
          type: 'p',
          text: 'x86-64 instructions are anywhere from **1 to 15 bytes** long: optional prefixes, then a 1–3 byte opcode, an optional ModRM byte (which registers), an optional SIB byte (scale, index, base), an optional displacement and an optional immediate. Short encodings go to common instructions, which makes x86 code compact and kind to the instruction cache.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'The price of density: decoding',
          text: 'To find where instruction *n*+1 starts, you must first work out the length of instruction *n*. Decoding several x86 instructions per cycle therefore needs elaborate length-predecoding hardware, which costs power and chip area. Intel and AMD cores soften this with a *µop cache* that stores already-decoded instructions, so hot loops skip the decoders entirely.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Layers of history',
          text: 'The 8086 (1978) was 16-bit. The 386 (1985) extended it to 32 bits with an operand-size prefix trick, and AMD\'s x86-64 (2003) added the REX prefix byte for 64-bit operands and registers `r8`–`r15`. Every layer kept the old encodings working, which is why `c3` still means `ret`, and why x86-64 encoding looks like geology.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'A CPU designer wants to decode 8 instructions per cycle. Why is this much easier for ARM64 than for x86-64?',
      options: [
        { text: 'ARM64 instructions are simpler, so each one decodes faster', why: 'Per-instruction complexity matters less than finding the instructions at all. The real obstacle is locating their boundaries.' },
        { text: 'Every ARM64 instruction is 4 bytes, so the 8 instructions are at known offsets and can be decoded in parallel; x86-64 lengths vary, so each start position depends on the previous instruction', correct: true, why: 'Fixed length removes the serial dependency between instructions. On x86-64, instruction boundaries are only known after length decoding, which the hardware must do speculatively.' },
        { text: 'ARM64 has more registers, so there are fewer instructions to decode', why: 'More registers mean fewer spills, but this does not affect how hard it is to decode a given number of instructions per cycle.' },
        { text: 'x86-64 instructions must be decoded one at a time by law of the ISA', why: 'Nothing in the ISA forbids parallel decoding, and modern x86 cores do decode several instructions per cycle. It just takes far more hardware.' },
      ],
      explanation:
        'Decoding in parallel requires knowing where each instruction starts. With a fixed 4-byte length the answer is trivial: at offsets 0, 4, 8, … With variable lengths the starts form a chain of dependencies. x86 cores attack the problem with predecode bits, multiple decoders and µop caches, which is one reason fixed-length ISAs make very wide decoding (Apple\'s M-series cores decode 8 per cycle) comparatively cheap.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'RISC vs CISC, and why x86 runs on micro-ops',
      blocks: [
        {
          type: 'p',
          text: 'In the 1970s, memory was expensive and much code was written by hand in assembly. ISAs such as the VAX and x86 offered powerful, compact instructions: string copies, memory-to-memory arithmetic, complex addressing. This style was later named **[[cisc|CISC]]** (Complex Instruction Set Computer).',
        },
        {
          type: 'p',
          text: 'Around 1980, researchers at IBM, Berkeley and Stanford measured what *compiled* programs actually executed and found that the simple instructions dominated. Their **[[risc|RISC]]** (Reduced Instruction Set Computer) designs kept only simple, fixed-length, load/store instructions with many registers, and spent the saved transistors on pipelining. MIPS, SPARC, PowerPC and ARM followed.',
        },
        {
          type: 'p',
          text: 'x86 survived by changing underneath. Since the mid-1990s (Intel\'s Pentium Pro, AMD\'s K6 and K7), x86 cores **translate** each instruction into one or more **[[micro-op|micro-ops]]** (µops), simple RISC-like operations that the out-of-order core schedules:',
        },
        {
          type: 'table',
          headers: ['x86-64 instruction', 'Typical µops (conceptually)'],
          rows: [
            ['`add eax, edx`', 'one ALU op'],
            ['`mov eax, DWORD PTR [rdi]`', 'one load'],
            ['`add DWORD PTR [rdi+rsi*4], edx`', 'load, add, store-address, store-data (some are *fused* back together in the core)'],
            ['`rep movsb` (copy a whole string)', 'a microcoded sequence, many µops'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'So who won?',
          text: 'Both, in a sense. Inside, every high-performance core is a RISC-style machine executing simple operations out of order. At the ISA level, x86-64 keeps its **binary compatibility** with decades of software, and its dense encoding saves instruction cache. The decoders cost some power and area, a real but modest tax. Today the ISA matters far less for speed than the microarchitecture: caches, branch prediction and how many µops a core can keep in flight.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'µop counts are microarchitecture details',
          text: 'How an instruction splits into µops differs between Intel and AMD and between generations. Agner Fog\'s instruction tables and [uops.info](https://uops.info/) list the counts, latencies and throughputs per microarchitecture.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'Why do modern x86-64 processors decode instructions into micro-ops instead of executing x86 instructions directly?',
      options: [
        { text: 'Because x86 instructions are encrypted and must be decrypted first', why: 'x86 machine code is not encrypted; `c3` is plainly `ret`. Decoding is about splitting complex operations, not secrecy.' },
        { text: 'So the execution core can be a simple, pipelined, out-of-order engine working on uniform operations, while the ISA keeps its complex, backward-compatible instructions', correct: true, why: 'Micro-ops decouple the compatibility problem (front end) from the performance problem (back end). Each µop does one simple thing, so it can be scheduled, reordered and pipelined like a RISC instruction.' },
        { text: 'Because micro-ops use less memory than x86 instructions', why: 'The opposite is usually true: x86 encodings are denser than the internal µop format. That is why the µop cache is small and why x86 code is compact in memory.' },
        { text: 'Because compilers emit micro-ops, and the CPU translates them back', why: 'Compilers emit x86-64 instructions; µops never appear in a binary. Their format is internal to each microarchitecture and not documented as part of the ISA.' },
      ],
      explanation:
        'An instruction like `add [mem], reg` needs a load, an ALU operation and a store, each of which belongs in a different part of the pipeline. Breaking it into µops lets each piece flow independently through the out-of-order machinery. The ISA stays the same for software; only the hardware underneath changed.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'ISAs in the wild: PCs, consoles, phones and spacecraft',
      blocks: [
        {
          type: 'table',
          headers: ['Where', 'ISA', 'Examples'],
          rows: [
            ['Windows/Linux PCs, most servers', 'x86-64', 'AMD Ryzen (Zen), Intel Core'],
            ['PlayStation 5, Xbox Series X|S', 'x86-64', '8-core AMD Zen 2 CPU, paired with an RDNA 2 GPU'],
            ['PlayStation 4, Xbox One', 'x86-64', 'AMD Jaguar cores'],
            ['PS3, Xbox 360 (2005–2006)', 'PowerPC', 'Cell PPE, Xenon'],
            ['Phones, tablets, Apple Silicon Macs', 'ARM64', 'Apple A/M series, Qualcomm Snapdragon'],
            ['Nintendo Switch and Switch 2', 'ARM64', 'Nvidia Tegra-family chips with ARM Cortex cores'],
            ['Microcontrollers, embedded, new designs', 'ARM (Cortex-M), RISC-V', 'RISC-V is open and royalty-free, and spreading fast'],
            ['Spacecraft, radiation-hardened', 'PowerPC, SPARC', 'BAE RAD750 (Mars rovers Curiosity and Perseverance); LEON (SPARC) in ESA missions'],
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Radiation-hardened processors',
          text: 'In space (and in some military systems), a high-energy particle can flip a bit in a register or memory cell. Rad-hard chips use special processes and circuits, error-correcting memory and sometimes redundant logic, and they lag consumer chips by many years in speed. Their designers choose mature, well-understood ISAs: reliability beats raw performance when nobody can press the reset button.',
        },
        {
          type: 'p',
          text: 'What does the ISA mean for the C++ you write? Usually nothing: the same source compiles for all of them, which was the point of C and C++ from the start. But a few ISA properties leak through, and you will meet each one in this course:',
        },
        {
          type: 'list',
          items: [
            '**Memory ordering.** x86-64 keeps loads and stores in a strong, almost sequential order; ARM64 reorders much more freely. Code with a [[data-race]] that "works" on PC can break on a phone or a Switch. The Multicore unit covers this.',
            '**SIMD.** Vector instructions differ: SSE/AVX on x86-64, NEON/SVE on ARM. Math libraries such as DirectXMath and glm hide the difference behind one API.',
            '**Alignment and byte order.** All the ISAs above run little-endian today, and x86-64 tolerates misaligned loads, but code that relies on that is still undefined behavior in C++.',
            '**Type sizes.** `long` is 8 bytes on Linux and macOS but 4 bytes on 64-bit Windows. That is an [[abi|ABI]] choice rather than an ISA one; the calling conventions lesson shows where it bites.',
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why consoles moved to x86-64',
          text: 'The PS3\'s Cell was powerful but notoriously hard to program: its SPU coprocessors had their own ISA and 256 KiB of local memory each, and data had to be moved in by hand. The PS4/Xbox One generation switched to commodity x86-64 cores, so studios could use the same compilers, profilers and engine code as on PC. That shared toolchain is a big reason cross-platform engines such as Unreal and Frostbite target the current consoles so efficiently.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'order',
      prompt: 'Put the steps of executing one RISC-V `add a0, a0, a1` in the order the hardware must perform them.',
      linesAreCode: false,
      lines: [
        'Fetch the 4 bytes at the address in the program counter',
        'Decode the opcode and the register fields',
        'Read `a0` and `a1` from the register file',
        'Add the two values in the ALU',
        'Write the sum into `a0`',
      ],
      distractors: ['Load `a0` and `a1` from memory', 'Look up the instruction\'s name in a symbol table'],
      explanation:
        'Each step needs the result of the previous one: you cannot decode bits you have not fetched, cannot read registers before you know which, and cannot write a sum you have not computed. Registers are inside the CPU, so no memory access happens for operands; that is what makes register arithmetic fast. Symbol names exist only in object files for the linker and debugger; the CPU never sees them. The Processor Design unit turns these five steps into the stages of a pipeline.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'fill',
      prompt: 'Complete the summary.',
      templateIsCode: false,
      template: 'RISC-V and ARM64 are ___ ISAs: only loads and stores touch memory. x86-64 is a register-memory ISA whose instructions are 1 to ___ bytes long, and modern x86-64 cores split them into ___ before executing them. The ___ (pipeline, caches, predictors) can change every generation without breaking binaries.',
      blanks: [
        { answers: ['load/store', 'load-store'] },
        { answers: ['15'] },
        { answers: ['micro-ops', 'µops', 'uops'] },
        { answers: ['microarchitecture'] },
      ],
      wordBank: ['load/store', '15', 'micro-ops', 'microarchitecture', '8', 'register-memory', 'opcodes', 'ISA'],
      explanation:
        'The load/store discipline keeps RISC instructions simple and pipelinable. x86-64\'s variable 1–15 byte encoding is dense but hard to decode, so cores translate it into micro-ops for a RISC-like execution engine. And because all of that sits below the ISA contract, each new microarchitecture can redesign it freely while every existing program keeps working.',
    },
  ],
  takeaways: [
    'An ISA is the hardware/software contract: instructions, registers, addressing and encoding. A microarchitecture is one implementation of it; binaries depend only on the ISA.',
    'Registers are few (16 on x86-64, 31 on ARM64, 32 on RISC-V) because instructions must encode their numbers in a handful of bits.',
    'Load/store ISAs (RISC-V, ARM64) touch memory only with loads and stores; x86-64 lets arithmetic use memory operands, but the work inside the core is the same.',
    'RISC-V uses fixed 32-bit formats with fields in fixed positions; x86-64 instructions are 1–15 bytes, dense but harder to decode in parallel.',
    'Modern x86-64 cores translate instructions into RISC-like micro-ops, so the RISC/CISC distinction now lives mostly at the ISA surface.',
    'PCs and current consoles run x86-64 (PS5 and Xbox Series: AMD Zen 2); phones, Apple Silicon and the Switch run ARM64; RISC-V is growing in embedded chips.',
  ],
  reading: [
    {
      title: 'Computer Systems: A Programmer\'s Perspective (CS:APP)',
      url: 'https://csapp.cs.cmu.edu/',
      source: 'book',
      note: 'Chapter 3 introduces x86-64 machine-level programming from exactly this C/C++ programmer\'s angle.',
    },
    {
      title: 'Instruction set architecture (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Instruction_set_architecture',
      source: 'article',
      note: 'A survey of ISA classifications, encodings and history.',
    },
    {
      title: 'Reduced instruction set computer (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Reduced_instruction_set_computer',
      source: 'article',
      note: 'The history of the RISC movement and the arguments on both sides.',
    },
    {
      title: 'Agner Fog: Software optimization resources',
      url: 'https://www.agner.org/optimize/',
      source: 'article',
      note: 'The instruction tables list µop counts and latencies per microarchitecture; the microarchitecture guide explains the decoders and µop caches.',
    },
    {
      title: 'Compiler Explorer',
      url: 'https://godbolt.org/',
      source: 'other',
      note: 'Compile the same function for x86-64, ARM64 and RISC-V side by side.',
    },
  ],
};
