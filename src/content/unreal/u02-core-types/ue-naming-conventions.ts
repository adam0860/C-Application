import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-naming-conventions',
  title: 'Naming Conventions and Prefixes',
  summary:
    'The A, U, F, E, I, T and S prefixes, the `b` for booleans, why UnrealHeaderTool enforces prefixes, how files are named, and how to choose names that read well in code and in the editor.',
  minutes: 14,
  objectives: [
    'Choose the correct prefix (A, U, F, E, I, T, S) for any type you create',
    'Explain what a prefix tells you about how an object is created, stored and destroyed',
    'Explain why UnrealHeaderTool rejects reflected types with the wrong prefix',
    'Name files, variables, booleans and functions according to Epic\'s coding standard',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'One letter that tells you a lot',
      blocks: [
        {
          type: 'p',
          text: 'The first thing C++ programmers notice in Unreal code is the names: `AActor`, `UObject`, `FVector`, `TArray`. They look odd at first, but every Unreal type starts with a **prefix letter** that tells you what *kind* of type it is — and therefore how you create it, store it and get rid of it. Read this class and its annotations:',
        },
        {
          type: 'code',
          title: 'EnemyCharacter.h (excerpt)',
          code: `UCLASS()
class MYGAME_API AEnemyCharacter : public ACharacter {
    GENERATED_BODY()

protected:
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UHealthComponent> Health;

    UPROPERTY(EditAnywhere)
    EEnemyRank Rank = EEnemyRank::Grunt;

    UPROPERTY(EditAnywhere)
    TArray<FVector> PatrolPoints;

    UPROPERTY(EditAnywhere)
    bool bIsAlerted = false;
};`,
          annotations: [
            { lines: 2, text: '**A** — derives from `AActor` (here via `ACharacter`). It lives in a level, is spawned into the world and removed with `Destroy()`.' },
            { lines: 7, text: '**T** — a template (`TObjectPtr`, Unreal\'s pointer wrapper for object properties). **U** — derives from `UObject` but not `AActor`: a component in this case.' },
            { lines: 10, text: '**E** — an enumeration.' },
            { lines: 13, text: '**T** again (`TArray`, Unreal\'s dynamic array) holding **F** types: `FVector` is a plain struct, copied by value.' },
            { lines: 16, text: '**b** — not a type prefix but a variable prefix: every boolean starts with a lowercase `b`.' },
          ],
        },
        {
          type: 'table',
          headers: ['Prefix', 'Meaning', 'Examples'],
          rows: [
            ['`A`', 'Derives from `AActor`', '`APawn`, `ACharacter`, `APlayerController`'],
            ['`U`', 'Derives from `UObject`, but not from `AActor`', '`UActorComponent`, `UGameInstance`, `UUserWidget`'],
            ['`F`', 'Struct, or any class not derived from `UObject`', '`FVector`, `FString`, `FHitResult`'],
            ['`E`', 'Enum', '`EMovementMode`, `ECollisionChannel`'],
            ['`I`', 'Interface class', '`IInteractable`'],
            ['`T`', 'Template', '`TArray`, `TMap`, `TSubclassOf`'],
            ['`S`', 'Slate widget (Unreal\'s low-level UI framework)', '`SButton`, `SCompoundWidget`'],
          ],
          caption: 'The prefixes defined by Epic\'s coding standard',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Two more you will see',
          text: 'Global variables start with `G` (`GEngine`, `GWorld`), and type aliases take the prefix of what they alias: `using FEnemyList = TArray<FEnemyInfo>;` gets `F` because the result is a plain value type.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'A and U: the UObject family',
      blocks: [
        {
          type: 'p',
          text: 'Everything prefixed `A` or `U` belongs to the [[uobject]] system: the engine creates it, tracks it with reflection, and frees it with the garbage collector. The split between the two letters follows the class hierarchy. If `AActor` appears anywhere in a class\'s ancestry, it gets `A`; every other `UObject` subclass gets `U`.',
        },
        {
          type: 'table',
          headers: ['Aspect', '`A` types (actors)', '`U` types (other UObjects)'],
          rows: [
            ['What they are', 'Things that exist in a level', 'Components, data, managers, widgets'],
            ['Created with', '`SpawnActor` (or placed in the editor)', '`NewObject` or `CreateDefaultSubobject`'],
            ['Destroyed with', '`Destroy()`, then garbage collected', 'Garbage collected when unreferenced'],
            ['Handled by', 'Pointer', 'Pointer'],
          ],
        },
        {
          type: 'p',
          text: 'Contrast that with `F` types, which are ordinary C++ values: you put an `FVector` on the stack, copy it, return it by value, and it is destroyed by its destructor like any struct from the C++ course.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why put this in the name?',
          text: 'The engine has tens of thousands of types, and the rules for creating and owning them differ sharply. You must never `new` a `UObject` or create an actor with `NewObject`, and you should never store an `FVector` by pointer "to be safe". The prefix shows the correct rules at every use site — in a header, a code review or a crash log — without looking up the class hierarchy.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'The wizard knows',
          text: 'When you create a class with *Tools → New C++ Class*, you type the name **without** a prefix (`HealthComponent`) and the wizard picks the letter from the parent class you chose: `UHealthComponent` for a component, `AMyActor` for an actor.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'You create a class that derives from `UActorComponent` to track an inventory. What should it be called?',
      options: [
        {
          text: '`AInventoryComponent`',
          why: '`A` is reserved for classes with `AActor` in their ancestry. A component is a `UObject`, not an actor.',
        },
        {
          text: '`FInventoryComponent`',
          why: '`F` marks structs and classes outside the `UObject` system. A component is created and garbage collected by the engine.',
        },
        {
          text: '`UInventoryComponent`',
          correct: true,
          why: '`UActorComponent` derives from `UObject` but not from `AActor`, so its subclasses use `U`.',
        },
        {
          text: '`InventoryComponent`',
          why: 'That is the name you type into the wizard. The C++ class needs its prefix, and UnrealHeaderTool rejects a reflected class without one.',
        },
      ],
      explanation:
        'The rule is purely about ancestry: `AActor` somewhere above you means `A`; any other `UObject` subclass means `U`. Components are attached *to* actors, but they are not actors themselves — a classic source of confusion.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'F, E, I, T and S: everything else',
      blocks: [
        {
          type: 'p',
          text: 'Outside the `UObject` family, prefixes describe the shape of the type. Here is a typical pair you will write constantly: an enum and a struct, both reflected so designers can use them in the editor.',
        },
        {
          type: 'code',
          title: 'LootTypes.h (excerpt)',
          code: `UENUM(BlueprintType)
enum class EItemRarity : uint8 {
    Common,
    Rare,
    Legendary
};

USTRUCT(BlueprintType)
struct FLootDrop {
    GENERATED_BODY()

    UPROPERTY(EditAnywhere)
    FName ItemId;

    UPROPERTY(EditAnywhere)
    EItemRarity Rarity = EItemRarity::Common;

    UPROPERTY(EditAnywhere)
    int32 Quantity = 1;
};`,
          annotations: [
            { lines: '1-2', text: '[[uenum]] reflects the enum so Blueprints can use it. Enums get `E`. The `uint8` underlying type is required for Blueprint enums — the numeric-types lesson explains why.' },
            { lines: '8-9', text: '[[ustruct]] reflects the struct. Structs get `F`, reflected or not.' },
            { lines: 10, text: 'Reflected structs need `GENERATED_BODY()` just like classes.' },
            { lines: '12-19', text: 'Members use the same prefixes: `FName` is a struct, `EItemRarity` an enum, `int32` a fixed-size integer.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**`F`** — any struct, and any class outside the `UObject` system: math types (`FVector`, `FRotator`), strings (`FString`, `FName`, `FText`), results (`FHitResult`), handles (`FTimerHandle`), even module classes such as `FDefaultGameModuleImpl`.',
            '**`E`** — enums: `EItemRarity`, `ECollisionChannel`. Prefer `enum class` (from the C++ course) for new enums.',
            '**`I`** — interfaces. A reflected [[uinterface|interface]] is declared as a *pair*: `UInteractable` (the reflection side, a `UObject` class) and `IInteractable` (the class you actually inherit and implement). Interfaces get their own lesson.',
            '**`T`** — templates: containers (`TArray`, `TMap`, `TSet`), smart pointers (`TSharedPtr`, `TObjectPtr`), class references (`TSubclassOf`).',
            '**`S`** — Slate widgets, the C++ UI framework the editor itself is built with. Gameplay UI usually uses `U`-prefixed UMG widgets instead.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Reading unfamiliar engine code',
          text: 'Prefixes let you guess a lot from a signature alone. `void Fire(const FVector& Direction, AActor* Target, TSubclassOf<AProjectile> Projectile)` takes a value type by const reference, an actor by pointer, and a template parameterised on an actor class — you know how to call it before opening the header.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'fill',
      prompt: 'Add the correct prefix to each type name.',
      template: `class ___Projectile : public AActor { /* ... */ };

class ___HealthComponent : public UActorComponent {
    /* ... */
};

struct ___DamageInfo { float Amount; };

enum class ___DamageKind : uint8 { Fire, Ice };`,
      blanks: [{ answers: ['A'] }, { answers: ['U'] }, { answers: ['F'] }, { answers: ['E'] }],
      wordBank: ['A', 'U', 'F', 'E', 'T', 'I', 'S', 'C'],
      explanation:
        'Actor subclasses get `A`, other `UObject` subclasses get `U`, structs get `F` and enums get `E`. `T` would mean a template, `I` an interface and `S` a Slate widget. `C` (as in `CProjectile`) is a convention from other code bases such as MFC — Unreal doesn\'t use it.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Why UnrealHeaderTool enforces prefixes',
      blocks: [
        {
          type: 'p',
          text: 'For most types the prefix is a convention you follow out of courtesy. For **reflected** classes and structs it is a rule: UnrealHeaderTool works out the expected prefix — `A` if `AActor` is an ancestor, `U` for other `UObject` classes, `F` for `USTRUCT`s — and stops the build with an error if your name doesn\'t match.',
        },
        {
          type: 'p',
          text: 'The reason is that the reflection system stores names **without** the prefix. `AMyActor` is known to the engine as `MyActor`, and that unprefixed name is used everywhere outside C++:',
        },
        {
          type: 'table',
          headers: ['C++ name', 'Reflected name', 'Shown in the editor'],
          rows: [
            ['`AMyActor`', '`MyActor`', 'My Actor'],
            ['`UHealthComponent`', '`HealthComponent`', 'Health Component'],
            ['`FLootDrop`', '`LootDrop`', 'Loot Drop'],
            ['`bIsAlerted` (property)', '`bIsAlerted`', 'Is Alerted'],
          ],
        },
        {
          type: 'p',
          text: 'Class paths such as `/Script/MyGame.MyActor`, Blueprint parent classes, config files and asset references all use the reflected name, while generated C++ uses the full name. The engine must convert between them reliably in **both** directions, and UHT guarantees that by making the prefix predictable from the class hierarchy.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'What would break without enforcement?',
          text: 'Imagine `APickup` and `UPickup` in the same module. Both would be called `Pickup` in the reflection system — a collision that would make asset references and Blueprint parents ambiguous. Or imagine a class called `MyActor` with no prefix: tools that add the expected prefix back would produce `AMyActor`, a type that doesn\'t exist. A strict rule turns these subtle failures into an immediate, readable build error.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'What is and isn\'t checked',
          text: 'UHT checks `UCLASS` and `USTRUCT` names. The `E` on enums, `T` on templates and `b` on booleans are conventions from Epic\'s coding standard that no tool enforces — but every engine type follows them, and so should yours.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'bug',
      prompt: 'UnrealHeaderTool stops the build while processing this header. Tap the line it complains about.',
      code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TreasureChest.generated.h"

UCLASS()
class MYGAME_API UTreasureChest : public AActor {
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, Category = "Loot")
    int32 GoldAmount = 50;
};`,
      bugLines: [8],
      hint: 'Look at the parent class, then at the first letter of the class name.',
      explanation:
        'The class derives from `AActor`, so UHT expects the name `ATreasureChest` and reports an invalid prefix. It isn\'t pedantry: the reflected name is `TreasureChest`, and the engine reconstructs the C++ name from the hierarchy. Rename the class to `ATreasureChest` — and keep the file name `TreasureChest.h`, because file names drop the prefix (next card).',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'File names drop the prefix',
      blocks: [
        {
          type: 'p',
          text: 'Files are named after the type **without** its prefix, matching the reflected name. The generated header takes its name from the header file, not from the class:',
        },
        {
          type: 'table',
          headers: ['Type', 'Header', 'Source', 'Generated header'],
          rows: [
            ['`AMyActor`', '`MyActor.h`', '`MyActor.cpp`', '`MyActor.generated.h`'],
            ['`UHealthComponent`', '`HealthComponent.h`', '`HealthComponent.cpp`', '`HealthComponent.generated.h`'],
            ['`FLootDrop`, `EItemRarity`', '`LootTypes.h`', '(none needed)', '`LootTypes.generated.h`'],
          ],
        },
        {
          type: 'code',
          title: 'HealthComponent.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "HealthComponent.generated.h"

UCLASS(ClassGroup = (Custom),
       meta = (BlueprintSpawnableComponent))
class MYGAME_API UHealthComponent
    : public UActorComponent {
    GENERATED_BODY()
};`,
          annotations: [
            { lines: 4, text: 'Engine headers follow the same rule: `UActorComponent` lives in `ActorComponent.h`, inside a `Components/` folder.' },
            { lines: 5, text: 'Named after **this file** (`HealthComponent.h`), not the class. If you renamed the file, this include would have to change too.' },
            { lines: '7-8', text: 'What the wizard generates for components: `BlueprintSpawnableComponent` lets designers add it to actors in the Blueprint editor. Specifiers like these get their own lesson.' },
            { lines: '9-10', text: 'The class keeps its `U` prefix; only the file name drops it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'One major class per file',
          text: 'Give each `UCLASS` its own header/source pair named after it. Small related enums and structs can share a header such as `LootTypes.h`. Following the pattern means anyone can find `AEnemyCharacter` by opening `EnemyCharacter.h` — no search required.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'truefalse',
      prompt: 'The header that declares `AMyActor` should be named `AMyActor.h`.',
      answer: false,
      explanation:
        'File names drop the type prefix: `AMyActor` lives in `MyActor.h` and `MyActor.cpp`, and its generated header is `MyActor.generated.h`. This mirrors the reflected name (`MyActor`), which is also what the Content Browser and Blueprint editor display.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'PascalCase, b for booleans, and good names',
      blocks: [
        {
          type: 'p',
          text: 'Beyond prefixes, Epic\'s coding standard uses **PascalCase** for nearly everything: types, functions, member variables, parameters and even local variables. Each word starts with a capital letter, with no underscores between words and no `m_` member prefixes. Macros are the exception: `ALL_CAPS`, usually starting with `UE_`.',
        },
        {
          type: 'compare',
          left: {
            title: 'Other C++ styles',
            tone: 'bad',
            code: `class enemy_spawner {
    int m_maxEnemies;
    float dmg;
    bool alive;
    void spawn_wave(int n);
};`,
            text: 'Fine in some code bases, but alien in Unreal: lower-case and snake_case names, `m_` prefixes, cryptic abbreviations.',
          },
          right: {
            title: 'Unreal style',
            tone: 'good',
            code: `class AEnemySpawner : public AActor {
    int32 MaxEnemies;
    float DamagePerSecond;
    bool bIsAlive;
    void SpawnWave(int32 NumEnemies);
};`,
            text: 'Prefixed type, PascalCase everywhere, `b` on the boolean, descriptive names.',
          },
        },
        {
          type: 'list',
          items: [
            '**Booleans start with `b`:** `bIsDead`, `bHasKey`, `bCanEverTick`. The editor strips the `b` when it builds display names, so `bHasKey` shows up as "Has Key".',
            '**Functions that return `bool` ask a question:** `IsAlive()`, `CanJump()`, `HasAuthority()`.',
            '**Functions are verbs, variables are nouns:** `ApplyDamage()`, `SpawnWave()`; `Health`, `PatrolPoints`.',
            '**Output parameters start with `Out`:** `bool GetAimPoint(FVector& OutLocation) const;` tells the caller the reference will be written to.',
            '**Counts start with `Num`:** `NumEnemiesAlive` — matching `TArray::Num()`.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why names matter more in Unreal',
          text: 'Every `UPROPERTY` and `UFUNCTION` name is also **user interface**: designers see it in the Details panel and in Blueprint node titles. `fDmgMult` becomes a property called "F Dmg Mult"; `DamageMultiplier` becomes "Damage Multiplier". Good names make your C++ self-documenting for programmers *and* designers.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Habits worth keeping',
          text: 'Spell words out (`Health`, not `Hp`); put units in names when they are ambiguous (`RespawnDelaySeconds`); avoid negated booleans (`bIsHidden`, not `bIsNotVisible`, so you never write `!bIsNotVisible`).',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: 'Which member declaration best follows Unreal\'s naming conventions for a flag that says whether a door is locked?',
      codeOptions: true,
      options: [
        { text: 'bool Locked = true;', why: 'Missing the `b` prefix. Readers (and the editor\'s display-name logic) expect booleans to start with `b`.' },
        { text: 'bool bIsLocked = true;', correct: true, why: 'PascalCase with the `b` prefix, phrased as a yes/no state. The editor displays it as "Is Locked".' },
        { text: 'bool m_bLocked = true;', why: '`m_` member prefixes are not used in Unreal. The `b` is enough.' },
        { text: 'bool b_is_locked = true;', why: 'snake_case isn\'t Unreal style. Names are PascalCase after the `b`.' },
      ],
      explanation:
        'Booleans get a lowercase `b` followed by a PascalCase name, ideally phrased as a state or question (`bIsLocked`, `bHasKey`, `bCanOpen`). The convention makes conditions read naturally (`if (bIsLocked)`) and lets the editor present clean names to designers.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Select **all** declarations that follow Unreal naming conventions.',
      codeOptions: true,
      options: [
        {
          text: 'void ApplyDamage(float Amount);',
          correct: true,
          why: 'A verb phrase in PascalCase with a descriptive parameter name.',
        },
        {
          text: 'struct DamageEvent { float Amount; };',
          why: 'Structs need the `F` prefix: `FDamageEvent`.',
        },
        {
          text: 'bool GetAimPoint(FVector& OutLocation) const;',
          correct: true,
          why: 'The `Out` prefix tells callers this reference parameter receives a result; the `bool` reports success.',
        },
        {
          text: 'int32 NumEnemiesAlive = 0;',
          correct: true,
          why: 'PascalCase, descriptive, and uses the `Num` convention for counts.',
        },
        {
          text: 'class ULootChest : public AActor {};',
          why: 'It derives from `AActor`, so it must be `ALootChest`. If reflected, UHT would reject this.',
        },
      ],
      explanation:
        'Prefixes describe what a type is (`F` struct, `A` actor), PascalCase applies to functions and variables, and small conventions such as `Out` and `Num` make intent obvious at the call site. Consistency matters more than any individual rule: Unreal code bases are huge, and uniform names let you navigate code you have never seen.',
    },
  ],
  takeaways: [
    '`A` = derives from `AActor`; `U` = other `UObject` subclasses; `F` = structs and non-`UObject` classes; `E` = enums; `I` = interfaces; `T` = templates; `S` = Slate widgets.',
    'The prefix tells you how a type is created and owned: `A`/`U` objects are engine-managed and used through pointers; `F` types are ordinary values.',
    'UnrealHeaderTool enforces prefixes on reflected classes and structs because the reflection system stores names without them and must map between the two forms reliably.',
    'File names drop the prefix: `AMyActor` lives in `MyActor.h`/`MyActor.cpp` with `MyActor.generated.h`.',
    'Use PascalCase for types, functions and variables; start booleans with `b`; use `Out` for output parameters and `Num` for counts.',
    'Property and function names become editor UI, so descriptive, unabbreviated names pay off for designers too.',
  ],
  reading: [
    {
      title: 'Epic C++ Coding Standard — Naming Conventions',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine',
      source: 'unreal-docs',
      note: 'The authoritative list of prefixes and naming rules; the naming section is short and worth reading in full.',
    },
    {
      title: 'Gameplay Framework in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine',
      source: 'unreal-docs',
      note: 'A tour of the engine\'s core `A` and `U` classes — good practice for reading prefixes.',
    },
    {
      title: 'C++ Core Guidelines — Naming and layout',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-naming',
      source: 'core-guidelines',
      note: 'How the wider C++ community thinks about naming, for comparison with Unreal\'s stricter house style.',
    },
  ],
};
