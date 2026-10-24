import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-delegates-basics',
  title: 'Delegates Explained',
  summary:
    'Type-safe callbacks, the observer pattern, single-cast and multicast delegates — and how they compare with std::function.',
  minutes: 17,
  objectives: [
    'Explain delegates as type-safe callbacks and why decoupling with the observer pattern matters',
    'Declare single-cast delegates with parameters and return values using the `DECLARE_DELEGATE` family',
    'Choose `BindUObject`, `BindLambda`, `BindWeakLambda`, `BindRaw` or `BindSP` to match the target\'s lifetime',
    'Execute delegates safely with `ExecuteIfBound` and `IsBound`',
    'Use multicast delegates with `AddUObject`, `Broadcast`, `FDelegateHandle` and `Remove`',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The coupling problem',
      blocks: [
        {
          type: 'p',
          text: 'A health component reaches zero. Lots of things should react: the HUD shows a death screen, the score goes up, a sound plays, an achievement unlocks. The obvious implementation calls each of them directly — and it quietly ruins your codebase:',
        },
        {
          type: 'compare',
          left: {
            title: 'Health knows everyone',
            tone: 'bad',
            code: `#include "MyHUD.h"
#include "ScoreManager.h"
#include "Achievements.h"

void UHealthComponent::Die() {
    HUD->ShowDeathScreen();
    Score->AddKill(LastAttacker);
    Achievements->Unlock(TEXT("FirstBlood"));
}`,
            text: 'Every new reaction means editing (and recompiling) the health component. It cannot be reused on a barrel, because a barrel has no HUD or score.',
          },
          right: {
            title: 'Health knows no one',
            tone: 'good',
            code: `void UHealthComponent::Die() {
    OnDeath.Broadcast(LastAttacker);
}

// The HUD, score and achievement
// systems each subscribe to OnDeath
// themselves.`,
            text: 'The component announces *what happened*. Whoever cares subscribes. Adding a reaction never touches this file.',
          },
        },
        {
          type: 'p',
          text: 'That right-hand design is the [[observer-pattern]]: a *subject* publishes events, *observers* subscribe to them. In Unreal, the tool for it is the [[delegate]] — a **type-safe callback**: an object that stores "call *this* function on *that* object", whose signature (parameter and return types) is checked by the compiler.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why decoupling pays off',
          text: 'Fewer `#include`s means faster builds and no circular dependencies. Components become reusable: the same `UHealthComponent` works on players, enemies and explosive barrels, because it does not know what listens. And features can be added or removed — a kill-cam, a stats tracker — without risk to the code that raises the event.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          text: 'A delegate is a newsletter. The publisher writes one issue and sends it to whoever signed up; it neither knows nor cares whether that is three readers or three thousand. Readers can unsubscribe at any time without the publisher changing anything.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'What is the main benefit of `UHealthComponent` broadcasting an `OnDeath` delegate instead of calling the HUD and score systems directly?',
      options: [
        {
          text: 'Delegates make the death logic run faster',
          why: 'A delegate call adds a small indirection; it is not faster than a direct call. The benefit is structural, not speed.',
        },
        {
          text: 'The component no longer depends on its listeners, so it can be reused and extended without editing it',
          correct: true,
          why: 'Exactly. The component depends only on the delegate\'s signature. Listeners can be added, removed or swapped freely.',
        },
        {
          text: 'Delegates guarantee that listeners run in a fixed, predictable order',
          why: 'Unreal does not promise an order for multicast listeners. Code that needs strict ordering should not rely on a broadcast.',
        },
        {
          text: 'It lets the HUD access the component\'s private health variable',
          why: 'Delegates pass whatever parameters you declare; they do not bypass access control.',
        },
      ],
      explanation:
        'Delegates invert the dependency. Instead of the health component depending on the HUD, score and audio, those systems depend on the health component\'s public event. This is the same reasoning as programming to an interface in the C++ course: depend on a contract, not on concrete classes.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Your first delegate: DECLARE_DELEGATE',
      blocks: [
        {
          type: 'p',
          text: 'A delegate type is declared with a macro at file scope, usually near the top of a header, after the includes. The macro name encodes the signature:',
        },
        {
          type: 'table',
          headers: ['Macro', 'Bound function looks like'],
          rows: [
            ['`DECLARE_DELEGATE(FOnDoorOpened)`', '`void F()`'],
            ['`DECLARE_DELEGATE_OneParam(FOnAmmoChanged, int32)`', '`void F(int32)`'],
            ['`DECLARE_DELEGATE_TwoParams(FOnHit, AActor*, float)`', '`void F(AActor*, float)` — and so on up to `_NineParams`'],
            ['`DECLARE_DELEGATE_RetVal(bool, FCanRespawn)`', '`bool F()`'],
            ['`DECLARE_DELEGATE_RetVal_OneParam(bool, FCanOpenDoor, APawn*)`', '`bool F(APawn*)`'],
          ],
        },
        {
          type: 'code',
          title: 'Door.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Door.generated.h"

DECLARE_DELEGATE(FOnDoorOpened);
DECLARE_DELEGATE_RetVal_OneParam(bool, FCanOpenDoor, APawn*);

UCLASS()
class MYGAME_API ADoor : public AActor {
    GENERATED_BODY()

public:
    FOnDoorOpened OnOpened;
    FCanOpenDoor CanOpen;

    void TryOpen(APawn* Opener);
};`,
          annotations: [
            { lines: 7, text: 'Declares a new *type*, `FOnDoorOpened`: a delegate that can hold any `void()` function. By convention delegate types start with `F` and events with `On`.' },
            { lines: 8, text: 'Return type first, then the name, then the parameter types. Listeners can now *answer a question*: "may this pawn open the door?"' },
            { lines: '15-16', text: 'Plain members — native delegates are not `UPROPERTY`s (the reflection system cannot see them; dynamic delegates in the next lesson can be).' },
          ],
        },
        {
          type: 'code',
          title: 'Door.cpp and PuzzleManager.cpp',
          code: `void ADoor::TryOpen(APawn* Opener) {
    if (CanOpen.IsBound() && !CanOpen.Execute(Opener)) {
        return;  // a listener said no
    }
    // ... play the opening animation ...
    OnOpened.ExecuteIfBound();
}

void APuzzleManager::BeginPlay() {
    Super::BeginPlay();
    Door->CanOpen.BindUObject(this, &APuzzleManager::IsSolved);
    Door->OnOpened.BindUObject(this, &APuzzleManager::OnDoorOpened);
}`,
          annotations: [
            { lines: 2, text: 'Ask the bound function, if there is one. The door has no idea that a puzzle — rather than a key, a quest or a timer — is making the decision.' },
            { lines: 6, text: 'Notify the listener, if any. Safe when nothing is bound.' },
            { lines: '11-12', text: 'The puzzle manager binds its own member functions. `IsSolved` must have the signature `bool (APawn*)`, `OnDoorOpened` must be `void ()` — the compiler checks both.' },
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Why macros?',
          text: 'Unreal\'s delegate system predates widespread compiler support for C++11 variadic templates, so one macro per arity was the practical way to generate the types. In UE5 the macros simply expand to aliases of the variadic template `TDelegate<Signature>` — you could write `TDelegate<void(int32)>` yourself — but the macros remain the house style, and dynamic delegates still need them for reflection.',
        },
        {
          type: 'deepdive',
          title: 'What the macro expands to',
          blocks: [
            {
              type: 'code',
              code: `DECLARE_DELEGATE_OneParam(FOnAmmoChanged, int32);
// is (roughly) the same as
typedef TDelegate<void(int32)> FOnAmmoChanged;

DECLARE_MULTICAST_DELEGATE_OneParam(FOnDeath, AActor*);
// is (roughly) the same as
typedef TMulticastDelegate<void(AActor*)> FOnDeath;`,
              annotations: [
                { lines: 3, text: 'The function type `void(int32)` — exactly the syntax `std::function<void(int32)>` uses.' },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'fill',
      prompt: 'Complete the code: declare a delegate taking one `int32`, call it safely even when nothing is bound, and bind a HUD member function to it.',
      template: `___(FOnAmmoChanged, int32);

// AWeapon member:
FOnAmmoChanged OnAmmoChanged;

// In AWeapon::Fire():
--Ammo;
OnAmmoChanged.___(Ammo);

// In AMyHUD::BeginPlay():
Weapon->OnAmmoChanged.___(this, &AMyHUD::UpdateAmmo);`,
      blanks: [
        { answers: ['DECLARE_DELEGATE_OneParam'] },
        { answers: ['ExecuteIfBound'] },
        { answers: ['BindUObject'] },
      ],
      wordBank: [
        'DECLARE_DELEGATE_OneParam',
        'DECLARE_DELEGATE',
        'ExecuteIfBound',
        'Execute',
        'Broadcast',
        'BindUObject',
        'BindRaw',
        'AddUObject',
      ],
      explanation:
        '`DECLARE_DELEGATE_OneParam` matches one parameter (plain `DECLARE_DELEGATE` takes none). `ExecuteIfBound` is the safe call; `Execute` crashes when nothing is bound, and `Broadcast` belongs to multicast delegates. `BindUObject` is right for a `UObject` such as a HUD: the delegate tracks the object weakly. `BindRaw` has no such safety, and `AddUObject` is the multicast spelling.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Binding: match the binder to the lifetime',
      blocks: [
        {
          type: 'p',
          text: 'A delegate stores *what to call* and *what to call it on*. The big danger with any callback is the object dying while the delegate still points at it. Unreal gives you a binder for each kind of object, and choosing correctly is mostly about **who manages that object\'s lifetime**:',
        },
        {
          type: 'code',
          title: 'The Bind family',
          code: `// UObject member function — tracked weakly
OnAmmo.BindUObject(this, &AMyHUD::UpdateAmmo);

// Lambda — copied into the delegate
OnAmmo.BindLambda([](int32 Ammo) {
    UE_LOG(LogTemp, Log, TEXT("Ammo: %d"), Ammo);
});

// Lambda tied to a UObject's lifetime
OnAmmo.BindWeakLambda(this, [this](int32 Ammo) {
    LastAmmo = Ammo;
});

// Object owned by a TSharedRef / TSharedPtr — tracked weakly
OnAmmo.BindSP(LoggerRef, &FAmmoLogger::Log);

// Plain C++ object — no safety net at all
OnAmmo.BindRaw(&AmmoLogger, &FAmmoLogger::Log);

// Free or static function
OnAmmo.BindStatic(&LogAmmoGlobally);`,
          annotations: [
            { lines: 2, text: 'Stores a *weak* reference. If the HUD is destroyed and garbage-collected, the delegate reports itself unbound instead of calling into freed memory.' },
            { lines: '5-7', text: 'Captures nothing, so it is always safe. A lambda that captures `this` or references is only as safe as those captures.' },
            { lines: '10-12', text: 'Captures `this`, but the delegate also holds `this` weakly and skips the call once the object is gone — the safe way to use a capturing lambda on a `UObject`.' },
            { lines: 15, text: 'For non-`UObject` classes managed by [[tsharedptr|Unreal\'s shared pointers]] (the `std::shared_ptr` equivalent you will meet later). `LoggerRef` is a `TSharedRef<FAmmoLogger>`.' },
            { lines: 18, text: 'Just a raw pointer. If `AmmoLogger` is destroyed first, executing the delegate is [[undefined-behavior]]. You must unbind manually.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Both delegates still point at objects that were just destroyed. Only the weak binding can tell.',
          regions: [
            {
              label: 'OnAmmo — bound with BindUObject',
              kind: 'other',
              cells: [
                { name: 'object', type: 'weak UObject ref', value: 'checked before every call', pointsTo: 'hud' },
                { name: 'function', type: 'method pointer', value: '&AMyHUD::UpdateAmmo' },
              ],
            },
            {
              label: 'OnLog — bound with BindRaw',
              kind: 'other',
              cells: [
                { name: 'object', type: 'FAmmoLogger*', value: '0x2a40 (never checked)', pointsTo: 'logger' },
                { name: 'function', type: 'method pointer', value: '&FAmmoLogger::Log' },
              ],
            },
            {
              label: 'Heap',
              kind: 'heap',
              cells: [
                { id: 'hud', name: 'AMyHUD', value: 'garbage-collected → IsBound() is false', highlight: true },
                { id: 'logger', name: 'FAmmoLogger', address: '0x2a40', value: 'deleted → calling it is UB', highlight: true },
              ],
            },
          ],
        },
        {
          type: 'table',
          headers: ['Target', 'Binder', 'If the target dies first…'],
          rows: [
            ['`UObject` member function', '`BindUObject`', 'Delegate becomes unbound — safe'],
            ['Lambda capturing `this` (a `UObject`)', '`BindWeakLambda`', 'Call is skipped — safe'],
            ['Lambda with no dangerous captures', '`BindLambda`', 'Nothing to die'],
            ['Shared-pointer-owned C++ object', '`BindSP`', 'Delegate becomes unbound — safe'],
            ['Any other C++ object', '`BindRaw`', 'Dangling pointer — crash or worse'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why can Unreal track UObjects but not raw C++ objects?',
          text: 'The engine knows when every `UObject` is destroyed, because the [[ue-garbage-collector|garbage collector]] owns that process, so a delegate can hold a weak object pointer and check it before calling. A plain C++ object is just memory; nothing announces its death. `TSharedPtr`-owned objects have a reference count the delegate can watch. A raw pointer offers nothing to watch, which is why `BindRaw` is the binder of last resort.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Payload arguments',
          text: 'Binders accept extra trailing arguments that are stored and passed after the delegate\'s own parameters: `OnAmmo.BindUObject(this, &AMyHUD::UpdateSlot, 2)` calls `UpdateSlot(Ammo, 2)`. Handy when one handler serves several sources.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'bug',
      prompt: 'This compiles, but the log prints garbage — or the game crashes — the first time the boss kills a minion. Tap the line with the bug.',
      code: `void AArena::BeginPlay() {
    Super::BeginPlay();

    int32 KillCount = 0;
    Boss->OnKilledMinion.BindLambda([&KillCount]() {
        ++KillCount;
        UE_LOG(LogTemp, Log, TEXT("Kills: %d"), KillCount);
    });
}`,
      bugLines: [5],
      hint: 'When does the lambda run, and where does `KillCount` live at that moment?',
      explanation:
        'The lambda captures the **local** variable `KillCount` by reference. `BeginPlay` returns immediately, so `KillCount`\'s stack storage is gone long before the boss kills anything; the delegate later writes through a [[dangling-reference]] — undefined behaviour. This is the same capture-lifetime rule as in the C++ lambdas lesson; delegates just make "later" very likely. Fix: make the counter a member and bind safely, e.g. `BindUObject(this, &AArena::OnMinionKilled)` or `BindWeakLambda(this, [this]() { ++KillCount; })`.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Executing safely',
      blocks: [
        {
          type: 'p',
          text: 'Single-cast delegates hold at most one binding. Before calling, you must consider the case where nothing is bound — or the bound object has died:',
        },
        {
          type: 'code',
          title: 'Door.cpp',
          code: `// void delegate: the safe one-liner
OnOpened.ExecuteIfBound();

// RetVal delegate: check first, then Execute
bool bAllowed = true;  // our default when nobody answers
if (CanOpen.IsBound()) {
    bAllowed = CanOpen.Execute(Opener);
}

// Never do this unless binding is guaranteed:
// OnOpened.Execute();

CanOpen.Unbind();  // remove the binding`,
          annotations: [
            { lines: 2, text: 'Calls the function if one is bound *and* still valid; otherwise does nothing (and returns `false`).' },
            { lines: '5-8', text: 'A delegate with a return value has no `ExecuteIfBound`, so you decide what the answer is when nobody is listening.' },
            { lines: 11, text: '`Execute` on an unbound delegate dereferences a null binding — a crash.' },
            { lines: 13, text: 'After `Unbind`, `IsBound()` is false again.' },
          ],
        },
        {
          type: 'table',
          headers: ['Call', 'Nothing bound', 'Bound UObject destroyed'],
          rows: [
            ['`Execute(...)`', 'Crash', 'Crash or undefined behaviour'],
            ['`ExecuteIfBound(...)`', 'No-op (void delegates only)', 'No-op'],
            ['`IsBound()`', '`false`', '`false`'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does ExecuteIfBound only exist for void delegates?',
          text: 'If nothing is bound, what would `CanOpen.ExecuteIfBound(Opener)` return? There is no correct `bool` to invent — `true` might open a locked door, `false` might soft-lock the player. Rather than pick a default for you, Unreal only offers `ExecuteIfBound` where there is no value to return, and makes you write the `IsBound()` check — with *your* default — for everything else.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'truefalse',
      prompt: '`ExecuteIfBound` works on any single-cast delegate, including ones declared with `DECLARE_DELEGATE_RetVal`.',
      answer: false,
      explanation:
        '`ExecuteIfBound` is only provided for delegates that return `void`; calling it on a `RetVal` delegate does not compile. For those, check `IsBound()` and then call `Execute(...)`, supplying your own fallback value for the unbound case — a deliberate design choice so a missing listener can never silently produce a made-up answer.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Multicast delegates: one event, many listeners',
      blocks: [
        {
          type: 'p',
          text: 'A death is something *many* systems care about, so it needs a [[multicast-delegate]]: any number of bindings, all called by one `Broadcast`. The `Add…` functions mirror the `Bind…` ones and return an [[fdelegatehandle]] identifying the new binding.',
        },
        {
          type: 'code',
          title: 'HealthComponent.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "HealthComponent.generated.h"

DECLARE_MULTICAST_DELEGATE_OneParam(FOnDeath, AActor* /*Killer*/);

UCLASS(ClassGroup = (Custom), meta = (BlueprintSpawnableComponent))
class MYGAME_API UHealthComponent : public UActorComponent {
    GENERATED_BODY()

public:
    FOnDeath OnDeath;

    void ApplyHit(float Damage, AActor* DamageCauser);

private:
    UPROPERTY(EditAnywhere, Category = "Health")
    float Health = 100.f;
};`,
          annotations: [
            { lines: 7, text: 'Same pattern as single-cast, with `MULTICAST` in the name. The commented parameter name documents intent; native delegates only need types.' },
            { lines: 14, text: 'A public member so other objects can subscribe. Only the component itself should call `Broadcast`, by convention.' },
          ],
        },
        {
          type: 'code',
          title: 'HealthComponent.cpp and ScoreKeeper.cpp',
          code: `void UHealthComponent::ApplyHit(float Damage, AActor* DamageCauser) {
    if (Health <= 0.f) {
        return;  // already dead
    }
    Health = FMath::Max(Health - Damage, 0.f);
    if (Health == 0.f) {
        OnDeath.Broadcast(DamageCauser);
    }
}

void AScoreKeeper::Watch(UHealthComponent* Health) {
    WatchedHealth = Health;
    DeathHandle = Health->OnDeath.AddUObject(
        this, &AScoreKeeper::HandleDeath);
}

void AScoreKeeper::EndPlay(const EEndPlayReason::Type Reason) {
    if (UHealthComponent* Health = WatchedHealth.Get()) {
        Health->OnDeath.Remove(DeathHandle);
    }
    DeathHandle.Reset();
    Super::EndPlay(Reason);
}`,
          annotations: [
            { lines: 7, text: 'Calls every bound listener. Safe with zero listeners — no `IsBound` check needed.' },
            { lines: 12, text: '`WatchedHealth` is a `TWeakObjectPtr<UHealthComponent>` — a pointer that becomes null if the component is destroyed (covered in the memory unit).' },
            { lines: '13-14', text: 'Subscribe, keeping the handle. Other systems (HUD, audio) can subscribe to the same event independently.' },
            { lines: '18-21', text: 'Unsubscribe exactly this binding. `Health->OnDeath.RemoveAll(this)` would remove every binding this object made.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**No return values.** Multicast signatures must return `void` — if three listeners answered, whose answer would win?',
            '**No guaranteed order.** Do not write listeners that depend on running before or after each other.',
            '**Removing is good hygiene.** `AddUObject` bindings to a destroyed object are skipped automatically, but `AddRaw` and capturing `AddLambda` bindings are not — and an explicit `Remove` in `EndPlay` keeps behaviour predictable either way.',
          ],
        },
        {
          type: 'deepdive',
          title: 'What Broadcast actually does',
          blocks: [
            {
              type: 'p',
              text: 'A multicast delegate is essentially an array of single-cast delegate instances. `Broadcast` walks that array and, for each entry, checks whether the binding is still safe to execute (for `UObject` and shared-pointer bindings, whether the target is still alive) before calling it. Dead weak bindings are skipped and cleaned out later.',
            },
            {
              type: 'p',
              text: 'The array is locked while a broadcast is in progress, so a listener that removes itself (or another listener) from inside its handler does not corrupt the iteration: the removed entry is just cleared and compacted away afterwards. That is a real advantage over the hand-rolled `std::vector<std::function<…>>` version, where erasing during the loop invalidates your iterators — the [[iterator-invalidation]] trap from the containers unit.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'Why can\'t you declare a multicast delegate whose functions return a value, such as `bool`?',
      options: [
        {
          text: 'Because `Broadcast` runs listeners on worker threads, and return values cannot cross threads',
          why: '`Broadcast` calls listeners synchronously on the calling thread, one after another.',
        },
        {
          text: 'Because with many listeners there is no single meaningful result to return',
          correct: true,
          why: 'Right. Should it return the first answer, the last, the logical AND? Any choice would be arbitrary, so the signature is restricted to `void`.',
        },
        {
          text: 'Because multicast delegates can only bind `UObject`s',
          why: 'Multicast delegates support `AddRaw`, `AddLambda`, `AddSP` and `AddStatic` as well as `AddUObject`. Return types have nothing to do with it.',
        },
        {
          text: 'It is possible — use `DECLARE_MULTICAST_DELEGATE_RetVal`',
          why: 'No such macro exists, precisely because combining several return values has no single right answer.',
        },
      ],
      explanation:
        'If you need answers from many parties — say, "does anyone veto this door opening?" — pass a mutable parameter that listeners can update (e.g. a `bool&` or a small result struct), or query each candidate explicitly. A single-cast `RetVal` delegate fits when exactly one party decides.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Unreal delegates vs std::function',
      blocks: [
        {
          type: 'p',
          text: 'In the C++ course you stored callbacks in [[std-function]]. Unreal delegates solve the same problem, with features a game engine needs:',
        },
        {
          type: 'compare',
          left: {
            title: 'Standard C++',
            tone: 'neutral',
            code: `std::vector<std::function<void(Actor*)>>
    onDeath;
onDeath.push_back([this](Actor* k) {
    addKill(k);
});
for (auto& f : onDeath) {
    f(killer);
}`,
            text: 'Flexible, but listeners are anonymous: unsubscribing needs your own bookkeeping, and a captured `this` dangles silently.',
          },
          right: {
            title: 'Unreal',
            tone: 'good',
            code: `DECLARE_MULTICAST_DELEGATE_OneParam(
    FOnDeath, AActor*);
FOnDeath OnDeath;
Handle = OnDeath.AddUObject(
    this, &AScoreKeeper::AddKill);
OnDeath.Broadcast(Killer);`,
            text: 'Multicast is built in, handles make removal easy, and `UObject` bindings are skipped once the object is gone.',
          },
        },
        {
          type: 'table',
          headers: ['Feature', '`std::function`', 'Unreal delegate'],
          rows: [
            ['Signature', 'Template argument: `std::function<void(int)>`', 'Macro → alias of `TDelegate<void(int)>`'],
            ['Binds', 'Any callable', 'Member functions, lambdas, free functions via the `Bind…` family'],
            ['Knows when the target dies', 'No', 'Yes for `BindUObject`, `BindSP`, `BindWeakLambda`'],
            ['Many listeners', 'Build it yourself', 'Multicast delegates with `FDelegateHandle`'],
            ['Calling with nothing bound', 'Throws `std::bad_function_call`', '`Execute` crashes; `ExecuteIfBound` / `Broadcast` are no-ops'],
            ['Visible to Blueprint / serializable', 'No', 'Dynamic delegates only (next lesson)'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why didn\'t Epic just use std::function?',
          text: 'Partly history — the system predates it being universally available on every console toolchain. But mostly integration: lifetime-aware binding to garbage-collected `UObject`s, built-in multicast with handles, and (for dynamic delegates) reflection, serialization and Blueprint support. A plain `std::function` can do none of those, and bolting them on would recreate what delegates already are.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: '`FInventoryCache` is a plain C++ class (not a `UObject`) owned by a `TSharedRef`. It wants to listen to a native multicast delegate `OnItemAdded`. Which binding is the best fit?',
      options: [
        {
          text: '`OnItemAdded.AddUObject(Cache, &FInventoryCache::Refresh)`',
          why: '`AddUObject` requires a `UObject`-derived class; this does not compile for `FInventoryCache`.',
        },
        {
          text: '`OnItemAdded.AddRaw(&Cache.Get(), &FInventoryCache::Refresh)`',
          why: 'It compiles and works — until the cache is destroyed while still bound. Raw bindings have no lifetime tracking, so this is the fallback, not the best fit.',
        },
        {
          text: '`OnItemAdded.AddLambda([&Cache]() { Cache->Refresh(); })`',
          why: 'This captures a *reference* to the `TSharedRef` variable, which may itself go out of scope; and even with a copy it would keep the cache alive forever. Neither is what you want.',
        },
        {
          text: '`OnItemAdded.AddSP(Cache, &FInventoryCache::Refresh)`',
          correct: true,
          why: 'Yes. `AddSP` holds the shared-pointer-owned object *weakly*: it does not keep the cache alive, and it skips the call once the cache is destroyed.',
        },
      ],
      explanation:
        'Choose the binder by ownership: `UObject` → `AddUObject`/`AddWeakLambda`; shared-pointer-owned C++ object → `AddSP`; anything else → `AddRaw` with a disciplined `Remove`. Weak bindings mean the delegate never extends a lifetime and never calls into a dead object.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Delegates you have already met — and which kind to use',
      blocks: [
        {
          type: 'p',
          text: 'Delegates are everywhere in Unreal, often behind friendlier APIs:',
        },
        {
          type: 'list',
          items: [
            '**Input bindings.** `BindAction(IA_Jump, ETriggerEvent::Started, this, &ACharacter::Jump)` creates a native delegate bound to your member function — which is why the handler did not need to be a `UFUNCTION`.',
            '**Timers.** The timer manager (next unit) calls you back through a delegate, e.g. `FTimerDelegate::CreateUObject(this, &ABomb::Explode)`.',
            '**Collision.** `OnComponentHit` and `OnComponentBeginOverlap` are *dynamic* multicast delegates — the topic of the next two lessons.',
            '**Engine-wide events.** Classes like `FCoreDelegates` and `FWorldDelegates` expose global events (application lifecycle, world creation) as static multicast delegates.',
          ],
        },
        {
          type: 'table',
          headers: ['You need…', 'Use'],
          rows: [
            ['Exactly one listener, maybe answering a question', 'Single-cast: `DECLARE_DELEGATE…` / `…_RetVal…`'],
            ['Any number of C++ listeners', 'Multicast: `DECLARE_MULTICAST_DELEGATE…`'],
            ['Blueprint listeners, or bindings saved in assets', 'Dynamic multicast: `DECLARE_DYNAMIC_MULTICAST_DELEGATE…` (next lesson)'],
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          text: 'Native delegates are cheap: a call is an indirect function call plus a validity check for weak bindings. Passing delegates around *by value* copies their bindings (which may allocate), so prefer `const&` parameters when a function takes a delegate.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'order',
      prompt: 'Put these lines in the order they are written or executed over a listener\'s lifetime: declare the type, declare the member, subscribe, fire, unsubscribe.',
      lines: [
        'DECLARE_MULTICAST_DELEGATE_OneParam(FOnDeath, AActor*);',
        'FOnDeath OnDeath;  // UHealthComponent member',
        'Handle = Health->OnDeath.AddUObject(this, &AScoreKeeper::OnDied);',
        'OnDeath.Broadcast(Killer);',
        'Health->OnDeath.Remove(Handle);',
      ],
      distractors: ['OnDeath.ExecuteIfBound(Killer);'],
      explanation:
        'The type must exist before a member of that type, a listener must subscribe before a broadcast can reach it, and it unsubscribes with the handle it saved (typically in `EndPlay`). `ExecuteIfBound` is the single-cast API — multicast delegates use `Broadcast`, which is always safe to call.',
    },
  ],
  takeaways: [
    'A delegate is a type-safe callback; multicast delegates implement the observer pattern so event sources do not depend on their listeners.',
    'Declare types with macros: `DECLARE_DELEGATE[_OneParam…]`, `_RetVal` variants for return values, `DECLARE_MULTICAST_DELEGATE…` for many listeners.',
    'Pick the binder by lifetime: `BindUObject`/`BindWeakLambda` for UObjects, `BindSP` for shared-pointer objects, `BindRaw` only with manual unbinding; beware lambdas capturing locals or `this`.',
    'Call single-cast delegates with `ExecuteIfBound`, or `IsBound()` + `Execute` for `RetVal`; plain `Execute` crashes when unbound.',
    'Multicast: `Add…` returns an `FDelegateHandle`, `Broadcast` is always safe, `Remove(Handle)` / `RemoveAll(this)` unsubscribe; no return values, no guaranteed order.',
    'Compared with `std::function`, Unreal delegates add lifetime-aware binding, built-in multicast and (dynamic) reflection support.',
  ],
  reading: [
    {
      title: 'Delegates and Lambda Functions in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/delegates-and-lambda-functions-in-unreal-engine',
      source: 'unreal-docs',
      note: 'The full table of declaration macros, binding functions and payload rules.',
    },
    {
      title: 'Multicast Delegates',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/multicast-delegates-in-unreal-engine',
      source: 'unreal-docs',
      note: 'All the `Add…` variants, `Broadcast` and removal, straight from Epic.',
    },
    {
      title: 'std::function',
      url: 'https://en.cppreference.com/w/cpp/utility/functional/function',
      source: 'cppreference',
      note: 'Revisit the standard library\'s callback wrapper to compare its guarantees with Unreal\'s.',
    },
  ],
};
