import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-component-events',
  title: 'Hit and Overlap Events',
  summary:
    'OnComponentHit, OnComponentBeginOverlap and friends: exact signatures, the flags they need, actor-level alternatives and a working trigger volume.',
  minutes: 17,
  objectives: [
    'Write handlers with the exact `OnComponentHit`, `OnComponentBeginOverlap` and `OnComponentEndOverlap` signatures',
    'Explain which flags and responses each event needs (Generate Overlap Events, Simulation Generates Hit Events)',
    'Choose between component delegates and the `NotifyActorBeginOverlap` / `NotifyHit` overrides',
    'Build a trigger volume that reacts to players entering and leaving',
    'Avoid duplicate events, self-hits and missed initial overlaps',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Two kinds of contact',
      blocks: [
        {
          type: 'p',
          text: 'When two collidable components meet, one of two things happens. They **block** each other — a bullet stops at a wall, a character bumps into a crate — or they **overlap**, passing through each other while the engine notes that they are touching, as when a player walks into a pickup or a trigger zone. Unreal reports the first as a [[hit-event]] and the second as an [[overlap-event]].',
        },
        {
          type: 'p',
          text: 'Which one happens is decided by **collision responses**: every component declares, per kind of object, whether it *Ignores*, *Overlaps* or *Blocks* it. If both sides Block, you get a hit; if at least one side Overlaps and neither Ignores, you get an overlap. The next unit covers responses in depth — for now that one rule is all you need.',
        },
        {
          type: 'table',
          headers: ['Event', 'Declared on', 'Fires when', 'Also requires'],
          rows: [
            ['`OnComponentHit`', '`UPrimitiveComponent`', 'This component takes part in a blocking collision', 'For collisions from physics simulation: [[simulation-generates-hit-events|Simulation Generates Hit Events]]'],
            ['`OnComponentBeginOverlap`', '`UPrimitiveComponent`', 'It starts overlapping another component', '*Generate Overlap Events* on **both** components'],
            ['`OnComponentEndOverlap`', '`UPrimitiveComponent`', 'It stops overlapping', 'Same as begin overlap'],
            ['`OnActorHit`, `OnActorBeginOverlap`, `OnActorEndOverlap`', '`AActor`', 'The same contacts, summarised per actor', 'Same as above'],
          ],
        },
        {
          type: 'p',
          text: 'All of these are dynamic multicast delegates — [[sparse-delegate|sparse]] ones, to save memory on the thousands of components in a level that nobody listens to — so everything from the previous lesson applies: handlers must be `UFUNCTION()`s with exactly matching parameter types, and you bind them with `AddDynamic`, ideally in `BeginPlay`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why make events opt-in?',
          text: 'Collision is checked constantly. Every time a component moves, the engine would have to compute and dispatch overlaps for everything it touches, and simulated physics bodies produce contacts every physics step. Requiring flags and listeners means you only pay for the events gameplay actually uses.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'A player walks into a coin pickup and should pass straight through it while collecting it. Which event should the coin listen for?',
      options: [
        {
          text: '`OnComponentHit` on the coin\'s collision sphere',
          why: 'A hit means the two components *blocked* each other — the player would bump into the coin like a wall.',
        },
        {
          text: '`OnComponentBeginOverlap` on the coin\'s collision sphere',
          correct: true,
          why: 'Yes. The coin should overlap pawns, so the player passes through and the begin-overlap event says "someone just touched me".',
        },
        {
          text: '`OnComponentEndOverlap` on the coin\'s collision sphere',
          why: 'That fires when the player *leaves* the sphere. Collecting on exit would feel laggy and fail if the coin is destroyed first.',
        },
        {
          text: 'The coin\'s `Tick`, checking the distance to the player every frame',
          why: 'It works, but you would reimplement collision detection badly and pay for it every frame. Overlap events are cheaper and exact.',
        },
      ],
      explanation:
        'Pickups, trigger zones, damage areas and checkpoints are all overlap scenarios: the player should not be stopped, only noticed. Hits are for things that physically stop each other: projectiles hitting walls, cars hitting barriers.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'OnComponentHit and its five parameters',
      blocks: [
        {
          type: 'p',
          text: 'A projectile is the classic hit listener. Its handler must match `FComponentHitSignature` exactly:',
        },
        {
          type: 'code',
          title: 'Projectile.h',
          code: `UCLASS()
class MYGAME_API AProjectile : public AActor {
    GENERATED_BODY()

public:
    AProjectile();

protected:
    virtual void BeginPlay() override;

    UFUNCTION()
    void HandleHit(UPrimitiveComponent* HitComponent,
                   AActor* OtherActor,
                   UPrimitiveComponent* OtherComp,
                   FVector NormalImpulse,
                   const FHitResult& Hit);

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<USphereComponent> Collision;
};`,
          annotations: [
            { lines: 11, text: 'Required: the delegate is dynamic, so the handler is found by name through reflection.' },
            { lines: '12-16', text: 'Five parameters, in this order, with these types. Names are up to you.' },
          ],
        },
        {
          type: 'code',
          title: 'Projectile.cpp',
          code: `AProjectile::AProjectile() {
    Collision = CreateDefaultSubobject<USphereComponent>(
        TEXT("Collision"));
    Collision->InitSphereRadius(5.f);
    Collision->SetCollisionProfileName(TEXT("BlockAllDynamic"));
    SetRootComponent(Collision);
}

void AProjectile::BeginPlay() {
    Super::BeginPlay();
    Collision->OnComponentHit.AddDynamic(this, &AProjectile::HandleHit);
}

void AProjectile::HandleHit(UPrimitiveComponent* HitComponent,
                            AActor* OtherActor,
                            UPrimitiveComponent* OtherComp,
                            FVector NormalImpulse,
                            const FHitResult& Hit) {
    if (!OtherActor || OtherActor == this) {
        return;
    }
    UE_LOG(LogTemp, Log, TEXT("Hit %s at %s"),
           *OtherActor->GetName(), *Hit.ImpactPoint.ToString());
    Destroy();
}`,
          annotations: [
            { lines: 5, text: 'A built-in collision profile that blocks almost everything, so contacts become hits. (Profiles are covered in the next unit.)' },
            { lines: 11, text: 'Bind in `BeginPlay`, as in the previous lesson.' },
            { lines: '19-21', text: 'Defensive checks: never assume `OtherActor` is valid, and ignore contacts with yourself.' },
            { lines: 23, text: '`Hit.ImpactPoint` is the world-space contact point — where to spawn sparks or a decal.' },
            { lines: 24, text: 'Destroying yourself inside your own hit handler is a normal pattern; just do not touch members afterwards.' },
          ],
        },
        {
          type: 'table',
          headers: ['Parameter', 'What it tells you'],
          rows: [
            ['`HitComponent`', 'Which of *your* components was involved — useful when one handler serves several'],
            ['`OtherActor`', 'The actor you hit. Always null-check it'],
            ['`OtherComp`', 'The exact component you hit, e.g. an enemy\'s head hitbox rather than its body'],
            ['`NormalImpulse`', 'The impulse the physics solver applied to separate the bodies. Only meaningful for simulated physics; zero for swept movement'],
            ['`Hit`', 'An [[fhitresult]] with the impact point, surface normal, bone name and more (full tour in the line traces lesson)'],
          ],
        },
        {
          type: 'p',
          text: 'Hit events come from two sources. **Swept movement** — the Character Movement Component, a [[projectile-movement-component]], or `SetActorLocation(..., true)` with sweeping enabled — reports a hit whenever a move is blocked, with no extra setup. **Physics simulation** only reports hits for components with **Simulation Generates Hit Events** ticked (`SetNotifyRigidBodyCollision(true)` in C++). A teleport without sweeping produces no hit at all.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Physics hits can arrive in floods',
          text: 'A simulated crate bouncing on the floor can report a hit on every bounce, and contacts may keep generating events while bodies stay in touch. Make physics hit handlers cheap and idempotent, or gate them — for example only react when `NormalImpulse.Size()` exceeds a threshold, or apply a short cooldown.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'fill',
      prompt: 'Complete the `OnComponentHit` handler declaration and enable hit events for physics simulation on the crate\'s mesh.',
      template: `UFUNCTION()
void HandleHit(UPrimitiveComponent* HitComp, AActor* OtherActor,
               UPrimitiveComponent* OtherComp, ___ NormalImpulse,
               const ___& Hit);

// In the constructor:
Mesh->SetSimulatePhysics(true);
Mesh->SetNotifyRigidBodyCollision(___);`,
      blanks: [{ answers: ['FVector'] }, { answers: ['FHitResult'] }, { answers: ['true'] }],
      wordBank: ['FVector', 'float', 'FRotator', 'FHitResult', 'FOverlapResult', 'true', 'false'],
      explanation:
        '`NormalImpulse` is a vector (direction and magnitude of the separating impulse), and the last parameter is a `const FHitResult&`. `FOverlapResult` is what overlap *queries* return, not what hit events pass. `SetNotifyRigidBodyCollision(true)` is the C++ name of the *Simulation Generates Hit Events* checkbox — without it, a simulated crate never broadcasts `OnComponentHit` from physics contacts.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Overlap signatures',
      blocks: [
        {
          type: 'p',
          text: 'Overlap handlers have longer signatures. Rather than memorising them, copy them from the engine header where the delegates are declared:',
        },
        {
          type: 'code',
          title: 'PrimitiveComponent.h (engine, abridged)',
          code: `DECLARE_DYNAMIC_MULTICAST_SPARSE_DELEGATE_SixParams(
    FComponentBeginOverlapSignature, UPrimitiveComponent,
    OnComponentBeginOverlap,
    UPrimitiveComponent*, OverlappedComponent,
    AActor*, OtherActor,
    UPrimitiveComponent*, OtherComp,
    int32, OtherBodyIndex,
    bool, bFromSweep,
    const FHitResult&, SweepResult);

DECLARE_DYNAMIC_MULTICAST_SPARSE_DELEGATE_FourParams(
    FComponentEndOverlapSignature, UPrimitiveComponent,
    OnComponentEndOverlap,
    UPrimitiveComponent*, OverlappedComponent,
    AActor*, OtherActor,
    UPrimitiveComponent*, OtherComp,
    int32, OtherBodyIndex);`,
          annotations: [
            { lines: '2-3', text: 'Sparse delegates also name the owning class and the member they live in, because their storage is kept outside the object.' },
            { lines: '4-9', text: 'The familiar type/name pairs of a dynamic delegate. Your handler needs these six types in this order.' },
            { lines: '14-17', text: 'End overlap drops the sweep information: there is no contact point when two things separate.' },
          ],
        },
        {
          type: 'table',
          headers: ['Parameter', 'Meaning'],
          rows: [
            ['`OverlappedComponent`', 'Your component (the trigger box)'],
            ['`OtherActor` / `OtherComp`', 'Who entered, and with which component (usually a character\'s capsule)'],
            ['`OtherBodyIndex`', 'Which body inside `OtherComp`, for components made of several bodies — physics bodies of a skeletal mesh, instances of an instanced static mesh'],
            ['`bFromSweep`', '`true` if the overlap was found during a swept move'],
            ['`SweepResult`', 'Contact details — **only valid when `bFromSweep` is true**'],
          ],
        },
        {
          type: 'p',
          text: 'For an overlap to fire, two conditions must hold. First, the responses must resolve to **Overlap** (neither component ignores the other, and they do not both block). Second, both components need [[generate-overlap-events|Generate Overlap Events]] enabled — `SetGenerateOverlapEvents(true)`. Not every component type has it on by default (placed static meshes typically do not), so set it explicitly on anything you rely on.',
        },
        {
          type: 'callout',
          variant: 'tip',
          text: 'Typing these signatures by hand is error-prone. Copy the parameter list from the engine header (or from an existing handler in your project) and remove the commas between each type and its name.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'In an `OnComponentBeginOverlap` handler, `SweepResult.ImpactPoint` always tells you exactly where the other actor entered the trigger.',
      answer: false,
      explanation:
        '`SweepResult` is only filled in when `bFromSweep` is `true` — the overlap was discovered during a swept move. Overlaps found any other way (something spawned or teleported inside, the trigger itself moved, overlaps refreshed when play began) leave it empty or default. Check `bFromSweep` first, and if you need a position regardless, use `OtherActor->GetActorLocation()`.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Building a trigger volume',
      blocks: [
        {
          type: 'p',
          text: 'Time to build something real: a healing zone that knows when player pawns step in and out. The box uses the built-in **Trigger** collision profile, which is query-only and overlaps everything.',
        },
        {
          type: 'code',
          title: 'HealingZone.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HealingZone.generated.h"

class UBoxComponent;

UCLASS()
class MYGAME_API AHealingZone : public AActor {
    GENERATED_BODY()

public:
    AHealingZone();

protected:
    virtual void BeginPlay() override;

    UFUNCTION()
    void HandleBeginOverlap(UPrimitiveComponent* OverlappedComp,
                            AActor* OtherActor,
                            UPrimitiveComponent* OtherComp,
                            int32 OtherBodyIndex,
                            bool bFromSweep,
                            const FHitResult& SweepResult);

    UFUNCTION()
    void HandleEndOverlap(UPrimitiveComponent* OverlappedComp,
                          AActor* OtherActor,
                          UPrimitiveComponent* OtherComp,
                          int32 OtherBodyIndex);

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<UBoxComponent> Zone;

    UPROPERTY(VisibleInstanceOnly, Category = "Healing")
    int32 PlayersInside = 0;
};`,
          annotations: [
            { lines: 7, text: 'Forward-declared; the `.cpp` includes `Components/BoxComponent.h`.' },
            { lines: '19-25', text: 'Exactly the six begin-overlap parameter types, as a `UFUNCTION`.' },
            { lines: '27-31', text: 'The four end-overlap parameter types.' },
            { lines: '36-37', text: '`VisibleInstanceOnly` lets you watch the count in the Details panel while the game runs.' },
          ],
        },
        {
          type: 'code',
          title: 'HealingZone.cpp',
          code: `#include "HealingZone.h"
#include "Components/BoxComponent.h"
#include "GameFramework/Pawn.h"

AHealingZone::AHealingZone() {
    PrimaryActorTick.bCanEverTick = false;

    Zone = CreateDefaultSubobject<UBoxComponent>(TEXT("Zone"));
    SetRootComponent(Zone);
    Zone->SetBoxExtent(FVector(200.0, 200.0, 100.0));
    Zone->SetCollisionProfileName(TEXT("Trigger"));
    Zone->SetGenerateOverlapEvents(true);
}

void AHealingZone::BeginPlay() {
    Super::BeginPlay();
    Zone->OnComponentBeginOverlap.AddDynamic(
        this, &AHealingZone::HandleBeginOverlap);
    Zone->OnComponentEndOverlap.AddDynamic(
        this, &AHealingZone::HandleEndOverlap);
}

void AHealingZone::HandleBeginOverlap(
        UPrimitiveComponent* OverlappedComp, AActor* OtherActor,
        UPrimitiveComponent* OtherComp, int32 OtherBodyIndex,
        bool bFromSweep, const FHitResult& SweepResult) {
    const APawn* Pawn = Cast<APawn>(OtherActor);
    if (!Pawn || !Pawn->IsPlayerControlled()) {
        return;
    }
    ++PlayersInside;
    UE_LOG(LogTemp, Log, TEXT("%s entered the healing zone"),
           *Pawn->GetName());
}

void AHealingZone::HandleEndOverlap(
        UPrimitiveComponent* OverlappedComp, AActor* OtherActor,
        UPrimitiveComponent* OtherComp, int32 OtherBodyIndex) {
    const APawn* Pawn = Cast<APawn>(OtherActor);
    if (!Pawn || !Pawn->IsPlayerControlled()) {
        return;
    }
    PlayersInside = FMath::Max(PlayersInside - 1, 0);
}`,
          annotations: [
            { lines: 6, text: 'Purely event-driven: no Tick needed at all.' },
            { lines: 10, text: 'Half-extents in cm: a 4 m × 4 m × 2 m box.' },
            { lines: 11, text: '**Trigger**: detects things (query-only collision) and overlaps all object types, so pawns walk through and generate overlaps.' },
            { lines: 12, text: 'Explicit, so the zone keeps working whatever a parent class or profile defaults to.' },
            { lines: '17-20', text: 'Bind both events in `BeginPlay`.' },
            { lines: '27-30', text: '`Cast` returns `nullptr` for null or non-pawn actors, so one check filters out crates, projectiles and AI.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Already inside when you start listening?',
          text: 'If a player spawns inside the zone, or is standing in it when you bind, you may never receive a begin-overlap for them. After binding, call `Zone->GetOverlappingActors(Actors, APawn::StaticClass())` to pick up anyone already inside.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'bug',
      prompt: 'Players hit an invisible wall at the edge of this healing zone, and the begin-overlap handler never runs. Tap the line that causes it.',
      code: `AHealingZone::AHealingZone() {
    Zone = CreateDefaultSubobject<UBoxComponent>(TEXT("Zone"));
    SetRootComponent(Zone);
    Zone->SetBoxExtent(FVector(200.0, 200.0, 100.0));
    Zone->SetCollisionProfileName(TEXT("BlockAllDynamic"));
    Zone->SetGenerateOverlapEvents(true);
}`,
      bugLines: [5],
      hint: 'What do two components do when both of them Block each other?',
      explanation:
        '`BlockAllDynamic` makes the box **Block** pawns, and a pawn\'s capsule blocks dynamic objects too. Both sides Block, so the result is a blocking collision: the player is stopped (the "invisible wall") and the engine produces hits, not overlaps. Generate Overlap Events cannot help when the responses never resolve to Overlap. Use the `Trigger` profile (or `OverlapAllDynamic`) for volumes that should detect rather than stop.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Actor-level alternatives: NotifyActorBeginOverlap and NotifyHit',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes you do not care *which* component was touched, only that your actor was. `AActor` provides virtual functions you can override instead of binding delegates:',
        },
        {
          type: 'code',
          title: 'Coin.h / Coin.cpp',
          code: `// Coin.h
virtual void NotifyActorBeginOverlap(AActor* OtherActor) override;

// Coin.cpp
void ACoin::NotifyActorBeginOverlap(AActor* OtherActor) {
    Super::NotifyActorBeginOverlap(OtherActor);

    const APawn* Pawn = Cast<APawn>(OtherActor);
    if (Pawn && Pawn->IsPlayerControlled()) {
        UE_LOG(LogTemp, Log, TEXT("Coin collected"));
        Destroy();
    }
}`,
          annotations: [
            { lines: 2, text: 'No `UFUNCTION`, no binding: it is an ordinary [[virtual-function]] override, called by the engine.' },
            { lines: 6, text: 'Call `Super`: the base version fires the Blueprint *ActorBeginOverlap* event, so skipping it would break designers\' graphs.' },
          ],
        },
        {
          type: 'code',
          title: 'Actor.h (engine signature)',
          code: `virtual void NotifyHit(UPrimitiveComponent* MyComp,
                       AActor* Other,
                       UPrimitiveComponent* OtherComp,
                       bool bSelfMoved,
                       FVector HitLocation,
                       FVector HitNormal,
                       FVector NormalImpulse,
                       const FHitResult& Hit);`,
          annotations: [
            { lines: 4, text: '`true` if *this* actor\'s movement caused the hit, `false` if something moved into it.' },
            { lines: '5-6', text: 'Convenience copies of `Hit.ImpactPoint` and `Hit.ImpactNormal`.' },
          ],
        },
        {
          type: 'table',
          headers: ['Aspect', 'Component delegates', 'Actor overrides'],
          rows: [
            ['Setup', 'Bind a `UFUNCTION` with `AddDynamic`', 'Override a virtual function'],
            ['Scope', 'One specific component', 'Any of this actor\'s components'],
            ['Duplicates', 'One event per *component pair*', 'Begin/end overlap once per *actor pair*'],
            ['Listening to others', 'Yes — bind to another actor\'s component', 'No — only inside your own class'],
            ['On / off at run time', 'Bind and unbind whenever you like', 'Always active'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why do actor overlaps fire only once?',
          text: 'The engine tracks overlaps per component pair. When a component pair begins overlapping, it broadcasts the component events; the actor-level notification is sent only if the two *actors* were not already overlapping through some other pair. So a character whose capsule and weapon both enter a trigger produces two component begin-overlaps but a single `NotifyActorBeginOverlap` — exactly what a "player entered" check wants.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'A character\'s capsule **and** a shield component both generate overlap events and both overlap a pickup\'s sphere. The character walks into the pickup. How many times do the pickup\'s handlers run?',
      options: [
        {
          text: '`OnComponentBeginOverlap` once and `NotifyActorBeginOverlap` once',
          why: 'Component events are tracked per *component pair*. Two of the character\'s components entered the sphere, so the component event fires twice.',
        },
        {
          text: '`OnComponentBeginOverlap` twice and `NotifyActorBeginOverlap` twice',
          why: 'The actor-level notification is de-duplicated: it fires only when the two *actors* start overlapping for the first time.',
        },
        {
          text: '`OnComponentBeginOverlap` twice and `NotifyActorBeginOverlap` once',
          correct: true,
          why: 'Right: one component event per pair (capsule–sphere, shield–sphere), one actor event for the first contact between the two actors.',
        },
        {
          text: 'Neither runs, because two overlapping components cancel each other out',
          why: 'Overlaps are independent per component pair; nothing cancels.',
        },
      ],
      explanation:
        'This is the most common "my pickup gives double points" bug. If you use component delegates, filter on `OtherComp` (for example only react to the root component or capsule) or remember which actors you have already handled; if you only care about actors, the actor-level event already de-duplicates for you.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Pitfalls and good habits',
      blocks: [
        {
          type: 'list',
          items: [
            '**Null-check and self-check.** `OtherActor` can be null, and an actor\'s own components can touch each other or the projectile\'s owner. Start handlers with `if (!OtherActor || OtherActor == this) return;` (and ignore `GetInstigator()` for projectiles).',
            '**Filter by type, not by name.** Use `Cast<APawn>`, `IsPlayerControlled()`, an interface or a [[gameplay-tag]] check — never compare actor names, which change between editor and packaged builds.',
            '**Expect duplicates.** Several components means several component events. De-duplicate by component or use actor-level events.',
            '**Remember initial overlaps.** Query `GetOverlappingActors` after binding if things may already be inside.',
            '**Gate physics hits.** Use an impulse threshold or a cooldown so a rolling barrel does not fire your handler fifty times.',
            '**Turn off what you do not use.** Disable Generate Overlap Events on moving components that do not need it — decorative movers, debris — because overlap tracking costs CPU every time they move.',
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          text: 'Overlap events are cheap compared with polling, but not free: each move of a component with overlap events enabled updates its overlap list against everything nearby. In scenes with many moving objects, auditing *Generate Overlap Events* is one of the easiest CPU wins.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Seeing collision',
          text: 'In a running game, the `show collision` console command draws collision shapes so you can check that your trigger is where you think it is and the size you think it is.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          text: 'In the capstone unit you will combine everything from this unit: a pickup built from overlap events and a projectile that reports hits to a health component, which broadcasts its own delegates to the HUD.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'A crate simulates physics and has `OnComponentHit` bound to a handler that plays an impact sound. The crate falls and bounces off the floor, but the handler never runs. What is missing?',
      options: [
        {
          text: 'Generate Overlap Events on the crate',
          why: 'That flag controls overlap events. The crate and the floor *block* each other, which is a hit.',
        },
        {
          text: 'Simulation Generates Hit Events on the crate (`SetNotifyRigidBodyCollision(true)`)',
          correct: true,
          why: 'Yes. Contacts produced by physics simulation only broadcast hit events from components that opt in with this flag.',
        },
        {
          text: 'The floor must also simulate physics',
          why: 'Simulated bodies collide with static geometry all the time; the floor does not need to simulate.',
        },
        {
          text: 'The handler must be bound in the constructor, not `BeginPlay`',
          why: '`BeginPlay` is the right place. The problem is that no hit event is being generated in the first place.',
        },
      ],
      explanation:
        'Swept, kinematic movement (characters, projectile movement, sweeping `SetActorLocation`) reports blocking hits automatically. Simulated physics contacts are far more numerous, so each component must opt in with *Simulation Generates Hit Events*. When a hit handler is silent, ask first: is this a physics contact or a swept move?',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which of these are required for a trigger box\'s `OnComponentBeginOverlap` handler to run when a player\'s capsule walks in? Select all that apply.',
      options: [
        {
          text: 'Generate Overlap Events is enabled on both the box and the capsule',
          correct: true,
          why: 'Overlap events need the flag on both components.',
        },
        {
          text: 'The responses resolve to Overlap: neither side Ignores the other, and they do not both Block',
          correct: true,
          why: 'Without an Overlap result there is no overlap — either nothing (Ignore) or a hit (Block).',
        },
        {
          text: 'The handler is a `UFUNCTION()` with the six begin-overlap parameter types, bound with `AddDynamic`',
          correct: true,
          why: 'The event is a dynamic delegate: wrong types fail to compile, and a missing `UFUNCTION` means the handler is silently skipped.',
        },
        {
          text: 'Simulation Generates Hit Events is enabled on the box',
          correct: false,
          why: 'That flag concerns *hit* events from physics simulation. It plays no part in overlaps.',
        },
        {
          text: 'The box simulates physics',
          correct: false,
          why: 'Triggers are typically query-only and never simulate. Overlaps come from collision queries, not from the physics solver.',
        },
      ],
      explanation:
        'Three independent gates must all be open: the **responses** must resolve to Overlap, the **flag** must be on for both components, and the **handler** must be a correctly typed, bound `UFUNCTION`. When an overlap "does nothing", check them in that order — and use `show collision` to confirm the shapes really meet.',
    },
  ],
  takeaways: [
    'Blocking contacts produce hit events; overlapping contacts produce begin/end overlap events. Responses decide which (both Block → hit; any Overlap and no Ignore → overlap).',
    '`OnComponentHit` handlers take `(UPrimitiveComponent*, AActor*, UPrimitiveComponent*, FVector NormalImpulse, const FHitResult&)`.',
    'Overlap handlers take six parameters (`…, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult`) for begin and four for end; `SweepResult` is valid only when `bFromSweep` is true.',
    'Overlaps need Generate Overlap Events on both components; physics-simulation hits need Simulation Generates Hit Events, while swept movement reports hits automatically.',
    'All of these are dynamic (sparse) delegates: `UFUNCTION()` handlers, `AddDynamic` in `BeginPlay`.',
    '`NotifyActorBeginOverlap` / `NotifyHit` overrides are a simpler, per-actor alternative — call `Super` to keep Blueprint events working.',
    'Null-check `OtherActor`, ignore yourself, de-duplicate per actor, and handle actors that were already overlapping.',
  ],
  reading: [
    {
      title: 'Collision Overview',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-in-unreal-engine---overview',
      source: 'unreal-docs',
      note: 'Epic\'s explanation of hit and overlap events and the flags they require, with worked interaction examples.',
    },
    {
      title: 'UPrimitiveComponent (API reference)',
      url: 'https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UPrimitiveComponent',
      source: 'unreal-docs',
      note: 'Find `OnComponentHit`, `OnComponentBeginOverlap`, `SetGenerateOverlapEvents` and `SetNotifyRigidBodyCollision` here.',
    },
    {
      title: 'Dynamic Delegates',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/dynamic-delegates-in-unreal-engine',
      source: 'unreal-docs',
      note: 'A refresher on `AddDynamic` and `RemoveDynamic`, which every handler in this lesson relies on.',
    },
  ],
};
