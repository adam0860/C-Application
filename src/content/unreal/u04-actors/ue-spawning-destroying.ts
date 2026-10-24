import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-spawning-destroying',
  title: 'Spawning, Destroying and Finding Actors',
  summary: 'SpawnActor and its parameters, spawning Blueprint classes, deferred spawning, destroying actors, and finding them without slow global searches.',
  minutes: 18,
  objectives: [
    'Spawn actors with `GetWorld()->SpawnActor<T>()` and handle a failed spawn',
    'Use `TSubclassOf` so designers can choose which Blueprint class is spawned',
    'Fill in `FActorSpawnParameters` (Owner, Instigator, collision handling) correctly',
    'Use `SpawnActorDeferred` and `FinishSpawning` to configure an actor before it constructs and begins play',
    'Destroy actors with `Destroy()` and `SetLifeSpan`, and know what happens to references',
    'Explain why `GetAllActorsOfClass` is slow and replace it with references, caching or a registry subsystem',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'SpawnActor in full',
      blocks: [
        {
          type: 'p',
          text: 'You met [[spawnactor|SpawnActor]] briefly when learning how objects are created: actors are spawned by a [[world]], which adds them to a level, registers their components and runs their lifecycle. Here is the full form, in a weapon that fires projectiles:',
        },
        {
          type: 'code',
          title: 'Weapon.cpp',
          code: `#include "Weapon.h"
#include "Projectile.h"

void AWeapon::Fire() {
    UWorld* World = GetWorld();
    if (!World || !ProjectileClass) {
        return;
    }

    FActorSpawnParameters Params;
    Params.Owner = this;
    Params.Instigator = GetInstigator();
    Params.SpawnCollisionHandlingOverride =
        ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

    AProjectile* Shot = World->SpawnActor<AProjectile>(
        ProjectileClass,
        Muzzle->GetComponentLocation(),
        Muzzle->GetComponentRotation(),
        Params);
    if (!Shot) {
        return;
    }
    // BeginPlay has already run on Shot at this point.
}`,
          annotations: [
            { lines: '5-8', text: 'Spawning needs a world (none exists for the CDO) and a class to spawn (designers may have left it empty). Check both.' },
            { lines: '10-14', text: 'Optional extra settings — the subject of a later card.' },
            { lines: 16, text: 'The template argument is the pointer type you get back. The first argument is the class actually spawned, which may be a Blueprint child of `AProjectile`.' },
            { lines: '18-19', text: 'World-space location and rotation. `Muzzle` is a scene component placed at the end of the barrel.' },
            { lines: '21-23', text: '`SpawnActor` can return `nullptr`: an empty or abstract class, a collision rule that refused the spawn, or a world that is shutting down. Always check.' },
            { lines: 24, text: 'As the lifecycle lesson showed, the constructor, `OnConstruction`, `PostInitializeComponents` and `BeginPlay` all ran **inside** the call.' },
          ],
        },
        {
          type: 'table',
          headers: ['Overload', 'Use when'],
          rows: [
            ['`SpawnActor<T>(Params)`', 'Spawning exactly `T` at the origin'],
            ['`SpawnActor<T>(Class, Location, Rotation, Params)`', 'The usual form: a chosen class at a place'],
            ['`SpawnActor<T>(Class, Transform, Params)`', 'You also need a scale, or already have an `FTransform`'],
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'TSubclassOf: spawning designers\' Blueprints',
      blocks: [
        {
          type: 'p',
          text: 'In practice you rarely spawn a C++ class directly. Designers make a Blueprint child — `BP_Fireball`, with its mesh, particle effects and sounds — and the C++ code must spawn **that**. So the weapon stores the class to spawn as a property:',
        },
        {
          type: 'code',
          title: 'Weapon.h (excerpt)',
          code: `UPROPERTY(EditDefaultsOnly, Category = "Weapon")
TSubclassOf<AProjectile> ProjectileClass;

UPROPERTY(VisibleAnywhere, Category = "Weapon")
TObjectPtr<USceneComponent> Muzzle;`,
          annotations: [
            { lines: 1, text: '`EditDefaultsOnly`: set once in the weapon Blueprint\'s Class Defaults (every staff fires fireballs), not per placed instance.' },
            { lines: 2, text: '[[tsubclassof|TSubclassOf<AProjectile>]] holds a `UClass*` that must be `AProjectile` or a subclass. The editor\'s picker only lists those classes.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Hard-coded C++ class',
            tone: 'bad',
            code: `World->SpawnActor<AProjectile>(
    AProjectile::StaticClass(), Loc, Rot);`,
            text: 'Spawns the bare C++ class: no mesh, no effects, none of the designer\'s tuning. Changing the projectile means changing code.',
          },
          right: {
            title: 'Designer-chosen class',
            tone: 'good',
            code: `World->SpawnActor<AProjectile>(
    ProjectileClass, Loc, Rot);`,
            text: 'Spawns whatever `BP_` child was assigned. One C++ weapon class can fire fireballs, arrows or bubbles.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why TSubclassOf instead of UClass*?',
          text: 'A plain `UPROPERTY() UClass*` would accept *any* class — a designer could assign a light or a sound class and your spawn would fail or crash. `TSubclassOf<T>` restricts the editor picker to `T` and its children and checks assignments in C++, yet converts implicitly to `UClass*` wherever one is needed. It is "a class, chosen as data, with a type guarantee" — something standard C++ cannot express at all without reflection.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'Designers created `BP_Fireball`, a Blueprint child of `AProjectile` with a mesh and flame effects. Your weapon spawns `AProjectile::StaticClass()`. What do players see when firing?',
      options: [
        {
          text: 'A bare `AProjectile` without the Blueprint\'s mesh and effects — probably nothing visible at all',
          correct: true,
          why: 'Correct. `StaticClass()` names the C++ class. Everything the designers added lives in the Blueprint class, which this code never mentions.',
        },
        {
          text: 'A `BP_Fireball`, because the engine picks the most derived Blueprint class',
          why: 'The engine spawns exactly the class you pass. Many Blueprint children may exist; nothing chooses one for you.',
        },
        {
          text: 'A compile error, because Blueprint classes cannot be spawned from C++',
          why: 'C++ spawns Blueprint classes all the time — through a `TSubclassOf` or `UClass*` property that a designer fills in.',
        },
        {
          text: 'A crash, because `AProjectile` is a C++ class without a Blueprint',
          why: 'C++ classes are perfectly spawnable (unless marked `Abstract`). The problem is that the result lacks the designers\' content.',
        },
      ],
      explanation:
        'Spawn the class the designers chose, not the class you wrote: expose a `TSubclassOf<AProjectile>` property and pass it to `SpawnActor`. This keeps assets and tuning in Blueprints and logic in C++.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'FActorSpawnParameters',
      blocks: [
        {
          type: 'p',
          text: '[[factorspawnparameters|FActorSpawnParameters]] carries optional settings. Three matter in almost every game:',
        },
        {
          type: 'table',
          headers: ['Field', 'Type', 'Meaning'],
          rows: [
            ['`Owner`', '`AActor*`', 'The [[actor-owner|owner]]: who the new actor "belongs to" for networking (which client may call its remote functions, relevancy) and owner-only visibility. Readable later with `GetOwner()`.'],
            ['`Instigator`', '`APawn*`', 'The [[damage-instigator|instigator]]: the pawn responsible for what this actor does — the player who fired the rocket. Damage code uses it to credit kills. Readable with `GetInstigator()`.'],
            ['`SpawnCollisionHandlingOverride`', '`ESpawnActorCollisionHandlingMethod`', 'What to do if the new actor would overlap something blocking at the spawn point.'],
            ['`Name`', '`FName`', 'An explicit object name (rarely needed — auto names are unique).'],
            ['`bDeferConstruction`', '`bool`', 'Spawn without finishing construction — the idea behind deferred spawning, below.'],
          ],
        },
        {
          type: 'table',
          headers: ['Collision handling method', 'If the spot is blocked…'],
          rows: [
            ['`Undefined`', 'Use the actor class\'s own `SpawnCollisionHandlingMethod` setting (the default)'],
            ['`AlwaysSpawn`', 'Spawn anyway, overlapping whatever is there'],
            ['`AdjustIfPossibleButAlwaysSpawn`', 'Try to nudge it to a free spot; spawn regardless'],
            ['`AdjustIfPossibleButDontSpawnIfColliding`', 'Try to nudge it; give up (return `nullptr`) if no free spot'],
            ['`DontSpawnIfColliding`', 'Do not spawn at all if blocked'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Choosing a collision method',
          text: 'Projectiles start inside or next to the weapon that fires them, so `AlwaysSpawn` is usual (they are set to ignore their owner). Enemies spawned at a spawn point should use an *Adjust* method so they do not get stuck inside each other. If you pick a method that can refuse, expect `nullptr`.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Owner, Instigator, Outer: three different ideas',
          text: 'The **Outer** is containment (the level the actor lives in). The **Owner** is network and gameplay ownership. The **Instigator** is responsibility for actions and damage. None of them keeps the actor alive — the level does that. A grenade thrown by a player is usually owned *and* instigated by that player\'s pawn, but its Outer is the level.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'fill',
      prompt: 'A character spawns a grenade. Complete the parameters so the character owns it, gets credit for its damage, and it spawns even if it overlaps the character\'s hand.',
      template: `FActorSpawnParameters Params;
Params.___ = this;
Params.___ = this;   // this character is an APawn
Params.SpawnCollisionHandlingOverride =
    ESpawnActorCollisionHandlingMethod::___;

GetWorld()->SpawnActor<AGrenade>(
    GrenadeClass, HandLocation, AimRotation, Params);`,
      blanks: [{ answers: ['Owner'] }, { answers: ['Instigator'] }, { answers: ['AlwaysSpawn'] }],
      wordBank: ['Owner', 'Instigator', 'AlwaysSpawn', 'Outer', 'DontSpawnIfColliding', 'Template', 'Undefined'],
      explanation:
        '`Owner` sets ownership (important for networking), `Instigator` records the responsible pawn so damage can be credited, and `AlwaysSpawn` ignores the overlap with the hand. `Outer` is not a spawn parameter — spawned actors are always outered to their level — and `DontSpawnIfColliding` would make the grenade fail to appear exactly in this situation.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'SpawnActorDeferred: configure before construction',
      blocks: [
        {
          type: 'p',
          text: 'Because `SpawnActor` runs `OnConstruction` and `BeginPlay` before it returns, any property you set afterwards is **too late** for them to see. A bow that fires arrows whose look depends on how long the string was drawn runs straight into this:',
        },
        {
          type: 'code',
          title: 'Arrow.cpp',
          code: `void AArrow::OnConstruction(const FTransform& Transform) {
    Super::OnConstruction(Transform);
    // Fully charged arrows glow.
    UMaterialInterface* Mat =
        Damage >= 50.0f ? GlowMaterial : NormalMaterial;
    if (Mat) {
        Mesh->SetMaterial(0, Mat);
    }
}`,
          annotations: [
            { lines: '4-5', text: 'Depends on `Damage`. With a normal `SpawnActor`, this runs while `Damage` still holds its class default, so arrows never glow.' },
          ],
        },
        {
          type: 'p',
          text: '[[spawn-actor-deferred|SpawnActorDeferred]] splits spawning in two. It creates the actor (the constructor runs) and returns it **before** construction, component initialization and `BeginPlay`; you set what you need, then call `FinishSpawning` to complete the process.',
        },
        {
          type: 'code',
          title: 'Bow.cpp',
          code: `void ABow::Shoot(float Charge) {
    const FTransform SpawnTransform(
        Muzzle->GetComponentRotation(),
        Muzzle->GetComponentLocation());

    AArrow* Arrow = GetWorld()->SpawnActorDeferred<AArrow>(
        ArrowClass, SpawnTransform, this, GetInstigator(),
        ESpawnActorCollisionHandlingMethod::AlwaysSpawn);
    if (!Arrow) {
        return;
    }
    Arrow->Damage = FMath::Lerp(10.0f, 60.0f, Charge);
    Arrow->FinishSpawning(SpawnTransform);
}`,
          annotations: [
            { lines: '2-4', text: 'Deferred spawning takes an `FTransform` (rotation, then location; scale defaults to 1).' },
            { lines: '6-8', text: 'Owner, Instigator and collision handling are plain arguments here instead of an `FActorSpawnParameters`.' },
            { lines: 12, text: 'The window: the actor exists, but `OnConstruction` and `BeginPlay` have not run. `Charge` of 0..1 maps to 10..60 damage.' },
            { lines: 13, text: 'Completes the spawn: construction (`OnConstruction` sees the real `Damage`), `PostInitializeComponents`, then `BeginPlay`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Always finish what you start',
          text: 'Every successful `SpawnActorDeferred` must be followed by `FinishSpawning`. An actor left unfinished sits in the level half-initialized: no construction, no `BeginPlay`, never ticking. Avoid early `return`s between the two calls.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'The Blueprint equivalent',
          text: 'Blueprint\'s *Spawn Actor from Class* node shows input pins for properties marked `meta = (ExposeOnSpawn = true)`. Under the hood it does exactly this: a deferred spawn, set the exposed properties, then finish spawning — so the Construction Script and *Event BeginPlay* see them.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'order',
      prompt: 'Put the deferred spawn of a charged arrow in order, from the bow\'s call to the arrow beginning play.',
      linesAreCode: false,
      lines: [
        '`SpawnActorDeferred` creates the arrow (its constructor runs)',
        'The bow sets `Arrow->Damage = 60`',
        'The bow calls `Arrow->FinishSpawning(SpawnTransform)`',
        '`OnConstruction` runs and picks the glowing material',
        '`BeginPlay` runs with `Damage == 60`',
      ],
      distractors: ['`SpawnActor` returns after `BeginPlay` has already run'],
      explanation:
        'Deferred spawning opens a window between creation and construction. Properties set in that window are visible to `OnConstruction`, `PostInitializeComponents` and `BeginPlay`. The distractor describes the normal `SpawnActor`, where the window does not exist and setting `Damage` afterwards is too late.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Destroying actors: Destroy() and SetLifeSpan',
      blocks: [
        {
          type: 'p',
          text: 'Unlike plain `UObject`s, actors are destroyed explicitly, because the level keeps them reachable. `Destroy()` removes the actor from the world **immediately**: it calls `EndPlay` with `EEndPlayReason::Destroyed`, unregisters its components, and flags the object as garbage. The memory is freed at the next garbage collection, as you saw in the GC lesson.',
        },
        {
          type: 'code',
          title: 'Projectile.cpp',
          code: `AProjectile::AProjectile() {
    InitialLifeSpan = 5.0f;   // misses disappear after 5 s
}

void AProjectile::OnImpact(AActor* HitActor) {
    if (IsValid(HitActor)) {
        ApplyHitTo(HitActor);
    }
    Destroy();
}

void AProjectile::Stick() {
    SetLifeSpan(30.0f);   // stay embedded for 30 s, then go
}`,
          annotations: [
            { lines: 2, text: 'A default [[actor-lifespan|lifespan]]: `AActor::BeginPlay` turns it into a timer that calls `Destroy()` — one more reason never to skip `Super::BeginPlay()`. `0` means "live forever".' },
            { lines: 9, text: 'Destroying yourself is normal. Code after this line may still read members (the memory is valid until collection), but the actor is no longer in the world.' },
            { lines: 13, text: '`SetLifeSpan` restarts the countdown at run time; `SetLifeSpan(0.0f)` cancels it.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Other references** to a destroyed actor do not become `nullptr` straight away — `IsValid()` returns `false` immediately, and `UPROPERTY` references are cleared at the next collection.',
            '**`Destroy()` returns `bool`**: `false` if the actor could not be destroyed. In multiplayer, clients generally cannot destroy actors the server controls — the Networking unit explains authority.',
            '**Never `delete` an actor.** `Destroy()` (directly or through a lifespan) is the only correct way to remove one from the game.',
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Spawning and destroying are not free',
          text: 'Each spawn allocates objects, registers components with rendering and physics, and runs the whole lifecycle; each destroy creates garbage for the collector. For things fired many times per second (bullets, hit sparks), games keep a **pool** of inactive actors and reuse them — hide and disable on "destroy", re-enable and move on "spawn".',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'truefalse',
      prompt: 'After `Enemy->Destroy()` returns, every pointer to that enemy is immediately `nullptr`.',
      answer: false,
      explanation:
        '`Destroy()` removes the actor from play and flags it as garbage, but pointers keep their value until the next garbage collection, which then sets `UPROPERTY` references to `nullptr` (raw untracked pointers are never fixed and dangle). In between, `IsValid(Enemy)` returns `false` — which is why `IsValid`, not a null check, is the right test for actors that can be destroyed.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Finding actors — and why GetAllActorsOfClass is slow',
      blocks: [
        {
          type: 'p',
          text: 'Sooner or later you need "all the enemies" or "the nearest pickup". The engine offers a direct answer:',
        },
        {
          type: 'code',
          title: 'Searching the world',
          code: `#include "Kismet/GameplayStatics.h"
#include "EngineUtils.h"

TArray<AActor*> Found;
UGameplayStatics::GetAllActorsOfClass(
    this, APickup::StaticClass(), Found);
for (AActor* Actor : Found) {
    APickup* Pickup = Cast<APickup>(Actor);
    // ...
}

for (TActorIterator<APickup> It(GetWorld()); It; ++It) {
    APickup* Pickup = *It;   // already typed
}`,
          annotations: [
            { lines: '5-6', text: '[[get-all-actors-of-class|GetAllActorsOfClass]] fills an array with every `APickup` (and subclass) in this actor\'s world. The first argument is a world-context object, used to find the world.' },
            { lines: 8, text: 'The array holds `AActor*`, so each element needs a [[ue-cast|Cast]] — Unreal\'s checked downcast, covered in a later unit.' },
            { lines: '12-14', text: '[[tactoriterator|TActorIterator]] walks the same set without building an array, already typed.' },
          ],
        },
        {
          type: 'p',
          text: 'The engine\'s own header comment on `GetAllActorsOfClass` says it plainly: *this is a slow operation, use with caution, e.g. do not use every frame.* Here is why:',
        },
        {
          type: 'list',
          items: [
            '**It searches, every call.** The engine looks up every object of that class and all its subclasses in its global object tables — across every loaded world, including the editor\'s world during Play In Editor — then filters out those in other worlds or already destroyed.',
            '**It allocates and copies.** A fresh array is filled each time, and you then cast each element.',
            '**It multiplies.** One call is fine. Fifty enemies each calling it every frame to find pickups is 50 searches per frame, growing with both the number of searchers and the number of objects. `GetAllActorsWithTag` and `GetAllActorsWithInterface` are worse: they visit *every* actor.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'When it is fine',
          text: 'Once in `BeginPlay` for a set that never changes, in editor tools, in debug commands, or on a rare event (a level-wide alarm). The problem is not the function; it is calling it repeatedly when the answer could have been kept.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'bug',
      prompt: 'This code works, but with 60 enemies on screen the frame rate collapses. Tap the line that causes the problem.',
      code: `void AEnemy::Tick(float DeltaSeconds) {
    Super::Tick(DeltaSeconds);

    TArray<AActor*> Pickups;
    UGameplayStatics::GetAllActorsOfClass(
        this, AHealthPickup::StaticClass(), Pickups);

    AActor* Nearest = FindClosest(Pickups);
    if (Nearest && Health < MaxHealth * 0.3f) {
        MoveTowards(Nearest, DeltaSeconds);
    }
}`,
      bugLines: [5],
      hint: 'Which call does a world-wide search, and how often does it run?',
      explanation:
        'Line 5 runs a world-wide search, allocates an array and copies results — once per enemy per frame: 60 searches every frame, at 60 fps 3,600 per second. Nothing about the set of pickups changes that often. Keep the answer instead: have pickups register with a registry subsystem (next card) and read its list, or at least only search when the enemy actually needs healing.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Better patterns: references, caches and registries',
      blocks: [
        {
          type: 'p',
          text: 'The fastest search is the one you never do. In rough order of preference:',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Direct references.** If a switch opens one particular door, give the switch a `UPROPERTY(EditInstanceOnly) TObjectPtr<ADoor> Door;` and let the designer pick the door in the level. No search at all.',
            '**Cache once.** If the set never changes during play, search once in `BeginPlay` and keep the result in a `UPROPERTY` array.',
            '**A registry.** If actors come and go, let them announce themselves: register in `BeginPlay`, unregister in `EndPlay`. Anyone can then read an always-current list instantly.',
            '**Spatial queries.** For "what is near me?", overlap volumes and traces ask the physics system, which is built for spatial searches (Collision unit).',
          ],
        },
        {
          type: 'p',
          text: 'A natural home for a registry is a **world subsystem** — a [[subsystem]] object the engine creates automatically for each world and destroys with it (the Gameplay Framework unit covers subsystems in depth):',
        },
        {
          type: 'code',
          title: 'PickupRegistry.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "PickupRegistry.generated.h"

class APickup;

UCLASS()
class MYGAME_API UPickupRegistry : public UWorldSubsystem {
    GENERATED_BODY()

public:
    void Register(APickup* Pickup);
    void Unregister(APickup* Pickup);

    const TArray<TObjectPtr<APickup>>& GetPickups() const {
        return Pickups;
    }

private:
    UPROPERTY()
    TArray<TObjectPtr<APickup>> Pickups;
};`,
          annotations: [
            { lines: 10, text: 'One instance per world, created and destroyed by the engine. No spawning, no singletons.' },
            { lines: '17-19', text: 'Returning a `const&` hands out the list without copying it.' },
            { lines: '22-23', text: 'A `UPROPERTY` array, so the collector sees the references. Because pickups unregister in `EndPlay`, the list never holds dead actors.' },
          ],
        },
        {
          type: 'code',
          title: 'PickupRegistry.cpp and Pickup.cpp',
          code: `// PickupRegistry.cpp
#include "PickupRegistry.h"
#include "Pickup.h"

void UPickupRegistry::Register(APickup* Pickup) {
    Pickups.AddUnique(Pickup);
}

void UPickupRegistry::Unregister(APickup* Pickup) {
    Pickups.Remove(Pickup);
}

// Pickup.cpp (BeginPlay/EndPlay overrides added to APickup)
void APickup::BeginPlay() {
    Super::BeginPlay();
    if (auto* Reg = GetWorld()->GetSubsystem<UPickupRegistry>()) {
        Reg->Register(this);
    }
}

void APickup::EndPlay(const EEndPlayReason::Type EndPlayReason) {
    if (auto* Reg = GetWorld()->GetSubsystem<UPickupRegistry>()) {
        Reg->Unregister(this);
    }
    Super::EndPlay(EndPlayReason);
}`,
          annotations: [
            { lines: 3, text: 'The header only forward-declared `APickup`; the `.cpp` includes the full definition before storing pointers to it.' },
            { lines: 6, text: '`AddUnique` guards against registering twice.' },
            { lines: 16, text: '`GetSubsystem<T>()` finds this world\'s instance in constant time. Checking for `nullptr` keeps teardown paths safe.' },
            { lines: '21-25', text: 'The `BeginPlay`/`EndPlay` pair from the lifecycle lesson: every way out of play — destroyed, level unloaded, PIE stopped — unregisters.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why registries win',
          text: 'The cost moves from *every query* to *every spawn and destroy*, which happen far less often. Queries become "read an array": constant time, already typed, always up to date, and limited to exactly the actors that opted in. It is the same trade a database makes with an index.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'A minimap must draw every pickup in the level every frame. Pickups are spawned and collected constantly. Which approach is best?',
      options: [
        {
          text: 'Call `GetAllActorsOfClass` for pickups in the minimap\'s `Tick`',
          why: 'Correct results, but a world-wide search plus an array copy every frame, for an answer that only changes when a pickup appears or disappears.',
        },
        {
          text: 'Call `GetAllActorsOfClass` once in the minimap\'s `BeginPlay` and keep the array',
          why: 'Fast, but stale: pickups spawned later never appear, and collected ones linger as destroyed actors.',
        },
        {
          text: 'Use a `TActorIterator<APickup>` in `Tick` instead',
          why: 'It skips the array, but performs the same world-wide search every frame.',
        },
        {
          text: 'Have pickups register with a world subsystem in `BeginPlay` and unregister in `EndPlay`; the minimap reads its list',
          correct: true,
          why: 'Correct. Each query is just reading an array that is always current, and the cost is paid once per spawn and once per collection.',
        },
      ],
      explanation:
        'Searching is the right tool for rare questions; registries are the right tool for frequent questions about a changing set. Pairing registration with `BeginPlay` and `EndPlay` guarantees the list stays correct on every path out of play.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'A player throws a grenade that kills an enemy. Which spawn parameter lets the damage system credit the kill to the player?',
      options: [
        {
          text: '`Owner`',
          why: 'Ownership is mainly about networking (which connection may call the grenade\'s remote functions, relevancy). It is often set to the same pawn, but damage credit is read from the instigator.',
        },
        {
          text: '`Instigator`',
          correct: true,
          why: 'Correct. The instigator is the pawn responsible for the actor\'s actions; damage functions pass its controller along so kills and assists are credited.',
        },
        {
          text: '`Name`',
          why: 'An object name identifies the grenade itself; it says nothing about who threw it.',
        },
        {
          text: '`Template`',
          why: '`Template` supplies an existing actor to copy property values from when spawning. It has nothing to do with responsibility.',
        },
      ],
      explanation:
        '`Owner` and `Instigator` often point at the same pawn, which is why they get confused. Keep them apart by purpose: ownership answers "whose is it?" (networking, visibility), instigation answers "who caused this?" (damage, scoring, AI reactions).',
    },
  ],
  takeaways: [
    '`GetWorld()->SpawnActor<T>(Class, Location, Rotation, Params)` spawns an actor and runs its lifecycle through `BeginPlay` before returning; it can return `nullptr`, so check it.',
    'Spawn designer-chosen classes through a `TSubclassOf<T>` property instead of `T::StaticClass()`, so Blueprint content is used.',
    '`FActorSpawnParameters`: `Owner` for ownership and networking, `Instigator` for responsibility and damage credit, `SpawnCollisionHandlingOverride` for blocked spawn points.',
    '`SpawnActorDeferred` + `FinishSpawning` let you set properties before `OnConstruction` and `BeginPlay`; always call `FinishSpawning`.',
    '`Destroy()` ends play immediately and flags the actor as garbage; memory and `UPROPERTY` references are cleaned up at the next collection. `SetLifeSpan` / `InitialLifeSpan` destroy on a timer.',
    '`GetAllActorsOfClass` searches the world every call — fine occasionally, wrong every frame. Prefer direct references, caching, or a registry that actors join in `BeginPlay` and leave in `EndPlay`.',
  ],
  reading: [
    {
      title: 'Spawning Actors',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/spawning-actors-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s reference for `SpawnActor`, its overloads and spawn parameters.',
    },
    {
      title: 'Actor Lifecycle',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle',
      source: 'unreal-docs',
      note: 'Look at the "Deferred Spawn" path to see exactly what `FinishSpawning` runs.',
    },
    {
      title: 'Programming Subsystems',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/programming-subsystems-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How world, game instance and other subsystems are created, and why they make good registries.',
    },
    {
      title: 'Object Pool (Game Programming Patterns)',
      url: 'https://gameprogrammingpatterns.com/object-pool.html',
      source: 'book',
      note: 'The pattern behind reusing frequently spawned actors instead of destroying and respawning them.',
    },
  ],
};
