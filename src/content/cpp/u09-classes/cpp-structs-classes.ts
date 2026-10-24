import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-structs-classes',
  title: 'Structs and Classes',
  summary: 'Designing your own types: grouping data, accessing members, public vs private, and why encapsulation protects invariants.',
  minutes: 18,
  objectives: [
    'Define a struct that groups related data, and create objects of it with brace initialization',
    'Access members with `.` on objects and references, and `->` through pointers',
    'Use `public` and `private` to separate a class\'s interface from its implementation',
    'State the only language difference between `struct` and `class`, and the convention for choosing',
    'Explain encapsulation and invariants, and define member functions inside and outside the class',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Bundling data: your first struct',
      blocks: [
        {
          type: 'p',
          text: 'Picture an enemy in your game: it has a name, hit points and a position. With only the built-in types you would juggle four loose variables per enemy — and for a hundred enemies, four parallel lists that must never fall out of step. A [[struct]] lets you define a **new type** that bundles those values into one object.',
        },
        {
          type: 'code',
          title: 'enemy.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

struct Enemy {
    std::string name;
    int hp;
    float x;
    float y;
};   // <- this semicolon is required

int main() {
    Enemy goblin{"Goblin", 30, 2.5f, -1.0f};
    Enemy orc{.name = "Orc", .hp = 80, .x = 0.0f, .y = 4.0f};

    goblin.hp -= 12;
    std::cout << goblin.name << " has " << goblin.hp << " HP\\n";
    std::cout << orc.name << " stands at (" << orc.x << ", "
              << orc.y << ")\\n";
}`,
          output: 'Goblin has 18 HP\nOrc stands at (0, 4)',
          annotations: [
            { lines: '4-9', text: 'Defines a type named `Enemy`. Each variable inside is a [[member-variable|data member]]; every `Enemy` object gets its own copy of all four.' },
            { lines: 9, text: 'Forgetting this semicolon is a classic error, and the compiler usually complains about the line *after* it. It exists because you may declare variables right after the brace: `struct P { int x; } origin;`.' },
            { lines: 12, text: 'Brace initialization assigns the values to the members **in declaration order**: name, hp, x, y.' },
            { lines: 13, text: 'C++20 [[designated-initializer|designated initializers]] name each member. They must still appear in declaration order, but the code documents itself.' },
            { lines: 15, text: 'The `.` operator selects a member of an object. `goblin.hp` is an ordinary `int` you can read and modify.' },
          ],
        },
        {
          type: 'memory',
          caption: 'An object\'s members are stored together, in declaration order (offsets assume a typical 32-byte `std::string`).',
          regions: [
            {
              label: 'Stack — main(): goblin (Enemy)',
              kind: 'stack',
              cells: [
                { name: 'name', type: 'std::string', value: '"Goblin"', address: '+0' },
                { name: 'hp', type: 'int', value: '18', address: '+32', highlight: true },
                { name: 'x', type: 'float', value: '2.5', address: '+36' },
                { name: 'y', type: 'float', value: '-1', address: '+40' },
              ],
            },
          ],
        },
        {
          type: 'definition',
          term: 'Aggregate',
          text: 'A struct or class with all-public data members, no user-declared constructors and no virtual functions. An [[aggregate-type|aggregate]] like `Enemy` can be initialized directly from a braced list of member values.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why define your own types?',
          text: 'A type lets code say what it means. `void applyDamage(Enemy& target, int amount)` is clearer than a function with four loose parameters, and the compiler stops you passing an enemy\'s `x` where its `hp` belongs. Related data also stays together: one `std::vector<Enemy>` cannot fall out of sync the way four parallel vectors can.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Uninitialized members',
          text: '`Enemy e;` with no braces constructs `name` as an empty string but leaves `hp`, `x` and `y` with [[indeterminate-value|indeterminate values]] — garbage. Write `Enemy e{};` to zero them, or give members default values in the struct (next lesson).',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'Using the `Enemy` struct above, what values do `x` and `y` have after `Enemy bat{"Bat", 5};`?',
      options: [
        { text: 'Garbage — they were never initialized', why: 'That is what happens with `Enemy bat;` (no braces at all). With a braced list, every member is initialized one way or another.' },
        { text: 'Nothing — it is a compile error, because all four members must be given', why: 'Aggregate initialization may supply fewer values than there are members. (GCC\'s `-Wextra` does warn about it, as a reminder to be explicit.)' },
        { text: '`0.0f` each — members without a value are initialized as if from empty braces', correct: true, why: 'Members not covered by the list use their default member initializer if they have one, otherwise they are value-initialized, which for `float` means zero.' },
        { text: '`x` becomes `5` and `hp` is left at zero', why: 'Values are matched to members strictly in declaration order: `"Bat"` goes to `name`, `5` to `hp`.' },
      ],
      explanation:
        'In aggregate initialization the listed values fill the members in order, and every remaining member is initialized from an empty initializer — zero for numbers, empty for strings. That is a big difference from `Enemy bat;`, which leaves the numeric members indeterminate.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Member access: `.` and `->`',
      blocks: [
        {
          type: 'p',
          text: 'You reach a member with `.` when you have the object itself — or a reference to it, since a reference *is* the object. When you have a **pointer** to the object, you must first follow the pointer, then pick the member. C++ has a dedicated arrow operator for that: `p->hp` means `(*p).hp`. These are the [[member-access-operators|member access operators]].',
        },
        {
          type: 'code',
          title: 'access.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

struct Player {
    std::string name;
    int hp;
    int gold;
};

void takeHit(Player* target, int damage) {
    if (target != nullptr) {
        target->hp -= damage;     // same as (*target).hp
    }
}

void loot(Player& looter, int amount) {
    looter.gold += amount;        // references use the dot
}

int main() {
    Player hero{"Aria", 100, 0};
    Player* p = &hero;

    takeHit(p, 35);
    loot(hero, 50);
    std::cout << p->name << ": " << hero.hp << " HP, "
              << (*p).gold << " gold\\n";
}`,
          output: 'Aria: 65 HP, 50 gold',
          annotations: [
            { lines: 12, text: '`->` follows the pointer and selects `hp` in one step. Always null-check a pointer parameter before using `->` on it.' },
            { lines: 17, text: 'A reference is an alias for the object, so it uses `.` exactly like the object\'s own name.' },
            { lines: 22, text: 'Taking the address of a struct object works like any other variable.' },
            { lines: '26-27', text: 'Three spellings, one object: `p->name`, `hero.hp` and `(*p).gold`. The parentheses in the last one are essential.' },
          ],
        },
        {
          type: 'memory',
          caption: 'The address of an object is the address of its first byte — here, where `name` begins.',
          regions: [
            {
              label: 'Stack — main(): hero (Player)',
              kind: 'stack',
              cells: [
                { id: 'heroName', name: 'name', type: 'std::string', value: '"Aria"', address: '0xff00' },
                { name: 'hp', type: 'int', value: '65', address: '0xff20' },
                { name: 'gold', type: 'int', value: '50', address: '0xff24' },
              ],
            },
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [{ name: 'p', type: 'Player*', value: '0xff00', address: '0xff30', pointsTo: 'heroName', highlight: true }],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does `->` exist?',
          text: 'Because of [[precedence]]: `.` binds tighter than unary `*`, so `*p.hp` means `*(p.hp)` — "dereference the member `hp` of the pointer `p`" — which does not compile. You would have to write `(*p).hp` every time. Accessing members through pointers was so common in C that it got its own operator. (Later you will see that classes such as smart pointers can overload `->` too.)',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Because engine objects are always handled through pointers, Unreal code is full of arrows: `GetOwner()->GetActorLocation()`, `Mesh->SetVisibility(false)`. Long chains such as `GetWorld()->GetFirstPlayerController()->GetPawn()` crash if any link returns `nullptr`, so production code checks each step.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'fill',
      prompt: 'Damage the boss once through the pointer and once through the object itself.',
      template: `Enemy boss{"Lich", 900, 0.0f, 0.0f};
Enemy* target = &boss;
target___hp -= 100;    // through the pointer
boss___hp -= 50;       // through the object`,
      blanks: [{ answers: ['->'] }, { answers: ['.'] }],
      wordBank: ['->', '.', '::', '*', '&'],
      explanation:
        '`target` is a pointer, so it uses `->` (follow the pointer, then select the member). `boss` is the object itself, so it uses `.`. `::` is the scope-resolution operator: it names things that belong to a class or namespace (like `std::cout`), not members of a particular object.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'From struct to class: public and private',
      blocks: [
        {
          type: 'p',
          text: 'Structs can hold functions as well as data. A [[member-function]] is declared inside the type and operates on the object it is called on. Combine that with [[access-specifier|access specifiers]] and you get a [[class]] that controls how it may be used: `public` members can be used by any code, `private` members only by the class\'s own member functions.',
        },
        {
          type: 'code',
          title: 'health.cpp',
          runnable: true,
          code: `#include <iostream>

class Health {
public:
    void takeDamage(int amount) {
        if (amount < 0) {
            return;               // reject nonsense input
        }
        current -= amount;
        if (current < 0) {
            current = 0;          // never below zero
        }
    }
    int value() const { return current; }
    bool isDead() const { return current == 0; }

private:
    int current = 100;            // only Health's code may touch it
};

int main() {
    Health hp;
    hp.takeDamage(30);
    hp.takeDamage(-500);          // ignored
    std::cout << hp.value() << '\\n';
    hp.takeDamage(1000);
    std::cout << hp.value() << ' ' << std::boolalpha
              << hp.isDead() << '\\n';
    // hp.current = 9999;         // error: 'current' is private
}`,
          output: '70\n0 true',
          annotations: [
            { lines: 4, text: 'Everything after `public:` (until the next specifier) is the class\'s **interface** — what other code may call.' },
            { lines: '5-13', text: 'A member function. Inside it, `current` refers to the member of whichever object the function was called on: `hp.takeDamage(30)` changes `hp`\'s `current`.' },
            { lines: '14-15', text: 'The `const` after the parentheses promises the function will not modify the object. Lesson 4 of this unit explains why that matters.' },
            { lines: 17, text: 'Everything after `private:` is implementation detail, reachable only from `Health`\'s own member functions.' },
            { lines: 18, text: '`= 100` gives the member a starting value, so every `Health` begins full (more on this in the next lesson).' },
            { lines: 29, text: 'Uncomment this and the program no longer compiles. Outside code must go through `takeDamage`, which enforces the rules.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Access control is a compile-time check',
          text: '`private` costs nothing at run time: private members still exist in every object and take up memory, and a determined programmer could reach them with pointer tricks. It protects against **accidents**, not malice — the compiler simply refuses to build code that touches private members from outside.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'In C++, a `struct` cannot have member functions or private members — only a `class` can.',
      answer: false,
      explanation:
        'In C++ a `struct` can have everything a `class` can: member functions, constructors, `private` sections, even inheritance. This is a common belief carried over from C, where structs really were data-only. As the next card shows, the two keywords differ in just one detail.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'struct vs class: the only difference',
      blocks: [
        {
          type: 'p',
          text: 'Here is the entire language-level difference: members of a `struct` are **public by default**, members of a `class` are **private by default**. (The same default applies to inheritance, which you will meet in Unit 10.) These two definitions are exactly equivalent:',
        },
        {
          type: 'compare',
          left: {
            title: 'struct',
            tone: 'neutral',
            code: `struct Coin {
    int value;      // public by default
};`,
          },
          right: {
            title: 'class',
            tone: 'neutral',
            code: `class Coin {
public:             // must say so explicitly
    int value;
};`,
          },
        },
        {
          type: 'p',
          text: 'Since the compiler barely cares, the choice is a message to readers. The widely followed convention:',
        },
        {
          type: 'list',
          items: [
            'Use `struct` for a **plain bundle of data** where any combination of member values is valid: a 2D vector, a colour, spawn parameters. All members public, few or no member functions.',
            'Use `class` when the type has **rules to protect** — data that must stay consistent — so the data is private and the public interface is functions.',
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Why two keywords for one thing?',
          text: '`struct` came from C, where it could only hold data. Stroustrup borrowed the `class` keyword from the language Simula when designing C++, but made both keywords define the same kind of type, so that every C struct remained valid C++ while gaining all the new features. The only difference left was the default access, chosen so that C structs keep their all-public behaviour.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Unreal follows the same convention. Its F-prefixed structs such as `FVector` and `FHitResult` are mostly public data you read and write directly, while actors and components are `class`es with protected or private state behind member functions like `GetActorLocation()` and `SetActorLocation()`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'What is the difference between a `struct` and a `class` in C++?',
      options: [
        { text: 'Only a `class` can have member functions and constructors', why: 'Structs can have member functions, constructors, destructors and private sections too.' },
        { text: '`struct` objects live on the stack and `class` objects on the heap', why: 'That is true of C#, not C++. In C++ an object\'s storage depends only on how you create it: a local variable is on the stack, `new` puts it on the heap — for either keyword.' },
        { text: 'Members of a `struct` are public by default; members of a `class` are private by default', correct: true, why: 'That (plus the matching default for inheritance) is the entire difference.' },
        { text: '`class` objects carry hidden extra data, so they are larger and slower', why: 'Neither keyword adds hidden data. (Virtual functions, in Unit 10, add a hidden pointer — to structs and classes alike.)' },
      ],
      explanation:
        'The two keywords define the same kind of type; only the default access differs. Choosing between them is about communicating intent: `struct` for passive data, `class` for types that protect their state.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Encapsulation and invariants: why private data?',
      blocks: [
        {
          type: 'p',
          text: 'A [[invariant]] is a rule that must hold for every valid object of a type: health is between 0 and the maximum; an inventory never holds more items than its capacity; a timer\'s remaining time is never negative. [[encapsulation|Encapsulation]] means hiding the data behind member functions that keep those rules true.',
        },
        {
          type: 'compare',
          left: {
            title: 'Public data: anyone can break it',
            tone: 'bad',
            code: `struct Inventory {
    std::vector<std::string> items;
    int capacity = 10;
};

// anywhere in a 500,000-line game:
bag.items.push_back("Anvil"); // over capacity?
bag.capacity = -3;            // nonsense`,
            text: 'Every line of the program can violate the rules, so a bug could be anywhere.',
          },
          right: {
            title: 'Private data: one place to check',
            tone: 'good',
            code: `class Inventory {
public:
    bool add(const std::string& item);
    int size() const;

private:
    std::vector<std::string> items;
    int capacity = 10;
};`,
            text: 'Only `add` and friends can change the data. If the invariant breaks, the bug is in a few dozen lines of `Inventory`.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why encapsulation pays off',
          text: 'Two reasons. **Debugging**: when an object is in an impossible state, you only have to inspect the class\'s own member functions, not the entire program. **Freedom to change**: because outside code only uses the public interface, you can later store items in a fixed array, add a weight limit or cache the count — and no caller has to change.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A vending machine',
          text: 'You press buttons and insert coins (the public interface). You cannot reach inside and rearrange the coin tubes or take a drink without paying (the private state). The machine\'s invariant — "money in the box matches drinks sold" — holds because the only way in is through the buttons.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Getters and setters are not automatically encapsulation',
          text: 'Making a member private and then adding `setHp(int)` that accepts any value gives you a public variable with extra typing. Design **operations** that preserve the rules — `takeDamage`, `heal`, `add` — and expose read-only queries such as `value()`. Ask "what can callers *do*?", not "which fields can they set?".',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Unreal lets designers edit properties in the editor and in Blueprints, which can tempt you to make everything public. Instead, keep the member private and add the `meta = (AllowPrivateAccess = "true")` metadata to its `UPROPERTY` ([[allow-private-access]]): Blueprints get access, while other C++ code still has to go through your functions.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: 'This fails to compile with "\'void Turret::fire()\' is private within this context". Tap the declaration that ended up in the wrong section.',
      code: `#include <iostream>

class Turret {
    int ammo = 3;
    void fire() {
        if (ammo > 0) {
            --ammo;
            std::cout << "Bang! " << ammo << " left\\n";
        }
    }
};

int main() {
    Turret t;
    t.fire();
}`,
      bugLines: [5],
      hint: 'What is the default access in a `class` when you write no specifier at all?',
      explanation:
        'In a `class`, everything before the first access specifier is private. Keeping `ammo` private is correct, but `fire` is meant to be the public interface. The compiler reports the error at the call on line 15, yet the fix belongs above line 5: insert `public:` so `fire` becomes callable while `ammo` stays protected. (Had this been a `struct`, both would have been public — including `ammo`.)',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Member functions inside and outside the class',
      blocks: [
        {
          type: 'p',
          text: 'Short member functions are usually defined right inside the class body; such functions are implicitly [[inline]]. Longer ones are typically only **declared** in the class and **defined** outside it, with the class name and the [[scope-resolution-operator|scope-resolution operator]] saying whose function it is: `bool Inventory::add(...)`.',
        },
        {
          type: 'code',
          title: 'inventory.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <vector>

class Inventory {
public:
    bool add(const std::string& item);   // declared here...
    void print() const;
    int size() const { return static_cast<int>(items.size()); }

private:
    std::vector<std::string> items;
    int capacity = 3;
};

// ...defined out here. Inventory:: says whose add() this is.
bool Inventory::add(const std::string& item) {
    if (size() >= capacity) {
        return false;                    // invariant: never overfill
    }
    items.push_back(item);
    return true;
}

void Inventory::print() const {
    for (const std::string& item : items) {
        std::cout << "- " << item << '\\n';
    }
}

int main() {
    Inventory bag;
    bag.add("Potion");
    bag.add("Sword");
    bag.add("Shield");
    if (!bag.add("Anvil")) {
        std::cout << "Bag full!\\n";
    }
    bag.print();
}`,
          output: 'Bag full!\n- Potion\n- Sword\n- Shield',
          annotations: [
            { lines: '7-8', text: 'Declarations only: the class body now reads like a table of contents of what an `Inventory` can do.' },
            { lines: 9, text: 'A one-liner defined in place. Fine for tiny accessors.' },
            { lines: 17, text: 'The `Inventory::` prefix makes this the member function declared on line 7. Inside it you can use private members (`items`, `capacity`) and other members (`size()`) directly.' },
            { lines: 25, text: 'The `const` must be repeated in the out-of-class definition; it is part of the function\'s signature.' },
          ],
        },
        {
          type: 'p',
          text: 'In a real project, the class definition goes in a [[header-file]] and the out-of-class definitions go in the matching `.cpp` file:',
        },
        {
          type: 'compare',
          left: {
            title: 'Inventory.h — the interface',
            tone: 'neutral',
            code: `#pragma once
#include <string>
#include <vector>

class Inventory {
public:
    bool add(const std::string& item);
    void print() const;
private:
    std::vector<std::string> items;
    int capacity = 3;
};`,
          },
          right: {
            title: 'Inventory.cpp — the implementation',
            tone: 'neutral',
            code: `#include "Inventory.h"
#include <iostream>

bool Inventory::add(const std::string& item) {
    // ...
}

void Inventory::print() const {
    // ...
}`,
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why split them?',
          text: 'Every file that uses `Inventory` includes the header, so the header should contain only what users need to see. Changing a function body in `Inventory.cpp` recompiles one file; changing the header recompiles every file that includes it — in a big game, that can be thousands. Splitting also lets readers grasp the interface at a glance.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Every Unreal class follows this split. `MyActor.h` declares the class (with its `UCLASS()` and `GENERATED_BODY()` macros), and `MyActor.cpp` defines the functions: `void AMyActor::BeginPlay() { Super::BeginPlay(); /* ... */ }`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'Class `Medic` declares `void heal(int amount);` in its body. Which out-of-class definition is correct?',
      codeOptions: true,
      options: [
        { text: 'void heal(int amount) { /* ... */ }', why: 'This defines an unrelated free function named `heal`. `Medic::heal` stays undefined, and calls to it fail at link time.' },
        { text: 'void Medic::heal(int amount) { /* ... */ }', correct: true, why: 'Return type first, then the qualified name `Medic::heal`, then the parameters — matching the declaration.' },
        { text: 'Medic::void heal(int amount) { /* ... */ }', why: 'The class qualifier belongs to the function name, not to the return type. This does not parse.' },
        { text: 'void Medic.heal(int amount) { /* ... */ }', why: '`.` accesses a member of an *object*. To name a member of a *class*, C++ uses `::`.' },
      ],
      explanation:
        'Out-of-class definitions use the [[scope-resolution-operator|scope-resolution operator]]: `ReturnType ClassName::functionName(params)`. Leaving out `Medic::` is a sneaky mistake, because it compiles — it simply defines a different function — and only the linker notices that `Medic::heal` was never defined.',
    },
  ],
  takeaways: [
    'A struct or class defines a new type that bundles data members (and functions); aggregates can be brace-initialized member by member, in declaration order.',
    'Use `.` on objects and references, `->` through pointers; `p->m` means `(*p).m`.',
    '`public` members form the interface; `private` members are reachable only from the class\'s own member functions — a compile-time check with no run-time cost.',
    'The only difference between `struct` and `class` is default access (public vs private); by convention `struct` is for plain data and `class` for types with invariants.',
    'Encapsulation protects invariants: with private data, only the class\'s member functions can break the rules, and its internals can change without affecting callers.',
    'Define short member functions in the class; declare longer ones there and define them outside as `Type ClassName::name(...)`, usually in a `.cpp` file.',
  ],
  reading: [
    {
      title: 'Classes',
      url: 'https://en.cppreference.com/w/cpp/language/classes',
      source: 'cppreference',
      note: 'The formal overview of class types, members and member functions.',
    },
    {
      title: 'Aggregate initialization',
      url: 'https://en.cppreference.com/w/cpp/language/aggregate_initialization',
      source: 'cppreference',
      note: 'Exactly what counts as an aggregate, and the rules for designated initializers.',
    },
    {
      title: 'Public and private members and access specifiers',
      url: 'https://www.learncpp.com/cpp-tutorial/public-and-private-members-and-access-specifiers/',
      source: 'learncpp',
      note: 'A friendly walkthrough of access control with more examples.',
    },
    {
      title: 'C++ Core Guidelines: Classes and class hierarchies',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-class',
      source: 'core-guidelines',
      note: 'See C.2 and C.8 for when to choose `struct` versus `class`.',
    },
  ],
};
