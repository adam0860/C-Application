import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-line-traces',
  title: 'Line Traces, Sweeps and FHitResult',
  summary:
    'Asking the world "what is along this line?": channel, object and profile traces, query parameters, hit results, shape sweeps and real gameplay uses.',
  minutes: 18,
  objectives: [
    'Fire a line trace with `LineTraceSingleByChannel` and configure it with `FCollisionQueryParams`',
    'Read `FHitResult` correctly: `bBlockingHit`, `ImpactPoint`, `ImpactNormal`, `GetActor()`, `Distance`',
    'Choose between single and multi traces, and between channel, object-type and profile traces',
    'Sweep shapes with `FCollisionShape` when a thin ray is not enough',
    'Build a camera-based hitscan, an interaction trace and a ground check, and visualise them with debug drawing',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Asking the world a question',
      blocks: [
        {
          type: 'p',
          text: 'A [[line-trace]] (a *raycast* in other engines) shoots an infinitely thin line from a start point to an end point and asks the physics scene: *what does this line touch?* Hitscan weapons, interaction prompts, AI line-of-sight, foot placement and camera collision are all built on traces.',
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp',
          code: `#include "DrawDebugHelpers.h"

void AMyCharacter::ProbeAhead() {
    const FVector Start = GetActorLocation();
    const FVector End = Start + GetActorForwardVector() * 1000.0;

    FHitResult Hit;
    const bool bHit = GetWorld()->LineTraceSingleByChannel(
        Hit, Start, End, ECC_Visibility);

    DrawDebugLine(GetWorld(), Start, bHit ? Hit.ImpactPoint : End,
                  bHit ? FColor::Red : FColor::Green, false, 2.f);
}`,
          annotations: [
            { lines: 1, text: 'Declares `DrawDebugLine` and friends. Debug drawing is compiled out of shipping builds.' },
            { lines: '4-5', text: 'Start and End are both **points** in world space. The end is start + direction × length (10 m here, since units are cm).' },
            { lines: 7, text: 'The output parameter: filled in with details of the hit, if there is one.' },
            { lines: '8-9', text: 'Trace on the Visibility channel and return the first **blocking** hit. Traces are asked of the [[world]], so you need `GetWorld()`.' },
            { lines: '11-12', text: 'Red line to the impact point on a hit, green line to the end on a miss, visible for 2 seconds. Always visualise traces while developing.' },
          ],
        },
        {
          type: 'p',
          text: 'The `Single` + `ByChannel` combination is the workhorse: it uses the channel rules from the previous lesson, where each component\'s response to `ECC_Visibility` decides whether it blocks the line. It returns `true` when there was a blocking hit.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'This first version has a bug',
          text: 'The trace starts at the character\'s own location — inside its own collision — so it may report the character itself as the first thing it hits. The next card fixes that.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why are traces cheap enough to use everywhere?',
          text: 'The physics scene keeps every collision shape in a spatial acceleration structure (a bounding-volume tree). A trace first walks that tree to find the few shapes whose bounds the line crosses (the *broad phase*), then tests only those precisely (the *narrow phase*). A trace against a level with thousands of objects typically touches a handful of them — so dozens of traces per frame are routine. Thousands per frame are not; that is when you reach for async traces or a different design.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'What does the `bool` returned by `LineTraceSingleByChannel` mean?',
      options: [
        {
          text: 'The trace found a component that **blocks** the channel',
          correct: true,
          why: 'Right. Single traces report the first blocking hit; the return value is the same as `Hit.bBlockingHit`.',
        },
        {
          text: 'The trace touched anything at all, including overlaps',
          why: 'Single traces do not report overlaps. Components that merely Overlap the channel are passed through silently.',
        },
        {
          text: 'The trace completed without errors',
          why: 'There is no "error" outcome; a trace through empty space simply returns `false`.',
        },
        {
          text: 'The line reached its end point',
          why: 'Almost the opposite: `true` means something stopped the line *before* the end.',
        },
      ],
      explanation:
        'For single traces, `true` ⇔ a blocking hit ⇔ `Hit` holds valid data. On `false`, the hit result\'s fields are not meaningful — using `Hit.ImpactPoint` anyway is how effects end up spawning at the world origin.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'FCollisionQueryParams: tuning the question',
      blocks: [
        {
          type: 'p',
          text: 'The optional `FCollisionQueryParams` argument controls *how* the trace is performed:',
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp',
          code: `FCollisionQueryParams Params;
Params.AddIgnoredActor(this);
Params.bTraceComplex = false;
Params.bReturnPhysicalMaterial = true;
Params.TraceTag = TEXT("ProbeAhead");

FHitResult Hit;
const bool bHit = GetWorld()->LineTraceSingleByChannel(
    Hit, Start, End, ECC_Visibility, Params);`,
          annotations: [
            { lines: 2, text: 'Ignore every component of this actor — the fix for the bug above. `AddIgnoredActors(Array)` and `AddIgnoredComponent(Comp)` also exist; a projectile usually ignores its owner too.' },
            { lines: 3, text: 'Test against [[simple-complex-collision|simple collision]] (the default). See the table below.' },
            { lines: 4, text: 'Ask for `Hit.PhysMaterial`, so you can choose a footstep sound or impact effect per surface. Off by default because it costs a little extra.' },
            { lines: 5, text: 'A name for debugging and profiling: the `TraceTag ProbeAhead` console command draws traces carrying this tag.' },
            { lines: 9, text: 'Params go after the channel.' },
          ],
        },
        {
          type: 'p',
          text: 'You will often see the one-line constructor form, which also registers the trace with Unreal\'s profiling stats: `FCollisionQueryParams Params(SCENE_QUERY_STAT(ProbeAhead), false, this);` — tag, trace-complex flag, and an actor to ignore.',
        },
        {
          type: 'table',
          headers: ['Aspect', 'Simple collision (`bTraceComplex = false`)', 'Complex collision (`true`)'],
          rows: [
            ['Tests against', 'Boxes, spheres, capsules and convex hulls authored for each mesh', 'The mesh\'s actual render triangles'],
            ['Precision', 'Approximate — may hit "air" around a detailed mesh', 'Exact to the visible surface'],
            ['Cost', 'Low', 'Higher, especially on dense meshes'],
            ['Extras', '—', '`Hit.FaceIndex` (which triangle)'],
            ['Typical use', 'Gameplay: shooting, interaction, line of sight', 'Precise decals, editor tools, picking on detailed geometry'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does simple collision exist at all?',
          text: 'Render meshes can have hundreds of thousands of triangles; physics and queries would crawl if they tested every one. Artists (or automatic tools) provide a handful of convex shapes that hug the mesh closely enough for gameplay. It is the same trade-off games make everywhere: use an approximation that is cheap and *good enough*, and pay for precision only where players would notice.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'Setting `bTraceComplex = true` is always the better choice, because tracing against the real triangles is more accurate.',
      answer: false,
      explanation:
        'More accurate, yes — but more expensive, and usually unnecessary. Gameplay traces are typically tested against simple collision, which is what the meshes\' designers tuned for gameplay anyway (and what physics uses, so traces and movement agree). Enable complex tracing only where you genuinely need triangle precision or the `FaceIndex`, such as placing decals on detailed surfaces.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Reading FHitResult',
      blocks: [
        {
          type: 'p',
          text: 'An [[fhitresult]] is a struct full of information about one hit. These are the fields you will use most:',
        },
        {
          type: 'table',
          headers: ['Field', 'Meaning'],
          rows: [
            ['`bBlockingHit`', 'This entry is a blocking hit (for single traces: the same as the return value)'],
            ['`ImpactPoint`', 'World-space point where the trace touched the surface'],
            ['`ImpactNormal`', 'The surface\'s normal at that point — which way the surface faces'],
            ['`Location`', 'Where the trace *shape* was at impact. For line traces equal to `ImpactPoint`; for sweeps, the shape\'s centre'],
            ['`Normal`', 'For line traces equal to `ImpactNormal`; for sweeps, the normal of the swept shape'],
            ['`Distance`', 'Distance from the trace start to `Location`, in cm'],
            ['`Time`', 'The same as a fraction of the trace: 0 at Start, 1 at End'],
            ['`GetActor()`, `GetComponent()`', 'What was hit'],
            ['`BoneName`', 'The bone (physics body) hit on a skeletal mesh — handy for headshots'],
            ['`PhysMaterial`', 'The surface\'s physical material, if `bReturnPhysicalMaterial` was set'],
            ['`bStartPenetrating`', 'The trace began inside the thing it hit'],
          ],
        },
        {
          type: 'code',
          title: 'Using a hit',
          code: `if (bHit) {
    UE_LOG(LogTemp, Log, TEXT("Hit %s at %.0f cm"),
           *GetNameSafe(Hit.GetActor()), Hit.Distance);

    DrawDebugSphere(GetWorld(), Hit.ImpactPoint, 8.f, 12,
                    FColor::Yellow, false, 2.f);
    DrawDebugLine(GetWorld(), Hit.ImpactPoint,
                  Hit.ImpactPoint + Hit.ImpactNormal * 50.0,
                  FColor::Blue, false, 2.f);

    const FVector Dir = (End - Start).GetSafeNormal();
    const FVector Bounce =
        FMath::GetReflectionVector(Dir, Hit.ImpactNormal);
    SpawnRicochet(Hit.ImpactPoint, Bounce);
}`,
          annotations: [
            { lines: 1, text: 'Guard everything: on a miss the fields are not meaningful.' },
            { lines: 3, text: '`GetNameSafe` prints "None" instead of crashing if the actor is null. In UE4 you wrote `Hit.Actor.Get()`; in UE5 use `Hit.GetActor()`.' },
            { lines: '5-6', text: 'Mark the impact point.' },
            { lines: '7-9', text: 'Draw the surface normal: a short blue line sticking straight out of the surface. Effects and decals are oriented along this.' },
            { lines: '11-14', text: 'Reflect the shot direction about the normal for a ricochet. `SpawnRicochet` stands in for your own effect code.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Which part of a character does a Visibility trace hit?',
          text: 'Check the presets in your project. In a default setup, the capsule\'s **Pawn** preset ignores the Visibility channel while the mesh\'s **CharacterMesh** preset blocks it, so Visibility traces tend to hit the skeletal mesh — and fill in `BoneName` from its physics asset. That is what makes per-bone damage possible.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: 'After a hitscan trace hits a wall, you want to spawn a bullet-hole decal lying flat against the surface. Which value tells you how to orient it?',
      options: [
        {
          text: '`Hit.ImpactPoint`',
          why: 'That gives *where* to place the decal, not which way it should face.',
        },
        {
          text: '`Hit.TraceEnd - Hit.TraceStart`',
          why: 'That is the direction of the shot. A wall hit at a glancing angle would get a decal that is tilted relative to the surface.',
        },
        {
          text: '`Hit.Distance`',
          why: 'A scalar: how far away the hit was. Useful for damage falloff, not orientation.',
        },
        {
          text: '`Hit.ImpactNormal`',
          correct: true,
          why: 'Yes. The normal points straight out of the surface, so aligning the decal with it (for example via `Hit.ImpactNormal.Rotation()`) makes it lie flat.',
        },
      ],
      explanation:
        'Position comes from `ImpactPoint`, orientation from `ImpactNormal`. For line traces `Normal` happens to equal `ImpactNormal`, but for sweeps they differ — `Normal` describes the swept shape, `ImpactNormal` the surface — so build the habit of using `ImpactNormal` for surface effects.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Single vs multi; channel vs object type vs profile',
      blocks: [
        {
          type: 'p',
          text: 'Trace functions are named *Shape* + *Single/Multi* + *By…*. You have used `LineTraceSingleByChannel`; the other variants change what is returned and how components are selected:',
        },
        {
          type: 'table',
          headers: ['Variant', 'What it does'],
          rows: [
            ['`…Single…`', 'Returns the first **blocking** hit only'],
            ['`…Multi…`', 'Returns every **overlapping** hit along the line, up to and including the first blocking hit, sorted by distance — the blocking hit (if any) is last'],
            ['`…ByChannel`', 'Each component\'s response to the channel decides: Block stops, Overlap is reported by multi traces, Ignore is invisible'],
            ['`…ByObjectType`', 'Hits components whose **object type** is in your list; responses are not consulted'],
            ['`…ByProfile`', 'Behaves as if a component with the named preset were tracing'],
          ],
        },
        {
          type: 'code',
          title: 'The other variants',
          code: `// Railgun: everything that Overlaps Visibility, up to the
// first thing that Blocks it.
TArray<FHitResult> Hits;
GetWorld()->LineTraceMultiByChannel(
    Hits, Start, End, ECC_Visibility, Params);
for (const FHitResult& H : Hits) {
    UE_LOG(LogTemp, Log, TEXT("%s%s"), *GetNameSafe(H.GetActor()),
           H.bBlockingHit ? TEXT(" (stopped here)") : TEXT(""));
}

// Any pawn or physics body on the line, whatever its responses
FCollisionObjectQueryParams Objects;
Objects.AddObjectTypesToQuery(ECC_Pawn);
Objects.AddObjectTypesToQuery(ECC_PhysicsBody);
FHitResult Hit;
GetWorld()->LineTraceSingleByObjectType(
    Hit, Start, End, Objects, Params);

// Trace exactly as a "Projectile" preset component would collide
GetWorld()->LineTraceSingleByProfile(
    Hit, Start, End, TEXT("Projectile"), Params);`,
          annotations: [
            { lines: '3-5', text: 'Multi traces fill an array. Most components Block Visibility, so this only "pierces" things set to Overlap it — foliage, glass, thin cover you designed to be shot through.' },
            { lines: '6-9', text: 'Hits are sorted nearest first; if the last one has `bBlockingHit`, that is where the line stopped.' },
            { lines: '12-17', text: 'Object-type queries ignore response tables entirely: they ask "is there a Pawn or PhysicsBody here?" Handy for tools and targeting helpers.' },
            { lines: '20-21', text: 'Profile traces reuse a preset\'s object type and responses — ideal when a hitscan weapon should collide exactly like your projectile preset does.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          text: 'Multi traces cost more than single ones (they keep going past overlaps and build an array), and single traces can stop at the first blocking hit. Use the simplest variant that answers your question.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'bug',
      prompt: 'This hitscan weapon\'s shots fly off toward a seemingly random spot in the level instead of where the player aims. Tap the buggy line.',
      code: `void AMyCharacter::FireHitscan() {
    FVector ViewLoc;
    FRotator ViewRot;
    Controller->GetPlayerViewPoint(ViewLoc, ViewRot);

    const FVector End = ViewRot.Vector() * WeaponRange;

    FCollisionQueryParams Params;
    Params.AddIgnoredActor(this);
    FHitResult Hit;
    if (GetWorld()->LineTraceSingleByChannel(
            Hit, ViewLoc, End, ECC_Visibility, Params)) {
        ApplyHitscanDamage(Hit);
    }
}`,
      bugLines: [6],
      hint: 'Is `End` a point or a direction?',
      explanation:
        '`ViewRot.Vector() * WeaponRange` is a *direction scaled to a length*. Used as a point, it lies that far from the **world origin**, not from the camera, so the trace runs from the player toward some fixed spot near (0, 0, 0) shifted by the aim. The end point must be relative to the start: `ViewLoc + ViewRot.Vector() * WeaponRange`. This is one of the most common trace bugs — and a debug line would reveal it instantly.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Sweeps: traces with thickness',
      blocks: [
        {
          type: 'p',
          text: 'A line has no width, so it can slip between an enemy\'s legs or miss a thin pole. A [[sweep]] moves a whole **shape** — sphere, box or capsule — from start to end and reports what it touches. The functions mirror the trace family: `SweepSingleByChannel`, `SweepMultiByChannel`, `…ByObjectType`, `…ByProfile`.',
        },
        {
          type: 'code',
          title: 'A melee swing',
          code: `const FVector Start = GetActorLocation();
const FVector End = Start + GetActorForwardVector() * 150.0;
const FCollisionShape Shape = FCollisionShape::MakeSphere(30.f);

FHitResult Hit;
const bool bHit = GetWorld()->SweepSingleByChannel(
    Hit, Start, End, FQuat::Identity, ECC_Visibility, Shape, Params);

DrawDebugSphere(GetWorld(), bHit ? Hit.Location : End,
                Shape.GetSphereRadius(), 12, FColor::Orange,
                false, 1.f);`,
          annotations: [
            { lines: 3, text: 'Other shapes: `FCollisionShape::MakeBox(HalfExtent)` and `MakeCapsule(Radius, HalfHeight)`.' },
            { lines: '6-7', text: 'Like a line trace, plus a rotation for the shape (`FQuat::Identity` means unrotated; irrelevant for spheres) and the shape itself.' },
            { lines: 9, text: 'For sweeps, `Location` is where the sphere\'s **centre** was at the moment of contact, while `ImpactPoint` is on the surface it touched — they differ by roughly the radius.' },
          ],
        },
        {
          type: 'table',
          headers: ['Query', 'Answers', 'Example'],
          rows: [
            ['Line trace', 'What does this thin line hit first?', 'Hitscan, line of sight, interaction'],
            ['Sweep', 'What would this shape hit if it moved along the line?', 'Melee, thick projectiles, aim assist, "would my capsule fit through there?"'],
            ['Overlap (`OverlapMultiByChannel`)', 'What is inside this shape *right now*?', 'Explosion radius, "is this spawn point clear?"'],
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'You have been sweeping all along',
          text: 'The Character Movement Component moves the capsule by sweeping it, every frame. That is how characters slide along walls, and why their blocked moves produce the hit events from the previous unit.',
        },
        {
          type: 'callout',
          variant: 'warning',
          text: 'If a sweep *starts* overlapping something, it reports an immediate hit with `bStartPenetrating` set and `Time` 0. Spawning a sweep inside geometry is a common cause of "it hits instantly" bugs — start slightly outside, or ignore the relevant actors.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'fill',
      prompt: 'Complete the sweep: an unrotated 30 cm sphere, ignoring the character itself.',
      template: `FCollisionQueryParams Params;
Params.___(this);

FHitResult Hit;
const bool bHit = GetWorld()->SweepSingleByChannel(
    Hit, Start, End, FQuat::___, ECC_Visibility,
    FCollisionShape::___(30.f), Params);`,
      blanks: [{ answers: ['AddIgnoredActor'] }, { answers: ['Identity'] }, { answers: ['MakeSphere'] }],
      wordBank: ['AddIgnoredActor', 'IgnoreActor', 'Identity', 'Zero', 'MakeSphere', 'MakeBox', 'Sphere'],
      explanation:
        '`AddIgnoredActor(this)` excludes every component of the character from the query. `FQuat::Identity` is the "no rotation" quaternion — `FQuat` has no `Zero` for that purpose, and an all-zero quaternion is not a valid rotation. `FCollisionShape::MakeSphere(Radius)` builds the shape; `MakeBox` would need a half-extent vector.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Traces in real gameplay',
      blocks: [
        { type: 'heading', text: 'Hitscan from the camera' },
        {
          type: 'p',
          text: 'The crosshair sits at the centre of the screen, which is the *camera\'s* line of sight — not the gun barrel\'s. So a third-person hitscan does two traces: one from the camera to find what the player is aiming at, then one from the muzzle toward that point to check whether the shot can actually get there.',
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp',
          code: `void AMyCharacter::FireHitscan() {
    FVector ViewLoc;
    FRotator ViewRot;
    Controller->GetPlayerViewPoint(ViewLoc, ViewRot);
    const FVector AimEnd = ViewLoc + ViewRot.Vector() * WeaponRange;

    FCollisionQueryParams Params(
        SCENE_QUERY_STAT(Hitscan), false, this);

    FHitResult AimHit;
    const bool bAimHit = GetWorld()->LineTraceSingleByChannel(
        AimHit, ViewLoc, AimEnd, ECC_Visibility, Params);
    const FVector Target = bAimHit ? AimHit.ImpactPoint : AimEnd;

    const FVector Muzzle = GetMesh()->GetSocketLocation(TEXT("Muzzle"));
    const FVector ShotDir = (Target - Muzzle).GetSafeNormal();
    FHitResult ShotHit;
    if (GetWorld()->LineTraceSingleByChannel(
            ShotHit, Muzzle, Muzzle + ShotDir * WeaponRange,
            ECC_Visibility, Params)) {
        ApplyHitscanDamage(ShotHit);
    }
}`,
          annotations: [
            { lines: 4, text: 'For a player controller this is the camera\'s location and rotation — exactly what the crosshair represents.' },
            { lines: '7-8', text: 'Profiling tag, simple collision, ignore ourselves.' },
            { lines: '10-13', text: 'Trace 1: what is under the crosshair? If nothing, aim at the far end of the range.' },
            { lines: '15-16', text: 'Trace 2 starts at a `Muzzle` socket on the weapon mesh and heads toward the aim point.' },
            { lines: '18-22', text: 'It continues past the target so it still registers the hit, and a wall between gun and target correctly blocks the shot. In multiplayer the *server* must confirm hits like this — never trust the client\'s word.' },
          ],
        },
        {
          type: 'table',
          headers: ['Use case', 'Trace', 'Notes'],
          rows: [
            ['Interaction prompt', 'Short (≈250 cm) line trace from the camera on the custom **Interact** channel', 'Only interactable objects Block Interact, so nothing else gets in the way. Run it a few times per second, or on key press, rather than every frame'],
            ['Ground check for a custom pawn', 'Line trace straight down from the actor by its half-height plus a margin', 'For characters, prefer the movement component\'s own `IsMovingOnGround()`; it already sweeps for the floor'],
            ['AI line of sight', 'Visibility trace from the AI\'s eyes to the target', 'Glass and foliage that Ignore Visibility will not block sight'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          text: 'Wrap debug drawing in a console variable or a `bDebugTraces` property so you can switch it on in the field. Debug draws are stripped from shipping builds automatically, so they cost nothing for players. (The debugging unit covers these tools in depth.)',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'In a third-person shooter, why does the hitscan code trace from the **camera** first, instead of simply tracing straight forward from the gun\'s muzzle?',
      options: [
        {
          text: 'Camera traces are cheaper than traces from a skeletal mesh socket',
          why: 'Cost is the same — a trace is a trace. The reason is about *where the player is aiming*.',
        },
        {
          text: 'The crosshair shows the camera\'s line of sight; the muzzle is offset, so "straight from the gun" would not hit what the crosshair covers',
          correct: true,
          why: 'Yes. Camera and muzzle are in different places (parallax). Finding the aim point from the camera, then shooting from the muzzle toward it, makes bullets land under the crosshair.',
        },
        {
          text: 'Traces from inside the character\'s capsule are not allowed',
          why: 'They are allowed; you just ignore the character with `AddIgnoredActor(this)`.',
        },
        {
          text: 'Muzzle sockets cannot be read on the server',
          why: 'Socket locations are available wherever the mesh exists. It is not a networking restriction.',
        },
      ],
      explanation:
        'Players aim with the crosshair, so the camera defines *intent*; the weapon defines *physical possibility*. Tracing camera-then-muzzle honours both: shots go where the player aims, unless something between the gun and the target is in the way — which is exactly what players expect.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'truefalse',
      prompt: '`LineTraceMultiByChannel` returns every component along the line, including those behind the first blocking hit.',
      answer: false,
      explanation:
        'Multi traces return the components that **Overlap** the channel, in order, *up to and including* the first blocking hit — then they stop, exactly like a single trace would. Anything behind that block is never tested. To shoot through something, it must Overlap (not Block) the channel, or you must start a new trace beyond it.',
    },
  ],
  takeaways: [
    '`GetWorld()->LineTraceSingleByChannel(Hit, Start, End, Channel, Params)` returns `true` on a blocking hit; Start and End are both world-space points.',
    'Use `FCollisionQueryParams` to ignore yourself (`AddIgnoredActor(this)`), choose simple vs complex collision, request physical materials and tag traces.',
    'Check the return value before reading `FHitResult`; use `ImpactPoint` for position, `ImpactNormal` for orientation, `GetActor()` for what was hit.',
    'Single traces stop at the first block; multi traces also report overlaps up to it. ByObjectType ignores responses; ByProfile traces like a preset.',
    'Sweeps (`SweepSingleByChannel` + `FCollisionShape`) give traces thickness; overlap queries test a volume in place.',
    'Visualise every trace with `DrawDebugLine` / `DrawDebugSphere` while developing — most trace bugs are obvious once drawn.',
  ],
  reading: [
    {
      title: 'Traces Overview',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/traces-in-unreal-engine---overview',
      source: 'unreal-docs',
      note: 'Epic\'s overview of channel vs object traces, single vs multi, and shape traces.',
    },
    {
      title: 'Collision Overview',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-in-unreal-engine---overview',
      source: 'unreal-docs',
      note: 'How trace responses interact with channels — the rules every trace in this lesson relies on.',
    },
    {
      title: 'Collision Response Reference',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-response-reference-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Look up how each default preset responds to Visibility and Camera before relying on them in traces.',
    },
  ],
};
