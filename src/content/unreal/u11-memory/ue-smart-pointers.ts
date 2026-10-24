import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-smart-pointers',
  title: 'TSharedPtr, TUniquePtr and TWeakPtr',
  summary:
    'Unreal\'s smart pointers for plain C++ types: unique and shared ownership, non-nullable references, thread-safety modes — and why they must never hold UObjects.',
  minutes: 16,
  objectives: [
    'Own non-UObject data with `TUniquePtr`/`MakeUnique` and transfer it with `MoveTemp`',
    'Share ownership with `TSharedPtr`, `TSharedRef` and `MakeShared`, and observe it with `TWeakPtr::Pin()`',
    'Explain `ESPMode` and what "thread-safe" does and does not protect',
    'Use `TSharedFromThis` to hand out shared references to `this` safely',
    'Explain why Unreal smart pointers must never manage UObjects, and map each type to its `std::` equivalent',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Not everything is a UObject',
      blocks: [
        {
          type: 'p',
          text: 'UObjects carry reflection, garbage collection, serialization and Blueprint support — and the overhead that comes with them. Plenty of code needs none of that: a recoil pattern generator, a parsed JSON document, a background pathfinding query, a Slate UI widget, a save-game buffer. Unreal writes these as plain C++ classes and structs with the `F` prefix.',
        },
        {
          type: 'p',
          text: 'Plain C++ objects need plain C++ ownership. You already know the rules from the standard library\'s [[smart-pointer|smart pointers]]; Unreal provides its own family with the same ideas:',
        },
        {
          type: 'table',
          headers: ['Type', 'Ownership', 'Can be null?', 'Create with'],
          rows: [
            ['[[tuniqueptr|TUniquePtr<T>]]', 'Exclusive (move-only)', 'Yes', '`MakeUnique<T>(args…)`'],
            ['`TSharedPtr<T>`', 'Shared, reference counted', 'Yes', '`MakeShared<T>(args…)`'],
            ['`TSharedRef<T>`', 'Shared, reference counted', '**Never**', '`MakeShared<T>(args…)`'],
            ['[[tweakptr|TWeakPtr<T>]]', 'None — observes a shared object', 'Yes (expires)', 'From a `TSharedPtr`/`TSharedRef`'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why doesn\'t Unreal just use std::unique_ptr and std::shared_ptr?',
          text: 'Partly history: Unreal\'s pointers predate reliable C++11 support on every console compiler Epic shipped on, and the engine needed identical behaviour everywhere. But they also add things the standard library lacks: a **non-nullable** shared reference (`TSharedRef`), a choice of atomic or non-atomic reference counting, casts that work without C++ RTTI (which Unreal disables by default), and integration with engine APIs such as Slate and delegates. The standard versions compile in Unreal, but engine APIs speak `TSharedPtr`, so that is what you use.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'TUniquePtr: exactly one owner',
      blocks: [
        {
          type: 'p',
          text: '`TUniquePtr` is Unreal\'s `std::unique_ptr`. It owns one heap object, deletes it when the pointer is destroyed or reset, and cannot be copied — only moved. It costs exactly one pointer and adds no reference count. Reach for it first whenever an object has a single, clear owner.',
        },
        {
          type: 'code',
          title: 'WeaponComponent.cpp',
          code: `// A plain C++ class: no UCLASS, not garbage collected
class FRecoilPattern {
public:
    explicit FRecoilPattern(int32 InSeed) : Seed(InSeed) {}
    FVector2D NextKick();

private:
    int32 Seed = 0;
    int32 ShotIndex = 0;
};

// In UWeaponComponent's header:
//     TUniquePtr<FRecoilPattern> Recoil;

void UWeaponComponent::BeginPlay() {
    Super::BeginPlay();
    Recoil = MakeUnique<FRecoilPattern>(RecoilSeed);
}

void UWeaponComponent::HandOverRecoil(UWeaponComponent* To) {
    To->Recoil = MoveTemp(Recoil);  // ownership moves
    // Recoil is now null; To owns the pattern
}`,
          annotations: [
            { lines: '2-10', text: 'An ordinary class. Its lifetime is managed by whoever owns it, exactly as in standard C++.' },
            { lines: '12-13', text: 'A UObject may own non-UObject data through a regular (non-`UPROPERTY`) member. It is deleted when the component itself is destroyed by the GC, because the member\'s destructor runs then.' },
            { lines: 17, text: '`MakeUnique` allocates and constructs in one step, forwarding the arguments to the constructor — the counterpart of `std::make_unique`.' },
            { lines: 21, text: '`MoveTemp` is Unreal\'s `std::move`. It casts to an rvalue so the move assignment runs. Unlike `std::move`, it refuses to compile if used on a `const` object or an rvalue, catching moves that would silently copy or do nothing.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'No UPROPERTY for smart pointers',
          text: 'Reflection does not understand `TUniquePtr`, `TSharedPtr` or `TWeakPtr`. They cannot be `UPROPERTY` members, so they are never shown in the editor, serialized, replicated or visited by the garbage collector. That is fine — the data they point to is not a UObject — but it means anything that must be saved or edited belongs in a `USTRUCT` value or a UObject instead.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'What happens when this code is compiled?',
      code: `TUniquePtr<FSaveBuffer> A = MakeUnique<FSaveBuffer>();
TUniquePtr<FSaveBuffer> B = A;`,
      options: [
        { text: 'It compiles; `A` and `B` now share the buffer', why: 'Sharing is what `TSharedPtr` is for. A unique pointer that could be copied would no longer be unique.' },
        { text: 'It compiles, but the buffer is deleted twice at the end of scope', why: 'That is the bug the type system prevents. The copy never compiles, so the double delete cannot happen.' },
        { text: 'It fails to compile: `TUniquePtr` is move-only, so line 2 needs `MoveTemp(A)`', correct: true, why: 'The copy constructor is deleted. `TUniquePtr<FSaveBuffer> B = MoveTemp(A);` transfers ownership and leaves `A` null.' },
        { text: 'It compiles; `B` gets a deep copy of the buffer', why: 'Smart pointers never copy the pointed-to object implicitly. If you want a copy, write `MakeUnique<FSaveBuffer>(*A)`.' },
      ],
      explanation:
        'Exclusive ownership is enforced at compile time: `TUniquePtr` deletes its copy operations, so there can never be two owners. To hand the buffer over, move it with `MoveTemp`; afterwards `A` is null. This is identical to `std::unique_ptr` with `std::move` — only the spelling changes.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'TSharedPtr, TSharedRef and MakeShared',
      blocks: [
        {
          type: 'p',
          text: 'When several owners genuinely need the same object and none of them knows who will finish last, use shared ownership. [[tsharedptr|TSharedPtr and TSharedRef]] keep a [[reference-counting|reference count]]; the object is deleted when the last strong reference disappears.',
        },
        {
          type: 'code',
          title: 'LootTables.cpp',
          code: `struct FLootTable {
    TArray<FName> Common;
    TArray<FName> Rare;
    float RareChance = 0.05f;
};

// Built once, shared by every chest in the dungeon
TSharedRef<FLootTable> Table = MakeShared<FLootTable>();
Table->Rare.Add(TEXT("FlamingSword"));

TSharedPtr<FLootTable> ForChestA = Table;   // count 2
TSharedPtr<FLootTable> ForChestB = Table;   // count 3

ForChestA.Reset();                          // count 2
if (ForChestB.IsValid()) {
    UE_LOG(LogTemp, Log, TEXT("Refs: %d"),
        ForChestB.GetSharedReferenceCount());
}

TSharedRef<FLootTable> Back = ForChestB.ToSharedRef();`,
          annotations: [
            { lines: 8, text: '`TSharedRef` must be initialised with a valid object and can never become null. `MakeShared` returns one.' },
            { lines: '11-12', text: 'A `TSharedRef` converts implicitly to a `TSharedPtr`; each copy bumps the count.' },
            { lines: 14, text: '`Reset()` releases this owner\'s reference. The table survives because others still hold it.' },
            { lines: 15, text: '`TSharedPtr` can be null, so check it with `IsValid()` (or in a boolean context) before use.' },
            { lines: 20, text: 'Going from nullable to non-nullable needs `ToSharedRef()`, which asserts if the pointer is null. Only call it when you know it is valid.' },
          ],
        },
        {
          type: 'memory',
          caption: 'MakeShared puts the reference controller and the object in one allocation',
          regions: [
            {
              label: 'Owners',
              kind: 'stack',
              cells: [
                { name: 'Table', type: 'TSharedRef<FLootTable>', value: 'obj + ctrl', pointsTo: 'ctrl' },
                { name: 'ForChestB', type: 'TSharedPtr<FLootTable>', value: 'obj + ctrl', pointsTo: 'ctrl' },
                { name: 'ForChestA', type: 'TSharedPtr<FLootTable>', value: 'null (Reset)' },
              ],
            },
            {
              label: 'Heap (single block from MakeShared)',
              kind: 'heap',
              cells: [
                { id: 'ctrl', name: 'controller', value: 'shared: 2, weak: 0', highlight: true },
                { name: 'FLootTable', value: 'Common, Rare, RareChance' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have a non-nullable TSharedRef?',
          text: 'For the same reason C++ has references as well as pointers: a type that *cannot* be null removes a whole category of checks and crashes. A function taking `TSharedRef<FLootTable>` documents and enforces "you must give me a table". Slate relies on this — `SNew(STextBlock)` returns a `TSharedRef`, so widget code never null-checks freshly created widgets. Prefer `TSharedRef` whenever null is not a meaningful value.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'MakeShared vs MakeShareable',
          text: '`MakeShared<T>(args…)` performs one allocation holding both the object and its reference controller, which is faster and more cache-friendly. `MakeShareable(new T(…))` wraps an existing raw pointer (optionally with a custom deleter) and needs a second allocation for the controller. Use `MakeShared` unless you are adopting a pointer you did not allocate.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'fill',
      prompt: 'Complete the code: create a shared party state, observe it weakly, and create a uniquely owned save buffer.',
      template: `TSharedRef<FPartyState> Party = ___<FPartyState>();
TSharedPtr<FPartyState> UIView = Party;
TWeakPtr<FPartyState> Observer = Party;

if (TSharedPtr<FPartyState> Pinned = Observer.___()) {
    Pinned->Refresh();
}

TUniquePtr<FSaveBuffer> Buffer = ___<FSaveBuffer>();`,
      blanks: [{ answers: ['MakeShared'] }, { answers: ['Pin'] }, { answers: ['MakeUnique'] }],
      wordBank: ['MakeShared', 'Pin', 'MakeUnique', 'lock', 'NewObject', 'Get', 'MakeShareable'],
      explanation:
        '`MakeShared` creates the object and controller together and returns a `TSharedRef`. A `TWeakPtr` must be **pinned** to use: `Pin()` returns a `TSharedPtr` that keeps the object alive while you use it, or a null pointer if it has already been destroyed (the standard library calls this `lock()`). `MakeUnique` creates a uniquely owned object. `NewObject` is only for UObjects, and `MakeShareable` needs a raw `new` expression.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'TWeakPtr and reference cycles',
      blocks: [
        {
          type: 'p',
          text: 'Reference counting has one famous weakness: **cycles**. If A holds a shared pointer to B and B holds one to A, both counts stay above zero forever, even after the rest of the program has forgotten them. Nothing will ever delete them — a leak.',
        },
        {
          type: 'p',
          text: 'The fix is the same as with `std::weak_ptr`: make one direction of the relationship non-owning. Usually children are owned by their parent, and point back to it weakly:',
        },
        {
          type: 'code',
          title: 'DialogueTree.h',
          code: `struct FDialogueNode {
    FText Line;
    TArray<TSharedPtr<FDialogueNode>> Replies; // owns children
    TWeakPtr<FDialogueNode> Parent;            // observes parent
};

void ShowPrevious(const TSharedRef<FDialogueNode>& Current) {
    if (TSharedPtr<FDialogueNode> Up = Current->Parent.Pin()) {
        ShowLine(Up->Line);
    }
}`,
          annotations: [
            { lines: 3, text: 'Downward links are strong: a node keeps its replies alive.' },
            { lines: 4, text: 'The upward link is weak, so parent and child do not keep each other alive. Deleting the root frees the whole tree.' },
            { lines: 8, text: '`Pin()` converts the weak pointer into a temporary strong one. If the parent is gone, `Up` is null and the `if` body is skipped. While `Up` exists, the parent cannot be deleted under you.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The garbage collector will not save you here',
          text: 'Unreal\'s GC only manages UObjects. Shared pointers are pure reference counting, exactly like `std::shared_ptr`: a cycle of `TSharedPtr`s leaks no matter how long the game runs. Whenever two objects point at each other, decide which one owns.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Weak binding for delegates',
          text: 'Delegates and timers can bind to shared-pointer objects with `CreateSP(SharedObject, &FClass::Method)`. The delegate stores a `TWeakPtr`, so it skips the call if the object has been deleted — the shared-pointer counterpart of `CreateUObject` from the timers lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: 'If two `FQuestStep` objects hold `TSharedPtr`s to each other and nothing else references them, Unreal\'s garbage collector will eventually detect the cycle and free them.',
      answer: false,
      explanation:
        'The garbage collector only tracks UObjects reachable through reflection. `TSharedPtr` is plain reference counting and is invisible to the GC. Each object keeps the other\'s count at 1, so neither is ever deleted: a permanent leak. Break the cycle by making one of the links a `TWeakPtr`.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Thread safety: ESPMode',
      blocks: [
        {
          type: 'p',
          text: 'Copying or destroying a shared pointer changes the reference count. If two threads do that at the same moment with plain `++` and `--`, the updates can collide — a [[data-race]] that corrupts the count and leads to leaks or double deletes. Unreal lets you choose the trade-off through a second template parameter, [[espmode|ESPMode]]:',
        },
        {
          type: 'code',
          title: 'ThreadingModes.cpp',
          code: `// Default in UE5: atomic reference counting
TSharedPtr<FNavQuery> Query = MakeShared<FNavQuery>();

// Opt out for hot code used on one thread only
using FScratchPtr =
    TSharedPtr<FParticleScratch, ESPMode::NotThreadSafe>;
FScratchPtr Scratch =
    MakeShared<FParticleScratch, ESPMode::NotThreadSafe>();`,
          annotations: [
            { lines: 2, text: 'Omitting the mode means `ESPMode::ThreadSafe`: the count is updated with [[atomic|atomic]] operations, so copies may be made and dropped on different threads.' },
            { lines: '5-6', text: 'The mode is part of the type. A `NotThreadSafe` pointer and a `ThreadSafe` pointer to the same class are different types and do not convert into each other, so a [[type-alias]] keeps declarations readable.' },
            { lines: '7-8', text: '`MakeShared` must be told the same mode.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'What "thread-safe" does not mean',
          text: '`ESPMode::ThreadSafe` protects **only the reference count**. Two threads modifying the `FNavQuery` itself still need a lock. And one pointer *variable* written by two threads at once is still a data race — just as with `std::shared_ptr`. Thread-safe mode makes sharing ownership across threads safe, not sharing data.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'The default changed in UE5',
          text: 'In Unreal Engine 4 the default mode was not thread-safe (atomic operations were opt-in for performance). UE5 switched the default to `ESPMode::ThreadSafe`, because more engine work runs across threads and a silent reference-count race is far worse than the small cost of atomics. The standard library made the same choice: `std::shared_ptr` always uses atomic counting.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'An `FPathRequest` is created with `MakeShared` on the game thread and a copy of the pointer is handed to a worker thread. Which statement is true?',
      options: [
        { text: 'The default mode makes it safe for both threads to modify the `FPathRequest`\'s members at the same time', why: 'Thread-safe mode covers only the reference count. Concurrent writes to the object\'s data still need a mutex or another synchronisation strategy.' },
        { text: 'Each thread may copy and release its own pointer safely, because the UE5 default counts references atomically', correct: true, why: 'With `ESPMode::ThreadSafe` (the UE5 default) increments and decrements are atomic, so ownership can be shared across threads.' },
        { text: 'You must write `TSharedPtr<FPathRequest, ESPMode::ThreadSafe>` explicitly, because the default is not thread-safe', why: 'That was the UE4 default. Since UE5, omitting the mode gives you `ThreadSafe`.' },
        { text: 'Shared pointers cannot cross threads; use `TUniquePtr` instead', why: 'Shared pointers can cross threads in thread-safe mode. A `TUniquePtr` can also be moved to another thread, but then the game thread gives up ownership entirely.' },
      ],
      explanation:
        'Thread-safe mode guarantees that the *bookkeeping* survives concurrent copies and releases: the object is deleted exactly once, by whichever thread drops the last reference. It says nothing about the object\'s contents. Typical designs give the worker its own data to fill, then hand results back to the game thread, instead of having both threads edit the same object.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'TSharedFromThis: sharing yourself safely',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes a shared object must hand out a shared pointer to **itself** — registering with a manager, or binding a delegate with `CreateSP`. The obvious approach, `TSharedPtr<FTicket>(this)`, is a serious bug: it creates a *second*, independent reference controller for an object that already has one. When either count reaches zero the object is deleted, and the other owner is left dangling.',
        },
        {
          type: 'compare',
          left: {
            title: 'A second controller',
            tone: 'bad',
            code: `class FTicket {
public:
    void Submit(FMatchmaker& M) {
        M.Enqueue(TSharedPtr<FTicket>(this));
    }
};`,
            text: 'Two unrelated counts for one object: a guaranteed double delete or use-after-free.',
          },
          right: {
            title: 'Join the existing controller',
            tone: 'good',
            code: `class FTicket
    : public TSharedFromThis<FTicket> {
public:
    void Submit(FMatchmaker& M) {
        M.Enqueue(AsShared());
    }
};`,
            text: '`AsShared()` returns a `TSharedRef` that shares the existing count.',
          },
        },
        {
          type: 'p',
          text: '[[tsharedfromthis|TSharedFromThis]] works by storing a weak pointer to the object\'s own controller, filled in when `MakeShared` creates the object. `AsShared()` simply pins it. In a derived class, `SharedThis(this)` returns a reference typed as the derived class rather than the base.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Not in the constructor, and only for shared objects',
          text: 'The internal weak pointer is set *after* construction, so calling `AsShared()` inside the constructor fails (it asserts). It also fails for objects that were never owned by a shared pointer, such as one created on the stack or with `MakeUnique`. The same rules apply to `std::enable_shared_from_this`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'bug',
      prompt: 'This download system crashes intermittently when downloads finish. Tap the line that causes it.',
      code: `class FDownloadTask {
public:
    void Start(FDownloadQueue& Queue) {
        Queue.Add(TSharedPtr<FDownloadTask>(this));
    }
    void OnComplete();
};

void BeginDownload(FDownloadQueue& Queue) {
    TSharedPtr<FDownloadTask> Task =
        MakeShared<FDownloadTask>();
    Task->Start(Queue);
}`,
      bugLines: [4],
      hint: 'How many reference counts does the task end up with?',
      explanation:
        'Line 4 builds a brand-new `TSharedPtr` from a raw `this`, creating a second reference controller for an object that `MakeShared` already manages. When `BeginDownload` returns, the first count drops to zero and deletes the task — while the queue still holds the second pointer. Later, the queue uses or deletes freed memory. Derive from `TSharedFromThis<FDownloadTask>` and call `Queue.Add(AsShared())` instead.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Never point them at UObjects',
      blocks: [
        {
          type: 'p',
          text: 'There are two memory-management systems in an Unreal project, and each pointer family belongs to exactly one of them. **UObjects** are created with `NewObject`/`SpawnActor` and destroyed by the garbage collector. **Everything else** is created with `MakeShared`/`MakeUnique` and destroyed by reference counting or scope. Mixing them breaks both.',
        },
        {
          type: 'compare',
          left: {
            title: 'Smart pointer to a UObject',
            tone: 'bad',
            code: `TSharedPtr<AEnemy> Shared(SpawnedEnemy);
// ...last copy released:
//   'delete' runs on a GC-owned actor`,
            text: 'When the count reaches zero, the shared pointer deletes an object the engine owns. Meanwhile the GC cannot see the shared pointer, so it may destroy the enemy while you still hold it.',
          },
          right: {
            title: 'UObject pointer types',
            tone: 'good',
            code: `UPROPERTY()
TObjectPtr<AEnemy> Owned;

TWeakObjectPtr<AEnemy> Observed;`,
            text: 'Lifetime stays with the garbage collector; you choose strong or weak.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why exactly does it break?',
          text: 'Three separate failures: (1) a UObject must be constructed through `NewObject` so the engine can register it in the global object array — `MakeShared` bypasses that and the engine asserts; (2) when the last `TSharedPtr` goes away it calls `delete`, destroying an object the GC still believes it owns, so the GC later destroys it again; (3) the GC does not see `TSharedPtr` references, so it may free the object while shared pointers still point to it. Each system assumes it is the only one in charge.',
        },
        {
          type: 'table',
          headers: ['You are pointing at…', 'Own it', 'Observe it'],
          rows: [
            ['A UObject, from a UObject', '`UPROPERTY() TObjectPtr<T>`', '`TWeakObjectPtr<T>`'],
            ['A UObject, from a plain C++ class', '`TStrongObjectPtr<T>` / `FGCObject`', '`TWeakObjectPtr<T>`'],
            ['A non-UObject, single owner', '`TUniquePtr<T>`', 'Raw `T*` or reference (owner outlives you)'],
            ['A non-UObject, shared owners', '`TSharedPtr<T>` / `TSharedRef<T>`', '`TWeakPtr<T>`'],
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Translating from std::',
      blocks: [
        {
          type: 'p',
          text: 'Everything you learned about `std::` smart pointers carries over: ownership semantics, moves, cycles, `make_` functions. Only the names change — plus a few additions:',
        },
        {
          type: 'table',
          headers: ['Standard C++', 'Unreal', 'Notes'],
          rows: [
            ['`std::unique_ptr<T>`', '`TUniquePtr<T>`', 'Move-only; supports arrays (`TUniquePtr<T[]>`) and custom deleters.'],
            ['`std::make_unique<T>()`', '`MakeUnique<T>()`', 'Forwards its arguments to the constructor.'],
            ['`std::shared_ptr<T>`', '`TSharedPtr<T>`', 'Thread-safety selectable via `ESPMode`; `std::` is always atomic.'],
            ['— (no equivalent)', '`TSharedRef<T>`', 'Shared and guaranteed non-null.'],
            ['`std::make_shared<T>()`', '`MakeShared<T>()`', 'Single allocation for object and controller.'],
            ['`std::weak_ptr<T>`', '`TWeakPtr<T>`', '`lock()` is spelled `Pin()`.'],
            ['`std::enable_shared_from_this`', '`TSharedFromThis<T>`', '`shared_from_this()` → `AsShared()` / `SharedThis(this)`.'],
            ['`std::static_pointer_cast`', '`StaticCastSharedPtr` / `StaticCastSharedRef`', 'No `dynamic_pointer_cast`: RTTI is off by default.'],
            ['`std::move`', '`MoveTemp`', 'Refuses to compile on `const` objects and rvalues.'],
            ['`p.use_count()`, `p.reset()`', '`GetSharedReferenceCount()`, `Reset()`', 'Treat the count as a debugging aid, not program logic.'],
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Where you will meet them in the engine',
          text: 'Slate UI widgets (`SNew` returns `TSharedRef<SWidget>`), JSON parsing (`TSharedPtr<FJsonObject>`), online services, async tasks, and asset streaming: the next lesson\'s `RequestAsyncLoad` returns a `TSharedPtr<FStreamableHandle>` that keeps loaded assets in memory for as long as you hold it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      codeOptions: true,
      prompt: 'Which declaration is a correct use of Unreal\'s smart pointers?',
      options: [
        { text: 'TSharedPtr<UTexture2D> Icon;', why: '`UTexture2D` is a UObject. Use `UPROPERTY() TObjectPtr<UTexture2D>` (or a soft pointer for an asset that may not be loaded).' },
        { text: 'TUniquePtr<AActor> Spawned;', why: 'Actors are owned by their level and the garbage collector. A unique pointer would try to `delete` one.' },
        { text: 'TSharedRef<FJsonObject> Json =\n    MakeShared<FJsonObject>();', correct: true, why: '`FJsonObject` is a plain C++ class, and the engine\'s JSON API is built around shared pointers to it.' },
        { text: 'UPROPERTY()\nTSharedPtr<FQuestData> Quest;', why: 'Reflection does not support smart pointers, so this does not compile with UHT. Store a `USTRUCT` by value if it must be a property.' },
      ],
      explanation:
        'The dividing line is simple: smart pointers for non-UObject types, UObject pointer types for UObjects, and no smart pointers in `UPROPERTY`s. `FJsonObject` is exactly the kind of plain C++ data the shared-pointer family exists for.',
    },
  ],
  takeaways: [
    'Use `TUniquePtr`/`MakeUnique` for single-owner non-UObject data; transfer ownership with `MoveTemp`.',
    'Use `TSharedPtr` for shared ownership and `TSharedRef` when null is never valid; create both with `MakeShared`.',
    '`TWeakPtr` observes shared objects; `Pin()` returns a temporary strong pointer. Use weak back-links to avoid reference cycles, which the GC will not collect.',
    'UE5 defaults to `ESPMode::ThreadSafe` (atomic counts); it protects the count only, never the object\'s data.',
    'Derive from `TSharedFromThis` and call `AsShared()` instead of wrapping a raw `this`.',
    'Never manage UObjects with smart pointers, and never put smart pointers in `UPROPERTY`s.',
  ],
  reading: [
    {
      title: 'Smart Pointers in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/smart-pointers-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s guide to the smart pointer library, including helper functions and the thread-safety modes.',
    },
    {
      title: 'std::shared_ptr',
      url: 'https://en.cppreference.com/w/cpp/memory/shared_ptr',
      source: 'cppreference',
      note: 'The standard counterpart; compare its guarantees on thread safety and control blocks.',
    },
    {
      title: 'std::enable_shared_from_this',
      url: 'https://en.cppreference.com/w/cpp/memory/enable_shared_from_this',
      source: 'cppreference',
      note: 'The standard version of `TSharedFromThis`, with the same constructor caveat.',
    },
  ],
};
