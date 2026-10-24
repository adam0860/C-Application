import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-debug-drawing',
  title: 'Visual Debugging Tools',
  summary:
    'Draw what your code is thinking: debug shapes, the Visual Logger, console commands, custom cvars and cheats.',
  minutes: 18,
  objectives: [
    'Draw debug lines, spheres, boxes, arrows and text with `DrawDebugHelpers.h`',
    'Control how long debug shapes live, and clean up persistent ones',
    'Record and scrub gameplay decisions with the Visual Logger (`UE_VLOG`, `UE_VLOG_SEGMENT`)',
    'Use everyday console commands such as `stat unit`, `show collision` and `slomo`',
    'Add your own debug switches with `TAutoConsoleVariable`, `Exec` functions and a CheatManager',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Games are spatial — so debug them spatially',
      blocks: [
        {
          type: 'p',
          text: 'A log line such as `Trace hit at X=1203.4 Y=-88.1 Z=40.0` tells you almost nothing. A red line from the gun to a yellow sphere on the wall tells you everything in a glance: the trace started in the wrong place, or hit the player\'s own capsule, or stopped short. Most gameplay bugs are about *where* and *when*, and Unreal gives you tools that answer those questions visually.',
        },
        {
          type: 'table',
          headers: ['Tool', 'Best for', 'In Shipping?'],
          rows: [
            ['[[draw-debug|DrawDebug helpers]]', 'Seeing traces, ranges and positions *right now*', 'No — calls become empty'],
            ['[[visual-logger|Visual Logger]]', 'Recording decisions per actor and scrubbing back in time', 'No'],
            ['Built-in [[console-command|console commands]]', 'Engine views and stats (`stat unit`, `show collision`)', 'Console disabled by default'],
            ['Your own [[console-variable|CVars]] and [[exec-function|Exec functions]]', 'Toggling *your* debug features at run time', 'Cheat-flagged ones: no'],
            ['[[gameplay-debugger]] and [[cheat-manager|CheatManager]]', 'Inspecting AI and other systems live; test cheats', 'No (by default)'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just use breakpoints?',
          text: 'A [[breakpoint]] freezes the whole game, which destroys exactly what you want to observe: physics, timing, AI reacting to a moving player, network traffic. Visual tools let the game keep running at full speed while you watch. Use the debugger for "why is this variable wrong?" and visual tools for "what is the game actually doing?" — you will reach for both constantly.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'DrawDebugLine and friends',
      blocks: [
        {
          type: 'p',
          text: 'The helpers live in `DrawDebugHelpers.h`. Each takes the [[world]] to draw into, the geometry, a colour, and then optional lifetime, depth and thickness arguments. Here a turret visualizes its aiming [[line-trace|line trace]]:',
        },
        {
          type: 'code',
          title: 'Turret.cpp',
          code: `#include "Turret.h"
#include "DrawDebugHelpers.h"

void ATurret::DrawAimDebug(const FVector& Start,
    const FVector& End, const FHitResult& Hit)
{
    const UWorld* World = GetWorld();
    const FVector LineEnd =
        Hit.bBlockingHit ? Hit.ImpactPoint : End;

    // The ray: green if clear, red if blocked (1 frame)
    DrawDebugLine(World, Start, LineEnd,
        Hit.bBlockingHit ? FColor::Red : FColor::Green,
        false, -1.f, 0, 1.5f);

    if (Hit.bBlockingHit)
    {
        // Impact point and surface normal, kept for 2 s
        DrawDebugSphere(World, Hit.ImpactPoint, 12.f, 12,
            FColor::Yellow, false, 2.f);
        DrawDebugDirectionalArrow(World, Hit.ImpactPoint,
            Hit.ImpactPoint + Hit.ImpactNormal * 60.f,
            20.f, FColor::Cyan, false, 2.f);
    }

    // The engagement volume (Extent is the HALF size)
    DrawDebugBox(World, GetActorLocation(),
        FVector(AttackRange), FColor::Orange);

    // Text that follows this actor, shown for 0.5 s
    DrawDebugString(World, FVector(0.f, 0.f, 120.f),
        TEXT("Tracking"), this, FColor::White, 0.5f);
}`,
          annotations: [
            { lines: 2, text: 'Include it in the `.cpp`, not the header — only the implementation needs it (you will see why this matters in the coding-standard lesson).' },
            { lines: '12-14', text: 'Arguments after the colour: `bPersistentLines = false`, `LifeTime = -1` (one frame), `DepthPriority = 0` (hidden behind walls), `Thickness = 1.5` (0 means a hairline).' },
            { lines: '19-20', text: 'Sphere: centre, radius, number of segments (more segments look smoother but cost more), colour, persistence, lifetime.' },
            { lines: '21-23', text: 'A directional arrow from start to end; `20.f` is the arrowhead size. Visualizing `ImpactNormal` is the fastest way to debug ricochets and decals facing the wrong way.' },
            { lines: '27-28', text: 'Boxes take a centre and an **extent**, which is half the size along each axis — the same convention as collision boxes.' },
            { lines: '31-32', text: 'Passing `this` as the base actor makes the location *relative* to the actor, so the label follows it. Text is drawn by the local player\'s HUD, so it appears in game and PIE viewports.' },
          ],
        },
        {
          type: 'table',
          headers: ['Function', 'Key arguments after the world'],
          rows: [
            ['`DrawDebugLine`', 'Start, End, Color'],
            ['`DrawDebugPoint`', 'Position, Size (pixels), Color'],
            ['`DrawDebugDirectionalArrow`', 'Start, End, ArrowSize, Color'],
            ['`DrawDebugSphere`', 'Center, Radius, Segments, Color'],
            ['`DrawDebugBox`', 'Center, Extent (half size), [Rotation], Color'],
            ['`DrawDebugCapsule`', 'Center, HalfHeight, Radius, Rotation, Color'],
            ['`DrawDebugString`', 'Location, Text, [BaseActor, Color, Duration]'],
          ],
          caption: 'The common shapes. All but the string take optional bPersistentLines, LifeTime, DepthPriority and (mostly) Thickness at the end.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Blueprint has the same tools',
          text: 'Nodes such as **Draw Debug Line** and **Draw Debug Sphere** call the same engine code (through `UKismetSystemLibrary`). Trace nodes even have a built-in *Draw Debug Type* option. So a designer can debug a Blueprint the same way you debug C++.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'You add this single line to `BeginPlay`, press Play, and see nothing. What most likely happened?',
      code: `DrawDebugLine(GetWorld(), GetActorLocation(),
    GetActorLocation() + FVector(0.f, 0.f, 500.f),
    FColor::Red);`,
      options: [
        {
          text: 'Debug drawing only works inside `Tick`',
          why: 'You can draw from anywhere — BeginPlay, overlap events, timers. The issue is how long the line lives, not where it was drawn from.',
        },
        {
          text: 'With the default arguments the line lives for a single frame, so it vanished almost instantly',
          correct: true,
          why: 'Right. `bPersistentLines = false` and `LifeTime = -1` mean "this frame only" — designed for code that redraws every Tick. For a one-off event, pass a lifetime such as `5.f`, or `true` for persistent.',
        },
        {
          text: 'Debug drawing is compiled out of editor builds',
          why: 'It is the other way round: the helpers work in the editor and development builds and become empty functions in Shipping.',
        },
        {
          text: '`GetWorld()` returns null in `BeginPlay`',
          why: 'By BeginPlay the actor is fully in a world; `GetWorld()` is valid. (It *is* null for the CDO in the constructor — a different trap.)',
        },
      ],
      explanation:
        'Debug shapes have three lifetimes: one frame (the default, for per-frame code), a number of seconds (`LifeTime > 0`), or persistent until flushed (`bPersistentLines = true`). Matching the lifetime to where you draw from is the first thing to check when a debug shape seems to be missing.',
    },
    {
      kind: 'concept',
      title: 'Lifetime, depth and Shipping',
      blocks: [
        {
          type: 'table',
          headers: ['Arguments', 'Lives for', 'Use from'],
          rows: [
            ['`bPersistentLines = false`, `LifeTime <= 0` (default)', 'One frame', 'Tick: redraw every frame so it follows moving things'],
            ['`bPersistentLines = false`, `LifeTime = 3.f`', '3 seconds', 'One-off events: a shot, an explosion radius, a hit'],
            ['`bPersistentLines = true`', 'Until `FlushPersistentDebugLines(World)` or the world ends', 'Static information: a computed path, spawn points'],
          ],
        },
        {
          type: 'p',
          text: '**DepthPriority** decides occlusion: `0` draws in the world, so walls hide the shape; `1` draws in the foreground, on top of everything — handy for seeing a trace that went *through* a wall. `FlushDebugStrings(World)` clears lingering text the way `FlushPersistentDebugLines` clears shapes.',
        },
        {
          type: 'p',
          text: 'Debug shapes are drawn into the world you pass. On a [[dedicated-server|dedicated server]] nobody is watching that world, and in a multiplayer PIE session the server and each client have separate worlds — so draw on the machine whose behaviour you are investigating.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Empty in Shipping — but arguments still run',
          text: 'In Shipping, `ENABLE_DRAW_DEBUG` is 0 and every helper becomes an empty inline function. The *call* disappears, but C++ still evaluates the arguments before calling a function, and the optimizer can only drop work it can prove has no side effects. An `FString::Printf` that allocates, or a loop that computes points to draw, may survive. Wrap debug-only work in `#if ENABLE_DRAW_DEBUG`.',
        },
        {
          type: 'code',
          title: 'Turret.cpp',
          code: `void ATurret::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    UpdateAim(DeltaSeconds);

#if ENABLE_DRAW_DEBUG
    if (bDrawDebug)
    {
        // Built only in builds that can actually show it
        const FString Label = FString::Printf(
            TEXT("%s  %.0f cm"), *TargetName, TargetDistance);
        DrawDebugString(GetWorld(), FVector(0.f, 0.f, 140.f),
            Label, this, FColor::White, 0.f);
    }
#endif
}`,
          annotations: [
            { lines: 6, text: '`ENABLE_DRAW_DEBUG` is defined by the engine: 1 in editor and development builds, 0 in Shipping (and Test). Everything up to `#endif` vanishes there.' },
            { lines: 7, text: '`bDrawDebug` could be an `EditAnywhere` UPROPERTY so you can enable it per turret in the Details panel — or a console variable, as you will see shortly.' },
          ],
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Because the DrawDebug helpers are empty functions in Shipping, passing `FString::Printf(...)` as an argument to `DrawDebugString` costs nothing in a Shipping build.',
      answer: false,
      explanation:
        'Function arguments are evaluated before the call, even when the function body is empty. The optimizer may remove pure computations, but string formatting allocates memory, which it generally cannot prove is safe to drop. Guard debug-only work with `#if ENABLE_DRAW_DEBUG` so it is not compiled into Shipping at all.',
    },
    {
      kind: 'concept',
      title: 'The Visual Logger: a flight recorder for gameplay',
      blocks: [
        {
          type: 'p',
          text: 'DrawDebug shows the *present*. But the interesting bug often happened three minutes ago, for a single frame: a guard chose the wrong target and you only noticed afterwards. The Visual Logger records text *and* shapes per actor, per frame, and lets you scrub back and forth through the recording, seeing exactly what each actor logged and drew at that moment.',
        },
        {
          type: 'code',
          title: 'GuardAIController.cpp',
          code: `#include "GuardAIController.h"
#include "VisualLogger/VisualLogger.h"

void AGuardAIController::ChooseTarget()
{
    float BestScore = 0.f;
    AActor* Best = FindBestTarget(BestScore);

    UE_VLOG(this, LogMyGameAI, Log,
        TEXT("Chose %s (score %.2f) from %d candidates"),
        *GetNameSafe(Best), BestScore, Candidates.Num());

    if (Best && GetPawn())
    {
        UE_VLOG_SEGMENT(this, LogMyGameAI, Log,
            GetPawn()->GetActorLocation(),
            Best->GetActorLocation(),
            FColor::Red, TEXT("Target line"));
    }

    SetFocus(Best);
}`,
          annotations: [
            { lines: 2, text: 'The macros live in this header.' },
            { lines: '9-11', text: '`UE_VLOG(Owner, Category, Verbosity, Format, ...)`. The owner decides which row of the recording the entry appears in. `LogMyGameAI` is a normal log category, declared and defined as in the logging lesson (`LogTemp` works too).' },
            { lines: '15-18', text: '`UE_VLOG_SEGMENT` records a line between two points, with a colour and a label. Siblings such as `UE_VLOG_LOCATION`, `UE_VLOG_BOX` and `UE_VLOG_ARROW` record other shapes.' },
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'Open it', text: 'In the editor choose **Tools → Debug → Visual Logger**.' },
            { title: 'Record', text: 'Press **Record** in the Visual Logger window, then play. Every actor that logs gets its own row on a timeline.' },
            { title: 'Scrub', text: 'Stop, then drag along the timeline. The text for the selected frame appears in a list, and the recorded shapes are drawn in the level viewport.' },
            { title: 'Share', text: 'Save the recording to a file and attach it to a bug report — a colleague can scrub through exactly what you saw.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a separate logger?',
          text: 'Normal logs are one global stream of text: thousands of lines from hundreds of actors, with no geometry. The Visual Logger organizes entries *by owner* and *by frame* and keeps shapes alongside the text, which is exactly the shape of an AI or gameplay question: "what did this guard know, and where was everything, when it decided?" The macros check whether recording is active before doing any work, and the whole system is compiled out of Shipping.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'During a playtest, a guard occasionally runs towards the wrong player. The decision is made in a single frame and is usually noticed only seconds later. Which tool fits best?',
      options: [
        {
          text: 'A breakpoint in `ChooseTarget()`',
          why: 'The function runs constantly and is usually right, so you would stop thousands of times. And freezing the game changes the timing you are trying to observe.',
        },
        {
          text: '`DrawDebugLine` to the chosen target with a 10-second lifetime',
          why: 'Helpful, but the screen fills with overlapping lines from every decision, and you lose the *reasons* (scores, candidates) behind each one.',
        },
        {
          text: '`stat unit`',
          why: '`stat unit` shows where frame time goes (game thread, render thread, GPU). It says nothing about AI decisions.',
        },
        {
          text: 'The Visual Logger with `UE_VLOG` and `UE_VLOG_SEGMENT`',
          correct: true,
          why: 'It records the guard\'s reasoning and a line to its choice on every frame, so after the playtest you can scrub to the bad decision and read the scores that caused it.',
        },
      ],
      explanation:
        'Rare, fast, after-the-fact problems need a recording, not a live view. The Visual Logger captures per-actor text and geometry for every frame while recording, so you can step to the exact frame of the bad decision and see both the inputs and the result.',
    },
    {
      kind: 'concept',
      title: 'Console commands you will use every day',
      blocks: [
        {
          type: 'p',
          text: 'Press the backtick key during play (the key left of `1`, usually labelled `~` on US keyboards) to open the console. It autocompletes as you type. These commands need no code at all:',
        },
        {
          type: 'table',
          headers: ['Command', 'What it does'],
          rows: [
            ['`stat fps`', 'Frames per second and frame time in the corner'],
            ['`stat unit`', 'Milliseconds for **Frame**, **Game** (game thread: your Tick, Blueprints), **Draw** (render thread) and **GPU**'],
            ['`stat unitgraph`', 'The same numbers as a scrolling graph — great for spotting hitches'],
            ['`stat none`', 'Hides all stat displays'],
            ['`show collision`', 'Toggles drawing of collision shapes — instantly reveals oversized capsules and missing colliders'],
            ['`slomo 0.25`', 'Runs the world at quarter speed ([[time-dilation]]); `slomo 1` restores it'],
            ['`t.MaxFPS 30`', 'Caps the frame rate: a quick test for frame-rate-dependent code'],
            ['`pause`', 'Pauses and unpauses the game'],
            ['`ToggleDebugCamera`', 'Detaches a free-flying camera while the game keeps running'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Read stat unit like a detective',
          text: 'The frame takes as long as the slowest of Game, Draw and GPU (they work in parallel on different frames). If **Game** is the largest number, your gameplay code — ticks, traces, Blueprint logic — is the bottleneck, and optimizing materials will not help. If **GPU** is largest, the opposite is true. Measure before you optimize; for detail, record a trace in [[unreal-insights]].',
        },
        {
          type: 'p',
          text: '`slomo` and `ToggleDebugCamera` are *cheat* commands provided by the CheatManager, so they are available in PIE and development builds but not in a Shipping build. The console itself is normally disabled in Shipping too.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Fill in the console commands.',
      template:
        'To find out whether gameplay code or rendering is the bottleneck, type `stat ___`. To watch a fast explosion at quarter speed, type `___ 0.25`. To check whether a door\'s collider matches its mesh, type `show ___`.',
      templateIsCode: false,
      blanks: [{ answers: ['unit'] }, { answers: ['slomo'] }, { answers: ['collision'] }],
      wordBank: ['unit', 'slomo', 'collision', 'fps', 'pause', 'bounds', 'gc'],
      explanation:
        '`stat unit` splits the frame into Game, Draw and GPU times, which `stat fps` cannot do. `slomo` sets global time dilation, slowing ticks, timers and physics alike. `show collision` draws the actual collision geometry, which is often very different from the visible mesh.',
    },
    {
      kind: 'concept',
      title: 'Your own switches: console variables, Exec functions and cheats',
      blocks: [
        {
          type: 'p',
          text: 'Hard-coding `bDrawDebug = true` and recompiling does not scale. A [[console-variable]] gives your feature a named switch you can flip at run time — in PIE, in a development build on a console or phone, or from the command line (`-ExecCmds="MyGame.Turret.Debug 2"`).',
        },
        {
          type: 'code',
          title: 'Turret.cpp',
          code: `// File scope, in exactly ONE .cpp file.
static TAutoConsoleVariable<int32> CVarTurretDebug(
    TEXT("MyGame.Turret.Debug"),
    0,
    TEXT("Turret debug drawing.\\n")
    TEXT(" 0: off\\n")
    TEXT(" 1: aim traces\\n")
    TEXT(" 2: aim traces + engagement range"),
    ECVF_Cheat);

void ATurret::DrawDebugIfEnabled()
{
#if ENABLE_DRAW_DEBUG
    const int32 Level = CVarTurretDebug.GetValueOnGameThread();
    if (Level >= 1) { DrawAimTrace(); }
    if (Level >= 2) { DrawEngagementRange(); }
#endif
}`,
          annotations: [
            { lines: 2, text: '`static` at file scope: the object is constructed when the module loads and registers the name with the console manager. Never put this in a header — every file including it would try to register the same name again.' },
            { lines: 3, text: 'Prefix names with your project (`MyGame.`) so they cannot collide with engine variables such as `r.` (rendering) or `t.` (time).' },
            { lines: '5-8', text: 'Help text, shown when you type `MyGame.Turret.Debug ?`. Adjacent `TEXT()` literals are joined by the compiler.' },
            { lines: 9, text: '`ECVF_Cheat` marks it as a debug cheat, unavailable in Shipping builds.' },
            { lines: 14, text: 'Typing `MyGame.Turret.Debug 2` sets the value; `GetValueOnGameThread()` reads it. (`FAutoConsoleVariableRef` binds a cvar to an existing `static bool` or `float` instead.)' },
          ],
        },
        {
          type: 'p',
          text: 'For *actions* rather than settings, mark a function `UFUNCTION(Exec)` and type its name with arguments. The cleanest home for debug actions is your own [[cheat-manager|CheatManager]], which the engine creates for you in development builds:',
        },
        {
          type: 'code',
          title: 'MyCheatManager.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/CheatManager.h"
#include "MyCheatManager.generated.h"

UCLASS()
class MYGAME_API UMyCheatManager : public UCheatManager
{
    GENERATED_BODY()

public:
    // Console: GiveAmmo 50
    UFUNCTION(Exec)
    void GiveAmmo(int32 Amount);

    // Console: DamageSelf 25
    UFUNCTION(Exec)
    void DamageSelf(float Amount);
};`,
          annotations: [
            { lines: '14-15', text: 'Console arguments are parsed into the parameters by reflection, so `GiveAmmo 50` calls `GiveAmmo(50)`. Inside, `GetOuterAPlayerController()` gives you the owning PlayerController.' },
          ],
        },
        {
          type: 'code',
          title: 'MyPlayerController.cpp',
          code: `AMyPlayerController::AMyPlayerController()
{
    // Tell the controller which CheatManager to create
    CheatClass = UMyCheatManager::StaticClass();
}`,
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Exec only works in a few classes',
          text: 'The console searches a fixed list of objects: the local PlayerController, its possessed Pawn, its HUD, its CheatManager, the GameMode, the GameInstance and PlayerInput. `UFUNCTION(Exec)` on any other actor or component compiles fine and is simply never found. Exec functions also run only on the local machine — a cheat that must change server state has to call a Server RPC.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'A programmer adds this to test wave spawning. It compiles, but typing `SpawnWave 3` in the console does nothing. Tap the line that explains why.',
      code: `UCLASS()
class MYGAME_API AEnemySpawner : public AActor
{
    GENERATED_BODY()

public:
    // Type "SpawnWave 3" in the console to test
    UFUNCTION(Exec)
    void SpawnWave(int32 WaveIndex);

protected:
    UPROPERTY(EditAnywhere, Category = "Spawning")
    TArray<TSubclassOf<AActor>> EnemyClasses;
};`,
      bugLines: [8],
      hint: 'Which objects does the console search for Exec functions?',
      explanation:
        '`Exec` is only honoured on the PlayerController, possessed Pawn, HUD, CheatManager, GameMode, GameInstance and PlayerInput. A level actor like `AEnemySpawner` is never searched, so the command is silently ignored. Move the command to your CheatManager (or PlayerController) and have it find the spawner — for example with `TActorIterator<AEnemySpawner>` — then call `SpawnWave` on it.',
    },
    {
      kind: 'concept',
      title: 'The Gameplay Debugger',
      blocks: [
        {
          type: 'p',
          text: 'Press the apostrophe key (`\'`) during play and the [[gameplay-debugger]] overlay appears for the actor in the centre of your view — typically an AI pawn. Its information is grouped into *categories* such as AI, Behavior Tree, EQS, Perception and Navmesh, each toggled with a numpad key. You see the actor\'s current behavior-tree node, what it perceives and its navigation path, live, while the game runs.',
        },
        {
          type: 'p',
          text: 'Its data is gathered on the server and replicated to the viewing client, so you can inspect *server-side* AI from a client window in a multiplayer session — something DrawDebug on the server cannot show you. Projects can add their own category by subclassing `FGameplayDebuggerCategory` in a module that depends on `GameplayDebugger`.',
        },
        {
          type: 'table',
          headers: ['Question you are asking', 'Reach for'],
          rows: [
            ['Where did that trace go? How big is that radius?', '`DrawDebugLine` / `DrawDebugSphere`'],
            ['Why did this actor do that, 2 minutes ago?', 'Visual Logger'],
            ['Is my frame time going to gameplay or rendering?', '`stat unit`, then Unreal Insights'],
            ['I want to toggle my feature\'s debug view at run time', '`TAutoConsoleVariable` with `ECVF_Cheat`'],
            ['I need a test shortcut (give ammo, skip level)', '`UFUNCTION(Exec)` in your CheatManager'],
            ['What is this AI thinking right now?', 'Gameplay Debugger (`\'` key)'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Leave good debug hooks behind',
          text: 'Professional gameplay code ships *with* its debug views, switched off by a cvar and compiled out of Shipping. The next person to touch the feature — often you, six months later — gets instant insight instead of re-adding prints. Treat debug drawing as part of the feature, not a temporary hack.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Put the steps in order to add a working `GiveAmmo 50` cheat to your game.',
      lines: [
        'Create `UMyCheatManager`, a subclass of `UCheatManager`',
        'Declare `UFUNCTION(Exec) void GiveAmmo(int32 Amount);` and implement it',
        'Set `CheatClass = UMyCheatManager::StaticClass();` in your PlayerController\'s constructor',
        'Make sure your GameMode uses that PlayerController class',
        'Play in the editor, open the console and type `GiveAmmo 50`',
      ],
      distractors: ['Mark `GiveAmmo` as `BlueprintCallable` so the console can see it'],
      explanation:
        'The cheat manager is created by the PlayerController from its `CheatClass`, so the chain must be complete: your cheat class, its Exec function, the controller pointing at it, and the GameMode spawning that controller. `BlueprintCallable` is unrelated — the console looks for the `Exec` specifier.',
    },
    {
      kind: 'mcq',
      prompt: 'An AI draws its path with `DrawDebugLine(..., FColor::Blue, true)` every time it re-plans. After ten minutes of play the frame rate has dropped badly. What is going on?',
      options: [
        {
          text: 'Persistent lines are never removed automatically, so thousands of old path segments are being drawn every frame',
          correct: true,
          why: 'Exactly. `bPersistentLines = true` means "keep until flushed". Call `FlushPersistentDebugLines(GetWorld())` before redrawing, or use a lifetime instead.',
        },
        {
          text: 'DrawDebugLine leaks memory because it is not compiled out in the editor',
          why: 'Being present in editor builds is intended. The cost comes from the ever-growing number of lines being kept and rendered, not from the function existing.',
        },
        {
          text: 'Blue lines are more expensive than red ones',
          why: 'Colour has no effect on cost. The number of lines is what matters.',
        },
        {
          text: 'The AI\'s path-finding has become slower over time',
          why: 'Possible in theory, but the scenario points at debug drawing: persistent lines accumulate with every re-plan.',
        },
      ],
      explanation:
        'Each lifetime mode has a matching cleanup story: per-frame lines clean themselves up, timed lines expire, and persistent lines stay until you flush them. Drawing persistent shapes from repeating code without flushing is a classic way to make debug views themselves become the performance problem.',
    },
  ],
  takeaways: [
    '`DrawDebugLine`, `Sphere`, `Box`, `DirectionalArrow` and `String` (from `DrawDebugHelpers.h`) visualize gameplay instantly.',
    'Default debug shapes last one frame; pass a `LifeTime` for one-off events, or `bPersistentLines` and flush them yourself.',
    'The helpers are empty in Shipping, but their arguments are still evaluated — guard costly debug work with `#if ENABLE_DRAW_DEBUG`.',
    'The Visual Logger (`UE_VLOG`, `UE_VLOG_SEGMENT`) records per-actor text and shapes so you can scrub back to a rare bad decision.',
    '`stat unit` tells you whether Game, Draw or GPU is the bottleneck; `show collision` and `slomo` are everyday helpers.',
    'Expose debug switches as `ECVF_Cheat` console variables and test actions as `Exec` functions in your CheatManager.',
  ],
  reading: [
    {
      title: 'Visual Logger',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/visual-logger-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How to record, filter and scrub Visual Logger sessions, and the full list of UE_VLOG macros.',
    },
    {
      title: 'Stat Commands',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/stat-commands-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Reference for `stat unit`, `stat game` and the other built-in performance displays.',
    },
    {
      title: 'Console Variables in C++',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/console-variables-cplusplus-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Declaring, reading and reacting to console variables, including flags and thread-safety.',
    },
  ],
};
