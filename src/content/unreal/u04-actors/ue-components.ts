import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-components',
  title: 'Components and the Scene Hierarchy',
  summary: 'How actors are assembled from components, how the scene hierarchy and root component work, and why Unreal favours composition over inheritance.',
  minutes: 18,
  objectives: [
    'Distinguish `UActorComponent`, `USceneComponent` and `UPrimitiveComponent` and pick the right base for a job',
    'Explain the role of the root component and how relative transforms form a hierarchy',
    'Build a component hierarchy in a constructor with `CreateDefaultSubobject` and `SetupAttachment`',
    'Attach and detach at run time with `AttachToComponent` and attachment rules',
    'Explain why Unreal favours composition over inheritance, and write a small custom `UActorComponent`',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Actors are containers of components',
      blocks: [
        {
          type: 'p',
          text: 'Surprisingly, a bare `AActor` can do almost nothing. It has no mesh, no collision, not even a position of its own. Everything you see and touch in a level comes from its [[actor-component|components]]: small objects, owned by the actor, that each provide one capability. A spinning, glowing coin pickup might be:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Component tree of APickup',
          code: `APickup
└─ Collision (USphereComponent)     ← RootComponent
   └─ Mesh (UStaticMeshComponent)
      └─ Glow (UPointLightComponent)

Spinner (URotatingMovementComponent)  ← no transform,
                                         not in the tree`,
          annotations: [
            { lines: 2, text: 'The [[root-component|root component]] defines where the whole actor is.' },
            { lines: '3-4', text: 'Children are positioned **relative to** their parent: move the root and everything attached moves with it.' },
            { lines: '6-7', text: 'Some components have no position at all. They provide behaviour — here, rotating the actor every frame.' },
          ],
        },
        {
          type: 'p',
          text: 'The actor itself is mostly glue: it owns the components, holds gameplay state, and receives lifecycle calls like `BeginPlay`. The capabilities are reusable parts. The same `USphereComponent` gives collision to pickups, triggers and projectiles alike.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A toy-brick vehicle',
          text: 'Think of an actor as a baseplate and components as bricks: wheels, a seat, a light, a steering wheel. You do not need a new kind of baseplate for every vehicle — you attach different bricks. Some bricks clip onto others (the scene hierarchy); some, like a sticker with instructions, just ride along without a position (pure logic components).',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Three tiers of components',
      blocks: [
        {
          type: 'p',
          text: 'Component classes form a short inheritance chain, and each level adds an expensive capability. Choose the lowest level that does the job.',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'The component hierarchy (simplified)',
          code: `UActorComponent            logic, ticking — no transform
└─ USceneComponent         + transform and attachment
   └─ UPrimitiveComponent  + geometry: rendering, collision`,
          annotations: [
            { lines: 1, text: 'Derives from `UObject`. Owned by an actor (`GetOwner()`), can tick, has its own lifecycle.' },
            { lines: 2, text: 'Adds a relative location, rotation and scale, a parent, children and sockets.' },
            { lines: 3, text: 'Adds something that can be drawn and/or collide: physics bodies, collision responses, overlap and hit events.' },
          ],
        },
        {
          type: 'table',
          headers: ['Tier', 'Engine examples', 'Your own examples'],
          rows: [
            ['[[actor-component|UActorComponent]]', '`UCharacterMovementComponent`, `UProjectileMovementComponent`, `URotatingMovementComponent`, `UInputComponent`', 'Health, inventory, stamina, a coin purse, an AI memory'],
            ['[[scene-component|USceneComponent]]', '`UCameraComponent`, `USpringArmComponent`, `UAudioComponent`, `UPointLightComponent`', 'A muzzle point, a pivot for a rotating turret head'],
            ['[[primitive-component|UPrimitiveComponent]]', '[[static-mesh-component|UStaticMeshComponent]], `USkeletalMeshComponent`, `USphereComponent`, `UBoxComponent`, `UCapsuleComponent`', 'Rarely written yourself — usually configured'],
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Two classifications that surprise people',
          text: '**Lights** (`UPointLightComponent` and friends) are scene components, not primitives: they emit light from a position but have no geometry and never collide. **Collision shapes** (`USphereComponent`, `UBoxComponent`, `UCapsuleComponent`) *are* primitives, but they are hidden in game by default — they exist to collide, not to be seen.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why the lowest tier matters',
          text: 'Every scene component in a hierarchy must have its world transform recomputed whenever a parent moves, and every primitive may carry render and physics state. A pure-logic system (cooldowns, stats) built as a scene component pays for a transform it never uses. Thousands of actors later, that is measurable.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'You are writing a component that stores stamina and regenerates it over time. It does not need a position. Which base class should it derive from?',
      options: [
        {
          text: '`USceneComponent`',
          why: 'It would work, but every instance would carry a transform and attachment data it never uses, updated whenever its parent moves.',
        },
        {
          text: '`UPrimitiveComponent`',
          why: 'Primitives add rendering and collision state on top of a transform — far more than a number that regenerates needs.',
        },
        {
          text: '`UActorComponent`',
          correct: true,
          why: 'Correct. Pure logic belongs in the lowest tier: it can still tick, expose properties and functions, and find its owner with `GetOwner()`.',
        },
        {
          text: '`AActor`',
          why: 'An actor is not a component and cannot be added to another actor\'s component list. You would need a separate actor per character, which is wasteful and awkward.',
        },
      ],
      explanation:
        'Choose the base by the capability you need: logic only → `UActorComponent`; a place in the world → `USceneComponent`; something to draw or collide with → `UPrimitiveComponent`. Each step up adds cost.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'The root component',
      blocks: [
        {
          type: 'p',
          text: 'An actor does not store a location of its own. Its transform **is** the transform of its root component, a scene component stored in `RootComponent`. `GetActorLocation()` simply returns `RootComponent->GetComponentLocation()`, and `SetActorLocation()` moves the root — and with it every component attached below it.',
        },
        {
          type: 'memory',
          caption: 'Each child stores a transform relative to its parent; world transforms are computed down the tree.',
          regions: [
            {
              label: 'APickup (actor)',
              kind: 'other',
              cells: [{ name: 'RootComponent', type: 'USceneComponent*', value: 'Collision', pointsTo: 'col' }],
            },
            {
              label: 'Scene hierarchy',
              kind: 'heap',
              cells: [
                { id: 'col', name: 'Collision', type: 'USphereComponent', value: 'world (1200, 300, 50)' },
                { name: 'Mesh', type: 'UStaticMeshComponent', value: 'relative (0, 0, 0) → parent Collision', pointsTo: 'col' },
                { id: 'glow', name: 'Glow', type: 'UPointLightComponent', value: 'relative (0, 0, 40) → world (1200, 300, 90)' },
              ],
            },
          ],
        },
        {
          type: 'list',
          items: [
            'An actor **without** a root component has no transform: `GetActorLocation()` returns the zero vector, and its scene components float unattached.',
            'Only a scene component (or a subclass) can be the root, because only those have a transform.',
            'Children store [[relative-space|relative]] transforms. Glow\'s `(0, 0, 40)` means "40 units above Mesh", wherever Mesh happens to be in the world.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the collision shape is usually the root',
          text: 'When an actor moves with collision checking (a *sweep*), the engine sweeps only the **root** component\'s collision; children simply follow. If a decorative mesh were the root and the sphere a child, the actor would pass through walls that the sphere should have stopped. That is why `ACharacter` uses a capsule as its root and attaches the skeletal mesh beneath it, and why our pickup roots on its sphere.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'truefalse',
      prompt: 'An actor stores its location independently of its components, so even an actor with no root component has a meaningful world position.',
      answer: false,
      explanation:
        'The actor\'s transform is literally its root component\'s transform. With no root, there is nowhere to store a location: `GetActorLocation()` returns `(0, 0, 0)` and setting it does nothing useful. Every actor that exists somewhere in the world needs a scene component as its root (a Blueprint gets a `DefaultSceneRoot` automatically for this reason).',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Building the hierarchy in the constructor',
      blocks: [
        {
          type: 'code',
          title: 'Pickup.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Pickup.generated.h"

class USphereComponent;
class UStaticMeshComponent;
class UPointLightComponent;
class URotatingMovementComponent;

UCLASS()
class MYGAME_API APickup : public AActor {
    GENERATED_BODY()

public:
    APickup();

private:
    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<USphereComponent> Collision;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<UStaticMeshComponent> Mesh;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<UPointLightComponent> Glow;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<URotatingMovementComponent> Spinner;
};`,
          annotations: [
            { lines: '7-10', text: 'Forward declarations: the header only needs to know these are classes. Including their full headers here would slow down every file that includes `Pickup.h`.' },
            { lines: '20-21', text: '[[visible-anywhere|VisibleAnywhere]] on a component pointer: the pointer itself cannot be reassigned in the editor, but the component\'s own properties (mesh, radius, colour) are editable in the Details panel.' },
          ],
        },
        {
          type: 'code',
          title: 'Pickup.cpp',
          code: `#include "Pickup.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/PointLightComponent.h"
#include "GameFramework/RotatingMovementComponent.h"

APickup::APickup() {
    PrimaryActorTick.bCanEverTick = false;

    Collision = CreateDefaultSubobject<USphereComponent>(
        TEXT("Collision"));
    Collision->InitSphereRadius(60.0f);
    SetRootComponent(Collision);

    Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
    Mesh->SetupAttachment(Collision);
    Mesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);

    Glow = CreateDefaultSubobject<UPointLightComponent>(TEXT("Glow"));
    Glow->SetupAttachment(Mesh);
    Glow->SetRelativeLocation(FVector(0.0, 0.0, 40.0));

    Spinner = CreateDefaultSubobject<URotatingMovementComponent>(
        TEXT("Spinner"));
    Spinner->RotationRate = FRotator(0.0, 90.0, 0.0);
}`,
          annotations: [
            { lines: 8, text: 'The actor itself never ticks. The movement component has its **own** tick function, independent of the actor\'s.' },
            { lines: 12, text: '`Init…` setters are meant for constructors: they set the value without triggering render or physics updates on a component that is not registered yet.' },
            { lines: 13, text: 'Make the collision sphere the root, for the sweep reason from the previous card.' },
            { lines: 16, text: '[[setup-attachment|SetupAttachment]] records "my parent will be Collision". Nothing is computed now; the attachment happens when the component is registered with the world.' },
            { lines: 17, text: 'The sphere handles collision; the mesh is purely visual, so turn its collision off (collision is covered in its own unit).' },
            { lines: 21, text: 'A relative offset: 40 units above the mesh.' },
            { lines: '23-25', text: 'A logic-only component: no `SetupAttachment`, because it has no transform. It rotates the actor\'s root by default — 90° of yaw per second.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why SetupAttachment and not "attach now"?',
          text: 'The constructor also runs for the Class Default Object, where nothing is registered with a world and there is no world transform to compute. `SetupAttachment` just stores the intended parent and socket; when each real instance registers its components, the engine performs the attachment for real. Because the parent is recorded on the template, the Blueprint editor can show the hierarchy, and designers can even re-parent inherited components in Blueprint children.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'bug',
      prompt: 'A knight spawns a shield and should hold it in his left hand, but the shield stays floating where it spawned, and the log shows a warning about attachment. Tap the line at fault.',
      code: `void AKnight::BeginPlay() {
    Super::BeginPlay();
    Shield = GetWorld()->SpawnActor<AShield>(ShieldClass);
    if (Shield) {
        Shield->GetRootComponent()->SetupAttachment(
            GetMesh(), TEXT("hand_l"));
    }
}`,
      bugLines: [5],
      hint: 'One of the attachment functions only works before a component is registered.',
      explanation:
        'By the time `SpawnActor` returns, the shield\'s components are registered with the world, so `SetupAttachment` (line 5) is the wrong tool: it only records a parent for a *future* registration, and the engine warns that a registered component must use `AttachToComponent`. Use `Shield->AttachToComponent(GetMesh(), FAttachmentTransformRules::SnapToTargetNotIncludingScale, TEXT("hand_l"));`, which performs the attachment immediately and snaps the shield to the socket.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Attaching and creating components at run time',
      blocks: [
        {
          type: 'p',
          text: 'During gameplay, use [[attach-to-component|AttachToComponent]] to attach a registered component — or a whole actor, via its root — to another component, optionally at a named **socket** (an attachment point defined on a mesh, such as a hand bone).',
        },
        {
          type: 'code',
          title: 'Knight.cpp',
          code: `void AKnight::EquipSword(ASword* Sword) {
    Sword->AttachToComponent(
        GetMesh(),
        FAttachmentTransformRules::SnapToTargetNotIncludingScale,
        TEXT("hand_r"));
}

void AKnight::DropSword(ASword* Sword) {
    Sword->DetachFromActor(
        FDetachmentTransformRules::KeepWorldTransform);
}`,
          annotations: [
            { lines: 2, text: '`AActor::AttachToComponent` attaches the actor\'s root component to the target.' },
            { lines: 4, text: 'The rule decides the child\'s transform after attaching: here, jump exactly onto the socket but keep the sword\'s own scale.' },
            { lines: 5, text: 'The socket name. With `NAME_None`, it attaches to the component\'s origin.' },
            { lines: '9-10', text: 'Detach and stay exactly where it is in the world — the sword drops from the hand rather than teleporting.' },
          ],
        },
        {
          type: 'table',
          headers: ['Attachment rule', 'Result'],
          rows: [
            ['`KeepRelativeTransform`', 'Keeps the current relative numbers, now interpreted relative to the new parent (the child may jump)'],
            ['`KeepWorldTransform`', 'Stays exactly where it is in the world; the relative transform is recalculated'],
            ['`SnapToTargetNotIncludingScale`', 'Moves and rotates onto the parent or socket, keeps its own scale'],
            ['`SnapToTargetIncludingScale`', 'Moves, rotates and scales to match the parent or socket'],
          ],
        },
        {
          type: 'heading',
          text: 'Creating a component at run time',
        },
        {
          type: 'code',
          title: 'Pickup.cpp',
          code: `void APickup::AddSparkle(UStaticMesh* SparkleMesh) {
    UStaticMeshComponent* Sparkle =
        NewObject<UStaticMeshComponent>(this, TEXT("Sparkle"));
    Sparkle->SetStaticMesh(SparkleMesh);
    Sparkle->SetupAttachment(GetRootComponent());
    Sparkle->RegisterComponent();
    AddInstanceComponent(Sparkle);
}`,
          annotations: [
            { lines: '2-3', text: '`CreateDefaultSubobject` only works in constructors, so run-time components use `NewObject`, with the actor as Outer.' },
            { lines: 5, text: 'Allowed here because the component is **not registered yet**. That is the real rule: `SetupAttachment` before registration, `AttachToComponent` after.' },
            { lines: 6, text: 'Registration creates its render and physics state and makes it tick. Forget it and the component exists but does nothing.' },
            { lines: 7, text: 'Optional: lists it among the actor\'s instance components so it shows in the Details panel.' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'A character picks up a torch actor lying on the ground. It should jump into the `hand_r` socket and line up with it exactly, without being stretched by the hand bone\'s scale. Which call is right?',
      codeOptions: true,
      options: [
        {
          text: 'Torch->AttachToComponent(GetMesh(),\n    FAttachmentTransformRules::KeepWorldTransform,\n    TEXT("hand_r"));',
          why: '`KeepWorldTransform` keeps the torch exactly where it was on the ground — now attached to the hand, but metres away from it.',
        },
        {
          text: 'Torch->AttachToComponent(GetMesh(),\n    FAttachmentTransformRules::SnapToTargetNotIncludingScale,\n    TEXT("hand_r"));',
          correct: true,
          why: 'Correct. It moves and rotates the torch onto the socket and leaves its own scale alone.',
        },
        {
          text: 'Torch->GetRootComponent()->SetupAttachment(\n    GetMesh(), TEXT("hand_r"));',
          why: 'The torch is already registered in the world, so `SetupAttachment` only logs a warning and attaches nothing.',
        },
        {
          text: 'Torch->AttachToComponent(GetMesh(),\n    FAttachmentTransformRules::SnapToTargetIncludingScale,\n    TEXT("hand_r"));',
          why: 'This also copies the socket\'s scale, which is exactly the stretching the question asks you to avoid.',
        },
      ],
      explanation:
        'Attachment rules answer "what happens to the child\'s transform when it gets a new parent?". For equipping, you almost always want to snap to the socket and keep your own scale; for dropping, detach with `KeepWorldTransform` so the object stays where it is.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Components you will use constantly',
      blocks: [
        {
          type: 'table',
          headers: ['Component', 'Tier', 'What it gives you', 'Header'],
          rows: [
            ['`UStaticMeshComponent`', 'Primitive', 'Renders a static mesh; can collide and simulate physics', '`Components/StaticMeshComponent.h`'],
            ['`USkeletalMeshComponent`', 'Primitive', 'An animated, skinned mesh with bones and sockets', '`Components/SkeletalMeshComponent.h`'],
            ['`USphereComponent`, `UBoxComponent`, `UCapsuleComponent`', 'Primitive', 'Simple collision shapes, hidden in game', '`Components/SphereComponent.h` etc.'],
            ['`UPointLightComponent`, `USpotLightComponent`', 'Scene', 'Dynamic light sources', '`Components/PointLightComponent.h` etc.'],
            ['`UCameraComponent`, `USpringArmComponent`', 'Scene', 'A viewpoint, and a boom that keeps it at a distance without clipping through walls', '`Camera/CameraComponent.h`, `GameFramework/SpringArmComponent.h`'],
            ['`UAudioComponent`', 'Scene', 'Plays a sound from a position', '`Components/AudioComponent.h`'],
            ['`URotatingMovementComponent`, `UProjectileMovementComponent`', 'Actor', 'Ready-made movement for spinning objects and projectiles', '`GameFramework/…MovementComponent.h`'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Configure in C++, choose assets in Blueprint',
          text: 'Create and wire components in C++, but leave asset choices (which mesh, which material, which sound) to a Blueprint subclass. Hard-coding asset paths in constructors makes C++ depend on content that designers move and rename. A Blueprint child of `APickup` can pick a coin mesh, a gem mesh, a heart mesh — one C++ class, many pickups.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Composition over inheritance',
      blocks: [
        {
          type: 'p',
          text: 'Imagine building game objects purely with inheritance. You start with `AEnemy`, add `AFlyingEnemy` and `AExplodingEnemy`... then a designer wants an enemy that flies **and** explodes, an explosive barrel that is not an enemy, and a flying pickup. The hierarchy cannot express these combinations without duplicating code or contorting itself.',
        },
        {
          type: 'compare',
          left: {
            title: 'Inheritance: one rigid tree',
            tone: 'bad',
            code: `AActor
└─ AEnemy
   ├─ AFlyingEnemy
   ├─ AExplodingEnemy
   └─ AFlyingExplodingEnemy ??
AExplosiveBarrel  (copy-paste the explosion?)`,
            lang: 'text',
            text: 'Every new combination needs a new class, and shared behaviour ends up duplicated across branches.',
          },
          right: {
            title: 'Composition: mix and match',
            tone: 'good',
            code: `AEnemy  + UFlightComponent + UExplosiveComponent
ABarrel + UExplosiveComponent
APickup + UFlightComponent`,
            lang: 'text',
            text: 'Each behaviour is written once and attached wherever it is needed — even by designers in the Blueprint editor.',
          },
        },
        {
          type: 'list',
          items: [
            '**Unreal forbids the C++ workaround.** In standard C++ you might reach for [[multiple-inheritance]]. A `UCLASS` can inherit from only **one** `UObject`-derived class (plus Unreal interfaces), so behaviour has to be composed.',
            '**Designers can compose without code.** Any component marked spawnable can be added to any actor in the Blueprint editor and configured there.',
            '**Capabilities become queryable.** Instead of asking "is this a `ATreasureChest`?", code asks "does this actor have a coin purse?" — and works with chests, players and merchants alike.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why this is the industry default',
          text: '[[composition-over-inheritance|Composition over inheritance]] is a general design principle, but games push it hard because game objects are combinations of features that designers change weekly. Unreal\'s actor/component model, Unity\'s GameObject/component model and entity-component systems all exist for the same reason: shallow class hierarchies and reusable behaviour scale to large teams and fast iteration.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'Barrels, enemies and the player character must all be able to catch fire, take burn damage and spread flames. They share no base class other than `AActor`. What is the best design?',
      options: [
        {
          text: 'Create `ABurnableActor` and make barrels, enemies and the player derive from it',
          why: '`ACharacter`-based classes and barrels already have different parents. Forcing them under a common base is invasive, and the next shared feature would need another base class.',
        },
        {
          text: 'Write a `UBurnableComponent` and add it to each of those actors',
          correct: true,
          why: 'Correct. The behaviour is written once, works on any actor, can be added by designers, and other code can check for it with `FindComponentByClass`.',
        },
        {
          text: 'Make each class inherit from both its current parent and a `UBurnable` `UObject` class',
          why: 'A `UCLASS` may only derive from one `UObject`-based class. (Unreal interfaces allow multiple *interfaces*, but they do not carry state like burn timers.)',
        },
        {
          text: 'Copy the burning code into the barrel, enemy and player classes',
          why: 'Three copies drift apart: a bug fixed in one stays broken in the others.',
        },
      ],
      explanation:
        'When a capability cuts across unrelated classes, make it a component. That is composition over inheritance in practice — and it is how Unreal itself provides movement, cameras, audio and collision.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Writing your own ActorComponent',
      blocks: [
        {
          type: 'p',
          text: 'Let\'s build a reusable coin purse. Players carry one, treasure chests carry one, merchants carry one — and any of them can be looted the same way.',
        },
        {
          type: 'code',
          title: 'CoinPurseComponent.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "CoinPurseComponent.generated.h"

UCLASS(ClassGroup = (Custom),
    meta = (BlueprintSpawnableComponent))
class MYGAME_API UCoinPurseComponent : public UActorComponent {
    GENERATED_BODY()

public:
    UCoinPurseComponent();

    UFUNCTION(BlueprintCallable, Category = "Coins")
    void AddCoins(int32 Amount);

    UFUNCTION(BlueprintCallable, Category = "Coins")
    bool TrySpend(int32 Cost);

    int32 GetCoins() const { return Coins; }

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY(EditAnywhere, Category = "Coins",
        meta = (ClampMin = "0"))
    int32 StartingCoins = 0;

    UPROPERTY(VisibleInstanceOnly, Category = "Coins")
    int32 Coins = 0;
};`,
          annotations: [
            { lines: '7-8', text: '`BlueprintSpawnableComponent` lists the class in the Blueprint editor\'s *Add Component* menu; `ClassGroup` decides which section it appears in.' },
            { lines: 9, text: 'Logic only, so `UActorComponent` — the cheapest tier.' },
            { lines: '27-29', text: 'Designers set the starting amount per actor: 0 for the player, 250 for a chest.' },
            { lines: '31-32', text: 'The live value, visible (read-only) on placed instances while playing — handy for debugging.' },
          ],
        },
        {
          type: 'code',
          title: 'CoinPurseComponent.cpp',
          code: `#include "CoinPurseComponent.h"

UCoinPurseComponent::UCoinPurseComponent() {
    PrimaryComponentTick.bCanEverTick = false;
}

void UCoinPurseComponent::BeginPlay() {
    Super::BeginPlay();
    Coins = StartingCoins;
}

void UCoinPurseComponent::AddCoins(int32 Amount) {
    Coins += FMath::Max(Amount, 0);
}

bool UCoinPurseComponent::TrySpend(int32 Cost) {
    if (Cost < 0 || Cost > Coins) {
        return false;
    }
    Coins -= Cost;
    return true;
}`,
          annotations: [
            { lines: 4, text: 'Components tick through `PrimaryComponentTick` and override `TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)`. A purse never needs to.' },
            { lines: '7-10', text: 'Components have the same lifecycle shape as actors — `BeginPlay`, `EndPlay`, plus `OnRegister`/`OnUnregister` — and the same need to call `Super::`.' },
          ],
        },
        {
          type: 'code',
          title: 'Using it from anywhere',
          code: `// In a chest's constructor:
Purse = CreateDefaultSubobject<UCoinPurseComponent>(
    TEXT("CoinPurse"));

// When the player loots any actor:
void AHeroCharacter::Loot(AActor* Target) {
    UCoinPurseComponent* TheirPurse =
        Target->FindComponentByClass<UCoinPurseComponent>();
    if (TheirPurse && MyPurse) {
        const int32 Amount = TheirPurse->GetCoins();
        if (TheirPurse->TrySpend(Amount)) {
            MyPurse->AddCoins(Amount);
        }
    }
}`,
          annotations: [
            { lines: '2-3', text: 'Logic components need no `SetupAttachment`: they have no transform to attach.' },
            { lines: '7-8', text: '`FindComponentByClass` asks "does this actor have a purse?" — it neither knows nor cares whether `Target` is a chest, a merchant or a fallen enemy.' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'fill',
      prompt: 'Complete a stamina component that designers can add in the Blueprint editor and that regenerates every frame.',
      template: `UCLASS(ClassGroup = (Custom), meta = (___))
class MYGAME_API UStaminaComponent : public ___ {
    GENERATED_BODY()

public:
    UStaminaComponent() {
        PrimaryComponentTick.bCanEverTick = true;
    }

    virtual void ___(float DeltaTime, ELevelTick TickType,
        FActorComponentTickFunction* ThisTickFunction) override;
};`,
      blanks: [{ answers: ['BlueprintSpawnableComponent'] }, { answers: ['UActorComponent'] }, { answers: ['TickComponent'] }],
      wordBank: ['BlueprintSpawnableComponent', 'UActorComponent', 'TickComponent', 'Blueprintable', 'USceneComponent', 'Tick', 'AActor'],
      explanation:
        '`BlueprintSpawnableComponent` puts the class in the *Add Component* menu. Stamina needs no position, so `UActorComponent` is the right tier. Components tick through `TickComponent` (with the tick type and tick function parameters), not the actor\'s `Tick(float)`; overriding the wrong name would fail to compile because of `override`.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'A trap should drain coins from **anything** that walks over it and carries a coin purse — players, enemies, even a runaway cart. Which approach fits the component model best?',
      options: [
        {
          text: '`Cast` the overlapping actor to `AHeroCharacter` and use its purse',
          why: 'That only works for heroes. Enemies and carts with purses would be ignored, and the trap would need a new cast for every new class.',
        },
        {
          text: 'Make every actor class that can carry coins derive from `ACoinCarrier`',
          why: 'This drags inheritance back in: carts and characters already have different parents, and the next shared capability would need yet another base.',
        },
        {
          text: 'Look for the component: `OtherActor->FindComponentByClass<UCoinPurseComponent>()`',
          correct: true,
          why: 'Correct. The trap depends on the capability, not the class. Anything with a purse — now or added later by a designer — just works.',
        },
        {
          text: 'Store a list of every coin-carrying class in the trap and compare `GetClass()` against it',
          why: 'Fragile and incomplete: every new class (including designers\' Blueprint classes) would have to be added by hand.',
        },
      ],
      explanation:
        'With composition, systems ask about capabilities ("has a purse?", "is burnable?") instead of identities ("is a hero?"). That keeps systems decoupled from class hierarchies and lets designers create new combinations without touching the trap\'s code.',
    },
  ],
  takeaways: [
    'Actors are containers; their abilities, position and visuals come from components.',
    '`UActorComponent` is logic only, `USceneComponent` adds a transform and attachment, `UPrimitiveComponent` adds rendering and collision — pick the lowest tier that works.',
    'An actor\'s transform is its root component\'s transform; children store relative transforms. Make the collision shape the root, because sweeps use only the root.',
    'In constructors, create components with `CreateDefaultSubobject` and wire them with `SetupAttachment`; at run time, use `AttachToComponent` with an attachment rule.',
    'Run-time components are made with `NewObject`, then `RegisterComponent()` — `SetupAttachment` is fine only before registration.',
    'Composition over inheritance: a `UCLASS` has a single `UObject` base, so cross-cutting behaviour belongs in components, found with `FindComponentByClass`.',
  ],
  reading: [
    {
      title: 'Components',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/components-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s overview of actor, scene and primitive components, registration and ticking.',
    },
    {
      title: 'Actors',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/actors-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How actors relate to their components and the root component.',
    },
    {
      title: 'Component (Game Programming Patterns)',
      url: 'https://gameprogrammingpatterns.com/component.html',
      source: 'book',
      note: 'A clear explanation of why games split objects into components, with the trade-offs.',
    },
    {
      title: 'Composition over inheritance',
      url: 'https://en.wikipedia.org/wiki/Composition_over_inheritance',
      source: 'article',
      note: 'The general design principle behind Unreal\'s actor/component model.',
    },
  ],
};
