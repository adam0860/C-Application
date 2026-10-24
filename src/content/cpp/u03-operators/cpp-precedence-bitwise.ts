import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-precedence-bitwise',
  title: 'Precedence, Associativity and Bitwise Operators',
  summary: 'How C++ groups an expression, why grouping is not evaluation order, the i++ + i++ trap, and how games pack dozens of yes/no flags into a single integer with bitwise operators.',
  minutes: 18,
  objectives: [
    'Predict how an expression is grouped using precedence and associativity',
    'Distinguish grouping from evaluation order, and avoid unsequenced-modification undefined behavior',
    'Use parentheses to make intent explicit where precedence is surprising',
    'Apply `&`, `|`, `^`, `~`, `<<` and `>>` to set, clear, toggle and test bit flags',
    'Recognise undefined and surprising shifts, and choose unsigned types for bit manipulation',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Precedence: who grabs the operands first',
      blocks: [
        {
          type: 'p',
          text: 'In `2 + 3 * 4`, does the `3` belong to the `+` or to the `*`? C++ answers with [[precedence]]: operators with higher precedence bind their operands more tightly. `*` outranks `+`, so the expression is grouped as `2 + (3 * 4)` and evaluates to 14, just like in school maths.',
        },
        {
          type: 'p',
          text: 'C++ has around 17 precedence levels. Nobody memorises all of them, but knowing the broad bands saves you from real bugs. Here they are from **tightest** to **loosest**:',
        },
        {
          type: 'table',
          headers: ['Level', 'Operators', 'Example'],
          rows: [
            ['Postfix', '`a++  a--  f()  a[i]  .  ->`', '`scores[i]++`'],
            ['Unary', '`++a  --a  -a  !a  ~a  *p  &x` casts, `sizeof`', '`-hp`, `!isDead`'],
            ['Multiplicative', '`*  /  %`', '`dmg * 2`'],
            ['Additive', '`+  -`', '`base + bonus`'],
            ['Shift', '`<<  >>`', '`1u << n`'],
            ['Three-way', '`<=>`', '`a <=> b`'],
            ['Relational', '`<  <=  >  >=`', '`hp < 20`'],
            ['Equality', '`==  !=`', '`ammo == 0`'],
            ['Bitwise AND', '`&`', '`flags & kMask`'],
            ['Bitwise XOR', '`^`', '`flags ^ kMask`'],
            ['Bitwise OR', '`|`', '`kA | kB`'],
            ['Logical AND', '`&&`', '`a && b`'],
            ['Logical OR', '`||`', '`a || b`'],
            ['Assignment, ternary', '`=  +=  -=  …  ?:`', '`x = y + 1`'],
            ['Comma', '`,`', '`++i, --j`'],
          ],
          caption: 'Higher rows bind tighter. A useful shorthand: unary, then arithmetic, then shifts, then comparisons, then bitwise, then logical, then assignment.',
        },
        {
          type: 'code',
          title: 'precedence.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int base = 10;
    int bonus = 4;
    int mult = 3;

    std::cout << base + bonus * mult << '\\n';
    std::cout << (base + bonus) * mult << '\\n';
    std::cout << -base * mult << '\\n';
    std::cout << std::boolalpha;
    std::cout << (base + bonus > 12) << '\\n';
}`,
          output: `22
42
-30
true`,
          annotations: [
            { lines: 8, text: '`*` binds tighter than `+`: `10 + (4 * 3)` is 22.' },
            { lines: 9, text: 'Parentheses override precedence: `(10 + 4) * 3` is 42.' },
            { lines: 10, text: 'Unary minus binds tighter than `*`: `(-10) * 3`. (Here the answer would be the same either way.)' },
            { lines: 12, text: 'Arithmetic binds tighter than comparison, so this is `(base + bonus) > 12`. The outer parentheses are needed only because `<<` outranks `>`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have precedence at all?',
          text: 'Without precedence rules every expression would need full parentheses — `(a + (b * c))` — or be read strictly left to right, which would make `2 + 3 * 4` equal 20 and contradict centuries of mathematical notation. C++ inherited most of its table from C, which matched maths for arithmetic and then slotted the newer operators in around it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'What is the value of `1 + 2 * 3 - 4 / 2`?',
      options: [
        { text: '`2`', why: 'That is what strict left-to-right evaluation gives: ((1 + 2) * 3 - 4) / 2 = 2.5, truncated to 2. C++ does not work left to right across precedence levels.' },
        { text: '`5`', correct: true, why: '`*` and `/` bind first: `1 + 6 - 2`. Then `+` and `-`, left to right: 7 - 2 = 5.' },
        { text: '`7`', why: 'This forgets the `- 4 / 2` part, or evaluates `- 4` before the division. Division binds tighter than subtraction.' },
        { text: '`4.5`', why: 'All operands are `int`, so `4 / 2` is integer division and the result is an `int`. There is no fractional part.' },
      ],
      explanation:
        'Multiplicative operators (`* / %`) outrank additive ones (`+ -`), so the expression is grouped as `1 + (2 * 3) - (4 / 2)`. Operators of equal precedence are then grouped by associativity — left to right for `+` and `-` — giving `(1 + 6) - 2 == 5`.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Associativity, and why grouping is not order',
      blocks: [
        {
          type: 'p',
          text: 'Precedence cannot settle `100 / 10 / 2`, because both operators have the same level. That is the job of [[associativity]]. Most binary operators are **left-associative**: `100 / 10 / 2` means `(100 / 10) / 2`, which is 5 — not `100 / (10 / 2)`, which would be 20.',
        },
        {
          type: 'table',
          headers: ['Associativity', 'Operators', 'Example', 'Grouped as'],
          rows: [
            ['Left to right', 'most binary operators', '`a - b - c`', '`(a - b) - c`'],
            ['Right to left', 'assignment `= += …`', '`a = b = 0`', '`a = (b = 0)`'],
            ['Right to left', 'unary `- ! ~ ++a`', '`!-x`', '`!(-x)`'],
            ['Right to left', 'ternary `?:`', '`a ? b : c ? d : e`', '`a ? b : (c ? d : e)`'],
          ],
        },
        {
          type: 'p',
          text: 'Right-to-left assignment is what makes `health = shield = 100;` work: `shield = 100` runs first, produces 100, and that value is assigned to `health`.',
        },
        {
          type: 'heading',
          text: 'Grouping is not evaluation order',
        },
        {
          type: 'p',
          text: 'This is the most misunderstood point in this lesson. Precedence and associativity decide **which operands belong to which operator** — the shape of the expression tree. They do **not** decide the order in which the operands themselves are computed. In `spawnBoss() + spawnMinion() * waveSize()`, the multiplication is grouped first, but the three function calls may run in **any order**: the compiler can call `spawnBoss()` first, last, or in between.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why leave the order unspecified?',
          text: 'Freedom to choose the evaluation order lets the compiler schedule work in whatever order uses CPU registers best, avoids storing temporaries, and keeps independent calculations running in parallel inside the CPU. C++ only promises an order where programmers really need one: `&&`, `||`, the comma operator, `?:`, and (since C++17) assignment, `<<`, `>>` and `a[b]`. Everywhere else, write code whose result does not depend on order.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'In `a() + b() * c()`, the function `b` is always called before `a`, because `*` has higher precedence than `+`.',
      answer: false,
      explanation:
        'Precedence only decides the grouping: the result of `b() * c()` is added to the result of `a()`. The three calls can happen in any order the compiler chooses (C++ calls this *unspecified*). If the functions print, modify shared state or depend on each other, store their results in separate variables first so the order is explicit.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'When in doubt, add parentheses',
      blocks: [
        {
          type: 'p',
          text: 'The arithmetic part of the precedence table matches your intuition. The rest of it — shifts, bitwise operators, `&&` versus `||` — frequently does not. Parentheses cost nothing at run time, and they turn "I think I remember the table" into "the code says exactly what I mean".',
        },
        {
          type: 'table',
          headers: ['You write', 'C++ reads', 'You probably meant'],
          rows: [
            ['`1 << n + 1`', '`1 << (n + 1)`', '`(1 << n) + 1`'],
            ['`flags & kMask == 0`', '`flags & (kMask == 0)`', '`(flags & kMask) == 0`'],
            ['`a || b && c`', '`a || (b && c)`', 'often `(a || b) && c`'],
            ['`std::cout << x & 1`', '`(std::cout << x) & 1`', '`std::cout << (x & 1)`'],
            ['`next = cur + 1 % count`', '`next = cur + (1 % count)`', '`next = (cur + 1) % count`'],
          ],
        },
        {
          type: 'p',
          text: 'GCC and Clang warn about several of these with `-Wall` ("suggest parentheses around …"). Treat that warning as a gift: it means another programmer reading the line would also have to stop and think.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Why is & weaker than ==?',
          text: 'Dennis Ritchie explained it himself: early C had no `&&` or `||`, and `&` and `|` served double duty for both bit operations and logic, so they were placed below comparisons to make `if (a == b & c == d)` work. When `&&` and `||` were added, changing the precedence of `&` would have silently broken existing code, so it stayed. Fifty years later, `flags & kMask == 0` still bites.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'A practical rule',
          text: 'You may rely on precedence for arithmetic (`* / %` over `+ -`), for comparisons below arithmetic, and for `&&` and `||` below comparisons. Add parentheses whenever you mix shifts or bitwise operators with anything else, or mix `&&` with `||`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: 'What does `1 << 2 + 1` evaluate to?',
      options: [
        { text: '`5`', why: 'That would be `(1 << 2) + 1` = 4 + 1. But `+` binds tighter than `<<`, so the addition happens first.' },
        { text: '`3`', why: '`<<` is a shift, not an addition: `1 << 3` moves the single 1 bit three places left.' },
        { text: '`8`', correct: true, why: 'Additive operators outrank shifts, so it is `1 << (2 + 1)` = `1 << 3` = 8.' },
        { text: 'It does not compile', why: 'It compiles (GCC only warns, suggesting parentheses). Precedence silently decides the grouping.' },
      ],
      explanation:
        'Shifts sit below the arithmetic operators in the precedence table. That ordering makes `1 << n + 1` mean "shift by n + 1" — rarely what someone writing flag code intends. Parenthesise every shift that sits next to arithmetic: `(1 << 2) + 1` or `1 << (2 + 1)`.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Unsequenced modification: the i++ + i++ trap',
      blocks: [
        {
          type: 'p',
          text: 'Since the order of evaluating operands is usually unspecified, what happens if two parts of an expression modify the **same** variable? Consider `i++ + i++`. Each `i++` both reads `i` and writes it. The standard says these operations are **unsequenced** — neither is guaranteed to happen before the other — and when two unsequenced operations touch the same variable and at least one writes to it, the behavior is undefined. See [[unsequenced-modification]].',
        },
        {
          type: 'code',
          code: `int i = 0;
int a = i++ + i++;      // undefined behavior
int b = i + i++;        // undefined: read and write unsequenced
std::cout << i++ << ' ' << i++;  // OK since C++17
i = i++;                // OK since C++17, but pointless`,
          annotations: [
            { lines: 2, text: 'Not "unclear whether it is 0 or 1": genuinely [[undefined-behavior]]. The compiler may produce any value, and optimizers are allowed to assume this never happens.' },
            { lines: 3, text: 'Reading `i` on one side while the other side modifies it is just as undefined.' },
            { lines: 4, text: 'C++17 made the left operand of `<<` and `>>` sequenced before the right, so stream chains print in left-to-right order. Before C++17 this was undefined too.' },
            { lines: 5, text: 'C++17 sequences the right side of `=` before the assignment, so this leaves `i` unchanged. Well-defined, but it is a code smell.' },
          ],
        },
        {
          type: 'p',
          text: 'GCC warns about many of these with `-Wall` (*operation on \'i\' may be undefined*), but not all of them, and runtime tools rarely catch them. The reliable defence is a simple habit: **modify a variable at most once per expression, and do not read it elsewhere in an expression that modifies it.** Put increments on their own line.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just define it?',
          text: 'Defining `i++ + i++` would force the compiler to perform every read and write in one fixed order, even in the 99.9% of expressions where order cannot matter, giving up the scheduling freedom described earlier. C++ chose speed for correct code over "a result" for confusing code. C++17 tightened the rules only where real-world code commonly depended on an order, such as stream output chains.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Function arguments',
          text: 'In `spawn(id++, id++)` the two arguments are evaluated in an unspecified order. Since C++17 that is no longer undefined behavior — each argument is evaluated completely before the other starts — but you still cannot know which argument gets which value. GCC on x86 often evaluates right to left; MSVC may differ. Never depend on it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'bug',
      prompt: 'A combo system computes a bonus, and gives different results with different compilers and optimisation levels. Tap the line with undefined behavior.',
      code: `#include <iostream>

int main() {
    int combo = 1;
    int bonus = combo++ * 10 + combo++;
    std::cout << "Bonus: " << bonus << '\\n';
    std::cout << "Combo: " << combo << '\\n';
}`,
      bugLines: [5],
      hint: 'How many times is `combo` modified in a single expression?',
      explanation:
        'Line 5 modifies `combo` twice in one expression with no sequencing between the two `combo++`, which is undefined behavior — the result can change between compilers, optimisation levels or even unrelated edits. Split it into explicit steps: `int first = combo++; int second = combo++; int bonus = first * 10 + second;`. Now the order is spelled out and every compiler agrees.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Thinking in bits: & | ^ ~ << >>',
      blocks: [
        {
          type: 'p',
          text: 'Integers are stored as binary digits (bits). The [[bitwise-operator|bitwise operators]] work on those bits directly, column by column, without any carrying between columns. You can write binary literals with the `0b` prefix and group digits with `\'` separators (both C++14) to make patterns readable.',
        },
        {
          type: 'table',
          headers: ['Operator', 'Name', 'Each result bit is 1 when…'],
          rows: [
            ['`a & b`', 'AND', 'both bits are 1'],
            ['`a | b`', 'OR', 'at least one bit is 1'],
            ['`a ^ b`', 'XOR (exclusive or)', 'the bits differ'],
            ['`~a`', 'NOT (complement)', 'the bit in `a` is 0 (every bit flips)'],
            ['`a << n`', 'left shift', 'bits move n places left; zeros fill from the right'],
            ['`a >> n`', 'right shift', 'bits move n places right'],
          ],
        },
        {
          type: 'code',
          title: 'bits.cpp',
          runnable: true,
          code: `#include <bitset>
#include <iostream>

int main() {
    unsigned int a = 0b1100'1010;
    unsigned int b = 0b1010'0110;

    std::cout << std::bitset<8>(a) << "  a\\n";
    std::cout << std::bitset<8>(b) << "  b\\n";
    std::cout << std::bitset<8>(a & b) << "  a & b\\n";
    std::cout << std::bitset<8>(a | b) << "  a | b\\n";
    std::cout << std::bitset<8>(a ^ b) << "  a ^ b\\n";
    std::cout << std::bitset<8>(~a) << "  ~a\\n";
    std::cout << std::bitset<8>(a << 1) << "  a << 1\\n";
    std::cout << std::bitset<8>(a >> 2) << "  a >> 2\\n";
}`,
          output: `11001010  a
10100110  b
10000010  a & b
11101110  a | b
01101100  a ^ b
00110101  ~a
10010100  a << 1
00110010  a >> 2`,
          annotations: [
            { lines: 1, text: '`std::bitset<N>` from `<bitset>` is a fixed-size set of N bits. Here we only use it to **print** a value as binary digits.' },
            { lines: '5-6', text: 'Binary literals; the `\'` digit separator is ignored by the compiler and just aids reading. We use `unsigned` because bit manipulation on unsigned types has no sign-related surprises.' },
            { lines: 13, text: '`~a` flips all 32 bits of the `unsigned int`; `bitset<8>` shows only the lowest 8.' },
            { lines: 14, text: 'The top 1 bit moved to bit 8, beyond the 8 bits shown. Shifting left by one doubles an unsigned value (202 → 404).' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Bitwise is not logical',
          text: '`&` and `|` look like `&&` and `||` but are different operators. `6 && 3` is `true` (both non-zero), while `6 & 3` is `2` (binary `110 & 011 = 010`). Bitwise operators also never short-circuit: both sides are always evaluated.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `std::cout << (6 & 3) << ' ' << (6 | 3) << ' '
          << (6 ^ 3) << '\\n';`,
      options: [
        { text: '`1 1 0`', why: 'That treats `&` and `|` like the logical operators `&&` and `||`. Bitwise operators combine individual bits and return an integer.' },
        { text: '`2 7 7`', why: 'XOR sets a bit only when the inputs **differ**. The middle bit is 1 in both 6 and 3, so XOR clears it: the result is 5, not 7.' },
        { text: '`2 7 5`', correct: true, why: '6 is `110` and 3 is `011`. AND keeps the shared bit (`010` = 2), OR keeps any bit (`111` = 7), XOR keeps differing bits (`101` = 5).' },
        { text: '`9 9 3`', why: 'Bitwise operators never add or subtract; they work column by column with no carries.' },
      ],
      explanation:
        'Write the numbers in binary and work column by column: `110` vs `011`. Notice that `a | b == (a & b) + (a ^ b)` here (7 = 2 + 5): OR is "shared bits plus differing bits". Converting small numbers to binary in your head is a skill worth practising — you will need it for flags and masks.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Bit flags and masks in games',
      blocks: [
        {
          type: 'p',
          text: 'The killer application of bitwise operators is the [[bit-mask]]: one integer whose bits each represent an independent yes/no option. Give each option its own bit — a power of two, written `1u << n` — and you can store 32 abilities in a 32-bit integer, combine them with `|`, and test any group of them with a single `&`.',
        },
        {
          type: 'code',
          title: 'abilities.cpp',
          runnable: true,
          code: `#include <bitset>
#include <cstdint>
#include <iostream>

constexpr std::uint32_t kCanJump   = 1u << 0;  // 0001
constexpr std::uint32_t kCanDash   = 1u << 1;  // 0010
constexpr std::uint32_t kCanGlide  = 1u << 2;  // 0100
constexpr std::uint32_t kInvisible = 1u << 3;  // 1000

int main() {
    std::uint32_t abilities = kCanJump | kCanGlide;
    std::cout << std::bitset<8>(abilities) << '\\n';

    abilities |= kCanDash;     // set: unlock dash
    abilities &= ~kCanGlide;   // clear: lose glide
    abilities ^= kInvisible;   // toggle invisibility
    std::cout << std::bitset<8>(abilities) << '\\n';

    std::cout << std::boolalpha;
    std::cout << "Dash?  " << ((abilities & kCanDash) != 0) << '\\n';
    std::cout << "Glide? " << ((abilities & kCanGlide) != 0) << '\\n';

    std::uint32_t needed = kCanJump | kCanDash;
    std::cout << "Both?  " << ((abilities & needed) == needed) << '\\n';
}`,
          output: `00000101
00001011
Dash?  true
Glide? false
Both?  true`,
          annotations: [
            { lines: '5-8', text: 'Each flag is a different power of two, so their bits never overlap. `std::uint32_t` (from `<cstdint>`) is an unsigned type of exactly 32 bits. `constexpr` makes each flag a compile-time constant.' },
            { lines: 11, text: '**Combine** flags with `|`: the result has the bits of both.' },
            { lines: 14, text: '**Set** a flag: OR it in. Already set? Nothing changes.' },
            { lines: 15, text: '**Clear** a flag: `~kCanGlide` is all ones except the glide bit; ANDing keeps every other bit and forces that one to 0.' },
            { lines: 16, text: '**Toggle** a flag: XOR flips just that bit.' },
            { lines: 20, text: '**Test** a flag: AND isolates its bit; non-zero means it is set. The inner parentheses are essential (see the warning below).' },
            { lines: '23-24', text: '**Test several at once**: `(flags & needed) == needed` means "has all of them"; `(flags & needed) != 0` would mean "has any of them".' },
          ],
        },
        {
          type: 'p',
          text: 'Collision layers work the same way. Give every object a `layer` bit (Player, Enemy, Projectile, Pickup…) and a `collidesWith` mask. Two objects interact when `(a.collidesWith & b.layer) != 0` — one AND instruction replaces a pile of `if` statements, and designers can change who hits whom just by editing masks.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just use 32 bool variables?',
          text: 'A mask is compact (32 flags in 4 bytes instead of 32), copies and compares in one instruction, can be tested against **groups** of flags at once, and is cheap to save to disk or send over the network — multiplayer games replicate state like this to save bandwidth. It also keeps related options together as a single value you can pass around.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The precedence trap, again',
          text: '`abilities & kCanDash != 0` parses as `abilities & (kCanDash != 0)`, which is `abilities & 1` — it tests the **jump** bit. Always write `(abilities & kCanDash) != 0`.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Flags in Unreal Engine',
          text: 'Unreal declares flag sets as `enum class` types and adds the bitwise operators with the `ENUM_CLASS_FLAGS(EMyFlags)` macro, then tests them with helpers like `EnumHasAnyFlags` and `EnumHasAllFlags`. A `UPROPERTY` can even show an integer as a checkbox list in the editor using the `Bitmask` and `BitmaskEnum` metadata. Engine-wide, collision object types, rendering options and replication conditions are all stored as bit masks.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'fill',
      prompt: 'Status effects are stored as bit flags in `status`. Set the stunned flag, clear the poisoned flag, then test the slowed flag.',
      template: `status ___ kStunned;
status ___ ~kPoisoned;
bool slowed = (status ___ kSlowed) != 0;`,
      blanks: [{ answers: ['|='] }, { answers: ['&='] }, { answers: ['&'] }],
      wordBank: ['|=', '&=', '&', '^=', '&&', '+=', '|'],
      explanation:
        'OR-assign sets a bit without disturbing the others. AND-assign with the complement (`~kPoisoned`, all ones except that bit) clears exactly one bit. AND isolates a bit for testing. `^=` would toggle (so it could turn a flag **on** when you meant off), `+=` breaks as soon as the flag is already set (adding carries into the next bit), and `&&` would reduce everything to `true`/`false`.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Shifts: fast, handy and full of edge cases',
      blocks: [
        {
          type: 'p',
          text: 'For unsigned values, `x << n` multiplies by 2ⁿ (bits pushed off the top are lost) and `x >> n` divides by 2ⁿ, rounding down (zeros come in from the left). Shifts are how you build flags (`1u << n`), pack small values into one integer, and extract fields from packed data. They also hide several traps.',
        },
        {
          type: 'code',
          title: 'shifts.cpp',
          runnable: true,
          code: `#include <bit>
#include <cstdint>
#include <iostream>

int main() {
    std::uint32_t x = 5;
    std::cout << (x << 3) << ' ' << (x >> 1) << '\\n';

    std::uint64_t layer40 = std::uint64_t{1} << 40;
    std::cout << layer40 << '\\n';

    std::uint8_t small = 0x80;
    std::cout << (small << 1) << '\\n';

    std::cout << (-7 >> 1) << '\\n';

    std::uint32_t mask = 0b1011'0000;
    std::cout << std::popcount(mask) << ' '
              << std::countr_zero(mask) << '\\n';
}`,
          output: `40 2
1099511627776
256
-4
3 4`,
          annotations: [
            { lines: 7, text: '5 × 2³ = 40, and 5 / 2 = 2 (rounded down).' },
            { lines: 9, text: '`1 << 40` would shift a 32-bit `int` by more than its width — undefined behavior. Make the **left operand** 64 bits wide first.' },
            { lines: 13, text: 'Surprise: `small` is promoted to `int` before shifting ([[integral-promotion]]), so the bit is not lost — the result is the `int` 256. Store it back into a `std::uint8_t` and you get 0.' },
            { lines: 15, text: 'Right-shifting a negative number: since C++20 this is an arithmetic shift that rounds toward negative infinity (-3.5 → -4). Before C++20 it was implementation-defined.' },
            { lines: '18-19', text: 'C++20\'s `<bit>` header has ready-made, fast bit utilities: `std::popcount` counts 1 bits, `std::countr_zero` counts trailing zeros (here: the index of the lowest set bit). They require unsigned types.' },
          ],
        },
        {
          type: 'table',
          headers: ['Shift', 'Status'],
          rows: [
            ['Shift count ≥ width of the (promoted) left operand, e.g. `1 << 32` on 32-bit `int`', '**Undefined behavior**, in every standard'],
            ['Negative shift count, e.g. `x << -1`', '**Undefined behavior**'],
            ['Left-shifting a negative value, e.g. `-1 << 1`', 'UB before C++20; since C++20 well-defined (`-2`)'],
            ['Right-shifting a negative value, e.g. `-7 >> 1`', 'Implementation-defined before C++20; since C++20 arithmetic (`-4`)'],
            ['`1 << 31` on 32-bit `int`', 'Since C++20 gives `INT_MIN`, a negative number — legal but surprising'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why was signed shifting so loosely defined?',
          text: 'Until C++20 the standard allowed three representations of negative integers (two\'s complement, ones\' complement, sign-magnitude), and shifting a negative value means different things on each. C++20 finally required two\'s complement — what every real CPU has used for decades — and could then define signed shifts. The shift-count rule stays undefined because CPUs genuinely disagree: x86 masks a 32-bit shift count to 5 bits (so `1 << 32` gives 1), while others, such as 32-bit ARM, produce 0.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Rules for bit manipulation',
          text: 'Use **unsigned** fixed-width types (`std::uint32_t`, `std::uint64_t`) for masks and shifts. Make literal flags unsigned (`1u << n`), and wide enough for the bit you need (`std::uint64_t{1} << n` for bits 32–63). Parenthesise every shift and bitwise operation that sits next to another operator.',
        },
        {
          type: 'deepdive',
          title: 'Bit-fields: Unreal\'s compact bools',
          blocks: [
            {
              type: 'p',
              text: 'C++ also lets a struct member occupy a chosen number of bits, called a **bit-field**: `std::uint8_t bIsDead : 1;`. The compiler then does the masking and shifting for you. Unreal uses this heavily for `bool`-like properties (`uint8 bCanJump : 1;`), packing eight flags into one byte. You cannot take the address of a bit-field, and the exact layout is implementation-defined, so they are for compact storage, not for file formats or network packets.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'On a platform where `int` is 32 bits, compiled as C++20, which shift has undefined behavior?',
      codeOptions: true,
      options: [
        { text: '1u << 31', why: 'Shifting an `unsigned` 1 into bit 31 is fine: the result is 2147483648u.' },
        { text: 'std::uint64_t{1} << 40', why: 'The left operand is 64 bits wide, so a count of 40 is within range.' },
        { text: '-8 >> 1', why: 'Since C++20 this is well-defined as an arithmetic shift and gives -4. (Before C++20 it was implementation-defined, but still not undefined.)' },
        { text: '1 << 32', correct: true, why: '`1` is a 32-bit `int`, and a shift count equal to or greater than the operand\'s width is undefined behavior in every C++ standard.' },
      ],
      explanation:
        'The shift-count rule is the one that never went away: the count must be non-negative and less than the bit width of the promoted left operand. C++20 cleaned up signed shifts (now well-defined thanks to mandatory two\'s complement), but `1 << 32` is still undefined because hardware handles over-long shifts differently. Widen the left operand when you need high bits.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'order',
      prompt: 'Order these operators from **highest** precedence (binds tightest) to **lowest**.',
      lines: ['*', '+', '<<', '<', '==', '&', '&&'],
      explanation:
        'Arithmetic first (multiplicative above additive), then shifts, then relational comparisons, then equality, then bitwise AND, then logical AND. The two surprises worth remembering are that shifts sit **below** `+`, and bitwise `&` sits **below** `==` — the two places where precedence most often disagrees with intuition.',
    },
  ],
  takeaways: [
    'Precedence decides which operands belong to which operator; associativity breaks ties (left to right for most binary operators, right to left for assignment, unary and `?:`).',
    'Grouping is not evaluation order: the operands of most operators may be evaluated in any order.',
    'Modifying a variable twice, or reading and modifying it, in one expression (`i++ + i++`) is undefined behavior. Keep increments on their own line.',
    'Shifts sit below `+`, and `&` `^` `|` sit below `==`: parenthesise every bitwise or shift expression that mixes with other operators.',
    'Bit flags: combine with `|`, set with `|=`, clear with `&= ~flag`, toggle with `^=`, test with `(flags & flag) != 0`.',
    'Use unsigned fixed-width types for bit work, and never shift by a negative count or by the operand\'s width or more.',
  ],
  reading: [
    {
      title: 'C++ operator precedence',
      url: 'https://en.cppreference.com/w/cpp/language/operator_precedence',
      source: 'cppreference',
      note: 'The complete precedence and associativity table — worth bookmarking.',
    },
    {
      title: 'Order of evaluation',
      url: 'https://en.cppreference.com/w/cpp/language/eval_order',
      source: 'cppreference',
      note: 'The precise sequencing rules, including everything C++17 changed, with examples of undefined behavior.',
    },
    {
      title: 'Bit manipulation with bitwise operators and bit masks',
      url: 'https://www.learncpp.com/cpp-tutorial/bit-manipulation-with-bitwise-operators-and-bit-masks/',
      source: 'learncpp',
      note: 'More bit-mask practice, including masks that cover several bits at once.',
    },
    {
      title: 'Bit manipulation header <bit>',
      url: 'https://en.cppreference.com/w/cpp/header/bit',
      source: 'cppreference',
      note: 'C++20 utilities such as `std::popcount`, `std::has_single_bit` and `std::rotl`.',
    },
    {
      title: 'Operator precedence and associativity',
      url: 'https://www.learncpp.com/cpp-tutorial/operator-precedence-and-associativity/',
      source: 'learncpp',
      note: 'A beginner-friendly treatment of the same table with extra worked examples.',
    },
  ],
};
