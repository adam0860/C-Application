import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-rpcs',
  title: 'Remote Procedure Calls',
  summary:
    'Send requests to the server and events to clients: Server, Client and NetMulticast RPCs, validation, ownership, reliability — and the canonical input-to-replication flow.',
  minutes: 20,
  objectives: [
    'Declare and implement Server, Client and NetMulticast RPCs with `_Implementation` (and `_Validate` when appropriate)',
    'Explain why a client can only call Server RPCs on actors it owns, and route requests through owned actors',
    'Choose between Reliable and Unreliable for a given event',
    'Decide when to use an RPC versus a replicated property',
    'Build the canonical flow — input → Server RPC → replicated state → RepNotify — and design RPCs with anti-cheat thinking',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Function calls that cross the network',
      blocks: [
        {
          type: 'p',
          text: 'Replicated properties carry *state* from the server to clients. But clients also need to talk to the server ("I pressed fire"), and the server sometimes needs to tell a client about a moment rather than a state ("you just landed a hit"). For that, Unreal has the [[rpc|Remote Procedure Call]]: a function you call on one machine that executes on another.',
        },
        {
          type: 'table',
          headers: ['Specifier', 'Called on', 'Runs on', 'Typical use'],
          rows: [
            ['`Server`', 'The owning client (or the server itself)', 'The server', 'Requests: fire, interact, buy, use item'],
            ['`Client`', 'The server', 'The actor\'s owning client', 'Private feedback: hit marker, "not enough gold"'],
            ['`NetMulticast`', 'The server', 'The server and every client the actor is relevant to', 'Cosmetic one-off events: explosion, impact sound'],
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Replicated property',
            tone: 'neutral',
            text: '**State.** "The door is open." Persistent, late joiners receive it, intermediate values may be skipped, server → client only.',
          },
          right: {
            title: 'RPC',
            tone: 'neutral',
            text: '**Event.** "Play the creak sound now." Happens once; clients that are not connected or not relevant at that moment never see it. Can go client → server.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why two mechanisms?',
          text: 'State and events have opposite needs. State must converge: a player who joins five minutes late must still see the door open, and only the latest value matters. Events must happen at a moment: a gunshot sound played five minutes late is a bug. Properties are built for convergence, RPCs for moments — and only RPCs can carry a request *up* to the server.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Noticeboard and phone call',
          text: 'A replicated property is a noticeboard: whoever walks by later still reads the current notice. An RPC is a phone call: whoever is not on the line when you call misses it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Server RPCs: declaring and implementing',
      blocks: [
        {
          type: 'p',
          text: 'You declare an RPC as a [[ufunction]] with a direction specifier and a reliability specifier. UHT then generates the networking code; you write only the part that runs on the receiving machine, in a function with the suffix `_Implementation`.',
        },
        {
          type: 'code',
          title: 'HeroCharacter.h (excerpt)',
          code: `protected:
    void OnInteractPressed(const FInputActionValue& Value);

    UFUNCTION(Server, Reliable)
    void ServerInteract(AActor* Target);`,
          annotations: [
            { lines: 2, text: 'An ordinary Enhanced Input callback. It runs on the owning client (or on a listen-server host for its own pawn).' },
            { lines: 4, text: '`Server` = runs on the server. `Reliable` = guaranteed delivery; an important, one-off request deserves it.' },
            { lines: 5, text: 'The `Server` prefix is a convention, not a requirement — but Epic and nearly every studio use it so call sites read honestly: this call crosses the network.' },
          ],
        },
        {
          type: 'code',
          title: 'HeroCharacter.cpp (excerpt)',
          code: `void AHeroCharacter::OnInteractPressed(
    const FInputActionValue& Value)
{
    AActor* Target = FindInteractTarget(); // local trace
    if (Target)
    {
        ServerInteract(Target);  // sends the request
    }
}

void AHeroCharacter::ServerInteract_Implementation(
    AActor* Target)
{
    // Runs on the server. Re-check everything.
    if (!IsValid(Target)) { return; }

    const double MaxDistSq = FMath::Square(250.0);
    if (FVector::DistSquared(Target->GetActorLocation(),
        GetActorLocation()) > MaxDistSq) { return; }

    if (ADoor* Door = Cast<ADoor>(Target))
    {
        Door->ToggleOpen();
    }
}`,
          annotations: [
            { lines: 7, text: 'Calling `ServerInteract` invokes the body UHT generated: it packs `Target` into a message for the server. Called on the server itself, it simply runs `_Implementation` directly — so the host\'s input path works with the same code.' },
            { lines: '11-12', text: 'You define `_Implementation`; UHT already declared it for you in the generated header. Do **not** define `ServerInteract` itself — UHT owns that function.' },
            { lines: 15, text: 'The `AActor*` arrived over the network as a reference to the server\'s copy of that actor. It can be null if the actor no longer exists, so validate it.' },
            { lines: '17-19', text: 'The client already checked distance, but the server re-checks with its own positions. A modified client could send any actor in the level.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**RPCs return `void`.** They are fire-and-forget messages; nothing can come back as a return value. Answers come back as replicated state or another RPC.',
            '**No out-parameters.** Non-const reference parameters make no sense across a network. `FString` and `TArray` parameters must be passed by `const` reference (UHT enforces it).',
            '**Only on replicated actors** (and replicated components). The actor\'s network channel is what carries the call.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'fill',
      prompt: 'Complete the declaration and definition of a request to open a chest.',
      template: `// HeroCharacter.h
UFUNCTION(___, Reliable)
void ServerOpenChest(AActor* Chest);

// HeroCharacter.cpp
void AHeroCharacter::ServerOpenChest___(AActor* Chest)
{
    if (!IsValid(Chest)) { return; }
    // ...range and state checks, then open
}`,
      blanks: [{ answers: ['Server'] }, { answers: ['_Implementation'] }],
      wordBank: ['Server', '_Implementation', 'Client', 'NetMulticast', '_Validate', 'BlueprintCallable', '_Server'],
      explanation:
        'A client-to-server request uses the `Server` specifier. The code that runs on the server goes in `ServerOpenChest_Implementation`; UHT generates `ServerOpenChest` itself (the part that sends the message). `Client` would send the call the other way, and `_Validate` is the optional cheat-detection function added by `WithValidation`.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'WithValidation: detecting impossible requests',
      blocks: [
        {
          type: 'p',
          text: 'Adding `WithValidation` makes UHT expect a second function, `_Validate`, which runs on the server **before** `_Implementation` and returns `bool`. If it returns `false`, the RPC is rejected **and the client that sent it is disconnected**.',
        },
        {
          type: 'code',
          title: 'HeroCharacter.h / HeroCharacter.cpp (excerpt)',
          code: `// .h
UFUNCTION(Server, Reliable, WithValidation)
void ServerUseItem(int32 SlotIndex);

// .cpp
bool AHeroCharacter::ServerUseItem_Validate(int32 SlotIndex)
{
    // The UI only ever offers slots 0..MaxSlots-1.
    // Anything else means a modified client.
    return SlotIndex >= 0 && SlotIndex < MaxInventorySlots;
}

void AHeroCharacter::ServerUseItem_Implementation(
    int32 SlotIndex)
{
    // Possible but not allowed right now: just refuse.
    if (IsDead() || IsSlotEmpty(SlotIndex)) { return; }
    UseItemInSlot(SlotIndex);
}`,
          annotations: [
            { lines: 2, text: '`WithValidation` is optional for Server RPCs (it used to be mandatory in early UE4).' },
            { lines: '6-11', text: 'Return `false` only for input an honest client can **never** produce. The result is a kick, so be certain.' },
            { lines: '16-17', text: 'An empty slot *can* happen honestly: the player double-clicks, and the second request arrives after the first consumed the item. That is a normal "no", handled by returning early — not a disconnect.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: '_Validate (disconnect)',
            tone: 'neutral',
            text: 'Impossible values: out-of-range indices, NaN vectors, non-normalised directions, negative quantities, an enum value outside its range.',
          },
          right: {
            title: '_Implementation (ignore)',
            tone: 'neutral',
            text: 'Valid-but-refused requests: on cooldown, out of ammo, too far away, item already used, not enough gold. Latency makes these happen to honest players.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why disconnect instead of ignoring?',
          text: 'A request that no unmodified client could send is proof of tampering or memory corruption. Continuing to serve that client risks exploits you have not imagined yet, so the engine treats a failed validation as fatal for that connection. The flip side: a false positive kicks an innocent player, which is why latency-dependent checks never belong in `_Validate`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'truefalse',
      prompt: 'If a Server RPC\'s `_Validate` function returns `false`, the server simply ignores that one call and the client keeps playing.',
      answer: false,
      explanation:
        'A failed validation rejects the call *and* disconnects the client that sent it. That is why `_Validate` is reserved for input an honest client can never produce. For requests that are merely not allowed right now (cooldown, no ammo, out of range), return early from `_Implementation` instead.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Ownership: who may call a Server RPC',
      blocks: [
        {
          type: 'p',
          text: 'A client cannot call a Server RPC on just any actor. The engine routes the call through the actor\'s [[owning-connection]]: the client connection of the PlayerController at the top of the actor\'s `Owner` chain. If the calling client does not own the actor, the call is **dropped**.',
        },
        {
          type: 'table',
          caption: 'What happens when a CLIENT calls an RPC',
          headers: ['Actor is owned by…', 'Server RPC', 'Client RPC', 'NetMulticast'],
          rows: [
            ['The calling client', 'Runs on the server', 'Runs on the calling client', 'Runs on the calling client only'],
            ['A different client', '**Dropped**', 'Runs on the calling client', 'Runs on the calling client only'],
            ['The server / no one', '**Dropped**', 'Runs on the calling client', 'Runs on the calling client only'],
          ],
        },
        {
          type: 'table',
          caption: 'What happens when the SERVER calls an RPC',
          headers: ['Actor is owned by…', 'Server RPC', 'Client RPC', 'NetMulticast'],
          rows: [
            ['A client', 'Runs on the server', 'Runs on the owning client', 'Server + all relevant clients'],
            ['The server / no one', 'Runs on the server', 'Runs on the server', 'Server + all relevant clients'],
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'RPC on an unowned actor',
            tone: 'bad',
            code: `// Client-side input handler
Door->ServerToggle();
// LogNet: Warning: No owning
// connection for actor Door_2.
// Function ServerToggle will
// not be processed.`,
            text: 'Doors placed in the level are owned by no player, so the request never leaves the client.',
          },
          right: {
            title: 'Route through what you own',
            tone: 'good',
            code: `// Client-side input handler
ServerInteract(Door);
// RPC on the player's own pawn;
// the server then calls
// Door->ToggleOpen() itself.`,
            text: 'Your pawn, your PlayerController and your PlayerState are owned by your connection — send requests through them.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does ownership matter?',
          text: 'Ownership answers "*who* is asking?". Without it the server could not tell which player is responsible for a request, and any client could invoke server functions on any actor — another player\'s character, the match timer, a vault door. The rule makes the attack surface explicit: a client can only send requests through actors that represent it. When a spawned actor such as a weapon needs its own Server RPCs, the server makes it owned with `SetOwner(OwningCharacter)`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'mcq',
      prompt: 'A client\'s input handler calls `Chest->ServerOpen()`, a Server RPC declared on `AChest`. The chest was placed in the level by a designer. What happens?',
      options: [
        { text: 'The chest opens on the server, then replicates to everyone', why: 'That would require the client to own the chest. Level-placed actors have no owning connection.' },
        { text: 'The engine temporarily makes the chest owned by the calling client', why: 'Ownership changes only when the server calls `SetOwner`. RPCs never change it implicitly.' },
        { text: 'The call is dropped, and the log warns that there is no owning connection', correct: true, why: 'A client may only call Server RPCs on actors its own connection owns; otherwise the call is not processed.' },
        { text: 'The function runs locally on the client instead', why: 'That is what happens for Client and Multicast RPCs called from a client. Server RPCs on unowned actors are dropped.' },
      ],
      explanation:
        'Server RPCs travel over the caller\'s connection, and the server only accepts them on actors owned by that connection. The standard fix is to put the request on something the player owns — usually the pawn or PlayerController — passing the chest as a parameter: `ServerInteract(Chest)`. The server then validates and opens the chest itself.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Client and NetMulticast RPCs',
      blocks: [
        {
          type: 'p',
          text: 'The other two directions start on the server. A **Client** RPC runs on the actor\'s owning client — perfect for private feedback. A **NetMulticast** RPC runs on the server and on every client the actor is currently relevant to — perfect for one-off cosmetic events.',
        },
        {
          type: 'code',
          title: 'HeroCharacter.h / HeroCharacter.cpp (excerpt)',
          code: `// .h
UFUNCTION(Client, Unreliable)
void ClientShowHitMarker(bool bKilled);

UFUNCTION(NetMulticast, Unreliable)
void MulticastPlayFireFX();

// .cpp
void AHeroCharacter::ClientShowHitMarker_Implementation(
    bool bKilled)
{
    PlayHitMarkerOnHUD(bKilled);
}

void AHeroCharacter::MulticastPlayFireFX_Implementation()
{
    // Owner already played it locally; no FX on
    // a dedicated server.
    if (IsLocallyControlled() ||
        IsNetMode(NM_DedicatedServer)) { return; }
    PlayMuzzleFlash();
}`,
          annotations: [
            { lines: '2-3', text: 'The server calls `ShooterHero->ClientShowHitMarker(bKilled)` after confirming a hit; only that shooter\'s machine runs it. Losing one hit marker is harmless, hence `Unreliable`.' },
            { lines: '5-6', text: 'Called on the server; runs on the server *and* on every client where this character is relevant.' },
            { lines: '19-20', text: 'Multicasts also run on the server. A dedicated server has nobody to show a muzzle flash to, and the shooter already played it instantly when they pressed fire.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Never use a multicast for state',
          text: 'A multicast reaches only clients that are connected **and** relevant at that moment. A player who joins later, or who was too far away, never receives it. If a multicast "opens the door", those players see it closed forever. Persistent state belongs in a replicated property with a RepNotify; multicasts are for moments that are fine to miss.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'No ordering between RPCs and properties',
          text: 'Reliable RPCs on the same actor arrive in the order they were sent, but there is no guaranteed order between an RPC and a property change made in the same frame. Do not write a Client RPC that assumes a replicated property has already arrived — pass the data it needs as parameters, or react in the RepNotify instead.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'bug',
      prompt: 'This code fails to build with linker errors. Tap the line that causes them.',
      code: `// HeroCharacter.h
UFUNCTION(Server, Reliable)
void ServerFire();

// HeroCharacter.cpp
void AHeroCharacter::ServerFire()
{
    if (Ammo <= 0) { return; }
    --Ammo;
    OnRep_Ammo();
}`,
      bugLines: [6],
      hint: 'Which function does UHT generate, and which one does it expect you to write?',
      explanation:
        'UHT generates the body of `ServerFire` in the `.gen.cpp` file — that body is what sends the RPC. Defining it again on line 6 produces a duplicate-definition linker error, and because `ServerFire_Implementation` (declared by UHT and called by the generated code) is never defined, you also get an unresolved-external error. Rename line 6 to `void AHeroCharacter::ServerFire_Implementation()`. Every RPC follows this rule: you write `_Implementation` (and `_Validate` if requested); UHT writes the rest.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Reliable or Unreliable?',
      blocks: [
        {
          type: 'p',
          text: 'Every RPC must say how hard the engine should try to deliver it — see [[reliable-rpc]].',
        },
        {
          type: 'table',
          headers: ['Aspect', 'Reliable', 'Unreliable'],
          rows: [
            ['Delivery', 'Guaranteed: resent until acknowledged', 'Best effort: may be dropped, especially under load'],
            ['Order', 'In order with other reliable RPCs on that actor', 'No ordering guarantee'],
            ['Cost', 'Tracking, resends, a limited reliable buffer', 'Cheap'],
            ['Use for', 'Important one-off events: interact, buy, activate ability, chat, match result', 'Frequent or cosmetic events: FX, footsteps, aim updates, hit markers'],
            ['Danger', 'Spamming (for example every `Tick`) overflows the buffer and disconnects the client', 'Logic that silently breaks when a call is lost'],
          ],
        },
        {
          type: 'list',
          items: [
            'Ask: **"If this call were lost, would the game be wrong, or just slightly less pretty?"** Wrong → `Reliable`. Less pretty → `Unreliable`.',
            'Ask: **"Will another call replace this one in a moment?"** Continuous data (aim direction every frame) is superseded constantly, so losing one is fine → `Unreliable`.',
            'For full-auto weapons, send `ServerStartFire` / `ServerStopFire` (reliable, rare) instead of one reliable RPC per bullet.',
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Reliable is not free',
          text: 'Each reliable RPC must be remembered until the client acknowledges it. Under packet loss they pile up, and if the queue overflows the connection is closed. A reliable RPC per frame is the classic way to make a game that works on LAN and disconnects players on bad Wi-Fi.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Select **all** RPCs that should be `Reliable`.',
      options: [
        { text: '`ServerPurchaseItem(int32 ItemId)` — the player clicks "Buy"', correct: true, why: 'A lost purchase request is a real bug: the player clicked and nothing happened. Rare, important, one-off.' },
        { text: '`MulticastPlayFootstep()` — every step of every character', why: 'Frequent and purely cosmetic. A missed footstep sound is invisible; reliable would waste bandwidth and buffer space.' },
        { text: '`ServerUpdateAim(FVector_NetQuantizeNormal Dir)` — sent every frame', why: 'Superseded by the next frame\'s update, and a reliable RPC every frame risks overflowing the reliable buffer.' },
        { text: '`ClientMatchEnded(int32 WinningTeam)` — once per match', correct: true, why: 'Losing it would leave a player stuck in a match that is over. Rare and critical.' },
        { text: '`ServerActivateShield()` — an ability with a long cooldown', correct: true, why: 'Pressing a button and having the ability silently not fire feels terrible, and it happens rarely enough that reliability costs nothing.' },
      ],
      explanation:
        'Reliability is about consequences and frequency. Rare events whose loss leaves the game wrong — purchases, ability activations, match results — are reliable. Frequent, cosmetic or self-correcting traffic — footsteps, effects, continuous aim — is unreliable. When in doubt about something sent many times per second, it should almost certainly be unreliable.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'The canonical flow: input → request → state → visuals',
      blocks: [
        {
          type: 'p',
          text: 'Almost every networked gameplay feature follows the same shape. Here it is for firing a weapon:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Owning client: input', text: 'Enhanced Input calls `OnFirePressed`. The client plays an instant muzzle flash for responsiveness (prediction) and sends `ServerFire()`.' },
            { title: 'Server: validate', text: '`ServerFire_Implementation` checks ammo and fire rate using **server** state and **server** time.' },
            { title: 'Server: change replicated state', text: 'It decrements `Ammo` (replicated, owner-only), calls `OnRep_Ammo()` for a listen-server host, traces from its own view of the character and applies damage.' },
            { title: 'Server: cosmetic event', text: 'It calls `MulticastPlayFireFX()` so other players see and hear the shot.' },
            { title: 'Clients: RepNotify', text: 'At the next net update `Ammo` replicates to the owner, and `OnRep_Ammo` updates the HUD.' },
          ],
        },
        {
          type: 'code',
          title: 'HeroCharacter.cpp',
          code: `void AHeroCharacter::OnFirePressed(
    const FInputActionValue& Value)
{
    if (Ammo <= 0) { return; } // local guess only
    PlayMuzzleFlash();          // instant feedback
    ServerFire();               // the real request
}

void AHeroCharacter::ServerFire_Implementation()
{
    const double Now = GetWorld()->GetTimeSeconds();
    if (Ammo <= 0 || Now - LastFireTime < FireInterval)
    {
        return;
    }
    LastFireTime = Now;
    --Ammo;
    OnRep_Ammo();

    FHitResult Hit;
    FCollisionQueryParams Params;
    Params.AddIgnoredActor(this);
    const FVector Start = GetPawnViewLocation();
    const FVector End =
        Start + GetBaseAimRotation().Vector() * 10000.0;
    if (GetWorld()->LineTraceSingleByChannel(
            Hit, Start, End, ECC_Visibility, Params))
    {
        UGameplayStatics::ApplyDamage(Hit.GetActor(),
            Damage, GetController(), this,
            UDamageType::StaticClass());
    }
    MulticastPlayFireFX();
}

void AHeroCharacter::OnRep_Ammo()
{
    if (IsLocallyControlled()) { UpdateAmmoHUD(Ammo); }
}`,
          annotations: [
            { lines: 4, text: 'The client\'s copy of `Ammo` is good enough to avoid pointless requests, but it is never trusted — the server checks again.' },
            { lines: 5, text: 'Client-side prediction: the shooter sees the flash *now*, not one round-trip later. The multicast skips this player to avoid a double flash.' },
            { lines: '11-16', text: 'Rate-limiting with the **server\'s** clock. A hacked client spamming `ServerFire` cannot shoot faster than `FireInterval` allows.' },
            { lines: '17-18', text: 'Authoritative state change, then the manual RepNotify call for a listen-server host (from the previous lesson).' },
            { lines: '20-27', text: 'The trace uses the server\'s idea of where the character is and aims (`GetBaseAimRotation` uses the control rotation the server receives from the client\'s movement updates), not coordinates sent in the RPC. Ignoring `this` stops the trace from hitting the shooter\'s own capsule.' },
            { lines: '29-31', text: 'Damage is applied on the server through the engine\'s damage path (`TakeDamage` on the victim), which changes the victim\'s replicated health for everyone.' },
            { lines: 33, text: 'One cosmetic event for everyone else — `Unreliable`, because a missed flash is harmless.' },
            { lines: 38, text: '`Ammo` is registered with `COND_OwnerOnly`, so this notify runs only on the owner\'s machine; the check also keeps a listen-server host from updating its HUD for someone else\'s pawn.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Prediction is presentation',
          text: 'The client predicted the muzzle flash, not the outcome. If the server rejects the shot (cooldown, no ammo), the only cost is a flash that should not have happened. Predicting *outcomes* — ammo counts, hits, movement — requires correction logic, which is why the engine does it for movement (the [[character-movement-component]]) and why systems like the [[gameplay-ability-system]] exist.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'order',
      prompt: 'Put the steps of the canonical flow in order, for a player who presses fire on a client.',
      lines: [
        'Owning client: Enhanced Input calls OnFirePressed',
        'Owning client: plays a local muzzle flash, then calls ServerFire()',
        'Server: ServerFire_Implementation checks ammo and fire rate',
        'Server: decrements the replicated Ammo and calls OnRep_Ammo for the host',
        'Server: at the next net update, sends the new Ammo to the owning client',
        'Owning client: OnRep_Ammo runs and updates the ammo HUD',
      ],
      distractors: ['Owning client: decrements Ammo and replicates it to the server'],
      linesAreCode: false,
      explanation:
        'Intent flows up as an RPC, the server validates and changes replicated state, and state flows back down where a RepNotify turns it into visuals. The distractor breaks two rules at once: clients do not own authoritative state, and property replication never flows from client to server.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Anti-cheat thinking',
      blocks: [
        {
          type: 'p',
          text: 'Treat every Server RPC as a **public API endpoint** that anyone on the internet can call with any arguments, at any rate. The client you wrote is just one possible caller.',
        },
        {
          type: 'compare',
          left: {
            title: 'Trusting results',
            tone: 'bad',
            code: `UFUNCTION(Server, Reliable)
void ServerApplyDamage(
    AActor* Victim, float Amount);`,
            text: 'The client decides who was hit and for how much. A cheat sends 9999 damage to every player on the map, every frame.',
          },
          right: {
            title: 'Sending intent',
            tone: 'good',
            code: `UFUNCTION(Server, Reliable)
void ServerFire();`,
            text: 'The client only says "I pulled the trigger". The server checks ammo and rate, traces from its own state and decides the damage.',
          },
        },
        {
          type: 'list',
          items: [
            '**Send intent, not outcomes.** "Use slot 3", "buy item 7", "interact with this" — never "set my gold to 50,000".',
            '**Validate every parameter.** Null and `IsValid` checks, ranges, normalised directions, enum bounds. Impossible values go in `_Validate`.',
            '**Check preconditions against server state.** Alive? Owns the item? Can afford it? In range (with a tolerance for latency)? Line of sight?',
            '**Rate-limit with server time.** Remember when you last accepted a request and ignore anything faster than the game allows.',
            '**Keep secrets on the server.** Use Client RPCs and owner-only properties for private data; never send other players\' hidden information.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why paranoia is the professional default',
          text: 'Once a game ships, every exploitable RPC will be found — and patching a live game is far more expensive than writing one extra check now. Server-side validation also catches honest bugs: a client UI that sends a stale slot index is a bug you want rejected, not executed.',
        },
        {
          type: 'deepdive',
          title: 'Responsiveness vs authority in shooters',
          blocks: [
            {
              type: 'p',
              text: 'Server-side traces are secure but can feel unfair at high latency: you aimed at where the enemy *was* on your screen, while the server traces against where they are *now*. Competitive shooters often let the client report a hit and have the server **verify** it — rewinding target hitboxes to the time the shot was fired (lag compensation), within strict limits on how far back and how far off it may be.',
            },
            {
              type: 'p',
              text: 'Unreal does not ship generic hitbox rewinding; studios build it on top of the primitives in this unit. The principle stays the same: the client may *suggest*, but the server checks the suggestion against its own records before anything changes.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'Which Server RPC is the hardest to abuse, assuming each is implemented exactly as its name suggests?',
      options: [
        { text: '`ServerSetGold(int32 NewGold)`', why: 'The client dictates the result. A cheat simply sends a huge number.' },
        { text: '`ServerTeleport(FVector Destination)`', why: 'The client chooses where to be. Without heavy validation, this is a free speed/teleport hack.' },
        { text: '`ServerRequestPurchase(int32 ItemId)`', correct: true, why: 'The client only names *what* it wants. The server looks up the price, checks gold and stock, and decides — the worst a cheat can do is ask for things it cannot afford.' },
        { text: '`ServerApplyDamage(AActor* Victim, float Amount)`', why: 'The client picks both the victim and the damage. Any player can be killed from anywhere.' },
      ],
      explanation:
        'Good RPCs carry *intent* with small, easily validated parameters; the server derives every outcome from its own state. Ask of each RPC: "if a hostile client sent the worst possible arguments as fast as possible, what would happen?" If the answer is anything other than "the server says no", redesign it.',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'mcq',
      prompt: 'A switch opens a gate by having the server call `MulticastOpenGate()`, which plays the animation and disables the gate\'s collision on each machine. Players who join after it was opened see a closed, solid gate. Why, and what is the fix?',
      options: [
        { text: 'The multicast should be `Reliable`', why: 'Reliable guarantees delivery to clients connected and relevant *now*. A late joiner was not there to receive it at all.' },
        { text: 'Multicasts are one-off events that late joiners and non-relevant clients never receive; store `bIsOpen` as a replicated property and apply the visuals in its RepNotify', correct: true, why: 'Replicated state reaches late joiners on their initial update, and the RepNotify rebuilds the open gate on their machine.' },
        { text: 'The gate needs `bAlwaysRelevant = true`', why: 'That helps players who were far away when the call happened, but still does nothing for players who joined later.' },
        { text: 'The client should call `MulticastOpenGate()` itself after joining', why: 'A multicast called on a client runs only on that client, and the client does not know the gate should be open anyway.' },
      ],
      explanation:
        'This is the classic state-versus-event mistake. "The gate is open" is state: it must be true for everyone, whenever they arrive. Make it `UPROPERTY(ReplicatedUsing = OnRep_IsOpen) bool bIsOpen;`, set it on the server (calling `OnRep_IsOpen()` manually for the host), and let the RepNotify play the animation and update collision. Keep multicasts for moments that are fine to miss, like the clank sound as it opens.',
    },
  ],
  takeaways: [
    'An RPC is a function called on one machine and executed on another: `Server` (client → server), `Client` (server → owning client), `NetMulticast` (server → server + all relevant clients).',
    'Declare with `UFUNCTION(Server, Reliable)` and define only `Name_Implementation`; UHT generates the sending function. RPCs return `void`.',
    '`WithValidation` adds `Name_Validate`; returning `false` disconnects the caller, so reserve it for input an honest client can never send.',
    'A client can only call Server RPCs on actors its connection owns (pawn, PlayerController, PlayerState); otherwise the call is dropped. Route requests through owned actors.',
    'Reliable for rare, important events; Unreliable for frequent or cosmetic ones. Never send reliable RPCs every frame.',
    'Use replicated properties for state and RPCs for moments — multicasts never reach late joiners.',
    'Canonical flow: input → Server RPC → validate and change replicated state → RepNotify updates visuals; predict only presentation.',
    'Treat Server RPCs as public endpoints: send intent, validate everything, rate-limit with server time.',
  ],
  reading: [
    {
      title: 'Remote Procedure Calls',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/remote-procedure-calls-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s reference for RPC specifiers, validation, reliability and the full ownership routing table.',
    },
    {
      title: 'Actor Owner and Owning Connection',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-owner-and-owning-connection-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How the engine finds an actor\'s owning connection and why it governs RPCs and owner-only replication.',
    },
    {
      title: 'Networking Overview',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-overview-for-unreal-engine',
      source: 'unreal-docs',
      note: 'Ties together the client–server model, replication and RPCs covered in this unit.',
    },
  ],
};
