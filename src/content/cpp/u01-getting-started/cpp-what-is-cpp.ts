import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-what-is-cpp',
  title: 'What C++ Is and Why It Exists',
  summary: 'Where C++ came from, the philosophy that shapes every feature, and why game engines are built on it.',
  minutes: 16,
  objectives: [
    'Describe C++ as a compiled, statically typed, multi-paradigm language and explain what each of those words means',
    'Summarize how C++ evolved from "C with Classes" to the modern standards, and why C++11 was a turning point',
    'State the zero-overhead principle and give concrete examples of it',
    'Compare ahead-of-time compiled, interpreted and JIT-compiled languages',
    'Explain why game engines such as Unreal are written in C++, and what you pay for that power',
    'Distinguish the ISO standard from the compilers and standard libraries that implement it',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'A high-level language that speaks hardware',
      blocks: [
        {
          type: 'p',
          text: '[[cpp|C++]] is a general-purpose programming language that lets you build large, well-organized programs out of high-level pieces — containers, classes, generic algorithms — while still compiling down to machine code as tight as hand-written C. That combination is rare, and it is the whole reason C++ exists.',
        },
        {
          type: 'definition',
          term: 'C++ in one sentence',
          text: 'A **compiled**, **statically typed**, **multi-paradigm** language with direct access to memory and hardware, standardized by ISO.',
        },
        {
          type: 'list',
          items: [
            '**Compiled** — a [[compiler]] translates your source code into native machine instructions *before* the program runs. Nothing has to translate it while it runs.',
            '**Statically typed** — every variable has a type (whole number, text, `Enemy`…) that is fixed and checked at compile time, so many mistakes are caught before you ever launch the game.',
            '**Multi-paradigm** — you can write plain procedural code, object-oriented code with classes, generic code with templates, or functional-style code with lambdas, and mix them freely.',
            '**Close to the hardware** — you decide where data lives in memory, how it is laid out, and when it is created and destroyed.',
          ],
        },
        {
          type: 'p',
          text: "Here is a taste. Don't worry about the details yet — every piece gets its own lesson. Notice that it reads almost like a high-level scripting language, yet it compiles to a handful of machine instructions.",
        },
        {
          type: 'code',
          title: 'taste.cpp',
          runnable: true,
          code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> hits{12, 30, 7};
    int total = 0;
    for (int damage : hits) {
        total += damage;
    }
    std::cout << "Total damage: " << total << '\\n';
}`,
          output: 'Total damage: 49',
          annotations: [
            { lines: '1-2', text: 'Pull in parts of the [[standard-library]]: console output and `std::vector`, a growable list.' },
            { lines: 5, text: 'A high-level container holding three whole numbers. Under the hood it is one contiguous block of memory — no hidden per-element overhead.' },
            { lines: '7-9', text: 'Loop over every hit and add it up. The compiler turns this into a tight machine-code loop, just as if you had written the pointer arithmetic by hand.' },
            { lines: 10, text: 'Print the result. You will dissect this exact kind of line in the Hello World lesson.' },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A sports car with a manual gearbox',
          text: 'Many languages are automatic cars: comfortable, safe, and you never think about gears. C++ hands you the clutch. You can drive it comfortably most of the time, but when you need every last bit of performance, you can take full control — and you are responsible if you stall it.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'From "C with Classes" to C++',
      blocks: [
        {
          type: 'p',
          text: 'In 1979, Danish computer scientist **Bjarne Stroustrup** joined AT&T Bell Labs with a problem he had hit during his PhD at Cambridge. He had written a large simulation in **Simula**, a language whose *classes* made big programs easy to organize — but it ran far too slowly. Rewriting it in the low-level language BCPL made it fast, but painful to write and maintain.',
        },
        {
          type: 'p',
          text: 'He wanted both at once: Simula\'s way of organizing code, with the speed and hardware access of **C**, the language Bell Labs had built Unix with. So he extended C with classes.',
        },
        {
          type: 'steps',
          items: [
            { title: '1979 — "C with Classes"', text: 'Stroustrup starts adding classes, constructors and access control to C. His tool translates the new code into plain C, so it runs anywhere C runs.' },
            { title: '1983 — renamed C++', text: 'The name, suggested by colleague Rick Mascitti, is a programmer\'s joke: `++` is C\'s increment operator, so C++ means "C, plus one". Virtual functions and operator overloading arrive.' },
            { title: '1985 — first commercial release', text: 'The first edition of *The C++ Programming Language* is published, and the Cfront compiler ships. C++ spreads rapidly through industry.' },
            { title: '1998 — the first ISO standard', text: 'After years of committee work, C++98 becomes an international standard, including the Standard Template Library (containers and algorithms) designed by Alexander Stepanov.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why build on C instead of starting fresh?',
          text: 'C already ran on every machine, compiled to fast code, and had millions of lines of existing programs. By staying (almost) compatible with C, C++ could use every C library and compiler back end from day one, and programmers could adopt it gradually, file by file. That decision explains a lot of C++\'s character — both its reach and some of its rough edges, which were inherited from C.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Still in the family',
          text: 'C and C++ are now separate languages with separate standards, and modern C++ code looks very different from C. But most C code still compiles as C++ with small changes, and C++ can call C libraries directly. Much of the low-level code in game engines and operating systems lives on that boundary.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What problem was Stroustrup trying to solve when he created "C with Classes"?',
      options: [
        {
          text: 'C was too slow for simulations, so he needed a faster language',
          why: 'C was already fast — that is why he built on it. Speed was what *Simula* lacked.',
        },
        {
          text: 'He wanted Simula-style classes for organizing large programs without giving up C\'s speed and hardware access',
          correct: true,
          why: 'Exactly. Simula organized code well but ran slowly; BCPL and C ran fast but offered little structure. C++ set out to provide both.',
        },
        {
          text: 'He wanted a language with automatic garbage collection so programmers would not have to manage memory',
          why: 'C++ deliberately has no mandatory garbage collector — that would contradict the goal of C-level performance and control.',
        },
        {
          text: 'He needed a language that could run inside web browsers',
          why: 'The web did not exist in 1979. Browsers came more than a decade later (and are themselves largely written in C++).',
        },
      ],
      explanation:
        'C++ was born from a concrete pain point: good program organization (Simula) and good performance (C) were available only separately. Almost every C++ feature since then has been judged against the same two goals — better abstraction **without** losing efficiency.',
    },
    {
      kind: 'concept',
      title: 'The standards: C++98 to C++26',
      blocks: [
        {
          type: 'p',
          text: 'C++ is defined by an [[iso-standard]] — a long, precise document maintained by an international committee (ISO working group WG21). Each edition is named after the year it was finished. When people say "modern C++" they usually mean C++11 and later.',
        },
        {
          type: 'table',
          headers: ['Standard', 'What it brought'],
          rows: [
            ['C++98', 'The first ISO standard: classes, templates, exceptions, and the standard containers and algorithms'],
            ['C++03', 'A bug-fix release with no new features for everyday programmers'],
            ['**C++11**', '`auto`, lambdas, move semantics, smart pointers, `nullptr`, range-based `for`, `constexpr`, brace initialization, threads and a memory model'],
            ['C++14', 'Polish: generic lambdas, `std::make_unique`, more flexible `constexpr`'],
            ['C++17', 'Structured bindings, `if constexpr`, `std::optional`, `std::variant`, `std::string_view`, `std::filesystem`'],
            ['C++20', 'Concepts, ranges, coroutines, modules, the `<=>` operator, `std::format`, `std::span`'],
            ['C++23', '`std::expected`, `std::print`, "deducing this", `std::mdspan`, `std::flat_map`'],
            ['C++26', 'Static reflection, contracts, `std::execution`, and a hardened standard library mode'],
          ],
          caption: 'You do not need to know these features yet — the course teaches the important ones. This course uses C++20.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why C++11 was a turning point',
          text: 'Thirteen years separated C++98 and C++11, and the world changed in between: multi-core CPUs became normal and other languages had raised expectations of convenience. C++11 answered with move semantics (no more expensive hidden copies), smart pointers (memory that frees itself), `auto` and lambdas (far less boilerplate), and a portable threading model. Stroustrup said it "feels like a new language". Code written in C++11 style is shorter, safer and often faster than the C++98 equivalent.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'The release train',
          text: 'After the long wait for C++11, the committee switched to a fixed three-year schedule: a new standard ships every three years with whatever features are ready. A feature that misses the train simply catches the next one, instead of delaying everything else.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Which standard does Unreal use?',
          text: 'Unreal Engine 5 compiles game code as C++20 by default (since UE 5.3), so the modern features in this course are available to you in Unreal projects. Epic\'s coding standard does restrict some standard-library usage in favour of Unreal\'s own types — you will see why in the Unreal course.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Most code written for C++98 still compiles with a modern C++20 compiler.',
      answer: true,
      explanation:
        'Backward compatibility is one of C++\'s strongest commitments: billions of lines of existing code cannot be rewritten every three years. A handful of features have been removed (for example `std::auto_ptr` and the `register` keyword), but the vast majority of old code still builds. The flip side: old, error-prone features usually stay in the language, so you must learn which ones modern code avoids.',
    },
    {
      kind: 'concept',
      title: 'The zero-overhead principle',
      blocks: [
        {
          type: 'p',
          text: 'If C++ has one guiding rule, it is the **zero-overhead principle**, which Stroustrup states in two parts:',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**What you don\'t use, you don\'t pay for.** A feature you never touch adds no hidden cost to your program — no extra memory, no extra instructions.',
            '**What you do use, you couldn\'t hand-code any better.** When you use an abstraction, it should be as efficient as the low-level code you would have written yourself.',
          ],
        },
        {
          type: 'p',
          text: "That is why the language has no mandatory garbage collector, does not attach hidden type information to every object, and does not bounds-check array access unless you ask for it. Each of those is useful sometimes — so C++ lets you opt in, rather than charging everyone all the time. Abstractions that cost nothing at run time are called [[zero-cost-abstraction|zero-cost abstractions]].",
        },
        {
          type: 'code',
          title: 'layout.cpp',
          runnable: true,
          code: `#include <iostream>

struct Vec3 {
    float x;
    float y;
    float z;
};

int main() {
    Vec3 positions[1000]{};
    std::cout << sizeof(Vec3) << " bytes per Vec3\\n";
    std::cout << sizeof(positions) << " bytes for 1000\\n";
}`,
          output: '12 bytes per Vec3\n12000 bytes for 1000',
          annotations: [
            { lines: '3-7', text: 'A tiny type of our own: a 3D position, like a simplified version of Unreal\'s `FVector`. Three 4-byte floats.' },
            { lines: 10, text: 'One thousand positions, stored back to back in one block of memory. No object headers, no pointers, no hidden bookkeeping.' },
            { lines: 11, text: '`sizeof` reports how many bytes a type occupies. 12 bytes: exactly the three floats and nothing else.' },
            { lines: 12, text: '1000 × 12 = 12,000 bytes. The memory is exactly what you asked for — this is what "direct mapping to hardware" means.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'C++ array of structs',
            tone: 'good',
            text: 'One contiguous 12,000-byte block. The CPU streams through it, pulling neighbouring positions into its cache together.',
          },
          right: {
            title: 'Typical managed language (Java, or a C# `class`)',
            tone: 'neutral',
            text: 'An array of 1,000 *references*, each pointing to a separate heap object with its own header, potentially scattered across memory and tracked by a garbage collector.',
          },
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why layout matters so much',
          text: 'Modern CPUs are far faster than main memory; fetching data that is not already in the cache can cost a hundred or more cycles. Code that walks through tightly packed data, as above, is often several times faster than code that chases pointers across the heap. Game engines are designed around this, and C++ is one of the few mainstream languages that lets you control it precisely.',
        },
        {
          type: 'deepdive',
          title: 'When the abstraction is faster than "low-level" code',
          blocks: [
            {
              type: 'p',
              text: 'C\'s classic sorting function, `qsort`, receives the comparison as a function pointer and must call through it for every comparison. C++\'s `std::sort` is a template: the compiler generates a version specialized for your element type and comparison, and can inline the comparison directly into the sorting loop.',
            },
            {
              type: 'p',
              text: 'The result is that the higher-level C++ version is frequently *faster* than the C version. That is the second half of the zero-overhead principle in action: the abstraction gives the optimizer more information, not less.',
            },
          ],
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the first half of the zero-overhead principle.',
      template: 'What you don\'t ___, you don\'t ___ for.',
      templateIsCode: false,
      blanks: [{ answers: ['use'] }, { answers: ['pay'] }],
      wordBank: ['use', 'pay', 'write', 'compile', 'ask', 'wait'],
      explanation:
        '"What you don\'t use, you don\'t pay for" means unused features cost nothing: no garbage collector running in the background, no hidden headers on objects, no checks you did not request. The second half — "what you do use, you couldn\'t hand-code any better" — means the features you *do* use are as efficient as hand-written low-level code.',
    },
    {
      kind: 'concept',
      title: 'Compiled, interpreted, and JIT',
      blocks: [
        {
          type: 'p',
          text: 'A CPU only understands [[machine-code]]: binary instructions specific to its architecture (x86-64 in most PCs and current consoles, ARM in phones and Apple Silicon Macs). Every programming language needs some way to get from human-readable source code to those instructions. There are three broad strategies.',
        },
        {
          type: 'table',
          headers: ['Strategy', 'When translation happens', 'Examples', 'Trade-off'],
          rows: [
            ['Ahead-of-time (AOT) compiled', 'Once, before the program ships', 'C, C++, Rust, Go', 'Fastest start-up and predictable speed; you must build separately for each platform'],
            ['Interpreted', 'Line by line (or bytecode by bytecode) while running', 'Python, Lua, shell scripts', 'Edit and run instantly, very portable; much slower execution'],
            ['Just-in-time (JIT) compiled', 'While running, for code that runs often', 'Java, C#, JavaScript', 'Fast after warming up; start-up cost, a large runtime, and less predictable pauses'],
          ],
        },
        {
          type: 'p',
          text: 'An [[interpreter]] is a program that reads your code and performs it step by step, so every operation pays a translation tax at run time. A [[jit-compilation|JIT compiler]] watches the running program and compiles the hot parts into machine code on the fly. C++ takes the AOT route: the compiler does all the expensive analysis and optimization up front, so the shipped [[executable]] contains nothing but your program\'s machine code.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Translating a novel',
          text: 'AOT compilation is publishing a translated edition: slow to produce, but readers just read. Interpretation is a live interpreter whispering each sentence as you read: flexible, but everything takes longer. JIT is an interpreter who notices which chapters you reread and writes out a translation of those.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'C++ and Blueprints',
          text: 'Unreal offers both worlds. Blueprints, the visual scripting system, compile to bytecode that a virtual machine inside the engine runs — convenient and quick to iterate on, but slower per operation. C++ compiles to native machine code. That is why studios typically write performance-critical systems in C++ and expose them to Blueprints for designers.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'The lines are blurry',
          text: 'Real systems mix strategies. Python compiles source to bytecode before interpreting it, and Unity\'s IL2CPP converts C# bytecode into C++ so it can be compiled ahead of time for consoles and iOS. The categories describe tendencies, not strict rules.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Your C++ game builds and runs on Windows (x86-64). What must happen before it can run on an ARM-based phone?',
      options: [
        {
          text: 'Nothing — the same executable runs everywhere, like a Java program',
          why: 'Native executables contain machine code for one CPU architecture and operating system. Java avoids this by shipping bytecode plus a virtual machine for each platform.',
        },
        {
          text: 'The phone downloads an interpreter that runs the Windows executable',
          why: 'There is no standard interpreter for native x86-64 Windows executables on phones. Emulators exist, but they are slow and not how games ship.',
        },
        {
          text: 'The source code must be compiled again with a compiler that targets ARM and the phone\'s operating system',
          correct: true,
          why: 'Correct. The same C++ source can usually be reused, but it must be rebuilt for each target platform — which is why engines like Unreal have per-platform build pipelines.',
        },
        {
          text: 'The game must be rewritten in a JIT-compiled language',
          why: 'C++ runs on phones perfectly well (Unreal targets Android and iOS). You only need to recompile, not rewrite.',
        },
      ],
      explanation:
        'Ahead-of-time compilation produces machine code for a specific CPU and operating system. Portability in C++ lives at the **source** level: write standard C++, then compile it once per platform. This is the price of having no runtime translation layer — and the reason C++ code starts instantly and runs predictably.',
    },
    {
      kind: 'concept',
      title: 'Where C++ runs — and why games love it',
      blocks: [
        {
          type: 'p',
          text: 'C++ is everywhere that performance, memory control or hardware access matters. You have almost certainly used C++ code today without knowing it.',
        },
        {
          type: 'table',
          headers: ['Domain', 'Examples'],
          rows: [
            ['Game engines', 'Unreal Engine, the core of Unity and Godot, id Tech, Frostbite, and most console games'],
            ['Browsers', 'Chromium (Chrome, Edge) and much of Firefox'],
            ['Operating systems and tools', 'Large parts of Windows, compilers such as GCC and Clang'],
            ['Finance', 'Trading systems where microseconds of latency cost money'],
            ['Embedded and real-time', 'Cars, aircraft, medical devices, game controllers'],
            ['Science and AI', 'The fast cores of PyTorch and TensorFlow, physics simulations'],
          ],
        },
        {
          type: 'heading',
          text: 'Why games in particular',
        },
        {
          type: 'p',
          text: 'A game at 60 frames per second has **16.7 milliseconds** to do everything for a frame: read input, run gameplay, simulate physics, update animation and audio, and prepare rendering. At 120 fps the budget is 8.3 ms. Missing the budget even occasionally shows up as stutter that players notice immediately.',
        },
        {
          type: 'list',
          items: [
            '**Raw performance** — native code with no interpreter, and an optimizer that has decades of engineering behind it.',
            '**Memory control** — engines lay out data for the cache and use custom allocators (for example, a per-frame scratch allocator that is wiped every frame).',
            '**Predictability** — objects are destroyed at a known point, not whenever a [[garbage-collection|garbage collector]] decides to run. No surprise pauses in the middle of a boss fight.',
            '**Platform reach** — every console SDK ships a C++ toolchain, and the industry\'s engines and middleware (physics, audio, networking) are written in it.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a garbage-collection pause is a big deal',
          text: 'A garbage collector periodically scans memory to find objects nobody uses any more. If one pass takes 5 ms at the wrong moment, a 16.7 ms frame becomes a hitch. Games written in garbage-collected languages work hard to avoid allocating during gameplay for exactly this reason. In C++, freeing memory happens at points *you* choose, so its cost is visible and controllable.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal adds its own garbage collector — on purpose',
          text: 'Ironically, Unreal Engine *does* have a garbage collector, for its `UObject` types. Epic built it on top of C++ and controls exactly when and how it runs, and it only covers objects that opt in. That is the zero-overhead principle again: standard C++ does not force a collector on you, so an engine can add precisely the one it needs.',
        },
      ],
    },
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which of these are genuine reasons game engines are written in C++? Select all that apply.',
      options: [
        {
          text: 'It gives precise control over how data is laid out in memory',
          correct: true,
          why: 'Yes — cache-friendly layouts are one of the biggest performance levers in a game engine, and C++ lets you control them directly.',
        },
        {
          text: 'Objects are destroyed at predictable points, with no mandatory garbage-collection pauses',
          correct: true,
          why: 'Yes — deterministic destruction keeps frame times stable, which matters more to players than average speed.',
        },
        {
          text: 'Console SDKs, engines and middleware are built around C++ toolchains',
          correct: true,
          why: 'Yes — the ecosystem matters. Every major platform supports C++, and decades of engine code and libraries are written in it.',
        },
        {
          text: 'C++ prevents memory bugs automatically, so engines never crash',
          why: 'The opposite: C++ trusts the programmer, and memory bugs are a real risk. Engines use discipline, tools and their own safety layers to manage it.',
        },
        {
          text: 'C++ is the easiest mainstream language to learn',
          why: 'C++ is famously large and demanding. Studios choose it for performance and control, not for ease of learning.',
        },
      ],
      explanation:
        'Games are real-time software with a hard per-frame budget, so they value **predictable** performance and memory control above convenience. C++ delivers both, and the whole platform and middleware ecosystem grew up around it. What C++ does *not* give you is safety for free — that is the trade-off covered next.',
    },
    {
      kind: 'concept',
      title: 'The price: complexity and undefined behavior',
      blocks: [
        {
          type: 'p',
          text: 'C++\'s power comes with real costs, and it is better to know them up front.',
        },
        {
          type: 'list',
          items: [
            '**Size and complexity** — over forty years of features, kept for backward compatibility, means there are often several ways to do the same thing, and some of them are traps. Part of learning C++ is learning which parts modern code avoids.',
            '**Long build times** — the compilation model you will meet in the next lesson makes large projects slow to compile. Unreal projects can take a long time to build from scratch.',
            '**Undefined behavior** — some mistakes are not caught by the compiler *or* at run time, and the program\'s behaviour becomes completely unpredictable.',
          ],
        },
        {
          type: 'p',
          text: 'That last one deserves attention. For certain errors — reading outside an array, using memory after freeing it, overflowing a signed integer — the standard says the result is [[undefined-behavior]]: it places **no requirements at all** on what happens. The program might crash, print garbage, appear to work perfectly, or behave differently only in release builds.',
        },
        {
          type: 'code',
          code: `int lives[3] = {3, 2, 1};   // valid positions: 0, 1, 2
std::cout << lives[1];     // fine: prints 2
std::cout << lives[3];     // undefined behavior!`,
          annotations: [
            { lines: 1, text: 'An array of three whole numbers. Positions are counted from zero, so the valid ones are 0, 1 and 2.' },
            { lines: 3, text: 'Position 3 does not exist. C++ does not check: it reads whatever happens to be in memory next to the array — or the optimizer may assume this line can never run and transform the code around it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why would a language allow undefined behavior?',
          text: 'Checking every array access and every arithmetic operation would cost time on every operation in every program — exactly what the zero-overhead principle forbids. Leaving those cases undefined also lets C++ run efficiently on very different hardware, and lets the optimizer assume they never happen, which enables faster code. The deal is: C++ trusts you, and in return you must not break the rules.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: '"It works on my machine" proves nothing',
          text: 'Code with undefined behavior can pass every test and then crash on a different compiler, a different optimization setting, or a player\'s console. That is what makes it dangerous. Throughout this course you will learn the common sources and the tools that catch them — [[compiler-warning|compiler warnings]] and [[sanitizer|sanitizers]] are your first line of defence.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'The push for safety',
          text: 'Memory-safety bugs are a major source of security vulnerabilities, and security agencies now encourage memory-safe languages for new code. The C++ community is responding with safer defaults, better tooling and features like C++26\'s hardened standard library. Modern C++ written with the habits taught in this course avoids most of these bugs.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This program compiles, but one line has undefined behavior. Tap it.',
      code: `#include <iostream>

int main() {
    int loot[3] = {50, 20, 5};
    int gold = loot[0] + loot[1];
    int gems = loot[2] + loot[3];
    std::cout << gold << ' ' << gems << '\\n';
}`,
      bugLines: [6],
      hint: 'Count the elements, and remember where counting starts.',
      explanation:
        '`loot` has three elements at positions 0, 1 and 2. `loot[3]` reads past the end of the array, which is undefined behavior: C++ performs no bounds check, so the program may print a garbage number, crash, or appear correct. The compiler may not even warn. This is the "C++ trusts you" side of the zero-overhead deal.',
    },
    {
      kind: 'concept',
      title: 'One standard, many compilers',
      blocks: [
        {
          type: 'p',
          text: 'The ISO standard is a **document**, not a program. It defines what valid C++ means and what each construct must do. Turning that into working software is the job of **implementations**: compilers plus their standard libraries, written by different organizations.',
        },
        {
          type: 'table',
          headers: ['Compiler', 'Command', 'Standard library', 'Where you meet it'],
          rows: [
            ['GCC', '`g++`', 'libstdc++', 'Linux; the default on most Linux distributions'],
            ['Clang (LLVM)', '`clang++`', 'libc++ or libstdc++', 'macOS and iOS (Xcode), Android, PlayStation and other platform toolchains'],
            ['MSVC', '`cl`', 'Microsoft STL', 'Visual Studio on Windows and Xbox; Unreal\'s default compiler on Windows'],
          ],
        },
        {
          type: 'p',
          text: 'All three aim to follow the standard, but they differ in which new features they support (and when), in their warnings and error messages, and in their extensions — non-standard features you can accidentally rely on. The standard also leaves some details [[implementation-defined]], such as the exact size of `int`, which each implementation must choose and document.',
        },
        {
          type: 'heading',
          text: 'The standard library',
        },
        {
          type: 'p',
          text: 'The [[standard-library]] is the collection of ready-made components the standard requires every implementation to provide: text and console I/O, strings, containers like `std::vector`, algorithms like `std::sort`, smart pointers, threads, time, random numbers and more. All of it lives in the `std` namespace. It is part of the standard, but each compiler vendor writes its own version.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Write standard C++, test on more than one compiler',
          text: 'If your code compiles on GCC but not on MSVC, one of them is wrong — or you relied on an extension. Writing to the standard (and compiling with `-std=c++20` rather than a GNU dialect) keeps your code portable. [Compiler Explorer](https://godbolt.org) lets you try all three compilers in a browser.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal\'s own "standard library"',
          text: 'Unreal provides its own containers and strings — `TArray`, `TMap`, `FString` — instead of `std::vector` and `std::string`. When the engine began, standard library implementations varied a lot between consoles, and Epic needed control over memory allocation and integration with its reflection system. The concepts you learn with the standard library transfer almost one-to-one.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A teammate says: "My code compiles and runs fine with GCC, so it\'s correct C++." What is the best response?',
      options: [
        {
          text: 'Agreed — if a major compiler accepts it, it must be valid C++',
          why: 'Compilers accept extensions and cannot detect all undefined behavior, so "it compiles" is not the same as "it is correct, portable C++".',
        },
        {
          text: 'GCC is the official reference compiler, so its behaviour defines C++',
          why: 'There is no official reference compiler. The ISO standard document defines C++; GCC, Clang and MSVC are independent implementations of it.',
        },
        {
          text: 'Not necessarily — it might rely on a GCC extension or contain undefined behavior that happens to work on that compiler',
          correct: true,
          why: 'Right. The standard defines correctness. Extensions, implementation-defined details and undefined behavior can all make code "work" on one compiler and fail on another.',
        },
      ],
      explanation:
        'The standard is the source of truth, and compilers are implementations of it. Code that leans on an extension may fail to compile on MSVC (which Unreal uses on Windows); code with undefined behavior may break with a different optimizer. Compiling with several compilers and high warning levels catches many of these problems early.',
    },
  ],
  takeaways: [
    'C++ is a compiled, statically typed, multi-paradigm language that offers high-level abstractions with direct control over memory and hardware.',
    'Bjarne Stroustrup created it at Bell Labs (1979, "C with Classes") to combine Simula\'s program organization with C\'s speed.',
    'C++11 modernized the language (auto, lambdas, move semantics, smart pointers); since then a new standard ships every three years.',
    'The zero-overhead principle: what you don\'t use, you don\'t pay for; what you do use, you couldn\'t hand-code any better.',
    'C++ is compiled ahead of time to native machine code, so it starts instantly and runs predictably, but must be rebuilt for each platform.',
    'Games use C++ for performance, memory layout control, predictable destruction (no forced GC pauses) and platform reach.',
    'The price is complexity and undefined behavior; "it works on my machine" does not prove code is correct.',
    'The ISO standard is a document; GCC, Clang and MSVC (each with its own standard library) are implementations of it.',
  ],
  reading: [
    {
      title: 'A Tour of C++ (Bjarne Stroustrup)',
      url: 'https://www.stroustrup.com/tour3.html',
      source: 'book',
      note: 'A short, modern overview of the whole language by its creator — ideal once you have finished the first few units.',
    },
    {
      title: 'Bjarne Stroustrup\'s FAQ',
      url: 'https://www.stroustrup.com/bs_faq.html',
      source: 'other',
      note: 'Stroustrup\'s own answers on the history of C++, why it is designed as it is, and what the name means.',
    },
    {
      title: 'C++ compiler support',
      url: 'https://en.cppreference.com/w/cpp/compiler_support',
      source: 'cppreference',
      note: 'Tables showing which features of each standard GCC, Clang and MSVC support — useful when a feature does not compile.',
    },
    {
      title: 'Undefined behavior',
      url: 'https://en.cppreference.com/w/cpp/language/ub',
      source: 'cppreference',
      note: 'Precise definitions of undefined, unspecified and implementation-defined behavior, with examples of how optimizers exploit UB.',
    },
    {
      title: 'isocpp.org — Get Started',
      url: 'https://isocpp.org/get-started',
      source: 'isocpp',
      note: 'The Standard C++ Foundation\'s starting point, with links to compilers, books and the standardization process.',
    },
  ],
};
