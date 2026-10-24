import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-constexpr-compile-time',
  title: 'Compile-Time Programming',
  summary: 'Making the compiler do the work: constexpr functions, consteval, constinit, if constexpr, static_assert and lookup tables.',
  minutes: 18,
  objectives: [
    'Write `constexpr` functions and predict when they run at compile time and when at run time',
    'Use `static_assert` to check assumptions and test `constexpr` functions during compilation',
    'Choose between `constexpr`, `consteval` and `constinit`, and explain what each guarantees',
    'Branch on types inside templates with `if constexpr`',
    'Build a compile-time lookup table and explain its costs and benefits',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Why compute at compile time?',
      blocks: [
        {
          type: 'p',
          text: 'Every C++ compiler contains an **interpreter** for a large subset of the language. Anything it can compute while compiling becomes a plain constant baked into your executable: the work costs nothing when the game runs, because it was done on your build machine, once.',
        },
        {
          type: 'p',
          text: 'You met the entry point earlier: a [[constexpr]] variable must be initialized with a value the compiler can compute — a [[constant-expression]]. That is different from `const`, which only promises the variable won\'t change after initialization, however late that happens:',
        },
        {
          type: 'code',
          code: `constexpr int MaxPlayers = 4;            // compile-time constant
std::array<int, MaxPlayers> scores{};    // OK: size must be constant

int readConfig();                        // value known at run time
const int maxEnemies = readConfig();     // const, but run-time value
// std::array<int, maxEnemies> enemies;  // error: not a constant
// constexpr int cap = readConfig();     // error: not a constant`,
          annotations: [
            { lines: 1, text: '`constexpr` on a variable means "computed at compile time, and `const`". The compiler rejects the declaration if it cannot compute the value.' },
            { lines: 2, text: 'Some places in the language **require** a constant expression: array sizes, template arguments, `case` labels, and the condition of a `static_assert`.' },
            { lines: 5, text: 'Perfectly legal — but `maxEnemies` is only known once the program runs, so it cannot be used where a constant is required.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Three reasons to move work into the compiler',
          text: '**Zero run-time cost:** a value computed during compilation is just a number in the binary — no loop, no function call, no start-up delay. **Errors found earlier:** mistakes in compile-time code are reported by the compiler, before anyone plays the build. **Constants where the language needs them:** array sizes, template arguments and `case` labels can be computed by real functions instead of hand-typed magic numbers.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'constexpr functions: one function, two lives',
      blocks: [
        {
          type: 'p',
          text: 'A `constexpr` function is an ordinary function that the compiler is **allowed** to run during compilation. When you call it in a context that requires a constant — and all its arguments are constants — it runs at compile time. Called with run-time values, it compiles to normal machine code and runs like any other function.',
        },
        {
          type: 'code',
          title: 'xp_curve.cpp',
          runnable: true,
          code: `#include <iostream>
#include <vector>

constexpr int xpForLevel(int level) {
    int xp = 0;
    for (int l = 1; l < level; ++l) {
        xp += 100 * l;            // 100, then 200, then 300...
    }
    return xp;
}

int main() {
    constexpr int capXp = xpForLevel(10);       // compile time
    std::vector<int> partyLevels{3, 7};         // run-time data
    for (int lvl : partyLevels) {
        std::cout << "Level " << lvl << " needs "
                  << xpForLevel(lvl) << " XP\\n";  // run time
    }
    std::cout << "Cap: " << capXp << '\\n';
}`,
          output: `Level 3 needs 300 XP
Level 7 needs 2100 XP
Cap: 4500`,
          annotations: [
            { lines: 4, text: '`constexpr` on a function means "may be evaluated at compile time". It is a permission, not an order.' },
            { lines: '5-8', text: 'Local variables and loops are fine in `constexpr` functions (allowed since C++14).' },
            { lines: 13, text: 'Initializing a `constexpr` variable **requires** a constant, so the compiler runs `xpForLevel(10)` itself. The executable just contains 4500.' },
            { lines: 17, text: '`lvl` is only known at run time, so this is a normal function call. Same function, no duplicate code.' },
          ],
        },
        {
          type: 'p',
          text: 'In C++20, a `constexpr` function can use almost the whole language: loops, `if` and `switch`, local variables, other `constexpr` functions, even virtual calls and `new`/`delete` — as long as everything allocated during compile-time evaluation is freed before it finishes. What the compiler cannot do during constant evaluation is anything that depends on the running program: reading files or input, calling non-`constexpr` functions, or touching ordinary global variables.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'From one line to (almost) everything',
          text: 'In C++11, a `constexpr` function could contain only a single `return` statement, so people wrote recursion-heavy one-liners. C++14 allowed loops and local variables, C++17 added `if constexpr` and constexpr lambdas, and C++20 allowed dynamic allocation, `try` blocks and virtual functions. Before `constexpr` existed, compile-time computation needed [[macro|macros]] or intricate template tricks.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'constexpr functions live in headers',
          text: 'To run a function at compile time, the compiler must see its full body in every file that calls it. So `constexpr` functions are implicitly [[inline]] and are normally defined in header files, just like templates.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Given `constexpr int square(int x) { return x * x; }` and a run-time variable `int n`, which line is **guaranteed** to call `square` at compile time?',
      options: [
        { text: '`int a = square(5);`', why: 'The compiler *may* compute this at compile time (optimizers usually do), but nothing requires it: `a` is an ordinary variable, so a constant is not needed.' },
        { text: '`constexpr int b = square(5);`', correct: true, why: 'A `constexpr` variable must be initialized with a constant expression, so the compiler is required to evaluate `square(5)` during compilation.' },
        { text: '`const int c = square(n);`', why: '`n` is only known at run time, so this is necessarily a run-time call. `const` does not require a compile-time value.' },
        { text: '`auto d = square(5) + n;`', why: 'Adding a run-time value makes the whole expression a run-time computation. Even `square(5)` alone carries no guarantee here.' },
      ],
      explanation:
        '`constexpr` on a function grants permission; the **calling context** decides. Only contexts that require a constant expression — a `constexpr` variable, an array bound, a template argument, a `case` label, a `static_assert` — force compile-time evaluation. Everywhere else it is up to the optimizer. If you need a guarantee, use one of those contexts (or `consteval`, coming up).',
    },
    {
      kind: 'concept',
      title: 'Undefined behavior becomes a compile error, and static_assert',
      blocks: [
        {
          type: 'p',
          text: 'Here is a remarkable property of compile-time evaluation: the compiler\'s interpreter is **strict**. If evaluating a constant expression would trigger [[undefined-behavior]] — signed overflow, reading past the end of an array, using an uninitialized value — the program does not compile. Run-time UB silently corrupts things; compile-time UB is a diagnostic.',
        },
        {
          type: 'code',
          code: `constexpr int scaleDamage(int base, int multiplier) {
    return base * multiplier;
}
constexpr int ok = scaleDamage(50, 3);              // 150
constexpr int boom = scaleDamage(2'000'000'000, 2); // overflow!`,
          annotations: [
            { lines: 5, text: '4,000,000,000 does not fit in an `int`. At run time this would be undefined behavior; here the compiler refuses to compile it.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'GCC',
          code: `damage.cpp:5:33:   in 'constexpr' expansion of
    'scaleDamage(2000000000, 2)'
damage.cpp:5:50: error: overflow in constant expression`,
        },
        {
          type: 'p',
          text: '[[static-assert]] puts this strictness to work. `static_assert(condition, "message");` evaluates the condition during compilation; if it is false, compilation stops with your message. It can check facts about types, and it can test your `constexpr` functions — unit tests that run inside the compiler:',
        },
        {
          type: 'code',
          title: 'checks.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>

constexpr int xpForLevel(int level) {
    int xp = 0;
    for (int l = 1; l < level; ++l) xp += 100 * l;
    return xp;
}

static_assert(xpForLevel(1) == 0, "level 1 starts at zero XP");
static_assert(xpForLevel(3) == 300);

struct PacketHeader {
    std::uint16_t type;
    std::uint16_t length;
    std::uint32_t sequence;
};
static_assert(sizeof(PacketHeader) == 8,
              "PacketHeader is sent over the network: keep it 8 bytes");

int main() {
    std::cout << "All compile-time checks passed\\n";
}`,
          output: 'All compile-time checks passed',
          annotations: [
            { lines: 10, text: 'A unit test that runs in the compiler. If someone "improves" the XP formula and breaks this, the build fails immediately.' },
            { lines: 11, text: 'Since C++17 the message is optional.' },
            { lines: '18-19', text: 'Locks down a layout assumption. If a teammate adds a field, the build fails here — not as mysterious corruption in multiplayer.' },
            { lines: 22, text: 'If you can run this program at all, every `static_assert` above has already passed.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'static_assert vs. assert',
          text: '`assert(x)` (an [[assertion]] from `<cassert>`) checks a condition **at run time**, in debug builds, and can test anything — player input, file contents. `static_assert` checks **at compile time**, costs nothing at run time, and can only test constant expressions. Use `static_assert` whenever the fact is knowable while compiling.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'If a `constexpr` function would overflow a signed integer while initializing a `constexpr` variable, the program compiles, but has undefined behavior at run time.',
      answer: false,
      explanation:
        'During constant evaluation, the compiler must diagnose undefined behavior: the declaration fails to compile with an error such as *overflow in constant expression*. That is one of the hidden benefits of compile-time evaluation — and a cheap way to test edge cases: wrap them in a `static_assert` and the compiler becomes a UB detector.',
    },
    {
      kind: 'concept',
      title: 'consteval and constinit',
      blocks: [
        {
          type: 'p',
          text: 'C++20 added two keywords that make different guarantees than `constexpr`. A [[consteval]] function is an *immediate function*: **every** call must be evaluated at compile time, or the program does not compile. Use it when a run-time call would be a mistake — typically because it would waste time every frame.',
        },
        {
          type: 'p',
          text: 'A classic games example is **hashed names**. Engines often identify actions, events and assets by a hash of their name, because comparing two integers is far cheaper than comparing strings. With `constexpr`, the same hash function serves both worlds — and since `case` labels require constants, the compiler hashes every label for you:',
        },
        {
          type: 'code',
          title: 'commands.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>
#include <string_view>

constexpr std::uint32_t hashName(std::string_view text) {
    std::uint32_t hash = 2166136261u;     // FNV-1a offset basis
    for (char c : text) {
        hash ^= static_cast<std::uint8_t>(c);
        hash *= 16777619u;                // FNV-1a prime
    }
    return hash;
}

void runCommand(std::string_view cmd) {
    switch (hashName(cmd)) {              // hashed at run time
        case hashName("jump"):            // hashed at compile time
            std::cout << "Jumping\\n";
            break;
        case hashName("crouch"):
            std::cout << "Crouching\\n";
            break;
        default:
            std::cout << "Unknown command: " << cmd << '\\n';
    }
}

int main() {
    runCommand("jump");
    runCommand("crouch");
    runCommand("fly");
}`,
          output: `Jumping
Crouching
Unknown command: fly`,
          annotations: [
            { lines: '5-12', text: 'FNV-1a, a simple, popular string hash. Unsigned arithmetic wraps around by definition, so the multiplication can never be undefined behavior.' },
            { lines: 15, text: 'The typed command is only known at run time, so this call runs as normal code.' },
            { lines: 16, text: '`case` labels must be constants, so these calls are evaluated by the compiler. If two labels ever hashed to the same value, the duplicate `case` would be a compile error — free collision detection.' },
            { lines: 22, text: 'One caveat: an *unknown* string could, by bad luck, hash to the same value as a known one. Engines either accept that tiny risk or compare the full string after the hash matches.' },
          ],
        },
        {
          type: 'p',
          text: 'But in an ordinary call like `bindAction(hashName("jump"))`, nothing forces compile-time evaluation — the hash may run every time. A `consteval` wrapper guarantees it never does:',
        },
        {
          type: 'code',
          code: `consteval std::uint32_t actionId(std::string_view name) {
    return hashName(name);
}

bindAction(actionId("jump"));    // hashed by the compiler, guaranteed
bindAction(actionId(typedName)); // error: 'typedName' is not a
                                 // constant expression`,
          annotations: [
            { lines: 5, text: 'Even though `bindAction`\'s parameter is an ordinary run-time value, the `consteval` call must be evaluated during compilation. The machine code just passes a number.' },
            { lines: 6, text: 'A run-time argument is rejected at compile time — the mistake can\'t slip into a hot loop.' },
          ],
        },
        {
          type: 'p',
          text: '[[constinit]] solves a different problem. Global and `static` variables whose initializer runs at program start-up are initialized in an **unspecified order across .cpp files**; if one global\'s initializer reads another that isn\'t initialized yet, you get a nasty start-up bug (the "static initialization order fiasco"). `constinit` demands that the variable be initialized at compile time — but unlike `constexpr`, the variable stays **mutable**:',
        },
        {
          type: 'code',
          code: `constinit int g_spawnedThisLevel = 0;          // OK, and mutable
constinit int g_maxEnemies = readConfigValue(); // error: no constant
                                                // initializer`,
          annotations: [
            { lines: 1, text: 'Guaranteed to be ready before any code runs, yet the game can still increment it.' },
            { lines: 2, text: 'A run-time initializer is a compile error, so accidental start-up-order dependencies are caught.' },
          ],
        },
        {
          type: 'table',
          headers: ['Keyword', 'Applies to', 'Guarantee'],
          rows: [
            ['`const`', 'Variables', 'Cannot be modified after initialization (which may happen at run time).'],
            ['`constexpr`', 'Variables', 'Initialized at compile time, and `const`.'],
            ['`constexpr`', 'Functions', '*May* run at compile time when called in a constant context.'],
            ['`consteval`', 'Functions', '*Must* run at compile time; every call is a constant expression.'],
            ['`constinit`', 'Static / global variables', 'Initialized at compile time, but **not** `const`.'],
          ],
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Pick the keyword that gives exactly the guarantee described in each comment.',
      template: `// a constant computed by the compiler; never changes
___ int MaxSquadSize = 8;

// every call must happen at compile time
___ int squadXp(int members) { return members * 250; }

// a global initialized at compile time, but changed during play
___ int g_squadsSpawned = 0;`,
      blanks: [{ answers: ['constexpr'] }, { answers: ['consteval'] }, { answers: ['constinit'] }],
      wordBank: ['constexpr', 'consteval', 'constinit', 'static', 'inline', 'mutable'],
      explanation:
        '`constexpr` on a variable gives a compile-time constant that is also `const`. `consteval` makes a function immediate: any call that cannot be evaluated during compilation is an error. `constinit` guarantees compile-time initialization of a static or global variable while leaving it modifiable. `static`, `inline` and `mutable` are real keywords, but none of them says anything about compile-time evaluation.',
    },
    {
      kind: 'concept',
      title: 'if constexpr: branching on types',
      blocks: [
        {
          type: 'p',
          text: 'Inside a [[template]], you sometimes need slightly different code for different types. A normal `if` doesn\'t help: **both** branches are compiled for every type, so a branch that only makes sense for strings fails to compile when `T` is `int`. [[if-constexpr]] (C++17) evaluates its condition at compile time, and the branch not taken is **discarded** — never instantiated for that type.',
        },
        {
          type: 'code',
          title: 'describe.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <type_traits>

template <typename T>
std::string describe(const T& value) {
    if constexpr (std::is_same_v<T, bool>) {
        return value ? "yes" : "no";
    } else if constexpr (std::is_arithmetic_v<T>) {
        return std::to_string(value);
    } else {
        return "\\"" + std::string{value} + "\\"";
    }
}

int main() {
    std::cout << describe(42) << ' ' << describe(true) << ' '
              << describe(std::string{"Excalibur"}) << '\\n';
}`,
          output: '42 yes "Excalibur"',
          annotations: [
            { lines: 3, text: '`<type_traits>` provides compile-time questions about types, like `std::is_same_v` and `std::is_arithmetic_v`.' },
            { lines: 7, text: 'Decided while compiling each instantiation. For `describe<bool>`, only this branch exists in the generated function.' },
            { lines: 10, text: '`std::to_string` accepts numbers but not strings. For `T = std::string`, this branch is discarded, so it never causes an error.' },
            { lines: 12, text: '`std::string{value}` from an `int` would not compile — with a plain `if`, `describe(42)` would fail right here.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Only inside templates',
          text: 'Discarding only skips code that **depends on a template parameter**. Outside a template, both branches of an `if constexpr` are still checked like any other code, so you cannot use it to hide syntax errors or calls to functions that don\'t exist.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Alternatives you already know',
          text: 'Overloaded functions and [[concept|concepts]] can also select code by type. Prefer them when the versions are large or independent; reach for `if constexpr` when the variations are small and reading them side by side helps. It also pairs well with `std::visit` from the previous unit: one generic lambda that uses `if constexpr` can handle every alternative of a variant.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'Calling `printSize(42)` produces a compile error saying `int` has no member `size`. Tap the line that should change to fix it.',
      code: `template <typename T>
void printSize(const T& value) {
    if (std::is_integral_v<T>) {
        std::cout << "a number\\n";
    } else {
        std::cout << value.size() << " elements\\n";
    }
}

int main() {
    printSize(42);
    printSize(std::string{"loot"});
}`,
      bugLines: [3],
      hint: 'The condition is a compile-time constant — but is the branch discarded?',
      explanation:
        'With a plain `if`, both branches are instantiated for `T = int`, so line 6 tries to call `.size()` on an `int` and fails — even though that branch could never run. The error is *reported* on line 6, but the fix belongs on line 3: write `if constexpr (std::is_integral_v<T>)`, and the `else` branch is discarded for integral types.',
    },
    {
      kind: 'concept',
      title: 'Compile-time lookup tables',
      blocks: [
        {
          type: 'p',
          text: 'Games are full of tables computed from formulas: XP curves, damage falloff, gamma ramps, CRC and hash tables, precomputed sine values. A `constexpr` function can build the whole table during compilation and hand it back as a `std::array`. At run time, using it is a single array read.',
        },
        {
          type: 'code',
          title: 'xp_table.cpp',
          runnable: true,
          code: `#include <array>
#include <cstddef>
#include <iostream>

constexpr std::size_t MaxLevel = 10;

constexpr std::array<int, MaxLevel + 1> makeXpTable() {
    std::array<int, MaxLevel + 1> table{};
    for (std::size_t level = 2; level <= MaxLevel; ++level) {
        table[level] = table[level - 1]
                     + 100 * static_cast<int>(level - 1);
    }
    return table;
}

constexpr auto XpTable = makeXpTable();
static_assert(XpTable[2] == 100);
static_assert(XpTable[MaxLevel] == 4500);

int main() {
    for (std::size_t level = 1; level <= MaxLevel; level += 3) {
        std::cout << "Level " << level << ": " << XpTable[level]
                  << " XP\\n";
    }
}`,
          output: `Level 1: 0 XP
Level 4: 600 XP
Level 7: 2100 XP
Level 10: 4500 XP`,
          annotations: [
            { lines: 7, text: 'A `constexpr` function returning a [[std-array]]. Arrays have a fixed size, so they can be created at compile time and still exist at run time.' },
            { lines: 8, text: '`{}` value-initializes every entry to 0 — constant evaluation forbids reading uninitialized values.' },
            { lines: 16, text: 'The whole table is computed by the compiler and stored in the executable\'s read-only data. No loop ever runs on the player\'s machine.' },
            { lines: '17-18', text: 'Spot checks, verified at compile time. If the formula changes, these fail before the game builds.' },
            { lines: 22, text: 'At run time, a lookup is just an indexed memory read.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Zero run-time cost — but not zero cost',
          text: 'The table costs nothing to compute when the game runs, and lookups are as fast as reading memory. The price moves elsewhere: build time (the compiler\'s interpreter is much slower than compiled code), executable size (every entry is stored), and compiler limits — GCC, Clang and MSVC cap the number of operations in one constant evaluation, adjustable with flags like `-fconstexpr-ops-limit` (GCC) or `/constexpr:steps` (MSVC). Huge tables are often better generated by a script or loaded from a file.',
        },
        {
          type: 'deepdive',
          title: 'Why std::array and not std::vector?',
          blocks: [
            {
              type: 'p',
              text: 'Since C++20 you *can* use `std::vector` and `std::string` inside constant evaluation, but only **transiently**: any memory allocated during compile-time evaluation must be freed before that evaluation ends. A `constexpr std::vector<int> table = makeTable();` would need heap memory that outlives compilation and exists in the running program — which is not allowed. `std::array` stores its elements inline, with no heap allocation, so it crosses from compile time to run time without trouble.',
            },
            {
              type: 'p',
              text: 'So the common pattern is: use whatever you like (vectors, strings, algorithms) inside the `constexpr` function, then copy the final result into a `std::array` to return it.',
            },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Why does the XP table use `constexpr std::array<int, 11>` rather than `constexpr std::vector<int>`?',
      options: [
        { text: 'Because `std::vector` cannot be used inside any `constexpr` function', why: 'Since C++20 it can — temporarily. The problem is only with a vector whose memory would have to survive into the running program.' },
        { text: 'Because memory allocated during constant evaluation must be freed before the evaluation ends, and a vector keeps its elements on the heap', correct: true, why: 'A `constexpr` variable has to exist at run time, but compile-time heap allocations cannot outlive compilation. `std::array` stores its elements inline, so it has no such problem.' },
        { text: 'Because `std::array` is faster to index than `std::vector`', why: 'Indexing costs the same for both: one memory read. The choice here is forced by the language rules, not by speed.' },
        { text: 'Because `std::vector` cannot store `int` values at compile time', why: 'The element type is not the issue; any literal type such as `int` is fine. The issue is where the elements live.' },
      ],
      explanation:
        'C++20 allows *transient* allocation in constant expressions: `new` inside compile-time code is fine, but every allocation must be released before the evaluation finishes. That rules out compile-time-built containers whose storage lives on the heap, such as `std::vector`, `std::string` or `std::map`, as `constexpr` variables. Fixed-size, inline storage — `std::array`, plain structs — crosses into run time freely.',
    },
    {
      kind: 'order',
      prompt: 'Arrange the lines to build a compile-time table of squares and verify it.',
      lines: [
        'constexpr std::array<int, 5> makeSquares() {',
        '    std::array<int, 5> t{};',
        '    for (int i = 0; i < 5; ++i) t[i] = i * i;',
        '    return t;',
        '}',
        'constexpr auto Squares = makeSquares();',
        'static_assert(Squares[4] == 16);',
      ],
      distractors: ['    std::vector<int> t(5);'],
      explanation:
        'The function must be fully defined before it is used in a constant expression, the table is created by initializing a `constexpr` variable, and the `static_assert` can only check it after it exists. The `std::vector` line is a trap: the function returns a `std::array`, and a vector could not be returned into a `constexpr` variable anyway, because its heap memory cannot outlive constant evaluation. Note also `t{}`: every element must be initialized before compile-time code may read it.',
    },
    {
      kind: 'concept',
      title: 'When (not) to use it — and in Unreal',
      blocks: [
        {
          type: 'list',
          items: [
            '**Do** use `constexpr` for true constants (limits, sizes, physical constants) instead of `#define`: it has a type, respects scope and shows up in the debugger.',
            '**Do** use `static_assert` to lock down layout assumptions and to test small `constexpr` functions.',
            '**Do** make small pure functions `constexpr` when they could be useful in constants — it costs nothing when they run at run time.',
            '**Don\'t** build huge computations at compile time just because you can: build times grow, and compile-time code is harder to debug (you can\'t step through it in a debugger).',
            '**Don\'t** make tuning values compile-time constants if designers need to change them without recompiling.',
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Compile time vs. designer time',
          text: 'Unreal code uses `static constexpr` members for genuine constants and `static_assert` extensively inside engine templates. But most gameplay numbers — move speed, damage, cooldowns — are deliberately **not** compile-time constants: they are `UPROPERTY` fields edited in the editor or loaded from Data Assets, so designers can tune them without a programmer rebuilding the game. The rule of thumb: if a value is a fact of the code, make it `constexpr`; if it is a decision about gameplay, expose it as data.',
        },
        {
          type: 'deepdive',
          title: 'Detecting compile-time evaluation from inside a function',
          blocks: [
            {
              type: 'p',
              text: 'Occasionally a `constexpr` function wants a different implementation at compile time than at run time — say, a slow but portable loop for the compiler, and a CPU intrinsic at run time. C++20\'s `std::is_constant_evaluated()` (from `<type_traits>`) returns `true` during constant evaluation; C++23 adds the cleaner `if consteval { ... } else { ... }`. Most code never needs either.',
            },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which of these could be checked with `static_assert`? Select all that apply.',
      options: [
        { text: '`sizeof(SaveHeader) == 16`', correct: true, why: 'The size of a type is known during compilation, so it is a constant expression.' },
        { text: 'The player\'s typed name is not empty', why: 'User input only exists at run time. Check it with ordinary code (or a run-time `assert`).' },
        { text: '`xpForLevel(5) == 1000`, where `xpForLevel` is `constexpr`', correct: true, why: 'A `constexpr` function called with constant arguments is a constant expression — a compile-time unit test.' },
        { text: 'The file `level01.map` exists on disk', why: 'The compiler cannot inspect the file system while evaluating constants, and the file is needed on the player\'s machine, not the build machine.' },
        { text: '`std::is_integral_v<T>` inside a template', correct: true, why: 'Type traits are evaluated at compile time; this is a common way to give a clear error for a template used with the wrong type.' },
      ],
      explanation:
        '`static_assert` accepts only constant expressions: facts about types (sizes, traits) and results of `constexpr` computations with constant inputs. Anything that depends on the running program — input, files, the network, the clock — needs a run-time check instead.',
    },
  ],
  takeaways: [
    'Work done at compile time costs nothing at run time and its errors are caught before the program runs.',
    'A `constexpr` function *may* run at compile time; it is guaranteed to only in contexts that require a constant (a `constexpr` variable, array size, template argument, `case` label, `static_assert`).',
    'Undefined behavior during constant evaluation is a compile error — and `static_assert` turns that into compile-time tests and layout checks.',
    '`consteval` functions must always run at compile time; `constinit` guarantees compile-time initialization of a global or static variable without making it `const`.',
    '`if constexpr` discards the branch not taken inside templates, so each branch only needs to compile for the types that reach it.',
    'Build lookup tables with a `constexpr` function returning `std::array`; heap-based containers can only be used transiently during constant evaluation.',
    'Keep facts of the code `constexpr`; keep gameplay tuning in data that designers can edit.',
  ],
  reading: [
    {
      title: 'constexpr specifier',
      url: 'https://en.cppreference.com/w/cpp/language/constexpr',
      source: 'cppreference',
      note: 'Exactly what constexpr functions may contain in each standard version.',
    },
    {
      title: 'consteval specifier',
      url: 'https://en.cppreference.com/w/cpp/language/consteval',
      source: 'cppreference',
      note: 'Immediate functions and the rules for calling them.',
    },
    {
      title: 'constinit specifier',
      url: 'https://en.cppreference.com/w/cpp/language/constinit',
      source: 'cppreference',
      note: 'How constinit differs from constexpr, with the static initialization order problem it addresses.',
    },
    {
      title: 'Constant expressions',
      url: 'https://en.cppreference.com/w/cpp/language/constant_expression',
      source: 'cppreference',
      note: 'The full list of what is (and isn\'t) allowed during constant evaluation, including the UB rule.',
    },
    {
      title: 'C++ Core Guidelines — Con.5: Use constexpr for values that can be computed at compile time',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rconst-constexpr',
      source: 'core-guidelines',
      note: 'The short rationale for preferring constexpr, with related rules on const.',
    },
  ],
};
