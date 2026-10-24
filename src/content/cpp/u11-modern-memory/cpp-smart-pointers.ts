import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-smart-pointers',
  title: 'unique_ptr, shared_ptr and weak_ptr',
  summary: 'Make ownership part of the type: exclusive ownership with unique_ptr, shared ownership with shared_ptr, safe observation with weak_ptr — and when a raw pointer is still right.',
  minutes: 19,
  objectives: [
    'Express exclusive ownership with `std::unique_ptr` and create objects with `std::make_unique`',
    'Transfer ownership by moving a `unique_ptr`, and choose the right way to pass smart pointers to functions',
    'Explain how `std::shared_ptr` reference counting and the control block work, and what they cost',
    'Break ownership cycles with `std::weak_ptr` and use `lock()` safely',
    'Use raw pointers and references as non-owning observers',
    'Choose the right pointer for a situation, and relate them to Unreal\'s `TUniquePtr`/`TSharedPtr` and `UObject` garbage collection',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Ownership: who deletes this?',
      blocks: [
        {
          type: 'p',
          text: 'In Unit 8 you met raw `new` and `delete`, and their dangers: forget the `delete` and you leak, do it twice and you corrupt the heap, use the object afterwards and you read freed memory. Every one of those bugs comes from the same unanswered question: **who is responsible for deleting this object?** That responsibility is called [[ownership]].',
        },
        {
          type: 'p',
          text: 'A raw pointer `Enemy*` says nothing about ownership — it might own the enemy, or merely point at one owned elsewhere. [[smart-pointer|Smart pointers]] fix this by putting ownership into the **type**, and by applying RAII to heap objects: the smart pointer\'s destructor deletes the object, exactly once, automatically. They live in `<memory>`:',
        },
        {
          type: 'table',
          headers: ['Type', 'Ownership', 'Deletes the object when…'],
          rows: [
            ['`std::unique_ptr<T>`', 'Exactly one owner', 'The `unique_ptr` is destroyed or reset'],
            ['`std::shared_ptr<T>`', 'Several owners share it', 'The **last** `shared_ptr` owning it is destroyed or reset'],
            ['`std::weak_ptr<T>`', 'None — observes a shared object', 'Never; it just notices when the object is gone'],
            ['`T*` or `T&`', 'None — observes', 'Never; someone else owns the object'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why put ownership in the type?',
          text: 'Because the compiler can then enforce it. A function returning `std::unique_ptr<Enemy>` cannot "forget" to tell you that you own the result, and you cannot accidentally copy that ownership into two places. Ownership mistakes that used to be found by crashes in play-testing become compile errors — and the code documents itself.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'std::unique_ptr: exactly one owner',
      blocks: [
        {
          type: 'p',
          text: 'A [[unique-ptr|std::unique_ptr]] owns one heap object and deletes it in its destructor. You create one with [[make-unique|std::make_unique]], which calls `new` for you and immediately hands the result to the smart pointer. The angle brackets name the owned type, just like `std::vector<int>`. Otherwise it is used exactly like a raw pointer: `->`, `*` and `if (ptr)` all work.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <memory>
#include <string>

class Enemy {
public:
    explicit Enemy(const std::string& name) : name_{name} {
        std::cout << "spawn " << name_ << '\\n';
    }
    ~Enemy() { std::cout << "despawn " << name_ << '\\n'; }
    const std::string& name() const { return name_; }
private:
    std::string name_;
};

int main() {
    auto goblin = std::make_unique<Enemy>("Goblin");
    std::cout << "fighting " << goblin->name() << '\\n';
    {
        std::unique_ptr<Enemy> bat = std::make_unique<Enemy>("Bat");
    }                     // bat goes out of scope: deleted here
    goblin.reset();       // delete the goblin right now
    std::cout << "goblin is " << (goblin ? "alive" : "gone") << '\\n';
}`,
          output: 'spawn Goblin\nfighting Goblin\nspawn Bat\ndespawn Bat\ndespawn Goblin\ngoblin is gone',
          annotations: [
            { lines: 17, text: '`std::make_unique<Enemy>("Goblin")` forwards the arguments to `Enemy`\'s constructor and returns a `std::unique_ptr<Enemy>`. `auto` saves writing the type twice.' },
            { lines: 18, text: '`->` works just like with a raw pointer.' },
            { lines: 21, text: 'No `delete` anywhere: the `unique_ptr`\'s destructor deletes the bat at the closing brace.' },
            { lines: 22, text: '`reset()` deletes the owned object now and leaves the pointer empty (null).' },
            { lines: 23, text: 'An empty `unique_ptr` converts to `false`, just like a null raw pointer.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Truly zero overhead',
          text: 'A `std::unique_ptr` with the default deleter is exactly the size of a raw pointer (8 bytes on 64-bit), and `->` compiles to the same instruction. Its destructor is the `delete` you would have written by hand. There is no reason ever to prefer an owning raw pointer — this is the [[zero-cost-abstraction]] promise in action.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Why make_unique instead of new?',
          text: 'Writing `std::unique_ptr<Enemy> e{new Enemy{"Imp"}};` works, but `std::make_unique` names the type once, keeps `new` out of your code entirely (so every `new` you see in a code review is suspicious), and makes the object owned from the very first instant. Rule of thumb: in modern C++, application code should contain no naked `new` and no `delete`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Moving ownership',
      blocks: [
        {
          type: 'p',
          text: 'A `unique_ptr` cannot be copied — its copy constructor and copy assignment are deleted, exactly like the non-copyable classes in the copy lesson. Two copies would mean two owners and a double delete. But it **can be moved**: `std::move` transfers ownership, and the source is left guaranteed empty. This makes `unique_ptr` perfect for factory functions and for containers that own polymorphic objects:',
        },
        {
          type: 'code',
          title: 'wave.cpp',
          runnable: true,
          code: `#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <vector>

class Enemy {
public:
    Enemy() { ++alive; }
    virtual ~Enemy() { --alive; }
    virtual std::string name() const = 0;
    static int alive;
};
int Enemy::alive = 0;

class Archer : public Enemy {
public:
    std::string name() const override { return "Archer"; }
};

class Knight : public Enemy {
public:
    std::string name() const override { return "Knight"; }
};

std::unique_ptr<Enemy> spawn(char type) {
    if (type == 'a') {
        return std::make_unique<Archer>();
    }
    return std::make_unique<Knight>();
}

int main() {
    {
        std::vector<std::unique_ptr<Enemy>> wave;
        wave.push_back(spawn('a'));
        wave.push_back(spawn('k'));

        auto elite = std::make_unique<Knight>();
        // wave.push_back(elite);         // error: copy deleted
        wave.push_back(std::move(elite)); // ownership moves
        std::cout << "elite is " << (elite ? "set" : "null")
                  << '\\n';

        for (const auto& e : wave) {
            std::cout << "in wave: " << e->name() << '\\n';
        }
        std::cout << "alive: " << Enemy::alive << '\\n';
    }   // vector destroyed: each unique_ptr deletes its enemy
    std::cout << "alive after level: " << Enemy::alive << '\\n';
}`,
          output: 'elite is null\nin wave: Archer\nin wave: Knight\nin wave: Knight\nalive: 3\nalive after level: 0',
          annotations: [
            { lines: 10, text: 'The virtual destructor from Unit 10 matters here: each `unique_ptr<Enemy>` deletes through an `Enemy*`.' },
            { lines: '26-31', text: 'A factory: the caller receives ownership of a brand-new enemy. A `unique_ptr<Archer>` converts implicitly to `unique_ptr<Enemy>`, just as `Archer*` converts to `Enemy*`.' },
            { lines: 35, text: 'A container that **owns** polymorphic objects — the fix promised in the virtual functions lesson. No slicing, no manual cleanup.' },
            { lines: 40, text: 'Copying would create a second owner, so it does not compile ("use of deleted function").' },
            { lines: 41, text: '`std::move(elite)` hands ownership to the vector. A moved-from `unique_ptr` is guaranteed to be null — unlike most moved-from types, its state is fully specified.' },
            { lines: 49, text: 'When the vector dies, each element\'s destructor deletes its enemy. The counter proves nothing leaked.' },
          ],
        },
        {
          type: 'heading',
          text: 'Passing smart pointers to functions',
        },
        {
          type: 'table',
          headers: ['Signature', 'Meaning', 'Use when'],
          rows: [
            ['`void draw(const Enemy& e)`', 'Uses the object; no ownership involved', 'Almost always — most functions just use objects'],
            ['`void target(Enemy* e)`', 'Uses the object, which may be absent (`nullptr`)', 'The argument is optional'],
            ['`void adopt(std::unique_ptr<Enemy> e)`', 'Takes ownership (a "sink")', 'The function keeps or destroys the object; callers must `std::move`'],
            ['`void respawn(std::unique_ptr<Enemy>& e)`', 'May replace the caller\'s object', 'Rare'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not pass the unique_ptr everywhere?',
          text: 'A function that only reads an enemy\'s health does not care how the enemy is owned — on the stack, in a `unique_ptr`, in a `shared_ptr` or inside a `std::vector<Enemy>`. Taking `const Enemy&` lets it work with all of them. Mention a smart pointer in a signature only when the function participates in **ownership** (C++ Core Guidelines R.30).',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'bug',
      prompt: 'This code does not compile. Tap the line at fault.',
      code: `#include <memory>
#include <vector>

struct Enemy { int hp = 100; };

int main() {
    auto boss = std::make_unique<Enemy>();
    std::vector<std::unique_ptr<Enemy>> enemies;
    enemies.push_back(boss);
    boss->hp -= 10;
}`,
      bugLines: [9],
      hint: 'How many owners may a `unique_ptr`\'s object have?',
      explanation:
        'Line 9 tries to **copy** `boss` into the vector, and `unique_ptr`\'s copy constructor is deleted — two copies would both try to delete the enemy. The fix is `enemies.push_back(std::move(boss));`. But then line 10 becomes a bug: after the move, `boss` is null, and `boss->hp` dereferences a null pointer (undefined behavior). Once you move ownership away, use the object through its new owner: `enemies.back()->hp -= 10;`.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>
#include <memory>
#include <utility>

int main() {
    auto a = std::make_unique<int>(5);
    auto b = std::move(a);
    std::cout << (a ? "a owns" : "a empty") << ", " << *b << '\\n';
}`,
      options: [
        { text: '`a owns, 5`', why: 'Moving a `unique_ptr` transfers ownership; it does not duplicate it. Only one of `a` and `b` can own the integer.' },
        { text: '`a empty, 5`', correct: true, why: 'The move constructor gives `b` the pointer and sets `a` to null — a guarantee specific to `unique_ptr`. The integer itself never moved in memory.' },
        { text: 'An unspecified value for `a`, because it is in a valid but unspecified state', why: 'That is the general rule for standard library types, but smart pointers make a stronger promise: a moved-from `unique_ptr` (or `shared_ptr`) is always empty.' },
        { text: 'It does not compile: `unique_ptr` cannot be copied', why: '`std::move(a)` makes this a move, not a copy, and `unique_ptr` is movable.' },
      ],
      explanation:
        'Moving a `unique_ptr` is ownership transfer: the address is handed to the new `unique_ptr`, and the old one becomes null so that exactly one destructor will delete the object. The pointed-to object never moves; only the responsibility for it does.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'std::shared_ptr: shared ownership by reference counting',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes ownership genuinely has to be shared: several meshes use one texture, and the texture should stay loaded as long as *any* of them needs it. A [[shared-ptr|std::shared_ptr]] can be copied; every copy is an owner. Behind the scenes, a heap structure called the [[control-block]] keeps a [[reference-counting|reference count]] of the owners. Copying increments it, destroying an owner decrements it, and when it reaches zero the object is deleted.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <memory>
#include <string>

class Texture {
public:
    explicit Texture(const std::string& file) : file_{file} {
        std::cout << "load " << file_ << '\\n';
    }
    ~Texture() { std::cout << "unload " << file_ << '\\n'; }
private:
    std::string file_;
};

int main() {
    auto lava = std::make_shared<Texture>("lava.png");
    std::cout << "owners: " << lava.use_count() << '\\n';
    {
        std::shared_ptr<Texture> rockA = lava;   // +1
        std::shared_ptr<Texture> rockB = lava;   // +1
        std::cout << "owners: " << lava.use_count() << '\\n';
    }                                            // -2
    std::cout << "owners: " << lava.use_count() << '\\n';
    lava.reset();                    // last owner gives up
    std::cout << "done\\n";
}`,
          output: 'load lava.png\nowners: 1\nowners: 3\nowners: 1\nunload lava.png\ndone',
          annotations: [
            { lines: 16, text: '`std::make_shared` creates the `Texture` **and** its control block in one allocation, with the count at 1.' },
            { lines: '19-20', text: 'Copies are cheap — two pointers each — but each one increments the shared count.' },
            { lines: 22, text: '`rockA` and `rockB` are destroyed; each decrements the count. The texture stays loaded because `lava` still owns it.' },
            { lines: 24, text: 'The count drops to zero, so the texture is deleted right here — deterministic, like every other RAII type.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Three shared_ptrs, one control block, one Texture. With make_shared, the control block and the object share a single heap allocation.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'lava', value: 'obj + ctrl ptrs', type: 'shared_ptr (16 bytes)', pointsTo: 'cb' },
                { name: 'rockA', value: 'obj + ctrl ptrs', type: 'shared_ptr (16 bytes)', pointsTo: 'cb' },
                { name: 'rockB', value: 'obj + ctrl ptrs', type: 'shared_ptr (16 bytes)', pointsTo: 'cb' },
              ],
            },
            {
              label: 'Heap — one allocation from make_shared',
              kind: 'heap',
              cells: [
                { id: 'cb', name: 'control block', value: 'strong: 3, weak: 0', highlight: true },
                { name: 'Texture', value: 'file_ = "lava.png"', type: 'Texture' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'What shared ownership costs',
          text: 'A `shared_ptr` is two pointers wide (object and control block). The control block is an extra heap allocation (merged into one by `make_shared`). And every copy and destruction updates the count **atomically**, so the count stays correct across threads — an atomic increment is far slower than a normal one. Pass `shared_ptr`s by `const&` (or pass the object itself by reference) when a function does not need to share ownership. Note that only the *count* is thread-safe; the `Texture` itself is not.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Do not reach for shared_ptr by default',
          text: 'Shared ownership makes lifetimes hard to reason about: the object dies whenever the last of many owners lets go, which could be anywhere in the code. Prefer `unique_ptr` and add sharing only when the design genuinely requires it (Core Guidelines R.21). A `unique_ptr` can always be converted into a `shared_ptr` later — `std::shared_ptr<T> s = std::move(u);` — but not the other way round.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `auto a = std::make_shared<int>(7);
auto b = a;
std::shared_ptr<int> c;
c = b;
b.reset();
std::cout << a.use_count() << '\\n';`,
      options: [
        { text: '`3`', why: 'Three `shared_ptr`s owned the integer at one point, but `b.reset()` gave up `b`\'s ownership.' },
        { text: '`1`', why: '`c = b` made `c` an owner too, and `c` is still alive.' },
        { text: '`2`', correct: true, why: '`a`, `b` and `c` all owned it (count 3); `b.reset()` released one ownership, leaving `a` and `c`.' },
        { text: '`0`', why: 'The count is only zero once every owner has gone, at which point the integer is deleted. `a` itself is still an owner.' },
      ],
      explanation:
        'Every `shared_ptr` that points at the object through the same control block is an owner. Copy construction (`auto b = a;`) and copy assignment (`c = b;`) both add an owner; `reset()`, destruction, or assigning something else releases one. `use_count()` reports the number of owners, which is 2 here.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'std::weak_ptr: observing without owning',
      blocks: [
        {
          type: 'p',
          text: 'A turret tracks a target enemy. The turret should not keep the enemy alive — when the enemy dies, it dies — but the turret must be able to **find out** that it died, instead of aiming at a [[dangling-pointer]]. That is exactly what a [[weak-ptr|std::weak_ptr]] does. It points at an object owned by `shared_ptr`s without adding to the owner count, and `lock()` gives you a temporary `shared_ptr` if the object is still alive, or an empty one if it is gone:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <memory>
#include <string>

struct Enemy {
    std::string name;
    explicit Enemy(const std::string& n) : name{n} {}
    ~Enemy() { std::cout << name << " destroyed\\n"; }
};

class Turret {
public:
    void setTarget(const std::shared_ptr<Enemy>& e) { target_ = e; }

    void update() const {
        if (std::shared_ptr<Enemy> t = target_.lock()) {
            std::cout << "turret fires at " << t->name << '\\n';
        } else {
            std::cout << "turret: no target\\n";
        }
    }

private:
    std::weak_ptr<Enemy> target_;   // observes, doesn't own
};

int main() {
    auto orc = std::make_shared<Enemy>("Orc");
    Turret turret;
    turret.setTarget(orc);
    turret.update();
    std::cout << "owners: " << orc.use_count() << '\\n';
    orc.reset();                    // the orc dies
    turret.update();
}`,
          output: 'turret fires at Orc\nowners: 1\nOrc destroyed\nturret: no target',
          annotations: [
            { lines: 16, text: '`lock()` atomically checks whether the enemy is alive and, if so, returns a `shared_ptr` that keeps it alive **for the duration of this `if`** — so it cannot be destroyed halfway through firing.' },
            { lines: 24, text: 'A `weak_ptr` member: the turret can observe the enemy but never prolongs its life.' },
            { lines: 32, text: 'Still 1: the turret\'s `weak_ptr` is not an owner.' },
            { lines: 33, text: 'The last owner lets go, so the orc is destroyed even though the turret still "points" at it. The next `lock()` returns an empty `shared_ptr`.' },
          ],
        },
        {
          type: 'heading',
          text: 'Breaking ownership cycles',
        },
        {
          type: 'p',
          text: 'Reference counting has one blind spot. If a `Guild` holds a `shared_ptr` to its leader, and the leader `Player` holds a `shared_ptr` back to the guild, each keeps the other\'s count above zero forever. When `main` ends, the two objects keep each other alive and are never destroyed — a [[memory-leak]], even though no raw pointer was used:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <memory>

struct Player;

struct Guild {
    std::shared_ptr<Player> leader;   // owning: fine
    ~Guild() { std::cout << "~Guild\\n"; }
};

struct Player {
    std::shared_ptr<Guild> guild;     // owning back-pointer: cycle!
    ~Player() { std::cout << "~Player\\n"; }
};

int main() {
    auto guild = std::make_shared<Guild>();
    auto hero = std::make_shared<Player>();
    guild->leader = hero;
    hero->guild = guild;
    std::cout << "end of main\\n";
}   // no destructor output: both objects leak`,
          output: 'end of main',
          annotations: [
            { lines: 4, text: 'A forward declaration, so `Guild` can mention `Player` before it is defined.' },
            { lines: 12, text: 'The bug. Change this one line to `std::weak_ptr<Guild> guild;` and the output becomes `end of main`, `~Guild`, `~Player`: the back-reference observes instead of owning, so the cycle is broken.' },
            { lines: 22, text: 'When `guild` and `hero` go out of scope, each count drops from 2 to 1 — never to 0 — so neither object is ever destroyed.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Rule for back-references',
          text: 'Ownership should form a tree: parents own children (`shared_ptr` or `unique_ptr`), and children refer back to parents with a non-owning pointer — a `weak_ptr` if the parent is shared and might disappear, or a raw pointer if the parent is guaranteed to outlive the child.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'truefalse',
      prompt: 'Holding a `std::weak_ptr` to an enemy keeps that enemy alive until the `weak_ptr` itself is destroyed.',
      answer: false,
      explanation:
        'A `weak_ptr` never owns: it does not add to the strong count, so the enemy is destroyed as soon as the last `shared_ptr` lets go. What the `weak_ptr` keeps alive is only the small control block, so that `lock()` and `expired()` can still report "the object is gone" safely. That is the whole point — observe without prolonging life.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'fill',
      prompt: 'Complete the homing missile so it does not keep its target alive, but only steers while the target still exists.',
      template: `class HomingMissile {
public:
    void update() {
        if (std::shared_ptr<Enemy> t = target_.___()) {
            steerTowards(*t);
        }
    }
private:
    std::___<Enemy> target_;
};`,
      blanks: [{ answers: ['lock'] }, { answers: ['weak_ptr'] }],
      wordBank: ['lock', 'get', 'expired', 'weak_ptr', 'shared_ptr', 'unique_ptr'],
      explanation:
        'A `std::weak_ptr` member observes the target without owning it. `lock()` returns a `shared_ptr` — non-empty only if the target is still alive — and that `shared_ptr` keeps the target alive while `steerTowards` runs. A `shared_ptr` member would keep dead enemies in memory; `expired()` returns a `bool`, not a pointer; and `weak_ptr` has no `get()`, precisely so you cannot use the object without checking that it is alive.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Raw pointers and references: observers, not owners',
      blocks: [
        {
          type: 'p',
          text: 'Smart pointers do not make raw pointers obsolete — they give them a precise meaning. In modern C++, a raw pointer `T*` or a reference `T&` means **"I am using this object; someone else owns it."** That is the right choice for the vast majority of function parameters and for links to objects guaranteed to outlive you:',
        },
        {
          type: 'code',
          code: `void drawHealthBar(const Enemy& e);          // uses, never owns
void setAggroTarget(Enemy* target);           // may be nullptr

auto boss = std::make_unique<Enemy>("Lich");
drawHealthBar(*boss);                         // pass the object
setAggroTarget(boss.get());                   // raw, non-owning`,
          annotations: [
            { lines: 1, text: 'Prefer a reference when the object must exist.' },
            { lines: 2, text: 'Use a pointer when "no object" (`nullptr`) is a valid answer.' },
            { lines: 6, text: '`.get()` returns the raw pointer without giving up ownership. The `unique_ptr` still deletes the boss later — so `setAggroTarget` must never `delete` it, and must not keep it longer than the boss lives.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Two owners from one raw pointer',
            tone: 'bad',
            code: `Enemy* raw = new Enemy{"Imp"};
std::shared_ptr<Enemy> a{raw};
std::shared_ptr<Enemy> b{raw};
// two control blocks, each with
// count 1: the Imp is deleted
// twice`,
          },
          right: {
            title: 'Create owners from owners',
            tone: 'good',
            code: `auto a = std::make_shared<Enemy>("Imp");
std::shared_ptr<Enemy> b = a;
// one control block, count 2:
// deleted exactly once`,
          },
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Observers must not outlive owners',
          text: 'A raw pointer cannot tell you that its object has died. If the observer might outlive the owner — the turret and the enemy — use a `weak_ptr` (with a `shared_ptr` owner) or redesign so the lifetime is guaranteed. And never call `delete` on a pointer obtained from `.get()`: the smart pointer will delete it again. (`release()` exists to give up ownership entirely, returning a raw pointer you must then manage — rarely needed.)',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'A function only needs to read an enemy\'s current health to draw its health bar. Enemies are owned by a `std::vector<std::unique_ptr<Enemy>>`. Which signature is best?',
      codeOptions: true,
      options: [
        { text: 'void drawHealthBar(std::shared_ptr<Enemy> e)', why: 'Forces callers to own enemies through `shared_ptr` (these are `unique_ptr`s, so it would not even compile), and every call would pay for atomic count updates.' },
        { text: 'void drawHealthBar(std::unique_ptr<Enemy> e)', why: 'This is a sink: it takes ownership. The caller would have to `std::move` the enemy in, and it would be deleted when the function returns!' },
        { text: 'void drawHealthBar(Enemy e)', why: 'Copies the enemy on every call — and if `Enemy` is a polymorphic base, slices it. Copying is also wasteful just to read one number.' },
        { text: 'void drawHealthBar(const Enemy& e)', correct: true, why: 'The function uses the enemy without any ownership. It works however the enemy is owned — callers write `drawHealthBar(*enemies[i]);`.' },
      ],
      explanation:
        'Mention a smart pointer in a function signature only when the function takes part in ownership: taking it (`unique_ptr` by value), sharing it (`shared_ptr` by value), or replacing it (by non-const reference). For merely using an object, pass `const T&` (or `T*` if it may be absent). This keeps functions reusable and free of reference-counting overhead.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Choosing the right pointer — and Unreal\'s versions',
      blocks: [
        {
          type: 'steps',
          items: [
            { title: 'Can it be a plain value?', text: 'A member, a local, or an element of a `std::vector<T>`. No pointer at all is the simplest, fastest ownership. Use the heap only when you need polymorphism, a lifetime that does not match a scope, or a very large object.' },
            { title: 'One clear owner? → `std::unique_ptr`', text: 'The default for heap objects: factories, polymorphic containers, members that own sub-objects. Zero overhead.' },
            { title: 'Lifetime decided by whoever finishes last? → `std::shared_ptr`', text: 'Assets shared by many users, objects handed to asynchronous tasks. Costs a control block and atomic counting.' },
            { title: 'Need to notice when a shared object dies? → `std::weak_ptr`', text: 'Targets, caches, back-references that must not form cycles.' },
            { title: 'Just using an object? → `T&` or `T*`', text: 'Function parameters and links to objects guaranteed to outlive the user.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'A common asset-cache pattern',
          text: 'The meshes that use a texture each hold a `shared_ptr<Texture>`; the cache that hands textures out holds only `weak_ptr<Texture>`s. When the last mesh is gone, the texture unloads, and the next request finds an expired `weak_ptr` and loads it again. Owners own; the cache merely remembers.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Smart pointers in Unreal',
          text: 'Unreal has its own family for **non-`UObject`** types: [[tuniqueptr|TUniquePtr]] (`MakeUnique`), [[tsharedptr|TSharedPtr]] and the never-null `TSharedRef` (`MakeShared`), and [[tweakptr|TWeakPtr]]. They work like their `std::` counterparts; `TSharedPtr` even lets you choose whether its reference count is thread-safe. `UObject`s are different: they are owned by Unreal\'s [[ue-garbage-collector|garbage collector]]. You keep one alive by referencing it from a `UPROPERTY()` (typically a [[tobjectptr|TObjectPtr]]), and observe one that may be destroyed with [[tweakobjectptr|TWeakObjectPtr]] — the `UObject` world\'s `weak_ptr`.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Never mix the two worlds',
          text: 'Do not put a `UObject` in a `std::unique_ptr`, `std::shared_ptr`, `TUniquePtr` or `TSharedPtr`. The garbage collector already owns it; a smart pointer would try to `delete` it as well, and the collector cannot see references held inside these pointers. `UObject`s go in `UPROPERTY` members; everything else may use smart pointers.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'An Unreal actor tracks another actor it does not own, which may be destroyed at any moment. Which is the closest equivalent of `std::weak_ptr` for this?',
      options: [
        { text: '`TSharedPtr<AActor>`', why: '`TSharedPtr` is for non-`UObject` types, and it would claim ownership. Actors are owned by the engine and its garbage collector.' },
        { text: '`TWeakObjectPtr<AActor>`', correct: true, why: 'It refers to a `UObject` without keeping it alive, and reports when the object has been destroyed (`IsValid()` / `Get()` returning `nullptr`) — exactly the turret-and-target pattern.' },
        { text: '`TUniquePtr<AActor>`', why: 'A unique owner would try to delete the actor itself, fighting the garbage collector. `UObject`s must never go in `TUniquePtr`.' },
        { text: 'A raw `AActor*` member without `UPROPERTY`', why: 'A raw pointer cannot detect that the actor was destroyed; after garbage collection it may dangle. That is precisely the bug a weak pointer prevents.' },
      ],
      explanation:
        'Unreal splits pointers by what they point at. For `UObject`s: `UPROPERTY()` `TObjectPtr` references keep objects alive (strong), and `TWeakObjectPtr` observes them safely (weak). For plain C++ types: `TUniquePtr`, `TSharedPtr` and `TWeakPtr` mirror the standard library. The design questions — who owns, who observes, how to detect death — are the same ones you answered in this lesson.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'Several meshes use the same texture. The texture must stay loaded while **any** mesh uses it and unload automatically when the last mesh is destroyed. What should each mesh hold?',
      codeOptions: true,
      options: [
        { text: 'std::unique_ptr<Texture>', why: 'A `unique_ptr` allows only one owner, so several meshes cannot all own the same texture.' },
        { text: 'std::weak_ptr<Texture>', why: 'If every mesh only observed the texture, nothing would own it and it would be unloaded immediately. Weak pointers fit the cache, not the users.' },
        { text: 'std::shared_ptr<Texture>', correct: true, why: 'Each mesh is an owner; the reference count tracks how many remain, and the texture is deleted exactly when the last owner goes away.' },
        { text: 'Texture* (raw pointer)', why: 'Raw pointers do not own, so nothing would decide when to unload — you would be back to manual, error-prone bookkeeping.' },
      ],
      explanation:
        '"The object lives as long as the longest of several users needs it" is the defining case for shared ownership, so `std::shared_ptr` fits. Contrast it with a level that owns its physics world outright (`unique_ptr`), a turret watching a target (`weak_ptr`), or a function reading a mesh (`const Mesh&`).',
    },
  ],
  takeaways: [
    'Smart pointers put ownership in the type and apply RAII to heap objects: no naked `new`, no `delete`.',
    '`std::unique_ptr` is the default: one owner, zero overhead, non-copyable but movable; create it with `std::make_unique`.',
    'A moved-from `unique_ptr` is guaranteed null; containers of `unique_ptr<Base>` own polymorphic objects without slicing.',
    '`std::shared_ptr` shares ownership through an atomically updated count in a control block; use `std::make_shared` and only when sharing is truly needed.',
    'Cycles of `shared_ptr`s leak; break them with `std::weak_ptr`, which observes without owning and checks liveness with `lock()`.',
    'Raw pointers and references are non-owning observers — the right choice for most function parameters.',
    'Unreal uses `TUniquePtr`/`TSharedPtr`/`TWeakPtr` for non-`UObject`s and garbage collection plus `TObjectPtr`/`TWeakObjectPtr` for `UObject`s — never mix them.',
  ],
  reading: [
    {
      title: 'std::unique_ptr',
      url: 'https://en.cppreference.com/w/cpp/memory/unique_ptr',
      source: 'cppreference',
      note: 'The full interface, including custom deleters and the array form.',
    },
    {
      title: 'std::shared_ptr',
      url: 'https://en.cppreference.com/w/cpp/memory/shared_ptr',
      source: 'cppreference',
      note: 'Details of the control block, thread-safety guarantees and aliasing.',
    },
    {
      title: 'std::weak_ptr',
      url: 'https://en.cppreference.com/w/cpp/memory/weak_ptr',
      source: 'cppreference',
      note: 'How lock(), expired() and the weak count work.',
    },
    {
      title: 'C++ Core Guidelines: Smart pointers',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-smartptrparam',
      source: 'core-guidelines',
      note: 'Rules R.20 to R.37 on choosing smart pointers and passing them to functions.',
    },
    {
      title: 'Smart Pointer Library in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/smart-pointers-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s guide to TSharedPtr, TSharedRef, TWeakPtr and TUniquePtr, and when not to use them.',
    },
  ],
};
