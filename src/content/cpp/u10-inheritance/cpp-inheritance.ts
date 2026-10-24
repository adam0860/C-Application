import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-inheritance',
  title: 'Inheritance Basics',
  summary: 'Build class hierarchies: base and derived classes, protected, constructor chaining, name hiding — and Unreal\'s AActor family tree.',
  minutes: 18,
  objectives: [
    'Model an *is-a* relationship with public inheritance, and recognise when composition (*has-a*) fits better',
    'Use `protected` deliberately and explain why protected data is usually a mistake',
    'Predict the exact order in which base, member and derived constructors and destructors run',
    'Pass arguments to a base-class constructor through the member initializer list',
    'Recognise name hiding and fix it with a `using` declaration or a qualified call',
    'Map C++ inheritance onto Unreal\'s `AActor` → `APawn` → `ACharacter` hierarchy',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Sharing what is common',
      blocks: [
        {
          type: 'p',
          text: 'Imagine a game with goblins, dragons, treasure chests and the player. Every one of them has a name and health and can take damage. Copy-pasting those members into four classes means four places to fix every bug. [[inheritance|Inheritance]] lets you write the shared part **once**, in a [[base-class]], and build specialised [[derived-class|derived classes]] on top of it.',
        },
        {
          type: 'code',
          title: 'inheritance.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

class Entity {
public:
    std::string name;
    int health = 100;

    void takeDamage(int amount) {
        health -= amount;
        std::cout << name << " has " << health << " HP\\n";
    }
};

class Enemy : public Entity {
public:
    int xpReward = 25;

    void taunt() const {
        std::cout << name << ": You cannot win!\\n";
    }
};

int main() {
    Enemy goblin;
    goblin.name = "Goblin";
    goblin.taunt();
    goblin.takeDamage(30);
    std::cout << "XP reward: " << goblin.xpReward << '\\n';
}`,
          output: 'Goblin: You cannot win!\nGoblin has 70 HP\nXP reward: 25',
          annotations: [
            { lines: '4-13', text: 'The **base class** holds what every entity shares. (Public data keeps this first example short; real classes keep data private, as you will see shortly.)' },
            { lines: 15, text: '`: public Entity` makes `Enemy` a **derived class**. It automatically gets every member of `Entity` — `name`, `health` and `takeDamage` — without restating them.' },
            { lines: '17-21', text: 'A derived class adds its own members on top of the inherited ones.' },
            { lines: 26, text: '`name` was declared in `Entity`, yet you use it on an `Enemy` exactly as if `Enemy` had declared it.' },
            { lines: 28, text: 'An inherited function. Its code lives in `Entity`; it operates on the `Entity` part of `goblin`.' },
          ],
        },
        {
          type: 'p',
          text: 'Physically, a derived object **contains** a complete base object — called the *base-class subobject* — followed by its own members. With typical compilers the base part comes first in memory:',
        },
        {
          type: 'memory',
          caption: 'An Enemy object: the Entity subobject is embedded inside it, then Enemy\'s own members follow.',
          regions: [
            {
              label: 'Stack — main(): Enemy goblin',
              kind: 'stack',
              cells: [
                { name: 'name', value: '"Goblin"', type: 'std::string (Entity part)', highlight: true },
                { name: 'health', value: '70', type: 'int (Entity part)', highlight: true },
                { name: 'xpReward', value: '25', type: 'int (Enemy part)' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why inheritance exists',
          text: 'Code reuse is the obvious benefit, but it is not the important one — a plain member or a helper function also reuses code. The real power is **substitutability**: any code written against `Entity` automatically works with every class derived from it, including classes written years later. That is the foundation of [[polymorphism]], which the next lesson builds on.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The is-a test (and when to say has-a)',
      blocks: [
        {
          type: 'p',
          text: 'Public inheritance is a promise: **every `Enemy` is an `Entity`**. The compiler takes the promise literally. Anywhere an `Entity&` or `Entity*` is expected, you may pass an `Enemy`, and the conversion happens implicitly. The reverse is not allowed — not every entity is an enemy.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>

class Entity {
public:
    std::string name = "???";
    int health = 100;
};

class Enemy : public Entity {
public:
    int xpReward = 25;
};

void printStatus(const Entity& e) {
    std::cout << e.name << ": " << e.health << " HP\\n";
}

int main() {
    Entity crate;
    crate.name = "Crate";
    Enemy orc;
    orc.name = "Orc";
    orc.health = 80;

    printStatus(crate);   // an Entity: obviously fine
    printStatus(orc);     // an Enemy IS an Entity: also fine

    Entity* ptr = &orc;   // derived-to-base: implicit
    std::cout << ptr->name << '\\n';
    // Enemy* bad = &crate;  // error: an Entity is not an Enemy
}`,
          output: 'Crate: 100 HP\nOrc: 80 HP\nOrc',
          annotations: [
            { lines: '15-17', text: '`printStatus` only knows about `Entity`. It was written without any knowledge of `Enemy`, yet works for it.' },
            { lines: 27, text: 'The reference `e` binds to the `Entity` subobject inside `orc`. No copy is made.' },
            { lines: 29, text: 'A base pointer can point at a derived object. Through `ptr` you can only reach `Entity` members — `ptr->xpReward` would not compile, because the compiler only knows `ptr` points at *some* `Entity`.' },
            { lines: 31, text: 'Going the other way (base to derived) is not implicit. It needs a cast, and is only safe if the object really is an `Enemy` — more on that in the Abstract Classes lesson.' },
          ],
        },
        {
          type: 'p',
          text: 'Use the *is-a* test before you inherit. If the sentence "a `D` is a `B`" sounds wrong, you want **composition** instead: give the class a *member* of that type — a *has-a* relationship. See [[is-a-relationship|is-a relationship]].',
        },
        {
          type: 'compare',
          left: {
            title: 'Inheritance misused',
            tone: 'bad',
            code: `class Player : public Inventory {
    // a Player IS an Inventory?!
};
// Now any function taking an
// Inventory& accepts a Player.`,
          },
          right: {
            title: 'Composition: has-a',
            tone: 'good',
            code: `class Player : public Entity {
    Inventory inventory_;  // has-a
};
// A Player is an Entity and
// has an Inventory.`,
          },
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'With `class`, inheritance is private by default',
          text: 'If you write `class Enemy : Entity` and forget `public`, the inheritance is **private**: the *is-a* relationship becomes invisible to outside code, so passing an `Enemy` to `printStatus` fails to compile and `orc.name` becomes inaccessible. `struct` defaults to public inheritance. Always write `public` explicitly. Protected and private inheritance exist, but they mean "implemented in terms of", which composition usually expresses more clearly — this course uses public inheritance throughout.',
        },
        {
          type: 'deepdive',
          title: 'The Liskov Substitution Principle',
          blocks: [
            {
              type: 'p',
              text: 'The formal version of the is-a test is the *Liskov Substitution Principle*: code that works with a base object must keep working when handed a derived object. A classic violation: `Square` deriving from `Rectangle`. Mathematically a square is a rectangle, but if `Rectangle` has `setWidth()` that leaves the height alone, a `Square` must either break that promise or stop being square. "Is-a" in code means *behaves like* — not just *is categorised as*.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'Which of these is the best fit for **public inheritance**?',
      codeOptions: true,
      options: [
        {
          text: 'class Player : public Inventory',
          why: 'A player *has* an inventory; it is not one. Inheriting would put `addItem`, `sort` and every other inventory function directly on the player, and let you pass a player wherever an inventory is expected. Use a member.',
        },
        {
          text: 'class Car : public Wheel',
          why: 'A car *has* wheels — four of them. Inheritance would give it exactly one wheel subobject and make a car usable as a wheel. Classic composition.',
        },
        {
          text: 'class HealthPotion : public Item',
          correct: true,
          why: 'A health potion genuinely *is an* item: it can sit in an inventory slot, drop as loot or be sold — anywhere an `Item` is expected. Substitutability holds, so public inheritance fits.',
        },
        {
          text: 'class Level : public std::vector<Enemy>',
          why: 'A level *contains* enemies; it is not a list of them. Inheriting also exposes every vector operation on `Level`, and standard containers were not designed as base classes.',
        },
      ],
      explanation:
        'Public inheritance means "can be used wherever the base is used". Ask whether a function written for the base would make sense when given the derived object. A function that sells an `Item` works for a potion; a function that sorts an `Inventory` makes no sense for a player. When the answer is "has a", make it a member — composition.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'bug',
      prompt: 'This fails to compile with "`Entity` is an inaccessible base of `Enemy`", reported at line 19. Tap the line that is actually at fault.',
      code: `#include <iostream>

class Entity {
public:
    int health = 100;
};

class Enemy : Entity {
public:
    int xpReward = 25;
};

void showHealth(const Entity& e) {
    std::cout << e.health << '\\n';
}

int main() {
    Enemy goblin;
    showHealth(goblin);
}`,
      bugLines: [8],
      hint: 'What is the default kind of inheritance for a `class`?',
      explanation:
        'Line 8 omits `public`, and for a `class` the default is **private** inheritance. The `Entity` part still exists inside every `Enemy`, but the is-a relationship is hidden from outside code, so `main` cannot convert `goblin` to `const Entity&`. The compiler only notices at the conversion on line 19, which is why the error points there. Fix: `class Enemy : public Entity`.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'protected: for the family only',
      blocks: [
        {
          type: 'p',
          text: 'You already know `public` and `private` [[access-specifier|access specifiers]]. Inheritance adds a third: [[protected]]. A protected member is accessible inside the class **and inside classes derived from it**, but not to the outside world.',
        },
        {
          type: 'table',
          headers: ['Access', 'The class itself', 'Derived classes', 'Everyone else'],
          rows: [
            ['`public`', 'yes', 'yes', 'yes'],
            ['`protected`', 'yes', 'yes', 'no'],
            ['`private`', 'yes', 'no', 'no'],
          ],
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

class Entity {
public:
    int health() const { return health_; }

protected:
    void restoreHealth(int amount) {
        health_ += amount;
        if (health_ > 100) {
            health_ = 100;    // invariant: never above 100
        }
    }

private:
    int health_ = 60;
};

class Healer : public Entity {
public:
    void meditate() {
        restoreHealth(20);    // OK: protected, we're family
        // health_ = 999;     // error: private to Entity
    }
};

int main() {
    Healer h;
    h.meditate();             // OK: public
    // h.restoreHealth(20);   // error: protected
    std::cout << "Healer HP: " << h.health() << '\\n';
}`,
          output: 'Healer HP: 80',
          annotations: [
            { lines: '7-13', text: 'A **protected function** is a service offered to derived classes. It enforces the class rule (health never exceeds 100) no matter which subclass calls it.' },
            { lines: 16, text: 'The data itself stays **private**. Even derived classes must go through the functions above.' },
            { lines: 23, text: 'If derived classes could write `health_` directly, every subclass ever written could break the "max 100" rule.' },
            { lines: 30, text: 'Protected members are invisible from outside the hierarchy — `main` is not family.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why "private data, protected functions"?',
          text: 'Protected *data* looks convenient but quietly destroys [[encapsulation]]: any class anyone ever derives — including ones in other teams\' code — can put the object into an invalid state, and you can never change the member without breaking them all. Protected *functions* let the base class keep its [[invariant|invariants]] while still offering hooks to its children. The C++ Core Guidelines say it bluntly: *avoid protected data* (C.133).',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'protected in Unreal',
          text: 'Open any Unreal Actor header and you will see `protected:` used for functions the engine calls but outside code should not, such as `BeginPlay()`. The engine calls the public `AActor::DispatchBeginPlay()`, which in turn calls `BeginPlay()` from inside the class — so your override can stay protected.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'fill',
      prompt: 'Fill the blanks so that `Sword::slash()` can use `baseDamage()`, code outside the hierarchy **cannot** call `baseDamage()`, and a `Sword` can be passed to `void equip(const Weapon&)`.',
      template: `class Weapon {
___:
    int baseDamage() const { return 10; }
};

class Sword : ___ Weapon {
public:
    int slash() const { return baseDamage() * 2; }
};`,
      blanks: [{ answers: ['protected'] }, { answers: ['public'] }],
      wordBank: ['protected', 'public', 'private', 'virtual', 'friend'],
      explanation:
        '`protected` is exactly "derived classes yes, outsiders no" — `public` would let anyone call `baseDamage()`, and `private` would lock out `Sword` too. The inheritance must be `public` so that the is-a relationship is visible to outside code; with private inheritance, `equip(sword)` would fail because outsiders cannot convert a `Sword` to a `Weapon`.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Construction: base first, destruction: base last',
      blocks: [
        {
          type: 'p',
          text: 'A derived object is built from the inside out. When you create a `Boss`, its `Entity` part is constructed first, then its `Enemy` part, then `Boss`\'s own members, and only then does the `Boss` [[constructor]] body run. [[destructor|Destructors]] run in exactly the reverse order. This tracing program makes the order visible:',
        },
        {
          type: 'code',
          title: 'lifecycle.cpp',
          runnable: true,
          code: `#include <iostream>

struct Weapon {
    Weapon()  { std::cout << "  Weapon built\\n"; }
    ~Weapon() { std::cout << "  Weapon destroyed\\n"; }
};

class Entity {
public:
    Entity()  { std::cout << "  Entity built\\n"; }
    ~Entity() { std::cout << "  Entity destroyed\\n"; }
};

class Enemy : public Entity {
public:
    Enemy()  { std::cout << "  Enemy built\\n"; }
    ~Enemy() { std::cout << "  Enemy destroyed\\n"; }
};

class Boss : public Enemy {
public:
    Boss()  { std::cout << "  Boss built\\n"; }
    ~Boss() { std::cout << "  Boss destroyed\\n"; }
private:
    Weapon axe_;
};

int main() {
    std::cout << "Spawning boss:\\n";
    {
        Boss dragon;
        std::cout << "Boss fight!\\n";
    }
    std::cout << "Boss defeated.\\n";
}`,
          output: 'Spawning boss:\n  Entity built\n  Enemy built\n  Weapon built\n  Boss built\nBoss fight!\n  Boss destroyed\n  Weapon destroyed\n  Enemy destroyed\n  Entity destroyed\nBoss defeated.',
          annotations: [
            { lines: 22, text: 'By the time this body runs, `Entity`, `Enemy` **and** the member `axe_` are all fully constructed — so the body can safely use any of them.' },
            { lines: 25, text: 'Members are constructed after all base classes, in the order they are declared, before the constructor body.' },
            { lines: 31, text: 'One declaration triggers the whole chain. `Boss()` implicitly calls `Enemy()` first, which implicitly calls `Entity()` first.' },
            { lines: 33, text: 'End of scope: the exact mirror image. `~Boss()` runs first, then members, then `~Enemy()`, then `~Entity()`.' },
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'Base classes', text: 'Constructed first, most-base first (`Entity`, then `Enemy`).' },
            { title: 'Members', text: 'Constructed in **declaration order** (`axe_`).' },
            { title: 'Constructor body', text: 'The `Boss` constructor\'s `{ ... }` runs last.' },
            { title: 'Destruction', text: 'Exactly reversed: destructor body, then members in reverse declaration order, then bases from most-derived to most-base.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why this order and no other?',
          text: 'A derived class *builds on* its base: its constructor may call inherited functions or read inherited members, so the base must already be valid. Destruction mirrors it for the same reason: while `~Boss()` runs it may still use its `Enemy` and `Entity` parts, so those must still be alive. Each layer only ever sees layers beneath it that are fully constructed. It is the same last-in, first-out discipline as the [[call-stack]].',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Building a house',
          text: 'Foundation, then walls, then furniture. When the house is demolished, the furniture goes first and the foundation last — nobody removes the foundation while the walls are still standing on it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'order',
      prompt: '`Boss` derives from `Enemy`, which derives from `Entity`. `Boss` also has a member `Weapon axe_`. A `Boss` object goes out of scope — put the destruction steps in order.',
      linesAreCode: false,
      lines: [
        'The body of `~Boss()` runs',
        'The member `axe_` is destroyed',
        '`~Enemy()` runs',
        '`~Entity()` runs',
      ],
      distractors: ['`~Entity()` runs before any other destructor so the base is cleaned up first'],
      explanation:
        'Destruction is the mirror image of construction. The most-derived destructor body runs first, while everything beneath it is still alive; then `Boss`\'s members are destroyed; then the base classes, from most-derived (`Enemy`) to most-base (`Entity`). Destroying the base first would leave `~Boss()` operating on a half-dead object.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Passing arguments up to the base constructor',
      blocks: [
        {
          type: 'p',
          text: 'In real classes the base usually needs arguments: an `Entity` needs a name and starting health. A derived constructor passes them up by naming the base class in its [[member-initializer-list]] — this is called *constructor chaining*.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>

class Entity {
public:
    Entity(const std::string& name, int health)
        : name_{name}, health_{health} {}

    const std::string& name() const { return name_; }
    int health() const { return health_; }

private:
    std::string name_;
    int health_;
};

class Enemy : public Entity {
public:
    Enemy(const std::string& name, int health, int xp)
        : Entity{name, health}, xpReward_{xp} {}

    int xpReward() const { return xpReward_; }

private:
    int xpReward_;
};

class Boss : public Enemy {
public:
    explicit Boss(const std::string& name)
        : Enemy{name, 5000, 1000} {}
};

int main() {
    Enemy rat{"Rat", 10, 2};
    Boss lich{"Lich King"};
    std::cout << rat.name() << ": " << rat.health() << " HP, "
              << rat.xpReward() << " XP\\n";
    std::cout << lich.name() << ": " << lich.health() << " HP, "
              << lich.xpReward() << " XP\\n";
}`,
          output: 'Rat: 10 HP, 2 XP\nLich King: 5000 HP, 1000 XP',
          annotations: [
            { lines: '6-7', text: '`Entity` has **no default constructor**. Every class derived from it is now forced to provide a name and health — the base class protects its own invariants.' },
            { lines: 13, text: '`name_` and `health_` stay private. `Enemy` could not write `: name_{name}` in its own list: those members belong to `Entity`, and only `Entity`\'s constructor initialises them.' },
            { lines: 20, text: '`Entity{name, health}` calls the base constructor. It always runs **before** `xpReward_` is initialized, regardless of where you write it in the list.' },
            { lines: '30-31', text: 'A `Boss` fixes its stats and passes them to its **direct** base, `Enemy`. It cannot call `Entity`\'s constructor itself — each class initialises only the layer directly beneath it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Initializer order is fixed — not what you write',
          text: 'The real order is always: bases, then members in **declaration** order. If you write `: xpReward_{xp}, Entity{name, health}`, `Entity` still runs first. When the written order differs from the real order, GCC and Clang warn (`-Wreorder`) because it often hides a bug — such as initialising one member from another that has not been initialised yet.',
        },
        {
          type: 'deepdive',
          title: 'Inheriting constructors with using',
          blocks: [
            {
              type: 'p',
              text: 'If a derived class adds no new data and just wants the base\'s constructors, it can inherit them in one line instead of writing forwarding constructors by hand:',
            },
            {
              type: 'code',
              code: `class Minion : public Enemy {
public:
    using Enemy::Enemy;  // Minion{"Imp", 5, 1} now works
};`,
              annotations: [
                { lines: 3, text: 'Makes every `Enemy` constructor usable to build a `Minion`. Any members `Minion` declares get their default member initializers.' },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: 'This code does not compile. Tap the line that causes the error.',
      code: `class Entity {
public:
    explicit Entity(int health) : health_{health} {}
private:
    int health_;
};

class Turret : public Entity {
public:
    explicit Turret(int ammo) : ammo_{ammo} {}
private:
    int ammo_;
};`,
      bugLines: [10],
      hint: 'Which `Entity` constructor does `Turret`\'s constructor call?',
      explanation:
        'Line 10 does not mention `Entity` in its initializer list, so the compiler tries to call `Entity`\'s **default** constructor — and there is none, because `Entity` declared a constructor taking `int`. The fix is to pass health up explicitly: `explicit Turret(int ammo) : Entity{250}, ammo_{ammo} {}`. This is a feature: `Entity`\'s author made it impossible to build an entity without deciding its health.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Name hiding: when a derived name eclipses the base',
      blocks: [
        {
          type: 'p',
          text: 'If a derived class declares a member with the same name as a base member, the derived one **hides** every base member of that name — all overloads, even ones with different parameters. This is [[name-hiding]]. You can bring the base overloads back with a `using` declaration, and call a specific base version with a qualified name like `Entity::heal(...)`.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

class Entity {
public:
    void describe() const { std::cout << "an entity\\n"; }
    void heal() { std::cout << "healed 10\\n"; }
    void heal(int amount) {
        std::cout << "healed " << amount << '\\n';
    }
};

class Player : public Entity {
public:
    using Entity::heal;   // keep the base overloads visible
    void heal(int amount) {
        std::cout << "potion! ";
        Entity::heal(amount * 2);  // call the base version
    }
    void describe() const { std::cout << "the player\\n"; }
};

int main() {
    Player p;
    p.heal(15);            // Player::heal(int)
    p.heal();              // Entity::heal(), thanks to using
    p.describe();          // Player::describe
    p.Entity::describe();  // explicitly the base version
    const Entity& ref = p;
    ref.describe();        // which one runs here?
}`,
          output: 'potion! healed 30\nhealed 10\nthe player\nan entity\nan entity',
          annotations: [
            { lines: 14, text: 'Without this line, `p.heal()` on line 25 would not compile: `Player::heal(int)` hides **both** `Entity::heal` overloads.' },
            { lines: 17, text: 'A qualified call reaches the base version directly. This "do my extra bit, then call the parent" pattern is everywhere in Unreal, where it is spelled `Super::BeginPlay()`.' },
            { lines: 27, text: 'Qualified access works from outside too, though it is rarely a good idea in real code.' },
            { lines: '28-29', text: 'Surprise: through an `Entity&`, you get `Entity::describe`. The compiler picks the function from the *declared* type of `ref`, not from the object it refers to. Fixing this is exactly what the next lesson, on `virtual`, is about.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why hide overloads instead of merging them?',
          text: 'Name lookup stops at the **first scope** where it finds the name, and only then does [[overload-resolution]] pick among what it found. The rule protects derived classes: if the base class author later adds `heal(double)`, your `player.heal(5)` calls must not silently start resolving to a function you have never seen. `using Entity::heal;` is you saying explicitly, "yes, I want the base overloads too".',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'truefalse',
      prompt: '`Entity` declares `void heal()` and `void heal(int)`. `Player` derives publicly from `Entity` and declares only its own `void heal(int)`. You can still call `player.heal()` with no arguments.',
      answer: false,
      explanation:
        'Declaring `heal` in `Player` hides **every** `heal` from `Entity`, including the zero-argument one, so `player.heal()` fails to compile with "no matching function". Lookup finds the name `heal` in `Player` and stops searching. Add `using Entity::heal;` inside `Player` to bring the base overloads back alongside your own.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>

class Enemy {
public:
    void roar() const { std::cout << "..."; }
};

class Dragon : public Enemy {
public:
    void roar() const { std::cout << "ROAR"; }
};

void provoke(const Enemy& e) { e.roar(); }

int main() {
    Dragon smaug;
    smaug.roar();
    std::cout << ' ';
    provoke(smaug);
    std::cout << '\\n';
}`,
      options: [
        { text: '`ROAR ROAR`', why: 'That is what you would get if `roar` were `virtual`. Without it, the call inside `provoke` is decided by the parameter\'s declared type, `Enemy`.' },
        { text: '`... ...`', why: '`smaug.roar()` is called directly on a `Dragon` variable, so `Dragon::roar` is found first — it hides `Enemy::roar`.' },
        { text: '`ROAR ...`', correct: true, why: 'Directly on `smaug`, lookup finds `Dragon::roar`. Inside `provoke`, the compiler only knows it has an `Enemy&`, so it calls `Enemy::roar` — decided at compile time.' },
        { text: 'It does not compile: `roar` is defined twice', why: 'A derived class may declare a member with the same name as a base member; it simply hides the base one. No conflict.' },
      ],
      explanation:
        'For ordinary member functions, the compiler chooses which function to call from the **static type** — the type written in the code (`Enemy&` inside `provoke`) — not from the type of the object at run time. This is called static binding. It is fast and predictable, but it means a game loop holding `Enemy&` can never reach dragon-specific behaviour. The next lesson fixes this with `virtual`.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'A game hierarchy — and Unreal\'s',
      blocks: [
        {
          type: 'p',
          text: 'Unreal Engine\'s gameplay classes form one of the best-known inheritance hierarchies in game development. Each level adds one well-defined capability, and each passes the is-a test:',
        },
        {
          type: 'table',
          headers: ['Class', 'Derives from', 'What this level adds'],
          rows: [
            ['[[uobject|UObject]]', '—', 'Reflection, garbage collection, serialization, editor integration'],
            ['[[actor|AActor]]', '`UObject`', 'Can be placed or spawned in a level; has components, a transform, `BeginPlay()` and `Tick()`'],
            ['[[pawn|APawn]]', '`AActor`', 'Can be *possessed* by a Controller (a player or an AI)'],
            ['[[character|ACharacter]]', '`APawn`', 'A capsule, a skeletal mesh and a `UCharacterMovementComponent` for walking, jumping and swimming'],
          ],
        },
        {
          type: 'p',
          text: 'Your own enemy simply derives from `ACharacter` and inherits all of that. Here is what it looks like (do not worry about the macros yet — the Unreal course explains each one):',
        },
        {
          type: 'code',
          title: 'EnemyCharacter.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "EnemyCharacter.generated.h"

UCLASS()
class MYGAME_API AEnemyCharacter : public ACharacter {
    GENERATED_BODY()

public:
    AEnemyCharacter();

protected:
    virtual void BeginPlay() override;
};`,
          annotations: [
            { lines: 5, text: 'The header generated by Unreal\'s reflection tool. It must be the **last** include.' },
            { lines: 8, text: 'Plain C++ public inheritance: an `AEnemyCharacter` *is an* `ACharacter`, which *is an* `APawn`, which *is an* `AActor`. `MYGAME_API` exports the class from the game module.' },
            { lines: 15, text: 'Overriding an inherited function. `virtual` and `override` are the subject of the next lesson.' },
          ],
        },
        {
          type: 'code',
          title: 'EnemyCharacter.cpp',
          code: `#include "EnemyCharacter.h"

AEnemyCharacter::AEnemyCharacter() {
    PrimaryActorTick.bCanEverTick = false;
}

void AEnemyCharacter::BeginPlay() {
    Super::BeginPlay();  // let ACharacter do its setup first
    UE_LOG(LogTemp, Log, TEXT("%s spawned"), *GetName());
}`,
          annotations: [
            { lines: 3, text: 'Just like `Boss` in our tracing program, the `UObject`, `AActor`, `APawn` and `ACharacter` constructors have all run before this body starts.' },
            { lines: 4, text: '`PrimaryActorTick` is an inherited member of `AActor` — used here exactly like `name` was used on `goblin`.' },
            { lines: 8, text: '`Super` is an alias for the direct base class (`ACharacter`) that `GENERATED_BODY()` declares for you. `Super::BeginPlay()` is the same qualified call as `Entity::heal(...)` — skip it and the parent\'s setup never happens.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Single inheritance for UObjects',
          text: 'Unreal\'s reflection system allows a `UCLASS` to derive from exactly **one** `UObject`-based class (plus any number of interfaces, covered later in this unit). Deep hierarchies also get rigid fast — what if a turret, a barrel and an enemy all need health but share no sensible base? Unreal\'s answer is composition: reusable behaviour goes into *components* (`UHealthComponent`) that any actor can own.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Prefer shallow hierarchies',
          text: 'Use inheritance for genuine is-a relationships where code must treat many types uniformly. Use composition for "has a capability". A good rule of thumb from decades of game code: *favour composition over inheritance*, and keep hierarchies shallow.',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'Given Unreal\'s hierarchy `AActor` → `APawn` → `ACharacter`, which statement is true?',
      options: [
        {
          text: 'An `APawn*` can be passed to a function that expects an `ACharacter*`',
          why: 'That is base-to-derived. Not every pawn is a character (a vehicle or a flying camera pawn is not), so the conversion is not implicit.',
        },
        {
          text: '`Super` inside `ACharacter`\'s code refers to `AActor`',
          why: '`Super` names the **direct** base class. For `ACharacter` that is `APawn`; for `APawn` it is `AActor`.',
        },
        {
          text: 'An `ACharacter*` can be passed to a function that expects an `AActor*`',
          correct: true,
          why: 'Derived-to-base conversion is implicit: every character is a pawn, and every pawn is an actor. That is why engine functions taking `AActor*` accept your characters.',
        },
        {
          text: 'A `UCLASS` may derive from several `UObject`-based classes, as long as each is public',
          why: 'Unreal\'s reflection system supports only single inheritance among `UObject` classes. Extra bases are allowed only for interfaces.',
        },
      ],
      explanation:
        'Public inheritance gives you an implicit conversion from derived to base — never the other way round. Unreal relies on this constantly: functions like `GetOverlappingActors` or `ApplyDamage` deal in `AActor*`, and every pawn, character or projectile you write can be handed to them without a cast.',
    },
  ],
  takeaways: [
    'A derived class contains a complete base-class subobject and adds its own members; `class D : public B` means "every D is a B".',
    'Use public inheritance only when the is-a test passes; when the relationship is has-a, use a member (composition).',
    'With `class`, inheritance is private by default — always write `public`.',
    '`protected` members are accessible to derived classes but not outsiders; keep data private and offer protected functions instead.',
    'Construction runs base → members → constructor body; destruction runs in exactly the reverse order.',
    'Pass arguments to the base constructor in the member initializer list: `Enemy(...) : Entity{name, hp} {}`.',
    'A derived member hides every base member with the same name; restore overloads with `using Base::name;`, call base versions with `Base::name(...)` (Unreal: `Super::`).',
  ],
  reading: [
    {
      title: 'Derived classes',
      url: 'https://en.cppreference.com/w/cpp/language/derived_class',
      source: 'cppreference',
      note: 'The precise rules for base classes, inheritance access and base-class subobjects.',
    },
    {
      title: 'Order of construction and destruction',
      url: 'https://www.learncpp.com/cpp-tutorial/order-of-construction-of-derived-classes/',
      source: 'learncpp',
      note: 'A step-by-step walkthrough of how derived objects are built, with more tracing examples.',
    },
    {
      title: 'C++ Core Guidelines: Class hierarchies',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-hier',
      source: 'core-guidelines',
      note: 'Rules C.120 onwards, including when to use hierarchies and why to avoid protected data (C.133).',
    },
    {
      title: 'Gameplay Framework in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s overview of Actors, Pawns, Characters and Controllers — the hierarchy you just met.',
    },
  ],
};
