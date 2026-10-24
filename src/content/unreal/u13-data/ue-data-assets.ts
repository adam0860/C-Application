import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-data-assets',
  title: 'Data Assets and Primary Data Assets',
  summary:
    'Move weapon stats, enemy tuning and item definitions out of C++ and into shareable assets that designers edit without recompiling.',
  minutes: 18,
  objectives: [
    'Explain why hard-coded tuning values slow a team down and what problem data assets solve',
    'Declare a `UDataAsset` subclass with well-chosen `UPROPERTY` specifiers and create instances of it in the editor',
    'Reference a data asset from an actor and keep per-instance runtime state out of the shared asset',
    'Turn a data asset into a `UPrimaryDataAsset`, explain `GetPrimaryAssetId()`, and load primary assets through the Asset Manager',
    'Choose between a data asset, a data-only Blueprint and hard-coded values for a given situation',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The problem: tuning trapped in code',
      blocks: [
        {
          type: 'p',
          text: 'Imagine your shooter has a rifle, a shotgun and a pistol. The quickest way to give them stats is to hard-code them: a C++ `AWeapon` class whose constructor sets `Damage = 20.f`, `ShotsPerSecond = 8.f` and so on, plus one subclass per weapon. It works on day one. By week three it is a bottleneck.',
        },
        {
          type: 'compare',
          left: {
            title: 'Stats baked into code',
            tone: 'bad',
            code: `ARifle::ARifle()
{
    Damage = 20.f;
    ShotsPerSecond = 8.f;
    MagazineSize = 30;
}
// AShotgun, APistol, ASniper...
// one class per weapon`,
            text: 'Every balance tweak is a programmer task: edit, compile, restart or Live Code, test. Designers wait. Values are scattered across many classes.',
          },
          right: {
            title: 'Stats in data assets',
            tone: 'good',
            code: `// One C++ class describes the SHAPE
// of weapon data. Designers create
// DA_Rifle, DA_Shotgun, DA_Pistol
// as assets and fill in the numbers.
// AWeapon just reads WeaponData.`,
            text: 'Designers change a number, save, press Play. No compile. One actor class serves every weapon; the data decides which weapon it is.',
          },
        },
        {
          type: 'p',
          text: 'This is the core idea of **data-driven design**: C++ defines *behaviour* and the *shape* of the data; content files hold the *values*. Unreal gives you several tools for it. This unit covers the three you will use most: [[data-asset|Data Assets]] (this lesson), [[data-table|Data Tables]] and [[gameplay-tag|Gameplay Tags]].',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why separate data from behaviour?',
          text: 'On a real team, programmers are outnumbered by designers, artists and QA. If every number lives in C++, every balance pass queues behind a programmer and a compile. Moving values into assets lets the people who *own* the numbers iterate dozens of times an hour, while the code stays small and stable. It also kills duplication: the fire-rate logic is written once in `AWeapon`, not copied into ten subclasses.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Recipe and recipe cards',
          text: 'Think of `AWeapon` as a kitchen that knows *how* to cook, and each data asset as a recipe card: ingredients and quantities. Adding a new dish means writing a new card, not rebuilding the kitchen.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Declaring a data asset class',
      blocks: [
        {
          type: 'p',
          text: 'A data asset is an ordinary [[uobject]] that is saved to disk as an [[asset]]. You create one kind of data asset by subclassing `UDataAsset` and adding [[uproperty|UPROPERTY]] fields for the values designers should edit. The class is the *template*; each asset you create from it is one *instance* with its own values.',
        },
        {
          type: 'code',
          title: 'WeaponData.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "WeaponData.generated.h"

class UStaticMesh;
class USoundBase;

/** Read-only definition of one weapon type. */
UCLASS(BlueprintType)
class MYGAME_API UWeaponData : public UDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly,
        Category = "UI")
    FText DisplayName;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly,
        Category = "Combat", meta = (ClampMin = "0.0"))
    float Damage = 20.f;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly,
        Category = "Combat", meta = (ClampMin = "0.1"))
    float ShotsPerSecond = 5.f;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly,
        Category = "Combat", meta = (ClampMin = "1"))
    int32 MagazineSize = 30;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly,
        Category = "Visuals")
    TObjectPtr<UStaticMesh> Mesh;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly,
        Category = "Audio")
    TObjectPtr<USoundBase> FireSound;
};`,
          annotations: [
            { lines: 4, text: '`UDataAsset` and `UPrimaryDataAsset` are both declared in `Engine/DataAsset.h`.' },
            { lines: 5, text: 'As always, the [[generated-header]] must be the **last** include: it contains code UHT generated for exactly this header, and it relies on everything above it already being declared.' },
            { lines: '7-8', text: '[[forward-declaration|Forward declarations]] keep this header light. A `TObjectPtr` member only needs to know the type exists, not its full definition.' },
            { lines: 11, text: '`BlueprintType` lets Blueprints hold variables of type `UWeaponData` — handy for UI widgets that display weapon stats.' },
            { lines: 12, text: 'Derive from `UDataAsset`. It holds no gameplay data of its own; it exists to be subclassed, and any non-abstract subclass automatically shows up in the editor\'s "Data Asset" class picker.' },
            { lines: '17-18', text: '[[edit-anywhere|EditDefaultsOnly]] means "editable on assets and class defaults, never on a placed instance". A data asset *is* an asset, so designers edit it in its own editor window. `BlueprintReadOnly` lets Blueprints read but never write.' },
            { lines: '21-23', text: '`ClampMin` is editor metadata: the details panel refuses values below the limit. It does **not** clamp at runtime, so code should still be defensive.' },
            { lines: '33-35', text: 'Asset references work too. This is a [[hard-reference]]: loading the data asset also loads the mesh. More on that trade-off later.' },
          ],
        },
        {
          type: 'p',
          text: 'Notice what is *not* here: no `Tick`, no components, no transform. A data asset is not an actor and never exists in a level. It is a bag of values (and optionally a few helper functions) that lives in the Content Browser.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not a plain C++ struct of constants?',
          text: 'In standard C++ you might write `constexpr WeaponStats Rifle{20.f, 8.f, 30};` — fast, but frozen at [[compile-time]]. Unreal needs three things a plain struct cannot give: the editor must *discover* the fields to draw a details panel, the values must be *saved* to and loaded from a `.uasset` file, and Blueprints must be able to read them. All three come from [[reflection]], which is why the fields are `UPROPERTY`s on a `UCLASS`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'fill',
      prompt: 'Complete the header so it declares a data asset class designers can edit (but Blueprints can only read).',
      template: `#include "Engine/DataAsset.h"
#include "EnemyData.___.h"

UCLASS(BlueprintType)
class MYGAME_API UEnemyData : public ___
{
    GENERATED_BODY()

public:
    UPROPERTY(EditDefaultsOnly, ___,
        Category = "Stats")
    float MaxHealth = 100.f;
};`,
      blanks: [{ answers: ['generated'] }, { answers: ['UDataAsset', 'UPrimaryDataAsset'] }, { answers: ['BlueprintReadOnly'] }],
      wordBank: ['generated', 'UDataAsset', 'BlueprintReadOnly', 'AActor', 'BlueprintReadWrite', 'gen', 'UActorComponent'],
      explanation:
        'The UHT output header is always `<FileName>.generated.h` and must be the last include. Deriving from `UDataAsset` (or its subclass `UPrimaryDataAsset`) makes the class creatable as an asset; `AActor` would make it something you place in a level, which is the opposite of what we want. `BlueprintReadOnly` matches the intent "a shared definition nobody changes at runtime" — `BlueprintReadWrite` would invite Blueprints to modify a value every enemy shares.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Creating data asset instances in the editor',
      blocks: [
        {
          type: 'p',
          text: 'After you compile the class, designers can create as many weapon definitions as they like without touching C++ again:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Compile', text: 'Build the C++ module (or use [[live-coding]] for small changes) so the editor knows about `UWeaponData`. Adding or removing *fields* always needs a build; changing *values* never does.' },
            { title: 'Create the asset', text: 'In the Content Browser, right-click → **Miscellaneous → Data Asset**, then pick `WeaponData` from the class list.' },
            { title: 'Name it', text: 'Epic\'s naming convention uses a `DA_` prefix: `DA_Rifle`, `DA_Shotgun`, `DA_Pistol`. Keep them in a folder such as `/Game/Data/Weapons`.' },
            { title: 'Fill in values', text: 'Double-click the asset. The details panel shows your properties grouped by `Category`, with the `ClampMin` limits enforced.' },
            { title: 'Save', text: 'The asset is written to a `.uasset` file — a serialized `UWeaponData` object — and can be checked into source control like any other content.' },
          ],
        },
        {
          type: 'table',
          caption: 'Three instances of one class',
          headers: ['Asset', 'Damage', 'ShotsPerSecond', 'MagazineSize'],
          rows: [
            ['`DA_Rifle`', '20', '8', '30'],
            ['`DA_Shotgun`', '9 × 8 pellets', '1.2', '6'],
            ['`DA_Pistol`', '25', '3', '12'],
          ],
        },
        {
          type: 'definition',
          term: 'Class vs instance',
          text: '`UWeaponData` is a C++ class: it defines *which* fields exist. `DA_Rifle` is an object of that class saved to disk: it holds *values* for those fields. Adding a new weapon means creating a new instance — no new class, no compile.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Data assets can have functions too',
          text: 'Nothing stops you from adding `const` helper functions, such as `float GetSecondsBetweenShots() const { return 1.f / ShotsPerSecond; }`. Keep them pure calculations on the asset\'s own data. Anything that changes state belongs on the actor using the asset.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'order',
      prompt: 'A designer asks for a brand-new "Burst Rifle". The `UWeaponData` class already exists. Put the steps in order.',
      lines: [
        'Right-click in the Content Browser → Miscellaneous → Data Asset',
        'Choose WeaponData as the class',
        'Name the asset DA_BurstRifle and open it',
        'Fill in Damage, ShotsPerSecond, MagazineSize, Mesh and FireSound',
        'Save, then assign DA_BurstRifle to a weapon actor\'s WeaponData property',
      ],
      distractors: ['Create a new C++ subclass ABurstRifle and recompile'],
      linesAreCode: false,
      explanation:
        'Because the data class already exists, a new weapon is purely content work: create an instance, fill it in, save, and point an actor at it. The distractor is exactly the code-driven workflow data assets replace — a new subclass would cost a compile and duplicate behaviour that `AWeapon` already has.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Referencing a data asset from an actor',
      blocks: [
        {
          type: 'p',
          text: 'The actor holds a pointer to the definition it should use. A designer picks the asset from a dropdown on the actor (or its Blueprint subclass), and the C++ reads values from it.',
        },
        {
          type: 'code',
          title: 'Weapon.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Weapon.generated.h"

class UWeaponData;
class UStaticMeshComponent;

UCLASS()
class MYGAME_API AWeapon : public AActor
{
    GENERATED_BODY()

public:
    AWeapon();
    void Fire();

protected:
    virtual void BeginPlay() override;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<UStaticMeshComponent> MeshComponent;

    /** Which weapon is this? DA_Rifle, DA_Shotgun... */
    UPROPERTY(EditAnywhere, Category = "Weapon")
    TObjectPtr<const UWeaponData> WeaponData;

    /** Runtime state: belongs to THIS actor only. */
    UPROPERTY(VisibleInstanceOnly, Category = "Weapon")
    int32 AmmoInMagazine = 0;

    double LastFireTime = -1000.0;
};`,
          annotations: [
            { lines: '26-27', text: 'A pointer to `const UWeaponData`. `EditAnywhere` lets a designer choose the asset on the Blueprint defaults *or* on one placed actor. The `const` makes the compiler reject any attempt to modify the shared definition — Epic\'s Lyra sample uses this exact pattern for its data assets.' },
            { lines: '30-31', text: 'Current ammo changes every shot and differs per weapon, so it lives on the actor, not in the asset.' },
            { lines: 33, text: 'World time is a `double` in UE5 (`UWorld::GetTimeSeconds()` returns `double`).' },
          ],
        },
        {
          type: 'code',
          title: 'Weapon.cpp',
          code: `#include "Weapon.h"
#include "WeaponData.h"
#include "Components/StaticMeshComponent.h"
#include "Kismet/GameplayStatics.h"

AWeapon::AWeapon()
{
    MeshComponent = CreateDefaultSubobject<
        UStaticMeshComponent>(TEXT("Mesh"));
    SetRootComponent(MeshComponent);
}

void AWeapon::BeginPlay()
{
    Super::BeginPlay();

    if (!WeaponData)
    {
        UE_LOG(LogTemp, Warning,
            TEXT("%s has no WeaponData"), *GetName());
        return;
    }
    MeshComponent->SetStaticMesh(WeaponData->Mesh);
    AmmoInMagazine = WeaponData->MagazineSize;
}

void AWeapon::Fire()
{
    if (!WeaponData || AmmoInMagazine <= 0) { return; }

    const double Now = GetWorld()->GetTimeSeconds();
    const double Cooldown = 1.0 / WeaponData->ShotsPerSecond;
    if (Now - LastFireTime < Cooldown) { return; }

    LastFireTime = Now;
    --AmmoInMagazine;
    UGameplayStatics::PlaySoundAtLocation(
        this, WeaponData->FireSound, GetActorLocation());
    // ...trace, then apply WeaponData->Damage
}`,
          annotations: [
            { lines: 2, text: 'The header only forward-declared `UWeaponData`; the `.cpp` needs the full definition to access its members.' },
            { lines: '17-22', text: 'Always handle a missing reference. A designer can forget to assign the asset, and the log message tells them exactly which actor is misconfigured instead of crashing the editor.' },
            { lines: '23-24', text: 'Copy what you need from the definition into the actor. The mesh pointer and the starting ammo now come from data.' },
            { lines: 32, text: 'Every tuning value — fire rate here, damage below — is read from the asset, so a designer\'s change applies the next time you press Play.' },
            { lines: '35-36', text: 'Mutable state changes on `this` actor. `WeaponData` is never written to.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Never store runtime state in a data asset',
          text: 'A data asset is **one object shared by everyone who references it**. If `AWeapon` decremented `WeaponData->Ammo`, every rifle in the level would share one magazine. Worse, in the editor the change persists in memory after you stop Play-In-Editor, and if the asset is later saved for another reason the corrupted value is written to disk. Treat data assets as read-only at runtime — the `const` pointer enforces it.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Hard references load automatically',
          text: 'Because `WeaponData` is a `TObjectPtr` [[uproperty]], it is a [[hard-reference]]: when the level (or the Blueprint holding the default) loads, `DA_Rifle` loads too — and so does everything `DA_Rifle` hard-references, such as its mesh and sound. The pointer also keeps the asset alive for the [[ue-garbage-collector]].',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'bug',
      prompt: 'QA reports: "When I fire one rifle, the ammo counter drops on every rifle in the level." Tap the line responsible.',
      code: `// WeaponData.h (excerpt)
UPROPERTY(EditDefaultsOnly, BlueprintReadWrite)
int32 MagazineSize = 30;

UPROPERTY(EditDefaultsOnly, BlueprintReadWrite)
int32 CurrentAmmo = 30;

// Weapon.cpp
void AWeapon::Fire()
{
    if (!WeaponData || WeaponData->CurrentAmmo <= 0)
    {
        return;
    }
    WeaponData->CurrentAmmo--;
    SpawnProjectile(WeaponData->Damage);
}`,
      bugLines: [6, 15],
      hint: 'How many `UWeaponData` objects exist when ten rifles all reference `DA_Rifle`?',
      explanation:
        'Line 15 writes to the shared definition. All rifles point at the same `DA_Rifle` object, so they all see one `CurrentAmmo`. (The design mistake started at line 6 — runtime state does not belong in a data asset — but line 15 is where the shared value is actually corrupted.) In PIE the damage outlives the session, because the asset stays loaded in the editor. Fix: keep `MagazineSize` in the asset, add `int32 AmmoInMagazine` to `AWeapon`, initialise it from `MagazineSize` in `BeginPlay`, and hold the asset through `TObjectPtr<const UWeaponData>` so the compiler rejects line 15.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Why data assets pay off',
      blocks: [
        {
          type: 'p',
          text: 'Data assets earn their place for three concrete reasons: iteration speed, sharing and memory.',
        },
        {
          type: 'list',
          items: [
            '**Iteration without recompiling.** A designer edits `DA_Shotgun`, saves and presses Play. No C++ build, no Live Coding patch, no programmer in the loop.',
            '**One definition, many users.** Forty rifles in a level all point at `DA_Rifle`. Rebalance it once and every rifle — in every level, in every Blueprint that references it — changes together.',
            '**Memory.** The definition is loaded **once**. Each actor stores a single 8-byte pointer instead of its own copy of every stat, mesh reference and sound reference.',
          ],
        },
        {
          type: 'memory',
          caption: 'Three weapon actors, two loaded data assets',
          regions: [
            {
              label: 'Level — AWeapon actors',
              kind: 'other',
              cells: [
                { name: 'Rifle_1.WeaponData', type: 'const UWeaponData*', value: '→ DA_Rifle', pointsTo: 'rifle' },
                { name: 'Rifle_2.WeaponData', type: 'const UWeaponData*', value: '→ DA_Rifle', pointsTo: 'rifle' },
                { name: 'Shotgun_1.WeaponData', type: 'const UWeaponData*', value: '→ DA_Shotgun', pointsTo: 'shotgun' },
              ],
            },
            {
              label: 'Loaded assets (one copy each)',
              kind: 'heap',
              cells: [
                { id: 'rifle', name: 'DA_Rifle', type: 'UWeaponData', value: 'Damage=20, Rate=8, Mag=30', highlight: true },
                { id: 'shotgun', name: 'DA_Shotgun', type: 'UWeaponData', value: 'Damage=9x8, Rate=1.2, Mag=6' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Watch what your data asset drags into memory',
          text: 'Loading a data asset loads everything it hard-references. A `UWeaponData` with a hard pointer to a 4K icon texture keeps that texture in memory for as long as any weapon is loaded, even in levels with no UI. For heavy content that is only sometimes needed, use a [[soft-reference]] (`TSoftObjectPtr<UTexture2D>`) and load it on demand, exactly as you learned in the soft-references lesson.',
        },
        {
          type: 'heading',
          text: 'Data asset or data-only Blueprint?',
        },
        {
          type: 'p',
          text: 'The other common way to hold tuning values is a **data-only Blueprint**: a Blueprint subclass of `AWeapon` (say `BP_Rifle`) that only changes default values. Both are valid; they solve different problems.',
        },
        {
          type: 'compare',
          left: {
            title: 'Data-only Blueprint subclass',
            tone: 'neutral',
            text: 'A new **class** per variant. Supports **inheritance**: `BP_GoldenRifle` can derive from `BP_Rifle` and override only `Damage`. But every variant is a class with its own class default object, and gameplay code must know which *class* to spawn.',
          },
          right: {
            title: 'Data asset',
            tone: 'neutral',
            text: 'A new **instance** per variant of one class. No value inheritance between assets — each stores all its fields. Lightweight, easy to list and swap at runtime, and one actor class can become any weapon by changing one pointer.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does the engine offer both?',
          text: 'Epic\'s own comment on `UDataAsset` says it is for simple data related to one system, and recommends data-only Blueprint classes when you need **data inheritance or a complicated hierarchy**. Classes inherit, instances do not — that single fact usually decides it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'A level contains 40 `AWeapon` actors. 25 reference `DA_Rifle` and 15 reference `DA_Shotgun`. How many `UWeaponData` objects are loaded for these weapons?',
      options: [
        { text: '40 — each actor gets its own copy', why: 'Assigning an asset to a `TObjectPtr` property stores a pointer, not a copy. That is the whole point of a shared definition.' },
        { text: '2 — one per referenced asset', correct: true, why: 'Each asset is loaded once and every referencing actor points at that single object.' },
        { text: '1 — all data assets of a class are merged', why: 'Different assets are different objects with different values; they are never merged.' },
        { text: 'It depends on how many weapons are currently firing', why: 'Loading is driven by references, not by activity. Both assets load when the level loads, because the actors hard-reference them.' },
      ],
      explanation:
        'Data assets are objects identified by their package path; the engine never loads the same asset twice. Here 40 pointers lead to just 2 objects. This is why a rebalance affects every user at once — and why writing to a data asset at runtime affects every user at once too.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'truefalse',
      prompt: 'You can create `DA_GoldenRifle` as a child of `DA_Rifle` so that it inherits all of `DA_Rifle`\'s values and overrides only `Damage`.',
      answer: false,
      explanation:
        'Data assets are *instances*, and instances do not inherit from other instances — `DA_GoldenRifle` must store every field itself. If you need value inheritance, use data-only Blueprint classes (which inherit defaults from their parent class), or give the data asset a pointer to a "base" asset and resolve the fallback in code.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'UPrimaryDataAsset and the Asset Manager',
      blocks: [
        {
          type: 'p',
          text: 'So far, weapons load because something hard-references them. That breaks down for an in-game shop that must list **every** weapon — including ones no loaded level mentions. You do not want a giant array of hard pointers to every weapon (that would load them all, all the time). You want to ask the engine, "which weapons exist?", and then load just the ones you need.',
        },
        {
          type: 'p',
          text: 'That is the job of the [[asset-manager]], a global singleton (`UAssetManager`) that tracks **primary assets**: assets it can find, load and unload *by ID*. Everything a primary asset references is a **secondary asset**, loaded automatically as a dependency. To make your data assets primary, derive from [[primary-data-asset|UPrimaryDataAsset]] instead of `UDataAsset`.',
        },
        {
          type: 'code',
          title: 'WeaponData.h / WeaponData.cpp (excerpt)',
          code: `// WeaponData.h
UCLASS(BlueprintType)
class MYGAME_API UWeaponData : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    virtual FPrimaryAssetId GetPrimaryAssetId() const override;
    // ...same UPROPERTYs as before...
};

// WeaponData.cpp
FPrimaryAssetId UWeaponData::GetPrimaryAssetId() const
{
    // Type "Weapon" + asset name -> "Weapon:DA_Rifle"
    return FPrimaryAssetId(
        FPrimaryAssetType(TEXT("Weapon")), GetFName());
}`,
          annotations: [
            { lines: 3, text: '`UPrimaryDataAsset` is a `UDataAsset` subclass declared in the same header, so existing assets keep working when you switch the parent class.' },
            { lines: 8, text: '`GetPrimaryAssetId()` is a virtual on `UObject`. The Asset Manager calls it to learn each asset\'s ID.' },
            { lines: '16-17', text: 'An [[primary-asset-id|FPrimaryAssetId]] is a *type* plus a *name*. `GetFName()` is the object\'s name — for an asset, its file name (`DA_Rifle`).' },
          ],
        },
        {
          type: 'p',
          text: 'You do not *have* to override `GetPrimaryAssetId()`. `UPrimaryDataAsset`\'s default implementation uses the class name as the type (`WeaponData:DA_Rifle`). Overriding it pins the type to a stable name you choose, so renaming the C++ class later does not change every ID saved in your game.',
        },
        {
          type: 'p',
          text: 'Next, tell the Asset Manager where to look. In **Project Settings → Game → Asset Manager → Primary Asset Types to Scan**, add an entry with type `Weapon`, base class `WeaponData` and directory `/Game/Data/Weapons`. The editor saves it to `DefaultGame.ini`:',
        },
        {
          type: 'code',
          lang: 'ini',
          title: 'Config/DefaultGame.ini',
          code: `[/Script/Engine.AssetManagerSettings]
+PrimaryAssetTypesToScan=(PrimaryAssetType="Weapon",
  AssetBaseClass=/Script/MyGame.WeaponData,
  bHasBlueprintClasses=False,bIsEditorOnly=False,
  Directories=((Path="/Game/Data/Weapons")))`,
          annotations: [
            { lines: 2, text: 'Must match the type your `GetPrimaryAssetId()` returns. A mismatch is the most common reason the Asset Manager "finds nothing".' },
            { lines: 3, text: 'The C++ class path: `/Script/<ModuleName>.<ClassNameWithoutPrefix>`.' },
            { lines: 5, text: 'Scanned recursively. Assets outside these folders are invisible to the Asset Manager.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Wrapped for readability',
          text: 'The editor writes each `+PrimaryAssetTypesToScan=` entry on a **single line** and may add more fields (such as cook rules). Let Project Settings write it for you; the snippet shows what the fields mean.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have primary assets at all?',
          text: 'The Asset Manager turns "a pile of files" into a queryable catalogue. It can enumerate every weapon without loading any, load and unload them on demand, and decide what gets cooked into a build and which download chunk it lives in. Large games rely on this to control memory: the main menu does not need every character model loaded just because a character-select screen *could* show it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'With the `GetPrimaryAssetId()` override shown above, what is the primary asset ID of the asset `/Game/Data/Weapons/DA_Shotgun`?',
      options: [
        { text: '`WeaponData:DA_Shotgun`', why: 'That would be the default `UPrimaryDataAsset` behaviour (class name as type). The override replaces it with the fixed type `Weapon`.' },
        { text: '`/Game/Data/Weapons/DA_Shotgun`', why: 'That is the package path. A primary asset ID is deliberately shorter and path-independent: type plus name.' },
        { text: '`Weapon:DA_Shotgun`', correct: true, why: 'The override returns type `Weapon` and the object\'s name, `DA_Shotgun`.' },
        { text: '`UWeaponData:DA_Shotgun`', why: 'Reflection names drop the `U` prefix, and in any case the override supplies its own type string.' },
      ],
      explanation:
        'An `FPrimaryAssetId` is printed as `Type:Name`. Because it does not include the folder, you can reorganise content without breaking saved IDs (for example in save games or server data) — as long as asset names stay unique within a type.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Loading primary assets by ID',
      blocks: [
        {
          type: 'p',
          text: 'With weapons registered, the shop can discover and load them without holding a single hard reference. Loading is [[async-loading|asynchronous]]: you ask, and the Asset Manager calls you back when the assets are in memory.',
        },
        {
          type: 'code',
          title: 'ArmoryShop.cpp',
          code: `#include "ArmoryShop.h"
#include "WeaponData.h"
#include "Engine/AssetManager.h"

void AArmoryShop::BeginPlay()
{
    Super::BeginPlay();

    UAssetManager& Manager = UAssetManager::Get();
    Manager.GetPrimaryAssetIdList(
        FPrimaryAssetType(TEXT("Weapon")), WeaponIds);

    Manager.LoadPrimaryAssets(WeaponIds, TArray<FName>(),
        FStreamableDelegate::CreateUObject(
            this, &AArmoryShop::OnWeaponsLoaded));
}

void AArmoryShop::OnWeaponsLoaded()
{
    UAssetManager& Manager = UAssetManager::Get();
    for (const FPrimaryAssetId& Id : WeaponIds)
    {
        const UWeaponData* Data =
            Manager.GetPrimaryAssetObject<UWeaponData>(Id);
        if (Data)
        {
            UE_LOG(LogTemp, Log, TEXT("Shop stocks %s"),
                *Data->DisplayName.ToString());
        }
    }
}`,
          annotations: [
            { lines: 3, text: '`UAssetManager` lives in `Engine/AssetManager.h`. `UAssetManager::Get()` returns the project\'s single instance.' },
            { lines: '10-11', text: 'Fills `WeaponIds` (a `TArray<FPrimaryAssetId>` member) with every scanned `Weapon` asset. This reads the asset registry only — nothing is loaded yet.' },
            { lines: '13-15', text: 'Starts an async load of all of them. The empty `TArray<FName>` means "no extra asset bundles". The delegate fires on the game thread once everything is loaded.' },
            { lines: '23-24', text: 'Looks up the loaded object by ID. It returns `nullptr` if the asset is not loaded, so the check is not optional.' },
          ],
        },
        {
          type: 'p',
          text: 'Assets loaded through the Asset Manager stay loaded until you release them with `UnloadPrimaryAsset(Id)` or `UnloadPrimaryAssets(Ids)`. That explicit control is the point: the shop can load all weapons while open and release them when the player leaves.',
        },
        {
          type: 'deepdive',
          title: 'Asset bundles: load the icon now, the mesh later',
          blocks: [
            {
              type: 'p',
              text: 'A primary data asset can tag its soft references with **bundle** names using metadata. Loading the primary asset then loads only the bundles you ask for:',
            },
            {
              type: 'code',
              title: 'WeaponData.h (excerpt)',
              code: `UPROPERTY(EditDefaultsOnly, Category = "UI",
    meta = (AssetBundles = "UI"))
TSoftObjectPtr<UTexture2D> Icon;

UPROPERTY(EditDefaultsOnly, Category = "Visuals",
    meta = (AssetBundles = "Game"))
TSoftObjectPtr<UStaticMesh> WorldMesh;`,
              annotations: [
                { lines: '2-3', text: 'Belongs to the `UI` bundle. Pass `{ FName("UI") }` as the bundles argument of `LoadPrimaryAssets` and only the icons load — perfect for a shop screen.' },
                { lines: '6-7', text: 'The heavy mesh loads only when gameplay asks for the `Game` bundle.' },
              ],
            },
            {
              type: 'p',
              text: 'Bundle data is gathered when the asset is saved, so this only works on `UPrimaryDataAsset` subclasses (which implement that gathering) and only for soft references.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Where you will meet this again',
          text: 'Epic\'s Lyra sample builds its whole game-mode setup on primary data assets: "experiences", pawn data and input configs are all `UPrimaryDataAsset` subclasses loaded through the Asset Manager. The [[gameplay-ability-system]] and Game Features plugins lean on the same machinery.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      multi: true,
      prompt: 'You are designing `UEnemyData`. Select **all** fields that belong in the data asset (as opposed to on the enemy actor).',
      options: [
        { text: '`MaxHealth`', correct: true, why: 'A tuning value shared by every enemy of this type — exactly what a definition is for.' },
        { text: '`CurrentHealth`', why: 'Changes constantly and differs per enemy. Shared in an asset, one hit would damage every enemy of that type.' },
        { text: '`TSoftObjectPtr<USkeletalMesh> Mesh`', correct: true, why: 'Which mesh this enemy type uses is part of its definition; a soft reference avoids loading it until needed.' },
        { text: '`TObjectPtr<AActor> CurrentTarget`', why: 'Per-instance runtime state. An asset cannot sensibly point at an actor in one specific level — and every enemy would chase the same target.' },
        { text: '`float AggroRadius`', correct: true, why: 'Another per-type tuning number that designers will want to tweak without recompiling.' },
      ],
      explanation:
        'A good rule: if the value is the same for every instance of this *kind* of thing and only changes when someone rebalances the game, it belongs in the data asset. If it changes during play or differs between two enemies of the same kind, it belongs on the actor (often initialised *from* the data asset in `BeginPlay`).',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'Your game has 12 armour sets. Each set has the same fields (name, armour value, weight, icon), a designer rebalances them daily, and the inventory screen must list all 12 — even sets the player has never seen. What fits best?',
      options: [
        { text: 'Hard-code each set in a C++ `switch` statement', why: 'Every daily rebalance would need a programmer and a compile — the exact bottleneck data-driven design removes.' },
        { text: 'One data-only Blueprint subclass of the armour actor per set', why: 'Workable, but sets do not need inheritance, and listing "all 12" means scanning for classes. You get class overhead without using what classes add.' },
        { text: 'A `UPrimaryDataAsset` subclass, one asset per set, scanned by the Asset Manager', correct: true, why: 'Designers edit values without compiling, and the Asset Manager can list and load every set by ID without hard-referencing them all.' },
        { text: 'A `UDataAsset` subclass, with the inventory screen holding hard references to all 12 assets', why: 'Editing works, but the hard references keep every set (and its icon) loaded whenever the inventory class is loaded. Primary assets give you discovery without that cost.' },
      ],
      explanation:
        'Three requirements decide it: designer iteration (→ data, not code), no need for inheritance (→ instances, not classes), and discovery of *all* items without loading them up front (→ primary assets and the Asset Manager). When items are numerous and perfectly uniform, the next lesson\'s Data Tables are also a strong contender.',
    },
  ],
  takeaways: [
    'Data-driven design keeps behaviour in C++ and values in assets, so designers iterate without recompiling.',
    'A data asset class derives from `UDataAsset` and exposes `UPROPERTY` fields; each `DA_` asset is one saved instance of it.',
    'Actors reference a data asset through a pointer — ideally `TObjectPtr<const UWeaponData>` — and keep per-instance runtime state on themselves.',
    'Every user of a data asset shares one loaded object: rebalances apply everywhere, and runtime writes corrupt everyone.',
    'Hard references inside a data asset load with it; use soft references for heavy, rarely needed content.',
    'Data assets are instances (no value inheritance); data-only Blueprints are classes (inheritance, more overhead).',
    '`UPrimaryDataAsset` + `GetPrimaryAssetId()` + Asset Manager scan settings let you enumerate, load and unload definitions by `Type:Name` ID.',
  ],
  reading: [
    {
      title: 'Data Assets',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/data-assets-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s overview of creating and using data assets in the editor.',
    },
    {
      title: 'Asset Management',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-management-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Primary vs secondary assets, Asset Manager settings, bundles and cooking rules in depth.',
    },
    {
      title: 'Lyra Sample Game',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/lyra-sample-game-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Look at how Lyra\'s experience and pawn data assets drive an entire game from data.',
    },
  ],
};
