import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'linkage',
    term: 'Linkage',
    aliases: ['external linkage', 'internal linkage', 'anonymous namespace'],
    course: 'cpp',
    category: 'Build',
    short: 'Whether a name declared in one translation unit can refer to the same entity in other translation units: **external** (visible program-wide), **internal** (private to its file) or **none** (local names).',
    long: 'Functions and non-const global variables have external linkage by default, so the linker can connect a call in one file to a definition in another. `extern int x;` declares such a name without defining it.\n\nNames in an anonymous namespace, namespace-scope `static` names and (by default) namespace-scope `const`/`constexpr` variables have internal linkage: each translation unit gets its own private entity, so identical names in different files never collide. Prefer anonymous namespaces for file-local helpers and types.',
    example: `int gScore = 0;            // external: one shared object
extern int gLevel;         // external: declared, defined elsewhere
static int gCalls = 0;     // internal: private to this file
namespace {
    int helper() { return 1; }   // internal
}`,
    see: ['translation-unit', 'linker', 'one-definition-rule', 'global-variable'],
    reading: [
      {
        title: 'Storage class specifiers (linkage)',
        url: 'https://en.cppreference.com/w/cpp/language/storage_duration',
        source: 'cppreference',
        note: 'The exact rules for external, internal and no linkage.',
      },
    ],
  },
  {
    id: 'inline-variable',
    term: 'inline Variable',
    aliases: ['inline variables', 'C++17 inline variable'],
    course: 'cpp',
    category: 'Build',
    short: 'A variable declared `inline` (C++17) that may be defined in a header included by many files; all those definitions refer to one shared object.',
    long: 'Before C++17, a global or static member variable shared across files had to be declared `extern` in a header and defined in exactly one `.cpp`. An inline variable removes that ceremony: the linker keeps a single copy. As with inline functions, every definition must be identical, or the program violates the One Definition Rule.\n\n`static constexpr` data members are implicitly inline since C++17.',
    example: `// config.h
#pragma once
inline int gMaxHealth = 100;          // one object program-wide
inline constexpr int kMaxPlayers = 4; // shared constant`,
    see: ['inline', 'linkage', 'one-definition-rule'],
  },
  {
    id: 'static-library',
    term: 'Static Library',
    aliases: ['.a file', '.lib file', 'archive'],
    course: 'cpp',
    category: 'Build',
    short: 'An archive of object files (`.a` on Linux/macOS, `.lib` on Windows) whose needed code is copied into the executable at link time.',
    long: 'Linking a static library produces a self-contained executable: nothing extra has to ship alongside it. The downsides are larger binaries, a separate copy in every program that uses the library, and the need to relink to pick up library fixes. With GNU `ld`, static libraries must appear on the command line after the object files that use them.',
    example: `ar rcs libcombat.a combat.o inventory.o
g++ main.o -L. -lcombat -o game`,
    exampleLang: 'shell',
    see: ['dynamic-library', 'linker', 'object-file'],
  },
  {
    id: 'dynamic-library',
    term: 'Dynamic Library',
    aliases: ['shared library', 'DLL', '.so', '.dylib', 'dynamic-link library'],
    course: 'both',
    category: 'Build',
    short: 'A compiled library (`.dll` on Windows, `.so` on Linux, `.dylib` on macOS) that the operating system loads when the program starts or on demand, instead of copying its code into the executable.',
    long: 'Dynamic libraries can be shared by several programs, replaced without relinking, and loaded or unloaded at run time — which is how plugins and Unreal\'s modular editor builds work. On Windows a DLL exports only symbols marked `__declspec(dllexport)`, and users import them via `__declspec(dllimport)` and an import library; Unreal\'s `MYGAME_API`-style macros switch between the two automatically.',
    example: `g++ -std=c++20 -shared -fPIC combat.cpp -o libcombat.so
g++ main.o -L. -lcombat -o game   # records a run-time dependency`,
    exampleLang: 'shell',
    see: ['static-library', 'linker', 'ue-module'],
  },
  {
    id: 'unspecified-behavior',
    term: 'Unspecified Behavior',
    aliases: ['unspecified'],
    course: 'cpp',
    category: 'Language',
    short: 'Behavior where the standard allows several valid outcomes and the implementation may pick any of them, without documenting the choice or being consistent about it.',
    long: 'The classic example is the evaluation order of function arguments: in `f(a(), b())` either call may run first. Unlike undefined behavior, the program remains valid — it just must not depend on which option is chosen. Unlike implementation-defined behavior, the choice need not be documented and may differ from one call to the next.',
    example: `spawnPair(nextId(), nextId());   // (1, 2) or (2, 1)

const int a = nextId();          // fully specified instead
const int b = nextId();
spawnPair(a, b);`,
    see: ['undefined-behavior', 'implementation-defined'],
  },
  {
    id: 'as-if-rule',
    term: 'As-If Rule',
    aliases: ['as if rule'],
    course: 'cpp',
    category: 'Language',
    short: 'The principle that a compiler may transform a program in any way, as long as the observable behavior of a program *without* undefined behavior stays the same.',
    long: 'Observable behavior means things like I/O and accesses to `volatile` objects. The as-if rule is what allows inlining, removing unused variables, reordering independent operations and vectorizing loops. Combined with undefined behavior it becomes powerful: since a valid program never executes UB, the optimizer may assume UB never happens — and delete code that could only matter if it did.',
    see: ['undefined-behavior', 'compiler'],
    reading: [
      {
        title: 'The as-if rule',
        url: 'https://en.cppreference.com/w/cpp/language/as_if',
        source: 'cppreference',
        note: 'What counts as observable behavior and which transformations are permitted.',
      },
    ],
  },
  {
    id: 'debug-symbols',
    term: 'Debug Symbols',
    aliases: ['debug information', 'debug info', 'PDB', 'DWARF', 'symbols'],
    course: 'both',
    category: 'Debugging',
    short: 'Data emitted by the compiler (`-g`, or `/Zi` with MSVC) that maps machine-code addresses back to source files, lines, functions, variables and types, so a debugger can show your code instead of raw addresses.',
    long: 'GCC and Clang store debug information as DWARF sections in object files and executables; MSVC writes a separate `.pdb` (program database) file. Symbols do not change the generated code or its speed — they only make the file bigger, which is why shipped builds often strip them. Keep the symbol files for every release so crash reports can be turned back into readable call stacks.\n\nOptimized builds can have symbols too, but variables kept only in registers may appear as "optimized out".',
    example: `g++ -std=c++20 -g -O0 game.cpp -o game    # Debug
g++ -std=c++20 -g -O2 game.cpp -o game    # optimized, still debuggable`,
    exampleLang: 'shell',
    see: ['debugger', 'breakpoint', 'call-stack'],
  },
  {
    id: 'watchpoint',
    term: 'Watchpoint (Data Breakpoint)',
    aliases: ['data breakpoint', 'watchpoint'],
    course: 'cpp',
    category: 'Debugging',
    short: 'A debugger feature that pauses the program whenever a particular memory location is written (or read), regardless of which line of code does it.',
    long: 'Watchpoints answer the question "who keeps changing this value?" — for example, which code sets a player\'s health to zero. Debuggers usually implement them with the CPU\'s hardware debug registers, so only a few (typically four) small watchpoints can be active at once. In gdb use `watch expr`, in lldb `watchpoint set variable name`, and in Visual Studio *New Breakpoint → Data Breakpoint*.',
    see: ['breakpoint', 'debugger'],
  },
  {
    id: 'stepping',
    term: 'Step Over / Step Into / Step Out',
    aliases: ['step over', 'step into', 'step out', 'single-stepping'],
    course: 'cpp',
    category: 'Debugging',
    short: 'Debugger commands that advance a paused program in small increments: **step over** runs the current line (including any calls it makes), **step into** enters the function being called, and **step out** runs until the current function returns.',
    long: 'In Visual Studio these are F10, F11 and Shift+F11; in gdb and lldb they are `next`, `step` and `finish`. Think of them as zoom levels on the call stack: into goes one frame deeper, over stays in the current frame, out climbs back to the caller.',
    see: ['debugger', 'breakpoint', 'call-stack'],
  },
  {
    id: 'heisenbug',
    term: 'Heisenbug',
    course: 'cpp',
    category: 'Debugging',
    short: 'A bug that disappears or changes when you try to observe it — for example when you add logging, attach a debugger or switch to a Debug build.',
    long: 'Heisenbugs usually come from timing-dependent problems such as data races, or from undefined behavior whose effects depend on memory layout and optimization. Observation changes timing (printing is slow and takes locks; breakpoints freeze threads) or memory layout, hiding the symptom without fixing the cause. Sanitizers are the best tool against them because they detect the underlying violation rather than its visible effects.',
    see: ['data-race', 'undefined-behavior', 'sanitizer'],
  },
];
