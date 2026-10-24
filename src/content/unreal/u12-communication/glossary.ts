import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'castchecked',
    term: 'CastChecked<T>',
    course: 'unreal',
    category: 'Reflection',
    short:
      'A cast that asserts (in development builds) if the object is not a `T` or is null. In shipping builds the check is compiled out and it behaves like a plain `static_cast`.',
    long:
      'Use `CastChecked` when a failed cast can only mean a programming or setup error — for example, a component that is designed to live only on characters. It turns a silent `nullptr` into an immediate, descriptive failure during development. Because shipping builds skip the check, never use it on input that can legitimately be another type; use `Cast` and handle `nullptr` instead. Pass `ECastCheckedType::NullAllowed` to permit a null input.',
    example: `ACharacter* Char = CastChecked<ACharacter>(GetOwner());`,
    see: ['ue-cast', 'check-macro'],
  },
  {
    id: 'interface-execute',
    term: 'Execute_ Functions',
    aliases: ['Execute_Interact', 'Execute_'],
    course: 'unreal',
    category: 'Reflection',
    short:
      'Static wrapper functions UHT generates for every `BlueprintNativeEvent` or `BlueprintImplementableEvent` in an interface, such as `IInteractable::Execute_Interact(Object, …)`. They call the right implementation whether it is written in C++ or Blueprint.',
    long:
      'A Blueprint class that implements an interface has no C++ vtable entry for it, so a C++ virtual call cannot reach its implementation. `Execute_` functions look up the function by name in the object\'s class through reflection and invoke it with `ProcessEvent`, which runs the Blueprint override if there is one or the native `_Implementation` otherwise. Calling the interface function directly instead asserts. Check `Implements<UInterfaceName>()` before calling.',
    example: `if (Target->Implements<UInteractable>()) {
    IInteractable::Execute_Interact(Target, this);
}`,
    see: ['uinterface', 'blueprint-native-event', 'tscriptinterface'],
  },
  {
    id: 'tscriptinterface',
    term: 'TScriptInterface',
    course: 'unreal',
    category: 'Reflection',
    short:
      'A reflected reference to "some UObject that implements interface `I`". It stores the object pointer plus, for C++ implementers, the interface pointer, and can be a `UPROPERTY` or a Blueprint-visible parameter.',
    long:
      '`TScriptInterface<IInteractable>` lets you store or pass an interface-typed reference that the garbage collector and Blueprints understand. `GetObject()` returns the UObject; `GetInterface()` returns the `IInteractable*`, which is `nullptr` when the object implements the interface only in Blueprint. To call event functions safely, use `IInteractable::Execute_Interact(Ref.GetObject(), …)`.',
    example: `UPROPERTY()
TScriptInterface<IInteractable> FocusedTarget;`,
    see: ['interface-execute', 'uinterface'],
  },
  {
    id: 'coupling',
    term: 'Coupling',
    aliases: ['tight coupling', 'loose coupling', 'decoupling'],
    course: 'both',
    category: 'Design',
    short:
      'How much one piece of code depends on the details of another. Tightly coupled code must change when its dependencies change; loosely coupled code depends only on small, stable contracts.',
    long:
      'In Unreal, coupling shows up as concrete types in casts, direct references between specific actors, and hard asset references between Blueprints. Interfaces, delegates and message systems reduce coupling by letting code depend on a contract ("can be interacted with", "an enemy died") instead of on concrete classes. Lower coupling makes code easier to extend and reuse, at the cost of making control flow less explicit.',
    see: ['interface', 'delegate', 'ue-cast'],
  },
  {
    id: 'event-hub',
    term: 'Event Hub (Event Bus)',
    aliases: ['event bus', 'message bus'],
    course: 'both',
    category: 'Design',
    short:
      'A central object that relays events between systems, so senders and listeners only know the hub, not each other. In Unreal, often a subsystem exposing multicast delegates.',
    long:
      'Instead of a quest system binding to every enemy, or every enemy calling the quest system, enemies broadcast "enemy killed" on the hub and any interested system listens there. A `UWorldSubsystem` or `UGameInstanceSubsystem` is a natural home: one instance per world or game, created automatically and reachable from anywhere with `GetSubsystem<T>()`. The trade-off is indirection: following who reacts to an event requires searching for its listeners.',
    see: ['subsystem', 'multicast-delegate', 'coupling'],
  },
  {
    id: 'gameplay-message-subsystem',
    term: 'Gameplay Message Subsystem',
    aliases: ['UGameplayMessageSubsystem', 'GameplayMessageRouter'],
    course: 'unreal',
    category: 'Design',
    short:
      'A message router from Epic\'s Lyra sample (the GameplayMessageRouter plugin): systems broadcast arbitrary `USTRUCT` payloads on channels identified by gameplay tags, and listeners register for those channels.',
    long:
      '`UGameplayMessageSubsystem::Get(this).BroadcastMessage(Channel, Payload)` sends a message; `RegisterListener<FPayload>(Channel, …)` receives it and returns a handle used to unregister. Neither side references the other, or even a shared delegate type — only the channel tag and the payload struct. It is not part of the core engine; projects copy the plugin from Lyra.',
    see: ['event-hub', 'gameplay-tag', 'subsystem'],
  },
];
