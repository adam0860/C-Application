import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-gameplay-tags',
  title: 'Gameplay Tags',
  summary:
    'Replace piles of bools, enums and magic strings with hierarchical, designer-extensible labels like `Status.Debuff.Stun` — and query them correctly.',
  minutes: 18,
  objectives: [
    'Explain how hierarchical gameplay tags work and why they beat bools, enums and strings for many gameplay states',
    'Define tags in Project Settings, in `DefaultGameplayTags.ini`, and as native C++ tags with `UE_DECLARE_GAMEPLAY_TAG_EXTERN` / `UE_DEFINE_GAMEPLAY_TAG`',
    'Store tags in `FGameplayTag` and `FGameplayTagContainer` properties and add the `GameplayTags` module dependency',
    'Predict the results of `MatchesTag`, `HasTag`, `HasTagExact`, `HasAny` and `HasAll`, including which direction the hierarchy matches',
    'Recognise when a plain enum is still the better tool',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The state explosion problem',
      blocks: [
        {
          type: 'p',
          text: 'Your character can be stunned. Then designers add burning, frozen, slowed, silenced, hasted, shielded and invulnerable. The first instinct — one `bool` per state — turns into a wall of flags, and every system that asks "can this character act?" must know about every flag.',
        },
        {
          type: 'compare',
          left: {
            title: 'One bool per state',
            tone: 'bad',
            code: `bool bIsStunned = false;
bool bIsFrozen = false;
bool bIsSilenced = false;
bool bIsBurning = false;
// ...and every new state needs
// a programmer, a compile, and
// edits to every "can act?" check
bool CanAct() const {
    return !bIsStunned && !bIsFrozen;
}`,
            text: 'Adding "Petrified" means touching C++ in several places. Forget one check and petrified characters can still shoot.',
          },
          right: {
            title: 'Gameplay tags',
            tone: 'good',
            code: `FGameplayTagContainer StatusTags;
// Status.Debuff.Stun
// Status.Debuff.Frozen
// Status.Debuff.Petrified  (new!)

bool CanAct() const {
    // designer-edited set of tags
    return !StatusTags.HasAny(
        BlockActionTags);
}`,
            text: 'States are data. Designers register `Petrified` and add it to `BlockActionTags` — no C++ change, no compile.',
          },
        },
        {
          type: 'p',
          text: 'A [[gameplay-tag]] is a hierarchical name such as `Status.Debuff.Stun`, registered in a project-wide dictionary. Code and designers attach tags to things (characters, abilities, damage events, items) and ask questions like "does this character have *any* debuff?" or "is this damage *any kind* of fire?".',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a central dictionary of names?',
          text: 'Strings are flexible but dangerous: `"Stunned"`, `"stun"` and `"Status_Stun"` all compile and silently fail to match. Enums are safe but closed: only a programmer can add a value. Gameplay tags combine both strengths. Every tag must be **registered** before use, so the editor offers a picker instead of free typing and invalid tags are reported — yet registration is data that designers can edit without a compile.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Dots mean parent and child',
      blocks: [
        {
          type: 'p',
          text: 'Each dot in a tag introduces a level of hierarchy. Registering `Status.Debuff.Stun` implicitly creates its parents `Status.Debuff` and `Status`, so the dictionary is really a tree:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'A project\'s tag tree',
          code: `Status
├── Buff
│   ├── Haste
│   └── Shield
└── Debuff
    ├── Stun
    ├── Burning
    └── Slow
Damage
├── Physical
└── Elemental
    ├── Fire
    └── Ice`,
          annotations: [
            { lines: 1, text: 'A root category. Keep the number of roots small and meaningful: `Status`, `Damage`, `Ability`, `Input`, `Team`...' },
            { lines: '5-8', text: 'Every leaf under `Debuff` is "a debuff". Code that asks about `Status.Debuff` automatically covers `Stun`, `Burning`, `Slow` — and any debuff added next year.' },
            { lines: '11-13', text: 'Hierarchies can nest as deep as is useful. `Damage.Elemental.Fire` is fire damage, elemental damage and damage.' },
          ],
        },
        {
          type: 'definition',
          term: 'Matching direction',
          text: 'A tag **matches** itself and every one of its *ancestors*. `Status.Debuff.Stun` matches `Status.Debuff` and `Status`. A parent never matches its children: `Status.Debuff` does **not** match `Status.Debuff.Stun`. Specific satisfies general, never the reverse.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Folders on a disk',
          text: 'Think of tags as folder paths. A file in `Status/Debuff/Stun` is inside `Status/Debuff` and inside `Status`. But the folder `Status/Debuff` is not inside its own `Stun` subfolder.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Design the tree early',
          text: 'Group tags by the questions code will ask. If you will ever ask "does anything prevent acting?", create a parent such as `Status.Debuff.Disabling` for stun, frozen and petrified. A good hierarchy turns complex checks into one query.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'truefalse',
      prompt: '`Status.Debuff` matches `Status.Debuff.Stun`, so a check for the `Status.Debuff.Stun` tag will succeed on a character that only has `Status.Debuff`.',
      answer: false,
      explanation:
        'Matching only goes *up* the tree: a tag matches itself and its ancestors. `Status.Debuff.Stun` matches `Status.Debuff`, but `Status.Debuff` does not match `Status.Debuff.Stun`. Intuitively, a character that is "stunned" is certainly "debuffed", but a character known only to be "debuffed" is not necessarily stunned.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Defining tags: Project Settings and ini files',
      blocks: [
        {
          type: 'p',
          text: 'The simplest way to add tags is in the editor: **Project Settings → Project → GameplayTags**, then add a new tag to the tag list with an optional comment and a *source* — the config file it is saved to, usually `DefaultGameplayTags.ini`. Designers can do this without any C++.',
        },
        {
          type: 'code',
          lang: 'ini',
          title: 'Config/DefaultGameplayTags.ini',
          code: `[/Script/GameplayTags.GameplayTagsSettings]
ImportTagsFromConfig=True
+GameplayTagList=(Tag="Status.Debuff.Stun",DevComment="Cannot act")
+GameplayTagList=(Tag="Status.Debuff.Burning",DevComment="")
+GameplayTagList=(Tag="Status.Buff.Haste",DevComment="")
+GameplayTagList=(Tag="Damage.Elemental.Fire",DevComment="")`,
          annotations: [
            { lines: 1, text: 'The settings object for the GameplayTags module. The editor writes this section for you.' },
            { lines: 2, text: 'Tells the tag manager to load tags from config files.' },
            { lines: 3, text: 'One registered tag. `DevComment` is shown as a tooltip in the tag picker — use it to tell designers what the tag *means*.' },
          ],
        },
        {
          type: 'p',
          text: 'Because the file is plain text, tag additions show up clearly in source-control diffs and merge easily. Large projects often split tags into several sources (the editor can create extra tag files under `Config/Tags/`) so that teams do not fight over one file.',
        },
        {
          type: 'p',
          text: 'To get a tag in C++ from its name you can ask the tag manager at runtime:',
        },
        {
          type: 'code',
          title: 'Runtime lookup',
          code: `const FGameplayTag StunTag =
    FGameplayTag::RequestGameplayTag(
        FName("Status.Debuff.Stun"));`,
          annotations: [
            { lines: '2-3', text: 'Looks the name up in the dictionary. If the tag is not registered, it reports an error (the optional second parameter, `ErrorIfNotFound`, defaults to `true`) and returns an invalid, empty tag.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Strings are back...',
          text: 'Scattering `RequestGameplayTag(FName("..."))` around your code reintroduces the typo problem: a misspelled name compiles fine and only fails when that line runs. Caching the result in a `static` global initialised at startup is worse — it can run before the tag dictionary has loaded. Native tags, next, solve both problems.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Native tags in C++',
      blocks: [
        {
          type: 'p',
          text: 'Tags that C++ code depends on should be declared as [[native-gameplay-tag|native tags]]: defined in C++, registered automatically when your module loads, and referenced through a real C++ variable the compiler checks.',
        },
        {
          type: 'code',
          title: 'MyGameplayTags.h',
          code: `#pragma once

#include "NativeGameplayTags.h"

namespace MyGameTags
{
    MYGAME_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Status_Debuff);
    MYGAME_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Status_Debuff_Stun);
    MYGAME_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Status_Buff_Haste);
    MYGAME_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Damage_Fire);
}`,
          annotations: [
            { lines: 3, text: '`NativeGameplayTags.h` provides `FNativeGameplayTag` and the declare/define macros.' },
            { lines: 5, text: 'A [[namespace]] keeps the tag variables out of the global scope; `MyGameTags::Status_Debuff_Stun` reads clearly at the call site.' },
            { lines: 7, text: 'Expands to an `extern` declaration of an `FNativeGameplayTag` variable — the same declare-in-header, define-in-`.cpp` pattern as any global from the C++ course. `MYGAME_API` exports it so other modules can use the tag.' },
          ],
        },
        {
          type: 'code',
          title: 'MyGameplayTags.cpp',
          code: `#include "MyGameplayTags.h"

namespace MyGameTags
{
    UE_DEFINE_GAMEPLAY_TAG(Status_Debuff, "Status.Debuff");
    UE_DEFINE_GAMEPLAY_TAG_COMMENT(Status_Debuff_Stun,
        "Status.Debuff.Stun", "Cannot move, attack or cast");
    UE_DEFINE_GAMEPLAY_TAG(Status_Buff_Haste,
        "Status.Buff.Haste");
    UE_DEFINE_GAMEPLAY_TAG(Damage_Fire,
        "Damage.Elemental.Fire");
}`,
          annotations: [
            { lines: 5, text: 'Defines the variable and binds it to the tag string. When the module loads, the tag is registered with the tag manager and appears in the editor\'s tag picker like any other tag.' },
            { lines: '6-7', text: 'The `_COMMENT` variant also supplies the designer-facing tooltip.' },
            { lines: '10-11', text: 'The C++ name and the tag string are independent, so a short variable name can stand for a long tag.' },
          ],
        },
        {
          type: 'p',
          text: 'Now code writes `StatusTags.HasTag(MyGameTags::Status_Debuff_Stun)`. An `FNativeGameplayTag` converts implicitly to `FGameplayTag`, so it works anywhere a tag is expected. Misspell the variable and the build fails, at your desk instead of in QA.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why define in the .cpp only?',
          text: 'Like any global, the tag must be *defined* exactly once to satisfy the [[one-definition-rule]]. The macro even enforces it: `UE_DEFINE_GAMEPLAY_TAG` contains a `static_assert` that fails if it is used outside a `.cpp` file. Other files see only the `extern` declaration from the header.',
        },
        {
          type: 'heading',
          text: 'Add the module dependency',
        },
        {
          type: 'p',
          text: 'Gameplay tags live in the engine\'s `GameplayTags` module. Your module must list it in its [[build-cs]]:',
        },
        {
          type: 'code',
          lang: 'csharp',
          title: 'MyGame.Build.cs',
          code: `using UnrealBuildTool;

public class MyGame : ModuleRules
{
    public MyGame(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core", "CoreUObject", "Engine", "InputCore",
            "EnhancedInput", "GameplayTags"
        });
    }
}`,
          annotations: [
            { lines: 12, text: '`GameplayTags` is what links the tag code into your module and puts its headers on your include path. It is **public** here because our public headers (characters with `FGameplayTagContainer` members) include `GameplayTagContainer.h`, so any module including *our* headers needs it too.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Forgetting it is a classic',
          text: 'Without the dependency you typically get **linker errors** — "unresolved external symbol" for tag functions or for generated code such as `Z_Construct_UScriptStruct_FGameplayTagContainer` — or a missing-include error. The code is correct; the build simply was not told to link the module that implements it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'fill',
      prompt: 'Complete the native tag declaration (header) and definition (.cpp).',
      template: `// CombatTags.h
#include "NativeGameplayTags.h"

namespace CombatTags
{
    MYGAME_API ___(Damage_Ice);
}

// CombatTags.cpp
namespace CombatTags
{
    ___(Damage_Ice, "Damage.Elemental.Ice");
}`,
      blanks: [{ answers: ['UE_DECLARE_GAMEPLAY_TAG_EXTERN'] }, { answers: ['UE_DEFINE_GAMEPLAY_TAG'] }],
      wordBank: ['UE_DECLARE_GAMEPLAY_TAG_EXTERN', 'UE_DEFINE_GAMEPLAY_TAG', 'UPROPERTY', 'DECLARE_DELEGATE', 'RequestGameplayTag', 'GENERATED_BODY'],
      explanation:
        'The header carries the `extern` declaration (`UE_DECLARE_GAMEPLAY_TAG_EXTERN`) so every file can refer to the tag; the `.cpp` carries the single definition (`UE_DEFINE_GAMEPLAY_TAG`) that binds the variable to its string and registers it when the module loads. `RequestGameplayTag` is the runtime string lookup that native tags exist to replace.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'FGameplayTag and FGameplayTagContainer',
      blocks: [
        {
          type: 'p',
          text: 'Two types carry tags around. `FGameplayTag` holds **one** tag; [[gameplay-tag-container|FGameplayTagContainer]] holds a **set** of tags. Both are reflected structs, so they work as `UPROPERTY`s with a proper tag picker in the editor.',
        },
        {
          type: 'code',
          title: 'CombatCharacter.h (excerpt)',
          code: `#include "GameplayTagContainer.h"
// ...

UPROPERTY(EditAnywhere, BlueprintReadOnly,
    Category = "Combat", meta = (Categories = "Damage"))
FGameplayTag DamageType;

UPROPERTY(EditDefaultsOnly, BlueprintReadOnly,
    Category = "Combat", meta = (Categories = "Status"))
FGameplayTagContainer ImmunityTags;

UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly,
    Category = "Combat")
FGameplayTagContainer StatusTags;`,
          annotations: [
            { lines: 1, text: '`GameplayTagContainer.h` declares both `FGameplayTag` and `FGameplayTagContainer`.' },
            { lines: '4-6', text: 'The `Categories` metadata filters the editor\'s picker to the `Damage` subtree, so a designer cannot accidentally choose `Status.Buff.Haste` as a damage type.' },
            { lines: '8-10', text: 'A designer-authored set: a fire elemental might list `Status.Debuff.Burning`; a boss might list `Status.Debuff` to shrug off every debuff.' },
            { lines: '12-14', text: 'Runtime state: the tags currently applied. Visible on placed instances while debugging, never edited by hand.' },
          ],
        },
        {
          type: 'code',
          title: 'CombatCharacter.cpp (excerpt)',
          code: `bool ACombatCharacter::TryApplyStatus(FGameplayTag Status)
{
    // Immune to Status.Debuff => immune to every debuff
    if (Status.MatchesAny(ImmunityTags)) { return false; }

    StatusTags.AddTag(Status);
    return true;
}

void ACombatCharacter::RemoveStatus(FGameplayTag Status)
{
    StatusTags.RemoveTag(Status);
}`,
          annotations: [
            { lines: 4, text: 'Ask the **specific** tag whether it matches any tag in the **general** set. `Status.Debuff.Stun` matches the immunity entry `Status.Debuff`, so the stun is rejected.' },
            { lines: 6, text: '`AddTag` ignores duplicates — a container behaves like a set.' },
            { lines: 12, text: '`RemoveTag` removes that exact tag and returns whether it was present.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'What a tag costs',
          text: 'An `FGameplayTag` is a thin wrapper around an [[fname]], so copying and comparing tags is as cheap as comparing two small integers — no string work at runtime. A container stores its tags in a [[tarray]] and also caches their parent tags, so hierarchical checks are a short linear scan with no tree walking. Containers on characters are typically tiny, which makes this very fast.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Querying tags: Matches, HasTag, HasAny, HasAll',
      blocks: [
        {
          type: 'p',
          text: 'The query functions come in pairs: a hierarchical version (parents count) and an `Exact` version (only identical tags count). Assume a character whose `StatusTags` is `{Status.Debuff.Stun}`:',
        },
        {
          type: 'table',
          headers: ['Call', 'Result', 'Rule'],
          rows: [
            ['`Stun.MatchesTag(Status.Debuff)`', '**true**', 'A tag matches itself and its ancestors'],
            ['`Status.Debuff.MatchesTag(Stun)`', '**false**', 'Parents never match children'],
            ['`Stun.MatchesTagExact(Status.Debuff)`', '**false**', 'Exact: identical tags only'],
            ['`StatusTags.HasTag(Status.Debuff)`', '**true**', 'Some tag in the container matches the argument'],
            ['`StatusTags.HasTagExact(Status.Debuff)`', '**false**', 'The argument itself must be in the container'],
            ['`StatusTags.HasAny({Status.Buff, Status.Debuff})`', '**true**', 'At least one tag of the argument is matched'],
            ['`StatusTags.HasAll({Status.Buff, Status.Debuff})`', '**false**', 'Every tag of the argument must be matched; nothing matches `Status.Buff`'],
          ],
          caption: '`Stun` is short for `Status.Debuff.Stun`.',
        },
        {
          type: 'code',
          title: 'Typical gameplay checks',
          code: `bool ACombatCharacter::IsDebuffed() const
{
    // Any debuff, present or future
    return StatusTags.HasTag(MyGameTags::Status_Debuff);
}

bool ACombatCharacter::CanCastSpell(
    const FGameplayTagContainer& BlockedBy) const
{
    // BlockedBy = {Status.Debuff.Silence, Status.Debuff.Stun}
    return !StatusTags.HasAny(BlockedBy);
}

void ACombatCharacter::CleanseDebuffs()
{
    const FGameplayTagContainer Debuffs = StatusTags.Filter(
        FGameplayTagContainer(MyGameTags::Status_Debuff));
    StatusTags.RemoveTags(Debuffs);
}`,
          annotations: [
            { lines: 4, text: 'One hierarchical query replaces a chain of `bool` checks — and stays correct when a designer adds `Status.Debuff.Petrified` next month.' },
            { lines: 11, text: '`HasAny` answers "is *any* blocking condition present?". `HasAll` would answer "are *all* required conditions present?" — perfect for prerequisites like `{State.Grounded, State.WeaponDrawn}`.' },
            { lines: '16-18', text: '`Filter` returns the tags of this container that match any tag in the argument (parents count), so this collects every debuff. `RemoveTags` then removes them all.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Edge cases worth remembering',
          text: '`HasAny` with an **empty** argument returns `false` (there is nothing to find). `HasAll` with an empty argument returns `true` (no requirement is unmet) — handy, because an ability with no prerequisites should pass its prerequisite check.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have Exact versions at all?',
          text: 'Most gameplay questions are hierarchical ("any fire damage?"), so the non-exact functions are the right default. Exact matching is for when the precise leaf matters: removing exactly the stun a spell applied, or a UI that shows a specific icon per tag. Choosing the wrong one is the most common tag bug, and it never shows up as a compile error.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'A character\'s `StatusTags` is `{Status.Debuff.Burning, Status.Buff.Haste}`. What does `StatusTags.HasTagExact(Status.Debuff)` return?',
      options: [
        { text: '`true`, because `Burning` is a child of `Status.Debuff`', why: 'That reasoning applies to `HasTag`. The `Exact` version ignores the hierarchy entirely.' },
        { text: '`false`, because `Status.Debuff` itself was never added to the container', correct: true, why: 'Exact matching requires the identical tag to be in the container; a child tag does not count.' },
        { text: '`true`, because the container holds two tags', why: 'The number of tags is irrelevant; only whether a matching tag exists.' },
        { text: 'It does not compile: you must pass a container', why: '`HasTagExact` takes a single `FGameplayTag`. The container-argument versions are `HasAnyExact` and `HasAllExact`.' },
      ],
      explanation:
        '`HasTag` and `HasTagExact` differ only in whether parent tags count. With `HasTag(Status.Debuff)` the answer would be `true`, since `Status.Debuff.Burning` matches its parent. With `HasTagExact`, the container must literally contain `Status.Debuff` — and it does not.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Container `C` is `{Status.Debuff.Stun, Damage.Elemental.Fire}`. Select **all** expressions that return `true`.',
      options: [
        { text: '`C.HasTag(Damage.Elemental)`', correct: true, why: '`Damage.Elemental.Fire` matches its parent `Damage.Elemental`.' },
        { text: '`C.HasAll({Status.Debuff, Damage})`', correct: true, why: 'Both requirements are matched: `Stun` matches `Status.Debuff`, `Fire` matches `Damage`.' },
        { text: '`C.HasAny({Status.Buff, Damage.Physical})`', why: 'Neither `Status.Buff` nor `Damage.Physical` is matched by anything in `C`. `Fire` is elemental, not physical.' },
        { text: '`C.HasTagExact(Damage.Elemental.Fire)`', correct: true, why: 'That exact tag was added, so even the exact check succeeds.' },
        { text: '`Damage.Elemental.MatchesTag(Damage.Elemental.Fire)`', why: 'A parent does not match its child. Reversed — `Fire.MatchesTag(Damage.Elemental)` — it would be `true`.' },
      ],
      explanation:
        'Work from the container\'s tags *upward*: `{Status.Debuff.Stun, Damage.Elemental.Fire}` effectively also covers `Status.Debuff`, `Status`, `Damage.Elemental` and `Damage` for hierarchical queries. `HasAny` needs one hit, `HasAll` needs every hit, and the `Exact` variants only look at the tags literally added.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Why tags beat enums, bools and strings (and when they do not)',
      blocks: [
        {
          type: 'table',
          headers: ['Need', 'bools', 'enum', 'FString', 'Gameplay tags'],
          rows: [
            ['Several states at once', 'Yes, one field each', 'No — one value (bit flags cap out at 32 or 64)', 'Awkward', 'Yes — a container'],
            ['Add a state without a compile', 'No', 'No', 'Yes', 'Yes — editor or ini'],
            ['Typo protection', 'Compiler', 'Compiler', 'None', 'Registry + picker; compiler with native tags'],
            ['"Any debuff?" in one query', 'No — OR every flag', 'No — list every value', 'Fragile prefix parsing', 'Yes — `HasTag(Status.Debuff)`'],
            ['Runtime cost', 'Tiny', 'Tiny', 'Allocations, slow compares', '`FName` compares'],
            ['Shared vocabulary across systems', 'No — fields on one class', 'Per enum', 'Ad hoc', 'Yes — one project-wide tree'],
          ],
        },
        {
          type: 'p',
          text: 'That last row matters most on big projects. The same `Status.Debuff.Stun` tag can be applied by an ability, checked by the movement code, shown by the HUD, blocked by an item and filtered by the AI — and none of those systems needs to include the others\' headers.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'When an enum is still right',
          text: 'Use an [[enum-class]] for a **closed set owned by code**, where the code must handle every value: `EWeaponSlot { Primary, Secondary, Melee }`, a movement mode, a state machine\'s states. A `switch` over an enum can warn when you forget a case. Tags are open-ended by design, so no code can exhaustively handle "every tag" — great for extensible gameplay labels, wrong for structural logic.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Tags across the engine',
          text: 'Implementing `IGameplayTagAssetInterface` (one function, `GetOwnedGameplayTags`) lets any system ask any actor for its tags without casting to your class — the [[uinterface|interface]] pattern from the communication unit. The [[gameplay-ability-system]] is built on tags: abilities are activated, blocked and cancelled by tags, and effects grant tags while active.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Tags over the network',
          text: 'Tags replicate well. By default a tag is sent by name; enabling **Fast Replication** in the GameplayTags settings sends a compact index instead, which requires the server and clients to have identical tag dictionaries (true when they run the same build).',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'bug',
      prompt: 'Designers report that stunned characters can still use abilities. `StatusTags` contains `Status.Debuff.Stun` while stunned. Tap the faulty line.',
      code: `bool ACombatCharacter::CanUseAbilities() const
{
    if (IsDead())
    {
        return false;
    }
    // No abilities while under ANY debuff
    return !StatusTags.HasTagExact(
        MyGameTags::Status_Debuff);
}`,
      bugLines: [8],
      hint: 'Which tag is literally in the container, and which tag are we asking about?',
      explanation:
        '`HasTagExact(Status.Debuff)` only succeeds if `Status.Debuff` *itself* was added. The container holds `Status.Debuff.Stun`, a child, so the exact check returns `false` and the function returns `true` — the stunned character can act. The intent, "any debuff", is hierarchical: use `StatusTags.HasTag(MyGameTags::Status_Debuff)`. No compiler can catch this; it is a logic bug that only careful choice of query function prevents.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'You add an `FGameplayTagContainer` `UPROPERTY` to your character. The code looks right, but the build fails with linker errors such as "unresolved external symbol ... `FGameplayTagContainer`". What is the most likely cause?',
      options: [
        { text: 'The tags are not listed in `DefaultGameplayTags.ini`', why: 'Tag registration is runtime data. It cannot cause a build or link error.' },
        { text: '`GameplayTags` is missing from the module\'s dependencies in `MyGame.Build.cs`', correct: true, why: 'Without the dependency, the build never links the module that implements tag types, so their symbols are unresolved.' },
        { text: 'The Gameplay Ability System plugin is not enabled', why: 'Tags are a core engine module that works without GAS. GAS depends on tags, not the other way round.' },
        { text: 'FGameplayTagContainer cannot be used as a UPROPERTY', why: 'It is a reflected `USTRUCT` designed to be a `UPROPERTY`, complete with an editor picker.' },
      ],
      explanation:
        'Unreal modules only link against the modules they declare. The generated reflection code for your class references `FGameplayTagContainer`\'s own reflection data, which lives in the `GameplayTags` module — so missing the dependency typically shows up as unresolved external symbols (or, depending on your other dependencies, a missing-include error). Add `"GameplayTags"` to `PublicDependencyModuleNames` and rebuild.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'Which of these is the **best** candidate for an `enum class` rather than gameplay tags?',
      options: [
        { text: 'Elemental damage types that designers will keep adding throughout development', why: 'Open-ended and designer-owned: exactly what tags are for. An enum would need a programmer for each new element.' },
        { text: 'Status effects that several can be active at once', why: 'An enum variable holds one value at a time; a tag container holds any number of states.' },
        { text: 'The three equipment slots (`Primary`, `Secondary`, `Melee`) that inventory code `switch`es over and must handle exhaustively', correct: true, why: 'A small, closed, code-owned set where the compiler should flag an unhandled case is the classic enum use.' },
        { text: 'Faction labels used by AI, UI and quest systems that should not depend on each other\'s headers', why: 'A shared, extensible vocabulary across decoupled systems is one of the strongest reasons to use tags.' },
      ],
      explanation:
        'Tags are for open-ended, combinable, hierarchical labels shared across systems. Enums are for closed sets of mutually exclusive values that code reasons about exhaustively. Many projects use both: an enum for structural slots, tags for everything designers extend.',
    },
  ],
  takeaways: [
    'A gameplay tag is a registered hierarchical name; `Status.Debuff.Stun` implicitly has parents `Status.Debuff` and `Status`.',
    'Matching goes upward only: a tag matches itself and its ancestors, never its children.',
    'Define tags in Project Settings or `DefaultGameplayTags.ini` (no compile), or natively with `UE_DECLARE_GAMEPLAY_TAG_EXTERN` in a header and `UE_DEFINE_GAMEPLAY_TAG` in a `.cpp`.',
    'Prefer native tags over `RequestGameplayTag(FName(...))` for tags C++ depends on: the compiler catches typos and registration happens at module load.',
    '`FGameplayTag` holds one tag (an `FName` inside); `FGameplayTagContainer` holds a set and caches parents for fast hierarchical queries.',
    '`HasTag`/`HasAny`/`HasAll` count parents; the `Exact` variants do not. Picking the wrong one is the most common tag bug.',
    'Add `"GameplayTags"` to your `Build.cs` dependencies; use `meta = (Categories = "...")` to filter editor pickers.',
    'Use enums for closed, code-owned sets you `switch` over; use tags for open-ended, combinable, cross-system labels.',
  ],
  reading: [
    {
      title: 'Using Gameplay Tags',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/using-gameplay-tags-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s guide to creating tags, tag sources, native tags and the query functions.',
    },
    {
      title: 'Gameplay Ability System',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-ability-system-for-unreal-engine',
      source: 'unreal-docs',
      note: 'See how GAS uses tags to activate, block and cancel abilities — the biggest consumer of tags in the engine.',
    },
    {
      title: 'Enumeration declaration',
      url: 'https://en.cppreference.com/w/cpp/language/enum',
      source: 'cppreference',
      note: 'Refresh the strengths of scoped enums so you can choose confidently between an enum and tags.',
    },
  ],
};
