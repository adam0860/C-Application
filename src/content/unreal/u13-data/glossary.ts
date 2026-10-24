import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'primary-asset-id',
    term: 'FPrimaryAssetId',
    aliases: ['Primary Asset ID', 'Primary Asset Type'],
    course: 'unreal',
    category: 'Assets',
    short:
      'A short, path-independent identifier for a primary asset, made of a *type* and a *name* and printed as `Type:Name` (for example `Weapon:DA_Rifle`).',
    long:
      'The [[asset-manager]] finds, loads and unloads primary assets by their `FPrimaryAssetId`. An object reports its ID through the virtual `UObject::GetPrimaryAssetId()`; `UPrimaryDataAsset` implements it by default using the class name as the type and the asset name as the name.\n\nBecause the ID does not include the folder path, content can be reorganised without invalidating IDs stored in save games or server data, as long as names stay unique within a type. The type half on its own is an `FPrimaryAssetType`, which is what the Asset Manager\'s "Primary Asset Types to Scan" settings refer to.',
    example: `FPrimaryAssetId UWeaponData::GetPrimaryAssetId() const
{
    return FPrimaryAssetId(
        FPrimaryAssetType(TEXT("Weapon")), GetFName());
}`,
    exampleLang: 'cpp',
    see: ['primary-data-asset', 'asset-manager', 'data-asset'],
  },
  {
    id: 'table-row-base',
    term: 'FTableRowBase',
    aliases: ['Row Struct', 'Data Table Row'],
    course: 'unreal',
    category: 'Data',
    short:
      'The base struct for Data Table rows. A `USTRUCT` deriving from it defines the columns of a [[data-table]]: each `UPROPERTY` is one column.',
    long:
      'Because the row type is a reflected struct, the CSV/JSON importer can match column headers to property names at runtime and parse each cell into the right C++ type. Every row in one table uses the same row struct.\n\n`FTableRowBase` also provides virtual hooks such as `OnPostDataImport`, which runs per row after an import and can report data problems.',
    example: `USTRUCT(BlueprintType)
struct MYGAME_API FEnemyStatsRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    float MaxHealth = 100.f;
};`,
    exampleLang: 'cpp',
    see: ['data-table', 'ustruct', 'data-table-row-handle'],
  },
  {
    id: 'data-table-row-handle',
    term: 'FDataTableRowHandle',
    aliases: ['Row Handle'],
    course: 'unreal',
    category: 'Data',
    short:
      'A struct that stores a reference to a [[data-table]] plus a row name, shown in the editor as "pick a table, then pick a row" dropdowns.',
    long:
      'Call `GetRow<T>(ContextString)` to resolve the handle to a row pointer; it forwards to `UDataTable::FindRow<T>` and returns `nullptr` if the row no longer exists. Storing a name instead of row data or a raw pointer means the handle survives reimports and always reads the current values. `IsNull()` reports whether anything was chosen at all.',
    example: `UPROPERTY(EditAnywhere, Category = "Spawning")
FDataTableRowHandle EnemyRow;

// later
if (const FEnemyStatsRow* Row =
        EnemyRow.GetRow<FEnemyStatsRow>(TEXT("Spawn")))
{
    // use Row
}`,
    exampleLang: 'cpp',
    see: ['data-table', 'table-row-base', 'fname'],
  },
  {
    id: 'gameplay-tag-container',
    term: 'FGameplayTagContainer',
    aliases: ['Tag Container'],
    course: 'unreal',
    category: 'Gameplay',
    short:
      'A set of [[gameplay-tag|gameplay tags]] with hierarchical queries such as `HasTag`, `HasAny` and `HasAll`, plus `Exact` variants that ignore parent tags.',
    long:
      'Containers behave like sets (adding a tag twice has no effect) and cache the parent tags of everything they hold, so a hierarchical check is a short linear scan. `{Status.Debuff.Stun}.HasTag(Status.Debuff)` is `true` because the stun tag matches its parent; `HasTagExact(Status.Debuff)` is `false` because that exact tag was never added.\n\nEdge cases: `HasAny` with an empty argument returns `false`; `HasAll` with an empty argument returns `true`.',
    example: `UPROPERTY(VisibleInstanceOnly, Category = "Combat")
FGameplayTagContainer StatusTags;

StatusTags.AddTag(MyGameTags::Status_Debuff_Stun);
const bool bDebuffed =
    StatusTags.HasTag(MyGameTags::Status_Debuff); // true`,
    exampleLang: 'cpp',
    see: ['gameplay-tag', 'native-gameplay-tag'],
  },
  {
    id: 'native-gameplay-tag',
    term: 'Native Gameplay Tag',
    aliases: ['FNativeGameplayTag', 'UE_DEFINE_GAMEPLAY_TAG', 'UE_DECLARE_GAMEPLAY_TAG_EXTERN'],
    course: 'unreal',
    category: 'Gameplay',
    short:
      'A [[gameplay-tag]] defined in C++ with `UE_DEFINE_GAMEPLAY_TAG`, registered automatically when its module loads and referenced through a compiler-checked variable.',
    long:
      'Declare the tag in a header with `UE_DECLARE_GAMEPLAY_TAG_EXTERN(Name)` (an `extern FNativeGameplayTag`) and define it exactly once in a `.cpp` with `UE_DEFINE_GAMEPLAY_TAG(Name, "Tag.String")` or the `_COMMENT` variant. An `FNativeGameplayTag` converts implicitly to `FGameplayTag`.\n\nNative tags avoid scattering `FGameplayTag::RequestGameplayTag(FName("..."))` string lookups through the code, where typos only fail at runtime, and they cannot be used before the tag dictionary exists. They require the `GameplayTags` module dependency and `#include "NativeGameplayTags.h"`.',
    example: `// MyGameplayTags.h
MYGAME_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Status_Debuff_Stun);

// MyGameplayTags.cpp
UE_DEFINE_GAMEPLAY_TAG(Status_Debuff_Stun, "Status.Debuff.Stun");`,
    exampleLang: 'cpp',
    see: ['gameplay-tag', 'gameplay-tag-container', 'build-cs'],
  },
];
