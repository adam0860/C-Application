import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-game-instance-subsystems',
  title: 'GameInstance and Subsystems',
  summary: 'What survives a level load, and how subsystems give each feature an automatically managed home with exactly the right lifetime.',
  minutes: 18,
  objectives: [
    'Explain what is destroyed when a new level loads and what survives',
    'Create a `UGameInstance` subclass, register it, and use it for data that must outlive a level',
    'Choose between engine, GameInstance, world and local-player subsystems based on lifetime',
    'Write a subsystem with `Initialize` and `Deinitialize`, and access it from C++ and Blueprint',
    'Explain why subsystems beat static singletons, manager actors and an overloaded GameInstance',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'What survives a level load?',
      blocks: [
        {
          type: 'p',
          text: 'Calling `UGameplayStatics::OpenLevel(this, FName("Arena_01"))` does far more than swap the scenery. The current [[world]] is torn down and **every actor in it is destroyed**: the GameMode, the GameState, every PlayerController and PlayerState, every pawn, the HUD. Then a fresh world is built from the new map and the framework creates new ones.',
        },
        {
          type: 'table',
          headers: ['Object', 'Typically lives for'],
          rows: [
            ['Pawn / Character', 'Until it is destroyed: a death, a respawn, a vehicle swap'],
            ['PlayerController, PlayerState', 'While the player is in this level'],
            ['GameMode, GameState, `UWorld`', 'One level'],
            ['[[local-player|ULocalPlayer]]', 'As long as that local player exists, usually the whole session'],
            ['[[game-instance|UGameInstance]]', 'The whole run of the game, from launch to quit'],
          ],
          caption: 'Multiplayer [[seamless-travel]] can carry some actors across a level change; it is the exception, covered with networking.',
        },
        {
          type: 'p',
          text: 'So where does the character the player picked in the main menu live while the arena level loads? Or the quests they completed in the previous level? Not in any actor. It needs an object whose lifetime is longer than a level.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why destroy everything?',
          text: 'A clean world per level makes loading predictable: no stale actors from the last map, no dangling references to things that no longer exist, and memory that is reliably released. The price is that anything meant to persist must be stored deliberately somewhere outside the world.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'In the main menu level, the player chooses a character class. The menu then loads the arena level with `OpenLevel`. Where should the choice be stored so the arena\'s GameMode can read it?',
      options: [
        {
          text: 'In the menu level\'s GameMode',
          why: 'The menu GameMode is destroyed with the menu world, before the arena\'s GameMode even exists.',
        },
        {
          text: 'In the player\'s PlayerState',
          why: 'With a normal level load the PlayerState is destroyed along with every other actor in the world.',
        },
        {
          text: 'In a static variable in the character class',
          why: 'It would survive, but static state is shared by every PIE instance in the editor process and persists between play sessions, causing subtle bugs. There is a better-scoped home.',
        },
        {
          text: 'In the GameInstance, or better, a GameInstance subsystem',
          correct: true,
          why: 'The GameInstance outlives every level, and a GameInstance subsystem has exactly that lifetime while keeping the feature in its own class.',
        },
      ],
      explanation:
        'Match the data to an owner whose lifetime covers every moment the data is needed. "From the menu into the next level" spans a world teardown, so only objects outside the world qualify: the GameInstance and the subsystems that share its lifetime.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'UGameInstance: the session object',
      blocks: [
        {
          type: 'p',
          text: 'The engine creates one GameInstance when the game starts, before the first world, and destroys it when the game shuts down. In the editor, every Play-In-Editor (PIE) session gets a fresh one, and when you test multiplayer in the editor each simulated player\'s instance gets its own.',
        },
        {
          type: 'code',
          title: 'ArenaGameInstance.h',
          code: `UCLASS()
class MYGAME_API UArenaGameInstance : public UGameInstance {
    GENERATED_BODY()

public:
    virtual void Init() override;
    virtual void Shutdown() override;

    UPROPERTY(BlueprintReadWrite, Category = "Session")
    TSubclassOf<APawn> SelectedCharacterClass;
};`,
          annotations: [
            { lines: '6-7', text: '`Init` runs once at start-up and `Shutdown` once at exit. Always call `Super` in both.' },
            { lines: '9-10', text: 'Set by the menu (it is `BlueprintReadWrite`, so a widget Blueprint can store the choice), read by the arena\'s GameMode.' },
          ],
        },
        {
          type: 'code',
          title: 'ArenaGameMode.cpp',
          code: `UClass* AArenaGameMode::
    GetDefaultPawnClassForController_Implementation(
        AController* InController) {
    const UArenaGameInstance* GI =
        GetGameInstance<UArenaGameInstance>();
    if (GI && GI->SelectedCharacterClass) {
        return GI->SelectedCharacterClass;
    }
    return Super::GetDefaultPawnClassForController_Implementation(
        InController);
}`,
          annotations: [
            { lines: '1-3', text: 'A `BlueprintNativeEvent` from `AGameModeBase` that decides which pawn class to spawn for a player; we override its C++ default.' },
            { lines: '4-5', text: 'Every actor can reach the GameInstance; the template version casts for you and returns `nullptr` if the class does not match.' },
            { lines: '9-10', text: 'Fall back to `DefaultPawnClass` if nothing was chosen, for example when testing the arena level directly.' },
          ],
        },
        {
          type: 'p',
          text: 'Register your class in *Project Settings → Maps & Modes → Game Instance Class*, which writes this to `DefaultEngine.ini`:',
        },
        {
          type: 'code',
          lang: 'ini',
          title: 'Config/DefaultEngine.ini',
          code: `[/Script/EngineSettings.GameMapsSettings]
GameInstanceClass=/Script/MyGame.ArenaGameInstance`,
          annotations: [
            { lines: 2, text: 'A C++ class path. To use a Blueprint child, point it at `/Game/.../BP_ArenaGameInstance.BP_ArenaGameInstance_C`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Local to each machine',
          text: 'The GameInstance is **not replicated**. In multiplayer the server and every client each have their own, and they share nothing automatically. In the example above, the server\'s GameInstance only knows the *host\'s* choice; a client\'s choice has to be sent to the server (through the join URL options or a server call).',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'Because it persists for the whole session, the server\'s `UGameInstance` is replicated, so clients can read data the server stores in it.',
      answer: false,
      explanation:
        'The GameInstance is not an actor and is never replicated. Each machine has its own independent GameInstance. Data that clients must see belongs in replicated actors (the GameState or a PlayerState); the GameInstance is for state that one machine needs to keep across level loads.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Subsystems: automatic objects with managed lifetimes',
      blocks: [
        {
          type: 'p',
          text: 'Put the selected character, quest progress, save management, audio settings and online sessions all into one GameInstance class and it becomes a "god object" thousands of lines long that everybody edits. Since UE 4.22, [[subsystem|subsystems]] solve this. A subsystem is a small class tied to an owner; the engine creates one automatically when the owner is created and destroys it with the owner. You write no registration code at all.',
        },
        {
          type: 'table',
          headers: ['Base class', 'Lifetime matches', 'One instance per', 'Typical uses'],
          rows: [
            ['`UEngineSubsystem`', 'The engine (whole process, editor included)', 'Process', 'Process-wide services such as telemetry'],
            ['[[game-instance-subsystem|UGameInstanceSubsystem]]', 'The GameInstance', 'Game session (each PIE instance)', 'Quests, progression, save games, online sessions'],
            ['[[world-subsystem|UWorldSubsystem]]', 'A `UWorld`', 'Level (including editor worlds)', 'A per-level wave or spawn director, level-wide queries'],
            ['[[local-player-subsystem|ULocalPlayerSubsystem]]', 'A `ULocalPlayer`', 'Local player (each split-screen player)', 'Per-player settings and UI; Enhanced Input\'s `UEnhancedInputLocalPlayerSubsystem`'],
          ],
          caption: 'There is also `UEditorSubsystem` for editor-only tools.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'How can the engine create classes it has never heard of?',
          text: '[[reflection]]. When an owner (say, a GameInstance) is created, the engine asks the reflection system for every non-abstract class derived from `UGameInstanceSubsystem`, creates one of each with the owner as its [[outer]], and calls `Initialize`. When the owner goes away, it calls `Deinitialize` and lets the garbage collector reclaim them. Adding a feature therefore means adding a class; nothing else needs to know it exists.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'You already used one',
          text: 'UE5\'s templates add input mapping contexts through `UEnhancedInputLocalPlayerSubsystem`: a local-player subsystem shipped by the Enhanced Input plugin. Per-player because split-screen players each have their own key bindings.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: 'In a split-screen game, each player has their own HUD stack and control settings that must survive level changes. Which subsystem base class fits?',
      options: [
        {
          text: '`UWorldSubsystem`',
          why: 'There is one per world, shared by every player, and it is destroyed on every level change.',
        },
        {
          text: '`UGameInstanceSubsystem`',
          why: 'It survives level changes, but there is only one per game instance, shared by all the local players.',
        },
        {
          text: '`ULocalPlayerSubsystem`',
          correct: true,
          why: 'One instance per local player, owned by the `ULocalPlayer`, which persists across level loads.',
        },
        {
          text: '`UEngineSubsystem`',
          why: 'One per process, alive even in the editor outside play sessions: far too broad for per-player state.',
        },
      ],
      explanation:
        'Choosing a subsystem type is choosing a lifetime and a multiplicity. "Per player, across levels" is exactly the `ULocalPlayer`\'s lifetime, so a local-player subsystem gives you one correctly scoped instance for each split-screen player with no bookkeeping.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Writing a subsystem',
      blocks: [
        {
          type: 'code',
          title: 'QuestSubsystem.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "QuestSubsystem.generated.h"

UCLASS()
class MYGAME_API UQuestSubsystem
    : public UGameInstanceSubsystem {
    GENERATED_BODY()

public:
    virtual void Initialize(
        FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    UFUNCTION(BlueprintCallable, Category = "Quests")
    void CompleteQuest(FName QuestId);

    UFUNCTION(BlueprintPure, Category = "Quests")
    bool IsQuestComplete(FName QuestId) const;

private:
    TSet<FName> CompletedQuests;
};`,
          annotations: [
            { lines: '8-9', text: 'Deriving from the right base class is the entire registration step.' },
            { lines: '13-15', text: 'Your constructor and destructor equivalents: set up and tear down here rather than in the C++ constructor, which also runs for the class default object.' },
            { lines: '17-21', text: 'Ordinary `UFUNCTION`s. Blueprints can call them through the subsystem\'s getter node.' },
            { lines: 24, text: 'No `UPROPERTY` needed: `FName` is not a UObject, so there is nothing for the garbage collector to track. UObject pointers stored in a subsystem must still be `UPROPERTY`.' },
          ],
        },
        {
          type: 'code',
          title: 'QuestSubsystem.cpp',
          code: `#include "QuestSubsystem.h"
#include "SaveSubsystem.h"

void UQuestSubsystem::Initialize(
    FSubsystemCollectionBase& Collection) {
    Super::Initialize(Collection);
    Collection.InitializeDependency(
        USaveSubsystem::StaticClass());
    UE_LOG(LogTemp, Log, TEXT("Quest subsystem ready"));
}

void UQuestSubsystem::Deinitialize() {
    CompletedQuests.Empty();
    Super::Deinitialize();
}

void UQuestSubsystem::CompleteQuest(FName QuestId) {
    CompletedQuests.Add(QuestId);
}

bool UQuestSubsystem::IsQuestComplete(FName QuestId) const {
    return CompletedQuests.Contains(QuestId);
}`,
          annotations: [
            { lines: '7-8', text: 'Subsystems of the same type initialize in no guaranteed order. If this one needs another during `Initialize`, `InitializeDependency` makes sure that one is initialized first.' },
            { lines: '12-15', text: 'Clean up your own state first, then let the base class finish, the mirror image of `Initialize`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Opting out with ShouldCreateSubsystem',
          text: 'Override `virtual bool ShouldCreateSubsystem(UObject* Outer) const` to decide whether an instance should be created at all, for example to skip a UI-related subsystem on a dedicated server, which has no screen. Mark a subsystem base class `UCLASS(Abstract)` if only its children should be instantiated.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'GameInstance subsystems start before any world',
          text: 'A GameInstance subsystem\'s `Initialize` runs while the GameInstance itself is initializing, before the first level exists. Do not look for actors or players there; react later, for example when a world begins play.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: 'Complete the code: declare a subsystem that lives as long as the GameInstance, then fetch it from an actor.',
      template: `UCLASS()
class MYGAME_API UQuestSubsystem : public ___ {
    GENERATED_BODY()
    // ...
};

// From any actor:
UQuestSubsystem* Quests =
    GetGameInstance()->___<UQuestSubsystem>();`,
      blanks: [{ answers: ['UGameInstanceSubsystem'] }, { answers: ['GetSubsystem'] }],
      wordBank: ['UGameInstanceSubsystem', 'GetSubsystem', 'UWorldSubsystem', 'UGameInstance', 'GetEngineSubsystem', 'Cast'],
      explanation:
        'Deriving from `UGameInstanceSubsystem` is what ties the class to the GameInstance\'s lifetime and makes the engine create it. `GetSubsystem<T>()` on the owner returns that instance. Deriving from `UGameInstance` itself would create a second GameInstance class rather than a subsystem, and `UWorldSubsystem` would reset with every level. (In real code, also check that `GetGameInstance()` is not null.)',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Getting a subsystem',
      blocks: [
        {
          type: 'p',
          text: 'Each owner has a typed `GetSubsystem<T>()`. Because every actor can reach its world, GameInstance and (through a player controller) its local player, a subsystem is one line away from almost any gameplay code.',
        },
        {
          type: 'table',
          headers: ['Subsystem type', 'C++ access'],
          rows: [
            ['GameInstance', '`GetGameInstance()->GetSubsystem<T>()`, or the null-safe `UGameInstance::GetSubsystem<T>(GetGameInstance())`'],
            ['World', '`GetWorld()->GetSubsystem<T>()`'],
            ['Local player', '`ULocalPlayer::GetSubsystem<T>(PC->GetLocalPlayer())`'],
            ['Engine', '`GEngine->GetEngineSubsystem<T>()`'],
          ],
        },
        {
          type: 'code',
          title: 'QuestGiver.cpp',
          code: `void AQuestGiver::Interact(APawn* Interactor) {
    UQuestSubsystem* Quests =
        UGameInstance::GetSubsystem<UQuestSubsystem>(
            GetGameInstance());
    if (Quests && !Quests->IsQuestComplete(QuestId)) {
        Quests->CompleteQuest(QuestId);
        OnQuestCompleted(Interactor);
    }
}`,
          annotations: [
            { lines: '2-4', text: 'The static helper returns `nullptr` instead of crashing if the GameInstance pointer is null, for example on an actor in an editor preview world.' },
            { lines: 7, text: 'A `BlueprintImplementableEvent` so designers can play a fanfare: the hook pattern from the previous unit.' },
          ],
        },
        {
          type: 'p',
          text: 'In Blueprint, search the context menu for the subsystem\'s name: the editor offers a getter node for each subsystem class (for example *Get QuestSubsystem*), with all its `BlueprintCallable` and `BlueprintPure` functions available from it. No casting and no searching the level.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: '`UQuestSubsystem` derives from `UGameInstanceSubsystem`. This code fails to build. Tap the line(s) at fault.',
      code: `void AQuestGiver::Interact(APawn* Interactor) {
    UQuestSubsystem* Quests =
        GetWorld()->GetSubsystem<UQuestSubsystem>();
    if (Quests && !Quests->IsQuestComplete(QuestId)) {
        Quests->CompleteQuest(QuestId);
    }
}`,
      bugLines: [2, 3],
      hint: 'Which owner holds GameInstance subsystems?',
      explanation:
        'Each owner only holds its own kind of subsystem. `UWorld::GetSubsystem<T>()` serves world subsystems, and the engine enforces that with a `static_assert` requiring `T` to derive from `UWorldSubsystem`, so this does not compile. Ask the GameInstance instead: `UGameInstance::GetSubsystem<UQuestSubsystem>(GetGameInstance())`.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'World subsystems in practice',
      blocks: [
        {
          type: 'p',
          text: 'A world subsystem lives exactly as long as a level, which makes it the natural home for per-level services that would otherwise become a "manager actor". Two details matter.',
        },
        {
          type: 'code',
          title: 'SpawnDirectorSubsystem.cpp',
          code: `#include "SpawnDirectorSubsystem.h"
#include "EngineUtils.h"
#include "SpawnPoint.h"

bool USpawnDirectorSubsystem::DoesSupportWorldType(
    const EWorldType::Type WorldType) const {
    return WorldType == EWorldType::Game ||
        WorldType == EWorldType::PIE;
}

void USpawnDirectorSubsystem::OnWorldBeginPlay(
    UWorld& InWorld) {
    Super::OnWorldBeginPlay(InWorld);
    for (TActorIterator<ASpawnPoint> It(&InWorld); It; ++It) {
        SpawnPoints.Add(*It);
    }
}`,
          annotations: [
            { lines: '5-9', text: 'By default world subsystems are also created for **editor** worlds (the level you are editing). Restrict them to game and PIE worlds when they only make sense during play.' },
            { lines: '11-13', text: '`Initialize` runs when the world is created, before its actors are ready. `OnWorldBeginPlay` runs when gameplay is about to start, just before actors receive `BeginPlay`: the right moment to scan the level.' },
            { lines: '14-16', text: '`TActorIterator` walks every actor of a class in a world. `SpawnPoints` is a `UPROPERTY() TArray<TObjectPtr<ASpawnPoint>>` in the header.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Ticking subsystems',
          text: 'Derive from `UTickableWorldSubsystem` (and implement `Tick` and `GetStatId`) when a world-level service needs per-frame updates, such as a wave director counting down to the next spawn.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'order',
      prompt: 'Put these in the order they happen when the game boots into its first level.',
      linesAreCode: false,
      lines: [
        'Engine subsystems are initialized as the engine starts up',
        'The GameInstance is created and initialized, along with its GameInstance subsystems',
        'The first level\'s `UWorld` is created and its world subsystems are initialized',
        'World subsystems receive `OnWorldBeginPlay`',
        'Actors in the level receive `BeginPlay`',
      ],
      explanation:
        'Lifetimes nest: the engine outlives the GameInstance, which outlives every world, which outlives its actors. Each kind of subsystem starts with its owner, so it can rely on everything above it already existing, but not on anything below it.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Why subsystems beat singletons and manager actors',
      blocks: [
        {
          type: 'p',
          text: 'Before subsystems, Unreal projects shared services in three ways. Each has a specific failure that subsystems avoid.',
        },
        {
          type: 'compare',
          left: {
            title: 'Static singleton',
            tone: 'bad',
            code: `class FQuestManager {
public:
    static FQuestManager& Get() {
        static FQuestManager Instance;
        return Instance;
    }
    TSet<FName> Completed;
};`,
            text: 'The editor process keeps running between PIE sessions, so `Completed` still holds last session\'s quests when you press Play again. All PIE clients in one editor share it. And a static raw pointer to a UObject is invisible to the garbage collector.',
          },
          right: {
            title: 'GameInstance subsystem',
            tone: 'good',
            code: `UCLASS()
class UQuestSubsystem
    : public UGameInstanceSubsystem {
    GENERATED_BODY()
    // ...
    TSet<FName> Completed;
};`,
            text: 'Fresh for every PIE session, one per simulated player, owned by its GameInstance so the garbage collector handles it, and reachable through a typed getter.',
          },
        },
        {
          type: 'table',
          headers: ['Old approach', 'What goes wrong', 'Subsystem answer'],
          rows: [
            ['Static singleton', 'Lifetime is "the process": stale state between PIE runs, shared across PIE clients, GC-unaware', 'Lifetime matches a real owner, one instance per owner'],
            ['"Manager" actor placed in each level', 'Someone forgets to place it, or places two; it dies on level change; code must search the level to find it', 'Created automatically, exactly once, found with `GetSubsystem`'],
            ['Everything in the GameInstance', 'One huge class every feature edits: merge conflicts and tangled dependencies', 'One small class per feature; features can live in plugins and appear just by enabling them'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'The underlying idea',
          text: 'In the C++ course you learned [[raii]]: tie a resource\'s lifetime to an owner so it cannot leak or outlive its use. Subsystems apply the same principle to services. The engine already manages the lifetimes of the engine, the GameInstance, worlds and local players; a subsystem simply attaches your feature to the right one and inherits correct creation and destruction for free.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'When an actor is still right',
          text: 'If a service needs a transform in the world, components, replication, or per-level settings that designers edit in the Details panel, an actor may still be the right tool, or a world subsystem that reads its settings from a data asset or from World Settings.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Compared with a `QuestManager` actor that designers place in each level, select **every** genuine advantage of a `UGameInstanceSubsystem`.',
      options: [
        {
          text: 'It is created automatically, so nobody can forget to place it or accidentally place two',
          correct: true,
          why: 'The engine creates exactly one per GameInstance without any level setup.',
        },
        {
          text: 'Its data survives level changes',
          correct: true,
          why: 'It lives as long as the GameInstance, while a placed actor is destroyed with its level.',
        },
        {
          text: 'Each PIE instance gets its own, so testing several players in one editor process behaves correctly',
          correct: true,
          why: 'Every simulated player has its own GameInstance and therefore its own subsystem.',
        },
        {
          text: 'Its data is automatically replicated to every client',
          why: 'Subsystems are not actors and do not replicate. Replicated data belongs in the GameState or a PlayerState.',
        },
        {
          text: 'Designers can configure it differently per level in the Details panel',
          why: 'That is the one thing a placed actor does better. A subsystem has no per-level instance to select in the editor.',
        },
      ],
      explanation:
        'Subsystems win on lifetime, uniqueness, discoverability and modularity. They do not replicate and have no per-level editor presence; when you need those, combine a subsystem with replicated actors or with data that designers can edit.',
    },
  ],
  takeaways: [
    'Loading a level destroys every actor in the world, including the GameMode, GameState, PlayerControllers, PlayerStates and pawns.',
    'The `UGameInstance` lives from launch to quit (one per PIE instance in the editor) and is set in Project Settings; it is local to each machine and never replicated.',
    'Subsystems are created and destroyed automatically with their owner: `UEngineSubsystem`, `UGameInstanceSubsystem`, `UWorldSubsystem` or `ULocalPlayerSubsystem`. Pick the one whose lifetime matches your data.',
    'Set up in `Initialize` and tear down in `Deinitialize`; use `InitializeDependency` for ordering and `ShouldCreateSubsystem` to opt out.',
    'Access them with the owner\'s `GetSubsystem<T>()` in C++, or the automatic getter node in Blueprint. World subsystems also run in editor worlds unless you restrict them.',
    'Subsystems replace static singletons, placed manager actors and bloated GameInstances with small, correctly scoped, discoverable classes.',
  ],
  reading: [
    {
      title: 'Programming Subsystems',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/programming-subsystems-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s guide to subsystem types, lifetimes and access from C++ and Blueprint.',
    },
    {
      title: 'Gameplay Framework',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Where the GameInstance sits relative to the GameMode, GameState and controllers.',
    },
    {
      title: 'Unreal Engine C++ Complete Guide',
      url: 'https://www.tomlooman.com/unreal-engine-cpp-guide/',
      source: 'article',
      note: 'Broader C++ context for the framework classes, from someone who teaches Unreal C++ professionally.',
    },
  ],
};
