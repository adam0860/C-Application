import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'input-modifier',
    term: 'Input Modifier',
    aliases: ['UInputModifier', 'Modifier (Enhanced Input)'],
    course: 'unreal',
    category: 'Input',
    short:
      'A processing step in Enhanced Input that transforms a raw input value before triggers see it — for example Negate, Swizzle Input Axis Values or Dead Zone.',
    long:
      'Modifiers are small `UInputModifier` objects attached either to one key mapping inside an Input Mapping Context or to an Input Action itself. Mapping modifiers run first, then action modifiers.\n\nBecause they live in data, designers can invert an axis, add a stick dead zone or apply a response curve without touching C++.',
    see: ['enhanced-input', 'input-trigger', 'input-mapping-context'],
  },
  {
    id: 'input-trigger',
    term: 'Input Trigger',
    aliases: ['UInputTrigger', 'Trigger (Enhanced Input)'],
    course: 'unreal',
    category: 'Input',
    short:
      'An Enhanced Input rule that decides *when* an Input Action fires, based on the modified value over time — e.g. Down, Pressed, Released, Hold or Tap.',
    long:
      'Triggers are `UInputTrigger` objects. Each frame they look at the value produced by the modifiers and report a state (None, Ongoing or Triggered). Changes in that state become the `ETriggerEvent`s you bind to in C++.\n\nAn action with no triggers behaves like the Down trigger: it is Triggered on every frame the input is actuated.',
    see: ['input-modifier', 'trigger-event', 'input-action'],
  },
  {
    id: 'trigger-event',
    term: 'ETriggerEvent',
    aliases: ['Trigger Event'],
    course: 'unreal',
    category: 'Input',
    short:
      'The enum describing how an Input Action\'s trigger state changed this frame: `Started`, `Ongoing`, `Triggered`, `Completed` or `Canceled`. You pick one when you bind a handler.',
    long:
      '`Started` fires on the first frame trigger evaluation begins. `Ongoing` fires while a trigger is still being evaluated (e.g. a Hold that has not reached its time yet). `Triggered` fires when the trigger condition is met — every frame for continuous triggers. `Completed` fires when the action goes from Triggered back to None, and `Canceled` when it goes from Ongoing back to None without ever triggering.',
    example:
      'Input->BindAction(MoveAction, ETriggerEvent::Triggered,\n                  this, &AMyCharacter::Move);',
    see: ['input-trigger', 'enhanced-input-component'],
  },
  {
    id: 'enhanced-input-subsystem',
    term: 'Enhanced Input Local Player Subsystem',
    aliases: ['UEnhancedInputLocalPlayerSubsystem'],
    course: 'unreal',
    category: 'Input',
    short:
      'The per-local-player [[subsystem]] that owns the active Input Mapping Contexts. You call `AddMappingContext` and `RemoveMappingContext` on it.',
    long:
      'It lives on the `ULocalPlayer` (one per human player on this machine), not on the pawn, so contexts you add survive the pawn being destroyed and respawned. It does not exist on a dedicated server, which has no local players — always null-check it.',
    example:
      'if (auto* Input = ULocalPlayer::GetSubsystem<\n        UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer())) {\n    Input->AddMappingContext(DefaultMappingContext, 0);\n}',
    see: ['input-mapping-context', 'subsystem', 'player-controller'],
  },
  {
    id: 'enhanced-input-component',
    term: 'UEnhancedInputComponent',
    aliases: ['Enhanced Input Component'],
    course: 'unreal',
    category: 'Input',
    short:
      'The input component class that binds Input Actions to functions with `BindAction(Action, TriggerEvent, Object, &Class::Function)`.',
    long:
      'The engine creates the pawn\'s input component from the class set in Project Settings → Input → Default Input Component Class, which is `UEnhancedInputComponent` by default since UE 5.1. `SetupPlayerInputComponent` still receives it as a plain `UInputComponent*`, so you cast it.',
    see: ['enhanced-input', 'trigger-event', 'input-action'],
  },
  {
    id: 'input-action-value',
    term: 'FInputActionValue',
    course: 'unreal',
    category: 'Input',
    short:
      'The value wrapper passed to Enhanced Input handlers. Read it with `Get<bool>()`, `Get<float>()`, `Get<FVector2D>()` or `Get<FVector>()` to match the action\'s value type.',
    long:
      'Internally it stores up to three axes plus a value-type tag, so one handler signature (`const FInputActionValue&`) works for every kind of action. Reading the wrong type does not crash; you just get the components that exist (and zeros for the rest).',
    example: 'const FVector2D Axis = Value.Get<FVector2D>();',
    see: ['input-action', 'enhanced-input-component'],
  },
  {
    id: 'control-rotation',
    term: 'Control Rotation',
    course: 'unreal',
    category: 'Gameplay Framework',
    short:
      'The rotation stored on a Controller that represents where the player (or AI) is aiming. It is separate from the pawn\'s own rotation; read it with `GetControlRotation()`.',
    long:
      'Look input (`AddControllerYawInput` / `AddControllerPitchInput`) changes the control rotation, not the actor. Flags such as `bUseControllerRotationYaw` and a spring arm\'s `bUsePawnControlRotation` decide what follows it. Keeping "aim" separate from "body" is what lets a third-person camera orbit a character without turning it.',
    see: ['player-controller', 'pawn', 'frotator'],
  },
];
