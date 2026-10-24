import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-multi-file',
  title: 'Multi-File Projects and the Linker',
  summary:
    'Split code into headers and sources, build it file by file, decode linker errors, and control what each file can see.',
  minutes: 20,
  objectives: [
    'Split a program into `.h` and `.cpp` files and build it with separate compile and link steps',
    'Decode "undefined reference" / `LNK2019` and "multiple definition" / `LNK2005` errors and fix their causes',
    'Control linkage with `extern`, `static`, anonymous namespaces and `inline` variables',
    'Recognise One Definition Rule violations, including the silent ones the linker cannot catch',
    'Explain static vs dynamic libraries and why Unreal classes are marked `MYGAME_API`',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Why split a program into files?',
      blocks: [
        {
          type: 'p',
          text: 'Real games are not one file. Unreal Engine itself is many thousands of source files, and even a small indie project quickly outgrows a single `main.cpp`. Splitting code keeps related things together — combat in one place, inventory in another — but the deeper reason is the way C++ is *built*.',
        },
        {
          type: 'p',
          text: 'Recall the pipeline from the first unit: every `.cpp` file is preprocessed into a [[translation-unit]] and compiled **on its own** into an [[object-file]]. The [[compiler]] never looks at two `.cpp` files at once. Only at the very end does the [[linker]] gather all the object files and connect the calls in one file to the definitions in another.',
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Preprocess (per file)',
              text: 'The [[preprocessor]] pastes in every `#include` and expands macros. Each `.cpp` becomes one self-contained translation unit.',
            },
            {
              title: 'Compile (per file)',
              text: 'Each translation unit becomes an object file (`.o` on Linux/macOS, `.obj` with MSVC): machine code plus a **symbol table** listing the names this file *defines* and the names it *needs* from elsewhere.',
            },
            {
              title: 'Link (whole program)',
              text: 'The linker matches every needed symbol with **exactly one** definition, patches in the addresses, and writes the [[executable]]. If a symbol has zero definitions, or more than one, you get a [[linker-error]].',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why compile each file separately?',
          text: 'Speed and scale. When you edit `combat.cpp`, only `combat.cpp` is recompiled; every other object file is reused and the link step stitches everything back together. Independent files can also be compiled in parallel on every CPU core. On an engine-sized code base a full rebuild can take an hour while an incremental one takes seconds.\n\nThe price is that the compiler can never check consistency *across* files. That job falls to the linker — and when it fails you get the linker errors that make up half of this lesson.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A book with many authors',
          text: 'Imagine each chapter of a strategy guide written by a different author, alone, leaving notes like "see the boss rules on page ?". At the end an editor fills in every page reference. The editor is the linker: it complains if a referenced section was never written — or was written twice.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The standard split: headers declare, sources define',
      blocks: [
        {
          type: 'p',
          text: 'You met [[header-file|header files]] when you learned about declarations. Here is the pattern at full size: a header holds [[declaration|declarations]] (promises that something exists), one `.cpp` holds the matching [[definition|definitions]] (the actual code), and any file that wants to use the functions includes the header.',
        },
        {
          type: 'code',
          title: 'combat.h',
          code: `#pragma once

// Declarations: promises that these functions exist somewhere.
int applyDamage(int health, int damage);
bool isDefeated(int health);`,
          annotations: [
            { lines: 1, text: '[[pragma-once]] stops the header from being pasted twice into the *same* translation unit. (It does nothing across different files — remember that for later.)' },
            { lines: '4-5', text: 'Only signatures, no bodies. Any file that includes this header can now *call* these functions; the compiler trusts the promise and leaves a note for the linker.' },
          ],
        },
        {
          type: 'code',
          title: 'combat.cpp',
          code: `#include "combat.h"

int applyDamage(int health, int damage) {
    const int result = health - damage;
    return result < 0 ? 0 : result;
}

bool isDefeated(int health) {
    return health == 0;
}`,
          annotations: [
            { lines: 1, text: 'A source file includes **its own** header first. If the declarations and definitions ever disagree in a way the compiler can detect (say, a different return type), you get a compile error here instead of a confusing link error later.' },
            { lines: '3-10', text: 'The one and only definitions. This file compiles to `combat.o`, whose symbol table says "I define `applyDamage(int, int)` and `isDefeated(int)`".' },
          ],
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <iostream>
#include "combat.h"

int main() {
    int bossHp = 120;
    bossHp = applyDamage(bossHp, 75);
    bossHp = applyDamage(bossHp, 75);
    std::cout << "Boss HP: " << bossHp << '\\n';
    std::cout << (isDefeated(bossHp) ? "Victory!" : "Keep going")
              << '\\n';
}`,
          output: 'Boss HP: 0\nVictory!',
          annotations: [
            { lines: 2, text: 'Quotes, because this is our own header (searched next to this file first).' },
            { lines: '6-7', text: '`main.cpp` has never seen the body of `applyDamage`. It compiles a call to "some function named `applyDamage(int, int)`" and records it as an **undefined** symbol in `main.o`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Never #include a .cpp file',
          text: '`#include "combat.cpp"` pastes the *definitions* into `main.cpp`. The moment `combat.cpp` is also compiled on its own (as every build system will do), the program contains two definitions of each function and fails to link. Headers are for including; sources are for compiling.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Building by hand: compile each file, then link',
      blocks: [
        {
          type: 'p',
          text: 'With GCC or Clang the `-c` flag means "compile only — stop before linking". You run it once per source file, then hand all the object files to the linker in one final command:',
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Terminal',
          code: `g++ -std=c++20 -Wall -Wextra -c combat.cpp -o combat.o
g++ -std=c++20 -Wall -Wextra -c main.cpp -o main.o
g++ main.o combat.o -o game
./game`,
          output: 'Boss HP: 0\nVictory!',
          annotations: [
            { lines: '1-2', text: 'Two independent compilations. Neither knows the other exists; they could run at the same time on different cores.' },
            { lines: 3, text: 'No source files here — only object files. `g++` runs the system linker (`ld`) and automatically adds the C++ standard library, which is where `std::cout` is defined.' },
            { lines: 4, text: 'If you now edit only `combat.cpp`, you repeat lines 1 and 3. `main.o` is still valid and is reused as-is.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'The one-liner does the same thing',
          text: '`g++ -std=c++20 main.cpp combat.cpp -o game` still compiles each file separately (into temporary object files) and then links them. You just lose the incremental rebuild. Build systems such as [[cmake]], coming up in this unit, generate exactly the per-file commands above and track which files changed.',
        },
        {
          type: 'deepdive',
          title: 'Look inside the object files with nm',
          blocks: [
            {
              type: 'p',
              text: 'The `nm` tool lists an object file\'s symbols. `U` means *undefined here — needed from elsewhere*; `T` means *defined here, in the code ("text") section*. `-C` translates the symbol names back into readable C++:',
            },
            {
              type: 'code',
              lang: 'text',
              code: `$ nm -C main.o combat.o
main.o:
                 U applyDamage(int, int)
                 U isDefeated(int)
                 U std::cout
0000000000000000 T main

combat.o:
0000000000000000 T applyDamage(int, int)
0000000000000026 T isDefeated(int)`,
              annotations: [
                { lines: '3-5', text: 'The linker\'s to-do list for `main.o`. `std::cout` will be found in the standard library.' },
                { lines: '9-10', text: '`combat.o` supplies the two missing definitions. Linking succeeds because every `U` has exactly one matching `T`.' },
              ],
            },
            {
              type: 'p',
              text: 'Without `-C` you see the real names: `_Z11applyDamageii` and `_Z10isDefeatedi`. This is **[[name-mangling]]**: the compiler encodes the parameter types into the symbol so that overloads such as `applyDamage(int, int)` and `applyDamage(int, float)` become different symbols. MSVC uses its own scheme (`?applyDamage@@YAHHH@Z`), which is one reason object files from different compilers generally cannot be linked together, and why `extern "C"` exists: it switches mangling off so C code, plugins and DLL entry points can find a function by its plain name.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'order',
      prompt: 'You already built `game` from `main.o` and `combat.o`. A teammate edits **only** `combat.cpp`. Put the commands for the minimal correct rebuild and test run in order.',
      lines: [
        'g++ -std=c++20 -Wall -Wextra -c combat.cpp -o combat.o',
        'g++ main.o combat.o -o game',
        './game',
      ],
      distractors: ['g++ -std=c++20 -c combat.h -o combat.o', 'g++ -std=c++20 -c main.cpp -o main.o'],
      explanation:
        'Only the changed source needs recompiling; `main.o` was built from `main.cpp` and `combat.h`, neither of which changed, so recompiling it is wasted work. Then you must **relink**, because the executable still contains the old machine code from the previous `combat.o`. Compiling a header on its own is never part of a normal build — headers only exist to be included. (If `combat.h` itself had changed, every file that includes it would need recompiling, which is why touching a widely-included header triggers long rebuilds.)',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Linker error #1: undefined reference / LNK2019',
      blocks: [
        {
          type: 'p',
          text: 'This is the error you will see most. It means: *some object file needs a symbol, and no object file or library you gave the linker defines it.* The compiler accepted the call because it saw a declaration; the definition never showed up. Here is what happens if you forget `combat.o` on the link line:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'GCC / Clang (ld)',
          code: `/usr/bin/ld: main.o: in function \`main':
main.cpp:(.text+0x1e): undefined reference to
    \`applyDamage(int, int)'
collect2: error: ld returned 1 exit status`,
          annotations: [
            { lines: 1, text: 'Who needs it: the function `main` inside `main.o`.' },
            { lines: '2-3', text: 'What is missing — with the **exact signature**. Compare it character by character with what you think you defined.' },
            { lines: 4, text: '`collect2`/`ld` is the linker, not the compiler. Every file compiled fine; the problem is in what you linked.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'MSVC (link.exe)',
          code: `main.obj : error LNK2019: unresolved external symbol
    "int __cdecl applyDamage(int,int)" (?applyDamage@@YAHHH@Z)
    referenced in function main
game.exe : fatal error LNK1120: 1 unresolved externals`,
          annotations: [
            { lines: '1-3', text: 'Same information, different words: the readable signature in quotes, the mangled name in parentheses, and the function that needed it.' },
            { lines: 4, text: 'A summary count. Always fix the `LNK2019` lines; `LNK1120` disappears with them.' },
          ],
        },
        {
          type: 'table',
          headers: ['Common cause', 'Fix'],
          rows: [
            ['The `.cpp` with the definition is not compiled/linked (not added to the build)', 'Add the file to the link command or to your build system\'s source list'],
            ['Declared but never defined', 'Write the definition (or remove the call)'],
            ['Signature mismatch: declared `f(int)`, defined `f(long)` or in another namespace', 'Make declaration and definition match exactly; mangled names must be identical'],
            ['Member function defined without its class prefix: `void addItem(int)` instead of `void Inventory::addItem(int)`', 'Add the `ClassName::` qualifier'],
            ['A [[template]] defined in a `.cpp` file and used from another file', 'Put template definitions in the header'],
            ['A library is missing from the link (`-lname`, or `.lib` in project settings)', 'Link the library; with GNU `ld`, list it *after* the files that use it'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why can\'t the compiler catch this?',
          text: 'Because the compiler only ever sees one translation unit. When it compiles `main.cpp`, the definition might be in a file not written yet, in a library you will link next week, or in a DLL loaded at run time. A declaration is a promise, and the compiler has no way to verify promises about other files. The linker is the first tool that sees the whole program, so that is where broken promises surface.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'bug',
      prompt: 'Every file compiles, but linking fails with `undefined reference to \'Inventory::addItem(int)\'`. Tap the line that causes it.',
      code: `// Inventory.h
#pragma once
class Inventory {
public:
    void addItem(int itemId);
    int count() const;
private:
    int m_count = 0;
};

// Inventory.cpp
#include <iostream>
#include "Inventory.h"
void addItem(int itemId) {
    std::cout << "Picked up item " << itemId << '\\n';
}
int Inventory::count() const { return m_count; }`,
      bugLines: [14],
      hint: 'Compare how `count` and `addItem` are introduced in Inventory.cpp.',
      explanation:
        'Line 14 is missing the `Inventory::` qualifier, so it defines a brand-new **free function** `addItem(int)` that has nothing to do with the class. It compiles because its body never touches a member. The member `Inventory::addItem(int)` stays declared-but-undefined, and the first call to it fails at link time. The fix is `void Inventory::addItem(int itemId)`. (Had the body used `m_count`, you would have got a clearer *compile* error instead — the compiler would not know what `m_count` is in a free function.)',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'mcq',
      prompt: '`combat.h` declares `int applyDamage(int health, int damage);` but `combat.cpp` (which does **not** include `combat.h`) defines `int applyDamage(int health, float damage) { ... }`. `main.cpp` calls `applyDamage(100, 30)`. What happens?',
      options: [
        {
          text: 'It builds and runs; `30` is converted to `float` automatically',
          why: '`main.cpp` only sees the `(int, int)` declaration, so it calls exactly that. The `(int, float)` version is a different overload living in another file; no conversion can connect them.',
        },
        {
          text: 'A compile error in `main.cpp`',
          why: '`main.cpp` sees a perfectly valid declaration and a matching call. Nothing is wrong *within* that translation unit.',
        },
        {
          text: 'A linker error: undefined reference to `applyDamage(int, int)`',
          correct: true,
          why: 'Mangling encodes parameter types, so the symbol `main.o` needs (`applyDamage(int, int)`) differs from the one `combat.o` provides (`applyDamage(int, float)`). The linker finds no match.',
        },
        {
          text: 'It builds, but crashes at run time',
          why: 'In C, which has no mangling, a mismatch like this really can link and then misbehave. In C++ the types are part of the symbol name, so it fails at link time instead — a nice safety net.',
        },
      ],
      explanation:
        'In C++ a function\'s identity includes its parameter types, and name mangling bakes them into the symbol name. A declaration/definition mismatch therefore shows up as an *undefined reference* to the signature you declared. This is also why including your own header at the top of the `.cpp` matters: here, that include would not have caught the mismatch either (it would simply declare a second overload), but it does catch mismatched return types and keeps the two files visibly in sync.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Linker error #2: multiple definition / LNK2005',
      blocks: [
        {
          type: 'p',
          text: 'The opposite problem: a symbol is defined in **more than one** object file, and the linker refuses to guess which one you meant. The classic way to cause it is putting a *definition* of a non-inline variable or function in a header:',
        },
        {
          type: 'code',
          title: 'config.h',
          code: `#pragma once

int gMaxHealth = 100;   // a definition, not just a declaration`,
          annotations: [
            { lines: 3, text: 'Every `.cpp` that includes this header gets its **own** definition of `gMaxHealth`. Include it from `a.cpp` and `b.cpp` and both object files define the same [[global-variable]].' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'GCC / Clang',
          code: `/usr/bin/ld: b.o:(.data+0x0): multiple definition of
    \`gMaxHealth'; a.o:(.data+0x0): first defined here
collect2: error: ld returned 1 exit status`,
        },
        {
          type: 'code',
          lang: 'text',
          title: 'MSVC',
          code: `b.obj : error LNK2005: "int gMaxHealth" (?gMaxHealth@@3HA)
    already defined in a.obj
game.exe : fatal error LNK1169: one or more multiply defined
    symbols found`,
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why doesn\'t #pragma once (or an include guard) prevent this?',
          text: '[[include-guard|Include guards]] and `#pragma once` work *within one translation unit*: they stop `config.h` being pasted twice into `a.cpp`. But `a.cpp` and `b.cpp` are compiled separately, each starting from a blank slate, so each one legitimately includes `config.h` once — and each ends up with a definition. The duplication only becomes visible when the linker combines them.',
        },
        {
          type: 'compare',
          left: {
            title: 'Definition in the header',
            tone: 'bad',
            code: `// config.h
#pragma once
int gMaxHealth = 100;`,
            text: 'One definition per including file → multiple definition.',
          },
          right: {
            title: 'Declare in header, define once',
            tone: 'good',
            code: `// config.h
#pragma once
extern int gMaxHealth;

// config.cpp
#include "config.h"
int gMaxHealth = 100;`,
            text: 'Every file sees the declaration; exactly one object file holds the variable.',
          },
        },
        {
          type: 'p',
          text: 'There is a second fix — marking the variable `inline` — which we will get to in two cards. First, let\'s understand exactly what `extern` changed.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'truefalse',
      prompt: 'Adding `#pragma once` to `config.h` fixes the "multiple definition of `gMaxHealth`" linker error.',
      answer: false,
      explanation:
        '`#pragma once` only prevents the header from being included twice in the **same** translation unit. Two different `.cpp` files each include it once, each compile a definition of `gMaxHealth`, and the linker sees two. The fix is to keep only a declaration in the header (`extern int gMaxHealth;`) with one definition in a `.cpp`, or to make the variable `inline` (C++17).',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Linkage: extern, static and anonymous namespaces',
      blocks: [
        {
          type: 'definition',
          term: 'Linkage',
          text: 'Whether a name declared in one translation unit can refer to the same entity in another. **External** linkage: visible to the linker program-wide. **Internal** linkage: private to its own translation unit. **No** linkage: local names, visible only in their scope.',
        },
        {
          type: 'table',
          headers: ['At namespace (file) scope', '[[linkage|Linkage]]', 'Shared across files?'],
          rows: [
            ['`int gScore = 0;`', 'External', 'Yes — and it is a definition'],
            ['`extern int gScore;`', 'External', 'Yes — a declaration only; refers to the one defined elsewhere'],
            ['`void spawnWave();`', 'External', 'Yes (functions are external by default)'],
            ['`static int gSpawnCount = 0;`', 'Internal', 'No — each file has its own'],
            ['`namespace { int gSeed = 42; }`', 'Internal', 'No — each file has its own'],
            ['`const int kMaxEnemies = 50;` (also `constexpr`)', 'Internal (by default!)', 'No — each file gets a private copy, so no clash'],
            ['`inline int gMaxHealth = 100;`', 'External', 'Yes — many identical definitions allowed, one object'],
          ],
        },
        {
          type: 'p',
          text: '**Internal linkage** is how you write private helpers. Two files can each have a helper called `scoreTarget` without any clash, because neither name is ever shown to the linker:',
        },
        {
          type: 'code',
          title: 'ai.cpp',
          code: `namespace {
    int aggression = 3;               // private to ai.cpp

    int scoreTarget(int distance) {   // private helper
        return aggression * 100 - distance;
    }
}

int pickTarget(int nearDist, int farDist) {    // external
    return scoreTarget(nearDist) >= scoreTarget(farDist) ? 0 : 1;
}`,
          annotations: [
            { lines: 1, text: 'An **anonymous namespace**. Everything inside gets internal linkage: usable anywhere in this file, invisible to every other file.' },
            { lines: '4-6', text: 'If `loot.cpp` also defines its own `scoreTarget`, there is no conflict — each file\'s version is a separate, private function.' },
            { lines: 9, text: 'The public face of this file. Its declaration goes in `ai.h` for other files to include.' },
          ],
        },
        {
          type: 'code',
          title: 'loot.cpp',
          code: `static int scoreTarget(int rarity) {   // also internal
    return rarity * 10;
}`,
          annotations: [
            { lines: 1, text: '`static` at namespace scope is the older, C-style way to get internal linkage. It works for functions and variables but not for types, which is why C++ code usually prefers anonymous namespaces.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why bother making helpers internal?',
          text: 'Two reasons. **Safety**: without it, two files that each define a helper called `clamp` produce a multiple-definition error — or, if the helpers are `inline`, a silent bug (more on that soon). **Speed**: when the compiler knows nothing outside the file can call a function, it can inline it everywhere and delete the original, or drop it entirely if unused. The C++ Core Guidelines (SF.22) recommend an anonymous namespace for everything a file does not export.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'One keyword, three unrelated jobs',
          text: '`static` inside a function makes a [[static-local]] that lives for the whole program. `static` inside a class makes a [[static-member]] shared by all objects. `static` at namespace scope means *internal linkage*. C++ inherited this overloading from C, which preferred reusing keywords to adding new ones. Read the context before deciding what a `static` means.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'fill',
      prompt: 'Complete the code: the header must only **declare** the shared difficulty scale (it is defined once in `difficulty.cpp`), and the helper in `ai.cpp` must be visible **only inside that file**.',
      template: `// difficulty.h
#pragma once
___ float gDamageScale;

// difficulty.cpp
#include "difficulty.h"
float gDamageScale = 1.5f;

// ai.cpp
#include "difficulty.h"
___ float clampScale(float s) {
    return s > 3.0f ? 3.0f : s;
}`,
      blanks: [{ answers: ['extern'] }, { answers: ['static'] }],
      wordBank: ['extern', 'static', 'inline', 'const', 'virtual', 'public'],
      explanation:
        '`extern` turns line 3 into a pure declaration: "a `float` called `gDamageScale` exists somewhere", so every includer refers to the single definition in `difficulty.cpp`. `static` gives `clampScale` internal linkage, so no other file can see it and another file\'s `clampScale` can never collide with it (an anonymous namespace would do the same). `inline` is a trap in both blanks: `inline float gDamageScale;` in the header would be a *definition* that clashes with the one in `difficulty.cpp`, and an `inline` helper is still externally visible — if another file defined a different `inline clampScale`, you would get a silent ODR violation.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'inline: one definition, many identical copies',
      blocks: [
        {
          type: 'p',
          text: 'The keyword [[inline]] sounds like an optimisation hint, but its real job today is about linkage. An inline function or variable **may be defined in every translation unit that uses it**, as long as all those definitions are identical. The linker keeps one and discards the rest instead of reporting a multiple definition.',
        },
        {
          type: 'code',
          title: 'game_config.h',
          code: `#pragma once
#include <string_view>

inline int gMaxHealth = 100;            // C++17 inline variable
inline constexpr std::string_view kGameName = "Dungeon Forge";

inline int clampHealth(int hp) {
    if (hp < 0) return 0;
    return hp > gMaxHealth ? gMaxHealth : hp;
}

struct Player {
    int hp = 100;
    void heal(int amount) {             // implicitly inline
        hp = clampHealth(hp + amount);
    }
    static constexpr int kMaxLevel = 60; // implicitly inline
};`,
          annotations: [
            { lines: 4, text: 'An [[inline-variable]]. Every file that includes this header shares **one** `gMaxHealth` object at run time — change it in one file and all files see the change. This is the header-only alternative to `extern` + a definition in a `.cpp`.' },
            { lines: 5, text: 'A namespace-scope `constexpr` variable already has internal linkage (one private copy per file). Adding `inline` makes it a single shared object instead — the usual style for constants in modern headers.' },
            { lines: '7-10', text: 'An inline function defined in a header. Without `inline`, the second `.cpp` that includes this header would cause a multiple-definition error.' },
            { lines: '14-16', text: 'Member functions defined *inside* the class body are implicitly inline, which is why short getters can live in headers.' },
            { lines: 17, text: 'Since C++17, `static constexpr` data members are implicitly inline too, so no out-of-class definition is needed.' },
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'From "please inline this" to "this may appear many times"',
          text: 'In early C++, `inline` asked the compiler to paste the function body at each call site. To make that possible, the body had to be visible in every file — so the language allowed duplicate definitions. Optimisers now make their own inlining decisions and largely ignore the hint, but the duplicate-definition permission turned out to be the useful part. C++17 extended it to variables, ending the old ritual of declaring a constant in a header and defining it in exactly one `.cpp`.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: '`inline` does not make code faster',
          text: 'Whether a call is actually inlined is decided by the optimiser at `-O2`, based on size and call frequency, whether or not you wrote `inline`. Compilers offer non-standard "really inline this" attributes (`__forceinline` in MSVC, which Unreal wraps as `FORCEINLINE`), but reach for those only after profiling.',
        },
        {
          type: 'deepdive',
          title: 'How the linker keeps just one copy',
          blocks: [
            {
              type: 'p',
              text: 'The compiler emits each inline function and inline variable as a special kind of symbol — a *weak* symbol or a *COMDAT* section, depending on the platform. When the linker sees several with the same name, it silently keeps one and throws the others away. Notice what it does **not** do: compare them. It assumes they are identical, because the rules say they must be. The next card is about what happens when they are not.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'ODR violations: the bugs the linker won\'t catch',
      blocks: [
        {
          type: 'p',
          text: 'The [[one-definition-rule]] (ODR) has three parts. Within one file, everything has at most one definition. Across the program, every non-inline function and variable has **exactly one** definition — the linker enforces this, giving the errors you have seen. And everything that *may* appear in several files — inline functions and variables, classes, templates — must be **identical** everywhere it appears.',
        },
        {
          type: 'p',
          text: 'Break that third rule and the program is *ill-formed, no diagnostic required*: no error, no warning, just [[undefined-behavior]]. Here two programmers each wrote a little helper with the same name:',
        },
        {
          type: 'code',
          title: 'crit_a.cpp',
          code: `inline int critMultiplier() { return 2; }

int swordCrit(int dmg) { return dmg * critMultiplier(); }`,
        },
        {
          type: 'code',
          title: 'crit_b.cpp',
          code: `#include <iostream>

inline int critMultiplier() { return 3; }
int swordCrit(int dmg);

int main() {
    std::cout << "Sword: " << swordCrit(10) << '\\n';
    std::cout << "Bow: " << 10 * critMultiplier() << '\\n';
}`,
          annotations: [
            { lines: 3, text: 'Same name, same signature, different body: an ODR violation. Each file compiles cleanly, and because both are `inline` the linker keeps one copy without complaint.' },
          ],
        },
        {
          type: 'table',
          caption: 'Real results with GCC 13 — same source code, different builds',
          headers: ['Build', 'Sword', 'Bow'],
          rows: [
            ['`-O0`, `crit_a.cpp` listed first', '20', '20'],
            ['`-O0`, `crit_b.cpp` listed first', '30', '30'],
            ['`-O2`', '20', '30'],
          ],
        },
        {
          type: 'p',
          text: 'Without optimisation, whichever copy the linker kept wins everywhere. With optimisation, each file inlined its own version before the linker ever ran. The output depends on the order of files on the command line and on the optimisation level — a nightmare to debug.',
        },
        {
          type: 'list',
          items: [
            '**Same-named types or helpers in different files** (`struct Node`, `struct Config`, `inline int clamp`). Fix: put file-local things in an anonymous namespace.',
            '**A header compiled with different `#define`s** in different files, so a class gains a member in one file but not another. The two files now disagree about the object\'s layout and silently corrupt memory.',
            '**Mixing libraries built with different settings.** MSVC detects one famous case: linking Debug and Release code fails with `LNK2038: mismatch detected for \'_ITERATOR_DEBUG_LEVEL\'`.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why "no diagnostic required"?',
          text: 'The linker works with symbol names, not source code, so it has no way to know two inline bodies differ. Checking every class and inline function across thousands of translation units would need extra metadata and slow every build. The standard therefore makes consistency your responsibility. GCC can spot some mismatched *types* when link-time optimisation is on (`-flto -Wodr` reports "type \'struct Item\' violates the C++ One Definition Rule"), but it is a safety net with large holes.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: '`player.h` is included by `main.cpp` (compiled with `-DWITH_STATS`) and by `save.cpp` (compiled without it). Both files compile and the program links. What is true?',
      code: `// player.h
#pragma once
struct Player {
    int hp;
#ifdef WITH_STATS
    int kills;
#endif
    int level;
};`,
      options: [
        {
          text: 'The linker reports a multiple definition of `Player`',
          why: 'Class definitions are not linker symbols. Defining the same class in many files is normal and allowed — provided the definitions are identical.',
        },
        {
          text: 'Each file safely uses its own private `Player` type',
          why: 'Both definitions name the same type, `::Player`. Only an anonymous namespace would make them separate types.',
        },
        {
          text: 'The compiler warns when compiling `save.cpp`',
          why: 'Each translation unit is valid on its own. The compiler never sees the other file, so it has nothing to compare against.',
        },
        {
          text: 'It is an ODR violation: the files disagree on where `level` lives, so passing a `Player` between them reads the wrong memory — undefined behavior with no diagnostic',
          correct: true,
          why: 'In `main.cpp` `level` sits after `kills`; in `save.cpp` it sits right after `hp`. Code from each file reads and writes different offsets of the same object.',
        },
      ],
      explanation:
        'Classes may be defined in many translation units only if every definition is identical. Conditional members break that silently: the layout, `sizeof(Player)` and member offsets differ between files, so data saved by one file is misread by the other. Keep build-time switches that change class layouts consistent across the whole project — one reason build systems apply the same definitions to every file of a target.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'bug',
      prompt: 'This header is included by both `camera.cpp` and `audio.cpp`. The build fails with "multiple definition of `mixValue(float, float, float)`". Tap the line to fix.',
      code: `// math_utils.h
#pragma once

float mixValue(float a, float b, float t) {
    return a + (b - a) * t;
}`,
      bugLines: [4],
      explanation:
        'Line 4 begins a non-inline function **definition** in a header, so both `camera.o` and `audio.o` contain a strong definition of `mixValue` and the linker rejects the duplicate. `#pragma once` cannot help, because the two files are separate translation units. Fix it by writing `inline float mixValue(...)` (allowed to be defined in many files), or by keeping only the declaration `float mixValue(float a, float b, float t);` in the header and moving the body into `math_utils.cpp`.',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'concept',
      title: 'Static and dynamic libraries',
      blocks: [
        {
          type: 'p',
          text: 'Once a group of object files is reused across projects — a physics module, a JSON parser — you package it as a library. There are two kinds, and the difference is *when* the linking happens.',
        },
        {
          type: 'table',
          headers: ['Aspect', '[[static-library|Static library]]', '[[dynamic-library|Dynamic library]]'],
          rows: [
            ['Files', '`.a` (Linux/macOS), `.lib` (Windows)', '`.so` (Linux), `.dylib` (macOS), `.dll` (Windows)'],
            ['What it is', 'An archive of object files', 'A separate binary loaded by the OS'],
            ['When linked', 'Build time: needed code is **copied into** your executable', 'Load/run time: your executable records "I need `libcombat.so`"'],
            ['Shipping', 'One self-contained executable', 'Executable plus the library files'],
            ['Updating', 'Rebuild and relink the program', 'Replace the library; programs pick it up (if its interface is unchanged)'],
            ['Sharing', 'Each program has its own copy', 'One copy in memory can serve many programs'],
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Building and using both kinds',
          code: `# Static: archive the object file, then link against it
ar rcs libcombat.a combat.o
g++ main.o -L. -lcombat -o game

# Dynamic: build position-independent shared code
g++ -std=c++20 -shared -fPIC combat.cpp -o libcombat.so
g++ main.o -L. -lcombat -o game`,
          annotations: [
            { lines: 2, text: '`ar` (archiver) bundles object files into `libcombat.a`. No linking happens yet.' },
            { lines: 3, text: '`-L.` adds the current folder to the library search path; `-lcombat` means "find `libcombat`". With GNU `ld`, libraries must come **after** the object files that need them — `g++ -L. -lcombat main.o` fails with undefined references, because the linker scans left to right and only pulls in what it already knows is missing.' },
            { lines: 6, text: '`-shared` produces a dynamic library; `-fPIC` (position-independent code) lets it be loaded at any address.' },
            { lines: 7, text: 'The same link command now records a dependency instead of copying code. If the OS cannot find the library when the game starts, you get "error while loading shared libraries: libcombat.so: cannot open shared object file".' },
          ],
        },
        {
          type: 'p',
          text: 'On Linux, every non-internal symbol of a shared library is visible to its users by default. Windows is stricter: a DLL exports **only** what is explicitly marked `__declspec(dllexport)`, and code that uses it marks those same declarations `__declspec(dllimport)` and links against a small *import library* (`.lib`) that tells the linker which DLL to load. Forget the export, and users of the DLL get `LNK2019` even though the function is right there in the DLL\'s source.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'The cost of dynamic linking',
          text: 'Calls into a dynamic library go through an indirection table, and the optimiser cannot inline across the library boundary. For most code this is negligible, but it is one reason shipped games often link everything statically into one executable.',
        },
      ],
    },
    // ------------------------------------------------------------------ 17
    {
      kind: 'concept',
      title: 'Unreal modules are DLLs: why MYGAME_API exists',
      blocks: [
        {
          type: 'p',
          text: 'An Unreal project is split into [[ue-module|modules]]: `Core`, `Engine`, `UMG`… and your own game module, here called `MyGame`. In **editor** builds each module is compiled into its own DLL (on Windows, files like `UnrealEditor-MyGame.dll`), so the editor can load modules on demand and [[live-coding]] can swap your module\'s code while the editor runs. **Shipping** game builds are usually *monolithic*: every module is statically linked into one executable.',
        },
        {
          type: 'code',
          title: 'Enemy.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "Enemy.generated.h"

UCLASS()
class MYGAME_API AEnemy : public ACharacter {
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Combat")
    void TakeHit(float Amount);
};`,
          annotations: [
            { lines: 5, text: 'Generated by UnrealHeaderTool. It must be the **last** include because it defines macros that `GENERATED_BODY()` expands into, specific to this header; UHT checks the order. You will meet it properly in the Unreal course.' },
            { lines: 8, text: '`MYGAME_API` is a macro defined by UnrealBuildTool. While compiling the `MyGame` module it expands to `__declspec(dllexport)`; when any *other* module includes this header it expands to `__declspec(dllimport)`; in monolithic builds it expands to nothing.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why one macro instead of writing __declspec yourself?',
          text: 'The same header is read by different modules that need opposite keywords — export while building `MyGame`, import everywhere else — and by monolithic builds that need neither. A per-module macro lets one line of source do the right thing in every configuration. You will see the same pattern on engine classes: `ENGINE_API`, `CORE_API`, `UMG_API`.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal linker errors you will meet',
          text: '**`LNK2019` calling another module\'s code** usually means that module is missing from your `.Build.cs` dependency list (`PublicDependencyModuleNames` / `PrivateDependencyModuleNames`), so its import library is never linked. Example: using `UEnhancedInputComponent` without adding `"EnhancedInput"`.\n\n**`LNK2019` from another module calling yours** means your class or function lacks `MYGAME_API`, so it was never exported from your DLL.\n\nSome engine classes export only selected member functions rather than the whole class, so occasionally a function you can see in an engine header still fails to link from your module — because it is not exported.',
        },
        {
          type: 'p',
          text: 'Everything in this lesson transfers directly: separate compilation, declarations vs definitions, linkage and the ODR are exactly how Unreal\'s C++ builds — the engine just automates the commands.',
        },
      ],
    },
    // ------------------------------------------------------------------ 18
    {
      kind: 'mcq',
      prompt: 'Your `MyGame` module builds fine. A second module, `MyGameEditor`, already lists `"MyGame"` in its `.Build.cs` dependencies, but linking it fails with `LNK2019: unresolved external symbol "public: void __cdecl AEnemy::TakeHit(float)"`. What is the most likely cause?',
      options: [
        {
          text: '`MyGameEditor` forgot to `#include "Enemy.h"`',
          why: 'A missing include is a *compile* error ("AEnemy: undeclared identifier"), not a link error. Getting as far as the linker proves the declaration was seen.',
        },
        {
          text: '`AEnemy` is declared without `MYGAME_API`, so `TakeHit` is never exported from the MyGame DLL',
          correct: true,
          why: 'Inside `MyGame` the definition exists, so that module links. But a DLL only exports what is marked `dllexport`; other modules find nothing to import.',
        },
        {
          text: '`TakeHit` is not marked `virtual`',
          why: 'Virtual-ness changes how a call is dispatched, not whether the symbol is exported. Non-virtual functions are called across DLLs all the time.',
        },
        {
          text: '`GENERATED_BODY()` is missing from the class',
          why: 'That would break UnrealHeaderTool code generation and fail at compile time, long before linking, and it would affect `MyGame` itself too.',
        },
      ],
      explanation:
        'The clue is that the defining module links but a *dependent* module cannot. In modular (editor) builds every module is a DLL, and only symbols marked with the module\'s API macro are exported. Since the dependency is already declared in `.Build.cs`, the remaining suspect is the missing `MYGAME_API` on `class AEnemy` (or on the individual function).',
    },
  ],
  takeaways: [
    'Each `.cpp` is compiled alone into an object file; the linker joins them and needs exactly one definition of every used symbol.',
    'Headers hold declarations; one `.cpp` holds each definition. Never include `.cpp` files.',
    '"Undefined reference" / `LNK2019` = a needed definition was never linked (missing file, signature mismatch, missing `Class::`, missing library or export).',
    '"Multiple definition" / `LNK2005` = a non-inline definition in a header; include guards cannot prevent it. Use `extern` + one definition, or `inline`.',
    'Internal linkage (anonymous namespace or namespace-scope `static`) keeps helpers private to one file and avoids collisions.',
    '`inline` today means "may be defined in many files, all identical". Breaking "identical" is a silent ODR violation.',
    'Static libraries are copied in at link time; dynamic libraries are loaded at run time. Windows DLLs export only marked symbols — the reason for `MYGAME_API`.',
  ],
  reading: [
    {
      title: 'Programs with multiple code files',
      url: 'https://www.learncpp.com/cpp-tutorial/programs-with-multiple-code-files/',
      source: 'learncpp',
      note: 'A gentle walkthrough of splitting a program across files, with IDE-specific instructions.',
    },
    {
      title: 'Internal linkage',
      url: 'https://www.learncpp.com/cpp-tutorial/internal-linkage/',
      source: 'learncpp',
      note: 'More examples of `static` and anonymous namespaces, and why const globals have internal linkage.',
    },
    {
      title: 'Definitions and ODR',
      url: 'https://en.cppreference.com/w/cpp/language/definition',
      source: 'cppreference',
      note: 'The precise wording of the One Definition Rule, including what may appear in multiple translation units.',
    },
    {
      title: 'inline specifier',
      url: 'https://en.cppreference.com/w/cpp/language/inline',
      source: 'cppreference',
      note: 'Exactly what `inline` means for functions and (since C++17) variables.',
    },
    {
      title: 'Linker Tools Error LNK2019',
      url: 'https://learn.microsoft.com/en-us/cpp/error-messages/tool-errors/linker-tools-error-lnk2019',
      source: 'other',
      note: 'Microsoft\'s checklist of every common cause of unresolved external symbols.',
    },
    {
      title: 'Unreal Engine Modules',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-modules',
      source: 'unreal-docs',
      note: 'How modules are structured and how the API macros control what each module exports.',
    },
  ],
};
