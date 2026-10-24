import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
// (TStrongObjectPtr and FGCObject are defined by u03-uobject; this unit links to them.)
export const glossary: GlossaryEntry[] = [
  {
    id: 'tsharedfromthis',
    term: 'TSharedFromThis',
    aliases: ['AsShared', 'SharedThis'],
    course: 'unreal',
    category: 'Memory',
    short:
      'A base class that lets an object managed by `TSharedPtr`/`TSharedRef` create new shared references to itself with `AsShared()` or `SharedThis(this)`. Unreal\'s `std::enable_shared_from_this`.',
    long:
      'Creating a second `TSharedPtr` from a raw `this` would start a second, independent reference count and lead to a double delete. Deriving from `TSharedFromThis<T>` stores a weak reference to the object\'s existing control block, so `AsShared()` joins the existing count. It only works once the object is already owned by a shared pointer — not in its constructor.',
    example: `class FQuestTracker
    : public TSharedFromThis<FQuestTracker> {
public:
    void Register() {
        Registry.Add(AsShared());
    }
};`,
    see: ['tsharedptr', 'tweakptr'],
  },
  {
    id: 'espmode',
    term: 'ESPMode (Thread-Safety Mode)',
    aliases: ['ESPMode::ThreadSafe', 'ESPMode::NotThreadSafe'],
    course: 'unreal',
    category: 'Memory',
    short:
      'The template parameter that decides whether a `TSharedPtr`\'s reference count uses atomic operations (`ESPMode::ThreadSafe`, the default since UE5) or plain increments (`ESPMode::NotThreadSafe`).',
    long:
      'Atomic reference counting lets shared pointers to the same object be copied and destroyed on different threads safely, at a small cost per copy. `NotThreadSafe` is slightly faster but only correct when every copy is used on a single thread. The mode only protects the reference count — not the pointed-to object, and not a single pointer variable written from several threads.',
    see: ['tsharedptr', 'atomic'],
  },
  {
    id: 'fsoftobjectpath',
    term: 'FSoftObjectPath',
    course: 'unreal',
    category: 'Assets',
    short:
      'A struct holding the full path of an asset or object, such as `/Game/Weapons/SM_Rifle.SM_Rifle`, without loading it. The data inside every `TSoftObjectPtr` and `TSoftClassPtr`.',
    long:
      'Because it is only a name, a soft object path creates no load dependency: the referenced asset stays on disk until you resolve the path with `TryLoad()`, a synchronous load, or an async request through `FStreamableManager`. Since UE 5.1 it stores an `FTopLevelAssetPath` (package and asset name) plus an optional sub-object path.',
    example: `FSoftObjectPath Path(
    TEXT("/Game/Weapons/SM_Rifle.SM_Rifle"));
UObject* Mesh = Path.TryLoad();  // synchronous`,
    see: ['tsoftobjectptr', 'soft-reference', 'streamable-manager'],
  },
  {
    id: 'streamable-manager',
    term: 'FStreamableManager',
    aliases: ['RequestAsyncLoad', 'FStreamableHandle'],
    course: 'unreal',
    category: 'Assets',
    short:
      'The engine object that loads assets from soft paths, synchronously or asynchronously, and keeps them in memory while a returned `FStreamableHandle` is held.',
    long:
      'Get the game\'s shared instance with `UAssetManager::GetStreamableManager()`. `RequestAsyncLoad(Paths, Delegate)` starts loading in the background and returns a `TSharedPtr<FStreamableHandle>`; the delegate runs on the game thread once everything has loaded. While you hold the handle, the loaded assets stay referenced; release it (or let it go out of scope) when you no longer need them.',
    example: `Handle = UAssetManager::GetStreamableManager()
    .RequestAsyncLoad(Path,
        FStreamableDelegate::CreateUObject(
            this, &AMyActor::OnLoaded));`,
    see: ['async-loading', 'asset-manager', 'fsoftobjectpath'],
  },
  {
    id: 'reference-viewer',
    term: 'Reference Viewer and Size Map',
    aliases: ['Reference Viewer', 'Size Map'],
    course: 'unreal',
    category: 'Assets',
    short:
      'Two Content Browser tools for auditing load dependencies. The Reference Viewer graphs what an asset references (and what references it); the Size Map shows how much memory or disk an asset pulls in with all of its hard dependencies.',
    long:
      'Right-click an asset and choose *Reference Viewer* or *Size Map*. The Reference Viewer distinguishes hard from soft references and can filter each, making load chains visible. The Size Map is the quickest way to discover that a small Blueprint is dragging hundreds of megabytes of meshes, textures and sounds into memory.',
    see: ['hard-reference', 'soft-reference'],
  },
];
