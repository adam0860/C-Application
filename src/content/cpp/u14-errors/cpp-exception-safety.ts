import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-exception-safety',
  title: 'Exception Safety and noexcept',
  summary: 'What state your objects are left in when an exception strikes — and the tools that keep them sane.',
  minutes: 18,
  objectives: [
    'Define the basic, strong and nothrow guarantees and identify which one a function provides',
    'Use RAII to make code exception-safe without scattering try/catch blocks',
    'Explain what `noexcept` promises, how to query it, and what happens when the promise is broken',
    'Explain why `std::vector` only moves elements whose move constructor is `noexcept`',
    'Explain why destructors must not throw, and implement copy assignment with copy-and-swap',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'When an exception strikes mid-operation',
      blocks: [
        {
          type: 'p',
          text: 'Last lesson showed that an exception can leave a function at almost any line. Most functions never catch anything — they let exceptions pass through to a caller who can handle them. But "passing through" raises a hard question: **what state is the object left in?** If a function had done half its work when the exception hit, the other half never happens.',
        },
        {
          type: 'code',
          title: 'party.h',
          code: `class Party {
public:
    void recruit(const std::string& name, int gold) {
        goldTotal_ += gold;        // state changed...
        names_.push_back(name);    // ...then this may throw
    }
private:
    std::vector<std::string> names_;
    int goldTotal_ = 0;   // must equal the sum of members' gold
};`,
          annotations: [
            { lines: 4, text: 'The first half of the work. Integer addition cannot throw, so this always succeeds.' },
            { lines: 5, text: '`push_back` may need to allocate a bigger buffer, and copying the `std::string` may allocate too. Either can throw `std::bad_alloc`.' },
            { lines: 9, text: 'The class [[invariant]]: a rule that must hold whenever no member function is running. If line 5 throws, the gold was added but the member was not — the invariant is broken for good.' },
          ],
        },
        {
          type: 'p',
          text: 'Nothing leaked and nothing crashed, yet the `Party` now lies about its gold. Every later calculation built on `goldTotal_` is wrong. This is what [[exception-safety]] is about: designing functions so that an exception, wherever it comes from, leaves objects in a state you can reason about.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why you have to think about this everywhere',
          text: 'In C++, exceptions can come from far more places than explicit `throw` statements: any memory allocation, any constructor, any standard-library call or third-party function not marked `noexcept`. You cannot list them all, so you design for the possibility instead. The good news: a few simple techniques — ordering, RAII and swap — handle almost every case.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'The three guarantees',
      blocks: [
        {
          type: 'p',
          text: 'C++ programmers describe a function\'s behaviour under exceptions with three standard levels, from weakest to strongest. Every function in the standard library documents which one it provides, and so should yours.',
        },
        {
          type: 'table',
          headers: ['Guarantee', 'Promise if an exception escapes', 'Typical examples'],
          rows: [
            ['**Basic**', 'No resources leak and every object still satisfies its invariants — but values may have changed to some valid state.', '`vector::insert` in the middle; most ordinary functions should provide at least this.'],
            ['**Strong**', 'Commit or roll back: the operation either completes fully, or the program state is exactly as it was before the call.', '`vector::push_back` (for typical element types); a well-written assignment operator.'],
            ['**Nothrow**', 'The function never throws at all. It always succeeds.', 'Destructors, `swap`, move operations of most types, `vector::size()`.'],
          ],
          caption: 'Below basic is "no guarantee": leaks or broken invariants. That is simply a bug.',
        },
        {
          type: 'p',
          text: 'Fixing `recruit` needs no new tools — just reorder the work. Do the part that might throw **first**; then commit with operations that cannot throw:',
        },
        {
          type: 'code',
          code: `void recruit(const std::string& name, int gold) {
    names_.push_back(name);   // may throw: nothing changed yet
    goldTotal_ += gold;       // cannot throw: commit
}`,
          annotations: [
            { lines: 2, text: 'If this throws, `push_back` itself guarantees the vector is unchanged — and we haven\'t touched `goldTotal_`. Full rollback, for free.' },
            { lines: 3, text: 'Only reached once the risky step succeeded. An `int` addition cannot throw, so the operation is now all-or-nothing.' },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Like a bank transfer',
          text: 'A bank must never debit your account without crediting the other one. It prepares everything that might fail (checks, holds, validation) on the side, then commits with a single step that cannot fail. "Do the risky work off to the side, then commit with nothrow operations" is the heart of the strong guarantee.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'The Abrahams guarantees',
          text: 'David Abrahams formalized these levels in the late 1990s while the standard library was being standardized, so the library could specify precisely what each container operation promises. They are still often called "the Abrahams guarantees".',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'After the reordering, which guarantee does `recruit` provide?',
      code: `void recruit(const std::string& name, int gold) {
    names_.push_back(name);
    goldTotal_ += gold;
}`,
      options: [
        { text: 'Nothrow', why: '`push_back` can still throw (allocation can fail), so `recruit` can throw too. Nothrow means it never throws at all.' },
        { text: 'Basic only', why: 'It does better than basic: if anything throws, the `Party` is not merely valid but completely unchanged.' },
        { text: 'Strong', correct: true, why: 'If `push_back` throws, it leaves the vector unchanged and `goldTotal_` was never touched. If it succeeds, the rest cannot fail. All or nothing.' },
        { text: 'No guarantee', why: 'Nothing leaks and the invariant can no longer be broken, so it clearly provides a guarantee.' },
      ],
      explanation:
        'The strong guarantee comes from ordering: the only operation that can throw runs first and has the strong guarantee itself, and everything after it is nothrow. This "risky first, commit last" pattern is the cheapest route to the strong guarantee, and it is worth looking for before reaching for anything heavier.',
    },
    {
      kind: 'concept',
      title: 'RAII makes safety automatic',
      blocks: [
        {
          type: 'p',
          text: 'The first job of exception safety is not leaking. With manual resource management that quickly gets ugly, because every resource needs its own cleanup on every possible exit path:',
        },
        {
          type: 'compare',
          left: {
            title: 'Manual cleanup',
            tone: 'bad',
            code: `void spawnWave() {
    Enemy* a = new Enemy;
    Enemy* b = new Enemy;  // throws? a leaks
    try {
        arena.add(a, b);
    } catch (...) {
        delete a;
        delete b;
        throw;
    }
}`,
            text: 'Wordy and still wrong: if the second `new` throws, `a` leaks, because the `try` hadn\'t started yet. Each extra resource multiplies the paths.',
          },
          right: {
            title: 'RAII',
            tone: 'good',
            code: `void spawnWave() {
    auto a = std::make_unique<Enemy>();
    auto b = std::make_unique<Enemy>();
    arena.add(std::move(a),
              std::move(b));
}`,
            text: 'No try/catch at all. Whatever throws, unwinding destroys whichever `unique_ptr`s exist, and each deletes its `Enemy`.',
          },
        },
        {
          type: 'p',
          text: '[[raii]] gives you the basic guarantee almost for free. With a small twist it can give you the strong guarantee too: an object whose destructor **rolls back** a change unless you explicitly commit. If anything throws before the commit, unwinding runs the destructor and undoes the work.',
        },
        {
          type: 'code',
          title: 'loot_transaction.cpp',
          runnable: true,
          code: `#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

class BagTransaction {
public:
    explicit BagTransaction(std::vector<std::string>& bag)
        : bag_{bag}, oldSize_{bag.size()} {}
    ~BagTransaction() {
        if (!committed_) {   // roll back anything we added
            bag_.erase(bag_.begin() + oldSize_, bag_.end());
        }
    }
    void commit() { committed_ = true; }
private:
    std::vector<std::string>& bag_;
    std::size_t oldSize_;
    bool committed_ = false;
};

void lootChest(std::vector<std::string>& bag,
               const std::vector<std::string>& chest) {
    BagTransaction tx{bag};
    for (const auto& item : chest) {
        if (item == "Cursed Idol") {
            throw std::runtime_error{"the chest was trapped!"};
        }
        bag.push_back(item);
    }
    tx.commit();   // every item made it: keep them
}

void print(const std::vector<std::string>& bag) {
    std::cout << "Bag:";
    for (const auto& item : bag) std::cout << ' ' << item;
    std::cout << '\\n';
}

int main() {
    std::vector<std::string> bag{"Torch"};
    lootChest(bag, {"Gold", "Rope"});
    print(bag);
    try {
        lootChest(bag, {"Gem", "Cursed Idol", "Map"});
    } catch (const std::exception& e) {
        std::cout << "Trap: " << e.what() << '\\n';
    }
    print(bag);
}`,
          output: `Bag: Torch Gold Rope
Trap: the chest was trapped!
Bag: Torch Gold Rope`,
          annotations: [
            { lines: 9, text: 'Remember how big the bag was before the operation started.' },
            { lines: '10-14', text: 'The rollback. Erasing elements at the end of a vector only destroys them, so it cannot throw — exactly what cleanup code needs.' },
            { lines: 24, text: 'The guard is created before any change is made, so it covers every exit path from here on.' },
            { lines: 27, text: 'Any exception — this one, or a `std::bad_alloc` from `push_back` — triggers the rollback during unwinding.' },
            { lines: 31, text: 'Reached only on success. After `commit()`, the destructor leaves the new items in place.' },
            { lines: 47, text: '"Gem" was added before the trap fired, but the rollback removed it: the bag is exactly as it was. That is the strong guarantee.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why destructors, not catch blocks',
          text: 'During unwinding, destructors are the **only** code guaranteed to run. A `catch` block runs only where you wrote one and only for the types it names; a destructor runs for every exit, normal or exceptional, from every scope. That is why well-written C++ has few `try` blocks: a codebase with try/catch in every function is usually a sign of missing RAII types.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Exception-safe code usually needs a try/catch block in every function that acquires a resource.',
      answer: false,
      explanation:
        'The opposite is true: exception-safe C++ relies on destructors, not handlers. Wrap each resource in an RAII object (`std::unique_ptr`, `std::vector`, `std::lock_guard`, or your own guard) and unwinding releases it on every path automatically. try/catch belongs only where you can actually *handle* an error — typically a few places near the top of the program.',
    },
    {
      kind: 'concept',
      title: 'noexcept: a promise the runtime enforces',
      blocks: [
        {
          type: 'p',
          text: 'Writing [[noexcept]] after a function\'s parameter list promises that no exception will ever leave it. Callers — and the compiler — can rely on that. The keyword also works as an operator: `noexcept(expr)` asks at [[compile-time]] whether evaluating `expr` could throw, without actually running it.',
        },
        {
          type: 'code',
          title: 'noexcept_query.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <vector>

int clampHealth(int hp) noexcept {
    return hp < 0 ? 0 : (hp > 100 ? 100 : hp);
}

std::string makeTag(int id) {   // allocates: may throw
    return "Enemy_" + std::to_string(id);
}

int main() {
    std::vector<int> scores;
    std::cout << std::boolalpha
              << noexcept(clampHealth(150)) << '\\n'
              << noexcept(makeTag(7)) << '\\n'
              << noexcept(scores.size()) << '\\n'
              << noexcept(scores.push_back(1)) << '\\n';
}`,
          output: `true
false
true
false`,
          annotations: [
            { lines: 5, text: 'Simple arithmetic cannot fail, so promising `noexcept` is honest and useful.' },
            { lines: 9, text: 'Building a `std::string` may allocate, and allocation may throw `std::bad_alloc`. No `noexcept` here.' },
            { lines: '16-19', text: 'The `noexcept` operator inspects declarations only. None of these calls actually happen; `scores` stays empty.' },
            { lines: 18, text: 'The standard declares `vector::size()` `noexcept`, while `push_back` may allocate — the library uses the same rules you do.' },
          ],
        },
        {
          type: 'p',
          text: 'What if a `noexcept` function throws anyway? The compiler mostly can\'t stop you — calling a throwing function from a `noexcept` one compiles fine. But at run time the exception is **not** allowed out: the moment it would escape, `std::terminate` is called. Whether the stack is unwound first is implementation-defined.',
        },
        {
          type: 'code',
          code: `void saveSettings() noexcept {
    writeFile("settings.ini");   // suppose this throws...
}   // ...the exception hits the noexcept wall: std::terminate`,
          annotations: [
            { lines: 2, text: 'Compiles without complaint, even if `writeFile` can throw. (GCC only warns when a `throw` appears *directly* inside a `noexcept` function.)' },
            { lines: 3, text: 'The exception does not reach any caller\'s handler. The program ends.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why enforce it with terminate instead of a compile error?',
          text: 'Checking at compile time would force every function to declare every exception it might throw — Java\'s checked exceptions — which C++ tried with `throw(X, Y)` specifications and abandoned. Instead, `noexcept` is a simple yes/no promise. Because breaking it ends the program, callers can **trust** it completely, and the compiler can skip generating unwinding paths around such calls. Generic code uses that trust to pick faster algorithms, as you\'ll see next.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'What to mark noexcept',
          text: 'Mark functions `noexcept` when they genuinely cannot fail: move constructors and move assignment, `swap`, destructors (already implicit), and simple getters and arithmetic. Don\'t mark functions that allocate or call code that might throw — unless you truly prefer termination to an exception. Templates can use the conditional form `noexcept(condition)`, for example `noexcept(std::is_nothrow_move_constructible_v<T>)`.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'throw() is gone',
          text: 'Before C++11, functions could list their exceptions with dynamic specifications like `void f() throw(std::bad_alloc);`. They were checked at run time, cost performance and helped no one. They were deprecated in C++11, removed in C++17, and the last survivor, the empty `throw()`, was removed in C++20. `noexcept` replaced them all.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Promise that `swap` never throws, then ask the compiler whether calling it could throw.',
      template: `class Gear {
public:
    void swap(Gear& other) ___ {
        std::swap(power_, other.power_);
    }
private:
    int power_ = 0;
};

Gear a, b;
std::cout << ___(a.swap(b));   // prints 1`,
      blanks: [{ answers: ['noexcept'] }, { answers: ['noexcept'] }],
      wordBank: ['noexcept', 'throw()', 'const', 'nothrow', 'sizeof'],
      explanation:
        'The same keyword plays both roles: as a **specifier** after the parameter list it makes the promise, and as an **operator** `noexcept(expr)` it yields a compile-time `bool` saying whether `expr` is declared non-throwing (printed as `1` without `std::boolalpha`). `throw()` was the pre-C++11 spelling and was removed in C++20; `std::nothrow` is something else entirely — a tag that makes `new` return `nullptr` instead of throwing.',
    },
    {
      kind: 'concept',
      title: 'Why std::vector cares about noexcept moves',
      blocks: [
        {
          type: 'p',
          text: 'When a `std::vector` runs out of [[capacity]], it allocates a bigger buffer and transfers every element across. Moving would be the fast way. But `push_back` promises the **strong guarantee** — and that creates a dilemma. If the vector has moved three elements and the fourth move throws, the first three are already gutted in the old buffer. It cannot roll back, because moving them back might throw too.',
        },
        {
          type: 'p',
          text: 'So the vector plays it safe: it **moves** elements only if their move constructor is `noexcept` (or the type can\'t be copied at all); otherwise it **copies** them, leaving the originals untouched until the new buffer is complete. Internally it uses `std::move_if_noexcept`. Watch the difference one keyword makes:',
        },
        {
          type: 'code',
          title: 'realloc.cpp',
          runnable: true,
          code: `#include <iostream>
#include <vector>

struct Risky {   // move might throw
    Risky() = default;
    Risky(const Risky&) { std::cout << "copy "; }
    Risky(Risky&&) { std::cout << "move "; }
};

struct Safe {    // move promises not to throw
    Safe() = default;
    Safe(const Safe&) { std::cout << "copy "; }
    Safe(Safe&&) noexcept { std::cout << "move "; }
};

template <typename T>
void grow(const char* label) {
    std::vector<T> v;
    v.reserve(2);
    v.emplace_back();
    v.emplace_back();
    std::cout << label << ": ";
    v.emplace_back();   // capacity 2 is full: reallocate
    std::cout << '\\n';
}

int main() {
    grow<Risky>("Risky");
    grow<Safe>("Safe");
}`,
          output: `Risky: copy copy
Safe: move move`,
          annotations: [
            { lines: 7, text: 'A [[move-constructor]] **without** `noexcept`. Even though this body cannot actually throw, the vector only trusts the declaration.' },
            { lines: 13, text: 'Identical, except for `noexcept`.' },
            { lines: 23, text: 'The third element doesn\'t fit, so the vector allocates a new buffer and transfers the two existing elements. (The new element is constructed in place and prints nothing.)' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'A missing noexcept can cost you dearly',
          text: 'Imagine each element owns a 4 MB texture buffer. With a `noexcept` move, growing the vector swaps a few pointers per element. Without it, every reallocation deep-copies every texture. Nothing is wrong, nothing warns you — it is just mysteriously slow. If you write move operations by hand, mark them `noexcept`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'The rule of zero gets this right for you',
          text: 'Move constructors the compiler generates (implicitly, or with `= default`) are automatically `noexcept` when every member\'s move is. `std::string`, `std::vector` and `std::unique_ptr` all have `noexcept` moves, so a class that just holds such members — following the [[rule-of-zero]] — already plays nicely with containers.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'TArray takes a different route',
          text: 'Unreal\'s `TArray` does not ask this question at all. Unreal\'s containers assume element types are *bitwise relocatable*: when a `TArray` grows, it moves elements to the new buffer with a raw memory move instead of calling move constructors. It is fast and cannot throw — but it means a type that stores pointers into itself must never be stored by value in a `TArray`.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: '`Mesh` has a hand-written move constructor that is **not** marked `noexcept`, plus a normal copy constructor. What does a `std::vector<Mesh>` do with its existing elements when it reallocates?',
      options: [
        { text: 'Moves them, because moving is always preferred over copying', why: 'Moving is preferred only when it is safe for the strong guarantee. A potentially-throwing move could leave the old buffer half gutted, with no way to roll back.' },
        { text: 'Copies them, so the old elements stay intact if anything throws', correct: true, why: 'Copying leaves the originals untouched. If a copy throws, the vector destroys the new buffer and the old one is exactly as before — the strong guarantee holds.' },
        { text: 'Fails to compile until the move constructor is marked `noexcept`', why: 'It compiles fine. `std::move_if_noexcept` quietly selects the copy constructor instead.' },
        { text: 'Moves them, and calls `std::terminate` if a move throws', why: 'That is what would happen if the move *were* marked `noexcept` and then threw anyway. Without the promise, the vector simply avoids moving.' },
      ],
      explanation:
        'Reallocation must not break `push_back`\'s strong guarantee. A move that might throw is unsafe because it destroys the source as it goes, so the vector falls back to copying whenever the move constructor isn\'t `noexcept` and a copy constructor exists. The fix is one word: declare the move constructor `noexcept` (if it really can\'t throw).',
    },
    {
      kind: 'concept',
      title: 'Destructors are implicitly noexcept',
      blocks: [
        {
          type: 'p',
          text: 'Since C++11, every [[destructor]] is implicitly `noexcept` — unless you explicitly write `noexcept(false)` or a member or base class has a potentially-throwing destructor. So an exception that escapes a destructor calls `std::terminate`, just like any other broken `noexcept` promise.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why destructors must not throw',
          text: 'Destructors run *during* stack unwinding. If an exception is already in flight and a destructor throws a second one, C++ would have two exceptions to propagate and only one stack to unwind — there is no sensible answer, so the program terminates. Containers are similarly helpless: if destroying the third of ten elements throws, what happens to the other seven? Making destructors `noexcept` by default turns this from a rare, mysterious crash into a clear rule.',
        },
        {
          type: 'p',
          text: 'What if cleanup genuinely can fail — for example, flushing a save file to disk? Give the class an explicit function that can report failure, and make the destructor a best-effort fallback that never throws:',
        },
        {
          type: 'code',
          title: 'save_writer.h',
          code: `class SaveWriter {
public:
    void commit() {               // may throw: caller can react
        flushToDisk();
        committed_ = true;
    }
    ~SaveWriter() {               // implicitly noexcept
        if (!committed_) {
            try {
                discardTempFile();
            } catch (...) {
                // log it, but never let it escape
            }
        }
    }
private:
    bool committed_ = false;
};`,
          annotations: [
            { lines: '3-6', text: 'The operation that can fail is a normal member function. The caller calls it explicitly and can catch errors and decide what to do (retry, warn the player).' },
            { lines: 7, text: 'No `noexcept` written, but it is `noexcept` anyway — that is the default for destructors.' },
            { lines: '9-13', text: 'Best-effort cleanup. Swallowing exceptions is usually bad, but a destructor has no one to report to; logging is the best it can do.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Other functions that must not throw',
          text: 'The same reasoning applies to anything used during cleanup or rollback: `swap`, move operations, memory deallocation (`operator delete`), and the rollback code in guards like `BagTransaction`. These form the nothrow "building blocks" that the strong guarantee is built from.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This class crashes the game with `std::terminate` when the disk is full. Tap the line responsible.',
      code: `class ScreenshotWriter {
public:
    explicit ScreenshotWriter(std::string path)
        : path_{std::move(path)} {}
    ~ScreenshotWriter() {
        if (!flushToDisk(path_)) {
            throw std::runtime_error{"disk full"};
        }
    }
private:
    std::string path_;
};`,
      bugLines: [7],
      hint: 'What is the exception specification of a destructor you didn\'t mark at all?',
      explanation:
        'Destructors are implicitly `noexcept`, so the exception on line 7 cannot escape: the moment it tries, `std::terminate` ends the program (GCC even warns that this throw "will always call terminate"). Even with `noexcept(false)`, throwing from a destructor during unwinding would still terminate. The fix: move the fallible work into an explicit `flush()` or `commit()` member that callers invoke and can handle, and keep the destructor non-throwing.',
    },
    {
      kind: 'concept',
      title: 'Copy-and-swap: the strong guarantee for assignment',
      blocks: [
        {
          type: 'p',
          text: 'A hand-written copy assignment operator for a class that owns memory is a classic exception-safety trap. The naive version destroys the old state **before** it has successfully built the new one:',
        },
        {
          type: 'code',
          title: 'naive assignment (broken)',
          code: `Heightmap& operator=(const Heightmap& other) {
    if (this != &other) {
        delete[] data_;               // old data gone...
        size_ = other.size_;
        data_ = new int[size_];       // ...and if this throws?
        std::copy(other.data_, other.data_ + size_, data_);
    }
    return *this;
}`,
          annotations: [
            { lines: 3, text: 'Destroys the old buffer immediately. From here on there is no way back.' },
            { lines: 5, text: 'If `new` throws `std::bad_alloc`, `data_` still holds the address of the deleted buffer — a [[dangling-pointer]]. The destructor will later `delete[]` it again: a [[double-free]] and [[undefined-behavior]]. No guarantee at all.' },
          ],
        },
        {
          type: 'p',
          text: 'The [[copy-and-swap]] idiom fixes this by doing the risky copy first, into a separate object, and then committing with a `noexcept` swap:',
        },
        {
          type: 'code',
          title: 'copy_and_swap.cpp',
          runnable: true,
          code: `#include <algorithm>
#include <cstddef>
#include <iostream>
#include <utility>

class Heightmap {
public:
    explicit Heightmap(std::size_t n)
        : size_{n}, data_{new int[n]{}} {}
    Heightmap(const Heightmap& other)
        : size_{other.size_}, data_{new int[other.size_]} {
        std::copy(other.data_, other.data_ + size_, data_);
    }
    Heightmap& operator=(Heightmap other) noexcept {
        swap(other);
        return *this;
    }   // other (holding the OLD data) is destroyed here
    ~Heightmap() { delete[] data_; }

    void swap(Heightmap& other) noexcept {
        std::swap(size_, other.size_);
        std::swap(data_, other.data_);
    }
    std::size_t size() const { return size_; }
    int& at(std::size_t i) { return data_[i]; }

private:
    std::size_t size_;
    int* data_;
};

int main() {
    Heightmap a{3};
    Heightmap b{5};
    b.at(0) = 42;
    a = b;              // copy is made, then swapped in
    Heightmap& alias = a;
    a = alias;          // self-assignment: still correct
    std::cout << a.size() << ' ' << a.at(0) << '\\n';
}`,
          output: '5 42',
          annotations: [
            { lines: 14, text: 'The parameter is taken **by value**. The copy constructor runs when the argument is passed — before the function body starts. If that copy throws, `*this` has not been touched at all.' },
            { lines: 15, text: 'Swap our contents with the fresh copy: two pointer-sized swaps that cannot throw. This is the "commit" step.' },
            { lines: 17, text: 'When `other` goes out of scope it destroys whatever it now holds — our **old** buffer. Cleanup happens through the destructor, for free.' },
            { lines: '20-23', text: 'A `noexcept` member `swap` is the building block. It only exchanges a size and a pointer.' },
            { lines: '37-38', text: 'Self-assignment needs no special `if (this != &other)` test: we copy ourselves, swap with the copy, and destroy the old buffer. Wasteful, but correct.' },
          ],
        },
        {
          type: 'p',
          text: 'Why is `operator=` allowed to be `noexcept` when it copies? Because the standard says each parameter is initialized in the *calling* function\'s context. An exception from copying the argument propagates from the call site and never enters `operator=`. And if you later add a move constructor, this single by-value `operator=` automatically handles move assignment too: a moved-from argument is cheap to construct.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'The strong guarantee is not free',
          text: 'Copy-and-swap always allocates a new buffer, even when the existing one is big enough to reuse. That is why `std::vector`\'s copy assignment only offers the **basic** guarantee: it reuses existing capacity for speed. The general rule: provide the strong guarantee when it is cheap or when callers really need it, and document the basic guarantee otherwise. For classes following the rule of zero, you rarely need either trick — the members already handle it.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Arrange the lines so `setRoster` provides the strong guarantee: if `validated()` throws for any name, the existing roster must stay unchanged.',
      lines: [
        'void Party::setRoster(const std::vector<std::string>& names) {',
        '    std::vector<std::string> fresh;',
        '    for (const auto& n : names) fresh.push_back(validated(n));',
        '    roster_.swap(fresh);',
        '}',
      ],
      distractors: ['    roster_.clear();'],
      explanation:
        'Build the new state off to the side in `fresh` — every throwing operation (validation, allocation, string copies) happens there, while `roster_` is untouched. Only when all of it has succeeded does `swap` commit the result; `vector::swap` exchanges internal pointers and never throws. `fresh` then destroys the old roster on the way out. Calling `roster_.clear()` first would destroy the old state before the risky work, reducing the function to the basic guarantee at best.',
    },
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which of these functions should almost always be `noexcept`? Select all that apply.',
      options: [
        { text: 'A destructor', correct: true, why: 'Destructors run during unwinding and inside containers; they are implicitly `noexcept` for exactly that reason.' },
        { text: 'A move constructor', correct: true, why: 'Containers like `std::vector` only move elements during reallocation if the move constructor is `noexcept`; otherwise they copy.' },
        { text: 'A member `swap`', correct: true, why: '`swap` is the commit step of copy-and-swap and many strong-guarantee algorithms. If it could throw, it could not serve as a safe commit.' },
        { text: 'A function that loads a level file from disk', why: 'File I/O can fail for reasons outside your control. Marking it `noexcept` would turn a recoverable error into program termination.' },
        { text: 'A function that appends to a `std::vector`', why: 'Appending may allocate, and allocation can throw `std::bad_alloc`. Promising `noexcept` would be a lie enforced with `std::terminate`.' },
      ],
      explanation:
        'Destructors, moves and swaps are the **nothrow building blocks** that cleanup, container reallocation and the strong guarantee rely on, so they should be — and usually can be — `noexcept`. Functions that allocate memory or touch the outside world can genuinely fail; marking them `noexcept` does not make the failure go away, it just converts it into `std::terminate`.',
    },
  ],
  takeaways: [
    'Exception safety is about the state an exception leaves behind: **basic** (valid, no leaks), **strong** (all-or-nothing) or **nothrow** (never fails).',
    'Get the strong guarantee by doing all risky work first, off to the side, then committing with operations that cannot throw.',
    'RAII is the foundation: destructors are the only code guaranteed to run during unwinding, so good C++ has few try/catch blocks.',
    '`noexcept` is a promise enforced at run time: an exception that tries to escape calls `std::terminate`. `noexcept(expr)` queries it at compile time.',
    '`std::vector` moves elements during reallocation only if their move constructor is `noexcept`; otherwise it copies — so mark hand-written moves `noexcept`.',
    'Destructors are implicitly `noexcept`. Put fallible cleanup in an explicit member function and keep destructors non-throwing.',
    'Copy-and-swap (take the parameter by value, then `noexcept` swap) gives assignment the strong guarantee and handles self-assignment automatically.',
  ],
  reading: [
    {
      title: 'Exceptions — exception safety',
      url: 'https://en.cppreference.com/w/cpp/language/exceptions',
      source: 'cppreference',
      note: 'See the "Exception safety" section for the standard definitions of the four levels.',
    },
    {
      title: 'noexcept specifier',
      url: 'https://en.cppreference.com/w/cpp/language/noexcept_spec',
      source: 'cppreference',
      note: 'Exactly which functions are implicitly noexcept, and what happens when the promise is broken.',
    },
    {
      title: 'std::move_if_noexcept',
      url: 'https://en.cppreference.com/w/cpp/utility/move_if_noexcept',
      source: 'cppreference',
      note: 'The small utility behind std::vector\'s copy-or-move decision during reallocation.',
    },
    {
      title: 'C++ Core Guidelines — E: Error handling',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-errors',
      source: 'core-guidelines',
      note: 'Includes "a destructor may not fail" and "use RAII to prevent leaks", with reasoning.',
    },
    {
      title: 'isocpp FAQ — Exceptions and Error Handling',
      url: 'https://isocpp.org/wiki/faq/exceptions',
      source: 'isocpp',
      note: 'Classic answers on throwing from destructors and writing exception-safe classes.',
    },
  ],
};
