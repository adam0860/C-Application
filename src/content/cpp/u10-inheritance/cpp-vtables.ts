import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-vtables',
  title: 'Under the Hood: How Virtual Calls Work',
  summary: 'vptrs, vtables and what a virtual call really costs — plus why constructors never call your override.',
  minutes: 16,
  objectives: [
    'Describe how compilers implement virtual calls with a vptr in each object and a vtable per class',
    'Trace a virtual call step by step through memory, down to the machine instructions',
    'Explain the costs of dynamic dispatch: object size, indirection, lost inlining and cache misses',
    'Explain why C++ member functions are not virtual by default',
    'Predict what happens when a constructor or destructor calls a virtual function',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The puzzle: how does e->attack() know?',
      blocks: [
        {
          type: 'p',
          text: 'In the last lesson, `enemyTurn(const Enemy& e)` called `e.attack()` and somehow reached `Dragon::attack` for dragons and `Goblin::attack` for goblins. But `enemyTurn` is compiled **once**, possibly in a different file from the `Dragon` class — or years before someone writes a `Lich` class in a mod or plugin. The compiled code cannot contain a list of every derived class.',
        },
        {
          type: 'p',
          text: 'So the information must travel **with the object**. Each polymorphic object carries a hidden pointer that leads to the right functions for its class. Once you understand that one idea, every cost and every quirk of virtual functions in this lesson follows from it.',
        },
        {
          type: 'definition',
          term: 'vtable and vptr',
          text: 'A [[vtable]] (virtual table) is a table of function addresses, one per class that has virtual functions. A [[vptr]] is a hidden pointer the compiler adds to every object of such a class, pointing at its class\'s vtable.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'An implementation technique, not a language rule',
          text: 'The C++ standard specifies only the *behaviour* of virtual functions; it never mentions vtables. But every mainstream compiler — GCC, Clang and MSVC — implements them this way, so the model in this lesson is what really happens on your PC, console or phone.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'One vtable per class, one vptr per object',
      blocks: [
        {
          type: 'p',
          text: 'Take a small hierarchy where `Goblin` overrides only `attack` and `Dragon` overrides both functions:',
        },
        {
          type: 'code',
          code: `class Enemy {
public:
    virtual void attack() const;    // slot 0
    virtual void describe() const;  // slot 1
    int hp = 100;
};

class Goblin : public Enemy {
public:
    void attack() const override;
};

class Dragon : public Enemy {
public:
    void attack() const override;
    void describe() const override;
};`,
          annotations: [
            { lines: '3-4', text: 'The compiler numbers the virtual functions of `Enemy`: `attack` gets slot 0, `describe` slot 1. Every derived class keeps the **same slot numbers** for them. (A real base class would also have a virtual destructor, which takes slots too; it is left out to keep the picture small.)' },
            { lines: 10, text: '`Goblin`\'s vtable puts `&Goblin::attack` in slot 0 and keeps the inherited `&Enemy::describe` in slot 1.' },
            { lines: '15-16', text: '`Dragon`\'s vtable has its own functions in both slots.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Two goblins and a dragon. The objects each hold a vptr; the goblins share one vtable. Vtables live in read-only data, created once by the compiler.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'grub.vptr', value: '→ vtable for Goblin', type: 'hidden', pointsTo: 'vt-goblin', highlight: true },
                { name: 'grub.hp', value: '30', type: 'int' },
                { name: 'snag.vptr', value: '→ vtable for Goblin', type: 'hidden', pointsTo: 'vt-goblin', highlight: true },
                { name: 'snag.hp', value: '25', type: 'int' },
                { name: 'smaug.vptr', value: '→ vtable for Dragon', type: 'hidden', pointsTo: 'vt-dragon', highlight: true },
                { name: 'smaug.hp', value: '500', type: 'int' },
              ],
            },
            {
              label: 'Read-only data — vtable for Goblin',
              kind: 'static',
              cells: [
                { id: 'vt-goblin', name: '[0] attack', value: '&Goblin::attack' },
                { name: '[1] describe', value: '&Enemy::describe' },
              ],
            },
            {
              label: 'Read-only data — vtable for Dragon',
              kind: 'static',
              cells: [
                { id: 'vt-dragon', name: '[0] attack', value: '&Dragon::attack' },
                { name: '[1] describe', value: '&Dragon::describe' },
              ],
            },
          ],
        },
        {
          type: 'table',
          headers: ['Question', 'vtable', 'vptr'],
          rows: [
            ['How many?', 'One per class with virtual functions', 'One per object of such a class'],
            ['Created by', 'The compiler, at build time', 'The constructor, every time an object is built'],
            ['Lives in', 'Read-only data of the executable', 'Inside the object (typically its first 8 bytes)'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a shared table instead of pointers in each object?',
          text: 'The compiler could store a function pointer for every virtual function directly in each object. But a class with 20 virtual functions would then add 160 bytes to **every** instance. With a shared table, each object pays for one pointer (8 bytes on 64-bit), no matter how many virtual functions the class has. Classes are few; objects can number in the millions.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'A game creates 1,000 `Goblin` objects and 3 `Dragon` objects. Both classes derive from `Enemy`, which has virtual functions. Using the typical implementation, how many vtables and vptrs exist for these objects?',
      options: [
        { text: '1,003 vtables and 1,003 vptrs', why: 'Vtables are per **class**, not per object. All 1,000 goblins share a single Goblin vtable.' },
        { text: '2 vtables and 1,003 vptrs', correct: true, why: 'One vtable for `Goblin`, one for `Dragon` (the `Enemy` class has one too, but these objects never use it after construction); one vptr inside each of the 1,003 objects.' },
        { text: '1 vtable and 1,003 vptrs', why: 'Goblins and dragons need different function addresses in the same slots, so each class needs its own table.' },
        { text: '2 vtables and 2 vptrs', why: 'Each object must carry its own vptr — otherwise, given only a pointer to an object, the code could not find its class\'s table.' },
      ],
      explanation:
        'The vtable is shared data describing a class, so its count depends on the number of polymorphic classes. The vptr is per-object state, because a virtual call starts from nothing but the object\'s address and must discover its class from the object itself. That per-object pointer is the main memory cost of virtual functions.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Tracing a virtual call',
      blocks: [
        {
          type: 'p',
          text: 'Here is what really happens when `enemyTurn` runs `e->describe()`. The compiler knows `describe` is in slot 1 of *every* `Enemy`-derived vtable, because slot numbers are fixed when `Enemy` is compiled. What it does not know is *which* vtable — so it reads that from the object:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Load the vptr', text: 'Read the hidden pointer stored inside the object `e` points at.' },
            { title: 'Index the vtable', text: 'Go to slot 1 of the table it points to (offset 8 bytes on 64-bit).' },
            { title: 'Load the function address', text: 'The slot holds `&Dragon::describe` for a dragon, `&Enemy::describe` for a goblin.' },
            { title: 'Call it indirectly', text: 'Jump to that address, passing the object\'s address as the hidden `this` argument.' },
          ],
        },
        {
          type: 'p',
          text: 'Compile `void enemyTurn(const Enemy* e) { e->describe(); }` with GCC at `-O1` for x86-64 and the heart of it is just two instructions:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'x86-64 assembly (simplified)',
          code: `; e arrives in register rdi (it is also "this")
mov   rax, QWORD PTR [rdi]      ; load the vptr from *e
call  QWORD PTR [rax + 8]       ; load slot 1, call it`,
          annotations: [
            { lines: 2, text: 'Step 1: the vptr is the first 8 bytes of the object, so it is read from the address in `rdi`.' },
            { lines: 3, text: 'Steps 2–4 in one instruction: read the address stored 8 bytes into the vtable (slot 1) and call it. `rdi` still holds `e`, so the callee receives the right `this`.' },
          ],
        },
        {
          type: 'p',
          text: 'Compare a non-virtual call, which is a single `call Enemy::describe` with the address baked into the instruction — or no call at all, if the compiler inlines the function body.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Try it yourself',
          text: 'Paste the function into [Compiler Explorer](https://godbolt.org), select x86-64 GCC with `-O1`, and watch the two instructions appear. Then add `final` to the class and watch the indirect call become a direct one.',
        },
        {
          type: 'deepdive',
          title: 'What a real vtable contains',
          blocks: [
            {
              type: 'p',
              text: 'Under the Itanium C++ ABI (used by GCC and Clang on Linux, macOS and Android), a vtable also holds two entries *before* the slot the vptr points to: an "offset to top" (used with multiple inheritance) and a pointer to the class\'s type information (used by `dynamic_cast` and `typeid`). A virtual destructor occupies **two** slots: one that only destroys and one that destroys and frees memory. MSVC uses a different but analogous layout.',
            },
            {
              type: 'p',
              text: 'A practical consequence: GCC and Clang emit a class\'s vtable only in the file that defines its first non-inline, non-pure virtual function (the *key function*). Declare that function but forget to define it, and you get the baffling linker error `undefined reference to \'vtable for Enemy\'`. Now you know what it means: the table was never emitted, because the file that should contain it does not exist.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'order',
      prompt: 'Put the steps of the virtual call `e->describe()` in the order the machine performs them.',
      linesAreCode: false,
      lines: [
        'Read the vptr stored inside the object `e` points at',
        'Find the slot for `describe` in the vtable the vptr points to',
        'Load the function address stored in that slot',
        'Call that address, passing `e` as `this`',
      ],
      distractors: [
        'Search the object\'s class by name for a function called `describe`',
        'Ask the object\'s constructor which function should be used',
      ],
      explanation:
        'A virtual call never searches by name — that is what dynamic languages such as Python do, and it is far slower. In C++ the slot number is fixed at compile time, so the only run-time work is two dependent loads (vptr, then slot) and an indirect call. The constructor\'s only role was to store the right vptr in the object, long before the call.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'sizeof grows by a pointer',
      blocks: [
        {
          type: 'p',
          text: 'The vptr is real data inside the object, so [[sizeof]] tells you about it. Adding the first virtual function grows each object by one pointer (plus any padding to keep it aligned). Adding more virtual functions does not grow objects at all — only the class\'s vtable gets longer.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

struct Particle {           // no virtual functions
    float x, y, z;
    int life;
};

struct VirtualParticle {    // one virtual function
    virtual ~VirtualParticle() = default;
    float x, y, z;
    int life;
};

struct ManyVirtuals {       // five virtual functions
    virtual ~ManyVirtuals() = default;
    virtual void update() {}
    virtual void draw() {}
    virtual void reset() {}
    virtual void kill() {}
    float x, y, z;
    int life;
};

int main() {
    std::cout << "Particle:        " << sizeof(Particle) << '\\n';
    std::cout << "VirtualParticle: " << sizeof(VirtualParticle) << '\\n';
    std::cout << "ManyVirtuals:    " << sizeof(ManyVirtuals) << '\\n';
    std::cout << "a pointer:       " << sizeof(void*) << '\\n';
}`,
          output: 'Particle:        16\nVirtualParticle: 24\nManyVirtuals:    24\na pointer:       8',
          annotations: [
            { lines: '3-6', text: 'Four 4-byte members: 16 bytes, nothing hidden.' },
            { lines: 9, text: 'One virtual function — even just a destructor — adds a vptr: 8 + 16 = 24 bytes.' },
            { lines: '15-19', text: 'Five virtual functions: still one vptr per object, so still 24 bytes. The extra cost moved into the shared vtable.' },
            { lines: 28, text: 'The output shown is from a 64-bit platform, where pointers are 8 bytes. Sizes are implementation-defined; a 32-bit build would show 4 here and 20 for the virtual structs.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Layout of one VirtualParticle (typical 64-bit compiler): the vptr comes first.',
          regions: [
            {
              label: 'VirtualParticle object (24 bytes)',
              kind: 'other',
              cells: [
                { name: 'vptr', value: '→ vtable for VirtualParticle', address: '+0', type: '8 bytes, hidden', highlight: true },
                { name: 'x', value: '0.0f', address: '+8', type: 'float' },
                { name: 'y', value: '0.0f', address: '+12', type: 'float' },
                { name: 'z', value: '0.0f', address: '+16', type: 'float' },
                { name: 'life', value: '60', address: '+20', type: 'int' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why small hot types avoid virtual',
          text: 'One million particles cost 16 MB without a vptr and 24 MB with one — 50% more memory to stream through the cache every frame, and only 2 particles per 64-byte cache line instead of 4. For millions of small objects the vptr alone can dominate. That is why engines keep types like vectors, colours, vertices and particles free of virtual functions, and why [[cache-locality]] is a recurring theme in game code.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal',
          text: '`FVector`, `FRotator` and `FTransform` have no virtual functions — an `FVector` is exactly three `double`s (24 bytes) in UE5. Every `UObject`, on the other hand, has a vptr, because `UObject` declares virtual functions. That is fine: actors and components are big objects counted in thousands, not millions.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'mcq',
      prompt: 'On a 64-bit platform, `struct A { double x; };` has `sizeof(A) == 8`. What is the size of `B`?',
      code: `struct B {
    virtual void f();
    virtual void g();
    virtual void h();
    double x;
};`,
      options: [
        { text: '`8`', why: 'Virtual functions are not free: `B` needs somewhere to store the pointer to its vtable.' },
        { text: '`32`', why: 'That assumes one pointer per virtual function (8 + 3 × 8). Objects store only **one** vptr; the three function addresses live in the shared vtable.' },
        { text: '`16`', correct: true, why: 'One 8-byte vptr plus the 8-byte `double`. The number of virtual functions does not affect object size.' },
        { text: '`24`', why: 'There is no extra padding here: an 8-byte vptr followed by an 8-byte `double` are both naturally aligned.' },
      ],
      explanation:
        'Each polymorphic object holds exactly one vptr (with single inheritance), regardless of how many virtual functions the class declares. The function addresses are stored once per class, in the vtable. So `B` is 8 bytes of vptr plus 8 bytes of `double` = 16.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'What a virtual call really costs',
      blocks: [
        {
          type: 'p',
          text: 'A virtual call is not slow in isolation — often a nanosecond or two. The costs come from what it **prevents** and from what happens at scale:',
        },
        {
          type: 'table',
          headers: ['Cost', 'What happens', 'When it matters'],
          rows: [
            ['Indirection', 'Two dependent loads (vptr, slot) before the call can start.', 'Rarely on its own — both are usually in cache.'],
            ['Blocked inlining', 'The compiler cannot inline a function it cannot identify, so no constant folding, no vectorisation, no dead-code removal across the call.', 'Tiny functions (getters, `isAlive()`) in hot loops — often the biggest cost.'],
            ['Branch misprediction', 'The CPU guesses the indirect call\'s target. Same type in a row: guessed right. Types shuffled randomly: frequent mispredictions, each costing ~15–20 cycles.', 'Mixed-type collections processed in random order.'],
            ['Cache misses', 'Objects reached through pointers are scattered on the heap; vtables and the many function bodies compete for cache.', 'Iterating over thousands or millions of polymorphic objects per frame.'],
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Keep it in proportion',
          text: 'A few thousand virtual calls per frame — AI decisions, gameplay events, UI — are noise. The costs bite in inner loops over huge numbers of objects: particles, physics bodies, ECS components. There, engines switch to data-oriented layouts: one tightly packed array per concrete type, processed without dispatch.',
        },
        {
          type: 'compare',
          left: {
            title: 'Mixed and scattered',
            tone: 'neutral',
            code: `std::vector<Enemy*> enemies;
// types interleaved, objects
// scattered, every call indirect
for (Enemy* e : enemies) {
    e->update();
}`,
          },
          right: {
            title: 'Sorted by type',
            tone: 'good',
            code: `// Goblin and Dragon marked final
std::vector<Goblin> goblins;
std::vector<Dragon> dragons;
for (Goblin& g : goblins) g.update();
for (Dragon& d : dragons) d.update();
// contiguous, direct, inlinable`,
          },
        },
        {
          type: 'p',
          text: 'Compilers also fight back with [[devirtualization]]: whenever they can prove the dynamic type, they emit a direct call and may inline it. Calling through a local object (`Dragon d; d.describe();`) or through a reference to a `final` class both compile to direct calls — no vtable involved. Note the `final` in the right-hand example: without it, `g.update()` through a `Goblin&` could still be a subclass, so it would remain a virtual call.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'truefalse',
      prompt: 'Calling a virtual function directly on a local object — `Dragon smaug; smaug.describe();` — still has to look up the function through the vtable.',
      answer: false,
      explanation:
        'The compiler knows `smaug` is exactly a `Dragon`: a variable of type `Dragon` cannot hold anything else. So it calls `Dragon::describe` directly (and may inline it). Dynamic dispatch is only needed when the code has a pointer or reference whose dynamic type might differ from its static type. GCC does this even at `-O1`.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Why aren\'t functions virtual by default?',
      blocks: [
        {
          type: 'p',
          text: 'Now you can see the reasoning. Making every member function virtual would give **every class** with a member function a vptr, put an indirect call behind every getter, and block inlining throughout the program. C++\'s guiding principle, stated by Stroustrup, is the [[zero-cost-abstraction|zero-overhead principle]]: *what you don\'t use, you don\'t pay for; and what you do use, you couldn\'t hand-code any better.*',
        },
        {
          type: 'p',
          text: 'There is a second, subtler reason: a vptr changes an object\'s **memory layout**. Many types in a game must be plain bytes with an exact layout:',
        },
        {
          type: 'code',
          code: `#include <type_traits>

struct Vertex {      // uploaded to the GPU as raw bytes
    float x, y, z;   // position
    float u, v;      // texture coordinates
};

static_assert(sizeof(Vertex) == 20);
static_assert(std::is_trivially_copyable_v<Vertex>);`,
          annotations: [
            { lines: '3-6', text: 'The GPU expects exactly five floats per vertex, tightly packed. A hidden 8-byte vptr at the front would shift everything and the shader would read garbage.' },
            { lines: 9, text: 'Classes with virtual functions are never *trivially copyable*: you cannot safely `memcpy` them, write them to a save file, or send them over the network as raw bytes. A vptr is an address that is only meaningful inside the running process.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'A virtual function is a design decision',
          text: 'Beyond performance, `virtual` is a **promise**: "derived classes may change this behaviour". A non-virtual function guarantees that the code you read is the code that runs. Making extension points explicit keeps class hierarchies understandable — you can see exactly where subclasses are allowed to plug in.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Other languages, other trade-offs',
          text: 'Java made every method virtual by default and relies on its just-in-time compiler to devirtualize hot calls at run time using profiling data. C#, designed later with Java\'s experience in view, went back to C++\'s model: methods are non-virtual unless marked `virtual`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: 'What is the main reason C++ member functions are non-virtual unless you write `virtual`?',
      options: [
        { text: 'Virtual functions can never be inlined, even when the object\'s type is known', why: 'Untrue: when the compiler can prove the dynamic type (local objects, `final` classes), it devirtualizes and can inline.' },
        { text: 'Early C++ compilers could not implement virtual functions efficiently', why: 'Virtual functions were in C++ from the start (and in Simula before it). The default was a deliberate design choice, not a limitation.' },
        { text: 'So classes that don\'t need dynamic dispatch pay nothing for it — no vptr, direct calls, full inlining and a plain memory layout', correct: true, why: 'This is the zero-overhead principle: features you do not use cost nothing. Most classes, especially small value types, never need dispatch.' },
        { text: 'Virtual functions are unsafe and can crash the program', why: 'Virtual functions are perfectly safe when used correctly. The default is about cost and design clarity, not safety.' },
      ],
      explanation:
        'Making dispatch opt-in means a `Vector3`, a `Vertex` or a `Score` stays exactly as small and fast as the equivalent C struct, while classes that genuinely need polymorphism can ask for it. It also makes every customisation point visible in the source code.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Virtual calls in constructors and destructors',
      blocks: [
        {
          type: 'p',
          text: 'Here is the quirk that surprises almost everyone. When a base-class constructor calls a virtual function, you get the **base** version — never the derived override. The same happens in destructors. Run this:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

class Enemy {
public:
    Enemy() {
        std::cout << "Enemy ctor:  ";
        announce();
    }
    virtual ~Enemy() {
        std::cout << "Enemy dtor:  ";
        announce();
    }
    virtual void announce() const {
        std::cout << "a generic enemy\\n";
    }
};

class Dragon : public Enemy {
public:
    Dragon() {
        std::cout << "Dragon ctor: ";
        announce();
    }
    ~Dragon() override {
        std::cout << "Dragon dtor: ";
        announce();
    }
    void announce() const override {
        std::cout << "a DRAGON with " << wings_ << " wings\\n";
    }
private:
    int wings_ = 2;
};

int main() {
    Dragon smaug;
    std::cout << "--- in game ---\\n";
    smaug.announce();
}`,
          output: 'Enemy ctor:  a generic enemy\nDragon ctor: a DRAGON with 2 wings\n--- in game ---\na DRAGON with 2 wings\nDragon dtor: a DRAGON with 2 wings\nEnemy dtor:  a generic enemy',
          annotations: [
            { lines: 7, text: 'While `Enemy()` runs, the `Dragon` part does not exist yet — `wings_` has not been initialised. The object is, for now, just an `Enemy`, so `Enemy::announce` runs.' },
            { lines: 11, text: 'In `~Enemy()`, the `Dragon` part has **already been destroyed**, so the object is back to being an `Enemy`.' },
            { lines: 22, text: 'By the time `Dragon()`\'s body runs, the object is a complete `Dragon` and dispatch reaches `Dragon::announce`.' },
            { lines: 24, text: 'An override of a virtual destructor. `override` works on destructors too.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why C++ refuses to call the override',
          text: 'If `Enemy()` called `Dragon::announce`, that function would read `wings_` before `Dragon`\'s constructor had initialised it — reading garbage, or worse, using a member object that does not exist yet. C++ chooses safety: an object\'s dynamic type is only the class whose constructor or destructor is currently running. (Java and C# do call the derived override from base constructors, and "field is still null in the override" is a famous bug in both.)',
        },
        {
          type: 'deepdive',
          title: 'How the compiler makes it happen',
          blocks: [
            {
              type: 'p',
              text: 'It is the vptr again. Each constructor, after its base classes are built, sets the object\'s vptr to **its own** class\'s vtable. So during `Enemy()` the vptr points at Enemy\'s vtable; then `Dragon()` overwrites it with Dragon\'s. Destructors do the reverse, resetting the vptr to their own class\'s table as each layer is torn down. Any virtual call made in between simply follows whatever the vptr points at right then.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Calling a function with no implementation',
          text: 'The next lesson introduces pure virtual functions (`= 0`), which have no base implementation at all. Calling one, even indirectly, from a base constructor or destructor is [[undefined-behavior]] — typically a crash with a message like "pure virtual method called".',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal',
          text: 'The same rules apply to `UObject` constructors — and Unreal adds another reason to keep them minimal: the constructor also runs to build each class\'s Class Default Object ([[cdo|CDO]]). Put gameplay logic in `BeginPlay()` (or `PostInitializeComponents()`), where the actor is fully constructed and virtual calls reach your overrides.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>
#include <string>

struct Weapon {
    Weapon() { std::cout << name() << ' '; }
    virtual ~Weapon() = default;
    virtual std::string name() const { return "weapon"; }
};

struct Bow : Weapon {
    Bow() { std::cout << name() << '\\n'; }
    std::string name() const override { return "bow"; }
};

int main() {
    Bow longbow;
}`,
      options: [
        { text: '`bow bow`', why: 'During `Weapon()`, the `Bow` part has not been constructed, so the object\'s dynamic type is still `Weapon` and `Bow::name` is not reachable.' },
        { text: '`weapon weapon`', why: 'By the time `Bow()`\'s body runs, the object is a full `Bow` (its vptr now points at Bow\'s vtable), so `Bow::name` runs.' },
        { text: '`bow weapon`', why: 'The base constructor runs first, not second, and it cannot see the derived override.' },
        { text: '`weapon bow`', correct: true, why: '`Weapon()` runs first and sees itself as a `Weapon`; then `Bow()` runs and sees a complete `Bow`.' },
      ],
      explanation:
        'Construction proceeds base first. During each constructor, the object behaves as an instance of that constructor\'s class: the vptr is updated layer by layer. So the base constructor\'s virtual call resolves to `Weapon::name` and the derived constructor\'s call to `Bow::name`. Destructors behave the same way in reverse.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'fill',
      prompt: 'Complete the summary of a virtual call\'s cost.',
      templateIsCode: false,
      template: 'A virtual call reads the object\'s ___, then the function\'s slot in the class\'s ___, then calls indirectly. Its biggest hidden cost is usually that it prevents ___.',
      blanks: [{ answers: ['vptr'] }, { answers: ['vtable'] }, { answers: ['inlining'] }],
      wordBank: ['vptr', 'vtable', 'inlining', 'compilation', 'linking', 'this', 'constructor'],
      explanation:
        'The vptr lives in the object and leads to the per-class vtable; the slot gives the function address. The loads themselves are cheap and usually cached. What hurts in hot code is that the compiler cannot see which function will run, so it cannot inline it — losing every optimisation that inlining would have unlocked.',
    },
  ],
  takeaways: [
    'Compilers implement virtual functions with a vtable per class (function addresses in fixed slots) and a hidden vptr per object.',
    'A virtual call is: load the vptr, load the slot, call indirectly — no searching by name.',
    'The first virtual function adds one pointer to every object; more virtual functions only lengthen the shared vtable.',
    'The real costs are blocked inlining, branch mispredictions and cache misses at scale; compilers devirtualize when they can prove the type (`final`, local objects).',
    'Functions are non-virtual by default so classes that don\'t need dispatch keep a plain, compact, trivially copyable layout — the zero-overhead principle.',
    'Inside a constructor or destructor, virtual calls go to that class\'s own version, never to a derived override.',
  ],
  reading: [
    {
      title: 'virtual function specifier',
      url: 'https://en.cppreference.com/w/cpp/language/virtual',
      source: 'cppreference',
      note: 'See the section on virtual calls during construction and destruction for the precise rules.',
    },
    {
      title: 'The virtual table',
      url: 'https://www.learncpp.com/cpp-tutorial/the-virtual-table/',
      source: 'learncpp',
      note: 'Another walkthrough of vptrs and vtables with diagrams.',
    },
    {
      title: 'isocpp FAQ: Inheritance — virtual functions',
      url: 'https://isocpp.org/wiki/faq/virtual-functions',
      source: 'isocpp',
      note: 'Covers how virtual calls work and the costs involved, in Q&A form.',
    },
    {
      title: 'Compiler Explorer',
      url: 'https://godbolt.org',
      source: 'other',
      note: 'Inspect the generated assembly for virtual, final and non-virtual calls yourself.',
    },
  ],
};
