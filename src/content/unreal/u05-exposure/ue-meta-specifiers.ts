import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-meta-specifiers',
  title: 'Metadata, Categories and Editor Polish',
  summary: 'Clamps, sliders, conditional fields, tooltips and categories: turning a working C++ class into one designers enjoy using.',
  minutes: 17,
  objectives: [
    'Explain the difference between specifier flags and `meta = (...)` metadata, and why metadata never affects gameplay',
    'Constrain numbers with `ClampMin`/`ClampMax` and `UIMin`/`UIMax`, and validate in code as well',
    'Show or hide properties conditionally with `EditCondition`, `EditConditionHides` and `InlineEditConditionToggle`',
    'Use comments as tooltips, `DisplayName`, and `Category = "A|B"` subcategories to organise a class',
    'Explain what `AllowPrivateAccess` does and when to use it',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Flags versus metadata',
      blocks: [
        {
          type: 'p',
          text: 'Specifiers such as `EditAnywhere` or `BlueprintReadOnly` become **flags** compiled into the reflection data. They exist in every build, because the engine consults them at run time (for example to decide what to save or what a Blueprint may set).',
        },
        {
          type: 'p',
          text: 'Everything inside `meta = (...)` is different. A [[metadata-specifier]] is a plain key–value string pair that only **editor tools** read: the Details panel, the Blueprint editor, the asset pickers. UHT stores it in a block that is compiled only when metadata is enabled, which means **editor builds**. In a cooked Shipping game it simply does not exist.',
        },
        {
          type: 'code',
          title: 'Turret.h',
          code: `/** Seconds between shots. Lower fires faster. */
UPROPERTY(EditDefaultsOnly, Category = "Turret|Firing",
    meta = (ClampMin = "0.05", UIMax = "2.0", Units = "s"))
float FireInterval = 0.5f;`,
          annotations: [
            { lines: 1, text: 'UHT copies this comment into a `ToolTip` metadata entry. Designers see it when they hover over the property.' },
            { lines: 2, text: '`EditDefaultsOnly` is a flag (present in all builds). `Category` looks like a specifier but is stored as metadata, and the `|` makes *Firing* a subcategory of *Turret*.' },
            { lines: 3, text: 'Three metadata keys: a hard minimum, a slider maximum, and a unit shown next to the number. Keys are separated by commas; values are strings.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why keep metadata out of the game?',
          text: 'A large project has tens of thousands of reflected properties, each with tooltips, categories and display hints. None of that text matters to a player, so stripping it saves memory and load time in the shipped game. The trade-off is a rule worth memorising: **metadata can change how the editor presents a value, never how the game behaves.**',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Flag-style keys',
          text: 'Some keys take no value, such as `meta = (EditConditionHides)`. Writing the key alone means "set". You may also see the explicit form `EditConditionHides = "true"`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Numeric limits: Clamp versus UI ranges',
      blocks: [
        {
          type: 'p',
          text: 'Numbers are where designers most often make mistakes: a negative fire rate, a jump height of 50,000. Two pairs of keys help, and they do different jobs.',
        },
        {
          type: 'table',
          headers: ['Key', 'What it limits', 'Can a designer type past it?'],
          rows: [
            ['`ClampMin` / `ClampMax`', 'Any value entered in the Details panel, typed or dragged', 'No: the value snaps back into range'],
            ['`UIMin` / `UIMax`', 'Only the range of the drag slider', 'Yes, by typing (still within any clamp)'],
          ],
        },
        {
          type: 'code',
          title: 'MusicPlayer.h',
          code: `UPROPERTY(EditAnywhere, Category = "Audio",
    meta = (ClampMin = "0", ClampMax = "500",
            UIMin = "0", UIMax = "100"))
int32 VolumePercent = 80;`,
          annotations: [
            { lines: 2, text: 'Hard limits: nothing typed or dragged in the editor can leave 0–500.' },
            { lines: 3, text: 'Comfortable slider range for everyday tuning. A designer can still type `250` for a special case.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Clamps protect the editor, not the game',
          text: 'Because clamps are metadata, they only apply to values entered in the editor. If C++ or a Blueprint graph assigns `VolumePercent = 9000` at run time, nothing stops it. Validate in code wherever values enter your system:',
        },
        {
          type: 'code',
          title: 'MusicPlayer.cpp',
          code: `void AMusicPlayer::SetVolumePercent(int32 NewVolume) {
    VolumePercent = FMath::Clamp(NewVolume, 0, 500);
    ApplyVolume();
}`,
          annotations: [
            { lines: 2, text: 'The real guarantee. Pair it with `BlueprintReadOnly` on the property so graphs must go through this setter.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Show units',
          text: '`Units = "cm"`, `Units = "s"` or `Units = "deg"` display a unit next to the value, so nobody wonders whether a range is in centimetres or metres. Unreal\'s world unit is the centimetre.',
        },
        {
          type: 'deepdive',
          title: 'Validating relationships between properties',
          blocks: [
            {
              type: 'p',
              text: 'Clamps check one property at a time. To enforce a relationship such as "max must be at least min", override `PostEditChangeProperty`, which the editor calls after a designer changes any property. It is editor-only, so it is wrapped in `WITH_EDITOR` both in the header and in the `.cpp`.',
            },
            {
              type: 'code',
              title: 'Spawner.cpp',
              code: `#if WITH_EDITOR
void ASpawner::PostEditChangeProperty(
    FPropertyChangedEvent& Event) {
    Super::PostEditChangeProperty(Event);
    if (Event.GetPropertyName() ==
        GET_MEMBER_NAME_CHECKED(ASpawner, MinCount)) {
        MaxCount = FMath::Max(MaxCount, MinCount);
    }
}
#endif`,
              annotations: [
                { lines: 1, text: 'This function does not exist in cooked game builds, so the code must not exist there either.' },
                { lines: 6, text: '`GET_MEMBER_NAME_CHECKED` produces the property name as an `FName` and fails to compile if `MinCount` is ever renamed, unlike a hand-typed string.' },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'truefalse',
      prompt: 'With `meta = (ClampMax = "100")` on `Health`, a Blueprint graph that sets `Health` to 250 at run time will have the value clamped to 100.',
      answer: false,
      explanation:
        'Clamp keys are editor metadata: they constrain what can be entered in the Details panel, and they do not even exist in a Shipping build. Run-time assignments from C++ or Blueprints are unaffected. Enforce limits in code, ideally by making the property `BlueprintReadOnly` and routing changes through a function that calls `FMath::Clamp`.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: 'Designers want to drag a `SpawnCount` slider between 0 and 100, type values up to 500 for special cases, and never go below 0. Which metadata does that?',
      codeOptions: true,
      options: [
        {
          text: `meta = (ClampMin = "0", ClampMax = "100",
        UIMin = "0", UIMax = "500")`,
          why: 'The pairs are swapped: the slider would cover 0–500 and typing 250 would be clamped to 100.',
        },
        {
          text: `meta = (UIMin = "0", UIMax = "100")`,
          why: 'UI limits only shape the slider. Without a clamp, a designer could type `-20` or `9999`.',
        },
        {
          text: `meta = (ClampMin = "0", ClampMax = "500",
        UIMin = "0", UIMax = "100")`,
          correct: true,
          why: 'The clamp sets the hard 0–500 bounds; the UI range makes the slider comfortable for everyday 0–100 tuning.',
        },
        {
          text: `meta = (ClampMin = "0", ClampMax = "100")`,
          why: 'This blocks the special-case values above 100 entirely.',
        },
      ],
      explanation:
        'Think of `Clamp*` as the walls and `UI*` as the comfortable part of the room. The slider spans the UI range, typing can reach anywhere inside the clamps, and nothing in the editor can go outside them.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Conditional properties: EditCondition',
      blocks: [
        {
          type: 'p',
          text: 'Many settings only make sense when another setting is on. Showing a "Regen Per Second" field on an enemy that cannot regenerate is noise at best and a trap at worst. [[edit-condition|EditCondition]] ties a property\'s editability to an expression over other properties.',
        },
        {
          type: 'code',
          title: 'Enemy.h',
          code: `UENUM(BlueprintType)
enum class EAmmoType : uint8 { Bullet, Explosive };

// Members of AEnemy:
UPROPERTY(EditAnywhere, Category = "Health")
bool bCanRegenerate = false;

UPROPERTY(EditAnywhere, Category = "Health",
    meta = (EditCondition = "bCanRegenerate"))
float RegenPerSecond = 5.f;

UPROPERTY(EditAnywhere, Category = "Ammo")
EAmmoType AmmoType = EAmmoType::Bullet;

UPROPERTY(EditAnywhere, Category = "Ammo",
    meta = (EditCondition = "AmmoType == EAmmoType::Explosive",
            EditConditionHides))
float BlastRadius = 300.f;

UPROPERTY(EditAnywhere, Category = "Speed",
    meta = (InlineEditConditionToggle))
bool bOverrideSpeed = false;

UPROPERTY(EditAnywhere, Category = "Speed",
    meta = (EditCondition = "bOverrideSpeed"))
float SpeedOverride = 600.f;`,
          annotations: [
            { lines: '1-2', text: 'A [[uenum]] declared at namespace scope, so the editor can show it as a dropdown and conditions can compare against its values.' },
            { lines: '8-10', text: 'Greyed out (visible but not editable) until `bCanRegenerate` is ticked.' },
            { lines: '16-17', text: 'Conditions can be expressions: comparisons with enum values, `&&`, `||`, `!`. `EditConditionHides` hides the property entirely instead of greying it out.' },
            { lines: '20-22', text: '`InlineEditConditionToggle` goes on the **bool**: instead of its own row, it becomes a checkbox drawn inline next to the property that uses it as a condition.' },
            { lines: '24-26', text: 'Displayed as one row: a checkbox followed by the speed field, enabled only when ticked. A tidy pattern for optional overrides.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Hidden does not mean ignored',
          text: '`EditCondition` changes only the Details panel. `BlastRadius` still exists and still holds `300.f` when `AmmoType` is `Bullet`. Your gameplay code must check `AmmoType` itself before using `BlastRadius`; the editor condition is a convenience for designers, not logic.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why bother?',
          text: 'Every visible field is a question the designer has to answer. Conditional properties shrink the panel to the questions that matter for *this* configuration, and they document dependencies ("blast radius only applies to explosives") right where the decision is made.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'fill',
      prompt: 'Make `RegenPerSecond` editable only when `bCanRegenerate` is true, and completely hidden (not just greyed out) otherwise.',
      template: `UPROPERTY(EditAnywhere, Category = "Health")
bool bCanRegenerate = false;

UPROPERTY(EditAnywhere, Category = "Health",
    meta = (___ = "bCanRegenerate", ___))
float RegenPerSecond = 5.f;`,
      blanks: [{ answers: ['EditCondition'] }, { answers: ['EditConditionHides'] }],
      wordBank: ['EditCondition', 'EditConditionHides', 'InlineEditConditionToggle', 'AdvancedDisplay', 'ClampMin', 'DisplayName'],
      explanation:
        '`EditCondition` names the expression that must be true for the field to be editable, and `EditConditionHides` switches from greying out to hiding. `InlineEditConditionToggle` would go on the bool instead, turning it into an inline checkbox; `AdvancedDisplay` is an unrelated layout specifier.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Names, tooltips and categories',
      blocks: [
        {
          type: 'p',
          text: 'The cheapest polish of all is good naming and documentation, and Unreal turns both into UI for free.',
        },
        {
          type: 'code',
          title: 'Weapon.h',
          code: `/**
 * Damage dealt per hit before armour and multipliers.
 * Applied to every pellet for shotguns.
 */
UPROPERTY(EditDefaultsOnly, Category = "Combat|Damage",
    meta = (DisplayName = "Base Damage", ClampMin = "0"))
float Dmg = 25.f;

UPROPERTY(EditDefaultsOnly, Category = "Combat|Damage",
    meta = (ClampMin = "1.0"))
float HeadshotMultiplier = 2.f;`,
          annotations: [
            { lines: '1-4', text: 'The comment directly above becomes the tooltip, in the Details panel and on Blueprint pins and nodes. Epic\'s convention is the `/** */` doc-comment style.' },
            { lines: 5, text: '`Combat|Damage` nests a *Damage* group inside *Combat*. Use the same top-level names across classes so designers know where to look.' },
            { lines: '6-7', text: '`DisplayName` changes only the label. The C++ name `Dmg` (and every saved value keyed by it) stays the same.' },
          ],
        },
        {
          type: 'list',
          items: [
            'Labels are generated from C++ names automatically: `HeadshotMultiplier` is shown as *Headshot Multiplier*, and a leading `b` on bools is dropped (`bCanRegenerate` becomes *Can Regenerate*). Good C++ names usually need no `DisplayName`.',
            'An explicit `meta = (ToolTip = "...")` overrides the comment, which is handy when the comment is aimed at programmers rather than designers.',
            '`UCLASS(HideCategories = (Rendering, Replication))` hides inherited categories that are irrelevant to designers using your class.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why DisplayName instead of renaming?',
          text: 'Saved Blueprints and levels store overridden values **by property name**. Rename `Dmg` to `BaseDamage` in C++ and every saved override refers to a name that no longer exists, so designers\' tuning silently reverts to the default. `DisplayName` changes what people see without touching what is saved.',
        },
        {
          type: 'deepdive',
          title: 'Renaming for real: core redirects',
          blocks: [
            {
              type: 'p',
              text: 'If you do want to rename the C++ property, tell the engine how to map old saved data to the new name with a redirect in `DefaultEngine.ini`. When assets are loaded, values saved under the old name are applied to the new one; resave the assets and the redirect can eventually be removed.',
            },
            {
              type: 'code',
              lang: 'ini',
              title: 'Config/DefaultEngine.ini',
              code: `[CoreRedirects]
+PropertyRedirects=(OldName="/Script/MyGame.Weapon.Dmg",NewName="/Script/MyGame.Weapon.BaseDamage")`,
              annotations: [
                { lines: 2, text: 'Paths use the module name and the class name without its `A` prefix. `ClassRedirects` and `FunctionRedirects` exist for renaming classes and functions.' },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'Designers want the property `Dmg` to read *Base Damage* in the Details panel. Dozens of weapon Blueprints already have tuned values saved. What is the safest change?',
      options: [
        {
          text: 'Rename the C++ variable to `BaseDamage` and recompile',
          why: 'Saved overrides are keyed by the old name `Dmg`, so without a core redirect every tuned value would revert to the default.',
        },
        {
          text: 'Add `meta = (DisplayName = "Base Damage")`',
          correct: true,
          why: 'Only the label changes; serialized data keeps matching the unchanged C++ name.',
        },
        {
          text: 'Add the comment `/** Base Damage */` above the property',
          why: 'A comment becomes the tooltip, shown on hover. The label would still read *Dmg*.',
        },
        {
          text: 'Change it to `Category = "Base Damage"`',
          why: 'That creates a group called *Base Damage* containing a field still labelled *Dmg*.',
        },
      ],
      explanation:
        'Separate what people **see** (labels, tooltips, categories: all metadata) from what the engine **stores** (the property name). `DisplayName` changes the former only, so it is always safe. A real rename needs a core redirect so old data can find the new name.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'AllowPrivateAccess: Blueprint access without public',
      blocks: [
        {
          type: 'p',
          text: 'UHT refuses `BlueprintReadOnly` or `BlueprintReadWrite` on a `private` member, with an error saying they should not be used on private members. Yet Epic\'s own templates declare their camera components `private` and readable from Blueprints. The key that makes this possible is [[allow-private-access|AllowPrivateAccess]].',
        },
        {
          type: 'code',
          title: 'HeroCharacter.h',
          code: `UCLASS()
class MYGAME_API AHeroCharacter : public ACharacter {
    GENERATED_BODY()

public:
    AHeroCharacter();

    USpringArmComponent* GetCameraBoom() const {
        return CameraBoom;
    }

private:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly,
        Category = "Camera",
        meta = (AllowPrivateAccess = "true"))
    TObjectPtr<USpringArmComponent> CameraBoom;
};`,
          annotations: [
            { lines: '8-10', text: 'Other C++ code gets read access through a getter, as good encapsulation suggests.' },
            { lines: '13-16', text: 'Private in C++, yet a Blueprint child (`BP_Hero`) can still use a *Get Camera Boom* node. `AllowPrivateAccess` affects only Blueprint and reflection, never C++ access rules.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does UHT make you opt in?',
          text: 'Blueprint access goes through reflection, which ignores C++ `private`. Without the error, a programmer could make a member `private` to protect an [[invariant]] and then unknowingly let every Blueprint write to it. Requiring `AllowPrivateAccess` turns that accident into a deliberate, visible decision. It is the same spirit as `friend` in the C++ course: a narrow, explicit exception to access control.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Private plus AllowPrivateAccess, or protected?',
          text: 'A `protected` member can be exposed to Blueprints without any metadata, but it is then also writable by every C++ subclass. `private` with `AllowPrivateAccess` keeps C++ subclasses on the getter while still giving Blueprints read access. Either is acceptable; be consistent. Note that `Edit*` specifiers work on private members without this key, because editing in the Details panel is not code access.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: 'This header stops the build with a UHT error before the C++ compiler even runs. Tap the line(s) responsible.',
      code: `UCLASS()
class MYGAME_API ASniperCharacter : public ACharacter {
    GENERATED_BODY()

public:
    ASniperCharacter();

private:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly,
        Category = "Camera")
    TObjectPtr<UCameraComponent> ScopeCamera;

    UPROPERTY(EditDefaultsOnly, Category = "Camera",
        meta = (ClampMin = "1.0"))
    float ScopeZoom = 4.f;
};`,
      bugLines: [9, 10],
      hint: 'One of these private properties asks for Blueprint access.',
      explanation:
        '`ScopeCamera` is `private` and `BlueprintReadOnly`, which UHT rejects ("BlueprintReadOnly should not be used on private members"). Add `meta = (AllowPrivateAccess = "true")` or make it `protected`. `ScopeZoom` is fine: `EditDefaultsOnly` is about the Details panel, which may edit private members freely.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'A toolbox of designer-friendly keys',
      blocks: [
        {
          type: 'p',
          text: 'Functions get metadata too. These keys change how a node looks and how easily it is found in the Blueprint context menu:',
        },
        {
          type: 'code',
          title: 'CombatLibrary.h',
          code: `UFUNCTION(BlueprintCallable, Category = "Combat|Damage",
    meta = (DisplayName = "Deal Damage",
            Keywords = "hurt hit attack",
            ReturnDisplayName = "Killed"))
bool ApplyDamageTo(AActor* Target, float Amount);`,
          annotations: [
            { lines: 2, text: 'The node title designers see, independent of the C++ name.' },
            { lines: 3, text: 'Extra search terms: typing "hurt" in the graph\'s context menu finds this node.' },
            { lines: 4, text: 'Renames the *Return Value* pin so the node explains itself.' },
          ],
        },
        {
          type: 'table',
          headers: ['Key', 'Goes on', 'Effect'],
          rows: [
            ['`ExposeOnSpawn`', 'Property (Blueprint-visible, editable on instances)', 'Adds a pin for it on *Spawn Actor from Class*, so it is set before `BeginPlay` runs.'],
            ['`MakeEditWidget`', '`FVector` / `FTransform` property', 'Draws a draggable 3D handle in the level viewport, relative to the actor.'],
            ['`GetOptions = "FuncName"`', '`FName` / `FString` property', 'Turns a text field into a dropdown filled by a `UFUNCTION` returning the options.'],
            ['`MultiLine`', '`FString` / `FText` property', 'Uses a multi-line text box, for dialogue or descriptions.'],
            ['`TitleProperty = "Name"`', 'Array of structs', 'Labels each array element with one of its fields instead of "Index [3]".'],
            ['`DefaultToSelf = "Target"`', 'Function', 'The *Target* pin defaults to the calling Blueprint\'s own object.'],
            ['`CompactNodeTitle = "+"`', 'Function', 'Draws a small, operator-style node.'],
          ],
          caption: 'Not exhaustive: Epic\'s metadata reference lists dozens more.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Steal from the engine',
          text: 'When you see a nice editor behaviour on an engine class, find the property in its header (your IDE\'s "go to definition" on the C++ name works) and look at its `meta`. That is how most Unreal programmers learn these keys.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'A designer spawns `BP_Grenade` with *Spawn Actor from Class* and wants to set its `FuseTime` directly on that node, so the value is in place before `BeginPlay`. Which declaration enables that?',
      codeOptions: true,
      options: [
        {
          text: `UPROPERTY(EditInstanceOnly, Category = "Grenade")
float FuseTime = 3.f;`,
          why: 'Instance editing happens in the Details panel for actors placed in a level. A freshly spawned actor never passes through it, and no pin appears.',
        },
        {
          text: `UPROPERTY(EditAnywhere, Category = "Grenade",
    meta = (MakeEditWidget = "true"))
float FuseTime = 3.f;`,
          why: '`MakeEditWidget` draws a 3D handle for vector or transform properties; it has nothing to do with spawn nodes.',
        },
        {
          text: `UPROPERTY(EditAnywhere, BlueprintReadWrite,
    Category = "Grenade",
    meta = (ExposeOnSpawn = "true"))
float FuseTime = 3.f;`,
          correct: true,
          why: '`ExposeOnSpawn` on a Blueprint-visible, instance-editable property adds a *Fuse Time* pin to the spawn node, applied before `BeginPlay`.',
        },
        {
          text: `UFUNCTION(CallInEditor, Category = "Grenade")
void SetFuseTime();`,
          why: '`CallInEditor` creates an editor button, usable only while editing a level, not during play.',
        },
      ],
      explanation:
        '`ExposeOnSpawn` exists so spawners can configure an actor *before* its `BeginPlay` runs. Setting the variable after the spawn node would be too late if `BeginPlay` already used it. UHT requires such properties to be visible to Blueprints and not restricted to class defaults.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Case study: polishing a turret',
      blocks: [
        {
          type: 'p',
          text: 'Here is a working turret written in a hurry, followed by the same data after a polish pass. Nothing about the gameplay changed; only the designer\'s experience did.',
        },
        {
          type: 'compare',
          left: {
            title: 'Before',
            tone: 'bad',
            code: `UPROPERTY(EditAnywhere)
float fr = 0.5f;

UPROPERTY(EditAnywhere)
float r = 1500.f;

UPROPERTY(EditAnywhere)
bool bH = false;

UPROPERTY(EditAnywhere)
float hs = 400.f;`,
            text: 'Cryptic names, no categories (everything lands in a group named after the class), no limits, a homing setting that is always visible, and every value editable per instance.',
          },
          right: {
            title: 'After',
            tone: 'good',
            code: `/** Seconds between shots. */
UPROPERTY(EditDefaultsOnly,
    Category = "Turret|Firing",
    meta = (ClampMin = "0.05", Units = "s"))
float FireInterval = 0.5f;

/** How far the turret can see. */
UPROPERTY(EditAnywhere,
    Category = "Turret|Targeting",
    meta = (ClampMin = "0", Units = "cm"))
float Range = 1500.f;

UPROPERTY(EditDefaultsOnly,
    Category = "Turret|Firing")
bool bFiresHomingMissiles = false;

UPROPERTY(EditDefaultsOnly,
    Category = "Turret|Firing",
    meta = (EditCondition =
        "bFiresHomingMissiles",
        EditConditionHides, ClampMin = "0"))
float HomingTurnRate = 400.f;`,
            text: 'Readable labels generated from good names, tooltips, grouped categories, limits with units, a conditional field, and per-instance editing only where it makes sense (range depends on placement).',
          },
        },
        {
          type: 'heading',
          text: 'A polish checklist',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Visibility**: is each property `EditDefaultsOnly`, `EditInstanceOnly` or `EditAnywhere` for a reason?',
            '**Names and tooltips**: would a designer understand it without asking you?',
            '**Categories**: grouped with `|` subcategories that match your other classes?',
            '**Limits and units**: can a typo produce a nonsensical value?',
            '**Conditions**: are dependent settings hidden until they apply?',
            '**Noise**: are rare settings `AdvancedDisplay` and inherited junk hidden with `HideCategories`?',
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Polish is part of the job',
          text: 'On a team, a gameplay programmer\'s "users" are designers. A class that is pleasant to configure gets used, tuned and iterated on; a confusing one gets worked around with Blueprint hacks. Studios notice the difference, and it often comes up in code review.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Select **every** item below that is metadata, and therefore does not exist in a cooked Shipping build.',
      options: [
        {
          text: 'The tooltip generated from a `/** */` comment',
          correct: true,
          why: 'Stored as `ToolTip` metadata, purely for the editor.',
        },
        {
          text: '`ClampMin = "0"`',
          correct: true,
          why: 'A `meta` key, which is why it cannot clamp run-time assignments.',
        },
        {
          text: '`Category = "Combat"`',
          correct: true,
          why: 'Although it is written outside `meta = (...)`, UHT stores the category as metadata; only editor UI uses it.',
        },
        {
          text: 'The `EditAnywhere` flag',
          why: 'Edit and Blueprint specifiers are property flags, kept in the reflection data of every build.',
        },
        {
          text: 'The fact that the property is reflected and tracked by the garbage collector',
          why: 'Reflection and GC tracking are core run-time features; they exist in every build.',
        },
      ],
      explanation:
        'Flags describe behaviour the engine relies on at run time, so they ship. Metadata describes presentation for editor tools, so it is stripped. That one distinction explains why clamps and edit conditions never protect gameplay code, and why validation belongs in C++.',
    },
  ],
  takeaways: [
    'Specifier flags (`EditAnywhere`, `BlueprintReadOnly`) ship in every build; `meta = (...)` keys, tooltips and categories are editor-only metadata.',
    '`ClampMin`/`ClampMax` are hard editor limits and `UIMin`/`UIMax` only shape the slider; neither constrains run-time code, so validate in C++ too.',
    '`EditCondition` (with expressions), `EditConditionHides` and `InlineEditConditionToggle` show settings only when they apply, but code must still check the condition itself.',
    'Comments above a declaration become tooltips, `Category = "A|B"` creates subcategories, and `DisplayName` relabels without breaking saved data.',
    '`AllowPrivateAccess = "true"` lets Blueprints read or write a private member while C++ access rules stay unchanged.',
    'Polish is part of the job: clear visibility, names, categories, limits and conditions make a class pleasant for designers.',
  ],
  reading: [
    {
      title: 'Metadata Specifiers',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/metadata-specifiers-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s list of class, property and function metadata keys, including many not covered here.',
    },
    {
      title: 'All UPROPERTY specifiers (benui)',
      url: 'https://benui.ca/unreal/uproperty/',
      source: 'article',
      note: 'Scroll to the metadata sections for screenshots of clamps, edit conditions and inline toggles in the Details panel.',
    },
    {
      title: 'Unreal Engine UProperties',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-uproperties',
      source: 'unreal-docs',
      note: 'Explains how property specifiers and metadata relate, with the official syntax.',
    },
  ],
};
