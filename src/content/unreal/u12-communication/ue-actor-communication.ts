import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-actor-communication',
  title: 'Patterns for Actor Communication',
  summary:
    'Direct references, casts, interfaces, delegates, subsystem event hubs and gameplay messages — what each costs in coupling, and how to pick and refactor between them.',
  minutes: 18,
  objectives: [
    'Describe six ways actors communicate and how much each couples sender to receiver',
    'Wire placed actors together with editor-assigned `UPROPERTY` references',
    'Use delegates and a subsystem event hub so senders need not know their listeners',
    'Explain how a gameplay message router (as in Lyra) decouples systems with channels and payloads',
    'Choose a mechanism with a decision table, and refactor a cast chain into an interface',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Who needs to know whom?',
      blocks: [
        {
          type: 'p',
          text: 'Every gameplay feature involves objects talking to each other: a pressure plate opens a door, a projectile damages whatever it hits, an enemy\'s death updates the score, a quest and an achievement. There are many ways to make that call, and they differ in one crucial property: how much the **sender has to know** about the receiver — and vice versa.',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Direct reference** — the sender holds a pointer to one specific receiver.',
            '**Cast** — the sender has some actor and checks whether it is a particular class.',
            '**Interface** — the sender knows only that the receiver can respond to a message.',
            '**Delegate** — the sender announces "this happened to me"; listeners subscribe to it.',
            '**Subsystem event hub** — senders and listeners both talk to a shared hub, never to each other.',
            '**Gameplay message router** — systems exchange data on named channels; nobody references anybody.',
          ],
        },
        {
          type: 'p',
          text: 'Moving down the list, [[coupling]] decreases: code depends on fewer concrete details, so it is easier to extend and reuse. But something else increases — **indirection**. With a direct call you can click "go to definition" and see what happens; with a message router you have to search the project for listeners. Neither end is "best". The skill is choosing the least indirect mechanism that keeps dependencies pointing the right way.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why coupling matters so much in games',
          text: 'Games change constantly during development: new enemy types, new interactables, systems cut or added weeks before launch. Code that must be edited whenever a new type appears (a cast chain) or that drags in assets it does not need (a Blueprint cast) gets more expensive with every change. In Unreal, coupling also has a **memory** cost: hard references between Blueprints become load chains, as you saw with soft references and casting.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Direct references: wiring placed actors',
      blocks: [
        {
          type: 'p',
          text: 'The simplest communication is a pointer the level designer sets. A pressure plate exposes a door property; in the level editor the designer selects the plate, then picks the door in the Details panel (or with the eyedropper in the viewport).',
        },
        {
          type: 'code',
          title: 'PressurePlate.h / .cpp',
          code: `UCLASS()
class MYGAME_API APressurePlate : public AActor {
    GENERATED_BODY()

protected:
    virtual void BeginPlay() override;
    void OnPressed();

    // Picked per placed instance in the level editor
    UPROPERTY(EditInstanceOnly, Category = "Puzzle")
    TObjectPtr<ADoorBase> LinkedDoor;
};

void APressurePlate::BeginPlay() {
    Super::BeginPlay();
    if (!LinkedDoor) {
        UE_LOG(LogTemp, Warning,
            TEXT("%s has no LinkedDoor"), *GetName());
    }
}

void APressurePlate::OnPressed() {
    if (IsValid(LinkedDoor)) {
        LinkedDoor->Open();
    }
}`,
          annotations: [
            { lines: 10, text: '`EditInstanceOnly`: editable on placed actors, not in the class defaults. A Blueprint\'s defaults cannot point at an actor inside a particular level, so offering the field there would be meaningless.' },
            { lines: 11, text: 'Typed as the C++ base `ADoorBase`, not a specific door Blueprint: any door subclass can be linked, and the plate creates no asset dependency on door content.' },
            { lines: '16-19', text: 'Designers forget to fill fields. A warning at `BeginPlay` turns a silent non-working puzzle into an obvious log message.' },
            { lines: '23-25', text: 'The call itself is as direct as it gets: explicit, fast and easy to follow in a debugger.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Good for:** level-specific wiring — switches, doors, elevators, spawners, cameras.',
            '**Limits:** only works between actors that exist in the level at edit time; spawned actors need another route (a reference returned by `SpawnActor`, `GetOwner()`, `GetInstigator()`, an overlap parameter, or a getter on the GameMode or GameState).',
            '**Across streaming levels or World Partition cells**, the target may not be loaded, so use a soft reference such as `TSoftObjectPtr<ADoorBase>` and resolve it when needed.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'GetAllActorsOfClass is not a communication mechanism',
          text: 'Searching the world for the actor you want to talk to (`UGameplayStatics::GetAllActorsOfClass`) is slow, order-dependent and silently picks the wrong object when there are two. It is acceptable once at initialisation in small projects, never as the way systems find each other every time they need to talk.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'A lever should open one specific gate placed in the same level, chosen by the level designer for each lever instance. Which property declaration fits best?',
      options: [
        { text: '`UPROPERTY(EditDefaultsOnly) TObjectPtr<AGateBase> Gate;`', why: 'Class defaults are shared by every lever and stored in the class asset, which cannot reference an actor placed inside a specific level.' },
        { text: '`UPROPERTY(EditInstanceOnly) TObjectPtr<AGateBase> Gate;`', correct: true, why: 'Each placed lever gets its own field, editable in the level, typed to a native base class so any gate subclass can be linked.' },
        { text: '`UPROPERTY(VisibleAnywhere) TObjectPtr<AGateBase> Gate;`', why: '`VisibleAnywhere` makes the property read-only in the editor, so the designer could not assign the gate.' },
        { text: '`TObjectPtr<AGateBase> Gate;` assigned in `BeginPlay` with `GetAllActorsOfClass`', why: 'With several gates in the level, this picks an arbitrary one — and the missing `UPROPERTY` hides the reference from the GC and the editor.' },
      ],
      explanation:
        'Level wiring is per-instance data: lever A opens gate A, lever B opens gate B. `EditInstanceOnly` exposes the field exactly where that data lives — on placed actors — and typing it as a C++ base class keeps the lever independent of any particular gate Blueprint and its assets.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Delegates: announce, don\'t call',
      blocks: [
        {
          type: 'p',
          text: 'Direct references, casts and interfaces all have the *sender* reaching out to a receiver. [[delegate|Delegates]] flip the direction: the sender simply announces that something happened, and anyone interested subscribes. The sender does not know who — or how many — are listening.',
        },
        {
          type: 'code',
          title: 'HealthComponent.h / ScoreKeeper.cpp',
          code: `DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FOnDeathSignature, AActor*, Victim, AActor*, Killer);

UCLASS(ClassGroup = (Custom),
       meta = (BlueprintSpawnableComponent))
class MYGAME_API UHealthComponent : public UActorComponent {
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintAssignable, Category = "Health")
    FOnDeathSignature OnDeath;
    // ... ApplyDamage() calls OnDeath.Broadcast(Owner, Killer)
};

// A listener elsewhere: knows the component, not vice versa
void AScoreKeeper::Track(UHealthComponent* Health) {
    Health->OnDeath.AddDynamic(this, &AScoreKeeper::HandleDeath);
}`,
          annotations: [
            { lines: '1-2', text: 'A [[multicast-delegate]] type with two parameters. *Dynamic* means reflected, so Blueprints can bind to it too (where it appears as an event dispatcher).' },
            { lines: '10-11', text: '[[blueprint-assignable|BlueprintAssignable]] exposes the delegate to Blueprint *Bind Event* nodes.' },
            { lines: 12, text: 'The health component never mentions scores, HUDs or quests. It works unchanged in any project.' },
            { lines: 17, text: 'The listener holds the dependency. `HandleDeath` must be a `UFUNCTION()` for `AddDynamic` to bind it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why delegates are the backbone of reusable components',
          text: 'Dependencies should point from specific, changeable code (this game\'s HUD, this game\'s scoring rules) towards general, stable code (a health component). A health component that called the HUD directly would only work in projects that have that HUD. Broadcasting a delegate inverts the dependency: the component defines the event, and game-specific systems attach themselves. That is why engine classes expose so many delegates — `OnComponentBeginOverlap`, `OnDestroyed`, `OnTakeAnyDamage`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Unbind when you leave',
          text: 'Dynamic delegates hold their listeners weakly, so a destroyed listener is skipped instead of crashing the broadcast. But its binding stays in the list, and a listener that ends play without being destroyed (or should simply stop listening) keeps receiving events. Remove bindings in `EndPlay` with `RemoveDynamic` (or `RemoveAll(this)`), and use `AddUniqueDynamic` if a binding function might run twice.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'truefalse',
      prompt: 'When a health component broadcasts its `OnDeath` multicast delegate, it needs to know which actors are listening so it can call each of them.',
      answer: false,
      explanation:
        'The delegate keeps the list of bindings; the broadcaster only calls `OnDeath.Broadcast(...)`. Listeners add themselves with `AddDynamic` (or `AddUObject`/`AddLambda` for native delegates), so the dependency points from listener to broadcaster. You can add a new listener — an achievement system, a kill cam — without touching the health component at all.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Subsystems as event hubs',
      blocks: [
        {
          type: 'p',
          text: 'Delegates still require the listener to find each broadcaster. A quest system that cares about every enemy death would have to bind to every enemy\'s health component, including enemies spawned later. An [[event-hub]] removes that step: enemies broadcast on a shared object, and listeners bind once to the same object. A [[subsystem]] is the natural home — exactly one per world (or per game), created automatically, reachable from anywhere.',
        },
        {
          type: 'code',
          title: 'CombatEventsSubsystem.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "CombatEventsSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FOnEnemyKilled, AActor*, Enemy, AController*, Killer);

UCLASS()
class MYGAME_API UCombatEventsSubsystem : public UWorldSubsystem {
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintAssignable, Category = "Combat")
    FOnEnemyKilled OnEnemyKilled;
};`,
          annotations: [
            { lines: 11, text: 'A `UWorldSubsystem` lives exactly as long as its world. Use a `UGameInstanceSubsystem` instead for events that must survive level changes.' },
            { lines: '15-16', text: 'The hub is little more than a place to hang delegates. Add one per event type the game cares about.' },
          ],
        },
        {
          type: 'code',
          title: 'Enemy.cpp and QuestTrackerComponent.cpp',
          code: `// Sender: knows the hub, not the quest system
void AEnemy::Die(AController* Killer) {
    if (auto* Events =
            GetWorld()->GetSubsystem<UCombatEventsSubsystem>()) {
        Events->OnEnemyKilled.Broadcast(this, Killer);
    }
    Destroy();
}

// Listener: knows the hub, not any enemy
void UQuestTrackerComponent::BeginPlay() {
    Super::BeginPlay();
    if (auto* Events =
            GetWorld()->GetSubsystem<UCombatEventsSubsystem>()) {
        Events->OnEnemyKilled.AddDynamic(
            this, &UQuestTrackerComponent::HandleEnemyKilled);
    }
}`,
          annotations: [
            { lines: '3-4', text: '`GetSubsystem<T>()` returns the world\'s single instance. It can be null in worlds where the subsystem was not created, so check it.' },
            { lines: 5, text: 'One broadcast reaches every interested system: quests, achievements, kill feed, analytics.' },
            { lines: '15-16', text: 'Binding once covers every enemy, including those spawned later or added by a plugin the quest code has never heard of.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Native or dynamic?',
          text: 'Dynamic delegates are reflected (Blueprint-friendly) but slower to broadcast and bind by function name. If only C++ listens, a native `DECLARE_MULTICAST_DELEGATE_TwoParams` is faster and accepts lambdas (`AddWeakLambda`) and plain member functions (`AddUObject`). Many hubs expose native delegates for C++ and a few dynamic ones for Blueprint.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Don\'t build a god object',
          text: 'A hub that accumulates every event in the game becomes a dumping ground that everything depends on. Prefer a few focused hubs (combat events, objective events, UI events), and keep game logic out of them: a hub relays, it does not decide.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'bug',
      prompt: 'The quest tracker binds to `OnEnemyKilled` exactly as on the previous card, but kills are never counted and the output log reports that the delegate could not be bound. Tap the line at fault.',
      code: `UCLASS()
class MYGAME_API UQuestTrackerComponent : public UActorComponent {
    GENERATED_BODY()

protected:
    virtual void BeginPlay() override;

    void HandleEnemyKilled(AActor* Enemy, AController* Killer);

private:
    int32 Kills = 0;
};`,
      bugLines: [8],
      hint: 'What does `AddDynamic` need in order to find a function by name?',
      explanation:
        'Dynamic delegates bind through reflection: `AddDynamic` records the function\'s **name**, and the delegate later looks it up in the class\'s reflected function list. `HandleEnemyKilled` on line 8 has no `UFUNCTION()`, so reflection does not know it exists; binding fails at runtime with a log message, and nothing is ever called. Add `UFUNCTION()` on the line above. Native delegates (`AddUObject`) would not need it, but they cannot be bound from Blueprint.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Gameplay messages: channels and payloads',
      blocks: [
        {
          type: 'p',
          text: 'Even with a hub, every sender and listener must include the hub\'s header and agree on its delegate types. Epic\'s **Lyra** sample game goes one step further with the [[gameplay-message-subsystem]] (from its GameplayMessageRouter plugin). Messages are any `USTRUCT`, sent on a **channel** named by a [[gameplay-tag]] — a hierarchical name such as `Message.Elimination`, covered properly in the data-driven design unit.',
        },
        {
          type: 'code',
          title: 'Lyra-style messaging',
          code: `// The payload: any USTRUCT
USTRUCT(BlueprintType)
struct FEliminationMessage {
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Message")
    TObjectPtr<AActor> Victim = nullptr;

    UPROPERTY(BlueprintReadWrite, Category = "Message")
    TObjectPtr<AActor> Instigator = nullptr;
};

// Sender
FEliminationMessage Msg;
Msg.Victim = this;
Msg.Instigator = Killer;
UGameplayMessageSubsystem::Get(this).BroadcastMessage(
    TAG_Message_Elimination, Msg);

// Listener: keep the handle to unregister in EndPlay
ListenerHandle = UGameplayMessageSubsystem::Get(this)
    .RegisterListener<FEliminationMessage>(
        TAG_Message_Elimination, this,
        &UKillFeedWidget::OnElimination);`,
          annotations: [
            { lines: '2-11', text: 'The payload is plain data. Adding a field later does not change any function signatures.' },
            { lines: '17-18', text: 'The sender names a channel and hands over data. It does not reference the kill feed, a subsystem-specific delegate, or even know whether anyone listens.' },
            { lines: '21-24', text: 'The listener registers for the channel and payload type. The callback has the signature `void OnElimination(FGameplayTag Channel, const FEliminationMessage& Msg)`. The returned handle unregisters it later.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Strengths',
            tone: 'good',
            text: 'The loosest coupling available: plugins and game features can talk without compile-time dependencies on each other. UI can react to gameplay without gameplay knowing UI exists. New listeners require no changes anywhere else.',
          },
          right: {
            title: 'Costs',
            tone: 'bad',
            text: 'Control flow is invisible: finding who reacts to a message means searching for the tag. Payload type mismatches show up only at runtime. It is a plugin you copy from Lyra, not a core engine feature — overkill for small projects.',
          },
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Radio, not telephone',
          text: 'A direct call is a phone call to a known number. A delegate is a mailing list the sender owns. A message router is a radio broadcast on a frequency: the broadcaster does not know who is tuned in, and listeners do not know who is transmitting — they just agree on the frequency and the language.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'In the Lyra-style design above, what does `UKillFeedWidget` need to know in order to show eliminations?',
      options: [
        { text: 'The enemy class, so it can bind to each enemy\'s `OnDeath` delegate', why: 'That is the plain-delegate design. With a message router, the widget never touches enemies.' },
        { text: 'A combat-events subsystem class and its `FOnEnemyKilled` delegate type', why: 'That is the subsystem-hub design. The router replaces per-event delegate types with channels and payloads.' },
        { text: 'Only the channel tag and the `FEliminationMessage` payload struct', correct: true, why: 'The router connects senders and listeners that agree on a channel and a payload type, and nothing else.' },
        { text: 'The GameMode, which forwards every elimination to registered widgets', why: 'No central game class is involved; the router itself delivers the message to registered listeners.' },
      ],
      explanation:
        'Each step along the spectrum removes a dependency. Plain delegates: listeners know broadcasters. Hub: both know the hub and its delegate types. Message router: both know only a channel name and a data format. That is why it suits large projects with many independent features — and why it is harder to trace.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Choosing: a decision table',
      blocks: [
        {
          type: 'table',
          headers: ['Mechanism', 'Sender knows', 'Receivers', 'Coupling', 'Best for', 'Watch out for'],
          rows: [
            ['Direct reference', 'The exact target object', 'One', 'High', 'Level wiring: plate → door', 'Unset fields; placed actors only'],
            ['[[ue-cast|Cast]]', 'The concrete class', 'One', 'High', '"Is this the player?" checks; native base classes', 'Blueprint-class casts create load chains; cast ladders'],
            ['Interface', 'Only the contract', 'One at a time', 'Low', 'Acting on unknown things: interact, damage', '`Execute_` calls; no shared state'],
            ['Delegate', 'Nothing — listeners know it', 'Many', 'Low (one-way)', '"Something happened to me": death, ammo, overlap', 'Unbinding; broadcast order is unspecified'],
            ['Subsystem hub', 'The hub', 'Many', 'Very low', 'Global events: kills, objectives, score', 'Hidden flow; hubs that grow into god objects'],
            ['Gameplay message', 'A channel and a payload', 'Many', 'Lowest', 'Large projects, plugins, UI', 'Hardest to trace; runtime type mismatches'],
          ],
          caption: 'Prefer the most direct mechanism that keeps dependencies pointing from specific code to general code.',
        },
        {
          type: 'list',
          items: [
            '**One known target, set up by a designer?** Direct reference.',
            '**Need a specific type\'s API?** Cast — to a **native** class.',
            '**Talking to "whatever this is", where many unrelated types could respond?** Interface.',
            '**Reporting something that happened to you, for whoever cares?** Delegate.',
            '**Many senders, many listeners, nobody should know anybody?** Subsystem hub — or a message router if the project is large or plugin-based.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Mixing is normal',
          text: 'Real features combine mechanisms. A projectile **casts** nothing: it calls `IDamageable::Execute_ReceiveDamage` (**interface**), the implementer forwards to its health component, which **broadcasts** `OnDeath` (**delegate**), and the enemy reports the kill to the **hub** for quests and achievements. Each link uses the mechanism that fits its relationship.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Refactoring a cast chain into an interface',
      blocks: [
        {
          type: 'p',
          text: 'Here is a realistic piece of code that grew one cast at a time. Every new interactable meant editing the player, the player\'s header had to include every interactable class, and a Blueprint version of the same logic had *Cast To* nodes pulling every interactable\'s assets into memory with the player.',
        },
        {
          type: 'compare',
          left: {
            title: 'Before: the player knows everything',
            tone: 'bad',
            code: `void AMyCharacter::Use(AActor* Target) {
    if (ADoor* D = Cast<ADoor>(Target)) {
        D->ToggleOpen();
    } else if (AChest* C = Cast<AChest>(Target)) {
        C->OpenLid(this);
    } else if (ALever* L = Cast<ALever>(Target)) {
        L->Pull();
    }
    // + every future interactable...
}`,
            text: 'Three concrete dependencies today, more every sprint. Blueprint-only interactables are unreachable.',
          },
          right: {
            title: 'After: the player knows a contract',
            tone: 'good',
            code: `void AMyCharacter::Use(AActor* Target) {
    if (IsValid(Target) &&
        Target->Implements<UInteractable>()) {
        IInteractable::Execute_Interact(
            Target, this);
    }
}`,
            text: 'One dependency on a C++ interface. New interactables, C++ or Blueprint, need no change here.',
          },
        },
        {
          type: 'steps',
          items: [
            { title: 'Define the contract', text: 'Create a `Blueprintable` `UINTERFACE` with a `BlueprintNativeEvent` `Interact(AActor* Interactor)`.' },
            { title: 'Move behaviour to the receivers', text: '`ADoor`, `AChest` and `ALever` inherit `IInteractable` and override `Interact_Implementation`, calling their existing `ToggleOpen`, `OpenLid` or `Pull`.' },
            { title: 'Simplify the sender', text: 'Replace the cast ladder with `Implements<UInteractable>()` plus `Execute_Interact`.' },
            { title: 'Cut the dependencies', text: 'Remove the door, chest and lever includes from the player. In Blueprint, replace *Cast To* nodes with interface message calls; the player\'s Size Map shrinks accordingly.' },
            { title: 'Prove it', text: 'Add a new Blueprint-only interactable — a radio that plays music — without touching the player at all.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why this is the classic Unreal refactor',
          text: 'It fixes three problems at once. **Extensibility**: behaviour lives with each object, so new types plug in (the open–closed principle). **Blueprint reach**: designers can create interactables the player understands. **Memory**: the player no longer hard-references every interactable class and its assets. The cost is small — one interface header and `Execute_` calls — which is why interviewers love asking about it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'order',
      prompt: 'Put the steps of the cast-chain-to-interface refactor in a sensible order.',
      lines: [
        'Declare a Blueprintable `UInteractable` / `IInteractable` pair with a `BlueprintNativeEvent` `Interact`',
        'Make `ADoor`, `AChest` and `ALever` inherit `IInteractable` and override `Interact_Implementation`',
        'Replace the player\'s cast chain with `Implements<UInteractable>()` and `Execute_Interact`',
        'Remove the player\'s now-unused includes of the door, chest and lever headers',
      ],
      distractors: ['Wrap each `Execute_Interact` call in a `Cast<IInteractable>` check'],
      linesAreCode: false,
      explanation:
        'You need the contract before anything can implement it, the implementations before the caller can rely on them, and the new call path before the old dependencies can be deleted. The distractor would reintroduce a bug: `Cast<IInteractable>` returns `nullptr` for Blueprint implementers, so the check would wrongly skip them. `Implements<UInteractable>()` is the correct test.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'An achievement system must react whenever any enemy dies — including enemies spawned at runtime and enemies from a DLC plugin it cannot reference. Which design fits best?',
      options: [
        { text: 'At `BeginPlay`, the achievement system finds all enemies with `GetAllActorsOfClass` and binds to each one\'s `OnDeath`', why: 'It misses every enemy spawned later, and it requires the achievement system to know the enemy class.' },
        { text: 'The enemy base class calls the achievement manager directly when it dies', why: 'Now every enemy depends on achievements. Adding a kill feed or analytics means editing enemies again.' },
        { text: 'Enemies broadcast an `OnEnemyKilled` event through a world subsystem; the achievement system binds once to the subsystem', correct: true, why: 'Senders and listeners only share the hub. New enemy types and new listeners plug in without changing each other.' },
        { text: 'The achievement system ticks and checks each enemy\'s health every frame', why: 'Polling is wasteful and still requires finding and knowing every enemy.' },
      ],
      explanation:
        'Many senders, many listeners, and a requirement that neither side reference the other: that is the event-hub case. A world subsystem with a multicast delegate (or, in a large plugin-based project, a gameplay message channel) lets enemies announce deaths and lets any system — achievements, quests, a kill feed — listen without knowing where the deaths come from.',
    },
  ],
  takeaways: [
    'Communication mechanisms trade coupling for indirection: direct reference, cast, interface, delegate, subsystem hub, message router.',
    'Wire placed actors with `EditInstanceOnly` `UPROPERTY` references typed to native base classes; validate them in `BeginPlay`.',
    'Delegates let a sender announce events without knowing its listeners — the backbone of reusable components. Handlers for dynamic delegates must be `UFUNCTION`s.',
    'A subsystem event hub lets many senders and many listeners communicate through one shared object, including actors spawned later.',
    'Lyra\'s gameplay message subsystem decouples further with tag-named channels and `USTRUCT` payloads, at the cost of traceability.',
    'Pick the most direct mechanism that keeps dependencies pointing from specific code to general code; mixing mechanisms is normal.',
    'Refactoring a cast chain into an interface improves extensibility, Blueprint reach and memory use in one move.',
  ],
  reading: [
    {
      title: 'Blueprint Communication Usage',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-communication-usage-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s side-by-side guide to direct communication, casting, interfaces and event dispatchers.',
    },
    {
      title: 'Programming Subsystems',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/programming-subsystems-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Subsystem types and lifetimes — the foundation for event hubs.',
    },
    {
      title: 'Lyra Sample Game',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/lyra-sample-game-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Download Lyra and study its GameplayMessageRouter plugin and how gameplay and UI exchange messages.',
    },
    {
      title: 'Observer',
      url: 'https://gameprogrammingpatterns.com/observer.html',
      source: 'book',
      note: 'The design pattern behind delegates, with a clear discussion of its benefits and pitfalls in games.',
    },
    {
      title: 'Event Queue',
      url: 'https://gameprogrammingpatterns.com/event-queue.html',
      source: 'book',
      note: 'How central message systems decouple senders from receivers — the idea behind hubs and message routers.',
    },
  ],
};
