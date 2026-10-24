import type { GlossaryEntry, ReadingRef } from '../types';

/*
 * Core Unreal Engine glossary. One entry per id in UNREAL_GLOSSARY_IDS
 * (scripts/glossary-master.ts). Targets Unreal Engine 5.4+.
 */

const ue = (slug: string, title: string, note: string): ReadingRef => ({
  title,
  url: `https://dev.epicgames.com/documentation/en-us/unreal-engine/${slug}`,
  source: 'unreal-docs',
  note,
});

export const unrealGlossary: GlossaryEntry[] = [
  // ------------------------------------------------------------ Project & Build
  {
    id: 'unreal-engine',
    term: 'Unreal Engine',
    aliases: ['UE', 'UE5'],
    course: 'unreal',
    category: 'Project & Build',
    short:
      'Epic Games\' real-time 3D engine and toolset, written in C++, used for games, film and simulation. Gameplay code is written in C++, Blueprint, or both.',
    long:
      'Unreal Engine (UE) is a complete game engine: renderer (Nanite, Lumen), physics (Chaos), audio, animation, networking, an editor, and a large C++ framework that your game code plugs into. Your game ships as one or more modules that link against the engine\'s modules.\n\nUnreal C++ is standard C++ (UE 5.3 and later compile with C++20 by default) plus a layer of engine conventions: reflection macros parsed by UnrealHeaderTool, a garbage-collected `UObject` hierarchy, its own containers (`TArray`, `TMap`) and string types (`FString`, `FName`, `FText`). Most of the "magic" is generated code you could read if you wanted to.\n\nThe full engine source is available on GitHub once you link your GitHub account to your Epic account. Stepping into engine code in the debugger is one of the best ways to learn how it really works.',
    example: `// A taste of Unreal C++: standard C++ plus engine types
UCLASS()
class MYGAME_API AMyActor : public AActor {
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere)
    int32 MaxHealth = 100;
};`,
    see: ['unreal-editor', 'blueprint', 'reflection', 'cpp'],
  },
  {
    id: 'unreal-editor',
    term: 'Unreal Editor',
    course: 'unreal',
    category: 'Project & Build',
    short:
      'The desktop application where you build levels, edit assets and Blueprints, configure the project and press Play to test. It loads your game modules as DLLs.',
    long:
      'The editor is itself an Unreal Engine program: it links the same runtime modules as your game plus editor-only modules (asset editors, the Details panel, importers). When you open a C++ project, the editor loads your game module so your classes appear in the Content Browser and the Details panel.\n\nThe Details panel is driven by reflection: any property marked `UPROPERTY(EditAnywhere)` shows up there automatically, which is why designers can tune values without touching code.\n\nPlay In Editor (PIE) runs your game inside the editor process, in a separate copy of the world. Code that only makes sense in the editor must be wrapped in `#if WITH_EDITOR` so packaged builds still compile.',
    example: `#if WITH_EDITOR
void AMyActor::PostEditChangeProperty(
    FPropertyChangedEvent& Event) {
    Super::PostEditChangeProperty(Event);
    // React to a value changed in the Details panel
}
#endif`,
    see: ['unreal-engine', 'uproject-file', 'edit-anywhere', 'live-coding'],
  },
  {
    id: 'blueprint',
    term: 'Blueprint',
    aliases: ['Blueprints', 'Blueprint Visual Scripting'],
    course: 'unreal',
    category: 'Blueprint Exposure',
    short:
      'Unreal\'s node-based visual scripting system. Blueprint graphs run on the engine\'s script virtual machine and can call into, extend and be called from C++ through reflection.',
    long:
      'Blueprint lets designers and programmers build gameplay by wiring nodes instead of typing code. Under the hood a graph is compiled to bytecode executed by the script VM, which is why tight per-frame loops are slower in Blueprint than in native C++.\n\nThe usual professional split: C++ for systems, performance-critical code and the core rules; Blueprint for content, tuning, one-off level logic and fast iteration. C++ hands building blocks to Blueprint with `UFUNCTION(BlueprintCallable)`, `UPROPERTY(BlueprintReadWrite)` and events such as `BlueprintImplementableEvent`.\n\nBlueprint can only see what reflection exposes. A plain C++ member function or a `std::vector` member is invisible to it, which is one reason Unreal has its own reflected types.',
    example: `UFUNCTION(BlueprintCallable, Category = "Health")
void Heal(float Amount);

UFUNCTION(BlueprintImplementableEvent, Category = "Health")
void OnHealed(float NewHealth);`,
    see: ['blueprint-class', 'blueprint-callable', 'reflection', 'ufunction'],
    reading: [
      ue(
        'blueprints-visual-scripting-in-unreal-engine',
        'Blueprints Visual Scripting',
        'The overview of what Blueprints are and how they relate to C++ classes.',
      ),
    ],
  },
  {
    id: 'blueprint-class',
    term: 'Blueprint Class',
    course: 'unreal',
    category: 'Blueprint Exposure',
    short:
      'An asset that defines a new class by inheriting from a C++ class (or another Blueprint class) and adding components, default values and graph logic.',
    long:
      'A Blueprint Class is a real class in Unreal\'s type system: it has a parent, a Class Default Object, and can be spawned, cast to and referenced like a C++ class. The common pattern is a C++ base (`AEnemyBase`) with Blueprint subclasses (`BP_Goblin`, `BP_Orc`) that set meshes, sounds and tuning values.\n\nC++ cannot name a class that only exists as an asset, so it refers to Blueprint classes through `TSubclassOf<T>` properties that designers fill in, e.g. which projectile class a weapon spawns.\n\nPitfall: hard-coding Blueprint asset paths in C++ (`ConstructorHelpers::FClassFinder`) is brittle, because renaming or moving the asset breaks the code. Prefer an editable `TSubclassOf` property.',
    example: `// Designers pick BP_Fireball in the editor
UPROPERTY(EditDefaultsOnly, Category = "Weapon")
TSubclassOf<AProjectile> ProjectileClass;`,
    see: ['blueprint', 'tsubclassof', 'cdo', 'inheritance'],
  },
  {
    id: 'uproject-file',
    term: '.uproject File',
    course: 'unreal',
    category: 'Project & Build',
    short:
      'The JSON file at the root of a project that identifies it to the engine: the engine version it uses, the C++ modules it contains and the plugins it enables.',
    long:
      'Double-clicking `MyGame.uproject` opens the editor; right-clicking it offers "Generate Visual Studio project files", which runs UnrealBuildTool to create IDE files from your modules. Those IDE files are disposable. The `.uproject` and the `Build.cs` files are the source of truth.\n\nThe `Modules` array lists each game module with its `Type` (`Runtime`, `Editor`…) and `LoadingPhase`. The `Plugins` array records plugins you explicitly enabled or disabled.\n\nCommit the `.uproject` to source control, but not the generated `Binaries/`, `Intermediate/`, `Saved/` or IDE folders, which are rebuilt from it.',
    example: `{
    "FileVersion": 3,
    "EngineAssociation": "5.4",
    "Modules": [
        { "Name": "MyGame", "Type": "Runtime",
          "LoadingPhase": "Default" }
    ],
    "Plugins": [ { "Name": "EnhancedInput", "Enabled": true } ]
}`,
    exampleLang: 'json',
    see: ['ue-module', 'uplugin', 'unreal-build-tool', 'build-cs'],
  },
  {
    id: 'uplugin',
    term: 'Plugin (.uplugin)',
    course: 'unreal',
    category: 'Project & Build',
    short:
      'A self-contained package of modules and/or content, described by a `.uplugin` JSON file, that can be enabled per project and shared between projects.',
    long:
      'Plugins are how Unreal ships optional features (Enhanced Input, Gameplay Abilities, Niagara) and how teams share code between games. A plugin lives in `Plugins/<Name>/` inside a project (or inside the engine) with its own `Source/`, `Content/` and `Config/` folders.\n\nEach module inside a plugin has its own `Build.cs`. To use a plugin\'s module from your game you must both enable the plugin *and* add its module to your `Build.cs` dependencies. Forgetting the second step gives "cannot open include file" or linker errors.\n\nMoving a self-contained system (inventory, dialogue) into a plugin enforces clean dependencies: the plugin cannot accidentally include your game\'s headers.',
    example: `{
    "FileVersion": 3,
    "FriendlyName": "Inventory",
    "Modules": [
        { "Name": "Inventory", "Type": "Runtime",
          "LoadingPhase": "Default" }
    ]
}`,
    exampleLang: 'json',
    see: ['ue-module', 'uproject-file', 'build-cs'],
    reading: [
      ue(
        'plugins-in-unreal-engine',
        'Plugins',
        'How plugins are structured, where they live, and how the .uplugin descriptor works.',
      ),
    ],
  },
  {
    id: 'ue-module',
    term: 'Module',
    aliases: ['Game Module'],
    course: 'unreal',
    category: 'Project & Build',
    short:
      'The unit of C++ code organisation in Unreal: a folder with a `Build.cs` that compiles to its own DLL (or is linked statically in monolithic builds) and declares its dependencies.',
    long:
      'Everything in Unreal, the engine included, is split into modules: `Core`, `CoreUObject`, `Engine`, `InputCore`, `EnhancedInput`… Your game is at least one module (`MyGame`) with a `MyGame.Build.cs` and a `.cpp` containing `IMPLEMENT_PRIMARY_GAME_MODULE`.\n\nModules speed up iteration (only changed modules rebuild and relink), enforce dependencies (you can only include headers from modules you list), and control symbol export. Classes used from other modules need the `MYGAME_API` macro, which expands to `__declspec(dllexport)` or `dllimport` on Windows in modular builds.\n\nC++20 also has "modules" (`import std;`), an unrelated language feature. Unreal modules are a build-system concept that predates them.',
    example: `// MyGame.cpp
#include "MyGame.h"
#include "Modules/ModuleManager.h"

IMPLEMENT_PRIMARY_GAME_MODULE(
    FDefaultGameModuleImpl, MyGame, "MyGame");`,
    see: ['build-cs', 'uplugin', 'unreal-build-tool', 'linker'],
    reading: [
      ue(
        'unreal-engine-modules',
        'Unreal Engine Modules',
        'Explains module structure, dependencies, and public versus private folders.',
      ),
    ],
  },
  {
    id: 'build-cs',
    term: 'Build.cs',
    course: 'unreal',
    category: 'Project & Build',
    short:
      'A C# file (`MyGame.Build.cs`) that tells UnrealBuildTool how to compile one module: its dependencies, include paths and compiler settings.',
    long:
      'Unreal does not use CMake or hand-written project files. UnrealBuildTool compiles each `ModuleRules` class written in C# and uses it to produce the compile and link commands. The most common edit is adding a dependency such as `"EnhancedInput"` or `"UMG"`.\n\n`PublicDependencyModuleNames` are modules whose headers your *public* headers include; modules that depend on you inherit them. `PrivateDependencyModuleNames` are used only by your `.cpp` files and keep coupling and compile times down. Templates put everything in Public for simplicity.\n\nA missing dependency usually shows up as "cannot open include file" or an unresolved external symbol at link time. After editing a `Build.cs`, regenerate project files and rebuild; Live Coding cannot apply build-rule changes.',
    example: `using UnrealBuildTool;
public class MyGame : ModuleRules {
    public MyGame(ReadOnlyTargetRules Target) : base(Target) {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new string[] {
            "Core", "CoreUObject", "Engine", "InputCore",
            "EnhancedInput" });
        PrivateDependencyModuleNames.Add("UMG");
    }
}`,
    exampleLang: 'csharp',
    see: ['ue-module', 'target-cs', 'unreal-build-tool', 'linker-error'],
    reading: [
      ue(
        'unreal-engine-modules',
        'Unreal Engine Modules',
        'Covers the Build.cs file and how module dependencies are declared.',
      ),
    ],
  },
  {
    id: 'target-cs',
    term: 'Target.cs',
    course: 'unreal',
    category: 'Project & Build',
    short:
      'A C# file that describes a build *target* (the game, editor, client or server executable) and the settings and modules it is built with.',
    long:
      'A project has one `TargetRules` file per target type: `MyGame.Target.cs` (the packaged game), `MyGameEditor.Target.cs` (the editor build you use every day) and optionally `MyGameServer.Target.cs` or `MyGameClient.Target.cs` for multiplayer. Which one you build is picked by the IDE configuration, e.g. "Development Editor".\n\nWhile `Build.cs` is per module, `Target.cs` is per executable: `Type`, `DefaultBuildSettings`, `IncludeOrderVersion` and `ExtraModuleNames` (your game modules) live here.\n\nA dedicated server target strips rendering and audio and defines `UE_SERVER=1`, which is why server builds need their own `Target.cs` (and an engine built from source).',
    example: `using UnrealBuildTool;

public class MyGameTarget : TargetRules {
    public MyGameTarget(TargetInfo Target) : base(Target) {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("MyGame");
    }
}`,
    exampleLang: 'csharp',
    see: ['build-cs', 'unreal-build-tool', 'dedicated-server'],
  },
  {
    id: 'unreal-build-tool',
    term: 'UnrealBuildTool (UBT)',
    aliases: ['UBT'],
    course: 'unreal',
    category: 'Project & Build',
    short:
      'The C# program that builds Unreal projects: it reads the Target.cs and Build.cs rules, runs UnrealHeaderTool, then drives the C++ compiler and linker.',
    long:
      'When you press Build in your IDE, the IDE actually invokes UBT. It discovers modules, works out their dependency order, runs UnrealHeaderTool to generate reflection code, and then compiles with the platform toolchain (MSVC, Clang), using unity builds and shared precompiled headers to keep build times reasonable.\n\nUBT also generates the IDE project files, which is why you never edit `.vcxproj` files by hand: they would simply be overwritten.\n\nUnity builds glue several `.cpp` files into one translation unit for speed. A side effect: a `.cpp` that forgets an `#include` may compile only because a neighbour included it, then break later when files are regrouped. Setting `bUseUnity = false` in a module\'s `Build.cs` now and then catches missing includes.',
    example: `REM Windows: build the editor target from a terminal
Engine\\Build\\BatchFiles\\Build.bat MyGameEditor Win64 ^
    Development -Project="D:\\MyGame\\MyGame.uproject" -WaitMutex`,
    exampleLang: 'shell',
    see: ['unreal-header-tool', 'build-cs', 'target-cs', 'build-system'],
    reading: [
      ue(
        'unreal-build-tool-in-unreal-engine',
        'Unreal Build Tool',
        'What UBT does, how it uses module and target rules, and its configuration options.',
      ),
    ],
  },
  {
    id: 'unreal-header-tool',
    term: 'UnrealHeaderTool (UHT)',
    aliases: ['UHT'],
    course: 'unreal',
    category: 'Project & Build',
    short:
      'A code generator that runs before the C++ compiler, parses headers for reflection macros (`UCLASS`, `UPROPERTY`…) and writes the `.generated.h` and `.gen.cpp` files.',
    long:
      'C++ has no built-in runtime reflection, so Unreal adds it with a pre-build step. UHT scans every header that includes a `.generated.h`, understands the `U*` macros and their specifiers, and emits code that registers classes, properties and functions with the engine, plus glue for Blueprint calls, replication and serialisation.\n\nUHT is a parser, not a full C++ compiler. Reflected members must use types it understands (no `std::vector` properties), and reflected declarations can only be wrapped in a few known preprocessor conditions such as `WITH_EDITORONLY_DATA`.\n\nIn UE5, UHT was rewritten in C# and runs inside UnrealBuildTool. Its errors point at your header line, e.g. an unknown specifier or an unsupported property type, and they appear before any C++ compiler output.',
    example: `// UHT reads this header...
UCLASS()
class MYGAME_API ACoin : public AActor {
    GENERATED_BODY()   // ...and fills this in via
                       // Coin.generated.h
    UPROPERTY(EditAnywhere)
    int32 Value = 10;
};`,
    see: ['reflection', 'generated-header', 'generated-body', 'unreal-build-tool'],
  },
  {
    id: 'live-coding',
    term: 'Live Coding',
    course: 'unreal',
    category: 'Project & Build',
    short:
      'Unreal\'s default way to recompile C++ while the editor or game is running: it compiles the changed `.cpp` files and patches the new machine code into the running process.',
    long:
      'Live Coding is triggered with **Ctrl+Alt+F11** or the Compile button in the editor toolbar. It is ideal for iterating on function bodies: change the damage formula, press the shortcut, keep playing.\n\nIt is limited when you change *layout or reflection data*: adding member variables, adding or changing a `UPROPERTY`/`UFUNCTION`, or adding new reflected classes. There is an experimental object-reinstancing option, but the reliable workflow for header changes is to close the editor and build from the IDE.\n\nLive Coding is on by default in UE5 and replaces Hot Reload. While it is enabled, building from the IDE with the editor open is blocked, which prevents the two systems from fighting.',
    example: `// Safe for Live Coding: body-only change
float UHealthComponent::ComputeDamage(float Base) const {
    return Base * DamageMultiplier * 1.5f; // tweaked
}
// Unsafe: adding a UPROPERTY to the header
// -> close the editor and rebuild from the IDE`,
    see: ['hot-reload', 'unreal-build-tool', 'unreal-editor'],
    reading: [
      ue(
        'using-live-coding-to-recompile-unreal-engine-applications-at-runtime',
        'Using Live Coding',
        'How to trigger Live Coding, its settings, and its limitations with header changes.',
      ),
    ],
  },
  {
    id: 'hot-reload',
    term: 'Hot Reload',
    course: 'unreal',
    category: 'Project & Build',
    short:
      'The older mechanism for reloading game modules into a running editor by compiling a fresh DLL and swapping it in. Live Coding replaced it as the default in UE5.',
    long:
      'Hot Reload builds a new copy of your module DLL (with a numbered suffix), loads it, and tries to re-instance existing objects of the changed classes. It earned a reputation for subtly corrupting Blueprints and assets, such as properties resetting or Blueprints pointing at stale classes, especially after header changes.\n\nIn UE5 it only happens if you disable Live Coding and build from the IDE while the editor is open. Most teams avoid it: for header changes, close the editor and rebuild.\n\nIf you see oddly named `REINST_` classes or Blueprints that suddenly fail to compile after a reload, restart the editor without saving the affected assets.',
    example: `// UE5 workflow rule of thumb:
// .cpp body change      -> Live Coding (Ctrl+Alt+F11)
// header / UPROPERTY    -> close editor, build in IDE
// Build.cs / new module -> regenerate project files`,
    exampleLang: 'text',
    see: ['live-coding', 'unreal-build-tool', 'ue-module'],
  },
  {
    id: 'coding-standard',
    term: 'Epic Coding Standard',
    course: 'unreal',
    category: 'Project & Build',
    short:
      'Epic\'s official naming and style conventions for Unreal C++: type prefixes (`A`, `U`, `F`, `E`, `I`, `T`), PascalCase names, a `b` prefix for bools, and more. Some prefixes are enforced by UnrealHeaderTool.',
    long:
      'Type prefixes: `A` for actors, `U` for other `UObject`s, `F` for structs and plain classes, `E` for enums, `I` for interfaces, `T` for templates, `S` for Slate widgets. UHT *requires* the right prefix on reflected classes and structs and reports an error otherwise. The editor hides the prefix, so `AEnemy` shows up as "Enemy".\n\nTypes, functions and variables are PascalCase (`MaxHealth`, `ApplyDamage`), booleans start with `b` (`bIsDead`), and out-parameters are often prefixed `Out`. Epic\'s own style puts braces on their own line, indents with tabs, and uses `int32`/`float` rather than `int`/`long`.\n\nFollowing the standard is more than taste: engine APIs, reflection and teammates assume it, and reviewers at Unreal studios expect it. (This app\'s examples use same-line braces and spaces only so they fit narrow screens.)',
    example: `UENUM(BlueprintType)
enum class EDoorState : uint8 { Closed, Opening, Open };

UCLASS()
class MYGAME_API ADoor : public AActor {   // A = actor
    GENERATED_BODY()
    bool bIsLocked = false;                // b = bool
    EDoorState State = EDoorState::Closed; // E = enum
    TArray<FName> KeyIds;                  // T = template
};`,
    see: ['int32', 'uclass', 'identifier'],
    reading: [
      ue(
        'epic-cplusplus-coding-standard-for-unreal-engine',
        'Epic C++ Coding Standard',
        'The full list of naming prefixes, formatting rules and modern C++ usage guidelines.',
      ),
    ],
  },

  // ----------------------------------------------------------------- Reflection
  {
    id: 'reflection',
    term: 'Reflection',
    aliases: ['Property System'],
    course: 'unreal',
    category: 'Reflection',
    short:
      'The engine\'s ability to inspect classes, properties and functions at run time. Unreal generates it from `U*` macros so the editor, Blueprint, serialisation, garbage collection and networking can work with your types.',
    long:
      'Standard C++ has no runtime reflection: once compiled, a `struct` is just bytes and the member names are gone. Unreal needs them to show properties in the Details panel, save them to disk, replicate them, expose them to Blueprint and let the garbage collector find object references.\n\nYou opt in per type and per member: `UCLASS`, `USTRUCT` and `UENUM` mark types; `UPROPERTY` and `UFUNCTION` mark members. UnrealHeaderTool then generates `UClass`, `UFunction` and `FProperty` metadata you can query at run time, e.g. with `GetClass()` or `TFieldIterator<FProperty>`.\n\nAnything *not* marked is invisible to the engine. The classic bug: a `UObject*` member without `UPROPERTY()` is not seen by the garbage collector, so the object can be destroyed while you still point to it.',
    example: `// Walk the reflected properties of any object
for (TFieldIterator<FProperty> It(Obj->GetClass()); It; ++It) {
    const FProperty* Prop = *It;
    UE_LOG(LogTemp, Log, TEXT("%s : %s"),
        *Prop->GetName(), *Prop->GetCPPType());
}`,
    see: ['unreal-header-tool', 'uproperty', 'uclass', 'ue-garbage-collector'],
    reading: [
      ue(
        'reflection-system-in-unreal-engine',
        'Reflection System',
        'An overview of the property system and the macros that feed it.',
      ),
    ],
  },
  {
    id: 'generated-header',
    term: '.generated.h',
    course: 'unreal',
    category: 'Reflection',
    short:
      'The header UnrealHeaderTool writes for each reflected header (e.g. `Enemy.generated.h`). It must be the **last** `#include` in that header.',
    long:
      'For `Enemy.h`, UHT writes `Enemy.generated.h` into the `Intermediate/` folder. It defines the macros that `GENERATED_BODY()` expands to: `StaticClass()`, the `Super` and `ThisClass` typedefs, and the glue for your reflected functions.\n\nWhy last? Each generated header `#undef`s and redefines a `CURRENT_FILE_ID` macro, and `GENERATED_BODY()` uses that ID plus the line number to pick its expansion. If another reflected header were included after yours, `CURRENT_FILE_ID` would belong to that file and your `GENERATED_BODY()` would expand to the wrong thing. UHT enforces the rule with an error.\n\nNever edit or commit generated files; they are rebuilt whenever the header changes. If you rename a header, rename its `.generated.h` include too.',
    example: `// Enemy.h
#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "Enemy.generated.h" // always last

UCLASS()
class MYGAME_API AEnemy : public ACharacter {
    GENERATED_BODY()
};`,
    see: ['generated-body', 'unreal-header-tool', 'include-directive', 'pragma-once'],
  },
  {
    id: 'generated-body',
    term: 'GENERATED_BODY()',
    course: 'unreal',
    category: 'Reflection',
    short:
      'A macro placed at the top of every `UCLASS`, `USTRUCT` and `UINTERFACE` body that pastes in the code UnrealHeaderTool generated for that type.',
    long:
      '`GENERATED_BODY()` expands to a macro defined in your `.generated.h`, chosen by the file and line it appears on. It injects members such as `static UClass* StaticClass()`, the `Super` and `ThisClass` typedefs, and reflection glue for your `UFUNCTION`s. Without it, the class compiles as plain C++ but the engine cannot use it.\n\nIn a `UCLASS`, the expansion ends with `private:`. Members you write right after it without an access specifier are therefore private, so it is good practice to write `public:` (or `protected:`) explicitly on the next line.\n\nOlder code uses `GENERATED_UCLASS_BODY()`, which also declares a constructor taking `const FObjectInitializer&` that you must define. Prefer `GENERATED_BODY()` in new code.',
    example: `UCLASS()
class MYGAME_API ATurret : public AActor {
    GENERATED_BODY()   // expansion ends in 'private:'

public:                // so be explicit
    ATurret();
};`,
    see: ['generated-header', 'uclass', 'ustruct', 'unreal-header-tool'],
  },
  {
    id: 'uobject',
    term: 'UObject',
    course: 'unreal',
    category: 'UObjects & Memory',
    short:
      'The base class of Unreal\'s managed object system. `UObject`s get reflection, garbage collection, serialisation, and editor and Blueprint integration.',
    long:
      'Almost every engine type you touch derives from `UObject`: actors, components, assets, data assets, subsystems. Being a `UObject` buys you garbage collection, saving and loading of `UPROPERTY` values, the Details panel, Blueprint exposure, replication support and a `UClass` that describes your type.\n\nThe price: `UObject`s are always allocated by the engine. You never create them with `new`, never put them on the stack, and never `delete` them. Use `NewObject<T>()`, `CreateDefaultSubobject<T>()` or `SpawnActor<T>()`, and let the garbage collector destroy them. Class names carry the `U` prefix (`A` for actors).\n\nNot everything should be a `UObject`. Small value types (a damage event, a grid coordinate) are better as plain structs or `USTRUCT`s, which are copied by value and cost the GC nothing.',
    example: `UCLASS(BlueprintType)
class MYGAME_API UQuest : public UObject {
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FText Title;
};

UQuest* Quest = NewObject<UQuest>(this); // GC-managed`,
    see: ['uclass', 'ue-garbage-collector', 'newobject', 'cdo'],
    reading: [
      ue(
        'objects-in-unreal-engine',
        'Objects',
        'The UObject base class and the features it provides to every engine object.',
      ),
    ],
  },
  {
    id: 'uclass',
    term: 'UCLASS',
    course: 'unreal',
    category: 'Reflection',
    short:
      'The macro that marks a C++ class as reflected so UnrealHeaderTool generates a `UClass` for it. Specifiers in the parentheses control how the engine and editor treat the class.',
    long:
      'Put `UCLASS()` directly above a class that derives (directly or indirectly) from `UObject`, add `GENERATED_BODY()` inside, and include the `.generated.h` last. The engine then knows the class by name, can create instances of it, and exposes it to Blueprint and the editor according to its specifiers.\n\nCommon specifiers: `Blueprintable` (can be subclassed in Blueprint; `AActor` already is, and it is inherited), `BlueprintType` (usable as a Blueprint variable type), `Abstract` (cannot be instantiated or placed), `Config = Game` (lets `Config` properties load from ini files), and `meta = (BlueprintSpawnableComponent)` on components.\n\nAt run time each reflected class has exactly one `UClass` object, reachable through `AMyActor::StaticClass()` or `Obj->GetClass()`. That `UClass` is what `TSubclassOf`, `Cast`, `SpawnActor` and `IsA` work with.',
    example: `UCLASS(Abstract, Blueprintable)
class MYGAME_API AWeaponBase : public AActor {
    GENERATED_BODY()
public:
    virtual void Fire();
};

UClass* Cls = AWeaponBase::StaticClass();`,
    see: ['uobject', 'generated-body', 'specifier', 'reflection'],
  },
  {
    id: 'ustruct',
    term: 'USTRUCT',
    course: 'unreal',
    category: 'Reflection',
    short:
      'The macro that makes a C++ struct reflected, so it can be a `UPROPERTY`, be saved and replicated, and (with `BlueprintType`) be used in Blueprint. Struct names use the `F` prefix.',
    long:
      'A `USTRUCT` is a value type: copied on assignment, usually stored inline inside its owner, and not garbage collected itself. That makes it ideal for plain data such as a loot entry, a weapon stat block or a data table row.\n\n`USTRUCT`s can have ordinary member functions but not `UFUNCTION`s, so Blueprint cannot call methods on them directly; expose helpers through a Blueprint function library instead. They can inherit from other `USTRUCT`s, but never from `UObject`.\n\nIf a struct holds `UObject` pointers, mark those members `UPROPERTY()` *and* store the struct itself in a `UPROPERTY`. The garbage collector only finds references by walking reflected properties from a reachable object.',
    example: `USTRUCT(BlueprintType)
struct FWeaponStats {
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Damage = 10.f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float FireRate = 2.f;
};`,
    see: ['uclass', 'uproperty', 'data-table', 'struct'],
  },
  {
    id: 'uenum',
    term: 'UENUM',
    course: 'unreal',
    category: 'Reflection',
    short:
      'The macro that reflects an enum so it can be a `UPROPERTY`, appear as a dropdown in the editor, be used in Blueprint (`BlueprintType`) and be converted to and from strings.',
    long:
      'Modern Unreal style is a scoped enum with a `uint8` underlying type and an `E` prefix: `UENUM(BlueprintType) enum class EWeaponType : uint8 { ... };`. Blueprint only supports `uint8`-based enums.\n\nAdd `UMETA(DisplayName = "...")` to entries for friendlier editor names. Because the enum is reflected, you can get an entry\'s name at run time with `UEnum::GetValueAsString(Value)`, something standard C++ cannot do without hand-written tables.\n\nOlder engine code stores unscoped enums in properties through `TEnumAsByte<EOldEnum>`. With `enum class ... : uint8` you no longer need that wrapper.',
    example: `UENUM(BlueprintType)
enum class EWeaponType : uint8 {
    Melee   UMETA(DisplayName = "Melee"),
    Ranged  UMETA(DisplayName = "Ranged"),
    Magic
};

FString Name = UEnum::GetValueAsString(EWeaponType::Magic);
// "EWeaponType::Magic"`,
    see: ['enum-class', 'uproperty', 'blueprint', 'reflection'],
  },
  {
    id: 'uproperty',
    term: 'UPROPERTY',
    course: 'unreal',
    category: 'Reflection',
    short:
      'The macro that reflects a member variable, making it visible to the garbage collector, serialisation, the editor, Blueprint and replication according to its specifiers.',
    long:
      'Even a bare `UPROPERTY()` does important work: the value is saved with the object, initialised from the class defaults, and, for `UObject` pointers, tracked by the garbage collector so the referenced object stays alive while you point to it.\n\nSpecifiers add behaviour: editor visibility (`EditAnywhere`, `VisibleAnywhere`, `EditDefaultsOnly`…), Blueprint access (`BlueprintReadWrite`, `BlueprintReadOnly`), networking (`Replicated`, `ReplicatedUsing`), config (`Config`), plus `Category` and `meta = (...)` for editor presentation.\n\nOnly types the reflection system understands can be properties: `int32`, `float`, `bool`, `FString`, `FName`, `FVector`, `TArray`, `TMap`, `TSet`, `USTRUCT`s, `UENUM`s, `TObjectPtr`, `TSubclassOf`, soft pointers and so on. A `std::vector` or a raw `int*` cannot be a `UPROPERTY`.',
    example: `UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats",
    meta = (ClampMin = "0"))
float MaxHealth = 100.f;

UPROPERTY() // not in the editor, but GC-tracked
TObjectPtr<UInventoryComponent> Inventory;`,
    see: ['specifier', 'edit-anywhere', 'blueprint-read-write', 'ue-garbage-collector'],
    reading: [
      ue(
        'unreal-engine-uproperties',
        'Properties',
        'The reference for declaring properties and every property specifier.',
      ),
    ],
  },
  {
    id: 'ufunction',
    term: 'UFUNCTION',
    course: 'unreal',
    category: 'Reflection',
    short:
      'The macro that reflects a member function so it can be called from Blueprint, bound to dynamic delegates, used as an RPC or RepNotify, or run as a console command.',
    long:
      'Plain C++ member functions are invisible to the engine. `UFUNCTION()` registers the function\'s name and signature, and UHT generates a small "thunk" that unpacks parameters coming from Blueprint or the network and calls your C++ code.\n\nYou need it when Blueprint calls the function (`BlueprintCallable`, `BlueprintPure`), Blueprint implements it (`BlueprintImplementableEvent`, `BlueprintNativeEvent`), it is a network RPC (`Server`, `Client`, `NetMulticast`), it is bound to a dynamic delegate with `AddDynamic` (overlap and hit events), it is a `ReplicatedUsing` callback, or it is an `Exec` console command.\n\nParameters and return types must be reflectable. Non-const reference parameters (`int32& OutCount`) become output pins in Blueprint; use `const` references for large inputs.',
    example: `UFUNCTION(BlueprintCallable, Category = "Inventory")
bool TryAddItem(FName ItemId, int32 Count, int32& OutLeftover);

UFUNCTION()   // needed to bind with AddDynamic
void HandleOverlap(UPrimitiveComponent* Comp, AActor* Other,
    UPrimitiveComponent* OtherComp, int32 BodyIndex,
    bool bFromSweep, const FHitResult& Hit);`,
    see: ['blueprint-callable', 'rpc', 'dynamic-delegate', 'reflection'],
    reading: [
      ue(
        'ufunctions-in-unreal-engine',
        'UFunctions',
        'How to declare reflected functions and the full list of function specifiers.',
      ),
    ],
  },
  {
    id: 'uinterface',
    term: 'UINTERFACE',
    course: 'unreal',
    category: 'Reflection',
    short:
      'Unreal\'s reflected interface: a pair of classes, `UMyInterface` for the type system and `IMyInterface` with the actual functions, that lets unrelated classes (including Blueprints) share a contract.',
    long:
      'In standard C++ an interface is an abstract class with pure virtual functions, used through multiple inheritance. Unreal also needs reflection, so an interface is declared twice: `UINTERFACE()` on an empty `UInterface`-derived `U` class, and an `I` class holding the functions your classes inherit.\n\nA class implements it by inheriting the `I` class: `class AChest : public AActor, public IInteractable`. Test for it with `Obj->Implements<UInteractable>()`, which also sees Blueprint implementations, or `Cast<IInteractable>(Obj)`, which only works for C++ implementations.\n\nFor `BlueprintNativeEvent` or `BlueprintImplementableEvent` interface functions, always call the generated static wrapper, `IInteractable::Execute_Interact(Obj, Instigator)`. Calling the function directly skips Blueprint implementations.',
    example: `UINTERFACE(MinimalAPI, Blueprintable)
class UInteractable : public UInterface {
    GENERATED_BODY()
};
class MYGAME_API IInteractable {
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintNativeEvent, BlueprintCallable)
    void Interact(AActor* Instigator);
};`,
    see: ['interface', 'blueprint-native-event', 'ue-cast', 'pure-virtual-function'],
    reading: [
      ue(
        'interfaces-in-unreal-engine',
        'Interfaces',
        'Declaring, implementing and calling interfaces from both C++ and Blueprint.',
      ),
    ],
  },
  {
    id: 'specifier',
    term: 'Specifier',
    course: 'unreal',
    category: 'Reflection',
    short:
      'A keyword inside a reflection macro\'s parentheses, like `EditAnywhere` in `UPROPERTY(EditAnywhere)`, that tells UnrealHeaderTool how the engine should treat that class, property or function.',
    long:
      'Specifiers are read by UHT, not by the C++ compiler; to the compiler, `UPROPERTY(...)` expands to nothing. That is why a misspelled specifier is a UHT build error (an unknown specifier) rather than a C++ error.\n\nEach macro has its own set: class specifiers (`Blueprintable`, `Abstract`, `Config`), property specifiers (`EditAnywhere`, `Replicated`, `Transient`), function specifiers (`BlueprintCallable`, `Server`, `Exec`), and struct and enum specifiers. Some take values: `Category = "Combat"`, `ReplicatedUsing = OnRep_Health`.\n\n`meta = (...)` holds metadata specifiers, a separate group that mostly affects editor UI and Blueprint nodes rather than runtime behaviour.',
    example: `// Flags, key = value pairs, and meta specifiers
UPROPERTY(EditDefaultsOnly, BlueprintReadOnly,
    Category = "Combat", meta = (ClampMin = "0.0"))
float Cooldown = 1.5f;

UFUNCTION(Server, Reliable)
void ServerFire();`,
    see: ['uproperty', 'ufunction', 'metadata-specifier', 'uclass'],
  },
  {
    id: 'metadata-specifier',
    term: 'Metadata Specifier (meta=)',
    course: 'unreal',
    category: 'Reflection',
    short:
      'Key–value hints inside `meta = (...)` that customise how a reflected item looks and behaves in the editor and Blueprint, such as `ClampMin`, `EditCondition` or `DisplayName`.',
    long:
      'Metadata is mostly read by editor tools: Details panel layout, Blueprint node generation and validation. Much of it is editor-only data that is not available in packaged games, so runtime logic must never depend on it. `ClampMin` stops a designer typing -5 in the editor but does not clamp values you set in code.\n\nUseful keys: `ClampMin`/`ClampMax` and `UIMin`/`UIMax` for numbers, `EditCondition = "bUseAmmo"` to grey out a field, `AllowPrivateAccess = "true"` to expose a private member to Blueprint, `DisplayName`, `ToolTip`, `BlueprintSpawnableComponent` on component classes, and `DefaultToSelf` or `WorldContext` on functions.\n\nUnknown meta keys are usually ignored silently, so a typo fails quietly. Check spelling against the docs when something has no effect.',
    example: `UPROPERTY(EditAnywhere, Category = "Ammo")
bool bUsesAmmo = true;

UPROPERTY(EditAnywhere, Category = "Ammo",
    meta = (EditCondition = "bUsesAmmo", ClampMin = "1"))
int32 MagazineSize = 30;`,
    see: ['specifier', 'uproperty', 'edit-anywhere'],
    reading: [
      ue(
        'metadata-specifiers-in-unreal-engine',
        'Metadata Specifiers',
        'The list of meta keys for classes, properties and functions, with what each does.',
      ),
    ],
  },

  // ---------------------------------------------------------- UObjects & Memory
  {
    id: 'cdo',
    term: 'Class Default Object (CDO)',
    aliases: ['CDO'],
    course: 'unreal',
    category: 'UObjects & Memory',
    short:
      'The single template instance of each `UClass`, created by running the class constructor when the class is registered. New objects of that class start as a copy of the CDO\'s property values.',
    long:
      'When the engine loads a module, it constructs one object per class, the CDO, by running the C++ constructor. Blueprint subclasses have their own CDOs with designer-edited defaults layered on top. When you spawn an actor or call `NewObject`, properties are initialised from the CDO, which is why constructors are for *defaults*, not gameplay.\n\nThis explains a classic surprise: your constructor runs even when no game is playing, at editor startup and whenever Blueprints compile. Never spawn actors, access the world, start timers or look up other actors in a constructor. Do that in `BeginPlay`.\n\nRead a CDO with `GetDefault<UMyClass>()` or `MyClass->GetDefaultObject()`, e.g. to read a weapon class\'s default damage without spawning one. Treat it as read-only: changing it changes the defaults for every future instance.',
    example: `// Read a class's defaults without spawning anything
if (ProjectileClass) {
    const AProjectile* Defaults = ProjectileClass.GetDefaultObject();
    UE_LOG(LogTemp, Log, TEXT("Damage %f"), Defaults->Damage);
}`,
    see: ['uclass', 'constructor', 'beginplay', 'tsubclassof'],
  },
  {
    id: 'ue-garbage-collector',
    term: 'Unreal Garbage Collector',
    aliases: ['GC'],
    course: 'unreal',
    category: 'UObjects & Memory',
    short:
      'The engine system that periodically finds `UObject`s no longer reachable through reflected references and destroys them. It replaces manual `delete` for `UObject`s.',
    long:
      'Unreal uses mark-and-sweep. Starting from a root set (objects added with `AddToRoot()`, the loaded world, packages in use…), it follows every reference stored in a `UPROPERTY`, a reflected container, or reported through `AddReferencedObjects`, marking what it reaches. Everything unmarked is destroyed. It runs about once a minute by default and on level transitions, not the instant an object becomes unreachable.\n\nThe golden rule: a `UObject*` you keep beyond the current function must be held in a `UPROPERTY` (or a `TStrongObjectPtr`, or reported to the GC). A raw member pointer is invisible: the object can be collected and your pointer dangles, causing crashes that look random.\n\nActors are a special case: a spawned actor is referenced by its level, so it lives until `Destroy()` is called even if nothing else points to it. After destruction, check pointers with `IsValid()`. Non-`UObject` classes use RAII and `TSharedPtr`/`TUniquePtr` instead.',
    example: `UCLASS()
class MYGAME_API AGun : public AActor {
    GENERATED_BODY()

    UPROPERTY()
    TObjectPtr<UAmmoData> Ammo;   // kept alive, GC-safe

    UAmmoData* Cached = nullptr;  // invisible to GC: may dangle!
};`,
    see: ['uproperty', 'tobjectptr', 'isvalid', 'garbage-collection'],
    reading: [
      ue(
        'unreal-object-handling-in-unreal-engine',
        'Unreal Object Handling',
        'How the engine tracks UObjects, including garbage collection and automatic reference updating.',
      ),
    ],
  },
  {
    id: 'tobjectptr',
    term: 'TObjectPtr',
    course: 'unreal',
    category: 'UObjects & Memory',
    short:
      'The UE5 wrapper for `UObject` pointers in `UPROPERTY` members. It behaves like a raw pointer, but in editor builds it supports access tracking and lazy loading.',
    long:
      'UE5 recommends `TObjectPtr<T>` instead of `T*` for object-pointer member properties in headers: `UPROPERTY() TObjectPtr<UStaticMeshComponent> Mesh;`. In packaged (non-editor) builds it compiles down to a raw pointer, so there is no runtime cost; in the editor it can record accesses and resolve references lazily.\n\nIt converts implicitly to `T*`, so function parameters and locals stay raw pointers (`AActor* Target`). The convention is `TObjectPtr` for members, raw pointers elsewhere. Note that `TObjectPtr` is **not** what keeps the object alive: the `UPROPERTY()` is. A `TObjectPtr` member without `UPROPERTY` is still invisible to the garbage collector.\n\nDespite the name, it is not a smart pointer like `std::unique_ptr`: it owns nothing and never deletes anything.',
    example: `// Header: TObjectPtr for UPROPERTY members
UPROPERTY(VisibleAnywhere)
TObjectPtr<UStaticMeshComponent> Mesh;

// .cpp: raw pointers are fine for locals and params
UStaticMeshComponent* M = Mesh; // implicit conversion
M->SetVisibility(false);`,
    see: ['uproperty', 'ue-garbage-collector', 'tweakobjectptr', 'pointer'],
  },
  {
    id: 'tweakobjectptr',
    term: 'TWeakObjectPtr',
    course: 'unreal',
    category: 'UObjects & Memory',
    short:
      'A weak pointer to a `UObject` that does not keep it alive and reliably reports `nullptr` once the object is destroyed or garbage collected.',
    long:
      'Use it to *observe* an object without affecting its lifetime: the last enemy that damaged you, a target an AI is tracking, a cached widget. Call `Get()` (which returns `nullptr` if the object is gone) or `IsValid()` before using it.\n\nIt stores the object\'s index and serial number in the global object array rather than a raw address, so it can tell when that slot has been reused by a different object, which a raw pointer can never detect.\n\nIt is the `UObject` counterpart of `std::weak_ptr`, but there is no "lock" step: you simply call `Get()` each time you need the object. It can be a `UPROPERTY` and works in containers such as `TArray<TWeakObjectPtr<AActor>>`.',
    example: `UPROPERTY()
TWeakObjectPtr<AActor> LastAttacker;

void AEnemy::Retaliate() {
    if (AActor* Attacker = LastAttacker.Get()) {
        MoveTowards(Attacker);  // still alive
    }
}`,
    see: ['tobjectptr', 'weak-ptr', 'isvalid', 'tweakptr'],
  },
  {
    id: 'tsubclassof',
    term: 'TSubclassOf',
    course: 'unreal',
    category: 'UObjects & Memory',
    short:
      'A type-safe `UClass*` that only accepts `T` or classes derived from it. In the editor it shows a dropdown filtered to valid classes, including Blueprint classes.',
    long:
      'You often need to store a *class* rather than an instance: which projectile a gun fires, which pawn the GameMode spawns, which widget to create. A raw `UClass*` would accept any class at all; `TSubclassOf<AProjectile>` restricts both the editor picker and assignments in code.\n\nThis is the key bridge between C++ and Blueprint: C++ cannot name `BP_Fireball` directly, but it can spawn whichever subclass a designer selected with `GetWorld()->SpawnActor<AProjectile>(ProjectileClass, ...)`.\n\nIt is a hard reference, so the selected class loads together with the owner. For large optional content use `TSoftClassPtr<T>`. Always check that it is set before use, because designers can leave it empty.',
    example: `UPROPERTY(EditDefaultsOnly, Category = "Weapon")
TSubclassOf<AProjectile> ProjectileClass;

void AGun::Fire() {
    if (!ProjectileClass) { return; }
    GetWorld()->SpawnActor<AProjectile>(ProjectileClass,
        Muzzle->GetComponentTransform());
}`,
    see: ['blueprint-class', 'spawnactor', 'tsoftclassptr', 'uclass'],
  },
  {
    id: 'tsharedptr',
    term: 'TSharedPtr / TSharedRef',
    course: 'unreal',
    category: 'UObjects & Memory',
    short:
      'Unreal\'s reference-counted smart pointers for **non-UObject** types. `TSharedPtr` may be null; `TSharedRef` is guaranteed to point to a valid object.',
    long:
      'They mirror `std::shared_ptr`: the object is destroyed when the last shared owner goes away. Create them with `MakeShared<T>(...)` (one allocation for the object and its counter). A `TSharedRef` converts to a `TSharedPtr` implicitly; the reverse needs `.ToSharedRef()` on a pointer you know is valid.\n\nUse them for plain C++ objects: Slate widgets, JSON values (`TSharedPtr<FJsonObject>`), helper systems that are not `UObject`s. **Never** use them for `UObject`s, which belong to the garbage collector; two owners with different rules lead to double deletion or dangling pointers. They also cannot be `UPROPERTY`s.\n\nSince UE5 the default mode is thread-safe (atomic reference counting), matching `std::shared_ptr`.',
    example: `struct FPathCache { TArray<FVector> Points; };

TSharedRef<FPathCache> Cache = MakeShared<FPathCache>();
TSharedPtr<FPathCache> Maybe = Cache;   // ref -> ptr: implicit
if (Maybe.IsValid()) {
    Maybe->Points.Add(FVector::ZeroVector);
}`,
    see: ['shared-ptr', 'tweakptr', 'tuniqueptr', 'reference-counting'],
    reading: [
      ue(
        'smart-pointers-in-unreal-engine',
        'Smart Pointers',
        'The Unreal smart pointer library and when to use each pointer type.',
      ),
    ],
  },
  {
    id: 'tuniqueptr',
    term: 'TUniquePtr',
    course: 'unreal',
    category: 'UObjects & Memory',
    short:
      'Unreal\'s single-owner smart pointer for non-UObject types, equivalent to `std::unique_ptr`: move-only, and it deletes the object when it goes out of scope.',
    long:
      'Use `TUniquePtr<T>` when exactly one owner controls a plain C++ object\'s lifetime: an internal helper, a pimpl implementation, a parser. Create it with `MakeUnique<T>(...)` and transfer ownership with `MoveTemp`, Unreal\'s equivalent of `std::move`.\n\nLike the other `T`-prefixed smart pointers, it must never hold a `UObject` and cannot be a `UPROPERTY`.\n\nWhy not `std::unique_ptr`? Historically the engine avoided the standard library for portability and allocator control, and its own versions fit its containers and coding standard. Standard smart pointers do work in Unreal code, but engine APIs and reviewers expect the Unreal versions.',
    example: `class FSaveWriter { /* plain C++ helper */ };

TUniquePtr<FSaveWriter> Writer = MakeUnique<FSaveWriter>();
TUniquePtr<FSaveWriter> Other = MoveTemp(Writer);
// Writer is now null; Other owns the object`,
    see: ['unique-ptr', 'tsharedptr', 'std-move', 'ownership'],
  },
  {
    id: 'tweakptr',
    term: 'TWeakPtr',
    course: 'unreal',
    category: 'UObjects & Memory',
    short:
      'A non-owning observer of an object managed by `TSharedPtr`/`TSharedRef`. It does not keep the object alive; call `Pin()` to get a temporary `TSharedPtr` if the object still exists.',
    long:
      'It is the Unreal counterpart of `std::weak_ptr`, with `Pin()` playing the role of `lock()`. Use it to break reference cycles (a child pointing back to its parent) and for caches or callbacks that must not extend an object\'s lifetime.\n\n`Pin()` returns a `TSharedPtr` that keeps the object alive while you use it; always check it before dereferencing.\n\nDo not confuse it with `TWeakObjectPtr`: `TWeakPtr` observes shared-pointer-managed C++ objects, while `TWeakObjectPtr` observes garbage-collected `UObject`s.',
    example: `TWeakPtr<FPathCache> WeakCache = Cache; // from a TSharedRef

if (TSharedPtr<FPathCache> Pinned = WeakCache.Pin()) {
    Pinned->Points.Reset(); // safe: alive during this scope
}`,
    see: ['tsharedptr', 'weak-ptr', 'tweakobjectptr'],
  },
  {
    id: 'isvalid',
    term: 'IsValid()',
    course: 'unreal',
    category: 'UObjects & Memory',
    short:
      'A global function that returns true only if a `UObject` pointer is non-null **and** the object is not marked as garbage (for example, an actor that has been destroyed). The standard check before using an object pointer.',
    long:
      'A null check is not enough in Unreal. When you call `Destroy()` on an actor, its memory is not freed immediately: the object is marked as garbage and cleaned up during a later GC pass. In that window `Ptr != nullptr` is true, but using the object is a bug. `IsValid(Ptr)` catches both cases.\n\n`IsValid` cannot rescue a raw pointer whose object was already freed; reading freed memory is undefined behaviour. That is why pointers you keep must live in a `UPROPERTY` or `TWeakObjectPtr`, which the engine keeps safe.\n\nOther types have their own `IsValid` methods with different meanings: `FTimerHandle::IsValid()`, `TWeakObjectPtr::IsValid()`, `TSharedPtr::IsValid()`, `TSoftObjectPtr::IsValid()`. The free function is the one for raw and `TObjectPtr` object pointers. Prefer it over the older `IsValidLowLevel()`, which checks memory sanity rather than gameplay validity.',
    example: `void ATurret::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);
    if (!IsValid(Target)) {   // null OR destroyed
        Target = FindNewTarget();
        return;
    }
    AimAt(Target->GetActorLocation());
}`,
    see: ['ue-garbage-collector', 'tweakobjectptr', 'null-pointer', 'endplay'],
  },
  {
    id: 'newobject',
    term: 'NewObject',
    course: 'unreal',
    category: 'UObjects & Memory',
    short:
      'The function template that creates a new `UObject` at run time: `NewObject<T>(Outer, Class)`. It replaces `new` for `UObject`s.',
    long:
      '`NewObject` allocates the object through the engine, runs its constructor, initialises properties from the Class Default Object and registers it with the object system so the garbage collector can track it. Using plain `new` on a `UObject` class is not supported and bypasses all of that.\n\nThe first argument is the **Outer** (usually the owning object, often `this`); you can also pass a class (for example a Blueprint subclass), a name and object flags. The new object only survives if something references it, so store it in a `UPROPERTY` right away.\n\nUse `CreateDefaultSubobject` inside constructors, `SpawnActor` for actors (never `NewObject`), and `NewObject` for everything else at run time, including components added during gameplay (followed by `RegisterComponent()`).',
    example: `UPROPERTY()
TObjectPtr<UQuestLog> QuestLog;

void AMyPlayerState::BeginPlay() {
    Super::BeginPlay();
    QuestLog = NewObject<UQuestLog>(this); // Outer = this
}`,
    see: ['outer', 'createdefaultsubobject', 'spawnactor', 'new-expression'],
  },
  {
    id: 'outer',
    term: 'Outer',
    course: 'unreal',
    category: 'UObjects & Memory',
    short:
      'The object that contains a `UObject`, passed as the first argument to `NewObject`. Outers form a chain (component → actor → level → package) that defines the object\'s path and the package it is saved in.',
    long:
      'Every `UObject` except a package has an Outer, available through `GetOuter()` or typed helpers like `GetTypedOuter<AActor>()`. The chain determines the object\'s full path name, such as `/Game/Maps/Arena.Arena:PersistentLevel.BP_Chest_2`, and which package it is serialised into.\n\nThe Outer is about *containment and naming*. An object keeps its Outer alive, but an Outer does **not** keep its inner objects alive: something must still reference them through a `UPROPERTY`, or the garbage collector will reclaim them.\n\nPick a sensible Outer: usually the object that owns the new one (`this`), or `GetTransientPackage()` for temporary objects. Objects that need a world find it through their Outer chain.',
    example: `UItemInstance* Item = NewObject<UItemInstance>(this);
check(Item->GetOuter() == this);

AActor* OwningActor = Item->GetTypedOuter<AActor>();
UE_LOG(LogTemp, Log, TEXT("%s"), *Item->GetPathName());`,
    see: ['newobject', 'uobject', 'world', 'ue-garbage-collector'],
  },
  {
    id: 'ue-cast',
    term: 'Cast<T>',
    course: 'unreal',
    category: 'UObjects & Memory',
    short:
      'Unreal\'s safe downcast for `UObject`s: `Cast<T>(Obj)` returns a `T*` if `Obj` is a `T` (or a subclass of it), otherwise `nullptr`. It uses reflection, not C++ RTTI.',
    long:
      '`Cast` plays the role of `dynamic_cast`, but it checks the object\'s `UClass` hierarchy, so it works with C++ RTTI disabled (the default in Unreal builds) and with Blueprint classes. Passing `nullptr` is safe and returns `nullptr`.\n\nVariants: `CastChecked<T>(Obj)` asserts that the cast succeeds (use it when failure would be a programmer error); `Obj->IsA<T>()` only tests the type. `Cast` to an interface\'s `I` class works for interfaces implemented in C++.\n\nCasting everywhere is a design smell: if you cast to `AMyCharacter` in dozens of places, consider an interface, a component or a delegate instead. In Blueprint, a cast node to a Blueprint class also creates a hard reference that loads that asset.',
    example: `void AItem::NotifyActorBeginOverlap(AActor* Other) {
    Super::NotifyActorBeginOverlap(Other);
    if (AMyCharacter* Hero = Cast<AMyCharacter>(Other)) {
        Hero->PickUp(this);   // Other really is a hero
    }
}`,
    see: ['dynamic-cast', 'uinterface', 'uclass', 'polymorphism'],
  },

  // -------------------------------------------------------- Actors & Components
  {
    id: 'actor',
    term: 'Actor (AActor)',
    aliases: ['AActor'],
    course: 'unreal',
    category: 'Actors & Components',
    short:
      'Any object that can be placed or spawned in a level. Actors have a transform (through their root component), can tick, own components, replicate over the network and receive gameplay events.',
    long:
      '`AActor` is the base for everything "in the world": characters, pickups, doors, lights, triggers, cameras. The `A` prefix marks classes derived from it. An actor by itself has no location; its position comes from its `RootComponent`.\n\nActors are assembled from components (composition over deep inheritance): a door might have a mesh component, a box collision component and an audio component. Their key lifecycle hooks are the constructor (defaults), `OnConstruction`, `BeginPlay`, `Tick` and `EndPlay`.\n\nCreate actors with `SpawnActor` or by placing them in a level, and remove them with `Destroy()`. Because actors are `UObject`s, you never `new` or `delete` them.',
    example: `UCLASS()
class MYGAME_API ADoor : public AActor {
    GENERATED_BODY()
public:
    ADoor();
protected:
    virtual void BeginPlay() override;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UStaticMeshComponent> Mesh;
};`,
    see: ['actor-component', 'root-component', 'actor-lifecycle', 'spawnactor'],
    reading: [
      ue(
        'actors-in-unreal-engine',
        'Actors',
        'What actors are, how they relate to components, and how they are spawned and destroyed.',
      ),
    ],
  },
  {
    id: 'actor-component',
    term: 'Actor Component',
    aliases: ['UActorComponent'],
    course: 'unreal',
    category: 'Actors & Components',
    short:
      'A reusable piece of behaviour (`UActorComponent`) attached to an actor, such as health, inventory or movement. A plain actor component has no transform of its own.',
    long:
      'Components are Unreal\'s main tool for composition: instead of an inheritance tree of "damageable door", "damageable crate" and so on, you add a `UHealthComponent` to any actor that can take damage. Components can tick, have their own `BeginPlay`/`EndPlay`, replicate, and expose properties and events to Blueprint.\n\n`UActorComponent` is for logic without a position (stats, inventory). If the component needs a place in the world, such as a mesh, a camera or a collision box, derive from `USceneComponent` or one of its subclasses instead.\n\nFind components at run time with `FindComponentByClass<UHealthComponent>()` and reach the owning actor with `GetOwner()`. Add `meta = (BlueprintSpawnableComponent)` to the `UCLASS` so designers can add your component in the editor.',
    example: `UCLASS(ClassGroup = (Custom),
    meta = (BlueprintSpawnableComponent))
class MYGAME_API UHealthComponent : public UActorComponent {
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    float MaxHealth = 100.f;
};`,
    see: ['scene-component', 'actor', 'createdefaultsubobject', 'encapsulation'],
    reading: [
      ue(
        'components-in-unreal-engine',
        'Components',
        'The different component types and how they are created, registered and attached.',
      ),
    ],
  },
  {
    id: 'scene-component',
    term: 'Scene Component',
    aliases: ['USceneComponent'],
    course: 'unreal',
    category: 'Actors & Components',
    short:
      'A component with a transform (`USceneComponent`) that can be attached to other scene components, forming the hierarchy that positions an actor\'s parts in the world.',
    long:
      'Scene components have a location, rotation and scale relative to their parent, and Unreal combines these into a world transform. Moving a parent moves all attached children, just like nested objects in a 3D modelling tool.\n\nA scene component has no visuals or collision itself; `UPrimitiveComponent` subclasses (meshes, shapes) add those. A bare `USceneComponent` is commonly used as an invisible root or an attachment point, such as the muzzle of a gun.\n\nUse `SetupAttachment` in constructors and `AttachToComponent(Parent, FAttachmentTransformRules::KeepRelativeTransform, SocketName)` at run time. Change transforms through functions like `SetRelativeLocation` and `SetWorldLocation` so the engine can update children and physics.',
    example: `// Constructor: an invisible muzzle point on the barrel
Muzzle = CreateDefaultSubobject<USceneComponent>(TEXT("Muzzle"));
Muzzle->SetupAttachment(BarrelMesh);
Muzzle->SetRelativeLocation(FVector(80.f, 0.f, 10.f));

// Later, at run time
FVector SpawnLoc = Muzzle->GetComponentLocation();`,
    see: ['actor-component', 'root-component', 'primitive-component', 'ftransform'],
  },
  {
    id: 'root-component',
    term: 'Root Component',
    course: 'unreal',
    category: 'Actors & Components',
    short:
      'The scene component at the top of an actor\'s component hierarchy. The actor\'s location, rotation and scale *are* the root component\'s transform.',
    long:
      'When you call `SetActorLocation`, Unreal actually moves `RootComponent`, and every attached component follows. An actor without a root component has no transform at all, so `GetActorLocation()` returns the zero vector.\n\nSet it in the constructor with `SetRootComponent(Comp)`. The choice matters: for a physics-simulated object, the simulating primitive should be the root, otherwise the physics body moves away from the actor. `ACharacter` uses its capsule as the root so collision drives movement.\n\nIn Blueprint classes without a C++ root, the editor adds a placeholder `DefaultSceneRoot` that you can replace by dragging another component onto it.',
    example: `APickup::APickup() {
    Sphere = CreateDefaultSubobject<USphereComponent>(TEXT("Sphere"));
    SetRootComponent(Sphere);       // collision drives the actor
    Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
    Mesh->SetupAttachment(Sphere);
}`,
    see: ['scene-component', 'createdefaultsubobject', 'ftransform', 'actor'],
  },
  {
    id: 'static-mesh-component',
    term: 'Static Mesh Component',
    aliases: ['UStaticMeshComponent'],
    course: 'unreal',
    category: 'Actors & Components',
    short:
      'A primitive component (`UStaticMeshComponent`) that renders a non-animated 3D mesh asset and can provide its collision and physics body.',
    long:
      'Static meshes are rigid models (crates, walls, weapons, rocks), as opposed to skeletal meshes, which deform with bones for animated characters (`USkeletalMeshComponent`). The component references a `UStaticMesh` asset, and many components can share one asset.\n\nThe recommended workflow is to expose the component with `VisibleAnywhere` and let designers pick the mesh in a Blueprint subclass, or call `SetStaticMesh()` at run time. Hard-coding asset paths with `ConstructorHelpers::FObjectFinder` works but breaks when the asset moves.\n\nAs a `UPrimitiveComponent`, it has collision settings, can simulate physics and generates hit and overlap events. For hundreds of identical meshes, `UInstancedStaticMeshComponent` is far cheaper to render.',
    example: `// Header
UPROPERTY(VisibleAnywhere, BlueprintReadOnly)
TObjectPtr<UStaticMeshComponent> Mesh;

// Constructor
Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
Mesh->SetCollisionProfileName(TEXT("BlockAllDynamic"));`,
    see: ['primitive-component', 'scene-component', 'collision-profile', 'asset'],
  },
  {
    id: 'primitive-component',
    term: 'Primitive Component',
    aliases: ['UPrimitiveComponent'],
    course: 'unreal',
    category: 'Actors & Components',
    short:
      'A scene component (`UPrimitiveComponent`) with geometry: it can be rendered and/or collide. Meshes and shapes (box, sphere, capsule) are primitive components.',
    long:
      'This is where collision lives: the collision-enabled mode, the object type, responses per channel, overlap and hit events (`OnComponentBeginOverlap`, `OnComponentHit`) and physics simulation (`SetSimulatePhysics`, `AddImpulse`).\n\nShape components (`UBoxComponent`, `USphereComponent`, `UCapsuleComponent`) are invisible primitives used purely for collision and triggers. They are cheaper than mesh collision and easy to size.\n\nOverlap and hit events are bound per primitive component, not per actor. The actor-level `NotifyActorBeginOverlap` fires for overlaps on any of the actor\'s components.',
    example: `Trigger = CreateDefaultSubobject<UBoxComponent>(TEXT("Trigger"));
Trigger->SetBoxExtent(FVector(100.f));
Trigger->SetCollisionProfileName(TEXT("Trigger"));
Trigger->SetGenerateOverlapEvents(true);`,
    see: ['static-mesh-component', 'overlap-event', 'collision-response', 'physics-simulation'],
  },
  {
    id: 'createdefaultsubobject',
    term: 'CreateDefaultSubobject',
    course: 'unreal',
    category: 'Actors & Components',
    short:
      'Creates a component or other subobject inside a class constructor. The subobject becomes part of the class defaults, so every instance (and Blueprint subclass) gets its own copy.',
    long:
      'Call it only in the constructor: `Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));`. The name must be unique within the object; it identifies the subobject during serialisation, so renaming it later can break Blueprint subclasses that saved values under the old name.\n\nBecause the constructor builds the Class Default Object, these are "default subobjects": each spawned instance gets its own copy, and Blueprint subclasses can edit their properties when the pointer is exposed with `VisibleAnywhere` or similar.\n\nFor scene components, call `SetupAttachment(Parent)` in the constructor; `AttachToComponent` is for run time. To add a component during gameplay instead, use `NewObject` followed by `RegisterComponent()`.',
    example: `AChest::AChest() {
    Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(Root);

    Lid = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Lid"));
    Lid->SetupAttachment(Root);
}`,
    see: ['root-component', 'scene-component', 'cdo', 'newobject'],
  },
  {
    id: 'spawnactor',
    term: 'SpawnActor',
    course: 'unreal',
    category: 'Actors & Components',
    short:
      'The `UWorld` function that creates an actor in a level at run time: `GetWorld()->SpawnActor<T>(Class, Location, Rotation, Params)`.',
    long:
      'Actors live in a world, so you create them through one. `SpawnActor` constructs the actor (copying the class defaults), runs `OnConstruction`, initialises its components and, if the game is running, calls `BeginPlay` before returning.\n\n`FActorSpawnParameters` sets the `Owner`, `Instigator`, name and `SpawnCollisionHandlingOverride`, which decides what happens if the spawn point is blocked. Depending on that setting the spawn can fail and return `nullptr`, so always check the result.\n\nTo set properties *before* `BeginPlay` runs, use `SpawnActorDeferred<T>(...)`, set the values, then call `FinishSpawning(Transform)`. Remove actors with `Destroy()` (or `SetLifeSpan`), never `delete`.',
    example: `FActorSpawnParameters Params;
Params.Owner = this;
Params.Instigator = GetInstigator();
Params.SpawnCollisionHandlingOverride =
    ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;

AProjectile* Shot = GetWorld()->SpawnActor<AProjectile>(
    ProjectileClass, SpawnLoc, SpawnRot, Params);`,
    see: ['actor', 'tsubclassof', 'beginplay', 'newobject'],
  },
  {
    id: 'beginplay',
    term: 'BeginPlay',
    course: 'unreal',
    category: 'Actors & Components',
    short:
      'A virtual function called once when an actor or component starts playing, after it has been spawned and initialised in a running world. The right place for gameplay setup.',
    long:
      'Unlike the constructor, which also runs for the Class Default Object in the editor, `BeginPlay` only runs in a live game world. It is safe to access other actors, `GetWorld()`, timers and the player controller here, and to bind delegates.\n\nAlways call `Super::BeginPlay()`. The base implementation does essential work, such as calling `BeginPlay` on the actor\'s components and firing the Blueprint "Event BeginPlay". Forgetting it is a common cause of "my Blueprint event never fires".\n\nDo not assume any order between different actors\' `BeginPlay` calls. If actor A needs actor B to be ready, use a delegate, a subsystem, or lazy initialisation.',
    example: `void AEnemy::BeginPlay() {
    Super::BeginPlay();   // never skip this
    CurrentHealth = MaxHealth;
    GetWorldTimerManager().SetTimer(PatrolTimer, this,
        &AEnemy::PickPatrolPoint, 3.f, true);
}`,
    see: ['actor-lifecycle', 'endplay', 'cdo', 'constructor'],
  },
  {
    id: 'endplay',
    term: 'EndPlay',
    course: 'unreal',
    category: 'Actors & Components',
    short:
      'A virtual function called when an actor or component stops playing: destroyed, level unloaded, Play In Editor stopped, or the game quit. The place to clean up timers, delegate bindings and registrations.',
    long:
      '`EndPlay(const EEndPlayReason::Type Reason)` tells you *why* play ended: `Destroyed`, `LevelTransition`, `EndPlayInEditor`, `RemovedFromWorld` or `Quit`. Remember to call `Super::EndPlay(Reason)`.\n\nUse it instead of the destructor for gameplay cleanup. A `UObject` destructor runs later, at an unpredictable moment during garbage collection, when the world may already be gone. Clear timers, unbind from other objects\' delegates and unregister from subsystems in `EndPlay`.\n\n`Destroyed()` is a related hook that only fires for explicit destruction (including in the editor); `EndPlay` is the more general, play-time hook.',
    example: `void ATurret::EndPlay(const EEndPlayReason::Type Reason) {
    GetWorldTimerManager().ClearTimer(FireTimer);
    if (IsValid(Target)) {
        Target->OnDied.RemoveAll(this);
    }
    Super::EndPlay(Reason);
}`,
    see: ['beginplay', 'actor-lifecycle', 'timer-manager', 'destructor'],
  },
  {
    id: 'actor-lifecycle',
    term: 'Actor Lifecycle',
    course: 'unreal',
    category: 'Actors & Components',
    short:
      'The sequence of stages an actor goes through: construction, component initialisation, `BeginPlay`, ticking, `EndPlay`, and finally garbage collection.',
    long:
      'For a spawned actor the main steps are: C++ constructor (defaults, components) → `PostActorCreated` → `OnConstruction` → `PostInitializeComponents` → `BeginPlay` → `Tick` every frame → `EndPlay` → destruction and, later, garbage collection. Actors loaded with a level go through `PostLoad` instead of `PostActorCreated`.\n\nKnowing the order tells you where code belongs: defaults in the constructor, placement-dependent setup in `OnConstruction`, wiring between components in `PostInitializeComponents`, gameplay in `BeginPlay`, cleanup in `EndPlay`.\n\nThe constructor also runs for the Class Default Object, and `OnConstruction` runs every time a designer moves or edits the actor in the editor, so neither should contain gameplay side effects.',
    example: `// Main hooks in order (Super:: calls omitted)
AMyActor::AMyActor() { /* defaults, components */ }
void AMyActor::OnConstruction(const FTransform& T) { /* editor */ }
void AMyActor::PostInitializeComponents() { /* wiring */ }
void AMyActor::BeginPlay() { /* gameplay setup */ }
void AMyActor::Tick(float Dt) { /* per frame */ }
void AMyActor::EndPlay(const EEndPlayReason::Type R) { /* cleanup */ }`,
    see: ['beginplay', 'endplay', 'construction-script', 'tick'],
    reading: [
      ue(
        'unreal-engine-actor-lifecycle',
        'Actor Lifecycle',
        'A diagram of every path an actor takes from creation to destruction.',
      ),
    ],
  },
  {
    id: 'construction-script',
    term: 'Construction Script / OnConstruction',
    aliases: ['OnConstruction'],
    course: 'unreal',
    category: 'Actors & Components',
    short:
      'Code that runs whenever an actor is placed, moved or edited in the editor, and when it is spawned: the Blueprint Construction Script, or an `OnConstruction(const FTransform&)` override in C++.',
    long:
      'Use it for procedural setup that depends on editable properties or placement: building a fence from N segments, tinting a light by an enum, sizing a trigger to a mesh. Designers see the result live as they tweak values.\n\nIt runs a lot (every property change, every drag in the viewport), so keep it fast and free of gameplay side effects: no spawning gameplay actors, no timers, no reliance on `BeginPlay` state. Be careful creating components here from C++, since repeated runs can pile up duplicates unless you clean them up; reusing components made in the constructor is safer.\n\nIn C++, override `OnConstruction` and call `Super::OnConstruction(Transform)`. It runs after the constructor, as part of the same construction step as the Blueprint Construction Script.',
    example: `void AFence::OnConstruction(const FTransform& Transform) {
    Super::OnConstruction(Transform);
    // Re-runs live as designers edit Length in the editor
    const int32 Posts = FMath::CeilToInt(Length / Spacing) + 1;
    PostMeshes->ClearInstances();   // instanced static mesh
    for (int32 i = 0; i < Posts; ++i) {
        const FVector Offset(i * Spacing, 0.f, 0.f);
        PostMeshes->AddInstance(FTransform(Offset));
    }
}`,
    see: ['actor-lifecycle', 'blueprint', 'createdefaultsubobject', 'beginplay'],
  },
  {
    id: 'projectile-movement-component',
    term: 'Projectile Movement Component',
    aliases: ['UProjectileMovementComponent'],
    course: 'unreal',
    category: 'Actors & Components',
    short:
      'A movement component (`UProjectileMovementComponent`) that moves its actor\'s root along a ballistic path each tick, with options for gravity, bouncing and homing.',
    long:
      'It covers typical projectile needs without physics simulation: initial and maximum speed, gravity scale, bounciness and friction, rotation that follows velocity, and homing toward a target component. Movement is swept, so the root\'s collision produces hit events when it strikes something, and the `OnProjectileStop` and `OnProjectileBounce` delegates report impacts.\n\nThe usual setup: a sphere collision component as the root (its collision drives the sweep), a mesh attached for visuals, and the movement component configured with `InitialSpeed`, `MaxSpeed` and `ProjectileGravityScale`. Set `InitialLifeSpan` so missed shots clean themselves up.\n\nFor bullets that should hit instantly, a line trace ("hitscan") is cheaper than spawning a projectile actor at all.',
    example: `AArrow::AArrow() {
    Collision = CreateDefaultSubobject<USphereComponent>(TEXT("Hit"));
    SetRootComponent(Collision);
    Move = CreateDefaultSubobject<UProjectileMovementComponent>(
        TEXT("Move"));
    Move->InitialSpeed = 3000.f;
    Move->MaxSpeed = 3000.f;
    Move->bRotationFollowsVelocity = true;
    InitialLifeSpan = 5.f;
}`,
    see: ['sweep', 'hit-event', 'line-trace', 'actor-component'],
  },

  // ----------------------------------------------------------------------- Time
  {
    id: 'tick',
    term: 'Tick',
    course: 'unreal',
    category: 'Time',
    short:
      'A function the engine calls every frame on actors and components that opt in: `Tick(float DeltaTime)`. Used for continuous, per-frame updates.',
    long:
      'Enable it in the constructor with `PrimaryActorTick.bCanEverTick = true` (actors) or `PrimaryComponentTick.bCanEverTick = true` (components), override `Tick`, and call `Super::Tick(DeltaTime)` first.\n\nTicking is not free: thousands of actors doing small checks every frame add up. Prefer events (overlaps, delegates), timers for periodic work, or a lower tick rate (`PrimaryActorTick.TickInterval = 0.2f`). Turn it off when not needed with `SetActorTickEnabled(false)`.\n\nTick groups (`TG_PrePhysics`, `TG_PostPhysics`…) and tick prerequisites control ordering, for example a camera that must update after the character has moved.',
    example: `AFloater::AFloater() {
    PrimaryActorTick.bCanEverTick = true;
}

void AFloater::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);
    RunningTime += DeltaTime;
    const float Z = FMath::Sin(RunningTime * 2.f) * 25.f;
    SetActorLocation(StartLocation + FVector(0.f, 0.f, Z));
}`,
    see: ['delta-time', 'timer-manager', 'actor-lifecycle', 'beginplay'],
    reading: [
      ue(
        'actor-ticking-in-unreal-engine',
        'Actor Ticking',
        'Tick groups, tick intervals, prerequisites and how to keep ticking cheap.',
      ),
    ],
  },
  {
    id: 'delta-time',
    term: 'DeltaTime',
    course: 'unreal',
    category: 'Time',
    short:
      'The time in seconds since the previous frame, passed to `Tick`. Multiply per-second rates by it so behaviour is the same at any frame rate.',
    long:
      'At 60 FPS DeltaTime is about 0.0167 s; at 30 FPS about 0.033 s. Moving an actor 5 units per tick makes it twice as fast at 120 FPS as at 60, a classic bug. Moving `Speed * DeltaTime` units per tick, with `Speed` in units per second, gives the same speed everywhere.\n\nDeltaTime is scaled by time dilation (slow motion via `SetGlobalTimeDilation`) and is clamped to a maximum, so a long hitch does not produce one giant step. Smoothing helpers such as `FMath::FInterpTo` take DeltaTime for the same reason.\n\nFor absolute time, use `GetWorld()->GetTimeSeconds()` (game time: affected by pause and dilation) or `GetRealTimeSeconds()` (wall-clock time since the world started).',
    example: `void ARocket::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);
    // 1200 units per second regardless of frame rate
    const float Speed = 1200.f;
    AddActorWorldOffset(GetActorForwardVector() * Speed * DeltaTime);
}`,
    see: ['tick', 'fmath', 'timer-manager'],
  },
  {
    id: 'timer-manager',
    term: 'Timer Manager',
    aliases: ['FTimerManager'],
    course: 'unreal',
    category: 'Time',
    short:
      'The per-world system (`FTimerManager`) that calls a function after a delay or repeatedly at an interval, so you don\'t have to write countdown code in `Tick`.',
    long:
      'Get it with `GetWorldTimerManager()` on actors or `GetWorld()->GetTimerManager()`, then call `SetTimer(Handle, this, &AMyActor::Func, Rate, bLoop, FirstDelay)`. You can also pass an `FTimerDelegate`, including one made with `CreateLambda` or `CreateUObject` with extra payload arguments.\n\nTimers are cheaper and clearer than accumulating `DeltaTime` for things like respawn delays, damage-over-time pulses or cooldowns. They run on game time, so they respect pause and time dilation.\n\nPitfalls: a timer bound to a member function will not fire after its object is destroyed, but a plain lambda capturing `this` can, so use `FTimerDelegate::CreateWeakLambda(this, ...)`. Timers belong to the world and die with the level; the GameInstance has its own timer manager for timers that must survive travel.',
    example: `FTimerHandle RespawnTimer;   // member: lets you cancel it

void AHero::Die() {
    GetWorldTimerManager().SetTimer(RespawnTimer, this,
        &AHero::Respawn, 3.f, false);   // once, in 3 s
}
void AHero::CancelRespawn() {
    GetWorldTimerManager().ClearTimer(RespawnTimer);
}`,
    see: ['ftimerhandle', 'tick', 'delta-time', 'delegate'],
    reading: [
      ue(
        'gameplay-timers-in-unreal-engine',
        'Gameplay Timers',
        'Setting, pausing, clearing and querying timers, with C++ examples.',
      ),
    ],
  },
  {
    id: 'ftimerhandle',
    term: 'FTimerHandle',
    course: 'unreal',
    category: 'Time',
    short:
      'A small handle that identifies a timer set through the Timer Manager, so you can later clear, pause or query it.',
    long:
      '`SetTimer` writes into the handle you pass. Store it as a member if you might need to cancel the timer (`ClearTimer`, which also invalidates the handle), check it (`IsTimerActive`, `GetTimerRemaining`) or pause it (`PauseTimer`/`UnPauseTimer`).\n\nCalling `SetTimer` again with the same handle replaces the existing timer, a simple way to restart a cooldown. Once a non-looping timer has fired, `IsTimerActive(Handle)` returns false.\n\nThe handle is only an identifier, not the timer itself: copying it does not duplicate the timer, and letting it go out of scope does not cancel anything. A timer set with a local handle simply cannot be cleared later.',
    example: `FTimerHandle CooldownTimer;   // member

void AHero::UseDash() {
    FTimerManager& TM = GetWorldTimerManager();
    if (TM.IsTimerActive(CooldownTimer)) { return; } // cooling down
    Dash();
    TM.SetTimer(CooldownTimer, this, &AHero::OnDashReady, 2.f, false);
}`,
    see: ['timer-manager', 'tick'],
  },

  // --------------------------------------------------------------- Math & Types
  {
    id: 'fvector',
    term: 'FVector',
    course: 'unreal',
    category: 'Math & Types',
    short:
      'Unreal\'s 3D vector struct (X, Y, Z) used for positions, directions, velocities and scales. In UE5 its components are `double`.',
    long:
      'Unreal uses a left-handed, Z-up coordinate system: X is forward, Y is right, Z is up, and 1 unit is 1 centimetre. `FVector` provides the operations you expect: `+`, `-`, scalar `*`, `FVector::DotProduct` (or `|`), `FVector::CrossProduct` (or `^`), `Size()`, `GetSafeNormal()` and `FVector::Dist()`.\n\nSince UE 5.0, `FVector` is an alias for `UE::Math::TVector<double>` to support Large World Coordinates. `FVector3f` is the `float` version, used for rendering and memory-sensitive data.\n\nUse `GetSafeNormal()` rather than `GetUnsafeNormal()` unless you are sure the vector is not zero: normalising a zero vector divides by zero.',
    example: `FVector ToTarget = Target->GetActorLocation() - GetActorLocation();
double Distance = ToTarget.Size();            // centimetres
FVector Dir = ToTarget.GetSafeNormal();       // unit length
double Facing = FVector::DotProduct(GetActorForwardVector(), Dir);
bool bInFront = Facing > 0.0;`,
    see: ['frotator', 'ftransform', 'large-world-coordinates', 'fmath'],
  },
  {
    id: 'frotator',
    term: 'FRotator',
    course: 'unreal',
    category: 'Math & Types',
    short:
      'A rotation stored as Pitch, Yaw and Roll angles in **degrees**. Easy to read and edit; converted to quaternions for heavier math.',
    long:
      'Pitch rotates around the Y axis (nose up and down), Yaw around Z (turning left and right) and Roll around X (tilting). Note the constructor order, `FRotator(Pitch, Yaw, Roll)`, which differs from the X, Y, Z order you might expect.\n\nRotators are great for designer-facing values and simple turns, but Euler angles suffer from gimbal lock and awkward interpolation. For blending orientations use `FQuat` or helpers like `FMath::RInterpTo`.\n\nConvert with `Rot.Vector()` (forward direction), `Dir.Rotation()`, `Rot.Quaternion()` and `Rot.RotateVector(V)`. Like `FVector`, its components are `double` in UE5.',
    example: `// Pitch, Yaw, Roll -- in degrees
FRotator LookUpRight(15.f, 45.f, 0.f);
FVector Forward = LookUpRight.Vector();

FRotator Current = GetActorRotation();
FRotator Smoothed = FMath::RInterpTo(Current, LookUpRight,
    DeltaTime, 5.f);
SetActorRotation(Smoothed);`,
    see: ['fquat', 'fvector', 'ftransform'],
  },
  {
    id: 'fquat',
    term: 'FQuat',
    course: 'unreal',
    category: 'Math & Types',
    short:
      'A quaternion representing a 3D rotation without gimbal lock. Used for robust rotation math, combining rotations and smooth interpolation.',
    long:
      'A quaternion stores a rotation as four numbers (X, Y, Z, W) derived from an axis and an angle. You rarely read the components; you build quaternions from axes or rotators and combine them.\n\nCombine rotations by multiplication: `B * A` applies `A` first, then `B`, so order matters. Interpolate with `FQuat::Slerp(A, B, Alpha)` for constant-speed, shortest-path blending. `FTransform` stores its rotation as an `FQuat` internally.\n\nPrefer `FRotator` for anything a human edits and `FQuat` for math-heavy code: aiming, physics, animation, or accumulating many small rotations.',
    example: `// Rotate 30 degrees around world up (Z)
const FQuat Turn(FVector::UpVector, FMath::DegreesToRadians(30.f));
const FQuat NewRot = Turn * GetActorQuat();   // current, then turn
SetActorRotation(NewRot);

FQuat Halfway = FQuat::Slerp(StartQuat, EndQuat, 0.5f);`,
    see: ['frotator', 'ftransform', 'fvector'],
  },
  {
    id: 'ftransform',
    term: 'FTransform',
    course: 'unreal',
    category: 'Math & Types',
    short:
      'A struct combining translation (`FVector`), rotation (`FQuat`) and 3D scale (`FVector`): the full placement of an actor or component.',
    long:
      'Every scene component has a relative transform (to its parent) and a world transform. `GetActorTransform()` returns the root component\'s world transform, and `SpawnActor` and `FinishSpawning` accept one.\n\nUse `TransformPosition(LocalPoint)` to go from local to world space and `InverseTransformPosition(WorldPoint)` for the reverse; use `TransformVector` or `TransformVectorNoScale` for directions. Composing transforms with `A * B` applies `A` first, then `B`, the opposite convention to `FQuat` multiplication and a common source of confusion.\n\nNon-uniform scale combined with rotation cannot always be represented exactly when transforms are composed, so keep scale uniform in hierarchies when you can.',
    example: `const FTransform& Xf = GetActorTransform();
// A point 100 cm in front of the actor, in world space
FVector WorldPt = Xf.TransformPosition(FVector(100.f, 0.f, 0.f));

FTransform SpawnXf(GetActorRotation(), WorldPt, FVector(1.f));
GetWorld()->SpawnActor<AActor>(PickupClass, SpawnXf);`,
    see: ['fvector', 'fquat', 'scene-component'],
  },
  {
    id: 'large-world-coordinates',
    term: 'Large World Coordinates',
    aliases: ['LWC'],
    course: 'unreal',
    category: 'Math & Types',
    short:
      'The UE5 feature that switched core math types (`FVector`, `FRotator`, `FTransform`…) to `double` precision, so worlds can be far larger than in UE4 without jitter far from the origin.',
    long:
      'With 32-bit floats, precision degrades as numbers grow: a few kilometres from the origin, positions can only change in steps of millimetres or more, causing jittery animation, camera shake and physics glitches. UE 5.0 introduced Large World Coordinates: `FVector` became `TVector<double>`, and the engine\'s transforms, physics and rendering were adapted to match.\n\nFor most gameplay code this is invisible, but it explains some details: storing `FVector` components in `float` variables silently throws precision away, and `FVector3f` exists for places where memory or GPU data matter more than range.\n\nBlueprint float variables also became double precision in UE 5.0, so Blueprint and C++ math agree.',
    example: `FVector Pos = GetActorLocation();   // double X, Y, Z
double X = Pos.X;                   // keeps full precision
float Lossy = Pos.X;                // narrowing: avoid for positions

FVector3f GpuFriendly(Pos);         // explicit float version`,
    see: ['fvector', 'floating-point', 'ftransform'],
    reading: [
      ue(
        'large-world-coordinates-in-unreal-engine-5',
        'Large World Coordinates',
        'Why UE5 moved to double precision and what it means for your C++ math types.',
      ),
    ],
  },
  {
    id: 'int32',
    term: 'int32 and Friends',
    aliases: ['uint8', 'int64'],
    course: 'unreal',
    category: 'Math & Types',
    short:
      'Unreal\'s fixed-size numeric typedefs (`int8`, `int16`, `int32`, `int64`, `uint8`…`uint64`), used instead of `int`, `short` or `long` so sizes are identical on every platform.',
    long:
      'The C++ standard only guarantees minimum sizes for `int` and `long` (a `long` is 32 bits on Windows but 64 bits on Linux). Unreal\'s typedefs have exact sizes, like `std::int32_t`, which matters for serialisation, networking and save files shared across platforms.\n\nThe Epic coding standard uses `int32` for general integers, `uint8` for bytes and enum storage, `int64` for large counts and timestamps, `float`/`double` for reals and `bool` for flags (named with a `b` prefix). Blueprint supports `uint8` (Byte), `int32` (Integer) and `int64` (Integer64); other integer types can be `UPROPERTY`s but are not visible to Blueprint.\n\nUse `TNumericLimits<int32>::Max()` for limits, and note that `TArray::Num()` returns a signed `int32`, unlike the unsigned `std::vector::size()`.',
    example: `int32 Score = 0;            // the default integer type
uint8 TeamId = 2;           // 0..255, Blueprint "Byte"
int64 TotalXP = 5'000'000'000;
float Speed = 600.f;
bool bIsAlive = true;       // 'b' prefix for bools

static_assert(sizeof(int32) == 4, "always 4 bytes");`,
    see: ['fixed-width-integer', 'integer-type', 'coding-standard'],
  },
  {
    id: 'fmath',
    term: 'FMath',
    course: 'unreal',
    category: 'Math & Types',
    short:
      'Unreal\'s math utility struct of static functions: clamping, interpolation, trigonometry, random numbers, rounding and geometry helpers.',
    long:
      '`FMath` gathers what standard C++ spreads across `<cmath>`, `<algorithm>` and `<random>`: `FMath::Clamp`, `Min`/`Max`, `Abs`, `Sqrt`, `Sin`, `Lerp`, `RandRange`, `FRand`, `RoundToInt`, `IsNearlyEqual`, plus game-specific helpers like `FInterpTo`, `VInterpTo` and `RInterpTo` (frame-rate-independent smoothing) and `DegreesToRadians`.\n\nCompare floating-point values with `FMath::IsNearlyEqual(A, B)` or `IsNearlyZero` instead of `==`, because floating-point arithmetic accumulates rounding error.\n\n`FMath::RandRange` uses the engine\'s global random state. For reproducible sequences (procedural levels, replays), use an `FRandomStream` with a fixed seed.',
    example: `Health = FMath::Clamp(Health - Damage, 0.f, MaxHealth);
int32 Roll = FMath::RandRange(1, 20);            // inclusive
float Smooth = FMath::FInterpTo(Current, Target, DeltaTime, 4.f);
if (FMath::IsNearlyZero(Speed)) { /* stopped */ }

FRandomStream Rng(1234);   // same seed -> same sequence
int32 Tile = Rng.RandRange(0, 9);`,
    see: ['fvector', 'delta-time', 'floating-point'],
  },

  // ------------------------------------------------------- Strings & Containers
  {
    id: 'fstring',
    term: 'FString',
    course: 'unreal',
    category: 'Strings & Containers',
    short:
      'Unreal\'s mutable, heap-allocated string class, a dynamic array of `TCHAR`. Use it for text you build, manipulate or log, not for player-facing text or identifiers.',
    long:
      '`FString` is the closest thing to `std::string`: you can append, search, split, format and compare. It stores `TCHAR` characters (UTF-16 on Windows) and works with `TEXT("...")` literals.\n\nPassing an `FString` to `UE_LOG` or `FString::Printf` with `%s` requires dereferencing it with `*`, which yields a `const TCHAR*`: `UE_LOG(LogTemp, Log, TEXT("%s"), *Name);`. Forgetting the `*` is a classic bug.\n\nChoose the right string type: `FString` for manipulation, `FName` for identifiers that are compared often (fast, case-insensitive, immutable), `FText` for anything shown to players (localisable). Pass `FString` parameters as `const FString&` to avoid copies.',
    example: `FString PlayerName = TEXT("Ava");
FString Msg = FString::Printf(TEXT("%s scored %d"), *PlayerName, 42);
Msg += TEXT("!");
if (Msg.Contains(TEXT("Ava"))) {
    UE_LOG(LogTemp, Log, TEXT("%s"), *Msg);
}`,
    see: ['fname', 'ftext', 'text-macro', 'std-string'],
    reading: [
      ue(
        'string-handling-in-unreal-engine',
        'String Handling',
        'Compares FString, FName and FText and shows how to convert between them.',
      ),
    ],
  },
  {
    id: 'fname',
    term: 'FName',
    course: 'unreal',
    category: 'Strings & Containers',
    short:
      'An immutable, case-insensitive identifier stored once in a global name table, so copying and comparing names is as cheap as comparing integers. Used for asset, bone, socket, tag and row names.',
    long:
      'When you create `FName(TEXT("Muzzle"))`, the string is looked up (or added) in a global table and the `FName` stores only an index plus a number suffix. Comparing two `FName`s compares indices, with no string comparison, which is why the engine uses them for socket names, data table rows, collision profiles and property names.\n\nTrade-offs: comparisons are case-insensitive (`Muzzle` equals `MUZZLE`), names cannot be edited, and every unique name created stays in the table for the life of the process, so avoid generating unbounded unique names at run time.\n\nUse `NAME_None` for "no name" and `IsNone()` to test it. Convert with `Name.ToString()` (to `FString`) or `FName(*Str)`.',
    example: `static const FName MuzzleSocket(TEXT("Muzzle"));

FVector Loc = Mesh->GetSocketLocation(MuzzleSocket);
FName Row = TEXT("Sword");              // implicit from TEXT
bool bSame = (Row == FName(TEXT("SWORD"))); // true
FString AsString = Row.ToString();`,
    see: ['fstring', 'ftext', 'gameplay-tag', 'hash-table'],
    reading: [
      ue(
        'string-handling-in-unreal-engine',
        'String Handling',
        'Explains the name table behind FName and when to prefer it over FString.',
      ),
    ],
  },
  {
    id: 'ftext',
    term: 'FText',
    course: 'unreal',
    category: 'Strings & Containers',
    short:
      'Unreal\'s localisable text type for anything a player reads: UI labels, item names, dialogue. It carries the information needed to translate and culture-format the text.',
    long:
      'An `FText` is not just characters: it remembers a namespace, key and source string so the localisation pipeline can gather it and swap in translations at run time. Numbers and dates formatted with `FText::AsNumber` or `FText::Format` follow the player\'s culture (`1,000.5` versus `1.000,5`).\n\nCreate localisable literals with `LOCTEXT(Key, "Text")` (after `#define LOCTEXT_NAMESPACE "..."`) or `NSLOCTEXT(Namespace, Key, "Text")`. `FText::FromString` makes *non*-localised text: fine for player-entered names, wrong for UI copy.\n\nRule of thumb: `FText` for display, `FString` for manipulation and debugging, `FName` for identifiers. Converting `FText` to `FString` and back loses its localisation identity, so avoid round trips.',
    example: `#define LOCTEXT_NAMESPACE "Inventory"

FText Prompt = LOCTEXT("PickupPrompt", "Press E to pick up");
FText Count = FText::Format(
    LOCTEXT("ItemCount", "{0} x {1}"),
    FText::AsNumber(3), ItemName);

#undef LOCTEXT_NAMESPACE`,
    see: ['fstring', 'fname', 'umg'],
    reading: [
      ue(
        'string-handling-in-unreal-engine',
        'String Handling',
        'Shows where FText fits and how it converts to and from the other string types.',
      ),
    ],
  },
  {
    id: 'text-macro',
    term: 'TEXT()',
    course: 'unreal',
    category: 'Strings & Containers',
    short:
      'A macro that turns a string literal into a `TCHAR` (wide character) literal, e.g. `TEXT("Hello")`. Use it for literals passed to `FString`, `FName`, `UE_LOG` and most engine APIs.',
    long:
      'Unreal\'s character type `TCHAR` is wider than `char` (`wchar_t` on Windows). `TEXT("abc")` adds the right prefix for the platform, such as `L"abc"` on Windows, so the same source compiles everywhere.\n\nWithout it, a plain `"abc"` is a `const char*`: some APIs accept it with a runtime conversion, others do not compile, and `UE_LOG` format strings *require* `TEXT`.\n\n`TEXT()` only works on string literals. `TEXT(MyVariable)` is a compile error, because the macro simply pastes a prefix onto the literal token.',
    example: `UE_LOG(LogTemp, Warning, TEXT("Low health: %d"), Health);
FString Path = TEXT("/Game/Maps/Arena");
FName Socket(TEXT("hand_r"));
// TEXT(Path) would not compile: literals only`,
    see: ['fstring', 'string-literal', 'ue-log', 'macro'],
  },
  {
    id: 'tarray',
    term: 'TArray',
    course: 'unreal',
    category: 'Strings & Containers',
    short:
      'Unreal\'s dynamic array: a contiguous, resizable container like `std::vector`, and the most used container in the engine. It can be a `UPROPERTY` and is exposed to Blueprint.',
    long:
      '`TArray<T>` stores elements contiguously, so iteration is cache-friendly and indexing is O(1). `Add`/`Emplace` append in amortised O(1), `Insert` and `RemoveAt` shift elements in O(n), and `RemoveAtSwap` removes in O(1) by moving the last element into the gap when order does not matter.\n\nUnreal uses its own container rather than `std::vector` for portability, custom allocators (e.g. `TInlineAllocator` to avoid heap allocations for small arrays), reflection and serialisation support, and Blueprint integration. API names differ: `Num()` instead of `size()`, `Add` instead of `push_back`, plus `Contains`, `Find`, `FindByPredicate` and `Sort`.\n\nLike `std::vector`, adding elements can reallocate and invalidate pointers and references to elements, and removing elements inside a range-for loop is unsafe. Iterate backwards by index, or use `RemoveAll(Predicate)`.',
    example: `UPROPERTY(EditAnywhere)
TArray<FName> Loot;

Loot.Add(TEXT("Potion"));
Loot.Emplace(TEXT("Sword"));
Loot.RemoveAll([](const FName& N) { return N == TEXT("Junk"); });
for (const FName& Item : Loot) { /* read-only iteration */ }
int32 Count = Loot.Num();`,
    see: ['std-vector', 'tmap', 'tset', 'iterator-invalidation'],
    reading: [
      ue(
        'array-containers-in-unreal-engine',
        'Array Containers',
        'The complete TArray API: adding, removing, sorting, searching and heap operations.',
      ),
    ],
  },
  {
    id: 'tmap',
    term: 'TMap',
    course: 'unreal',
    category: 'Strings & Containers',
    short:
      'Unreal\'s hash map from unique keys to values, like `std::unordered_map`. Fast lookup by key; it can be a `UPROPERTY`.',
    long:
      '`TMap<K, V>` stores key–value pairs (`TPair<K, V>`) in a hash table, so `Add`, `Find`, `Contains` and `Remove` are O(1) on average. Keys need a `GetTypeHash` overload and `operator==`; `int32`, `FName`, `FString`, `FGameplayTag` and object pointers already have them.\n\n`Find(Key)` returns a pointer to the value or `nullptr`, the idiomatic way to look up without inserting. `Map[Key]` asserts if the key is missing, unlike `std::unordered_map::operator[]`, which inserts a default value. `FindOrAdd` gives you insert-on-miss explicitly.\n\nDo not rely on iteration order. `TMap` and `TSet` properties cannot be replicated, and `TMultiMap` allows duplicate keys.',
    example: `UPROPERTY(EditAnywhere)
TMap<FName, int32> Inventory;

Inventory.Add(TEXT("Arrow"), 20);
if (int32* Count = Inventory.Find(TEXT("Arrow"))) {
    *Count -= 1;                  // edit in place
}
Inventory.FindOrAdd(TEXT("Gem")) += 1;
for (const TPair<FName, int32>& Pair : Inventory) { /* ... */ }`,
    see: ['std-unordered-map', 'tarray', 'tset', 'hash-table'],
    reading: [
      ue(
        'map-containers-in-unreal-engine',
        'Map Containers',
        'TMap and TMultiMap: adding, finding, removing, iterating and custom key functions.',
      ),
    ],
  },
  {
    id: 'tset',
    term: 'TSet',
    course: 'unreal',
    category: 'Strings & Containers',
    short:
      'Unreal\'s hash set of unique values, like `std::unordered_set`, with O(1) average `Add`, `Contains` and `Remove`.',
    long:
      'Use `TSet<T>` when you only care whether something is present: actors already hit by an explosion, unlocked achievement IDs, visited grid cells. Adding a duplicate leaves the set unchanged.\n\nLike `TMap`, elements need `GetTypeHash` and `operator==`. Sets support set algebra with `Union`, `Intersect`, `Difference` and `Includes`.\n\nWhy not a `TArray` with `Contains`? `TArray::Contains` is a linear O(n) search; with hundreds of elements checked every frame a set is dramatically faster. For a handful of elements, a small array can still win thanks to cache locality.',
    example: `TSet<AActor*> AlreadyHit;

for (const FHitResult& Hit : Hits) {
    AActor* Victim = Hit.GetActor();
    if (Victim && !AlreadyHit.Contains(Victim)) {
        AlreadyHit.Add(Victim);
        DealDamage(Victim);   // once per actor
    }
}`,
    see: ['std-set', 'tarray', 'tmap', 'big-o'],
    reading: [
      ue(
        'set-containers-in-unreal-engine',
        'Set Containers',
        'The TSet API and how to provide custom hashing for your own types.',
      ),
    ],
  },

  // ------------------------------------------------------------------ Debugging
  {
    id: 'ue-log',
    term: 'UE_LOG',
    course: 'unreal',
    category: 'Debugging',
    short:
      'The engine\'s logging macro: `UE_LOG(Category, Verbosity, TEXT("format"), args...)`. Messages go to the Output Log, the log file and the console.',
    long:
      'Format strings use printf-style specifiers: `%d` for `int32`, `%f` for `float`/`double`, `%s` for strings (pass `*MyFString`), `%p` for pointers. Verbosity levels from most to least severe: `Fatal` (which crashes!), `Error`, `Warning`, `Display`, `Log`, `Verbose`, `VeryVerbose`.\n\nLogs are also written to `Saved/Logs/<Project>.log`, so they help diagnose problems in packaged development builds too. Categories let you filter and change verbosity per system at run time, e.g. with the `Log LogTemp Verbose` console command.\n\nUE 5.2 added `UE_LOGFMT` (include `Logging/StructuredLog.h`), which uses `{Name}` placeholders and type-safe arguments instead of printf specifiers. Avoid logging every frame: formatting and writing logs is not free.',
    example: `#include "Logging/StructuredLog.h"   // for UE_LOGFMT

UE_LOG(LogTemp, Log, TEXT("Spawned %s"), *GetName());
UE_LOG(LogTemp, Warning, TEXT("Health low: %.1f"), Health);
UE_LOG(LogTemp, Error, TEXT("No weapon on %s"), *GetName());

UE_LOGFMT(LogTemp, Log, "Picked up {Count} coins", Coins);`,
    see: ['log-category', 'console-command', 'draw-debug', 'cout'],
  },
  {
    id: 'log-category',
    term: 'Log Category',
    course: 'unreal',
    category: 'Debugging',
    short:
      'A named channel for log messages (e.g. `LogTemp`, `LogInventory`) with its own runtime and compile-time verbosity, so you can filter and silence logs per system.',
    long:
      '`LogTemp` is fine for quick experiments, but real projects declare a category per system. Declare it in a header with `DECLARE_LOG_CATEGORY_EXTERN(Name, DefaultVerbosity, CompileTimeVerbosity)` and define it in exactly one `.cpp` with `DEFINE_LOG_CATEGORY(Name)`, the same declaration/definition split as an `extern` global variable.\n\nMessages more verbose than the compile-time verbosity are stripped from the binary entirely. The runtime verbosity can be changed with the console command `Log LogInventory Verbose` or in `DefaultEngine.ini` under `[Core.Log]`.\n\nFor a category used in only one `.cpp`, `DEFINE_LOG_CATEGORY_STATIC(LogMyFile, Log, All);` declares and defines it in one line.',
    example: `// MyGame.h
DECLARE_LOG_CATEGORY_EXTERN(LogInventory, Log, All);

// MyGame.cpp
DEFINE_LOG_CATEGORY(LogInventory);

// Any file that includes MyGame.h
UE_LOG(LogInventory, Verbose, TEXT("Sorted %d items"), Num);`,
    see: ['ue-log', 'console-command', 'global-variable'],
  },
  {
    id: 'check-macro',
    term: 'check()',
    course: 'unreal',
    category: 'Debugging',
    short:
      'An assertion macro that stops the program with a crash report if its condition is false. It is compiled out of Shipping builds by default, so the expression must have no side effects.',
    long:
      'Use `check(Condition)` for invariants that must never be false: if one is, continuing would corrupt state, so crashing immediately with a callstack is the kindest option. `checkf(Cond, TEXT("fmt"), ...)` adds a formatted message, `checkNoEntry()` marks code that should be unreachable, and `checkSlow` only runs in Debug builds.\n\nLike `assert` from `<cassert>`, the whole expression disappears when checks are disabled (Shipping, by default). `check(InitSystem())` would skip the initialisation in shipping builds; use `verify` for expressions with side effects.\n\nIn the editor a failed `check` brings down the whole editor, so for recoverable "this should not happen" situations prefer `ensure`.',
    example: `void UInventory::RemoveAt(int32 Index) {
    check(Items.IsValidIndex(Index));   // programmer error
    checkf(Owner, TEXT("Inventory %s has no owner"), *GetName());
    Items.RemoveAt(Index);
}`,
    see: ['ensure-macro', 'verify-macro', 'assertion'],
    reading: [
      ue(
        'asserts-in-unreal-engine',
        'Asserts',
        'The check, verify and ensure families and how each behaves in different build configurations.',
      ),
    ],
  },
  {
    id: 'ensure-macro',
    term: 'ensure()',
    course: 'unreal',
    category: 'Debugging',
    short:
      'A non-fatal assertion: if the condition is false it logs an error with a callstack (and breaks into an attached debugger), then lets the program continue. It returns the condition, so it can guard code.',
    long:
      '`ensure` is for "this indicates a bug, but we can recover": a missing optional reference, an unexpected state. Because it returns the condition, the idiom is `if (ensure(Weapon)) { Weapon->Fire(); }`, which reports the bug *and* avoids the crash.\n\nBy default each `ensure` reports only the first time it fails in a session, to avoid flooding logs; `ensureAlways` reports every time and `ensureMsgf(Cond, TEXT("fmt"), ...)` adds context. Unlike `check`, the condition is still evaluated in Shipping builds; only the reporting is compiled out.\n\nMany studios collect ensures through crash reporting, which makes them a cheap way to find bugs in playtests without stopping the game.',
    example: `void AHero::Attack() {
    if (!ensureMsgf(EquippedWeapon,
            TEXT("%s attacked with no weapon"), *GetName())) {
        return;                       // reported once, no crash
    }
    EquippedWeapon->Fire();
}`,
    see: ['check-macro', 'verify-macro', 'ue-log'],
    reading: [
      ue(
        'asserts-in-unreal-engine',
        'Asserts',
        'Explains when ensure fires, how often it reports, and its variants.',
      ),
    ],
  },
  {
    id: 'verify-macro',
    term: 'verify()',
    course: 'unreal',
    category: 'Debugging',
    short:
      'Like `check()`, but the expression is always evaluated, even in builds where assertions are disabled. Use it when the expression has a side effect you need.',
    long:
      'With checks enabled, `verify(Expr)` evaluates `Expr` and crashes if it is false. With checks disabled (Shipping), it still evaluates `Expr` and simply ignores the result.\n\nThat makes it the tool for "do this, and it must succeed". Writing `check(DoImportantThing())` instead would remove the call entirely from shipping builds, a bug that only appears in the final product.\n\n`verifyf(Expr, TEXT("fmt"), ...)` adds a message. In standard C++ you would get the same effect by keeping the call outside the assertion: `const bool Ok = Init(); assert(Ok);`.',
    example: `// The call always happens; the result is checked when enabled
verify(UGameplayStatics::SaveGameToSlot(Data, TEXT("Slot0"), 0));

// WRONG: the save vanishes entirely in Shipping builds
check(UGameplayStatics::SaveGameToSlot(Data, TEXT("Slot0"), 0));`,
    see: ['check-macro', 'ensure-macro', 'assertion'],
  },
  {
    id: 'draw-debug',
    term: 'DrawDebug Helpers',
    course: 'unreal',
    category: 'Debugging',
    short:
      'Functions in `DrawDebugHelpers.h` (`DrawDebugLine`, `DrawDebugSphere`, `DrawDebugBox`, `DrawDebugString`…) that draw temporary shapes in the world to visualise traces, ranges and positions.',
    long:
      'Seeing is debugging: draw the line of a weapon trace, the radius of an explosion, an AI\'s target point. Parameters typically include the world, positions, colour, `bPersistentLines`, `LifeTime` in seconds (the default `-1` without persistence means a single frame), depth priority and thickness.\n\nThey are compiled out of Shipping builds (`ENABLE_DRAW_DEBUG` is 0), so they are safe to leave in development code, but gameplay must never depend on them.\n\nFor debugging you want to record and scrub through later, especially AI and multiplayer, use the Visual Logger instead of, or alongside, DrawDebug.',
    example: `#include "DrawDebugHelpers.h"

const FColor Col = bHit ? FColor::Red : FColor::Green;
DrawDebugLine(GetWorld(), Start, End, Col, false, 2.f, 0, 1.5f);
DrawDebugSphere(GetWorld(), Hit.ImpactPoint, 12.f, 12,
    FColor::Yellow, false, 2.f);
DrawDebugString(GetWorld(), GetActorLocation(),
    TEXT("Alerted!"), nullptr, FColor::White, 1.f);`,
    see: ['line-trace', 'visual-logger', 'ue-log'],
  },
  {
    id: 'visual-logger',
    term: 'Visual Logger',
    course: 'unreal',
    category: 'Debugging',
    short:
      'An editor tool (Tools → Debug → Visual Logger) that records log lines and debug shapes per actor over time, so you can scrub back through a play session and see what happened.',
    long:
      'DrawDebug shapes vanish and logs scroll away; the Visual Logger records both, timestamped and tied to the actor that produced them. After playing, you scrub a timeline, select an actor and see its log lines and shapes at that moment, which is invaluable for AI decisions, movement glitches and network issues.\n\nLog text with `UE_VLOG(this, Category, Verbosity, TEXT("fmt"), ...)` and shapes with `UE_VLOG_SEGMENT`, `UE_VLOG_LOCATION`, `UE_VLOG_BOX` and friends. Actors can add a state snapshot by implementing `IVisualLoggerDebugSnapshotInterface`.\n\nRecording only happens while the Visual Logger is active, and the macros compile out of Shipping builds, so leaving them in costs nothing in the final game.',
    example: `#include "VisualLogger/VisualLogger.h"

UE_VLOG(this, LogTemp, Log, TEXT("Chasing %s"), *GetNameSafe(Target));
UE_VLOG_SEGMENT(this, LogTemp, Log, GetActorLocation(),
    TargetLocation, FColor::Red, TEXT("Path"));
UE_VLOG_LOCATION(this, LogTemp, Verbose, TargetLocation, 25.f,
    FColor::Yellow, TEXT("Goal"));`,
    see: ['draw-debug', 'ue-log', 'console-command'],
    reading: [
      ue(
        'visual-logger-in-unreal-engine',
        'Visual Logger',
        'How to record, inspect and filter Visual Logger sessions, and the logging macros.',
      ),
    ],
  },
  {
    id: 'console-command',
    term: 'Console Command',
    aliases: ['Console Variable', 'CVar'],
    course: 'unreal',
    category: 'Debugging',
    short:
      'A command typed into the in-game console (opened with the backtick or tilde key) to inspect or change the running game, such as `stat fps` or `slomo 0.5`, including your own `Exec` functions and console variables.',
    long:
      'Built-in commands are invaluable: `stat fps` and `stat unit` (frame timing), `stat game`, `showdebug` (on-screen debug info), `show collision`, `slomo 0.2`, `pause`, `t.MaxFPS 30`, and `log LogTemp Verbose`.\n\nAdd your own by marking a function `UFUNCTION(Exec)` on a class that receives console commands (PlayerController, possessed Pawn, HUD, GameMode, CheatManager, GameInstance), or register commands and variables from anywhere with `FAutoConsoleCommand` and `TAutoConsoleVariable`.\n\nConsole variables (CVars) are named `Prefix.Name` by convention and can also be set in `.ini` files or on the command line, which makes them ideal for debug toggles and tuning knobs.',
    example: `// Your own console command (on a PlayerController)
UFUNCTION(Exec)
void GiveGold(int32 Amount);

// A console variable: type "MyGame.ShowAI 1" in the console
static TAutoConsoleVariable<int32> CVarShowAI(
    TEXT("MyGame.ShowAI"), 0, TEXT("Draw AI debug info"));`,
    see: ['ue-log', 'draw-debug', 'ufunction'],
  },

  // --------------------------------------------------------- Gameplay Framework
  {
    id: 'world',
    term: 'UWorld',
    aliases: ['World'],
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'The top-level object representing a running game (or editor) world: it owns the levels, actors, physics scene, timer manager and game mode. Get it with `GetWorld()`.',
    long:
      'Almost every gameplay operation goes through the world: spawning (`SpawnActor`), traces (`LineTraceSingleByChannel`), timers (`GetTimerManager()`), time (`GetTimeSeconds()`) and finding the game mode (`GetAuthGameMode()`).\n\nSeveral worlds can exist at once in the editor: the editor world, one per Play In Editor instance, and preview worlds in asset editors. That is why you ask an object for its world with `GetWorld()` instead of using a global. `UObject`s that are not actors or components find their world through their Outer chain.\n\n`GetWorld()` can return `nullptr`, for example on a Class Default Object or an object with no world in its Outer chain, so check it in code that might run in those situations.',
    example: `if (UWorld* World = GetWorld()) {
    const double Now = World->GetTimeSeconds();
    AGameModeBase* GM = World->GetAuthGameMode(); // server only
    World->SpawnActor<AActor>(PickupClass, GetActorTransform());
}`,
    see: ['level', 'game-mode', 'spawnactor', 'timer-manager'],
  },
  {
    id: 'level',
    term: 'Level',
    aliases: ['Map', 'ULevel'],
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'A map asset (`.umap`) containing placed actors and their lighting and navigation data. A world consists of a persistent level plus streamed sublevels or World Partition cells.',
    long:
      'In the editor you build levels by placing actors; at run time each level is a `ULevel` inside the `UWorld`. Opening a new map with `UGameplayStatics::OpenLevel` tears down the current world and loads a fresh one, destroying every actor; only the GameInstance and its subsystems survive.\n\nLarge worlds are split up: Level Streaming loads and unloads sublevels on demand, and UE5\'s **World Partition** automatically divides one big map into grid cells streamed in around the player.\n\nThe Level Blueprint is a graph owned by one level. It is handy for one-off scripted events but hard to reuse or reach from C++, so keep reusable logic in actors and components.',
    example: `// Travel to another map (destroys all current actors)
UGameplayStatics::OpenLevel(this, FName(TEXT("Arena")));

// Name of the current map
FString MapName = UGameplayStatics::GetCurrentLevelName(this);`,
    see: ['world', 'game-instance', 'actor'],
  },
  {
    id: 'game-mode',
    term: 'GameMode',
    aliases: ['AGameModeBase'],
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'The server-only actor (`AGameModeBase`/`AGameMode`) that defines the rules of a match: which classes to use for pawns, controllers and HUD, how players join and spawn, and when the game is won.',
    long:
      'Each level uses one GameMode class, set in World Settings or as the project default. Its default classes tell the engine what to create for each player: `DefaultPawnClass`, `PlayerControllerClass`, `PlayerStateClass`, `GameStateClass` and `HUDClass`.\n\nThe GameMode exists **only on the server** (or in single-player). Clients never have one, so `GetWorld()->GetAuthGameMode()` returns `nullptr` on clients. That is by design: rules and scoring decisions are authoritative. Anything clients need to know, such as the match timer or team scores, belongs in the GameState.\n\n`AGameModeBase` is the lightweight base; `AGameMode` adds match states (`WaitingToStart`, `InProgress`, `WaitingPostMatch`) for classic multiplayer matches. Override `PostLogin`, `ChoosePlayerStart` or `RestartPlayer` to customise joining and spawning.',
    example: `AArenaGameMode::AArenaGameMode() {
    DefaultPawnClass = AArenaCharacter::StaticClass();
    PlayerControllerClass = AArenaPlayerController::StaticClass();
    GameStateClass = AArenaGameState::StaticClass();
}

void AArenaGameMode::PostLogin(APlayerController* NewPlayer) {
    Super::PostLogin(NewPlayer);   // a player joined
}`,
    see: ['game-state', 'player-controller', 'authority', 'pawn'],
    reading: [
      ue(
        'game-mode-and-game-state-in-unreal-engine',
        'Game Mode and Game State',
        'What belongs in the GameMode versus the GameState, and how the default classes are chosen.',
      ),
    ],
  },
  {
    id: 'game-state',
    term: 'GameState',
    aliases: ['AGameStateBase'],
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'An actor that holds the replicated state of the match that every player should know (scores, match time, the list of players). It exists on the server and on all clients.',
    long:
      'The GameMode decides; the GameState broadcasts. Because the GameMode is server-only, information clients need lives in `AGameStateBase` (or `AGameState`) as `Replicated` properties that the engine sends to every client.\n\n`GameState->PlayerArray` lists every player\'s PlayerState, which makes a scoreboard easy to build on any machine. `GetServerWorldTimeSeconds()` gives a time synchronised with the server.\n\nGet it with `GetWorld()->GetGameState<AMyGameState>()`. Change its replicated variables on the server only; changes made on a client stay local and are overwritten by the next update.',
    example: `UCLASS()
class MYGAME_API AArenaGameState : public AGameStateBase {
    GENERATED_BODY()
public:
    UPROPERTY(Replicated, BlueprintReadOnly)
    int32 RedScore = 0;
    virtual void GetLifetimeReplicatedProps(
        TArray<FLifetimeProperty>& OutProps) const override;
};`,
    see: ['game-mode', 'player-state', 'replication'],
    reading: [
      ue(
        'game-mode-and-game-state-in-unreal-engine',
        'Game Mode and Game State',
        'Explains how the GameState shares match information with every client.',
      ),
    ],
  },
  {
    id: 'player-state',
    term: 'PlayerState',
    aliases: ['APlayerState'],
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'A replicated actor holding per-player information that others should see: name, score, team, ping. Every client has a copy of every player\'s PlayerState.',
    long:
      'Each connected player gets an `APlayerState`, owned by their PlayerController. Unlike the pawn, it survives death and respawn, so it is the right home for score, kills, team and other per-player stats. Unlike the PlayerController, it is replicated to *all* clients, not just its owner.\n\nReach it from a controller with `GetPlayerState<AMyPlayerState>()`, from a pawn with `GetPlayerState()`, or iterate `GameState->PlayerArray`.\n\nIn multiplayer games it is also a common home for the Gameplay Ability System component, precisely because it persists across respawns.',
    example: `UCLASS()
class MYGAME_API AArenaPlayerState : public APlayerState {
    GENERATED_BODY()
public:
    UPROPERTY(Replicated, BlueprintReadOnly)
    int32 Kills = 0;

    UPROPERTY(Replicated, BlueprintReadOnly)
    uint8 TeamId = 0;
};`,
    see: ['game-state', 'player-controller', 'replication'],
  },
  {
    id: 'player-controller',
    term: 'PlayerController',
    aliases: ['APlayerController'],
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'The actor (`APlayerController`) that represents a human player\'s will: it receives input, possesses a pawn, owns the camera view and HUD, and stands for the player\'s network connection.',
    long:
      'Think of the controller as the player and the pawn as the body. The controller persists while pawns die and respawn, so input setup, UI and player-specific logic often live here. AI uses `AAIController` in the same role.\n\nIn multiplayer, each client only has *its own* PlayerController, while the server has all of them. That makes it the natural place for client↔server RPCs about that player, and it is why you cannot look up another player\'s controller on a client.\n\nUseful members: `GetPawn()`, `Possess()`, `SetInputMode()`, `bShowMouseCursor`, `GetLocalPlayer()` (needed for Enhanced Input) and `ProjectWorldLocationToScreen()`. From anywhere, `UGameplayStatics::GetPlayerController(this, 0)` returns the first local player\'s controller.',
    example: `void AArenaPlayerController::BeginPlay() {
    Super::BeginPlay();
    bShowMouseCursor = false;
    SetInputMode(FInputModeGameOnly());

    if (APawn* Body = GetPawn()) {
        UE_LOG(LogTemp, Log, TEXT("Possessing %s"), *Body->GetName());
    }
}`,
    see: ['pawn', 'possession', 'enhanced-input', 'hud'],
    reading: [
      ue(
        'gameplay-framework-in-unreal-engine',
        'Gameplay Framework',
        'How controllers, pawns, game modes and states fit together.',
      ),
    ],
  },
  {
    id: 'pawn',
    term: 'Pawn',
    aliases: ['APawn'],
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'An actor that can be possessed and controlled by a player or an AI (`APawn`). It is the physical representation of an agent in the world.',
    long:
      'A pawn is "a body that can be driven": a vehicle, a turret, a spectator camera, a creature. `ACharacter` is a specialised pawn for walking humanoids. A pawn without a controller just sits there unless it is set to be possessed automatically.\n\nPawns set up input bindings (`SetupPlayerInputComponent`) and request movement (`AddMovementInput`); the actual movement is done by a movement component, such as `UFloatingPawnMovement` for a simple flying pawn.\n\nUseful members: `GetController()`, `IsLocallyControlled()`, `IsPlayerControlled()`, `AutoPossessPlayer` (for a pawn placed in a level), and `AIControllerClass` with `AutoPossessAI`.',
    example: `UCLASS()
class MYGAME_API ADrone : public APawn {
    GENERATED_BODY()
public:
    virtual void SetupPlayerInputComponent(
        UInputComponent* PlayerInputComponent) override;
private:
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UFloatingPawnMovement> Movement;
};`,
    see: ['character', 'possession', 'player-controller', 'actor'],
    reading: [
      ue(
        'gameplay-framework-in-unreal-engine',
        'Gameplay Framework',
        'Introduces pawns and characters and how controllers drive them.',
      ),
    ],
  },
  {
    id: 'character',
    term: 'Character',
    aliases: ['ACharacter'],
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'A pawn subclass (`ACharacter`) built for walking, jumping agents. It comes with a capsule for collision, a skeletal mesh and a `CharacterMovementComponent`.',
    long:
      '`ACharacter` saves a huge amount of work: the capsule root handles collision, the mesh component plays animations, and the `UCharacterMovementComponent` implements walking, falling, jumping, swimming, flying, crouching, step-up and slopes, plus networked movement with client-side prediction.\n\nYou drive a character by feeding input: `AddMovementInput(Direction, Scale)`, `AddControllerYawInput`, `Jump()`, `Crouch()`. Tune speeds on the movement component, e.g. `GetCharacterMovement()->MaxWalkSpeed = 600.f;`.\n\nUse `ACharacter` for humanoids and creatures that walk; for vehicles, flying cameras or turrets, a plain `APawn` with a fitting movement component is lighter.',
    example: `AHero::AHero() {
    GetCapsuleComponent()->InitCapsuleSize(42.f, 96.f);
    GetCharacterMovement()->MaxWalkSpeed = 600.f;
    GetCharacterMovement()->JumpZVelocity = 520.f;
    bUseControllerRotationYaw = false;
    GetCharacterMovement()->bOrientRotationToMovement = true;
}`,
    see: ['pawn', 'character-movement-component', 'possession'],
  },
  {
    id: 'possession',
    term: 'Possession',
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'The link between a controller and a pawn: when a controller *possesses* a pawn, its input and decisions drive that pawn. `Possess()` and `UnPossess()` change it.',
    long:
      'Possession is how a player switches bodies (entering a vehicle, taking over a turret) and how respawning works: the GameMode spawns a new pawn and the controller possesses it (`RestartPlayer` does this for you). A controller possesses at most one pawn at a time, and vice versa.\n\nHooks let you react: `AController::OnPossess(APawn*)` and `APawn::PossessedBy(AController*)` run on the server, and `APawn::NotifyControllerChanged()` runs on both server and owning client. UE 5.4 templates add Enhanced Input mapping contexts in `NotifyControllerChanged`.\n\nPossession happens on the server and replicates, so client-side code that needs the controller should not assume it already exists in `BeginPlay`.',
    example: `// In the GameMode (server): respawn a player
void AArenaGameMode::Respawn(AController* Player) {
    APawn* Body = GetWorld()->SpawnActor<APawn>(DefaultPawnClass,
        ChoosePlayerStart(Player)->GetActorTransform());
    if (Body) {
        Player->Possess(Body);
    }
}`,
    see: ['player-controller', 'pawn', 'game-mode'],
  },
  {
    id: 'hud',
    term: 'HUD',
    aliases: ['AHUD'],
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'The `AHUD` actor that owns a player\'s on-screen display. Modern projects draw UI with UMG widgets; `AHUD` remains a convenient place to create and manage them.',
    long:
      'Each PlayerController can have one HUD, chosen by the GameMode\'s `HUDClass`. Historically you drew directly onto a canvas in `DrawHUD()` (text, lines, textures), which is still handy for quick debug overlays.\n\nFor real UI, use UMG: create widgets with `CreateWidget<UUserWidget>(PlayerController, WidgetClass)` and show them with `AddToViewport()`. Whether you create them in the HUD, the PlayerController or a UI subsystem is a team convention; the HUD is a natural choice because it only exists on the owning client.\n\nThe HUD is never replicated and does not exist on dedicated servers, so it should display state, not own it.',
    example: `void AArenaHUD::BeginPlay() {
    Super::BeginPlay();
    if (HealthBarClass) {
        HealthBar = CreateWidget<UUserWidget>(
            GetOwningPlayerController(), HealthBarClass);
        HealthBar->AddToViewport();
    }
}`,
    see: ['umg', 'player-controller', 'game-mode'],
  },
  {
    id: 'game-instance',
    term: 'GameInstance',
    aliases: ['UGameInstance'],
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'A single object (`UGameInstance`) created when the game starts and kept until it shuts down. It survives level changes, unlike actors and the GameMode.',
    long:
      'When you open a new level, the world and every actor in it are destroyed. The GameInstance is not, which makes it the place for state that must persist across maps: the selected character, online session information, settings loaded at startup.\n\nSet your class in Project Settings → Maps & Modes → Game Instance Class. Access it with `GetGameInstance<UMyGameInstance>()` from actors, or `UGameplayStatics::GetGameInstance(this)`.\n\nRather than growing one giant GameInstance class, prefer `UGameInstanceSubsystem`s: separate classes with the same lifetime that the engine creates automatically.',
    example: `UCLASS()
class MYGAME_API UMyGameInstance : public UGameInstance {
    GENERATED_BODY()
public:
    UPROPERTY(BlueprintReadWrite)
    FName SelectedHero;
};

auto* GI = GetGameInstance<UMyGameInstance>();`,
    see: ['subsystem', 'level', 'game-mode'],
  },
  {
    id: 'subsystem',
    term: 'Subsystem',
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'An automatically created object whose lifetime is tied to an engine object: `UGameInstanceSubsystem`, `UWorldSubsystem`, `ULocalPlayerSubsystem`, `UEngineSubsystem` or `UEditorSubsystem`. A clean, modular alternative to singletons.',
    long:
      'Derive from one of the subsystem base classes and the engine creates one instance when its owner is created and destroys it with the owner: no registration and no globals. Fetch it with `GetGameInstance()->GetSubsystem<UQuestSubsystem>()` or `GetWorld()->GetSubsystem<UWaveSubsystem>()`.\n\nPick the lifetime that matches the data: game instance for things that persist across levels (save system, achievements), world for per-level systems (wave spawner), local player for per-player systems (Enhanced Input uses `UEnhancedInputLocalPlayerSubsystem`).\n\nSubsystems are exposed to Blueprint automatically, and they keep systems decoupled: anything can find the quest system without the GameInstance having to know about it.',
    example: `UCLASS()
class MYGAME_API UQuestSubsystem : public UGameInstanceSubsystem {
    GENERATED_BODY()
public:
    virtual void Initialize(FSubsystemCollectionBase& C) override;
    void CompleteQuest(FName QuestId);
};

GetGameInstance()->GetSubsystem<UQuestSubsystem>()->CompleteQuest(Id);`,
    see: ['game-instance', 'world', 'enhanced-input'],
    reading: [
      ue(
        'programming-subsystems-in-unreal-engine',
        'Programming Subsystems',
        'The subsystem types, their lifetimes, and how to access them from C++ and Blueprint.',
      ),
    ],
  },
  {
    id: 'character-movement-component',
    term: 'Character Movement Component',
    aliases: ['UCharacterMovementComponent', 'CMC'],
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'The movement component (`UCharacterMovementComponent`) that powers `ACharacter`: walking, falling, jumping, crouching, swimming and flying, with built-in network prediction.',
    long:
      'It turns input vectors into plausible movement against collision: walkable slope limits, step height, ground friction, air control and braking. Most "game feel" tuning is just its properties: `MaxWalkSpeed`, `JumpZVelocity`, `AirControl`, `GravityScale`, `BrakingDecelerationWalking`, `bOrientRotationToMovement`.\n\nIn multiplayer it implements client-side prediction with server reconciliation: the client moves immediately, sends its moves to the server, and is corrected if the server disagrees. That is why changing speed only on the client causes rubber-banding; speed changes must happen consistently on both sides.\n\nIt is a large, complex component. For non-humanoid movement consider `UFloatingPawnMovement` or `UProjectileMovementComponent`; UE 5.4 also introduced the experimental Mover plugin as a more modular alternative.',
    example: `void AHero::StartSprint() {
    GetCharacterMovement()->MaxWalkSpeed = SprintSpeed;
}

void AHero::StopSprint() {
    GetCharacterMovement()->MaxWalkSpeed = WalkSpeed;
}
// In multiplayer, apply the same change on the server too,
// or the client will be corrected (rubber-banding).`,
    see: ['character', 'pawn', 'replication'],
  },
  {
    id: 'apply-damage',
    term: 'ApplyDamage / TakeDamage',
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'The engine\'s built-in damage pipeline: `UGameplayStatics::ApplyDamage` (and its point and radial variants) calls the target actor\'s virtual `TakeDamage`, which fires damage events.',
    long:
      '`UGameplayStatics::ApplyDamage(Victim, Amount, InstigatorController, DamageCauser, DamageTypeClass)` calls `Victim->TakeDamage(...)`. Override `TakeDamage` in your actor, call `Super` first (it broadcasts `OnTakeAnyDamage` and fires the Blueprint damage events), then apply the result to health.\n\nIt is a simple, generic channel: any actor can damage any other without knowing its class, and `UDamageType` subclasses can carry extra meaning such as fire or fall damage. `ApplyPointDamage` adds hit information; `ApplyRadialDamage` damages everything in a radius.\n\nApply damage on the server only. Larger projects often move to the Gameplay Ability System\'s gameplay effects, but this system is a solid starting point.',
    example: `float AEnemy::TakeDamage(float Damage, const FDamageEvent& Event,
    AController* EventInstigator, AActor* Causer) {
    const float Actual =
        Super::TakeDamage(Damage, Event, EventInstigator, Causer);
    Health = FMath::Max(Health - Actual, 0.f);
    if (Health <= 0.f) { Die(); }
    return Actual;
}`,
    see: ['gameplay-ability-system', 'authority', 'virtual-function'],
  },
  {
    id: 'gameplay-ability-system',
    term: 'Gameplay Ability System (GAS)',
    aliases: ['GAS'],
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'An Epic plugin framework for abilities, attributes and effects (attacks, spells, buffs, cooldowns, costs) with built-in replication and prediction. Used in Fortnite, the Lyra sample and many shipped games.',
    long:
      'GAS is built from a few pieces: an `UAbilitySystemComponent` on the actor (or its PlayerState), `UGameplayAbility` classes for actions, `UAttributeSet`s holding numeric attributes like Health and Mana, `UGameplayEffect`s that modify attributes (instant damage, a 10-second buff, a cooldown), and Gameplay Tags tying it all together.\n\nIts value lies in the hard problems it solves: client-side prediction of abilities, replication, stacking rules, cooldowns and costs, and a data-driven workflow where designers create effects as assets. Enable the plugin and add `"GameplayAbilities"`, `"GameplayTags"` and `"GameplayTasks"` to your `Build.cs`.\n\nThe learning curve is steep and setup requires C++ (attribute sets, initialising the component). For small or single-player games a simple custom system can be quicker; for multiplayer games with many abilities, GAS often pays off.',
    example: `UCLASS()
class MYGAME_API AHero : public ACharacter,
    public IAbilitySystemInterface {
    GENERATED_BODY()
public:
    virtual UAbilitySystemComponent* GetAbilitySystemComponent()
        const override { return AbilitySystem; }
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UAbilitySystemComponent> AbilitySystem;
};`,
    see: ['gameplay-tag', 'apply-damage', 'player-state', 'replication'],
    reading: [
      ue(
        'gameplay-ability-system-for-unreal-engine',
        'Gameplay Ability System',
        'The official overview of abilities, attributes, effects and the ability system component.',
      ),
    ],
  },
  {
    id: 'umg',
    term: 'UMG (Unreal Motion Graphics)',
    aliases: ['UMG', 'Widget Blueprint'],
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'Unreal\'s UI framework: widgets designed visually in Widget Blueprints and backed by `UUserWidget` classes you can extend in C++. It is built on the lower-level Slate framework.',
    long:
      'You lay out buttons, text, images and progress bars in the Widget Designer, animate them and script them in the widget\'s graph. For C++ logic, create a `UUserWidget` subclass and reparent the Widget Blueprint to it; `UPROPERTY(meta = (BindWidget))` links a C++ pointer to the designer-made widget with the same name.\n\nCreate widgets with `CreateWidget<T>(OwningPlayer, WidgetClass)` and show them with `AddToViewport()`. Add `"UMG"` (and usually `"Slate"` and `"SlateCore"`) to your `Build.cs`.\n\nPrefer pushing updates to widgets through events and delegates (health changed → update the bar) over property bindings evaluated every frame, and keep game state out of widgets: the UI should display state owned elsewhere.',
    example: `UCLASS()
class MYGAME_API UHealthBar : public UUserWidget {
    GENERATED_BODY()
public:
    void SetPercent(float P) { Bar->SetPercent(P); }
protected:
    UPROPERTY(meta = (BindWidget))  // must match the designer name
    TObjectPtr<UProgressBar> Bar;
};`,
    see: ['hud', 'ftext', 'delegate', 'player-controller'],
    reading: [
      ue(
        'umg-ui-designer-for-unreal-engine',
        'UMG UI Designer',
        'The Widget Designer workflow and how widgets are created and displayed.',
      ),
    ],
  },

  // ---------------------------------------------------------------------- Input
  {
    id: 'enhanced-input',
    term: 'Enhanced Input',
    course: 'unreal',
    category: 'Input',
    short:
      'UE5\'s input system: input is described by **Input Action** assets, mapped to keys by **Input Mapping Contexts**, and shaped by modifiers and triggers before it reaches your code.',
    long:
      'The legacy system bound functions to named axis and action mappings in project settings. Enhanced Input (the default since UE 5.1, when the legacy system was deprecated) separates *what* the player wants to do, an `UInputAction` such as `IA_Jump` with a value type like `bool` or `Axis2D`, from *which keys* do it, an `UInputMappingContext`. Contexts can be added and removed at run time with priorities: on foot, in a vehicle, in a menu.\n\nModifiers transform raw values (dead zones, negation, swizzling axes) and triggers decide when an action fires (pressed, held, tapped, released, chorded). This logic lives in assets, so designers can rebind and tune input without code changes.\n\nIn C++: add `"EnhancedInput"` to your `Build.cs`, add a mapping context through the `UEnhancedInputLocalPlayerSubsystem`, cast the input component to `UEnhancedInputComponent` and call `BindAction`.',
    example: `void AHero::SetupPlayerInputComponent(UInputComponent* PIC) {
    Super::SetupPlayerInputComponent(PIC);
    auto* EIC = CastChecked<UEnhancedInputComponent>(PIC);
    EIC->BindAction(MoveAction, ETriggerEvent::Triggered,
        this, &AHero::Move);
    EIC->BindAction(JumpAction, ETriggerEvent::Started,
        this, &ACharacter::Jump);
}`,
    see: ['input-action', 'input-mapping-context', 'player-controller', 'build-cs'],
    reading: [
      ue(
        'enhanced-input-in-unreal-engine',
        'Enhanced Input',
        'Input actions, mapping contexts, modifiers and triggers, with C++ setup steps.',
      ),
    ],
  },
  {
    id: 'input-action',
    term: 'Input Action',
    aliases: ['UInputAction'],
    course: 'unreal',
    category: 'Input',
    short:
      'A data asset (`UInputAction`) representing one thing the player can do, such as Jump, Move or Fire, along with its value type (`bool`, `Axis1D`, `Axis2D` or `Axis3D`).',
    long:
      'Input Actions are the "verbs" of Enhanced Input. Your C++ binds to the action, never to specific keys, so one `Move` handler works for WASD, a gamepad stick or touch input.\n\nThe value type decides what your handler receives: read it with `Value.Get<bool>()`, `Value.Get<float>()` or `Value.Get<FVector2D>()`. A handler can also take no parameters, or a `const FInputActionInstance&` for timing information.\n\nExpose actions as `UPROPERTY(EditDefaultsOnly) TObjectPtr<UInputAction>` and assign the assets in a Blueprint subclass. `ETriggerEvent` picks when your function runs: `Started`, `Triggered` (every frame while active, ideal for movement), `Ongoing`, `Completed` or `Canceled`.',
    example: `UPROPERTY(EditDefaultsOnly, Category = "Input")
TObjectPtr<UInputAction> MoveAction;   // IA_Move (Axis2D)

void AHero::Move(const FInputActionValue& Value) {
    const FVector2D Axis = Value.Get<FVector2D>();
    AddMovementInput(GetActorForwardVector(), Axis.Y);
    AddMovementInput(GetActorRightVector(), Axis.X);
}`,
    see: ['enhanced-input', 'input-mapping-context', 'data-asset'],
  },
  {
    id: 'input-mapping-context',
    term: 'Input Mapping Context',
    aliases: ['UInputMappingContext', 'IMC'],
    course: 'unreal',
    category: 'Input',
    short:
      'An asset (`UInputMappingContext`) that maps keys and buttons to Input Actions, with optional modifiers and triggers. Contexts are added to a local player at run time with a priority.',
    long:
      'A mapping context answers "which keys trigger which actions in this situation?". A game might have `IMC_Default` (movement, jump), `IMC_Vehicle` and `IMC_Menu`, added and removed as the situation changes. When two active contexts map the same key, the higher priority wins.\n\nContexts are added through the `UEnhancedInputLocalPlayerSubsystem` of a local player, typically when a pawn is possessed. That subsystem only exists for local players, so use the null-safe `ULocalPlayer::GetSubsystem` helper: on a server, a remote player\'s controller has no local player.\n\nNewer engine versions build player key rebinding on top of contexts through Enhanced Input user settings, so keep your mappings in contexts rather than in code.',
    example: `void AHero::NotifyControllerChanged() {
    Super::NotifyControllerChanged();
    auto* PC = Cast<APlayerController>(GetController());
    if (!PC) { return; }
    auto* Input = ULocalPlayer::GetSubsystem<
        UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer());
    if (Input) {
        Input->AddMappingContext(DefaultContext, 0);
    }
}`,
    see: ['enhanced-input', 'input-action', 'subsystem', 'possession'],
    reading: [
      ue(
        'enhanced-input-in-unreal-engine',
        'Enhanced Input',
        'See the section on mapping contexts and how priorities resolve conflicts.',
      ),
    ],
  },

  // --------------------------------------------------------------------- Events
  {
    id: 'delegate',
    term: 'Delegate',
    course: 'unreal',
    category: 'Events',
    short:
      'A type-safe, bindable reference to a function (member function, lambda, static function or `UFUNCTION`) that can be called later. Unreal\'s answer to callbacks and the observer pattern.',
    long:
      'You declare a delegate *type* with a macro that encodes its signature, e.g. `DECLARE_DELEGATE_OneParam(FOnAmmoChanged, int32)`, bind a function to an instance of it, and call it with `Execute` (or `ExecuteIfBound`). It is like `std::function`, but with engine-aware binding helpers: `BindUObject` (holds a weak reference, so it will not call into a destroyed `UObject`), `BindSP` for shared pointers, `BindLambda` and `BindStatic`.\n\nThere are three families: single-cast (one binding, can return a value), multicast (many bindings, no return value) and dynamic (reflected, serialisable, bindable from Blueprint, slower).\n\nDelegates decouple systems: a health component broadcasts "died" without knowing who listens, and the UI, score, audio and achievements subscribe independently.',
    example: `DECLARE_DELEGATE_RetVal_OneParam(bool, FCanPickUp, FName);

FCanPickUp CanPickUp;
CanPickUp.BindUObject(this, &AHero::HasRoomFor);

if (CanPickUp.IsBound() && CanPickUp.Execute(TEXT("Potion"))) {
    // pick it up
}`,
    see: ['multicast-delegate', 'dynamic-delegate', 'std-function', 'lambda'],
    reading: [
      ue(
        'delegates-and-lamba-functions-in-unreal-engine',
        'Delegates and Lambda Functions',
        'Declaring, binding and executing every kind of delegate. (The typo in the URL is Epic\'s.)',
      ),
    ],
  },
  {
    id: 'multicast-delegate',
    term: 'Multicast Delegate',
    course: 'unreal',
    category: 'Events',
    short:
      'A delegate that can have many functions bound at once; calling `Broadcast()` invokes all of them. Used for events with several listeners.',
    long:
      'Declare one with `DECLARE_MULTICAST_DELEGATE_OneParam(FOnScoreChanged, int32)`, subscribe with `AddUObject`, `AddLambda` or `AddSP` (each returns an `FDelegateHandle`), and unsubscribe with `Remove(Handle)` or `RemoveAll(this)`. Multicast delegates cannot return values: with many listeners, whose return value would win?\n\nThe order in which bound functions are called is not guaranteed, so listeners should not depend on each other.\n\nNative (non-dynamic) multicast delegates are fast and flexible but invisible to Blueprint. If designers need to bind in Blueprint, use `DECLARE_DYNAMIC_MULTICAST_DELEGATE_*` with a `BlueprintAssignable` property instead.',
    example: `DECLARE_MULTICAST_DELEGATE_OneParam(FOnScoreChanged, int32);

FOnScoreChanged OnScoreChanged;            // member

FDelegateHandle H = OnScoreChanged.AddUObject(
    this, &UScoreTracker::Refresh);
OnScoreChanged.Broadcast(150);            // calls every listener
OnScoreChanged.Remove(H);`,
    see: ['delegate', 'dynamic-delegate', 'blueprint-assignable'],
  },
  {
    id: 'dynamic-delegate',
    term: 'Dynamic Delegate',
    course: 'unreal',
    category: 'Events',
    short:
      'A reflected delegate (`DECLARE_DYNAMIC_...`) that stores bindings by object and function *name*, so it can be serialised and bound from Blueprint. Bound functions must be `UFUNCTION`s.',
    long:
      'Dynamic delegates go through the reflection system: `AddDynamic(this, &AMyActor::HandleHit)` records the object and the function\'s name, and broadcasting looks the function up and calls it through reflection. That is what lets Blueprint graphs bind to them and lets bindings be saved.\n\nConsequences: the bound function **must** be a `UFUNCTION()`, the declaration macro lists parameter types *and names*, calls are slower than native delegates, and lambdas cannot be bound. A missing `UFUNCTION` compiles fine but fails at run time with an "unable to bind delegate" error.\n\nMost engine events you bind to in C++ (`OnComponentBeginOverlap`, `OnComponentHit`, `OnTakeAnyDamage`, `OnClicked` on UMG buttons) are dynamic multicast delegates. Bind them in `BeginPlay` rather than the constructor.',
    example: `DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FOnDamaged, AActor*, Victim, float, Amount);

UPROPERTY(BlueprintAssignable, Category = "Events")
FOnDamaged OnDamaged;

UFUNCTION()   // required for AddDynamic
void HandleDamaged(AActor* Victim, float Amount);

Target->OnDamaged.AddDynamic(this, &AMyHUD::HandleDamaged);`,
    see: ['delegate', 'multicast-delegate', 'blueprint-assignable', 'ufunction'],
  },
  {
    id: 'blueprint-assignable',
    term: 'BlueprintAssignable',
    course: 'unreal',
    category: 'Events',
    short:
      'A `UPROPERTY` specifier for dynamic multicast delegates that lets Blueprint graphs bind to the event, through "Bind Event" nodes or the Events section of the Details panel.',
    long:
      'This is how C++ exposes *events* to designers: a C++ health component declares `UPROPERTY(BlueprintAssignable) FOnDied OnDied;` and calls `OnDied.Broadcast()`, and designers react in Blueprint (play a sound, show a widget) without touching C++.\n\nIt only works on dynamic multicast delegates (`DECLARE_DYNAMIC_MULTICAST_DELEGATE_*`), because binding from Blueprint requires reflection. A native multicast delegate cannot be `BlueprintAssignable`.\n\nRelated: adding `BlueprintCallable` to a multicast delegate property lets Blueprint *broadcast* it as well.',
    example: `DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnDied);

UPROPERTY(BlueprintAssignable, Category = "Health")
FOnDied OnDied;

void UHealthComponent::Kill() {
    OnDied.Broadcast();   // Blueprint listeners react
}`,
    see: ['dynamic-delegate', 'multicast-delegate', 'uproperty'],
  },

  // -------------------------------------------------------- Collision & Physics
  {
    id: 'collision-channel',
    term: 'Collision Channel',
    course: 'unreal',
    category: 'Collision & Physics',
    short:
      'A category used by the collision system. Each component has one *object channel* (what it is: Pawn, WorldStatic…) and queries use *trace channels* (Visibility, Camera, or your own).',
    long:
      'Unreal ships with object channels such as `WorldStatic`, `WorldDynamic`, `Pawn`, `PhysicsBody`, `Vehicle` and `Destructible`, and the trace channels `Visibility` and `Camera`. You can add up to 18 custom channels in Project Settings → Collision, e.g. an `Interactable` trace channel or a `Projectile` object channel.\n\nCustom channels appear in C++ as `ECC_GameTraceChannel1` … `ECC_GameTraceChannel18`, in the order you created them. Give them readable names with a `#define` or a constant so code does not depend on magic numbers.\n\nChannels are only half the story: each component also has a *response* to each channel (ignore, overlap or block), and the two together decide what actually happens.',
    example: `// Project Settings -> Collision: "Interactable" trace channel
#define ECC_Interactable ECC_GameTraceChannel1

FHitResult Hit;
GetWorld()->LineTraceSingleByChannel(Hit, Start, End,
    ECC_Interactable);`,
    see: ['collision-response', 'collision-profile', 'line-trace'],
  },
  {
    id: 'collision-profile',
    term: 'Collision Profile',
    aliases: ['Collision Preset'],
    course: 'unreal',
    category: 'Collision & Physics',
    short:
      'A named preset (`BlockAll`, `OverlapAllDynamic`, `Pawn`, `Trigger`…) that sets a component\'s collision-enabled mode, object channel and responses to every channel in one go.',
    long:
      'Configuring a response to every channel on every component is tedious and error-prone. Profiles bundle the settings: `SetCollisionProfileName(TEXT("Trigger"))` makes a component a query-only overlap volume in one call, and editing the profile in Project Settings updates every component that uses it.\n\nCreate project-specific profiles (`Projectile`, `Interactable`, `Ragdoll`) in Project Settings → Collision → Preset. They are stored in `DefaultEngine.ini`, so commit that file.\n\nChoosing "Custom" in the editor, or calling `SetCollisionResponseToChannel` in code, overrides the profile for that component only. It is handy, but it makes behaviour harder to reason about across a project.',
    example: `Mesh->SetCollisionProfileName(TEXT("BlockAllDynamic"));
Trigger->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
Sphere->SetCollisionProfileName(TEXT("Projectile")); // custom`,
    see: ['collision-channel', 'collision-response', 'primitive-component'],
  },
  {
    id: 'collision-response',
    term: 'Collision Response',
    course: 'unreal',
    category: 'Collision & Physics',
    short:
      'How a component reacts to another object\'s channel: **Ignore**, **Overlap** or **Block**. When two objects meet, the *least* blocking of their two responses wins.',
    long:
      'For two components A and B: if either ignores the other\'s object channel, nothing happens; if either is set to overlap (and neither ignores), they overlap; only if *both* block each other do they collide. This rule explains most "why doesn\'t my trigger fire?" bugs, so always check the response on **both** sides.\n\nOverlap events additionally require Generate Overlap Events on both components. Hits from physics simulation require Simulation Generates Hit Events (`SetNotifyRigidBodyCollision(true)`).\n\nThe collision-enabled mode gates everything: `NoCollision`, `QueryOnly` (traces and overlaps, no physics), `PhysicsOnly` or `QueryAndPhysics`.',
    example: `Box->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
Box->SetCollisionResponseToAllChannels(ECR_Ignore);
Box->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);
Box->SetGenerateOverlapEvents(true);
// -> overlaps pawns, ignores everything else`,
    see: ['collision-channel', 'collision-profile', 'overlap-event', 'hit-event'],
  },
  {
    id: 'line-trace',
    term: 'Line Trace',
    aliases: ['Raycast'],
    course: 'unreal',
    category: 'Collision & Physics',
    short:
      'A ray cast through the physics scene from a start point to an end point that reports what it hits. Used for shooting, line of sight, interaction and ground checks.',
    long:
      '`GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params)` returns `true` if something blocking was hit and fills an `FHitResult`. Variants: `LineTraceMultiByChannel` returns overlapping hits up to the first block, `...ByObjectType` filters by object channel, and `...ByProfile` uses a collision profile.\n\nUse `FCollisionQueryParams` to ignore the shooter with `AddIgnoredActor(this)` (otherwise a trace starting inside your own capsule hits yourself) and to request per-triangle collision with `bTraceComplex`.\n\nTraces are cheap but not free: dozens per frame are fine, thousands need care (for example asynchronous traces). Visualise them with `DrawDebugLine` while developing.',
    example: `FVector Start = Camera->GetComponentLocation();
FVector End = Start + Camera->GetForwardVector() * 5000.f;
FCollisionQueryParams Params;
Params.AddIgnoredActor(this);

FHitResult Hit;
if (GetWorld()->LineTraceSingleByChannel(Hit, Start, End,
        ECC_Visibility, Params)) {
    UE_LOG(LogTemp, Log, TEXT("Hit %s"), *GetNameSafe(Hit.GetActor()));
}`,
    see: ['sweep', 'fhitresult', 'collision-channel', 'draw-debug'],
  },
  {
    id: 'sweep',
    term: 'Sweep',
    aliases: ['Shape Trace'],
    course: 'unreal',
    category: 'Collision & Physics',
    short:
      'A trace that moves a *shape* (sphere, box or capsule) instead of an infinitely thin ray, reporting what the shape would hit along the way.',
    long:
      'Sweeps answer "would this volume fit, and what would it touch?": melee swings, thick projectiles, checking whether a crouched character can stand up. `GetWorld()->SweepSingleByChannel(Hit, Start, End, Rotation, Channel, FCollisionShape::MakeSphere(30.f))` works like a line trace with an extra rotation and shape.\n\nMovement can sweep too: `SetActorLocation(NewLoc, true)` or `AddActorWorldOffset(Delta, true, &Hit)` moves the root component until it would collide and reports the blocking hit. That is how non-physics movement produces hit events.\n\nFor "what is inside this area right now?" without movement, use overlap queries such as `OverlapMultiByChannel` instead.',
    example: `FHitResult Hit;
const FCollisionShape Blade = FCollisionShape::MakeSphere(30.f);
bool bHit = GetWorld()->SweepSingleByChannel(Hit, SwingStart,
    SwingEnd, FQuat::Identity, ECC_Pawn, Blade);

// Swept movement: stops at the first blocking hit
AddActorWorldOffset(Velocity * DeltaTime, true, &Hit);`,
    see: ['line-trace', 'fhitresult', 'hit-event'],
  },
  {
    id: 'fhitresult',
    term: 'FHitResult',
    course: 'unreal',
    category: 'Collision & Physics',
    short:
      'The struct filled in by traces, sweeps and hit events to describe a collision: what was hit, where, the surface normal, the distance and more.',
    long:
      'Key members: `bBlockingHit`, `GetActor()`, `GetComponent()`, `ImpactPoint` and `ImpactNormal` (on the surface that was hit), `Location` and `Normal` (for the moving shape), `Distance`, `Time` (0–1 along the trace), `BoneName`, and `PhysMaterial` when requested in the query parameters.\n\nFor a line trace, `Location` equals `ImpactPoint`. For a sweep they differ: `Location` is the centre of the shape at the moment of contact, while `ImpactPoint` is the contact point on the surface. Mixing them up offsets decals and effects by the shape\'s radius.\n\n`GetActor()` can be `nullptr`, for example if the actor was destroyed since the hit, so always check it.',
    example: `FHitResult Hit;
if (GetWorld()->LineTraceSingleByChannel(Hit, Start, End,
        ECC_Visibility)) {
    SpawnDecalAt(Hit.ImpactPoint, Hit.ImpactNormal.Rotation());
    if (AActor* Other = Hit.GetActor()) {
        UE_LOG(LogTemp, Log, TEXT("%s at %.0f cm"),
            *Other->GetName(), Hit.Distance);
    }
}`,
    see: ['line-trace', 'sweep', 'hit-event', 'fvector'],
  },
  {
    id: 'overlap-event',
    term: 'Overlap Event',
    course: 'unreal',
    category: 'Collision & Physics',
    short:
      'An event fired when two components start or stop overlapping (`OnComponentBeginOverlap` / `OnComponentEndOverlap`). Typical for triggers, pickups and area effects.',
    long:
      'Overlaps happen when the collision responses resolve to Overlap (at least one side overlaps and neither ignores) **and** both components have Generate Overlap Events enabled. They do not stop movement; they only notify.\n\nBind with `Trigger->OnComponentBeginOverlap.AddDynamic(this, &APickup::OnOverlap)`. The handler must be a `UFUNCTION()` whose parameters exactly match the delegate\'s signature. Bind in `BeginPlay` (or `PostInitializeComponents`), not in the constructor.\n\nActors also get `NotifyActorBeginOverlap(AActor* Other)`, a simpler virtual function you can override without binding anything. An actor with several overlapping components can receive several component-level events for one encounter.',
    example: `void APickup::BeginPlay() {
    Super::BeginPlay();
    Sphere->OnComponentBeginOverlap.AddDynamic(
        this, &APickup::OnOverlap);
}

void APickup::OnOverlap(UPrimitiveComponent* Comp, AActor* Other,
    UPrimitiveComponent* OtherComp, int32 BodyIndex,
    bool bFromSweep, const FHitResult& Sweep) { /* ... */ }`,
    see: ['hit-event', 'collision-response', 'dynamic-delegate', 'primitive-component'],
  },
  {
    id: 'hit-event',
    term: 'Hit Event',
    course: 'unreal',
    category: 'Collision & Physics',
    short:
      'An event fired when a component is blocked by another object during physics simulation or swept movement (`OnComponentHit`, `NotifyHit`).',
    long:
      'Hits happen when both sides *block* each other. Physics-simulated bodies only report hits if Simulation Generates Hit Events is on (`SetNotifyRigidBodyCollision(true)`); swept movement (characters, projectile movement, `SetActorLocation` with sweep) reports blocking hits automatically.\n\nThe handler receives the other actor and component, a `NormalImpulse` (useful for scaling damage by impact force) and an `FHitResult`. Hit events can fire every frame while two physics bodies stay in contact, so debounce sounds and damage.\n\nBind with `OnComponentHit.AddDynamic`; the handler must be a `UFUNCTION` matching the hit delegate\'s signature.',
    example: `Mesh->SetSimulatePhysics(true);
Mesh->SetNotifyRigidBodyCollision(true); // "Generates Hit Events"
Mesh->OnComponentHit.AddDynamic(this, &ACrate::OnHit); // BeginPlay

// Header
UFUNCTION()
void OnHit(UPrimitiveComponent* HitComp, AActor* Other,
    UPrimitiveComponent* OtherComp, FVector NormalImpulse,
    const FHitResult& Hit);`,
    see: ['overlap-event', 'fhitresult', 'physics-simulation', 'collision-response'],
  },
  {
    id: 'physics-simulation',
    term: 'Physics Simulation',
    aliases: ['Simulate Physics', 'Chaos'],
    course: 'unreal',
    category: 'Collision & Physics',
    short:
      'Letting the Chaos physics engine move a primitive component with forces, gravity and collisions (`SetSimulatePhysics(true)`) instead of moving it yourself.',
    long:
      'A simulating component is driven by physics every frame: gravity pulls it, collisions push it, and you influence it with forces, impulses and torque. It needs physics collision enabled and a physics body, i.e. simple collision shapes on the mesh asset.\n\nThe simulating component should be the actor\'s root. If a child component simulates, it detaches and moves independently of the actor\'s transform. Mass, damping and physical materials (friction, restitution) tune the behaviour.\n\nUE5 replaced PhysX with **Chaos**. In multiplayer, replicated physics is approximate: the server simulates and clients are corrected, and simulations are not guaranteed to be identical across machines.',
    example: `ACrate::ACrate() {
    Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
    SetRootComponent(Mesh);              // simulate the root
    Mesh->SetSimulatePhysics(true);
    Mesh->SetMassOverrideInKg(NAME_None, 25.f);
    Mesh->SetLinearDamping(0.2f);
}`,
    see: ['impulse', 'primitive-component', 'hit-event'],
  },
  {
    id: 'impulse',
    term: 'Impulse',
    course: 'unreal',
    category: 'Collision & Physics',
    short:
      'An instantaneous change in a physics body\'s momentum (`AddImpulse`), as opposed to a force (`AddForce`), which is applied continuously over time.',
    long:
      'Use an impulse for one-off events (an explosion, a kick, a jump pad, a bullet hit) and a force for sustained effects applied every frame, such as thrusters or wind. Applying a force once, or an impulse every frame, are both common mistakes.\n\n`AddImpulse(Impulse, BoneName, bVelChange)`: with `bVelChange = false` (the default) the impulse is divided by mass, so heavy objects move less; with `true` it is treated as a direct velocity change regardless of mass. `AddRadialImpulse` pushes a body away from a point, ideal for explosions.\n\nImpulses only affect components that simulate physics. For an `ACharacter`, use `LaunchCharacter(Velocity, bXYOverride, bZOverride)` instead.',
    example: `// Explosion at ExplosionLoc pushes this body away
Mesh->AddRadialImpulse(ExplosionLoc, 500.f, 2000.f,
    ERadialImpulseFalloff::RIF_Linear, true);

// Kick straight up, ignoring mass
Mesh->AddImpulse(FVector(0.f, 0.f, 600.f), NAME_None, true);

// Jump pad for a character
Hero->LaunchCharacter(FVector(0.f, 0.f, 1200.f), false, true);`,
    see: ['physics-simulation', 'primitive-component', 'fvector'],
  },

  // ----------------------------------------------------------------------- Data
  {
    id: 'data-asset',
    term: 'Data Asset',
    aliases: ['UDataAsset'],
    course: 'unreal',
    category: 'Data',
    short:
      'An asset whose class derives from `UDataAsset`: a container of designer-editable data (weapon stats, enemy configuration) defined by C++ properties and edited like any other asset.',
    long:
      'Data assets separate *data* from *behaviour*. You write a C++ class with `UPROPERTY(EditDefaultsOnly)` fields, then designers create as many instances as they like in the Content Browser (`DA_Sword`, `DA_Bow`), and actors reference them.\n\nA data asset is lightweight and shared: a hundred goblins can point at one `DA_Goblin`. Treat it as read-only at run time; changing it during Play In Editor modifies the asset itself, and in any build every user of it sees the change.\n\nFor data the Asset Manager should discover and load by ID, derive from `UPrimaryDataAsset` instead.',
    example: `UCLASS(BlueprintType)
class MYGAME_API UWeaponData : public UDataAsset {
    GENERATED_BODY()
public:
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly)
    float Damage = 20.f;
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly)
    TSoftObjectPtr<UStaticMesh> Mesh;
};`,
    see: ['primary-data-asset', 'data-table', 'asset', 'uproperty'],
  },
  {
    id: 'primary-data-asset',
    term: 'Primary Data Asset',
    aliases: ['UPrimaryDataAsset'],
    course: 'unreal',
    category: 'Data',
    short:
      'A data asset class (`UPrimaryDataAsset`) with a Primary Asset ID, so the Asset Manager can discover, list and load it by type and name without a hard reference.',
    long:
      'A primary asset is one the Asset Manager manages directly. `UPrimaryDataAsset` implements `GetPrimaryAssetId()` for you, building the ID from its class and asset name (override it to choose a custom type). You register the type and its folders in Project Settings → Asset Manager, e.g. type `Weapon` in `/Game/Data/Weapons`.\n\nYou can then ask for every asset of a type (`GetPrimaryAssetIdList`) and load them asynchronously by ID (`LoadPrimaryAsset`), optionally loading only certain *bundles* of their soft references, such as UI data for an inventory screen.\n\nThis is how larger games avoid loading every item at startup: menus reference items by `FPrimaryAssetId`, and the Asset Manager loads what is needed.',
    example: `UCLASS()
class MYGAME_API UItemDefinition : public UPrimaryDataAsset {
    GENERATED_BODY()
public:
    UPROPERTY(EditDefaultsOnly)
    FText DisplayName;
};

// Elsewhere: load an item by ID (FPrimaryAssetId ItemId)
UAssetManager::Get().LoadPrimaryAsset(ItemId);`,
    see: ['data-asset', 'asset-manager', 'async-loading'],
    reading: [
      ue(
        'asset-management-in-unreal-engine',
        'Asset Management',
        'Primary assets, asset bundles and how the Asset Manager loads them.',
      ),
    ],
  },
  {
    id: 'data-table',
    term: 'Data Table',
    aliases: ['UDataTable'],
    course: 'unreal',
    category: 'Data',
    short:
      'A spreadsheet-like asset of rows, each a `USTRUCT` deriving from `FTableRowBase`, keyed by row name. Ideal for large, uniform data such as item lists or level-up tables, and importable from CSV or JSON.',
    long:
      'Define a row struct in C++ (`struct FItemRow : public FTableRowBase`), create a Data Table asset using that struct, and fill in rows in the editor or import a CSV/JSON file exported from a spreadsheet, which suits designers who balance numbers in spreadsheet tools.\n\nLook up rows with `Table->FindRow<FItemRow>(RowName, ContextString)`, which returns a pointer or `nullptr` (logging a warning with your context string if the row is missing). Reference specific rows from properties with `FDataTableRowHandle` to get a row picker in the editor.\n\nData tables suit flat, homogeneous data. For entries that need custom logic or inheritance, data assets are more flexible. A data table also loads all of its rows at once.',
    example: `USTRUCT(BlueprintType)
struct FItemRow : public FTableRowBase {
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FText Name;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 Price = 0;
};

const FItemRow* Row = ItemTable->FindRow<FItemRow>(
    TEXT("Potion"), TEXT("Shop lookup"));`,
    see: ['ustruct', 'data-asset', 'fname'],
    reading: [
      ue(
        'data-driven-gameplay-elements-in-unreal-engine',
        'Data Driven Gameplay Elements',
        'Creating data tables from C++ row structs and importing them from CSV.',
      ),
    ],
  },
  {
    id: 'gameplay-tag',
    term: 'Gameplay Tag',
    aliases: ['FGameplayTag'],
    course: 'unreal',
    category: 'Data',
    short:
      'A hierarchical name like `Status.Debuff.Poison`, registered project-wide and stored as an `FGameplayTag`. Used to label states, abilities, damage types and more without hard-coded enums or strings.',
    long:
      'Tags are defined in Project Settings (stored in `Config/DefaultGameplayTags.ini`) or in C++ with native tag macros, and chosen from a dropdown in the editor, so typos are impossible. The hierarchy is the superpower: a container holding `Status.Debuff.Poison` matches a query for `Status.Debuff`, so "is the player debuffed?" is a single call.\n\nUse `FGameplayTagContainer` to hold several tags, with `HasTag`, `HasTagExact`, `HasAny` and `HasAll`. Unlike enums, tags can be added by designers and plugins without recompiling core code; unlike strings, they compare quickly.\n\nThey are central to the Gameplay Ability System but useful everywhere: interaction types, AI states, damage types, UI routing. Add `"GameplayTags"` to your `Build.cs` to use them in C++.',
    example: `// Native tag defined in C++ (UE5)
UE_DEFINE_GAMEPLAY_TAG_STATIC(TAG_Debuff, "Status.Debuff");

UPROPERTY(EditAnywhere, Category = "Status")
FGameplayTagContainer ActiveTags;

if (ActiveTags.HasTag(TAG_Debuff)) {  // matches child tags too
    ShowDebuffIcon();
}`,
    see: ['gameplay-ability-system', 'fname', 'enum-class'],
    reading: [
      ue(
        'using-gameplay-tags-in-unreal-engine',
        'Using Gameplay Tags',
        'Defining tags, organising the hierarchy, and querying tag containers.',
      ),
    ],
  },

  // ----------------------------------------------------------------- Networking
  {
    id: 'replication',
    term: 'Replication',
    course: 'unreal',
    category: 'Networking',
    short:
      'Unreal\'s system for automatically sending actor state from the server to clients: which actors exist, the values of their replicated properties, and their movement.',
    long:
      'Unreal multiplayer is server-authoritative: the server runs the real simulation and *replicates* the results to clients. An actor replicates if `bReplicates = true` (or `SetReplicates(true)`); its properties marked `UPROPERTY(Replicated)` and registered in `GetLifetimeReplicatedProps` are sent when they change, and `SetReplicateMovement(true)` syncs its transform.\n\nReplication is one-way, server to client. A client that changes a replicated variable only changes its local copy, which the next update overwrites. To ask the server to change something, a client calls a Server RPC.\n\nThe engine prioritises and throttles updates using relevancy (distance, visibility), `NetUpdateFrequency` and priority, so not every change is sent instantly and not every client receives every actor. Deciding *what* to replicate is a core multiplayer skill.',
    example: `AMyPickup::AMyPickup() {
    bReplicates = true;
    SetReplicateMovement(true);
}

void AMyPickup::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutProps) const {
    Super::GetLifetimeReplicatedProps(OutProps);
    DOREPLIFETIME(AMyPickup, bIsActive);
}`,
    see: ['authority', 'rpc', 'repnotify', 'net-role'],
    reading: [
      ue(
        'networking-and-multiplayer-in-unreal-engine',
        'Networking and Multiplayer',
        'The entry point to Unreal\'s client-server model, replication and RPCs.',
      ),
    ],
  },
  {
    id: 'authority',
    term: 'Authority',
    aliases: ['HasAuthority'],
    course: 'unreal',
    category: 'Networking',
    short:
      'Being the machine whose copy of an actor is the "truth", normally the server. `HasAuthority()` returns true there, and only there should important state change.',
    long:
      'In a networked game every machine has a copy of each replicated actor, but only one copy is authoritative. For replicated actors that is the server; for an actor spawned locally on a client (say, a cosmetic effect), that client has authority over its own non-replicated copy.\n\nGuard gameplay decisions with `if (HasAuthority())`: applying damage, awarding score, spawning replicated actors, changing replicated properties. Cosmetic work such as sounds, particles and UI can run everywhere.\n\nAuthority prevents divergence and cheating: if each client decided damage for itself, players would disagree about who died, and a modified client could grant itself anything.',
    example: `void AExplosiveBarrel::Explode() {
    PlayExplosionFX();              // everyone: cosmetic only
    if (!HasAuthority()) { return; }
    // Server only: real game-state changes
    const TArray<AActor*> Ignore;
    UGameplayStatics::ApplyRadialDamage(this, 80.f,
        GetActorLocation(), 400.f, UDamageType::StaticClass(),
        Ignore, this);
    Destroy();
}`,
    see: ['net-role', 'replication', 'rpc', 'dedicated-server'],
    reading: [
      ue(
        'actor-role-and-remoterole-in-unreal-engine',
        'Actor Role and Remote Role',
        'How authority and proxy roles are assigned and what they mean on each machine.',
      ),
    ],
  },
  {
    id: 'rpc',
    term: 'RPC (Remote Procedure Call)',
    aliases: ['RPC'],
    course: 'unreal',
    category: 'Networking',
    short:
      'A `UFUNCTION` that, when called on one machine, executes on another: `Server` (owning client to server), `Client` (server to owning client) or `NetMulticast` (server to everyone).',
    long:
      'Declare it with a type and a reliability, e.g. `UFUNCTION(Server, Reliable)`, and implement `FuncName_Implementation` in the `.cpp`. UHT generates the `FuncName` you call, which sends the request. Add `WithValidation` and a `FuncName_Validate` returning `bool` to reject impossible requests; returning false disconnects the client.\n\nServer RPCs can only be called by the client that **owns** the actor: its PlayerController, its possessed pawn, or actors whose Owner chain leads there. A Server RPC called on an unowned actor (a door in the level) is dropped, so route the request through your pawn or controller.\n\n`Reliable` RPCs are guaranteed and ordered but can saturate the connection if overused; `Unreliable` ones may be dropped and suit frequent cosmetic events. For lasting state, prefer replicated properties: a multicast is missed by players who join later or are out of relevancy, while property values always arrive.',
    example: `// Header
UFUNCTION(Server, Reliable, WithValidation)
void ServerFire(FVector_NetQuantize Target);
// .cpp
void AHero::ServerFire_Implementation(FVector_NetQuantize Target) {
    SpawnProjectileTowards(Target);       // runs on the server
}
bool AHero::ServerFire_Validate(FVector_NetQuantize Target) {
    return !Target.ContainsNaN();
}`,
    see: ['replication', 'authority', 'ufunction', 'net-role'],
    reading: [
      ue(
        'remote-procedure-calls-in-unreal-engine',
        'Remote Procedure Calls',
        'RPC types, ownership requirements, reliability and validation.',
      ),
    ],
  },
  {
    id: 'repnotify',
    term: 'RepNotify',
    aliases: ['ReplicatedUsing', 'OnRep'],
    course: 'unreal',
    category: 'Networking',
    short:
      'A replicated property with a callback: `UPROPERTY(ReplicatedUsing = OnRep_Health)` makes clients call `OnRep_Health()` whenever a new value arrives from the server.',
    long:
      'RepNotifies are how clients react to state changes: update the health bar when `Health` replicates, play the opening animation when `bIsOpen` flips. The callback must be a `UFUNCTION()` and may take the previous value as a parameter (`void OnRep_Health(float OldHealth)`).\n\nAn important C++ difference from Blueprint: in C++ the OnRep function is **not** called on the server when the server changes the value, only on clients that receive it. If the server (or a listen-server host) needs the same reaction, call the function yourself after setting the value. Blueprint RepNotifies, by contrast, also fire on the server.\n\nBy default OnRep only fires when the received value differs from the client\'s current value; register with `DOREPLIFETIME_CONDITION_NOTIFY(..., COND_None, REPNOTIFY_Always)` to get it on every update.',
    example: `UPROPERTY(ReplicatedUsing = OnRep_Health)
float Health = 100.f;
UFUNCTION()
void OnRep_Health(float OldHealth);

void AHero::SetHealth(float NewHealth) {   // server only
    const float Old = Health;
    Health = NewHealth;
    OnRep_Health(Old);   // C++ OnReps don't run on the server
}`,
    see: ['replication', 'ufunction', 'listen-server'],
  },
  {
    id: 'listen-server',
    term: 'Listen Server',
    course: 'unreal',
    category: 'Networking',
    short:
      'A network mode in which one player\'s game is also the server: the host plays and simulates the game for everyone else at the same time.',
    long:
      'Listen servers need no separate server machine, which makes them great for co-op and small games among friends. Open a map with the `listen` option, or pick "Play As Listen Server" in the editor\'s play settings.\n\nThe host is special: `HasAuthority()` is true *and* it has a local player, so "server" and "local client" code paths both run on one machine. C++ RepNotifies do not fire on the host, so UI that relies on them must also be updated manually there, a classic listen-server bug.\n\nTrade-offs: the host plays with zero latency (an unfair advantage), the session ends if the host leaves, and the host\'s machine and upload bandwidth limit the game. Competitive games usually prefer dedicated servers.',
    example: `// Host: open the map as a listen server
UGameplayStatics::OpenLevel(this, TEXT("Arena"), true,
    TEXT("listen"));

// Client: connect to the host's address
PlayerController->ClientTravel(TEXT("192.168.1.20"),
    ETravelType::TRAVEL_Absolute);`,
    see: ['dedicated-server', 'authority', 'net-role', 'repnotify'],
  },
  {
    id: 'dedicated-server',
    term: 'Dedicated Server',
    course: 'unreal',
    category: 'Networking',
    short:
      'A headless server build that runs the game simulation for remote players without rendering, audio or a local player. Standard for competitive and large multiplayer games.',
    long:
      'A dedicated server is its own build target (`MyGameServer.Target.cs` with `TargetType.Server`), compiled with `UE_SERVER=1`, and building it requires an engine built from source. There is no rendering and no local player, so code that assumes a player controller, HUD or widgets exist must be guarded.\n\nUseful checks: `GetNetMode() == NM_DedicatedServer`, `IsRunningDedicatedServer()` and `IsNetMode(NM_Client)`. Skip cosmetic work on the server to save CPU for the simulation.\n\nYou can test dedicated-server behaviour in the editor: set the play Net Mode to "Play As Client" and the editor runs a dedicated server behind the scenes.',
    example: `void AHero::OnDamaged(float Amount) {
    if (GetNetMode() != NM_DedicatedServer) {
        SpawnHitEffects();       // no screen on a server
    }
    if (HasAuthority()) {
        Health -= Amount;        // server owns the truth
    }
}`,
    see: ['listen-server', 'target-cs', 'authority', 'replication'],
  },
  {
    id: 'net-role',
    term: 'Net Role',
    aliases: ['ENetRole', 'Local Role'],
    course: 'unreal',
    category: 'Networking',
    short:
      'An actor\'s role on the current machine (`ROLE_Authority`, `ROLE_AutonomousProxy` or `ROLE_SimulatedProxy`), returned by `GetLocalRole()`, alongside its role on the other end (`GetRemoteRole()`).',
    long:
      'On the server, replicated actors have `ROLE_Authority`. On a client, the pawn *you* control is an `ROLE_AutonomousProxy` (it accepts your input and predicts locally), while other players\' pawns and most other replicated actors are `ROLE_SimulatedProxy` (they follow the server\'s updates, usually with smoothing).\n\n`HasAuthority()` is shorthand for `GetLocalRole() == ROLE_Authority`. For "is this my pawn?", prefer `IsLocallyControlled()`, which also works on a listen-server host, where the local role is Authority.\n\nRoles explain where code runs: input and prediction on autonomous proxies, smoothing on simulated proxies, decisions on the authority.',
    example: `switch (GetLocalRole()) {
case ROLE_Authority:       /* server: decide */          break;
case ROLE_AutonomousProxy: /* my pawn, on my client */   break;
case ROLE_SimulatedProxy:  /* other players' pawns */    break;
default: break;
}
if (IsLocallyControlled()) { UpdateCrosshair(); }`,
    see: ['authority', 'replication', 'possession'],
    reading: [
      ue(
        'actor-role-and-remoterole-in-unreal-engine',
        'Actor Role and Remote Role',
        'Explains each role value and how roles change for owned and simulated actors.',
      ),
    ],
  },

  // --------------------------------------------------------- Blueprint Exposure
  {
    id: 'blueprint-callable',
    term: 'BlueprintCallable',
    course: 'unreal',
    category: 'Blueprint Exposure',
    short:
      'A `UFUNCTION` specifier that lets Blueprint graphs call the C++ function as a node with execution pins.',
    long:
      'This is the main way C++ hands building blocks to designers: `UFUNCTION(BlueprintCallable, Category = "Combat") void Fire();` appears as a Fire node under the Combat category. Parameters become input pins; the return value and non-const reference parameters become output pins.\n\nCallable nodes have execution pins because they may change state. For side-effect-free queries, `BlueprintPure` is more convenient. Static `BlueprintCallable` functions in a `UBlueprintFunctionLibrary` become globally available nodes.\n\nExpose deliberately: everything you expose becomes API that Blueprints depend on, and changing its signature breaks those graphs.',
    example: `UFUNCTION(BlueprintCallable, Category = "Combat")
void Fire();

UFUNCTION(BlueprintCallable, Category = "Inventory")
bool TryUseItem(FName ItemId, int32& OutRemaining);
// Node: ItemId in; Return Value and OutRemaining out`,
    see: ['blueprint-pure', 'ufunction', 'blueprint', 'blueprint-implementable-event'],
    reading: [
      ue(
        'ufunctions-in-unreal-engine',
        'UFunctions',
        'Lists BlueprintCallable and the related function specifiers.',
      ),
    ],
  },
  {
    id: 'blueprint-pure',
    term: 'BlueprintPure',
    course: 'unreal',
    category: 'Blueprint Exposure',
    short:
      'A `UFUNCTION` specifier that exposes a function to Blueprint as a *pure* node with no execution pins, for side-effect-free queries like getters and math.',
    long:
      'Pure nodes are evaluated whenever their output is needed, which keeps graphs tidy: `GetHealthPercent` can plug straight into a progress bar without exec wiring. `const` member functions marked `BlueprintCallable` are treated as pure automatically.\n\nThe catch: a pure node runs again every time a node that uses its output executes. Plugging an expensive or random pure function into several pins calls it several times and can produce different values each time. Keep pure functions cheap and deterministic.\n\nNever give a pure function side effects such as spending ammo or spawning. To force a `const` function to be shown with exec pins, write `UFUNCTION(BlueprintCallable, BlueprintPure = false)`.',
    example: `UFUNCTION(BlueprintPure, Category = "Health")
float GetHealthPercent() const { return Health / MaxHealth; }

// const + BlueprintCallable is pure automatically;
// opt out when the call should get exec pins:
UFUNCTION(BlueprintCallable, BlueprintPure = false)
int32 CountItems() const;`,
    see: ['blueprint-callable', 'const-member-function', 'ufunction'],
  },
  {
    id: 'blueprint-implementable-event',
    term: 'BlueprintImplementableEvent',
    course: 'unreal',
    category: 'Blueprint Exposure',
    short:
      'A `UFUNCTION` specifier for a function declared in C++ but implemented only in Blueprint. C++ calls it; if no Blueprint implements it, the call does nothing.',
    long:
      'Use it for hooks where C++ decides *when* and Blueprint decides *what*: `OnHit`, `OnLevelUp`, `PlayDeathEffects`. Declare it in the header and do **not** write a C++ body; UHT generates one that invokes the Blueprint implementation.\n\nThis keeps logic in C++ while designers attach effects, sounds and UI in Blueprint, and C++ never needs to know about specific assets.\n\nIf C++ needs a default behaviour when no Blueprint overrides it, use `BlueprintNativeEvent` instead. Events returning `void` appear as event nodes in Blueprint; those with a return value appear as functions to override.',
    example: `// Header only -- no C++ definition!
UFUNCTION(BlueprintImplementableEvent, Category = "Effects")
void OnLevelUp(int32 NewLevel);

void AHero::AddXP(int32 Amount) {
    XP += Amount;
    if (XP >= XPForNextLevel()) { OnLevelUp(++Level); }
}`,
    see: ['blueprint-native-event', 'blueprint-callable', 'virtual-function'],
  },
  {
    id: 'blueprint-native-event',
    term: 'BlueprintNativeEvent',
    course: 'unreal',
    category: 'Blueprint Exposure',
    short:
      'A `UFUNCTION` specifier for a function with a C++ default implementation (`Name_Implementation`) that Blueprint subclasses can override, optionally calling the parent version.',
    long:
      'Declare `UFUNCTION(BlueprintNativeEvent) void Interact(AActor* Who);` and define `void AChest::Interact_Implementation(AActor* Who)` in the `.cpp`. UHT generates `Interact()` itself, which runs the Blueprint override if there is one and otherwise calls your `_Implementation`.\n\nAlways *call* the generated `Interact()`, never `Interact_Implementation()` directly, or you bypass Blueprint overrides. In C++ subclasses, override `Interact_Implementation` (it is virtual) and call `Super::Interact_Implementation(Who)` to extend the base behaviour.\n\nIt is the Blueprint-aware version of a virtual function with a default implementation; `BlueprintImplementableEvent` is the version with no C++ body at all.',
    example: `// Header
UFUNCTION(BlueprintNativeEvent, BlueprintCallable)
void Interact(AActor* Who);

// .cpp: default behaviour, overridable in Blueprint
void AChest::Interact_Implementation(AActor* Who) {
    Open();
}`,
    see: ['blueprint-implementable-event', 'virtual-function', 'uinterface'],
  },
  {
    id: 'edit-anywhere',
    term: 'EditAnywhere',
    course: 'unreal',
    category: 'Blueprint Exposure',
    short:
      'A `UPROPERTY` specifier that makes a property editable in the Details panel both on class defaults (in the Blueprint editor) and on individual instances placed in a level.',
    long:
      'It is the most permissive edit specifier: `EditDefaultsOnly` allows editing only on class defaults, and `EditInstanceOnly` only on placed instances. Choosing deliberately avoids confusion: weapon damage usually belongs on defaults, a door\'s linked switch on the instance.\n\nEdit specifiers are about the editor, not about Blueprint graphs. To read or write the value in a graph you also need `BlueprintReadOnly` or `BlueprintReadWrite`.\n\nDo not use `EditAnywhere` on component pointers (`TObjectPtr<UStaticMeshComponent>`), which would let someone replace the component reference itself. Use `VisibleAnywhere`, which still lets designers edit the component\'s own properties.',
    example: `UPROPERTY(EditAnywhere, Category = "Door")     // both
float OpenSpeed = 90.f;

UPROPERTY(EditDefaultsOnly, Category = "Door") // class defaults
TObjectPtr<USoundBase> OpenSound;

UPROPERTY(EditInstanceOnly, Category = "Door") // placed doors
TObjectPtr<AActor> LinkedSwitch;`,
    see: ['visible-anywhere', 'blueprint-read-write', 'uproperty'],
    reading: [
      ue(
        'unreal-engine-uproperties',
        'Properties',
        'The property specifier list, including every Edit and Visible variant.',
      ),
    ],
  },
  {
    id: 'visible-anywhere',
    term: 'VisibleAnywhere',
    course: 'unreal',
    category: 'Blueprint Exposure',
    short:
      'A `UPROPERTY` specifier that shows a property read-only in the Details panel, on both class defaults and instances. The standard choice for component pointers.',
    long:
      'For value types, `VisibleAnywhere` displays the value without allowing edits, which is handy for runtime state like `CurrentHealth` that you want to watch during play.\n\nFor object pointers it has a subtle, useful meaning: the *pointer* cannot be changed, but the referenced object\'s own properties are still shown and editable. That is why components created with `CreateDefaultSubobject` are exposed as `UPROPERTY(VisibleAnywhere)`: designers can set the mesh and materials of `Mesh` without being able to swap the component out.\n\nThe variants `VisibleDefaultsOnly` and `VisibleInstanceOnly` restrict where it appears, mirroring the edit specifiers.',
    example: `// Designers can edit the mesh component's settings,
// but cannot replace the component itself
UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Parts")
TObjectPtr<UStaticMeshComponent> Mesh;

UPROPERTY(VisibleInstanceOnly, Category = "Debug")
float CurrentHealth = 0.f;`,
    see: ['edit-anywhere', 'createdefaultsubobject', 'uproperty'],
  },
  {
    id: 'blueprint-read-write',
    term: 'BlueprintReadWrite / ReadOnly',
    aliases: ['BlueprintReadWrite', 'BlueprintReadOnly'],
    course: 'unreal',
    category: 'Blueprint Exposure',
    short:
      '`UPROPERTY` specifiers that expose a property to Blueprint graphs: `BlueprintReadWrite` creates getter and setter nodes, `BlueprintReadOnly` only a getter.',
    long:
      'These control *graph* access and are independent of editor visibility (`EditAnywhere`, `VisibleAnywhere`). A common combination is `EditDefaultsOnly, BlueprintReadOnly`: designers tune the value in the editor and graphs can read it, but nothing changes it from Blueprint at run time.\n\nPrefer `BlueprintReadOnly` unless Blueprint genuinely needs to write. Writes from Blueprint bypass any logic in your C++ setter, which can break invariants (health above max, UI not refreshed). Expose a `BlueprintCallable` setter when changes must be validated or broadcast.\n\nPrivate C++ members need `meta = (AllowPrivateAccess = "true")` to be exposed to Blueprint; UHT reports an error otherwise.',
    example: `UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Stats")
float MaxHealth = 100.f;      // tune in editor, read in graphs

UPROPERTY(BlueprintReadWrite, Category = "State")
bool bIsAiming = false;       // anim Blueprint can set it

private:
UPROPERTY(VisibleAnywhere, BlueprintReadOnly,
    meta = (AllowPrivateAccess = "true"))
int32 Kills = 0;`,
    see: ['edit-anywhere', 'visible-anywhere', 'blueprint-callable', 'encapsulation'],
    reading: [
      ue(
        'unreal-engine-uproperties',
        'Properties',
        'Covers the Blueprint access specifiers and how they combine with edit specifiers.',
      ),
    ],
  },

  // --------------------------------------------------------------------- Assets
  {
    id: 'asset',
    term: 'Asset',
    course: 'unreal',
    category: 'Assets',
    short:
      'A piece of content saved in the project\'s `Content` folder as a `.uasset` (or `.umap`) package: meshes, textures, sounds, materials, Blueprints, data assets.',
    long:
      'Each asset is a serialised `UObject` (plus any subobjects) stored in a package file. In code and config, assets are identified by object paths such as `/Game/Weapons/SM_Sword.SM_Sword`, where `/Game/` maps to the project\'s `Content` folder.\n\nAlways move, rename and delete assets inside the editor\'s Content Browser, never in the file system. The editor updates references and leaves **redirectors** behind so other assets still find the moved one; run "Fix Up Redirectors" on folders now and then to clean them up.\n\nHow assets reference each other, hard or soft, decides what loads when, which strongly affects memory use and loading times.',
    example: `// Object path: /Game/<folders>/<Package>.<ObjectName>
const FSoftObjectPath SwordPath(
    TEXT("/Game/Weapons/SM_Sword.SM_Sword"));

UStaticMesh* Sword =
    Cast<UStaticMesh>(SwordPath.TryLoad());   // sync load`,
    see: ['hard-reference', 'soft-reference', 'asset-manager'],
  },
  {
    id: 'hard-reference',
    term: 'Hard Reference',
    course: 'unreal',
    category: 'Assets',
    short:
      'A direct reference to an asset or class (such as a `TObjectPtr<UStaticMesh>` or `TSubclassOf` property) that forces the referenced asset to load whenever the referencing object loads.',
    long:
      'Hard references are simple and always valid: when the owning asset or Blueprint loads, everything it hard-references loads too, recursively. Use them for things that are always needed together, like a weapon\'s own mesh.\n\nThe danger is the chain reaction: a GameMode hard-referencing every character Blueprint, each hard-referencing its weapons, sounds and effects, can pull most of the game into memory at startup. In Blueprint, casting to a Blueprint class or storing it in a variable creates a hard reference too.\n\nUse the editor\'s **Reference Viewer** and **Size Map** to see what an asset drags in, and switch large or optional content to soft references.',
    example: `// Hard: loaded with the owner, always ready
UPROPERTY(EditDefaultsOnly)
TObjectPtr<UStaticMesh> SwordMesh;

// Soft: just a path until you load it
UPROPERTY(EditDefaultsOnly)
TSoftObjectPtr<UStaticMesh> RareSkinMesh;`,
    see: ['soft-reference', 'asset', 'tsubclassof'],
    reading: [
      ue(
        'referencing-assets-in-unreal-engine',
        'Referencing Assets',
        'Compares hard and soft references and shows how each is declared in C++.',
      ),
    ],
  },
  {
    id: 'soft-reference',
    term: 'Soft Reference',
    course: 'unreal',
    category: 'Assets',
    short:
      'A reference to an asset stored as a path (`FSoftObjectPath`, `TSoftObjectPtr`, `TSoftClassPtr`) that does not load the asset until you explicitly ask.',
    long:
      'Soft references let you point at content without paying for it up front: 200 cosmetic skins in a store, each level\'s music, enemy types for later waves. Loading becomes your responsibility: synchronously (`LoadSynchronous`, which may hitch) or asynchronously with a callback (`FStreamableManager` or the Asset Manager).\n\nOnce loaded, keep a hard reference (or the streamable handle) for as long as you use the asset, or the garbage collector may unload it again.\n\nThe trade-off is complexity: code must handle the "not loaded yet" state. Teams typically use hard references inside small groups of assets that always belong together, and soft references at the boundaries between large systems.',
    example: `UPROPERTY(EditDefaultsOnly)
TSoftObjectPtr<USoundBase> BossMusic;

if (BossMusic.IsPending()) {          // path set, not loaded
    UE_LOG(LogTemp, Log, TEXT("Loading %s"),
        *BossMusic.ToString());
}
USoundBase* Music = BossMusic.LoadSynchronous();`,
    see: ['hard-reference', 'tsoftobjectptr', 'async-loading'],
    reading: [
      ue(
        'referencing-assets-in-unreal-engine',
        'Referencing Assets',
        'Explains soft object paths and soft pointers, and how to load what they point to.',
      ),
    ],
  },
  {
    id: 'tsoftobjectptr',
    term: 'TSoftObjectPtr',
    course: 'unreal',
    category: 'Assets',
    short:
      'A soft reference to an asset: it stores the asset\'s path and only points to the object once something has loaded it, so referencing it does not force the asset into memory.',
    long:
      'A normal `TObjectPtr<UTexture2D>` property is a *hard* reference: loading the owner also loads the texture, and everything it references, recursively. For a large item database, that can mean loading every icon and mesh in the game at startup.\n\n`TSoftObjectPtr<T>` stores an `FSoftObjectPath` instead. `Get()` returns the object only if it is already loaded; otherwise load it synchronously with `LoadSynchronous()` (simple, but can hitch) or asynchronously through `FStreamableManager` or the Asset Manager.\n\nSoft pointers reference assets (and actors placed in other levels), not objects created at run time. `IsNull()` tells you whether a path is set, `IsPending()` whether it is set but not loaded, and `Get()` whether it is loaded.',
    example: `UPROPERTY(EditDefaultsOnly, Category = "UI")
TSoftObjectPtr<UTexture2D> Icon;

// Later, when the icon is actually needed:
UTexture2D* Tex = Icon.LoadSynchronous(); // may hitch`,
    see: ['soft-reference', 'async-loading', 'tsoftclassptr', 'hard-reference'],
    reading: [
      ue(
        'referencing-assets-in-unreal-engine',
        'Referencing Assets',
        'Shows TSoftObjectPtr in context alongside hard references.',
      ),
    ],
  },
  {
    id: 'tsoftclassptr',
    term: 'TSoftClassPtr',
    course: 'unreal',
    category: 'Assets',
    short:
      'The class version of a soft reference: it stores the path to a (usually Blueprint) class without loading it, and can be loaded later to get a `UClass*`.',
    long:
      '`TSubclassOf<T>` is a hard reference, so the Blueprint class and its assets load with the owner. `TSoftClassPtr<T>` lets a designer pick a class (filtered to subclasses of `T`) while deferring the load until you actually spawn it, which matters for things like a list of every enemy type or unlockable weapon.\n\nLoad it with `LoadSynchronous()`, which returns a `UClass*`, or asynchronously with `FStreamableManager::RequestAsyncLoad` using `ToSoftObjectPath()`.\n\nAfter loading, keep the class referenced (for example in a `TSubclassOf` property) if you will spawn it repeatedly; otherwise the garbage collector can unload it again.',
    example: `UPROPERTY(EditDefaultsOnly, Category = "Spawning")
TSoftClassPtr<AEnemy> BossClass;

void ASpawner::SpawnBoss() {
    if (UClass* Cls = BossClass.LoadSynchronous()) {
        GetWorld()->SpawnActor<AEnemy>(Cls, GetActorTransform());
    }
}`,
    see: ['tsoftobjectptr', 'tsubclassof', 'async-loading', 'soft-reference'],
  },
  {
    id: 'async-loading',
    term: 'Async Loading',
    aliases: ['Asynchronous Loading'],
    course: 'unreal',
    category: 'Assets',
    short:
      'Loading assets in the background (with `FStreamableManager` or the Asset Manager) and getting a callback when they are ready, instead of blocking the game thread.',
    long:
      'A synchronous load stops the game until the asset and its dependencies have been read from disk, a visible hitch for anything large. Async loading requests the assets, keeps the game running, and calls your delegate once everything is in memory.\n\nIn C++, use `UAssetManager::GetStreamableManager().RequestAsyncLoad(Path, Callback)`, or `LoadPrimaryAsset` for primary assets. It returns a `TSharedPtr<FStreamableHandle>`; keep the handle alive as long as you need the assets, because releasing it allows them to be unloaded.\n\nYour code must handle the gap: show a placeholder, disable the button or queue the action. The requester may be destroyed before loading finishes, so bind callbacks with `CreateUObject` or `CreateWeakLambda`, which will not call into a dead object.',
    example: `void AShop::PreviewSkin() {
    FStreamableManager& SM = UAssetManager::GetStreamableManager();
    SkinHandle = SM.RequestAsyncLoad(SkinMesh.ToSoftObjectPath(),
        FStreamableDelegate::CreateUObject(
            this, &AShop::OnSkinLoaded));
}

void AShop::OnSkinLoaded() {
    Preview->SetStaticMesh(SkinMesh.Get());   // now loaded
}`,
    see: ['soft-reference', 'asset-manager', 'tsoftobjectptr', 'delegate'],
    reading: [
      ue(
        'asynchronous-asset-loading-in-unreal-engine',
        'Asynchronous Asset Loading',
        'Using FStreamableManager and streamable handles to load assets without hitches.',
      ),
    ],
  },
  {
    id: 'asset-manager',
    term: 'Asset Manager',
    aliases: ['UAssetManager'],
    course: 'unreal',
    category: 'Assets',
    short:
      'A global singleton (`UAssetManager`) that discovers, tracks and loads *primary assets* by ID, and drives the rules for which assets are cooked into which package chunks.',
    long:
      'The Asset Manager knows about the asset types you register in Project Settings → Asset Manager, such as every `Item` data asset under `/Game/Items`. At run time you can list the assets of a type without loading them, load them asynchronously by `FPrimaryAssetId`, and load only specific *bundles* of their soft references.\n\nIt also owns the shared `FStreamableManager` and plays a role in packaging: primary asset rules decide what gets cooked and how content is split into chunks for patches or DLC.\n\nLarger projects subclass it (set the Asset Manager class in the engine\'s project settings) to add startup loading and game-specific helpers, as Epic\'s Lyra sample does.',
    example: `UAssetManager& AM = UAssetManager::Get();
TArray<FPrimaryAssetId> Items;
AM.GetPrimaryAssetIdList(FPrimaryAssetType(TEXT("Item")), Items);
AM.LoadPrimaryAssets(Items, {}, FStreamableDelegate::CreateUObject(
    this, &UInventoryScreen::OnItemsLoaded));`,
    see: ['primary-data-asset', 'async-loading', 'soft-reference'],
    reading: [
      ue(
        'asset-management-in-unreal-engine',
        'Asset Management',
        'How the Asset Manager discovers primary assets and loads them on demand.',
      ),
    ],
  },
];
