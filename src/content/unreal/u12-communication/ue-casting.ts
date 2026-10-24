import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-casting',
  title: 'Cast, IsA and Class Hierarchies',
  summary:
    'Safe downcasting the Unreal way: how Cast<T> uses reflection instead of RTTI, its checked and exact variants, and the hidden load cost of casting to Blueprints.',
  minutes: 15,
  objectives: [
    'Downcast safely with `Cast<T>` and handle its `nullptr` result',
    'Explain why Unreal\'s casts use `UClass` data instead of C++ RTTI',
    'Choose between `Cast`, `CastChecked`, `IsA`, `ExactCast` and `GetClass()->IsChildOf()`',
    'Recognise the hard-reference cost of casting to Blueprint classes and avoid it',
    'Replace cast chains with component queries or cached casts',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Why you need to cast',
      blocks: [
        {
          type: 'p',
          text: 'Engine APIs hand you **base-class** pointers. An overlap event gives you an `AActor*`, `GetOwner()` returns an `AActor*`, a line trace\'s hit result contains an `AActor*`. The engine cannot know about your `AEnemy` or `AMyCharacter`. To call their specific functions, you must ask: *is this actor actually one of mine?* Converting a base pointer to a derived pointer is a **downcast**, and it can fail.',
        },
        {
          type: 'code',
          title: 'SpikeTrap.cpp',
          code: `void ASpikeTrap::OnSpikesOverlap(
    UPrimitiveComponent* OverlappedComp, AActor* OtherActor,
    UPrimitiveComponent* OtherComp, int32 OtherBodyIndex,
    bool bFromSweep, const FHitResult& SweepResult) {
    // OtherActor might be a crate, a projectile, a pawn...
    if (AMyCharacter* Hero = Cast<AMyCharacter>(OtherActor)) {
        Hero->ApplySpikeDamage(SpikeDamage);
    }
}`,
          annotations: [
            { lines: 2, text: 'The engine only promises "some actor". It is your job to find out which kind.' },
            { lines: 6, text: '[[ue-cast|Cast<T>]] returns an `AMyCharacter*` if `OtherActor` is an `AMyCharacter` **or any subclass** (including Blueprints derived from it), and `nullptr` otherwise. Declaring the variable inside the `if` limits it to the branch where it is known to be valid.' },
            { lines: 7, text: 'Inside the `if`, `Hero` is guaranteed non-null and of the right type, so calling `AMyCharacter`-only functions is safe.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why upcasts are free and downcasts need a check',
          text: 'Every `AMyCharacter` *is an* `ACharacter`, an `APawn`, an `AActor` and a `UObject`, so converting upwards is always valid and happens implicitly — that is [[polymorphism]] at work. The reverse is not true: an arbitrary `AActor` may be a crate. A downcast must check the object\'s real type at runtime, exactly like `dynamic_cast` in standard C++, and report failure. `Cast<T>` reports it as `nullptr`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Cast is null-safe',
          text: '`Cast<T>(nullptr)` simply returns `nullptr`, so you never need a separate null check before casting. `Cast` also accepts `TObjectPtr` and works with `const` pointers (`Cast<const AEnemy>(ConstActor)`).',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'A line trace hits a crate. `ACrate` derives from `AActor` but not from `AEnemy`. What happens here?',
      code: `AActor* HitActor = Hit.GetActor();      // the crate
AEnemy* Enemy = Cast<AEnemy>(HitActor);
UE_LOG(LogTemp, Log, TEXT("%s"),
    Enemy ? TEXT("enemy") : TEXT("not an enemy"));`,
      options: [
        { text: 'It logs "not an enemy": `Cast` returns `nullptr` when the object is not an `AEnemy`', correct: true, why: 'A failed `Cast` is not an error; it is the answer "no". The `nullptr` result is the signal.' },
        { text: 'It crashes on line 2 because the object is the wrong type', why: '`Cast` never crashes on a type mismatch. `CastChecked` would assert, but plain `Cast` returns `nullptr`.' },
        { text: 'It logs "enemy": `Cast` reinterprets the pointer like `static_cast`', why: 'That is precisely what `Cast` avoids. A blind `static_cast` would give you a bogus `AEnemy*` to a crate; `Cast` checks first.' },
        { text: 'It does not compile: you cannot cast between unrelated actor classes', why: '`AEnemy` and `ACrate` share the base `AActor`, and the pointer\'s static type is `AActor*`, so the downcast is legal and checked at runtime.' },
      ],
      explanation:
        '`Cast<T>` asks the object for its class at runtime. If that class is `T` or derives from `T`, you get a correctly typed pointer; otherwise you get `nullptr`. Treat the result like any pointer that may be null: test it before use, ideally with the `if (T* X = Cast<T>(...))` idiom.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'How Cast works: UClass, not RTTI',
      blocks: [
        {
          type: 'p',
          text: 'Every UObject knows its class. `Obj->GetClass()` returns a `UClass*`: an object, generated through [[reflection]], that describes the class — its name, properties, functions and, crucially, its **parent class**. `Cast<AEnemy>(Obj)` essentially does this:',
        },
        {
          type: 'code',
          title: 'What Cast<T> does (simplified)',
          code: `template <typename T>
T* CastSketch(UObject* Obj) {
    if (Obj && Obj->GetClass()->IsChildOf(T::StaticClass())) {
        return static_cast<T*>(Obj);
    }
    return nullptr;
}`,
          annotations: [
            { lines: 3, text: '`T::StaticClass()` is the `UClass` for `T`. `IsChildOf` answers "is the object\'s class `T` itself, or derived from it?" using the class hierarchy recorded by reflection.' },
            { lines: 4, text: 'Once the check has passed, a [[static-cast|static_cast]] is safe and costs nothing at runtime.' },
          ],
        },
        {
          type: 'table',
          headers: ['Question', '`dynamic_cast<T*>` (standard C++)', '`Cast<T>` (Unreal)'],
          rows: [
            ['Type information from', 'Compiler-generated RTTI', '`UClass` objects built by reflection'],
            ['Knows about Blueprint classes?', 'No — they are not C++ types', 'Yes — they have `UClass`es like any other class'],
            ['Requires', 'RTTI enabled', 'Nothing extra; works with RTTI off'],
            ['On failure', '`nullptr`', '`nullptr`'],
            ['Works on', 'Any polymorphic C++ type', 'UObjects (and Unreal interfaces)'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just use dynamic_cast?',
          text: 'Two reasons. First, Unreal modules compile with C++ RTTI **turned off** by default (`bUseRTTI = false` in Build.cs), which shrinks binaries and removes type-info overhead from every polymorphic class, so the standard [[dynamic-cast|dynamic_cast]] machinery is not available. Second, and more fundamentally, a [[blueprint-class]] such as `BP_Goblin` is created at runtime from an asset — there is no C++ type for the compiler to describe. Only reflection knows that `BP_Goblin` derives from `AEnemy`, so only a reflection-based cast can answer questions about it.',
        },
        {
          type: 'deepdive',
          title: 'How fast is IsChildOf?',
          blocks: [
            {
              type: 'p',
              text: 'In cooked (non-editor) builds, each class stores an array of its ancestors, indexed by depth. Checking "is `C` a child of `T`?" becomes: look up the entry at `T`\'s depth in `C`\'s ancestor array and compare — a constant-time operation, regardless of how deep the hierarchy is. Editor builds instead walk the parent chain, because Blueprint recompilation and Live Coding can replace classes on the fly. Either way, a cast costs nanoseconds.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'order',
      prompt: 'Put the steps that `Cast<AEnemy>(Obj)` performs in order.',
      lines: [
        'Return `nullptr` immediately if `Obj` is null',
        'Get the object\'s class with `Obj->GetClass()`',
        'Ask whether that class `IsChildOf(AEnemy::StaticClass())`',
        'If it is, `static_cast` the pointer to `AEnemy*` and return it; otherwise return `nullptr`',
      ],
      linesAreCode: false,
      explanation:
        'The null check comes first, which is why `Cast` is null-safe. Then the object\'s runtime class is compared against the target class using reflection data. Only after that check succeeds is the pointer converted with a plain `static_cast`, which is safe because the type is now known.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'CastChecked, IsA, ExactCast and class checks',
      blocks: [
        {
          type: 'p',
          text: '`Cast` is the everyday tool, but Unreal offers variants for different intentions. Picking the right one documents what you expect.',
        },
        {
          type: 'code',
          title: 'CastVariants.cpp',
          code: `// The owner MUST be a character; anything else is a bug
ACharacter* OwnerChar = CastChecked<ACharacter>(GetOwner());

// A yes/no question; no pointer needed
if (OtherActor->IsA<AProjectile>()) {
    return;  // projectiles are handled elsewhere
}

// Only the base APickup class itself, not subclasses
if (APickup* Plain = ExactCast<APickup>(Item)) {
    Plain->SetPlaceholderVisuals();
}

// Class-level question, e.g. on a designer-chosen class
if (SpawnClass->IsChildOf(ABossEnemy::StaticClass())) {
    PlayBossMusic();
}`,
          annotations: [
            { lines: 2, text: '[[castchecked|CastChecked]] asserts with a descriptive message if the cast fails (or if the input is null). In shipping builds the check is compiled out and it becomes a plain `static_cast` — fast, but no longer safe.' },
            { lines: 5, text: '`IsA<T>()` returns a `bool` with the same subclass rule as `Cast`. It is a **member function**, so the object pointer must not be null.' },
            { lines: 10, text: '`ExactCast<T>` succeeds only if the object\'s class is exactly `T`; subclasses (including Blueprints) fail.' },
            { lines: 15, text: '`UClass::IsChildOf` works on classes rather than instances — useful for `TSubclassOf` values before anything is spawned.' },
          ],
        },
        {
          type: 'table',
          headers: ['Tool', 'Returns', 'On mismatch', 'Use when'],
          rows: [
            ['`Cast<T>(Obj)`', '`T*`', '`nullptr`', 'The object might not be a `T` — the normal case'],
            ['`CastChecked<T>(Obj)`', '`T*`', 'Assert (dev builds)', 'Anything else would be a programming or setup error'],
            ['`Obj->IsA<T>()`', '`bool`', '`false`', 'You only need to know, not to use `T`\'s members'],
            ['`ExactCast<T>(Obj)`', '`T*`', '`nullptr`', 'Subclasses must be excluded (rare)'],
            ['`Cls->IsChildOf(T::StaticClass())`', '`bool`', '`false`', 'You have a `UClass*`, not an instance'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'CastChecked is not a faster Cast',
          text: 'Use `CastChecked` only when failure means the program is broken — for example, a component that is only ever added to characters. It turns a silent `nullptr` into a loud failure during development, which is great for catching setup mistakes early. But in shipping it performs no check at all, so using it on input that can legitimately be something else leads to [[undefined-behavior]] for players.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      multi: true,
      prompt: '`Obj` is an instance of `BP_Knight`, a Blueprint whose parent is the C++ class `AMyCharacter` (which derives from `ACharacter` → `APawn` → `AActor`). Which expressions succeed (non-null or `true`)? Select all that apply.',
      options: [
        { text: '`Cast<APawn>(Obj)`', correct: true, why: '`BP_Knight` is a descendant of `APawn`, so the cast succeeds.' },
        { text: '`Cast<AMyCharacter>(Obj)`', correct: true, why: 'Blueprint subclasses count as subclasses: `BP_Knight` derives from `AMyCharacter`.' },
        { text: '`ExactCast<AMyCharacter>(Obj)`', why: 'The exact class is `BP_Knight_C` (the Blueprint\'s generated class), not `AMyCharacter`, so `ExactCast` fails.' },
        { text: '`Cast<AController>(Obj)`', why: 'Controllers are a separate branch of the actor hierarchy. A character is possessed *by* a controller; it is not one.' },
        { text: '`Obj->IsA<AActor>()`', correct: true, why: 'Every character is an actor; `IsA` follows the same subclass rule as `Cast`.' },
      ],
      explanation:
        '`Cast` and `IsA` succeed for the class itself and anything below it in the hierarchy — including Blueprint classes, which have real `UClass`es that point at their C++ parent. `ExactCast` deliberately ignores inheritance. Casting across branches (pawn to controller) always fails.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'bug',
      prompt: '`OnDamageTaken` is sometimes called with a null `DamageCauser` (for example fall damage), and the game crashes whenever a player falls. Tap the line that crashes.',
      code: `void UDamageNumbers::OnDamageTaken(float Amount,
    AActor* DamageCauser) {
    if (DamageCauser->IsA<AProjectile>()) {
        SpawnNumber(Amount, FLinearColor::Yellow);
    } else if (AEnemy* Enemy = Cast<AEnemy>(DamageCauser)) {
        SpawnNumber(Amount, Enemy->GetDamageColor());
    } else {
        SpawnNumber(Amount, FLinearColor::White);
    }
}`,
      bugLines: [3],
      hint: 'Which of these checks is a member function called through the pointer?',
      explanation:
        '`IsA` is a member function, so `DamageCauser->IsA<AProjectile>()` dereferences a null pointer: a crash. `Cast` on line 5 is safe because it checks for null itself. Fix line 3 with `if (Cast<AProjectile>(DamageCauser))` or `if (IsValid(DamageCauser) && DamageCauser->IsA<AProjectile>())`. Falls would then reach the `else` branch and show a white number.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'The hidden cost: casting to Blueprint classes',
      blocks: [
        {
          type: 'p',
          text: 'At runtime a cast costs nanoseconds. Its real cost is elsewhere: **dependencies**. In a Blueprint graph, a *Cast To BP_SecretDoor* node needs the `BP_SecretDoor` class to exist, so the casting Blueprint holds a [[hard-reference]] to it. Load the lever, and the door Blueprint loads too — with its meshes, sounds, materials and anything *they* reference.',
        },
        {
          type: 'compare',
          left: {
            title: 'Cast to a Blueprint class',
            tone: 'bad',
            text: '`BP_Lever` → *Cast To BP_SecretDoor* → call `Open`. The lever now hard-references the door Blueprint and its whole asset chain. Do the same from twenty Blueprints and everything loads everything. Size Map makes it obvious.',
          },
          right: {
            title: 'Cast to a C++ base class',
            tone: 'good',
            text: 'Declare `Open()` on a C++ class `ADoorBase` and make `BP_SecretDoor` derive from it. `BP_Lever` casts to `ADoorBase`. C++ classes are code, always loaded and asset-free, so the cast creates no load dependency.',
          },
        },
        {
          type: 'p',
          text: 'In C++ you cannot write `Cast<BP_SecretDoor>` at all — Blueprint classes have no C++ type — so C++ casts are naturally to native classes. But the same trap appears through **class references**: a hard `TSubclassOf<AActor>` property set to a Blueprint, used for `IsA(DoorClass)` checks, loads that Blueprint with its owner.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why Epic recommends native base classes',
          text: 'A thin C++ (or minimal, asset-free Blueprint) base class gives other code something to cast to that carries the functions and properties they need, but none of the heavy assets. Content-heavy Blueprints become leaves of the hierarchy that nothing else references directly. This keeps load chains short and also reduces coupling: the lever depends on the idea of a door, not on one particular door asset. Interfaces, next lesson, take this one step further.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'The myth of the slow cast',
          text: 'You may hear "casting is expensive, never cast". The CPU cost is negligible; casting every frame is wasteful but not a performance disaster. The advice really targets Blueprint-class casts and the load chains they create — and the tight coupling of code that must know every concrete type it talks to.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'truefalse',
      prompt: 'Because `Cast<T>` is expensive at runtime, C++ code should avoid casting even when it needs to call a derived class\'s functions.',
      answer: false,
      explanation:
        'A cast is a null check, a class-hierarchy comparison (constant time in cooked builds) and a `static_cast` — nanoseconds. Casting when you need a derived type is correct and idiomatic. What deserves care is *what* you cast to: casting to Blueprint classes in Blueprint graphs creates hard references and load chains, and long chains of casts to many concrete types indicate coupling that interfaces or components could remove.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: '`BP_HealthPotion` uses *Cast To BP_Knight* to call the knight\'s `Heal` event. The Size Map shows the 50 KB potion pulling in 400 MB. What is the best fix?',
      options: [
        { text: 'Replace the node with a "Cast To BP_Knight" pure cast', why: 'Pure and impure cast nodes reference the class in exactly the same way; the dependency remains.' },
        { text: 'Declare `Heal` on a C++ base class (for example `AMyCharacter`), parent `BP_Knight` to it, and cast to the C++ class', correct: true, why: 'The potion now depends only on native code, which costs nothing to load. The 400 MB knight assets are no longer in its chain.' },
        { text: 'Make the potion\'s reference to itself soft', why: 'The problem is what the potion references, not how others reference the potion.' },
        { text: 'Cast less often, for example only on overlap', why: 'Frequency affects CPU time, not dependencies. The hard reference exists as soon as the node is in the graph.' },
      ],
      explanation:
        'A cast node creates a hard reference to its target class, regardless of how often it runs. Moving the shared API (`Heal`) into a native base class lets callers cast to something that brings no assets with it. An interface (next lesson) is the alternative when unrelated classes need the same ability.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Casting well: cache it, or ask for a component',
      blocks: [
        {
          type: 'p',
          text: 'Two habits keep casting code clean. First, if the answer never changes, **cast once and cache** the typed pointer. A component that always belongs to a character can cast its owner in `BeginPlay` instead of in every function:',
        },
        {
          type: 'code',
          title: 'StaminaComponent.cpp',
          code: `void UStaminaComponent::BeginPlay() {
    Super::BeginPlay();
    // Cached in: UPROPERTY() TObjectPtr<AMyCharacter> OwnerChar;
    OwnerChar = Cast<AMyCharacter>(GetOwner());
    if (!OwnerChar) {
        UE_LOG(LogTemp, Warning,
            TEXT("%s needs an AMyCharacter owner"), *GetName());
        SetComponentTickEnabled(false);
    }
}`,
          annotations: [
            { lines: 4, text: 'One cast for the component\'s whole life. The owner of a component does not change type.' },
            { lines: '5-9', text: 'A friendly warning instead of a crash if a designer adds the component to the wrong actor. (`CastChecked` would be the stricter choice.)' },
          ],
        },
        {
          type: 'p',
          text: 'Second, watch for **cast chains** — `if` / `else if` ladders trying one concrete type after another. They grow with every new type, and the caller must know all of them. Often what you really want is a *capability*, not a class. If the capability lives in an [[actor-component]], ask for the component instead:',
        },
        {
          type: 'compare',
          left: {
            title: 'Cast chain',
            tone: 'bad',
            code: `if (AEnemy* E = Cast<AEnemy>(Other)) {
    E->TakeHit(Damage);
} else if (ACrate* C = Cast<ACrate>(Other)) {
    C->Break();
} else if (ATurret* T = Cast<ATurret>(Other)) {
    T->TakeHit(Damage);
}`,
            text: 'Every new damageable type means editing this function again.',
          },
          right: {
            title: 'Query a capability',
            tone: 'good',
            code: `UHealthComponent* Health =
    Other->FindComponentByClass<UHealthComponent>();
if (Health) {
    Health->ApplyDamage(Damage);
}`,
            text: 'Anything with a health component can be damaged — no edits needed for new types.',
          },
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'When the capability is behaviour, not data',
          text: 'Components work well when the shared ability comes with state (health, inventory). When unrelated classes should each respond to the same message in their own way — a door opens, a chest pops, an NPC talks — reach for an interface, the subject of the next lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'fill',
      prompt: 'Choose the right casting tool for each intention.',
      template: `// Might not be an enemy: get a pointer or null
if (AEnemy* Enemy = ___<AEnemy>(Other)) {
    Enemy->Alert();
}

// Other is known to be valid; we only need yes/no
if (Other->___<AProjectile>()) {
    return;
}

// Owner must be a character; anything else is a bug
ACharacter* Char = ___<ACharacter>(GetOwner());`,
      blanks: [{ answers: ['Cast'] }, { answers: ['IsA'] }, { answers: ['CastChecked'] }],
      wordBank: ['Cast', 'IsA', 'CastChecked', 'dynamic_cast', 'ExactCast', 'static_cast', 'Implements'],
      explanation:
        '`Cast` returns a typed pointer or `nullptr` — the normal "maybe" case. `IsA` answers a yes/no question about a pointer you already know is valid. `CastChecked` documents that failure would be a bug and asserts in development builds. `dynamic_cast` relies on RTTI (off by default in Unreal), `static_cast` performs no check at all, and `ExactCast` would reject Blueprint subclasses.',
    },
  ],
  takeaways: [
    '`Cast<T>(Obj)` returns a `T*` if `Obj` is a `T` or any subclass (including Blueprints), and `nullptr` otherwise — including for null input.',
    'Unreal casts use reflection (`UClass` and `IsChildOf`), because RTTI is off by default and Blueprint classes have no C++ type.',
    '`CastChecked` asserts on failure in development but is an unchecked `static_cast` in shipping; use it only where failure is a bug.',
    '`IsA<T>()` answers yes/no but is a member call — never on a null pointer. `ExactCast` excludes subclasses.',
    'Casting to Blueprint classes (in Blueprint graphs or via hard class references) creates load chains; cast to native C++ base classes instead.',
    'Cache casts whose answer never changes, and replace cast chains with component queries or interfaces.',
  ],
  reading: [
    {
      title: 'dynamic_cast conversion',
      url: 'https://en.cppreference.com/w/cpp/language/dynamic_cast',
      source: 'cppreference',
      note: 'The standard C++ counterpart, for comparison with Unreal\'s reflection-based `Cast`.',
    },
    {
      title: 'Objects',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/objects-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How UObjects, `UClass` and reflection fit together — the foundation `Cast` is built on.',
    },
    {
      title: 'Blueprint Communication Usage',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-communication-usage-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s comparison of direct references, casting, interfaces and event dispatchers.',
    },
  ],
};
