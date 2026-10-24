import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-pointer-types',
  title: 'TObjectPtr, Raw and Weak Object Pointers',
  summary:
    'How each kind of UObject pointer interacts with the garbage collector, why untracked pointers dangle, and how to pick the right one every time.',
  minutes: 17,
  objectives: [
    'Explain what the garbage collector can and cannot see, and why that depends on `UPROPERTY`',
    'Diagnose the classic crash caused by an untracked UObject pointer',
    'Describe what `TObjectPtr` adds in editor builds and why it costs nothing in shipping builds',
    'Use `TWeakObjectPtr` to observe objects you do not own, and `IsValid()` to handle destroyed objects',
    'Choose the right pointer type for members, parameters, locals and non-UObject classes',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Same address, different promises',
      blocks: [
        {
          type: 'p',
          text: 'In standard C++, ownership is written into the type: a `std::unique_ptr` owns, a raw pointer merely observes, and the object dies when its owner goes out of scope. [[uobject|UObjects]] work differently. Nobody calls `delete` on them; the [[ue-garbage-collector]] destroys an object once it is no longer **reachable** from the root set (the world, loaded levels, objects flagged as roots).',
        },
        {
          type: 'p',
          text: 'The collector finds references using [[reflection]]: it walks every `UPROPERTY` that holds an object pointer. That makes one question decide everything about a UObject pointer: **can the garbage collector see it?** Four declarations that all hold "an address of an actor" make four different promises:',
        },
        {
          type: 'table',
          headers: ['Declaration', 'GC sees it?', 'Keeps object alive?', 'After the object is destroyed'],
          rows: [
            ['`AActor* Target;`', 'No', 'No', 'Still holds the old address — **dangles** once memory is freed'],
            ['`UPROPERTY() AActor* Target;`', 'Yes', 'Yes', 'Set to `nullptr` by the GC at its next run'],
            ['`UPROPERTY() TObjectPtr<AActor> Target;`', 'Yes', 'Yes', 'Set to `nullptr` by the GC — plus editor-only features'],
            ['`TWeakObjectPtr<AActor> Target;`', 'Doesn\'t need to', 'No', '`Get()` returns `nullptr` immediately'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why can\'t the GC just scan memory for pointers?',
          text: 'A C++ pointer is just 8 bytes. In raw memory, an address is indistinguishable from an integer, a float bit pattern, or leftover garbage — C++ keeps no runtime record of which bytes are pointers. Collectors that scan memory anyway ("conservative" GCs) can never move objects and keep garbage alive by accident. Unreal instead uses the precise type information that [[unreal-header-tool|UHT]] generates for `UPROPERTY` members. The price is that an unreflected pointer is simply invisible.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Actors are a special case',
          text: 'A spawned [[actor]] is also referenced by its level, so it stays alive even if none of *your* pointers keep it. It dies when someone calls `Destroy()`. Plain UObjects created with [[newobject|NewObject]] have no such safety net: if nothing reachable references them, the next collection frees them. Note that an object\'s [[outer|Outer]] does **not** keep it alive.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The classic crash: an untracked pointer',
      blocks: [
        {
          type: 'p',
          text: 'Here is one of the most common crashes in Unreal C++. A shopkeeper creates its inventory object in `BeginPlay` and stores it in a member that has no `UPROPERTY`. Everything works in testing... for about a minute.',
        },
        {
          type: 'code',
          title: 'Shopkeeper.h',
          code: `UCLASS()
class MYGAME_API AShopkeeper : public AActor {
    GENERATED_BODY()

protected:
    virtual void BeginPlay() override;

private:
    // BUG: invisible to the garbage collector
    UInventory* Stock = nullptr;

    // FIX: reflected, so the GC sees the reference
    UPROPERTY()
    TObjectPtr<UInventory> SafeStock;
};`,
          annotations: [
            { lines: 10, text: 'Nothing tells the collector this pointer exists. As far as the GC knows, the inventory created in `BeginPlay` is referenced by nobody.' },
            { lines: '13-14', text: 'An empty `UPROPERTY()` is enough: no editor exposure, but full GC tracking. The object stays alive as long as the shopkeeper does.' },
          ],
        },
        {
          type: 'code',
          title: 'Shopkeeper.cpp',
          code: `void AShopkeeper::BeginPlay() {
    Super::BeginPlay();
    Stock = NewObject<UInventory>(this);
    SafeStock = NewObject<UInventory>(this);
}

void AShopkeeper::OpenShop() {
    Stock->ListItems();      // fine... until the next GC
    SafeStock->ListItems();  // always fine
}`,
          annotations: [
            { lines: 3, text: 'Passing `this` as the Outer does not protect the object: outers are for naming and ownership hierarchy, not for keeping inners alive.' },
            { lines: 8, text: 'After garbage collection frees the first inventory, `Stock` still holds its old address. Calling through it is a use-after-free: [[undefined-behavior]], usually a crash, sometimes silent corruption.' },
          ],
        },
        {
          type: 'memory',
          caption: 'After the next garbage collection',
          regions: [
            {
              label: 'AShopkeeper (on the UObject heap)',
              kind: 'heap',
              cells: [
                { name: 'Stock', type: 'UInventory*', value: '0x1F40', pointsTo: 'freed', highlight: true },
                { name: 'SafeStock', type: 'TObjectPtr<UInventory>', value: '0x2A80', pointsTo: 'alive' },
              ],
            },
            {
              label: 'UObject heap',
              kind: 'heap',
              cells: [
                { id: 'freed', address: '0x1F40', value: 'freed memory (collected)', highlight: true },
                { id: 'alive', address: '0x2A80', type: 'UInventory', value: 'alive: reachable via UPROPERTY' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Why it "works for a minute"',
          text: 'By default the engine runs a full garbage collection roughly once a minute (and on level transitions), so the crash appears long after the real mistake. To flush such bugs out quickly, force a collection with the console command `obj gc`, or set `gc.CollectGarbageEveryFrame 1` while testing. If a crash disappears when you add `UPROPERTY()`, you have found your bug.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'IsValid() cannot rescue a dangling pointer',
          text: '`IsValid(Stock)` reads the object\'s flags — from memory that has already been freed. That is itself undefined behaviour, and it may even return `true` by chance. Validity checks only work on pointers the engine maintains (tracked or weak). The fix is to track the pointer, not to check it harder.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'bug',
      prompt: 'This quest giver crashes when a player talks to it, but only after the level has been running for a while. Tap the line that causes the crash.',
      code: `UCLASS()
class MYGAME_API AQuestGiver : public AActor {
    GENERATED_BODY()

public:
    void Talk();

protected:
    virtual void BeginPlay() override;

    UPROPERTY(EditAnywhere, Category = "Quest")
    FText Greeting;

    UQuestLog* QuestLog = nullptr;
};

// .cpp
void AQuestGiver::BeginPlay() {
    Super::BeginPlay();
    QuestLog = NewObject<UQuestLog>(this);
}`,
      bugLines: [14],
      hint: 'Which object pointer can the garbage collector not see?',
      explanation:
        '`QuestLog` (line 14) has no `UPROPERTY`, so the collector does not know the quest giver references the object created in `BeginPlay`. At the next garbage collection the `UQuestLog` is freed, `QuestLog` dangles, and the next `Talk()` dereferences freed memory. Declare it as `UPROPERTY() TObjectPtr<UQuestLog> QuestLog;`. Note that `Greeting` needs its `UPROPERTY` only for editor exposure — `FText` is not a UObject and is not garbage collected.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'TObjectPtr: the UE5 member pointer',
      blocks: [
        {
          type: 'p',
          text: 'Unreal Engine 5 introduced [[tobjectptr|TObjectPtr<T>]] as the recommended type for UObject pointers stored in `UPROPERTY` members. It behaves like a raw pointer — you dereference it with `->`, compare it, pass it to `Cast` and `IsValid` — and converts implicitly to `T*`.',
        },
        {
          type: 'code',
          title: 'WeaponRack.h',
          code: `UCLASS()
class MYGAME_API AWeaponRack : public AActor {
    GENERATED_BODY()

public:
    AWeaponRack();

    void Display(AWeapon* Weapon);
    AWeapon* GetDisplayed() const { return Displayed; }

private:
    UPROPERTY(VisibleAnywhere, Category = "Rack")
    TObjectPtr<UStaticMeshComponent> RackMesh;

    UPROPERTY(EditInstanceOnly, Category = "Rack")
    TObjectPtr<AWeapon> Displayed;

    UPROPERTY()
    TArray<TObjectPtr<AWeapon>> Stored;
};`,
          annotations: [
            { lines: 8, text: 'Parameters use plain `T*`. The caller already keeps the object alive for the duration of the call.' },
            { lines: 9, text: 'Returning a member: `TObjectPtr<AWeapon>` converts implicitly to `AWeapon*`.' },
            { lines: '12-13', text: 'Component pointers created with [[createdefaultsubobject|CreateDefaultSubobject]] are members like any other — `TObjectPtr` plus `UPROPERTY`.' },
            { lines: '18-19', text: 'Containers of object pointers are tracked too, as long as the container itself is a `UPROPERTY`.' },
          ],
        },
        {
          type: 'definition',
          term: 'What TObjectPtr adds',
          text: '**In editor builds**, `TObjectPtr` can record when an object is accessed (access tracking, used for example to discover which assets a cook depends on) and can support **lazy loading**: holding a reference to an object that has not been loaded yet and resolving it on first use. **In cooked and shipping builds**, it compiles down to a plain pointer: same size, same speed, zero overhead.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'TObjectPtr does not keep anything alive',
          text: 'It is easy to assume a templated pointer is a "smart" pointer that manages lifetime. It is not. `UPROPERTY` is what makes the reference visible to the collector. A `TObjectPtr<UInventory>` member *without* `UPROPERTY` dangles exactly like a raw pointer.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why members only, and raw pointers elsewhere?',
          text: 'The editor features exist for **stored** references — data that gets serialized, cooked and loaded. A function parameter or local variable lives for a few microseconds and is never saved, so wrapping it would only add editor-build overhead and conversion noise. Epic\'s convention: `TObjectPtr` for `UPROPERTY` members in headers, `T*` for parameters, return values and locals.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'UE4 code',
          text: 'Unreal Engine 4 used raw pointers for everything: `UPROPERTY() AWeapon* Displayed;`. That still compiles and is still tracked in UE5 — tracking always came from `UPROPERTY` — but it loses the editor features. Epic shipped a conversion tool (UnrealObjectPtrTool) to migrate old headers.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'mcq',
      codeOptions: true,
      prompt: 'An actor creates a `UItem` with `NewObject<UItem>(this)` and stores it in a member. Nothing else references the item. Which member declaration keeps the item alive?',
      options: [
        { text: 'TObjectPtr<UItem> Item;', why: '`TObjectPtr` alone is not tracked. Without `UPROPERTY`, the collector never sees the reference and will free the item.' },
        { text: 'UItem* Item;', why: 'A plain raw pointer is invisible to the garbage collector — the classic dangling-pointer bug.' },
        { text: 'TWeakObjectPtr<UItem> Item;', why: 'A weak pointer deliberately does *not* keep its target alive. The item would be collected and `Item.Get()` would return null.' },
        { text: 'UPROPERTY()\nTObjectPtr<UItem> Item;', correct: true, why: '`UPROPERTY` exposes the reference to reflection, so the GC treats the item as reachable for as long as the actor is.' },
      ],
      explanation:
        'Two separate ideas are at work. **Tracking** comes from `UPROPERTY`: only reflected references count towards reachability. **Strength** comes from the pointer type: strong pointers keep objects alive, weak pointers do not. To own a UObject from a UObject, you need both: a `UPROPERTY` and a strong pointer type (`TObjectPtr`, or a raw `T*` in older code).',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'TWeakObjectPtr: observing without owning',
      blocks: [
        {
          type: 'p',
          text: 'Often you need to refer to an object you do **not** own and that may disappear at any moment: the enemy a turret is tracking, the actor that last damaged you, the pawn a UI widget displays. You want the pointer to become null when the object dies, without your reference keeping it alive. That is [[tweakobjectptr|TWeakObjectPtr<T>]].',
        },
        {
          type: 'code',
          title: 'Turret.cpp',
          code: `// In Turret.h:  TWeakObjectPtr<AActor> CurrentTarget;

void ATurret::SetTarget(AActor* NewTarget) {
    CurrentTarget = NewTarget;
}

void ATurret::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);

    AActor* Target = CurrentTarget.Get();
    if (!Target) {
        FindNewTarget();
        return;
    }
    AimAt(Target->GetActorLocation(), DeltaTime);
}`,
          annotations: [
            { lines: 1, text: 'No `UPROPERTY` needed: a weak pointer is not something the GC must follow. (You *may* mark it `UPROPERTY` for editor display or serialization.)' },
            { lines: 4, text: 'Assigning from a raw pointer records which object this is — not just its address.' },
            { lines: 10, text: '`Get()` returns the object, or `nullptr` if it has been destroyed or collected. Call it once and keep the raw pointer for the rest of the function: garbage collection does not run in the middle of your game-thread code.' },
            { lines: '11-14', text: 'Because the weak pointer already filters dead objects, a null check is all you need here.' },
          ],
        },
        {
          type: 'memory',
          caption: 'A weak pointer stores a slot index and a serial number, not an address',
          regions: [
            {
              label: 'ATurret',
              kind: 'heap',
              cells: [
                { name: 'CurrentTarget', type: 'TWeakObjectPtr<AActor>', value: 'Index 4127, Serial 88', pointsTo: 'slot' },
              ],
            },
            {
              label: 'GUObjectArray (every UObject has a slot)',
              kind: 'static',
              cells: [
                { id: 'slot', name: '[4127]', value: 'Serial 88 → AEnemy at 0x5C10', highlight: true },
                { name: '[4128]', value: 'Serial 12 → UInventory at 0x5D20' },
              ],
            },
          ],
        },
        {
          type: 'p',
          text: 'When the enemy is collected, slot 4127 is emptied; when the slot is later reused for a new object, it gets a new serial number. `Get()` compares serials, so an old weak pointer can never accidentally resolve to the new object. It is the same index-plus-serial trick as `FTimerHandle`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not a strong UPROPERTY pointer to the target?',
          text: 'A strong reference states "I need this to exist". For a non-actor object, that keeps it alive long after everyone else has finished with it. For an actor, `Destroy()` still ends it, but your pointer stays non-null until the next collection, so every use needs an extra validity check. A weak pointer states the truth — "I am interested in this, but I do not own it" — and its `Get()` filters out destroyed objects for you.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Bridge to standard C++',
          text: 'Conceptually this is `std::weak_ptr`: a non-owning observer that knows when its target is gone. The mechanism differs — `std::weak_ptr` relies on a shared control block with a reference count, while `TWeakObjectPtr` asks the global object array — because UObject lifetime is decided by reachability, not by counting owners.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: 'Storing an actor in a `TWeakObjectPtr` keeps that actor from being garbage collected until the weak pointer is reset.',
      answer: false,
      explanation:
        'Weak pointers are invisible to reachability by design — that is what "weak" means. The target lives or dies based on its strong references (and, for actors, on whether `Destroy()` has been called). The weak pointer only observes: `Get()` returns the object while it is alive and `nullptr` afterwards.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'IsValid() and the gap between Destroy and GC',
      blocks: [
        {
          type: 'p',
          text: 'Destroying an actor and freeing its memory are two separate events. Understanding the gap between them explains why Unreal code is full of [[isvalid|IsValid()]] calls:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Frame 100: `Enemy->Destroy()`', text: 'The actor ends play, is removed from its level, and is **marked as garbage**. Its memory is untouched.' },
            { title: 'Frames 100 to ~3,700: the gap', text: 'Strong `UPROPERTY` pointers to the enemy are still non-null. The object is still readable, but it is no longer part of the game. Weak pointers already return `nullptr`.' },
            { title: 'Next garbage collection', text: 'The GC frees the object and sets every tracked `UPROPERTY` reference to it to `nullptr`. Untracked raw pointers are not updated — they dangle.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Null check only',
            tone: 'bad',
            code: `if (LockedTarget) {
    // true for a destroyed-but-
    // not-yet-collected actor
    FireAt(LockedTarget);
}`,
            text: 'During the gap, the pointer is non-null, so the turret fires at a corpse that is no longer in the world.',
          },
          right: {
            title: 'IsValid',
            tone: 'good',
            code: `if (IsValid(LockedTarget)) {
    // non-null AND not marked
    // as garbage
    FireAt(LockedTarget);
}`,
            text: '`IsValid` returns false for null pointers *and* for objects marked as garbage.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not free the memory immediately?',
          text: 'Other systems may be holding the actor\'s address at that very moment: an iteration over overlapping actors, a delegate broadcast in progress, a physics callback. Freeing immediately would turn all of them into use-after-free bugs. Deferring destruction to a single, well-defined point (the collection) means pointers stay readable for the rest of the frame, and the GC can safely clear every tracked reference in one sweep.',
        },
        {
          type: 'list',
          items: [
            '`IsValid(Obj)` — the standard check: not null and not marked as garbage. Use it for tracked strong pointers.',
            '`WeakPtr.Get()` / `WeakPtr.IsValid()` — weak pointers apply the same filter internally.',
            '`IsValidLowLevel()` — an engine-internal sanity check of the object\'s registration; it is not a dangling-pointer detector and not what gameplay code wants.',
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Pending kill → garbage',
          text: 'UE4 called the destroyed-but-not-collected state *pending kill* (`IsPendingKill()`, `MarkPendingKill()`). UE5 renamed it to *garbage* (`MarkAsGarbage()`) and made `IsValid()` the recommended check. You will still see the old names in older tutorials.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'In the same frame, a grenade destroys an enemy, and then a turret runs this code. `LockedTarget` is declared `UPROPERTY() TObjectPtr<AEnemy> LockedTarget;` and pointed at that enemy. What happens?',
      code: `if (LockedTarget) {
    FireAt(LockedTarget->GetActorLocation());
}`,
      options: [
        { text: 'The condition is false, because `Destroy()` immediately sets all UPROPERTY references to null', why: 'References are cleared by the garbage collector at its next run, not by `Destroy()`. That can be many frames later.' },
        { text: 'The program crashes, because the enemy\'s memory has been freed', why: 'The memory is not freed until garbage collection. The pointer still refers to a readable object — which is exactly why the bug is subtle.' },
        { text: 'The condition is true and the turret fires at the destroyed enemy\'s last position', correct: true, why: 'The pointer is non-null during the Destroy/GC gap, so the check passes and the turret acts on a dead actor.' },
        { text: 'It does not compile: `TObjectPtr` cannot be used in a condition', why: '`TObjectPtr` converts to bool like a raw pointer; the code compiles.' },
      ],
      explanation:
        'Between `Destroy()` and the next garbage collection, tracked pointers to the actor remain non-null and the memory remains valid. A plain null check therefore passes, and the turret wastes a shot on a corpse. `IsValid(LockedTarget)` also rejects objects marked as garbage. Alternatively, store the target as a `TWeakObjectPtr`, whose `Get()` returns null as soon as the enemy is destroyed.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Choosing the right pointer',
      blocks: [
        {
          type: 'p',
          text: 'With the rules in place, choosing is mechanical. Ask two questions: *where does the pointer live* (a UObject member, a function, a plain C++ class?) and *do I own the target, or just observe it?*',
        },
        {
          type: 'table',
          headers: ['Situation', 'Use', 'Why'],
          rows: [
            ['UObject member that owns or needs the target', '`UPROPERTY() TObjectPtr<T>`', 'Tracked and strong; nulled by GC; editor features.'],
            ['Function parameter, return value, local', '`T*`', 'Short-lived; the caller keeps the object alive.'],
            ['Observe something you do not own (target, instigator, UI subject)', '`TWeakObjectPtr<T>`', 'Never keeps it alive; `Get()` returns null once it is gone.'],
            ['Captured in a lambda, timer or async callback', '`TWeakObjectPtr<T>` (or a weak lambda)', 'The callback may run after the object dies.'],
            ['Reference to an asset that may not be loaded yet', '`TSoftObjectPtr<T>`', 'Stores a path, not a loaded object — covered two lessons from now.'],
            ['A plain C++ (non-UObject) class that must keep a UObject alive', '`TStrongObjectPtr<T>` or implement `FGCObject`', 'Registers the reference with the GC without reflection.'],
            ['Non-UObject data', '`TUniquePtr` / `TSharedPtr`', 'Ordinary ownership — covered in the next lesson.'],
          ],
        },
        {
          type: 'code',
          title: 'DialogueRunner.h',
          code: `#include "UObject/StrongObjectPtr.h"

// A plain C++ class: no UCLASS, no reflection
class FDialogueRunner {
public:
    explicit FDialogueRunner(UDialogueAsset* InAsset)
        : Dialogue(InAsset) {}

    void Advance();

private:
    // Keeps the asset alive although we're invisible
    // to reflection
    TStrongObjectPtr<UDialogueAsset> Dialogue;
};`,
          annotations: [
            { lines: 3, text: 'An `F`-prefixed class cannot have `UPROPERTY` members, so the reflection-based tracking is not available.' },
            { lines: 14, text: '[[tstrongobjectptr|TStrongObjectPtr]] registers its reference with the garbage collector directly, so the asset stays alive while the runner exists. [[fgcobject|FGCObject]] is the more general alternative for classes holding many references.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'A quick self-check for every header',
          text: 'Scan each pointer member to a UObject type. It should be either `UPROPERTY() TObjectPtr<T>` (owning/needing) or `TWeakObjectPtr<T>` (observing). A bare `T*` member to a UObject is almost always a bug waiting for the next garbage collection.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'fill',
      prompt: 'Pick the right pointer type for each declaration in this companion character\'s header.',
      template: `UCLASS()
class MYGAME_API ACompanion : public ACharacter {
    GENERATED_BODY()

public:
    // Just borrowing the target for this call
    void Heal(___ Target);

private:
    // A component we create and own
    UPROPERTY(VisibleAnywhere, Category = "Health")
    ___<UHealthComponent> Health;

    // The player we follow; we don't own them
    ___<APlayerCharacter> Leader;
};`,
      blanks: [
        { answers: ['ACharacter*'] },
        { answers: ['TObjectPtr'] },
        { answers: ['TWeakObjectPtr'] },
      ],
      wordBank: ['ACharacter*', 'TObjectPtr', 'TWeakObjectPtr', 'TSharedPtr', 'TUniquePtr', 'TSoftObjectPtr'],
      explanation:
        'Parameters use raw `T*` — the caller keeps the target alive for the duration of the call. The owned component is a `UPROPERTY` member, so it gets `TObjectPtr`. The leader is observed, not owned, and may be destroyed (for example on disconnect), so `TWeakObjectPtr` lets the companion notice. `TSharedPtr` and `TUniquePtr` must never point at UObjects, and `TSoftObjectPtr` is for assets referenced by path.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'A HUD widget shows the name and health of whichever enemy the player is aiming at. Enemies die constantly. Which member should the widget use to remember the current enemy?',
      options: [
        { text: '`AEnemy* Enemy;` — it is only a UI reference', why: 'An untracked raw pointer is never updated when the enemy is collected, so the widget would eventually read freed memory.' },
        { text: '`UPROPERTY() TObjectPtr<AEnemy> Enemy;`', why: 'Safe, but it states ownership the widget does not have, and after an enemy is destroyed the pointer stays non-null until the next GC, so every use needs `IsValid`.' },
        { text: '`TWeakObjectPtr<AEnemy> Enemy;`', correct: true, why: 'The widget observes an object it does not own. `Get()` returns null the moment the enemy is destroyed, so the widget can simply hide itself.' },
        { text: '`TSharedPtr<AEnemy> Enemy;`', why: 'Unreal\'s shared pointers are for non-UObject types. A shared pointer to a UObject fights the garbage collector and can lead to double destruction.' },
      ],
      explanation:
        'UI, cameras, AI targets and "last instigator" fields are classic observer relationships: they need to know about an object without extending its life. `TWeakObjectPtr` expresses that exactly and handles destruction for you. Reserve strong `UPROPERTY` pointers for things the owner genuinely needs to keep alive.',
    },
  ],
  takeaways: [
    'The garbage collector only sees UObject pointers it can find through reflection — `UPROPERTY` members (including containers of pointers).',
    'A UObject pointer member without `UPROPERTY` is invisible to the GC: the object can be freed and the pointer left dangling.',
    '`TObjectPtr<T>` is the UE5 type for `UPROPERTY` members: editor access tracking and lazy loading, a plain pointer in shipping. It does not keep anything alive by itself.',
    'Use raw `T*` for parameters, return values and locals.',
    '`TWeakObjectPtr<T>` observes without owning; `Get()` returns null once the object is destroyed.',
    'Between `Destroy()` and the next GC a tracked pointer is non-null but dead — check with `IsValid()`, not just `!= nullptr`.',
    'Plain C++ classes keep UObjects alive with `TStrongObjectPtr` or `FGCObject`.',
  ],
  reading: [
    {
      title: 'Unreal Object Handling',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-object-handling-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s explanation of garbage collection, reference updating and weak references.',
    },
    {
      title: 'Unreal Engine 5 Migration Guide',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-migration-guide',
      source: 'unreal-docs',
      note: 'The section on `TObjectPtr` explains the editor features and the conversion of UE4-style raw pointers.',
    },
    {
      title: 'std::weak_ptr',
      url: 'https://en.cppreference.com/w/cpp/memory/weak_ptr',
      source: 'cppreference',
      note: 'Compare the standard library\'s non-owning observer with `TWeakObjectPtr`.',
    },
  ],
};
