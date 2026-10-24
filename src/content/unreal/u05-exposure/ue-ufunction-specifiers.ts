import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-ufunction-specifiers',
  title: 'UFUNCTION Specifiers and Blueprint Events',
  summary: 'Callable, pure, implementable and native events, editor buttons, console commands, and why some functions must be reflected at all.',
  minutes: 20,
  objectives: [
    'Choose between `BlueprintCallable` and `BlueprintPure`, and explain why pure functions must be `const` and cheap',
    'Declare and call `BlueprintImplementableEvent` and `BlueprintNativeEvent` functions correctly, including `_Implementation`',
    'Predict which Blueprint pins a C++ signature produces, including output pins from non-const references',
    'Add editor buttons with `CallInEditor` and console commands with `Exec`',
    'Explain why dynamic delegates and timers bound by name require `UFUNCTION`',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'What UFUNCTION adds to a function',
      blocks: [
        {
          type: 'p',
          text: 'A normal C++ member function exists only as machine code: once compiled, nothing in the program knows its name or its parameters. Marking it [[ufunction]] makes [[unreal-header-tool|UHT]] generate a `UFunction` object that describes it — name, parameter types, flags — plus a small *thunk* that can call it with arguments unpacked from a generic buffer.',
        },
        {
          type: 'p',
          text: 'With that description, the engine can call your function **by name**, without a C++ function pointer. That single capability powers Blueprint nodes, Blueprint-overridable events, console commands, editor buttons, network calls and dynamic delegates. The specifiers decide which of those doors you open.',
        },
        {
          type: 'code',
          title: 'HealthPickup.h',
          code: `UCLASS()
class MYGAME_API AHealthPickup : public AActor {
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Pickup")
    void Respawn();

    UFUNCTION(BlueprintPure, Category = "Pickup")
    bool IsAvailable() const;

protected:
    UFUNCTION(BlueprintImplementableEvent,
        Category = "Pickup")
    void OnCollected(APawn* Collector);

private:
    UFUNCTION()
    void HandleRespawnTimer();
};`,
          annotations: [
            { lines: '6-7', text: 'A Blueprint node with execution pins: it *does* something.' },
            { lines: '9-10', text: 'A getter node with no execution pins: it only *answers* something.' },
            { lines: '13-15', text: 'Declared in C++, implemented in the Blueprint. C++ calls it to let designers react.' },
            { lines: '18-19', text: 'No specifiers at all: invisible to Blueprints, but reflected so a dynamic delegate or a timer can find it by name.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a UFUNCTION cannot be overloaded',
          text: 'Reflection identifies a function by its **name** alone. If you declared two `UFUNCTION`s called `Heal`, one taking `float` and one taking `int32`, a Blueprint node or a delegate bound to `"Heal"` would be ambiguous, so UHT rejects it. For the same reason a `UFUNCTION` cannot be a template, and its parameters must be types reflection understands: basic types, `FString`/`FName`/`FText`, UObject pointers, `USTRUCT`s, `UENUM`s and Unreal containers of those. `std::string` and `std::vector` are not allowed.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Pointers in function signatures',
          text: '`TObjectPtr<>` is the convention for `UPROPERTY` members. Function parameters and return values conventionally use raw pointers such as `APawn*`, as Epic\'s own headers do.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'BlueprintCallable vs BlueprintPure',
      blocks: [
        {
          type: 'p',
          text: 'Blueprint graphs have two kinds of wires. **Data wires** carry values. White [[exec-pin|execution wires]] carry *control*: they decide what runs and in which order, like the sequence of statements in a C++ function body.',
        },
        {
          type: 'compare',
          left: {
            title: 'BlueprintCallable',
            tone: 'neutral',
            code: `UFUNCTION(BlueprintCallable,
    Category = "Combat")
void Reload();`,
            text: 'Has exec pins. Runs exactly once each time execution flows into it, in a definite order. Use for anything that **changes state**: reloading, spawning, applying damage.',
          },
          right: {
            title: 'BlueprintPure',
            tone: 'neutral',
            code: `UFUNCTION(BlueprintPure,
    Category = "Combat")
int32 GetAmmo() const;`,
            text: 'No exec pins (drawn green). Runs whenever another node needs its output. Use for **questions** with no side effects: getters, calculations.',
          },
        },
        {
          type: 'p',
          text: 'Unreal also infers purity from `const`: a `const` member function marked `BlueprintCallable` is shown as a pure node by default. If you want a `const` function to keep its exec pins (for example because it is expensive and you want callers to control exactly when it runs), write `BlueprintCallable, BlueprintPure = false`.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Statements and expressions',
          text: 'A callable node is like a C++ **statement**: it executes at a specific point in the sequence. A pure node is like an **expression** such as `a + b`: it has no place in the sequence of its own and is simply evaluated wherever its value is used.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'You are exposing a health getter for UI widgets: it divides `Health` by `MaxHealth` and changes nothing. Which declaration fits best?',
      codeOptions: true,
      options: [
        {
          text: `UFUNCTION(BlueprintPure, Category = "Health")
float GetHealthPercent() const;`,
          correct: true,
          why: 'A cheap question with no side effects is the textbook pure function, and `const` documents (and enforces) that it does not modify the actor.',
        },
        {
          text: `UFUNCTION(BlueprintCallable, Category = "Health")
float GetHealthPercent();`,
          why: 'It works, but forces every caller to wire exec pins for a simple getter, cluttering widgets and graphs for no benefit.',
        },
        {
          text: `UFUNCTION(BlueprintImplementableEvent)
float GetHealthPercent() const;`,
          why: 'That would ask each Blueprint to implement the calculation. The maths belongs in C++ where it is written once.',
        },
        {
          text: `UFUNCTION(Exec)
float GetHealthPercent() const;`,
          why: '`Exec` exposes a console command; it does not create a Blueprint node at all.',
        },
      ],
      explanation:
        'Pure nodes are for questions: cheap, side-effect-free computations. Marking the function `const` matches C++ intent to Blueprint behaviour; in fact `BlueprintCallable` on a `const` function would also produce a pure node, but stating `BlueprintPure` makes the intent explicit.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Pure nodes run again and again',
      blocks: [
        {
          type: 'p',
          text: 'Because a pure node has no place in the execution sequence, the Blueprint VM evaluates it **every time a node that uses its output executes**. Wire one pure output into three nodes and it can run three times. Put it inside a loop and it runs on every iteration.',
        },
        {
          type: 'code',
          title: 'LootChest.h / LootChest.cpp',
          code: `// Fine: cheap and deterministic.
UFUNCTION(BlueprintPure, Category = "Loot")
bool IsLooted() const { return bLooted; }

// Dangerous as a pure function:
UFUNCTION(BlueprintPure, Category = "Loot")
int32 RollLootTier() const;

int32 ALootChest::RollLootTier() const {
    return FMath::RandRange(1, 5);
}`,
          annotations: [
            { lines: '2-3', text: 'Returns the same answer however often it is evaluated and costs almost nothing: a perfect pure function.' },
            { lines: '6-7', text: 'Technically `const`, but each evaluation gives a different result. Wire it into two nodes and the "same" roll can be 2 in one and 5 in the other.' },
            { lines: 10, text: 'A random roll is an *action* (it consumes randomness). Make it `BlueprintCallable` so it runs once, at a definite moment, and store the result.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why pure functions must be const and cheap',
          text: 'The graph author does not control how many times a pure node runs; the wiring does. A pure function is therefore only safe if running it extra times is **harmless** (no side effects, which `const` helps guarantee) and **affordable** (cheap enough that a few extra calls per frame do not matter). Anything that changes state, consumes randomness or searches the world belongs behind exec pins.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'The ForEach trap',
          text: 'Blueprint\'s *For Each Loop* is a macro that reads its *Array* input again on every iteration. Feed it from a pure function that searches the level (such as a pure wrapper around `GetAllActorsOfClass`) and you repeat that search once per element. Cache the array in a local variable first, or make the search function `BlueprintCallable`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'mcq',
      prompt: 'The pure function `RollLootTier()` from the previous card returns `FMath::RandRange(1, 5)`. Its single output pin is wired into **two** *Print String* nodes that run one after another. What happens?',
      options: [
        {
          text: 'Nothing compiles: pure functions are not allowed to call `FMath::RandRange`',
          why: 'Nothing stops a pure function from calling anything. Purity is a promise you make, not a rule the compiler checks.',
        },
        {
          text: 'It is evaluated once and both prints show the same number',
          why: 'Pure results are not cached between separate executing nodes. Each *Print String* pulls the value again when it runs.',
        },
        {
          text: 'It runs once per print, so the two prints can show different numbers',
          correct: true,
          why: 'Each executing node that consumes a pure output triggers a fresh evaluation, so you get two independent rolls.',
        },
        {
          text: 'It runs only once per frame, however many nodes use it',
          why: 'Blueprints have no per-frame caching of pure nodes. Evaluation is driven by consumers, not by frames.',
        },
      ],
      explanation:
        'Pure nodes are re-evaluated for every executing node that consumes them. That is harmless for a deterministic getter, but for a random roll it means "the result" is really several results. Make such functions `BlueprintCallable`, run them once, and store the output in a variable.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'BlueprintImplementableEvent: a hook with no C++ body',
      blocks: [
        {
          type: 'p',
          text: '[[blueprint-implementable-event|BlueprintImplementableEvent]] reverses the usual direction: C++ **declares** a function and **calls** it, but a Blueprint **implements** it. It is how C++ systems tell designers "something just happened, do whatever you like here" — play a sound, spawn particles, animate a mesh.',
        },
        {
          type: 'code',
          title: 'Door.h',
          code: `UCLASS(Abstract)
class MYGAME_API ADoor : public AActor {
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Door")
    void Open(AActor* OpenedBy);

protected:
    UFUNCTION(BlueprintImplementableEvent,
        Category = "Door")
    void OnDoorOpened(AActor* OpenedBy);

private:
    bool bIsOpen = false;
};`,
          annotations: [
            { lines: 1, text: '`Abstract` means the bare C++ class cannot be placed; designers place a Blueprint child that implements the event.' },
            { lines: '10-12', text: 'Declaration only. Do **not** write `ADoor::OnDoorOpened` in the `.cpp`: UHT already generates its body in `Door.gen.cpp`, so a second definition fails to build.' },
          ],
        },
        {
          type: 'code',
          title: 'Door.cpp',
          code: `void ADoor::Open(AActor* OpenedBy) {
    if (bIsOpen) {
        return;
    }
    bIsOpen = true;
    SetActorEnableCollision(false);
    OnDoorOpened(OpenedBy);
}`,
          annotations: [
            { lines: '2-6', text: 'The rules live in C++: a door opens once, and the gameplay effect (no more collision) is guaranteed.' },
            { lines: 7, text: 'An ordinary-looking call. The generated body packs `OpenedBy` into a parameter struct and calls `ProcessEvent`, which runs the Blueprint\'s *Event On Door Opened* if one exists, or does nothing if not.' },
          ],
        },
        {
          type: 'list',
          items: [
            'A `void` event with no output parameters appears in the Blueprint as a red **event node** in the Event Graph.',
            'If it returns a value (or has output parameters), it appears under **Functions → Override** instead, because events cannot return values. Unimplemented, it returns a default-constructed value (`0`, `false`, `nullptr`).',
            'Do not mark it `virtual`: the C++ side has nothing to override. Overriding happens in Blueprint.',
            'Common naming conventions: `OnSomething`, `BP_OnSomething` or Epic\'s `ReceiveSomething` (as in `ReceiveBeginPlay`), so readers can tell it is a Blueprint hook.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: 'Every `BlueprintImplementableEvent` needs a C++ body in the `.cpp` file, even if it is empty.',
      answer: false,
      explanation:
        'UHT generates the body of a `BlueprintImplementableEvent` in the `.gen.cpp` file; that generated body forwards the call to `ProcessEvent`. Writing your own definition creates a second definition of the same function, which the compiler or linker rejects. If you want a C++ default that Blueprints *may* override, you need `BlueprintNativeEvent` instead.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'BlueprintNativeEvent: a C++ default Blueprints may override',
      blocks: [
        {
          type: 'p',
          text: '[[blueprint-native-event|BlueprintNativeEvent]] combines both worlds: C++ provides a default implementation, and a Blueprint child may replace it. The default lives in a function with the same name plus the suffix `_Implementation`.',
        },
        {
          type: 'code',
          title: 'Chest.h',
          code: `UFUNCTION(BlueprintNativeEvent, BlueprintCallable,
    Category = "Interaction")
bool CanInteract(APawn* Interactor) const;
virtual bool CanInteract_Implementation(
    APawn* Interactor) const;`,
          annotations: [
            { lines: '1-3', text: 'The public face. You never write a body for `CanInteract`; UHT generates it, just like an implementable event. Adding `BlueprintCallable` also lets graphs call it.' },
            { lines: '4-5', text: 'Your C++ default. Declare it `virtual` so C++ subclasses can `override` it too.' },
          ],
        },
        {
          type: 'code',
          title: 'Chest.cpp',
          code: `bool AChest::CanInteract_Implementation(
    APawn* Interactor) const {
    return !bLooted && Interactor != nullptr;
}

void AChest::TryOpen(APawn* Interactor) {
    if (CanInteract(Interactor)) {
        bLooted = true;
        GiveLootTo(Interactor);
    }
}`,
          annotations: [
            { lines: '1-4', text: 'The default rule, used by every chest Blueprint that does not override the event.' },
            { lines: 7, text: 'Call the name **without** the suffix. The generated wrapper goes through `ProcessEvent`, which picks the Blueprint override if one exists and falls back to `_Implementation` otherwise.' },
          ],
        },
        {
          type: 'table',
          headers: ['Question', 'BlueprintCallable', 'BlueprintImplementableEvent', 'BlueprintNativeEvent'],
          rows: [
            ['Who writes the body?', 'C++', 'Blueprint only', 'C++ (`_Implementation`), optionally replaced by Blueprint'],
            ['Can Blueprint override it?', 'No', 'Yes (required for any effect)', 'Yes (optional)'],
            ['How C++ calls it', '`Foo()`', '`Foo()`', '`Foo()` — never `Foo_Implementation()`'],
            ['Typical use', 'Actions Blueprints trigger', 'Cosmetic hooks: sounds, effects', 'Overridable rules with a sensible default'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Overriding in a C++ subclass and in Blueprint',
          text: 'A C++ subclass overrides `virtual bool CanInteract_Implementation(APawn* Interactor) const override;` and can call `Super::CanInteract_Implementation(Interactor)`. A Blueprint overrides the event in its graph; right-click the event node and choose **Add call to parent function** to run the C++ version as part of it.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the _Implementation split?',
          text: 'The engine needs one function C++ can call that might run Blueprint code. A plain C++ virtual call cannot dispatch into a Blueprint graph, because Blueprint functions are not entries in the [[vtable]]. So UHT owns `CanInteract` (the dispatcher that goes through reflection) and gives you `CanInteract_Implementation` (an ordinary virtual function) for your default. You saw the same "a different mechanism than the vtable" idea with `virtual` dispatch in the C++ course.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'fill',
      prompt: 'Declare an `Interact` event that has a C++ default, can be overridden in Blueprint, and can be called from graphs.',
      template: `UFUNCTION(___, BlueprintCallable,
    Category = "Interaction")
void Interact(APawn* Interactor);
virtual void Interact___(APawn* Interactor);`,
      blanks: [{ answers: ['BlueprintNativeEvent'] }, { answers: ['_Implementation'] }],
      wordBank: ['BlueprintNativeEvent', '_Implementation', 'BlueprintImplementableEvent', 'BlueprintPure', '_Native', '_Override', '_Validate'],
      explanation:
        '`BlueprintNativeEvent` is the only specifier that gives you both a C++ default and an optional Blueprint override. The default goes in `Interact_Implementation`, declared `virtual` so C++ subclasses can override it too. `BlueprintImplementableEvent` would have no C++ body at all, and `_Validate` is a suffix used by networked functions, not events.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: 'A designer overrode *Can Interact* in `BP_CursedChest` so it can only be opened at night, but players can open it at any time. Tap the line that causes this.',
      code: `bool AChest::CanInteract_Implementation(
    APawn* Interactor) const {
    return !bLooted && Interactor != nullptr;
}

void AChest::TryOpen(APawn* Interactor) {
    if (CanInteract_Implementation(Interactor)) {
        bLooted = true;
        GiveLootTo(Interactor);
    }
}`,
      bugLines: [7],
      hint: 'Which function goes through reflection, and which is an ordinary C++ call?',
      explanation:
        'Line 7 calls `CanInteract_Implementation` directly. That is a normal C++ virtual call to the C++ default, so it completely bypasses `ProcessEvent` and therefore the Blueprint override. Call `CanInteract(Interactor)` instead: the generated wrapper dispatches to the Blueprint version when one exists and falls back to `_Implementation` otherwise.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Parameters, return values and output pins',
      blocks: [
        {
          type: 'p',
          text: 'UHT turns each parameter into a pin on the Blueprint node. Inputs appear on the left, outputs on the right. The rule that decides which side a parameter lands on comes straight from C++ conventions you already know from [[pass-by-reference]].',
        },
        {
          type: 'code',
          title: 'Inventory.h',
          code: `UFUNCTION(BlueprintCallable, Category = "Inventory")
bool TryRemoveItem(FName ItemId, int32 Count,
    int32& OutRemaining);

UFUNCTION(BlueprintCallable, Category = "Inventory")
void DropAt(const FVector& Location, FName ItemId);

UFUNCTION(BlueprintCallable, Category = "Inventory")
void SortByName(UPARAM(ref) TArray<FName>& Items);`,
          annotations: [
            { lines: 2, text: 'By-value parameters (`ItemId`, `Count`) become **input** pins. The `bool` return value becomes an output pin called *Return Value*.' },
            { lines: 3, text: 'A **non-const reference** becomes an **output** pin. The node shows `Out Remaining` on the right, next to *Return Value*.' },
            { lines: 6, text: 'A **const reference** is an input: `const` promises the function will not write to it, so it is just an efficient way to pass a big struct.' },
            { lines: 9, text: '`UPARAM(ref)` forces a non-const reference to be an **input** pin passed by reference, so the function can modify the caller\'s array in place.' },
          ],
        },
        {
          type: 'table',
          headers: ['C++ parameter', 'Blueprint pin'],
          rows: [
            ['`int32 Count` (by value)', 'Input'],
            ['`const FVector& Location`', 'Input (passed efficiently)'],
            ['`int32& OutRemaining`', 'Output'],
            ['`UPARAM(ref) TArray<FName>& Items`', 'Input, passed by reference'],
            ['Return value', 'Output named *Return Value*'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why non-const references become outputs',
          text: 'In C++ a non-const reference parameter usually means "I will write my answer here" — the classic way to return several values. Blueprint has no notion of handing a variable to a node for modification, so UHT maps that intent to what Blueprint does have: extra output pins. Epic\'s convention of prefixing such parameters with `Out` makes the intent visible in C++ as well.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Naming pins',
          text: '`UPARAM(DisplayName = "Item")` renames a parameter\'s pin, and `meta = (ReturnDisplayName = "Success")` on the `UFUNCTION` renames *Return Value*. The metadata lesson covers more of these.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'Which pins does the Blueprint node for this function have?',
      code: `UFUNCTION(BlueprintCallable, Category = "Combat")
bool TryFire(const FVector& AimDirection,
    int32& OutAmmoLeft, float Spread);`,
      options: [
        {
          text: 'Exec in/out; inputs *Aim Direction* and *Spread*; outputs *Return Value* and *Out Ammo Left*',
          correct: true,
          why: 'The const reference and the by-value `float` are inputs; the non-const reference and the return value are outputs; `BlueprintCallable` on a non-const function keeps exec pins.',
        },
        {
          text: 'Exec in/out; inputs *Aim Direction*, *Out Ammo Left* and *Spread*; output *Return Value*',
          why: 'A plain non-const reference becomes an output, not an input. Making it an input would require `UPARAM(ref)`.',
        },
        {
          text: 'No exec pins; inputs *Aim Direction* and *Spread*; outputs *Return Value* and *Out Ammo Left*',
          why: 'Only pure functions lose their exec pins. `TryFire` is not `const` and not `BlueprintPure`.',
        },
        {
          text: 'Exec in/out; inputs *Aim Direction* and *Spread*; output *Out Ammo Left* only',
          why: 'A non-void return value always becomes an output pin (named *Return Value* unless renamed).',
        },
      ],
      explanation:
        'Apply the rules mechanically: by-value and `const&` parameters are inputs, plain `&` parameters are outputs, a non-void return is an output, and only pure functions drop the exec pins. Pin order follows declaration order within each side.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Editor buttons and console commands: CallInEditor and Exec',
      blocks: [
        {
          type: 'p',
          text: 'Two specifiers expose functions to people rather than to graphs. [[call-in-editor|CallInEditor]] adds a **button** to the Details panel; `Exec` turns a function into a **console command** you can type while the game runs.',
        },
        {
          type: 'code',
          title: 'FenceBuilder.h',
          code: `UCLASS()
class MYGAME_API AFenceBuilder : public AActor {
    GENERATED_BODY()

public:
    UFUNCTION(CallInEditor, Category = "Fence")
    void RebuildFence();

    UPROPERTY(EditAnywhere, Category = "Fence")
    int32 PostCount = 10;
};`,
          annotations: [
            { lines: '6-7', text: 'Select the actor in the level and a *Rebuild Fence* button appears under the Fence category. The function must take no parameters.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'CallInEditor runs in the editor world',
          text: 'The button runs your code on the actor in the **editor** level, not in a running game: `BeginPlay` has never been called and there is no player. Anything you change is saved with the level, so call `Modify()` on objects before changing them if you want the edit to support undo.',
        },
        {
          type: 'code',
          title: 'MyCheatManager.h',
          code: `UCLASS()
class MYGAME_API UMyCheatManager : public UCheatManager {
    GENERATED_BODY()

public:
    UFUNCTION(Exec)
    void GiveGold(int32 Amount);
};`,
          annotations: [
            { lines: '6-7', text: 'Open the console (the `~` key by default) and type `GiveGold 500`. The engine parses `500` into the `int32` parameter using reflection.' },
          ],
        },
        {
          type: 'p',
          text: '`Exec` only works on classes the console actually routes commands to: notably the [[player-controller]], its possessed [[pawn]], the [[hud]], the cheat manager, the [[game-mode]] and the [[game-instance]]. An `Exec` function on a random actor in the level is silently never found.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Put cheats in a UCheatManager',
          text: 'A `UCheatManager` subclass (assigned through the player controller\'s `CheatClass`) is the conventional home for debug commands. By default the GameMode only allows cheats in standalone (single-player) games and in the editor, and the console itself is normally unavailable in Shipping builds, so cheats do not leak into online play.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'An environment artist wants a button on a placed `ARiverSpline` actor that regenerates its foam meshes while they edit the level. Which specifier gives them that?',
      options: [
        {
          text: '`BlueprintCallable`',
          why: 'That creates a node for graphs. The artist would need to write a Blueprint just to press it.',
        },
        {
          text: '`Exec`',
          why: '`Exec` creates a console command, and only while a game is running on certain classes; it does not add anything to the Details panel.',
        },
        {
          text: '`BlueprintImplementableEvent`',
          why: 'That asks a Blueprint to implement the function; it creates no button and no C++ behaviour.',
        },
        {
          text: '`CallInEditor`',
          correct: true,
          why: 'A parameterless `CallInEditor` function shows up as a button in the Details panel of the selected actor, running in the editor world.',
        },
      ],
      explanation:
        '`CallInEditor` is designed for exactly this: one-click editor tools on actors (regenerate, randomise, snap to ground). Remember that it runs on the editor level, so its results are saved with the map.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'concept',
      title: 'Calling by name: dynamic delegates and timers',
      blocks: [
        {
          type: 'p',
          text: 'Some engine systems store "which function to call later" as an **object plus a function name** rather than a C++ function pointer. To turn the name back into a callable function they ask reflection, so the target **must** be a `UFUNCTION` — even a private one with no specifiers.',
        },
        {
          type: 'code',
          title: 'Bomb.h',
          code: `private:
    UFUNCTION()
    void HandleHit(UPrimitiveComponent* HitComp,
        AActor* OtherActor, UPrimitiveComponent* OtherComp,
        FVector NormalImpulse, const FHitResult& Hit);

    UFUNCTION()
    void Explode();

    FTimerHandle FuseHandle;`,
          annotations: [
            { lines: '2-5', text: 'The parameter list must match the delegate\'s signature exactly. `UFUNCTION()` with no specifiers is enough.' },
            { lines: '7-8', text: 'Will be found by its name, `"Explode"`, so it must be reflected too.' },
          ],
        },
        {
          type: 'code',
          title: 'Bomb.cpp',
          code: `void ABomb::BeginPlay() {
    Super::BeginPlay();
    Mesh->OnComponentHit.AddDynamic(this, &ABomb::HandleHit);

    FTimerDelegate Fuse;
    Fuse.BindUFunction(this, FName("Explode"));
    GetWorldTimerManager().SetTimer(FuseHandle, Fuse, 3.f,
        false);
}`,
          annotations: [
            { lines: 3, text: '`OnComponentHit` is a [[dynamic-delegate]]. `AddDynamic` is a macro that passes the function\'s **name** along with the pointer; the delegate stores only the object and the name.' },
            { lines: 6, text: 'Binding a timer by name: at fire time the timer manager looks up `"Explode"` through reflection.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why names instead of function pointers?',
          text: 'A name can be **saved** with an asset and **bound from a Blueprint**, where no C++ function pointer exists. That is what lets a designer bind *On Component Hit* in a graph, and what lets the engine serialize those bindings. The price: the lookup happens at run time, so a missing `UFUNCTION` is not a compile error. The code builds, the binding finds nothing, and in development builds an `ensure` warns that the function "might not be marked as a UFUNCTION".',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Not every timer needs UFUNCTION',
          text: '`GetWorldTimerManager().SetTimer(FuseHandle, this, &ABomb::Explode, 3.f, false)` binds a real C++ member-function pointer and works on any member function. Only the **by-name** forms (`BindUFunction`, `CreateUFunction`, Blueprint\'s *Set Timer by Function Name*) and dynamic delegates require reflection. Delegates and timers each get a full lesson later in the course.',
        },
      ],
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'mcq',
      prompt: 'A programmer binds `OnComponentBeginOverlap.AddDynamic(this, &ACoin::HandleOverlap)` but forgot to put `UFUNCTION()` above `HandleOverlap`. What happens?',
      options: [
        {
          text: 'UHT reports an error, so the project does not build',
          why: 'UHT only parses declarations marked with Unreal macros. It never sees the `AddDynamic` call or the unmarked function.',
        },
        {
          text: 'It builds, but the binding fails at run time and overlaps never call the function',
          correct: true,
          why: 'The dynamic delegate stores a name and looks it up through reflection; an unreflected function has no entry, so nothing gets bound (development builds raise an `ensure`).',
        },
        {
          text: 'It works normally; `UFUNCTION` is only needed for Blueprint access',
          why: 'Blueprint access is one reason for `UFUNCTION`, but dynamic delegates depend on reflection too.',
        },
        {
          text: 'The C++ compiler rejects `&ACoin::HandleOverlap` because the function is not a UFUNCTION',
          why: 'Taking the address of any member function is valid C++. The problem is invisible to the compiler and only appears when the name lookup runs.',
        },
      ],
      explanation:
        'Dynamic delegates trade compile-time safety for serializability and Blueprint support: they resolve functions by name at run time. Whenever a dynamic delegate "does nothing", the first thing to check is the `UFUNCTION()` above the handler, followed by a mismatched signature.',
    },
    // ------------------------------------------------------------------ 17
    {
      kind: 'order',
      prompt: 'C++ calls `CanInteract(Pawn)` on a chest whose Blueprint overrides the native event **and** calls its parent. Put the steps in order.',
      linesAreCode: false,
      lines: [
        'C++ calls the UHT-generated wrapper `CanInteract(Pawn)`',
        'The wrapper packs the arguments and calls `ProcessEvent` with the reflected `UFunction`',
        'The engine finds the Blueprint\'s override and runs its graph',
        'The graph\'s *Parent: Can Interact* node runs `CanInteract_Implementation` in C++',
        'The Blueprint graph returns its final result to the C++ caller',
      ],
      distractors: ['C++ calls `CanInteract_Implementation` directly, then the Blueprint graph'],
      explanation:
        'A native event always enters through the generated wrapper, which hands control to reflection via `ProcessEvent`. Reflection picks the most-derived implementation — here the Blueprint graph — and the graph decides whether the C++ default runs at all (through the parent call). Calling `_Implementation` directly would skip all of this.',
    },
  ],
  takeaways: [
    '`UFUNCTION` gives a function a reflected description so the engine can call it by name; that is also why reflected functions cannot be overloaded or templated.',
    '`BlueprintCallable` nodes have exec pins and run once per execution; `BlueprintPure` nodes have none and re-run for every consumer, so they must be `const`, cheap and side-effect free.',
    '`BlueprintImplementableEvent` is declared and called in C++ but implemented only in Blueprint; never write its C++ body.',
    '`BlueprintNativeEvent` puts the C++ default in `Foo_Implementation`; always call `Foo()`, never `Foo_Implementation()`, or Blueprint overrides are skipped.',
    'Non-const reference parameters become output pins; `const&` and by-value parameters are inputs; `UPARAM(ref)` makes a reference an input.',
    '`CallInEditor` adds Details-panel buttons, `Exec` adds console commands, and dynamic delegates or timers bound by name require `UFUNCTION` because they look functions up at run time.',
  ],
  reading: [
    {
      title: 'UFunctions',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/ufunctions-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s list of function specifiers and metadata, including the networking ones you will meet later.',
    },
    {
      title: 'All UFUNCTION specifiers (benui)',
      url: 'https://benui.ca/unreal/ufunction/',
      source: 'article',
      note: 'A community reference with node screenshots for each specifier; good for seeing pure vs callable at a glance.',
    },
    {
      title: 'Unreal Engine C++ Complete Guide',
      url: 'https://www.tomlooman.com/unreal-engine-cpp-guide/',
      source: 'article',
      note: 'See its sections on exposing functions and on BlueprintImplementableEvent versus BlueprintNativeEvent.',
    },
  ],
};
