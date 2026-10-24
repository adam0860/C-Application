import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'observer-pattern',
    term: 'Observer Pattern',
    aliases: ['Publish–Subscribe', 'Observer'],
    course: 'both',
    category: 'Design Patterns',
    short:
      'A design where a *subject* announces events and any number of *observers* subscribe to them, so the subject never needs to know who is listening.',
    long:
      'The subject keeps a list of callbacks and invokes them when something happens ("health reached zero"). Observers add and remove themselves. Because the subject depends only on the callback *signature*, new reactions — UI, audio, achievements — can be added without editing it.\n\nIn standard C++ you might store `std::function` objects in a vector; in Unreal, multicast delegates implement the pattern directly.',
    see: ['delegate', 'multicast-delegate', 'std-function'],
  },
  {
    id: 'fdelegatehandle',
    term: 'FDelegateHandle',
    course: 'unreal',
    category: 'Delegates',
    short:
      'A small token returned by a native multicast delegate\'s `Add…` functions that identifies one binding, so you can later `Remove(Handle)` exactly that binding.',
    long:
      'Native bindings such as lambdas have no name to search for, so the handle is the reliable way to unsubscribe. Store it in a member, remove it in `EndPlay` (or the destructor), and call `Reset()` on it afterwards. `IsValid()` tells you whether it currently refers to a binding.',
    example:
      'DeathHandle = Health->OnDeath.AddUObject(this, &AScoreKeeper::OnDied);\n// later\nHealth->OnDeath.Remove(DeathHandle);',
    see: ['multicast-delegate', 'delegate'],
  },
  {
    id: 'add-dynamic',
    term: 'AddDynamic',
    aliases: ['RemoveDynamic', 'BindDynamic', 'AddUniqueDynamic'],
    course: 'unreal',
    category: 'Delegates',
    short:
      'The helper macro that binds a `UFUNCTION` to a dynamic multicast delegate. It turns `&AMyActor::Handler` into the function\'s *name*, which is what the delegate stores.',
    long:
      'The member-function pointer is only used at compile time to check the signature. At broadcast time the engine looks the function up by name through reflection, so the handler **must** be a `UFUNCTION()` — otherwise the lookup fails and the event never reaches it. `RemoveDynamic` unbinds; `AddUniqueDynamic` avoids double binding.',
    example: 'Box->OnComponentBeginOverlap.AddDynamic(this, &APickup::OnOverlap);',
    see: ['dynamic-delegate', 'ufunction', 'reflection'],
  },
  {
    id: 'sparse-delegate',
    term: 'Sparse Delegate',
    course: 'unreal',
    category: 'Delegates',
    short:
      'A memory-saving variant of a dynamic multicast delegate whose storage is only allocated once something binds to it. Many component events, such as `OnComponentHit`, are sparse.',
    long:
      'A level can contain tens of thousands of primitive components, and most of their events are never bound. Sparse delegates keep their invocation lists in a shared side table instead of inside every object. You use them exactly like ordinary dynamic multicast delegates (`AddDynamic`, `RemoveDynamic`, `Broadcast`).',
    see: ['dynamic-delegate', 'primitive-component'],
  },
  {
    id: 'generate-overlap-events',
    term: 'Generate Overlap Events',
    aliases: ['bGenerateOverlapEvents', 'SetGenerateOverlapEvents'],
    course: 'unreal',
    category: 'Collision',
    short:
      'A per-component flag that must be enabled on **both** components for begin/end overlap events to fire between them. Set it with `SetGenerateOverlapEvents(true)`.',
    long:
      'Tracking overlaps costs CPU every time a component moves, so it is opt-in. Even with the flag on, the two components\' collision responses must resolve to Overlap (neither side ignores, not both block).',
    see: ['overlap-event', 'collision-response', 'primitive-component'],
  },
  {
    id: 'simulation-generates-hit-events',
    term: 'Simulation Generates Hit Events',
    aliases: ['bNotifyRigidBodyCollision', 'SetNotifyRigidBodyCollision'],
    course: 'unreal',
    category: 'Collision',
    short:
      'A component flag that makes collisions produced by **physics simulation** fire hit events. Blocking hits from swept (kinematic) movement fire hit events without it.',
    long:
      'Physics contacts happen constantly between simulating bodies, so reporting them to gameplay code is opt-in per component. In C++ it is `SetNotifyRigidBodyCollision(true)`.',
    see: ['hit-event', 'physics-simulation'],
  },
];
