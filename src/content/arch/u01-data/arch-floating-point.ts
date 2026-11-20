import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-floating-point',
  title: 'Floating Point and IEEE 754',
  summary: 'Decode float and double bit by bit, see where rounding error comes from, handle NaN, infinities and denormals, and keep lockstep games deterministic, with fixed-point as the alternative.',
  minutes: 22,
  objectives: [
    'Decode and encode IEEE 754 `float` values by hand and with a bit-inspection program',
    'Explain rounding, ULPs and why precision shrinks as magnitude grows, including the large-world problem in games',
    'Compare floating-point values with a justified tolerance instead of `==`',
    'Recognize infinities, NaN, signed zero and subnormals, and the performance cost of subnormals',
    'Explain why floating-point results can differ between builds and machines, how that breaks lockstep multiplayer, and when fixed-point is the better tool',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Scientific notation in binary',
      blocks: [
        {
          type: 'p',
          text: 'Integers spend their bits evenly: a 32-bit `int` steps by exactly 1 from −2 billion to +2 billion. A game needs something different. Particle sizes of 0.001, world coordinates of 100,000 and physics impulses of 10⁹ must all fit in the same type, but nobody needs 0.001 precision at 100,000. **Floating point** is scientific notation in base 2: a fixed number of significant bits, plus an exponent that moves the binary point.',
        },
        {
          type: 'p',
          text: 'The consequence is that representable values are dense near zero and sparse far away. Between each pair of consecutive powers of two there is the same **number** of values, so every time the magnitude doubles, the gap between neighbours doubles too. Here is a toy format with only 2 fraction bits:',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 184" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<line x1="20" y1="92" x2="500" y2="92" stroke-width="1.5"/>
<line x1="20.0" y1="78" x2="20.0" y2="106" class="s-purple" stroke-width="2"/>
<line x1="23.75" y1="78" x2="23.75" y2="106" class="s-purple" stroke-width="2"/>
<line x1="27.5" y1="78" x2="27.5" y2="106" class="s-purple" stroke-width="2"/>
<line x1="31.25" y1="78" x2="31.25" y2="106" class="s-purple" stroke-width="2"/>
<line x1="35.0" y1="78" x2="35.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="38.75" y1="78" x2="38.75" y2="106" class="s-blue" stroke-width="2"/>
<line x1="42.5" y1="78" x2="42.5" y2="106" class="s-blue" stroke-width="2"/>
<line x1="46.25" y1="78" x2="46.25" y2="106" class="s-blue" stroke-width="2"/>
<line x1="50.0" y1="78" x2="50.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="57.5" y1="78" x2="57.5" y2="106" class="s-blue" stroke-width="2"/>
<line x1="65.0" y1="78" x2="65.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="72.5" y1="78" x2="72.5" y2="106" class="s-blue" stroke-width="2"/>
<line x1="80.0" y1="78" x2="80.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="95.0" y1="78" x2="95.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="110.0" y1="78" x2="110.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="125.0" y1="78" x2="125.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="140.0" y1="78" x2="140.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="170.0" y1="78" x2="170.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="200.0" y1="78" x2="200.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="230.0" y1="78" x2="230.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="260.0" y1="78" x2="260.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="320.0" y1="78" x2="320.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="380.0" y1="78" x2="380.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="440.0" y1="78" x2="440.0" y2="106" class="s-blue" stroke-width="2"/>
<line x1="500" y1="78" x2="500" y2="106" class="s-blue" stroke-width="2"/>
<text x="20" y="126" font-size="13" text-anchor="middle" stroke="none">0</text>
<text x="80" y="126" font-size="13" text-anchor="middle" stroke="none">1</text>
<text x="140" y="126" font-size="13" text-anchor="middle" stroke="none">2</text>
<text x="260" y="126" font-size="13" text-anchor="middle" stroke="none">4</text>
<text x="500" y="126" font-size="13" text-anchor="middle" stroke="none">8</text>
<path d="M262,64 V56 H498 V64" class="s-gray" stroke-width="1.3"/>
<text x="380.0" y="50" font-size="12" text-anchor="middle" stroke="none" class="t-gray">gap 1</text>
<path d="M142,64 V56 H258 V64" class="s-gray" stroke-width="1.3"/>
<text x="200.0" y="50" font-size="12" text-anchor="middle" stroke="none" class="t-gray">gap ½</text>
<path d="M82,64 V56 H138 V64" class="s-gray" stroke-width="1.3"/>
<text x="110.0" y="50" font-size="12" text-anchor="middle" stroke="none" class="t-gray">gap ¼</text>
<text x="50.0" y="40" font-size="12" text-anchor="middle" stroke="none" class="t-gray">tiny gaps</text>
<text x="20" y="152" font-size="12" text-anchor="start" stroke="none" class="t-blue">▮ normal values: 4 per power-of-two range (2 fraction bits)</text>
<text x="20" y="172" font-size="12" text-anchor="start" stroke="none" class="t-purple">▮ subnormals below the smallest normal (¼): evenly spaced down to 0</text>
</svg>`,
          alt: 'A number line from 0 to 8 with tick marks at every representable value of a tiny floating-point format. There are four ticks between 1 and 2, four between 2 and 4 with twice the spacing, and four between 4 and 8 with four times the spacing; below 1 the ticks get denser, and below 0.25 a purple region of evenly spaced subnormals reaches 0.',
          caption: 'Same count of values per power-of-two range, so the spacing doubles each time. A real `float` has 2²³ values per range instead of 4.',
          maxWidth: 520,
        },
        {
          type: 'p',
          text: 'So floating-point precision is **relative**, not absolute. A `float` carries 24 significant bits, about 7 decimal digits, whether the number is 0.000123 or 123,000. A `double` carries 53 bits, about 16 decimal digits. Keep that sentence in mind; nearly every floating-point surprise in this lesson follows from it.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just use 64-bit integers?',
          text: 'You could store positions as integers in micrometres, and some games do (see fixed-point at the end of this lesson). But then you must pick the scale up front, overflow is undefined, and every multiply needs rescaling. Floating point trades a little precision for automatic scaling over a range of about 10⁻³⁸ to 10³⁸ (`float`) or 10⁻³⁰⁸ to 10³⁰⁸ (`double`), with hardware that does the bookkeeping for you.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The IEEE 754 layout',
      blocks: [
        {
          type: 'p',
          text: 'Virtually every CPU and GPU implements the [[ieee-754]] standard. A `float` (binary32) is 32 bits split into three fields, and a `double` (binary64) uses the same design with wider fields:',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 212" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<text x="20" y="26" font-size="14" text-anchor="start" stroke="none" font-weight="bold">float (binary32)</text>
<rect x="20" y="36" width="15.0" height="32" rx="2" class="f-purple" fill-opacity="0.18" stroke="none"/>
<rect x="20" y="36" width="15.0" height="32" rx="2" class="s-purple"/>
<text x="22" y="82" font-size="10" text-anchor="start" stroke="none" class="t-gray">31</text>
<rect x="35.0" y="36" width="120.0" height="32" rx="2" class="f-blue" fill-opacity="0.18" stroke="none"/>
<rect x="35.0" y="36" width="120.0" height="32" rx="2" class="s-blue"/>
<text x="95.0" y="57" font-size="13" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">exponent: 8 bits</text>
<text x="37.0" y="82" font-size="10" text-anchor="start" stroke="none" class="t-gray">30</text>
<rect x="155.0" y="36" width="345.0" height="32" rx="2" class="f-green" fill-opacity="0.18" stroke="none"/>
<rect x="155.0" y="36" width="345.0" height="32" rx="2" class="s-green"/>
<text x="327.5" y="57" font-size="13" text-anchor="middle" stroke="none" class="t-green" font-weight="bold">fraction: 23 bits</text>
<text x="157.0" y="82" font-size="10" text-anchor="start" stroke="none" class="t-gray">22</text>
<text x="500" y="82" font-size="10" text-anchor="end" stroke="none" class="t-gray">0</text>
<text x="27.5" y="57" font-size="13" text-anchor="middle" stroke="none" class="t-purple" font-weight="bold">s</text>
<text x="500" y="26" font-size="12" text-anchor="end" stroke="none" class="t-gray">bias 127</text>
<text x="20" y="108" font-size="14" text-anchor="start" stroke="none" font-weight="bold">double (binary64)</text>
<rect x="20" y="118" width="7.5" height="32" rx="2" class="f-purple" fill-opacity="0.18" stroke="none"/>
<rect x="20" y="118" width="7.5" height="32" rx="2" class="s-purple"/>
<text x="22" y="164" font-size="10" text-anchor="start" stroke="none" class="t-gray">63</text>
<rect x="27.5" y="118" width="82.5" height="32" rx="2" class="f-blue" fill-opacity="0.18" stroke="none"/>
<rect x="27.5" y="118" width="82.5" height="32" rx="2" class="s-blue"/>
<text x="68.8" y="139" font-size="13" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">exp: 11 bits</text>
<rect x="110.0" y="118" width="390.0" height="32" rx="2" class="f-green" fill-opacity="0.18" stroke="none"/>
<rect x="110.0" y="118" width="390.0" height="32" rx="2" class="s-green"/>
<text x="305.0" y="139" font-size="13" text-anchor="middle" stroke="none" class="t-green" font-weight="bold">fraction: 52 bits</text>
<text x="112.0" y="164" font-size="10" text-anchor="start" stroke="none" class="t-gray">51</text>
<text x="500" y="164" font-size="10" text-anchor="end" stroke="none" class="t-gray">0</text>
<text x="500" y="108" font-size="12" text-anchor="end" stroke="none" class="t-gray">bias 1023</text>
<text x="260" y="200" font-size="14" text-anchor="middle" stroke="none" font-weight="bold">value = (−1)ˢ × 1.fraction₂ × 2^(exponent − bias)</text>
</svg>`,
          alt: 'Bit layout of float: 1 sign bit (bit 31), 8 exponent bits (30 to 23), 23 fraction bits (22 to 0), bias 127. Double: 1 sign bit, 11 exponent bits, 52 fraction bits, bias 1023.',
          caption: 'value = (−1)ˢ × 1.fraction × 2^(exponent − bias), for normal numbers.',
          maxWidth: 520,
        },
        {
          type: 'list',
          items: [
            '**Sign** (1 bit): 0 for positive, 1 for negative. Negating a float just flips this bit.',
            '**Exponent** (8 bits): stored with a **bias** of 127, so a stored 127 means 2⁰ and a stored 130 means 2³. Stored values 0 and 255 are reserved for special cases.',
            '**Fraction** (23 bits): the bits after the binary point. A normalized binary number always starts with `1.`, so that leading 1 is **not stored**: the "hidden bit" buys a 24th bit of precision for free.',
          ],
        },
        {
          type: 'code',
          title: 'inspect_float.cpp',
          runnable: true,
          code: `#include <bit>
#include <cmath>
#include <cstdint>
#include <cstdio>

void inspect(float f) {
    auto bits = std::bit_cast<std::uint32_t>(f);
    unsigned sign     = bits >> 31;
    unsigned exponent = (bits >> 23) & 0xFF;   // 8 bits
    unsigned fraction = bits & 0x7FFFFF;       // 23 bits

    // Normal numbers: (-1)^s * 1.fraction * 2^(exponent - 127)
    double significand = 1.0 + fraction / 8388608.0;  // 2^23
    double value = (sign ? -1.0 : 1.0) * significand *
                   std::ldexp(1.0, int(exponent) - 127);

    std::printf("%-9g 0x%08X  s=%u e=%3u (2^%-4d) f=0x%06X -> %g\\n",
                f, bits, sign, exponent, int(exponent) - 127,
                fraction, value);
}

int main() {
    inspect(1.0f);
    inspect(-6.25f);
    inspect(0.1f);
    inspect(3.0f);
    inspect(100000.0f);
}`,
          output: `1         0x3F800000  s=0 e=127 (2^0   ) f=0x000000 -> 1
-6.25     0xC0C80000  s=1 e=129 (2^2   ) f=0x480000 -> -6.25
0.1       0x3DCCCCCD  s=0 e=123 (2^-4  ) f=0x4CCCCD -> 0.1
3         0x40400000  s=0 e=128 (2^1   ) f=0x400000 -> 3
100000    0x47C35000  s=0 e=143 (2^16  ) f=0x435000 -> 100000`,
          annotations: [
            { lines: 7, text: '`std::bit_cast` gives the raw bits without undefined behavior (previous lesson).' },
            { lines: '8-10', text: 'Shift each field down and mask it: 1 sign bit, 8 exponent bits, 23 fraction bits.' },
            { lines: 13, text: 'Put the hidden 1 back in front of the fraction: 1 + fraction / 2²³.' },
            { lines: 15, text: '`std::ldexp(1.0, k)` computes 2ᵏ exactly. Subtracting the bias 127 recovers the true exponent.' },
            { lines: 25, text: '0.1 needs the exponent 2⁻⁴ (0.1 = 1.6 × 2⁻⁴) and a repeating fraction `0x4CCCCD`, which is `100 1100 1100 … 1101`: the pattern 1100 repeats forever and is rounded at bit 23.' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Encoding a float by hand',
      blocks: [
        {
          type: 'p',
          text: 'Encoding is the decoding steps in reverse: write the magnitude in binary, normalize it to `1.xxx × 2ᵉ`, add the bias to e, and drop the leading 1. Step through −6.25:',
        },
        {
          type: 'algo',
          view: 'array',
          caption: 'Purple: sign. Blue: biased exponent. Green: fraction (the last cell stands for the remaining 18 zero bits).',
          interval: 1500,
          frames: [
            {
              note: 'Encode −6.25 as a `float`: 1 sign bit, 8 exponent bits, 23 fraction bits (only the first 5 fraction cells are drawn; the rest are 0).',
              array: ['·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '…'],
              pointers: [
                { index: 0, label: 's', color: 'purple' },
                { index: 1, label: 'exponent', color: 'blue' },
                { index: 9, label: 'fraction', color: 'green' },
              ],
              vars: [['value', '−6.25']],
            },
            {
              note: 'The number is negative, so the sign bit is **1**. Everything else encodes the magnitude 6.25.',
              array: [1, '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '…'],
              marks: [{ index: 0, color: 'purple' }],
              vars: [['sign', '1 (negative)']],
            },
            {
              note: 'Write 6.25 in binary: 6 = 110, 0.25 = 0.01, so 6.25 = **110.01₂**.',
              array: [1, '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '…'],
              marks: [{ index: 0, color: 'purple' }],
              vars: [['6.25', '4 + 2 + ¼'], ['binary', '110.01']],
            },
            {
              note: 'Normalize: move the binary point until one 1 is left of it. 110.01 = **1.1001 × 2²**.',
              array: [1, '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '·', '…'],
              marks: [{ index: 0, color: 'purple' }],
              vars: [['normalized', '1.1001₂ × 2²'], ['exponent', '2']],
            },
            {
              note: 'Store the exponent with a bias of 127: 2 + 127 = **129** = 1000 0001. The bias lets the hardware compare exponents as unsigned numbers.',
              array: [1, 1, 0, 0, 0, 0, 0, 0, 1, '·', '·', '·', '·', '·', '…'],
              marks: [
                { index: 0, color: 'purple' },
                { index: 1, color: 'blue' },
                { index: 2, color: 'blue' },
                { index: 3, color: 'blue' },
                { index: 4, color: 'blue' },
                { index: 5, color: 'blue' },
                { index: 6, color: 'blue' },
                { index: 7, color: 'blue' },
                { index: 8, color: 'blue' },
              ],
              vars: [['stored exponent', '2 + 127 = 129'], ['bits', '1000 0001']],
            },
            {
              note: 'Store the bits after the leading 1 as the fraction: **1001**, padded with zeros to 23 bits. The leading 1 itself is implied, never stored.',
              array: [1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, '…0'],
              marks: [
                { index: 0, color: 'purple' },
                { index: 1, color: 'blue' },
                { index: 2, color: 'blue' },
                { index: 3, color: 'blue' },
                { index: 4, color: 'blue' },
                { index: 5, color: 'blue' },
                { index: 6, color: 'blue' },
                { index: 7, color: 'blue' },
                { index: 8, color: 'blue' },
                { index: 9, color: 'green' },
                { index: 10, color: 'green' },
                { index: 11, color: 'green' },
                { index: 12, color: 'green' },
                { index: 13, color: 'green' },
                { index: 14, color: 'green' },
              ],
              vars: [['fraction', '1001 0000 … 0'], ['hidden bit', '1 (not stored)']],
            },
            {
              note: 'Group the 32 bits into nibbles: 1100 0000 1100 1000 0000 0000 0000 0000 = **0xC0C80000**.',
              array: [1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, '…0'],
              marks: [
                { index: 0, color: 'purple' },
                { index: 1, color: 'blue' },
                { index: 2, color: 'blue' },
                { index: 3, color: 'blue' },
                { index: 4, color: 'blue' },
                { index: 5, color: 'blue' },
                { index: 6, color: 'blue' },
                { index: 7, color: 'blue' },
                { index: 8, color: 'blue' },
                { index: 9, color: 'green' },
                { index: 10, color: 'green' },
                { index: 11, color: 'green' },
                { index: 12, color: 'green' },
                { index: 13, color: 'green' },
                { index: 14, color: 'green' },
              ],
              vars: [['bits', '1100 0000 1100 1000 0000…'], ['hex', '0xC0C80000']],
            },
            {
              note: 'Decode to check: (−1)¹ × 1.1001₂ × 2^(129−127) = −1.5625 × 4 = **−6.25** ✓.',
              array: [1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, '…0'],
              marks: [
                { index: 0, color: 'purple' },
                { index: 1, color: 'blue' },
                { index: 2, color: 'blue' },
                { index: 3, color: 'blue' },
                { index: 4, color: 'blue' },
                { index: 5, color: 'blue' },
                { index: 6, color: 'blue' },
                { index: 7, color: 'blue' },
                { index: 8, color: 'blue' },
                { index: 9, color: 'green' },
                { index: 10, color: 'green' },
                { index: 11, color: 'green' },
                { index: 12, color: 'green' },
                { index: 13, color: 'green' },
                { index: 14, color: 'green' },
              ],
              vars: [['1.1001₂', '1 + ½ + ¹⁄₁₆ = 1.5625'], ['value', '−1.5625 × 4 = −6.25']],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a biased exponent?',
          text: 'With the bias, the exponent field is an unsigned number that grows with magnitude, and it sits above the fraction. As a result, for two positive floats, comparing their bit patterns **as unsigned integers** gives the same order as comparing the floats. Hardware and software (radix sorts, ULP distance calculations) exploit this. Two\'s complement exponents would break it.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Hex literals for floats',
          text: 'C++17 accepts hexadecimal floating-point literals, which state the exact binary value: `0x1.9p2f` is 1.1001₂ × 2² = 6.25f, and `std::printf("%a", x)` prints any float this way. They are the honest way to write constants that must be bit-exact, for example in deterministic simulation code.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'numeric',
      prompt: 'What is the 32-bit pattern of `-2.0f`? Type it in hex (for example `0x3F800000`).',
      answer: '0xC0000000',
      alsoAccept: [3221225472],
      label: 'Bits =',
      hint: '−2.0 = −1.0 × 2¹. Work out the sign bit, the biased exponent and the fraction.',
      explanation:
        'The sign is 1. The magnitude is 1.0 × 2¹, so the stored exponent is 1 + 127 = 128 = `1000 0000`, and the fraction is all zeros because the significand is exactly 1.0 (the leading 1 is hidden). The bits are `1 10000000 000…0` = `1100 0000 0000 … 0000` = `0xC0000000`. Notice that +2.0f is `0x40000000`: only bit 31 differs.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Rounding and the ULP',
      blocks: [
        {
          type: 'p',
          text: 'Most real numbers fall between two representable floats, so every operation must round. IEEE 754 requires `+`, `−`, `×`, `÷` and `sqrt` to be **correctly rounded**: the result is the exact mathematical answer rounded to the nearest representable value (ties go to the one with an even last bit). Each single operation is therefore as accurate as the format allows. Errors come from chaining operations and from inputs that were already rounded.',
        },
        {
          type: 'definition',
          term: 'ULP (unit in the last place)',
          text: 'The [[ulp|gap between a float and the next representable float]]. At 1.0f it is 2⁻²³ ≈ 1.19 × 10⁻⁷ (`std::numeric_limits<float>::epsilon()`). It doubles at every power of two, so a correctly rounded result is always within half an ULP of the true value.',
        },
        {
          type: 'code',
          title: 'ulp.cpp',
          runnable: true,
          code: `#include <cmath>
#include <cstdio>
#include <initializer_list>
#include <limits>

int main() {
    const float inf = std::numeric_limits<float>::infinity();
    for (float x : {1.0f, 1000.0f, 1e6f, 1e7f, 16777216.0f}) {
        float gap = std::nextafter(x, inf) - x;   // 1 ULP at x
        std::printf("at %-10.0f next float is %.9g away\\n", x, gap);
    }
    float big = 16777216.0f;          // 2^24
    float bigger = big + 1.0f;        // rounds back down
    std::printf("2^24 + 1 = %.1f\\n", bigger);
    std::printf("epsilon  = %g\\n",
                std::numeric_limits<float>::epsilon());
}`,
          output: `at 1          next float is 1.1920929e-07 away
at 1000       next float is 6.10351562e-05 away
at 1000000    next float is 0.0625 away
at 10000000   next float is 1 away
at 16777216   next float is 2 away
2^24 + 1 = 16777216.0
epsilon  = 1.19209e-07`,
          annotations: [
            { lines: 9, text: '`std::nextafter` returns the neighbouring representable value, so the difference is exactly one ULP.' },
            { lines: 13, text: 'Above 2²⁴ the ULP is 2, so odd integers no longer exist as floats. 16,777,217 rounds to the even neighbour 16,777,216.' },
          ],
        },
        {
          type: 'p',
          text: 'Now the game consequences. Accumulate a frame clock in a `float` at 60 Hz and watch it drift as it grows:',
        },
        {
          type: 'code',
          title: 'game_clock.cpp',
          runnable: true,
          code: `#include <cstdio>

int main() {
    const float dt = 1.0f / 60.0f;      // one frame at 60 Hz
    float  t32 = 0.0f;
    double t64 = 0.0;
    const long frames[] = {3600, 216000, 5184000};  // 1 min, 1 h, 1 day

    long done = 0;
    for (long target : frames) {
        for (; done < target; ++done) {
            t32 += dt;
            t64 += dt;
        }
        std::printf("after %7ld frames: float %.3f  double %.3f\\n",
                    done, t32, t64);
    }
}`,
          output: `after    3600 frames: float 59.999  double 60.000
after  216000 frames: float 3597.207  double 3600.000
after 5184000 frames: float 83794.820  double 86400.005`,
          annotations: [
            { lines: 12, text: 'Each `+=` rounds to the nearest float. As `t32` grows, its ULP grows, and the rounding error per frame grows with it. Above 65,536 s the ULP is about 0.008 s, half a frame.' },
            { lines: 13, text: 'The `double` sum is almost exact. Its 5 ms error after a day comes from `dt` itself: 1/60 rounded to a float is 0.016666668.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Large World Coordinates',
          text: 'Unreal units are centimetres. At 10 km from the origin a `float` coordinate has an ULP of 0.0625 cm, and at 100 km it is a full centimetre, enough to make animations jitter and physics contacts flicker. That is why Unreal Engine 5 switched `FVector` and transforms to `double` ([[large-world-coordinates]]), while still sending `float` data to the GPU relative to the camera.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'numeric',
      prompt: 'What is the smallest positive integer that a `float` cannot represent exactly?',
      answer: 16777217,
      hint: 'A float has 24 significant bits including the hidden 1.',
      explanation:
        'Every integer up to 2²⁴ = 16,777,216 fits in 24 significant bits. 2²⁴ + 1 would need 25 bits (a 1, twenty-three 0s, and a 1), so it falls exactly halfway between 16,777,216 and 16,777,218 and rounds to the even one, 16,777,216. This is why a `float` entity ID, score or frame counter silently stops incrementing past 16.7 million. For `double` the limit is 2⁵³ + 1.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Why 0.1 + 0.2 != 0.3, and how to compare',
      blocks: [
        {
          type: 'p',
          text: 'In base 10, 1/3 never terminates. In base 2 the same happens to 1/10: 0.1 = 0.000110011001100…₂, repeating forever. So the literal `0.1` is really the nearest double to 0.1, and the same is true for 0.2 and 0.3. Each was rounded separately, and the sum of two rounded values need not round to the same place as the third:',
        },
        {
          type: 'code',
          title: 'point_one.cpp',
          runnable: true,
          code: `#include <cstdio>

int main() {
    double a = 0.1, b = 0.2, c = 0.3;
    std::printf("0.1       = %.20f\\n", a);
    std::printf("0.2       = %.20f\\n", b);
    std::printf("0.1 + 0.2 = %.20f\\n", a + b);
    std::printf("0.3       = %.20f\\n", c);
    std::printf("equal? %s\\n", (a + b == c) ? "yes" : "no");
    std::printf("0.1f      = %.27f\\n", 0.1f);
}`,
          output: `0.1       = 0.10000000000000000555
0.2       = 0.20000000000000001110
0.1 + 0.2 = 0.30000000000000004441
0.3       = 0.29999999999999998890
equal? no
0.1f      = 0.100000001490116119384765625`,
          annotations: [
            { lines: 7, text: 'The two input errors add up and the sum rounds to the double just **above** 0.3...' },
            { lines: 8, text: '...while the literal 0.3 rounds to the double just **below** it. They are neighbours, one ULP apart, but not equal.' },
            { lines: 10, text: 'Every float is a finite binary fraction, so it has an exact decimal expansion. This is the exact value stored for `0.1f`.' },
          ],
        },
        {
          type: 'p',
          text: 'So never test computed floats with `==`. Test whether they are **close enough**, and choose "close" deliberately. An absolute tolerance such as 10⁻⁶ is meaningless at 100,000, where neighbouring floats are 0.0078 apart. A relative tolerance scales with the values but fails near zero. Robust code combines both, as described in Bruce Dawson\'s classic article:',
        },
        {
          type: 'code',
          title: 'nearly_equal.cpp',
          runnable: true,
          code: `#include <algorithm>
#include <cmath>
#include <cstdio>

// True if a and b are within absTol of each other (for values
// near zero) or within relTol of the larger magnitude.
bool nearlyEqual(float a, float b, float relTol = 1e-5f,
                 float absTol = 1e-6f) {
    float diff = std::fabs(a - b);
    if (diff <= absTol) return true;
    float largest = std::max(std::fabs(a), std::fabs(b));
    return diff <= largest * relTol;
}

int main() {
    float sum = 0.0f;
    for (int i = 0; i < 10; ++i) sum += 0.1f;

    std::printf("sum = %.9g\\n", sum);
    std::printf("sum == 1.0f      : %d\\n", sum == 1.0f);
    std::printf("nearlyEqual      : %d\\n", nearlyEqual(sum, 1.0f));

    float far = 100000.0f;
    float farPlus = far + 0.0078125f;   // 1 ULP at 100000
    std::printf("fixed 1e-6 test  : %d\\n",
                std::fabs(far - farPlus) <= 1e-6f);
    std::printf("relative test    : %d\\n", nearlyEqual(far, farPlus));
}`,
          output: `sum = 1.00000012
sum == 1.0f      : 0
nearlyEqual      : 1
fixed 1e-6 test  : 0
relative test    : 1`,
          annotations: [
            { lines: 10, text: 'Absolute test first: values near zero (where relative error explodes) count as equal if they are within `absTol`.' },
            { lines: '11-12', text: 'Relative test: allow a difference proportional to the magnitude. `1e-5f` is on the order of 100 ULPs for float.' },
            { lines: 24, text: 'Two floats that are adjacent at 100,000 differ by 0.0078125, so a fixed 10⁻⁶ tolerance calls them different even though no float lies between them.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Pick tolerances from the problem',
          text: 'The right tolerance comes from what the numbers mean: "within a millimetre" for positions, "within 0.1 degree" for angles. Unreal\'s `FMath::IsNearlyEqual(A, B, Tolerance)` and `FVector::Equals(V, Tolerance)` take the tolerance explicitly for exactly this reason. See also [[epsilon-comparison]].',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'bug',
      prompt: 'This loop is supposed to fade a light in 0.1 steps from 0 to 1. On a real PC it never stops. Tap the buggy line.',
      code: `#include <cstdio>

int main() {
    for (float alpha = 0.0f; alpha != 1.0f; alpha += 0.1f) {
        std::printf("alpha = %.2f\\n", alpha);
    }
}`,
      bugLines: [4],
      hint: 'What exact value does `alpha` hold after ten additions of `0.1f`?',
      explanation:
        '`0.1f` is not exactly 0.1, and each `+=` rounds again. After ten steps `alpha` is 1.00000012, one ULP above 1.0, so `alpha != 1.0f` stays true. The loop keeps going until `alpha` is around two million, where adding 0.1 rounds back to the same value, and then it is stuck there forever. Loop over an integer and compute the float from it (`for (int i = 0; i <= 10; ++i) { float alpha = i * 0.1f; … }`), or at least use `<` instead of `!=`.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Infinities, NaN and signed zero',
      blocks: [
        {
          type: 'p',
          text: 'The reserved exponent values encode special cases, so a floating-point computation never "crashes" the way integer division by zero does. It produces a value that records what went wrong:',
        },
        {
          type: 'table',
          headers: ['Exponent field', 'Fraction', 'Meaning', 'Example bits (float)'],
          rows: [
            ['0', '0', '±0 (signed zero)', '`0x00000000`, `0x80000000`'],
            ['0', 'nonzero', 'Subnormal: ±0.fraction × 2⁻¹²⁶', '`0x00000001` ≈ 1.4 × 10⁻⁴⁵'],
            ['1 to 254', 'anything', 'Normal: ±1.fraction × 2^(e − 127)', '`0x3F800000` = 1.0'],
            ['255', '0', '±infinity', '`0x7F800000`, `0xFF800000`'],
            ['255', 'nonzero', 'NaN (not a number)', '`0x7FC00000` (a quiet NaN)'],
          ],
        },
        {
          type: 'code',
          title: 'special.cpp',
          runnable: true,
          code: `#include <bit>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <limits>

void bits(const char* name, float f) {
    std::printf("%-6s 0x%08X\\n", name, std::bit_cast<std::uint32_t>(f));
}

int main() {
    const float inf = std::numeric_limits<float>::infinity();
    const float nan = std::numeric_limits<float>::quiet_NaN();
    const float negZero = -0.0f;

    bits("+inf", inf);
    bits("-inf", -inf);
    bits("NaN", nan);
    bits("+0", 0.0f);
    bits("-0", negZero);

    std::printf("nan == nan  : %d\\n", nan == nan);
    std::printf("nan != nan  : %d\\n", nan != nan);
    std::printf("isnan(0*inf): %d\\n", std::isnan(0.0f * inf));
    std::printf("-0 == +0    : %d\\n", negZero == 0.0f);
    std::printf("1 / -0      : %g\\n", 1.0f / negZero);
    std::printf("signbit(-0) : %d\\n", std::signbit(negZero));
    std::printf("nan + 5     : %g\\n", nan + 5.0f);
}`,
          output: `+inf   0x7F800000
-inf   0xFF800000
NaN    0x7FC00000
+0     0x00000000
-0     0x80000000
nan == nan  : 0
nan != nan  : 1
isnan(0*inf): 1
-0 == +0    : 1
1 / -0      : -inf
signbit(-0) : 1
nan + 5     : nan`,
          annotations: [
            { lines: 22, text: 'NaN compares unequal to everything, including itself. `x != x` is true only for NaN.' },
            { lines: 24, text: 'Invalid operations (0 × ∞, ∞ − ∞, 0/0, `sqrt(-1)`) produce NaN.' },
            { lines: '25-26', text: '−0 and +0 compare equal, but they are different bit patterns and behave differently: dividing by them gives infinities of opposite sign.' },
            { lines: 28, text: 'NaN is contagious: any arithmetic with a NaN operand yields NaN.' },
          ],
        },
        {
          type: 'p',
          text: 'NaN propagation is a design feature: a long calculation can finish and you check once at the end. In a game it is also a classic bug pattern. One `0/0` in a normalization (normalizing a zero-length vector) makes a velocity NaN, then the position, then the transform, and the object vanishes or the physics island explodes a frame later, far from the cause. Unreal has `FVector::ContainsNaN()` and NaN diagnostics for this reason; check at system boundaries and guard divisions such as `GetSafeNormal()` does.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: '-ffast-math assumes NaN never happens',
          text: '`-ffast-math` (and MSVC `/fp:fast`) lets the compiler assume there are no NaNs or infinities. GCC may then fold `std::isnan(x)` to `false`, removing the very check you added to catch the bug. Many engines enable fast-math selectively, never globally, partly for this reason.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'truefalse',
      prompt: 'Sorting a `std::vector<float>` that contains a NaN with `std::sort` is safe: the NaN simply ends up at one end.',
      answer: false,
      explanation:
        '`std::sort` requires its comparison to be a strict weak ordering. With `<`, a NaN is "neither less nor greater" than every value, so NaN is equivalent to both 1 and 5 while 1 < 5, which breaks transitivity of equivalence. That is undefined behavior: real implementations can produce unsorted output, and some can even read out of bounds. Remove NaNs first (`std::erase_if(v, [](float x) { return std::isnan(x); });`), or sort with a comparator built on C++20 `std::strong_order`, which implements IEEE 754\'s total order for floats.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Subnormals and their hidden cost',
      blocks: [
        {
          type: 'p',
          text: 'The smallest **normal** float is 2⁻¹²⁶ ≈ 1.18 × 10⁻³⁸. Without anything below it, the gap between 0 and the smallest normal would be far larger than the gaps just above it, and `x − y` could be 0 even when `x != y`. IEEE 754 fills that hole with [[subnormal-number|subnormal]] (also called denormal) numbers: exponent field 0, **no hidden 1**, so they spread evenly down to 2⁻¹⁴⁹ ≈ 1.4 × 10⁻⁴⁵. This "gradual underflow" is the purple region in the first figure of this lesson.',
        },
        {
          type: 'p',
          text: 'The catch is speed. Many x86 cores handle normal floats entirely in the fast floating-point pipeline but hand subnormal inputs or results to a slow **microcode assist**. Agner Fog\'s measurements show penalties on the order of a hundred clock cycles per affected operation on many Intel microarchitectures, against a few cycles normally; the exact cost varies by CPU and by operation. A loop that is fine for 30 seconds can suddenly run many times slower when values decay into the subnormal range.',
        },
        {
          type: 'code',
          title: 'denormals.cpp',
          runnable: true,
          code: `#include <cmath>
#include <cstdio>
#include <xmmintrin.h>   // MXCSR control (SSE)

volatile float start = 1.0f;     // volatile: compute at run time
volatile float damping = 0.5f;

void decay(const char* label) {
    float v = start;
    int steps = 0, firstSub = -1;
    while (v != 0.0f) {
        v = v * damping;
        ++steps;
        if (firstSub < 0 && std::fpclassify(v) == FP_SUBNORMAL)
            firstSub = steps;
    }
    std::printf("%s: subnormal from step %d, zero at step %d\\n",
                label, firstSub, steps);
}

int main() {
    decay("IEEE default ");
    // Flush-to-zero (FTZ) and denormals-are-zero (DAZ) bits.
    _mm_setcsr(_mm_getcsr() | 0x8040);
    decay("FTZ + DAZ on ");
}`,
          output: `IEEE default : subnormal from step 127, zero at step 150
FTZ + DAZ on : subnormal from step -1, zero at step 127`,
          annotations: [
            { lines: '5-6', text: '`volatile` stops the compiler from computing the loop at compile time, where the MXCSR setting would not apply.' },
            { lines: 12, text: 'Think of a reverb tail, a velocity damped every frame or a fading particle: values shrink geometrically toward zero.' },
            { lines: 14, text: 'After 127 halvings, 2⁻¹²⁷ is below the smallest normal, so it is stored as a subnormal. It then takes 23 more steps (one per fraction bit) to reach 0.' },
            { lines: 24, text: 'Bit 15 of MXCSR (FTZ) flushes subnormal **results** to zero; bit 6 (DAZ) treats subnormal **inputs** as zero. The setting is per thread.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'What engines do',
          text: 'Audio engines and physics code commonly set FTZ/DAZ on their worker threads, giving up gradual underflow (which games almost never need) for predictable speed. Linking an executable with GCC\'s `-ffast-math` also sets them at startup. Another approach is to snap tiny values to zero explicitly, for example `if (std::fabs(v) < 1e-20f) v = 0.0f;`. GPUs generally flush subnormals in shaders for the same reason.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'A cloth simulation multiplies every particle\'s velocity by 0.98 each step. Profiling shows the step is fast for the first minute of a quiet scene, then becomes several times slower even though the particle count is unchanged. What is the most likely cause?',
      options: [
        { text: 'The velocities decayed into the subnormal range, and operations on them take a slow microcode path', correct: true, why: 'Exactly the denormal trap: a still scene drives values geometrically toward zero, and subnormal arithmetic can cost on the order of 100 cycles per operation on many x86 cores. FTZ/DAZ or snapping tiny values to zero fixes it.' },
        { text: 'The velocities became NaN, and NaN arithmetic is slow', why: 'Multiplying by 0.98 cannot create a NaN, and on modern x86 cores NaN arithmetic runs at normal speed for ordinary SSE operations.' },
        { text: 'Floating-point rounding errors accumulate and make each multiplication more expensive', why: 'Rounding never changes the cost of a normal operation: each multiply is correctly rounded in the same fixed number of cycles.' },
        { text: 'The values got so small that the CPU switches from float to double precision', why: 'The hardware never changes the precision on its own; a `float` operation stays a `float` operation.' },
      ],
      explanation:
        'Performance that degrades over time with constant work is the signature of subnormals. Any value that is repeatedly multiplied by a factor below 1 and never reset will eventually spend many steps in the subnormal range before it reaches zero (hundreds of steps for a factor of 0.98), and with thousands of particles that is thousands of slow operations per frame. Set FTZ/DAZ on the simulation threads or clamp near-zero values to zero.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Catastrophic cancellation',
      blocks: [
        {
          type: 'p',
          text: 'Subtraction of two nearly equal numbers is exact in floating point, but it exposes the rounding errors the inputs **already had**. If both operands carry an error of half an ULP of a large number and their difference is tiny, the error can be as large as the answer itself. This is [[catastrophic-cancellation]], and in games it shows up as soon as objects are far from the world origin:',
        },
        {
          type: 'code',
          title: 'cancellation.cpp',
          runnable: true,
          code: `#include <cstdio>

int main() {
    // Two soldiers 1.3 cm apart, 50 km from the world origin
    // (units: cm, like Unreal).
    float worldA = 5000000.0f;
    float worldB = worldA + 1.3f;
    std::printf("float, world space: %.4f cm\\n", worldB - worldA);

    double dA = 5000000.0, dB = dA + 1.3;
    std::printf("double, world space: %.4f cm\\n", dB - dA);

    // Rebase near the camera first: small numbers keep precision.
    float localA = 0.0f, localB = 1.3f;
    std::printf("float, local space: %.4f cm\\n", localB - localA);
}`,
          output: `float, world space: 1.5000 cm
double, world space: 1.3000 cm
float, local space: 1.3000 cm`,
          annotations: [
            { lines: 7, text: 'Near 5,000,000 the float ULP is 0.5, so 5,000,001.3 rounds to 5,000,001.5. The error happens here, silently.' },
            { lines: 8, text: 'The subtraction is exact, and that is the problem: it faithfully returns 1.5, an error of 15%. All the significant bits that would have held ".3" were spent on "5,000,00".' },
            { lines: 14, text: 'Express positions relative to a nearby origin **before** they are rounded to float, and the same 24 bits are spent on the part that matters.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Origin rebasing**: periodically shift the world so the player stays near (0, 0, 0). Many large open-world games use this; Unreal Engine 4 shipped it as world origin rebasing.',
            '**Camera-relative rendering**: subtract the camera position in double precision on the CPU, then send small float offsets to the GPU.',
            '**Rearrange formulas**: compute `1 - cos(x)` for small x as `2 * sin(x/2)²`, and compute variance with Welford\'s algorithm instead of E[x²] − E[x]², which subtracts two nearly equal large numbers.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'numeric',
      prompt: 'A `float` coordinate has the value 5,000,000. What is the distance to the next larger representable `float`?',
      answer: 0.5,
      alsoAccept: ['1/2'],
      unit: 'units',
      hint: 'Find the power of two just below 5,000,000. A float has 23 fraction bits.',
      explanation:
        '2²² = 4,194,304 ≤ 5,000,000 < 2²³ = 8,388,608, so the exponent is 22 and one ULP is 2²²⁻²³ = 2⁻¹ = 0.5. Every float between 4.19 million and 8.39 million is a multiple of 0.5. In Unreal centimetres that is 50 km from the origin, where a 1.3 cm offset can only be stored as 1.5 cm, as the program above showed.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'concept',
      title: 'Determinism: lockstep multiplayer and replays',
      blocks: [
        {
          type: 'p',
          text: 'Many strategy, fighting and sports games use **[[lockstep-simulation|deterministic lockstep]]**: instead of sending the positions of thousands of units, each machine sends only player inputs, and every machine runs the identical simulation. The classic write-up is "1500 Archers on a 28.8" about Age of Empires. Input-based replays work the same way. The catch: if one machine computes a single bit differently, the simulations diverge and never recover. That is a **desync**.',
        },
        {
          type: 'p',
          text: 'IEEE 754 makes each basic operation reproducible, so where do differences come from? From the fact that floating-point arithmetic is **not associative**, so anything that changes the order or grouping of operations changes the result:',
        },
        {
          type: 'code',
          title: 'not_associative.cpp',
          runnable: true,
          code: `#include <cstdio>
#include <vector>

int main() {
    float big = 1e8f, small = 1.0f;
    std::printf("(big + small) - big = %g\\n", (big + small) - big);
    std::printf("(big - big) + small = %g\\n", (big - big) + small);

    // Same numbers, two summation orders.
    std::vector<float> v;
    v.push_back(1e8f);
    for (int i = 0; i < 1000; ++i) v.push_back(1.0f);

    float forward = 0.0f, backward = 0.0f;
    for (float x : v) forward += x;
    for (auto it = v.rbegin(); it != v.rend(); ++it) backward += *it;
    std::printf("forward  = %.1f\\nbackward = %.1f\\n", forward, backward);
}`,
          output: `(big + small) - big = 0
(big - big) + small = 1
forward  = 100000000.0
backward = 100001000.0`,
          annotations: [
            { lines: 6, text: 'At 10⁸ the float ULP is 8, so adding 1 rounds straight back to 10⁸.' },
            { lines: 15, text: 'Adding 1,000 ones to 10⁸ one at a time loses every one of them.' },
            { lines: 16, text: 'Summing the small values first lets them accumulate to 1,000 before meeting the large one. A parallel reduction or a SIMD sum that splits the array differently gives yet another answer.' },
          ],
        },
        {
          type: 'p',
          text: 'A second source is **fused multiply-add** ([[fused-multiply-add|FMA]]): `a * b + c` computed with a single rounding instead of two. It is more accurate, but it is a different answer. The same source compiled with and without FMA instructions disagrees:',
        },
        {
          type: 'code',
          title: 'fma.cpp',
          runnable: true,
          code: `#include <cmath>
#include <cstdio>

volatile float va = 1.0f + 1.0f / 4096;    // 1 + 2^-12
volatile float vc = -(1.0f + 1.0f / 2048); // -(1 + 2^-11)

int main() {
    float a = va, b = va, c = vc;
    float twoRoundings = a * b;   // rounded once here...
    twoRoundings += c;            // ...and again here
    float oneRounding = std::fma(a, b, c);   // exact a*b, one rounding
    std::printf("separate: %g\\nfused:    %g\\n", twoRoundings, oneRounding);
}`,
          output: `separate: 0
fused:    5.96046e-08`,
          annotations: [
            { lines: 9, text: 'The exact product is 1 + 2⁻¹¹ + 2⁻²⁴. The 2⁻²⁴ term is half an ULP and is rounded away (to even).' },
            { lines: 11, text: '`std::fma` keeps the exact product, so the 2⁻²⁴ ≈ 5.96 × 10⁻⁸ survives.' },
          ],
        },
        {
          type: 'p',
          text: 'Here is the trap: g++ 13 compiles a plain `a * b + c` as separate `mulss` and `addss` with default flags, but with `-march=x86-64-v3` (which enables FMA instructions) it emits a single `vfmadd132ss`, **even in `-std=c++20` mode**. Two builds of the same game, one targeting newer CPUs, can disagree in the last bit, and a lockstep match desyncs.',
        },
        {
          type: 'table',
          headers: ['Source of difference', 'Fix'],
          rows: [
            ['Compiler contracts `a*b+c` into FMA on some targets', '`-ffp-contract=off` (GCC/Clang) or `/fp:strict` (MSVC); call `std::fma` explicitly where you want it'],
            ['`-ffast-math` reorders sums and products', 'Never use it in simulation code'],
            ['Different summation order (threads, SIMD width)', 'Fix the reduction order in the algorithm itself'],
            ['`sin`, `cos`, `exp` from different math libraries', 'Ship your own implementations; IEEE only guarantees correct rounding for + − × ÷ and `sqrt`'],
            ['x87 80-bit intermediates in old 32-bit builds', 'Use SSE (the default on x86-64)'],
            ['CPU vs GPU, or different GPUs', 'Keep simulation on the CPU'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why compilers do this at all',
          text: 'FMA halves the instruction count of dot products and matrix multiplies and is more accurate, so for rendering, audio and most physics it is a pure win. Determinism is the special case where "different but better" is worse than "identical". That is a property of your *game design*, so you have to request it from the toolchain explicitly.',
        },
      ],
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'mcq',
      prompt: 'Two PCs in a lockstep RTS match desync after a few minutes. Both run x86-64 Windows. Which explanation is most plausible?',
      options: [
        { text: 'One player runs an Intel CPU and the other an AMD CPU, and their `addss` instructions round differently', why: 'IEEE 754 requires basic operations to be correctly rounded, so `addss` gives bit-identical results on every compliant CPU from any vendor.' },
        { text: 'The two players run different builds, and one was compiled with FMA contraction allowed, so some `a * b + c` expressions round once instead of twice', correct: true, why: 'Different compiler flags or targets change which instructions compute the expression, and FMA changes the rounding. Every machine in a lockstep match must run the same simulation code, compiled the same way.' },
        { text: 'One PC is big-endian, so its floats have a different layout', why: 'Both are x86-64, which is little-endian, and endianness affects memory layout, not arithmetic results.' },
        { text: '`float` is 32 bits on one machine and 64 bits on the other', why: '`float` is IEEE binary32 on every mainstream compiler and platform; its size does not vary between Windows PCs.' },
      ],
      explanation:
        'Correctly rounded basic operations make floating point reproducible in principle: same operations, same order, same inputs, same bits. Desyncs come from code that does **different operations**: FMA contraction, fast-math reassociation, a different math library, a SIMD path on one CPU and a scalar path on another. The cure is to control the build (same binary, strict FP flags) or to avoid floats in the simulation altogether.',
    },
    // ------------------------------------------------------------------ 17
    {
      kind: 'concept',
      title: 'Fixed-point: integers pretending to be fractions',
      blocks: [
        {
          type: 'p',
          text: '[[fixed-point|Fixed-point]] arithmetic stores a fraction as an integer with an agreed scale. In **Q16.16**, a 32-bit integer holds the value × 65,536: 16 bits of integer part and 16 bits of fraction. Addition is plain integer addition. Multiplication multiplies the raw integers (giving a scale of 2³²) and shifts right by 16 to restore the scale, using a 64-bit intermediate so nothing overflows.',
        },
        {
          type: 'code',
          title: 'fixed_point.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <cstdio>

// Q16.16: 16 integer bits, 16 fraction bits, stored in 32 bits.
struct Fixed {
    std::int32_t raw;   // value * 65536

    static constexpr Fixed fromInt(int v) { return {v * 65536}; }
    static constexpr Fixed fromRatio(int num, int den) {
        return {static_cast<std::int32_t>(
            (std::int64_t{num} * 65536) / den)};
    }
    double toDouble() const { return raw / 65536.0; }
};

constexpr Fixed operator+(Fixed a, Fixed b) { return {a.raw + b.raw}; }
constexpr Fixed operator*(Fixed a, Fixed b) {
    // 64-bit intermediate, then drop 16 fraction bits.
    return {static_cast<std::int32_t>(
        (std::int64_t{a.raw} * b.raw) >> 16)};
}

int main() {
    Fixed speed = Fixed::fromRatio(5, 2);       // 2.5 units/tick
    Fixed dt    = Fixed::fromRatio(1, 60);      // 1/60 s
    Fixed pos   = Fixed::fromInt(100);

    for (int tick = 0; tick < 60; ++tick) pos = pos + speed * dt;

    std::printf("dt raw = %d (%.8f)\\n", dt.raw, dt.toDouble());
    std::printf("pos raw = %d (%.6f)\\n", pos.raw, pos.toDouble());
}`,
          output: `dt raw = 1092 (0.01666260)
pos raw = 6717400 (102.499390)`,
          annotations: [
            { lines: 6, text: 'The whole number is just an `int32_t`. Integer operations are exact and identical on every CPU, compiler and flag set.' },
            { lines: 11, text: '1/60 × 65,536 = 1092.27, truncated to 1092. Fixed-point has rounding error too...' },
            { lines: 20, text: '`raw * raw` has 32 fraction bits; shifting right by 16 brings it back to 16. Since C++20, `>>` on a negative `int64_t` is a well-defined arithmetic shift.' },
            { lines: 31, text: '...so the result is 102.49939 instead of 102.5. The point is that it is the **same** 102.49939 on every machine, which is what lockstep needs.' },
          ],
        },
        {
          type: 'table',
          headers: ['Property', 'float', 'Q16.16 fixed-point'],
          rows: [
            ['Range', '±3.4 × 10³⁸', '±32,768'],
            ['Precision', '~7 significant digits, relative', '1/65,536 ≈ 0.000015, absolute'],
            ['Determinism across builds', 'Only with strict flags and care', 'Exact by construction'],
            ['Overflow', 'Becomes ±infinity', 'Wraps or is UB: you must range-check'],
            ['sqrt, sin, division', 'Fast hardware', 'Write or table-drive your own'],
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Consoles without floating point',
          text: 'The original PlayStation had no floating-point unit at all: its geometry coprocessor (the GTE) did all 3D math in fixed-point, which is one reason PS1 polygons famously "wobble". The Nintendo DS\'s ARM9 had no FPU either. Today fixed-point lives on in deterministic simulations, in some physics and networking middleware built for lockstep and rollback games, and in embedded and military systems whose small processors have no FPU.',
        },
      ],
    },
    // ------------------------------------------------------------------ 18
    {
      kind: 'fill',
      prompt: 'Complete the Q16.16 multiply so the intermediate product cannot overflow and the result has 16 fraction bits again.',
      template: `std::int32_t mulQ16(std::int32_t a, std::int32_t b) {
    auto wide = std::___{a} * b;
    return static_cast<std::int32_t>(wide >> ___);
}`,
      blanks: [{ answers: ['int64_t'] }, { answers: ['16'] }],
      wordBank: ['int64_t', 'int32_t', 'int16_t', '16', '32', '8'],
      explanation:
        'Each operand carries 16 fraction bits, so the product carries 32 fraction bits and needs up to 64 bits of storage: two values near 32,768 have raw values near 2³¹, whose product is near 2⁶². Widening one operand to `std::int64_t` makes the multiply 64-bit; shifting right by 16 removes the extra 16 fraction bits. Shifting by 32 would drop the fraction entirely and leave only the integer part.',
    },
  ],
  takeaways: [
    'A float is (−1)ˢ × 1.fraction × 2^(exponent − bias): 1 + 8 + 23 bits for `float` (bias 127), 1 + 11 + 52 for `double` (bias 1023), with a hidden leading 1.',
    'Precision is relative: the gap between neighbours (the ULP) doubles at every power of two, so large coordinates and long-running clocks lose precision; above 2²⁴ a float cannot even hold every integer.',
    'Each basic operation is correctly rounded, but most decimal fractions are not representable, so compare computed values with a tolerance chosen from the problem, not with `==`.',
    'Infinities and NaN record errors instead of crashing; NaN is unequal to itself and contagious, and fast-math can remove your NaN checks.',
    'Subnormals give gradual underflow but can cost around a hundred cycles per operation on many x86 cores; FTZ/DAZ trade them for predictable speed.',
    'Subtracting nearly equal values exposes earlier rounding (catastrophic cancellation): keep numbers small with origin rebasing and camera-relative math.',
    'Floating-point addition is not associative and FMA rounds differently, so lockstep games need identical builds with strict FP flags, or fixed-point arithmetic, which is exact and deterministic but limited in range.',
  ],
  reading: [
    { title: 'Comparing Floating Point Numbers, 2012 Edition', url: 'https://randomascii.wordpress.com/2012/02/25/comparing-floating-point-numbers-2012-edition/', source: 'article', note: 'Bruce Dawson on absolute, relative and ULP-based comparisons, and when each one fails.' },
    { title: 'What Every Computer Scientist Should Know About Floating-Point Arithmetic', url: 'https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html', source: 'article', note: 'Goldberg\'s classic paper: rounding, cancellation and the design of IEEE 754.' },
    { title: 'std::numeric_limits', url: 'https://en.cppreference.com/w/cpp/types/numeric_limits', source: 'cppreference', note: 'epsilon, min, denorm_min, infinity and quiet_NaN for each floating-point type.' },
    { title: 'IEEE 754', url: 'https://en.wikipedia.org/wiki/IEEE_754', source: 'article', note: 'Formats, rounding modes and special values in one overview.' },
    { title: 'Agner Fog\'s optimization resources', url: 'https://www.agner.org/optimize/', source: 'article', note: 'The microarchitecture guide describes subnormal penalties on each CPU family.' },
  ],
};
