import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'damage-type',
    term: 'Damage Type (UDamageType)',
    aliases: ['UDamageType', 'DamageTypeClass'],
    course: 'unreal',
    category: 'Gameplay',
    short:
      'A class (not an instance) passed along with damage to describe *what kind* of damage it is — fire, fall, explosion — so receivers can react differently.',
    long:
      'You create subclasses of `UDamageType` (in C++ or Blueprint) and pass the class as a `TSubclassOf<UDamageType>` to `ApplyDamage`. Receivers get the class\'s default object as a `const UDamageType*` and can inspect it, for example to apply resistances. When no class is given, the engine uses the base `UDamageType`.',
    see: ['apply-damage', 'tsubclassof'],
  },
  {
    id: 'damage-instigator',
    term: 'Instigator',
    aliases: ['GetInstigator', 'GetInstigatorController', 'EventInstigator', 'InstigatedBy'],
    course: 'unreal',
    category: 'Gameplay',
    short:
      'The pawn responsible for an actor\'s actions — for example the character who fired a projectile. Damage functions pass the instigator\'s controller so kills and damage can be credited.',
    long:
      'Set it through `FActorSpawnParameters::Instigator` when spawning, read it with `GetInstigator()` or `GetInstigatorController()`. It differs from the **Owner**, which describes ownership for networking and relevancy: a projectile is usually owned by and instigated by the same character, but a turret placed by a player might be owned by the level while crediting its kills to that player.',
    see: ['apply-damage', 'spawnactor', 'pawn'],
  },
  {
    id: 'mesh-socket',
    term: 'Socket',
    aliases: ['mesh socket', 'GetSocketTransform', 'GetSocketLocation'],
    course: 'unreal',
    category: 'Components',
    short:
      'A named attachment point on a static or skeletal mesh — such as `Muzzle` on a gun or `hand_r` on a skeleton — that you can query for a transform or attach components to.',
    long:
      'Sockets are added in the mesh or skeleton editor and follow the bone or mesh they belong to, including during animation. `GetSocketTransform(Name)` and `GetSocketLocation(Name)` return the socket\'s current world transform. If the name does not exist, they quietly return the component\'s own transform, so check `DoesSocketExist(Name)` when a missing socket would be a bug.',
    see: ['scene-component', 'ftransform'],
  },
  {
    id: 'rotating-movement-component',
    term: 'Rotating Movement Component',
    aliases: ['URotatingMovementComponent', 'RotationRate'],
    course: 'unreal',
    category: 'Components',
    short:
      'A built-in movement component that continuously rotates a scene component at a `RotationRate` (degrees per second), with no code in your actor.',
    long:
      'By default it rotates the actor\'s root; set its `UpdatedComponent` to spin just one child, such as a pickup\'s mesh. It ticks on its own, so the owning actor can keep its Tick disabled, and designers can tune or disable it per instance.',
    see: ['actor-component', 'tick'],
  },
  {
    id: 'niagara',
    term: 'Niagara',
    aliases: ['UNiagaraSystem', 'UNiagaraComponent', 'Niagara VFX'],
    course: 'unreal',
    category: 'Rendering',
    short:
      'Unreal\'s visual-effects system for particles: sparks, smoke, magic, impacts. Effects are `UNiagaraSystem` assets, played at run time through a `UNiagaraComponent`.',
    long:
      'From C++, `UNiagaraFunctionLibrary::SpawnSystemAtLocation` plays a one-shot effect in the world and `SpawnSystemAttached` attaches it to a component. Niagara is a plugin, so a module that uses its classes must add `"Niagara"` to its Build.cs dependencies.',
    see: ['asset', 'build-cs'],
  },
  {
    id: 'actor-lifespan',
    term: 'Actor Lifespan',
    aliases: ['InitialLifeSpan', 'SetLifeSpan'],
    course: 'unreal',
    category: 'Actors',
    short:
      'A timer that destroys an actor automatically after a number of seconds. `InitialLifeSpan` sets it as a default; `SetLifeSpan(Seconds)` sets it at run time.',
    long:
      '`AActor::BeginPlay` applies `InitialLifeSpan`, which is one more reason never to forget `Super::BeginPlay()`. A value of 0 means "live forever". It is the standard way to clean up projectiles that miss, ragdolls and spent effects.',
    see: ['actor-lifecycle', 'beginplay'],
  },
];
