import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-property-replication',
  title: 'Replicated Properties and RepNotify',
  summary:
    'Keep every client\'s copy of the world in sync: mark properties as replicated, react to changes with RepNotify, limit who receives what, and keep bandwidth under control.',
  minutes: 19,
  objectives: [
    'Replicate a property with `UPROPERTY(Replicated)`, `GetLifetimeReplicatedProps` and `DOREPLIFETIME`',
    'Explain how the server detects and sends changes, and why intermediate values can be skipped',
    'Use `ReplicatedUsing` RepNotifies for client-side reactions, and call them manually on the server in C++ — knowing why',
    'Restrict replication with conditions such as `COND_OwnerOnly` and `COND_SkipOwner`',
    'Reason about bandwidth and CPU cost: update frequency, data size, dormancy and push-model replication',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Replicating a property: three ingredients',
      blocks: [
        {
          type: 'p',
          text: 'In the previous lesson you saw that the server owns the truth. Property [[replication]] is how that truth reaches clients: you mark a member variable as replicated, and whenever the server\'s value changes, the engine sends the new value to every client that has a copy of the actor.',
        },
        {
          type: 'p',
          text: 'It takes three ingredients: the **actor replicates** (`bReplicates = true`), the **property is marked** `Replicated`, and the property is **registered** in `GetLifetimeReplicatedProps`.',
        },
        {
          type: 'code',
          title: 'HeroCharacter.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "HeroCharacter.generated.h"

UCLASS()
class MYGAME_API AHeroCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    virtual void GetLifetimeReplicatedProps(
        TArray<FLifetimeProperty>& OutLifetimeProps)
        const override;

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Health")
    float MaxHealth = 100.f;

    UPROPERTY(Replicated, BlueprintReadOnly,
        Category = "Health")
    float Health = 100.f;
};`,
          annotations: [
            { lines: 8, text: '`ACharacter` already sets `bReplicates = true` in its constructor. For your own `AActor` subclasses, set it yourself.' },
            { lines: '13-15', text: 'The virtual function the engine calls once per class to learn which properties replicate and how. Declaring it explicitly (as Epic\'s Lyra sample does) keeps the header self-documenting.' },
            { lines: '18-19', text: 'Not replicated: max health is a tuning value every machine already has from the class defaults.' },
            { lines: '21-23', text: '`Replicated` marks the property for replication — but on its own, that is only half of the job.' },
          ],
        },
        {
          type: 'code',
          title: 'HeroCharacter.cpp',
          code: `#include "HeroCharacter.h"
#include "Net/UnrealNetwork.h"

void AHeroCharacter::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    DOREPLIFETIME(AHeroCharacter, Health);
}`,
          annotations: [
            { lines: 2, text: '`Net/UnrealNetwork.h` defines `DOREPLIFETIME` and its variants. Forgetting it gives an "identifier not found" compile error on the macro.' },
            { lines: 7, text: 'Always call `Super` first. The parent classes register *their* replicated properties here — movement, owner, `PlayerState` and more.' },
            { lines: 9, text: 'Registers `Health` for the lifetime of the actor ("rep lifetime"). One line per replicated property: `DOREPLIFETIME(ClassName, PropertyName)`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Marked but not registered',
          text: 'If a property is `Replicated` but missing from `GetLifetimeReplicatedProps`, it compiles fine and simply never replicates. The engine logs a warning that the property "was not registered in GetLifetimeReplicatedProps" — watch the Output Log when something mysteriously stays at its default on clients.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'fill',
      prompt: 'Complete the registration so `Health` replicates and the parent class keeps replicating its own properties.',
      template: `#include "Net/___.h"

void AHeroCharacter::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    ___::GetLifetimeReplicatedProps(OutLifetimeProps);

    ___(AHeroCharacter, Health);
}`,
      blanks: [{ answers: ['UnrealNetwork'] }, { answers: ['Super'] }, { answers: ['DOREPLIFETIME'] }],
      wordBank: ['UnrealNetwork', 'Super', 'DOREPLIFETIME', 'NetDriver', 'Replicated', 'UPROPERTY', 'this'],
      explanation:
        '`Net/UnrealNetwork.h` provides the macros. `Super::` calls the parent class\'s version so inherited properties stay registered; `this` is not a class name, so `this::` does not even compile. `DOREPLIFETIME(Class, Property)` registers the property; the `Replicated` specifier belongs in the `UPROPERTY` in the header, not here.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Under the hood: how changes are found and sent',
      blocks: [
        {
          type: 'p',
          text: 'Assigning `Health = 60.f;` on the server is an ordinary memory write. There is no setter and no event. The engine discovers the change later, by comparison:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Server: the value changes', text: 'Gameplay code writes the new value. Nothing is sent yet.' },
            { title: 'Server: the actor is considered', text: 'Up to [[net-update-frequency|NetUpdateFrequency]] times per second, the server considers the actor for each connection it is relevant to.' },
            { title: 'Server: compare with what was sent', text: 'For each connection the server keeps a copy of the values that client last received (often called *shadow state*). It compares every replicated property against it.' },
            { title: 'Server: send only the differences', text: 'Changed properties are serialized into a packet. Unchanged ones cost nothing on the wire.' },
            { title: 'Client: apply', text: 'The client writes the received values into its copy of the actor (and, as you will see, can run a notify function).' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why polling and deltas?',
          text: 'Comparing against a per-connection shadow means the server always knows exactly what *each* client has, so it sends each one only what it is missing — essential when clients join late, drop packets or become relevant at different times. If a packet is lost, the engine resends the property\'s **current** value, not the stale one. The price is CPU: every replicated property of every relevant actor is compared on every update, which is what push-model replication (later in this lesson) reduces.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Replication carries state, not history',
          text: 'If `Health` goes 100 → 70 → 40 between two updates, clients only ever see 100 → 40. Intermediate values are skipped. Replicated properties are perfect for "what is the current state?" and wrong for "tell me about every event" — that is a job for RPCs, next lesson.',
        },
        {
          type: 'list',
          items: [
            '**Replicable types:** numbers, `bool`, enums, `FName`/`FString`/`FText`, `FVector` and other structs (member by member), and `TArray` (element by element).',
            '**Object pointers** replicate as *references*: a `TObjectPtr<AWeapon>` arrives as a pointer to the client\'s own copy of that weapon — so the weapon itself must replicate (or be loaded on both sides, such as assets).',
            '**Not supported:** `TMap` and `TSet` cannot be replicated; UHT rejects them. Use a `TArray` of structs instead.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'bug',
      prompt: 'After adding `Health` and `Ammo` replication, other players stop seeing this character crouch, and its `PlayerState` pointer is null on clients. Tap the faulty line.',
      code: `void AHeroCharacter::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    AActor::GetLifetimeReplicatedProps(OutLifetimeProps);

    DOREPLIFETIME(AHeroCharacter, Health);
    DOREPLIFETIME(AHeroCharacter, Ammo);
}`,
      bugLines: [4],
      hint: '`AHeroCharacter` derives from `ACharacter`, which derives from `APawn`, which derives from `AActor`.',
      explanation:
        'Line 4 skips two levels of the hierarchy. `ACharacter` and `APawn` register their own replicated properties in their overrides — `APawn`\'s `PlayerState` and `Controller` pointers, `ACharacter`\'s crouch state and movement-base data, among others. Calling `AActor::` directly bypasses them, so those properties never replicate (and the engine logs "not registered" warnings for each). Always write `Super::GetLifetimeReplicatedProps(OutLifetimeProps);` — `Super` is the immediate parent, and each parent calls its own `Super` in turn.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Replication is one-way',
      blocks: [
        {
          type: 'p',
          text: 'Property replication flows **only from server to clients**. A client can assign to a replicated variable — the compiler will not stop it — but the value never travels to the server. It only changes that client\'s local copy.',
        },
        {
          type: 'memory',
          caption: 'Client B edits its copy of Health locally',
          regions: [
            {
              label: 'Server (authority)',
              kind: 'other',
              cells: [
                { name: 'Health', type: 'float', value: '40', highlight: true },
                { name: 'last sent to A', type: 'shadow', value: '40' },
                { name: 'last sent to B', type: 'shadow', value: '40' },
              ],
            },
            {
              label: 'Client A',
              kind: 'other',
              cells: [{ name: 'Health', type: 'float', value: '40' }],
            },
            {
              label: 'Client B (edited locally)',
              kind: 'other',
              cells: [{ name: 'Health', type: 'float', value: '100  ← local only', highlight: true }],
            },
          ],
        },
        {
          type: 'p',
          text: 'Notice the trap: the server compares its value (40) with what it *last sent* B (also 40). They match, so it sends B nothing. Client B keeps showing 100 until the server\'s value changes again — a silent desync, not a quick correction.',
        },
        {
          type: 'compare',
          left: {
            title: 'Client writes the variable',
            tone: 'bad',
            code: `// Input handler on the client
void AHeroCharacter::OnDrinkPotion()
{
    Health += 50.f;  // local copy only
}`,
            text: 'Looks right on that screen; the server and everyone else never hear about it.',
          },
          right: {
            title: 'Client asks, server writes',
            tone: 'good',
            code: `// Input handler on the client
void AHeroCharacter::OnDrinkPotion()
{
    ServerDrinkPotion();  // a request
}
// Server checks potions, changes
// Health, and replication does
// the rest.`,
            text: 'The request travels as a Server RPC, covered in the next lesson.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not let clients replicate upward?',
          text: 'If clients could push property values to the server, a cheater could set their own health, ammo or position directly — and two clients changing the same value would need conflict resolution. One-way replication keeps a single authority. Clients influence the world only by *asking*, and the server can always say no.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'If a client sets a `Replicated` property, the new value is sent to the server at the next network update.',
      answer: false,
      explanation:
        'Property replication is strictly server → client. The client\'s assignment changes only its local copy. Worse, because the server compares against what it last *sent*, it will not even correct the client until the server\'s own value changes. To change authoritative state, a client must send a request (a Server RPC) and let the server modify the property.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'RepNotify: reacting when a value arrives',
      blocks: [
        {
          type: 'p',
          text: 'Clients usually need to *do* something when a value changes: update the health bar, play a hit flinch, start the death ragdoll. Polling every frame would be wasteful. Instead, use `ReplicatedUsing` to name a [[repnotify]] function that the engine calls on the client right after it applies a new value.',
        },
        {
          type: 'code',
          title: 'HeroCharacter.h (excerpt)',
          code: `UPROPERTY(ReplicatedUsing = OnRep_Health,
    BlueprintReadOnly, Category = "Health")
float Health = 100.f;

UFUNCTION()
void OnRep_Health(float OldHealth);`,
          annotations: [
            { lines: 1, text: '`ReplicatedUsing` implies `Replicated` and names the notify function. You still register the property with `DOREPLIFETIME` exactly as before.' },
            { lines: 5, text: 'The notify **must** be a `UFUNCTION()`: the engine finds and calls it through reflection. Without it, UHT reports an error.' },
            { lines: 6, text: 'The parameter is optional. If present, it must be the property\'s type and receives the value *before* the update — perfect for computing a delta.' },
          ],
        },
        {
          type: 'code',
          title: 'HeroCharacter.cpp (excerpt)',
          code: `void AHeroCharacter::OnRep_Health(float OldHealth)
{
    UpdateHealthBar(Health / MaxHealth);

    if (Health < OldHealth)
    {
        PlayHitReaction(OldHealth - Health);
    }
    if (Health <= 0.f && OldHealth > 0.f)
    {
        StartDeathRagdoll();
    }
}`,
          annotations: [
            { lines: 3, text: 'Presentation driven by state. `Health` already holds the new value when the notify runs.' },
            { lines: '5-8', text: 'The old value turns a state change into an event-like reaction: how much damage did I just take?' },
            { lines: '9-12', text: 'Edge-triggered: only react to the transition into death, not to every update while dead.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**When it fires:** on a client, when a received value *differs* from the client\'s current value. To fire even when it is equal (useful if the client predicted the change), register with `DOREPLIFETIME_CONDITION_NOTIFY(AHeroCharacter, Health, COND_None, REPNOTIFY_Always)`.',
            '**Late joiners get it too:** when an actor is first created on a client — on join, or when it becomes relevant again — the notify fires for replicated values that differ from the defaults. That makes RepNotify the right place to rebuild visual state from scratch.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'The server does not get RepNotifies (in C++)',
      blocks: [
        {
          type: 'p',
          text: 'Here is the most famous gotcha in Unreal networking: in C++, **RepNotify functions never run automatically on the server.** On a dedicated server that rarely matters. On a [[listen-server]], the host is also a player — and their health bar would never update.',
        },
        {
          type: 'code',
          title: 'HeroCharacter.cpp',
          code: `void AHeroCharacter::ChangeHealth(float Delta)
{
    if (!HasAuthority()) { return; }

    const float OldHealth = Health;
    Health = FMath::Clamp(Health + Delta, 0.f, MaxHealth);
    if (Health == OldHealth) { return; }

    // Clients get OnRep_Health automatically.
    // The server does not, so call it here.
    OnRep_Health(OldHealth);
}`,
          annotations: [
            { lines: 3, text: 'State changes happen only on the authority.' },
            { lines: 7, text: 'Skip work if clamping meant nothing changed — clients would not get a notify either.' },
            { lines: '9-11', text: 'Calling the notify by hand gives the host (and any server-side logic in it) exactly the same reaction clients get. One function, identical behaviour everywhere.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why doesn\'t the engine call it on the server?',
          text: 'A RepNotify means "a new value just *arrived from the network*". The server never receives its own values — it sends them. And because a C++ assignment is a plain memory write with no setter, the engine has no moment at which it could intercept the change on the server; it only notices differences later, while preparing packets for clients. Blueprints are different: setting a RepNotify variable there goes through a node that calls the notify function on the machine that set it, server included.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Dedicated servers',
          text: 'On a dedicated server the manual call is harmless, but its cosmetic work (health bars, particles) is wasted. Some projects split the notify into gameplay and cosmetic parts and skip the cosmetic part when `IsNetMode(NM_DedicatedServer)` is true.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'In a listen-server game, damage to the host\'s character updates the health bars that *clients* see over the host\'s head, but the host\'s *own* HUD health bar never changes. `Health` is `ReplicatedUsing = OnRep_Health`, and `OnRep_Health` updates the bar. What is the most likely cause?',
      options: [
        { text: '`Health` is missing from `GetLifetimeReplicatedProps`', why: 'Then clients would not see the change either. They do, so it is registered and replicating.' },
        { text: 'The server code changes `Health` but never calls `OnRep_Health` itself', correct: true, why: 'C++ RepNotifies run automatically only on clients. The listen-server host must have the notify called manually.' },
        { text: 'The host\'s character is a simulated proxy on the host', why: 'On the server every replicated actor has `ROLE_Authority`. Roles are not the issue here.' },
        { text: '`NetUpdateFrequency` is too low for the host to receive updates', why: 'The host does not receive replication at all — it is the server. Update frequency affects only what clients receive.' },
      ],
      explanation:
        'This exact symptom — clients fine, host broken — is the signature of a missing manual RepNotify call. The fix is the pattern from the previous card: change the value through one server-side function that also calls `OnRep_Health(OldHealth)`. Testing only as a client would hide this bug; testing only as the host would hide others. Test both.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'order',
      prompt: 'A listen server applies 40 damage to a character with 100 health. Put the events in order, from the server\'s write to the client\'s health bar updating.',
      lines: [
        'Server: ChangeHealth sets Health from 100 to 60',
        'Server: calls OnRep_Health(100) manually, updating the host\'s view',
        'Server: at the actor\'s next net update, compares Health with what each client last received',
        'Server: sends the changed Health value to each relevant client',
        'Client: writes 60 into its copy of Health',
        'Client: the engine calls OnRep_Health(100), updating that client\'s health bar',
      ],
      distractors: ['Client: sends its updated Health back to the server to confirm'],
      linesAreCode: false,
      explanation:
        'The server writes and immediately runs the notify itself (the manual call). Replication happens later, at the actor\'s next update, by comparing against per-client shadow state. On the client, the value is applied *before* the notify runs — so inside `OnRep_Health`, `Health` is already 60 and the parameter holds the old 100. Nothing flows back up: replication is one-way.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Replication conditions: who receives what',
      blocks: [
        {
          type: 'p',
          text: 'By default a replicated property goes to every client the actor is relevant to. Often that is wasteful, or reveals information a player should not have. A [[replication-condition]] narrows the audience per property:',
        },
        {
          type: 'code',
          title: 'HeroCharacter.cpp',
          code: `void AHeroCharacter::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    DOREPLIFETIME(AHeroCharacter, Health);
    DOREPLIFETIME_CONDITION(AHeroCharacter, Ammo,
        COND_OwnerOnly);
    DOREPLIFETIME_CONDITION(AHeroCharacter, AimPitch,
        COND_SkipOwner);
}`,
          annotations: [
            { lines: 6, text: 'Everyone sees everyone\'s health bar, so no condition.' },
            { lines: '7-8', text: 'Only the owning player\'s HUD shows ammo. Others never receive it: less bandwidth, and no way for a hacked client to read enemy ammo.' },
            { lines: '9-10', text: 'Other clients need the aim angle to animate this character\'s aim pose. The owner already has its own aim locally — sending it back would be wasted bandwidth and could fight the local value.' },
          ],
        },
        {
          type: 'table',
          headers: ['Condition', 'Sent to', 'Typical use'],
          rows: [
            ['`COND_None`', 'Every client the actor is relevant to (default)', 'Public state: health, team, equipped weapon'],
            ['`COND_OwnerOnly`', 'Only the owning client', 'Private state: ammo, cooldowns, inventory details'],
            ['`COND_SkipOwner`', 'Everyone except the owner', 'State the owner simulates or already knows locally'],
            ['`COND_InitialOnly`', 'Only in the first update when the actor appears', 'Values that never change after spawn, such as a cosmetic seed'],
            ['`COND_SimulatedOnly` / `COND_AutonomousOnly`', 'Only simulated / only autonomous proxies', 'Data needed by only one kind of copy'],
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Who is the owner?',
          text: 'The owning client is the one whose PlayerController sits at the top of the actor\'s owner chain — see [[owning-connection]]. A possessed pawn is owned by its controller, so `COND_OwnerOnly` on a character means "only the player controlling it". An actor with no owning connection, like a level-placed door, has no owner to send to.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'Each player\'s remaining grenade count is shown only in their own HUD. Opponents should not be able to learn it. Which registration fits?',
      options: [
        { text: '`DOREPLIFETIME(AHeroCharacter, Grenades);`', why: 'This sends the count to every relevant client, wasting bandwidth and leaking information to opponents.' },
        { text: '`DOREPLIFETIME_CONDITION(AHeroCharacter, Grenades, COND_SkipOwner);`', why: 'Exactly backwards: everyone *except* the player who needs it would receive it.' },
        { text: '`DOREPLIFETIME_CONDITION(AHeroCharacter, Grenades, COND_InitialOnly);`', why: 'The count changes during play; initial-only would freeze it at the spawn value on clients.' },
        { text: '`DOREPLIFETIME_CONDITION(AHeroCharacter, Grenades, COND_OwnerOnly);`', correct: true, why: 'Only the owning client receives the value — the one HUD that displays it.' },
      ],
      explanation:
        'Conditions serve two goals at once: bandwidth (do not send data nobody uses) and information hiding (a value never sent cannot be read by a modified client). `COND_OwnerOnly` is the standard choice for private per-player state on a pawn or PlayerState.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Bandwidth, update frequency and push model',
      blocks: [
        {
          type: 'p',
          text: 'Replication has two costs: **bandwidth** (bytes sent) and **server CPU** (comparing properties). Both grow with players × relevant actors × replicated properties × update rate, so a few habits pay off quickly.',
        },
        {
          type: 'list',
          items: [
            '**Update frequency.** [[net-update-frequency|NetUpdateFrequency]] caps how often an actor is considered (the `AActor` default is 100 per second). A door or scoreboard can use a handful; set it in the constructor. Recent engine versions deprecate writing the member directly in favour of `SetNetUpdateFrequency()` — use whichever your engine version provides. `MinNetUpdateFrequency` lets the engine back off when nothing changes.',
            '**Dormancy.** An actor that rarely changes can go dormant with `SetNetDormancy(DORM_DormantAll)`; the server then skips it entirely until you call `FlushNetDormancy()` before changing it.',
            '**Send less data.** Replicate the minimal state and derive the rest on clients: replicate `Health`, not `Health` *and* `HealthPercent`. Use compact types such as `FVector_NetQuantize` (whole-unit precision) instead of a full-precision `FVector` where precision does not matter.',
            '**Priority.** When bandwidth is short, `NetPriority` decides which actors get updated first; player characters typically rank above props.',
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Where the CPU goes',
          text: 'Unchanged properties cost no bandwidth, but they still cost comparisons. A server with 100 players and thousands of relevant actors may compare hundreds of thousands of properties per second just to discover that nothing changed. That is the problem push-model replication solves.',
        },
        {
          type: 'deepdive',
          title: 'Push-model replication in brief',
          blocks: [
            {
              type: 'p',
              text: 'With [[push-model-replication]], you promise to tell the engine when a property changes, so it can skip comparing it the rest of the time:',
            },
            {
              type: 'code',
              title: 'HeroCharacter.cpp',
              code: `#include "Net/UnrealNetwork.h"
#include "Net/Core/PushModel/PushModel.h"

void AHeroCharacter::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    FDoRepLifetimeParams Params;
    Params.bIsPushBased = true;
    DOREPLIFETIME_WITH_PARAMS_FAST(AHeroCharacter, Health,
        Params);
}

void AHeroCharacter::SetHealthValue(float NewHealth)
{
    Health = NewHealth;
    MARK_PROPERTY_DIRTY_FROM_NAME(AHeroCharacter, Health,
        this);
}`,
              annotations: [
                { lines: 2, text: 'Push model lives in the `NetCore` module — add `"NetCore"` to your `Build.cs` dependencies.' },
                { lines: '9-12', text: 'Register the property as push-based. `FDoRepLifetimeParams` can also carry a condition and a RepNotify policy.' },
                { lines: '18-19', text: 'Every write must mark the property dirty. Forget it, and the change will not replicate while push model is active — so funnel all writes through one setter like this.' },
              ],
            },
            {
              type: 'p',
              text: 'Push model is controlled by the `net.IsPushModelEnabled` console variable; Epic\'s Lyra sample uses it for many properties. UE5 also ships **Iris**, a newer opt-in replication system that builds on the same property declarations and benefits from push-model style dirty marking.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      multi: true,
      prompt: 'The actor has `bReplicates = true` and calls `Super::GetLifetimeReplicatedProps`. Select **all** properties that will **not** replicate.',
      code: `UPROPERTY(Replicated) TArray<int32> Scores;
UPROPERTY(Replicated) TMap<FName, int32> Stats;
UPROPERTY(Replicated) float Stamina;
UPROPERTY(Replicated) TObjectPtr<AWeapon> Weapon;

// in GetLifetimeReplicatedProps:
DOREPLIFETIME(AHeroCharacter, Scores);
DOREPLIFETIME(AHeroCharacter, Weapon);`,
      options: [
        { text: '`Scores`', why: 'Arrays are supported and replicate element by element, and it is registered.' },
        { text: '`Stats`', correct: true, why: '`TMap` cannot be replicated at all; UHT rejects a replicated map. Use a `TArray` of key/value structs instead.' },
        { text: '`Stamina`', correct: true, why: 'Marked `Replicated` but never registered with `DOREPLIFETIME`, so it never replicates (and the engine warns about it).' },
        { text: '`Weapon`', why: 'Registered, and object pointers replicate as references — provided the weapon actor itself replicates, clients receive a pointer to their own copy.' },
      ],
      explanation:
        'A property replicates only when all the ingredients are present: a replicating actor, the `Replicated`/`ReplicatedUsing` specifier, registration in `GetLifetimeReplicatedProps`, and a type the replication system supports. `TMap` and `TSet` are the notable unsupported types; arrays and structs are fine.',
    },
  ],
  takeaways: [
    'A property replicates when the actor replicates, the `UPROPERTY` is `Replicated` (or `ReplicatedUsing`), and it is registered with `DOREPLIFETIME` in `GetLifetimeReplicatedProps` — include `Net/UnrealNetwork.h` and always call `Super`.',
    'The server finds changes by comparing against per-client shadow state and sends only differences; intermediate values can be skipped, so replicate state, not event streams.',
    'Replication is server → client only. A client writing a replicated variable changes only its local copy and silently desyncs.',
    '`ReplicatedUsing = OnRep_X` calls a `UFUNCTION` on clients after a new value arrives, optionally receiving the old value; it also fires for late joiners.',
    'In C++, RepNotifies do not run on the server: call them manually after server-side changes so listen-server hosts react too.',
    'Conditions like `COND_OwnerOnly` and `COND_SkipOwner` cut bandwidth and hide private information.',
    'Control cost with update frequency, dormancy, compact types and minimal state; push model removes per-update comparisons for properties you mark dirty.',
  ],
  reading: [
    {
      title: 'Replicate Actor Properties',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/replicate-actor-properties-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s reference for replicated properties, RepNotify, conditions and push-model setup.',
    },
    {
      title: 'Networking Overview',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-overview-for-unreal-engine',
      source: 'unreal-docs',
      note: 'Revisit the section on replication to see how properties fit alongside RPCs and relevancy.',
    },
    {
      title: 'Lyra Sample Game',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/lyra-sample-game-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Search Lyra\'s source for `DOREPLIFETIME_WITH_PARAMS_FAST` to see push-model replication in a shipping-quality project.',
    },
  ],
};
