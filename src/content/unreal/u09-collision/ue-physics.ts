import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-physics',
  title: 'Physics Simulation, Forces and Impulses',
  summary:
    'Handing objects to Chaos: simulation requirements, mass and units, AddForce vs AddImpulse, explosions, physical materials, and when not to simulate.',
  minutes: 18,
  objectives: [
    'Enable physics simulation and satisfy its requirements (physics collision, simple shapes, movable mobility)',
    'Explain how mass is computed, override it, and reason with Unreal\'s centimetre-based units',
    'Choose between `AddForce` and `AddImpulse`, and know what `bAccelChange` / `bVelChange` do',
    'Build an explosion with an overlap query and `AddRadialImpulse`, and tune surfaces with physical materials',
    'Decide between physics and kinematic movement, including the multiplayer implications',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Handing an object to the physics engine',
      blocks: [
        {
          type: 'p',
          text: 'Most of what you have moved so far was moved *by you*: the Character Movement Component sweeps the capsule where input says, a door slides where your code puts it. [[physics-simulation|Physics simulation]] flips that around. You give a body mass, shape and material, let the physics engine — [[chaos-physics|Chaos]] in UE5 — integrate gravity, contacts and forces every physics step, and influence it only by pushing.',
        },
        {
          type: 'code',
          title: 'PhysicsCrate.cpp',
          code: `#include "Engine/CollisionProfile.h"

APhysicsCrate::APhysicsCrate() {
    Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
    SetRootComponent(Mesh);

    Mesh->SetMobility(EComponentMobility::Movable);
    Mesh->SetCollisionProfileName(
        UCollisionProfile::PhysicsActor_ProfileName);
    Mesh->SetSimulatePhysics(true);
}`,
          annotations: [
            { lines: 5, text: 'Simulate the **root** component. A simulated body moves in world space, so a simulating child stops following its parent.' },
            { lines: 7, text: 'Only movable components can be simulated. (Ticking *Simulate Physics* in the editor switches this for you.)' },
            { lines: '8-9', text: '`PhysicsActor`: object type PhysicsBody, **Query and Physics** collision. A body cannot simulate if its collision excludes physics.' },
            { lines: 10, text: 'From now on Chaos owns this component\'s transform.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Physics collision.** Collision Enabled must include physics (`PhysicsOnly` or `QueryAndPhysics`).',
            '**Simple collision.** A static mesh needs simple collision shapes (boxes, spheres, capsules, convex hulls). Per-triangle "complex" collision cannot be simulated as a dynamic body; skeletal meshes need a Physics Asset.',
            '**Movable mobility**, and ideally the root component.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why let the engine take over?',
          text: 'Because emergent behaviour is expensive to fake. Crates that tumble down stairs, stacks that topple, debris that settles realistically — hand-animating these would take forever and never react to the player. The price is control: you can no longer say "be exactly here", only "here is a push", and the outcome depends on mass, friction, timing and contacts you do not fully control.',
        },
        {
          type: 'callout',
          variant: 'history',
          text: 'UE4 used NVIDIA PhysX. UE5 replaced it with Epic\'s own Chaos physics, which also powers destruction, cloth and vehicles. Gameplay code mostly talks to it through the same `UPrimitiveComponent` functions as before, so the API in this lesson carried over from UE4.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      multi: true,
      prompt: 'You call `SetSimulatePhysics(true)` on a static mesh component, but it hangs in the air when you press Play. Which of these could explain it? Select all that apply.',
      options: [
        {
          text: 'The static mesh asset has no simple collision, only complex (per-triangle) collision',
          correct: true,
          why: 'Dynamic simulated bodies need simple shapes; without them there is nothing Chaos can simulate.',
        },
        {
          text: 'Collision Enabled is set to `QueryOnly`',
          correct: true,
          why: 'Query-only collision excludes the physics solver, so the body cannot simulate.',
        },
        {
          text: 'The component\'s Mobility is Static',
          correct: true,
          why: 'Static components are baked into the level and cannot move, simulated or otherwise.',
        },
        {
          text: 'Generate Overlap Events is disabled',
          correct: false,
          why: 'That flag only controls overlap *events*. It has no effect on whether a body simulates.',
        },
      ],
      explanation:
        'A body simulates only when three things line up: physics-enabled collision, simple collision geometry to simulate, and a movable component. When something refuses to fall, check those three — the Output Log usually prints a warning naming the one that failed.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Mass, units and the numbers',
      blocks: [
        {
          type: 'p',
          text: 'Unless you override it, a body\'s **mass** is computed from the volume of its simple collision shapes multiplied by the **density** of its [[physical-material]] (default 1 g/cm³, like water), then scaled by *Mass Scale*. A big hollow-looking crate with a solid box collider can therefore weigh a surprising amount. You can override it:',
        },
        {
          type: 'code',
          title: 'PhysicsCrate.cpp',
          code: `Mesh->SetMassOverrideInKg(NAME_None, 50.f, true);
UE_LOG(LogTemp, Log, TEXT("Crate mass: %.1f kg"), Mesh->GetMass());`,
          annotations: [
            { lines: 1, text: '`NAME_None` = the whole component (for a skeletal mesh you could name a bone). `true` enables the override; `false` returns to the computed mass.' },
            { lines: 2, text: '`GetMass()` reports kilograms.' },
          ],
        },
        {
          type: 'table',
          headers: ['Quantity', 'Unreal unit', 'In SI terms'],
          rows: [
            ['Distance', 'cm', '1/100 m'],
            ['Mass', 'kg', 'kg'],
            ['Velocity', 'cm/s', '1/100 m/s'],
            ['Gravity', '−980 cm/s²', '−9.8 m/s²'],
            ['Force', 'kg·cm/s²', '1/100 N'],
            ['Impulse', 'kg·cm/s', '1/100 N·s'],
          ],
        },
        {
          type: 'p',
          text: 'Because distances are in centimetres, force numbers look 100× bigger than the newtons you may remember from school. To hold a 50 kg crate up against gravity you need 50 × 980 = **49,000** units of upward force. Do the arithmetic once and tuning stops being guesswork.',
        },
        {
          type: 'callout',
          variant: 'tip',
          text: 'Other per-body knobs live next to mass: `SetLinearDamping` and `SetAngularDamping` act like air resistance (slowing movement and spin), and `SetEnableGravity(false)` makes a body float. Simulated bodies that come to rest are put to **sleep** to save CPU; applying a force or impulse wakes them.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'In Unreal, a force of 1000 applied to a 1 kg body accelerates it at about 10 m/s² (ignoring gravity and friction).',
      answer: true,
      explanation:
        'a = F / m = 1000 / 1 = 1000 cm/s² = 10 m/s². The trap is assuming the force is in newtons (which would give 1000 m/s²). Unreal\'s units are centimetres and kilograms, so forces are in kg·cm/s² — one hundredth of a newton. Getting this right is why "the force does nothing" or "it launches into orbit" bugs disappear once you do the maths.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'AddForce vs AddImpulse',
      blocks: [
        {
          type: 'p',
          text: 'There are two ways to push a simulated body, and they differ in **time**. A force is a push applied *during* a physics step; an [[impulse]] is an instant change of momentum.',
        },
        {
          type: 'code',
          title: 'Forces and impulses',
          code: `// Thruster: a continuous push, re-applied every frame
void AHoverCrate::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);
    Mesh->AddForce(FVector(0.0, 0.0, LiftForce));
}

// Jump pad: one instant kick
void AJumpPad::Launch(UPrimitiveComponent* Target) {
    Target->AddImpulse(FVector(0.0, 0.0, 1200.0), NAME_None, true);
}`,
          annotations: [
            { lines: 4, text: 'Forces are accumulated and **cleared after each physics step**, so a lasting push must be re-applied every tick. The solver multiplies by the step time for you, so the result does not depend on frame rate.' },
            { lines: 9, text: 'Applied once. The last argument is `bVelChange`: treat the vector as a direct velocity change, ignoring mass — every object gets +1200 cm/s upward, from a pebble to a car.' },
          ],
        },
        {
          type: 'table',
          headers: ['Aspect', '`AddForce`', '`AddImpulse`'],
          rows: [
            ['Models', 'A sustained push: engines, wind, magnets, buoyancy', 'A sudden hit: explosions, jumps, bullets, kicks'],
            ['Call it', 'Every tick for as long as it acts', 'Once per event'],
            ['Effect', 'velocity += (F / m) × dt each step', 'velocity += J / m, immediately'],
            ['Units', 'kg·cm/s²', 'kg·cm/s'],
            ['Mass-independent flag', '`bAccelChange` — treat as acceleration', '`bVelChange` — treat as velocity change'],
          ],
        },
        {
          type: 'p',
          text: 'Both have **AtLocation** variants (`AddForceAtLocation`, `AddImpulseAtLocation`): pushing off-centre adds spin as well as movement, exactly like kicking a box near its corner. For pure rotation there are `AddTorqueInRadians` and `AddAngularImpulseInRadians`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have both?',
          text: 'Physics engines advance time in steps, integrating forces over each step. That works for gradual pushes, but a collision or explosion transfers momentum in a fraction of a millisecond — far shorter than one step. An impulse is the integral of that huge, brief force, applied as a single velocity change. Using the right tool keeps results consistent: forces scale with time automatically, impulses are time-independent by definition.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'bug',
      prompt: 'This rocket crate climbs twice as fast on a 120 Hz monitor as on a 60 Hz one. Tap the line responsible.',
      code: `void ARocketCrate::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);
    if (bThrusterOn) {
        Mesh->AddImpulse(GetActorUpVector() * 500.0);
    }
}`,
      bugLines: [4],
      hint: 'How many times per second does Tick run, and does an impulse care how long a frame was?',
      explanation:
        'An impulse is an instant momentum change that ignores frame duration. Applying one **every frame** means the total push per second is 500 × frame rate: 30,000 at 60 fps, 60,000 at 120 fps. A continuous thruster should use `AddForce`, which the solver integrates over each step\'s duration, giving the same result at any frame rate. (Multiplying the impulse by `DeltaTime` would also fix it — that is literally what a force is.)',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Explosions: AddRadialImpulse',
      blocks: [
        {
          type: 'p',
          text: '`AddRadialImpulse(Origin, Radius, Strength, Falloff, bVelChange)` pushes a component *away from* a point, scaled by distance. It acts on **one** component — the one you call it on — so an explosion first finds everything nearby with an overlap query, then pushes each simulated component:',
        },
        {
          type: 'code',
          title: 'ExplosiveBarrel.cpp',
          code: `void AExplosiveBarrel::Explode() {
    if (!HasAuthority()) {
        return;
    }
    const FVector Origin = GetActorLocation();
    const FCollisionShape Sphere = FCollisionShape::MakeSphere(Radius);

    FCollisionObjectQueryParams Objects;
    Objects.AddObjectTypesToQuery(ECC_PhysicsBody);
    FCollisionQueryParams Params;
    Params.AddIgnoredActor(this);

    TArray<FOverlapResult> Overlaps;
    GetWorld()->OverlapMultiByObjectType(
        Overlaps, Origin, FQuat::Identity, Objects, Sphere, Params);

    TSet<UPrimitiveComponent*> Pushed;
    for (const FOverlapResult& Result : Overlaps) {
        UPrimitiveComponent* Comp = Result.GetComponent();
        if (!Comp || !Comp->IsSimulatingPhysics()) {
            continue;
        }
        bool bAlreadyPushed = false;
        Pushed.Add(Comp, &bAlreadyPushed);
        if (!bAlreadyPushed) {
            Comp->AddRadialImpulse(Origin, Radius, Strength,
                                   RIF_Linear, true);
        }
    }
    Destroy();
}`,
          annotations: [
            { lines: '2-4', text: 'Gameplay physics should be decided by the server in multiplayer (more at the end of the lesson).' },
            { lines: '8-9', text: 'Only look for physics bodies. Add `ECC_Pawn` or others if characters should be found too (they would need a different response, such as `LaunchCharacter`).' },
            { lines: '13-15', text: 'An overlap query: "what is inside this sphere right now?" In recent engine versions `FOverlapResult` is declared in `Engine/OverlapResult.h`.' },
            { lines: '17-24', text: 'A component made of several bodies can appear more than once in the results. `TSet::Add` reports whether it was already present, so each component is pushed once.' },
            { lines: '26-27', text: '`RIF_Linear` fades the strength to zero at the radius (`RIF_Constant` does not fade). `true` = `bVelChange`: light and heavy objects fly alike.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          text: 'For designer-friendly explosions, `URadialForceComponent` packages the same idea: set its radius and impulse strength in the editor and call `FireImpulse()` from C++ or Blueprint.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is bVelChange often true for gameplay?',
          text: 'Realistic explosions barely move heavy objects, and players read that as "the explosion is broken". With `bVelChange = true`, every object within range gets the same speed regardless of mass, so the effect is predictable and readable. Keep it `false` when mass *should* matter — a simulation-heavy game, or a puzzle where heavier crates need a bigger blast.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: 'Complete the explosion loop: only push simulated components, let the strength fade with distance, and make light and heavy objects fly the same.',
      template: `if (Comp && Comp->___()) {
    Comp->AddRadialImpulse(Origin, Radius, Strength,
                           ___, ___);
}`,
      blanks: [{ answers: ['IsSimulatingPhysics'] }, { answers: ['RIF_Linear'] }, { answers: ['true'] }],
      wordBank: ['IsSimulatingPhysics', 'IsCollisionEnabled', 'RIF_Linear', 'RIF_Constant', 'true', 'false'],
      explanation:
        '`IsSimulatingPhysics()` filters out kinematic and static components, which impulses would not move anyway. `RIF_Linear` fades the impulse to zero at the edge of the radius (`RIF_Constant` would hit everything in range equally hard). The final `true` is `bVelChange`, making the impulse a direct velocity change that ignores mass.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Physical materials: friction and bounce',
      blocks: [
        {
          type: 'p',
          text: 'How a body slides and bounces depends on its [[physical-material]] — a `UPhysicalMaterial` asset. Assign one in a material\'s *Phys Material* slot (so every mesh using that material gets it) or override it per component.',
        },
        {
          type: 'table',
          headers: ['Property', 'Default', 'Meaning'],
          rows: [
            ['Friction', '0.7', 'Resistance to sliding: 0 is ice, 1 is rubber'],
            ['Restitution', '0.3', 'Bounciness: 0 absorbs the impact, 1 bounces back with nearly all its speed'],
            ['Density', '1.0 g/cm³', 'Used with the collision volume to compute mass'],
            ['Friction / Restitution Combine Mode', 'Average', 'How two touching materials\' values merge: Average, Min, Multiply or Max'],
            ['Surface Type', 'Default', 'A project-defined tag (Grass, Metal, Wood…) for footsteps and impact effects'],
          ],
        },
        {
          type: 'p',
          text: 'Combine modes matter more than they first appear. An ice floor (friction 0.05) under a rubber tyre (1.0) averages to 0.525 — hardly slippery. Set the ice material\'s friction combine mode to **Min** and the pair uses 0.05, so *everything* slides on ice, whatever it is made of.',
        },
        {
          type: 'code',
          title: 'Using physical materials from C++',
          code: `#include "PhysicalMaterials/PhysicalMaterial.h"

// A power-up turns the crate into a super ball
Mesh->SetPhysMaterialOverride(BouncyMaterial);

// Surface-aware footsteps from a downward trace
Params.bReturnPhysicalMaterial = true;
if (GetWorld()->LineTraceSingleByChannel(
        Hit, From, To, ECC_Visibility, Params)) {
    if (const UPhysicalMaterial* Mat = Hit.PhysMaterial.Get()) {
        PlayFootstep(Mat->SurfaceType);
    }
}`,
          annotations: [
            { lines: 4, text: '`BouncyMaterial` is a `TObjectPtr<UPhysicalMaterial>` `UPROPERTY` assigned in the editor.' },
            { lines: 7, text: 'From the traces lesson: ask the trace to return the surface\'s physical material.' },
            { lines: '10-11', text: '`PhysMaterial` is a weak pointer, so `.Get()` may return null. `SurfaceType` is the tag you defined under Project Settings → Physics → Physical Surface. `PlayFootstep` stands in for your audio code.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why put this in an asset?',
          text: 'Surface behaviour is a property of *what something is made of*, shared across hundreds of meshes. One "Ice" asset referenced by every icy material means a single place to tune slipperiness, and a single surface type for footsteps, decals and sounds. Hard-coding friction per actor would scatter that knowledge everywhere.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'A "super ball" should bounce almost forever, whatever surface it lands on. Floors use the default physical material (restitution 0.3). What should its physical material use?',
      options: [
        {
          text: 'Restitution near 1.0 with Restitution Combine Mode = **Max**',
          correct: true,
          why: 'Yes. A restitution near 1 keeps almost all speed, and Max means the pair uses the higher of the two values, so the dull floor cannot drag it down.',
        },
        {
          text: 'Restitution near 1.0 with the default **Average** combine mode',
          why: 'Averaged with the floor\'s 0.3, the pair gets about 0.65 — the ball loses a third of its speed on every bounce and soon stops.',
        },
        {
          text: 'Friction 0 with Friction Combine Mode = **Min**',
          why: 'Friction controls sliding, not bouncing. The ball would skate across the floor but still lose its bounce.',
        },
        {
          text: 'Density near 0, so it is very light',
          why: 'Mass does not decide how much speed a bounce preserves; restitution does. A very light ball just gets knocked about more by everything else.',
        },
      ],
      explanation:
        'Restitution sets the bounciness of a material; the combine mode decides how it mixes with whatever it hits. When an object should behave the same on any surface, give it an extreme value and the combine mode that lets that value win (Max for bounce, Min for slipperiness).',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Physics vs kinematic movement',
      blocks: [
        {
          type: 'p',
          text: 'Not everything that moves should simulate. [[kinematic-movement|Kinematic]] movement — setting positions directly, usually with sweeps — is what characters, doors, elevators and most projectiles use.',
        },
        {
          type: 'table',
          headers: ['Aspect', 'Physics simulation', 'Kinematic movement'],
          rows: [
            ['Who decides the position', 'The physics solver, from forces and contacts', 'Your code (or a movement component)'],
            ['Predictability', 'Emergent; sensitive to timing and tiny differences', 'Exactly what you wrote'],
            ['Pushing other bodies', 'By mass and momentum', 'As if it had infinite mass — simulated bodies get shoved aside'],
            ['Networking', 'Hard: results diverge between machines', 'Easy to replicate or predict'],
            ['Good for', 'Debris, props, ragdolls, vehicles', 'Characters, doors, platforms, most projectiles'],
          ],
        },
        {
          type: 'p',
          text: 'The Character Movement Component is the prime example: walking is kinematic, which is why characters stop instantly, climb stairs and never tip over. Games mix the two freely — a classic is switching a dead character to a ragdoll:',
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp',
          code: `void AMyCharacter::EnterRagdoll() {
    GetCapsuleComponent()->SetCollisionEnabled(
        ECollisionEnabled::NoCollision);
    GetCharacterMovement()->DisableMovement();

    GetMesh()->SetCollisionProfileName(TEXT("Ragdoll"));
    GetMesh()->SetSimulatePhysics(true);
}`,
          annotations: [
            { lines: '2-4', text: 'Stop the kinematic system: the capsule no longer collides and the movement component stops driving the actor.' },
            { lines: 6, text: 'The built-in Ragdoll preset gives the mesh physics-enabled collision. It must come before simulation starts.' },
            { lines: 7, text: 'Every body in the character\'s Physics Asset now simulates; the mesh crumples under gravity.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Moving a simulated body by hand',
          text: 'Calling `SetActorLocation` on a simulating actor teleports it, and the solver may treat the jump as a huge velocity. Pass `ETeleportType::TeleportPhysics` as the teleport argument so the body keeps its velocity rather than gaining one from the jump — and prefer forces and impulses for anything that should look physical.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Networking caveats and stability',
      blocks: [
        {
          type: 'p',
          text: 'Physics simulation is not deterministic across machines: tiny differences in frame timing, floating-point results and the order things happen make two copies of the same simulation drift apart. In multiplayer that has consequences:',
        },
        {
          type: 'list',
          items: [
            '**The server is the authority.** For gameplay-relevant physics objects, the server simulates and replicates the result (with *Replicate Movement* enabled); clients display it and smooth out corrections.',
            '**Apply gameplay forces on the server.** If each client applies its own impulse, every machine computes a slightly different outcome and the server keeps snapping clients back. Guard with `HasAuthority()`, as in the barrel example.',
            '**Cosmetic physics can stay local.** Debris, shell casings and ragdolls that do not affect gameplay can simulate independently on each client and are never replicated.',
            '**Prefer kinematic for anything players fight over.** Characters, important projectiles and moving platforms are kinematic precisely because they must match closely on every machine.',
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          text: 'UE5 has been adding networked physics features — prediction and resimulation for physics objects — but they are advanced and still evolving. Learn the authority model first; the networking unit covers it.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Stability and cost',
          text: 'Fast, small objects can tunnel through thin walls between steps; enable **CCD** (continuous collision detection) on the body for things like thrown grenades. Large stacks and long chains of constraints get jittery at low frame rates; the project\'s physics settings offer **substepping** to run several smaller physics steps per frame. Both improve accuracy at a CPU cost — use them where they are needed, not globally.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'In a multiplayer game, each client calls `AddImpulse` on a replicated physics crate when *their* player kicks it. What is the likely result?',
      options: [
        {
          text: 'The kick looks identical on every machine, because physics is deterministic',
          why: 'Physics is not deterministic across machines; small differences grow quickly, especially after collisions.',
        },
        {
          text: 'The crate moves differently on each machine, and clients see it jump as the server\'s authoritative state overrides theirs',
          correct: true,
          why: 'Right. The server never applied the kick (or applied a different one), so its replicated state disagrees with what each client simulated — visible as snapping and rubber-banding.',
        },
        {
          text: 'Nothing happens: impulses can only be applied on the server',
          why: 'Clients can call `AddImpulse` and it does move their local copy. It just is not authoritative.',
        },
        {
          text: 'The impulses are added together on the server, so the crate flies too far',
          why: 'Client-side calls are not sent to the server automatically. Sending input to the server requires an RPC (covered in the networking unit).',
        },
      ],
      explanation:
        'Clients should *request* the action (via an RPC) and the server should apply the impulse with authority, then replicate the result. This "server decides, clients display" model is the heart of Unreal networking, and physics is where ignoring it hurts the most.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'order',
      prompt: 'Order these lines so a character\'s mesh becomes a ragdoll and is thrown back by the hit that killed it.',
      lines: [
        'GetMesh()->SetCollisionProfileName(TEXT("Ragdoll"));',
        'GetMesh()->SetSimulatePhysics(true);',
        'GetMesh()->AddImpulse(HitDir * 8000.0, Hit.BoneName, true);',
      ],
      distractors: ['GetMesh()->SetMobility(EComponentMobility::Static);'],
      explanation:
        'Collision must include physics before simulation can begin, so the Ragdoll profile comes first; then simulation starts; only a *simulating* body responds to an impulse, so the push comes last. Applying it to `Hit.BoneName` with `bVelChange = true` throws the limb that was hit. Static mobility is the opposite of what you want — static components cannot move at all.',
    },
  ],
  takeaways: [
    'Simulation needs physics-enabled collision, simple collision shapes and Movable mobility; simulate the root component.',
    'Mass = collision volume × physical-material density × Mass Scale unless overridden; units are cm and kg, so forces are in kg·cm/s² (1/100 N).',
    '`AddForce` is a continuous push re-applied every tick and integrated over time; `AddImpulse` is an instant momentum change applied once. `bAccelChange` / `bVelChange` ignore mass.',
    'Explosions: overlap query for nearby bodies, then `AddRadialImpulse` on each simulating component (de-duplicated); or use `URadialForceComponent`.',
    'Physical materials set friction, restitution, density and surface type; combine modes decide how two materials mix.',
    'Use kinematic movement for things that must be precise or networked; apply gameplay physics on the server and keep cosmetic physics local.',
  ],
  reading: [
    {
      title: 'Physics in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/unreal-engine/physics-in-unreal-engine',
      source: 'unreal-docs',
      note: 'The entry point to Chaos: rigid bodies, collision, destruction, vehicles and networked physics.',
    },
    {
      title: 'Physical Materials Reference',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/physical-materials-reference-for-unreal-engine',
      source: 'unreal-docs',
      note: 'Every physical material property, including combine modes and surface types.',
    },
    {
      title: 'Collision Overview',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-in-unreal-engine---overview',
      source: 'unreal-docs',
      note: 'How collision settings interact with simulation — useful when a body refuses to simulate or collide.',
    },
  ],
};
