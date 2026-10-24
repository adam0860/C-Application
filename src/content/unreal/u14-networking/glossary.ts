import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'net-mode',
    term: 'Net Mode (ENetMode)',
    aliases: ['ENetMode', 'GetNetMode', 'NM_Client', 'NM_ListenServer', 'NM_DedicatedServer', 'NM_Standalone'],
    course: 'unreal',
    category: 'Networking',
    short:
      'What kind of process a game instance is: `NM_Standalone` (no networking), `NM_DedicatedServer`, `NM_ListenServer` (server plus a local player) or `NM_Client`. Returned by `GetNetMode()`.',
    long:
      'The enum values are ordered so that `GetNetMode() < NM_Client` means "this process is a server or standalone". Most gameplay code should not branch on the net mode; checking authority (`HasAuthority()`) and local control (`IsLocallyControlled()`) works the same in every mode. Net-mode checks are useful for skipping cosmetic work on dedicated servers or for logging.',
    see: ['listen-server', 'dedicated-server', 'authority', 'net-role'],
  },
  {
    id: 'net-relevancy',
    term: 'Network Relevancy',
    aliases: ['Relevancy', 'NetCullDistanceSquared', 'bAlwaysRelevant', 'bOnlyRelevantToOwner'],
    course: 'unreal',
    category: 'Networking',
    short:
      'The server\'s per-connection decision about which replicated actors a client should receive at all, based on distance, ownership and flags such as `bAlwaysRelevant`.',
    long:
      'By default an actor is relevant to a client within `NetCullDistanceSquared` of the client\'s viewpoint. `bAlwaysRelevant` sends it to everyone, `bOnlyRelevantToOwner` only to its owning client, and `bNetUseOwnerRelevancy` makes it relevant whenever its owner is.\n\nWhen an actor stops being relevant, the client\'s copy is destroyed; when it becomes relevant again, a new copy is created with the current replicated state. One-off events (such as multicast RPCs) sent while an actor was irrelevant are never seen by that client, which is why lasting state belongs in replicated properties.',
    see: ['replication', 'owning-connection'],
  },
  {
    id: 'owning-connection',
    term: 'Owner and Owning Connection',
    aliases: ['Net Owner', 'SetOwner', 'GetNetConnection'],
    course: 'unreal',
    category: 'Networking',
    short:
      'An actor\'s owning connection is the client connection found by following its `Owner` chain up to a PlayerController. It decides who may call Server RPCs on the actor and who receives Client RPCs and owner-only properties.',
    long:
      'A possessed pawn is owned by its PlayerController, and a PlayerState by its controller, so they have an owning connection. A door placed in the level has no owner and therefore no owning connection: a client calling a Server RPC on it is dropped with a "No owning connection" warning. The server can assign ownership with `SetOwner()`, for example to make a spawned weapon owned by the character carrying it.',
    see: ['rpc', 'replication-condition', 'player-controller'],
  },
  {
    id: 'replication-condition',
    term: 'Replication Condition',
    aliases: ['DOREPLIFETIME_CONDITION', 'COND_OwnerOnly', 'COND_SkipOwner', 'ELifetimeCondition'],
    course: 'unreal',
    category: 'Networking',
    short:
      'A per-property filter, set with `DOREPLIFETIME_CONDITION`, that limits which connections receive a replicated property — for example `COND_OwnerOnly` or `COND_SkipOwner`.',
    long:
      'Conditions save bandwidth and hide information. `COND_OwnerOnly` sends a property only to the actor\'s owning client (ammo, cooldowns), `COND_SkipOwner` sends it to everyone except the owner (state the owner already simulates locally), and `COND_InitialOnly` sends it only when the actor is first replicated. `COND_None` (the default) sends it to every connection the actor is relevant to.',
    example: `DOREPLIFETIME_CONDITION(AHeroCharacter, Ammo, COND_OwnerOnly);`,
    exampleLang: 'cpp',
    see: ['replication', 'owning-connection', 'repnotify'],
  },
  {
    id: 'net-update-frequency',
    term: 'NetUpdateFrequency',
    aliases: ['Net Update Frequency', 'MinNetUpdateFrequency', 'NetPriority'],
    course: 'unreal',
    category: 'Networking',
    short:
      'The maximum number of times per second the server considers an actor for replication. Lower values save server CPU and bandwidth at the cost of less frequent updates.',
    long:
      'Each time an actor is considered, the server compares its replicated properties against what each connection last received and sends only the differences. Fast-moving, important actors (player characters) need high frequencies; slowly changing ones (a scoreboard, a door) can use a few updates per second. `MinNetUpdateFrequency` lets the engine back off adaptively when nothing changes, and `NetPriority` decides who wins when bandwidth is scarce. Recent engine versions deprecate writing the member directly in favour of `SetNetUpdateFrequency()`.',
    see: ['replication', 'push-model-replication'],
  },
  {
    id: 'push-model-replication',
    term: 'Push-Model Replication',
    aliases: ['Push Model', 'MARK_PROPERTY_DIRTY_FROM_NAME', 'bIsPushBased'],
    course: 'unreal',
    category: 'Networking',
    short:
      'An opt-in replication mode where code explicitly marks a property dirty when it changes, so the server can skip comparing that property on every net update.',
    long:
      'Without push model, the server polls: every net update it compares every replicated property of every relevant actor against the last values sent. With push model you register the property with `FDoRepLifetimeParams::bIsPushBased = true` and call `MARK_PROPERTY_DIRTY_FROM_NAME(Class, Property, this)` whenever you change it. It requires the `NetCore` module, and a property that is changed without being marked dirty will not replicate.',
    see: ['replication', 'net-update-frequency'],
  },
  {
    id: 'reliable-rpc',
    term: 'Reliable vs Unreliable RPC',
    aliases: ['Reliable', 'Unreliable'],
    course: 'unreal',
    category: 'Networking',
    short:
      'A `Reliable` RPC is guaranteed to arrive (resent until acknowledged, in order with other reliable calls on that actor); an `Unreliable` RPC may be dropped, which is fine for frequent or cosmetic events.',
    long:
      'Use `Reliable` for important one-off events — "use", "buy", "activate ability", a chat message. Use `Unreliable` for things that are frequent, superseded by the next update, or purely cosmetic — footsteps, muzzle flashes, continuous aim updates. Reliable calls queue in a limited buffer; spamming them (for example from `Tick`) can overflow it and disconnect the client.',
    see: ['rpc', 'replication'],
  },
];
