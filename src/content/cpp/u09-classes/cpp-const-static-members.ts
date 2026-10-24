import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-const-static-members',
  title: 'const Member Functions and static Members',
  summary: 'Promising not to modify (`const` member functions and `mutable`), and members that belong to the class rather than to any one object (`static`).',
  minutes: 17,
  objectives: [
    'Mark member functions `const`, and explain why const objects and const references can only call const members',
    'Overload a member function on `const` to offer read-only and writable access',
    'Use `mutable` for caches and bookkeeping that do not change an object\'s observable state',
    'Declare and define static data members, including C++17 `inline static`, and explain where they live',
    'Write static member functions, explain why they have no `this`, and choose between member, static and free functions',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'const member functions: a promise not to modify',
      blocks: [
        {
          type: 'p',
          text: 'You have been writing `int value() const` since the first class in this unit. Time to see why. A [[const-member-function]] has `const` after its parameter list. Inside it, `this` has type `const Player*`, so every data member is read-only: assigning to one is a compile error.',
        },
        {
          type: 'code',
          title: 'status.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

class Player {
public:
    Player(const std::string& n, int hp) : name{n}, hp{hp} {}

    const std::string& getName() const { return name; }
    int getHp() const { return hp; }
    bool isAlive() const { return hp > 0; }

    void takeDamage(int amount) { hp -= amount; }   // modifies

private:
    std::string name;
    int hp;
};

void printStatus(const Player& p) {     // read-only access
    std::cout << p.getName() << ": " << p.getHp()
              << (p.isAlive() ? " (alive)" : " (down)") << '\\n';
    // p.takeDamage(5);   // error: takeDamage is not const
}

int main() {
    Player hero{"Aria", 40};
    printStatus(hero);
    hero.takeDamage(50);
    printStatus(hero);
}`,
          output: 'Aria: 40 (alive)\nAria: -10 (down)',
          annotations: [
            { lines: 8, text: 'Returns a `const` reference: no copy of the string, and callers cannot modify it. A `const` function may not return a non-const reference to a member — that would hand out write access it promised not to use.' },
            { lines: '9-10', text: 'Queries are `const`. If they tried to change `hp`, the compiler would refuse.' },
            { lines: 12, text: 'Commands that change state are not `const` — and therefore cannot be called through a `const Player&`.' },
            { lines: 19, text: 'A [[const-reference|const reference]] parameter: the standard way to pass an object you only read.' },
            { lines: 22, text: 'Through `const Player&`, only `const` member functions are callable. Uncommenting this line breaks the build.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why const member functions matter',
          text: 'Read-only access is everywhere: `const Player&` parameters, `const` objects, pointers to const. Through any of them, the compiler only allows calls it can prove will not modify the object — and the only proof it accepts is the `const` on the member function. A getter without `const` is therefore useless to every function that takes a const reference. The C++ Core Guidelines put it simply: make member functions `const` by default.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Recognize the error message',
          text: 'Calling a non-const member function on a const object produces messages like GCC\'s "passing \'const Player\' as \'this\' argument discards qualifiers". Translation: "you called a function that might modify the object, on an object you promised not to modify". The fix is almost always to add `const` to the member function — not to remove it from the parameter.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'bug',
      prompt: 'This program fails to compile at the call inside `show`. Tap the line that should be fixed.',
      code: `#include <iostream>

class Score {
public:
    int value() { return points; }
    void add(int p) { points += p; }

private:
    int points = 0;
};

void show(const Score& s) {
    std::cout << s.value() << '\\n';
}

int main() {
    Score s;
    s.add(250);
    show(s);
}`,
      bugLines: [5],
      hint: 'What does the compiler need to know about `value()` before allowing it on a `const Score&`?',
      explanation:
        '`show` correctly takes a `const Score&`, but `value()` is not marked `const`, so the compiler must assume it could modify the object and rejects the call on line 13 ("discards qualifiers"). The real bug is on line 5: a pure query should be declared `int value() const`. Removing `const` from `show`\'s parameter would also compile, but it would spread the mistake to every caller.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'const objects and overloading on const',
      blocks: [
        {
          type: 'p',
          text: 'Objects can be declared `const` too: `const Player boss{"Lich", 900};` can never be modified after construction, so only its `const` member functions may be called. The rule is the same for every read-only access path:',
        },
        {
          type: 'table',
          headers: ['Accessed through', 'Non-const members callable?', 'const members callable?'],
          rows: [
            ['A non-const object, `T&` or `T*`', 'Yes', 'Yes'],
            ['A `const` object, `const T&` or `const T*`', 'No', 'Yes'],
          ],
        },
        {
          type: 'p',
          text: 'Because `const` is part of a member function\'s signature, you can **overload** on it: one version for non-const objects that grants write access, and one for const objects that only grants read access. The standard library does this everywhere — `std::vector`\'s `operator[]` returns `T&` on a non-const vector and `const T&` on a const one.',
        },
        {
          type: 'code',
          title: 'slots.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <vector>

class Inventory {
public:
    std::string& slot(int i) { return items[i]; }
    const std::string& slot(int i) const { return items[i]; }

private:
    std::vector<std::string> items{"Sword", "Potion"};
};

void inspect(const Inventory& inv) {
    std::cout << inv.slot(0) << '\\n';   // picks the const version
    // inv.slot(0) = "Junk";            // error: returns const&
}

int main() {
    Inventory bag;
    bag.slot(1) = "Hi-Potion";          // non-const version: writable
    std::cout << bag.slot(1) << '\\n';
    inspect(bag);
}`,
          output: 'Hi-Potion\nSword',
          annotations: [
            { lines: 7, text: 'Called on non-const objects. Returning `std::string&` lets callers assign through it.' },
            { lines: 8, text: 'Called on const objects (and through const references). Returning `const std::string&` keeps the promise.' },
            { lines: 15, text: 'Overload resolution picks the version that matches the constness of the object: here, the const one.' },
            { lines: 21, text: '`bag` is not const, so the writable version is chosen and the assignment changes the inventory.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Engine getters are `const` member functions — `AActor::GetActorLocation() const`, `UObject::GetName() const` — so you can call them through `const AActor*`. Do the same in your own components: a `float GetHealth() const;` can be used from any read-only context, including other `const` functions.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'mutable: logically const, physically changing',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes a function is conceptually a read-only query but needs to update some internal bookkeeping — a cache, a lazily computed value, a statistics counter. A data member marked [[mutable-member|`mutable`]] may be modified even inside `const` member functions.',
        },
        {
          type: 'code',
          title: 'cache.cpp',
          runnable: true,
          code: `#include <iostream>
#include <vector>

class Leaderboard {
public:
    void addScore(int s) {
        scores.push_back(s);
        cacheValid = false;           // a write invalidates the cache
    }
    int best() const {
        if (!cacheValid) {
            std::cout << "(recomputing)\\n";
            cachedBest = 0;
            for (int s : scores) {
                if (s > cachedBest) {
                    cachedBest = s;
                }
            }
            cacheValid = true;        // allowed: the member is mutable
        }
        return cachedBest;
    }

private:
    std::vector<int> scores;
    mutable int cachedBest = 0;
    mutable bool cacheValid = false;
};

int main() {
    Leaderboard board;
    board.addScore(420);
    board.addScore(1337);
    std::cout << board.best() << '\\n';
    std::cout << board.best() << '\\n';   // served from the cache
    board.addScore(9001);
    std::cout << board.best() << '\\n';
}`,
          output: '(recomputing)\n1337\n1337\n(recomputing)\n9001',
          annotations: [
            { lines: 10, text: 'From the outside, `best()` is a pure query: calling it never changes what any caller can observe. So it is honestly `const`.' },
            { lines: '13-19', text: 'Internally it updates the cache. That compiles only because those two members are `mutable`.' },
            { lines: '26-27', text: '`mutable` opts these members out of constness. Everything else (`scores`) stays read-only inside `const` functions.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just drop const from best()?',
          text: 'Because then nobody holding a `const Leaderboard&` could ask for the best score — every read-only function in the program would lose access to a query that, from their point of view, changes nothing. C++ separates **bitwise** constness (no byte changes) from **logical** constness (no observable change). `mutable` lets a class be logically const while caching behind the scenes.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Two ways to misuse mutable',
          text: '**Abuse**: marking `hp` mutable so a "const" function can change it defeats the whole point — only state that callers cannot observe belongs in a mutable member. **Threads**: the standard library assumes `const` member functions are safe to call from several threads at once. A mutable cache updated inside one breaks that assumption unless it is protected by a mutex or an atomic (Unit 17).',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'mcq',
      prompt: 'Which of these is an appropriate use of `mutable`?',
      options: [
        { text: 'The player\'s HP, so that a `const` `takeDamage()` can change it', why: 'Taking damage is an observable change. Making it "const" with a mutable member lies to every caller holding a `const Player&`.' },
        { text: 'A member that outside code should be able to change without a setter', why: '`mutable` has nothing to do with access control; a private mutable member is still private.' },
        { text: 'A cached result of an expensive computation, refreshed inside a `const` getter', correct: true, why: 'The cache is an internal optimization: callers observe the same results with or without it, so the getter is logically const.' },
        { text: 'Every member of a class, so that const objects behave like normal ones', why: 'That removes the compiler\'s ability to enforce anything, and makes `const` objects meaningless.' },
      ],
      explanation:
        '`mutable` is for state that is invisible to the object\'s users — caches, memoized values, counters for debugging, a mutex guarding the data. If a caller could ever notice the change, the function should not be `const` and the member should not be `mutable`.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'static data members: one value shared by every object',
      blocks: [
        {
          type: 'p',
          text: 'Normally each object gets its own copy of every data member. A [[static-member|`static` data member]] is different: there is exactly **one** of it for the whole class, shared by all objects (and existing even when there are no objects at all). It has static storage duration, like a global, but its name lives inside the class: `Enemy::alive`.',
        },
        {
          type: 'code',
          title: 'counter.cpp',
          runnable: true,
          code: `#include <iostream>

class Enemy {
public:
    Enemy() { ++alive; ++spawnedTotal; }
    ~Enemy() { --alive; }

    inline static int alive = 0;         // C++17: defined right here
    static int spawnedTotal;             // declared only...
    static constexpr int maxAlive = 50;  // implicitly inline
};

int Enemy::spawnedTotal = 0;             // ...defined once, outside

int main() {
    Enemy a;
    {
        Enemy b;
        Enemy c;
        std::cout << "alive: " << Enemy::alive << '\\n';
    }
    std::cout << "alive: " << Enemy::alive
              << ", spawned: " << Enemy::spawnedTotal
              << ", cap: " << Enemy::maxAlive << '\\n';
    std::cout << "sizeof(Enemy): " << sizeof(Enemy) << '\\n';
}`,
          output: 'alive: 3\nalive: 1, spawned: 3, cap: 50\nsizeof(Enemy): 1',
          annotations: [
            { lines: '5-6', text: 'Constructor and destructor keep the shared counts up to date: every `Enemy` touches the same two variables.' },
            { lines: 8, text: 'An [[inline-variable|inline]] static member (C++17) is declared **and** defined in the class, so it can live in a header without breaking the [[one-definition-rule]].' },
            { lines: 9, text: 'The classic form: this is only a declaration...' },
            { lines: 13, text: '...so exactly one `.cpp` file must define it. Forget this line and you get a [[linker-error]] ("undefined reference to `Enemy::spawnedTotal`").' },
            { lines: 10, text: '`static constexpr` members are implicitly inline since C++17 — the usual way to write class-wide constants.' },
            { lines: 25, text: 'Static members are not stored inside objects. `Enemy` has no per-object data at all; its size is 1 only because every object must have a unique address.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Static members live once, in static storage; the objects themselves hold no copy of them.',
          regions: [
            {
              label: 'Static storage',
              kind: 'static',
              cells: [
                { name: 'Enemy::alive', type: 'int', value: '1', highlight: true },
                { name: 'Enemy::spawnedTotal', type: 'int', value: '3' },
                { name: 'Enemy::maxAlive', type: 'const int', value: '50' },
              ],
            },
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [{ name: 'a', type: 'Enemy', value: '(no data members)', address: '0xff4f' }],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why static members instead of globals?',
          text: 'They give you class-wide state — counters, ID generators, shared settings — while keeping the name scoped to the class and subject to access control. A `private` static counter can only be changed by the class\'s own code, which a global variable can never guarantee.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine: beware static state',
          text: 'A static variable lives as long as the process — and in Unreal, that process is the whole **editor**. Static counters therefore do not reset between Play-In-Editor sessions, and when PIE simulates several clients and a server in one process, they all share the same static. Per-game state belongs in a [[subsystem]], the GameInstance or the GameState instead.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: 'Every object of a class gets its own copy of each `static` data member.',
      answer: false,
      explanation:
        'That is exactly what `static` opts out of. A static data member exists once for the whole class, in static storage, independent of how many objects exist — even zero. That is why `sizeof` does not count static members, and why changing `Enemy::alive` through one object is visible through all of them.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'static member functions',
      blocks: [
        {
          type: 'p',
          text: 'A `static` member function belongs to the class rather than to an object. You call it with the class name — `Item::created()` — and it has **no `this` pointer**. It can use the class\'s static members and its private parts (including private constructors), but it cannot touch a non-static member unless it is given an object to work on.',
        },
        {
          type: 'code',
          title: 'factory.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

class Item {
public:
    static Item makePotion() { return Item{"Potion", 25}; }
    static Item makeElixir() { return Item{"Elixir", 100}; }
    static int created() { return createdCount; }
    // static int cost() { return price; }  // error: no object

    void print() const {
        std::cout << name << " (" << price << "g) #" << id << '\\n';
    }

private:
    Item(const std::string& n, int p)
        : name{n}, price{p}, id{++createdCount} {}

    inline static int createdCount = 0;
    std::string name;
    int price;
    int id;
};

int main() {
    Item a = Item::makePotion();
    Item b = Item::makeElixir();
    a.print();
    b.print();
    std::cout << Item::created() << " items created\\n";
}`,
          output: 'Potion (25g) #1\nElixir (100g) #2\n2 items created',
          annotations: [
            { lines: '6-7', text: '[[named-constructor|Named constructors]]: static functions that create objects. They may call the private constructor because they are members.' },
            { lines: 8, text: 'An accessor for private static data, callable without any `Item` existing.' },
            { lines: 9, text: 'Which item\'s `price`? A static function is not called on an object, so there is no `this` to find one.' },
            { lines: '16-17', text: 'The constructor is private: the only way to make an `Item` is through the factories, which keeps every item consistent and numbered.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why named constructors?',
          text: '`Item::makePotion()` says what it creates; `Item{"Potion", 25}` makes the reader decode magic values. Factories can also validate input, pick between configurations, or return an existing object from a pool — none of which a constructor can do. Making the real constructor private guarantees all creation goes through them.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Static member functions are everywhere: `UGameplayStatics::GetPlayerPawn(this, 0)`, `FMath::Clamp(Value, 0.0f, 1.0f)`, and the `StaticClass()` function that Unreal\'s header tool generates for every `UCLASS`. Blueprint function libraries are classes made entirely of static `UFUNCTION`s.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'fill',
      prompt: 'Complete the class so the usage below compiles and prints `2`.',
      template: `class Wave {
public:
    Wave() { ++number; }
    ___ int current() { return number; }

private:
    ___ static int number = 0;
};

// usage:
Wave first;
Wave second;
std::cout << Wave::current();`,
      blanks: [{ answers: ['static'] }, { answers: ['inline'] }],
      wordBank: ['static', 'inline', 'const', 'mutable', 'virtual'],
      explanation:
        '`Wave::current()` is called on the class, not on an object, so `current` must be a `static` member function. A non-const static data member can only be given its initial value inside the class if it is an `inline` variable (C++17); otherwise it needs a separate definition in a `.cpp` file. `const static` would compile the declaration but make `++number` illegal.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'Why can\'t a `static` member function read a non-static member such as `hp` directly?',
      options: [
        { text: 'Because `hp` is private, and static functions cannot access private members', why: 'Static member functions are members: they have full access to private members — as the factory\'s call to a private constructor showed.' },
        { text: 'Because static functions may only use compile-time constants', why: 'Static functions can use any static data, call other functions, allocate memory — they are ordinary functions apart from having no `this`.' },
        { text: 'Because it is not called on any object, so there is no `this` and no particular object\'s `hp`', correct: true, why: 'Each object has its own `hp`. Without an object, "the `hp`" has no meaning.' },
        { text: 'Because static functions run before `main` starts', why: 'Static functions run whenever they are called, like any function. You may be thinking of static *variables*, which are initialized before `main`.' },
      ],
      explanation:
        'Every non-static member name inside a member function really means `this->name`. A static member function is called as `Class::f()`, with no object, so it has no `this` to supply. Give it an object as a parameter (`static int hpOf(const Enemy& e) { return e.hp; }`) and it may read that object\'s private members freely.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Choosing: member, static member or free function?',
      blocks: [
        {
          type: 'table',
          headers: ['You write', 'It means', 'Example'],
          rows: [
            ['`const` after a member function', 'It will not modify the object; callable on const objects', '`int getHp() const;`'],
            ['`mutable` on a data member', 'May change even inside const functions', '`mutable int cacheHits;`'],
            ['`static` on a data member', 'One variable shared by the whole class', '`inline static int alive = 0;`'],
            ['`static` on a member function', 'Belongs to the class; no `this`', '`static Item makePotion();`'],
          ],
          caption: 'The keywords of this lesson at a glance.',
        },
        {
          type: 'p',
          text: 'When you add a new operation, decide where it lives:',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**It needs one object\'s private data** → a regular member function. Make it `const` if it only reads.',
            '**It concerns the class as a whole** — a shared counter, a factory → a `static` member.',
            '**It can be written using only the public interface** → prefer a [[free-function]] next to the class, such as `float distance(const Enemy& a, const Enemy& b)` built on `getPosition()`.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why prefer free functions when possible?',
          text: 'Every member function is code that could break the class\'s invariants, and must be revisited whenever the private representation changes. A free function that only uses the public interface cannot break anything, so moving functions out of the class actually **strengthens** encapsulation. The C++ Core Guidelines: "make a function a member only if it needs direct access to the representation of a class".',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'No "static classes" needed',
          text: 'Languages like Java and C# group utility functions into classes full of static methods. In C++, put them in a namespace as free functions instead (Unit 15). Unreal\'s `UBlueprintFunctionLibrary` classes are an exception born of necessity: Blueprints can only see functions that live inside a reflected `UCLASS`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>

class Coin {
public:
    Coin() { ++total; }
    inline static int total = 0;
};

int main() {
    Coin a;
    Coin b;
    Coin bag[3];
    std::cout << Coin::total << ' ' << a.total << '\\n';
}`,
      options: [
        { text: '5 1', why: '`a.total` is legal syntax, but it names the same shared variable as `Coin::total` — it is not a per-object counter.' },
        { text: '2 5', why: 'Creating an array of 3 `Coin`s default-constructs each element, so the constructor runs three more times.' },
        { text: '1 1', why: 'That would be true if each object had its own `total`. A static member is shared by all of them.' },
        { text: '5 5', correct: true, why: 'Five `Coin` objects are constructed (2 plus 3 in the array), all incrementing the one shared `total`.' },
      ],
      explanation:
        'There is a single `Coin::total`. Each of the five constructions increments it, and accessing it through an object (`a.total`) is just another way to name the same variable — legal, but misleading, which is why style guides prefer `Coin::total`.',
    },
  ],
  takeaways: [
    'A `const` member function cannot modify the object (`this` is a pointer to const); mark every query `const` by default.',
    'Through const objects, const references and pointers to const, only `const` member functions can be called.',
    'Overloading on `const` lets one name offer writable access to non-const objects and read-only access to const ones.',
    '`mutable` members may change inside const functions — use them only for state callers cannot observe, such as caches.',
    'A static data member exists once per class in static storage; define it in one `.cpp`, or use `inline static` / `static constexpr` (C++17) in the class.',
    'Static member functions have no `this`; use them for class-wide operations like factories, and prefer free functions for anything the public interface can do.',
  ],
  reading: [
    {
      title: 'Const class objects and const member functions',
      url: 'https://www.learncpp.com/cpp-tutorial/const-class-objects-and-const-member-functions/',
      source: 'learncpp',
      note: 'More examples of const objects, const references and overloading on const.',
    },
    {
      title: 'Non-static member functions — const and volatile',
      url: 'https://en.cppreference.com/w/cpp/language/member_functions',
      source: 'cppreference',
      note: 'The formal rules for const-qualified member functions.',
    },
    {
      title: 'static members',
      url: 'https://en.cppreference.com/w/cpp/language/static',
      source: 'cppreference',
      note: 'Static data members, inline static members and static member functions.',
    },
    {
      title: 'C++ Core Guidelines: Constants and immutability',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-const',
      source: 'core-guidelines',
      note: 'Con.2: by default, make member functions const.',
    },
  ],
};
