import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-bits-bytes',
  title: 'Bits, Bytes, Hex and Endianness',
  summary: 'Why computers use binary, how to read hex at a glance, how memory is laid out byte by byte, and how to reinterpret bits safely in C++.',
  minutes: 18,
  objectives: [
    'Explain why hardware stores information as two voltage levels rather than ten',
    'Convert between decimal, binary and hexadecimal quickly, and read packed fields out of a hex value',
    'Describe memory as an array of addressable bytes and predict how a multi-byte value is laid out in little- and big-endian order',
    'Write endian-independent serialization code with shifts and `std::byte`',
    'Reinterpret the bits of an object with `std::bit_cast` or `std::memcpy` instead of undefined pointer casts',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Everything is bits',
      blocks: [
        {
          type: 'p',
          text: 'Every value your game touches, from a player\'s health to a texture, a sound sample or the machine instructions of `main`, is stored and moved as **bits**. Physically, a bit is a voltage on a wire or the charge stored in a tiny capacitor or transistor. The hardware never sees "42" or "Goblin". It sees high and low voltages.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 222" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<rect x="120" y="20" width="385" height="58" rx="2" class="f-green" fill-opacity="0.14" stroke="none"/>
<rect x="120" y="20" width="385" height="58" rx="2" class="s-green" stroke-width="1"/>
<rect x="120" y="78" width="385" height="50" rx="0" class="f-gray" fill-opacity="0.12" stroke="none"/>
<rect x="120" y="78" width="385" height="50" rx="0" class="s-gray" stroke-width="1" stroke-dasharray="4 4"/>
<rect x="120" y="128" width="385" height="58" rx="2" class="f-blue" fill-opacity="0.14" stroke="none"/>
<rect x="120" y="128" width="385" height="58" rx="2" class="s-blue" stroke-width="1"/>
<text x="112" y="32" font-size="12" text-anchor="end" stroke="none">VDD ≈ 1 V</text>
<text x="112" y="186" font-size="12" text-anchor="end" stroke="none">0 V</text>
<text x="112" y="54" font-size="13" text-anchor="end" stroke="none" class="t-green" font-weight="bold">read as 1</text>
<text x="112" y="107" font-size="13" text-anchor="end" stroke="none" class="t-gray">forbidden</text>
<text x="112" y="160" font-size="13" text-anchor="end" stroke="none" class="t-blue" font-weight="bold">read as 0</text>
<polyline points="130.0,158.8 135.1,155.7 140.1,164.7 145.2,154.3 150.3,162.6 155.3,159.6 160.4,154.0 165.5,162.1 170.6,153.7 175.6,160.8 180.7,154.3 185.8,154.6 190.8,160.6 190.8,49.9 195.9,37.2 201.0,39.0 206.0,46.3 211.1,52.1 216.2,45.4 221.2,42.1 226.3,52.6 231.4,35.8 236.5,50.5 241.5,40.2 246.6,37.6 251.7,37.1 251.7,40.6 256.7,49.7 261.8,38.3 266.9,45.5 271.9,46.5 277.0,41.7 282.1,44.9 287.2,36.1 292.2,36.1 297.3,38.7 302.4,47.2 307.4,42.7 312.5,40.7 312.5,163.5 317.6,161.2 322.6,158.4 327.7,167.3 332.8,165.6 337.8,157.4 342.9,163.3 348.0,162.5 353.1,168.8 358.1,166.1 363.2,158.2 368.3,170.6 373.3,155.1 373.3,42.5 378.4,48.6 383.5,37.7 388.5,43.8 393.6,35.7 398.7,47.0 403.8,48.8 408.8,45.3 413.9,50.8 419.0,40.6 424.0,47.5 429.1,45.7 434.2,45.4 434.2,161.2 439.2,168.1 444.3,170.0 449.4,161.5 454.4,165.0 459.5,154.1 464.6,165.6 469.7,164.6 474.7,170.9 479.8,167.8 484.9,158.1 489.9,159.9 495.0,165.0" class="s-orange" stroke-width="2.2"/>
<text x="160.4" y="210" font-size="15" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">0</text>
<text x="221.2" y="210" font-size="15" text-anchor="middle" stroke="none" class="t-green" font-weight="bold">1</text>
<text x="282.1" y="210" font-size="15" text-anchor="middle" stroke="none" class="t-green" font-weight="bold">1</text>
<text x="342.9" y="210" font-size="15" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">0</text>
<text x="403.8" y="210" font-size="15" text-anchor="middle" stroke="none" class="t-green" font-weight="bold">1</text>
<text x="464.6" y="210" font-size="15" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">0</text>
<text x="60" y="210" font-size="13" text-anchor="middle" stroke="none">bits:</text>
</svg>`,
          alt: 'A noisy voltage signal that stays inside a high band read as 1 or a low band read as 0, with a forbidden band between them. The bits read are 0 1 1 0 1 0.',
          caption: 'A receiver only needs to decide "high or low". Noise that wiggles the voltage inside a band changes nothing, which makes binary signals extremely robust.',
          maxWidth: 520,
        },
        {
          type: 'p',
          text: 'Why only two levels? A modern CPU core runs at roughly 1 volt. If you tried to squeeze ten decimal digits into that range, neighbouring levels would sit only 0.1 V apart, and ordinary electrical noise, temperature drift and tiny manufacturing differences between transistors would turn a 7 into a 6. With two levels you get a huge safety margin, and a transistor used as a switch is naturally either fully on or fully off.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Decimal computers existed',
          text: 'ENIAC (1945) stored decimal digits in ring counters of vacuum tubes. That same year, John von Neumann\'s *First Draft of a Report on the EDVAC* argued for binary: simpler circuits, more reliable storage, and arithmetic that maps directly onto logic. Almost every computer since has followed that advice.',
        },
        {
          type: 'p',
          text: 'Bits on their own carry no meaning. The **same four bytes** can be text, an integer or a float. What decides the meaning is the instruction that uses them, and in C++ the [[type]] decides which instructions the [[compiler]] emits.',
        },
        {
          type: 'code',
          title: 'same_bits.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <cstring>
#include <iostream>
#include <string_view>

int main() {
    const char text[4] = {'G', 'A', 'M', 'E'};

    std::uint32_t asInt;
    float asFloat;
    std::memcpy(&asInt, text, 4);
    std::memcpy(&asFloat, text, 4);

    std::cout << "as text:  " << std::string_view(text, 4) << '\\n';
    std::cout << "as hex:   0x" << std::hex << asInt << '\\n';
    std::cout << "as int:   " << std::dec << asInt << '\\n';
    std::cout << "as float: " << asFloat << '\\n';
}`,
          output: `as text:  GAME
as hex:   0x454d4147
as int:   1162690887
as float: 3284.08`,
          annotations: [
            { lines: 7, text: 'Four bytes holding the [[ascii]] codes 0x47, 0x41, 0x4D, 0x45.' },
            { lines: '11-12', text: '`std::memcpy` copies the raw bytes into an integer and a float. Nothing is converted: both objects now hold exactly the same 32 bits.' },
            { lines: 15, text: 'The hex value looks "backwards" (`45 4d 41 47` instead of `47 41 4d 45`). That is endianness, explained later in this lesson.' },
            { lines: 17, text: 'Read as an IEEE 754 float, the same bits mean about 3284.08. The floating-point lesson shows how to decode them by hand.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why types matter to the hardware',
          text: 'The CPU has separate instructions for integer and floating-point arithmetic. On x86-64, adding two `int`s compiles to `add`, while adding two `float`s compiles to `addss`, which runs in a different execution unit with different registers. Giving the same bits to the wrong instruction does not crash. It silently computes nonsense. A type is your promise to the compiler about which instructions are correct for those bits.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Binary and hexadecimal fluency',
      blocks: [
        {
          type: 'p',
          text: 'Binary is positional notation with base 2: each digit is worth twice the one to its right. So `1011 0111` is 128 + 32 + 16 + 4 + 2 + 1 = 183. To go the other way, divide by 2 repeatedly: each remainder is the next bit, starting from the lowest one.',
        },
        {
          type: 'algo',
          view: 'array',
          caption: 'Repeated division by 2. The cell numbers under the boxes count from the left; the pointer names the bit position, which counts from the right.',
          code: `while (n > 0) {
    int bit = n % 2;   // next bit
    n = n / 2;
    // write bit, moving left
}
// read the bits from the left`,
          interval: 1100,
          frames: [
            {
              note: 'Convert 183 to binary. Each division by 2 produces the next bit, **starting from bit 0** (the rightmost cell).',
              array: ['·', '·', '·', '·', '·', '·', '·', '·'],
              vars: [['n', '183']],
              lines: [1],
            },
            {
              note: '183 ÷ 2 = 91 remainder **1**, so bit 0 is 1.',
              array: ['·', '·', '·', '·', '·', '·', '·', 1],
              marks: [{ index: 7, color: 'orange' }],
              pointers: [{ index: 7, label: 'bit 0' }],
              vars: [['n', '183'], ['n / 2', '91'], ['n % 2', '1']],
              lines: [2, 3, 4],
            },
            {
              note: '91 ÷ 2 = 45 remainder **1**, so bit 1 is 1.',
              array: ['·', '·', '·', '·', '·', '·', 1, 1],
              marks: [{ index: 6, color: 'orange' }, { index: 7, color: 'green' }],
              pointers: [{ index: 6, label: 'bit 1' }],
              vars: [['n', '91'], ['n / 2', '45'], ['n % 2', '1']],
              lines: [2, 3, 4],
            },
            {
              note: '45 ÷ 2 = 22 remainder **1**, so bit 2 is 1.',
              array: ['·', '·', '·', '·', '·', 1, 1, 1],
              marks: [{ index: 5, color: 'orange' }, { index: 7, color: 'green' }, { index: 6, color: 'green' }],
              pointers: [{ index: 5, label: 'bit 2' }],
              vars: [['n', '45'], ['n / 2', '22'], ['n % 2', '1']],
              lines: [2, 3, 4],
            },
            {
              note: '22 ÷ 2 = 11 remainder **0**, so bit 3 is 0.',
              array: ['·', '·', '·', '·', 0, 1, 1, 1],
              marks: [
                { index: 4, color: 'orange' },
                { index: 7, color: 'green' },
                { index: 6, color: 'green' },
                { index: 5, color: 'green' },
              ],
              pointers: [{ index: 4, label: 'bit 3' }],
              vars: [['n', '22'], ['n / 2', '11'], ['n % 2', '0']],
              lines: [2, 3, 4],
            },
            {
              note: '11 ÷ 2 = 5 remainder **1**, so bit 4 is 1.',
              array: ['·', '·', '·', 1, 0, 1, 1, 1],
              marks: [
                { index: 3, color: 'orange' },
                { index: 7, color: 'green' },
                { index: 6, color: 'green' },
                { index: 5, color: 'green' },
                { index: 4, color: 'green' },
              ],
              pointers: [{ index: 3, label: 'bit 4' }],
              vars: [['n', '11'], ['n / 2', '5'], ['n % 2', '1']],
              lines: [2, 3, 4],
            },
            {
              note: '5 ÷ 2 = 2 remainder **1**, so bit 5 is 1.',
              array: ['·', '·', 1, 1, 0, 1, 1, 1],
              marks: [
                { index: 2, color: 'orange' },
                { index: 7, color: 'green' },
                { index: 6, color: 'green' },
                { index: 5, color: 'green' },
                { index: 4, color: 'green' },
                { index: 3, color: 'green' },
              ],
              pointers: [{ index: 2, label: 'bit 5' }],
              vars: [['n', '5'], ['n / 2', '2'], ['n % 2', '1']],
              lines: [2, 3, 4],
            },
            {
              note: '2 ÷ 2 = 1 remainder **0**, so bit 6 is 0.',
              array: ['·', 0, 1, 1, 0, 1, 1, 1],
              marks: [
                { index: 1, color: 'orange' },
                { index: 7, color: 'green' },
                { index: 6, color: 'green' },
                { index: 5, color: 'green' },
                { index: 4, color: 'green' },
                { index: 3, color: 'green' },
                { index: 2, color: 'green' },
              ],
              pointers: [{ index: 1, label: 'bit 6' }],
              vars: [['n', '2'], ['n / 2', '1'], ['n % 2', '0']],
              lines: [2, 3, 4],
            },
            {
              note: '1 ÷ 2 = 0 remainder **1**, so bit 7 is 1.',
              array: [1, 0, 1, 1, 0, 1, 1, 1],
              marks: [
                { index: 0, color: 'orange' },
                { index: 7, color: 'green' },
                { index: 6, color: 'green' },
                { index: 5, color: 'green' },
                { index: 4, color: 'green' },
                { index: 3, color: 'green' },
                { index: 2, color: 'green' },
                { index: 1, color: 'green' },
              ],
              pointers: [{ index: 0, label: 'bit 7' }],
              vars: [['n', '1'], ['n / 2', '0'], ['n % 2', '1']],
              lines: [2, 3, 4],
            },
            {
              note: 'n reached 0. Read the cells left to right: **1011 0111** = 128 + 32 + 16 + 4 + 2 + 1 = 183 = `0xB7`.',
              array: [1, 0, 1, 1, 0, 1, 1, 1],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'green' },
                { index: 6, color: 'green' },
                { index: 7, color: 'green' },
              ],
              vars: [['binary', '1011 0111'], ['hex', '0xB7']],
              lines: [6],
            },
          ],
        },
        {
          type: 'p',
          text: 'Long binary strings are hard to read, so programmers use **hexadecimal** (base 16). Its trick is that one hex digit is exactly 4 bits (a *nibble*), so converting is a table lookup per digit, with no arithmetic. `1011 0111` splits into `1011` = B and `0111` = 7, giving `0xB7`.',
        },
        {
          type: 'table',
          headers: ['Hex', 'Binary', 'Hex', 'Binary'],
          rows: [
            ['0', '0000', '8', '1000'],
            ['1', '0001', '9', '1001'],
            ['2', '0010', 'A (10)', '1010'],
            ['3', '0011', 'B (11)', '1011'],
            ['4', '0100', 'C (12)', '1100'],
            ['5', '0101', 'D (13)', '1101'],
            ['6', '0110', 'E (14)', '1110'],
            ['7', '0111', 'F (15)', '1111'],
          ],
        },
        {
          type: 'code',
          title: 'bases.cpp',
          runnable: true,
          code: `#include <format>
#include <iostream>

int main() {
    unsigned flags = 183;
    std::cout << std::format("dec {}\\n", flags);
    std::cout << std::format("hex {:#x}\\n", flags);
    std::cout << std::format("oct {:#o}\\n", flags);
    std::cout << std::format("bin {:#010b}\\n", flags);

    unsigned color = 0xFF8C00;          // dark orange, 0xRRGGBB
    unsigned red   = (color >> 16) & 0xFF;
    unsigned green = (color >> 8) & 0xFF;
    unsigned blue  = color & 0xFF;
    std::cout << std::format("r={} g={} b={}\\n", red, green, blue);
}`,
          output: `dec 183
hex 0xb7
oct 0267
bin 0b10110111
r=255 g=140 b=0`,
          annotations: [
            { lines: '7-9', text: '`std::format` (C++20) prints any base. `#` adds the prefix; `010b` pads the binary to 10 characters including `0b`.' },
            { lines: 11, text: 'Hex shines for packed data: each pair of hex digits is one byte, so you can read the red, green and blue channels straight off the literal.' },
            { lines: '12-14', text: 'Shift the wanted byte down to the bottom, then mask off everything else with `0xFF` (eight 1 bits).' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Powers of two worth memorizing',
          text: '2⁸ = 256 values in a byte. 2¹⁰ = 1,024 (one **Ki**), 2²⁰ ≈ 1.05 million (**Mi**), 2³⁰ ≈ 1.07 billion (**Gi**), 2³² ≈ 4.29 billion values in a 32-bit integer. Hardware sizes are powers of two, so a "16 GiB" console has 16 × 2³⁰ bytes, about 7% more than 16 billion. C++14 digit separators help you write long literals: `0b1011\'0111`, `0xFF\'8C\'00`.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The octal trap',
          text: 'In C++ a literal that starts with `0` is **octal** (base 8, 3 bits per digit): `int level = 010;` stores 8, not 10. Octal survives mainly in Unix file permissions such as `0755`. Never pad decimal literals with leading zeros.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'numeric',
      prompt: 'What is `0b1101\'0110` in hexadecimal? (Any base is accepted; type it as hex, for example `0x2F`.)',
      answer: '0xD6',
      alsoAccept: [214],
      label: 'Value =',
      hint: 'Split it into two nibbles and look each one up: `1101` and `0110`.',
      explanation:
        '`1101` = 8 + 4 + 1 = 13 = D and `0110` = 4 + 2 = 6, so the byte is `0xD6` (214 in decimal). Because 16 = 2⁴, every hex digit maps to exactly four bits, so you never need to convert through decimal. That is the whole reason programmers use hex for memory dumps, colors, flags and addresses.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Bytes, words and the size of things',
      blocks: [
        {
          type: 'definition',
          term: 'Byte',
          text: 'The smallest **addressable** unit of memory: every byte has its own address. C++ calls its size `CHAR_BIT`; the standard only requires at least 8, and on every platform you will ship games on it is exactly 8.',
        },
        {
          type: 'p',
          text: 'A [[machine-word|word]] is the natural size the CPU computes with: the width of its general-purpose registers and of a pointer. On x86-64 and ARM64 that is 64 bits. A CPU can still load and operate on 8-, 16- and 32-bit pieces, but 64 bits is what one register holds and what one address is.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: '"Word" means different things',
          text: 'In x86 assembly and the Windows API, a `WORD` is 16 bits (inherited from the 1978 Intel 8086), a `DWORD` ("double word") is 32 bits and a `QWORD` is 64 bits. On ARM, a word is 32 bits. When you read `DWORD PTR [rdi]` in disassembly later in this course, it means "the 32-bit value at address `rdi`".',
        },
        {
          type: 'p',
          text: 'C++ deliberately leaves most type sizes to the platform. The two data models you will meet on 64-bit desktops and consoles differ in exactly one place:',
        },
        {
          type: 'table',
          headers: ['Type', 'Linux, macOS, Android (LP64)', 'Windows x64 (LLP64)'],
          rows: [
            ['`char`', '1', '1'],
            ['`short`', '2', '2'],
            ['`int`', '4', '4'],
            ['`long`', '**8**', '**4**'],
            ['`long long`', '8', '8'],
            ['pointer, `std::size_t`', '8', '8'],
            ['`float` / `double`', '4 / 8', '4 / 8'],
          ],
          caption: 'Sizes in bytes. LP64 means "longs and pointers are 64-bit"; LLP64 means "long longs and pointers are 64-bit".',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why Windows kept a 32-bit long',
          text: 'When Microsoft moved to 64-bit, huge amounts of Win32 code stored `long` in file formats, network structures and API structs. Keeping `long` at 4 bytes meant that code kept the same binary layout; only pointers grew. Unix vendors made the opposite trade-off years earlier. Neither is wrong, which is exactly why portable code says what it means with [[fixed-width-integer|fixed-width types]] such as `std::int32_t` and `std::uint64_t`.',
        },
        {
          type: 'p',
          text: 'With n bits you can represent 2ⁿ different patterns. That simple fact sets every limit in this unit: 256 values in a byte, about 4.29 billion in 32 bits, about 1.8 × 10¹⁹ in 64 bits. A 64-bit pointer could in principle address 16 EiB, but current x86-64 CPUs implement 48-bit virtual addresses (256 TiB), or 57 bits on CPUs with 5-level paging. You will see why in the address-translation lesson.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Why Unreal spells out int32 and uint8',
          text: 'Unreal Engine ships on Windows, consoles, Linux, macOS, Android and iOS, so its coding standard uses sized aliases (`int32`, `uint8`, `int64`) everywhere instead of `int` or `long`. A replicated or serialized `int32` is guaranteed to be four bytes on every platform.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'mcq',
      prompt: 'A save-game struct stores the player\'s gold as a `long`. The game writes the struct\'s raw bytes to disk on Linux and the Windows build reads the file back the same way. What happens?',
      options: [
        { text: 'It works: both are 64-bit operating systems, so `long` is 8 bytes on both', why: 'The operating system being 64-bit says nothing about `long`. Windows x64 uses the LLP64 model, where `long` stays 4 bytes.' },
        { text: 'The layout differs: `long` is 8 bytes on Linux but 4 on Windows, so the Windows build reads the wrong bytes', correct: true, why: 'Exactly. The gold field and everything after it shift, so Windows reads garbage. Use `std::int64_t` (or `std::int32_t`) for anything stored or sent over a network.' },
        { text: 'It fails to compile on Windows', why: 'Both compilers accept the code; the bug only shows up at run time when the bytes are reinterpreted.' },
        { text: 'It works because `sizeof(long)` is always equal to `sizeof(void*)`', why: 'That holds on LP64 systems, not on Windows x64, where pointers are 8 bytes but `long` is 4.' },
      ],
      explanation:
        'Binary file formats and network messages are contracts about bytes, not about C++ types. `long` has different sizes on LP64 (Linux, macOS, Android) and LLP64 (Windows) systems, so any format built on it breaks across platforms. Fixed-width types such as `std::int64_t` pin the size; later in this lesson you will also pin the byte order.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Memory is an array of bytes',
      blocks: [
        {
          type: 'p',
          text: 'From a program\'s point of view, memory is one enormous array of bytes. A [[memory-address]] is simply an index into that array. An object larger than one byte occupies **consecutive** addresses, and its address (what `&` gives you) is the lowest one. A [[pointer]] is that index stored in a variable, which is why `p + 1` on an `int*` adds `sizeof(int)` bytes.',
        },
        {
          type: 'p',
          text: 'You are allowed to look at the raw bytes of any object through a `unsigned char*`, `char*` or `std::byte*`. Let us put the 32-bit value `0x12345678` in memory and print its bytes in address order:',
        },
        {
          type: 'code',
          title: 'dump_bytes.cpp',
          runnable: true,
          code: `#include <bit>
#include <cstddef>
#include <cstdint>
#include <cstdio>

int main() {
    std::uint32_t value = 0x12345678;
    const auto* bytes = reinterpret_cast<const std::byte*>(&value);

    for (int i = 0; i < 4; ++i) {
        std::printf("address +%d: %02X\\n", i,
                    std::to_integer<unsigned>(bytes[i]));
    }
    if constexpr (std::endian::native == std::endian::little) {
        std::printf("this machine is little-endian\\n");
    } else {
        std::printf("this machine is big-endian\\n");
    }
}`,
          output: `address +0: 78
address +1: 56
address +2: 34
address +3: 12
this machine is little-endian`,
          annotations: [
            { lines: 8, text: 'Viewing an object as bytes is the one pointer cast the aliasing rules explicitly allow: `char`, `unsigned char` and `std::byte` may alias anything.' },
            { lines: '10-13', text: 'Print the byte at each address, from lowest to highest. `std::to_integer` turns a `std::byte` into a number.' },
            { lines: 14, text: '`std::endian` (C++20, in `<bit>`) tells you the byte order at compile time, so `if constexpr` discards the other branch entirely.' },
          ],
        },
        {
          type: 'memory',
          caption: 'The same value as the program sees it: the lowest address holds the least significant byte. (Addresses are illustrative.)',
          regions: [
            {
              label: 'Stack — main(): value = 0x12345678',
              kind: 'stack',
              cells: [
                { name: 'byte 0', value: '0x78', address: '0x1000', type: 'least significant', highlight: true },
                { name: 'byte 1', value: '0x56', address: '0x1001' },
                { name: 'byte 2', value: '0x34', address: '0x1002' },
                { name: 'byte 3', value: '0x12', address: '0x1003', type: 'most significant' },
              ],
            },
          ],
        },
        {
          type: 'p',
          text: 'On an x86-64 PC the **least** significant byte, `0x78`, sits at the lowest address. That surprises almost everyone the first time, and it is the subject of the next card.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Endianness: which byte comes first?',
      blocks: [
        {
          type: 'p',
          text: '[[endianness|Endianness]] is the order in which a multi-byte value\'s bytes are stored at increasing addresses. **Big-endian** stores the most significant byte first, the way you write numbers on paper. **Little-endian** stores the least significant byte first.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 540 232" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<text x="260" y="22" font-size="14" text-anchor="middle" stroke="none" font-weight="bold">std::uint32_t v = 0x0A0B0C0D;  stored at address 0x100</text>
<text x="215.0" y="52" font-size="12" text-anchor="middle" stroke="none" class="t-gray">0x100</text>
<text x="285.0" y="52" font-size="12" text-anchor="middle" stroke="none" class="t-gray">0x101</text>
<text x="355.0" y="52" font-size="12" text-anchor="middle" stroke="none" class="t-gray">0x102</text>
<text x="425.0" y="52" font-size="12" text-anchor="middle" stroke="none" class="t-gray">0x103</text>
<text x="165" y="84" font-size="14" text-anchor="end" stroke="none" font-weight="bold">Big-endian</text>
<text x="165" y="101" font-size="11" text-anchor="end" stroke="none" class="t-gray">most significant byte first</text>
<rect x="182" y="66" width="66" height="40" rx="5" class="f-purple" fill-opacity="0.16" stroke="none"/>
<rect x="182" y="66" width="66" height="40" rx="5" class="s-purple"/>
<text x="215.0" y="92" font-size="17" text-anchor="middle" stroke="none" class="t-purple" font-weight="bold">0A</text>
<rect x="252" y="66" width="66" height="40" rx="5" class="f-gray" fill-opacity="0.16" stroke="none"/>
<rect x="252" y="66" width="66" height="40" rx="5" class="s-gray"/>
<text x="285.0" y="92" font-size="17" text-anchor="middle" stroke="none" class="t-gray" font-weight="bold">0B</text>
<rect x="322" y="66" width="66" height="40" rx="5" class="f-gray" fill-opacity="0.16" stroke="none"/>
<rect x="322" y="66" width="66" height="40" rx="5" class="s-gray"/>
<text x="355.0" y="92" font-size="17" text-anchor="middle" stroke="none" class="t-gray" font-weight="bold">0C</text>
<rect x="392" y="66" width="66" height="40" rx="5" class="f-orange" fill-opacity="0.16" stroke="none"/>
<rect x="392" y="66" width="66" height="40" rx="5" class="s-orange"/>
<text x="425.0" y="92" font-size="17" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">0D</text>
<text x="165" y="158" font-size="14" text-anchor="end" stroke="none" font-weight="bold">Little-endian</text>
<text x="165" y="175" font-size="11" text-anchor="end" stroke="none" class="t-gray">least significant byte first</text>
<rect x="182" y="140" width="66" height="40" rx="5" class="f-orange" fill-opacity="0.16" stroke="none"/>
<rect x="182" y="140" width="66" height="40" rx="5" class="s-orange"/>
<text x="215.0" y="166" font-size="17" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">0D</text>
<rect x="252" y="140" width="66" height="40" rx="5" class="f-gray" fill-opacity="0.16" stroke="none"/>
<rect x="252" y="140" width="66" height="40" rx="5" class="s-gray"/>
<text x="285.0" y="166" font-size="17" text-anchor="middle" stroke="none" class="t-gray" font-weight="bold">0C</text>
<rect x="322" y="140" width="66" height="40" rx="5" class="f-gray" fill-opacity="0.16" stroke="none"/>
<rect x="322" y="140" width="66" height="40" rx="5" class="s-gray"/>
<text x="355.0" y="166" font-size="17" text-anchor="middle" stroke="none" class="t-gray" font-weight="bold">0B</text>
<rect x="392" y="140" width="66" height="40" rx="5" class="f-purple" fill-opacity="0.16" stroke="none"/>
<rect x="392" y="140" width="66" height="40" rx="5" class="s-purple"/>
<text x="425.0" y="166" font-size="17" text-anchor="middle" stroke="none" class="t-purple" font-weight="bold">0A</text>
<line x1="184" y1="202" x2="449.6" y2="202.0" class="s-gray" stroke-width="1.6"/>
<path d="M456.0,202.0 L448.0,206.0 L448.0,198.0 Z" class="f-gray" stroke="none"/>
<text x="320" y="222" font-size="12" text-anchor="middle" stroke="none" class="t-gray">increasing addresses</text>
<text x="470" y="92" font-size="11" text-anchor="start" stroke="none" class="t-gray">network order,</text>
<text x="470" y="106" font-size="11" text-anchor="start" stroke="none" class="t-gray">PS3, Xbox 360</text>
<text x="470" y="166" font-size="11" text-anchor="start" stroke="none" class="t-gray">x86-64,</text>
<text x="470" y="180" font-size="11" text-anchor="start" stroke="none" class="t-gray">ARM64</text>
</svg>`,
          alt: 'The value 0x0A0B0C0D at addresses 0x100 to 0x103: big-endian stores 0A 0B 0C 0D, little-endian stores 0D 0C 0B 0A.',
          caption: 'Same value, same addresses, opposite byte order. Bits *within* a byte are never reversed; only the order of whole bytes differs.',
          maxWidth: 520,
        },
        {
          type: 'table',
          headers: ['Byte order', 'Where you meet it'],
          rows: [
            ['Little-endian', 'x86 and x86-64 (every PC, PS4, PS5, Xbox One, Xbox Series), ARM as used by Android, iOS, Apple Silicon and Nintendo Switch, RISC-V'],
            ['Big-endian', 'Network byte order in TCP/IP headers; many file formats (PNG, MIDI); the PowerPC consoles: GameCube, Wii, Wii U, Xbox 360 and the PS3\'s Cell'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why little-endian won',
          text: 'Neither order is faster today; it is mostly history. Little-endian has two small advantages: multi-byte addition starts at the least significant byte, which early 8-bit CPUs could fetch first, and a value has the same address whatever width you read it at (the first byte of a 32-bit 5 is the 8-bit 5). Intel\'s 8080, and then x86, chose little-endian, and x86\'s dominance carried the choice into almost everything. Big-endian\'s advantage is human: hex dumps read naturally.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Lilliput and Blefuscu',
          text: 'The names come from *Gulliver\'s Travels*, where two nations go to war over which end of a boiled egg to crack. Danny Cohen borrowed them in his 1980 note "On Holy Wars and a Plea for Peace" to make the point that the choice is arbitrary but must be agreed on.',
        },
        {
          type: 'p',
          text: 'For a game programmer this used to be daily life. Studios shipping on PC (little-endian) and on Xbox 360 or PS3 (big-endian) had to "cook" assets per platform with every multi-byte field byte-swapped, and a forgotten swap produced meshes exploding into spikes. Since PS4 and Xbox One, all the major consoles are little-endian x86-64 or ARM, but network protocols and file formats still force you to think about it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'numeric',
      prompt: 'A memory viewer on an x86-64 PC shows these four bytes at increasing addresses: `EF BE AD DE`. They hold one `std::uint32_t`. What is its value? (Type it in hex, for example `0x1234ABCD`.)',
      answer: '0xDEADBEEF',
      alsoAccept: [3735928559],
      label: 'Value =',
      hint: 'x86-64 is little-endian: the byte at the lowest address is the least significant one.',
      explanation:
        'Little-endian puts the least significant byte first, so read the bytes from the **highest** address down: `DE AD BE EF`, giving `0xDEADBEEF`. Debuggers and allocators love this pattern as a marker for freed or uninitialized memory precisely because it is easy to spot, in either byte order, in a raw memory dump.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Endian-independent code',
      blocks: [
        {
          type: 'p',
          text: 'Here is the key insight that makes byte order manageable: **shifts and masks operate on values, not on memory**. `(x >> 8) & 0xFF` is "bits 8 to 15 of x" on every machine. So if you build values from bytes (or bytes from values) using shifts, your code produces the same result on little- and big-endian CPUs.',
        },
        {
          type: 'code',
          title: 'load_be.cpp',
          code: `#include <cstdint>

// Read a big-endian 32-bit field from a network packet.
std::uint32_t loadU32BE(const unsigned char* p) {
    return std::uint32_t{p[0]} << 24 | std::uint32_t{p[1]} << 16 |
           std::uint32_t{p[2]} << 8  | std::uint32_t{p[3]};
}`,
          annotations: [
            { lines: 5, text: 'The first byte in memory is the most significant one, so it moves to bits 24 to 31. Widening each byte to 32 bits first avoids shifting a promoted `int` into its sign bit.' },
            { lines: 6, text: 'No pointer casts, no assumptions about the host: this function is correct on any CPU.' },
          ],
        },
        {
          type: 'p',
          text: 'You might worry that four loads, three shifts and three ORs are slow. They are not. GCC 13 at `-O2` (`-masm=intel`) recognizes the whole pattern:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'x86-64, g++ 13 -O2',
          code: `loadU32BE(unsigned char const*):
    mov     eax, DWORD PTR [rdi]    ; one 32-bit load
    bswap   eax                     ; reverse the 4 bytes
    ret`,
          annotations: [
            { lines: 2, text: 'A single unaligned-safe 32-bit load: x86-64 allows loads at any address.' },
            { lines: 3, text: '`bswap` reverses the byte order of a register in one instruction. On a big-endian CPU the compiler would simply leave it out.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Try it yourself',
          text: 'Paste `loadU32BE` into [Compiler Explorer](https://godbolt.org/), pick x86-64 GCC with `-O2`, then switch to an ARM64 compiler: you get `ldr` followed by `rev`, ARM\'s byte-reverse instruction. C++23 also adds `std::byteswap` in `<bit>` for when you need the swap explicitly.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Never fwrite a struct for a file format',
          text: 'Dumping a struct\'s raw bytes bakes in the byte order, the type sizes (`long`!) and the padding the compiler inserted between members. All three vary between platforms and compilers. Serialize field by field with fixed-width types and an explicit byte order.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'truefalse',
      prompt: 'On a big-endian CPU, `(x >> 8) & 0xFF` extracts a different byte of the `std::uint32_t x` than it does on a little-endian CPU.',
      answer: false,
      explanation:
        'Shifts and masks are defined on the **value** of `x`, not on its memory layout: `x >> 8` always divides the value by 256, and `& 0xFF` always keeps the low 8 bits of the result. Endianness only matters when you look at an object\'s bytes through memory, for example with a `std::byte*`, `std::memcpy` or a file written as raw bytes. That is exactly why serialization code built from shifts is portable.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Type punning done right: std::bit_cast',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes you really do want to treat the bits of one type as another: hashing a float, sending a float over the network as an integer, or inspecting its fields (next lesson). This is called [[arch-type-punning|type punning]], and the obvious ways to do it in C++ are [[undefined-behavior]]:',
        },
        {
          type: 'compare',
          left: {
            title: 'Undefined behavior',
            tone: 'bad',
            code: `float f = 1.0f;
// Strict-aliasing violation:
auto u = *reinterpret_cast<std::uint32_t*>(&f);

union Pun { float f; std::uint32_t u; };
Pun p{1.0f};
auto v = p.u;   // reads the inactive member`,
            text: 'Both compile, both usually "work" in debug builds, and both can break when the optimizer gets clever. Union punning is legal in C but not in C++.',
          },
          right: {
            title: 'Well-defined',
            tone: 'good',
            code: `float f = 1.0f;
// C++20: same size, trivially copyable
auto u = std::bit_cast<std::uint32_t>(f);

// Any standard: copy the bytes
std::uint32_t v;
std::memcpy(&v, &f, sizeof v);`,
            text: '`std::bit_cast` is also `constexpr`, so you can compute float bit patterns at compile time.',
          },
        },
        {
          type: 'definition',
          term: 'Strict aliasing',
          text: 'The [[strict-aliasing]] rule says you may access an object only through an expression of its own type (or a few compatible ones, plus `char`, `unsigned char` and `std::byte`). The compiler is therefore allowed to assume that an `int*` and a `float*` never point to the same memory.',
        },
        {
          type: 'p',
          text: 'That assumption is not pedantry; it is a real optimization. Look what GCC 13 at `-O2` does with this function:',
        },
        {
          type: 'code',
          title: 'alias.cpp',
          code: `int update(int* hp, float* scale) {
    *hp = 100;
    *scale = 0.5f;
    return *hp;
}`,
          annotations: [
            { lines: 3, text: 'Could this store overwrite `*hp`? Only if `scale` pointed into the same memory as `hp`, which strict aliasing forbids.' },
            { lines: 4, text: 'So the compiler returns the constant 100 without reloading `*hp` from memory.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'x86-64, g++ 13 -O2',
          code: `update(int*, float*):
    mov     DWORD PTR [rdi], 100
    mov     eax, 100                    ; no reload of *hp
    mov     DWORD PTR [rsi], 0x3f000000 ; 0.5f as bits
    ret`,
          annotations: [
            { lines: 3, text: 'With `int* other` instead of `float*`, GCC must emit `mov eax, DWORD PTR [rdi]` after the second store, because two `int*` may alias.' },
            { lines: 4, text: '`0x3f000000` is the bit pattern of 0.5f. If you had punned `hp` and `scale` to the same address, this function would return 100 even though memory now holds 0.5f.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'bit_cast costs nothing',
          text: 'Both `std::bit_cast<std::uint32_t>(f)` and the `std::memcpy` version compile to a single `movd eax, xmm0` at `-O2`: copy the 32 bits from the floating-point register to an integer register. Doing it correctly is free.',
        },
        {
          type: 'deepdive',
          title: 'Quake III\'s fast inverse square root',
          blocks: [
            {
              type: 'p',
              text: 'The famous `Q_rsqrt` from Quake III Arena (1999) computes 1/√x by reinterpreting a float\'s bits as an integer, subtracting half of it (`i >> 1`) from the magic constant `0x5f3759df`, and reinterpreting back, followed by one Newton–Raphson step. The original wrote `i = *(long*)&y;`, which is a strict-aliasing violation today (and assumes a 32-bit `long`). A modern version is `std::bit_cast<std::uint32_t>(y)`. It is also no longer a speed trick: SSE\'s `rsqrtss` instruction has done the same job in hardware since 1999.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'fill',
      prompt: 'Complete the code so it reads the raw IEEE 754 bits of `speed` without undefined behavior, and checks at compile time that the sizes match.',
      template: `float speed = 2.5f;
auto bits = std::___<std::uint32_t>(speed);
static_assert(sizeof(float) == ___(std::uint32_t));`,
      blanks: [{ answers: ['bit_cast'] }, { answers: ['sizeof'] }],
      wordBank: ['bit_cast', 'reinterpret_cast', 'static_cast', 'sizeof', 'alignof'],
      explanation:
        '`std::bit_cast` copies the object representation into a new object of another type of the **same size**, and it refuses to compile otherwise. `static_cast<std::uint32_t>(speed)` would convert the *value* 2.5 to the integer 2, and `reinterpret_cast` cannot convert a `float` to an integer at all (and on pointers it would break strict aliasing). The `static_assert` documents the assumption that `float` is 32 bits.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'bug',
      prompt: 'This function parses the header of a network packet whose fields are big-endian. Tap the line with the bug.',
      code: `#include <cstdint>

struct Header {
    std::uint16_t type;
    std::uint32_t length;
};

Header parse(const unsigned char* packet) {
    Header h;
    h.type = static_cast<std::uint16_t>(packet[0] << 8 | packet[1]);
    h.length = *reinterpret_cast<const std::uint32_t*>(packet + 2);
    return h;
}`,
      bugLines: [11],
      hint: 'Line 10 builds its value with shifts. Line 11 does something else.',
      explanation:
        'Line 11 has three problems at once. It reads bytes through a `std::uint32_t` lvalue, which violates strict aliasing ([[undefined-behavior]]). `packet + 2` is not 4-byte aligned, which crashes on some CPUs and is UB in C++ everywhere. And even when it "works" on x86-64, it reads the bytes in little-endian order, so a length of 256 comes out as 65,536. Build the value with shifts like line 10, `packet[2] << 24 | packet[3] << 16 | ...` (after widening to `std::uint32_t`), or `std::memcpy` into a local and byte-swap.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'std::byte and raw buffers',
      blocks: [
        {
          type: 'p',
          text: 'C++17 added [[std-byte|`std::byte`]] (in `<cstddef>`) for memory that is just bytes: serialization buffers, network packets, custom allocators. It is an `enum class` over `unsigned char` that supports only the bitwise operators and shifts. You cannot accidentally add to it or print it as a character; to get a number out you call `std::to_integer<T>(b)`.',
        },
        {
          type: 'code',
          title: 'serialize.cpp',
          runnable: true,
          code: `#include <array>
#include <cstddef>
#include <cstdint>
#include <cstdio>

// Endian-independent: works on values, not on memory layout.
void writeU32LE(std::byte* out, std::uint32_t v) {
    for (int i = 0; i < 4; ++i) {
        out[i] = static_cast<std::byte>(v >> (8 * i));
    }
}

std::uint32_t readU32LE(const std::byte* in) {
    std::uint32_t v = 0;
    for (int i = 0; i < 4; ++i) {
        v |= std::to_integer<std::uint32_t>(in[i]) << (8 * i);
    }
    return v;
}

int main() {
    std::array<std::byte, 8> save{};
    writeU32LE(save.data(), 1500);         // gold
    writeU32LE(save.data() + 4, 0xC0FFEE); // checksum

    for (std::size_t i = 0; i < save.size(); ++i) {
        std::printf("%02X%c", std::to_integer<unsigned>(save[i]),
                    i + 1 < save.size() ? ' ' : '\\n');
    }
    std::printf("gold=%u checksum=0x%X\\n",
                readU32LE(save.data()), readU32LE(save.data() + 4));
}`,
          output: `DC 05 00 00 EE FF C0 00
gold=1500 checksum=0xC0FFEE`,
          annotations: [
            { lines: 9, text: 'Byte i of the output is bits 8i to 8i+7 of the value. Converting to `std::byte` keeps the low 8 bits.' },
            { lines: 16, text: '`std::to_integer` turns each byte back into a number, then the shift puts it in its place. The file format is little-endian by definition, whatever CPU runs this.' },
            { lines: 23, text: '1500 = `0x000005DC`, so the bytes are `DC 05 00 00`: least significant first.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a separate byte type?',
          text: 'Before `std::byte`, raw memory was `char` or `unsigned char`, which are also *characters* and *small integers*. `buffer[i] + 1` compiled, `std::cout << buffer[i]` printed a letter, and whether `char` is signed varies by platform. `std::byte` says "this is raw storage" and lets the compiler reject arithmetic that makes no sense on it, at zero run-time cost.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Bytes in Unreal',
          text: 'Unreal predates `std::byte` and uses `uint8` for raw data, for example `TArray<uint8>` buffers. Its serialization goes through `FArchive`, a single `<<` interface for both saving and loading, so byte order and sizes are handled in one place rather than in every struct.',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'Given `std::byte b{0x0F};`, which expression does **not** compile?',
      codeOptions: true,
      options: [
        { text: 'b << 2', why: 'Shifts are defined for `std::byte` (the shift count is an integer). The result is `std::byte{0x3C}`.' },
        { text: 'b ^ std::byte{0xFF}', why: 'Bitwise XOR between two `std::byte`s is allowed and gives `std::byte{0xF0}`.' },
        { text: 'b + std::byte{1}', correct: true, why: 'Correct: `std::byte` deliberately has no arithmetic operators. Convert with `std::to_integer` first if you really mean to add.' },
        { text: 'std::to_integer<int>(b)', why: 'This is the intended way to read a byte\'s value; it gives 15.' },
      ],
      explanation:
        '`std::byte` models a bag of bits: it supports `&`, `|`, `^`, `~`, `<<` and `>>` (and their compound forms) but no `+`, `-`, `*` or comparison with integers. That is the point. Arithmetic on raw storage is almost always a bug, and when it is not, `std::to_integer` makes the conversion visible.',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'numeric',
      prompt: 'A texture header stores its width as a 16-bit **big-endian** field. The two bytes in the file, in order, are `0x04 0x00`. A programmer on x86-64 copies them into a `std::uint16_t` with `std::memcpy` and forgets to swap. What width does the program see?',
      answer: 4,
      alsoAccept: ['0x0004'],
      unit: 'pixels',
      hint: 'On x86-64, the first byte in memory becomes the least significant one.',
      explanation:
        'The intended width is `0x0400` = 1024. A little-endian load makes the first byte (`0x04`) the low byte and the second (`0x00`) the high byte, giving `0x0004` = 4. Byte-order bugs rarely crash; they produce plausible-looking wrong numbers like a 4-pixel texture, which is why reading every multi-byte field through one helper such as `loadU16BE` is worth the discipline.',
    },
  ],
  takeaways: [
    'Hardware uses two voltage levels because a wide gap between "0" and "1" makes bits robust against noise; the meaning of bits comes entirely from the instructions (and C++ types) that use them.',
    'One hex digit is exactly four bits, so hex is the natural way to read bytes, masks, colors and addresses.',
    'Memory is an array of bytes; a multi-byte object occupies consecutive addresses, and **endianness** decides which byte comes first. x86-64 and ARM as used today are little-endian; networks and many file formats are big-endian.',
    'Shifts and masks act on values, not memory, so serialization code written with them is endian-independent, and compilers turn it into a single load plus `bswap`.',
    'Type sizes vary (`long` is 8 bytes on Linux, 4 on Windows); use fixed-width types for anything stored or sent.',
    'Reinterpret bits with `std::bit_cast` or `std::memcpy`, never with `reinterpret_cast` dereferences or unions: strict aliasing lets the optimizer assume differently typed pointers never overlap.',
  ],
  reading: [
    { title: 'std::bit_cast', url: 'https://en.cppreference.com/w/cpp/numeric/bit_cast', source: 'cppreference', note: 'The exact requirements (same size, trivially copyable) and a reference implementation via memcpy.' },
    { title: 'std::endian', url: 'https://en.cppreference.com/w/cpp/types/endian', source: 'cppreference', note: 'How to detect the native byte order at compile time.' },
    { title: 'std::byte', url: 'https://en.cppreference.com/w/cpp/types/byte', source: 'cppreference', note: 'The operators std::byte supports, and std::to_integer.' },
    { title: 'Endianness', url: 'https://en.wikipedia.org/wiki/Endianness', source: 'article', note: 'History, hardware examples and the many places byte order still matters.' },
    { title: 'Computer Systems: A Programmer\'s Perspective', url: 'https://csapp.cs.cmu.edu/', source: 'book', note: 'Chapter 2 covers information storage, hex, byte ordering and data sizes in depth.' },
  ],
};
