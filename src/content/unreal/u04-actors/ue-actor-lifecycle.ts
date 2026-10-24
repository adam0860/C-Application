import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-actor-lifecycle',
  title: 'The Actor Lifecycle',
  summary: 'Every function the engine calls on an actor from construction to destruction, what belongs in each, and why Super:: is not optional.',
  minutes: 18,
  objectives: [
    'List the main lifecycle functions of an actor in order and say when each runs',
    'Decide whether code belongs in the constructor, `OnConstruction`, `PostInitializeComponents`, `BeginPlay`, `Tick` or `EndPlay`',
    'Explain how the spawned, placed-in-level and Play-In-Editor paths differ',
    'Handle every `EEndPlayReason` and explain why `EndPlay` beats `Destroyed` and the destructor for cleanup',
    'Explain what the engine\'s base implementations do and why every override must call `Super::`',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'An actor\'s life at a glance',
      blocks: [
        {
          type: 'p',
          text: 'A standard C++ object has a simple life: constructor, use, destructor. An [[actor]] lives in a much richer environment — it exists in the editor, is saved in levels, enters and leaves gameplay, and is finally collected. So the engine calls a series of virtual functions on it, the [[actor-lifecycle]], and your job is to put each piece of code in the right one.',
        },
        {
          type: 'table',
          headers: ['Function', 'When it runs', 'Typical use'],
          rows: [
            ['Constructor', 'For the CDO at startup, then for every instance', 'Defaults, components, tick settings'],
            ['`OnConstruction`', 'In the editor when placed, moved or edited; also when spawned', 'Editor-visible setup that depends on properties'],
            ['[[post-initialize-components|PostInitializeComponents]]', 'During gameplay, after the components are initialized, before any `BeginPlay`', 'Talking to your own components'],
            ['[[beginplay|BeginPlay]]', 'When the actor enters play', 'Gameplay setup: the real "start"'],
            ['[[tick|Tick]]', 'Every frame, if ticking is enabled', 'Continuous behaviour'],
            ['[[endplay|EndPlay]]', 'When the actor leaves play, for any [[eendplayreason|reason]]', 'Cleanup that undoes `BeginPlay`'],
            ['Destructor', 'Much later, when the garbage collector frees the memory', 'Almost never anything'],
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A play in a theatre',
          text: 'The **constructor** is the workshop building a prop from the blueprint (including the one display model kept in the store room — the CDO). **OnConstruction** is the dress rehearsal: the director moves things around on stage and sees the result live. **BeginPlay** is the curtain going up, **Tick** is every moment of the performance, and **EndPlay** is the curtain coming down. The **destructor** is the cleaning crew who clear the stage hours later — nobody in the audience is there to see it.',
        },
        {
          type: 'p',
          text: 'Throughout this lesson we will build one actor: an explosive barrel whose fuse can be lit, which glows as the fuse burns, and which blows up (destroys itself) when it reaches zero.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The constructor: defaults and components',
      blocks: [
        {
          type: 'code',
          title: 'ExplosiveBarrel.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ExplosiveBarrel.generated.h"

class UStaticMeshComponent;
class UMaterialInterface;
class UMaterialInstanceDynamic;

UCLASS()
class MYGAME_API AExplosiveBarrel : public AActor {
    GENERATED_BODY()

public:
    AExplosiveBarrel();

    virtual void OnConstruction(const FTransform& Transform) override;
    virtual void PostInitializeComponents() override;
    virtual void Tick(float DeltaSeconds) override;

    UFUNCTION(BlueprintCallable, Category = "Barrel")
    void LightFuse();

protected:
    virtual void BeginPlay() override;
    virtual void EndPlay(
        const EEndPlayReason::Type EndPlayReason) override;

private:
    UPROPERTY(VisibleAnywhere, Category = "Barrel")
    TObjectPtr<UStaticMeshComponent> Mesh;

    UPROPERTY(EditAnywhere, Category = "Barrel")
    bool bIsExplosive = true;

    UPROPERTY(EditAnywhere, Category = "Barrel")
    TObjectPtr<UMaterialInterface> ExplosiveMaterial;

    UPROPERTY(EditAnywhere, Category = "Barrel")
    TObjectPtr<UMaterialInterface> InertMaterial;

    UPROPERTY(EditAnywhere, Category = "Barrel",
        meta = (ClampMin = "0.1"))
    float FuseSeconds = 3.0f;

    UPROPERTY()
    TObjectPtr<UMaterialInstanceDynamic> FuseMaterial;

    float FuseRemaining = 0.0f;

    static int32 LiveBarrelCount;
};`,
          annotations: [
            { lines: '7-9', text: 'Forward declarations keep the header light; the `.cpp` includes the full headers.' },
            { lines: '18-20', text: 'These overrides are `public` in `AActor`, so they stay `public` here.' },
            { lines: '26-28', text: '`BeginPlay` and `EndPlay` are `protected` in `AActor`: only the engine (and subclasses) should call them.' },
            { lines: '43-45', text: '`ClampMin` is editor metadata that stops a designer typing 0 — we divide by this value later.' },
            { lines: 52, text: 'A plain C++ static: not reflected, shared by every barrel. Fine for a demo counter; a real game would keep it in a subsystem.' },
          ],
        },
        {
          type: 'code',
          title: 'ExplosiveBarrel.cpp — constructor',
          code: `#include "ExplosiveBarrel.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"

int32 AExplosiveBarrel::LiveBarrelCount = 0;

AExplosiveBarrel::AExplosiveBarrel() {
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.bStartWithTickEnabled = false;

    Mesh = CreateDefaultSubobject<UStaticMeshComponent>(
        TEXT("Mesh"));
    SetRootComponent(Mesh);
}`,
          annotations: [
            { lines: 8, text: '`bCanEverTick` must be decided in the constructor: the engine reads it when it registers the actor\'s tick function. `AActor` defaults it to `false`.' },
            { lines: 9, text: 'Able to tick, but asleep until the fuse is lit. An idle barrel costs nothing per frame.' },
            { lines: '11-13', text: 'Components are default subobjects, so they can only be created here. The next lesson is all about them.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the constructor is only a "defaults recipe"',
          text: 'As you saw in *Creating Objects the Unreal Way*, the constructor runs for the Class Default Object when the editor starts (no world exists), runs in the editor whenever an actor is placed, and runs **before** the designer\'s values are loaded. Anything that needs a world, other actors, or final property values would be wrong or would crash here. So: defaults, components, tick settings — and nothing else.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'Which of these lines belongs in an actor\'s **constructor** rather than in `BeginPlay`?',
      options: [
        {
          text: '`FuseRemaining = FuseSeconds;` where `FuseSeconds` is `EditAnywhere`',
          why: 'A designer may have changed `FuseSeconds` on this instance, and saved values are applied *after* the constructor. Read it in `BeginPlay`.',
        },
        {
          text: '`Light = CreateDefaultSubobject<UPointLightComponent>(TEXT("Light"));`',
          correct: true,
          why: 'Correct. `CreateDefaultSubobject` only works in constructors, and components should exist for every instance — including the CDO, so designers can edit them.',
        },
        {
          text: '`Player = UGameplayStatics::GetPlayerPawn(this, 0);`',
          why: 'There is no player while the CDO is being built (or in the editor). Finding other actors is gameplay: `BeginPlay`.',
        },
        {
          text: '`GetWorldTimerManager().SetTimer(...)`',
          why: 'Timers need a world, which does not exist for the CDO. Starting a timer is gameplay setup and belongs in `BeginPlay`.',
        },
      ],
      explanation:
        'The constructor answers "what does every instance of this class start with?" — default values and components. Anything that depends on the world, other actors, or designer-edited values answers "what happens when the game starts?", which is `BeginPlay`.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'OnConstruction: the editor-time hook',
      blocks: [
        {
          type: 'p',
          text: '`OnConstruction` is the C++ counterpart of a Blueprint\'s [[construction-script|Construction Script]]. In the editor it runs whenever the actor is placed, moved, or one of its properties changes — so designers see the result instantly. It also runs once when the actor is spawned during play.',
        },
        {
          type: 'code',
          title: 'ExplosiveBarrel.cpp — OnConstruction',
          code: `void AExplosiveBarrel::OnConstruction(const FTransform& Transform) {
    Super::OnConstruction(Transform);

    UMaterialInterface* Chosen =
        bIsExplosive ? ExplosiveMaterial : InertMaterial;
    if (Chosen) {
        Mesh->SetMaterial(0, Chosen);
    }
}`,
          annotations: [
            { lines: 1, text: '`Transform` is the actor\'s current world transform, handy for placement-dependent setup.' },
            { lines: '4-8', text: 'Tick `bIsExplosive` in the Details panel and the barrel changes colour in the viewport immediately. Unlike in the constructor, the instance\'s edited property values are already applied here.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Keep it cheap, visual and side-effect free',
          text: '`OnConstruction` can run dozens of times per second while a designer drags the actor. Never spawn actors, start timers or change other actors here — every drag would repeat it in the *editor* world. Use it to configure the actor\'s own components from its own properties.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Not every path calls it',
          text: 'For an actor placed in a level, what `OnConstruction` built in the editor is saved with the level, so a packaged game does not run it again when that level loads. Spawned actors run it during spawning. Code that must run for every actor in every case belongs in `BeginPlay`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'PostInitializeComponents and BeginPlay',
      blocks: [
        {
          type: 'p',
          text: 'When gameplay starts, each actor\'s components are initialized, and then `PostInitializeComponents` runs: every component exists and is ready, but **no actor has had `BeginPlay` yet**. It is only called during gameplay, never in the editor. It is the classic place to set up your own components — for example creating a dynamic material, or (as you will see in the Delegates unit) binding to your components\' events.',
        },
        {
          type: 'code',
          title: 'ExplosiveBarrel.cpp',
          code: `void AExplosiveBarrel::PostInitializeComponents() {
    Super::PostInitializeComponents();
    FuseMaterial = Mesh->CreateAndSetMaterialInstanceDynamic(0);
}

void AExplosiveBarrel::BeginPlay() {
    Super::BeginPlay();
    FuseRemaining = FuseSeconds;
    ++LiveBarrelCount;
}`,
          annotations: [
            { lines: 3, text: 'A per-instance copy of the mesh\'s material whose parameters we can change at run time (we make it glow in `Tick`).' },
            { lines: 7, text: 'Always first in `BeginPlay`. The base version does essential work — see the last card.' },
            { lines: 8, text: 'Safe now: `FuseSeconds` holds the designer\'s final value.' },
            { lines: 9, text: 'Something set up in `BeginPlay` must be undone in `EndPlay`. Keep these two functions in mind as a pair.' },
          ],
        },
        {
          type: 'p',
          text: '`BeginPlay` is where gameplay begins for this actor. By now the world exists, the actor\'s properties hold their final values, the level\'s other placed actors exist, and it is safe to start timers, find other actors and run game logic.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'BeginPlay order between actors is not guaranteed',
          text: 'When a level starts, placed actors receive `BeginPlay` one after another in an order you must not rely on. If actor A\'s `BeginPlay` needs something that actor B sets up in *its* `BeginPlay`, A may run first and see nothing. Make B\'s data ready earlier (constructor defaults or `PostInitializeComponents`), have B announce itself when ready, or let a manager drive the order.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'If actor A is listed above actor B in the World Outliner, A\'s `BeginPlay` is guaranteed to run before B\'s when the level starts.',
      answer: false,
      explanation:
        'The order in which placed actors receive `BeginPlay` is an implementation detail that depends on how the level stores its actors, streaming and more — and the Outliner sorts for display, not for execution. Code that depends on another actor\'s `BeginPlay` having run is fragile. Prepare shared data earlier in the lifecycle, or have actors register with a manager that coordinates them.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Tick: every frame, if you ask for it',
      blocks: [
        {
          type: 'p',
          text: 'If ticking is enabled, the engine calls `Tick` once per frame with `DeltaSeconds`, the time since the previous frame. (The Tick and Timers unit covers frame-rate independence and tick cost in depth.) Our barrel only ticks once its fuse is lit:',
        },
        {
          type: 'code',
          title: 'ExplosiveBarrel.cpp',
          code: `void AExplosiveBarrel::LightFuse() {
    if (bIsExplosive) {
        SetActorTickEnabled(true);
    }
}

void AExplosiveBarrel::Tick(float DeltaSeconds) {
    Super::Tick(DeltaSeconds);

    FuseRemaining -= DeltaSeconds;
    if (FuseMaterial) {
        const float Glow = 1.0f - FuseRemaining / FuseSeconds;
        FuseMaterial->SetScalarParameterValue(TEXT("Glow"), Glow);
    }
    if (FuseRemaining <= 0.0f) {
        Destroy();   // explosion effects omitted
    }
}`,
          annotations: [
            { lines: 3, text: 'Turns ticking on at run time. This only works because the constructor set `bCanEverTick = true`; otherwise there is no tick function to enable.' },
            { lines: 8, text: 'The base `Tick` runs the Blueprint *Event Tick* and Blueprint latent actions such as *Delay* nodes.' },
            { lines: 10, text: 'Subtracting real elapsed seconds makes the fuse last `FuseSeconds` whether the game runs at 30 or 144 frames per second.' },
            { lines: 13, text: 'Drives a `Glow` parameter in the material, from 0 (just lit) to 1 (about to blow).' },
            { lines: 16, text: 'Destroying yourself inside `Tick` is fine. It leads straight into `EndPlay`, next card.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Ticking is opt-in for a reason',
          text: 'A thousand actors each doing a little work every frame adds up. Disable ticking where you can (`bCanEverTick = false`), start ticking only when needed (`bStartWithTickEnabled = false` plus `SetActorTickEnabled`), or tick less often with `PrimaryActorTick.TickInterval`. Many "every frame" checks are better as events or timers.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: 'Complete this actor so it *can* tick, does **not** tick until activated, and keeps the base class behaviour in `Tick`.',
      template: `AMovingPlatform::AMovingPlatform() {
    PrimaryActorTick.___ = true;
    PrimaryActorTick.___ = false;
}

void AMovingPlatform::Activate() {
    SetActorTickEnabled(true);
}

void AMovingPlatform::Tick(float DeltaSeconds) {
    Super::___(DeltaSeconds);
    AddActorWorldOffset(Velocity * DeltaSeconds);
}`,
      blanks: [{ answers: ['bCanEverTick'] }, { answers: ['bStartWithTickEnabled'] }, { answers: ['Tick'] }],
      wordBank: ['bCanEverTick', 'bStartWithTickEnabled', 'Tick', 'bTickEnabled', 'BeginPlay', 'TickComponent'],
      explanation:
        '`bCanEverTick` creates and registers the tick function at all; `bStartWithTickEnabled = false` leaves it disabled until `SetActorTickEnabled(true)`. `Super::Tick` keeps the Blueprint *Event Tick* and latent actions working for Blueprint children. `TickComponent` is the component equivalent you will meet in the next lesson.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'EndPlay, Destroyed and the destructor',
      blocks: [
        {
          type: 'p',
          text: '`EndPlay` is called whenever an actor leaves gameplay, and it tells you why with an `EEndPlayReason`:',
        },
        {
          type: 'table',
          headers: ['Reason', 'When'],
          rows: [
            ['`Destroyed`', '`Destroy()` was called (by you, by damage, by `SetLifeSpan`…)'],
            ['`LevelTransition`', 'The game is travelling to another map'],
            ['`EndPlayInEditor`', 'You pressed Stop in Play In Editor'],
            ['`RemovedFromWorld`', 'A streaming level containing the actor was unloaded'],
            ['`Quit`', 'The application is shutting down'],
          ],
        },
        {
          type: 'code',
          title: 'ExplosiveBarrel.cpp',
          code: `void AExplosiveBarrel::EndPlay(
    const EEndPlayReason::Type EndPlayReason) {
    --LiveBarrelCount;

    if (EndPlayReason == EEndPlayReason::Destroyed) {
        UE_LOG(LogTemp, Log, TEXT("Barrel exploded"));
    }
    Super::EndPlay(EndPlayReason);
}`,
          annotations: [
            { lines: 3, text: 'Undo what `BeginPlay` did, **for every reason**. If this only happened on `Destroyed`, stopping Play In Editor or changing levels would leave the count wrong.' },
            { lines: '5-7', text: 'Reason-specific logic: award points only when the barrel actually blew up, not when the level was unloaded.' },
            { lines: 8, text: 'Teardown convention: your cleanup first, then the base class — the reverse of setup, just like C++ destructors run derived-first.' },
          ],
        },
        {
          type: 'p',
          text: '`Destroyed()` is narrower: it runs only for **explicit** destruction — `Destroy()` during play, or deleting the actor in the editor — and not for level unloads, streaming or quitting. In fact `AActor::Destroyed()` is what routes `EndPlay(EEndPlayReason::Destroyed)`, so an override that forgets `Super::Destroyed()` silently skips `EndPlay`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not clean up in the destructor, like RAII?',
          text: 'In standard C++ the destructor is the natural cleanup point. For actors, the C++ destructor runs only when the garbage collector frees the memory — possibly a minute later, possibly after the world is gone, and also for the CDO at shutdown. Gameplay resources (registrations, timers, effects) must be released when the actor *leaves play*, and that moment is `EndPlay`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'A pickup increments a static counter in `BeginPlay` and decrements it in an override of `Destroyed()`. After a few Play-In-Editor sessions the count is far too high. Why?',
      options: [
        {
          text: '`Destroyed()` is not called when Play In Editor stops or a level unloads, so those pickups never decrement',
          correct: true,
          why: 'Correct. Stopping PIE ends play with `EEndPlayReason::EndPlayInEditor`, which calls `EndPlay` but not `Destroyed`. Moving the decrement to `EndPlay` fixes it for every reason.',
        },
        {
          text: '`BeginPlay` is called twice for placed actors',
          why: '`BeginPlay` is called once per play session for each actor; the engine even checks that it is not routed twice.',
        },
        {
          text: 'Static variables are reset when Play In Editor stops',
          why: 'Statics live as long as the editor process, which is exactly why the leftover increments accumulate across sessions.',
        },
        {
          text: 'The garbage collector has not yet run the pickups\' destructors',
          why: 'The counter is not touched by destructors, and destructor timing is irrelevant here: the decrement lives in `Destroyed()`, which these paths never call.',
        },
      ],
      explanation:
        '`Destroyed` covers one way out of gameplay; `EndPlay` covers all of them. Pair every piece of `BeginPlay` setup with cleanup in `EndPlay`, and use the reason only for logic that genuinely differs (like scoring a kill).',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Spawned versus placed: different roads to BeginPlay',
      blocks: [
        {
          type: 'p',
          text: 'The same class can enter the game three ways, and the engine calls a slightly different sequence for each:',
        },
        {
          type: 'table',
          headers: ['Placed in a level (packaged game)', 'Spawned with SpawnActor', 'Play In Editor'],
          rows: [
            ['Constructor', 'Constructor', 'Constructor, then every property copied from the editor world\'s actor'],
            ['Saved values loaded (`PostLoad`)', '`PostActorCreated`', '`PostDuplicate`'],
            ['—', '`OnConstruction`', '—'],
            ['Components initialized, `PostInitializeComponents`', 'Components initialized, `PostInitializeComponents`', 'Components initialized, `PostInitializeComponents`'],
            ['`BeginPlay` when the world begins play (all placed actors together)', '`BeginPlay` **inside** `SpawnActor`, before it returns', '`BeginPlay` when the world begins play'],
          ],
        },
        {
          type: 'list',
          items: [
            '**Placed actors** get their designer-edited values from the level file after construction, and all start play together when the game mode starts the match.',
            '**Spawned actors** run `OnConstruction` during spawning, and `BeginPlay` has already happened by the time `SpawnActor` returns its pointer. Setting a property right after spawning is therefore *too late* for `BeginPlay` to see — the last lesson of this unit shows the fix, deferred spawning.',
            '**Play In Editor** copies the editor\'s world, so actors start from exactly what you see in the viewport.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Write code that works on every road',
          text: 'Use the constructor for defaults, `BeginPlay` for gameplay setup, and `EndPlay` for cleanup, and your actor behaves the same whether it was placed, spawned or duplicated. Path-specific hooks such as `PostLoad` and `PostActorCreated` exist, but gameplay code rarely needs them.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'order',
      prompt: 'A barrel is **spawned** during play and later blows up. Put the lifecycle calls in the order the engine makes them.',
      lines: ['Constructor', 'OnConstruction', 'PostInitializeComponents', 'BeginPlay', 'Tick (each frame while enabled)', 'EndPlay (EEndPlayReason::Destroyed)'],
      distractors: ['PostLoad (values loaded from the level file)'],
      explanation:
        'Spawning constructs the actor, runs its construction (`OnConstruction`), initializes components (`PostInitializeComponents`), then calls `BeginPlay` before `SpawnActor` returns. Ticking happens during play, and `Destroy()` ends play with the `Destroyed` reason. `PostLoad` belongs to actors *loaded* from a level file, not spawned ones.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Always call Super::',
      blocks: [
        {
          type: 'p',
          text: 'C++ calls base-class constructors and destructors for you, but an overridden virtual function replaces the base version entirely unless you call it yourself. In Unreal, the base versions do real work, and skipping them breaks things in ways that are hard to trace back. [[ue-super|Super]] is the typedef `GENERATED_BODY()` gives you for the direct parent class.',
        },
        {
          type: 'table',
          headers: ['If you skip…', 'You lose'],
          rows: [
            ['`Super::BeginPlay()`', 'Blueprint *Event BeginPlay*, `BeginPlay` on every component, registering the actor\'s tick functions, `InitialLifeSpan`. The engine reports "Failed to route BeginPlay".'],
            ['`Super::Tick()`', 'Blueprint *Event Tick* and Blueprint latent actions (*Delay*, timelines driven by latent nodes).'],
            ['`Super::EndPlay()`', 'Blueprint *Event End Play*, the `OnEndPlay` delegate and `EndPlay` on every component.'],
            ['`Super::PostInitializeComponents()`', 'The actor is never marked initialized; the engine stops with a fatal "failed to route PostInitializeComponents" error.'],
            ['`Super::Destroyed()`', '`EndPlay(Destroyed)`, Blueprint *Event Destroyed* and the `OnDestroyed` delegate.'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why Super and not AActor::?',
          text: 'Writing `AActor::BeginPlay()` works only while your direct parent is `AActor`. The day someone inserts `AEnemyBase` between them, your call silently skips `AEnemyBase::BeginPlay()`. `Super::` always means "my direct parent", whatever that becomes. Convention: call it **first** in setup functions (`BeginPlay`, `PostInitializeComponents`, `Tick`, `OnConstruction`) and **last** in teardown functions (`EndPlay`, `Destroyed`).',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'bug',
      prompt: '`AGoblin` derives from `AEnemyBase`, which derives from `AActor`. `AEnemyBase::BeginPlay()` sets up health. Goblins spawn with zero health. Tap the line at fault.',
      code: `void AGoblin::BeginPlay() {
    AActor::BeginPlay();
    Gold = FMath::RandRange(5, 20);
    PlayTaunt();
}`,
      bugLines: [2],
      hint: 'Which parent class actually gets called here?',
      explanation:
        'Line 2 calls the *grandparent* `AActor::BeginPlay()` directly, skipping `AEnemyBase::BeginPlay()`, so the health setup never runs (while the engine sees `BeginPlay` routed and does not complain). Use `Super::BeginPlay();` — it always means the direct parent, so it keeps working even when the class hierarchy changes.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Select **every** function that runs for an actor in the editor, without pressing Play.',
      options: [
        {
          text: 'The constructor',
          correct: true,
          why: 'It runs for the CDO when the editor starts and for every actor placed or loaded in the editor.',
        },
        {
          text: '`OnConstruction`',
          correct: true,
          why: 'That is its purpose: it reruns whenever the actor is placed, moved or edited, so designers see the result.',
        },
        {
          text: '`PostInitializeComponents`',
          why: 'It is only called during gameplay, when the world initializes its actors for play.',
        },
        {
          text: '`BeginPlay`',
          why: 'Only when play begins (in a game or Play In Editor). That is what makes it the safe place for gameplay code.',
        },
        {
          text: '`Tick`',
          why: 'Actors do not tick in editor viewports by default; a class must opt in by overriding `ShouldTickIfViewportsOnly()`.',
        },
      ],
      explanation:
        'Code in the constructor and `OnConstruction` executes inside the editor, on the editor\'s world, every time content is placed or edited. That is why both must stay free of gameplay side effects, while `PostInitializeComponents`, `BeginPlay` and `Tick` are safe places for game logic.',
    },
  ],
  takeaways: [
    'Constructor → (`OnConstruction`) → `PostInitializeComponents` → `BeginPlay` → `Tick` … → `EndPlay` → destructor at garbage collection.',
    'Constructors set defaults, create components and decide `bCanEverTick`; they run for the CDO and before designer values are loaded.',
    '`OnConstruction` is editor-time setup driven by properties; keep it cheap and free of side effects.',
    '`BeginPlay` is the gameplay start; never rely on the order in which different actors receive it.',
    '`EndPlay` runs for every way out of play (`Destroyed`, `LevelTransition`, `EndPlayInEditor`, `RemovedFromWorld`, `Quit`) — pair it with `BeginPlay`; `Destroyed` and the destructor are the wrong places for cleanup.',
    'Spawned actors run `OnConstruction` and `BeginPlay` inside `SpawnActor`; placed actors load saved values and begin play together.',
    'Always call `Super::` in lifecycle overrides — first in setup, last in teardown; the base versions drive Blueprint events, components and ticking.',
  ],
  reading: [
    {
      title: 'Actor Lifecycle',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle',
      source: 'unreal-docs',
      note: 'Epic\'s diagram of the load, spawn, deferred-spawn and PIE paths, with every function in order.',
    },
    {
      title: 'Actor Ticking',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-ticking-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How tick functions are registered, enabled and grouped — a preview of the Tick and Timers unit.',
    },
    {
      title: 'Update Method',
      url: 'https://gameprogrammingpatterns.com/update-method.html',
      source: 'book',
      note: 'Robert Nystrom\'s chapter on the per-frame update pattern that `Tick` implements, and its pitfalls.',
    },
  ],
};
