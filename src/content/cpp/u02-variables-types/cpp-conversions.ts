import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-conversions',
  title: 'Type Conversions and Casts',
  summary: 'What really happens when types mix: promotions, the usual arithmetic conversions, signed/unsigned traps, casts, and overflow.',
  minutes: 18,
  objectives: [
    'Predict the type of an expression using integral promotion and the usual arithmetic conversions',
    'Explain why comparing signed and unsigned integers gives wrong answers, and fix it',
    'Convert floating-point values to integers deliberately: truncation vs rounding',
    'Use `static_cast` for explicit conversions and explain why C-style casts are dangerous',
    'Distinguish unsigned wrap-around (well-defined) from signed overflow (undefined behavior)',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'When types meet',
      blocks: [
        {
          type: 'p',
          text: 'Every expression in C++ has a type, and types constantly meet: you assign an `int` to a `double`, multiply an `int` by a `float`, compare a count with a size. When the types differ, the compiler inserts an [[implicit-conversion]] for you. Most are harmless; a few are some of the most common bugs in C++.',
        },
        {
          type: 'table',
          headers: ['Kind', 'Examples', 'Risk'],
          rows: [
            ['Widening', '`int` → `long long`, `float` → `double`, `char` → `int`', 'Safe: every value fits'],
            ['Integer → floating', '`int` → `double`', 'Safe for `double` with 32-bit ints; `float` loses precision above 16,777,216'],
            ['Floating → integer', '`double` → `int`', 'Fraction discarded; out-of-range values are undefined behavior'],
            ['Narrower integer', '`int` → `short`, `long long` → `int`', 'Values that don\'t fit are changed (wrapped)'],
            ['Signed ↔ unsigned', '`int` → `unsigned int`', 'Negative values become huge positive ones'],
          ],
        },
        {
          type: 'code',
          code: `double ratio = 3;        // int -> double: 3.0, safe
int hp = 99.9;           // double -> int: 99, fraction lost
short tiny = 100000;     // int -> short: -31072, value changed
unsigned int u = -1;     // int -> unsigned: 4294967295`,
          annotations: [
            { lines: 1, text: 'A widening conversion. Nothing can be lost.' },
            { lines: 2, text: 'Floating to integer **truncates** towards zero. No rounding, often no warning.' },
            { lines: 3, text: 'Since C++20, conversion to a narrower signed type is defined to keep the low bits (modulo 2¹⁶ here). Before C++20 the result was implementation-defined.' },
            { lines: 4, text: 'Conversion to unsigned is always modulo 2ⁿ: −1 becomes the largest `unsigned int`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why so much happens implicitly',
          text: 'C++ inherited C\'s philosophy: conversions between number types were made automatic so that mixed arithmetic "just works" and maps cleanly onto hardware instructions. The cost is that information can disappear without a trace. Brace initialization (two lessons ago) and `static_cast` (later in this lesson) are the modern tools for making conversions explicit and checked.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Integral promotion',
      blocks: [
        {
          type: 'p',
          text: 'C++ never does arithmetic on types smaller than `int`. Before an operator like `+` is applied, values of type `bool`, `char`, `short` (and their unsigned versions) are converted to `int`. This is called [[integral-promotion]].',
        },
        {
          type: 'code',
          title: 'promotion.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>

int main() {
    std::uint8_t a{200};
    std::uint8_t b{100};
    auto sum = a + b;
    std::uint8_t stored = a + b;
    std::cout << sum << ' ' << sizeof(sum) << '\\n';
    std::cout << static_cast<int>(stored) << '\\n';
}`,
          output: '300 4\n44',
          annotations: [
            { lines: 7, text: 'Both bytes are promoted to `int` before adding, so the sum is the `int` 300. It did not wrap at 255 — and `auto` deduces `int`, as `sizeof` confirms (4 bytes).' },
            { lines: 8, text: 'Storing 300 back into an 8-bit unsigned type keeps it modulo 256: 300 − 256 = 44. GCC gives no warning here with `-Wall -Wextra`.' },
            { lines: 9, text: '`sum` is an `int`, so it prints as a number — unlike a `std::uint8_t`, which would print as a character.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why promote everything to int?',
          text: '`int` is meant to be the size the CPU handles most naturally, and many processors have no instructions for 8- or 16-bit arithmetic at all. Promoting first also protects intermediate results: `a + b` above computes the correct 300 even though neither operand could hold it. The overflow, if any, only happens when you squeeze the result back into a small type.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'The rule for unsigned small types',
          text: 'A small type is promoted to `int` if `int` can hold all its values (true for 8- and 16-bit types on mainstream platforms); otherwise to `unsigned int`. So `std::uint8_t` and `unsigned short` become *signed* `int` — a detail that matters in the next section.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `#include <iostream>

int main() {
    char grade = 'A';
    std::cout << grade + 1 << '\\n';
}`,
      options: [
        { text: '`B`', why: 'That happens when the result is stored back into a `char` (`char next = grade + 1;`). Here the result of `grade + 1` is an `int`.' },
        { text: '`66`', correct: true, why: 'Correct. `grade` is promoted to the `int` 65, plus 1 is the `int` 66, and `std::cout` prints an `int` as a number.' },
        { text: '`A1`', why: '`+` on a character does arithmetic on its code. It never appends text.' },
        { text: 'It does not compile: you cannot add an int to a char', why: 'Characters are integers, and mixing them in arithmetic is perfectly legal — the `char` is simply promoted.' },
      ],
      explanation:
        'Integral promotion turns `grade` into an `int` before the addition, so the whole expression has type `int`. To print the character, convert back: `static_cast<char>(grade + 1)`, or store the result in a `char` variable first.',
    },
    {
      kind: 'concept',
      title: 'The usual arithmetic conversions',
      blocks: [
        {
          type: 'p',
          text: 'When a binary operator such as `+`, `*`, `<` or `==` gets two operands of different arithmetic types, both are converted to a **common type** before the operation. The rules are called the [[usual-arithmetic-conversions]]. Simplified, they are applied in this order:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Floating-point wins', text: 'If either operand is floating-point, the other is converted to the larger floating-point type of the two: `int * double` is computed as `double`, and `float + double` as `double`.' },
            { title: 'Promote small integers', text: 'Otherwise, both operands go through integral promotion: `char`, `short` and `bool` become `int`.' },
            { title: 'Larger wins', text: 'If the types still differ, the operand with the smaller type is converted to the larger one: `int + long long` is computed as `long long`.' },
            { title: 'At equal size, unsigned wins', text: 'If one operand is signed and the other unsigned of the same size, **the signed one is converted to unsigned**: `int + unsigned int` is computed as `unsigned int`.' },
          ],
        },
        {
          type: 'table',
          headers: ['Expression', 'Computed as', 'Result'],
          rows: [
            ['`7 / 2`', '`int`', '`3` (integer division)'],
            ['`7 / 2.0`', '`double`', '`3.5`'],
            ['`damage * 1.5f` (`damage` is `int`)', '`float`', 'a `float`'],
            ['`5 + 2LL`', '`long long`', '`7`'],
            ['`5 + 2u`', '`unsigned int`', '`7`'],
            ['`5u - 10`', '`unsigned int`', '`4294967291` — not −5!'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The last step is the dangerous one',
          text: 'Converting a signed value to unsigned does not fail — it wraps. A negative number becomes a huge positive one. Whenever an expression mixes `int` with `unsigned int` (or with the unsigned size types the standard library uses), any negative value in it is in danger.',
        },
        {
          type: 'deepdive',
          title: 'The full rule',
          blocks: [
            {
              type: 'p',
              text: 'The real rule ranks integer types by size. After promotion: if both are signed or both unsigned, the lower rank converts to the higher. If the unsigned type\'s rank is greater than or equal to the signed type\'s, the signed operand converts to unsigned. Otherwise, if the signed type can represent every value of the unsigned type, the unsigned operand converts to signed. Otherwise both convert to the unsigned version of the signed type.',
            },
            {
              type: 'p',
              text: 'That is why `long long + unsigned int` is `long long` on mainstream platforms (64 bits can represent every 32-bit unsigned value), while `long + unsigned int` is `long` on Linux but `unsigned long` on Windows, where both are 32 bits.',
            },
          ],
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Write the type of each expression, as `auto` would deduce it.',
      template: `auto a = 5 + 2.0;   // a is ___
auto b = 5 + 2LL;   // b is ___
auto c = 5 + 2u;    // c is ___`,
      blanks: [{ answers: ['double'] }, { answers: ['long long', 'long long int'] }, { answers: ['unsigned int', 'unsigned'] }],
      wordBank: ['double', 'long long', 'unsigned int', 'int', 'float'],
      explanation:
        'Floating-point wins, so `5 + 2.0` is a `double`. Between two integer types, the larger wins: `int + long long` is `long long`. At equal size, unsigned wins: `int + unsigned int` is `unsigned int` — which is why `5u - 10` produces 4,294,967,291 instead of −5.',
    },
    {
      kind: 'concept',
      title: 'The signed/unsigned comparison trap',
      blocks: [
        {
          type: 'p',
          text: 'Comparisons use the same conversions as arithmetic. Compare a negative `int` with an `unsigned int`, and the `int` is converted to unsigned first:',
        },
        {
          type: 'code',
          code: `int balance{-5};
unsigned int cost{10};
std::cout << (balance < cost) << '\\n';   // prints 0 (false)!
std::cout << (-1 < 1u) << '\\n';          // prints 0 (false)!`,
          annotations: [
            { lines: 3, text: '`balance` becomes the unsigned value 4,294,967,291, which is **not** less than 10. GCC warns with `-Wall`: "comparison of integer expressions of different signedness".' },
            { lines: 4, text: 'The same trap in miniature: −1 becomes 4,294,967,295.' },
          ],
        },
        {
          type: 'p',
          text: 'This bites most often with sizes. Standard library containers report their size as `std::size_t`, an unsigned type. Comparing a signed index or count against `.size()` mixes signedness — and if the signed value can be negative, the comparison lies.',
        },
        {
          type: 'p',
          text: 'C++20 added comparison functions in `<utility>` that give the mathematically correct answer for any mix of integer types:',
        },
        {
          type: 'code',
          title: 'safe_compare.cpp',
          runnable: true,
          code: `#include <iostream>
#include <utility>

int main() {
    int balance{-5};
    unsigned int cost{10};
    std::cout << std::cmp_less(balance, cost) << '\\n';
    std::cout << (balance < static_cast<int>(cost)) << '\\n';
}`,
          output: '1\n1',
          annotations: [
            { lines: 7, text: '`std::cmp_less(a, b)` is a correct "a < b" for any two integers. There are also `cmp_equal`, `cmp_greater`, `cmp_less_equal` and friends.' },
            { lines: 8, text: 'Alternatively, convert explicitly so both sides are signed — safe here because `cost` is small enough to fit in an `int`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Never ignore -Wsign-compare',
          text: 'GCC and Clang flag these comparisons with `-Wall` (MSVC: warning C4018). Treat the warning as a bug report: either make both sides the same signedness, or use `std::cmp_less` and friends.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'A player who is 20 gold in debt can somehow buy a 50-gold item. Tap the line with the bug.',
      code: `#include <iostream>

int main() {
    int gold{-20};
    unsigned int price{50};
    bool canAfford = gold >= price;
    std::cout << "Can afford: " << canAfford << '\\n';
}`,
      bugLines: [6],
      hint: 'What happens to `gold` when it meets an `unsigned int`?',
      explanation:
        'The comparison on line 6 mixes `int` and `unsigned int`, so the usual arithmetic conversions turn `gold` into an unsigned value: −20 becomes 4,294,967,276, which is indeed ≥ 50. The program prints `Can afford: 1`. Fix it with `std::cmp_greater_equal(gold, price)`, or by keeping both values signed in the first place — which is why prices and balances should not be unsigned.',
    },
    {
      kind: 'concept',
      title: 'Floating-point to integer: truncation',
      blocks: [
        {
          type: 'p',
          text: 'Converting a floating-point value to an integer type **truncates**: the fractional part is discarded, rounding towards zero. 3.7 becomes 3, and −3.7 becomes −3, not −4. If you want rounding, ask for it with the functions in `<cmath>`:',
        },
        {
          type: 'code',
          title: 'rounding.cpp',
          runnable: true,
          code: `#include <cmath>
#include <iostream>

int main() {
    double rawDamage{-3.7};
    std::cout << static_cast<int>(rawDamage) << ' '
              << std::lround(rawDamage) << ' '
              << std::floor(rawDamage) << ' '
              << std::ceil(rawDamage) << '\\n';
}`,
          output: '-3 -4 -4 -3',
          annotations: [
            { lines: 6, text: 'Truncation towards zero: −3.' },
            { lines: 7, text: '`std::lround` rounds to the nearest integer (halfway cases away from zero) and returns a `long`: −4.' },
            { lines: 8, text: '`std::floor` rounds down, towards negative infinity. It returns a `double` (−4.0, printed as `-4`).' },
            { lines: 9, text: '`std::ceil` rounds up, towards positive infinity: −3.0.' },
          ],
        },
        {
          type: 'table',
          headers: ['Value', 'Truncate (`static_cast<int>`)', '`std::lround`', '`std::floor`'],
          rows: [
            ['`2.5`', '2', '3', '2'],
            ['`3.7`', '3', '4', '3'],
            ['`-2.5`', '−2', '−3', '−3'],
            ['`-3.7`', '−3', '−4', '−4'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Out of range is undefined behavior',
          text: 'If the truncated value does not fit in the target type — `static_cast<int>(3.0e10)`, say, or a NaN — the behavior is undefined. It does **not** wrap like integer conversions do. Check the range first if the value could be large, for example a distance or a time computed from user data.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: '`FMath` provides the same operations with explicit names, such as `FMath::RoundToInt`, `FMath::FloorToInt` and `FMath::TruncToInt`. Choosing by name makes your intent obvious — handy when converting a float damage value or a world position to grid cells.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What is the value of `static_cast<int>(-2.9)`?',
      options: [
        { text: '`-3`', why: 'That would be rounding down (`std::floor`) or to nearest (`std::lround`). Conversion to an integer type truncates towards zero.' },
        { text: '`-2.9`', why: 'An `int` cannot hold a fractional part; the conversion has to produce a whole number.' },
        { text: '`-2`', correct: true, why: 'Correct. Truncation discards the fraction, which moves negative numbers *up* towards zero.' },
        { text: 'Undefined behavior, because the value is negative', why: 'Negative values are fine as long as the result fits in an `int`. Only out-of-range values are undefined.' },
      ],
      explanation:
        'Floating-to-integer conversion rounds towards zero, which is a floor for positive numbers but a ceiling for negative ones. Code that converts negative coordinates to grid cells this way puts −0.5 and +0.5 in the same cell — a classic off-by-one bug. Use `std::floor` when you mean "round down".',
    },
    {
      kind: 'concept',
      title: 'Explicit conversions: static_cast',
      blocks: [
        {
          type: 'p',
          text: 'When you *want* a conversion, write it explicitly with [[static-cast|`static_cast<T>(expression)`]]. It converts the value to type `T` if that conversion makes sense — between number types, for example — and refuses dangerous ones at compile time.',
        },
        {
          type: 'code',
          title: 'average.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int totalScore{17};
    int roundsPlayed{4};
    double wrong = totalScore / roundsPlayed;
    double right = static_cast<double>(totalScore) / roundsPlayed;
    std::cout << wrong << ' ' << right << '\\n';
}`,
          output: '4 4.25',
          annotations: [
            { lines: 6, text: 'Both operands are `int`, so the division is integer division (4). Only the *result* is then converted to `double` — too late.' },
            { lines: 7, text: 'Converting one operand first makes the usual arithmetic conversions compute in `double`: 17.0 / 4 = 4.25.' },
          ],
        },
        {
          type: 'heading',
          text: 'Why not C-style casts?',
        },
        {
          type: 'p',
          text: 'C++ also accepts C\'s cast syntax, `(int)value` or `int(value)`. For plain numbers it does the same as `static_cast`. The problem is that a [[c-style-cast]] tries several kinds of conversion in turn and uses the first that compiles — including ones that remove `const` or reinterpret memory as an unrelated type.',
        },
        {
          type: 'compare',
          left: {
            title: 'C-style cast: compiles silently',
            tone: 'bad',
            code: `const int maxHealth{100};
int* p = (int*)&maxHealth;
*p = 9999;  // undefined behavior`,
            text: '`&maxHealth` is the address of `maxHealth` (pointers are Unit 8). The C cast quietly strips `const`, and writing through `p` is undefined behavior.',
          },
          right: {
            title: 'static_cast: refuses',
            tone: 'good',
            code: `const int maxHealth{100};
int* p = static_cast<int*>(&maxHealth);
// error: invalid 'static_cast'`,
            text: '`static_cast` will not remove `const`. The compiler stops you before the bug exists.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why named casts are better',
          text: 'Named casts say *which* conversion you mean, so the compiler can reject anything else. They are also easy to find: searching a code base for `static_cast` is trivial; searching for every `(int)` among millions of parentheses is not. And a C cast that was harmless when written can silently become a reinterpretation after someone changes a type elsewhere.',
        },
        {
          type: 'p',
          text: 'C++ has three more named casts for special jobs, each covered when it becomes relevant: `const_cast` (remove `const` — rarely legitimate), [[reinterpret-cast|`reinterpret_cast`]] (treat bits as another type — low-level code only) and [[dynamic-cast|`dynamic_cast`]] (checked conversion within class hierarchies, Unit 10).',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Casting in Unreal',
          text: 'For engine objects, Unreal provides [[ue-cast|`Cast<T>()`]], which checks at run time — using Unreal\'s reflection system — whether an object really is of the requested type, and returns `nullptr` if not. Never use a C-style cast on Unreal object pointers; for numbers, `static_cast` works exactly as in standard C++.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Why do C++ style guides prefer `static_cast<int>(x)` over `(int)x`?',
      options: [
        { text: '`static_cast` is faster at run time', why: 'For numeric conversions both generate exactly the same machine code. The difference is in what the compiler allows, not in speed.' },
        { text: '`(int)x` is not valid C++', why: 'C-style casts are valid C++, inherited from C. They are discouraged, not forbidden.' },
        { text: '`static_cast` rounds to the nearest integer while `(int)x` truncates', why: 'Both truncate towards zero when converting a floating-point value. Use `std::lround` for rounding.' },
        { text: '`static_cast` only performs sensible conversions and is easy to search for; a C-style cast may silently remove `const` or reinterpret memory', correct: true, why: 'Correct. A C-style cast falls back to more dangerous conversions whenever a safe one does not apply, without telling you.' },
      ],
      explanation:
        'A C-style cast means "convert this, whatever it takes". `static_cast` means "perform this specific, sensible conversion" — and fails to compile otherwise. Explicit intent, compiler checking and searchability are why the C++ Core Guidelines say to prefer named casts.',
    },
    {
      kind: 'concept',
      title: 'Overflow: unsigned wraps, signed is undefined',
      blocks: [
        {
          type: 'p',
          text: 'What happens when arithmetic produces a result too big (or too small) for its type? C++ gives two very different answers, and confusing them causes real bugs. This is [[integer-overflow]].',
        },
        {
          type: 'compare',
          left: {
            title: 'Unsigned: wraps around (defined)',
            tone: 'neutral',
            text: 'Unsigned arithmetic is defined as arithmetic modulo 2ⁿ. Go past the maximum and you continue from zero; go below zero and you continue from the maximum — like a car\'s odometer.',
          },
          right: {
            title: 'Signed: undefined behavior',
            tone: 'bad',
            text: 'If a signed result does not fit, the behavior is undefined. It is **not** guaranteed to wrap — even though C++20 requires two\'s complement representation.',
          },
        },
        {
          type: 'code',
          title: 'wrap.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>

int main() {
    unsigned int arrows{3};
    arrows = arrows - 5;
    std::cout << arrows << '\\n';

    std::uint8_t level{255};
    level = level + 1;
    std::cout << static_cast<int>(level) << '\\n';
}`,
          output: '4294967294\n0',
          annotations: [
            { lines: 6, text: 'Well-defined, and almost certainly not what you wanted: 3 − 5 wraps to 2³² − 2.' },
            { lines: 10, text: '`level + 1` is computed as the `int` 256 (promotion); storing it in 8 bits keeps it modulo 256: 0.' },
          ],
        },
        {
          type: 'code',
          code: `bool scoreWillOverflow(int score) {
    return score + 1 < score;   // compiled as: return false;
}`,
          annotations: [
            { lines: 2, text: 'This tries to detect overflow by causing it. Since signed overflow "cannot happen" in a valid program, GCC at `-O2` reasons that `score + 1` is always greater than `score` and compiles the function to `return false;`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is signed overflow undefined?',
          text: 'Historically, CPUs disagreed about what overflow should do: wrap, trap or saturate, and some did not even use two\'s complement. Leaving it undefined let C run efficiently on all of them. Today the main reason is optimization: assuming `i + 1 > i` for signed integers lets compilers simplify loops and arithmetic. The price is that overflow checks must be written *before* the operation: `if (score > std::numeric_limits<int>::max() - bonus)`.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Level 256',
          text: 'Pac-Man (1980) stores the level number in a single byte. On level 256, the routine that draws the bonus fruit misbehaves when the counter overflows, and the right half of the maze dissolves into garbage — an unwinnable "kill screen". Integer overflow has been breaking games for as long as there have been games.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Defending against overflow',
          text: 'Use a type with room to spare for totals that grow (an `std::int64_t` score cannot realistically overflow). Check before adding. And compile your tests with `-fsanitize=undefined` (UndefinedBehaviorSanitizer), which reports signed overflow at run time — Unit 16 shows how.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Because C++20 requires two\'s complement, adding 1 to the largest `int` is guaranteed to wrap around to the smallest `int`.',
      answer: false,
      explanation:
        'C++20 standardized how signed integers are *represented* (two\'s complement) and made *conversions* to signed types wrap. But overflow in signed *arithmetic* is still undefined behavior, and optimizers rely on that. It may wrap in a debug build and do something completely different at `-O2`. If you need wrap-around, use unsigned types, where it is well-defined.',
    },
    {
      kind: 'mcq',
      multi: true,
      codeOptions: true,
      prompt: 'Assuming 32-bit `int` and C++20, which of these have **well-defined** results? Select all that apply.',
      options: [
        { text: 'unsigned int u{0};\nu = u - 1;', correct: true, why: 'Unsigned arithmetic is modulo 2³²: `u` becomes 4,294,967,295. Defined, if surprising.' },
        { text: 'int i{2147483647};\ni = i + 1;', why: 'Signed arithmetic overflow is undefined behavior, regardless of the representation.' },
        { text: 'std::uint8_t b = 300;', correct: true, why: 'Conversion to an unsigned type is modulo 2ⁿ: `b` holds 300 − 256 = 44.' },
        { text: 'short s = 100000;', correct: true, why: 'Since C++20, converting to a signed type that cannot hold the value is defined to keep the low bits: −31,072. (Before C++20 it was implementation-defined.)' },
        { text: 'int n = static_cast<int>(1e20);', why: 'Floating-to-integer conversion of an out-of-range value is undefined behavior — it does not wrap.' },
      ],
      explanation:
        'The pattern: unsigned arithmetic and conversions to integer types wrap (well-defined), while signed arithmetic overflow and out-of-range floating-to-integer conversions are undefined. Knowing which is which tells you where you need explicit range checks.',
    },
  ],
  takeaways: [
    'Mixed types trigger implicit conversions; widening is safe, while narrowing, floating → integer and signed ↔ unsigned conversions can lose or change values.',
    'Integral promotion: `bool`, `char` and `short` are converted to `int` before arithmetic, so `char + 1` is an `int`.',
    'Usual arithmetic conversions: floating-point wins, then the larger integer type, and at equal size unsigned wins.',
    'Comparing negative signed values with unsigned ones gives wrong answers; heed `-Wsign-compare` and use `std::cmp_less` and friends.',
    'Floating → integer truncates towards zero; use `std::lround`, `std::floor` or `std::ceil` to round deliberately. Out-of-range values are UB.',
    'Use `static_cast` for intentional conversions; C-style casts can silently remove `const` or reinterpret memory.',
    'Unsigned overflow wraps around (defined); signed overflow is undefined behavior, even with C++20\'s two\'s complement guarantee.',
  ],
  reading: [
    {
      title: 'Implicit conversions',
      url: 'https://en.cppreference.com/w/cpp/language/implicit_conversion',
      source: 'cppreference',
      note: 'The complete rules for promotions and conversions between arithmetic types.',
    },
    {
      title: 'Arithmetic operators — conversions',
      url: 'https://en.cppreference.com/w/cpp/language/operator_arithmetic',
      source: 'cppreference',
      note: 'Look for the "usual arithmetic conversions" and the overflow rules.',
    },
    {
      title: 'std::cmp_equal, cmp_less, …',
      url: 'https://en.cppreference.com/w/cpp/utility/intcmp',
      source: 'cppreference',
      note: 'The C++20 functions for comparing integers of different signedness correctly.',
    },
    {
      title: 'Explicit type conversion (casting) and static_cast',
      url: 'https://www.learncpp.com/cpp-tutorial/explicit-type-conversion-casting-and-static-cast/',
      source: 'learncpp',
      note: 'More examples of static_cast and why C-style casts should be avoided.',
    },
    {
      title: 'C++ Core Guidelines: ES.49 — If you must use a cast, use a named cast',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Res-casts-named',
      source: 'core-guidelines',
      note: 'The reasoning against C-style casts, with examples.',
    },
  ],
};
