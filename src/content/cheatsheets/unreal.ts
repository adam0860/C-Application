import type { CheatSheet } from '../types';

/*
 * Unreal Engine quick-reference sheets (UE 5.4+). Fictional module: MyGame.
 */
export const unrealCheatSheets: CheatSheet[] = [
  // ------------------------------------------------------------------ Reflection
  {
    id: 'ue-reflection-macros',
    title: 'Reflection Macro Skeletons',
    course: 'unreal',
    icon: '🧬',
    description:
      'Copy-ready skeletons for UCLASS, USTRUCT, UENUM and UINTERFACE, plus the class specifiers you will use most.',
    sections: [
      {
        title: 'Class skeletons',
        items: [
          {
            label: 'Actor header',
            code: `// MyActor.h
#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "MyActor.generated.h"   // must be the last include

UCLASS()
class MYGAME_API AMyActor : public AActor {
    GENERATED_BODY()
public:
    AMyActor();
protected:
    virtual void BeginPlay() override;
};`,
          },
          {
            label: 'Actor source',
            code: `// MyActor.cpp
#include "MyActor.h"

AMyActor::AMyActor() {
    PrimaryActorTick.bCanEverTick = false;
}

void AMyActor::BeginPlay() {
    Super::BeginPlay();
}`,
          },
          {
            label: 'Plain UObject',
            code: `UCLASS(BlueprintType)
class MYGAME_API UQuestData : public UObject {
    GENERATED_BODY()
};`,
            text: 'Create at run time with `NewObject<UQuestData>(Outer)`.',
          },
          {
            label: 'Actor component',
            code: `UCLASS(ClassGroup = (Custom),
    meta = (BlueprintSpawnableComponent))
class MYGAME_API UHealthComponent : public UActorComponent {
    GENERATED_BODY()
public:
    UHealthComponent();
};`,
            text: '`BlueprintSpawnableComponent` lets designers add it in the editor.',
          },
          {
            label: 'Blueprint function library',
            code: `UCLASS()
class MYGAME_API UMyStatics : public UBlueprintFunctionLibrary {
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintPure, Category = "MyGame|Math")
    static float Percent(float Value, float Max);
};`,
            text: 'Static functions here become global Blueprint nodes.',
          },
          {
            label: 'Forward declare in headers',
            code: `class UStaticMeshComponent;   // forward declaration

UPROPERTY(VisibleAnywhere)
TObjectPtr<UStaticMeshComponent> Mesh;
// #include "Components/StaticMeshComponent.h" in the .cpp`,
            text: 'Keeps headers light and compile times down.',
          },
        ],
      },
      {
        title: 'Structs and enums',
        items: [
          {
            label: 'USTRUCT',
            code: `USTRUCT(BlueprintType)
struct FLootEntry {
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FName ItemId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 Count = 1;
};`,
            text: 'Value type with `F` prefix. No `UFUNCTION`s allowed inside.',
          },
          {
            label: 'Data table row',
            code: `USTRUCT(BlueprintType)
struct FEnemyRow : public FTableRowBase {
    GENERATED_BODY()
    UPROPERTY(EditAnywhere) float Health = 100.f;
    UPROPERTY(EditAnywhere) float Speed = 400.f;
};`,
          },
          {
            label: 'UENUM',
            code: `UENUM(BlueprintType)
enum class EAmmoType : uint8 {
    Bullet  UMETA(DisplayName = "Bullet"),
    Rocket  UMETA(DisplayName = "Rocket"),
    Arrow
};`,
            text: 'Blueprint only supports `uint8`-based enums.',
          },
          {
            label: 'Enum to string / text',
            code: `FString S = UEnum::GetValueAsString(EAmmoType::Rocket);
// "EAmmoType::Rocket"
FText T = UEnum::GetDisplayValueAsText(EAmmoType::Rocket);
// "Rocket" (uses DisplayName)`,
          },
          {
            label: 'Struct holding UObject refs',
            code: `USTRUCT()
struct FSquad {
    GENERATED_BODY()
    UPROPERTY() TArray<TObjectPtr<AActor>> Members;
};

UPROPERTY() FSquad Squad;   // the struct must be a UPROPERTY too`,
            text: 'The GC only sees references reachable through reflected properties.',
          },
          {
            label: 'Struct member functions',
            code: `USTRUCT(BlueprintType)
struct FDamageInfo {
    GENERATED_BODY()
    UPROPERTY(EditAnywhere) float Amount = 0.f;
    bool IsLethal(float Hp) const { return Amount >= Hp; }
};`,
            text: 'Plain member functions are fine; Blueprint just cannot see them.',
          },
          {
            label: 'Enum as a property',
            code: `UPROPERTY(EditAnywhere, BlueprintReadWrite)
EAmmoType AmmoType = EAmmoType::Bullet;`,
            text: 'Shows up as a dropdown in the Details panel.',
          },
        ],
      },
      {
        title: 'Interfaces',
        items: [
          {
            label: 'Declare',
            code: `UINTERFACE(MinimalAPI, Blueprintable)
class UInteractable : public UInterface {
    GENERATED_BODY()
};

class MYGAME_API IInteractable {
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintNativeEvent, BlueprintCallable)
    void Interact(AActor* Instigator);
    virtual bool CanInteract() const { return true; } // C++ only
};`,
          },
          {
            label: 'Implement',
            code: `UCLASS()
class MYGAME_API AChest : public AActor, public IInteractable {
    GENERATED_BODY()
public:
    virtual void Interact_Implementation(AActor* Who) override;
};`,
          },
          {
            label: 'Check and call (C++ or Blueprint)',
            code: `if (Target->Implements<UInteractable>()) {
    IInteractable::Execute_Interact(Target, this);
}`,
            text: 'Always use `Execute_` for Blueprint events, or Blueprint implementations are skipped.',
          },
          {
            label: 'Cast (C++ implementations only)',
            code: `if (IInteractable* I = Cast<IInteractable>(Target)) {
    if (I->CanInteract()) { /* ... */ }
}`,
            text: 'Returns `nullptr` when the interface is implemented only in Blueprint.',
          },
          {
            label: 'Interface-typed property',
            code: `UPROPERTY(EditAnywhere)
TScriptInterface<IInteractable> LinkedObject;`,
          },
          {
            label: 'Blueprint-only interface function',
            code: `UFUNCTION(BlueprintImplementableEvent, BlueprintCallable)
void OnFocused();`,
            text: 'No C++ body. Call it with `IInteractable::Execute_OnFocused(Obj)`.',
          },
          {
            label: 'Rules of thumb',
            text: 'Plain `virtual` functions can only be implemented and called from C++. `BlueprintNativeEvent` and `BlueprintImplementableEvent` functions cannot be pure virtual.',
          },
        ],
      },
      {
        title: 'Common class specifiers',
        items: [
          { label: 'Blueprintable', code: 'UCLASS(Blueprintable)', text: 'Can be the parent of a Blueprint class (inherited by subclasses).' },
          { label: 'NotBlueprintable', code: 'UCLASS(NotBlueprintable)', text: 'Blocks Blueprint subclasses, even if the parent allows them.' },
          { label: 'BlueprintType', code: 'UCLASS(BlueprintType)', text: 'Usable as a Blueprint variable type.' },
          { label: 'Abstract', code: 'UCLASS(Abstract)', text: 'Cannot be instantiated or placed; for base classes.' },
          {
            label: 'Config',
            code: `UCLASS(Config = Game)
class MYGAME_API UMySettings : public UObject {
    GENERATED_BODY()
    UPROPERTY(Config) float MouseSensitivity = 1.f;
};`,
            text: 'Reads `Config` properties from `DefaultGame.ini`.',
          },
          { label: 'Transient', code: 'UCLASS(Transient)', text: 'Objects of this class are never saved to disk.' },
          {
            label: 'EditInlineNew + DefaultToInstanced',
            code: 'UCLASS(EditInlineNew, DefaultToInstanced)',
            text: 'Lets designers create instances inline in an `Instanced` property.',
          },
          { label: 'HideCategories', code: 'UCLASS(HideCategories = (Rendering, Replication))', text: 'Tidies the Details panel.' },
          { label: 'MinimalAPI', code: 'UCLASS(MinimalAPI)', text: 'Exports only what is needed to cast to and reference the class from other modules.' },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ UPROPERTY
  {
    id: 'ue-uproperty-specifiers',
    title: 'UPROPERTY Specifiers',
    course: 'unreal',
    icon: '🏷️',
    description:
      'Editor visibility, Blueprint access, saving, config, replication and the meta keys that polish the Details panel.',
    sections: [
      {
        title: 'Editor visibility',
        items: [
          { label: 'EditAnywhere', code: 'UPROPERTY(EditAnywhere)', text: 'Editable on class defaults and on placed instances.' },
          { label: 'EditDefaultsOnly', code: 'UPROPERTY(EditDefaultsOnly)', text: 'Editable only in the Blueprint editor (class defaults).' },
          { label: 'EditInstanceOnly', code: 'UPROPERTY(EditInstanceOnly)', text: 'Editable only on instances placed in a level.' },
          { label: 'VisibleAnywhere', code: 'UPROPERTY(VisibleAnywhere)', text: 'Shown read-only everywhere. Use for component pointers.' },
          { label: 'VisibleDefaultsOnly', code: 'UPROPERTY(VisibleDefaultsOnly)', text: 'Read-only, class defaults only.' },
          { label: 'VisibleInstanceOnly', code: 'UPROPERTY(VisibleInstanceOnly)', text: 'Read-only, instances only. Great for watching runtime state.' },
          { label: 'Category', code: 'UPROPERTY(EditAnywhere, Category = "Combat|Melee")', text: '`|` creates nested categories.' },
          { label: 'AdvancedDisplay', code: 'UPROPERTY(EditAnywhere, AdvancedDisplay)', text: 'Hidden under the "advanced" arrow of its category.' },
          {
            label: 'Component pointer',
            code: `UPROPERTY(VisibleAnywhere, BlueprintReadOnly)
TObjectPtr<UStaticMeshComponent> Mesh;`,
            text: 'The pointer is fixed; the component\'s own settings stay editable.',
          },
        ],
      },
      {
        title: 'Blueprint access',
        items: [
          { label: 'BlueprintReadOnly', code: 'UPROPERTY(EditAnywhere, BlueprintReadOnly)', text: 'Getter node only.' },
          { label: 'BlueprintReadWrite', code: 'UPROPERTY(EditAnywhere, BlueprintReadWrite)', text: 'Getter and setter nodes. Bypasses your C++ setter logic.' },
          {
            label: 'Private member exposed',
            code: `private:
UPROPERTY(VisibleAnywhere, BlueprintReadOnly,
    meta = (AllowPrivateAccess = "true"))
int32 Kills = 0;`,
          },
          {
            label: 'Getter / setter functions',
            code: `UPROPERTY(EditAnywhere, BlueprintGetter = GetHealth,
    BlueprintSetter = SetHealth)
float Health = 100.f;

UFUNCTION(BlueprintGetter) float GetHealth() const;
UFUNCTION(BlueprintSetter) void SetHealth(float NewHealth);`,
            text: 'Blueprint reads and writes go through your functions.',
          },
          {
            label: 'Event for Blueprint',
            code: `UPROPERTY(BlueprintAssignable, Category = "Events")
FOnDied OnDied;   // dynamic multicast delegate`,
          },
          {
            label: 'Broadcastable from Blueprint',
            code: 'UPROPERTY(BlueprintAssignable, BlueprintCallable)',
            text: 'Multicast delegates only.',
          },
        ],
      },
      {
        title: 'Saving, config and networking',
        items: [
          {
            label: 'Bare UPROPERTY',
            code: `UPROPERTY()
TObjectPtr<UInventory> Inventory;`,
            text: 'Not in the editor, but saved and tracked by the GC.',
          },
          { label: 'Transient', code: 'UPROPERTY(Transient)', text: 'Never saved; starts zeroed or default after loading.' },
          { label: 'SaveGame', code: 'UPROPERTY(SaveGame)', text: 'Flags the property for save-game serialisation (archives with `ArIsSaveGame`).' },
          {
            label: 'Config',
            code: `UPROPERTY(Config, EditAnywhere)
float MouseSensitivity = 1.f;`,
            text: 'Class needs `UCLASS(Config = Game)`; value comes from `DefaultGame.ini`.',
          },
          { label: 'Replicated', code: 'UPROPERTY(Replicated)', text: 'Also register it with `DOREPLIFETIME` in `GetLifetimeReplicatedProps`.' },
          { label: 'ReplicatedUsing', code: 'UPROPERTY(ReplicatedUsing = OnRep_Health)', text: 'Calls the `UFUNCTION` `OnRep_Health` on clients when the value arrives.' },
          { label: 'NotReplicated', code: 'UPROPERTY(NotReplicated)', text: 'Skips one member of a replicated struct.' },
          {
            label: 'Instanced',
            code: `UPROPERTY(EditAnywhere, Instanced)
TObjectPtr<UEffectBase> Effect;   // class is EditInlineNew`,
            text: 'Designers create and edit the object inline.',
          },
        ],
      },
      {
        title: 'Meta specifiers',
        items: [
          { label: 'Clamp', code: 'meta = (ClampMin = "0", ClampMax = "100")', text: 'Limits typed values in the editor (not values set in code).' },
          { label: 'Slider range', code: 'meta = (UIMin = "0", UIMax = "1")', text: 'Slider range; typed values may go beyond it.' },
          { label: 'EditCondition', code: 'meta = (EditCondition = "bUsesAmmo")', text: 'Greys out the field unless the condition is true.' },
          { label: 'EditConditionHides', code: 'meta = (EditCondition = "bUsesAmmo", EditConditionHides)', text: 'Hides the field instead of greying it out.' },
          { label: 'Inline toggle', code: 'meta = (InlineEditConditionToggle)', text: 'On the bool: shows it as a checkbox next to the field it controls.' },
          { label: 'DisplayName', code: 'meta = (DisplayName = "Max HP")', text: 'Friendlier name in the editor.' },
          { label: 'Tooltip', code: '/** Shown as the tooltip in the editor. */', text: 'A doc comment above the property becomes its tooltip.' },
          { label: 'Units', code: 'meta = (Units = "cm")', text: 'Displays and parses values with a unit.' },
          { label: '3D widget', code: 'meta = (MakeEditWidget)', text: 'On an `FVector`: draggable widget in the viewport.' },
          { label: 'BindWidget', code: 'UPROPERTY(meta = (BindWidget))', text: 'In a `UUserWidget`: links to the designer widget with the same name.' },
          {
            label: 'Dropdown of names',
            code: `UPROPERTY(EditAnywhere, meta = (GetOptions = "GetSocketNames"))
FName Socket;

UFUNCTION() TArray<FName> GetSocketNames() const;`,
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ UFUNCTION
  {
    id: 'ue-ufunction-specifiers',
    title: 'UFUNCTION Specifiers',
    course: 'unreal',
    icon: '⚙️',
    description:
      'Blueprint exposure, RPCs, events, console commands and the meta keys that shape Blueprint nodes.',
    sections: [
      {
        title: 'Blueprint exposure',
        items: [
          { label: 'BlueprintCallable', code: 'UFUNCTION(BlueprintCallable, Category = "Combat")', text: 'Node with exec pins.' },
          { label: 'BlueprintPure', code: 'UFUNCTION(BlueprintPure, Category = "Stats")', text: 'No exec pins; re-evaluated for every use. Keep it cheap.' },
          { label: 'Const but impure', code: 'UFUNCTION(BlueprintCallable, BlueprintPure = false)', text: '`const` callable functions are pure by default; this opts out.' },
          {
            label: 'BlueprintImplementableEvent',
            code: `UFUNCTION(BlueprintImplementableEvent)
void OnLevelUp(int32 NewLevel);   // no C++ body`,
          },
          {
            label: 'BlueprintNativeEvent',
            code: `UFUNCTION(BlueprintNativeEvent, BlueprintCallable)
void Interact(AActor* Who);
// .cpp: void AChest::Interact_Implementation(AActor* Who) { }`,
            text: 'Call `Interact()`, never `Interact_Implementation()` directly.',
          },
          { label: 'CallInEditor', code: 'UFUNCTION(CallInEditor, Category = "Tools")', text: 'Adds a button to the Details panel; great for editor helpers.' },
          { label: 'BlueprintAuthorityOnly', code: 'UFUNCTION(BlueprintCallable, BlueprintAuthorityOnly)', text: 'Only runs from Blueprint on the machine with authority.' },
          { label: 'BlueprintCosmetic', code: 'UFUNCTION(BlueprintCallable, BlueprintCosmetic)', text: 'Does not run on dedicated servers.' },
        ],
      },
      {
        title: 'Networking (RPCs)',
        items: [
          { label: 'Client → server', code: 'UFUNCTION(Server, Reliable)\nvoid ServerFire(FVector_NetQuantize Target);', text: 'Only callable by the owning client.' },
          { label: 'Server → owning client', code: 'UFUNCTION(Client, Reliable)\nvoid ClientShowHitMarker();' },
          { label: 'Server → everyone', code: 'UFUNCTION(NetMulticast, Unreliable)\nvoid MulticastPlayImpact(FVector Location);', text: 'Good for cosmetic one-off events.' },
          {
            label: 'Implementation',
            code: `void AHero::ServerFire_Implementation(
    FVector_NetQuantize Target) {
    // runs on the server
}`,
          },
          {
            label: 'WithValidation',
            code: `UFUNCTION(Server, Reliable, WithValidation)
void ServerBuy(int32 ItemId);

bool AHero::ServerBuy_Validate(int32 ItemId) {
    return ItemId >= 0;   // false disconnects the caller
}`,
          },
          { label: 'Reliable vs Unreliable', text: '**Reliable**: guaranteed and ordered; do not spam it. **Unreliable**: may be dropped; fine for frequent cosmetic events.' },
        ],
      },
      {
        title: 'Other reasons to add UFUNCTION()',
        items: [
          {
            label: 'Dynamic delegate handler',
            code: `UFUNCTION()
void OnOverlap(UPrimitiveComponent* Comp, AActor* Other,
    UPrimitiveComponent* OtherComp, int32 BodyIndex,
    bool bFromSweep, const FHitResult& Sweep);`,
            text: 'Required for `AddDynamic`.',
          },
          { label: 'RepNotify', code: 'UFUNCTION()\nvoid OnRep_Health(float OldHealth);' },
          { label: 'Console command', code: 'UFUNCTION(Exec)\nvoid GiveGold(int32 Amount);', text: 'Works on PlayerController, possessed Pawn, HUD, GameMode, CheatManager and GameInstance.' },
          {
            label: 'Timer or delegate by name',
            code: `FTimerDelegate D =
    FTimerDelegate::CreateUFunction(this, FName("Respawn"));`,
            text: 'Binding by name requires the target to be a `UFUNCTION`.',
          },
          {
            label: 'Static library node',
            code: `UFUNCTION(BlueprintCallable, Category = "MyGame",
    meta = (WorldContext = "WorldContextObject"))
static void ShakeAll(const UObject* WorldContextObject);`,
          },
          {
            label: 'Call by name',
            code: `if (UFunction* Fn = FindFunction(FName("OpenDoor"))) {
    ProcessEvent(Fn, nullptr);   // no parameters
}`,
            text: 'Only `UFUNCTION`s can be found and invoked through reflection.',
          },
        ],
      },
      {
        title: 'Function meta specifiers',
        items: [
          { label: 'DisplayName', code: 'meta = (DisplayName = "Deal Damage")', text: 'Node title in Blueprint.' },
          { label: 'Keywords', code: 'meta = (Keywords = "hurt hit attack")', text: 'Extra search terms in the node menu.' },
          { label: 'CompactNodeTitle', code: 'meta = (CompactNodeTitle = "HP%")', text: 'Small, title-only node.' },
          { label: 'DefaultToSelf', code: 'meta = (DefaultToSelf = "Target")', text: 'The pin defaults to the calling Blueprint.' },
          { label: 'WorldContext', code: 'meta = (WorldContext = "WorldContextObject")', text: 'Hides and auto-fills the world context pin.' },
          {
            label: 'ExpandEnumAsExecs',
            code: `UFUNCTION(BlueprintCallable,
    meta = (ExpandEnumAsExecs = "Result"))
void TryOpen(EOpenResult& Result);`,
            text: 'One exec output pin per enum value.',
          },
          { label: 'AdvancedDisplay', code: 'meta = (AdvancedDisplay = "Radius,Falloff")', text: 'Hides rarely used pins behind an arrow.' },
          { label: 'Deprecation', code: 'meta = (DeprecatedFunction, DeprecationMessage = "Use FireV2")', text: 'Warns Blueprint users when they compile.' },
        ],
      },
    ],
  },

  // ------------------------------------------------------------- Types & naming
  {
    id: 'ue-types-naming',
    title: 'Types & Naming',
    course: 'unreal',
    icon: '🔤',
    description:
      'Epic prefixes, fixed-size numbers, the three string types and every common conversion between them.',
    sections: [
      {
        title: 'Prefixes and naming',
        items: [
          { label: 'A — actors', code: 'class AEnemy : public ACharacter', text: 'Anything derived from `AActor`.' },
          { label: 'U — other UObjects', code: 'class UHealthComponent : public UActorComponent' },
          { label: 'F — structs and plain classes', code: 'struct FWeaponStats; FVector; FString;' },
          { label: 'E — enums', code: 'enum class EWeaponType : uint8' },
          { label: 'I — interfaces', code: 'class IInteractable' },
          { label: 'T — templates', code: 'TArray<int32>  TMap<FName, int32>  TObjectPtr<AActor>' },
          { label: 'S — Slate widgets', code: 'SButton  SCompoundWidget' },
          { label: 'b — booleans', code: 'bool bIsDead = false;' },
          { label: 'Out — output parameters', code: 'bool TryGet(FName Id, int32& OutCount);' },
          { label: 'PascalCase everywhere', code: 'float MaxHealth;  void ApplyDamage(float Amount);' },
        ],
      },
      {
        title: 'Numeric types',
        items: [
          { label: 'Default integer', code: 'int32 Score = 0;', text: 'Exactly 32 bits on every platform.' },
          { label: 'Bytes and enum storage', code: 'uint8 TeamId = 2;   // Blueprint "Byte"' },
          { label: 'Big numbers', code: 'int64 TotalXP = 5\'000\'000\'000;' },
          { label: 'Reals', code: 'float Speed = 600.f;   double WorldX = 1e7;' },
          { label: 'Limits', code: 'TNumericLimits<int32>::Max()   MAX_int32   MAX_flt' },
          { label: 'float → int', code: 'FMath::RoundToInt(2.6f)   // 3\nFMath::FloorToInt(2.6f)   // 2\nFMath::TruncToInt(-2.6f)  // -2' },
          { label: 'Compare floats', code: 'FMath::IsNearlyEqual(A, B)   FMath::IsNearlyZero(V)' },
          { label: 'Container sizes are signed', code: 'for (int32 i = 0; i < Arr.Num(); ++i) { }', text: '`Num()` returns `int32`, unlike `std::vector::size()`.' },
        ],
      },
      {
        title: 'Three string types',
        items: [
          { label: 'FString — build and edit', code: 'FString Msg = FString::Printf(TEXT("%s: %d"), *Name, Score);' },
          { label: 'FName — fast identifiers', code: 'static const FName Socket(TEXT("hand_r"));', text: 'Case-insensitive, immutable, compares like an integer.' },
          { label: 'FText — player-facing', code: '#define LOCTEXT_NAMESPACE "HUD"\nFText T = LOCTEXT("Ammo", "Ammo");\n#undef LOCTEXT_NAMESPACE', text: 'Localisable.' },
          { label: 'One-off localised text', code: 'NSLOCTEXT("HUD", "Ammo", "Ammo")' },
          { label: 'Format FText', code: 'FText::Format(LOCTEXT("Fmt", "{0} / {1}"),\n    FText::AsNumber(Ammo), FText::AsNumber(Max))' },
          { label: '%s needs *', code: 'UE_LOG(LogTemp, Log, TEXT("%s"), *MyString);', text: '`*` turns an `FString` into a `const TCHAR*`.' },
        ],
      },
      {
        title: 'Conversions',
        items: [
          { label: 'FString → FName', code: 'FName N(*Str);' },
          { label: 'FName → FString', code: 'FString S = N.ToString();' },
          { label: 'FString → FText', code: 'FText T = FText::FromString(Str);', text: 'Not localised; fine for player-entered names.' },
          { label: 'FText → FString', code: 'FString S = T.ToString();' },
          { label: 'FName → FText', code: 'FText T = FText::FromName(N);' },
          { label: 'Number → FString', code: 'FString::FromInt(42)\nFString::SanitizeFloat(3.5f)        // "3.5"\nFString::Printf(TEXT("%.2f"), F)' },
          { label: 'FString → number', code: 'int32 I = FCString::Atoi(*Str);\nfloat F = FCString::Atof(*Str);' },
          { label: 'bool / vector → FString', code: 'LexToString(bFlag)      // "true" or "false"\nVec.ToString()          // "X=1.000 Y=2.000 Z=3.000"' },
          { label: 'Enum → FString', code: 'UEnum::GetValueAsString(EWeaponType::Bow)' },
          { label: 'FString ↔ std::string', code: 'std::string S(TCHAR_TO_UTF8(*Str));\nFString F(UTF8_TO_TCHAR(S.c_str()));', text: 'The macros create temporaries: copy the result immediately.' },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------- Containers
  {
    id: 'ue-containers',
    title: 'Containers',
    course: 'unreal',
    icon: '📦',
    description:
      'TArray, TMap and TSet operations at a glance, with the pitfalls that bite in real projects.',
    sections: [
      {
        title: 'TArray',
        items: [
          { label: 'Declare and initialise', code: 'TArray<int32> Scores = { 10, 20, 30 };\nTArray<float> Zeros;\nZeros.Init(0.f, 8);          // 8 zeros' },
          { label: 'Append', code: 'Arr.Add(Value);\nArr.Emplace(ConstructorArgs);   // construct in place\nArr.AddUnique(Value);          // only if not present' },
          { label: 'Insert and remove by index', code: 'Arr.Insert(Value, 0);   // O(n)\nArr.RemoveAt(2);        // O(n), keeps order\nArr.RemoveAtSwap(2);    // O(1), changes order' },
          { label: 'Remove by value', code: 'Arr.Remove(Value);      // all matches\nArr.RemoveSingle(Value);\nArr.RemoveAll([](int32 V) { return V < 0; });' },
          { label: 'Size and checks', code: 'Arr.Num()   Arr.IsEmpty()   Arr.IsValidIndex(i)' },
          { label: 'Search', code: 'Arr.Contains(Value)\nint32 Index = Arr.Find(Value);   // INDEX_NONE if absent\nint32* P = Arr.FindByPredicate([](int32 V) { return V > 10; });' },
          { label: 'Sort', code: 'Arr.Sort();                                  // operator<\nArr.Sort([](const FItem& A, const FItem& B) {\n    return A.Price < B.Price; });' },
          { label: 'Filter', code: 'TArray<int32> Big =\n    Arr.FilterByPredicate([](int32 V) { return V > 100; });' },
          { label: 'Ends', code: 'Arr.Last()   Arr.Top()   Arr.Pop()' },
          { label: 'Capacity', code: 'Arr.Reserve(100);   // avoid reallocations\nArr.Reset();        // clear, keep memory\nArr.Empty();        // clear, free memory' },
          { label: 'Iterate', code: 'for (const FItem& Item : Items) { }\nfor (int32 i = 0; i < Items.Num(); ++i) { }' },
          { label: 'Remove while iterating', code: 'for (int32 i = Arr.Num() - 1; i >= 0; --i) {\n    if (ShouldRemove(Arr[i])) { Arr.RemoveAt(i); }\n}', text: 'Iterate backwards by index, or use `RemoveAll`.' },
        ],
      },
      {
        title: 'TMap',
        items: [
          { label: 'Declare', code: 'TMap<FName, int32> Inventory;' },
          { label: 'Add or overwrite', code: 'Inventory.Add(TEXT("Arrow"), 20);\nInventory.Emplace(TEXT("Gem"), 1);' },
          { label: 'Find (pointer)', code: 'if (int32* Count = Inventory.Find(TEXT("Arrow"))) {\n    *Count -= 1;\n}', text: 'Returns `nullptr` if the key is missing.' },
          { label: 'FindRef (copy or default)', code: 'int32 Count = Inventory.FindRef(TEXT("Arrow"));   // 0 if missing' },
          { label: 'FindOrAdd', code: 'Inventory.FindOrAdd(TEXT("Gem")) += 1;' },
          { label: 'Contains and Remove', code: 'Inventory.Contains(Key)   Inventory.Remove(Key)' },
          { label: 'operator[]', code: 'Inventory[TEXT("Arrow")] = 5;', text: 'Asserts if the key is missing; it does **not** insert like `std::map`.' },
          { label: 'Iterate pairs', code: 'for (const TPair<FName, int32>& Pair : Inventory) {\n    UE_LOG(LogTemp, Log, TEXT("%s=%d"),\n        *Pair.Key.ToString(), Pair.Value);\n}' },
          { label: 'Keys and values', code: 'TArray<FName> Keys;\nInventory.GetKeys(Keys);\nTArray<int32> Values;\nInventory.GenerateValueArray(Values);' },
          { label: 'Sort', code: 'Inventory.KeySort([](const FName& A, const FName& B) {\n    return A.LexicalLess(B); });\nInventory.ValueSort(TGreater<int32>());' },
        ],
      },
      {
        title: 'TSet',
        items: [
          { label: 'Declare and add', code: 'TSet<FName> Unlocked;\nUnlocked.Add(TEXT("DoubleJump"));   // duplicates ignored' },
          { label: 'Query and remove', code: 'Unlocked.Contains(Id)   Unlocked.Remove(Id)   Unlocked.Num()' },
          { label: 'Set algebra', code: 'TSet<int32> Both   = A.Intersect(B);\nTSet<int32> Either = A.Union(B);\nTSet<int32> OnlyA  = A.Difference(B);' },
          { label: 'Array ↔ set', code: 'TSet<FName> Unique;\nUnique.Append(NamesArray);\nTArray<FName> AsArray = Unique.Array();' },
          { label: 'Detect duplicates on add', code: 'bool bAlreadyThere = false;\nSeen.Add(Actor, &bAlreadyThere);' },
          { label: 'Custom key types', text: 'Provide `operator==` and a `friend uint32 GetTypeHash(const FMyKey& K)` (combine fields with `HashCombine`).' },
        ],
      },
      {
        title: 'Pitfalls and tips',
        items: [
          { label: 'Pointers into arrays', code: 'FItem* First = &Items[0];\nItems.Add(NewItem);   // may reallocate: First can dangle', text: 'Same rule as `std::vector`.' },
          { label: 'Containers of objects', code: 'UPROPERTY()\nTArray<TObjectPtr<AActor>> Spawned;', text: 'Without `UPROPERTY` the GC does not see the references.' },
          { label: 'Pass by const reference', code: 'void Process(const TArray<FHitResult>& Hits);' },
          { label: 'Move instead of copy', code: 'Cache = MoveTemp(LocalArray);   // like std::move' },
          { label: 'Small-buffer arrays', code: 'TArray<FHitResult, TInlineAllocator<8>> Hits;', text: 'No heap allocation for up to 8 elements.' },
          { label: 'Replication', text: '`TArray` properties can replicate; `TMap` and `TSet` properties cannot.' },
          { label: 'Iteration order', text: 'Never rely on the iteration order of `TMap` or `TSet`.' },
        ],
      },
    ],
  },

  // -------------------------------------------------------- Actors & components
  {
    id: 'ue-actors-components',
    title: 'Actors & Components',
    course: 'unreal',
    icon: '🧱',
    description:
      'Lifecycle overrides, building component hierarchies, spawning and destroying, and everyday actor functions.',
    sections: [
      {
        title: 'Lifecycle overrides',
        items: [
          { label: 'Constructor', code: 'AMyActor::AMyActor() { }', text: 'Defaults and components only. Also runs for the CDO in the editor.' },
          { label: 'OnConstruction', code: 'virtual void OnConstruction(const FTransform& Transform) override;', text: 'Runs when placed, moved or edited in the editor, and on spawn.' },
          { label: 'PostInitializeComponents', code: 'virtual void PostInitializeComponents() override;', text: 'Components exist and are initialised; before `BeginPlay`.' },
          { label: 'BeginPlay', code: 'virtual void BeginPlay() override;\n// first line: Super::BeginPlay();', text: 'Gameplay setup, delegate binding, timers.' },
          { label: 'Tick', code: 'virtual void Tick(float DeltaTime) override;\n// constructor: PrimaryActorTick.bCanEverTick = true;' },
          { label: 'EndPlay', code: 'virtual void EndPlay(const EEndPlayReason::Type Reason) override;', text: 'Clean up timers and bindings; call `Super::EndPlay(Reason)`.' },
          { label: 'Component tick', code: 'virtual void TickComponent(float DeltaTime, ELevelTick TickType,\n    FActorComponentTickFunction* ThisTickFunction) override;', text: 'Enable with `PrimaryComponentTick.bCanEverTick = true`.' },
          { label: 'Tick less often', code: 'PrimaryActorTick.TickInterval = 0.25f;   // 4 times a second\nSetActorTickEnabled(false);' },
        ],
      },
      {
        title: 'Components in the constructor',
        items: [
          { label: 'Header', code: 'UPROPERTY(VisibleAnywhere, BlueprintReadOnly)\nTObjectPtr<UStaticMeshComponent> Mesh;' },
          { label: 'Root', code: 'Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));\nSetRootComponent(Root);' },
          { label: 'Attach a child', code: 'Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));\nMesh->SetupAttachment(Root);' },
          { label: 'Attach to a socket', code: 'Weapon->SetupAttachment(GetMesh(), TEXT("hand_r"));' },
          { label: 'Logic-only component', code: 'Health = CreateDefaultSubobject<UHealthComponent>(TEXT("Health"));', text: 'No attachment needed for `UActorComponent`s.' },
          {
            label: 'Third-person camera',
            code: `Boom = CreateDefaultSubobject<USpringArmComponent>(TEXT("Boom"));
Boom->SetupAttachment(RootComponent);
Boom->TargetArmLength = 400.f;
Boom->bUsePawnControlRotation = true;
Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
Camera->SetupAttachment(Boom, USpringArmComponent::SocketName);`,
          },
          { label: 'Names must be unique', text: 'The `TEXT("Name")` identifies the subobject in saved data. Renaming it later can break Blueprint subclasses.' },
        ],
      },
      {
        title: 'Spawning and destroying',
        items: [
          { label: 'Spawn', code: 'AProjectile* P = GetWorld()->SpawnActor<AProjectile>(\n    ProjectileClass, Location, Rotation);', text: 'Can return `nullptr`: always check.' },
          {
            label: 'Spawn with parameters',
            code: `FActorSpawnParameters Params;
Params.Owner = this;
Params.Instigator = GetInstigator();
Params.SpawnCollisionHandlingOverride =
    ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
GetWorld()->SpawnActor<AActor>(Class, Loc, Rot, Params);`,
          },
          {
            label: 'Deferred spawn',
            code: `const FTransform Xf(Rotation, Location);
AProjectile* P = GetWorld()->SpawnActorDeferred<AProjectile>(
    ProjectileClass, Xf, this, GetInstigator());
if (P) {
    P->Damage = 50.f;          // set before BeginPlay runs
    P->FinishSpawning(Xf);
}`,
          },
          { label: 'Destroy', code: 'Destroy();\nOtherActor->Destroy();' },
          { label: 'Destroy later', code: 'SetLifeSpan(5.f);   // or InitialLifeSpan in the constructor' },
          {
            label: 'Add a component at run time',
            code: `auto* Light = NewObject<UPointLightComponent>(this);
Light->SetupAttachment(GetRootComponent());
Light->RegisterComponent();`,
          },
          { label: 'Never', code: 'new AEnemy();   delete Enemy;   // never for UObjects', text: 'Use `SpawnActor` / `NewObject` and `Destroy()`.' },
        ],
      },
      {
        title: 'Everyday actor functions',
        items: [
          { label: 'Location', code: 'FVector L = GetActorLocation();\nSetActorLocation(L + FVector(0.f, 0.f, 100.f));' },
          { label: 'Move with collision', code: 'FHitResult Hit;\nAddActorWorldOffset(Delta, true, &Hit);   // true = sweep' },
          { label: 'Rotation and axes', code: 'SetActorRotation(FRotator(0.f, 90.f, 0.f));\nGetActorForwardVector()   GetActorRightVector()   GetActorUpVector()' },
          { label: 'Find a component', code: 'auto* HC = Other->FindComponentByClass<UHealthComponent>();' },
          { label: 'Owner of a component', code: 'AActor* OwnerActor = GetOwner();' },
          {
            label: 'Attach at run time',
            code: `Sword->AttachToComponent(GetMesh(),
    FAttachmentTransformRules::SnapToTargetNotIncludingScale,
    TEXT("hand_r"));`,
          },
          {
            label: 'Iterate actors of a class',
            code: `#include "EngineUtils.h"
for (TActorIterator<AEnemy> It(GetWorld()); It; ++It) {
    AEnemy* Enemy = *It;
}`,
            text: 'Fine occasionally; never every frame in large levels.',
          },
          { label: 'Tags', code: 'Tags.Add(TEXT("Boss"));\nif (Other->ActorHasTag(TEXT("Boss"))) { }' },
          { label: 'Hide and disable', code: 'SetActorHiddenInGame(true);\nSetActorEnableCollision(false);\nSetActorTickEnabled(false);' },
        ],
      },
    ],
  },

  // -------------------------------------------------------- Logging & debugging
  {
    id: 'ue-logging-debugging',
    title: 'Logging & Debugging',
    course: 'unreal',
    icon: '🐞',
    description:
      'UE_LOG, on-screen messages, debug drawing, assertions and the console commands worth memorising.',
    sections: [
      {
        title: 'UE_LOG',
        items: [
          { label: 'Basic', code: 'UE_LOG(LogTemp, Log, TEXT("Hello"));' },
          { label: 'Verbosity levels', code: 'Fatal  Error  Warning  Display  Log  Verbose  VeryVerbose', lang: 'text', text: '`Fatal` crashes the program on purpose.' },
          { label: 'Format specifiers', code: 'UE_LOG(LogTemp, Log, TEXT("%d %u %lld %.2f %s"),\n    Int32Val, Uint32Val, Int64Val, FloatVal, *StringVal);' },
          { label: 'Objects and vectors', code: 'UE_LOG(LogTemp, Log, TEXT("%s at %s"),\n    *GetNameSafe(Target), *GetActorLocation().ToString());', text: '`GetNameSafe` handles `nullptr`.' },
          { label: 'Booleans', code: 'UE_LOG(LogTemp, Log, TEXT("Dead: %s"),\n    bIsDead ? TEXT("true") : TEXT("false"));' },
          { label: 'Conditional', code: 'UE_CLOG(Health < 10.f, LogTemp, Warning, TEXT("Low health"));' },
          { label: 'Custom category', code: '// Header\nDECLARE_LOG_CATEGORY_EXTERN(LogInventory, Log, All);\n// One .cpp\nDEFINE_LOG_CATEGORY(LogInventory);' },
          { label: 'File-local category', code: 'DEFINE_LOG_CATEGORY_STATIC(LogSpawner, Log, All);' },
          { label: 'Structured (UE 5.2+)', code: '#include "Logging/StructuredLog.h"\nUE_LOGFMT(LogTemp, Warning, "Lost {Amount} gold", Amount);' },
        ],
      },
      {
        title: 'On-screen messages',
        items: [
          {
            label: 'AddOnScreenDebugMessage',
            code: `if (GEngine) {
    GEngine->AddOnScreenDebugMessage(-1, 5.f, FColor::Yellow,
        FString::Printf(TEXT("Score: %d"), Score));
}`,
            text: 'Key `-1` adds a new line each call.',
          },
          { label: 'Replace instead of stack', code: 'GEngine->AddOnScreenDebugMessage(1, 0.f, FColor::Green,\n    TEXT("Speed: ") + FString::SanitizeFloat(Speed));', text: 'Same positive key replaces the previous message; duration 0 suits per-frame updates.' },
          { label: 'PrintString', code: 'UKismetSystemLibrary::PrintString(this, TEXT("Hit!"), true, true,\n    FLinearColor::Red, 2.f);', text: 'Same as the Blueprint node: screen and log.' },
          { label: 'Hide them all', code: 'DisableAllScreenMessages', lang: 'text', text: 'Console command; `EnableAllScreenMessages` turns them back on.' },
          { label: 'Development builds only', code: '#if !UE_BUILD_SHIPPING\nGEngine->AddOnScreenDebugMessage(-1, 2.f, FColor::Red, Msg);\n#endif' },
          { label: 'Screen vs log', text: '`AddOnScreenDebugMessage` only draws on screen; pair it with `UE_LOG` when you need a record in the log file.' },
        ],
      },
      {
        title: 'Debug drawing',
        items: [
          { label: 'Include', code: '#include "DrawDebugHelpers.h"' },
          { label: 'Line', code: 'DrawDebugLine(GetWorld(), Start, End, FColor::Red, false, 2.f, 0, 1.f);', text: 'Args: persistent?, lifetime (s), depth priority, thickness.' },
          { label: 'Sphere', code: 'DrawDebugSphere(GetWorld(), Center, Radius, 16,\n    FColor::Green, false, 2.f);', text: '16 is the number of segments.' },
          { label: 'Box', code: 'DrawDebugBox(GetWorld(), Center, Extent, FColor::Blue, false, 2.f);' },
          { label: 'Point', code: 'DrawDebugPoint(GetWorld(), Location, 12.f, FColor::Yellow, false, 2.f);' },
          { label: 'Arrow', code: 'DrawDebugDirectionalArrow(GetWorld(), Start, End, 40.f,\n    FColor::Cyan, false, 2.f);' },
          { label: 'Capsule', code: 'DrawDebugCapsule(GetWorld(), Center, HalfHeight, Radius,\n    FQuat::Identity, FColor::White, false, 2.f);' },
          { label: 'Text in the world', code: 'DrawDebugString(GetWorld(), Location, TEXT("Alert!"), nullptr,\n    FColor::White, 2.f);' },
          { label: 'Clear persistent lines', code: 'FlushPersistentDebugLines(GetWorld());' },
          { label: 'Shipping builds', text: 'All DrawDebug calls compile to nothing in Shipping (`ENABLE_DRAW_DEBUG` is 0).' },
        ],
      },
      {
        title: 'Assertions',
        items: [
          { label: 'check / checkf', code: 'check(Index >= 0);\ncheckf(Owner, TEXT("%s has no owner"), *GetName());', text: 'Crash if false. Removed in Shipping: no side effects inside!' },
          { label: 'verify / verifyf', code: 'verify(Subsystem->Init());', text: 'Expression always runs; result checked only when checks are enabled.' },
          { label: 'ensure', code: 'if (!ensure(Weapon)) { return; }', text: 'Logs a callstack once, keeps running, returns the condition.' },
          { label: 'ensureMsgf / ensureAlways', code: 'ensureMsgf(Ammo >= 0, TEXT("Ammo went negative: %d"), Ammo);\nensureAlways(bInitialised);   // reports every time' },
          { label: 'Unreachable code', code: 'checkNoEntry();' },
          { label: 'Debug-build only', code: 'checkSlow(IsInvariantOk());' },
        ],
      },
      {
        title: 'Console commands',
        items: [
          { label: 'Frame rate and timing', code: 'stat fps\nstat unit\nstat game', lang: 'text' },
          { label: 'Gameplay debug info', code: 'showdebug\nshowdebug animation', lang: 'text' },
          { label: 'Show collision shapes', code: 'show collision', lang: 'text' },
          { label: 'Slow motion and pause', code: 'slomo 0.25\npause', lang: 'text' },
          { label: 'Limit frame rate', code: 't.MaxFPS 30', lang: 'text' },
          { label: 'Change log verbosity', code: 'log LogInventory Verbose', lang: 'text' },
          { label: 'Your own command', code: 'UFUNCTION(Exec)\nvoid GiveGold(int32 Amount);   // type: GiveGold 500' },
          { label: 'Your own variable', code: 'static TAutoConsoleVariable<int32> CVarShowAI(\n    TEXT("MyGame.ShowAI"), 0, TEXT("Draw AI debug info"));\n// read: CVarShowAI.GetValueOnGameThread()' },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ Delegates
  {
    id: 'ue-delegates',
    title: 'Delegates',
    course: 'unreal',
    icon: '📣',
    description:
      'Declaration macros, binding functions for each delegate family, and the signatures of common engine events.',
    sections: [
      {
        title: 'Declaration macros',
        items: [
          { label: 'Single-cast', code: 'DECLARE_DELEGATE(FOnReady);\nDECLARE_DELEGATE_OneParam(FOnAmmoChanged, int32);\nDECLARE_DELEGATE_TwoParams(FOnHit, AActor*, float);' },
          { label: 'With return value', code: 'DECLARE_DELEGATE_RetVal_OneParam(bool, FCanUse, AActor*);' },
          { label: 'Multicast', code: 'DECLARE_MULTICAST_DELEGATE_OneParam(FOnScoreChanged, int32);' },
          { label: 'Dynamic (single)', code: 'DECLARE_DYNAMIC_DELEGATE_OneParam(FOnDone, bool, bSuccess);', text: 'Dynamic macros list type **and** name for each parameter.' },
          { label: 'Dynamic multicast', code: 'DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(\n    FOnHealthChanged, float, NewHealth, float, Delta);' },
          { label: 'Template aliases (UE5)', code: 'using FOnAmmo = TDelegate<void(int32)>;\nusing FOnScore = TMulticastDelegate<void(int32)>;', text: 'Native delegates without the macros.' },
          { label: 'Where to declare', text: 'At file scope, after the includes and before the `UCLASS` that uses them. Macros exist for up to nine parameters.' },
        ],
      },
      {
        title: 'Binding single-cast delegates',
        items: [
          { label: 'Member of a UObject', code: 'OnAmmo.BindUObject(this, &AHud::HandleAmmo);', text: 'Weak: will not call into a destroyed object.' },
          { label: 'Lambda', code: 'OnAmmo.BindLambda([](int32 Ammo) { /* ... */ });' },
          { label: 'Lambda tied to an object', code: 'OnAmmo.BindWeakLambda(this, [this](int32 Ammo) {\n    Refresh(Ammo); });', text: 'Skipped automatically if `this` is destroyed.' },
          { label: 'Shared-pointer object', code: 'OnAmmo.BindSP(SharedThing, &FThing::HandleAmmo);' },
          { label: 'Static function', code: 'OnAmmo.BindStatic(&LogAmmo);' },
          { label: 'UFUNCTION by name', code: 'OnAmmo.BindUFunction(this, FName("HandleAmmo"));' },
          { label: 'Call', code: 'OnAmmo.ExecuteIfBound(30);\nif (CanUse.IsBound()) { bool bOk = CanUse.Execute(Target); }', text: '`Execute` on an unbound delegate asserts.' },
          { label: 'Unbind', code: 'OnAmmo.Unbind();' },
        ],
      },
      {
        title: 'Multicast delegates',
        items: [
          { label: 'Subscribe', code: 'FDelegateHandle H = OnScore.AddUObject(this, &AHud::Refresh);' },
          { label: 'Lambda', code: 'OnScore.AddLambda([](int32 S) { /* ... */ });\nOnScore.AddWeakLambda(this, [this](int32 S) { Refresh(S); });' },
          { label: 'Broadcast', code: 'OnScore.Broadcast(NewScore);', text: 'Safe with zero listeners. Call order is not guaranteed.' },
          { label: 'Unsubscribe', code: 'OnScore.Remove(H);\nOnScore.RemoveAll(this);' },
          { label: 'Anyone listening?', code: 'if (OnScore.IsBound()) { }' },
          { label: 'Member declaration', code: 'FOnScoreChanged OnScore;   // public member of the broadcaster' },
          { label: 'Unsubscribe in EndPlay', code: 'void AHud::EndPlay(const EEndPlayReason::Type Reason) {\n    if (IsValid(Tracker)) { Tracker->OnScore.RemoveAll(this); }\n    Super::EndPlay(Reason);\n}' },
        ],
      },
      {
        title: 'Dynamic delegates',
        items: [
          { label: 'Expose to Blueprint', code: 'UPROPERTY(BlueprintAssignable, Category = "Events")\nFOnHealthChanged OnHealthChanged;' },
          { label: 'Handler (must be UFUNCTION)', code: 'UFUNCTION()\nvoid HandleHealthChanged(float NewHealth, float Delta);' },
          { label: 'Bind', code: 'Health->OnHealthChanged.AddDynamic(\n    this, &AHud::HandleHealthChanged);', text: 'Bind in `BeginPlay`, not the constructor.' },
          { label: 'Bind once', code: 'Health->OnHealthChanged.AddUniqueDynamic(\n    this, &AHud::HandleHealthChanged);' },
          { label: 'Unbind', code: 'Health->OnHealthChanged.RemoveDynamic(\n    this, &AHud::HandleHealthChanged);' },
          { label: 'Single dynamic', code: 'OnDone.BindDynamic(this, &AMyActor::HandleDone);' },
          { label: 'Broadcast', code: 'OnHealthChanged.Broadcast(Health, -Damage);' },
        ],
      },
      {
        title: 'Engine event signatures',
        items: [
          { label: 'OnComponentBeginOverlap', code: 'void OnBeginOverlap(UPrimitiveComponent* OverlappedComp,\n    AActor* OtherActor, UPrimitiveComponent* OtherComp,\n    int32 OtherBodyIndex, bool bFromSweep,\n    const FHitResult& SweepResult);' },
          { label: 'OnComponentEndOverlap', code: 'void OnEndOverlap(UPrimitiveComponent* OverlappedComp,\n    AActor* OtherActor, UPrimitiveComponent* OtherComp,\n    int32 OtherBodyIndex);' },
          { label: 'OnComponentHit', code: 'void OnHit(UPrimitiveComponent* HitComp, AActor* OtherActor,\n    UPrimitiveComponent* OtherComp, FVector NormalImpulse,\n    const FHitResult& Hit);' },
          { label: 'OnTakeAnyDamage', code: 'void OnDamaged(AActor* DamagedActor, float Damage,\n    const UDamageType* DamageType, AController* InstigatedBy,\n    AActor* DamageCauser);' },
          { label: 'OnDestroyed', code: 'void OnEnemyDestroyed(AActor* DestroyedActor);' },
          { label: 'UButton::OnClicked', code: 'void OnPlayClicked();   // no parameters' },
          { label: 'Reminder', text: 'Every handler above must be declared `UFUNCTION()` because these are dynamic delegates.' },
        ],
      },
    ],
  },

  // ------------------------------------------------------------- Enhanced Input
  {
    id: 'ue-enhanced-input',
    title: 'Enhanced Input',
    course: 'unreal',
    icon: '🎮',
    description:
      'From Build.cs to bound handlers: the complete UE5 Enhanced Input setup in C++.',
    sections: [
      {
        title: 'Setup',
        items: [
          { label: 'Build.cs dependency', code: 'PublicDependencyModuleNames.AddRange(new string[] {\n    "Core", "CoreUObject", "Engine", "InputCore",\n    "EnhancedInput" });', lang: 'csharp' },
          { label: 'Includes (.cpp)', code: '#include "EnhancedInputComponent.h"\n#include "EnhancedInputSubsystems.h"\n#include "InputActionValue.h"' },
          {
            label: 'Header members',
            code: `class UInputAction;
class UInputMappingContext;
struct FInputActionValue;

UPROPERTY(EditDefaultsOnly, Category = "Input")
TObjectPtr<UInputMappingContext> DefaultContext;
UPROPERTY(EditDefaultsOnly, Category = "Input")
TObjectPtr<UInputAction> MoveAction;`,
          },
          { label: 'Assets', text: 'Create `IA_Move` (Axis2D), `IA_Jump` (bool) and an `IMC_Default` that maps keys to them, then assign them in your Blueprint subclass.' },
          { label: 'Project settings', text: 'Default Player Input Class `EnhancedPlayerInput` and Default Input Component Class `EnhancedInputComponent`, the defaults since UE 5.1.' },
          { label: 'Asset naming', text: 'Convention: `IA_` for Input Actions and `IMC_` for mapping contexts, e.g. `IA_Jump`, `IMC_Default`.' },
          { label: 'Debug display', code: 'showdebug enhancedinput', lang: 'text', text: 'Console command listing active contexts and live action values.' },
        ],
      },
      {
        title: 'Add a mapping context',
        items: [
          {
            label: 'In a character',
            code: `void AHero::NotifyControllerChanged() {
    Super::NotifyControllerChanged();
    auto* PC = Cast<APlayerController>(GetController());
    if (!PC) { return; }
    if (auto* Sub = ULocalPlayer::GetSubsystem<
            UEnhancedInputLocalPlayerSubsystem>(
                PC->GetLocalPlayer())) {
        Sub->AddMappingContext(DefaultContext, 0);
    }
}`,
          },
          {
            label: 'In a player controller',
            code: `void AMyPC::BeginPlay() {
    Super::BeginPlay();
    if (auto* Sub = ULocalPlayer::GetSubsystem<
            UEnhancedInputLocalPlayerSubsystem>(GetLocalPlayer())) {
        Sub->AddMappingContext(DefaultContext, 0);
    }
}`,
          },
          { label: 'Swap contexts', code: 'Sub->RemoveMappingContext(OnFootContext);\nSub->AddMappingContext(VehicleContext, 1);', text: 'Higher priority wins when two contexts map the same key.' },
          { label: 'Remove everything', code: 'Sub->ClearAllMappings();' },
          { label: 'Is it active?', code: 'if (Sub->HasMappingContext(MenuContext)) { }' },
          { label: 'Why the static GetSubsystem', text: '`ULocalPlayer::GetSubsystem<T>(LocalPlayer)` returns `nullptr` when there is no local player (remote players on a server) instead of crashing.' },
        ],
      },
      {
        title: 'Bind actions',
        items: [
          {
            label: 'In a pawn or character',
            code: `void AHero::SetupPlayerInputComponent(UInputComponent* PIC) {
    Super::SetupPlayerInputComponent(PIC);
    auto* EIC = CastChecked<UEnhancedInputComponent>(PIC);
    EIC->BindAction(MoveAction, ETriggerEvent::Triggered,
        this, &AHero::Move);
    EIC->BindAction(LookAction, ETriggerEvent::Triggered,
        this, &AHero::Look);
}`,
          },
          { label: 'Jump (press / release)', code: 'EIC->BindAction(JumpAction, ETriggerEvent::Started,\n    this, &ACharacter::Jump);\nEIC->BindAction(JumpAction, ETriggerEvent::Completed,\n    this, &ACharacter::StopJumping);' },
          { label: 'Hold to sprint', code: 'EIC->BindAction(SprintAction, ETriggerEvent::Started,\n    this, &AHero::StartSprint);\nEIC->BindAction(SprintAction, ETriggerEvent::Completed,\n    this, &AHero::StopSprint);' },
          {
            label: 'In a player controller',
            code: `void AMyPC::SetupInputComponent() {
    Super::SetupInputComponent();
    auto* EIC = CastChecked<UEnhancedInputComponent>(InputComponent);
    EIC->BindAction(PauseAction, ETriggerEvent::Started,
        this, &AMyPC::TogglePause);
}`,
          },
          {
            label: 'Hold to charge',
            code: `EIC->BindAction(ChargeAction, ETriggerEvent::Ongoing,
    this, &AHero::Charging);
EIC->BindAction(ChargeAction, ETriggerEvent::Triggered,
    this, &AHero::ReleaseCharge);`,
            text: 'With a Hold trigger on the mapping: `Ongoing` while held, `Triggered` once the hold time is reached.',
          },
          { label: 'Where to bind', text: 'Pawn-specific actions (move, jump) bind in the pawn. Actions that must work with any pawn, or none (pause, menus), bind in the PlayerController.' },
        ],
      },
      {
        title: 'Handlers and values',
        items: [
          { label: 'No parameters', code: 'void StartSprint();' },
          { label: 'With value', code: 'void Move(const FInputActionValue& Value);' },
          { label: 'With timing info', code: 'void Charge(const FInputActionInstance& Instance);\n// Instance.GetElapsedTime(), Instance.GetValue()' },
          { label: 'Read the value', code: 'bool B       = Value.Get<bool>();\nfloat F      = Value.Get<float>();       // Axis1D\nFVector2D V2 = Value.Get<FVector2D>();   // Axis2D\nFVector V3   = Value.Get<FVector>();     // Axis3D' },
          {
            label: 'Move (relative to camera yaw)',
            code: `void AHero::Move(const FInputActionValue& Value) {
    const FVector2D Axis = Value.Get<FVector2D>();
    const FRotator Yaw(0.f, GetControlRotation().Yaw, 0.f);
    const FRotationMatrix M(Yaw);
    AddMovementInput(M.GetUnitAxis(EAxis::X), Axis.Y);
    AddMovementInput(M.GetUnitAxis(EAxis::Y), Axis.X);
}`,
          },
          {
            label: 'Look',
            code: `void AHero::Look(const FInputActionValue& Value) {
    const FVector2D Axis = Value.Get<FVector2D>();
    AddControllerYawInput(Axis.X);
    AddControllerPitchInput(Axis.Y);
}`,
          },
          { label: 'ETriggerEvent', code: 'Started  Triggered  Ongoing  Completed  Canceled', lang: 'text', text: '`Triggered` fires every frame while active; `Started`/`Completed` once at the edges.' },
          { label: 'Invert or dead-zone', text: 'Use modifiers (Negate, Dead Zone, Swizzle Input Axis Values) on the mapping in the context asset, not code.' },
        ],
      },
    ],
  },

  // --------------------------------------------------------- Collision & traces
  {
    id: 'ue-collision-traces',
    title: 'Collision & Traces',
    course: 'unreal',
    icon: '💥',
    description:
      'Configure collision on components, run line traces, sweeps and overlap queries, and handle collision events.',
    sections: [
      {
        title: 'Component collision setup',
        items: [
          { label: 'Preset', code: 'Mesh->SetCollisionProfileName(TEXT("BlockAllDynamic"));' },
          { label: 'Enabled mode', code: 'Box->SetCollisionEnabled(ECollisionEnabled::QueryOnly);', text: '`NoCollision`, `QueryOnly`, `PhysicsOnly`, `QueryAndPhysics`.' },
          { label: 'Object type', code: 'Box->SetCollisionObjectType(ECC_WorldDynamic);' },
          { label: 'Responses', code: 'Box->SetCollisionResponseToAllChannels(ECR_Ignore);\nBox->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);' },
          { label: 'Overlap events', code: 'Box->SetGenerateOverlapEvents(true);', text: 'Needed on **both** components.' },
          { label: 'Physics hit events', code: 'Mesh->SetNotifyRigidBodyCollision(true);', text: '"Simulation Generates Hit Events".' },
          { label: 'Custom channel', code: '// Project Settings -> Collision -> New Trace Channel\n#define ECC_Interact ECC_GameTraceChannel1' },
          { label: 'The response rule', text: 'Ignore beats Overlap beats Block: two objects only block if **both** block each other.' },
        ],
      },
      {
        title: 'Line traces',
        items: [
          {
            label: 'Single, by channel',
            code: `FHitResult Hit;
FCollisionQueryParams Params;
Params.AddIgnoredActor(this);
const bool bHit = GetWorld()->LineTraceSingleByChannel(
    Hit, Start, End, ECC_Visibility, Params);`,
          },
          {
            label: 'From the player view',
            code: `FVector EyeLoc;
FRotator EyeRot;
PC->GetPlayerViewPoint(EyeLoc, EyeRot);
const FVector End = EyeLoc + EyeRot.Vector() * 3000.f;`,
          },
          { label: 'Multi', code: 'TArray<FHitResult> Hits;\nGetWorld()->LineTraceMultiByChannel(Hits, Start, End,\n    ECC_Visibility, Params);', text: 'Overlapping hits up to and including the first blocking hit.' },
          {
            label: 'By object type',
            code: `FCollisionObjectQueryParams ObjParams;
ObjParams.AddObjectTypesToQuery(ECC_Pawn);
ObjParams.AddObjectTypesToQuery(ECC_PhysicsBody);
GetWorld()->LineTraceSingleByObjectType(Hit, Start, End, ObjParams);`,
          },
          { label: 'By profile', code: 'GetWorld()->LineTraceSingleByProfile(Hit, Start, End,\n    TEXT("BlockAll"), Params);' },
          { label: 'Per-triangle + material', code: 'Params.bTraceComplex = true;\nParams.bReturnPhysicalMaterial = true;' },
          { label: 'Visualise', code: 'DrawDebugLine(GetWorld(), Start, bHit ? Hit.ImpactPoint : End,\n    bHit ? FColor::Red : FColor::Green, false, 1.f);' },
        ],
      },
      {
        title: 'Sweeps and overlap queries',
        items: [
          { label: 'Sweep a sphere', code: 'GetWorld()->SweepSingleByChannel(Hit, Start, End,\n    FQuat::Identity, ECC_Pawn,\n    FCollisionShape::MakeSphere(40.f), Params);' },
          { label: 'Shapes', code: 'FCollisionShape::MakeSphere(Radius)\nFCollisionShape::MakeBox(FVector(50.f, 50.f, 10.f)) // half extents\nFCollisionShape::MakeCapsule(Radius, HalfHeight)' },
          {
            label: 'What is in this area?',
            code: `TArray<FOverlapResult> Overlaps;
GetWorld()->OverlapMultiByChannel(Overlaps, Center,
    FQuat::Identity, ECC_Pawn,
    FCollisionShape::MakeSphere(500.f));
for (const FOverlapResult& O : Overlaps) {
    AActor* A = O.GetActor();
}`,
          },
          { label: 'Swept movement', code: 'FHitResult Hit;\nSetActorLocation(NewLocation, true, &Hit);   // stops at blocks' },
          { label: 'Current overlaps of a component', code: 'TArray<AActor*> Inside;\nTrigger->GetOverlappingActors(Inside, AEnemy::StaticClass());' },
          { label: 'Quick test', code: 'if (Trigger->IsOverlappingActor(PlayerPawn)) { }' },
        ],
      },
      {
        title: 'Collision events',
        items: [
          { label: 'Bind (BeginPlay)', code: 'Trigger->OnComponentBeginOverlap.AddDynamic(this, &AZone::OnEnter);\nTrigger->OnComponentEndOverlap.AddDynamic(this, &AZone::OnExit);\nMesh->OnComponentHit.AddDynamic(this, &AZone::OnHit);' },
          { label: 'Begin overlap handler', code: 'UFUNCTION()\nvoid OnEnter(UPrimitiveComponent* Comp, AActor* Other,\n    UPrimitiveComponent* OtherComp, int32 BodyIndex,\n    bool bFromSweep, const FHitResult& Sweep);' },
          { label: 'End overlap handler', code: 'UFUNCTION()\nvoid OnExit(UPrimitiveComponent* Comp, AActor* Other,\n    UPrimitiveComponent* OtherComp, int32 BodyIndex);' },
          { label: 'Hit handler', code: 'UFUNCTION()\nvoid OnHit(UPrimitiveComponent* HitComp, AActor* Other,\n    UPrimitiveComponent* OtherComp, FVector NormalImpulse,\n    const FHitResult& Hit);' },
          { label: 'Actor-level overrides', code: 'virtual void NotifyActorBeginOverlap(AActor* Other) override;\nvirtual void NotifyActorEndOverlap(AActor* Other) override;', text: 'No binding needed; fires for any of the actor\'s components.' },
          { label: 'Ignore yourself', code: 'if (Other == this || Other == GetOwner()) { return; }' },
        ],
      },
      {
        title: 'FHitResult fields',
        items: [
          { label: 'What was hit', code: 'Hit.GetActor()   Hit.GetComponent()   Hit.BoneName' },
          { label: 'Where on the surface', code: 'Hit.ImpactPoint   Hit.ImpactNormal' },
          { label: 'Where the shape stopped', code: 'Hit.Location   Hit.Normal', text: 'Equal to the impact values for line traces; differ for sweeps.' },
          { label: 'How far', code: 'Hit.Distance   Hit.Time   // Time: 0..1 along the trace' },
          { label: 'Flags', code: 'Hit.bBlockingHit   Hit.bStartPenetrating' },
          { label: 'Surface material', code: 'UPhysicalMaterial* Mat = Hit.PhysMaterial.Get();', text: 'Requires `bReturnPhysicalMaterial` in the query params.' },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------- Networking
  {
    id: 'ue-networking',
    title: 'Networking',
    course: 'unreal',
    icon: '🌐',
    description:
      'Replicated properties, RepNotify, RPC declarations and the checks that tell you where your code is running.',
    sections: [
      {
        title: 'Replication setup',
        items: [
          { label: 'Replicate the actor', code: 'AMyActor::AMyActor() {\n    bReplicates = true;\n    SetReplicateMovement(true);   // sync the transform\n}' },
          { label: 'Replicate a component', code: 'UHealthComponent::UHealthComponent() {\n    SetIsReplicatedByDefault(true);\n}' },
          { label: 'Include', code: '#include "Net/UnrealNetwork.h"   // DOREPLIFETIME' },
          { label: 'Property', code: 'UPROPERTY(Replicated)\nint32 Ammo = 30;' },
          { label: 'Declare the override', code: 'virtual void GetLifetimeReplicatedProps(\n    TArray<FLifetimeProperty>& OutLifetimeProps) const override;' },
          {
            label: 'Register properties',
            code: `void AHero::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const {
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    DOREPLIFETIME(AHero, Ammo);
    DOREPLIFETIME_CONDITION(AHero, Stamina, COND_OwnerOnly);
}`,
          },
          { label: 'Direction', text: 'Properties replicate **server → client** only. Change them on the server.' },
        ],
      },
      {
        title: 'Conditions and RepNotify',
        items: [
          { label: 'Common conditions', code: 'COND_None  COND_OwnerOnly  COND_SkipOwner\nCOND_InitialOnly  COND_SimulatedOnly  COND_AutonomousOnly', lang: 'text' },
          { label: 'What the conditions mean', text: '`COND_OwnerOnly`: only the owning client (ammo, private stats). `COND_SkipOwner`: everyone but the owner, who already predicted it. `COND_InitialOnly`: sent once, when the actor first replicates.' },
          { label: 'RepNotify property', code: 'UPROPERTY(ReplicatedUsing = OnRep_Health)\nfloat Health = 100.f;' },
          { label: 'RepNotify function', code: 'UFUNCTION()\nvoid OnRep_Health(float OldHealth);   // param optional' },
          { label: 'Notify on every update', code: 'DOREPLIFETIME_CONDITION_NOTIFY(AHero, Health,\n    COND_None, REPNOTIFY_Always);', text: 'Default is `REPNOTIFY_OnChanged`.' },
          {
            label: 'Server must call it itself',
            code: `void AHero::SetHealth(float NewHealth) {   // on server
    const float Old = Health;
    Health = NewHealth;
    OnRep_Health(Old);   // C++ OnReps don't fire on the server
}`,
          },
        ],
      },
      {
        title: 'RPCs',
        items: [
          { label: 'Server RPC', code: 'UFUNCTION(Server, Reliable)\nvoid ServerFire(FVector_NetQuantize Target);' },
          { label: 'Implement', code: 'void AHero::ServerFire_Implementation(\n    FVector_NetQuantize Target) { /* on server */ }' },
          { label: 'Validate', code: 'UFUNCTION(Server, Reliable, WithValidation)\nvoid ServerBuy(int32 ItemId);\nbool AHero::ServerBuy_Validate(int32 ItemId) { return ItemId >= 0; }' },
          { label: 'Client RPC', code: 'UFUNCTION(Client, Reliable)\nvoid ClientShowMessage(const FText& Message);' },
          { label: 'Multicast RPC', code: 'UFUNCTION(NetMulticast, Unreliable)\nvoid MulticastPlayFX(FVector Location);', text: 'Call on the server; runs on the server and all relevant clients.' },
          { label: 'Call pattern', code: 'void AHero::Fire() {\n    PlayMuzzleFlash();   // local feedback right away\n    ServerFire(GetAimPoint());\n}', text: 'Called on the server, a Server RPC simply runs locally.' },
          { label: 'Ownership rule', text: 'Server RPCs only work on actors the calling client **owns** (its PlayerController, possessed pawn, or actors owned by them). Others are dropped.' },
        ],
      },
      {
        title: 'Where am I running?',
        items: [
          { label: 'Authority', code: 'if (HasAuthority()) { /* server copy */ }' },
          { label: 'My pawn?', code: 'if (IsLocallyControlled()) { /* this machine controls it */ }' },
          { label: 'Local controller?', code: 'if (PC->IsLocalController()) { }' },
          { label: 'Roles', code: 'GetLocalRole() == ROLE_Authority\nGetLocalRole() == ROLE_AutonomousProxy   // my pawn on my client\nGetLocalRole() == ROLE_SimulatedProxy    // other players' },
          { label: 'Net mode', code: 'if (GetNetMode() == NM_ListenServer) { }\n// NM_Standalone, NM_DedicatedServer, NM_ListenServer, NM_Client' },
          { label: 'Skip cosmetics on servers', code: 'if (GetNetMode() != NM_DedicatedServer) { SpawnFX(); }' },
          { label: 'Give a client ownership', code: 'Weapon->SetOwner(OwningPawn);   // on the server', text: 'Lets that client call Server RPCs on the weapon.' },
        ],
      },
    ],
  },

  // ----------------------------------------------------- Timers & gameplay statics
  {
    id: 'ue-timers-statics',
    title: 'Timers & Gameplay Statics',
    course: 'unreal',
    icon: '⏱️',
    description:
      'The Timer Manager, the UGameplayStatics helpers you reach for daily, and how to read game time.',
    sections: [
      {
        title: 'Timer Manager',
        items: [
          { label: 'Member handle', code: 'FTimerHandle FireTimer;   // in the header' },
          { label: 'Looping', code: 'GetWorldTimerManager().SetTimer(FireTimer, this,\n    &ATurret::Fire, 0.5f, true);' },
          { label: 'One-shot', code: 'GetWorldTimerManager().SetTimer(RespawnTimer, this,\n    &AHero::Respawn, 3.f, false);' },
          { label: 'Custom first delay', code: 'GetWorldTimerManager().SetTimer(WaveTimer, this,\n    &ASpawner::SpawnWave, 30.f, true, 5.f);   // first after 5 s' },
          {
            label: 'Weak lambda',
            code: `GetWorldTimerManager().SetTimer(FuseTimer,
    FTimerDelegate::CreateWeakLambda(this, [this]() {
        Explode();
    }), 2.f, false);`,
            text: 'Skipped automatically if `this` is destroyed first.',
          },
          { label: 'With arguments', code: 'FTimerDelegate D = FTimerDelegate::CreateUObject(\n    this, &AHero::Heal, 10.f);\nGetWorldTimerManager().SetTimer(HealTimer, D, 1.f, true);' },
          { label: 'Next frame', code: 'GetWorldTimerManager().SetTimerForNextTick(this, &AHero::LateInit);' },
          { label: 'Clear', code: 'GetWorldTimerManager().ClearTimer(FireTimer);\nGetWorldTimerManager().ClearAllTimersForObject(this);' },
          { label: 'Pause', code: 'GetWorldTimerManager().PauseTimer(FireTimer);\nGetWorldTimerManager().UnPauseTimer(FireTimer);' },
          { label: 'Query', code: 'IsTimerActive(H)   GetTimerRemaining(H)   GetTimerElapsed(H)' },
        ],
      },
      {
        title: 'UGameplayStatics',
        items: [
          { label: 'Include', code: '#include "Kismet/GameplayStatics.h"' },
          { label: 'Player objects', code: 'UGameplayStatics::GetPlayerController(this, 0)\nUGameplayStatics::GetPlayerPawn(this, 0)\nUGameplayStatics::GetPlayerCharacter(this, 0)' },
          { label: 'Framework objects', code: 'UGameplayStatics::GetGameMode(this)    // server only\nUGameplayStatics::GetGameState(this)\nUGameplayStatics::GetGameInstance(this)' },
          { label: 'Change map', code: 'UGameplayStatics::OpenLevel(this, FName(TEXT("Arena")));' },
          { label: 'Pause and slow motion', code: 'UGameplayStatics::SetGamePaused(this, true);\nUGameplayStatics::SetGlobalTimeDilation(this, 0.3f);' },
          { label: 'Sound', code: 'UGameplayStatics::PlaySoundAtLocation(this, HitSound, Location);\nUGameplayStatics::PlaySound2D(this, UiClick);' },
          { label: 'Niagara effect', code: 'UNiagaraFunctionLibrary::SpawnSystemAtLocation(this, ImpactFX,\n    Location, Rotation);', text: 'Needs `"Niagara"` in Build.cs and `NiagaraFunctionLibrary.h`.' },
          { label: 'Damage', code: 'UGameplayStatics::ApplyDamage(Victim, 25.f,\n    GetInstigatorController(), this, UDamageType::StaticClass());' },
          { label: 'Find actors (slow)', code: 'TArray<AActor*> Found;\nUGameplayStatics::GetAllActorsOfClass(this,\n    AEnemy::StaticClass(), Found);', text: 'Fine at startup; avoid every frame.' },
          {
            label: 'Save and load',
            code: `auto* Save = Cast<UMySaveGame>(UGameplayStatics::
    CreateSaveGameObject(UMySaveGame::StaticClass()));
Save->Coins = Coins;
UGameplayStatics::SaveGameToSlot(Save, TEXT("Slot0"), 0);
auto* Loaded = Cast<UMySaveGame>(
    UGameplayStatics::LoadGameFromSlot(TEXT("Slot0"), 0));`,
          },
        ],
      },
      {
        title: 'World and time',
        items: [
          { label: 'Game time', code: 'double T = GetWorld()->GetTimeSeconds();', text: 'Stops when paused; scaled by time dilation.' },
          { label: 'Real time', code: 'double R = GetWorld()->GetRealTimeSeconds();', text: 'Ignores pause and dilation.' },
          { label: 'Frame delta', code: 'float Dt = GetWorld()->GetDeltaSeconds();' },
          { label: 'Per-actor slow motion', code: 'CustomTimeDilation = 0.2f;   // this actor only' },
          { label: 'Wall clock for profiling', code: 'const double Start = FPlatformTime::Seconds();\n// ... work ...\nconst double Ms = (FPlatformTime::Seconds() - Start) * 1000.0;' },
          { label: 'Calendar time', code: 'FDateTime Now = FDateTime::Now();\nFString Stamp = Now.ToString();' },
          { label: 'First local player', code: 'APlayerController* PC = GetWorld()->GetFirstPlayerController();' },
        ],
      },
    ],
  },
];
