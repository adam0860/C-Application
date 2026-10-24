import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-abstract-interfaces',
  title: 'Abstract Classes, Interfaces and Virtual Destructors',
  summary: 'Pure virtual functions, interface classes, the virtual destructor rule, object slicing and dynamic_cast — with a preview of Unreal\'s UINTERFACE.',
  minutes: 18,
  objectives: [
    'Declare pure virtual functions and explain why abstract classes cannot be instantiated',
    'Design interface classes and implement several of them in one class',
    'Explain why deleting through a base pointer requires a virtual destructor',
    'Recognise object slicing and avoid it by passing polymorphic objects by reference or pointer',
    'Use `dynamic_cast` to query an object\'s dynamic type safely — and know when not to',
    'Describe how Unreal expresses interfaces with a `UINTERFACE` / `I`-class pair',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Some classes should never exist on their own',
      blocks: [
        {
          type: 'p',
          text: 'What should a plain `Enemy` do when it attacks? There is no sensible answer — "generic enemy attacks for 5" is a placeholder that hides bugs. If someone writes a new enemy and forgets to override `attack`, the placeholder silently runs. Better to say: *`Enemy` has no implementation of this; every real enemy must provide one.*',
        },
        {
          type: 'p',
          text: 'Writing `= 0` after a virtual function declaration makes it a [[pure-virtual-function]]. A class with at least one pure virtual function is an [[abstract-class]]: you cannot create objects of it. A derived class that overrides **all** of them is *concrete* and can be instantiated.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>

class Enemy {
public:
    virtual ~Enemy() = default;

    virtual std::string name() const = 0;   // pure virtual
    virtual int attackDamage() const = 0;   // pure virtual

    void attack() const {
        std::cout << name() << " hits for " << attackDamage()
                  << '\\n';
    }
};

class Slime : public Enemy {
public:
    std::string name() const override { return "Slime"; }
    int attackDamage() const override { return 3; }
};

class Golem : public Enemy {
public:
    std::string name() const override { return "Golem"; }
    int attackDamage() const override { return 40; }
};

int main() {
    // Enemy e;  // error: cannot declare variable 'e'
    //           //        to be of abstract type 'Enemy'
    Slime slime;
    Golem golem;
    const Enemy* wave[] = {&slime, &golem};
    for (const Enemy* e : wave) {
        e->attack();
    }
}`,
          output: 'Slime hits for 3\nGolem hits for 40',
          annotations: [
            { lines: '8-9', text: '`= 0` means "no implementation here; derived classes must provide one". These two declarations make `Enemy` abstract.' },
            { lines: '11-14', text: 'An abstract class can still have ordinary members, data and constructors. `attack()` is shared logic built from the pure virtual "holes" that each enemy fills in.' },
            { lines: '17-21', text: '`Slime` overrides every pure virtual function, so it is concrete. Leave one out and `Slime` would be abstract too.' },
            { lines: 30, text: 'Uncomment this and compilation fails. You can still have **pointers and references** to `Enemy` — that is the whole point.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why make a class abstract?',
          text: 'It turns a run-time bug into a compile-time error. With a placeholder implementation, forgetting an override produces wrong behaviour that someone has to notice in play-testing. With a pure virtual function, the compiler refuses to build any enemy that has not answered every question. It also documents intent: `Enemy` is a *concept* to build on, not a thing to spawn.',
        },
        {
          type: 'deepdive',
          title: 'A pure virtual function can still have a body',
          blocks: [
            {
              type: 'p',
              text: 'Surprisingly, `= 0` does not forbid a definition. You may define a pure virtual function outside the class; derived classes must still override it, but can call the base version explicitly with `Enemy::attack()`. The main real-world use is a **pure virtual destructor** — `virtual ~Enemy() = 0;` plus `Enemy::~Enemy() = default;` in a `.cpp` file — to make a class abstract when it has no other natural pure virtual function. The body is required, because every derived destructor calls it.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Given these classes, which declarations compile? Select all that apply.',
      code: `class Pickup {
public:
    virtual ~Pickup() = default;
    virtual void apply(Player& p) = 0;
};

class HealthPack : public Pickup {
public:
    void apply(Player& p) override;
};

class ArmorShard : public Pickup {
public:
    void glow();
};`,
      codeOptions: true,
      options: [
        { text: 'Pickup p;', why: '`Pickup` has a pure virtual function, so it is abstract and cannot be instantiated.' },
        { text: 'HealthPack h;', correct: true, why: '`HealthPack` overrides the only pure virtual function, so it is concrete.' },
        { text: 'ArmorShard a;', why: '`ArmorShard` adds `glow()` but never overrides `apply`, so it inherits the pure virtual function and is **still abstract**.' },
        { text: 'Pickup* ptr = nullptr;', correct: true, why: 'Pointers (and references) to abstract classes are perfectly fine — that is how you use them polymorphically.' },
      ],
      explanation:
        'Abstractness is inherited: a derived class is concrete only once every pure virtual function along its chain has been overridden. The compiler error for `ArmorShard a;` even lists the pure virtual functions still missing. Pointers and references to abstract types are always allowed, because they refer to some concrete derived object.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Interfaces: a contract with no strings attached',
      blocks: [
        {
          type: 'p',
          text: 'Take abstraction to its limit: a class with **only** pure virtual functions and a virtual destructor — no data, no implementation. This is an [[interface]]. It describes *what* something can do and nothing about *how*. C++ has no `interface` keyword (unlike Java or C#); it is a convention, often marked with an `I` prefix — the same prefix Unreal uses.',
        },
        {
          type: 'code',
          title: 'IDamageable.h',
          code: `#include <vector>

class IDamageable {
public:
    virtual ~IDamageable() = default;
    virtual void applyDamage(int amount) = 0;
    virtual bool isAlive() const = 0;
};

// Works for ANYTHING damageable, whatever its base class:
void explode(const std::vector<IDamageable*>& targets,
             int power) {
    for (IDamageable* t : targets) {
        if (t->isAlive()) {
            t->applyDamage(power);
        }
    }
}`,
          annotations: [
            { lines: '3-8', text: 'The whole interface: two abilities and a virtual destructor. No members, no constructors, nothing to go out of date.' },
            { lines: '11-18', text: 'The explosion system depends only on this tiny contract. Barrels, enemies, players and destructible walls can all be damaged, even though they share no common base class.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why program to an interface?',
          text: 'Dependencies point at the smallest possible thing. The explosion code never includes `Enemy.h` or `Barrel.h`, so changing those classes never forces it to recompile, and adding a brand-new damageable type later requires no change to it at all. Interfaces also make code testable: a test can pass a tiny fake `IDamageable` that just records the damage it received.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'The destructor rule for base classes',
          text: 'The C++ Core Guidelines (C.35) put it this way: a base class destructor should be either **public and virtual**, or **protected and non-virtual**. Public and virtual means "you may delete through a pointer to me" — the usual choice. Protected means "you can\'t delete through me at all". Never public and non-virtual.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Implementing multiple interfaces',
      blocks: [
        {
          type: 'p',
          text: 'A class can inherit from several interfaces at once — this is [[multiple-inheritance]]. An explosive barrel can be both damaged and interacted with, so it implements both contracts and can be handed to either system:',
        },
        {
          type: 'code',
          title: 'interfaces.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <vector>

class IDamageable {
public:
    virtual ~IDamageable() = default;
    virtual void applyDamage(int amount) = 0;
};

class IInteractable {
public:
    virtual ~IInteractable() = default;
    virtual std::string prompt() const = 0;
};

class ExplosiveBarrel : public IDamageable, public IInteractable {
public:
    void applyDamage(int amount) override {
        hp_ -= amount;
        std::cout << "Barrel: " << (hp_ <= 0 ? "BOOM!" : "dented")
                  << '\\n';
    }
    std::string prompt() const override { return "E: roll barrel"; }
private:
    int hp_ = 30;
};

class Zombie : public IDamageable {
public:
    void applyDamage(int amount) override {
        std::cout << "Zombie takes " << amount << " (still coming)\\n";
    }
};

class Door : public IInteractable {
public:
    std::string prompt() const override { return "E: open door"; }
};

int main() {
    ExplosiveBarrel barrel;
    Zombie zombie;
    Door door;

    std::vector<IDamageable*> inBlastRadius{&barrel, &zombie};
    for (IDamageable* d : inBlastRadius) {
        d->applyDamage(50);
    }

    std::vector<IInteractable*> nearby{&door, &barrel};
    for (const IInteractable* i : nearby) {
        std::cout << "[" << i->prompt() << "]\\n";
    }
}`,
          output: 'Barrel: BOOM!\nZombie takes 50 (still coming)\n[E: open door]\n[E: roll barrel]',
          annotations: [
            { lines: 17, text: 'Two public bases, separated by a comma. An `ExplosiveBarrel` *is* damageable and *is* interactable.' },
            { lines: '19-24', text: 'It must override the pure virtual functions of **both** interfaces to be concrete.' },
            { lines: 46, text: 'The damage system sees the barrel only as an `IDamageable*`…' },
            { lines: 51, text: '…and the interaction system sees the very same barrel as an `IInteractable*`. Neither system knows the other exists.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Multiple inheritance of state is harder',
          text: 'Inheriting several **stateless interfaces** is safe and idiomatic. Inheriting several classes that carry data invites trouble — most famously the *diamond problem*: if `B` and `C` both derive from `A`, and `D` derives from both, a `D` contains **two** `A` subobjects unless you use *virtual inheritance*. Keep multiple inheritance for interfaces.',
        },
        {
          type: 'deepdive',
          title: 'Two vptrs and a pointer that moves',
          blocks: [
            {
              type: 'p',
              text: 'An `ExplosiveBarrel` contains two base subobjects, each with its own vptr, so it is 8 bytes larger than with one interface. Converting `&barrel` to `IInteractable*` yields an address pointing at the *second* subobject — a few bytes past the start of the object. The compiler applies this adjustment automatically (and undoes it in virtual calls), which is one reason you must never `reinterpret_cast` between class pointers in a hierarchy.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'fill',
      prompt: 'Complete the interface and its implementation so that a `Chest` can be deleted safely through an `IInteractable*` and the compiler verifies the override.',
      template: `class IInteractable {
public:
    ___ ~IInteractable() = default;
    virtual void interact() = ___;
};

class Chest : public IInteractable {
public:
    void interact() ___ { /* open the lid */ }
};`,
      blanks: [{ answers: ['virtual'] }, { answers: ['0'] }, { answers: ['override'] }],
      wordBank: ['virtual', '0', 'override', 'static', 'delete', 'default', 'inline'],
      explanation:
        'A virtual destructor makes `delete` through an `IInteractable*` run `~Chest()` too. `= 0` makes `interact` pure virtual, so `IInteractable` is an abstract interface. `override` makes the compiler confirm `Chest::interact` really implements it. `= delete` would remove the function entirely, and `= default` only works on special members such as destructors.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Virtual destructors: deleting through a base pointer',
      blocks: [
        {
          type: 'p',
          text: 'In real games, enemies are spawned with `new` (or, from next unit, smart pointers) and stored as base pointers. Eventually something does `delete e;` where `e` is an `Enemy*` pointing at a `Boss`. Which destructor runs? A destructor call is just a function call: if it is not virtual, it is statically bound to `~Enemy()`.',
        },
        {
          type: 'compare',
          left: {
            title: 'Non-virtual destructor',
            tone: 'bad',
            code: `class Enemy {
public:
    ~Enemy();       // NOT virtual
    virtual void attack() const;
};

Enemy* e = new Boss{};
delete e;  // undefined behavior!
// typically: only ~Enemy runs,
// Boss's members never destroyed`,
          },
          right: {
            title: 'Virtual destructor',
            tone: 'good',
            code: `class Enemy {
public:
    virtual ~Enemy() = default;
    virtual void attack() const;
};

Enemy* e = new Boss{};
delete e;  // ~Boss, its members,
           // then ~Enemy: correct`,
          },
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

struct LootTable {
    ~LootTable() { std::cout << "  LootTable freed\\n"; }
};

class Enemy {
public:
    virtual ~Enemy() { std::cout << "  ~Enemy\\n"; }
    virtual void attack() const {}
};

class Boss : public Enemy {
public:
    ~Boss() override { std::cout << "  ~Boss\\n"; }
    void attack() const override {}
private:
    LootTable loot_;
};

int main() {
    Enemy* e = new Boss{};
    std::cout << "Deleting through Enemy*:\\n";
    delete e;
}`,
          output: 'Deleting through Enemy*:\n  ~Boss\n  LootTable freed\n  ~Enemy',
          annotations: [
            { lines: 9, text: 'The one keyword that makes this correct. Every derived destructor overrides it automatically.' },
            { lines: 22, text: 'The static type is `Enemy*`, the dynamic type `Boss`.' },
            { lines: 24, text: '`delete` dispatches through the vtable to `~Boss()`, which then runs the normal destruction chain: `Boss`\'s body, its members, then `~Enemy()`. It also frees the right amount of memory for a `Boss`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Not just a leak — undefined behavior',
          text: 'Deleting a derived object through a base pointer whose destructor is not virtual is [[undefined-behavior]], full stop. The typical symptom is that only `~Enemy()` runs, so the boss\'s textures, sounds and loot table are never released — but with multiple inheritance the wrong address may be freed, corrupting the heap. GCC flags many cases with `-Wdelete-non-virtual-dtor` (part of `-Wall`): *"deleting object of polymorphic class type \'Enemy\' which has non-virtual destructor might cause undefined behavior"*.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why aren\'t destructors virtual automatically?',
          text: 'The zero-overhead principle again. A class that is never used polymorphically — a `Vector3`, a `Score` — should not get a vptr just in case. The rule of thumb is simple: **if a class has any virtual function, give it a virtual destructor.** `virtual ~Enemy() = default;` costs one line, and the class already has a vptr anyway. Smart pointers do not change this: a `std::unique_ptr<Enemy>` also deletes through an `Enemy*`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'bug',
      prompt: 'Dropping a `Railgun` through `dropWeapon` has undefined behavior: its charge cells are never freed. Tap the line that causes the problem.',
      code: `class IWeapon {
public:
    virtual void fire() = 0;
    ~IWeapon() = default;
};

class Railgun : public IWeapon {
public:
    void fire() override { /* ... */ }
private:
    std::vector<int> chargeCells_ = std::vector<int>(64);
};

void dropWeapon(IWeapon* w) {
    delete w;
}`,
      bugLines: [4],
      hint: 'Which destructor does `delete w` call, and how is that decided?',
      explanation:
        'Line 4 declares a **non-virtual** destructor in an interface that is meant to be used through pointers. So `delete w` on line 15 is statically bound to `~IWeapon()` and is undefined behavior: `~Railgun()` never runs and the vector inside it is never destroyed. The fix is `virtual ~IWeapon() = default;`. Line 15 is where the damage happens, but the bug lives in the interface — fixing it there fixes every caller at once.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Object slicing',
      blocks: [
        {
          type: 'p',
          text: 'Polymorphism only works through references and pointers. Pass a derived object **by value** to a parameter of base type and C++ quietly copies only the base part. The derived data is "sliced off", and the copy is a genuine base object — with the base\'s vtable. This is [[object-slicing]].',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <vector>

class Weapon {
public:
    virtual ~Weapon() = default;
    virtual std::string describe() const { return "plain weapon"; }
};

class FireSword : public Weapon {
public:
    std::string describe() const override {
        return "fire sword (+" + std::to_string(burn_) + " burn)";
    }
private:
    int burn_ = 15;
};

void showByValue(Weapon w) {
    std::cout << "by value:  " << w.describe() << '\\n';
}

void showByRef(const Weapon& w) {
    std::cout << "by ref:    " << w.describe() << '\\n';
}

int main() {
    FireSword sword;
    showByValue(sword);
    showByRef(sword);

    std::vector<Weapon> rack;
    rack.push_back(sword);
    std::cout << "in vector: " << rack[0].describe() << '\\n';
}`,
          output: 'by value:  plain weapon\nby ref:    fire sword (+15 burn)\nin vector: plain weapon',
          annotations: [
            { lines: 20, text: 'A `Weapon` parameter has room for exactly `sizeof(Weapon)` bytes. It is initialised by `Weapon`\'s copy constructor, which knows nothing about `burn_`.' },
            { lines: 24, text: 'A reference refers to the original object: nothing is copied, nothing is lost.' },
            { lines: 34, text: 'Containers of base objects slice too. This compiles without a single warning, which is what makes slicing dangerous.' },
          ],
        },
        {
          type: 'memory',
          caption: 'The original sword vs the sliced copy inside showByValue.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'sword.vptr', value: '→ vtable for FireSword', type: 'hidden', highlight: true },
                { name: 'sword.burn_', value: '15', type: 'int' },
              ],
            },
            {
              label: 'Stack — showByValue()',
              kind: 'stack',
              cells: [
                { name: 'w.vptr', value: '→ vtable for Weapon', type: 'hidden', highlight: true },
                { name: '(no burn_)', value: '— sliced off —' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'How to avoid slicing',
          text: 'Pass polymorphic objects by `const&` (or `&`, or pointer), and store pointers in containers, never base objects. Many teams go further and make polymorphic base classes **non-copyable**, so slicing becomes a compile error (Core Guidelines C.67). You will learn how to forbid copying with `= delete` in the next unit.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>
#include <vector>

struct Enemy {
    virtual ~Enemy() = default;
    virtual int xp() const { return 10; }
};

struct Dragon : Enemy {
    int xp() const override { return 500; }
};

int main() {
    Dragon smaug;
    std::vector<Enemy> slain{smaug};
    const Enemy& ref = smaug;
    std::cout << slain[0].xp() + ref.xp() << '\\n';
}`,
      options: [
        { text: '`1000`', why: 'That assumes the vector holds a dragon. A `std::vector<Enemy>` stores `Enemy` objects, so the dragon was sliced on the way in.' },
        { text: '`20`', why: '`ref` is a reference to the real `smaug`, so the virtual call reaches `Dragon::xp` and returns 500.' },
        { text: '`510`', correct: true, why: 'The vector element is a sliced copy (an `Enemy`, worth 10 XP); the reference still refers to the dragon (500 XP).' },
        { text: 'It does not compile: a `Dragon` cannot be stored in a `std::vector<Enemy>`', why: 'It compiles silently — a `Dragon` converts to an `Enemy` by copying the base part. That silence is exactly why slicing is a trap.' },
      ],
      explanation:
        '`std::vector<Enemy> slain{smaug}` copy-constructs an `Enemy` from the `Enemy` part of `smaug`; that new object\'s dynamic type is `Enemy`. The reference binds directly to `smaug`, whose dynamic type is `Dragon`. To store dragons polymorphically, the vector must hold pointers.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'truefalse',
      prompt: 'Passing a `FireSword` to a function whose parameter is `const Weapon&` slices it.',
      answer: false,
      explanation:
        'Slicing happens only when a new base **object** is created from a derived one — by-value parameters, by-value containers, assignment into a base variable. A reference creates no new object: it simply refers to the existing `FireSword`, so the full object and its vptr are intact and virtual calls reach `FireSword`\'s overrides.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'dynamic_cast: "are you really a Boss?"',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes you hold an `Enemy&` and need something only a `Boss` has. Converting from base to derived is a *downcast*. [[static-cast|static_cast]] will do it without checking — and if the object is not actually a `Boss`, using the result is undefined behavior. [[dynamic-cast|dynamic_cast]] checks at run time and tells you if it failed:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

class Enemy {
public:
    virtual ~Enemy() = default;
    virtual void takeHit() { std::cout << "ouch\\n"; }
};

class Boss : public Enemy {
public:
    void enrage() { std::cout << "Boss enters phase two!\\n"; }
};

void onHit(Enemy& e) {
    e.takeHit();
    if (Boss* boss = dynamic_cast<Boss*>(&e)) {
        boss->enrage();          // only reached for bosses
    }
}

int main() {
    Enemy grunt;
    Boss warlord;
    onHit(grunt);
    onHit(warlord);
}`,
          output: 'ouch\nouch\nBoss enters phase two!',
          annotations: [
            { lines: 5, text: '`dynamic_cast` needs a *polymorphic* class — at least one virtual function — because it finds the object\'s real type through the vtable, using [[rtti]].' },
            { lines: 16, text: 'If `e` really is a `Boss` (or something derived from `Boss`), you get a valid `Boss*`; otherwise `nullptr`. Declaring the pointer inside the `if` keeps it scoped to the branch where it is valid.' },
          ],
        },
        {
          type: 'table',
          headers: ['Question', '`static_cast<Boss*>(p)`', '`dynamic_cast<Boss*>(p)`'],
          rows: [
            ['Checks the real type?', 'No', 'Yes, at run time'],
            ['If `p` is not a Boss', 'Undefined behavior when used', '`nullptr` (casting a reference throws `std::bad_cast`)'],
            ['Requirements', 'Related types', 'Polymorphic source type, RTTI enabled'],
            ['Cost', 'Free (maybe a pointer adjustment)', 'A run-time type check'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a downcast is often a design smell',
          text: 'Code that keeps asking "are you a Boss? are you a Dragon?" has rebuilt the type switch that virtual functions were meant to replace — and every new enemy type means editing it. Usually a virtual function is better: give `Enemy` a `virtual void onHitReaction()` that bosses override to enrage. Legitimate uses remain, such as asking whether an object supports an *optional* interface: `dynamic_cast<IInteractable*>(thing)`.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Cast<T> instead of dynamic_cast',
          text: 'Unreal modules compile with RTTI **disabled** by default, so `dynamic_cast` is not used on `UObject`s. Instead, Unreal provides [[ue-cast|Cast<T>()]], built on its own reflection system: `if (ABoss* Boss = Cast<ABoss>(HitActor)) { ... }`. It returns `nullptr` on failure, exactly like `dynamic_cast` with pointers, and is fast.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: '`Enemy` is polymorphic, and `Goblin` and `Boss` both derive from it. `e` is an `Enemy*` pointing at a `Goblin`. What does `dynamic_cast<Boss*>(e)` return?',
      options: [
        { text: 'It throws `std::bad_cast`', why: 'Only a failed cast to a **reference** type throws. A failed pointer cast returns `nullptr` instead.' },
        { text: '`nullptr`', correct: true, why: 'The run-time check sees that the object is a `Goblin`, not a `Boss`, and signals failure with a null pointer you can test.' },
        { text: 'The goblin\'s address, now typed as `Boss*`', why: 'That is what an unchecked `static_cast` would give you — and calling `Boss` functions through it would be undefined behavior. `dynamic_cast` exists to prevent exactly this.' },
        { text: 'Nothing — it is a compile error because a `Goblin` can never be a `Boss`', why: 'The compiler only sees an `Enemy*`, which might point at a `Boss`. The check therefore happens at run time.' },
      ],
      explanation:
        '`dynamic_cast` uses the type information reachable from the object\'s vptr to verify the conversion. With pointers, failure is reported as `nullptr`, which is why the idiom is `if (Boss* b = dynamic_cast<Boss*>(e))`. With references there is no null value, so failure throws `std::bad_cast` instead.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Preview: interfaces in Unreal',
      blocks: [
        {
          type: 'p',
          text: 'Unreal has interfaces too, but they are declared as a **pair** of classes: a `UInterface`-derived `U` class that the reflection system can see, and an `I` class holding the actual functions, which your actors inherit. The Unreal course covers them fully; here is the shape, so you can recognise every C++ idea in it:',
        },
        {
          type: 'code',
          title: 'Interactable.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "Interactable.generated.h"

UINTERFACE(MinimalAPI)
class UInteractable : public UInterface {
    GENERATED_BODY()
};

class MYGAME_API IInteractable {
    GENERATED_BODY()

public:
    virtual void Interact(AActor* InstigatorActor) = 0;
};`,
          annotations: [
            { lines: '7-10', text: 'The [[uinterface|UINTERFACE]] half: an empty `UObject`-side class that gives the reflection system (and Blueprints) a description of the interface.' },
            { lines: '12-17', text: 'The `I` half: the actual contract, written as a plain C++ interface with a pure virtual function — exactly what you built in this lesson.' },
          ],
        },
        {
          type: 'code',
          title: 'Chest.h (excerpt) and a caller',
          code: `UCLASS()
class MYGAME_API AChest : public AActor, public IInteractable {
    GENERATED_BODY()

public:
    virtual void Interact(AActor* InstigatorActor) override;
};

// Somewhere in the player's interaction code:
if (IInteractable* Target = Cast<IInteractable>(HitActor)) {
    Target->Interact(this);
}`,
          annotations: [
            { lines: 2, text: 'Multiple inheritance: one `UObject`-based class (`AActor`) plus an interface — the only kind of multiple inheritance Unreal\'s reflection system allows.' },
            { lines: 6, text: '`virtual` + `override`, just like standard C++.' },
            { lines: '10-12', text: 'Ask whether an arbitrary actor supports the interface, then call through it. The same idea as `dynamic_cast<IInteractable*>`, using Unreal\'s `Cast`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Why can\'t a UCLASS just use = 0?',
          text: 'The engine must be able to construct an instance of **every** `UCLASS` — its Class Default Object ([[cdo|CDO]]) — and C++ forbids instantiating abstract classes. So abstract `UObject` classes are marked `UCLASS(Abstract)` (which stops the editor from spawning them) and use the `PURE_VIRTUAL` macro, which supplies a body that stops the program with a fatal error if it is ever called: `virtual void Fire() PURE_VIRTUAL(AWeaponBase::Fire, );`. Interface `I` classes are not `UObject`s, so they can use real `= 0` functions.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'Why does an Unreal interface consist of two classes, `UInteractable` and `IInteractable`?',
      options: [
        { text: '`UInteractable` holds the interface\'s data members and `IInteractable` holds its functions', why: 'Interfaces hold no data at all. The `U` class is empty apart from `GENERATED_BODY()`.' },
        { text: 'C++ does not support multiple inheritance, so Unreal simulates it with two classes', why: 'C++ supports multiple inheritance fine — `AChest : public AActor, public IInteractable` is ordinary C++. The restriction comes from Unreal\'s reflection system.' },
        { text: 'One is compiled into editor builds and the other into shipping builds', why: 'Both exist in every build configuration; the split is about reflection, not build types.' },
        { text: '`UInteractable` gives the reflection system a class describing the interface; `IInteractable` is a plain C++ class that actors inherit alongside their single `UObject` base', correct: true, why: 'Reflection needs a `UObject`-side class to describe the interface (for Blueprints, `Implements<>()` and so on), but an actor can only have one `UObject` base — so the functions live in a non-`UObject` `I` class mixed in through multiple inheritance.' },
      ],
      explanation:
        'Unreal\'s reflection system only understands `UObject`-derived classes and only supports single inheritance among them. The `U` half satisfies reflection; the `I` half is a standard C++ interface that can be inherited in addition to `AActor`. Everything inside the `I` class — pure virtual functions, `override`, calling through a base pointer — is the C++ you learned in this unit.',
    },
  ],
  takeaways: [
    'A pure virtual function (`= 0`) has no required implementation; a class with any is abstract and cannot be instantiated, only pointed or referred to.',
    'A derived class is concrete only after it overrides every pure virtual function it inherits.',
    'An interface is an abstract class with only pure virtual functions and a virtual destructor; a class may implement several of them.',
    'If a class has any virtual function, give it a virtual destructor — deleting through a base pointer without one is undefined behavior.',
    'Passing or storing a derived object by value as a base slices it: derived data is lost and the copy is a plain base object.',
    '`dynamic_cast<D*>` checks the real type at run time and returns `nullptr` on failure; prefer virtual functions to repeated downcasts.',
    'Unreal interfaces are a `UINTERFACE` (`U` class) plus an `I` class; Unreal uses `Cast<T>` instead of `dynamic_cast`.',
  ],
  reading: [
    {
      title: 'Abstract class',
      url: 'https://en.cppreference.com/w/cpp/language/abstract_class',
      source: 'cppreference',
      note: 'The rules for pure virtual functions and abstract classes, including pure virtual destructors.',
    },
    {
      title: 'dynamic_cast conversion',
      url: 'https://en.cppreference.com/w/cpp/language/dynamic_cast',
      source: 'cppreference',
      note: 'Every case dynamic_cast handles, including cross-casts between interfaces.',
    },
    {
      title: 'Virtual destructors, virtual assignment, and overriding virtualization',
      url: 'https://www.learncpp.com/cpp-tutorial/virtual-destructors-virtual-assignment-and-overriding-virtualization/',
      source: 'learncpp',
      note: 'More examples of what goes wrong without a virtual destructor.',
    },
    {
      title: 'C++ Core Guidelines: C.35 and C.67',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rc-dtor-virtual',
      source: 'core-guidelines',
      note: 'Why base destructors must be public and virtual or protected and non-virtual; C.67 covers suppressing copies to avoid slicing.',
    },
    {
      title: 'Interfaces in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/interfaces-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s guide to UINTERFACE, including Blueprint-implementable interfaces.',
    },
  ],
};
