import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-constructors',
  title: 'Constructors and Member Initializer Lists',
  summary: 'Making objects valid from the first instant: constructors, initializer lists, default member initializers, delegation, explicit and = default.',
  minutes: 19,
  objectives: [
    'Write default and parameterized constructors and predict which one an object creation calls',
    'Use member initializer lists, and explain the difference between initialization and assignment',
    'Explain why const and reference members must be initialized in the list, and why initialization follows declaration order',
    'Use default member initializers, `= default` and delegating constructors to avoid duplication',
    'Mark single-argument constructors `explicit` to prevent surprising implicit conversions',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Constructors: objects that start valid',
      blocks: [
        {
          type: 'p',
          text: 'Last lesson\'s `Health` class protected its invariant with private data. But how does an object get valid data in the first place? With a [[constructor]]: a special member function that has the same name as the class, no return type (not even `void`), and runs **automatically** every time an object of the class is created.',
        },
        {
          type: 'code',
          title: 'weapon.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

class Weapon {
public:
    Weapon() {                               // default constructor
        name = "Fists";
        damage = 1;
    }
    Weapon(const std::string& n, int dmg) {  // parameterized
        name = n;
        damage = dmg < 0 ? 0 : dmg;          // enforce the invariant
    }
    void describe() const {
        std::cout << name << " deals " << damage << '\\n';
    }

private:
    std::string name;
    int damage;
};

int main() {
    Weapon unarmed;                     // calls Weapon()
    Weapon sword{"Sword", 12};          // calls Weapon(string, int)
    Weapon cursed{"Cursed Blade", -5};  // invariant still holds
    unarmed.describe();
    sword.describe();
    cursed.describe();
}`,
          output: 'Fists deals 1\nSword deals 12\nCursed Blade deals 0',
          annotations: [
            { lines: '6-9', text: 'A [[default-constructor]] can be called with no arguments. It runs for `Weapon unarmed;`.' },
            { lines: '10-13', text: 'Constructors can be overloaded like any function. This one takes the name and damage, and clamps negative damage so no `Weapon` can ever be invalid.' },
            { lines: '24-26', text: 'Overload resolution picks the constructor from the arguments, just as for ordinary functions.' },
          ],
        },
        {
          type: 'p',
          text: 'If a class declares **no** constructors, the compiler writes an implicit default constructor for you (which leaves members like `int damage` uninitialized). As soon as you declare **any** constructor, that implicit one is no longer generated — the compiler assumes you now control how objects are made.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why constructors?',
          text: 'In C you would write `Weapon w; initWeapon(&w, "Sword", 12);` — and sooner or later someone forgets the second line, and uses a half-made object. A constructor makes creation and initialization **one indivisible step**: no code can ever observe a `Weapon` whose invariant does not hold yet. This guarantee is the foundation everything else in this unit builds on.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: '`Weapon w();` is not an object',
          text: 'Empty parentheses do not mean "use the default constructor" in a declaration. `Weapon w();` declares a **function** named `w` that returns a `Weapon` — the infamous [[most-vexing-parse]]. Write `Weapon w;` or `Weapon w{};` instead.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'A class `Weapon` declares only one constructor, `Weapon(const std::string& n, int dmg)`. What happens with `Weapon w;`?',
      options: [
        { text: 'It compiles, and `damage` holds garbage', why: 'That would happen with an implicit default constructor — but the compiler stops generating one as soon as you declare any constructor.' },
        { text: 'It compiles, and the compiler fills in an empty name and zero damage', why: 'The compiler never invents argument values for your constructors.' },
        { text: 'It declares a function named `w`', why: 'That is `Weapon w();` with parentheses — the most vexing parse. `Weapon w;` really does try to create an object.' },
        { text: 'Compile error: `Weapon` has no default constructor', correct: true, why: 'Declaring a constructor suppresses the implicit default constructor, so there is nothing to call without arguments.' },
      ],
      explanation:
        'Once you declare any constructor, you take over object creation and the implicit default constructor disappears. If a default makes sense, add one yourself — or bring the compiler\'s version back with `Weapon() = default;`, which you will see later in this lesson.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Member initializer lists: initialize, don\'t assign',
      blocks: [
        {
          type: 'p',
          text: 'The `Weapon` constructors above assign to the members in the body. But by the time the body runs, every member has **already** been initialized: `name` was constructed as an empty string, then overwritten. A [[member-initializer-list]] initializes each member directly with its final value. It goes after a colon, between the parameter list and the body:',
        },
        {
          type: 'compare',
          left: {
            title: 'Assigning in the body',
            tone: 'bad',
            code: `Weapon(const std::string& n, int dmg) {
    name = n;        // name was already ""
    damage = dmg;    // damage was garbage until now
}`,
            text: 'Every member is built first, then overwritten: two steps where one would do.',
          },
          right: {
            title: 'Initializing in the list',
            tone: 'good',
            code: `Weapon(const std::string& n, int dmg)
    : name{n}, damage{dmg < 0 ? 0 : dmg} {}`,
            text: 'Each member is created with its final value. The body is empty because there is nothing left to do.',
          },
        },
        {
          type: 'steps',
          items: [
            { title: 'Storage is obtained', text: 'Memory for the object is reserved — in a stack frame, on the heap, wherever the object lives. Nothing is initialized yet.' },
            { title: 'Members are initialized, in declaration order', text: 'Each member takes its value from the initializer list if it is mentioned there; otherwise from its default member initializer (later in this lesson); otherwise it is default-initialized — which leaves an `int` as garbage.' },
            { title: 'The constructor body runs', text: 'The object is now fully formed. The body can do extra work: logging, registering with a manager, validating.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Initialization vs assignment',
          text: 'C++ distinguishes giving an object its **first** value as it comes into existence (initialization) from **replacing** the value of an object that already exists (assignment). The initializer list is the only place where members are initialized; the body can only assign. For a `std::string` or `std::vector` member, assigning means constructing an empty object and then doing the real work again. For some members, as the next card shows, assignment is not even possible.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Does it matter for speed?',
          text: 'For `int` and `float` members, no — the optimizer produces the same code. For members that own resources (strings, vectors, your own classes), initializing directly avoids a wasted default construction followed by an assignment. Using the list everywhere is the simple, consistent habit, and the C++ Core Guidelines recommend it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'What must go in the list — and the order trap',
      blocks: [
        {
          type: 'p',
          text: 'Some members can **only** be initialized, never assigned, so they must appear in the initializer list: `const` members, reference members, and members whose type has no default constructor.',
        },
        {
          type: 'code',
          title: 'team.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

class Player {
public:
    Player(int id, const std::string& name, int& teamScore)
        : id{id}, name{name}, teamScore{teamScore} {}

    void scorePoints(int points) {
        teamScore += points;    // writes the team's shared total
        std::cout << name << " (#" << id << ") scores "
                  << points << '\\n';
    }

private:
    const int id;               // fixed for life
    std::string name;
    int& teamScore;             // must be bound at creation
};

int main() {
    int redTeam = 0;
    Player aria{1, "Aria", redTeam};
    Player bram{2, "Bram", redTeam};
    aria.scorePoints(3);
    bram.scorePoints(5);
    std::cout << "Red team: " << redTeam << '\\n';
}`,
          output: 'Aria (#1) scores 3\nBram (#2) scores 5\nRed team: 8',
          annotations: [
            { lines: 7, text: 'In `id{id}`, the name outside the braces is always the member; inside the braces the parameter [[shadowing|shadows]] it. So this initializes the member from the parameter. Legal and common, though some codebases prefer distinct names (Unreal uses an `In` prefix: `InName`).' },
            { lines: 16, text: 'A `const` member gets its value once, at construction. `id = 5;` in the body would not compile.' },
            { lines: 18, text: 'A reference must be bound when it is created and can never be reseated, so the initializer list is the only place to bind it.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Both players\' reference members alias the same `redTeam`. A reference member is usually stored as a hidden pointer.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [{ id: 'red', name: 'redTeam', type: 'int', value: '8', address: '0xff7c', highlight: true }],
            },
            {
              label: 'Stack — main(): aria (Player)',
              kind: 'stack',
              cells: [
                { name: 'id', type: 'const int', value: '1' },
                { name: 'name', type: 'std::string', value: '"Aria"' },
                { name: 'teamScore', type: 'int&', value: '→ redTeam', pointsTo: 'red' },
              ],
            },
            {
              label: 'Stack — main(): bram (Player)',
              kind: 'stack',
              cells: [
                { name: 'id', type: 'const int', value: '2' },
                { name: 'name', type: 'std::string', value: '"Bram"' },
                { name: 'teamScore', type: 'int&', value: '→ redTeam', pointsTo: 'red' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Members are initialized in declaration order — not list order',
          text: 'Whatever order you write in the initializer list, members are always initialized in the order they are **declared in the class**. If one member\'s initializer reads another member declared *later*, it reads an uninitialized value. GCC and Clang warn about a mismatched order (`-Wreorder`, part of `-Wall`). Habit: write the list in declaration order, and initialize from parameters rather than from other members.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'A cost of const and reference members',
          text: 'Objects with `const` or reference members cannot be assigned: `aria = bram;` does not compile, because assignment would have to change a `const` or reseat a reference. That is why the C++ Core Guidelines advise against such members in types you want to copy or assign; a private non-const member with only a getter often expresses "read-only to the outside" just as well.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'bug',
      prompt: 'This is supposed to print `100/100`, but prints a garbage number for the current value. Tap the line(s) responsible.',
      code: `#include <iostream>

class HealthBar {
public:
    HealthBar(int max)
        : maxHp{max}, current{maxHp} {}
    void print() const {
        std::cout << current << '/' << maxHp << '\\n';
    }

private:
    int current;
    int maxHp;
};

int main() {
    HealthBar bar{100};
    bar.print();
}`,
      bugLines: [6, 12],
      hint: 'In which order are members initialized?',
      explanation:
        '`current` is declared before `maxHp`, so it is initialized **first** — from `maxHp`, which has not been initialized yet. The order written in the list (line 6) is irrelevant. The result is an indeterminate value (and technically undefined behavior). Fix it by initializing from the parameter, `current{max}`, or by declaring `maxHp` first. GCC flags this with `-Wall`: "\'HealthBar::maxHp\' will be initialized after \'int HealthBar::current\'" and "member \'HealthBar::maxHp\' is used uninitialized".',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Default member initializers and = default',
      blocks: [
        {
          type: 'p',
          text: 'When several constructors share default values, repeating them in every initializer list invites mistakes. A [[default-member-initializer]] puts the default right on the member declaration. Any constructor that does not mention the member in its list uses it; a constructor that does mention it overrides it.',
        },
        {
          type: 'code',
          title: 'defaults.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

class Enemy {
public:
    Enemy() = default;                     // all defaults
    Enemy(const std::string& n) : name{n} {}
    Enemy(const std::string& n, int startHp)
        : name{n}, hp{startHp} {}

    void print() const {
        std::cout << name << ": " << hp << " HP, speed "
                  << speed << '\\n';
    }

private:
    std::string name{"Grunt"};
    int hp = 50;
    float speed = 3.5f;
};

int main() {
    Enemy a;
    Enemy b{"Scout"};
    Enemy c{"Brute", 200};
    a.print();
    b.print();
    c.print();
}`,
          output: 'Grunt: 50 HP, speed 3.5\nScout: 50 HP, speed 3.5\nBrute: 200 HP, speed 3.5',
          annotations: [
            { lines: 6, text: '`= default` asks the compiler to generate the default constructor. It initializes every member from its default member initializer.' },
            { lines: 7, text: 'Overrides only `name`; `hp` and `speed` still get their defaults.' },
            { lines: '8-9', text: 'Overrides `name` and `hp`. The list always wins over the default.' },
            { lines: '17-19', text: 'One source of truth for every default. A new member added later with a default is automatically handled by all three constructors.' },
          ],
        },
        {
          type: 'p',
          text: 'A function written as `= default` is a [[defaulted-function|defaulted function]]: "give me the version you would normally generate". Its counterpart `= delete` removes a function entirely, so any call is a compile error — you will use that in Unit 11 to forbid copying.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why prefer `= default` to an empty body `{}`?',
          text: 'Both compile here, but `= default` states your intent: "nothing special happens". It also lets the compiler keep the class **trivially constructible** when the members allow it, and automatically makes it `constexpr` and `noexcept` where possible — properties a hand-written `{}` loses. Rule of thumb: when a constructor would only set constant defaults, use default member initializers plus `= default`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Never forget a member again',
          text: 'A classic bug: a class gains a new `int` member, one of its five constructors forgets to initialize it, and objects created that way hold garbage. Giving every member a default member initializer — even just `int kills = 0;` — makes that bug impossible.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'fill',
      prompt: 'Complete the class: the first constructor uses an initializer list, the default constructor should use the member defaults, and `max` must never change after construction.',
      template: `class Shield {
public:
    Shield(int maxDurability)
        ___ durability{maxDurability}, max{maxDurability} {}
    Shield() = ___;

private:
    int durability = 100;
    ___ int max = 100;
};`,
      blanks: [{ answers: [':'] }, { answers: ['default'] }, { answers: ['const'] }],
      wordBank: [':', '::', 'default', 'delete', 'const', 'static', 'mutable'],
      explanation:
        'A member initializer list starts with a single colon (`::` is the scope-resolution operator). `= default` brings back the compiler-generated default constructor, which uses the default member initializers; `= delete` would forbid default construction instead. A `const` member can be set only by initialization — by the list in the first constructor, or by its default member initializer in the second.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'explicit: no surprise conversions',
      blocks: [
        {
          type: 'p',
          text: 'A constructor callable with a single argument doubles as a **conversion** from that argument\'s type — a [[converting-constructor]]. The compiler will use it silently whenever it needs your class type but has the argument type:',
        },
        {
          type: 'code',
          title: 'surprise.cpp',
          runnable: true,
          code: `#include <iostream>

class Inventory {
public:
    Inventory(int capacity) : capacity{capacity} {}  // not explicit
    int slots() const { return capacity; }

private:
    int capacity;
};

void printSlots(const Inventory& inv) {
    std::cout << inv.slots() << " slots\\n";
}

int main() {
    Inventory bag{20};
    printSlots(bag);
    printSlots(8);     // compiles?! builds a temporary Inventory{8}
}`,
          output: '20 slots\n8 slots',
          annotations: [
            { lines: 5, text: 'Because this constructor takes one `int`, it also defines an [[implicit-conversion]] from `int` to `Inventory`.' },
            { lines: 19, text: 'The compiler quietly creates a temporary 8-slot inventory, passes it, and destroys it. Did the author really mean that? Probably not.' },
          ],
        },
        {
          type: 'p',
          text: 'Marking the constructor [[explicit]] forbids those implicit conversions. You can still construct objects directly; you just have to say so:',
        },
        {
          type: 'compare',
          left: {
            title: 'Implicit',
            tone: 'bad',
            code: `Inventory(int capacity);

printSlots(8);        // compiles silently
Inventory bag = 8;    // compiles`,
            text: 'An `int` can turn into an `Inventory` anywhere, unannounced.',
          },
          right: {
            title: 'explicit',
            tone: 'good',
            code: `explicit Inventory(int capacity);

printSlots(8);              // error
printSlots(Inventory{8});   // OK: intent visible
Inventory bag{8};           // OK`,
            text: 'Object creation happens only where the code visibly asks for it.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why implicit conversions bite',
          text: 'They hide object creation and can steer overload resolution somewhere unexpected. Imagine `void setCooldown(Seconds s)` with a non-explicit `Seconds(float)`: a call `setCooldown(500)` written by someone thinking in milliseconds compiles happily and gives an eight-minute cooldown. The C++ Core Guidelines therefore say: declare single-argument constructors `explicit` by default, and only leave a conversion implicit when it is natural and lossless — as `std::string` does deliberately for `const char*`.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Unreal\'s math types use `explicit` for exactly this reason: `FVector`\'s single-scalar constructor is explicit, so `FVector Offset = 1.0f;` does not compile — you must write `FVector Offset(1.0f);`, which visibly sets all three components to 1.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'Given `class Timer { public: explicit Timer(float seconds); };` and `void start(Timer t);`, which call compiles?',
      codeOptions: true,
      options: [
        { text: 'start(3.0f);', why: 'Converting `3.0f` to a `Timer` implicitly is exactly what `explicit` forbids.' },
        { text: 'Timer t = 3.0f;', why: 'The `=` form (copy-initialization) also needs an implicit conversion, so it is rejected.' },
        { text: 'start({3.0f});', why: 'Initializing a parameter from a braced list is copy-list-initialization, which may not use an explicit constructor. GCC: "converting to \'Timer\' from initializer list would use explicit constructor".' },
        { text: 'start(Timer{3.0f});', correct: true, why: 'Direct construction names the type, so the explicit constructor is allowed; the resulting `Timer` is then passed.' },
      ],
      explanation:
        '`explicit` constructors may only be used where the code names the type: `Timer t{3.0f};`, `Timer t(3.0f);`, `Timer{3.0f}`. Anything that would create a `Timer` behind your back — passing a float, `=`-initialization, or a bare braced list — is rejected.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Delegating constructors',
      blocks: [
        {
          type: 'p',
          text: 'Several constructors often share setup and validation. Instead of duplicating it, a constructor can hand the work to another constructor of the same class by naming it in its initializer list. This is a [[delegating-constructor]]. The target runs **completely** — members initialized, body executed — before the delegating constructor\'s own body runs.',
        },
        {
          type: 'code',
          title: 'delegate.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

class Enemy {
public:
    Enemy(const std::string& n, int startHp)
        : name{n}, hp{startHp < 1 ? 1 : startHp} {
        std::cout << "Spawned " << name << " (" << hp << " HP)\\n";
    }
    explicit Enemy(const std::string& n) : Enemy{n, 50} {
        std::cout << "  ...with default HP\\n";
    }
    Enemy() : Enemy{"Grunt"} {}

private:
    std::string name;
    int hp;
};

int main() {
    Enemy boss{"Dragon", 900};
    Enemy scout{"Scout"};
    Enemy grunt;
    Enemy glitch{"Glitch", -20};
}`,
          output: 'Spawned Dragon (900 HP)\nSpawned Scout (50 HP)\n  ...with default HP\nSpawned Grunt (50 HP)\n  ...with default HP\nSpawned Glitch (1 HP)',
          annotations: [
            { lines: '6-9', text: 'The "main" constructor: the only place that initializes members and validates `hp`.' },
            { lines: 10, text: 'Delegates to the main constructor with a default HP. Its body runs **after** the target has finished — which is why "...with default HP" prints second.' },
            { lines: 13, text: 'Delegation can chain: `Enemy()` → `Enemy(name)` → `Enemy(name, hp)`.' },
            { lines: 24, text: 'All paths share the same validation, so even nonsense input produces a valid enemy.' },
          ],
        },
        {
          type: 'list',
          items: [
            'If a constructor delegates, the delegation must be the **only** entry in its initializer list. The target is responsible for all members.',
            'Do not create cycles (A delegates to B, B delegates to A): that is undefined behavior, typically infinite recursion.',
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Before C++11',
          text: 'Delegating constructors arrived in C++11. Older code shares setup through a private `init()` function called from every constructor body — which can only *assign* members, not initialize them, so it cannot handle `const` or reference members. When you meet `init()` in legacy code, delegation is usually the modern replacement.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'order',
      prompt: 'Put the output lines in the order this program prints them.',
      code: `struct Probe {
    Probe() { std::cout << "member ready\\n"; }
};

class Turret {
public:
    Turret(int ammo, float range) : ammo{ammo}, range{range} {
        std::cout << "full ctor\\n";
    }
    explicit Turret(int ammo) : Turret{ammo, 10.0f} {
        std::cout << "ammo ctor\\n";
    }
    Turret() : Turret{50} {
        std::cout << "default ctor\\n";
    }

private:
    Probe probe;
    int ammo;
    float range;
};

int main() {
    Turret t;
}`,
      lines: ['member ready', 'full ctor', 'ammo ctor', 'default ctor'],
      explanation:
        '`Turret()` delegates to `Turret(int)`, which delegates to `Turret(int, float)`. Only that last constructor initializes members, so `probe` is constructed first ("member ready"), then its body prints "full ctor". Control then returns outward: the `Turret(int)` body runs, and finally the `Turret()` body. Bodies of delegating constructors always run after their target has completely finished.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'truefalse',
      prompt: 'A constructor can delegate to another constructor and also initialize some extra members in the same initializer list.',
      answer: false,
      explanation:
        'When a constructor delegates, the delegation must be the only item in its initializer list — the target constructor already initializes every member, and initializing one twice is not allowed. If the delegating constructor needs a different value, pass it to the target as an argument, or adjust it in the body afterwards.',
    },
  ],
  takeaways: [
    'A constructor has the class\'s name and no return type, and runs automatically whenever an object is created; declaring any constructor suppresses the implicit default constructor.',
    'Members are initialized before the constructor body runs; the member initializer list initializes them directly, while the body can only assign.',
    '`const` members, reference members and members without a default constructor must be initialized in the list.',
    'Members are initialized in declaration order, whatever order the list is written in — never initialize one member from a later one.',
    'Default member initializers keep defaults in one place; `= default` asks for the compiler-generated version, `= delete` forbids a function.',
    'Delegating constructors funnel creation through one constructor; `explicit` stops single-argument constructors from acting as silent conversions.',
  ],
  reading: [
    {
      title: 'Constructors and member initializer lists',
      url: 'https://en.cppreference.com/w/cpp/language/constructor',
      source: 'cppreference',
      note: 'The full rules, including initialization order and delegating constructors.',
    },
    {
      title: 'explicit specifier',
      url: 'https://en.cppreference.com/w/cpp/language/explicit',
      source: 'cppreference',
      note: 'Exactly which initializations an explicit constructor allows.',
    },
    {
      title: 'Constructor member initializer lists',
      url: 'https://www.learncpp.com/cpp-tutorial/constructor-member-initializer-lists/',
      source: 'learncpp',
      note: 'More practice with initializer lists and the declaration-order rule.',
    },
    {
      title: 'C++ Core Guidelines: Constructors, assignments and destructors',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-ctor',
      source: 'core-guidelines',
      note: 'See C.46 (explicit), C.47 (order), C.48 (default member initializers) and C.49 (initialize, don\'t assign).',
    },
  ],
};
