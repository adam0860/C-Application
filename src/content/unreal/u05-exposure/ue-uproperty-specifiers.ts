import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-uproperty-specifiers',
  title: 'UPROPERTY Specifiers in Depth',
  summary: 'Who may see and change each property, where, and how it is saved: the specifiers that turn a C++ member into editor data.',
  minutes: 18,
  objectives: [
    'Choose between the six `Edit*` / `Visible*` specifiers by reasoning about class defaults versus placed instances',
    'Explain how C++ defaults, Blueprint defaults and per-instance overrides layer on top of each other',
    'Expose a property to Blueprint graphs with `BlueprintReadOnly` or `BlueprintReadWrite` and justify the choice',
    'Explain why component pointers use `VisibleAnywhere`',
    'Use `Transient`, `SaveGame`, `Config` and `AdvancedDisplay` correctly, and recognise `Replicated`',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Specifiers: instructions for three audiences',
      blocks: [
        {
          type: 'p',
          text: 'In the UObject unit you met [[uproperty]] as the macro that makes a member visible to [[reflection]], so the [[ue-garbage-collector|garbage collector]] can track it and the engine can save it. An empty `UPROPERTY()` already does all of that. Everything you put *inside* the parentheses is a [[specifier]]: an instruction about who else may see and touch the property.',
        },
        {
          type: 'p',
          text: 'Specifiers speak to three different audiences. The **editor** (the [[details-panel]] that designers use), **Blueprint graphs** (visual scripts that read and write values at run time), and **engine systems** (saving, config files, networking). One line of metadata replaces what would otherwise be hundreds of lines of UI and serialization code.',
        },
        {
          type: 'code',
          title: 'Weapon.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Weapon.generated.h"

UCLASS()
class MYGAME_API AWeapon : public AActor {
    GENERATED_BODY()

public:
    AWeapon();

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly,
        Category = "Components")
    TObjectPtr<UStaticMeshComponent> Mesh;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly,
        Category = "Weapon")
    float Damage = 25.f;

    UPROPERTY(EditAnywhere, Category = "Weapon")
    int32 MaxAmmo = 30;

    UPROPERTY(VisibleInstanceOnly, Transient,
        Category = "Weapon|Debug")
    int32 CurrentAmmo = 0;
};`,
          annotations: [
            { lines: 5, text: 'The [[generated-header]] must stay the **last** include. It defines macros for *this* file (what `GENERATED_BODY()` expands to, built from the specifiers below), and a header included after it could redefine them. UHT reports an error if anything follows it.' },
            { lines: '14-16', text: 'A component pointer: designers can *see* the mesh component and edit its settings, but cannot re-point or clear the pointer. Blueprint graphs can read it (a `Get Mesh` node). More on this later.' },
            { lines: '18-20', text: 'Per-weapon-type tuning: editable only in the Blueprint\'s class defaults, readable (not writable) from graphs.' },
            { lines: '22-23', text: 'Editable on the class defaults **and** on every placed copy. No Blueprint specifier, so graphs cannot see it at all.' },
            { lines: '25-27', text: 'Runtime state: shown read-only on a selected instance while you play, never saved to disk (`Transient`). The `|` creates a sub-category.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why declarative specifiers instead of code?',
          text: 'The editor is a generic program: it has never heard of `AWeapon`. It builds the Details panel at run time by walking the reflection data that [[unreal-header-tool|UHT]] generated from your specifiers — the property\'s type, its flags, its category. That is why adding one word to a `UPROPERTY` makes a new field appear for designers without you writing any UI, and why the same mechanism also drives saving, Blueprint access and replication.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'No specifier, no Details panel',
          text: 'A plain `UPROPERTY()` is tracked by the garbage collector and saved, but it does **not** appear in the Details panel or in Blueprint graphs. Exposure is always opt-in.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The Edit / Visible matrix',
      blocks: [
        {
          type: 'p',
          text: 'Every exposed property answers two questions. First: may designers **change** it (`Edit…`) or only **look** at it (`Visible…`)? Second: **where** — on the class defaults, on placed instances, or both?',
        },
        {
          type: 'definition',
          term: 'Class defaults vs instances',
          text: 'The **class defaults** are the values every new object of a class starts with. For a [[blueprint-class]] you edit them in the Blueprint editor\'s *Class Defaults*; under the hood they live on the [[cdo]], which Unreal calls the class [[archetype]]. An **instance** is one particular object: a specific door placed in a level, or a projectile spawned at run time.',
        },
        {
          type: 'table',
          headers: ['Specifier', 'Class defaults', 'Placed instance', 'Typical use'],
          rows: [
            ['`EditAnywhere`', 'Editable', 'Editable', 'Values where a per-instance tweak makes sense: a door\'s open angle, a guard\'s patrol radius'],
            ['`EditDefaultsOnly`', 'Editable', 'Hidden', 'Per-type tuning that must be identical for every copy: a rifle\'s damage, its projectile class'],
            ['`EditInstanceOnly`', 'Hidden', 'Editable', 'References to other actors in the same level: the door this lever opens'],
            ['`VisibleAnywhere`', 'Read-only', 'Read-only', 'Component pointers; values you want to see but never change'],
            ['`VisibleDefaultsOnly`', 'Read-only', 'Hidden', 'Rare: showing a fixed per-class value for reference'],
            ['`VisibleInstanceOnly`', 'Hidden', 'Read-only', 'Runtime state to inspect on a selected actor during play, like current health'],
          ],
          caption: 'The six editor-visibility specifiers. Pick exactly one per property.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have DefaultsOnly and InstanceOnly at all?',
          text: '`EditDefaultsOnly` turns a convention into a guarantee. If rifle damage were `EditAnywhere`, someone could quietly give the one rifle in level 3 a damage of 500 and nobody would notice until a playtester did. With `EditDefaultsOnly`, "all rifles deal 25" is enforced by the editor.\n\n`EditInstanceOnly` exists because class defaults are stored in an [[asset]] that is shared by every level, so they cannot point at an actor that only exists inside one particular map. The picker for a `TObjectPtr<ADoor>` only offers level actors on a placed instance, so that is where the property should be editable.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'One visibility specifier per property',
          text: '`Edit*` and `Visible*` are mutually exclusive. Writing `UPROPERTY(EditAnywhere, VisibleAnywhere)` is rejected by UHT with an error saying it found more than one edit/visibility specifier, so the build stops before the C++ compiler even runs.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'An `ALever` actor has a property `TObjectPtr<ADoor> TargetDoor`. Level designers must link each lever they place to a specific door in the same level. Which specifier fits best?',
      options: [
        {
          text: '`EditDefaultsOnly`',
          why: 'Class defaults live in a shared asset that cannot hold a reference to an actor inside one particular level, so the designer could never pick the door there.',
        },
        {
          text: '`EditInstanceOnly`',
          correct: true,
          why: 'Exactly: each placed lever gets its own door, chosen on the instance, where level actors can be picked. Hiding it on the defaults avoids a field that could never be filled meaningfully.',
        },
        {
          text: '`VisibleAnywhere`',
          why: '`Visible*` specifiers are read-only. The designer could see the (empty) field but never assign a door.',
        },
        {
          text: '`BlueprintReadWrite`',
          why: 'This controls Blueprint graph access only. Without an `Edit*` specifier the property does not appear in the Details panel at all.',
        },
      ],
      explanation:
        'Ask two questions: who sets this value (designers, so `Edit…`) and where does the value differ (per placed lever, so `…InstanceOnly`). References to other level actors are the classic `EditInstanceOnly` case, because only an instance lives in the same level as its target.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Defaults, overrides and the yellow arrow',
      blocks: [
        {
          type: 'p',
          text: 'A property\'s value is built up in layers. Each layer starts from the one before and may override it. Understanding this order explains most "why didn\'t my change show up?" moments in Unreal.',
        },
        {
          type: 'steps',
          items: [
            { title: 'C++ default', text: 'Your in-class initializer or constructor runs when the engine builds the class default object of the C++ class.' },
            { title: 'Blueprint class defaults', text: 'A [[blueprint-class|Blueprint child]] such as `BP_Door` stores only the values a designer changed in its Class Defaults, applied on top of the C++ defaults.' },
            { title: 'Instance overrides', text: 'A door placed in a level stores only the values a designer changed on *that door*, applied on top of the Blueprint defaults.' },
            { title: 'Run time', text: 'Gameplay code (C++ or Blueprint) can change the value while the game runs. Those changes are not written back to the level.' },
          ],
        },
        {
          type: 'code',
          title: 'Door.h',
          code: `UPROPERTY(EditAnywhere, Category = "Door",
    meta = (ClampMin = "0.0", ClampMax = "180.0"))
float OpenAngle = 90.f;`,
          annotations: [
            { lines: 2, text: '`meta = (...)` adds editor-only hints such as slider limits. The next lessons cover metadata in detail.' },
            { lines: 3, text: 'The bottom layer: every door starts here unless a Blueprint or an instance overrides it.' },
          ],
        },
        {
          type: 'p',
          text: 'In the Details panel, a value that differs from the layer below it shows a small **reset-to-default arrow** next to it. Clicking it removes the override, so the property follows its archetype again.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Changing a C++ default does not touch overridden values',
          text: 'Suppose designers placed 20 doors and changed `OpenAngle` on three of them. If you now change the C++ default from `90.f` to `120.f`, the 17 untouched doors open to 120 degrees, but the three overridden doors keep their own values. The same applies to Blueprint children that overrode the property. This is a feature — designer work is never silently erased — but it surprises programmers who expect the code to win.',
        },
        {
          type: 'deepdive',
          title: 'Delta serialization: why only overrides are saved',
          blocks: [
            {
              type: 'p',
              text: 'When Unreal saves a level or a Blueprint, it compares each property of each object against that object\'s archetype and writes **only the properties that differ**. On load, it constructs the object from the archetype first and then applies the saved differences.',
            },
            {
              type: 'p',
              text: 'This keeps level files small (a map with 5,000 identical rocks stores very little per rock) and is precisely what makes changes to defaults flow through to every instance that never overrode them. It is also why renaming a C++ property can lose saved values: the saved delta refers to the old name, which no longer matches anything. The metadata lesson shows how to rename only the label instead.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'order',
      prompt: 'For one `BP_Door` placed in a level, put the sources of its `OpenAngle` value in the order they are applied, first to last (the last one applied wins).',
      linesAreCode: false,
      lines: [
        'The C++ initializer `float OpenAngle = 90.f;` when the class default object is built',
        'The value set in `BP_Door`\'s Class Defaults',
        'The value a designer typed on this particular door in the level',
        'A value assigned by gameplay code while the game is running',
      ],
      explanation:
        'Each layer is applied on top of the previous one: C++ default, then Blueprint class defaults, then the instance override saved in the level, then run-time code. Because the saved layers only store differences, removing an override (the reset arrow) makes the value fall through to the layer below.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'Designers placed 20 doors and changed `OpenAngle` on a few of them. You then change the C++ default from `90.f` to `120.f`. Every door, including the ones designers tweaked, now opens to 120 degrees.',
      answer: false,
      explanation:
        'Levels store only the properties that differ from the archetype. Untouched doors pick up the new default because they never saved a value of their own, but tweaked doors saved an override, and that override is applied on top of whatever the default now is. To push a new value onto overridden instances, a designer must reset them (the yellow arrow) or edit them.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Blueprint access: BlueprintReadOnly and BlueprintReadWrite',
      blocks: [
        {
          type: 'p',
          text: 'The `Edit*` / `Visible*` family controls the Details panel: data edited while designing. A second, independent family controls **Blueprint graphs**: logic that runs while playing. [[blueprint-read-write|BlueprintReadOnly]] gives graphs a *Get* node; `BlueprintReadWrite` gives them *Get* and *Set* nodes.',
        },
        {
          type: 'table',
          headers: ['Combination', 'Details panel', 'Blueprint graph', 'Good for'],
          rows: [
            ['`EditDefaultsOnly, BlueprintReadOnly`', 'Edit on defaults', 'Get only', 'Tuning values that graphs need to read: the most common choice'],
            ['`VisibleAnywhere, BlueprintReadOnly`', 'Read-only', 'Get only', 'Component pointers'],
            ['`BlueprintReadWrite` alone', 'Hidden', 'Get and Set', 'Runtime state that Blueprint logic owns'],
            ['`EditAnywhere, BlueprintReadWrite`', 'Edit everywhere', 'Get and Set', 'Use sparingly: anyone, anywhere, can change it'],
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Anyone can skip your rules',
            tone: 'bad',
            code: `UPROPERTY(EditAnywhere, BlueprintReadWrite,
    Category = "Health")
float Health = 100.f;`,
            text: 'Any Blueprint can `Set Health` to 0 without triggering your death logic, or to 10,000 past your maximum.',
          },
          right: {
            title: 'Read freely, change through a function',
            tone: 'good',
            code: `UPROPERTY(VisibleInstanceOnly,
    BlueprintReadOnly, Category = "Health")
float Health = 100.f;

UFUNCTION(BlueprintCallable, Category = "Health")
void ApplyDamage(float Amount);`,
            text: 'Graphs read `Health`, but every change goes through C++ that clamps it and fires death events.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why two separate axes?',
          text: 'Editing in the Details panel and writing from a graph are different risks. A designer typing a number while setting up a level is supervised, one-off and saved. A graph setting a value at run time is automated and can happen thousands of times per match. Splitting the axes lets you say "tune it here, but never let a script change it" — the same [[encapsulation]] you practised with private members and public functions in the C++ course.',
        },
        {
          type: 'list',
          items: [
            '`Category = "Weapon"` groups the property in the Details panel and in the Blueprint editor\'s variable list. Game modules don\'t strictly require it, but engine modules do, and every professional codebase uses it.',
            'UHT refuses `BlueprintReadOnly` / `BlueprintReadWrite` on a `private` member unless you add `meta = (AllowPrivateAccess = "true")`. `Edit*` specifiers work on private members without it. The metadata lesson explains why.',
            '`BlueprintGetter = FuncName` and `BlueprintSetter = FuncName` route graph access through your own functions when you need validation on every read or write.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: 'Complete the declaration so the value is tuned per weapon type in the Blueprint\'s class defaults, hidden on placed instances, and readable but not writable from graphs.',
      template: `UPROPERTY(___, ___, Category = "Weapon")
float FireInterval = 0.2f;`,
      blanks: [{ answers: ['EditDefaultsOnly'] }, { answers: ['BlueprintReadOnly'] }],
      wordBank: ['EditDefaultsOnly', 'BlueprintReadOnly', 'EditAnywhere', 'EditInstanceOnly', 'BlueprintReadWrite', 'VisibleAnywhere', 'Transient'],
      explanation:
        '`EditDefaultsOnly` puts the field in the Blueprint\'s Class Defaults and hides it on instances, so every copy of `BP_Rifle` shares one fire interval. `BlueprintReadOnly` gives graphs a *Get* node only. `EditAnywhere` would allow per-instance drift, and `BlueprintReadWrite` would let any script change it mid-game.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Component pointers: why VisibleAnywhere',
      blocks: [
        {
          type: 'p',
          text: 'Components created with [[createdefaultsubobject]] are almost always declared `VisibleAnywhere`. Beginners find this odd, because designers clearly *do* edit the mesh, its material and its collision. The resolution: a specifier describes **the variable it is attached to**, and that variable is a pointer.',
        },
        {
          type: 'code',
          title: 'Pickup.h',
          code: `UCLASS()
class MYGAME_API APickup : public AActor {
    GENERATED_BODY()

public:
    APickup();

protected:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly,
        Category = "Components")
    TObjectPtr<USphereComponent> Trigger;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly,
        Category = "Components")
    TObjectPtr<UStaticMeshComponent> Mesh;
};`,
          annotations: [
            { lines: '9-11', text: '`VisibleAnywhere` freezes the pointer `Trigger`: nobody can make it point at another object or at nothing. The sphere\'s own radius and collision settings are separate properties with their own `EditAnywhere` specifiers, so they remain editable.' },
            { lines: 13, text: '`BlueprintReadOnly` lets graphs fetch the component (`Get Mesh`) and call functions on it, but never assign a different component to the variable.' },
          ],
        },
        {
          type: 'code',
          title: 'Pickup.cpp',
          code: `#include "Pickup.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"

APickup::APickup() {
    Trigger = CreateDefaultSubobject<USphereComponent>(
        TEXT("Trigger"));
    SetRootComponent(Trigger);

    Mesh = CreateDefaultSubobject<UStaticMeshComponent>(
        TEXT("Mesh"));
    Mesh->SetupAttachment(Trigger);
}`,
          annotations: [
            { lines: '6-8', text: 'The constructor is the single source of truth for which component `Trigger` points at. Every instance must keep this relationship or the actor\'s hierarchy breaks.' },
            { lines: 12, text: 'Code elsewhere dereferences `Mesh` freely, trusting that it was set here and is never null.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'EditAnywhere on the pointer',
            tone: 'bad',
            text: 'The editor treats the **pointer** as designer data. Depending on context it can offer to reassign or clear it, and whatever is chosen is serialized over the value your constructor set. At best that is confusing; at worst `Mesh` ends up null and gameplay code crashes.',
          },
          right: {
            title: 'VisibleAnywhere on the pointer',
            tone: 'good',
            text: 'The pointer is locked to the subobject created in the constructor. Selecting the component still shows all of *its* editable properties (mesh asset, materials, collision), because those belong to the component object, not to your pointer.',
          },
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A label on a box',
          text: 'Think of the pointer as a label glued to a box. `VisibleAnywhere` means the label cannot be peeled off and stuck on a different box. You can still open the box and rearrange what is inside.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Asset references are different',
          text: 'A pointer to an **asset**, such as `TObjectPtr<UStaticMesh> AltMesh` or `TObjectPtr<USoundBase> PickupSound`, *should* be `EditAnywhere` or `EditDefaultsOnly`: choosing which asset to use is exactly the designer\'s job. Only pointers to subobjects your constructor owns should be `Visible*`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'Why do component pointers such as `Mesh` normally use `VisibleAnywhere` rather than `EditAnywhere`?',
      options: [
        {
          text: 'The specifier applies to the pointer: it stops anyone re-pointing or clearing it, while the component\'s own properties stay editable',
          correct: true,
          why: 'Right. The pointer is fixed by the constructor; the mesh asset, materials and collision are properties of the component object and carry their own `Edit*` specifiers.',
        },
        {
          text: 'It makes the component\'s settings read-only so designers can\'t break the mesh',
          why: 'This is the common misconception. Designers can still change the mesh asset, materials and so on, because those are separate properties declared on the component class.',
        },
        {
          text: '`EditAnywhere` cannot be used on pointer properties',
          why: 'It can. `EditAnywhere` on an asset pointer like `TObjectPtr<USoundBase>` is normal and gives designers an asset picker.',
        },
        {
          text: 'Only `VisibleAnywhere` pointers are tracked by the garbage collector',
          why: 'Garbage-collection tracking comes from `UPROPERTY` itself, with or without specifiers. Visibility has nothing to do with it.',
        },
      ],
      explanation:
        'Specifiers describe the variable they decorate. For a component pointer, the variable is the link between the actor and the subobject the constructor created. Freezing that link with `VisibleAnywhere` keeps the hierarchy intact, while selecting the component in the editor still shows every property the component class itself exposes.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Saving and loading: Transient, SaveGame and Config',
      blocks: [
        {
          type: 'p',
          text: 'By default every `UPROPERTY` is **serialized**: written to disk when its Blueprint or level is saved, and read back on load. Three specifiers change that behaviour, and each answers a different question.',
        },
        {
          type: 'table',
          headers: ['Specifier', 'Question it answers', 'Effect'],
          rows: [
            ['[[transient-property|Transient]]', 'Should this be saved in assets and levels at all?', 'Never saved. On load it starts from its default (zero for most types). Use for runtime state and caches.'],
            ['`SaveGame`', 'Should my save-game system include this?', 'Marks the property for a save system that serializes with `ArIsSaveGame` set. Does nothing on its own.'],
            ['[[config-property|Config]]', 'Should the default come from an `.ini` file?', 'The value is loaded from the class\'s config file, overriding the C++ default.'],
          ],
        },
        {
          type: 'code',
          title: 'EnemySpawner.h',
          code: `UCLASS(Config = Game)
class MYGAME_API AEnemySpawner : public AActor {
    GENERATED_BODY()

protected:
    UPROPERTY(Config, EditDefaultsOnly, Category = "Spawning")
    int32 MaxAliveEnemies = 20;

    UPROPERTY(VisibleInstanceOnly, Transient,
        Category = "Spawning|Debug")
    int32 AliveEnemies = 0;

    UPROPERTY(SaveGame)
    int32 WavesCleared = 0;
};`,
          annotations: [
            { lines: 1, text: '`Config = Game` tells this class to read `DefaultGame.ini`. Without it, an actor inherits `AActor`\'s `Config = Engine` and would read `DefaultEngine.ini` instead.' },
            { lines: '6-7', text: 'The ini value (if present) replaces the `20` when the class default object is created, so balancing can change without recompiling.' },
            { lines: '9-11', text: 'A live counter. Saving `5` into a level would be meaningless (no enemies exist in the editor), so it is `Transient`.' },
            { lines: '13-14', text: 'Opted in to the save system: when progress is saved, this value is included; nothing happens unless you write that system.' },
          ],
        },
        {
          type: 'code',
          lang: 'ini',
          title: 'Config/DefaultGame.ini',
          code: `[/Script/MyGame.EnemySpawner]
MaxAliveEnemies=40`,
          annotations: [
            { lines: 1, text: 'The section name is `/Script/<Module>.<ClassName>`, with the class name written **without** its `A`/`U` prefix.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'SaveGame is a flag, not a save system',
          text: 'Marking a property `SaveGame` writes nothing to disk. It only matters when your save code serializes an object with an archive whose `ArIsSaveGame` flag is set; such an archive then includes exactly the properties you flagged. Player progress persists between sessions only because some code you (or a plugin) wrote saves it.',
        },
        {
          type: 'deepdive',
          title: 'What a SaveGame-aware serializer looks like',
          blocks: [
            {
              type: 'code',
              title: 'SaveHelpers.cpp',
              code: `#include "Serialization/MemoryWriter.h"
#include "Serialization/ObjectAndNameAsStringProxyArchive.h"

TArray<uint8> SaveActorState(AActor* Actor) {
    TArray<uint8> Bytes;
    FMemoryWriter Writer(Bytes);
    FObjectAndNameAsStringProxyArchive Ar(Writer, true);
    Ar.ArIsSaveGame = true;
    Actor->Serialize(Ar);
    return Bytes;
}`,
              annotations: [
                { lines: 7, text: 'Wraps the byte writer so object references and names are stored as strings, which stay valid between game sessions.' },
                { lines: 8, text: 'The key line: with this flag set, `Serialize` writes only properties marked `SaveGame`.' },
              ],
            },
            {
              type: 'p',
              text: 'Real save systems store these bytes inside a `USaveGame` object and write it with `UGameplayStatics::SaveGameToSlot`. The point here is only that the `SaveGame` specifier is the *filter*; the archive is the machinery.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'bug',
      prompt: 'Designers report that every guard\'s patrol speed snaps back to 300 after they save and reopen the level, even though they tuned each guard individually. Tap the line responsible.',
      code: `UCLASS()
class MYGAME_API AGuardPatrol : public AActor {
    GENERATED_BODY()

public:
    /** Units per second. Designers tune this per guard. */
    UPROPERTY(EditAnywhere, Transient, Category = "Patrol")
    float PatrolSpeed = 300.f;

    UPROPERTY(EditInstanceOnly, Category = "Patrol")
    TArray<TObjectPtr<AActor>> Waypoints;

    UPROPERTY(VisibleInstanceOnly, Transient,
        Category = "Patrol|Debug")
    int32 CurrentWaypoint = 0;
};`,
      bugLines: [7],
      hint: 'Which specifier decides whether a value is written to the level file?',
      explanation:
        '`Transient` means "never serialize", so the per-guard values typed in the Details panel are never written to the level. On reload each guard is rebuilt from its archetype and shows 300 again. Remove `Transient` from line 7. The `Transient` on line 13 is correct: `CurrentWaypoint` is runtime state that should start from zero every time.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'AdvancedDisplay, Replicated and a few more',
      blocks: [
        {
          type: 'p',
          text: 'Large classes can have dozens of exposed properties. `AdvancedDisplay` moves rarely-touched ones into a collapsed section at the bottom of their category (the small expand arrow), so the Details panel shows the important settings first.',
        },
        {
          type: 'code',
          title: 'EnemyAI.h',
          code: `UPROPERTY(EditDefaultsOnly, Category = "Perception")
float SightRange = 2000.f;

UPROPERTY(EditDefaultsOnly, AdvancedDisplay,
    Category = "Perception")
float PeripheralVisionAngle = 70.f;

UPROPERTY(Replicated, BlueprintReadOnly,
    Category = "Combat")
bool bIsAlerted = false;`,
          annotations: [
            { lines: '1-2', text: 'The setting everyone tunes: always visible.' },
            { lines: '4-6', text: 'Still fully editable, just tucked away under the category\'s advanced section.' },
            { lines: '8-10', text: 'Preview of networking: `Replicated` asks the engine to copy this value from the server to clients. It also requires `GetLifetimeReplicatedProps` and `DOREPLIFETIME` in the `.cpp`, which the networking unit covers.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Replicated is only a preview here',
          text: '[[replication]] is the engine\'s system for keeping server and clients in sync. A `Replicated` property only replicates if its actor is set to replicate and the property is registered in `GetLifetimeReplicatedProps`; its sibling `ReplicatedUsing = OnRep_X` also calls a function when the new value arrives. You\'ll learn the full rules, including why only the server should write these values, in the networking unit.',
        },
        {
          type: 'table',
          headers: ['Specifier', 'What it does'],
          rows: [
            ['`NoClear`', 'Removes the *Clear* option from an object or class picker, so the value can never be set to None.'],
            ['`EditFixedSize`', 'Designers can edit array elements but not add or remove them.'],
            ['`Interp`', 'The property can be animated by Sequencer tracks (cutscenes).'],
            ['`SimpleDisplay`', 'The opposite of `AdvancedDisplay`: always shown in the main section.'],
            ['`DuplicateTransient`', 'Reset to default when the object is duplicated (copy-paste, Alt-drag).'],
          ],
          caption: 'Less common specifiers worth recognising.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Read the engine\'s own headers',
          text: 'Open `Actor.h` or `CharacterMovementComponent.h` in your IDE and skim their `UPROPERTY` lines. Epic\'s engineers use these specifiers thousands of times, and seeing real combinations is the fastest way to build intuition.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Select **every** statement that is true about this property.',
      code: `UPROPERTY(EditAnywhere, BlueprintReadOnly,
    AdvancedDisplay, Category = "AI")
float HearingRange = 1200.f;`,
      options: [
        {
          text: 'Designers can change it on the Blueprint\'s class defaults and on each placed instance',
          correct: true,
          why: '`EditAnywhere` means editable on both the archetype and instances.',
        },
        {
          text: 'Blueprint graphs can read it but not set it',
          correct: true,
          why: '`BlueprintReadOnly` produces a *Get* node only.',
        },
        {
          text: 'It appears in the collapsed advanced section of the AI category',
          correct: true,
          why: 'That is exactly what `AdvancedDisplay` does; it is purely about layout.',
        },
        {
          text: 'It is not saved with the level, because advanced properties are transient',
          why: '`AdvancedDisplay` only affects where the field is drawn. Without `Transient`, instance overrides are saved like any other property.',
        },
        {
          text: 'Blueprint graphs can change it with a *Set* node',
          why: 'That would require `BlueprintReadWrite`. Graph access and Details access are separate axes.',
        },
      ],
      explanation:
        'Read specifiers by axis: `EditAnywhere` answers the Details-panel question, `BlueprintReadOnly` answers the graph question, `AdvancedDisplay` is layout, and nothing here changes serialization. Separating the axes in your head makes even long specifier lists easy to decode.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'truefalse',
      prompt: 'Adding `SaveGame` to a `UPROPERTY` is enough to make its value persist between play sessions.',
      answer: false,
      explanation:
        '`SaveGame` is only a filter flag. Values persist when your code serializes the object with an archive that has `ArIsSaveGame` set and writes the result somewhere (typically a `USaveGame` written with `SaveGameToSlot`). Without that code, the flag has no effect at all.',
    },
  ],
  takeaways: [
    'Specifiers inside `UPROPERTY(...)` tell three audiences what they may do: the Details panel, Blueprint graphs and engine systems such as saving and replication.',
    'Pick one of six visibility specifiers: `Edit` or `Visible`, combined with `Anywhere`, `DefaultsOnly` or `InstanceOnly`. References to level actors are `EditInstanceOnly`; per-type tuning is `EditDefaultsOnly`.',
    'Values layer up: C++ default, Blueprint class defaults, instance override, then run time. Only differences are saved, so changing a default never overwrites a designer\'s override.',
    '`BlueprintReadOnly` / `BlueprintReadWrite` control graph access independently of the Details panel. Prefer read-only plus a `BlueprintCallable` function for anything with rules.',
    'Component pointers are `VisibleAnywhere` because the specifier locks the pointer, not the component: its own properties stay editable.',
    '`Transient` means never saved, `Config` loads defaults from an ini file, and `SaveGame` is a filter for your own save system. `Replicated` is a networking preview.',
  ],
  reading: [
    {
      title: 'Unreal Engine UProperties',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-uproperties',
      source: 'unreal-docs',
      note: 'Epic\'s reference list of property specifiers; skim it once now and return to it whenever you meet an unfamiliar one.',
    },
    {
      title: 'All UPROPERTY specifiers (benui)',
      url: 'https://benui.ca/unreal/uproperty/',
      source: 'article',
      note: 'A community reference with screenshots showing exactly how each specifier changes the editor.',
    },
    {
      title: 'Unreal Engine C++ Complete Guide',
      url: 'https://www.tomlooman.com/unreal-engine-cpp-guide/',
      source: 'article',
      note: 'Tom Looman\'s guide; its property-exposure section shows the specifier combinations used in shipped games.',
    },
  ],
};
