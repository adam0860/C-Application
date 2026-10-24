import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'aggregate-type',
    term: 'Aggregate',
    aliases: ['aggregate initialization', 'aggregate type'],
    course: 'cpp',
    category: 'OOP',
    short:
      'An array, or a struct/class with all-public data members, no user-declared constructors and no virtual functions. Aggregates can be initialized directly from a braced list of member values.',
    long:
      'Aggregate initialization assigns the listed values to the members in declaration order. Members not covered by the list use their default member initializer if they have one, and are otherwise value-initialized (zero for numbers). Declaring any constructor (in C++20, even `= default`) makes a type stop being an aggregate.',
    example: `struct Enemy { std::string name; int hp; float x, y; };
Enemy goblin{"Goblin", 30, 2.5f, -1.0f};
Enemy bat{"Bat", 5};   // x and y become 0.0f`,
    see: ['struct', 'brace-initialization', 'designated-initializer'],
    reading: [
      {
        title: 'Aggregate initialization',
        url: 'https://en.cppreference.com/w/cpp/language/aggregate_initialization',
        source: 'cppreference',
      },
    ],
  },
  {
    id: 'designated-initializer',
    term: 'Designated Initializer',
    aliases: ['designated initializers'],
    course: 'cpp',
    category: 'OOP',
    short:
      'C++20 syntax that names the members being initialized in an aggregate: `Enemy orc{.name = "Orc", .hp = 80};`. The names must appear in declaration order.',
    long:
      'Designated initializers make aggregate initialization self-documenting and robust against confusing two members of the same type. Unlike C, C++ requires the designators to follow the members\' declaration order and does not allow mixing designated and positional initializers. Members left out are initialized as usual (default member initializer, or zero).',
    example: `struct SpawnParams { int count = 1; bool elite = false; };
SpawnParams wave{.count = 6, .elite = true};`,
    see: ['aggregate-type', 'brace-initialization'],
  },
  {
    id: 'member-access-operators',
    term: 'Member Access Operators (. and ->)',
    aliases: ['dot operator', 'arrow operator', '->'],
    course: 'cpp',
    category: 'OOP',
    short:
      '`obj.member` selects a member of an object (or of the object a reference refers to); `ptr->member` follows a pointer and then selects the member. `p->m` means `(*p).m`.',
    long:
      'The arrow exists because `.` has higher precedence than unary `*`: `*p.m` would parse as `*(p.m)`. Classes can overload `->`, which is how smart pointers and iterators let you write `sp->member`.',
    example: `Player hero{"Aria", 100};
Player* p = &hero;
hero.hp -= 10;   // object: dot
p->hp -= 10;     // pointer: arrow`,
    see: ['pointer', 'reference', 'precedence'],
  },
  {
    id: 'default-member-initializer',
    term: 'Default Member Initializer',
    aliases: ['in-class member initializer', 'NSDMI'],
    course: 'cpp',
    category: 'OOP',
    short:
      'An initial value written directly on a data member in the class definition, such as `int hp = 100;`. It is used by every constructor that does not initialize that member in its member initializer list.',
    long:
      'Default member initializers keep default values in one place instead of repeating them in every constructor. If a constructor\'s member initializer list mentions the member, the list wins and the default is ignored for that constructor. They work for aggregates too.',
    example: `class Enemy {
    std::string name{"Grunt"};
    int hp = 50;
    bool aggressive = true;
};`,
    see: ['constructor', 'member-initializer-list', 'initialization'],
  },
  {
    id: 'delegating-constructor',
    term: 'Delegating Constructor',
    course: 'cpp',
    category: 'OOP',
    short:
      'A constructor whose member initializer list consists of a call to another constructor of the same class, such as `Enemy() : Enemy{"Grunt", 50} {}`. The target constructor runs completely first, then the delegating constructor\'s body.',
    long:
      'Delegation (C++11) removes duplicated initialization and validation code: every constructor can funnel into one "main" constructor. A delegating constructor may not initialize any members itself — the delegation must be the only item in its initializer list.',
    example: `class Enemy {
public:
    Enemy(const std::string& n, int hp) : name{n}, hp{hp} {}
    Enemy() : Enemy{"Grunt", 50} {}
private:
    std::string name;
    int hp;
};`,
    see: ['constructor', 'member-initializer-list'],
  },
  {
    id: 'converting-constructor',
    term: 'Converting Constructor',
    aliases: ['implicit constructor', 'converting constructors'],
    course: 'cpp',
    category: 'OOP',
    short:
      'Any constructor not marked `explicit` that can be called with a single argument. The compiler may use it silently to convert that argument type into the class type, for example turning `8` into an `Inventory{8}`.',
    long:
      'Implicit conversions are convenient for value types where the conversion is natural and lossless, but surprising elsewhere: a function taking `const Inventory&` would accept a bare `int`. Mark single-argument constructors `explicit` unless you deliberately want the conversion.',
    example: `class Inventory {
public:
    Inventory(int capacity);          // converting
};
void show(const Inventory& inv);
show(8);   // compiles: builds a temporary Inventory{8}`,
    see: ['explicit', 'implicit-conversion', 'constructor'],
  },
  {
    id: 'defaulted-function',
    term: 'Defaulted Function (= default)',
    aliases: ['= default', 'defaulted constructor'],
    course: 'cpp',
    category: 'OOP',
    short:
      'A special member function declared with `= default`, asking the compiler to generate its usual implementation — for example a default constructor that uses the default member initializers.',
    long:
      '`= default` states intent more clearly than an empty body `{}`, and a function defaulted on its first declaration can stay trivial (as cheap as for a plain struct) and `constexpr`/`noexcept` when the members allow it. Its sibling `= delete` removes a function entirely, so calling it is a compile error. In C++20, `operator==` and `operator<=>` can also be defaulted.',
    example: `class Shield {
public:
    Shield() = default;        // use member defaults
    explicit Shield(int d) : durability{d} {}
private:
    int durability = 100;
};`,
    see: ['default-constructor', 'special-member-functions', 'default-member-initializer'],
  },
  {
    id: 'most-vexing-parse',
    term: 'Most Vexing Parse',
    course: 'cpp',
    category: 'OOP',
    short:
      'The rule that anything that can be read as a function declaration is one: `Weapon w();` declares a function named `w` returning a `Weapon`, rather than creating a default-constructed object.',
    long:
      'The name comes from Scott Meyers. It typically bites when you add empty parentheses to request default construction, or when a constructor argument is itself a temporary created with parentheses. Brace initialization avoids it: `Weapon w{};` and `Weapon w;` both create an object.',
    example: `Weapon a;     // object, default constructor
Weapon b{};   // object, value-initialized
Weapon c();   // function declaration!`,
    see: ['brace-initialization', 'default-constructor'],
  },
  {
    id: 'method-chaining',
    term: 'Method Chaining',
    aliases: ['fluent interface', 'chaining'],
    course: 'cpp',
    category: 'OOP',
    short:
      'Calling several member functions in one expression, `obj.a().b().c()`, made possible by each function returning a reference to the same object (`return *this;`).',
    long:
      'The functions must return by **reference** (`T&`). Returning by value makes each later call operate on a temporary copy, so its changes are silently lost. Stream insertion (`std::cout << a << b`) is the most familiar example: each `<<` returns the stream by reference.',
    example: `SpawnRequest& count(int n) { amount = n; return *this; }
// ...
wave.type("skeleton").count(6).elite(true);`,
    see: ['this-pointer', 'reference', 'operator-overloading'],
  },
  {
    id: 'mutable-member',
    term: 'mutable',
    aliases: ['mutable member', 'mutable keyword'],
    course: 'cpp',
    category: 'OOP',
    short:
      'A specifier for a data member that may be modified even inside `const` member functions and in `const` objects. Used for internal bookkeeping such as caches, which do not change the object\'s observable state.',
    long:
      'C++ distinguishes **bitwise** constness (no byte changes) from **logical** constness (nothing a caller can observe changes). `mutable` lets a class be logically const while updating a cache or a statistics counter. Because the standard library assumes `const` member functions are safe to call from several threads at once, mutable data that changes in a const function usually needs synchronization (a mutex or an atomic). (Lambdas reuse the keyword with a different meaning.)',
    example: `class Leaderboard {
public:
    int best() const;            // may refresh the cache
private:
    std::vector<int> scores;
    mutable int cachedBest = 0;
    mutable bool cacheValid = false;
};`,
    see: ['const-member-function', 'const'],
  },
  {
    id: 'named-constructor',
    term: 'Named Constructor (Factory Function)',
    aliases: ['factory function', 'static factory', 'named constructor idiom'],
    course: 'cpp',
    category: 'OOP',
    short:
      'A `static` member function that creates and returns an object, giving the creation a descriptive name: `Item::makePotion()` instead of `Item{"Potion", 25}`.',
    long:
      'Named constructors make call sites read like intent, can choose between several configurations, and can validate input before constructing. Making the real constructors `private` forces all creation to go through them. Because a static member function has no `this`, it can be called without an existing object.',
    example: `class Item {
public:
    static Item makePotion() { return Item{"Potion", 25}; }
private:
    Item(const std::string& name, int price);
};`,
    see: ['static-member', 'constructor'],
  },
  {
    id: 'free-function',
    term: 'Free Function (Non-Member Function)',
    aliases: ['non-member function', 'free functions'],
    course: 'cpp',
    category: 'OOP',
    short:
      'A function that is not a member of any class. Free functions that work through a class\'s public interface keep the class smaller and better encapsulated, and symmetric operators like `a + b` are usually written as free functions.',
    long:
      'Guideline: make a function a member only if it needs access to the class\'s private representation. Everything else can be a free function in the same namespace, which reduces the code that could break the class\'s invariants. Binary operators are typically free so that implicit conversions apply equally to both operands, and so that the left operand need not be your type (`2.0f * v`, `std::cout << v`).',
    example: `class Vec2 { /* ... */ };
Vec2 operator+(Vec2 lhs, const Vec2& rhs);  // free
float length(const Vec2& v);                // free helper`,
    see: ['member-function', 'operator-overloading', 'encapsulation'],
  },
  {
    id: 'hidden-friend',
    term: 'Hidden Friend',
    course: 'cpp',
    category: 'OOP',
    short:
      'A `friend` function defined inside a class body. It is not a member, can access private members, and is found only through argument-dependent lookup — i.e. only when one of its arguments is of that class type.',
    long:
      'Hidden friends are the recommended way to write operators such as `operator<<` and `operator==` for a class: they sit next to the class they belong to, can read private data without public getters, and do not clutter overload resolution for unrelated types, which also speeds up compilation and improves error messages.',
    example: `class Item {
    friend std::ostream& operator<<(std::ostream& os,
                                    const Item& it) {
        return os << it.name;
    }
    std::string name;
};`,
    see: ['friend', 'operator-overloading', 'argument-dependent-lookup'],
  },
];
