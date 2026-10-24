import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'frame-rate-independence',
    term: 'Frame-Rate Independence',
    aliases: ['framerate independent', 'frame-rate independent'],
    course: 'unreal',
    category: 'Gameplay',
    short:
      'Writing per-frame code so the game behaves the same at any frame rate, by expressing changes as per-second rates multiplied by `DeltaTime`.',
    long:
      'A frame-rate-dependent update such as `X += 5` per frame moves 150 cm/s at 30 fps but 720 cm/s at 144 fps. Writing `X += Speed * DeltaTime` instead makes fast machines take many small steps and slow machines take fewer large ones, so both cover `Speed` centimetres per second.\n\nThe same rule applies to cooldowns, regeneration and smoothing: use `FMath::FInterpTo` with `DeltaTime` rather than `Lerp` with a constant alpha.',
    example: `// cm/s * s = cm this frame
Loc.X += MoveSpeed * DeltaTime;`,
    see: ['delta-time', 'tick'],
  },
  {
    id: 'tick-group',
    term: 'Tick Group',
    aliases: ['ETickingGroup', 'TG_PrePhysics', 'TG_PostPhysics'],
    course: 'unreal',
    category: 'Gameplay',
    short:
      'A phase of the frame in which a tick function runs. Groups run in a fixed order around the physics step: `TG_PrePhysics` (default), `TG_DuringPhysics`, `TG_PostPhysics` and others.',
    long:
      'Code that drives physics or movement belongs in `TG_PrePhysics`. Work that neither reads nor writes physics can run in `TG_DuringPhysics`, overlapping the simulation. Code that must see this frame\'s final physics positions — a camera following a simulated object, for example — belongs in `TG_PostPhysics`. Within a group, use tick prerequisites (`AddTickPrerequisiteActor`) to force an order.',
    example: `PrimaryComponentTick.TickGroup = TG_PostPhysics;`,
    see: ['tick', 'physics-simulation'],
  },
  {
    id: 'time-dilation',
    term: 'Time Dilation',
    aliases: ['CustomTimeDilation', 'global time dilation', 'slow motion'],
    course: 'unreal',
    category: 'Gameplay',
    short:
      'A multiplier on game time. Global time dilation slows or speeds the whole world; an actor\'s `CustomTimeDilation` scales only that actor\'s `DeltaTime`.',
    long:
      '`UGameplayStatics::SetGlobalTimeDilation(this, 0.25f)` makes the world run at quarter speed: `DeltaTime`, world timers and physics all slow down. `CustomTimeDilation` on a single actor multiplies the `DeltaTime` passed to its Tick, but world timers are not affected by it, because the timer manager uses the world\'s delta time.',
    see: ['delta-time', 'timer-manager'],
  },
  {
    id: 'ftimerdelegate',
    term: 'FTimerDelegate',
    course: 'unreal',
    category: 'Gameplay',
    short:
      'The delegate type a timer calls when it fires. Create one with `CreateUObject`, `CreateWeakLambda` or `CreateLambda` to pass extra arguments or run a lambda.',
    long:
      'The simple `SetTimer(Handle, this, &AMyActor::Func, Rate)` overload builds an `FTimerDelegate` for you. Build one yourself when the callback needs payload arguments or is a lambda. UObject-bound and weak-lambda delegates check that their object is still alive before running; a plain `CreateLambda` does not, so a captured `this` can dangle.',
    example: `FTimerDelegate D = FTimerDelegate::CreateUObject(
    this, &ABomb::Explode, 150.f);
GetWorldTimerManager().SetTimer(Handle, D, 3.f, false);`,
    see: ['timer-manager', 'ftimerhandle', 'delegate'],
  },
  {
    id: 'unreal-insights',
    term: 'Unreal Insights',
    aliases: ['Insights', 'Timing Insights'],
    course: 'unreal',
    category: 'Debugging',
    short:
      'Unreal\'s profiling tool. It records a trace of what every thread did each frame, so you can see exactly which ticks, functions and systems consumed your frame time.',
    long:
      'Run the game with tracing enabled (for example the `-trace=default` command-line argument, or the Trace controls in the editor), then open the trace in Unreal Insights. The Timing view shows a timeline of nested CPU scopes per thread. Add your own scopes with `TRACE_CPUPROFILER_EVENT_SCOPE(Name)`, and pass `-statnamedevents` to see individual actor tick names.',
    see: ['tick', 'console-command'],
  },
  {
    id: 'significance-manager',
    term: 'Significance Manager',
    aliases: ['USignificanceManager'],
    course: 'unreal',
    category: 'Performance',
    short:
      'An engine plugin that scores registered objects by how much they matter to the player (distance, visibility…) so you can reduce the tick rate or detail of insignificant ones.',
    long:
      'You register objects with a significance function, and the manager calls it each frame from the viewers\' points of view. A post-significance callback then lets you, for example, tick a distant enemy every 0.5 s and a nearby one every frame. It is a framework for your own rules, not an automatic optimisation.',
    see: ['tick'],
  },
];
