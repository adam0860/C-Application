import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-initialization',
  title: 'Initialization in All Its Forms',
  summary: 'Copy, direct, brace and value initialization — why C++ has so many, what each one does, and which to reach for.',
  minutes: 16,
  objectives: [
    'Recognize copy, direct, brace (list) and value initialization syntax',
    'Explain why brace initialization rejects narrowing conversions, and what counts as narrowing',
    'Use empty braces to zero-initialize, and contrast this with default initialization',
    'Identify the most vexing parse and avoid it',
    'Choose an initialization style and justify the choice',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'One idea, many spellings',
      blocks: [
        {
          type: 'p',
          text: 'In the last two lessons you learned that [[initialization]] gives an object its first value at the moment it is created — and that skipping it can be dangerous. C++ offers several syntaxes for it, and they do not all behave the same way.',
        },
        {
          type: 'table',
          headers: ['Syntax', 'Name', 'Result for an `int`'],
          rows: [
            ['`int a;`', 'Default initialization', 'Indeterminate (garbage) for local variables'],
            ['`int b = 5;`', 'Copy initialization', '5'],
            ['`int c(5);`', 'Direct initialization', '5'],
            ['`int d{5};`', 'Direct-list (brace) initialization', '5'],
            ['`int e = {5};`', 'Copy-list initialization', '5'],
            ['`int f{};`', 'Value initialization', '0'],
          ],
        },
        {
          type: 'code',
          title: 'forms.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int lives = 3;
    int ammo(30);
    int score{1500};
    int kills{};
    std::cout << lives << ' ' << ammo << ' '
              << score << ' ' << kills << '\\n';
}`,
          output: '3 30 1500 0',
          annotations: [
            { lines: 4, text: '**Copy initialization** — the form inherited from C.' },
            { lines: 5, text: '**Direct initialization** — parentheses, introduced in C++ for constructors that take several arguments.' },
            { lines: 6, text: '**Brace initialization** — added in C++11. Same result here, but stricter, as you will see.' },
            { lines: 7, text: '**Value initialization** — empty braces mean "the zero value of this type": `0` for an `int`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Why so many forms?',
          text: 'Each era added one. C gave us `=`. C++98 added parentheses so that objects needing several values could be built in one go: `Vec3 position(1.0, 2.0, 3.0);`. Both had problems — inconsistent rules and some outright traps — so C++11 introduced braces as a "uniform" syntax that works everywhere and is safer. The old forms could not be removed without breaking existing code, so all of them remain.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Copy and direct initialization',
      blocks: [
        {
          type: 'p',
          text: 'For fundamental types such as `int` and `double`, `int x = 5;` and `int x(5);` do exactly the same thing. Despite its name, copy initialization does not create a temporary and then copy it: the object is simply created holding the value. (For class types the two can differ, which Unit 9 covers.)',
        },
        {
          type: 'p',
          text: 'Their shared weakness is that both silently accept values that do not fit the type. The value is converted, and information is lost without any error:',
        },
        {
          type: 'code',
          code: `int damage = 7.9;       // compiles: damage is 7
int shield(2.5);        // compiles: shield is 2
short tiny = 100000;    // compiles: value changes!`,
          annotations: [
            { lines: 1, text: 'A `double` converted to `int` drops the fractional part — truncation towards zero, not rounding. 7.9 becomes 7.' },
            { lines: 2, text: 'Parentheses behave the same way: 2.5 becomes 2.' },
            { lines: 3, text: '100,000 does not fit in a 16-bit `short`, so the stored value is different (−31,072 on mainstream platforms). The Type Conversions lesson explains the rules.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Your compiler may not even warn',
          text: 'GCC warns about line 3, because the constant visibly overflows, but accepts the first two lines with `-Wall -Wextra` and prints nothing (you need `-Wconversion`). Clang warns about all three by default. And once the value comes from a variable instead of a literal, most compilers stay silent. Silent data loss is exactly the kind of bug that survives into a shipped game — a damage multiplier that quietly rounds down, a counter that wraps.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>

int main() {
    int a = 7.9;
    int b(2.5);
    std::cout << a + b << '\\n';
}`,
      options: [
        { text: '`10.4`', why: '`a` and `b` are `int`s, so they can only hold whole numbers. The fractions were discarded when they were initialized.' },
        { text: '`11`', why: 'That would require rounding 7.9 up to 8 and 2.5 up to 3. Converting floating-point to integer truncates instead: 7 and 2.' },
        { text: 'Nothing — it does not compile', why: 'Copy and direct initialization both allow the double-to-int conversion. Only brace initialization rejects it.' },
        { text: '`9`', correct: true, why: 'Correct. 7.9 truncates to 7 and 2.5 to 2, and 7 + 2 = 9 — with no error, and with GCC not even a warning under `-Wall -Wextra`.' },
      ],
      explanation:
        'Converting a floating-point value to an integer discards the fractional part (truncating towards zero). With `=` and `()` this happens silently. That silent loss of information is called a *narrowing conversion*, and it is the main reason modern C++ prefers braces, which refuse it.',
    },
    {
      kind: 'concept',
      title: 'Brace initialization and narrowing',
      blocks: [
        {
          type: 'p',
          text: '[[brace-initialization|Brace initialization]] (also called *list initialization*) uses `{}` and works in every context: variables, class members, arrays, containers, function return values. Its key safety feature is that it **rejects [[narrowing-conversion|narrowing conversions]]** — conversions that might lose information.',
        },
        {
          type: 'compare',
          left: {
            title: 'Rejected (ill-formed)',
            tone: 'bad',
            code: `int damage{7.9};      // double -> int
char letter{300};     // doesn't fit
float big{16777217};  // not exact`,
          },
          right: {
            title: 'Accepted',
            tone: 'good',
            code: `double speed{4};      // int -> double
int code{'A'};        // char -> int
float half{0.5};      // constant fits`,
          },
        },
        {
          type: 'p',
          text: 'Precisely, a conversion is narrowing if it goes:',
        },
        {
          type: 'list',
          items: [
            'from a floating-point type to an integer type (always);',
            'from a wider floating-point type to a narrower one, such as `double` to `float` — unless the source is a constant whose value is within range;',
            'from an integer to a floating-point type — unless the source is a constant that can be represented exactly;',
            'from an integer type to one that cannot represent all its values, such as `int` to `char` — unless the source is a constant that fits.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the constant exceptions?',
          text: 'When the value is known at compile time, the compiler can check it. `char c{65};` is obviously fine; `char c{300};` obviously is not. When the value is only known at run time — say, the result of `baseDamage * multiplier` — the compiler cannot prove it is safe, so it refuses, and makes you state the conversion explicitly.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Compiler differences',
          text: 'The standard says a narrowing brace initialization is ill-formed. Clang and MSVC reject it with an error. GCC rejects narrowing *constants* with an error, but for values computed at run time it only issues a warning (on by default). Many teams compile with `-Werror=narrowing` so GCC behaves like the others.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'When you really mean to convert',
          text: 'If dropping the fraction is what you want, say so: `int damage{static_cast<int>(rawDamage)};` makes the conversion visible to readers and reviewers. The Type Conversions lesson explains `static_cast` in detail.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'Clang and MSVC refuse to compile this code (GCC warns). Tap the offending line.',
      code: `#include <iostream>

int main() {
    double damageMultiplier{1.5};
    int baseDamage{40};
    int finalDamage{baseDamage * damageMultiplier};
    std::cout << finalDamage << '\\n';
}`,
      bugLines: [6],
      hint: 'What type does `int * double` produce?',
      explanation:
        'Multiplying an `int` by a `double` produces a `double` (60.0 here). Initializing an `int` from a `double` with braces is a narrowing conversion, which the standard forbids — and the compiler cannot check the value because it is computed at run time. Decide what you want and say it: `int finalDamage{static_cast<int>(baseDamage * damageMultiplier)};` truncates, while `std::lround` from `<cmath>` rounds to the nearest whole number. Or make `finalDamage` a `double`.',
    },
    {
      kind: 'mcq',
      multi: true,
      codeOptions: true,
      prompt: 'Which of these declarations are rejected as narrowing? Select all that apply.',
      options: [
        { text: 'int a{2.5};', correct: true, why: 'Floating-point to integer is always narrowing in braces, even for a constant.' },
        { text: 'int b = 2.5;', why: 'Copy initialization does not check for narrowing: `b` silently becomes 2. That is precisely the weakness braces fix.' },
        { text: 'char c{300};', correct: true, why: 'The constant 300 does not fit in a `char` (at most 127 or 255), so this is narrowing.' },
        { text: 'float d{1};', why: 'The constant `1` can be represented exactly as a `float`, so the constant exception applies.' },
        { text: 'int e{\'A\'};', why: '`char` to `int` is a widening conversion: every `char` value fits in an `int`.' },
      ],
      explanation:
        'Brace initialization rejects conversions that may lose information: floating to integer always, and other conversions unless the value is a constant the compiler can verify fits. Widening conversions, like `char` → `int` or `int` → `double`, are always fine. Copy initialization with `=` performs none of these checks.',
    },
    {
      kind: 'concept',
      title: 'Value initialization: empty braces',
      blocks: [
        {
          type: 'p',
          text: 'Empty braces request [[value-initialization]]. For fundamental types, that means **zero**: `0` for integers, `0.0` for floating-point, `false` for `bool`, `\'\\0\'` for `char`. For class types it runs the default constructor (Unit 9), filling any remaining gaps with zeros where the class allows it.',
        },
        {
          type: 'code',
          code: `int kills;        // default-initialized: indeterminate!
int deaths{};     // value-initialized: 0
double timer{};   // 0.0
bool isBoss{};    // false`,
          annotations: [
            { lines: 1, text: '[[default-initialization|Default initialization]] of a local fundamental type does nothing. Reading `kills` is undefined behavior.' },
            { lines: '2-4', text: 'Empty braces guarantee a well-defined zero value, without having to write the literal for each type.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Two declarations a few characters apart, with very different results.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'kills', type: 'int', value: '??? (indeterminate)', address: '0x1000', highlight: true },
                { name: 'deaths', type: 'int', value: '0', address: '0x1004' },
                { name: 'timer', type: 'double', value: '0.0', address: '0x1008' },
                { name: 'isBoss', type: 'bool', value: 'false', address: '0x1010' },
              ],
            },
          ],
        },
        {
          type: 'table',
          headers: ['Where the variable is declared', 'Written as `int x;`', 'Written as `int x{};`'],
          rows: [
            ['Inside a function (local)', 'Indeterminate', '0'],
            ['Outside any function (global)', '0 — static storage is zero-initialized first', '0'],
            ['As a `static` local', '0 — static storage again', '0'],
          ],
          caption: 'Unit 6 explains static storage. Rather than memorizing this table, always initialize.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Is zeroing wasteful?',
          text: 'Almost never. Initializing a local `int` costs at most a single instruction, and if you assign another value before reading it, the optimizer removes the redundant zeroing entirely. Skipping initialization only pays off for very large buffers that are about to be filled — and that is a decision to make deliberately, with a comment.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: '`int health{};` leaves `health` uninitialized, just like `int health;`.',
      answer: false,
      explanation:
        'The braces make all the difference. `int health;` is default initialization, which for a local `int` does nothing, leaving an indeterminate value. `int health{};` is value initialization, which guarantees zero. It is a two-character habit that removes a whole category of undefined behavior.',
    },
    {
      kind: 'concept',
      title: 'The most vexing parse',
      blocks: [
        {
          type: 'p',
          text: 'If empty braces mean "zero", surely empty parentheses do too? Unfortunately not:',
        },
        {
          type: 'code',
          code: `int lives();       // NOT a variable!
int lives{};       // a variable holding 0
int lives = int(); // also 0, but clumsy`,
          annotations: [
            { lines: 1, text: 'This declares a **function** named `lives` that takes no arguments and returns an `int`. No variable is created. GCC warns: "empty parentheses were disambiguated as a function declaration".' },
            { lines: 2, text: 'Braces cannot be mistaken for a function declaration, so this is always a variable.' },
          ],
        },
        {
          type: 'p',
          text: 'This is known as the **most vexing parse**, a name coined by Scott Meyers. The C++ grammar has a rule inherited from C: if a statement *can* be read as a declaration, it *is* a declaration. `int lives();` looks exactly like a function prototype, so that is what it becomes. You usually find out several lines later, from a baffling error when you try to use `lives` as a number.',
        },
        {
          type: 'deepdive',
          title: 'The full-strength version',
          blocks: [
            {
              type: 'p',
              text: 'The name comes from a worse case involving class types. Suppose `Timer` and `Stopwatch` are classes:',
            },
            {
              type: 'code',
              code: `Stopwatch watch(Timer());   // a function declaration!
Stopwatch watch{Timer{}};   // an object, as intended`,
              annotations: [
                { lines: 1, text: 'You meant "create a `Stopwatch` from a temporary `Timer`". The compiler reads: "declare a function `watch` returning `Stopwatch`, taking a parameter that is itself a function returning `Timer`".' },
                { lines: 2, text: 'Braces remove the ambiguity entirely — one of the problems C++11\'s brace syntax was designed to solve.' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just fix the grammar?',
          text: 'Changing the rule would silently change the meaning of existing code that *does* declare functions this way, including in old C headers. Instead, C++11 added a syntax that is never ambiguous. Braces are the fix.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does `int lives();` declare inside `main`?',
      options: [
        { text: 'A variable named `lives` initialized to 0', why: 'That is what `int lives{};` does. With parentheses, the grammar picks a different interpretation.' },
        { text: 'A variable named `lives` with an indeterminate value', why: 'That is `int lives;`. Adding `()` does not create a variable at all.' },
        { text: 'A function named `lives` that takes no arguments and returns an `int`', correct: true, why: 'Correct — the most vexing parse. Anything that can be read as a declaration is one, and this matches a function prototype.' },
        { text: 'Nothing: it is a compile error', why: 'It is perfectly legal (functions may be declared inside other functions). The error only appears later, when you try to use `lives` as a number.' },
      ],
      explanation:
        'C++ resolves the ambiguity in favour of a function declaration. That is why `int lives();` compiles silently (GCC adds a warning) and then produces confusing errors further down. Use `int lives{};` for zero, or `int lives = 0;`.',
    },
    {
      kind: 'concept',
      title: 'Which form should you use?',
      blocks: [
        {
          type: 'p',
          text: 'The C++ Core Guidelines recommend braces as the default (rule ES.23). This course follows that advice for variables whose value matters:',
        },
        {
          type: 'list',
          items: [
            '**Use braces by default**: `int score{0};`, `double speed{4.5};`. You get narrowing checks for free and never hit the vexing parse.',
            '**Use empty braces for zero**: `int kills{};`.',
            '**`=` is fine for obvious cases** where no conversion is involved: `int lives = 3;`. It reads naturally, and many style guides — and Unreal\'s code base — use it widely.',
            '**Never** leave a variable uninitialized without a very good, commented reason.',
          ],
        },
        {
          type: 'p',
          text: 'There is one important exception to "braces by default". Containers such as `std::vector` treat a braced list as **the elements themselves**:',
        },
        {
          type: 'code',
          title: 'vector_braces.cpp',
          runnable: true,
          code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> a(3, 5);
    std::vector<int> b{3, 5};
    std::cout << a.size() << ' ' << b.size() << '\\n';
}`,
          output: '3 2',
          annotations: [
            { lines: 5, text: 'Parentheses call the "count and value" constructor: three elements, each 5 — `{5, 5, 5}`.' },
            { lines: 6, text: 'Braces mean "a list of elements": two elements, `{3, 5}`. When a type can be built from a list, braces prefer that.' },
            { lines: 7, text: '`size()` reports the number of elements. Unit 7 covers `std::vector` properly.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Uninitialized by design in Unreal',
          text: 'For speed, some Unreal math types deliberately leave their contents uninitialized when created with no arguments: `FVector Location;` holds garbage. Write `FVector Location = FVector::ZeroVector;` or `FVector Location(ForceInitToZero);` when you want zero. It is the same trade-off as `int x;`, made by Epic for types that are created millions of times per frame.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Using brace initialization, make `score` start at zero without writing a number, and `speed` start at 4.5.',
      template: `int score___;
double speed___;`,
      blanks: [{ answers: ['{}'] }, { answers: ['{4.5}'] }],
      wordBank: ['{}', '{4.5}', '()', '(4.5)', '{4}'],
      explanation:
        '`{}` value-initializes `score` to 0. `{4.5}` brace-initializes `speed`. `()` would trigger the most vexing parse and declare a function named `score`; `(4.5)` is valid direct initialization but not the brace form asked for; and `{4}` would compile but give the wrong value.',
    },
    {
      kind: 'mcq',
      prompt: 'A teammate writes `std::vector<int> ammo{30, 5};`, intending a vector of 30 magazines with 5 rounds each. What do they actually get?',
      options: [
        { text: 'Thirty elements, each holding 5', why: 'That is what `std::vector<int> ammo(30, 5);` with parentheses would create.' },
        { text: 'Two elements: 30 and 5', correct: true, why: 'Right. Braces build the vector from the list of elements, so it holds exactly the two values written.' },
        { text: 'A compile error, because braces cannot take two values', why: 'Braces can take any number of values; for a container, each becomes an element.' },
        { text: 'Five elements, each holding 30', why: 'Neither syntax swaps the arguments; parentheses would give thirty 5s, braces give the two listed values.' },
      ],
      explanation:
        'For types that accept a list of elements, such as `std::vector`, braces strongly prefer the list interpretation. This is the main caveat to "use braces by default": when you want a container\'s count-and-value constructor, use parentheses. For fundamental types like `int` and `double`, there is no such ambiguity.',
    },
  ],
  takeaways: [
    'C++ has several initialization syntaxes: `=` (copy), `()` (direct), `{}` (brace/list) and `{}` with nothing inside (value).',
    'Copy and direct initialization silently accept narrowing conversions, such as `int x = 7.9;` becoming 7.',
    'Brace initialization rejects narrowing: floating → integer always, and other lossy conversions unless the value is a constant that fits.',
    'GCC only warns for non-constant narrowing in braces; Clang and MSVC reject it. Consider `-Werror=narrowing`.',
    'Empty braces value-initialize to zero; a local `int x;` is left indeterminate.',
    '`int x();` declares a function — the most vexing parse. Braces avoid it.',
    'Prefer braces by default, except when you want a container\'s count-and-value constructor: `std::vector<int> v(3, 5)` is not `v{3, 5}`.',
  ],
  reading: [
    {
      title: 'Variable assignment and initialization',
      url: 'https://www.learncpp.com/cpp-tutorial/variable-assignment-and-initialization/',
      source: 'learncpp',
      note: 'Another walkthrough of every initialization form, with recommendations.',
    },
    {
      title: 'List-initialization',
      url: 'https://en.cppreference.com/w/cpp/language/list_initialization',
      source: 'cppreference',
      note: 'The full rules for braces, including the precise definition of narrowing conversions.',
    },
    {
      title: 'Value-initialization',
      url: 'https://en.cppreference.com/w/cpp/language/value_initialization',
      source: 'cppreference',
      note: 'What empty braces do for fundamental and class types.',
    },
    {
      title: 'C++ Core Guidelines: ES.23 — Prefer the {}-initializer syntax',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Res-list',
      source: 'core-guidelines',
      note: 'The rationale for brace initialization, and the exceptions.',
    },
  ],
};
