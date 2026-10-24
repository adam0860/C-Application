import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-common-crashes',
  title: 'Common Crashes and How to Avoid Them',
  summary:
    'Read a crash report like a pro, and learn the six crashes almost every Unreal programmer hits — with their fixes.',
  minutes: 20,
  objectives: [
    'Read an Unreal crash report: the error type, the faulting address and the call stack',
    'Install editor debug symbols and debug a crash from your IDE',
    'Prevent null-pointer crashes from failed casts, missing components and unassigned references',
    'Explain use-after-GC crashes and why every UObject pointer member needs `UPROPERTY`',
    'Avoid constructor, `Super::`, `CreateDefaultSubobject`, recursion and array-bounds crashes',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Anatomy of a crash',
      blocks: [
        {
          type: 'p',
          text: 'Every Unreal crash ends in one of two ways. Either the **engine** noticed something wrong and stopped deliberately — a failed `check`, an array index out of range, a `Fatal` log — or the **operating system** stopped the process because it touched memory it does not own. The first kind tells you what went wrong. The second kind only tells you *where*, and you work backwards from there.',
        },
        {
          type: 'compare',
          left: {
            title: 'Engine-detected',
            tone: 'neutral',
            code: `Assertion failed: Sensor
[File:...\\Turret.cpp] [Line: 42]`,
            text: 'The message names the failed condition, file and line. Usually the fastest crash you will ever fix.',
          },
          right: {
            title: 'OS-detected',
            tone: 'neutral',
            code: `Unhandled Exception:
EXCEPTION_ACCESS_VIOLATION
reading address 0x00000000000002b8`,
            text: 'An [[access-violation]]: something read memory it had no right to. The address is your first clue.',
          },
        },
        {
          type: 'p',
          text: 'Look closely at that address. `0x2b8` is tiny — real objects never live that close to address zero. When you write `Character->HealthComponent` and `Character` is `nullptr`, the CPU computes "address of the object (0) plus the offset of the member (0x2b8)" and tries to read there. **A small address means "null pointer plus member offset".** A large, random-looking address usually means a [[dangling-pointer]]: the pointer once pointed at a real object that has since been freed.',
        },
        {
          type: 'memory',
          caption: 'How a null pointer becomes "reading address 0x2b8"',
          regions: [
            {
              label: 'Stack — ALavaVolume::HandleOverlap()',
              kind: 'stack',
              cells: [
                { name: 'Character', type: 'AMyCharacter*', value: 'nullptr (0x0)', highlight: true },
              ],
            },
            {
              label: 'What the CPU is asked to do',
              kind: 'other',
              cells: [
                { name: 'Character->HealthComponent', value: 'read at 0x0 + 0x2b8', address: '0x2b8', highlight: true },
                { name: 'result', value: 'page not mapped → access violation' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the OS kills the whole process',
          text: 'The lowest pages of a process\'s address space are deliberately left unmapped, precisely so that null-pointer accesses fault immediately instead of quietly reading garbage. The OS cannot know whether your program could recover, so it stops it. In standard C++ terms the dereference was [[undefined-behavior]]; the crash is the *lucky* outcome — a dangling pointer to memory that happens to be mapped can corrupt data silently instead.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Reading the call stack',
      blocks: [
        {
          type: 'p',
          text: 'The crash reporter shows the [[call-stack]] at the moment of the crash, **innermost call first**. Each line is `Module!Function() [File:Line]`. In the editor, your game module appears as `UnrealEditor_MyGame`; the engine\'s modules as `UnrealEditor_Engine`, `UnrealEditor_CoreUObject` and so on.',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Crash Reporter',
          code: `Unhandled Exception: EXCEPTION_ACCESS_VIOLATION reading address 0x00000000000002b8

UnrealEditor_MyGame!ALavaVolume::HandleOverlap() [...\\LavaVolume.cpp:27]
UnrealEditor_MyGame!ALavaVolume::execHandleOverlap() [...\\LavaVolume.gen.cpp:41]
UnrealEditor_CoreUObject!UFunction::Invoke()
UnrealEditor_CoreUObject!UObject::ProcessEvent()
UnrealEditor_Engine!AActor::ProcessEvent()
UnrealEditor_Engine!TMulticastScriptDelegate<...>::ProcessMulticastDelegate<UObject>()
UnrealEditor_Engine!UPrimitiveComponent::BeginComponentOverlap()
UnrealEditor_Engine!UPrimitiveComponent::UpdateOverlapsImpl()
UnrealEditor_Engine!UPrimitiveComponent::MoveComponentImpl()
...
UnrealEditor_Engine!UWorld::Tick()
UnrealEditor!FEngineLoop::Tick()
UnrealEditor!GuardedMain()`,
          annotations: [
            { lines: 1, text: 'What happened: a null-ish read (tiny address).' },
            { lines: 3, text: '**Start here.** The topmost frame in *your* module is almost always where the bug is visible — file and line included.' },
            { lines: 4, text: 'The `exec…` thunk lives in the UHT-generated `.gen.cpp`. Seeing it means your function was called through reflection — a dynamic delegate or Blueprint.' },
            { lines: '5-8', text: 'Reflection machinery broadcasting a dynamic multicast delegate…' },
            { lines: '9-11', text: '…because a component began overlapping something while it moved. So: something walked into the lava volume, and the overlap handler dereferenced a null pointer.' },
            { lines: '13-15', text: 'The bottom of the stack is the engine\'s main loop. Useful context, never the culprit.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Where to find it later:** the end of `Saved/Logs/MyGame.log` contains the same call stack, and `Saved/Crashes/` holds a folder per crash with a minidump (`.dmp`) you can open in Visual Studio or Rider.',
            '**Catch it live:** launch the editor from your IDE with the debugger attached. When it crashes, the IDE stops on the exact line with every local variable visible. The **DebugGame Editor** configuration compiles your module without optimization (so variables are not "optimized away") while keeping the engine fast.',
            '**Install engine symbols:** without [[editor-debug-symbols]], engine frames appear without function names. In the Epic Games Launcher: **Library → arrow next to Launch → Options → Editor symbols for debugging**. It is a large download, and worth it.',
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Looking at the call stack above, which frame should you inspect first?',
      options: [
        {
          text: '`UnrealEditor!GuardedMain()`, because that is where the program started',
          why: 'The bottom of the stack is the entry point — it is on the stack for *every* crash, so it tells you nothing about this one.',
        },
        {
          text: '`UnrealEditor_Engine!UPrimitiveComponent::BeginComponentOverlap()`, because the engine called your code',
          why: 'Useful context (an overlap triggered it), but the engine is doing its job correctly. The faulty dereference is in your function.',
        },
        {
          text: '`UnrealEditor_MyGame!ALavaVolume::HandleOverlap()` at LavaVolume.cpp line 27',
          correct: true,
          why: 'The topmost frame in your own module is where the bad access happened in code you control — open that line and look for the pointer that can be null.',
        },
        {
          text: '`UnrealEditor_MyGame!ALavaVolume::execHandleOverlap()` in the .gen.cpp file',
          why: 'That is generated glue code from UHT that forwards the call. Bugs are essentially never in generated code; look one frame higher.',
        },
      ],
      explanation:
        'Read the stack from the top and stop at the first frame in your own module. Frames above it (if any) are engine code your function called; frames below explain how execution got there. Here the story is: movement → overlap update → delegate broadcast → your handler → null dereference on line 27.',
    },
    {
      kind: 'concept',
      title: 'Crash 1: the null pointer you didn\'t expect',
      blocks: [
        {
          type: 'p',
          text: 'Most Unreal crashes are null pointers, and they almost always come from the same few places — functions that are *allowed* to return null, used as if they could not:',
        },
        {
          type: 'list',
          items: [
            '[[ue-cast|Cast<T>()]] returns `nullptr` when the object is not a `T`. An overlap volume is touched by players, AI, physics props and projectiles alike.',
            '`FindComponentByClass<T>()` returns `nullptr` when the actor has no such component.',
            'An `EditAnywhere` reference that a designer never assigned in the level.',
            '`GetOwner()`, `GetPawn()`, `GetController()`, `GetPlayerCharacter()` — all legitimately null at some point (unpossessed pawn, dedicated server, during teardown).',
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Assumes the happy path',
            tone: 'bad',
            code: `AMyCharacter* Character =
    Cast<AMyCharacter>(OtherActor);
Character->GetHealth()->ApplyBurn(BurnRate);`,
            text: 'Crashes the first time a physics barrel rolls into the lava.',
          },
          right: {
            title: 'Guard clauses',
            tone: 'good',
            code: `AMyCharacter* Character =
    Cast<AMyCharacter>(OtherActor);
if (!Character)
{
    return;   // not a character: ignore
}
if (UHealthComponent* Health = Character->GetHealth())
{
    Health->ApplyBurn(BurnRate);
}`,
            text: 'Each pointer that *can* be null is checked once, right where it is obtained.',
          },
        },
        {
          type: 'p',
          text: 'Use [[isvalid|IsValid(Ptr)]] instead of a plain null test for objects that might have been destroyed: it also returns `false` for an actor that is pending destruction but not yet collected. And decide deliberately which kind of check you want — a plain `if` when null is a normal possibility, `ensure` when null means something is unexpectedly broken.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'The scoped declaration idiom',
          text: '`if (UHealthComponent* Health = Actor->FindComponentByClass<UHealthComponent>())` declares the pointer *inside* the `if`. It only exists where it is known to be non-null, so you cannot accidentally use it after the check fails. You will see this pattern throughout Epic\'s code.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This lava volume works when the player walks in, but crashes the editor when a physics crate falls into it. Tap the line that crashes.',
      code: `void ALavaVolume::HandleOverlap(UPrimitiveComponent* OverlappedComp,
    AActor* OtherActor, UPrimitiveComponent* OtherComp,
    int32 OtherBodyIndex, bool bFromSweep,
    const FHitResult& SweepResult)
{
    AMyCharacter* Character = Cast<AMyCharacter>(OtherActor);
    Character->GetHealth()->ApplyBurn(BurnRate);
}`,
      bugLines: [7],
      hint: 'What does `Cast<AMyCharacter>` return for a crate?',
      explanation:
        'The cast on line 6 is fine — it safely returns `nullptr` when `OtherActor` is not an `AMyCharacter`. Line 7 then dereferences that null pointer, producing an access violation with a small address. Add `if (!Character) { return; }` after the cast, and check `GetHealth()` too, since a character could lack the component.',
    },
    {
      kind: 'concept',
      title: 'Crash 2: the garbage collector freed it',
      blocks: [
        {
          type: 'p',
          text: 'You learned that the [[ue-garbage-collector|garbage collector]] finds live UObjects by following references it can *see* — `UPROPERTY` members, plus a few other registered paths. A raw pointer member without `UPROPERTY` is invisible to it. The GC neither keeps the object alive because of it nor clears it when the object dies. That pointer becomes a time bomb.',
        },
        {
          type: 'code',
          title: 'QuestGiver.h',
          code: `UCLASS()
class MYGAME_API AQuestGiver : public AActor
{
    GENERATED_BODY()

protected:
    virtual void BeginPlay() override;

    // Invisible to the GC: collected, then dangles
    UQuestData* ActiveQuest = nullptr;

    // Visible to the GC: kept alive by this reference
    UPROPERTY()
    TObjectPtr<UQuestData> TrackedQuest;

    // Does not keep it alive, but knows when it died
    TWeakObjectPtr<AActor> FollowTarget;
};`,
          annotations: [
            { lines: 10, text: 'If `BeginPlay` does `ActiveQuest = NewObject<UQuestData>(this);`, nothing the GC can see references the new object. Being its [[outer]] does **not** keep it alive. At the next collection it is destroyed, and `ActiveQuest` points at freed memory.' },
            { lines: '13-14', text: 'The fix. `UPROPERTY` is what makes the reference visible; `TObjectPtr` is the recommended pointer type for such members. A `TObjectPtr` *without* `UPROPERTY` is just as invisible as a raw pointer.' },
            { lines: 17, text: 'For references you do not own (a target that may be destroyed by someone else), a [[tweakobjectptr|TWeakObjectPtr]] returns null once the object is gone. Check it with `IsValid()` or `.Get()` before use.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The "crashes after about a minute" signature',
          text: 'By default the engine runs a full garbage collection roughly once a minute, and also on level transitions. So a missing `UPROPERTY` classically crashes about a minute into play, or right after loading a map — at a different line each time, often with a large random-looking address. Reproduce it on demand by typing `obj gc` in the console to force a collection, or set `gc.CollectGarbageEveryFrame 1` while testing.',
        },
        {
          type: 'p',
          text: 'The same rule applies to containers (`TArray<TObjectPtr<UItem>>` needs `UPROPERTY` too) and to UObjects referenced from non-UObject classes, which must report their references through `FGCObject` or hold them in a `TStrongObjectPtr`. When in doubt: **every UObject pointer that must outlive the current function needs a reference the GC can see.**',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Declaring a member as `TObjectPtr<UQuestData> Quest;` — without `UPROPERTY()` — is enough to stop the garbage collector from destroying the quest object.',
      answer: false,
      explanation:
        'The GC discovers references through reflection, and only `UPROPERTY` members are reflected. `TObjectPtr` is a pointer *type* with editor-time benefits (access tracking, lazy loading), but on its own it is no more visible than a raw `UQuestData*`. It is the `UPROPERTY()` that keeps the object alive and lets the engine clear the pointer if the object is destroyed.',
    },
    {
      kind: 'concept',
      title: 'Crash 3: gameplay code in the constructor',
      blocks: [
        {
          type: 'p',
          text: 'An actor\'s C++ constructor does not run "when the actor appears in the game". It runs whenever *any* instance of the class is created — and the very first one is the [[cdo|Class Default Object]], built when your module loads, which happens while the editor is starting up. There is no level, no world and no player at that moment. `GetWorld()` returns `nullptr`.',
        },
        {
          type: 'code',
          title: 'EnemySpawner.cpp',
          code: `AEnemySpawner::AEnemySpawner()
{
    PrimaryActorTick.bCanEverTick = false;

    // Runs for the CDO while the editor is loading:
    // GetWorld() is nullptr here -> access violation.
    GetWorld()->GetTimerManager().SetTimer(SpawnTimer,
        this, &AEnemySpawner::SpawnWave, 5.f, true);
}

void AEnemySpawner::BeginPlay()
{
    Super::BeginPlay();

    // Correct place: the actor is now in a running world
    GetWorldTimerManager().SetTimer(SpawnTimer,
        this, &AEnemySpawner::SpawnWave, 5.f, true);
}`,
          annotations: [
            { lines: 3, text: 'This belongs in the constructor: it is a *default value* for every instance.' },
            { lines: '7-8', text: 'This does not. Timers, spawning, finding other actors and binding to them all need a world.' },
            { lines: '11-18', text: '[[beginplay|BeginPlay]] runs once the actor is placed in a world that is actually playing — the right home for gameplay setup.' },
          ],
        },
        {
          type: 'table',
          headers: ['Put it in…', 'What belongs there'],
          rows: [
            ['Constructor', '`CreateDefaultSubobject`, attachment, default property values, tick settings'],
            ['`PostInitializeComponents`', 'Setup between your own components, before BeginPlay'],
            ['`BeginPlay`', 'Anything needing the world: timers, spawning, finding or binding to other actors, reading designer-tuned values'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'When the editor will not even start',
          text: 'A crash in a constructor happens while the editor loads your module, so the editor crashes on every launch and you cannot use Live Coding to fix it. Fix the code in your IDE, build the **Development Editor** target there, and then launch the editor again.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'After adding code to `AEnemySpawner`\'s constructor, the editor crashes every time it starts — before any level is open. What is the most likely explanation?',
      options: [
        {
          text: 'The constructor runs for the Class Default Object when the module loads, and code there used something that needs a world, such as `GetWorld()`',
          correct: true,
          why: 'Exactly. The CDO is constructed during startup with no world, so `GetWorld()` is null and dereferencing it crashes the editor before you can even open a map.',
        },
        {
          text: 'Constructors are not allowed in classes derived from `AActor`',
          why: 'Every actor has a constructor — it is where `CreateDefaultSubobject` and default values go. The problem is *what* was put in it.',
        },
        {
          text: 'The spawner was placed in too many levels',
          why: 'Placed instances are only created when a level loads. A crash before any level opens points at something that runs at module load: the CDO.',
        },
        {
          text: 'Live Coding corrupted the binaries; deleting `Intermediate` will fix it',
          why: 'Cleaning can fix genuine build problems, but it will not fix code that crashes. After a rebuild the same constructor runs and crashes again.',
        },
      ],
      explanation:
        'Constructors run for the CDO at module load, for archetypes when Blueprints compile, and again for every spawned instance. Keep them free of anything that depends on the world or other actors, and move gameplay setup to `BeginPlay`.',
    },
    {
      kind: 'concept',
      title: 'Crash 4: lifecycle mistakes — Super:: and CreateDefaultSubobject',
      blocks: [
        {
          type: 'p',
          text: 'When you override an engine function such as `BeginPlay`, C++ does not force you to call the base version. `Super` is just a `typedef` that `GENERATED_BODY()` gives you for the parent class. Forget the call and the parent\'s work silently never happens:',
        },
        {
          type: 'table',
          headers: ['Forgotten call', 'What breaks'],
          rows: [
            ['`Super::BeginPlay()`', 'Components never receive BeginPlay, the Blueprint **Event BeginPlay** never fires, and `InitialLifeSpan` is never applied'],
            ['`Super::EndPlay(Reason)`', 'Components and the Blueprint **Event End Play** are not notified; cleanup is skipped'],
            ['`Super::Tick(DeltaTime)`', 'The Blueprint **Event Tick** stops firing'],
            ['`Super::GetLifetimeReplicatedProps(...)`', 'Properties replicated by parent classes (including actor movement) stop replicating'],
          ],
        },
        {
          type: 'p',
          text: 'Development builds catch a few of these with an `ensure`, but not all of them, and the symptoms are often far from the cause ("my Blueprint logic stopped working"). Make `Super::` the first line of every lifecycle override (`EndPlay` conventionally calls it last) and the habit removes the whole class of bug.',
        },
        {
          type: 'p',
          text: 'A related lifecycle rule: [[createdefaultsubobject|CreateDefaultSubobject]] works **only inside a constructor**. It relies on construction-time state that exists only while a UObject is being constructed; calling it in `BeginPlay` triggers a fatal error. To add a component at run time, use `NewObject` and register it yourself:',
        },
        {
          type: 'compare',
          left: {
            title: 'Fatal error at run time',
            tone: 'bad',
            code: `void ATurret::BeginPlay()
{
    Super::BeginPlay();
    Light = CreateDefaultSubobject<
        USpotLightComponent>(TEXT("Light"));
}`,
          },
          right: {
            title: 'Runtime component creation',
            tone: 'good',
            code: `void ATurret::BeginPlay()
{
    Super::BeginPlay();
    Light = NewObject<USpotLightComponent>(this);
    Light->SetupAttachment(GetRootComponent());
    Light->RegisterComponent();
}`,
            text: '`RegisterComponent()` creates the render/physics state and starts ticking. Store the result in a `UPROPERTY` so the GC keeps it.',
          },
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the code that adds a spotlight to a turret while the game is running.',
      template: `void ATurret::AddSpotlight()
{
    Light = ___<USpotLightComponent>(this);
    Light->SetupAttachment(GetRootComponent());
    Light->___();
}`,
      blanks: [{ answers: ['NewObject'] }, { answers: ['RegisterComponent'] }],
      wordBank: ['NewObject', 'CreateDefaultSubobject', 'RegisterComponent', 'SpawnActor', 'BeginPlay', 'Activate'],
      explanation:
        '`CreateDefaultSubobject` is constructor-only and is a fatal error here. `NewObject<T>(Outer)` creates the component at run time, and `RegisterComponent()` hooks it into the world (rendering, physics, ticking). `SpawnActor` creates actors, not components, and `Activate()` only toggles an already registered component.',
    },
    {
      kind: 'concept',
      title: 'Crash 5: infinite recursion',
      blocks: [
        {
          type: 'p',
          text: 'Each function call pushes a [[stack-frame]]; the stack is only around a megabyte or so. A function that ends up calling itself forever — directly, or through a chain of other functions and delegates — exhausts it and the OS reports `EXCEPTION_STACK_OVERFLOW`. The call stack is unmistakable: the same two or three functions repeated hundreds of times.',
        },
        {
          type: 'code',
          title: 'Door.cpp',
          code: `void ADoor::Open()
{
    if (bIsOpen)
    {
        return;   // already open: stop the ping-pong
    }
    bIsOpen = true;
    PlayOpenAnimation();

    if (LinkedDoor)
    {
        // Double doors: open the partner too. Its
        // LinkedDoor points back at us!
        LinkedDoor->Open();
    }
}`,
          annotations: [
            { lines: '3-6', text: 'Without this guard: A opens B, B opens A, A opens B… until the stack overflows. Making `Open()` *idempotent* — calling it twice is the same as calling it once — breaks the cycle.' },
            { lines: 14, text: 'The recursion is indirect, through another object. Delegate handlers create the same loops invisibly: a handler for `OnHealthChanged` that calls `Heal()`, which broadcasts `OnHealthChanged`…' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Separate "change state" from "react to change"',
          text: 'Most recursion bugs come from a reaction that changes the very state it is reacting to. Structure code so the *setter* changes state and then calls a *handler*, and the handler only reacts (updates UI, plays effects, broadcasts) without ever calling the setter. This matters especially with RepNotify: the server calls the handler after setting the value, clients call it from `OnRep_`, and neither path can loop. Where re-entry is genuinely possible, `checkNoRecursion()` or a `TGuardValue<bool>` (an RAII flag that resets itself at scope exit) makes it explicit.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'The server crashes with a stack overflow the first time a shield takes damage. Tap the line that causes it.',
      code: `void UShieldComponent::SetShield(float NewShield)
{
    Shield = FMath::Clamp(NewShield, 0.f, MaxShield);
    OnRep_Shield();   // server: update our own UI too
}

void UShieldComponent::OnRep_Shield()
{
    // Make sure clients clamp the value as well
    SetShield(Shield);
    OnShieldChanged.Broadcast(Shield);
}`,
      bugLines: [10],
      hint: 'Follow the calls on the server, starting from `SetShield`.',
      explanation:
        'Calling the RepNotify handler manually from the setter (line 4) is a normal pattern, because C++ servers do not receive `OnRep_` calls for their own changes. The bug is line 10: the handler calls the setter, which calls the handler, forever. A RepNotify should only *react* to the new value; the clamping already happened on the server before the value replicated. Delete line 10.',
    },
    {
      kind: 'concept',
      title: 'Crash 6: array index out of bounds',
      blocks: [
        {
          type: 'p',
          text: 'In standard C++, `std::vector::operator[]` does no checking at all: an out-of-range index is [[undefined-behavior]]. [[tarray|`TArray::operator[]`]] performs a range check in development builds, implemented with a `check`, so a bad index halts immediately with a message like this:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Output Log',
          code: `Assertion failed: (Index >= 0) & (Index < ArrayNum)
[File:...\\Array.h] [Line: ...]`,
        },
        {
          type: 'p',
          text: 'The message also gives the bad index and the array size, and the call stack points at your line. Because it is a `check`, the range test is compiled out of Shipping — where the same bug becomes silent memory corruption. So treat these asserts as gifts, and fix the cause rather than the symptom.',
        },
        {
          type: 'compare',
          left: {
            title: 'Removes while counting forward',
            tone: 'bad',
            code: `const int32 Count = Enemies.Num();
for (int32 i = 0; i < Count; ++i)
{
    if (!IsValid(Enemies[i]))
    {
        Enemies.RemoveAt(i);
    }
}`,
            text: 'After the first removal the array is shorter than `Count`, so the last iterations index past the end (and the element after each removed one is skipped).',
          },
          right: {
            title: 'Let the container do it',
            tone: 'good',
            code: `Enemies.RemoveAll([](const TObjectPtr<AEnemy>& E)
{
    return !IsValid(E);
});

// or iterate backwards:
for (int32 i = Enemies.Num() - 1; i >= 0; --i)
{
    if (!IsValid(Enemies[i])) { Enemies.RemoveAt(i); }
}`,
            text: '`RemoveAll` takes a [[predicate]]. Going backwards works because removing index `i` never shifts the elements you have not visited yet.',
          },
        },
        {
          type: 'list',
          items: [
            'Use `Array.IsValidIndex(i)` before indexing with a value from elsewhere (a save file, a designer, the network).',
            '`Last()`, `Top()` and `Pop()` assert on an empty array — check `Num() > 0` (or `IsEmpty()`) first.',
            'Development builds also report a `TArray` that changes size during a range-based `for` loop; collect changes and apply them after the loop.',
          ],
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Put these steps of a sound crash-fixing workflow in order.',
      lines: [
        'Read the error type and faulting address in the crash report',
        'Find the topmost call-stack frame in your own module',
        'Open that file and line and identify the pointer or index involved',
        'Reproduce the crash with the debugger attached to inspect the variables',
        'Fix the cause, then add a guard or assertion that would catch it earlier',
      ],
      distractors: ['Delete the Binaries and Intermediate folders and rebuild'],
      linesAreCode: false,
      explanation:
        'Work from the evidence: what kind of failure, then where in your code, then why (by inspecting live state). The final step matters as much as the fix — a well-placed `ensure` or guard clause turns the next occurrence into a clear report instead of a mysterious crash. Deleting build folders fixes build-system problems, not code that crashes.',
    },
    {
      kind: 'mcq',
      prompt: 'A crash happens roughly a minute into every play session, at a different line each time, always while using `ActiveQuest`, with large random-looking addresses. `obj gc` makes it happen immediately. What is the cause?',
      options: [
        {
          text: 'A failed `Cast<>` returned null',
          why: 'A null pointer gives a tiny address and crashes at a consistent line as soon as the code runs — not after a delay, and not triggered by garbage collection.',
        },
        {
          text: '`ActiveQuest` is a UObject pointer member without `UPROPERTY`, so the GC freed the object and the pointer dangles',
          correct: true,
          why: 'The timing (periodic GC), the reproduction with `obj gc`, the random addresses and the varying crash site are the classic signature of a reference the GC cannot see.',
        },
        {
          text: 'The quest code runs in the constructor, where `GetWorld()` is null',
          why: 'Constructor problems crash at a fixed point — often during editor startup — not a minute into play.',
        },
        {
          text: 'Two functions call each other forever',
          why: 'Infinite recursion produces a stack overflow with a very recognizable repeated call stack, and has nothing to do with garbage collection.',
        },
      ],
      explanation:
        'Each crash type leaves fingerprints. Tiny address at a fixed line: null pointer. Random address, varying line, correlated with GC: missing `UPROPERTY`. Crash at startup: constructor/CDO. Repeated frames: recursion. Assertion naming `ArrayNum`: bad index. Learning the fingerprints turns hours of guessing into minutes.',
    },
  ],
  takeaways: [
    'Read crashes top-down and start at the first frame in your own module; a tiny faulting address means "null plus member offset".',
    'Install editor debug symbols and launch from your IDE (DebugGame Editor) to stop on the crashing line with variables visible.',
    'Check every pointer that can legitimately be null — casts, `FindComponentByClass`, unassigned references, `GetOwner()` — right where you obtain it.',
    'Every UObject pointer that outlives a function needs a GC-visible reference (`UPROPERTY`); use `TWeakObjectPtr` for references you do not own.',
    'Constructors build the CDO with no world: keep gameplay setup in `BeginPlay`, and use `CreateDefaultSubobject` only in constructors.',
    'Always call `Super::` in lifecycle overrides, keep reactions separate from state changes to avoid recursion, and use `IsValidIndex`/`RemoveAll` with arrays.',
  ],
  reading: [
    {
      title: 'Unreal Object Handling',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-object-handling-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How garbage collection discovers references and why UPROPERTY matters for object lifetime.',
    },
    {
      title: 'Actor Lifecycle',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle',
      source: 'unreal-docs',
      note: 'The exact order of construction, component initialization and BeginPlay — the map for avoiding constructor crashes.',
    },
    {
      title: 'Installing Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/installing-unreal-engine',
      source: 'unreal-docs',
      note: 'Covers the launcher installation options, including the editor debugging symbols.',
    },
  ],
};
