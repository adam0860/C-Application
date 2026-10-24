import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'collision-enabled',
    term: 'Collision Enabled',
    aliases: ['ECollisionEnabled', 'NoCollision', 'QueryOnly', 'PhysicsOnly', 'QueryAndPhysics'],
    course: 'unreal',
    category: 'Collision',
    short:
      'The per-component setting that says which collision systems use it: `NoCollision`, `QueryOnly` (traces, sweeps, overlaps), `PhysicsOnly` (rigid-body simulation) or `QueryAndPhysics`.',
    long:
      'Queries and physics are separate consumers of collision shapes. A trigger volume only needs queries; debris that should tumble but never stop a bullet only needs physics; a crate you can both shoot and knock over needs both. Disabling what you do not need saves CPU.',
    example: 'Mesh->SetCollisionEnabled(ECollisionEnabled::QueryOnly);',
    see: ['collision-object-type', 'collision-profile'],
  },
  {
    id: 'collision-object-type',
    term: 'Object Type (collision)',
    aliases: ['Object Channel', 'Object Response Channel'],
    course: 'unreal',
    category: 'Collision',
    short:
      'The collision channel a component *is* — WorldStatic, WorldDynamic, Pawn, PhysicsBody, Vehicle, Destructible or a custom object channel. Each component has exactly one.',
    long:
      'Other components decide how to respond to you based on your object type: a wall blocks `Pawn`, a trigger overlaps it. Set it with `SetCollisionObjectType(ECC_PhysicsBody)` or via a collision profile.',
    see: ['collision-channel', 'trace-channel', 'collision-response'],
  },
  {
    id: 'trace-channel',
    term: 'Trace Channel',
    aliases: ['Trace Response Channel'],
    course: 'unreal',
    category: 'Collision',
    short:
      'A collision channel that represents a *question* asked by traces and sweeps — built-in `Visibility` and `Camera`, or custom ones such as "Interact". Components respond to it but never *are* it.',
    long:
      'A line trace by channel asks every component "how do you respond to this channel?": Block stops the trace, Overlap is reported by multi traces, Ignore lets it pass. Custom trace channels appear in C++ as `ECC_GameTraceChannel1`…`18`.',
    see: ['collision-channel', 'collision-object-type', 'line-trace'],
  },
  {
    id: 'simple-complex-collision',
    term: 'Simple vs Complex Collision',
    aliases: ['bTraceComplex', 'Use Complex As Simple'],
    course: 'unreal',
    category: 'Collision',
    short:
      'Simple collision is a set of cheap primitives (boxes, spheres, capsules, convex hulls) authored for a mesh; complex collision is the mesh\'s actual triangles. Physics simulates simple shapes; traces can opt into complex with `bTraceComplex`.',
    long:
      'Complex traces are precise to the visible surface but cost more, and only complex traces return a triangle `FaceIndex`. Simulating bodies need simple collision — a mesh whose collision is only per-triangle cannot be simulated as a dynamic rigid body.',
    see: ['line-trace', 'physics-simulation'],
  },
  {
    id: 'physical-material',
    term: 'Physical Material',
    aliases: ['UPhysicalMaterial', 'Phys Material'],
    course: 'unreal',
    category: 'Physics',
    short:
      'An asset describing how a surface behaves physically — friction, restitution (bounciness), density — plus a Surface Type used for footsteps and impact effects.',
    long:
      'Assign one in a material\'s *Phys Material* slot or override it per component with `SetPhysMaterialOverride`. Combine modes (Average, Min, Multiply, Max) decide how two touching materials\' friction and restitution are merged. Traces can return the hit surface\'s physical material when `bReturnPhysicalMaterial` is set.',
    see: ['physics-simulation', 'fhitresult'],
  },
  {
    id: 'chaos-physics',
    term: 'Chaos',
    aliases: ['Chaos Physics'],
    course: 'unreal',
    category: 'Physics',
    short:
      'Unreal Engine 5\'s built-in physics engine, which replaced NVIDIA PhysX. It handles rigid bodies, collision queries, destruction, cloth and vehicles.',
    long:
      'Most gameplay code talks to Chaos indirectly through `UPrimitiveComponent` functions such as `SetSimulatePhysics`, `AddForce` and `AddImpulse`, and through the world\'s trace and sweep functions, so code written against those APIs carried over from UE4.',
    see: ['physics-simulation', 'impulse'],
  },
  {
    id: 'kinematic-movement',
    term: 'Kinematic Movement',
    aliases: ['Kinematic'],
    course: 'unreal',
    category: 'Physics',
    short:
      'Moving an object by setting its position directly (often with sweeps) rather than letting the physics engine integrate forces. Characters, doors and projectile-movement actors are kinematic.',
    long:
      'Kinematic motion is predictable, easy to network and fully under your control; simulated bodies it pushes treat it as if it had infinite mass. Physics simulation gives emergent, realistic motion at the cost of control and determinism.',
    see: ['physics-simulation', 'character-movement-component', 'sweep'],
  },
];
