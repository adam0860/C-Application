import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-cpp-bp-workflow',
  title: 'Designing a C++ / Blueprint Workflow',
  summary: 'C++ bases, Blueprint children: what belongs where, how designers pick classes and assets, and how C++ leaves hooks for them.',
  minutes: 18,
  objectives: [
    'Explain why dependencies run from Blueprint to C++ and never the other way, and how the base-class pattern follows from that',
    'Decide whether a given concern belongs in C++ or in a Blueprint child, with reasons',
    'Use `TSubclassOf<>` to let designers choose which class C++ spawns',
    'Explain the pitfalls of `ConstructorHelpers::FObjectFinder` and hard-coded asset paths',
    'Design a C++ base class with Blueprint hooks, using a weapon system as a case study',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Dependencies point one way',
      blocks: [
        {
          type: 'p',
          text: 'Every Unreal project has two kinds of classes. C++ classes are compiled into your module before the editor starts. [[blueprint-class|Blueprint classes]] are [[asset|assets]] the editor creates afterwards, on top of a compiled parent. That ordering creates a hard rule: **Blueprints can depend on C++, but C++ cannot depend on a specific Blueprint.**',
        },
        {
          type: 'p',
          text: 'There is no `BP_Rifle.h` to include. The class `BP_Rifle_C` is generated from the asset when the editor or game loads it, long after the C++ compiler has finished. So if C++ code needs to work with "the rifle", it must work with a C++ type the rifle *derives from*.',
        },
        {
          type: 'code',
          title: 'WeaponBase.h',
          code: `UCLASS(Abstract, Blueprintable)
class MYGAME_API AWeaponBase : public AActor {
    GENERATED_BODY()
    // rules, tuning properties and hooks go here
};`,
          annotations: [
            { lines: 1, text: '`Abstract` stops anyone placing the bare C++ base in a level (it has no mesh or effects yet). `Blueprintable` allows Blueprint children; actors already inherit it from `AActor`, but stating it documents the intent.' },
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'C++ base class', text: '`AWeaponBase` defines what every weapon *is* and *does*: ammo, cooldowns, spawning projectiles, and the hooks designers may extend.' },
            { title: 'Blueprint children', text: '`BP_Rifle`, `BP_Shotgun` and `BP_RocketLauncher` derive from it and supply what makes each one *different*: meshes, sounds, effects and tuning numbers.' },
            { title: 'Game code', text: 'Other C++ (an inventory, a player character) only ever talks to `AWeaponBase*`. It works with every Blueprint weapon, including ones written next year.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why this is the standard pattern',
          text: 'It is plain [[polymorphism]] from the C++ course, applied across the language boundary. C++ defines the interface and the invariants once; designers create as many variations as the game needs without touching code; and nothing in C++ ever has to know a particular Blueprint exists. Epic\'s own templates and the engine itself (`ACharacter`, `AGameModeBase`, `UUserWidget`) are built for exactly this use.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'Why can\'t `WeaponBase.cpp` write `#include "BP_Rifle.h"` and create a `BP_Rifle_C` directly by type?',
      options: [
        {
          text: 'Blueprint classes are not real UClasses, so they can never be spawned',
          why: 'They are real classes (`UBlueprintGeneratedClass`) and can be spawned through a `UClass*` such as a `TSubclassOf` property. They just are not C++ types.',
        },
        {
          text: 'Blueprints only exist in the editor and are removed from packaged games',
          why: 'Blueprint classes are cooked into packaged games and run there. The problem is compile time, not packaging.',
        },
        {
          text: 'It works, but Epic\'s coding standard forbids it',
          why: 'It cannot work at all, so no standard is needed to forbid it.',
        },
        {
          text: 'A Blueprint class is created from an asset after C++ is compiled, so there is no header or C++ type for the compiler to see',
          correct: true,
          why: 'Exactly. The dependency can only run from Blueprint to C++, which is why C++ works with base classes and lets designers supply the concrete class.',
        },
      ],
      explanation:
        'C++ is compiled first; Blueprints are built on top of the result. C++ therefore talks to Blueprints through types it *does* know — base classes, interfaces, `TSubclassOf<Base>` properties and Blueprint events — and never names a specific Blueprint.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'What goes where',
      blocks: [
        {
          type: 'p',
          text: 'A useful one-line rule: **C++ decides, Blueprint decorates.** C++ owns rules, systems and anything performance-sensitive; Blueprint owns content choices, tuning and presentation.',
        },
        {
          type: 'table',
          headers: ['Concern', 'Usually lives in', 'Why'],
          rows: [
            ['Game rules: ammo, cooldowns, damage, win conditions', 'C++ base', 'One source of truth, reviewable as text, hard for content to break'],
            ['Systems used by many classes: inventory, interaction, saving', 'C++', 'Shared code belongs in one place with a stable API'],
            ['Loops over many items, maths, pathing helpers', 'C++', 'Every Blueprint node runs through the script VM, which adds overhead per node'],
            ['Networking and replication logic', 'C++', 'Fine-grained control over what replicates and who has authority'],
            ['Asset choices: meshes, sounds, VFX, animations, materials', 'Blueprint child', 'Designers and artists pick and swap them without a programmer'],
            ['Tuning numbers', 'Blueprint class defaults (or data assets)', 'Fast iteration with no recompiling'],
            ['Cosmetic reactions: muzzle flash, hit sound, camera shake', 'Blueprint, via events C++ calls', 'Visual work, best done by visual people with immediate feedback'],
            ['One-off level scripting: this door opens when that boss dies', 'Blueprint', 'Unique per level; not worth a C++ class'],
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Blueprint speed in perspective',
          text: 'A single Blueprint node is not slow; it is the **per-node VM overhead** that adds up. Event-driven Blueprint logic (react to a hit, play an effect) costs almost nothing. Tight loops over hundreds of elements, or heavy work every [[tick]], are where Blueprint can be many times slower than the equivalent C++. UE4\'s "Blueprint nativization" tool, which converted Blueprints to C++, was removed in UE5, so moving hot code to C++ by hand is the standard fix.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not "all C++" or "all Blueprint"?',
          text: 'All-C++ makes designers wait for a programmer and a compile to change a sound effect. All-Blueprint puts core rules in binary assets that cannot be merged when two people edit them, are awkward to diff and review, and become hard-to-follow "spaghetti" as they grow. Splitting along the C++-decides, Blueprint-decorates line plays to the strengths of each.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Data assets',
          text: 'When the same tuning data must be shared by many classes or swapped at run time, a [[data-asset]] is often better than Blueprint class defaults. The data-driven design unit covers that option.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      multi: true,
      prompt: 'You are building `BP_Rifle` as a child of the C++ `AWeaponBase`. Select **every** item that belongs in the Blueprint child rather than in the C++ base.',
      options: [
        {
          text: 'The rifle\'s static mesh and firing sound',
          correct: true,
          why: 'Asset choices are content. Designers should be able to swap them without a programmer.',
        },
        {
          text: 'The muzzle-flash effect spawned on each shot',
          correct: true,
          why: 'Presentation. C++ calls an event; the Blueprint decides what it looks like.',
        },
        {
          text: 'The rifle\'s specific fire interval of 0.1 seconds',
          correct: true,
          why: 'C++ declares the tunable property; the rifle-specific value is set in the Blueprint\'s class defaults.',
        },
        {
          text: 'The ammo bookkeeping and cooldown check',
          why: 'These are rules shared by every weapon. Duplicating them in each Blueprint invites bugs and inconsistent behaviour.',
        },
        {
          text: 'Server-side validation of hits in multiplayer',
          why: 'Authority and validation logic is core and security-sensitive; it belongs in C++.',
        },
      ],
      explanation:
        'C++ declares *that* weapons have a mesh, a fire interval and a firing event; the Blueprint child decides *which* mesh, *what* interval and *how* firing looks. Rules and validation stay in C++, where they exist once and apply to every weapon.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'TSubclassOf: letting designers pick the class',
      blocks: [
        {
          type: 'p',
          text: 'C++ often needs to create objects whose concrete class a designer should choose: which projectile a weapon fires, which enemy a spawner creates, which widget a menu opens. [[tsubclassof|TSubclassOf]] is the tool for this.',
        },
        {
          type: 'code',
          title: 'WeaponBase.h',
          code: `class AProjectile;

UPROPERTY(EditDefaultsOnly, Category = "Weapon")
TSubclassOf<AProjectile> ProjectileClass;`,
          annotations: [
            { lines: 1, text: 'A [[forward-declaration]] is enough in the header; include `Projectile.h` in the `.cpp`.' },
            { lines: '3-4', text: 'In the editor this is a dropdown listing `AProjectile` and **every subclass of it**, including Blueprint children like `BP_Bullet` and `BP_Rocket`. Unrelated classes are filtered out.' },
          ],
        },
        {
          type: 'code',
          title: 'WeaponBase.cpp',
          code: `void AWeaponBase::SpawnProjectile() {
    if (!ProjectileClass) {
        UE_LOG(LogTemp, Warning,
            TEXT("%s has no ProjectileClass"), *GetName());
        return;
    }
    const FTransform SpawnTM = Muzzle->GetComponentTransform();
    FActorSpawnParameters Params;
    Params.Owner = this;
    Params.Instigator = GetInstigator();
    GetWorld()->SpawnActor<AProjectile>(
        ProjectileClass, SpawnTM, Params);
}`,
          annotations: [
            { lines: '2-6', text: 'An unset class property is null. Fail loudly (a log naming the offending actor) instead of crashing or silently doing nothing.' },
            { lines: '9-10', text: 'The owner and instigator let the projectile ignore its shooter and credit damage to the right player.' },
            { lines: '11-12', text: '`TSubclassOf<AProjectile>` converts to a `UClass*`, and `SpawnActor<AProjectile>` returns an `AProjectile*`, whatever Blueprint child was actually chosen.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Alternatives that go wrong',
            tone: 'bad',
            code: `// Any class at all can be picked:
UPROPERTY(EditDefaultsOnly)
UClass* AnyClass;

// Always spawns the bare C++ base:
SpawnActor<AProjectile>(
    AProjectile::StaticClass(), ...);`,
            text: 'A raw `UClass*` accepts a light or a widget class, so mistakes surface at run time. `StaticClass()` ignores the designer completely and spawns the C++ class, which has no mesh or effects.',
          },
          right: {
            title: 'TSubclassOf',
            tone: 'good',
            code: `UPROPERTY(EditDefaultsOnly)
TSubclassOf<AProjectile> ProjectileClass;

SpawnActor<AProjectile>(
    ProjectileClass, ...);`,
            text: 'Type-safe in C++ and filtered in the editor. C++ never needs to know `BP_Rocket` exists.',
          },
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'TSubclassOf is a hard reference',
          text: 'When `BP_RocketLauncher` loads, the class in its `ProjectileClass` loads too, along with every asset that class references. For large, rarely used content you can instead store a [[soft-reference]] (`TSoftClassPtr`) and load it on demand. The memory unit covers soft references; for now, `TSubclassOf` is the right default.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'fill',
      prompt: 'Complete the code so designers choose the projectile class in the weapon Blueprint and C++ spawns whichever class they chose.',
      template: `UPROPERTY(EditDefaultsOnly, Category = "Weapon")
___<AProjectile> ProjectileClass;

// later, in AWeaponBase::SpawnProjectile():
GetWorld()->SpawnActor<AProjectile>(
    ___, SpawnTM, Params);`,
      blanks: [{ answers: ['TSubclassOf'] }, { answers: ['ProjectileClass'] }],
      wordBank: ['TSubclassOf', 'ProjectileClass', 'TObjectPtr', 'TSoftClassPtr', 'AProjectile::StaticClass()', 'AProjectile'],
      explanation:
        '`TSubclassOf<AProjectile>` gives designers a filtered class picker and converts to `UClass*` for `SpawnActor`. Passing the property spawns the designer\'s choice; `AProjectile::StaticClass()` would always spawn the bare C++ class. `TObjectPtr<AProjectile>` points at an existing actor, not a class, and a `TSoftClassPtr` would have to be loaded before it could be spawned.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'bug',
      prompt: 'Designers set `ProjectileClass` to `BP_Rocket` on the launcher Blueprint, but firing produces invisible projectiles with no trail and no explosion effect. Tap the faulty line.',
      code: `void AWeaponBase::SpawnProjectile() {
    const FTransform SpawnTM = Muzzle->GetComponentTransform();
    FActorSpawnParameters Params;
    Params.Owner = this;
    Params.Instigator = GetInstigator();
    GetWorld()->SpawnActor<AProjectile>(
        AProjectile::StaticClass(), SpawnTM, Params);
}`,
      bugLines: [7],
      hint: 'Which class is actually being spawned?',
      explanation:
        '`AProjectile::StaticClass()` is the bare C++ class, which has no mesh, trail or explosion assigned; those live in `BP_Rocket`. The designer\'s choice in `ProjectileClass` is ignored. Pass `ProjectileClass` instead (after checking it is set). This is one of the most common bugs in C++/Blueprint projects: spawning the base instead of the configured child.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Assets belong in properties, not path strings',
      blocks: [
        {
          type: 'p',
          text: 'Many tutorials (and some of Epic\'s templates) load assets in a constructor with [[constructor-helpers|ConstructorHelpers]] and a hard-coded path. It works for a demo, but it scales badly in a real project.',
        },
        {
          type: 'compare',
          left: {
            title: 'Hard-coded path',
            tone: 'bad',
            code: `AWeaponBase::AWeaponBase() {
    static ConstructorHelpers::
        FObjectFinder<UStaticMesh> MeshAsset(
        TEXT("/Game/Weapons/SM_Rifle.SM_Rifle"));
    if (MeshAsset.Succeeded()) {
        Mesh->SetStaticMesh(MeshAsset.Object);
    }
}`,
            text: 'The C++ base now *is* a rifle, every child inherits that mesh, and the path is a string the editor cannot update.',
          },
          right: {
            title: 'Exposed property, set in Blueprint',
            tone: 'good',
            code: `// WeaponBase.h
UPROPERTY(EditDefaultsOnly, Category = "Audio")
TObjectPtr<USoundBase> FireSound;

// The Mesh component's asset is simply
// chosen in BP_Rifle's Details panel.`,
            text: 'Designers pick assets with a picker, each child chooses its own, and moving or renaming an asset updates the reference automatically.',
          },
        },
        {
          type: 'heading',
          text: 'What goes wrong with path strings',
        },
        {
          type: 'list',
          items: [
            '**Moves and renames break it silently.** The editor fixes up references stored in assets when you move or rename something, but it cannot edit strings inside your C++. The constructor just fails to find the asset.',
            '**Failure is only a log line.** You get an error such as `CDO Constructor (WeaponBase): Failed to find /Game/...` at startup, easy to miss, and a weapon with no mesh.',
            '**Constructor only.** `FObjectFinder` may only run inside a constructor; using it anywhere else (say, in `BeginPlay`) triggers a fatal error.',
            '**Always loaded.** The asset becomes a hard dependency of the class default object, so it is loaded whenever the class is, used or not.',
            '**Designers are locked out.** Changing the mesh now needs a programmer, a code change and a recompile.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the editor can fix asset references but not strings',
          text: 'An asset reference stored in a `UPROPERTY` is data the engine understands: when you move `SM_Rifle`, the editor knows which assets point at it, updates them, and leaves a *redirector* behind for anything it could not update. A string in C++ is just text in a compiled binary. Keeping asset choices in properties keeps them inside the system that tracks them.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'About the templates',
          text: 'The third-person template\'s GameMode uses `ConstructorHelpers::FClassFinder` to point at `BP_ThirdPersonCharacter`. That is a pragmatic shortcut so the template works out of the box. In your own project, make a Blueprint child of your GameMode and pick the pawn class in its class defaults instead.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'truefalse',
      prompt: '`ConstructorHelpers::FObjectFinder` is a good way to load a sound asset in `BeginPlay`, the first time a weapon actually needs it.',
      answer: false,
      explanation:
        '`FObjectFinder` can only be used inside a constructor; calling it anywhere else is a fatal error. Even in a constructor it creates an always-loaded hard reference through a fragile path string. Expose a `UPROPERTY` and let the Blueprint choose the sound; for genuinely on-demand loading, soft references (covered in the memory unit) are the right tool.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Hooks: where designers plug in',
      blocks: [
        {
          type: 'p',
          text: 'The base class should expose a **small, deliberate surface** to Blueprints. Think of it as an API you are designing for designers: what may they trigger, what may they react to, and what may they replace?',
        },
        {
          type: 'table',
          headers: ['Designers need to…', 'Expose with', 'Example'],
          rows: [
            ['trigger an action', '`BlueprintCallable`', '`Fire()`, `Reload()`'],
            ['ask a question', '`BlueprintPure` or `BlueprintReadOnly`', '`GetAmmo()`, `CurrentAmmo`'],
            ['react to something', '`BlueprintImplementableEvent`', '`OnFired`, `OnReloaded`, `OnEmpty`'],
            ['replace a rule, keeping a default', '`BlueprintNativeEvent`', '`CanFire()`'],
            ['tune or choose content', '`EditDefaultsOnly` properties', '`FireInterval`, `ProjectileClass`, `FireSound`'],
          ],
        },
        {
          type: 'code',
          title: 'WeaponBase.h (hooks)',
          code: `protected:
    UFUNCTION(BlueprintImplementableEvent,
        Category = "Weapon")
    void OnFired(const FTransform& MuzzleTransform);

    UFUNCTION(BlueprintNativeEvent, Category = "Weapon")
    bool CanFire() const;
    virtual bool CanFire_Implementation() const;`,
          annotations: [
            { lines: '2-4', text: 'Called by C++ **after** the shot has been processed. The Blueprint adds the muzzle flash, sound and camera shake; it cannot affect whether the shot happened.' },
            { lines: '6-8', text: 'A rule with a C++ default (ammo and cooldown) that special weapons may extend, for example with an overheat check.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Expose less than you think',
          text: 'Every exposed function and writable property is a promise you must keep when you refactor. Prefer `BlueprintReadOnly` to `BlueprintReadWrite`, events to polling, and one well-named hook to five half-overlapping ones. You can always expose more later; taking something away breaks every Blueprint that used it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: 'Each weapon needs its own muzzle flash, sound and camera shake when it fires, chosen by designers. What should the C++ base class provide?',
      options: [
        {
          text: 'Make `CurrentAmmo` `BlueprintReadWrite` so each Blueprint can notice when it drops',
          why: 'Polling for changes is fragile and wasteful, and write access lets Blueprints corrupt the ammo count.',
        },
        {
          text: 'A `BlueprintImplementableEvent` such as `OnFired`, called from `Fire()` after the shot is processed',
          correct: true,
          why: 'C++ keeps control of the rules and tells designers exactly when to play their effects; each Blueprint implements the event its own way.',
        },
        {
          text: 'A `ConstructorHelpers` path for each weapon\'s effects in the base constructor',
          why: 'The base class would need to know every weapon, paths break on rename, and designers could not change anything.',
        },
        {
          text: 'Nothing: each Blueprint can check every tick whether the weapon fired',
          why: 'Tick-polling costs performance on every frame and duplicates logic in every weapon. Events exist to avoid this.',
        },
      ],
      explanation:
        '"C++ decides, Blueprint decorates": the shot (ammo, cooldown, projectile) is decided in C++, then an event hands the presentation to the Blueprint. The event carries useful context (the muzzle transform) so designers do not have to dig for it.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Case study: a weapon system',
      blocks: [
        {
          type: 'p',
          text: 'Here is the full base class, combining everything from this unit: visibility specifiers, metadata, Blueprint hooks and a designer-chosen class.',
        },
        {
          type: 'code',
          title: 'WeaponBase.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "WeaponBase.generated.h"

class AProjectile;

UCLASS(Abstract, Blueprintable)
class MYGAME_API AWeaponBase : public AActor {
    GENERATED_BODY()

public:
    AWeaponBase();

    UFUNCTION(BlueprintCallable, Category = "Weapon")
    void Fire();

    UFUNCTION(BlueprintPure, Category = "Weapon")
    int32 GetAmmo() const { return CurrentAmmo; }

protected:
    virtual void BeginPlay() override;

    UFUNCTION(BlueprintNativeEvent, Category = "Weapon")
    bool CanFire() const;
    virtual bool CanFire_Implementation() const;

    UFUNCTION(BlueprintImplementableEvent,
        Category = "Weapon")
    void OnFired(const FTransform& MuzzleTransform);

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly,
        Category = "Components")
    TObjectPtr<UStaticMeshComponent> Mesh;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly,
        Category = "Components")
    TObjectPtr<USceneComponent> Muzzle;

    UPROPERTY(EditDefaultsOnly, Category = "Weapon")
    TSubclassOf<AProjectile> ProjectileClass;

    UPROPERTY(EditDefaultsOnly, Category = "Weapon",
        meta = (ClampMin = "0.01", Units = "s"))
    float FireInterval = 0.2f;

    UPROPERTY(EditDefaultsOnly, Category = "Weapon",
        meta = (ClampMin = "1"))
    int32 MaxAmmo = 30;

private:
    void SpawnProjectile();

    int32 CurrentAmmo = 0;
    float NextFireTime = 0.f;
};`,
          annotations: [
            { lines: 9, text: 'Abstract base: only Blueprint children are placed or spawned.' },
            { lines: '16-20', text: 'The public surface: one action and one question.' },
            { lines: '25-31', text: 'Hooks: a replaceable rule and a cosmetic event.' },
            { lines: '33-39', text: 'Components are created in the constructor; their pointers are locked with `VisibleAnywhere`, while each child picks its own mesh asset and muzzle position.' },
            { lines: '41-50', text: 'Per-weapon-type content and tuning, edited only in class defaults.' },
            { lines: '55-56', text: 'Runtime state is private C++ data. Blueprints read ammo through `GetAmmo()` and can never set it.' },
          ],
        },
        {
          type: 'code',
          title: 'WeaponBase.cpp',
          code: `void AWeaponBase::BeginPlay() {
    Super::BeginPlay();
    CurrentAmmo = MaxAmmo;
}

bool AWeaponBase::CanFire_Implementation() const {
    const float Now = GetWorld()->GetTimeSeconds();
    return CurrentAmmo > 0 && Now >= NextFireTime;
}

void AWeaponBase::Fire() {
    if (!CanFire()) {
        return;
    }
    --CurrentAmmo;
    NextFireTime = GetWorld()->GetTimeSeconds() + FireInterval;
    SpawnProjectile();
    OnFired(Muzzle->GetComponentTransform());
}`,
          annotations: [
            { lines: 3, text: 'Uses the value from the Blueprint\'s class defaults, because by `BeginPlay` all property layers have been applied.' },
            { lines: 12, text: 'Calls the native event through its wrapper, so a Blueprint override (such as an overheat check) is respected.' },
            { lines: '15-17', text: 'The decision and its consequences happen in C++, identically for every weapon.' },
            { lines: 18, text: 'Only then does presentation get its turn.' },
          ],
        },
        {
          type: 'table',
          headers: ['Blueprint child', 'Content and tuning', 'Hooks'],
          rows: [
            ['`BP_Rifle`', 'Rifle mesh, `BP_Bullet`, interval 0.1 s, 30 rounds', '*On Fired*: muzzle flash and a crack sound'],
            ['`BP_RocketLauncher`', 'Launcher mesh, `BP_Rocket`, interval 1.5 s, 1 round', '*On Fired*: camera shake and back-blast smoke'],
            ['`BP_PlasmaRifle`', 'Plasma mesh, `BP_PlasmaBolt`, interval 0.15 s', 'Overrides *Can Fire*: calls the parent **and** checks an overheat meter'],
          ],
          caption: 'Three weapons, zero new C++.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Evolving the split over a project',
      blocks: [
        {
          type: 'p',
          text: 'The split is not decided once. A healthy project moves logic across the boundary as it learns what matters.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Prototype in Blueprint', text: 'Early on, speed of iteration matters most. Designers or programmers build the mechanic in a Blueprint to find out whether it is fun.' },
            { title: 'Move the core to C++', text: 'Once it sticks, move rules and hot paths into a C++ base class with the hooks the Blueprint needs. Keep assets, tuning and effects in the Blueprint.' },
            { title: 'Reparent', text: 'In the Blueprint editor, *Class Settings → Parent Class* switches the existing Blueprint to your new C++ base, keeping its assets and graphs. Then delete the graph logic that C++ now handles.' },
          ],
        },
        {
          type: 'heading',
          text: 'Warning signs',
        },
        {
          type: 'list',
          items: [
            'The same graph copy-pasted into several Blueprints: it is a missing C++ base class or function.',
            'C++ calling Blueprint functions by name with string lookups: fragile; declare a `BlueprintImplementableEvent` instead.',
            'Blueprints with heavy logic on *Event Tick*: move it to C++ or make it event-driven.',
            'A Blueprint whose references pull half the game into memory: a candidate for soft references, covered in the memory unit.',
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Same pattern, everywhere',
          text: 'You will meet this base-class-plus-Blueprint-child shape again in the next unit: your GameMode, Character, PlayerController and HUD widgets will each be a C++ class with a Blueprint child that picks assets and classes.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'order',
      prompt: 'Put the steps for adding a new rifle using the C++-base / Blueprint-child workflow in order.',
      linesAreCode: false,
      lines: [
        'Write `AWeaponBase` in C++: rules, exposed tuning properties and Blueprint hooks',
        'Compile, so the class and its reflection data exist for the editor',
        'Create `BP_Rifle` as a Blueprint child of `AWeaponBase`',
        'In `BP_Rifle`, pick assets, tune class defaults and implement *On Fired*',
        'Place or spawn `BP_Rifle`, never the abstract C++ base, in the game',
      ],
      distractors: ['Add `#include "BP_Rifle.h"` to `WeaponBase.cpp` so C++ can spawn the rifle'],
      explanation:
        'The C++ class must exist (compiled, with reflection data) before a Blueprint can derive from it. The Blueprint then supplies content and presentation, and the game uses the Blueprint. C++ can never include a Blueprint, which is why it spawns weapons through base-class pointers and `TSubclassOf` properties instead.',
    },
  ],
  takeaways: [
    'Blueprints depend on C++, never the reverse: C++ works with base classes and lets Blueprint children supply the concrete content.',
    '"C++ decides, Blueprint decorates": rules, systems and hot code in C++; assets, tuning, effects and one-off scripting in Blueprint.',
    '`TSubclassOf<T>` gives designers a filtered class picker; spawn the property, never `T::StaticClass()`, or you get the bare base class.',
    'Avoid `ConstructorHelpers` path strings in real projects: they break on rename, only work in constructors, always load the asset and lock designers out.',
    'Expose a small, deliberate surface: `BlueprintCallable` actions, read-only state, `BlueprintImplementableEvent` hooks and `BlueprintNativeEvent` rules.',
    'Prototype in Blueprint, move the core to C++, and reparent the Blueprint; soft references for heavy content come later in the course.',
  ],
  reading: [
    {
      title: 'Programming with C++ in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/programming-with-cplusplus-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s entry point to C++ in Unreal, including how C++ classes are extended by Blueprints.',
    },
    {
      title: 'Blueprints Visual Scripting',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprints-visual-scripting-in-unreal-engine',
      source: 'unreal-docs',
      note: 'The Blueprint side of the boundary: class defaults, reparenting and how Blueprint classes are structured.',
    },
    {
      title: 'Unreal Engine C++ Complete Guide',
      url: 'https://www.tomlooman.com/unreal-engine-cpp-guide/',
      source: 'article',
      note: 'Tom Looman discusses the C++/Blueprint split from years of shipping and teaching; see its sections on exposing classes to Blueprint.',
    },
  ],
};
