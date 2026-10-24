import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-exceptions',
  title: 'Exceptions and Stack Unwinding',
  summary: 'How throw, try and catch move an error up the call stack — and why destructors make it safe.',
  minutes: 18,
  objectives: [
    'Throw and catch exceptions, and predict exactly which statements run and which are skipped',
    'Choose a fitting type from the `std::exception` hierarchy, or derive your own',
    'Explain why you catch by `const` reference and what goes wrong when you catch by value',
    'Trace stack unwinding and explain why it makes RAII-based cleanup reliable',
    'Rethrow correctly with `throw;` and describe what happens when nothing catches an exception',
    'Describe the cost model of exceptions and why Unreal Engine turns them off',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'The problem exceptions solve',
      blocks: [
        {
          type: 'p',
          text: 'Errors are usually **detected** in one place and **handled** somewhere else entirely. The function that discovers a corrupt save file is buried five calls deep inside `readInt()`; the code that knows what to do about it (show a dialog, fall back to an older save) lives up in the menu logic. Something has to carry the bad news across every function in between.',
        },
        {
          type: 'p',
          text: 'The classic C answer is the **error code**: every function returns a status, and every caller checks it and passes it upward. That works, but it clutters every layer with plumbing, and nothing stops a caller from simply ignoring the returned value. An [[exception]] is C++\'s other answer: the function that detects the problem *throws* an object describing it, and the runtime carries that object up the [[call-stack]] to the nearest function that said it can *catch* it.',
        },
        {
          type: 'compare',
          left: {
            title: 'Error codes: every layer forwards',
            tone: 'neutral',
            code: `int loadLevel(const char* path) {
    int err = openFile(path);
    if (err != 0) return err;
    err = parseHeader();
    if (err != 0) return err;
    err = spawnActors();
    if (err != 0) return err;
    return 0;
}`,
            text: 'Explicit and cheap, but half the lines are plumbing — and forgetting one `if` silently loses the error.',
          },
          right: {
            title: 'Exceptions: only the ends care',
            tone: 'neutral',
            code: `void loadLevel(const char* path) {
    openFile(path);   // may throw
    parseHeader();    // may throw
    spawnActors();    // may throw
}
// Handled once, where it makes sense:
// try { loadLevel(p); } catch (...) {}`,
            text: 'The happy path reads cleanly, and an error cannot be accidentally ignored — but control flow is now invisible.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why C++ needed something beyond return codes',
          text: 'Some functions have **no return value to put an error in**. A [[constructor]] cannot return a status, and neither can most overloaded operators such as `a + b`. Without exceptions, a constructor that fails (cannot open the file, cannot allocate the buffer) must leave behind a half-built "zombie" object and hope the caller remembers to check an `isValid()` flag. Exceptions let a constructor refuse to create the object at all — so if you hold an object, it is fully built.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Where they came from',
          text: 'Andrew Koenig and Bjarne Stroustrup designed C++ exception handling around 1989–1990, and it was standardized with C++98. The whole [[standard-library]] reports failures this way: `std::vector::at`, `std::stoi`, `new` and many others throw.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'throw, try and catch',
      blocks: [
        {
          type: 'p',
          text: 'Three keywords do all the work. `throw expr;` creates an exception object from `expr` and abandons the current function immediately. A `try { ... }` block marks code whose exceptions you are prepared to deal with. One or more `catch (Type name) { ... }` handlers follow it; each says which exception types it accepts.',
        },
        {
          type: 'code',
          title: 'damage.cpp',
          runnable: true,
          code: `#include <iostream>
#include <stdexcept>

void applyDamage(int& health, int amount) {
    if (amount < 0) {
        throw std::invalid_argument{"damage cannot be negative"};
    }
    health -= amount;
    std::cout << "Hit for " << amount << ", health " << health << '\\n';
}

int main() {
    int health = 100;
    try {
        applyDamage(health, 30);
        applyDamage(health, -5);   // throws
        applyDamage(health, 10);   // never runs
    } catch (const std::invalid_argument& e) {
        std::cout << "Rejected: " << e.what() << '\\n';
    }
    std::cout << "Final health: " << health << '\\n';
}`,
          output: `Hit for 30, health 70
Rejected: damage cannot be negative
Final health: 70`,
          annotations: [
            { lines: 2, text: '`<stdexcept>` declares the standard exception classes such as `std::invalid_argument` and `std::runtime_error`.' },
            { lines: 6, text: 'Builds a `std::invalid_argument` object holding a message, then throws it. Lines 8–9 are skipped: `applyDamage` is abandoned on the spot, and `health` is never modified.' },
            { lines: 14, text: 'The `try` block: if anything inside throws, control jumps to a matching `catch` below instead of continuing with the next line.' },
            { lines: 17, text: 'Never executes. Once line 16 throws, the rest of the `try` block is skipped — there is no "resume where it left off".' },
            { lines: 18, text: 'The handler accepts `std::invalid_argument` (and anything derived from it). `e` refers to the thrown object.' },
            { lines: 19, text: '`what()` is a [[virtual-function]] every standard exception provides, returning the message given to the constructor.' },
            { lines: 21, text: 'After a handler finishes, execution continues normally **after the whole try/catch** — the program recovered.' },
          ],
        },
        {
          type: 'p',
          text: 'When an exception is thrown, the runtime looks at the enclosing `try` blocks from the innermost outward. For each one it tries the `catch` clauses **in order, top to bottom**, and the first whose type matches wins. A `catch (...)` clause matches anything; it must come last.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Throw objects derived from std::exception',
          text: 'C++ lets you throw any type — `throw 42;` and `throw "oops";` both compile. Don\'t. A handler for `const std::exception&` cannot catch them, they carry no `what()` message, and they surprise every reader. Throw types derived from `std::exception`, created by value right in the `throw` statement.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'There is no finally',
          text: 'Java and C# pair `try` with `finally` for cleanup code that must always run. C++ has no `finally` keyword and does not need one: cleanup belongs in [[destructor|destructors]], which run automatically whether a scope is left normally or by an exception. You will see exactly how later in this lesson.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the code so the exception is thrown and then handled.',
      template: `#include <iostream>
#include <stdexcept>

int main() {
    ___ {
        ___ std::runtime_error{"Save file corrupted"};
    } ___ (const std::runtime_error& e) {
        std::cout << e.what() << '\\n';
    }
}`,
      blanks: [{ answers: ['try'] }, { answers: ['throw'] }, { answers: ['catch'] }],
      wordBank: ['try', 'throw', 'catch', 'raise', 'except', 'finally'],
      explanation:
        '`try` opens the guarded block, `throw` launches the exception object, and `catch` declares a handler for a type. `raise` and `except` are Python\'s spellings, and `finally` exists in Java and C# but not in C++ — C++ uses destructors for guaranteed cleanup instead.',
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>
#include <stdexcept>

int loot(int roll) {
    std::cout << "A";
    if (roll > 5) throw std::runtime_error{"jackpot"};
    std::cout << "B";
    return roll;
}

int main() {
    try {
        loot(3);
        loot(9);
        std::cout << "C";
    } catch (const std::exception&) {
        std::cout << "D";
    }
    std::cout << "E\\n";
}`,
      options: [
        { text: '`ABACDE`', why: 'Once `loot(9)` throws, the rest of the `try` block — including the `"C"` line — is skipped. Execution never returns into the `try` block.' },
        { text: '`ABABDE`', why: 'The second call throws before reaching `std::cout << "B"`. A `throw` abandons the function immediately; nothing after it in that function runs.' },
        { text: '`ABADE`', correct: true, why: '`loot(3)` prints A and B; `loot(9)` prints A and throws; C is skipped; the handler prints D; then execution continues after the try/catch and prints E.' },
        { text: '`ABAD`', why: 'A handled exception does not end the program. After the `catch` block finishes, execution continues with the statement after it, so E is printed.' },
      ],
      explanation:
        'Trace the control flow: a `throw` leaves the current function at once, skips everything remaining in the `try` block, runs the first matching handler, and then resumes **after** the whole try/catch statement. Nothing between the throw point and the handler gets a chance to run — except destructors, as you will see shortly.',
    },
    {
      kind: 'concept',
      title: 'The standard exception hierarchy',
      blocks: [
        {
          type: 'p',
          text: 'The standard library\'s exceptions form a class hierarchy rooted at [[std-exception]]. Because handlers match base classes too, the hierarchy lets you catch as precisely or as broadly as you like: `catch (const std::out_of_range&)` handles one specific problem, while `catch (const std::exception&)` handles every standard exception.',
        },
        {
          type: 'table',
          headers: ['Class', 'Base', 'Meaning / typical source'],
          rows: [
            ['`std::exception`', '—', 'Root of the hierarchy (`<exception>`). Provides virtual `what()`.'],
            ['`std::logic_error`', '`exception`', 'A bug that could have been prevented: a violated precondition.'],
            ['`std::invalid_argument`', '`logic_error`', 'An argument has an unacceptable value — `std::stoi("abc")`.'],
            ['`std::out_of_range`', '`logic_error`', 'Index or value outside the valid range — `vector::at(99)`.'],
            ['`std::length_error`', '`logic_error`', 'Exceeding a maximum size — `vector::reserve` beyond `max_size()`.'],
            ['`std::runtime_error`', '`exception`', 'A problem only detectable while running: missing file, lost connection.'],
            ['`std::system_error`', '`runtime_error`', 'An operating-system failure carrying an error code (threads, files).'],
            ['`std::bad_alloc`', '`exception`', '`new` could not obtain memory (`<new>`).'],
            ['`std::bad_cast`', '`exception`', 'A [[dynamic-cast]] to a reference type failed.'],
          ],
          caption: 'Most of these live in <stdexcept>. You will meet bad_optional_access and bad_variant_access two lessons from now.',
        },
        {
          type: 'p',
          text: 'For your own errors, derive from the closest standard class. Deriving from `std::runtime_error` gives you message storage and `what()` for free, and any generic `catch (const std::exception&)` will still catch your type:',
        },
        {
          type: 'code',
          title: 'hierarchy.cpp',
          runnable: true,
          code: `#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

class SaveFileError : public std::runtime_error {
public:
    explicit SaveFileError(const std::string& msg)
        : std::runtime_error{"Save file: " + msg} {}
};

void attempt(int which) {
    std::vector<int> slots{10, 20, 30};
    try {
        if (which == 0) std::cout << slots.at(7);
        if (which == 1) std::cout << std::stoi("abc");
        if (which == 2) throw SaveFileError{"bad checksum"};
    } catch (const std::out_of_range&) {
        std::cout << "out_of_range: bad index\\n";
    } catch (const std::invalid_argument&) {
        std::cout << "invalid_argument: not a number\\n";
    } catch (const std::exception& e) {
        std::cout << "other: " << e.what() << '\\n';
    }
}

int main() {
    for (int i = 0; i < 3; ++i) attempt(i);
}`,
          output: `out_of_range: bad index
invalid_argument: not a number
other: Save file: bad checksum`,
          annotations: [
            { lines: '6-10', text: 'A custom exception. Passing the message to the `std::runtime_error` base constructor means `what()` already works — no extra code needed.' },
            { lines: 15, text: '`at()` checks the index and throws `std::out_of_range`. (The unchecked `slots[7]` would be [[undefined-behavior]] instead.)' },
            { lines: 16, text: '`std::stoi` throws `std::invalid_argument` when the text contains no number at all.' },
            { lines: '18-23', text: 'Most specific handlers first, the broad `std::exception` handler last. Unnamed handlers (line 18, 20) are fine when you don\'t need the object.' },
            { lines: 22, text: '`SaveFileError` is not caught by the first two handlers, but it *is* a `std::exception`, so this one matches.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Order handlers from specific to general',
          text: 'Handlers are tried top to bottom and the **first** match wins, not the best match. If `catch (const std::exception&)` comes first, it swallows everything and the specific handlers below it are dead code. GCC and Clang warn: *exception of type \'std::out_of_range\' will be caught by earlier handler*.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'what() text is not portable',
          text: 'The messages that library functions put into `what()` are implementation-specific: GCC\'s `std::stoi` says just `"stoi"`, other libraries say more. Use the exception\'s **type** to decide what to do, and treat `what()` as human-readable diagnostics for logs.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this fragment print?',
      code: `std::vector<int> ammo{30, 30};
try {
    ammo.at(5) = 0;
} catch (const std::logic_error&) {
    std::cout << "logic";
} catch (const std::out_of_range&) {
    std::cout << "range";
} catch (...) {
    std::cout << "unknown";
}`,
      options: [
        { text: '`range`', why: 'That would be the *most specific* match, but C++ does not search for the best handler. It takes the first one that matches.' },
        { text: '`logic`', correct: true, why: '`at(5)` throws `std::out_of_range`, which derives from `std::logic_error`. The `logic_error` handler is checked first and matches, so it wins.' },
        { text: '`unknown`', why: '`catch (...)` only runs if no earlier handler matches. Here the very first handler already matches.' },
        { text: '`logicrange`', why: 'At most one handler runs per exception. After it finishes, execution continues after the whole try/catch.' },
      ],
      explanation:
        'Handler selection is "first match, top to bottom", where a handler for a base class matches derived exceptions. Because `std::out_of_range` *is a* `std::logic_error`, the `range` handler can never run — it is dead code, and the compiler warns about it. Always order handlers from most derived to least derived.',
    },
    {
      kind: 'concept',
      title: 'Catch by const reference',
      blocks: [
        {
          type: 'p',
          text: 'The rule of thumb is **throw by value, catch by `const` reference**. The reference part matters most. A handler declared `catch (std::exception e)` takes its parameter *by value*: the thrown object is **copied** into a brand-new `std::exception`. If the thrown object was a `SaveFileError`, only its `std::exception` base part is copied — the derived part, including the overridden `what()`, is sliced away.',
        },
        {
          type: 'compare',
          left: {
            title: 'By value: sliced',
            tone: 'bad',
            code: `try {
    throw SaveFileError{"bad checksum"};
} catch (std::exception e) {
    std::cout << e.what();
    // GCC prints "std::exception"
}`,
            text: '`e` is a fresh `std::exception` copied from the base part. Virtual dispatch now finds the base `what()` — the real message is gone.',
          },
          right: {
            title: 'By const reference: intact',
            tone: 'good',
            code: `try {
    throw SaveFileError{"bad checksum"};
} catch (const std::exception& e) {
    std::cout << e.what();
    // "Save file: bad checksum"
}`,
            text: '`e` refers to the original object, so the virtual `what()` call reaches `SaveFileError`\'s version. No copy is made.',
          },
        },
        {
          type: 'p',
          text: 'This is the same [[object-slicing]] you met with inheritance: polymorphism only works through references and pointers. A by-value catch also makes an unnecessary copy. The `const` documents that the handler only reads the exception, which is almost always the case.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not throw a pointer instead?',
          text: 'Programmers coming from Java sometimes write `throw new SaveFileError{...};`. Now the handler must catch `SaveFileError*` (a `catch (const std::exception&)` won\'t match a pointer), and somebody must remember to `delete` it — on every path, including when another exception interrupts. The runtime already manages the thrown object\'s storage for you and destroys it when the last handler finishes. Throwing by value lets it do that job.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Let the compiler catch this for you',
          text: 'With `-Wall`, GCC warns *catching polymorphic type \'class std::exception\' by value* (`-Wcatch-value`). Clang has a similar warning. One more reason to always build with warnings on.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Catching with `catch (std::exception e)` still calls the derived class\'s `what()`, because `what()` is virtual.',
      answer: false,
      explanation:
        'Virtual dispatch uses the **dynamic type of the object you call it on**. Catching by value copy-constructs a new object whose dynamic type is exactly `std::exception` — the derived part never made it into the copy. Virtual functions only "see through" to the derived class when you call them via a reference or pointer to the original object, which is why you catch by `const std::exception&`.',
    },
    {
      kind: 'concept',
      title: 'Stack unwinding: destructors still run',
      blocks: [
        {
          type: 'p',
          text: 'Between the `throw` and the handler, the runtime does something crucial. Every function it abandons may own local objects — a lock, an open file, a buffer. Before leaving each [[stack-frame]], it destroys that frame\'s local objects in **reverse order of construction**, exactly as if the scope had ended normally. This is called [[stack-unwinding]]. Watch it happen:',
        },
        {
          type: 'code',
          title: 'unwinding.cpp',
          runnable: true,
          code: `#include <iostream>
#include <stdexcept>
#include <string>
#include <utility>

struct Tracer {
    std::string name;
    explicit Tracer(std::string n) : name{std::move(n)} {
        std::cout << "  acquire " << name << '\\n';
    }
    ~Tracer() { std::cout << "  release " << name << '\\n'; }
};

void loadTextures() {
    Tracer cache{"texture cache"};
    throw std::runtime_error{"GPU out of memory"};
}

void loadLevel() {
    Tracer lock{"level lock"};
    Tracer audio{"audio bank"};
    loadTextures();
    std::cout << "  level ready\\n";   // skipped
}

int main() {
    try {
        loadLevel();
    } catch (const std::exception& e) {
        std::cout << "caught: " << e.what() << '\\n';
    }
}`,
          output: `  acquire level lock
  acquire audio bank
  acquire texture cache
  release texture cache
  release audio bank
  release level lock
caught: GPU out of memory`,
          annotations: [
            { lines: '6-12', text: 'A tiny [[raii]] stand-in: the constructor "acquires" something and the destructor "releases" it, printing as it goes.' },
            { lines: 16, text: 'The throw. `loadTextures` has no handler, so its frame is unwound: `cache` is destroyed first.' },
            { lines: 22, text: '`loadLevel` has no handler either. Its locals are destroyed in reverse order — `audio`, then `lock` — and line 23 never runs.' },
            { lines: 29, text: 'Only after every abandoned frame has been cleaned up does the handler body run. By then, all resources are already released.' },
          ],
        },
        {
          type: 'memory',
          caption: 'The call stack at the moment of the throw. Unwinding destroys locals from the top frame downward until it reaches main\'s try block.',
          regions: [
            { label: 'Stack — loadTextures()', kind: 'stack', cells: [{ name: 'cache', type: 'Tracer', value: '"texture cache"', highlight: true }] },
            {
              label: 'Stack — loadLevel()',
              kind: 'stack',
              cells: [
                { name: 'audio', type: 'Tracer', value: '"audio bank"' },
                { name: 'lock', type: 'Tracer', value: '"level lock"' },
              ],
            },
            { label: 'Stack — main()', kind: 'stack', cells: [{ name: '(try block)', value: 'handler for std::exception' }] },
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'Throw', text: 'The exception object is created in special storage managed by the runtime (not in the throwing function\'s frame, which is about to disappear).' },
            { title: 'Search', text: 'The runtime walks outward through the call stack looking for a `try` block with a matching handler.' },
            { title: 'Unwind', text: 'Each frame between the throw and the handler is torn down; its local objects are destroyed in reverse order of construction.' },
            { title: 'Handle', text: 'The matching `catch` block runs, with its parameter bound to the exception object.' },
            { title: 'Clean up', text: 'When the handler finishes (without rethrowing), the exception object is destroyed and execution continues after the try/catch.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why this makes RAII the backbone of C++',
          text: 'Unwinding only runs **destructors**. Cleanup code written as ordinary statements — a `delete ptr;` or `unlock();` at the end of a function — is skipped like every other statement. That is why modern C++ wraps every resource in an object whose destructor releases it: `std::unique_ptr` for memory, `std::lock_guard` for mutexes, `std::ifstream` for files. Exceptions and RAII were designed as a pair; each makes the other work.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Raw new leaks during unwinding',
          text: 'If a function does `Enemy* e = new Enemy;` and something throws before its `delete e;`, the pointer variable is destroyed (it\'s just an address) but the `Enemy` it points to is not. That is a [[memory-leak]]. A `std::unique_ptr<Enemy>` would delete it automatically during unwinding.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: '`main` calls `outer()` inside a `try` block. Put the events in the order they happen.',
      code: `struct Guard {
    char id;
    ~Guard() { std::cout << "~" << id << '\\n'; }
};

void inner() {
    Guard b{'B'};
    throw std::runtime_error{"boom"};
}

void outer() {
    Guard a{'A'};
    inner();
    std::cout << "done\\n";
}`,
      lines: [
        'Guard A is constructed in outer()',
        'Guard B is constructed in inner()',
        'inner() throws std::runtime_error',
        'Guard B is destroyed',
        'Guard A is destroyed',
        'The catch block in main() runs',
      ],
      distractors: ['outer() prints "done"'],
      linesAreCode: false,
      explanation:
        'Objects are built in program order (A, then B). After the throw, unwinding destroys locals frame by frame from the innermost outward, so B (in `inner`) goes before A (in `outer`). The handler body runs only after unwinding reaches main\'s `try` block. The `"done"` line never runs: everything after the call to `inner()` is skipped.',
    },
    {
      kind: 'concept',
      title: 'Rethrowing and partial handling',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes a middle layer wants to *react* to an error without *resolving* it: write a log line, add context, release something — then let the error continue upward. Inside a handler, a bare `throw;` (no operand) **rethrows the exception currently being handled**: the very same object, with its full dynamic type, continues the search for a handler further out.',
        },
        {
          type: 'code',
          title: 'rethrow.cpp',
          runnable: true,
          code: `#include <iostream>
#include <stdexcept>
#include <string>

class SaveFileError : public std::runtime_error {
public:
    explicit SaveFileError(const std::string& msg)
        : std::runtime_error{msg} {}
};

void readSlot(int slot) {
    throw SaveFileError{"slot " + std::to_string(slot)
                        + " is corrupt"};
}

void loadGame(int slot) {
    try {
        readSlot(slot);
    } catch (const std::exception& e) {
        std::cout << "[log] load failed: " << e.what() << '\\n';
        throw;   // same object continues upward
    }
}

int main() {
    try {
        loadGame(2);
    } catch (const SaveFileError&) {
        std::cout << "Show 'corrupt save' dialog\\n";
    }
}`,
          output: `[log] load failed: slot 2 is corrupt
Show 'corrupt save' dialog`,
          annotations: [
            { lines: 19, text: 'The middle layer catches broadly — it only wants to log, and doesn\'t care about the exact type.' },
            { lines: 21, text: '`throw;` rethrows the original `SaveFileError`. Even though `e` is a `std::exception&`, nothing is copied or sliced.' },
            { lines: 28, text: 'Because the original type survived, main\'s specific handler still matches.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'throw e;',
            tone: 'bad',
            code: `catch (const std::exception& e) {
    log(e.what());
    throw e;   // copies a std::exception
}`,
            text: 'Throws a **new** exception, copy-initialized from the *static* type of `e` — a plain `std::exception`. The `SaveFileError` part is sliced off.',
          },
          right: {
            title: 'throw;',
            tone: 'good',
            code: `catch (const std::exception& e) {
    log(e.what());
    throw;     // rethrows the original
}`,
            text: 'Re-raises the exact same object. Its dynamic type, message and any extra data are preserved.',
          },
        },
        {
          type: 'p',
          text: 'A handler may also **translate** an error: catch a low-level exception and throw a different, higher-level one that makes sense to callers (`catch (const std::ios_base::failure&) { throw SaveFileError{"disk read failed"}; }`). That is deliberate, not slicing — you choose the new type.',
        },
        {
          type: 'deepdive',
          title: 'Carrying an exception somewhere else: std::exception_ptr',
          blocks: [
            {
              type: 'p',
              text: 'Inside a handler, `std::current_exception()` returns a `std::exception_ptr` — a smart-pointer-like handle that keeps the exception object alive. Later, possibly on another thread, `std::rethrow_exception(ptr)` throws it again. This is how `std::future` delivers an exception from a worker thread to the thread that calls `get()`, which you will see in the concurrency unit.',
            },
          ],
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'Players with a corrupt save see the *generic* error dialog instead of the "corrupt save" dialog. Tap the line responsible.',
      code: `void loadGame(int slot) {
    try {
        readSlot(slot);   // throws SaveFileError
    } catch (const std::exception& e) {
        logError(e.what());
        throw e;
    }
}

int main() {
    try {
        loadGame(2);
    } catch (const SaveFileError&) {
        showCorruptSaveDialog();
    } catch (const std::exception&) {
        showGenericErrorDialog();
    }
}`,
      bugLines: [6],
      hint: 'What type does the new exception object have?',
      explanation:
        '`throw e;` does not rethrow — it throws a **copy** of `e`, and the copy\'s type is the static type of the expression `e`, which is `std::exception`. The `SaveFileError` part is sliced away, so the specific handler in `main` no longer matches and the generic dialog appears (with the message reduced to something like `"std::exception"`). Writing `throw;` re-raises the original object unchanged.',
    },
    {
      kind: 'concept',
      title: 'Uncaught exceptions and std::terminate',
      blocks: [
        {
          type: 'p',
          text: 'If the search runs off the top of the call stack — no handler anywhere matches — the runtime calls [[std-terminate|`std::terminate()`]]. By default that calls `std::abort()`, which ends the process immediately and abnormally: no "graceful" shutdown, a crash report or core dump instead of an exit code of your choosing.',
        },
        {
          type: 'code',
          title: 'uncaught.cpp',
          code: `#include <stdexcept>

int main() {
    throw std::runtime_error{"Missing level file"};
}`,
          output: `terminate called after throwing an instance of 'std::runtime_error'
  what():  Missing level file
Aborted (core dumped)`,
          annotations: [
            { lines: 4, text: 'Nothing catches this. The output shown is what GCC\'s runtime prints to the error stream on Linux; MSVC shows an "abort() has been called" dialog in debug builds.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Destructors might not run',
          text: 'When no handler exists, the standard says it is [[implementation-defined]] whether the stack is unwound before `std::terminate` is called. Many implementations skip unwinding entirely in this case, so your destructors never run: buffered log lines are lost, temp files stay on disk, save files may be half-written.',
        },
        {
          type: 'p',
          text: 'The usual defence is a last-resort handler in `main`. It guarantees unwinding happens, logs something useful, and returns a meaningful exit code:',
        },
        {
          type: 'code',
          code: `int main() {
    try {
        runGame();
    } catch (const std::exception& e) {
        std::cerr << "Fatal: " << e.what() << '\\n';
        return 1;
    } catch (...) {
        std::cerr << "Fatal: unknown exception\\n";
        return 1;
    }
}`,
          annotations: [
            { lines: 4, text: 'Catches everything derived from `std::exception`, with a message for the log.' },
            { lines: 5, text: '`std::cerr` is the unbuffered error stream, so the message appears even if the process is about to end.' },
            { lines: 7, text: '`catch (...)` catches anything else that was thrown (an `int`, a third-party type). You can\'t inspect it, but you can still exit cleanly.' },
          ],
        },
        {
          type: 'p',
          text: 'An uncaught exception is not the only road to `std::terminate`. It is also called when an exception tries to leave a function marked `noexcept`, when a destructor throws while another exception is already unwinding the stack, and when `throw;` is executed with no exception currently being handled. The next lesson explores the `noexcept` cases in depth.',
        },
      ],
    },
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which of these situations end in a call to `std::terminate`? Select all that apply.',
      options: [
        { text: 'An exception propagates out of `main` with no matching handler', correct: true, why: 'The handler search runs out of stack frames, so the runtime calls `std::terminate`.' },
        { text: 'An exception tries to escape a function declared `noexcept`', correct: true, why: '`noexcept` is a promise; breaking it does not propagate the exception — the program is terminated.' },
        { text: 'A function throws, and `main` catches it with `catch (...)`', why: 'The exception was handled. `catch (...)` matches any type, so the program continues normally after the handler.' },
        { text: 'A destructor throws while the stack is already being unwound by another exception', correct: true, why: 'Two exceptions cannot be in flight at once from the same unwinding; C++ gives up and terminates.' },
        { text: 'A bare `throw;` runs when no exception is currently being handled', correct: true, why: 'There is nothing to rethrow, so the standard specifies a call to `std::terminate`.' },
      ],
      explanation:
        '`std::terminate` is C++\'s "cannot continue" exit: it is called whenever the exception machinery has no sensible way forward. The most common causes in real code are an exception nobody catches and an exception escaping a `noexcept` function (which includes destructors, since they are implicitly `noexcept`). A handled exception — even one caught by `catch (...)` — never terminates the program.',
    },
    {
      kind: 'concept',
      title: 'What exceptions cost',
      blocks: [
        {
          type: 'p',
          text: 'Mainstream compilers (GCC and Clang on x86-64 and ARM64, MSVC on x64) implement exceptions with a **table-based**, often called "zero-cost", model. Entering a `try` block executes no extra instructions. Instead, the compiler writes *unwind tables* into a separate section of the executable describing, for every point in every function, which destructors must run and where the handlers are.',
        },
        {
          type: 'table',
          headers: ['Path', 'Cost', 'Why'],
          rows: [
            ['Happy path (no throw)', 'Close to zero at run time', 'No checks are executed; the tables sit unused on disk and in memory.'],
            ['Throw path', 'Very expensive — typically microseconds', 'Allocate the exception, search the tables frame by frame, compare types using run-time type information, run every destructor.'],
            ['Always', 'Larger binaries', 'Unwind tables and cleanup code (landing pads) take space, and the possibility of a throw can restrict some optimizations.'],
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Exceptional means rare',
          text: 'A thrown exception can easily cost thousands of times more than returning a value. That is fine for a missing level file that happens once per session; it is not fine for "no path found" in an AI routine that runs hundreds of times per 16 ms frame. Use exceptions for **rare** failures that the current function cannot fix locally, and never as ordinary control flow. Throw time is also hard to predict, which matters in code with strict latency budgets.',
        },
        {
          type: 'deepdive',
          title: 'Under the hood: the two-phase search',
          blocks: [
            {
              type: 'p',
              text: 'On GCC and Clang (the Itanium C++ ABI), `throw` calls `__cxa_allocate_exception` to get storage for the object and then `__cxa_throw`. The unwinder runs **phase 1**, walking the stack with the unwind tables to find a frame whose handler accepts the type, without changing anything. If none is found, it calls `std::terminate` right away — which is why unwinding may not happen for uncaught exceptions. Otherwise **phase 2** walks the same frames again, this time jumping into each frame\'s cleanup code (the "landing pad") to run destructors, and finally into the handler.',
            },
            {
              type: 'p',
              text: 'Older 32-bit Windows code used a different scheme that registered handlers at run time on every `try` entry, so the happy path was *not* free. Some of the folklore about "exceptions are slow" dates from that era.',
            },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'An AI pathfinding function fails to find a route on roughly a third of its calls, and it runs many times per frame. How should it report failure?',
      options: [
        { text: 'Throw a `std::runtime_error` and catch it in the AI update loop', why: 'Failure here is an ordinary, frequent outcome. Paying the throw cost on a third of calls, many times per frame, would be a serious performance problem — and it misuses exceptions as control flow.' },
        { text: 'Return a value that can represent "no path", such as an empty path or a success flag', correct: true, why: 'A frequent, expected outcome belongs in the return value. It costs almost nothing, and callers can see in the signature that failure is possible. (The next-but-one lesson shows `std::optional` and `std::expected`, built for exactly this.)' },
        { text: 'Call `std::terminate` so the bug is noticed immediately', why: 'No route is not a bug — walls exist. Terminating the whole game for a normal situation would be absurd.' },
        { text: 'Throw an `int` error code, since it is cheaper than throwing an object', why: 'The expensive part of throwing is the stack search and unwinding, not the size of the object. Throwing an `int` is just as slow and loses the benefits of `std::exception`.' },
      ],
      explanation:
        'Exceptions are designed for failures that are **rare** and **cannot be handled where they are detected**. Their happy path is cheap precisely because the throw path is expensive. When failure is a normal, frequent result — a search that finds nothing, a ray that hits nothing — report it in the return value instead.',
    },
    {
      kind: 'concept',
      title: 'Exceptions in Unreal Engine',
      blocks: [
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Turned off by default',
          text: 'Unreal Engine compiles modules with C++ exception handling **disabled** by default — the `bEnableExceptions` setting in a module\'s `Build.cs` (`ModuleRules`) is `false`. Engine and gameplay code is written on the assumption that nothing is ever thrown through it, and even running out of memory is reported as a fatal error by the engine\'s allocator rather than as a `std::bad_alloc`.',
        },
        {
          type: 'list',
          items: [
            '**Platforms and history.** Unreal ships on many consoles and mobile platforms, and for years their toolchains had weak, slow or no exception support. One rule for every platform keeps code portable.',
            '**Size and predictability.** Disabling exceptions removes unwind tables and cleanup paths, shrinking binaries, and it removes an unpredictable-cost code path from frame-critical code.',
            '**The engine is not exception-safe.** Millions of lines of engine code were never written to survive an exception passing through them. A throw unwinding through engine frames could leave objects, the garbage collector or the renderer in a corrupt state.',
          ],
        },
        {
          type: 'p',
          text: 'Instead, Unreal code splits errors into two kinds. **Programmer errors** — broken invariants that should be impossible — use assertion macros: [[check-macro|check()]] halts with a message and call stack in development builds, while [[ensure-macro|ensure()]] reports the problem (logging a call stack and breaking into the debugger) but lets the game continue. **Expected failures** — a missing asset, a full inventory — are reported through return values: `bool`, `nullptr`, `TOptional` or `TValueOrError`.',
        },
        {
          type: 'code',
          title: 'WeaponComponent.cpp',
          code: `bool UWeaponComponent::Fire() {
    if (!ensureMsgf(ProjectileClass, TEXT("%s has no ProjectileClass"),
                    *GetName())) {
        return false;   // misconfigured asset: report and bail
    }
    check(AmmoInClip >= 0);   // can never be negative if our code is right
    if (AmmoInClip == 0) {
        return false;   // normal gameplay outcome, not an error
    }
    --AmmoInClip;
    SpawnProjectile();
    return true;
}`,
          annotations: [
            { lines: '2-5', text: '`ensureMsgf` evaluates the condition; if it is false it logs the message with a call stack (once per call site by default) and returns false, so we can recover gracefully.' },
            { lines: 6, text: '`check` is for things that must never happen. In development builds a failure stops the program right there with a clear report; in Shipping builds it is compiled out.' },
            { lines: '7-9', text: 'An empty clip is a normal result, reported through the `bool` return value — exactly the "rare vs. expected" split you just learned.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Using a library that throws',
          text: 'If you integrate a third-party library that throws, keep it in its own module with `bEnableExceptions = true`, catch everything at that module\'s boundary, and convert the result into return values before it reaches engine code. The assertion macros themselves are covered in depth in the Unreal course.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'In an Unreal gameplay component, a designer forgot to assign a required sound asset. What is the idiomatic way to handle it?',
      options: [
        { text: '`throw std::runtime_error{"Missing sound"};` and catch it in the game mode', why: 'Exceptions are disabled in Unreal modules by default, and engine code is not written to have exceptions pass through it.' },
        { text: 'Report it with `ensureMsgf` (or a log message) and return early, so the game keeps running', correct: true, why: 'A misconfigured asset is a real problem worth reporting loudly, but not one that should crash a play session. `ensure` logs a call stack and lets you recover.' },
        { text: 'Wrap the function body in `try { ... } catch (...) {}` to be safe', why: 'With exceptions disabled there is nothing to catch, and silently swallowing every error hides problems rather than reporting them.' },
        { text: 'Call `std::terminate()` so the designer notices', why: 'Killing the editor or game for a data mistake is far too harsh; Unreal reserves hard stops (`check`) for violated invariants in the code itself.' },
      ],
      explanation:
        'Unreal replaces exceptions with two tools: assertions for things that must never happen (`check`) or should not happen but are survivable (`ensure`), and return values for expected outcomes. Missing designer data is "should not happen, but survivable", so `ensureMsgf` plus an early return is the idiom. The same thinking applies in standard C++: match the mechanism to how rare and how recoverable the failure is.',
    },
  ],
  takeaways: [
    '`throw` abandons the current function; the runtime finds the nearest matching `catch`, and execution continues after that try/catch — never back at the throw point.',
    'Handlers are tried top to bottom and the first match wins, so order them from most derived to most general (`std::exception` last).',
    'Throw by value, catch by `const` reference: catching by value slices derived exceptions and loses their `what()`.',
    'Stack unwinding destroys every local object in each abandoned frame in reverse order — cleanup in destructors (RAII) always runs; cleanup written as plain statements does not.',
    'Use `throw;` to rethrow the original exception; `throw e;` throws a sliced copy.',
    'An exception nobody catches calls `std::terminate`, and destructors may not run; a last-resort handler in `main` prevents that.',
    'Exceptions make the happy path nearly free and the throw path expensive — use them for rare failures, not for frequent outcomes or control flow.',
    'Unreal disables exceptions by default and uses `check`/`ensure` for bugs and return values for expected failures.',
  ],
  reading: [
    {
      title: 'Exceptions',
      url: 'https://en.cppreference.com/w/cpp/language/exceptions',
      source: 'cppreference',
      note: 'The language rules for throw, try and catch, including how handlers are matched.',
    },
    {
      title: 'std::exception',
      url: 'https://en.cppreference.com/w/cpp/error/exception',
      source: 'cppreference',
      note: 'The full standard exception hierarchy with every derived class listed.',
    },
    {
      title: 'C++ Core Guidelines — E: Error handling',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-errors',
      source: 'core-guidelines',
      note: 'Rules such as "throw by value, catch by reference" and "use exceptions for error handling only", with rationale.',
    },
    {
      title: 'isocpp FAQ — Exceptions and Error Handling',
      url: 'https://isocpp.org/wiki/faq/exceptions',
      source: 'isocpp',
      note: 'Answers to the classic questions: why not error codes, what about constructors, and how much they really cost.',
    },
    {
      title: 'Basic exception handling',
      url: 'https://www.learncpp.com/cpp-tutorial/basic-exception-handling/',
      source: 'learncpp',
      note: 'A gentle walkthrough with more small exercises on throw, try and catch.',
    },
  ],
};
