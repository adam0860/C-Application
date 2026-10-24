import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-tick-deltatime',
  title: 'Tick and DeltaTime',
  summary:
    'How Unreal runs your code every frame, and how DeltaTime makes movement identical at 30 and 144 fps.',
  minutes: 17,
  objectives: [
    'Override `Tick` in an actor and `TickComponent` in a component, including the `Super` call',
    'Explain frame-rate independence and compute per-frame movement from a speed and `DeltaTime`',
    'Configure ticking with `bCanEverTick`, `bStartWithTickEnabled` and `TickInterval`',
    'Choose a tick group (PrePhysics, DuringPhysics, PostPhysics) based on what the code reads',
    'Recognise engine APIs that already apply `DeltaTime`, so you never apply it twice',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The game loop calls you',
      blocks: [
        {
          type: 'p',
          text: 'A game is one big loop. Every **frame**, the engine reads input, updates the world, steps physics, and renders an image. Run that loop 60 times a second and you get smooth motion. In standard C++ you would write that `while (running)` loop yourself inside `main`. In Unreal the engine owns the loop, and it offers your objects a hook inside it: [[tick|Tick]].',
        },
        {
          type: 'p',
          text: 'Any [[actor]] that opts in gets its `Tick` function called once per frame, with one argument: [[delta-time|DeltaTime]], the number of **seconds** since the previous frame. Here is a pickup that spins in place:',
        },
        {
          type: 'code',
          title: 'RotatingPickup.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "RotatingPickup.generated.h"

UCLASS()
class MYGAME_API ARotatingPickup : public AActor {
    GENERATED_BODY()

public:
    ARotatingPickup();

    virtual void Tick(float DeltaTime) override;

protected:
    UPROPERTY(EditAnywhere, Category = "Pickup")
    float SpinSpeedDegrees = 90.f;
};`,
          annotations: [
            { lines: 5, text: 'The [[generated-header]] is always the **last** include: it contains code [[unreal-header-tool|UHT]] generated for this class and relies on everything above it being declared.' },
            { lines: 14, text: '`Tick` is a [[virtual-function]] declared by `AActor`. You override it; the engine calls it through the base class every frame.' },
            { lines: '17-18', text: 'The speed is stored **per second**, not per frame. Designers can tune it in the Details panel and the meaning never changes with frame rate.' },
          ],
        },
        {
          type: 'code',
          title: 'RotatingPickup.cpp',
          code: `#include "RotatingPickup.h"

ARotatingPickup::ARotatingPickup() {
    // Ask the engine to register a tick function for us.
    PrimaryActorTick.bCanEverTick = true;
}

void ARotatingPickup::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);

    // degrees/second * seconds = degrees this frame
    const float Step = SpinSpeedDegrees * DeltaTime;
    AddActorLocalRotation(FRotator(0.f, Step, 0.f));
}`,
          annotations: [
            { lines: 5, text: 'Actors do **not** tick unless they ask to. `PrimaryActorTick` is the actor\'s built-in tick function; `bCanEverTick` must be set in the constructor.' },
            { lines: 9, text: 'Always call the parent version first. `AActor::Tick` is what fires the Blueprint **Event Tick** for Blueprint subclasses (more on this later).' },
            { lines: 12, text: 'The key line: a rate (per second) multiplied by a duration (seconds) gives an amount for *this* frame.' },
            { lines: 13, text: '`FRotator` takes (Pitch, Yaw, Roll) in degrees. Changing Yaw spins the pickup around its vertical axis.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does the engine call you instead of you writing the loop?',
          text: 'Because the order of work inside a frame matters enormously, and only the engine sees the whole picture. It decides which objects tick before physics and which after, skips everything while the game is paused, slows time for slow-motion effects, runs some work on other threads, and stops ticking objects that are being destroyed. If every actor ran its own loop, none of that coordination would be possible. This is the *inversion of control* you met with virtual functions: the framework calls your override.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'truefalse',
      prompt: 'In Unreal, `Tick` is called exactly 60 times per second unless you change a project setting.',
      answer: false,
      explanation:
        '`Tick` is called once per **rendered frame**, and the frame rate varies constantly: a fast PC might run at 144 fps, a console at 30 or 60, and any machine slows down in a busy scene. By default Unreal uses a *variable* time step. That is exactly why every Tick receives `DeltaTime` — so your code can measure how much time actually passed. (A fixed frame rate option exists in Project Settings, but it is not the default and is rarely what you want for gameplay.)',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'DeltaTime and frame-rate independence',
      blocks: [
        {
          type: 'p',
          text: 'Suppose you move an enemy 5 units every Tick. On a machine running at 30 fps it covers 150 units per second; at 144 fps it covers 720. Same code, nearly **five times** faster on the better PC. Players with high-end hardware would literally play a different game.',
        },
        {
          type: 'p',
          text: 'The fix is [[frame-rate-independence]]: express every change as a **rate per second** and multiply it by `DeltaTime`. Fast machines take many small steps, slow machines take few large ones, and both arrive at the same place after one second. Unreal\'s distance unit is the centimetre, so a speed of 300 means 3 m/s.',
        },
        {
          type: 'table',
          headers: ['Per-frame code', '30 fps', '60 fps', '144 fps'],
          rows: [
            ['`DeltaTime`', '≈ 0.0333 s', '≈ 0.0167 s', '≈ 0.00694 s'],
            ['`X += 5` per frame', '5 cm/frame → **150 cm/s**', '5 cm/frame → **300 cm/s**', '5 cm/frame → **720 cm/s**'],
            ['`X += 300 * DeltaTime`', '10 cm/frame → **300 cm/s**', '5 cm/frame → **300 cm/s**', '≈ 2.08 cm/frame → **300 cm/s**'],
          ],
          caption: 'Per-frame constants scale with frame rate; per-second rates times DeltaTime do not.',
        },
        {
          type: 'compare',
          left: {
            title: 'Per frame (frame-rate dependent)',
            tone: 'bad',
            code: `FVector Loc = GetActorLocation();
Loc.X += 5.f;            // cm per FRAME
SetActorLocation(Loc);`,
            text: 'Speed changes with the hardware, with scene complexity, even with V-Sync settings.',
          },
          right: {
            title: 'Per second × DeltaTime',
            tone: 'good',
            code: `FVector Loc = GetActorLocation();
Loc.X += MoveSpeed * DeltaTime; // 300 cm/s
SetActorLocation(Loc);`,
            text: 'Same distance per second on every machine. The units also read naturally: cm/s × s = cm.',
          },
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'A units check catches most mistakes',
          text: 'Before writing a Tick formula, say the units out loud. A *speed* is cm/s, so `Speed * DeltaTime` is cm — a distance you can add to a location. An *acceleration* is cm/s², so `Accel * DeltaTime` is cm/s — a change you add to a velocity. If the units do not line up, the formula is wrong.',
        },
        {
          type: 'deepdive',
          title: 'What exactly is in DeltaTime?',
          blocks: [
            {
              type: 'list',
              items: [
                '**It measures the previous frame.** The engine timestamps the start of each frame; `DeltaTime` is the gap between the last two timestamps. A hitch therefore shows up as one large `DeltaTime` on the *following* frame.',
                '**It is dilated.** Global time dilation (slow motion via `UGameplayStatics::SetGlobalTimeDilation`) and the actor\'s own `CustomTimeDilation` are already multiplied in. Code written with `DeltaTime` gets slow motion for free.',
                '**It is clamped.** World Settings limit how large a single frame\'s delta may be (the default maximum is 0.4 s), so a long freeze — dragging the window, a breakpoint — does not launch everything across the map.',
                '**It is available elsewhere.** Outside Tick, `GetWorld()->GetDeltaSeconds()` returns the same frame delta. `GetWorld()->GetTimeSeconds()` is total game time (stops while paused, dilates), whereas `GetRealTimeSeconds()` keeps counting wall-clock time.',
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: 'A rocket moves with the line below inside `Tick`. A tester at 60 fps measures 1,200 cm/s. How fast does it fly for a player running at 144 fps?',
      code: `SetActorLocation(GetActorLocation()
    + GetActorForwardVector() * 20.f);`,
      options: [
        { text: '1,200 cm/s — the engine normalises Tick to 60 fps', why: 'The engine does nothing of the sort. Tick is called once per frame at whatever rate the machine achieves.' },
        { text: '500 cm/s — more frames means less time per frame', why: 'That reasoning would apply if the code multiplied by `DeltaTime`. It does not, so each frame adds a full 20 cm regardless of how short the frame was.' },
        { text: '2,880 cm/s', correct: true, why: '20 cm per frame × 144 frames per second = 2,880 cm/s — 2.4 times the speed the tester saw.' },
        { text: 'It depends on the physics engine', why: '`SetActorLocation` moves the actor directly; physics is not involved in this calculation.' },
      ],
      explanation:
        'The rocket moves a fixed **20 cm per frame**, so its speed is `20 × fps`: 1,200 cm/s at 60 fps and 2,880 cm/s at 144 fps. The fix is to store a speed per second (`Speed = 1200.f`) and move `Speed * DeltaTime` each Tick. Bugs like this often go unnoticed because developers test on one machine.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Timers, smoothing, and who already applies DeltaTime',
      blocks: [
        {
          type: 'p',
          text: 'Movement is not the only per-frame change. Anything that **accumulates over time** — cooldowns, regeneration, charge-up meters, decay — follows the same rule. A countdown subtracts `DeltaTime` each frame until it reaches zero:',
        },
        {
          type: 'code',
          title: 'Turret.cpp',
          code: `void ATurret::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);

    if (FireCooldown > 0.f) {
        FireCooldown -= DeltaTime;
    }
    if (FireCooldown <= 0.f && HasTarget()) {
        Fire();
        FireCooldown += FireInterval;
    }

    // Smoothly turn toward the target
    const FRotator NewRot = FMath::RInterpTo(
        GetActorRotation(), TargetRotation, DeltaTime, 5.f);
    SetActorRotation(NewRot);
}`,
          annotations: [
            { lines: '4-6', text: 'Subtracting real seconds keeps the cooldown accurate at any frame rate: after 0.5 s worth of frames, exactly 0.5 has been removed. The `if` stops it sinking further below zero while there is no target — otherwise a long idle period would bank up a burst of instant shots.' },
            { lines: 9, text: '`+=` rather than `= FireInterval`: if this frame overshot zero by 0.01 s, that overshoot is carried into the next cooldown, so the average fire rate stays exact.' },
            { lines: '13-14', text: '`FMath::RInterpTo(Current, Target, DeltaTime, Speed)` is the rotator member of the `FInterpTo` family. It moves part of the remaining angle each frame, takes the shortest way around (359° → 1° is a 2° turn), and applies `DeltaTime` internally.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The classic smoothing trap: Lerp with a constant alpha',
          text: '`Value = FMath::Lerp(Value, Target, 0.1f);` every Tick looks smooth, but it closes 10% of the gap *per frame*. At 144 fps it converges far faster than at 30 fps. Use `FInterpTo` (or `VInterpTo` / `RInterpTo` for vectors and rotators) and pass `DeltaTime`.',
        },
        {
          type: 'p',
          text: 'Just as important is knowing when **not** to multiply. Several engine APIs take a rate and integrate it over the frame themselves. Multiplying by `DeltaTime` again makes the effect tiny and, ironically, frame-rate *dependent*.',
        },
        {
          type: 'table',
          headers: ['API', 'Pass DeltaTime yourself?', 'Why'],
          rows: [
            ['`SetActorLocation`, `AddActorWorldOffset`', '**Yes** — multiply your speed', 'They apply exactly the offset you give them, once.'],
            ['`FMath::FInterpTo` / `VInterpTo` / `RInterpTo`', '**Yes** — as an argument', 'The function needs to know the frame length to scale its step.'],
            ['`APawn::AddMovementInput`', '**No**', 'It records an input *direction*; the Character Movement Component applies speed and its own delta time.'],
            ['`UPrimitiveComponent::AddForce`', '**No**', 'A force is applied continuously; the physics solver integrates it over its own (sub)steps.'],
            ['`UPrimitiveComponent::AddImpulse`', '**No**', 'An impulse is a one-off instantaneous change, not a per-second rate.'],
          ],
        },
        {
          type: 'deepdive',
          title: 'FInterpTo is only *almost* frame-rate independent',
          blocks: [
            {
              type: 'p',
              text: 'Internally `FInterpTo` moves `Distance * Clamp(DeltaTime * Speed, 0, 1)` per frame. For small steps that approximates exponential decay well, but at very low frame rates (`DeltaTime * Speed` near or above 1) it diverges and simply snaps to the target. A mathematically exact frame-rate-independent version uses an exponential:',
            },
            {
              type: 'code',
              code: `// Exact exponential smoothing: same curve at any fps
const float Alpha = 1.f - FMath::Exp(-Sharpness * DeltaTime);
Value = FMath::Lerp(Value, Target, Alpha);`,
              annotations: [
                { lines: 2, text: 'After two frames of `dt` the remaining fraction is `e^(-k·dt)²` = `e^(-k·2dt)` — identical to one frame of `2dt`. That property is what makes it exact.' },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'fill',
      prompt: 'Complete this hover drone\'s Tick so it is frame-rate independent and keeps Blueprint behaviour working.',
      template: `void AHoverDrone::Tick(float DeltaTime) {
    Super::___(DeltaTime);

    FVector Loc = GetActorLocation();
    Loc.Z = FMath::___(Loc.Z, TargetHeight,
                       DeltaTime, 2.f);
    Loc.X += ForwardSpeed * ___;
    SetActorLocation(Loc);
}`,
      blanks: [{ answers: ['Tick'] }, { answers: ['FInterpTo'] }, { answers: ['DeltaTime'] }],
      wordBank: ['Tick', 'FInterpTo', 'DeltaTime', 'BeginPlay', 'Lerp', '0.016f'],
      explanation:
        '`Super::Tick` runs the parent class\'s per-frame work, including the Blueprint Event Tick. `FInterpTo` is the smoothing function that takes `DeltaTime` as its third argument (`Lerp` takes an alpha, not a delta, and has no fourth parameter). Finally the forward speed (cm/s) times `DeltaTime` (s) gives this frame\'s distance. Hard-coding `0.016f` assumes 60 fps — exactly the assumption we are trying to remove.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Configuring the tick function',
      blocks: [
        {
          type: 'p',
          text: '`PrimaryActorTick` is a struct of type `FActorTickFunction` that every actor owns. Its fields decide whether, when, and how often the actor ticks. You set the static ones in the **constructor**, and toggle the dynamic ones at runtime.',
        },
        {
          type: 'code',
          title: 'SentryTurret.cpp',
          code: `ASentryTurret::ASentryTurret() {
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.bStartWithTickEnabled = false;
    PrimaryActorTick.TickInterval = 0.1f; // 10 Hz
    PrimaryActorTick.TickGroup = TG_PrePhysics;
}

void ASentryTurret::OnPlayerSpotted() {
    SetActorTickEnabled(true);   // start scanning
}

void ASentryTurret::OnPlayerLost() {
    SetActorTickEnabled(false);  // back to zero cost
}`,
          annotations: [
            { lines: 2, text: '**Registration.** If this is false when play begins, the tick function is never registered with the engine at all, and nothing can turn it on later.' },
            { lines: 3, text: 'Registered but **asleep**. The turret pays nothing per frame until something wakes it.' },
            { lines: 4, text: 'Tick at most every 0.1 s instead of every frame. `DeltaTime` then holds the time since this actor last ticked (about 0.1 s), so `Speed * DeltaTime` math stays correct.' },
            { lines: 5, text: '`TG_PrePhysics` is the default for actors; it is written out here only for clarity.' },
            { lines: [9, 13], text: 'Cheap runtime switches. They only work because `bCanEverTick` was true at registration.' },
          ],
        },
        {
          type: 'table',
          headers: ['Setting', 'Set where', 'Meaning'],
          rows: [
            ['`bCanEverTick`', 'Constructor', 'May this actor *ever* tick? Controls whether the tick function is registered.'],
            ['`bStartWithTickEnabled`', 'Constructor', 'Is ticking on when play begins? (Default `true`.)'],
            ['`TickInterval`', 'Constructor, or `SetActorTickInterval()`', 'Minimum seconds between ticks; `0` means every frame.'],
            ['`TickGroup`', 'Constructor', 'Which phase of the frame this tick runs in (next card).'],
            ['`bTickEvenWhenPaused`', 'Constructor', 'Keep ticking while the game is paused (pause menus, UI effects).'],
            ['`SetActorTickEnabled(bool)`', 'Runtime', 'Turn a registered tick on or off.'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why two flags instead of one?',
          text: 'Registering a tick function means inserting it into the engine\'s tick task manager — the scheduler that sorts every tick function by group and dependency each frame. That is relatively expensive, so it happens once, when play begins (inside `AActor::BeginPlay`). Enabling and disabling a registered function is just flipping a flag, cheap enough to do on every overlap. Splitting "can ever" from "is now" lets the engine skip registration entirely for the majority of actors that never tick.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'The defaults',
          text: '`AActor` itself defaults to `bCanEverTick = false`. The C++ class wizard in the editor writes `PrimaryActorTick.bCanEverTick = true;` into every new actor\'s constructor for convenience — delete that line when the actor has nothing to do each frame. Blueprint actors with an Event Tick node tick automatically.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'truefalse',
      prompt: 'If an actor\'s constructor sets `PrimaryActorTick.bCanEverTick = false`, you can still start it ticking later by calling `SetActorTickEnabled(true)`.',
      answer: false,
      explanation:
        '`bCanEverTick` controls **registration**. When it is false at the moment play begins, the actor\'s tick function is never added to the engine\'s tick scheduler, and `SetActorTickEnabled` checks `bCanEverTick` and does nothing. If an actor needs to tick only sometimes, set `bCanEverTick = true` and `bStartWithTickEnabled = false`, then enable it when needed.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Tick groups: ordering work within a frame',
      blocks: [
        {
          type: 'p',
          text: 'Not all ticks happen at the same moment. Each frame is divided into [[tick-group|tick groups]] that run in a fixed order, with the physics simulation running in the middle. Which group your code is in decides whether it sees **this** frame\'s physics results or **last** frame\'s.',
        },
        {
          type: 'steps',
          items: [
            { title: '`TG_PrePhysics` (default)', text: 'Runs before physics. The right place for logic that *drives* physics or movement this frame: applying forces, moving kinematic objects, most gameplay.' },
            { title: '`TG_StartPhysics`', text: 'Engine-internal: kicks off the physics simulation.' },
            { title: '`TG_DuringPhysics`', text: 'Runs while physics simulates, possibly in parallel on another thread. Use it for work that neither reads nor writes physics state, such as updating UI values or cosmetic effects.' },
            { title: '`TG_EndPhysics`', text: 'Engine-internal: waits for the physics simulation to finish.' },
            { title: '`TG_PostPhysics`', text: 'Physics results are final. Use it for code that must react to where things ended up *this* frame: cameras following physics objects, weapon traces from a simulated muzzle, IK targets.' },
          ],
        },
        {
          type: 'code',
          title: 'FollowCameraComponent.cpp',
          code: `UFollowCameraComponent::UFollowCameraComponent() {
    PrimaryComponentTick.bCanEverTick = true;
    // Read the ball's position after physics moved it
    PrimaryComponentTick.TickGroup = TG_PostPhysics;
}

void UFollowCameraComponent::SetTarget(AActor* NewTarget) {
    Target = NewTarget;
    // Guarantee the target ticks before we do
    AddTickPrerequisiteActor(NewTarget);
}`,
          annotations: [
            { lines: 4, text: 'Components have their own tick function, `PrimaryComponentTick`, with the same fields as an actor\'s.' },
            { lines: 10, text: 'Within a group, order is otherwise unspecified. A **tick prerequisite** forces another actor (or component, via `AddTickPrerequisiteComponent`) to finish ticking before this one starts.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not simply tick everything after physics?',
          text: 'Because the dependency runs both ways. Code that pushes objects must run *before* the simulation, or its pushes only take effect next frame. Code that observes results must run *after* it, or it reads stale positions — the source of the classic "camera jitters one frame behind a physics object" bug. Tick groups make the dependency explicit, and `TG_DuringPhysics` lets independent work overlap with the simulation instead of waiting idle.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Keep it brief in practice',
          text: 'Most gameplay code is fine in the default `TG_PrePhysics`. Reach for other groups only when you can name the physics result you depend on, or the physics you must influence.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'order',
      prompt: 'Put these tick groups in the order they run during a single frame.',
      lines: ['TG_PrePhysics', 'TG_StartPhysics', 'TG_DuringPhysics', 'TG_EndPhysics', 'TG_PostPhysics'],
      explanation:
        'Pre-physics work prepares the frame (forces, movement), `StartPhysics` launches the simulation, `DuringPhysics` overlaps with it, `EndPhysics` waits for it to finish, and `PostPhysics` reacts to final positions. After these come `TG_PostUpdateWork` and a few engine-internal groups. The names are literal: the whole sequence is organised around the physics step.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: 'A camera component follows a physics-simulated rolling ball. Players notice the camera is always slightly behind the ball and jitters. The component uses default tick settings. What is the best fix?',
      options: [
        { text: 'Raise the camera\'s `TickInterval` so it updates less often', why: 'Ticking less often makes the lag *worse* and adds visible stepping. The problem is when the camera ticks, not how often.' },
        { text: 'Set the camera\'s `TickGroup` to `TG_DuringPhysics`', why: 'During physics the simulation is still running, so the ball\'s final position for this frame is not yet available.' },
        { text: 'Set the camera\'s `TickGroup` to `TG_PostPhysics`', correct: true, why: 'Post-physics ticks run after the simulation has finished, so the camera reads where the ball actually is this frame.' },
        { text: 'Multiply the camera\'s follow offset by `DeltaTime`', why: 'An offset is a distance, not a rate. Scaling it by `DeltaTime` would shrink the offset to almost nothing and vary it with frame rate.' },
      ],
      explanation:
        'With the default `TG_PrePhysics`, the camera runs *before* physics moves the ball, so it always positions itself using the ball\'s position from the previous frame. That one-frame lag varies with frame time and shows up as jitter. Moving the camera to `TG_PostPhysics` (optionally plus a tick prerequisite on the ball) makes it read this frame\'s final position.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Component ticking and the Super call',
      blocks: [
        {
          type: 'p',
          text: 'An [[actor-component]] has its own tick function, separate from its owner\'s. A component can tick while the actor does not, run in a different group, or use its own interval. This is how reusable behaviours such as stamina regeneration carry their per-frame logic with them.',
        },
        {
          type: 'code',
          title: 'StaminaComponent.h',
          code: `UCLASS(ClassGroup = (Custom),
       meta = (BlueprintSpawnableComponent))
class MYGAME_API UStaminaComponent : public UActorComponent {
    GENERATED_BODY()

public:
    UStaminaComponent();

    virtual void TickComponent(float DeltaTime,
        ELevelTick TickType,
        FActorComponentTickFunction* ThisTickFunction) override;

    void Spend(float Amount);

private:
    UPROPERTY(EditAnywhere, Category = "Stamina")
    float MaxStamina = 100.f;

    UPROPERTY(EditAnywhere, Category = "Stamina")
    float RegenPerSecond = 15.f;

    float Stamina = 100.f;
};`,
          annotations: [
            { lines: '9-11', text: 'Components override `TickComponent`, not `Tick`. `TickType` says what kind of world tick this is (a full tick, a paused tick, viewports only…); `ThisTickFunction` is the tick function being executed.' },
            { lines: 22, text: 'Runtime state that designers should not edit needs no `UPROPERTY`. A plain `float` is fine — [[uproperty|UPROPERTY]] matters for object pointers and for exposure, not for every member.' },
          ],
        },
        {
          type: 'code',
          title: 'StaminaComponent.cpp',
          code: `#include "StaminaComponent.h"

UStaminaComponent::UStaminaComponent() {
    PrimaryComponentTick.bCanEverTick = true;
    PrimaryComponentTick.bStartWithTickEnabled = false;
}

void UStaminaComponent::Spend(float Amount) {
    Stamina = FMath::Max(Stamina - Amount, 0.f);
    SetComponentTickEnabled(true);    // start regenerating
}

void UStaminaComponent::TickComponent(float DeltaTime,
    ELevelTick TickType,
    FActorComponentTickFunction* ThisTickFunction) {
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    Stamina = FMath::Min(Stamina + RegenPerSecond * DeltaTime,
                         MaxStamina);
    if (Stamina >= MaxStamina) {
        SetComponentTickEnabled(false);  // full: stop paying
    }
}`,
          annotations: [
            { lines: '4-5', text: 'Same pattern as the turret: able to tick, but asleep until there is something to regenerate.' },
            { lines: 16, text: 'The parent call. `UActorComponent::TickComponent` runs the Blueprint **Event Tick** if a Blueprint subclass implements one.' },
            { lines: '18-19', text: 'Rate × `DeltaTime`, clamped to the maximum. Regeneration is identical at any frame rate.' },
            { lines: 21, text: 'The component switches itself off once there is nothing left to do — ticking only while it matters.' },
          ],
        },
        {
          type: 'heading',
          text: 'What Super::Tick actually does',
        },
        {
          type: 'p',
          text: '`AActor::Tick` is not empty. Its most visible job is calling `ReceiveTick`, the function behind the **Event Tick** node, so Blueprint subclasses of your class get their per-frame event. It also performs base-class housekeeping such as updating latent actions (the machinery behind Blueprint `Delay` nodes). Skip `Super::Tick` and a designer\'s `BP_Grunt`, derived from your C++ enemy, silently stops running its Event Tick.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Tick does not run for objects that are not actors or components',
          text: 'A plain `UObject` has no tick function. If a non-actor object needs per-frame updates, let its owning actor or component drive it, or implement the engine\'s `FTickableGameObject` interface. Do not create a dummy actor just to get a Tick.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'A designer creates `BP_Grunt` as a child of your C++ `AEnemyBase` and adds logic to its Event Tick. The logic never runs, although `AEnemyBase::Tick` runs every frame. What is the most likely cause?',
      code: `AEnemyBase::AEnemyBase() {
    PrimaryActorTick.bCanEverTick = true;
}

void AEnemyBase::Tick(float DeltaTime) {
    UpdateAwareness(DeltaTime);
    UpdateAnimationState();
}`,
      options: [
        { text: 'Blueprint children of C++ classes can never use Event Tick', why: 'They can — as long as the C++ parent lets the Blueprint event fire. Plenty of shipped games do exactly this.' },
        { text: '`AEnemyBase::Tick` never calls `Super::Tick(DeltaTime)`', correct: true, why: 'The Blueprint Event Tick is fired from `AActor::Tick`. Without the `Super` call, that code never runs for this class or any subclass.' },
        { text: '`bCanEverTick` must also be set in the Blueprint\'s Class Defaults', why: 'The Blueprint inherits the C++ constructor\'s settings; the C++ Tick is running, which proves registration succeeded.' },
        { text: 'The Blueprint\'s tick group must be set to `TG_PostPhysics`', why: 'Tick groups change *when* a tick runs, not whether the Blueprint event fires.' },
      ],
      explanation:
        'When you override a virtual function in Unreal, the base version usually does real work. `AActor::Tick` calls `ReceiveTick` — the Blueprint Event Tick — and does housekeeping like updating latent actions. Make `Super::Tick(DeltaTime);` the first line of every Tick override (and `Super::TickComponent(...)` in components) unless you have a deliberate reason not to.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'bug',
      prompt: 'This component\'s `TickComponent` never runs, even after `SetComponentTickEnabled(true)`. Tap the line that causes it.',
      code: `UShieldComponent::UShieldComponent() {
    MaxShield = 50.f;
}

void UShieldComponent::BeginPlay() {
    Super::BeginPlay();
    Shield = MaxShield;
    PrimaryComponentTick.bCanEverTick = true;
}

void UShieldComponent::TickComponent(float DeltaTime,
    ELevelTick TickType,
    FActorComponentTickFunction* ThisTickFunction) {
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
    Shield = FMath::Min(Shield + 5.f * DeltaTime, MaxShield);
}`,
      bugLines: [8],
      hint: 'When is a component\'s tick function registered with the engine?',
      explanation:
        'Component tick functions are registered just **before** the component\'s `BeginPlay` runs, and only if `bCanEverTick` is already true at that moment. Setting it on line 8 is too late: the function was never registered, so it can never be enabled. Move `PrimaryComponentTick.bCanEverTick = true;` into the constructor (and use `bStartWithTickEnabled = false` if it should start asleep). The regeneration math on line 15 is fine — it correctly scales a per-second rate by `DeltaTime`.',
    },
  ],
  takeaways: [
    'The engine owns the game loop and calls `Tick(DeltaTime)` once per frame on actors and components that opt in.',
    'Express every per-frame change as a per-second rate multiplied by `DeltaTime`; per-frame constants make speed depend on the player\'s hardware.',
    '`DeltaTime` already includes time dilation; APIs like `AddMovementInput` and `AddForce` apply time themselves, so do not multiply them again.',
    '`bCanEverTick` (constructor only) controls registration; `SetActorTickEnabled` / `SetComponentTickEnabled` cheaply toggle a registered tick.',
    '`TickInterval` throttles a tick; `DeltaTime` then reports the time since that function last ran.',
    'Tick groups order work around physics: drive physics in `TG_PrePhysics`, read its results in `TG_PostPhysics`.',
    'Call `Super::Tick` / `Super::TickComponent` first — it runs the Blueprint Event Tick and base-class housekeeping.',
  ],
  reading: [
    {
      title: 'Actor Ticking',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-ticking-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s reference for tick functions, tick groups, prerequisites and component ticking.',
    },
    {
      title: 'Unreal Engine Actor Lifecycle',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle',
      source: 'unreal-docs',
      note: 'Shows where tick registration and BeginPlay fit into an actor\'s life.',
    },
    {
      title: 'Fix Your Timestep!',
      url: 'https://gafferongames.com/post/fix_your_timestep/',
      source: 'article',
      note: 'The classic article on variable vs fixed time steps — useful background for why DeltaTime exists and when physics wants a fixed step.',
    },
  ],
};
