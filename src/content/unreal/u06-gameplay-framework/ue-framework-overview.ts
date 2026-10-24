import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-framework-overview',
  title: 'GameMode, GameState and PlayerState',
  summary: 'The rules, the scoreboard and the player cards: how Unreal splits match logic across classes, and why networking shaped that split.',
  minutes: 18,
  objectives: [
    'Describe the roles of the GameMode, GameState and PlayerState and what belongs in each',
    'Explain which framework objects exist on the server, the owning client and other clients',
    'Trace how the GameMode logs a player in and spawns their pawn',
    'Set the GameMode for a level or project through World Settings, Project Settings or config',
    'Access each framework object from C++ safely, with the right getters and null checks',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The cast of characters',
      blocks: [
        {
          type: 'p',
          text: 'Unreal\'s **Gameplay Framework** is a set of base classes the engine creates and wires together for every game: who makes the rules, where the score is kept, what the player controls, and how input reaches it. You subclass them in C++ (and usually again in Blueprint) instead of inventing your own structure.',
        },
        {
          type: 'table',
          headers: ['Class', 'Role', 'Football analogy'],
          rows: [
            ['[[game-mode|AGameModeBase]]', 'Defines the rules: who may join, where players spawn, when the match ends', 'The referee and the rulebook'],
            ['[[game-state|AGameStateBase]]', 'Match-wide state everyone can see: scores, time left, list of players', 'The stadium scoreboard'],
            ['[[player-state|APlayerState]]', 'One player\'s public info: name, score, team', 'Each player\'s stat card'],
            ['[[player-controller|APlayerController]]', 'The player\'s will: turns input into commands, owns camera and HUD', 'The player\'s mind'],
            ['[[pawn|APawn]] / [[character|ACharacter]]', 'The thing in the world being controlled', 'The player\'s body on the pitch'],
            ['[[game-instance|UGameInstance]]', 'Lives for the whole session, across level loads', 'The season, not one match'],
          ],
          caption: 'This lesson covers the first three; the rest of the unit covers the others.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Why so many pieces?',
          text: 'In a real football match the referee keeps private notes, the scoreboard shows what the whole stadium needs to know, each player has a public stat card, and each player\'s thoughts stay in their own head. Unreal splits game logic along exactly these lines, for the same reason: different people are allowed to see and change different things.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'You get them even if you write none',
          text: 'Start an empty level and the engine still creates a GameMode, a GameState, a PlayerController with a PlayerState, and a default pawn you can fly around with. Your job is to replace those defaults with your own subclasses.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'In a team deathmatch, every player\'s screen must show both teams\' scores. Where should those scores live?',
      options: [
        {
          text: 'In the GameMode',
          why: 'The GameMode exists only on the server, so clients cannot read it. It should *decide* when scores change, not store what clients display.',
        },
        {
          text: 'In each player\'s PlayerController',
          why: 'A client only has its own PlayerController, and team scores are not per-player data anyway.',
        },
        {
          text: 'In the GameState',
          correct: true,
          why: 'Match-wide information that every client needs belongs in the GameState, which is replicated to everyone.',
        },
        {
          text: 'In a static variable in the character class',
          why: 'Static variables are per-process: each client would have its own unsynchronised copy, and the value would also survive between play sessions in the editor.',
        },
      ],
      explanation:
        'Ask two questions: is it about the whole match or one player, and who needs to see it? Whole-match information seen by everyone goes in the GameState. The GameMode changes it on the server, and replication delivers the new value to every client.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'AGameModeBase: the rules, on the server only',
      blocks: [
        {
          type: 'p',
          text: 'The GameMode decides how the game is played: which classes to use for players, where they spawn, whether a joining player is accepted, and when someone has won. It exists **only on the server**. In a single-player game your own machine *is* the server (Unreal calls this standalone mode), so the GameMode is right there; in multiplayer, clients never have one.',
        },
        {
          type: 'code',
          title: 'ArenaGameMode.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "ArenaGameMode.generated.h"

UCLASS()
class MYGAME_API AArenaGameMode : public AGameModeBase {
    GENERATED_BODY()

public:
    AArenaGameMode();

    void OnPlayerKilled(AController* Killer,
        AController* Victim);

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Rules",
        meta = (ClampMin = "1"))
    int32 ScoreToWin = 20;
};`,
          annotations: [
            { lines: '14-15', text: 'Rules are server-side functions. Gameplay code on the server reports events here; the GameMode decides the consequences.' },
            { lines: '18-20', text: 'Rule tuning is ordinary designer data, edited in the Blueprint child `BP_ArenaGameMode`.' },
          ],
        },
        {
          type: 'code',
          title: 'ArenaGameMode.cpp',
          code: `#include "ArenaGameMode.h"
#include "ArenaCharacter.h"
#include "ArenaGameState.h"
#include "ArenaPlayerController.h"
#include "ArenaPlayerState.h"

AArenaGameMode::AArenaGameMode() {
    DefaultPawnClass = AArenaCharacter::StaticClass();
    PlayerControllerClass =
        AArenaPlayerController::StaticClass();
    PlayerStateClass = AArenaPlayerState::StaticClass();
    GameStateClass = AArenaGameState::StaticClass();
}`,
          annotations: [
            { lines: '8-12', text: 'The GameMode is a **factory**: these `TSubclassOf` properties tell it which classes to spawn for each player and for the match. Setting C++ classes here gives sensible defaults.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Pick Blueprint classes in a Blueprint child',
          text: 'Your real pawn is probably `BP_ArenaCharacter`, a Blueprint child with meshes and animations. As the workflow lesson showed, C++ cannot name it. Create `BP_ArenaGameMode` from `AArenaGameMode` and pick the Blueprint classes in its class defaults, under *Classes*. Those properties are `EditAnywhere` with `NoClear`, so they can be changed but never left empty.',
        },
        {
          type: 'table',
          headers: ['Aspect', 'AGameModeBase', 'AGameMode'],
          rows: [
            ['What it adds', 'The essentials: default classes, login, spawning', 'Everything in `AGameModeBase`, plus a match state machine (waiting to start, in progress, post-match) and related hooks'],
            ['Pairs with', '`AGameStateBase`', '`AGameState`'],
            ['Use when', 'Most games, especially single-player', 'Round-based multiplayer that benefits from built-in match states'],
          ],
          caption: 'Pick one family and keep the pair consistent; mixing them logs an error and breaks match-state handling.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'A single-player game has no GameMode, because there is no server.',
      answer: false,
      explanation:
        'A single-player game runs in standalone mode, where the local machine acts as the server and has authority over everything. The GameMode exists and runs exactly as it would on a multiplayer server. That is also why code that respects the server/client split in single-player keeps working when you add multiplayer later.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'How a player joins: the login flow',
      blocks: [
        {
          type: 'p',
          text: 'When a player connects (or a single-player game starts), the GameMode runs a fixed sequence of functions. Knowing the order tells you where to put your own code, because each step can be overridden.',
        },
        {
          type: 'steps',
          items: [
            { title: '`PreLogin`', text: 'Runs before anything is created for the player. Set the error message to reject them (server full, banned, wrong version).' },
            { title: '`Login`', text: 'Spawns the player\'s PlayerController (using `PlayerControllerClass`), which in turn creates their PlayerState.' },
            { title: '`PostLogin`', text: 'The player is fully connected. Epic documents this as the first place it is safe to call replicated functions on the new controller.' },
            { title: '`HandleStartingNewPlayer`', text: 'Decides how the new player starts. The default implementation restarts them, which spawns a pawn.' },
            { title: '`RestartPlayer`', text: 'Chooses a [[player-start]] (`ChoosePlayerStart`), spawns `DefaultPawnClass` there (`SpawnDefaultPawnFor`) and has the controller possess it.' },
          ],
        },
        {
          type: 'code',
          title: 'ArenaGameMode.cpp',
          code: `void AArenaGameMode::PostLogin(APlayerController* NewPlayer) {
    AArenaPlayerState* PS =
        NewPlayer->GetPlayerState<AArenaPlayerState>();
    if (PS) {
        PS->SetTeam(NextTeam);
        NextTeam = (NextTeam + 1) % 2;
    }
    Super::PostLogin(NewPlayer);
}`,
          annotations: [
            { lines: 1, text: 'Declared in the header as `virtual void PostLogin(APlayerController* NewPlayer) override;`, next to an `int32 NextTeam = 0;` member.' },
            { lines: '2-3', text: 'The PlayerState already exists: `Login` created the controller, and the controller created its PlayerState.' },
            { lines: '4-7', text: 'Alternate teams. Doing it **before** `Super` matters: the base implementation goes on to spawn the pawn, which may want to know its team colour.' },
            { lines: 8, text: 'Always call `Super` for framework functions, or the rest of the flow (pawn spawning) never happens.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Several of these are Blueprint events too',
          text: '`HandleStartingNewPlayer`, `ChoosePlayerStart` and `SpawnDefaultPawnFor` are `BlueprintNativeEvent`s, so a designer can override where players spawn in `BP_ArenaGameMode` without touching C++. You now know exactly how that works under the hood.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'order',
      prompt: 'A player connects to your server. Put the GameMode functions in the order the engine calls them.',
      lines: [
        'PreLogin',
        'Login',
        'PostLogin',
        'HandleStartingNewPlayer',
        'RestartPlayer',
      ],
      distractors: ['BeginPlay'],
      explanation:
        '`PreLogin` can still reject the player; `Login` spawns their PlayerController (and with it the PlayerState); `PostLogin` marks them fully connected; `HandleStartingNewPlayer` decides how they start; `RestartPlayer` spawns and possesses their pawn at a PlayerStart. `BeginPlay` is an actor lifecycle event, not part of the login sequence.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'AGameStateBase: the scoreboard everyone sees',
      blocks: [
        {
          type: 'p',
          text: 'The GameState holds information about the match that **every** machine needs: team scores, time remaining, the current round. It exists on the server and is [[replication|replicated]] to all clients. The server writes to it; clients read from it.',
        },
        {
          type: 'code',
          title: 'ArenaGameState.h',
          code: `UCLASS()
class MYGAME_API AArenaGameState : public AGameStateBase {
    GENERATED_BODY()

public:
    void AddScore(int32 Team, int32 Points);

    UFUNCTION(BlueprintPure, Category = "Match")
    int32 GetScore(int32 Team) const;

    virtual void GetLifetimeReplicatedProps(
        TArray<FLifetimeProperty>& OutProps) const override;

protected:
    UPROPERTY(Replicated)
    int32 RedScore = 0;

    UPROPERTY(Replicated)
    int32 BlueScore = 0;
};`,
          annotations: [
            { lines: 6, text: 'Not exposed to Blueprint, and guarded by an authority check: only the server may change scores.' },
            { lines: '8-9', text: 'Anyone, on any machine, can read the scores, for example a scoreboard widget.' },
            { lines: '15-19', text: 'Marked `Replicated` and registered below, so changes on the server reach every client automatically.' },
          ],
        },
        {
          type: 'code',
          title: 'ArenaGameState.cpp',
          code: `#include "ArenaGameState.h"
#include "Net/UnrealNetwork.h"

void AArenaGameState::AddScore(int32 Team, int32 Points) {
    if (!HasAuthority()) {
        return;
    }
    if (Team == 0) {
        RedScore += Points;
    } else {
        BlueScore += Points;
    }
}

void AArenaGameState::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutProps) const {
    Super::GetLifetimeReplicatedProps(OutProps);
    DOREPLIFETIME(AArenaGameState, RedScore);
    DOREPLIFETIME(AArenaGameState, BlueScore);
}`,
          annotations: [
            { lines: '5-7', text: '`HasAuthority()` is true on the server (and in single-player). A client calling this would only change its local copy, which the next update from the server would overwrite.' },
            { lines: '17-19', text: 'The registration that makes `Replicated` work. The networking unit explains every part of this function; for now, treat it as boilerplate.' },
          ],
        },
        {
          type: 'list',
          items: [
            '`PlayerArray` is a built-in list of every player\'s `APlayerState`, kept up to date on all machines: perfect for scoreboards.',
            '`GetServerWorldTimeSeconds()` gives a clock that agrees across machines, useful for match timers.',
            'GameState is also where `AGameState` (the `AGameMode` partner) keeps its replicated match state.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'APlayerState: one public card per player',
      blocks: [
        {
          type: 'p',
          text: 'Each connected player gets one PlayerState, created along with their PlayerController. Like the GameState, it is replicated to **every** client, so everyone can see everyone\'s name, score and team. Crucially, it outlives the player\'s pawn: when a character dies and is destroyed, the PlayerState (and its stats) carry on.',
        },
        {
          type: 'code',
          title: 'ArenaPlayerState.h',
          code: `UCLASS()
class MYGAME_API AArenaPlayerState : public APlayerState {
    GENERATED_BODY()

public:
    void SetTeam(int32 NewTeam) { Team = NewTeam; }
    int32 GetTeam() const { return Team; }
    void AddKill() { ++Kills; }

    virtual void GetLifetimeReplicatedProps(
        TArray<FLifetimeProperty>& OutProps) const override;

protected:
    UPROPERTY(Replicated, BlueprintReadOnly, Category = "Stats")
    int32 Kills = 0;

    UPROPERTY(Replicated, BlueprintReadOnly, Category = "Stats")
    int32 Team = 0;
};`,
          annotations: [
            { lines: '6-8', text: 'Setters are meant to be called by server code (the GameMode). Clients read the replicated values.' },
            { lines: '14-18', text: 'Registered with `DOREPLIFETIME` in the `.cpp`, exactly like the GameState.' },
          ],
        },
        {
          type: 'p',
          text: '`APlayerState` already provides the basics: `GetPlayerName()`, `GetScore()` / `SetScore()`, `GetPlayerId()`, `GetPingInMilliseconds()` and `GetPawn()`. Add your own per-player public data on top.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not store kills on the character?',
          text: 'The character is destroyed when it dies and a new one is spawned on respawn, so its member variables vanish. And why not on the PlayerController? Because other clients do not have your PlayerController, so they could never show your kills on their scoreboard. The PlayerState is the one object that is per-player, survives death **and** is visible to everyone.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Select **every** piece of data that belongs in your `APlayerState` subclass.',
      options: [
        {
          text: 'The player\'s kill and death counts',
          correct: true,
          why: 'Per-player, must survive respawns, and every client\'s scoreboard shows them.',
        },
        {
          text: 'The team the player is on',
          correct: true,
          why: 'Per-player and public: other clients need it to colour names and decide who is an enemy.',
        },
        {
          text: 'The time remaining in the match',
          why: 'That is about the whole match, not one player, so it belongs in the GameState.',
        },
        {
          text: 'The player\'s mouse sensitivity setting',
          why: 'A local preference nobody else needs. It belongs with the local player (its PlayerController or a settings object), not in replicated data.',
        },
        {
          text: 'The current health of the character they control',
          why: 'Health belongs to the pawn (often in a health component): it resets when a new pawn spawns and it describes the body, not the player.',
        },
      ],
      explanation:
        'PlayerState is for **per-player, public, persistent-across-respawn** data. Match-wide data goes in the GameState, body data on the pawn, and private local preferences stay off the network entirely.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Who exists where, and why the framework is split',
      blocks: [
        {
          type: 'table',
          headers: ['Object', 'Server', 'Owning client', 'Other clients'],
          rows: [
            ['GameMode', 'Yes (one)', 'No', 'No'],
            ['GameState', 'Yes', 'Yes (replicated)', 'Yes (replicated)'],
            ['PlayerState', 'Yes, every player\'s', 'Yes, every player\'s', 'Yes, every player\'s'],
            ['PlayerController', 'Yes, one per player', 'Only its own', 'No'],
            ['Pawn / Character', 'Yes', 'Yes (replicated)', 'Yes, when relevant'],
            ['HUD and widgets', 'Only for a [[listen-server]] host\'s own player', 'Its own', 'No'],
          ],
          caption: '"Owning client" means the machine of the player the object belongs to. In single-player, all columns are the same machine.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Networking shaped the whole design',
          text: 'Unreal was built for multiplayer from the start, and the framework encodes who may know what. The **GameMode** makes the decisions, so it stays on the server: clients cannot read the rules engine or tamper with it, and there is exactly one [[authority]]. Anything clients must see is published through replicated objects: the **GameState** for the match, a **PlayerState** for each player. The **PlayerController** is a private line between one player and the server, so only that player\'s machine has a copy.',
        },
        {
          type: 'p',
          text: 'The split also follows **lifetimes**. Pawns are created and destroyed constantly (death, vehicles, respawns). The PlayerController and PlayerState stay for as long as the player is connected. The GameMode and GameState last for one level. Putting data on the object whose lifetime matches it removes a whole class of "my value reset" bugs.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Single-player hides mistakes',
          text: 'In single-player everything lives on one machine, so reading the GameMode from UI code or a client-side effect *works*. The day you add multiplayer, that code gets `nullptr` on every client. Respecting the split from the start is cheap; retrofitting it is not.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: 'In a multiplayer game, code running on a client calls `GetWorld()->GetAuthGameMode()` and gets `nullptr`. Why?',
      options: [
        {
          text: 'The GameMode has not finished `BeginPlay` yet; try again a frame later',
          why: 'Waiting will not help. On a client the GameMode never exists at all.',
        },
        {
          text: 'The GameMode exists only on the server, so clients never have one',
          correct: true,
          why: 'Correct. The "Auth" in the name is a reminder: it returns the authority\'s GameMode, which only the server has.',
        },
        {
          text: 'The level has no GameMode set in World Settings',
          why: 'Even with no override, a GameMode is always chosen (falling back to the project default). The client simply does not get one.',
        },
        {
          text: '`GetAuthGameMode` only works from Blueprints',
          why: 'It is a normal C++ function on `UWorld`; it works from C++ on the server.',
        },
      ],
      explanation:
        'Clients must never depend on the GameMode. If a client needs information the GameMode decides (scores, time left, match phase), the GameMode should write it into the GameState or a PlayerState, which replicate to clients.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Choosing the GameMode for a level',
      blocks: [
        {
          type: 'p',
          text: 'Each level is played with exactly one GameMode class. You can set it in three places, from most specific to most general:',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**[[world-settings|World Settings]]** (per level): *Window → World Settings → GameMode Override*. Use it for a main menu level with a `BP_MenuGameMode`, or a tutorial with special rules.',
            '**Project Settings** (project default): *Maps & Modes → Default Modes → Default GameMode*. Used by every level without an override.',
            '**Config file**: Project Settings simply writes to `DefaultEngine.ini`, which you can also edit by hand or review in source control.',
          ],
        },
        {
          type: 'code',
          lang: 'ini',
          title: 'Config/DefaultEngine.ini',
          code: `[/Script/EngineSettings.GameMapsSettings]
GlobalDefaultGameMode=/Game/Core/BP_ArenaGameMode.BP_ArenaGameMode_C
GameDefaultMap=/Game/Maps/MainMenu.MainMenu`,
          annotations: [
            { lines: 2, text: 'A Blueprint class path ends in `_C` (the generated class). For a C++ class you would write `/Script/MyGame.ArenaGameMode`.' },
            { lines: 3, text: 'The level the packaged game opens first. A related key, `EditorStartupMap`, controls what the editor opens.' },
          ],
        },
        {
          type: 'deepdive',
          title: 'The full priority order',
          blocks: [
            {
              type: 'p',
              text: 'When a level loads, the engine picks the GameMode class in this order, stopping at the first that is set:',
            },
            {
              type: 'list',
              ordered: true,
              items: [
                'A `?game=` option in the travel URL (for example `MyMap?game=CTF`, resolved through *Game Mode Class Aliases* in Project Settings).',
                'The level\'s World Settings *GameMode Override*.',
                'A *Game Mode Map Prefix* match in Project Settings (for example, maps starting with `CTF_` use the capture-the-flag mode).',
                'The project\'s *Default GameMode* (or the separate server default on a dedicated server).',
              ],
            },
            {
              type: 'p',
              text: 'The URL option is what lets one map support several modes in a multiplayer game, chosen when the server loads the map.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Debugging "my GameMode isn\'t running"',
          text: 'Check the World Settings override first: a level created from a template often carries its own override that silently wins over your project default.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Getting framework objects in C++',
      blocks: [
        {
          type: 'p',
          text: 'Every framework object is reachable from any actor through its world. The getters return base-class pointers, so you convert them with [[ue-cast|Cast<T>]], which returns `nullptr` if the object is not of that type (the casting unit covers it in depth). Templated helpers do the cast for you.',
        },
        {
          type: 'code',
          title: 'ArenaCharacter.cpp',
          code: `void AArenaCharacter::HandleDeath(AController* Killer) {
    // Server only: the GameMode exists nowhere else.
    if (AArenaGameMode* GM =
            GetWorld()->GetAuthGameMode<AArenaGameMode>()) {
        GM->OnPlayerKilled(Killer, GetController());
    }
}

void AArenaCharacter::LogMatchInfo() const {
    // Server and clients:
    const AArenaGameState* GS =
        GetWorld()->GetGameState<AArenaGameState>();
    const AArenaPlayerState* PS =
        GetPlayerState<AArenaPlayerState>();
    if (GS && PS) {
        UE_LOG(LogTemp, Log, TEXT("Team %d has %d points"),
            PS->GetTeam(), GS->GetScore(PS->GetTeam()));
    }
}`,
          annotations: [
            { lines: '3-4', text: '`GetAuthGameMode<T>()` casts for you. It is `nullptr` on clients, and also if the level runs a different GameMode class. Declaring the pointer inside the `if` keeps it scoped to where it is valid.' },
            { lines: '11-12', text: '`GetGameState<T>()` works everywhere, because the GameState is replicated.' },
            { lines: '13-14', text: 'Pawns and controllers have `GetPlayerState<T>()`. On a client it can briefly be `nullptr` right after spawning, until the PlayerState has replicated.' },
          ],
        },
        {
          type: 'table',
          headers: ['You want', 'Call', 'Valid on'],
          rows: [
            ['GameMode', '`GetWorld()->GetAuthGameMode<T>()` or `Cast<T>(UGameplayStatics::GetGameMode(this))`', 'Server only'],
            ['GameState', '`GetWorld()->GetGameState<T>()`', 'Everywhere'],
            ['A pawn\'s PlayerState', '`Pawn->GetPlayerState<T>()`', 'Everywhere (after replication)'],
            ['All PlayerStates', '`GameState->PlayerArray`', 'Everywhere'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Always check the result',
          text: 'Each getter can legitimately return `nullptr`: wrong machine, wrong GameMode class in a test level, or an object that has not replicated yet. Dereferencing without a check is one of the most common crashes in Unreal projects. For client code that needs the PlayerState as soon as it arrives, override `OnRep_PlayerState()` on the pawn or controller.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'fill',
      prompt: 'Complete the getters: the first line must work on clients, the second runs only on the server.',
      template: `const AArenaGameState* GS =
    GetWorld()->___<AArenaGameState>();

AArenaGameMode* GM =
    GetWorld()->___<AArenaGameMode>();`,
      blanks: [{ answers: ['GetGameState'] }, { answers: ['GetAuthGameMode'] }],
      wordBank: ['GetGameState', 'GetAuthGameMode', 'GetGameMode', 'GetGameInstance', 'GetPlayerState', 'GetFirstPlayerController'],
      explanation:
        '`UWorld::GetGameState<T>()` returns the replicated GameState, available everywhere. `UWorld::GetAuthGameMode<T>()` returns the authority\'s GameMode, which exists only on the server. `UWorld` has no `GetGameMode` member; the Blueprint-friendly equivalent is `UGameplayStatics::GetGameMode(this)`, which still returns `nullptr` on clients.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'bug',
      prompt: 'This scoreboard actor works in single-player but crashes every client in multiplayer. Tap the line(s) at fault.',
      code: `void AScoreboard::Tick(float DeltaSeconds) {
    Super::Tick(DeltaSeconds);
    AArenaGameMode* GM =
        GetWorld()->GetAuthGameMode<AArenaGameMode>();
    const int32 Red = GM->GetRedScore();
    ScoreText->SetText(FText::AsNumber(Red));
}`,
      bugLines: [3, 4, 5],
      hint: 'Which framework object do clients never have?',
      explanation:
        'On a client `GetAuthGameMode` returns `nullptr`, and line 5 dereferences it: an immediate crash. In single-player the local machine is the server, so the bug hides. The fix is architectural: keep scores in the replicated GameState, read them with `GetWorld()->GetGameState<AArenaGameState>()`, and check the pointer before using it. (Updating text every tick is also wasteful; an event when the score changes would be better, a topic for later units.)',
    },
  ],
  takeaways: [
    'The GameMode holds the rules and exists only on the server (in single-player, your machine is the server).',
    'The GameState holds match-wide state and the PlayerState holds per-player public state; both are replicated to every client.',
    'PlayerStates outlive pawns, so per-player stats that must survive death belong there, not on the character.',
    'The GameMode logs players in (`PreLogin`, `Login`, `PostLogin`, `HandleStartingNewPlayer`, `RestartPlayer`) and spawns their controller, PlayerState and pawn from its default classes.',
    'Set the GameMode per level in World Settings or project-wide in Project Settings (`DefaultEngine.ini`); pick Blueprint classes in a Blueprint child of your GameMode.',
    'Use `GetAuthGameMode<T>()` (server only), `GetGameState<T>()` and `GetPlayerState<T>()`, and always check for `nullptr`.',
  ],
  reading: [
    {
      title: 'Gameplay Framework',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s overview of every framework class and how they relate; the diagrams are worth a look.',
    },
    {
      title: 'Game Mode and Game State',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/game-mode-and-game-state-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Details of the GameMode\'s functions and the GameMode/GameState split, including `AGameMode` match states.',
    },
    {
      title: 'Unreal Engine C++ Complete Guide',
      url: 'https://www.tomlooman.com/unreal-engine-cpp-guide/',
      source: 'article',
      note: 'Covers the gameplay framework classes from a C++ programmer\'s point of view.',
    },
  ],
};
