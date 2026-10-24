import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-const-constexpr-auto',
  title: 'const, constexpr and auto',
  summary: 'Lock values down with const, compute them at compile time with constexpr, and let the compiler deduce types with auto — wisely.',
  minutes: 16,
  objectives: [
    'Declare `const` variables and explain how const correctness prevents bugs',
    'Distinguish `const` (fixed after initialization) from `constexpr` (known at compile time)',
    'Use `static_assert` and `constexpr` values where the compiler requires constants',
    'Predict the type `auto` deduces, including how it drops top-level `const` and references',
    'Decide when `auto` improves readability and when it hides important information',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'const: a promise that a value won\'t change',
      blocks: [
        {
          type: 'p',
          text: 'Adding [[const]] to a declaration makes the variable read-only: it gets its value at initialization and can never be modified afterwards. Any attempt to assign to it is a compile error.',
        },
        {
          type: 'code',
          title: 'rules.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    const int maxHealth{100};
    const double respawnDelaySeconds{3.5};
    int health{maxHealth};

    health = health - 40;
    std::cout << health << '/' << maxHealth << '\\n';
    std::cout << "Respawn in " << respawnDelaySeconds << "s\\n";
}`,
          output: '60/100\nRespawn in 3.5s',
          annotations: [
            { lines: 4, text: 'A named constant. It **must** be initialized: there is no way to give a `const` variable a value later.' },
            { lines: 6, text: 'A non-const variable may be initialized from a const one — it gets its own copy, which it is free to change.' },
            { lines: 8, text: 'Fine: `health` is not const. Writing `maxHealth = 120;` instead would fail with "assignment of read-only variable".' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why bother marking things const?',
          text: 'Three reasons. **Safety**: an accidental write — `maxHealth = 0` instead of `health = 0` — becomes a compile error instead of a bug hunt. **Clarity**: a reader who sees `const` knows the value is fixed and can stop tracking it. **Fewer magic numbers**: a named constant explains what `100` means and lets you change it in one place.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: '`const int` or `int const`?',
          text: 'Both mean the same thing. This course writes `const` first, the more common style. The position starts to matter with pointers, which Unit 8 explains.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This program does not compile. Tap the line the compiler rejects.',
      code: `#include <iostream>

int main() {
    const int maxLives{3};
    int lives{maxLives};
    lives = lives - 1;
    maxLives = maxLives + 1;
    std::cout << lives << '\\n';
}`,
      bugLines: [7],
      hint: 'Which variables are allowed to change?',
      explanation:
        'Line 7 assigns to `maxLives`, which is `const`. GCC reports "assignment of read-only variable \'maxLives\'". Line 6 is fine: `lives` is an ordinary variable that merely *started* with the value of `maxLives`. If the maximum genuinely needs to change at run time (say, after an upgrade), it should not be `const` — perhaps keep the base value const and store upgrades in a separate variable.',
    },
    {
      kind: 'concept',
      title: 'const correctness',
      blocks: [
        {
          type: 'p',
          text: '[[const-correctness|Const correctness]] is the practice of marking *everything* const that does not need to change, consistently, so that the compiler enforces read-only access throughout your program. A good default for local variables: if you compute a value once and only read it afterwards, make it `const`.',
        },
        {
          type: 'compare',
          left: {
            title: 'Everything mutable',
            tone: 'bad',
            code: `int baseDamage{40};
double critMultiplier{2.5};
double critDamage{baseDamage * critMultiplier};
// 30 lines later: can any of these
// have changed? You must read it all.`,
          },
          right: {
            title: 'Const by default',
            tone: 'good',
            code: `const int baseDamage{40};
const double critMultiplier{2.5};
const double critDamage{baseDamage * critMultiplier};
// Guaranteed unchanged. Nothing
// to track.`,
          },
        },
        {
          type: 'p',
          text: 'In this unit, `const` applies to simple variables. The same idea reaches much further: functions that promise not to modify their arguments (const references, Unit 6), pointers to read-only data (Unit 8), and member functions that promise not to change their object (Unit 9). Together these let the compiler verify that read-only code really is read-only.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Const correctness in Unreal',
          text: 'Epic\'s coding standard has a section devoted to const correctness: pass read-only arguments as const references, mark getters as const member functions, and prefer const local variables. Engine code relies on it heavily — a `const` getter like `GetActorLocation()` tells you, before reading any documentation, that calling it cannot change the actor.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Does const make code faster?',
          text: 'Occasionally, but rarely by much: the optimizer can usually see for itself that a local variable never changes. Use `const` for correctness and clarity. For guaranteed compile-time evaluation, use `constexpr`, next.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'You can declare `const int maxAmmo;` first and give it its value on a later line with `maxAmmo = 30;`.',
      answer: false,
      explanation:
        'A `const` variable must be initialized in its declaration, because afterwards *every* assignment is forbidden — including the first one. `const int maxAmmo;` is itself a compile error ("uninitialized const"). This is a good example of why the initialization/assignment distinction matters: `const` permits the first, never the second.',
    },
    {
      kind: 'concept',
      title: 'constexpr: known at compile time',
      blocks: [
        {
          type: 'p',
          text: '`const` only promises that a value will not change *after* it is initialized; the value itself might come from a file, user input or a calculation at run time. [[constexpr]] promises more: the value must be computable **while compiling**. The initializer has to be a *constant expression* — something the compiler can evaluate itself — and a `constexpr` variable is automatically `const`.',
        },
        {
          type: 'code',
          title: 'inventory.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    constexpr int maxPlayers{4};
    constexpr int slotsPerPlayer{20};
    constexpr int totalSlots{maxPlayers * slotsPerPlayer};
    static_assert(totalSlots <= 100, "Inventory too large");

    int inventory[totalSlots]{};
    std::cout << "Slots: " << totalSlots << '\\n';
    std::cout << "Bytes: " << sizeof(inventory) << '\\n';
}`,
          output: 'Slots: 80\nBytes: 320',
          annotations: [
            { lines: '4-5', text: 'Literal values are constant expressions, so these are fine.' },
            { lines: 6, text: 'Arithmetic on constant expressions is also a constant expression. The compiler computes 80; no multiplication happens at run time.' },
            { lines: 7, text: '`static_assert` checks a condition **at compile time**. If someone raises `slotsPerPlayer` to 30, the build fails with this message instead of the game misbehaving.' },
            { lines: 9, text: 'A built-in array (Unit 7) needs its size at compile time. A `constexpr` value works here; a plain run-time value would not. `{}` zeroes every slot.' },
          ],
        },
        {
          type: 'table',
          headers: ['Question', '`const`', '`constexpr`'],
          rows: [
            ['Can it change after initialization?', 'No', 'No'],
            ['Must the value be known at compile time?', 'No — run-time values are fine', 'Yes'],
            ['Usable as an array size or in `static_assert`?', 'Only if its initializer happens to be constant', 'Always'],
            ['Typical use', 'Values fixed once computed or loaded', 'True constants: limits, sizes, tuning values'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have a separate keyword?',
          text: '`const` alone is ambiguous: `const int a{4};` is a compile-time constant, but `const int b{readConfig()};` is not, and you cannot tell which kind you have at a glance. `constexpr` states the intent explicitly and makes the compiler verify it. Work done at compile time costs nothing at run time and is checked before the game ever ships.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'More compile-time power later',
          text: 'Functions can be `constexpr` too, so the compiler can run them while compiling — and C++20 adds `consteval` for functions that *must* run at compile time. Unit 15 is devoted to compile-time programming.',
        },
      ],
    },
    {
      kind: 'mcq',
      codeOptions: true,
      prompt: '`readHealthFromSave()` is an ordinary (non-constexpr) function that loads a number from a save file. Which declaration fails to compile?',
      options: [
        { text: 'constexpr int secondsPerHour{60 * 60};', why: 'Arithmetic on literals is a constant expression, so the compiler computes 3600 itself.' },
        { text: 'const int savedHealth{readHealthFromSave()};', why: '`const` accepts run-time values: it only promises the value will not change after initialization.' },
        { text: 'constexpr int startHealth{readHealthFromSave()};', correct: true, why: 'Correct. The value depends on a file read at run time, so it cannot be a constant expression. GCC: "call to non-\'constexpr\' function".' },
        { text: 'constexpr double third{1.0 / 3.0};', why: 'Floating-point arithmetic on literals is also a constant expression.' },
      ],
      explanation:
        '`constexpr` requires a value the compiler can compute while compiling. Anything that depends on the outside world — files, input, the clock, random numbers — is only known at run time, so it can be `const` but not `constexpr`.',
    },
    {
      kind: 'mcq',
      prompt: 'Your game reads the difficulty multiplier from a settings file at start-up, and it never changes after that. How should you declare the variable that holds it?',
      options: [
        { text: '`constexpr double difficulty{...};`', why: 'The value comes from a file at run time, so the compiler cannot know it. `constexpr` would not compile.' },
        { text: '`const double difficulty{...};`', correct: true, why: 'Right. The value is only known at run time, but once loaded it should never change — exactly what `const` expresses.' },
        { text: '`double difficulty{...};`', why: 'It would work, but nothing would stop a later line from accidentally changing it. Mark it `const` to get the compiler\'s protection.' },
        { text: '`auto difficulty;`', why: '`auto` needs an initializer to deduce a type from, and it says nothing about whether the value may change.' },
      ],
      explanation:
        'Ask two questions. Will the value change after it is set? If not, use `const` at least. Is the value known while compiling? If so, upgrade to `constexpr`. Settings, save data and player input fail the second test, so they get `const`.',
    },
    {
      kind: 'concept',
      title: 'auto: let the compiler deduce the type',
      blocks: [
        {
          type: 'p',
          text: 'Writing [[auto]] instead of a type asks the compiler to deduce the type from the initializer. This is [[type-deduction]], and it happens entirely at compile time: the variable still has one fixed type, exactly as if you had written it out. C++ does not become dynamically typed.',
        },
        {
          type: 'code',
          title: 'auto.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    auto lives = 3;
    auto speed = 4.5;
    auto ratio = 0.5f;
    auto big = 9'000'000'000LL;
    auto half = 7 / 2;
    std::cout << lives << ' ' << speed << ' ' << ratio << ' '
              << big << ' ' << half << '\\n';
    std::cout << sizeof(lives) << ' ' << sizeof(ratio) << ' '
              << sizeof(big) << '\\n';
}`,
          output: '3 4.5 0.5 9000000000 3\n4 4 8',
          annotations: [
            { lines: 4, text: '`3` is an `int` literal, so `lives` is an `int`.' },
            { lines: 5, text: '`4.5` is a `double` literal, so `speed` is a `double`.' },
            { lines: 6, text: 'The `f` suffix makes a `float` literal, so `ratio` is a `float` (4 bytes).' },
            { lines: 7, text: 'The `LL` suffix makes a `long long` literal (8 bytes).' },
            { lines: 8, text: 'Careful: `7 / 2` divides two `int`s, which gives the `int` 3 (Unit 3 explains integer division). `auto` faithfully deduces `int`.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**An initializer is required.** `auto x;` does not compile — there is nothing to deduce from. As a bonus, an `auto` variable can never be left uninitialized.',
            '**The literal decides.** `auto x = 0;` is an `int`, even if you needed a `double` or a 64-bit counter.',
            '**Braces are fine for a single value.** `auto x{5};` deduces `int`. But avoid `auto x = {5};`, which deduces a list type (`std::initializer_list<int>`) rather than an `int`.',
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `#include <iostream>

int main() {
    auto damage = 10 / 4;
    auto precise = 10 / 4.0;
    std::cout << damage << ' ' << precise << '\\n';
}`,
      options: [
        { text: '`2.5 2.5`', why: '`10 / 4` divides two `int`s, so the result is the `int` 2. `auto` cannot know you hoped for 2.5.' },
        { text: '`2 2.5`', correct: true, why: 'Correct. `10 / 4` is integer division (2), so `damage` is an `int`. `10 / 4.0` involves a `double`, so `precise` is a `double` holding 2.5.' },
        { text: '`2 2`', why: '`4.0` is a `double` literal, which makes the second division floating-point: 2.5.' },
        { text: '`3 2.5`', why: 'Integer division truncates towards zero; it never rounds 2.5 up to 3.' },
      ],
      explanation:
        '`auto` deduces exactly the type of its initializer, and the initializer\'s type is fixed by its operands. Two `int`s produce an `int`; adding a `double` produces a `double`. When the type matters — and here it changes the result — be sure what the initializer\'s type really is.',
    },
    {
      kind: 'concept',
      title: 'What auto drops: const and references',
      blocks: [
        {
          type: 'p',
          text: 'Plain `auto` deduces the type of the **value**, and then creates a new, independent object. Two things do not survive that copy: *top-level* `const`, and references. (A [[reference]], written `int&`, is another name for an existing object; Unit 6 covers references in depth.)',
        },
        {
          type: 'table',
          headers: ['Given…', 'Declaration', 'Deduced type'],
          rows: [
            ['`const int maxHp{100};`', '`auto a = maxHp;`', '`int` — a mutable copy'],
            ['`const int maxHp{100};`', '`const auto b = maxHp;`', '`const int`'],
            ['`int& alias{health};`', '`auto c = alias;`', '`int` — a copy, not an alias'],
            ['`int& alias{health};`', '`auto& d = alias;`', '`int&` — refers to `health`'],
            ['`int health{100};`', '`const auto& e = health;`', '`const int&` — read-only view of `health`'],
          ],
        },
        {
          type: 'code',
          title: 'alias.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int health{100};
    int& alias{health};
    auto copy = alias;
    auto& same = alias;
    copy -= 30;
    same -= 10;
    std::cout << health << ' ' << copy << '\\n';
}`,
          output: '90 70',
          annotations: [
            { lines: 5, text: '`alias` is a reference: another name for `health`. Using `alias` *is* using `health`.' },
            { lines: 6, text: 'Plain `auto` drops the reference: `copy` is a new `int` holding 100.' },
            { lines: 7, text: '`auto&` keeps the reference: `same` is yet another name for `health`.' },
            { lines: '8-9', text: '`copy` goes to 70 on its own; subtracting through `same` changes `health` to 90.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Plain auto made a new object; auto& refers to the existing one.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'health', type: 'int', value: '90', address: '0x1000', id: 'hp' },
                { name: 'alias', type: 'int&', value: '→ health', pointsTo: 'hp' },
                { name: 'same', type: 'int&', value: '→ health', pointsTo: 'hp' },
                { name: 'copy', type: 'int', value: '70', address: '0x1004', highlight: true },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why drop them?',
          text: 'Initializing a new variable from a value makes a copy, and a copy is independent of the original: there is no reason it must be `const` just because the source was. Dropping references keeps `auto` predictable — `auto x = something;` always means "a new object". When you want a reference or constness, you say so: `auto&`, `const auto`, `const auto&`. These are the same rules templates use, which Unit 12 explores.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Write the type the compiler deduces for each variable.',
      template: `const int maxHealth{100};
auto a = maxHealth;        // a is: ___
const auto b = maxHealth;  // b is: ___`,
      blanks: [{ answers: ['int'] }, { answers: ['const int', 'int const'] }],
      wordBank: ['int', 'const int', 'int&', 'const int&', 'auto'],
      explanation:
        'Plain `auto` deduces the value\'s type and drops top-level `const`, because `a` is a brand-new copy that may be changed freely. Adding `const` yourself gives `const int`. Neither is a reference: to refer to `maxHealth` itself you would write `const auto& c = maxHealth;`.',
    },
    {
      kind: 'concept',
      title: 'When auto helps — and when it hurts',
      blocks: [
        {
          type: 'p',
          text: '`auto` is a readability tool, and like any tool it can be overused. The question is always: does spelling out the type tell the reader something useful?',
        },
        {
          type: 'compare',
          left: {
            title: 'auto helps',
            tone: 'good',
            code: `// The type is already on the right:
auto enemy = std::make_unique<Enemy>();
// The type is long and adds nothing:
auto it = lootTable.find(itemId);`,
            text: 'Repeating `std::unique_ptr<Enemy>` or a long iterator type adds noise, not information.',
          },
          right: {
            title: 'auto hurts',
            tone: 'bad',
            code: `// What is this? int? double? a struct?
auto result = computeScore(player);
// int, when you needed 64 bits:
auto totalPlayTimeMs = 0;`,
            text: 'The type matters, and nothing nearby reveals it.',
          },
        },
        {
          type: 'list',
          items: [
            '**Use `auto`** when the type is obvious from the right-hand side, very long, or impossible to write (lambdas, Unit 13).',
            '**Write the type** when it carries meaning the reader needs: units, size, signedness, or a deliberate conversion.',
            '**Beware string literals**: `auto name = "Ada";` deduces `const char*`, a pointer to characters, not a text object you can append to.',
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal is strict about auto',
          text: 'Epic\'s coding standard says not to use `auto` except in a few cases, such as binding a lambda to a variable, iterator variables, and template code where the type is hard to discern, and to always be explicit about the type you are initializing. Engine code is read by thousands of developers, so Epic values seeing types at a glance over brevity. Follow the local convention of whatever code base you are in.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Your IDE can show the deduced type',
          text: 'Hover over an `auto` variable in Visual Studio, Rider or VS Code and the IDE shows the type the compiler deduced. If you are surprised by what you see, that is a strong hint to write the type explicitly.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This program fails to compile. Tap the line where the real mistake was made.',
      code: `#include <iostream>
#include <string>

int main() {
    auto playerName = "Ada";
    playerName += " Lovelace";
    std::cout << playerName << '\\n';
}`,
      bugLines: [5],
      hint: 'What type does a string literal have?',
      explanation:
        'The error is reported on line 6 ("invalid operands of types \'const char*\' and \'const char*\'"), but the mistake is on line 5. A string literal is an array of `const char`, and `auto` deduces `const char*` — a pointer to the first character, not a `std::string`. Pointers cannot be appended to with `+=`. Write the type you mean: `std::string playerName{"Ada"};`. (Unit 4 covers `std::string`.) A good illustration of when `auto` hides exactly the information that matters.',
    },
  ],
  takeaways: [
    '`const` makes a variable read-only after initialization; it must be initialized, and assignments to it are compile errors.',
    'Const correctness — const by default for anything that doesn\'t change — turns accidental writes into compile errors and makes code easier to reason about.',
    '`constexpr` requires a value known at compile time and implies `const`; use it for true constants, array sizes and `static_assert`.',
    'Values from files, input or other run-time sources can be `const` but not `constexpr`.',
    '`auto` deduces a fixed type from the initializer at compile time; it requires an initializer, so it cannot be left uninitialized.',
    'Plain `auto` drops top-level `const` and references; write `const auto`, `auto&` or `const auto&` to keep them.',
    'Use `auto` when the type is obvious or noisy; write the type when it carries meaning. `auto s = "text";` is a `const char*`, not a string.',
  ],
  reading: [
    {
      title: 'Constant variables (named constants)',
      url: 'https://www.learncpp.com/cpp-tutorial/constant-variables-named-constants/',
      source: 'learncpp',
      note: 'More on const variables and why named constants beat magic numbers.',
    },
    {
      title: 'constexpr specifier',
      url: 'https://en.cppreference.com/w/cpp/language/constexpr',
      source: 'cppreference',
      note: 'The rules for constexpr variables and functions, including what counts as a constant expression.',
    },
    {
      title: 'Placeholder type specifiers (auto)',
      url: 'https://en.cppreference.com/w/cpp/language/auto',
      source: 'cppreference',
      note: 'Exactly how `auto` deduces types, including the brace-initialization special cases.',
    },
    {
      title: 'C++ Core Guidelines: Con — Constants and immutability',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-const',
      source: 'core-guidelines',
      note: 'Guidelines such as "by default, make objects immutable" and "use constexpr for values that can be computed at compile time".',
    },
    {
      title: 'Epic C++ Coding Standard for Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine',
      source: 'unreal-docs',
      note: 'See the sections on const correctness and on the restricted use of `auto`.',
    },
  ],
};
