import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-atomics-async',
  title: 'Atomics, Futures and std::async',
  summary:
    'Lock-free counters and flags with std::atomic, a short tour of memory ordering, and task-based concurrency with futures — plus Unreal\'s game-thread rule.',
  minutes: 20,
  objectives: [
    'Use `std::atomic` for counters and flags with `load`, `store`, `fetch_add` and `compare_exchange`',
    'Decide when an atomic is enough and when you need a mutex',
    'Explain sequentially consistent, acquire/release and relaxed memory ordering at a high level',
    'Run work with `std::async`, collect results and exceptions with `std::future`, and choose launch policies deliberately',
    'Hand a result from one thread to another with `std::promise`',
    'Apply Unreal\'s rule that UObjects are only touched on the game thread, using `AsyncTask` to hop back',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'std::atomic: operations that cannot be split',
      blocks: [
        {
          type: 'p',
          text: 'In the previous lesson `++kills` lost updates because it is really three steps — load, add, store — and another thread could slip in between. A mutex fixed it by making the threads take turns. For a single variable there is a lighter tool: [[atomic|std::atomic]].',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <atomic>
#include <iostream>
#include <thread>

std::atomic<int> kills{0};

void hunt() {
    for (int i = 0; i < 100000; ++i) {
        ++kills;                    // one indivisible operation
    }
}

int main() {
    std::thread a{hunt};
    std::thread b{hunt};
    a.join();
    b.join();
    std::cout << "Kills: " << kills.load() << '\\n';
}`,
          output: 'Kills: 200000',
          annotations: [
            { lines: 5, text: 'An atomic `int`. Every operation on it happens as one indivisible step: no other thread can ever observe it half-done.' },
            { lines: 9, text: 'On x86-64, GCC compiles this to a single `lock add` instruction (or `lock xadd` when the old value is needed): the CPU itself performs load-add-store as one unit. No mutex, and no thread ever goes to sleep.' },
            { lines: 18, text: '`load()` reads the value atomically. (Writing just `kills` also works — it converts implicitly — but `load()` makes the atomic read visible in the code.)' },
          ],
        },
        {
          type: 'table',
          headers: ['Operation', 'What it does atomically'],
          rows: [
            ['`x.load()` / `x.store(v)`', 'Read / write the value'],
            ['`x.exchange(v)`', 'Write `v` and return the previous value'],
            ['`x.fetch_add(n)` / `x.fetch_sub(n)`', 'Add / subtract and return the **previous** value (integers and pointers)'],
            ['`++x`, `x--`, `x += n`', 'Shorthand for the fetch operations'],
            ['`x.compare_exchange_weak(expected, desired)`', 'If `x == expected`, set it to `desired` and return `true`; otherwise copy the current value into `expected` and return `false`'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why are atomics cheaper than a mutex?',
          text: 'Modern CPUs provide instructions that read-modify-write one memory location indivisibly. An atomic uses those directly. A mutex is built on top of atomics too, but adds a protocol for *waiting*: a thread that finds the mutex taken may be put to sleep by the OS and woken later, which costs microseconds. With an atomic, nobody sleeps — threads simply retry at hardware speed. The trade-off: an atomic protects one variable, while a mutex protects any amount of data and code.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'What can be atomic?',
          text: '`std::atomic<T>` works for any trivially copyable `T`: integers, `bool`, pointers, small structs. For small types it is *lock-free* (pure hardware instructions; check with `is_lock_free()`). For large types the library may secretly use a lock. Atomics cannot be copied or moved — copying would need to be atomic across two objects, which hardware cannot do.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'bug',
      prompt: 'The game thread waits for a loader thread to finish. In an optimized build it sometimes hangs forever, even after loading completes. Tap the line that must change.',
      code: `bool assetsLoaded = false;

void loadAssets() {
    // ... load textures and meshes ...
    assetsLoaded = true;
}

int main() {
    std::thread loader{loadAssets};
    while (!assetsLoaded) {
        // wait for the loader
    }
    loader.join();
}`,
      bugLines: [1],
      hint: 'Two threads access one variable, one of them writes, and nothing synchronizes them.',
      explanation:
        'Line 1 declares a plain `bool` that one thread writes while another reads it: a data race, which is undefined behavior. In practice, the optimizer sees that the loop body never changes `assetsLoaded`, reads it once, and turns the loop into `while (true)`. Declaring it `std::atomic<bool> assetsLoaded{false};` makes every read a real, synchronized load and guarantees that once the loader stores `true`, the waiting thread sees it — along with everything the loader wrote before (the textures and meshes). For long waits, a condition variable or a future avoids burning a core in the loop.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'load, store and fetch_sub in practice',
      blocks: [
        {
          type: 'p',
          text: 'The return value of the fetch operations is what makes them powerful. Here four squad members clear a room of 100 enemies in parallel. Exactly one thread must open the boss door — whichever lands the final kill:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <atomic>
#include <iostream>
#include <thread>
#include <vector>

std::atomic<int> enemiesAlive{100};
std::atomic<int> doorsOpened{0};

void clearRoom(int kills) {
    for (int i = 0; i < kills; ++i) {
        if (enemiesAlive.fetch_sub(1) == 1) {
            doorsOpened.fetch_add(1);   // only the final kill
        }
    }
}

int main() {
    std::vector<std::thread> squad;
    for (int s = 0; s < 4; ++s) {
        squad.emplace_back(clearRoom, 25);
    }
    for (std::thread& t : squad) {
        t.join();
    }
    std::cout << "Enemies alive: " << enemiesAlive.load() << '\\n';
    std::cout << "Boss doors opened: " << doorsOpened.load() << '\\n';
}`,
          output: 'Enemies alive: 0\nBoss doors opened: 1',
          annotations: [
            { lines: 11, text: '`fetch_sub` decrements **and** tells this thread what the value was just before. Exactly one call in the whole program sees `1` — the one that took the count from 1 to 0 — so exactly one thread opens the door.' },
            { lines: 12, text: 'In a real game this would be `openBossDoor()`; counting calls proves it runs once.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Two separate atomic operations',
            tone: 'bad',
            code: `--enemiesAlive;
if (enemiesAlive == 0) {
    openBossDoor();
}`,
            text: 'Each line is atomic, but another thread can act *between* them. Several threads can all see 0.',
          },
          right: {
            title: 'One atomic read-modify-write',
            tone: 'good',
            code: `if (enemiesAlive.fetch_sub(1) == 1) {
    openBossDoor();
}`,
            text: 'Decrement and check are one indivisible step, so the answer belongs to this thread alone.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why do fetch operations return the old value?',
          text: 'Because once the operation completes, the variable is public again — any other thread may change it a nanosecond later. Reading it afterwards tells you about *someone*\'s update, not yours. The returned value is the only information guaranteed to describe the state your own operation saw. Design atomic logic around those return values.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: 'Four threads each run this code once, starting with `enemiesAlive` at 4. `enemiesAlive` is a `std::atomic<int>`. How many times can `openBossDoor()` be called?',
      code: `--enemiesAlive;
if (enemiesAlive == 0) {
    openBossDoor();
}`,
      options: [
        {
          text: 'Exactly once, because every operation is atomic',
          why: 'Each *operation* is atomic, but the decrement and the comparison are two operations. Others can decrement in between.',
        },
        {
          text: 'Any number, because this is a data race and therefore undefined behavior',
          why: 'All accesses are atomic, so there is no data race and no UB. The behavior is well-defined — it is just a logic bug.',
        },
        {
          text: 'It does not compile, since atomics cannot be compared with `==`',
          why: 'Comparing works: the atomic implicitly converts with an atomic `load()`.',
        },
        {
          text: 'Between one and four times, because several threads may read `0` after the final decrement',
          correct: true,
          why: 'The thread doing the last decrement always reads 0, and any thread that decremented earlier but checks later reads 0 too.',
        },
      ],
      explanation:
        'This is a **race condition** without a data race: every access is atomic and well-defined, but the outcome depends on timing. Atomics make individual operations indivisible; they do not make *sequences* of operations indivisible. Combine the steps into one read-modify-write (`fetch_sub(1) == 1`) or protect the whole sequence with a mutex.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'When is an atomic enough?',
      blocks: [
        {
          type: 'table',
          headers: ['An atomic is enough for…', 'You need a mutex for…'],
          rows: [
            ['A single counter: kills, frames rendered, bytes downloaded', 'Several variables that must stay consistent: `health` and `isDead`, `x` and `y`'],
            ['A flag: `loadingDone`, `quitRequested`', 'Containers: `std::vector`, `std::map`, a job queue'],
            ['A unique ID generator: `nextId.fetch_add(1)`', 'Multi-step operations: check the chest is closed, then open it and grant loot'],
            ['"Update if better" using compare-exchange', 'Anything that calls into other code while it must stay protected'],
          ],
        },
        {
          type: 'p',
          text: 'When the new value depends on the old one in a way no single fetch operation covers, use a [[compare-exchange]] loop: read the value, compute the new one, and store it *only if nobody changed it meanwhile* — otherwise retry. Eight players submitting scores to a shared high score:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <atomic>
#include <iostream>
#include <thread>
#include <vector>

void submitScore(std::atomic<int>& best, int score) {
    int current = best.load();
    while (score > current &&
           !best.compare_exchange_weak(current, score)) {
        // failed: current now holds the latest value; retry
    }
}

int main() {
    std::atomic<int> best{0};
    std::vector<std::jthread> players;
    for (int p = 1; p <= 8; ++p) {
        players.emplace_back([&best, p] {
            for (int round = 0; round < 1000; ++round) {
                submitScore(best, p * 1000 + round);
            }
        });
    }
    players.clear();               // destroys (joins) every jthread
    std::cout << "High score: " << best.load() << '\\n';
}`,
          output: 'High score: 8999',
          annotations: [
            { lines: 7, text: 'Take a snapshot of the current best.' },
            { lines: '8-9', text: 'If our score is not higher, stop. Otherwise try to replace `current` with `score`. If another thread changed `best` in the meantime, the exchange fails, **writes the fresh value into `current`**, and the loop re-checks against it.' },
            { lines: 9, text: '`_weak` may fail spuriously even when the values match (cheaper on some CPUs); inside a retry loop that does not matter. Use `compare_exchange_strong` when you are not looping.' },
            { lines: 24, text: 'Destroying the `std::jthread`s joins them all — the RAII thread from the first lesson of this unit.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Lock-free is not automatically faster',
          text: 'When many cores hammer the same atomic, its cache line bounces between them, and every operation waits for that transfer. A heavily contended atomic can be slower than giving each thread its own counter and summing at the end (as in our damage tally). Lock-free algorithms beyond counters and flags are notoriously hard to get right; prefer a mutex until profiling says otherwise.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Atomics in Unreal',
          text: 'Epic\'s coding standard tells you to use `std::atomic` in new code rather than the engine\'s older `TAtomic` wrapper — one of the places where Unreal explicitly prefers the standard library.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'Making every member of a struct `std::atomic` makes the struct as a whole thread-safe.',
      answer: false,
      explanation:
        'Each member becomes individually safe to read and write, but nothing ties them together. With `std::atomic<float> health` and `std::atomic<bool> isDead`, another thread can observe `health == 0` while `isDead` is still `false`, or a reader can see `x` from one update and `y` from the next. Invariants spanning several fields need a mutex (or a single atomic holding the whole state, which only works for small trivially copyable structs).',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Memory ordering: a short deep dive',
      blocks: [
        {
          type: 'p',
          text: 'Atomics do more than prevent torn updates; they also control **ordering**. Compilers and CPUs reorder ordinary memory operations for speed — legal as long as a single thread cannot tell. Across threads, that reordering can be visible. Every atomic operation takes an optional [[memory-order]] argument saying how much ordering it enforces.',
        },
        {
          type: 'table',
          headers: ['Order', 'Guarantees', 'Typical use'],
          rows: [
            ['`memory_order_seq_cst` (the default)', 'Atomicity, plus one global order of all such operations that every thread agrees on', 'The default for good reason: easiest to reason about'],
            ['`memory_order_release` (store) / `memory_order_acquire` (load)', 'A release store **publishes** every write made before it to any thread whose acquire load reads the stored value', 'Handing data to another thread: "ready" flags, producer/consumer'],
            ['`memory_order_relaxed`', 'Atomicity only; no ordering of other memory operations', 'Counters and statistics read after a join'],
          ],
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <atomic>
#include <iostream>
#include <string>
#include <thread>

std::string levelName;               // plain, non-atomic data
int roomCount = 0;
std::atomic<bool> levelReady{false};

void loader() {
    levelName = "Crypt of Echoes";
    roomCount = 42;
    levelReady.store(true, std::memory_order_release);
}

void game() {
    while (!levelReady.load(std::memory_order_acquire)) {
        std::this_thread::yield();
    }
    std::cout << "Loaded " << levelName << " (" << roomCount
              << " rooms)\\n";
}

int main() {
    std::jthread player{game};
    std::jthread streamer{loader};
}`,
          output: 'Loaded Crypt of Echoes (42 rooms)',
          annotations: [
            { lines: '6-7', text: 'Ordinary variables. Normally, writing them in one thread and reading them in another would be a data race.' },
            { lines: 13, text: 'The release store acts like a barrier: the two writes above may not be moved after it. Everything written before it is published together with `true`.' },
            { lines: 17, text: 'The acquire load pairs with that store. Once it reads `true`, everything the loader wrote before the release is guaranteed to be visible here.' },
            { lines: '20-21', text: 'Safe to read the plain variables: the release/acquire pair created a [[happens-before]] relationship. No mutex required.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why offer weaker orders at all?',
          text: 'Strong ordering costs fences — instructions that stop the CPU from reordering and wait for memory traffic. On x86, ordinary loads and stores already behave like acquire and release, so only `seq_cst` stores need an extra fence (typically an `xchg` instruction). On ARM — phones, Apple Silicon Macs, the Nintendo Switch — the hardware reorders far more aggressively, and the differences between orders become real costs. Weaker orders let experts pay only for the ordering they need.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Use seq_cst unless you can prove otherwise',
          text: 'Bugs from a too-weak memory order are timing-dependent, often invisible on x86, and then appear on ARM devices. The default `seq_cst` is correct whenever a weaker order would be. Use `relaxed` only for independent counters and statistics, and acquire/release only for clear hand-off patterns like the one above. (`memory_order_consume` also exists, but compilers treat it as acquire; avoid it.)',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'Many worker threads increment `std::atomic<long long> framesSimulated` with `fetch_add(1, ...)`. The value is only printed at shutdown, after every worker has been joined. Which memory order is sufficient for the increments?',
      options: [
        {
          text: '`memory_order_relaxed`',
          correct: true,
          why: 'The increments only need atomicity, so none are lost. Ordering relative to other data is unnecessary, and `join()` already makes the final value visible to the main thread.',
        },
        {
          text: '`memory_order_seq_cst` — anything weaker can lose increments',
          why: 'Every memory order keeps read-modify-write operations atomic, so no increment is ever lost. `seq_cst` would work but adds ordering nobody needs.',
        },
        {
          text: '`memory_order_acquire`, so the main thread can see the total',
          why: 'Acquire pairs with a release store to publish *other* data. Visibility of the final count comes from `join()`.',
        },
        {
          text: 'None — the counter does not need to be atomic, because the value is only read after `join()`',
          why: 'The *workers* increment it concurrently with each other. Without atomicity those increments race and get lost, exactly like the unprotected kill counter.',
        },
      ],
      explanation:
        'Memory order controls how an atomic operation orders *other* memory accesses; atomicity of the operation itself is guaranteed at every order. A statistics counter has no other data riding on it, so `relaxed` is the textbook choice. The synchronization the main thread needs comes from joining the workers.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'std::async and std::future: tasks with results',
      blocks: [
        {
          type: 'p',
          text: 'Threads are about *where* code runs. Often you care about something simpler: "compute this in the background and give me the result later". That is a **task**, and `std::async` runs one, returning a [[future|std::future]] — a handle to a result that will exist eventually.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <future>
#include <iostream>
#include <numeric>
#include <vector>

long long sumDamage(const std::vector<int>& hits) {
    return std::accumulate(hits.begin(), hits.end(), 0LL);
}

int main() {
    const std::vector<int> bossHits(500'000, 7);
    const std::vector<int> minionHits(300'000, 2);

    std::future<long long> boss = std::async(
        std::launch::async, sumDamage, std::cref(bossHits));
    const long long minions = sumDamage(minionHits);  // meanwhile

    std::cout << "Boss damage: " << boss.get() << '\\n';
    std::cout << "Minion damage: " << minions << '\\n';
}`,
          output: 'Boss damage: 3500000\nMinion damage: 600000',
          annotations: [
            { lines: '14-15', text: 'Starts `sumDamage(bossHits)` on another thread and immediately returns a `std::future<long long>`. Arguments are copied like `std::thread`\'s, so `std::cref` avoids copying half a million ints.' },
            { lines: 16, text: 'The main thread does useful work in parallel.' },
            { lines: 18, text: '`get()` waits until the result is ready, then returns it. The waiting also synchronizes: the task\'s work is visible afterwards. `get()` can be called only once; the future is empty afterwards (use `std::shared_future` for several readers).' },
          ],
        },
        {
          type: 'table',
          headers: ['Launch policy', 'Behaviour'],
          rows: [
            ['`std::launch::async`', 'Runs the task as if on a new thread, starting now'],
            ['`std::launch::deferred`', 'Does nothing until someone calls `get()` or `wait()`, then runs the task **in that thread** — lazy, not parallel'],
            ['Default (`async | deferred`)', 'The implementation chooses. The task may never run in parallel at all'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Always pass a launch policy',
          text: 'With the default policy, a library may choose `deferred`, so the "background" work runs only when you call `get()` — on your thread, after all. Write `std::launch::async` explicitly when you want parallelism.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The future that blocks in its destructor',
          text: 'A future returned by `std::async` **waits for the task in its destructor**. So `std::async(std::launch::async, saveGame);` on its own line creates a temporary future that is destroyed at the semicolon — which waits for `saveGame` to finish. It looks asynchronous and is not. C++20 marks `std::async` as `nodiscard`, and GCC warns: "ignoring return value of … declared with attribute nodiscard".',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'A teammate wants the save and the stats upload to run in the background while the goodbye screen appears. What actually happens?',
      code: `void onQuit() {
    std::async(std::launch::async, saveGame);
    std::async(std::launch::async, uploadStats);
    showGoodbyeScreen();
}`,
      options: [
        {
          text: 'Saving, uploading and the goodbye screen all run at the same time',
          why: 'That is the intent, but each discarded future blocks in its destructor at the end of its own statement.',
        },
        {
          text: '`saveGame` runs to completion, then `uploadStats` runs to completion, then the goodbye screen appears',
          correct: true,
          why: 'Each line creates a temporary future that is destroyed at the semicolon, and that destructor waits for its task. The code is effectively sequential.',
        },
        {
          text: 'It does not compile, because `std::async`\'s result must be used',
          why: '`nodiscard` produces a warning, not an error (unless you build with `-Werror`). The code compiles — and misbehaves.',
        },
        {
          text: 'The tasks are cancelled when their futures are destroyed',
          why: 'Futures never cancel tasks. The destructor waits for completion instead.',
        },
      ],
      explanation:
        'Futures from `std::async` keep the task tied to their lifetime, so the result must be stored to get any concurrency: `auto save = std::async(...); auto stats = std::async(...); showGoodbyeScreen();` — the two futures then wait at the end of `onQuit`. This surprising rule is one reason many codebases prefer explicit thread pools or engine task systems for fire-and-forget work.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'std::promise: fulfilling a future by hand',
      blocks: [
        {
          type: 'p',
          text: '`std::async` creates the future for you. Sometimes the result comes from somewhere `std::async` cannot reach: a thread you already have, a callback from a networking library, or a value computed halfway through a longer job. A `std::promise` is the *writing end* of a future: whoever holds the promise sets the value, and whoever holds the future receives it.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <future>
#include <iostream>
#include <string>
#include <thread>
#include <utility>

void loadProfile(std::promise<std::string> result) {
    // ... read from disk or the network ...
    result.set_value("Ash, level 12");
}

int main() {
    std::promise<std::string> promise;
    std::future<std::string> profile = promise.get_future();
    std::jthread loader{loadProfile, std::move(promise)};
    std::cout << "Profile: " << profile.get() << '\\n';
}`,
          output: 'Profile: Ash, level 12',
          annotations: [
            { lines: 9, text: 'Fulfils the promise. The waiting `get()` in `main` wakes up with this value. A promise can be fulfilled only once.' },
            { lines: 14, text: 'Connects the two ends before the promise is handed away.' },
            { lines: 15, text: 'Promises are move-only (exactly one writer), so the thread gets it with `std::move`.' },
            { lines: 16, text: 'Blocks until the loader calls `set_value`.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Errors travel too**: inside a `catch` block, `result.set_exception(std::current_exception());` makes the receiver\'s `get()` rethrow it.',
            '**Broken promises**: if a promise is destroyed without a value, `get()` throws `std::future_error` with the code `broken_promise` instead of waiting forever.',
            '**`std::packaged_task`** wraps a function so that calling it fulfils a future — the building block for writing your own thread pool.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'fill',
      prompt: 'Complete the code so `rollLoot` runs on another thread while the main thread does other work, and then retrieve its result.',
      template: `std::___<int> lootRoll =
    std::async(std::launch::___, rollLoot, seed);

animateChestOpening();          // runs meanwhile

int item = lootRoll.___();`,
      blanks: [{ answers: ['future'] }, { answers: ['async'] }, { answers: ['get'] }],
      wordBank: ['future', 'promise', 'async', 'deferred', 'get', 'wait', 'join'],
      explanation:
        '`std::async` returns a `std::future<int>` (a `std::promise` is the *producer* side, which `std::async` manages internally). `std::launch::async` guarantees the roll starts in parallel right away; `deferred` would postpone it until `get()`, so nothing would overlap with the animation. `get()` waits for and returns the result; `wait()` only waits and returns `void`, so it cannot initialize `item`, and futures have no `join()`.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Think in tasks, not threads',
      blocks: [
        {
          type: 'p',
          text: 'A thread is a resource, like memory: expensive to create, limited in number, and awkward to manage by hand. A task is a unit of work with a result. Modern concurrent code — and every game engine — is written in terms of tasks that a scheduler maps onto a fixed set of threads.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <future>
#include <iostream>
#include <stdexcept>

int loadSaveSlot(int slot) {
    if (slot > 3) {
        throw std::out_of_range{"no such save slot"};
    }
    return slot * 100;
}

int main() {
    auto ok = std::async(std::launch::async, loadSaveSlot, 2);
    auto bad = std::async(std::launch::async, loadSaveSlot, 9);

    std::cout << "Slot 2 progress: " << ok.get() << '\\n';
    try {
        bad.get();                   // rethrows the task's exception
    } catch (const std::out_of_range& e) {
        std::cout << "Load failed: " << e.what() << '\\n';
    }
}`,
          output: 'Slot 2 progress: 200\nLoad failed: no such save slot',
          annotations: [
            { lines: 7, text: 'Thrown on a worker thread. With a raw `std::thread`, an exception escaping the thread function calls `std::terminate`.' },
            { lines: 18, text: 'The future captured the exception and rethrows it here, in the thread that asked for the result — so ordinary `try`/`catch` error handling works across threads.' },
          ],
        },
        {
          type: 'table',
          headers: ['Tool', 'Result back?', 'Exceptions', 'Lifetime management', 'Reuses threads?'],
          rows: [
            ['`std::thread`', 'Via shared variables', 'Escaping one terminates the program', 'Must join or detach manually', 'No'],
            ['`std::jthread`', 'Via shared variables', 'Same as `std::thread`', 'Joins automatically; stop tokens', 'No'],
            ['`std::async` + `std::future`', '`get()`', 'Rethrown by `get()`', 'Future waits for the task', 'Implementation-dependent'],
            ['Thread pool / engine task system', 'Usually a future-like handle', 'Depends on the system', 'Managed by the scheduler', 'Yes'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why do engines avoid std::async?',
          text: 'The standard does not say whether `std::async` reuses threads (MSVC\'s implementation uses a thread pool; libstdc++ starts a new thread each time), and it offers no priorities, dependencies or control over how many run at once. Games need all of these to fit work into a 16 ms frame, so engines build task systems on a fixed [[thread-pool]]. The concepts carry over directly: a task, a handle to its result, and synchronization when you collect it. C++26 adds a standard framework for this, `std::execution` (senders and receivers).',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Unreal: the game thread rule',
      blocks: [
        {
          type: 'p',
          text: 'Everything in this unit applies to Unreal, plus one rule that overrides all others: **UObjects — actors, components, and the engine systems that manage them — may only be used on the [[game-thread]].** Spawning, destroying, moving actors, changing `UPROPERTY` values, calling Blueprint functions: game thread only.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why such a strict rule?',
          text: 'UObjects are not protected by locks — adding them to every object would slow the whole engine down. The game thread also runs the [[ue-garbage-collector|garbage collector]], which can destroy any unreferenced UObject between frames, so a raw pointer held by a worker can dangle at any moment. Restricting UObject access to one thread makes all of this safe without a single mutex.',
        },
        {
          type: 'p',
          text: 'The standard pattern is a round trip: copy the plain data you need on the game thread, do the heavy work on a worker using only that data, then hop back to the game thread to apply the result:',
        },
        {
          type: 'code',
          title: 'MyGameMode.cpp',
          code: `#include "Async/Async.h"

void AMyGameMode::RebuildDangerMapAsync() {
    TArray<FVector> Points = CollectSpawnPoints();  // plain copy
    TWeakObjectPtr<AMyGameMode> WeakThis(this);

    AsyncTask(ENamedThreads::AnyBackgroundThreadNormalTask,
        [WeakThis, Points = MoveTemp(Points)]() {
            // Worker thread: plain data only, no UObjects
            TArray<FVector> Sorted = SortByDanger(Points);

            AsyncTask(ENamedThreads::GameThread,
                [WeakThis, Sorted = MoveTemp(Sorted)]() {
                    // Back on the game thread
                    if (AMyGameMode* Self = WeakThis.Get()) {
                        Self->ApplyDangerMap(Sorted);
                    }
                });
        });
}`,
          annotations: [
            { lines: 4, text: 'Gather everything the worker needs while still on the game thread. `FVector` is a plain struct, safe to use anywhere.' },
            { lines: 5, text: 'A [[tweakobjectptr|weak pointer]] does not keep the game mode alive, and lets us check later whether it still exists.' },
            { lines: 7, text: '`AsyncTask` queues the lambda on Unreal\'s task graph — here, any background worker.' },
            { lines: 10, text: 'The expensive part runs off the game thread. `SortByDanger` is a plain C++ function working on copies: no data race possible.' },
            { lines: 12, text: 'Queue a second task, this time on the game thread itself. It will run during a later frame.' },
            { lines: 15, text: 'The level may have ended while we were working. Only touch the game mode if it still exists — and we are on the game thread, where checking a weak pointer is safe.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Other Unreal concurrency tools',
          text: '`Async(EAsyncExecution::ThreadPool, Lambda)` returns a `TFuture`, much like `std::async`. `UE::Tasks::Launch` is the modern tasks API with dependencies between tasks. `ParallelFor` splits a loop across workers. `FRunnable` with `FRunnableThread` gives a dedicated long-lived thread. Use `check(IsInGameThread())` at the top of functions that must run on the game thread.',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'A background task computes a patrol path and then calls `Enemy->SetActorLocation(PathStart)` directly from the worker thread. What is the problem, and what is the fix?',
      options: [
        {
          text: 'None: `SetActorLocation` is thread-safe because it only changes a transform',
          why: 'It updates components, physics state, overlaps and rendering proxies — engine state shared with the game thread and owned by it. It is not thread-safe.',
        },
        {
          text: 'It races with the game thread and the garbage collector; compute on the worker, then apply the result with `AsyncTask(ENamedThreads::GameThread, ...)` after checking a `TWeakObjectPtr`',
          correct: true,
          why: 'This keeps all UObject access on the game thread, and the weak pointer handles an enemy destroyed while the path was computed.',
        },
        {
          text: 'Wrap the call in a `std::mutex` so only one thread moves the enemy at a time',
          why: 'The engine\'s own game-thread code never takes your mutex, so it does not prevent the race. Only running on the game thread does.',
        },
        {
          text: 'It is only a performance problem; it is safe but slower than calling it on the game thread',
          why: 'It is a correctness problem: data races on engine state are undefined behavior, typically ending in crashes that are very hard to reproduce.',
        },
      ],
      explanation:
        'The safe division of labour is: workers do pure computation on copied, plain data; the game thread performs every interaction with UObjects. A mutex cannot help because synchronization only works when *every* party uses it, and the engine\'s game-thread code knows nothing about your lock. `AsyncTask(ENamedThreads::GameThread, ...)` is the standard way back.',
    },
  ],
  takeaways: [
    '`std::atomic` makes single operations indivisible: `load`, `store`, `exchange`, `fetch_add`/`fetch_sub`, `compare_exchange`.',
    'Build atomic logic on the values returned by read-modify-write operations; a sequence of separate atomic operations is still a race condition.',
    'Atomics suit single counters, flags, IDs and "update if better" loops; invariants across several values or containers need a mutex.',
    'Default to `seq_cst`; use release/acquire for clear hand-offs and `relaxed` only for independent counters.',
    '`std::async(std::launch::async, f)` returns a `std::future`; `get()` waits, returns the value and rethrows exceptions. Always store the future.',
    '`std::promise` is the writing end of a future, for results produced by threads or callbacks you control.',
    'Think in tasks rather than threads; engines run tasks on fixed worker pools.',
    'In Unreal, only the game thread touches UObjects: do plain-data work on workers and return with `AsyncTask(ENamedThreads::GameThread, ...)`.',
  ],
  reading: [
    {
      title: 'std::atomic',
      url: 'https://en.cppreference.com/w/cpp/atomic/atomic',
      source: 'cppreference',
      note: 'All member functions, specializations and the lock-free guarantees.',
    },
    {
      title: 'std::memory_order',
      url: 'https://en.cppreference.com/w/cpp/atomic/memory_order',
      source: 'cppreference',
      note: 'Formal definitions of every memory order, with release/acquire and relaxed examples.',
    },
    {
      title: 'std::async',
      url: 'https://en.cppreference.com/w/cpp/thread/async',
      source: 'cppreference',
      note: 'Launch policies and the blocking-destructor rule for futures from std::async.',
    },
    {
      title: 'Acquire and Release Semantics',
      url: 'https://preshing.com/20120913/acquire-and-release-semantics/',
      source: 'article',
      note: 'Jeff Preshing\'s clear, diagram-rich explanation of what acquire and release actually guarantee.',
    },
    {
      title: 'C++ Concurrency in Action, Second Edition',
      url: 'https://www.manning.com/books/c-plus-plus-concurrency-in-action-second-edition',
      source: 'book',
      note: 'Chapters 4 and 5 cover futures, promises, atomics and the memory model in depth.',
    },
  ],
};
