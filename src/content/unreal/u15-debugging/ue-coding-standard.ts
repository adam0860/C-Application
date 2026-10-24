import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-coding-standard',
  title: 'Epic\'s Coding Standard and Performance Habits',
  summary:
    'Write code that reads like the engine\'s own — and the everyday habits that keep it fast to compile and fast to run.',
  minutes: 18,
  objectives: [
    'Apply Epic\'s naming rules: prefixes, `b` booleans, question-style bool functions and `Out` parameters',
    'Follow Epic\'s formatting and language rules: braces, tabs, `const`, `auto`, `nullptr` and `override`',
    'Use forward declarations and include-what-you-use to keep headers light, and explain why it speeds up builds',
    'Apply performance habits: avoid Tick and repeated lookups, `Reserve` arrays, pass `FString` by const reference, use `MoveTemp`',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Why the engine has a dialect',
      blocks: [
        {
          type: 'p',
          text: 'Unreal Engine is millions of lines of C++ written by hundreds of engineers over decades, and extended by thousands of studios. The [[coding-standard|Epic C++ Coding Standard]] is what makes that readable: once you know it, engine source looks like your own code, and your code looks familiar to every Unreal programmer you will ever work with.',
        },
        {
          type: 'p',
          text: 'Some rules are pure convention. Others are load-bearing: [[unreal-header-tool|UnrealHeaderTool]] rejects reflected classes with the wrong prefix, and the editor strips the `b` from boolean property names to build display names. Learning the standard is partly learning how the tools think.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why consistency beats personal preference',
          text: 'Code is read far more often than it is written — in reviews, in diffs, while debugging at 2 a.m. A shared style removes a whole category of noise from those moments: nobody has to decode a new naming scheme, and diffs show real changes instead of reformatting. Many studios that license Unreal adopt Epic\'s standard for exactly this reason, so knowing it is also a hiring signal.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Let tools do the formatting',
          text: 'JetBrains Rider ships with an Unreal Engine code-style preset, and Visual Studio can be configured to match. Set it up once and spend your attention on the rules a formatter cannot check, like naming and const correctness.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Names that carry meaning',
      blocks: [
        {
          type: 'p',
          text: 'You already know the type prefixes from the naming lesson: `U` for UObjects, `A` for actors, `F` for plain structs and classes, `T` for templates, `E` for enums, `I` for interfaces, `S` for Slate widgets. The rest of Epic\'s naming rules are about making *intent* visible:',
        },
        {
          type: 'code',
          title: 'HealthComponent.h (excerpt)',
          code: `public:
    UFUNCTION(BlueprintPure, Category = "Health")
    bool IsDead() const;

    UFUNCTION(BlueprintPure, Category = "Health")
    bool CanBeHealed() const;

    void ApplyDamage(float DamageAmount);

    bool FindNearestMedic(AActor*& OutMedic,
        float& OutDistance) const;

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Health")
    float MaxHealth = 100.f;

    UPROPERTY(EditDefaultsOnly, Category = "Health")
    bool bCanRegenerate = true;`,
          annotations: [
            { lines: [3, 6], text: 'Functions returning `bool` ask a yes/no question: `IsDead`, `CanBeHealed`, `ShouldRespawn`, `HasAmmo`. A reader can tell what `true` means without opening the implementation.' },
            { lines: 8, text: 'Functions that do something are a strong verb plus an object: `ApplyDamage`, `FireWeapon`, `SpawnWave`.' },
            { lines: '10-11', text: 'Parameters the function writes to get an `Out` prefix, so call sites read honestly: `FindNearestMedic(Medic, Distance)` would hide the fact that both arguments are modified.' },
            { lines: 15, text: 'Everything is PascalCase — types, functions, members, locals and parameters alike. No `m_` prefixes, no `snake_case`.' },
            { lines: 18, text: 'Booleans start with a lowercase `b`. The editor removes it for the Details panel, so this shows as "Can Regenerate".' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Two small refinements',
          text: 'A boolean output parameter puts the `b` first: `bOutWasBlocked`. And names should be specific enough to survive out of context — `TimeSinceLastShot` beats `Timer`, `TargetActor` beats `Actor`.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which declaration block follows Epic\'s naming conventions?',
      codeOptions: true,
      options: [
        {
          text: `bool isReloading;
bool getIsReloading() const;
void reload_weapon();`,
          why: 'camelCase and snake_case are both foreign to Unreal code. Members, functions and locals are PascalCase, and booleans take a `b` prefix.',
        },
        {
          text: `bool m_bReloading;
bool CheckReload() const;
void DoReload();`,
          why: 'Epic does not use `m_` member prefixes, `CheckReload` does not read as a yes/no question, and `DoReload` adds an empty verb.',
        },
        {
          text: `bool bIsReloading;
bool IsReloading() const;
void ReloadWeapon();`,
          correct: true,
          why: 'PascalCase throughout, a `b`-prefixed boolean, a question-style bool getter and a verb-plus-object action.',
        },
        {
          text: `bool Reloading;
bool Reloading() const;
void Reload_Weapon();`,
          why: 'The boolean is missing its `b` (and now clashes with the function name), and underscores are not used in Unreal names.',
        },
      ],
      explanation:
        'Epic\'s conventions make roles visible at a glance: `b` marks booleans (and lets the editor build nice display names), question-style names mark bool functions, and verb-object names mark actions. Consistency is the point — the whole engine reads this way.',
    },
    {
      kind: 'concept',
      title: 'Formatting: braces, tabs and the "goto fail" lesson',
      blocks: [
        {
          type: 'p',
          text: 'Epic puts **braces on their own lines**, indents with **tabs** (displayed four columns wide), and — the rule with the strongest reason behind it — **always uses braces**, even around a single statement.',
        },
        {
          type: 'compare',
          left: {
            title: 'Not Epic style',
            tone: 'bad',
            code: `if (bIsDead) return;

for (AActor* Enemy : Enemies) {
    if (IsValid(Enemy))
        Enemy->Alert();
}`,
          },
          right: {
            title: 'Epic style',
            tone: 'good',
            code: `if (bIsDead)
{
    return;
}

for (AActor* Enemy : Enemies)
{
    if (IsValid(Enemy))
    {
        Enemy->Alert();
    }
}`,
          },
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Why mandatory braces: Apple\'s "goto fail"',
          text: 'In 2014 a security flaw in Apple\'s SSL code came down to two lines: an `if` without braces followed by a duplicated `goto fail;`. The indentation made both look conditional, but only the first one was — the second always ran, skipping certificate verification. With mandatory braces the duplicated line would have sat harmlessly inside the block. Braces also keep diffs clean: adding a second statement never has to touch the line with the condition.',
        },
        {
          type: 'p',
          text: 'Tabs let every programmer pick their visual indent width while the file stays identical, and brace-per-line layout makes the start and end of every block line up vertically. Neither affects the compiled code; both affect how quickly the next reader understands it.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Epic\'s coding standard allows leaving out the braces around a single-statement `if` body, as long as the statement is short.',
      answer: false,
      explanation:
        'The standard asks for braces in single-statement blocks too. Unbraced bodies invite the "goto fail" class of bug — a line that looks conditional but is not — and they make future edits noisier, since adding a statement means restructuring the block.',
    },
    {
      kind: 'concept',
      title: 'const correctness, the Epic way',
      blocks: [
        {
          type: 'p',
          text: 'Epic\'s standard treats `const` as documentation as much as a compiler directive, and asks for all code to be const-correct: mark everything that does not change as `const`, and let the compiler enforce the promise.',
        },
        {
          type: 'code',
          title: 'InventoryComponent.h (excerpt)',
          code: `public:
    int32 GetItemCount(FName ItemId) const;

    const TArray<FItemStack>& GetItems() const
    {
        return Items;
    }

    void AddItems(const TArray<FItemStack>& NewItems);

    float GetWeightOf(const UItemData* Item) const;

    TArray<FItemStack> GetSortedItems() const;`,
          annotations: [
            { lines: 2, text: 'A `const` member function promises not to modify the object. It can be called on a `const` inventory — and the compiler rejects any accidental write inside it.' },
            { lines: '4-7', text: 'Return a const reference to internal data when the caller only needs to read it: no copy is made, and the caller cannot modify your array through it.' },
            { lines: 9, text: 'Non-trivial parameters you only read are passed by `const&`, avoiding a copy of the whole array.' },
            { lines: 11, text: 'A pointer to `const`: this function may look at the item asset but cannot change it.' },
            { lines: 13, text: 'Returning a new array by value is fine — but never as `const TArray<...>`. A `const` return value cannot be moved from, so the caller is forced into a copy.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Never put const on a by-value return type',
          text: 'Epic\'s standard is explicit: a `const` return type inhibits [[move-semantics]] for complex types (and is pointless for built-in ones). The rule is about the returned object itself; returning a reference or pointer *to* const, as `GetItems()` does, is encouraged.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This header compiles, but one declaration breaks an explicit rule of Epic\'s standard and costs performance. Tap it.',
      code: `UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class MYGAME_API UInventoryComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    int32 GetItemCount(FName ItemId) const;
    const TArray<FItemStack> GetItemsSnapshot() const;
    bool HasItem(FName ItemId) const;
    void AddItem(const FItemStack& Stack);
};`,
      bugLines: [8],
      hint: 'Look at what is `const` in each return type.',
      explanation:
        'Line 8 returns a `const` array **by value**. A const temporary cannot bind to the move constructor, so `TArray<FItemStack> Copy = Inv->GetItemsSnapshot();` must copy every element again. Either drop the `const` (return a plain `TArray<FItemStack>` the caller can move from) or return `const TArray<FItemStack>&` if a snapshot copy is not actually needed.',
    },
    {
      kind: 'concept',
      title: 'auto, nullptr and override',
      blocks: [
        {
          type: 'p',
          text: '**`auto`** is discouraged. Epic allows it in three places only: when binding a lambda to a variable (the type cannot be written), for very verbose iterator types, and in template code where the type is hard to name. Everywhere else, spell the type out.',
        },
        {
          type: 'compare',
          left: {
            title: 'Hidden types, hidden copies',
            tone: 'bad',
            code: `auto Item = Inventory->GetItems()[0];
auto Target = FindTarget();
for (auto Stack : Items) { /* ... */ }`,
            text: '`auto` deduces by value: `Item` and every `Stack` are *copies*. And is `Target` an `AActor*`, a `TWeakObjectPtr` or an `FHitResult`? You cannot tell from here.',
          },
          right: {
            title: 'Explicit types',
            tone: 'good',
            code: `const FItemStack& Item =
    Inventory->GetItems()[0];
AActor* Target = FindTarget();
for (const FItemStack& Stack : Items) { /* ... */ }`,
            text: 'The reader sees exactly what each variable is, and that nothing is copied.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why so strict about auto?',
          text: 'Your IDE can show a deduced type — but only when the code compiles and only inside the IDE. Code reviews, diffs, merge tools and crash call stacks show raw text. Epic optimizes for the reader who does *not* have IntelliSense, and for avoiding the silent copies that `auto`\'s by-value deduction produces.',
        },
        {
          type: 'p',
          text: '**`nullptr`, never `NULL`.** `NULL` is a macro for an integer zero, so it can pick the wrong overload or convert silently to a number; `nullptr` has its own type that only converts to pointers.',
        },
        {
          type: 'p',
          text: '**Overrides use both `virtual` and [[override]].** The `override` keyword turns a silent mistake into a compile error:',
        },
        {
          type: 'code',
          title: 'MyActor.h',
          code: `// Missing const: without 'override' this would quietly
// declare a NEW function, and replication would be broken.
virtual void GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) override;

// Correct signature
virtual void GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps)
    const override;`,
          annotations: [
            { lines: '3-4', text: 'With `override`, the compiler reports that this matches no base-class function, because the engine\'s version is `const`. Without it, you would have an unrelated function that the engine never calls.' },
            { lines: '7-9', text: 'Matches `AActor::GetLifetimeReplicatedProps` exactly. Signatures also change between engine versions, and `override` flags every affected function when you upgrade.' },
          ],
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the declarations in Epic style.',
      template: `UCLASS()
class MYGAME_API AChest : public AActor
{
    GENERATED_BODY()

protected:
    virtual void BeginPlay() ___;

    UPROPERTY(VisibleInstanceOnly, Category = "Chest")
    TObjectPtr<AActor> LastOpener = ___;

    void LogContents() const;
};

void AChest::LogContents() const
{
    for (___ FItemStack& Stack : Contents)
    {
        UE_LOG(LogTemp, Log, TEXT("%s"), *Stack.ToString());
    }
}`,
      blanks: [{ answers: ['override'] }, { answers: ['nullptr'] }, { answers: ['const'] }],
      wordBank: ['override', 'nullptr', 'const', 'NULL', 'auto', 'final', '0'],
      explanation:
        '`override` makes the compiler verify that `BeginPlay` really overrides `AActor::BeginPlay`. `nullptr` is the type-safe null that Epic requires instead of `NULL` or `0`. And inside a `const` function you can only read members, so the loop binds each element by `const&` — readable, enforced, and copy-free.',
    },
    {
      kind: 'concept',
      title: 'Include what you use, forward-declare the rest',
      blocks: [
        {
          type: 'p',
          text: 'Remember that `#include` is a textual paste. Every header you include in *your* header is pasted into every `.cpp` that includes yours — and into everything that includes *those*. Worse, when a header changes, every file that (directly or indirectly) includes it must recompile. In a big project, one careless include can turn a 10-second build into a 10-minute one.',
        },
        {
          type: 'code',
          title: 'Turret.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Turret.generated.h"

class UStaticMeshComponent;
class UHealthComponent;
class AProjectile;

UCLASS()
class MYGAME_API ATurret : public AActor
{
    GENERATED_BODY()

protected:
    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<UStaticMeshComponent> BarrelMesh;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<UHealthComponent> HealthComponent;

    UPROPERTY(EditDefaultsOnly, Category = "Weapon")
    TSubclassOf<AProjectile> ProjectileClass;
};`,
          annotations: [
            { lines: 3, text: 'Basic types (`FVector`, `FString`, `TArray`…) without pulling in the whole engine.' },
            { lines: 4, text: 'The base class must be complete, so its header is required.' },
            { lines: 5, text: 'Always the last include, as UHT requires.' },
            { lines: '7-9', text: '[[forward-declaration|Forward declarations]]: "these classes exist". That is enough for pointers, `TObjectPtr`, references and `TSubclassOf`, because their size does not depend on the class definition.' },
          ],
        },
        {
          type: 'code',
          title: 'Turret.cpp',
          code: `#include "Turret.h"
#include "Components/StaticMeshComponent.h"
#include "HealthComponent.h"
#include "Projectile.h"`,
          annotations: [
            { lines: '2-4', text: 'The full definitions are included only where they are actually used — in this one `.cpp`. Editing `HealthComponent.h` now recompiles `Turret.cpp`, but not the dozens of files that include `Turret.h`.' },
          ],
        },
        {
          type: 'p',
          text: 'You need the full header when the compiler must know a type\'s size or members: a base class, a member held **by value** (an `FMyStruct` field), or an inline function body in the header that calls into the type. Everything else can be forward-declared. Unreal itself follows [[include-what-you-use]], and new projects\' Build.cs files are set up for it:',
        },
        {
          type: 'code',
          lang: 'csharp',
          title: 'MyGame.Build.cs (excerpt)',
          code: `PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;`,
          annotations: [
            { lines: 1, text: 'Precompiled headers are used as a build-speed optimization, but each file is still expected to include what it needs itself, so it compiles correctly on its own.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why this is a performance habit too',
          text: 'Compile time is developer time. Forward declarations shrink the amount of text the compiler parses per file and, more importantly, cut the dependency chains that decide how much must be rebuilt after each change. That is the difference between Live Coding feeling instant and a coffee break after every edit.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'In a header, which of these requires a full `#include` instead of a forward declaration?',
      codeOptions: true,
      options: [
        {
          text: `UPROPERTY(VisibleAnywhere)
TObjectPtr<UStaticMeshComponent> Mesh;`,
          why: 'A `TObjectPtr` is pointer-sized regardless of what it points to, so `class UStaticMeshComponent;` is enough.',
        },
        {
          text: `class MYGAME_API AHealthPickup
    : public APickupBase`,
          correct: true,
          why: 'A derived class contains its base class, so the compiler needs the base\'s full definition — size, members, virtual functions. Base classes always need their header.',
        },
        {
          text: `void HealTarget(UHealthComponent* Target);`,
          why: 'A pointer parameter in a declaration only needs to know the class exists. Include the full header in the `.cpp`, where the function body uses it.',
        },
        {
          text: `UPROPERTY(EditDefaultsOnly)
TSubclassOf<AProjectile> ProjectileClass;`,
          why: '`TSubclassOf` stores a `UClass*` internally; forward-declaring `AProjectile` is enough in the header.',
        },
      ],
      explanation:
        'The compiler needs a complete type whenever it must know the size or layout of an object of that type: base classes, by-value members, and code that dereferences it. Pointers, references, `TObjectPtr` and `TSubclassOf` are fixed-size handles, so a forward declaration suffices — keeping headers light and rebuilds small.',
    },
    {
      kind: 'concept',
      title: 'Performance habits I: don\'t do work you don\'t need',
      blocks: [
        {
          type: 'p',
          text: 'Most gameplay performance problems are not clever algorithms gone wrong; they are simple work repeated far more often than necessary — usually every frame, on every instance.',
        },
        {
          type: 'compare',
          left: {
            title: 'Searching every frame',
            tone: 'bad',
            code: `void ATurret::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    TArray<AActor*> Players;
    UGameplayStatics::GetAllActorsOfClass(this,
        AMyCharacter::StaticClass(), Players);

    UHealthComponent* Health =
        FindComponentByClass<UHealthComponent>();
    // ...
}`,
            text: 'An actor search, an array allocation and a component search — per turret, per frame.',
          },
          right: {
            title: 'Cache once, react to events',
            tone: 'good',
            code: `void ATurret::BeginPlay()
{
    Super::BeginPlay();

    // Look up once; keep it in a UPROPERTY
    HealthComponent =
        FindComponentByClass<UHealthComponent>();

    // Re-evaluate targets 4x/s, not every frame
    GetWorldTimerManager().SetTimer(RetargetTimer,
        this, &ATurret::Retarget, 0.25f, true);
}`,
            text: 'The component is found once. Targets come from a registry or overlap events, refreshed on a timer.',
          },
        },
        {
          type: 'list',
          items: [
            '**Avoid Tick.** Set `PrimaryActorTick.bCanEverTick = false` in the constructor unless the actor truly needs per-frame work; prefer timers, delegates and overlap events (the Tick performance lesson covers this in depth).',
            '**Cache component pointers.** `FindComponentByClass` walks the actor\'s component list each call. Look it up in `BeginPlay`, or better, create the component yourself and keep the pointer.',
            '**Keep `GetAllActorsOfClass` out of hot paths.** Its own documentation calls it a slow operation not to be used every frame. Have actors register with a [[subsystem|subsystem]] or manager in `BeginPlay` and unregister in `EndPlay`, then query that list.',
          ],
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Performance habits II: memory, copies and moves',
      blocks: [
        {
          type: 'code',
          title: 'QuestLog.cpp',
          code: `void UQuestLog::AddEntry(const FString& Text, FName QuestId)
{
    FQuestEntry Entry;
    Entry.Text = Text;
    Entry.QuestId = QuestId;
    Entries.Add(MoveTemp(Entry));
}

void UQuestLog::RebuildVisibleIds()
{
    VisibleIds.Reset();
    VisibleIds.Reserve(Entries.Num());

    for (const FQuestEntry& Entry : Entries)
    {
        if (Entry.bIsVisible)
        {
            VisibleIds.Add(Entry.QuestId);
        }
    }
}`,
          annotations: [
            { lines: 1, text: '[[fstring|FString]] owns a heap buffer, so passing it by value allocates and copies. Pass it by `const&`. [[fname|FName]] is just an index into the global name table, so it is passed by value.' },
            { lines: 6, text: '`MoveTemp` is Unreal\'s [[std-move|std::move]]: the entry\'s string buffer is handed to the array instead of copied.' },
            { lines: 11, text: '`Reset()` empties the array but keeps its allocation for reuse; `Empty()` would free it.' },
            { lines: 12, text: '`Reserve` allocates room for every element up front. Without it, `Add` would periodically reallocate and move the whole array as it grows — exactly like `std::vector::reserve`.' },
            { lines: 14, text: 'Iterate by `const&`: no per-element copies.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why MoveTemp instead of std::move?',
          text: '`MoveTemp` adds two `static_assert`s that `std::move` lacks: it refuses to compile when called on a `const` object (which would silently copy instead of move) or on something that is already an rvalue (a pointless move). It turns two common "I thought this moved" mistakes into compile errors. `MoveTempIfPossible` is the lenient version for generic code.',
        },
        {
          type: 'list',
          items: [
            '`RemoveAtSwap` removes in O(1) by moving the last element into the hole — ideal when order does not matter. `RemoveAt` shifts everything after the index.',
            'Small, short-lived arrays can avoid the heap entirely with an inline allocator: `TArray<AActor*, TInlineAllocator<8>>`.',
            'Build strings with `FString::Printf` or `Appendf` once, rather than chaining `+` in a loop.',
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Habits, then measurement',
          text: 'These habits cost nothing to follow and prevent death by a thousand cuts. But when a real performance problem appears, measure first — `stat unit` to find the bottleneck thread, then Unreal Insights to find the function — before rewriting anything.',
        },
      ],
    },
    {
      kind: 'mcq',
      multi: true,
      prompt: 'This runs in `Tick` on 50 enemies. Select **all** the performance problems.',
      code: `void AEnemy::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    TArray<AActor*> Allies;
    UGameplayStatics::GetAllActorsOfClass(this,
        AEnemy::StaticClass(), Allies);

    UHealthComponent* Health =
        FindComponentByClass<UHealthComponent>();

    UpdateNameplate(DisplayName); // FString member, by value

    const FVector& MyLocation = GetActorLocation();
}`,
      options: [
        {
          text: 'Calling `GetAllActorsOfClass` every frame',
          correct: true,
          why: 'A world search plus an array allocation, 50 times per frame. Keep a registry of enemies instead, updated in BeginPlay/EndPlay.',
        },
        {
          text: 'Calling `FindComponentByClass` every frame',
          correct: true,
          why: 'The component does not change; look it up once and store it in a UPROPERTY.',
        },
        {
          text: 'Passing an `FString` by value to `UpdateNameplate` every frame',
          correct: true,
          why: 'Each call copies the `DisplayName` member into a new heap allocation for the parameter. Take `const FString&` — and ideally only update the nameplate when the name changes.',
        },
        {
          text: 'Binding `GetActorLocation()` to a `const FVector&`',
          why: 'Harmless: binding a const reference to the returned temporary extends its lifetime. `FVector` is small, so a plain `const FVector` would be just as fine.',
        },
      ],
      explanation:
        'Three of the four lines do repeated work that could be done once or not at all: a world-wide search, a component lookup and a string copy, each multiplied by 50 enemies and 60+ frames per second. The `const FVector&` line is not a problem. Spotting "work that does not need to happen every frame" is the most valuable performance skill in gameplay code.',
    },
    {
      kind: 'truefalse',
      prompt: 'Like `std::move`, calling `MoveTemp` on a `const FString` compiles and silently falls back to a copy.',
      answer: false,
      explanation:
        '`std::move` on a const object compiles and quietly copies, because a `const T&&` cannot bind to a move constructor. `MoveTemp` contains a `static_assert` that rejects const arguments (and another that rejects rvalues), so the mistake becomes a compile error instead of a hidden performance bug.',
    },
  ],
  takeaways: [
    'Use the type prefixes, PascalCase everywhere, `b` for booleans, question-style bool functions and `Out` for output parameters.',
    'Braces go on their own lines and are always used — even for one statement; indent with tabs.',
    'Be const-correct, but never return a `const` value by value; spell out types instead of using `auto`; use `nullptr` and `virtual ... override`.',
    'Forward-declare in headers and include full headers in `.cpp` files — shorter dependency chains mean faster builds.',
    'Avoid per-frame work: disable unneeded Tick, cache component pointers, keep `GetAllActorsOfClass` out of hot paths.',
    '`Reserve` arrays you are about to fill, pass `FString` by `const&` (`FName` by value), and use `MoveTemp` to hand off buffers.',
  ],
  reading: [
    {
      title: 'Epic C++ Coding Standard',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine',
      source: 'unreal-docs',
      note: 'The full standard: naming, formatting, const, auto, physical dependencies and modern C++ usage.',
    },
    {
      title: 'Header files',
      url: 'https://www.learncpp.com/cpp-tutorial/header-files/',
      source: 'learncpp',
      note: 'A refresher on how includes paste text and why minimizing them in headers matters.',
    },
    {
      title: 'std::move',
      url: 'https://en.cppreference.com/w/cpp/utility/move',
      source: 'cppreference',
      note: 'The standard function MoveTemp mirrors; compare its silent behavior on const objects.',
    },
  ],
};
