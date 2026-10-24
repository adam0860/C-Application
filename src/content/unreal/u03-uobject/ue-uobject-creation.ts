import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-uobject-creation',
  title: 'Creating Objects the Unreal Way',
  summary: 'Why `new` is off-limits for UObjects, and when to use NewObject, CreateDefaultSubobject and SpawnActor instead.',
  minutes: 17,
  objectives: [
    'Explain what `NewObject` does that a plain `new` cannot, and why UObjects are never `delete`d',
    'Create objects with `NewObject<T>(Outer)` and choose a sensible Outer',
    'Use `CreateDefaultSubobject` in constructors and explain why it fails anywhere else',
    'Explain why actors must be created with `SpawnActor` and a World',
    'Describe the Class Default Object and why constructors must not contain gameplay logic',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Why `new` is off-limits',
      blocks: [
        {
          type: 'p',
          text: 'In the C++ course you created heap objects with [[new-expression|new]] and, better, with `std::make_unique`. For anything derived from [[uobject]], forget both. A `UObject` is not just memory with a constructor run on it — it is an entry in an engine-wide registry, and only the engine\'s factory functions create those entries correctly.',
        },
        {
          type: 'compare',
          left: {
            title: 'Standard C++ habit',
            tone: 'bad',
            code: `UQuest* Quest = new UQuest();   // never
delete Quest;                    // never`,
            text: 'Skips registration: no class pointer, no name, no Outer, invisible to the garbage collector and to reflection.',
          },
          right: {
            title: 'Unreal',
            tone: 'good',
            code: `UQuest* Quest = NewObject<UQuest>(this);
// no delete: the garbage collector frees it`,
            text: 'The engine allocates, registers and initializes the object, and later frees it when nothing references it.',
          },
        },
        {
          type: 'p',
          text: 'Here is what [[newobject|NewObject]] does, in order:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Allocate', text: 'Memory comes from the engine\'s object allocator, sized from the class\'s reflection data — which also works for Blueprint classes that have no C++ type of their own.' },
            { title: 'Register', text: 'The object gets a slot in the **global object table** (`GUObjectArray`) and its class pointer, Outer and name are set. That slot index is how the garbage collector and weak pointers find it.' },
            { title: 'Construct', text: 'Your C++ constructor runs.' },
            { title: 'Apply defaults and subobjects', text: 'Default values from the class\'s template object are applied — for a Blueprint class, the values set in its *Class Defaults* — and default subobjects (such as components) are instanced.' },
            { title: 'Post-init', text: '`PostInitProperties()` is called, a hook where an object can react to its final initial values.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why Unreal takes creation away from you',
          text: 'Every engine system you saw in the reflection lesson assumes every `UObject` is registered: the garbage collector walks the object table, the save system needs names and Outers, Blueprints need the class pointer. A raw `new` would create an object that half the engine cannot see — a time bomb. So Unreal makes the safe path the only path. In fact `new UQuest()` normally does not even compile: `GENERATED_BODY()` declares special `operator new` overloads reserved for the engine, and they hide the ordinary one.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'order',
      prompt: 'Put the steps `NewObject<UQuest>(this)` performs in order.',
      linesAreCode: false,
      lines: [
        'Allocate memory sized from the class\'s reflection data',
        'Register the object in the global object table with its class, Outer and name',
        'Run the C++ constructor',
        'Apply the class template\'s default values and instance default subobjects',
        'Call `PostInitProperties()`',
      ],
      distractors: ['Call `BeginPlay()`'],
      explanation:
        'Registration happens *before* your constructor runs, which is why `GetClass()`, `GetOuter()` and `GetName()` already work inside a constructor. Defaults from the template (for example a Blueprint\'s Class Defaults) are applied *after* it, so the constructor never sees them. `BeginPlay` belongs to actors entering gameplay, not to object creation.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'NewObject<T>(Outer)',
      blocks: [
        {
          type: 'p',
          text: '`NewObject` is the general-purpose factory for non-actor `UObject`s. Its essential parameters are the **Outer** (who contains the new object) and, optionally, the **class** to instantiate, which may be a subclass of `T` — including a Blueprint class chosen by a designer.',
        },
        {
          type: 'code',
          title: 'QuestBoard.h',
          code: `UCLASS()
class MYGAME_API AQuestBoard : public AActor {
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Quests")
    UQuest* PostQuest(TSubclassOf<UQuest> QuestClass);

private:
    UPROPERTY()
    TArray<TObjectPtr<UQuest>> PostedQuests;
};`,
          annotations: [
            { lines: 7, text: '[[tsubclassof|TSubclassOf<UQuest>]] holds a `UClass*` restricted to `UQuest` or its subclasses — for example `BP_FetchQuest` made by a designer.' },
            { lines: '10-11', text: 'The array is a `UPROPERTY`, so the garbage collector knows the board holds these quests. Without it, they would be collected (see the next lesson).' },
          ],
        },
        {
          type: 'code',
          title: 'QuestBoard.cpp',
          code: `#include "QuestBoard.h"
#include "Quest.h"

UQuest* AQuestBoard::PostQuest(TSubclassOf<UQuest> QuestClass) {
    if (!QuestClass) {
        return nullptr;
    }
    UQuest* Quest = NewObject<UQuest>(this, QuestClass);
    PostedQuests.Add(Quest);
    return Quest;
}`,
          annotations: [
            { lines: '5-7', text: 'A `TSubclassOf` can be empty (a designer forgot to set it). Always check before creating.' },
            { lines: 8, text: 'Outer = `this` (the board); class = whatever was passed in. The return type is `UQuest*` even if the real class is a Blueprint child.' },
            { lines: 9, text: 'Keep a reflected reference. The Outer alone does **not** keep the quest alive.' },
          ],
        },
        {
          type: 'table',
          headers: ['Call', 'Creates'],
          rows: [
            ['`NewObject<UQuest>(this)`', 'A `UQuest`, Outer `this`, auto-generated name like `Quest_0`'],
            ['`NewObject<UQuest>(this, QuestClass)`', 'An instance of `QuestClass` (must derive from `UQuest`)'],
            ['`NewObject<UQuest>(this, QuestClass, TEXT("MainQuest"))`', 'Same, with an explicit name — it must be unique within the Outer'],
            ['`NewObject<UQuest>()`', 'Outer defaults to the [[transient-package]]: no owner, no world, never saved. Rarely what you want.'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Leave the name alone',
          text: 'Pass a name only when something will look the object up by it. Two objects with the same name in the same Outer is an error, and auto-generated names are guaranteed unique.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'Once you are finished with a `UObject` you created with `NewObject`, you should `delete` it to avoid a memory leak.',
      answer: false,
      explanation:
        'The garbage collector owns every `UObject`. Calling `delete` frees memory the engine still has registered in its object table, so the collector will later touch freed memory — a crash or heap corruption. To "free" a `UObject`, stop referencing it (remove it from your `UPROPERTY`s) and the next collection reclaims it. Actors are the exception that proves the rule: you call `Destroy()` on them, which removes them from the world, and the collector still frees the memory.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'The Outer: who contains whom',
      blocks: [
        {
          type: 'p',
          text: 'Every `UObject` except a package has an [[outer|Outer]]: the object that contains it. Following Outers upward always ends at a `UPackage` — the unit that is saved to or loaded from a file. For a quest posted on a board placed in the *Forest* map:',
        },
        {
          type: 'memory',
          caption: 'Each object points to its Outer. Following the chain gives the object\'s full path and its world.',
          regions: [
            {
              label: 'Outer chain',
              kind: 'other',
              cells: [
                { id: 'q', name: 'Quest_0', type: 'UQuest', value: 'Outer →', pointsTo: 'b' },
                { id: 'b', name: 'QuestBoard_1', type: 'AQuestBoard', value: 'Outer →', pointsTo: 'l' },
                { id: 'l', name: 'PersistentLevel', type: 'ULevel', value: 'Outer →', pointsTo: 'w' },
                { id: 'w', name: 'Forest', type: 'UWorld', value: 'Outer →', pointsTo: 'p' },
                { id: 'p', name: '/Game/Maps/Forest', type: 'UPackage', value: 'no Outer (top)' },
              ],
            },
          ],
        },
        {
          type: 'p',
          text: 'The quest\'s full path name is `/Game/Maps/Forest.Forest:PersistentLevel.QuestBoard_1.Quest_0`. The Outer chain decides several things:',
        },
        {
          type: 'list',
          items: [
            '**Identity**: names only need to be unique within one Outer, and the path name identifies an object across save and load.',
            '**Saving**: an object is saved into the package at the top of its chain. Objects in the transient package are never saved.',
            '**World access**: `UObject::GetWorld()` walks up the Outers until something knows its [[world]]. A quest outered to an actor can call `GetWorld()`; one outered to the transient package gets `nullptr` and cannot start timers or spawn actors.',
            '**Lookups**: `GetOuter()` returns the direct container and `GetTypedOuter<AActor>()` finds the nearest Outer of a given type.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The Outer does not keep an object alive',
          text: 'This surprises almost everyone. An object keeps its **Outer** alive (the collector follows the inner-to-outer link), but an Outer does **not** keep its inner objects alive. If you `NewObject<UQuest>(this)` and store the result only in a local variable, the quest is collected at the next garbage collection even though the board is alive and well. Ownership for the garbage collector is expressed with `UPROPERTY` references, never with the Outer.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A postal address, not a lifeline',
          text: 'The Outer is like a postal address: *Forest, Level, Quest Board, Quest #0*. It tells everyone where the object lives and lets it find the town hall (the world). But being listed at an address does not mean anyone is looking after you — that is what a `UPROPERTY` reference does.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: 'In an actor you write `UQuest* Temp = NewObject<UQuest>(this);`, use it briefly, and keep no other reference. The actor stays in the level for the rest of the game. What happens to the quest?',
      options: [
        {
          text: 'It stays alive as long as the actor does, because the actor is its Outer',
          why: 'The Outer link points from the quest to the actor, so it keeps the *actor* alive, not the quest. Outers never keep inner objects alive.',
        },
        {
          text: 'It is destroyed at the end of the function, like a local variable',
          why: '`Temp` is a local *pointer*; the object it points to lives on the heap. Nothing destroys it at the closing brace.',
        },
        {
          text: 'It is freed by a later garbage collection, because nothing reachable references it',
          correct: true,
          why: 'Correct. With no `UPROPERTY` (or other GC-visible) reference, the quest is unreachable and is reclaimed at the next collection — whenever that happens to run.',
        },
        {
          text: 'It leaks for the rest of the game because it was never deleted',
          why: 'Unreal objects are not deleted manually. Unreachable objects are freed by the garbage collector, so this does not leak.',
        },
      ],
      explanation:
        'Two separate ideas: the **Outer** describes containment (naming, saving, world access) and the **references** the collector can see describe ownership. For a short-lived helper this behaviour is fine — it disappears on its own. For anything you need later, store it in a `UPROPERTY`.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'CreateDefaultSubobject: parts built in the constructor',
      blocks: [
        {
          type: 'p',
          text: 'Some objects are part of a class\'s definition: every lantern has a mesh, every character has a camera. These are **default subobjects**, created in the constructor with [[createdefaultsubobject|CreateDefaultSubobject]]:',
        },
        {
          type: 'code',
          title: 'Lantern.cpp',
          code: `#include "Lantern.h"
#include "Components/StaticMeshComponent.h"

ALantern::ALantern() {
    Mesh = CreateDefaultSubobject<UStaticMeshComponent>(
        TEXT("Mesh"));
    SetRootComponent(Mesh);
}`,
          annotations: [
            { lines: '5-6', text: 'Creates a `UStaticMeshComponent` whose Outer is the lantern. `Mesh` is a `UPROPERTY() TObjectPtr<UStaticMeshComponent>` declared in the header.' },
            { lines: 6, text: 'The name identifies the subobject **within the class**. It must be unique, and it is what saved levels and Blueprint children use to match their edits to this subobject.' },
            { lines: 7, text: 'Components and the root component are the subject of the next unit; for now, note that they are default subobjects.' },
          ],
        },
        {
          type: 'p',
          text: 'Default subobjects are special because the constructor runs for the class\'s template object too (you will see why below). The subobject created there becomes a template, and every new lantern gets its own copy initialized from it. That is why components created this way appear in the Blueprint editor as *inherited* components whose properties designers can tweak per Blueprint and per placed instance.',
        },
        {
          type: 'table',
          headers: ['Question', 'CreateDefaultSubobject', 'NewObject'],
          rows: [
            ['Where you may call it', 'Only inside a constructor', 'Outside constructors (inside one, the engine tells you to use `CreateDefaultSubobject`)'],
            ['What it makes', 'A part of every instance of the class', 'One object, now'],
            ['Shows in the Blueprint editor', 'Yes, as an inherited part', 'No'],
            ['Designers can edit its defaults', 'Yes, per Blueprint and per instance', 'No'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why only in constructors?',
          text: '`CreateDefaultSubobject` works through the object initializer that `NewObject` sets up while a constructor is running; that is how it knows which object is being built and whether there is a template subobject to copy from. Outside a constructor there is no initializer, so the engine stops with a fatal error. At run time, create extra parts with `NewObject` instead (for components, followed by `RegisterComponent()`, covered next unit).',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Do not rename subobjects casually',
          text: 'Changing `TEXT("Mesh")` to `TEXT("LanternMesh")` makes every saved level and Blueprint lose the edits they made to that component, because they are matched by name. Pick good names before content depends on them.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'bug',
      prompt: 'This actor crashes with a fatal error as soon as it enters play. Tap the faulty line.',
      code: `ATorch::ATorch() {
    PrimaryActorTick.bCanEverTick = false;
}

void ATorch::BeginPlay() {
    Super::BeginPlay();
    Glow = CreateDefaultSubobject<UPointLightComponent>(
        TEXT("Glow"));
    Glow->SetupAttachment(GetRootComponent());
}`,
      bugLines: [7],
      hint: 'One of these creation functions only works while a constructor is running.',
      explanation:
        '`CreateDefaultSubobject` may only be called from a constructor, where the engine has an object initializer for the object being built. In `BeginPlay` there is none, so the engine stops with a fatal error. Move the creation (and `SetupAttachment`) into the constructor so every torch has its light, or — if the part really must be added at run time — use `NewObject<UPointLightComponent>(this)` and then register and attach it.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'SpawnActor: actors need a world',
      blocks: [
        {
          type: 'p',
          text: 'An [[actor]] is a `UObject` that lives *in a level*: it has a place in the world, components registered with the renderer and the physics scene, and it receives `BeginPlay` and `Tick`. `NewObject<AFireball>()` would give you an actor that no world knows about — never added to a level, its components never registered, `BeginPlay` never called. Actors are created by the world itself with [[spawnactor|SpawnActor]]:',
        },
        {
          type: 'code',
          title: 'Wizard.cpp',
          code: `void AWizard::CastFireball() {
    UWorld* World = GetWorld();
    if (!World || !FireballClass) {
        return;
    }
    const FVector Location = GetActorLocation();
    const FRotator Rotation = GetActorRotation();
    World->SpawnActor<AFireball>(FireballClass, Location, Rotation);
}`,
          annotations: [
            { lines: 2, text: 'Spawning is a [[world]] operation. `GetWorld()` returns the world this actor lives in.' },
            { lines: 8, text: 'Creates the actor through `NewObject` internally, adds it to the level, registers its components, runs its construction and calls `BeginPlay` — all before returning. The full story is in the last lesson of the next unit.' },
          ],
        },
        {
          type: 'table',
          headers: ['You want…', 'Use'],
          rows: [
            ['A plain `UObject` (quest, inventory item data, helper)', '`NewObject<T>(Outer)`'],
            ['A part of every instance of your class (e.g. a mesh component)', '`CreateDefaultSubobject<T>(Name)` in the constructor'],
            ['A component added at run time', '`NewObject<T>(Actor)` then `RegisterComponent()`'],
            ['An actor in the level', '`GetWorld()->SpawnActor<T>(...)`'],
            ['A struct', 'Just declare it — it is a value, not an object'],
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'Every instance of your `AGuardCharacter` class needs a camera component that designers can adjust in the Blueprint editor. How should you create it?',
      options: [
        {
          text: '`CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"))` in the constructor',
          correct: true,
          why: 'Correct. It becomes a default subobject: part of every instance, visible as an inherited component, editable per Blueprint and per instance.',
        },
        {
          text: '`NewObject<UCameraComponent>(this)` in `BeginPlay`',
          why: 'That creates the camera only at run time, so it never appears in the Blueprint editor for designers to adjust — and it would also need registering and attaching by hand.',
        },
        {
          text: '`GetWorld()->SpawnActor<UCameraComponent>(...)`',
          why: '`SpawnActor` creates actors. A component is not an actor; it must belong to one.',
        },
        {
          text: '`new UCameraComponent()` in the constructor',
          why: 'Never `new` a `UObject`: it would skip registration with the engine (and normally does not even compile).',
        },
      ],
      explanation:
        'Match the creation function to the object\'s role: parts of a class → `CreateDefaultSubobject` in the constructor; run-time objects → `NewObject`; actors → `SpawnActor`. Only the first makes a part designers can see and tune in the editor.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'The Class Default Object',
      blocks: [
        {
          type: 'p',
          text: 'For every class, the engine creates one special instance when the class is initialized: the [[cdo|Class Default Object (CDO)]], named like `Default__Enemy`. It is created by running your constructor, and it holds the class\'s default property values. A Blueprint\'s *Class Defaults* panel is literally an editor for that Blueprint class\'s CDO.',
        },
        {
          type: 'p',
          text: 'The CDO is used constantly:',
        },
        {
          type: 'list',
          items: [
            '**Template for new instances**: new objects start from the defaults it holds.',
            '**Compact saving**: levels store only the properties of each placed actor that *differ* from its class defaults.',
            '**Reading defaults without spawning**: you can ask a class for its default values directly.',
          ],
        },
        {
          type: 'code',
          title: 'ShopKeeper.cpp',
          code: `int32 AShopKeeper::GetPriceOf(
    TSubclassOf<AWeapon> WeaponClass) const {
    if (!WeaponClass) {
        return 0;
    }
    const AWeapon* Defaults = WeaponClass.GetDefaultObject();
    return Defaults->Price;
}`,
          annotations: [
            { lines: 6, text: 'Reads the CDO of whatever weapon class the designer configured (say `BP_FlameSword`) — showing its price in a shop menu without spawning a single sword. `GetDefault<AWeapon>()` does the same for a class known in code.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Treat the CDO as read-only',
          text: '`GetMutableDefault<T>()` exists, but changing a CDO at run time changes the starting values of every object of that class created afterwards — a confusing, global side effect. Read from it freely; write to it only for deliberate engine-level settings.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Spotting the CDO',
          text: 'Code that must behave differently for the CDO can test `HasAnyFlags(RF_ClassDefaultObject)`. You will rarely need this if constructors only set defaults — which is the point of the next card.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Constructors run in surprising places',
      blocks: [
        {
          type: 'p',
          text: 'In standard C++ a constructor runs when *you* create an object. In Unreal, your constructor also runs when:',
        },
        {
          type: 'list',
          items: [
            'The engine or editor **starts up** and builds the CDO — no game is running and `GetWorld()` returns `nullptr`.',
            'A level **loads** — the constructor runs first, and the values saved in the level (what the designer typed in the Details panel) are applied **afterwards**.',
            'You **drag an actor into the editor viewport**, recompile a Blueprint, or the content is cooked for shipping.',
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'Constructor', text: '`MaxHealth = 100.0f;` — the C++ default. A designer\'s value of 250 is not visible yet.' },
            { title: 'Class defaults applied', text: 'If the actor is a Blueprint child, values from its *Class Defaults* are copied in.' },
            { title: 'Saved instance values applied', text: 'The level\'s data for this particular actor is loaded: `MaxHealth` becomes 250.' },
            { title: 'BeginPlay (when the game starts)', text: 'Gameplay code runs and sees the final value, 250.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Gameplay in the constructor',
            tone: 'bad',
            code: `AEnemy::AEnemy() {
    Health = MaxHealth;        // still 100
    GetWorld()->SpawnActor<AWeapon>(
        WeaponClass);          // crashes for the CDO
}`,
            text: 'Runs for the CDO (no world), runs in the editor, and sees values before the designer\'s edits are applied.',
          },
          right: {
            title: 'Defaults in the constructor, gameplay in BeginPlay',
            tone: 'good',
            code: `AEnemy::AEnemy() {
    PrimaryActorTick.bCanEverTick = true;
    MaxHealth = 100.0f;
}

void AEnemy::BeginPlay() {
    Super::BeginPlay();
    Health = MaxHealth;        // designer's value
}`,
            text: 'The constructor only sets defaults and creates components; gameplay starts in `BeginPlay`.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why Unreal works this way',
          text: 'The engine needs the CDO before any game runs, so it can show defaults in the editor, save levels compactly as differences, and copy defaults into new objects. And loading a level is "construct, then apply saved values" because the saved data is only the differences from the defaults. Both facts make the constructor a **defaults recipe**, not a "the game has started" event. The next unit\'s lifecycle lesson shows exactly where gameplay setup belongs.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: '`AEnemy`\'s constructor sets `MaxHealth = 100.0f` and then logs `MaxHealth`. A designer placed an enemy in the level and set its `MaxHealth` to 250 in the Details panel. When the level loads, what does the constructor log for that enemy?',
      options: [
        {
          text: '250',
          why: 'Per-instance values saved in the level are applied *after* the constructor, so it cannot see them yet.',
        },
        {
          text: '100',
          correct: true,
          why: 'Correct. The constructor runs first, with C++ defaults; the saved 250 is loaded afterwards. `BeginPlay` would log 250.',
        },
        {
          text: 'Nothing — constructors do not run for actors placed in a level',
          why: 'They do. Every object is constructed, whether spawned, loaded from a level, or created as a CDO.',
        },
        {
          text: '0, because properties are zeroed until `BeginPlay`',
          why: 'Your constructor just assigned 100, so 100 is what it sees. Properties are not reset before `BeginPlay`; the saved value simply overwrites the default when the level data is applied.',
        },
      ],
      explanation:
        'Loading is "construct with defaults, then apply the saved differences". That ordering is why constructors must not make decisions based on property values a designer can change — move that logic to `BeginPlay` (or, for editor previews, `OnConstruction`, covered next unit).',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'bug',
      prompt: 'The editor crashes on startup after this change. Tap the line responsible.',
      code: `AMineSpawner::AMineSpawner() {
    PrimaryActorTick.bCanEverTick = false;
    SpawnInterval = 3.0f;
    GetWorld()->GetTimerManager().SetTimer(
        SpawnTimer, this, &AMineSpawner::SpawnMine,
        SpawnInterval, true);
}`,
      bugLines: [4],
      hint: 'Which object is constructed before any level or game exists?',
      explanation:
        'The constructor runs for the Class Default Object when the editor starts, long before any world exists, so `GetWorld()` returns `nullptr` and line 4 dereferences it. Even for real instances, timers are gameplay: they should start when play begins. Keep lines 2–3 (defaults) in the constructor and move the `SetTimer` call to `BeginPlay`, after `Super::BeginPlay()`.',
    },
  ],
  takeaways: [
    'Never `new` or `delete` a `UObject`: `NewObject` allocates it, registers it in the global object table with class, Outer and name, constructs it and applies defaults; the garbage collector frees it.',
    '`NewObject<T>(Outer, Class)` creates plain `UObject`s — including Blueprint subclasses chosen through `TSubclassOf`.',
    'The Outer is containment (path name, saving, `GetWorld()`), not ownership: only `UPROPERTY` references keep an object alive.',
    '`CreateDefaultSubobject` creates per-instance parts such as components and only works inside constructors.',
    'Actors must be created by a world with `SpawnActor`, which registers them with the level, rendering and physics and calls `BeginPlay`.',
    'Every class has a Class Default Object, built by running the constructor at startup; it holds defaults and lets you read them without spawning.',
    'Constructors run for the CDO, in the editor and before saved values are applied — so they set defaults and create components, never run gameplay.',
  ],
  reading: [
    {
      title: 'Creating Objects',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-objects-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s reference for `NewObject`, its parameters, and object flags.',
    },
    {
      title: 'Objects',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/objects-in-unreal-engine',
      source: 'unreal-docs',
      note: 'What every `UObject` gets from the engine, including the CDO and Outers.',
    },
    {
      title: 'Unreal Object Handling',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-object-handling-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How the engine tracks, initializes, serializes and destroys objects.',
    },
    {
      title: 'new expression',
      url: 'https://en.cppreference.com/w/cpp/language/new',
      source: 'cppreference',
      note: 'See how class-specific `operator new` overloads are looked up before the global one — the rule that makes `new UQuest()` fail to compile.',
    },
  ],
};
