import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-why-cpp',
  title: 'Why C++ in Unreal? C++ and Blueprints',
  summary:
    'What Unreal Engine is, when to reach for C++ versus Blueprints, how teams combine them, and how Unreal C++ differs from the C++ you already know.',
  minutes: 16,
  objectives: [
    'Describe what Unreal Engine is and where your game code fits into it',
    'Weigh C++ against Blueprints on performance, version control, scale, API access and iteration speed',
    'Explain the standard workflow of C++ base classes extended by Blueprint subclasses',
    'List the main ways Unreal C++ differs from standard C++ and the reason behind each difference',
    'Choose the tools you need: an IDE, a compiler toolchain and an engine version',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'What Unreal Engine actually is',
      blocks: [
        {
          type: 'p',
          text: 'You have finished a whole course of standard C++. Now you will use it inside one of the largest C++ programs ever written. [[unreal-engine]] is a game engine made by Epic Games: millions of lines of C++ that already know how to render a frame, simulate physics, play audio, animate skeletons, replicate state over a network and load levels from disk.',
        },
        {
          type: 'p',
          text: 'The most important mental shift is this: **you do not write the program — you extend it.** There is no `main()` for you to write. The engine owns the entry point and the main loop, and every frame it calls into *your* classes through virtual functions such as `BeginPlay` and `Tick`. Your game is a [[ue-module|module]] of code that the engine loads, plus a folder of [[asset|assets]] (meshes, sounds, levels) that the [[unreal-editor]] lets you build visually.',
        },
        {
          type: 'table',
          headers: ['Engine system', 'What it gives you for free'],
          rows: [
            ['Renderer (Nanite, Lumen)', 'Drawing millions of triangles with dynamic global illumination'],
            ['Chaos physics', 'Rigid bodies, collision, destruction, vehicles'],
            ['Gameplay framework', 'Ready-made classes for players, game rules, cameras and input'],
            ['Networking', 'Client–server replication of objects, properties and function calls'],
            ['Editor', 'A level editor, asset pipeline, profilers and visual scripting'],
          ],
          caption: 'A tiny slice of what the engine already does before you write a line',
        },
        {
          type: 'p',
          text: 'There are two ways to write gameplay logic on top of all this: **C++**, and **[[blueprint|Blueprints]]**, Unreal\'s visual scripting system. Professional projects use both. This lesson is about why, and about the dialect of C++ you will be writing.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'From UnrealScript to C++ and Blueprints',
          text: 'Unreal Engines 1 to 3 had their own scripting language, **UnrealScript**, which ran in a virtual machine on top of the C++ engine. It was much slower than native code, and anything serious still needed C++ glue underneath it. When Unreal Engine 4 arrived in 2014, Epic removed UnrealScript entirely: programmers write C++ directly, and designers use Blueprints. Unreal Engine 5 (2022) kept that split. This course targets UE 5.4 and later.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Blueprints: visual scripting',
      blocks: [
        {
          type: 'p',
          text: 'A Blueprint is a graph of **nodes** connected by wires. White "execution" wires decide what runs next; coloured wires carry data. Under the hood the editor compiles the graph to **bytecode**, which a small virtual machine inside the engine interprets at run time — much like UnrealScript did, but with a visual front end.',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'A Blueprint graph, written out as text',
          code: `[Event BeginPlay]
    |
    v
[Set Health] <-- (Max Health: 100)
    |
    v
[Print String] <-- ("Ready!")`,
          annotations: [
            { lines: 1, text: 'An **event node**: the engine fires it when the actor starts playing — the Blueprint twin of overriding `BeginPlay()` in C++.' },
            { lines: 4, text: 'A variable assignment. The value on the right arrives through a data wire from another node or a literal typed into the node.' },
            { lines: 7, text: '`Print String` writes to the screen and the log. Each box here is one node the virtual machine steps through.' },
          ],
        },
        {
          type: 'p',
          text: 'Blueprints have real strengths, and it would be a mistake to treat them as "C++ for people who can\'t code":',
        },
        {
          type: 'list',
          items: [
            '**Fast iteration.** Compiling a Blueprint takes about a second and never requires restarting the editor.',
            '**Designer friendly.** Level designers, technical artists and animators can build and tune behaviour without touching an IDE.',
            '**Visual debugging.** You can set breakpoints on nodes and watch execution flow along the wires while the game runs.',
            '**Tight integration with assets.** Picking a mesh, a sound or a particle effect is a dropdown, not a hard-coded file path.',
          ],
        },
        {
          type: 'definition',
          term: 'Blueprint Class',
          text: 'A [[blueprint-class]] is an asset that **subclasses** another class — often one you wrote in C++. It can add components, variables and graphs, and override events, exactly like a derived class in C++ inherits from a base class.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'Which task is the **best** fit for a Blueprint rather than C++?',
      options: [
        {
          text: 'Making a drawbridge in one specific level lower when the player pulls a lever',
          correct: true,
          why: 'One-off, level-specific, visual behaviour that a designer will want to tweak is exactly what Blueprints are good at — and it runs once, so performance is irrelevant.',
        },
        {
          text: 'A pathfinding routine that searches a 10,000-tile grid every frame',
          why: 'This is a tight, math-heavy loop. Per-node virtual machine overhead would dominate; it belongs in C++.',
        },
        {
          text: 'The base inventory system shared by every character in the game',
          why: 'Shared, core systems benefit from C++: text diffs, code review, refactoring tools and full engine access. Blueprints can still extend it.',
        },
        {
          text: 'Integrating a third-party C++ physics library',
          why: 'Blueprints cannot call arbitrary C++ libraries. Only C++ can talk to the library — and then expose a safe interface to Blueprints if needed.',
        },
      ],
      explanation:
        'A useful rule of thumb: if logic is **content-specific, visual, or one-off**, Blueprints shine. If it is **performance-critical, shared by many classes, complex, or needs engine/library APIs Blueprints cannot see**, write it in C++. Most real features are a mix of both.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Where C++ wins',
      blocks: [
        {
          type: 'p',
          text: 'Blueprints are great for some jobs, but they have structural limits. Four of them push teams toward C++ for anything foundational.',
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Performance',
              text: 'Every Blueprint node executed goes through the virtual machine: it looks up the function, copies parameters into and out of a stack frame, then dispatches. If a graph mostly calls a few engine functions, the overhead barely matters — the real work happens inside those functions, which are C++. But logic made of many small steps (loops over hundreds of actors, per-frame math, procedural generation) is dominated by that overhead, and the same logic in C++ is commonly an order of magnitude faster or more.',
            },
            {
              title: 'Diffs, merging and code review',
              text: 'Blueprints are saved inside binary `.uasset` files. Git and Perforce cannot merge two people\'s edits to the same Blueprint, so teams must lock files and take turns. A pull request shows only "binary file changed" — no line-by-line review. C++ is plain text: you get diffs, `git blame`, three-way merges and review comments on exact lines.',
            },
            {
              title: 'Complex systems',
              text: 'Large graphs become "Blueprint spaghetti" that is hard to search, refactor or reason about. C++ gives you functions and classes that fit on a screen, templates, real data structures, compile-time type checking, IDE refactoring and multithreading.',
            },
            {
              title: 'The full engine API',
              text: 'Blueprints see only the functions and properties that C++ has explicitly exposed to them. Large parts of the engine — and every third-party library — are C++-only. And the only way to expose something *new* to Blueprints is to write C++.',
            },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'In a Blueprint',
            tone: 'neutral',
            text: 'A `For Each Loop` node over 500 enemies, with `Get Actor Location`, `Distance`, `Branch` and `Set` nodes inside. Each iteration executes several nodes through the virtual machine — every frame.',
          },
          right: {
            title: 'In C++',
            tone: 'good',
            code: `for (AEnemy* Enemy : Enemies) {
    const double DistSq = FVector::DistSquared(
        Enemy->GetActorLocation(), MyLocation);
    if (DistSq < BestDistSq) {
        BestDistSq = DistSq;
        Closest = Enemy;
    }
}`,
            text: 'The same loop compiles to a few machine instructions per enemy. (The types are explained in later lessons.)',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why doesn\'t Epic just make Blueprints as fast as C++?',
          text: 'The virtual machine is what makes Blueprints pleasant: graphs recompile in a second, can be debugged visually, and a bad node cannot corrupt memory the way a bad pointer can. That flexibility has a cost. Unreal Engine 4 experimented with **Blueprint nativization** (converting graphs to C++ when packaging), but it was fragile and Epic removed it in UE5. The official answer is the hybrid workflow you will see next.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Fair to Blueprints',
          text: 'C++ iteration is slower: a change means compiling (seconds to minutes) and, for some changes, restarting the editor. That cost is real, which is why tuning values and presentation usually live in Blueprints even on C++-heavy teams.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'truefalse',
      prompt: 'Because the editor compiles Blueprints before running them, a Blueprint loop runs as fast as the equivalent C++ loop.',
      answer: false,
      explanation:
        'Blueprints compile to **bytecode**, not to machine code. A virtual machine interprets that bytecode node by node at run time, paying overhead on every node. C++ compiles to native machine code ahead of time. The gap is small when a graph mostly calls heavyweight engine functions, but large for loops and per-frame math.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'The standard workflow: C++ foundations, Blueprint finish',
      blocks: [
        {
          type: 'p',
          text: 'Almost every professional Unreal team follows the same pattern. Programmers write a **C++ base class** containing the data and core logic. Designers create **Blueprint subclasses** of it that choose assets, tune numbers and add one-off presentation. Here is a typical base class. Don\'t worry about every macro yet — each gets its own lesson — but notice how it *exposes* things to Blueprints:',
        },
        {
          type: 'code',
          title: 'WeaponBase.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "WeaponBase.generated.h"

UCLASS(Abstract)
class MYGAME_API AWeaponBase : public AActor {
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Weapon")
    void Fire();

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Weapon")
    float Damage = 20.f;

    UPROPERTY(EditDefaultsOnly, Category = "Weapon")
    int32 MagazineSize = 30;

    UFUNCTION(BlueprintImplementableEvent, Category = "Weapon")
    void OnFired();
};`,
          annotations: [
            { lines: '3-5', text: 'Includes. The `.generated.h` file is produced by Unreal\'s code generator and must always be the **last** include — the first-class lesson explains why.' },
            { lines: 7, text: '`UCLASS` registers the class with Unreal\'s [[reflection]] system. `Abstract` means nobody can place a plain `AWeaponBase` in a level — only concrete subclasses.' },
            { lines: 8, text: 'An ordinary C++ class deriving from `AActor`, the engine\'s base for anything placed in a level. `MYGAME_API` exports it from the module.' },
            { lines: 13, text: '`BlueprintCallable` lets Blueprint graphs call `Fire()`. The logic itself lives in C++, in `WeaponBase.cpp`.' },
            { lines: '17-21', text: '`EditDefaultsOnly` lets a designer change `Damage` and `MagazineSize` in each Blueprint subclass — a shotgun and a rifle get different numbers with zero code.' },
            { lines: '23-24', text: '`BlueprintImplementableEvent`: C++ *declares* the event and calls it; the Blueprint subclass *implements* it — perfect for muzzle flashes and sounds.' },
          ],
        },
        {
          type: 'p',
          text: 'A designer then creates `BP_Shotgun` and `BP_Rifle` as Blueprint children of `AWeaponBase`, assigns meshes and sounds, sets `Damage` and `MagazineSize`, and implements `OnFired` to spawn effects. Neither needs a programmer for day-to-day changes.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why put the base class in C++ and not the other way round?',
          text: 'Dependencies only flow one way. A Blueprint can inherit from a C++ class and call anything C++ exposes, but C++ code cannot (sanely) see variables or functions that only exist in a Blueprint. So anything that **more than one class needs to rely on** — base classes, shared data types, interfaces, core systems — must live in C++. Blueprints sit at the leaves of the class tree.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'The instrument and the musician',
          text: 'Programmers build the instrument in C++: they decide which knobs exist and guarantee it never falls apart. Designers play it in Blueprints: they turn the knobs and compose the performance. A good C++ class is judged by how much it lets designers do without asking for code changes.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Keep asset references out of C++',
          text: 'Hard-coding asset paths such as `"/Game/Meshes/SM_Rifle"` in C++ breaks the moment an artist renames or moves the file. Let the Blueprint subclass choose assets through properties instead.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'order',
      prompt: 'Put the steps of the standard C++/Blueprint workflow in order for a new "door" feature.',
      lines: [
        'Write an `ADoorBase` C++ class with open/close logic',
        'Expose tunable values with `UPROPERTY` and callable functions with `UFUNCTION`',
        'Compile the C++ code',
        'In the editor, create `BP_CastleDoor` as a Blueprint child of `ADoorBase`',
        'Assign the mesh and sounds and tune the open speed in `BP_CastleDoor`',
      ],
      linesAreCode: false,
      explanation:
        'The C++ base comes first because the Blueprint must have something to inherit from, and the exposure macros decide what the Blueprint is allowed to see. The class only appears in the editor after compiling. The Blueprint child then supplies content and tuning — the parts that change most often and need no programmer.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Unreal C++ is still C++ — with a dialect',
      blocks: [
        {
          type: 'p',
          text: 'Everything from the C++ course still applies: classes, virtual functions, references, templates, lambdas, RAII, move semantics. But Unreal layers its own conventions on top, and you will notice them immediately. Each one exists for a concrete reason:',
        },
        {
          type: 'table',
          headers: ['Topic', 'Standard C++', 'Unreal C++', 'Why'],
          rows: [
            ['Type information', 'No run-time reflection', '`UCLASS`, `UPROPERTY`, `UFUNCTION` macros plus generated code', 'The editor, Blueprints, saving and networking must discover classes and properties while the program runs'],
            ['Object lifetime', '`new`/`delete`, smart pointers', '`UObject`s are created by the engine and **garbage collected**', 'Levels, Blueprints and the editor all hold references; the collector knows when nobody does'],
            ['Containers and text', '`std::vector`, `std::string`', '`TArray`, `TMap`, `FString`, `FName`, `FText`', 'They plug into reflection, serialization and the editor, and behave identically on every platform'],
            ['Errors', 'Exceptions', 'Exceptions **off** by default; assertions and return values', 'Code size, unpredictable cost when thrown, historic console support'],
            ['Casting', '`dynamic_cast`, `typeid` (RTTI)', 'RTTI **off** by default; `Cast<T>()`', '`Cast<T>` uses Unreal\'s own reflection data, which already exists'],
            ['Building', 'CMake, Makefiles…', 'UnrealBuildTool with C# build rules', 'One tool that understands modules, platforms and code generation'],
          ],
        },
        {
          type: 'p',
          text: 'The reflection macros are the most visible difference. Standard C++ cannot answer questions like "what properties does this class have?" at run time. Unreal solves that with a code generator, the [[unreal-header-tool]], which reads your headers before the compiler does and writes extra C++ describing every marked class, property and function. The macros are markers for that tool.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why turn off exceptions?',
          text: 'Exception support adds unwind tables and extra code to every function that might be unwound through, and throwing is slow and hard to bound — bad news when you have 16 milliseconds per frame. Several consoles historically had poor or no support for them. So Unreal compiles with exceptions disabled: programmer errors should crash loudly with an assertion during development, and expected failures (a file that might not exist) are reported with return values. A module can opt back in with `bEnableExceptions = true;` in its build rules, typically to wrap a third-party library that throws.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The standard library is not banned — but it is not the default',
          text: 'Epic\'s coding standard allows some standard facilities where Unreal has no better equivalent (`<atomic>` is a common example). But anything the editor, Blueprints, saving or networking must see has to use Unreal types: a `UPROPERTY` cannot hold a `std::vector` or a `std::string`. In practice you will write `TArray` and `FString` almost everywhere.',
        },
        {
          type: 'deepdive',
          title: 'What about C++26 reflection?',
          blocks: [
            {
              type: 'p',
              text: 'C++26 adds **static reflection**: compile-time introspection of types and members. It is a big step, but Unreal\'s system predates it by two decades, also stores editor **metadata** (display names, categories, slider ranges, tooltips), and is needed at **run time** by tools such as the editor and the Blueprint virtual machine. Expect Unreal\'s macros to remain for a long time.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Select **all** statements that are true for a default Unreal Engine C++ project.',
      options: [
        {
          text: 'C++ exceptions are disabled',
          correct: true,
          why: 'Modules compile with exceptions off unless they explicitly set `bEnableExceptions = true` in their build rules.',
        },
        {
          text: '`UObject`-derived objects are cleaned up by a garbage collector',
          correct: true,
          why: 'The engine tracks references to `UObject`s and destroys unreachable ones. You do not `delete` them.',
        },
        {
          text: 'You use `dynamic_cast` with C++ RTTI to downcast engine objects',
          why: 'RTTI is off by default. Unreal\'s `Cast<T>()` uses the engine\'s own reflection data instead.',
        },
        {
          text: 'You write `int main()` to start the game loop',
          why: 'The engine owns the entry point and main loop. Your classes are called back through virtual functions such as `BeginPlay` and `Tick`.',
        },
        {
          text: 'Engine types such as `TArray` and `FString` are preferred over `std::vector` and `std::string`',
          correct: true,
          why: 'Unreal containers and strings integrate with reflection, serialization and the editor — and only they can be `UPROPERTY`s.',
        },
      ],
      explanation:
        'Unreal C++ keeps the language but changes the defaults: no exceptions, no RTTI, garbage-collected `UObject`s, engine containers and strings, and an engine-owned main loop. Each change trades a little standard-C++ familiarity for performance, portability, or integration with the editor and Blueprints.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: 'This code comes from a C++ programmer\'s first week in Unreal. `UDamageReport` derives from `UObject`. Tap the line that breaks Unreal\'s rules.',
      code: `void AWeaponBase::Fire() {
    UDamageReport* Report = NewObject<UDamageReport>(this);
    Report->Damage = Damage;
    SubmitReport(Report);
    delete Report;
}`,
      bugLines: [5],
      hint: 'Who owns a `UObject` in Unreal?',
      explanation:
        '`UObject`s are owned by the engine\'s [[ue-garbage-collector|garbage collector]], not by you. Calling `delete` bypasses the engine\'s bookkeeping: the object is still registered in the global object table and anything that kept a reference now dangles, so you typically get an assertion or a crash when the collector later processes it. The fix is to simply stop referencing the object and let garbage collection reclaim it (actors are removed with `Destroy()`). The garbage-collection lesson explains how the engine tracks references.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Your toolbox: IDE, compiler and engine version',
      blocks: [
        {
          type: 'p',
          text: 'To write Unreal C++ you need three things: the engine itself, a C++ toolchain the engine supports, and an IDE that can handle a code base this large.',
        },
        {
          type: 'table',
          headers: ['Tool', 'Options', 'Notes'],
          rows: [
            ['IDE (Windows)', 'Visual Studio 2022, JetBrains Rider', 'In the Visual Studio installer, select the **Game development with C++** workload and its Unreal Engine components. Rider understands Unreal macros and Blueprint usages out of the box and is free for non-commercial use.'],
            ['IDE (macOS / Linux)', 'Xcode (required on Mac), Rider, VS Code', 'Unreal generates project files for each of these.'],
            ['Compiler', 'MSVC on Windows, Clang elsewhere', 'Comes with the IDE/toolchain. Each engine version\'s release notes list the exact supported versions.'],
            ['Engine', 'Epic Games Launcher build, or a source build from GitHub', 'The launcher build is quickest to install. A source build lets you modify and debug the engine itself.'],
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'Install the engine', text: 'Install the Epic Games Launcher and add an engine version (for example 5.4 or later). In the version\'s options, enable **Editor symbols for debugging** so you can step into engine code in the debugger.' },
            { title: 'Install the IDE', text: 'Install Visual Studio 2022 with the game-development workload, or Rider. Point the editor at it under *Editor Preferences → Source Code*.' },
            { title: 'Create a C++ project', text: 'In the project browser choose a template, select **C++** (not Blueprint), and create it. The editor generates the project files and compiles the starter module for you.' },
            { title: 'Open the solution', text: 'Use *Tools → Open Visual Studio* (or *Open Rider*) to open the generated code project, and build the **Development Editor** configuration.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Pick an engine version and stick to it',
          text: 'Every project records the engine version it belongs to. Engine upgrades sometimes rename or deprecate APIs, and assets saved in a newer engine cannot be opened in an older one. Upgrade deliberately, as a team, on a branch — never by accident because one person installed a newer version.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Launcher build or source build?',
          text: 'Start with the launcher build. You need a source build when you must change the engine, build a **dedicated server** target, or use the full Debug configuration of the engine. Source access requires linking your Epic Games account to GitHub.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'fill',
      prompt: 'Complete the sentence about how Unreal changes standard C++ defaults.',
      templateIsCode: false,
      template:
        'By default Unreal compiles with C++ ___ disabled, so errors are handled with assertions and return values. RTTI is also off, so instead of `dynamic_cast` you downcast with ___. `UObject`s are never deleted by hand; the ___ reclaims them.',
      blanks: [
        { answers: ['exceptions'] },
        { answers: ['Cast<T>()', 'Cast<T>', 'Cast'] },
        { answers: ['garbage collector', 'GC'] },
      ],
      wordBank: ['exceptions', 'Cast<T>()', 'garbage collector', 'templates', 'static_cast', 'destructor', 'reinterpret_cast'],
      explanation:
        'Exceptions are disabled for code-size and performance reasons; RTTI is unnecessary because Unreal already keeps its own reflection data, which `Cast<T>()` uses; and `UObject` lifetime belongs to the garbage collector because many systems (levels, Blueprints, the editor) can hold references at once. `static_cast` would compile but performs no run-time check, so it cannot tell you whether the object really is of the derived type.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'Two designers edit the same Blueprint on different branches. What happens when the branches are merged in Git?',
      options: [
        {
          text: 'Git merges the node graphs automatically, like it merges text',
          why: 'Git merges line by line. A `.uasset` is binary, so there are no lines to merge.',
        },
        {
          text: 'Git reports a conflict on a binary file, and one person\'s changes must be redone by hand',
          correct: true,
          why: 'Binary assets cannot be three-way merged. Someone keeps one version and re-applies the other edits manually — which is why teams lock Blueprints while editing them.',
        },
        {
          text: 'The editor merges them when the project is next opened',
          why: 'The editor has a visual **diff** tool for comparing Blueprints, but it does not merge two divergent versions.',
        },
        {
          text: 'Nothing goes wrong, because Blueprints are stored as JSON',
          why: 'Blueprints are serialized into binary `.uasset` files, not JSON or any other text format.',
        },
      ],
      explanation:
        'This is one of the strongest practical arguments for keeping shared, frequently edited logic in C++: text files diff, merge and review cleanly. Teams that use Blueprints heavily rely on **file locking** (Perforce exclusive checkout or Git LFS locks) so only one person edits an asset at a time.',
    },
  ],
  takeaways: [
    'Unreal Engine is a huge C++ program that owns `main` and the game loop; your code extends it through classes the engine calls back into.',
    'Blueprints are visual scripts compiled to bytecode: fast to iterate on and designer friendly, but slower for heavy logic and impossible to merge or review as text.',
    'C++ wins for performance, version control, complex systems and access to the full engine API.',
    'The standard workflow is a C++ base class that exposes properties and functions, extended by Blueprint subclasses that supply assets and tuning.',
    'Unreal C++ adds reflection macros and a code generator, garbage-collected `UObject`s and its own containers and strings, and turns off exceptions and RTTI by default.',
    'You need an IDE (Visual Studio or Rider), the matching compiler toolchain, and one engine version that the whole team sticks to.',
  ],
  reading: [
    {
      title: 'Programming with C++ in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/programming-with-cplusplus-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s entry point to C++ programming, with links to every major subsystem.',
    },
    {
      title: 'Blueprints Visual Scripting in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprints-visual-scripting-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Overview of what Blueprints can do — useful for knowing what your C++ will be extended with.',
    },
    {
      title: 'Epic C++ Coding Standard',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine',
      source: 'unreal-docs',
      note: 'The rules Epic\'s own engineers follow, including the guidance on using the standard library.',
    },
    {
      title: 'Setting up Visual Studio for Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-visual-studio-development-environment-for-cplusplus-projects-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Which Visual Studio workloads and components to install, and recommended settings.',
    },
  ],
};
