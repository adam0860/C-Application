import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-garbage-collection',
  title: 'Garbage Collection and UPROPERTY',
  summary: 'How Unreal decides which UObjects live or die, why a missing UPROPERTY crashes your game minutes later, and how this differs from shared_ptr.',
  minutes: 18,
  objectives: [
    'Describe Unreal\'s mark-and-sweep collector: the root set, reachability and the sweep',
    'Identify which references keep an object alive and which do not',
    'Explain why untracked raw pointers dangle, and use `UPROPERTY` with `TObjectPtr` correctly',
    'Handle destroyed objects safely with `IsValid()` and know when references are nulled',
    'Keep objects alive from non-`UObject` code with `TStrongObjectPtr` or `FGCObject`, and know why `AddToRoot` is rare',
    'Contrast tracing garbage collection with `std::shared_ptr` reference counting',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Who frees UObjects?',
      blocks: [
        {
          type: 'p',
          text: 'You now know you must never `delete` a `UObject`. Something still has to free them, and that something is the [[ue-garbage-collector|Unreal garbage collector]]. It is a [[mark-and-sweep]] collector — a *tracing* collector — which works in two phases:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Mark', text: 'Start from the [[gc-root-set|root set]] — objects the engine always keeps alive — and follow every reference the collector can see, marking each object reached. Then follow *their* references, and so on, until nothing new is found.' },
            { title: 'Sweep', text: 'Every `UObject` that was **not** marked is unreachable: no chain of references leads to it from a root. The collector destroys it — calling `BeginDestroy()`, later `FinishDestroy()`, then the C++ destructor — and frees its memory.' },
          ],
        },
        {
          type: 'definition',
          term: 'Reachable',
          text: 'An object is reachable if there is a chain of collector-visible references from some root to it. Reachable objects survive; unreachable ones are destroyed. Nothing else matters — not how recently you used the object, not its Outer, not whether some untracked pointer still points at it.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a C++ engine uses garbage collection at all',
          text: 'Standard C++ prefers [[raii]] and [[ownership|single ownership]]. But an engine\'s object graph is messy: designers wire objects together in Blueprints with no notion of ownership, actors reference each other in cycles (a turret targets a player who targets the turret), assets reference assets, and objects are created and destroyed by the editor, streaming and the network. A collector that frees "whatever nothing can reach" handles all of that safely — and Unreal can do it *precisely*, because reflection tells it exactly where every reference lives.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Climbers on ropes',
          text: 'Picture the roots as anchors bolted into a cliff, and every `UPROPERTY` reference as a rope between climbers. Every so often the collector checks the ropes: anyone still connected to an anchor, however indirectly, stays on the wall. Anyone whose ropes lead nowhere falls. A raw pointer is like *looking* at a climber — it holds no weight at all.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'What counts as a reference',
      blocks: [
        {
          type: 'p',
          text: 'The collector can only follow references it knows about. For classes and structs, it knows about exactly the members that reflection describes — which is why [[uproperty]] matters so much. The roots are objects the engine holds on to: among them the current [[world]], which holds its levels, which hold their actors. So a spawned actor stays alive while it is in a level even if your code keeps no pointer to it — unlike a plain object made with `NewObject`.',
        },
        {
          type: 'table',
          headers: ['Reference', 'Keeps the target alive?'],
          rows: [
            ['`UPROPERTY() TObjectPtr<UQuest> Quest;`', '**Yes**'],
            ['`UPROPERTY() UQuest* Quest;` (raw pointer, older style)', '**Yes** — the macro is what counts'],
            ['`UPROPERTY() TArray<TObjectPtr<UItem>> Items;` (also `TMap`, `TSet`)', '**Yes**, every element'],
            ['A `TObjectPtr` inside a `USTRUCT`, held by a `UPROPERTY`', '**Yes** — the collector looks inside reflected structs'],
            ['`UPROPERTY(Transient) TObjectPtr<UQuest> Cached;`', '**Yes** — `Transient` only means "do not save"'],
            ['`UQuest* Quest;` or `TObjectPtr<UQuest> Quest;` without `UPROPERTY`', '**No** — invisible to the collector'],
            ['`TWeakObjectPtr<UQuest> Watched;`', '**No**, by design — it observes without owning'],
            ['A `UObject*` member of a plain (non-reflected) C++ class', '**No**, unless reported via `FGCObject`'],
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Local variables are fine within one function',
          text: 'The collector normally runs between frames on the game thread, not in the middle of your function. A raw `UQuest*` in a local variable, used and discarded within one function call, is safe. The danger is a pointer that **survives across frames** — a member variable, a static, a captured lambda — without being visible to the collector.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      multi: true,
      prompt: 'These are member variables of an actor. Select **every** one that keeps the referenced object alive across garbage collections.',
      options: [
        {
          text: '`UPROPERTY() TObjectPtr<UQuest> ActiveQuest;`',
          correct: true,
          why: 'The canonical strong reference: reflected, so the collector traces it.',
        },
        {
          text: '`TObjectPtr<UQuest> BackupQuest;` (no macro)',
          why: '`TObjectPtr` alone does not register anything. Without `UPROPERTY`, no reflection data exists, so the collector never sees this member.',
        },
        {
          text: '`UPROPERTY() TArray<TObjectPtr<UItem>> Loot;`',
          correct: true,
          why: 'Reflected containers are traced element by element.',
        },
        {
          text: '`UPROPERTY(Transient) TObjectPtr<UTexture2D> Preview;`',
          correct: true,
          why: '`Transient` only excludes the property from saving. It is still reflected, so it is still a strong reference.',
        },
        {
          text: '`TWeakObjectPtr<AActor> LastAttacker;`',
          why: 'Weak pointers deliberately do not keep objects alive; they safely report `nullptr` once the target is gone. Use them for "I want to know about it, but I do not own it".',
        },
      ],
      explanation:
        'One rule decides all five: **is the member reflected?** `UPROPERTY` (with any specifiers) makes a pointer visible to the collector; the pointer type alone does not. Weak pointers are the intentional exception — reflected or not, they never keep their target alive.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'The raw-pointer trap',
      blocks: [
        {
          type: 'p',
          text: 'Here is the most common Unreal crash in beginner code. It compiles, it works when you test it, and it crashes a minute later — or only in a long play session, or only on a tester\'s machine.',
        },
        {
          type: 'code',
          title: 'QuestGiver.h',
          code: `UCLASS()
class MYGAME_API AQuestGiver : public AActor {
    GENERATED_BODY()

protected:
    virtual void BeginPlay() override;

private:
    UQuest* OfferedQuest = nullptr;   // no UPROPERTY!
};`,
          annotations: [
            { lines: 9, text: 'A perfectly legal C++ member that the collector cannot see. Whatever it points to is, as far as the engine is concerned, unreferenced.' },
          ],
        },
        {
          type: 'code',
          title: 'QuestGiver.cpp',
          code: `void AQuestGiver::BeginPlay() {
    Super::BeginPlay();
    OfferedQuest = NewObject<UQuest>(this);
}

// ...about a minute later, the collector runs...
// OfferedQuest still holds the old address.
// The next OfferedQuest->Title is a use-after-free.`,
          annotations: [
            { lines: 3, text: 'The quest is created and works fine — for now. Its Outer is the quest giver, but as you learned, an Outer does not keep an object alive.' },
            { lines: '6-8', text: 'The next collection finds the quest unreachable and frees it. The raw pointer is not updated: it is now a [[dangling-pointer]].' },
          ],
        },
        {
          type: 'memory',
          caption: 'After the collection: the member still holds the address of memory that has been freed (and may be reused by another object).',
          regions: [
            {
              label: 'AQuestGiver (alive, in the level)',
              kind: 'heap',
              cells: [{ name: 'OfferedQuest', type: 'UQuest*', value: '0x7f3a…40', pointsTo: 'freed', highlight: true }],
            },
            {
              label: 'Heap after GC',
              kind: 'heap',
              cells: [{ id: 'freed', address: '0x7f3a…40', value: 'freed — or now part of some other object' }],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Why this bug hides so well',
          text: 'By default the collector runs only every minute or so (and on level changes), so the crash appears long after the mistake, far from the line that caused it. Worse, the freed memory may be reused by a *different* object, so instead of crashing your code can quietly read or corrupt someone else\'s data. Use-after-free is [[undefined-behavior]], exactly as in standard C++.',
        },
        {
          type: 'compare',
          left: {
            title: 'Invisible to the collector',
            tone: 'bad',
            code: `UQuest* OfferedQuest = nullptr;`,
          },
          right: {
            title: 'A tracked, strong reference',
            tone: 'good',
            code: `UPROPERTY()
TObjectPtr<UQuest> OfferedQuest;`,
          },
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'bug',
      prompt: 'A spawner works for a while, then crashes in `Tick` after about a minute of play. Tap the line that causes it.',
      code: `UCLASS()
class MYGAME_API AWaveSpawner : public AActor {
    GENERATED_BODY()

public:
    virtual void Tick(float DeltaSeconds) override;

private:
    UPROPERTY(EditAnywhere, Category = "Waves")
    TSubclassOf<AEnemy> EnemyClass;

    UWaveData* CurrentWave = nullptr;

    UPROPERTY()
    TArray<TObjectPtr<AEnemy>> AliveEnemies;
};`,
      bugLines: [12],
      hint: 'Which object member can the garbage collector not see?',
      explanation:
        '`CurrentWave` (line 12) holds a `UObject` but has no `UPROPERTY`, so the collector does not know the spawner references it. At the next collection the wave data is freed and `CurrentWave` dangles; `Tick` then reads freed memory. Fix: `UPROPERTY() TObjectPtr<UWaveData> CurrentWave;`. `EnemyClass` and `AliveEnemies` are already reflected, so they are traced correctly.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'TObjectPtr: the UE5 member pointer',
      blocks: [
        {
          type: 'p',
          text: 'Since UE5, Epic recommends [[tobjectptr|TObjectPtr<T>]] instead of a raw `T*` for `UObject` pointers stored in `UPROPERTY` members in headers. It is a small wrapper that behaves like a pointer:',
        },
        {
          type: 'code',
          title: 'Turret.h / Turret.cpp',
          code: `// Header: members use TObjectPtr
UPROPERTY(EditAnywhere, Category = "Turret")
TObjectPtr<AActor> Target;

// Source: functions and locals use raw pointers
void ATurret::Aim() {
    AActor* Current = Target;          // implicit conversion
    if (Current) {
        FaceTowards(Current->GetActorLocation());
    }
    LogTarget(Target.Get());           // explicit form
}`,
          annotations: [
            { lines: '2-3', text: 'The convention: `TObjectPtr` for `UPROPERTY` members. Parameters, return types and local variables stay plain `T*`.' },
            { lines: 7, text: '`TObjectPtr<T>` converts to `T*` implicitly, so existing code keeps working.' },
            { lines: 11, text: '`Get()` is the explicit form, useful in templates and when passing to functions that take `T*`.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**In cooked game builds** it compiles down to a plain pointer — no size or speed cost.',
            '**In editor builds** it can record which objects are accessed and refer to objects that are not loaded yet, which the editor and cooker use to load and package content more efficiently.',
            '**For the collector**, it lets the engine notice pointer assignments. UE 5.4 introduced an experimental *incremental* collector that spreads marking over several frames; it relies on `TObjectPtr` noticing assignments made while marking is in progress (a "write barrier"), so raw-pointer properties are a problem for it.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'TObjectPtr does not replace UPROPERTY',
          text: 'A `TObjectPtr` member **without** `UPROPERTY` is exactly as invisible to the collector as a raw pointer. The wrapper improves how references are tracked and resolved; the macro is what makes the reference exist for the engine at all. Always write both.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'The rest of the pointer family',
          text: 'Weak pointers (`TWeakObjectPtr`), soft references to assets, and Unreal\'s smart pointers for non-`UObject` types each solve a different problem. They get a whole unit later in the course; for now, the rule is: **owning reference to a `UObject` in a class or struct = `UPROPERTY() TObjectPtr<T>`**.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: 'Changing a member from `UQuest* Quest;` to `TObjectPtr<UQuest> Quest;` (still without `UPROPERTY`) is enough to make the garbage collector keep the quest alive.',
      answer: false,
      explanation:
        'The collector traces members described by reflection, and only `UPROPERTY` creates that description. `TObjectPtr` adds editor-time access tracking, lazy resolution and support for incremental collection, but on its own it is just another pointer the collector never visits. The correct member is `UPROPERTY() TObjectPtr<UQuest> Quest;`.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Destroyed objects, IsValid() and garbage',
      blocks: [
        {
          type: 'p',
          text: 'Collection frees *unreachable* objects. But some objects must die while still referenced — an enemy that is killed while your turret is aiming at it. Calling `Destroy()` on an actor removes it from the world immediately and flags it as [[pending-kill|garbage]] ("pending kill" in UE4). Its memory stays valid until the next collection, so your pointers to it are **not null** yet — but the object is no longer usable.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Destroy() is called', text: 'The actor leaves the level, ends play and is flagged as garbage. `UPROPERTY` references to it still hold its address. `IsValid(Ptr)` now returns `false`.' },
            { title: 'Until the next collection', text: 'The memory is intact, so checking it with `IsValid` is safe. Using it as if it were alive is a logic bug.' },
            { title: 'The next collection', text: 'The object is freed. By default the collector also sets every `UPROPERTY` reference to it to `nullptr`. Untracked raw pointers are **not** updated — they now dangle.' },
          ],
        },
        {
          type: 'code',
          title: 'Turret.cpp',
          code: `void ATurret::Tick(float DeltaSeconds) {
    Super::Tick(DeltaSeconds);

    if (!IsValid(Target)) {
        Target = nullptr;
        Target = FindNewTarget();
        return;
    }
    FaceTowards(Target->GetActorLocation());
}`,
          annotations: [
            { lines: 4, text: '[[isvalid|IsValid()]] is `true` only if the pointer is non-null **and** the object is not flagged as garbage. Prefer it to a bare null check for anything that can be destroyed.' },
            { lines: 5, text: 'Drop our reference to a dead target explicitly rather than waiting for the collector to clear it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'IsValid cannot rescue a dangling pointer',
          text: '`IsValid` reads the object\'s flags, so it only works on memory that still belongs to that object: a `UPROPERTY` reference (cleared to `nullptr` when the object is freed) or a weak pointer. Calling it on an untracked raw pointer whose object has already been freed reads freed memory — undefined behavior. Tracked references first, `IsValid` second.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Destroying non-actors',
          text: 'Plain `UObject`s are not destroyed explicitly: remove your references and let them become unreachable. `MarkAsGarbage()` exists for the rare case where an object must be invalidated while references remain, but in gameplay code it is almost never the right tool.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'A turret has `UPROPERTY() TObjectPtr<AActor> Target;`. The target is destroyed this frame. On the next frame, before any garbage collection has run, which statement is true?',
      options: [
        {
          text: '`Target` is already `nullptr`',
          why: 'References are cleared by the collector when it frees the object, which has not run yet.',
        },
        {
          text: '`Target` points to freed memory, so even `IsValid(Target)` is unsafe',
          why: 'The memory is only freed at the next collection. Until then it is intact, which is exactly what makes `IsValid` safe to call on a tracked reference.',
        },
        {
          text: '`Target` is still non-null and `IsValid(Target)` returns `true` until the collector runs',
          why: '`Destroy()` flags the actor as garbage immediately, and `IsValid` checks that flag. It returns `false` right away.',
        },
        {
          text: '`Target` is still non-null, but `IsValid(Target)` returns `false`',
          correct: true,
          why: 'Correct. Destroyed objects linger, flagged as garbage, until the next collection frees them and nulls the `UPROPERTY`.',
        },
      ],
      explanation:
        'Between `Destroy()` and the next collection there is a window where pointers are non-null but the object is dead. A bare `if (Target)` check passes during that window; `IsValid(Target)` does not. That is why idiomatic Unreal code uses `IsValid` for anything that can be destroyed.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'When the collector runs',
      blocks: [
        {
          type: 'p',
          text: 'Unlike `std::shared_ptr`, which frees an object the instant its last owner lets go, the collector runs at moments of the engine\'s choosing:',
        },
        {
          type: 'list',
          items: [
            '**Periodically**: by default about every 60 seconds (`gc.TimeBetweenPurgingPendingKillObjects`, default 61.1).',
            '**On level transitions** and when streaming levels out, when lots of objects become unreachable at once.',
            '**Under memory pressure**, and when code requests it with `GEngine->ForceGarbageCollection(true)`.',
          ],
        },
        {
          type: 'p',
          text: 'It runs on the game thread between frames. The mark phase must examine every live object, so its cost grows with the **number of objects**; the destruction of unreachable objects is spread over several frames to avoid one long pause.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Garbage collection hitches',
          text: 'A project with hundreds of thousands of `UObject`s can see a noticeable frame hitch every time the collector marks. The cheapest fix is design: prefer `USTRUCT`s for plain data, avoid creating and discarding objects every frame, and reuse (pool) frequently spawned actors such as projectiles. The engine also groups objects that always live and die together (such as a level\'s actors) into *clusters* that can be marked as a unit.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Make GC bugs show up immediately',
          text: 'Because collections are rare, missing-`UPROPERTY` bugs hide. While testing, force them out: run the console command `obj gc` to collect right now, or set `gc.CollectGarbageEveryFrame 1` to collect every frame (slow, but a dangling pointer crashes almost at once instead of minutes later).',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Keeping objects alive from non-UObject code',
      blocks: [
        {
          type: 'p',
          text: 'Inside a `UCLASS` or `USTRUCT`, a `UPROPERTY` is always the answer. But sometimes a plain C++ class — not reflected, so UHT never reads its members — must keep a `UObject` alive: a Slate UI widget holding a texture, a manager owned through a `TSharedPtr`, an editor tool. Three tools exist, from most to least preferred:',
        },
        {
          type: 'code',
          title: 'Keeping a UObject alive from plain C++',
          code: `// 1. TStrongObjectPtr: RAII, like a scoped AddToRoot
#include "UObject/StrongObjectPtr.h"

class FIconPreview {
    TStrongObjectPtr<UTexture2D> Icon;
public:
    void SetIcon(UTexture2D* NewIcon) {
        Icon.Reset(NewIcon);
    }
};

// 2. AddToRoot: manual, global, easy to leak
UDataAsset* Settings = LoadSettings();
Settings->AddToRoot();
// ...much later, you MUST remember:
Settings->RemoveFromRoot();`,
          annotations: [
            { lines: '1-2', text: '[[tstrongobjectptr|TStrongObjectPtr]] makes its object a root while the handle exists and releases it when the handle is destroyed — the [[raii]] pattern you know from `std::unique_ptr`.' },
            { lines: 8, text: '`Reset` swaps the referenced object: the old one is released, the new one kept alive.' },
            { lines: '13-14', text: '`AddToRoot` puts the object straight into the [[gc-root-set|root set]]. It — and everything it references — can never be collected until `RemoveFromRoot`.' },
            { lines: 16, text: 'Forget this line (or return early before it) and the object leaks for the rest of the session. That is why `AddToRoot` is rare in modern code.' },
          ],
        },
        {
          type: 'p',
          text: 'The third tool is the most flexible: derive the plain class from [[fgcobject|FGCObject]] and report its references to the collector yourself.',
        },
        {
          type: 'deepdive',
          title: 'FGCObject: reporting references by hand',
          blocks: [
            {
              type: 'code',
              title: 'IconCache.h',
              code: `#include "UObject/GCObject.h"

class FIconCache : public FGCObject {
public:
    virtual void AddReferencedObjects(
        FReferenceCollector& Collector) override {
        Collector.AddReferencedObjects(Icons);
    }
    virtual FString GetReferencerName() const override {
        return TEXT("FIconCache");
    }

private:
    TArray<TObjectPtr<UTexture2D>> Icons;
};`,
              annotations: [
                { lines: 3, text: 'Constructing an `FGCObject` registers it with the collector; destroying it unregisters it.' },
                { lines: '5-8', text: 'Called during every mark phase. Whatever you report is treated as referenced — so these textures stay alive as long as the cache exists.' },
                { lines: '9-11', text: 'A name that shows up in memory and reference-debugging tools.' },
              ],
            },
            {
              type: 'p',
              text: '`TStrongObjectPtr` is built on the same idea, packaged for a single pointer. Engine systems such as the asset manager use `FGCObject` to keep large sets of objects alive.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just use UPROPERTY everywhere?',
          text: 'UHT only reads `UCLASS`, `USTRUCT` and friends. A `UPROPERTY` inside an ordinary C++ class is simply erased by the preprocessor and never registered, so it protects nothing. Non-reflected code has to tell the collector about its references some other way — and `TStrongObjectPtr` and `FGCObject` are those ways.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'fill',
      prompt: 'The quest giver **owns** its offered quest (it must survive garbage collection) but only **observes** the last visitor (it must not keep that actor alive). Complete the members.',
      template: `UCLASS()
class MYGAME_API AQuestGiver : public AActor {
    GENERATED_BODY()

private:
    ___()
    ___<UQuest> OfferedQuest;

    UPROPERTY()
    TArray<TObjectPtr<UQuest>> CompletedQuests;

    // Observing only: becomes null when the visitor is gone
    ___<AActor> LastVisitor;
};`,
      blanks: [{ answers: ['UPROPERTY'] }, { answers: ['TObjectPtr'] }, { answers: ['TWeakObjectPtr'] }],
      wordBank: ['UPROPERTY', 'TObjectPtr', 'TWeakObjectPtr', 'TSharedPtr', 'TStrongObjectPtr', 'UFUNCTION'],
      explanation:
        '`UPROPERTY() TObjectPtr<UQuest>` is the owning reference: reflected, so the collector traces it. `TWeakObjectPtr` observes without owning and reports `nullptr` once the visitor is destroyed or collected. `TStrongObjectPtr` is for non-reflected code, not `UObject` members, and `TSharedPtr` is reference counting for non-`UObject` types — putting a `UObject` in one creates two owners and eventually a crash.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Tracing versus reference counting',
      blocks: [
        {
          type: 'p',
          text: 'In the C++ course, [[shared-ptr|std::shared_ptr]] managed shared lifetimes with [[reference-counting]]: every copy increments a counter, every destruction decrements it, and the object dies when it reaches zero. Its weak spot is cycles:',
        },
        {
          type: 'code',
          title: 'shared_cycle.cpp',
          runnable: true,
          code: `#include <iostream>
#include <memory>

struct Enemy {
    char name;
    std::shared_ptr<Enemy> rival;

    explicit Enemy(char n) : name{n} {}
    ~Enemy() { std::cout << "~Enemy " << name << '\\n'; }
};

int main() {
    {
        auto a = std::make_shared<Enemy>('A');
        auto b = std::make_shared<Enemy>('B');
        a->rival = b;
        b->rival = a;  // a cycle: each keeps the other alive
    }
    std::cout << "cycle scope left\\n";
    {
        auto c = std::make_shared<Enemy>('C');
    }
    std::cout << "done\\n";
}`,
          output: 'cycle scope left\n~Enemy C\ndone',
          annotations: [
            { lines: '16-17', text: 'A and B each hold a strong pointer to the other, so each count stays at 1 after the local `shared_ptr`s go away.' },
            { lines: 18, text: 'Neither destructor runs: A and B leak. With `shared_ptr`, you must break cycles yourself with [[weak-ptr|std::weak_ptr]].' },
            { lines: '20-22', text: 'Without a cycle, destruction is immediate and deterministic: `~Enemy C` prints at the closing brace.' },
          ],
        },
        {
          type: 'p',
          text: 'In Unreal, two objects that reference each other through `UPROPERTY`s, but that nothing reachable references, are both unmarked — and both collected. Tracing does not care about cycles at all, only about reachability.',
        },
        {
          type: 'table',
          headers: ['Aspect', 'std::shared_ptr (reference counting)', 'Unreal GC (tracing)'],
          rows: [
            ['When objects die', 'Immediately, when the count hits zero', 'At the next collection, possibly a minute later'],
            ['Cost of copying a pointer', 'Atomic increment/decrement every time', 'None'],
            ['Cycles', 'Leak unless broken with `weak_ptr`', 'Collected automatically'],
            ['Pause cost', 'None, but cascades of destruction can be slow', 'Periodic mark phase proportional to object count'],
            ['Needs to know where pointers are', 'No — the pointer type does the work', 'Yes — reflection (`UPROPERTY`) must describe every reference'],
            ['Destructor timing', 'Deterministic: good for RAII', 'Not deterministic: do not rely on it for gameplay cleanup'],
          ],
          caption: 'Neither is "better": they trade determinism for convenience in opposite directions.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Never mix the two',
          text: 'Do not hold a `UObject` in a `std::shared_ptr` or Unreal\'s `TSharedPtr`. Both the reference count and the collector would believe they own it, and whichever frees it first leaves the other with a dangling pointer. Smart pointers are for non-`UObject` types; `UObject`s belong to the collector.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Consequence for cleanup code',
          text: 'Because a `UObject`\'s destructor runs whenever the collector gets to it — possibly after the world it lived in is gone — gameplay cleanup does not belong there. Actors have `EndPlay` for that, which you will meet in the next unit.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'Two `UObject`s, a squad and its leader, reference each other through `UPROPERTY` members. The level releases its last reference to the squad, and nothing else references either object. What happens?',
      options: [
        {
          text: 'Both leak forever, because each keeps the other\'s reference alive',
          why: 'That is the `std::shared_ptr` cycle problem. A tracing collector does not count references; it asks whether a root can reach the object.',
        },
        {
          text: 'Both are destroyed at the next garbage collection',
          correct: true,
          why: 'Correct. Marking starts from the roots, never reaches either object, so both are swept — the cycle between them is irrelevant.',
        },
        {
          text: 'Both are destroyed immediately, as soon as the last outside reference disappears',
          why: 'Destruction waits for the next collection; Unreal does not track individual reference changes.',
        },
        {
          text: 'The engine crashes, because destroying one leaves the other with a dangling reference',
          why: 'Both are unreachable and collected in the same pass, and `UPROPERTY` references are managed by the collector, so no dangling pointer is exposed.',
        },
      ],
      explanation:
        'Reachability from the root set is the only question a tracing collector asks. That makes cycles harmless, at the price of non-deterministic destruction timing — the opposite trade-off from reference counting.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'A plain C++ class (not a `UCLASS`, managed through a `TSharedPtr`) must keep a loaded `UDataAsset` alive for as long as the class instance exists. What is the best tool?',
      options: [
        {
          text: 'Add `UPROPERTY()` to the `UDataAsset*` member',
          why: 'UHT only processes members of reflected types. In a plain class the macro expands to nothing and the collector never sees the member.',
        },
        {
          text: 'A `TWeakObjectPtr<UDataAsset>` member',
          why: 'A weak pointer would tell you when the asset has been collected, but it would not prevent the collection — the opposite of what is needed.',
        },
        {
          text: 'A raw `UDataAsset*` member — loaded assets are never collected',
          why: 'Loaded assets are collected like any other `UObject` once nothing reachable references them.',
        },
        {
          text: 'A `TStrongObjectPtr<UDataAsset>` member',
          correct: true,
          why: 'Correct. It keeps the asset rooted exactly as long as the handle exists, and releases it automatically when the class instance is destroyed (RAII).',
        },
      ],
      explanation:
        'Inside reflected types, ownership is a `UPROPERTY`. Outside them, use `TStrongObjectPtr` for a few pointers or `FGCObject` for collections. `AddToRoot` also works but relies on you never forgetting `RemoveFromRoot`, which is why RAII wrappers are preferred.',
    },
  ],
  takeaways: [
    'Unreal frees `UObject`s with a mark-and-sweep collector: anything not reachable from the root set through collector-visible references is destroyed.',
    'Only reflected references count: `UPROPERTY` pointers, containers and structs. A pointer without `UPROPERTY` — raw or `TObjectPtr` — is invisible, and its target can be freed under it.',
    'Missing-`UPROPERTY` bugs crash long after the mistake; use `obj gc` or `gc.CollectGarbageEveryFrame 1` to expose them.',
    'Use `UPROPERTY() TObjectPtr<T>` for member references in headers; raw `T*` for locals and parameters.',
    'Destroyed actors are flagged as garbage at once and freed at the next collection, which also nulls `UPROPERTY` references; check them with `IsValid()`, which cannot save untracked dangling pointers.',
    'From non-reflected code, keep objects alive with `TStrongObjectPtr` or `FGCObject`; `AddToRoot` is rare and leaks if you forget `RemoveFromRoot`.',
    'Tracing GC collects cycles and makes pointer copies free, but destruction timing is non-deterministic — the opposite trade-off from `std::shared_ptr`.',
  ],
  reading: [
    {
      title: 'Unreal Object Handling',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-object-handling-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s explanation of garbage collection, automatic reference clearing and why `UPROPERTY` matters.',
    },
    {
      title: 'Objects',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/objects-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How `UObject`s are destroyed and what `IsValid` checks.',
    },
    {
      title: 'Tracing garbage collection',
      url: 'https://en.wikipedia.org/wiki/Tracing_garbage_collection',
      source: 'article',
      note: 'The general theory behind mark-and-sweep, roots and reachability, with its trade-offs against reference counting.',
    },
    {
      title: 'std::shared_ptr',
      url: 'https://en.cppreference.com/w/cpp/memory/shared_ptr',
      source: 'cppreference',
      note: 'Revisit the reference-counting model to compare it precisely with Unreal\'s tracing collector.',
    },
  ],
};
