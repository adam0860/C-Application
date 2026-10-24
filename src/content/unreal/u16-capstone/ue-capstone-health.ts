import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-capstone-health',
  title: 'A Health Component from Scratch',
  summary:
    'Build a reusable, Blueprint-friendly, multiplayer-ready UHealthComponent step by step — and the reasoning behind every line.',
  minutes: 22,
  objectives: [
    'Design a reusable `UActorComponent` and explain why composition beats a shared base class here',
    'Choose `UPROPERTY` specifiers that protect invariants while staying designer- and Blueprint-friendly',
    'Declare `BlueprintAssignable` dynamic multicast delegates for health changes and death',
    'Receive damage through Unreal\'s damage pipeline by binding `OnTakeAnyDamage` in `BeginPlay`',
    'Clamp, broadcast and replicate health changes without recursion or initialization bugs',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'The brief: health for anything',
      blocks: [
        {
          type: 'p',
          text: 'Your game needs health on a player character, AI enemies, a destructible turret, explosive barrels and a breakable door. Over the next three lessons you will build the core of a small action game: this **health component**, a **pickup** that heals, and a **projectile weapon** that deals damage. Each piece uses what you learned across the whole course.',
        },
        {
          type: 'list',
          items: [
            'Designers set maximum health per Blueprint, with no code.',
            'Any damage source — projectiles, lava, explosions, fall damage — can hurt it without knowing it exists.',
            'It can be healed, but never above its maximum or below zero.',
            'UI, sound, AI and gameplay code can react to health changes and to death.',
            'It works in single player and in multiplayer.',
          ],
        },
        {
          type: 'table',
          headers: ['Actor', 'Shared base class (`AHealthActor`)', '[[actor-component|Actor Component]] (`UHealthComponent`)'],
          rows: [
            ['Player and enemies (`ACharacter`)', 'Cannot inherit from both `ACharacter` and `AHealthActor`', 'Add the component'],
            ['Turret (`APawn`), barrel and door (`AActor`)', 'Needs a separate base class per engine parent', 'Add the component'],
            ['A designer making a new destructible prop', 'Must reparent the Blueprint', 'Clicks **Add Component**'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a component?',
          text: 'Your actors already inherit from different engine classes — `ACharacter`, `APawn`, `AActor` — and C++ single inheritance from Unreal\'s hierarchy leaves no room for a common "has health" parent. A component expresses *has-a* instead of *is-a*: any actor can have health, in the same way any actor can have a mesh. This is composition over inheritance, and it is how the engine itself is built.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Step 1: the skeleton',
      blocks: [
        {
          type: 'code',
          title: 'HealthComponent.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "HealthComponent.generated.h"

UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class MYGAME_API UHealthComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UHealthComponent();

protected:
    virtual void BeginPlay() override;
};`,
          annotations: [
            { lines: 4, text: 'The base class must be complete, so its header is included here; everything else will be forward-declared.' },
            { lines: 5, text: 'Last include, always — UHT\'s generated code for this class lands here.' },
            { lines: 7, text: '`ClassGroup=(Custom)` files the component under "Custom" in the editor\'s Add Component menu. `BlueprintSpawnableComponent` is what makes it appear in that menu at all — without it, designers could not add it to a Blueprint.' },
            { lines: 8, text: '[[actor-component|UActorComponent]], not `USceneComponent`: health has no position, rotation or attachment, so it should not pay for a transform.' },
          ],
        },
        {
          type: 'code',
          title: 'HealthComponent.cpp',
          code: `#include "HealthComponent.h"

UHealthComponent::UHealthComponent()
{
    // Health is event-driven: nothing to do per frame.
    PrimaryComponentTick.bCanEverTick = false;
}

void UHealthComponent::BeginPlay()
{
    Super::BeginPlay();
}`,
          annotations: [
            { lines: 6, text: 'Components tick by default only if they ask to. Saying `false` explicitly documents the design and means no tick function is ever registered for this component.' },
            { lines: 11, text: '`Super::` first, as always. We will fill BeginPlay in shortly.' },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Why does `UHealthComponent` derive from `UActorComponent` rather than `USceneComponent`?',
      options: [
        {
          text: 'Only `UActorComponent` subclasses can replicate',
          why: 'Both kinds can replicate. Replication is not the deciding factor.',
        },
        {
          text: 'Health has no location or attachment, so a transform would be wasted memory and update work',
          correct: true,
          why: 'Scene components carry a transform and live in the attachment hierarchy. Pure logic components like health, inventory or stats should be plain actor components.',
        },
        {
          text: '`USceneComponent` subclasses cannot be added to Blueprints',
          why: 'Scene components (meshes, lights, cameras) are added to Blueprints all the time.',
        },
        {
          text: 'A `UActorComponent` does not need a `GENERATED_BODY()` macro',
          why: 'Every reflected UObject class needs `GENERATED_BODY()`, whatever its base class.',
        },
      ],
      explanation:
        'Pick the lightest base class that fits. `USceneComponent` adds a transform, attachment and the work of keeping world positions up to date — essential for a mesh or a camera, pointless for a number that goes up and down.',
    },
    {
      kind: 'concept',
      title: 'Step 2: state that protects itself',
      blocks: [
        {
          type: 'p',
          text: 'Two numbers define health. The interesting design work is in *who may change them*. Health has an [[invariant|invariant]] — `0 <= CurrentHealth <= MaxHealth` — and every change must notify listeners. If anyone could write `CurrentHealth` directly, both promises would break.',
        },
        {
          type: 'code',
          title: 'HealthComponent.h (inside the class)',
          code: `public:
    UFUNCTION(BlueprintPure, Category = "Health")
    float GetCurrentHealth() const { return CurrentHealth; }

    UFUNCTION(BlueprintPure, Category = "Health")
    float GetMaxHealth() const { return MaxHealth; }

    UFUNCTION(BlueprintPure, Category = "Health")
    float GetHealthPercent() const;

    UFUNCTION(BlueprintPure, Category = "Health")
    bool IsDead() const { return CurrentHealth <= 0.f; }

protected:
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly,
        Category = "Health", meta = (ClampMin = "1.0"))
    float MaxHealth = 100.f;

    UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly,
        Category = "Health")
    float CurrentHealth = 0.f;`,
          annotations: [
            { lines: '2-12', text: '[[blueprint-pure|BlueprintPure]] `const` getters: Blueprints and UI can *read* everything, and pure nodes need no execution pin.' },
            { lines: '15-17', text: '`EditDefaultsOnly`: designers tune max health per Blueprint class (`BP_Grunt` 100, `BP_Boss` 2000). `ClampMin` stops the editor from accepting 0 or negative values, which would make every enemy spawn dead.' },
            { lines: '19-21', text: '`VisibleInstanceOnly`: during PIE you can select an enemy and watch its health change in the Details panel, but nobody can type a value in. It is *derived* state, owned by this component.' },
            { lines: [15, 19], text: '`BlueprintReadOnly`, never `BlueprintReadWrite`: a Blueprint setting health directly would bypass clamping and events.' },
          ],
        },
        {
          type: 'code',
          title: 'HealthComponent.cpp',
          code: `float UHealthComponent::GetHealthPercent() const
{
    // Guard the division even though ClampMin forbids 0:
    // values can also be changed from code.
    return MaxHealth > 0.f ? CurrentHealth / MaxHealth : 0.f;
}`,
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Why float health?',
          text: 'Damage often arrives as fractions: damage over time multiplied by `DeltaTime`, falloff from explosions, armor multipliers. Storing health as `float` avoids rounding every hit. Display code can round for the UI.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Step 3: events for everyone who cares',
      blocks: [
        {
          type: 'p',
          text: 'When health changes, a health bar must update, a hurt sound must play, an AI might flee, and on death a ragdoll and a score update follow. The component must not know about *any* of those systems. So it **broadcasts**, and they **subscribe** — the [[multicast-delegate|multicast]] pattern from the delegates unit.',
        },
        {
          type: 'code',
          title: 'HealthComponent.h (above the class)',
          code: `class AController;
class UDamageType;
class UHealthComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_FourParams(
    FOnHealthChangedSignature,
    UHealthComponent*, HealthComponent,
    float, NewHealth,
    float, Delta,
    AController*, InstigatedBy);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FOnDeathSignature,
    UHealthComponent*, HealthComponent,
    AController*, Killer);`,
          annotations: [
            { lines: '1-3', text: 'Forward declarations. The delegate macros mention `UHealthComponent*` before the class is defined, so it must be declared first.' },
            { lines: 5, text: '[[dynamic-delegate|Dynamic]] so Blueprints can bind; multicast so any number of listeners can. The `_Signature` suffix follows the engine\'s own naming, like `FTakeAnyDamageSignature`.' },
            { lines: 7, text: 'Passing the component lets one handler serve several components and tell them apart.' },
            { lines: '8-9', text: 'A health bar wants `NewHealth`; floating damage numbers want `Delta` (negative for damage, positive for healing).' },
            { lines: 10, text: 'Who caused it — for kill credit, hit-direction indicators or AI aggro. May be `nullptr` (healing, environmental damage).' },
          ],
        },
        {
          type: 'code',
          title: 'HealthComponent.h (inside the class, public)',
          code: `    UPROPERTY(BlueprintAssignable, Category = "Health")
    FOnHealthChangedSignature OnHealthChanged;

    UPROPERTY(BlueprintAssignable, Category = "Health")
    FOnDeathSignature OnDeath;`,
          annotations: [
            { lines: [1, 4], text: '[[blueprint-assignable|BlueprintAssignable]] makes the events bindable from Blueprint — a UMG health-bar widget can bind `OnHealthChanged` without any C++.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why events instead of letting the UI poll?',
          text: 'A health bar that reads `GetCurrentHealth()` every frame does work 60 times a second to notice a change that happens a few times a minute — and it multiplies with every enemy health bar on screen. Events invert the dependency: work happens only when something actually changed, and the component never needs to know who is listening.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the death event: exposed to Blueprints, and fired when health reaches zero.',
      template: `DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FOnDeathSignature,
    UHealthComponent*, HealthComponent,
    AController*, Killer);

// Inside UHealthComponent:
UPROPERTY(___, Category = "Health")
FOnDeathSignature OnDeath;

// Later, when health drops to zero:
OnDeath.___(this, InstigatedBy);`,
      blanks: [{ answers: ['BlueprintAssignable'] }, { answers: ['Broadcast'] }],
      wordBank: ['BlueprintAssignable', 'BlueprintCallable', 'BlueprintReadWrite', 'Broadcast', 'Execute', 'ExecuteIfBound'],
      explanation:
        '`BlueprintAssignable` is the specifier for multicast delegate properties that Blueprints may bind to (`BlueprintCallable` is for functions). Multicast delegates are fired with `Broadcast`, which safely does nothing when no one is bound; `Execute` and `ExecuteIfBound` belong to single-cast delegates.',
    },
    {
      kind: 'concept',
      title: 'Step 4: plugging into Unreal\'s damage pipeline',
      blocks: [
        {
          type: 'p',
          text: 'Unreal already has a damage system built into `AActor`. Any code can call `UGameplayStatics::ApplyDamage` on any actor, and that actor broadcasts `OnTakeAnyDamage`. If the component listens to its **owner\'s** `OnTakeAnyDamage`, every damage source in the game works with it automatically.',
        },
        {
          type: 'steps',
          items: [
            { title: 'A damage source calls ApplyDamage', text: '`UGameplayStatics::ApplyDamage(Victim, 25.f, InstigatorController, DamageCauser, DamageTypeClass)` — the projectile, lava or explosion only knows the victim is an `AActor`.' },
            { title: 'The victim\'s TakeDamage runs', text: '`AActor::TakeDamage` is virtual, so classes can modify the amount (armor, difficulty), then it broadcasts the results.' },
            { title: 'OnTakeAnyDamage fires', text: 'A [[dynamic-delegate|dynamic delegate]] on the actor, carrying the damage amount, [[damage-type|damage type]], instigator controller and causer.' },
            { title: 'Our component reacts', text: 'Its bound handler subtracts health and broadcasts its own events.' },
          ],
        },
        {
          type: 'code',
          title: 'HealthComponent.h (private)',
          code: `private:
    UFUNCTION()
    void HandleTakeAnyDamage(AActor* DamagedActor,
        float Damage, const UDamageType* DamageType,
        AController* InstigatedBy, AActor* DamageCauser);`,
          annotations: [
            { lines: 2, text: '`AddDynamic` binds by *name* through reflection, so the handler must be a `UFUNCTION`. Private is fine — reflection does not care about access.' },
            { lines: '3-5', text: 'The parameter list must match `FTakeAnyDamageSignature` exactly: damaged actor, damage, damage type, instigator controller, causer.' },
          ],
        },
        {
          type: 'code',
          title: 'HealthComponent.cpp',
          code: `#include "HealthComponent.h"
#include "GameFramework/Actor.h"

void UHealthComponent::BeginPlay()
{
    Super::BeginPlay();

    CurrentHealth = MaxHealth;

    if (AActor* MyOwner = GetOwner())
    {
        MyOwner->OnTakeAnyDamage.AddDynamic(
            this, &UHealthComponent::HandleTakeAnyDamage);
    }
}`,
          annotations: [
            { lines: 2, text: 'We use `AActor`\'s members, so we include its header in the `.cpp` (include-what-you-use).' },
            { lines: 8, text: 'Start at full health — why this line lives in BeginPlay, not the constructor, gets its own step shortly.' },
            { lines: 10, text: 'Named `MyOwner` rather than `Owner`: a habit that avoids accidentally [[shadowing|shadowing]] a base-class member, which recent engine versions report as a compile error by default.' },
            { lines: '12-13', text: 'Bind in BeginPlay: the owner is a real, playing actor. In the constructor this code would also run for the CDO and for Blueprint archetypes, which are not part of any game.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Do I need to unbind?',
          text: 'Dynamic delegates hold a *weak* reference to the bound object, so a destroyed component is simply skipped when the delegate broadcasts. Here the component and its owner live and die together anyway, so no `EndPlay` cleanup is needed. Unbind explicitly (`RemoveDynamic`) when a listener can outlive the thing it listens to and should stop reacting.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This compiles, but the component never loses health, no matter how much damage is applied. Development builds report a failed ensure when BeginPlay runs. Tap the line at fault.',
      code: `UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class MYGAME_API UHealthComponent : public UActorComponent
{
    GENERATED_BODY()

protected:
    virtual void BeginPlay() override;

private:
    void HandleTakeAnyDamage(AActor* DamagedActor,
        float Damage, const UDamageType* DamageType,
        AController* InstigatedBy, AActor* DamageCauser);
};`,
      bugLines: [10],
      hint: 'How does `AddDynamic` find the function it should call?',
      explanation:
        'Dynamic delegates store an object plus a function *name* and call it through reflection, so the target must be registered with UHT. Without `UFUNCTION()` above line 10, `AddDynamic` still compiles (the macro type-checks the member function pointer and records its *name*), but looking that name up through reflection fails at run time, with an ensure saying the delegate could not be bound. Add `UFUNCTION()` on the line before the declaration.',
    },
    {
      kind: 'concept',
      title: 'Step 5: one funnel for every change',
      blocks: [
        {
          type: 'p',
          text: 'Damage subtracts, healing adds — but both must clamp, both must notify, and death must be detected exactly once. Writing that logic twice invites the two copies to drift apart. Instead, both entry points funnel into one private function.',
        },
        {
          type: 'code',
          title: 'HealthComponent.cpp',
          code: `void UHealthComponent::HandleTakeAnyDamage(
    AActor* DamagedActor, float Damage,
    const UDamageType* DamageType,
    AController* InstigatedBy, AActor* DamageCauser)
{
    if (Damage <= 0.f || IsDead())
    {
        return;
    }
    ApplyHealthChange(-Damage, InstigatedBy);
}

void UHealthComponent::Heal(float Amount)
{
    if (Amount <= 0.f || IsDead())
    {
        return;
    }
    ApplyHealthChange(Amount, nullptr);
}

void UHealthComponent::ApplyHealthChange(
    float Delta, AController* InstigatedBy)
{
    const float OldHealth = CurrentHealth;
    CurrentHealth =
        FMath::Clamp(CurrentHealth + Delta, 0.f, MaxHealth);

    if (CurrentHealth == OldHealth)
    {
        return;   // e.g. healing at full health
    }
    BroadcastHealthChange(OldHealth, InstigatedBy);
}

void UHealthComponent::BroadcastHealthChange(
    float OldHealth, AController* InstigatedBy)
{
    OnHealthChanged.Broadcast(this, CurrentHealth,
        CurrentHealth - OldHealth, InstigatedBy);

    if (OldHealth > 0.f && CurrentHealth <= 0.f)
    {
        OnDeath.Broadcast(this, InstigatedBy);
    }
}`,
          annotations: [
            { lines: '6-9', text: '`AActor::TakeDamage` broadcasts *negative* damage too. Rejecting it means healing can only happen through `Heal`, and the dead stay dead.' },
            { lines: '13-20', text: 'Declared in the header as `UFUNCTION(BlueprintCallable, Category = "Health") void Heal(float Amount);` so pickups, abilities and Blueprints can call it.' },
            { lines: '26-27', text: '[[fmath|FMath::Clamp]] enforces the invariant in exactly one place.' },
            { lines: '29-32', text: 'An exact comparison is right here: we only want to know whether the value changed at all. No change, no event — a full-health heal stays silent.' },
            { lines: '39-40', text: 'Broadcast the *actual* change. 500 damage to an enemy with 20 health reports `-20`, so damage numbers and stats stay honest.' },
            { lines: '42-45', text: '"Was alive, now is not" fires death exactly once, even if more damage arrives in the same frame.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why split ApplyHealthChange and BroadcastHealthChange?',
          text: '`ApplyHealthChange` *changes state*; `BroadcastHealthChange` only *reacts* to a change that already happened. You saw in the crashes lesson why that separation matters: a reaction that changes state can recurse. It pays off again in Step 7, where clients need the reaction without the change.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'An enemy has `MaxHealth = 100` and `CurrentHealth = 30`. It is healed for 50, then takes 200 damage. What does the component broadcast?',
      options: [
        {
          text: '`OnHealthChanged` with Delta +50, then `OnHealthChanged` with Delta −200, then `OnDeath`',
          why: 'The delta broadcast is the *actual* change after clamping. Health only had 80 to lose, so the delta is −80, not −200.',
        },
        {
          text: '`OnHealthChanged` with Delta +50, then `OnHealthChanged` with Delta −80, then `OnDeath`',
          correct: true,
          why: 'Healing 30 → 80 (+50, under the cap). Damage clamps at 0: 80 → 0 is −80. Old health was above zero and new health is zero, so `OnDeath` fires once.',
        },
        {
          text: '`OnHealthChanged` with Delta +70, then `OnHealthChanged` with Delta −100, then `OnDeath`',
          why: 'Healing is not "fill to max": 30 + 50 = 80, which is under 100, so nothing is clamped. And the damage delta is measured from 80.',
        },
        {
          text: '`OnHealthChanged` with Delta +50, then `OnHealthChanged` with Delta −80, but no `OnDeath` because health was clamped',
          why: 'Clamping only stops health going below zero; reaching zero still means death. The check is `OldHealth > 0 && CurrentHealth <= 0`.',
        },
      ],
      explanation:
        'Every change runs through the same funnel: clamp to `[0, MaxHealth]`, compute the real delta, broadcast it, and fire death only on the alive-to-dead transition. Reporting the clamped delta keeps every listener — floating numbers, stats, achievements — consistent with what actually happened.',
    },
    {
      kind: 'concept',
      title: 'Step 6: the BeginPlay initialization trap',
      blocks: [
        {
          type: 'p',
          text: 'Why does `CurrentHealth = MaxHealth;` live in `BeginPlay` rather than the constructor? Because of the order in which a UObject gets its values. The C++ constructor runs **first**. Only afterwards are property values copied in from the class default object and archetype — which is where a designer\'s `BP_Boss` setting of `MaxHealth = 2000` lives.',
        },
        {
          type: 'compare',
          left: {
            title: 'In the constructor',
            tone: 'bad',
            code: `UHealthComponent::UHealthComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
    CurrentHealth = MaxHealth;   // reads 100!
}`,
            text: 'At this moment `MaxHealth` still holds the C++ default (100). The boss\'s 2000 is applied *after* the constructor, but `CurrentHealth` has already been baked at 100 — so the boss spawns at 100 / 2000.',
          },
          right: {
            title: 'In BeginPlay',
            tone: 'good',
            code: `void UHealthComponent::BeginPlay()
{
    Super::BeginPlay();
    CurrentHealth = MaxHealth;   // reads 2000
    // ...bind damage...
}`,
            text: 'By BeginPlay every designer- and instance-level value has been applied, so derived state is computed from the real numbers.',
          },
        },
        {
          type: 'p',
          text: 'The rule generalizes: the constructor sets *defaults*; anything *computed from* editable properties belongs in BeginPlay (or `PostInitProperties`, for UObjects that never begin play). As a bonus, the owner\'s `BeginPlay` calls `Super::BeginPlay()`, which begins play on its components — so in the owner\'s BeginPlay, after `Super`, health is already initialized.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'A bug that never crashes',
          text: 'This mistake produces no error, no warning and no crash — just a boss that dies in three hits, discovered by a playtester weeks later. That is why it is worth internalizing *when* values arrive, not just what the specifiers mean.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Writing `CurrentHealth = MaxHealth;` in the component\'s constructor correctly picks up a `MaxHealth` of 2000 that a designer set on `BP_Boss`.',
      answer: false,
      explanation:
        'The constructor runs before Blueprint and instance property values are applied, so it sees the C++ default of `MaxHealth`. `CurrentHealth` gets the wrong value and nothing ever corrects it. Compute derived values in `BeginPlay`, once all editable values are in place.',
    },
    {
      kind: 'concept',
      title: 'Step 7: making it multiplayer-ready',
      blocks: [
        {
          type: 'p',
          text: 'In multiplayer the server is the [[authority|authority]] on health: damage is applied there, and clients receive the result through [[replication|replication]]. Clients must still fire `OnHealthChanged` so their health bars update — which is exactly what a [[repnotify|RepNotify]] is for.',
        },
        {
          type: 'code',
          title: 'HealthComponent.h (changes)',
          code: `public:
    virtual void GetLifetimeReplicatedProps(
        TArray<FLifetimeProperty>& OutLifetimeProps)
        const override;

protected:
    UPROPERTY(ReplicatedUsing = OnRep_CurrentHealth,
        VisibleInstanceOnly, BlueprintReadOnly,
        Category = "Health")
    float CurrentHealth = 0.f;

private:
    UFUNCTION()
    void OnRep_CurrentHealth(float OldHealth);`,
          annotations: [
            { lines: 7, text: '`ReplicatedUsing` replicates the value and calls the named function on clients when a new value arrives.' },
            { lines: '13-14', text: 'A RepNotify may take one parameter of the property\'s type: the value *before* the update. That is all we need to compute the delta on clients.' },
          ],
        },
        {
          type: 'code',
          title: 'HealthComponent.cpp (changes)',
          code: `#include "Net/UnrealNetwork.h"

UHealthComponent::UHealthComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
    SetIsReplicatedByDefault(true);
}

void UHealthComponent::BeginPlay()
{
    Super::BeginPlay();

    AActor* MyOwner = GetOwner();
    if (MyOwner && MyOwner->HasAuthority())
    {
        CurrentHealth = MaxHealth;
        MyOwner->OnTakeAnyDamage.AddDynamic(
            this, &UHealthComponent::HandleTakeAnyDamage);
    }
}

void UHealthComponent::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    DOREPLIFETIME(UHealthComponent, CurrentHealth);
}

void UHealthComponent::OnRep_CurrentHealth(float OldHealth)
{
    // Replication already changed the value: react only.
    BroadcastHealthChange(OldHealth, nullptr);
}`,
          annotations: [
            { lines: 6, text: 'The constructor-time way to mark a component as replicated. The owning actor must replicate too (`bReplicates = true`), or its components never do.' },
            { lines: '14-19', text: 'Only the server initializes health and listens for damage. Clients get the value from replication — if a client also set full health here, a late joiner could overwrite the server\'s replicated 40 with a local 100 that never gets corrected. In single player `HasAuthority()` is always true, so nothing changes there.' },
            { lines: 25, text: 'Never forget `Super::` here: the parent\'s replicated properties depend on it.' },
            { lines: '29-33', text: 'Clients run the same reaction as the server, so UI and death logic behave identically everywhere. The RepNotify never sets `CurrentHealth`, so no recursion is possible. (`InstigatedBy` is `nullptr` on clients: other players\' controllers do not exist there.)' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Guard Heal too',
          text: 'A Blueprint might call `Heal` on a client, where the change would be local and soon overwritten. Adding `if (!GetOwner()->HasAuthority()) { return; }` at the top of `ApplyHealthChange` keeps every state change on the server, in one place.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Step 8: using it from an actor',
      blocks: [
        {
          type: 'p',
          text: 'Now an enemy gets health in two lines, and reacts to death by listening — exactly like any other subscriber.',
        },
        {
          type: 'code',
          title: 'EnemyCharacter.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "EnemyCharacter.generated.h"

class UHealthComponent;

UCLASS()
class MYGAME_API AEnemyCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    AEnemyCharacter();

protected:
    virtual void BeginPlay() override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly,
        Category = "Components")
    TObjectPtr<UHealthComponent> HealthComponent;

private:
    UFUNCTION()
    void HandleDeath(UHealthComponent* DeadComponent,
        AController* Killer);
};`,
          annotations: [
            { lines: 7, text: 'Forward declaration: the header only stores a pointer.' },
            { lines: '20-22', text: '`VisibleAnywhere` shows the component (and its own editable properties, like MaxHealth) in the Details panel; `BlueprintReadOnly` lets Blueprints reach it.' },
            { lines: '25-27', text: 'Matches `FOnDeathSignature`. A `UFUNCTION`, because it will be bound with `AddDynamic`.' },
          ],
        },
        {
          type: 'code',
          title: 'EnemyCharacter.cpp',
          code: `#include "EnemyCharacter.h"
#include "HealthComponent.h"
#include "Components/CapsuleComponent.h"
#include "GameFramework/CharacterMovementComponent.h"

AEnemyCharacter::AEnemyCharacter()
{
    HealthComponent = CreateDefaultSubobject<UHealthComponent>(
        TEXT("HealthComponent"));
}

void AEnemyCharacter::BeginPlay()
{
    Super::BeginPlay();
    HealthComponent->OnDeath.AddDynamic(
        this, &AEnemyCharacter::HandleDeath);
}

void AEnemyCharacter::HandleDeath(
    UHealthComponent* DeadComponent, AController* Killer)
{
    DetachFromControllerPendingDestroy();
    GetCharacterMovement()->DisableMovement();
    GetCapsuleComponent()->SetCollisionEnabled(
        ECollisionEnabled::NoCollision);

    GetMesh()->SetCollisionProfileName(TEXT("Ragdoll"));
    GetMesh()->SetSimulatePhysics(true);

    SetLifeSpan(10.f);
}`,
          annotations: [
            { lines: '8-9', text: 'No `SetupAttachment`: an actor component has no transform, so there is nothing to attach.' },
            { lines: '15-16', text: 'Bound in BeginPlay. By the time `Super::BeginPlay()` returns, the component\'s own BeginPlay has already run.' },
            { lines: 22, text: 'Unpossesses the pawn, so the AI controller stops issuing orders to a corpse.' },
            { lines: '27-28', text: 'Switch the skeletal mesh to the ragdoll collision profile and let physics take over.' },
            { lines: 30, text: 'Clean up the body after 10 seconds — an [[actor-lifespan]].' },
          ],
        },
        {
          type: 'p',
          text: 'Designers get the same power without C++: add **Health Component** to `BP_ExplosiveBarrel`, bind **On Death** in its event graph, and spawn an explosion. A UMG health bar binds **On Health Changed** and calls `GetHealthPercent`. To test quickly, add a `DamageSelf` cheat to your CheatManager that calls `UGameplayStatics::ApplyDamage` on the player\'s pawn.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'The complete component',
      blocks: [
        {
          type: 'p',
          text: 'Here is everything assembled, including the multiplayer changes. Read it top to bottom once more; every line now has a reason.',
        },
        {
          type: 'code',
          title: 'HealthComponent.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "HealthComponent.generated.h"

class AController;
class UDamageType;
class UHealthComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_FourParams(
    FOnHealthChangedSignature,
    UHealthComponent*, HealthComponent,
    float, NewHealth,
    float, Delta,
    AController*, InstigatedBy);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FOnDeathSignature,
    UHealthComponent*, HealthComponent,
    AController*, Killer);

UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class MYGAME_API UHealthComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UHealthComponent();

    UPROPERTY(BlueprintAssignable, Category = "Health")
    FOnHealthChangedSignature OnHealthChanged;

    UPROPERTY(BlueprintAssignable, Category = "Health")
    FOnDeathSignature OnDeath;

    UFUNCTION(BlueprintCallable, Category = "Health")
    void Heal(float Amount);

    UFUNCTION(BlueprintPure, Category = "Health")
    float GetCurrentHealth() const { return CurrentHealth; }

    UFUNCTION(BlueprintPure, Category = "Health")
    float GetMaxHealth() const { return MaxHealth; }

    UFUNCTION(BlueprintPure, Category = "Health")
    float GetHealthPercent() const;

    UFUNCTION(BlueprintPure, Category = "Health")
    bool IsDead() const { return CurrentHealth <= 0.f; }

    virtual void GetLifetimeReplicatedProps(
        TArray<FLifetimeProperty>& OutLifetimeProps)
        const override;

protected:
    virtual void BeginPlay() override;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly,
        Category = "Health", meta = (ClampMin = "1.0"))
    float MaxHealth = 100.f;

    UPROPERTY(ReplicatedUsing = OnRep_CurrentHealth,
        VisibleInstanceOnly, BlueprintReadOnly,
        Category = "Health")
    float CurrentHealth = 0.f;

private:
    UFUNCTION()
    void HandleTakeAnyDamage(AActor* DamagedActor,
        float Damage, const UDamageType* DamageType,
        AController* InstigatedBy, AActor* DamageCauser);

    UFUNCTION()
    void OnRep_CurrentHealth(float OldHealth);

    void ApplyHealthChange(float Delta,
        AController* InstigatedBy);

    void BroadcastHealthChange(float OldHealth,
        AController* InstigatedBy);
};`,
          annotations: [
            { lines: '7-9', text: 'Forward declarations keep this header light: every file that includes it compiles faster.' },
            { lines: '11-21', text: 'The two events: what changed, and death.' },
            { lines: '31-35', text: 'Public events for any listener, C++ or Blueprint.' },
            { lines: '37-50', text: 'The public API: one way to heal, many ways to read. Damage arrives through the engine\'s pipeline instead of a public function.' },
            { lines: '59-66', text: 'State is protected and read-only to Blueprints; only this class can change it.' },
            { lines: '69-82', text: 'Private plumbing: the damage handler, the RepNotify, and the change/reaction pair.' },
          ],
        },
        {
          type: 'code',
          title: 'HealthComponent.cpp',
          code: `#include "HealthComponent.h"
#include "GameFramework/Actor.h"
#include "Net/UnrealNetwork.h"

UHealthComponent::UHealthComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
    SetIsReplicatedByDefault(true);
}

void UHealthComponent::BeginPlay()
{
    Super::BeginPlay();

    AActor* MyOwner = GetOwner();
    if (MyOwner && MyOwner->HasAuthority())
    {
        CurrentHealth = MaxHealth;
        MyOwner->OnTakeAnyDamage.AddDynamic(
            this, &UHealthComponent::HandleTakeAnyDamage);
    }
}

void UHealthComponent::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    DOREPLIFETIME(UHealthComponent, CurrentHealth);
}

float UHealthComponent::GetHealthPercent() const
{
    return MaxHealth > 0.f ? CurrentHealth / MaxHealth : 0.f;
}

void UHealthComponent::HandleTakeAnyDamage(
    AActor* DamagedActor, float Damage,
    const UDamageType* DamageType,
    AController* InstigatedBy, AActor* DamageCauser)
{
    if (Damage <= 0.f || IsDead())
    {
        return;
    }
    ApplyHealthChange(-Damage, InstigatedBy);
}

void UHealthComponent::Heal(float Amount)
{
    if (Amount <= 0.f || IsDead())
    {
        return;
    }
    ApplyHealthChange(Amount, nullptr);
}

void UHealthComponent::ApplyHealthChange(
    float Delta, AController* InstigatedBy)
{
    if (!GetOwner()->HasAuthority())
    {
        return;   // health only changes on the server
    }

    const float OldHealth = CurrentHealth;
    CurrentHealth =
        FMath::Clamp(CurrentHealth + Delta, 0.f, MaxHealth);

    if (CurrentHealth == OldHealth)
    {
        return;
    }
    BroadcastHealthChange(OldHealth, InstigatedBy);
}

void UHealthComponent::OnRep_CurrentHealth(float OldHealth)
{
    BroadcastHealthChange(OldHealth, nullptr);
}

void UHealthComponent::BroadcastHealthChange(
    float OldHealth, AController* InstigatedBy)
{
    OnHealthChanged.Broadcast(this, CurrentHealth,
        CurrentHealth - OldHealth, InstigatedBy);

    if (OldHealth > 0.f && CurrentHealth <= 0.f)
    {
        OnDeath.Broadcast(this, InstigatedBy);
    }
}`,
          annotations: [
            { lines: '11-22', text: 'Server-side initialization and damage binding, after all editable values have been applied.' },
            { lines: '36-55', text: 'Two entry points, both validated, both funnelled into one function.' },
            { lines: '57-74', text: 'After initialization, the only place gameplay code changes `CurrentHealth`: authority check, clamp, change detection.' },
            { lines: '76-91', text: 'The reaction, shared by the server (after a change) and clients (after replication).' },
          ],
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'A projectile hits an enemy for its last 20 health. Put the events in the order they happen on the server.',
      lines: [
        'The projectile calls `UGameplayStatics::ApplyDamage` on the enemy',
        '`AActor::TakeDamage` runs on the enemy and broadcasts `OnTakeAnyDamage`',
        '`UHealthComponent::HandleTakeAnyDamage` validates the damage',
        '`ApplyHealthChange` clamps health from 20 to 0',
        '`OnHealthChanged` is broadcast with a delta of −20',
        '`OnDeath` is broadcast and `AEnemyCharacter::HandleDeath` starts the ragdoll',
      ],
      distractors: ['The projectile calls `HealthComponent->Heal(-20)` directly'],
      explanation:
        'Damage flows through the engine: `ApplyDamage` → `TakeDamage` → `OnTakeAnyDamage` → our handler → the funnel → our events → our listeners. The projectile never touches the health component directly — that decoupling is what lets lava, explosions and fall damage all work without changes. (And `Heal` rejects negative amounts by design.)',
    },
    {
      kind: 'mcq',
      prompt: 'A designer wants a boss to be invulnerable during a cutscene. Which change fits this design best?',
      options: [
        {
          text: 'Make every damage source check whether its target is a boss in a cutscene before calling `ApplyDamage`',
          why: 'That couples every weapon, hazard and ability to bosses and cutscenes, and the next new damage source will forget the check.',
        },
        {
          text: 'Temporarily set `MaxHealth` to a huge number',
          why: 'A hack with side effects: health bars show the wrong percentage, damage events still fire, and restoring the old values afterwards is error-prone.',
        },
        {
          text: 'Add a `bInvulnerable` flag (with a `BlueprintCallable` setter) to `UHealthComponent` and return early from `HandleTakeAnyDamage` while it is set',
          correct: true,
          why: 'The rule lives with the system that owns health. Every damage source keeps working unchanged, and designers can toggle it from the cutscene\'s Blueprint.',
        },
        {
          text: 'Destroy the health component and create a new one after the cutscene',
          why: '`CreateDefaultSubobject` is constructor-only, every listener bound to the old component\'s events would be lost, and current health would reset.',
        },
      ],
      explanation:
        'A good component owns its rules. Because damage arrives through a single handler and every change goes through a single funnel, adding a rule like invulnerability (or armor, or damage-type resistances via `DamageType`) is a one-place change that every damage source automatically respects.',
    },
  ],
  takeaways: [
    'Use an `UActorComponent` for logic any actor can *have*; it avoids forcing unrelated classes into a shared base.',
    'Protect invariants: state is protected and `BlueprintReadOnly`, tuning is `EditDefaultsOnly` with `ClampMin`, and changes go through methods.',
    'Broadcast `BlueprintAssignable` dynamic multicast delegates so UI, audio, AI and Blueprints can react without coupling.',
    'Bind the owner\'s `OnTakeAnyDamage` in `BeginPlay` (with a `UFUNCTION` handler) so every `ApplyDamage` source works automatically.',
    'Funnel every change through one function that clamps, detects real changes and fires death exactly once.',
    'Compute values derived from editable properties in `BeginPlay`, and replicate with a RepNotify that only reacts, never sets.',
  ],
  reading: [
    {
      title: 'Components',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/components-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s overview of actor and scene components and how they compose actors.',
    },
    {
      title: 'Damage in UE4',
      url: 'https://www.unrealengine.com/en-US/blog/damage-in-ue4',
      source: 'article',
      note: 'Epic\'s explanation of the ApplyDamage / TakeDamage pipeline, damage events and damage types — still how UE5 works.',
    },
    {
      title: 'Unreal Engine C++ Complete Guide',
      url: 'https://www.tomlooman.com/unreal-engine-cpp-guide/',
      source: 'article',
      note: 'Tom Looman\'s widely used guide; its sections on components and delegates mirror the patterns used here.',
    },
  ],
};
