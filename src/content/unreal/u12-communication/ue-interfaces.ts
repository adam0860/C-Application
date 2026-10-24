import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-interfaces',
  title: 'Unreal Interfaces',
  summary:
    'UINTERFACE from the inside: why two classes are generated, how C++ and Blueprint classes implement the same contract, and why Execute_ is the only safe way to call it.',
  minutes: 17,
  objectives: [
    'Declare an interface with `UINTERFACE` and explain the roles of the `U` and `I` classes',
    'Implement interface functions in C++ (`_Implementation`) and know how Blueprints implement them',
    'Call interface functions with `Implements<U>()` and `IInterface::Execute_Func()`, and explain why',
    'Choose between pure C++ interface functions, `BlueprintNativeEvent` and `BlueprintImplementableEvent`',
    'Store interface references with `TScriptInterface` and decide when an interface beats a base class or component',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'One button, many unrelated things',
      blocks: [
        {
          type: 'p',
          text: 'The player presses **E** to interact with whatever is in front of them: a door (`ADoor : AActor`), a treasure chest (`AChest : AActor`), a shopkeeper (`AShopkeeper : ACharacter`), a computer terminal built entirely in Blueprint by a designer. They share no useful base class — a shopkeeper must be a character, a door must not. Yet the player\'s code wants to treat them all the same way: *interact with it*.',
        },
        {
          type: 'p',
          text: 'In the C++ course you solved this with an [[interface]]: an [[abstract-class]] containing only [[pure-virtual-function|pure virtual functions]], which unrelated classes inherit alongside their real base. Unreal keeps the idea but has to adapt it to three constraints standard C++ does not have:',
        },
        {
          type: 'list',
          items: [
            '**Single UObject inheritance.** A UObject class may derive from only one UObject class. An interface that was itself a UObject could not be mixed into `AActor`.',
            '**Blueprints must participate.** A designer\'s Blueprint must be able to implement the interface, and Blueprint graphs must be able to call it.',
            '**Reflection must know.** The engine needs to answer "does this object implement *Interactable*?" at runtime, for C++ and Blueprint classes alike.',
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A job description, not a family tree',
          text: 'Inheritance says what something *is* (a shopkeeper is a character). An interface says what it *can do* (it can be interacted with). A plumber and a robot can both "fix a leak" without being related; the customer only cares about the job description.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Declaring an interface: two classes',
      blocks: [
        {
          type: 'p',
          text: 'An Unreal interface is declared with the [[uinterface|UINTERFACE]] macro and always comes as a **pair** of classes. The editor\'s *New C++ Class → Unreal Interface* wizard generates this skeleton:',
        },
        {
          type: 'code',
          title: 'Interactable.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "Interactable.generated.h"

UINTERFACE(MinimalAPI, Blueprintable)
class UInteractable : public UInterface {
    GENERATED_BODY()
};

class MYGAME_API IInteractable {
    GENERATED_BODY()

public:
    // Implementable in C++ or Blueprint
    UFUNCTION(BlueprintCallable, BlueprintNativeEvent,
              Category = "Interaction")
    void Interact(AActor* Interactor);

    UFUNCTION(BlueprintCallable, BlueprintNativeEvent,
              Category = "Interaction")
    FText GetInteractPrompt() const;

    // Plain C++ virtual: invisible to Blueprints
    virtual float GetInteractRange() const { return 200.f; }
};`,
          annotations: [
            { lines: 7, text: '`Blueprintable` allows Blueprint classes to implement the interface. `MinimalAPI` exports only the minimum (the class\'s type information) from the module, which is all other modules need to ask "does X implement this?".' },
            { lines: '8-10', text: '**`UInteractable`** derives from `UInterface` (a UObject). It is never instantiated or inherited by your actors; it exists so the interface has a `UClass` that reflection, the editor and `Implements<UInteractable>()` can use. It stays empty.' },
            { lines: 12, text: '**`IInteractable`** is the class your actors actually inherit. It is *not* a UObject, so it can sit alongside `AActor` in a multiple-inheritance list. Functions go here. `MYGAME_API` exports its generated `Execute_` functions to other modules.' },
            { lines: '17-19', text: 'A [[blueprint-native-event]]: C++ classes implement it by overriding `Interact_Implementation`, Blueprints by implementing the *Interact* event. Note there is no `virtual` and no body here — [[unreal-header-tool|UHT]] generates the plumbing.' },
            { lines: 26, text: 'An ordinary virtual function. Fast, but only C++ implementers can override it and only C++ callers holding an `IInteractable*` can call it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why two classes?',
          text: 'Because the interface has to be two things at once. Reflection needs a **UObject-side** representation — a `UClass` that can be listed in a Blueprint\'s *Implemented Interfaces*, stored in class metadata and queried at runtime. Your actors need a **plain C++ mixin** they can inherit without becoming "two UObjects", which C++ would allow but Unreal\'s object system forbids. Splitting the roles gives each requirement its own class: `U` for the engine, `I` for your code. As a rule of thumb: use the `U` class when you ask *whether* (`Implements<UInteractable>()`), and the `I` class when you *call* (`IInteractable::Execute_Interact`).',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'Why does an Unreal interface consist of both `UInteractable` and `IInteractable`?',
      options: [
        { text: '`UInteractable` is used in editor builds and `IInteractable` in shipping builds', why: 'Both exist in every build. They differ in role, not in build configuration.' },
        { text: '`UInteractable` gives the interface a `UClass` for reflection and Blueprints; `IInteractable` is the non-UObject class implementers inherit alongside their UObject base', correct: true, why: 'Exactly: reflection needs a UObject-side type, while implementers need a mixin that does not add a second UObject base.' },
        { text: '`UInteractable` holds the interface\'s data members and `IInteractable` holds its functions', why: 'Neither holds data in the usual design. The `U` class stays empty; functions live in the `I` class.' },
        { text: '`UInteractable` is for Blueprint implementers and `IInteractable` is for C++ implementers', why: 'Both kinds of implementer use the same pair. C++ classes inherit `IInteractable`; Blueprints add "Interactable" in Class Settings, which refers to the same `UClass`.' },
      ],
      explanation:
        'Unreal\'s object system allows only one UObject base class, and reflection needs a `UClass` for everything it reasons about. The pair solves both: `UInteractable : UInterface` is the reflected identity of the interface, and `IInteractable` is a plain C++ class that `AChest : AActor, IInteractable` can inherit without a second UObject base.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Implementing it in C++ and in Blueprint',
      blocks: [
        {
          type: 'p',
          text: 'A C++ class implements the interface by inheriting the `I` class and overriding the generated `_Implementation` functions — the same pattern you used for `BlueprintNativeEvent` functions on ordinary classes.',
        },
        {
          type: 'code',
          title: 'Chest.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Interactable.h"
#include "Chest.generated.h"

UCLASS()
class MYGAME_API AChest : public AActor, public IInteractable {
    GENERATED_BODY()

public:
    virtual void Interact_Implementation(
        AActor* Interactor) override;
    virtual FText GetInteractPrompt_Implementation()
        const override;
    virtual float GetInteractRange() const override {
        return 150.f;
    }

private:
    bool bOpened = false;
};`,
          annotations: [
            { lines: 5, text: 'Include the interface header before the generated header, like any other base class.' },
            { lines: 9, text: 'One UObject base (`AActor`) plus the interface mixin. You can list several interfaces.' },
            { lines: '13-16', text: 'UHT declared virtual `Interact_Implementation` and `GetInteractPrompt_Implementation` in `IInteractable` (with default bodies). You override them; you never override `Interact` itself.' },
            { lines: '17-19', text: 'The plain C++ virtual is overridden normally.' },
          ],
        },
        {
          type: 'code',
          title: 'Chest.cpp',
          code: `#include "Chest.h"

void AChest::Interact_Implementation(AActor* Interactor) {
    if (bOpened) {
        return;
    }
    bOpened = true;
    UE_LOG(LogTemp, Log, TEXT("%s opened by %s"),
        *GetName(), *GetNameSafe(Interactor));
    // ... play the lid animation, spawn loot ...
}

FText AChest::GetInteractPrompt_Implementation() const {
    return bOpened ? FText::GetEmpty()
                   : NSLOCTEXT("Chest", "Open", "Open chest");
}`,
          annotations: [
            { lines: 9, text: '`GetNameSafe` returns "None" for a null object instead of crashing — handy in logs.' },
            { lines: 15, text: 'Player-facing text is an `FText`, so it can be localised; `NSLOCTEXT` supplies a namespace and key for translators.' },
          ],
        },
        {
          type: 'p',
          text: 'A **Blueprint** implements the same interface without any C++: open *Class Settings*, add *Interactable* under *Implemented Interfaces*, then implement the *Interact* and *Get Interact Prompt* events in the graph. A Blueprint subclass of `AChest` can also override the chest\'s C++ implementation the same way — that is what *native event* means.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Do not try to give the interface its own body',
          text: 'UHT already generates default bodies for `Interact_Implementation` in the `I` class, so defining `IInteractable::Interact_Implementation` yourself in `Interactable.cpp` causes a redefinition error. Defaults belong in a shared base class or helper, not in the interface.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Calling it: Implements and Execute_',
      blocks: [
        {
          type: 'p',
          text: 'Now the caller. The player\'s interaction component has an `AActor*` and wants to interact with it, without knowing — or caring — whether it is a C++ chest or a Blueprint terminal:',
        },
        {
          type: 'code',
          title: 'InteractorComponent.cpp',
          code: `void UInteractorComponent::TryInteract() {
    AActor* Target = FindBestTarget();
    if (!IsValid(Target) ||
        !Target->Implements<UInteractable>()) {
        return;
    }

    const FText Prompt =
        IInteractable::Execute_GetInteractPrompt(Target);
    UE_LOG(LogTemp, Log, TEXT("Prompt: %s"), *Prompt.ToString());

    IInteractable::Execute_Interact(Target, GetOwner());
}`,
          annotations: [
            { lines: 4, text: '`Implements<UInteractable>()` asks the object\'s class (note: the **U** class). It returns true for C++ and Blueprint implementers alike.' },
            { lines: '8-9', text: 'Every event function gets a static `Execute_` wrapper. The first argument is the target object; the rest are the function\'s own parameters.' },
            { lines: 12, text: 'The [[interface-execute|Execute_ function]] finds the right implementation through reflection: the Blueprint event for `BP_Terminal`, `Interact_Implementation` for `AChest`.' },
          ],
        },
        {
          type: 'table',
          headers: ['Call', 'C++ implementer (`AChest`)', 'Blueprint implementer (`BP_Terminal`)'],
          rows: [
            ['`Obj->Implements<UInteractable>()`', '`true`', '`true`'],
            ['`Cast<IInteractable>(Obj)`', 'Valid `IInteractable*`', '**`nullptr`**'],
            ['`IInteractable::Execute_Interact(Obj, …)`', 'Runs `Interact_Implementation`', 'Runs the Blueprint event'],
            ['`GetInteractRange()` (plain virtual)', 'Callable through the cast pointer', 'Not reachable'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why can\'t you just cast and call?',
          text: 'Casting to `IInteractable*` works by finding the `IInteractable` sub-object inside a C++ class — the part of its memory layout, including a [[vtable]] pointer, that the compiler created for the base class. A Blueprint class was never compiled by a C++ compiler, so it has no such sub-object and the cast returns `nullptr`. Its implementation exists only as a reflected function in its `UClass`. `Execute_Interact` handles both cases: it looks the function up by name and invokes it with `ProcessEvent`, falling back to the native `_Implementation`. And if you call `Interact()` directly on a C++ implementer anyway, the UHT-generated body asserts with "Do not directly call Event functions in Interfaces. Call Execute_Interact instead."',
        },
        {
          type: 'deepdive',
          title: 'What UHT generates for Execute_Interact (simplified)',
          blocks: [
            {
              type: 'code',
              code: `void IInteractable::Execute_Interact(UObject* O,
                                     AActor* Interactor) {
    check(O != nullptr);
    check(O->GetClass()->ImplementsInterface(
        UInteractable::StaticClass()));
    FInteractParams Parms;
    Parms.Interactor = Interactor;
    if (UFunction* Func = O->FindFunction("Interact")) {
        O->ProcessEvent(Func, &Parms);  // Blueprint or thunk
    } else if (auto* I = static_cast<IInteractable*>(
            O->GetNativeInterfaceAddress(
                UInteractable::StaticClass()))) {
        I->Interact_Implementation(Interactor);
    }
}`,
              annotations: [
                { lines: '3-5', text: 'Calling `Execute_` on a null object, or one that does not implement the interface, fails these checks — which is why callers test `Implements<U>()` first.' },
                { lines: '8-9', text: '`ProcessEvent` runs a reflected function: the Blueprint graph if one overrides it, otherwise a generated thunk that calls the C++ `_Implementation`.' },
              ],
            },
            {
              type: 'p',
              text: 'The real generated code uses a cached `FName` and a generated parameter struct, but the shape is the same: reflection first, so Blueprint implementations are always found.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'order',
      prompt: 'Arrange the lines to safely interact with whatever actor the player is looking at.',
      lines: [
        'AActor* Target = FindBestTarget();',
        'if (!IsValid(Target)) { return; }',
        'if (!Target->Implements<UInteractable>()) { return; }',
        'IInteractable::Execute_Interact(Target, GetOwner());',
      ],
      distractors: ['Cast<IInteractable>(Target)->Interact(GetOwner());'],
      explanation:
        'Get the target, make sure it is valid (calling `Implements` on a null pointer would crash), confirm it implements the interface (the `Execute_` function checks this and asserts otherwise), then call through `Execute_Interact`. The distractor fails twice: the cast returns `nullptr` for Blueprint implementers, and calling an event function directly asserts even for C++ ones.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'bug',
      prompt: 'Interacting with the C++ `AChest` hits an assertion, and interacting with `BP_Terminal` (a Blueprint implementing the interface) crashes. Tap the faulty line(s).',
      code: `void UInteractorComponent::TryInteract(AActor* Target) {
    if (!IsValid(Target) ||
        !Target->Implements<UInteractable>()) {
        return;
    }
    IInteractable* Interactable = Cast<IInteractable>(Target);
    Interactable->Interact(GetOwner());
}`,
      bugLines: [6, 7],
      hint: 'What does the cast return for a Blueprint implementer, and what happens when you call an event function directly?',
      explanation:
        'Line 6 returns `nullptr` for `BP_Terminal`, because a Blueprint class has no C++ `IInteractable` sub-object — so line 7 dereferences null and crashes. For `AChest` the cast succeeds, but line 7 calls the UHT-generated `Interact()` body directly, which asserts and tells you to use `Execute_Interact`. Replace both lines with `IInteractable::Execute_Interact(Target, GetOwner());`. The validity and `Implements` check on lines 2–3 is correct.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Three kinds of interface function',
      blocks: [
        {
          type: 'p',
          text: 'Each function in the `I` class can be declared in one of three ways. The choice decides who may implement it and how it must be called:',
        },
        {
          type: 'table',
          headers: ['Declaration', 'Who can implement', 'Call from C++ with', 'Visible to Blueprint'],
          rows: [
            ['`virtual` function, no `UFUNCTION`', 'C++ classes only', '`Cast<IInteractable>(Obj)->Func()`', 'No'],
            ['`UFUNCTION(BlueprintNativeEvent)`', 'C++ (`_Implementation`) and Blueprint', '`IInteractable::Execute_Func(Obj, …)`', 'Yes'],
            ['`UFUNCTION(BlueprintImplementableEvent)`', 'Blueprint only', '`IInteractable::Execute_Func(Obj, …)`', 'Yes'],
          ],
        },
        {
          type: 'list',
          items: [
            '**Pure C++ functions** are the fastest (a normal virtual call) and need no reflection, but they silently exclude Blueprint implementers. They suit engineer-only interfaces.',
            '**`BlueprintNativeEvent`** is the flexible default for gameplay interfaces: C++ classes and designers can both implement it, and one calling convention reaches all of them.',
            '**`BlueprintImplementableEvent`** suits hooks that only make sense in Blueprint, such as purely cosmetic reactions.',
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'A UHT rule worth knowing',
          text: 'In an interface that Blueprints may implement, a `BlueprintCallable` function must also be an event (`BlueprintNativeEvent` or `BlueprintImplementableEvent`); UHT rejects plain `BlueprintCallable` functions there, because a Blueprint implementer could never provide a C++ virtual override. If an interface is meant for C++ implementers only, add `meta = (CannotImplementInterfaceInBlueprint)` to the `UINTERFACE`; then plain `BlueprintCallable` functions are allowed.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does Unreal pay for the reflection indirection?',
          text: 'Because designers implement gameplay contracts in Blueprint all the time, and a call path that works only for C++ classes would split every system in two. `Execute_` calls cost a reflected lookup and a `ProcessEvent` instead of a vtable jump — negligible for interaction, damage or dialogue events that happen a few times per second. For per-frame, per-object hot paths, prefer a C++-only interface or a base class.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'fill',
      prompt: 'Make `ALever` implement the interface, and call it from another actor.',
      template: `UCLASS()
class MYGAME_API ALever : public AActor, public ___ {
    GENERATED_BODY()

public:
    virtual void Interact_Implementation(
        AActor* Interactor) override;
};

// Elsewhere, Target is a valid AActor*:
if (Target->Implements<___>()) {
    IInteractable::___(Target, this);
}`,
      blanks: [{ answers: ['IInteractable'] }, { answers: ['UInteractable'] }, { answers: ['Execute_Interact'] }],
      wordBank: ['IInteractable', 'UInteractable', 'Execute_Interact', 'Interact', 'Interact_Implementation', 'UInterface'],
      explanation:
        'Implementers inherit the **I** class (`IInteractable`), the plain C++ mixin. `Implements<>` takes the **U** class (`UInteractable`), the reflected identity of the interface. Calls go through the generated static `Execute_Interact`, passing the target object first. Calling `Interact` directly asserts, and calling `Interact_Implementation` directly would skip any Blueprint override.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'TScriptInterface: storing an interface reference',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes you need to *keep* an interface-typed reference — the interactable the player is currently focused on, for example — or expose an interface parameter to Blueprints. An `IInteractable*` cannot be a `UPROPERTY` (it is not a UObject pointer), and storing it raw would hide the object from the garbage collector. Use [[tscriptinterface|TScriptInterface]]:',
        },
        {
          type: 'code',
          title: 'InteractorComponent.h / .cpp',
          code: `// Header
UPROPERTY(BlueprintReadOnly, Category = "Interaction")
TScriptInterface<IInteractable> FocusedTarget;

// Source
void UInteractorComponent::SetFocus(AActor* Candidate) {
    if (IsValid(Candidate) &&
        Candidate->Implements<UInteractable>()) {
        FocusedTarget = Candidate;
    } else {
        FocusedTarget = nullptr;
    }
}

void UInteractorComponent::Interact() {
    if (UObject* Obj = FocusedTarget.GetObject()) {
        IInteractable::Execute_Interact(Obj, GetOwner());
    }
}`,
          annotations: [
            { lines: '2-3', text: 'A reflected property: the GC sees the object reference (keeping it alive), and Blueprints see a variable typed as the *Interactable* interface.' },
            { lines: 9, text: 'Assigning an object stores the object pointer and, if the class implements the interface in C++, the `IInteractable*` too.' },
            { lines: 16, text: '`GetObject()` always works. `GetInterface()` would return `nullptr` for Blueprint implementers — so call through `Execute_` with the object.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Weak interface references',
          text: '`TScriptInterface` in a `UPROPERTY` is a **strong** reference. If you only observe the target (the focused object may be destroyed at any moment), `TWeakInterfacePtr<IInteractable>` is the weak counterpart — or simply keep a `TWeakObjectPtr<AActor>` and call `Execute_` on it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'truefalse',
      prompt: 'If `BP_Terminal` adds *Interactable* under Implemented Interfaces in its Class Settings, then `Cast<IInteractable>(Terminal)` returns a valid pointer.',
      answer: false,
      explanation:
        '`Cast<IInteractable>` locates the C++ `IInteractable` part of an object\'s memory layout, which only exists for classes compiled from C++ that inherit `IInteractable`. A Blueprint-only implementer has no such part, so the cast returns `nullptr`, even though `Implements<UInteractable>()` returns true. That is why event functions are called through `IInteractable::Execute_…(Object, …)`.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Interface, base class or component?',
      blocks: [
        {
          type: 'p',
          text: 'Interfaces are one of three ways to share behaviour across classes. Choosing well keeps your class hierarchy shallow and your dependencies light:',
        },
        {
          type: 'table',
          headers: ['Tool', 'Best when', 'Example'],
          rows: [
            ['Base class', 'Types share identity *and* implementation, and fit one hierarchy', '`AWeaponBase` with ammo, firing and reload logic for every gun'],
            ['[[actor-component|Component]]', 'The capability carries state and reusable logic that many unrelated actors need', '`UHealthComponent` on players, enemies, crates and turrets'],
            ['Interface', 'Unrelated classes must answer the same message, each in its own way, with no shared state', '`IInteractable` on doors, chests, NPCs and terminals'],
          ],
        },
        {
          type: 'list',
          items: [
            '**Interfaces carry no state.** Blueprint implementers could not inherit C++ data members from the `I` class, so keep data in implementers or in a component.',
            '**Interfaces cut load chains.** The caller depends only on `IInteractable`, which is C++ code. It never references a door or chest asset, unlike a cast to `BP_Door`.',
            '**Combine them.** A common pattern is an interface for the message (`IDamageable::Execute_ReceiveDamage`) whose implementers forward to a component holding the state.',
            '**C++ interfaces beat Blueprint Interface assets for shared code.** A Blueprint Interface asset can only be implemented and called from Blueprint; a C++ `UINTERFACE` serves both worlds.',
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Bridge to standard C++',
          text: 'Conceptually, `IInteractable` is the abstract interface class from the C++ course, and `AChest : AActor, IInteractable` is ordinary multiple inheritance of an interface. What Unreal adds is the `U` twin for reflection and the `Execute_` path for implementations that only exist as Blueprint data.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'Doors (`AActor`), shopkeepers (`ACharacter`) and designer-made Blueprint terminals must all respond to the player\'s *Use* button, each differently. Which design fits best?',
      options: [
        { text: 'A common base class `AUsableActor` that all of them derive from', why: 'Shopkeepers must derive from `ACharacter` and doors should not, so they cannot share one base class.' },
        { text: 'An interface whose functions are plain C++ virtuals, called through `Cast<IUsable>`', why: 'Blueprint terminals could not implement plain virtuals, and the cast would return `nullptr` for them.' },
        { text: 'A `Blueprintable` `UINTERFACE` with a `BlueprintNativeEvent` `Use` function, called via `Implements<UUsable>()` and `IUsable::Execute_Use`', correct: true, why: 'Unrelated hierarchies, per-class behaviour and Blueprint implementers are exactly what this pattern supports.' },
        { text: 'A chain of `Cast<ADoor>`, `Cast<AShopkeeper>`… in the player\'s code', why: 'It cannot cast to Blueprint-only terminals at all from C++, and it must be edited for every new usable type.' },
      ],
      explanation:
        'When unrelated classes must answer the same message in their own way — and some are implemented in Blueprint — a Blueprintable C++ interface with native events is the standard Unreal answer. The caller checks `Implements<U>()` and calls `IUsable::Execute_Use`, never caring which concrete class it is talking to.',
    },
  ],
  takeaways: [
    '`UINTERFACE` generates a pair: the `U` class (a `UInterface`) gives reflection a `UClass`; the `I` class is the non-UObject mixin implementers inherit.',
    'C++ implementers inherit `IInteractable` and override `Func_Implementation` for native events; Blueprints add the interface in Class Settings.',
    'Ask with the U class — `Obj->Implements<UInteractable>()` — and call with the I class — `IInteractable::Execute_Func(Obj, …)`.',
    '`Cast<IInteractable>` returns `nullptr` for Blueprint implementers, and calling an event function directly asserts; `Execute_` handles both C++ and Blueprint.',
    'Plain C++ virtuals in an interface are fast but C++-only; `BlueprintNativeEvent` is the flexible default.',
    'Store interface references with `TScriptInterface` (strong) or `TWeakInterfacePtr` (weak), and call via `GetObject()`.',
    'Use interfaces for shared messages across unrelated classes, components for shared state, base classes for shared identity.',
  ],
  reading: [
    {
      title: 'Interfaces',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/interfaces-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s reference for declaring, implementing and calling C++ interfaces, including the Execute_ functions.',
    },
    {
      title: 'Blueprint Communication Usage',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-communication-usage-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How interfaces compare with casting and event dispatchers from the Blueprint side.',
    },
    {
      title: 'Abstract class',
      url: 'https://en.cppreference.com/w/cpp/language/abstract_class',
      source: 'cppreference',
      note: 'The standard C++ foundation that the `I` class builds on.',
    },
  ],
};
