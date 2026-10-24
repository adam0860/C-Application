import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-first-class',
  title: 'Your First C++ Actor',
  summary:
    'Create a C++ Actor from the editor, understand every line of the generated header and source file, then compile it, place it in a level and extend it with a Blueprint.',
  minutes: 18,
  objectives: [
    'Create a C++ Actor class with Tools → New C++ Class',
    'Explain every line of the generated header: includes, `UCLASS()`, `MYGAME_API` and `GENERATED_BODY()`',
    'Explain why `MyActor.generated.h` must be the last include',
    'Describe what the constructor, `PrimaryActorTick.bCanEverTick`, `BeginPlay` and `Tick` do — and why the `Super::` calls matter',
    'Compile the class, place it in a level and create a Blueprint child from it',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Creating the class from the editor',
      blocks: [
        {
          type: 'p',
          text: 'Time to write real Unreal code. You could create two text files by hand, but the editor\'s wizard gets every detail right — file locations, includes, macros — and updates the project for you. With your C++ project open in the editor:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Open the wizard', text: 'Choose **Tools → New C++ Class…**.' },
            { title: 'Pick a parent class', text: 'Under *Common Classes*, select **Actor** — the base class for anything that can be placed in or spawned into a [[level]]. Click *Next*.' },
            { title: 'Name it', text: 'Type `MyActor`. Choose **Public** as the class type so the header goes in `Public/` and the source file in `Private/`. The dialog shows both paths.' },
            { title: 'Create', text: 'Click **Create Class**. The editor writes `MyActor.h` and `MyActor.cpp`, regenerates the project files and opens them in your IDE.' },
          ],
        },
        {
          type: 'p',
          text: 'Notice that you typed `MyActor` but the C++ class will be called `AMyActor`. The wizard adds the `A` prefix that Unreal requires for every class derived from [[actor|AActor]] — the naming lesson explains the whole prefix system.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Compiling a brand-new class',
          text: 'Depending on your settings the editor either compiles the new class straight away with Live Coding or tells you the module must be recompiled. A new class is a change Live Coding handles least reliably, so the dependable route is: **close the editor, build Development Editor in your IDE, relaunch.** Pressing F5 in the IDE builds and starts the editor with the debugger attached in one go.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Why an Actor?',
          text: 'An [[actor]] is an object that can exist in a level: it can have a location, components, and it receives gameplay callbacks such as `BeginPlay` and `Tick`. Lighter-weight data objects derive from `UObject` instead, and reusable behaviour attached to actors derives from `UActorComponent`. You will meet both later in the course.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The generated header, line by line',
      blocks: [
        {
          type: 'p',
          text: 'Here is the header the wizard writes. (The real file starts with a copyright comment and uses Epic\'s style — opening braces on their own line, tabs for indentation. It is compacted here to fit your screen.)',
        },
        {
          type: 'code',
          title: 'MyActor.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "MyActor.generated.h"

UCLASS()
class MYGAME_API AMyActor : public AActor {
    GENERATED_BODY()

public:
    // Sets default values for this actor's properties
    AMyActor();

protected:
    // Called when the game starts or when spawned
    virtual void BeginPlay() override;

public:
    // Called every frame
    virtual void Tick(float DeltaTime) override;
};`,
          annotations: [
            { lines: 1, text: 'The [[pragma-once]] include guard from the C++ course: this header is processed at most once per translation unit.' },
            { lines: 3, text: '[[core-minimal]] provides Unreal\'s basic types: `int32`, `FString`, `TArray`, `FVector`, logging and more.' },
            { lines: 4, text: 'The parent class must be a complete type to inherit from it, so its header is included rather than forward-declared.' },
            { lines: 5, text: 'The [[generated-header]] written by UnrealHeaderTool. It **must** be the last include — see the next card.' },
            { lines: 7, text: '[[uclass]] marks the class for UnrealHeaderTool, which generates its reflection data. The empty parentheses mean "no extra specifiers".' },
            { lines: 8, text: 'An ordinary C++ class with public inheritance from `AActor`. `MYGAME_API` exports it from the module\'s DLL.' },
            { lines: 9, text: '[[generated-body]] pastes in the code UHT generated for this class. It must be the first thing inside the class body.' },
            { lines: 13, text: 'The [[constructor]]. In Unreal it sets **default values**: it runs for every new instance, and also once at start-up to build the class\'s template object.' },
            { lines: 17, text: '`AActor::BeginPlay` is a protected [[virtual-function]]. `override` makes the compiler check that you are really overriding it, a habit from the C++ course.' },
            { lines: 21, text: 'Called every frame (if ticking is enabled) with `DeltaTime`, the seconds elapsed since the previous frame.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Access specifiers, as usual',
          text: 'Members of a `class` are private until an access specifier appears, which is why the template writes `public:` right after `GENERATED_BODY()`. Keeping `BeginPlay` protected matches the base class: subclasses may override it, but outside code shouldn\'t call it — the engine does.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'The four ingredients of an Unreal class',
      blocks: [
        {
          type: 'p',
          text: 'Four pieces turn an ordinary C++ class into one the engine, the editor and Blueprints can work with. Each one has a specific job:',
        },
        {
          type: 'table',
          headers: ['Piece', 'Read by', 'Job'],
          rows: [
            ['`#include "MyActor.generated.h"`', 'Compiler', 'Brings in the macro definitions UHT generated for this header'],
            ['`UCLASS()`', 'UnrealHeaderTool', 'Marks the class as reflected; specifiers inside tune its behaviour'],
            ['`MYGAME_API`', 'Compiler and linker', 'Exports the class from the module DLL so *other modules* can link to it'],
            ['`GENERATED_BODY()`', 'Compiler', 'Expands to generated declarations: `StaticClass()`, the `Super` and `ThisClass` aliases, helper constructors'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why must the .generated.h include come last?',
          text: '`GENERATED_BODY()` is defined by the engine to paste together an identifier for the **current file** and the **current line number**, producing the name of a macro that UHT defined in `MyActor.generated.h` specifically for this class. The generated header sets that "current file" identifier as it is included. If another reflected header were included after it, that header\'s own `.generated.h` would redefine the identifier, and your `GENERATED_BODY()` would expand to macros that don\'t exist. UHT prevents this by refusing to process a header where any `#include` follows the `.generated.h` one.',
        },
        {
          type: 'p',
          text: '`MYGAME_API` is the [[ue-api-macro|module API macro]]. In editor builds every module is its own DLL, and a class must be exported for code in a *different* DLL to call its functions. UnrealBuildTool defines the macro as `__declspec(dllexport)` while compiling `MyGame`, `__declspec(dllimport)` for modules that use it, and as nothing in monolithic game builds.',
        },
        {
          type: 'deepdive',
          title: 'What GENERATED_BODY() actually expands to',
          blocks: [
            {
              type: 'p',
              text: 'Open `Intermediate/Build/Win64/UnrealEditor/Inc/MyGame/UHT/MyActor.generated.h` after a build. You will find `#define CURRENT_FILE_ID` followed by macros with long names that encode the file path and a line number, along the lines of:',
            },
            {
              type: 'code',
              code: `// Illustrative — real names and contents vary by version
#undef CURRENT_FILE_ID
#define CURRENT_FILE_ID FID_MyGame_Source_MyGame_Public_MyActor_h

#define FID_MyGame_Source_MyGame_Public_MyActor_h_11_GENERATED_BODY \\
    /* StaticClass(), Super, ThisClass, constructors... */`,
              annotations: [
                { lines: '2-3', text: 'Each generated header redefines the "current file" id — the reason it must be included last.' },
                { lines: 5, text: 'The number is the line of `GENERATED_BODY()` in your header. Moving that line means UHT must regenerate, which it does automatically on the next build.' },
              ],
            },
            {
              type: 'p',
              text: 'The engine\'s definition of `GENERATED_BODY()` glues `CURRENT_FILE_ID`, `_`, `__LINE__` and `_GENERATED_BODY` together with the preprocessor\'s token-pasting operator, landing exactly on the macro above. It is a clever use of the [[preprocessor]] you studied in the C++ course.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'bug',
      prompt: 'This header fails before the compiler even starts, with an error from UnrealHeaderTool. Tap the line that causes it.',
      code: `#pragma once

#include "CoreMinimal.h"
#include "Pickup.generated.h"
#include "GameFramework/Actor.h"

UCLASS()
class MYGAME_API APickup : public AActor {
    GENERATED_BODY()

public:
    APickup();
};`,
      bugLines: [4],
      hint: 'There is one include whose position is strictly enforced.',
      explanation:
        'UHT reports that an `#include` was found after the `.generated.h` file, which must always be the **last** include in a header. The generated header sets up the per-file identifier that `GENERATED_BODY()` relies on; anything included afterwards could redefine it. The fix is to move `#include "Pickup.generated.h"` below `GameFramework/Actor.h`. (Line 5 is fine in itself — it just has to come first.)',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'The generated .cpp: constructor and ticking',
      blocks: [
        {
          type: 'code',
          title: 'MyActor.cpp',
          code: `#include "MyActor.h"

// Sets default values
AMyActor::AMyActor() {
    // Set this actor to call Tick() every frame. You can
    // turn this off to improve performance if you don't
    // need it.
    PrimaryActorTick.bCanEverTick = true;
}

// Called when the game starts or when spawned
void AMyActor::BeginPlay() {
    Super::BeginPlay();
}

// Called every frame
void AMyActor::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);
}`,
          annotations: [
            { lines: 1, text: 'A source file includes its own header first. This also proves the header is self-contained — it compiles with nothing included before it. The path works because `Public/` is on the module\'s include path.' },
            { lines: 4, text: 'The constructor sets defaults. Don\'t put gameplay logic here: it also runs when the engine builds the class\'s template object at start-up, when no game world exists.' },
            { lines: 8, text: '`PrimaryActorTick` is the actor\'s main tick function (a member inherited from `AActor`). `bCanEverTick = true` allows the engine to register it, so `Tick` gets called every frame.' },
            { lines: 13, text: 'Run the parent class\'s `BeginPlay` first. Next card: why skipping it breaks things.' },
            { lines: 18, text: 'Same for `Tick`: let `AActor` do its per-frame work, then add yours.' },
          ],
        },
        {
          type: 'definition',
          term: 'Class Default Object (CDO)',
          text: 'For every `UCLASS`, the engine constructs one special instance at start-up — the [[cdo|Class Default Object]] — by running your constructor. It holds the class\'s default values. Blueprint subclasses and newly spawned actors start from a copy of these defaults, which is why the constructor is the place to *set defaults* and not to *do things*.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Tick is not free',
          text: 'Every ticking actor costs a function call through the engine\'s tick system every frame, even if `Tick` is empty. With thousands of actors that adds up. If your actor doesn\'t need per-frame updates, set `PrimaryActorTick.bCanEverTick = false;` (and delete the `Tick` override). A later lesson covers timers and events as alternatives.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Can tick, but not yet',
          text: '`bCanEverTick` decides whether ticking is *possible* at all. To allow it but start switched off, also set `PrimaryActorTick.bStartWithTickEnabled = false;` and call `SetActorTickEnabled(true)` when the actor needs to wake up.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'An Actor\'s C++ constructor only runs when the actor is spawned into a level during gameplay, so it is a good place to look up other actors in the world.',
      answer: false,
      explanation:
        'The constructor also runs at engine start-up to build the Class Default Object, while loading levels, and in the editor — often when no game world exists. It should only set default values (and, as you will learn, create components). Logic that depends on the world, such as finding other actors, belongs in `BeginPlay`.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'BeginPlay, Tick, and why Super:: matters',
      blocks: [
        {
          type: 'p',
          text: 'Recall from the C++ course: when a derived class overrides a [[virtual-function]], the base version does **not** run automatically. The override replaces it. If you want the base behaviour too, you must call it yourself. In standard C++ you would write `AActor::BeginPlay();`. Unreal gives you a shorthand: [[ue-super|Super]], an alias for the parent class that `GENERATED_BODY()` defines in every reflected class.',
        },
        {
          type: 'p',
          text: 'The base versions do real work, so skipping them causes strange bugs:',
        },
        {
          type: 'table',
          headers: ['Call', 'What the AActor version does'],
          rows: [
            ['`Super::BeginPlay()`', 'Registers the actor\'s tick function, calls `BeginPlay` on its components, fires the Blueprint **Event BeginPlay**, and marks the actor as having begun play'],
            ['`Super::Tick(DeltaTime)`', 'Fires the Blueprint **Event Tick** and updates latent actions such as Blueprint **Delay** nodes'],
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Forgot Super',
            tone: 'bad',
            code: `void AMyActor::BeginPlay() {
    StartPatrol();
    // components never begin play,
    // Blueprint Event BeginPlay never
    // fires, Tick is never registered
}`,
          },
          right: {
            title: 'Calls Super first',
            tone: 'good',
            code: `void AMyActor::BeginPlay() {
    Super::BeginPlay();
    StartPatrol();
}`,
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why an alias instead of writing AActor:: directly?',
          text: 'Both compile. But class hierarchies change: if you later re-parent `AMyActor` to derive from `APawn`, every hard-coded `AActor::BeginPlay()` would silently skip `APawn`\'s version. `Super` always means "my direct parent", so it stays correct. Java and C# have `super`/`base` keywords; C++ doesn\'t, so Unreal generates the alias for you.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Order of the Super call',
          text: 'For "start-up" functions such as `BeginPlay`, call `Super` **first** so the parent is fully set up before your code runs. For "tear-down" functions such as `EndPlay`, call it **last**, so your cleanup happens before the parent dismantles things you might still use.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'A designer creates a Blueprint child of `AMyActor` and adds logic to **Event BeginPlay**, but it never runs. `AMyActor::BeginPlay` contains only `InitializeLoot();`. What is the most likely cause?',
      options: [
        {
          text: '`AMyActor::BeginPlay` doesn\'t call `Super::BeginPlay()`',
          correct: true,
          why: '`AActor::BeginPlay` is what fires the Blueprint Event BeginPlay. Without the `Super` call, that chain is cut.',
        },
        {
          text: '`BeginPlay` is `protected`, so Blueprints cannot override it',
          why: 'The Blueprint event is a separate function (`ReceiveBeginPlay`) that `AActor::BeginPlay` calls. Access level of the C++ function isn\'t the problem.',
        },
        {
          text: 'Blueprints never receive BeginPlay for classes defined in C++',
          why: 'Blueprint children of C++ classes receive Event BeginPlay all the time — as long as the C++ chain reaches `AActor::BeginPlay`.',
        },
        {
          text: '`PrimaryActorTick.bCanEverTick` is `true`',
          why: 'Ticking settings affect `Tick`, not whether BeginPlay runs.',
        },
      ],
      explanation:
        'Overriding a virtual function replaces the base version entirely. `AActor::BeginPlay` is responsible for beginning play on components, registering tick functions and triggering the Blueprint event, so every override must call `Super::BeginPlay()`. This is one of the most common bugs in a first Unreal project.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'fill',
      prompt: 'Complete this minimal Actor so that it is reflected, overrides `BeginPlay` correctly and keeps the parent\'s behaviour.',
      template: `#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Torch.generated.h"

___()
class MYGAME_API ATorch : public AActor {
    ___()

protected:
    virtual void BeginPlay() ___;
};

// Torch.cpp
void ATorch::BeginPlay() {
    ___::BeginPlay();
}`,
      blanks: [
        { answers: ['UCLASS'] },
        { answers: ['GENERATED_BODY'] },
        { answers: ['override'] },
        { answers: ['Super', 'AActor'] },
      ],
      wordBank: ['UCLASS', 'GENERATED_BODY', 'override', 'Super', 'USTRUCT', 'final', 'base', 'this'],
      explanation:
        '`UCLASS()` marks the class for UnrealHeaderTool and `GENERATED_BODY()` pulls in the generated declarations. `override` asks the compiler to verify that the signature really matches the base function. `Super::BeginPlay()` runs `AActor`\'s version; `AActor::BeginPlay()` would also work, but `Super` survives a change of parent class. `base` is the C# keyword — C++ has no equivalent, which is exactly why Unreal generates `Super`.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Make it do something',
      blocks: [
        {
          type: 'p',
          text: 'An empty actor is hard to admire. Let\'s make it spin at a speed designers can tune, and announce itself in the log when play begins. First, the header gains a property:',
        },
        {
          type: 'code',
          title: 'MyActor.h (additions)',
          code: `protected:
    virtual void BeginPlay() override;

    // How fast to spin, in degrees per second.
    UPROPERTY(EditAnywhere, Category = "Spin")
    float DegreesPerSecond = 90.f;`,
          annotations: [
            { lines: 5, text: '[[uproperty]] exposes the member to the reflection system. [[edit-anywhere]] makes it editable in the editor, both on Blueprint defaults and on each placed instance. `Category` groups it in the Details panel.' },
            { lines: 6, text: 'A default member initializer from the C++ course. This becomes the value stored in the Class Default Object.' },
          ],
        },
        {
          type: 'code',
          title: 'MyActor.cpp (changes)',
          code: `void AMyActor::BeginPlay() {
    Super::BeginPlay();
    UE_LOG(LogTemp, Display, TEXT("%s has begun play"),
        *GetName());
}

void AMyActor::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);
    const float Yaw = DegreesPerSecond * DeltaTime;
    AddActorLocalRotation(FRotator(0.0, Yaw, 0.0));
}`,
          annotations: [
            { lines: '3-4', text: '[[ue-log]] writes to the Output Log — Unreal\'s replacement for `std::cout`. `GetName()` returns this object\'s name as an `FString`; the `*` turns it into the C-style string `%s` expects. The logging lesson explains every piece.' },
            { lines: 9, text: 'Degrees per second × seconds this frame = degrees to turn this frame. Multiplying by [[delta-time]] makes the speed independent of frame rate.' },
            { lines: 10, text: '`FRotator` takes (Pitch, Yaw, Roll) in degrees; yaw spins around the vertical axis. `AddActorLocalRotation` rotates the actor\'s **root component** — see the warning below.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'No components, no transform',
          text: 'An actor\'s location and rotation belong to its **root component**. `AMyActor` has no components yet, so on its own it has nothing to rotate and nothing to render. You will create components in C++ in a later lesson; for now, the Blueprint child in the next card will supply a mesh.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'This change needs a restart',
          text: 'You added a `UPROPERTY` to a header, which changes both the class layout and its reflection data. That is beyond what Live Coding can patch, so close the editor, build, and relaunch.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: 'A teammate writes `AddActorLocalRotation(FRotator(0.0, 2.0, 0.0));` in `Tick` "to spin 2 degrees". What will players notice?',
      options: [
        {
          text: 'It spins at exactly 2 degrees per second on every machine',
          why: 'Nothing here mentions seconds. The code adds 2 degrees **per call**, and `Tick` is called once per frame.',
        },
        {
          text: 'It spins faster on high-frame-rate machines and slower on low ones',
          correct: true,
          why: 'At 120 FPS it turns 240°/s; at 30 FPS only 60°/s. Multiplying by `DeltaTime` would make it 2°/s everywhere.',
        },
        {
          text: 'It doesn\'t compile: `FRotator` requires float arguments',
          why: 'In UE5 `FRotator` stores doubles, and `0.0`/`2.0` are double literals. It compiles fine.',
        },
        {
          text: 'It rotates once and then stops',
          why: '`Tick` runs every frame, so the rotation accumulates continuously.',
        },
      ],
      explanation:
        '`Tick` runs once per frame, and frame times vary between machines and from moment to moment. Any per-frame change that should represent a rate (degrees per second, units per second) must be scaled by `DeltaTime`, the seconds since the previous frame. The Tick lesson explores this in depth.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Compile, place, and extend with a Blueprint',
      blocks: [
        {
          type: 'p',
          text: 'With the code built and the editor relaunched, your class appears in the **Content Browser** under *C++ Classes → MyGame → Public*. You could drag `MyActor` straight into the level: it would exist (you can find it in the **Outliner**), log its message when you press Play — and show nothing, because it has no components.',
        },
        {
          type: 'p',
          text: 'Instead, follow the workflow from the first lesson of this unit — C++ for behaviour, a Blueprint child for content:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Create the Blueprint child', text: 'Right-click `MyActor` in the Content Browser and choose **Create Blueprint class based on MyActor**. Name it `BP_SpinningCrate` and save it in `Content/Blueprints`.' },
            { title: 'Give it a mesh', text: 'In the Blueprint editor, click **Add** in the Components panel and add a **Static Mesh** component. Pick a cube mesh in the Details panel. The Blueprint now has a root component for your C++ code to rotate.' },
            { title: 'Tune it', text: 'Click **Class Defaults**. Under the *Spin* category you will see `Degrees Per Second` — your C++ property, displayed with spaces. Set it to 45, then compile and save the Blueprint.' },
            { title: 'Place and play', text: 'Drag `BP_SpinningCrate` into the level and press **Play**. The cube spins at 45°/s, and the Output Log (*Window → Output Log*) shows a line ending in `has begun play`, starting with the actor\'s internal name (something beginning `BP_SpinningCrate_C_`).' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just hard-code the cube in C++?',
          text: 'You could create the mesh component in C++ and still let the Blueprint choose *which* mesh. But the asset itself should stay a Blueprint decision: artists can swap it, designers can make ten variants with different meshes and speeds, and your C++ never contains asset paths that break when files move. One C++ class, many Blueprint children — that is the pattern you will use for the rest of the course.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Per-instance tweaks',
          text: 'Because the property is `EditAnywhere`, you can also select one placed crate in the level and change its speed in the Details panel, without affecting the others.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'order',
      prompt: 'Put the steps in order to go from nothing to a spinning crate in your level.',
      lines: [
        'Choose Tools → New C++ Class and pick Actor as the parent',
        'Name it MyActor and click Create Class',
        'Close the editor, build Development Editor in the IDE, relaunch',
        'Right-click MyActor and create BP_SpinningCrate from it',
        'Add a Static Mesh component in BP_SpinningCrate and drag it into the level',
      ],
      distractors: ['Edit MyActor.generated.h to register the new class'],
      linesAreCode: false,
      explanation:
        'The class must exist and be compiled before the editor can show it, and a Blueprint child can only be created from a class the editor knows about. The distractor is a trap: `.generated.h` files are written by UnrealHeaderTool on every build — any manual edit is overwritten, and registration happens automatically.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'You remove `MYGAME_API` from `class MYGAME_API AMyActor`. Your project has only the `MyGame` module. What happens?',
      options: [
        {
          text: 'UnrealHeaderTool refuses to generate code for the class',
          why: 'The export macro is optional as far as UHT is concerned; it generates reflection code either way.',
        },
        {
          text: 'Blueprints can no longer inherit from `AMyActor`',
          why: 'Blueprints find classes through reflection data that the module registers itself when it loads. No cross-DLL linking is involved.',
        },
        {
          text: 'Everything still works — until code in **another** module tries to call `AMyActor`\'s functions, which then fails to link in editor builds',
          correct: true,
          why: 'Export macros only matter across DLL boundaries. Inside `MyGame` the symbols are visible anyway; a second module would hit unresolved externals.',
        },
        {
          text: 'The packaged game crashes at start-up',
          why: 'In monolithic game builds the macro expands to nothing, so removing it changes nothing there.',
        },
      ],
      explanation:
        '`MYGAME_API` expands to `__declspec(dllexport)`/`dllimport` in modular editor builds, and to nothing in monolithic builds. It exists so that *other* modules can link against your class. The wizard adds it by default because projects tend to grow more modules, and it costs nothing to keep.',
    },
  ],
  takeaways: [
    'Create classes with Tools → New C++ Class: the wizard writes correct boilerplate, adds the `A` prefix for actors and updates the project.',
    'A reflected class needs `UCLASS()`, `GENERATED_BODY()` and its `.generated.h` as the **last** include; `MYGAME_API` exports it for other modules.',
    'The constructor sets defaults and also runs to build the Class Default Object — keep gameplay logic in `BeginPlay`.',
    '`PrimaryActorTick.bCanEverTick` decides whether `Tick` can run at all; turn it off when you don\'t need per-frame updates.',
    'Overrides replace the base version, so call `Super::BeginPlay()` and `Super::Tick(DeltaTime)` — the parent fires Blueprint events, registers ticking and begins play on components.',
    'Scale per-frame changes by `DeltaTime` to make them frame-rate independent.',
    'C++ provides behaviour and tunable `UPROPERTY`s; a Blueprint child adds meshes and values, and is what you place in the level.',
  ],
  reading: [
    {
      title: 'Programming with C++ in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/programming-with-cplusplus-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Links to the official C++ quick start, which builds a similar first actor.',
    },
    {
      title: 'Unreal Engine UProperties',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-uproperties',
      source: 'unreal-docs',
      note: 'A preview of the property specifiers such as `EditAnywhere` that you used here.',
    },
    {
      title: 'Virtual function specifier',
      url: 'https://en.cppreference.com/w/cpp/language/virtual',
      source: 'cppreference',
      note: 'The standard C++ rules behind overriding `BeginPlay` and calling the base version explicitly.',
    },
  ],
};
