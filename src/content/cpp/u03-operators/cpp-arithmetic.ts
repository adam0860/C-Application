import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-arithmetic',
  title: 'Arithmetic Operators',
  summary: 'The five arithmetic operators, increment and compound assignment, and the integer, remainder and division-by-zero surprises hiding in each.',
  minutes: 16,
  objectives: [
    'Predict the result of `/` and `%` for any mix of positive, negative, integer and floating-point operands',
    'Avoid the integer-division trap when computing averages and ratios',
    'Explain the difference between `++i` and `i++` and why `++i` is the better habit',
    'Use compound assignment and recognise when it silently truncates',
    'Describe what happens when you divide by zero for integers versus IEEE 754 floating-point types',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Five operators, one surprise each',
      blocks: [
        {
          type: 'p',
          text: 'C++ has five binary arithmetic [[operator|operators]]: `+` (add), `-` (subtract), `*` (multiply), `/` (divide) and `%` (remainder). Each takes two [[operand|operands]] and produces a new value. Combine operators, variables and literals and you get an [[expression]] — something that evaluates to a value, like `baseDamage * 2 + bonus`.',
        },
        {
          type: 'code',
          title: 'damage.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int baseDamage = 40;
    int bonus = 15;
    int critMultiplier = 2;

    std::cout << "Sum:  " << baseDamage + bonus << '\\n';
    std::cout << "Diff: " << baseDamage - bonus << '\\n';
    std::cout << "Crit: " << baseDamage * critMultiplier << '\\n';
    std::cout << "Half: " << baseDamage / 2 << '\\n';
    std::cout << "Rem:  " << baseDamage % 7 << '\\n';
    std::cout << "Neg:  " << -bonus << '\\n';
}`,
          output: `Sum:  55
Diff: 25
Crit: 80
Half: 20
Rem:  5
Neg:  -15`,
          annotations: [
            { lines: '8-10', text: 'Each expression is evaluated first, then its result is inserted into `std::cout`. The variables themselves are not changed: `baseDamage + bonus` produces a brand-new value.' },
            { lines: 11, text: '40 / 2 divides evenly, so nothing surprising yet. The next card shows what happens when it does not.' },
            { lines: 12, text: '`%` gives the **remainder** after division: 40 = 5 × 7 + **5**.' },
            { lines: 13, text: '`-` with one operand is **unary minus**: it negates. There is also a (rarely useful) unary `+`.' },
          ],
        },
        {
          type: 'p',
          text: 'That looks like school maths, and for `+`, `-` and `*` it mostly is. The surprises come from the fact that C++ arithmetic is done on **types**, not on abstract numbers. The type of the operands decides which machine instruction runs, and therefore what the answer is. Over the next cards you will meet one surprise per operator: integer division, negative remainders, mixed types, increment order and division by zero.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the type decides the result',
          text: 'A CPU has separate instructions for integer arithmetic and floating-point arithmetic, and they behave differently (an integer divide cannot produce 3.5 — there is nowhere to store the .5). C++ is designed to map each operator directly onto one fast instruction, so it picks the instruction from the operand types at [[compile-time]]. You get raw hardware speed; the price is that you must know which instruction you asked for.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Small types are promoted first',
          text: 'Before arithmetic happens, operands smaller than `int` (`char`, `short`, `bool`) are converted to `int` — this is [[integral-promotion]]. So adding two `char`s gives an `int`. You met the full conversion rules in the previous unit; just remember that arithmetic never happens "in" a `char`.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Results can overflow',
          text: 'An `int` has a fixed range (typically about ±2.1 billion). If `+`, `-` or `*` on signed integers produces a value outside that range, that is [[integer-overflow]] — [[undefined-behavior]], not a neat wrap-around. Multiplying two large scores or accumulating damage over a long session are classic ways to hit it. Use a wider type such as `long long` when values can grow large.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'Which line fails to compile?',
      codeOptions: true,
      options: [
        { text: 'int r = 17 % 5;', why: 'Both operands are integers, so `%` is fine: the remainder is 2.' },
        { text: 'double d = 7.5 / 2;', why: 'Division works for floating-point types; the `2` is converted to `double` and the result is 3.75.' },
        { text: 'double r = 7.5 % 2;', correct: true, why: 'The built-in `%` only accepts integer operands. GCC reports "invalid operands of types \'double\' and \'int\' to binary \'operator%\'". Use `std::fmod` from `<cmath>` for floating-point remainders.' },
        { text: 'int n = -(3 * 4);', why: 'Unary minus applied to an integer expression is perfectly valid: `n` becomes -12.' },
      ],
      explanation:
        'The remainder operator is defined only for integer types, because "remainder" falls out of the integer divide instruction for free. For floating-point values the standard library provides `std::fmod(7.5, 2.0)` (which returns 1.5) instead of overloading `%`.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Integer division truncates toward zero',
      blocks: [
        {
          type: 'p',
          text: 'When **both** operands of `/` are integers, the result is an integer too. The fractional part is simply thrown away — not rounded. This is [[integer-division]], and since C++11 the rule is precise: the result is **truncated toward zero**. So `7 / 2` is `3`, and `-7 / 2` is `-3` (not `-4`).',
        },
        {
          type: 'code',
          title: 'kd_ratio.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    std::cout << 7 / 2 << '\\n';
    std::cout << -7 / 2 << '\\n';
    std::cout << 7 / -2 << '\\n';
    std::cout << 1 / 3 << '\\n';

    int kills = 7;
    int deaths = 2;
    double wrong = kills / deaths;
    double right = static_cast<double>(kills) / deaths;
    std::cout << "K/D wrong: " << wrong << '\\n';
    std::cout << "K/D right: " << right << '\\n';
}`,
          output: `3
-3
-3
0
K/D wrong: 3
K/D right: 3.5`,
          annotations: [
            { lines: '4-7', text: 'Every result is an `int`. 3.5 becomes 3, -3.5 becomes -3 (toward zero, not down), and 0.333… becomes 0.' },
            { lines: 11, text: 'The trap: `kills / deaths` is computed **as integers** first (giving 3), and only then converted to `double` for storage. The `double` on the left does not change how the right side is evaluated.' },
            { lines: 12, text: 'The fix: convert one operand **before** dividing. With a `double` on one side, the other is converted too and you get floating-point division. [[static-cast]] makes the conversion explicit.' },
          ],
          highlight: [11],
        },
        {
          type: 'p',
          text: 'Two integers can be recovered from any integer division: the quotient `a / b` and the remainder `a % b`. C++ guarantees they fit together as `(a / b) * b + a % b == a` (for any `b` that is not zero). Keep that identity in mind — it explains the next card about negative remainders.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why truncate instead of rounding?',
          text: 'Because that is what the hardware divide instruction does. On x86, ARM and essentially every modern CPU, the integer divide truncates toward zero. Before C++11 the standard let compilers round negative quotients either way (it was [[implementation-defined]]); C++11 (following C99) simply standardised what every real machine already did. Rounding would cost extra instructions on every division.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Coming from Python?',
          text: 'Python\'s `//` operator **floors** (rounds toward negative infinity), so `-7 // 2` is `-4` in Python but `-7 / 2` is `-3` in C++. Ported code that handles negative coordinates (tile maps, chunk indices) breaks exactly here.',
        },
        {
          type: 'deepdive',
          title: 'Under the hood: division is slow, and compilers cheat',
          blocks: [
            {
              type: 'p',
              text: 'An integer add takes about one CPU cycle. An integer divide typically takes somewhere between 10 and 90 cycles, depending on the CPU and the operand size. Because of this, when you divide by a **constant**, optimizing compilers replace the division with a multiplication by a "magic" reciprocal plus a shift — mathematically equivalent, several times faster.',
            },
            {
              type: 'p',
              text: 'Truncation toward zero also explains why `x / 2` on a signed `int` is not compiled to a single right shift: shifting rounds toward negative infinity, so `-7 >> 1` is `-4`. The compiler adds a small correction for negative values to get `-3`. For an `unsigned` value no correction is needed — one reason unsigned types appear in hot index arithmetic.',
            },
            {
              type: 'p',
              text: 'Finally, x86\'s `idiv` instruction produces the quotient and the remainder **at the same time**. If you write `a / b` and `a % b` next to each other, the compiler emits one division and uses both results.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: 'In C++20, what is the value of `-7 / 2`?',
      options: [
        { text: '`-4`', why: 'That is floor division (rounding toward negative infinity), which is what Python\'s `//` does. C++ truncates toward zero.' },
        { text: '`-3.5`', why: 'Both operands are `int`, so the result must be an `int`. There is no fractional part to keep.' },
        { text: '`-3`', correct: true, why: 'Integer division discards the fraction by truncating toward zero: -3.5 becomes -3.' },
        { text: 'Either `-3` or `-4`, depending on the compiler', why: 'That was true before C++11, when the direction was implementation-defined. Since C++11 truncation toward zero is guaranteed.' },
      ],
      explanation:
        'Integer `/` truncates toward zero on every conforming compiler since C++11. The matching remainder is `-7 % 2 == -1`, so that `(-7 / 2) * 2 + (-7 % 2)` is `-6 + -1 == -7`, as the quotient/remainder identity requires.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'The remainder operator and wrapping around',
      blocks: [
        {
          type: 'p',
          text: 'The [[modulo]] operator `%` (strictly, the *remainder* operator) gives what is left over after integer division. It is one of the most useful operators in game code: checking even/odd (`n % 2 == 0`), doing something every Nth frame (`frame % 60 == 0`), splitting seconds into minutes and seconds, and **wrapping around** — cycling through party members, weapon slots or animation frames.',
        },
        {
          type: 'code',
          title: 'remainders.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int totalSeconds = 754;
    int minutes = totalSeconds / 60;
    int seconds = totalSeconds % 60;
    std::cout << "Time: " << minutes << "m "
              << seconds << "s\\n";

    int partySize = 4;
    int turn = 9;
    std::cout << "Turn 9 -> player " << turn % partySize << '\\n';

    std::cout << 7 % 3 << ' ' << -7 % 3 << ' '
              << 7 % -3 << ' ' << -7 % -3 << '\\n';

    int slots = 5;
    int current = 0;
    int naive = (current - 1) % slots;
    int wrapped = ((current - 1) % slots + slots) % slots;
    std::cout << naive << ' ' << wrapped << '\\n';
}`,
          output: `Time: 12m 34s
Turn 9 -> player 1
1 -1 1 -1
-1 4`,
          annotations: [
            { lines: '5-6', text: 'Quotient and remainder together split a total into units: 754 s = 12 × 60 + 34.' },
            { lines: 12, text: 'With 4 players numbered 0–3, turn 9 wraps to player 1. `%` keeps any counter inside `0 … partySize-1` — as long as the counter is not negative.' },
            { lines: '14-15', text: 'The sign of the result follows the **left** operand (the dividend). The sign of the right operand never matters.' },
            { lines: 19, text: 'Scrolling backward from slot 0 gives -1 — not a valid slot! This is the classic negative-modulo bug.' },
            { lines: 20, text: 'The safe wrap formula: take the remainder, add the divisor (now guaranteed non-negative), and take the remainder again. Slot 0 minus one correctly becomes slot 4.' },
          ],
          highlight: [19, 20],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why can the remainder be negative?',
          text: 'Because the remainder is defined to fit the quotient: `a % b == a - (a / b) * b`. Since `-7 / 3` truncates to `-2`, the remainder must be `-7 - (-6) == -1`. Mathematicians\' "modulo" is always non-negative, which is why calling C++\'s `%` "modulo" is slightly misleading — and why the wrap formula exists.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Unreal code uses the same `%` on `int32`. For floating-point remainders it offers `FMath::Fmod`, and for the "how many stacks/pages/threads do I need" pattern `FMath::DivideAndRoundUp(Count, PerGroup)`, which avoids the off-by-one you get from plain truncating division.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'fill',
      prompt: 'An inventory holds coins in stacks of 64. Complete the code so `stacks` counts full stacks, `leftover` counts the coins that do not fill a stack, and `avgPerStack` is a true floating-point average.',
      template: `int coins = 257;
int stacks = coins ___ 64;
int leftover = coins ___ 64;
double avgPerStack = ___<double>(coins) / stacks;`,
      blanks: [{ answers: ['/'] }, { answers: ['%'] }, { answers: ['static_cast'] }],
      wordBank: ['/', '%', 'static_cast', '*', 'int', 'reinterpret_cast'],
      explanation:
        '`257 / 64` is `4` full stacks (integer division drops the fraction) and `257 % 64` is the `1` leftover coin, because 4 × 64 + 1 = 257. For the average, converting `coins` to `double` *before* the division forces floating-point division, giving 64.25 instead of 64. `reinterpret_cast` reinterprets raw bits and would never be right here.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Floating-point division and mixed types',
      blocks: [
        {
          type: 'p',
          text: 'If **either** operand is a [[floating-point]] type, the other is converted to that type first (one of the "usual arithmetic conversions" from the previous unit) and the operation is done in floating point. So `7.0 / 2`, `7 / 2.0` and `7.0 / 2.0` all give `3.5`. A `float` combined with a `double` is done in `double`.',
        },
        {
          type: 'code',
          title: 'mixed.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    std::cout << 7.0 / 2 << '\\n';
    std::cout << 7 / 2.0f << '\\n';
    std::cout << 1 / 2 * 10.0 << '\\n';
    std::cout << 10.0 * 1 / 2 << '\\n';

    double speed = 600.0;          // units per second
    double frameTime = 1.0 / 60;   // seconds per frame
    std::cout << speed * frameTime << '\\n';
}`,
          output: `3.5
3.5
0
5
10`,
          annotations: [
            { lines: '4-5', text: 'One floating-point operand is enough. `2.0f` is a `float` literal (the `f` suffix); without a suffix, `2.0` is a `double`.' },
            { lines: 6, text: 'Conversion happens **per operation**, not per expression. `1 / 2` runs first, as integers, giving 0. Then `0 * 10.0` is `0.0`. The `10.0` arrived too late to help.' },
            { lines: 7, text: 'Same numbers, different order: `10.0 * 1` is `10.0` (a double), so the following `/ 2` is floating-point division.' },
            { lines: 10, text: 'Writing `1.0 / 60` instead of `1 / 60` is the difference between a frame time of 0.01666… and a frame time of exactly 0 — which would freeze every moving object.' },
          ],
          highlight: [6],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Write floating-point literals as floating-point',
          text: 'When an expression is meant to be floating-point, make the literals say so: `0.5`, `2.0`, `60.0f`. It costs nothing, documents intent, and protects you if someone later changes a variable from `double` to `int`.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'float vs double in Unreal',
          text: 'Gameplay values in Unreal (health, damage, speed, `DeltaTime`) are usually `float`, while UE5 made vector math use `double` for Large World Coordinates. Mixed `float`/`double` arithmetic is common, and the same rule applies: the operation happens in the wider type and is narrowed when stored back into a `float`.',
        },
        {
          type: 'deepdive',
          title: 'Floating-point results are approximations',
          blocks: [
            {
              type: 'p',
              text: 'Floating-point numbers store a binary fraction with a fixed number of significant bits (about 7 decimal digits for `float`, 15–16 for `double`). Many decimal values, like `0.1`, cannot be represented exactly, so results carry tiny rounding errors. `std::cout` shows only 6 significant digits by default, which hides them.',
            },
            {
              type: 'p',
              text: 'Consequences you will meet soon: comparing floating-point results with `==` is fragile (next lesson), and adding a small number to a huge one can do nothing at all (`1e20 + 1.0 == 1e20`). Integer arithmetic, in contrast, is exact as long as it does not overflow.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'truefalse',
      prompt: '`double half = 1 / 2;` stores `0.5` in `half`.',
      answer: false,
      explanation:
        'The right-hand side is evaluated on its own, with no knowledge of the variable it will be stored in. `1 / 2` is integer division and yields `0`; that `0` is then converted to `0.0`. Write `1.0 / 2` (or `0.5`) to get a floating-point result.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Increment and decrement: ++i versus i++',
      blocks: [
        {
          type: 'p',
          text: 'Adding or subtracting one is so common that C++ has dedicated [[increment-operator|increment and decrement operators]]: `++` and `--`. Each comes in two forms. Both forms change the variable; they differ only in the **value the expression produces**.',
        },
        {
          type: 'table',
          headers: ['Form', 'Name', 'Changes `i`?', 'Expression\'s value'],
          rows: [
            ['`++i`', 'pre-increment', 'yes, +1', 'the **new** value (and `i` itself)'],
            ['`i++`', 'post-increment', 'yes, +1', 'a copy of the **old** value'],
            ['`--i`', 'pre-decrement', 'yes, -1', 'the **new** value'],
            ['`i--`', 'post-decrement', 'yes, -1', 'a copy of the **old** value'],
          ],
        },
        {
          type: 'code',
          title: 'increments.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int lives = 3;
    int before = lives++;
    int after = ++lives;
    std::cout << before << ' ' << after << ' ' << lives << '\\n';

    int ammo = 10;
    std::cout << ammo-- << '\\n';
    std::cout << --ammo << '\\n';
}`,
          output: `3 5 5
10
8`,
          annotations: [
            { lines: 5, text: 'Post-increment: `before` receives the **old** value 3; afterwards `lives` is 4.' },
            { lines: 6, text: 'Pre-increment: `lives` becomes 5 first, and the expression yields that new value, so `after` is 5.' },
            { lines: 10, text: 'Prints 10 (the old value), and `ammo` becomes 9 as a side effect.' },
            { lines: 11, text: 'Decrements first (9 → 8), then prints the new value 8.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why prefer ++i when you don\'t need the old value?',
          text: 'To return the old value, `i++` must first **make a copy** of it, then increment, then hand back the copy. For a plain `int` the optimizer removes that copy, so both forms compile to the same instruction. But C++ lets class types define `++` too — most importantly [[iterator|iterators]], which you will use to walk through containers. For those, the copy is real work the compiler may not be able to remove. Writing `++i` by default means you never pay for a copy you did not need, and it states your intent: "just increment".',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'One modification per variable per expression',
          text: 'Never use `++` or `--` on a variable that appears elsewhere in the same expression, as in `i++ + i++` or `arr[i] = i++ * i`. Some of these forms are [[undefined-behavior]]; the rest are merely unreadable. The next lesson but one explains exactly why. Use `++` as a statement on its own line, or in a `for` loop header.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'The name "C++"',
          text: 'Bjarne Stroustrup\'s language is named with the post-increment operator: "C, incremented". Programmers like to point out that, read literally, `C++` evaluates to the *old* C. Pre-increment would have been `++C`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `int a = 5;
int b = a++;
int c = ++a;
std::cout << a << ' ' << b << ' ' << c << '\\n';`,
      options: [
        { text: '`7 6 7`', why: '`b = a++` stores the value of `a` **before** the increment, so `b` is 5, not 6.' },
        { text: '`7 5 6`', why: '`++a` yields the value **after** incrementing. At that point `a` goes from 6 to 7, so `c` is 7.' },
        { text: '`6 5 6`', why: 'Both statements increment `a`, so it ends at 7, not 6.' },
        { text: '`7 5 7`', correct: true, why: '`a` is incremented twice (5 → 6 → 7). `b` got the old value 5; `c` got the new value 7.' },
      ],
      explanation:
        'Both forms always increment. Post-increment hands back the value from before the change; pre-increment hands back the value after it. Tracing one statement at a time: after line 2, `a == 6` and `b == 5`; after line 3, `a == 7` and `c == 7`.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Compound assignment',
      blocks: [
        {
          type: 'p',
          text: 'Updating a variable from its own value — "add 250 to the score" — is so common that every arithmetic operator has a [[compound-assignment]] form: `+=`, `-=`, `*=`, `/=` and `%=`. `score += 250;` means `score = score + 250;`, with one subtle improvement: the left side is evaluated only **once**.',
        },
        {
          type: 'code',
          title: 'compound.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int score = 1000;
    score += 250;    // 1250
    score -= 50;     // 1200
    score *= 3;      // 3600
    score /= 7;      // 514 (integer division)
    score %= 100;    // 14
    std::cout << score << '\\n';

    int hp = 90;
    hp *= 0.75;      // 67.5 is stored as 67
    std::cout << hp << '\\n';
}`,
          output: `14
67`,
          annotations: [
            { lines: 8, text: '`/=` follows the operand types like `/` does: `int /= int` is integer division, so 3600 / 7 = 514.28… becomes 514.' },
            { lines: 13, text: 'This compiles silently. `hp * 0.75` is computed as a `double` (67.5) and then converted back to `int` for storage, discarding .5. With plain `-Wall -Wextra`, GCC does not warn; only `-Wconversion` would.' },
          ],
          highlight: [13],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why "evaluated once" matters',
          text: 'In `enemies[findTarget()].hp -= damage;` the expression on the left contains a function call. Writing it longhand as `enemies[findTarget()].hp = enemies[findTarget()].hp - damage;` would call `findTarget()` twice — wasted work, and a bug if it could return a different enemy the second time. Compound assignment computes the target once and updates it in place. It is also simply clearer: the reader sees "modify this", not "compute something and overwrite".',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Brace initialization will not save you here',
          text: 'In the previous unit you saw that `int hp{67.5};` is a compile error because brace initialization forbids [[narrowing-conversion|narrowing]]. Compound assignment has no such protection: `hp *= 0.75;` narrows silently. If a value is fractional by nature — health in many games, damage multipliers — store it in a `float` or `double` from the start.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'bug',
      prompt: 'The player should be left with 70 HP, but the program prints `HP left: -30`. Tap the faulty line.',
      code: `#include <iostream>

int main() {
    int hp = 100;
    int damage = 30;
    hp =- damage;
    std::cout << "HP left: " << hp << '\\n';
}`,
      bugLines: [6],
      hint: 'Read line 6 character by character. Is that one operator or two?',
      explanation:
        '`=-` is not an operator. The compiler reads it as `hp = -damage;` — plain assignment of unary minus — so `hp` becomes -30. The intended operator is `-=`. Fun fact: very early C actually spelled compound operators `=-` and `=+`; they were reversed to `-=` and `+=` precisely because `x=-1` was ambiguous. Writing spaces around operators (`hp -= damage;`) makes this typo easy to spot.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Dividing by zero',
      blocks: [
        {
          type: 'p',
          text: 'What should `10 / 0` be? Mathematics says "undefined", and C++ takes that literally — but integers and floating-point types end up behaving very differently in practice.',
        },
        {
          type: 'heading',
          text: 'Integers: undefined behavior',
        },
        {
          type: 'p',
          text: 'Integer division or remainder by zero is [[undefined-behavior]]. On x86 Linux the CPU traps and the program usually dies with the confusingly named message *Floating point exception* — the signal\'s name is historical; no floating point was involved. It is **not** a C++ exception you can catch. Worse, because UB "cannot happen", the optimizer may assume every divisor is non-zero and reorder or delete code based on that assumption. `INT_MIN / -1` is UB too: the true answer is one larger than the biggest `int`.',
        },
        {
          type: 'heading',
          text: 'Floating point: infinity and NaN',
        },
        {
          type: 'p',
          text: 'Virtually all hardware implements the IEEE 754 floating-point standard, which defines the answers: a non-zero value divided by zero gives `+inf` or `-inf`, and `0.0 / 0.0` gives **NaN** ("not a number"). (Strictly, the C++ standard still calls floating division by zero undefined; but on platforms where `std::numeric_limits<double>::is_iec559` is `true`, which includes every mainstream compiler and CPU, you get the IEEE results.) See [[nan-and-infinity]].',
        },
        {
          type: 'code',
          title: 'zero.cpp',
          runnable: true,
          code: `#include <cmath>
#include <iostream>
#include <limits>

int main() {
    std::cout << std::boolalpha;
    std::cout << "IEEE 754? "
              << std::numeric_limits<double>::is_iec559 << '\\n';

    double zero = 0.0;
    double up = 1.0 / zero;
    double down = -1.0 / zero;
    double notANumber = zero / zero;

    std::cout << up << ' ' << down << '\\n';
    std::cout << std::isnan(notANumber) << '\\n';
    std::cout << (notANumber == notANumber) << '\\n';
    std::cout << (up > 1e308) << '\\n';
}`,
          output: `IEEE 754? true
inf -inf
true
false
true`,
          annotations: [
            { lines: 6, text: '`std::boolalpha` makes `std::cout` print `bool` values as `true`/`false` instead of `1`/`0`.' },
            { lines: '7-8', text: 'Asks the standard library whether `double` follows IEEE 754 (also called IEC 559) on this platform.' },
            { lines: '11-12', text: 'Infinity keeps the sign of the numerator. It behaves sensibly in comparisons: it is larger than every finite value.' },
            { lines: 16, text: '`std::isnan` (from `<cmath>`) is the reliable way to detect NaN.' },
            { lines: 17, text: 'NaN is not equal to anything — **not even itself**. Any comparison involving NaN is false (except `!=`).' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'NaN is contagious',
          text: 'Any arithmetic involving NaN produces NaN. One bad division in a movement calculation spreads to the position, then the camera, then the physics — the classic "my character vanished" bug. Guard divisions whose divisor can be zero (an empty team, a zero-length vector, a paused game with `DeltaTime == 0`).',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'NaN hunting in Unreal',
          text: 'Unreal types check for this: `FVector::ContainsNaN()` reports a poisoned vector, and engine code calls `DiagnosticCheckNaN()` in development builds to catch NaN at the moment it appears. For safe normalisation use `GetSafeNormal()`, which returns a zero vector instead of dividing by a zero length.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'On a typical PC with an IEEE 754 compiler, which statement is correct?',
      options: [
        { text: 'Both `10 / 0` and `10.0 / 0.0` throw a C++ exception that you can catch', why: 'C++ never turns division by zero into an exception. An integer divide-by-zero typically triggers a hardware trap (a signal), and floating-point division just produces infinity.' },
        { text: '`10 / 0` is undefined behavior; `10.0 / 0.0` evaluates to positive infinity', correct: true, why: 'Integer division by zero is UB (often a crash). IEEE 754 defines non-zero divided by zero as a signed infinity.' },
        { text: '`10 / 0` evaluates to 0 and `0.0 / 0.0` evaluates to 0.0', why: 'Neither is zero. The integer case is undefined, and `0.0 / 0.0` is NaN, not 0.0.' },
        { text: '`10.0 / 0.0` is NaN, and NaN compares equal to itself', why: 'Non-zero divided by zero is infinity; only `0.0 / 0.0` is NaN. And NaN is famously unequal to everything, including itself.' },
      ],
      explanation:
        'Integers have no bit pattern for "infinity", so the standard leaves integer division by zero undefined and the CPU typically traps. IEEE 754 floating-point reserves special patterns for ±infinity and NaN, so the hardware can return a well-defined result and carry on — which is convenient, but means errors can spread silently.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'order',
      prompt: 'A weapon wheel has `slotCount` slots. `step` may be negative (scrolling backward). Order the lines to move the selection safely, always landing on a slot from 0 to `slotCount - 1`.',
      lines: [
        'int next = current + step;',
        'int r = next % slotCount;',
        'int wrapped = (r + slotCount) % slotCount;',
        'current = wrapped;',
        'std::cout << "Slot " << current << \'\\n\';',
      ],
      distractors: ['int wrapped = r / slotCount;'],
      explanation:
        'Each line depends on the one before it: compute the raw target, reduce it with `%` (which may still be negative because the sign follows the dividend), shift it into the non-negative range by adding `slotCount` and reducing again, then commit and print. Dividing by `slotCount` would give a quotient, not a slot number.',
    },
  ],
  takeaways: [
    'The operand **types** choose the operation: two integers give integer arithmetic, and one floating-point operand makes the whole operation floating-point.',
    'Integer `/` truncates toward zero (`-7 / 2 == -3`), and the sign of `%` follows the left operand (`-7 % 3 == -1`). Use `((a % n) + n) % n` to wrap negative values.',
    'Convert **before** dividing (`static_cast<double>(total) / count`); converting the result afterwards is too late.',
    '`++i` yields the new value, `i++` a copy of the old one. Prefer `++i` when you do not need the old value, and never modify a variable twice in one expression.',
    'Compound assignment (`+=`, `*=` …) evaluates its left side once and silently narrows the result back to the variable\'s type.',
    'Integer division by zero is undefined behavior; IEEE 754 floating-point division by zero yields ±infinity or NaN, and NaN spreads and never equals itself.',
  ],
  reading: [
    {
      title: 'Arithmetic operators',
      url: 'https://en.cppreference.com/w/cpp/language/operator_arithmetic',
      source: 'cppreference',
      note: 'The precise rules for every arithmetic operator, including the division and remainder guarantees.',
    },
    {
      title: 'Increment/decrement operators',
      url: 'https://en.cppreference.com/w/cpp/language/operator_incdec',
      source: 'cppreference',
      note: 'Pre- and post-increment semantics, and how class types overload them.',
    },
    {
      title: 'Remainder and exponentiation',
      url: 'https://www.learncpp.com/cpp-tutorial/remainder-and-exponentiation/',
      source: 'learncpp',
      note: 'More practice with `%`, negative operands, and why C++ has no exponent operator.',
    },
    {
      title: 'Increment/decrement operators, and side effects',
      url: 'https://www.learncpp.com/cpp-tutorial/increment-decrement-operators-and-side-effects/',
      source: 'learncpp',
      note: 'A beginner-friendly look at side effects and why expressions with several of them are dangerous.',
    },
    {
      title: 'std::fmod',
      url: 'https://en.cppreference.com/w/cpp/numeric/math/fmod',
      source: 'cppreference',
      note: 'The floating-point remainder function to use where `%` does not compile.',
    },
  ],
};
