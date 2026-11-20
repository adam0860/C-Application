import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-simd',
  title: 'SIMD and Vectorization',
  summary: 'One instruction, many lanes: SSE, AVX and NEON registers, SSE2 intrinsics in real C++, masks instead of branches, what stops auto-vectorization, SoA layouts, game math libraries and alignment.',
  minutes: 22,
  objectives: [
    'Explain the SIMD idea and give the register widths and lane counts of SSE, AVX/AVX2, AVX-512 and NEON',
    'Write and read SSE2 intrinsics code: loads, stores, arithmetic, compares, masks and a scalar tail',
    'Replace per-lane branches with compare-and-mask operations',
    'Recognize what blocks auto-vectorization (aliasing, loop-carried dependences, branches, strided access) and read the compiler\'s vectorized output',
    'Choose SIMD-friendly data layouts (SoA, AoSoA), use game math libraries sensibly, and handle alignment and ISA levels safely',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'One instruction, many data',
      blocks: [
        {
          type: 'p',
          text: 'The last lesson ended with a surprise: GCC put four independent accumulators into the four lanes of one register and added them with a single `addps` instruction. That is **[[simd]]**: Single Instruction, Multiple Data. A SIMD register holds several values side by side in **lanes**, and one instruction applies the same operation to every lane at once.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 560 300">
<text x="108" y="54" font-size="13" text-anchor="end" font-weight="700">a</text>
<rect x="120" y="30" width="86" height="36" rx="4" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="120" y="30" width="86" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="163" y="52.5" font-size="13" text-anchor="middle" font-weight="600">1.0</text>
<rect x="212" y="30" width="86" height="36" rx="4" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="212" y="30" width="86" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="255" y="52.5" font-size="13" text-anchor="middle" font-weight="600">2.0</text>
<rect x="304" y="30" width="86" height="36" rx="4" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="304" y="30" width="86" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="347" y="52.5" font-size="13" text-anchor="middle" font-weight="600">3.0</text>
<rect x="396" y="30" width="86" height="36" rx="4" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="396" y="30" width="86" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="439" y="52.5" font-size="13" text-anchor="middle" font-weight="600">4.0</text>
<text x="108" y="104" font-size="13" text-anchor="end" font-weight="700">b</text>
<rect x="120" y="80" width="86" height="36" rx="4" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="120" y="80" width="86" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="163" y="102.5" font-size="13" text-anchor="middle" font-weight="600">10</text>
<rect x="212" y="80" width="86" height="36" rx="4" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="212" y="80" width="86" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="255" y="102.5" font-size="13" text-anchor="middle" font-weight="600">20</text>
<rect x="304" y="80" width="86" height="36" rx="4" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="304" y="80" width="86" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="347" y="102.5" font-size="13" text-anchor="middle" font-weight="600">30</text>
<rect x="396" y="80" width="86" height="36" rx="4" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="396" y="80" width="86" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="439" y="102.5" font-size="13" text-anchor="middle" font-weight="600">40</text>
<text x="108" y="184" font-size="13" text-anchor="end" font-weight="700">a + b</text>
<rect x="120" y="160" width="86" height="36" rx="4" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="120" y="160" width="86" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="163" y="182.6" font-size="13" text-anchor="middle" font-weight="600">11</text>
<rect x="212" y="160" width="86" height="36" rx="4" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="212" y="160" width="86" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="255" y="182.6" font-size="13" text-anchor="middle" font-weight="600">22</text>
<rect x="304" y="160" width="86" height="36" rx="4" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="304" y="160" width="86" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="347" y="182.6" font-size="13" text-anchor="middle" font-weight="600">33</text>
<rect x="396" y="160" width="86" height="36" rx="4" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="396" y="160" width="86" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="439" y="182.6" font-size="13" text-anchor="middle" font-weight="600">44</text>
<polyline points="163,118 163,153.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M163,158 L160.3,152 L165.7,152 Z" fill="currentColor" stroke="none"/>
<text x="167" y="143" font-size="14" text-anchor="start" font-weight="700">+</text>
<polyline points="255,118 255,153.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M255,158 L252.3,152 L257.7,152 Z" fill="currentColor" stroke="none"/>
<text x="259" y="143" font-size="14" text-anchor="start" font-weight="700">+</text>
<polyline points="347,118 347,153.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M347,158 L344.3,152 L349.7,152 Z" fill="currentColor" stroke="none"/>
<text x="351" y="143" font-size="14" text-anchor="start" font-weight="700">+</text>
<polyline points="439,118 439,153.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M439,158 L436.3,152 L441.7,152 Z" fill="currentColor" stroke="none"/>
<text x="443" y="143" font-size="14" text-anchor="start" font-weight="700">+</text>
<text x="301" y="222" font-size="11" text-anchor="middle" font-style="italic">one addps instruction: 4 independent lanes, no carries between them</text>
<text x="108" y="18" font-size="10" text-anchor="middle"></text>
<text x="163" y="22" font-size="9" text-anchor="middle">lane 0</text>
<text x="255" y="22" font-size="9" text-anchor="middle">lane 1</text>
<text x="347" y="22" font-size="9" text-anchor="middle">lane 2</text>
<text x="439" y="22" font-size="9" text-anchor="middle">lane 3</text>
<text x="108" y="252" font-size="10" text-anchor="end" font-weight="600">SSE / NEON</text>
<rect x="120" y="240" width="75" height="14" rx="2" class="f-blue" fill-opacity="0.25" stroke="none"/>
<rect x="120" y="240" width="18.8" height="14" fill="none" class="s-blue" stroke-width="1"/>
<rect x="138.8" y="240" width="18.8" height="14" fill="none" class="s-blue" stroke-width="1"/>
<rect x="157.5" y="240" width="18.8" height="14" fill="none" class="s-blue" stroke-width="1"/>
<rect x="176.2" y="240" width="18.8" height="14" fill="none" class="s-blue" stroke-width="1"/>
<text x="201" y="251" font-size="10" text-anchor="start">128 bits = 4 floats</text>
<text x="108" y="271" font-size="10" text-anchor="end" font-weight="600">AVX / AVX2</text>
<rect x="120" y="259" width="150" height="14" rx="2" class="f-purple" fill-opacity="0.25" stroke="none"/>
<rect x="120" y="259" width="18.8" height="14" fill="none" class="s-purple" stroke-width="1"/>
<rect x="138.8" y="259" width="18.8" height="14" fill="none" class="s-purple" stroke-width="1"/>
<rect x="157.5" y="259" width="18.8" height="14" fill="none" class="s-purple" stroke-width="1"/>
<rect x="176.2" y="259" width="18.8" height="14" fill="none" class="s-purple" stroke-width="1"/>
<rect x="195" y="259" width="18.8" height="14" fill="none" class="s-purple" stroke-width="1"/>
<rect x="213.8" y="259" width="18.8" height="14" fill="none" class="s-purple" stroke-width="1"/>
<rect x="232.5" y="259" width="18.8" height="14" fill="none" class="s-purple" stroke-width="1"/>
<rect x="251.2" y="259" width="18.8" height="14" fill="none" class="s-purple" stroke-width="1"/>
<text x="276" y="270" font-size="10" text-anchor="start">256 bits = 8 floats</text>
<text x="108" y="290" font-size="10" text-anchor="end" font-weight="600">AVX-512</text>
<rect x="120" y="278" width="300" height="14" rx="2" class="f-orange" fill-opacity="0.25" stroke="none"/>
<rect x="120" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="138.8" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="157.5" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="176.2" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="195" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="213.8" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="232.5" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="251.2" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="270" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="288.8" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="307.5" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="326.2" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="345" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="363.8" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="382.5" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<rect x="401.2" y="278" width="18.8" height="14" fill="none" class="s-orange" stroke-width="1"/>
<text x="426" y="289" font-size="10" text-anchor="start">512 bits = 16 floats</text>
</svg>`,
          alt: 'Four lanes: a = 1, 2, 3, 4 and b = 10, 20, 30, 40 are added lane by lane into 11, 22, 33, 44 by one addps instruction. Below, bars compare register widths: SSE/NEON 128 bits = 4 floats, AVX/AVX2 256 bits = 8 floats, AVX-512 512 bits = 16 floats.',
          caption: 'Lanes are independent: there are no carries or interactions between them. Wider registers simply have more lanes.',
        },
        {
          type: 'table',
          headers: ['Instruction set', 'Register width', 'Lanes of `float`', 'Where you find it'],
          rows: [
            [
              'SSE, SSE2 (x86)',
              '128-bit `xmm`',
              '4',
              'Every x86-64 CPU: SSE2 is part of the x86-64 baseline',
            ],
            [
              'AVX, AVX2 (+ FMA)',
              '256-bit `ymm`',
              '8',
              'Most PC CPUs since about 2013; PS5 and Xbox Series (Zen 2) support AVX2',
            ],
            [
              'AVX-512',
              '512-bit `zmm`, plus mask registers',
              '16',
              'Some Intel server and desktop chips, AMD Zen 4 and later',
            ],
            [
              'NEON (ARMv8 AdvSIMD)',
              '128-bit `v` registers',
              '4',
              'Every 64-bit ARM CPU: phones, Apple silicon, Switch',
            ],
            [
              'SVE / SVE2 (ARM)',
              '128 to 2048 bits, chosen by the hardware',
              'varies',
              'Recent ARM server chips; code is written length-agnostic',
            ],
          ],
        },
        {
          type: 'p',
          text: 'The same 128 bits can be split many ways: 4 × `float`, 2 × `double`, 4 × `int32`, 8 × `int16` or 16 × `int8`. The instruction decides the interpretation: `addps` adds 4 floats, `paddd` adds 4 32-bit integers, `paddb` adds 16 bytes.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why SIMD exists',
          text: 'Every instruction pays a fixed overhead before any arithmetic happens: fetch, decode, rename, schedule, retire. That overhead costs far more energy than the add itself. A SIMD instruction pays it once for 4, 8 or 16 operations, so throughput per watt rises almost in proportion to width. GPUs push the same idea much further, running the same instruction across 32 or 64 lanes (the GPU lesson calls it SIMT).',
        },
      ],
    },
    {
      kind: 'numeric',
      prompt: 'How many 16-bit integers fit side by side in one 256-bit AVX2 register?',
      answer: 16,
      unit: 'lanes',
      label: 'Lanes =',
      explanation: '256 / 16 = 16 lanes. The same register holds 8 floats or ints, 4 doubles, 16 shorts or 32 bytes. Narrower types mean more lanes per instruction, which is one reason games pack data tightly: 16-bit animation keys or 8-bit colour channels process 2 to 4 times as many values per SIMD instruction as 32-bit floats.',
    },
    {
      kind: 'concept',
      title: 'Intrinsics: SSE2 from C++',
      blocks: [
        {
          type: 'p',
          text: 'You rarely write SIMD assembly. Compilers provide **[[simd-intrinsic|intrinsics]]**: functions and types that map almost one-to-one onto SIMD instructions, while the compiler still handles register allocation and scheduling. On x86 they all come from `<immintrin.h>`, and because SSE2 is part of x86-64, everything in this program runs on every 64-bit PC, with no special compiler flags:',
        },
        {
          type: 'code',
          title: 'sse_basics.cpp',
          code: `#include <immintrin.h>   // all x86 SIMD intrinsics (SSE2 is baseline)
#include <cstdio>

// out[i] = a[i] + b[i], four floats per instruction.
void addArrays(float* out, const float* a, const float* b, int n) {
    int i = 0;
    for (; i + 4 <= n; i += 4) {
        __m128 va = _mm_loadu_ps(a + i);    // load 4 floats
        __m128 vb = _mm_loadu_ps(b + i);
        __m128 vs = _mm_add_ps(va, vb);     // 4 adds at once
        _mm_storeu_ps(out + i, vs);         // store 4 floats
    }
    for (; i < n; ++i) out[i] = a[i] + b[i];  // scalar tail
}

// Dot product: multiply lane-wise, then sum the 4 lanes once.
float dot(const float* a, const float* b, int n) {
    __m128 acc = _mm_setzero_ps();
    int i = 0;
    for (; i + 4 <= n; i += 4)
        acc = _mm_add_ps(acc, _mm_mul_ps(_mm_loadu_ps(a + i),
                                         _mm_loadu_ps(b + i)));
    float lanes[4];
    _mm_storeu_ps(lanes, acc);
    float sum = (lanes[0] + lanes[1]) + (lanes[2] + lanes[3]);
    for (; i < n; ++i) sum += a[i] * b[i];
    return sum;
}

int main() {
    float a[10], b[10], c[10];
    for (int i = 0; i < 10; ++i) {
        a[i] = float(i);
        b[i] = 10.0f * float(i);
    }
    addArrays(c, a, b, 10);
    for (float x : c) std::printf("%g ", x);
    std::printf("\\ndot = %g\\n", dot(a, b, 10));
}`,
          runnable: true,
          output: `0 11 22 33 44 55 66 77 88 99
dot = 2850`,
          annotations: [
            {
              lines: 1,
              text: 'One header for every x86 SIMD extension. Using an extension the target CPU lacks is a separate question, covered at the end of this lesson.',
            },
            {
              lines: 7,
              text: 'Process 4 elements per iteration while at least 4 remain.',
            },
            {
              lines: '8-9',
              text: '`_mm_loadu_ps`: load 4 floats into a `__m128`. The `u` means unaligned: the pointer need not be a multiple of 16.',
            },
            {
              lines: 10,
              text: '`_mm_add_ps` compiles to one `addps`: four additions.',
            },
            { lines: 11, text: 'Store the 4 results back to memory.' },
            {
              lines: 13,
              text: 'The **scalar tail**: up to 3 leftover elements when `n` is not a multiple of 4.',
            },
            {
              lines: '18-22',
              text: 'Dot product: one vector accumulator holds 4 partial sums, the multiple-accumulator trick from the last lesson, one lane per accumulator.',
            },
            {
              lines: '23-25',
              text: 'Only at the end are the 4 lanes combined. Combining lanes ("horizontal" operations) is comparatively slow, so do it once, outside the loop.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Intrinsic names follow a pattern: `_mm_<operation>_<type>`. `ps` is **p**acked **s**ingle (4 floats), `pd` packed double, `ss` scalar single (lane 0 only), `epi32` packed 32-bit integers, `si128` the whole register as bits. The types are `__m128` (floats), `__m128d` (doubles) and `__m128i` (integers). AVX versions use `_mm256_` and `__m256`.',
        },
        {
          type: 'algo',
          view: 'array',
          interval: 1100,
          frames: [
            {
              note: '`out` has 10 elements; `a[i] = i` and `b[i] = 10i`. The vector loop handles 4 floats per iteration.',
              array: ['·', '·', '·', '·', '·', '·', '·', '·', '·', '·'],
              lines: [1],
              vars: [
                ['i', '0'],
                ['instructions', '0 vector, 0 scalar'],
              ],
            },
            {
              note: 'Load `a[0..3]` and `b[0..3]` into two 128-bit registers (four lanes each).',
              array: ['·', '·', '·', '·', '·', '·', '·', '·', '·', '·'],
              marks: [
                { index: 0, color: 'blue' },
                { index: 1, color: 'blue' },
                { index: 2, color: 'blue' },
                { index: 3, color: 'blue' },
              ],
              pointers: [
                { index: 0, label: 'i' },
              ],
              lines: [3, 4],
              vars: [
                ['i', '0'],
                ['instructions', '0 vector, 0 scalar'],
              ],
            },
            {
              note: 'One `addps` adds all four lanes; one store writes `out[0..3]`.',
              array: [0, 11, 22, 33, '·', '·', '·', '·', '·', '·'],
              marks: [
                { index: 0, color: 'orange' },
                { index: 1, color: 'orange' },
                { index: 2, color: 'orange' },
                { index: 3, color: 'orange' },
              ],
              pointers: [
                { index: 0, label: 'i' },
              ],
              lines: [5],
              vars: [
                ['i', '0'],
                ['instructions', '1 vector, 0 scalar'],
              ],
            },
            {
              note: 'Load `a[4..7]` and `b[4..7]` into two 128-bit registers (four lanes each).',
              array: [0, 11, 22, 33, '·', '·', '·', '·', '·', '·'],
              marks: [
                { index: 4, color: 'blue' },
                { index: 5, color: 'blue' },
                { index: 6, color: 'blue' },
                { index: 7, color: 'blue' },
              ],
              pointers: [
                { index: 4, label: 'i' },
              ],
              lines: [3, 4],
              vars: [
                ['i', '4'],
                ['instructions', '1 vector, 0 scalar'],
              ],
            },
            {
              note: 'One `addps` adds all four lanes; one store writes `out[4..7]`.',
              array: [0, 11, 22, 33, 44, 55, 66, 77, '·', '·'],
              marks: [
                { index: 4, color: 'orange' },
                { index: 5, color: 'orange' },
                { index: 6, color: 'orange' },
                { index: 7, color: 'orange' },
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
              ],
              pointers: [
                { index: 4, label: 'i' },
              ],
              lines: [5],
              vars: [
                ['i', '4'],
                ['instructions', '2 vector, 0 scalar'],
              ],
            },
            {
              note: '`i + 4 > n`: fewer than 4 elements remain, so the **scalar tail** handles `out[8]` alone.',
              array: [0, 11, 22, 33, 44, 55, 66, 77, 88, '·'],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'green' },
                { index: 6, color: 'green' },
                { index: 7, color: 'green' },
                { index: 8, color: 'purple' },
              ],
              pointers: [
                { index: 8, label: 'i' },
              ],
              lines: [7],
              vars: [
                ['i', '8'],
                ['instructions', '2 vector, 1 scalar'],
              ],
            },
            {
              note: '`i + 4 > n`: fewer than 4 elements remain, so the **scalar tail** handles `out[9]` alone.',
              array: [0, 11, 22, 33, 44, 55, 66, 77, 88, 99],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'green' },
                { index: 6, color: 'green' },
                { index: 7, color: 'green' },
                { index: 8, color: 'green' },
                { index: 9, color: 'purple' },
              ],
              pointers: [
                { index: 9, label: 'i' },
              ],
              lines: [7],
              vars: [
                ['i', '9'],
                ['instructions', '2 vector, 2 scalar'],
              ],
            },
            {
              note: 'Done: 2 vector adds plus 2 scalar adds instead of 10 scalar adds. With 1,000 elements it would be 250 vector adds.',
              array: [0, 11, 22, 33, 44, 55, 66, 77, 88, 99],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'green' },
                { index: 6, color: 'green' },
                { index: 7, color: 'green' },
                { index: 8, color: 'green' },
                { index: 9, color: 'green' },
              ],
              lines: [],
              vars: [
                ['instructions', '2 vector, 2 scalar'],
              ],
            },
          ],
          code: `int i = 0;
for (; i + 4 <= n; i += 4) {
    __m128 va = _mm_loadu_ps(a + i);
    __m128 vb = _mm_loadu_ps(b + i);
    _mm_storeu_ps(out + i, _mm_add_ps(va, vb));
}
for (; i < n; ++i) out[i] = a[i] + b[i];`,
          caption: 'The SSE loop from the program above: blocks of four, then a scalar tail for the leftovers.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Finding intrinsics',
          text: 'Intel\'s online Intrinsics Guide lists every intrinsic with its instruction, latency and throughput. Search it by operation (for example "add" with "SSE2" ticked) and keep it open while writing SIMD code.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the SSE code that doubles four floats at a time.',
      template: `__m128 v = ___(src + i);          // load 4 floats, any alignment
__m128 two = _mm_set1_ps(2.0f);   // {2, 2, 2, 2}
__m128 r = ___(v, two);           // multiply all four lanes
_mm_storeu_ps(dst + i, r);`,
      blanks: [
        {
          answers: ['_mm_loadu_ps'],
        },
        {
          answers: ['_mm_mul_ps'],
        },
      ],
      wordBank: ['_mm_loadu_ps', '_mm_mul_ps', '_mm_load_ss', '_mm_mul_ss', '_mm_add_ps', '_mm_set1_ps'],
      explanation: '`_mm_loadu_ps` loads four floats from any address; `_mm_mul_ps` multiplies all four lanes. The `_ss` versions would work on lane 0 only (scalar single), and `_mm_set1_ps` broadcasts one value into all lanes, which is how the constant 2.0 was built.',
    },
    {
      kind: 'concept',
      title: 'No branches in lanes: compare and mask',
      blocks: [
        {
          type: 'p',
          text: 'Four lanes run one instruction stream, so there is no way for lane 2 to take an `if` that lane 0 skips. Instead SIMD code computes a **mask**: a comparison like `_mm_cmplt_ps(a, b)` sets each lane to all 1 bits where `a < b` is true and all 0 bits where it is false. Masks then select values with bitwise operations. It is the branchless technique from the branch prediction lesson, applied per lane.',
        },
        {
          type: 'p',
          text: 'Here an explosion damages every enemy within a radius. The enemies are stored as a **structure of arrays**: all x coordinates together, all y coordinates together, so four enemies\' x values load with one instruction:',
        },
        {
          type: 'code',
          title: 'simd_masks.cpp',
          code: `#include <immintrin.h>
#include <bit>
#include <cstdio>

// Structure of arrays: all x's together, all y's together...
struct Enemies {
    alignas(16) float x[8]  = {1, 9, -2, 4, 0, -7, 3, 12};
    alignas(16) float y[8]  = {2, 1, -3, 4, 6, 0, -1, 5};
    alignas(16) float hp[8] = {50, 50, 20, 80, 50, 50, 10, 50};
};

// Explosion at (ex, ey): every enemy within radius r loses dmg hp.
int explode(Enemies& e, float ex, float ey, float r, float dmg) {
    const __m128 cx = _mm_set1_ps(ex), cy = _mm_set1_ps(ey);
    const __m128 r2 = _mm_set1_ps(r * r), d = _mm_set1_ps(dmg);
    int hits = 0;
    for (int i = 0; i < 8; i += 4) {
        __m128 dx = _mm_sub_ps(_mm_load_ps(e.x + i), cx);
        __m128 dy = _mm_sub_ps(_mm_load_ps(e.y + i), cy);
        __m128 dist2 = _mm_add_ps(_mm_mul_ps(dx, dx),
                                  _mm_mul_ps(dy, dy));
        __m128 inside = _mm_cmplt_ps(dist2, r2);  // all-1s or all-0s
        __m128 hit = _mm_and_ps(inside, d);       // dmg or 0.0f
        __m128 hp = _mm_sub_ps(_mm_load_ps(e.hp + i), hit);
        hp = _mm_max_ps(hp, _mm_setzero_ps());    // clamp at 0
        _mm_store_ps(e.hp + i, hp);
        hits += std::popcount(unsigned(_mm_movemask_ps(inside)));
    }
    return hits;
}

int main() {
    Enemies e;
    int hits = explode(e, 0.0f, 0.0f, 5.0f, 30.0f);
    std::printf("hit %d enemies\\nhp:", hits);
    for (float h : e.hp) std::printf(" %g", h);
    std::printf("\\n");
}`,
          runnable: true,
          output: `hit 3 enemies
hp: 20 50 0 80 50 50 0 50`,
          annotations: [
            {
              lines: '6-10',
              text: 'Structure of arrays, with `alignas(16)` so the aligned loads `_mm_load_ps` are legal.',
            },
            {
              lines: '14-15',
              text: '`_mm_set1_ps` broadcasts a scalar into all four lanes.',
            },
            {
              lines: '18-21',
              text: 'Squared distance for 4 enemies at once. No square root needed: compare against r² instead.',
            },
            {
              lines: 22,
              text: 'The mask: lanes inside the radius become `0xFFFFFFFF`, the others 0.',
            },
            {
              lines: 23,
              text: 'AND the mask with the damage: 30.0f where inside, exactly 0.0f elsewhere (all-zero bits are +0.0f).',
            },
            {
              lines: 24,
              text: 'Subtract from every lane. Lanes outside the radius subtract 0: no branch needed.',
            },
            {
              lines: 25,
              text: '`_mm_max_ps` clamps at zero, the SIMD version of `std::max`.',
            },
            {
              lines: 27,
              text: '`_mm_movemask_ps` packs the 4 lane sign bits into an `int`; `std::popcount` counts the hits.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Enemies at (1, 2), (−2, −3) and (3, −1) are within 5 units of the blast and drop by 30 hp (two of them clamp at 0); the other five are untouched. All eight were processed in 2 loop iterations with no data-dependent branch.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'When masks waste work',
          text: 'Masking does the work for every lane and throws away the unwanted results. When most lanes are inactive (say 1 enemy in 100 is in range), it wastes most of its work, and a branch, or better, a separate list of candidates from a spatial query, may win. SIMD pays off for dense, uniform work.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'An audio mixer stores a 1-float header (the gain) at the start of each buffer, followed by the samples. `buffer` comes from `new float[n + 1]`. This SIMD loop crashes on the first iteration. Tap the line with the bug.',
      code: `void applyGain(float* buffer, int n) {
    __m128 gain = _mm_set1_ps(buffer[0]);
    float* samples = buffer + 1;
    for (int i = 0; i + 4 <= n; i += 4) {
        __m128 s = _mm_load_ps(samples + i);
        _mm_storeu_ps(samples + i, _mm_mul_ps(s, gain));
    }
}`,
      bugLines: [5],
      explanation: '`_mm_load_ps` (and `_mm_store_ps`) require a **16-byte-aligned** address; on misaligned addresses the `movaps` instruction raises a general-protection fault and the program crashes. `buffer` is 16-byte aligned (as `new` typically returns on x86-64), so `buffer + 1` is 4 bytes past an aligned boundary. Fix: use `_mm_loadu_ps`, which accepts any address and on modern CPUs costs about the same unless the access crosses a cache-line boundary, or pad the header to 4 floats so the samples start aligned.',
    },
    {
      kind: 'concept',
      title: 'Auto-vectorization: letting the compiler do it',
      blocks: [
        {
          type: 'p',
          text: 'Often you do not need intrinsics at all. Optimizing compilers **[[auto-vectorization|auto-vectorize]]** simple loops: they unroll by the vector width and use SIMD instructions. With fixed-size global arrays, GCC 13 does it even at `-O2`:',
        },
        {
          type: 'code',
          code: `float a[1024], b[1024], c[1024];

void addFixed() {
    for (int i = 0; i < 1024; ++i) c[i] = a[i] + b[i];
}`,
          annotations: [
            {
              lines: 4,
              text: 'Known trip count (1024, a multiple of 4), and three distinct global arrays that cannot overlap.',
            },
          ],
        },
        {
          type: 'code',
          title: 'g++ -O2 (x86-64): vectorized',
          lang: 'text',
          code: `_Z8addFixedv:
    xor     eax, eax
    lea     rsi, c[rip]
    lea     rcx, a[rip]
    lea     rdx, b[rip]
.L2:
    movaps  xmm0, XMMWORD PTR [rcx+rax]
    addps   xmm0, XMMWORD PTR [rdx+rax]
    movaps  XMMWORD PTR [rsi+rax], xmm0
    add     rax, 16
    cmp     rax, 4096
    jne     .L2
    ret`,
          annotations: [
            {
              lines: '7-9',
              text: 'Four floats per iteration: aligned load (`movaps`), `addps` with a memory operand, aligned store. GCC knows its own globals are suitably aligned.',
            },
            {
              lines: '10-11',
              text: 'Advance 16 bytes; stop after 4096 bytes = 1024 floats. Only 256 iterations.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Now write the same loop as a function taking pointers, `void add(float* out, const float* a, const float* b, int n)`. At `-O2` GCC 13 leaves it scalar (its cheap `-O2` cost model avoids loops that need run-time checks); at `-O3` it vectorizes, but look at what it must add:',
        },
        {
          type: 'code',
          title: 'g++ -O3, pointer version (excerpt)',
          lang: 'text',
          code: `_Z3addPfPKfS1_i:
    ...
    lea     rcx, 4[rsi]
    mov     rdx, rdi
    sub     rdx, rcx
    cmp     rdx, 8
    jbe     .L3
    ...
.L5:
    movups  xmm0, XMMWORD PTR [rsi+rdx]
    movups  xmm2, XMMWORD PTR [r8+rdx]
    addps   xmm0, xmm2
    movups  XMMWORD PTR [rdi+rdx], xmm0
    add     rdx, 16
    cmp     rcx, rdx
    jne     .L5
    ...
.L9:
    movss   xmm0, DWORD PTR [rsi+rax]
    addss   xmm0, DWORD PTR [r8+rax]
    movss   DWORD PTR [rdi+rax], xmm0
    ...`,
          annotations: [
            {
              lines: '3-7',
              text: 'A run-time **alias check**: is `out` too close to `a + 1`? If the arrays could overlap, writing `out[i]` might change an `a[i + 1]` that a 4-wide load already read, so GCC jumps to the scalar loop at `.L3`.',
            },
            {
              lines: '9-15',
              text: 'The vector loop, with unaligned `movups` because nothing is known about the pointers\' alignment.',
            },
            {
              lines: '17-20',
              text: 'A scalar loop for overlapping arrays and for leftover elements.',
            },
          ],
        },
        {
          type: 'table',
          headers: ['What blocks vectorization', 'Example', 'Typical fix'],
          rows: [
            [
              'Possible **[[pointer-aliasing|aliasing]]**',
              '`out` might overlap `a`',
              '`__restrict` (a widely supported extension), or local copies',
            ],
            [
              '**Loop-carried dependence**',
              '`a[i] = a[i - 1] * k;`',
              'Restructure the algorithm (prefix sums, independent chains)',
            ],
            [
              '**Floating-point reduction**',
              '`sum += a[i];`',
              'Explicit multiple accumulators, or fast-math if you can accept different results',
            ],
            [
              '**Branches and calls** in the body',
              '`if (alive[i]) update(e[i]);`',
              'Simple `if`s become masks or blends; calls must inline; else restructure data',
            ],
            [
              '**Strided or indirect access**',
              '`enemies[i].x` in an array of structs, `a[idx[i]]`',
              'Structure of arrays; gathers on AVX2 are much slower than contiguous loads',
            ],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Vectorization reports',
          text: 'Ask the compiler what it did: GCC `-fopt-info-vec-missed` (or `-fopt-info-vec-all`), Clang `-Rpass=loop-vectorize -Rpass-missed=loop-vectorize`, MSVC `/Qvec-report:2`. And look at the asm on [Compiler Explorer](https://godbolt.org/): `ps` instructions mean packed (vector), `ss` means scalar.',
        },
      ],
    },
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which of these loops will a compiler typically **fail** to auto-vectorize without your help (default flags, no fast-math)? Select all that apply.',
      options: [
        {
          text: '`for (i...) pos[i] = pos[i - 1] + step;`',
          correct: true,
          why: 'Each iteration needs the value the previous one just computed: a loop-carried dependence. Four lanes cannot be computed at once.',
        },
        {
          text: '`for (i...) total += damage[i];` with `float total`',
          correct: true,
          why: 'A floating-point reduction: vectorizing it would reorder the additions and change the result, which the compiler may not do without fast-math.',
        },
        {
          text: '`for (i...) hp[i] = std::max(hp[i] - dmg, 0.0f);` on a plain array',
          why: 'Independent iterations, contiguous access, and `max` has a SIMD instruction (`maxps`): a textbook vectorizable loop (at `-O3`, or `-O2` when no run-time checks are needed).',
        },
        {
          text: '`for (i...) out[i] = in[i] * scale;` with `out` and `in` as plain `float*` parameters',
          why: 'The compiler can still vectorize this, by adding a run-time overlap check and a scalar fallback as in the listing above, so it is not blocked, just more expensive.',
        },
      ],
      explanation: 'The two true blockers are semantic: a real dependence between iterations, and a floating-point reduction whose result would change. Possible aliasing usually just adds run-time checks (or prevents vectorization at lower optimization levels); `__restrict` removes them. Simple element-wise math with `min`/`max` vectorizes well.',
    },
    {
      kind: 'concept',
      title: 'Data layout for SIMD: AoS versus SoA',
      blocks: [
        {
          type: 'p',
          text: 'The natural object-oriented layout is an **array of structures** (AoS): `std::vector<Enemy>` where each `Enemy` holds its own x, y, z and hp. SIMD wants the opposite, a **[[structure-of-arrays|structure of arrays]]** (SoA): one array per field, so four consecutive x values sit next to each other in memory.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 560 230">
<text x="10" y="40" font-size="13" text-anchor="start" font-weight="800">AoS</text>
<text x="10" y="54" font-size="9" text-anchor="start">Enemy[ ]</text>
<rect x="70" y="28" width="28" height="28" rx="3" class="f-blue" fill-opacity="0.55" stroke="none"/>
<rect x="70" y="28" width="28" height="28" rx="3" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="84" y="46" font-size="10" text-anchor="middle" font-weight="600">x0</text>
<rect x="100" y="28" width="28" height="28" rx="3" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="100" y="28" width="28" height="28" rx="3" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="114" y="46" font-size="10" text-anchor="middle" font-weight="600">y0</text>
<rect x="130" y="28" width="28" height="28" rx="3" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="130" y="28" width="28" height="28" rx="3" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="144" y="46" font-size="10" text-anchor="middle" font-weight="600">z0</text>
<rect x="160" y="28" width="28" height="28" rx="3" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="160" y="28" width="28" height="28" rx="3" fill="none" class="s-orange" stroke-width="1.2"/>
<text x="174" y="46" font-size="10" text-anchor="middle" font-weight="600">hp0</text>
<rect x="190" y="28" width="28" height="28" rx="3" class="f-blue" fill-opacity="0.55" stroke="none"/>
<rect x="190" y="28" width="28" height="28" rx="3" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="204" y="46" font-size="10" text-anchor="middle" font-weight="600">x1</text>
<rect x="220" y="28" width="28" height="28" rx="3" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="220" y="28" width="28" height="28" rx="3" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="234" y="46" font-size="10" text-anchor="middle" font-weight="600">y1</text>
<rect x="250" y="28" width="28" height="28" rx="3" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="250" y="28" width="28" height="28" rx="3" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="264" y="46" font-size="10" text-anchor="middle" font-weight="600">z1</text>
<rect x="280" y="28" width="28" height="28" rx="3" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="280" y="28" width="28" height="28" rx="3" fill="none" class="s-orange" stroke-width="1.2"/>
<text x="294" y="46" font-size="10" text-anchor="middle" font-weight="600">hp1</text>
<rect x="310" y="28" width="28" height="28" rx="3" class="f-blue" fill-opacity="0.55" stroke="none"/>
<rect x="310" y="28" width="28" height="28" rx="3" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="324" y="46" font-size="10" text-anchor="middle" font-weight="600">x2</text>
<rect x="340" y="28" width="28" height="28" rx="3" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="340" y="28" width="28" height="28" rx="3" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="354" y="46" font-size="10" text-anchor="middle" font-weight="600">y2</text>
<rect x="370" y="28" width="28" height="28" rx="3" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="370" y="28" width="28" height="28" rx="3" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="384" y="46" font-size="10" text-anchor="middle" font-weight="600">z2</text>
<rect x="400" y="28" width="28" height="28" rx="3" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="400" y="28" width="28" height="28" rx="3" fill="none" class="s-orange" stroke-width="1.2"/>
<text x="414" y="46" font-size="10" text-anchor="middle" font-weight="600">hp2</text>
<rect x="430" y="28" width="28" height="28" rx="3" class="f-blue" fill-opacity="0.55" stroke="none"/>
<rect x="430" y="28" width="28" height="28" rx="3" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="444" y="46" font-size="10" text-anchor="middle" font-weight="600">x3</text>
<rect x="460" y="28" width="28" height="28" rx="3" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="460" y="28" width="28" height="28" rx="3" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="474" y="46" font-size="10" text-anchor="middle" font-weight="600">y3</text>
<rect x="490" y="28" width="28" height="28" rx="3" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="490" y="28" width="28" height="28" rx="3" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="504" y="46" font-size="10" text-anchor="middle" font-weight="600">z3</text>
<rect x="520" y="28" width="28" height="28" rx="3" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="520" y="28" width="28" height="28" rx="3" fill="none" class="s-orange" stroke-width="1.2"/>
<text x="534" y="46" font-size="10" text-anchor="middle" font-weight="600">hp3</text>
<text x="70" y="76" font-size="10" text-anchor="start" font-style="italic">Loading x0..x3 means picking every 4th float: four loads + shuffles, or a gather.</text>
<text x="10" y="128" font-size="13" text-anchor="start" font-weight="800">SoA</text>
<text x="10" y="142" font-size="9" text-anchor="start">Enemies</text>
<text x="92" y="123" font-size="9" text-anchor="end">x[ ]</text>
<rect x="100" y="108" width="28" height="20" rx="3" class="f-blue" fill-opacity="0.55" stroke="none"/>
<rect x="100" y="108" width="28" height="20" rx="3" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="114" y="122" font-size="9" text-anchor="middle" font-weight="600">x0</text>
<rect x="130" y="108" width="28" height="20" rx="3" class="f-blue" fill-opacity="0.55" stroke="none"/>
<rect x="130" y="108" width="28" height="20" rx="3" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="144" y="122" font-size="9" text-anchor="middle" font-weight="600">x1</text>
<rect x="160" y="108" width="28" height="20" rx="3" class="f-blue" fill-opacity="0.55" stroke="none"/>
<rect x="160" y="108" width="28" height="20" rx="3" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="174" y="122" font-size="9" text-anchor="middle" font-weight="600">x2</text>
<rect x="190" y="108" width="28" height="20" rx="3" class="f-blue" fill-opacity="0.55" stroke="none"/>
<rect x="190" y="108" width="28" height="20" rx="3" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="204" y="122" font-size="9" text-anchor="middle" font-weight="600">x3</text>
<rect x="220" y="108" width="28" height="20" rx="3" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="220" y="108" width="28" height="20" rx="3" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="234" y="122" font-size="9" text-anchor="middle" font-weight="600">x4</text>
<rect x="250" y="108" width="28" height="20" rx="3" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="250" y="108" width="28" height="20" rx="3" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="264" y="122" font-size="9" text-anchor="middle" font-weight="600">x5</text>
<rect x="280" y="108" width="28" height="20" rx="3" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="280" y="108" width="28" height="20" rx="3" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="294" y="122" font-size="9" text-anchor="middle" font-weight="600">x6</text>
<rect x="310" y="108" width="28" height="20" rx="3" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="310" y="108" width="28" height="20" rx="3" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="324" y="122" font-size="9" text-anchor="middle" font-weight="600">x7</text>
<text x="92" y="147" font-size="9" text-anchor="end">y[ ]</text>
<rect x="100" y="132" width="28" height="20" rx="3" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="100" y="132" width="28" height="20" rx="3" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="114" y="146" font-size="9" text-anchor="middle" font-weight="600">y0</text>
<rect x="130" y="132" width="28" height="20" rx="3" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="130" y="132" width="28" height="20" rx="3" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="144" y="146" font-size="9" text-anchor="middle" font-weight="600">y1</text>
<rect x="160" y="132" width="28" height="20" rx="3" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="160" y="132" width="28" height="20" rx="3" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="174" y="146" font-size="9" text-anchor="middle" font-weight="600">y2</text>
<rect x="190" y="132" width="28" height="20" rx="3" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="190" y="132" width="28" height="20" rx="3" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="204" y="146" font-size="9" text-anchor="middle" font-weight="600">y3</text>
<rect x="220" y="132" width="28" height="20" rx="3" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="220" y="132" width="28" height="20" rx="3" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="234" y="146" font-size="9" text-anchor="middle" font-weight="600">y4</text>
<rect x="250" y="132" width="28" height="20" rx="3" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="250" y="132" width="28" height="20" rx="3" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="264" y="146" font-size="9" text-anchor="middle" font-weight="600">y5</text>
<rect x="280" y="132" width="28" height="20" rx="3" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="280" y="132" width="28" height="20" rx="3" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="294" y="146" font-size="9" text-anchor="middle" font-weight="600">y6</text>
<rect x="310" y="132" width="28" height="20" rx="3" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="310" y="132" width="28" height="20" rx="3" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="324" y="146" font-size="9" text-anchor="middle" font-weight="600">y7</text>
<text x="92" y="171" font-size="9" text-anchor="end">z[ ]</text>
<rect x="100" y="156" width="28" height="20" rx="3" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="100" y="156" width="28" height="20" rx="3" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="114" y="170" font-size="9" text-anchor="middle" font-weight="600">z0</text>
<rect x="130" y="156" width="28" height="20" rx="3" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="130" y="156" width="28" height="20" rx="3" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="144" y="170" font-size="9" text-anchor="middle" font-weight="600">z1</text>
<rect x="160" y="156" width="28" height="20" rx="3" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="160" y="156" width="28" height="20" rx="3" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="174" y="170" font-size="9" text-anchor="middle" font-weight="600">z2</text>
<rect x="190" y="156" width="28" height="20" rx="3" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="190" y="156" width="28" height="20" rx="3" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="204" y="170" font-size="9" text-anchor="middle" font-weight="600">z3</text>
<rect x="220" y="156" width="28" height="20" rx="3" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="220" y="156" width="28" height="20" rx="3" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="234" y="170" font-size="9" text-anchor="middle" font-weight="600">z4</text>
<rect x="250" y="156" width="28" height="20" rx="3" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="250" y="156" width="28" height="20" rx="3" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="264" y="170" font-size="9" text-anchor="middle" font-weight="600">z5</text>
<rect x="280" y="156" width="28" height="20" rx="3" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="280" y="156" width="28" height="20" rx="3" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="294" y="170" font-size="9" text-anchor="middle" font-weight="600">z6</text>
<rect x="310" y="156" width="28" height="20" rx="3" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="310" y="156" width="28" height="20" rx="3" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="324" y="170" font-size="9" text-anchor="middle" font-weight="600">z7</text>
<text x="92" y="195" font-size="9" text-anchor="end">hp[ ]</text>
<rect x="100" y="180" width="28" height="20" rx="3" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="100" y="180" width="28" height="20" rx="3" fill="none" class="s-orange" stroke-width="1.2"/>
<text x="114" y="194" font-size="9" text-anchor="middle" font-weight="600">hp0</text>
<rect x="130" y="180" width="28" height="20" rx="3" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="130" y="180" width="28" height="20" rx="3" fill="none" class="s-orange" stroke-width="1.2"/>
<text x="144" y="194" font-size="9" text-anchor="middle" font-weight="600">hp1</text>
<rect x="160" y="180" width="28" height="20" rx="3" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="160" y="180" width="28" height="20" rx="3" fill="none" class="s-orange" stroke-width="1.2"/>
<text x="174" y="194" font-size="9" text-anchor="middle" font-weight="600">hp2</text>
<rect x="190" y="180" width="28" height="20" rx="3" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="190" y="180" width="28" height="20" rx="3" fill="none" class="s-orange" stroke-width="1.2"/>
<text x="204" y="194" font-size="9" text-anchor="middle" font-weight="600">hp3</text>
<rect x="220" y="180" width="28" height="20" rx="3" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="220" y="180" width="28" height="20" rx="3" fill="none" class="s-orange" stroke-width="1.2"/>
<text x="234" y="194" font-size="9" text-anchor="middle" font-weight="600">hp4</text>
<rect x="250" y="180" width="28" height="20" rx="3" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="250" y="180" width="28" height="20" rx="3" fill="none" class="s-orange" stroke-width="1.2"/>
<text x="264" y="194" font-size="9" text-anchor="middle" font-weight="600">hp5</text>
<rect x="280" y="180" width="28" height="20" rx="3" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="280" y="180" width="28" height="20" rx="3" fill="none" class="s-orange" stroke-width="1.2"/>
<text x="294" y="194" font-size="9" text-anchor="middle" font-weight="600">hp6</text>
<rect x="310" y="180" width="28" height="20" rx="3" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="310" y="180" width="28" height="20" rx="3" fill="none" class="s-orange" stroke-width="1.2"/>
<text x="324" y="194" font-size="9" text-anchor="middle" font-weight="600">hp7</text>
<path d="M100,104 L100,100 L218,100 L218,104" fill="none" class="s-blue" stroke-width="1.6"/>
<text x="160" y="96" font-size="10" text-anchor="middle" class="t-blue" font-weight="700">one _mm_load_ps</text>
<text x="354" y="128" font-size="10" text-anchor="start">x0..x3 are adjacent:</text>
<text x="354" y="142" font-size="10" text-anchor="start">one 16-byte load fills</text>
<text x="354" y="156" font-size="10" text-anchor="start">a register, no shuffles.</text>
</svg>`,
          alt: 'AoS: x0 y0 z0 hp0 x1 y1 z1 hp1 ... interleaved, so x0..x3 are every fourth float. SoA: separate rows for x, y, z and hp arrays, so x0..x3 are adjacent and one _mm_load_ps loads them.',
          caption: 'To update four x coordinates, AoS needs four separate loads plus shuffles; SoA needs one load.',
        },
        {
          type: 'compare',
          left: {
            title: 'Array of structures',
            tone: 'neutral',
            code: `struct Enemy {
    float x, y, z, hp;
};
std::vector<Enemy> enemies;

// x of enemy i: enemies[i].x
// stride 16 bytes between x's`,
          },
          right: {
            title: 'Structure of arrays',
            tone: 'good',
            code: `struct Enemies {
    std::vector<float> x, y, z, hp;
};
Enemies enemies;

// x of enemy i: enemies.x[i]
// x's are contiguous: SIMD-ready`,
          },
        },
        {
          type: 'p',
          text: 'SoA also helps the cache: a loop that only touches positions does not drag every enemy\'s hp, AI state and name through the cache (the memory hierarchy unit measures this). A popular compromise is **AoSoA**: small blocks of, say, 8 entities stored SoA inside each block, which keeps SIMD-friendly runs while keeping one entity\'s fields close together.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'ECS and data-oriented design',
          text: 'This is the layout behind [[data-oriented-design|data-oriented]] engines and [[entity-component-system|entity-component systems]]: Unity\'s DOTS, the EnTT library, and Unreal\'s **Mass** framework store each component type in tightly packed arrays (chunks) and run systems over them in bulk. Mike Acton\'s talk "Data-Oriented Design and C++" (CppCon 2014) is the classic argument for designing around the data and the hardware rather than around objects.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A particle update does `p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;` for 100,000 particles stored as `std::vector<Particle>` with 12 float fields each. You want SIMD. What is the best first step?',
      options: [
        {
          text: 'Rewrite the loop body with intrinsics, loading each particle\'s x, y, z into one `__m128`',
          why: 'That puts x, y and z of one particle in three lanes (the fourth wasted) and needs shuffles to gather them from a 48-byte struct. It parallelizes the wrong dimension.',
        },
        {
          text: 'Store the hot fields as separate arrays (`x[]`, `vx[]`...) so the loop processes 4 or 8 particles per instruction',
          correct: true,
          why: 'With SoA every line of the loop is a contiguous, independent array operation: the compiler can often auto-vectorize it, and intrinsics become trivial if not. It also stops the loop from loading the 6 unused fields.',
        },
        {
          text: 'Add `alignas(16)` to `Particle`',
          why: 'Alignment does not change the interleaved layout: x values are still 48 bytes apart.',
        },
        {
          text: 'Compile with `-mavx2` so the vectors are wider',
          why: 'Wider registers do not help if the data is not laid out for them; the loop would still be scalar or shuffle-heavy.',
        },
      ],
      explanation: 'SIMD parallelizes across **many items doing the same thing**, so the data for those items must sit side by side. Packing one 3D vector per register ("horizontal" SIMD) wastes lanes and spends instructions on shuffles; processing 4 or 8 particles per register ("vertical" SIMD on SoA data) uses every lane on every instruction.',
    },
    {
      kind: 'concept',
      title: 'Game math libraries and alignment',
      blocks: [
        {
          type: 'p',
          text: 'Game math libraries wrap SIMD so gameplay code stays readable. **DirectXMath** (used widely on Windows and Xbox) defines `XMVECTOR` as a 128-bit SIMD register: `__m128` on x86 and a NEON register on ARM. It separates **storage types** (`XMFLOAT3`, `XMFLOAT4X4`: plain structs you keep in your data) from the **computation type** (`XMVECTOR`), with explicit `XMLoadFloat3` and `XMStoreFloat3` to move between them. **glm** mirrors GLSL\'s types (`glm::vec3`, `glm::mat4`) and can be configured to use SIMD for some operations. Unreal has its own SIMD layer (`VectorRegister4Float` and functions like `VectorAdd`) under `FVector` and `FMatrix` math.',
        },
        {
          type: 'p',
          text: 'All of these care about **alignment**: an object\'s address being a multiple of its required alignment. Aligned SIMD loads demand addresses that are multiples of 16 (SSE) or 32 (AVX), and `alignas` is how you request that in C++:',
        },
        {
          type: 'code',
          title: 'alignment.cpp',
          code: `#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <vector>

struct Vec3 { float x, y, z; };
struct alignas(16) Vec3A { float x, y, z; };   // padded to 16
struct alignas(16) Vec4 { float x, y, z, w; };

int main() {
    std::printf("Vec3:  size %zu, align %zu\\n", sizeof(Vec3),
                alignof(Vec3));
    std::printf("Vec3A: size %zu, align %zu\\n", sizeof(Vec3A),
                alignof(Vec3A));
    std::printf("Vec4:  size %zu, align %zu\\n", sizeof(Vec4),
                alignof(Vec4));
    std::vector<Vec4> v(100);   // C++17: new respects alignas
    auto addr = reinterpret_cast<std::uintptr_t>(v.data());
    std::printf("vector<Vec4> data 16-byte aligned: %s\\n",
                addr % 16 == 0 ? "yes" : "no");
}`,
          runnable: true,
          output: `Vec3:  size 12, align 4
Vec3A: size 16, align 16
Vec4:  size 16, align 16
vector<Vec4> data 16-byte aligned: yes`,
          annotations: [
            {
              lines: 6,
              text: 'Three floats: 12 bytes, 4-byte alignment. Fine for storage, but a 16-byte load from it would read 4 bytes past the end.',
            },
            {
              lines: 7,
              text: '`alignas(16)` raises the alignment, and `sizeof` grows to 16 because an object\'s size is always a multiple of its alignment (so arrays of it stay aligned).',
            },
            {
              lines: 8,
              text: 'Four floats with 16-byte alignment: one aligned `_mm_load_ps` per vector.',
            },
            {
              lines: 17,
              text: 'Since C++17, `new` (and so `std::vector`) honours over-aligned types like this automatically. Before C++17 you needed `_mm_malloc` or a custom allocator.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'How much does alignment matter?',
          text: 'On modern x86 cores unaligned loads (`movups`, `_mm_loadu_ps`) are about as fast as aligned ones unless they straddle a 64-byte cache line, so many codebases simply use the unaligned forms everywhere. Alignment still matters for avoiding cache-line splits and for the aligned-only instructions, and a `Vec3` padded to 16 bytes costs a third more memory: a real trade-off for large arrays.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Vec3 in a register is not the big win',
          text: 'A vec3-in-a-register library is convenient, but it is "horizontal" SIMD: one lane is wasted, and dot products and cross products need shuffles and horizontal adds. For heavy loops (skinning, particles, culling) studios typically write SoA code that processes 4 or 8 objects per instruction, and keep the vector types for everyday gameplay math.',
        },
      ],
    },
    {
      kind: 'numeric',
      prompt: 'What does `sizeof(Particle)` print on x86-64 for this struct?',
      code: `struct alignas(16) Particle {
    float x, y, z;
    int id;
    float vx, vy, vz;
};`,
      answer: 32,
      unit: 'bytes',
      label: '`sizeof(Particle)` =',
      hint: 'Add up the members, then round up to a multiple of the alignment.',
      explanation: 'Seven 4-byte members take 28 bytes. With `alignas(16)`, the size must be a multiple of 16 so that every element of a `Particle[]` array is 16-byte aligned, so the compiler adds 4 bytes of tail padding: 32. (Without `alignas` it would be 28.) Padding is the hidden memory cost of alignment requirements.',
    },
    {
      kind: 'concept',
      title: 'Going wider safely: AVX2 and runtime dispatch',
      blocks: [
        {
          type: 'p',
          text: 'SSE2 is guaranteed on x86-64; AVX, AVX2 and AVX-512 are not. If a binary executes an AVX2 instruction on a CPU without it, the CPU raises an invalid-opcode exception and the program crashes, often at startup. You have three options:',
        },
        {
          type: 'list',
          items: [
            '**Require it**: compile everything with `-mavx2` (GCC/Clang) or `/arch:AVX2` (MSVC) and list AVX2 in the minimum specs. Several PC games have done this, and players with older CPUs found the game would not launch at all.',
            '**Dispatch at run time**: compile only the hot functions for AVX2 and pick the version once, at startup, after checking the CPU.',
            '**Fixed hardware**: on consoles you know the CPU. PS5 and Xbox Series builds can target Zen 2 directly, which executes 256-bit AVX2 instructions natively.',
          ],
        },
        {
          type: 'code',
          title: 'Runtime dispatch (GCC/Clang)',
          code: `#include <immintrin.h>

__attribute__((target("avx2")))           // GCC/Clang: only this
void addArraysAvx2(float* out, const float* a,  // function uses AVX2
                   const float* b, int n) {
    int i = 0;
    for (; i + 8 <= n; i += 8)
        _mm256_storeu_ps(out + i, _mm256_add_ps(
            _mm256_loadu_ps(a + i), _mm256_loadu_ps(b + i)));
    for (; i < n; ++i) out[i] = a[i] + b[i];
}

void addArrays(float* out, const float* a, const float* b, int n) {
    static const bool hasAvx2 = __builtin_cpu_supports("avx2");
    if (hasAvx2) addArraysAvx2(out, a, b, n);
    else         addArraysSse2(out, a, b, n);  // the SSE2 version
}`,
          annotations: [
            {
              lines: 3,
              text: 'The `target` attribute lets this one function use AVX2 instructions while the rest of the program stays at the baseline.',
            },
            {
              lines: '7-9',
              text: 'Eight floats per instruction with the 256-bit `_mm256_` intrinsics.',
            },
            {
              lines: 14,
              text: '`__builtin_cpu_supports` queries the CPU (via the `cpuid` instruction). The `static` makes the check happen once.',
            },
            {
              lines: 15,
              text: 'Calling the AVX2 version only when the CPU supports it keeps the binary safe on older machines. The branch is perfectly predictable.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Wider is not always faster',
          text: 'AVX-512 has a more complicated history: on some older Intel chips, heavy 512-bit code lowered the core\'s clock frequency, so it was not always a win; and Intel disabled it on many consumer chips. Measure before adopting wider vectors, and remember that memory bandwidth, not arithmetic, often limits SIMD loops.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'A program for x86-64 that uses `_mm_add_ps` must check at run time that the CPU supports SSE before calling it.',
      answer: false,
      explanation: 'SSE and SSE2 are part of the x86-64 baseline: every 64-bit x86 CPU has them, and compilers already use SSE2 for ordinary `float` and `double` math. Run-time checks are needed for extensions beyond the baseline you compile for, such as AVX2 or AVX-512.',
    },
  ],
  takeaways: [
    'SIMD applies one instruction to many lanes: SSE/NEON hold 4 floats, AVX/AVX2 8, AVX-512 16; lanes never interact unless you shuffle.',
    'Intrinsics (`<immintrin.h>`) map to instructions: `_mm_loadu_ps`, `_mm_add_ps`, `_mm_storeu_ps`, plus a scalar tail for leftovers; SSE2 is always available on x86-64.',
    'Per-lane `if`s become masks: compare, then AND/blend/max, exactly like branchless scalar code.',
    'Compilers auto-vectorize simple loops; aliasing, loop-carried dependences, FP reductions, calls and strided access get in the way. Read the vectorization report and the asm.',
    'SIMD wants **structure of arrays**: many items\' same field side by side; ECS frameworks are built on this layout.',
    'Aligned loads need 16/32-byte alignment (`alignas`, C++17 aligned `new`); unaligned loads are cheap on modern CPUs unless they split a cache line.',
    'Anything beyond SSE2 needs a minimum-spec decision or run-time dispatch; consoles have fixed, known CPUs.',
  ],
  reading: [
    {
      title: 'Intel Intrinsics Guide',
      url: 'https://www.intel.com/content/www/us/en/docs/intrinsics-guide/index.html',
      source: 'other',
      note: 'Searchable reference for every x86 intrinsic, with the instruction it compiles to and its performance.',
    },
    {
      title: 'Single instruction, multiple data (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Single_instruction,_multiple_data',
      source: 'article',
      note: 'History of SIMD from vector supercomputers to SSE, AVX, NEON and SVE.',
    },
    {
      title: 'AoS and SoA (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/AoS_and_SoA',
      source: 'article',
      note: 'The layouts side by side, including the AoSoA hybrid.',
    },
    {
      title: 'DirectXMath (GitHub)',
      url: 'https://github.com/microsoft/DirectXMath',
      source: 'other',
      note: 'Read how XMVECTOR maps to SSE and NEON, and the separation of storage and SIMD types.',
    },
    {
      title: 'Game Programming Patterns: Data Locality',
      url: 'https://gameprogrammingpatterns.com/data-locality.html',
      source: 'book',
      note: 'Why arrays of components beat pointer-heavy objects, written for game programmers.',
    },
    {
      title: 'Agner Fog: Optimizing software in C++',
      url: 'https://www.agner.org/optimize/',
      source: 'article',
      note: 'The vectorization chapter covers intrinsics, vector classes, alignment and run-time dispatch.',
    },
  ],
};
