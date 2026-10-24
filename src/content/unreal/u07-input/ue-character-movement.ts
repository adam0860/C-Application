import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-character-movement',
  title: 'Movement, Looking and Jumping',
  summary:
    'Camera-relative movement, control rotation, jumping, facing rules and Character Movement Component tuning — ending with a sprint.',
  minutes: 18,
  objectives: [
    'Turn 2D input into camera-relative world directions using only the control rotation\'s yaw',
    'Explain control rotation and drive it with `AddControllerYawInput` / `AddControllerPitchInput`',
    'Wire `Jump` / `StopJumping` and configure variable-height and double jumps',
    'Choose between `bUseControllerRotationYaw` and `bOrientRotationToMovement` for a given camera style',
    'Tune the Character Movement Component and implement a sprint',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Who actually moves the character?',
      blocks: [
        {
          type: 'p',
          text: 'In the last lesson your `Move` handler called `AddMovementInput`. It is tempting to read that as "move the character now", but it is only a **request**. The real work belongs to the [[character-movement-component]] (CMC) that every `ACharacter` owns.',
        },
        {
          type: 'code',
          title: 'Pawn.h (engine declaration)',
          code: `virtual void AddMovementInput(FVector WorldDirection,
                              float ScaleValue = 1.0f,
                              bool bForce = false);`,
          annotations: [
            { lines: 1, text: 'A direction in **world** space. Unreal is Z-up: X and Y lie on the ground plane.' },
            { lines: 2, text: 'How strongly to push along it — your input value, between −1 and 1. A half-tilted stick gives 0.5.' },
            { lines: 3, text: '`bForce` ignores "movement input is disabled" flags; you will rarely need it.' },
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'Accumulate', text: 'Each call adds `WorldDirection * ScaleValue` to the pawn\'s pending input vector. Several calls in one frame (forward *and* right) simply sum.' },
            { title: 'Consume', text: 'On its next tick the CMC takes the pending vector, clamps its length to 1, and multiplies by `MaxAcceleration`.' },
            { title: 'Integrate', text: 'Acceleration, friction, braking and gravity update the velocity, capped at `MaxWalkSpeed` for walking.' },
            { title: 'Move', text: 'The capsule is swept along the floor: stepping up stairs, sliding along walls, walking up slopes it considers walkable.' },
            { title: 'Network', text: 'In multiplayer the CMC predicts this on the owning client and reconciles with the server\'s result.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why separate the request from the movement?',
          text: 'Movement is one of the hardest systems in a game to get right: collision, stairs, slopes, moving platforms, swimming, network prediction. By reducing your code\'s job to "the player wants to go *that* way, *this* much", all of it stays in one battle-tested component — and the same request works for walking, swimming or flying, because the CMC interprets it according to the current movement mode.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'truefalse',
      prompt: 'Holding W and D together makes a character driven by `AddMovementInput` accelerate to a higher top speed than holding W alone, because the input vector (1, 1) is longer than (0, 1).',
      answer: false,
      explanation:
        'The CMC clamps the accumulated input vector to a length of **1** before turning it into acceleration, so (1, 1) becomes roughly (0.71, 0.71). Diagonal movement reaches the same `MaxWalkSpeed` as straight movement. Many hand-rolled movement systems forget this and let players "strafe-run" faster; the CMC handles it for you. Smaller vectors (a half-tilted stick) are *not* scaled up, which is how analog walking works.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Control rotation: where the player is looking',
      blocks: [
        {
          type: 'p',
          text: 'A character has (at least) three rotations: the **actor** (where the body faces), the **camera**, and the controller\'s [[control-rotation]] — where the player is *aiming*. Look input changes the control rotation; the body and camera then follow it, or not, depending on settings you choose.',
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp',
          code: `void AMyCharacter::Look(const FInputActionValue& Value) {
    const FVector2D LookAxis = Value.Get<FVector2D>();
    AddControllerYawInput(LookAxis.X);
    AddControllerPitchInput(LookAxis.Y);
}`,
          annotations: [
            { lines: 2, text: 'Named `LookAxis`, not `Look`: a local with the same name as the member function would shadow it, which Unreal\'s strict warning settings reject.' },
            { lines: 3, text: 'Yaw = turning left/right around the vertical (Z) axis.' },
            { lines: 4, text: 'Pitch = tilting up/down. If it feels inverted, flip the sign with a Negate (Y) modifier on the mouse mapping — fix it in data, not here.' },
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'Forward', text: '`APawn::AddControllerYawInput` forwards the value to the controller — but only if it is a **local player controller**.' },
            { title: 'Accumulate', text: 'The player controller adds it to its pending rotation input for this frame.' },
            { title: 'Apply', text: 'Once per frame the controller adds the pending input to its control rotation. The camera manager clamps pitch (`ViewPitchMin` / `ViewPitchMax`, about ±89.9° by default) so you cannot flip over the top.' },
            { title: 'Follow', text: 'Whatever is set to use the control rotation — typically a spring-arm camera boom — rotates to match.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does the controller own the aim?',
          text: 'Separating aim from body is what makes a third-person camera possible: you can orbit the camera around a character without spinning the character. It also gives AI and players the same interface — an `AAIController` sets its control rotation to look at a target, and the pawn code that reads `GetControlRotation()` does not care who is in charge.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Mouse vs stick: a frame-rate trap',
          text: 'A mouse reports *how far it moved this frame*, so its value is already frame-rate independent. A stick reports a *rate* ("I am held 70% right"), so applying it unscaled turns faster at 120 fps than at 30 fps. Add a **Scale By Delta Time** modifier (plus a Scalar for sensitivity) to the gamepad look mapping — again a data fix, not code.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: 'You reuse your `Look` logic on an AI-controlled enemy by calling `AddControllerPitchInput(10.f)` on it. Its aim does not change at all. Why?',
      options: [
        {
          text: 'Pitch input is clamped to zero for pawns that are not characters',
          why: 'Pitch is clamped to a range (about ±89.9°), not to zero, and the enemy\'s class is irrelevant here.',
        },
        {
          text: '`AddControllerPitchInput` only forwards to a local **player** controller; AI controllers set their rotation directly',
          correct: true,
          why: 'Right. The function routes look input to the player controller\'s input accumulator. For AI you set the rotation yourself, for example with `SetControlRotation` or the AI focus system.',
        },
        {
          text: 'The value must be multiplied by `DeltaTime` first',
          why: 'Scaling would change the *amount*, but the call does nothing for this pawn whatever the value.',
        },
        {
          text: 'AI pawns do not have a control rotation',
          why: 'Every controller, AI included, has a control rotation. It is simply not driven by the input-accumulation path.',
        },
      ],
      explanation:
        'The `AddController…Input` helpers are *input* functions: they feed a player controller\'s per-frame rotation input, and silently do nothing otherwise. That keeps AI from being affected by player-input code paths. Code that *reads* `GetControlRotation()` still works for both.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Camera-relative movement',
      blocks: [
        {
          type: 'p',
          text: 'Players expect "W" to mean **away from the camera**, whatever the character\'s body is doing. So instead of using the actor\'s forward vector, derive forward and right from the control rotation — but only from its **yaw**:',
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp',
          code: `void AMyCharacter::Move(const FInputActionValue& Value) {
    const FVector2D Axis = Value.Get<FVector2D>();
    if (!Controller) {
        return;
    }

    const FRotator ControlRot = Controller->GetControlRotation();
    const FRotator YawOnly(0.0, ControlRot.Yaw, 0.0);
    const FRotationMatrix Basis(YawOnly);

    const FVector Forward = Basis.GetUnitAxis(EAxis::X);
    const FVector Right = Basis.GetUnitAxis(EAxis::Y);

    AddMovementInput(Forward, Axis.Y);
    AddMovementInput(Right, Axis.X);
}`,
          annotations: [
            { lines: '3-5', text: '`Controller` is the pawn\'s current controller. Input should only arrive while possessed, but a cheap guard avoids a crash during possession changes.' },
            { lines: 8, text: '[[frotator]] takes (Pitch, Yaw, Roll). Keeping only yaw gives a rotation that turns left/right but stays level with the ground.' },
            { lines: 9, text: 'A rotation matrix\'s axes are the rotated basis vectors. In Unreal, X is forward, Y is right, Z is up.' },
            { lines: '11-12', text: 'Unit-length horizontal directions relative to the camera\'s heading.' },
            { lines: '14-15', text: 'Y (W/S) drives forward, X (A/D) drives right — the same convention as the input setup.' },
          ],
        },
        { type: 'heading', text: 'Why throw pitch away?' },
        {
          type: 'p',
          text: 'Suppose you used the full control rotation. Look down 60° and "forward" now points 60° into the ground. In walking mode the CMC discards the vertical part of the input, so only the horizontal part — `cos(pitch)` of it — drives you:',
        },
        {
          type: 'table',
          headers: ['Camera pitch', 'Horizontal share of "forward"', 'Effect'],
          rows: [
            ['0° (level)', '100%', 'Full speed'],
            ['30°', '87%', 'Slightly slower'],
            ['60°', '50%', 'Half speed'],
            ['80°', '17%', 'Crawling'],
            ['90° (straight down)', '0%', 'W does nothing'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          text: 'Movement speed should depend on the stick, not on where the camera happens to be pointing. Zeroing pitch makes forward and right always horizontal and unit length, so W means full speed whether you are admiring the sky or checking your feet. (A flying or swimming pawn is the exception — there you *want* pitch, so "forward" can point up or down.)',
        },
        {
          type: 'deepdive',
          title: 'Equivalent ways to get the vectors',
          blocks: [
            {
              type: 'p',
              text: '`YawOnly.Vector()` returns the forward direction directly, and `YawOnly.Quaternion().GetRightVector()` gives right. `FRotationMatrix` is the form used in the UE5 templates because one matrix yields every axis. All three compute the same thing: `Forward = (cos yaw, sin yaw, 0)` and `Right = (-sin yaw, cos yaw, 0)`.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'fill',
      prompt: 'Complete the camera-relative movement code. Movement must stay horizontal and W/S (Axis.Y) must move forward and back.',
      template: `const FRotator Control = Controller->GetControlRotation();
const FRotator YawRot(0.0, Control.___, 0.0);
const FRotationMatrix Basis(YawRot);
AddMovementInput(Basis.GetUnitAxis(EAxis::___), Axis.Y);
AddMovementInput(Basis.GetUnitAxis(EAxis::___), Axis.X);`,
      blanks: [{ answers: ['Yaw'] }, { answers: ['X'] }, { answers: ['Y'] }],
      wordBank: ['Yaw', 'Pitch', 'Roll', 'X', 'Y', 'Z'],
      explanation:
        'Only `Yaw` is copied, so the basis stays level. In Unreal\'s coordinate system the matrix\'s **X** axis is forward and its **Y** axis is right (Z is up), so `Axis.Y` (W/S) goes along X and `Axis.X` (A/D) goes along Y. Mixing these up gives strafing on W — a classic first-day bug.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Turning the body: two flags, two styles',
      blocks: [
        {
          type: 'p',
          text: 'Movement direction is now camera-relative. What about the direction the **body** faces? Two settings answer that, and they suit different games:',
        },
        {
          type: 'compare',
          left: {
            title: 'bUseControllerRotationYaw = true',
            tone: 'neutral',
            text: 'The actor\'s yaw is copied from the control rotation every frame. The body always faces where you aim; pressing A **strafes** sideways. Classic for first-person games and over-the-shoulder shooters. This is the `APawn` default.',
          },
          right: {
            title: 'bOrientRotationToMovement = true',
            tone: 'neutral',
            text: 'A Character Movement Component setting. The body turns (at `RotationRate`) toward the direction it is **moving**. The camera orbits freely; pressing A makes the character turn and run left. Classic third-person adventure feel.',
          },
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp — third-person adventure setup',
          code: `AMyCharacter::AMyCharacter() {
    bUseControllerRotationPitch = false;
    bUseControllerRotationYaw = false;
    bUseControllerRotationRoll = false;

    UCharacterMovementComponent* MoveComp = GetCharacterMovement();
    MoveComp->bOrientRotationToMovement = true;
    MoveComp->RotationRate = FRotator(0.0, 500.0, 0.0);

    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(
        TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(RootComponent);
    CameraBoom->TargetArmLength = 400.f;
    CameraBoom->bUsePawnControlRotation = true;

    FollowCamera = CreateDefaultSubobject<UCameraComponent>(
        TEXT("FollowCamera"));
    FollowCamera->SetupAttachment(CameraBoom,
                                  USpringArmComponent::SocketName);
    FollowCamera->bUsePawnControlRotation = false;
}`,
          annotations: [
            { lines: '2-4', text: 'The body ignores the control rotation entirely, so looking around never turns it.' },
            { lines: '7-8', text: 'Face the movement direction, turning at up to 500° per second around Z. Lower values feel heavier.' },
            { lines: '10-14', text: 'The spring-arm boom *does* follow the control rotation, so the camera orbits the character as you look around. (`CameraBoom` and `FollowCamera` are `TObjectPtr` `UPROPERTY` members; include `SpringArmComponent.h`, `CameraComponent.h` and `CharacterMovementComponent.h`.)' },
            { lines: 20, text: 'The camera rides on the end of the boom; it must not apply the control rotation a second time.' },
          ],
        },
        {
          type: 'table',
          headers: ['Style', 'bUseControllerRotationYaw', 'bOrientRotationToMovement', 'bUseControllerDesiredRotation'],
          rows: [
            ['First-person / classic shooter', '`true`', '`false`', '`false`'],
            ['Third-person adventure', '`false`', '`true`', '`false`'],
            ['Third-person aiming / strafing', '`false`', '`false`', '`true` — body turns smoothly toward the aim at `RotationRate`'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Do not enable both',
          text: 'With `bUseControllerRotationYaw` *and* `bOrientRotationToMovement` on, two systems fight over the actor\'s yaw: the controller rotation is applied every frame, so orient-to-movement appears not to work. Many games switch styles at run time — orient-to-movement while exploring, desired-rotation while aiming — by flipping these flags in code.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'bug',
      prompt: 'With this setup, holding **D** makes the character run in endless circles instead of to the right of the camera. Tap the line that causes it.',
      code: `AMyCharacter::AMyCharacter() {
    bUseControllerRotationYaw = false;
    GetCharacterMovement()->bOrientRotationToMovement = true;
}

void AMyCharacter::Move(const FInputActionValue& Value) {
    const FVector2D Axis = Value.Get<FVector2D>();
    AddMovementInput(GetActorForwardVector(), Axis.Y);
    AddMovementInput(GetActorRightVector(), Axis.X);
}`,
      bugLines: [9],
      hint: 'Which way is "right" after the body has turned a little to the right?',
      explanation:
        'It is a feedback loop. D asks to move along the **actor\'s** right vector; orient-to-movement turns the body toward that direction; now the actor\'s right vector has rotated too, so the next frame asks for a new "right"… and the character chases its own tail. Movement directions must come from something the movement does not change — the control rotation\'s yaw, as in the camera-relative version. (Line 8 has the same flaw in principle, but moving forward does not change which way is forward, so it only shows up with sideways input.)',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Jumping',
      blocks: [
        {
          type: 'p',
          text: '`ACharacter` already knows how to jump; your job is to bind `IA_Jump` with **Started → `Jump`** and **Completed → `StopJumping`**, as in the last lesson. Here is what those calls really do:',
        },
        {
          type: 'list',
          items: [
            '`Jump()` only sets a flag: "jump is pressed". On the next movement update the character checks `CanJump()` (not crouching, on the ground or with jumps left, movement mode allows it), then the CMC sets the vertical velocity to `JumpZVelocity` and switches to the **Falling** movement mode.',
            '`StopJumping()` clears the flag. With the default `JumpMaxHoldTime` of 0, the jump is a fixed launch, so this changes little. Set `JumpMaxHoldTime` above 0 and the upward velocity keeps being re-applied while the button is held — up to that many seconds — so releasing early gives a shorter hop. That is a **variable-height jump**, and `StopJumping` is what ends it.',
            '`JumpMaxCount` (default 1) is the number of jumps before landing. Set it to 2 for a double jump.',
          ],
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp',
          code: `// In the constructor:
JumpMaxCount = 2;
JumpMaxHoldTime = 0.3f;
GetCharacterMovement()->JumpZVelocity = 600.f;

// Declared in the header as:
//   virtual void Landed(const FHitResult& Hit) override;
void AMyCharacter::Landed(const FHitResult& Hit) {
    Super::Landed(Hit);
    UE_LOG(LogTemp, Log, TEXT("Landed on %s"),
           *GetNameSafe(Hit.GetActor()));
}`,
          annotations: [
            { lines: 2, text: 'Double jump. The jump counter resets on landing.' },
            { lines: 3, text: 'Holding the button for up to 0.3 s extends the jump.' },
            { lines: 4, text: 'Launch speed in cm/s. With default gravity this gives an apex of about 1.8 m.' },
            { lines: '8-12', text: '`Landed` is a virtual hook called when the character touches down — a good place for landing sounds, dust effects or fall damage. Call `Super` so Blueprint\'s *On Landed* event still fires.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does Jump only set a flag?',
          text: 'Because jumping is *movement*, and movement belongs to the CMC\'s update. Deferring the launch to that update means `CanJump()` is checked against the current movement state, the jump goes through the same collision sweep as every other move, and in multiplayer the "jump pressed" bit travels with the rest of the move data so the server can replay it. An input handler that set velocity directly would bypass all three.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'A designer sets `JumpMaxHoldTime = 0.35`, hoping that a quick tap gives a small hop and holding gives a big jump. Instead, *every* jump reaches full height. What is the most likely cause?',
      options: [
        {
          text: '`JumpZVelocity` is too high',
          why: 'That sets the height of *every* jump. It cannot explain why taps and holds behave the same.',
        },
        {
          text: '`JumpMaxCount` must be set to 2 for variable height to work',
          why: '`JumpMaxCount` controls double jumps, not hold behaviour.',
        },
        {
          text: 'Nothing calls `StopJumping` when the button is released, so every jump keeps its boost for the full 0.35 s',
          correct: true,
          why: 'Yes. The boost only ends early when `StopJumping` clears the pressed flag. Bind `IA_Jump`\'s `Completed` event to `ACharacter::StopJumping`.',
        },
        {
          text: '`Jump` should be bound to `Triggered` so it is called every frame',
          why: 'Calling `Jump` repeatedly does not create variable height; the engine already re-applies the boost while the flag is set. The missing piece is clearing the flag on release.',
        },
      ],
      explanation:
        'Variable-height jumps need both edges of the button press: `Started` → `Jump` sets the flag, `Completed` → `StopJumping` clears it. Without the release edge, the flag simply times out at `JumpMaxHoldTime`, so every jump is a "held" jump.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Tuning the Character Movement Component',
      blocks: [
        {
          type: 'p',
          text: '"Game feel" lives mostly in a handful of CMC properties. Unreal units are **centimetres**, so speeds are cm/s and accelerations cm/s².',
        },
        {
          type: 'table',
          headers: ['Property', 'Engine default', 'What it controls'],
          rows: [
            ['`MaxWalkSpeed`', '600', 'Top ground speed (6 m/s ≈ 21.6 km/h)'],
            ['`MaxAcceleration`', '2048', 'How quickly you reach top speed'],
            ['`BrakingDecelerationWalking`', '2048', 'How quickly you stop when input is released'],
            ['`GroundFriction`', '8', 'How quickly velocity follows a change of direction'],
            ['`JumpZVelocity`', '420', 'Launch speed of a jump (apex ≈ 0.9 m)'],
            ['`AirControl`', '0.05', 'Fraction of steering you keep while falling (0–1)'],
            ['`GravityScale`', '1.0', 'Multiplier on world gravity (−980 cm/s²) for this character'],
            ['`RotationRate`', '(0, 360, 0)', 'Degrees per second for orient-to-movement / desired rotation'],
            ['`MaxStepHeight`', '45', 'Tallest ledge you walk up without jumping'],
          ],
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp (constructor)',
          code: `UCharacterMovementComponent* MoveComp = GetCharacterMovement();
MoveComp->MaxWalkSpeed = 500.f;
MoveComp->JumpZVelocity = 700.f;
MoveComp->AirControl = 0.35f;
MoveComp->BrakingDecelerationWalking = 2000.f;
MoveComp->GravityScale = 1.5f;`,
          annotations: [
            { lines: [3, 6], text: 'A higher launch speed paired with stronger gravity: a high jump that is also snappy, spending less time floating. Platformers tune these two together.' },
            { lines: 4, text: '0.35 lets players correct a jump mid-air: unrealistic, but it feels good. 0 is "realistic" and frustrating.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why so many knobs?',
          text: 'Because "realistic" and "fun" disagree. Real people cannot steer in mid-air, stop instantly or jump 2.5 m — but many games feel better when characters can. Exposing these as properties lets designers find the feel in the editor while you keep the movement code untouched. Set sensible defaults in the constructor, then tune in the Blueprint child, live, during Play.',
        },
        {
          type: 'deepdive',
          title: 'Where the jump heights come from',
          blocks: [
            {
              type: 'p',
              text: 'A jump is a launch against gravity, so the apex height is h = v² / 2g. With g = 980 cm/s²: v = 420 gives 420² / 1960 ≈ 90 cm; v = 700 gives ≈ 250 cm. Height grows with the **square** of launch speed, while time in the air (2v / g) grows linearly. `GravityScale` divides both: double gravity halves the height for the same speed, which is why the code above raises both values together.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'A character jumps about 90 cm with `JumpZVelocity = 420`. You double it to 840 and leave gravity alone. Roughly how high does it jump now?',
      options: [
        {
          text: 'About 180 cm — twice as high',
          why: 'Height is not proportional to launch speed. Doubling the speed doubles the time to reach the apex *and* the average upward speed on the way.',
        },
        {
          text: 'About 360 cm — four times as high',
          correct: true,
          why: 'Apex height is v² / 2g, so doubling v multiplies height by 2² = 4.',
        },
        {
          text: 'About 127 cm — √2 times as high',
          why: 'That would be the result of doubling the *kinetic energy*, not the speed. Energy grows with v², so doubling v quadruples it.',
        },
        {
          text: 'The same — jump height is set by `JumpMaxHoldTime`',
          why: '`JumpMaxHoldTime` only matters when it is above 0 (variable-height jumps). Launch speed always sets the height of a basic jump.',
        },
      ],
      explanation:
        'With h = v² / 2g and g = 980 cm/s², 840² / 1960 ≈ 360 cm. Knowing the formula lets you tune by numbers instead of trial and error: pick the apex height the level design needs, then solve v = √(2gh).',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Building a sprint',
      blocks: [
        {
          type: 'p',
          text: 'Time to combine everything into a feature: hold **Shift** (or click the left stick) to run faster. Create `IA_Sprint` (Digital), map it in `IMC_Default`, then add this to the character:',
        },
        {
          type: 'code',
          title: 'MyCharacter.h (additions)',
          code: `UPROPERTY(EditDefaultsOnly, Category = "Input")
TObjectPtr<UInputAction> SprintAction;

UPROPERTY(EditDefaultsOnly, Category = "Movement")
float WalkSpeed = 500.f;

UPROPERTY(EditDefaultsOnly, Category = "Movement")
float SprintSpeed = 900.f;

void StartSprint();
void StopSprint();`,
          annotations: [
            { lines: '4-8', text: 'Speeds are designer-tunable properties with C++ defaults, so balancing never needs a recompile.' },
            { lines: '10-11', text: 'No value is needed — sprinting is on or off — so the handlers use the `void F()` signature.' },
          ],
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp (additions)',
          code: `void AMyCharacter::BeginPlay() {
    Super::BeginPlay();
    GetCharacterMovement()->MaxWalkSpeed = WalkSpeed;
}

// Inside SetupPlayerInputComponent:
Input->BindAction(SprintAction, ETriggerEvent::Started,
                  this, &AMyCharacter::StartSprint);
Input->BindAction(SprintAction, ETriggerEvent::Completed,
                  this, &AMyCharacter::StopSprint);

void AMyCharacter::StartSprint() {
    GetCharacterMovement()->MaxWalkSpeed = SprintSpeed;
}

void AMyCharacter::StopSprint() {
    GetCharacterMovement()->MaxWalkSpeed = WalkSpeed;
}`,
          annotations: [
            { lines: 3, text: 'Applied in `BeginPlay`, not the constructor: a value a designer changed in the Blueprint child is only guaranteed to be in place once the object is fully initialised.' },
            { lines: '7-10', text: '`Started` and `Completed` are exactly the two edges of "hold to sprint". `Triggered` would also work but would set the same value every frame for nothing.' },
            { lines: '12-18', text: 'Only the speed *cap* changes. The CMC accelerates toward the new cap (or brakes down from it) using `MaxAcceleration` and braking settings, so the transition is smooth for free.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          text: 'Want *toggle* sprint instead? Put a **Pressed** trigger on `IA_Sprint`, bind only `Triggered`, and flip a `bIsSprinting` bool in one handler. Same assets, different data and a few lines of code.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Multiplayer: this simple sprint rubber-bands',
          text: 'The CMC is server-authoritative with client prediction. If only the client raises `MaxWalkSpeed`, the server simulates the same input at walking speed, disagrees about the position, and keeps correcting the client back — visible as rubber-banding. A networked sprint must make the server agree on the speed for the same moves, which usually means a custom movement component that sends a "sprinting" flag with each move. You will meet the foundations in the networking unit.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'order',
      linesAreCode: false,
      prompt: 'Put the sprint feature\'s run-time sequence in order, from pressing Shift to returning to walking speed.',
      lines: [
        'The player presses Shift and IA_Sprint reports Started',
        'StartSprint sets MaxWalkSpeed to SprintSpeed',
        'The CMC accelerates the character toward the new, higher cap',
        'The player releases Shift and IA_Sprint reports Completed',
        'StopSprint sets MaxWalkSpeed back to WalkSpeed',
      ],
      distractors: ['IA_Sprint reports Canceled, so StopSprint runs'],
      explanation:
        'Each edge of the button press maps to one handler, and the CMC smooths the speed change. With the default (Down) trigger the action is Triggered on the first frame, so release produces `Completed`, not `Canceled` — `Canceled` only follows an Ongoing state that never triggered, such as a Hold released too early.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'Your third-person character slides sideways when you press A, always facing the camera\'s direction. You want it to turn and run toward the direction it moves, while the camera orbits freely. Which settings achieve that?',
      options: [
        {
          text: '`bUseControllerRotationYaw = true` on the character',
          why: 'That is what causes the current behaviour: the body copies the control rotation\'s yaw, so it always faces the camera direction and strafes.',
        },
        {
          text: '`bUseControllerRotationYaw = false` and `GetCharacterMovement()->bOrientRotationToMovement = true`',
          correct: true,
          why: 'The body stops copying the aim and instead turns toward its velocity at `RotationRate`, while the boom (with `bUsePawnControlRotation = true`) keeps orbiting with the control rotation.',
        },
        {
          text: '`bUseControllerDesiredRotation = true` on the movement component',
          why: 'This turns the body smoothly toward the *control rotation* — still facing the camera direction. It suits aiming modes, not run-where-you-go.',
        },
        {
          text: 'Set `bUsePawnControlRotation = false` on the camera boom',
          why: 'That stops the *camera* from following your look input, so it would no longer orbit. The body would still strafe.',
        },
      ],
      explanation:
        'Facing is decided by which system owns the actor\'s yaw: the controller (`bUseControllerRotationYaw`), the velocity (`bOrientRotationToMovement`) or a smoothed controller rotation (`bUseControllerDesiredRotation`). Pick exactly one per camera style, and keep movement directions camera-relative so they never depend on the body\'s facing.',
    },
  ],
  takeaways: [
    '`AddMovementInput` is a request; the Character Movement Component turns it into acceleration, clamps the input to length 1, and handles collision and networking.',
    'Look input changes the controller\'s control rotation, not the body; `AddController…Input` only affects local player controllers.',
    'Build movement directions from the control rotation\'s **yaw only** (`FRotationMatrix(YawOnly).GetUnitAxis(EAxis::X/Y)`) so speed never depends on camera pitch.',
    'Bind Jump to `Started` and StopJumping to `Completed`; `JumpMaxHoldTime` > 0 gives variable height, `JumpMaxCount` = 2 a double jump.',
    'Use `bUseControllerRotationYaw` for aim-facing games and `bOrientRotationToMovement` for run-where-you-go third-person — never both.',
    'Tune feel with CMC properties (`MaxWalkSpeed`, `JumpZVelocity`, `AirControl`, `GravityScale`…); a sprint is just a `MaxWalkSpeed` change on `Started`/`Completed`.',
  ],
  reading: [
    {
      title: 'Configure Character Movement with C++',
      url: 'https://dev.epicgames.com/documentation/unreal-engine/coder-03-configure-character-movement-with-cplusplus-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s step-by-step version of the movement, look and jump bindings from this lesson.',
    },
    {
      title: 'UCharacterMovementComponent (API reference)',
      url: 'https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UCharacterMovementComponent',
      source: 'unreal-docs',
      note: 'Every tunable property with its description — skim the Walking, Jumping / Falling and Rotation Settings categories.',
    },
    {
      title: 'Understanding Networked Movement in the Character Movement Component',
      url: 'https://dev.epicgames.com/documentation/unreal-engine/understanding-networked-movement-in-the-character-movement-component-for-unreal-engine',
      source: 'unreal-docs',
      note: 'Why the simple sprint rubber-bands online, and how saved moves and prediction work.',
    },
  ],
};
