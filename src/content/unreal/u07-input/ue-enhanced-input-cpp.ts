import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-enhanced-input-cpp',
  title: 'Binding Enhanced Input in C++',
  summary:
    'Module dependency, asset properties, mapping-context registration and BindAction — wiring Enhanced Input into a C++ character, safely.',
  minutes: 17,
  objectives: [
    'Add the `EnhancedInput` module dependency and explain what breaks without it',
    'Declare `TObjectPtr<UInputAction>` and `TObjectPtr<UInputMappingContext>` properties designers can assign',
    'Register a mapping context with `UEnhancedInputLocalPlayerSubsystem` with the right null checks, at the right time',
    'Bind actions to member functions in `SetupPlayerInputComponent` with `CastChecked` and `BindAction`',
    'Read typed values from `FInputActionValue` in handler functions',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The plan: from assets to member functions',
      blocks: [
        {
          type: 'p',
          text: 'In the previous lesson you designed input as data: `IA_Move`, `IA_Look`, `IA_Jump` and a context `IMC_Default` that maps keys to them. None of that does anything until C++ (or Blueprint) connects it to a pawn. That connection has five pieces:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Depend on the module', text: 'Tell UnrealBuildTool your game module uses the `EnhancedInput` module.' },
            { title: 'Reference the assets', text: 'Give the character `UPROPERTY` slots for the context and actions, so designers can assign them.' },
            { title: 'Activate the context', text: 'Add `IMC_Default` to the local player\'s [[enhanced-input-subsystem]] when a player takes control of the pawn.' },
            { title: 'Bind the actions', text: 'In `SetupPlayerInputComponent`, bind each action and [[trigger-event]] to a member function.' },
            { title: 'Handle the values', text: 'Write handlers that read an `FInputActionValue` and turn it into gameplay.' },
          ],
        },
        {
          type: 'table',
          headers: ['Piece', 'Lives in', 'Runs'],
          rows: [
            ['Module dependency', '`MyGame.Build.cs`', 'At build time (UnrealBuildTool)'],
            ['Asset slots', '`MyCharacter.h`', 'Edited in the Blueprint child\'s Class Defaults'],
            ['Context registration', '`PawnClientRestart()`', 'Each time a local player possesses the pawn'],
            ['Bindings', '`SetupPlayerInputComponent()`', 'When the pawn\'s input component is created for a local player'],
            ['Handlers', '`Move()`, `Look()`…', 'Whenever the bound trigger event fires'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is activation separate from binding?',
          text: 'Bindings say "*if* `IA_Move` triggers, call `Move`". Contexts decide *whether keys reach* `IA_Move` at all. Keeping them apart is what lets you swap contexts (vehicle, menu) at run time without touching a single binding — and it is why forgetting either half produces the same symptom: nothing happens.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Step 1: the module dependency',
      blocks: [
        {
          type: 'p',
          text: 'Enhanced Input lives in its own [[ue-module]], `EnhancedInput`, which ships as an engine plugin (enabled by default in UE5 projects). To include its headers and link against its classes, your module must list it as a dependency in [[build-cs]]:',
        },
        {
          type: 'code',
          lang: 'csharp',
          title: 'MyGame.Build.cs',
          code: `using UnrealBuildTool;

public class MyGame : ModuleRules {
    public MyGame(ReadOnlyTargetRules Target) : base(Target) {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[] {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",
            "EnhancedInput"
        });
    }
}`,
          annotations: [
            { lines: 7, text: '**Public** dependencies are visible to modules that depend on yours. If only your `.cpp` files include Enhanced Input headers, `PrivateDependencyModuleNames` is enough; the UE5 templates use Public for simplicity.' },
            { lines: 11, text: '`InputCore` defines `FKey` and `EKeys` — still the vocabulary for physical keys.' },
            { lines: 12, text: 'The new line. It adds Enhanced Input\'s include paths and links its library into your module.' },
          ],
        },
        {
          type: 'p',
          text: 'After editing a `Build.cs`, regenerate project files (or let your IDE do it) and do a full build — [[live-coding]] cannot pick up new module dependencies.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why must you declare it at all?',
          text: 'This is the C++ course\'s compile-then-link model at engine scale. Each Unreal module is compiled separately and becomes its own library. Your compiler can only `#include` headers on the include path UnrealBuildTool gives it, and the [[linker]] can only resolve symbols from libraries it is told about. Declaring dependencies explicitly keeps build times and coupling under control in a codebase with hundreds of modules.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'You include `"EnhancedInputComponent.h"` in your character\'s `.cpp` but forgot to add `"EnhancedInput"` to `Build.cs`. What is the most likely result?',
      options: [
        {
          text: 'A build error: the header cannot be found, or (if it is found indirectly) unresolved external symbols at link time',
          correct: true,
          why: 'Without the dependency, the module\'s include path is not passed to the compiler, and its library is not passed to the linker. You get one of the two classic C++ build failures.',
        },
        {
          text: 'It builds, but input silently does nothing at run time',
          why: 'Silent failures at run time are usually missing contexts or unassigned assets. A missing module dependency fails much earlier — at build time.',
        },
        {
          text: 'Unreal adds the dependency automatically when it sees the include',
          why: 'UnrealBuildTool does not scan includes to infer dependencies. Module dependencies are always declared explicitly in `Build.cs`.',
        },
        {
          text: 'The editor crashes when the character spawns',
          why: 'Code that fails to build never reaches the editor. A crash on spawn would point to something like a failed `CastChecked`, covered later in this lesson.',
        },
      ],
      explanation:
        '`Build.cs` controls two things the C++ toolchain needs: where to find headers (compile step) and which libraries to link (link step). Missing the `EnhancedInput` entry typically shows up as "cannot open include file" or as unresolved externals such as `UEnhancedInputComponent::StaticClass` — both fixed by adding the module name and rebuilding.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Step 2: the character header',
      blocks: [
        {
          type: 'p',
          text: 'The character needs slots for the context and each action. These are pointers to assets, so they are `UPROPERTY` members using [[tobjectptr]]:',
        },
        {
          type: 'code',
          title: 'MyCharacter.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "MyCharacter.generated.h"

class UInputMappingContext;
class UInputAction;
struct FInputActionValue;

UCLASS()
class MYGAME_API AMyCharacter : public ACharacter {
    GENERATED_BODY()

public:
    AMyCharacter();
    virtual void PawnClientRestart() override;

protected:
    virtual void SetupPlayerInputComponent(
        UInputComponent* PlayerInputComponent) override;

    UPROPERTY(EditDefaultsOnly, Category = "Input")
    TObjectPtr<UInputMappingContext> DefaultMappingContext;

    UPROPERTY(EditDefaultsOnly, Category = "Input")
    TObjectPtr<UInputAction> MoveAction;

    UPROPERTY(EditDefaultsOnly, Category = "Input")
    TObjectPtr<UInputAction> LookAction;

    UPROPERTY(EditDefaultsOnly, Category = "Input")
    TObjectPtr<UInputAction> JumpAction;

private:
    void Move(const FInputActionValue& Value);
    void Look(const FInputActionValue& Value);
};`,
          annotations: [
            { lines: 5, text: 'The [[generated-header]] must be the **last** include: it contains code generated by UnrealHeaderTool that relies on everything above it being declared.' },
            { lines: '7-9', text: '[[forward-declaration|Forward declarations]] instead of includes. A header only needs to know these types *exist* to declare pointers and references to them, which keeps every file that includes `MyCharacter.h` compiling faster.' },
            { lines: 17, text: 'Called on the owning client when a player controller (re)possesses this pawn — where we will activate the mapping context.' },
            { lines: '20-21', text: 'The engine calls this to let a pawn bind its input. The parameter type is the base `UInputComponent*` because the signature predates Enhanced Input.' },
            { lines: '23-24', text: '`EditDefaultsOnly`: assignable per *class* (in the Blueprint\'s Class Defaults), not per placed instance — every `BP_MyCharacter` should use the same controls.' },
            { lines: '26-33', text: 'One slot per action. They start as `nullptr`; a designer fills them with `IA_Move`, `IA_Look` and `IA_Jump`.' },
            { lines: '36-37', text: 'Handlers take `const FInputActionValue&`. They are **not** `UFUNCTION`s — `BindAction` with a member-function pointer does not need reflection.' },
          ],
        },
        {
          type: 'p',
          text: 'Compile, then create a Blueprint child (`BP_MyCharacter`), open its **Class Defaults**, and assign the assets in the *Input* category. Set `BP_MyCharacter` as the Default Pawn Class in your GameMode so it is what you actually play.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not hard-code the asset paths in C++?',
          text: 'You *can* load assets in the constructor with `ConstructorHelpers::FObjectFinder` and a path string, but the path breaks silently when someone moves or renames the asset, and designers cannot swap in a different context without a programmer. A `UPROPERTY` slot is a [[hard-reference]] the editor tracks through renames, and it keeps the "which assets" decision in data where it belongs.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Why TObjectPtr?',
          text: 'In UE5, `TObjectPtr<T>` is the recommended type for `UObject` pointers stored in `UPROPERTY` members of headers. It behaves like a raw pointer in code, but in editor builds it adds access tracking and lazy-load support. The `UPROPERTY` is what makes the [[ue-garbage-collector|garbage collector]] see the reference.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'truefalse',
      prompt: 'A handler such as `void Move(const FInputActionValue& Value);` must be marked `UFUNCTION()` before you can pass it to `BindAction`.',
      answer: false,
      explanation:
        '`BindAction(Action, Event, this, &AMyCharacter::Move)` stores a *native* delegate bound through a C++ member-function pointer, so no reflection is involved and `UFUNCTION()` is not needed (the UE5 templates do not use it). You would only need `UFUNCTION()` to bind by function *name*, or to make the handler callable from Blueprint. Dynamic delegates are different — they *do* require `UFUNCTION`, as the delegates unit will show.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Step 3: activating the mapping context',
      blocks: [
        {
          type: 'p',
          text: 'Mapping contexts are activated on the [[enhanced-input-subsystem]], which belongs to the `ULocalPlayer` — the object representing one human player on this machine. From a pawn you reach it through its [[player-controller]]. Every link in that chain can legitimately be missing, so each one is checked:',
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp',
          code: `#include "MyCharacter.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "InputActionValue.h"
#include "Engine/LocalPlayer.h"
#include "GameFramework/PlayerController.h"

void AMyCharacter::PawnClientRestart() {
    Super::PawnClientRestart();

    APlayerController* PC = Cast<APlayerController>(GetController());
    if (!PC) {
        return;
    }

    UEnhancedInputLocalPlayerSubsystem* Input =
        ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(
            PC->GetLocalPlayer());
    if (!Input) {
        return;
    }

    if (!DefaultMappingContext) {
        UE_LOG(LogTemp, Warning,
            TEXT("%s has no DefaultMappingContext assigned"),
            *GetName());
        return;
    }

    Input->AddMappingContext(DefaultMappingContext, 0);
}`,
          annotations: [
            { lines: 3, text: 'Declares `UEnhancedInputLocalPlayerSubsystem`.' },
            { lines: 9, text: 'Always call `Super` first: the base implementation does important work, including creating the input component and calling `SetupPlayerInputComponent`.' },
            { lines: '11-14', text: 'The pawn may have no controller, or an AI controller. [[ue-cast|Cast]] returns `nullptr` rather than crashing when the type does not match.' },
            { lines: '16-18', text: 'A static helper that returns `nullptr` if the local player is null — as it is for remote players on a server. A dedicated server has no local players and no subsystem at all.' },
            { lines: '23-28', text: 'The designer may have forgotten to assign the asset. Logging turns a mysterious "input does nothing" into a clear message in the Output Log.' },
            { lines: 30, text: 'Priority `0` for the base context. Adding a context that is already active does not create a duplicate, so running this on every possession is harmless.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'BeginPlay',
            tone: 'neutral',
            text: 'Runs **once** per actor lifetime. Fine for a single-player prototype, where the pawn is usually possessed before play begins. But on a network client `BeginPlay` can run before the controller has replicated (so `GetController()` is null), and it does not run again when the pawn is re-possessed.',
          },
          right: {
            title: 'PawnClientRestart',
            tone: 'good',
            text: 'Runs on the **owning client each time** a player controller possesses the pawn — after possession, so the controller is known. This is the hook Epic\'s Enhanced Input documentation uses, and it works for single-player, listen servers and clients alike.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does the context live on the local player, not the pawn?',
          text: 'Contexts describe how *a human* is currently controlling the game, which outlives any one pawn: a player can die and respawn, switch characters, or drive a vehicle pawn. Storing contexts per local player means split-screen players have independent controls, and a respawned pawn does not have to rebuild everything — though re-adding is cheap and keeps the pawn self-contained.',
        },
        {
          type: 'callout',
          variant: 'tip',
          text: 'Some projects (including newer Epic templates) add contexts from a custom `APlayerController` instead, because the controller persists across pawns. Both are valid; pick one place per project and be consistent.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'bug',
      prompt: 'This character never responds to input, and no warning is logged. Tap the line that causes the problem.',
      code: `AMyCharacter::AMyCharacter() {
    PrimaryActorTick.bCanEverTick = false;
    bUseControllerRotationYaw = false;
    AddDefaultMappingContext();
}

void AMyCharacter::AddDefaultMappingContext() {
    APlayerController* PC = Cast<APlayerController>(GetController());
    if (!PC) {
        return;
    }
    auto* Input = ULocalPlayer::GetSubsystem<
        UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer());
    if (Input && DefaultMappingContext) {
        Input->AddMappingContext(DefaultMappingContext, 0);
    }
}`,
      bugLines: [4],
      hint: 'When does a constructor run, and what exists at that moment?',
      explanation:
        'The helper itself is fine; it is called from the **constructor**. Unreal constructors run for the [[cdo]] and while the actor is being spawned — long before any controller possesses it — so `GetController()` is null, the early `return` triggers, and the context is never added. (Even `DefaultMappingContext` would still be null there: Blueprint defaults are applied after the C++ constructor body.) Constructors are for setting defaults and creating components; call the helper from `PawnClientRestart()` after `Super::PawnClientRestart()`.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Step 4: binding actions',
      blocks: [
        {
          type: 'p',
          text: 'When a local player possesses the pawn, the engine creates an input component and calls `SetupPlayerInputComponent`. That is where you connect each action and trigger event to a member function:',
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp',
          code: `void AMyCharacter::SetupPlayerInputComponent(
        UInputComponent* PlayerInputComponent) {
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    UEnhancedInputComponent* Input =
        CastChecked<UEnhancedInputComponent>(PlayerInputComponent);

    Input->BindAction(MoveAction, ETriggerEvent::Triggered,
                      this, &AMyCharacter::Move);
    Input->BindAction(LookAction, ETriggerEvent::Triggered,
                      this, &AMyCharacter::Look);
    Input->BindAction(JumpAction, ETriggerEvent::Started,
                      this, &ACharacter::Jump);
    Input->BindAction(JumpAction, ETriggerEvent::Completed,
                      this, &ACharacter::StopJumping);
}`,
          annotations: [
            { lines: 3, text: '`ACharacter` does not bind anything itself, but calling `Super` keeps you safe if a parent class ever does.' },
            { lines: '5-6', text: 'The object is really a [[enhanced-input-component]] (Project Settings → Input → Default Input Component Class), but the parameter is typed as the base class. `CastChecked` converts it and **asserts** if the project is misconfigured.' },
            { lines: '8-9', text: 'Anatomy of a binding: *which action*, *which event*, *which object*, *which member function*. `Triggered` fires every frame the stick or key is held — right for continuous movement.' },
            { lines: '12-13', text: '`Started` fires once per press. `ACharacter::Jump` takes no parameters, which is one of the allowed handler signatures.' },
            { lines: '14-15', text: 'The same action bound a second time, to a different event. Releasing the key ends the jump input.' },
          ],
        },
        {
          type: 'table',
          headers: ['Handler signature', 'Use it when'],
          rows: [
            ['`void F()`', 'Only the event matters (Jump, Interact)'],
            ['`void F(const FInputActionValue& Value)`', 'You need the value (Move, Look, Zoom)'],
            ['`void F(const FInputActionInstance& Instance)`', 'You also need timing: `GetElapsedTime()`, `GetTriggeredTime()`, plus `GetValue()`'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why CastChecked rather than Cast?',
          text: '`Cast<T>` returns `nullptr` on failure, which you would then have to handle — and there is no sensible fallback: a project whose input component is not Enhanced cannot work. `CastChecked<T>` states the assumption and, in development builds, halts with a clear assertion message pointing at this line. Failing loudly at the cause beats a silent "input does nothing" bug hunt. (If you prefer not to assert, use `Cast` and log an error.)',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'An unassigned action fails silently',
          text: 'If `MoveAction` is still `nullptr` because nobody assigned `IA_Move` in the Blueprint, `BindAction` accepts it and the binding simply never fires. When one action "does nothing" while others work, check its slot in Class Defaults first.',
        },
        {
          type: 'deepdive',
          title: 'Who calls SetupPlayerInputComponent, and when?',
          blocks: [
            {
              type: 'p',
              text: 'When a player controller possesses a pawn, the owning client runs `APawn::PawnClientRestart`. If the pawn is locally controlled and has no input component yet, the base implementation creates one (`CreatePlayerInputComponent`, using the class from Project Settings), calls your `SetupPlayerInputComponent`, and registers the component so the player controller includes it when routing input. The component is destroyed when the pawn is unpossessed, so re-possession runs setup again.',
            },
            {
              type: 'p',
              text: 'AI-controlled pawns never get a player input component, so their `SetupPlayerInputComponent` is never called — another reason input handling belongs here and not in `BeginPlay`.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'fill',
      prompt: 'Complete the binding so a misconfigured project asserts immediately, movement runs every frame the stick is held, and the handler has the correct signature.',
      template: `UEnhancedInputComponent* Input =
    ___<UEnhancedInputComponent>(PlayerInputComponent);
Input->BindAction(MoveAction, ETriggerEvent::___,
                  this, &AMyCharacter::Move);

void AMyCharacter::Move(___ Value) {
    const FVector2D Axis = Value.Get<FVector2D>();
}`,
      blanks: [
        { answers: ['CastChecked'] },
        { answers: ['Triggered'] },
        { answers: ['const FInputActionValue&'] },
      ],
      wordBank: [
        'CastChecked',
        'Cast',
        'static_cast',
        'Triggered',
        'Started',
        'Completed',
        'const FInputActionValue&',
        'FInputActionValue*',
        'const FVector2D&',
      ],
      explanation:
        '`CastChecked` asserts on failure, unlike `Cast` (returns null) or `static_cast` (no check, undefined behaviour if wrong). `Triggered` fires every frame for the default Down trigger; `Started` would move for one frame only. Handlers that need the value take `const FInputActionValue&` — the wrapper, not the raw `FVector2D`, because the delegate signature is the same for every value type.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Step 5: reading values in handlers',
      blocks: [
        {
          type: 'p',
          text: 'Every value-taking handler receives an [[input-action-value]]. Ask it for the type that matches the action\'s Value Type:',
        },
        {
          type: 'table',
          headers: ['Action value type', 'Read it with', 'Example'],
          rows: [
            ['Digital (bool)', '`Value.Get<bool>()`', '`const bool bHeld = Value.Get<bool>();`'],
            ['Axis1D (float)', '`Value.Get<float>()`', 'Mouse-wheel zoom amount'],
            ['Axis2D (Vector2D)', '`Value.Get<FVector2D>()`', 'Move / Look direction'],
            ['Axis3D (Vector)', '`Value.Get<FVector>()`', 'Free-flight input'],
          ],
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp',
          code: `void AMyCharacter::Move(const FInputActionValue& Value) {
    const FVector2D Axis = Value.Get<FVector2D>();

    // Simple version: relative to where the body faces.
    // The next lesson makes this camera-relative.
    AddMovementInput(GetActorForwardVector(), Axis.Y);
    AddMovementInput(GetActorRightVector(), Axis.X);
}

void AMyCharacter::Look(const FInputActionValue& Value) {
    const FVector2D Axis = Value.Get<FVector2D>();
    AddControllerYawInput(Axis.X);
    AddControllerPitchInput(Axis.Y);
}`,
          annotations: [
            { lines: 2, text: 'W/S were swizzled into **Y** and A/D land in **X** (previous lesson), so `Axis` is (right, forward).' },
            { lines: '6-7', text: '`AddMovementInput(direction, scale)` *requests* movement; the Character Movement Component turns it into velocity next tick. Forward uses Y, right uses X.' },
            { lines: '12-13', text: 'Horizontal mouse/stick turns (yaw), vertical tilts (pitch). These rotate the *controller*, not the body — the next lesson explains why that matters.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a wrapper instead of a plain FVector2D parameter?',
          text: 'Enhanced Input needs **one** delegate type that can carry bool, float, 2D or 3D values, chosen per action in the editor. `FInputActionValue` is that common currency: it stores up to three axes plus a type tag, and `Get<T>()` gives you a typed view. Reading the "wrong" type does not crash — `Get<FVector2D>()` on an Axis1D action returns `(x, 0)` — which is convenient but also means a mismatch shows up as "the Y axis is always zero" rather than as an error.',
        },
        {
          type: 'callout',
          variant: 'tip',
          text: 'Debugging a handler? Log the value: `UE_LOG(LogTemp, Verbose, TEXT("Move %s"), *Axis.ToString());` — or run `showdebug enhancedinput` to see the value without touching code.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      codeOptions: true,
      prompt: '`IA_Zoom` is an **Axis1D (float)** action mapped to the mouse wheel. Which line correctly reads it in `void Zoom(const FInputActionValue& Value)`?',
      options: [
        {
          text: 'const float Amount = Value.Get<FVector2D>().Y;',
          why: 'A 1D value lives in X. Reading `.Y` compiles but is always `0`, so zoom would never change.',
        },
        {
          text: 'const float Amount = Value.Get<float>();',
          correct: true,
          why: 'Matches the action\'s value type: `Get<float>()` returns the single axis.',
        },
        {
          text: 'const int32 Amount = Value.Get<int32>();',
          why: 'There is no `int32` conversion: `Get<T>()` supports `bool`, `float`, `FVector2D` and `FVector`, so this does not compile.',
        },
        {
          text: 'const float Amount = static_cast<float>(Value);',
          why: '`FInputActionValue` has no conversion operator to `float`; this does not compile. Use the typed accessor.',
        },
      ],
      explanation:
        'Pair the accessor with the action\'s Value Type: bool → `Get<bool>()`, Axis1D → `Get<float>()`, Axis2D → `Get<FVector2D>()`, Axis3D → `Get<FVector>()`. Mismatches between *supported* types compile and quietly return zeros for missing axes, so a "dead" axis is a hint to check this pairing.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'When input "does nothing": a checklist',
      blocks: [
        {
          type: 'p',
          text: 'Almost every Enhanced Input bug produces the same symptom — nothing happens — so it pays to know the usual causes and check them in order:',
        },
        {
          type: 'table',
          headers: ['Symptom', 'Likely cause', 'Fix'],
          rows: [
            ['No action works at all', 'Context never added (wrong hook, failed null check, constructor)', 'Add it in `PawnClientRestart`; check the log for your warning'],
            ['No action works at all', 'You are playing the C++ class or the wrong pawn, so the asset slots are empty', 'Set `BP_MyCharacter` as the GameMode\'s Default Pawn Class'],
            ['One action does nothing', 'Its `UInputAction` slot is unassigned, or the context does not map any key to it', 'Assign the asset; check the mappings in `IMC_Default`'],
            ['Character moves one frame per press', 'Bound to `Started` instead of `Triggered`', 'Bind continuous actions to `Triggered`'],
            ['Assertion in `SetupPlayerInputComponent`', 'Default Input Component Class is not `EnhancedInputComponent`', 'Fix Project Settings → Input → Default Classes'],
            ['Works in single-player, not on a client', 'Context added in `BeginPlay` before the controller was known', 'Move registration to `PawnClientRestart`'],
          ],
        },
        {
          type: 'p',
          text: 'Not all input belongs to the pawn. Opening the pause menu or the scoreboard should work whether you are alive, dead or spectating, so bind those on your **player controller**, which persists across pawns:',
        },
        {
          type: 'code',
          title: 'MyPlayerController.cpp',
          code: `void AMyPlayerController::SetupInputComponent() {
    Super::SetupInputComponent();

    UEnhancedInputComponent* Input =
        CastChecked<UEnhancedInputComponent>(InputComponent);
    Input->BindAction(PauseAction, ETriggerEvent::Started,
                      this, &AMyPlayerController::TogglePause);
}`,
          annotations: [
            { lines: 1, text: 'The controller\'s equivalent of `SetupPlayerInputComponent`. It runs once for a local player controller.' },
            { lines: 5, text: '`InputComponent` is the controller\'s own component, created from the same Default Input Component Class.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Same pattern in Blueprint',
          text: 'Everything here has a Blueprint equivalent: *Add Mapping Context* on the Enhanced Input Local Player Subsystem, and *EnhancedInputAction IA_Move* event nodes with Started/Triggered/Completed pins. Teams often bind core movement in C++ and let designers bind ability or UI actions in Blueprint, using the same assets.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'order',
      linesAreCode: false,
      prompt: 'The game is running and the context and bindings are set up. The player presses **W**. Put what happens in order, from key to handler.',
      lines: [
        'The engine passes the W key event to the local player\'s Enhanced Input processing',
        'The highest-priority active context that maps W (IMC_Default) routes it to IA_Move',
        'The Swizzle modifier on the W mapping turns (1, 0) into (0, 1)',
        'The implicit Down trigger reports the action as Triggered',
        'The UEnhancedInputComponent finds the binding for (IA_Move, Triggered)',
        'AMyCharacter::Move runs and Value.Get<FVector2D>() returns (0, 1)',
      ],
      distractors: ['BindAxis looks up "MoveForward" in DefaultInput.ini'],
      explanation:
        'Data first, code last: the context decides *which action* W feeds, modifiers decide *the value*, the trigger decides *whether it fires*, and only then does the input component dispatch to your bound member function. `BindAxis` and `DefaultInput.ini` axis names belong to the deprecated legacy system.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'Your character works perfectly in single-player PIE. In a two-player listen-server test, the host can move but the **client cannot move or look**. The mapping context is added in `BeginPlay`. What is the most likely cause?',
      options: [
        {
          text: 'Enhanced Input does not support network clients',
          why: 'Input is always processed locally on the machine that owns the player, client or not. Enhanced Input works fine on clients.',
        },
        {
          text: 'On the client, `BeginPlay` ran before the pawn\'s controller was known, so `GetController()` returned null and the context was never added',
          correct: true,
          why: 'Yes. Replication order on a client is not guaranteed, so the null check quietly skips registration. `PawnClientRestart` runs after possession on the owning client.',
        },
        {
          text: 'Bindings must be created on the server and replicated to clients',
          why: 'Input bindings are never replicated; each client binds its own locally controlled pawn. (Sending the *results* of input to the server is a separate networking topic.)',
        },
        {
          text: 'Each client needs a separate copy of the `IMC_Default` asset',
          why: 'Assets are shared read-only data. All players can use the same mapping context asset.',
        },
      ],
      explanation:
        'The context is per **local player** and must be added on the machine where that player sits, at a moment when the pawn is known to be possessed. `PawnClientRestart` is exactly that moment on the owning client, which is why Epic\'s Enhanced Input docs register contexts there rather than in `BeginPlay`.',
    },
  ],
  takeaways: [
    'Add `"EnhancedInput"` to your module\'s dependencies in `Build.cs`; a missing entry fails at compile or link time.',
    'Expose `TObjectPtr<UInputMappingContext>` / `TObjectPtr<UInputAction>` as `EditDefaultsOnly` `UPROPERTY`s and assign them in a Blueprint child.',
    'Activate contexts on `UEnhancedInputLocalPlayerSubsystem` from `PawnClientRestart`, null-checking the controller, the subsystem and the asset.',
    'Bind in `SetupPlayerInputComponent`: `CastChecked<UEnhancedInputComponent>`, then `BindAction(Action, ETriggerEvent::…, this, &Class::Function)`.',
    'Handlers take `const FInputActionValue&` and read `Get<bool/float/FVector2D/FVector>()` to match the action\'s value type; they need not be `UFUNCTION`s.',
    'Input that must survive pawn changes (pause, scoreboard) belongs on the player controller.',
  ],
  reading: [
    {
      title: 'Enhanced Input',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine',
      source: 'unreal-docs',
      note: 'See the C++ section for Epic\'s `PawnClientRestart` and `SetupPlayerInputComponent` examples.',
    },
    {
      title: 'Configure Character Movement with C++',
      url: 'https://dev.epicgames.com/documentation/unreal-engine/coder-03-configure-character-movement-with-cplusplus-in-unreal-engine',
      source: 'unreal-docs',
      note: 'A step-by-step tutorial that adds the module dependency, includes and bindings from this lesson to a fresh character.',
    },
    {
      title: 'Enhanced Input API reference',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/EnhancedInput',
      source: 'unreal-docs',
      note: 'Look up `UEnhancedInputComponent::BindAction` overloads and `UEnhancedInputLocalPlayerSubsystem` functions such as `RemoveMappingContext`.',
    },
  ],
};
