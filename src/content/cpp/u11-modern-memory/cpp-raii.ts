import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-raii',
  title: 'RAII — The Most Important Idiom in C++',
  summary: 'Tie every resource to an object\'s lifetime, and cleanup happens automatically — on early returns, on exceptions, every time.',
  minutes: 17,
  objectives: [
    'Define what a resource is and give examples beyond memory',
    'Write a class that acquires a resource in its constructor and releases it in its destructor',
    'Explain why scope-based cleanup survives early returns and exceptions',
    'Recognise RAII in the standard library: `std::string`, `std::vector`, `std::fstream`, `std::lock_guard`',
    'Apply the rules for writing your own RAII wrappers, including one resource per class',
    'Explain why Unreal still relies on RAII even though `UObject`s are garbage collected',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'What is a resource?',
      blocks: [
        {
          type: 'p',
          text: 'A [[system-resource|resource]] is anything your program borrows and must **give back**. Heap memory is the one you met first, but games juggle many more — and most of them are far scarcer than memory:',
        },
        {
          type: 'table',
          headers: ['Resource', 'Acquire', 'Release', 'If you forget'],
          rows: [
            ['Heap memory', '`new`', '`delete`', 'Memory leak; the game slowly grows until it crashes'],
            ['File handle', '`std::fopen`', '`std::fclose`', 'Save file stays locked; the OS limit on open files is hit'],
            ['Mutex lock', '`m.lock()`', '`m.unlock()`', 'Every other thread waits forever (deadlock)'],
            ['Network socket', '`connect`', '`close`', 'Server runs out of connections'],
            ['GPU texture', '`glGenTextures`', '`glDeleteTextures`', 'Video memory fills up; textures fail to load'],
            ['Audio voice', 'request a voice', 'release the voice', 'Sounds stop playing once the voice pool is empty'],
          ],
        },
        {
          type: 'p',
          text: 'Every resource has the same shape: an *acquire* step and a matching *release* step that must happen **exactly once**, on **every** path out of the code that used it. Release it zero times and it leaks; twice and you get a [[double-free]]; use it after release and you have a [[dangling-pointer]] or a stale handle.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why manual pairing does not scale',
          text: 'Writing `fclose` after `fopen` is easy when a function has one exit. Real functions have early returns for errors, loops with `break`, and calls that can throw exceptions. Each exit path needs its own cleanup, each new resource multiplies the paths, and each later edit can silently break one of them. Humans are bad at this kind of bookkeeping; compilers are perfect at it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The manual way, and why it breaks',
      blocks: [
        {
          type: 'p',
          text: 'Here is level loading written with manual cleanup. It is correct as written — but look at what correctness costs:',
        },
        {
          type: 'code',
          title: 'Manual cleanup (fragile)',
          code: `bool loadLevel(const char* path) {
    std::FILE* file = std::fopen(path, "rb");
    if (!file) {
        return false;
    }
    char* buffer = new char[4096];
    if (std::fread(buffer, 1, 4096, file) == 0) {
        delete[] buffer;
        std::fclose(file);
        return false;
    }
    if (!parseHeader(buffer)) {
        delete[] buffer;
        std::fclose(file);
        return false;
    }
    buildLevel(buffer);
    delete[] buffer;
    std::fclose(file);
    return true;
}`,
          annotations: [
            { lines: '8-9', text: 'Cleanup, copy #1.' },
            { lines: 12, text: 'If `parseHeader` **throws an exception**, none of the cleanup lines run at all: both the buffer and the file leak.' },
            { lines: '13-14', text: 'Cleanup, copy #2 — identical. Every new early return needs another copy, and forgetting one is a leak.' },
            { lines: '18-19', text: 'Copy #3, on the success path. Three copies of the same two lines in one small function.' },
          ],
        },
        {
          type: 'p',
          text: 'An [[exception]] is C++\'s way of reporting an error by jumping out of functions until some code catches it (Unit 14 covers exceptions fully). For now, the key fact is that it skips every line between the `throw` and the `catch` — including your hand-written cleanup.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Other languages patch this with special syntax',
          text: 'Java and C# have `finally` blocks, `try-with-resources` and `using`; Go has `defer`. Each of them makes *you* remember to write the cleanup construct at every use site. C++ moves the cleanup into the **type** instead, so it can never be forgotten. That is RAII.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'bug',
      prompt: 'This function leaks a file handle on one of its paths. Tap the line where the leak happens.',
      code: `bool loadTextures(const char* path) {
    std::FILE* file = std::fopen(path, "rb");
    if (!file) {
        return false;
    }
    int count = 0;
    if (std::fscanf(file, "%d", &count) != 1) {
        std::fclose(file);
        return false;
    }
    if (count > 256) {
        return false;
    }
    // ... load count textures ...
    std::fclose(file);
    return true;
}`,
      bugLines: [12],
      hint: 'Check every `return`: is the file open at that point, and is it closed first?',
      explanation:
        'Line 12 returns while the file is still open, so the handle leaks every time a level lists too many textures. Line 4 is fine — `fopen` failed, so there is nothing to close. This is the trap of manual cleanup: the bug appeared when someone added a validation check months later and copied the `return false;` without the `fclose`. With an RAII file wrapper, every return would close the file automatically.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'RAII: tie the resource to an object\'s lifetime',
      blocks: [
        {
          type: 'p',
          text: 'C++ makes one rock-solid guarantee: when a local object goes out of [[scope]], its [[destructor]] runs — whether the scope ends normally, through `return`, through `break`, or because an exception is passing through. [[raii|RAII]] exploits that guarantee: **acquire the resource in a constructor, release it in the destructor**, and let the object\'s lifetime manage the resource.',
        },
        {
          type: 'code',
          title: 'texture.cpp',
          runnable: true,
          code: `#include <iostream>

// A pretend graphics API. A real one would talk to the GPU.
int gpuCreateTexture(int size) {
    static int nextId = 1;
    std::cout << "  [gpu] create #" << nextId << " (" << size
              << "px)\\n";
    return nextId++;
}

void gpuDestroyTexture(int id) {
    std::cout << "  [gpu] destroy #" << id << '\\n';
}

class Texture {
public:
    explicit Texture(int size) : id_{gpuCreateTexture(size)} {}
    ~Texture() { gpuDestroyTexture(id_); }

    Texture(const Texture&) = delete;             // no copies
    Texture& operator=(const Texture&) = delete;

    int id() const { return id_; }

private:
    int id_;
};

void drawFrame(bool skipPostFx) {
    Texture shadowMap{2048};
    if (skipPostFx) {
        std::cout << "  early return\\n";
        return;                        // shadowMap still freed
    }
    Texture bloom{512};
    std::cout << "  drawing with #" << shadowMap.id() << " and #"
              << bloom.id() << '\\n';
}                                      // bloom, then shadowMap

int main() {
    std::cout << "Frame 1:\\n";
    drawFrame(false);
    std::cout << "Frame 2:\\n";
    drawFrame(true);
}`,
          output: 'Frame 1:\n  [gpu] create #1 (2048px)\n  [gpu] create #2 (512px)\n  drawing with #1 and #2\n  [gpu] destroy #2\n  [gpu] destroy #1\nFrame 2:\n  [gpu] create #3 (2048px)\n  early return\n  [gpu] destroy #3',
          annotations: [
            { lines: 17, text: '**Acquire in the constructor.** If you have a `Texture` object, you have a GPU texture — there is no "created but not yet loaded" state to forget about.' },
            { lines: 18, text: '**Release in the destructor.** Written once, here, and never again at any call site.' },
            { lines: '20-21', text: 'Copying a `Texture` would give two objects the same id, and both destructors would destroy it. Deleting the copy operations forbids that at compile time — the next lesson explains copying in full.' },
            { lines: 33, text: 'An early return with zero cleanup code. The compiler inserts the destructor call for `shadowMap`.' },
            { lines: 38, text: 'Locals are destroyed in **reverse** order of construction: `bloom` first, then `shadowMap` — matching what you saw with constructors and destructors in Unit 10.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why this is C++\'s superpower',
          text: 'The key word is **deterministic**. A C++ destructor runs at a precise, predictable point: the closing brace. In garbage-collected languages, objects are reclaimed "eventually" — maybe seconds later, maybe never — so they cannot be trusted to release a lock or close a file on time. RAII gives you automatic cleanup *and* exact timing, with no runtime cost.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'A famously bad name',
          text: 'Bjarne Stroustrup coined "Resource Acquisition Is Initialization" in the 1980s, and even he admits the name is awkward: the important half is really *destruction is release*. Some people call it "Scope-Bound Resource Management" or simply "destructor-based cleanup". The idiom matters more than the acronym.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'mcq',
      prompt: 'A function creates a local `Texture` (the RAII class above) and then leaves its scope in one of these ways. In which case does `~Texture()` **not** run?',
      options: [
        { text: 'An early `return` in the middle of the function', why: 'Returning ends the scope, and every fully constructed local is destroyed on the way out — that is exactly what Frame 2 demonstrated.' },
        { text: 'An exception thrown further down that propagates out of the function', why: 'When an exception is caught somewhere up the call stack, every scope it passes through is unwound and its locals are destroyed. That is the point of RAII.' },
        { text: 'The program calls `std::abort()`', correct: true, why: '`std::abort()` ends the process immediately without unwinding the stack, so no destructors run. The operating system reclaims memory, but anything that needed a clean shutdown, such as flushing a save file, never happens.' },
        { text: 'A `break` out of a loop whose body declared the `Texture`', why: 'The loop body is a scope. Leaving it by `break` (or `continue`) destroys the locals declared inside it.' },
      ],
      explanation:
        'Any way of leaving a scope that the language understands — falling off the end, `return`, `break`, `continue`, `goto`, or an exception being unwound — runs the destructors of the scope\'s fully constructed locals in reverse order. Only abrupt process termination (`std::abort`, a crash, or `std::exit`, which skips local objects) bypasses them.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Cleanup that survives exceptions',
      blocks: [
        {
          type: 'p',
          text: 'Exceptions are where RAII really earns its keep. When an exception is thrown, C++ performs [[stack-unwinding]]: it leaves each scope between the `throw` and the matching `catch`, destroying every local object on the way, in reverse order. Code that never mentions the exception still cleans up after it:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <stdexcept>

class SaveFile {
public:
    explicit SaveFile(const char* name) : name_{name} {
        std::cout << "open " << name_ << '\\n';
    }
    ~SaveFile() { std::cout << "close " << name_ << '\\n'; }

    SaveFile(const SaveFile&) = delete;
    SaveFile& operator=(const SaveFile&) = delete;

private:
    const char* name_;
};

void writeSave(int slot) {
    SaveFile file{"slot.sav"};
    if (slot < 0) {
        throw std::invalid_argument{"bad slot"};
    }
    std::cout << "writing slot " << slot << '\\n';
}

int main() {
    try {
        writeSave(1);
        writeSave(-1);
        std::cout << "never printed\\n";
    } catch (const std::exception& e) {
        std::cout << "error: " << e.what() << '\\n';
    }
}`,
          output: 'open slot.sav\nwriting slot 1\nclose slot.sav\nopen slot.sav\nclose slot.sav\nerror: bad slot',
          annotations: [
            { lines: 21, text: '`throw` creates an exception object and starts looking for a matching `catch`. Execution of `writeSave` stops here.' },
            { lines: 24, text: 'Leaving `writeSave` — normally or by exception — destroys `file`. Note that "close" is printed **before** the `catch` block runs.' },
            { lines: '27-33', text: '`try` marks code whose exceptions you want to handle; `catch` handles them. `main` never mentions the file, yet the file was closed.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Destructors must not throw',
          text: 'Destructors are implicitly [[noexcept]]. If a destructor throws while the stack is already unwinding because of another exception, C++ has two exceptions in flight and calls `std::terminate`, ending the program. Release functions in destructors should report failure some other way (logging, an error flag) — never by throwing.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Zero-cost cleanup',
          text: 'RAII adds no runtime overhead compared with correct manual code: the destructor call the compiler inserts is exactly the cleanup you would have written by hand, usually inlined. On the exception path, modern compilers use tables rather than extra instructions, so the happy path pays nothing.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'order',
      prompt: '`Guard` prints "acquire X" in its constructor and "release X" in its destructor. Put the lines this program prints in order.',
      code: `void saveGame() {
    Guard lock{"save-lock"};
    Guard file{"save.dat"};
    throw std::runtime_error{"disk full"};
}

int main() {
    try {
        saveGame();
    } catch (const std::exception& e) {
        std::cout << "caught: " << e.what() << '\\n';
    }
}`,
      lines: ['acquire save-lock', 'acquire save.dat', 'release save.dat', 'release save-lock', 'caught: disk full'],
      explanation:
        'Objects are constructed in declaration order, so the lock is acquired before the file. The `throw` starts stack unwinding: the locals of `saveGame` are destroyed in **reverse** order (file first, then lock) as the exception leaves the function. Only after unwinding reaches `main`\'s `try` does the `catch` block run. Reverse order matters — you would not want to release the lock while still writing the file it protects.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'You already use RAII every day',
      blocks: [
        {
          type: 'p',
          text: 'Most of the standard library is built on RAII. `std::string` and `std::vector` own heap memory and free it in their destructors — that is why you have never written `delete` for them. The same pattern covers files, locks and threads:',
        },
        {
          type: 'table',
          headers: ['Type', 'Resource', 'Acquired in', 'Released in'],
          rows: [
            ['`std::string`, `std::vector`', 'Heap memory', 'Constructor / growth', 'Destructor'],
            ['`std::ifstream`, `std::ofstream`', 'File handle', 'Constructor (opens)', 'Destructor (flushes and closes)'],
            ['`std::lock_guard`, `std::scoped_lock`', 'Mutex lock', 'Constructor (locks)', 'Destructor (unlocks)'],
            ['`std::jthread`', 'Thread', 'Constructor (starts)', 'Destructor (requests stop and joins)'],
            ['`std::unique_ptr`', 'Heap object', 'Constructor / `make_unique`', 'Destructor (deletes) — lesson after next'],
          ],
        },
        {
          type: 'p',
          text: 'A [[mutex]] is a lock that lets only one thread at a time into a section of code (Unit 17 covers threads). Here a function updates a shared high score and writes it to disk. Notice that it contains no unlock and no close — on any path:',
        },
        {
          type: 'code',
          code: `#include <fstream>
#include <mutex>

std::mutex scoreMutex;
int highScore = 0;

void submitScore(int score) {
    std::lock_guard lock{scoreMutex};      // locks the mutex
    if (score <= highScore) {
        return;                            // unlocks
    }
    highScore = score;
    std::ofstream out{"highscore.txt"};    // opens the file
    out << highScore << '\\n';
}                                          // closes, then unlocks`,
          annotations: [
            { lines: 8, text: '[[lock-guard|std::lock_guard]] locks in its constructor and unlocks in its destructor. Without it, an early return or an exception while holding the lock would leave every other thread blocked forever.' },
            { lines: 10, text: 'The early return unlocks automatically.' },
            { lines: 13, text: '`std::ofstream` opens the file in its constructor…' },
            { lines: 15, text: '…and flushes and closes it in its destructor. Then `lock` is destroyed, releasing the mutex — reverse order again.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Smallest possible scope',
          text: 'Because release happens at the closing brace, you control *when* by choosing *where* the object lives. Need to release a lock before doing slow work? Put the guarded part in its own `{ ... }` block, so the guard dies at that block\'s end.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'truefalse',
      prompt: 'A `std::ofstream` must be closed manually with `.close()`, or the file handle leaks when the function returns.',
      answer: false,
      explanation:
        '`std::ofstream` is an RAII type: its destructor flushes any buffered output and closes the file. Calling `.close()` is only needed when you want to close *early* — for example to check for write errors, or to reopen the file — before the object goes out of scope.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: 'Two threads call `addItem` at the same time and the inventory gets corrupted, even though a `lock_guard` is used. Tap the buggy line.',
      code: `std::mutex inventoryMutex;
std::vector<std::string> inventory;

void addItem(const std::string& item) {
    std::lock_guard<std::mutex>{inventoryMutex};
    inventory.push_back(item);
}`,
      bugLines: [5],
      hint: 'How long does an object without a name live?',
      explanation:
        'Line 5 creates an **unnamed temporary** `lock_guard`. A temporary lives only until the end of its full expression — the semicolon — so the mutex is locked and immediately unlocked, and `push_back` runs unprotected. It compiles without a warning. An RAII object must be a **named** variable so it lives until the end of the scope: `std::lock_guard lock{inventoryMutex};`.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Writing your own RAII wrapper',
      blocks: [
        {
          type: 'p',
          text: 'Whenever you meet a C-style API with acquire/release pairs — a physics engine, an audio library, a platform SDK — wrap it. Here is a wrapper for C file handles, following the standard checklist:',
        },
        {
          type: 'code',
          title: 'File.h',
          code: `#include <cstdio>
#include <stdexcept>

class File {
public:
    File(const char* path, const char* mode)
        : handle_{std::fopen(path, mode)} {
        if (!handle_) {
            throw std::runtime_error{"cannot open file"};
        }
    }
    ~File() { std::fclose(handle_); }

    File(const File&) = delete;
    File& operator=(const File&) = delete;

    std::FILE* get() const { return handle_; }

private:
    std::FILE* handle_;
};`,
          annotations: [
            { lines: '6-11', text: '**Acquire in the constructor, and fail loudly.** If opening fails, throwing means no `File` object ever exists, so there is no "invalid file" state for callers to check.' },
            { lines: 12, text: '**Release in the destructor, and never throw.** Because the constructor guarantees `handle_` is valid, the destructor needs no check.' },
            { lines: '14-15', text: '**Decide what copying means.** Two `File`s sharing one handle would close it twice, so copying is forbidden. (Moving ownership is allowed later, once you learn move semantics.)' },
            { lines: 17, text: '**Give access to the raw handle** so the wrapper works with the existing C API: `std::fprintf(save.get(), ...)`.' },
          ],
        },
        {
          type: 'p',
          text: 'One more rule is subtle but vital: **one resource per wrapper**. If a constructor throws, the object never finished being constructed, so its destructor does **not** run. But any members that *were* fully constructed are destroyed. Compose wrappers as members and partial failure cleans itself up:',
        },
        {
          type: 'compare',
          left: {
            title: 'Two raw resources in one class',
            tone: 'bad',
            code: `class Level {
public:
    Level()
        : music_{new Music},
          atlas_{new TextureAtlas} {}
    // if new TextureAtlas throws,
    // ~Level never runs: music_ leaks
    ~Level() { delete atlas_;
               delete music_; }
private:
    Music* music_;
    TextureAtlas* atlas_;
};`,
          },
          right: {
            title: 'One wrapper per resource',
            tone: 'good',
            code: `class Level {
    // each member cleans up itself
    MusicTrack music_;
    TextureAtlas atlas_;
};
// if atlas_'s constructor throws,
// the already-built music_ is
// destroyed automatically.
// Level needs no destructor.`,
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why "one resource per class" works',
          text: 'C++ tracks construction member by member. Each fully constructed member is a finished object with its own destructor, so if a later member throws, the earlier ones are unwound just like locals in a function. By giving every resource its own small owner, you never have to reason about half-built objects — and the outer class often needs no destructor at all.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'fill',
      prompt: 'Complete this RAII wrapper for an audio voice. `acquireVoice()` returns an id; `releaseVoice(id)` gives it back. Copies must be impossible.',
      template: `class AudioVoice {
public:
    AudioVoice() : id_{acquireVoice()} {}
    ___AudioVoice() { ___(id_); }

    AudioVoice(const AudioVoice&) = ___;
    AudioVoice& operator=(const AudioVoice&) = delete;

    int id() const { return id_; }
private:
    int id_;
};`,
      blanks: [{ answers: ['~'] }, { answers: ['releaseVoice'] }, { answers: ['delete'] }],
      wordBank: ['~', 'releaseVoice', 'delete', 'acquireVoice', 'default', 'virtual', '!'],
      explanation:
        'The destructor (`~AudioVoice`) is where the release belongs: it runs exactly once, at the end of the object\'s lifetime, on every path. Deleting the copy constructor prevents two objects from owning the same voice id — with `= default`, a copy would release the voice twice, and the second release might steal a voice now used by another sound.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'RAII in Unreal Engine',
      blocks: [
        {
          type: 'p',
          text: 'Unreal manages `UObject`s — actors, components, assets — with a [[garbage-collection|garbage collector]]. You never `delete` a `UObject`; it is reclaimed some time after nothing references it. That solves *memory* for those objects, but it does not help with anything that must be released at a **precise moment**. So Unreal code is full of RAII types:',
        },
        {
          type: 'code',
          title: 'InventoryComponent.cpp (excerpt)',
          code: `void UInventoryComponent::AddItem(const FItemData& Item) {
    FScopeLock Lock(&ItemsCriticalSection);  // locked
    Items.Add(Item);
}                                            // unlocked

void AMyCharacter::ApplyKnockback(const FVector& Impulse) {
    TGuardValue<bool> Guard(bIsInKnockback, true);
    LaunchCharacter(Impulse, true, true);
}   // bIsInKnockback restored to its previous value`,
          annotations: [
            { lines: 2, text: '`FScopeLock` is Unreal\'s `std::lock_guard`: it locks an `FCriticalSection` (Unreal\'s mutex) in its constructor and unlocks it in its destructor.' },
            { lines: 3, text: '`TArray` is itself RAII: it owns its heap buffer and frees it in its destructor, just like `std::vector`.' },
            { lines: 7, text: '`TGuardValue` sets a variable for the duration of a scope and restores the old value in its destructor — even if the code in between returns early.' },
          ],
        },
        {
          type: 'list',
          items: [
            '`FScopeLock` — mutex lock for an `FCriticalSection`.',
            '`TGuardValue` — temporarily change a value, restore it on scope exit.',
            '`TUniquePtr`, `TSharedPtr` — Unreal\'s smart pointers for non-`UObject` types ([[tuniqueptr]], [[tsharedptr]]).',
            '`TArray`, `TMap`, `FString` — containers that own their memory.',
            '`TRACE_CPUPROFILER_EVENT_SCOPE(Name)` — a macro that creates a scoped object marking a region for the profiler.',
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Releasing resources owned by actors',
          text: 'Because a `UObject`\'s destructor runs at a time chosen by the garbage collector, do not rely on it to release non-memory resources owned by an actor (an open file, a network connection, a registered callback). Release them in `EndPlay()`, which the engine calls at a well-defined moment when the actor leaves play — or wrap them in an RAII member whose lifetime you control.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why GC and RAII coexist',
          text: 'A garbage collector knows when memory is *unreachable*, but it cannot know when you are *finished* with a lock or a file handle — those must be released the instant the work is done, not whenever the next collection runs. That is why even garbage-collected engines rely on scope-based cleanup for everything that is not plain memory.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'Unreal garbage-collects `UObject`s. Why do Unreal programmers still use RAII types such as `FScopeLock` and `TGuardValue`?',
      options: [
        { text: 'The garbage collector is disabled in shipping builds, so RAII takes over', why: 'Garbage collection runs in every build configuration, including shipping.' },
        { text: 'RAII makes the garbage collector delete `UObject`s sooner', why: 'RAII is not used to manage `UObject` lifetimes at all — those belong to the garbage collector. RAII handles everything else.' },
        { text: 'GC only reclaims `UObject` memory, at a time of its choosing; locks, temporary state and other resources must be released at an exact moment', correct: true, why: 'Exactly: a lock released "at the next GC pass" would freeze other threads. Deterministic cleanup is a different job from memory reclamation.' },
        { text: 'They do not — RAII is a standard C++ idiom that Unreal code avoids', why: 'Unreal uses RAII extensively: scope locks, guard values, profiler scopes, smart pointers and all its containers.' },
      ],
      explanation:
        'Garbage collection answers "when can this memory be reused?". RAII answers "when must this resource be given back?" — and for locks, files, sockets, temporary state changes and profiler regions, the answer is "exactly at the end of this scope". Unreal uses GC for `UObject`s and RAII for everything that needs deterministic release.',
    },
  ],
  takeaways: [
    'A resource is anything acquired that must be released exactly once: memory, files, locks, sockets, GPU handles, audio voices.',
    'RAII: acquire in the constructor, release in the destructor — the object\'s lifetime is the resource\'s lifetime.',
    'Destructors of locals run on every exit from a scope — normal end, `return`, `break`, and exceptions during stack unwinding — in reverse order of construction.',
    'Standard types such as `std::vector`, `std::string`, `std::fstream` and `std::lock_guard` are RAII; prefer them to manual acquire/release pairs.',
    'RAII objects must be named variables; an unnamed temporary is destroyed at the end of its statement.',
    'Write one wrapper per resource, make destructors non-throwing, and forbid copying unless you define what a copy means.',
    'Unreal garbage-collects `UObject`s but uses RAII (`FScopeLock`, `TGuardValue`, containers, smart pointers) for everything needing deterministic release.',
  ],
  reading: [
    {
      title: 'RAII',
      url: 'https://en.cppreference.com/w/cpp/language/raii',
      source: 'cppreference',
      note: 'A concise definition with examples, and a list of standard library RAII types.',
    },
    {
      title: 'C++ Core Guidelines: Resource management',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-resource',
      source: 'core-guidelines',
      note: 'Rule R.1, "Manage resources automatically using resource handles and RAII", and the rules that follow from it.',
    },
    {
      title: 'std::lock_guard',
      url: 'https://en.cppreference.com/w/cpp/thread/lock_guard',
      source: 'cppreference',
      note: 'The simplest RAII lock; compare it with std::scoped_lock and std::unique_lock.',
    },
    {
      title: 'isocpp FAQ: Exceptions and Error Handling',
      url: 'https://isocpp.org/wiki/faq/exceptions',
      source: 'isocpp',
      note: 'Explains why destructors and RAII make exception-safe code practical.',
    },
  ],
};
