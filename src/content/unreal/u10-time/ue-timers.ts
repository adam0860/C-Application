import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-timers',
  title: 'Timers with FTimerManager',
  summary:
    'Run code later or repeatedly without Tick: SetTimer, handles, delegates and lambdas, and the lifetime rules that keep timers from crashing your game.',
  minutes: 17,
  objectives: [
    'Start one-shot and looping timers with `SetTimer`, including a first delay',
    'Query, pause and clear timers through an `FTimerHandle`',
    'Pass arguments and lambdas with `FTimerDelegate`, choosing `CreateUObject` or `CreateWeakLambda` to stay lifetime-safe',
    'Predict how timers behave under pause, time dilation and level changes, and clean them up in `EndPlay`',
    'Decide between a timer and a Tick countdown for a given gameplay feature',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Doing something later',
      blocks: [
        {
          type: 'p',
          text: 'Gameplay is full of delays: a grenade explodes three seconds after it is thrown, a turret fires every half second, health regenerates after you avoid damage for a while. You *could* count down in `Tick`, but then the actor pays for a tick every frame just to watch a number shrink.',
        },
        {
          type: 'p',
          text: 'Instead, ask the world\'s [[timer-manager]] to call you back. You describe *what* to call and *when*, and receive an [[ftimerhandle]] that identifies the timer so you can query or cancel it later.',
        },
        {
          type: 'code',
          title: 'Grenade.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Grenade.generated.h"

UCLASS()
class MYGAME_API AGrenade : public AActor {
    GENERATED_BODY()

protected:
    virtual void BeginPlay() override;

private:
    void Explode();

    UPROPERTY(EditDefaultsOnly, Category = "Grenade")
    float FuseSeconds = 3.f;

    FTimerHandle FuseTimerHandle;
};`,
          annotations: [
            { lines: 15, text: 'The callback is an ordinary member function: `void`, no parameters. For this overload of `SetTimer` it does **not** need to be a `UFUNCTION`.' },
            { lines: 20, text: 'A handle is a small value type (essentially a 64-bit id). Store it as a member so other functions can cancel or inspect the timer.' },
          ],
        },
        {
          type: 'code',
          title: 'Grenade.cpp',
          code: `#include "Grenade.h"
#include "TimerManager.h"

void AGrenade::BeginPlay() {
    Super::BeginPlay();

    GetWorldTimerManager().SetTimer(
        FuseTimerHandle,     // out: identifies the timer
        this,                // object to call
        &AGrenade::Explode,  // member function to call
        FuseSeconds,         // seconds until it fires
        false);              // loop? no: fire once
}

void AGrenade::Explode() {
    UE_LOG(LogTemp, Log, TEXT("%s exploded"), *GetName());
    // ... apply damage, spawn effects ...
    Destroy();
}`,
          annotations: [
            { lines: 2, text: '`GetWorldTimerManager()` returns an `FTimerManager&`, but calling member functions on it needs the full class definition, which lives in this header.' },
            { lines: 7, text: '`GetWorldTimerManager()` is an `AActor` helper. Components and other objects use `GetWorld()->GetTimerManager()` — the same object.' },
            { lines: 10, text: 'A **pointer to member function** (from the C++ course): `&AGrenade::Explode` names the function without calling it. The manager will call it on `this` later.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is a timer cheaper than a countdown in Tick?',
          text: 'The timer manager keeps active timers in a **binary heap** ordered by expiry time. Each frame it only looks at the earliest one: if that has not expired, nothing else can have either, so it stops. A thousand waiting grenades cost almost nothing per frame, and the grenades themselves need no tick at all. A Tick countdown, by contrast, costs a full tick-function dispatch per actor per frame, even when nothing happens.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Not in the constructor',
          text: 'Set timers in `BeginPlay` or later. Constructors also run for the [[cdo|Class Default Object]] and in the editor, where there is no game world — `GetWorld()` can be null and there is nothing meaningful to schedule.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'SetTimer in full: looping and first delays',
      blocks: [
        {
          type: 'p',
          text: 'The member-function overload of `SetTimer` has two more optional parameters. Together they cover nearly every "after X seconds" and "every Y seconds" need:',
        },
        {
          type: 'code',
          title: 'SentryGun.cpp',
          code: `void ASentryGun::Activate() {
    // Warm up for 1.5 s, then fire every 0.25 s
    GetWorldTimerManager().SetTimer(
        FireTimerHandle, this, &ASentryGun::FireShot,
        0.25f,    // Rate: seconds between calls
        true,     // bLoop: keep repeating
        1.5f);    // FirstDelay: wait before the first call
}

void ASentryGun::Deactivate() {
    GetWorldTimerManager().ClearTimer(FireTimerHandle);
}`,
          annotations: [
            { lines: 5, text: 'For a looping timer, the interval between calls. For a one-shot timer, the delay before the single call.' },
            { lines: 7, text: '`FirstDelay` overrides the delay before the **first** call only. Omit it (or pass a negative number) and the first call comes after `Rate` seconds.' },
            { lines: 11, text: '`ClearTimer` cancels the timer and invalidates the handle.' },
          ],
        },
        {
          type: 'table',
          headers: ['Parameter', 'Default', 'Meaning'],
          rows: [
            ['`InOutHandle`', '—', 'Filled in with the new timer\'s id. If it already refers to an active timer, that timer is **replaced**.'],
            ['`InObj`, `InTimerMethod`', '—', 'Object and member function to call.'],
            ['`InRate`', '—', 'Seconds. A value `<= 0` does not start a timer; it **clears** the one in the handle.'],
            ['`InbLoop`', '`false`', 'Repeat every `InRate` seconds until cleared.'],
            ['`InFirstDelay`', '`-1.f`', 'Delay before the first call; negative means "use `InRate`".'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Restarting is free',
          text: 'Because `SetTimer` replaces whatever the handle referred to, "restart the countdown" is just calling `SetTimer` again with the same handle. That is the standard way to build "regenerate health 3 seconds after the last hit": every hit calls `SetTimer(RegenDelayHandle, …, 3.f, false)`, pushing the deadline back.',
        },
        {
          type: 'deepdive',
          title: 'Timers fire on frame boundaries — and can fire several times at once',
          blocks: [
            {
              type: 'p',
              text: 'Timers are checked once per frame, so a callback runs at the first frame *after* its deadline, never in between frames. A 0.25 s timer at 30 fps (≈ 0.033 s frames) fires on the frame where the accumulated time first passes 0.25 s, typically a few milliseconds late.',
            },
            {
              type: 'p',
              text: 'If a looping timer\'s rate is shorter than a frame, the manager **catches up**: it works out how many intervals elapsed and calls the delegate that many times, back to back, in the same frame. A 0.01 s looping timer at 30 fps runs about three times per frame. The *count* is correct, but the calls are not spread out in time — so a timer can never be "smoother" than the frame rate. For genuinely continuous behaviour, use Tick with `DeltaTime`.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'When does `Pulse` run, assuming the call happens at time 0?',
      code: `GetWorldTimerManager().SetTimer(
    PulseHandle, this, &AHealingTotem::Pulse,
    2.f, true, 0.5f);`,
      options: [
        { text: 'At 2.0 s, then every 0.5 s', why: 'This swaps the two numbers. The fourth argument is the rate (interval), the sixth is the first delay.' },
        { text: 'At 0.5 s, then every 2.0 s (2.5 s, 4.5 s, …)', correct: true, why: 'The first call waits `FirstDelay` (0.5 s); subsequent calls are `Rate` (2 s) apart because `bLoop` is true.' },
        { text: 'Immediately, then every 2.0 s', why: 'Timers never call back synchronously inside `SetTimer`; the earliest call is on a later frame, here after the 0.5 s first delay.' },
        { text: 'At 2.5 s, then every 2.0 s', why: 'The first delay *replaces* the first interval; it is not added to it.' },
      ],
      explanation:
        'The arguments are `(Handle, Object, Method, Rate, bLoop, FirstDelay)`. `FirstDelay` controls only the wait before the very first call; after that a looping timer repeats every `Rate` seconds. This lets a totem pulse almost immediately when placed, then settle into its regular rhythm.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'Calling `SetTimer` with a handle that is already running a timer starts a second timer in parallel with the first.',
      answer: false,
      explanation:
        'A handle identifies at most one timer. When you pass a handle that refers to an active timer, `SetTimer` clears the old timer first and the handle then refers to the new one. That makes "restart the countdown" trivial — and means two independent timers need two separate `FTimerHandle` members.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Handles: query, pause and clear',
      blocks: [
        {
          type: 'p',
          text: 'The handle is your remote control. A dash ability can use one timer both to enforce a cooldown and to show the remaining time in the HUD, with no Tick anywhere:',
        },
        {
          type: 'code',
          title: 'DashComponent.cpp',
          code: `void UDashComponent::TryDash() {
    FTimerManager& Timers = GetWorld()->GetTimerManager();

    if (Timers.IsTimerActive(CooldownHandle)) {
        const float Left =
            Timers.GetTimerRemaining(CooldownHandle);
        UE_LOG(LogTemp, Log, TEXT("Dash ready in %.1f s"), Left);
        return;
    }

    PerformDash();
    Timers.SetTimer(CooldownHandle, this,
        &UDashComponent::OnCooldownFinished,
        CooldownSeconds, false);
}

float UDashComponent::GetCooldownPercent() const {
    const FTimerManager& Timers = GetWorld()->GetTimerManager();
    const float Left = Timers.GetTimerRemaining(CooldownHandle);
    return Left > 0.f ? Left / CooldownSeconds : 0.f;
}`,
          annotations: [
            { lines: 2, text: 'A component has no `GetWorldTimerManager()`; it reaches the same manager through its world.' },
            { lines: 4, text: '`IsTimerActive` is true while the timer exists and is not paused. Once a one-shot timer fires, it is removed and this returns false.' },
            { lines: '5-6', text: '`GetTimerRemaining` returns seconds until the next call, or `-1.f` if the handle does not refer to a timer.' },
            { lines: '17-21', text: 'A HUD widget can call this to draw a cooldown ring. The timer already knows the time left, so nothing needs to tick to track it.' },
          ],
        },
        {
          type: 'table',
          headers: ['Call', 'What it does'],
          rows: [
            ['`ClearTimer(Handle)`', 'Cancels the timer and resets the handle to invalid.'],
            ['`IsTimerActive(Handle)`', '`true` if the timer exists and is not paused.'],
            ['`TimerExists(Handle)`', '`true` if it exists, paused or not.'],
            ['`PauseTimer` / `UnPauseTimer`', 'Freeze and resume an individual timer, keeping its remaining time.'],
            ['`GetTimerRemaining(Handle)`', 'Seconds until it fires next; `-1.f` if there is no such timer.'],
            ['`GetTimerElapsed(Handle)`', 'Seconds since it was set (or last looped); `-1.f` if none.'],
            ['`Handle.IsValid()`', 'Whether the handle was ever assigned — **not** whether the timer is still running.'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a handle instead of a pointer to the timer?',
          text: 'The manager stores timers in its own array and reuses slots as timers come and go. A raw pointer to a timer would dangle the moment that slot was recycled. An `FTimerHandle` instead packs a slot **index** and a **serial number**. When you query with an old handle, the manager checks the serial: if the slot now holds a different timer, the handle simply matches nothing. Stale handles are harmless — the same idea you will see in weak object pointers.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'IsValid() is not IsTimerActive()',
          text: 'After a one-shot timer fires, its handle still holds the old id, so `Handle.IsValid()` stays `true` even though the timer is gone. Ask the manager (`IsTimerActive`, `TimerExists`) when you want to know whether a timer is running.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'fill',
      prompt: 'Health should regenerate every second, starting 3 seconds after the last hit, and stop the moment the character takes damage. Fill in the blanks.',
      template: `void APlayerChar::StartRegen() {
    GetWorldTimerManager().___(RegenHandle, this,
        &APlayerChar::RegenPulse, ___, ___, 3.f);
}

void APlayerChar::OnDamaged(float Amount) {
    Health -= Amount;
    GetWorldTimerManager().___(RegenHandle);
    StartRegen();   // restart the 3 s delay
}`,
      blanks: [
        { answers: ['SetTimer'] },
        { answers: ['1.f', '1.0f', '1'] },
        { answers: ['true'] },
        { answers: ['ClearTimer'] },
      ],
      wordBank: ['SetTimer', '1.f', 'true', 'ClearTimer', 'false', '3.f', 'StopTimer', 'StartTimer'],
      explanation:
        '`SetTimer(Handle, Object, Method, Rate, bLoop, FirstDelay)`: rate `1.f` with `bLoop = true` pulses every second, and the first delay of `3.f` gives the 3-second grace period. `ClearTimer` cancels regeneration on damage. (Strictly, `StartRegen` calling `SetTimer` on the same handle would replace the timer anyway, but clearing first states the intent and keeps the code correct if the restart is ever removed.) There is no `StopTimer` or `StartTimer` in `FTimerManager`.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'FTimerDelegate: arguments, lambdas and lifetimes',
      blocks: [
        {
          type: 'p',
          text: 'The member-function overload covers `void Func()` callbacks. When the callback needs **arguments**, or is easiest written inline as a **lambda**, build an [[ftimerdelegate]] yourself and pass it to `SetTimer`. A [[delegate]] is Unreal\'s type-safe "callable thing" — a member function bound to an object, or a lambda.',
        },
        {
          type: 'code',
          title: 'ExplosiveBarrel.cpp',
          code: `void AExplosiveBarrel::Ignite() {
    // 1) Member function with a payload argument
    const FTimerDelegate ExplodeDelegate =
        FTimerDelegate::CreateUObject(
            this, &AExplosiveBarrel::Explode, 150.f);
    GetWorldTimerManager().SetTimer(
        FuseHandle, ExplodeDelegate, 2.f, false);

    // 2) Weak lambda: skipped if the barrel is gone
    GetWorldTimerManager().SetTimer(FlashHandle,
        FTimerDelegate::CreateWeakLambda(this, [this]() {
            Mesh->SetVisibility(!Mesh->IsVisible());
        }),
        0.2f, true);
}

void AExplosiveBarrel::Explode(float Damage) {
    GetWorldTimerManager().ClearTimer(FlashHandle);
    // ... apply Damage in a radius, then Destroy() ...
}`,
          annotations: [
            { lines: '4-5', text: '`CreateUObject` binds a member function to a UObject. Extra arguments after the function pointer are **payload**: stored in the delegate and passed to `Explode(float Damage)` when it fires.' },
            { lines: 11, text: '`CreateWeakLambda(Object, Lambda)` ties the lambda to `this` through a weak pointer. If the barrel has been destroyed, the delegate counts as unbound and the timer manager skips it.' },
            { lines: 12, text: 'Inside the lambda, `this` is only dereferenced when the weak check has already confirmed the barrel is alive.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Plain lambda capturing this',
            tone: 'bad',
            code: `FTimerDelegate::CreateLambda([this]() {
    Mesh->SetVisibility(false);
});
// also unsafe: SetTimer(H, [this]{...}, 1.f, false)`,
            text: 'The delegate has no idea who `this` belongs to. If the actor is destroyed first, the lambda still runs on a dead object — after garbage collection, on freed memory.',
          },
          right: {
            title: 'Bound to the object\'s lifetime',
            tone: 'good',
            code: `FTimerDelegate::CreateWeakLambda(this, [this]() {
    Mesh->SetVisibility(false);
});
// or: FTimerDelegate::CreateUObject(this, &AMy::Hide)`,
            text: 'The delegate holds a weak reference to the object and refuses to run once it is gone.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why lambdas need extra care in Unreal',
          text: 'In the C++ course you saw that a lambda capturing `this` or a reference is only safe while the captured objects outlive the lambda. A timer is the textbook case of a lambda outliving its creator: it sits in the world\'s timer manager, which lives longer than any actor. `CreateUObject` and `CreateWeakLambda` solve this by storing a [[tweakobjectptr|weak object pointer]] and checking it before every call. Capturing locals by reference (`[&]`) is never safe in a timer: the function that created them has long returned.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'bug',
      prompt: 'A single-use trap destroys itself when triggered. Testers report rare crashes about 5 seconds after a trap goes off. Tap the line that makes this possible.',
      code: `void ATrap::Arm() {
    GetWorldTimerManager().SetTimer(RearmHandle,
        FTimerDelegate::CreateLambda([this]() {
            bIsArmed = true;
            Mesh->SetMaterial(0, ArmedMaterial);
        }),
        5.f, false);
}

void ATrap::OnTriggered(AActor* Victim) {
    ApplyTrapDamage(Victim);
    Destroy();   // single-use trap
}`,
      bugLines: [3],
      hint: 'What happens to a pending timer when the object it captured is destroyed?',
      explanation:
        'Line 3 creates a plain lambda that captures a raw `this`. If the trap is triggered and destroyed within those 5 seconds, the timer still fires, and the lambda writes to a destroyed actor — once garbage collection has freed it, that is a use-after-free and a crash. Because a plain lambda has no owning object, the timer manager cannot skip it, and `ClearAllTimersForObject(this)` cannot find it either. Fix: use `FTimerDelegate::CreateWeakLambda(this, …)` or `CreateUObject` with a member function, and/or clear `RearmHandle` in `EndPlay`.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Timers and the world: pause, dilation, next tick, EndPlay',
      blocks: [
        {
          type: 'p',
          text: 'The timer manager belongs to the [[world|UWorld]], and it advances using the world\'s clock. That one fact explains most of its behaviour:',
        },
        {
          type: 'list',
          items: [
            '**Pause stops timers.** While the game is paused, the world does not tick its timer manager, so a 10-second bomb fuse freezes along with everything else.',
            '**Global [[time-dilation]] scales timers.** At a global dilation of 0.5, a 2-second timer takes 4 real seconds — slow motion just works.',
            '**An actor\'s `CustomTimeDilation` does not.** It scales the `DeltaTime` passed to that actor\'s Tick, but the timer manager is shared by the whole world and uses the world\'s delta.',
            '**Level changes destroy world timers.** The world is torn down, and its timers with it. For something that must survive a map change (a session clock, an autosave), use the [[game-instance|GameInstance]]\'s own timer manager: `GetGameInstance()->GetTimerManager()`.',
          ],
        },
        {
          type: 'p',
          text: 'Two more tools complete the set. `SetTimerForNextTick` runs a callback once on the next frame — handy when you must wait for other actors to finish starting up. And `ClearAllTimersForObject` cancels every timer bound to an object, which belongs in `EndPlay`:',
        },
        {
          type: 'code',
          title: 'WaveSpawner.cpp',
          code: `void AWaveSpawner::BeginPlay() {
    Super::BeginPlay();
    // Other level actors may not have run BeginPlay yet.
    // By next frame, all of them have.
    GetWorldTimerManager().SetTimerForNextTick(
        this, &AWaveSpawner::RegisterWithDirector);

    GetWorldTimerManager().SetTimer(WaveHandle, this,
        &AWaveSpawner::SpawnWave, 30.f, true, 5.f);
}

void AWaveSpawner::EndPlay(
    const EEndPlayReason::Type EndPlayReason) {
    GetWorldTimerManager().ClearAllTimersForObject(this);
    Super::EndPlay(EndPlayReason);
}`,
          annotations: [
            { lines: '5-6', text: 'Runs `RegisterWithDirector` once, on the next frame. It returns an `FTimerHandle` if you need to cancel it.' },
            { lines: 14, text: 'Cancels every timer whose delegate is bound to this object (`CreateUObject` / method-pointer timers and weak lambdas). Plain lambdas have no owner, so only their handles can clear them.' },
            { lines: 15, text: 'Do your own cleanup first, then let the parent finish ending play.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why clear timers if UObject-bound delegates are already safe?',
          text: 'The weak check only protects delegates that know their object. Clearing in `EndPlay` also covers what it misses: plain-lambda and `TFunction` timers, which have no owner to check; and objects that end play **without** being destroyed — for example, when a streaming level is hidden but kept loaded, its actors receive `EndPlay` and stay in memory, so their UObject-bound timers would keep firing. It also states intent clearly: when this object leaves play, nothing it scheduled should run.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which statements about timers set with `GetWorldTimerManager()` are true? Select all that apply.',
      options: [
        { text: 'They do not advance while the game is paused', correct: true, why: 'The world skips ticking its timer manager while paused, so remaining times freeze.' },
        { text: 'They slow down when global time dilation is reduced', correct: true, why: 'The timer manager advances by the world\'s dilated delta time.' },
        { text: 'They slow down when the owning actor\'s `CustomTimeDilation` is reduced', why: '`CustomTimeDilation` only scales the `DeltaTime` given to that actor\'s Tick. Timers live in the world-wide manager, which ignores per-actor dilation.' },
        { text: 'They keep running after the player travels to a new level', why: 'World timers die with their world. Use the GameInstance\'s timer manager for timers that must survive map changes.' },
        { text: 'A looping timer with a rate shorter than a frame can fire several times in one frame', correct: true, why: 'The manager catches up by calling the delegate once for each elapsed interval, back to back.' },
      ],
      explanation:
        'All of these follow from one design decision: world timers are owned by the `UWorld` and advanced with the world\'s clock. Pause and global dilation change that clock, so timers follow. Per-actor dilation does not change it. Destroying the world (level travel) destroys the timers. And since the clock advances in frame-sized steps, short looping timers fire in bursts.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Timers or Tick?',
      blocks: [
        {
          type: 'p',
          text: 'Timers and Tick are complementary. A useful rule: **Tick is for continuous change, timers are for discrete events.** Movement, interpolation and anything that should look smooth every frame belongs in Tick. "Do this once after N seconds" or "do this every N seconds" belongs in a timer.',
        },
        {
          type: 'table',
          headers: ['Need', 'Use', 'Why'],
          rows: [
            ['Explode 3 s after landing', 'One-shot timer', 'A single future event; no per-frame cost while waiting.'],
            ['Burn damage every 0.5 s', 'Looping timer', 'Discrete pulses at a fixed interval.'],
            ['Show a cooldown bar', 'Timer + `GetTimerRemaining`', 'The timer already tracks the time; the widget reads it when drawing.'],
            ['Homing missile steering', 'Tick', 'Direction must update smoothly every frame.'],
            ['Fade a light from 1 to 0 over 2 s', 'Tick (enabled only while fading)', 'Continuous change; turn the tick off when done.'],
            ['Wait for other actors to initialise', '`SetTimerForNextTick`', 'You need "one frame later", not a duration.'],
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'The cost model',
          text: 'A waiting timer costs nothing per frame beyond the manager\'s single check of its earliest deadline. Adding or firing a timer is a heap operation, *O(log n)* in the number of active timers. A ticking actor costs a dispatch every frame for as long as it ticks. That is why "replace a Tick countdown with a timer" is one of the most common optimisations in Unreal code reviews — the next lesson goes further.',
        },
        {
          type: 'deepdive',
          title: 'Inside FTimerManager',
          blocks: [
            {
              type: 'list',
              items: [
                'Timer data lives in a sparse array; handles encode the slot index plus a serial number so stale handles cannot match a reused slot.',
                'Active timers sit in a binary heap keyed on their expiry time, measured on the manager\'s own internal clock, which advances by the world\'s delta each frame.',
                'Each frame, while the heap\'s top has expired, the manager pops it, computes how many intervals have elapsed (for looping timers), calls the delegate that many times, and re-inserts looping timers with a new expiry.',
                'Delegates whose object has died report themselves as unbound and are skipped and removed instead of being called.',
                'Callbacks may set or clear timers — including the one currently executing — and the manager keeps track of changes made mid-update so the heap stays consistent.',
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'A poison effect must deal 4 damage every 0.5 s for 6 s, then end. Which implementation fits best?',
      options: [
        { text: 'Enable Tick and subtract `8.f * DeltaTime` from health every frame for 6 s', why: 'That spreads the damage continuously, which changes the design (no discrete hits for numbers or sounds), and it pays for a tick every frame.' },
        { text: 'A looping 0.5 s timer that applies 4 damage, counts its pulses, and clears itself after the 12th', correct: true, why: 'Discrete pulses at a fixed interval are exactly what looping timers are for, and clearing the handle ends the effect cleanly.' },
        { text: 'Call `SetTimerForNextTick` from inside the callback each frame and check the elapsed time', why: 'That re-implements Tick with extra overhead. `SetTimerForNextTick` is for "one frame later", not for intervals.' },
        { text: 'Twelve one-shot timers set at once, at 0.5 s, 1.0 s, … 6.0 s', why: 'It works, but needs twelve handles to cancel the effect (for example when the player drinks an antidote). One looping timer is simpler and cheaper.' },
      ],
      explanation:
        'Ask whether the change is continuous or discrete. Poison "ticks" are discrete events, each with a hit number or sound, so a looping timer models them directly. A counter (or a second one-shot timer for the 6 s duration) ends the effect, and a single `ClearTimer` cancels it early. This approach costs nothing between pulses.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'order',
      prompt: 'Arrange the lines to start a looping, lifetime-safe blink timer on a pickup.',
      lines: [
        'FTimerDelegate Blink = FTimerDelegate::CreateWeakLambda(',
        '    this, [this]() {',
        '        Glow->ToggleVisibility();',
        '    });',
        'GetWorldTimerManager().SetTimer(',
        '    BlinkHandle, Blink, 0.5f, true);',
      ],
      distractors: ['FTimerDelegate Blink = FTimerDelegate::CreateLambda([this]() {'],
      explanation:
        'First build the delegate: `CreateWeakLambda` takes the owning object, then the lambda. Then pass the delegate to the `SetTimer` overload that accepts `(Handle, Delegate, Rate, bLoop)`. The `CreateLambda` line is the trap: a plain lambda capturing `this` keeps running even after the pickup is destroyed.',
    },
  ],
  takeaways: [
    '`SetTimer(Handle, this, &AMyActor::Func, Rate, bLoop, FirstDelay)` schedules a member function; the callback needs no `UFUNCTION`.',
    'An `FTimerHandle` is an index plus serial number: store it to clear, pause or query the timer; reusing it with `SetTimer` replaces the old timer.',
    'Use `FTimerDelegate::CreateUObject` for payload arguments and `CreateWeakLambda` for lambdas; a plain `CreateLambda` capturing `this` can run on a destroyed object.',
    'World timers freeze while paused, follow global time dilation (not `CustomTimeDilation`), and die with the world; the GameInstance has its own timer manager.',
    'Clear timers in `EndPlay` with `ClearAllTimersForObject(this)`; plain-lambda timers can only be cleared through their handles.',
    'Tick is for continuous change; timers are for discrete events. Waiting timers cost nothing per frame.',
  ],
  reading: [
    {
      title: 'Gameplay Timers',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-timers-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s overview of FTimerManager, handles, and the pause/clear API.',
    },
    {
      title: 'Lambda expressions',
      url: 'https://en.cppreference.com/w/cpp/language/lambda',
      source: 'cppreference',
      note: 'Revisit the capture rules — especially what capturing `this` really stores — before writing timer lambdas.',
    },
    {
      title: 'Actor Ticking',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-ticking-in-unreal-engine',
      source: 'unreal-docs',
      note: 'The other half of the timing story; compare what a tick function costs with a waiting timer.',
    },
  ],
};
