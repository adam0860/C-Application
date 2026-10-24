import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-capstone-pickup',
  title: 'An Interactive Pickup',
  summary:
    'Build a rotating, respawning health pickup with sound, Niagara effects and a Blueprint hook — C++ mechanics, designer-owned content.',
  minutes: 20,
  objectives: [
    'Structure a pickup as an abstract C++ base class with a virtual effect hook and thin subclasses',
    'Set up a sphere collision root, a non-colliding mesh and a `URotatingMovementComponent`, and justify each choice',
    'Bind an overlap event and guard it so only valid collectors trigger the effect',
    'Find a capability on another actor with `FindComponentByClass` instead of casting to a concrete class',
    'Play fire-and-forget sound and Niagara effects, expose a `BlueprintImplementableEvent`, and respawn with a timer',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'The brief: a pickup designers love',
      blocks: [
        {
          type: 'p',
          text: 'A glowing health pack floats and spins above the floor. Walk through it and you are healed, it plays a sound and a burst of particles, and it disappears — returning ten seconds later. If you are already at full health, it stays put for someone who needs it. Later the team will want ammo, armor and speed pickups that behave the same way.',
        },
        {
          type: 'table',
          headers: ['Layer', 'Owns', 'Changes when…'],
          rows: [
            ['`APickupBase` (C++, abstract)', 'Collision, rotation, overlap rules, feedback, respawn', 'The *mechanics* of all pickups change'],
            ['`AHealthPickup` (C++)', 'Only the effect: heal the collector', 'Healing rules change'],
            ['`BP_HealthPickup` (Blueprint)', 'Mesh, sound, VFX, heal amount, flourishes', 'An artist or designer tweaks content'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why split it three ways?',
          text: 'Each layer changes for a different reason and is edited by a different person. Shared mechanics written once in C++ mean a respawn bug is fixed for every pickup at once. Thin subclasses keep each effect tiny and testable. And Blueprint subclasses let designers create `BP_MegaHealth` without waiting for a programmer — the C++ / Blueprint workflow from earlier in the course, applied for real.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Step 1: components — sphere, mesh and rotation',
      blocks: [
        {
          type: 'code',
          title: 'PickupBase.h (first version)',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "PickupBase.generated.h"

class USphereComponent;
class UStaticMeshComponent;
class URotatingMovementComponent;

UCLASS(Abstract)
class MYGAME_API APickupBase : public AActor
{
    GENERATED_BODY()

public:
    APickupBase();

protected:
    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<USphereComponent> CollisionSphere;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<UStaticMeshComponent> MeshComponent;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<URotatingMovementComponent> RotatingMovement;
};`,
          annotations: [
            { lines: '7-9', text: 'Forward declarations: the header stores only pointers.' },
            { lines: 11, text: '`Abstract`: a generic "pickup that does nothing" must never be placed in a level. Only subclasses can be.' },
            { lines: '20-27', text: '`VisibleAnywhere` lets designers select each component and edit *its* properties (mesh asset, sphere radius, rotation rate) while the pointer itself stays fixed.' },
          ],
        },
        {
          type: 'code',
          title: 'PickupBase.cpp',
          code: `#include "PickupBase.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/RotatingMovementComponent.h"

APickupBase::APickupBase()
{
    PrimaryActorTick.bCanEverTick = false;

    CollisionSphere = CreateDefaultSubobject<USphereComponent>(
        TEXT("CollisionSphere"));
    CollisionSphere->InitSphereRadius(60.f);
    CollisionSphere->SetCollisionProfileName(
        TEXT("OverlapAllDynamic"));
    SetRootComponent(CollisionSphere);

    MeshComponent = CreateDefaultSubobject<UStaticMeshComponent>(
        TEXT("Mesh"));
    MeshComponent->SetupAttachment(CollisionSphere);
    MeshComponent->SetCollisionEnabled(
        ECollisionEnabled::NoCollision);

    RotatingMovement = CreateDefaultSubobject<
        URotatingMovementComponent>(TEXT("RotatingMovement"));
    RotatingMovement->RotationRate = FRotator(0.f, 90.f, 0.f);
    RotatingMovement->UpdatedComponent = MeshComponent;
}`,
          annotations: [
            { lines: 8, text: 'The actor itself never ticks. Rotation is handled by a component, and everything else is event-driven.' },
            { lines: '12-14', text: 'A generous 60 cm radius makes pickups feel forgiving. The built-in `OverlapAllDynamic` [[collision-profile|collision profile]] overlaps everything and blocks nothing, so the player walks straight through.' },
            { lines: 15, text: 'The *sphere* is the root: the actor\'s collision is a cheap, simple shape that designers can tune independently of the art.' },
            { lines: '20-21', text: 'The mesh is visual only. Without this it could block the player or generate a second set of overlaps.' },
            { lines: '23-26', text: 'A [[rotating-movement-component]] spins the mesh 90°/s around its vertical axis (yaw). Pointing `UpdatedComponent` at the mesh rotates only the visuals, not the collision root — the same pattern Epic\'s templates use for projectile movement.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a movement component instead of Tick?',
          text: 'You could override Tick and call `AddActorLocalRotation(FRotator(0, 90 * DeltaTime, 0))`. But the component gives you the same result with **no code to maintain**, keeps the actor\'s own Tick disabled, exposes `RotationRate` so designers can tune each pickup, and can be paused with one call when the pickup is hidden. It is not free — it still ticks every frame — but it is reusable, data-driven and off when not needed.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Hundreds of spinning coins?',
          text: 'For large numbers of purely decorative spinners, move the rotation to the GPU: a material using **World Position Offset** (for example with the `RotateAboutAxis` material function) spins the mesh at zero CPU cost, because no component ever ticks.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Why is a `USphereComponent` the pickup\'s root, with collision disabled on the mesh, rather than using the mesh\'s own collision?',
      options: [
        {
          text: 'Static meshes cannot generate overlap events',
          why: 'They can, if overlap events are enabled and the collision settings allow it. The choice is about design and cost, not capability.',
        },
        {
          text: 'A simple, dedicated shape makes the pickup area cheap to test and tunable independently of the art, and stops the mesh from blocking or double-overlapping',
          correct: true,
          why: 'Gameplay collision should be a deliberate, simple shape. Artists can swap the mesh freely without changing how close the player must get, and only one component generates overlaps.',
        },
        {
          text: '`URotatingMovementComponent` only works when the root is a sphere',
          why: 'It can rotate any scene component. Here it rotates the mesh, not the sphere.',
        },
        {
          text: 'Blueprint subclasses cannot change a C++ root component\'s mesh',
          why: 'Designers can change the mesh asset on an inherited mesh component freely in the Details panel.',
        },
      ],
      explanation:
        'Separating *gameplay collision* from *visuals* is a standard Unreal pattern: characters use a capsule, projectiles a small sphere, pickups a forgiving sphere. The visual mesh can then be as detailed as the artists like without affecting gameplay or collision cost.',
    },
    {
      kind: 'concept',
      title: 'Step 2: the effect hook',
      blocks: [
        {
          type: 'p',
          text: 'The base class knows *when* a pickup is collected but not *what it does*. That variation point is a [[virtual-function]] that each subclass overrides. It returns `bool` so an effect can refuse: a health pack should not be wasted on a player at full health.',
        },
        {
          type: 'code',
          title: 'PickupBase.h (protected section)',
          code: `protected:
    // Apply the effect to Collector. Return true if the
    // pickup was used up, false to leave it in the world.
    virtual bool TryApplyEffect(AActor* Collector)
        PURE_VIRTUAL(APickupBase::TryApplyEffect, return false;);`,
          annotations: [
            { lines: '4-5', text: 'A UCLASS cannot have a real `= 0` pure virtual, because the engine must construct its CDO. `PURE_VIRTUAL` (from the assertions lesson) gives it a body that fails loudly if a subclass forgets to override it.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Virtual hook on the pickup',
            tone: 'good',
            code: `// AHealthPickup decides what happens
bool AHealthPickup::TryApplyEffect(
    AActor* Collector) override;`,
            text: 'Best when **pickup types** vary (health, ammo, armor) and collectors are similar. Adding a pickup means adding one small subclass.',
          },
          right: {
            title: 'Interface on the collector',
            tone: 'neutral',
            code: `// The collector decides what happens
UINTERFACE(MinimalAPI)
class UPickupCollector : public UInterface
{ GENERATED_BODY() };`,
            text: 'Best when **collectors** vary wildly (players, vehicles, pets) and each must react in its own way. A [[uinterface]] lets unrelated classes opt in.',
          },
        },
        {
          type: 'p',
          text: 'Here pickup types will multiply while collectors are mostly pawns, so the virtual hook wins. Note how the decision follows from *which axis varies* — the same reasoning you used when choosing between inheritance, interfaces and components earlier in the course. (If designers should be able to write effects entirely in Blueprint, the hook could become a `BlueprintNativeEvent` instead.)',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Step 3: overlap — deciding who may collect',
      blocks: [
        {
          type: 'p',
          text: 'The sphere\'s `OnComponentBeginOverlap` fires for anything that starts overlapping it: players, AI, rolling barrels, projectiles. The handler\'s job is to filter ruthlessly before applying anything.',
        },
        {
          type: 'code',
          title: 'PickupBase.cpp',
          code: `void APickupBase::BeginPlay()
{
    Super::BeginPlay();
    CollisionSphere->OnComponentBeginOverlap.AddDynamic(
        this, &APickupBase::HandleOverlap);
}

void APickupBase::HandleOverlap(
    UPrimitiveComponent* OverlappedComponent,
    AActor* OtherActor, UPrimitiveComponent* OtherComp,
    int32 OtherBodyIndex, bool bFromSweep,
    const FHitResult& SweepResult)
{
    if (!bIsActive || !HasAuthority())
    {
        return;
    }

    APawn* Collector = Cast<APawn>(OtherActor);
    if (!Collector || !TryApplyEffect(Collector))
    {
        return;
    }

    PlayPickupFeedback();
    OnPickedUp(Collector);
    Deactivate();   // hide, then respawn later (Step 7)
}`,
          annotations: [
            { lines: '4-5', text: 'Bound in BeginPlay, like every delegate in this capstone. The handler is a private `UFUNCTION()` whose six parameters match `FComponentBeginOverlapSignature` exactly — the [[overlap-event|overlap event]] signature from the delegates unit.' },
            { lines: 14, text: '`bIsActive` ignores overlaps while hidden. `HasAuthority()` keeps the decision on the server in multiplayer; in single player it is always true.' },
            { lines: 19, text: 'Only pawns collect. A rolling barrel or a projectile fails the cast and is ignored — remember from the crashes lesson that the null check is mandatory.' },
            { lines: 20, text: '`||` short-circuits: `TryApplyEffect` only runs for a real pawn. If it returns `false` (full health), the pickup stays.' },
            { lines: '25-27', text: 'Feedback, the designer hook and deactivation — each built in the steps below.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Overlaps need consent from both sides',
          text: 'An overlap event fires only if **both** components have *Generate Overlap Events* enabled and their responses to each other\'s object types resolve to *Overlap*. Character capsules have it enabled by default. If a pickup mysteriously ignores someone, check both sides with `show collision` and the collision presets.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'Testers report that walking back over the spot where a collected pickup *used to be* heals them again, even though nothing is visible. Tap the line that does not do what its author thinks.',
      code: `void APickupBase::Collect(APawn* Collector)
{
    if (!TryApplyEffect(Collector))
    {
        return;
    }
    PlayPickupFeedback();

    // Gone until it respawns
    SetActorHiddenInGame(true);

    GetWorldTimerManager().SetTimer(RespawnTimerHandle,
        this, &APickupBase::Respawn, RespawnDelay, false);
}`,
      bugLines: [10],
      hint: 'What does "hidden" affect, and what does it leave untouched?',
      explanation:
        '`SetActorHiddenInGame(true)` only stops the actor from *rendering*. Its collision sphere is still there, so every re-entry fires a new overlap and heals again. Deactivation must also call `SetActorEnableCollision(false)` (and ideally set an `bIsActive` flag that the overlap handler checks), then restore both on respawn.',
    },
    {
      kind: 'concept',
      title: 'Step 4: the heal effect — ask for a capability, not a class',
      blocks: [
        {
          type: 'code',
          title: 'HealthPickup.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "PickupBase.h"
#include "HealthPickup.generated.h"

UCLASS()
class MYGAME_API AHealthPickup : public APickupBase
{
    GENERATED_BODY()

protected:
    virtual bool TryApplyEffect(AActor* Collector) override;

    UPROPERTY(EditAnywhere, Category = "Pickup",
        meta = (ClampMin = "1.0"))
    float HealAmount = 25.f;
};`,
          annotations: [
            { lines: 4, text: 'The base class must be complete, so this one header is included rather than forward-declared.' },
            { lines: 13, text: '`virtual` + `override`: if the base signature ever changes, this line becomes a compile error instead of a silently unused function.' },
            { lines: '15-17', text: '`EditAnywhere` so a level designer can make one special pack heal more, right in the level.' },
          ],
        },
        {
          type: 'code',
          title: 'HealthPickup.cpp',
          code: `#include "HealthPickup.h"
#include "HealthComponent.h"

bool AHealthPickup::TryApplyEffect(AActor* Collector)
{
    UHealthComponent* Health =
        Collector->FindComponentByClass<UHealthComponent>();
    if (!Health || Health->IsDead()
        || Health->GetCurrentHealth() >= Health->GetMaxHealth())
    {
        return false;   // nothing to heal: leave it for later
    }

    Health->Heal(HealAmount);
    return true;
}`,
          annotations: [
            { lines: 2, text: 'The health component from the previous capstone. The pickup needs its full definition to call methods on it.' },
            { lines: '6-7', text: '`FindComponentByClass<T>()` returns the first component of type `T` on the actor, or `nullptr`. It works on *any* actor with health: the player, an AI ally, a repair drone.' },
            { lines: '8-12', text: 'Refusing means the pickup is not consumed. Dead collectors and full-health collectors both leave it for someone else.' },
            { lines: 14, text: '`Heal` already clamps to `MaxHealth` and broadcasts `OnHealthChanged`, so the HUD updates without the pickup knowing a HUD exists.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not Cast<AMyCharacter>?',
          text: 'A cast asks "*are you* my player character class?". `FindComponentByClass` asks "*can you* be healed?". The first ties the pickup to one class forever; the second works with every current and future actor that has a health component. Decoupling through capabilities is what made the component worth building. The cost — a short linear search of the actor\'s components — is negligible for an event that happens once, though you would cache it if it ran every frame.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'A subtle gameplay detail',
          text: 'Overlap events fire when overlapping *begins*. A full-health player standing inside the sphere who then takes damage will not trigger a new overlap until they step out and back in. Many games accept this; if yours should not, listen for the collector\'s `OnHealthChanged` while it overlaps, or re-check overlapping pawns on a short timer.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the heal effect so it works with any actor that has health, and leaves the pickup in place when there is nothing to heal.',
      template: `bool AHealthPickup::TryApplyEffect(AActor* Collector)
{
    UHealthComponent* Health =
        Collector->___<UHealthComponent>();
    if (!Health || Health->IsDead()
        || Health->GetCurrentHealth() >= Health->GetMaxHealth())
    {
        return ___;
    }
    Health->Heal(HealAmount);
    return true;
}`,
      blanks: [{ answers: ['FindComponentByClass'] }, { answers: ['false'] }],
      wordBank: ['FindComponentByClass', 'Cast', 'CreateDefaultSubobject', 'GetComponents', 'false', 'true', 'nullptr'],
      explanation:
        '`FindComponentByClass<UHealthComponent>()` looks for the capability on whatever actor touched the pickup. `CreateDefaultSubobject` would try to *create* a component (and only works in constructors), and `Cast` converts objects, not components. Returning `false` tells the base class the pickup was not used, so it stays in the world.',
    },
    {
      kind: 'concept',
      title: 'Step 5: feedback — sound and Niagara',
      blocks: [
        {
          type: 'code',
          title: 'PickupBase.h (additions)',
          code: `class USoundBase;
class UNiagaraSystem;

// ...inside the class, protected:
    UPROPERTY(EditDefaultsOnly, Category = "Pickup|Feedback")
    TObjectPtr<USoundBase> PickupSound;

    UPROPERTY(EditDefaultsOnly, Category = "Pickup|Feedback")
    TObjectPtr<UNiagaraSystem> PickupEffect;`,
          annotations: [
            { lines: '5-9', text: 'Asset slots filled in by `BP_HealthPickup`. The `|` in the category creates a nested "Feedback" group in the Details panel.' },
          ],
        },
        {
          type: 'code',
          title: 'PickupBase.cpp',
          code: `#include "Kismet/GameplayStatics.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraSystem.h"
#include "Sound/SoundBase.h"

void APickupBase::PlayPickupFeedback()
{
    const FVector Location = GetActorLocation();

    UGameplayStatics::PlaySoundAtLocation(
        this, PickupSound, Location);

    if (PickupEffect)
    {
        UNiagaraFunctionLibrary::SpawnSystemAtLocation(
            this, PickupEffect, Location);
    }
}`,
          annotations: [
            { lines: '1-4', text: 'Full headers in the `.cpp` only. `NiagaraFunctionLibrary.h` comes from the Niagara plugin, which needs a Build.cs dependency (below).' },
            { lines: '10-11', text: 'Plays a one-shot sound in the world. The first argument is a world-context object, used only to find the world. It safely does nothing if no sound was assigned.' },
            { lines: '13-17', text: 'Spawns a [[niagara]] effect that cleans itself up when finished. The explicit check documents that the effect is optional.' },
          ],
        },
        {
          type: 'code',
          lang: 'csharp',
          title: 'MyGame.Build.cs (excerpt)',
          code: `PublicDependencyModuleNames.AddRange(new string[] {
    "Core", "CoreUObject", "Engine", "InputCore",
    "EnhancedInput", "Niagara" });`,
          annotations: [
            { lines: 3, text: 'Without `"Niagara"` here the code compiles but fails to *link*: the Niagara functions live in another module, and the linker must be told about it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why "at location" rather than attached?',
          text: 'The pickup is about to be hidden or destroyed. A sound or effect *attached* to it would be cut off or vanish with it. `PlaySoundAtLocation` and `SpawnSystemAtLocation` create independent, fire-and-forget objects owned by the world, so the feedback plays out fully no matter what happens to the pickup.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Cosmetics are local',
          text: 'Both functions play only on the machine that calls them — they are not replicated. Because our overlap handler runs on the server only, clients in a multiplayer game would hear and see nothing (and a dedicated server has no speakers at all). Real multiplayer pickups trigger cosmetics on clients, for example from a RepNotify on a replicated `bIsActive`, or through an unreliable multicast RPC.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Calling `UGameplayStatics::PlaySoundAtLocation` on the server makes the sound play for every connected client.',
      answer: false,
      explanation:
        'Sounds and particle effects are cosmetic and local: they play only where the function runs. On a dedicated server they play nowhere. To give clients feedback, run the cosmetic code on each client — via a RepNotify on replicated state, or an unreliable `NetMulticast` RPC for one-off events.',
    },
    {
      kind: 'concept',
      title: 'Step 6: a hook for designers — BlueprintImplementableEvent',
      blocks: [
        {
          type: 'p',
          text: 'Designers will want extra flourishes: a camera shake, a "+25 HP" popup, quest progress. None of that belongs in C++ — it changes weekly and differs per pickup. So C++ decides **when** something happens and hands designers an event to decide **what else** happens.',
        },
        {
          type: 'code',
          title: 'PickupBase.h (protected)',
          code: `    // Designer hook: camera shake, UI popup, quest progress...
    UFUNCTION(BlueprintImplementableEvent, Category = "Pickup")
    void OnPickedUp(AActor* Collector);`,
          annotations: [
            { lines: '2-3', text: 'A [[blueprint-implementable-event]] has **no C++ body** — UHT generates one that calls into the Blueprint. In the Blueprint editor it appears as an event node, **Event On Picked Up**.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'BlueprintImplementableEvent',
            tone: 'neutral',
            code: `UFUNCTION(BlueprintImplementableEvent)
void OnPickedUp(AActor* Collector);
// no C++ definition at all`,
            text: 'C++ fires it; only Blueprint implements it. If no Blueprint does, the call does nothing.',
          },
          right: {
            title: 'BlueprintNativeEvent',
            tone: 'neutral',
            code: `UFUNCTION(BlueprintNativeEvent)
void OnPickedUp(AActor* Collector);
// C++ default in OnPickedUp_Implementation()`,
            text: 'Has a C++ default that Blueprints may override (and extend by calling the parent). Use it when there is sensible default behavior.',
          },
        },
        {
          type: 'p',
          text: 'We call `OnPickedUp(Collector)` after applying the effect, so the Blueprint can rely on the heal having happened. Firing events *after* state changes is a good general rule: listeners then see a consistent world.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: '`BP_HealthPickup` does not implement **Event On Picked Up**. What happens when C++ calls `OnPickedUp(Collector)`?',
      options: [
        {
          text: 'A linker error, because `OnPickedUp` has no C++ definition',
          why: 'You must *not* write a definition yourself — UHT generates the C++ body in the `.gen.cpp`, so the link succeeds.',
        },
        {
          text: 'A crash, because the Blueprint function pointer is null',
          why: 'The generated body looks the function up through reflection and simply finds no Blueprint implementation. Nothing is dereferenced.',
        },
        {
          text: 'Nothing: the call is a harmless no-op',
          correct: true,
          why: 'Unimplemented `BlueprintImplementableEvent`s do nothing, so C++ can call them unconditionally and designers can opt in per Blueprint.',
        },
        {
          text: 'An ensure fires to remind the designer to implement it',
          why: 'Not implementing an optional event is perfectly normal, so the engine stays silent.',
        },
      ],
      explanation:
        'A `BlueprintImplementableEvent` is an optional extension point. UHT generates its C++ body, which calls the Blueprint override if there is one. That makes it safe to sprinkle such hooks at meaningful moments — designers get control without programmers adding special cases.',
    },
    {
      kind: 'concept',
      title: 'Step 7: deactivate and respawn with a timer',
      blocks: [
        {
          type: 'code',
          title: 'PickupBase.cpp',
          code: `void APickupBase::Deactivate()
{
    SetPickupActive(false);

    if (RespawnDelay > 0.f)
    {
        GetWorldTimerManager().SetTimer(RespawnTimerHandle,
            this, &APickupBase::Respawn, RespawnDelay, false);
    }
    else
    {
        Destroy();   // single-use pickup
    }
}

void APickupBase::Respawn()
{
    SetPickupActive(true);
}

void APickupBase::SetPickupActive(bool bActive)
{
    bIsActive = bActive;
    SetActorHiddenInGame(!bActive);
    SetActorEnableCollision(bActive);
    RotatingMovement->SetComponentTickEnabled(bActive);
}`,
          annotations: [
            { lines: '7-8', text: 'A one-shot [[timer-manager|timer]] (`false` = do not loop). The timer is bound to `this` as a UObject, so if the pickup is destroyed first, the timer manager notices and never calls it.' },
            { lines: 12, text: '`RespawnDelay` is `EditAnywhere` with `ClampMin = "0.0"`: 0 turns any pickup into a single-use one, chosen per instance in the level.' },
            { lines: '23-26', text: 'One function owns the active state: hidden, no collision, no rotation cost, overlaps ignored. Respawning is just the reverse.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why hide instead of destroy-and-respawn?',
          text: 'Destroying and spawning a new actor costs more (allocation, component registration, BeginPlay) and loses identity: anything referencing this pickup — a level script, a quest marker, a save system — would be left with a dead pointer. Hiding keeps the same actor, its placement and its settings, so respawning is nearly free.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Taking it to multiplayer',
          text: 'Mark the actor `bReplicates = true`, make `bIsActive` a `ReplicatedUsing = OnRep_IsActive` property, and have `OnRep_IsActive` call the same visual part of `SetPickupActive` (and play feedback when it turns false) on clients. The server keeps all the decisions; clients only react — the pattern you used for health.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'A wounded player walks into a health pack with a 10-second respawn. Put the events in order.',
      lines: [
        'The sphere\'s `OnComponentBeginOverlap` fires `HandleOverlap`',
        'The handler checks `bIsActive`, authority and that the actor is a pawn',
        '`TryApplyEffect` finds the health component and calls `Heal`',
        'Sound and Niagara effects play and `OnPickedUp` fires in Blueprint',
        '`SetPickupActive(false)` hides it and disables its collision',
        'Ten seconds later the timer calls `Respawn`, which reactivates it',
      ],
      distractors: ['`Destroy()` removes the pickup, then `SpawnActor` creates a replacement after the delay'],
      explanation:
        'Validation comes before any effect, feedback and the designer hook come after the state change, and deactivation reuses the same actor rather than destroying and respawning it. That ordering keeps the pickup correct (no double collection), consistent for listeners, and cheap.',
    },
    {
      kind: 'concept',
      title: 'The complete pickup',
      blocks: [
        {
          type: 'code',
          title: 'PickupBase.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "PickupBase.generated.h"

class USphereComponent;
class UStaticMeshComponent;
class URotatingMovementComponent;
class USoundBase;
class UNiagaraSystem;

UCLASS(Abstract)
class MYGAME_API APickupBase : public AActor
{
    GENERATED_BODY()

public:
    APickupBase();

protected:
    virtual void BeginPlay() override;

    // Return true if the pickup was used up.
    virtual bool TryApplyEffect(AActor* Collector)
        PURE_VIRTUAL(APickupBase::TryApplyEffect, return false;);

    UFUNCTION(BlueprintImplementableEvent, Category = "Pickup")
    void OnPickedUp(AActor* Collector);

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<USphereComponent> CollisionSphere;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<UStaticMeshComponent> MeshComponent;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<URotatingMovementComponent> RotatingMovement;

    UPROPERTY(EditDefaultsOnly, Category = "Pickup|Feedback")
    TObjectPtr<USoundBase> PickupSound;

    UPROPERTY(EditDefaultsOnly, Category = "Pickup|Feedback")
    TObjectPtr<UNiagaraSystem> PickupEffect;

    // Seconds until it reappears. 0 = single use.
    UPROPERTY(EditAnywhere, Category = "Pickup",
        meta = (ClampMin = "0.0"))
    float RespawnDelay = 10.f;

private:
    UFUNCTION()
    void HandleOverlap(UPrimitiveComponent* OverlappedComponent,
        AActor* OtherActor, UPrimitiveComponent* OtherComp,
        int32 OtherBodyIndex, bool bFromSweep,
        const FHitResult& SweepResult);

    void PlayPickupFeedback();
    void Deactivate();
    void Respawn();
    void SetPickupActive(bool bActive);

    FTimerHandle RespawnTimerHandle;
    bool bIsActive = true;
};`,
          annotations: [
            { lines: '24-29', text: 'The two extension points: a C++ virtual for the effect, a Blueprint event for flourishes.' },
            { lines: '31-49', text: 'Components, content slots and tuning — everything a designer touches.' },
            { lines: '52-64', text: 'Private mechanics no subclass needs to see. `FTimerHandle` and `bIsActive` are plain data, so they need no `UPROPERTY`.' },
          ],
        },
        {
          type: 'code',
          title: 'PickupBase.cpp',
          code: `#include "PickupBase.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/RotatingMovementComponent.h"
#include "Kismet/GameplayStatics.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraSystem.h"
#include "Sound/SoundBase.h"
#include "TimerManager.h"

APickupBase::APickupBase()
{
    PrimaryActorTick.bCanEverTick = false;

    CollisionSphere = CreateDefaultSubobject<USphereComponent>(
        TEXT("CollisionSphere"));
    CollisionSphere->InitSphereRadius(60.f);
    CollisionSphere->SetCollisionProfileName(
        TEXT("OverlapAllDynamic"));
    SetRootComponent(CollisionSphere);

    MeshComponent = CreateDefaultSubobject<UStaticMeshComponent>(
        TEXT("Mesh"));
    MeshComponent->SetupAttachment(CollisionSphere);
    MeshComponent->SetCollisionEnabled(
        ECollisionEnabled::NoCollision);

    RotatingMovement = CreateDefaultSubobject<
        URotatingMovementComponent>(TEXT("RotatingMovement"));
    RotatingMovement->RotationRate = FRotator(0.f, 90.f, 0.f);
    RotatingMovement->UpdatedComponent = MeshComponent;
}

void APickupBase::BeginPlay()
{
    Super::BeginPlay();
    CollisionSphere->OnComponentBeginOverlap.AddDynamic(
        this, &APickupBase::HandleOverlap);
}

void APickupBase::HandleOverlap(
    UPrimitiveComponent* OverlappedComponent,
    AActor* OtherActor, UPrimitiveComponent* OtherComp,
    int32 OtherBodyIndex, bool bFromSweep,
    const FHitResult& SweepResult)
{
    if (!bIsActive || !HasAuthority())
    {
        return;
    }

    APawn* Collector = Cast<APawn>(OtherActor);
    if (!Collector || !TryApplyEffect(Collector))
    {
        return;
    }

    PlayPickupFeedback();
    OnPickedUp(Collector);
    Deactivate();
}

void APickupBase::PlayPickupFeedback()
{
    const FVector Location = GetActorLocation();
    UGameplayStatics::PlaySoundAtLocation(
        this, PickupSound, Location);
    if (PickupEffect)
    {
        UNiagaraFunctionLibrary::SpawnSystemAtLocation(
            this, PickupEffect, Location);
    }
}

void APickupBase::Deactivate()
{
    SetPickupActive(false);
    if (RespawnDelay > 0.f)
    {
        GetWorldTimerManager().SetTimer(RespawnTimerHandle,
            this, &APickupBase::Respawn, RespawnDelay, false);
    }
    else
    {
        Destroy();
    }
}

void APickupBase::Respawn()
{
    SetPickupActive(true);
}

void APickupBase::SetPickupActive(bool bActive)
{
    bIsActive = bActive;
    SetActorHiddenInGame(!bActive);
    SetActorEnableCollision(bActive);
    RotatingMovement->SetComponentTickEnabled(bActive);
}`,
          annotations: [
            { lines: '1-10', text: 'Every type the file uses has its header included here, and only here.' },
            { lines: '12-33', text: 'Construction: components and defaults only — nothing that needs a world.' },
            { lines: '35-40', text: 'Runtime wiring in BeginPlay.' },
            { lines: '42-62', text: 'Filter, apply, give feedback, notify designers, deactivate.' },
            { lines: '76-101', text: 'Respawn logic: one owner of the active state.' },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A level designer wants 300 decorative spinning coins in a canyon. Which approach to rotation is cheapest at run time?',
      options: [
        {
          text: 'Override Tick in each coin and call `AddActorLocalRotation`',
          why: '300 actor ticks per frame, each running your code — the most expensive option, with nothing gained over the alternatives.',
        },
        {
          text: 'Give each coin a `URotatingMovementComponent`',
          why: 'Cleaner than custom Tick code and easy to tune, but still 300 component ticks every frame on the game thread.',
        },
        {
          text: 'A looping timer every 0.1 s that rotates every coin by a larger step',
          why: 'Less work per second, but the coins visibly stutter, and the CPU is still moving 300 components.',
        },
        {
          text: 'Rotate them in the material with World Position Offset (e.g. `RotateAboutAxis`)',
          correct: true,
          why: 'The GPU spins the vertices while rendering; no component ticks or moves at all, so the CPU cost is essentially zero.',
        },
      ],
      explanation:
        'Match the tool to the scale. For a handful of gameplay pickups, `URotatingMovementComponent` is the pragmatic choice: no code, tunable, pausable. For hundreds of purely visual spinners, moving the animation to the GPU removes the game-thread cost entirely. Either beats hand-written Tick code.',
    },
  ],
  takeaways: [
    'Split pickups into an abstract C++ base (mechanics), thin C++ subclasses (effects) and Blueprints (content).',
    'Use a simple collision shape as the root for gameplay and a non-colliding mesh for visuals.',
    '`URotatingMovementComponent` spins things with no Tick code; for hundreds of decorative spinners, rotate in the material instead.',
    'Filter overlaps (active? authority? a pawn?) before applying anything, and let the effect refuse so the pickup is not wasted.',
    'Ask for capabilities with `FindComponentByClass` instead of casting to a concrete class.',
    'Play sound and Niagara effects *at location* (they are local, not replicated), fire a `BlueprintImplementableEvent` after state changes, and respawn by hiding plus a timer.',
  ],
  reading: [
    {
      title: 'Gameplay Timers',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-timers-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Setting, clearing and pausing timers with FTimerManager, as used for the respawn delay.',
    },
    {
      title: 'Interfaces',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/interfaces-in-unreal-engine',
      source: 'unreal-docs',
      note: 'The interface alternative to the virtual effect hook, for when collectors vary more than pickups.',
    },
    {
      title: 'Unreal Engine C++ Complete Guide',
      url: 'https://www.tomlooman.com/unreal-engine-cpp-guide/',
      source: 'article',
      note: 'Practical coverage of components, overlap events and C++/Blueprint collaboration in gameplay code.',
    },
  ],
};
