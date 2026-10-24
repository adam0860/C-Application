import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'jthread',
    term: 'std::jthread',
    aliases: ['jthread', 'joining thread'],
    course: 'cpp',
    category: 'Concurrency',
    short: 'A C++20 thread class that automatically requests a stop and joins in its destructor, and supports cooperative cancellation through `std::stop_token`.',
    long: 'Destroying a still-joinable `std::thread` calls `std::terminate`, so every code path — including exception paths — must remember to join it. `std::jthread` applies RAII to threads: its destructor calls `request_stop()` and then `join()`. If the thread function takes a `std::stop_token` as its first parameter, the jthread supplies one automatically, and the function should check it regularly.',
    example: `void worker(std::stop_token stop) {
    while (!stop.stop_requested()) {
        // do a slice of work
    }
}

std::jthread t{worker};   // joins automatically at scope exit`,
    see: ['thread', 'stop-token', 'raii'],
    reading: [
      {
        title: 'std::jthread',
        url: 'https://en.cppreference.com/w/cpp/thread/jthread',
        source: 'cppreference',
        note: 'Member functions, destructor behavior and stop-token support.',
      },
    ],
  },
  {
    id: 'stop-token',
    term: 'std::stop_token',
    aliases: ['stop_token', 'stop_source', 'cooperative cancellation'],
    course: 'cpp',
    category: 'Concurrency',
    short: 'A C++20 object a thread can poll (`stop_requested()`) to find out whether someone has asked it to stop. Created from a `std::stop_source`, for example the one inside a `std::jthread`.',
    long: 'Stop tokens implement *cooperative* cancellation: requesting a stop only sets a flag, and the thread decides when it is safe to finish. C++ has no way to forcibly kill a thread, because a thread killed at an arbitrary point could leave locks held and data half-updated. `std::stop_callback` can run a function when a stop is requested, and `std::condition_variable_any` can wait with a stop token.',
    see: ['jthread', 'thread'],
  },
  {
    id: 'game-thread',
    term: 'Game Thread',
    aliases: ['render thread', 'main thread'],
    course: 'both',
    category: 'Concurrency',
    short: 'In Unreal Engine (and many engines), the main thread that runs gameplay code: actors, components, `Tick`, Blueprints and all UObject access. Rendering runs separately on the render thread, typically one frame behind.',
    long: 'UObjects and most engine APIs are not thread-safe, so they may only be used on the game thread; check with `IsInGameThread()`. Heavy work can run on worker threads (through the task graph, `ParallelFor` or `AsyncTask`) as long as it uses plain data, with results handed back to the game thread to apply. The render thread converts the game thread\'s scene into rendering commands while the game thread simulates the next frame — a pipeline that keeps both busy.',
    see: ['thread', 'task-graph', 'uobject'],
  },
  {
    id: 'task-graph',
    term: 'Task Graph',
    aliases: ['task system', 'job system', 'UE::Tasks'],
    course: 'both',
    category: 'Concurrency',
    short: 'Unreal Engine\'s system for running small units of work (tasks) on a fixed pool of worker threads, with dependencies between tasks. Other engines call the same idea a *job system*.',
    long: 'Creating threads is expensive and oversubscribing cores is slow, so engines create roughly one worker per core at startup and feed them many short tasks. Unreal exposes this through `ParallelFor`, `AsyncTask(ENamedThreads::..., Lambda)`, `Async(...)` returning a `TFuture`, and the newer `UE::Tasks::Launch` API. Tasks may run on any worker, so they must not touch UObjects directly.',
    see: ['game-thread', 'thread', 'thread-pool'],
  },
  {
    id: 'thread-pool',
    term: 'Thread Pool',
    aliases: ['worker pool'],
    course: 'cpp',
    category: 'Concurrency',
    short: 'A fixed set of long-lived worker threads that take tasks from a queue, so work can run in parallel without paying the cost of creating a thread for every job.',
    long: 'Pools are usually sized to the number of hardware threads (`std::thread::hardware_concurrency()`), avoiding oversubscription. The C++ standard library has no general-purpose thread pool before C++26\'s `std::execution`; in practice you use a library (such as Intel oneTBB) or an engine\'s task system.',
    see: ['thread', 'task-graph'],
  },
  {
    id: 'critical-section',
    term: 'Critical Section',
    course: 'both',
    category: 'Concurrency',
    short: 'A region of code that accesses shared data and must therefore be executed by only one thread at a time, typically by holding a mutex for its duration.',
    long: 'Keep critical sections as short as possible: every thread that wants to enter waits while another is inside. In Unreal Engine, `FCriticalSection` is the name of the mutex type itself, locked with `FScopeLock`.',
    example: `{
    std::lock_guard lock{scoreMutex};   // enter
    score += points;                    // critical section
}                                       // leave (unlock)`,
    see: ['mutex', 'lock-guard', 'data-race'],
  },
  {
    id: 'unique-lock',
    term: 'std::unique_lock',
    aliases: ['unique_lock'],
    course: 'cpp',
    category: 'Concurrency',
    short: 'A flexible RAII lock for one mutex that can unlock and relock, defer or try locking, time out, and be moved — required for waiting on a `std::condition_variable`.',
    long: 'It is slightly larger than `std::lock_guard` because it tracks whether it currently owns the mutex, so its destructor only unlocks if needed. Use `lock_guard` or `scoped_lock` when you just need a lock for a whole scope, and `unique_lock` when you need its extra abilities.',
    example: `std::unique_lock lock{m};
data.push_back(x);
lock.unlock();      // release early
slowWork();`,
    see: ['lock-guard', 'mutex', 'condition-variable', 'raii'],
  },
  {
    id: 'condition-variable',
    term: 'std::condition_variable',
    aliases: ['condition_variable', 'spurious wakeup', 'notify_one'],
    course: 'cpp',
    category: 'Concurrency',
    short: 'A synchronization primitive that lets a thread sleep until another thread changes some shared state and notifies it, instead of repeatedly checking in a loop.',
    long: 'A waiting thread holds a `std::unique_lock` on the mutex that protects the state; `wait` releases the mutex while sleeping and reacquires it on waking. Because threads can wake spuriously and notifications are not remembered, always wait with a predicate — `cv.wait(lock, [] { return ready; });` — and modify the state under the same mutex before calling `notify_one()` or `notify_all()`.',
    example: `std::unique_lock lock{m};
cv.wait(lock, [] { return !jobs.empty(); });
auto job = jobs.front();`,
    see: ['mutex', 'unique-lock', 'thread'],
    reading: [
      {
        title: 'std::condition_variable',
        url: 'https://en.cppreference.com/w/cpp/thread/condition_variable',
        source: 'cppreference',
        note: 'Waiting, notification and the rules for avoiding lost wakeups.',
      },
    ],
  },
  {
    id: 'compare-exchange',
    term: 'Compare-and-Swap (compare_exchange)',
    aliases: ['CAS', 'compare_exchange_weak', 'compare_exchange_strong', 'compare-and-swap'],
    course: 'cpp',
    category: 'Concurrency',
    short: 'An atomic operation that replaces a value only if it still equals an expected value, reporting whether it succeeded. `std::atomic` provides it as `compare_exchange_weak` and `compare_exchange_strong`.',
    long: 'CAS is the building block for lock-free updates that no single fetch operation covers: read the value, compute a new one, and try to store it; if another thread changed the value in between, the exchange fails, loads the fresh value into `expected`, and you retry. The `_weak` form may fail spuriously and is meant for retry loops; `_strong` fails only when the values really differ.',
    example: `int current = best.load();
while (score > current &&
       !best.compare_exchange_weak(current, score)) {
    // current was refreshed; loop re-checks
}`,
    see: ['atomic', 'memory-order'],
  },
  {
    id: 'memory-order',
    term: 'Memory Order',
    aliases: ['memory ordering', 'std::memory_order', 'acquire', 'release', 'relaxed', 'seq_cst', 'sequential consistency'],
    course: 'cpp',
    category: 'Concurrency',
    short: 'An argument to atomic operations (`std::memory_order`) that specifies how they order surrounding memory accesses between threads: `seq_cst` (the default, strongest), `acquire`/`release` (for publishing data), or `relaxed` (atomicity only).',
    long: 'Compilers and CPUs reorder memory operations when a single thread cannot notice. Memory orders limit that reordering across threads. A release store publishes every earlier write to a thread whose acquire load reads the stored value; `seq_cst` additionally makes all threads agree on one global order of such operations; `relaxed` guarantees only that the operation itself is indivisible. Weaker orders can be faster, especially on ARM, but are easy to get wrong — use `seq_cst` unless you have a clear reason.',
    example: `data = 42;                                   // plain write
ready.store(true, std::memory_order_release); // publish

while (!ready.load(std::memory_order_acquire)) {}
use(data);                                   // sees 42`,
    see: ['atomic', 'happens-before', 'data-race'],
    reading: [
      {
        title: 'std::memory_order',
        url: 'https://en.cppreference.com/w/cpp/atomic/memory_order',
        source: 'cppreference',
        note: 'Formal definitions and examples for each ordering.',
      },
    ],
  },
  {
    id: 'happens-before',
    term: 'Happens-Before',
    aliases: ['happens before', 'synchronizes-with'],
    course: 'cpp',
    category: 'Concurrency',
    short: 'The ordering relation in the C++ memory model that guarantees one operation\'s effects are visible to another. Two conflicting accesses (at least one a write, not both atomic) that are not ordered by happens-before form a data race.',
    long: 'Within one thread, earlier statements happen before later ones. Across threads, happens-before is created by synchronization: unlocking a mutex synchronizes with the next lock of it, a release store synchronizes with an acquire load that reads its value, thread creation synchronizes with the start of the new thread, and a thread\'s completion synchronizes with the return of `join()`. Visibility is only guaranteed along these edges.',
    see: ['memory-order', 'data-race', 'mutex'],
  },
];
