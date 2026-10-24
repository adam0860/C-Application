import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-project-structure',
  title: 'Anatomy of an Unreal Project',
  summary:
    'The .uproject file, every folder in a project (and which ones belong in version control), the files that define a C++ module, and how plugins package code for reuse.',
  minutes: 17,
  objectives: [
    'Read a `.uproject` file and explain each of its fields',
    'Say which project folders are source of truth and which are generated — and what to commit',
    'Explain the roles of `MyGame.Build.cs`, `MyGame.Target.cs` and `MyGameEditor.Target.cs`',
    'Describe what `IMPLEMENT_PRIMARY_GAME_MODULE` does in `MyGame.cpp`',
    'Organise headers into `Public` and `Private` folders and recognise the structure of a plugin',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'A project is a folder with a .uproject at its heart',
      blocks: [
        {
          type: 'p',
          text: 'In the C++ course, a project was a handful of `.cpp` and `.h` files plus a build script. An Unreal project is bigger, but just as orderly: one folder, one descriptor file, and a fixed set of sub-folders whose names the engine expects. Here is what a freshly created C++ project called `MyGame` looks like after its first build:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'MyGame/ (project root)',
          code: `MyGame/
├── MyGame.uproject
├── Config/
├── Content/
├── Source/
├── Plugins/            (optional)
├── Binaries/           generated
├── Intermediate/       generated
├── Saved/              generated
├── DerivedDataCache/   generated
└── MyGame.sln          generated`,
          annotations: [
            { lines: 2, text: 'The project descriptor. Double-clicking it opens the project in the editor. It is a small JSON file — next card.' },
            { lines: 3, text: '`.ini` files holding project settings: default maps, rendering options, input, packaging. Everything you change in *Project Settings* is written here.' },
            { lines: 4, text: 'Every asset: levels (`.umap`), meshes, materials, sounds, Blueprints (`.uasset`). In the editor this is the `/Game/` path.' },
            { lines: 5, text: 'Your C++ code, organised into modules.' },
            { lines: 6, text: 'Project-specific plugins — self-contained bundles of code and/or content.' },
            { lines: '7-11', text: 'Created by the build tools and the editor. All of these can be regenerated from the folders above, which is why you don\'t commit them.' },
          ],
        },
        {
          type: 'p',
          text: 'The split to remember is **source of truth** versus **generated**. `Source`, `Content`, `Config`, `Plugins` and the `.uproject` are the project. Everything else is a by-product that tools can rebuild — usually by compiling, sometimes by just reopening the editor.',
        },
        {
          type: 'code',
          lang: 'ini',
          title: 'Config/DefaultEngine.ini (excerpt)',
          code: `[/Script/EngineSettings.GameMapsSettings]
GameDefaultMap=/Game/Maps/MainMenu.MainMenu
EditorStartupMap=/Game/Maps/TestLevel.TestLevel`,
          annotations: [
            { lines: 1, text: 'A section named after the C++ settings class it configures (`UGameMapsSettings` in the `EngineSettings` module).' },
            { lines: '2-3', text: 'Asset paths: `/Game/` maps to the `Content/` folder. The *Maps & Modes* page of Project Settings edits exactly these lines.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'The engine has the same shape',
          text: 'Open an engine installation and you will find `Engine/Source`, `Engine/Content`, `Engine/Config`, `Engine/Plugins` and `Engine/Binaries`. Your project is laid out like a miniature engine, because to the build tools it is just another set of modules.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The .uproject file',
      blocks: [
        {
          type: 'p',
          text: 'The [[uproject-file]] tells the editor, the Epic Games Launcher and the build tools three things: which engine version the project belongs to, which code modules it contains, and which plugins it enables. It is plain JSON:',
        },
        {
          type: 'code',
          lang: 'json',
          title: 'MyGame.uproject',
          code: `{
    "FileVersion": 3,
    "EngineAssociation": "5.4",
    "Category": "",
    "Description": "",
    "Modules": [
        {
            "Name": "MyGame",
            "Type": "Runtime",
            "LoadingPhase": "Default",
            "AdditionalDependencies": [
                "Engine"
            ]
        }
    ],
    "Plugins": [
        {
            "Name": "ModelingToolsEditorMode",
            "Enabled": true,
            "TargetAllowList": [
                "Editor"
            ]
        }
    ]
}`,
          annotations: [
            { lines: 2, text: 'The version of the descriptor *format*, not of your game. You never change it by hand.' },
            { lines: 3, text: 'Which engine opens this project. For a launcher install it is a version such as `"5.4"`; for a source-built engine it is a unique identifier of that engine build.' },
            { lines: 8, text: 'The module name. It must match the folder `Source/MyGame` and the rules file `MyGame.Build.cs`.' },
            { lines: 9, text: '`Runtime` modules are part of the game and the editor. `Editor` modules load only in the editor and never ship to players.' },
            { lines: 10, text: 'When during engine start-up the module loads. `Default` suits gameplay code; a few systems must load earlier.' },
            { lines: '16-24', text: 'Plugins the project turns on (or off) beyond the engine defaults. *Edit → Plugins* in the editor writes this list. `TargetAllowList` limits this one to editor builds.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a text file and not a binary one?',
          text: 'The descriptor is read by several programs (the launcher, the editor, the build tool) and edited by people, so it needs to be readable, hand-editable and **mergeable in version control**. JSON gives all three. Compare that with `.uasset` files, which are binary because they hold large amounts of mesh, texture and graph data.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'The right-click menu',
          text: 'On Windows, right-clicking a `.uproject` offers **Generate Visual Studio project files** (rebuilds the `.sln`), **Switch Unreal Engine version** (rewrites `EngineAssociation`) and **Launch game**. You will use the first one often.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'A teammate built their own engine from source and committed the `.uproject`. Now your launcher install cannot open the project without asking which engine to use. Which field caused this?',
      options: [
        {
          text: '`FileVersion`',
          why: '`FileVersion` describes the JSON format of the descriptor itself. It is the same for every UE4/UE5 project.',
        },
        {
          text: '`Modules`',
          why: '`Modules` lists the code modules. It doesn\'t say anything about which engine installation to use.',
        },
        {
          text: '`EngineAssociation`',
          correct: true,
          why: 'For a source build this field holds an identifier of *their* engine build, which doesn\'t exist on your machine, so the launcher asks you to pick one.',
        },
        {
          text: '`Plugins`',
          why: 'A missing plugin produces a different message ("this project requires the X plugin"), not an engine-selection prompt.',
        },
      ],
      explanation:
        '`EngineAssociation` binds a project to an engine installation: a version string like `"5.4"` for launcher builds, or a build identifier for source builds. Teams that use a custom engine usually commit the engine alongside the project, so the association resolves the same way on every machine.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Folders you commit, folders you regenerate',
      blocks: [
        {
          type: 'p',
          text: 'Getting version control right on day one saves a team from bloated repositories and mysterious conflicts. The rule: commit what humans author; ignore what tools generate.',
        },
        {
          type: 'table',
          headers: ['Folder', 'Contains', 'Commit?'],
          rows: [
            ['`Source/`', 'C++ code, `.Build.cs`, `.Target.cs`', '**Yes**'],
            ['`Content/`', 'All assets (`.uasset`, `.umap`)', '**Yes** — usually through Git LFS or Perforce'],
            ['`Config/`', 'Project `.ini` settings', '**Yes**'],
            ['`Plugins/`', 'Project plugins\' source and content', '**Yes** (but not their own `Binaries/` and `Intermediate/`)'],
            ['`Binaries/`', 'Compiled DLLs and executables', 'No — rebuilt by compiling'],
            ['`Intermediate/`', 'Object files, generated code, project files', 'No — rebuilt by compiling'],
            ['`Saved/`', 'Logs, autosaves, crash reports, per-user config, screenshots', 'No — local to your machine'],
            ['`DerivedDataCache/`', 'Cached compiled shaders, compressed textures and similar', 'No — rebuilt on demand'],
            ['`*.sln`, `.vs/`, `.idea/`', 'IDE project files and caches', 'No — regenerate them'],
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: '.gitignore (typical)',
          code: `Binaries/
Intermediate/
Saved/
DerivedDataCache/
.vs/
.idea/
*.sln
Plugins/*/Binaries/
Plugins/*/Intermediate/`,
          annotations: [
            { lines: '1-4', text: 'The four generated folders. Together they can easily be many gigabytes.' },
            { lines: '5-7', text: 'IDE files are generated from the `.uproject` and `.Build.cs` files and contain machine-specific paths.' },
            { lines: '8-9', text: 'Plugins have their own generated folders, which need ignoring too.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not commit generated files "just in case"?',
          text: 'They are huge, they change on every build, and they depend on your machine: your compiler version, engine path and build configuration. Committing them makes every pull a giant download and every merge a conflict over files nobody edited by hand. Since they can always be regenerated, versioning them buys nothing.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'The one common exception',
          text: 'Studios often distribute **pre-built binaries** to artists and designers who don\'t have a compiler installed, so they can open the editor without building C++. That is done deliberately, with dedicated tooling (Epic\'s UnrealGameSync with Perforce, for example) — not by committing your local `Binaries/` folder.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'The classic "turn it off and on again"',
          text: 'When builds fail in ways that make no sense, close the editor and IDE, delete `Binaries/` and `Intermediate/`, regenerate project files from the `.uproject`, and rebuild. Because those folders are pure by-products, this is always safe.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'mcq',
      multi: true,
      prompt: 'You are setting up a Git repository for `MyGame`. Select **all** folders that should be committed.',
      options: [
        { text: '`Source/`', correct: true, why: 'Your C++ code and build rules — the very definition of source of truth.' },
        { text: '`Content/`', correct: true, why: 'Assets are authored by people and cannot be regenerated. Use Git LFS (or Perforce) because they are large binaries.' },
        { text: '`Config/`', correct: true, why: 'Project settings such as default maps and input configuration live here. Lose them and the project behaves differently.' },
        { text: '`Intermediate/`', why: 'Generated code, object files and project files. Recreated on every build.' },
        { text: '`Saved/`', why: 'Logs, autosaves and per-user settings. Committing them leaks one person\'s local state to everyone.' },
        { text: '`DerivedDataCache/`', why: 'A cache of processed data such as compiled shaders. The engine rebuilds it automatically when it is missing.' },
      ],
      explanation:
        'Commit what humans author (`Source`, `Content`, `Config`, `Plugins`, the `.uproject`); ignore what tools generate (`Binaries`, `Intermediate`, `Saved`, `DerivedDataCache`, IDE files). The generated folders are large, machine-specific and always rebuildable.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'Deleting the `Intermediate` folder (with the editor closed) destroys work that cannot be regenerated.',
      answer: false,
      explanation:
        '`Intermediate` holds object files, the code generated by Unreal\'s header tool, and IDE project files — all by-products. The next build recreates them, at the cost of a full rebuild. That is precisely why deleting it is a standard fix for confusing build errors.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Source: modules, Build.cs and Target.cs',
      blocks: [
        {
          type: 'p',
          text: 'Unreal code is organised into [[ue-module|modules]]: units of code that compile into one library each, declare their dependencies on other modules, and are loaded by the engine. A new project has a single game module, named after the project:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Source/',
          code: `Source/
├── MyGame.Target.cs
├── MyGameEditor.Target.cs
└── MyGame/
    ├── MyGame.Build.cs
    ├── MyGame.h
    └── MyGame.cpp`,
          annotations: [
            { lines: '2-3', text: '[[target-cs|Target files]] describe **programs to build**: one for the standalone game, one for the editor.' },
            { lines: 4, text: 'One folder per module. The folder name is the module name.' },
            { lines: 5, text: 'The module\'s [[build-cs|build rules]]: its dependencies and compile settings.' },
            { lines: '6-7', text: 'The module\'s own code; `MyGame.cpp` registers the module with the engine (two cards from now).' },
          ],
        },
        {
          type: 'p',
          text: 'Build rules are written in **C#**, because Unreal\'s build tool is a C# program that compiles and runs these files to learn how to build your code. Here is the module rules file:',
        },
        {
          type: 'code',
          lang: 'csharp',
          title: 'MyGame.Build.cs',
          code: `using UnrealBuildTool;

public class MyGame : ModuleRules {
    public MyGame(ReadOnlyTargetRules Target)
        : base(Target) {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[] {
            "Core", "CoreUObject", "Engine", "InputCore",
            "EnhancedInput"
        });

        PrivateDependencyModuleNames.AddRange(
            new string[] { });
    }
}`,
          annotations: [
            { lines: 3, text: 'The class **must** be named exactly like the module (and the file). The build tool finds rules by that name.' },
            { lines: 4, text: '`Target` describes what is being built (game or editor, which platform, which configuration), so rules can make decisions such as "only on Windows".' },
            { lines: 6, text: 'Precompiled-header strategy. The default shown here lets modules share engine precompiled headers, which speeds up builds.' },
            { lines: '8-11', text: 'Modules whose headers your code includes. `Core` (basic types), `CoreUObject` (the object system), `Engine` (actors, worlds), plus input modules. The build-system lesson covers public vs private dependencies.' },
          ],
        },
        {
          type: 'p',
          text: 'The two target files are almost identical. The only meaningful difference is the target **type**:',
        },
        {
          type: 'code',
          lang: 'csharp',
          title: 'MyGame.Target.cs',
          code: `using UnrealBuildTool;
using System.Collections.Generic;

public class MyGameTarget : TargetRules {
    public MyGameTarget(TargetInfo Target) : base(Target) {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        IncludeOrderVersion =
            EngineIncludeOrderVersion.Unreal5_4;
        ExtraModuleNames.Add("MyGame");
    }
}`,
          annotations: [
            { lines: 4, text: 'Named `<TargetName>Target`. The file `MyGameEditor.Target.cs` contains `MyGameEditorTarget` instead.' },
            { lines: 6, text: '`Game` builds the standalone game that players run. In `MyGameEditor.Target.cs` this line reads `Type = TargetType.Editor;`, which builds your modules into the editor instead.' },
            { lines: '7-9', text: 'Pin default build settings and the engine\'s header include order to a known engine version, so upgrading the engine doesn\'t silently change how your code compiles.' },
            { lines: 10, text: 'The modules this program contains. The engine\'s own modules are pulled in automatically through dependencies.' },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Targets and modules',
          text: 'A **module** is like a static or dynamic library from the C++ course: a reusable chunk of compiled code. A **target** is like an executable that links a set of libraries together. One module (`MyGame`) can appear in several targets: the game, the editor, and later perhaps a dedicated server.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: 'Complete the editor target file so it builds your game module into the Unreal Editor.',
      template: `public class MyGameEditorTarget : ___ {
    public MyGameEditorTarget(TargetInfo Target)
        : base(Target) {
        Type = TargetType.___;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        ExtraModuleNames.Add("___");
    }
}`,
      blanks: [{ answers: ['TargetRules'] }, { answers: ['Editor'] }, { answers: ['MyGame'] }],
      wordBank: ['TargetRules', 'Editor', 'MyGame', 'ModuleRules', 'Game', 'MyGameEditor', 'Engine'],
      lang: 'csharp',
      explanation:
        'Target files derive from `TargetRules` (module files derive from `ModuleRules`). `TargetType.Editor` produces the editor with your code loaded into it, while `TargetType.Game` produces the standalone game. Both targets list the **same** module, `MyGame` — the editor target is not a different module, it is a different program containing your module.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'MyGame.h, MyGame.cpp and IMPLEMENT_PRIMARY_GAME_MODULE',
      blocks: [
        {
          type: 'p',
          text: 'Every module needs a tiny piece of code that introduces it to the engine\'s **module manager** — the system that loads modules, starts them up and shuts them down. In the game module, that code lives in `MyGame.cpp`:',
        },
        {
          type: 'code',
          title: 'MyGame.h',
          code: `#pragma once

#include "CoreMinimal.h"`,
          annotations: [
            { lines: 3, text: '`CoreMinimal.h` brings in Unreal\'s basic types (`int32`, `FString`, `TArray`, `FVector`, logging…). This module-wide header is also a natural home for declarations shared across the module, such as a custom log category (covered in the logging lesson).' },
          ],
        },
        {
          type: 'code',
          title: 'MyGame.cpp',
          code: `#include "MyGame.h"
#include "Modules/ModuleManager.h"

IMPLEMENT_PRIMARY_GAME_MODULE(
    FDefaultGameModuleImpl, MyGame, "MyGame");`,
          annotations: [
            { lines: 2, text: 'Declares the module manager and the `IMPLEMENT_*_MODULE` macros.' },
            { lines: 4, text: 'A [[macro]] that generates the module\'s registration code. *Primary* means this is the project\'s main game module — exactly one module per project uses this variant.' },
            { lines: 5, text: 'Three arguments: the C++ class implementing the module (`FDefaultGameModuleImpl` is a ready-made one that does nothing special), the module name (must match `MyGame.Build.cs`), and the game\'s name.' },
          ],
        },
        {
          type: 'p',
          text: 'In the editor, every module is a separate DLL (`UnrealEditor-MyGame.dll`). When the engine loads that DLL it needs a known function to call to create the module object — that is what the macro defines. In a packaged game everything is linked into one executable, and the macro instead registers the module statically; the *primary* variant also defines project-wide globals a game executable needs, such as the project name.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a macro instead of normal code?',
          text: 'The registration code differs between DLL-based editor builds and single-executable game builds, and must be written in a precise way the module manager can find. A macro lets one line in your source produce the right code for every build configuration and platform — the same reason the C++ course used macros for things like include guards.',
        },
        {
          type: 'deepdive',
          title: 'Running code when your module starts',
          blocks: [
            {
              type: 'p',
              text: 'Replace `FDefaultGameModuleImpl` with your own class to run code at module start-up or shut-down — for example to register custom console commands or settings:',
            },
            {
              type: 'code',
              title: 'MyGame.cpp',
              code: `class FMyGameModule : public FDefaultGameModuleImpl {
public:
    virtual void StartupModule() override {
        // Runs right after the module is loaded.
    }

    virtual void ShutdownModule() override {
        // Runs just before the module is unloaded.
    }
};

IMPLEMENT_PRIMARY_GAME_MODULE(
    FMyGameModule, MyGame, "MyGame");`,
              annotations: [
                { lines: 1, text: 'Module classes are plain C++ classes (prefixed `F`), not `UObject`s. `FDefaultGameModuleImpl` ultimately implements the `IModuleInterface` interface.' },
                { lines: '3-9', text: 'Virtual hooks the module manager calls. Most game modules never need them; plugin and editor modules use them often.' },
              ],
            },
            {
              type: 'p',
              text: 'Additional modules and plugin modules use `IMPLEMENT_MODULE(FDefaultModuleImpl, ModuleName)` or `IMPLEMENT_GAME_MODULE` instead, because only one module can be primary.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: 'After a teammate "tidied up" the build rules, every build fails with *"Expecting to find a type to be declared in a module rules named \'MyGame\'"*. Tap the faulty line.',
      lang: 'csharp',
      code: `// Source/MyGame/MyGame.Build.cs
using UnrealBuildTool;

public class MyGameModule : ModuleRules {
    public MyGameModule(ReadOnlyTargetRules Target)
        : base(Target) {
        PublicDependencyModuleNames.AddRange(new string[] {
            "Core", "CoreUObject", "Engine"
        });
    }
}`,
      bugLines: [4, 5],
      hint: 'How does the build tool find the rules for module `MyGame`?',
      explanation:
        'The build tool locates `MyGame.Build.cs` by file name, compiles it, and then looks for a C# class called exactly `MyGame`. Renaming the class to `MyGameModule` is valid C#, so nothing complains until the build tool can\'t find the type it expects. The fix is to rename the class (and its constructor) back to `MyGame`. The same naming rule applies to targets: `MyGame.Target.cs` must contain `MyGameTarget`.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Public and Private folders',
      blocks: [
        {
          type: 'p',
          text: 'As a module grows, you split its files into two sub-folders. This is the header/source split from the C++ course, applied at the level of a whole module:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Source/MyGame/',
          code: `MyGame/
├── MyGame.Build.cs
├── Public/
│   ├── MyGame.h
│   └── Weapons/
│       └── WeaponBase.h
└── Private/
    ├── MyGame.cpp
    └── Weapons/
        └── WeaponBase.cpp`,
          annotations: [
            { lines: '3-6', text: '**Public:** headers that *other modules* may include. When a module lists `MyGame` as a dependency, the build tool adds this folder to its include paths.' },
            { lines: '7-10', text: '**Private:** every `.cpp` file, plus headers used only inside this module. No other module can include anything from here.' },
            { lines: [5, 6], text: 'Sub-folders are fine. Includes are written relative to `Public/`: `#include "Weapons/WeaponBase.h"`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why enforce a public surface?',
          text: 'It is [[encapsulation]] for modules. Anything in `Private/` can change freely without breaking other modules, and other modules physically cannot depend on your implementation details, because the compiler cannot even find those headers. In a big project with dozens of modules, that keeps dependencies deliberate and rebuilds smaller.',
        },
        {
          type: 'p',
          text: 'Exposing a header is only half the job. For another module to **link** against your classes, they must also be exported from your module\'s DLL. That is what the `MYGAME_API` macro in front of a class name does — you will dissect it in the first-class lesson.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'When to add more modules',
          text: 'Small games are fine with one module. Larger projects split out code that has a different audience — for example an `Editor`-type module (`MyGameEditor`) for custom editor tools, so that editor-only code never ships to players.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Plugins: modules you can carry between projects',
      blocks: [
        {
          type: 'p',
          text: 'A [[uplugin|plugin]] is a folder containing a `.uplugin` descriptor plus its own modules and, optionally, its own content. It is the unit of **reuse** in Unreal: an inventory system, a dialogue system or an analytics integration can live in a plugin and be dropped into another project. The engine itself ships hundreds of plugins (Enhanced Input, Niagara, Common UI…), which you enable or disable under *Edit → Plugins*.',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Plugins/InventorySystem/',
          code: `InventorySystem/
├── InventorySystem.uplugin
├── Content/
├── Resources/Icon128.png
└── Source/InventorySystem/
    ├── InventorySystem.Build.cs
    ├── Public/
    └── Private/`,
          annotations: [
            { lines: 2, text: 'The plugin descriptor (JSON, below).' },
            { lines: 3, text: 'Optional plugin-owned assets, shown in the Content Browser under the plugin\'s name.' },
            { lines: '5-8', text: 'A module with exactly the same layout as a game module: rules file, `Public/`, `Private/`. A plugin can contain several modules.' },
          ],
        },
        {
          type: 'code',
          lang: 'json',
          title: 'InventorySystem.uplugin',
          code: `{
    "FileVersion": 3,
    "Version": 1,
    "VersionName": "1.0",
    "FriendlyName": "Inventory System",
    "Category": "Gameplay",
    "CanContainContent": true,
    "Modules": [
        {
            "Name": "InventorySystem",
            "Type": "Runtime",
            "LoadingPhase": "Default"
        }
    ]
}`,
          annotations: [
            { lines: '3-6', text: 'Your plugin\'s own version number, plus how it appears in the editor\'s Plugins window.' },
            { lines: 7, text: 'Required for the plugin to have a `Content/` folder.' },
            { lines: '8-14', text: 'The same module entries you saw in the `.uproject`.' },
          ],
        },
        {
          type: 'table',
          headers: ['Where it lives', 'Scope'],
          rows: [
            ['`MyGame/Plugins/`', 'Project plugin: travels with the project in version control'],
            ['`Engine/Plugins/`', 'Engine plugin: available to every project using that engine'],
            ['Installed from Fab (formerly the Unreal Marketplace)', 'Installed into the engine; enabled per project'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Using a plugin\'s code',
          text: 'Enabling a plugin makes its modules load. To *include its headers* from your game module, you also add the plugin\'s module name (for example `"InventorySystem"`) to your `MyGame.Build.cs` dependencies.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'order',
      prompt: 'Your project fails to build with errors that make no sense. Put the "clean rebuild" steps in order.',
      lines: [
        'Close the Unreal Editor and your IDE',
        'Delete the `Binaries` and `Intermediate` folders',
        'Right-click `MyGame.uproject` and choose Generate Visual Studio project files',
        'Open the regenerated solution and build Development Editor',
        'Launch the editor',
      ],
      distractors: ['Delete the `Content` folder'],
      linesAreCode: false,
      explanation:
        'The editor and IDE lock files, so close them first. `Binaries` and `Intermediate` are pure by-products, so deleting them is safe; regenerating project files rebuilds the solution, and the build recreates everything else. Deleting `Content` is a trap — that destroys every asset in the project.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'Your game module needs to include `InventoryComponent.h` from the `InventorySystem` plugin. Where must that header live inside the plugin?',
      options: [
        {
          text: '`Source/InventorySystem/Private/`',
          why: 'Private headers are invisible outside their own module. The game module\'s `#include` would fail with "file not found".',
        },
        {
          text: '`Source/InventorySystem/Public/`',
          correct: true,
          why: 'Public headers are added to the include paths of every module that depends on `InventorySystem`.',
        },
        {
          text: '`Content/`',
          why: '`Content/` holds assets such as meshes and Blueprints. The compiler never looks there.',
        },
        {
          text: '`Intermediate/`',
          why: '`Intermediate/` contains generated files and is wiped on a clean build. Never put hand-written code there.',
        },
      ],
      explanation:
        'A module\'s `Public/` folder is its interface to the world, and `Private/` is its implementation. For the include to work you also need the dependency: add `"InventorySystem"` to `MyGame.Build.cs`, which is exactly what tells the build tool to add that `Public/` folder to your include paths.',
    },
  ],
  takeaways: [
    'An Unreal project is a folder with a `.uproject` JSON descriptor that names the engine version, the code modules and the enabled plugins.',
    '`Source`, `Content`, `Config`, `Plugins` and the `.uproject` are the project; `Binaries`, `Intermediate`, `Saved`, `DerivedDataCache` and IDE files are generated and stay out of version control.',
    'Code lives in modules. `MyGame.Build.cs` (a `ModuleRules` class named after the module) declares dependencies; `.Target.cs` files describe the programs to build — the game and the editor.',
    '`IMPLEMENT_PRIMARY_GAME_MODULE` in `MyGame.cpp` registers the project\'s main module with the module manager; exactly one module per project is primary.',
    'Headers other modules may include go in `Public/`; `.cpp` files and internal headers go in `Private/`.',
    'Plugins package modules and content for reuse and are enabled per project; including a plugin\'s headers also requires a `Build.cs` dependency.',
  ],
  reading: [
    {
      title: 'Unreal Engine Modules',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-modules',
      source: 'unreal-docs',
      note: 'How modules are structured, loaded and declared, including `Public`/`Private` folders and module types.',
    },
    {
      title: 'Plugins in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/plugins-in-unreal-engine',
      source: 'unreal-docs',
      note: 'The `.uplugin` format, plugin locations and how plugins are enabled.',
    },
    {
      title: 'Unreal Build Tool',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-build-tool-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Background on the build rules files you met in this lesson; the next lesson goes deeper.',
    },
  ],
};
