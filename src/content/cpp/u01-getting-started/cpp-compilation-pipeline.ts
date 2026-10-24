import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-compilation-pipeline',
  title: 'From Source Code to Executable',
  summary: 'Follow your code through the preprocessor, compiler, assembler and linker — and learn which stage each error comes from.',
  minutes: 17,
  objectives: [
    'Name the four stages of the build pipeline and what each consumes and produces',
    'Define a translation unit and explain why each one is compiled in isolation',
    'Explain what an object file contains and how the linker resolves symbols between them',
    'Tell compile errors, link errors and run-time errors apart from their messages',
    'Explain why incremental builds are fast and why editing a header triggers big rebuilds',
    'Describe the difference between debug and release builds and what optimization does',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Source code is just text',
      blocks: [
        {
          type: 'p',
          text: 'A `.cpp` file is plain text — your CPU cannot do anything with it. To get a program you can run, the text passes through a **pipeline** of tools, each transforming the output of the previous one. When you type a single command such as `g++ main.cpp -o game`, the compiler driver quietly runs all of these stages for you.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Preprocess', text: 'The [[preprocessor]] handles lines starting with `#`: it pastes in `#include`d files, expands macros and removes comments. The result is one big file of pure C++ called a [[translation-unit]].' },
            { title: 'Compile', text: 'The [[compiler]] proper parses the translation unit, checks it against the rules of the language (syntax, types, names), optimizes it and translates it into [[assembly-language|assembly]] for the target CPU.' },
            { title: 'Assemble', text: 'The assembler converts the assembly into binary [[machine-code]] and packages it as an [[object-file]] (`.o` on Linux/macOS, `.obj` on Windows).' },
            { title: 'Link', text: 'The [[linker]] combines all the object files of the program, plus libraries such as the standard library, into a single [[executable]], connecting every use of a function to its actual code.' },
          ],
        },
        {
          type: 'table',
          headers: ['Stage', 'Input', 'Output', 'Stop here with (GCC/Clang)'],
          rows: [
            ['Preprocess', '`main.cpp` + headers', 'Translation unit (`main.ii`)', '`-E`'],
            ['Compile', 'Translation unit', 'Assembly (`main.s`)', '`-S`'],
            ['Assemble', 'Assembly', 'Object file (`main.o`)', '`-c`'],
            ['Link', 'All `.o` files + libraries', 'Executable (`game`, `game.exe`)', '(default: run every stage)'],
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A car factory',
          text: 'Preprocessing gathers every part and instruction sheet a station needs. Compiling and assembling happen at separate stations, each building one sub-assembly (an engine, a door) without seeing the others. Linking is final assembly: bolting the sub-assemblies together — and discovering, too late, if a part was never built.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Stage 1: the preprocessor',
      blocks: [
        {
          type: 'p',
          text: 'The preprocessor is a text-processing tool that runs before the real compiler. It does not understand C++ at all — it only obeys **directives**, lines beginning with `#`. The three you will see most:',
        },
        {
          type: 'list',
          items: [
            '`#include` — paste the entire contents of another file here.',
            '`#define` — define a [[macro]]: from now on, replace one piece of text with another.',
            '`#if` / `#ifdef` / `#endif` — keep or delete a region of code depending on a condition, for example the target platform.',
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'What you write: player.cpp',
            tone: 'neutral',
            code: `#include "config.h"
// Starting health for new players
int startingHealth() {
    return MAX_HEALTH;
}`,
          },
          right: {
            title: 'What the compiler receives',
            tone: 'neutral',
            code: `int startingHealth() {
    return 100;
}`,
            text: '`config.h` contained `#define MAX_HEALTH 100`. Its text was pasted in, the macro was replaced, and the comment was stripped.',
          },
        },
        {
          type: 'definition',
          term: 'Translation unit',
          text: 'One source file *after* preprocessing: the `.cpp` file with every `#include` recursively pasted in and every macro expanded. It is the unit of work for the compiler — each translation unit is compiled on its own, knowing nothing about any other.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a separate text-pasting stage?',
          text: 'C++ inherited the preprocessor from C, designed in the early 1970s for machines with tiny memories. Pasting declarations from a shared [[header-file]] was the simplest way to let many files agree on what functions and types exist. Conditional compilation also lets one code base build for Windows, consoles and phones — Unreal uses macros heavily for exactly this.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Translation units get big',
          text: 'A ten-line file that includes `<iostream>` becomes a translation unit of tens of thousands of lines, and the compiler must process all of them — for *every* `.cpp` file that includes it. This is the main reason C++ builds are slow, and why tricks like precompiled headers and C++20 modules exist.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which best describes a translation unit?',
      options: [
        {
          text: 'A header file and all the `.cpp` files that include it',
          why: 'It is organized around a single `.cpp` file, not around a header. One header is usually pasted into many different translation units.',
        },
        {
          text: 'The finished executable, after all files have been linked together',
          why: 'That is the output of the linker. Translation units exist much earlier, as the input to the compiler.',
        },
        {
          text: 'A single source file after the preprocessor has pasted in its includes and expanded its macros',
          correct: true,
          why: 'Right. It is exactly what the compiler sees: one `.cpp` file plus everything the preprocessor inserted into it.',
        },
        {
          text: 'One line of C++ code, translated into one machine instruction',
          why: 'There is no one-to-one mapping between lines and instructions; a translation unit is a whole preprocessed file.',
        },
      ],
      explanation:
        'Each `.cpp` file becomes one translation unit, and the compiler handles them completely independently. That independence is a double-edged sword: it allows parallel and incremental builds, but it also means a translation unit can only use things it has seen declared — which is precisely why headers exist.',
    },
    {
      kind: 'concept',
      title: 'Stages 2 and 3: compiling and assembling',
      blocks: [
        {
          type: 'p',
          text: 'The compiler is where the real work happens. It parses the translation unit, checks that every name is declared and every type fits, reports [[compile-error|compile errors]] and [[compiler-warning|warnings]], optimizes, and finally generates assembly. Take this small function:',
        },
        {
          type: 'code',
          title: 'combat.cpp',
          code: `int applyDamage(int health, int damage) {
    return health - damage;
}`,
          annotations: [
            { lines: 1, text: 'A function that takes two whole numbers and returns one. You will learn to write functions in Unit 6; for now, just see what the compiler makes of it.' },
          ],
        },
        {
          type: 'p',
          text: 'With optimization on, GCC for x86-64 turns it into three CPU instructions (as shown by Compiler Explorer):',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'combat.s (x86-64, -O2)',
          code: `applyDamage(int, int):
        mov     eax, edi
        sub     eax, esi
        ret`,
          annotations: [
            { lines: 1, text: 'A label marking where the function\'s code begins.' },
            { lines: 2, text: 'The first argument (`health`) arrives in register `edi`. Copy it into `eax`, the register that holds the return value.' },
            { lines: 3, text: 'Subtract the second argument (`damage`, in `esi`) from it.' },
            { lines: 4, text: 'Return to the caller. The result is already in `eax`.' },
          ],
        },
        {
          type: 'p',
          text: 'The assembler then encodes those instructions as bytes and writes an **object file**. Besides machine code, an object file contains a **symbol table**: a list of the names it *defines* (here, `applyDamage`) and the names it *uses but does not define* (things that live in other files, like `std::cout`). Those unresolved names are left as blanks for the linker to fill in.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why compile each file separately?',
          text: 'Compiling files independently means they can be compiled **in parallel** on all your CPU cores, and that an unchanged file never has to be compiled again. For a project the size of Unreal Engine, with tens of thousands of source files, that is the difference between minutes and many hours.',
        },
        {
          type: 'deepdive',
          title: 'Peek inside an object file',
          blocks: [
            {
              type: 'p',
              text: 'On Linux and macOS, `nm` lists an object file\'s symbols (`-C` makes the names human-readable). `T` means "defined here, in the code section"; `U` means "undefined here — needed from elsewhere".',
            },
            {
              type: 'code',
              lang: 'shell',
              code: `$ nm -C combat.o
0000000000000000 T applyDamage(int, int)
$ nm -C main.o
                 U applyDamage(int, int)
                 U std::cout
0000000000000000 T main`,
              annotations: [
                { lines: 2, text: '`combat.o` defines `applyDamage` — its machine code is inside this file.' },
                { lines: '4-5', text: '`main.o` calls `applyDamage` and uses `std::cout`, but contains neither. The linker must find them.' },
              ],
            },
            {
              type: 'p',
              text: 'Without `-C` you would see `_Z11applyDamageii`: the compiler encodes the parameter types into the symbol name (**name mangling**) so that functions with the same name but different parameters can coexist.',
            },
          ],
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Stage 4: the linker',
      blocks: [
        {
          type: 'p',
          text: 'Real programs are split across many files. Here is a tiny two-file game: `combat.cpp` defines the damage function, and `main.cpp` uses it. The header `combat.h` holds just the function\'s **declaration** — a promise that it exists somewhere.',
        },
        {
          type: 'code',
          title: 'combat.h',
          code: `int applyDamage(int health, int damage);`,
          annotations: [
            { lines: 1, text: 'A [[declaration]]: name, parameter types and return type, ending in `;` with no body. Enough for the compiler to check calls; the code itself is elsewhere.' },
          ],
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <iostream>
#include "combat.h"

int main() {
    int health = applyDamage(100, 30);
    std::cout << "Health: " << health << '\\n';
}`,
          annotations: [
            { lines: 2, text: 'Paste in the promise from `combat.h`, so the compiler knows `applyDamage` exists and how to call it.' },
            { lines: 5, text: 'The compiler checks this call against the declaration, then leaves a blank in `main.o` for the linker to fill with `applyDamage`\'s real address.' },
            { lines: 6, text: 'Prints the result. The next lesson dissects `std::cout` piece by piece.' },
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Building it step by step',
          code: `g++ -std=c++20 -c combat.cpp -o combat.o
g++ -std=c++20 -c main.cpp -o main.o
g++ combat.o main.o -o game
./game`,
          output: 'Health: 70',
          annotations: [
            { lines: '1-2', text: '`-c` means "compile and assemble, but don\'t link". Each command produces one object file, independently of the other.' },
            { lines: 3, text: 'No `.cpp` files here — this is pure linking. The linker matches `main.o`\'s need for `applyDamage` with `combat.o`\'s definition, and `std::cout` with the standard library.' },
          ],
        },
        {
          type: 'p',
          text: 'The linker also adds start-up code from the C++ runtime, which prepares the process and then calls your `main`. When every needed symbol has exactly one definition, it writes the finished executable. If a symbol has **no** definition, or **more than one**, you get a [[linker-error]] instead.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Headers in depth come later',
          text: 'This is just a first look at the header/source split. Unit 6 covers declarations, definitions and header files properly, and Unit 16 covers multi-file projects, libraries and linker errors in depth.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Linking in Unreal',
          text: 'An Unreal project is divided into **modules**. In editor builds each module is linked into its own dynamic library (a `.dll` on Windows), and the linker connects modules through exported symbols — that is what the `MYGAME_API` macro you will meet later is for. The UnrealBuildTool runs the compiler and linker for you, but the stages are exactly the ones in this lesson.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Put the stages of building a C++ program in order.',
      lines: [
        'Preprocessor pastes in #include files and expands macros',
        'Compiler checks the translation unit and generates assembly',
        'Assembler encodes the instructions into an object file',
        'Linker combines object files and libraries into an executable',
      ],
      distractors: ['Interpreter runs the source code line by line'],
      linesAreCode: false,
      explanation:
        'Each stage consumes the previous stage\'s output: text → translation unit → assembly → object file → executable. The interpreter line is a trap: C++ is compiled ahead of time, so nothing reads your source code while the program runs.',
    },
    {
      kind: 'fill',
      prompt: 'Each command should stop the build after a particular stage. Fill in the GCC flags.',
      template: `g++ ___ main.cpp -o main.ii   # preprocess only
g++ ___ main.cpp -o main.s    # stop after compiling
g++ ___ main.cpp -o main.o    # stop after assembling
g++ main.o combat.o -o game   # link`,
      blanks: [{ answers: ['-E'] }, { answers: ['-S'] }, { answers: ['-c'] }],
      wordBank: ['-E', '-S', '-c', '-O2', '-g', '-Wall'],
      explanation:
        '`-E` stops after preprocessing (handy for seeing what an `#include` really pulled in), `-S` emits assembly, and `-c` produces an object file without linking — the flag every build system uses so files can be compiled separately. `-O2` (optimize), `-g` (debug info) and `-Wall` (warnings) change *how* a stage works, not where the build stops.',
    },
    {
      kind: 'concept',
      title: 'Three kinds of errors',
      blocks: [
        {
          type: 'p',
          text: 'Knowing which stage produced an error tells you immediately what kind of mistake to look for. There are three families, and they get progressively more expensive to find and fix.',
        },
        {
          type: 'table',
          headers: ['Kind', 'Reported by', 'Typical causes'],
          rows: [
            ['[[compile-error|Compile error]]', 'Compiler, with file and line', 'Typos, missing `;`, missing `#include`, wrong types'],
            ['[[linker-error|Link error]]', 'Linker, usually without a line number', 'Something declared but never defined, defined twice, or a missing library'],
            ['[[runtime-error|Run-time error]]', 'Nobody — you find it by running and testing', 'Logic mistakes, invalid memory access, [[undefined-behavior]]'],
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'A compile error (GCC)',
          code: `main.cpp:5:18: error: 'healht' was not declared in this scope;
did you mean 'health'?`,
          annotations: [
            { lines: 1, text: 'File `main.cpp`, line 5, column 18. The compiler knows exactly where it got confused — start reading there (or at the end of the line above).' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'A link error (GCC on Linux)',
          code: `/usr/bin/ld: main.o: in function \`main':
main.cpp:(.text+0x13): undefined reference to
\`applyDamage(int, int)'
collect2: error: ld returned 1 exit status`,
          annotations: [
            { lines: 1, text: '`ld` is the linker. The message comes from it, not from the compiler — every file compiled successfully.' },
            { lines: '2-3', text: '"undefined reference" means: `main` uses `applyDamage(int, int)`, but no object file defines a function with that exact name and parameters.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why push errors as early as possible?',
          text: 'A compile error costs seconds: the compiler points at the line. A link error costs minutes: you have to work out which file should have provided the missing piece. A run-time error can cost days, or reach players. C++\'s static type system exists largely to move whole classes of mistakes from run time to compile time — so treat the compiler as your ally, and turn its warnings on.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Fix the first error first',
          text: 'One mistake can trigger dozens of follow-on errors as the compiler tries to recover. Always scroll up and fix the **first** error, then rebuild. Often the rest disappear.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'You build a project and see: `undefined reference to \'spawnEnemy(int)\'`. Which stage reported it, and what does it mean?',
      options: [
        {
          text: 'The preprocessor — the header declaring `spawnEnemy` could not be found',
          why: 'A missing header gives a preprocessor error such as "No such file or directory", and it names the header, not a function.',
        },
        {
          text: 'The compiler — `spawnEnemy` was never declared',
          why: 'An undeclared name gives a compile error like "was not declared in this scope". Here the call compiled fine, so a declaration *was* visible.',
        },
        {
          text: 'The program crashed at run time when it tried to spawn an enemy',
          why: 'Nothing ran — "undefined reference" stops the build before an executable is produced.',
        },
        {
          text: 'The linker — the function was declared, but no object file provides its definition',
          correct: true,
          why: 'Correct. The call compiled against a declaration, but when the linker went looking for the actual code, it found none. Perhaps the `.cpp` defining it was not part of the build, or its definition has a different name or parameter types.',
        },
      ],
      explanation:
        '"Undefined reference" (GCC/Clang) and "unresolved external symbol" (MSVC) are the classic link errors. Every translation unit compiled successfully, because each only needed the *declaration*. The failure shows up when the linker tries to connect the call to a definition and finds none.',
    },
    {
      kind: 'bug',
      prompt: 'These three files compile without errors, but the build fails at the link stage. Tap the line that causes it.',
      code: `// combat.h
int applyDamage(int health, int damage);

// combat.cpp
#include "combat.h"
int applyDamge(int health, int damage) {
    return health - damage;
}

// main.cpp
#include <iostream>
#include "combat.h"
int main() {
    std::cout << applyDamage(100, 30) << '\\n';
}`,
      bugLines: [6],
      hint: 'Compare the names character by character.',
      explanation:
        'Line 6 defines `applyDamge` — a typo. Each file is valid on its own: `combat.cpp` simply defines a different function, and `main.cpp` compiles because the header declares `applyDamage`. But no object file defines `applyDamage(int, int)`, so the linker reports "undefined reference to `applyDamage(int, int)`". The fix is to spell the definition exactly like the declaration — same name, same parameter types.',
    },
    {
      kind: 'concept',
      title: 'Incremental builds',
      blocks: [
        {
          type: 'p',
          text: 'Because every translation unit becomes its own object file, a [[build-system]] can be smart: when you change one file, it recompiles only what is affected and then relinks. This is an [[incremental-build]], and it is what makes working on a large C++ project bearable.',
        },
        {
          type: 'table',
          headers: ['You edit…', 'What must be rebuilt'],
          rows: [
            ['`combat.cpp`', 'Only `combat.o`, then relink'],
            ['`main.cpp`', 'Only `main.o`, then relink'],
            ['`combat.h`', 'Every `.cpp` file that includes `combat.h` — directly *or* through another header — then relink'],
            ['Nothing (rebuild requested)', 'Nothing: all object files are up to date, so at most the link runs again'],
          ],
        },
        {
          type: 'p',
          text: 'Headers are the expensive part. A header has no object file of its own — its text is pasted into every translation unit that includes it. Change one line in a header included by 500 `.cpp` files, and all 500 must be recompiled.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Keep headers lean',
          text: 'Put as little as possible in headers and include only what each file actually needs. Smaller headers mean smaller translation units and fewer files to rebuild after each change. Later units show techniques like forward declarations that help.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Why Unreal builds can be slow — and how Epic fights back',
          text: 'Touching a widely included engine or game header can trigger thousands of recompilations. Unreal\'s build tool uses **unity builds**, which glue several `.cpp` files into one translation unit so shared headers are processed once, and it uses precompiled headers. Epic\'s "include what you use" convention exists for the same reason.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'If you edit `combat.h`, only `combat.cpp` needs to be recompiled, because it has the same name.',
      answer: false,
      explanation:
        'File names mean nothing to the compiler — `combat.h` and `combat.cpp` are linked only by convention. What matters is who `#include`s the header: its text is pasted into every translation unit that includes it, directly or indirectly, and every one of those must be recompiled. That is why editing a popular header can trigger a rebuild of most of a project.',
    },
    {
      kind: 'concept',
      title: 'Debug and release builds',
      blocks: [
        {
          type: 'p',
          text: 'The same source code can be built in different [[build-configuration|build configurations]]. The two you will use constantly are **debug** (for finding bugs) and **release** (for shipping). The key difference is [[compiler-optimization]]: how hard the compiler works to make your code fast.',
        },
        {
          type: 'code',
          title: 'xp.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int total = 0;
    for (int level = 1; level <= 10; ++level) {
        total += level * 100;
    }
    std::cout << "XP needed: " << total << '\\n';
}`,
          output: 'XP needed: 5500',
          annotations: [
            { lines: '5-7', text: 'A loop (Unit 5) that adds up `level * 100` for levels 1 to 10. Unoptimized (`-O0`), the machine code really does loop ten times, storing `total` in memory each time.' },
            { lines: 8, text: 'With `-O2`, GCC works out the whole sum while compiling: the generated code contains no loop at all, just the constant `5500` passed straight to the print call.' },
          ],
        },
        {
          type: 'table',
          headers: ['Aspect', 'Debug', 'Release'],
          rows: [
            ['Optimization', 'Off: `-O0` (GCC/Clang), `/Od` (MSVC)', 'On: `-O2` or `-O3`, `/O2`'],
            ['Debug information', 'Yes: `-g`, `/Zi`', 'Often generated separately, or stripped'],
            ['Speed', 'Slow — often several times slower', 'Fast'],
            ['Debugging', 'Every variable and line maps cleanly to the source', 'Variables "optimized out", code reordered or inlined'],
            ['Typical use', 'Day-to-day development, stepping through code', 'Performance testing and shipping'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Bugs that only appear in release builds',
          text: 'The optimizer assumes your program has no undefined behavior. Code that reads an uninitialized variable or writes past an array can seem fine at `-O0` and break at `-O2`, because the optimizer transformed it based on that assumption. When a bug only shows up in release, suspect undefined behavior first — not the compiler.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal\'s build configurations',
          text: 'Unreal offers more than two: **DebugGame** (engine optimized, your game code debuggable), **Development** (the everyday default: optimized, with logging and console commands), and **Shipping** (fully optimized, debugging features removed), among others. You will pick one every time you build from your IDE.',
        },
        {
          type: 'deepdive',
          title: 'See the optimizer at work',
          blocks: [
            {
              type: 'p',
              text: 'Paste `xp.cpp` into [Compiler Explorer](https://godbolt.org) and compare `-O0` with `-O2`. At `-O0` you will find a compare-and-jump loop with `imul` (multiply) and `add` instructions. At `-O2`, the loop is gone; instead there is a single instruction like `mov esi, 5500` that loads the precomputed answer.',
            },
            {
              type: 'p',
              text: 'Optimizers apply hundreds of transformations: computing constants at compile time, keeping variables in CPU registers instead of memory, inlining small functions, removing code whose result is never used. All of them must preserve the observable behaviour of a *correct* program — which is why programs with undefined behavior are fair game for surprises.',
            },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Your game runs perfectly in the debug build, but the release build sometimes shows corrupted scores. What is the most likely explanation?',
      options: [
        {
          text: 'The compiler has an optimization bug, so you should ship the debug build',
          why: 'Compiler bugs exist but are rare. Shipping a debug build would make the game far slower and hide the real problem rather than fix it.',
        },
        {
          text: 'The code contains undefined behavior that the optimizer exposed',
          correct: true,
          why: 'Most likely. Optimizers assume UB never happens; code that reads uninitialized memory or goes out of bounds can behave "correctly" at `-O0` by luck and fail at `-O2`.',
        },
        {
          text: 'Release builds use a different version of the C++ language',
          why: 'Debug and release builds normally use the same language standard. They differ in optimization and debugging settings.',
        },
        {
          text: 'Release builds skip the linking stage',
          why: 'Every build that produces an executable must link. Release builds change how code is compiled, not which stages run.',
        },
      ],
      explanation:
        'A difference between debug and release behaviour is a classic symptom of undefined behavior. The unoptimized build happens to lay out memory and order operations in a way that masks the bug; the optimized build does not. Tools like sanitizers (Unit 16) are designed to catch exactly this.',
    },
  ],
  takeaways: [
    'Building C++ is a pipeline: preprocess → compile → assemble → link. One `g++` command runs all four.',
    'The preprocessor is pure text substitution; its output for one `.cpp` file is a translation unit.',
    'Each translation unit is compiled in isolation into an object file containing machine code and a symbol table.',
    'The linker connects every used symbol to exactly one definition and produces the executable.',
    'Compile errors point at a line; link errors ("undefined reference") mean a declaration has no matching definition; run-time errors only show up when the program runs.',
    'Incremental builds recompile only changed translation units — but editing a header recompiles every file that includes it.',
    'Debug builds are unoptimized and easy to debug; release builds are optimized, and expose undefined behavior that debug builds can hide.',
  ],
  reading: [
    {
      title: 'Introduction to the compiler, linker, and libraries',
      url: 'https://www.learncpp.com/cpp-tutorial/introduction-to-the-compiler-linker-and-libraries/',
      source: 'learncpp',
      note: 'A beginner-friendly walkthrough of the same pipeline with diagrams.',
    },
    {
      title: 'Translation phases',
      url: 'https://en.cppreference.com/w/cpp/language/translation_phases',
      source: 'cppreference',
      note: 'The standard\'s precise, nine-phase description of how source text becomes a program.',
    },
    {
      title: 'Preprocessor',
      url: 'https://en.cppreference.com/w/cpp/preprocessor',
      source: 'cppreference',
      note: 'Every preprocessor directive, including `#include`, `#define` and conditional compilation.',
    },
    {
      title: 'Compiler Explorer',
      url: 'https://godbolt.org',
      source: 'other',
      note: 'Type C++ on the left and see the generated assembly on the right; switch between `-O0` and `-O2` to watch the optimizer work.',
    },
  ],
};
