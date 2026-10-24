import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-destructors-this',
  title: 'Destructors, this and Object Lifetime',
  summary: 'How objects end: destructors and exactly when they run, reverse destruction order, the hidden `this` pointer, and chaining with `*this`.',
  minutes: 18,
  objectives: [
    'Write a destructor and predict exactly when it runs for local, static, heap, member and temporary objects',
    'Explain why objects are destroyed in reverse order of construction',
    'Use the `this` pointer to refer to the current object and to resolve name clashes',
    'Return `*this` by reference to enable method chaining, and spot the by-value mistake',
    'Describe an object\'s full lifetime, and why copying a resource-owning class needs care',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Destructors: the last thing an object does',
      blocks: [
        {
          type: 'p',
          text: 'A constructor runs when an object\'s life begins. Its mirror image, the [[destructor]], runs when the object\'s life ends. It is written as `~` followed by the class name, takes no parameters, has no return type, and is called **automatically** — you never call it yourself.',
        },
        {
          type: 'code',
          title: 'torch.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

class Torch {
public:
    explicit Torch(const std::string& n) : name{n} {
        std::cout << name << " lit\\n";
    }
    ~Torch() {
        std::cout << name << " extinguished\\n";
    }

private:
    std::string name;
};

int main() {
    Torch hall{"Hall torch"};
    {
        Torch cave{"Cave torch"};
        std::cout << "Exploring the cave...\\n";
    }   // cave's lifetime ends here
    std::cout << "Back in the hall\\n";
}   // hall's lifetime ends here`,
          output: 'Hall torch lit\nCave torch lit\nExploring the cave...\nCave torch extinguished\nBack in the hall\nHall torch extinguished',
          annotations: [
            { lines: '9-11', text: 'The destructor. A class has exactly one, it cannot be overloaded, and if you do not write one the compiler generates a destructor that simply destroys the members.' },
            { lines: 22, text: 'The closing brace of the inner block ends `cave`\'s [[scope]], so its destructor runs right here, before "Back in the hall".' },
            { lines: 24, text: '`hall` is destroyed when `main`\'s body ends.' },
          ],
        },
        {
          type: 'p',
          text: 'Printing is only for watching. The real job of a destructor is to **release what the object acquired**: heap memory, open files, network connections, GPU buffers, locks — and to unregister the object from any system that still knows about it.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why deterministic destruction matters',
          text: 'In C++ you know the exact line where every local object\'s destructor runs. Garbage-collected languages such as Java and C# cannot promise that: their finalizers run "eventually", maybe never, so they need extra constructs (`try`/`finally`, `using`) to release resources on time. C++ instead ties cleanup to scope, and that is the foundation of [[raii]], the idiom Unit 11 is built around.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Destructors should not throw',
          text: 'Destructors are implicitly `noexcept`: if an exception escapes one, the program is terminated. Unit 14 explains why, and how to handle failures during cleanup.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'truefalse',
      prompt: 'If a function returns early, the destructors of local objects that were already constructed in it still run.',
      answer: true,
      explanation:
        'Leaving a scope by **any** route — reaching the closing brace, `return`, `break`, `continue`, or an exception passing through — destroys the automatic objects constructed in it, in reverse order. That is exactly why putting cleanup in a destructor fixes the early-return leak from the `new`/`delete` lesson: no path can skip it.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'When exactly do destructors run?',
      blocks: [
        {
          type: 'p',
          text: 'A destructor runs when the object\'s [[lifetime]] ends, and that depends on its [[storage-duration]]:',
        },
        {
          type: 'table',
          headers: ['Kind of object', 'Destructor runs when…'],
          rows: [
            ['Local (automatic)', 'Execution leaves its scope, by any path'],
            ['Global or `static`', 'After `main` returns (in reverse order of construction)'],
            ['Heap (created with `new`)', '`delete` is called on it — **never**, if it leaks'],
            ['Member of another object', 'The containing object is destroyed, right after the container\'s destructor body'],
            ['Temporary', 'At the end of the full expression (the `;`) that created it, unless lifetime-extended'],
            ['Element of a `std::vector`', 'The element is erased, or the vector itself is destroyed'],
          ],
        },
        {
          type: 'code',
          title: 'timing.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

class Tracker {
public:
    explicit Tracker(const std::string& n) : name{n} {
        std::cout << "+ " << name << '\\n';
    }
    ~Tracker() { std::cout << "- " << name << '\\n'; }

private:
    std::string name;
};

Tracker g_world{"world (static)"};

void spawnWave() {
    Tracker grunt{"grunt (stack)"};
    Tracker* boss = new Tracker{"boss (heap)"};
    std::cout << "wave running\\n";
    delete boss;                  // heap object dies HERE
    std::cout << "boss deleted\\n";
}                                 // grunt dies here

int main() {
    std::cout << "main starts\\n";
    Tracker{"temporary"};         // dies at the semicolon
    spawnWave();
    std::cout << "main ends\\n";
}                                 // g_world dies after main`,
          output: '+ world (static)\nmain starts\n+ temporary\n- temporary\n+ grunt (stack)\n+ boss (heap)\nwave running\n- boss (heap)\nboss deleted\n- grunt (stack)\nmain ends\n- world (static)',
          annotations: [
            { lines: 15, text: 'A global is constructed before `main` starts — notice it prints first — and destroyed after `main` returns.' },
            { lines: 19, text: 'A heap object lives until someone deletes it, regardless of scopes.' },
            { lines: 21, text: '`delete` first runs the destructor, then frees the memory. That is why "- boss" appears before "boss deleted".' },
            { lines: 23, text: '`grunt` is destroyed as `spawnWave` returns. The pointer `boss` dies here too — but a pointer has no destructor that touches its pointee.' },
            { lines: 27, text: 'A temporary is created and destroyed within a single statement.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'A leaked object\'s destructor never runs',
          text: 'If a heap object is never deleted, its destructor is never called — not even at program exit. The operating system reclaims the raw memory, but nothing the destructor was meant to do happens: files are not flushed, connections are not closed, save data is not written.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: 'A function runs `Tracker* t = new Tracker{"orb"};` and returns without ever deleting `t`. When does the `Tracker`\'s destructor run?',
      options: [
        { text: 'When the function returns, because `t` goes out of scope', why: '`t` is a raw pointer. Destroying the pointer destroys an address, not the object it points to.' },
        { text: 'Never', correct: true, why: 'Heap objects are destroyed only by `delete`. Without it, the object is leaked and its destructor is never called.' },
        { text: 'When the program exits', why: 'The OS reclaims the process\'s memory at exit, but it does not run C++ destructors for leaked heap objects.' },
        { text: 'At the next garbage collection', why: 'Standard C++ has no garbage collector. (Unreal adds one, but only for `UObject`s.)' },
      ],
      explanation:
        'Dynamic lifetime ends only when you say so. This is why a destructor alone does not make a class safe: someone still has to destroy the object. Owning heap objects through RAII types like `std::unique_ptr` solves that, because the smart pointer\'s own destructor calls `delete`.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Reverse order: last built, first destroyed',
      blocks: [
        {
          type: 'p',
          text: 'Objects are always destroyed in the **reverse** order of their construction. Locals in a scope die last-declared first. Members are constructed in declaration order before the constructor body, and destroyed in reverse declaration order after the destructor body.',
        },
        {
          type: 'code',
          title: 'game.cpp',
          runnable: true,
          code: `#include <iostream>

class Logger {
public:
    Logger() { std::cout << "Logger up\\n"; }
    ~Logger() { std::cout << "Logger down\\n"; }
};

class Physics {
public:
    Physics() { std::cout << "Physics up\\n"; }
    ~Physics() { std::cout << "Physics down\\n"; }
};

class Game {
public:
    Game() { std::cout << "Game ready\\n"; }
    ~Game() { std::cout << "Game shutting down\\n"; }

private:
    Logger logger;      // constructed 1st, destroyed last
    Physics physics;    // constructed 2nd, destroyed first
};

int main() {
    Game game;
    std::cout << "-- playing --\\n";
}`,
          output: 'Logger up\nPhysics up\nGame ready\n-- playing --\nGame shutting down\nPhysics down\nLogger down',
          annotations: [
            { lines: 17, text: 'By the time the `Game` constructor body runs, both members already exist — so it can safely use them.' },
            { lines: 18, text: 'The destructor body runs **first**, while the members are still alive — so it can safely use them too.' },
            { lines: '21-22', text: 'Declaration order decides everything: `logger` before `physics` on the way up, `physics` before `logger` on the way down.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why reverse order?',
          text: 'Later objects may depend on earlier ones — they were constructed *using* them. If `Physics` logs a message in its destructor, `Logger` must still be alive at that moment. Destroying in reverse guarantees that whenever any destructor runs, everything that existed before its object was built still exists.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Scaffolding',
          text: 'Builders put up scaffolding floor by floor from the bottom, and take it down from the top: remove a lower level first and everything above it collapses. It is the same last-in, first-out pattern as the call stack.',
        },
        {
          type: 'deepdive',
          title: 'What the compiler adds to your destructor',
          blocks: [
            {
              type: 'p',
              text: 'When your destructor body finishes, compiler-generated code destroys every member in reverse declaration order (and then base classes, Unit 10). That is why a destructor never needs to clean up members that clean up after themselves: a `std::string` or `std::vector` member frees its own memory automatically. You only write code for resources the members do not already manage.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>

struct Note {
    char c;
    ~Note() { std::cout << c; }
};

int main() {
    Note a{'A'};
    {
        Note b{'B'};
        Note c{'C'};
    }
    Note d{'D'};
}`,
      options: [
        { text: 'ABCD', why: 'That is the construction order. Destructors run in reverse, and only when each object\'s scope ends.' },
        { text: 'BCDA', why: '`b` and `c` die together at the inner `}`, but in reverse order: `c` first.' },
        { text: 'DCBA', why: 'This ignores the inner scope: `b` and `c` die at the inner closing brace, before `d` even exists.' },
        { text: 'CBDA', correct: true, why: 'The inner block ends first, destroying `c` then `b`. At the end of `main`, `d` (constructed last) dies before `a`.' },
      ],
      explanation:
        'Two rules combine. Scope decides **when**: `b` and `c` die at the inner closing brace, `a` and `d` at the end of `main`. Reverse construction order decides the order **within** each scope: `c` before `b`, and `d` before `a`. Result: `CBDA`.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'The this pointer',
      blocks: [
        {
          type: 'p',
          text: 'When you write `aria.takeDamage(15)`, how does the code inside `takeDamage` know it should modify `aria` and not `bram`? The compiler passes the object\'s address as a hidden argument. Inside any non-static member function, that address is available as [[this-pointer|`this`]]: a pointer to the object the function was called on.',
        },
        {
          type: 'code',
          title: 'this.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

class Player {
public:
    Player(const std::string& name, int hp) : name{name}, hp{hp} {}

    void rename(const std::string& name) {
        this->name = name;      // member = parameter
    }
    void takeDamage(int amount) {
        hp -= amount;           // implicitly this->hp
        std::cout << name << " -> " << hp << " HP\\n";
    }
    bool isSameAs(const Player& other) const {
        return this == &other;  // compare addresses
    }

private:
    std::string name;
    int hp;
};

int main() {
    Player aria{"Aria", 100};
    Player bram{"Bram", 80};
    aria.takeDamage(15);        // inside: this == &aria
    bram.takeDamage(15);        // inside: this == &bram
    bram.rename("Bram the Bold");
    bram.takeDamage(5);
    std::cout << std::boolalpha << aria.isSameAs(aria) << ' '
              << aria.isSameAs(bram) << '\\n';
}`,
          output: 'Aria -> 85 HP\nBram -> 65 HP\nBram the Bold -> 60 HP\ntrue false',
          annotations: [
            { lines: 9, text: 'The parameter `name` [[shadowing|shadows]] the member. `this->name` explicitly means "the member of this object".' },
            { lines: 12, text: 'Every unqualified member name is shorthand: `hp` here means `this->hp`.' },
            { lines: 16, text: '`this` is an address, so comparing it with `&other` tells you whether two references refer to the very same object (identity, not equal values).' },
            { lines: '27-28', text: 'One function, two calls: `this` points at `aria` in the first and at `bram` in the second.' },
          ],
        },
        {
          type: 'memory',
          caption: 'During `aria.takeDamage(15)`: `this` is effectively a hidden parameter holding `&aria`.',
          regions: [
            {
              label: 'Stack — Player::takeDamage()',
              kind: 'stack',
              cells: [
                { name: 'this', type: 'Player*', value: '0xff00', pointsTo: 'ariaObj', highlight: true },
                { name: 'amount', type: 'int', value: '15' },
              ],
            },
            {
              label: 'Stack — main(): aria (Player)',
              kind: 'stack',
              cells: [
                { id: 'ariaObj', name: 'name', type: 'std::string', value: '"Aria"', address: '0xff00' },
                { name: 'hp', type: 'int', value: '85', address: '0xff20' },
              ],
            },
            {
              label: 'Stack — main(): bram (Player)',
              kind: 'stack',
              cells: [
                { name: 'name', type: 'std::string', value: '"Bram"', address: '0xff28' },
                { name: 'hp', type: 'int', value: '80', address: '0xff48' },
              ],
            },
          ],
        },
        {
          type: 'p',
          text: 'In a non-const member function `this` has type `Player*`; in a `const` member function it is `const Player*`, which is precisely how the compiler stops const functions from modifying members (next lesson). `this` is not a variable: you cannot assign to it.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a hidden pointer?',
          text: 'Member functions are not stored inside each object. There is a single copy of `takeDamage`\'s machine code, shared by every `Player`, and `this` tells it whose data to use. That is also why adding member functions never makes objects bigger: `sizeof(Player)` depends only on the data members.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'You hand `this` to the engine constantly, so it knows which object to call back or who owns what: `GetWorldTimerManager().SetTimer(FireTimer, this, &ATurret::Fire, 0.5f, true);`, `Box->OnComponentBeginOverlap.AddDynamic(this, &APickup::OnOverlap);`, or `NewObject<UInventory>(this)` to make the new object\'s outer the current one.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'Inside the call `aria.takeDamage(15)`, what is `this`?',
      options: [
        { text: 'A copy of `aria` made for the duration of the call', why: 'No copy is made. Member functions operate on the original object, which is why changes to `hp` stick.' },
        { text: 'A pointer to `aria` — its value is `&aria`', correct: true, why: 'The compiler passes the address of the object the function was called on, and `this` holds it.' },
        { text: 'A reference to the `Player` class itself', why: '`this` refers to one particular object, not to the class. C++ has no run-time "class object" that `this` could point at.' },
        { text: 'A pointer to the `takeDamage` function', why: '`this` points at data (the object), not at code.' },
      ],
      explanation:
        'Conceptually, `aria.takeDamage(15)` is `Player::takeDamage(&aria, 15)`, with the first argument appearing inside the function as `this`. Because it is a pointer, you use `this->member` — or, more often, just the member name, which means the same thing.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Returning *this: method chaining',
      blocks: [
        {
          type: 'p',
          text: 'Dereferencing `this` gives the object itself: `*this`. A member function that returns `*this` **by reference** hands the caller the very same object, ready for the next call. That enables [[method-chaining]]: `wave.type("skeleton").count(6).elite(true);`.',
        },
        {
          type: 'code',
          title: 'chain.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

class SpawnRequest {
public:
    SpawnRequest& type(const std::string& t) {
        enemyType = t;
        return *this;             // hand back the same object
    }
    SpawnRequest& count(int n) {
        amount = n;
        return *this;
    }
    SpawnRequest& elite(bool e) {
        isElite = e;
        return *this;
    }
    void print() const {
        std::cout << amount << "x " << (isElite ? "elite " : "")
                  << enemyType << '\\n';
    }

private:
    std::string enemyType = "grunt";
    int amount = 1;
    bool isElite = false;
};

int main() {
    SpawnRequest wave;
    wave.type("skeleton").count(6).elite(true);
    wave.print();
    SpawnRequest{}.count(3).print();
}`,
          output: '6x elite skeleton\n3x grunt',
          annotations: [
            { lines: 6, text: 'The return type is a **reference** to the class. Nothing is copied when the function returns.' },
            { lines: 8, text: '`this` is a pointer; `*this` is the object it points to, which the reference return type binds to.' },
            { lines: 31, text: 'Each call returns `wave` itself, so the next call in the chain operates on `wave` again.' },
            { lines: 33, text: 'Chaining works on a temporary too: it lives until the end of the statement.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Returns a copy',
            tone: 'bad',
            code: `SpawnRequest count(int n) {
    amount = n;
    return *this;   // copies the object
}`,
            text: 'The next call in the chain operates on a temporary copy, and its change is lost.',
          },
          right: {
            title: 'Returns a reference',
            tone: 'good',
            code: `SpawnRequest& count(int n) {
    amount = n;
    return *this;   // the same object
}`,
            text: 'Every call in the chain modifies the original object.',
          },
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'You have used this pattern since lesson one',
          text: '`std::cout << "HP: " << hp << \'\\n\';` works because each `<<` returns the stream by reference, so the next `<<` writes to the same `std::cout`. You will write exactly such an operator in the operator-overloading lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'fill',
      prompt: 'Complete `setHp` so that calls can be chained like `b.setHp(100).setSpeed(2.5f);`.',
      template: `class CharacterBuilder {
public:
    CharacterBuilder___ setHp(int value) {
        hp = value;
        return ___this;
    }
    // setSpeed is written the same way
private:
    int hp = 100;
    float speed = 1.0f;
};`,
      blanks: [{ answers: ['&'] }, { answers: ['*'] }],
      wordBank: ['&', '*', '&&', '->', 'this'],
      explanation:
        'Returning `CharacterBuilder&` hands back a reference instead of a copy, and `*this` dereferences the `this` pointer to get the object the reference binds to. Returning by value would compile, but then `setSpeed` would modify a temporary copy and the builder would silently keep its old speed.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'bug',
      prompt: 'This prints `255 0` instead of `255 80`. Tap the faulty line.',
      code: `#include <iostream>

class Light {
public:
    Light setColor(int c) {
        color = c;
        return *this;
    }
    Light& setIntensity(int i) {
        intensity = i;
        return *this;
    }
    void print() const {
        std::cout << color << ' ' << intensity << '\\n';
    }

private:
    int color = 0;
    int intensity = 0;
};

int main() {
    Light lamp;
    lamp.setColor(255).setIntensity(80);
    lamp.print();
}`,
      bugLines: [5],
      hint: 'Compare the return types of the two setters.',
      explanation:
        '`setColor` returns `Light` **by value**, so `lamp.setColor(255)` sets `lamp`\'s colour and then returns a temporary copy. `.setIntensity(80)` modifies that copy, which is destroyed at the end of the statement — `lamp` never gets the intensity. Changing the return type to `Light&` makes the whole chain operate on `lamp`.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Object lifetime, start to finish',
      blocks: [
        {
          type: 'p',
          text: 'Putting the last two lessons together, every object goes through the same stages:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Storage is obtained', text: 'A stack frame is pushed, `new` allocates, or static storage is reserved when the program starts.' },
            { title: 'Construction', text: 'Members are initialized in declaration order, then the constructor body runs. When the constructor finishes, the object\'s lifetime has begun.' },
            { title: 'Use', text: 'Member functions are called, each receiving the object\'s address as `this`.' },
            { title: 'Destruction', text: 'The destructor body runs, then members are destroyed in reverse declaration order. The lifetime is over.' },
            { title: 'Storage is released', text: 'The frame is popped, `delete` frees the block, or the program ends.' },
          ],
        },
        {
          type: 'p',
          text: 'Using an object outside its lifetime — through a dangling pointer or reference — is undefined behavior, as you saw in Unit 8. And never call a destructor by hand (`obj.~Torch();`): the object would be destroyed twice. (There is one advanced exception, objects created with "placement new", which you are unlikely to need.)',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'A destructor that frees memory needs a copy plan',
          text: 'It is tempting to write a class that allocates in its constructor and `delete[]`s in its destructor. That part is right — but copying such an object copies the **pointer**, not the pixels. Both copies then delete the same block: a double delete. Unit 11 covers the fix (the Rule of Three, and better, using `std::vector` or smart pointers as members). Until then, give resource-owning classes members that manage themselves.',
        },
        {
          type: 'code',
          code: `class Texture {
public:
    explicit Texture(int size) : pixels{new int[size]{}} {}
    ~Texture() { delete[] pixels; }   // release what we own
private:
    int* pixels;
};

void render() {
    Texture a{1024};
    Texture b = a;   // copies the POINTER, not the pixels
}                    // b deletes the block, then a deletes it again`,
          annotations: [
            { lines: '3-4', text: 'Acquire in the constructor, release in the destructor: the right instinct.' },
            { lines: 11, text: 'The compiler-generated copy copies each member — including the raw pointer — so both objects now "own" one block.' },
            { lines: 12, text: 'Reverse order: `b` is destroyed first and frees the block; then `a` frees it again. Undefined behavior.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Inside `render()` after the copy: two owners, one block.',
          regions: [
            {
              label: 'Stack — render()',
              kind: 'stack',
              cells: [
                { name: 'a.pixels', type: 'int*', value: '0x9e20', pointsTo: 'pix', highlight: true },
                { name: 'b.pixels', type: 'int*', value: '0x9e20', pointsTo: 'pix', highlight: true },
              ],
            },
            {
              label: 'Heap',
              kind: 'heap',
              cells: [{ id: 'pix', type: 'int[1024]', value: '0, 0, 0, …', address: '0x9e20' }],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: '`UObject`s are destroyed by the garbage collector at a time of its choosing, so their C++ destructors are not a good place for gameplay cleanup. Unreal provides lifecycle hooks instead: `EndPlay` for actors and components (called when they leave the game) and `BeginDestroy` for `UObject`s in general.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'order',
      prompt: 'Order the stages of a local object\'s life, from first to last.',
      lines: [
        'Storage for the object is obtained',
        'Members are initialized in declaration order',
        'The constructor body runs',
        'Member functions are called on the object',
        'The destructor body runs',
        'Members are destroyed in reverse declaration order',
        'The storage is released',
      ],
      distractors: ['A garbage collector decides when to destroy the object'],
      linesAreCode: false,
      explanation:
        'Construction builds from the inside out (members first, then the body), and destruction tears down from the outside in (the body first, then members in reverse). Storage brackets the whole thing. No garbage collector is involved: for a local object, the end of its scope triggers destruction at a precisely known point.',
    },
  ],
  takeaways: [
    'A destructor (`~ClassName()`) runs automatically when an object\'s lifetime ends; use it to release whatever the object acquired.',
    'Locals die when their scope ends (by any path), statics after `main`, temporaries at the end of their statement, and heap objects only when deleted — never, if leaked.',
    'Objects are destroyed in reverse order of construction; members are destroyed in reverse declaration order after the destructor body.',
    'Inside a member function, `this` points to the object the function was called on; unqualified member names mean `this->member`.',
    'Returning `*this` by reference enables method chaining; returning by value silently chains on copies.',
    'A class whose destructor frees a raw pointer is unsafe to copy — Unit 11\'s Rule of Three (or self-managing members) fixes it.',
  ],
  reading: [
    {
      title: 'Destructors',
      url: 'https://en.cppreference.com/w/cpp/language/destructor',
      source: 'cppreference',
      note: 'The rules for when destructors are called and in what order.',
    },
    {
      title: 'The this pointer',
      url: 'https://en.cppreference.com/w/cpp/language/this',
      source: 'cppreference',
      note: 'The type of `this` in const and non-const member functions.',
    },
    {
      title: 'The hidden "this" pointer and member function chaining',
      url: 'https://www.learncpp.com/cpp-tutorial/the-hidden-this-pointer-and-member-function-chaining/',
      source: 'learncpp',
      note: 'A step-by-step look at how the compiler passes `this`.',
    },
    {
      title: 'isocpp FAQ: Destructors',
      url: 'https://isocpp.org/wiki/faq/dtors',
      source: 'isocpp',
      note: 'Answers to common questions, such as why you should never call a destructor explicitly.',
    },
  ],
};
