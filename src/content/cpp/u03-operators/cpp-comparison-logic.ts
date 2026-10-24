import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-comparison-logic',
  title: 'Comparison and Logical Operators',
  summary: 'How C++ asks yes/no questions: comparisons, &&, || and !, short-circuiting, the = vs == bug and why floating-point values should never be compared with ==.',
  minutes: 17,
  objectives: [
    'Use the six comparison operators and explain why they produce `bool` values',
    'Spot the `=` versus `==` bug and the broken chained comparison `0 < x < 10`',
    'Combine conditions with `&&`, `||` and `!`, and rely on short-circuit evaluation to guard risky operations',
    'Compare floating-point values safely with a tolerance instead of `==`',
    'Apply De Morgan\'s laws to negate and simplify compound conditions',
    'Describe what the C++20 three-way comparison operator `<=>` returns',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Comparisons produce bool',
      blocks: [
        {
          type: 'p',
          text: 'Games constantly ask yes/no questions. Can the player afford this item? Is the enemy in range? Is health at zero? In C++ you ask them with **comparison operators**, and every comparison produces a value of type [[bool-type|bool]]: either `true` or `false`.',
        },
        {
          type: 'table',
          headers: ['Operator', 'Meaning', 'Example (gold = 120)', 'Result'],
          rows: [
            ['`==`', 'equal to', '`gold == 120`', '`true`'],
            ['`!=`', 'not equal to', '`gold != 120`', '`false`'],
            ['`<`', 'less than', '`gold < 150`', '`true`'],
            ['`>`', 'greater than', '`gold > 150`', '`false`'],
            ['`<=`', 'less than or equal', '`gold <= 120`', '`true`'],
            ['`>=`', 'greater than or equal', '`gold >= 150`', '`false`'],
          ],
        },
        {
          type: 'code',
          title: 'shop.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int gold = 120;
    int price = 150;

    bool canAfford = gold >= price;
    std::cout << canAfford << '\\n';

    std::cout << std::boolalpha;
    std::cout << canAfford << '\\n';
    std::cout << (gold < price) << ' ' << (gold == 120) << '\\n';
    std::cout << (gold != price) << '\\n';
}`,
          output: `0
false
true true
true`,
          annotations: [
            { lines: 7, text: 'A comparison is just an expression with a `bool` result, so you can store it in a variable. A well-named `bool` makes later code read like English.' },
            { lines: 8, text: 'By default `std::cout` prints `bool` as `1` or `0`.' },
            { lines: 10, text: '`std::boolalpha` switches the stream to print `true`/`false`. It stays switched on for all later output.' },
            { lines: 12, text: 'The **parentheses are required**. `<<` binds more tightly than `<` and `==`, so without them the compiler would try to compute `(std::cout << gold) < price` and reject it.' },
          ],
          highlight: [12],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does a bool print as 1?',
          text: 'C, C++\'s ancestor, had no `bool` type for most of its life: comparisons produced the `int` values `1` and `0`. C++ added a real `bool`, but kept it convertible to `int` (`true` → `1`, `false` → `0`) so decades of C code kept working. Streams print it numerically for the same compatibility reason unless you ask for `std::boolalpha`.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Comparing signed with unsigned',
          text: 'If you compare a negative `int` with an `unsigned` value, the `int` is converted to unsigned first, becoming a huge positive number. So `-1 < 0u` is **false**. GCC warns with `-Wall` (`-Wsign-compare`). Keep both sides the same signedness, or use the C++20 helpers `std::cmp_less(a, b)` and friends from `<utility>`, which compare the true mathematical values. See [[signedness]].',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `#include <iostream>

int main() {
    int level = 7;
    std::cout << (level > 5) << (level == 5) << '\\n';
}`,
      options: [
        { text: '`truefalse`', why: 'Only with `std::boolalpha` does `std::cout` print words. Without it, `bool` values print as digits.' },
        { text: '`10`', correct: true, why: '`level > 5` is `true`, printed as `1`; `level == 5` is `false`, printed as `0`. Nothing separates them, so you see `10`.' },
        { text: '`1 0`', why: '`std::cout` never inserts spaces between values. You would need to insert `\' \'` yourself.' },
        { text: '`7`', why: 'Comparisons do not yield the value of `level`; they yield a `bool` describing whether the relationship holds.' },
      ],
      explanation:
        'Every comparison evaluates to a `bool`. Inserted into a stream with default settings, `true` becomes `1` and `false` becomes `0`, a leftover from C, where comparisons literally produced the integers 1 and 0.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'The = versus == bug',
      blocks: [
        {
          type: 'p',
          text: 'You will use comparisons mostly inside an [[if-statement]], which runs a block of code only when its condition is `true` (Unit 5 covers it fully). That is where C++\'s most famous one-character bug lives: `=` **assigns**, `==` **compares**.',
        },
        {
          type: 'compare',
          left: {
            title: 'Bug: assignment',
            tone: 'bad',
            code: `if (lives = 0) {
    std::cout << "Game over\\n";
}`,
            text: 'Sets `lives` to 0, then tests that value. 0 converts to `false`, so the message **never** prints — and the player has just lost all their lives.',
          },
          right: {
            title: 'Intended: comparison',
            tone: 'good',
            code: `if (lives == 0) {
    std::cout << "Game over\\n";
}`,
            text: 'Reads `lives` without changing it and yields `true` only when it is 0.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is this even legal?',
          text: 'In C and C++, assignment is an **expression**: `x = 5` stores 5 and also produces the value 5. That is what makes `a = b = 0;` work. Any expression that can be converted to `bool` may be used as a condition, so `if (lives = 0)` is valid code that does something you almost never want.',
        },
        {
          type: 'p',
          text: 'Turn on warnings and let the compiler catch it. With `-Wall`, GCC reports *suggest parentheses around assignment used as truth value*. Clang and MSVC have equivalent warnings. If you ever really mean "assign, then test", write extra parentheses — `if ((n = count()))` — to tell both the compiler and the reader that it is deliberate.',
        },
        {
          type: 'heading',
          text: 'The other trap: chained comparisons',
        },
        {
          type: 'p',
          text: 'In maths, `0 < x < 10` means "x is between 0 and 10". In C++ it compiles, but it means `(0 < x) < 10`: the first comparison yields `true` or `false`, which converts to `1` or `0`, which is **always** less than 10. The condition is always true. Write the two comparisons separately and join them with `&&` (coming up next): `0 < x && x < 10`.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Yoda conditions',
          text: 'Some older code writes `if (0 == lives)` with the constant first. If you mistype it as `0 = lives`, it fails to compile, because you cannot assign to a literal. Compiler warnings now catch the original mistake reliably, so most modern style guides prefer the natural order.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'bug',
      prompt: 'After the player is hit, this program prints `Lives: 0`, but `Game over` never appears. Tap the faulty line.',
      code: `#include <iostream>

int main() {
    int lives = 1;
    --lives; // the player is hit
    if (lives = 0) {
        std::cout << "Game over\\n";
    }
    std::cout << "Lives: " << lives << '\\n';
}`,
      bugLines: [6],
      hint: 'How many `=` signs does a comparison need?',
      explanation:
        'Line 6 assigns `0` to `lives` instead of comparing it. The assignment expression yields the assigned value, `0`, which converts to `false`, so the block is skipped every time — even when `lives` really was 0. Change it to `lives == 0`. GCC flags this with `-Wall`, which is one more reason never to ignore warnings.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Logical operators: &&, || and !',
      blocks: [
        {
          type: 'p',
          text: 'Real conditions combine several questions. The **logical operators** join `bool` values: `&&` (AND) is true only when **both** sides are true, `||` (OR) is true when **at least one** side is true, and `!` (NOT) flips a single value. Their operands are converted to `bool` first, and the result is always a `bool`.',
        },
        {
          type: 'table',
          headers: ['`a`', '`b`', '`a && b`', '`a || b`', '`!a`'],
          rows: [
            ['`false`', '`false`', '`false`', '`false`', '`true`'],
            ['`false`', '`true`', '`false`', '`true`', '`true`'],
            ['`true`', '`false`', '`false`', '`true`', '`false`'],
            ['`true`', '`true`', '`true`', '`true`', '`false`'],
          ],
        },
        {
          type: 'code',
          title: 'can_shoot.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    bool isAlive = true;
    bool hasAmmo = false;
    bool isReloading = false;

    std::cout << std::boolalpha;
    std::cout << (isAlive && hasAmmo) << '\\n';
    std::cout << (isAlive || hasAmmo) << '\\n';
    std::cout << !hasAmmo << '\\n';

    bool canShoot = isAlive && hasAmmo && !isReloading;
    bool needsAmmo = isAlive && (!hasAmmo || isReloading);
    std::cout << canShoot << ' ' << needsAmmo << '\\n';
}`,
          output: `false
true
true
false true`,
          annotations: [
            { lines: 11, text: '`!` is a unary operator with very high precedence, so no parentheses are needed here: it applies to `hasAmmo` before `<<` runs.' },
            { lines: 13, text: 'Chains of `&&` read naturally: alive AND has ammo AND not reloading. All three must hold.' },
            { lines: 14, text: '`&&` binds more tightly than `||`, so `a && b || c` means `(a && b) || c`. When mixing them, always add parentheses to show the grouping you mean, as here. GCC even warns about `||` and `&&` mixed without parentheses.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Watch where ! lands',
          text: '`!` grabs only the operand right next to it. `!hp > 0` means `(!hp) > 0`: it negates `hp` (giving `true` only if `hp` is 0), converts that to `1` or `0`, and compares with 0. Write `!(hp > 0)` or, better, `hp <= 0`.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'and, or, not',
          text: 'C++ also accepts the keywords `and`, `or` and `not` as exact synonyms for `&&`, `||` and `!`. They are standard but uncommon; most code bases, including Unreal Engine, use the symbols. Do not confuse `&&`/`||` with the single-character `&` and `|`, which are **bitwise** operators covered in the next lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'fill',
      prompt: 'A mage can cast when alive **and** has enough mana **and** is not silenced. An NPC flees when badly hurt **or** outnumbered. Complete the conditions.',
      template: `bool canCast = isAlive ___ mana >= cost ___ !isSilenced;
bool shouldFlee = hp < 20 ___ enemiesNearby > 3;`,
      blanks: [{ answers: ['&&', 'and'] }, { answers: ['&&', 'and'] }, { answers: ['||', 'or'] }],
      wordBank: ['&&', '||', '&', '|', '==', '!'],
      explanation:
        'Every requirement for casting must hold, so the parts are joined with `&&`. Fleeing needs only one reason, so `||`. The single `&` and `|` are bitwise operators: they happen to give the right answer for `bool` operands, but they evaluate both sides every time (no short-circuiting) and signal the wrong intent to readers.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Short-circuit evaluation',
      blocks: [
        {
          type: 'p',
          text: '`&&` and `||` evaluate their left operand **first**, and evaluate the right operand **only if it can still change the answer**. If the left side of `&&` is `false`, the result must be `false`, so the right side is skipped. If the left side of `||` is `true`, the result must be `true`. This is [[short-circuit-evaluation]], and it is a guarantee you can build on, not an optimisation the compiler might or might not do.',
        },
        {
          type: 'code',
          title: 'guard.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int totalDamage = 900;
    int hitCount = 0;   // no hits yet this round

    std::cout << std::boolalpha;
    bool bigHitter = hitCount != 0 && totalDamage / hitCount > 50;
    std::cout << "Big hitter: " << bigHitter << '\\n';

    int calls = 0;
    bool a = true || ++calls > 0;
    bool b = false && ++calls > 0;
    std::cout << a << ' ' << b << " calls=" << calls << '\\n';
}`,
          output: `Big hitter: false
true false calls=0`,
          annotations: [
            { lines: 8, text: 'The **guard idiom**. Because `hitCount != 0` is false, the division never runs, so there is no division by zero. Swap the two sides and this line becomes undefined behavior.' },
            { lines: '12-13', text: 'Proof that the right-hand sides are skipped: `++calls` never executes, so `calls` is still 0. Side effects on the right of `&&`/`||` are conditional.' },
          ],
          highlight: [8],
        },
        {
          type: 'p',
          text: 'The same pattern protects you from invalid memory. A [[pointer]] is a variable that holds the address of another object, or [[nullptr]] when it points at nothing (Unit 8 covers them in depth). Reading through a null pointer is undefined behavior, typically a crash, so code checks it first:',
        },
        {
          type: 'code',
          code: `if (target != nullptr && target->health > 0) {
    // safe: target->health is only read when target is valid
}`,
          annotations: [
            { lines: 1, text: '`->` reads a member through a pointer. If `target` is null, `&&` stops after the first test and `target->health` is never touched. This "null check, then use" order is everywhere in game code.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does C++ guarantee the order?',
          text: 'Two reasons. First, correctness: guards like the ones above are only possible if the left side is fully evaluated, including all its side effects, before the right side starts — so the standard sequences them. Second, speed: there is no point computing something that cannot change the answer. Put cheap checks, and checks that usually decide the result, on the left.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'You will write `if (Target && Target->IsAlive())` constantly. A pointer converts to `bool` (`true` when non-null), so `Target &&` is the same null check written more briefly. For `UObject` pointers Unreal recommends `IsValid(Target)`, which also rejects objects that are pending destruction.',
        },
        {
          type: 'deepdive',
          title: 'Short-circuiting is a branch, and overloads lose it',
          blocks: [
            {
              type: 'p',
              text: 'Under the hood, `a && b` compiles to "test `a`; if false, jump past the code for `b`". That conditional jump is the short circuit. (For simple side-effect-free operands the optimizer may evaluate both and combine them without a branch, but only when that cannot change the program\'s behavior.)',
            },
            {
              type: 'p',
              text: 'C++ lets classes overload `&&` and `||` ([[operator-overloading]], Unit 9). An overloaded version is an ordinary function call, so **both** operands are always evaluated: the short-circuit guarantee disappears. That is why style guides, including the C++ Core Guidelines, say never to overload them.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: '`count` may be zero. Which condition never divides by zero?',
      codeOptions: true,
      options: [
        { text: 'total / count > 10 && count != 0', why: 'The division is on the left, so it runs first — before the check that would have protected it.' },
        { text: 'count != 0 & total / count > 10', why: 'A single `&` is the bitwise AND. It does not short-circuit, so both sides are always evaluated and the division still happens when `count` is 0.' },
        { text: 'count != 0 || total / count > 10', why: 'When `count` is 0 the left side is `false`, and `||` must then evaluate the right side to decide — dividing by zero exactly when you did not want to.' },
        { text: 'count != 0 && total / count > 10', correct: true, why: 'The check comes first, and `&&` skips the division whenever the check is false.' },
      ],
      explanation:
        'Only `&&` with the guard on the left works: the guard is evaluated first, and a `false` there short-circuits the rest. Order matters, the operator matters (`&&`, not `&`), and the logic matters (`||` evaluates its right side precisely when the left side is false).',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Never compare floating-point values with ==',
      blocks: [
        {
          type: 'p',
          text: 'Floating-point numbers are stored in binary, and most decimal fractions — `0.1`, `0.2`, `0.3` — have no exact binary representation, just as 1/3 has no exact decimal one. Each value is rounded to the nearest representable number, and arithmetic adds more rounding. Two calculations that "should" give the same answer often differ in the last bit, and `==` compares every bit.',
        },
        {
          type: 'code',
          title: 'float_compare.cpp',
          runnable: true,
          code: `#include <cmath>
#include <iomanip>
#include <iostream>

int main() {
    double a = 0.1 + 0.2;
    double b = 0.3;

    std::cout << std::boolalpha;
    std::cout << (a == b) << '\\n';
    std::cout << std::setprecision(17) << a << '\\n'
              << b << '\\n';

    double tolerance = 1e-9;
    std::cout << (std::abs(a - b) < tolerance) << '\\n';
}`,
          output: `false
0.30000000000000004
0.29999999999999999
true`,
          annotations: [
            { lines: 10, text: 'False! Mathematically equal, but the two `double` values differ in their last bits.' },
            { lines: '11-12', text: '`std::setprecision(17)` from `<iomanip>` shows enough digits to reveal the stored values (the next unit covers stream formatting). Neither is exactly 0.3.' },
            { lines: '14-15', text: 'The fix is an [[epsilon-comparison]]: treat values as equal when their difference is smaller than a tolerance. `std::abs` comes from `<cmath>`.' },
          ],
        },
        {
          type: 'p',
          text: 'An **absolute** tolerance like `1e-9` works when you know the values have a modest size (health, a 0–1 progress fraction). For values that can be huge, such as world coordinates, scale the tolerance with the numbers: `std::abs(a - b) <= 1e-9 * std::max(std::abs(a), std::abs(b))`. Pick a tolerance that matches what "close enough" means in your game: 0.01 units might be invisible on screen.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just make floating point exact?',
          text: 'Exactness would need unlimited memory: 1/3 or 0.1 would require infinitely many binary digits. IEEE 754 instead gives a fixed size (4 or 8 bytes), predictable precision and hardware speed — billions of operations per second. The trade-off is that you must treat floating-point values as approximations. `<` and `>` are fine; it is exact equality that is fragile.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'epsilon() is not a magic tolerance',
          text: '`std::numeric_limits<double>::epsilon()` (about 2.2e-16) is the gap between 1.0 and the next representable `double`. For values near 1000 the gap is already about 1000 times larger, so comparing with `epsilon()` as an absolute tolerance is effectively the same as `==`. It is a building block for relative comparisons, not a ready-made answer.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Use `FMath::IsNearlyEqual(A, B)` and `FMath::IsNearlyZero(X)`, which take an optional tolerance (by default the tiny `UE_SMALL_NUMBER`; `UE_KINDA_SMALL_NUMBER`, 1e-4, is a common looser choice). Vectors have `FVector::Equals(Other, Tolerance)` and `IsNearlyZero()`. Unreal code reviews routinely flag `==` on floats.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'truefalse',
      prompt: '`std::numeric_limits<double>::epsilon()` is a good tolerance for checking whether any two `double` values are "equal enough".',
      answer: false,
      explanation:
        '`epsilon()` measures the spacing of doubles **near 1.0** only. The spacing grows with magnitude, so for a coordinate like 25000.0 the gap between neighbouring doubles is far bigger than `epsilon()`, and an `epsilon()` tolerance behaves like plain `==`. Choose a tolerance based on your problem (often scaled by the size of the values).',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'De Morgan\'s laws: negating conditions',
      blocks: [
        {
          type: 'p',
          text: 'You often need the **opposite** of a compound condition: "keep the game running while it is *not* the case that the player is dead or has won". [[de-morgans-laws]] tell you how to push a `!` inside parentheses: negate each part **and swap** `&&` with `||`.',
        },
        {
          type: 'table',
          headers: ['Original', 'Equivalent', 'In words'],
          rows: [
            ['`!(a && b)`', '`!a || !b`', '"not both" = "at least one is false"'],
            ['`!(a || b)`', '`!a && !b`', '"neither" = "both are false"'],
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Hard to read',
            tone: 'neutral',
            code: `bool keepPlaying = !(isDead || hasWon);
bool cannotShoot = !(hasAmmo && !isReloading);`,
          },
          right: {
            title: 'After De Morgan',
            tone: 'good',
            code: `bool keepPlaying = !isDead && !hasWon;
bool cannotShoot = !hasAmmo || isReloading;`,
            text: 'Each `!` was pushed inward, `&&`/`||` swapped, and the double negation `!!isReloading` cancelled.',
          },
        },
        {
          type: 'p',
          text: 'Comparisons negate too: the opposite of `hp > 0` is `hp <= 0` (not `hp < 0` — zero has to go somewhere). So `!(hp > 0 && shield > 0)` becomes `hp <= 0 || shield <= 0`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why this matters in practice',
          text: 'Two classic logic bugs come from negating incorrectly. Forgetting to swap the operator turns "not (alive and armed)" into "dead and unarmed", which misses every case where only one is true. And negating "x is 1 or 2" into `x != 1 || x != 2` produces a condition that is always true, because every number differs from at least one of them. The correct negation is `x != 1 && x != 2`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Name the positive condition',
          text: 'When a condition gets hard to negate, store it in a well-named `bool` first (`bool canAttack = …;`) and then write `!canAttack`. Readers handle one `!` easily; they struggle with three.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'Which condition is equivalent to `!(hp > 0 && hasShield)`?',
      codeOptions: true,
      options: [
        { text: 'hp <= 0 && !hasShield', why: 'The `!` was pushed inside but `&&` was not swapped to `||`. This is only true when both are false, missing e.g. "alive but no shield".' },
        { text: 'hp < 0 || !hasShield', why: 'The negation of `hp > 0` is `hp <= 0`. With `<`, the case `hp == 0` is lost.' },
        { text: 'hp <= 0 || !hasShield', correct: true, why: 'Negate each part (`hp > 0` becomes `hp <= 0`, `hasShield` becomes `!hasShield`) and swap `&&` to `||`.' },
        { text: '!hp > 0 || !hasShield', why: '`!` binds tighter than `>`, so `!hp > 0` means `(!hp) > 0`, which only happens to work when `hp` cannot be negative. It is a precedence accident, not a correct negation.' },
      ],
      explanation:
        'De Morgan: `!(A && B)` is `!A || !B`. Here `A` is `hp > 0`, whose negation is `hp <= 0`, and `B` is `hasShield`. The result reads as "no health left, or no shield" — exactly the cases where "alive and shielded" is false.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Three-way comparison: <=> (C++20)',
      blocks: [
        {
          type: 'p',
          text: 'C++20 added one more comparison operator, `<=>`, nicknamed the **spaceship operator**. Instead of answering one yes/no question, it answers "less, equal or greater?" in a single step. The result is not a `bool` but an ordering value that you compare with `0`. See [[three-way-comparison]].',
        },
        {
          type: 'code',
          title: 'spaceship.cpp',
          runnable: true,
          code: `#include <compare>
#include <iostream>

int main() {
    int myScore = 4200;
    int rivalScore = 5100;

    auto result = myScore <=> rivalScore;
    std::cout << std::boolalpha;
    std::cout << (result < 0) << ' '
              << (result == 0) << ' '
              << (result > 0) << '\\n';
}`,
          output: 'true false false',
          annotations: [
            { lines: 1, text: 'The ordering types (`std::strong_ordering` and friends) live in `<compare>`. Include it whenever you use `<=>`.' },
            { lines: 8, text: 'For two `int`s the result is a `std::strong_ordering`. `auto` lets the compiler name the type for us.' },
            { lines: '10-12', text: '`result < 0` means "myScore is less", `== 0` means equal, `> 0` means greater — the same convention as C\'s `strcmp`.' },
          ],
        },
        {
          type: 'p',
          text: 'For floating-point operands the result is a `std::partial_ordering`, which has a fourth possibility — **unordered** — because NaN is neither less than, equal to, nor greater than anything.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why add another operator?',
          text: 'You rarely call `<=>` directly on numbers. Its real purpose is in your own types (Unit 9): write or `= default` a single `operator<=>` for a `Version` or `Score` class, and the compiler generates `<`, `<=`, `>` and `>=` from it. Before C++20 you had to write all of them by hand, consistently — a lot of boilerplate and a common source of bugs.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'What is the final value of `calls`?',
      code: `int calls = 0;
bool a = false && ++calls > 0;
bool b = true || ++calls > 0;
bool c = true && ++calls > 0;
bool d = false || ++calls > 0;`,
      options: [
        { text: '`4`', why: 'That would require every right-hand side to run. Short-circuit evaluation skips two of them.' },
        { text: '`0`', why: 'Lines 4 and 5 cannot know their result from the left side alone, so they must evaluate the right side.' },
        { text: '`2`', correct: true, why: 'Lines 2 and 3 are decided by their left operand and skip `++calls`. Lines 4 and 5 are not, so `++calls` runs twice.' },
        { text: '`1`', why: 'Both line 4 (`true && …`) and line 5 (`false || …`) need their right operand to determine the result.' },
      ],
      explanation:
        '`false && x` is false whatever `x` is, and `true || x` is true whatever `x` is, so those right sides are skipped. `true && x` and `false || x` both equal `x`, so `x` must be evaluated. This is why you should never hide important side effects (like a function that updates game state) on the right of `&&` or `||`.',
    },
  ],
  takeaways: [
    'Comparison operators (`== != < > <= >=`) produce `bool`; print them with `std::boolalpha`, and wrap them in parentheses when inserting into `std::cout`.',
    '`=` assigns and `==` compares. `if (x = 0)` compiles, assigns, and is always false — keep `-Wall` on so the compiler warns you.',
    '`0 < x < 10` does not test a range; write `0 < x && x < 10`.',
    '`&&` and `||` evaluate left to right and short-circuit, so put guards (zero checks, null checks) on the left.',
    'Never compare floating-point results with `==`; compare the difference against a tolerance that suits your values.',
    'De Morgan: `!(a && b)` is `!a || !b` and `!(a || b)` is `!a && !b`; the negation of `>` is `<=`.',
    'C++20\'s `<=>` returns an ordering compared with 0; its main use is generating comparisons for your own types.',
  ],
  reading: [
    {
      title: 'Comparison operators',
      url: 'https://en.cppreference.com/w/cpp/language/operator_comparison',
      source: 'cppreference',
      note: 'All comparison operators including `<=>`, and how comparisons between different types are converted.',
    },
    {
      title: 'Logical operators',
      url: 'https://en.cppreference.com/w/cpp/language/operator_logical',
      source: 'cppreference',
      note: 'The exact short-circuit and sequencing guarantees of `&&`, `||` and `!`.',
    },
    {
      title: 'Relational operators and floating point comparisons',
      url: 'https://www.learncpp.com/cpp-tutorial/relational-operators-and-floating-point-comparisons/',
      source: 'learncpp',
      note: 'A careful walk through absolute and relative epsilon comparisons with example functions.',
    },
    {
      title: 'Logical operators',
      url: 'https://www.learncpp.com/cpp-tutorial/logical-operators/',
      source: 'learncpp',
      note: 'More examples of short-circuiting, De Morgan\'s laws and mixing `&&` with `||`.',
    },
    {
      title: 'Comparing Floating Point Numbers, 2012 Edition',
      url: 'https://randomascii.wordpress.com/2012/02/25/comparing-floating-point-numbers-2012-edition/',
      source: 'article',
      note: 'Bruce Dawson\'s classic deep dive into why float comparison is hard and the trade-offs of each technique.',
    },
  ],
};
