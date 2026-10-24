import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-pawns-characters',
  title: 'Pawns, Characters and Possession',
  summary: 'Bodies and brains: what makes an actor controllable, what ACharacter adds, and how controllers take over pawns.',
  minutes: 17,
  objectives: [
    'Explain what makes an `APawn` different from an `AActor`, and why Unreal separates controllers from pawns',
    'Possess and unpossess pawns correctly from server code, and react to possession with `OnPossess`',
    'Describe the ways a pawn gets its controller: `DefaultPawnClass`, `AutoPossessPlayer`, `AutoPossessAI` and manual possession',
    'Set up an `ACharacter` in C++ and explain what its capsule, mesh and movement component provide',
    'Choose between `ACharacter`, `APawn` and `AActor` for players, vehicles, drones and turrets',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'APawn: an actor that can be controlled',
      blocks: [
        {
          type: 'p',
          text: 'A [[pawn]] is an [[actor]] that can be **possessed** by a controller. That is the whole difference: a pawn has a slot for a controller, functions for receiving movement and rotation requests, and hooks that run when a controller arrives or leaves. A rock is an actor; a player, an enemy, a car and a security camera you can take over are pawns.',
        },
        {
          type: 'definition',
          term: 'Controller and pawn',
          text: 'A **controller** (`AController`) is the brain: it decides what to do, from player input (`APlayerController`) or from AI logic (`AAIController`). A **pawn** is the body: it exists in the world and carries out what its controller asks. One controller possesses at most one pawn at a time, and vice versa.',
        },
        {
          type: 'code',
          title: 'DronePawn.cpp',
          code: `#include "DronePawn.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/FloatingPawnMovement.h"

ADronePawn::ADronePawn() {
    Collision = CreateDefaultSubobject<USphereComponent>(
        TEXT("Collision"));
    SetRootComponent(Collision);

    Body = CreateDefaultSubobject<UStaticMeshComponent>(
        TEXT("Body"));
    Body->SetupAttachment(Collision);

    Movement = CreateDefaultSubobject<UFloatingPawnMovement>(
        TEXT("Movement"));
}`,
          annotations: [
            { lines: '7-9', text: 'A bare `APawn` has **no components at all**: no collision, no mesh. You build its body like any other actor.' },
            { lines: '15-16', text: 'A *pawn movement component* turns movement requests into motion. `UFloatingPawnMovement` gives simple flying movement with acceleration and no gravity; it moves the root component automatically.' },
          ],
        },
        {
          type: 'p',
          text: 'Controllers drive pawns through a small API. `AddMovementInput(Direction, Scale)` queues a movement request that the movement component consumes each frame. `GetController()` returns the current brain (or `nullptr`), and `IsPlayerControlled()` tells you whether it is a human.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why separate the brain from the body?',
          text: 'Because the pairing changes all the time. A player walks up to a tank and drives it; their character dies and a new one spawns; an enemy soldier is controlled by AI, then by a player in a "mind control" ability. If input handling and decision-making lived inside the character class, each of these would need special code. With the split, the same pawn class works with any controller, and the controller (with the player\'s settings, camera and HUD) survives when the body changes.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'truefalse',
      prompt: 'A plain `APawn` subclass, with no extra components, can walk, jump and stand on the floor.',
      answer: false,
      explanation:
        '`APawn` adds possession, not physical behaviour. It has no collision, no mesh and no movement logic until you add components such as a collision shape and a pawn movement component. Walking and jumping in particular come from `UCharacterMovementComponent`, which `ACharacter` sets up for you.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Possession: Possess, UnPossess and OnPossess',
      blocks: [
        {
          type: 'p',
          text: '[[possession|Possession]] links a controller to a pawn. `Controller->Possess(Pawn)` makes the controller drive the pawn; `Controller->UnPossess()` releases it. Possessing a new pawn automatically releases the old one, and if another controller held the new pawn, that controller lets go first.',
        },
        {
          type: 'code',
          title: 'ArenaPlayerController.cpp',
          code: `void AArenaPlayerController::EnterVehicle(APawn* Vehicle) {
    if (!HasAuthority() || !Vehicle) {
        return;
    }
    OnFootPawn = GetPawn();
    Possess(Vehicle);
}

void AArenaPlayerController::ExitVehicle() {
    if (HasAuthority() && OnFootPawn) {
        Possess(OnFootPawn);
    }
}

void AArenaPlayerController::OnPossess(APawn* InPawn) {
    Super::OnPossess(InPawn);
    UE_LOG(LogTemp, Log, TEXT("Now controlling %s"),
        *GetNameSafe(InPawn));
}`,
          annotations: [
            { lines: '2-4', text: 'Possession must happen on the server. Calling `Possess` without authority does nothing useful (and logs a warning).' },
            { lines: 5, text: 'Remember the on-foot character so we can return to it. In the header it is a `UPROPERTY() TObjectPtr<APawn> OnFootPawn;`, so the garbage collector knows we reference it.' },
            { lines: 6, text: 'Unpossesses the character and possesses the vehicle in one call. The character stays in the world, unpossessed.' },
            { lines: '15-19', text: 'To react to possession, override `OnPossess` (and `OnUnPossess`). Always call `Super` first: the base version does the actual linking.' },
          ],
        },
        {
          type: 'table',
          headers: ['Where', 'Hook', 'Runs on'],
          rows: [
            ['Controller', '`OnPossess(APawn*)` / `OnUnPossess()`', 'Server'],
            ['Pawn', '`PossessedBy(AController*)` / `UnPossessed()`', 'Server'],
            ['Pawn', '`NotifyControllerChanged()`', 'Server and owning client (UE 5)'],
          ],
          caption: 'The pawn-side hook that also runs on clients is where UE5\'s templates add input mapping, a topic for the input unit.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is Possess non-virtual and server-only?',
          text: 'Possession is more than setting a pointer: the controller becomes the pawn\'s **owner**, which decides which client\'s connection may send commands through it and what gets replicated where. That bookkeeping must happen exactly once, in a fixed order, on the machine with [[authority]]. Since UE 4.22, `Possess` and `UnPossess` are non-virtual wrappers that perform those checks and then call the virtual `OnPossess` / `OnUnPossess`, so overrides cannot accidentally skip the essential steps.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'fill',
      prompt: 'Complete the code: server code switches the player into a car, and the controller class reacts to taking over a pawn.',
      template: `// Server-side: switch the player into the car.
PlayerController->___(CarPawn);

// In AArenaPlayerController.h:
virtual void ___(APawn* InPawn) override;`,
      blanks: [{ answers: ['Possess'] }, { answers: ['OnPossess'] }],
      wordBank: ['Possess', 'OnPossess', 'PossessedBy', 'SetPawn', 'UnPossess', 'AttachToPawn'],
      explanation:
        '`Possess` is the public, non-virtual entry point; it releases the old pawn and links the new one. Controllers react by overriding the virtual `OnPossess`. `PossessedBy` is the matching hook on the **pawn** side, so overriding it in a controller would not compile, and `SetPawn` is a low-level setter that skips the possession logic.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'How a pawn gets its controller',
      blocks: [
        {
          type: 'p',
          text: 'Most pawns never call `Possess` themselves. The engine connects controllers to pawns in four standard ways:',
        },
        {
          type: 'table',
          headers: ['Mechanism', 'Who uses it', 'How'],
          rows: [
            ['`DefaultPawnClass`', 'Players, normally', 'The GameMode\'s `RestartPlayer` spawns this class at a PlayerStart and the player\'s controller possesses it.'],
            ['`AutoPossessPlayer`', 'A pawn placed in the level for a specific local player', 'Set on the pawn; player N\'s controller possesses it when the game starts. Handy for test maps.'],
            ['`AutoPossessAI` + `AIControllerClass`', 'AI pawns', 'The pawn spawns its own controller of `AIControllerClass` and is possessed by it.'],
            ['Manual `Possess`', 'Vehicles, turrets, spectating, mind control', 'Server code calls `Possess` when gameplay demands it.'],
          ],
        },
        {
          type: 'code',
          title: 'Zombie.cpp',
          code: `AZombie::AZombie() {
    AIControllerClass = AZombieAIController::StaticClass();
    AutoPossessAI = EAutoPossessAI::PlacedInWorldOrSpawned;
}

ATestDummy::ATestDummy() {
    AutoPossessPlayer = EAutoReceiveInput::Player0;
}`,
          annotations: [
            { lines: 2, text: 'Which brain to create. In a real project, a Blueprint child often picks a Blueprint AI controller here instead.' },
            { lines: 3, text: 'When to create it. The default is `PlacedInWorld`: zombies placed in the level get a brain, but zombies **spawned** at run time do not.' },
            { lines: 7, text: 'The first local player takes over this pawn at start-up. Usually set in the Details panel of a placed pawn rather than in C++.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Spawned AI that stands still',
          text: 'Because `AutoPossessAI` defaults to `PlacedInWorld`, enemies created with `SpawnActor` get no AI controller and simply stand there. Set it to `PlacedInWorldOrSpawned`, or call `SpawnDefaultController()` on the pawn after spawning it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'order',
      prompt: 'A player joins a game that uses `DefaultPawnClass`. Put the events in order, from login to controlling a character.',
      linesAreCode: false,
      lines: [
        'The player\'s PlayerController is created during login',
        'The GameMode chooses a PlayerStart',
        'The GameMode spawns `DefaultPawnClass` at that PlayerStart',
        'The controller possesses the new pawn',
        'The player\'s input now drives the pawn',
      ],
      distractors: ['The pawn creates its own PlayerController in its constructor'],
      explanation:
        'The controller comes first and outlives any pawn. `RestartPlayer` then chooses a start point, spawns the default pawn and possesses it; only after possession does the player\'s input reach that body. Pawns never create player controllers: those belong to the player\'s connection and are created by the GameMode at login.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'bug',
      prompt: 'Zombies placed in the level chase the player, but zombies created by the spawner just stand still. Tap the line responsible.',
      code: `AZombie::AZombie() {
    AIControllerClass = AZombieAIController::StaticClass();
    AutoPossessAI = EAutoPossessAI::PlacedInWorld;
}

void AZombieSpawner::SpawnZombie() {
    GetWorld()->SpawnActor<AZombie>(ZombieClass,
        GetActorTransform());
}`,
      bugLines: [3],
      hint: 'Which zombies are allowed to receive a brain automatically?',
      explanation:
        '`PlacedInWorld` only gives an AI controller to zombies saved in the level. Spawned zombies have no controller, so no AI runs and they never move. Use `EAutoPossessAI::PlacedInWorldOrSpawned`, or call `SpawnDefaultController()` on the spawned pawn. Since `PlacedInWorld` is also the engine default, deleting line 3 would not fix it.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'ACharacter: a pawn that walks',
      blocks: [
        {
          type: 'p',
          text: '[[character|ACharacter]] is an `APawn` subclass built for anything that walks, runs, jumps, crouches, swims or falls. It comes with three components already created, and you configure them in your constructor.',
        },
        {
          type: 'list',
          items: [
            '**`UCapsuleComponent`** (the root): the collision shape used for movement. It always stays upright.',
            '**`USkeletalMeshComponent`** (`GetMesh()`): the animated visual body, attached to the capsule.',
            '**[[character-movement-component|UCharacterMovementComponent]]** (`GetCharacterMovement()`): walking on slopes, stepping up stairs, jumping, falling, swimming, flying and custom modes, with built-in network prediction.',
          ],
        },
        {
          type: 'code',
          title: 'ArenaCharacter.cpp',
          code: `#include "ArenaCharacter.h"
#include "Components/CapsuleComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "GameFramework/CharacterMovementComponent.h"

AArenaCharacter::AArenaCharacter() {
    GetCapsuleComponent()->InitCapsuleSize(42.f, 96.f);

    GetMesh()->SetRelativeLocationAndRotation(
        FVector(0.f, 0.f, -96.f), FRotator(0.f, -90.f, 0.f));

    UCharacterMovementComponent* Move = GetCharacterMovement();
    Move->MaxWalkSpeed = 500.f;
    Move->JumpZVelocity = 700.f;
    Move->bOrientRotationToMovement = true;
    Move->RotationRate = FRotator(0.f, 500.f, 0.f);

    bUseControllerRotationYaw = false;
}`,
          annotations: [
            { lines: 7, text: 'Radius and **half**-height in centimetres. A 96 cm half-height makes a capsule 1.92 m tall.' },
            { lines: '9-10', text: 'Move the mesh down by the half-height so its feet touch the bottom of the capsule, and rotate it because skeletal meshes are typically authored facing +Y while Unreal\'s forward axis is +X.' },
            { lines: '13-14', text: 'Speeds in cm/s. These are the numbers designers will want to tune per character in a Blueprint child.' },
            { lines: '15-16', text: 'Turn the character to face the direction it moves, at up to 500 degrees per second around the vertical axis.' },
            { lines: 18, text: 'Don\'t snap the body to the controller\'s yaw; the movement component handles facing. The camera lesson explains how this pairs with an orbiting camera.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a capsule?',
          text: 'A capsule has a rounded bottom, so it slides smoothly over small steps and slope edges instead of snagging on them, and it looks the same from every horizontal direction, so turning never changes the collision. The movement component moves the character by **sweeping** this capsule through the world, which is cheap for such a simple shape. Detailed per-bone collision (for hit detection) lives on the mesh, not on the capsule.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Rich, but not free',
          text: 'The character movement component does a lot every frame: floor checks, sweeps, slope and step logic, and network prediction with server corrections. That is exactly what a player character needs, but hundreds of simultaneous characters can become expensive. Crowds and large unit counts often use lighter pawns or specialised systems.',
        },
        {
          type: 'deepdive',
          title: 'Movement modes and network prediction',
          blocks: [
            {
              type: 'p',
              text: 'The movement component is a state machine over **movement modes**: `MOVE_Walking`, `MOVE_Falling`, `MOVE_Swimming`, `MOVE_Flying`, `MOVE_NavWalking` and `MOVE_Custom`. Each mode has its own physics rules; walking off a ledge switches to falling, entering a water volume switches to swimming, and `SetMovementMode` lets you switch explicitly (for a jetpack or a ladder).',
            },
            {
              type: 'p',
              text: 'In multiplayer, the owning client moves its character **immediately** (client-side prediction) and sends each move to the server, which simulates it again. If the results disagree, the server sends a correction and the client replays the moves the server has not yet confirmed. That is why player characters should be moved through the movement component (`AddMovementInput`, `LaunchCharacter`, movement modes) rather than by setting the actor\'s location directly: moving behind the component\'s back produces corrections that players see as rubber-banding.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Select **every** component that `ACharacter` creates for you.',
      options: [
        {
          text: '`UCapsuleComponent` as the root',
          correct: true,
          why: 'The upright collision shape the movement component sweeps. You resize it; you cannot replace it as root.',
        },
        {
          text: '`USkeletalMeshComponent` for the animated body',
          correct: true,
          why: 'Accessed with `GetMesh()`; you assign the mesh asset and animation, typically in a Blueprint child.',
        },
        {
          text: '`UCharacterMovementComponent`',
          correct: true,
          why: 'Accessed with `GetCharacterMovement()`; it is the reason to use `ACharacter` at all.',
        },
        {
          text: '`UCameraComponent`',
          why: 'Cameras are not part of `ACharacter`; AI characters do not need one. You add a camera yourself (next lesson).',
        },
        {
          text: '`USpringArmComponent`',
          why: 'Also added by you, for third-person cameras. Epic\'s templates create it in their own character class, not in `ACharacter`.',
        },
      ],
      explanation:
        '`ACharacter` provides exactly what every walking creature needs, player or AI: collision, an animated body and movement. Anything player-specific, such as cameras, is added in your subclass, which keeps `ACharacter` equally useful for NPCs.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'PlayerController versus AIController',
      blocks: [
        {
          type: 'p',
          text: 'Both derive from `AController` and both can possess any pawn. They differ in where their decisions come from and where they exist.',
        },
        {
          type: 'table',
          headers: ['Aspect', 'APlayerController', '[[ai-controller|AAIController]]'],
          rows: [
            ['Decisions come from', 'A human\'s input', 'Code: behaviour trees, state machines, perception'],
            ['How many', 'One per human player', 'Usually one per AI pawn'],
            ['Exists on', 'Server and the owning client', 'Server only'],
            ['Owns', 'Camera manager, HUD, input, the player\'s network connection', 'Path following, behaviour tree and blackboard components'],
            ['Module', '`Engine`', '`AIModule` (add it to `Build.cs`)'],
          ],
        },
        {
          type: 'code',
          title: 'ZombieAIController.cpp',
          code: `#include "ZombieAIController.h"
#include "Kismet/GameplayStatics.h"

void AZombieAIController::OnPossess(APawn* InPawn) {
    Super::OnPossess(InPawn);
    if (APawn* Player =
            UGameplayStatics::GetPlayerPawn(this, 0)) {
        MoveToActor(Player, 150.f);
    }
}`,
          annotations: [
            { lines: 4, text: 'The same `OnPossess` hook a player controller uses: possession works identically for both kinds of brain.' },
            { lines: 8, text: 'Asks the path-following system to walk the pawn to within 150 cm of the player. It needs a navigation mesh in the level (a *Nav Mesh Bounds Volume*). Real AI would use a behaviour tree instead of a single command.' },
          ],
        },
        {
          type: 'code',
          lang: 'csharp',
          title: 'MyGame.Build.cs',
          code: `PublicDependencyModuleNames.AddRange(new string[] {
    "Core", "CoreUObject", "Engine", "InputCore",
    "EnhancedInput", "AIModule"
});`,
          annotations: [
            { lines: 3, text: 'Without `AIModule`, any reference to `AAIController` fails at link time with unresolved external symbols.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Write pawns that don\'t care who drives',
          text: 'Give your pawn verbs (`StartFiring()`, `Jump()`, `AddMovementInput()`) and let controllers call them. Then the same `BP_Soldier` works for the player, for AI, and for a replay system, with no "if player then…" branches.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: 'Which statement about `AAIController` is true?',
      options: [
        {
          text: 'Each client has a copy, so AI can react instantly to local input',
          why: 'AI controllers have no owning client connection and exist only on the server; clients just see the replicated pawn moving.',
        },
        {
          text: 'It can only possess pawns derived from `ACharacter`',
          why: 'Any `APawn` can be possessed by an AI controller: a turret pawn or a drone works just as well as a character.',
        },
        {
          text: 'It exists only on the server and can possess the same pawn classes a PlayerController can',
          correct: true,
          why: 'Right. Decisions are made on the server with authority, and any pawn class can be driven by either kind of controller.',
        },
        {
          text: 'It lives in the core `Engine` module, so no `Build.cs` change is ever needed',
          why: 'It lives in `AIModule`, which you must add to your module\'s dependencies before you can use it from C++.',
        },
      ],
      explanation:
        'AI runs where the authority is, on the server, and its results reach clients through ordinary pawn replication. Because possession is generic, designing pawns that respond to any controller lets you swap AI and human control freely.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Choosing a base class: Character, Pawn or Actor',
      blocks: [
        {
          type: 'p',
          text: 'Two questions decide the base class. **Does anything ever control it?** If not, it is an `AActor`. **Does it walk like a creature?** If so, `ACharacter`; otherwise an `APawn` with the movement that fits.',
        },
        {
          type: 'table',
          headers: ['Thing', 'Base class', 'Why'],
          rows: [
            ['Humanoid player or NPC: walks, jumps, swims', '`ACharacter`', 'The character movement component does it all, networked'],
            ['Car, tank, hover bike', '`APawn` subclass, e.g. `AWheeledVehiclePawn` from the Chaos Vehicles plugin', 'Physics-driven vehicle movement; an upright capsule makes no sense'],
            ['Flying drone, free camera, spectator', '`APawn` + `UFloatingPawnMovement`', 'Simple 3D movement without gravity or floor logic'],
            ['Turret aimed by AI or taken over by a player', '`APawn`, no movement component', 'Needs a controller, never walks'],
            ['Trap or turret that only reacts to triggers', '`AActor`', 'Never controlled, so possession would be pure overhead'],
            ['Hundreds of RTS units or a crowd', 'Lightweight `APawn` or a specialised system', 'Per-character movement cost adds up quickly'],
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Bridging back to C++',
          text: 'This is the classic "is-a" test from the inheritance unit. A tank *is a* pawn (something controllable) but *is not a* character (it does not walk on legs). Choosing `ACharacter` for a tank would inherit a capsule and walking logic you would then have to fight, the Unreal version of a bad inheritance hierarchy.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'A stationary defence turret should be driven by an AI controller\'s behaviour tree, and in one mission the player can take control of it. Which base class fits best?',
      options: [
        {
          text: '`ACharacter`',
          why: 'You would inherit a capsule root, a skeletal mesh setup and walking logic the turret never uses, plus their per-frame cost.',
        },
        {
          text: '`AActor`',
          why: 'Actors cannot be possessed, so neither the AI controller nor the player could take control.',
        },
        {
          text: '`APawn`',
          correct: true,
          why: 'It must be possessable by both AI and player controllers, but it never walks, so a plain pawn with its own components is ideal.',
        },
        {
          text: '`APlayerController`',
          why: 'A controller is a brain, not a body in the world. The turret is the body that controllers possess.',
        },
      ],
      explanation:
        'Being controlled is what makes something a pawn; walking is what makes it a character. A turret needs the first but not the second. If it never needed a controller at all, a plain `AActor` would be lighter still.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'truefalse',
      prompt: 'To run code whenever your controller takes over a pawn, override `Possess()` in your controller class.',
      answer: false,
      explanation:
        'Since UE 4.22, `Possess` and `UnPossess` are non-virtual: they perform authority checks and ownership bookkeeping, then call the virtual `OnPossess` and `OnUnPossess`. Override those in the controller (calling `Super` first), or `PossessedBy` / `UnPossessed` on the pawn side.',
    },
  ],
  takeaways: [
    'A pawn is an actor that can be possessed; a controller is the brain (player or AI) that drives it. Separating them lets bodies change while the player\'s controller persists.',
    'Call `Possess` / `UnPossess` on the server; react by overriding `OnPossess` / `OnUnPossess` on the controller or `PossessedBy` / `UnPossessed` on the pawn.',
    'Pawns get controllers through the GameMode\'s `DefaultPawnClass`, `AutoPossessPlayer`, `AutoPossessAI` with `AIControllerClass`, or manual possession. Spawned AI needs `PlacedInWorldOrSpawned`.',
    '`ACharacter` adds a capsule root, a skeletal mesh and the character movement component, configured in your constructor.',
    'AI controllers exist only on the server and live in `AIModule`; player controllers exist on the server and the owning client.',
    'Use `ACharacter` for things that walk, `APawn` for other controllable things (vehicles, drones, turrets) and `AActor` when nothing ever controls it.',
  ],
  reading: [
    {
      title: 'Gameplay Framework',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine',
      source: 'unreal-docs',
      note: 'See the Pawn, Character and Controller sections for Epic\'s description of the brain/body split.',
    },
    {
      title: 'Game Mode and Game State',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/game-mode-and-game-state-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Explains `DefaultPawnClass` and how the GameMode spawns and restarts players.',
    },
    {
      title: 'Unreal Engine C++ Complete Guide',
      url: 'https://www.tomlooman.com/unreal-engine-cpp-guide/',
      source: 'article',
      note: 'Practical notes on characters, controllers and possession in C++ projects.',
    },
  ],
};
