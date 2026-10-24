import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-performance-tick',
  title: 'Tick Performance and Event-Driven Design',
  summary:
    'Why thousands of ticking actors drain the frame budget, how to tick less (or not at all), and how to measure before you optimise.',
  minutes: 17,
  objectives: [
    'Estimate what ticking costs against a 16.7 ms frame budget',
    'Disable, sleep and throttle ticks with `bCanEverTick`, `SetActorTickEnabled` and tick intervals',
    'Replace per-frame polling with events: overlaps, delegates and timers',
    'Find game-thread bottlenecks with `stat unit`, `stat game`, `dumpticks` and Unreal Insights',
    'Describe aggregated ticking and significance-based ticking for large numbers of objects',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The frame budget',
      blocks: [
        {
          type: 'p',
          text: 'Every frame has a hard deadline. To hit 60 fps, *everything* — gameplay, animation, physics, audio, rendering preparation — must fit into about 16.7 ms. Gameplay ticks run on the **game thread**, which shares that budget with movement, AI, animation updates and much more. Ticks are rarely the whole problem, but they are the part *you* control most directly.',
        },
        {
          type: 'table',
          headers: ['Target', 'Frame budget', 'Typical platform'],
          rows: [
            ['30 fps', '33.3 ms', 'Older consoles, cinematic or low-end targets'],
            ['60 fps', '16.7 ms', 'Most action games on console and PC'],
            ['90 fps', '11.1 ms', 'Many VR headsets (dropped frames cause discomfort)'],
            ['120 fps', '8.3 ms', 'Competitive shooters, high-refresh displays'],
          ],
        },
        {
          type: 'p',
          text: 'Now multiply. A level with 5,000 coins, torches and props that all tick — even with nearly empty Tick bodies — might cost around 2 µs each once scheduling and memory access are counted. That is 10 ms, **60% of a 60 fps frame**, spent mostly on objects that did nothing. (The 2 µs is illustrative; your numbers depend on hardware and code. That is why we will measure.)',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does an empty Tick cost anything?',
          text: 'Each frame the engine\'s tick task manager must gather every enabled tick function, sort it into its tick group, respect prerequisites, and dispatch it through a virtual call. Each actor lives at a different place on the heap, so touching thousands of them causes thousands of **cache misses** — the CPU waits on main memory far longer than it spends running your code. For Blueprint ticks, the Blueprint virtual machine adds interpretation overhead on top. "Empty" is not free; it is just cheap per object, and there are a lot of objects.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'The roll call',
          text: 'Imagine a teacher who calls the name of every student in a 5,000-person school every minute, just in case one of them has a question. Most answer "nothing", but the roll call still takes all day. Event-driven design is letting students raise their hand.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'Your game targets 60 fps. Profiling shows 4,000 ticking pickup actors, each costing about 1.5 µs per frame. Roughly what share of the frame budget do they consume?',
      options: [
        { text: 'About 4%', why: 'That would be about 0.6 ms. 4,000 × 1.5 µs is ten times more than that.' },
        { text: 'About 36%', correct: true, why: '4,000 × 1.5 µs = 6,000 µs = 6 ms, and 6 / 16.7 ≈ 0.36.' },
        { text: 'About 90%', why: 'That would be about 15 ms. The real total is 6 ms.' },
        { text: 'Nothing measurable — microseconds are negligible', why: 'Microseconds are negligible *once*. Multiplied by thousands of objects and sixty frames a second, they become milliseconds every frame.' },
      ],
      explanation:
        'Per-object costs that look tiny add up linearly with object count: 4,000 × 1.5 µs = 6 ms, more than a third of a 16.7 ms frame — for pickups that are probably just sitting there. This back-of-the-envelope arithmetic is worth doing whenever you write a class that will have many instances.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Rule 1: don\'t tick what doesn\'t need it',
      blocks: [
        {
          type: 'p',
          text: 'The cheapest tick is the one that never runs. Start by asking, for every class: *does this need to do something every frame?* Most actors — props, triggers, pickups, spawners — do not. Remove `PrimaryActorTick.bCanEverTick = true;` (the editor\'s class wizard adds it to every new actor) and the actor never even registers a tick function.',
        },
        {
          type: 'p',
          text: 'Many objects need to tick only **sometimes**: a door while it moves, a projectile while it flies, a turret while it has a target. Register the tick but start it asleep, then wake it only for the duration of the work:',
        },
        {
          type: 'code',
          title: 'SlidingDoor.cpp',
          code: `ASlidingDoor::ASlidingDoor() {
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.bStartWithTickEnabled = false;
}

void ASlidingDoor::Open() {
    TargetAlpha = 1.f;
    SetActorTickEnabled(true);
}

void ASlidingDoor::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);

    Alpha = FMath::FInterpConstantTo(Alpha, TargetAlpha,
        DeltaTime, 1.f / OpenSeconds);
    Door->SetRelativeLocation(
        FMath::Lerp(ClosedOffset, OpenOffset, Alpha));

    if (FMath::IsNearlyEqual(Alpha, TargetAlpha)) {
        SetActorTickEnabled(false);  // done: sleep again
    }
}`,
          annotations: [
            { lines: '2-3', text: 'Registered, but asleep. A closed door in a level of 200 doors costs nothing per frame.' },
            { lines: 8, text: 'Something happened (a player pressed a button) — now there is per-frame work to do.' },
            { lines: '14-15', text: '`FInterpConstantTo` moves at a constant rate per second: `1 / OpenSeconds` takes `Alpha` from 0 to 1 in exactly `OpenSeconds`.' },
            { lines: '16-17', text: '`Lerp` with a time-driven `Alpha` is fine. The "constant alpha" trap only applies when the alpha itself ignores `DeltaTime`.' },
            { lines: 20, text: 'The door puts itself back to sleep the moment it arrives. It ticked only for the second or so it was moving.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Components tick separately.** Custom components should leave `PrimaryComponentTick.bCanEverTick` false unless needed, and idle ones can call `SetComponentTickEnabled(false)`.',
            '**Engine components tick too.** Movement components, skeletal meshes and others have their own ticks. A skeletal mesh\'s `VisibilityBasedAnimTickOption` lets off-screen characters skip animation work.',
            '**Blueprints.** A Blueprint actor with an Event Tick node ticks automatically. Class Defaults expose *Start with Tick Enabled*, and Project Settings has *Can Blueprints Tick by Default* for teams that want ticking to be opt-in.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'An actor with `bCanEverTick = true` and an empty `Tick` body costs essentially nothing per frame, because the compiler optimises the empty function away.',
      answer: false,
      explanation:
        'The compiler cannot remove a virtual call the engine makes at runtime through a base-class pointer. More importantly, most of the cost is outside your function: the tick manager still queues, sorts and dispatches the tick function every frame, touching the actor\'s memory (a likely cache miss). If the actor has nothing to do, set `bCanEverTick = false` or disable its tick.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Rule 2: tick less often',
      blocks: [
        {
          type: 'p',
          text: 'Some logic needs to run regularly but not every frame. An AI checking for threats does not need 144 checks a second; five is plenty for gameplay to feel responsive. A **tick interval** throttles a tick function to run at most once per interval. `DeltaTime` then reports the real time since that function last ran, so rate-based maths keeps working.',
        },
        {
          type: 'code',
          title: 'ThreatScannerComponent.cpp',
          code: `UThreatScannerComponent::UThreatScannerComponent() {
    PrimaryComponentTick.bCanEverTick = true;
    PrimaryComponentTick.TickInterval = 0.2f;  // 5 Hz
}

void UThreatScannerComponent::BeginPlay() {
    Super::BeginPlay();
    // Spread hundreds of scanners across frames
    SetComponentTickInterval(
        0.2f + FMath::FRandRange(0.f, 0.05f));
}

void UThreatScannerComponent::SetFarFromPlayer(bool bFar) {
    SetComponentTickInterval(bFar ? 1.f : 0.2f);
}`,
          annotations: [
            { lines: 3, text: 'The default interval, set like every other tick setting in the constructor.' },
            { lines: '9-10', text: 'If 300 enemies spawn on the same frame with the same interval, all 300 scanners would run on the *same* frames — a spike every 0.2 s instead of a smooth load. A small random offset staggers them.' },
            { lines: 14, text: 'Intervals can change at runtime. Distant enemies can think less often; nobody will notice.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Throttle logic',
            tone: 'good',
            text: 'Target selection, perception checks, "should I flee?" decisions, distance tests, UI that shows slowly changing numbers. Running these at 5–10 Hz is usually indistinguishable from every frame.',
          },
          right: {
            title: 'Don\'t throttle visuals',
            tone: 'bad',
            text: 'Anything that moves on screen. A position updated at 5 Hz visibly stutters. Visible motion should update every frame — or be handed to a system built for it, such as a movement component, animation, or a material effect.',
          },
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Significance: throttle by importance',
          text: 'The [[significance-manager]] plugin generalises this idea. You register objects with a function that scores how much each matters to the player — distance, whether it is on screen, whether it is the player\'s current target — and react when the score changes, typically by changing tick intervals or detail levels. It provides the framework; the rules are yours.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'fill',
      prompt: 'Configure this component so it can tick, starts asleep, and when awake ticks at most 4 times per second.',
      template: `UAlarmComponent::UAlarmComponent() {
    PrimaryComponentTick.___ = true;
    PrimaryComponentTick.bStartWithTickEnabled = ___;
    PrimaryComponentTick.___ = 0.25f;
}`,
      blanks: [{ answers: ['bCanEverTick'] }, { answers: ['false'] }, { answers: ['TickInterval'] }],
      wordBank: ['bCanEverTick', 'false', 'TickInterval', 'true', 'TickGroup', 'TickRate', 'bTickEnabled'],
      explanation:
        '`bCanEverTick = true` registers the tick function (it must be set in the constructor). `bStartWithTickEnabled = false` keeps it asleep until code calls `SetComponentTickEnabled(true)`. `TickInterval = 0.25f` means at most one tick every 0.25 s — four per second. `TickGroup` controls *when* in the frame it runs, not how often, and `TickRate` / `bTickEnabled` are not real fields.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Rule 3: let events wake you',
      blocks: [
        {
          type: 'p',
          text: 'Much of what ends up in Tick is **polling**: asking "has anything changed?" every frame. Is the player close yet? Did my health change? Is the cooldown over? Each question costs a check per object per frame, and the answer is almost always "no". Event-driven code flips this around: whoever causes the change announces it, and only interested parties react. Cost becomes proportional to *how often things happen*, not to *objects × frames*.',
        },
        {
          type: 'table',
          headers: ['Polling in Tick', 'Event-driven replacement'],
          rows: [
            ['Check distance to the player every frame', 'An overlap sphere: `OnComponentBeginOverlap` / `OnComponentEndOverlap`'],
            ['Health bar reads `GetHealth()` every frame', 'Health component broadcasts an `OnHealthChanged` [[delegate]]; the widget updates only then'],
            ['Count down a respawn in Tick', 'A one-shot timer'],
            ['Check whether the round has ended', 'The GameMode broadcasts `OnRoundEnded`'],
            ['Search for the player with `GetAllActorsOfClass`', 'Cache the reference once in `BeginPlay`, or receive it from an event'],
          ],
        },
        {
          type: 'p',
          text: 'Here is a healing fountain that combines two events and a timer. It never ticks: overlaps tell it when someone arrives or leaves, and a looping timer heals only while someone is inside.',
        },
        {
          type: 'code',
          title: 'HealingFountain.cpp',
          code: `void AHealingFountain::BeginPlay() {
    Super::BeginPlay();
    Zone->OnComponentBeginOverlap.AddDynamic(
        this, &AHealingFountain::OnZoneEnter);
    Zone->OnComponentEndOverlap.AddDynamic(
        this, &AHealingFountain::OnZoneExit);
}

void AHealingFountain::OnZoneEnter(
    UPrimitiveComponent* OverlappedComp, AActor* Other,
    UPrimitiveComponent* OtherComp, int32 OtherBodyIndex,
    bool bFromSweep, const FHitResult& SweepResult) {
    if (Cast<APawn>(Other) && ++Occupants == 1) {
        GetWorldTimerManager().SetTimer(HealHandle, this,
            &AHealingFountain::HealOccupants, 1.f, true);
    }
}

void AHealingFountain::OnZoneExit(
    UPrimitiveComponent* OverlappedComp, AActor* Other,
    UPrimitiveComponent* OtherComp, int32 OtherBodyIndex) {
    if (Cast<APawn>(Other) && --Occupants == 0) {
        GetWorldTimerManager().ClearTimer(HealHandle);
    }
}`,
          annotations: [
            { lines: '3-6', text: 'Bind to the sphere component\'s [[overlap-event|overlap events]]. Because these are dynamic delegates, both handlers must be declared as `UFUNCTION()` in the header.' },
            { lines: 13, text: '`Cast<APawn>` returns null for anything that is not a pawn (unit 12 covers casting in depth). The first pawn to arrive starts the healing timer.' },
            { lines: '14-15', text: 'One heal pulse per second, but only while the zone is occupied.' },
            { lines: '22-23', text: 'When the last pawn leaves, the timer stops. An empty fountain costs nothing at all.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why events scale better',
          text: 'With polling, 100 fountains × 60 fps = 6,000 distance checks per second, forever. With events, the physics engine already tracks overlaps as part of its normal work, and the fountains do something only when a pawn crosses a boundary — perhaps a few times a minute. Events also make intent explicit: reading `OnZoneEnter` tells you what triggers the behaviour, whereas a Tick full of `if` checks hides it.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Events have costs too',
          text: 'Overlap events require *Generate Overlap Events* on both components and cost physics work for every overlapping pair, so do not make every small prop an overlap trigger. Delegates with hundreds of listeners take time to broadcast. Event-driven is a better default, not a free lunch — measure.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'bug',
      prompt: 'Two hundred objective markers each run this Tick. The game thread is slow in large levels. Tap the line responsible for most of the wasted work.',
      code: `void AObjectiveMarker::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);

    TArray<AActor*> Players;
    UGameplayStatics::GetAllActorsOfClass(
        this, APlayerCharacter::StaticClass(), Players);

    if (Players.Num() > 0) {
        const float Dist = GetDistanceTo(Players[0]);
        Icon->SetVisibility(Dist < RevealRadius);
    }
}`,
      bugLines: [5, 6],
      hint: 'Which line searches the world, every frame, for something that almost never changes?',
      explanation:
        '`GetAllActorsOfClass` searches the world for every actor of that class and fills a freshly allocated array — and here 200 markers do it every frame for a player who never changes. Cache the player once (for example `UGameplayStatics::GetPlayerPawn(this, 0)` in `BeginPlay`), or better, drop the Tick entirely: give each marker a reveal sphere and toggle the icon in its overlap events. The distance check itself (line 9) is cheap by comparison.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Measure first: stat commands and Unreal Insights',
      blocks: [
        {
          type: 'p',
          text: 'Optimising without measuring is guessing. Unreal\'s [[console-command|console commands]] give a quick overview, and [[unreal-insights]] shows exactly where every millisecond goes. Press the backtick key in a running game to open the console.',
        },
        {
          type: 'table',
          headers: ['Tool', 'What it tells you'],
          rows: [
            ['`stat fps`', 'Frame rate and frame time. Is there a problem at all?'],
            ['`stat unit`', 'Frame time split into **Game** (game thread), **Draw** (render thread), **GPU** and more. The largest number is your bottleneck.'],
            ['`stat game`', 'Breaks game-thread time into categories such as world tick, actor and component ticks, movement and timers.'],
            ['`dumpticks`', 'Logs every registered tick function and whether it is enabled — a fast way to spot actors that should not be ticking at all.'],
            ['Unreal Insights', 'A recorded timeline of every thread, with nested CPU scopes per frame. Find the exact functions and actors responsible.'],
          ],
        },
        {
          type: 'p',
          text: 'To trace, launch the game with `-trace=default` (or use the Trace controls in the editor\'s status bar), then open the `.utrace` file in Unreal Insights. Adding `-statnamedevents` makes each actor\'s tick appear with its name. You can also mark your own code so it shows up as a named block:',
        },
        {
          type: 'code',
          title: 'FlockingBird.cpp',
          code: `#include "FlockingBird.h"
#include "ProfilingDebugging/CpuProfilerTrace.h"

void AFlockingBird::Tick(float DeltaTime) {
    TRACE_CPUPROFILER_EVENT_SCOPE(AFlockingBird::Tick);
    Super::Tick(DeltaTime);

    {
        TRACE_CPUPROFILER_EVENT_SCOPE(FindNeighbours);
        GatherNeighbours();
    }
    Steer(DeltaTime);
}`,
          annotations: [
            { lines: 5, text: 'Creates a named timing scope that lasts until the end of the enclosing block — [[raii|RAII]] in action. In Insights you will see `AFlockingBird::Tick` as a bar on the game thread.' },
            { lines: '8-11', text: 'A nested scope isolates one expensive part, so you can tell whether neighbour search or steering is the real cost.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why measure before changing code?',
          text: 'Performance intuition is notoriously unreliable. A single actor doing an expensive trace every frame can outweigh 5,000 trivial ticks; a "slow" Blueprint might be called once per minute. Measuring tells you which thread is the bottleneck (no amount of tick optimisation helps a GPU-bound game) and gives you a baseline, so you can prove a change helped instead of hoping it did.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Measure in the right build',
          text: 'Play-In-Editor numbers include editor overhead and debug features. For decisions that matter, profile a packaged *Development* or *Test* build, in a representative scene, on your minimum-spec hardware.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: '`stat unit` in a packaged build shows: **Frame 25 ms, Game 24 ms, Draw 9 ms, GPU 11 ms**. Where should you look first?',
      options: [
        { text: 'The GPU: simplify materials and lower resolution', why: 'The GPU finishes its work in 11 ms, well within the frame. Making it faster will not shorten a 25 ms frame.' },
        { text: 'The render thread: reduce draw calls', why: 'Draw at 9 ms is not the limiting factor either.' },
        { text: 'The game thread: gameplay code such as ticks, AI and movement', correct: true, why: 'Game is 24 ms — nearly the whole frame. The other threads are waiting on it, so `stat game` and an Insights trace of the game thread are the next steps.' },
        { text: 'Nothing: 25 ms is fine because V-Sync caps the frame rate', why: '25 ms is 40 fps. If the target is 60 fps (16.7 ms), the game thread is badly over budget.' },
      ],
      explanation:
        'Frame time is limited by the slowest thread. Here the game thread takes 24 ms while the render thread and GPU are mostly idle, so the game is **game-thread bound**. That is exactly where tick costs, AI, movement and Blueprint logic live. Optimising the GPU would change nothing.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Scaling up: aggregate ticks',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes you really do need thousands of things updated every frame: bullets, debris, crowd agents. Making each one an actor with its own Tick multiplies all the per-tick overhead. The alternative is **aggregation**: one manager owns the data for all of them in a [[tarray|TArray]] of plain structs, and updates them in a single tight loop.',
        },
        {
          type: 'code',
          title: 'BulletManager.h / .cpp',
          code: `USTRUCT()
struct FBullet {
    GENERATED_BODY()

    FVector Position = FVector::ZeroVector;
    FVector Velocity = FVector::ZeroVector;
    float LifeLeft = 0.f;
};

// In ABulletManager: TArray<FBullet> Bullets;

void ABulletManager::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);
    for (int32 i = Bullets.Num() - 1; i >= 0; --i) {
        FBullet& B = Bullets[i];
        B.Position += B.Velocity * DeltaTime;
        B.LifeLeft -= DeltaTime;
        if (B.LifeLeft <= 0.f) {
            Bullets.RemoveAtSwap(i);  // O(1), order unimportant
        }
    }
}`,
          annotations: [
            { lines: '2-8', text: 'A bullet is just data — about 56 bytes (two 24-byte double-precision `FVector`s plus a `float`, padded) — with no actor, no components and no tick function of its own.' },
            { lines: 14, text: 'One tick function for all bullets. Iterating backwards makes removal safe: swapped-in elements have already been processed.' },
            { lines: 16, text: 'The same rate × `DeltaTime` rule, applied to every bullet in turn.' },
            { lines: 19, text: '`RemoveAtSwap` moves the last element into the hole instead of shifting everything down — constant time, at the cost of order.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why this is so much faster',
          text: 'The structs sit in [[contiguous-memory]], so the CPU streams through them with excellent [[cache-locality]] — the same reason `std::vector` beats a linked list. There is one dispatch per frame instead of thousands, and no per-actor overhead for transforms, components or replication. Rendering can follow the same pattern with instanced static meshes.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Taking it further: Mass',
          text: 'Unreal\'s **Mass** framework (MassEntity) is a full entity-component-system built on this idea, used for crowds and traffic in the *City Sample*. You will not need it for most gameplay, but it is the logical end point of "don\'t make everything an actor".',
        },
        {
          type: 'list',
          items: [
            '**Default:** no Tick. Use events and timers.',
            '**Needs per-frame work sometimes:** tick asleep, wake on demand.',
            '**Needs regular work, not per frame:** tick interval, possibly significance-driven.',
            '**Thousands of similar things every frame:** aggregate them into one manager.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'order',
      prompt: 'Put this performance workflow in the right order.',
      lines: [
        'Reproduce the slowdown in a representative scene in a packaged build',
        'Use `stat unit` to find which thread is the bottleneck',
        'Record an Unreal Insights trace to find the expensive functions',
        'Fix the single worst offender (disable, throttle, or make it event-driven)',
        'Measure the same scene again to confirm the improvement',
      ],
      linesAreCode: false,
      explanation:
        'Reproduce first, so you are measuring the real problem. `stat unit` narrows it to a thread; Insights narrows it to functions. Then change **one** thing — the biggest cost — and measure again in the same scene. Changing many things at once makes it impossible to know which one helped, or whether one made things worse.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which of these replace per-frame polling with an event-driven design? Select all that apply.',
      options: [
        { text: 'A health bar that binds to the health component\'s `OnHealthChanged` delegate', correct: true, why: 'The bar updates only when health actually changes, instead of reading it every frame.' },
        { text: 'A trap that starts its attack when `OnComponentBeginOverlap` fires', correct: true, why: 'The physics engine reports the overlap; the trap does nothing until then.' },
        { text: 'A pickup that respawns via a 30-second one-shot timer', correct: true, why: 'No per-frame countdown: the timer manager calls back once.' },
        { text: 'A trap that checks `GetDistanceTo(Player) < 300.f` in Tick', why: 'That is the polling pattern itself — a check per trap per frame, almost always answering "no".' },
        { text: 'Setting the trap\'s tick interval to `0.f` so it reacts faster', why: 'An interval of 0 means "tick every frame" — more polling, not less.' },
      ],
      explanation:
        'Event-driven designs let the thing that changes announce the change: a delegate broadcast, an overlap reported by physics, a timer expiring. Per-frame checks — even throttled ones — are still polling. Throttling is a good fallback when no event exists, but an event, where available, removes the per-frame cost entirely.',
    },
  ],
  takeaways: [
    'At 60 fps the whole frame is 16.7 ms; tiny per-tick costs multiplied by thousands of actors become milliseconds.',
    'An empty Tick still costs scheduling, dispatch and cache misses — remove `bCanEverTick = true` when an actor has nothing to do every frame.',
    'Tick only while there is work: start asleep with `bStartWithTickEnabled = false` and toggle with `SetActorTickEnabled`.',
    'Throttle logic (not visuals) with tick intervals, and stagger them so many actors do not tick on the same frame.',
    'Prefer events — overlaps, delegates, timers — over polling; cost then scales with how often things happen.',
    'Measure before and after: `stat unit` finds the bottleneck thread, `stat game` and `dumpticks` narrow it, Unreal Insights pinpoints it.',
    'For thousands of similar objects, aggregate their data into one manager with one tight loop over contiguous memory.',
  ],
  reading: [
    {
      title: 'Stat Commands',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/stat-commands-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Reference for `stat unit`, `stat game` and the other in-game performance displays.',
    },
    {
      title: 'Unreal Insights',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-insights-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How to record traces and read the Timing Insights view.',
    },
    {
      title: 'Update Method',
      url: 'https://gameprogrammingpatterns.com/update-method.html',
      source: 'book',
      note: 'Robert Nystrom\'s chapter on per-object update functions — the pattern behind Tick — and its trade-offs.',
    },
    {
      title: 'Data Locality',
      url: 'https://gameprogrammingpatterns.com/data-locality.html',
      source: 'book',
      note: 'Why iterating a contiguous array of structs is so much faster than visiting scattered objects.',
    },
  ],
};
