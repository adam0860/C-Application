import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-copy-semantics',
  title: 'Copying Objects and the Rule of Three',
  summary: 'Copy constructors, copy assignment, shallow vs deep copies, the Rule of Three, copy-and-swap — and how to forbid copying entirely.',
  minutes: 18,
  objectives: [
    'Identify when the copy constructor and when the copy assignment operator is called',
    'Explain the difference between shallow and deep copies, and why copying a raw owning pointer causes a double free',
    'Implement a correct copy constructor and copy assignment operator, including self-assignment',
    'Apply the Rule of Three and write exception-safe assignment with copy-and-swap',
    'Forbid copying with `= delete` when a copy makes no sense',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Copying happens more than you think',
      blocks: [
        {
          type: 'p',
          text: 'C++ copies objects constantly: when you initialise one object from another, pass by value, return by value, or push into a container. Two special member functions control what a copy means. The [[copy-constructor]] builds a **new** object as a copy of an existing one. The [[copy-assignment|copy assignment]] operator overwrites an object that **already exists**.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>

struct Item {
    std::string name;

    explicit Item(const std::string& n) : name{n} {}

    Item(const Item& other) : name{other.name} {
        std::cout << "copy-construct " << name << '\\n';
    }

    Item& operator=(const Item& other) {
        name = other.name;
        std::cout << "copy-assign " << name << '\\n';
        return *this;
    }
};

void inspect(Item item) {
    std::cout << "inspecting " << item.name << '\\n';
}

int main() {
    Item sword{"Sword"};
    Item backup = sword;    // looks like assignment...
    Item shield{"Shield"};
    shield = sword;         // ...but only this one is
    inspect(sword);
}`,
          output: 'copy-construct Sword\ncopy-assign Sword\ncopy-construct Sword\ninspecting Sword',
          annotations: [
            { lines: 9, text: 'The copy constructor takes `const Item&`. By **reference**, because passing by value would itself need a copy — the copy constructor would have to call itself. By **const** reference, because copying must not modify the source and must work on const objects and temporaries.' },
            { lines: 13, text: 'Copy assignment also takes `const Item&`, and returns `Item&` (`*this`) so that chains like `a = b = c` work, just as they do for `int`.' },
            { lines: 20, text: 'Pass by value: the parameter `item` is a **new** object initialised from the argument, so the copy constructor runs.' },
            { lines: 26, text: 'An `=` inside a declaration is **initialisation**, not assignment. `backup` does not exist yet, so the copy constructor builds it.' },
            { lines: 28, text: '`shield` already exists and holds "Shield". Overwriting it calls the copy assignment operator.' },
          ],
        },
        {
          type: 'table',
          headers: ['Code', 'Calls'],
          rows: [
            ['`Item b = a;` or `Item b{a};`', 'Copy constructor (new object)'],
            ['`f(a)` where `f` takes `Item` by value', 'Copy constructor (new parameter)'],
            ['`items.push_back(a);`', 'Copy constructor (new element in the vector)'],
            ['`b = a;` where `b` already exists', 'Copy assignment (overwrite existing object)'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why two different functions?',
          text: 'Constructing starts from **nothing**: there is no old state to worry about. Assigning starts from a **fully alive** object that may already own resources — memory, a file, a texture — which must be released or reused before taking on the new value. That extra responsibility is exactly where most copy bugs live, as you will see shortly.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'Which line calls the **copy assignment operator**?',
      code: `Item a{"Axe"};
Item b = a;
Item c{a};
Item d{"Dagger"};
d = a;`,
      options: [
        { text: 'Line 2: `Item b = a;`', why: 'Despite the `=`, this is a declaration: `b` is being created, so the copy constructor runs.' },
        { text: 'Line 3: `Item c{a};`', why: 'Brace initialisation from another `Item` creates a new object — copy constructor.' },
        { text: 'Line 5: `d = a;`', correct: true, why: '`d` was already constructed on line 4. Giving an existing object a new value is assignment.' },
        { text: 'Lines 2 and 5', why: 'Only line 5 assigns. Line 2 is initialisation, which always uses a constructor.' },
      ],
      explanation:
        'The rule is about whether the target object already exists. If the statement *declares* the object, it is being constructed, so a constructor runs — whatever the punctuation. If the object was constructed earlier and is now being overwritten, the assignment operator runs.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'The default copy: memberwise — usually right',
      blocks: [
        {
          type: 'p',
          text: 'If you do not write a copy constructor or copy assignment, the compiler generates them. The generated versions copy **each member** using that member\'s own copy operation. For members like `std::string` and `std::vector`, which know how to copy themselves properly, this is exactly what you want:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <vector>

struct Inventory {
    std::string owner;
    std::vector<std::string> items;
};

int main() {
    Inventory hero{"Hero", {"Sword", "Potion"}};
    Inventory clone = hero;          // compiler-generated copy
    clone.owner = "Clone";
    clone.items.push_back("Cursed Ring");

    std::cout << hero.owner << ": " << hero.items.size()
              << " items\\n";
    std::cout << clone.owner << ": " << clone.items.size()
              << " items\\n";
}`,
          output: 'Hero: 2 items\nClone: 3 items',
          annotations: [
            { lines: '5-8', text: 'No special member functions written at all.' },
            { lines: 12, text: 'The generated copy constructor copies `owner` with `std::string`\'s copy constructor and `items` with `std::vector`\'s — each allocates its own buffer.' },
            { lines: '13-14', text: 'Changing the clone cannot affect the hero: they share nothing.' },
          ],
        },
        {
          type: 'memory',
          caption: 'After the copy: two independent vectors, each with its own heap buffer.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'hero.items', value: 'size 2', type: 'std::vector', pointsTo: 'buf-hero' },
                { name: 'clone.items', value: 'size 3', type: 'std::vector', pointsTo: 'buf-clone' },
              ],
            },
            {
              label: 'Heap',
              kind: 'heap',
              cells: [
                { id: 'buf-hero', value: '["Sword", "Potion"]', type: 'buffer A' },
                { id: 'buf-clone', value: '["Sword", "Potion", "Cursed Ring"]', type: 'buffer B' },
              ],
            },
          ],
        },
        {
          type: 'p',
          text: 'A copy that duplicates the owned data, so the two objects are fully independent, is a [[deep-copy]]. Standard containers and strings always copy deeply. As long as your class is built from such members, the compiler-generated copy operations are correct and you should not write your own.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Shallow copy: when a raw pointer is copied',
      blocks: [
        {
          type: 'p',
          text: 'Memberwise copying goes wrong the moment a class **owns** something through a raw pointer. Copying a pointer copies the *address*, not the data it points to. Now two objects point at the same heap block — a [[shallow-copy]] — and both believe they own it:',
        },
        {
          type: 'code',
          title: 'Mesh with a raw owning pointer (broken)',
          code: `class Mesh {
public:
    explicit Mesh(int count)
        : count_{count}, vertices_{new float[count]{}} {}
    ~Mesh() { delete[] vertices_; }

private:
    int count_;
    float* vertices_;   // owning raw pointer
};

int main() {
    Mesh rock{3};
    Mesh copy = rock;   // copies the POINTER, not the floats
}                       // ~copy deletes the buffer, then
                        // ~rock deletes it AGAIN: double free`,
          annotations: [
            { lines: 4, text: 'The constructor allocates an array of floats on the heap.' },
            { lines: 5, text: 'The destructor frees it — correct, as long as each `Mesh` has its *own* buffer.' },
            { lines: 14, text: 'The generated copy constructor copies `count_` and `vertices_` member by member. Both meshes now hold the same address.' },
            { lines: 15, text: 'Locals are destroyed in reverse order: `copy` frees the buffer, then `rock` frees the **same** buffer. That is [[undefined-behavior]]; with glibc it typically aborts with a message such as "free(): double free detected".' },
          ],
        },
        {
          type: 'memory',
          caption: 'A shallow copy: two owners, one buffer.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'rock.vertices_', value: '0x5a10', type: 'float*', pointsTo: 'shared-buf', highlight: true },
                { name: 'copy.vertices_', value: '0x5a10', type: 'float*', pointsTo: 'shared-buf', highlight: true },
              ],
            },
            {
              label: 'Heap',
              kind: 'heap',
              cells: [{ id: 'shared-buf', value: '[0.0, 0.0, 0.0]', address: '0x5a10', type: 'float[3]' }],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Three bugs from one copy',
          text: 'A shallow copy of an owning pointer causes (1) **aliasing**: writing through one object changes the other; (2) a **dangling pointer**: when one copy is destroyed, the other points at freed memory; and (3) a **[[double-free]]** when the second is destroyed. The worst part is that nothing goes wrong at the line that made the copy — the crash comes later, somewhere else.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'bug',
      prompt: 'This program crashes with a double free when it finishes. Tap the line responsible for the copy that causes it.',
      code: `class SoundBuffer {
public:
    explicit SoundBuffer(int samples)
        : samples_{new short[samples]{}}, size_{samples} {}
    ~SoundBuffer() { delete[] samples_; }
    int size() const { return size_; }
private:
    short* samples_;
    int size_;
};

void printInfo(SoundBuffer buffer) {
    std::cout << buffer.size() << " samples\\n";
}

int main() {
    SoundBuffer explosion{44100};
    printInfo(explosion);
}`,
      bugLines: [12, 18],
      hint: 'How does `printInfo` receive its argument?',
      explanation:
        '`printInfo` takes its parameter **by value** (line 12), so the call on line 18 copy-constructs `buffer` from `explosion`. `SoundBuffer` has no copy constructor of its own, so the generated one copies the pointer: a shallow copy. When `printInfo` returns, `buffer`\'s destructor frees the samples; when `main` ends, `explosion` frees them again. Passing by `const SoundBuffer&` avoids this copy, but the real fix is in the class: it must define (or forbid) copying — the Rule of Three.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Deep copy: writing the copy constructor',
      blocks: [
        {
          type: 'p',
          text: 'To give each `Mesh` its own data, write a copy constructor that **allocates a new buffer** and copies the elements across:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <algorithm>
#include <iostream>

class Mesh {
public:
    explicit Mesh(int count)
        : count_{count}, vertices_{new float[count]{}} {}

    Mesh(const Mesh& other)
        : count_{other.count_}, vertices_{new float[other.count_]} {
        std::copy(other.vertices_, other.vertices_ + count_,
                  vertices_);
        std::cout << "deep copy: " << count_ << " vertices\\n";
    }

    ~Mesh() { delete[] vertices_; }

    void set(int i, float v) { vertices_[i] = v; }
    float get(int i) const { return vertices_[i]; }

private:
    int count_;
    float* vertices_;
};

int main() {
    Mesh rock{3};
    rock.set(0, 1.5f);
    Mesh boulder = rock;            // our copy constructor
    boulder.set(0, 9.0f);
    std::cout << "rock[0] = " << rock.get(0) << '\\n';
    std::cout << "boulder[0] = " << boulder.get(0) << '\\n';
}                                   // two buffers, two deletes`,
          output: 'deep copy: 3 vertices\nrock[0] = 1.5\nboulder[0] = 9',
          annotations: [
            { lines: 10, text: 'A **fresh** allocation for the new object, sized to match the source. Members are initialised in declaration order (`count_`, then `vertices_`), matching the order written here.' },
            { lines: '11-12', text: '`std::copy(first, last, destination)` from `<algorithm>` copies every element in the range `[first, last)` — here, all the source\'s floats into our new buffer.' },
            { lines: 30, text: 'Writing to `boulder` no longer touches `rock`: they own different buffers.' },
            { lines: 33, text: 'Each destructor frees its own buffer exactly once. No double free.' },
          ],
        },
        {
          type: 'memory',
          caption: 'A deep copy: each object owns its own buffer.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'rock.vertices_', value: '0x5a10', type: 'float*', pointsTo: 'buf-rock' },
                { name: 'boulder.vertices_', value: '0x5b40', type: 'float*', pointsTo: 'buf-boulder' },
              ],
            },
            {
              label: 'Heap',
              kind: 'heap',
              cells: [
                { id: 'buf-rock', value: '[1.5, 0.0, 0.0]', address: '0x5a10', type: 'float[3]' },
                { id: 'buf-boulder', value: '[9.0, 0.0, 0.0]', address: '0x5b40', type: 'float[3]' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Only half fixed',
          text: 'This `Mesh` still has a compiler-generated **copy assignment** operator, which copies the pointer just as shallowly. `boulder = rock;` would leak `boulder`\'s old buffer *and* set up a double free. A class that needs a custom copy constructor almost always needs a custom copy assignment too — next card.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Copy assignment: the old resource and self-assignment',
      blocks: [
        {
          type: 'p',
          text: 'Assignment has extra work to do: the target already owns a buffer, which must be released, and the new data must be copied in. The obvious implementation has two hidden flaws:',
        },
        {
          type: 'compare',
          left: {
            title: 'Naive: free first',
            tone: 'bad',
            code: `Mesh& operator=(const Mesh& other) {
    delete[] vertices_;
    count_ = other.count_;
    vertices_ = new float[count_];
    std::copy(other.vertices_,
              other.vertices_ + count_,
              vertices_);
    return *this;
}`,
            text: 'If `other` *is* `*this`, line 2 frees the data line 5 is about to copy. And if `new` throws, `vertices_` is left dangling — the destructor will free it again.',
          },
          right: {
            title: 'Allocate first, then free',
            tone: 'good',
            code: `Mesh& operator=(const Mesh& other) {
    if (this == &other) {
        return *this;
    }
    float* fresh = new float[other.count_];
    std::copy(other.vertices_,
              other.vertices_ + other.count_,
              fresh);
    delete[] vertices_;
    vertices_ = fresh;
    count_ = other.count_;
    return *this;
}`,
            text: 'Nothing is changed until the new copy is complete. If `new` throws, the object is untouched.',
          },
        },
        {
          type: 'p',
          text: '[[self-assignment|Self-assignment]] sounds silly — who writes `mesh = mesh`? Nobody, directly. But it happens through aliases all the time: `meshes[i] = meshes[j]` when `i == j`, or `a = *ptr` where `ptr` happens to point at `a`. An assignment operator must handle it.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why "allocate before you free"?',
          text: 'Ordering the work so that every step that can fail happens **before** any step that modifies the object gives the *strong* [[exception-safety|exception guarantee]]: the assignment either completes fully or leaves the object exactly as it was. As a bonus, with this ordering self-assignment is already safe — the `this == &other` check merely skips pointless work.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'Using the **naive** assignment operator (free first, then allocate and copy), what happens on `mesh = mesh;`?',
      options: [
        { text: 'Nothing — assigning an object to itself is automatically skipped by the compiler', why: 'The compiler calls your `operator=` like any other function. It does not detect or skip self-assignment.' },
        { text: 'It leaks the old buffer', why: 'The old buffer is freed on the first line, so it does not leak. The problem is what happens next.' },
        { text: 'It fails to compile because `this` and `&other` are the same', why: 'Aliasing is invisible at compile time — `other` is just a reference that happens to refer to `*this` at run time.' },
        { text: 'It frees the buffer, then copies from that same freed buffer: undefined behavior', correct: true, why: '`other.vertices_` and `vertices_` are the same pointer, so `delete[]` destroys the source data before it is copied. Reading freed memory is undefined behavior — garbage at best, a crash at worst.' },
      ],
      explanation:
        'In self-assignment, `other` is another name for `*this`. Freeing "my" old buffer frees "their" buffer too, so the copy reads freed memory. Fix it with a self-assignment check, by allocating and copying before freeing, or with the copy-and-swap idiom — which handles it without any check at all.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'The Rule of Three',
      blocks: [
        {
          type: 'p',
          text: 'Notice the pattern. `Mesh` needed a destructor because it owns a buffer. That same ownership made the generated copy constructor wrong, and the generated copy assignment wrong. The three always go together. This is the [[rule-of-three]]:',
        },
        {
          type: 'definition',
          term: 'Rule of Three',
          text: 'If a class needs a user-written **destructor**, **copy constructor** or **copy assignment operator**, it almost certainly needs all three.',
        },
        {
          type: 'table',
          headers: ['Special member', 'Generated version does', 'Why it is wrong for an owning class'],
          rows: [
            ['Destructor', 'Destroys members — a raw pointer member is simply forgotten', 'The buffer leaks'],
            ['Copy constructor', 'Copies members — the pointer value is duplicated', 'Two owners: aliasing, then a double free'],
            ['Copy assignment', 'Assigns members — the pointer value is overwritten', 'The old buffer leaks, and two owners again'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why one implies the others',
          text: 'The compiler\'s generated [[special-member-functions]] all assume memberwise behaviour is correct. Writing a custom destructor is proof that it is **not** correct for this class — some member needs special handling at the end of its life — and the same member almost certainly needs special handling when copied. Since C++11, the implicit copy operations of a class with a user-declared destructor are officially *deprecated* for exactly this reason (GCC can warn with `-Wdeprecated-copy-dtor`).',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Where the rule comes from',
          text: 'The Rule of Three was named by Marshall Cline in 1991 and became standard C++ advice. C++11 added move operations, extending it to the Rule of Five — and, better still, made the Rule of Zero practical. Both are in the next lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'truefalse',
      prompt: 'If you write a destructor that calls `delete[]` on a pointer member, the compiler automatically generates a copy constructor that deep-copies the array.',
      answer: false,
      explanation:
        'The compiler never inspects what your destructor does. The generated copy constructor always copies members one by one, and copying a pointer copies only the address — a shallow copy. That mismatch between "my destructor frees this" and "my copy shares this" is exactly what the Rule of Three warns about.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'The copy-and-swap idiom',
      blocks: [
        {
          type: 'p',
          text: 'There is an elegant way to write assignment that reuses the copy constructor, handles self-assignment and is exception-safe, all at once. Take the parameter **by value** — so the copy is made before your function even starts — then **swap** your contents with the copy. The copy\'s destructor cleans up your old data. This is the [[copy-and-swap|copy-and-swap]] idiom:',
        },
        {
          type: 'code',
          title: 'mesh.cpp',
          runnable: true,
          code: `#include <algorithm>
#include <iostream>
#include <utility>

class Mesh {
public:
    explicit Mesh(int count)
        : count_{count}, vertices_{new float[count]{}} {}

    Mesh(const Mesh& other)
        : count_{other.count_}, vertices_{new float[other.count_]} {
        std::copy(other.vertices_, other.vertices_ + count_,
                  vertices_);
        std::cout << "deep copy: " << count_ << " vertices\\n";
    }

    Mesh& operator=(Mesh other) {   // by value: a copy is made
        swap(*this, other);
        return *this;
    }                               // other dies, freeing OUR old data

    ~Mesh() { delete[] vertices_; }

    friend void swap(Mesh& a, Mesh& b) noexcept {
        std::swap(a.count_, b.count_);
        std::swap(a.vertices_, b.vertices_);
    }

    void set(int i, float v) { vertices_[i] = v; }
    float get(int i) const { return vertices_[i]; }
    int count() const { return count_; }

private:
    int count_;
    float* vertices_;
};

int main() {
    Mesh rock{3};
    rock.set(0, 1.5f);
    Mesh boulder{10};
    boulder = rock;                  // copy-and-swap
    boulder.set(0, 9.0f);
    std::cout << "rock[0] = " << rock.get(0) << ", boulder[0] = "
              << boulder.get(0) << ", boulder size "
              << boulder.count() << '\\n';
    boulder = boulder;               // self-assignment: safe
    std::cout << "still " << boulder.get(0) << '\\n';
}`,
          output: 'deep copy: 3 vertices\nrock[0] = 1.5, boulder[0] = 9, boulder size 3\ndeep copy: 3 vertices\nstill 9',
          annotations: [
            { lines: 17, text: 'The parameter is a **copy** of the right-hand side, made by the copy constructor before the body runs. If that copy throws, `*this` has not been touched.' },
            { lines: 18, text: 'Swap our pointer and count with the copy\'s. Swapping two pointers and two ints cannot fail, so this step is `noexcept`.' },
            { lines: 20, text: '`other` now holds our **old** buffer of 10 floats, and its destructor frees it as the function returns. No `delete[]` needed in `operator=`.' },
            { lines: '24-27', text: 'A `friend` function declared inside the class can access private members. `std::swap` (from `<utility>`) exchanges two values.' },
            { lines: 47, text: 'Self-assignment copies `boulder`, swaps with the copy and destroys the original buffer — wasteful but completely safe, with no special check.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'The trade-off',
          text: 'Copy-and-swap always allocates a new buffer, even when the existing one is already big enough to reuse — `std::vector`\'s own assignment avoids that. For most game classes clarity and safety win; for hot paths you may hand-write an assignment that reuses capacity. Bonus: once a class has a move constructor (next lesson), this same by-value `operator=` automatically handles move assignment too.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'fill',
      prompt: 'Complete the copy-and-swap assignment operator for an `Inventory` class that already has a correct copy constructor and a `noexcept` `swap(Inventory&, Inventory&)`.',
      template: `Inventory& operator=(___ other) {   // note the parameter type
    ___(*this, other);
    return ___;
}`,
      blanks: [{ answers: ['Inventory'] }, { answers: ['swap'] }, { answers: ['*this'] }],
      wordBank: ['Inventory', 'const Inventory&', 'swap', 'delete', '*this', 'this', 'other'],
      explanation:
        'The parameter must be taken **by value** (`Inventory`), so that the copy constructor makes the copy before the body runs — with `const Inventory&` you would have nothing to swap with. `swap` exchanges contents with that copy, and the function returns `*this`, a reference to the assigned object (`this` is a pointer, so it would not match the `Inventory&` return type).',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Forbidding copies with = delete',
      blocks: [
        {
          type: 'p',
          text: 'Some objects should not be copied at all. What would copying a network connection mean — two connections, or two handles to one socket? Copying a window, an audio device or the GPU `Texture` from the RAII lesson makes no sense either. And polymorphic base classes should not be copied, because copies slice. For these types, delete the copy operations, making them [[deleted-function|deleted functions]]:',
        },
        {
          type: 'code',
          code: `class NetworkConnection {
public:
    explicit NetworkConnection(const char* address);
    ~NetworkConnection();

    NetworkConnection(const NetworkConnection&) = delete;
    NetworkConnection& operator=(const NetworkConnection&) = delete;
};

void sendScore(NetworkConnection conn);  // by value

void submit() {
    NetworkConnection server{"203.0.113.7"};
    sendScore(server);
}
// error: use of deleted function
// 'NetworkConnection::NetworkConnection(const NetworkConnection&)'`,
          annotations: [
            { lines: '6-7', text: '`= delete` declares the function but forbids every use of it. Any attempt to copy is now a **compile error** instead of a run-time double close.' },
            { lines: 14, text: 'The mistake is caught at the exact line that tries to copy. The fix is to pass by reference: `void sendScore(NetworkConnection& conn);`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Before C++11',
          text: 'Old code achieves the same thing by declaring the copy operations `private` and never defining them. Outside code got an access error and member functions got a linker error. `= delete` states the intent directly and gives a clear message.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Copying in Unreal',
          text: '`UObject`s are never copied with a copy constructor: you create them with `NewObject` and duplicate them with `DuplicateObject`. Value types are a different story: `FString`, `TArray` and `TMap` copy **deeply**, just like their `std::` counterparts — so passing a large `TArray` by value copies every element. Pass them as `const TArray<FItem>&` unless you need a copy. For your own non-copyable types, Unreal also offers an `FNoncopyable` base class.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'Which of these classes is the best candidate for deleting its copy operations?',
      options: [
        { text: '`Vector3` with three `float` members', why: 'Plain values copy perfectly with the generated memberwise copy. Copying vectors is something you do constantly.' },
        { text: '`PlayerStats` with a `std::string` name and a few `int` counters', why: 'Every member copies itself correctly, so copies are independent and meaningful — for example, a snapshot before a level starts.' },
        { text: '`AudioDevice`, which opens the sound card in its constructor and closes it in its destructor', correct: true, why: 'There is one sound card. Two objects owning it would close it twice, and a "copy" has no sensible meaning — so make copying a compile error.' },
        { text: '`Inventory` holding a `std::vector<Item>`', why: 'A vector deep-copies itself, so a copied inventory is a correct, independent inventory. No reason to forbid it.' },
      ],
      explanation:
        'Delete copying when a copy would not be meaningful or safe: unique system resources, objects with identity (a connection, a window, a device) and polymorphic base classes. Types built from value-like members copy correctly by default — and for them, the best number of hand-written copy operations is zero.',
    },
  ],
  takeaways: [
    'The copy constructor creates a new object from an existing one; copy assignment overwrites an object that already exists. `T b = a;` is construction, not assignment.',
    'The generated copy operations copy member by member — correct for classes built from strings, vectors and other self-managing members.',
    'Copying a raw owning pointer is a shallow copy: two owners, aliasing, dangling pointers and a double free.',
    'A deep copy allocates new storage and copies the data; assignment must also release the old resource and survive self-assignment.',
    'Rule of Three: if you need a custom destructor, copy constructor or copy assignment, you need all three.',
    'Copy-and-swap (take by value, swap, let the parameter die) gives exception-safe, self-assignment-safe assignment.',
    'Use `= delete` to make copying a compile error for types where a copy makes no sense.',
  ],
  reading: [
    {
      title: 'Copy constructors',
      url: 'https://en.cppreference.com/w/cpp/language/copy_constructor',
      source: 'cppreference',
      note: 'When copy constructors are called, and when the compiler generates, deletes or deprecates them.',
    },
    {
      title: 'The rule of three/five/zero',
      url: 'https://en.cppreference.com/w/cpp/language/rule_of_three',
      source: 'cppreference',
      note: 'A short page with code for all three rules — a good bridge to the next lesson.',
    },
    {
      title: 'Shallow vs. deep copying',
      url: 'https://www.learncpp.com/cpp-tutorial/shallow-vs-deep-copying/',
      source: 'learncpp',
      note: 'More worked examples of shallow-copy bugs and how to fix them.',
    },
    {
      title: 'C++ Core Guidelines: Default operations',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-ctor',
      source: 'core-guidelines',
      note: 'See C.21 ("If you define or =delete any copy, move, or destructor function, define or =delete them all") and C.62 on self-assignment.',
    },
  ],
};
