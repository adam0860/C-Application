import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-player-controller',
  title: 'PlayerController, HUD and Cameras',
  summary: 'The player\'s persistent will: where input belongs, how HUD widgets get on screen, how cameras follow a character, and how input modes work.',
  minutes: 18,
  objectives: [
    'Describe what the PlayerController owns and why it persists when pawns change',
    'Decide whether an input action belongs on the pawn or on the PlayerController',
    'Create and show a UMG widget from C++ safely, only for local players',
    'Build a third-person camera from a spring arm and a camera component in a character constructor',
    'Use the PlayerCameraManager, view targets, mouse cursor and input modes',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The PlayerController: the player\'s will',
      blocks: [
        {
          type: 'p',
          text: 'The [[player-controller]] represents a human player inside the game world. Pawns come and go as characters die, respawn or climb into vehicles, but the PlayerController stays for as long as the player is connected. That makes it the natural owner of everything tied to the *player* rather than to a *body*.',
        },
        {
          type: 'list',
          items: [
            '**Input**: it receives the player\'s input first and routes it to bindings on itself and on its pawn.',
            '**Camera**: it owns the `PlayerCameraManager`, which decides what the player sees each frame.',
            '**HUD**: it owns the player\'s [[hud|AHUD]] and is the owner of their UI widgets.',
            '**Network connection**: on a server it stands for one client\'s connection; it exists only on the server and that player\'s own machine.',
          ],
        },
        {
          type: 'code',
          title: 'ArenaPlayerController.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "ArenaPlayerController.generated.h"

class UInputAction;
class UUserWidget;

UCLASS()
class MYGAME_API AArenaPlayerController
    : public APlayerController {
    GENERATED_BODY()

protected:
    virtual void BeginPlay() override;
    virtual void SetupInputComponent() override;

    void TogglePauseMenu();

    UPROPERTY(EditDefaultsOnly, Category = "Input")
    TObjectPtr<UInputAction> PauseAction;

    UPROPERTY(EditDefaultsOnly, Category = "UI")
    TSubclassOf<UUserWidget> HUDWidgetClass;

    UPROPERTY(Transient)
    TObjectPtr<UUserWidget> HUDWidget;
};`,
          annotations: [
            { lines: '16-17', text: '`BeginPlay` is where the HUD gets created; `SetupInputComponent` is the controller\'s place to bind its own input.' },
            { lines: '21-22', text: 'An [[input-action]] asset chosen in the Blueprint child. The input unit covers Enhanced Input fully.' },
            { lines: '24-25', text: 'Designers pick the widget Blueprint, exactly the `TSubclassOf` pattern from the workflow lesson.' },
            { lines: '27-28', text: 'The created widget. `UPROPERTY` keeps it visible to the garbage collector; `Transient` because a live widget is never saved.' },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'The gamepad, not the hero',
          text: 'Think of the PlayerController as the gamepad in the player\'s hands and the pawn as the hero on screen. When the hero dies, you do not throw away the gamepad: you plug it into the next hero.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      multi: true,
      prompt: 'A player\'s character dies and is destroyed; a new one will spawn in five seconds. Select **every** object that still exists during those five seconds.',
      options: [
        {
          text: 'The player\'s PlayerController',
          correct: true,
          why: 'It lives as long as the player is connected; it simply has no pawn for a while.',
        },
        {
          text: 'The player\'s PlayerState',
          correct: true,
          why: 'Per-player stats survive death, which is exactly why they live there.',
        },
        {
          text: 'The camera component attached to the dead character',
          why: 'Components are destroyed with their actor. During the gap the camera manager keeps showing the last view or a view target you choose, such as a death cam.',
        },
        {
          text: 'The dead character\'s movement component',
          why: 'It belonged to the destroyed character. The new character gets a new one.',
        },
      ],
      explanation:
        'Anything owned by the pawn dies with the pawn; anything owned by the player (controller, player state, HUD, settings) survives. That lifetime difference is the main reason to choose carefully where each piece of data and logic lives.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Where should input be handled?',
      blocks: [
        {
          type: 'p',
          text: 'Both the pawn (`SetupPlayerInputComponent`) and the controller (`SetupInputComponent`) can bind input. Neither is "correct"; they suit different actions.',
        },
        {
          type: 'table',
          headers: ['Bind on the pawn when…', 'Bind on the PlayerController when…'],
          rows: [
            ['the action only makes sense for this kind of body: jump, crouch, accelerate, fire this weapon', 'the action belongs to the player regardless of body: pause, scoreboard, map, chat, screenshot'],
            ['a different pawn should respond differently (a car "jumps" by using nitro)', 'it must work while dead, spectating or between pawns'],
            ['the bindings should switch automatically on possession', 'it should not be duplicated in every pawn class'],
          ],
        },
        {
          type: 'code',
          title: 'ArenaPlayerController.cpp',
          code: `#include "EnhancedInputComponent.h"

void AArenaPlayerController::SetupInputComponent() {
    Super::SetupInputComponent();
    if (UEnhancedInputComponent* EIC =
            Cast<UEnhancedInputComponent>(InputComponent)) {
        EIC->BindAction(PauseAction, ETriggerEvent::Started,
            this, &AArenaPlayerController::TogglePauseMenu);
    }
}`,
          annotations: [
            { lines: 4, text: 'Let the base class create the input component first.' },
            { lines: '5-6', text: 'With Enhanced Input enabled (the UE5 default), the controller\'s input component is a `UEnhancedInputComponent`.' },
            { lines: '7-8', text: 'Pause works whether the player is alive, dead or driving: a controller-level action. The input unit explains bindings and trigger events in detail.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why pawn-specific input lives on the pawn',
          text: 'When the controller possesses a pawn, the pawn\'s input bindings are pushed onto the controller\'s input stack; when it unpossesses, they are removed. So "space" can mean *jump* while on foot and *handbrake* in a car with no switching code anywhere. Putting every action on the controller would force it to ask "what am I driving?" before each one.',
        },
        {
          type: 'deepdive',
          title: 'The input stack',
          blocks: [
            {
              type: 'p',
              text: 'Each frame, the PlayerController processes input components as a stack. Epic\'s documentation gives the order: actors that have had input enabled (most recently enabled first), then the PlayerController itself, then the Level Blueprint, then the possessed pawn. A binding can **consume** its input so components further down never see it, which is how a controller-level menu binding can stop the pawn from also reacting to the same key.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: 'Where should you bind the input action that opens the pause menu?',
      options: [
        {
          text: 'In the character\'s `SetupPlayerInputComponent`',
          why: 'It would stop working while the player is dead or driving a vehicle, and every pawn class would need its own copy.',
        },
        {
          text: 'In the PlayerController\'s `SetupInputComponent`',
          correct: true,
          why: 'Pausing belongs to the player, not the body. The controller exists whatever (or whether) the player is possessing.',
        },
        {
          text: 'In the GameMode',
          why: 'The GameMode exists only on the server and has no input component for a particular player.',
        },
        {
          text: 'In the GameState',
          why: 'The GameState is replicated match data, not an input handler for one player.',
        },
      ],
      explanation:
        'A simple test: "should this action still work if the player had no pawn right now?" If yes, bind it on the PlayerController. If it depends on the body (jump, fire, accelerate), bind it on the pawn.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'HUD and UMG widgets',
      blocks: [
        {
          type: 'p',
          text: 'Unreal has two layers of HUD technology. `AHUD` is an actor the GameMode creates for each local player (from its `HUDClass`); its `DrawHUD` function can draw directly on a canvas, which today is mostly used for debug overlays. Real game UI is built with [[umg]]: widget Blueprints derived from `UUserWidget`, laid out visually by designers.',
        },
        {
          type: 'code',
          title: 'ArenaPlayerController.cpp',
          code: `#include "Blueprint/UserWidget.h"

void AArenaPlayerController::BeginPlay() {
    Super::BeginPlay();
    if (!IsLocalController() || !HUDWidgetClass) {
        return;
    }
    HUDWidget = CreateWidget<UUserWidget>(this, HUDWidgetClass);
    if (HUDWidget) {
        HUDWidget->AddToViewport();
    }
}`,
          annotations: [
            { lines: 5, text: 'The crucial check. On a server, `BeginPlay` also runs for every **remote** player\'s controller, and those players\' screens are on other machines.' },
            { lines: 8, text: '`CreateWidget` instantiates the designer\'s widget Blueprint, owned by this player. It returns `nullptr` if it cannot (for example for a non-local controller).' },
            { lines: 10, text: 'Puts the widget on this player\'s screen. `RemoveFromParent()` takes it off again.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Widgets are local only',
          text: 'UI exists only on the machine whose screen it is drawn on. Creating a widget for a non-local PlayerController fails with a message that only local player controllers can be assigned to widgets, and the returned `nullptr` crashes the next line that uses it. Guard with `IsLocalController()`, or create widgets from `AHUD`, which only exists for local players.',
        },
        {
          type: 'p',
          text: 'Using UMG from C++ requires the `UMG` module in your `Build.cs` dependencies (add `Slate` and `SlateCore` too if you work with Slate types directly).',
        },
        {
          type: 'deepdive',
          title: 'C++ widget bases with BindWidget',
          blocks: [
            {
              type: 'p',
              text: 'The workflow lesson\'s pattern applies to UI too: logic in a C++ `UUserWidget` subclass, layout in a widget Blueprint derived from it. The `BindWidget` metadata links a C++ pointer to the designer\'s widget with the same name.',
            },
            {
              type: 'code',
              title: 'ArenaHUDWidget.h',
              code: `UCLASS(Abstract)
class MYGAME_API UArenaHUDWidget : public UUserWidget {
    GENERATED_BODY()

public:
    void SetHealthPercent(float Percent);

protected:
    UPROPERTY(meta = (BindWidget))
    TObjectPtr<UProgressBar> HealthBar;
};`,
              annotations: [
                { lines: '9-10', text: 'The widget Blueprint must contain a progress bar named exactly `HealthBar`, or it fails to compile with a clear error. C++ can then call `HealthBar->SetPercent(...)` without searching for it.' },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'bug',
      prompt: 'This HUD code works in single-player, but a listen-server host crashes as soon as a second player joins. Tap the line(s) at fault.',
      code: `void AArenaPlayerController::BeginPlay() {
    Super::BeginPlay();
    HUDWidget = CreateWidget<UUserWidget>(this, HUDWidgetClass);
    HUDWidget->AddToViewport();
}`,
      bugLines: [3, 4],
      hint: 'On the host, `BeginPlay` also runs for the controller of the player who just joined.',
      explanation:
        'When the second player joins, the host\'s machine spawns that player\'s PlayerController and runs its `BeginPlay`. That controller is not local to the host, so `CreateWidget` refuses and returns `nullptr`, and line 4 dereferences it. Check `IsLocalController()` (and that `HUDWidgetClass` is set) before creating the widget, and null-check the result before calling `AddToViewport()`.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'A third-person camera: spring arm plus camera',
      blocks: [
        {
          type: 'p',
          text: 'A third-person camera is built from two components on the character: a [[spring-arm-component]] (the "camera boom") that holds a point at a distance behind the character, and a [[camera-component]] attached to the end of that arm.',
        },
        {
          type: 'code',
          title: 'ArenaCharacter.cpp',
          code: `#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"

AArenaCharacter::AArenaCharacter() {
    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(
        TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(RootComponent);
    CameraBoom->TargetArmLength = 400.f;
    CameraBoom->bUsePawnControlRotation = true;
    CameraBoom->bEnableCameraLag = true;
    CameraBoom->CameraLagSpeed = 10.f;

    FollowCamera = CreateDefaultSubobject<UCameraComponent>(
        TEXT("FollowCamera"));
    FollowCamera->SetupAttachment(CameraBoom,
        USpringArmComponent::SocketName);
    FollowCamera->bUsePawnControlRotation = false;
}`,
          annotations: [
            { lines: '5-7', text: 'Attached to the capsule. Both pointers are declared in the header as `VisibleAnywhere, BlueprintReadOnly` (with `AllowPrivateAccess` if private), as in the previous unit.' },
            { lines: 8, text: 'Distance behind the character in centimetres. If a wall gets in the way, the arm\'s built-in collision test (`bDoCollisionTest`, on by default) shortens it so the camera never clips through.' },
            { lines: 9, text: 'The arm rotates to match the controller\'s **control rotation**, so looking around orbits the camera around the character.' },
            { lines: '10-11', text: 'Optional smoothing: the camera trails slightly behind fast movement instead of being rigidly attached.' },
            { lines: '15-16', text: 'Attach to the arm\'s end point. `SocketName` is a named attachment point the spring arm provides.' },
            { lines: 17, text: 'The camera does not rotate on its own; it inherits the arm\'s rotation.' },
          ],
        },
        {
          type: 'definition',
          term: 'Control rotation',
          text: 'A rotation stored on the controller that represents where the player is **looking** (or aiming), independent of which way the pawn\'s body faces. Look input (`AddControllerYawInput` / `AddControllerPitchInput` on the pawn) changes it; cameras, spring arms and aiming code read it.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why rotate the arm, not the character?',
          text: 'Separating *where I look* (control rotation, applied to the arm) from *where my body faces* (`bOrientRotationToMovement` on the movement component, from the previous lesson) gives the familiar third-person feel: you can swing the camera around to look at your character\'s face while they stand still, and the body turns smoothly toward wherever you walk. That is also why the character set `bUseControllerRotationYaw = false`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'First-person instead',
          text: 'For a first-person camera, skip the spring arm: attach the camera to the capsule (or the head of the mesh) at eye height and set `bUsePawnControlRotation = true` on the **camera** itself, so it pitches and yaws with the player\'s view.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: 'Complete the third-person camera setup: the camera sits at the end of the boom, and the boom orbits with the player\'s view.',
      template: `CameraBoom->SetupAttachment(RootComponent);
CameraBoom->___ = true;

FollowCamera->SetupAttachment(CameraBoom,
    USpringArmComponent::___);`,
      blanks: [{ answers: ['bUsePawnControlRotation'] }, { answers: ['SocketName'] }],
      wordBank: ['bUsePawnControlRotation', 'SocketName', 'bUseControllerRotationYaw', 'bOrientRotationToMovement', 'RootComponent', 'TargetArmLength'],
      explanation:
        '`bUsePawnControlRotation` makes the spring arm follow the controller\'s control rotation, so look input orbits the camera. `USpringArmComponent::SocketName` is the arm\'s end point, where the camera attaches. `bUseControllerRotationYaw` is a pawn setting that would snap the whole character to the view, and `bOrientRotationToMovement` belongs to the movement component.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'PlayerCameraManager and view targets',
      blocks: [
        {
          type: 'p',
          text: 'Camera components do not render anything by themselves. Each frame, the PlayerController\'s [[player-camera-manager]] decides the final point of view. It asks the current **view target** (normally the possessed pawn) for its view; an actor answers with its first active camera component. The manager then layers on camera shakes, fades, post-processing and pitch limits.',
        },
        {
          type: 'code',
          title: 'ArenaPlayerController.cpp',
          code: `void AArenaPlayerController::ShowSecurityCamera(
    AActor* CameraActor) {
    SetViewTargetWithBlend(CameraActor, 1.5f, VTBlend_Cubic);
}

void AArenaPlayerController::ReturnToPawn() {
    SetViewTargetWithBlend(GetPawn(), 0.5f);
}

void AArenaPlayerController::PlayHitShake() {
    if (PlayerCameraManager && HitShakeClass) {
        PlayerCameraManager->StartCameraShake(HitShakeClass);
    }
}`,
          annotations: [
            { lines: 3, text: 'Smoothly moves the view to another actor over 1.5 seconds. The controller still possesses its pawn, so input still drives the character.' },
            { lines: 7, text: 'Blend back to the pawn\'s own camera.' },
            { lines: '11-12', text: '`HitShakeClass` is a `TSubclassOf<UCameraShakeBase>` property, so designers author the shake asset. Shakes are applied by the manager on top of whatever view is active.' },
          ],
        },
        {
          type: 'list',
          items: [
            'Death cams, cutscenes, security cameras and kill replays are all view-target changes; none of them require possessing anything.',
            'For custom camera behaviour (limits, special modes), subclass `APlayerCameraManager` and assign it with `PlayerCameraManagerClass` in your controller\'s constructor. Its `ViewPitchMin` / `ViewPitchMax` limit how far the player can look down or up.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a manager between camera and screen?',
          text: 'Many systems want a say in what the player sees: the pawn\'s camera, a cutscene, a hit reaction, a fade to black, a pause-menu blur. If each wrote directly to "the camera", they would fight. The camera manager is the single place where those requests are combined in a defined order, which is why shakes and fades keep working no matter which actor is the view target.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'truefalse',
      prompt: 'Calling `SetViewTargetWithBlend(SecurityCamera, 1.f)` makes the PlayerController possess the security camera actor.',
      answer: false,
      explanation:
        'View target and possession are independent. The view target only decides whose camera the player looks through; the controller keeps possessing its pawn, so movement input still goes to the character. That is exactly what you want for a security monitor or a cinematic fly-by, and why you may also need to disable input while the alternate view is active.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'order',
      prompt: 'Put the steps of one frame of a third-person camera in order, from the player moving the mouse to the frame being drawn.',
      linesAreCode: false,
      lines: [
        'Look input calls `AddControllerYawInput`, updating the controller\'s control rotation',
        'The spring arm follows the control rotation and places its end socket, pulling in if a wall is in the way',
        'The camera component, attached at that socket, takes up its final position and rotation',
        'The PlayerCameraManager asks the view target (the pawn) for its view and finds that camera',
        'The manager applies shakes, fades and post-processing, and the frame is rendered from that view',
      ],
      explanation:
        'Input changes the control rotation; the spring arm turns that into a camera position (with collision); the camera component simply rides on the arm; and the camera manager reads the result, adds its own effects, and hands the final view to the renderer. Knowing this chain tells you where to intervene: input sensitivity at the first step, camera distance at the second, shakes at the last.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Mouse cursor and input modes',
      blocks: [
        {
          type: 'p',
          text: 'By default the game captures the mouse: the cursor is hidden and mouse movement turns the camera. Menus, inventories and top-down games need a visible cursor and different routing of input. Two controller settings work together:',
        },
        {
          type: 'table',
          headers: ['Input mode', 'Where input goes', 'Typical use'],
          rows: [
            ['`FInputModeGameOnly`', 'Only to the game (input components)', 'Normal gameplay'],
            ['`FInputModeUIOnly`', 'Only to UI widgets; game bindings receive nothing', 'Pause menu, inventory, dialogue choices'],
            ['`FInputModeGameAndUI`', 'UI first, then the game for anything UI did not handle', 'Top-down or strategy games with clickable HUDs'],
          ],
          caption: 'Pair the mode with `bShowMouseCursor` to show or hide the cursor.',
        },
        {
          type: 'code',
          title: 'ArenaPlayerController.cpp',
          code: `void AArenaPlayerController::OpenInventory() {
    if (!InventoryWidget) {
        return;
    }
    InventoryWidget->AddToViewport(10);
    FInputModeUIOnly Mode;
    Mode.SetWidgetToFocus(InventoryWidget->TakeWidget());
    Mode.SetLockMouseToViewportBehavior(
        EMouseLockMode::DoNotLock);
    SetInputMode(Mode);
    bShowMouseCursor = true;
}

void AArenaPlayerController::CloseInventory() {
    if (InventoryWidget) {
        InventoryWidget->RemoveFromParent();
    }
    SetInputMode(FInputModeGameOnly());
    bShowMouseCursor = false;
}`,
          annotations: [
            { lines: 5, text: 'The number is the Z-order: higher values draw on top of the HUD.' },
            { lines: '6-7', text: 'UI-only mode, with keyboard focus given to the inventory so it receives key presses. `TakeWidget()` returns the underlying Slate widget the input system works with.' },
            { lines: '10-11', text: 'Apply the mode and show the cursor: these two always change together.' },
            { lines: '18-19', text: 'Restore gameplay: input to the game, cursor hidden and captured again.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'UI-only means your game bindings go quiet',
          text: 'In `FInputModeUIOnly`, input actions bound on the controller or pawn do not fire, including the key you meant to use to *close* the inventory. The widget itself must handle closing (a button, or overriding key handling in the widget). Forgetting this is the classic "my menu opens but never closes" bug.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Pausing',
          text: '`SetPause(true)` on the controller pauses the game world (subject to the GameMode allowing it). Widgets keep working while paused, so a pause menu can still respond to clicks.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'After the inventory opens and the cursor appears, pressing W still walks the character around behind the menu. Which input mode should the inventory have set?',
      options: [
        {
          text: '`FInputModeGameAndUI`',
          why: 'This mode forwards anything the UI does not handle to the game, so unhandled keys like W still move the character. That is probably what is happening now.',
        },
        {
          text: '`FInputModeGameOnly`',
          why: 'This is normal gameplay mode: the UI would not even receive clicks properly.',
        },
        {
          text: '`FInputModeUIOnly`',
          correct: true,
          why: 'UI-only mode stops input from reaching game bindings entirely, so the character stays still while the menu is open.',
        },
        {
          text: 'No mode change; set `bShowMouseCursor = true` and the game input stops automatically',
          why: 'The cursor flag only controls visibility. Input routing is decided by the input mode.',
        },
      ],
      explanation:
        'Showing the cursor and routing input are separate decisions. Full-screen menus usually want `FInputModeUIOnly` plus a visible cursor, with the widget responsible for closing itself; HUD-style interfaces that coexist with play use `FInputModeGameAndUI`.',
    },
  ],
  takeaways: [
    'The PlayerController represents the player: it persists across pawns and owns input routing, the camera manager and the HUD. It exists on the server and the owning client only.',
    'Bind body-specific actions on the pawn (they switch automatically with possession) and player-level actions such as pause on the controller.',
    'Create UMG widgets with `CreateWidget` and `AddToViewport` only for local controllers; check `IsLocalController()` and null-check the result.',
    'A third-person camera is a spring arm with `bUsePawnControlRotation = true` plus a camera attached at `USpringArmComponent::SocketName`.',
    'The PlayerCameraManager combines the view target\'s camera with shakes, fades and limits; `SetViewTargetWithBlend` changes the view without changing possession.',
    'Input modes (`GameOnly`, `UIOnly`, `GameAndUI`) route input, and `bShowMouseCursor` shows the cursor; UI-only menus must close themselves.',
  ],
  reading: [
    {
      title: 'Gameplay Framework',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine',
      source: 'unreal-docs',
      note: 'See the PlayerController, HUD and camera sections for how they fit with the rest of the framework.',
    },
    {
      title: 'Enhanced Input',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine',
      source: 'unreal-docs',
      note: 'A preview of the next unit: input actions, mapping contexts and how they bind to controllers and pawns.',
    },
    {
      title: 'Unreal Engine C++ Complete Guide',
      url: 'https://www.tomlooman.com/unreal-engine-cpp-guide/',
      source: 'article',
      note: 'Practical C++ patterns for controllers, UI widgets and cameras.',
    },
  ],
};
