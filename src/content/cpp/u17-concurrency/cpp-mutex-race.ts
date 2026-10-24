import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-mutex-race',
  title: 'Data Races, Mutexes and Locks',
  summary:
    'Why two threads sharing a counter lose updates, how mutexes and RAII locks fix it, and how to avoid deadlock along the way.',
  minutes: 18,
  objectives: [
    'Define a data race precisely and explain why it is undefined behavior',
    'Explain the lost-update problem in terms of load, modify and store',
    'Protect shared data with `std::mutex` and the RAII locks `lock_guard`, `scoped_lock` and `unique_lock`',
    'Explain how deadlock happens and prevent it with lock ordering and `std::scoped_lock`',
    'Choose a sensible lock granularity and use a condition variable to wait for work',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The case of the missing kills',
      blocks: [
        {
          type: 'p',
          text: 'Two threads each record 100,000 kills in a shared counter. The answer should obviously be 200,000:',
        },
        {
          type: 'code',
          title: 'race.cpp — broken on purpose',
          code: `#include <iostream>
#include <thread>

int kills = 0;

void hunt() {
    for (int i = 0; i < 100000; ++i) {
        ++kills;              // two threads, no protection
    }
}

int main() {
    std::thread a{hunt};
    std::thread b{hunt};
    a.join();
    b.join();
    std::cout << "Kills: " << kills << '\\n';
}`,
          annotations: [
            { lines: 4, text: 'A [[global-variable]]: shared by both threads.' },
            { lines: 8, text: 'Looks like one operation, but the CPU performs three: **load** `kills` into a register, **add** 1, **store** it back. Another thread can sneak in between them.' },
            { lines: '15-16', text: 'Joining both threads is correct — the problem happens *during* the loops.' },
          ],
        },
        {
          type: 'p',
          text: 'Three real runs of an unoptimized build printed `114070`, `135443` and `135861`. Tens of thousands of kills vanished. Here is how a single one disappears:',
        },
        {
          type: 'table',
          caption: 'One possible interleaving of two increments',
          headers: ['Step', 'Thread A', 'Thread B', '`kills` in memory'],
          rows: [
            ['1', 'load `kills` → register = 41', '—', '41'],
            ['2', '—', 'load `kills` → register = 41', '41'],
            ['3', 'add 1 → 42', '—', '41'],
            ['4', 'store 42', '—', '42'],
            ['5', '—', 'add 1 → 42', '42'],
            ['6', '—', 'store 42', '**42** (should be 43)'],
          ],
        },
        {
          type: 'p',
          text: 'Both threads read the same old value, so one increment overwrites the other. This is the **lost update**, and it happens thousands of times per run because both threads hammer the counter constantly.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The optimized build "works" — which is worse',
          text: 'Compiled with `-O2`, the same program printed `200000` five times in a row. GCC turned each loop into a single `add $100000` instruction, shrinking the race window to almost nothing. The bug is still there — it is undefined behavior — but now it hides until a change in timing, compiler or platform exposes it in front of players.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Data races: the precise definition',
      blocks: [
        {
          type: 'definition',
          term: 'Data race',
          text: 'Two accesses to the **same memory location** from **different threads**, where **at least one is a write**, at least one is not atomic, and nothing orders them (no lock, join or other synchronization between them). A program with a data race has undefined behavior.',
        },
        {
          type: 'p',
          text: 'Every part of the definition matters. Two threads only *reading* the same data — say, a `const` level layout — is perfectly safe. Two threads writing *different* elements of a vector is safe too: they are different memory locations. The danger is the combination of sharing, writing and missing synchronization.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is a data race undefined behavior, not just "a wrong number"?',
          text: 'Because the standard lets compilers and CPUs assume your code is single-threaded *between synchronization points*. That assumption allows keeping values in registers, reordering loads and stores, and merging writes — optimizations that make all code faster. A data race breaks the assumption, so the standard cannot say what happens. In practice you can get lost updates, values that never change, half-written ("torn") values, and loops that never end.',
        },
        {
          type: 'code',
          code: `bool levelLoaded = false;          // plain bool, shared

void loaderThread() {
    loadLevel();
    levelLoaded = true;            // write...
}

void gameThread() {
    while (!levelLoaded) {         // ...racing read
        // wait
    }
    startLevel();
}`,
          annotations: [
            { lines: '9-11', text: 'The compiler sees that nothing in this loop modifies `levelLoaded` *in this thread*, so it may load it once and loop forever. That is a legal optimization for race-free code. (The fix is `std::atomic<bool>`, coming in the next lesson.)' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Data race vs race condition',
          text: 'A **[[data-race]]** is the specific UB defined above. A **[[race-condition]]** is any bug where the result depends on timing — and it can happen even when every access is properly locked. For example, "check if the chest is unopened, then open it" with each step locked separately lets two players both see "unopened" and both get the loot. Locks fix data races; fixing race conditions requires locking the right *operations*.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'There is no such thing as a benign data race',
          text: 'It is tempting to think "it is just a stats counter, a few lost updates are fine". But UB is not limited to the wrong number — the compiler is entitled to transform the surrounding code in ways that break worse. Run your tests under ThreadSanitizer (`-fsanitize=thread`, shown in the debugging lesson) and fix every report.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'truefalse',
      prompt: 'Two threads reading the same `const std::vector<int>` at the same time, with no thread modifying it, is a data race.',
      answer: false,
      explanation:
        'A data race requires at least one **write**. Any number of threads may read the same data simultaneously without synchronization, as long as nobody modifies it during that time. This is why immutable data — like a loaded level\'s static geometry or a table of weapon stats — is so pleasant in multithreaded code: share it freely. Standard library containers guarantee that concurrent calls to `const` member functions are safe.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'std::mutex: one thread at a time',
      blocks: [
        {
          type: 'p',
          text: 'A [[mutex]] (*mut*ual *ex*clusion) is a lock that only one thread can hold at a time. A thread calls `lock()`; if another thread already holds the mutex, it **blocks** — waits — until the owner calls `unlock()`. The code between lock and unlock is a [[critical-section]]: only one thread can be inside it at once.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <mutex>
#include <thread>

int kills = 0;
std::mutex killsMutex;

void hunt() {
    for (int i = 0; i < 100000; ++i) {
        std::lock_guard<std::mutex> lock{killsMutex};
        ++kills;
    }
}

int main() {
    std::thread a{hunt};
    std::thread b{hunt};
    a.join();
    b.join();
    std::cout << "Kills: " << kills << '\\n';
}`,
          output: 'Kills: 200000',
          annotations: [
            { lines: 6, text: 'One mutex guards one piece of shared data. Keep them side by side (or in the same class) so it is obvious what protects what.' },
            { lines: 10, text: '`std::lock_guard` locks the mutex in its constructor and unlocks it in its destructor, at the end of each loop iteration. If thread B holds the lock, thread A waits here.' },
            { lines: 11, text: 'Now the load-add-store sequence can never interleave with the other thread\'s. The output is 200,000 every time.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does a mutex also fix visibility?',
          text: 'Mutual exclusion alone would not be enough if thread A\'s write sat in a register or CPU cache that thread B never sees. The C++ memory model therefore defines that **unlocking a mutex synchronizes with the next lock** of the same mutex: everything written before the unlock is visible after the lock. The compiler and CPU must honour this, inserting whatever fences the hardware needs.',
        },
        {
          type: 'compare',
          left: {
            title: 'Manual lock() / unlock()',
            tone: 'bad',
            code: `killsMutex.lock();
++kills;
if (kills > limit) {
    return;          // unlock skipped!
}
killsMutex.unlock();`,
            text: 'Any early `return`, `break` or exception skips the unlock, and the mutex stays locked forever.',
          },
          right: {
            title: 'RAII lock',
            tone: 'good',
            code: `std::lock_guard lock{killsMutex};
++kills;
if (kills > limit) {
    return;          // destructor unlocks
}`,
            text: 'The destructor runs on every exit path, including exceptions. This is [[raii|RAII]] applied to locks.',
          },
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Class template argument deduction',
          text: 'Since C++17 you can write `std::lock_guard lock{killsMutex};` and let the compiler deduce `<std::mutex>`. Both forms are equivalent; the rest of this unit uses the shorter one.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'bug',
      prompt: 'Several threads call `tryAddItem`. After a while every thread freezes forever. Tap the line that causes it.',
      code: `#include <mutex>
#include <vector>

std::mutex inventoryMutex;
std::vector<int> inventory;

bool tryAddItem(int itemId) {
    inventoryMutex.lock();
    if (inventory.size() >= 20) {
        return false;            // bag is full
    }
    inventory.push_back(itemId);
    inventoryMutex.unlock();
    return true;
}`,
      bugLines: [10],
      hint: 'Follow the path taken when the bag is full.',
      explanation:
        'When the bag is full, line 10 returns while the mutex is still locked. The next call from any thread blocks forever in `lock()` — and if the *same* thread calls again, locking a `std::mutex` it already owns is undefined behavior (usually a self-deadlock). Replace lines 8 and 13 with `std::lock_guard lock{inventoryMutex};` at the top: the destructor unlocks on every return path, and you can never forget again.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'RAII locks: lock_guard, scoped_lock, unique_lock',
      blocks: [
        {
          type: 'p',
          text: 'The standard library offers several RAII lock types. You will use these three almost exclusively — never bare `lock()` / `unlock()` calls.',
        },
        {
          type: 'table',
          headers: ['Lock', 'Since', 'What it gives you', 'Use it when'],
          rows: [
            ['[[lock-guard|std::lock_guard]]', 'C++11', 'Locks one mutex for the whole scope. Cannot unlock early. Smallest and simplest.', 'You need one mutex for a whole block'],
            ['`std::scoped_lock`', 'C++17', 'Like `lock_guard`, but can lock **several** mutexes at once without deadlock', 'The modern default; required when locking two or more mutexes'],
            ['[[unique-lock|std::unique_lock]]', 'C++11', 'Can unlock and relock, defer locking, try-lock, time out, and be moved', 'You must release early, or use a condition variable'],
          ],
        },
        {
          type: 'code',
          code: `#include <mutex>
#include <string>
#include <vector>

std::mutex chatMutex;
std::vector<std::string> chatLog;

void postMessage(const std::string& msg) {
    std::unique_lock lock{chatMutex};
    chatLog.push_back(msg);
    const auto count = chatLog.size();
    lock.unlock();                 // release before slow work
    writeToDisk(msg, count);       // other threads can post now
}`,
          annotations: [
            { lines: 9, text: 'Locked on construction, just like `lock_guard`.' },
            { lines: '10-11', text: 'Do only the work that touches shared data while holding the lock, copying out anything needed later.' },
            { lines: 12, text: '`unique_lock` can unlock before the end of the scope. If we returned early instead, its destructor would still unlock correctly (it remembers whether it currently owns the mutex).' },
            { lines: 13, text: 'Disk I/O can take milliseconds. Doing it outside the lock lets other threads keep posting.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Always name your lock',
          text: '`std::lock_guard lock{m};` locks until the end of the scope. `std::lock_guard{m};` — without a name — creates a **temporary** that locks and unlocks immediately, at the end of that statement, leaving the following code unprotected. It compiles without complaint. The C++ Core Guidelines (CP.44) warn about exactly this.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Locks in Unreal',
          text: 'Unreal has its own equivalents: `FCriticalSection` is a mutex, and `FScopeLock Lock(&CriticalSection);` is its RAII lock guard. `FRWLock` is a readers-writer lock, like the standard `std::shared_mutex` with `std::shared_lock`, which lets many readers in at once but only one writer.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'mcq',
      prompt: 'The first line of a function is `std::scoped_lock{bankMutex};`, followed by code that updates the guild bank. What is wrong?',
      options: [
        {
          text: 'Nothing: the bank is protected until the end of the function',
          why: 'That would be true for a *named* lock. This one has no name.',
        },
        {
          text: 'It does not compile, because `scoped_lock` needs template arguments',
          why: 'Since C++17, class template argument deduction works out `std::scoped_lock<std::mutex>` from the argument.',
        },
        {
          text: 'The unnamed temporary is destroyed at the end of the statement, so the mutex is unlocked before the bank is touched',
          correct: true,
          why: 'Temporaries live only until the end of the full expression. The lock and unlock happen back to back, protecting nothing.',
        },
        {
          text: 'It deadlocks, because the temporary never releases the mutex',
          why: 'The opposite: it releases immediately. The danger is a silent data race, not a deadlock.',
        },
      ],
      explanation:
        'An RAII lock protects exactly as long as the lock *object* lives. A named variable lives until the end of its scope; an unnamed temporary dies at the semicolon. Write `std::scoped_lock lock{bankMutex};`. Some static analyzers flag the unnamed form, but compilers accept it silently.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Deadlock: two threads, two locks, zero progress',
      blocks: [
        {
          type: 'p',
          text: 'Locks fix data races but introduce a new failure. Imagine trading gold between two players, each protected by their own mutex. Thread 1 transfers from Alice to Bob; thread 2 transfers from Bob to Alice at the same moment:',
        },
        {
          type: 'code',
          code: `void transfer(Player& from, Player& to, int amount) {
    std::lock_guard lockFrom{from.m};
    std::lock_guard lockTo{to.m};
    from.gold -= amount;
    to.gold += amount;
}`,
          annotations: [
            { lines: 2, text: 'Thread 1 locks Alice\'s mutex. At the same moment, thread 2 (with the arguments swapped) locks Bob\'s.' },
            { lines: 3, text: 'Thread 1 now waits for Bob\'s mutex, held by thread 2. Thread 2 waits for Alice\'s, held by thread 1. Neither will ever let go: a [[deadlock]].' },
          ],
        },
        {
          type: 'p',
          text: 'A deadlock needs four ingredients at once: exclusive locks, threads that *hold* one lock while waiting for another, no way to forcibly take a lock away, and a **cycle** of waiting. Remove any one and deadlock is impossible. The cycle is the one you control.',
        },
        {
          type: 'list',
          items: [
            '**Lock several mutexes in one step** with `std::scoped_lock lock{a.m, b.m};`. It uses a deadlock-avoidance algorithm (the same one as `std::lock`), so the order you list them in does not matter.',
            '**Always acquire locks in a fixed global order** when you cannot take them in one step — for example, by player ID or by a documented hierarchy ("world lock before actor lock").',
            '**Never call unknown code while holding a lock**: callbacks, virtual functions and delegates might take locks of their own, creating cycles you cannot see.',
            '**Keep nesting to a minimum.** One lock at a time cannot form a cycle.',
          ],
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <mutex>
#include <thread>

struct Player {
    explicit Player(int startGold) : gold{startGold} {}
    int gold;
    std::mutex m;
};

void transfer(Player& from, Player& to, int amount) {
    std::scoped_lock lock{from.m, to.m};   // both, deadlock-free
    if (from.gold >= amount) {
        from.gold -= amount;
        to.gold += amount;
    }
}

int main() {
    Player alice{1000};
    Player bob{1000};
    std::thread t1{[&] {
        for (int i = 0; i < 10000; ++i) transfer(alice, bob, 3);
    }};
    std::thread t2{[&] {
        for (int i = 0; i < 10000; ++i) transfer(bob, alice, 2);
    }};
    t1.join();
    t2.join();
    std::cout << "Total gold: " << alice.gold + bob.gold << '\\n';
}`,
          output: 'Total gold: 2000',
          annotations: [
            { lines: 12, text: '`std::scoped_lock` acquires both mutexes or neither, in an order that cannot deadlock — even though the two threads pass them in opposite orders.' },
            { lines: '13-16', text: 'The check and the update happen under the same lock, so the balance can never go negative between them (no race condition either).' },
            { lines: 30, text: 'How much each player ends with depends on timing, but gold is never created or destroyed: the total is always 2000. Invariants like this are what locks protect.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Do not transfer to yourself',
          text: '`transfer(alice, alice, 5)` would ask `scoped_lock` to lock the same mutex twice, which is undefined behavior for `std::mutex`. Real code checks `if (&from == &to) return;` first.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'Thread 1 calls `transfer(alice, bob, 10)` while thread 2 calls `transfer(bob, alice, 5)`, using the version that takes `std::lock_guard lockFrom{from.m};` and then `std::lock_guard lockTo{to.m};`. What can happen?',
      options: [
        {
          text: 'A data race on `gold`, because the two threads use different lock orders',
          why: 'Every access to `gold` happens while holding that player\'s mutex, so there is no data race. The problem is waiting, not unsynchronized access.',
        },
        {
          text: 'Nothing bad: RAII guarantees that both locks are released',
          why: 'RAII guarantees release *when the guard is destroyed*. A deadlocked thread never reaches that point.',
        },
        {
          text: 'A compile error, since two `lock_guard`s cannot be active at once',
          why: 'Nesting guards for different mutexes is legal; it is just risky without a consistent order.',
        },
        {
          text: 'Occasionally, a deadlock: each thread holds one mutex and waits forever for the other',
          correct: true,
          why: 'If both threads take their first lock before either takes its second, they wait on each other in a cycle.',
        },
      ],
      explanation:
        'Deadlocks are timing-dependent, so this code can pass thousands of test runs and then freeze a live server. The structural fix is to remove the cycle: lock both with one `std::scoped_lock lock{from.m, to.m};`, or always lock the player with the lower ID first.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Lock granularity: what to protect, and for how long',
      blocks: [
        {
          type: 'p',
          text: 'Correct locking is the first goal; efficient locking is the second. Our kill counter locks 200,000 times, and each time the threads may fight over the mutex (*contention*). Since the threads only need the total at the end, they can count privately and lock **once**:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <mutex>
#include <thread>

int kills = 0;
std::mutex killsMutex;

void hunt() {
    int localKills = 0;
    for (int i = 0; i < 100000; ++i) {
        ++localKills;                 // private: no sharing, no lock
    }
    std::lock_guard lock{killsMutex};
    kills += localKills;              // one locked update
}

int main() {
    std::thread a{hunt};
    std::thread b{hunt};
    a.join();
    b.join();
    std::cout << "Kills: " << kills << '\\n';
}`,
          output: 'Kills: 200000',
          annotations: [
            { lines: 9, text: 'Each thread has its own stack, so `localKills` is never shared.' },
            { lines: '13-14', text: 'Only the final merge touches shared data. Two lock operations in total instead of 200,000.' },
          ],
        },
        {
          type: 'table',
          headers: ['Granularity', 'Pros', 'Cons'],
          rows: [
            ['**Coarse** — one big lock (e.g. the whole inventory system)', 'Simple; invariants across many objects are easy to keep', 'Threads queue up behind each other, losing parallelism'],
            ['**Fine** — many small locks (e.g. one per inventory slot)', 'More threads can work at once', 'More overhead, more deadlock risk, and multi-object invariants become hard'],
          ],
        },
        {
          type: 'list',
          items: [
            '**Hold locks briefly**: compute outside, then lock, publish, unlock.',
            '**Never do slow things while locked**: file or network I/O, waiting on another thread, or heavy allocation.',
            '**Lock whole operations, not individual fields.** If `health` and `isDead` must agree, one lock must cover both updates — otherwise you have a race condition despite every access being locked.',
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'What a lock costs',
          text: 'Locking an *uncontended* mutex is cheap — typically tens of nanoseconds, with no call into the operating system. *Contention* is what hurts: a thread that finds the mutex taken may have to sleep and be woken by the OS, costing microseconds, and threads that constantly wait for each other effectively run one at a time. Reduce how often and how long threads need the same lock.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'fill',
      prompt: 'Complete the function so it swaps two players\' weapons safely, locking both players\' mutexes in one deadlock-free step.',
      template: `#include <___>
#include <utility>

void swapWeapons(Player& a, Player& b) {
    std::___ lock{a.m, b.m};
    std::swap(a.weapon, b.weapon);
}`,
      blanks: [{ answers: ['mutex'] }, { answers: ['scoped_lock'] }],
      wordBank: ['mutex', 'thread', 'atomic', 'scoped_lock', 'lock_guard', 'unique_lock'],
      explanation:
        '`std::scoped_lock` and `std::mutex` live in `<mutex>`. `scoped_lock` is the only one of the three lock types that accepts several mutexes and locks them with a deadlock-avoidance algorithm. `lock_guard` and `unique_lock` each manage exactly one mutex, so `lock_guard lock{a.m, b.m}` would not compile — and nesting two of them invites the deadlock from the previous card.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Condition variables: waiting without spinning',
      blocks: [
        {
          type: 'p',
          text: 'A worker thread often has nothing to do until another thread gives it a job. Checking a queue in a tight loop ("spinning") burns a whole core doing nothing. A [[condition-variable]] lets the thread **sleep** until notified.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <condition_variable>
#include <iostream>
#include <mutex>
#include <queue>
#include <string>
#include <thread>
#include <utility>

std::mutex queueMutex;
std::condition_variable queueReady;
std::queue<std::string> jobs;
bool shuttingDown = false;

void worker() {
    while (true) {
        std::unique_lock lock{queueMutex};
        queueReady.wait(lock, [] {
            return !jobs.empty() || shuttingDown;
        });
        if (jobs.empty()) {
            return;               // shutdown + queue drained
        }
        std::string job = std::move(jobs.front());
        jobs.pop();
        lock.unlock();            // work without the lock
        std::cout << "Processing " << job << '\\n';
    }
}

int main() {
    std::thread t{worker};
    for (const char* name : {"pathfinding", "loot roll", "autosave"}) {
        {
            std::lock_guard lock{queueMutex};
            jobs.push(name);
        }
        queueReady.notify_one();
    }
    {
        std::lock_guard lock{queueMutex};
        shuttingDown = true;
    }
    queueReady.notify_one();
    t.join();
    std::cout << "Worker finished\\n";
}`,
          output: 'Processing pathfinding\nProcessing loot roll\nProcessing autosave\nWorker finished',
          annotations: [
            { lines: '9-12', text: 'The shared state — the queue and the shutdown flag — and the one mutex that protects all of it.' },
            { lines: 16, text: '`wait` needs a `std::unique_lock`, because it must unlock the mutex while sleeping and relock it on waking — something `lock_guard` cannot do.' },
            { lines: '17-19', text: 'Atomically: release the lock and sleep. When woken, relock and check the predicate; if it is false, sleep again. The thread only proceeds when there is work or it is time to quit.' },
            { lines: '25-26', text: 'The job is processed outside the lock, so `main` can keep queueing new jobs meanwhile.' },
            { lines: '33-37', text: 'Modify the shared state **under the lock**, then notify. Changing it without the lock could let the worker check the predicate, miss the change, and sleep forever.' },
            { lines: '39-43', text: 'Shutdown is just another state change plus a notification. The worker drains the queue first, so the output is always in this order.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does wait take a predicate?',
          text: 'Two reasons. **Spurious wakeups**: the OS is allowed to wake a waiting thread for no reason, so the thread must re-check whether there is really work. **Missed notifications**: if `notify_one()` happens before the worker starts waiting, the notification is lost — but the predicate sees the non-empty queue and does not wait at all. The condition variable is only the doorbell; the predicate checks whether a package actually arrived.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'Why is it important to call `queueReady.wait(lock, predicate)` rather than plain `queueReady.wait(lock)`?',
      options: [
        {
          text: 'The predicate chooses which waiting thread gets woken by `notify_one()`',
          why: 'You cannot choose which thread `notify_one()` wakes. The predicate runs in the thread that was woken.',
        },
        {
          text: 'Without a predicate, `wait` does not release the mutex while sleeping',
          why: 'Both overloads release the mutex while waiting. The predicate version simply loops around the plain one.',
        },
        {
          text: 'The thread may wake spuriously or miss a notification sent before it waited; re-checking the real state handles both',
          correct: true,
          why: 'Exactly. The predicate turns "I was woken" into "the condition I care about is actually true".',
        },
        {
          text: 'The predicate makes waiting faster by avoiding the operating system',
          why: 'The predicate adds a cheap check; the sleeping and waking still go through the OS.',
        },
      ],
      explanation:
        '`wait(lock, pred)` is equivalent to `while (!pred()) wait(lock);`. Because condition variables carry no memory of past notifications and may wake without one, correct code always waits for a *condition on shared state*, protected by the same mutex — never for the notification itself.',
    },
  ],
  takeaways: [
    'A data race — unsynchronized access to the same memory from two threads, at least one writing — is undefined behavior, not just a wrong number.',
    '`++counter` is load, add, store; interleaving those steps loses updates.',
    'A mutex gives mutual exclusion and visibility: an unlock synchronizes with the next lock.',
    'Never call `lock()` / `unlock()` by hand; use `lock_guard`, `scoped_lock` or `unique_lock` — and always give the lock a name.',
    'Deadlock needs a cycle of waiting; prevent it with `std::scoped_lock` for several mutexes or a fixed lock order, and never call unknown code while locked.',
    'Hold locks briefly, keep slow work outside them, and lock whole operations so invariants hold.',
    'Condition variables let threads sleep until work arrives; always wait with a predicate on state protected by the mutex.',
  ],
  reading: [
    {
      title: 'Memory model: threads and data races',
      url: 'https://en.cppreference.com/w/cpp/language/memory_model',
      source: 'cppreference',
      note: 'The standard\'s definitions of memory location, conflict and data race.',
    },
    {
      title: 'std::scoped_lock',
      url: 'https://en.cppreference.com/w/cpp/thread/scoped_lock',
      source: 'cppreference',
      note: 'Locking several mutexes at once with deadlock avoidance, with an example.',
    },
    {
      title: 'std::condition_variable',
      url: 'https://en.cppreference.com/w/cpp/thread/condition_variable',
      source: 'cppreference',
      note: 'The exact waiting and notification rules, including spurious wakeups.',
    },
    {
      title: 'C++ Core Guidelines: Concurrency',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-concurrency',
      source: 'core-guidelines',
      note: 'CP.20 (use RAII, never plain lock/unlock), CP.21 (use std::lock or scoped_lock) and CP.44 (name your locks).',
    },
  ],
};
