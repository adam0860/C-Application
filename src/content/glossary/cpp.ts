import type { GlossaryEntry, ReadingRef } from '../types';

/*
 * Core C++ glossary. One entry for every id in CPP_GLOSSARY_IDS
 * (scripts/glossary-master.ts). Lessons link these with [[id]].
 */

const cppref = (title: string, path: string, note: string): ReadingRef => ({
  title,
  url: `https://en.cppreference.com/w/cpp/${path}`,
  source: 'cppreference',
  note,
});

export const cppGlossary: GlossaryEntry[] = [
  // ------------------------------------------------------------ Toolchain
  {
    id: 'cpp',
    term: 'C++',
    course: 'both',
    category: 'Toolchain',
    short:
      'A compiled, statically typed, general-purpose language that combines low-level control over memory with high-level abstractions such as classes and templates.',
    long:
      'C++ was created by Bjarne Stroustrup in the early 1980s as "C with Classes" and is standardised by ISO. Its guiding idea is that you should be able to build powerful abstractions without paying a runtime cost for features you do not use.\n\nThat combination of speed and control is why C++ dominates game engines, browsers, operating systems and trading systems. The price is responsibility: the language trusts you, so mistakes such as reading freed memory are [[undefined-behavior]] rather than a friendly error.\n\nUnreal Engine is written in C++, and your gameplay code is C++ too, extended with Unreal\'s reflection macros (`UCLASS`, `UPROPERTY`) and its own containers and garbage collector.',
    example: `#include <iostream>

int main() {
    std::cout << "Hello, C++!\\n";
}`,
    see: ['iso-standard', 'standard-library', 'zero-cost-abstraction', 'compiler'],
    reading: [
      cppref('History of C++', 'language/history', 'A short history of the language and its standards from C with Classes to today.'),
      {
        title: 'isocpp.org — Get Started / FAQ',
        url: 'https://isocpp.org/faq',
        source: 'isocpp',
        note: 'The Standard C++ Foundation\'s FAQ answers common "why is C++ like this" questions.',
      },
    ],
  },
  {
    id: 'standard-library',
    term: 'Standard Library',
    aliases: ['STL', 'std library'],
    course: 'cpp',
    category: 'Toolchain',
    short:
      'The collection of types, functions and templates that every conforming C++ implementation must provide, all inside the `std` namespace — strings, containers, algorithms, I/O, smart pointers, threads and more.',
    long:
      'The standard library is specified by the same ISO document as the core language, so code that uses it is portable across compilers. You access it with `#include` (for example `<vector>` or `<string>`) and the `std::` prefix.\n\nPeople often call it "the STL", after the Standard Template Library that contributed its containers, iterators and algorithms in the 1990s. Strictly, the STL is only that part, but the nickname stuck.\n\nUnreal Engine mostly avoids the standard library in gameplay code and provides its own equivalents (`TArray`, `FString`, `TMap`, `TUniquePtr`). The concepts transfer directly, which is why learning `std::` first pays off.',
    example: `// needs <vector> and <algorithm>
std::vector<int> scores{40, 10, 30};
std::sort(scores.begin(), scores.end());
// scores is now {10, 30, 40}`,
    see: ['std-namespace', 'container', 'algorithm', 'iso-standard'],
    reading: [cppref('Containers library', 'container', 'Start at the containers overview, then browse algorithms, strings and utilities.')],
  },
  {
    id: 'iso-standard',
    term: 'ISO C++ Standard',
    aliases: ['C++ standard', 'C++20', 'C++23'],
    course: 'cpp',
    category: 'Toolchain',
    short:
      'The official document, published by ISO committee WG21, that defines what C++ is. Major versions are named after their year: C++11, C++14, C++17, C++20, C++23.',
    long:
      'The standard describes the behaviour of an abstract machine; compiler vendors (GCC, Clang, MSVC) implement it. Where the standard says behaviour is [[undefined-behavior|undefined]] or [[implementation-defined]], different compilers may legitimately do different things.\n\nC++11 was the big modernisation (move semantics, `auto`, lambdas, smart pointers). C++20 added concepts, ranges, modules and coroutines. You choose the version with a compiler flag such as `-std=c++20`.\n\nUnreal Engine 5 compiles gameplay code as C++20 by default (since UE 5.3), so modern features are available, although Epic\'s coding standard restricts some of them.',
    example: `# Pick the language version when compiling
g++ -std=c++20 main.cpp -o game`,
    exampleLang: 'shell',
    see: ['cpp', 'compiler', 'undefined-behavior', 'implementation-defined'],
    reading: [
      {
        title: 'isocpp.org — The Standard',
        url: 'https://isocpp.org/std/the-standard',
        source: 'isocpp',
        note: 'Explains how the standard is published and where to find working drafts.',
      },
      cppref('Compiler support', 'compiler_support', 'Tables showing which compiler versions implement which C++ features.'),
    ],
  },
  {
    id: 'zero-cost-abstraction',
    term: 'Zero-Cost Abstraction',
    aliases: ['zero-overhead principle'],
    course: 'cpp',
    category: 'Toolchain',
    short:
      'The C++ design principle that an abstraction should cost nothing at run time compared with the hand-written low-level code it replaces, and that you never pay for features you do not use.',
    long:
      'Stroustrup phrases it as the zero-overhead principle: "What you don\'t use, you don\'t pay for. What you do use, you couldn\'t hand code any better." A `std::array<int, 4>` is just four ints; a range-based `for` loop compiles to the same machine code as an index loop.\n\nThe cost is usually moved to [[compile-time]] instead: templates and inlining make builds slower and binaries larger, but the running game is fast.\n\n"Zero cost" is a goal, not a guarantee. Some features, such as exceptions, [[virtual-function|virtual calls]] and `std::shared_ptr`, have real (if small) costs, which is why engines like Unreal make deliberate choices about them.',
    example: `std::array<int, 3> hp{100, 80, 60};
int total = 0;
for (int h : hp) {   // same code as an index loop
    total += h;
}`,
    see: ['cpp', 'inline', 'template', 'compile-time'],
  },
  {
    id: 'compiler',
    term: 'Compiler',
    course: 'both',
    category: 'Toolchain',
    short:
      'The program that translates your C++ source code into machine code (object files) for a specific CPU and operating system. Common ones are GCC (`g++`), Clang (`clang++`) and MSVC (`cl.exe`).',
    long:
      'Compiling happens one [[translation-unit]] at a time: the [[preprocessor]] expands `#include`s and macros, then the compiler checks types, optimises and emits an [[object-file]]. The [[linker]] then joins the object files into an [[executable]].\n\nBecause C++ is statically typed, the compiler catches many mistakes before the program ever runs — wrong types, missing functions, calling a non-`const` function on a `const` object. Treat its [[compiler-warning|warnings]] as free bug reports.\n\nUnreal uses the platform\'s native compiler (MSVC on Windows, Clang on macOS/Linux and consoles), driven by UnrealBuildTool rather than by you typing commands.',
    example: `# Compile and link one file, with warnings on
g++ -std=c++20 -Wall -Wextra main.cpp -o game
./game`,
    exampleLang: 'shell',
    see: ['linker', 'preprocessor', 'translation-unit', 'compile-time'],
    reading: [cppref('Phases of translation', 'language/translation_phases', 'The exact steps a compiler performs, from raw characters to a linked program.')],
  },
  {
    id: 'linker',
    term: 'Linker',
    course: 'both',
    category: 'Toolchain',
    short:
      'The tool that combines object files and libraries into a single executable or library, connecting every use of a function or global variable to its one definition.',
    long:
      'The compiler sees only one [[translation-unit]] at a time, so when `main.cpp` calls a function defined in `combat.cpp` it just records "I need a symbol called `ApplyDamage`". The linker resolves those references across all object files.\n\nThat is why some errors appear only at link time: if you declare a function but never define it, or define it twice, the code compiles fine and then fails with a [[linker-error]].\n\nIn Unreal, forgetting to add a module to `PublicDependencyModuleNames` in your Build.cs, or forgetting the `MYGAME_API` export macro, typically produces "unresolved external symbol" linker errors.',
    example: `# Compile separately, then link
g++ -c main.cpp    -o main.o
g++ -c combat.cpp  -o combat.o
g++ main.o combat.o -o game`,
    exampleLang: 'shell',
    see: ['linker-error', 'object-file', 'one-definition-rule', 'declaration'],
  },
  {
    id: 'preprocessor',
    term: 'Preprocessor',
    course: 'both',
    category: 'Toolchain',
    short:
      'The text-processing stage that runs before compilation proper and handles every line starting with `#` — `#include`, `#define`, `#if`/`#ifdef` and friends.',
    long:
      'The preprocessor knows nothing about C++ types or scopes; it manipulates text and tokens. `#include` pastes a whole file in place, `#define` creates [[macro|macros]] that are substituted wherever their name appears, and `#if` keeps or drops blocks of code.\n\nBecause it is blind to the language, it can produce surprising errors (a macro silently replacing a name) and slows builds when headers include many other headers. Modern C++ replaces many old uses with `constexpr`, `inline` functions, templates and modules.\n\nUnreal leans on the preprocessor heavily: `UCLASS()`, `GENERATED_BODY()`, `UE_LOG` and `check()` are all macros, and `WITH_EDITOR` / `UE_BUILD_SHIPPING` guard editor-only or debug-only code.',
    example: `#include <iostream>   // paste the iostream header here
#define MAX_PLAYERS 4  // text substitution

#ifdef DEBUG_DRAW
    DrawDebugInfo();   // only compiled if defined
#endif`,
    see: ['include-directive', 'macro', 'include-guard', 'translation-unit'],
    reading: [cppref('Preprocessor', 'preprocessor', 'Overview of all preprocessing directives.')],
  },
  {
    id: 'translation-unit',
    term: 'Translation Unit',
    course: 'cpp',
    category: 'Toolchain',
    short:
      'One `.cpp` file after the preprocessor has pasted in all its `#include`d headers — the unit of code that the compiler processes in a single run.',
    long:
      'Each translation unit is compiled independently into an [[object-file]]. The compiler does not see other `.cpp` files, which is why you must [[declaration|declare]] anything you use from elsewhere, typically via a header.\n\nThis model enables parallel and incremental builds: change one `.cpp` and only that unit is recompiled. Change a header and every unit that includes it must be rebuilt, which is why large projects keep headers lean.\n\nUnreal\'s "unity builds" glue several `.cpp` files into one big translation unit to speed up compilation, which can hide missing `#include`s until a non-unity build exposes them.',
    example: `// combat.cpp + everything it includes = one TU
#include "Combat.h"

int ApplyDamage(int hp, int dmg) {
    return hp - dmg;
}`,
    see: ['preprocessor', 'object-file', 'one-definition-rule', 'header-file'],
    reading: [cppref('Phases of translation', 'language/translation_phases', 'Phase 4 is preprocessing; phase 7 compiles the translation unit; phase 9 links.')],
  },
  {
    id: 'object-file',
    term: 'Object File',
    aliases: ['.o', '.obj'],
    course: 'cpp',
    category: 'Toolchain',
    short:
      'The compiler\'s output for one translation unit: machine code plus a table of the symbols it defines and the symbols it still needs. Usually `.o` (GCC/Clang) or `.obj` (MSVC).',
    long:
      'An object file is not runnable on its own — calls to functions defined elsewhere are left as placeholders. The [[linker]] fills those in when it combines object files into an [[executable]].\n\nTools like `nm` (Linux/macOS) or `dumpbin` (Windows) list an object file\'s symbols, which is handy for diagnosing [[linker-error|linker errors]]. You will notice C++ names look scrambled ("mangled") because the compiler encodes parameter types into them to support [[function-overloading]].',
    example: `g++ -c combat.cpp -o combat.o   # compile only
nm -C combat.o                    # list symbols`,
    exampleLang: 'shell',
    see: ['translation-unit', 'linker', 'executable'],
  },
  {
    id: 'executable',
    term: 'Executable',
    course: 'cpp',
    category: 'Toolchain',
    short:
      'The final runnable program file produced by the linker, such as `game.exe` on Windows or `./game` on Linux and macOS.',
    long:
      'An executable contains machine code for one CPU architecture and OS, plus information the operating system needs to load it. That is why C++ programs must be recompiled for each target platform, unlike languages that ship bytecode.\n\nLibraries are the other kind of linker output: static libraries (`.a`, `.lib`) are copied into the executable, while shared libraries (`.so`, `.dll`, `.dylib`) are loaded at [[runtime]]. Unreal\'s editor loads each game module as a DLL, which is what makes Live Coding possible.',
    example: `g++ main.cpp -o game   # produce the executable
./game                 # run it`,
    exampleLang: 'shell',
    see: ['linker', 'object-file', 'compiler'],
  },
  {
    id: 'source-file',
    term: 'Source File',
    aliases: ['.cpp file', 'implementation file'],
    course: 'cpp',
    category: 'Toolchain',
    short:
      'A text file containing C++ code that is compiled directly, conventionally with a `.cpp` extension (also `.cc` or `.cxx`). It usually holds function and class [[definition|definitions]].',
    long:
      'Each source file becomes one [[translation-unit]]. The usual split is: declarations in a [[header-file]] (`Player.h`), definitions in the matching source file (`Player.cpp`), which `#include`s its own header first.\n\nThis split lets many files share the declarations while the code itself is compiled only once — keeping builds fast and satisfying the [[one-definition-rule]]. Unreal follows exactly this pattern, with headers in `Public/` and source files in `Private/` folders.',
    example: `// Player.cpp
#include "Player.h"

void Player::TakeDamage(int amount) {
    health -= amount;
}`,
    see: ['header-file', 'translation-unit', 'definition'],
  },
  {
    id: 'header-file',
    term: 'Header File',
    aliases: ['.h file', '.hpp file'],
    course: 'both',
    category: 'Toolchain',
    short:
      'A file (usually `.h` or `.hpp`) holding declarations — classes, function prototypes, constants, templates — that other files `#include` to share them.',
    long:
      'A header is a contract: "these things exist". Any file that includes it can call the functions and use the types, and the [[linker]] connects the calls to the definitions in the matching `.cpp`.\n\nHeaders are pasted textually into every file that includes them, so they must be protected with an [[include-guard]] or [[pragma-once]], and should not define non-`inline` functions or global variables (that would break the [[one-definition-rule]]). Templates and `inline` functions are the exception: they normally live entirely in headers.\n\nIn Unreal, a class header must include `"ClassName.generated.h"` as its **last** include, because UnrealHeaderTool generates code that the header depends on.',
    example: `// Player.h
#pragma once

class Player {
public:
    void TakeDamage(int amount);
private:
    int health = 100;
};`,
    see: ['include-directive', 'pragma-once', 'forward-declaration', 'source-file'],
    reading: [cppref('Source file inclusion', 'preprocessor/include', 'How #include finds and pastes headers, including the "" vs <> search rules.')],
  },
  {
    id: 'include-directive',
    term: '#include',
    course: 'cpp',
    category: 'Toolchain',
    short:
      'A preprocessor directive that copies the entire contents of another file into the current one at that point. `<...>` searches system/library paths; `"..."` searches next to the current file first.',
    long:
      '`#include <vector>` brings in the standard library\'s vector declarations; `#include "Player.h"` brings in your own header. Nothing clever happens — it is literal text pasting before the compiler sees the code.\n\nBecause of that, every include costs build time, and a header that includes many others makes every file that includes *it* slower. Include what you use, prefer [[forward-declaration|forward declarations]] in headers when a pointer or reference is enough, and protect headers with [[pragma-once]].\n\nUnreal enforces "Include What You Use" (IWYU): each file should include exactly the headers it needs rather than relying on a giant catch-all header.',
    example: `#include <iostream>   // standard library header
#include <vector>
#include "Player.h"   // your own header`,
    see: ['preprocessor', 'header-file', 'include-guard', 'pragma-once'],
    reading: [cppref('Source file inclusion', 'preprocessor/include', 'Covers both include forms and __has_include.')],
  },
  {
    id: 'macro',
    term: 'Macro',
    aliases: ['#define'],
    course: 'both',
    category: 'Toolchain',
    short:
      'A name defined with `#define` that the preprocessor replaces with other text before compilation. Function-like macros take arguments, but they are pure text substitution, not real functions.',
    long:
      'Macros ignore scope, types and namespaces, so they can collide with ordinary names and produce baffling errors. Classic pitfalls: `#define SQUARE(x) x*x` gives the wrong answer for `SQUARE(a+1)`, and arguments with side effects such as `SQUARE(i++)` are evaluated twice.\n\nIn modern C++ prefer `constexpr` variables for constants, `inline` or `constexpr` functions for small computations, and templates for generic code. Macros remain useful for things the language cannot do: [[include-guard|include guards]], conditional compilation, and capturing `__FILE__`/`__LINE__`.\n\nUnreal uses macros extensively — `UCLASS()`, `UPROPERTY()`, `GENERATED_BODY()`, `TEXT()`, `UE_LOG`, `check()` — because they mark code for UnrealHeaderTool or compile to nothing in shipping builds.',
    example: `#define SQUARE_BAD(x) x * x
int a = SQUARE_BAD(2 + 1);   // 2 + 1*2 + 1 == 5 !

constexpr int Square(int x) { return x * x; }
int b = Square(2 + 1);       // 9`,
    see: ['preprocessor', 'constexpr', 'inline', 'include-guard'],
    reading: [cppref('Replacing text macros', 'preprocessor/replace', 'How #define works, including # and ## operators and predefined macros.')],
  },
  {
    id: 'include-guard',
    term: 'Include Guard',
    course: 'cpp',
    category: 'Toolchain',
    short:
      'A `#ifndef` / `#define` / `#endif` wrapper around a header\'s contents so that including the header twice in one translation unit pastes its contents only once.',
    long:
      'Headers often include other headers, so the same header can easily reach one `.cpp` file twice. Without protection, the second copy redefines the same classes and the compiler reports "redefinition" errors.\n\nThe guard macro name must be unique across the project (for example `MYGAME_PLAYER_H`); two headers accidentally sharing one guard name will silently hide each other. Most code today uses the shorter [[pragma-once]], which every major compiler supports.\n\nNote that guards only work *within* one translation unit; they do nothing to stop separate `.cpp` files from each defining the same function, which is a [[one-definition-rule]] violation caught by the linker.',
    example: `// Player.h
#ifndef MYGAME_PLAYER_H
#define MYGAME_PLAYER_H

class Player { /* ... */ };

#endif // MYGAME_PLAYER_H`,
    see: ['pragma-once', 'header-file', 'macro', 'preprocessor'],
  },
  {
    id: 'pragma-once',
    term: '#pragma once',
    course: 'cpp',
    category: 'Toolchain',
    short:
      'A directive at the top of a header that tells the compiler to include that file at most once per translation unit — a one-line alternative to an include guard.',
    long:
      '`#pragma once` is not part of the ISO standard, but GCC, Clang and MSVC all support it, and it avoids the risk of two headers sharing a guard macro name. It can misbehave in exotic setups where the same file is reachable through different paths (such as some network drives or symlinks), which is why a few projects still prefer classic guards.\n\nUnreal Engine headers use `#pragma once` throughout, and Epic\'s class templates generate it for you.',
    example: `// HealthComponent.h
#pragma once

class HealthComponent { /* ... */ };`,
    see: ['include-guard', 'header-file', 'preprocessor'],
  },
  {
    id: 'compile-time',
    term: 'Compile Time',
    course: 'cpp',
    category: 'Toolchain',
    short:
      'Everything that happens while the program is being built, before it ever runs: type checking, template instantiation, `constexpr` evaluation and optimisation.',
    long:
      'C++ deliberately pushes as much work as possible to compile time. A type error found by the compiler costs you seconds; the same mistake found by a player costs much more. `constexpr`, `static_assert`, templates and concepts all exploit this.\n\nAnything computed at compile time is free at [[runtime]] — a `constexpr` lookup table is baked into the executable. The trade-off is longer builds, which matters in large codebases like Unreal, where a full rebuild can take tens of minutes.',
    example: `constexpr int MaxLevel = 50;
constexpr int XpFor(int level) { return level * 100; }

static_assert(XpFor(MaxLevel) == 5000); // checked by the compiler
int table[XpFor(3)];                     // size known at compile time`,
    see: ['runtime', 'constexpr', 'template-instantiation', 'consteval'],
  },
  {
    id: 'runtime',
    term: 'Run Time',
    aliases: ['runtime'],
    course: 'cpp',
    category: 'Toolchain',
    short:
      'The period while the program is actually executing. Values that depend on input, files, randomness or the clock can only be known at run time.',
    long:
      'Some checks can only happen at run time: is this index in range, did the file open, is this pointer null? C++ generally does *not* insert such checks for you (for speed), so `v[10]` on a 5-element vector is [[undefined-behavior]] rather than an error, while `v.at(10)` checks and throws.\n\n"Runtime" (one word) also names the support code a language needs while running — for C++, the startup code that calls `main`, the exception-handling machinery and the standard library\'s compiled parts.',
    example: `int level = 0;
std::cin >> level;           // known only at run time
std::vector<int> loot(level);
int x = loot.at(5);          // checked: throws if too small`,
    see: ['compile-time', 'undefined-behavior', 'exception'],
  },
  {
    id: 'build-system',
    term: 'Build System',
    course: 'cpp',
    category: 'Toolchain',
    short:
      'A tool that knows how to turn a project\'s many source files into executables: which files to compile, with which flags, in what order, and which ones to rebuild after a change.',
    long:
      'Typing `g++` by hand stops scaling after a handful of files. A build system tracks dependencies so only changed files (and files that include changed headers) are recompiled, and runs compilations in parallel.\n\nCommon tools are Make and Ninja (low-level executors), MSBuild (Visual Studio), and [[cmake]], which generates files for those tools from a portable description.\n\nUnreal has its own: UnrealBuildTool reads each module\'s `Build.cs` (written in C#) and drives the platform compiler, while UnrealHeaderTool generates reflection code before compilation.',
    example: `# Configure once, then build incrementally
cmake -S . -B build
cmake --build build -j 8`,
    exampleLang: 'shell',
    see: ['cmake', 'compiler', 'linker'],
  },
  {
    id: 'cmake',
    term: 'CMake',
    course: 'cpp',
    category: 'Toolchain',
    short:
      'A cross-platform build-system generator: you describe targets in `CMakeLists.txt`, and CMake generates Ninja files, Makefiles or Visual Studio solutions to actually build them.',
    long:
      'CMake is the de facto standard for open-source C++ projects and is understood by most IDEs (CLion, VS Code, Visual Studio). Modern CMake is *target-based*: you create a target with `add_executable` or `add_library` and attach properties such as the C++ standard, include directories and linked libraries to it.\n\nPrefer `target_compile_features`, `target_link_libraries` and friends over old global commands like `include_directories`, so settings stay attached to the targets that need them.\n\nUnreal does not use CMake for game code (it uses UnrealBuildTool), but many third-party libraries you might integrate into an Unreal plugin are built with CMake.',
    example: `cmake_minimum_required(VERSION 3.20)
project(Arena LANGUAGES CXX)

add_executable(arena main.cpp combat.cpp)
target_compile_features(arena PRIVATE cxx_std_20)`,
    exampleLang: 'cmake',
    see: ['build-system', 'compiler', 'compiler-warning'],
    reading: [
      {
        title: 'CMake documentation',
        url: 'https://cmake.org/cmake/help/latest/',
        source: 'other',
        note: 'Official reference; the "cmake-buildsystem(7)" manual explains targets and properties.',
      },
    ],
  },
  {
    id: 'compiler-warning',
    term: 'Compiler Warning',
    course: 'cpp',
    category: 'Toolchain',
    short:
      'A diagnostic about code that is legal C++ but probably wrong — an unused variable, a signed/unsigned comparison, a missing `return`. The program still builds, unlike with an error.',
    long:
      'Many real bugs show up first as warnings: using an uninitialised variable, `if (x = 5)` instead of `==`, narrowing a `double` into an `int`. Turn them on with `-Wall -Wextra` (GCC/Clang) or `/W4` (MSVC) and keep your build warning-free so new warnings stand out.\n\n`-Werror` (or `/WX`) turns warnings into errors, which teams use to stop warnings from piling up. Silencing a warning should be a conscious decision, for example with `[[maybe_unused]]` or an explicit cast, not a reflex.\n\nUnreal builds with a high warning level and treats some warnings as errors, especially shadowed variables and implicit conversions.',
    example: `int Damage(int base) {
    int bonus;              // warning: may be used uninitialized
    if (base > 10) bonus = 5;
    return base + bonus;
}`,
    see: ['compiler', 'undefined-behavior', 'sanitizer', 'narrowing-conversion'],
    reading: [
      {
        title: 'GCC — Options to Request or Suppress Warnings',
        url: 'https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html',
        source: 'other',
        note: 'Lists what -Wall and -Wextra enable, plus useful extras like -Wshadow and -Wconversion.',
      },
    ],
  },
  {
    id: 'linker-error',
    term: 'Linker Error',
    aliases: ['unresolved external symbol', 'undefined reference'],
    course: 'both',
    category: 'Toolchain',
    short:
      'An error reported after compilation succeeded, when the linker cannot find the single definition a symbol needs ("undefined reference", "unresolved external symbol") or finds more than one ("multiple definition").',
    long:
      'Typical causes of a missing definition: you declared a function but never wrote its body, misspelled it or gave it different parameters in the `.cpp`, forgot to compile/link the `.cpp` that defines it, or declared a `static` member without defining it.\n\n"Multiple definition" usually means a non-`inline` function or a global variable was defined in a header that several `.cpp` files include — a [[one-definition-rule]] violation.\n\nIn Unreal, unresolved externals often mean a missing module dependency in `Build.cs` or a class/function missing its `MYGAME_API` export macro when used from another module.',
    example: `// main.cpp
int ApplyDamage(int hp, int dmg); // declared...

int main() {
    return ApplyDamage(100, 10);   // ...never defined
}
// error: undefined reference to 'ApplyDamage(int, int)'`,
    see: ['linker', 'declaration', 'definition', 'one-definition-rule'],
  },
  {
    id: 'debugger',
    term: 'Debugger',
    course: 'both',
    category: 'Toolchain',
    short:
      'A tool that runs your program under control so you can pause it, step line by line, inspect variables and the call stack, and see exactly where it crashes. Examples: GDB, LLDB, the Visual Studio debugger.',
    long:
      'A debugger answers "what is the program actually doing?" far faster than adding print statements. You set a [[breakpoint]], run, then step over or into functions and watch values change.\n\nBuild with debug information (`-g` on GCC/Clang) and, ideally, without heavy optimisation (`-O0`), otherwise variables may be "optimised out" and lines may execute out of order.\n\nIn Unreal you typically attach Visual Studio or Rider to the editor process and choose the "DebugGame Editor" or "Development Editor" configuration; DebugGame keeps your game module unoptimised for easier debugging.',
    example: `g++ -g -O0 main.cpp -o game   # build with debug info
gdb ./game
(gdb) break main.cpp:12
(gdb) run
(gdb) print health`,
    exampleLang: 'shell',
    see: ['breakpoint', 'call-stack', 'sanitizer', 'assertion'],
  },
  {
    id: 'breakpoint',
    term: 'Breakpoint',
    course: 'both',
    category: 'Toolchain',
    short:
      'A marker on a line of code that makes the debugger pause the program just before that line executes, so you can inspect its state.',
    long:
      'Conditional breakpoints pause only when an expression is true (for example `enemyId == 42`), which is invaluable in a game loop that runs thousands of times. Data breakpoints (watchpoints) pause when a memory location changes — perfect for finding who corrupts a variable.\n\nIn an IDE you usually click in the margin next to a line. In Unreal, breakpoints in `Tick` will freeze the editor as soon as it hits them, so conditional breakpoints are your friend.',
    example: `void Enemy::Tick(float dt) {
    health -= poison * dt;  // <- breakpoint here,
    if (health <= 0) {      //    condition: health < 5
        Die();
    }
}`,
    see: ['debugger', 'call-stack', 'assertion'],
  },
  {
    id: 'sanitizer',
    term: 'Sanitizer',
    aliases: ['ASan', 'UBSan', 'TSan'],
    course: 'cpp',
    category: 'Toolchain',
    short:
      'A compiler feature that adds run-time checks to your program to catch memory errors (AddressSanitizer), undefined behaviour (UBSan) or data races (ThreadSanitizer) the moment they happen.',
    long:
      'Bugs such as reading past the end of an array or using freed memory often "work" by accident and crash much later somewhere unrelated. A sanitizer instruments every memory access so the program stops immediately with a report showing the exact line and the allocation history.\n\nEnable them with `-fsanitize=address,undefined` (or `-fsanitize=thread` separately, since TSan cannot be combined with ASan) on GCC/Clang; MSVC supports `/fsanitize=address`. They slow the program down (ASan roughly 2x), so use them in testing builds, not releases.\n\nRunning your tests under sanitizers is one of the most effective habits a C++ programmer can build.',
    example: `g++ -std=c++20 -g -fsanitize=address,undefined \\
    main.cpp -o game
./game
# ERROR: AddressSanitizer: heap-use-after-free ...`,
    exampleLang: 'shell',
    see: ['undefined-behavior', 'debugger', 'dangling-pointer', 'data-race'],
    reading: [
      {
        title: 'Clang — AddressSanitizer',
        url: 'https://clang.llvm.org/docs/AddressSanitizer.html',
        source: 'other',
        note: 'What ASan detects, how to read its reports, and its performance cost.',
      },
      {
        title: 'Clang — UndefinedBehaviorSanitizer',
        url: 'https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html',
        source: 'other',
        note: 'The list of UB checks UBSan can perform, such as signed overflow and misaligned access.',
      },
    ],
  },
  {
    id: 'undefined-behavior',
    term: 'Undefined Behavior',
    aliases: ['UB'],
    course: 'both',
    category: 'Toolchain',
    short:
      'Code whose behaviour the C++ standard places **no requirements** on — for example reading an uninitialised variable, signed integer overflow, out-of-bounds access, or dereferencing a dangling pointer. Anything may happen, including appearing to work.',
    long:
      'UB is not "it crashes" or "you get garbage". The compiler is allowed to assume UB never happens and optimise on that basis, so a UB bug can delete a check you wrote, behave differently between debug and release builds, or work for months and then break after a compiler upgrade.\n\nThis contract is why C++ is fast: the language does not pay for bounds checks or overflow checks on every operation. It is also why tools matter — [[compiler-warning|warnings]], [[sanitizer|sanitizers]], `.at()` instead of `[]`, and smart pointers instead of raw `new`/`delete`.\n\nCompare [[implementation-defined]] behaviour, where the result may vary between compilers but each compiler must document and consistently produce a valid result. In Unreal, UB typically shows up as a mysterious editor crash far from the real bug.',
    example: `int arr[3] = {1, 2, 3};
int x = arr[3];         // UB: out of bounds

int big = INT_MAX;
big = big + 1;          // UB: signed overflow

int* p = nullptr;
int y = *p;             // UB: null dereference`,
    see: ['implementation-defined', 'sanitizer', 'integer-overflow', 'dangling-pointer'],
    reading: [
      cppref('Undefined behavior', 'language/ub', 'Defines UB, unspecified and implementation-defined behaviour, with examples of surprising optimisations.'),
    ],
  },
  {
    id: 'implementation-defined',
    term: 'Implementation-Defined Behavior',
    course: 'cpp',
    category: 'Toolchain',
    short:
      'Behaviour that the standard lets each compiler/platform choose, as long as it documents the choice and is consistent — for example `sizeof(int)`, or whether plain `char` is signed.',
    long:
      'Implementation-defined code is valid C++; it is just not portable. `sizeof(long)` is 8 on 64-bit Linux but 4 on 64-bit Windows, so code that assumes one size breaks on the other. Use [[fixed-width-integer|fixed-width types]] such as `std::int32_t` when the exact size matters.\n\nA close cousin is *unspecified* behaviour: one of several valid outcomes happens, and the compiler need not document which (for example, the order in which function arguments are evaluated). Both are completely different from [[undefined-behavior]], where the standard imposes no requirements at all.\n\nThis is exactly why Unreal defines its own `int32`, `uint8`, `int64` types: so engine code means the same thing on every platform.',
    example: `std::cout << sizeof(long) << '\\n'; // 8 on Linux x64,
                                   // 4 on Windows x64
char c = static_cast<char>(200);   // value depends on
                                   // whether char is signed`,
    see: ['undefined-behavior', 'fixed-width-integer', 'sizeof', 'signedness'],
    reading: [cppref('Undefined behavior', 'language/ub', 'Read the section contrasting ill-formed, implementation-defined, unspecified and undefined behaviour.')],
  },
  {
    id: 'one-definition-rule',
    term: 'One Definition Rule (ODR)',
    aliases: ['ODR'],
    course: 'cpp',
    category: 'Toolchain',
    short:
      'The rule that every function, variable, class and template may have only one definition in the whole program (non-inline functions and variables), or identical definitions in each translation unit that needs them (classes, templates, `inline` entities).',
    long:
      'You may *declare* something as often as you like, but define it once. Defining a normal function in a header included by two `.cpp` files gives two definitions and a "multiple definition" [[linker-error]].\n\nClasses, templates and `inline` functions can appear in many translation units, but every copy must be token-for-token identical. If two files define different `struct Item` types with the same name, the program is ill-formed with **no diagnostic required** — the linker may silently pick one, producing bizarre bugs.\n\nThe fix is the usual split: declarations in headers, definitions in exactly one `.cpp`, or mark header-defined functions and variables `inline`.',
    example: `// Utils.h — included by many .cpp files
int Clamp(int v);                  // OK: declaration
inline int Twice(int v) {          // OK: inline definition
    return v * 2;
}
int Half(int v) { return v / 2; }  // ODR violation!`,
    see: ['declaration', 'definition', 'inline', 'linker-error'],
    reading: [cppref('Definitions and ODR', 'language/definition', 'The precise wording of what counts as a definition and when duplicates are allowed.')],
  },
  // ------------------------------------------------------------ Syntax
  {
    id: 'main-function',
    term: 'main()',
    aliases: ['main function', 'entry point'],
    course: 'cpp',
    category: 'Syntax',
    short:
      'The function where every standalone C++ program starts executing. It must return `int`; returning `0` (or `EXIT_SUCCESS`) tells the operating system the program succeeded.',
    long:
      'The two standard forms are `int main()` and `int main(int argc, char* argv[])`, the second receiving command-line arguments. `main` is special: if execution reaches its closing brace without a `return`, it behaves as if it returned `0` — the only function with that rule.\n\nBefore `main` runs, the C++ runtime initialises global and `static` objects; after it returns, their destructors run. You may not call `main` yourself.\n\nAn Unreal game has no `main` you write: the engine owns the entry point (`GuardedMain` and friends) and calls into your code through actors, components and other engine hooks.',
    example: `#include <iostream>

int main(int argc, char* argv[]) {
    std::cout << "Launched with " << argc
              << " argument(s)\\n";
    return 0;
}`,
    see: ['function', 'return-value', 'executable'],
    reading: [cppref('Main function', 'language/main_function', 'The allowed signatures and the special rules that apply only to main.')],
  },
  {
    id: 'statement',
    term: 'Statement',
    course: 'cpp',
    category: 'Syntax',
    short:
      'A complete instruction that the program executes, such as a declaration, an expression followed by `;`, an `if`, a loop, or a `return`. Statements run in order unless control flow changes it.',
    long:
      'The most common kind is the *expression statement*: an [[expression]] followed by a semicolon, like `health -= 10;`. A block `{ ... }` (a compound statement) groups several statements into one and also creates a new [[scope]].\n\nForgetting a `;` is the classic beginner error, and because the compiler only notices at the *next* token, the error message often points at the line after the real mistake.',
    example: `int health = 100;           // declaration statement
health -= 25;               // expression statement
if (health < 50) {          // selection statement
    std::cout << "Low!\\n";  // statement inside a block
}
return 0;                   // jump statement`,
    see: ['expression', 'control-flow', 'scope'],
    reading: [cppref('Statements', 'language/statements', 'All kinds of statements: labeled, expression, compound, selection, iteration, jump, declaration.')],
  },
  {
    id: 'expression',
    term: 'Expression',
    course: 'cpp',
    category: 'Syntax',
    short:
      'A combination of operands and operators that the compiler evaluates to produce a value (and possibly side effects), such as `2 + 3`, `health * 0.5`, or `Attack(target)`.',
    long:
      'Every expression has a [[type]] and a [[lvalue|value category]] (roughly: does it name an object with an address, or is it a temporary value?). Expressions can nest: `(base + bonus) * multiplier` contains smaller expressions.\n\nSome expressions have *side effects* — they change state, like `x = 5`, `++count` or a function that prints. Be careful combining several side effects on the same variable in one expression; the order of evaluation of operands is often unspecified, and some combinations were undefined before C++17.',
    example: `int dmg = (base + bonus) * 2;  // arithmetic expression
bool dead = hp <= 0;           // comparison -> bool
Attack(target);                // call expression
count++;                       // expression with side effect`,
    see: ['statement', 'operator', 'operand', 'lvalue'],
    reading: [cppref('Expressions', 'language/expressions', 'Overview of operators, conversions, literals and value categories.')],
  },
  {
    id: 'operator',
    term: 'Operator',
    course: 'cpp',
    category: 'Syntax',
    short:
      'A symbol (or keyword) that performs an operation on one or more operands: arithmetic `+ - * / %`, comparison `== != < >`, logical `&& || !`, assignment `=`, and many more.',
    long:
      'Operators are classified by how many operands they take: unary (`-x`, `!done`, `*ptr`), binary (`a + b`) and the one ternary operator (`cond ? a : b`). When an expression has several, [[precedence]] and [[associativity]] decide how it is grouped.\n\nFor your own types you can give most operators a meaning via [[operator-overloading]] — that is how `std::string` supports `+` and how a `Vector3` can support `a + b`. Unreal\'s `FVector` overloads `+`, `-`, `*` and `|` (dot product) and `^` (cross product).',
    example: `int total = a + b * c;    // * before +
bool ok = alive && hp > 0; // logical AND
score += 10;               // compound assignment
int sign = hp > 0 ? 1 : -1;`,
    see: ['operand', 'precedence', 'operator-overloading', 'expression'],
    reading: [cppref('C++ operator precedence', 'language/operator_precedence', 'The full table of operators, their precedence and associativity.')],
  },
  {
    id: 'operand',
    term: 'Operand',
    course: 'cpp',
    category: 'Syntax',
    short:
      'A value an operator works on. In `hp - damage`, `hp` and `damage` are the operands of `-`.',
    long:
      'Operands can themselves be expressions: in `(a + b) * c`, the left operand of `*` is the whole expression `a + b`. Before many binary operators run, their operands undergo conversions — for example both operands of `+` are brought to a common type, so `3 + 2.5` adds two `double`s.\n\nThe order in which operands are evaluated is generally *unspecified*: in `f() + g()`, either function may run first. Exceptions include `&&`, `||`, the comma operator, and (since C++17) `<<`, `>>` and assignment.',
    example: `int hp = 100, damage = 30;
int left = hp - damage;  // operands: hp, damage
double avg = 7 / 2.0;    // 7 is converted to double`,
    see: ['operator', 'expression', 'implicit-conversion'],
  },
  {
    id: 'literal',
    term: 'Literal',
    course: 'cpp',
    category: 'Syntax',
    short:
      'A value written directly in source code, such as `42`, `3.14`, `\'A\'`, `"hello"`, `true` or `nullptr`. Each literal has a type determined by its form and suffix.',
    long:
      'The form decides the type: `42` is `int`, `42u` is `unsigned int`, `42LL` is `long long`, `3.14` is `double`, `3.14f` is `float`, `\'A\'` is `char`, and `"hi"` is an array of `const char`. Integers can be written in hex `0xFF`, binary `0b1010` or octal `017`, and since C++14 you can add digit separators: `1\'000\'000`.\n\nA classic trap: a leading zero makes a number octal, so `010` is eight, not ten. Another: `float speed = 1.5;` stores a `double` literal into a `float`; write `1.5f` to say what you mean (Unreal\'s coding standard asks for the `f` suffix on float literals).',
    example: `int lives = 3;
unsigned mask = 0xFFu;
long long big = 9'000'000'000LL;
float speed = 4.5f;
char grade = 'A';
bool alive = true;`,
    see: ['string-literal', 'type', 'integer-type', 'floating-point'],
    reading: [cppref('Integer literal', 'language/integer_literal', 'How prefixes and suffixes choose the type of an integer literal.')],
  },
  {
    id: 'string-literal',
    term: 'String Literal',
    course: 'cpp',
    category: 'Strings',
    short:
      'Text in double quotes, like `"Game Over"`. Its type is an array of `const char` that includes a hidden null terminator, so `"Hi"` occupies 3 bytes.',
    long:
      'String literals live in read-only memory for the whole program, so modifying one is [[undefined-behavior]]. They are *not* `std::string` objects: `"a" + "b"` does not compile (you cannot add two arrays), whereas `std::string{"a"} + "b"` works. The `s` suffix (`"hi"s`, with `using namespace std::string_literals`) creates a `std::string` directly, and `sv` creates a `std::string_view`.\n\nRaw string literals `R"(...)"` disable [[escape-sequence|escape sequences]], which is handy for file paths and regular expressions. Adjacent literals are concatenated by the compiler: `"Game " "Over"` becomes `"Game Over"`.\n\nIn Unreal, wrap string literals in `TEXT("...")` so they become wide-character literals matching `TCHAR`, the character type `FString` uses.',
    example: `const char* title = "Space Raiders";
std::string msg = std::string{"HP: "} + "100";
const char* path = R"(C:\\Games\\Save)";  // raw literal
// sizeof("Hi") == 3  ('H', 'i', '\\0')`,
    see: ['std-string', 'c-string', 'null-terminator', 'escape-sequence'],
    reading: [cppref('String literal', 'language/string_literal', 'Prefixes (u8, u, U, L), raw strings, concatenation and storage duration.')],
  },
  {
    id: 'escape-sequence',
    term: 'Escape Sequence',
    course: 'cpp',
    category: 'Strings',
    short:
      'A backslash followed by one or more characters inside a character or string literal that stands for a special character, such as `\\n` (newline), `\\t` (tab), `\\"` (double quote) or `\\\\` (backslash).',
    long:
      'Escapes let you write characters that are invisible or would otherwise end the literal. Common ones: `\\n` newline, `\\t` tab, `\\\\` backslash, `\\\'` single quote, `\\"` double quote and `\\0` the null character.\n\nA very common bug is a Windows path like `"C:\\new\\level"`, where `\\n` silently becomes a newline. Double the backslashes, use forward slashes (which Windows also accepts), or use a raw string literal `R"(C:\\new\\level)"`.',
    example: `std::cout << "Name:\\tAria\\n";      // tab, newline
std::cout << "She said \\"hi\\"\\n";  // quotes
std::cout << "C:\\\\Games\\\\save\\n";   // backslashes`,
    see: ['string-literal', 'char-type', 'endl'],
    reading: [cppref('Escape sequences', 'language/escape', 'The complete list, including octal, hex and Unicode escapes.')],
  },
  {
    id: 'identifier',
    term: 'Identifier',
    course: 'cpp',
    category: 'Syntax',
    short:
      'A name you give to a variable, function, type, namespace or other entity. It may contain letters, digits and underscores, cannot start with a digit, is case-sensitive, and cannot be a keyword.',
    long:
      '`health`, `Health` and `HEALTH` are three different identifiers. Some names are reserved for the implementation: anything containing a double underscore `__`, or starting with an underscore followed by a capital letter (`_Score`), and names starting with `_` at global scope. Using them is not allowed (the compiler need not tell you) and can clash with compiler or library internals.\n\nChoose descriptive names (`maxHealth` beats `mh`). Unreal\'s coding standard uses PascalCase for everything, prefixes types (`A` actors, `U` objects, `F` structs, `E` enums, `I` interfaces, `T` templates) and prefixes booleans with `b` (`bIsDead`).',
    example: `int playerScore = 0;    // OK
double _speed = 1.0;    // legal but avoid leading _
int 2ndPlace = 0;       // error: starts with a digit
int class = 3;          // error: 'class' is a keyword`,
    see: ['keyword', 'variable', 'namespace'],
    reading: [cppref('Identifiers', 'language/identifiers', 'Rules for valid names and which ones are reserved.')],
  },
  {
    id: 'keyword',
    term: 'Keyword',
    course: 'cpp',
    category: 'Syntax',
    short:
      'A word reserved by the language with a fixed meaning, such as `int`, `if`, `return`, `class`, `const` or `nullptr`. Keywords cannot be used as identifiers.',
    long:
      'C++ has roughly 90 keywords and adds a few with each standard (`constexpr` and `nullptr` in C++11, `concept`, `requires` and `co_await` in C++20). `override` and `final` are *identifiers with special meaning* rather than true keywords, so old code using them as variable names still compiles.\n\nUnreal adds many uppercase macros that look like keywords — `UCLASS`, `UPROPERTY`, `GENERATED_BODY` — but they are ordinary [[macro|macros]] read by UnrealHeaderTool, not part of C++.',
    example: `class Enemy {              // class: keyword
public:                    // public: keyword
    virtual void Attack(); // virtual, void: keywords
};`,
    see: ['identifier', 'statement', 'override'],
    reading: [cppref('C++ keywords', 'keyword', 'The full list, with the standard each keyword was introduced in.')],
  },
  {
    id: 'comment',
    term: 'Comment',
    course: 'cpp',
    category: 'Syntax',
    short:
      'Text in source code that the compiler ignores. `//` comments run to the end of the line; `/* ... */` comments can span several lines (but do not nest).',
    long:
      'Good comments explain *why* the code does something — a design decision, a workaround, a non-obvious invariant — rather than restating *what* each line does. Code that needs a comment to explain what it does can often be improved by better names.\n\nBecause `/* */` comments do not nest, commenting out a block that already contains one ends the comment early. Use `//` on each line, or `#if 0 ... #endif`.\n\nIn Unreal, comments directly above a `UPROPERTY` or `UFUNCTION` become the tooltip shown in the editor and in Blueprints, so they double as designer documentation.',
    example: `// Regenerate slowly so fights feel tense.
health += regenRate * dt;

/* Multi-line comment:
   tuned by design, see balance doc. */`,
    see: ['statement', 'preprocessor'],
    reading: [cppref('Comments', 'comment', 'The two comment forms and how they interact with the preprocessor.')],
  },
  {
    id: 'namespace',
    term: 'Namespace',
    course: 'cpp',
    category: 'Syntax',
    short:
      'A named scope that groups related declarations, so that names from different libraries do not collide. You refer to a member as `NamespaceName::member`.',
    long:
      'Two libraries can both define a `Vector` without conflict if one lives in `math::` and the other in `physics::`. Namespaces can be nested (`namespace game::combat { ... }`, C++17 syntax) and reopened in many files.\n\nAn *unnamed* (anonymous) namespace makes its contents visible only inside the current [[translation-unit]] — the modern replacement for file-level `static` functions — which avoids accidental [[one-definition-rule]] clashes.\n\nUnreal uses namespaces sparingly; instead it relies on type prefixes (`F`, `U`, `A`) and module names. You will still see namespaces such as `UE::Math` and `UE::Tasks` in newer engine code.',
    example: `namespace combat {
    int ApplyDamage(int hp, int dmg) {
        return hp - dmg;
    }
}

int left = combat::ApplyDamage(100, 30);`,
    see: ['std-namespace', 'scope-resolution-operator', 'using-directive', 'scope'],
    reading: [cppref('Namespaces', 'language/namespace', 'Named, inline and unnamed namespaces, plus using-declarations and using-directives.')],
  },
  {
    id: 'std-namespace',
    term: 'std',
    aliases: ['std::', 'namespace std'],
    course: 'cpp',
    category: 'Syntax',
    short:
      'The namespace that contains (almost) everything in the C++ standard library — `std::cout`, `std::string`, `std::vector` and so on.',
    long:
      'Putting the library in `std` keeps its many short names (`count`, `find`, `move`, `size`) out of your way. You opt in by writing the `std::` prefix, which also makes it obvious to readers where a name comes from.\n\nYou are not allowed to add your own declarations to `std` (with narrow exceptions such as specialising `std::hash` for your type); doing so is undefined behaviour.\n\nThis course writes `std::` explicitly instead of `using namespace std;`, the same habit you will need in Unreal, where engine types already use names like `TArray` and `FString` and mixing in `std` names wholesale would be confusing.',
    example: `#include <string>
#include <vector>

std::vector<std::string> party{"Aria", "Bram"};
std::cout << party.size() << '\\n';`,
    see: ['namespace', 'standard-library', 'using-directive', 'scope-resolution-operator'],
  },
  {
    id: 'scope-resolution-operator',
    term: 'Scope Resolution Operator (::)',
    aliases: ['::'],
    course: 'cpp',
    category: 'Syntax',
    short:
      'The `::` operator, which names something inside a namespace, class or enum: `std::cout`, `Player::TakeDamage`, `Color::Red`. A leading `::name` means "the global one".',
    long:
      'You use `::` constantly: to reach library names (`std::string`), to define member functions outside their class (`void Player::Heal(int amount) { ... }`), to access `static` members (`Game::instanceCount`), and to name scoped enumerators (`State::Idle`).\n\nIt is resolved entirely at compile time, so it costs nothing at run time. In Unreal you will see it in every `.cpp` file, for example `void AMyActor::BeginPlay()` and `Super::BeginPlay()`.',
    example: `class Player {
public:
    void Heal(int amount);
    static int count;
};

int Player::count = 0;               // static member
void Player::Heal(int amount) { }    // member definition`,
    see: ['namespace', 'std-namespace', 'member-function', 'static-member'],
  },
  {
    id: 'using-directive',
    term: 'using Directive',
    aliases: ['using namespace'],
    course: 'cpp',
    category: 'Syntax',
    short:
      '`using namespace X;` makes every name from namespace `X` usable without the `X::` prefix in the current scope. A *using-declaration* (`using std::cout;`) imports a single name instead.',
    long:
      '`using namespace std;` saves typing in tiny programs but pulls hundreds of names into your scope, where they can collide with your own (`count`, `distance`, `data`, `size`) and cause confusing errors or, worse, silently call the wrong function.\n\n**Never** put a using-directive at namespace scope in a header: it leaks into every file that includes it. Inside a function body or a `.cpp` file it is a matter of taste; importing specific names with a using-declaration, or a short namespace alias (`namespace fs = std::filesystem;`), is a good compromise.\n\nDo not confuse it with `using Alias = Type;`, which creates a [[type-alias]].',
    example: `using std::cout;              // one name: fine
namespace fs = std::filesystem; // alias: fine

using namespace std;          // everything: avoid,
int count = 0;                // may clash with std::count`,
    see: ['namespace', 'std-namespace', 'type-alias', 'header-file'],
    reading: [cppref('Namespaces', 'language/namespace', 'See the sections on using-directives and using-declarations.')],
  },
  {
    id: 'stream',
    term: 'Stream',
    aliases: ['iostream'],
    course: 'cpp',
    category: 'Syntax',
    short:
      'An object that represents a flow of characters to or from somewhere — the console, a file, a string. You write with `<<` (insertion) and read with `>>` (extraction).',
    long:
      'Streams provide one uniform interface: the same `<<` works for `std::cout` (console), `std::ofstream` (file) and `std::ostringstream` (building a string). Each type that supports output overloads `operator<<`, so you can make your own types printable too.\n\nStreams have state flags: after a failed read (for example letters when a number was expected) the stream enters a fail state and ignores further input until you call `clear()`. Always check that input succeeded.\n\nC++20 added `std::format` and C++23 `std::print`, which offer Python-style formatting and are often faster and clearer. Unreal does not use iostreams; it logs with `UE_LOG` and formats with `FString::Printf`.',
    example: `#include <fstream>
#include <sstream>

std::ofstream save{"save.txt"};
save << "level=" << 3 << '\\n';

std::ostringstream oss;
oss << "HP: " << 75;      // oss.str() == "HP: 75"`,
    see: ['cout', 'cin', 'endl', 'operator-overloading'],
  },
  {
    id: 'cout',
    term: 'std::cout',
    course: 'cpp',
    category: 'Syntax',
    short:
      'The standard output stream (declared in `<iostream>`), normally connected to the console. You print with the insertion operator: `std::cout << "Score: " << score;`.',
    long:
      'Each `<<` returns the stream itself, which is why calls chain left to right. Output is *buffered*: characters are collected and written in batches for speed, and the buffer is flushed when it fills, when the program ends normally, when you read from `std::cin`, or when you flush explicitly.\n\nFor errors use `std::cerr`, which is unbuffered and goes to the error stream even when normal output is redirected to a file.',
    example: `#include <iostream>

int main() {
    int score = 1200;
    std::cout << "Score: " << score << '\\n';
    std::cerr << "Warning: low health\\n";
}`,
    see: ['stream', 'cin', 'endl', 'std-namespace'],
    reading: [cppref('std::cout', 'io/cout', 'The standard output stream object and its relationship to C stdout.')],
  },
  {
    id: 'cin',
    term: 'std::cin',
    course: 'cpp',
    category: 'Syntax',
    short:
      'The standard input stream (from `<iostream>`), normally connected to the keyboard. `std::cin >> x;` reads whitespace-separated text and converts it to `x`\'s type.',
    long:
      '`>>` skips leading whitespace and stops at the next whitespace, so it reads one word at a time; use `std::getline(std::cin, line)` to read a whole line including spaces.\n\nIf the input cannot be converted (typing "abc" into an `int`), the stream sets its fail flag, leaves the bad input in the buffer, and every later `>>` silently does nothing. Check the stream in a condition (`if (std::cin >> x)`) and recover with `std::cin.clear()` plus `ignore`.\n\nMixing `>>` and `getline` is a classic trap: `>>` leaves the newline in the buffer, so a following `getline` reads an empty line.',
    example: `int level = 0;
if (std::cin >> level) {
    std::cout << "Loading level " << level << '\\n';
} else {
    std::cout << "That was not a number\\n";
}`,
    see: ['stream', 'cout', 'std-string'],
    reading: [cppref('std::cin', 'io/cin', 'The standard input stream and how it is tied to std::cout.')],
  },
  {
    id: 'endl',
    term: 'std::endl',
    course: 'cpp',
    category: 'Syntax',
    short:
      'A stream manipulator that writes a newline **and** flushes the stream\'s buffer. Writing `\'\\n\'` gives the newline without the flush.',
    long:
      'Flushing forces the buffered text out to the console or file immediately. That is rarely needed and is slow when done on every line — printing a large file with `std::endl` can be many times slower than with `\'\\n\'`.\n\nUse `\'\\n\'` by default, and flush explicitly (`std::flush` or `std::endl`) only when output must appear right now, for example before a long computation or a possible crash. `std::cerr` is unbuffered anyway.',
    example: `std::cout << "Saving...\\n";      // newline only
std::cout << "Saved." << std::endl; // newline + flush`,
    see: ['cout', 'stream', 'escape-sequence'],
    reading: [cppref('std::endl', 'io/manip/endl', 'Exactly what endl does and why plain newlines are usually preferred.')],
  },
  // ------------------------------------------------------------ Types
  {
    id: 'variable',
    term: 'Variable',
    course: 'cpp',
    category: 'Types',
    short:
      'A named object (or reference) that holds a value of a fixed type, such as `int health = 100;`. The type is decided when you declare it and never changes.',
    long:
      'Declaring a variable reserves storage of the right size and gives it a name. Because C++ is statically typed, `health` stays an `int` forever; assigning `"full"` to it is a compile error rather than a surprise at run time.\n\nAlways initialise variables when you declare them. A local `int x;` without an initialiser holds an *indeterminate* value, and reading it is [[undefined-behavior]] (C++26 softens this to "erroneous behaviour", but the value is still garbage).\n\nIn Unreal, member variables you want the editor or garbage collector to know about are marked with `UPROPERTY()`.',
    example: `int health = 100;          // declare + initialise
double speed{4.5};          // brace initialisation
const int maxLives = 3;     // cannot be changed later
health = 80;                // assign a new value`,
    see: ['object', 'type', 'initialization', 'scope'],
  },
  {
    id: 'object',
    term: 'Object',
    course: 'cpp',
    category: 'Types',
    short:
      'In C++, a region of storage with a type, a size, a lifetime and (usually) a value. An `int` variable is an object just as much as an instance of a class.',
    long:
      'This is broader than the object-oriented meaning: the standard calls any typed piece of memory an object, whether it is an `int`, an array element, a `std::string` or a heap-allocated `Enemy`. Functions and references are *not* objects.\n\nEvery object has a [[lifetime]] that starts when it is constructed and ends when it is destroyed. Using an object outside its lifetime (for example through a [[dangling-pointer]]) is undefined behaviour.\n\nUnreal adds its own meaning: a `UObject` is an engine-managed object with reflection and garbage collection. Plain C++ objects (`FVector`, `int32`) still exist alongside them.',
    example: `int score = 0;              // an object of type int
std::string name{"Aria"};    // an object of class type
auto* boss = new Enemy{};    // an Enemy object on the heap
int& ref = score;            // a reference: not an object`,
    see: ['variable', 'lifetime', 'class', 'storage-duration'],
    reading: [cppref('Object', 'language/object', 'The formal definition of objects, their properties, alignment and lifetime.')],
  },
  {
    id: 'type',
    term: 'Type',
    course: 'cpp',
    category: 'Types',
    short:
      'The property of every object and expression that determines what values it can hold, how much memory it uses, and which operations are allowed on it — for example `int`, `double`, `std::string`, `Player*`.',
    long:
      'C++ checks types at compile time (static typing). That is how the compiler knows `a + b` means integer addition for two `int`s but concatenation for two `std::string`s, and why it can reject `health.push_back(3)` when `health` is an `int`.\n\nTypes come in families: [[fundamental-type|fundamental types]] built into the language, compound types such as pointers, references and arrays, and user-defined types you create with `class`, `struct` and `enum`. Qualifiers like `const` produce related types (`const int`).',
    example: `int hp = 100;            // fundamental type
double* ptr = nullptr;    // pointer type
std::vector<int> scores; // class template type
struct Item { int id; }; // user-defined type`,
    see: ['fundamental-type', 'variable', 'type-alias', 'type-deduction'],
  },
  {
    id: 'fundamental-type',
    term: 'Fundamental Type',
    aliases: ['built-in type', 'primitive type'],
    course: 'cpp',
    category: 'Types',
    short:
      'A type built into the language itself: the integer types (`int`, `long`, `char`…), floating-point types (`float`, `double`), `bool`, `void` and `std::nullptr_t`.',
    long:
      'Fundamental types map directly onto what CPUs handle natively, which is why operations on them are so fast. The standard sets only *minimum* sizes (for example `int` is at least 16 bits, `long` at least 32), and the actual sizes are [[implementation-defined]]. On all mainstream desktop and console platforms `int` is 32 bits.\n\nWhen size matters (file formats, networking, save games) use the [[fixed-width-integer|fixed-width types]] from `<cstdint>`. Unreal provides its own aliases — `int32`, `uint8`, `int64`, `float`, `double` — and its coding standard asks you to use them instead of plain `int` in most engine-facing code.',
    example: `bool alive = true;
char initial = 'A';
int score = 0;
long long xp = 12'000'000'000;
float speed = 6.5f;
double gravity = 9.81;`,
    see: ['integer-type', 'floating-point', 'bool-type', 'sizeof'],
    reading: [cppref('Fundamental types', 'language/types', 'Every built-in type with its minimum width and common data models (LP64, LLP64).')],
  },
  {
    id: 'integer-type',
    term: 'Integer Type',
    aliases: ['int', 'integral type'],
    course: 'cpp',
    category: 'Types',
    short:
      'A type that stores whole numbers: `short`, `int`, `long`, `long long`, each in a signed and an unsigned version, plus the character types and `bool`, which are integral too.',
    long:
      '`int` is the natural choice for everyday counting. Use a wider type such as `long long` (at least 64 bits) for values that can exceed about two billion, and `std::size_t` for sizes and indices returned by the standard library.\n\nIntegers have a fixed range. Going past the maximum of a *signed* type is [[integer-overflow|undefined behaviour]]; unsigned types wrap around modulo 2^N. Integer division also discards the fractional part: `7 / 2` is `3`.',
    example: `int lives = 3;
long long totalXp = 5'000'000'000LL;
unsigned int flags = 0b0101u;
std::size_t count = inventory.size();`,
    see: ['signedness', 'fixed-width-integer', 'integer-overflow', 'integer-division'],
    reading: [cppref('Fundamental types', 'language/types', 'The integer types table shows minimum widths and typical sizes.')],
  },
  {
    id: 'floating-point',
    term: 'Floating-Point Type',
    aliases: ['float', 'double'],
    course: 'cpp',
    category: 'Types',
    short:
      'A type for real numbers with a fractional part: `float` (usually 32-bit, ~7 significant digits), `double` (usually 64-bit, ~15–16 digits) and `long double`.',
    long:
      'Floating-point numbers are stored in binary scientific notation (almost always IEEE 754), so many decimal values like `0.1` cannot be represented exactly. As a result `0.1 + 0.2 == 0.3` is `false`. Compare with a tolerance instead: `std::abs(a - b) < 1e-6`.\n\nPrecision also shrinks as magnitude grows: far from the origin, a `float` cannot represent small steps, which is why huge open worlds jitter. Unreal 5 switched `FVector` to `double` components (Large World Coordinates) for exactly this reason, while many other engine values remain `float`.\n\nDividing a floating-point number by zero is UB in standard C++, although on IEEE 754 platforms it typically yields infinity or NaN.',
    example: `double a = 0.1 + 0.2;
bool same = (a == 0.3);               // false!
bool close = std::abs(a - 0.3) < 1e-9; // true
float speed = 600.0f;                 // f suffix = float`,
    see: ['fundamental-type', 'implicit-conversion', 'narrowing-conversion', 'literal'],
    reading: [cppref('Fundamental types', 'language/types', 'The floating-point section covers float, double, long double and IEEE 754.')],
  },
  {
    id: 'char-type',
    term: 'char',
    course: 'cpp',
    category: 'Types',
    short:
      'The one-byte character type, written with single quotes: `\'A\'`. It is really a small integer holding a character code, so `\'A\' + 1` is `66`.',
    long:
      '`sizeof(char)` is 1 by definition, and a byte is at least 8 bits. Whether plain `char` is signed or unsigned is [[implementation-defined]] (typically signed on x86 and unsigned on ARM Linux), so use `unsigned char` or `std::byte` for raw bytes.\n\nA `char` holds one *byte*, not one human-readable character: UTF-8 text uses several bytes for characters like é or 🎮. For text use `std::string`; C++ also has `char8_t`, `char16_t`, `char32_t` and `wchar_t` for other encodings.\n\nUnreal\'s `TCHAR` is the engine\'s character type (UTF-16 `wchar_t` on Windows), which is why string literals in Unreal are wrapped in `TEXT("...")`.',
    example: `char grade = 'B';
char next = grade + 1;     // 'C' (char arithmetic)
int code = 'A';            // 65 in ASCII
std::cout << next << ' ' << code << '\\n';  // C 65`,
    see: ['fundamental-type', 'string-literal', 'escape-sequence', 'signedness'],
  },
  {
    id: 'bool-type',
    term: 'bool',
    course: 'cpp',
    category: 'Types',
    short:
      'The Boolean type, holding either `true` or `false`. Comparisons such as `hp > 0` and logical operators such as `&&` produce `bool` values.',
    long:
      'Numbers and pointers convert to `bool` automatically: zero and `nullptr` become `false`, everything else `true`. That is why `if (ptr)` checks for null. The reverse also happens: `true + true` is the `int` 2.\n\nPrinting a `bool` with `std::cout` shows `1` or `0` unless you use `std::boolalpha`.\n\nUnreal\'s coding standard prefixes boolean variables with `b` (`bIsAlive`, `bCanJump`), and you will often see `uint8 bFlag : 1;` bitfields in engine classes to pack many flags into few bytes.',
    example: `bool alive = hp > 0;
if (alive && !stunned) {
    Attack();
}
std::cout << std::boolalpha << alive << '\\n';  // true`,
    see: ['fundamental-type', 'if-statement', 'short-circuit-evaluation', 'implicit-conversion'],
  },
  {
    id: 'signedness',
    term: 'Signed and Unsigned',
    aliases: ['unsigned', 'signed'],
    course: 'cpp',
    category: 'Types',
    short:
      'Signed integer types can hold negative values; unsigned types hold only zero and positive values but have twice the positive range. `int` is signed; `unsigned int` and `std::size_t` are unsigned.',
    long:
      'Unsigned arithmetic wraps around: `0u - 1` is the largest unsigned value (4,294,967,295 for 32 bits). That is well defined, but often a bug — a loop like `for (unsigned i = n - 1; i >= 0; --i)` never ends, because `i >= 0` is always true.\n\nMixing signed and unsigned in a comparison converts the signed value to unsigned, so `-1 < 1u` is `false`! Compilers warn about this with `-Wsign-compare`; C++20 offers `std::cmp_less` and `std::ssize()` to compare safely.\n\nA common guideline: use signed `int` for arithmetic and counts, and unsigned types for bit flags. Unreal\'s `TArray` deliberately uses signed `int32` for indices and `Num()`.',
    example: `unsigned int lives = 0;
lives = lives - 1;       // wraps to 4294967295

int a = -1;
unsigned int b = 1;
bool less = a < b;       // false! a converts to unsigned`,
    see: ['integer-type', 'integer-overflow', 'implicit-conversion', 'fixed-width-integer'],
  },
  {
    id: 'sizeof',
    term: 'sizeof',
    course: 'cpp',
    category: 'Types',
    short:
      'A compile-time operator that gives the size in bytes of a type or object, as a `std::size_t`: `sizeof(int)` is typically 4.',
    long:
      '`sizeof` is evaluated by the compiler, so it costs nothing at run time and its operand is not executed: `sizeof(f())` does not call `f`.\n\nA class can be larger than the sum of its members because of *padding* inserted for alignment; ordering members from largest to smallest can shrink it. `sizeof` on a pointer gives the pointer\'s size (8 on 64-bit), not the size of what it points to — a classic mistake after [[array-decay]].\n\n`sizeof(std::vector<int>)` is a fixed small number (often 24) no matter how many elements it holds, because the elements live on the heap.',
    example: `std::cout << sizeof(char) << '\\n';    // always 1
std::cout << sizeof(int) << '\\n';     // typically 4
int arr[10];
std::cout << sizeof(arr) << '\\n';     // 40 (10 * 4)
int* p = arr;
std::cout << sizeof(p) << '\\n';       // 8 on 64-bit`,
    see: ['fundamental-type', 'array-decay', 'implementation-defined', 'contiguous-memory'],
    reading: [cppref('sizeof operator', 'language/sizeof', 'Rules and examples, including sizeof on arrays, references and classes.')],
  },
  {
    id: 'fixed-width-integer',
    term: 'Fixed-Width Integer',
    aliases: ['int32_t', 'uint8_t', '<cstdint>'],
    course: 'cpp',
    category: 'Types',
    short:
      'Integer types from `<cstdint>` with an exact, guaranteed bit width: `std::int8_t`, `std::int16_t`, `std::int32_t`, `std::int64_t` and their unsigned `std::uintN_t` versions.',
    long:
      'Plain `int` and `long` vary between platforms. When the exact size matters — binary file formats, network packets, save games, hashing — use fixed-width types so the data means the same thing everywhere.\n\nBeware that `std::int8_t` and `std::uint8_t` are usually aliases for `signed char` / `unsigned char`, so `std::cout` prints them as characters, not numbers. Cast to `int` before printing.\n\nUnreal defines the same idea with shorter names: `int8`, `uint8`, `int16`, `int32`, `int64`, `uint32` and so on. Most engine APIs take `int32`.',
    example: `#include <cstdint>

std::int32_t gold = 1500;
std::uint8_t level = 7;
std::cout << level << '\\n';                   // prints a control char!
std::cout << static_cast<int>(level) << '\\n'; // prints 7`,
    see: ['integer-type', 'implementation-defined', 'signedness', 'sizeof'],
    reading: [cppref('Fixed width integer types', 'types/integer', 'All the intN_t, int_leastN_t and int_fastN_t aliases plus their limit macros.')],
  },
  {
    id: 'initialization',
    term: 'Initialization',
    course: 'cpp',
    category: 'Types',
    short:
      'Giving an object its first value at the moment it is created, as in `int hp = 100;` or `int hp{100};`. This is different from *assignment*, which replaces the value of an object that already exists.',
    long:
      'C++ has several initialisation forms: copy-initialisation `int a = 5;`, direct-initialisation `int a(5);`, list (brace) initialisation `int a{5};`, plus [[default-initialization|default]] and [[value-initialization|value]] initialisation when no value is given. They differ in subtle ways, especially for class types.\n\nThe distinction from assignment matters: `const` variables and references *must* be initialised and can never be assigned, and class members should be initialised in the [[member-initializer-list]] rather than assigned in the constructor body.\n\nUninitialised local variables of fundamental type hold indeterminate values. Making "always initialise" a habit eliminates a whole class of bugs.',
    example: `int a = 5;          // copy-initialisation
int b(5);           // direct-initialisation
int c{5};           // list (brace) initialisation
int d{};            // value-initialised: 0
int e;              // default-initialised: indeterminate!
a = 7;              // assignment, not initialisation`,
    see: ['brace-initialization', 'default-initialization', 'value-initialization', 'constructor'],
    reading: [cppref('Initialization', 'language/initialization', 'A map of every initialisation form, with links to the detailed rules for each.')],
  },
  {
    id: 'brace-initialization',
    term: 'Brace Initialization',
    aliases: ['list initialization', 'uniform initialization', '{}'],
    course: 'cpp',
    category: 'Types',
    short:
      'Initialising with curly braces, such as `int hp{100};` or `std::vector<int> v{1, 2, 3};`. It works for almost every type and refuses [[narrowing-conversion|narrowing conversions]].',
    long:
      'Introduced in C++11 as a "uniform" syntax, braces work for fundamental types, arrays, aggregates (`Point p{1, 2};`) and classes with constructors. Their big safety win is that `int x{3.7};` is a compile error instead of silently becoming 3.\n\nThe main gotcha: if a class has a constructor taking `std::initializer_list`, braces strongly prefer it. `std::vector<int> v{10};` is one element with value 10, while `std::vector<int> v(10);` is ten zeros.\n\nEmpty braces `{}` value-initialise, so `int x{};` is guaranteed to be zero.',
    example: `int hp{100};
double speed{4.5};
int bad{4.5};               // error: narrowing
std::vector<int> a{10};     // one element: 10
std::vector<int> b(10);     // ten elements: 0
Point p{3, 4};              // aggregate init`,
    see: ['initialization', 'narrowing-conversion', 'value-initialization', 'std-vector'],
    reading: [cppref('List-initialization', 'language/list_initialization', 'Covers narrowing rules and how initializer_list constructors are preferred.')],
  },
  {
    id: 'default-initialization',
    term: 'Default Initialization',
    course: 'cpp',
    category: 'Types',
    short:
      'What happens when you create an object with no initialiser at all, like `int x;` or `Enemy e;`. Class types run their default constructor; fundamental types at local scope are left with an **indeterminate** value.',
    long:
      '`int score;` inside a function reserves memory but does not set it, so it contains whatever bytes were there before. Reading it is [[undefined-behavior]] — a notorious source of "works in debug, breaks in release" bugs. (Globals and `static` variables are different: they are zero-initialised first.)\n\nFor a class, default initialisation calls the default constructor, and any members of fundamental type that the constructor does not set are themselves left indeterminate. Give members default member initialisers (`int health = 100;`) to avoid this.\n\nUnreal zero-initialises `UObject` memory before construction, so members of a `UObject` start as zero — but a `USTRUCT` or plain struct created on the stack gets no such help.',
    example: `int score;            // indeterminate: do not read!
std::string name;      // default ctor: empty string

struct Stats {
    int hp;            // indeterminate in Stats s;
    int mana = 50;     // always 50
};`,
    see: ['initialization', 'value-initialization', 'default-constructor', 'undefined-behavior'],
    reading: [cppref('Default-initialization', 'language/default_initialization', 'When default-initialisation happens and which objects end up indeterminate.')],
  },
  {
    id: 'value-initialization',
    term: 'Value Initialization',
    course: 'cpp',
    category: 'Types',
    short:
      'Initialising with empty parentheses or braces, such as `int x{};` or `Stats s{};`. Fundamental types become zero (or `false`/`nullptr`), and classes are default-constructed after being zeroed when they have no user-provided constructor.',
    long:
      'Value initialisation is the simplest way to guarantee a sane starting value: `int count{};` is `0`, `double d{};` is `0.0`, `Enemy* target{};` is `nullptr`.\n\nContainers use it too: `std::vector<int> v(5);` holds five zeros because each element is value-initialised.\n\nWatch out for the "most vexing parse": `Stats s();` declares a *function* named `s` returning `Stats`, not an object. Use `Stats s{};` instead.',
    example: `int count{};           // 0
double ratio{};         // 0.0
Enemy* target{};        // nullptr
std::vector<int> v(5);  // {0, 0, 0, 0, 0}
Stats s();              // oops: declares a function!`,
    see: ['initialization', 'default-initialization', 'brace-initialization'],
    reading: [cppref('Value-initialization', 'language/value_initialization', 'The exact rules for class types with and without user-provided constructors.')],
  },
  {
    id: 'narrowing-conversion',
    term: 'Narrowing Conversion',
    course: 'cpp',
    category: 'Types',
    short:
      'A conversion that can lose information, such as `double` to `int` (drops the fraction) or `long long` to `int` (may not fit). Brace initialisation rejects narrowing; `=` allows it silently.',
    long:
      '`int damage = 9.99;` compiles and stores `9`. `int damage{9.99};` is an error, which is the main reason this course prefers braces. When you really do want to convert, say so with `static_cast<int>(9.99)` so readers know it is intentional.\n\nConversions from a constant expression whose value fits are allowed even in braces: `char c{65};` is fine, but `char c{300};` is not.\n\nUnreal\'s build enables warnings for many implicit narrowing conversions (for example `double` to `float` after the switch to Large World Coordinates), so being explicit saves you compile errors there too.',
    example: `double raw = 9.99;
int a = raw;                    // compiles: a == 9
int b{raw};                     // error: narrowing
int c = static_cast<int>(raw);  // explicit: c == 9`,
    see: ['brace-initialization', 'implicit-conversion', 'static-cast', 'compiler-warning'],
    reading: [cppref('List-initialization', 'language/list_initialization', 'The "Narrowing conversions" section lists exactly which conversions are rejected.')],
  },
  {
    id: 'const',
    term: 'const',
    course: 'cpp',
    category: 'Types',
    short:
      'A qualifier meaning "this cannot be modified through this name". A `const` variable must be initialised and can never be assigned afterwards.',
    long:
      '`const` documents intent and lets the compiler enforce it: if you accidentally write `maxHealth = 0;`, the build fails. It appears in many places — `const` variables, [[const-reference|const references]] for cheap read-only parameters, [[const-member-function|const member functions]] that promise not to change the object, and pointers ([[const-pointer]]).\n\n`const` is checked at compile time and has no run-time cost. Note that `const` means *read-only*, not necessarily *compile-time constant*: `const int n = ReadFromFile();` is fine. For a guaranteed compile-time value use [[constexpr]].\n\n"Const-correctness" is expected in Unreal too: getters are marked `const`, and parameters like `const FString&` are everywhere.',
    example: `const int MaxHealth = 100;
MaxHealth = 50;                // error: read-only

void Print(const std::string& name);  // read-only param

int Player::GetHealth() const {       // const member fn
    return health;
}`,
    see: ['constexpr', 'const-reference', 'const-member-function', 'const-pointer'],
    reading: [cppref('cv type qualifiers', 'language/cv', 'Formal rules for const and volatile, including const objects and conversions.')],
  },
  {
    id: 'constexpr',
    term: 'constexpr',
    course: 'cpp',
    category: 'Types',
    short:
      'A keyword marking a variable whose value is known at compile time, or a function that *can* be evaluated at compile time when given constant arguments.',
    long:
      'A `constexpr` variable is implicitly `const` and must be initialised with a constant expression, so it can be used where the language requires one: array sizes, template arguments, `static_assert`, `case` labels.\n\nA `constexpr` function runs at compile time when its result is needed in a constant expression and its arguments are constants; otherwise it runs at run time like a normal function. Since C++20 such functions may even use `std::vector` and `std::string` internally, as long as nothing allocated escapes.\n\nUse `constexpr` instead of `#define` for constants: it has a type, respects scope and shows up in the debugger. If you need to *force* compile-time evaluation, use [[consteval]].',
    example: `constexpr int MaxPlayers = 4;
constexpr int Squared(int x) { return x * x; }

std::array<int, Squared(MaxPlayers)> grid{}; // 16 ints
static_assert(Squared(3) == 9);
int n = Squared(input);   // runs at run time`,
    see: ['consteval', 'const', 'compile-time', 'macro'],
    reading: [cppref('constexpr specifier', 'language/constexpr', 'Requirements for constexpr variables and functions, and how they relaxed in each standard.')],
  },
  {
    id: 'consteval',
    term: 'consteval',
    aliases: ['immediate function'],
    course: 'cpp',
    category: 'Types',
    short:
      'A C++20 keyword declaring an *immediate function*: every call must be evaluated at compile time, and calling it with run-time values is a compile error.',
    long:
      'Where `constexpr` means "may run at compile time", `consteval` means "must". That is useful for computations that should never cost anything at run time, or for validating inputs such as format strings: a mistake becomes a compile error instead of a run-time bug. `std::format` uses this idea to check its format strings.\n\nThe companion keyword `constinit` (also C++20) guarantees that a global or `static` variable is initialised at compile time, avoiding initialisation-order bugs, without making it `const`.',
    example: `consteval int Kilobytes(int n) { return n * 1024; }

constexpr int buffer = Kilobytes(4);  // OK: 4096
int n = 8;
int size = Kilobytes(n);   // error: n is not constant`,
    see: ['constexpr', 'compile-time', 'const'],
    reading: [cppref('consteval specifier', 'language/consteval', 'Rules for immediate functions and how they differ from constexpr functions.')],
  },
  {
    id: 'auto',
    term: 'auto',
    course: 'cpp',
    category: 'Types',
    short:
      'A placeholder type: `auto x = expr;` tells the compiler to deduce the variable\'s type from its initialiser. The type is still fixed at compile time — `auto` is not dynamic typing.',
    long:
      '`auto` shines with long or unspeakable types: iterators (`auto it = scores.begin();`), lambdas, and results of templates. It also guarantees initialisation, since an `auto` variable without an initialiser does not compile.\n\nPitfalls: plain `auto` drops references and top-level `const`, so `auto x = someRef;` makes a *copy*; write `auto&` or `const auto&` to avoid it. `auto` with braces can surprise in older code, and overusing `auto` for simple types can hide important information like `int` vs `double`.\n\nUnreal\'s coding standard is conservative: it allows `auto` for lambdas, iterators and verbose template types, but asks you to spell out types elsewhere for readability.',
    example: `auto score = 42;            // int
auto ratio = 0.5;           // double
auto it = names.begin();    // std::vector<std::string>::iterator
for (const auto& enemy : enemies) {  // no copies
    enemy.Draw();
}`,
    see: ['type-deduction', 'range-based-for', 'lambda', 'template-argument-deduction'],
    reading: [cppref('Placeholder type specifiers', 'language/auto', 'auto, decltype(auto) and constrained placeholders like std::integral auto.')],
  },
  {
    id: 'type-deduction',
    term: 'Type Deduction',
    course: 'cpp',
    category: 'Types',
    short:
      'The compiler working out a type for you from an expression — for `auto` variables, `decltype`, template arguments, lambda return types and class template arguments (CTAD).',
    long:
      '`auto` deduction follows almost the same rules as [[template-argument-deduction]]: references and top-level `const` are stripped unless you ask for them with `auto&`, `const auto&` or `auto&&`. `decltype(expr)` instead reports the declared type exactly, references included.\n\nSince C++17, class template argument deduction lets you write `std::pair p{1, 2.5};` or `std::vector v{1, 2, 3};` without spelling the template arguments.\n\nDeduction happens entirely at compile time; hovering over a variable in your IDE shows what was deduced, which is a great way to check your understanding.',
    example: `const int max = 10;
auto a = max;          // int (const dropped)
const auto& b = max;   // const int&
decltype(max) c = 5;   // const int
std::vector v{1, 2, 3}; // CTAD: std::vector<int>`,
    see: ['auto', 'template-argument-deduction', 'const'],
  },
  {
    id: 'implicit-conversion',
    term: 'Implicit Conversion',
    course: 'cpp',
    category: 'Types',
    short:
      'A type conversion the compiler performs automatically, without a cast — for example `int` to `double` in `2 + 0.5`, a number to `bool` in an `if`, or a class converted via a non-`explicit` constructor.',
    long:
      'Implicit conversions make everyday code pleasant (`double avg = total / 2.0;`), but some are dangerous: `double` to `int` silently truncates, negative `int` to `unsigned` wraps, and mixed signed/unsigned comparisons give wrong answers.\n\nIn arithmetic, operands are first brought to a common type (the "usual arithmetic conversions"): small integers are promoted to `int`, and then the "lower" type converts to the "higher" one. That is why `5 / 2` is `2` but `5 / 2.0` is `2.5`.\n\nFor your own classes, mark single-argument constructors [[explicit]] so they do not create surprise conversions.',
    example: `double avg = 7 / 2;     // 3.0: int division first!
double ok = 7 / 2.0;    // 3.5: 7 converts to double
int hp = 99.9;          // 99: truncated (warning)
if (enemyCount) { }     // int -> bool`,
    see: ['integral-promotion', 'narrowing-conversion', 'static-cast', 'explicit'],
    reading: [cppref('Implicit conversions', 'language/implicit_conversion', 'Promotions, numeric conversions, boolean conversions and the order they are tried.')],
  },
  {
    id: 'integral-promotion',
    term: 'Integral Promotion',
    course: 'cpp',
    category: 'Types',
    short:
      'The automatic conversion of small integer types (`char`, `short`, `bool`, small enums, and their unsigned versions) to `int` (or `unsigned int`) before arithmetic is performed.',
    long:
      'CPUs work most efficiently on `int`-sized values, so C++ never does arithmetic directly on a `char` or `short`. Adding two `std::uint8_t` values produces an `int`, which is why `auto sum = a + b;` gives an `int` and why assigning it back may trigger a narrowing warning.\n\nPromotion also explains why `std::cout << (\'A\' + 1)` prints `66` rather than `B`: the result is an `int`.',
    example: `std::uint8_t a = 200, b = 100;
auto sum = a + b;            // int 300, no wrap-around
std::uint8_t c = a + b;      // narrowed back: 44
std::cout << ('A' + 1);      // prints 66`,
    see: ['implicit-conversion', 'char-type', 'integer-type'],
    reading: [cppref('Implicit conversions', 'language/implicit_conversion', 'The "Integral promotion" section lists exactly which types are promoted.')],
  },
  {
    id: 'static-cast',
    term: 'static_cast',
    course: 'cpp',
    category: 'Types',
    short:
      'The everyday explicit conversion: `static_cast<T>(expr)` converts between related types (numbers, enums, pointers up and down a class hierarchy) with checking at compile time only.',
    long:
      'Use it to make intentional conversions visible: `static_cast<double>(kills) / deaths` or `static_cast<int>(State::Running)`. Unlike a C-style cast `(int)x`, it refuses nonsense such as converting an unrelated pointer type, and it is easy to search for.\n\n`static_cast` can also downcast `Base*` to `Derived*`, but it does **not** check that the object really is a `Derived`; if it is not, using the result is undefined behaviour. Use [[dynamic-cast]] (or Unreal\'s `Cast<T>`) when you are not sure.',
    example: `int kills = 7, deaths = 2;
double ratio = static_cast<double>(kills) / deaths; // 3.5

enum class State { Idle, Running };
int code = static_cast<int>(State::Running);       // 1`,
    see: ['dynamic-cast', 'reinterpret-cast', 'implicit-conversion', 'narrowing-conversion'],
    reading: [cppref('static_cast conversion', 'language/static_cast', 'Every conversion static_cast may perform, including downcasts and enum conversions.')],
  },
  {
    id: 'reinterpret-cast',
    term: 'reinterpret_cast',
    course: 'cpp',
    category: 'Types',
    short:
      'A low-level cast that reinterprets the bits of a pointer (or integer) as a different, unrelated type, such as `reinterpret_cast<char*>(&value)`. It performs no checks and is easy to misuse.',
    long:
      'Legitimate uses are rare: viewing an object\'s bytes through `char*`, `unsigned char*` or `std::byte*` (for serialisation or hashing), converting pointers to integers for debugging, or talking to hardware and C APIs.\n\nAccessing an object through a pointer to an unrelated type usually violates the *strict aliasing* rule and is [[undefined-behavior]]. To reinterpret the bits of a value (for example a `float` as a `std::uint32_t`), use `std::bit_cast` (C++20) or `std::memcpy` instead.',
    example: `float f = 1.0f;
auto bytes = reinterpret_cast<const unsigned char*>(&f);
// OK: inspecting the object's bytes

auto bits = std::bit_cast<std::uint32_t>(f); // safe way
// int* bad = reinterpret_cast<int*>(&f);   // UB if used`,
    see: ['static-cast', 'undefined-behavior', 'pointer'],
    reading: [cppref('reinterpret_cast conversion', 'language/reinterpret_cast', 'Includes the type aliasing rules that decide when the result may be used.')],
  },
  {
    id: 'dynamic-cast',
    term: 'dynamic_cast',
    course: 'cpp',
    category: 'Types',
    short:
      'A run-time checked cast for polymorphic classes: `dynamic_cast<Derived*>(basePtr)` returns a valid pointer if the object really is a `Derived` (or derives from it), and `nullptr` otherwise.',
    long:
      'It only works when the base class has at least one virtual function, because it uses the run-time type information stored alongside the [[vtable]]. For references, a failed cast throws `std::bad_cast` instead of returning null.\n\nThe check has a run-time cost and frequent downcasting often hints that a [[virtual-function]] would be a better design. Some projects disable RTTI entirely.\n\nUnreal compiles without standard RTTI by default and provides `Cast<T>(Obj)` for `UObject`s instead, which uses Unreal\'s own reflection data and likewise returns `nullptr` on failure.',
    example: `Enemy* e = GetTarget();
if (auto* boss = dynamic_cast<Boss*>(e)) {
    boss->Enrage();      // only if e is really a Boss
}`,
    see: ['static-cast', 'polymorphism', 'virtual-function', 'base-class'],
    reading: [cppref('dynamic_cast conversion', 'language/dynamic_cast', 'Rules for upcasts, downcasts and cross-casts, and failure behaviour for pointers vs references.')],
  },
  {
    id: 'integer-overflow',
    term: 'Integer Overflow',
    course: 'cpp',
    category: 'Types',
    short:
      'Producing an integer result outside the range of its type. For **signed** types this is undefined behaviour; for **unsigned** types the value wraps around modulo 2^N, which is well defined.',
    long:
      'If `int score` is at its maximum (2,147,483,647 for 32 bits) and you add one, the standard does not say what happens. In practice you often see a negative number, but optimisers may also assume overflow cannot happen and remove checks such as `if (x + 1 < x)`.\n\nUnsigned wrap-around is defined but can still be a logic bug: `0u - 1` is a huge number. Prevent overflow by choosing a wide enough type (`long long`, `std::int64_t`), checking before the operation, or using compiler builtins such as `__builtin_add_overflow`. UBSan (`-fsanitize=undefined`) reports signed overflow at run time.\n\nThe famous "Gandhi nuke" legend from Civilization is a (probably apocryphal) unsigned wrap-around story — a good reminder to clamp values that can go negative.',
    example: `#include <climits>

int score = INT_MAX;
score = score + 1;         // UB: signed overflow

unsigned int u = 0;
u = u - 1;                 // defined: wraps to UINT_MAX`,
    see: ['undefined-behavior', 'signedness', 'integer-type', 'sanitizer'],
    reading: [cppref('Arithmetic operators', 'language/operator_arithmetic', 'The "Overflows" section explains signed vs unsigned behaviour precisely.')],
  },
  {
    id: 'lvalue',
    term: 'lvalue',
    course: 'cpp',
    category: 'Types',
    short:
      'An expression that refers to an object with an identity — something with a name or an address that persists beyond the expression, such as a variable `hp`, `arr[2]` or `*ptr`. You can take its address with `&`.',
    long:
      'The name comes from "left value": historically, things that could appear on the left of `=`. The modern rule of thumb is "if you can take its address, it is an lvalue". (A `const` variable is an lvalue even though you cannot assign to it.)\n\nEvery expression is either an lvalue or an [[rvalue]] (more precisely, C++11 splits values into lvalues, xvalues and prvalues). The category decides which references can bind: a plain `int&` binds only to lvalues, while `const int&` binds to both.\n\nThis distinction is the foundation of [[move-semantics]]: lvalues are left alone, while rvalues — temporaries about to die — may have their resources stolen.',
    example: `int hp = 100;
hp = 90;            // hp is an lvalue
int* p = &hp;       // can take its address
int& r = hp;        // non-const ref binds to lvalue
int& bad = hp + 1;  // error: hp + 1 is an rvalue`,
    see: ['rvalue', 'reference', 'rvalue-reference', 'move-semantics'],
    reading: [cppref('Value categories', 'language/value_category', 'The full lvalue / xvalue / prvalue taxonomy with examples of each.')],
  },
  {
    id: 'rvalue',
    term: 'rvalue',
    course: 'cpp',
    category: 'Types',
    short:
      'An expression that is a temporary value or an object about to expire, such as `42`, `hp + 1`, a function returning by value, or `std::move(x)`. It has no persistent identity you can take the address of.',
    long:
      'rvalues come in two flavours: *prvalues* (pure values like literals and `a + b`) and *xvalues* ("expiring" objects, typically produced by `std::move`). Because an rvalue is about to disappear, it is safe to take its resources rather than copy them.\n\nAn [[rvalue-reference]] (`T&&`) binds only to rvalues, which is how move constructors detect "this argument is a temporary — I may steal from it". A `const T&` can also bind to an rvalue and extends the temporary\'s lifetime to match the reference.',
    example: `int a = 5 + 3;                  // 5 + 3 is an rvalue
std::string s = MakeName();     // returned temporary
std::string&& r = MakeName();   // binds to the rvalue
std::string t = std::move(s);   // std::move(s) is an xvalue`,
    see: ['lvalue', 'rvalue-reference', 'std-move', 'move-semantics'],
    reading: [cppref('Value categories', 'language/value_category', 'Explains prvalues and xvalues and how they relate to rvalues.')],
  },
  {
    id: 'type-alias',
    term: 'Type Alias',
    aliases: ['using alias', 'typedef'],
    course: 'cpp',
    category: 'Types',
    short:
      'A new name for an existing type, created with `using Name = Type;` (modern) or `typedef Type Name;` (older). It does not create a new type, just another way to refer to one.',
    long:
      'Aliases tame long types (`using Inventory = std::unordered_map<std::string, int>;`) and give domain meaning to general ones (`using EntityId = std::uint32_t;`). Changing the underlying type later then means editing one line.\n\nPrefer `using` over `typedef`: it reads left to right and can be templated (`template<typename T> using Grid = std::vector<std::vector<T>>;`), which `typedef` cannot.\n\nBecause an alias is not a distinct type, `EntityId` and `std::uint32_t` are fully interchangeable — the compiler will not stop you mixing them up. Wrap the value in a small `struct` if you need a truly distinct type. Unreal itself uses aliases heavily, for example `int32` is a typedef for a 32-bit integer.',
    example: `using EntityId = std::uint32_t;
using Inventory = std::unordered_map<std::string, int>;

template <typename T>
using Grid = std::vector<std::vector<T>>;

Grid<int> heightMap;`,
    see: ['type', 'using-directive', 'class-template', 'fixed-width-integer'],
    reading: [cppref('Type alias, alias template', 'language/type_alias', 'Syntax for using-aliases and alias templates.')],
  },
  // ------------------------------------------------------------ Operators
  {
    id: 'precedence',
    term: 'Operator Precedence',
    course: 'cpp',
    category: 'Operators',
    short:
      'The rules that decide which operators bind tighter when several appear in one expression without parentheses — `*` before `+`, comparisons before `&&`, `&&` before `||`, assignment last.',
    long:
      'Precedence decides *grouping*, not the order in which operands are evaluated. `a + b * c` groups as `a + (b * c)`, but whether `a` or `b * c` is computed first is a separate question.\n\nSome precedences are surprising: bitwise `&` is lower than `==`, so `flags & Mask == 0` means `flags & (Mask == 0)`. `<<` is higher than `&` and comparison, which bites when printing: `std::cout << a & b;` does not do what it looks like.\n\nWhen in doubt, add parentheses. They cost nothing and make intent obvious to the next reader.',
    example: `int x = 2 + 3 * 4;          // 14, not 20
bool ok = hp > 0 && !stunned; // > and ! before &&
if ((flags & Burning) != 0)   // parentheses needed!
    TakeFireDamage();`,
    see: ['associativity', 'operator', 'bitwise-operator', 'short-circuit-evaluation'],
    reading: [cppref('C++ operator precedence', 'language/operator_precedence', 'The complete precedence table; worth bookmarking.')],
  },
  {
    id: 'associativity',
    term: 'Associativity',
    course: 'cpp',
    category: 'Operators',
    short:
      'The rule for grouping operators of the *same* precedence: most binary operators are left-to-right (`a - b - c` is `(a - b) - c`), while assignment and unary operators are right-to-left (`a = b = c` is `a = (b = c)`).',
    long:
      'Associativity matters for non-commutative operators: `100 - 10 - 5` is `85` because subtraction groups left to right. Right-to-left assignment is what makes chained assignment work: `x = y = 0;` sets `y` first and then assigns the result to `x`.\n\nLike precedence, associativity is about grouping, not evaluation order. `f() - g() - h()` groups as `(f() - g()) - h()`, but the three calls may still happen in any order.',
    example: `int a = 100 - 10 - 5;   // (100 - 10) - 5 == 85
int x, y;
x = y = 0;              // x = (y = 0)
int n = -  -5;          // unary minus, right to left: 5`,
    see: ['precedence', 'operator', 'expression'],
    reading: [cppref('C++ operator precedence', 'language/operator_precedence', 'The table lists the associativity of each precedence level.')],
  },
  {
    id: 'short-circuit-evaluation',
    term: 'Short-Circuit Evaluation',
    course: 'cpp',
    category: 'Operators',
    short:
      '`&&` and `||` evaluate their left operand first and skip the right operand when the result is already decided: `false && x` and `true || x` never evaluate `x`.',
    long:
      'Short-circuiting is a feature you rely on daily: `if (target != nullptr && target->IsAlive())` is safe precisely because the dereference only happens when the pointer is non-null. Swapping the operands would crash on a null target.\n\nIt also means side effects on the right may not happen: in `if (hp > 0 || Respawn())`, `Respawn()` is only called when `hp <= 0`. Keep side effects out of conditions to avoid surprises.\n\nOverloaded `operator&&` and `operator||` lose short-circuiting (both sides are always evaluated), which is why you should almost never overload them. Bitwise `&` and `|` never short-circuit either.',
    example: `if (target != nullptr && target->IsAlive()) {
    Attack(*target);   // safe: checked first
}
// Crash if target is null — wrong order:
// if (target->IsAlive() && target != nullptr)`,
    see: ['bool-type', 'if-statement', 'precedence', 'null-pointer'],
    reading: [cppref('Logical operators', 'language/operator_logical', 'Covers &&, || and ! including short-circuit guarantees and sequencing.')],
  },
  {
    id: 'bitwise-operator',
    term: 'Bitwise Operator',
    course: 'cpp',
    category: 'Operators',
    short:
      'Operators that work on the individual bits of integers: `&` (AND), `|` (OR), `^` (XOR), `~` (NOT), `<<` (shift left) and `>>` (shift right).',
    long:
      'Their classic use is packing many on/off flags into one integer: `flags |= Poisoned;` sets a bit, `flags &= ~Poisoned;` clears it, `flags ^= Poisoned;` toggles it, and `(flags & Poisoned) != 0` tests it. Shifting left by `n` multiplies by 2^n for non-negative values.\n\nUse unsigned types for bit manipulation. Shifting by a negative amount or by at least the bit width is undefined behaviour, and before C++20 left-shifting negative values was undefined too. Remember that `&` and `|` have *lower* precedence than `==`, so parenthesise tests.\n\nUnreal uses bit flags widely, and `UENUM(meta = (Bitflags))` plus `ENUM_CLASS_FLAGS` let you use `|` and `&` on scoped enums.',
    example: `enum Status : unsigned {
    Poisoned = 1u << 0,   // 0b001
    Burning  = 1u << 1,   // 0b010
    Frozen   = 1u << 2,   // 0b100
};
unsigned flags = Poisoned | Frozen;   // 0b101
bool burning = (flags & Burning) != 0; // false
flags &= ~Poisoned;                   // clear: 0b100`,
    see: ['enum', 'precedence', 'signedness', 'operator'],
    reading: [cppref('Arithmetic operators', 'language/operator_arithmetic', 'The bitwise logic and shift sections define each operator and its UB cases.')],
  },
  {
    id: 'integer-division',
    term: 'Integer Division',
    course: 'cpp',
    category: 'Operators',
    short:
      'Dividing two integers produces an integer: the fractional part is discarded, rounding toward zero. `7 / 2` is `3` and `-7 / 2` is `-3`.',
    long:
      'This catches everyone at least once: `double avg = total / count;` with two `int`s divides first (dropping the fraction) and only then converts to `double`. Convert one operand first: `static_cast<double>(total) / count`.\n\nDividing an integer by zero is [[undefined-behavior]] — usually a crash, but not guaranteed. So is `INT_MIN / -1`, which overflows. Always check divisors that come from data or player input.',
    example: `int total = 7, count = 2;
double wrong = total / count;                     // 3.0
double right = static_cast<double>(total) / count; // 3.5
int neg = -7 / 2;                                 // -3`,
    see: ['modulo', 'implicit-conversion', 'static-cast', 'undefined-behavior'],
    reading: [cppref('Arithmetic operators', 'language/operator_arithmetic', 'See "Multiplicative operators" for truncation and division-by-zero rules.')],
  },
  {
    id: 'modulo',
    term: 'Modulo (%)',
    aliases: ['remainder', '%'],
    course: 'cpp',
    category: 'Operators',
    short:
      'The `%` operator gives the remainder of integer division: `17 % 5` is `2`. It only works on integers; use `std::fmod` for floating-point values.',
    long:
      'Modulo is perfect for cycling: `(index + 1) % size` wraps back to `0` after the last element, and `n % 2 == 0` tests for even numbers.\n\nThe sign of the result follows the left operand (because division truncates toward zero), so `-7 % 3` is `-1`, not `2`. To get a non-negative index when the value can be negative, use `((i % n) + n) % n`. As with division, `% 0` is undefined behaviour.',
    example: `int next = (current + 1) % playerCount; // wraps around
bool even = (turn % 2 == 0);
int r = -7 % 3;                 // -1 (sign of left side)
double f = std::fmod(7.5, 2.0); // 1.5`,
    see: ['integer-division', 'operator', 'loop'],
  },
  {
    id: 'increment-operator',
    term: 'Increment / Decrement',
    aliases: ['++', '--', 'pre-increment', 'post-increment'],
    course: 'cpp',
    category: 'Operators',
    short:
      '`++` adds one and `--` subtracts one. The prefix form `++i` changes the variable and yields the new value; the postfix form `i++` changes it but yields the *old* value.',
    long:
      'Used as a standalone statement (`++i;` or `i++;`) both do the same thing. The difference only shows when the result is used: `int a = i++;` stores the old value, `int b = ++i;` the new one.\n\nFor class types such as iterators, postfix must make a copy of the old value, so `++it` can be slightly cheaper. Many style guides (including Unreal\'s code) therefore default to prefix.\n\nModifying the same variable twice in one expression, as in `i = i++ + 1;`, used to be undefined behaviour; C++17 defined some cases, but such code is still confusing — avoid it.',
    example: `int i = 5;
int a = i++;   // a == 5, i == 6
int b = ++i;   // b == 7, i == 7
for (auto it = v.begin(); it != v.end(); ++it) { }`,
    see: ['operator', 'loop', 'iterator', 'expression'],
    reading: [cppref('Increment/decrement operators', 'language/operator_incdec', 'Prefix vs postfix semantics and how to overload both.')],
  },
  {
    id: 'ternary-operator',
    term: 'Conditional (Ternary) Operator',
    aliases: ['?:', 'ternary'],
    course: 'cpp',
    category: 'Operators',
    short:
      '`condition ? a : b` evaluates to `a` if the condition is true, otherwise `b`. It is an expression, so it can initialise a variable — unlike an `if` statement.',
    long:
      'It is ideal for short choices: `const int dmg = crit ? base * 2 : base;` lets `dmg` stay `const`. Only the chosen branch is evaluated.\n\nBoth branches must have compatible types, and the result has their common type: `true ? 1 : 2.5` is a `double` (1.0). Nested ternaries quickly become unreadable; switch to `if`/`else` or a small function when there are more than two outcomes. Because of its low precedence, wrap the whole thing in parentheses when printing it with `<<`.',
    example: `const int dmg = isCritical ? base * 2 : base;
std::cout << (hp > 0 ? "Alive" : "Dead") << '\\n';`,
    see: ['if-statement', 'expression', 'precedence'],
    reading: [cppref('Other operators', 'language/operator_other', 'The conditional operator section covers how the result type is determined.')],
  },
  // ------------------------------------------------------------ Strings
  {
    id: 'std-string',
    term: 'std::string',
    course: 'cpp',
    category: 'Strings',
    short:
      'The standard library\'s owning, resizable string of `char`s (from `<string>`). It manages its own memory and supports `+`, `==`, `size()`, `substr()`, `find()` and much more.',
    long:
      'Unlike a [[c-string]], a `std::string` knows its length, grows automatically, and frees its memory in its destructor — you never call `new` or `delete`. Comparison with `==` compares contents, not addresses.\n\nMost implementations use the *small string optimisation* (SSO): short strings (around 15 characters) are stored inside the object itself, avoiding a heap allocation. Longer strings allocate, so building strings in a hot loop can be slow; `reserve()` and `+=` help.\n\n`size()` counts bytes, not visible characters, which matters for UTF-8 text. In Unreal the equivalent is `FString` (UTF-16 `TCHAR`s), alongside `FName` for fast identifiers and `FText` for localised display text.',
    example: `#include <string>

std::string name = "Aria";
name += " the Brave";
std::cout << name.size() << '\\n';         // 14
if (name.find("Brave") != std::string::npos) {
    std::cout << name.substr(0, 4) << '\\n'; // Aria
}`,
    see: ['string-view', 'c-string', 'string-literal', 'raii'],
    reading: [cppref('std::basic_string', 'string/basic_string', 'Every member function with complexity guarantees; std::string is basic_string<char>.')],
  },
  {
    id: 'string-view',
    term: 'std::string_view',
    course: 'cpp',
    category: 'Strings',
    short:
      'A lightweight, non-owning, read-only view of a sequence of characters (C++17, `<string_view>`): just a pointer and a length. Ideal for function parameters that only read text.',
    long:
      'A `std::string_view` parameter accepts a `std::string`, a string literal or a `char` buffer without copying or allocating anything, which makes it cheaper than `const std::string&` when callers pass literals.\n\nBecause it does not own the characters, it must not outlive them. Returning a `string_view` to a local string, or storing a view of a temporary (`std::string_view v = GetName();` where `GetName` returns a `std::string` by value), leaves it dangling — undefined behaviour. It is also not guaranteed to be null-terminated, so do not pass `.data()` to C functions expecting a C-string.\n\nUnreal\'s closest equivalent is `FStringView`.',
    example: `#include <string_view>

void Greet(std::string_view name) {
    std::cout << "Hello, " << name << '\\n';
}
Greet("Aria");                 // no allocation
std::string s = "Bram";
Greet(s);                      // no copy`,
    see: ['std-string', 'dangling-reference', 'const-reference', 'c-string'],
    reading: [cppref('std::basic_string_view', 'string/basic_string_view', 'Members, plus the notes on lifetime and null termination.')],
  },
  {
    id: 'c-string',
    term: 'C-Style String',
    aliases: ['char array', 'const char*'],
    course: 'cpp',
    category: 'Strings',
    short:
      'A string stored as an array of `char` ending with a null terminator `\'\\0\'`, usually handled through a `const char*`. String literals are C-strings.',
    long:
      'C-strings come from C, where there is no string class. Their length is not stored — functions like `std::strlen` walk until they find `\'\\0\'` — and they cannot grow, so copying into a fixed buffer that is too small overflows it. Buffer overflows from functions like `strcpy` and `gets` have caused countless security bugs.\n\n`==` on two `const char*` compares *addresses*, not text; use `std::strcmp` or, better, convert to `std::string`/`std::string_view`.\n\nYou still meet C-strings when calling C libraries and OS APIs; `std::string::c_str()` gives you a null-terminated pointer for exactly that purpose.',
    example: `const char* title = "Quest";     // 6 bytes incl. '\\0'
char buf[4];
// std::strcpy(buf, title);       // overflow: UB!
std::string safe = title;        // convert and relax
bool same = (title == "Quest");  // compares addresses!`,
    see: ['null-terminator', 'std-string', 'string-literal', 'array-decay'],
  },
  {
    id: 'null-terminator',
    term: 'Null Terminator',
    aliases: ["'\\0'"],
    course: 'cpp',
    category: 'Strings',
    short:
      'The character with value zero, written `\'\\0\'`, placed after the last character of a C-style string to mark where it ends.',
    long:
      'Because a C-string does not store its length, every function that processes it scans forward until it hits `\'\\0\'`. Forget the terminator and functions keep reading past the end of the buffer into unrelated memory — undefined behaviour and a classic security hole.\n\nThat is why `char name[5]` can only hold a 4-letter name, and why `sizeof("Hi")` is 3. `std::string` keeps a terminator internally too (so `c_str()` is cheap), but its length is stored separately, so it can even contain `\'\\0\'` characters in the middle.',
    example: `char name[5] = "Aria";  // 'A','r','i','a','\\0'
char bad[4] = "Aria";   // error: no room for '\\0'
std::cout << sizeof("Hi") << '\\n';  // 3`,
    see: ['c-string', 'string-literal', 'escape-sequence'],
  },
  // ------------------------------------------------------------ Control Flow
  {
    id: 'control-flow',
    term: 'Control Flow',
    course: 'cpp',
    category: 'Control Flow',
    short:
      'The order in which a program\'s statements execute. By default it runs top to bottom; `if`, `switch`, loops, function calls, `return`, `break` and exceptions change that order.',
    long:
      'Every program is built from three ideas: sequence (one statement after another), selection (choose a path with `if` or `switch`) and iteration (repeat with loops). Functions and exceptions add jumps to other code and back.\n\nA game loop is control flow at its purest: repeat forever — read input, update the world, render — until the player quits. In Unreal the engine runs that loop for you and calls your `Tick` functions each frame.',
    example: `while (running) {          // iteration
    ProcessInput();
    if (player.hp <= 0) {  // selection
        ShowGameOver();
        break;             // jump out of the loop
    }
    Render();              // sequence
}`,
    see: ['if-statement', 'loop', 'switch-statement', 'function'],
    reading: [cppref('Statements', 'language/statements', 'Selection, iteration and jump statements in one place.')],
  },
  {
    id: 'if-statement',
    term: 'if Statement',
    aliases: ['if/else'],
    course: 'cpp',
    category: 'Control Flow',
    short:
      'Runs a block of code only when a condition is true, optionally with `else if` and `else` branches for the other cases.',
    long:
      'The condition is converted to `bool`, so numbers and pointers work directly (`if (ptr)`). Since C++17 you can add an initialiser that scopes a variable to the `if`: `if (auto it = m.find(k); it != m.end()) { ... }`.\n\nClassic bugs: writing `=` instead of `==` (`if (hp = 0)` assigns and is always false; compilers warn), and a stray semicolon `if (x); { ... }`, which makes the block run unconditionally. Always using braces, even for one line, prevents the "dangling else" and "added a second line" mistakes.\n\n`if constexpr` (C++17) chooses a branch at compile time, which is mainly useful in templates.',
    example: `if (hp <= 0) {
    Die();
} else if (hp < 25) {
    PlayLowHealthWarning();
} else {
    Regenerate();
}
if (auto it = loot.find("gold"); it != loot.end()) {
    coins += it->second;
}`,
    see: ['control-flow', 'switch-statement', 'ternary-operator', 'bool-type'],
    reading: [cppref('if statement', 'language/if', 'Covers if with initialiser, if constexpr and if consteval.')],
  },
  {
    id: 'switch-statement',
    term: 'switch Statement',
    course: 'cpp',
    category: 'Control Flow',
    short:
      'Selects one of several `case` labels by comparing an integer or enum value against compile-time constants, with an optional `default` for everything else.',
    long:
      'A `switch` is clearer than a long `if`/`else if` chain when you branch on one value, and compilers can turn it into a fast jump table. The cases must be constant integral or enum values — you cannot switch on a `std::string`.\n\nEach case runs until a `break` (or `return`); without one, execution [[fallthrough|falls through]] into the next case. Switching over an `enum class` without a `default` lets the compiler warn you when you add a new enumerator and forget to handle it (`-Wswitch`, part of `-Wall`).\n\nTo declare a variable inside a case, wrap that case\'s code in braces, otherwise the jump to later labels may skip its initialisation and the code will not compile.',
    example: `switch (state) {
case State::Idle:
    PlayIdle();
    break;
case State::Running: {
    const float speed = GetSpeed();  // braces for locals
    Move(speed);
    break;
}
default:
    break;
}`,
    see: ['fallthrough', 'enum-class', 'if-statement', 'break-continue'],
    reading: [cppref('switch statement', 'language/switch', 'Rules for case labels, fallthrough and declarations inside a switch.')],
  },
  {
    id: 'fallthrough',
    term: 'Fallthrough',
    course: 'cpp',
    category: 'Control Flow',
    short:
      'In a `switch`, when a `case` has no `break`, execution continues straight into the next `case`\'s code. Mark intentional fallthrough with `[[fallthrough]];`.',
    long:
      'Fallthrough is occasionally handy — several labels sharing one block (`case \'a\': case \'A\':`) is the common, harmless form. But an *accidental* missing `break` is a classic bug where two cases\' actions both run.\n\nThe C++17 attribute `[[fallthrough]];` documents that the fall into the next case is deliberate and silences the compiler warning (`-Wimplicit-fallthrough`, enabled by `-Wextra` in GCC), so real mistakes still get flagged.',
    example: `switch (difficulty) {
case Difficulty::Hard:
    SpawnElites();
    [[fallthrough]];        // intentional
case Difficulty::Normal:
    SpawnGrunts();
    break;
case Difficulty::Easy:
    SpawnFewGrunts();
    break;                  // forget this and Easy ...
}`,
    see: ['switch-statement', 'attribute', 'break-continue'],
    reading: [cppref('C++ attribute: fallthrough', 'language/attributes/fallthrough', 'Where [[fallthrough]] may appear and what it means.')],
  },
  {
    id: 'loop',
    term: 'Loop',
    aliases: ['for loop', 'while loop', 'do-while'],
    course: 'cpp',
    category: 'Control Flow',
    short:
      'A statement that repeats a block of code: `for` (counted loops), `while` (repeat while a condition holds), `do ... while` (runs at least once), and the [[range-based-for]] for containers.',
    long:
      'Pick the loop that matches the intent: `for (int i = 0; i < n; ++i)` when you need an index, range-based `for` to visit every element, `while` when you do not know in advance how many iterations you need, and `do`/`while` when the body must run at least once (such as a "play again?" prompt).\n\nThe most common loop bugs are off-by-one errors (`<=` instead of `<`), modifying a container while iterating over it ([[iterator-invalidation]]), and a condition that never becomes false ([[infinite-loop]]).\n\nIn Unreal you must never block in a loop waiting for something to happen during gameplay — the whole game freezes. Spread work across frames with `Tick` or timers instead.',
    example: `for (int i = 0; i < 3; ++i) {
    SpawnEnemy(i);
}
while (hp > 0) {
    hp -= poison;
}
char again;
do {
    PlayRound();
    std::cin >> again;
} while (again == 'y');`,
    see: ['range-based-for', 'break-continue', 'infinite-loop', 'iterator'],
    reading: [cppref('for loop', 'language/for', 'The init-statement, condition and iteration-expression of the classic for loop.')],
  },
  {
    id: 'range-based-for',
    term: 'Range-Based for',
    aliases: ['for-each loop', 'range-for'],
    course: 'cpp',
    category: 'Control Flow',
    short:
      '`for (declaration : range)` visits every element of a container, array or other range in order, without managing indices or iterators: `for (const auto& e : enemies)`.',
    long:
      'It works with anything that has `begin()` and `end()`, including arrays, standard containers, `std::string`, initializer lists and views. Behind the scenes the compiler writes the iterator loop for you.\n\nChoose the element declaration carefully: `auto e` copies each element (fine for `int`, wasteful for big objects), `auto& e` lets you modify elements in place, and `const auto& e` reads without copying.\n\nDo not add or remove elements of the container inside the loop — that can invalidate the hidden iterators. Unreal\'s `TArray` supports range-based for too, and even asserts in development builds if you resize the array during the loop.',
    example: `std::vector<int> hp{100, 80, 60};
for (int& h : hp) {          // modify in place
    h += 10;
}
for (const auto& name : names) {  // read, no copies
    std::cout << name << '\\n';
}`,
    see: ['loop', 'iterator', 'auto', 'iterator-invalidation'],
    reading: [cppref('Range-based for loop', 'language/range-for', 'The exact code the compiler generates and the lifetime rules for the range expression.')],
  },
  {
    id: 'break-continue',
    term: 'break and continue',
    course: 'cpp',
    category: 'Control Flow',
    short:
      '`break` exits the innermost enclosing loop or `switch` immediately; `continue` skips the rest of the current loop iteration and moves on to the next one.',
    long:
      '`break` is perfect when you have found what you were looking for; `continue` keeps the main logic unindented by skipping uninteresting elements early ("guard clauses").\n\nBoth affect only the *innermost* loop. To leave nested loops at once, move them into a function and `return`, or use a flag — C++ has no labelled break. In a `for` loop, `continue` still runs the increment expression.',
    example: `for (const Enemy& e : enemies) {
    if (!e.IsAlive()) {
        continue;            // skip dead enemies
    }
    if (e.IsBoss()) {
        target = &e;
        break;               // found it, stop looking
    }
}`,
    see: ['loop', 'switch-statement', 'control-flow'],
    reading: [cppref('break statement', 'language/break', 'Which statement break terminates, with examples in loops and switches.')],
  },
  {
    id: 'infinite-loop',
    term: 'Infinite Loop',
    course: 'cpp',
    category: 'Control Flow',
    short:
      'A loop whose condition never becomes false, so it repeats forever. Sometimes intentional (`while (true)` with a `break` inside), often a bug that freezes the program.',
    long:
      'Intentional infinite loops are common in game loops and servers: `while (true) { ... if (quit) break; }`. Accidental ones usually come from forgetting to update the loop variable, using the wrong comparison, or an unsigned counter that can never go below zero (`for (unsigned i = 10; i >= 0; --i)`).\n\nA subtle C++ rule: an infinite loop that has no observable side effects (no I/O, no `volatile` or atomic access) is undefined behaviour, and the compiler may assume it terminates (C++26 exempts trivial loops such as `while (true) {}`).\n\nIn Unreal, an infinite loop on the game thread hangs the editor; the engine may eventually trigger a "hang detected" crash. If you need to wait, use timers or latent actions instead.',
    example: `while (true) {               // intentional
    if (ProcessInput() == Input::Quit) break;
    Update();
}

for (unsigned i = 10; i >= 0; --i) { }  // bug: never ends`,
    see: ['loop', 'break-continue', 'signedness', 'undefined-behavior'],
  },
  // ------------------------------------------------------------ Functions
  {
    id: 'function',
    term: 'Function',
    course: 'cpp',
    category: 'Functions',
    short:
      'A named, reusable block of code that takes zero or more [[parameter|parameters]], performs a task, and optionally returns a value: `int Add(int a, int b) { return a + b; }`.',
    long:
      'Functions let you name an idea (`ApplyDamage`, `IsGameOver`), write it once and call it from many places. Small, well-named functions are the single biggest readability win in any codebase.\n\nA function has a *signature* — its name and parameter types — which the compiler uses for [[function-overloading]] and the linker uses to find its definition. The return type is written first, or after the parameters with the trailing syntax `auto F() -> int`.\n\nIn C++ a function must be [[declaration|declared]] before it is called. In Unreal, functions you want to call from Blueprints or replicate over the network are marked with `UFUNCTION()`.',
    example: `int ApplyDamage(int hp, int damage) {
    const int result = hp - damage;
    return result < 0 ? 0 : result;
}

int left = ApplyDamage(100, 30);   // 70`,
    see: ['parameter', 'return-value', 'declaration', 'call-stack'],
    reading: [cppref('Functions', 'language/functions', 'Overview of function declarations, definitions, overloading and calls.')],
  },
  {
    id: 'parameter',
    term: 'Parameter',
    aliases: ['formal parameter'],
    course: 'cpp',
    category: 'Functions',
    short:
      'A variable declared in a function\'s parameter list, such as `damage` in `void Hit(int damage)`. It receives the value of the corresponding [[argument]] when the function is called.',
    long:
      'Parameters behave like local variables that are initialised from the arguments. How they are initialised depends on their type: a plain `int damage` gets a copy ([[pass-by-value]]), while `int& hp` refers to the caller\'s object ([[pass-by-reference]]).\n\nA useful rule of thumb: pass cheap types (`int`, `float`, small structs, `std::string_view`) by value, larger read-only objects by `const&`, and use non-`const` references only when the function is meant to modify the caller\'s object.',
    example: `// hp and damage are parameters
void Hit(int& hp, int damage) {
    hp -= damage;
}`,
    see: ['argument', 'pass-by-value', 'pass-by-reference', 'default-argument'],
  },
  {
    id: 'argument',
    term: 'Argument',
    aliases: ['actual parameter'],
    course: 'cpp',
    category: 'Functions',
    short:
      'The value or expression you pass to a function when calling it, such as `30` in `Hit(hp, 30)`. Each argument initialises the matching [[parameter]].',
    long:
      'Arguments are matched to parameters by position. If the types differ, implicit conversions may apply — `Hit(hp, 2.9)` would convert `2.9` to `2` for an `int` parameter, with a warning if you enable `-Wconversion`.\n\nThe order in which arguments are evaluated is unspecified: in `Log(Next(), Next())` you cannot know which call runs first. Avoid arguments with side effects that depend on each other.',
    example: `int hp = 100;
Hit(hp, 30);             // arguments: hp and 30
Hit(hp, baseDmg * 2);    // any expression works`,
    see: ['parameter', 'function', 'implicit-conversion'],
  },
  {
    id: 'return-value',
    term: 'Return Value',
    course: 'cpp',
    category: 'Functions',
    short:
      'The result a function sends back to its caller with a `return` statement. Its type is the function\'s return type; `void` functions return nothing.',
    long:
      '`return` ends the function immediately and, for non-`void` functions, provides the value. Flowing off the end of a non-`void` function (other than `main`) without returning is [[undefined-behavior]] — compilers warn with `-Wreturn-type`.\n\nReturning objects by value is efficient in modern C++ thanks to [[copy-elision]] and move semantics, so prefer `std::vector<Item> GetLoot()` over output parameters. To return several values, return a `struct`, a `std::pair`/`std::tuple` (and unpack it with [[structured-binding|structured bindings]]), or `std::optional` when there may be no result.\n\nNever return a reference or pointer to a local variable: it is destroyed when the function returns, leaving a dangling reference.',
    example: `int Clamp(int v, int lo, int hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
}

int& Bad() { int x = 5; return x; }  // dangling!`,
    see: ['function', 'void', 'copy-elision', 'dangling-reference'],
  },
  {
    id: 'void',
    term: 'void',
    course: 'cpp',
    category: 'Functions',
    short:
      'A type meaning "no value". As a return type it means the function returns nothing; `void*` is a pointer to memory of unknown type.',
    long:
      'A `void` function may use a bare `return;` to exit early. You cannot declare a variable of type `void`.\n\n`void*` can point to any object but cannot be dereferenced until you cast it back to the right type, which loses type safety; it is mostly found in C APIs. In C++, templates and `std::any`/`std::variant` are safer alternatives.\n\nWriting `void` in an empty parameter list, `int F(void)`, is a C habit; in C++ `int F()` already means "no parameters".',
    example: `void PrintScore(int score) {
    if (score < 0) {
        return;              // early exit, no value
    }
    std::cout << score << '\\n';
}`,
    see: ['function', 'return-value', 'pointer'],
  },
  {
    id: 'call-stack',
    term: 'Call Stack',
    course: 'cpp',
    category: 'Functions',
    short:
      'The chain of currently active function calls: `main` called `RunGame`, which called `Update`, which called `ApplyDamage`. Each active call has a [[stack-frame]] on the stack.',
    long:
      'When a function is called, a new frame is pushed; when it returns, the frame is popped and execution resumes in the caller. This last-in, first-out structure is what lets functions call other functions — and themselves, in [[recursion]].\n\nWhen your program crashes, the debugger shows the call stack (a *stack trace* or *backtrace*). Reading it from the top tells you exactly which sequence of calls led to the crash — usually the fastest way to find a bug. Unreal\'s crash reporter shows the same information.',
    example: `void ApplyDamage() { /* crash here */ }
void Update()      { ApplyDamage(); }
int main()         { Update(); }
// Call stack at the crash:
//   ApplyDamage()
//   Update()
//   main()`,
    see: ['stack-frame', 'stack-memory', 'recursion', 'debugger'],
  },
  {
    id: 'stack-frame',
    term: 'Stack Frame',
    aliases: ['activation record'],
    course: 'cpp',
    category: 'Functions',
    short:
      'The block of stack memory created for one function call, holding its parameters, local variables and the return address. It is freed automatically when the function returns.',
    long:
      'Creating a frame is extremely cheap — typically just moving the stack pointer — which is why local variables are fast. The flip side is that everything in the frame dies when the function returns; any pointer or reference to a local becomes dangling.\n\nFrames for big local arrays can exhaust the limited stack space (often 1–8 MB), causing a [[stack-overflow]]. Large or long-lived data belongs on the [[heap-memory|heap]], for example inside a `std::vector`.',
    example: `int Square(int x) {      // frame: x, return address
    int result = x * x;  // frame: result
    return result;
}                        // frame popped here`,
    see: ['call-stack', 'stack-memory', 'lifetime', 'dangling-reference'],
  },
  {
    id: 'pass-by-value',
    term: 'Pass by Value',
    course: 'cpp',
    category: 'Functions',
    short:
      'Passing an argument by copying it into the parameter. The function works on its own copy, so changes inside do not affect the caller\'s variable.',
    long:
      'Pass by value is the default and is ideal for small, cheap-to-copy types like `int`, `float`, enums, pointers and `std::string_view`. It is also the simplest to reason about, since the function cannot accidentally modify the caller\'s data.\n\nFor large objects (`std::vector`, `std::string`, big structs) copying can be expensive, so pass them by [[const-reference]] instead. A modern exception: when a function will store its own copy anyway (a "sink" parameter), taking it by value and then `std::move`-ing it is idiomatic.',
    example: `void Heal(int hp) {      // hp is a copy
    hp += 50;
}
int playerHp = 10;
Heal(playerHp);
// playerHp is still 10`,
    see: ['pass-by-reference', 'const-reference', 'parameter', 'copy-constructor'],
  },
  {
    id: 'pass-by-reference',
    term: 'Pass by Reference',
    course: 'cpp',
    category: 'Functions',
    short:
      'Passing an argument through a reference parameter (`T&`), so the function works directly on the caller\'s object without copying it — and can modify it.',
    long:
      'Use a non-`const` reference when modifying the caller\'s object is the point of the function, such as `void Heal(int& hp)` or filling an output buffer. Because the call site `Heal(playerHp)` looks identical to pass by value, name such functions clearly.\n\nA non-`const` lvalue reference cannot bind to a temporary: `Heal(10)` will not compile. For read-only access to large objects, use a [[const-reference]] instead.\n\nUnreal often uses non-`const` references for output parameters (e.g. `FHitResult& OutHit`), conventionally prefixed with `Out`.',
    example: `void Heal(int& hp) {     // hp refers to the caller's int
    hp += 50;
}
int playerHp = 10;
Heal(playerHp);
// playerHp is now 60`,
    see: ['pass-by-value', 'const-reference', 'reference', 'parameter'],
    reading: [cppref('Reference declaration', 'language/reference', 'How references bind, and why non-const lvalue references cannot bind to temporaries.')],
  },
  {
    id: 'const-reference',
    term: 'const Reference',
    aliases: ['const&', 'reference to const'],
    course: 'cpp',
    category: 'Functions',
    short:
      'A reference that allows read-only access to an object, written `const T&`. It is the standard way to pass large objects to functions without copying them.',
    long:
      '`void Print(const std::vector<Item>& items)` gets direct access to the caller\'s vector — no copy, no allocation — and the compiler guarantees the function cannot modify it.\n\nUnlike a plain `T&`, a `const T&` can bind to temporaries and literals: `Print(MakeItems())` works. Binding a local `const&` directly to a temporary even extends the temporary\'s lifetime to match the reference.\n\nFor small types like `int` or `float`, pass by value instead: the reference (really a hidden pointer) is no cheaper and adds an indirection. In Unreal you will see `const FString&`, `const FVector&` and `const TArray<T>&` parameters everywhere.',
    example: `void PrintNames(const std::vector<std::string>& names) {
    for (const auto& n : names) {
        std::cout << n << '\\n';
    }
    // names.push_back("x");  // error: read-only
}`,
    see: ['pass-by-reference', 'pass-by-value', 'const', 'reference'],
  },
  {
    id: 'function-overloading',
    term: 'Function Overloading',
    course: 'cpp',
    category: 'Functions',
    short:
      'Defining several functions with the same name but different parameter lists, such as `Print(int)` and `Print(const std::string&)`. The compiler picks the right one from the arguments.',
    long:
      'Overloading lets one intuitive name cover several related operations. The overloads must differ in the number or types of parameters; differing only in return type is not allowed.\n\nThe compiler chooses via [[overload-resolution]], and ambiguity is a compile error — for example `Print(5L)` when only `Print(int)` and `Print(double)` exist, since both need a conversion.\n\nUnder the hood each overload gets a unique *mangled* name that encodes its parameter types, which is how the linker tells them apart. Note that `UFUNCTION`s in Unreal cannot be overloaded, because Blueprints identify functions by name alone.',
    example: `void Print(int value)                { /* ... */ }
void Print(double value)             { /* ... */ }
void Print(const std::string& text)  { /* ... */ }

Print(42);         // Print(int)
Print(3.14);       // Print(double)
Print("Victory");  // Print(const std::string&)`,
    see: ['overload-resolution', 'function', 'default-argument', 'operator-overloading'],
    reading: [cppref('Overload resolution', 'language/overload_resolution', 'How candidate functions are ranked by the conversions their arguments need.')],
  },
  {
    id: 'overload-resolution',
    term: 'Overload Resolution',
    course: 'cpp',
    category: 'Functions',
    short:
      'The compile-time process of choosing which overloaded function a call refers to, by ranking how well each candidate\'s parameters match the arguments.',
    long:
      'Roughly, the compiler prefers an exact match, then a promotion (e.g. `char` to `int`), then a standard conversion (e.g. `int` to `double`), then a user-defined conversion (through a constructor or conversion operator). Non-template functions beat templates when they match equally well.\n\nIf no candidate is viable you get "no matching function"; if two are equally good you get "ambiguous call". Both are compile-time errors, so overload resolution never costs anything at run time.\n\nA classic surprise: with `void F(bool)` and `void F(const std::string&)`, the call `F("text")` picks the `bool` overload, because pointer-to-bool is a standard conversion while constructing a `std::string` is a user-defined one.',
    example: `void F(bool b);
void F(const std::string& s);

F("hello");   // calls F(bool)! const char* -> bool wins
F(std::string{"hello"});  // calls F(const std::string&)`,
    see: ['function-overloading', 'implicit-conversion', 'template-argument-deduction'],
    reading: [cppref('Overload resolution', 'language/overload_resolution', 'The ranking of implicit conversion sequences, with many worked examples.')],
  },
  {
    id: 'default-argument',
    term: 'Default Argument',
    course: 'cpp',
    category: 'Functions',
    short:
      'A value given to a parameter in the function declaration, used when the caller omits that argument: `void Spawn(int count = 1);` lets you call `Spawn()`.',
    long:
      'Defaults must be at the end of the parameter list: once a parameter has a default, all parameters after it need one too. Callers can only omit arguments from the right.\n\nPut the default in the declaration (usually the header), not again in the definition — repeating it is an error. The default is evaluated at the call site each time.\n\nDefaults on [[virtual-function|virtual functions]] are a trap: they are chosen from the *static* type of the pointer, not the dynamic type, so a derived override\'s different default is silently ignored when called through a base pointer. Unreal\'s `UFUNCTION`s support defaults, and Blueprints show them as pre-filled pins.',
    example: `// Header
void Spawn(int count = 1, bool elite = false);

Spawn();          // Spawn(1, false)
Spawn(5);         // Spawn(5, false)
Spawn(2, true);   // Spawn(2, true)`,
    see: ['function-overloading', 'parameter', 'declaration'],
    reading: [cppref('Default arguments', 'language/default_arguments', 'Where defaults may appear and how they interact with redeclarations and virtual functions.')],
  },
  {
    id: 'declaration',
    term: 'Declaration',
    course: 'cpp',
    category: 'Functions',
    short:
      'A statement that introduces a name and its type to the compiler — "this exists" — such as `int Add(int a, int b);` or `class Enemy;`. A declaration may or may not also be a [[definition]].',
    long:
      'The compiler needs a declaration before you can use a name, so it can check types. For a function, the declaration tells it the parameters and return type; the body can come later or live in another file.\n\nA name can be declared many times (consistently) but defined only once — the [[one-definition-rule]]. Most variable declarations are also definitions: `int score;` creates the object. `extern int score;` is a pure declaration that refers to a variable defined elsewhere.\n\nHeaders are mostly collections of declarations; the matching `.cpp` files hold the definitions.',
    example: `int Add(int a, int b);   // declaration only
class Enemy;             // declaration only (forward)
extern int highScore;    // declaration only

int Add(int a, int b) {  // declaration + definition
    return a + b;
}`,
    see: ['definition', 'forward-declaration', 'function-prototype', 'one-definition-rule'],
    reading: [cppref('Declarations', 'language/declarations', 'The general syntax of declarations and the many kinds there are.')],
  },
  {
    id: 'definition',
    term: 'Definition',
    course: 'cpp',
    category: 'Functions',
    short:
      'A declaration that fully specifies the entity: a function with its body, a class with its members, or a variable that actually allocates storage.',
    long:
      'Every definition is a declaration, but not every declaration is a definition. `int Add(int, int);` is only a declaration; adding the body `{ return a + b; }` makes it a definition. `class Enemy;` is a declaration; `class Enemy { ... };` is a definition.\n\nWhy it matters: the [[one-definition-rule]] allows only one definition of a non-inline function or variable in the whole program. Put function definitions in `.cpp` files (or mark them `inline` if they live in a header), otherwise you get "multiple definition" linker errors.',
    example: `// Definition of a class
class Enemy {
public:
    void Attack();        // member declaration
};

// Definition of the member function
void Enemy::Attack() { /* ... */ }

int highScore = 0;        // variable definition`,
    see: ['declaration', 'one-definition-rule', 'linker-error', 'source-file'],
    reading: [cppref('Definitions and ODR', 'language/definition', 'The list of declarations that are not definitions, and the ODR rules.')],
  },
  {
    id: 'forward-declaration',
    term: 'Forward Declaration',
    course: 'both',
    category: 'Functions',
    short:
      'Declaring a function or class before its full definition, such as `class Weapon;`, so you can refer to it without seeing (or `#include`-ing) the whole definition.',
    long:
      'A forward-declared class is an *incomplete type*: you can declare pointers and references to it and use it in function declarations, but you cannot create an instance, access members or use `sizeof` until the full definition is visible.\n\nIn headers, forward declarations reduce `#include`s, which speeds up builds and breaks circular dependencies (`Player.h` needs `Weapon`, `Weapon.h` needs `Player`).\n\nThis is standard practice in Unreal headers: write `class UStaticMeshComponent;` at the top and hold it as `TObjectPtr<UStaticMeshComponent>`, then include the real header only in the `.cpp`.',
    example: `// Player.h
#pragma once
class Weapon;                 // forward declaration

class Player {
    Weapon* equipped = nullptr;  // OK: pointer
    // Weapon spare;             // error: incomplete type
};`,
    see: ['declaration', 'header-file', 'include-directive', 'function-prototype'],
  },
  {
    id: 'function-prototype',
    term: 'Function Prototype',
    course: 'cpp',
    category: 'Functions',
    short:
      'A function declaration without a body, ending in a semicolon: `int Add(int a, int b);`. It tells the compiler the function\'s name, parameter types and return type.',
    long:
      'Prototypes let you call a function before its definition appears, or from another file. They are what you put in header files. Parameter names are optional in a prototype (`int Add(int, int);`), but good names document intent.\n\nThe prototype and the definition must agree exactly on parameter types. If they differ — say `int Add(int, int);` vs `int Add(long a, long b) { ... }` — you have actually declared two different overloads, and the call will fail at link time with an unresolved symbol.',
    example: `int Add(int a, int b);         // prototype

int main() {
    return Add(2, 3);           // OK: declared above
}

int Add(int a, int b) { return a + b; }`,
    see: ['declaration', 'forward-declaration', 'header-file', 'linker-error'],
  },
  {
    id: 'scope',
    term: 'Scope',
    course: 'cpp',
    category: 'Functions',
    short:
      'The region of source code where a name is visible and can be used. A variable declared inside `{ }` is only visible from its declaration to the closing brace.',
    long:
      'C++ has block scope (inside braces, including function bodies and loops), namespace scope (including the global namespace), class scope and a few others. An inner scope can *shadow* a name from an outer scope by declaring the same name — legal, but confusing, and something `-Wshadow` warns about (Unreal treats shadowing as an error).\n\nScope is about *names* at compile time; [[lifetime]] is about *objects* at run time. For local variables they line up: the object is destroyed when its scope ends, which is the basis of [[raii]].\n\nKeep scopes small: declare variables as close as possible to their first use.',
    example: `int level = 1;            // global scope
void Play() {
    int score = 0;        // block scope of Play
    for (int i = 0; i < 3; ++i) {  // i: loop scope
        int level = 2;    // shadows the global (avoid!)
    }
    // i is not visible here
}`,
    see: ['lifetime', 'namespace', 'storage-duration', 'raii'],
    reading: [cppref('Scope', 'language/scope', 'Every kind of scope and the point of declaration rules.')],
  },
  {
    id: 'lifetime',
    term: 'Lifetime',
    course: 'cpp',
    category: 'Functions',
    short:
      'The period during program execution when an object exists: from the end of its construction until the start of its destruction. Using an object outside its lifetime is undefined behaviour.',
    long:
      'A local variable lives until the end of its block; a `static` or global object lives until the program ends; a heap object lives until it is `delete`d; a temporary usually lives until the end of the full expression that created it.\n\nMost memory bugs in C++ are lifetime bugs: a pointer, reference or `string_view` that outlives the object it refers to ([[dangling-pointer]], [[dangling-reference]]). Smart pointers and [[raii]] tie lifetimes to scopes so the language manages them for you.\n\nUnreal adds garbage collection for `UObject`s: an object\'s lifetime ends some time after nothing (visible to the GC) references it, which is why raw `UObject*` members must be `UPROPERTY` to keep their targets alive.',
    example: `std::string_view name;
{
    std::string temp = "Aria";
    name = temp;        // view into temp
}                       // temp's lifetime ends here
std::cout << name;      // UB: dangling view`,
    see: ['storage-duration', 'scope', 'dangling-reference', 'raii'],
    reading: [cppref('Lifetime', 'language/lifetime', 'Exactly when lifetimes begin and end, including temporaries and lifetime extension.')],
  },
  {
    id: 'storage-duration',
    term: 'Storage Duration',
    course: 'cpp',
    category: 'Functions',
    short:
      'The category that determines how long an object\'s memory exists: *automatic* (local variables), *static* (globals and `static` variables), *dynamic* (`new`/`delete`) and *thread* (`thread_local`).',
    long:
      'Automatic storage is allocated when a block is entered and released when it exits — the stack. Static storage exists for the whole run of the program. Dynamic storage is requested and released explicitly at run time — the heap. Thread storage lasts as long as its thread.\n\nChoosing the right duration is a design decision: prefer automatic storage (fast, automatic cleanup), use dynamic storage when the size or lifetime is not known in advance (ideally via containers and smart pointers), and keep static storage for genuinely program-wide data.',
    example: `int frames = 0;                // static storage
void Update() {
    int dt = 16;               // automatic storage
    static int calls = 0;      // static storage
    auto* e = new Enemy{};     // dynamic storage
    delete e;
}
thread_local int workerId;     // thread storage`,
    see: ['lifetime', 'stack-memory', 'heap-memory', 'static-local'],
    reading: [cppref('Storage class specifiers', 'language/storage_duration', 'Storage durations and linkage, including static and thread_local.')],
  },
  {
    id: 'static-local',
    term: 'Static Local Variable',
    course: 'cpp',
    category: 'Functions',
    short:
      'A local variable declared `static` inside a function. It is initialised once, the first time control passes through its declaration, and keeps its value between calls.',
    long:
      'Static locals are handy for counters, caches and lazily-created singletons. Since C++11 their initialisation is thread-safe: if two threads hit the declaration at once, one waits for the other to finish ("magic statics").\n\nThey are effectively hidden global state, so they make functions harder to test and reason about — a function with a static counter no longer gives the same result for the same input. Use them sparingly.\n\nIn Unreal code static locals can surprise you because they survive across Play-In-Editor sessions until the module is unloaded.',
    example: `int NextId() {
    static int counter = 0;   // initialised once
    return ++counter;
}
NextId();   // 1
NextId();   // 2`,
    see: ['storage-duration', 'global-variable', 'lifetime', 'static-member'],
  },
  {
    id: 'global-variable',
    term: 'Global Variable',
    course: 'cpp',
    category: 'Functions',
    short:
      'A variable declared outside any function or class, at namespace scope. It has static storage duration and can be accessed from anywhere it is visible.',
    long:
      'Globals are zero-initialised first and then, if their initialiser is not a constant, constructed — in practice before `main` runs. Their convenience comes at a price: any code can change them, so bugs become hard to trace, and the order of initialisation of globals in *different* translation units is unspecified (the "static initialisation order fiasco").\n\nTo share a global across files, define it in one `.cpp` and declare it `extern` in a header, or (since C++17) define it `inline` in the header. Prefer `constexpr` globals for constants — they are harmless because they cannot change.\n\nUnreal discourages mutable globals; per-game state usually lives in a `GameInstance`, `GameMode` or a subsystem instead.',
    example: `// Config.h
extern int g_Difficulty;            // declaration
inline constexpr int MaxPlayers = 4; // constant: fine

// Config.cpp
int g_Difficulty = 1;               // the one definition`,
    see: ['storage-duration', 'static-local', 'one-definition-rule', 'scope'],
  },
  {
    id: 'recursion',
    term: 'Recursion',
    course: 'cpp',
    category: 'Functions',
    short:
      'A function calling itself, directly or indirectly, to solve a problem by breaking it into smaller versions of the same problem. Every recursive function needs a *base case* that stops the calls.',
    long:
      'Recursion fits naturally shaped problems: traversing trees (scene graphs, file systems, behaviour trees), flood-filling a map, or divide-and-conquer algorithms like quicksort.\n\nEach call adds a [[stack-frame]], so very deep recursion — or a missing base case — causes a [[stack-overflow]]. For deep or unbounded depth, convert to a loop with an explicit `std::vector` used as a stack.\n\nCompilers can sometimes turn tail calls into jumps (tail-call optimisation), but C++ does not guarantee it, so do not rely on it.',
    example: `int Factorial(int n) {
    if (n <= 1) {
        return 1;               // base case
    }
    return n * Factorial(n - 1); // recursive case
}`,
    see: ['call-stack', 'stack-overflow', 'stack-frame', 'function'],
  },
  {
    id: 'inline',
    term: 'inline',
    course: 'cpp',
    category: 'Functions',
    short:
      'A specifier that allows a function or variable to be defined in a header included by many translation units without breaking the One Definition Rule. It is only a weak hint to actually inline calls.',
    long:
      'Historically `inline` asked the compiler to paste the function body at each call site to avoid call overhead. Modern optimisers decide that on their own, so today the keyword\'s real meaning is about linkage: "multiple identical definitions are OK; merge them".\n\nMember functions defined inside a class body, `constexpr` functions and templates are implicitly inline, which is why they can live in headers. C++17 extended the idea to variables: `inline constexpr int MaxPlayers = 4;`.\n\nUnreal provides `FORCEINLINE`, a macro for compiler-specific "really inline this" attributes, used in performance-critical engine code.',
    example: `// MathUtils.h — included in many .cpp files
inline int Clamp(int v, int lo, int hi) {
    return v < lo ? lo : (v > hi ? hi : v);
}
inline constexpr float Gravity = 9.81f;`,
    see: ['one-definition-rule', 'header-file', 'zero-cost-abstraction', 'macro'],
    reading: [cppref('inline specifier', 'language/inline', 'What inline really guarantees, including inline variables since C++17.')],
  },
  {
    id: 'stack-overflow',
    term: 'Stack Overflow',
    course: 'cpp',
    category: 'Functions',
    short:
      'A crash that happens when the call stack runs out of space, usually from runaway recursion or very large local variables.',
    long:
      'The stack is small compared to the heap — commonly 1 MB on Windows and 8 MB on Linux for the main thread, and often less for worker threads. Each function call consumes some of it, so infinite recursion exhausts it quickly, and a local `int grid[2000][2000];` (16 MB) can blow it in one go.\n\nThe operating system typically kills the program with a segmentation fault or "stack overflow" exception. Fix it by adding or correcting the base case, converting deep recursion into a loop, or moving big data onto the heap with `std::vector`.',
    example: `int Forever(int n) {
    return Forever(n + 1);   // no base case: overflow
}

void Load() {
    int grid[2000][2000];    // ~16 MB on the stack: overflow
    std::vector<int> ok(2000 * 2000);  // heap: fine
}`,
    see: ['recursion', 'call-stack', 'stack-memory', 'heap-memory'],
  },
  // ------------------------------------------------------------ Containers
  {
    id: 'container',
    term: 'Container',
    course: 'cpp',
    category: 'Containers',
    short:
      'An object that stores a collection of other objects and manages their memory — `std::vector`, `std::array`, `std::map`, `std::unordered_map`, `std::set` and others.',
    long:
      'Standard containers share a common interface — `size()`, `empty()`, `begin()`/`end()` iterators — so algorithms and range-based `for` work with all of them. They differ in memory layout and therefore in which operations are fast: indexing, insertion in the middle, lookup by key, ordered traversal.\n\nThe practical default is `std::vector`: contiguous, cache-friendly and fast for almost everything. Reach for a map, set or other container when you need what it specifically offers.\n\nUnreal has its own container family — `TArray`, `TMap`, `TSet` — designed for the engine\'s allocators, reflection and Blueprint exposure. Their design closely mirrors the standard ones.',
    example: `std::vector<int> scores{90, 75, 82};
std::array<float, 3> position{0.f, 1.f, 0.f};
std::unordered_map<std::string, int> loot{{"gold", 50}};
std::set<std::string> visited{"Town", "Cave"};`,
    see: ['std-vector', 'std-map', 'iterator', 'big-o'],
    reading: [cppref('Containers library', 'container', 'A table of every container with its member functions side by side.')],
  },
  {
    id: 'array',
    term: 'Array',
    aliases: ['C-style array', 'built-in array'],
    course: 'cpp',
    category: 'Containers',
    short:
      'A fixed-size sequence of elements of the same type stored contiguously, declared like `int scores[5];`. Its size must be a compile-time constant and can never change.',
    long:
      'Elements are accessed with `arr[i]`, indexed from `0` to `size - 1`. There is no bounds checking: `arr[5]` on a 5-element array reads past the end — [[undefined-behavior]], and a classic source of crashes and security bugs.\n\nBuilt-in arrays cannot be copied or assigned as a whole, and they [[array-decay|decay]] to a pointer when passed to a function, losing their size. That is why modern C++ prefers [[std-array]] for fixed sizes and [[std-vector]] for dynamic sizes.\n\n`std::size(arr)` (C++17) gives the element count of a built-in array safely.',
    example: `int scores[5] = {90, 75, 82, 60, 100};
scores[0] = 95;            // first element
int last = scores[4];      // last element
// scores[5] = 1;          // UB: out of bounds
std::cout << std::size(scores) << '\\n';  // 5`,
    see: ['std-array', 'array-decay', 'contiguous-memory', 'pointer-arithmetic'],
    reading: [cppref('Array declaration', 'language/array', 'Arrays, multidimensional arrays and array-to-pointer conversion.')],
  },
  {
    id: 'std-array',
    term: 'std::array',
    course: 'cpp',
    category: 'Containers',
    short:
      'A fixed-size container (`<array>`) that wraps a built-in array: `std::array<int, 5>`. Same speed and layout, but it knows its size, can be copied and compared, and does not decay to a pointer.',
    long:
      'Because the size is part of the type, `std::array` lives wherever you put it — on the stack, inside a class — with no heap allocation. It offers `size()`, iterators, `at()` with bounds checking, and works with all standard algorithms.\n\nUse it when the number of elements is fixed at compile time: the four corners of a rectangle, RGB channels, a 3×3 tic-tac-toe board. When the size can change, use `std::vector`.\n\nUnreal\'s closest analogue is `TStaticArray`, or a `TArray` with an inline allocator (`TArray<int32, TInlineAllocator<4>>`).',
    example: `#include <array>

std::array<int, 3> hp{100, 80, 60};
std::cout << hp.size() << '\\n';    // 3
auto copy = hp;                    // copies all elements
int x = hp.at(5);                  // throws std::out_of_range`,
    see: ['array', 'std-vector', 'container', 'contiguous-memory'],
    reading: [cppref('std::array', 'container/array', 'Members and the aggregate initialisation rules for std::array.')],
  },
  {
    id: 'std-vector',
    term: 'std::vector',
    course: 'cpp',
    category: 'Containers',
    short:
      'The standard dynamic array (`<vector>`): a contiguous, resizable sequence that grows automatically as you `push_back` elements. It is the default container in C++.',
    long:
      'A vector stores its elements in one heap block. Indexing is O(1), adding or removing at the end is amortised O(1), and iterating is extremely cache-friendly. Inserting or erasing in the middle is O(n) because later elements must shift.\n\nWhen it runs out of [[capacity]], a vector allocates a bigger block (typically 1.5–2× larger), moves the elements across and frees the old block. That keeps `push_back` fast on average, but it invalidates every pointer, reference and iterator into the vector — see [[iterator-invalidation]]. Call `reserve(n)` when you know the final size.\n\n`v[i]` is unchecked (UB when out of range) while `v.at(i)` throws `std::out_of_range`. Unreal\'s `TArray` is the direct equivalent, with `Add`, `Num()`, `RemoveAt` and friends.',
    example: `#include <vector>

std::vector<std::string> party;
party.reserve(4);
party.push_back("Aria");
party.emplace_back("Bram");
std::cout << party.size() << ' ' << party[0] << '\\n';
party.pop_back();`,
    see: ['capacity', 'iterator-invalidation', 'contiguous-memory', 'emplace'],
    reading: [cppref('std::vector', 'container/vector', 'Every member with its complexity and iterator-invalidation rules.')],
  },
  {
    id: 'capacity',
    term: 'Capacity',
    course: 'cpp',
    category: 'Containers',
    short:
      'The number of elements a vector (or string) has room for before it must reallocate, as opposed to its *size*, the number of elements it currently holds. `capacity() >= size()` always.',
    long:
      'Keeping spare capacity is how `std::vector` makes `push_back` amortised O(1): most pushes just construct into already-allocated space, and only occasionally does the vector grow geometrically.\n\nIf you know how many elements you will add, `reserve(n)` allocates once up front, avoiding repeated reallocations and keeping pointers stable while you fill it. `resize(n)` is different: it changes the *size*, creating or destroying elements. `shrink_to_fit()` *requests* releasing unused capacity, but the implementation may ignore it.\n\nUnreal\'s `TArray` has the same concept: `Reserve`, `Num()` vs `Max()`, and `Shrink()`.',
    example: `std::vector<int> v;
v.reserve(100);
std::cout << v.size() << ' '       // 0
          << v.capacity() << '\\n'; // at least 100
v.resize(10);                       // size 10, all zeros`,
    see: ['std-vector', 'iterator-invalidation', 'big-o'],
  },
  {
    id: 'iterator-invalidation',
    term: 'Iterator Invalidation',
    course: 'cpp',
    category: 'Containers',
    short:
      'When modifying a container makes existing iterators, pointers or references into it unusable — for example `push_back` on a vector that reallocates. Using an invalidated iterator is undefined behaviour.',
    long:
      'Each container documents which operations invalidate what. For `std::vector`: any reallocation invalidates everything; `insert`/`erase` invalidate positions at or after the change. For `std::map`/`std::set`/`std::list`: only iterators to erased elements are invalidated. For `std::unordered_map`: a rehash invalidates iterators (but not references to elements).\n\nThe classic bug is erasing inside a range-based `for` or adding to a vector while iterating it. Use the return value of `erase` (`it = v.erase(it);`), the erase–remove idiom, or C++20\'s `std::erase_if`.\n\nUnreal has the same issue with `TArray`, and its debug checks catch modification during a ranged-for loop.',
    example: `std::vector<int> v{1, 2, 3};
int& first = v[0];
v.push_back(4);       // may reallocate...
// first = 10;        // ...UB: dangling reference

std::erase_if(v, [](int x) { return x % 2 == 0; });`,
    see: ['std-vector', 'iterator', 'capacity', 'dangling-reference'],
    reading: [cppref('Containers library', 'container', 'The "Iterator invalidation" table summarises the rules for every container.')],
  },
  {
    id: 'std-map',
    term: 'std::map',
    course: 'cpp',
    category: 'Containers',
    short:
      'An ordered associative container (`<map>`) of unique key–value pairs, kept sorted by key. Lookup, insertion and removal are O(log n).',
    long:
      'A `std::map` is typically a balanced binary search tree (red–black tree). Iterating it visits keys in sorted order, which makes it right for leaderboards by name, ordered event schedules and anything needing range queries (`lower_bound`).\n\nWatch out: `m[key]` *inserts* a default-constructed value if the key is missing, so it cannot be used on a `const` map and can silently grow the map when you only meant to read. Use `find`, `contains` (C++20) or `at` for lookups.\n\nEach element is a separate heap node, so maps are less cache-friendly than vectors. If you do not need ordering, `std::unordered_map` is usually faster. Unreal\'s `TMap` is a hash map, closer to `std::unordered_map`.',
    example: `#include <map>

std::map<std::string, int> scores{{"Bram", 70}, {"Aria", 90}};
scores["Cara"] = 85;                  // insert or update
if (auto it = scores.find("Aria"); it != scores.end()) {
    std::cout << it->second << '\\n';  // 90
}
for (const auto& [name, s] : scores) { }  // Aria, Bram, Cara`,
    see: ['std-unordered-map', 'std-set', 'std-pair', 'big-o'],
    reading: [cppref('std::map', 'container/map', 'Members, including try_emplace, insert_or_assign and contains.')],
  },
  {
    id: 'std-unordered-map',
    term: 'std::unordered_map',
    course: 'cpp',
    category: 'Containers',
    short:
      'A [[hash-table]] of unique key–value pairs (`<unordered_map>`). Lookup, insertion and removal are O(1) on average, but elements are in no particular order.',
    long:
      'It hashes each key to choose a bucket, so finding an element does not depend on how many there are — on average. With a poor hash function or many collisions, operations degrade towards O(n).\n\nIteration order is unspecified and can change after insertions (a rehash), so never rely on it — and never print an `unordered_map` in a test expecting a fixed order. Keys need a hash (`std::hash<Key>`) and `==`; for your own types you must provide them.\n\nThe same `operator[]` caveat as `std::map` applies: it inserts missing keys. Unreal\'s `TMap` and `TSet` are hash-based too; your key types implement `GetTypeHash` instead of specialising `std::hash`.',
    example: `#include <unordered_map>

std::unordered_map<std::string, int> inventory;
inventory["potion"] += 3;          // inserts 0, then adds 3
inventory.try_emplace("sword", 1);
if (inventory.contains("potion")) {  // C++20
    std::cout << inventory.at("potion") << '\\n';  // 3
}`,
    see: ['hash-table', 'std-map', 'big-o', 'iterator-invalidation'],
    reading: [cppref('std::unordered_map', 'container/unordered_map', 'Members, bucket interface, and the rehash/invalidation rules.')],
  },
  {
    id: 'std-set',
    term: 'std::set',
    course: 'cpp',
    category: 'Containers',
    short:
      'An ordered container (`<set>`) of unique values, kept sorted. Inserting a duplicate does nothing; lookup is O(log n). `std::unordered_set` is the hash-based, unordered version.',
    long:
      'Sets answer "have I seen this before?" — visited map cells, unlocked achievements, unique player names. `insert` returns a pair whose `.second` tells you whether the value was new.\n\nElements of a set are `const`: changing one in place could break the sorted order, so you erase and re-insert instead. `std::multiset` allows duplicates.\n\nUnreal\'s `TSet` is hash-based, like `std::unordered_set`.',
    example: `#include <set>

std::set<std::string> visited;
visited.insert("Town");
auto [it, added] = visited.insert("Town");  // added == false
if (visited.contains("Cave")) { /* ... */ }  // C++20
for (const auto& place : visited) { }       // sorted order`,
    see: ['std-map', 'std-unordered-map', 'hash-table', 'container'],
    reading: [cppref('std::set', 'container/set', 'Members of std::set, and links to multiset and unordered_set.')],
  },
  {
    id: 'hash-table',
    term: 'Hash Table',
    aliases: ['hash map'],
    course: 'cpp',
    category: 'Containers',
    short:
      'A data structure that stores items in an array of *buckets*, using a hash function to turn each key into a bucket index, giving average O(1) lookup, insertion and removal.',
    long:
      'A hash function maps a key (such as a string) to a number; that number modulo the bucket count selects the bucket. Two keys landing in the same bucket is a *collision*, resolved by chaining (a list per bucket) or probing nearby slots.\n\nWhen the table gets too full (its *load factor* exceeds a threshold), it allocates more buckets and *rehashes* every element — an O(n) step that happens rarely, so the average stays O(1). A good hash spreads keys evenly; a bad one turns the table into a slow list.\n\n`std::unordered_map` and `std::unordered_set` are hash tables, as are Unreal\'s `TMap` and `TSet`.',
    example: `struct GridPos { int x, y; };
bool operator==(GridPos a, GridPos b) {
    return a.x == b.x && a.y == b.y;
}
struct GridHash {
    std::size_t operator()(GridPos p) const {
        return std::hash<int>{}(p.x) * 31 + std::hash<int>{}(p.y);
    }
};
std::unordered_set<GridPos, GridHash> walls;`,
    see: ['std-unordered-map', 'big-o', 'std-set'],
  },
  {
    id: 'emplace',
    term: 'Emplace',
    aliases: ['emplace_back', 'try_emplace'],
    course: 'cpp',
    category: 'Containers',
    short:
      'Container member functions (`emplace_back`, `emplace`, `try_emplace`) that construct a new element directly inside the container from constructor arguments, instead of building a temporary and copying or moving it in.',
    long:
      '`v.push_back(Enemy{"Orc", 50})` creates a temporary `Enemy` and then moves it into the vector. `v.emplace_back("Orc", 50)` forwards the arguments to `Enemy`\'s constructor and builds the element in place.\n\nFor types that are cheap to move the difference is small, and `push_back` is often clearer. `emplace` shines for types that are expensive or impossible to move, and `try_emplace` on maps avoids constructing the value at all if the key already exists.\n\nBe careful: emplace can call `explicit` constructors, so `v.emplace_back(1000)` on a `std::vector<std::vector<int>>` silently creates a vector of 1000 zeros. Unreal\'s `TArray::Emplace` is the equivalent.',
    example: `struct Enemy {
    Enemy(std::string n, int h) : name{std::move(n)}, hp{h} {}
    std::string name;
    int hp;
};
std::vector<Enemy> enemies;
enemies.push_back(Enemy{"Orc", 50});  // temporary + move
enemies.emplace_back("Goblin", 30);   // built in place`,
    see: ['std-vector', 'move-semantics', 'constructor', 'std-map'],
    reading: [cppref('std::vector::emplace_back', 'container/vector/emplace_back', 'How arguments are forwarded and what is invalidated if reallocation happens.')],
  },
  {
    id: 'contiguous-memory',
    term: 'Contiguous Memory',
    course: 'cpp',
    category: 'Containers',
    short:
      'Elements stored back to back in one unbroken block of memory, with no gaps between them — as in arrays, `std::array`, `std::vector` and `std::string`.',
    long:
      'Contiguity means element `i` is at address `start + i * sizeof(T)`, so indexing is a single multiplication and addition, and you can pass `v.data()` to C APIs or GPU upload functions that expect a raw buffer.\n\nIt is also the key to [[cache-locality]]: when the CPU loads one element, its neighbours come along in the same cache line, so a loop over a vector runs far faster than over a linked list or map of the same size.\n\n`std::span` (C++20) is a non-owning view over any contiguous sequence — a handy parameter type that accepts arrays, `std::array` and `std::vector` alike.',
    example: `std::vector<int> v{10, 20, 30};
int* p = v.data();
// &v[1] == p + 1, &v[2] == p + 2

void Upload(std::span<const float> verts);  // any contiguous data`,
    see: ['cache-locality', 'std-vector', 'array', 'pointer-arithmetic'],
  },
  {
    id: 'cache-locality',
    term: 'Cache Locality',
    aliases: ['data locality', 'cache-friendly'],
    course: 'cpp',
    category: 'Containers',
    short:
      'How well a program\'s memory accesses reuse data already in the CPU cache. Accessing memory sequentially and close together is dramatically faster than jumping around.',
    long:
      'Main memory is slow compared to the CPU — a cache miss can cost on the order of a hundred cycles. CPUs therefore load memory in cache lines (usually 64 bytes) and prefetch ahead when you walk memory in order. Code that walks a `std::vector` sequentially benefits; code that chases pointers through a `std::list` or tree of separately allocated nodes does not.\n\nThis is why "use `std::vector` by default" is good advice even when Big-O suggests otherwise, and why game engines care about data-oriented design: storing all positions together and all velocities together lets a movement update stream through memory.\n\nUnreal\'s Mass Entity framework and Niagara particles are built around this idea.',
    example: `struct Particles {             // structure of arrays
    std::vector<float> x, y, vx, vy;
};
void Step(Particles& p, float dt) {
    for (std::size_t i = 0; i < p.x.size(); ++i) {
        p.x[i] += p.vx[i] * dt;    // streams through memory
    }
}`,
    see: ['contiguous-memory', 'std-vector', 'big-o'],
  },
  {
    id: 'big-o',
    term: 'Big-O Notation',
    aliases: ['time complexity', 'complexity'],
    course: 'cpp',
    category: 'Containers',
    short:
      'A way to describe how an algorithm\'s cost grows with input size *n*, ignoring constant factors: O(1) constant, O(log n) logarithmic, O(n) linear, O(n log n), O(n²) quadratic.',
    long:
      'Big-O tells you how code *scales*. Finding an item in an unsorted vector is O(n) — twice the items, twice the work. A `std::map` lookup is O(log n), and `std::unordered_map` is O(1) on average. Sorting is O(n log n). Two nested loops over the same data are O(n²), which is fine for 100 enemies (10,000 checks) but painful for 10,000 (100 million).\n\nThe standard library specifies complexity guarantees for its containers and algorithms, so you can reason about performance before measuring.\n\nBig-O hides constants and memory effects. For small *n*, an O(n) scan of a contiguous vector often beats an O(log n) tree lookup because of [[cache-locality]]. Use Big-O to avoid disasters, and a profiler to make final decisions.',
    example: `v[i];                    // O(1)
std::find(v.begin(), v.end(), x);  // O(n)
m.find(key);             // std::map: O(log n)
um.find(key);            // unordered_map: O(1) average
std::sort(v.begin(), v.end());     // O(n log n)`,
    see: ['container', 'algorithm', 'cache-locality', 'hash-table'],
  },
  // ------------------------------------------------------------ Memory
  {
    id: 'memory-address',
    term: 'Memory Address',
    course: 'cpp',
    category: 'Memory',
    short:
      'A number that identifies a location in memory, usually shown in hexadecimal like `0x7ffd5e8c`. Every object occupies one or more bytes, each with its own address.',
    long:
      'You get an object\'s address with the [[address-of-operator]] `&` and store it in a [[pointer]]. An object\'s address is the address of its first byte.\n\nAddresses are virtual: the operating system maps each process\'s addresses onto physical RAM, so two programs can both use address `0x1000` without conflict. Actual address values change between runs (address space layout randomisation), so never rely on them — printing addresses is only useful for debugging.',
    example: `int hp = 100;
std::cout << &hp << '\\n';   // e.g. 0x7ffd5e8c (varies)
int* p = &hp;               // store the address`,
    see: ['pointer', 'address-of-operator', 'stack-memory', 'heap-memory'],
  },
  {
    id: 'stack-memory',
    term: 'Stack',
    aliases: ['stack memory', 'automatic storage'],
    course: 'both',
    category: 'Memory',
    short:
      'The region of memory that holds local variables and function-call information. It is allocated and freed automatically, in last-in first-out order, as functions are called and return.',
    long:
      'Stack allocation is almost free — moving a pointer — and memory is reclaimed the instant a function returns. Objects are destroyed automatically at the end of their scope, which is what makes [[raii]] work.\n\nThe stack is small (often 1–8 MB per thread) and its objects die with their function, so returning a pointer or reference to a local is a bug, and huge arrays belong on the heap. Each thread has its own stack.\n\nIn Unreal you can put `FVector`, `FString` and other plain structs on the stack, but `UObject`s are always created on the heap via `NewObject` or `CreateDefaultSubobject`.',
    example: `void Fight() {
    int damage = 25;        // on the stack
    std::string msg = "Hit"; // object on the stack
                            // (its text may be on the heap)
}                           // both destroyed here`,
    see: ['heap-memory', 'stack-frame', 'storage-duration', 'stack-overflow'],
  },
  {
    id: 'heap-memory',
    term: 'Heap (Free Store)',
    aliases: ['heap', 'free store', 'dynamic memory'],
    course: 'both',
    category: 'Memory',
    short:
      'The large pool of memory used for objects whose size or lifetime is decided at run time. You request it with `new` (or via containers and smart pointers), and it stays allocated until explicitly released.',
    long:
      'Heap objects outlive the function that created them, which is exactly why they need managing: someone must free each allocation exactly once. Forgetting causes a [[memory-leak]]; freeing twice causes a [[double-free]]; using after freeing causes a [[dangling-pointer]].\n\nHeap allocation is far slower than stack allocation (the allocator must find a free block, possibly with locking), and scattered allocations hurt [[cache-locality]]. Allocate in bulk (`reserve`) and avoid allocations in hot loops.\n\nModern C++ rarely calls `new` directly: `std::vector`, `std::string`, `std::make_unique` and `std::make_shared` manage heap memory for you. In Unreal, `UObject`s live on the heap and are freed by the garbage collector.',
    example: `auto boss = std::make_unique<Enemy>("Dragon", 5000);
std::vector<int> big(1'000'000);   // elements on the heap

Enemy* raw = new Enemy{"Orc", 50}; // manual: avoid
delete raw;                        // must free exactly once`,
    see: ['stack-memory', 'new-expression', 'smart-pointer', 'memory-leak'],
  },
  {
    id: 'pointer',
    term: 'Pointer',
    course: 'both',
    category: 'Memory',
    short:
      'A variable that stores the memory address of another object (or `nullptr`). `int* p = &hp;` makes `p` point to `hp`, and `*p` accesses `hp` through it.',
    long:
      'Pointers let you refer to objects without copying them, share one object between several parts of a program, build linked data structures, and work with heap memory. Unlike a [[reference]], a pointer can be null, can be re-pointed to another object, and has its own address.\n\nThat flexibility is also the danger: a pointer can be uninitialised, null, dangling or point past the end of an array, and the compiler cannot always tell. Initialise pointers (to `nullptr` if nothing else), check before dereferencing when null is possible, and let smart pointers express [[ownership]].\n\nPointers are everywhere in Unreal: `AActor*`, `UWorld*`, and `TObjectPtr<UStaticMeshComponent>` members. Unreal\'s GC only tracks pointers it can see through `UPROPERTY()`.',
    example: `int hp = 100;
int* p = &hp;      // p holds hp's address
*p = 80;           // hp is now 80
p = nullptr;       // p points to nothing
if (p) { *p = 0; } // guard before dereferencing`,
    see: ['dereference', 'address-of-operator', 'nullptr', 'reference'],
    reading: [cppref('Pointer declaration', 'language/pointer', 'Pointers to objects, functions and members, plus null pointers and const placement.')],
  },
  {
    id: 'dereference',
    term: 'Dereference',
    aliases: ['indirection', '*ptr', '->'],
    course: 'cpp',
    category: 'Memory',
    short:
      'Accessing the object a pointer points to, using the unary `*` operator (`*p`) or, for members, the arrow operator (`p->health`, which means `(*p).health`).',
    long:
      'Dereferencing a pointer gives you an lvalue referring to the pointed-to object, so you can read it or assign through it. The same `*` symbol means something different in a declaration (`int* p` declares a pointer) — context decides.\n\nDereferencing a null, uninitialised or dangling pointer is [[undefined-behavior]]; usually a crash (segmentation fault / access violation), but not always. In Unreal, an "Access violation reading location 0x0000000000000000" crash almost always means you dereferenced a null pointer, which is why `IsValid()` checks are so common.',
    example: `Enemy boss{"Dragon", 5000};
Enemy* p = &boss;
(*p).hp -= 100;     // dereference, then member
p->hp -= 100;       // same thing, nicer syntax
Enemy* none = nullptr;
// none->hp = 0;    // UB: null dereference`,
    see: ['pointer', 'address-of-operator', 'null-pointer', 'undefined-behavior'],
    reading: [cppref('Member access operators', 'language/operator_member_access', 'Covers *, ->, &, [] and their built-in meanings.')],
  },
  {
    id: 'address-of-operator',
    term: 'Address-of Operator (&)',
    course: 'cpp',
    category: 'Memory',
    short:
      'The unary `&` operator, which gives the memory address of an object as a pointer: `&hp` has type `int*` when `hp` is an `int`.',
    long:
      'You can only take the address of an [[lvalue]] — something with an identity. `&42` and `&(a + b)` do not compile.\n\nThe `&` symbol is overloaded with three meanings, distinguished by context: in an expression with one operand it is address-of (`&hp`); with two operands it is bitwise AND (`a & b`); in a declaration it makes a [[reference]] (`int& r = hp;`). Beginners often mix up the declaration and expression meanings.',
    example: `int hp = 100;
int* p = &hp;      // address-of
int& r = hp;       // reference declaration (not address-of)
int mask = 6 & 3;  // bitwise AND: 2`,
    see: ['pointer', 'dereference', 'reference', 'memory-address'],
  },
  {
    id: 'nullptr',
    term: 'nullptr',
    course: 'both',
    category: 'Memory',
    short:
      'The C++11 keyword for a null pointer value — a pointer that points to nothing. It has its own type, `std::nullptr_t`, which converts to any pointer type but not to integers.',
    long:
      'Before C++11, code used `NULL` or `0`, which are integers. That caused real bugs with overloading: given `F(int)` and `F(char*)`, the call `F(NULL)` picks `F(int)` or is ambiguous, depending on how `NULL` is defined. `F(nullptr)` always picks the pointer version.\n\nUse `nullptr` to initialise pointers that do not point anywhere yet and to reset pointers after the object is gone. Smart pointers compare with it too (`if (ptr == nullptr)` or simply `if (!ptr)`).\n\nUnreal code uses `nullptr` everywhere, though for `UObject`s you will usually check with `IsValid(Obj)`, which also catches objects pending destruction.',
    example: `Enemy* target = nullptr;     // points to nothing
if (target == nullptr) {
    target = FindNearest();
}
void F(int);
void F(char*);
F(nullptr);                  // calls F(char*)`,
    see: ['null-pointer', 'pointer', 'dereference'],
    reading: [cppref('nullptr', 'language/nullptr', 'The pointer literal and why it replaced NULL.')],
  },
  {
    id: 'null-pointer',
    term: 'Null Pointer',
    course: 'both',
    category: 'Memory',
    short:
      'A pointer that does not point to any object, holding the null value (written `nullptr`). It converts to `false` in a condition, and dereferencing it is undefined behaviour.',
    long:
      'Null is a useful signal meaning "nothing here": no current target, no equipped weapon, search found nothing. But every place that dereferences such a pointer must check first, and forgetting is one of the most common crashes in C and C++ — Tony Hoare, who introduced null references in 1965, called it his "billion-dollar mistake".\n\nWays to reduce the risk: use references when something must always exist, `std::optional` for "maybe a value", and check pointers at boundaries. In Unreal, `IsValid(Ptr)` checks both for null and for objects already marked for destruction, and `check(Ptr)` asserts in development builds.',
    example: `Weapon* equipped = nullptr;
if (equipped) {               // false: null
    equipped->Fire();
}
equipped->Fire();             // UB: likely crash`,
    see: ['nullptr', 'pointer', 'dereference', 'std-optional'],
  },
  {
    id: 'reference',
    term: 'Reference',
    aliases: ['lvalue reference', 'T&'],
    course: 'both',
    category: 'Memory',
    short:
      'An alias — another name — for an existing object, declared with `&`: `int& r = hp;`. Everything you do to `r` happens to `hp`. A reference must be initialised and cannot be re-bound.',
    long:
      'References give you pointer-like sharing with simpler syntax and stronger guarantees: no null state (in valid code), no re-pointing, no `*` or `->` needed. That makes them ideal for function parameters (`const T&` for reading, `T&` for modifying) and range-based `for` loops.\n\nAssigning to a reference assigns to the referred object; it does not make the reference refer elsewhere. Like pointers, references can dangle if the object dies first — never return a reference to a local variable.\n\nC++11 added [[rvalue-reference|rvalue references]] (`T&&`) for move semantics; plain `T&` is now called an lvalue reference.',
    example: `int hp = 100;
int& alias = hp;   // alias refers to hp
alias -= 30;       // hp is now 70
int mana = 50;
alias = mana;      // copies 50 into hp; does NOT re-bind`,
    see: ['pointer', 'const-reference', 'pass-by-reference', 'dangling-reference'],
    reading: [cppref('Reference declaration', 'language/reference', 'lvalue and rvalue references, reference collapsing and lifetime extension.')],
  },
  {
    id: 'dangling-pointer',
    term: 'Dangling Pointer',
    aliases: ['use-after-free'],
    course: 'both',
    category: 'Memory',
    short:
      'A pointer that still holds the address of an object whose lifetime has ended — deleted, gone out of scope, or moved when a container reallocated. Using it is undefined behaviour.',
    long:
      'A dangling pointer looks exactly like a valid one; there is no way to test it. Reading through it may return stale data, garbage, or a different object that now occupies that memory, and writing through it corrupts that object — bugs that surface far away from the cause.\n\nCommon causes: returning the address of a local, keeping a pointer after `delete`, and holding pointers into a `std::vector` that later grows. Prevention: clear ownership with `std::unique_ptr`, `std::weak_ptr` for non-owning observers of shared objects, and AddressSanitizer to catch use-after-free in testing.\n\nIn Unreal, a raw `UObject*` member without `UPROPERTY()` becomes dangling when the GC destroys its target. `TWeakObjectPtr` is the safe observer: it becomes null instead of dangling.',
    example: `int* MakeBad() {
    int local = 5;
    return &local;      // local dies on return
}
int* p = new int{42};
delete p;
*p = 7;                 // UB: use-after-free`,
    see: ['dangling-reference', 'lifetime', 'weak-ptr', 'sanitizer'],
  },
  {
    id: 'dangling-reference',
    term: 'Dangling Reference',
    course: 'cpp',
    category: 'Memory',
    short:
      'A reference (or view such as `std::string_view`) that refers to an object that no longer exists. Using it is undefined behaviour, exactly like a dangling pointer.',
    long:
      'Classic sources: returning `T&` to a local variable, keeping a reference to a vector element across a `push_back`, a lambda that captures a local by reference and runs later, and a `std::string_view` built from a temporary `std::string`.\n\nThe compiler catches some cases (`-Wreturn-local-addr`, `-Wdangling-reference` in newer GCC), but many slip through. The safest rule: a reference must never outlive the object it refers to, so think about lifetime whenever you store a reference rather than just use it immediately.',
    example: `const std::string& Name() {
    std::string n = "Aria";
    return n;             // dangling: n dies here
}

std::string_view v = std::string{"temp"};  // dangling
auto f = [&count] { ++count; };  // dangerous if run later`,
    see: ['dangling-pointer', 'reference', 'string-view', 'lifetime'],
  },
  {
    id: 'memory-leak',
    term: 'Memory Leak',
    course: 'cpp',
    category: 'Memory',
    short:
      'Heap memory that was allocated but never freed, typically because the last pointer to it was lost. The program\'s memory use keeps growing until it ends.',
    long:
      'A leak in code that runs once is harmless-ish; a leak in code that runs every frame will eventually exhaust memory and crash a game after hours of play. Leaks also skip destructors, so files, sockets or locks owned by the object stay open.\n\nLeaks typically happen when a function has several exit paths (early `return`, exceptions) and one of them misses the `delete`. The cure is structural: never pair `new`/`delete` by hand — use `std::unique_ptr`, containers and [[raii]], so cleanup happens automatically on every path. LeakSanitizer (part of ASan on Linux) and Valgrind find leaks for you.\n\nIn Unreal, `UObject`s cannot leak in the classic sense because the GC frees them — but you can still "leak" by keeping strong references that prevent collection.',
    example: `void Spawn() {
    Enemy* e = new Enemy{};
    if (!e->Init()) {
        return;            // leak: e never deleted
    }
    delete e;
}
// Fix: auto e = std::make_unique<Enemy>();`,
    see: ['raii', 'unique-ptr', 'delete-expression', 'ownership'],
  },
  {
    id: 'double-free',
    term: 'Double Free',
    course: 'cpp',
    category: 'Memory',
    short:
      'Releasing the same heap allocation twice, for example calling `delete` twice on the same pointer. It is undefined behaviour and can corrupt the allocator\'s internal data.',
    long:
      'A double free often does not crash immediately; it corrupts the heap, and the crash comes later in an unrelated allocation. Attackers have even exploited double frees to run arbitrary code.\n\nIt usually comes from unclear ownership: two objects each believe they own the same pointer (for example a class with a raw owning pointer and the default, [[shallow-copy|shallow]] copy constructor). Fix the ownership with `std::unique_ptr` (which cannot be copied) or the [[rule-of-three]]. Setting a pointer to `nullptr` after `delete` helps a little, since deleting `nullptr` is a harmless no-op, but it does not fix copies of the pointer held elsewhere.',
    example: `int* a = new int{5};
int* b = a;      // two pointers, one allocation
delete a;
delete b;        // UB: double free`,
    see: ['delete-expression', 'ownership', 'shallow-copy', 'unique-ptr'],
  },
  {
    id: 'new-expression',
    term: 'new',
    aliases: ['new expression', 'operator new'],
    course: 'cpp',
    category: 'Memory',
    short:
      'An expression that allocates memory on the heap and constructs an object in it, returning a pointer: `Enemy* e = new Enemy{"Orc", 50};`. Every `new` needs exactly one matching `delete`.',
    long:
      '`new T` does two things: obtains raw memory (via `operator new`) and runs `T`\'s constructor. If allocation fails it throws `std::bad_alloc` rather than returning null. `new T[n]` creates an array, which must be freed with `delete[]`.\n\nIn modern C++, calling `new` directly is a code smell. `std::make_unique<T>(args...)` and `std::make_shared<T>(args...)` allocate and hand the result to a smart pointer in one step, so it cannot leak, and containers handle dynamic arrays.\n\nIn Unreal, never use `new` for `UObject`s — use `NewObject<T>()`, `CreateDefaultSubobject<T>()` or `SpawnActor<T>()`, so the engine can register and garbage-collect the object.',
    example: `Enemy* e = new Enemy{"Orc", 50};   // allocate + construct
delete e;                          // destruct + free

int* arr = new int[10]{};          // array form
delete[] arr;                      // must use delete[]

auto safe = std::make_unique<Enemy>("Orc", 50);  // preferred`,
    see: ['delete-expression', 'heap-memory', 'unique-ptr', 'memory-leak'],
    reading: [cppref('new expression', 'language/new', 'Allocation, initialisation, placement new and the array form.')],
  },
  {
    id: 'delete-expression',
    term: 'delete',
    aliases: ['delete expression', 'delete[]'],
    course: 'cpp',
    category: 'Memory',
    short:
      'An expression that destroys a heap object created with `new` (running its destructor) and frees its memory: `delete e;`. Arrays from `new[]` must be freed with `delete[]`.',
    long:
      'Rules that are easy to break: delete exactly once ([[double-free]] otherwise), only memory that came from `new` (never a stack object), use `delete[]` for arrays and plain `delete` for single objects (mixing them is UB), and never touch the object afterwards ([[dangling-pointer]]). Deleting `nullptr` is safe and does nothing.\n\nDeleting a derived object through a base-class pointer requires a [[virtual-destructor]], otherwise behaviour is undefined.\n\nThe practical rule: let smart pointers call `delete` for you. The separate `= delete` syntax on functions (`Foo(const Foo&) = delete;`) is unrelated — it forbids calling that function.',
    example: `Enemy* e = new Enemy{};
delete e;           // ~Enemy() runs, memory freed
e = nullptr;        // avoid accidental reuse

int* scores = new int[8];
delete[] scores;    // array form`,
    see: ['new-expression', 'double-free', 'virtual-destructor', 'smart-pointer'],
    reading: [cppref('delete expression', 'language/delete', 'Single-object and array forms, and what happens with incomplete types.')],
  },
  {
    id: 'pointer-arithmetic',
    term: 'Pointer Arithmetic',
    course: 'cpp',
    category: 'Memory',
    short:
      'Adding or subtracting integers to/from a pointer into an array moves it by whole *elements*, not bytes: if `p` points to `arr[0]`, then `p + 2` points to `arr[2]`.',
    long:
      'The compiler scales by `sizeof(T)` automatically, so `p + 1` on an `int*` advances 4 bytes on typical platforms. Subtracting two pointers into the same array gives the number of elements between them (type `std::ptrdiff_t`). In fact `arr[i]` is defined as `*(arr + i)`.\n\nPointer arithmetic is only valid within one array (plus the one-past-the-end position, which you may form but not dereference). Moving outside, or doing arithmetic on pointers to unrelated objects, is undefined behaviour.\n\nModern code rarely needs it: indices, iterators, `std::span` and algorithms express the same thing more safely.',
    example: `int arr[4] = {10, 20, 30, 40};
int* p = arr;          // points to arr[0]
int third = *(p + 2);  // 30
p++;                   // now points to arr[1]
std::ptrdiff_t n = (arr + 4) - arr;  // 4
// *(arr + 4);         // UB: one past the end`,
    see: ['pointer', 'array', 'array-decay', 'iterator'],
  },
  {
    id: 'array-decay',
    term: 'Array Decay',
    aliases: ['array-to-pointer conversion'],
    course: 'cpp',
    category: 'Memory',
    short:
      'The implicit conversion of a built-in array to a pointer to its first element, which happens in most expressions — including when you pass an array to a function. The size information is lost.',
    long:
      'A parameter written `void Print(int scores[10])` is really `void Print(int* scores)`; the `10` is ignored, and `sizeof(scores)` inside gives the pointer size, not 40. That is why C APIs pass the length separately — and why forgetting it causes buffer overruns.\n\nAvoid decay by using `std::array` (passed by reference), `std::vector`, or `std::span<int>`, which carries pointer and length together. If you must accept a built-in array, take it by reference: `void Print(const int (&scores)[10])`.',
    example: `void Print(int scores[10]) {        // really int*
    std::cout << sizeof(scores) << '\\n';  // 8, not 40!
}
int data[10]{};
Print(data);                         // data decays
void Better(std::span<const int> s); // keeps the size`,
    see: ['array', 'pointer', 'sizeof', 'std-array'],
    reading: [cppref('Array declaration', 'language/array', 'The "Array-to-pointer decay" section explains exactly when it happens.')],
  },
  {
    id: 'const-pointer',
    term: 'Pointer to const / const Pointer',
    aliases: ['const int*', 'int* const'],
    course: 'cpp',
    category: 'Memory',
    short:
      '`const int* p` is a pointer **to const**: you cannot modify the pointed-to value through it, but can re-point it. `int* const p` is a **const pointer**: it cannot be re-pointed, but the value can be modified.',
    long:
      'Read declarations right to left: `int* const p` is "p is a const pointer to int"; `const int* p` (equivalently `int const* p`) is "p is a pointer to an int that is const"; `const int* const p` is both.\n\nPointer-to-const is the common one: it is how functions promise not to modify data they receive (`void Draw(const Sprite* s)`). A const pointer is rarer and works like a reference that may be null.\n\nThe same idea applies to smart pointers: `std::unique_ptr<const T>` points to an immutable `T`, while `const std::unique_ptr<T>` cannot be reset or moved from.',
    example: `int hp = 100, mana = 50;
const int* a = &hp;   // pointer to const
// *a = 1;            // error: value is read-only
a = &mana;            // OK: re-point

int* const b = &hp;   // const pointer
*b = 90;              // OK: modify value
// b = &mana;         // error: cannot re-point`,
    see: ['const', 'pointer', 'const-reference'],
    reading: [cppref('cv type qualifiers', 'language/cv', 'How const applies to pointers at each level of indirection.')],
  },
  {
    id: 'ownership',
    term: 'Ownership',
    course: 'both',
    category: 'Memory',
    short:
      'Responsibility for destroying a resource (memory, a file, a lock). The *owner* frees it; non-owners may use it but must not free it and must not outlive it.',
    long:
      'Raw pointers do not say whether they own what they point to, which is the root of leaks and double frees. Modern C++ makes ownership explicit in types: `std::unique_ptr<T>` means sole owner, `std::shared_ptr<T>` means shared owner, and a raw pointer or reference means "I am only borrowing this".\n\nGood designs have a clear owner for everything: a level owns its enemies, an enemy owns its components, and other systems hold non-owning pointers. Transferring ownership is explicit (`std::move` of a `unique_ptr`).\n\nUnreal splits ownership differently: `UObject`s are owned by the garbage collector (kept alive by `UPROPERTY` references and their Outer), while non-`UObject` data uses `TUniquePtr`/`TSharedPtr`, which mirror the standard smart pointers.',
    example: `class Level {
    std::vector<std::unique_ptr<Enemy>> enemies; // owns
};
void Target(const Enemy* e);   // borrows, never deletes

auto e = std::make_unique<Enemy>();
level.Add(std::move(e));       // ownership transferred`,
    see: ['smart-pointer', 'unique-ptr', 'shared-ptr', 'raii'],
    reading: [
      {
        title: 'C++ Core Guidelines — Resource management',
        url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-resource',
        source: 'core-guidelines',
        note: 'Rules R.1–R.37 on ownership, raw pointers and smart pointers.',
      },
    ],
  },
  {
    id: 'smart-pointer',
    term: 'Smart Pointer',
    course: 'both',
    category: 'Memory',
    short:
      'A class that behaves like a pointer but also *owns* the object, deleting it automatically at the right time. The standard ones are `std::unique_ptr`, `std::shared_ptr` and `std::weak_ptr` (in `<memory>`).',
    long:
      'Smart pointers apply [[raii]] to heap objects: when the owning smart pointer is destroyed (goes out of scope, is reset or reassigned), it frees the object. Leaks and double frees from forgotten or repeated `delete` simply disappear.\n\nChoose `std::unique_ptr` by default — it has no overhead compared with a raw pointer. Use `std::shared_ptr` only when ownership is genuinely shared, and `std::weak_ptr` to observe a shared object without keeping it alive. Create them with `std::make_unique` and `std::make_shared`.\n\nUnreal has equivalents for non-`UObject` types — `TUniquePtr`, `TSharedPtr`, `TSharedRef`, `TWeakPtr` — while `UObject`s use `TObjectPtr`, `TWeakObjectPtr` and `TSoftObjectPtr` together with the garbage collector.',
    example: `#include <memory>

auto sword = std::make_unique<Weapon>("Sword");
auto map = std::make_shared<Map>("Arena");
std::weak_ptr<Map> observer = map;
// no delete anywhere: freed automatically`,
    see: ['unique-ptr', 'shared-ptr', 'weak-ptr', 'raii'],
    reading: [cppref('std::unique_ptr', 'memory/unique_ptr', 'Start with unique_ptr; its page links to make_unique and custom deleters.')],
  },
  {
    id: 'unique-ptr',
    term: 'std::unique_ptr',
    course: 'cpp',
    category: 'Memory',
    short:
      'A smart pointer that is the **sole owner** of a heap object and deletes it when the `unique_ptr` is destroyed. It cannot be copied, only moved, so there is never more than one owner.',
    long:
      'Create one with `std::make_unique<T>(args...)`. Access the object with `*` and `->`, get a non-owning raw pointer with `.get()`, give up ownership with `.release()`, and replace or free the object with `.reset()`.\n\nBecause copying is deleted, transferring ownership must be explicit: `auto b = std::move(a);` leaves `a` empty (null). That makes ownership visible in the code and lets the compiler catch accidental sharing.\n\n`unique_ptr` with the default deleter is the same size as a raw pointer and just as fast — a true [[zero-cost-abstraction]]. It also supports custom deleters (for C APIs like `fclose`) and arrays (`std::unique_ptr<int[]>`). Unreal\'s equivalent is `TUniquePtr` with `MakeUnique`.',
    example: `auto boss = std::make_unique<Enemy>("Dragon", 5000);
boss->Roar();
Enemy* raw = boss.get();        // borrow, don't delete
auto owner = std::move(boss);   // ownership moves
// boss is now nullptr
// auto copy = owner;           // error: cannot copy`,
    see: ['smart-pointer', 'shared-ptr', 'ownership', 'std-move'],
    reading: [cppref('std::unique_ptr', 'memory/unique_ptr', 'Members, custom deleters and the array specialisation.')],
  },
  {
    id: 'shared-ptr',
    term: 'std::shared_ptr',
    course: 'cpp',
    category: 'Memory',
    short:
      'A smart pointer that allows **shared ownership**: several `shared_ptr`s can own the same object, and it is deleted when the last one is destroyed. It uses [[reference-counting]].',
    long:
      'Each copy increments a reference count stored in a separate *control block*; each destruction decrements it, and at zero the object is deleted. `std::make_shared` allocates the object and control block together in one allocation, which is faster.\n\nShared ownership has costs: the pointer is twice the size of a raw pointer, and count updates are atomic (thread-safe) operations. More importantly, it can hide design problems — when everything is shared, nobody really knows when objects die. Two objects holding `shared_ptr`s to each other form a *cycle* and never get deleted; break cycles with [[weak-ptr]].\n\nUnreal\'s `TSharedPtr` is the equivalent and lets you choose thread-safe or faster non-thread-safe counting.',
    example: `auto map = std::make_shared<Map>("Arena");
{
    std::shared_ptr<Map> also = map;      // count: 2
    std::cout << map.use_count() << '\\n'; // 2
}                                         // count: 1
map.reset();                              // count: 0, deleted`,
    see: ['reference-counting', 'weak-ptr', 'unique-ptr', 'ownership'],
    reading: [cppref('std::shared_ptr', 'memory/shared_ptr', 'Ownership semantics, the control block and thread-safety guarantees.')],
  },
  {
    id: 'weak-ptr',
    term: 'std::weak_ptr',
    course: 'both',
    category: 'Memory',
    short:
      'A non-owning observer of an object managed by `std::shared_ptr`. It does not keep the object alive; call `lock()` to get a `shared_ptr` if the object still exists, or an empty one if it is gone.',
    long:
      '`weak_ptr` solves two problems. First, it breaks reference cycles: a child holding a `weak_ptr` to its parent does not keep the parent alive. Second, it lets you safely observe an object that someone else owns, without the risk of a dangling pointer — you can always ask "is it still there?".\n\nAlways use the result of `lock()` within one scope: checking `expired()` and then locking separately is a race in multithreaded code.\n\nThis "observe safely, never dangle" idea is central in Unreal: `TWeakPtr` for shared-pointer objects and `TWeakObjectPtr` for `UObject`s (for example, an AI\'s current target that might be destroyed at any moment).',
    example: `std::weak_ptr<Enemy> target = enemyShared;
if (auto e = target.lock()) {   // still alive?
    e->TakeDamage(10);          // safe to use here
} else {
    target.reset();             // it is gone
}`,
    see: ['shared-ptr', 'reference-counting', 'dangling-pointer', 'smart-pointer'],
    reading: [cppref('std::weak_ptr', 'memory/weak_ptr', 'lock(), expired() and how weak_ptr breaks shared_ptr cycles.')],
  },
  {
    id: 'reference-counting',
    term: 'Reference Counting',
    course: 'both',
    category: 'Memory',
    short:
      'A memory-management technique where each object tracks how many owners refer to it, and is destroyed as soon as that count drops to zero. `std::shared_ptr` works this way.',
    long:
      'Reference counting frees objects deterministically — immediately when the last owner lets go — unlike tracing [[garbage-collection]], which runs later. The cost is updating the count on every copy and destruction (atomically, if threads are involved).\n\nIts weakness is cycles: if A owns B and B owns A, both counts stay at 1 forever and both leak. Weak references that do not count as owners (`std::weak_ptr`) break such cycles.\n\nUnreal uses reference counting for `TSharedPtr`/`TSharedRef` and for many rendering resources, but uses a tracing garbage collector for `UObject`s.',
    example: `auto a = std::make_shared<int>(5);  // count 1
auto b = a;                         // count 2
b.reset();                          // count 1
a.reset();                          // count 0: freed`,
    see: ['shared-ptr', 'weak-ptr', 'garbage-collection', 'ownership'],
  },
  {
    id: 'raii',
    term: 'RAII',
    aliases: ['Resource Acquisition Is Initialization', 'scope-bound resource management'],
    course: 'both',
    category: 'Memory',
    short:
      '"Resource Acquisition Is Initialization": tie every resource (memory, file, lock, socket) to an object whose constructor acquires it and whose destructor releases it, so cleanup happens automatically when the object goes out of scope.',
    long:
      'C++ guarantees that destructors of local objects run when their scope ends — whether by reaching the closing brace, a `return`, a `break` or an exception. RAII exploits that guarantee: you cannot forget to release a resource, because releasing it is not your job any more.\n\nThe standard library is built on RAII: `std::vector` and `std::string` free their memory, `std::unique_ptr` deletes its object, `std::fstream` closes its file, and `std::lock_guard` unlocks its mutex. RAII is arguably the most important idiom in C++ and the reason well-written C++ rarely needs a `finally` keyword or garbage collector.\n\nIn Unreal, RAII is common for non-`UObject` helpers such as `FScopeLock` (mutex locking) and `TGuardValue` (temporarily changing a variable), while `UObject` lifetimes are managed by the GC instead.',
    example: `void SaveGame(const Data& d) {
    std::ofstream file{"save.dat"};   // opens the file
    std::lock_guard lock{saveMutex};  // locks the mutex
    file << d;
    if (!file) return;                // early exit: still safe
}   // lock released, file closed — automatically`,
    see: ['destructor', 'smart-pointer', 'lock-guard', 'stack-unwinding'],
    reading: [
      cppref('RAII', 'language/raii', 'A short explanation of the idiom with standard library examples.'),
      {
        title: 'C++ Core Guidelines — R.1: Manage resources automatically using RAII',
        url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-raii',
        source: 'core-guidelines',
        note: 'The guideline and its rationale, with examples of what goes wrong without RAII.',
      },
    ],
  },
  // ------------------------------------------------------------ Classes
  {
    id: 'struct',
    term: 'struct',
    course: 'both',
    category: 'Classes',
    short:
      'A keyword that defines a class type whose members are **public** by default. Apart from that default (and default public inheritance), `struct` and `class` are identical in C++.',
    long:
      'By convention, `struct` is used for simple bundles of data with few or no invariants — a `Point`, a `DamageEvent`, a config record — while `class` is used for types that hide their data behind member functions. The compiler does not care; readers do.\n\nA struct with only public data members and no constructors is an *aggregate*, which can be initialised with braces in member order: `Point p{3, 4};`, or with C++20 designated initialisers: `Point p{.x = 3, .y = 4};`.\n\nUnreal uses `struct` with the `F` prefix for value types (`FVector`, `FHitResult`), and `USTRUCT()` makes a struct visible to reflection and Blueprints.',
    example: `struct DamageEvent {
    int amount = 0;
    bool critical = false;
};

DamageEvent hit{25, true};
DamageEvent crit{.amount = 50, .critical = true}; // C++20`,
    see: ['class', 'access-specifier', 'member-variable', 'brace-initialization'],
    reading: [cppref('Class declaration', 'language/class', 'Covers class, struct and union declarations and their members.')],
  },
  {
    id: 'class',
    term: 'class',
    course: 'both',
    category: 'Classes',
    short:
      'A user-defined type that bundles data ([[member-variable|member variables]]) with the operations on that data ([[member-function|member functions]]). Members of a `class` are **private** by default.',
    long:
      'A class is a blueprint; each *instance* (object) has its own copy of the member variables. Classes let you model game concepts directly — `Enemy`, `Inventory`, `Weapon` — and enforce rules about them through [[encapsulation]]: outside code can only use the public interface, so the object stays valid.\n\nClasses get special member functions — constructors, a destructor, copy and move operations — that control how objects are created, copied and destroyed. Getting these right is what makes C++ classes feel like built-in types.\n\nAlmost everything in Unreal is a class: `AActor`, `UActorComponent`, `UGameInstance`. Your gameplay classes derive from them and are marked with `UCLASS()`.',
    example: `class Enemy {
public:
    explicit Enemy(int hp) : health{hp} {}
    void TakeDamage(int amount) { health -= amount; }
    bool IsAlive() const { return health > 0; }
private:
    int health;
};`,
    see: ['struct', 'encapsulation', 'constructor', 'access-specifier'],
    reading: [cppref('Classes', 'language/classes', 'An overview of class types, members and special member functions.')],
  },
  {
    id: 'member-variable',
    term: 'Member Variable',
    aliases: ['data member', 'field'],
    course: 'cpp',
    category: 'Classes',
    short:
      'A variable declared inside a class or struct. Each object of the class has its own copy (unless the member is `static`).',
    long:
      'Give members *default member initialisers* (`int health = 100;`) so every constructor starts from a valid state; otherwise members of fundamental type can be left uninitialised. Members are constructed in the order they are declared, regardless of the order in the [[member-initializer-list]].\n\nMany codebases mark members with a prefix or suffix (`m_health`, `health_`) to distinguish them from locals. Unreal does not: it uses plain PascalCase names (`Health`, `bIsDead`), and members exposed to the editor or GC are tagged `UPROPERTY()`.',
    example: `class Player {
    std::string name;          // member variable
    int health = 100;          // with default initialiser
    float speed = 6.0f;
    static int playerCount;    // shared by all players
};`,
    see: ['member-function', 'class', 'member-initializer-list', 'static-member'],
    reading: [cppref('Non-static data members', 'language/data_members', 'Default member initialisers, layout and bit-fields.')],
  },
  {
    id: 'member-function',
    term: 'Member Function',
    aliases: ['method'],
    course: 'cpp',
    category: 'Classes',
    short:
      'A function declared inside a class that operates on an object of that class, called with `obj.Function()` or `ptr->Function()`. Inside it, members are accessed directly via the hidden [[this-pointer]].',
    long:
      'Member functions form a class\'s interface. They can access private members, which is what makes [[encapsulation]] possible. Mark those that do not modify the object as [[const-member-function|const]] so they can be called on `const` objects.\n\nYou can define a member function inside the class (implicitly `inline`, good for tiny getters) or declare it in the header and define it in the `.cpp` with the class name prefix: `void Player::Heal(int amount) { ... }`.\n\nIn Unreal, member functions marked `UFUNCTION(BlueprintCallable)` can be called from Blueprints.',
    example: `class Player {
public:
    void Heal(int amount);                   // declared
    int GetHealth() const { return health; } // defined inline
private:
    int health = 100;
};
void Player::Heal(int amount) { health += amount; }`,
    see: ['member-variable', 'this-pointer', 'const-member-function', 'static-member'],
    reading: [cppref('Non-static member functions', 'language/member_functions', 'cv- and ref-qualified member functions and how this works.')],
  },
  {
    id: 'access-specifier',
    term: 'Access Specifier',
    aliases: ['public', 'private'],
    course: 'cpp',
    category: 'Classes',
    short:
      'The keywords `public`, `protected` and `private`, which control who may use a class\'s members: everyone, the class and its derived classes, or only the class itself (and its friends).',
    long:
      'Access is checked at compile time, per class, not per object: a `Player` member function may access the private members of *another* `Player`. It has no run-time cost.\n\nA good default: data members `private`, a small set of member functions `public`. Every public member is a promise to users that is hard to change later.\n\nUnreal classes often expose members to the editor with `UPROPERTY(EditAnywhere)` while keeping them `private` or `protected` in C++; add `meta = (AllowPrivateAccess = "true")` when a private member must be visible to Blueprints.',
    example: `class BankAccount {
public:
    void Deposit(int amount);   // anyone can call
protected:
    void Audit();               // this class + derived
private:
    int balance = 0;            // this class only
};`,
    see: ['encapsulation', 'protected', 'friend', 'class'],
    reading: [cppref('Access specifiers', 'language/access', 'Member access and how access interacts with inheritance.')],
  },
  {
    id: 'encapsulation',
    term: 'Encapsulation',
    course: 'cpp',
    category: 'Classes',
    short:
      'Hiding a class\'s internal data behind a public interface of member functions, so outside code cannot put the object into an invalid state and the internals can change without breaking users.',
    long:
      'If `health` is public, any code anywhere can set it to `-500`. If it is private and changed only through `TakeDamage` and `Heal`, the class can clamp values, fire events and maintain its [[invariant]] in one place.\n\nEncapsulation is not about writing a getter and setter for every field — that just makes the data public with extra steps. Design operations that make sense for the type (`TakeDamage`, not `SetHealth`).\n\nUnreal\'s gameplay code follows the same idea: components expose functions like `ApplyDamage` while keeping their state protected or private, and broadcast delegates when it changes.',
    example: `class Health {
public:
    void TakeDamage(int amount) {
        current = std::max(0, current - amount);
    }
    int Get() const { return current; }
private:
    int current = 100;   // can never go below 0
};`,
    see: ['access-specifier', 'invariant', 'class', 'member-function'],
  },
  {
    id: 'invariant',
    term: 'Class Invariant',
    course: 'cpp',
    category: 'Classes',
    short:
      'A condition that must always be true for every valid object of a class — for example "health is between 0 and maxHealth". Constructors establish it and every public member function preserves it.',
    long:
      'Invariants are why classes have private data: if any code can modify members, nobody can guarantee the rule. With encapsulation, you only need to check the constructor and the public functions.\n\nState invariants in comments, enforce them in constructors (throw or assert when arguments are invalid), and verify them with [[assertion|assertions]] in debug builds. A class with no invariant at all — a plain bundle of values — is a good candidate for a `struct` with public members.',
    example: `class Health {
public:
    explicit Health(int max) : maxHp{max}, hp{max} {
        assert(max > 0);           // establish invariant
    }
    void Heal(int n) {
        hp = std::min(hp + n, maxHp);  // preserve it
    }
private:
    int maxHp, hp;   // invariant: 0 <= hp <= maxHp
};`,
    see: ['encapsulation', 'constructor', 'assertion', 'exception-safety'],
  },
  {
    id: 'constructor',
    term: 'Constructor',
    aliases: ['ctor'],
    course: 'both',
    category: 'Classes',
    short:
      'A special member function with the same name as the class and no return type, which runs automatically when an object is created to initialise it into a valid state.',
    long:
      'A class can have several overloaded constructors. Initialise members in the [[member-initializer-list]] rather than assigning in the body. Mark single-argument constructors [[explicit]] to prevent accidental implicit conversions.\n\nIf you declare no constructors at all, the compiler generates a default constructor for you. Once you declare any constructor, it no longer does — write `Enemy() = default;` if you still want one. If a constructor throws, the object never existed: its destructor does not run, but already-constructed members are destroyed.\n\nUnreal constructors are special: they run when the [[cdo|Class Default Object]] is created, so they should only set defaults and create components (`CreateDefaultSubobject`); gameplay logic belongs in `BeginPlay`.',
    example: `class Enemy {
public:
    Enemy() = default;
    Enemy(std::string n, int hp)
        : name{std::move(n)}, health{hp} {}
private:
    std::string name = "Grunt";
    int health = 10;
};
Enemy a;                 // default constructor
Enemy b{"Orc", 50};      // two-argument constructor`,
    see: ['default-constructor', 'member-initializer-list', 'destructor', 'explicit'],
    reading: [cppref('Constructors and member initializer lists', 'language/constructor', 'Syntax, initialisation order and delegating constructors.')],
  },
  {
    id: 'default-constructor',
    term: 'Default Constructor',
    course: 'cpp',
    category: 'Classes',
    short:
      'A constructor that can be called with no arguments, used for declarations like `Enemy e;` and by containers such as `std::vector<Enemy> v(10);`.',
    long:
      'The compiler implicitly provides one if the class declares no constructors at all. That implicit version default-initialises members, so members of fundamental type without default member initialisers are left indeterminate. Write `= default` to request it explicitly once you have other constructors.\n\nSome types should not have one — a `FileHandle` without a file makes no sense — in which case simply do not provide it (or write `= delete`). Types without a default constructor cannot be used in `std::vector::resize` or as `std::map::operator[]` values.\n\nEvery Unreal `UObject` class needs a constructor callable without arguments (or the `FObjectInitializer` form), because the engine creates the Class Default Object that way.',
    example: `struct Stats {
    int hp = 100;
    int mana = 50;
};                         // implicit default ctor

class Weapon {
public:
    Weapon() = default;    // explicitly defaulted
    explicit Weapon(int dmg) : damage{dmg} {}
private:
    int damage = 5;
};`,
    see: ['constructor', 'default-initialization', 'special-member-functions'],
    reading: [cppref('Default constructors', 'language/default_constructor', 'When the default constructor is implicitly declared, defined or deleted.')],
  },
  {
    id: 'member-initializer-list',
    term: 'Member Initializer List',
    course: 'cpp',
    category: 'Classes',
    short:
      'The part of a constructor after the colon, `: name{n}, health{hp}`, that initialises members *directly*, before the constructor body runs.',
    long:
      'Assigning in the body (`health = hp;`) means each member is first default-constructed and then overwritten — wasted work for strings and containers. More importantly, `const` members, reference members and members without a default constructor *cannot* be assigned at all and must be initialised in the list.\n\nMembers are always initialised in the order they are **declared in the class**, not the order you write them in the list. Using one member to initialise another declared earlier reads an uninitialised value; `-Wreorder` (in `-Wall`) warns when the orders differ.\n\nA constructor can also delegate to another constructor in its initializer list: `Enemy() : Enemy{"Grunt", 10} {}`.',
    example: `class Enemy {
public:
    Enemy(std::string n, int hp)
        : name{std::move(n)}, health{hp}, maxHealth{hp} {}
private:
    std::string name;
    int health;
    const int maxHealth;   // must be in the list
};`,
    see: ['constructor', 'initialization', 'member-variable', 'const'],
    reading: [cppref('Constructors and member initializer lists', 'language/constructor', 'Includes the rules on initialisation order and delegating constructors.')],
  },
  {
    id: 'destructor',
    term: 'Destructor',
    aliases: ['dtor', '~ClassName'],
    course: 'both',
    category: 'Classes',
    short:
      'A special member function named `~ClassName()` that runs automatically when an object\'s lifetime ends, to release any resources the object owns.',
    long:
      'Destructors run at deterministic times: when a local goes out of scope, when `delete` is called, when a container erases an element, or when the owning object is destroyed. Members are destroyed after the destructor body, in reverse order of declaration. This predictability is the foundation of [[raii]].\n\nDestructors should not throw (they are implicitly `noexcept`); an exception escaping a destructor during [[stack-unwinding]] calls `std::terminate`. A class meant to be used polymorphically needs a [[virtual-destructor]].\n\nMost classes should not need a hand-written destructor at all — if every member cleans up after itself (smart pointers, containers), the compiler-generated one is perfect (the [[rule-of-zero]]). In Unreal, `UObject` destruction is driven by the garbage collector; use `EndPlay` or `BeginDestroy` for gameplay cleanup rather than relying on the C++ destructor timing.',
    example: `class LogFile {
public:
    explicit LogFile(const char* path) : f{std::fopen(path, "w")} {}
    ~LogFile() {
        if (f) std::fclose(f);   // always released
    }
private:
    std::FILE* f;
};`,
    see: ['constructor', 'raii', 'virtual-destructor', 'rule-of-zero'],
    reading: [cppref('Destructors', 'language/destructor', 'When destructors are called and the order in which members and bases are destroyed.')],
  },
  {
    id: 'this-pointer',
    term: 'this',
    course: 'cpp',
    category: 'Classes',
    short:
      'Inside a non-static member function, `this` is a pointer to the object the function was called on. `health` inside a member function is shorthand for `this->health`.',
    long:
      'You rarely need to write `this->` explicitly, but it is useful to disambiguate a member from a parameter with the same name, to pass the current object to another function (`world.Register(this)`), and to return the object for chaining (`return *this;`).\n\nIn a `const` member function, `this` is a pointer to const, which is how the compiler stops you modifying members there. Static member functions have no `this`. In templates that inherit from a dependent base class, `this->` is sometimes required to make a base member name visible.\n\nIn Unreal you pass `this` all the time — as the Outer in `NewObject<UFoo>(this)` or when binding delegates (`AddDynamic(this, &AMyActor::OnHit)`).',
    example: `class Player {
public:
    Player& SetName(const std::string& name) {
        this->name = name;   // member vs parameter
        return *this;        // enables chaining
    }
private:
    std::string name;
};`,
    see: ['member-function', 'const-member-function', 'static-member'],
    reading: [cppref('The this pointer', 'language/this', 'Where this may be used and its type in const and volatile member functions.')],
  },
  {
    id: 'const-member-function',
    term: 'const Member Function',
    course: 'cpp',
    category: 'Classes',
    short:
      'A member function declared with `const` after its parameter list, such as `int GetHealth() const;`. It promises not to modify the object and is the only kind you can call on a `const` object or through a `const&`.',
    long:
      'Const-correctness spreads: if `GetHealth()` is not marked `const`, you cannot call it on a `const Player&` parameter, so forgetting `const` on getters quickly causes compile errors elsewhere. Mark every member function that does not logically change the object as `const`.\n\nInside a `const` member function all members are treated as `const`. A member declared `mutable` (for caches or mutexes) can still be modified — use this sparingly, for state that does not affect the object\'s observable value.\n\nIn Unreal, `UFUNCTION(BlueprintPure)` functions are typically `const`, and engine getters such as `GetActorLocation() const` follow the same rule.',
    example: `class Player {
public:
    int GetHealth() const { return health; }  // OK
    void Heal() const { health += 10; }       // error!
private:
    int health = 100;
};
void Show(const Player& p) {
    std::cout << p.GetHealth();   // needs const fn
}`,
    see: ['const', 'member-function', 'this-pointer', 'const-reference'],
    reading: [cppref('Non-static member functions', 'language/member_functions', 'The section on const- and volatile-qualified member functions.')],
  },
  {
    id: 'static-member',
    term: 'static Member',
    course: 'cpp',
    category: 'Classes',
    short:
      'A member variable or function declared `static` belongs to the class itself rather than to any one object. There is one copy shared by all instances, accessed as `ClassName::member`.',
    long:
      'Static data members are useful for counters (`Enemy::aliveCount`), shared constants and class-wide configuration. A non-`const` static data member must be defined once outside the class — or, since C++17, declared `inline static` inside it.\n\nStatic member functions have no [[this-pointer]], so they can only access static members directly. They are handy for factory functions (`Enemy::Create(...)`) and utilities related to the class.\n\nUnreal libraries of helper functions (`UGameplayStatics`, `UKismetMathLibrary`) are classes full of static `UFUNCTION`s callable from Blueprints.',
    example: `class Enemy {
public:
    Enemy()  { ++aliveCount; }
    ~Enemy() { --aliveCount; }
    static int AliveCount() { return aliveCount; }
private:
    inline static int aliveCount = 0;   // C++17
};
int n = Enemy::AliveCount();`,
    see: ['member-variable', 'member-function', 'static-local', 'scope-resolution-operator'],
    reading: [cppref('Static members', 'language/static', 'Static data members, inline static members and static member functions.')],
  },
  {
    id: 'operator-overloading',
    term: 'Operator Overloading',
    course: 'cpp',
    category: 'Classes',
    short:
      'Giving an operator such as `+`, `==`, `<<` or `[]` a meaning for your own types by defining a function named `operator+`, `operator==` and so on.',
    long:
      'Overloading makes user-defined types feel built-in: `a + b` for vectors, `inventory[i]` for a container, `std::cout << player` for printing. You cannot invent new operators, change precedence, or overload operators for built-in types only.\n\nFollow the principle of least surprise: `+` should add, `==` should compare, and related operators should be consistent. Symmetric binary operators are usually non-member functions so that conversions work on both sides. Since C++20, defaulting `operator==` and `operator<=>` generates all six comparisons for you.\n\nUnreal\'s math types overload heavily: `FVector` supports `+`, `-`, `*`, `/`, `==`, plus `|` for dot product and `^` for cross product.',
    example: `struct Vec2 {
    float x = 0, y = 0;
    bool operator==(const Vec2&) const = default;  // C++20
};
Vec2 operator+(Vec2 a, Vec2 b) { return {a.x + b.x, a.y + b.y}; }
std::ostream& operator<<(std::ostream& os, Vec2 v) {
    return os << '(' << v.x << ", " << v.y << ')';
}`,
    see: ['operator', 'friend', 'function-overloading', 'copy-assignment'],
    reading: [cppref('Operator overloading', 'language/operators', 'Canonical forms for every overloadable operator, including <=> and stream operators.')],
  },
  {
    id: 'friend',
    term: 'friend',
    course: 'cpp',
    category: 'Classes',
    short:
      'A declaration inside a class that grants a specific function or class access to its private and protected members: `friend class SaveSystem;`.',
    long:
      'Friendship is granted, never taken: only the class itself can declare its friends. It is not inherited and not transitive (a friend\'s friend is not your friend).\n\nUsed carefully, `friend` *improves* encapsulation — for example a non-member `operator<<` or `operator==` that needs private data, or a tightly coupled helper class, rather than adding public getters for everything. Used liberally, it undermines access control.\n\nA "hidden friend" (a friend function defined inside the class body) is only found through argument-dependent lookup, which keeps overload sets small; it is a common idiom for operators.',
    example: `class Player {
public:
    explicit Player(int hp) : health{hp} {}
    friend std::ostream& operator<<(std::ostream& os,
                                    const Player& p) {
        return os << "Player(" << p.health << ")";
    }
private:
    int health;
};`,
    see: ['access-specifier', 'operator-overloading', 'encapsulation'],
    reading: [cppref('Friend declaration', 'language/friend', 'Friend functions, friend classes and template friends.')],
  },
  {
    id: 'explicit',
    term: 'explicit',
    course: 'cpp',
    category: 'Classes',
    short:
      'A specifier on a constructor (or conversion operator) that forbids its use for *implicit* conversions. `explicit Health(int)` means `Health h = 50;` will not compile, but `Health h{50};` will.',
    long:
      'Without `explicit`, a single-argument constructor doubles as an implicit conversion. If `void Apply(Health h)` exists, the call `Apply(50)` silently builds a `Health` from `50` — and `Apply(true)` might too. That can hide bugs, especially with overloads.\n\nMark single-argument constructors `explicit` by default, and leave it off only when the conversion is natural and lossless (like `std::string` from `const char*`). C++20 also allows `explicit(condition)` for templates.\n\nExplicit conversion operators, such as `explicit operator bool() const`, still work in `if` conditions but cannot be accidentally used in arithmetic.',
    example: `class Health {
public:
    explicit Health(int v) : value{v} {}
private:
    int value;
};
void Apply(Health h);
Apply(Health{50});   // OK
Apply(50);           // error: constructor is explicit`,
    see: ['constructor', 'implicit-conversion', 'brace-initialization'],
    reading: [cppref('explicit specifier', 'language/explicit', 'How explicit affects copy-initialisation and conversion functions.')],
  },
  // ------------------------------------------------------------ Inheritance
  {
    id: 'inheritance',
    term: 'Inheritance',
    course: 'both',
    category: 'Inheritance',
    short:
      'Defining a new class (the derived class) based on an existing one (the base class), so it automatically gets the base\'s members and can add or customise behaviour: `class Boss : public Enemy`.',
    long:
      'Public inheritance models an "is-a" relationship: a `Boss` is an `Enemy`, so a `Boss` can be used anywhere an `Enemy&` or `Enemy*` is expected. Combined with [[virtual-function|virtual functions]], this enables [[polymorphism]].\n\nInheritance is a strong coupling: changes to the base ripple into every derived class. For "has-a" relationships (a `Player` *has* an `Inventory`), use composition — a member — instead. Deep hierarchies tend to become rigid; many modern designs prefer shallow hierarchies plus components.\n\nUnreal is built on inheritance (`UObject` → `AActor` → `APawn` → `ACharacter`), but it also encourages composition through Actor Components, so you add a `UHealthComponent` instead of creating `AHealthyActor`.',
    example: `class Enemy {
public:
    virtual ~Enemy() = default;
    virtual void Attack() { /* basic hit */ }
protected:
    int health = 100;
};
class Boss : public Enemy {
public:
    void Attack() override { /* area attack */ }
};`,
    see: ['base-class', 'derived-class', 'polymorphism', 'virtual-function'],
    reading: [cppref('Derived classes', 'language/derived_class', 'Public, protected and private inheritance, multiple and virtual base classes.')],
  },
  {
    id: 'base-class',
    term: 'Base Class',
    aliases: ['parent class', 'superclass'],
    course: 'both',
    category: 'Inheritance',
    short:
      'The class another class inherits from. In `class Boss : public Enemy`, `Enemy` is the base class. It provides the common interface and shared implementation.',
    long:
      'A base class designed for polymorphic use should declare a [[virtual-destructor]] and mark the functions derived classes may customise as `virtual`. Members that derived classes need but outsiders should not see go in `protected`.\n\nThe base part of an object is constructed first and destroyed last. A derived constructor chooses which base constructor to call in its [[member-initializer-list]].\n\nIn Unreal, overridden functions usually call the base version with `Super::BeginPlay();` — `Super` is a typedef for the base class generated by `GENERATED_BODY()`. Standard C++ has no `Super`; you write `Enemy::Attack()` explicitly.',
    example: `class Boss : public Enemy {
public:
    Boss() : Enemy{5000} {}       // call base constructor
    void Attack() override {
        Enemy::Attack();          // call base version
        Stomp();
    }
};`,
    see: ['derived-class', 'inheritance', 'virtual-destructor', 'protected'],
  },
  {
    id: 'derived-class',
    term: 'Derived Class',
    aliases: ['child class', 'subclass'],
    course: 'both',
    category: 'Inheritance',
    short:
      'A class that inherits from a base class, gaining its members and adding or overriding behaviour. In `class Boss : public Enemy`, `Boss` is the derived class.',
    long:
      'A derived object *contains* a base sub-object, followed by the derived class\'s own members. That is why a `Boss*` converts implicitly to an `Enemy*` (upcasting is always safe), while converting back down requires a cast that may fail.\n\nIf a derived class declares a function with the same name as a base function, it *hides* every base overload of that name, even ones with different parameters — a common surprise. Bring them back with `using Enemy::Attack;`, and always mark intended overrides with [[override]].\n\nIn Unreal, your Blueprint classes are derived classes of your C++ classes, which is why exposing well-designed virtual or `BlueprintNativeEvent` functions in C++ matters.',
    example: `class Archer : public Enemy {
public:
    void Attack() override { ShootArrow(); }
private:
    int arrows = 20;              // extra member
};
Enemy* e = new Archer{};          // upcast: implicit
e->Attack();                      // Archer::Attack`,
    see: ['base-class', 'inheritance', 'override', 'object-slicing'],
  },
  {
    id: 'protected',
    term: 'protected',
    course: 'cpp',
    category: 'Inheritance',
    short:
      'An access specifier: `protected` members are accessible inside the class itself and inside classes derived from it, but not from outside code.',
    long:
      '`protected` is meant for the "inheritance interface" — helpers and state that derived classes legitimately need. Protected *data* weakens encapsulation (every derived class can break the base\'s invariants), so many guidelines prefer private data with protected member functions.\n\nThe word also appears in inheritance itself (`class B : protected A`), which makes `A`\'s public members protected in `B`; this is rarely used.\n\nUnreal classes use `protected` heavily for overridable lifecycle functions (`virtual void BeginPlay() override;` lives in the `protected:` section of a typical actor).',
    example: `class Enemy {
protected:
    int health = 100;
    void PlayHitEffect();
};
class Boss : public Enemy {
    void Enrage() { health += 500; }   // OK: derived
};
// enemy.health = 0;                  // error outside`,
    see: ['access-specifier', 'inheritance', 'encapsulation'],
  },
  {
    id: 'virtual-function',
    term: 'Virtual Function',
    course: 'both',
    category: 'Inheritance',
    short:
      'A member function declared `virtual` in a base class, which derived classes can override. Calling it through a base pointer or reference runs the version for the object\'s actual (dynamic) type.',
    long:
      'Without `virtual`, `Enemy* e = &boss; e->Attack();` calls `Enemy::Attack` because the compiler only knows the static type. With `virtual`, the call is resolved at run time via [[dynamic-dispatch]], so `Boss::Attack` runs.\n\nOverriding functions are virtual automatically; mark them `override` so the compiler checks the signature. Virtual calls cost an extra indirection and usually cannot be inlined — negligible for most code, but noticeable in tight loops over thousands of objects. Calling a virtual function from a constructor or destructor does **not** dispatch to the derived override.\n\nUnreal lifecycle functions such as `BeginPlay`, `Tick` and `EndPlay` are virtual; you override them in your actors.',
    example: `struct Enemy {
    virtual ~Enemy() = default;
    virtual int Damage() const { return 10; }
};
struct Boss : Enemy {
    int Damage() const override { return 50; }
};
Boss b;
const Enemy& e = b;
std::cout << e.Damage();   // 50: dynamic type is Boss`,
    see: ['override', 'dynamic-dispatch', 'vtable', 'pure-virtual-function'],
    reading: [cppref('virtual function specifier', 'language/virtual', 'How overriding works, covariant return types and virtual calls during construction.')],
  },
  {
    id: 'override',
    term: 'override',
    course: 'both',
    category: 'Inheritance',
    short:
      'A specifier placed after a member function declaration (`void Attack() override;`) asserting that it overrides a virtual function from a base class. The compiler reports an error if it does not.',
    long:
      'Without `override`, a tiny mismatch — a missing `const`, a different parameter type, a typo in the name — silently creates a brand-new function instead of overriding, and the base version keeps running. `override` turns that silent bug into a compile error.\n\nUse it on every override (and omit the redundant `virtual` there). Clang and GCC can warn when it is missing on some overrides (`-Wsuggest-override`, `-Winconsistent-missing-override`).\n\nUnreal code uses `override` everywhere: `virtual void BeginPlay() override;` — Unreal style keeps `virtual` too, but `override` is what provides the safety.',
    example: `struct Enemy {
    virtual void Attack(int power) const;
};
struct Boss : Enemy {
    void Attack(int power) const override;  // OK
    void Attack(float power) const override; // error:
};                                 // does not override`,
    see: ['virtual-function', 'final', 'derived-class'],
    reading: [cppref('override specifier', 'language/override', 'Syntax and the exact conditions under which override is satisfied.')],
  },
  {
    id: 'final',
    term: 'final',
    course: 'cpp',
    category: 'Inheritance',
    short:
      'A specifier that prevents further derivation: `class Boss final` cannot be inherited from, and a virtual function marked `final` cannot be overridden in further derived classes.',
    long:
      'Use `final` to document and enforce that a class was not designed for inheritance, or that a particular override is the last word. It also helps performance: when the compiler knows no further override can exist, it can *devirtualise* calls and potentially inline them.\n\nLike `override`, `final` is a contextual identifier, not a reserved keyword, so it only has special meaning in these positions.',
    example: `class Boss final : public Enemy {   // no subclasses
    void Attack() override;
};
struct Archer : Enemy {
    void Attack() final;             // no further overrides
};
// class MegaBoss : public Boss {};  // error`,
    see: ['override', 'virtual-function', 'inheritance'],
    reading: [cppref('final specifier', 'language/final', 'Using final on classes and on virtual member functions.')],
  },
  {
    id: 'polymorphism',
    term: 'Polymorphism',
    course: 'both',
    category: 'Inheritance',
    short:
      'The ability to use objects of different types through one common interface, with each type supplying its own behaviour. In C++ this usually means virtual functions called through base pointers or references.',
    long:
      'Polymorphism lets a game loop write `for (auto& e : enemies) e->Update(dt);` and have each orc, archer and dragon update differently, without the loop knowing the concrete types. New enemy types can be added without touching that loop.\n\nC++ has two kinds. *Run-time* (dynamic) polymorphism uses [[virtual-function|virtual functions]] and inheritance; the choice happens at run time via the [[vtable]]. *Compile-time* (static) polymorphism uses templates and overloading; the choice happens during compilation, with no run-time cost but larger binaries.\n\nUnreal relies on run-time polymorphism everywhere: the engine holds `AActor*` pointers and calls `Tick`, `BeginPlay` and `TakeDamage` on them, executing your overrides.',
    example: `std::vector<std::unique_ptr<Enemy>> enemies;
enemies.push_back(std::make_unique<Orc>());
enemies.push_back(std::make_unique<Dragon>());
for (const auto& e : enemies) {
    e->Attack();   // Orc::Attack, then Dragon::Attack
}`,
    see: ['virtual-function', 'dynamic-dispatch', 'inheritance', 'template'],
  },
  {
    id: 'dynamic-dispatch',
    term: 'Dynamic Dispatch',
    aliases: ['late binding', 'virtual dispatch'],
    course: 'cpp',
    category: 'Inheritance',
    short:
      'Choosing which function implementation to call at run time, based on the actual type of the object, rather than at compile time. In C++ it happens when you call a virtual function through a pointer or reference.',
    long:
      'Calling a virtual function on an object directly by value (`boss.Attack()`) is resolved statically; the compiler knows the exact type. Through `Enemy&` or `Enemy*`, the compiler emits code that looks up the function in the object\'s [[vtable]] at run time.\n\nThe cost is one or two extra memory loads plus a lost inlining opportunity — tiny per call, but measurable in hot loops processing many small objects. Compilers can *devirtualise* when they can prove the dynamic type, for example when the class is `final`.',
    example: `void Fight(Enemy& e) {
    e.Attack();     // resolved at run time
}
Boss b;
Fight(b);           // calls Boss::Attack
b.Attack();         // resolved at compile time`,
    see: ['virtual-function', 'vtable', 'polymorphism', 'final'],
  },
  {
    id: 'vtable',
    term: 'vtable',
    aliases: ['virtual table', 'vptr'],
    course: 'cpp',
    category: 'Inheritance',
    short:
      'The typical mechanism behind virtual functions: a per-class table of function pointers, plus a hidden pointer (the *vptr*) inside each object that points to its class\'s table.',
    long:
      'When a class has virtual functions, the compiler creates one table per class listing the addresses of its virtual function implementations. Each object stores a vptr, set by the constructor. A virtual call loads the vptr, indexes the table and calls through the pointer.\n\nConsequences: polymorphic objects are one pointer larger (8 bytes on 64-bit), and constructors set the vptr in stages — base first — which is why virtual calls inside a base constructor run the base version. The vtable is an implementation technique, not something the standard mandates, but every major compiler uses it.\n\nRun-time type information for `dynamic_cast` and `typeid` is usually reached through the vtable too.',
    example: `struct Plain { int hp; };              // sizeof: 4
struct Poly  {
    virtual ~Poly() = default;
    int hp;
};                                     // sizeof: 16 on
                                       // 64-bit (vptr + int
                                       // + padding)`,
    see: ['virtual-function', 'dynamic-dispatch', 'dynamic-cast', 'sizeof'],
  },
  {
    id: 'pure-virtual-function',
    term: 'Pure Virtual Function',
    course: 'cpp',
    category: 'Inheritance',
    short:
      'A virtual function declared with `= 0`, such as `virtual void Attack() = 0;`. It has no implementation in the base class (usually), and every concrete derived class must override it.',
    long:
      'Declaring even one pure virtual function makes the class an [[abstract-class]]: you cannot create objects of it, only of derived classes that implement all pure virtuals. That is how you define an interface the compiler enforces.\n\nA pure virtual function *may* still have a definition, which derived classes can call explicitly — mostly used for pure virtual destructors, which must be defined.\n\nUnreal cannot use pure virtual functions in `UCLASS`es, because the engine must be able to instantiate every class to create its Class Default Object. Instead, Unreal code uses the `PURE_VIRTUAL(Func, ...)` macro, which provides a body that asserts if it is ever called.',
    example: `class Weapon {
public:
    virtual ~Weapon() = default;
    virtual int Damage() const = 0;   // pure virtual
};
class Sword : public Weapon {
public:
    int Damage() const override { return 12; }
};
// Weapon w;   // error: Weapon is abstract`,
    see: ['abstract-class', 'virtual-function', 'interface', 'override'],
    reading: [cppref('Abstract class', 'language/abstract_class', 'Pure virtual functions and the rules for abstract classes.')],
  },
  {
    id: 'abstract-class',
    term: 'Abstract Class',
    course: 'both',
    category: 'Inheritance',
    short:
      'A class with at least one pure virtual function. It cannot be instantiated directly; it exists to be inherited from and to define a common interface.',
    long:
      'You can still have pointers and references to an abstract class — that is the whole point: code works with `Weapon&` and does not care whether it is a `Sword` or a `Bow`. A derived class that fails to override every pure virtual function is itself abstract.\n\nAbstract classes can contain data and implemented functions alongside the pure virtual ones, which distinguishes them from a pure [[interface]].\n\nIn Unreal, `UCLASS(Abstract)` marks a class that should not be placed or spawned directly in the editor (for example a base `AWeapon`), while still being instantiable for the CDO.',
    example: `class Shape {
public:
    virtual ~Shape() = default;
    virtual float Area() const = 0;
    void Describe() const {          // implemented
        std::cout << "Area: " << Area() << '\\n';
    }
};`,
    see: ['pure-virtual-function', 'interface', 'base-class', 'polymorphism'],
    reading: [cppref('Abstract class', 'language/abstract_class', 'What makes a class abstract and what you can and cannot do with it.')],
  },
  {
    id: 'interface',
    term: 'Interface',
    course: 'both',
    category: 'Inheritance',
    short:
      'A set of operations a type promises to support, without saying how. In C++ it is usually written as a class with only pure virtual functions and a virtual destructor, and no data.',
    long:
      'C++ has no `interface` keyword; an abstract class with only pure virtual functions plays that role. A class can implement several interfaces through multiple inheritance (`class Door : public IInteractable, public IDamageable`), which is the safe, common use of multiple inheritance.\n\nInterfaces decouple code: a player\'s "use" button only needs `IInteractable`, not knowledge of doors, chests and levers. Templates and concepts offer a compile-time alternative when you do not need run-time polymorphism.\n\nUnreal has a dedicated system: a `UINTERFACE` pair (`UInteractable` for reflection plus `IInteractable` for the C++ functions), which also works with Blueprints. Its naming follows the `I` prefix convention.',
    example: `class IInteractable {
public:
    virtual ~IInteractable() = default;
    virtual void Interact(Player& p) = 0;
};
class Chest : public IInteractable {
public:
    void Interact(Player& p) override { Open(p); }
};`,
    see: ['abstract-class', 'pure-virtual-function', 'polymorphism', 'concept'],
  },
  {
    id: 'virtual-destructor',
    term: 'Virtual Destructor',
    course: 'cpp',
    category: 'Inheritance',
    short:
      'A destructor declared `virtual` in a base class, so that deleting a derived object through a base pointer runs the derived destructor too. Without it, that `delete` is undefined behaviour.',
    long:
      '`Enemy* e = new Boss{}; delete e;` must destroy a `Boss`. If `~Enemy()` is not virtual, the program typically runs only `~Enemy()` — the `Boss` parts (perhaps a `std::vector` of minions) never get cleaned up — and the standard calls the whole thing undefined behaviour. The same applies to `std::unique_ptr<Enemy>` holding a `Boss`.\n\nRule: if a class has any virtual function, or is meant to be deleted through a base pointer, give it a public virtual destructor (`virtual ~Enemy() = default;`). If a base class should never be deleted polymorphically, make its destructor protected and non-virtual instead.\n\n`UObject` already has a virtual destructor, so all Unreal classes inherit one.',
    example: `struct Enemy {
    virtual ~Enemy() = default;   // essential
    virtual void Attack() {}
};
struct Boss : Enemy {
    std::vector<std::string> minions;
};
std::unique_ptr<Enemy> e = std::make_unique<Boss>();
// e's destruction correctly runs ~Boss()`,
    see: ['destructor', 'virtual-function', 'delete-expression', 'base-class'],
    reading: [cppref('Destructors', 'language/destructor', 'The "Virtual destructors" section explains the deletion-through-base rule.')],
  },
  {
    id: 'object-slicing',
    term: 'Object Slicing',
    course: 'cpp',
    category: 'Inheritance',
    short:
      'When a derived object is copied into a base-class *object* (not a pointer or reference), only the base part is copied; the derived members and overriding behaviour are "sliced off".',
    long:
      'Passing a `Boss` to `void Fight(Enemy e)` by value, or storing it in a `std::vector<Enemy>`, creates a plain `Enemy` copy. Virtual calls on that copy run `Enemy`\'s versions, and `Boss`-only data is gone. The code compiles silently.\n\nTo keep polymorphic behaviour, use references or pointers: `void Fight(Enemy& e)`, `std::vector<std::unique_ptr<Enemy>>`. Some base classes delete their copy operations (or make them protected) precisely to make slicing impossible.\n\nUnreal sidesteps the issue for `UObject`s, which are always handled by pointer.',
    example: `void FightByValue(Enemy e) { e.Attack(); }   // slices!
void FightByRef(Enemy& e)  { e.Attack(); }   // OK

Boss boss;
FightByValue(boss);   // Enemy::Attack runs
FightByRef(boss);     // Boss::Attack runs
std::vector<Enemy> v{boss};  // stores a sliced copy`,
    see: ['polymorphism', 'copy-constructor', 'pass-by-reference', 'derived-class'],
  },
  // ------------------------------------------------------------ Copy & Move
  // @@MORE@@
];
