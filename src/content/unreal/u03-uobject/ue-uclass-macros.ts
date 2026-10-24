import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-uclass-macros',
  title: 'UCLASS, USTRUCT and UENUM',
  summary: 'The three kinds of reflected types, the specifiers that matter most, and how to choose between a struct and a UObject.',
  minutes: 17,
  objectives: [
    'Use the `UCLASS` specifiers `Blueprintable`, `BlueprintType`, `Abstract` and `Config`, and know which are inherited',
    'Explain why Unreal classes use `PURE_VIRTUAL` instead of C++ pure virtual functions',
    'Declare a `USTRUCT(BlueprintType)` with `GENERATED_BODY()` and explain its value semantics',
    'Declare a Blueprint-friendly `UENUM` as `enum class E… : uint8` with `UMETA(DisplayName)`, and explain why it must be `uint8`',
    'Explain why `USTRUCT`s cannot have `UFUNCTION`s, and expose struct logic through a function library instead',
    'Decide whether a piece of data should be a `USTRUCT` or a `UObject`',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Three kinds of reflected types',
      blocks: [
        {
          type: 'p',
          text: 'Reflection is opt-in, type by type. Unreal gives you three macros for declaring a reflected type, and each one produces a different kind of thing with different rules:',
        },
        {
          type: 'table',
          headers: ['Macro', 'Declares', 'Prefix', 'Semantics', 'Described at run time by'],
          rows: [
            ['[[uclass]]', 'A class deriving from `UObject` (or `AActor`, a component…)', '`U` or `A`', '**Reference type**: lives on the heap, accessed through pointers, garbage-collected, has an identity', '`UClass`'],
            ['[[ustruct]]', 'A plain struct, optionally deriving from another `USTRUCT`', '`F`', '**Value type**: copied on assignment, lives inside whatever contains it', '`UScriptStruct`'],
            ['[[uenum]]', 'An enumeration', '`E`', 'A set of named integer constants', '`UEnum`'],
          ],
        },
        {
          type: 'p',
          text: 'All three use the same machinery from the previous lesson: UnrealHeaderTool reads the macro, generates code, and the engine builds a description object at startup. What differs is **what kind of object** you get — and that decides how you may use it.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why struct versus class matters far more here than in standard C++',
          text: 'In standard C++, `struct` and `class` differ only in default access (`public` vs `private`). In Unreal, `USTRUCT` versus `UCLASS` is a fundamental split: a `UCLASS` gets an object header, a slot in the engine\'s global object table, garbage-collected lifetime and Blueprint subclassing; a `USTRUCT` gets none of that and is just its members, copied around like an `int`. The keyword you type (`struct` or `class`) is secondary — the macro decides.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'You already use USTRUCTs constantly',
          text: '`FVector`, `FRotator`, `FTransform`, `FHitResult` and `FLinearColor` are all reflected structs. The engine\'s most-used types are value types for the same reasons yours should often be: they are small, copied freely, and stored by the thousand in arrays.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'UCLASS specifiers you will use every week',
      blocks: [
        {
          type: 'p',
          text: 'The arguments inside `UCLASS(...)` are [[specifier|specifiers]]: instructions to UHT that become flags and metadata on the `UClass`. Dozens exist; these four cover most real code.',
        },
        {
          type: 'code',
          title: 'Quest.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "Quest.generated.h"

UCLASS(Blueprintable, BlueprintType)
class MYGAME_API UQuest : public UObject {
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest")
    FText Title;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest")
    int32 RewardGold = 100;
};`,
          annotations: [
            { lines: 7, text: '[[blueprintable-specifier|Blueprintable]]: designers may create **Blueprint subclasses** of `UQuest` (one Blueprint per quest, each with its own logic). [[blueprint-type-specifier|BlueprintType]]: Blueprints may declare **variables** of type `UQuest*`.' },
            { lines: 8, text: 'A plain `UObject` subclass: not an actor, never placed in a level — a good fit for data with behaviour, such as a quest.' },
            { lines: '12-13', text: '`FText` is the localizable text type from the strings lesson — right for anything a player reads.' },
          ],
        },
        {
          type: 'table',
          headers: ['Specifier', 'Effect', 'Inherited?'],
          rows: [
            ['`Blueprintable` / `NotBlueprintable`', 'Whether Blueprint classes may derive from this class', 'Yes'],
            ['`BlueprintType` / `NotBlueprintType`', 'Whether Blueprints may use it as a variable type', 'Yes'],
            ['`Abstract`', 'Cannot be instantiated or placed in a level; only subclasses can', '**No** — each class decides'],
            ['`Config = Game`', 'Properties marked `UPROPERTY(Config)` load from the named `.ini` file', 'Yes, cannot be undone'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Why actor classes rarely need these specifiers',
          text: '`AActor` itself is declared `Blueprintable, BlueprintType`, and those two are inherited, so a bare `UCLASS()` on your actor subclass already allows Blueprint children and variables. A direct `UObject` subclass starts with neither — the editor will not offer it as a Blueprint parent until you add `Blueprintable`. This is the most common "why can\'t I find my class in the editor?" question.',
        },
        {
          type: 'heading',
          text: 'Config classes: tuning without recompiling',
        },
        {
          type: 'code',
          title: 'SpawnSettings.h',
          code: `UCLASS(Config = Game)
class MYGAME_API USpawnSettings : public UObject {
    GENERATED_BODY()

public:
    UPROPERTY(Config)
    int32 MaxEnemies = 20;

    UPROPERTY(Config)
    float RespawnDelay = 5.0f;
};`,
          annotations: [
            { lines: 1, text: '`Config = Game` means "read my `Config` properties from the Game config files" (`DefaultGame.ini`, layered with platform and user overrides).' },
            { lines: '6-7', text: 'The C++ initializer is the fallback used when the `.ini` has no value.' },
          ],
        },
        {
          type: 'code',
          lang: 'ini',
          title: 'Config/DefaultGame.ini',
          code: `[/Script/MyGame.SpawnSettings]
MaxEnemies=40
RespawnDelay=3.5`,
          annotations: [
            { lines: 1, text: 'The section is the class\'s path: `/Script/` + module name + `.` + class name **without** its `U` prefix.' },
          ],
        },
        {
          type: 'p',
          text: 'When the class is initialized, the engine loads these values into its default object, so every `USpawnSettings` created afterwards starts with `MaxEnemies == 40`. A designer can rebalance the game by editing a text file — no C++ rebuild.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'You wrote `UCLASS() class UDialogueLine : public UObject`. Designers want to make Blueprint **subclasses** of it, one per character voice. What must you add?',
      options: [
        {
          text: '`Blueprintable`',
          correct: true,
          why: 'Right. `Blueprintable` allows the class to be a Blueprint parent. Direct `UObject` subclasses do not have it by default.',
        },
        {
          text: '`BlueprintType`',
          why: '`BlueprintType` lets Blueprints declare *variables* of the type. It does not allow subclassing — the two are independent.',
        },
        {
          text: 'Nothing — every `UCLASS` can be subclassed in Blueprints',
          why: 'That is true for actors only because `AActor` is declared `Blueprintable` and the specifier is inherited. `UObject` subclasses are not Blueprintable unless you say so.',
        },
        {
          text: '`Abstract`',
          why: '`Abstract` prevents instances of this exact class. It neither grants nor removes Blueprint subclassing.',
        },
      ],
      explanation:
        '`Blueprintable` (subclassing) and `BlueprintType` (variables) answer different questions, and both are inherited from the parent class. That is why actor subclasses "just work" while plain `UObject` subclasses need the specifiers spelled out.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Abstract classes and PURE_VIRTUAL',
      blocks: [
        {
          type: 'p',
          text: '`UCLASS(Abstract)` declares a base class that only exists to be derived from — say, `AWeapon`, with concrete `ARifle` and `ARocketLauncher` children. The editor will not let anyone place an `AWeapon` in a level or pick it in a class field, and `NewObject` refuses to create one.',
        },
        {
          type: 'p',
          text: 'In standard C++ you would make such a class abstract with a [[pure-virtual-function]] (`= 0`). In Unreal you **cannot**:',
        },
        {
          type: 'code',
          title: 'Weapon.h',
          code: `UCLASS(Abstract)
class MYGAME_API AWeapon : public AActor {
    GENERATED_BODY()

public:
    // virtual void Fire() = 0;   // does not compile in a UCLASS
    virtual void Fire() PURE_VIRTUAL(AWeapon::Fire, );

    virtual int32 GetMagazineSize() const
        PURE_VIRTUAL(AWeapon::GetMagazineSize, return 0;);
};`,
          annotations: [
            { lines: 1, text: '`Abstract` is **not inherited**: `ARifle : public AWeapon` with a plain `UCLASS()` is concrete and placeable.' },
            { lines: 6, text: 'A real pure virtual function makes the C++ class abstract, so the engine\'s generated code cannot construct it — and the engine needs to construct one of *every* class (next card).' },
            { lines: 7, text: '[[pure-virtual-macro|PURE_VIRTUAL]] supplies a body that triggers a fatal error naming the function if it is ever called. The second argument is extra code for the body — empty for `void`.' },
            { lines: '9-10', text: 'For a non-`void` function, the second argument must return something so the body compiles.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the engine must construct even abstract classes',
          text: 'For every `UClass`, Unreal creates one hidden instance called the [[cdo|Class Default Object]] by running your constructor. It holds the class\'s default property values, which the editor displays and new instances are initialized from. If the C++ class were abstract, that construction would not compile. So Unreal splits the two meanings of "abstract": `UCLASS(Abstract)` stops *users* from creating instances, and `PURE_VIRTUAL` marks functions children must override.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'PURE_VIRTUAL is checked at run time, not compile time',
          text: 'With `= 0`, forgetting to override in a child is a compile error. With `PURE_VIRTUAL`, the child compiles fine and the game crashes with "Pure virtual not implemented" the first time the missing function is called. Test every concrete subclass, and consider an `ensure` or a sensible default body instead when a crash would be too harsh.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'bug',
      prompt: 'This header is for an abstract interactable base class. The project fails to compile. Tap the line that causes it.',
      code: `UCLASS(Abstract, Blueprintable)
class MYGAME_API AInteractable : public AActor {
    GENERATED_BODY()

public:
    AInteractable();

    virtual void Interact(AActor* User) = 0;

    UPROPERTY(EditAnywhere, Category = "Interaction")
    FText Prompt;
};`,
      bugLines: [8],
      hint: 'Something has to be able to construct one of every class — even abstract ones.',
      explanation:
        'Line 8 declares a C++ pure virtual function, which makes `AInteractable` an abstract C++ class. The generated code must be able to construct it (for the Class Default Object), so the build fails with a "cannot instantiate abstract class" error. Replace `= 0` with `PURE_VIRTUAL(AInteractable::Interact, );`. `UCLASS(Abstract)` on line 1 is correct and already stops designers from placing the base class in a level.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'USTRUCT: reflected value types',
      blocks: [
        {
          type: 'p',
          text: 'A [[ustruct]] is a C++ struct that UHT also describes, so its `UPROPERTY` members can be edited, saved, replicated and used in Blueprints. It needs `GENERATED_BODY()` just like a class, and its name must start with `F` (UHT enforces the prefix).',
        },
        {
          type: 'code',
          title: 'InventoryTypes.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "InventoryTypes.generated.h"

USTRUCT(BlueprintType)
struct FInventorySlot {
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Item")
    FName ItemId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Item")
    int32 Quantity = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Item")
    float WeightPerItem = 0.5f;

    float GetTotalWeight() const {
        return Quantity * WeightPerItem;
    }
};`,
          annotations: [
            { lines: 4, text: 'A header containing only a `USTRUCT` still gets its own `.generated.h`, still included last.' },
            { lines: 6, text: '`BlueprintType` makes the struct usable as a Blueprint variable, with automatic *Make* and *Break* nodes. Without it the struct still works in C++ and the Details panel.' },
            { lines: 7, text: 'No base class needed, and no `MYGAME_API` unless other modules use the struct.' },
            { lines: 8, text: 'Declares `StaticStruct()` (the struct\'s `UScriptStruct`) and the hooks the engine uses to copy and serialize it.' },
            { lines: '19-21', text: 'Ordinary C++ member functions are fine. They just are not visible to Blueprints.' },
          ],
        },
        {
          type: 'code',
          title: 'Using it inside a class',
          code: `UPROPERTY(EditAnywhere, Category = "Inventory")
TArray<FInventorySlot> Slots;

void UInventoryComponent::AddPotion() {
    FInventorySlot Slot;          // on the stack, no NewObject
    Slot.ItemId = TEXT("Potion");
    Slot.Quantity = 3;
    Slots.Add(Slot);              // copied into the array
}`,
          annotations: [
            { lines: '1-2', text: 'The structs live **inside** the array\'s buffer, owned by the object that owns the array.' },
            { lines: 5, text: 'A struct is created like any C++ value. No outer, no garbage collector, no registration.' },
            { lines: 8, text: '`Add` copies it (or use `Emplace` / `MoveTemp` to avoid the copy, as with `std::vector`).' },
          ],
        },
        {
          type: 'memory',
          caption: 'Structs sit side by side in one buffer; UObjects are separate heap objects reached through pointers.',
          regions: [
            {
              label: 'Heap — TArray<FInventorySlot> buffer',
              kind: 'heap',
              cells: [
                { name: '[0]', type: 'FInventorySlot', value: 'Potion ×3, 0.5 kg' },
                { name: '[1]', type: 'FInventorySlot', value: 'Arrow ×40, 0.1 kg' },
                { name: '[2]', type: 'FInventorySlot', value: 'Gem ×1, 0.2 kg' },
              ],
            },
            {
              label: 'Heap — TArray<TObjectPtr<UItem>> buffer',
              kind: 'heap',
              cells: [
                { name: '[0]', type: 'TObjectPtr<UItem>', value: 'potion object', pointsTo: 'a' },
                { name: '[1]', type: 'TObjectPtr<UItem>', value: 'arrow object', pointsTo: 'b' },
              ],
            },
            {
              label: 'Heap — individual UObjects (header + GC tracking each)',
              kind: 'heap',
              cells: [
                { id: 'a', name: 'Item_0', type: 'UItem', value: 'Potion ×3' },
                { id: 'b', name: 'Item_1', type: 'UItem', value: 'Arrow ×40' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why value semantics are a feature',
          text: 'A struct costs exactly its members: no object header, no entry in the global object table, nothing for the garbage collector to visit individually. Arrays of structs are [[contiguous-memory|contiguous]], which is fast to iterate ([[cache-locality]]). Copies are independent, so there is no aliasing surprise. The garbage collector still **looks inside** a struct for `UObject` pointers, as long as the struct is reached through a `UPROPERTY` chain — so a `TObjectPtr` member of a struct stored in a `UPROPERTY` array is tracked correctly.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: 'Each `FInventorySlot` stored in a `UPROPERTY() TArray<FInventorySlot>` is tracked and freed individually by the garbage collector.',
      answer: false,
      explanation:
        'Structs are values. Each slot is a chunk of the array\'s buffer, and it is destroyed when the array removes it or when the owning object is destroyed — ordinary C++ lifetime, like elements of a `std::vector`. The garbage collector only manages `UObject`s. What it *does* do is look inside reflected structs for `UObject` pointers, so references held by a struct still keep their targets alive.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Why USTRUCTs cannot have UFUNCTIONs',
      blocks: [
        {
          type: 'p',
          text: 'UHT does not allow a `UFUNCTION` inside a `USTRUCT`. So how do you give Blueprints `GetTotalWeight()`? First, the reason.',
        },
        {
          type: 'list',
          items: [
            '**Calls go through an object.** A Blueprint or network call to a `UFUNCTION` is dispatched through `UObject::ProcessEvent`, a virtual function that runs a `UFunction` found in the object\'s `UClass`, with `this` pointing at a `UObject`. A struct has no `UClass` and no `ProcessEvent`.',
            '**Structs have no identity.** Blueprint pins pass structs **by value**. A "method" called on a pin would run on a temporary copy, so `Slot.AddOne()` would silently change nothing — exactly the kind of trap reflection is meant to remove.',
            '**Functions belong to classes.** In the reflection data, `UFunction` objects are children of a `UClass`. `UScriptStruct` describes data layout only.',
          ],
        },
        {
          type: 'p',
          text: 'The idiomatic answer is a [[blueprint-function-library|**Blueprint function library**]]: a class of static `UFUNCTION`s. Blueprints show each one as a node that takes the struct as an input pin.',
        },
        {
          type: 'code',
          title: 'InventoryLibrary.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "InventoryTypes.h"
#include "InventoryLibrary.generated.h"

UCLASS()
class MYGAME_API UInventoryLibrary
    : public UBlueprintFunctionLibrary {
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintPure, Category = "Inventory")
    static float GetSlotWeight(const FInventorySlot& Slot) {
        return Slot.GetTotalWeight();
    }

    UFUNCTION(BlueprintCallable, Category = "Inventory")
    static void AddToSlot(UPARAM(ref) FInventorySlot& Slot,
                          int32 Amount) {
        Slot.Quantity += Amount;
    }
};`,
          annotations: [
            { lines: '9-10', text: '`UBlueprintFunctionLibrary` exists for exactly this: static helpers that Blueprints can call from any graph.' },
            { lines: '14-17', text: 'A [[blueprint-pure]] node (no execution pins) that wraps the struct\'s normal C++ function. The `const&` avoids a copy.' },
            { lines: '20-21', text: '`UPARAM(ref)` makes a non-const reference appear as an **input** pin that Blueprints pass by reference, so the caller\'s struct really changes.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Keep logic in the struct, expose it through the library',
          text: 'Write the real logic as normal C++ member functions on the struct (fast, testable, usable from other C++), and make the library functions one-line wrappers. C++ callers use `Slot.GetTotalWeight()`; Blueprint users get the same behaviour through the node.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'Designers need to call "get total weight" on an `FInventorySlot` from a Blueprint graph. What is the idiomatic way?',
      options: [
        {
          text: 'Add `UFUNCTION(BlueprintPure)` to `GetTotalWeight()` inside the struct',
          why: 'UHT rejects `UFUNCTION`s in a `USTRUCT`. Reflected functions must belong to a `UClass`, because calls are dispatched through a `UObject`.',
        },
        {
          text: 'Turn `FInventorySlot` into a `UObject` subclass so it can have `UFUNCTION`s',
          why: 'It would work, but you would trade cheap contiguous values for one garbage-collected heap object per slot — a heavy price just to expose one getter.',
        },
        {
          text: 'A static `UFUNCTION(BlueprintPure)` in a `UBlueprintFunctionLibrary` that takes the struct by `const&`',
          correct: true,
          why: 'Correct. The library function belongs to a `UClass`, so it can be reflected, and it simply forwards to the struct\'s C++ member function.',
        },
        {
          text: 'Mark the struct `USTRUCT(Blueprintable)`',
          why: '`Blueprintable` is a class specifier about subclassing. Blueprints cannot subclass structs, and no struct specifier enables functions.',
        },
      ],
      explanation:
        'Blueprint calls need a `UClass` to find the function and a `UObject` to call it on. A function library provides both (a static function needs no instance), while the struct keeps its value semantics. This pattern is all over the engine: `UKismetMathLibrary` exposes most of `FVector`\'s maths to Blueprints the same way.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'UENUM: enums Blueprints can use',
      blocks: [
        {
          type: 'p',
          text: 'You learned `enum class` in the C++ course: scoped, strongly typed, with an explicit underlying type. A reflected enum is exactly that, plus a macro:',
        },
        {
          type: 'code',
          title: 'WeaponTypes.h',
          code: `UENUM(BlueprintType)
enum class EWeaponType : uint8 {
    Pistol,
    AssaultRifle UMETA(DisplayName = "Assault Rifle"),
    Shotgun,
    RocketLauncher UMETA(DisplayName = "Rocket Launcher"),
    Count UMETA(Hidden)
};

// Elsewhere, in a class:
UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Weapon")
EWeaponType WeaponType = EWeaponType::Pistol;`,
          annotations: [
            { lines: 1, text: '`BlueprintType` makes the enum available as a Blueprint variable type, with dropdowns and *Switch on EWeaponType* nodes.' },
            { lines: 2, text: '`enum class` with an `E` prefix and `uint8` underlying type — the only underlying type UHT accepts for a `BlueprintType` enum.' },
            { lines: 4, text: '[[umeta]] attaches metadata to one enumerator. `DisplayName` is what the editor shows instead of the raw C++ name.' },
            { lines: 7, text: '`Hidden` keeps a helper value (a count or sentinel) out of editor dropdowns.' },
            { lines: '11-12', text: 'The enum works as an ordinary reflected property: editable, saved, usable from Blueprints.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why uint8?',
          text: 'Blueprint enums are stored and passed as **bytes** — the Blueprint virtual machine\'s enum pins, the user-defined enums designers create in the editor, and the property type that holds them all assume one byte. This dates back to UnrealScript, whose enums were bytes, and it has a practical upside: an enum in a struct or a replicated property costs one byte of memory and bandwidth. The limit is 256 values, which is plenty for an enum; if you need more, you probably want a data table or [[gameplay-tag|gameplay tags]].',
        },
        {
          type: 'p',
          text: 'Reflection gives enums a run-time description too. `StaticEnum<EWeaponType>()` returns the `UEnum`, and helpers turn values into text:',
        },
        {
          type: 'code',
          code: `FString Raw = UEnum::GetValueAsString(EWeaponType::Shotgun);
// "EWeaponType::Shotgun"
FText Shown = UEnum::GetDisplayValueAsText(
    EWeaponType::AssaultRifle);
// "Assault Rifle" (in the editor)`,
          annotations: [
            { lines: 1, text: 'Handy for logs: you get the enumerator name without writing a `switch`.' },
            { lines: '3-5', text: 'Uses the `DisplayName` metadata when it is available.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Metadata is editor-only',
          text: 'Everything inside `UMETA(...)` and `meta = (...)` is editor data and is stripped from cooked (shipped) builds. In a packaged game, `GetDisplayValueAsText` falls back to the raw enumerator name, so `AssaultRifle` appears with no space. For player-facing text, map enum values to localized `FText` yourself (a `switch` or a data table).',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'TEnumAsByte',
          text: 'Before `enum class` properties were supported, Unreal used unscoped enums wrapped in a namespace and stored them as `TEnumAsByte<EFoo::Type>` to force one byte. You will still meet it in engine APIs, e.g. `TEnumAsByte<ECollisionChannel>`. For your own enums, always write `enum class E… : uint8`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'fill',
      prompt: 'Declare a difficulty enum that Blueprints can use, showing "Nightmare" in the editor for the hardest setting.',
      template: `UENUM(___)
enum class EDifficulty : ___ {
    Easy,
    Normal,
    Hard UMETA(___ = "Nightmare")
};`,
      blanks: [{ answers: ['BlueprintType'] }, { answers: ['uint8'] }, { answers: ['DisplayName'] }],
      wordBank: ['BlueprintType', 'uint8', 'DisplayName', 'Blueprintable', 'int32', 'ToolTip', 'Category'],
      explanation:
        '`BlueprintType` exposes the enum as a Blueprint type, `uint8` is the only underlying type UHT accepts for such enums (Blueprints store enums as bytes), and `DisplayName` metadata changes the label the editor shows. `Blueprintable` is a class specifier about subclassing, and `int32` would be rejected by UHT for a `BlueprintType` enum.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Struct or UObject? Choosing well',
      blocks: [
        {
          type: 'p',
          text: 'Beginners often make everything a `UObject` "to be safe". That costs memory, garbage-collection time and clarity. Ask what the data *is*:',
        },
        {
          type: 'table',
          headers: ['Need', 'USTRUCT', 'UObject'],
          rows: [
            ['Copy it freely, compare it, use it as a map key', 'Yes — a value', 'No — copying is disabled'],
            ['Thousands of small instances in arrays', 'Ideal, contiguous', 'One heap object each'],
            ['Several owners share **the same** instance via pointers', 'Awkward', 'Yes — that is identity'],
            ['Lifetime managed by the garbage collector', 'No — owned by its container', 'Yes'],
            ['Blueprint subclasses with their own logic', 'No', 'Yes (`Blueprintable`)'],
            ['Blueprint-callable member functions', 'No (use a function library)', 'Yes'],
            ['Overhead per instance', 'Just its members', 'Object header (about 40 bytes on 64-bit) plus an object-table slot and GC work'],
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Good USTRUCTs',
            tone: 'good',
            text: 'Damage info passed to a function (amount, type, hit location). One row of tuning data. A grid coordinate. An inventory slot. A save-game record. *Data you would happily copy.*',
          },
          right: {
            title: 'Good UObjects',
            tone: 'good',
            text: 'A quest with objectives and logic, subclassed per quest in Blueprints. An inventory shared by the player and a stash UI. Anything that needs a lifetime of its own. *Things with identity and behaviour.*',
          },
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'The cost of "just make it a UObject"',
          text: 'Every `UObject` carries a header (virtual table pointer, flags, index into the global object array, class pointer, name, outer) before your first member, must be created with `NewObject`, and is visited by every garbage-collection pass for as long as it lives. For 10,000 bullets-worth of hit records, that difference is measurable. Structs scale; objects have presence.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Banknotes versus people',
          text: 'A struct is like a banknote: two €10 notes are interchangeable, you hand copies around without a second thought, and nobody tracks each note\'s life story. A `UObject` is like a person: two people with the same name are still different people, everyone refers to *that* person, and someone has to notice when they are no longer around.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Select **every** item that should be a `USTRUCT` rather than a `UObject`.',
      options: [
        {
          text: 'The details of one hit: damage amount, damage type and impact location',
          correct: true,
          why: 'Pure data, created and passed around per hit, copied freely. A struct avoids a garbage-collected allocation for every bullet.',
        },
        {
          text: 'A grid coordinate (X, Y) used as a key in a `TMap`',
          correct: true,
          why: 'Map keys must be compared and hashed by value — the definition of value semantics.',
        },
        {
          text: 'One row of character tuning: walk speed, jump height, max health',
          correct: true,
          why: 'Plain configuration data; Unreal\'s data tables are built from rows that are exactly this kind of struct.',
        },
        {
          text: 'A quest with its own objectives and logic, with a Blueprint subclass per quest',
          why: 'Blueprint subclassing and per-quest behaviour require a `UClass`. This is a textbook `UObject`.',
        },
        {
          text: 'An inventory that the player and a stash screen both hold pointers to and modify',
          why: 'Both sides must see *the same* inventory. With a struct, each would hold its own copy and changes would diverge. Shared identity calls for a `UObject` (or a component).',
        },
      ],
      explanation:
        'Rule of thumb: if copying it would be harmless or even desirable, make it a `USTRUCT`; if it needs identity, shared references, its own lifetime, polymorphic behaviour or Blueprint subclasses, make it a `UObject`. Defaulting to structs for data keeps memory, GC time and code simpler.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'truefalse',
      prompt: 'If you need more than 256 values, you can declare a `UENUM(BlueprintType)` with `int32` as its underlying type.',
      answer: false,
      explanation:
        'UHT rejects `BlueprintType` enums whose underlying type is not `uint8`, because Blueprints represent enums as single bytes. A non-Blueprint `UENUM()` used only from C++ has more freedom, but an enum with hundreds of values is usually a sign that the data belongs in a data table or a set of gameplay tags instead.',
    },
  ],
  takeaways: [
    '`UCLASS` declares a garbage-collected reference type with identity; `USTRUCT` declares a copied value type; `UENUM` declares named constants — each described at run time by `UClass`, `UScriptStruct` or `UEnum`.',
    '`Blueprintable` allows Blueprint subclasses, `BlueprintType` allows Blueprint variables; both are inherited (actors get them from `AActor`), while `Abstract` is not.',
    'Unreal classes cannot use C++ pure virtual functions because the engine constructs a default object of every class; use `PURE_VIRTUAL` and remember it only fails at run time.',
    '`Config = Game` plus `UPROPERTY(Config)` loads values from `DefaultGame.ini` into the class defaults, so tuning needs no rebuild.',
    '`USTRUCT(BlueprintType)` structs need `GENERATED_BODY()`, an `F` prefix and `UPROPERTY` members; they cannot have `UFUNCTION`s, so expose logic with static functions in a `UBlueprintFunctionLibrary`.',
    'Blueprint enums are `enum class E… : uint8` because Blueprints store enums as bytes; `UMETA(DisplayName)` is editor-only metadata.',
    'Prefer structs for copyable data and `UObject`s for things with identity, shared ownership, behaviour or Blueprint subclasses.',
  ],
  reading: [
    {
      title: 'Class Specifiers',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/class-specifiers',
      source: 'unreal-docs',
      note: 'The complete list of `UCLASS` specifiers, including which ones are inherited by child classes.',
    },
    {
      title: 'Structs',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/structs-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How `USTRUCT`s are declared, what they can and cannot do, and the struct specifiers.',
    },
    {
      title: 'Configuration Files',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/configuration-files-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How `.ini` files are layered and how `Config` properties map to sections.',
    },
    {
      title: 'enum class (scoped enumerations)',
      url: 'https://en.cppreference.com/w/cpp/language/enum',
      source: 'cppreference',
      note: 'The standard C++ rules behind `enum class E : uint8`, including underlying types.',
    },
  ],
};
