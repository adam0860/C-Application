import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-declarations-headers',
  title: 'Declarations, Definitions and Header Files',
  summary: 'The language rules behind splitting code across files: promises vs bodies, header files, include guards and the One Definition Rule.',
  minutes: 18,
  objectives: [
    'Distinguish a declaration from a definition and classify examples of each',
    'Use forward declarations (prototypes) to call functions defined later or in another file',
    'Split code into a header and a source file and explain what goes in each',
    'Explain why include guards or `#pragma once` are needed, and write them',
    'State the One Definition Rule and use `inline` to define functions in headers legally',
    'Explain why heavy headers slow down builds, and how to keep them lean',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Declaration vs definition',
      blocks: [
        {
          type: 'p',
          text: 'You have already used one-line prototypes to call a function before its body appears. That works because C++ separates two ideas. A [[declaration|declaration]] introduces a name and its type: *"a function called `respawn` exists, takes no arguments, returns nothing."* A [[definition|definition]] provides the thing itself: the function body, or the actual storage for a variable. Every definition is also a declaration, but not the other way round.',
        },
        {
          type: 'table',
          headers: ['Code', 'Kind', 'Why'],
          rows: [
            ['`void respawn();`', 'Declaration only', 'No body: just the promise.'],
            ['`void respawn() { /*...*/ }`', 'Definition', 'Provides the body.'],
            ['`extern int gHighScore;`', 'Declaration only', '`extern` says "the storage is somewhere else".'],
            ['`int gHighScore = 0;`', 'Definition', 'Creates the variable and its storage.'],
            ['`int score;` (outside any function)', 'Definition', 'Also creates storage, even without an initializer.'],
          ],
        },
        {
          type: 'code',
          code: `int applyDamage(int health, int damage);  // declaration
int applyDamage(int, int);                // same declaration

int applyDamage(int health, int damage) { // definition
    return health > damage ? health - damage : 0;
}`,
          annotations: [
            { lines: 1, text: 'A declaration ends with `;` instead of a body. It gives the compiler everything it needs to check a call: name, parameter types, return type.' },
            { lines: 2, text: 'Parameter names are optional in a declaration, and you may declare the same function as many times as you like. Names are still worth keeping: they document what each argument means.' },
            { lines: '4-6', text: 'The definition. There must be exactly one of these in the whole program (more on that soon).' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why separate the promise from the body?',
          text: 'C++ compiles each source file on its own, as a separate [[translation-unit|translation unit]], with no knowledge of the other files. To check `applyDamage(30, 12)` the compiler only needs the promise: the parameter types and return type. The body can live in a different file entirely; the [[linker|linker]] connects the call to it at the end. This *separate compilation* is what lets a huge project rebuild only the files that changed, and compile many files in parallel.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which of these, written at file scope, is a declaration but **not** a definition?',
      codeOptions: true,
      options: [
        { text: 'int maxHealth = 100;', why: 'This creates the variable and its storage: a definition.' },
        { text: 'bool isAlive(int hp) { return hp > 0; }', why: 'It has a body, so it is a definition (which is also a declaration).' },
        { text: 'void respawn();', correct: true, why: 'No body: it only promises that `respawn` exists somewhere.' },
        { text: 'int score;', why: 'A tricky one. Outside a function this still defines a variable (zero-initialized, since it has static storage). Only `extern int score;` would be a pure declaration.' },
      ],
      explanation:
        'A declaration answers "what is it?", a definition answers "here it is". For functions the test is easy: a body means definition. For variables, any declaration without `extern` (or with an initializer) is a definition, because it reserves storage.',
    },
    {
      kind: 'concept',
      title: 'Forward declarations',
      blocks: [
        {
          type: 'p',
          text: 'A [[forward-declaration|forward declaration]] declares something before its definition is available. For functions this is the [[function-prototype|function prototype]] you have already met. Sometimes it is not just a convenience but a necessity: when two functions call each other, no ordering of the definitions works, because each needs to be declared before the other.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

void playerTurn(int round);
void enemyTurn(int round);

int main() {
    playerTurn(1);
}

void playerTurn(int round) {
    std::cout << "Round " << round << ": player attacks\\n";
    enemyTurn(round);
}

void enemyTurn(int round) {
    std::cout << "Round " << round << ": enemy strikes back\\n";
    if (round < 2) {
        playerTurn(round + 1);
    }
}`,
          output: 'Round 1: player attacks\nRound 1: enemy strikes back\nRound 2: player attacks\nRound 2: enemy strikes back',
          annotations: [
            { lines: '3-4', text: 'Forward declarations for both functions. Now `main`, `playerTurn` and `enemyTurn` can all call either one, in any order.' },
            { lines: 12, text: '`playerTurn` calls `enemyTurn`, which is defined *below*. Without line 4, this would not compile.' },
            { lines: 18, text: '…and `enemyTurn` calls back into `playerTurn`. This is *mutual recursion*; the `round < 2` check stops it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The declaration must match the definition',
          text: 'If a prototype says `double calcDamage(int, double)` but the definition says `double calcDamage(int, float)`, you have declared one overload and defined a *different* one. Each file compiles happily; the build only fails at link time with *undefined reference to calcDamage(int, double)*, because nobody defined the version the call wanted.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Forward-declaring types',
          text: 'You can also forward-declare a type: `struct Weapon;` tells the compiler a type named `Weapon` exists without describing it. That is enough to declare references to it, and it is a major tool for keeping headers light. You will use it heavily once you write classes, and constantly in Unreal (`class UStaticMeshComponent;` at the top of a header).',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'Each line compiles, but the program fails to **link** with *undefined reference to calcDamage(int, double)*. Tap a line responsible.',
      code: `#include <iostream>

double calcDamage(int base, double mult);

int main() {
    std::cout << calcDamage(10, 1.5) << '\\n';
}

double calcDamage(int base, float mult) {
    return base * mult;
}`,
      bugLines: [3, 9],
      hint: 'Compare the parameter types in the declaration and the definition.',
      explanation:
        'Line 3 declares `calcDamage(int, double)`, and `main` calls exactly that. Line 9 defines `calcDamage(int, float)`, which is a different overload with a different mangled name. The linker looks for the `double` version, finds nothing, and fails. Make the two signatures identical. GCC and Clang can flag this earlier with `-Wmissing-declarations`, which warns when a function is defined without a matching previous declaration: exactly what an accidental new overload looks like.',
    },
    {
      kind: 'concept',
      title: 'Splitting code into .h and .cpp files',
      blocks: [
        {
          type: 'p',
          text: 'Once a program grows, you split it into modules. The convention is a pair of files per module: a [[header-file|header file]] (`.h`) holding the **declarations** that other code needs, and a [[source-file|source file]] (`.cpp`) holding the **definitions**. Other files `#include` the header to get the promises; the linker supplies the bodies.',
        },
        {
          type: 'code',
          title: 'combat.h',
          code: `#pragma once

int calcDamage(int base, int armor);
bool isCritical(int roll);`,
          annotations: [
            { lines: 1, text: 'Protects against double inclusion; explained in two steps.' },
            { lines: '3-4', text: 'The module\'s public interface: just the declarations other files are allowed to use.' },
          ],
        },
        {
          type: 'code',
          title: 'combat.cpp',
          code: `#include "combat.h"

int calcDamage(int base, int armor) {
    int damage = base - armor;
    return damage > 1 ? damage : 1;
}

bool isCritical(int roll) {
    return roll >= 19;
}`,
          annotations: [
            { lines: 1, text: 'A source file includes its **own** header first. That proves the header compiles on its own, and lets the compiler catch some mismatches, such as a definition whose return type differs from its declaration.' },
            { lines: '3-10', text: 'The bodies. Only this file needs to be recompiled when they change.' },
          ],
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <iostream>
#include "combat.h"

int main() {
    std::cout << calcDamage(12, 4) << '\\n';
    std::cout << isCritical(20) << '\\n';
}`,
          annotations: [
            { lines: 2, text: 'Quotes for your own headers. After preprocessing, `main.cpp` contains the two declarations, which is all it needs to compile the calls.' },
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          code: `g++ -std=c++20 -Wall -Wextra main.cpp combat.cpp -o game
./game`,
          output: '8\n1',
          annotations: [
            { lines: 1, text: 'Each `.cpp` is compiled separately into an object file, then the linker joins them. Headers are never compiled on their own; they are only pasted into `.cpp` files.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the split pays off',
          text: 'The header is a **contract**: it says what the module offers and nothing about how. Callers depend only on the contract, so you can rewrite the bodies in `combat.cpp` freely, and only that one file is recompiled. In a game with thousands of source files, that difference is minutes versus seconds per change.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Using the files above, you change only the *body* of `calcDamage` in `combat.cpp`. What has to be rebuilt?',
      options: [
        { text: 'Only `combat.cpp` is recompiled, then the program is relinked', correct: true, why: 'Nothing that `main.cpp` sees has changed: it only knows the declaration in `combat.h`. The new object file for `combat.cpp` is linked with the existing one for `main.cpp`.' },
        { text: 'Every `.cpp` file in the project, because one function changed', why: 'Separate compilation exists precisely to avoid this. Only files whose own text (including what they include) changed need recompiling.' },
        { text: 'Only `main.cpp`, because it calls the function', why: '`main.cpp` was compiled against the declaration, which did not change. The call is connected to the new body by the linker.' },
        { text: '`combat.cpp` and every file that includes `combat.h`', why: 'That is what happens when you change the **header**. A body change inside a `.cpp` affects only that file.' },
      ],
      explanation:
        'This is the payoff of keeping declarations in headers and definitions in source files. Change a `.cpp` and you recompile one file. Change a header and every file that includes it (directly or indirectly) must recompile, which is why stable, minimal headers matter so much in large projects.',
    },
    {
      kind: 'concept',
      title: 'Include guards and #pragma once',
      blocks: [
        {
          type: 'p',
          text: 'Remember that `#include` is a blind copy-paste by the [[preprocessor|preprocessor]]. Headers include other headers, so in a real project the same header easily gets pasted into one `.cpp` file twice:',
        },
        {
          type: 'code',
          code: `// stats.h
constexpr int kMaxLevel = 60;

// player.h            // enemy.h
#include "stats.h"      #include "stats.h"

// main.cpp
#include "player.h"
#include "enemy.h"     // stats.h pasted a second time!`,
          lang: 'text',
          annotations: [
            { lines: 2, text: 'A header can contain *definitions* too: constants, types, inline functions.' },
            { lines: '8-9', text: 'After preprocessing, `main.cpp` contains `constexpr int kMaxLevel = 60;` twice: *error: redefinition of kMaxLevel*.' },
          ],
        },
        {
          type: 'p',
          text: 'The compiler has no memory of "I already pasted this", so you have to build one. The classic tool is an [[include-guard|include guard]], built from preprocessor conditionals. The modern shortcut is [[pragma-once]].',
        },
        {
          type: 'compare',
          left: {
            title: 'Include guard (standard)',
            tone: 'neutral',
            code: `#ifndef MYGAME_STATS_H
#define MYGAME_STATS_H

constexpr int kMaxLevel = 60;

#endif`,
            text: 'First inclusion: the macro is undefined, so it gets defined and the contents are kept. Any later inclusion in the same file skips everything up to `#endif`.',
          },
          right: {
            title: '#pragma once (universal extension)',
            tone: 'good',
            code: `#pragma once

constexpr int kMaxLevel = 60;`,
            text: 'Asks the compiler itself to include this file at most once per translation unit. Shorter, no macro name to invent or collide.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Two tools for one job',
          text: 'Include guards use only standard preprocessor features, so they work everywhere, but the macro name must be unique: if two headers both use `STATS_H`, one silently disappears. `#pragma once` is not in the ISO standard, yet GCC, Clang and MSVC all support it, and it avoids the naming problem. Its rare weak spot is a build that reaches the same file through different paths (copies, odd symlinks or network drives), where the compiler may not realise it is the same file.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Every Unreal header starts with `#pragma once`; the class wizard writes it for you. Epic\'s coding standard specifies it, and you will see it at the top of every engine header you open.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Arrange these lines into a header protected by a classic include guard.',
      lines: ['#ifndef MYGAME_LOOT_H', '#define MYGAME_LOOT_H', 'int rollLoot(int luck);', '#endif'],
      distractors: ['#undef MYGAME_LOOT_H', '#ifdef MYGAME_LOOT_H'],
      explanation:
        '`#ifndef` ("if not defined") lets the contents through only the first time. `#define` then marks the header as seen, the declarations follow, and `#endif` closes the conditional. `#ifdef` has the opposite meaning (it would skip the header on first inclusion), and `#undef` would erase the marker and defeat the guard.',
    },
    {
      kind: 'concept',
      title: 'The One Definition Rule',
      blocks: [
        {
          type: 'p',
          text: 'Declarations can repeat freely. Definitions cannot, and the precise rule is the [[one-definition-rule|One Definition Rule]] (ODR). Simplified, it says three things:',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Within one translation unit**, nothing may be defined more than once. (Include guards solve this.)',
            '**Across the whole program**, every ordinary (non-inline) function and variable that is used must be defined in **exactly one** translation unit.',
            '**Some things may be defined in several translation units** (types, `inline` functions and variables, templates), but every definition must be identical, token for token.',
          ],
        },
        {
          type: 'p',
          text: 'Rule 2 is the one that bites. Put an ordinary function definition in a header, include that header from two `.cpp` files, and each object file contains its own copy:',
        },
        {
          type: 'code',
          code: `// math_utils.h
#pragma once
int square(int x) { return x * x; }   // definition in a header

// a.cpp:  #include "math_utils.h"
// b.cpp:  #include "math_utils.h"
// link:   multiple definition of 'square(int)'`,
          annotations: [
            { lines: 2, text: '`#pragma once` works *per translation unit*. `a.cpp` and `b.cpp` each include the header once, legitimately, so each gets a definition.' },
            { lines: 7, text: 'The linker now has two bodies for the same symbol and refuses to pick one.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why exactly one?',
          text: 'Every call to `square` in the program must jump to one specific address, and every use of a global variable must refer to one specific piece of memory. With two definitions the linker cannot know which is "the" `square`, and for a variable, two copies would mean two different scores that disagree. So ordinary entities get exactly one home.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Breaking rule 3 is silent',
          text: 'If two `.cpp` files each define a type with the same name but different contents (say, two different `struct Item`s), the standard says the program is ill-formed with **no diagnostic required**. The linker usually cannot see it, and you get [[undefined-behavior|undefined behavior]]: one file reads an `Item` laid out the way the other file wrote it. Defining each type once, in one header, prevents this.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Include guards prevent *multiple definition* linker errors when a header containing an ordinary function definition is included by two different `.cpp` files.',
      answer: false,
      explanation:
        'Include guards and `#pragma once` only stop a header from being pasted twice into the **same** translation unit. Two different `.cpp` files each get one legitimate copy, so each object file contains a definition, and the linker sees two. The fixes are to move the definition into a `.cpp` file or to mark it `inline`.',
    },
    {
      kind: 'concept',
      title: 'inline: defining functions in headers legally',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes you *want* a function body in a header: tiny helpers that every caller should be able to see, and that the compiler can optimize at each call. The [[inline]] keyword makes this legal. An inline function may be defined in every translation unit that uses it, provided all definitions are identical; the linker keeps one copy and discards the rest.',
        },
        {
          type: 'code',
          title: 'health_utils.h',
          code: `#pragma once

inline int clampHealth(int hp, int maxHp) {
    if (hp < 0) {
        return 0;
    }
    return hp > maxHp ? maxHp : hp;
}

constexpr int kStartingHealth = 100;`,
          annotations: [
            { lines: 3, text: '`inline` tells the linker: this definition may appear in many object files; they are all the same, keep one. Any number of `.cpp` files can now include this header.' },
            { lines: 10, text: 'A `constexpr` variable at namespace scope is safe in a header too: each translation unit gets its own private copy of the constant. (`constexpr` functions are implicitly `inline`.)' },
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'inline no longer means "inline it"',
          text: 'Originally `inline` was a *hint* asking the compiler to paste the body into each call site instead of making a call. Modern optimizers decide that for themselves, inlining non-inline functions and ignoring the hint when it would not pay off. Today the keyword\'s real, guaranteed meaning is the ODR exemption: "multiple identical definitions allowed". C++17 extended it to variables: `inline int gFrameCount = 0;` can live in a header.',
        },
        {
          type: 'p',
          text: 'The trade-off: an inline function\'s body is part of the header, so changing it recompiles every file that includes the header, and every one of those files must parse it. Keep inline functions small and stable, and put anything substantial in a `.cpp` file.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'FORCEINLINE',
          text: 'Unreal code often uses the `FORCEINLINE` macro on tiny, hot functions (vector math, getters). It expands to a compiler-specific "really inline this" request, such as MSVC\'s `__forceinline`, overriding the optimizer\'s own judgement. Use it sparingly: inlining big functions bloats code and can make performance worse.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: '`math_utils.h` contains `int square(int x) { return x * x; }` with `#pragma once`, and is included by three different `.cpp` files. What happens when you build?',
      options: [
        { text: 'It builds fine, because `#pragma once` prevents duplicate definitions', why: '`#pragma once` works within one translation unit only. Three `.cpp` files means three translation units, each with its own definition.' },
        { text: 'The compiler reports *redefinition of square* in each file', why: 'Each file sees the definition exactly once, so each compiles cleanly. The problem only appears when the object files meet.' },
        { text: 'The linker reports *multiple definition of square(int)*', correct: true, why: 'Each object file carries its own definition of an ordinary function, which violates the One Definition Rule. Marking it `inline`, or moving the body to a `.cpp`, fixes it.' },
        { text: 'It builds, but `square` runs three times per call', why: 'Duplicate definitions never cause extra calls. The real outcome is a link failure.' },
      ],
      explanation:
        'This is the classic ODR violation. Compiling succeeds because each translation unit is legal on its own; the error appears at link time, when three definitions of `square(int)` meet. Adding `inline` tells the linker that duplicates are expected and identical, so it keeps one.',
    },
    {
      kind: 'concept',
      title: 'What belongs in a header, and what it costs',
      blocks: [
        {
          type: 'table',
          headers: ['Belongs in a header', 'Keep out of headers'],
          rows: [
            ['Function declarations', 'Ordinary (non-inline) function definitions'],
            ['Type definitions (structs, classes, enums)', 'Ordinary global variable definitions: put `extern int gScore;` in the header and `int gScore = 0;` in one `.cpp`'],
            ['`inline` and `constexpr` functions', '`using namespace std;` (it leaks into every includer)'],
            ['`constexpr` constants', '`#include`s the header itself does not need'],
            ['Templates (covered in a later unit)', 'Implementation details callers should not depend on'],
          ],
        },
        {
          type: 'p',
          text: 'Headers also have a **compile-time cost**. Every `#include` pastes the entire header, and everything *it* includes, into each `.cpp` that includes it. A header included by 500 source files is parsed 500 times. If it pulls in `<iostream>` and friends, each of those 500 files may grow by tens of thousands of lines before the compiler even reaches your code.',
        },
        {
          type: 'list',
          items: [
            '**Include what you use**, and only that. Each file includes the headers it directly needs, no more.',
            '**Prefer forward declarations** in headers when a full type definition is not required.',
            '**Move bodies to `.cpp` files** unless they are tiny and benefit from inlining.',
            'Larger projects use **precompiled headers** (common headers parsed once and cached) and, increasingly, C++20 **modules**, which replace textual inclusion entirely.',
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'See your include tree',
          text: 'Compile with `g++ -H -c file.cpp` and GCC prints every header it opens, indented by depth. It is an eye-opening way to discover that one innocent include drags in hundreds of files. MSVC offers the same with `/showIncludes`.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Include What You Use in Unreal',
          text: 'Since UE 4.15 the engine follows an *Include What You Use* (IWYU) model: each file includes exactly what it needs instead of one giant engine header, and shared precompiled headers speed up the rest. Generated headers add one more rule you will meet in the Unreal course: a class header\'s `#include "MyActor.generated.h"` must be its last include.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Select **all** lines that are safe to put in a header included by many `.cpp` files.',
      multi: true,
      codeOptions: true,
      options: [
        { text: 'int calcDamage(int base, int armor);', correct: true, why: 'A declaration can be repeated in every translation unit. This is the header\'s main job.' },
        { text: 'constexpr int kMaxLevel = 60;', correct: true, why: 'A namespace-scope `constexpr` variable gives each translation unit its own copy of the constant, so there is no ODR clash.' },
        { text: 'inline bool isCrit(int roll) { return roll >= 19; }', correct: true, why: '`inline` explicitly permits identical definitions in many translation units.' },
        { text: 'int gScore = 0;', why: 'A definition of an ordinary global variable. Every includer would define its own `gScore`, causing a *multiple definition* link error. Use `extern int gScore;` in the header instead.' },
        { text: 'using namespace std;', why: 'It compiles, but forces every file that includes the header to have all of `std` dumped into its global scope, inviting name collisions it did not ask for.' },
      ],
      explanation:
        'Headers hold things that can safely appear in many translation units: declarations, constants, types and inline functions. Ordinary definitions of functions and variables must live in exactly one `.cpp` file, and namespace-wide `using` directives should never be imposed on code that merely includes your header.',
    },
    {
      kind: 'fill',
      prompt: 'Share one high score variable between files. Complete the header so it only *declares* the variable; the `.cpp` provides the single definition.',
      template: `// score.h
#pragma once
___ int gHighScore;

// score.cpp
#include "score.h"
int gHighScore = 0;`,
      blanks: [{ answers: ['extern'] }],
      wordBank: ['extern', 'static', 'inline', 'const', 'auto'],
      explanation:
        '`extern` turns the line into a pure declaration: "this variable exists, its storage is defined elsewhere". Every includer can now use `gHighScore`, and `score.cpp` holds the one definition the ODR requires. `static` would give each file its own private variable; `inline` would make the header line a definition that clashes with the one in `score.cpp`; `const` would make it unmodifiable.',
    },
  ],
  takeaways: [
    'A declaration promises a name and type; a definition provides the body or storage. Every definition is a declaration.',
    'Forward declarations let you call functions defined later or elsewhere, and are required for mutual recursion. They must match the definition exactly.',
    'Headers hold declarations (the contract); `.cpp` files hold definitions. A `.cpp` should include its own header first.',
    'Include guards or `#pragma once` stop a header being pasted twice into one translation unit. They do nothing across translation units.',
    'The One Definition Rule: ordinary functions and variables need exactly one definition program-wide; types and `inline` entities may repeat if identical.',
    '`inline` today means "identical definitions allowed in many translation units", which is what makes function bodies in headers legal.',
    'Every include costs compile time in every includer: include what you use and keep headers lean.',
  ],
  reading: [
    {
      title: 'Definitions and ODR',
      url: 'https://en.cppreference.com/w/cpp/language/definition',
      source: 'cppreference',
      note: 'The exact list of what counts as a definition and the full One Definition Rule.',
    },
    {
      title: 'inline specifier',
      url: 'https://en.cppreference.com/w/cpp/language/inline',
      source: 'cppreference',
      note: 'The modern meaning of `inline` for functions and C++17 inline variables.',
    },
    {
      title: 'Header files',
      url: 'https://www.learncpp.com/cpp-tutorial/header-files/',
      source: 'learncpp',
      note: 'A step-by-step guide to splitting a program into headers and source files.',
    },
    {
      title: 'Header guards',
      url: 'https://www.learncpp.com/cpp-tutorial/header-guards/',
      source: 'learncpp',
      note: 'More examples of the double-inclusion problem and how guards and `#pragma once` solve it.',
    },
  ],
};
