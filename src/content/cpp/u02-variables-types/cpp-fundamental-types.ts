import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-fundamental-types',
  title: 'Fundamental Types',
  summary: 'Integers, characters, booleans and floating-point numbers: how big they are, what they can hold, and the traps in each.',
  minutes: 18,
  objectives: [
    'List the fundamental types and the minimum sizes the standard guarantees for each integer type',
    'Use `sizeof` and `std::numeric_limits` to inspect sizes and ranges',
    'Explain the difference between signed and unsigned integers and why unsigned is not a safety feature',
    'Choose fixed-width types from `<cstdint>` when exact sizes matter, and relate them to Unreal\'s `int32`',
    'Explain why `float` and `double` cannot represent most decimals exactly, and when precision runs out',
    'Explain how `char` stores characters as small integers using an encoding such as ASCII',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'The building blocks',
      blocks: [
        {
          type: 'p',
          text: 'Every value in a C++ program is ultimately built from a small set of [[fundamental-type|fundamental types]] that are part of the language itself. They map directly onto what the CPU can store in a register and manipulate with a single instruction, which is why they are so fast.',
        },
        {
          type: 'table',
          headers: ['Category', 'Types', 'Holds'],
          rows: [
            ['Integers', '`short`, `int`, `long`, `long long` (each also `unsigned`)', 'Whole numbers'],
            ['Characters', '`char`, `signed char`, `unsigned char`, `char8_t`, `char16_t`, `char32_t`, `wchar_t`', 'Character codes (small integers)'],
            ['Boolean', '`bool`', '`true` or `false`'],
            ['Floating-point', '`float`, `double`, `long double`', 'Approximate real numbers'],
            ['Void', '`void`', 'No value at all (used for functions that return nothing)'],
          ],
        },
        {
          type: 'p',
          text: 'Everything else — `std::string`, `std::vector`, your own `Enemy` class, Unreal\'s `FVector` — is built by combining these. Knowing their sizes, ranges and quirks is knowing what your data really costs.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why doesn\'t C++ fix the exact size of `int`?',
          text: 'C and C++ run on everything from 8-bit microcontrollers to 64-bit servers. Instead of mandating exact sizes, the standard sets **minimums** and lets each platform pick the size its hardware handles most efficiently. `int` is meant to be the CPU\'s "natural" integer. That made C portable and fast everywhere — at the cost of some portability surprises, which `<cstdint>` (later in this lesson) solves.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Integer types and their sizes',
      blocks: [
        {
          type: 'p',
          text: 'The standard guarantees each [[integer-type]] a minimum width in bits, and that each type is at least as large as the one before it: `short` ≤ `int` ≤ `long` ≤ `long long`. What you actually get depends on the platform.',
        },
        {
          type: 'table',
          headers: ['Type', 'Guaranteed at least', '64-bit Windows', '64-bit Linux / macOS'],
          rows: [
            ['`short`', '16 bits', '16', '16'],
            ['`int`', '16 bits', '32', '32'],
            ['`long`', '32 bits', '**32**', '**64**'],
            ['`long long`', '64 bits', '64', '64'],
          ],
          caption: '`long` differs between the major desktop platforms — a classic source of portability bugs.',
        },
        {
          type: 'p',
          text: 'The [[sizeof]] operator tells you how many **bytes** a type or object occupies on the platform you compile for. It is evaluated at compile time, so it costs nothing at run time.',
        },
        {
          type: 'code',
          title: 'sizes.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    std::cout << "char:      " << sizeof(char) << '\\n';
    std::cout << "short:     " << sizeof(short) << '\\n';
    std::cout << "int:       " << sizeof(int) << '\\n';
    std::cout << "long:      " << sizeof(long) << '\\n';
    std::cout << "long long: " << sizeof(long long) << '\\n';
    std::cout << "bool:      " << sizeof(bool) << '\\n';
    std::cout << "float:     " << sizeof(float) << '\\n';
    std::cout << "double:    " << sizeof(double) << '\\n';
}`,
          output: 'char:      1\nshort:     2\nint:       4\nlong:      8\nlong long: 8\nbool:      1\nfloat:     4\ndouble:    8',
          annotations: [
            { lines: 4, text: '`sizeof(char)` is **always** 1 — by definition, `char` is one byte, and every other size is measured in units of `char`.' },
            { lines: 7, text: 'This output is from 64-bit Linux. Compiled with MSVC on Windows, this line prints `4`.' },
            { lines: 9, text: 'A `bool` needs only one bit, but takes a whole byte: a byte is the smallest unit of memory that has its own address.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'How big is a byte?',
          text: 'C++ defines a byte as the size of a `char`, which must be at least 8 bits. On every platform you are likely to target it is exactly 8 bits. The exact count is available as `CHAR_BIT` from `<climits>`.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'You need an integer type that is **guaranteed** by the C++ standard to hold at least 64 bits on every platform. Which do you choose?',
      options: [
        { text: '`int`', why: '`int` is only guaranteed 16 bits. It is 32 bits on mainstream platforms, but that is a platform choice, not a guarantee — and even 32 bits is not 64.' },
        { text: '`long`', why: '`long` is only guaranteed 32 bits. It is 64 bits on Linux and macOS but 32 bits on Windows, so code relying on 64 breaks there.' },
        { text: '`long long`', correct: true, why: 'Correct. Since C++11, `long long` is guaranteed to be at least 64 bits everywhere.' },
        { text: '`short`', why: '`short` is guaranteed only 16 bits and is the smallest of the standard integer types (after the character types).' },
      ],
      explanation:
        'The standard guarantees minimum widths: `short` and `int` 16 bits, `long` 32 bits, `long long` 64 bits. If you need an *exact* width, rather than "at least", use the fixed-width types like `std::int64_t` from `<cstdint>`, coming up shortly.',
    },
    {
      kind: 'concept',
      title: 'Signed and unsigned',
      blocks: [
        {
          type: 'p',
          text: 'Each integer type comes in two flavours of [[signedness]]. A **signed** integer (the default for `int`) can hold negative and positive values. An **unsigned** integer gives up negatives and uses that bit pattern space for larger positive values instead.',
        },
        {
          type: 'table',
          headers: ['Type (32-bit)', 'Minimum', 'Maximum'],
          rows: [
            ['`int` (signed)', '−2,147,483,648', '2,147,483,647'],
            ['`unsigned int`', '0', '4,294,967,295'],
          ],
          caption: 'With n bits, signed covers −2ⁿ⁻¹ to 2ⁿ⁻¹ − 1, and unsigned covers 0 to 2ⁿ − 1.',
        },
        {
          type: 'p',
          text: 'Since C++20, signed integers are required to use [[twos-complement|two\'s complement]], the representation every modern CPU uses. Here is what that means for an 8-bit value: the same bits mean different numbers depending on the type.',
        },
        {
          type: 'table',
          headers: ['Bits', 'As `std::uint8_t` (unsigned)', 'As `std::int8_t` (signed)'],
          rows: [
            ['`0000 0101`', '5', '5'],
            ['`0111 1111`', '127', '127 (largest)'],
            ['`1000 0000`', '128', '−128 (smallest)'],
            ['`1111 1011`', '251', '−5'],
            ['`1111 1111`', '255 (largest)', '−1'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why two\'s complement?',
          text: 'With two\'s complement, adding and subtracting work with exactly the same circuit for signed and unsigned numbers — the CPU does not need to care which one it is handling. That is why hardware converged on it decades ago, and why C++20 finally made it official instead of also allowing rare historical alternatives.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Unsigned is not a "never negative" guarantee',
          text: 'It is tempting to use `unsigned` for things that should never be negative, like health or ammo. But unsigned arithmetic does not stop at zero: it **wraps around**, so `0u - 1` is 4,294,967,295. A bug that would have produced a visible `-10` instead produces a huge number. The C++ Core Guidelines advise using signed types for arithmetic and reserving unsigned for bit manipulation. The Type Conversions lesson covers what happens at the edges of each range.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Unreal follows the same advice: counts and indices are signed (`TArray::Num()` returns a signed `int32`), while unsigned types such as `uint8` are mostly used for compact flags, bytes of data and small enums.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Declaring `health` as `unsigned int` is a good way to guarantee it never goes below zero when the player takes damage.',
      answer: false,
      explanation:
        'Unsigned types cannot *represent* negative numbers, but subtraction does not stop at zero — it wraps around. `unsigned int health = 10; health = health - 20;` leaves `health` at 4,294,967,286, so a dead player suddenly has four billion hit points. Use a signed type and clamp explicitly (for example, with `std::max(0, health - damage)`), so the logic is visible and correct.',
    },
    {
      kind: 'concept',
      title: 'Fixed-width integers: <cstdint>',
      blocks: [
        {
          type: 'p',
          text: 'When the exact size matters — save files, network packets, file formats, data shared between platforms — "at least 32 bits" is not good enough. The `<cstdint>` header provides [[fixed-width-integer|fixed-width integer types]] whose names spell out their size:',
        },
        {
          type: 'table',
          headers: ['Signed', 'Unsigned', 'Exact width'],
          rows: [
            ['`std::int8_t`', '`std::uint8_t`', '8 bits'],
            ['`std::int16_t`', '`std::uint16_t`', '16 bits'],
            ['`std::int32_t`', '`std::uint32_t`', '32 bits'],
            ['`std::int64_t`', '`std::uint64_t`', '64 bits'],
          ],
        },
        {
          type: 'code',
          title: 'fixed.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>

int main() {
    std::int32_t gold = 1'500'000;
    std::int64_t totalXp = 9'000'000'000;
    std::uint8_t level = 65;

    std::cout << "Gold: " << gold << '\\n';
    std::cout << "XP: " << totalXp << '\\n';
    std::cout << "Level: " << level << '\\n';
    std::cout << "Level: " << static_cast<int>(level) << '\\n';
}`,
          output: 'Gold: 1500000\nXP: 9000000000\nLevel: A\nLevel: 65',
          annotations: [
            { lines: 5, text: 'Exactly 32 bits on every platform. The `\'` characters are **digit separators** (C++14): they make long numbers readable and are ignored by the compiler.' },
            { lines: 6, text: 'Nine billion does not fit in 32 bits (max about 2.1 billion), so this needs a 64-bit type.' },
            { lines: 11, text: 'Surprise: prints `A`! `std::uint8_t` is almost always an alias for `unsigned char`, and `std::cout` prints character types as characters. 65 is the code for `A`.' },
            { lines: 12, text: 'Convert to `int` first to print the number. `static_cast` is explained in the Type Conversions lesson.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal\'s int32 and friends',
          text: 'Unreal defines its own fixed-width names: `int8`, `int16`, [[int32]], `int64` and `uint8` … `uint64`. They exist for the same reason as `<cstdint>` — identical sizes on every platform the engine ships on. The engine uses them almost everywhere, Epic\'s coding standard requires explicitly sized types for anything serialized or replicated, and properties exposed to Blueprints must use types Blueprint supports, such as `int32`, `int64` and `uint8`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'When to use which',
          text: 'For ordinary counters and arithmetic, plain `int` is fine and idiomatic in standard C++. Reach for fixed-width types when data crosses a boundary — disk, network, GPU, another platform — or when a value needs more than 32 bits.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'You are designing a save-game format that must load identically on Windows, Linux and consoles. Which type should store the player\'s gold?',
      options: [
        { text: '`long`', why: '`long` is 32 bits on Windows and 64 bits on Linux, so the same file would be written and read with different layouts.' },
        { text: '`int`', why: '`int` is 32 bits on all mainstream platforms today, but the standard only promises 16. A file format should not rely on a platform choice.' },
        { text: '`std::int32_t`', correct: true, why: 'Correct. Its width is exactly 32 bits by definition, so every platform writes and reads the same bytes. (Use `std::int64_t` if gold might exceed about 2.1 billion.)' },
        { text: '`short`', why: 'Exactly 16 bits on mainstream platforms, so gold would max out at 32,767 — and its width is still not guaranteed.' },
      ],
      explanation:
        'Data that leaves your program — files, network packets, shared memory — needs a layout that does not depend on the compiler. Fixed-width types make the size part of the type\'s name. (A real save system must also agree on byte order, but that is a topic for another day.)',
    },
    {
      kind: 'concept',
      title: 'Floating-point: float and double',
      blocks: [
        {
          type: 'p',
          text: '[[floating-point|Floating-point types]] store approximate real numbers using binary scientific notation: a sign, an exponent and a fixed number of significant binary digits. Almost every platform uses the [[ieee-754]] formats:',
        },
        {
          type: 'table',
          headers: ['Type', 'Size', 'Significant decimal digits', 'Literal'],
          rows: [
            ['`float`', '32 bits', 'about 7 (6 guaranteed)', '`4.5f`'],
            ['`double`', '64 bits', 'about 16 (15 guaranteed)', '`4.5`'],
            ['`long double`', 'Platform-dependent', 'At least as many as `double`', '`4.5L`'],
          ],
        },
        {
          type: 'p',
          text: 'Because the digits are binary, most decimal fractions cannot be stored exactly — just as 1/3 cannot be written exactly in decimal. `0.1` is stored as the nearest representable value:',
        },
        {
          type: 'code',
          title: 'precision.cpp',
          runnable: true,
          code: `#include <iomanip>
#include <iostream>

int main() {
    float f = 0.1f;
    double d = 0.1;
    std::cout << std::setprecision(20);
    std::cout << f << '\\n';
    std::cout << d << '\\n';
    std::cout << (0.1 + 0.2 == 0.3) << '\\n';
}`,
          output: '0.10000000149011611938\n0.10000000000000000555\n0',
          annotations: [
            { lines: 5, text: 'The `f` suffix makes `0.1f` a `float` literal. Without it, `0.1` is a `double`.' },
            { lines: 7, text: '`std::setprecision` (from `<iomanip>`) asks for 20 significant digits, revealing what is really stored.' },
            { lines: 8, text: 'The `float` is wrong from the 9th digit onwards…' },
            { lines: 9, text: '…the `double` from the 18th. Both are the closest values their formats can hold.' },
            { lines: 10, text: '`0` means false: the tiny errors in `0.1` and `0.2` do not cancel out, so their sum is not exactly the stored `0.3`. Never compare floating-point results with `==`.' },
          ],
        },
        {
          type: 'p',
          text: 'Precision is *relative*: a float keeps about 7 significant digits wherever the decimal point is. Near 1.0 the gap between neighbouring floats is tiny; near 1,000,000 it is 0.0625; above 16,777,216 floats cannot even represent every whole number.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Why Unreal Engine 5 switched to double',
          text: 'Unreal measures the world in centimetres. With `float` positions, an object 10 km from the origin can only be placed in steps of 0.0625 cm, and at 100 km in whole-centimetre steps — enough to make cameras jitter and physics misbehave. UE5 introduced [[large-world-coordinates]]: `FVector` and friends now use `double` for positions. Many other engine and GPU paths still use `float`, which is half the size and faster to process in bulk.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'float or double?',
          text: 'In standard C++, `double` is the default choice: literals are `double`, and modern CPUs compute with it about as fast as `float` for scalar math. `float` wins when you have *lots* of numbers — vertex data, particles, animation — because twice as many fit in each cache line and SIMD register, and GPUs are built around it.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A server stores total uptime as a `float` number of seconds and adds the frame time (1/60 s) every frame. After several days, timers built on it run badly wrong and eventually freeze. Why?',
      options: [
        {
          text: 'The `float` eventually overflows past its maximum value and wraps around to zero',
          why: 'A `float` can hold values up to about 3.4 × 10³⁸, and floating-point types do not wrap. Range is not the problem — precision is.',
        },
        {
          text: 'As the total grows, the gap between representable floats grows too, so each small addition is rounded more and more — and finally rounds away completely',
          correct: true,
          why: 'Right. With about 7 significant digits, a large total cannot absorb a tiny increment accurately. Measured: after about 116 hours of frames, the clock reads 524,288 s (26% too high) and adding 1/60 no longer changes it at all.',
        },
        {
          text: '1/60 cannot be stored exactly, and that tiny error per frame adds up to the drift',
          why: 'The representation error of 1/60 itself is tiny and would cause negligible drift. The real problem is rounding the *sum* to a float with too few digits once it gets large.',
        },
        {
          text: 'Floating-point addition is non-deterministic, so results differ every frame',
          why: 'IEEE 754 addition is deterministic: the same inputs give the same rounded result. The behaviour is predictable — predictably wrong.',
        },
      ],
      explanation:
        'Floating-point precision is relative to magnitude. Once the total time is large, the spacing between adjacent floats exceeds the frame time, and `total + delta` rounds back to `total`. Fixes: store time as a `double` (good for millennia at frame resolution), as an integer count of ticks, or reset your accumulators. This exact bug has hit real games and servers.',
    },
    {
      kind: 'concept',
      title: 'char: characters are numbers',
      blocks: [
        {
          type: 'p',
          text: 'A [[char-type|`char`]] is a one-byte integer type. What makes it a "character" is an **encoding**: an agreed table mapping numbers to symbols. The basic table almost every system shares is [[ascii]]:',
        },
        {
          type: 'table',
          headers: ['Character', 'Code', 'Notes'],
          rows: [
            ['`\'0\'` … `\'9\'`', '48 … 57', 'Digits are consecutive'],
            ['`\'A\'` … `\'Z\'`', '65 … 90', 'Uppercase letters are consecutive'],
            ['`\'a\'` … `\'z\'`', '97 … 122', 'Lowercase is uppercase + 32'],
            ['`\' \'`', '32', 'Space'],
            ['`\'\\n\'`', '10', 'Newline — one character, despite two symbols in source'],
          ],
        },
        {
          type: 'code',
          title: 'chars.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    char grade = 'A';
    char next = grade + 1;
    std::cout << grade << ' ' << next << '\\n';
    std::cout << static_cast<int>(grade) << '\\n';
    char digit = '7';
    int value = digit - '0';
    std::cout << value * 2 << '\\n';
}`,
          output: 'A B\n65\n14',
          annotations: [
            { lines: 4, text: 'Single quotes make a character literal. `\'A\'` is just a friendlier way to write 65.' },
            { lines: 5, text: 'Because characters are numbers, you can do arithmetic: 65 + 1 = 66, which is `B`.' },
            { lines: 7, text: 'Printed as an `int`, the same value shows its code.' },
            { lines: 9, text: 'A classic trick: since digits are consecutive, `\'7\' - \'0\'` is 55 − 48 = 7, the digit\'s numeric value.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Single quotes: one char',
            tone: 'good',
            code: "char key = 'E';",
            text: 'A single character, one byte.',
          },
          right: {
            title: 'Double quotes: a string literal',
            tone: 'bad',
            code: 'char key = "E";   // error',
            text: 'A string literal is an array of characters ending in a hidden `\'\\0\'` — two bytes here. It cannot initialize a `char`.',
          },
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Is `char` signed?',
          text: 'It depends on the platform: `char` is signed on x86 Windows and Linux but unsigned on most ARM Linux systems, including Android. `char`, `signed char` and `unsigned char` are three distinct types. Use `char` for text, and `std::int8_t` / `std::uint8_t` (or `unsigned char`) for raw bytes and small numbers.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Beyond ASCII',
          text: 'ASCII only covers 128 characters — no accents, no emoji, no Japanese. Modern text uses Unicode, stored as UTF-8 in `char`-based strings or with the wider `char8_t`, `char16_t` and `char32_t` types. Unit 4 deals with strings. Unreal stores text as `TCHAR`, which is 16 bits wide on Windows, which is why string literals in Unreal are wrapped in the [[text-macro]] macro.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `#include <iostream>

int main() {
    char c = 'a';
    c = c + 2;
    std::cout << c << ' ' << static_cast<int>('a') << '\\n';
}`,
      options: [
        { text: '`99 97`', why: '`c` is still a `char`, so `std::cout` prints it as a character, not as its code. Only the second value is converted to `int`.' },
        { text: '`c 97`', correct: true, why: 'Correct. `\'a\'` is 97; adding 2 gives 99, which is the letter `c`. The second value is converted to `int`, so its code is printed.' },
        { text: '`a2 97`', why: 'Adding a number to a `char` does arithmetic on its code; it does not append text.' },
        { text: '`c a`', why: '`static_cast<int>` converts the character to its numeric code, so it prints `97`, not `a`.' },
      ],
      explanation:
        'A `char` holds a number; the type decides how it is printed. `std::cout` shows `char` values as characters and `int` values as numbers. This is also why `std::uint8_t` values print as characters: on mainstream platforms they are `unsigned char` underneath.',
    },
    {
      kind: 'concept',
      title: 'bool and std::numeric_limits',
      blocks: [
        {
          type: 'p',
          text: 'A [[bool-type|`bool`]] holds `true` or `false`. It converts to the integers 1 and 0, and any number converts to `bool` as `false` if it is zero and `true` otherwise. That is why `std::cout` prints booleans as `1` and `0` by default.',
        },
        {
          type: 'p',
          text: 'To ask the compiler for the exact limits of any arithmetic type on the current platform, use `std::numeric_limits` from `<limits>`. The type you are asking about goes in angle brackets — a template, which Unit 12 explains; for now, read it as "limits *of* int".',
        },
        {
          type: 'code',
          title: 'limits.cpp',
          runnable: true,
          code: `#include <iostream>
#include <limits>

int main() {
    std::cout << "int max: "
              << std::numeric_limits<int>::max() << '\\n';
    std::cout << "int min: "
              << std::numeric_limits<int>::min() << '\\n';
    std::cout << "unsigned max: "
              << std::numeric_limits<unsigned int>::max() << '\\n';
    std::cout << "float digits: "
              << std::numeric_limits<float>::digits10 << '\\n';
    std::cout << "double min: "
              << std::numeric_limits<double>::min() << '\\n';
    std::cout << "double lowest: "
              << std::numeric_limits<double>::lowest() << '\\n';
}`,
          output: 'int max: 2147483647\nint min: -2147483648\nunsigned max: 4294967295\nfloat digits: 6\ndouble min: 2.22507e-308\ndouble lowest: -1.79769e+308',
          annotations: [
            { lines: '5-8', text: '`max()` and `min()` give the largest and smallest values of an integer type.' },
            { lines: '11-12', text: '`digits10` is how many decimal digits are guaranteed to survive a round trip through the type: 6 for `float`.' },
            { lines: '13-14', text: 'Trap! For floating-point types, `min()` is the smallest **positive** normal value, not the most negative one.' },
            { lines: '15-16', text: 'Use `lowest()` for the most negative value of a floating-point type.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why ask the compiler instead of memorizing?',
          text: 'The limits depend on the platform, and hard-coding `2147483647` hides your intent and breaks if a type changes. `std::numeric_limits` is evaluated at compile time, costs nothing at run time, and documents exactly what you mean: "the largest value this type can hold".',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the line so it initializes `best` with the largest value an `int` can hold.',
      template: `int best = std::numeric_limits<___>::___();`,
      blanks: [{ answers: ['int'] }, { answers: ['max'] }],
      wordBank: ['int', 'max', 'min', 'lowest', 'sizeof', 'double'],
      explanation:
        '`std::numeric_limits<int>::max()` is the largest `int` (2,147,483,647 where `int` is 32 bits). It is the natural starting point when searching for the *smallest* score: every real score will be lower. `min()` gives the smallest `int`; for floating-point types use `lowest()`, because their `min()` is the smallest positive value.',
    },
    {
      kind: 'bug',
      prompt: 'The settings screen should print `Volume: 50`, but it prints `Volume: 2`. Tap the line responsible.',
      code: `#include <cstdint>
#include <iostream>

int main() {
    std::uint8_t volume = 50;
    std::int32_t sensitivity = 7;
    std::cout << "Volume: " << volume << '\\n';
    std::cout << "Sensitivity: " << sensitivity << '\\n';
}`,
      bugLines: [7],
      hint: 'What is `std::uint8_t` underneath, and how does `std::cout` print that type?',
      explanation:
        '`std::uint8_t` is an alias for `unsigned char` on mainstream platforms, so line 7 prints the character whose code is 50 — the digit `2`. Storing 50 in a `uint8_t` is fine; the bug is printing it as if it were a number. Fix it with `static_cast<int>(volume)`. `std::int32_t` is an alias for `int`, so `sensitivity` prints correctly.',
    },
  ],
  takeaways: [
    'Fundamental types (integers, characters, `bool`, floating-point, `void`) map directly to hardware and are the building blocks of every other type.',
    'The standard guarantees minimum widths: `short`/`int` 16 bits, `long` 32, `long long` 64. `long` is 32 bits on Windows and 64 on Linux/macOS.',
    '`sizeof` gives a size in bytes at compile time; `sizeof(char)` is always 1.',
    'Signed integers use two\'s complement (guaranteed since C++20). Unsigned types wrap around below zero, so they are not a "never negative" safety feature.',
    'Use `<cstdint>` fixed-width types (`std::int32_t`, `std::int64_t`…) when exact sizes matter; Unreal\'s `int32` exists for the same reason.',
    '`float` has about 7 significant digits and `double` about 16; most decimals are approximations, so never compare results with `==`.',
    '`char` is a small integer interpreted through an encoding such as ASCII; `std::uint8_t` usually prints as a character.',
    'Use `std::numeric_limits<T>` for ranges; for floating-point types, `lowest()` is the most negative value, not `min()`.',
  ],
  reading: [
    {
      title: 'Fundamental types',
      url: 'https://en.cppreference.com/w/cpp/language/types',
      source: 'cppreference',
      note: 'Every fundamental type with its guaranteed width and the common data models (LP64, LLP64).',
    },
    {
      title: 'Fixed width integer types',
      url: 'https://en.cppreference.com/w/cpp/types/integer',
      source: 'cppreference',
      note: 'The full list of `<cstdint>` types, including the "least" and "fast" variants.',
    },
    {
      title: 'std::numeric_limits',
      url: 'https://en.cppreference.com/w/cpp/types/numeric_limits',
      source: 'cppreference',
      note: 'All the properties you can query, including `epsilon()` for floating-point comparisons.',
    },
    {
      title: 'Floating point numbers',
      url: 'https://www.learncpp.com/cpp-tutorial/floating-point-numbers/',
      source: 'learncpp',
      note: 'More examples of rounding errors and precision loss, with advice on handling them.',
    },
    {
      title: 'C++ Core Guidelines: ES.106 — Don\'t try to avoid negative values by using unsigned',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Res-nonnegative',
      source: 'core-guidelines',
      note: 'The reasoning behind preferring signed types for arithmetic.',
    },
  ],
};
