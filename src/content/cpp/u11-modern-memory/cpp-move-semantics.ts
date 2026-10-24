import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-move-semantics',
  title: 'Move Semantics and rvalue References',
  summary: 'Steal instead of copy: lvalues and rvalues, move constructors, what std::move really does, noexcept, the Rules of Five and Zero, and copy elision.',
  minutes: 19,
  objectives: [
    'Distinguish lvalues from rvalues and explain what an rvalue reference (`T&&`) binds to',
    'Write a move constructor and move assignment operator that steal resources and leave the source safe',
    'Explain that `std::move` is only a cast, and predict when a "move" silently becomes a copy',
    'Explain why move operations should be `noexcept`, using `std::vector` reallocation as the example',
    'Apply the Rule of Five and prefer the Rule of Zero',
    'Describe copy elision and why `return std::move(local);` is a mistake',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Why copying is not always the answer',
      blocks: [
        {
          type: 'p',
          text: 'The last lesson made `Mesh` copy correctly: a deep copy allocates a new buffer and copies every vertex. But look at where copies often come from: a temporary `Mesh{5000}` pushed into a vector, or a mesh returned from a loading function. The source is about to be destroyed anyway. Deep-copying 5,000 vertices and then immediately freeing the originals is pure waste.',
        },
        {
          type: 'p',
          text: 'What we want instead is to **steal** the buffer: copy the pointer and the count into the new object, then set the source\'s pointer to `nullptr` so its destructor frees nothing. That is a *move* — a handful of pointer assignments instead of an allocation plus a loop — and it is what [[move-semantics]] adds to C++.',
        },
        {
          type: 'memory',
          caption: 'Moving a mesh: the buffer stays where it is; only ownership changes hands.',
          regions: [
            {
              label: 'Before the move',
              kind: 'stack',
              cells: [
                { name: 'temp.vertices_', value: '0x7000', type: 'float*', pointsTo: 'mv-buf', highlight: true },
                { name: 'temp.count_', value: '5000', type: 'int' },
              ],
            },
            {
              label: 'After the move',
              kind: 'stack',
              cells: [
                { name: 'mesh.vertices_', value: '0x7000', type: 'float*', pointsTo: 'mv-buf', highlight: true },
                { name: 'mesh.count_', value: '5000', type: 'int' },
                { name: 'temp.vertices_', value: 'nullptr', type: 'float*' },
                { name: 'temp.count_', value: '0', type: 'int' },
              ],
            },
            {
              label: 'Heap',
              kind: 'heap',
              cells: [{ id: 'mv-buf', value: '[5000 floats]', address: '0x7000', type: 'float[5000]' }],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Moving house',
          text: 'Copying is building an identical house next door and demolishing the old one. Moving is handing over the keys. The house — the expensive part — never moves at all.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Life before C++11',
          text: 'Before C++11 there was no way to tell "a copy from something I still need" apart from "a copy from something about to die", so returning a big container from a function or growing a `std::vector` of strings meant deep copies everywhere. Programmers contorted their code with output parameters and `swap` tricks. C++11 added the missing piece: a way for a function to know that its argument is disposable.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'lvalues, rvalues and T&&',
      blocks: [
        {
          type: 'p',
          text: 'To know whether stealing is safe, C++ classifies every expression. An [[lvalue]] has an identity that outlives the expression — a named variable, `*ptr`, `items[0]`. You can take its address. An [[rvalue]] is a value with no lasting identity — a literal like `42`, the result of `a + b`, an object returned by value from a function. Nobody else can refer to it, so nobody will notice if it is plundered.',
        },
        {
          type: 'p',
          text: 'C++11 added a new kind of reference to catch exactly those disposable values: the [[rvalue-reference|rvalue reference]], written `T&&`. It binds to rvalues only. Overloading a function on `const T&` and `T&&` lets it react differently to "a value you still own" and "a value about to die":',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>

void take(const std::string& s) {
    std::cout << "lvalue overload: " << s << '\\n';
}

void take(std::string&& s) {
    std::cout << "rvalue overload: " << s << '\\n';
}

std::string makeName() { return "Mage"; }

int main() {
    std::string hero = "Ranger";
    take(hero);                  // a named variable
    take(makeName());            // a function's return value
    take(hero + "!");            // the result of +
    take(std::string{"Rogue"});  // an explicit temporary
}`,
          output: 'lvalue overload: Ranger\nrvalue overload: Mage\nrvalue overload: Ranger!\nrvalue overload: Rogue',
          annotations: [
            { lines: 4, text: '`const std::string&` can bind to anything, but promises not to modify it.' },
            { lines: 8, text: '`std::string&&` binds **only** to rvalues. When both overloads are viable, an rvalue prefers this one — so inside, the function knows it may safely steal from `s`.' },
            { lines: 16, text: '`hero` has a name and lives on after this line: an lvalue. Stealing its contents would surprise the code that uses `hero` later.' },
            { lines: '17-19', text: 'Temporaries ([[temporary-object|temporary objects]]): they die at the end of the statement, so nobody could ever observe that they were plundered.' },
          ],
        },
        {
          type: 'table',
          headers: ['Reference type', 'Binds to lvalues?', 'Binds to rvalues?'],
          rows: [
            ['`T&`', 'Yes', 'No'],
            ['`const T&`', 'Yes', 'Yes (read-only)'],
            ['`T&&`', 'No', 'Yes'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'A named rvalue reference is an lvalue',
          text: 'Inside `take(std::string&& s)`, the expression `s` has a name, so it is an **lvalue**! The `&&` describes what the reference *was bound to*, not what `s` is now. This is deliberate: you might use `s` several times in the function, and an automatic move on first use would leave it empty for the rest. To pass it on as an rvalue you must say so explicitly — that is `std::move`, coming up shortly.',
        },
        {
          type: 'deepdive',
          title: 'glvalues, prvalues and xvalues',
          blocks: [
            {
              type: 'p',
              text: 'The standard\'s full taxonomy has five categories. A *prvalue* ("pure rvalue") is a temporary-making expression like `42` or `makeName()`. An *xvalue* ("expiring value") is an object that still has an identity but has been marked as disposable — the result of `std::move(x)`. Both count as rvalues. Lvalues and xvalues together are *glvalues* (things with identity). For everyday code, "lvalue = has a name and lives on; rvalue = disposable" is all you need.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Given `int hp = 50;`, `std::vector<int> scores{1, 2, 3};` and `Enemy spawnEnemy();` (returns an `Enemy` by value), which expressions are **rvalues**? Select all that apply.',
      options: [
        { text: '`100`', correct: true, why: 'A literal has no identity and no address you could take. It is a prvalue.' },
        { text: '`hp`', why: 'A named variable that lives on after the expression: an lvalue. You can write `&hp`.' },
        { text: '`hp * 2`', correct: true, why: 'The result of arithmetic is a fresh temporary value with no name.' },
        { text: '`scores[0]`', why: '`operator[]` returns a reference to an element that lives inside the vector — it has an identity, so it is an lvalue. You can even assign to it.' },
        { text: '`spawnEnemy()`', correct: true, why: 'A function returning by value produces a temporary object that dies at the end of the full expression unless something takes it over — an rvalue, ideal for moving from.' },
      ],
      explanation:
        'Ask two questions: does the expression refer to an object that lives on after this statement, and could something else refer to it later? If yes, it is an lvalue and stealing from it would surprise someone. If it is a nameless temporary — a literal, an arithmetic result, a by-value return — it is an rvalue and can safely be moved from.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'The move constructor and move assignment',
      blocks: [
        {
          type: 'p',
          text: 'A [[move-constructor]] takes `T&&` and steals the source\'s resources, leaving the source empty but safe to destroy. Here it is for `Mesh`, next to the copy constructor from the last lesson:',
        },
        {
          type: 'code',
          title: 'mesh_move.cpp',
          runnable: true,
          code: `#include <algorithm>
#include <iostream>
#include <utility>
#include <vector>

class Mesh {
public:
    explicit Mesh(int count)
        : count_{count}, vertices_{new float[count]{}} {}

    Mesh(const Mesh& other)                  // copy: duplicate
        : count_{other.count_}, vertices_{new float[other.count_]} {
        std::copy(other.vertices_, other.vertices_ + count_,
                  vertices_);
        std::cout << "copy " << count_ << " vertices\\n";
    }

    Mesh(Mesh&& other) noexcept              // move: steal
        : count_{std::exchange(other.count_, 0)},
          vertices_{std::exchange(other.vertices_, nullptr)} {
        std::cout << "move (stole " << count_ << " vertices)\\n";
    }

    ~Mesh() { delete[] vertices_; }

    int count() const { return count_; }

private:
    int count_;
    float* vertices_;
};

int main() {
    std::vector<Mesh> level;
    level.reserve(2);
    level.push_back(Mesh{5000});   // temporary: moved
    Mesh rock{50};
    level.push_back(rock);         // named variable: copied
    std::cout << "rock still has " << rock.count() << '\\n';
}`,
          output: 'move (stole 5000 vertices)\ncopy 50 vertices\nrock still has 50',
          annotations: [
            { lines: 18, text: 'Takes `Mesh&&`: only rvalues bind here. No `const` — we are going to modify the source. `noexcept` promises the move cannot throw (it allocates nothing); a later card shows why that promise matters so much.' },
            { lines: 19, text: '`std::exchange(x, v)` (from `<utility>`) sets `x` to `v` and returns the **old** value. So we take the count and leave `0` behind…' },
            { lines: 20, text: '…and take the pointer, leaving `nullptr` behind. The source\'s destructor will run `delete[] nullptr`, which is defined to do nothing.' },
            { lines: 36, text: '`push_back` has an overload taking `Mesh&&`. A temporary binds to it, so the vector move-constructs its element: no allocation, no copying of 5,000 floats.' },
            { lines: 38, text: '`rock` is an lvalue — it is used again on the next line — so the vector must copy it.' },
          ],
        },
        {
          type: 'p',
          text: 'Move assignment does the same for an object that already exists: free your own resource, then steal the other\'s:',
        },
        {
          type: 'code',
          code: `Mesh& operator=(Mesh&& other) noexcept {
    if (this != &other) {
        delete[] vertices_;                  // free our buffer
        count_ = std::exchange(other.count_, 0);
        vertices_ = std::exchange(other.vertices_, nullptr);
    }
    return *this;
}`,
          annotations: [
            { lines: 2, text: 'Guard against self-move (`m = std::move(m)`): without it we would free our own buffer and then "steal" the dangling pointer.' },
            { lines: 3, text: 'Unlike the move constructor, the target already owns a buffer, which must be released first or it leaks.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why leave the source empty instead of untouched?',
          text: 'After a move, two objects exist and both will be destroyed. If the source still held the pointer, its destructor would free the buffer now owned by the destination — the shallow-copy double free all over again. Setting the source to an empty state transfers **ownership**, not just the data, so exactly one object is responsible for freeing it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'fill',
      prompt: 'Complete the move constructor so it binds only to rvalues, promises not to throw, and leaves the source safe to destroy.',
      template: `Mesh(Mesh___ other) ___
    : count_{other.count_}, vertices_{other.vertices_} {
    other.vertices_ = ___;
    other.count_ = 0;
}`,
      blanks: [{ answers: ['&&'] }, { answers: ['noexcept'] }, { answers: ['nullptr'] }],
      wordBank: ['&&', '&', 'noexcept', 'const', 'nullptr', 'delete', 'override'],
      explanation:
        '`Mesh&&` makes this the move constructor (with a single `&` it would be a non-const copy constructor). `noexcept` tells containers it is safe to move rather than copy during reallocation. Setting `other.vertices_ = nullptr` hands over ownership: when `other` is destroyed, `delete[] nullptr` does nothing, so the buffer is freed exactly once — by the new owner.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'std::move is only a cast',
      blocks: [
        {
          type: 'p',
          text: 'Moving from temporaries happens automatically. But what about a named object you are finished with? Because it is an lvalue, C++ will copy it unless you explicitly give permission to steal. [[std-move|std::move]] is that permission. Despite its name, it **moves nothing**: it is just a cast, equivalent to `static_cast<T&&>(x)`, that makes an lvalue look like an rvalue. The actual move happens only when the result is used to initialise or assign another object.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <utility>

struct Loot {
    std::string name;

    explicit Loot(const std::string& n) : name{n} {}
    Loot(const Loot& other) : name{other.name} {
        std::cout << "copy " << name << '\\n';
    }
    Loot(Loot&& other) noexcept : name{std::move(other.name)} {
        std::cout << "move " << name << '\\n';
    }
};

int main() {
    Loot sword{"Sword"};
    Loot a = sword;               // lvalue: copy
    Loot b = std::move(sword);    // cast to rvalue: move
    const Loot crown{"Crown"};
    Loot c = std::move(crown);    // const: can't steal, so copy!
}`,
          output: 'copy Sword\nmove Sword\ncopy Crown',
          annotations: [
            { lines: 12, text: '`other` is a named rvalue reference — an **lvalue** — so moving its `std::string` member also needs `std::move`. Without it, the string would be copied.' },
            { lines: 20, text: '`std::move(sword)` produces an rvalue, so overload resolution picks the move constructor. After this line, `sword` is in a moved-from state.' },
            { lines: 22, text: '`std::move` on a `const` object yields `const Loot&&`. That cannot bind to `Loot&&` (moving would modify a const object), but it *can* bind to `const Loot&` — so the copy constructor runs, silently.' },
          ],
        },
        {
          type: 'p',
          text: 'What is left in `sword` after the move? For standard library types the answer is a [[moved-from-state]]: *valid but unspecified*. The object is still a properly working `std::string` — you can destroy it, or assign it a new value — but you must not assume what it contains. In practice it is usually empty, but the standard does not promise that.',
        },
        {
          type: 'compare',
          left: {
            title: 'Using a moved-from value',
            tone: 'bad',
            code: `inventory.push_back(std::move(weapon));
std::cout << "Equipped: " << weapon;
// prints an unspecified string`,
          },
          right: {
            title: 'Reassign before reuse',
            tone: 'good',
            code: `inventory.push_back(std::move(weapon));
weapon = "Fists";   // fine: new value
std::cout << "Equipped: " << weapon;`,
          },
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Read std::move as "I\'m done with this"',
          text: 'Writing `std::move(x)` is a promise to the reader and the compiler: "I will not read `x` again until I give it a new value." If the type has no move constructor, or the object is `const`, you silently get a copy — still correct, just not faster. And a bare `std::move(x);` on its own line does nothing at all.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'MoveTemp in Unreal',
          text: 'Unreal code uses `MoveTemp(x)` instead of `std::move(x)`. It does the same cast, but adds compile-time checks: it refuses to compile if `x` is `const` (where a "move" would silently copy) or already an rvalue. `TArray`, `FString` and `TMap` all have move constructors, so `Items = MoveTemp(NewItems);` steals the buffer instead of copying every element.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: 'Calling `std::move(inventory)` immediately transfers the contents of `inventory` into a temporary, leaving `inventory` empty — even if the result is never used.',
      answer: false,
      explanation:
        '`std::move` is only a cast to an rvalue reference; by itself it changes nothing. The contents move only when that rvalue is used to construct or assign another object, which selects a move constructor or move assignment operator. A discarded `std::move(inventory);` leaves `inventory` exactly as it was (and your compiler will likely warn that the result is unused).',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>
#include <utility>

struct SaveData {
    SaveData() = default;
    SaveData(const SaveData&) { std::cout << "copy\\n"; }
};

int main() {
    SaveData a;
    SaveData b = std::move(a);
}`,
      options: [
        { text: 'Nothing: the implicit move constructor runs, and it prints nothing', why: 'There is no implicit move constructor here. Declaring a copy constructor suppresses the compiler-generated move operations.' },
        { text: '`copy`', correct: true, why: 'With no move constructor available, the rvalue from `std::move(a)` binds to `const SaveData&`, and the copy constructor runs.' },
        { text: 'It does not compile: `SaveData` has no move constructor', why: 'A missing move constructor is not an error. Copying is always the fallback for an rvalue when the type is copyable.' },
        { text: '`copy` printed twice', why: 'Only one object is created from `a`, so the copy constructor runs once.' },
      ],
      explanation:
        'Because `SaveData` declares its own copy constructor, the compiler does not generate a move constructor. `std::move(a)` still produces an rvalue, but the only constructor that can accept it is the copy constructor, since `const SaveData&` binds to rvalues too. This silent fallback keeps old code correct, but it means a "move" may quietly be a copy.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Why noexcept matters: std::vector reallocation',
      blocks: [
        {
          type: 'p',
          text: 'When a `std::vector` runs out of [[capacity]], it allocates a bigger buffer and transfers every element. `push_back` promises the *strong* exception guarantee: if anything throws, the vector is left exactly as it was. Copying keeps that promise — if copy number 3 throws, the originals are untouched. Moving cannot: if move number 3 throws, elements 1 and 2 have already been plundered and cannot be restored.',
        },
        {
          type: 'p',
          text: 'So the vector asks: is this type\'s move constructor marked [[noexcept]]? If yes, it moves. If not (and the type is copyable), it **copies** to stay safe. Watch the difference:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

struct SlowItem {                    // move NOT noexcept
    std::string name;
    explicit SlowItem(const char* n) : name{n} {}
    SlowItem(const SlowItem& o) : name{o.name} {
        std::cout << "  copy " << name << '\\n';
    }
    SlowItem(SlowItem&& o) : name{std::move(o.name)} {
        std::cout << "  move " << name << '\\n';
    }
};

struct FastItem {                    // move IS noexcept
    std::string name;
    explicit FastItem(const char* n) : name{n} {}
    FastItem(const FastItem& o) : name{o.name} {
        std::cout << "  copy " << name << '\\n';
    }
    FastItem(FastItem&& o) noexcept : name{std::move(o.name)} {
        std::cout << "  move " << name << '\\n';
    }
};

int main() {
    std::vector<SlowItem> slow;
    slow.reserve(2);
    slow.emplace_back("Sword");
    slow.emplace_back("Shield");
    std::cout << "SlowItem vector grows:\\n";
    slow.emplace_back("Potion");

    std::vector<FastItem> fast;
    fast.reserve(2);
    fast.emplace_back("Sword");
    fast.emplace_back("Shield");
    std::cout << "FastItem vector grows:\\n";
    fast.emplace_back("Potion");
}`,
          output: 'SlowItem vector grows:\n  copy Sword\n  copy Shield\nFastItem vector grows:\n  move Sword\n  move Shield',
          annotations: [
            { lines: 12, text: 'A perfectly good move constructor — but without `noexcept`, the vector cannot be sure it will not throw halfway through a reallocation.' },
            { lines: 23, text: 'The only difference: `noexcept`.' },
            { lines: '30-32', text: 'Capacity 2, filled by two elements constructed in place (constructing prints nothing).' },
            { lines: 34, text: 'The third element forces a reallocation. The existing elements are **copied**, because their move might throw.' },
            { lines: 41, text: 'Same situation, but now the existing elements are **moved**.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'One keyword, a big difference',
          text: 'For a vector of 10,000 items holding strings, a missing `noexcept` turns every reallocation into 10,000 string copies (each a heap allocation) instead of 10,000 pointer swaps. The standard library uses `std::move_if_noexcept` for this decision. Rule: **mark move constructors and move assignment `noexcept`** whenever they cannot throw — which, since they only shuffle pointers, is almost always.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'The compiler does it for you when it generates them',
          text: 'Implicitly generated (or `= default`) move operations are `noexcept` automatically if every member\'s move is `noexcept` — another reason to let the compiler write them whenever possible.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'Your `Item` type is copyable and has a move constructor that is **not** marked `noexcept`. A `std::vector<Item>` runs out of capacity during `push_back`. What does it do with the existing elements?',
      options: [
        { text: 'Moves them, because a move constructor exists', why: 'Existing is not enough. Without `noexcept`, a move that throws midway would leave some elements plundered, breaking `push_back`\'s strong guarantee.' },
        { text: 'Copies them, so that if anything throws, the original elements are still intact', correct: true, why: 'Copying leaves the source elements untouched, so the vector can always roll back. This is what `std::move_if_noexcept` chooses for a copyable type whose move might throw.' },
        { text: 'Refuses to compile until the move constructor is marked `noexcept`', why: '`noexcept` is not required to compile. The vector silently falls back to copying, which is why this performance trap is easy to miss.' },
        { text: 'Leaves them in place and links the new buffer to the old one', why: 'A `std::vector` always keeps its elements in one contiguous buffer, so growing means relocating every element.' },
      ],
      explanation:
        'Containers that promise the strong exception guarantee can only use a move when it cannot fail. A move constructor without `noexcept` might throw, so the vector copies instead — correct, but potentially far slower. Marking moves `noexcept` turns those copies back into cheap moves.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'The Rule of Five — and the Rule of Zero',
      blocks: [
        {
          type: 'p',
          text: 'With moves added, a resource-owning class has **five** special members to think about: destructor, copy constructor, copy assignment, move constructor and move assignment. The [[rule-of-five]] says: if you declare any of them, consider all five. The reason is that the compiler\'s generation rules are interlinked — declaring one changes which of the others you get:',
        },
        {
          type: 'table',
          headers: ['If you declare…', 'Copy operations', 'Move operations'],
          rows: [
            ['Nothing', 'Generated', 'Generated'],
            ['A destructor', 'Generated (deprecated)', 'Not declared — moves silently copy'],
            ['A copy constructor or copy assignment', 'The other is generated (deprecated)', 'Not declared — moves silently copy'],
            ['A move constructor or move assignment', 'Deleted', 'The other is not declared'],
          ],
          caption: 'Simplified version of the rules for implicitly declared special member functions.',
        },
        {
          type: 'p',
          text: 'Even better than writing five functions correctly is writing **none**. The [[rule-of-zero]]: design classes so that every resource is owned by a member that manages itself — `std::vector`, `std::string`, `std::unique_ptr` — and let the compiler generate all five, correctly and `noexcept` where possible:',
        },
        {
          type: 'compare',
          left: {
            title: 'Rule of Five: manual ownership',
            tone: 'neutral',
            code: `class Mesh {
    int count_;
    float* vertices_;
public:
    ~Mesh();
    Mesh(const Mesh&);
    Mesh& operator=(const Mesh&);
    Mesh(Mesh&&) noexcept;
    Mesh& operator=(Mesh&&) noexcept;
    // ~40 lines, five chances
    // for a bug
};`,
          },
          right: {
            title: 'Rule of Zero: let members own',
            tone: 'good',
            code: `class Mesh {
    std::vector<float> vertices_;
public:
    explicit Mesh(int count)
        : vertices_(count) {}
    // no destructor, no copy,
    // no move: all generated,
    // all correct
};`,
          },
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <utility>
#include <vector>

class Mesh {                       // Rule of Zero
public:
    explicit Mesh(int count) : vertices_(count) {}
    int count() const { return static_cast<int>(vertices_.size()); }
private:
    std::vector<float> vertices_;
};

int main() {
    Mesh rock{3};
    Mesh copy = rock;               // deep copy (vector copies)
    Mesh moved = std::move(rock);   // steal (vector moves)
    std::cout << copy.count() << ' ' << moved.count() << '\\n';
}`,
          output: '3 3',
          annotations: [
            { lines: 7, text: 'Parentheses on purpose: `std::vector<float>(3)` means three zeros, whereas braces `{3}` would mean one element with the value 3.' },
            { lines: '15-16', text: 'Both work, correctly and efficiently, with zero special member functions written. The generated move constructor is even `noexcept`, because `std::vector`\'s is.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the Rule of Zero is the goal',
          text: 'Every hand-written special member is code that can be wrong, and that must be updated whenever a member is added. Wrapping each resource in its own small RAII type (one resource per class) means only those few wrappers follow the Rule of Five; every class built from them follows the Rule of Zero. The C++ Core Guidelines put it simply: *if you can avoid defining default operations, do* (C.20).',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'An `Enemy` holds a `std::string name` and a `std::vector<int> lootTable`. You add **only** a destructor that logs `"despawned"`. What happens now on `enemies.push_back(std::move(orc));`?',
      options: [
        { text: 'The name and loot table are moved by the implicitly generated move constructor', why: 'There is no implicit move constructor any more: a user-declared destructor suppresses the implicit move operations.' },
        { text: 'It no longer compiles, because `Enemy` has no move constructor', why: 'It still compiles, because the implicitly generated copy constructor accepts the rvalue. That is what makes this trap silent.' },
        { text: 'The name and loot table are deep-copied, because declaring a destructor suppressed the implicit move constructor', correct: true, why: 'With no move constructor, the rvalue binds to the (still generated, but deprecated) copy constructor. Correct behaviour — but every move is now a full copy.' },
        { text: 'Undefined behavior, because `orc` is destroyed twice', why: 'The members are copied correctly, so `orc` and the vector element each own separate data. Nothing is destroyed twice.' },
      ],
      explanation:
        'Declaring any of destructor, copy constructor or copy assignment stops the compiler from generating move operations, so "moves" quietly become copies. If you really need the destructor, restore the moves by declaring all five, using `= default` for the ones that should keep their generated behaviour: `Enemy(Enemy&&) noexcept = default;` and so on.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Copy elision: the fastest move is no move',
      blocks: [
        {
          type: 'p',
          text: 'Returning objects by value is idiomatic modern C++, and usually costs **nothing** at all. When a function returns a temporary (a prvalue), C++17 guarantees [[copy-elision]]: the object is constructed directly in the caller\'s variable. No copy, no move — the copy and move constructors are not even required to exist:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

struct Map {
    int rooms;
    explicit Map(int r) : rooms{r} {
        std::cout << "build map\\n";
    }
    Map(const Map& o) : rooms{o.rooms} {
        std::cout << "copy map\\n";
    }
    Map(Map&& o) noexcept : rooms{o.rooms} {
        std::cout << "move map\\n";
    }
};

Map generateDungeon(int depth) {
    return Map{depth * 10};     // prvalue: elision guaranteed
}

int main() {
    Map level = generateDungeon(3);
    Map arena = Map{1};         // also no copy, no move
    std::cout << level.rooms << " rooms, " << arena.rooms
              << " room\\n";
}`,
          output: 'build map\nbuild map\n30 rooms, 1 room',
          annotations: [
            { lines: 17, text: 'The returned `Map` is built straight into `level` in `main`. Neither "copy map" nor "move map" is ever printed.' },
            { lines: 22, text: 'Initialising from a temporary of the same type is elided too.' },
          ],
        },
        {
          type: 'p',
          text: 'Returning a **named** local is different. `Map m{...}; return m;` may be elided too — the *named return value optimization* ([[nrvo|NRVO]]) — and GCC, Clang and MSVC do it routinely, but the standard allows rather than requires it. If the compiler does not elide, the language treats the returned local as an rvalue and **moves** it automatically. Either way, you never pay for a copy when a move is available.',
        },
        {
          type: 'compare',
          left: {
            title: 'Pessimization',
            tone: 'bad',
            code: `Map generateCave() {
    Map cave{8};
    // ... carve tunnels ...
    return std::move(cave);
}
// warning: moving a local object
// in a return statement prevents
// copy elision [-Wpessimizing-move]`,
          },
          right: {
            title: 'Just return it',
            tone: 'good',
            code: `Map generateCave() {
    Map cave{8};
    // ... carve tunnels ...
    return cave;
}
// NRVO: usually no move at all;
// at worst, an automatic move`,
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why return std::move(local) hurts',
          text: '`std::move(cave)` is not the name `cave` any more — it is an expression of type `Map&&`. NRVO only applies when you return a local *by name*, so the cast forces a real move where there might have been no operation at all. It never helps: the language already moves named locals on return. The same applies to `MoveTemp` in Unreal.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'bug',
      prompt: 'This function works correctly, but a code reviewer flags one line as a performance mistake. Tap it.',
      code: `std::vector<Enemy> spawnWave(int count) {
    std::vector<Enemy> wave;
    wave.reserve(count);
    for (int i = 0; i < count; ++i) {
        wave.emplace_back(i);
    }
    return std::move(wave);
}`,
      bugLines: [7],
      hint: 'What does the language already do when you return a local variable by name?',
      explanation:
        'Line 7 wraps the returned local in `std::move`. That turns the return expression into an rvalue reference instead of the plain name `wave`, which disables the named return value optimization and forces a move. Writing `return wave;` lets the compiler construct `wave` directly in the caller\'s storage — or, if it cannot, move it automatically. GCC even warns about this with `-Wpessimizing-move`, enabled by `-Wall`.',
    },
  ],
  takeaways: [
    'lvalues have identity and live on; rvalues are disposable temporaries. `T&&` binds only to rvalues, so a `T&&` overload knows it may steal.',
    'A move constructor/assignment steals the source\'s resources and leaves it empty but safe to destroy and reassign.',
    '`std::move` is only a cast to an rvalue; the move happens when the result initialises or assigns an object. On a `const` object, or a type without moves, you silently get a copy.',
    'A moved-from standard library object is valid but unspecified: destroy it or assign to it, but don\'t read it.',
    'Mark move operations `noexcept`, or `std::vector` will copy instead of moving when it reallocates.',
    'Rule of Five: declaring any of the five special members affects the others. Rule of Zero: let self-managing members do the work and declare none.',
    'Return locals by name — guaranteed elision for temporaries, NRVO or an automatic move for named locals. Never `return std::move(local);`.',
  ],
  reading: [
    {
      title: 'Move constructors',
      url: 'https://en.cppreference.com/w/cpp/language/move_constructor',
      source: 'cppreference',
      note: 'When move constructors are generated, deleted or noexcept, and how overload resolution picks them.',
    },
    {
      title: 'std::move',
      url: 'https://en.cppreference.com/w/cpp/utility/move',
      source: 'cppreference',
      note: 'Confirms that std::move is just a cast, with notes on moved-from states.',
    },
    {
      title: 'Copy elision',
      url: 'https://en.cppreference.com/w/cpp/language/copy_elision',
      source: 'cppreference',
      note: 'The exact rules for guaranteed elision (C++17) and the optional NRVO.',
    },
    {
      title: 'Move constructors and move assignment',
      url: 'https://www.learncpp.com/cpp-tutorial/move-constructors-and-move-assignment/',
      source: 'learncpp',
      note: 'Step-by-step examples of writing move operations, including common mistakes.',
    },
    {
      title: 'C++ Core Guidelines: Default operations',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-ctor',
      source: 'core-guidelines',
      note: 'C.20 (Rule of Zero), C.21 (Rule of Five) and C.66 (make move operations noexcept).',
    },
  ],
};
