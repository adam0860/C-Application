import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-integers',
  title: 'Integers, Two\'s Complement and Overflow',
  summary: 'How the hardware adds, negates and compares integers, why two\'s complement won, what the carry and overflow flags mean, and how compilers exploit signed overflow being undefined.',
  minutes: 20,
  objectives: [
    'Explain unsigned integers as arithmetic modulo 2ⁿ and two\'s complement as the same circuit with a negative top-bit weight',
    'Negate, add and decode two\'s complement numbers by hand, and tell carry (unsigned overflow) from signed overflow',
    'Explain, with real compiler output, how signed overflow being undefined lets compilers generate faster code',
    'Predict sign- versus zero-extension, signed versus unsigned comparisons, and the cost of signed division by a power of two',
    'Use `<bit>` functions and saturating arithmetic, and know which hardware instructions they map to',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Unsigned integers live on a clock face',
      blocks: [
        {
          type: 'p',
          text: 'An n-bit unsigned integer can hold 2ⁿ values, 0 to 2ⁿ − 1. When the hardware adds two of them, the adder produces an (n + 1)-th bit, the **carry out**, and the register simply has nowhere to put it. The result is the true sum **modulo 2ⁿ**. Picture the values arranged around a clock: adding 1 to the largest value lands you back on 0.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 540 372" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<circle cx="270" cy="195" r="112" class="s-gray" stroke-width="1.5"/>
<circle cx="270.0" cy="83.0" r="4" fill="currentColor"/>
<text x="270.0" y="63.0" font-size="11" text-anchor="middle" stroke="none">0000</text>
<text x="270.0" y="36.0" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">0</text>
<text x="270.0" y="114.0" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">0</text>
<circle cx="312.9" cy="91.5" r="4" fill="currentColor"/>
<text x="322.0" y="73.4" font-size="11" text-anchor="middle" stroke="none">0001</text>
<text x="332.8" y="48.5" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">1</text>
<text x="302.9" y="120.5" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">1</text>
<circle cx="349.2" cy="115.8" r="4" fill="currentColor"/>
<text x="366.2" y="102.8" font-size="11" text-anchor="middle" stroke="none">0010</text>
<text x="386.0" y="84.0" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">2</text>
<text x="330.8" y="139.2" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">2</text>
<circle cx="373.5" cy="152.1" r="4" fill="currentColor"/>
<text x="395.6" y="147.0" font-size="11" text-anchor="middle" stroke="none">0011</text>
<text x="421.5" y="137.2" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">3</text>
<text x="349.5" y="167.1" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">3</text>
<circle cx="382.0" cy="195.0" r="4" fill="currentColor"/>
<text x="406.0" y="199.0" font-size="11" text-anchor="middle" stroke="none">0100</text>
<text x="434.0" y="200.0" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">4</text>
<text x="356.0" y="200.0" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">4</text>
<circle cx="373.5" cy="237.9" r="4" fill="currentColor"/>
<text x="395.6" y="251.0" font-size="11" text-anchor="middle" stroke="none">0101</text>
<text x="421.5" y="262.8" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">5</text>
<text x="349.5" y="232.9" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">5</text>
<circle cx="349.2" cy="274.2" r="4" fill="currentColor"/>
<text x="366.2" y="295.2" font-size="11" text-anchor="middle" stroke="none">0110</text>
<text x="386.0" y="316.0" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">6</text>
<text x="330.8" y="260.8" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">6</text>
<circle cx="312.9" cy="298.5" r="4" fill="currentColor"/>
<text x="322.0" y="324.6" font-size="11" text-anchor="middle" stroke="none">0111</text>
<text x="332.8" y="351.5" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">7</text>
<text x="302.9" y="279.5" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">7</text>
<circle cx="270.0" cy="307.0" r="4" fill="currentColor"/>
<text x="270.0" y="335.0" font-size="11" text-anchor="middle" stroke="none">1000</text>
<text x="270.0" y="364.0" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">8</text>
<text x="270.0" y="286.0" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">−8</text>
<circle cx="227.1" cy="298.5" r="4" fill="currentColor"/>
<text x="218.0" y="324.6" font-size="11" text-anchor="middle" stroke="none">1001</text>
<text x="207.2" y="351.5" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">9</text>
<text x="237.1" y="279.5" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">−7</text>
<circle cx="190.8" cy="274.2" r="4" fill="currentColor"/>
<text x="173.8" y="295.2" font-size="11" text-anchor="middle" stroke="none">1010</text>
<text x="154.0" y="316.0" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">10</text>
<text x="209.2" y="260.8" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">−6</text>
<circle cx="166.5" cy="237.9" r="4" fill="currentColor"/>
<text x="144.4" y="251.0" font-size="11" text-anchor="middle" stroke="none">1011</text>
<text x="118.5" y="262.8" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">11</text>
<text x="190.5" y="232.9" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">−5</text>
<circle cx="158.0" cy="195.0" r="4" fill="currentColor"/>
<text x="134.0" y="199.0" font-size="11" text-anchor="middle" stroke="none">1100</text>
<text x="106.0" y="200.0" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">12</text>
<text x="184.0" y="200.0" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">−4</text>
<circle cx="166.5" cy="152.1" r="4" fill="currentColor"/>
<text x="144.4" y="147.0" font-size="11" text-anchor="middle" stroke="none">1101</text>
<text x="118.5" y="137.2" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">13</text>
<text x="190.5" y="167.1" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">−3</text>
<circle cx="190.8" cy="115.8" r="4" fill="currentColor"/>
<text x="173.8" y="102.8" font-size="11" text-anchor="middle" stroke="none">1110</text>
<text x="154.0" y="84.0" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">14</text>
<text x="209.2" y="139.2" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">−2</text>
<circle cx="227.1" cy="91.5" r="4" fill="currentColor"/>
<text x="218.0" y="73.4" font-size="11" text-anchor="middle" stroke="none">1111</text>
<text x="207.2" y="48.5" font-size="14" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">15</text>
<text x="237.1" y="120.5" font-size="14" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">−1</text>
<line x1="256.9" y1="129.3" x2="245.8" y2="73.4" class="s-blue" stroke-width="3"/>
<line x1="283.1" y1="260.7" x2="294.2" y2="316.6" class="s-orange" stroke-width="3"/>
<text x="270" y="177" font-size="12" text-anchor="middle" stroke="none" class="t-blue">unsigned wraps</text>
<text x="270" y="191" font-size="12" text-anchor="middle" stroke="none" class="t-blue">at the top</text>
<text x="270" y="211" font-size="12" text-anchor="middle" stroke="none" class="t-orange">signed overflows</text>
<text x="270" y="225" font-size="12" text-anchor="middle" stroke="none" class="t-orange">at the bottom</text>
<path d="M363.5,33.1 A187,187 0 0 1 431.9,101.5" class="s-gray" stroke-width="2"/>
<path d="M431.9,101.5 L424.1,95.1 L432.4,91.4 Z" class="f-gray" stroke="none"/>
<text x="449.9" y="103.5" font-size="14" text-anchor="start" stroke="none" class="t-gray" font-weight="bold">+1</text>
<text x="8" y="22" font-size="12" text-anchor="start" stroke="none" class="t-blue" font-weight="bold">outer: unsigned</text>
<text x="8" y="38" font-size="12" text-anchor="start" stroke="none" class="t-orange" font-weight="bold">inner: signed</text>
</svg>`,
          alt: 'A circle of the sixteen 4-bit patterns 0000 to 1111. Outside each pattern is its unsigned value 0 to 15; inside is its signed two\'s complement value 0 to 7 and then -8 to -1. A blue mark between 1111 and 0000 shows where unsigned values wrap; an orange mark between 0111 and 1000 shows where signed values overflow.',
          caption: 'The 16 patterns of a 4-bit integer. Adding 1 always moves one step clockwise. Unsigned and signed interpretations share every pattern; they only disagree about where the "cliff" is.',
          maxWidth: 480,
        },
        {
          type: 'p',
          text: 'C++ makes this hardware behaviour the rule for unsigned types: unsigned arithmetic **wraps** and is fully defined. That is not just a quirk to avoid. Modular arithmetic is exactly what hash functions, checksums and random number generators want, because it keeps every bit of the input mixing into the result.',
        },
        {
          type: 'code',
          title: 'wrap.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <cstdio>
#include <string_view>

// FNV-1a: a tiny, fast hash for asset names and string IDs.
// It *relies* on unsigned multiplication wrapping modulo 2^32.
std::uint32_t fnv1a(std::string_view s) {
    std::uint32_t h = 2166136261u;           // offset basis
    for (unsigned char c : s) {
        h ^= c;
        h *= 16777619u;                      // FNV prime, wraps
    }
    return h;
}

int main() {
    std::printf("Goblin -> 0x%08X\\n", fnv1a("Goblin"));
    std::printf("goblin -> 0x%08X\\n", fnv1a("goblin"));

    std::uint8_t ammo = 0;
    --ammo;                                  // wraps, well defined
    std::printf("ammo after --0: %u\\n", ammo);
}`,
          output: `Goblin -> 0x7DE3CB9E
goblin -> 0x37D0517E
ammo after --0: 255`,
          annotations: [
            { lines: 11, text: 'The product overflows 32 bits on almost every iteration. With `std::uint32_t` that is defined: the hardware keeps the low 32 bits, and those are exactly the bits FNV-1a wants.' },
            { lines: '17-18', text: 'One changed letter scrambles the whole hash. Engines hash names like this so they can compare two IDs with one integer compare instead of a string compare.' },
            { lines: 21, text: '`ammo` is promoted to `int`, 0 − 1 gives −1, and converting −1 back to an 8-bit unsigned type is defined as "modulo 256", so the result is 255. Correct C++, and almost certainly a gameplay bug.' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Signed integers: three candidates, one winner',
      blocks: [
        {
          type: 'p',
          text: 'How do you store negative numbers in bits? Engineers tried three schemes. Here they are for 4-bit values:',
        },
        {
          type: 'table',
          headers: ['Bits', 'Sign-magnitude', 'Ones\' complement', 'Two\'s complement'],
          rows: [
            ['0111', '+7', '+7', '+7'],
            ['0001', '+1', '+1', '+1'],
            ['0000', '+0', '+0', '0'],
            ['1111', '−7', '**−0**', '−1'],
            ['1001', '−1', '−6', '−7'],
            ['1000', '**−0**', '−7', '−8'],
          ],
          caption: 'Sign-magnitude: top bit is a sign flag. Ones\' complement: negate by inverting all bits. Two\'s complement: the top bit is worth −8 instead of +8.',
        },
        {
          type: 'p',
          text: 'In [[twos-complement|two\'s complement]] the bits mean what they mean for unsigned numbers, except that the top bit has a **negative** weight: for n bits, value = −bₙ₋₁·2ⁿ⁻¹ + Σ bᵢ·2ⁱ. In 8 bits, `1111 1011` is −128 + 64 + 32 + 16 + 8 + 2 + 1 = −5. The range is −2ⁿ⁻¹ to 2ⁿ⁻¹ − 1, so there is one more negative value than positive: −128 has no positive partner in 8 bits.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why two\'s complement won',
          text: 'Look at the clock face again: two\'s complement is just the unsigned circle with the bottom half relabelled. So **the same adder circuit** adds signed and unsigned numbers, bit for bit, and subtraction is addition of the negation (`a − b = a + ~b + 1`). There is a single zero, so equality is one bit-pattern compare. Sign-magnitude needs a separate subtractor and special cases for signs; ones\' complement needs an "end-around carry" and has two zeros, so `−0 == +0` needs extra logic. Fewer special cases means fewer transistors and faster circuits.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'The last holdouts',
          text: 'Ones\' complement machines such as the CDC 6600 and the UNIVAC 1100 series lasted into the 1980s and beyond, which is why C and C++ long allowed all three representations. C++20 (proposal P0907, "Signed Integers are Two\'s Complement") finally required two\'s complement, matching every CPU you will ever program. Note what it did **not** change: signed overflow is still undefined.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Negation, step by step',
      blocks: [
        {
          type: 'p',
          text: 'To negate a two\'s complement number, **invert every bit and add 1**. Why does that work? `x + ~x` is all ones, which is −1, so `~x = −1 − x`, and therefore `~x + 1 = −x`. Step through it for +20:',
        },
        {
          type: 'algo',
          view: 'array',
          caption: 'Negating +20 in 8-bit two\'s complement. Cell 0 is the most significant bit (weight −128).',
          interval: 1300,
          frames: [
            {
              note: 'Start with +20 = 0001 0100. To negate it in two\'s complement: invert every bit, then add 1.',
              array: [0, 0, 0, 1, 0, 1, 0, 0],
              vars: [['value', '+20']],
            },
            {
              note: 'Step 1: invert every bit (`~x`). This gives the ones\' complement, 1110 1011, which is −21 in two\'s complement.',
              array: [1, 1, 1, 0, 1, 0, 1, 1],
              marks: [
                { index: 0, color: 'orange' },
                { index: 1, color: 'orange' },
                { index: 2, color: 'orange' },
                { index: 3, color: 'orange' },
                { index: 4, color: 'orange' },
                { index: 5, color: 'orange' },
                { index: 6, color: 'orange' },
                { index: 7, color: 'orange' },
              ],
              vars: [['~x', '1110 1011'], ['as signed', '-21']],
            },
            {
              note: 'Step 2: add 1. Bit 0: 1 + carry 1 = 10₂, write **0**, carry 1 onward.',
              array: [1, 1, 1, 0, 1, 0, 1, 0],
              marks: [{ index: 7, color: 'orange' }],
              pointers: [{ index: 7, label: 'carry 1', color: 'blue' }],
              vars: [['bits', '1110 1010'], ['carry out', '1']],
            },
            {
              note: 'Step 2: add 1. Bit 1: 1 + carry 1 = 10₂, write **0**, carry 1 onward.',
              array: [1, 1, 1, 0, 1, 0, 0, 0],
              marks: [{ index: 7, color: 'green' }, { index: 6, color: 'orange' }],
              pointers: [{ index: 6, label: 'carry 1', color: 'blue' }],
              vars: [['bits', '1110 1000'], ['carry out', '1']],
            },
            {
              note: 'Bit 2: 0 + carry 1 = **1**, no carry. The addition stops here; higher bits stay as they are.',
              array: [1, 1, 1, 0, 1, 1, 0, 0],
              marks: [{ index: 7, color: 'green' }, { index: 6, color: 'green' }, { index: 5, color: 'orange' }],
              pointers: [{ index: 5, label: 'carry 0', color: 'gray' }],
              vars: [['bits', '1110 1100'], ['carry out', '0']],
            },
            {
              note: 'Result 1110 1100. Check with the weights: −128 + 64 + 32 + 8 + 4 = **−20**. The top bit has weight −128, not +128.',
              array: [1, 1, 1, 0, 1, 1, 0, 0],
              marks: [
                { index: 0, color: 'purple' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'green' },
              ],
              vars: [['unsigned', '236'], ['signed', '-20'], ['hex', '0xEC']],
            },
            {
              note: 'Shortcut: copy bits from the right up to and including the first 1, then invert the rest. 0001 **0100** → 1110 **1100**.',
              array: [1, 1, 1, 0, 1, 1, 0, 0],
              marks: [
                { index: 5, color: 'teal' },
                { index: 6, color: 'teal' },
                { index: 7, color: 'teal' },
                { index: 0, color: 'orange' },
                { index: 1, color: 'orange' },
                { index: 2, color: 'orange' },
                { index: 3, color: 'orange' },
                { index: 4, color: 'orange' },
              ],
              vars: [['+20', '0001 0100'], ['−20', '1110 1100']],
            },
          ],
        },
        {
          type: 'code',
          title: 'twos.cpp',
          runnable: true,
          code: `#include <bitset>
#include <cstdint>
#include <iostream>

void show(std::int8_t v) {
    auto bits = static_cast<std::uint8_t>(v);
    std::cout << std::bitset<8>(bits) << "  unsigned " << +bits
              << "  signed " << +v << '\\n';
}

int main() {
    show(5);
    show(-5);
    show(-1);
    show(127);
    show(-128);

    std::int8_t six = 6;
    auto negated = static_cast<std::int8_t>(~six + 1);
    std::cout << "~6 + 1 = " << +negated << '\\n';
}`,
          output: `00000101  unsigned 5  signed 5
11111011  unsigned 251  signed -5
11111111  unsigned 255  signed -1
01111111  unsigned 127  signed 127
10000000  unsigned 128  signed -128
~6 + 1 = -6`,
          annotations: [
            { lines: 6, text: 'Converting a signed value to the unsigned type of the same width keeps the bit pattern; numerically it adds 2⁸ to negative values (−5 becomes 251).' },
            { lines: 7, text: 'Unary `+` promotes the 8-bit value to `int` so it prints as a number instead of a character.' },
            { lines: 14, text: '−1 is all ones in every width. That is why `~0` is a handy "all bits set" mask.' },
            { lines: 16, text: '−128 is `1000 0000`. Negating it gives `0111 1111 + 1 = 1000 0000` again: −128 is its own negation in 8 bits, the one asymmetry of two\'s complement.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'std::abs(INT_MIN) is undefined',
          text: 'Because the most negative value has no positive counterpart, `-x` and `std::abs(x)` overflow when `x == INT_MIN`. In a damage system that computes `std::abs(delta)` on untrusted input, that is a real (if rare) source of [[undefined-behavior]].',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'numeric',
      prompt: 'A `std::int8_t` holds the bit pattern `0xF3`. What value does it represent?',
      answer: -13,
      label: 'Value =',
      hint: '`0xF3` as an unsigned byte is 243. The top bit is worth −128 instead of +128.',
      explanation:
        '`0xF3` = `1111 0011`. With two\'s complement weights that is −128 + 64 + 32 + 16 + 2 + 1 = −13. A quicker route: the unsigned value is 243, and any 8-bit pattern with the top bit set is its unsigned value minus 2⁸, so 243 − 256 = −13. You can also negate it: invert to `0000 1100` (12), add 1, giving 13, so the original was −13.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'One adder, two kinds of overflow',
      blocks: [
        {
          type: 'p',
          text: 'Binary addition works like the column addition you learned in school: add the two bits and the incoming carry; write the low bit, carry the high bit into the next column. Watch 107 + 54 in 8 bits. The adder does not know or care whether you meant the numbers as signed or unsigned:',
        },
        {
          type: 'algo',
          view: 'graph',
          width: 480,
          height: 236,
          nodes: [
            { id: 'LA', x: 26.0, y: 92, label: 'a' },
            { id: 'LB', x: 26.0, y: 140, label: 'b' },
            { id: 'LS', x: 26.0, y: 198, label: 's' },
            { id: 'c0', x: 454.0, y: 40, label: ' ' },
            { id: 'a0', x: 454.0, y: 92, label: '1' },
            { id: 'b0', x: 454.0, y: 140, label: '0' },
            { id: 's0', x: 454.0, y: 198, label: ' ' },
            { id: 'c1', x: 400.5, y: 40, label: ' ' },
            { id: 'a1', x: 400.5, y: 92, label: '1' },
            { id: 'b1', x: 400.5, y: 140, label: '1' },
            { id: 's1', x: 400.5, y: 198, label: ' ' },
            { id: 'c2', x: 347.0, y: 40, label: ' ' },
            { id: 'a2', x: 347.0, y: 92, label: '0' },
            { id: 'b2', x: 347.0, y: 140, label: '1' },
            { id: 's2', x: 347.0, y: 198, label: ' ' },
            { id: 'c3', x: 293.5, y: 40, label: ' ' },
            { id: 'a3', x: 293.5, y: 92, label: '1' },
            { id: 'b3', x: 293.5, y: 140, label: '0' },
            { id: 's3', x: 293.5, y: 198, label: ' ' },
            { id: 'c4', x: 240.0, y: 40, label: ' ' },
            { id: 'a4', x: 240.0, y: 92, label: '0' },
            { id: 'b4', x: 240.0, y: 140, label: '1' },
            { id: 's4', x: 240.0, y: 198, label: ' ' },
            { id: 'c5', x: 186.5, y: 40, label: ' ' },
            { id: 'a5', x: 186.5, y: 92, label: '1' },
            { id: 'b5', x: 186.5, y: 140, label: '1' },
            { id: 's5', x: 186.5, y: 198, label: ' ' },
            { id: 'c6', x: 133.0, y: 40, label: ' ' },
            { id: 'a6', x: 133.0, y: 92, label: '1' },
            { id: 'b6', x: 133.0, y: 140, label: '0' },
            { id: 's6', x: 133.0, y: 198, label: ' ' },
            { id: 'c7', x: 79.5, y: 40, label: ' ' },
            { id: 'a7', x: 79.5, y: 92, label: '0' },
            { id: 'b7', x: 79.5, y: 140, label: '0' },
            { id: 's7', x: 79.5, y: 198, label: ' ' },
            { id: 'c8', x: 26.0, y: 40, label: ' ' },
          ],
          edges: [
            { from: 'c0', to: 'c1', directed: true },
            { from: 'c1', to: 'c2', directed: true },
            { from: 'c2', to: 'c3', directed: true },
            { from: 'c3', to: 'c4', directed: true },
            { from: 'c4', to: 'c5', directed: true },
            { from: 'c5', to: 'c6', directed: true },
            { from: 'c6', to: 'c7', directed: true },
            { from: 'c7', to: 'c8', directed: true },
          ],
          caption: 'Rows from the top: carries, a, b, sum, with bit 7 on the left and bit 0 on the right. The top-left node is the carry out of bit 7. Purple marks a carry of 1.',
          interval: 1300,
          frames: [
            {
              note: 'Add a = 107 (0110 1011) and b = 54 (0011 0110), column by column from bit 0 on the right, exactly like decimal addition.',
              nodeLabels: [{ id: 'c0', label: '0' }],
              nodeColors: [],
              vars: [['a', '0110 1011 = 107'], ['b', '0011 0110 = 54']],
            },
            {
              note: 'Bit 0: 1 + 0 + carry 0 = 1 = 01₂ → sum bit **1**, carry 0 into bit 1.',
              nodeLabels: [{ id: 'c0', label: '0' }, { id: 's0', label: '1' }, { id: 'c1', label: '0' }],
              nodeColors: [
                { id: 'a0', color: 'blue' },
                { id: 'b0', color: 'blue' },
                { id: 'c0', color: 'blue' },
                { id: 's0', color: 'orange' },
                { id: 'c1', color: 'gray' },
              ],
              edgeColors: [{ from: 'c0', to: 'c1', color: 'gray' }],
              vars: [['column', '1 + 0 + 0'], ['sum bit', '1'], ['carry out', '0']],
            },
            {
              note: 'Bit 1: 1 + 1 + carry 0 = 2 = 10₂ → sum bit **0**, carry 1 into bit 2.',
              nodeLabels: [
                { id: 'c0', label: '0' },
                { id: 's0', label: '1' },
                { id: 'c1', label: '0' },
                { id: 's1', label: '0' },
                { id: 'c2', label: '1' },
              ],
              nodeColors: [
                { id: 'a1', color: 'blue' },
                { id: 'b1', color: 'blue' },
                { id: 'c1', color: 'blue' },
                { id: 's1', color: 'orange' },
                { id: 'c2', color: 'purple' },
                { id: 's0', color: 'green' },
              ],
              edgeColors: [{ from: 'c1', to: 'c2', color: 'purple' }],
              vars: [['column', '1 + 1 + 0'], ['sum bit', '0'], ['carry out', '1']],
            },
            {
              note: 'Bit 2: 0 + 1 + carry 1 = 2 = 10₂ → sum bit **0**, carry 1 into bit 3.',
              nodeLabels: [
                { id: 'c0', label: '0' },
                { id: 's0', label: '1' },
                { id: 'c1', label: '0' },
                { id: 's1', label: '0' },
                { id: 'c2', label: '1' },
                { id: 's2', label: '0' },
                { id: 'c3', label: '1' },
              ],
              nodeColors: [
                { id: 'a2', color: 'blue' },
                { id: 'b2', color: 'blue' },
                { id: 'c2', color: 'blue' },
                { id: 's2', color: 'orange' },
                { id: 'c3', color: 'purple' },
                { id: 's0', color: 'green' },
                { id: 's1', color: 'green' },
              ],
              edgeColors: [{ from: 'c2', to: 'c3', color: 'purple' }],
              vars: [['column', '0 + 1 + 1'], ['sum bit', '0'], ['carry out', '1']],
            },
            {
              note: 'Bit 3: 1 + 0 + carry 1 = 2 = 10₂ → sum bit **0**, carry 1 into bit 4.',
              nodeLabels: [
                { id: 'c0', label: '0' },
                { id: 's0', label: '1' },
                { id: 'c1', label: '0' },
                { id: 's1', label: '0' },
                { id: 'c2', label: '1' },
                { id: 's2', label: '0' },
                { id: 'c3', label: '1' },
                { id: 's3', label: '0' },
                { id: 'c4', label: '1' },
              ],
              nodeColors: [
                { id: 'a3', color: 'blue' },
                { id: 'b3', color: 'blue' },
                { id: 'c3', color: 'blue' },
                { id: 's3', color: 'orange' },
                { id: 'c4', color: 'purple' },
                { id: 's0', color: 'green' },
                { id: 's1', color: 'green' },
                { id: 's2', color: 'green' },
              ],
              edgeColors: [{ from: 'c3', to: 'c4', color: 'purple' }],
              vars: [['column', '1 + 0 + 1'], ['sum bit', '0'], ['carry out', '1']],
            },
            {
              note: 'Bit 4: 0 + 1 + carry 1 = 2 = 10₂ → sum bit **0**, carry 1 into bit 5.',
              nodeLabels: [
                { id: 'c0', label: '0' },
                { id: 's0', label: '1' },
                { id: 'c1', label: '0' },
                { id: 's1', label: '0' },
                { id: 'c2', label: '1' },
                { id: 's2', label: '0' },
                { id: 'c3', label: '1' },
                { id: 's3', label: '0' },
                { id: 'c4', label: '1' },
                { id: 's4', label: '0' },
                { id: 'c5', label: '1' },
              ],
              nodeColors: [
                { id: 'a4', color: 'blue' },
                { id: 'b4', color: 'blue' },
                { id: 'c4', color: 'blue' },
                { id: 's4', color: 'orange' },
                { id: 'c5', color: 'purple' },
                { id: 's0', color: 'green' },
                { id: 's1', color: 'green' },
                { id: 's2', color: 'green' },
                { id: 's3', color: 'green' },
              ],
              edgeColors: [{ from: 'c4', to: 'c5', color: 'purple' }],
              vars: [['column', '0 + 1 + 1'], ['sum bit', '0'], ['carry out', '1']],
            },
            {
              note: 'Bit 5: 1 + 1 + carry 1 = 3 = 11₂ → sum bit **1**, carry 1 into bit 6.',
              nodeLabels: [
                { id: 'c0', label: '0' },
                { id: 's0', label: '1' },
                { id: 'c1', label: '0' },
                { id: 's1', label: '0' },
                { id: 'c2', label: '1' },
                { id: 's2', label: '0' },
                { id: 'c3', label: '1' },
                { id: 's3', label: '0' },
                { id: 'c4', label: '1' },
                { id: 's4', label: '0' },
                { id: 'c5', label: '1' },
                { id: 's5', label: '1' },
                { id: 'c6', label: '1' },
              ],
              nodeColors: [
                { id: 'a5', color: 'blue' },
                { id: 'b5', color: 'blue' },
                { id: 'c5', color: 'blue' },
                { id: 's5', color: 'orange' },
                { id: 'c6', color: 'purple' },
                { id: 's0', color: 'green' },
                { id: 's1', color: 'green' },
                { id: 's2', color: 'green' },
                { id: 's3', color: 'green' },
                { id: 's4', color: 'green' },
              ],
              edgeColors: [{ from: 'c5', to: 'c6', color: 'purple' }],
              vars: [['column', '1 + 1 + 1'], ['sum bit', '1'], ['carry out', '1']],
            },
            {
              note: 'Bit 6: 1 + 0 + carry 1 = 2 = 10₂ → sum bit **0**, carry 1 into bit 7.',
              nodeLabels: [
                { id: 'c0', label: '0' },
                { id: 's0', label: '1' },
                { id: 'c1', label: '0' },
                { id: 's1', label: '0' },
                { id: 'c2', label: '1' },
                { id: 's2', label: '0' },
                { id: 'c3', label: '1' },
                { id: 's3', label: '0' },
                { id: 'c4', label: '1' },
                { id: 's4', label: '0' },
                { id: 'c5', label: '1' },
                { id: 's5', label: '1' },
                { id: 'c6', label: '1' },
                { id: 's6', label: '0' },
                { id: 'c7', label: '1' },
              ],
              nodeColors: [
                { id: 'a6', color: 'blue' },
                { id: 'b6', color: 'blue' },
                { id: 'c6', color: 'blue' },
                { id: 's6', color: 'orange' },
                { id: 'c7', color: 'purple' },
                { id: 's0', color: 'green' },
                { id: 's1', color: 'green' },
                { id: 's2', color: 'green' },
                { id: 's3', color: 'green' },
                { id: 's4', color: 'green' },
                { id: 's5', color: 'green' },
              ],
              edgeColors: [{ from: 'c6', to: 'c7', color: 'purple' }],
              vars: [['column', '1 + 0 + 1'], ['sum bit', '0'], ['carry out', '1']],
            },
            {
              note: 'Bit 7: 0 + 0 + carry 1 = 1 = 01₂ → sum bit **1**, carry 0 into bit 8.',
              nodeLabels: [
                { id: 'c0', label: '0' },
                { id: 's0', label: '1' },
                { id: 'c1', label: '0' },
                { id: 's1', label: '0' },
                { id: 'c2', label: '1' },
                { id: 's2', label: '0' },
                { id: 'c3', label: '1' },
                { id: 's3', label: '0' },
                { id: 'c4', label: '1' },
                { id: 's4', label: '0' },
                { id: 'c5', label: '1' },
                { id: 's5', label: '1' },
                { id: 'c6', label: '1' },
                { id: 's6', label: '0' },
                { id: 'c7', label: '1' },
                { id: 's7', label: '1' },
                { id: 'c8', label: '0' },
              ],
              nodeColors: [
                { id: 'a7', color: 'blue' },
                { id: 'b7', color: 'blue' },
                { id: 'c7', color: 'blue' },
                { id: 's7', color: 'orange' },
                { id: 'c8', color: 'gray' },
                { id: 's0', color: 'green' },
                { id: 's1', color: 'green' },
                { id: 's2', color: 'green' },
                { id: 's3', color: 'green' },
                { id: 's4', color: 'green' },
                { id: 's5', color: 'green' },
                { id: 's6', color: 'green' },
              ],
              edgeColors: [{ from: 'c7', to: 'c8', color: 'gray' }],
              vars: [['column', '0 + 0 + 1'], ['sum bit', '1'], ['carry out', '0']],
            },
            {
              note: 'Done: 1010 0001 = **161**. No carry out of bit 7, so the unsigned result is correct (C = 0).',
              nodeLabels: [
                { id: 'c0', label: '0' },
                { id: 's0', label: '1' },
                { id: 'c1', label: '0' },
                { id: 's1', label: '0' },
                { id: 'c2', label: '1' },
                { id: 's2', label: '0' },
                { id: 'c3', label: '1' },
                { id: 's3', label: '0' },
                { id: 'c4', label: '1' },
                { id: 's4', label: '0' },
                { id: 'c5', label: '1' },
                { id: 's5', label: '1' },
                { id: 'c6', label: '1' },
                { id: 's6', label: '0' },
                { id: 'c7', label: '1' },
                { id: 's7', label: '1' },
                { id: 'c8', label: '0' },
              ],
              nodeColors: [
                { id: 's0', color: 'green' },
                { id: 's1', color: 'green' },
                { id: 's2', color: 'green' },
                { id: 's3', color: 'green' },
                { id: 's4', color: 'green' },
                { id: 's5', color: 'green' },
                { id: 's6', color: 'green' },
                { id: 's7', color: 'green' },
              ],
              vars: [['unsigned', '107 + 54 = 161 ✓'], ['C flag', '0']],
            },
            {
              note: 'As **signed** 8-bit numbers, 107 + 54 = 161 does not fit (max 127): the top bit is 1, so the result reads as −95. Carry *into* bit 7 (1) ≠ carry *out* (0): signed overflow, V = 1.',
              nodeLabels: [
                { id: 'c0', label: '0' },
                { id: 's0', label: '1' },
                { id: 'c1', label: '0' },
                { id: 's1', label: '0' },
                { id: 'c2', label: '1' },
                { id: 's2', label: '0' },
                { id: 'c3', label: '1' },
                { id: 's3', label: '0' },
                { id: 'c4', label: '1' },
                { id: 's4', label: '0' },
                { id: 'c5', label: '1' },
                { id: 's5', label: '1' },
                { id: 'c6', label: '1' },
                { id: 's6', label: '0' },
                { id: 'c7', label: '1' },
                { id: 's7', label: '1' },
                { id: 'c8', label: '0' },
              ],
              nodeColors: [{ id: 's7', color: 'red' }, { id: 'c7', color: 'purple' }, { id: 'c8', color: 'gray' }],
              edgeColors: [{ from: 'c7', to: 'c8', color: 'red' }],
              vars: [['signed', '107 + 54 → −95 ✗'], ['V flag', '1']],
            },
          ],
        },
        {
          type: 'p',
          text: 'The hardware always produces the same 8 result bits. What differs is whether they are *correct* for your interpretation, so the CPU records two separate [[cpu-flags|status flags]] after every addition (x86 calls them CF and OF; ARM calls them C and V):',
        },
        {
          type: 'list',
          items: [
            '**Carry (C)**: a 1 carried out of the top bit. The **unsigned** result did not fit.',
            '**Overflow (V)**: the carry *into* the top bit differs from the carry *out of* it. Equivalently: two operands with the same sign produced a result with the other sign. The **signed** result did not fit.',
          ],
        },
        {
          type: 'code',
          title: 'flags.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <cstdio>

struct AddResult {
    std::uint8_t sum;
    bool carry;     // unsigned overflow: carry out of bit 7
    bool overflow;  // signed overflow: sign of result is wrong
};

AddResult add8(std::uint8_t a, std::uint8_t b) {
    unsigned wide = unsigned{a} + unsigned{b};  // 9 bits fit
    auto sum = static_cast<std::uint8_t>(wide);
    bool carry = wide > 0xFF;
    // Overflow iff a and b have the same sign and sum differs.
    bool overflow = ((a ^ sum) & (b ^ sum) & 0x80) != 0;
    return {sum, carry, overflow};
}

void report(std::uint8_t a, std::uint8_t b) {
    AddResult r = add8(a, b);
    std::printf("%3u + %3u -> %3u (signed %4d + %4d -> %4d) C=%d V=%d\\n",
                a, b, r.sum, static_cast<std::int8_t>(a),
                static_cast<std::int8_t>(b),
                static_cast<std::int8_t>(r.sum), r.carry, r.overflow);
}

int main() {
    report(107, 54);    // fine unsigned, overflows signed
    report(200, 100);   // overflows unsigned, fine signed
    report(127, 1);     // the classic signed overflow
    report(255, 1);     // -1 + 1: carry out, but signed is fine
}`,
          output: `107 +  54 -> 161 (signed  107 +   54 ->  -95) C=0 V=1
200 + 100 ->  44 (signed  -56 +  100 ->   44) C=1 V=0
127 +   1 -> 128 (signed  127 +    1 -> -128) C=0 V=1
255 +   1 ->   0 (signed   -1 +    1 ->    0) C=1 V=0`,
          annotations: [
            { lines: 11, text: 'Adding in a wider type keeps the 9th bit, so the carry is simply "did the sum exceed 255?".' },
            { lines: 15, text: '`a ^ sum` has its top bit set when `a` and `sum` differ in sign; same for `b`. Both differing means the operands agreed in sign and the result does not: signed overflow.' },
            { lines: '28-29', text: 'The flags are independent: the first case is fine as unsigned but wrong as signed; the second is the reverse.' },
            { lines: 31, text: 'Adding −1 + 1 produces a carry out, yet the signed answer 0 is perfectly correct. A carry is not an error for signed numbers.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Subtraction is addition',
          text: 'CPUs compute `a − b` as `a + ~b + 1`: invert b on the way into the adder and set the adder\'s carry-in to 1. No separate subtractor exists. You will build exactly this in the ALU lesson of the Digital Logic unit.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: 'An 8-bit adder computes `0x7F + 0x01`. Which flags does it set?',
      options: [
        { text: 'C = 1, V = 1', why: 'There is no carry out of bit 7: 127 + 1 = 128 fits in 8 unsigned bits.' },
        { text: 'C = 0, V = 1', correct: true, why: 'Unsigned 127 + 1 = 128 fits (no carry). Signed, two positives produced `1000 0000` = −128: overflow.' },
        { text: 'C = 1, V = 0', why: 'That is the pattern for `0xFF + 0x01` (−1 + 1): a carry out but a correct signed result.' },
        { text: 'C = 0, V = 0', why: 'The signed interpretation is wrong: 127 + 1 cannot be −128, so the overflow flag is set.' },
      ],
      explanation:
        'Carry asks "did the unsigned result fit?" and overflow asks "did the signed result fit?". At `0x7F + 0x01` a carry flows **into** bit 7 but not **out** of it, which is precisely the signed-overflow condition. In C++ terms: for `std::uint8_t` this is fine; for `std::int8_t` arithmetic done in `int` it is fine too, but in a 32-bit `int` the same thing at `INT_MAX + 1` is undefined behavior.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Signed overflow is undefined, and the compiler cashes in',
      blocks: [
        {
          type: 'p',
          text: 'The hardware wraps signed values just as happily as unsigned ones. Yet in C++, signed [[integer-overflow]] is [[undefined-behavior]]. You saw in *Undefined Behavior and How to Avoid It* that this lets the optimizer delete overflow checks. Here is the other side of the deal: the assumption "signed arithmetic never wraps" lets the compiler treat `int` like mathematical integers and emit **faster code**.',
        },
        {
          type: 'code',
          title: 'scale.cpp',
          code: `int scaleS(int x) { return x * 2 / 2; }
unsigned scaleU(unsigned x) { return x * 2 / 2; }`,
          annotations: [
            { lines: 1, text: 'For mathematical integers, x · 2 / 2 = x. Since `int` may not overflow, the compiler may use that algebra.' },
            { lines: 2, text: 'For `unsigned`, `x * 2` is defined to wrap, so x · 2 / 2 really is "x with its top bit cleared". The compiler must preserve that.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'x86-64, g++ 13 -O2 -masm=intel',
          code: `scaleS(int):
    mov     eax, edi              ; just return x
    ret
scaleU(unsigned int):
    mov     eax, edi
    and     eax, 2147483647       ; clear bit 31
    ret`,
        },
        {
          type: 'p',
          text: 'One instruction is trivial. Loops are where it matters. Take a strided sum where the index is `int` in one version and `unsigned` in the other:',
        },
        {
          type: 'code',
          title: 'stride.cpp',
          code: `long sumS(const int* a, int n) {
    long s = 0;
    for (int i = 0; i < n; ++i) s += a[2 * i];
    return s;
}
long sumU(const int* a, unsigned n) {
    long s = 0;
    for (unsigned i = 0; i < n; ++i) s += a[2 * i];
    return s;
}`,
          annotations: [
            { lines: 3, text: 'Because `2 * i` cannot overflow, the compiler can replace the index with a pointer that advances 8 bytes per iteration (strength reduction).' },
            { lines: 8, text: 'Here `2 * i` is computed in 32-bit unsigned arithmetic and must wrap at 2³², so the compiler has to recompute the 32-bit index every iteration.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'sumS: int index (inner loop)',
            tone: 'good',
            lang: 'text',
            code: `.L12:
    movsx   rdx, DWORD PTR [rdi]
    add     rdi, 8
    add     rax, rdx
    cmp     rdi, rcx
    jne     .L12`,
            text: 'A pointer walks the array; 5 instructions per element.',
          },
          right: {
            title: 'sumU: unsigned index (inner loop)',
            tone: 'bad',
            lang: 'text',
            code: `.L17:
    lea     ecx, [rax+rax]
    add     eax, 1
    movsx   rcx, DWORD PTR [rdi+rcx*4]
    add     rdx, rcx
    cmp     esi, eax
    jne     .L17`,
            text: '`lea ecx, [rax+rax]` recomputes 2·i in a 32-bit register (so it wraps) every time; 6 instructions per element.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why keep signed overflow undefined?',
          text: 'Defining it as wrapping (as `-fwrapv` does in GCC and Clang) would forbid exactly the optimizations above in every loop that uses an `int` index, which is most loops ever written. The committee kept the performance and asked programmers to avoid the overflow instead. For game code the practical rule is: use signed types for quantities you do arithmetic on, and make sure they cannot overflow (choose `std::int64_t` for anything that accumulates, such as total XP, timestamps in ticks or currency).',
        },
        {
          type: 'p',
          text: 'When an overflow is genuinely possible, ask the hardware. GCC and Clang expose the flags through builtins (C23 standardizes the same idea as `ckd_add`), and the check compiles to an `add` followed by a jump on the overflow flag:',
        },
        {
          type: 'code',
          title: 'checked.cpp',
          runnable: true,
          code: `#include <climits>
#include <cstdio>

int main() {
    int score = INT_MAX - 5;
    int bonus = 10;
    int result;
    if (__builtin_add_overflow(score, bonus, &result)) {
        std::printf("overflow! wrapped bits would be %d\\n", result);
    } else {
        std::printf("score = %d\\n", result);
    }
}`,
          output: 'overflow! wrapped bits would be -2147483644',
          annotations: [
            { lines: 8, text: 'Computes the sum as if with infinite precision, stores the wrapped bits in `result`, and returns `true` if they differ from the true sum. No undefined behavior is involved. (MSVC has no direct equivalent; there you check `score > INT_MAX - bonus` before adding.)' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'bug',
      prompt: 'This function is meant to add a kill bonus to a 32-bit score and cap it at `INT_MAX`. In release builds the cap never triggers. Tap the line that causes it.',
      code: `#include <climits>

int addBonus(int score, int bonus) {
    if (bonus <= 0) return score;
    int newScore = score + bonus;
    if (newScore < score) {      // overflowed?
        return INT_MAX;
    }
    return newScore;
}`,
      bugLines: [5],
      hint: 'The check on line 6 can only be true if something undefined has already happened.',
      explanation:
        'Line 5 can overflow, which is undefined behavior for `int`. The optimizer reasons: "here `bonus` is positive and `score + bonus` cannot overflow, so `newScore < score` is always false", and deletes lines 6 to 8. GCC 13 and Clang 18 at `-O2` both compile this function to an add and a conditional move with no cap at all. Check **before** adding: `if (score > INT_MAX - bonus) return INT_MAX;`, or use `__builtin_add_overflow`, or do the arithmetic in `std::int64_t`.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Widening, promotion and comparisons in the machine',
      blocks: [
        {
          type: 'p',
          text: 'Registers on x86-64 are 64 bits, and the ALU works on 32- and 64-bit values. When C++ widens a narrow integer it must fill the new upper bits, and there are two ways to do that, chosen by the **source** type:',
        },
        {
          type: 'list',
          items: [
            '[[sign-extension|Sign-extension]] copies the top (sign) bit into every new bit, so −3 stays −3 (`movsx` on x86).',
            '**Zero-extension** fills the new bits with 0, so 253 stays 253 (`movzx`, or simply writing a 32-bit register, which clears the upper 32 bits on x86-64).',
          ],
        },
        {
          type: 'code',
          title: 'extend.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <cstdio>
#include <utility>

int main() {
    std::int8_t  hpDelta = -3;     // bits 1111 1101
    std::uint8_t alpha   = 0xFD;   // bits 1111 1101

    int a = hpDelta;   // sign-extend: copy bit 7 upward
    int b = alpha;     // zero-extend: fill with zeros
    std::printf("%d -> 0x%08X\\n", a, static_cast<unsigned>(a));
    std::printf("%d -> 0x%08X\\n", b, static_cast<unsigned>(b));

    int lives = -1;
    unsigned maxLives = 3;
    std::printf("as unsigned: %u\\n", static_cast<unsigned>(lives));
    std::printf("cmp_less: %d\\n", std::cmp_less(lives, maxLives));
}`,
          output: `-3 -> 0xFFFFFFFD
253 -> 0x000000FD
as unsigned: 4294967295
cmp_less: 1`,
          annotations: [
            { lines: '6-7', text: 'The same 8 bits. Their types decide how they widen.' },
            { lines: 16, text: 'This is what `lives < maxLives` would compare: the [[usual-arithmetic-conversions]] turn −1 into 4,294,967,295, so the comparison is false.' },
            { lines: 17, text: '`std::cmp_less` (C++20, `<utility>`) compares the mathematical values of mixed-signedness integers correctly.' },
          ],
        },
        {
          type: 'p',
          text: 'Comparisons show the same split at the instruction level. Both of these functions compile to a single `cmp`, which subtracts and sets the flags. What differs is **which flags** the next instruction reads:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'x86-64, g++ 13 -O2: a < b',
          code: `lessS(int, int):
    cmp     edi, esi
    setl    al          ; "less": signed, reads SF and OF
    ret
lessU(unsigned int, unsigned int):
    cmp     edi, esi
    setb    al          ; "below": unsigned, reads CF
    ret`,
          annotations: [
            { lines: 3, text: 'Signed less-than is true when the sign flag differs from the overflow flag, which correctly handles subtractions that overflow.' },
            { lines: 7, text: 'Unsigned less-than is simply "the subtraction needed a borrow", which is the carry flag.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why promote small integers to int at all?',
          text: '[[integral-promotion|Integral promotion]] mirrors the hardware: most CPUs have no fast 8- or 16-bit arithmetic path (classic RISC designs such as ARM have none at all), and doing everything in a full register avoids partial-register penalties. So C promoted `char` and `short` to `int` for arithmetic, and C++ inherited it. Truncation back to 8 bits happens only when you store the result.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'numeric',
      prompt: 'What value does `c` hold?',
      code: `std::uint8_t a = 200, b = 100;
std::uint8_t c = a + b;`,
      answer: 44,
      label: '`c` =',
      hint: 'The addition happens in `int`. Then the result is stored in 8 bits.',
      explanation:
        'Both operands are promoted to `int`, so `a + b` is the `int` 300 with no overflow at all. Storing 300 in a `std::uint8_t` keeps the low 8 bits: 300 − 256 = 44 (`0x12C` becomes `0x2C`). That final conversion is well-defined modulo 2⁸, but brace initialization (`std::uint8_t c{a + b};`) would refuse to compile because it is a narrowing conversion, which is a nice way to catch this.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Shifts: logical, arithmetic and undefined',
      blocks: [
        {
          type: 'p',
          text: 'The hardware has two right shifts. A **logical** shift (`shr` on x86) fills the vacated top bits with zeros; C++ uses it for unsigned types. An **arithmetic** shift (`sar`) copies the sign bit down, so a negative number stays negative; C++20 guarantees it for signed types. An arithmetic right shift by k divides by 2ᵏ **rounding toward minus infinity**: `-7 >> 1` is −4.',
        },
        {
          type: 'p',
          text: 'Integer division in C++, however, rounds **toward zero**: `-7 / 2` is −3. So the compiler cannot turn a signed `x / 2` into one shift. Compare the code GCC emits:',
        },
        {
          type: 'compare',
          left: {
            title: 'int x / 2',
            tone: 'neutral',
            lang: 'text',
            code: `mov     eax, edi
shr     eax, 31      ; 1 if x < 0
add     eax, edi     ; bias negatives by +1
sar     eax          ; arithmetic shift`,
            text: 'Adding 1 to negative values first turns "round down" into "round toward zero".',
          },
          right: {
            title: 'unsigned x / 2',
            tone: 'good',
            lang: 'text',
            code: `mov     eax, edi
shr     eax          ; logical shift`,
            text: 'No negatives, no correction: one shift.',
          },
        },
        {
          type: 'table',
          headers: ['Shift', 'C++20 status', 'Why'],
          rows: [
            ['Count ≥ bit width, e.g. `x << 32` on 32-bit `x`', 'Undefined', 'CPUs disagree: x86 masks the count to 5 bits (so it shifts by 0), 32-bit ARM uses the low byte (giving 0)'],
            ['Negative count', 'Undefined', 'Same hardware disagreement'],
            ['`-1 << 1`, `-7 >> 1`', 'Defined since C++20: −2, −4', 'Two\'s complement is now guaranteed'],
            ['`1 << 31` on 32-bit `int`', 'Defined since C++20: `INT_MIN`', 'Legal, but almost never what you meant'],
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Division is expensive; constants are cheap',
          text: 'A 64-bit integer `div` takes tens of cycles on many x86 cores (the exact figure varies a lot by microarchitecture; see Agner Fog\'s instruction tables), while shifts, adds and multiplies take one to a few. Compilers replace division by any **constant** with a multiply and shift, and by a power of two with the shift sequences above. Division by a run-time variable, as in `index % bucketCount`, cannot be optimized that way, which is why hash tables often use power-of-two sizes and `index & (size - 1)`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'truefalse',
      prompt: 'For every `int x`, the expressions `x / 2` and `x >> 1` give the same result.',
      answer: false,
      explanation:
        'They agree for non-negative `x` but not for negative odd values: `-7 / 2` truncates toward zero to −3, while `-7 >> 1` is an arithmetic shift that rounds toward minus infinity, giving −4. That is why the compiler adds a correction (`shr eax, 31` then `add`) before the `sar` for signed division. If you know a value is never negative, making it unsigned (or writing the shift yourself) removes those instructions.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: '<bit>: the CPU\'s bit-twiddling instructions',
      blocks: [
        {
          type: 'p',
          text: 'Modern CPUs have dedicated instructions for counting and finding bits, and C++20\'s `<bit>` header exposes them portably. They all take **unsigned** types. Game engines use them constantly: iterating over set bits in an entity or component mask, rounding buffer sizes up to a power of two, or computing log₂ for mip levels.',
        },
        {
          type: 'code',
          title: 'bits.cpp',
          runnable: true,
          code: `#include <bit>
#include <cstdint>
#include <cstdio>

int main() {
    // Bit i set = entity i in this chunk needs an update.
    std::uint64_t dirty = 0b1001'0000'0110;

    std::printf("dirty entities: %d\\n", std::popcount(dirty));
    for (std::uint64_t m = dirty; m != 0; m &= m - 1) {
        std::printf("update entity %d\\n", std::countr_zero(m));
    }

    unsigned requested = 600;  // particles
    std::printf("bit_ceil(%u)  = %u\\n", requested,
                std::bit_ceil(requested));
    std::printf("bit_floor(%u) = %u\\n", requested,
                std::bit_floor(requested));
    std::printf("bit_width(%u) = %d\\n", requested,
                std::bit_width(requested));
    std::printf("countl_zero   = %d\\n", std::countl_zero(requested));
    std::printf("single bit?     %d %d\\n", std::has_single_bit(512u),
                std::has_single_bit(600u));
    std::printf("rotl(0x80000001, 4) = 0x%08X\\n",
                std::rotl(0x80000001u, 4));
}`,
          output: `dirty entities: 4
update entity 1
update entity 2
update entity 8
update entity 11
bit_ceil(600)  = 1024
bit_floor(600) = 512
bit_width(600) = 10
countl_zero   = 22
single bit?     1 0
rotl(0x80000001, 4) = 0x00000018`,
          annotations: [
            { lines: 9, text: '`std::popcount` counts the 1 bits.' },
            { lines: 10, text: '`m & (m - 1)` clears the lowest set bit: subtracting 1 turns the lowest 1 into 0 and the zeros below it into 1s, and the AND removes them all. The loop runs once per set bit, not once per bit position.' },
            { lines: 11, text: '`std::countr_zero` counts trailing zeros, which is the index of the lowest set bit.' },
            { lines: '15-18', text: 'Round up or down to a power of two, for example to size a ring buffer so wrapping is a mask instead of a division.' },
            { lines: 20, text: '`bit_width` is ⌊log₂ x⌋ + 1: 600 needs 10 bits. `countl_zero` counts leading zeros: 32 − 10 = 22.' },
            { lines: 24, text: 'A rotate moves bits that fall off one end back in at the other. Hash functions and random number generators use it.' },
          ],
        },
        {
          type: 'p',
          text: 'Whether these become single instructions depends on which CPU you tell the compiler to target. The default x86-64 baseline dates from 2003 and has no `popcnt`:',
        },
        {
          type: 'compare',
          left: {
            title: 'g++ -O2 (baseline x86-64)',
            tone: 'bad',
            lang: 'text',
            code: `count(unsigned long):
    sub     rsp, 8
    call    __popcountdi2   ; library loop
    add     rsp, 8
    ret`,
          },
          right: {
            title: 'g++ -O2 -march=x86-64-v3',
            tone: 'good',
            lang: 'text',
            code: `count(unsigned long):
    xor     eax, eax
    popcnt  rax, rdi        ; one instruction
    ret`,
          },
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Know your target CPU',
          text: 'Console builds target one known CPU: the PS5 and Xbox Series X|S both use AMD Zen 2 cores, which support `popcnt`, `lzcnt`, `tzcnt`, BMI and AVX2, so console builds can rely on them. PC games must choose a minimum (`-march=x86-64-v2` or `-v3`, or MSVC\'s `/arch:AVX2`) and decide what to do on older machines.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'fill',
      prompt: 'Complete the loop that visits the index of every set bit in `mask`, lowest first, doing one iteration per set bit.',
      template: `for (std::uint64_t m = mask; m != 0; m &= m ___ 1) {
    visit(std::___(m));
}`,
      blanks: [{ answers: ['-'] }, { answers: ['countr_zero'] }],
      wordBank: ['-', '+', 'countr_zero', 'countl_zero', 'popcount', 'bit_ceil'],
      explanation:
        '`m & (m - 1)` clears the lowest set bit, because subtracting 1 flips that bit and every zero below it. `std::countr_zero(m)` is the number of zeros below the lowest set bit, which is exactly its index. `countl_zero` would count from the top instead, and `popcount` would give the number of remaining bits, not a position. On x86-64 with BMI enabled the loop body becomes `tzcnt` and `blsr`, one instruction each.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'concept',
      title: 'Saturating arithmetic: clamp instead of wrap',
      blocks: [
        {
          type: 'p',
          text: 'Wrapping is right for hashes and wrong for almost everything a player can see. Brighten a nearly white pixel and it wraps to black; mix two loud audio samples and the sum wraps to a loud negative spike, an audible click. **[[saturating-arithmetic|Saturating arithmetic]]** clamps to the largest or smallest representable value instead.',
        },
        {
          type: 'code',
          title: 'saturate.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <cstdio>
#include <emmintrin.h>  // SSE2: always available on x86-64
#include <limits>

std::uint8_t addSatU8(std::uint8_t a, std::uint8_t b) {
    unsigned s = unsigned{a} + b;
    return s > 255 ? 255 : static_cast<std::uint8_t>(s);
}

std::int16_t addSatI16(std::int16_t a, std::int16_t b) {
    int s = int{a} + b;  // cannot overflow in int
    if (s > std::numeric_limits<std::int16_t>::max()) return 32767;
    if (s < std::numeric_limits<std::int16_t>::min()) return -32768;
    return static_cast<std::int16_t>(s);
}

int main() {
    std::printf("%u %d %d\\n", addSatU8(200, 100),
                addSatI16(30000, 10000), addSatI16(-30000, -10000));

    // 16 pixel channels brightened in one SSE2 instruction.
    alignas(16) std::uint8_t px[16], out[16];
    for (int i = 0; i < 16; ++i) px[i] = static_cast<std::uint8_t>(i * 16);
    __m128i v = _mm_load_si128(reinterpret_cast<const __m128i*>(px));
    __m128i r = _mm_adds_epu8(v, _mm_set1_epi8(100));
    _mm_store_si128(reinterpret_cast<__m128i*>(out), r);
    for (int i = 0; i < 16; ++i) std::printf("%u%c", out[i], i < 15 ? ' ' : '\\n');
}`,
          output: `255 32767 -32768
100 116 132 148 164 180 196 212 228 244 255 255 255 255 255 255`,
          annotations: [
            { lines: 7, text: 'Compute in a wider type where the true sum fits, then clamp. Compilers turn the comparison into a branchless `cmov`.' },
            { lines: 12, text: 'Two `int16_t` values always sum to something that fits in a 32-bit `int`, so no undefined behavior is possible.' },
            { lines: 26, text: '`_mm_adds_epu8` (SSE2 instruction `paddusb`) adds 16 unsigned bytes with saturation in one instruction. Pixels at 160 and above stop at 255 instead of wrapping.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why SIMD instruction sets have saturation built in',
          text: 'SIMD units were designed for media: pixels, audio and video codecs, where saturation is the correct behaviour and wrapping is a visible or audible bug. Doing the clamp with compares and blends would cost several extra instructions per element, so x86 (SSE2 `paddusb`, `paddsw`), ARM NEON (`uqadd`, `sqadd`) and GPU shader hardware all saturate natively. C++26 adds scalar `std::add_sat`, `std::sub_sat` and friends to `<numeric>`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'numeric',
      prompt: 'An audio mixer adds two 16-bit samples, 25000 and 15000, using plain wrapping 16-bit arithmetic (as `_mm_add_epi16` does). What sample value comes out?',
      answer: -25536,
      label: 'Sample =',
      hint: 'The true sum is 40000. The int16 range is −32768 to 32767, a span of 65536.',
      explanation:
        'The true sum 40000 is above 32767, so it wraps around the clock face: 40000 − 65536 = −25536. A smooth loud waveform suddenly jumps from near +32767 to a large negative value, which you hear as a harsh click. A saturating add (`_mm_adds_epi16`, `paddsw`) would output 32767 instead: still clipped, but far less audible.',
    },
  ],
  takeaways: [
    'An n-bit unsigned value is arithmetic modulo 2ⁿ: the adder just drops the carry out of the top bit.',
    'Two\'s complement gives the top bit a weight of −2ⁿ⁻¹, so signed and unsigned addition share one circuit; negate with `~x + 1`. The range is asymmetric, so `-INT_MIN` overflows.',
    'The CPU flags unsigned overflow with **carry** and signed overflow with **overflow** (carry into the top bit ≠ carry out); signed and unsigned comparisons read different flags.',
    'Signed overflow is undefined in C++ so that compilers can treat `int` like mathematical integers; real output shows simpler code for `int` loop indices than for `unsigned` ones. Check overflow before it happens or with `__builtin_add_overflow`.',
    'Widening sign-extends signed sources and zero-extends unsigned ones; signed `x / 2` needs a fix-up because `>>` rounds toward minus infinity.',
    '`<bit>` functions map to single instructions (`popcnt`, `tzcnt`, `lzcnt`) when you target a CPU that has them; saturating arithmetic clamps instead of wrapping and is built into SIMD hardware.',
  ],
  reading: [
    { title: 'Bit manipulation library (<bit>)', url: 'https://en.cppreference.com/w/cpp/header/bit', source: 'cppreference', note: 'Every function in <bit>, with the unsigned-only constraints spelled out.' },
    { title: 'Arithmetic operators: overflows and shifts', url: 'https://en.cppreference.com/w/cpp/language/operator_arithmetic', source: 'cppreference', note: 'The exact rules for promotions, conversions, overflow and shift edge cases.' },
    { title: 'Agner Fog\'s optimization resources', url: 'https://www.agner.org/optimize/', source: 'article', note: 'The instruction tables give measured latencies for div, popcnt and friends on each microarchitecture.' },
    { title: 'Two\'s complement', url: 'https://en.wikipedia.org/wiki/Two%27s_complement', source: 'article', note: 'More proofs and history, including why the asymmetric range is unavoidable.' },
    { title: 'Compiler Explorer', url: 'https://godbolt.org/', source: 'other', note: 'Paste the sumS/sumU loops and compare -O2 output across GCC, Clang and MSVC yourself.' },
  ],
};
