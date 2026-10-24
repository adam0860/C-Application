import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-build-system',
  title: 'UnrealBuildTool, UnrealHeaderTool and Live Coding',
  summary:
    'What really happens when you press Build: the build tool, the reflection code generator, build configurations, Live Coding and its limits, and adding module dependencies.',
  minutes: 18,
  objectives: [
    'Explain what UnrealBuildTool does and why Visual Studio delegates builds to it',
    'Describe what UnrealHeaderTool generates and why Unreal needs a code generator at all',
    'Choose between the Debug, DebugGame, Development and Shipping configurations, and editor vs game targets',
    'Use Live Coding safely, knowing which changes need a full rebuild and an editor restart',
    'Fix "unresolved external symbol" errors by adding module dependencies in `Build.cs`',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'What happens when you press Build',
      blocks: [
        {
          type: 'p',
          text: 'In the C++ course you compiled with `g++` directly, then let [[cmake]] generate the commands. Unreal has its own [[build-system]]: the [[unreal-build-tool]] (UBT), a C# program that ships with the engine. Visual Studio and Rider don\'t really compile Unreal code themselves. When you press Build, the IDE runs a batch file that launches UBT, and UBT does everything else:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Read the rules', text: 'UBT compiles and runs your `.Target.cs` and `.Build.cs` files (C# code) to learn which modules exist, how they depend on each other, and which settings apply for this platform and configuration.' },
            { title: 'Generate reflection code', text: 'It runs the [[unreal-header-tool]] (UHT) over headers that changed, producing extra C++ files that describe your classes to the engine.' },
            { title: 'Compile', text: 'It invokes the real compiler — MSVC on Windows, Clang elsewhere — on your `.cpp` files and the generated ones, in parallel, using precompiled headers.' },
            { title: 'Link', text: 'It links each module into a DLL (editor builds) or everything into one executable (packaged games), and writes the results to `Binaries/`.' },
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Roughly what your IDE runs (Windows)',
          code: `Engine\\Build\\BatchFiles\\Build.bat MyGameEditor Win64 ^
    Development -Project="C:\\Dev\\MyGame\\MyGame.uproject" ^
    -WaitMutex`,
          annotations: [
            { lines: 1, text: '`Build.bat` starts UBT. `MyGameEditor` is the **target** (from `MyGameEditor.Target.cs`) and `Win64` the platform. `^` continues a command on the next line in `cmd.exe`.' },
            { lines: 2, text: 'The configuration and the project to build. On macOS and Linux the equivalent script is `Build.sh`.' },
            { lines: 3, text: 'Wait for any other UBT instance to finish instead of failing — two builds writing the same files would corrupt each other.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just use CMake?',
          text: 'Unreal needs a build tool that understands its **modules** and their public/private dependency rules, runs a **code generator** before compiling, targets a dozen platforms (including console toolchains under NDA), switches between DLL-per-module editor builds and single-executable game builds, and generates project files for several IDEs. UBT was built for exactly that, and because its rules are C# code, they can contain real logic such as "add this library only on Android".',
        },
        {
          type: 'deepdive',
          title: 'Unity builds: why UBT glues your .cpp files together',
          blocks: [
            {
              type: 'p',
              text: 'By default UBT performs [[ue-unity-build|unity builds]]: it generates files such as `Module.MyGame.cpp` that simply `#include` several of your `.cpp` files, and compiles those instead. Shared headers are parsed once per batch rather than once per file, which cuts full-build times dramatically.',
            },
            {
              type: 'p',
              text: 'The catch: a `.cpp` file can accidentally rely on an `#include` that happens to come from a neighbour in the same batch. It compiles today and breaks when files are regrouped. UBT reduces this with **adaptive unity**: files you are currently editing are compiled individually. Always include what you use.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'UBT also writes your IDE project',
      blocks: [
        {
          type: 'p',
          text: 'The `.sln` and project files you open in Visual Studio are not hand-made, and they are not what drives the build. UBT **generates** them from the `.uproject` and the build rules, so the IDE knows which files to list and which include paths and defines to use for IntelliSense.',
        },
        {
          type: 'list',
          items: [
            'Right-click `MyGame.uproject` → **Generate Visual Studio project files**, or use *Tools → Refresh Visual Studio Project* in the editor.',
            'Regenerate after adding, moving or deleting source files outside the IDE, after changing dependencies in a `Build.cs`, and after switching engine versions.',
            'Never edit the generated projects by hand: your changes vanish on the next regeneration. Settings belong in `.Build.cs` and `.Target.cs`.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The vanishing-file trap',
          text: 'Visual Studio\'s *Add → New Item* dialog suggests `Intermediate\\ProjectFiles` as the location for new files, because that is where the generated project lives. Files saved there are deleted with the rest of `Intermediate/`. Create classes from the editor (*Tools → New C++ Class*) or make sure new files go under `Source/MyGame/`, then regenerate.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Why IntelliSense sometimes lies',
          text: 'Red squiggles come from the IDE\'s own code analyser, not from the real compiler. It often struggles with Unreal\'s macros and generated headers, especially before the first build. Trust the **build output**, not the squiggles. Rider and recent Visual Studio versions handle Unreal code much better than older tools did.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'You press **Build** in Visual Studio on an Unreal project. What actually compiles your code?',
      options: [
        {
          text: 'Visual Studio\'s own MSBuild C++ pipeline, using settings stored in the `.vcxproj`',
          why: 'Unreal\'s generated projects are thin wrappers. Their build command simply calls UBT; the `.vcxproj` doesn\'t carry the real compile settings.',
        },
        {
          text: 'UnrealBuildTool, which reads the build rules, runs UHT, then calls the compiler and linker',
          correct: true,
          why: 'The IDE delegates the entire build to UBT, which in turn drives MSVC (on Windows) or Clang.',
        },
        {
          text: 'UnrealHeaderTool, which compiles headers and source files together',
          why: 'UHT only parses headers and writes generated C++. It never produces machine code.',
        },
        {
          text: 'The Unreal Editor, which must be running for any build to work',
          why: 'Builds run without the editor. In fact, with Live Coding enabled, building from the IDE while the editor is open is refused.',
        },
      ],
      explanation:
        'The IDE is a front end: it edits files, shows errors and runs the debugger. UBT is the build system, and the compiler and linker are still MSVC or Clang. Knowing this explains why build settings live in `.Build.cs` files and why regenerating project files is harmless.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'UnrealHeaderTool: the code generator',
      blocks: [
        {
          type: 'p',
          text: 'Here is a header with a few reflection macros. The compiler alone would treat `UCLASS()` and `UPROPERTY()` as macros that expand to nothing. They are really **markers** for UHT, which reads the header *before* the compiler runs:',
        },
        {
          type: 'code',
          title: 'Enemy.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Enemy.generated.h"

UCLASS()
class MYGAME_API AEnemy : public AActor {
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, Category = "Stats")
    float Health = 100.f;

    UFUNCTION(BlueprintCallable, Category = "Stats")
    void ApplyDamage(float Amount);
};`,
          annotations: [
            { lines: 5, text: 'This file does not exist until UHT writes it. It contains the macro definitions that `GENERATED_BODY()` expands into.' },
            { lines: 7, text: 'UHT generates a `UClass` description of `AEnemy` and registers it when the module loads. That is how the editor can list this class and Blueprints can inherit from it.' },
            { lines: 9, text: 'Expands to generated declarations such as `StaticClass()` and the `Super` alias for the parent class.' },
            { lines: '12-13', text: 'UHT records the property\'s name, type, offset inside the object and flags, so the editor can show it, the save system can serialize it and the garbage collector can find it.' },
            { lines: '15-16', text: 'UHT writes a small wrapper function (a "thunk") that the Blueprint virtual machine calls, unpacking `Amount` from the Blueprint stack and calling your C++ function.' },
          ],
        },
        {
          type: 'p',
          text: 'The outputs are `Enemy.generated.h` and `Enemy.gen.cpp`, written to `Intermediate/Build/<Platform>/UnrealEditor/Inc/MyGame/UHT/`. The compiler then builds them alongside your code. You can open them — they are ordinary, if dense, C++.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a code generator?',
          text: 'The editor needs to ask, at run time, "which properties does `AEnemy` have, of what types, at what offsets?" Standard C++ has no run-time [[reflection]], and even C++26\'s new compile-time reflection arrived decades after Unreal needed it. Macros can\'t solve it either: a macro only sees its own arguments, never the members of the surrounding class. So a tool must read the source and write the descriptions. Doing that by hand would be tedious and would silently drift out of date; a generator keeps it exact on every build.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'UHT is a parser, not a compiler',
          text: 'UHT understands only the subset of C++ it needs, so reflected declarations follow extra rules: reflected types can\'t be templates, a `UPROPERTY` can\'t be a nested container such as `TArray<TArray<int32>>`, and reflected members may only be wrapped in specific preprocessor conditions such as `#if WITH_EDITORONLY_DATA`. UHT errors appear *before* compilation, pointing at the header line it could not accept.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'A C++ tool rewritten in C#',
          text: 'For most of Unreal\'s history UHT was a separate C++ program. During the UE5 cycle Epic rewrote it in C# and moved it inside UBT, which made it faster and removed one step from the build. The name and the job stayed the same.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'truefalse',
      prompt: 'UnrealHeaderTool compiles your headers into machine code before the C++ compiler runs.',
      answer: false,
      explanation:
        'UHT never produces machine code. It *parses* headers that contain reflection macros and *writes new C++ source* (`.generated.h` and `.gen.cpp` files). The ordinary compiler then compiles your code and the generated code together. Think of UHT as an automated programmer who writes boilerplate for you on every build.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'order',
      prompt: 'Put the stages of building `MyGameEditor` in the order they happen.',
      lines: [
        'UBT compiles and evaluates the `.Target.cs` and `.Build.cs` rules',
        'UHT parses changed headers and writes `.generated.h` / `.gen.cpp` files',
        'The compiler builds your `.cpp` files and the generated code into object files',
        'The linker produces `UnrealEditor-MyGame.dll` in `Binaries/`',
      ],
      distractors: ['UHT links the object files into the module DLL'],
      linesAreCode: false,
      explanation:
        'Rules come first because they decide which modules, include paths and settings exist. UHT must run before compiling, since your headers include `.generated.h` files that don\'t exist yet. Compilation produces object files, and linking combines them. UHT never links — that is the distractor.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Build configurations and targets',
      blocks: [
        {
          type: 'p',
          text: 'Standard C++ projects usually have Debug and Release. Unreal splits that spectrum further, because the engine is so large that a fully unoptimized build of it is painfully slow. Each [[ue-build-configuration]] decides how optimized the **engine** and **your game code** are, and which development features are compiled in:',
        },
        {
          type: 'table',
          headers: ['Configuration', 'Engine code', 'Your code', 'Use it for'],
          rows: [
            ['**Debug**', 'Unoptimized', 'Unoptimized', 'Debugging the engine itself. Needs a source build; very slow.'],
            ['**DebugGame**', 'Optimized', 'Unoptimized', 'Stepping through *your* code with every variable visible, at near-normal speed'],
            ['**Development**', 'Optimized', 'Optimized', 'Everyday work. Keeps logging, assertions, console commands and debug symbols.'],
            ['**Test**', 'Optimized', 'Optimized', 'Like Shipping, but keeps some profiling and console tools for QA'],
            ['**Shipping**', 'Fully optimized', 'Fully optimized', 'What players get: console commands, stats and most logging stripped'],
          ],
        },
        {
          type: 'p',
          text: 'Combine a configuration with a **target**. Visual Studio\'s dropdown shows the combinations: `Development Editor` builds the editor with your module; plain `Development` or `Shipping` builds the standalone game, which loads cooked content.',
        },
        {
          type: 'compare',
          left: {
            title: 'Editor target (modular)',
            tone: 'neutral',
            text: 'Each module is a separate DLL, such as `UnrealEditor-MyGame.dll`. The engine loads modules on demand, and Live Coding can patch them. This is why classes need an export macro like `MYGAME_API`.',
          },
          right: {
            title: 'Game target (monolithic)',
            tone: 'neutral',
            text: 'Engine and game are linked into **one executable**, such as `MyGame.exe`. Faster start-up, better optimization, nothing to load at run time, and the export macros expand to nothing.',
          },
        },
        {
          type: 'callout',
          variant: 'tip',
          title: '"Variable optimized away"',
          text: 'If the debugger shows locals as *optimized away* or jumps around strangely while you step, you are debugging optimized code. Switch to **DebugGame Editor**: the engine stays fast, and your own module is compiled without optimizations so every line and variable is inspectable.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Test performance in the right build',
          text: 'Never judge your game\'s frame rate in a Debug or DebugGame build, or only in the editor (which carries its own overhead). Profile in Development or Test builds of the standalone game, and verify in Shipping before release.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: 'Complete the sentences about build configurations.',
      templateIsCode: false,
      template:
        'For everyday work, build the ___ Editor configuration. To step through your own code with every variable visible while the engine stays fast, switch to ___ Editor. Players receive a ___ build, with console commands and most logging stripped out.',
      blanks: [{ answers: ['Development'] }, { answers: ['DebugGame'] }, { answers: ['Shipping'] }],
      wordBank: ['Development', 'DebugGame', 'Shipping', 'Debug', 'Release', 'Test'],
      explanation:
        'Development is optimized but keeps debugging aids, which makes it the default. DebugGame unoptimizes only your modules, which gives you a debuggable game without the crawl of a Debug engine. Shipping strips development features for size and speed. There is no "Release" configuration in Unreal — the idea is split across Development, Test and Shipping.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Live Coding: patching the running editor',
      blocks: [
        {
          type: 'p',
          text: 'Restarting the editor after every code change would be slow. [[live-coding]] avoids it: press **Ctrl+Alt+F11** (or the compile button at the bottom right of the editor) and Unreal recompiles the `.cpp` files you changed, links them into a patch, loads it into the *running* editor and redirects the old functions to the new code. You keep your level, your camera position and even an ongoing Play-in-Editor session.',
        },
        {
          type: 'p',
          text: 'It works brilliantly for the most common change: editing **function bodies in `.cpp` files**. It cannot safely handle changes to the *shape* of your classes. Here is why: objects created before the patch are already sitting in memory with the old layout.',
        },
        {
          type: 'memory',
          caption: 'Adding a member to a header changes every offset after it (offsets are illustrative)',
          regions: [
            {
              label: 'AEnemy object already in memory (old layout)',
              kind: 'heap',
              cells: [
                { name: '(AActor members)', value: '…', address: '+0x000' },
                { name: 'Health', value: '100.0', type: 'float', address: '+0x2A0' },
                { name: 'Speed', value: '600.0', type: 'float', address: '+0x2A4' },
              ],
            },
            {
              label: 'What the patched code expects after adding Armor',
              kind: 'other',
              cells: [
                { name: '(AActor members)', value: '…', address: '+0x000' },
                { name: 'Armor', value: 'reads 100.0', type: 'float', address: '+0x2A0', highlight: true },
                { name: 'Health', value: 'reads 600.0', type: 'float', address: '+0x2A4', highlight: true },
                { name: 'Speed', value: 'reads past the object!', type: 'float', address: '+0x2A8', highlight: true },
              ],
            },
          ],
        },
        {
          type: 'table',
          headers: ['Change', 'Live Coding?'],
          rows: [
            ['Edit a function body in a `.cpp`', '**Yes** — this is what it is for'],
            ['Add or remove member variables (class layout changes)', 'No — rebuild and restart'],
            ['Add or change `UPROPERTY` / `UFUNCTION` / `UCLASS` declarations', 'No — reflection data is registered at start-up'],
            ['Change default values in a constructor', 'Unreliable — existing objects and the class defaults were already constructed'],
            ['Add a new class', 'Unreliable — prefer a rebuild and restart'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why constructors are a special case',
          text: 'Unreal runs each class\'s constructor once at start-up to create a template object holding the class defaults, and Blueprint subclasses and placed actors copy their values from it. Patching the constructor afterwards doesn\'t re-run it for objects that already exist, so new defaults seem to be "ignored". An experimental reinstancing option tries to handle some of these cases, but the reliable workflow is: **header or constructor changed → close the editor, build in the IDE, relaunch.**',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'One build at a time',
          text: 'While the editor is running with Live Coding enabled, building from the IDE is refused with a message telling you to exit the editor or press Ctrl+Alt+F11. Both would try to write the same binaries.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      multi: true,
      prompt: 'The editor is open with Live Coding enabled. Which of these changes can you **reliably** apply with Ctrl+Alt+F11? Select all that apply.',
      options: [
        {
          text: 'Fixing a wrong formula inside `AEnemy::ApplyDamage` in `Enemy.cpp`',
          correct: true,
          why: 'A function-body change in a `.cpp` file is exactly what Live Coding patches: the old function is redirected to the new code.',
        },
        {
          text: 'Adding `float Armor;` to `AEnemy` in `Enemy.h`',
          why: 'This changes the class layout. Every existing `AEnemy` in memory has the old layout, so patched code would read the wrong offsets.',
        },
        {
          text: 'Adding a new `UFUNCTION(BlueprintCallable)` declaration',
          why: 'Reflection data is generated by UHT and registered when the module loads, so new reflected functions need a rebuild and editor restart.',
        },
        {
          text: 'Adding a log line inside `AEnemy::BeginPlay` in `Enemy.cpp`',
          correct: true,
          why: 'Another function-body change in a `.cpp`. It takes effect the next time `BeginPlay` runs, for example when you press Play.',
        },
        {
          text: 'Changing `Health = 100.f` to `Health = 150.f` in the constructor',
          why: 'The class default object and existing instances were constructed before the patch, so the new default typically doesn\'t show up until a restart.',
        },
      ],
      explanation:
        'Live Coding swaps **code**, not **data layout**. Function bodies in `.cpp` files are safe. Anything that changes class layout, reflection data or construction-time defaults needs the full loop: close the editor, build in the IDE, relaunch.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Hot Reload: a cautionary history',
      blocks: [
        {
          type: 'p',
          text: 'Before Live Coding, Unreal Engine 4 relied on [[hot-reload]]. When you compiled with the editor open, UBT built a fresh copy of your module under a new numbered name, the editor loaded it next to the old one, and then tried to swap every object of every changed class over to the new version ("reinstancing").',
        },
        {
          type: 'p',
          text: 'In theory that even supported header changes. In practice it was notorious: Blueprints could end up referencing stale, temporarily renamed classes and become corrupted when saved, property values silently reset, and editors crashed in confusing ways. "Never use Hot Reload — always restart the editor" became standard community advice.',
        },
        {
          type: 'list',
          items: [
            '**UE 4.22** introduced Live Coding (built on the commercial Live++ technology) as an alternative.',
            '**UE5** made Live Coding the default; Hot Reload only happens if you disable Live Coding and then build from the IDE with the editor open.',
            'Today\'s rule: use Live Coding for `.cpp` body changes; for everything else, restart. Don\'t re-enable Hot Reload.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is patching code safer than reloading a module?',
          text: 'Live Coding changes as little as possible: it redirects functions and leaves every object, class and Blueprint exactly where it was. Hot Reload tried to replace whole classes while thousands of objects and assets referenced them — a far harder problem, and any mistake corrupted data that could then be saved to disk. Doing less made Live Coding both safer and more predictable.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Adding module dependencies in Build.cs',
      blocks: [
        {
          type: 'p',
          text: 'Sooner or later you will use an engine class that lives outside the default modules — a UI widget, an AI controller, a Niagara effect — and the build fails. Each engine feature is its own module, and your module may only use modules it **declares** as dependencies. A typical error when you forget:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Build output',
          code: `error LNK2019: unresolved external symbol
  "__declspec(dllimport) public: static class UClass *
  __cdecl UUserWidget::GetPrivateStaticClass(void)"`,
          annotations: [
            { lines: 1, text: 'A [[linker-error]]: your code compiled, but the linker couldn\'t find the function\'s definition because the module that contains it (`UMG`) isn\'t linked. Sometimes you get an earlier error instead — "cannot open include file" — because the module\'s include paths weren\'t added either.' },
            { lines: 2, text: '`dllimport`: your code expected to import this symbol from another module\'s DLL.' },
          ],
        },
        {
          type: 'code',
          lang: 'csharp',
          title: 'MyGame.Build.cs (fixed)',
          code: `PublicDependencyModuleNames.AddRange(new string[] {
    "Core", "CoreUObject", "Engine", "InputCore",
    "EnhancedInput"
});

PrivateDependencyModuleNames.AddRange(new string[] {
    "UMG", "Slate", "SlateCore"
});`,
          annotations: [
            { lines: '1-4', text: '**Public** dependencies: modules whose headers your *public* headers include. Anyone who depends on `MyGame` also gets their include paths, because they will see those includes too.' },
            { lines: '6-8', text: '**Private** dependencies: modules used only from your `.cpp` files (or private headers). Your dependents don\'t inherit them, which keeps their builds leaner.' },
          ],
        },
        {
          type: 'table',
          headers: ['You want to use…', 'Module to add'],
          rows: [
            ['Widgets (`UUserWidget`, `CreateWidget`)', '`UMG` (plus `Slate`, `SlateCore` for lower-level UI)'],
            ['AI controllers, behavior trees', '`AIModule`'],
            ['Navigation mesh queries', '`NavigationSystem`'],
            ['Niagara particle systems', '`Niagara`'],
            ['Gameplay Tags', '`GameplayTags`'],
            ['Enhanced Input', '`EnhancedInput` (already in the template)'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'How to find a class\'s module',
          text: 'Look at the class declaration: `class UMG_API UUserWidget` — the export macro names the module (`UMG`). The API reference page for every class also lists its module and the header to include.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'After editing Build.cs',
          text: 'UBT re-reads the rules on every build, so the next build picks up the change. Regenerate project files as well, so IntelliSense learns the new include paths. If the module comes from a plugin, the plugin must also be enabled.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'bug',
      prompt: '`HUDManager.cpp` includes `Blueprint/UserWidget.h` and calls `CreateWidget<UUserWidget>(…)`. The build fails with errors about `UUserWidget`. The C++ is correct. Tap a line in `MyGame.Build.cs` that needs to change.',
      lang: 'csharp',
      code: `using UnrealBuildTool;

public class MyGame : ModuleRules {
    public MyGame(ReadOnlyTargetRules Target) : base(Target) {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[] {
            "Core", "CoreUObject", "Engine", "InputCore"
        });

        PrivateDependencyModuleNames.AddRange(
            new string[] { });
    }
}`,
      bugLines: [8, 12],
      hint: 'Which engine module owns `UUserWidget`? Is it listed anywhere?',
      explanation:
        '`UUserWidget` lives in the `UMG` module (its declaration reads `class UMG_API UUserWidget`), and `UMG` appears in neither dependency list. Without it, UBT adds neither UMG\'s include paths nor its library, so you get "cannot open include file" or unresolved external symbols. Since only a `.cpp` uses it, the cleanest fix is a private dependency: `new string[] { "UMG" }` on line 12 (adding it to the public list on line 8 also works, but leaks the dependency to anyone who depends on `MyGame`).',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'Your **public** header `WeaponBase.h` contains `#include "NiagaraSystem.h"` because it declares a `UNiagaraSystem*` member. Which dependency list should `"Niagara"` go in?',
      options: [
        {
          text: '`PrivateDependencyModuleNames`, because it is only used by `MyGame`',
          why: 'Any module that includes `WeaponBase.h` will also hit `#include "NiagaraSystem.h"`. With a private dependency, they wouldn\'t get Niagara\'s include paths and would fail to compile.',
        },
        {
          text: '`PublicDependencyModuleNames`, because a public header includes Niagara headers',
          correct: true,
          why: 'Public dependencies propagate include paths to your dependents — exactly what is needed when your public headers include another module\'s headers.',
        },
        {
          text: 'Neither: enabling the Niagara plugin is enough',
          why: 'Enabling a plugin makes its modules load at run time, but the compiler still needs the include paths and the linker the library, which come only from `Build.cs`.',
        },
        {
          text: 'The `Modules` list in `MyGame.uproject`',
          why: 'That list declares *your* project\'s modules, not the engine modules they depend on.',
        },
      ],
      explanation:
        'The rule follows the includes. If a module\'s headers appear in your **public** headers, make it a public dependency; if only your `.cpp` files use it, make it private. A common refinement is to forward-declare `class UNiagaraSystem;` in the header instead of including it, which lets the dependency become private and speeds up compiles for every file that includes `WeaponBase.h`.',
    },
  ],
  takeaways: [
    'UnrealBuildTool is Unreal\'s build system: it evaluates C# build rules, runs UHT, drives MSVC or Clang and the linker, and generates your IDE project files.',
    'UnrealHeaderTool parses headers with reflection macros and writes `.generated.h` and `.gen.cpp` files, because standard C++ cannot describe its own classes at run time.',
    'Use Development Editor day to day, DebugGame Editor to step through your own code, and test performance in Development, Test or Shipping builds of the game.',
    'Editor builds are modular (one DLL per module); packaged games are monolithic (one executable).',
    'Live Coding (Ctrl+Alt+F11) patches function bodies in `.cpp` files; header, reflection, layout and constructor changes need a rebuild and an editor restart.',
    'Hot Reload was Live Coding\'s unreliable predecessor; don\'t re-enable it.',
    'When you use a new engine feature, add its module to `Build.cs`: public if your public headers include it, private otherwise.',
  ],
  reading: [
    {
      title: 'Unreal Build Tool',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-build-tool-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How UBT is structured, its command-line options and how build rules are evaluated.',
    },
    {
      title: 'Build Configurations Reference',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/build-configurations-reference-for-unreal-engine',
      source: 'unreal-docs',
      note: 'The official definitions of every configuration and target type.',
    },
    {
      title: 'Using Live Coding to recompile Unreal Engine applications at runtime',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/using-live-coding-to-recompile-unreal-engine-applications-at-runtime',
      source: 'unreal-docs',
      note: 'Live Coding settings, the reinstancing option and its documented limitations.',
    },
    {
      title: 'Live++',
      url: 'https://liveplusplus.tech/',
      source: 'other',
      note: 'The hot-patching technology Live Coding is built on; its documentation explains how function patching works.',
    },
  ],
};
