import type { CheatSheet } from '../types';

/*
 * Quick-reference sheets for the Computer Architecture course. Figures marked
 * "typical" vary by microarchitecture; code and formulas are exact.
 */
export const archCheatSheets: CheatSheet[] = [
  // ------------------------------------------------------------ numbers
  {
    id: 'arch-number-representation',
    title: 'Number Representation',
    course: 'arch',
    icon: '🔢',
    description: 'Binary and hex, unsigned and two\'s complement integers, endianness, and the IEEE 754 float and double formats.',
    sections: [
      {
        title: 'Bases',
        items: [
          { label: 'Hex digit = 4 bits', code: `0xA5 == 0b1010'0101 == 165`, text: 'Convert hex to binary one digit at a time: A = 1010, 5 = 0101.' },
          { label: 'Powers of two', code: `2^8  = 256            2^10 = 1,024 (KiB)
2^16 = 65,536         2^20 = 1,048,576 (MiB)
2^24 = 16,777,216     2^32 = 4,294,967,296`, lang: 'text' },
          { label: 'C++ literals', code: `int a = 0xFF;        // hex: 255
int b = 0b1010;      // binary (C++14): 10
int c = 017;         // octal! 15
long d = 1'000'000;  // digit separators (C++14)` },
          { label: 'Printing bits', code: `std::printf("%08x\\n", v);          // 0000beef
std::cout << std::bitset<8>(5);      // 00000101
std::format("{:#010b}", 5);          // "0b00000101"` },
        ],
      },
      {
        title: 'Integers',
        items: [
          { label: 'Unsigned n-bit range', text: '0 to 2ⁿ − 1. Arithmetic wraps modulo 2ⁿ, which is well defined.' },
          { label: 'Two\'s complement n-bit range', text: '−2ⁿ⁻¹ to 2ⁿ⁻¹ − 1. `int8_t`: −128 to 127; `int32_t`: −2,147,483,648 to 2,147,483,647. The top bit has weight −2ⁿ⁻¹.' },
          { label: 'Negate', code: `-x == ~x + 1      // invert all bits, add 1
// 0xF6 as int8_t: -128 + 118 = -10` },
          { label: 'Signed overflow', text: 'Undefined behavior for `+ - *` on signed types, even though the hardware wraps. Converting an out-of-range value *to* a signed type is modular since C++20.' },
          { label: 'Sign vs zero extension', code: `int32_t a = int8_t(-1);   // 0xFFFFFFFF (sign-extended)
uint32_t b = uint8_t(0xFF); // 0x000000FF (zero-extended)` },
          { label: 'Right shift', text: 'Unsigned `>>` shifts in zeros. Signed `>>` is arithmetic (copies the sign bit) and is defined since C++20: `-7 >> 1 == -4` (rounds toward −∞).' },
        ],
      },
      {
        title: 'Endianness',
        items: [
          { label: 'Little-endian', code: `uint32_t v = 0x12345678;
// bytes in memory, low address first:
// 78 56 34 12   (x86-64, ARM as used in practice)`, text: 'The least significant byte is stored at the lowest address.' },
          { label: 'Detect and swap', code: `#include <bit>
if constexpr (std::endian::native == std::endian::little) { }
auto be = std::byteswap(v);   // C++23` },
        ],
      },
      {
        title: 'IEEE 754 floating point',
        items: [
          { label: 'float (binary32)', text: '1 sign bit, 8 exponent bits (bias 127), 23 fraction bits. About 7 significant decimal digits; max ≈ 3.4 × 10³⁸; epsilon = 2⁻²³ ≈ 1.19 × 10⁻⁷.' },
          { label: 'double (binary64)', text: '1 sign bit, 11 exponent bits (bias 1023), 52 fraction bits. About 16 significant digits; epsilon = 2⁻⁵² ≈ 2.22 × 10⁻¹⁶.' },
          { label: 'Value of a normal number', text: '(−1)ˢ × 1.fraction × 2^(exponent − bias). The leading 1 is implicit, which gives one extra bit of precision.' },
          { label: 'Special exponents', text: 'Exponent all ones: fraction 0 means ±∞, otherwise NaN. Exponent all zeros: ±0 and subnormals, 0.fraction × 2^(1 − bias).' },
          { label: 'Bit patterns', code: `1.0f  = 0x3F800000    0.5f  = 0x3F000000
-2.0f = 0xC0000000    0.1f  = 0x3DCCCCCD (rounded)`, lang: 'text' },
          { label: 'Inspect the bits', code: `#include <bit>
auto bits = std::bit_cast<std::uint32_t>(1.0f);
// 0x3F800000: sign 0, exponent 127, fraction 0` },
          { label: 'Exact integers', text: 'A `float` represents every integer up to 2²⁴ = 16,777,216 exactly; `16777216.0f + 1.0f == 16777216.0f`. A `double` is exact up to 2⁵³.' },
          { label: 'Comparing', code: `bool near(float a, float b, float rel = 1e-5f) {
    return std::fabs(a - b) <=
           rel * std::max(std::fabs(a), std::fabs(b));
}   // and remember: NaN != NaN` },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ bits
  {
    id: 'arch-bit-tricks',
    title: 'Bit Tricks and <bit>',
    course: 'arch',
    icon: '🧮',
    description: 'Setting, clearing and testing bits, power-of-two tricks, branchless selects, and the C++20 <bit> header.',
    sections: [
      {
        title: 'Single bits (use unsigned types)',
        items: [
          { label: 'Set, clear, toggle, test', code: `x |=  (1u << n);        // set bit n
x &= ~(1u << n);        // clear bit n
x ^=  (1u << n);        // toggle bit n
bool on = (x >> n) & 1u;  // test bit n` },
          { label: 'Masks and fields', code: `uint32_t rgba = (uint32_t(r) << 24) | (g << 16) | (b << 8) | a;
uint8_t g2 = (rgba >> 16) & 0xFF;   // extract a field` },
          { label: 'Shift limits', text: 'Shifting by a negative amount or by ≥ the bit width is undefined behavior: `1u << 32` on a 32-bit `unsigned` is UB, not 0.' },
        ],
      },
      {
        title: 'Classic tricks',
        items: [
          { label: 'Lowest set bit', code: `x & (0u - x)     // 0b1011'0100 -> 0b100` },
          { label: 'Clear lowest set bit', code: `x & (x - 1)      // 0b1011'0100 -> 0b1011'0000` },
          { label: 'Power of two?', code: `x != 0 && (x & (x - 1)) == 0   // or std::has_single_bit(x)` },
          { label: 'Modulo a power of two', code: `x % 16 == (x & 15)   // unsigned x only` },
          { label: 'Round up to a multiple of A (A a power of two)', code: `(x + A - 1) & ~(A - 1)    // 37 -> 48 for A = 16` },
          { label: 'Branchless select', code: `uint32_t m = 0u - uint32_t(cond);   // all 1s or 0s
uint32_t r = (a & m) | (b & ~m);    // cond ? a : b`, text: 'Compilers usually turn a plain `cond ? a : b` into `cmov` or a mask on their own; check the assembly before hand-writing this.' },
        ],
      },
      {
        title: '<bit> (C++20, unsigned types only)',
        items: [
          { label: 'Counting', code: `std::popcount(0b1011u)      // 3 set bits
std::countr_zero(8u)        // 3 trailing zeros
std::countl_zero(uint32_t{1}) // 31 leading zeros
std::bit_width(5u)          // 3 bits needed` },
          { label: 'Powers of two', code: `std::has_single_bit(64u)    // true
std::bit_ceil(5u)           // 8
std::bit_floor(5u)          // 4` },
          { label: 'Rotate', code: `std::rotl(uint8_t{0b1000'0001}, 1)  // 0b0000'0011
std::rotr(x, 3)` },
          { label: 'Reinterpret bits safely', code: `float f = 1.0f;
auto u = std::bit_cast<std::uint32_t>(f);   // no UB`, text: 'Replaces `reinterpret_cast` and union type-punning, which break strict aliasing. Source and destination must have the same size and be trivially copyable.' },
          { label: 'std::bitset<N>', code: `std::bitset<8> b{0b0101};
b.set(7); b.test(0); b.count(); b.to_string();` },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ x86
  {
    id: 'arch-x86-64',
    title: 'x86-64 Registers and Calling Conventions',
    course: 'arch',
    icon: '📜',
    description: 'General-purpose and vector registers, the System V and Microsoft x64 calling conventions, and reading compiler output.',
    sections: [
      {
        title: 'Registers',
        items: [
          { label: 'General purpose (64-bit)', code: `rax rbx rcx rdx rsi rdi rbp rsp r8 ... r15`, lang: 'text' },
          { label: 'Narrower views', code: `rax -> eax (32) -> ax (16) -> al (8)
r8  -> r8d (32) -> r8w (16) -> r8b (8)`, lang: 'text', text: 'Writing a 32-bit register zeroes the upper 32 bits; writing an 8- or 16-bit register leaves the rest unchanged.' },
          { label: 'Special', text: '`rip` is the instruction pointer (used for `[rip + label]` addressing); `rsp` is the stack pointer; `rflags` holds condition flags such as ZF (zero), SF (sign), CF (carry) and OF (overflow).' },
          { label: 'Vector', text: '`xmm0`–`xmm15`: 128-bit (SSE, also used for scalar `float`/`double`). `ymm`: 256-bit (AVX). `zmm0`–`zmm31`: 512-bit (AVX-512).' },
        ],
      },
      {
        title: 'System V AMD64 ABI (Linux, macOS)',
        items: [
          { label: 'Integer and pointer arguments', code: `rdi, rsi, rdx, rcx, r8, r9, then the stack`, lang: 'text', text: 'Floating-point arguments go in `xmm0`–`xmm7`. A member function gets `this` as its first argument (`rdi`).' },
          { label: 'Return values', text: '`rax` (and `rdx` for a second 64-bit half), `xmm0` for floating point. Larger structs are returned through a hidden pointer passed in `rdi`.' },
          { label: 'Callee-saved', code: `rbx, rbp, r12, r13, r14, r15 (and rsp)`, lang: 'text', text: 'Everything else, including all `xmm` registers, is caller-saved.' },
          { label: 'Stack', text: '`rsp` must be 16-byte aligned at each `call`, so on entry to a function `rsp` is 8 modulo 16. Leaf functions may use the 128-byte *red zone* below `rsp` without adjusting it.' },
        ],
      },
      {
        title: 'Microsoft x64 (Windows, Xbox)',
        items: [
          { label: 'Arguments', code: `rcx, rdx, r8, r9 (or xmm0-xmm3 by position), then the stack`, lang: 'text', text: 'The caller also reserves 32 bytes of *shadow space* on the stack for the four register arguments. `this` arrives in `rcx`.' },
          { label: 'Callee-saved', code: `rbx, rbp, rdi, rsi, r12-r15, xmm6-xmm15`, lang: 'text', text: 'No red zone. Return values in `rax` / `xmm0`.' },
        ],
      },
      {
        title: 'Reading compiler output',
        items: [
          { label: 'Generate Intel-syntax assembly', code: `g++ -O2 -S -masm=intel -fno-asynchronous-unwind-tables main.cpp
objdump -d -M intel ./game`, lang: 'shell', text: 'Or paste the code into [Compiler Explorer](https://godbolt.org/).' },
          { label: 'Intel vs AT&T syntax', code: `mov  rax, QWORD PTR [rdi+8]   ; Intel: dest, src
movq 8(%rdi), %rax            # AT&T: src, dest`, lang: 'text' },
          { label: 'Instructions you will see', code: `mov  lea  add  sub  imul  xor  and  or  shl  sar
cmp  test  jcc (je jne jl jg jb ja...)  cmovcc  setcc
call  ret  push  pop
movss addss mulss  movaps addps mulps  (SSE)`, lang: 'text' },
          { label: 'Idioms', text: '`xor eax, eax` zeroes a register; `lea` computes an address (often used for arithmetic like `a + b*4`); `test x, x` sets flags to compare with zero; `-O2` usually omits the `push rbp; mov rbp, rsp` frame-pointer prologue.' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ pipeline
  {
    id: 'arch-pipeline',
    title: 'Pipelines, Hazards and Branches',
    course: 'arch',
    icon: '🏭',
    description: 'The classic five-stage pipeline, hazards with forwarding and stalls, CPI with stalls, and branch prediction.',
    sections: [
      {
        title: 'The classic 5-stage pipeline',
        items: [
          { label: 'Stages', code: `IF -> ID -> EX -> MEM -> WB`, lang: 'text', text: 'Instruction fetch, decode and register read, execute (ALU), memory access, write back to the register file.' },
          { label: 'Cycles for n instructions', text: 'k + n − 1 cycles on a k-stage pipeline with no stalls: k cycles to fill, then one instruction completes per cycle. Ideal CPI = 1.' },
          { label: 'Speedup', text: 'At most k (the number of stages), limited by unequal stage lengths, pipeline register overhead and stalls.' },
        ],
      },
      {
        title: 'Hazards',
        items: [
          { label: 'Structural', text: 'Two instructions need the same hardware in the same cycle. Fixed by duplicating resources (separate instruction and data caches).' },
          { label: 'Data (RAW)', text: 'An instruction reads a register before an earlier one has written it. *Forwarding* (bypassing) sends the ALU result straight to the next instruction.' },
          { label: 'Load-use', code: `ld  x1, 0(x2)
add x3, x1, x4    # needs x1 one cycle too early: 1 stall`, lang: 'text', text: 'Even with forwarding, a value loaded in MEM cannot reach the next instruction\'s EX in time; the classic pipeline inserts one bubble.' },
          { label: 'WAR and WAW', text: 'Name dependencies, not true ones. Out-of-order cores remove them with register renaming.' },
          { label: 'Control', text: 'The next instruction\'s address is unknown until a branch resolves. Predict it, and flush the wrongly fetched instructions on a misprediction.' },
        ],
      },
      {
        title: 'CPI with stalls',
        items: [
          { label: 'Formula', text: 'CPI = ideal CPI + stall cycles per instruction.' },
          { label: 'Branch example', text: '20% branches × 5% mispredicted × 16-cycle penalty = 0.16 extra cycles per instruction: CPI 1.0 → 1.16.' },
        ],
      },
      {
        title: 'Branch prediction',
        items: [
          { label: '2-bit saturating counter', code: `strong NT <-> weak NT <-> weak T <-> strong T
predict taken in the two T states;
move one step toward each actual outcome`, lang: 'text', text: 'One surprise (a loop exit) does not flip a strong prediction.' },
          { label: 'Misprediction cost', text: 'Typically about 15–20 cycles on current desktop cores: the work fetched after the branch is thrown away.' },
          { label: 'Make branches predictable', text: 'Sort or partition data so outcomes come in long runs; process entities by type instead of mixing them; keep rare cases (errors) out of hot loops.' },
          { label: 'Branchless code', code: `int m = cond ? a : b;          // often cmov
hp -= (d2 < r2) ? dmg : 0.0f;  // cmpltss + andps`, text: 'Pays off only for unpredictable branches. Always confirm in the assembly: "branchless" source can compile to a branch.' },
          { label: 'Hints', code: `if (err) [[unlikely]] { handleError(); }   // C++20`, text: 'Affects code layout, not the hardware predictor.' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ caches
  {
    id: 'arch-caches',
    title: 'Caches and Virtual Memory',
    course: 'arch',
    icon: '🗄️',
    description: 'Address split formulas, AMAT, the three Cs, cache-friendly C++, and pages and TLBs.',
    sections: [
      {
        title: 'Organization',
        items: [
          { label: 'Line size', text: '64 bytes on x86-64 and most ARM cores (some, such as Apple M-series, use 128). Caches always move whole lines.' },
          { label: 'Sets and ways', code: `sets = cache size / (line size × ways)
direct-mapped: 1 way     fully associative: 1 set`, lang: 'text' },
          { label: 'Address split', code: `| tag | index | offset |
offset bits = log2(line size)
index bits  = log2(sets)
tag bits    = address bits - index - offset`, lang: 'text' },
          { label: 'Worked example', text: '32 KiB, 8-way, 64-byte lines: 32,768 / (64 × 8) = 64 sets. Offset = 6 bits, index = 6 bits; with 48-bit addresses the tag is 48 − 12 = 36 bits.' },
          { label: 'Policies', text: 'Usually write-back with write-allocate (a store miss fetches the line); replacement is LRU or a cheap approximation (pseudo-LRU).' },
        ],
      },
      {
        title: 'AMAT and misses',
        items: [
          { label: 'Average memory access time', code: `AMAT = hit time + miss rate × miss penalty
two levels:
AMAT = HT1 + MR1 × (HT2 + MR2 × penalty2)`, lang: 'text' },
          { label: 'Example', text: 'L1 4 cycles, 5% miss; L2 12 cycles, 20% local miss; DRAM 200 cycles: 4 + 0.05 × (12 + 0.2 × 200) = 6.6 cycles.' },
          { label: 'The three Cs', text: '**Compulsory** (first touch), **capacity** (working set too big), **conflict** (too many lines map to one set). Multicore adds **coherence** misses.' },
        ],
      },
      {
        title: 'Cache-friendly C++',
        items: [
          { label: 'Traverse in memory order', code: `for (int r = 0; r < rows; ++r)      // row-major:
    for (int c = 0; c < cols; ++c)  // inner loop walks
        sum += m[r][c];             // consecutive bytes` },
          { label: 'Data layout', text: 'Prefer contiguous containers (`std::vector`) over node-based ones; split hot and cold fields; use structure-of-arrays for loops that touch a few fields of many objects.' },
          { label: 'Avoid false sharing', code: `struct alignas(64) PerThread {
    std::atomic<long> count;
};   // or std::hardware_destructive_interference_size` },
        ],
      },
      {
        title: 'Virtual memory',
        items: [
          { label: 'Page split (4 KiB pages)', code: `offset = VA & 0xFFF       // 12 bits
VPN    = VA >> 12`, text: 'Larger pages: 2 MiB (21 offset bits) and 1 GiB (30) on x86-64.' },
          { label: 'x86-64 page walk', text: '48-bit virtual addresses: four levels of 9 index bits each (512 entries of 8 bytes per 4 KiB table) plus a 12-bit offset. Newer CPUs optionally support 5 levels (57 bits).' },
          { label: 'TLB reach', text: 'entries × page size. 64 entries × 4 KiB = 256 KiB; with 2 MiB pages the same 64 entries cover 128 MiB.' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ memory model
  {
    id: 'arch-memory-orders',
    title: 'Atomics and Memory Orders',
    course: 'arch',
    icon: '🧵',
    description: 'What each std::memory_order guarantees, the message-passing pattern, how atomics compile on x86-64, and false sharing.',
    sections: [
      {
        title: 'Memory orders',
        items: [
          { label: 'relaxed', text: 'Atomicity only: no ordering with other memory operations. Fine for statistics counters.' },
          { label: 'acquire (loads)', text: 'No later read or write in this thread can be moved before the load.' },
          { label: 'release (stores)', text: 'No earlier read or write in this thread can be moved after the store. An acquire load that reads a release store\'s value *synchronizes with* it: everything before the store happens-before everything after the load.' },
          { label: 'acq_rel', text: 'For read-modify-write operations (`fetch_add`, `exchange`, `compare_exchange`): both acquire and release.' },
          { label: 'seq_cst (default)', text: 'Acquire/release plus one global order of all `seq_cst` operations that every thread agrees on. The safest choice, sometimes slower.' },
          { label: 'consume', text: 'Discouraged; compilers implement it as acquire.' },
        ],
      },
      {
        title: 'Patterns',
        items: [
          { label: 'Message passing', code: `// producer thread
data = 42;
ready.store(true, std::memory_order_release);

// consumer thread
while (!ready.load(std::memory_order_acquire)) {}
use(data);   // guaranteed to see 42` },
          { label: 'CAS loop', code: `int old = v.load();
while (!v.compare_exchange_weak(old, old * 2)) {
    // old was reloaded; try again
}` },
          { label: 'Spinlock', code: `std::atomic_flag f;   // starts clear (C++20)
while (f.test_and_set(std::memory_order_acquire)) {}
/* critical section */
f.clear(std::memory_order_release);` },
          { label: 'Lock-free check', code: `static_assert(std::atomic<int>::is_always_lock_free);` },
        ],
      },
      {
        title: 'On the hardware',
        items: [
          { label: 'x86-64 (TSO)', text: 'Loads are not reordered with loads, stores not with stores; only a later load may pass an earlier store (via the store buffer). So acquire loads and release stores are plain `mov`s.' },
          { label: 'x86-64 code (g++ 13 -O2)', code: `load (acquire or seq_cst)  mov eax, [a]
store release              mov [a], edi
store seq_cst              xchg [a], edi
fetch_add                  lock xadd [a], eax
compare_exchange           lock cmpxchg [a], edx
seq_cst fence              lock or [rsp], 0  (or mfence)`, lang: 'text' },
          { label: 'ARM64', text: 'Weaker ordering: acquire and release use `ldar` and `stlr` (or barriers). Code with a missing order may work on x86 and fail on ARM consoles, phones and Apple silicon.' },
        ],
      },
      {
        title: 'Pitfalls',
        items: [
          { label: 'volatile is not atomic', text: '`volatile` is for memory-mapped hardware registers. Sharing a `volatile` variable between threads is still a data race.' },
          { label: 'False sharing', text: 'Two threads writing different variables in the same 64-byte line make the line bounce between cores. Pad or align per-thread data to the line size.' },
          { label: 'Mixed orders', text: 'A release store paired with a relaxed load gives no synchronization. Both sides must take part.' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ performance
  {
    id: 'arch-performance-laws',
    title: 'Performance Laws and Profiling',
    course: 'arch',
    icon: '⏱️',
    description: 'The iron law, Amdahl\'s and Gustafson\'s laws, Little\'s law, the roofline model, counter ratios and profiling commands.',
    sections: [
      {
        title: 'Laws',
        items: [
          { label: 'Iron law', code: `time = instructions × CPI × cycle time
IPC = 1 / CPI      cycle time = 1 / clock rate`, lang: 'text', text: '30 M instructions × CPI 1.5 at 3 GHz = 45 M cycles = 15 ms.' },
          { label: 'Amdahl\'s law', code: `speedup = 1 / ((1 - p) + p / s)
limit (s -> infinity) = 1 / (1 - p)`, lang: 'text', text: 'p = fraction of time improved, s = its speedup. p = 0.9 on 8 cores: 4.71×; never more than 10×.' },
          { label: 'Gustafson\'s law', code: `scaled speedup = (1 - p) + p × N`, lang: 'text', text: 'p measured on the N-core run, with the problem size growing with N.' },
          { label: 'Little\'s law', code: `in flight = latency × throughput`, lang: 'text', text: 'To stream 10 GB/s with 100 ns latency, 10 × 10⁹ × 100 × 10⁻⁹ = 1,000 bytes (about 16 cache lines) must be in flight.' },
          { label: 'Roofline', code: `attainable FLOP/s =
    min(peak FLOP/s, intensity × bandwidth)
intensity = FLOPs per byte moved`, lang: 'text' },
          { label: 'Bandwidth from a bus', code: `GB/s = bus width (bits) × rate per pin (Gb/s) / 8
256 × 14 / 8 = 448 GB/s (PS5 GDDR6)`, lang: 'text' },
        ],
      },
      {
        title: 'Frame budgets',
        items: [
          { label: 'Milliseconds per frame', code: `30 fps: 33.3 ms    60 fps: 16.67 ms
90 fps: 11.1 ms    120 fps: 8.33 ms`, lang: 'text' },
        ],
      },
      {
        title: 'Counters',
        items: [
          { label: 'perf', code: `perf stat -e cycles,instructions,cache-misses,branch-misses ./game
perf record -g ./game && perf report
perf annotate   # hot instructions`, lang: 'shell' },
          { label: 'Ratios', code: `IPC              = instructions / cycles
branch miss rate = branch-misses / branches
MPKI             = misses × 1000 / instructions`, lang: 'text' },
          { label: 'Reading them', text: 'Low IPC with many cache misses: fix data layout. Many branch misses: sort data or go branchless. High IPC, few misses: reduce instructions (algorithm, SIMD).' },
        ],
      },
      {
        title: 'Benchmarking',
        items: [
          { label: 'Coarse timing', code: `auto t0 = std::chrono::steady_clock::now();
work();
auto ms = std::chrono::duration<double, std::milli>(
    std::chrono::steady_clock::now() - t0).count();` },
          { label: 'Checklist', text: 'Optimized build with symbols; results must be observable (or the compiler deletes the work); warm up first; many runs, report median and spread; realistic data and cache state; confirm in the real frame.' },
          { label: 'Profilers', text: 'Sampling (perf, VTune, Superluminal): where time goes on average. Instrumenting (Tracy, PIX timing captures, Unreal Insights): what happened in each frame.' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ latency
  {
    id: 'arch-latency-numbers',
    title: 'Latency and Bandwidth Numbers',
    course: 'arch',
    icon: '⚡',
    description: 'Typical latencies from L1 to disk, common bandwidths, and current console specifications. Real values vary by hardware.',
    sections: [
      {
        title: 'Latency (typical, desktop CPU around 3–5 GHz)',
        items: [
          { label: 'L1 data cache hit', text: '~1 ns (about 4–5 cycles)' },
          { label: 'L2 cache hit', text: '~3–5 ns (about 12–16 cycles)' },
          { label: 'L3 cache hit', text: '~10–20 ns (about 30–70 cycles)' },
          { label: 'Branch misprediction', text: '~15–20 cycles (~5 ns)' },
          { label: 'DRAM access', text: '~60–100 ns (hundreds of cycles)' },
          { label: 'Cache line moved between cores', text: '~20–100 ns, depending on the chip and on how far apart the cores are' },
          { label: 'System call', text: '~0.1–1 µs' },
          { label: 'Thread context switch', text: '~1–5 µs, plus cache warm-up afterwards' },
          { label: 'NVMe SSD random read', text: '~10–100 µs' },
          { label: 'Hard disk seek + rotation', text: '~5–10 ms (7,200 rpm: 4.17 ms average rotational latency alone)' },
        ],
      },
      {
        title: 'If one cycle (0.33 ns) were one second',
        items: [
          { label: 'Scaled', code: `L1 hit             4 s
DRAM access        ~5 minutes
NVMe read (50 us)  ~1.7 days
HDD seek (10 ms)   ~1 year`, lang: 'text' },
        ],
      },
      {
        title: 'Bandwidth (typical)',
        items: [
          { label: 'Memory', code: `DDR5 dual channel   ~60-100 GB/s
PS5 GDDR6           448 GB/s
RTX 4090 GDDR6X     ~1 TB/s`, lang: 'text' },
          { label: 'Links and storage', code: `PCIe 4.0 x16        ~31.5 GB/s per direction
NVMe Gen4 SSD       ~7 GB/s
SATA SSD            ~0.55 GB/s
HDD                 ~0.1-0.25 GB/s`, lang: 'text' },
        ],
      },
      {
        title: 'Consoles (launch specifications)',
        items: [
          { label: 'PlayStation 5', text: '8 Zen 2 cores up to 3.5 GHz; RDNA 2 GPU, 36 CUs up to 2.23 GHz, 10.28 TFLOPS; 16 GB GDDR6 at 448 GB/s; 825 GB SSD, 5.5 GB/s raw, typically 8–9 GB/s with hardware decompression.' },
          { label: 'Xbox Series X', text: '8 Zen 2 cores at 3.8 GHz (3.66 with SMT); RDNA 2 GPU, 52 CUs at 1.825 GHz, 12 TFLOPS; 16 GB GDDR6 (10 GB at 560 GB/s, 6 GB at 336 GB/s); 1 TB SSD, 2.4 GB/s raw, 4.8 GB/s with hardware decompression.' },
          { label: 'GPU terms', text: 'Warp: 32 threads (NVIDIA). Wavefront: 64 (AMD GCN) or 32/64 (AMD RDNA). Peak FP32 FLOPS = lanes × 2 (FMA) × clock.' },
        ],
      },
    ],
  },
];
