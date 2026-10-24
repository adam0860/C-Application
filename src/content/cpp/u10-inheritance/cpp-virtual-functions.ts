import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-virtual-functions',
  title: 'Virtual Functions and override',
  summary: 'Make one game loop drive goblins, dragons and bosses alike: static vs dynamic binding, virtual, override, final and polymorphic collections.',
  minutes: 17,
  objectives: [
    'Explain the difference between static and dynamic binding, and predict which function a call reaches',
    'Declare virtual functions and override them safely with `override`',
    'Call derived behaviour through base-class pointers and references, and call a base version explicitly',
    'Use `final` to stop further overriding or derivation, and explain how it can help performance',
    'Build a polymorphic collection of game entities and process it in a single loop',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The problem: one loop, many kinds of enemy',
      blocks: [
        {
          type: 'p',
          text: 'A game\'s turn logic wants to say "every enemy: attack!" without caring whether each one is a goblin or a dragon. Inheritance lets the function accept any enemy through an `Enemy&`. But, as the last lesson hinted, an ordinary member function call does not do what you want:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

class Enemy {
public:
    void attack() const { std::cout << "Enemy attacks\\n"; }
};

class Goblin : public Enemy {
public:
    void attack() const { std::cout << "Goblin stabs!\\n"; }
};

class Dragon : public Enemy {
public:
    void attack() const { std::cout << "Dragon breathes fire!\\n"; }
};

void enemyTurn(const Enemy& e) {
    e.attack();
}

int main() {
    Goblin grub;
    Dragon smaug;
    enemyTurn(grub);
    enemyTurn(smaug);
}`,
          output: 'Enemy attacks\nEnemy attacks',
          annotations: [
            { lines: '18-20', text: '`enemyTurn` is compiled **once**. At that moment the compiler only knows that `e` refers to *some* `Enemy`, so it hard-wires a call to `Enemy::attack`.' },
            { lines: '25-26', text: 'Passing a goblin or a dragon changes nothing: the decision was already made when `enemyTurn` was compiled.' },
          ],
        },
        {
          type: 'definition',
          term: 'Static type vs dynamic type',
          text: 'Inside `enemyTurn`, the **static type** of `e` is `const Enemy&` — what the code says. The **dynamic type** is the type of the object actually there at run time — `Goblin` on the first call, `Dragon` on the second. See [[dynamic-type]].',
        },
        {
          type: 'p',
          text: 'Ordinary calls use [[static-binding]]: the function is chosen at [[compile-time]] from the static type. It is fast and predictable, but it means base-class code can never reach derived-class behaviour. To fix that, we need the choice to follow the **dynamic** type instead.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'virtual: ask the object, not the reference',
      blocks: [
        {
          type: 'p',
          text: 'Add one keyword to the base class and the behaviour changes completely. A [[virtual-function]] is chosen at [[runtime]] from the object\'s dynamic type — this is [[dynamic-dispatch]], also called dynamic binding. Code that works through a base reference now gets each object\'s own behaviour: that is [[polymorphism]] ("many forms").',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

class Enemy {
public:
    virtual void attack() const {
        std::cout << "Enemy attacks\\n";
    }
};

class Goblin : public Enemy {
public:
    void attack() const { std::cout << "Goblin stabs!\\n"; }
};

class Dragon : public Enemy {
public:
    void attack() const { std::cout << "Dragon breathes fire!\\n"; }
};

class Slime : public Enemy {};   // does not override attack

void enemyTurn(const Enemy& e) {
    e.attack();   // now decided at run time
}

int main() {
    Goblin grub;
    Dragon smaug;
    Slime blob;
    enemyTurn(grub);
    enemyTurn(smaug);
    enemyTurn(blob);
}`,
          output: 'Goblin stabs!\nDragon breathes fire!\nEnemy attacks',
          annotations: [
            { lines: 5, text: '`virtual` goes on the **base** declaration. It means: "derived classes may replace this, and calls through a base reference or pointer must use the replacement".' },
            { lines: 12, text: 'Same name, same parameters, same `const`: this **overrides** `Enemy::attack`. It is automatically virtual too — once virtual, always virtual down the hierarchy.' },
            { lines: 20, text: 'A class that does not override simply inherits the base version.' },
            { lines: 23, text: 'Identical source to before, but the compiler now emits code that looks up the right function using the object itself. The next lesson shows exactly how.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Dispatch only happens through references and pointers',
          text: 'A variable of type `Enemy` *is* an `Enemy` — there is nothing to look up. `Enemy copy = smaug;` creates a brand-new `Enemy` that only copies the enemy part of the dragon (this is called *slicing*, covered later in this unit), and `copy.attack()` prints "Enemy attacks". Polymorphism needs `Enemy&` or `Enemy*` pointing at the real object.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why do you have to ask for it?',
          text: 'Dynamic dispatch has a small cost: each object carries a hidden pointer, and the call goes through an extra lookup that usually prevents inlining. C++ follows the [[zero-cost-abstraction|zero-overhead principle]] — you don\'t pay for what you don\'t use — so functions are non-virtual unless you say otherwise. Java makes every method virtual by default; C# made the same choice as C++.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Where "virtual" comes from',
          text: 'Simula 67, the first object-oriented language, had "virtual procedures". Bjarne Stroustrup used Simula during his PhD and brought the idea — and the keyword — into "C with Classes", the language that became C++.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'truefalse',
      prompt: '`Enemy::attack()` is declared `virtual`. `Dragon` derives from `Enemy` and declares `void attack() const` with the same signature, without writing `virtual`. `Dragon::attack` still overrides `Enemy::attack`, and calls through an `Enemy&` reach it.',
      answer: true,
      explanation:
        'A function that matches a base virtual function overrides it and is itself virtual, whether or not you repeat the keyword — "once virtual, always virtual". That is also why repeating `virtual` in derived classes adds nothing. What you *should* write in derived classes is `override`, which asks the compiler to verify that an override really happens — coming up next.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>

struct Weapon {
    virtual void fire() const { std::cout << "click "; }
};

struct Rifle : Weapon {
    void fire() const { std::cout << "bang "; }
};

int main() {
    Rifle rifle;
    Weapon& ref = rifle;
    Weapon* ptr = &rifle;
    Weapon copy = rifle;
    ref.fire();
    ptr->fire();
    copy.fire();
}`,
      options: [
        { text: '`bang bang bang`', why: '`copy` is not a rifle. Initialising a `Weapon` from a `Rifle` creates a new, plain `Weapon` object — only the weapon part is copied.' },
        { text: '`click click click`', why: '`fire` is virtual, so calls through `ref` and `ptr` follow the dynamic type, which is `Rifle`.' },
        { text: '`bang click click`', why: 'Pointers dispatch exactly like references: `ptr` points at the rifle, so `ptr->fire()` reaches `Rifle::fire`.' },
        { text: '`bang bang click`', correct: true, why: 'The reference and the pointer both refer to the real `Rifle` object, so dispatch finds `Rifle::fire`. `copy` is a separate `Weapon` object whose dynamic type is `Weapon`.' },
      ],
      explanation:
        'Virtual dispatch looks at the type of the object a reference or pointer refers to. `ref` and `ptr` refer to `rifle` itself. `copy` is a different object: a `Weapon` built by copying only the base part of the rifle (slicing). Its dynamic type and static type are both `Weapon`, so it says "click".',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'override: let the compiler check your work',
      blocks: [
        {
          type: 'p',
          text: 'Overriding requires an **exact** match: same name, same parameter types, same `const`-ness. Get any of it slightly wrong and you have not overridden anything — you have declared a brand-new function that happens to share a name. The code still compiles, and calls through the base quietly run the base version. These bugs can survive for months.',
        },
        {
          type: 'compare',
          left: {
            title: 'Silent bug',
            tone: 'bad',
            code: `class FlameSword : public Weapon {
public:
    // base: virtual int damage() const
    int damage() { return 35; }
    // forgot const: a NEW function.
    // Through a Weapon&, damage()
    // still returns 10.
};`,
          },
          right: {
            title: 'Caught at compile time',
            tone: 'good',
            code: `class FlameSword : public Weapon {
public:
    int damage() override {
        return 35;
    }
    // error: 'int FlameSword::damage()'
    // marked 'override', but does
    // not override
};`,
          },
        },
        {
          type: 'p',
          text: 'Writing [[override]] after the parameter list states your intent: "this must replace a virtual function from a base class". If it does not, compilation fails. Add the missing `const` and the error disappears — and so does the bug.',
        },
        {
          type: 'list',
          items: [
            '**Name** must match exactly — `Attack` does not override `attack`.',
            '**Parameter types** must match — `takeDamage(float)` does not override `takeDamage(int)`.',
            '**Qualifiers** must match — `const` (and `&`/`&&` qualifiers, if any).',
            '**Return type** must be the same, or a pointer/reference to a derived class (a *covariant* return type).',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why override was added in C++11',
          text: 'Before C++11 there was no way to say "I mean to override". Renaming a base function or changing a parameter type would silently turn dozens of overrides into unrelated functions across a code base. GCC 13 now warns about some of these cases under `-Wall` (`-Woverloaded-virtual`), but a warning about a misspelled name is impossible — the compiler cannot guess what you meant. Only `override` turns intent into a hard, portable error.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'House style',
          text: 'Write `virtual` only on the first declaration in the base class, and `override` on every overriding function. Do not write both — the C++ Core Guidelines (C.128) recommend exactly one of `virtual`, `override` or `final` per declaration. Epic\'s coding standard for Unreal also asks for `override` on overrides.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'bug',
      prompt: '`hitFor(flameSword)` returns `10` instead of `35`. The code compiles. Tap the line at fault.',
      code: `class Weapon {
public:
    virtual int damage() const { return 10; }
};

class FlameSword : public Weapon {
public:
    int damage() { return 35; }
};

int hitFor(const Weapon& w) {
    return w.damage();
}`,
      bugLines: [8],
      hint: 'Compare the two `damage` declarations character by character.',
      explanation:
        'Line 8 is missing `const`, so `FlameSword::damage()` has a different signature and does **not** override `Weapon::damage() const`. Through the `const Weapon&` in `hitFor`, only the const base function is even callable, so it returns 10. Writing `int damage() const override` fixes it — and had the author written `override` from the start, the compiler would have rejected line 8 immediately.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Extending behaviour: base calls and calls through this',
      blocks: [
        {
          type: 'p',
          text: 'Two patterns make virtual functions really useful. First, an override can **extend** the base version instead of replacing it, by calling it with a qualified name. Second, virtual calls made **inside** base-class member functions also dispatch, so a base class can define the overall algorithm and let derived classes fill in the steps.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

class Enemy {
public:
    void takeTurn() const {
        std::cout << "[turn] ";
        act();                      // virtual call via this
    }
    virtual void takeDamage(int amount) {
        health_ -= amount;
        std::cout << "took " << amount << ", hp " << health_ << '\\n';
    }

protected:
    virtual void act() const { std::cout << "waits\\n"; }

private:
    int health_ = 100;
};

class Boss : public Enemy {
public:
    void takeDamage(int amount) override {
        std::cout << "(armor) ";
        Enemy::takeDamage(amount / 2);  // reuse the base logic
    }

protected:
    void act() const override { std::cout << "summons minions\\n"; }
};

int main() {
    Boss lich;
    Enemy& e = lich;
    e.takeTurn();
    e.takeDamage(40);
}`,
          output: '[turn] summons minions\n(armor) took 20, hp 80',
          annotations: [
            { lines: '5-8', text: '`takeTurn` is **not** virtual: every enemy\'s turn has the same shape. But inside it, `act()` means `this->act()`, and that call dispatches on the dynamic type of `*this` — a `Boss` here.' },
            { lines: 15, text: 'A protected virtual function: a customisation point for derived classes that outside code cannot call directly.' },
            { lines: 25, text: 'A **qualified** call `Enemy::takeDamage` switches dispatch off and runs exactly that version. Writing plain `takeDamage(amount / 2)` here would call `Boss::takeDamage` again — infinite recursion.' },
            { lines: 29, text: 'An override may be protected or private. Access is checked against the static type at the call site — here inside `Enemy::takeTurn`, where `act` is accessible.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Super:: is exactly this pattern',
          text: 'Every Unreal override of `BeginPlay`, `Tick` or `EndPlay` starts with `Super::BeginPlay();` (and so on). `Super` is an alias for the direct base class, so this is the same qualified, non-dispatching call as `Enemy::takeDamage(...)`. Forgetting it is a classic Unreal bug: the parent\'s setup silently never happens — for example, components never begin play.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'The base pointer only sees the base interface',
          text: 'Through an `Enemy&` you can call only what `Enemy` declares, even if the object is a `Boss` with an extra `enrage()` function. Dispatch chooses *which version* of an `Enemy` function runs; it does not add new functions. Getting from an `Enemy&` to the `Boss` itself requires a checked cast, covered in the Abstract Classes lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: 'Complete the code so that `onHit` dispatches dynamically, the compiler verifies the override, and bosses run the normal hit logic with half damage.',
      template: `class Enemy {
public:
    ___ void onHit(int dmg) { hp -= dmg; }
    int hp = 100;
};

class Boss : public Enemy {
public:
    void onHit(int dmg) ___ {
        ___::onHit(dmg / 2);   // bosses take half
    }
};`,
      blanks: [{ answers: ['virtual'] }, { answers: ['override'] }, { answers: ['Enemy'] }],
      wordBank: ['virtual', 'override', 'Enemy', 'Boss', 'final', 'static', 'const'],
      explanation:
        '`virtual` in the base enables dynamic dispatch. `override` makes the compiler confirm `Boss::onHit` really overrides something. `Enemy::onHit(...)` is a qualified call that runs the base version without dispatching. `Boss::onHit` would call itself forever, and `const` would change the signature so it no longer overrides (and could not modify `hp`).',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'final: closing the door',
      blocks: [
        {
          type: 'p',
          text: '[[final]] is the opposite of `virtual`: it stops further customisation. On a virtual function, it means "no class below this one may override it". On a class, it means "no class may derive from this one".',
        },
        {
          type: 'code',
          code: `class Enemy {
public:
    virtual ~Enemy() = default;
    virtual void attack() const;
    virtual void die();
};

class Dragon : public Enemy {
public:
    void attack() const override;
    void die() final;          // last override of die()
};

class ElderDragon final : public Dragon {
public:
    void attack() const override;   // fine
    // void die() override;  // error: die() is final
};

// class AncientDragon : public ElderDragon {};
// error: cannot derive from 'final' base 'ElderDragon'`,
          annotations: [
            { lines: 11, text: '`final` on a function implies it overrides something. Dragons award loot and XP in `die()`, and the designer wants no subclass to skip that bookkeeping.' },
            { lines: 14, text: '`final` after the class name seals the class itself. Its functions can still override functions from *its* bases.' },
            { lines: 17, text: 'Overriding a `final` function is a compile error.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'final enables devirtualization',
          text: 'If you call `attack()` on an `ElderDragon&`, the compiler knows no class can override it further, so it can call `ElderDragon::attack` **directly** — and even inline it — instead of looking it up at run time. This optimization is called [[devirtualization]]. Marking leaf classes `final` costs nothing and sometimes makes hot calls faster.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Not quite keywords',
          text: '`override` and `final` arrived in C++11 as *identifiers with special meaning*, not reserved keywords. They only act as keywords in these positions, so older code with a variable named `final` still compiles.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'truefalse',
      prompt: 'Writing `void die() final;` inside class `Dragon` also prevents other classes from deriving from `Dragon`.',
      answer: false,
      explanation:
        '`final` on a member function only stops that function from being overridden further down; classes can still derive from `Dragon` and override its other virtual functions. To forbid derivation entirely, put `final` after the class name: `class Dragon final : public Enemy`. The two uses are independent.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'A polymorphic collection',
      blocks: [
        {
          type: 'p',
          text: 'Now the payoff. A single container holds pointers to many kinds of enemy, and a single loop processes them all. Adding a new enemy type later requires **no change** to the loop.',
        },
        {
          type: 'code',
          title: 'wave.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <vector>

class Enemy {
public:
    explicit Enemy(const std::string& name) : name_{name} {}
    virtual ~Enemy() = default;

    virtual int attackDamage() const { return 5; }
    virtual std::string battleCry() const { return "..."; }

    void attack() const {
        std::cout << name_ << ": \\"" << battleCry() << "\\" ("
                  << attackDamage() << " dmg)\\n";
    }

private:
    std::string name_;
};

class Goblin : public Enemy {
public:
    Goblin() : Enemy{"Goblin"} {}
    std::string battleCry() const override { return "Shiny!"; }
};

class Dragon : public Enemy {
public:
    Dragon() : Enemy{"Dragon"} {}
    int attackDamage() const override { return 80; }
    std::string battleCry() const override { return "BURN!"; }
};

class Skeleton : public Enemy {
public:
    Skeleton() : Enemy{"Skeleton"} {}
};

int main() {
    Goblin grub;
    Dragon smaug;
    Skeleton bones;

    std::vector<Enemy*> wave{&grub, &smaug, &bones};

    int total = 0;
    for (const Enemy* e : wave) {
        e->attack();
        total += e->attackDamage();
    }
    std::cout << "Total incoming damage: " << total << '\\n';
}`,
          output: 'Goblin: "Shiny!" (5 dmg)\nDragon: "BURN!" (80 dmg)\nSkeleton: "..." (5 dmg)\nTotal incoming damage: 90',
          annotations: [
            { lines: 8, text: 'A polymorphic base class should have a **virtual destructor**. Nothing here is deleted through an `Enemy*`, but you will see exactly why it matters in the Abstract Classes lesson.' },
            { lines: '13-16', text: 'Non-virtual `attack()` builds its message from two virtual calls, so each enemy customises only the parts it cares about.' },
            { lines: 37, text: '`Skeleton` overrides nothing and gets the defaults — no code needed.' },
            { lines: 45, text: 'A vector of **pointers**. Every element is the same size (one address) no matter how big the object it points at is.' },
            { lines: '48-51', text: 'One loop, three behaviours. `e->attack()` and `e->attackDamage()` each dispatch on the object `e` points at.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not std::vector<Enemy>?',
          text: 'A `std::vector<Enemy>` stores actual `Enemy` objects, each exactly `sizeof(Enemy)` bytes. A `Dragon` may have extra members that simply do not fit, so pushing one in copies only its `Enemy` part — the dragon-ness is lost. Polymorphism needs indirection: pointers or references to objects that live elsewhere.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Who owns these enemies?',
          text: 'Here the enemies live on `main`\'s stack and the vector merely points at them, so nothing needs deleting. In real games, enemies are spawned and despawned dynamically. The next unit introduces `std::vector<std::unique_ptr<Enemy>>`, a container that owns its polymorphic objects and deletes them automatically.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'This is how the engine runs your code',
          text: 'Unreal knows nothing about your `AEnemyCharacter` when the engine is compiled. It keeps every actor as an `AActor*` and, each frame, calls `Actor->Tick(DeltaSeconds)`. Because `Tick` is virtual, that call lands in **your** override. `BeginPlay`, `EndPlay`, `TakeDamage` and hundreds of other engine hooks work the same way.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>
#include <vector>

struct Enemy {
    virtual ~Enemy() = default;
    virtual char symbol() const { return 'E'; }
};

struct Orc : Enemy {
    char symbol() const override { return 'O'; }
};

struct OrcChief : Orc {};
struct Bat : Enemy {};

int main() {
    Orc orc;
    OrcChief chief;
    Bat bat;
    std::vector<Enemy*> wave{&orc, &chief, &bat};
    for (const Enemy* e : wave) {
        std::cout << e->symbol();
    }
    std::cout << '\\n';
}`,
      options: [
        { text: '`OEE`', why: '`OrcChief` inherits `Orc::symbol`. Dispatch picks the most-derived override in the object\'s class chain, which for a chief is `Orc`\'s.' },
        { text: '`OOE`', correct: true, why: 'The orc uses its override, the chief inherits the orc\'s override, and the bat has none of its own so it falls back to `Enemy::symbol`.' },
        { text: '`EEE`', why: 'That would be static binding. `symbol` is virtual, so calls through `Enemy*` follow each object\'s dynamic type.' },
        { text: 'It does not compile: `OrcChief` and `Bat` do not define `symbol()`', why: 'Overriding is optional for ordinary virtual functions. A class that does not override inherits the nearest version above it.' },
      ],
      explanation:
        'For each object, dynamic dispatch runs the **final overrider**: the most-derived version of the function in that object\'s class chain. For `OrcChief` the chain is `OrcChief` → `Orc` → `Enemy`, and the first override found walking up is `Orc::symbol`. For `Bat` it is `Enemy::symbol`.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Rules and gotchas',
      blocks: [
        {
          type: 'p',
          text: 'A few things cannot be virtual, and one thing behaves surprisingly. Each rule follows from the fact that dispatch needs an existing object whose dynamic type can be consulted:',
        },
        {
          type: 'table',
          headers: ['Can it be virtual?', 'Answer', 'Why'],
          rows: [
            ['Ordinary member function', 'Yes', 'The normal case.'],
            ['Destructor', 'Yes — and it should be in polymorphic bases', 'So `delete` through a base pointer destroys the whole object (Abstract Classes lesson).'],
            ['Constructor', 'No', 'Before construction there is no object and no dynamic type to consult — you must name the exact type you are creating. Use a virtual `clone()` or a factory function instead.'],
            ['`static` member function', 'No', 'It has no `this`, so there is no object whose type could decide.'],
            ['Member function template', 'No', 'Each class needs a fixed, finite list of virtual functions, but a template can be instantiated for unlimited types.'],
          ],
        },
        {
          type: 'p',
          text: 'The surprise: **default arguments are bound statically**. The function body is chosen from the dynamic type, but the default value comes from the static type at the call site:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

struct Enemy {
    virtual ~Enemy() = default;
    virtual void shout(int volume = 1) const {
        std::cout << "Enemy shouts at " << volume << '\\n';
    }
};

struct Ogre : Enemy {
    void shout(int volume = 10) const override {
        std::cout << "Ogre shouts at " << volume << '\\n';
    }
};

int main() {
    Ogre ogre;
    const Enemy& e = ogre;
    ogre.shout();
    e.shout();
}`,
          output: 'Ogre shouts at 10\nOgre shouts at 1',
          annotations: [
            { lines: 19, text: 'Static type `Ogre`: default `10`, body `Ogre::shout`.' },
            { lines: 20, text: 'Static type `Enemy`: default `1` is filled in at compile time, then the call dispatches to `Ogre::shout`. A mix of both classes!' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Avoid the trap',
          text: 'Never give an override a different default argument from the base (Core Guidelines C.140). Safer still: avoid default arguments on virtual functions altogether, or provide a non-virtual wrapper with the default that calls the virtual function.',
        },
        {
          type: 'deepdive',
          title: 'Covariant return types',
          blocks: [
            {
              type: 'p',
              text: 'An override may return a pointer or reference to a *more derived* type than the base declared. This is how the "virtual constructor" idiom works:',
            },
            {
              type: 'code',
              code: `struct Enemy {
    virtual ~Enemy() = default;
    virtual Enemy* clone() const = 0;
};

struct Dragon : Enemy {
    Dragon* clone() const override {
        return new Dragon{*this};  // copy myself
    }
};`,
              annotations: [
                { lines: 7, text: 'Returns `Dragon*` instead of `Enemy*` — still a valid override. Callers holding a `Dragon` get a `Dragon*` back without a cast. (`= 0` and smart-pointer versions come later in this unit and the next.)' },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which of these can be declared `virtual`? Select all that apply.',
      options: [
        { text: 'A destructor', correct: true, why: 'Virtual destructors are not just allowed but essential for classes deleted through base pointers.' },
        { text: 'A constructor', why: 'There is no object yet, so there is no dynamic type to dispatch on. You always name the exact type you construct.' },
        { text: 'A `const` member function such as `int damage() const`', correct: true, why: '`const` is part of the signature, and const member functions can be virtual like any other. Overrides must also be `const`.' },
        { text: 'A `static` member function', why: 'Static members have no `this` and are called without an object, so there is nothing to dispatch on.' },
        { text: 'A protected member function', correct: true, why: 'Access level and virtual-ness are independent. Protected virtuals are a common way to offer customisation points to derived classes only.' },
      ],
      explanation:
        'Virtual dispatch needs an existing object whose dynamic type decides which function runs. Anything that operates on an object — ordinary, `const`, protected or private member functions, and destructors — can be virtual. Constructors (no object yet) and static functions (no object at all) cannot.',
    },
  ],
  takeaways: [
    'Non-virtual calls are statically bound: chosen at compile time from the declared type of the reference or pointer.',
    '`virtual` makes calls through base references and pointers dispatch on the object\'s dynamic type — that is polymorphism.',
    'An override must match name, parameters and `const` exactly; mark it `override` so the compiler catches mismatches.',
    'Call a base version with a qualified name (`Enemy::takeDamage(...)`, Unreal\'s `Super::`); virtual calls inside base functions still dispatch.',
    '`final` stops overriding (on a function) or derivation (on a class) and can let the compiler devirtualize calls.',
    'Polymorphic collections store pointers, not objects; a `std::vector<Enemy>` cannot hold dragons.',
    'Constructors and static functions cannot be virtual, and default arguments follow the static type — don\'t vary them in overrides.',
  ],
  reading: [
    {
      title: 'virtual function specifier',
      url: 'https://en.cppreference.com/w/cpp/language/virtual',
      source: 'cppreference',
      note: 'The exact rules for overriding, final overriders and covariant return types.',
    },
    {
      title: 'override specifier',
      url: 'https://en.cppreference.com/w/cpp/language/override',
      source: 'cppreference',
      note: 'Short reference for `override`, with examples of the mismatches it catches.',
    },
    {
      title: 'Virtual functions and polymorphism',
      url: 'https://www.learncpp.com/cpp-tutorial/virtual-functions/',
      source: 'learncpp',
      note: 'A gentle walkthrough with more examples of static vs dynamic binding.',
    },
    {
      title: 'C++ Core Guidelines: Class hierarchies',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-hier',
      source: 'core-guidelines',
      note: 'See C.128 (virtual/override/final) and C.140 (default arguments on virtual functions).',
    },
  ],
};
