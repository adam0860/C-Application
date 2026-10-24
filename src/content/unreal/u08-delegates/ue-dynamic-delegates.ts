import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-dynamic-delegates',
  title: 'Dynamic Delegates and Blueprint Events',
  summary:
    'Reflected, serializable delegates: BlueprintAssignable events, AddDynamic, why handlers must be UFUNCTIONs, and what all that costs.',
  minutes: 16,
  objectives: [
    'Declare dynamic multicast delegates with type/name pairs and explain why names are required',
    'Expose events to Blueprint with `UPROPERTY(BlueprintAssignable)` and broadcast them from C++',
    'Bind and unbind C++ handlers with `AddDynamic` / `RemoveDynamic`, and explain why they must be `UFUNCTION`s',
    'Bind in `BeginPlay` rather than the constructor, and diagnose the classic binding failures',
    'Choose between native and dynamic delegates based on cost and capability',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Why native delegates are not enough',
      blocks: [
        {
          type: 'p',
          text: 'The native multicast delegates from the last lesson are fast and flexible, but they are invisible to Unreal\'s [[reflection]] system. Try to let designers bind to one from Blueprint and UnrealHeaderTool refuses:',
        },
        {
          type: 'code',
          title: 'HealthComponent.h (does not compile)',
          code: `DECLARE_MULTICAST_DELEGATE_OneParam(FOnDeath, AActor*);

UCLASS()
class MYGAME_API UHealthComponent : public UActorComponent {
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintAssignable)
    FOnDeath OnDeath;
};`,
          annotations: [
            { lines: 1, text: 'A native delegate type: a C++ template alias that UnrealHeaderTool knows nothing about.' },
            { lines: '8-9', text: 'UnrealHeaderTool reports an error: a `UPROPERTY` must have a type the reflection system can describe, and `BlueprintAssignable` requires a *dynamic multicast* delegate.' },
          ],
        },
        {
          type: 'p',
          text: 'The fix is a [[dynamic-delegate]]. "Dynamic" means the binding is not stored as a C++ function pointer but as **an object plus a function name** — data the reflection system can inspect, save to disk, and resolve at run time, which is exactly what Blueprint needs.',
        },
        {
          type: 'table',
          headers: ['Property', 'Native multicast', 'Dynamic multicast'],
          rows: [
            ['Declared with', '`DECLARE_MULTICAST_DELEGATE…`', '`DECLARE_DYNAMIC_MULTICAST_DELEGATE…`'],
            ['A binding is stored as', 'Function pointer (+ object or lambda)', 'Weak object pointer + function **name**'],
            ['Can be a `UPROPERTY` / bound in Blueprint', 'No', 'Yes (`BlueprintAssignable`)'],
            ['Serializable', 'No', 'Yes'],
            ['Lambdas', 'Yes', 'No'],
            ['Handler must be a `UFUNCTION`', 'No', 'Yes'],
            ['Cost per call', 'Low', 'Higher (lookup by name, reflected call)'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why store a name instead of a pointer?',
          text: 'A function pointer is a raw memory address. It means nothing to a Blueprint graph, cannot be written to an asset file, and changes every time the code is recompiled. A name like `"HandleDeath"` survives all of that: Blueprint nodes can refer to it, bindings can be saved, and the engine can find the function again with reflection. The trade-off is that looking something up by name is slower than jumping to an address.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'Which of these is a capability that dynamic delegates have and native delegates lack?',
      options: [
        {
          text: 'They execute faster, because the engine caches the bound function',
          why: 'It is the other way round: dynamic delegates resolve the function by name through reflection, which costs more per call.',
        },
        {
          text: 'They can be bound to lambdas',
          why: 'Dynamic delegates *cannot* bind lambdas — a lambda has no name for the reflection system to store.',
        },
        {
          text: 'They can be `UPROPERTY`s that Blueprint binds to, and their bindings can be serialized',
          correct: true,
          why: 'Yes. Because a binding is (object, function name), reflection can describe it, Blueprint can create it, and it can be saved.',
        },
        {
          text: 'Multicast versions can return values',
          why: 'No multicast delegate, native or dynamic, can return a value — there would be no single answer to return.',
        },
      ],
      explanation:
        'The defining property of a dynamic delegate is that it is *reflected data*. Everything else follows: Blueprint support and serialization (good), no lambdas, `UFUNCTION`-only handlers and slower calls (the price).',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Declaring: types *and* names',
      blocks: [
        {
          type: 'p',
          text: 'Dynamic delegate macros look like their native cousins, with one difference: every parameter is written as a **type, name** pair.',
        },
        {
          type: 'code',
          title: 'HealthComponent.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "HealthComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FOnHealthChangedSignature, float, NewHealth, float, Delta);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
    FOnDeathSignature, AActor*, Killer);`,
          annotations: [
            { lines: 5, text: 'Dynamic delegates are processed by UnrealHeaderTool, so they must live in a header that includes its `.generated.h` — and, like everything else, after it.' },
            { lines: '7-8', text: 'Type `float`, name `NewHealth`; type `float`, name `Delta`. The `…Signature` suffix is a common Unreal naming convention for dynamic delegate types.' },
            { lines: '10-11', text: 'One parameter: type `AActor*`, name `Killer`. Each declaration ends with a semicolon.' },
          ],
        },
        {
          type: 'table',
          headers: ['Macro', 'Use'],
          rows: [
            ['`DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(Name, T1, P1)` — also `_TwoParams`, `_ThreeParams`…', 'Events with many listeners, including Blueprint (`BlueprintAssignable`)'],
            ['`DECLARE_DYNAMIC_DELEGATE_OneParam(Name, T1, P1)`', 'A single callback, typically a `UFUNCTION` parameter that Blueprint wires to a custom event'],
            ['`DECLARE_DYNAMIC_DELEGATE_RetVal_OneParam(Ret, Name, T1, P1)`', 'A single callback that returns a value'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does reflection need parameter names?',
          text: 'For each dynamic delegate, UnrealHeaderTool generates a hidden *signature function* — a `UFunction` describing the parameters as reflected properties, and properties have names. Those names become the **pin labels** on Blueprint event nodes ("New Health", "Delta"), and the engine uses that description to pack arguments into a parameter block when it calls a bound function by reflection. Native delegates never go through that machinery, so they only need types.',
        },
        {
          type: 'callout',
          variant: 'warning',
          text: 'Parameter types must be ones reflection understands: `UObject` pointers, `USTRUCT`s (usually by `const&`, e.g. `const FHitResult&`), `UENUM`s, and the usual numeric, `bool`, `FString`, `FName` and `FText` types. An arbitrary C++ type will not compile in a dynamic delegate signature.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'fill',
      prompt: 'Complete the code: a Blueprint-visible score event with one `int32` parameter, exposed so Blueprint can bind it, and bound from C++ to a `UFUNCTION`.',
      template: `___(FOnScoreChangedSignature, int32, NewScore);

UPROPERTY(___, Category = "Score")
FOnScoreChangedSignature OnScoreChanged;

// In AMyHUD::BeginPlay():
Score->OnScoreChanged.___(this, &AMyHUD::HandleScoreChanged);`,
      blanks: [
        { answers: ['DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam'] },
        { answers: ['BlueprintAssignable'] },
        { answers: ['AddDynamic'] },
      ],
      wordBank: [
        'DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam',
        'DECLARE_MULTICAST_DELEGATE_OneParam',
        'DECLARE_DYNAMIC_DELEGATE_OneParam',
        'BlueprintAssignable',
        'BlueprintCallable',
        'EditAnywhere',
        'AddDynamic',
        'AddUObject',
      ],
      explanation:
        'Only a **dynamic multicast** delegate can be `BlueprintAssignable` — the native version is invisible to reflection, and a single-cast dynamic delegate cannot hold many listeners. `BlueprintCallable` on a delegate property lets Blueprint *call* (broadcast) it rather than bind to it. From C++ you bind with `AddDynamic`; `AddUObject` is the native-delegate API.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'BlueprintAssignable: events designers can use',
      blocks: [
        {
          type: 'p',
          text: 'Mark the delegate member `UPROPERTY(BlueprintAssignable)` and broadcast it from C++ whenever the event happens:',
        },
        {
          type: 'code',
          title: 'HealthComponent.h (continued)',
          code: `UCLASS(ClassGroup = (Custom), meta = (BlueprintSpawnableComponent))
class MYGAME_API UHealthComponent : public UActorComponent {
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintAssignable, Category = "Health")
    FOnHealthChangedSignature OnHealthChanged;

    UPROPERTY(BlueprintAssignable, Category = "Health")
    FOnDeathSignature OnDeath;

    UFUNCTION(BlueprintCallable, Category = "Health")
    void ApplyHit(float Damage, AActor* DamageCauser);

private:
    UPROPERTY(EditAnywhere, Category = "Health")
    float MaxHealth = 100.f;

    float Health = 100.f;
};`,
          annotations: [
            { lines: '6-7', text: '[[blueprint-assignable]]: Blueprint graphs can bind events to this delegate. It is only allowed on dynamic multicast delegates.' },
            { lines: '12-13', text: 'A [[blueprint-callable]] function so designers can also deal damage from Blueprint.' },
          ],
        },
        {
          type: 'code',
          title: 'HealthComponent.cpp',
          code: `void UHealthComponent::ApplyHit(float Damage, AActor* DamageCauser) {
    if (Health <= 0.f || Damage <= 0.f) {
        return;
    }
    const float OldHealth = Health;
    Health = FMath::Clamp(Health - Damage, 0.f, MaxHealth);
    OnHealthChanged.Broadcast(Health, Health - OldHealth);

    if (Health == 0.f) {
        OnDeath.Broadcast(DamageCauser);
    }
}`,
          annotations: [
            { lines: 7, text: 'Every bound listener — C++ or Blueprint — is called with (NewHealth, Delta). Safe with zero listeners.' },
            { lines: 10, text: 'The component still knows nothing about health bars, music or score. It just announces.' },
          ],
        },
        {
          type: 'p',
          text: 'In the editor, select the Health component on any actor and scroll to **Events** in the Details panel: *On Health Changed* and *On Death* appear with **+** buttons that create event nodes, complete with `New Health`, `Delta` and `Killer` pins. A UMG widget can do the same with a *Bind Event to On Health Changed* node.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'This is the C++ / Blueprint contract',
          text: 'Remember the workflow unit: C++ owns systems and rules, Blueprint owns content and presentation. `BlueprintAssignable` events are the main channel from C++ *up* to Blueprint. C++ decides when "health changed" happens; designers decide what it looks and sounds like — without ever asking for a recompile.',
        },
        {
          type: 'deepdive',
          title: 'Single-cast dynamic delegates as callbacks',
          blocks: [
            {
              type: 'p',
              text: 'A single-cast dynamic delegate is handy as a `UFUNCTION` parameter: Blueprint shows a delegate pin that a designer connects to a custom event.',
            },
            {
              type: 'code',
              code: `DECLARE_DYNAMIC_DELEGATE_OneParam(FOnLoadedSignature, bool, bSuccess);

UFUNCTION(BlueprintCallable, Category = "Save")
void LoadProfileAsync(FOnLoadedSignature OnLoaded);

// ...later, when loading finishes:
OnLoaded.ExecuteIfBound(true);`,
              annotations: [
                { lines: 7, text: 'The same `ExecuteIfBound` you know from native delegates. (Store a copy of the delegate if the work completes later.)' },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'You can mark a native `DECLARE_MULTICAST_DELEGATE_OneParam` member as `UPROPERTY(BlueprintAssignable)` as long as its parameter types are Blueprint-compatible.',
      answer: false,
      explanation:
        'Parameter types are not the problem — the delegate *kind* is. Native delegates are invisible to reflection, so UnrealHeaderTool rejects them as `UPROPERTY` members, and `BlueprintAssignable` is only valid on dynamic multicast delegates. Change the declaration to `DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(Name, Type, ParamName)`.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'AddDynamic: binding by name',
      blocks: [
        {
          type: 'p',
          text: 'C++ objects subscribe with [[add-dynamic]]. Here a level actor switches to tense music when the player\'s health gets low:',
        },
        {
          type: 'code',
          title: 'MusicDirector.h',
          code: `UCLASS()
class MYGAME_API AMusicDirector : public AActor {
    GENERATED_BODY()

protected:
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type Reason) override;

    UFUNCTION()
    void HandleHealthChanged(float NewHp, float Delta);

    UPROPERTY(EditInstanceOnly, Category = "Music")
    TObjectPtr<AActor> WatchedActor;

    UPROPERTY()
    TObjectPtr<UHealthComponent> WatchedHealth;
};`,
          annotations: [
            { lines: '9-10', text: '`UFUNCTION()` with no specifiers is enough — it registers the function with reflection so it can be found by name. Parameter **types** must match the delegate; the names (`NewHp` vs `NewHealth`) need not.' },
            { lines: '12-13', text: 'Set per placed instance in the level: which actor to watch.' },
          ],
        },
        {
          type: 'code',
          title: 'MusicDirector.cpp',
          code: `void AMusicDirector::BeginPlay() {
    Super::BeginPlay();
    if (!WatchedActor) {
        return;
    }
    WatchedHealth =
        WatchedActor->FindComponentByClass<UHealthComponent>();
    if (WatchedHealth) {
        WatchedHealth->OnHealthChanged.AddDynamic(
            this, &AMusicDirector::HandleHealthChanged);
    }
}

void AMusicDirector::EndPlay(const EEndPlayReason::Type Reason) {
    if (WatchedHealth) {
        WatchedHealth->OnHealthChanged.RemoveDynamic(
            this, &AMusicDirector::HandleHealthChanged);
    }
    Super::EndPlay(Reason);
}

void AMusicDirector::HandleHealthChanged(float NewHp, float Delta) {
    const bool bDanger = NewHp < 25.f;
    UE_LOG(LogTemp, Log, TEXT("Danger music: %s"),
           bDanger ? TEXT("on") : TEXT("off"));
}`,
          annotations: [
            { lines: '9-10', text: 'Looks like `AddUObject`, but what gets stored is `(this, "HandleHealthChanged")`.' },
            { lines: '16-17', text: '`RemoveDynamic` takes the same arguments — it finds the binding by object and name, so no handle is needed.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why must the handler be a UFUNCTION?',
          text: '`AddDynamic` is a macro. It turns `&AMusicDirector::HandleHealthChanged` into the string `"HandleHealthChanged"` and stores that name. The member-function pointer is used only at compile time, to check that the signature matches. At broadcast time the engine asks the object\'s class, "do you have a reflected function called `HandleHealthChanged`?" — and only `UFUNCTION`s are in that list. A plain member function compiles fine and is simply never found.',
        },
        {
          type: 'deepdive',
          title: 'Inside the AddDynamic macro',
          blocks: [
            {
              type: 'code',
              code: `#define AddDynamic(UserObject, FuncName) \\
    __Internal_AddDynamic(UserObject, FuncName, \\
        STATIC_FUNCTION_FNAME(TEXT(#FuncName)))`,
              annotations: [
                { lines: 3, text: '`#FuncName` stringifies the argument (`"&AMusicDirector::HandleHealthChanged"`), and `STATIC_FUNCTION_FNAME` trims it to the bare name after the last `::`. That `FName` is what the delegate keeps.' },
              ],
            },
            {
              type: 'p',
              text: 'This is also why you must pass the function directly (`&AMyClass::Func`), not through a variable: the macro needs the *text* of the name. Related helpers: `AddUniqueDynamic` (skips the bind if it already exists), `IsAlreadyBound(this, &AMyClass::Func)`, `RemoveAll(this)`, and `BindDynamic` / `BindUFunction` for single-cast dynamic delegates.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'bug',
      prompt: 'This compiles, but when the turret\'s health reaches zero, nothing happens — the turret is never destroyed. Tap the line that causes it.',
      code: `// Turret.h
UCLASS()
class MYGAME_API ATurret : public AActor {
    GENERATED_BODY()

protected:
    virtual void BeginPlay() override;
    void HandleDeath(AActor* Killer);

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<UHealthComponent> Health;
};

// Turret.cpp
void ATurret::BeginPlay() {
    Super::BeginPlay();
    Health->OnDeath.AddDynamic(this, &ATurret::HandleDeath);
}

void ATurret::HandleDeath(AActor* Killer) {
    Destroy();
}`,
      bugLines: [8],
      hint: 'How does a dynamic delegate find the function to call?',
      explanation:
        '`HandleDeath` is missing `UFUNCTION()`. `AddDynamic` stores the *name* `"HandleDeath"`, and at broadcast time the engine looks it up among the class\'s reflected functions — where it does not exist — so the binding is silently skipped. In development builds you will also see an ensure in the log at bind time, roughly "Unable to bind delegate to \'HandleDeath\' (function might not be marked as a UFUNCTION…)". This is probably the most common delegate bug in Unreal. Fix: put `UFUNCTION()` on the line above the declaration.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Where to bind: BeginPlay, not the constructor',
      blocks: [
        {
          type: 'p',
          text: 'Constructors feel like a natural place to wire things up, and you will even see some samples bind their own components\' events there. But `BeginPlay` (paired with `EndPlay`) is the robust default for dynamic bindings:',
        },
        {
          type: 'compare',
          left: {
            title: 'Constructor',
            tone: 'bad',
            code: `APickup::APickup() {
    Sphere = CreateDefaultSubobject<
        USphereComponent>(TEXT("Sphere"));
    RootComponent = Sphere;
    Sphere->OnComponentBeginOverlap
        .AddDynamic(this,
            &APickup::HandleOverlap);
}`,
            text: 'Runs for the Class Default Object and every time the object is created or loaded — not just when it enters a running game.',
          },
          right: {
            title: 'BeginPlay',
            tone: 'good',
            code: `void APickup::BeginPlay() {
    Super::BeginPlay();
    Sphere->OnComponentBeginOverlap
        .AddDynamic(this,
            &APickup::HandleOverlap);
}`,
            text: 'Runs once per instance, in a live world, when everything it might talk to exists.',
          },
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Other objects do not exist yet.** A constructor can only reach the object\'s own default subobjects. The player, the level and other actors\' components are unavailable, so any binding to *them* must happen later anyway.',
            '**Constructors run for the [[cdo]] and during loading.** Dynamic delegate bindings are reflected, serializable data, so a binding made at construction time can be copied into the class default and saved Blueprint or level data — a known source of duplicate calls and of "ghost" bindings to functions you have since renamed.',
            '**Live Coding does not re-run constructors** for objects that already exist, so edits to constructor bindings often seem to have no effect until you restart the editor.',
            '**Symmetry.** Bind in `BeginPlay`, unbind in `EndPlay`. The lifetime of the subscription matches the lifetime of the object\'s participation in the game.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          text: '`PostInitializeComponents()` is another reasonable place for binding to your *own* components: it runs once per instance in a world, before `BeginPlay`, and never for the CDO. Whatever you choose, do not bind in two places — see the next question.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'A pickup binds `OnComponentBeginOverlap.AddDynamic(this, &APickup::HandleOverlap)` in its constructor **and** again in `BeginPlay`. What is the likely result when the player touches it?',
      options: [
        {
          text: 'The second `AddDynamic` replaces the first, so `HandleOverlap` runs once',
          why: '`AddDynamic` adds to the invocation list; it does not replace. Use `AddUniqueDynamic` if you want "only if not already bound".',
        },
        {
          text: '`HandleOverlap` runs twice per overlap, and development builds report an ensure about binding the same function twice',
          correct: true,
          why: 'Right. Both bindings are in the list, so the handler runs twice — double score, double sounds — and the engine\'s duplicate-binding check complains in development builds.',
        },
        {
          text: 'It does not compile: a function can only be bound once',
          why: 'Duplicate binding is a run-time situation; the compiler cannot know how many times code will run.',
        },
        {
          text: 'The constructor binding is ignored because components do not exist in constructors',
          why: 'Default subobjects created with `CreateDefaultSubobject` *do* exist in the constructor — that is why constructor binding to your own components appears to work.',
        },
      ],
      explanation:
        'Bind each event in exactly one place. If code paths might legitimately run more than once (re-initialisation, pooling), use `AddUniqueDynamic` or check `IsAlreadyBound` first, and pair every bind with a `RemoveDynamic`.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'The cost of being dynamic',
      blocks: [
        {
          type: 'p',
          text: 'Calling a native delegate is an indirect function call. Broadcasting a dynamic one does considerably more work **for every listener**:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Copy the list', text: 'The invocation list is copied so listeners can safely add or remove bindings during the broadcast.' },
            { title: 'Check the object', text: 'Each binding\'s weak object pointer is resolved; dead objects are skipped.' },
            { title: 'Find the function', text: 'The function is looked up **by name** on the object\'s class.' },
            { title: 'Pack the arguments', text: 'Arguments are copied into a parameter block laid out according to the signature function.' },
            { title: 'Call through reflection', text: '`ProcessEvent` invokes the function — a native thunk for C++ `UFUNCTION`s, or the Blueprint virtual machine for Blueprint events.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          text: 'None of this matters for events that fire a few times per second — deaths, pickups, score changes, overlaps. It can matter for something broadcast every frame to many listeners. Profile before worrying, but do not make a per-frame, C++-only event dynamic "just in case".',
        },
        {
          type: 'table',
          headers: ['Situation', 'Choose'],
          rows: [
            ['Blueprint (including UMG widgets) must react', 'Dynamic multicast + `BlueprintAssignable`'],
            ['Bindings must be saved in assets, or passed through a `UFUNCTION`', 'Dynamic'],
            ['C++-only listeners, possibly high frequency', 'Native multicast'],
            ['You want to bind a lambda', 'Native (dynamic cannot)'],
            ['Exactly one C++ callback, maybe returning a value', 'Native single-cast'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'You can offer both',
          text: 'Some components expose a native delegate for C++ systems *and* a dynamic one for Blueprint, broadcasting both from the same place. C++ listeners get the fast path, designers keep their events, and neither side pays for the other\'s features.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'An inventory component must notify a **UMG widget Blueprint** whenever an item is added, so the widget can refresh its grid. Which declaration fits best?',
      options: [
        {
          text: '`DECLARE_MULTICAST_DELEGATE_OneParam(FOnItemAdded, UItemData*);`',
          why: 'A native delegate cannot be a `UPROPERTY`, so the widget Blueprint has no way to bind to it.',
        },
        {
          text: '`DECLARE_DYNAMIC_DELEGATE_OneParam(FOnItemAdded, UItemData*, Item);`',
          why: 'Dynamic, but *single-cast*: only one listener, and it cannot be `BlueprintAssignable`. The inventory screen, a pickup notification and a quest tracker might all want this event.',
        },
        {
          text: '`DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnItemAdded, UItemData*, Item);` with a `BlueprintAssignable` member',
          correct: true,
          why: 'Yes: reflected so Blueprint can bind, multicast so any number of widgets can listen, and an item addition is infrequent enough that the dynamic call cost is irrelevant.',
        },
        {
          text: 'No delegate: let the widget check the inventory every frame in its Tick',
          why: 'Polling works but wastes time every frame and couples the widget to inventory internals. An event fires only when something changes.',
        },
      ],
      explanation:
        'Blueprint listeners require a dynamic multicast delegate exposed with `BlueprintAssignable`. Reserve native delegates for C++-only or high-frequency events, and prefer events over per-frame polling for things that change rarely.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'order',
      linesAreCode: false,
      prompt: '`OnHealthChanged.Broadcast(75.f, -25.f)` runs on a dynamic multicast delegate. For **one** bound C++ listener, put the engine\'s steps in order.',
      lines: [
        'Resolve the binding\'s weak object pointer and check the object is still alive',
        'Look up the function on the object\'s class by its stored name',
        'Copy 75 and −25 into a parameter block laid out by the signature function',
        'Call the UFUNCTION through ProcessEvent',
      ],
      distractors: ['Jump straight to the stored C++ function pointer'],
      explanation:
        'A dynamic binding is (weak object, function name), so the engine must first confirm the object exists, then find the function by name, then marshal the arguments, then make a reflected call. That chain is what buys Blueprint support and serialization — and what makes it slower than a native delegate, which really does just jump to a stored function pointer.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'The delegate is `FOnHealthChangedSignature(float NewHealth, float Delta)`. A teammate writes `UFUNCTION() void OnHealth(int32 NewHealth, float Delta);` and binds it with `AddDynamic(this, &AMyHUD::OnHealth)`. What happens?',
      options: [
        {
          text: 'It compiles, and the float is converted to `int32` when the event fires',
          why: 'No conversion happens; the binding is rejected before it can ever run.',
        },
        {
          text: 'It compiles, but an ensure fires at run time because the types differ',
          why: 'The mismatch is caught earlier than run time — at compile time.',
        },
        {
          text: 'It fails to compile, because `AddDynamic` checks the member-function pointer\'s signature',
          correct: true,
          why: 'Right. The function pointer passed to `AddDynamic` must have exactly the delegate\'s parameter types, so `void (AMyHUD::*)(int32, float)` is a type error.',
        },
        {
          text: 'It works, because the parameter names match',
          why: 'Names are irrelevant for binding — only types must match. Here the types do not.',
        },
      ],
      explanation:
        'This is the one job the function pointer in `AddDynamic` still does: compile-time type checking. Wrong parameter types fail the build, while a missing `UFUNCTION()` compiles and fails silently at run time. Knowing which mistakes the compiler catches tells you where to look first when an event "does nothing".',
    },
  ],
  takeaways: [
    'Dynamic delegates store a binding as (weak object, function name), which makes them reflected, serializable and bindable from Blueprint.',
    'Declare them with `DECLARE_DYNAMIC_[MULTICAST_]DELEGATE…` using type/name pairs; the names become Blueprint pin labels and describe the reflected signature.',
    'Expose events to Blueprint with `UPROPERTY(BlueprintAssignable)` on a dynamic multicast delegate, and `Broadcast` from C++.',
    'Bind C++ handlers with `AddDynamic` / unbind with `RemoveDynamic`; handlers must be `UFUNCTION()`s, and their parameter types (not names) must match.',
    'Bind in `BeginPlay` (or `PostInitializeComponents`) and unbind in `EndPlay`; never bind the same event in two places.',
    'Dynamic calls are slower (name lookup + reflected call) and cannot bind lambdas; use native delegates for C++-only or high-frequency events.',
  ],
  reading: [
    {
      title: 'Dynamic Delegates',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/dynamic-delegates-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s page on declaring dynamic delegates and the `BindDynamic` / `AddDynamic` / `RemoveDynamic` helper macros.',
    },
    {
      title: 'Multicast Delegates',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/multicast-delegates-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Compare the dynamic multicast declaration with the native one side by side.',
    },
    {
      title: 'Delegates (advanced)',
      url: 'https://unreal-garden.com/tutorials/delegates-advanced/',
      source: 'article',
      note: 'A community deep dive comparing single, multicast, dynamic and sparse delegates, with practical examples.',
    },
  ],
};
