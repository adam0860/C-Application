import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-network-model',
  title: 'The Client–Server Model and Authority',
  summary:
    'How Unreal keeps many machines in agreement: a server that owns the truth, clients that request and display, net roles, authority checks, and how to test it all in the editor.',
  minutes: 19,
  objectives: [
    'Explain Unreal\'s server-authoritative client–server model and why it uses one',
    'Compare listen servers and dedicated servers and identify the four net modes',
    'Describe what replicates, and which framework classes exist on the server, the owning client or everyone',
    'Read net roles (`ROLE_Authority`, `ROLE_AutonomousProxy`, `ROLE_SimulatedProxy`) and use `HasAuthority()` and `IsLocallyControlled()` correctly',
    'Test multiplayer in Play-In-Editor with several clients and simulated lag, and apply "never trust the client"',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Why multiplayer needs a referee',
      blocks: [
        {
          type: 'p',
          text: 'In a multiplayer game every player runs their own copy of the game on their own machine. Those copies must agree about what is happening — who is where, who has how much health, who picked up the rocket launcher — even though messages between machines take 30–150 ms to arrive, sometimes arrive out of order, and sometimes never arrive at all.',
        },
        {
          type: 'p',
          text: 'Unreal solves this with a **server-authoritative client–server model**. One machine, the **server**, runs the real simulation; its world is the truth. The other machines are **clients**: they send the server *requests* ("I pressed fire") and receive *state* ("the rocket launcher is gone; you have 3 rockets"). This flow of state from server to clients is called [[replication]].',
        },
        {
          type: 'steps',
          items: [
            { title: 'Client sends intent', text: 'A player presses a button. Their client sends a small request to the server.' },
            { title: 'Server decides', text: 'The server checks the request against *its* world — is the player alive, in range, carrying ammo? — and updates the authoritative state.' },
            { title: 'Server replicates', text: 'Changed state is sent to every client that needs it.' },
            { title: 'Clients display', text: 'Each client updates its copy of the world and plays the matching visuals and sounds.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a single authority?',
          text: 'Two players touch the same health pack in the same frame. On each of their screens, *they* touched it first. If both clients decided for themselves, both would heal and the game state would split into two incompatible histories. With one authority there is exactly one answer: whatever the server decided. Clients may *predict* to feel responsive, but the server\'s answer always wins. The same rule makes cheating much harder, because a modified client cannot simply declare itself the winner.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'The referee and the scoreboards',
          text: 'The server is the referee who decides every call. Clients are scoreboards around the stadium: they show what the referee decided, a moment later. Players can shout requests at the referee, but no scoreboard can award a goal.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Listen servers, dedicated servers and net modes',
      blocks: [
        {
          type: 'p',
          text: 'Someone has to run the server. Unreal supports two arrangements:',
        },
        {
          type: 'table',
          headers: ['Aspect', 'Listen server', 'Dedicated server'],
          rows: [
            ['What it is', 'A player\'s game that is *also* the server', 'A separate, headless server process with no local player'],
            ['Rendering', 'Yes — the host plays normally', 'No graphics, audio or input'],
            ['Cost', 'Free: uses the host\'s machine and upload bandwidth', 'Needs hardware or cloud hosting'],
            ['Fairness', 'Host has zero latency ("host advantage")', 'Every player has some latency; nobody is favoured'],
            ['Host leaves', 'The session usually ends (no built-in host migration)', 'Server keeps running'],
            ['Typical use', 'Co-op with friends, small sessions', 'Competitive and large-scale games'],
          ],
        },
        {
          type: 'p',
          text: 'Every running game instance has a [[net-mode]], which `GetNetMode()` returns:',
        },
        {
          type: 'table',
          headers: ['ENetMode', 'Meaning'],
          rows: [
            ['`NM_Standalone`', 'Single-player; no networking. This machine is effectively the server.'],
            ['`NM_DedicatedServer`', 'A [[dedicated-server]]: authority with no local player.'],
            ['`NM_ListenServer`', 'A [[listen-server]]: authority *and* a local player.'],
            ['`NM_Client`', 'Connected to a remote server.'],
          ],
        },
        {
          type: 'code',
          lang: 'csharp',
          title: 'MyGameServer.Target.cs',
          code: `using UnrealBuildTool;

public class MyGameServerTarget : TargetRules
{
    public MyGameServerTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Server;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("MyGame");
    }
}`,
          annotations: [
            { lines: 7, text: 'A **Server** [[target-cs|target]] builds your game without rendering, audio or UI code — the binary you deploy as a dedicated server. Building it requires an engine compiled from source; the launcher-installed engine cannot build server targets.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Write code that works in all modes',
          text: 'The same C++ runs as standalone, listen server, dedicated server and client. Good networked code rarely asks "which mode am I in?" — it asks "do I have authority?" and "is this pawn controlled here?", which work identically in every mode. Reserve `GetNetMode()` checks for things like skipping cosmetic work on a dedicated server.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'You are building a ranked 5v5 competitive shooter. Players must not be able to gain an advantage from hosting. Which setup fits?',
      options: [
        { text: 'Listen servers hosted by a random player in each match', why: 'The host would play with zero latency and could tamper with the server process running on their own machine — both unacceptable for ranked play.' },
        { text: 'Dedicated servers run by the developer', correct: true, why: 'Nobody plays on the server machine, so nobody gets host advantage or physical access to the authority.' },
        { text: 'Every client runs its own authoritative simulation and they compare results', why: 'Unreal\'s replication is client–server, not peer-to-peer consensus, and "compare results" leaves you with the split-history problem the server exists to prevent.' },
        { text: 'Standalone mode on every machine', why: 'Standalone has no networking at all; players would each be alone in their own game.' },
      ],
      explanation:
        'Listen servers are cheap and great for co-op, but the host has authority and zero latency. For competitive games that matters, so they use dedicated servers that no player controls. Both are the same client–server model; only *who runs the server* changes.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'What replicates, and what exists where',
      blocks: [
        {
          type: 'p',
          text: 'Replication is opt-in per actor. An actor whose `bReplicates` flag is `true` and that is spawned **on the server** gets a copy created on every client it is relevant to; the server then keeps those copies updated. Actors spawned on a client, or that do not replicate, exist only on the machine that created them.',
        },
        {
          type: 'code',
          title: 'Door.cpp',
          code: `ADoor::ADoor()
{
    bReplicates = true;
    // Replicate location/rotation too, if it moves
    SetReplicateMovement(true);
}`,
          annotations: [
            { lines: 3, text: 'Set it in the constructor so it applies from the moment the actor exists. `SetReplicates(true)` does the same at runtime.' },
            { lines: 5, text: 'Movement replication is a separate opt-in: a replicated actor whose position never changes does not need it.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Spawned on the server, replicated:** appears on clients (when relevant) and is destroyed on clients when the server destroys it.',
            '**Spawned on a client:** exists only on that client. The server and other players never know about it — fine for cosmetic effects, wrong for gameplay.',
            '**Placed in the level:** loaded from the map on every machine. If it replicates, the server\'s copy and each client\'s copy are linked by name and kept in sync.',
            '**Components** replicate only if their owner replicates *and* they opt in with `SetIsReplicatedByDefault(true)` (in the constructor) or `SetIsReplicated(true)`.',
          ],
        },
        {
          type: 'p',
          text: 'The gameplay framework classes you met earlier are deliberately split across machines:',
        },
        {
          type: 'table',
          headers: ['Class', 'Exists on', 'Why'],
          rows: [
            ['[[game-mode|GameMode]]', 'Server only', 'Holds the rules and decisions (spawning, scoring, match flow); clients must not see or alter them'],
            ['[[game-state|GameState]]', 'Server and all clients', 'Public match state everyone needs: score, time remaining, player list'],
            ['[[player-state|PlayerState]]', 'Server and all clients (one per player)', 'Public per-player data: name, score, team'],
            ['[[player-controller|PlayerController]]', 'Server and the **owning** client only', 'Your controller is your connection to the server; other players\' controllers are none of your business'],
            ['[[pawn|Pawn]] / Character', 'Server and every client it is relevant to', 'Everyone needs to see everyone\'s character'],
            ['[[hud|HUD]] and UMG widgets', 'Owning client only', 'Pure presentation for one local player'],
            ['[[game-instance|GameInstance]]', 'Every machine, separately', 'Not replicated: each process has its own, living across level changes'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'GetAuthGameMode() is nullptr on clients',
          text: 'Code like `GetWorld()->GetAuthGameMode<AMyGameMode>()->AddScore(...)` works in single-player and on the server, then crashes on clients because the GameMode does not exist there. If clients need the information, put it in the GameState or PlayerState, which replicate.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Three players: the host (listen server), Client 1 and Client 2. Select **all** objects that exist on **Client 2\'s** machine.',
      options: [
        { text: 'The GameState', correct: true, why: 'GameState replicates to every client so everyone can read public match state.' },
        { text: 'The host\'s and Client 1\'s PlayerStates', correct: true, why: 'Every player\'s PlayerState replicates to all clients — that is how scoreboards show everyone\'s score.' },
        { text: 'Client 1\'s PlayerController', why: 'A PlayerController replicates only to its owning client. Client 2 has just its own.' },
        { text: 'The GameMode', why: 'GameMode exists only on the server (here, the host).' },
        { text: 'Client 2\'s own HUD', correct: true, why: 'Each local player has a HUD on their own machine.' },
      ],
      explanation:
        'Public state (GameState, every PlayerState, visible pawns) goes everywhere; private connection objects (PlayerControllers) go only to their owner; rules (GameMode) stay on the server; presentation (HUD, widgets) exists only locally. Knowing this map tells you where data must live for a given machine to read it.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Net roles: who am I to this actor?',
      blocks: [
        {
          type: 'p',
          text: 'Every copy of a replicated actor knows its relationship to the network through two [[net-role|net roles]]: `GetLocalRole()` (my role for this copy) and `GetRemoteRole()` (the role of the copy on the other end of the connection).',
        },
        {
          type: 'table',
          headers: ['ENetRole', 'Meaning'],
          rows: [
            ['`ROLE_Authority`', 'This copy is the truth. On replicated actors that means the server.'],
            ['`ROLE_AutonomousProxy`', 'A client copy that the *local player controls* — typically your own possessed pawn. It may run input and predict movement locally.'],
            ['`ROLE_SimulatedProxy`', 'A client copy that only *follows* the server: other players\' pawns, doors, projectiles. It is updated, interpolated and extrapolated from what the server sends.'],
            ['`ROLE_None`', 'No role — for example, the remote role of an actor that does not replicate.'],
          ],
        },
        {
          type: 'p',
          text: 'Here is Player B\'s character on a dedicated server with two clients:',
        },
        {
          type: 'table',
          caption: 'One actor, three copies, three points of view',
          headers: ['Machine', 'GetLocalRole()', 'GetRemoteRole()'],
          rows: [
            ['Server', '`ROLE_Authority`', '`ROLE_AutonomousProxy`'],
            ['Client B (controls it)', '`ROLE_AutonomousProxy`', '`ROLE_Authority`'],
            ['Client A (watches it)', '`ROLE_SimulatedProxy`', '`ROLE_Authority`'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why distinguish autonomous from simulated?',
          text: 'Your own character must react *instantly* to your input, or the game feels like steering through syrup. So your copy (autonomous) runs movement locally and later reconciles with the server — this is what the [[character-movement-component]] does for you. Other players\' characters cannot be predicted from input you do not have, so their copies (simulated) just smoothly follow server updates. Different jobs, different roles.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Role and RemoteRole',
          text: 'Older code reads the `Role` and `RemoteRole` member variables directly. In UE5 they are private; use `GetLocalRole()` and `GetRemoteRole()` instead.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'mcq',
      prompt: 'On **Client A\'s** machine, what does `GetLocalRole()` return for the character controlled by Player B?',
      options: [
        { text: '`ROLE_Authority`', why: 'Only the server holds authority over a replicated character. Client A just has a copy.' },
        { text: '`ROLE_AutonomousProxy`', why: 'That is Client *B\'s* role for this character, because B controls it. Client A does not.' },
        { text: '`ROLE_SimulatedProxy`', correct: true, why: 'Client A neither owns the truth nor controls this pawn; its copy simply follows server updates.' },
        { text: '`ROLE_None`', why: 'The character replicates, so its client copy has a real role. `ROLE_None` is for things like the remote role of non-replicated actors.' },
      ],
      explanation:
        'Ask two questions from the machine\'s point of view. "Do I own the truth?" — only the server does, giving `ROLE_Authority`. "Does my local player control this?" — yes gives `ROLE_AutonomousProxy`, no gives `ROLE_SimulatedProxy`. For B\'s character on A\'s machine both answers are no.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'HasAuthority() and IsLocallyControlled()',
      blocks: [
        {
          type: 'p',
          text: 'In practice two questions cover almost every networking branch you write. `HasAuthority()` (on any actor) asks "is my copy the authority?" and is simply `GetLocalRole() == ROLE_Authority`. `IsLocallyControlled()` (on a pawn) asks "is this pawn controlled by a controller on *this* machine?".',
        },
        {
          type: 'code',
          title: 'Pickup.cpp — gameplay decisions need authority',
          code: `void APickup::NotifyActorBeginOverlap(AActor* OtherActor)
{
    Super::NotifyActorBeginOverlap(OtherActor);

    // Overlaps fire on every machine; only the
    // server may decide who gets the pickup.
    if (!HasAuthority()) { return; }

    AHeroCharacter* Hero = Cast<AHeroCharacter>(OtherActor);
    if (!Hero) { return; }

    Hero->AddAmmo(AmmoAmount);
    Destroy();
}`,
          annotations: [
            { lines: '5-7', text: 'Collision is simulated on clients too, so this function runs on every machine that has a copy of the pickup. The authority check turns "everyone hands out ammo" into "the server hands out ammo once".' },
            { lines: 12, text: 'Changes authoritative state. If ammo is replicated (next lesson), clients learn about it automatically.' },
            { lines: 13, text: 'Destroying a replicated actor on the server destroys its copies on all clients.' },
          ],
        },
        {
          type: 'code',
          title: 'HeroCharacter.cpp — local presentation needs local control',
          code: `void AHeroCharacter::NotifyControllerChanged()
{
    Super::NotifyControllerChanged();

    if (IsLocallyControlled())
    {
        // Only the player controlling this pawn
        // gets its HUD and first-person camera.
        CreatePlayerHUD();
    }
}`,
          annotations: [
            { lines: 1, text: 'Called when the pawn\'s controller changes: on the server at possession, and on the owning client when the `Controller` pointer replicates. UE 5.4\'s templates use it for local setup such as adding input mapping contexts.' },
            { lines: 5, text: 'True on the machine whose player controls this pawn — whether that is a client or the listen-server host.' },
          ],
        },
        {
          type: 'table',
          headers: ['Situation', 'HasAuthority()', 'IsLocallyControlled()'],
          rows: [
            ['Listen-server host\'s own pawn, on the host', 'true', 'true'],
            ['A remote player\'s pawn, on the server', 'true', 'false'],
            ['Your own pawn, on your client', 'false', 'true'],
            ['Another player\'s pawn, on your client', 'false', 'false'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Authority is not the same as "server"',
          text: 'An actor spawned locally on a client (a cosmetic shell casing, a non-replicated effect actor) has `ROLE_Authority` *on that client*, because that client created it and no one else knows it exists. `HasAuthority()` means "my copy is the authority", which is usually — not always — the server. When you truly need "am I the server?", check the net mode (`GetNetMode() < NM_Client`).',
        },
        {
          type: 'deepdive',
          title: 'Two traps with IsLocallyControlled()',
          blocks: [
            {
              type: 'list',
              items: [
                '**Too early.** A client can run a pawn\'s `BeginPlay` before the `Controller` pointer has replicated, so `IsLocallyControlled()` returns `false` there even for your own pawn. Do local setup when control is known — `NotifyControllerChanged()` or `PawnClientRestart()` — not in `BeginPlay`.',
                '**AI counts as local on the server.** `IsLocallyControlled()` checks whether the controller is local. AI controllers exist only on the server, so AI-driven pawns are "locally controlled" there. If you mean "a human on this machine", also check `IsPlayerControlled()`.',
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'fill',
      prompt: 'Fill in the checks: damage must be decided by the authority, and the screen-shake should only play for the player who controls the pawn.',
      template: `void AHeroCharacter::OnHitByExplosion(float Damage)
{
    if (___())
    {
        Health -= Damage;   // authoritative state
    }
    if (___())
    {
        PlayCameraShake();  // local presentation
    }
}`,
      blanks: [{ answers: ['HasAuthority'] }, { answers: ['IsLocallyControlled'] }],
      wordBank: ['HasAuthority', 'IsLocallyControlled', 'IsValid', 'GetNetMode', 'IsPendingKill', 'GetAuthGameMode'],
      explanation:
        '`HasAuthority()` guards changes to real game state so only one machine — the server — applies the damage; clients would otherwise subtract it locally and drift out of sync. `IsLocallyControlled()` guards presentation that belongs to one player: the camera shake is for whoever is looking through this pawn\'s eyes, whether that is a client or the listen-server host. Note the two checks are independent: on a listen-server host\'s own pawn, both are true.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'truefalse',
      prompt: 'If `HasAuthority()` returns `true`, the code is guaranteed to be running on the server.',
      answer: false,
      explanation:
        '`HasAuthority()` only means *this copy* has `ROLE_Authority`. Actors spawned locally on a client — which never replicate — are authoritative on that client. For replicated actors spawned by the server it does mean "server", which is why the shortcut usually works, but if you need to know whether this process is a server, check `GetNetMode()`.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Relevancy: not everything goes everywhere',
      blocks: [
        {
          type: 'p',
          text: 'In a 64-player map with thousands of replicated actors, sending everything to everyone would drown both bandwidth and server CPU. So for each client connection, the server only replicates actors that are **relevant** to that client — see [[net-relevancy]].',
        },
        {
          type: 'list',
          items: [
            '**Distance.** By default an actor is relevant within `NetCullDistanceSquared` of the client\'s viewpoint (the default is 15,000 units, stored squared).',
            '**Always relevant.** `bAlwaysRelevant = true` sends it to everyone regardless of distance — GameState and PlayerStates work this way.',
            '**Owner only.** `bOnlyRelevantToOwner = true` sends it only to the owning client — this is how PlayerControllers stay private.',
            '**Owner relevancy.** `bNetUseOwnerRelevancy = true` makes an actor (say, a weapon) relevant exactly when its owner is.',
          ],
        },
        {
          type: 'p',
          text: 'When an actor stops being relevant to a client, that client\'s copy is destroyed; when it becomes relevant again, a fresh copy is created with the *current* replicated state. Remember that consequence — it is why lasting state must live in replicated properties rather than one-off events, a theme of the next two lessons.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'A bonus for fairness',
          text: 'Relevancy is primarily about scale, but it also limits what a hacked client can know: an enemy behind the far side of the map is simply not on that machine, so no wallhack can draw it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Testing multiplayer in the editor',
      blocks: [
        {
          type: 'p',
          text: 'You do not need several PCs to test networking. Play-In-Editor can launch several game instances connected to each other.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Open the play options', text: 'Click the **⋮** menu next to the Play button.' },
            { title: 'Number of Players', text: 'Set it to 2 or more. Each extra player opens another window (or viewport).' },
            { title: 'Net Mode', text: '**Play As Listen Server**: the first window is the host. **Play As Client**: the editor also starts a dedicated server in the background, and every window is a client. The offline option runs standalone with no networking.' },
            { title: 'Simulate a real network', text: 'In **Editor Preferences → Level Editor → Play → Multiplayer Options**, enable **Network Emulation** and choose a profile such as *Average* or *Bad* to add latency and packet loss.' },
          ],
        },
        {
          type: 'p',
          text: 'A small logging helper makes it obvious which instance printed what:',
        },
        {
          type: 'code',
          title: 'HeroCharacter.cpp',
          code: `void AHeroCharacter::LogNetInfo() const
{
    const TCHAR* Mode = TEXT("?");
    switch (GetNetMode())
    {
        case NM_Standalone:      Mode = TEXT("Standalone"); break;
        case NM_DedicatedServer: Mode = TEXT("DedicatedServer"); break;
        case NM_ListenServer:    Mode = TEXT("ListenServer"); break;
        case NM_Client:          Mode = TEXT("Client"); break;
        default: break;
    }
    UE_LOG(LogTemp, Log, TEXT("[%s] %s role=%s auth=%s local=%s"),
        Mode, *GetName(),
        *UEnum::GetValueAsString(GetLocalRole()),
        HasAuthority() ? TEXT("yes") : TEXT("no"),
        IsLocallyControlled() ? TEXT("yes") : TEXT("no"));
}`,
          annotations: [
            { lines: '4-11', text: '`GetNetMode()` tells you what kind of process this is.' },
            { lines: 14, text: '`ENetRole` is a `UENUM`, so reflection can turn the value into readable text such as `ROLE_SimulatedProxy`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Always test as a client, with lag',
          text: 'Testing only as a listen-server host hides most bugs: the host has authority, so code that forgot an authority check or a replicated property still "works" there. Make **Play As Client** with two or more players and network emulation your default. The console command `Net PktLag=150` (in non-shipping builds) adds 150 ms of lag on the fly.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'bug',
      prompt: 'This coin works in single-player, but in a two-client test the clients also run gameplay logic they have no right to run. Tap the line that is missing a safeguard.',
      code: `void ACoin::NotifyActorBeginOverlap(AActor* OtherActor)
{
    Super::NotifyActorBeginOverlap(OtherActor);

    AHeroCharacter* Hero = Cast<AHeroCharacter>(OtherActor);
    if (Hero)
    {
        Hero->AddScore(10);
        Destroy();
    }
}`,
      bugLines: [6, 8],
      hint: 'On how many machines does this overlap event fire?',
      explanation:
        'Overlap events fire on every machine with a copy of the coin, so each client also runs line 8 and line 9. `AddScore` on a client changes only its local copy — a result the server never agreed to, so that client is now out of sync until the server overwrites the value (if it ever does). `Destroy()` on a client simply fails: the engine refuses to destroy a replicated actor from a copy that lacks authority. The condition on line 6 needs an authority check — `if (Hero && HasAuthority())`, or an early `if (!HasAuthority()) { return; }` at the top — so only the server awards the score and destroys the coin, and replication informs every client.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Never trust the client',
      blocks: [
        {
          type: 'p',
          text: 'The client runs on hardware the player controls. Memory editors, injected code, modified packets and speed hacks are all within reach of a determined cheater. So the guiding rule of networked game code is: **the client can ask; only the server decides**.',
        },
        {
          type: 'compare',
          left: {
            title: 'Trusting the client',
            tone: 'bad',
            text: 'The client tells the server "my health is now 100", "I hit Bob for 250 damage", or "I bought the sniper rifle". A hacked client can send any value, and the server obeys.',
          },
          right: {
            title: 'Server-authoritative',
            tone: 'good',
            text: 'The client sends *intent*: "I want to drink a potion", "I pressed fire while aiming here", "I want to buy item 7". The server checks potions, ammo, cooldowns, range and gold — then decides.',
          },
        },
        {
          type: 'list',
          items: [
            '**Authoritative state lives on the server:** health, ammo, inventory, score, cooldowns.',
            '**Replication flows server → clients only.** A client that edits a replicated variable changes nothing but its own local copy.',
            '**Validate every request:** is the player alive? Is the target in range? Has the cooldown elapsed? Can they afford it?',
            '**Do not send secrets:** relevancy and per-owner replication keep information a client does not need off its machine.',
            '**Prediction is cosmetic until confirmed:** play the muzzle flash instantly for feel, but the server decides whether anyone was hit.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why so strict?',
          text: 'One unvalidated request is enough to ruin every match a cheater joins, and every honest player in those matches pays for it. Designing for authority from the start is cheap; retrofitting validation into a shipped game is not. The next two lessons give you the tools: replicated properties carry server state to clients, and RPCs carry client requests to the server.',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'A player opens a chest. Which design follows the server-authoritative model?',
      options: [
        { text: 'The client rolls the loot, adds it to its own inventory and tells the server what it received', why: 'The server would be trusting a client-generated outcome; a hacked client would "roll" legendary loot every time.' },
        { text: 'The client asks to open the chest; the server checks range and whether it is already open, rolls the loot, updates the inventory and replicates the result', correct: true, why: 'Intent goes up, the server validates and decides, state comes down. Nothing important is decided on the client.' },
        { text: 'Each client rolls the loot locally with the same random seed so no network traffic is needed', why: 'Clients would still decide gameplay outcomes, and any client that tampers with its seed or code desyncs or cheats.' },
        { text: 'The GameMode on each client rolls the loot', why: 'There is no GameMode on clients — it exists only on the server.' },
      ],
      explanation:
        'The client\'s job is to express intent and display results; the server\'s job is to check, decide and replicate. In the next lessons you will implement exactly this flow: a request from the client (an RPC), validation and a state change on the server, and replication back to every client.',
    },
  ],
  takeaways: [
    'Unreal uses server-authoritative client–server networking: the server\'s world is the truth, clients send requests and display replicated state.',
    'Listen servers are a player\'s game acting as host; dedicated servers are headless processes (Server targets need a source-built engine). Net modes: Standalone, DedicatedServer, ListenServer, Client.',
    'Only actors with `bReplicates = true` spawned on the server replicate; client-spawned actors stay local.',
    'GameMode is server-only; GameState and PlayerStates go to everyone; a PlayerController goes only to its owner; HUD and widgets are local.',
    'Net roles: `ROLE_Authority` (the truth), `ROLE_AutonomousProxy` (client copy the local player controls), `ROLE_SimulatedProxy` (client copy that follows the server).',
    'Use `HasAuthority()` for gameplay decisions and `IsLocallyControlled()` for local presentation — and remember authority is not always "server".',
    'Relevancy limits which actors each client receives; irrelevant actors are destroyed on that client and recreated later.',
    'Test with Play As Client, two or more players and network emulation — and never trust the client.',
  ],
  reading: [
    {
      title: 'Networking Overview',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-overview-for-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s overview of the client–server model, net modes and which framework classes exist where.',
    },
    {
      title: 'Actor Role and RemoteRole',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-role-and-remoterole-in-unreal-engine',
      source: 'unreal-docs',
      note: 'The precise meaning of each net role and how roles change between server and clients.',
    },
    {
      title: 'Actor Relevancy',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-relevancy-in-unreal-engine',
      source: 'unreal-docs',
      note: 'The full set of rules the server uses to decide which actors each client receives.',
    },
  ],
};
