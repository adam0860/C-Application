import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-reflection',
  title: 'What Reflection Is and Why Unreal Needs It',
  summary: 'How a C++ engine learns the names and types of your members at run time — and the code generator that makes it possible.',
  minutes: 18,
  objectives: [
    'Define reflection and explain why standard C++ throws type information away',
    'List the engine systems built on reflection and what each one reads from it',
    'Describe how UnrealHeaderTool turns U-macros into generated C++ before compilation',
    'Explain what `.generated.h` and `GENERATED_BODY()` provide, and why the include must come last',
    'Use `UClass`, `StaticClass()`, `GetClass()` and `TFieldIterator` to inspect a class at run time',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'A program that can describe itself',
      blocks: [
        {
          type: 'p',
          text: 'Open any actor in the [[unreal-editor]] and the Details panel lists its variables: `MaxHealth  100.0`, `AggroRadius  800.0`, each with the right widget — a number box for a float, a tick box for a `bool`, an asset picker for a mesh. Nobody wrote UI code for your class. So how does the editor know that your C++ class *has* a float called `MaxHealth`, where it lives in memory, and how to change it?',
        },
        {
          type: 'definition',
          term: 'Reflection',
          text: 'The ability of a running program to examine its own structure: to ask an object "what class are you?", "what members do you have, what are they called, what types are they?", and to read, write or call those members **by name** rather than through code written in advance.',
        },
        {
          type: 'p',
          text: 'That is [[reflection]], and it is the foundation the whole [[uobject]] system stands on. In this unit you will see what reflection is, how Unreal gets it even though C++ does not provide it, and how it drives object creation and [[ue-garbage-collector|garbage collection]].',
        },
        {
          type: 'code',
          title: 'Enemy.h — what you write',
          code: `UCLASS()
class MYGAME_API AEnemy : public AActor {
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, Category = "Stats")
    float MaxHealth = 100.0f;

    float CachedDistance = 0.0f;
};`,
          annotations: [
            { lines: 1, text: '[[uclass]] marks the class as reflected: "build a description of this class that the engine can query at run time".' },
            { lines: 3, text: '[[generated-body]] is where generated code is pasted in. You will dissect it later in this lesson.' },
            { lines: '6-7', text: '[[uproperty]] adds this member to the class description. `EditAnywhere` asks the Details panel to show an editable field for it.' },
            { lines: 9, text: 'No `UPROPERTY`: a perfectly normal C++ member that the engine knows **nothing** about. It never appears in the editor, is never saved, and is invisible to Blueprints.' },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A museum with and without a catalogue',
          text: 'A compiled C++ program is like a museum warehouse: every exhibit is there, but nothing is labelled — you have to already know that crate 0x2B0 holds a float. Reflection is the catalogue at the front desk: "Exhibit `MaxHealth`, type `float`, aisle 0x2B0, visitors may edit." The exhibits are the same; the catalogue is what lets strangers (the editor, Blueprints, the save system) find them.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'What standard C++ remembers at run time',
      blocks: [
        {
          type: 'p',
          text: 'When the [[compiler]] builds your program, member names disappear. `goblin.health -= 10;` becomes "subtract 10 from the float 8 bytes past this address". The name `health`, the list of members, even the fact that the struct had three fields — none of that survives into the [[executable]] (apart from optional debug symbols, which are for debuggers, not for your program).',
        },
        {
          type: 'p',
          text: 'Standard C++ does keep a tiny amount of [[rtti|run-time type information (RTTI)]] for polymorphic classes, which you met with [[dynamic-cast]]:',
        },
        {
          type: 'code',
          title: 'rtti.cpp (fragment)',
          code: `struct Enemy { virtual ~Enemy() = default; float hp{}; };
struct Goblin : Enemy { int gold{}; };

std::unique_ptr<Enemy> e = std::make_unique<Goblin>();
// 1. Identity: is this exactly a Goblin?
bool same = typeid(*e) == typeid(Goblin);      // true
// 2. Inheritance: can I treat it as a Goblin?
Goblin* g = dynamic_cast<Goblin*>(e.get());    // non-null
// 3. A name... of sorts
const char* n = typeid(*e).name();  // GCC: "6Goblin"`,
          annotations: [
            { lines: 6, text: '`typeid` compares the *dynamic* type through the [[vtable]] pointer. You can ask "same type?", but not "what is in it?".' },
            { lines: 8, text: '`dynamic_cast` walks the inheritance information stored next to the vtable.' },
            { lines: 10, text: 'The string is [[implementation-defined]]: GCC and Clang return a mangled name (`6Goblin`), MSVC returns `struct Goblin`. There is no portable way to get from it to the members.' },
          ],
        },
        {
          type: 'table',
          headers: ['Question at run time', 'Standard C++20', 'Unreal reflection'],
          rows: [
            ['What is this object\'s exact class?', 'Only as an opaque `type_info`', '`GetClass()` returns a rich `UClass`'],
            ['What is its parent class?', 'No', '`GetSuperClass()`'],
            ['List its member variables', 'No', 'Yes — names, types, offsets, flags'],
            ['Read or write a member by its name', 'No', 'Yes'],
            ['Call a function chosen by name', 'No', 'Yes, for `UFUNCTION`s'],
            ['Create an object from a class chosen at run time', 'No', '`NewObject(Outer, Class)`'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why C++ throws this information away',
          text: 'C++ follows the [[zero-cost-abstraction|zero-overhead principle]]: you do not pay for what you do not use. Storing names, types and offsets for every member of every struct would make every program bigger, and most programs (a compiler, a database, firmware) never need it. So the language leaves it out, and any program that *does* need it must build the information itself. Unreal is such a program — and as you will see, it builds it with a code generator.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'C++26 is getting reflection — but not this kind',
          text: 'The C++26 standard adds *static* reflection ([P2996](https://wg21.link/p2996)): code can inspect types **at compile time** and generate code from them. That could one day replace much of what Unreal\'s code generator does, but compilers are only starting to support it, and Unreal\'s system predates it by over two decades. Unreal also needs the data at *run time*, inside the editor, for classes that did not exist when the engine was compiled (Blueprints).',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'Using only standard C++20 (no Unreal), which of these can your program find out about an object **at run time**?',
      options: [
        {
          text: 'Whether a `Base*` actually points to a `Derived`',
          correct: true,
          why: 'Yes — `dynamic_cast` (or comparing `typeid`) uses the RTTI stored for polymorphic classes. This is about all standard C++ offers.',
        },
        {
          text: 'The names of the object\'s member variables',
          why: 'Member names are compiled away. They exist only in debug symbols, which your program cannot portably query.',
        },
        {
          text: 'The value of a member, given its name as a string',
          why: 'There is no standard mapping from a string like `"health"` to a member. You would have to write that table yourself — which is exactly what Unreal\'s code generator does for you.',
        },
        {
          text: 'A human-readable, portable class name from `typeid(x).name()`',
          why: 'The string `name()` returns is implementation-defined: mangled on GCC and Clang, decorated on MSVC. It is neither portable nor guaranteed to be readable.',
        },
      ],
      explanation:
        'Standard C++ keeps just enough type information for `dynamic_cast` and `typeid` to work on polymorphic types: identity and inheritance. It keeps no list of members, so "what fields does this object have?" is unanswerable without extra machinery. Unreal adds that machinery.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Everything Unreal builds on reflection',
      blocks: [
        {
          type: 'p',
          text: 'Reflection is not an editor nicety. Nearly every engine system that deals with *your* classes works by reading their reflection data instead of being hand-written for each class. One header shows most of them:',
        },
        {
          type: 'code',
          title: 'Enemy.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Enemy.generated.h"

UCLASS(Config = Game)
class MYGAME_API AEnemy : public AActor {
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite,
        Category = "Stats")
    float MaxHealth = 100.0f;

    UPROPERTY(SaveGame)
    int32 TimesDefeated = 0;

    UPROPERTY(Config)
    float AggroRadius = 800.0f;

    UPROPERTY()
    TObjectPtr<AActor> CurrentTarget;

    UFUNCTION(BlueprintCallable, Category = "Combat")
    void Taunt();

    float CachedDistance = 0.0f;
};`,
          annotations: [
            { lines: 5, text: 'The [[generated-header]] — always the **last** include. More on it shortly.' },
            { lines: 7, text: '`Config = Game` lets this class load values from the game\'s `.ini` config files.' },
            { lines: '12-14', text: '**Details panel** ([[edit-anywhere|EditAnywhere]]) and **Blueprints** ([[blueprint-read-write|BlueprintReadWrite]]) both find this float through reflection. `Category` groups it in the UI.' },
            { lines: '16-17', text: '**Save games**: properties flagged `SaveGame` are written when a save archive asks for them.' },
            { lines: '19-20', text: '**Config**: at startup the engine reads `AggroRadius=...` from the `[/Script/MyGame.Enemy]` section of `DefaultGame.ini`.' },
            { lines: '22-23', text: '**Garbage collection**: a bare `UPROPERTY()` is enough to tell the collector "this pointer keeps that object alive". [[tobjectptr]] is UE5\'s pointer wrapper for such members.' },
            { lines: '25-26', text: '**Blueprint calls**: a [[ufunction]] gets a reflected description, so a Blueprint graph can call `Taunt` by name.' },
            { lines: 28, text: 'Not reflected: none of the systems above can see it. That is fine for a per-frame cache — and a bug for anything you expect to be saved, edited or kept alive.' },
          ],
        },
        {
          type: 'table',
          headers: ['System', 'What it reads from reflection'],
          rows: [
            ['Details panel', 'Each property\'s name, type and metadata (category, limits) to build the right widget, then writes the new value at the property\'s memory offset.'],
            ['[[blueprint|Blueprints]]', 'Which properties and functions are exposed; the Blueprint virtual machine calls `UFUNCTION`s and reads properties through their descriptions. A Blueprint class can even *subclass* your C++ class.'],
            ['Serialization (saving and loading)', 'Levels and assets are saved property by property, **tagged with names**, and only where values differ from the class defaults.'],
            ['[[ue-garbage-collector|Garbage collector]]', 'Exactly which members hold `UObject` pointers, so it can trace what is still reachable.'],
            ['[[replication|Network replication]]', 'Which properties to watch and send to clients, and which functions are remote calls.'],
            ['Config files', 'Which properties to fill from `.ini` files, and under which section.'],
            ['Editor undo/redo, copy/paste, duplication', 'All implemented by serializing reflected properties.'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why one metadata system instead of seven hand-written ones',
          text: 'Without reflection, adding one float to an enemy would mean writing editor UI code, save code, load code, network code and Blueprint glue for it — and keeping them all in sync forever. With reflection you describe the member **once**, with a macro next to its declaration, and every system reads that single source of truth. That is why a one-word `UPROPERTY()` can change so much about how a member behaves.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Names are part of your save format',
          text: 'Because assets store properties by name, *adding* a property is safe (old files simply lack it and keep the default) and *removing* one is safe (the loader skips unknown names). **Renaming** one silently drops the saved values unless you add a redirect (Core Redirects in `DefaultEngine.ini`). Choose property names as carefully as you would choose database column names.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'truefalse',
      prompt: 'A `public` member variable without `UPROPERTY` still shows up in the Details panel and is saved with the level — the macro only matters for Blueprints.',
      answer: false,
      explanation:
        'Access specifiers like `public` are a compile-time C++ concept; the engine never sees them. What the engine sees is the reflection data, and a member without `UPROPERTY` has none. It is not shown in the editor, not saved, not visible to Blueprints, not replicated — and if it is a `UObject` pointer, the garbage collector cannot see it either. Conversely, a `private` member *with* `UPROPERTY` can be edited and saved.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'UnrealHeaderTool: a code generator in your build',
      blocks: [
        {
          type: 'p',
          text: 'Since C++ will not describe your classes, Unreal does it with a separate program: [[unreal-header-tool|UnrealHeaderTool (UHT)]]. You met it briefly when learning the build system; now let\'s see what it actually produces. [[unreal-build-tool|UnrealBuildTool]] runs UHT **before** the C++ compiler, every time you build:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Scan', text: 'UHT reads every header in your module that contains a reflection macro (`UCLASS`, `USTRUCT`, `UENUM`, `UPROPERTY`, `UFUNCTION`, …).' },
            { title: 'Parse', text: 'It parses those declarations and their macro arguments ([[specifier|specifiers]] such as `EditAnywhere`) — a simplified C++ parser that only needs to understand reflected declarations.' },
            { title: 'Generate', text: 'For each header `Enemy.h` it writes `Enemy.generated.h` (macros your header pastes in) and `Enemy.gen.cpp` (the tables describing every property and function), into `Intermediate/Build/<Platform>/UnrealEditor/Inc/MyGame/UHT/`.' },
            { title: 'Compile', text: 'The ordinary C++ compiler compiles your `.cpp` files **and** the generated `.gen.cpp` files. Offsets are computed by the compiler itself, with `offsetof`-style expressions, so they are always correct.' },
            { title: 'Register at startup', text: 'When the module loads, the generated code registers each class, and the engine builds a `UClass` object from the tables. No header is ever parsed at run time.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why generate code instead of parsing headers at run time?',
          text: 'Generating C++ moves all the expensive work to build time and lets the compiler check it: if a generated table refers to a member that does not exist, the build fails. At run time the engine just walks pre-built arrays. It also means shipped games contain no headers and no parser — only compact tables.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'UHT is not a full C++ compiler',
          text: 'UHT understands a deliberately limited subset of C++. Reflected declarations must be written plainly: you cannot hide a `UPROPERTY` inside your own macro, and the only preprocessor conditions it accepts around reflected members are the editor ones (`#if WITH_EDITOR`, `#if WITH_EDITORONLY_DATA`). When UHT reports an error, the C++ compiler never even runs — read UHT messages first.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'order',
      prompt: 'You add a new `UPROPERTY` to `Enemy.h` and press Build. Put what happens in order.',
      linesAreCode: false,
      lines: [
        'UnrealBuildTool notices the changed header and runs UnrealHeaderTool',
        'UHT parses the U-macros in `Enemy.h`',
        'UHT writes `Enemy.generated.h` and `Enemy.gen.cpp`',
        'The C++ compiler compiles `Enemy.cpp` together with `Enemy.gen.cpp`',
        'When the module loads, the engine builds the `UClass` for `AEnemy`',
      ],
      distractors: ['The C++ compiler expands `UPROPERTY` into a property table'],
      explanation:
        'UHT always runs first because its output is input to the compiler: your header includes `Enemy.generated.h`, which must exist before compilation. The distractor is the key misconception of this lesson — the C++ compiler does nothing with `UPROPERTY`; the table comes from UHT\'s generated `.gen.cpp`, and the `UClass` is only assembled from it at run time when the module loads.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'The U-macros are markers, not code',
      blocks: [
        {
          type: 'p',
          text: 'Here is the surprising part. To the C++ compiler, most reflection macros are **empty**. This is (abridged) how the engine defines them in `UObject/ObjectMacros.h`:',
        },
        {
          type: 'code',
          title: 'ObjectMacros.h (abridged)',
          code: `// Metadata parsed by UnrealHeaderTool; otherwise ignored
// when the code is compiled by the C++ compiler.
#define UPROPERTY(...)
#define UFUNCTION(...)
#define USTRUCT(...)
#define UENUM(...)
#define UMETA(...)

#define BODY_MACRO_COMBINE_INNER(A,B,C,D) A##B##C##D
#define BODY_MACRO_COMBINE(A,B,C,D) \\
    BODY_MACRO_COMBINE_INNER(A,B,C,D)

#define GENERATED_BODY(...) BODY_MACRO_COMBINE( \\
    CURRENT_FILE_ID,_,__LINE__,_GENERATED_BODY);
#define UCLASS(...) BODY_MACRO_COMBINE( \\
    CURRENT_FILE_ID,_,__LINE__,_PROLOG)`,
          annotations: [
            { lines: '3-7', text: 'A function-like [[macro]] with an empty body: the [[preprocessor]] deletes `UPROPERTY(EditAnywhere, ...)` entirely, arguments and all.' },
            { lines: '9-11', text: 'A helper that glues four tokens into one identifier with `##` (token pasting).' },
            { lines: '13-14', text: '`GENERATED_BODY()` on line 12 of a file becomes the identifier `<file id>_12_GENERATED_BODY` — the name of a macro that UHT defined in the `.generated.h`.' },
            { lines: '15-16', text: '`UCLASS` is *almost* empty: it expands to a "prolog" macro from the generated header, which usually contains little or nothing.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'What you write',
            tone: 'neutral',
            code: `UPROPERTY(EditAnywhere, Category = "Stats")
float MaxHealth = 100.0f;`,
          },
          right: {
            title: 'What the C++ compiler sees',
            tone: 'neutral',
            code: `/* (nothing) */
float MaxHealth = 100.0f;`,
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why make the macros empty?',
          text: 'Two different programs read your header. UHT reads it as **text** and treats the macro arguments as instructions. The C++ compiler reads it as **code** and must see a valid class. Empty macros satisfy both: UHT gets its annotations, and the compiler sees ordinary C++. It also means a typo inside `UPROPERTY(...)` is caught by UHT, not the compiler — so UHT is the tool that reports "unknown specifier".',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Sticky notes on a blueprint',
          text: 'Think of U-macros as sticky notes on an architect\'s drawing. The builder (the compiler) ignores them and builds exactly what is drawn. The inspector (UHT) reads only the sticky notes and writes up a report (the generated files). `GENERATED_BODY()` is the one note that says "paste the inspector\'s report here".',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: '.generated.h and GENERATED_BODY()',
      blocks: [
        {
          type: 'p',
          text: 'UHT writes one [[generated-header]] per reflected header. It defines the macro that `GENERATED_BODY()` expands into, and that macro injects real members into your class. For `AEnemy`, whose `GENERATED_BODY()` sits on line 9 of `Enemy.h`, it looks roughly like this:',
        },
        {
          type: 'code',
          title: 'Enemy.generated.h (abridged, UE 5.4)',
          code: `#undef CURRENT_FILE_ID
#define CURRENT_FILE_ID FID_MyGame_Source_MyGame_Enemy_h

#define FID_MyGame_Source_MyGame_Enemy_h_9_GENERATED_BODY \\
public: \\
    FID_..._9_RPC_WRAPPERS_NO_PURE_DECLS \\
    FID_..._9_INCLASS_NO_PURE_DECLS \\
    FID_..._9_ENHANCED_CONSTRUCTORS \\
private:`,
          annotations: [
            { lines: '1-2', text: 'Each generated header **redefines** `CURRENT_FILE_ID`. This is why it must be the last include: another class\'s `.generated.h` included after yours would overwrite the ID before your `GENERATED_BODY()` uses it.' },
            { lines: 4, text: 'The name matches what `GENERATED_BODY()` on line 9 expands to. Move the macro to another line without rebuilding and the names no longer match — the reason IntelliSense sometimes shows red squiggles on it.' },
            { lines: 6, text: 'Glue that lets Blueprints and the network call your `UFUNCTION`s.' },
            { lines: 7, text: 'Declares `StaticClass()`, the typedefs `Super` and `ThisClass`, and the engine\'s own allocation and serialization hooks.' },
            { lines: 8, text: 'Constructor plumbing. It also **disables copying and moving** by making those constructors unusable: a `UObject` has identity, so copying one like a value makes no sense.' },
            { lines: 9, text: 'The expansion ends in `private:` — which is why every class writes `public:` right after `GENERATED_BODY()`.' },
          ],
        },
        {
          type: 'p',
          text: 'Two everyday features you have already used come from here. [[ue-super|`Super::BeginPlay()`]] works because `GENERATED_BODY()` declared `typedef AActor Super;` — standard C++ has no `super` keyword. And `AEnemy::StaticClass()` exists because the macro declared it.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The rules UHT enforces',
          text: '`#include "Enemy.generated.h"` must be the **last** `#include` in the header — UHT stops with an error if anything is included after it. The file name must match the header (`Enemy.h` → `Enemy.generated.h`). And every `UCLASS`, `USTRUCT` and `UINTERFACE` needs `GENERATED_BODY()` as the first thing in its body.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Where is the .cpp half?',
          text: '`Enemy.gen.cpp` contains the tables: for every property a record of its name (`"MaxHealth"`), its type, its flags (`EditAnywhere` becomes a bit), and its offset inside `AEnemy`; for every `UFUNCTION`, its parameters and a thunk that unpacks arguments and calls your function. You never edit these files — they are rebuilt whenever the header changes.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: 'UHT refuses to process this header. Tap the line that causes the error.',
      code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Turret.generated.h"
#include "Components/SphereComponent.h"

UCLASS()
class MYGAME_API ATurret : public AActor {
    GENERATED_BODY()

public:
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<USphereComponent> Range;
};`,
      bugLines: [6],
      hint: 'One include has to come after all the others.',
      explanation:
        'Line 6 includes a header **after** `Turret.generated.h`. UHT rejects this ("the .generated.h file should always be the last #include in a header") because each generated header redefines `CURRENT_FILE_ID`; anything included later could redefine it again and break the `GENERATED_BODY()` expansion. Fix it by moving the `SphereComponent.h` include above line 5 — or better, forward-declare `class USphereComponent;` in the header and include it in the `.cpp`, which also speeds up compilation.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'fill',
      prompt: 'Complete the minimal reflected class so UHT and the compiler both accept it.',
      template: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Chest.___.h"

___()
class MYGAME_API AChest : public AActor {
    ___()

public:
    ___(EditAnywhere, Category = "Loot")
    int32 GoldInside = 50;
};`,
      blanks: [{ answers: ['generated'] }, { answers: ['UCLASS'] }, { answers: ['GENERATED_BODY'] }, { answers: ['UPROPERTY'] }],
      wordBank: ['generated', 'UCLASS', 'GENERATED_BODY', 'UPROPERTY', 'gen', 'USTRUCT', 'UFUNCTION', 'REFLECT'],
      explanation:
        'The header includes its own `Chest.generated.h` last, `UCLASS()` marks the class for UHT, `GENERATED_BODY()` pastes in the generated members (`StaticClass()`, `Super`, constructor plumbing), and `UPROPERTY` registers the member. `.gen.cpp` is the *other* generated file and is never included by hand; `UFUNCTION` is for member functions, not variables.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'UClass, StaticClass() and GetClass()',
      blocks: [
        {
          type: 'p',
          text: 'At startup the engine turns each class\'s generated tables into a [[uclass-object|**`UClass` object**]] — an object that describes a class. It knows the class name, its parent, its flags, its list of properties and functions, and its default instance. Because `UClass` is itself a `UObject`, it is reflected, garbage-collected and serializable like everything else.',
        },
        {
          type: 'code',
          title: 'Enemy.cpp',
          code: `void AEnemy::BeginPlay() {
    Super::BeginPlay();

    UClass* Static = AEnemy::StaticClass();
    UClass* Dynamic = GetClass();

    UE_LOG(LogTemp, Log, TEXT("Static: %s, Dynamic: %s"),
        *Static->GetName(), *Dynamic->GetName());

    for (UClass* C = Dynamic; C; C = C->GetSuperClass()) {
        UE_LOG(LogTemp, Log, TEXT("  is a %s"), *C->GetName());
    }

    if (Dynamic != Static) {
        // a subclass of AEnemy, e.g. a Blueprint child
    }
}`,
          annotations: [
            { lines: 4, text: '[[static-class]] is a static function generated for each class. It returns the `UClass` for the type you **named in code** — known at compile time.' },
            { lines: 5, text: '`GetClass()` returns the class of the **actual object** — its dynamic type, like `typeid(*this)` but far richer. For a Blueprint child of `AEnemy` it returns the Blueprint\'s class.' },
            { lines: '7-8', text: 'Class names drop the C++ prefix: `AEnemy` is registered as `Enemy`. A Blueprint class named `BP_Goblin` is registered as `BP_Goblin_C`.' },
            { lines: '10-12', text: 'Walk up the hierarchy: `BP_Goblin_C`, `Enemy`, `Actor`, `Object`. Standard C++ cannot do this at all.' },
            { lines: 14, text: 'Comparing `UClass` pointers is an exact-type check. To ask "is it this class *or a subclass*?", use `IsA(AEnemy::StaticClass())` (or `IsA<AEnemy>()`), the engine\'s fast alternative to `dynamic_cast`.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Every UObject carries a pointer to its UClass; the UClass describes the layout and keeps a default instance.',
          regions: [
            {
              label: 'Heap — a spawned goblin',
              kind: 'heap',
              cells: [
                { name: 'ClassPrivate', type: 'UClass*', value: 'BP_Goblin_C', pointsTo: 'cls' },
                { name: 'NamePrivate', type: 'FName', value: 'BP_Goblin_C_3' },
                { name: 'MaxHealth', type: 'float', value: '250.0', highlight: true },
                { name: 'CachedDistance', type: 'float', value: '412.7' },
              ],
            },
            {
              label: 'Reflection data (built at startup)',
              kind: 'static',
              cells: [
                { id: 'cls', name: 'BP_Goblin_C', type: 'UClass', value: 'super: Enemy' },
                { name: 'ChildProperties', type: 'FProperty*', value: 'list of properties', pointsTo: 'prop' },
                { id: 'prop', name: 'MaxHealth', type: 'FFloatProperty', value: 'offset 0x2B0 (example)' },
                { name: 'ClassDefaultObject', type: 'UObject*', value: 'Default__BP_Goblin_C', pointsTo: 'cdo' },
              ],
            },
            {
              label: 'Heap — the class default object',
              kind: 'heap',
              cells: [{ id: 'cdo', name: 'Default__BP_Goblin_C', type: 'BP_Goblin_C', value: 'MaxHealth = 100.0' }],
            },
          ],
        },
        {
          type: 'p',
          text: 'The type hierarchy of the descriptions mirrors what they describe: `UClass` and `UScriptStruct` (for `USTRUCT`s) both derive from `UStruct`, which owns the property list; `UEnum` describes a `UENUM`; `UFunction` describes a `UFUNCTION`. The default instance at the bottom of the diagram is the [[cdo]], which you will meet properly in *Creating Objects the Unreal Way*.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why classes need to be objects',
          text: 'Making classes into run-time objects is what lets designers choose classes *as data*: a spawner with a "class to spawn" field, a weapon that fires `BP_Fireball`. It is also how Blueprints work at all — a Blueprint class is created in the editor long after the C++ was compiled, so it can only exist as a `UClass` built at run time that names your C++ class as its parent.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Walking properties with TFieldIterator',
      blocks: [
        {
          type: 'p',
          text: 'Each reflected member variable is described by an [[fproperty|**`FProperty`**]] subclass: `FFloatProperty`, `FIntProperty`, `FObjectProperty`, `FArrayProperty`, `FStructProperty` and so on. `TFieldIterator` walks a class\'s list of them. This is exactly what the Details panel does when it builds your actor\'s UI:',
        },
        {
          type: 'code',
          title: 'Enemy.cpp',
          code: `#include "UObject/UnrealType.h"

void AEnemy::LogReflectedProperties() const {
    for (TFieldIterator<FProperty> It(
             GetClass(), EFieldIteratorFlags::ExcludeSuper);
         It; ++It) {
        const FProperty* Prop = *It;
        UE_LOG(LogTemp, Log, TEXT("%s : %s"),
            *Prop->GetName(), *Prop->GetCPPType());
    }
}

float ReadFloatByName(const UObject* Obj, FName Name) {
    const FProperty* Prop =
        Obj->GetClass()->FindPropertyByName(Name);
    const FFloatProperty* FloatProp =
        CastField<FFloatProperty>(Prop);
    if (!FloatProp) {
        return 0.0f; // no such property, or not a float
    }
    return FloatProp->GetPropertyValue_InContainer(Obj);
}`,
          annotations: [
            { lines: 1, text: 'Declares `FProperty` and its subclasses, plus `TFieldIterator`.' },
            { lines: '4-6', text: 'Iterate the property list of the object\'s class. `ExcludeSuper` lists only properties declared in this class; without it the iterator continues up into `AActor`\'s dozens of properties.' },
            { lines: '8-9', text: 'Names and C++ types come straight from the generated tables, e.g. `MaxHealth : float`. `CachedDistance` never appears — it has no `UPROPERTY`.' },
            { lines: '14-15', text: 'Look a property up **by name** at run time — the operation standard C++ cannot do.' },
            { lines: '16-17', text: '`CastField` is the `FProperty` equivalent of a checked downcast: it returns `nullptr` if the property is not a float.' },
            { lines: 21, text: 'Reads the float stored at the property\'s offset inside `Obj`. A matching `SetPropertyValue_InContainer` writes it — which is how the Details panel changes your values.' },
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'FProperty used to be UProperty',
          text: 'Before UE 4.25, properties were described by `UProperty` — full `UObject`s, each tracked by the garbage collector. With hundreds of thousands of them in a big project, that cost memory and GC time, so Epic converted them to the lighter `FProperty` (based on `FField`, not `UObject`). Old tutorials still say `UProperty` and `Cast<UFloatProperty>`; in UE5 write `FProperty` and `CastField<FFloatProperty>`.',
        },
        {
          type: 'deepdive',
          title: 'Build a tiny reflection table in standard C++',
          blocks: [
            {
              type: 'p',
              text: 'Nothing about reflection is magic — it is a table of *name → how to reach the member*. Here is a hand-written version using `std::variant` and pointers to members (`&Enemy::health` names a member without naming an object; `e.*ptr` reads that member of `e`). UHT writes the equivalent for you, for every reflected member, with type info and flags added.',
            },
            {
              type: 'code',
              title: 'mini_reflection.cpp',
              runnable: true,
              code: `#include <iostream>
#include <string_view>
#include <variant>

struct Enemy {
    float health{100.0f};
    int level{1};
    float speed{450.0f};
};

using MemberPtr = std::variant<float Enemy::*, int Enemy::*>;

struct PropertyInfo {
    std::string_view name;
    MemberPtr member;
};

constexpr PropertyInfo enemyProperties[] = {
    {"health", &Enemy::health},
    {"level", &Enemy::level},
    {"speed", &Enemy::speed},
};

void printProperties(const Enemy& e) {
    for (const PropertyInfo& prop : enemyProperties) {
        std::cout << prop.name << " = ";
        std::visit([&e](auto ptr) { std::cout << e.*ptr; },
                   prop.member);
        std::cout << '\\n';
    }
}

int main() {
    Enemy goblin;
    goblin.level = 7;
    printProperties(goblin);
}`,
              output: 'health = 100\nlevel = 7\nspeed = 450',
              annotations: [
                { lines: 11, text: 'A pointer to member records *which* member, not an address. The variant lets one table hold members of different types.' },
                { lines: '18-22', text: 'The hand-written "reflection data". Forget to update it when you add a member and the table silently goes stale — the reason Unreal generates it from the header instead.' },
                { lines: '27-28', text: '`std::visit` calls the lambda with whichever member-pointer type is stored, so each value prints with the right `operator<<`.' },
              ],
            },
            {
              type: 'p',
              text: 'Unreal\'s generated tables store a raw byte offset instead of a typed member pointer (so that one engine function can handle any class through `void*`), plus a type tag, flags and metadata. The principle is identical.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: '`BP_Goblin` is a Blueprint class whose parent is your C++ class `AEnemy`. You hold an `AEnemy* Enemy` pointing at a spawned goblin. What does `Enemy->GetClass()` return?',
      options: [
        {
          text: 'The `UClass` for `BP_Goblin_C`',
          correct: true,
          why: 'Correct. `GetClass()` reports the dynamic type of the actual object, and Blueprint classes are real `UClass`es (named with a `_C` suffix) built at run time.',
        },
        {
          text: '`AEnemy::StaticClass()`, because the pointer is an `AEnemy*`',
          why: 'That is the *static* type, which is what `StaticClass()` gives you. `GetClass()` ignores the pointer type and asks the object itself.',
        },
        {
          text: '`AActor::StaticClass()`, because Blueprint classes are not real C++ classes',
          why: 'Blueprint classes are not compiled C++, but they are real `UClass` objects. Reflection does not care how a class was made.',
        },
        {
          text: '`nullptr`, because a Blueprint class cannot be described by C++ reflection',
          why: 'Every `UObject` has a valid class pointer for its whole life. Blueprint classes are described by the same reflection system, which is precisely how they can inherit from C++ classes.',
        },
      ],
      explanation:
        '`StaticClass()` answers "what class did I name in code?" (compile time). `GetClass()` answers "what is this object really?" (run time). The difference matters whenever designers extend your C++ classes in Blueprints — which is most of the time.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'Using the `AEnemy` header from the "Everything Unreal builds on reflection" card (`MaxHealth`, `TimesDefeated`, `AggroRadius`, `CurrentTarget`, `Taunt()`, `CachedDistance`), what does `TFieldIterator<FProperty>` with `ExcludeSuper` list?',
      options: [
        {
          text: '`MaxHealth`, `TimesDefeated`, `AggroRadius`, `CurrentTarget`',
          correct: true,
          why: 'Exactly the four members marked `UPROPERTY`, whatever their specifiers. A bare `UPROPERTY()` still creates an `FProperty`.',
        },
        {
          text: '`MaxHealth`, `TimesDefeated`, `AggroRadius`, `CurrentTarget`, `CachedDistance`',
          why: '`CachedDistance` has no `UPROPERTY`, so UHT generated nothing for it. Being `public` is irrelevant to reflection.',
        },
        {
          text: '`MaxHealth` and `AggroRadius` only — the ones visible in the editor',
          why: 'Editor visibility is just one specifier. `TimesDefeated` (`SaveGame`) and `CurrentTarget` (bare `UPROPERTY()`) are reflected too; they simply have different flags.',
        },
        {
          text: 'All four properties plus `Taunt`',
          why: '`Taunt` is a `UFUNCTION`, described by a `UFunction` object, not an `FProperty`. You would iterate it with `TFieldIterator<UFunction>`.',
        },
      ],
      explanation:
        'The rule is simple and absolute: reflected means "has a U-macro". Specifiers only change the *flags* stored on the property — which systems act on it. Leaving `UPROPERTY` off removes the member from the engine\'s view entirely.',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'truefalse',
      prompt: 'When your game starts, Unreal parses your header files to discover which properties each class has.',
      answer: false,
      explanation:
        'Headers are parsed once, at **build time**, by UnrealHeaderTool. It generates C++ tables that are compiled into your module; at startup the engine only runs registration code that turns those tables into `UClass` objects. A shipped game contains no headers and no header parser — which keeps startup fast and the reflection data compact.',
    },
  ],
  takeaways: [
    'Reflection is a program\'s ability to inspect its own classes at run time: names, types, members, functions.',
    'Standard C++ discards member names and layouts (zero-overhead principle); RTTI only gives identity and inheritance checks.',
    'The Details panel, Blueprints, saving/loading, garbage collection, replication and config files all work by reading reflection data — a member without `UPROPERTY` is invisible to all of them.',
    'UnrealHeaderTool parses U-macros at build time and generates `.generated.h` and `.gen.cpp`; most U-macros expand to nothing for the C++ compiler.',
    '`GENERATED_BODY()` pastes in `StaticClass()`, `Super`/`ThisClass`, constructor plumbing and deleted copy constructors; the `.generated.h` include must be the last one.',
    '`StaticClass()` gives the class you named in code; `GetClass()` gives the object\'s real (possibly Blueprint) class; `TFieldIterator<FProperty>` walks its properties.',
  ],
  reading: [
    {
      title: 'Reflection System',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/reflection-system-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s overview of the property system, the macros and what UnrealHeaderTool generates.',
    },
    {
      title: 'Unreal Property System (Reflection)',
      url: 'https://www.unrealengine.com/en-US/blog/unreal-property-system-reflection',
      source: 'article',
      note: 'A classic engineering blog post explaining how the generated tables are laid out and iterated.',
    },
    {
      title: 'Unreal Engine UProperties',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-uproperties',
      source: 'unreal-docs',
      note: 'How property declarations work and the full list of property specifiers you will use in later units.',
    },
    {
      title: 'typeid operator',
      url: 'https://en.cppreference.com/w/cpp/language/typeid',
      source: 'cppreference',
      note: 'Exactly how little run-time type information standard C++ provides.',
    },
    {
      title: 'P2996: Reflection for C++26',
      url: 'https://wg21.link/p2996',
      source: 'isocpp',
      note: 'The proposal that brings compile-time reflection to standard C++ — useful context for why Unreal had to build its own.',
    },
  ],
};
