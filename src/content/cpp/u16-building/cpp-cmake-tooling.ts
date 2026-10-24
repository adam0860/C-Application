import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-cmake-tooling',
  title: 'CMake, Compilers and Warnings',
  summary:
    'The compilers you will meet, the flags that matter, Debug vs Release, and a modern CMake project from first line to finished build.',
  minutes: 18,
  objectives: [
    'Name the three major C++ compilers and where each one is used',
    'Choose warning and optimization flags for GCC/Clang and their MSVC equivalents',
    'Explain what really differs between Debug and Release builds',
    'Read and write a target-based `CMakeLists.txt` with libraries and usage requirements',
    'Configure and build out of source with a generator, and know where vcpkg and Conan fit',
    'Explain why Unreal uses UnrealBuildTool instead of CMake',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Three compilers, one language',
      blocks: [
        {
          type: 'p',
          text: 'The [[iso-standard|C++ standard]] is a specification, not a program. Several independent [[compiler|compilers]] implement it, and as a professional you will almost certainly use more than one. Three dominate:',
        },
        {
          type: 'table',
          headers: ['Compiler', 'Command', 'Where you meet it', 'Known for'],
          rows: [
            ['**GCC**', '`g++`', 'Linux; MinGW/MSYS2 on Windows', 'The GNU project\'s compiler since 1987; the default on most Linux systems'],
            ['**Clang**', '`clang++` (`clang-cl` on Windows)', 'macOS/iOS (Apple Clang), Android NDK, Linux, many console toolchains', 'Built on LLVM; readable diagnostics; powers tools like clang-tidy and clangd'],
            ['**MSVC**', '`cl.exe`', 'Windows and Xbox, inside Visual Studio', 'Microsoft\'s compiler; the default for Unreal Engine on Windows'],
          ],
        },
        {
          type: 'p',
          text: 'All three implement the same language, but they differ in which newest features they support, which mistakes they warn about, which non-standard *extensions* they accept by default, and the binary conventions (the ABI) of the code they produce. That last point is why a library compiled with MSVC cannot simply be linked into a GCC build.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why build with more than one compiler?',
          text: 'Each compiler has different analysis, so each catches mistakes the others miss. Code that only compiles on one compiler often relies on an extension or on [[undefined-behavior]] that happens to work there. Many studios compile their engine with both MSVC and Clang in continuous integration, partly for console platforms and partly as a free second code review.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Compilers in Unreal',
          text: 'Unreal uses MSVC on Windows by default (Clang is optional), Apple Clang on macOS and iOS, and a bundled Clang toolchain for Linux and Android. Console platforms ship their own vendor toolchains. Your Unreal C++ must therefore compile cleanly on several compilers — another reason to write standard, warning-free code.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Warning flags: a free code review',
      blocks: [
        {
          type: 'p',
          text: 'A [[compiler-warning]] flags code that is legal C++ but almost certainly not what you meant. Most warnings are **off by default**, for backward compatibility with decades of old code. Look at what this snippet produces at three warning levels:',
        },
        {
          type: 'code',
          title: 'squad.cpp',
          code: `#include <vector>

int countAlive(std::vector<int> hp, int minHp) {
    int alive = 0;
    for (int i = 0; i < hp.size(); ++i) {
        if (hp[i] = 0) {
            continue;
        }
        ++alive;
    }
    return alive;
}

int main(int argc, char*[]) {
    int squad[argc];
    squad[0] = countAlive({100, 0, 40}, 1);
    return squad[0];
}`,
          annotations: [
            { lines: 3, text: '`minHp` is never used — probably a forgotten feature.' },
            { lines: 5, text: 'Comparing a signed `int` with the unsigned `size()` can misbehave for negative values.' },
            { lines: 6, text: 'The real bug: `=` assigns zero to every element instead of comparing. The condition is always false, so every soldier counts as alive *and* their HP is wiped.' },
            { lines: 15, text: 'A variable-length array: not standard C++, but GCC accepts it as an extension.' },
          ],
        },
        {
          type: 'table',
          caption: 'Real GCC 13 results for squad.cpp',
          headers: ['Flags', 'Warnings reported'],
          rows: [
            ['*(none)*', '**Zero.** It compiles silently, bug and all.'],
            ['`-Wall`', '`-Wsign-compare` (line 5) and `-Wparentheses`: "suggest parentheses around assignment used as truth value" (line 6)'],
            ['`-Wall -Wextra -Wpedantic`', 'All of the above, plus `-Wunused-parameter` (line 3) and "ISO C++ forbids variable length array" `-Wvla` (line 15)'],
          ],
        },
        {
          type: 'table',
          headers: ['Purpose', 'GCC / Clang', 'MSVC'],
          rows: [
            ['A widely agreed set of useful warnings', '`-Wall` (despite the name, *not* all)', '`/W3` (Visual Studio\'s project default)'],
            ['More warnings', '`-Wextra`', '`/W4`'],
            ['Reject non-standard extensions', '`-Wpedantic`', '`/permissive-`'],
            ['Treat warnings as errors', '`-Werror`', '`/WX`'],
            ['Popular extras', '`-Wshadow`, `-Wconversion`', 'Mostly included in `/W4`'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why doesn\'t the language just forbid `if (x = 0)`?',
          text: 'Because it is occasionally intended (`if (Enemy* e = findTarget())` is a common, valid idiom) and banning it would break enormous amounts of existing code. Warnings let compilers flag suspicious patterns without changing the language. The extra parentheses in `if ((x = 0))` are the agreed way to say "yes, I meant it".',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: '-Werror: great for your project, rude for your users',
          text: 'Turning warnings into errors keeps a code base clean, so use it in your own builds and CI. Avoid forcing it on people who build your library: a new compiler version that adds a warning would break their build for no real reason. (Clang\'s `-Weverything` turns on literally every warning — useful for exploring, far too noisy for daily use.)',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'What does `-Wall` do in GCC and Clang?',
      options: [
        {
          text: 'Enables every warning the compiler supports',
          why: 'Despite the name, many useful warnings (`-Wextra`, `-Wshadow`, `-Wconversion`…) are not included. Clang\'s `-Weverything` is the true "all".',
        },
        {
          text: 'Enables a widely agreed set of useful warnings, but not all of them',
          correct: true,
          why: 'Right. The set was chosen to catch common mistakes with few false alarms. That is why `-Wall -Wextra` is the usual starting point.',
        },
        {
          text: 'Turns all warnings into errors',
          why: 'That is `-Werror` (or `/WX` in MSVC). `-Wall` only decides *which* warnings appear.',
        },
        {
          text: 'Makes the compiler reject any non-standard C++',
          why: 'Rejecting extensions is the job of `-Wpedantic` / `-pedantic-errors`. `-Wall` happily accepts a variable-length array.',
        },
      ],
      explanation:
        '`-Wall` dates from the early days of GCC and means "all the warnings we recommend", not "all warnings". Treat `-Wall -Wextra` as the minimum for any project, add `-Wpedantic` to stay portable, and consider `-Werror` once the code is warning-free.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Optimization, debug info and Debug vs Release',
      blocks: [
        {
          type: 'p',
          text: 'Two independent dials control what the compiler produces: **how hard it optimizes** and **whether it records debug information**. A [[build-configuration]] such as *Debug* or *Release* is just a named combination of these and a few other settings.',
        },
        {
          type: 'table',
          headers: ['GCC / Clang', 'MSVC', 'Meaning'],
          rows: [
            ['`-O0`', '`/Od`', 'No optimization (the GCC/Clang default). Code follows your source line by line.'],
            ['`-Og`', '—', 'Optimize only in ways that keep debugging pleasant.'],
            ['`-O2`', '`/O2`', 'Full optimization: inlining, loop transformations, dead-code removal. The usual release level.'],
            ['`-O3`', '—', 'Even more aggressive (more vectorization, more inlining). Sometimes faster, sometimes just bigger.'],
            ['`-Os`', '`/O1`', 'Optimize for small code size.'],
            ['`-g`', '`/Zi`', 'Emit debug information (DWARF data, or a separate `.pdb` file with MSVC). Independent of the `-O` level.'],
            ['`-DNDEBUG`', '`/DNDEBUG`', 'Defines the `NDEBUG` macro, which compiles every `assert()` out of the program.'],
          ],
        },
        {
          type: 'table',
          headers: ['Aspect', 'Debug', 'Release'],
          rows: [
            ['Optimization', '`-O0` / `/Od`', '`-O2` or `-O3` / `/O2`'],
            ['Debug info', 'Yes', 'Often kept separately, or `RelWithDebInfo`'],
            ['`assert` checks', 'Active', 'Removed by `NDEBUG`'],
            ['Library checks', 'MSVC checked iterators on', 'Off'],
            ['Speed', 'Often several times slower; template-heavy code can be 10× slower or more', 'What players get'],
            ['Debugging', 'Every variable visible, stepping follows the source', 'Variables "optimized out", stepping jumps around'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is optimized code hard to debug?',
          text: 'The optimizer keeps values in registers instead of memory, deletes variables it can compute on the fly, inlines functions so they no longer exist as calls, and reorders statements. The machine code no longer corresponds line-for-line to your source, so a debugger cannot always show you `total` — it may simply not exist at that moment. That is the price of speed, and why you debug in a Debug build.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: '"It only crashes in Release"',
          text: 'When a bug appears only with optimization, the culprit is usually undefined behavior (previous lesson) or an uninitialized variable that happened to be zero in Debug. The optimizer did not break your code; it stopped hiding the break. Reach for sanitizers before blaming the compiler.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'fill',
      prompt: 'Complete both commands: the Debug build needs full debug information; the Release build needs full optimization (with `assert` compiled out).',
      template: `# Debug: no optimization, debug info for the debugger
g++ -std=c++20 -Wall -Wextra -O0 -___ game.cpp -o game_dbg

# Release: optimized, asserts disabled
g++ -std=c++20 -Wall -Wextra -___ -DNDEBUG game.cpp -o game`,
      blanks: [{ answers: ['g'] }, { answers: ['O2', 'O3'] }],
      wordBank: ['g', 'O2', 'O0', 'Werror', 'c', 's'],
      explanation:
        '`-g` records debug information so a debugger can map machine code back to lines and variables; it does not change the generated code. `-O2` turns on the optimizer (`-O3` would also be a valid release choice). The distractors: `-O0` is the *absence* of optimization, `-Werror` turns warnings into errors, `-c` stops before linking (you would get an object file, not a program), and `-s` strips symbols from the output.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Why build systems exist',
      blocks: [
        {
          type: 'p',
          text: 'In the previous lessons you compiled and linked files by hand. That stops scaling almost immediately: a real project has hundreds of files, include paths, libraries, generated code, per-platform flags and different compilers that spell every flag differently. You need a [[build-system]] that knows the dependency graph and rebuilds only what changed.',
        },
        {
          type: 'p',
          text: '[[cmake|CMake]] is the de facto standard for C++ outside of game engines: most open-source libraries ship a `CMakeLists.txt`, and Visual Studio, CLion and VS Code open CMake projects directly. Strictly speaking CMake is a *build system generator*: it does not compile anything itself.',
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Configure',
              text: 'CMake runs your `CMakeLists.txt`, detects the compiler and its capabilities, and finds libraries.',
            },
            {
              title: 'Generate',
              text: 'It writes native build files for a chosen **generator**: Ninja files, Makefiles, a Visual Studio solution or an Xcode project.',
            },
            {
              title: 'Build',
              text: 'The native tool (Ninja, Make, MSBuild, Xcode) runs the actual compiler and linker commands — the same `-c` and link steps you typed by hand — in parallel, rebuilding only out-of-date files.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Architect and builders',
          text: 'CMake is the architect who draws one set of plans; Ninja, Make and MSBuild are construction crews from different countries, each needing the plans in their own format. You describe the building once, and CMake translates.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not write Makefiles or VS projects directly?',
          text: 'Because then you maintain one build description per platform and IDE, and they drift apart. CMake gives a single description that works with GCC, Clang and MSVC on Linux, Windows and macOS — and it hides flag differences behind portable commands such as "this target needs C++20".',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'A CMakeLists.txt, line by line',
      blocks: [
        {
          type: 'p',
          text: 'Here is a complete, modern CMake file for the combat example from earlier in this unit. Every command operates on a **target** — something CMake builds, like an executable or a library.',
        },
        {
          type: 'code',
          lang: 'cmake',
          title: 'CMakeLists.txt',
          code: `cmake_minimum_required(VERSION 3.20)
project(DungeonCrawler VERSION 0.1.0 LANGUAGES CXX)

add_executable(dungeon
    src/main.cpp
    src/combat.cpp
)

target_compile_features(dungeon PRIVATE cxx_std_20)
set_target_properties(dungeon PROPERTIES CXX_EXTENSIONS OFF)

if(MSVC)
    target_compile_options(dungeon PRIVATE /W4 /permissive-)
else()
    target_compile_options(dungeon PRIVATE -Wall -Wextra -Wpedantic)
endif()`,
          annotations: [
            { lines: 1, text: 'Must come first. It states the oldest CMake version you support and switches on that version\'s *policies*, so newer CMake releases keep behaving the way this file expects.' },
            { lines: 2, text: 'Names the project and its version, and enables the C++ language — this is where CMake detects your compiler.' },
            { lines: '4-7', text: 'Creates a target called `dungeon` that builds an executable from these sources. List `.cpp` files only; headers are found through `#include`.' },
            { lines: 9, text: 'Requires C++20 for this target. CMake translates it to `-std=c++20` for GCC/Clang or `/std:c++20` for MSVC.' },
            { lines: 10, text: 'Without this, GCC gets `-std=gnu++20` (C++20 plus GNU extensions). Turning extensions off keeps the code portable.' },
            { lines: '12-16', text: 'Warning flags are compiler-specific, so we branch. `PRIVATE` means "for building this target only" — more on that keyword next.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why "target_" commands instead of global settings?',
          text: 'Older CMake code sets everything globally — `include_directories(...)`, `set(CMAKE_CXX_FLAGS "-Wall")` — so every target in the project gets everything, needed or not. *Modern CMake* attaches requirements to the target that needs them, so settings travel with the target and nothing leaks. When you read CMake code online, prefer examples full of `target_` commands.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'CMake\'s own language',
          text: 'CMake files use a simple command language: `command(arg1 arg2 ...)`, arguments separated by spaces, variables read with `${NAME}`, and `if()` / `endif()` blocks. Command names are case-insensitive, but lowercase is conventional.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'order',
      prompt: 'Put these lines in a valid order for a `CMakeLists.txt` that builds `dungeon` and links it to a `combat` library defined elsewhere in the project.',
      lines: [
        'cmake_minimum_required(VERSION 3.20)',
        'project(Dungeon LANGUAGES CXX)',
        'add_executable(dungeon src/main.cpp)',
        'target_link_libraries(dungeon PRIVATE combat)',
      ],
      distractors: ['target_link_libraries(combat PRIVATE dungeon)', 'g++ -c src/main.cpp'],
      explanation:
        '`cmake_minimum_required` must come first to set policies, and `project` must come before any target so the compiler is detected. A target must exist before `target_*` commands can modify it — reversing the last two lines fails with "Cannot specify link libraries for target dungeon which is not built by this project". The distractors: linking the executable *into* the library is backwards, and a raw compiler command does not belong in a CMake file at all.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Libraries and usage requirements: PUBLIC vs PRIVATE',
      blocks: [
        {
          type: 'p',
          text: 'Real projects split code into libraries. Let\'s turn the combat code into a [[static-library]] that the game executable links against, with its header in a separate `include` folder:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Project layout',
          code: `DungeonCrawler/
├── CMakeLists.txt
├── include/
│   └── combat.h
└── src/
    ├── combat.cpp
    └── main.cpp`,
        },
        {
          type: 'code',
          lang: 'cmake',
          title: 'CMakeLists.txt',
          code: `cmake_minimum_required(VERSION 3.20)
project(DungeonCrawler LANGUAGES CXX)

add_library(combat STATIC src/combat.cpp)
target_include_directories(combat PUBLIC include)
target_compile_features(combat PUBLIC cxx_std_20)

add_executable(dungeon src/main.cpp)
target_link_libraries(dungeon PRIVATE combat)`,
          annotations: [
            { lines: 4, text: 'A library target. `STATIC` produces `libcombat.a` / `combat.lib`; `SHARED` would produce a dynamic library.' },
            { lines: 5, text: '`PUBLIC`: `combat` itself needs `include/` to compile `combat.cpp`, **and** anything that links to `combat` needs it too, because its code includes `combat.h`.' },
            { lines: 6, text: 'Also `PUBLIC`: code using `combat` must be compiled as C++20 as well.' },
            { lines: 9, text: 'Linking does far more than add `libcombat.a` to the link line: `dungeon` automatically inherits combat\'s `PUBLIC` include directory and C++20 requirement. No need to repeat them.' },
          ],
        },
        {
          type: 'table',
          headers: ['Keyword', 'Applies when building this target?', 'Passed on to targets that link to it?'],
          rows: [
            ['`PRIVATE`', 'Yes', 'No — an implementation detail'],
            ['`PUBLIC`', 'Yes', 'Yes — part of the target\'s interface'],
            ['`INTERFACE`', 'No', 'Yes — e.g. a header-only library'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why model "usage requirements"?',
          text: 'A library knows what its users need — its headers, its language standard, its own dependencies. Declaring that once, on the library, means every consumer gets it right automatically, and a change in one place propagates everywhere. The rule of thumb: if something appears in your **headers**, it is `PUBLIC`; if it is only used inside your `.cpp` files, it is `PRIVATE`.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'You will see this idea again',
          text: 'Unreal\'s `.Build.cs` files have `PublicDependencyModuleNames` and `PrivateDependencyModuleNames`, which mean the same thing: public dependencies are exposed through your module\'s headers and passed on to modules that depend on you; private ones stay internal.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: 'Configuration succeeds, but building `dungeon` fails with `main.cpp:2:10: fatal error: combat.h: No such file or directory`. `main.cpp` contains `#include "combat.h"`, and the header lives in `include/`. Tap the line to fix.',
      lang: 'cmake',
      code: `cmake_minimum_required(VERSION 3.20)
project(DungeonCrawler LANGUAGES CXX)

add_library(combat STATIC src/combat.cpp)
target_include_directories(combat PRIVATE include)
target_compile_features(combat PUBLIC cxx_std_20)

add_executable(dungeon src/main.cpp)
target_link_libraries(dungeon PRIVATE combat)`,
      bugLines: [5],
      hint: 'Which targets get to see `include/`?',
      explanation:
        'With `PRIVATE`, only `combat`\'s own sources get `-I include`, so `combat.cpp` compiles but `main.cpp` (part of `dungeon`) cannot find the header. Because `combat.h` is part of combat\'s interface — users must include it — the directory is a usage requirement and must be `PUBLIC`. Line 9 is correct: `dungeon`\'s use of `combat` is private to `dungeon`, as nothing links against the executable.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Configure and build: out of source, with a generator',
      blocks: [
        {
          type: 'p',
          text: 'You run CMake from the terminal (or let your IDE do it). The modern commands take a source folder (`-S`) and a build folder (`-B`):',
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Single-configuration generator (Ninja, Makefiles)',
          code: `cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug
cmake --build build
./build/dungeon`,
          output: `[1/3] Building CXX object CMakeFiles/dungeon.dir/src/combat.cpp.o
[2/3] Building CXX object CMakeFiles/dungeon.dir/src/main.cpp.o
[3/3] Linking CXX executable dungeon
HP left: 70`,
          annotations: [
            { lines: 1, text: 'Configure + generate. `-G Ninja` picks the generator; `CMAKE_BUILD_TYPE` picks the configuration (`Debug`, `Release`, `RelWithDebInfo`, `MinSizeRel`).' },
            { lines: 2, text: 'Build, using whichever tool was generated. Run this again after editing a file and only that file is recompiled.' },
            { lines: 3, text: 'The executable lives in the build folder, not next to your sources.' },
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Multi-configuration generator (Visual Studio, Xcode)',
          code: `cmake -S . -B build-vs -G "Visual Studio 17 2022"
cmake --build build-vs --config Release`,
          annotations: [
            { lines: 1, text: 'Generates a `.sln` you can open in Visual Studio. It contains Debug *and* Release configurations at once.' },
            { lines: 2, text: 'So the configuration is chosen at **build** time with `--config`; `CMAKE_BUILD_TYPE` is ignored by multi-config generators.' },
          ],
        },
        {
          type: 'p',
          text: 'Notice that everything generated goes into `build/`. This is an **out-of-source build**, and it is the only kind you should use:',
        },
        {
          type: 'list',
          items: [
            '**Clean source tree**: your repository contains only files you wrote; add `build*/` to `.gitignore`.',
            '**Trivial clean rebuild**: delete the build folder.',
            '**Several builds side by side**: `build-debug`, `build-release`, `build-clang` and `build-asan` from the same sources, without interfering.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Save your settings in CMakePresets.json',
          text: 'Long configure commands are easy to mistype. A `CMakePresets.json` file in the project root stores named presets (generator, build type, flags) that everyone on the team — and IDEs like Visual Studio and CLion — can use with `cmake --preset debug`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'truefalse',
      prompt: 'With the Visual Studio generator, passing `-DCMAKE_BUILD_TYPE=Release` at configure time is how you select a Release build.',
      answer: false,
      explanation:
        'Visual Studio and Xcode are *multi-configuration* generators: one generated project contains every configuration, and you choose one when building, with `cmake --build build --config Release` (or the configuration dropdown in the IDE). `CMAKE_BUILD_TYPE` only affects single-configuration generators such as Ninja and Makefiles. Forgetting this is a classic way to benchmark a Debug build by accident.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Dependencies: vcpkg and Conan',
      blocks: [
        {
          type: 'p',
          text: 'For most of its history C++ had no standard way to get third-party libraries: people copied source folders into their repositories or relied on system packages. Today two package managers are widely used, and both integrate with CMake.',
        },
        {
          type: 'list',
          items: [
            '**vcpkg** (from Microsoft): list dependencies in a `vcpkg.json` manifest; vcpkg builds them from source for your compiler and platform.',
            '**Conan** (from JFrog): list dependencies in a `conanfile.txt` or Python `conanfile.py`; supports prebuilt binaries and complex configurations.',
            '**CMake\'s FetchContent**: no package manager at all — downloads a library\'s source at configure time and builds it as part of your project. Handy for small dependencies.',
          ],
        },
        {
          type: 'code',
          lang: 'json',
          title: 'vcpkg.json',
          code: `{
  "name": "dungeon-crawler",
  "dependencies": [ "fmt" ]
}`,
          annotations: [
            { lines: 3, text: 'Asks for the popular `fmt` formatting library (the ancestor of C++20\'s `std::format`).' },
          ],
        },
        {
          type: 'code',
          lang: 'cmake',
          title: 'CMakeLists.txt (excerpt)',
          code: `find_package(fmt CONFIG REQUIRED)
target_link_libraries(dungeon PRIVATE fmt::fmt)`,
          annotations: [
            { lines: 1, text: 'Locates the installed package and creates an *imported target* for it. `REQUIRED` stops configuration with a clear error if it is missing.' },
            { lines: 2, text: 'Linking `fmt::fmt` brings in its include paths and libraries through usage requirements — the same mechanism as your own `combat` target.' },
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          code: `cmake -S . -B build \\
  -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake`,
          annotations: [
            { lines: '1-2', text: 'The toolchain file hooks vcpkg into CMake: during configuration it installs everything in `vcpkg.json`, then lets `find_package` find it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is C++ dependency management so hard?',
          text: 'A compiled C++ library depends on the compiler, its version, the standard library, the platform, Debug vs Release, static vs shared, and even individual flags — mismatches cause the ODR and linker problems from earlier in this unit. Package managers like vcpkg and Conan exist mainly to build every dependency with *your* exact settings.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Unreal: why UnrealBuildTool instead of CMake',
      blocks: [
        {
          type: 'p',
          text: 'Open an Unreal project and you will not find a `CMakeLists.txt`. Unreal uses its own build system, [[unreal-build-tool]] (UBT), written in C#. Each module describes itself in a `.Build.cs` file, and each build target in a `.Target.cs` file — also C#.',
        },
        {
          type: 'code',
          lang: 'csharp',
          title: 'MyGame.Build.cs',
          code: `using UnrealBuildTool;

public class MyGame : ModuleRules {
    public MyGame(ReadOnlyTargetRules Target) : base(Target) {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[] {
            "Core", "CoreUObject", "Engine", "InputCore",
            "EnhancedInput"
        });

        PrivateDependencyModuleNames.AddRange(new string[] { });
    }
}`,
          annotations: [
            { lines: 3, text: 'Each module is a C# class deriving from `ModuleRules`. UBT compiles these rule files and runs them to learn how to build your C++.' },
            { lines: 5, text: 'Precompiled-header policy: UBT manages shared precompiled headers across modules to cut compile times.' },
            { lines: '7-10', text: 'The equivalent of `target_link_libraries(MyGame PUBLIC Core Engine ...)`. Forget a module here and you get the `LNK2019` errors from the first lesson of this unit.' },
          ],
        },
        {
          type: 'p',
          text: 'Unreal needs several things a general-purpose build tool does not do out of the box:',
        },
        {
          type: 'list',
          items: [
            '**Code generation**: before compiling, UBT runs [[unreal-header-tool]] over your headers to generate the reflection code behind `UCLASS`, `UPROPERTY` and the `.generated.h` files.',
            '**Modular and monolithic linking** from the same sources: one DLL per module for the editor, one executable for shipping, with `MYGAME_API` adjusted automatically.',
            '**Unity builds**: UBT concatenates many `.cpp` files into a few large translation units, dramatically reducing total compile time (while leaving the files you are editing out, so incremental builds stay fast).',
            '**Every platform Unreal ships on**, including console toolchains under NDA, plus engine-aware features like [[live-coding]].',
            '**IDE integration**: UBT generates the Visual Studio, Rider or Xcode project files from the same module rules.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Unity builds and anonymous namespaces',
          text: 'Unity builds merge several `.cpp` files into one translation unit, so two files that each define an anonymous-namespace helper called `ScoreTarget` suddenly collide with a *compile* error. Internal linkage protects you between translation units, and a unity build quietly changes where those boundaries are. Give file-local helpers distinctive names in Unreal projects.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Your C++ knowledge still applies',
          text: 'Under the hood UBT invokes the same compilers (MSVC, Clang) with the same kinds of flags you learned here: optimization levels, debug info, warning levels, defines. You will dig into UBT, UHT and Live Coding in the Unreal course.',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'Why does an Unreal project describe its modules in `.Build.cs` files for UnrealBuildTool instead of `CMakeLists.txt`?',
      options: [
        {
          text: 'CMake cannot generate Visual Studio projects or compile C++ on Windows',
          why: 'CMake does both routinely — the Visual Studio generator is one of its most used features.',
        },
        {
          text: 'C# compiles faster than C++, so the game builds faster',
          why: 'The `.Build.cs` files only *describe* the build. Your game code is still C++ compiled by MSVC or Clang.',
        },
        {
          text: 'UBT orchestrates engine-specific steps — UnrealHeaderTool code generation, modular vs monolithic linking, unity builds and console toolchains — in one engine-aware tool',
          correct: true,
          why: 'Exactly. These are requirements of the engine, and Epic built a tool around them rather than bolting them onto a generic build system.',
        },
        {
          text: 'CMake requires a paid license for commercial games',
          why: 'CMake is free, open-source software under a permissive BSD license.',
        },
      ],
      explanation:
        'Unreal\'s build has steps a general build system does not know about: reflection code generation must run before compilation, every module must build both as a DLL (editor) and as part of one executable (shipping) with matching export macros, and platform toolchains must plug in. UBT handles all of that with module rules written in C#, while still calling ordinary C++ compilers underneath.',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'truefalse',
      prompt: 'Adding `-g` makes your program run slower, because it inserts debugging code into the executable.',
      answer: false,
      explanation:
        '`-g` adds *debug information* — tables mapping machine-code addresses to source lines, variable locations and types — stored in separate sections of the file (or a separate `.pdb` with MSVC `/Zi`). GCC is designed so that `-g` does not change the generated machine code at all. Speed is decided by the optimization level: `-O2 -g` is as fast as `-O2`, just a bigger file. That combination (CMake\'s `RelWithDebInfo`) is ideal for profiling and for debugging crash reports from optimized builds.',
    },
  ],
  takeaways: [
    'GCC, Clang and MSVC implement the same standard but differ in warnings, extensions and ABI; building with more than one catches more bugs.',
    'Warnings are mostly off by default: use `-Wall -Wextra -Wpedantic` (or `/W4 /permissive-`), and `-Werror` / `/WX` in your own CI.',
    'Optimization (`-O`) and debug info (`-g`) are independent. Debug = `-O0 -g`; Release = `-O2 -DNDEBUG`; RelWithDebInfo = both.',
    'CMake is a build system generator: configure, generate, then build with Ninja, Make, MSBuild or Xcode.',
    'Modern CMake attaches requirements to targets; `PUBLIC` requirements propagate to users, `PRIVATE` ones do not.',
    'Always build out of source; multi-config generators choose the configuration with `--config` at build time.',
    'vcpkg, Conan and FetchContent fetch dependencies built with your exact settings.',
    'Unreal uses UnrealBuildTool because the engine needs code generation, modular/monolithic linking, unity builds and console toolchains.',
  ],
  reading: [
    {
      title: 'CMake Tutorial',
      url: 'https://cmake.org/cmake/help/latest/guide/tutorial/index.html',
      source: 'other',
      note: 'The official step-by-step tutorial, from a single executable to libraries, installation and testing.',
    },
    {
      title: 'Options to Request or Suppress Warnings (GCC)',
      url: 'https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html',
      source: 'other',
      note: 'Exactly which warnings `-Wall` and `-Wextra` enable, and the many extras you can add.',
    },
    {
      title: 'Configuring your compiler: Warning and error levels',
      url: 'https://www.learncpp.com/cpp-tutorial/configuring-your-compiler-warning-and-error-levels/',
      source: 'learncpp',
      note: 'How to set warning levels in Visual Studio, Code::Blocks, VS Code and the command line.',
    },
    {
      title: 'vcpkg documentation',
      url: 'https://learn.microsoft.com/en-us/vcpkg/',
      source: 'other',
      note: 'Getting started with manifests and the CMake toolchain integration.',
    },
    {
      title: 'Unreal Build Tool',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-build-tool-in-unreal-engine',
      source: 'unreal-docs',
      note: 'An overview of UBT, module and target rules, and build configuration options.',
    },
  ],
};
