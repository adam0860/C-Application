import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-data-tables',
  title: 'Data Tables and FTableRowBase',
  summary:
    'Store hundreds of uniform rows — enemy stats, loot, XP curves — in spreadsheet-friendly tables, import them from CSV or JSON, and look rows up safely from C++.',
  minutes: 17,
  objectives: [
    'Define a row struct that derives from `FTableRowBase` and explain why it must be a `USTRUCT`',
    'Create a Data Table by importing CSV or JSON, and keep it in sync by reimporting',
    'Look up rows with `FindRow<T>()`, iterate them with `GetAllRows<T>()` and `GetRowNames()`, and handle missing rows correctly',
    'Use `FDataTableRowHandle` so designers pick rows from a dropdown instead of typing names',
    'Decide between a Data Table and Data Assets for a given kind of data',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'When a spreadsheet beats a file per item',
      blocks: [
        {
          type: 'p',
          text: 'Data assets shine for a handful of rich definitions. Now picture 150 enemy variants, each with the same eight numbers, balanced by a designer who lives in a spreadsheet. Opening 150 separate assets to compare damage values would be miserable. What you want is **one grid**: a row per enemy, a column per stat.',
        },
        {
          type: 'p',
          text: 'That is a [[data-table]]: a single asset (`UDataTable`) holding many rows, where every row has the same C++ struct type and a unique **row name** ([[fname|FName]]). Designers edit it as a grid in the editor or in an external spreadsheet that they import as CSV or JSON.',
        },
        {
          type: 'compare',
          left: {
            title: 'Standard C++',
            tone: 'neutral',
            code: `std::unordered_map<std::string,
                   EnemyStats> Enemies;
// filled by hand, or by your own
// CSV parser`,
            text: 'You would write the parser, the validation and the editor tooling yourself.',
          },
          right: {
            title: 'Unreal Data Table',
            tone: 'good',
            code: `// UDataTable internally:
// TMap<FName, uint8*> RowMap;
// rows are FEnemyStatsRow structs,
// imported from CSV/JSON for you`,
            text: 'Import, grid editor, type checking, Blueprint access and reimport come built in.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why tables exist alongside data assets',
          text: 'Designers balance games in aggregate: "is the Brute too tanky *compared to* the Grunt?" A table puts every comparison on one screen, supports sorting and bulk edits in tools like Excel or Google Sheets, and turns a balance pass into "edit spreadsheet, reimport". The trade-off is rigidity: every row must have exactly the same shape.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A typed spreadsheet',
          text: 'The row struct is the spreadsheet\'s header row — it fixes the columns and their types. Each table row is one line of the sheet, and the row name is the value in its first column.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Defining the row struct',
      blocks: [
        {
          type: 'p',
          text: 'The columns of a table come from a [[ustruct|USTRUCT]] that derives from [[table-row-base|FTableRowBase]]. Each `UPROPERTY` becomes a column.',
        },
        {
          type: 'code',
          title: 'EnemyStatsRow.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "EnemyStatsRow.generated.h"

class USkeletalMesh;

USTRUCT(BlueprintType)
struct MYGAME_API FEnemyStatsRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Enemy")
    FText DisplayName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Enemy")
    float MaxHealth = 100.f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Enemy")
    float Damage = 10.f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Enemy")
    float MoveSpeed = 400.f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Enemy")
    int32 MinLevel = 1;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Enemy")
    TSoftObjectPtr<USkeletalMesh> Mesh;
};`,
          annotations: [
            { lines: 4, text: '`UDataTable`, `FTableRowBase` and `FDataTableRowHandle` all live in `Engine/DataTable.h`.' },
            { lines: 5, text: 'The [[generated-header]] comes last, as in every reflected header.' },
            { lines: 9, text: '`BlueprintType` lets Blueprints break the struct apart after a "Get Data Table Row" node.' },
            { lines: 10, text: 'Deriving from `FTableRowBase` is what makes this struct eligible as a row type. Unreal\'s `F` prefix marks it as a plain struct, not a `UObject`.' },
            { lines: 12, text: 'Structs use `GENERATED_BODY()` too. It adds the reflection hooks, such as `StaticStruct()`, that the table uses to check row types.' },
            { lines: '14-15', text: 'Each `UPROPERTY` is a column. The property *name* (`DisplayName`) is what the CSV/JSON importer matches column headers against.' },
            { lines: '17-18', text: 'Default member initializers become the value for any column missing from an import, and for new rows added in the editor.' },
            { lines: '29-30', text: 'Rows can hold asset references. A [[soft-reference]] is the right default here: a hard reference in every row would load every enemy\'s mesh as soon as the table loads.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why must the row be a USTRUCT?',
          text: 'The importer reads a header such as `MaxHealth` and has to find the matching field *by name at runtime*, then parse `"350"` into a `float`. Standard C++ has no way to look up a member by name — that information is gone after compilation. Unreal\'s [[reflection]] keeps it: UHT records every `UPROPERTY`\'s name, type and offset, which is exactly what the importer, the grid editor and Blueprints all use.',
        },
        {
          type: 'p',
          text: 'Supported column types include numbers, `bool`, `FName`/`FString`/`FText`, enums (written by name), nested structs, `TArray`s, and object or class references. A struct can have ordinary C++ helper functions, but not `UFUNCTION`s — another reason rich, behaviour-heavy definitions tend to be data assets instead.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'fill',
      prompt: 'Complete the row struct for a loot table.',
      template: `#include "Engine/DataTable.h"
#include "LootRow.generated.h"

___(BlueprintType)
struct MYGAME_API FLootRow : public ___
{
    ___()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int32 GoldValue = 0;
};`,
      blanks: [{ answers: ['USTRUCT'] }, { answers: ['FTableRowBase'] }, { answers: ['GENERATED_BODY'] }],
      wordBank: ['USTRUCT', 'FTableRowBase', 'GENERATED_BODY', 'UCLASS', 'UDataTable', 'UDataAsset', 'GENERATED_UCLASS_BODY'],
      explanation:
        'A row type is a reflected struct (`USTRUCT`, not `UCLASS` — rows are plain values, not garbage-collected objects) that derives from `FTableRowBase`. `UDataTable` is the *asset* that holds the rows, not a base for them. `GENERATED_BODY()` is used for both structs and classes; the old `GENERATED_UCLASS_BODY` macro is legacy and only ever applied to classes.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Creating the table: CSV and JSON import',
      blocks: [
        {
          type: 'p',
          text: 'You can create an empty table (Content Browser → **Miscellaneous → Data Table**, then pick `EnemyStatsRow`) and type rows into the grid editor. But the usual workflow starts from a spreadsheet exported as CSV:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Enemies.csv',
          code: `Name,DisplayName,MaxHealth,Damage,MoveSpeed,MinLevel,Mesh
Grunt,"Grunt",100,8,450,1,"/Game/Enemies/SK_Grunt.SK_Grunt"
Brute,"Brute",350,25,300,3,"/Game/Enemies/SK_Brute.SK_Brute"
Sniper,"Sniper",80,40,380,5,"/Game/Enemies/SK_Sniper.SK_Sniper"`,
          annotations: [
            { lines: 1, text: 'The header row. Every column after the first must match a `UPROPERTY` name in the row struct. The first column\'s header text is ignored (Unreal\'s own CSV export writes `---` there).' },
            { lines: 2, text: 'The **first column is the row name** (`Grunt`), stored as an `FName`. Row names must be unique within the table.' },
            { lines: 3, text: 'Numbers are parsed into the column\'s C++ type. Soft references are written as object paths: `/Game/Folder/Asset.Asset`.' },
          ],
        },
        {
          type: 'p',
          text: 'JSON works too. The file is an array of objects, and each object\'s `"Name"` field becomes the row name:',
        },
        {
          type: 'code',
          lang: 'json',
          title: 'Enemies.json',
          code: `[
    {
        "Name": "Grunt",
        "DisplayName": "Grunt",
        "MaxHealth": 100,
        "Damage": 8,
        "MoveSpeed": 450,
        "MinLevel": 1,
        "Mesh": "/Game/Enemies/SK_Grunt.SK_Grunt"
    },
    {
        "Name": "Brute",
        "DisplayName": "Brute",
        "MaxHealth": 350,
        "Damage": 25,
        "MoveSpeed": 300,
        "MinLevel": 3,
        "Mesh": "/Game/Enemies/SK_Brute.SK_Brute"
    }
]`,
          annotations: [
            { lines: 3, text: 'The row-name key. (A table\'s `ImportKeyField` setting can name a different field for either format.)' },
            { lines: '4-9', text: 'Other keys map to struct properties exactly like CSV columns. JSON also handles nested structs and arrays more readably than CSV.' },
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'Import', text: 'Drag `Enemies.csv` into the Content Browser (or use **Import**).' },
            { title: 'Choose the row type', text: 'In the import dialog, choose **DataTable** and pick `EnemyStatsRow` as the row structure.' },
            { title: 'Name it', text: 'Epic\'s convention is a `DT_` prefix: `DT_Enemies`. The asset remembers which file it came from.' },
            { title: 'Iterate', text: 'The designer edits the spreadsheet, re-exports the CSV, then right-clicks the asset → **Reimport**. Every row updates in place.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Pick one source of truth',
          text: 'Reimport replaces the table\'s contents with the file\'s contents. If someone tweaks values in the editor\'s grid and someone else later reimports the CSV, the grid edits silently vanish. Teams usually decide per table: *either* the external spreadsheet is the source of truth (and the grid is read-only by convention), *or* the asset is.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'mcq',
      prompt: 'A designer imports this CSV into a table whose row struct is `FEnemyStatsRow` (where `Damage` defaults to `10.f`). What happens?',
      code: `Name,MaxHealth,Damge,MoveSpeed
Grunt,100,8,450
Brute,350,25,300`,
      lang: 'text',
      options: [
        { text: 'The import fails and no table is created', why: 'Column mismatches are reported as import problems, but the import itself still goes ahead.' },
        { text: 'Unreal fuzzy-matches `Damge` to `Damage`, so the values import correctly', why: 'Columns are matched by property name; there is no spelling correction.' },
        { text: 'The rows import, the importer reports problems about `Damge` and the missing `Damage` column, and every row\'s `Damage` stays at `10`', correct: true, why: 'The unknown column is ignored, and any property without a column keeps the struct\'s default member initializer.' },
        { text: 'A new `Damge` property is added to the struct automatically', why: 'Importing never changes C++ types. Only a programmer can add a property, followed by a compile.' },
      ],
      explanation:
        'The importer walks the header row and looks up each name in the row struct\'s reflection data. `Damge` matches nothing, so that column is skipped with a warning; `Damage` never appears, so it is reported as missing and keeps its default. This is why import warnings matter — a balanced-looking table can silently contain default values. Read the import log after every reimport.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Looking up a row: FindRow',
      blocks: [
        {
          type: 'p',
          text: 'In C++, an actor holds a pointer to the table plus the name of the row it wants, and calls `FindRow<T>()`:',
        },
        {
          type: 'code',
          title: 'Enemy.h (excerpt)',
          code: `UPROPERTY(EditAnywhere, Category = "Enemy")
TObjectPtr<const UDataTable> StatsTable;

UPROPERTY(EditAnywhere, Category = "Enemy")
FName EnemyType = TEXT("Grunt");

float MaxHealth = 100.f;
float Health = 100.f;
float AttackDamage = 10.f;`,
          annotations: [
            { lines: 2, text: 'A pointer to a `const UDataTable`: lookups are `const`, and gameplay code should never modify a shared table.' },
            { lines: 5, text: 'The row to use. A typed-in `FName` works but is typo-prone; we will improve on it shortly.' },
          ],
        },
        {
          type: 'code',
          title: 'Enemy.cpp',
          code: `#include "Enemy.h"
#include "EnemyStatsRow.h"
#include "GameFramework/CharacterMovementComponent.h"

void AEnemy::BeginPlay()
{
    Super::BeginPlay();
    if (!StatsTable) { return; }

    const FEnemyStatsRow* Row =
        StatsTable->FindRow<FEnemyStatsRow>(
            EnemyType, TEXT("AEnemy::BeginPlay"));
    if (!Row) { return; }

    MaxHealth = Row->MaxHealth;
    Health = MaxHealth;
    AttackDamage = Row->Damage;
    GetCharacterMovement()->MaxWalkSpeed = Row->MoveSpeed;
}`,
          annotations: [
            { lines: '10-12', text: '`FindRow<T>(RowName, ContextString)` returns a pointer to the row, or `nullptr`. The template argument says which struct you expect.' },
            { lines: 12, text: 'The **context string** appears in the log if anything goes wrong, so you can tell *which* lookup failed among hundreds. Name the calling function.' },
            { lines: 13, text: 'Never skip this check. A renamed row or a typo in `EnemyType` makes `FindRow` return `nullptr`, and dereferencing it crashes.' },
            { lines: '15-18', text: 'Copy what you need onto the actor. Health is runtime state; the row only provides the starting values.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Output Log (row "Gruntt" does not exist)',
          code: `LogDataTable: Warning: UDataTable::FindRow : 'AEnemy::BeginPlay'
requested row 'Gruntt' not in DataTable '/Game/Data/DT_Enemies...'`,
        },
        {
          type: 'list',
          items: [
            '**Type-checked at runtime.** If `T` is not the table\'s row struct (or a parent of it), `FindRow` logs an error naming your context string and returns `nullptr` instead of reinterpreting memory.',
            '**Fast.** Rows are stored in a `TMap` keyed by `FName`, and an `FName` compares as a small integer — a lookup is a hash-map probe, not a string search.',
            '**Optional warning.** A third parameter, `bWarnIfRowMissing` (default `true`), lets you silence the warning when a missing row is expected.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Do not cache row pointers for long',
          text: 'The returned pointer points into the table\'s own memory. If the table is reimported or edited in the editor, rows are rebuilt and old pointers dangle. Copy the values you need (as above), or call `FindRow` again when you need them — it is cheap.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'bug',
      prompt: 'This loot code crashes the editor whenever a designer renames a row. Tap the line that crashes.',
      code: `void ALootChest::Open()
{
    const FLootRow* Loot =
        LootTable->FindRow<FLootRow>(
            LootRowName, TEXT("ALootChest::Open"));

    const int32 Gold = FMath::RandRange(
        Loot->MinGold, Loot->MaxGold);
    GiveGoldToPlayer(Gold);
}`,
      bugLines: [8],
      hint: 'What does `FindRow` return when the requested row no longer exists?',
      explanation:
        'When `LootRowName` no longer matches a row, `FindRow` logs a warning and returns `nullptr`. Line 8 dereferences it (`Loot->MinGold`), which is a null-pointer access and crashes. Fix: `if (!Loot) { return; }` right after the lookup (and check `LootTable` itself too). Even better, replace the hand-typed `FName` with an `FDataTableRowHandle` so renames are visible in the editor — though you still need the null check.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Walking the whole table: GetAllRows and GetRowNames',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes you need every row: a spawner choosing among eligible enemies, a bestiary screen, or a sanity check. Two functions cover this.',
        },
        {
          type: 'code',
          title: 'EnemySpawner.cpp',
          code: `FName AEnemySpawner::PickEnemyType(int32 PlayerLevel) const
{
    TArray<FName> Eligible;
    for (const FName& RowName : StatsTable->GetRowNames())
    {
        const FEnemyStatsRow* Row =
            StatsTable->FindRow<FEnemyStatsRow>(
                RowName, TEXT("AEnemySpawner::PickEnemyType"));
        if (Row && Row->MinLevel <= PlayerLevel)
        {
            Eligible.Add(RowName);
        }
    }
    if (Eligible.IsEmpty()) { return NAME_None; }
    return Eligible[FMath::RandRange(0, Eligible.Num() - 1)];
}

float AEnemySpawner::GetToughestHealth() const
{
    TArray<FEnemyStatsRow*> Rows;
    StatsTable->GetAllRows<FEnemyStatsRow>(
        TEXT("AEnemySpawner::GetToughestHealth"), Rows);

    float Best = 0.f;
    for (const FEnemyStatsRow* Row : Rows)
    {
        Best = FMath::Max(Best, Row->MaxHealth);
    }
    return Best;
}`,
          annotations: [
            { lines: 4, text: '`GetRowNames()` returns a `TArray<FName>` of every row name. Use it when you need the *names* — here, to spawn by name later.' },
            { lines: 14, text: '`NAME_None` is the "empty" `FName`, the natural "nothing found" value.' },
            { lines: 15, text: '`FMath::RandRange` is inclusive at both ends, hence `Num() - 1`.' },
            { lines: '20-22', text: '`GetAllRows<T>(ContextString, OutArray)` fills an array of row *pointers*. Use it when you only need the data, not the names.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Not every frame',
          text: '`GetRowNames` and `GetAllRows` allocate and fill a fresh array on each call. That is fine at spawn time or when a menu opens, but wasteful in `Tick`. If you need a filtered view repeatedly, build it once (for example in `BeginPlay`) and keep the row *names*, not the pointers.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Blueprint access is free',
          text: 'Because the row struct is `BlueprintType`, designers can use the **Get Data Table Row** node (with *Row Found* / *Row Not Found* outputs) and **Get Data Table Row Names** without any extra C++.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'truefalse',
      prompt: 'One Data Table can store some rows as `FEnemyStatsRow` and other rows as `FBossStatsRow`, as long as both derive from `FTableRowBase`.',
      answer: false,
      explanation:
        'A table has exactly one row struct, chosen when it is created or imported, and every row uses that layout — that uniformity is what makes the grid, the CSV columns and fast lookups possible. If bosses need extra fields, either give the shared struct optional fields, use a separate boss table, or model bosses as data assets (which *do* support subclassing).',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'FDataTableRowHandle: pick rows, do not type them',
      blocks: [
        {
          type: 'p',
          text: 'A bare `FName EnemyType` has two problems: the designer must type the row name exactly, and the table is chosen separately. [[data-table-row-handle|FDataTableRowHandle]] bundles both into one property with dropdowns.',
        },
        {
          type: 'compare',
          left: {
            title: 'Table + typed FName',
            tone: 'bad',
            code: `UPROPERTY(EditAnywhere)
TObjectPtr<const UDataTable> Table;

UPROPERTY(EditAnywhere)
FName RowName;   // "Gruntt"?`,
            text: 'Typos compile and load fine, then fail at runtime with a log warning.',
          },
          right: {
            title: 'Row handle',
            tone: 'good',
            code: `UPROPERTY(EditAnywhere)
FDataTableRowHandle EnemyRow;
// Details panel: pick table,
// then pick a row from a list`,
            text: 'The designer chooses from existing rows. Table and row travel together.',
          },
        },
        {
          type: 'code',
          title: 'EnemySpawnPoint.cpp',
          code: `void AEnemySpawnPoint::SpawnEnemy()
{
    if (EnemyRow.IsNull()) { return; }

    const FEnemyStatsRow* Row =
        EnemyRow.GetRow<FEnemyStatsRow>(
            TEXT("AEnemySpawnPoint::SpawnEnemy"));
    if (!Row) { return; }

    UE_LOG(LogTemp, Log, TEXT("Spawning %s (%.0f HP)"),
        *Row->DisplayName.ToString(), Row->MaxHealth);
    // ...spawn and initialise from Row
}`,
          annotations: [
            { lines: 3, text: '`IsNull()` is true when neither a table nor a row has been chosen — the "designer left it empty" case.' },
            { lines: '5-7', text: '`GetRow<T>(ContextString)` simply calls `FindRow<T>` on the stored table with the stored row name, with the same type checking and logging.' },
            { lines: 8, text: 'Still check for `nullptr`: the row could have been renamed or deleted *after* the designer picked it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a handle instead of a pointer to the row?',
          text: 'Rows are not objects — they have no identity the engine can save a pointer to. A handle stores something that *can* be saved: a reference to the table asset and the row\'s name. It is resolved to a pointer only when you ask. This is the same "name now, resolve later" idea as [[soft-reference|soft references]], and it is why the handle survives reimports.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: 'What does an `FDataTableRowHandle` actually store?',
      options: [
        { text: 'A copy of the row\'s data, taken when the designer picks it', why: 'It stores no row data. If it did, rebalancing the table would not reach actors that already picked a row.' },
        { text: 'A raw pointer to the row\'s memory inside the table', why: 'Row memory is rebuilt on reimport, so a saved raw pointer would dangle. The handle avoids that by storing a name.' },
        { text: 'A reference to the `UDataTable` asset plus the row\'s `FName`', correct: true, why: 'Table plus row name is the whole struct; `GetRow<T>()` resolves them to a row pointer on demand.' },
        { text: 'The row\'s index in the table', why: 'Rows are keyed by name, not position. Indices would break as soon as someone sorted or inserted rows.' },
      ],
      explanation:
        '`FDataTableRowHandle` has two fields, `DataTable` and `RowName`. Storing a *name* instead of data or an address is what lets it survive reimports and rebalances: every `GetRow` call reads the current row. The editor customisation turns those two fields into "pick a table, then pick a row" dropdowns.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Data Table or Data Assets?',
      blocks: [
        {
          type: 'p',
          text: 'Both move tuning out of code. The question is the *shape* of your data: many uniform rows, or a few rich individual objects?',
        },
        {
          type: 'table',
          headers: ['Aspect', 'Data Table', 'Data Assets'],
          rows: [
            ['Shape', 'Many rows, one struct type', 'One object per asset; class hierarchies allowed'],
            ['Best for', 'Hundreds of uniform entries: loot, enemy stats, XP per level, dialogue lines', 'Rich definitions: weapons, abilities, characters, game modes'],
            ['Editing', 'Grid editor; CSV/JSON round-trips with spreadsheets', 'Details panel, one asset at a time'],
            ['Polymorphism', 'None — every row has the same fields', '`UWeaponData` → `URangedWeaponData` subclasses with extra fields'],
            ['Behaviour', 'Plain struct helpers only, no `UFUNCTION`s', '`UFUNCTION`s and virtual functions allowed'],
            ['Loading', 'The whole table loads at once', 'Per asset; primary assets load and unload by ID'],
            ['Source control', 'One file: with exclusive checkout, one editor at a time', 'One file per item: parallel edits'],
            ['Referenced by', '`FDataTableRowHandle` or table + `FName`', '`TObjectPtr`, `TSoftObjectPtr` or `FPrimaryAssetId`'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Mixing them is normal',
          text: 'A common hybrid: a Data Table of 300 loot items for the numbers, where each row holds a soft reference to a data asset for the few items that need rich, unique behaviour. Choose per kind of data, not once per project.',
        },
        {
          type: 'deepdive',
          title: 'Validating rows, composite tables and curve tables',
          blocks: [
            {
              type: 'p',
              text: '`FTableRowBase` has virtual hooks you can override. `OnPostDataImport` runs for each row after an import, which is a good place to reject bad data:',
            },
            {
              type: 'code',
              title: 'EnemyStatsRow.h (excerpt)',
              code: `virtual void OnPostDataImport(
    const UDataTable* InDataTable, const FName InRowName,
    TArray<FString>& OutCollectedImportProblems) override
{
    if (MaxHealth <= 0.f)
    {
        OutCollectedImportProblems.Add(FString::Printf(
            TEXT("%s: MaxHealth must be > 0"),
            *InRowName.ToString()));
    }
}`,
              annotations: [
                { lines: '7-9', text: 'Problems you add are reported in the import results, next to the engine\'s own warnings about unknown or missing columns.' },
              ],
            },
            {
              type: 'list',
              items: [
                '**Composite Data Tables** (`UCompositeDataTable`) stack several tables with the same row struct; rows in later tables override earlier ones — handy for DLC or per-platform overrides.',
                '**Curve Tables** (`UCurveTable`) store a curve per row instead of a struct, ideal for "value by level" data such as XP thresholds or damage scaling.',
                'Renaming a struct property breaks the matching CSV column and drops saved values for it. Rename the column in the source file at the same time, or set up a redirect.',
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'Which piece of data is the **best** fit for a Data Table rather than individual Data Assets?',
      options: [
        { text: 'Five bosses, each with a unique ability list, phase setup and a custom C++ subclass for special rules', why: 'Unique structure and behaviour per entry is where data assets (with subclasses) win. A table would force every boss into one flat struct.' },
        { text: 'The game-mode definition for each of three playlists, each loaded on demand via the Asset Manager', why: 'A few rich definitions loaded individually by ID is the textbook primary data asset use case.' },
        { text: 'XP reward, gold drop and drop chance for 220 enemy variants, balanced weekly in a spreadsheet', correct: true, why: 'Many uniform rows, spreadsheet-driven balancing and side-by-side comparison: exactly what tables are for.' },
        { text: 'A single global configuration with eight values', why: 'A one-row table works but gains nothing; a single data asset (or developer settings) is simpler.' },
      ],
      explanation:
        'Ask two questions: *how many* entries, and *how uniform* are they? Many entries with identical fields, edited in bulk, point to a table. Few entries with different structure or behaviour, or entries you want to load individually, point to data assets.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'order',
      prompt: 'Designers want an `Armor` value for every enemy in the CSV-driven `DT_Enemies`. Put the steps in order.',
      lines: [
        'Add UPROPERTY float Armor to FEnemyStatsRow',
        'Compile the C++ module',
        'Add an Armor column to the spreadsheet and export Enemies.csv',
        'Right-click DT_Enemies and choose Reimport',
        'Read Row->Armor in AEnemy::BeginPlay',
      ],
      distractors: ['Delete DT_Enemies and create a new table from scratch'],
      linesAreCode: false,
      explanation:
        'The struct defines the columns, so it changes first and must be compiled before the editor knows about `Armor`. Only then can a reimport map the new CSV column onto the new property (before that it would be reported as an unknown column). Deleting the table is unnecessary and dangerous: it breaks every `FDataTableRowHandle` and pointer that references it.',
    },
  ],
  takeaways: [
    'A Data Table is one asset holding many rows of the same `USTRUCT`, keyed by a unique `FName` row name.',
    'Row structs derive from `FTableRowBase`; reflection lets the importer match CSV/JSON columns to `UPROPERTY` names.',
    'In CSV the first column is the row name; in JSON the `"Name"` field is. Reimport keeps the asset in sync with its source file — pick one source of truth.',
    '`FindRow<T>(RowName, Context)` returns a row pointer or `nullptr`: always check it, and use a context string that names the caller.',
    '`GetRowNames()` and `GetAllRows<T>()` walk the table; avoid calling them every frame and avoid caching row pointers.',
    '`FDataTableRowHandle` stores table + row name, gives designers dropdowns and survives reimports.',
    'Use tables for many uniform, spreadsheet-balanced rows; use data assets for rich, polymorphic or individually loaded definitions.',
  ],
  reading: [
    {
      title: 'Data Driven Gameplay Elements',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/data-driven-gameplay-elements-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s guide to Data Tables and Curve Tables, including CSV import and row structs.',
    },
    {
      title: 'Data Assets',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/data-assets-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Compare with the previous lesson\'s approach when deciding where your data belongs.',
    },
    {
      title: 'std::unordered_map',
      url: 'https://en.cppreference.com/w/cpp/container/unordered_map',
      source: 'cppreference',
      note: 'The standard-C++ cousin of a table\'s internal name-to-row map; compare the lookup guarantees.',
    },
  ],
};
