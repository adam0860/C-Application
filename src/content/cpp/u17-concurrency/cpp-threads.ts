import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-threads',
  title: 'Threads and std::jthread',
  summary:
    'Why modern games run on many cores, how to start and finish threads safely, and how std::jthread cleans up after itself.',
  minutes: 18,
  objectives: [
    'Explain why modern software — and games in particular — uses multiple threads',
    'Start a `std::thread` and choose correctly between `join` and `detach`',
    'Explain why destroying a joinable `std::thread` calls `std::terminate`',
    'Use `std::jthread` for automatic joining and `std::stop_token` for cooperative cancellation',
    'Pass arguments to threads correctly, using `std::ref` when a reference is intended',
    'Describe how game engines divide work between the game thread, render thread and workers',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Why concurrency? The free lunch is over',
      blocks: [
        {
          type: 'p',
          text: 'For decades, programs got faster every year without any changes: each new CPU ran at a higher clock speed. Around 2005 that stopped. Higher clock speeds meant more power and more heat than chips could dissipate, so manufacturers started putting **more cores** on each chip instead. A typical gaming PC today has 8–16 cores; PlayStation 5 and Xbox Series X|S have 8.',
        },
        {
          type: 'p',
          text: 'Extra cores only help if your program gives them work. A single-threaded game uses one core and leaves the rest idle — no matter how fast the machine. To use the hardware you need **concurrency**: several [[thread|threads]] of execution making progress at the same time.',
        },
        {
          type: 'definition',
          term: 'Thread',
          text: 'An independent sequence of instructions that the operating system schedules onto a CPU core. All threads of a process **share** its memory (globals and the heap), but each has its **own** stack and registers.',
        },
        {
          type: 'memory',
          caption: 'One process, two threads: shared heap and globals, private stacks',
          regions: [
            {
              label: 'Globals — shared by all threads',
              kind: 'static',
              cells: [{ name: 'gHighScore', value: '9001', type: 'int' }],
            },
            {
              label: 'Heap — shared by all threads',
              kind: 'heap',
              cells: [{ value: '[Goblin, Orc, Troll]', type: 'Enemy[3]', id: 'enemies' }],
            },
            {
              label: 'Stack — main thread',
              kind: 'stack',
              cells: [
                { name: 'wave', value: '3', type: 'int' },
                { name: 'enemies', value: '→ heap', type: 'std::vector<Enemy>', pointsTo: 'enemies' },
              ],
            },
            {
              label: 'Stack — worker thread',
              kind: 'stack',
              cells: [
                { name: 'i', value: '1', type: 'std::size_t' },
                { name: 'target', value: '→ heap', type: 'Enemy*', pointsTo: 'enemies', highlight: true },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why threads instead of separate programs?',
          text: 'Separate processes cannot see each other\'s memory, so they must copy data back and forth through the operating system. Threads share an address space: the worker above reads the very same `Enemy` objects as the main thread, with no copying. That makes communication fast — and it is also the source of every danger in this unit, because two threads touching the same data at the same time can corrupt it.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'C++ only learned about threads in 2011',
          text: 'Before C++11 the standard did not acknowledge threads at all. You used platform APIs (POSIX threads, Win32) and hoped the compiler would not reorder your code in harmful ways. C++11 added `std::thread`, mutexes, atomics and — crucially — a formal memory model defining what multithreaded programs mean. C++20 added `std::jthread`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Your first std::thread',
      blocks: [
        {
          type: 'p',
          text: 'Include `<thread>`, then construct a `std::thread` with something callable: a function, a [[lambda]] or a function object. The new thread starts running **immediately**, in parallel with the code that created it.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <thread>

void loadLevel() {
    std::cout << "Loading level assets...\\n";
}

int main() {
    std::thread loader{loadLevel};
    loader.join();
    std::cout << "Level ready\\n";
}`,
          output: 'Loading level assets...\nLevel ready',
          annotations: [
            { lines: 4, text: 'The function the new thread will run. When it returns, the thread of execution ends.' },
            { lines: 9, text: 'Creates an OS thread and starts `loadLevel` on it. From this moment two threads are running: `main` and `loader`. Note that we pass `loadLevel` (the function itself), not `loadLevel()` (the result of calling it).' },
            { lines: 10, text: '`join()` makes `main` **wait** until `loadLevel` has finished. That is why the output order is guaranteed here.' },
            { lines: 11, text: 'Runs only after the loader thread has completed — this program\'s output is deterministic.' },
          ],
        },
        {
          type: 'p',
          text: 'A lambda is often more convenient, especially for short jobs:',
        },
        {
          type: 'code',
          code: `std::thread music{[] {
    std::cout << "Playing soundtrack\\n";
}};
music.join();`,
          annotations: [
            { lines: '1-3', text: 'The braces of `std::thread music{...}` contain a lambda. The double closing `}}` — one for the lambda body, one for the initializer — looks odd at first but is normal.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'The object is not the thread',
          text: 'A `std::thread` *object* is a handle that owns an operating-system thread of execution. The object lives on `main`\'s stack like any other variable; the thread it controls runs independently. Like a `std::unique_ptr`, a `std::thread` can be moved but not copied — exactly one handle owns each running thread.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Compiling threaded code',
          text: 'With GCC and Clang on Linux, pass `-pthread` when compiling and linking: `g++ -std=c++20 -pthread game.cpp`. Recent glibc versions no longer strictly need it for linking, but it remains the portable, correct flag. MSVC needs nothing extra.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>
#include <thread>

int main() {
    int result = 0;
    std::thread worker{[&result] { result = 42; }};
    worker.join();
    std::cout << result << '\\n';
}`,
      options: [
        {
          text: '`0`, because the thread modifies a copy of `result`',
          why: 'The lambda captures `result` by reference (`&result`), so it writes to `main`\'s variable, not a copy.',
        },
        {
          text: '`42`',
          correct: true,
          why: 'The thread writes 42 through the reference, and `join()` guarantees the write is complete — and visible to `main` — before the print.',
        },
        {
          text: 'Either `0` or `42`, depending on timing',
          why: 'That would be true without `join()` — and it would be a data race. `join()` removes all uncertainty: `main` cannot continue until the worker is done.',
        },
        {
          text: 'It does not compile: lambdas cannot be passed to `std::thread`',
          why: '`std::thread` accepts any callable, and lambdas are the most common choice.',
        },
      ],
      explanation:
        '`join()` is more than "wait". It is a **synchronization point**: everything the joined thread did is guaranteed to be visible to the joining thread afterwards. This is why reading `result` after `join()` is safe and deterministic, while reading it before `join()` would be a data race (undefined behavior).',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'join or detach — and the std::terminate trap',
      blocks: [
        {
          type: 'p',
          text: 'Every `std::thread` that started a thread must be dealt with before the object is destroyed, in one of two ways:',
        },
        {
          type: 'compare',
          left: {
            title: 'join()',
            tone: 'good',
            code: `std::thread loader{loadLevel};
// ... do other work ...
loader.join();   // wait for it`,
            text: 'Wait for the thread to finish. Afterwards its work is complete and visible. This is what you want almost always.',
          },
          right: {
            title: 'detach()',
            tone: 'neutral',
            code: `std::thread logger{flushLogs};
logger.detach(); // let it go`,
            text: 'Let the thread run on its own. You can never join it, ask whether it finished, or get a result back.',
          },
        },
        {
          type: 'p',
          text: 'If you do **neither**, the `std::thread` destructor finds a thread that is still *joinable* and calls [[std-terminate|std::terminate]], which kills the whole program on the spot:',
        },
        {
          type: 'code',
          code: `void startMusic() {
    std::thread music{playSoundtrack};
}   // ~thread() on a joinable thread -> std::terminate()

void loadAll() {
    std::thread loader{loadTextures};
    parseConfig();      // if this throws...
    loader.join();      // ...this never runs -> std::terminate()
}`,
          annotations: [
            { lines: '1-3', text: 'The obvious mistake: `music` goes out of scope while still owning a running thread.' },
            { lines: '5-9', text: 'The subtle one: an [[exception]] from `parseConfig` unwinds the stack, destroying `loader` before `join()` is reached. Correct code needs `join()` on every path — a perfect job for [[raii|RAII]], as you will see with `std::jthread`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why terminate instead of joining or detaching automatically?',
          text: 'Early C++11 drafts detached in the destructor. That was changed after it became clear both automatic choices are dangerous. **Auto-detach** leaves a thread running with references to local variables that have just been destroyed — silent use-after-free. **Auto-join** can hang the program on an exception path, waiting for a thread that may itself be waiting for something that will never come. Terminating is loud and immediate, which forces programmers to decide explicitly.',
        },
        {
          type: 'table',
          headers: ['State of the std::thread object', '`joinable()`'],
          rows: [
            ['Default-constructed: `std::thread t;`', '`false`'],
            ['Constructed with a function (running or finished)', '`true`'],
            ['After `join()` or `detach()`', '`false`'],
            ['Moved from (ownership transferred elsewhere)', '`false`'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Detached threads outlive your assumptions',
          text: 'When `main` returns, static objects are destroyed and the process exits — while detached threads may still be running and using them, which is undefined behavior. Detached threads are also killed abruptly at exit, so their pending work (like a half-written save file) may be lost. Reserve `detach()` for genuinely fire-and-forget work that touches no local or shortly-lived data.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'bug',
      prompt: 'This function bakes lighting for four map chunks in parallel. It works in testing but crashes every time with "terminate called without an active exception". Tap the buggy line.',
      code: `#include <thread>
#include <vector>

void bakeLighting(int chunk);

void bakeAll() {
    std::vector<std::thread> workers;
    for (int c = 0; c < 4; ++c) {
        workers.emplace_back(bakeLighting, c);
    }
    for (int c = 0; c < 3; ++c) {
        workers[c].join();
    }
}`,
      bugLines: [11],
      hint: 'Count the threads that are started and the threads that are joined.',
      explanation:
        'Four threads are started but the second loop joins only three (`c < 3`). When `bakeAll` returns, the vector destroys its elements, and the fourth `std::thread` is still joinable, so its destructor calls `std::terminate`. Joining with `for (std::thread& t : workers) t.join();` removes the off-by-one risk entirely — and using `std::vector<std::jthread>` would make the join automatic.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'std::jthread: the thread that cleans up after itself',
      blocks: [
        {
          type: 'p',
          text: 'C++20 added [[jthread|std::jthread]] ("joining thread"). It behaves like `std::thread` with two improvements: its destructor **joins automatically**, and it supports **cooperative cancellation** through a [[stop-token|std::stop_token]].',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <chrono>
#include <iostream>
#include <stop_token>
#include <thread>

void autosaveLoop(std::stop_token stop) {
    while (!stop.stop_requested()) {
        // pretend to write a save file every 10 ms
        std::this_thread::sleep_for(std::chrono::milliseconds{10});
    }
    std::cout << "Autosave: stop requested, shutting down\\n";
}

int main() {
    {
        std::jthread autosave{autosaveLoop};
        std::this_thread::sleep_for(std::chrono::milliseconds{50});
    }   // ~jthread: request_stop(), then join()
    std::cout << "Main: autosave thread finished\\n";
}`,
          output: 'Autosave: stop requested, shutting down\nMain: autosave thread finished',
          annotations: [
            { lines: 6, text: 'If the function\'s first parameter is a `std::stop_token`, `std::jthread` passes one in automatically. You do not supply it at the call site.' },
            { lines: 7, text: 'The thread checks the token regularly and exits its loop when asked. Nothing forces it to stop — that is what *cooperative* means.' },
            { lines: 16, text: 'Starts the thread, exactly like `std::thread`.' },
            { lines: 18, text: 'The destructor first calls `request_stop()`, then `join()`. You could also call `autosave.request_stop()` yourself at any time.' },
            { lines: 19, text: 'Guaranteed to print second: the worker\'s message was written before the join completed.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why can\'t you just kill a thread?',
          text: 'A thread killed at an arbitrary instruction might be holding a lock (deadlocking everyone else), be halfway through updating an object (leaving it corrupt), or own memory that is never freed. C++ deliberately provides no "kill thread" function. Instead, the owner *requests* a stop and the thread finishes at a point where its data is consistent.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Prefer std::jthread by default',
          text: 'Because its destructor joins, a `std::jthread` is RAII applied to threads: no forgotten joins, no `std::terminate` on exception paths. Use it whenever your standard library supports it (GCC 10+, MSVC 2019 16.10+; Apple\'s libc++ added it later than the others).',
        },
        {
          type: 'deepdive',
          title: 'stop_source, stop_token and stop_callback',
          blocks: [
            {
              type: 'p',
              text: 'Each `std::jthread` owns a `std::stop_source`; `get_stop_token()` hands out tokens observing it, and `request_stop()` flips its flag once (later calls do nothing). A `std::stop_callback` registers a function to run when stop is requested — useful to wake a thread that is blocked waiting on something, since a sleeping thread cannot check its token. C++20\'s `std::condition_variable_any` can also wait with a stop token, waking up automatically on a stop request.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'mcq',
      prompt: 'A `std::jthread` running an infinite `while (!token.stop_requested())` loop goes out of scope. What happens?',
      options: [
        {
          text: 'The program calls `std::terminate`, because the thread is still running',
          why: 'That is `std::thread`\'s behavior. Avoiding it is the main reason `std::jthread` exists.',
        },
        {
          text: 'The thread is detached and keeps running in the background',
          why: '`std::jthread` never detaches on its own; it waits for the thread.',
        },
        {
          text: 'The destructor requests a stop, then joins, so the loop ends and the thread finishes cleanly',
          correct: true,
          why: 'The loop sees `stop_requested()` become true, exits, and the destructor\'s `join()` returns.',
        },
        {
          text: 'The thread is forcibly killed wherever it currently is',
          why: 'C++ has no forcible kill. If the loop never checked the token, the destructor would wait forever.',
        },
      ],
      explanation:
        '`~jthread()` does `if (joinable()) { request_stop(); join(); }`. That combination is safe *only because* the thread cooperates. If the function ignored its stop token, the join would block forever — so long-running `std::jthread` work should always check its token.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'truefalse',
      prompt: 'Calling `request_stop()` on a `std::jthread` immediately halts the thread, even in the middle of a function.',
      answer: false,
      explanation:
        '`request_stop()` only sets a flag that the thread\'s `std::stop_token` reports. The thread keeps running until its own code checks `stop_requested()` and decides to return. This cooperative design guarantees the thread stops at a point where it has released its locks and left its data consistent.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Passing arguments: copies by default, std::ref when you mean it',
      blocks: [
        {
          type: 'p',
          text: 'Extra constructor arguments are forwarded to the thread\'s function — but not directly. `std::thread` (and `std::jthread`) first **copies** every argument into storage owned by the new thread, then passes those copies to the function. This protects you from the most common lifetime bug: the caller\'s variables may be gone by the time the thread uses them.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <thread>

void healParty(int& partyHp, int amount) {
    partyHp += amount;
}

void announce(const std::string& message) {
    std::cout << message << '\\n';
}

int main() {
    int partyHp = 250;
    std::thread healer{healParty, std::ref(partyHp), 50};
    healer.join();

    std::thread herald{announce, "Party healed!"};
    herald.join();

    std::cout << "Party HP: " << partyHp << '\\n';
}`,
          output: 'Party healed!\nParty HP: 300',
          annotations: [
            { lines: 5, text: 'The function wants a **reference** so it can modify the caller\'s variable.' },
            { lines: 15, text: '`std::ref(partyHp)` wraps a reference so it survives the copying step. Without it, `std::thread{healParty, partyHp, 50}` does not even compile: the thread\'s internal copy cannot bind to a non-const `int&`.' },
            { lines: 18, text: 'Plain values like `50` and the string literal are copied, which is exactly right. A literal has static storage, so its pointer stays valid.' },
            { lines: 21, text: 'Safe because `healer.join()` happened first — the modification is complete and visible.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why copy by default?',
          text: 'Copying is the safe default for code that runs at an unknown later time. If references were passed silently, then `std::thread t{work, localVector}; t.detach();` would leave the thread pointing at a vector destroyed when the function returns. Requiring `std::ref` makes sharing visible in the code — a signal to reviewers that the referenced object must outlive the thread.',
        },
        {
          type: 'list',
          items: [
            '**Move-only arguments** such as `std::unique_ptr` must be moved in: `std::jthread t{process, std::move(levelData)};`.',
            '**`std::cref(x)`** passes a const reference, for large read-only data you do not want copied.',
            '**Lambdas** follow their capture list instead: `[=]` copies, `[&]` references — the same lifetime rules apply.',
          ],
        },
        {
          type: 'deepdive',
          title: 'A classic trap: char buffers and std::string parameters',
          blocks: [
            {
              type: 'code',
              code: `void saveTo(const std::string& path);

void quickSave(int slot) {
    char path[64];
    std::snprintf(path, sizeof path, "save_%d.dat", slot);
    std::thread t{saveTo, path};   // copies the char* only!
    t.detach();
}   // path destroyed; the thread may not have read it yet`,
              annotations: [
                { lines: 6, text: 'The array decays to a `char*`, and only the **pointer** is copied. The conversion to `std::string` happens later, inside the new thread — by which time `path` may no longer exist. Fix: `std::thread t{saveTo, std::string{path}};`.' },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'fill',
      prompt: 'Complete the code so the worker adds loot to `main`\'s own inventory, and `main` only prints after the worker is finished.',
      template: `void addLoot(std::vector<int>& inventory, int count);

int main() {
    std::vector<int> inventory;
    std::thread looter{addLoot, ___(inventory), 3};
    looter.___();
    std::cout << inventory.size() << '\\n';
}`,
      blanks: [{ answers: ['std::ref'] }, { answers: ['join'] }],
      wordBank: ['std::ref', 'std::cref', 'std::move', 'join', 'detach', 'wait'],
      explanation:
        '`std::ref` passes a real reference through the thread\'s argument copying; `std::cref` would give a `const` reference that cannot bind to `std::vector<int>&`, and `std::move` would hand the thread its own vector, leaving `main`\'s empty. `join()` waits for the worker and makes its changes visible, so reading `inventory.size()` afterwards is safe. With `detach()`, `main` would read the vector while the worker might still be writing it — a data race. `std::thread` has no `wait()` member.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'How many threads? Splitting work across cores',
      blocks: [
        {
          type: 'p',
          text: '`std::thread::hardware_concurrency()` reports how many threads the hardware can truly run at once — usually the number of logical cores. It may return `0` if it cannot tell. Here we split a big damage tally across that many workers:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <numeric>
#include <thread>
#include <vector>

int main() {
    const std::vector<int> hits(1'000'000, 3);   // a million hits of 3
    const unsigned hw = std::thread::hardware_concurrency();
    const unsigned workers = (hw == 0) ? 2 : hw;  // 0 means "unknown"

    std::vector<long long> partial(workers, 0);
    std::vector<std::thread> pool;
    const std::size_t chunk = hits.size() / workers;

    for (unsigned w = 0; w < workers; ++w) {
        const std::size_t first = w * chunk;
        const std::size_t last =
            (w == workers - 1) ? hits.size() : first + chunk;
        pool.emplace_back([&hits, &partial, w, first, last] {
            partial[w] = std::accumulate(hits.begin() + first,
                                         hits.begin() + last, 0LL);
        });
    }
    for (std::thread& t : pool) {
        t.join();
    }

    const long long total =
        std::accumulate(partial.begin(), partial.end(), 0LL);
    std::cout << "Total damage: " << total << '\\n';
}`,
          output: 'Total damage: 3000000',
          annotations: [
            { lines: 9, text: 'Always handle the `0` case; the standard only calls the value a *hint*.' },
            { lines: 11, text: 'One result slot per worker. Each thread writes **only its own element**, so no two threads ever write the same memory — no synchronization needed.' },
            { lines: '17-18', text: 'The last worker also takes the remainder when the size does not divide evenly.' },
            { lines: 19, text: 'Capture the shared vectors by reference, but the per-worker values `w`, `first` and `last` **by value** — the loop variables change on the next iteration.' },
            { lines: '24-26', text: 'Join all workers before reading `partial`. After the joins, every slot is complete and visible.' },
            { lines: 30, text: 'The result is the same on a 2-core laptop and a 32-core workstation: only the speed differs.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'More threads is not always faster',
          text: 'Creating a thread is expensive — tens of microseconds and a stack reservation that is often 1 MB or more — so spawning threads for tiny jobs costs more than it saves. Running more busy threads than cores (**oversubscription**) forces the OS to switch between them constantly, and each switch costs time and cache warmth. That is why real engines create a fixed pool of worker threads once and feed it small *tasks*, rather than creating threads on demand.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'False sharing',
          text: 'Neighbouring `partial[w]` slots sit in the same 64-byte cache line. If each thread updated its slot *repeatedly*, the cores would fight over that line and run slower than a single thread. This code avoids it by summing into a local value and writing the slot once. Keep frequently written per-thread data apart, or accumulate locally.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: '`hardware_concurrency()` returns 8 on a player\'s PC. To speed up CPU-heavy pathfinding, a teammate spawns **64** threads, each computing paths flat out. What is the most likely result compared with using 8 threads?',
      options: [
        {
          text: 'About 8× faster, because there are 8× more threads',
          why: 'Only 8 threads can execute at any instant. The other 56 wait their turn; adding them adds no computing power.',
        },
        {
          text: 'No faster, and probably slower: the OS must constantly switch between threads, wasting time and thrashing caches',
          correct: true,
          why: 'This is oversubscription. Context switches and cache misses are pure overhead on top of the same amount of real work.',
        },
        {
          text: 'The program fails because the OS allows only one thread per core',
          why: 'Operating systems happily run thousands of threads; they time-slice them across the available cores.',
        },
        {
          text: 'Exactly the same speed, since the OS automatically merges extra threads',
          why: 'The OS never merges threads. Each one is scheduled separately, and each switch has a cost.',
        },
      ],
      explanation:
        'For CPU-bound work, the useful number of busy threads is roughly the number of hardware threads. More threads only help when many of them spend time *waiting* (for disk or network), leaving cores idle. This is exactly why engines size their worker pools from the core count.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Threads in game engines',
      blocks: [
        {
          type: 'p',
          text: 'At 60 frames per second a game has 16.6 milliseconds to simulate the world, animate characters, run physics, prepare rendering and mix audio. No single core can do all that for a modern game, so engines split the work across specialised threads plus a pool of general workers.',
        },
        {
          type: 'table',
          headers: ['Thread', 'Job in Unreal Engine'],
          rows: [
            ['**[[game-thread|Game thread]]**', 'Gameplay logic: actors, components, `Tick`, Blueprints, UObjects. The "main thread" of the game.'],
            ['**Render thread**', 'Turns the game thread\'s scene description into rendering commands, typically one frame behind.'],
            ['**RHI thread**', 'Submits those commands to the graphics API (DirectX, Vulkan, Metal).'],
            ['**Audio thread**', 'Mixes and processes sound.'],
            ['**Worker threads**', 'Run small tasks from the [[task-graph]]: animation, physics, particle simulation, asset loading and more.'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does rendering lag a frame behind?',
          text: 'It is a **pipeline**. While the render thread draws frame N, the game thread is already simulating frame N+1. Both run in parallel on different cores, almost doubling throughput — at the cost of one extra frame of latency. The same idea as an assembly line: each station works on a different car at the same time.',
        },
        {
          type: 'code',
          title: 'CrowdSubsystem.cpp',
          code: `#include "Async/ParallelFor.h"

void UCrowdSubsystem::UpdateAgents(float DeltaTime) {
    check(IsInGameThread());
    ParallelFor(Agents.Num(), [this, DeltaTime](int32 Index) {
        // Each iteration touches only its own agent's plain data
        FCrowdAgent& Agent = Agents[Index];
        Agent.Position += Agent.Velocity * DeltaTime;
    });
}`,
          annotations: [
            { lines: 4, text: 'Unreal\'s `check` asserts we were called on the game thread.' },
            { lines: 5, text: '`ParallelFor` splits the index range across worker threads and returns when every iteration is done — the same idea as our damage-tally example, without managing threads yourself.' },
            { lines: '7-8', text: 'Safe because each index touches a different element of a plain struct array, just like `partial[w]`. Touching UObjects or spawning actors here would not be safe — more on that rule in the last lesson of this unit.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'You rarely create raw threads in Unreal',
          text: 'Unreal code almost never constructs `std::thread`. Instead you hand work to the engine\'s task systems (`ParallelFor`, `AsyncTask`, `UE::Tasks`), which run it on the existing worker pool, sized to the machine\'s cores. For long-running background jobs there is `FRunnable` with `FRunnableThread`. The concepts in this unit — shared memory, joining, races — apply to all of them.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'Why does Unreal\'s render thread typically work on the frame *before* the one the game thread is simulating?',
      options: [
        {
          text: 'So the game thread and render thread can work at the same time on different frames, like stations on an assembly line',
          correct: true,
          why: 'Pipelining lets both threads stay busy in parallel, at the cost of one frame of latency.',
        },
        {
          text: 'Because the GPU can only accept commands from the previous frame',
          why: 'GPUs accept commands whenever they arrive. The one-frame offset is a CPU-side design choice.',
        },
        {
          text: 'To give the garbage collector time to free last frame\'s objects',
          why: 'Garbage collection is unrelated to the render pipeline\'s frame offset.',
        },
        {
          text: 'Because the render thread runs at a lower priority and always falls behind',
          why: 'The offset is deliberate and fixed, not the result of falling behind. If either thread falls further behind, the other waits.',
        },
      ],
      explanation:
        'If the game thread had to wait for rendering to finish each frame (and vice versa), only one of them would ever be working. By letting the render thread process frame N while the game thread produces frame N+1, the engine overlaps the two stages. The engine synchronizes them so neither gets more than about a frame ahead.',
    },
  ],
  takeaways: [
    'CPUs gain cores rather than clock speed; using them requires multiple threads.',
    'Threads share globals and the heap but have private stacks — sharing makes communication cheap and dangerous.',
    '`std::thread` starts running immediately; `join()` waits and makes the thread\'s work visible.',
    'Destroying a joinable `std::thread` calls `std::terminate`; every path, including exceptions, must join or detach.',
    '`std::jthread` (C++20) joins in its destructor and supports cooperative cancellation via `std::stop_token`.',
    'Thread arguments are copied; use `std::ref` / `std::cref` for references and `std::move` for move-only types — and keep referenced objects alive.',
    'Match busy threads to `hardware_concurrency()`; engines use fixed worker pools and task systems rather than ad-hoc threads.',
  ],
  reading: [
    {
      title: 'std::thread',
      url: 'https://en.cppreference.com/w/cpp/thread/thread',
      source: 'cppreference',
      note: 'Constructor semantics, joinable state and the destructor\'s terminate rule.',
    },
    {
      title: 'std::jthread',
      url: 'https://en.cppreference.com/w/cpp/thread/jthread',
      source: 'cppreference',
      note: 'The C++20 joining thread, including stop tokens and an example.',
    },
    {
      title: 'C++ Concurrency in Action, Second Edition',
      url: 'https://www.manning.com/books/c-plus-plus-concurrency-in-action-second-edition',
      source: 'book',
      note: 'Anthony Williams\'s definitive book on standard C++ concurrency; chapter 2 covers managing threads.',
    },
    {
      title: 'C++ Core Guidelines: Concurrency and parallelism',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-concurrency',
      source: 'core-guidelines',
      note: 'Rules such as "prefer joining threads" and "don\'t detach a thread" with rationale.',
    },
  ],
};
