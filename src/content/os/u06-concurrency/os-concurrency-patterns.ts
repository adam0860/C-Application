import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-concurrency-patterns',
  title: 'Thread Pools and Job Systems',
  summary:
    'The patterns real engines are built from: readers–writer locks, thread pools, work queues and work stealing, job systems with dependency counters and fibers as in the Naughty Dog engine, lock-free queues and the ABA problem, and how to choose between them.',
  minutes: 24,
  objectives: [
    'Use `std::shared_mutex` for read-mostly data and explain reader and writer starvation',
    'Build a thread pool that returns results through futures and size it sensibly',
    'Explain why work stealing uses per-worker deques and which end each thread uses',
    'Describe a game-engine job system with dependency counters, and why Naughty Dog runs jobs on fibers',
    'Explain lock-free progress, the ABA problem and the standard fixes at a conceptual level',
    'Choose a concurrency pattern for a given engine problem',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Readers–writer locks',
      blocks: [
        {
          type: 'p',
          text: 'Much shared data in a game is read constantly and written rarely: the asset registry, the gameplay tag table, the config, the navigation mesh between rebuilds. A plain mutex lets only one reader in at a time, although readers cannot interfere with each other. A **[[readers-writer-lock|readers–writer lock]]** has two modes: any number of threads may hold it **shared** (to read), or exactly one may hold it **exclusive** (to write), never both.',
        },
        {
          type: 'code',
          runnable: true,
          title: 'asset_registry.cpp',
          code: `#include <iostream>
#include <map>
#include <mutex>
#include <shared_mutex>
#include <string>
#include <thread>
#include <vector>

class AssetRegistry {
public:
    int find(const std::string& name) const {
        std::shared_lock lock{m_};           // many readers at once
        auto it = ids_.find(name);
        return it == ids_.end() ? -1 : it->second;
    }
    void add(const std::string& name, int id) {
        std::unique_lock lock{m_};           // one writer, no readers
        ids_[name] = id;
    }
private:
    mutable std::shared_mutex m_;
    std::map<std::string, int> ids_;
};

int main() {
    AssetRegistry registry;
    registry.add("rifle.mesh", 7);
    std::vector<int> found(4);
    {
        std::vector<std::jthread> readers;
        for (int r = 0; r < 4; ++r) {
            readers.emplace_back([&, r] {
                int hits = 0;
                for (int i = 0; i < 10000; ++i) {
                    if (registry.find("rifle.mesh") == 7) ++hits;
                }
                found[r] = hits;
            });
        }
        std::jthread writer{[&] { registry.add("shotgun.mesh", 9); }};
    }
    for (int r = 0; r < 4; ++r) {
        std::cout << "reader " << r << ": " << found[r] << " hits\\n";
    }
    std::cout << "shotgun: " << registry.find("shotgun.mesh") << '\\n';
}`,
          output: 'reader 0: 10000 hits\nreader 1: 10000 hits\nreader 2: 10000 hits\nreader 3: 10000 hits\nshotgun: 9',
          annotations: [
            { lines: 12, text: '`std::shared_lock` takes the mutex in shared mode: other readers can hold it at the same time.' },
            { lines: 17, text: '`std::unique_lock` (or `lock_guard`) on a `shared_mutex` takes it exclusively: it waits until all readers have left, and keeps new ones out.' },
            { lines: 21, text: '`mutable`, so the `const` member function `find` can lock it. Locking does not change the registry\'s logical state.' },
            { lines: 40, text: 'The writer inserts a different key while readers run. The `std::map` is never read while it is being modified, so the readers\' lookups always succeed.' },
          ],
        },
        {
          type: 'p',
          text: 'The hard design question is **who goes next** when a writer is waiting and more readers arrive. Letting readers in keeps throughput high but can **[[starvation|starve the writer]]** forever under steady read traffic. Making new readers queue behind a waiting writer (writer preference) avoids that but can starve readers under heavy writing. The C++ standard leaves the policy to the implementation; glibc\'s `pthread_rwlock_t` prefers readers by default and has a non-portable option to prefer writers, and Windows\' `SRWLOCK` (which also offers shared mode via `AcquireSRWLockShared`) does not guarantee any order.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Not automatically faster',
          text: 'A shared lock still writes to the lock\'s state (the reader count), so every reader on every core bounces the same cache line, and `shared_mutex` has more bookkeeping than `mutex`. For short critical sections, like the map lookup above, a plain mutex is often just as fast. Readers–writer locks pay off when reads are long (walking a large structure) and writes are rare. Measure before switching.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal',
          text: 'Unreal\'s `FRWLock` with `FReadScopeLock` and `FWriteScopeLock` is the same idea, built on `SRWLOCK` on Windows.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'A navigation mesh is protected by a reader-preferring readers–writer lock. Forty AI agents query it continuously from worker threads, and the rebuild thread that applies new obstacles almost never gets to run. What is happening?',
      options: [
        { text: 'Deadlock between the readers and the writer', why: 'Readers keep making progress, so nothing is deadlocked. Only the writer is stuck.' },
        { text: 'Writer starvation: there is always at least one reader holding the lock, and new readers are admitted ahead of the waiting writer', correct: true, why: 'With overlapping readers the shared count never reaches zero, so the exclusive request is never granted.' },
        { text: 'A data race, because readers do not take the lock exclusively', why: 'Concurrent reads of unchanging data are not a data race; that is the whole point of shared mode.' },
        { text: 'Priority inversion caused by the AI agents', why: 'Priority inversion involves a lock holder being preempted by unrelated medium-priority work. Here the issue is the lock\'s admission policy.' },
      ],
      explanation:
        'Starvation is a property of the lock\'s fairness policy. Fixes: a writer-preferring lock (new readers wait once a writer is queued), shorter read sections so the count drops to zero more often, or a different design: build the new navmesh on the side and publish it with an atomic pointer swap, so readers never block the writer at all (the idea behind RCU, later in this lesson).',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Thread pools',
      blocks: [
        {
          type: 'p',
          text: 'The threads lesson measured about 12 µs to create and join a thread. Engines run hundreds of small tasks per frame, so instead of a thread per task they keep a [[thread-pool]]: a fixed set of worker threads, created once, that take tasks from a shared queue. It is the [[bounded-buffer|bounded buffer]] from the last unit, with tasks as the items and workers as the consumers. Results come back through futures:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'thread_pool.cpp',
          code: `#include <condition_variable>
#include <functional>
#include <future>
#include <iostream>
#include <memory>
#include <mutex>
#include <queue>
#include <thread>
#include <vector>

class ThreadPool {
public:
    explicit ThreadPool(unsigned n) {
        for (unsigned i = 0; i < n; ++i) {
            workers_.emplace_back([this] { run(); });
        }
    }
    ~ThreadPool() {
        {
            std::lock_guard lock{m_};
            stopping_ = true;
        }
        cv_.notify_all();
    }                                     // workers_ joins here

    template <typename F>
    auto submit(F f) -> std::future<decltype(f())> {
        using R = decltype(f());
        auto task =
            std::make_shared<std::packaged_task<R()>>(std::move(f));
        std::future<R> result = task->get_future();
        {
            std::lock_guard lock{m_};
            jobs_.push([task] { (*task)(); });
        }
        cv_.notify_one();
        return result;
    }

private:
    void run() {
        while (true) {
            std::function<void()> job;
            {
                std::unique_lock lock{m_};
                cv_.wait(lock, [this] {
                    return stopping_ || !jobs_.empty();
                });
                if (jobs_.empty()) return;  // stopping, queue drained
                job = std::move(jobs_.front());
                jobs_.pop();
            }
            job();                          // run outside the lock
        }
    }

    std::mutex m_;
    std::condition_variable cv_;
    std::queue<std::function<void()>> jobs_;
    bool stopping_ = false;
    std::vector<std::jthread> workers_;     // last: joined first
};

int main() {
    ThreadPool pool{4};
    std::vector<std::future<long>> results;
    for (long chunk = 0; chunk < 8; ++chunk) {
        results.push_back(pool.submit([chunk] {
            long sum = 0;
            for (long i = chunk * 1000; i < (chunk + 1) * 1000; ++i) {
                sum += i;
            }
            return sum;
        }));
    }
    long total = 0;
    for (auto& r : results) total += r.get();
    std::cout << "sum of 0..7999 = " << total << '\\n';
}`,
          output: 'sum of 0..7999 = 31996000',
          annotations: [
            { lines: '18-24', text: 'Shutdown: set the flag under the lock, wake everyone, and let the member destructors join the workers. Each worker drains the queue before exiting.' },
            { lines: '29-31', text: '`std::packaged_task` wraps the callable and connects it to a `std::future`. It is move-only, but `std::function` requires copyable callables, so we share it through a `shared_ptr` (C++23\'s `std::move_only_function` removes this workaround).' },
            { lines: '45-47', text: 'The bounded-buffer wait: sleep until there is a job or the pool is shutting down.' },
            { lines: 53, text: 'Run the job **without** the lock, so other workers can take jobs meanwhile. Holding the queue lock while running jobs would turn the pool into a single thread.' },
            { lines: 61, text: 'Declared last, so it is destroyed first: the workers are joined while the mutex, condition variable and queue they use still exist.' },
            { lines: 77, text: '`get()` blocks until that chunk has run. Collecting the futures in submission order makes the result deterministic even though the chunks ran in any order.' },
          ],
        },
        {
          type: 'p',
          text: 'How many workers? For CPU-bound jobs, about one per hardware thread that is not already busy: `std::thread::hardware_concurrency()` minus the game, render and audio threads is a common start. More workers than cores just adds context switches and cache pollution. Blocking work (file reads, network calls) is different: a worker blocked in `read` occupies a thread but no core, so I/O gets its own threads or asynchronous I/O and stays out of the CPU pool.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why std::async is not a thread pool',
          text: '`std::async(std::launch::async, f)` must behave *as if* it started a new thread, and the standard says nothing about reusing threads. Implementations differ (Microsoft\'s uses the Windows thread pool; libstdc++ creates a thread per call), so you cannot rely on its cost or limit its concurrency. Engines therefore own their pools.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'fill',
      prompt: 'Complete the worker loop of a thread pool.',
      template: `void run() {
    while (true) {
        std::function<void()> job;
        {
            std::___ lock{m_};
            cv_.___(lock, [this] {
                return stopping_ || !jobs_.empty();
            });
            if (jobs_.empty()) return;
            job = std::move(jobs_.front());
            jobs_.pop();
        }
        ___();
    }
}`,
      blanks: [{ answers: ['unique_lock'] }, { answers: ['wait'] }, { answers: ['job'] }],
      wordBank: ['unique_lock', 'lock_guard', 'wait', 'notify_one', 'job', 'jobs_.front'],
      explanation:
        'The worker sleeps on the condition variable with a `std::unique_lock` (the only lock `wait` can release and reacquire), waking when there is work or a shutdown. It moves the job out of the queue while holding the lock, then calls `job()` after the inner block has released it. Calling `jobs_.front()()` inside the block instead would run every job under the queue lock, serializing the whole pool.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Work queues and work stealing',
      blocks: [
        {
          type: 'p',
          text: 'A single shared queue has a single shared lock. With eight workers taking jobs that last a few microseconds, they spend a large share of their time fighting over that one lock and bouncing its cache line. The fix used by nearly every modern task scheduler (Intel TBB, Cilk, Go, .NET, Rust\'s Rayon, many engines) is **[[work-stealing|work stealing]]**:',
        },
        {
          type: 'list',
          items: [
            'Each worker has its **own deque** (double-ended queue) of jobs.',
            'A worker pushes new jobs onto the **bottom** of its own deque and pops from the bottom too: last in, first out. The job it just created is the one whose data is hottest in its cache.',
            'Only when its deque is empty does a worker become a **thief**: it picks a victim and steals from the **top** of the victim\'s deque: the oldest job, which in divide-and-conquer code is usually the biggest remaining chunk.',
          ],
        },
        {
  "type": "algo",
  "view": "array",
  "interval": 1400,
  "caption": "Work stealing. Cells 0–4 are W0's deque, 5–9 W1's, 10–14 W2's. The left end of each deque is its top (where thieves steal), the right end its bottom (where the owner works).",
  "frames": [
    {
      "note": "Three workers, each with its own deque (5 cells each). W0 just spawned jobs A to E; W1 has F; W2 has nothing.",
      "array": [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "purple"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "W0",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "W1",
          "color": "purple"
        },
        {
          "index": 10,
          "label": "W2",
          "color": "teal"
        }
      ],
      "dim": [
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14
      ],
      "vars": [
        [
          "W0 runs",
          "—"
        ],
        [
          "W1 runs",
          "—"
        ],
        [
          "W2 runs",
          "—"
        ],
        [
          "finished",
          "—"
        ]
      ]
    },
    {
      "note": "W0 pops **E** from the bottom of its own deque: the job it pushed most recently, whose data is likely still in its cache. No other thread uses this end.",
      "array": [
        "A",
        "B",
        "C",
        "D",
        "·",
        "F",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "purple"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "W0",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "W1",
          "color": "purple"
        },
        {
          "index": 10,
          "label": "W2",
          "color": "teal"
        }
      ],
      "dim": [
        4,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14
      ],
      "vars": [
        [
          "W0 runs",
          "E"
        ],
        [
          "W1 runs",
          "—"
        ],
        [
          "W2 runs",
          "—"
        ],
        [
          "finished",
          "—"
        ]
      ]
    },
    {
      "note": "W1 pops **F** from the bottom of its own deque: the job it pushed most recently, whose data is likely still in its cache. No other thread uses this end.",
      "array": [
        "A",
        "B",
        "C",
        "D",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "W0",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "W1",
          "color": "purple"
        },
        {
          "index": 10,
          "label": "W2",
          "color": "teal"
        }
      ],
      "dim": [
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14
      ],
      "vars": [
        [
          "W0 runs",
          "E"
        ],
        [
          "W1 runs",
          "F"
        ],
        [
          "W2 runs",
          "—"
        ],
        [
          "finished",
          "—"
        ]
      ]
    },
    {
      "note": "W2's deque is empty, so it **steals** A from the **top** of W0's deque: the oldest job, at the opposite end from where W0 works.",
      "array": [
        "B",
        "C",
        "D",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "W0",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "W1",
          "color": "purple"
        },
        {
          "index": 10,
          "label": "W2",
          "color": "teal"
        }
      ],
      "dim": [
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14
      ],
      "vars": [
        [
          "W0 runs",
          "E"
        ],
        [
          "W1 runs",
          "F"
        ],
        [
          "W2 runs",
          "A"
        ],
        [
          "finished",
          "—"
        ]
      ]
    },
    {
      "note": "W0 pops **D** from the bottom of its own deque: the job it pushed most recently, whose data is likely still in its cache. No other thread uses this end.",
      "array": [
        "B",
        "C",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "W0",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "W1",
          "color": "purple"
        },
        {
          "index": 10,
          "label": "W2",
          "color": "teal"
        }
      ],
      "dim": [
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14
      ],
      "vars": [
        [
          "W0 runs",
          "D"
        ],
        [
          "W1 runs",
          "F"
        ],
        [
          "W2 runs",
          "A"
        ],
        [
          "finished",
          "E"
        ]
      ]
    },
    {
      "note": "W1's deque is empty, so it **steals** B from the **top** of W0's deque: the oldest job, at the opposite end from where W0 works.",
      "array": [
        "C",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "W0",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "W1",
          "color": "purple"
        },
        {
          "index": 10,
          "label": "W2",
          "color": "teal"
        }
      ],
      "dim": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14
      ],
      "vars": [
        [
          "W0 runs",
          "D"
        ],
        [
          "W1 runs",
          "B"
        ],
        [
          "W2 runs",
          "A"
        ],
        [
          "finished",
          "E F"
        ]
      ]
    },
    {
      "note": "W2's deque is empty, so it **steals** C from the **top** of W0's deque: the oldest job, at the opposite end from where W0 works.",
      "array": [
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [],
      "pointers": [
        {
          "index": 0,
          "label": "W0",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "W1",
          "color": "purple"
        },
        {
          "index": 10,
          "label": "W2",
          "color": "teal"
        }
      ],
      "dim": [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14
      ],
      "vars": [
        [
          "W0 runs",
          "D"
        ],
        [
          "W1 runs",
          "B"
        ],
        [
          "W2 runs",
          "C"
        ],
        [
          "finished",
          "E F A"
        ]
      ]
    },
    {
      "note": "All six jobs finished. Most operations touched only the worker's own deque; only the steals needed to coordinate with another worker.",
      "array": [
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [],
      "pointers": [
        {
          "index": 0,
          "label": "W0",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "W1",
          "color": "purple"
        },
        {
          "index": 10,
          "label": "W2",
          "color": "teal"
        }
      ],
      "dim": [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14
      ],
      "vars": [
        [
          "W0 runs",
          "—"
        ],
        [
          "W1 runs",
          "—"
        ],
        [
          "W2 runs",
          "—"
        ],
        [
          "finished",
          "E F A D B C"
        ]
      ]
    }
  ]
},
        {
          type: 'callout',
          variant: 'why',
          title: 'Why opposite ends?',
          text: 'The owner and thieves work at different ends, so they only conflict when the deque is down to its last job. The owner\'s push and pop can then be nearly free (plain loads and stores plus one fence in the Chase–Lev deque, the standard lock-free design from 2005), and the cost of synchronization is paid only by thieves, who by definition had nothing better to do. Stealing big, old chunks also means a thief steals rarely.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Idle workers',
          text: 'A worker that finds nothing to steal should not spin forever. Schedulers spin briefly, then sleep on a [[semaphore]] or [[futex]] and are woken when new work is pushed. Getting this balance right is a big part of why a good job system feels responsive without burning a laptop battery.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'In a work-stealing scheduler, a thief steals from the same end of the victim\'s deque that the victim pops its own jobs from, so that it gets the hottest job.',
      answer: false,
      explanation:
        'Thieves take from the **top** (oldest), owners from the **bottom** (newest). Using opposite ends keeps owner and thieves from colliding except when one job is left, lets the owner keep its cache-hot recent work, and gives the thief the largest old chunk, so it needs to steal less often. Stealing the victim\'s hottest job would move that data to another core\'s cache, which is the opposite of the goal.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Job systems in game engines',
      blocks: [
        {
          type: 'p',
          text: 'A game frame is not a bag of independent tasks: physics needs the animation poses, culling needs the physics results, and rendering needs the culled list. A **job system** (Unreal calls it the [[task-graph]]) runs small jobs on a pool of workers and adds **dependencies**. The common mechanism is a counter per job (or per group of jobs) holding the number of unfinished inputs. When a job finishes, it decrements each dependent\'s counter, and whoever brings a counter to zero makes that job ready. Watch one frame run on two workers:',
        },
        {
  "type": "algo",
  "view": "graph",
  "nodes": [
    {
      "id": "input",
      "x": 40,
      "y": 130,
      "label": "In"
    },
    {
      "id": "ai",
      "x": 140,
      "y": 50,
      "label": "AI"
    },
    {
      "id": "anim",
      "x": 140,
      "y": 130,
      "label": "Anim"
    },
    {
      "id": "physics",
      "x": 240,
      "y": 90,
      "label": "Phys"
    },
    {
      "id": "cull",
      "x": 320,
      "y": 90,
      "label": "Cull"
    },
    {
      "id": "particles",
      "x": 140,
      "y": 215,
      "label": "FX"
    },
    {
      "id": "render",
      "x": 385,
      "y": 160,
      "label": "Draw"
    }
  ],
  "edges": [
    {
      "from": "input",
      "to": "ai",
      "directed": true
    },
    {
      "from": "input",
      "to": "anim",
      "directed": true
    },
    {
      "from": "ai",
      "to": "physics",
      "directed": true
    },
    {
      "from": "anim",
      "to": "physics",
      "directed": true
    },
    {
      "from": "physics",
      "to": "cull",
      "directed": true
    },
    {
      "from": "input",
      "to": "particles",
      "directed": true
    },
    {
      "from": "cull",
      "to": "render",
      "directed": true
    },
    {
      "from": "particles",
      "to": "render",
      "directed": true
    }
  ],
  "width": 430,
  "height": 270,
  "interval": 1500,
  "caption": "A frame's job graph on two workers (In = input, FX = particles, Draw = render submission). Blue = ready, orange = running, green = done. Notes show remaining dependencies or the worker.",
  "frames": [
    {
      "note": "A frame's jobs and their dependencies. Each job has a counter of unfinished inputs; only `input` starts at 0. Numbers are durations.",
      "nodeColors": [
        {
          "id": "input",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "input",
          "text": "ready (1)"
        },
        {
          "id": "ai",
          "text": "wait 1"
        },
        {
          "id": "anim",
          "text": "wait 1"
        },
        {
          "id": "physics",
          "text": "wait 2"
        },
        {
          "id": "cull",
          "text": "wait 1"
        },
        {
          "id": "particles",
          "text": "wait 1"
        },
        {
          "id": "render",
          "text": "wait 2"
        }
      ],
      "edgeColors": [],
      "vars": [
        [
          "time",
          "0"
        ],
        [
          "W0",
          "idle"
        ],
        [
          "W1",
          "idle"
        ],
        [
          "ready queue",
          "input"
        ]
      ]
    },
    {
      "note": "t = 0: W0 starts input.",
      "nodeColors": [
        {
          "id": "input",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "input",
          "text": "W0 (1)"
        },
        {
          "id": "ai",
          "text": "wait 1"
        },
        {
          "id": "anim",
          "text": "wait 1"
        },
        {
          "id": "physics",
          "text": "wait 2"
        },
        {
          "id": "cull",
          "text": "wait 1"
        },
        {
          "id": "particles",
          "text": "wait 1"
        },
        {
          "id": "render",
          "text": "wait 2"
        }
      ],
      "edgeColors": [],
      "vars": [
        [
          "time",
          "0"
        ],
        [
          "W0",
          "input"
        ],
        [
          "W1",
          "idle"
        ],
        [
          "ready queue",
          "empty"
        ]
      ]
    },
    {
      "note": "t = 1: input finished; each dependent's counter drops by one; now ready: ai, anim, particles.",
      "nodeColors": [
        {
          "id": "input",
          "color": "green"
        },
        {
          "id": "ai",
          "color": "blue"
        },
        {
          "id": "anim",
          "color": "blue"
        },
        {
          "id": "particles",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "ai",
          "text": "ready (3)"
        },
        {
          "id": "anim",
          "text": "ready (2)"
        },
        {
          "id": "physics",
          "text": "wait 2"
        },
        {
          "id": "cull",
          "text": "wait 1"
        },
        {
          "id": "particles",
          "text": "ready (2)"
        },
        {
          "id": "render",
          "text": "wait 2"
        }
      ],
      "edgeColors": [
        {
          "from": "input",
          "to": "ai",
          "color": "green"
        },
        {
          "from": "input",
          "to": "anim",
          "color": "green"
        },
        {
          "from": "input",
          "to": "particles",
          "color": "green"
        }
      ],
      "vars": [
        [
          "time",
          "1"
        ],
        [
          "W0",
          "idle"
        ],
        [
          "W1",
          "idle"
        ],
        [
          "ready queue",
          "ai, anim, particles"
        ]
      ]
    },
    {
      "note": "t = 1: W0 starts ai; W1 starts anim.",
      "nodeColors": [
        {
          "id": "input",
          "color": "green"
        },
        {
          "id": "ai",
          "color": "orange"
        },
        {
          "id": "anim",
          "color": "orange"
        },
        {
          "id": "particles",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "ai",
          "text": "W0 (3)"
        },
        {
          "id": "anim",
          "text": "W1 (2)"
        },
        {
          "id": "physics",
          "text": "wait 2"
        },
        {
          "id": "cull",
          "text": "wait 1"
        },
        {
          "id": "particles",
          "text": "ready (2)"
        },
        {
          "id": "render",
          "text": "wait 2"
        }
      ],
      "edgeColors": [
        {
          "from": "input",
          "to": "ai",
          "color": "green"
        },
        {
          "from": "input",
          "to": "anim",
          "color": "green"
        },
        {
          "from": "input",
          "to": "particles",
          "color": "green"
        }
      ],
      "vars": [
        [
          "time",
          "1"
        ],
        [
          "W0",
          "ai"
        ],
        [
          "W1",
          "anim"
        ],
        [
          "ready queue",
          "particles"
        ]
      ]
    },
    {
      "note": "t = 3: anim finished; each dependent's counter drops by one; now ready: particles.",
      "nodeColors": [
        {
          "id": "input",
          "color": "green"
        },
        {
          "id": "ai",
          "color": "orange"
        },
        {
          "id": "anim",
          "color": "green"
        },
        {
          "id": "particles",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "ai",
          "text": "W0 (3)"
        },
        {
          "id": "physics",
          "text": "wait 1"
        },
        {
          "id": "cull",
          "text": "wait 1"
        },
        {
          "id": "particles",
          "text": "ready (2)"
        },
        {
          "id": "render",
          "text": "wait 2"
        }
      ],
      "edgeColors": [
        {
          "from": "input",
          "to": "ai",
          "color": "green"
        },
        {
          "from": "input",
          "to": "anim",
          "color": "green"
        },
        {
          "from": "anim",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "input",
          "to": "particles",
          "color": "green"
        }
      ],
      "vars": [
        [
          "time",
          "3"
        ],
        [
          "W0",
          "ai"
        ],
        [
          "W1",
          "idle"
        ],
        [
          "ready queue",
          "particles"
        ]
      ]
    },
    {
      "note": "t = 3: W1 starts particles.",
      "nodeColors": [
        {
          "id": "input",
          "color": "green"
        },
        {
          "id": "ai",
          "color": "orange"
        },
        {
          "id": "anim",
          "color": "green"
        },
        {
          "id": "particles",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "ai",
          "text": "W0 (3)"
        },
        {
          "id": "physics",
          "text": "wait 1"
        },
        {
          "id": "cull",
          "text": "wait 1"
        },
        {
          "id": "particles",
          "text": "W1 (2)"
        },
        {
          "id": "render",
          "text": "wait 2"
        }
      ],
      "edgeColors": [
        {
          "from": "input",
          "to": "ai",
          "color": "green"
        },
        {
          "from": "input",
          "to": "anim",
          "color": "green"
        },
        {
          "from": "anim",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "input",
          "to": "particles",
          "color": "green"
        }
      ],
      "vars": [
        [
          "time",
          "3"
        ],
        [
          "W0",
          "ai"
        ],
        [
          "W1",
          "particles"
        ],
        [
          "ready queue",
          "empty"
        ]
      ]
    },
    {
      "note": "t = 4: ai finished; each dependent's counter drops by one; now ready: physics.",
      "nodeColors": [
        {
          "id": "input",
          "color": "green"
        },
        {
          "id": "ai",
          "color": "green"
        },
        {
          "id": "anim",
          "color": "green"
        },
        {
          "id": "physics",
          "color": "blue"
        },
        {
          "id": "particles",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "physics",
          "text": "ready (3)"
        },
        {
          "id": "cull",
          "text": "wait 1"
        },
        {
          "id": "particles",
          "text": "W1 (2)"
        },
        {
          "id": "render",
          "text": "wait 2"
        }
      ],
      "edgeColors": [
        {
          "from": "input",
          "to": "ai",
          "color": "green"
        },
        {
          "from": "input",
          "to": "anim",
          "color": "green"
        },
        {
          "from": "ai",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "anim",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "input",
          "to": "particles",
          "color": "green"
        }
      ],
      "vars": [
        [
          "time",
          "4"
        ],
        [
          "W0",
          "idle"
        ],
        [
          "W1",
          "particles"
        ],
        [
          "ready queue",
          "physics"
        ]
      ]
    },
    {
      "note": "t = 4: W0 starts physics.",
      "nodeColors": [
        {
          "id": "input",
          "color": "green"
        },
        {
          "id": "ai",
          "color": "green"
        },
        {
          "id": "anim",
          "color": "green"
        },
        {
          "id": "physics",
          "color": "orange"
        },
        {
          "id": "particles",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "physics",
          "text": "W0 (3)"
        },
        {
          "id": "cull",
          "text": "wait 1"
        },
        {
          "id": "particles",
          "text": "W1 (2)"
        },
        {
          "id": "render",
          "text": "wait 2"
        }
      ],
      "edgeColors": [
        {
          "from": "input",
          "to": "ai",
          "color": "green"
        },
        {
          "from": "input",
          "to": "anim",
          "color": "green"
        },
        {
          "from": "ai",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "anim",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "input",
          "to": "particles",
          "color": "green"
        }
      ],
      "vars": [
        [
          "time",
          "4"
        ],
        [
          "W0",
          "physics"
        ],
        [
          "W1",
          "particles"
        ],
        [
          "ready queue",
          "empty"
        ]
      ]
    },
    {
      "note": "t = 5: particles finished; each dependent's counter drops by one.",
      "nodeColors": [
        {
          "id": "input",
          "color": "green"
        },
        {
          "id": "ai",
          "color": "green"
        },
        {
          "id": "anim",
          "color": "green"
        },
        {
          "id": "physics",
          "color": "orange"
        },
        {
          "id": "particles",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "physics",
          "text": "W0 (3)"
        },
        {
          "id": "cull",
          "text": "wait 1"
        },
        {
          "id": "render",
          "text": "wait 1"
        }
      ],
      "edgeColors": [
        {
          "from": "input",
          "to": "ai",
          "color": "green"
        },
        {
          "from": "input",
          "to": "anim",
          "color": "green"
        },
        {
          "from": "ai",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "anim",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "input",
          "to": "particles",
          "color": "green"
        },
        {
          "from": "particles",
          "to": "render",
          "color": "green"
        }
      ],
      "vars": [
        [
          "time",
          "5"
        ],
        [
          "W0",
          "physics"
        ],
        [
          "W1",
          "idle"
        ],
        [
          "ready queue",
          "empty"
        ]
      ]
    },
    {
      "note": "t = 7: physics finished; each dependent's counter drops by one; now ready: cull.",
      "nodeColors": [
        {
          "id": "input",
          "color": "green"
        },
        {
          "id": "ai",
          "color": "green"
        },
        {
          "id": "anim",
          "color": "green"
        },
        {
          "id": "physics",
          "color": "green"
        },
        {
          "id": "cull",
          "color": "blue"
        },
        {
          "id": "particles",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "cull",
          "text": "ready (1)"
        },
        {
          "id": "render",
          "text": "wait 1"
        }
      ],
      "edgeColors": [
        {
          "from": "input",
          "to": "ai",
          "color": "green"
        },
        {
          "from": "input",
          "to": "anim",
          "color": "green"
        },
        {
          "from": "ai",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "anim",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "physics",
          "to": "cull",
          "color": "green"
        },
        {
          "from": "input",
          "to": "particles",
          "color": "green"
        },
        {
          "from": "particles",
          "to": "render",
          "color": "green"
        }
      ],
      "vars": [
        [
          "time",
          "7"
        ],
        [
          "W0",
          "idle"
        ],
        [
          "W1",
          "idle"
        ],
        [
          "ready queue",
          "cull"
        ]
      ]
    },
    {
      "note": "t = 7: W0 starts cull.",
      "nodeColors": [
        {
          "id": "input",
          "color": "green"
        },
        {
          "id": "ai",
          "color": "green"
        },
        {
          "id": "anim",
          "color": "green"
        },
        {
          "id": "physics",
          "color": "green"
        },
        {
          "id": "cull",
          "color": "orange"
        },
        {
          "id": "particles",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "cull",
          "text": "W0 (1)"
        },
        {
          "id": "render",
          "text": "wait 1"
        }
      ],
      "edgeColors": [
        {
          "from": "input",
          "to": "ai",
          "color": "green"
        },
        {
          "from": "input",
          "to": "anim",
          "color": "green"
        },
        {
          "from": "ai",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "anim",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "physics",
          "to": "cull",
          "color": "green"
        },
        {
          "from": "input",
          "to": "particles",
          "color": "green"
        },
        {
          "from": "particles",
          "to": "render",
          "color": "green"
        }
      ],
      "vars": [
        [
          "time",
          "7"
        ],
        [
          "W0",
          "cull"
        ],
        [
          "W1",
          "idle"
        ],
        [
          "ready queue",
          "empty"
        ]
      ]
    },
    {
      "note": "t = 8: cull finished; each dependent's counter drops by one; now ready: render.",
      "nodeColors": [
        {
          "id": "input",
          "color": "green"
        },
        {
          "id": "ai",
          "color": "green"
        },
        {
          "id": "anim",
          "color": "green"
        },
        {
          "id": "physics",
          "color": "green"
        },
        {
          "id": "cull",
          "color": "green"
        },
        {
          "id": "particles",
          "color": "green"
        },
        {
          "id": "render",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "render",
          "text": "ready (2)"
        }
      ],
      "edgeColors": [
        {
          "from": "input",
          "to": "ai",
          "color": "green"
        },
        {
          "from": "input",
          "to": "anim",
          "color": "green"
        },
        {
          "from": "ai",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "anim",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "physics",
          "to": "cull",
          "color": "green"
        },
        {
          "from": "input",
          "to": "particles",
          "color": "green"
        },
        {
          "from": "cull",
          "to": "render",
          "color": "green"
        },
        {
          "from": "particles",
          "to": "render",
          "color": "green"
        }
      ],
      "vars": [
        [
          "time",
          "8"
        ],
        [
          "W0",
          "idle"
        ],
        [
          "W1",
          "idle"
        ],
        [
          "ready queue",
          "render"
        ]
      ]
    },
    {
      "note": "t = 8: W0 starts render.",
      "nodeColors": [
        {
          "id": "input",
          "color": "green"
        },
        {
          "id": "ai",
          "color": "green"
        },
        {
          "id": "anim",
          "color": "green"
        },
        {
          "id": "physics",
          "color": "green"
        },
        {
          "id": "cull",
          "color": "green"
        },
        {
          "id": "particles",
          "color": "green"
        },
        {
          "id": "render",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "render",
          "text": "W0 (2)"
        }
      ],
      "edgeColors": [
        {
          "from": "input",
          "to": "ai",
          "color": "green"
        },
        {
          "from": "input",
          "to": "anim",
          "color": "green"
        },
        {
          "from": "ai",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "anim",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "physics",
          "to": "cull",
          "color": "green"
        },
        {
          "from": "input",
          "to": "particles",
          "color": "green"
        },
        {
          "from": "cull",
          "to": "render",
          "color": "green"
        },
        {
          "from": "particles",
          "to": "render",
          "color": "green"
        }
      ],
      "vars": [
        [
          "time",
          "8"
        ],
        [
          "W0",
          "render"
        ],
        [
          "W1",
          "idle"
        ],
        [
          "ready queue",
          "empty"
        ]
      ]
    },
    {
      "note": "t = 10: render finished.",
      "nodeColors": [
        {
          "id": "input",
          "color": "green"
        },
        {
          "id": "ai",
          "color": "green"
        },
        {
          "id": "anim",
          "color": "green"
        },
        {
          "id": "physics",
          "color": "green"
        },
        {
          "id": "cull",
          "color": "green"
        },
        {
          "id": "particles",
          "color": "green"
        },
        {
          "id": "render",
          "color": "green"
        }
      ],
      "nodeNotes": [],
      "edgeColors": [
        {
          "from": "input",
          "to": "ai",
          "color": "green"
        },
        {
          "from": "input",
          "to": "anim",
          "color": "green"
        },
        {
          "from": "ai",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "anim",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "physics",
          "to": "cull",
          "color": "green"
        },
        {
          "from": "input",
          "to": "particles",
          "color": "green"
        },
        {
          "from": "cull",
          "to": "render",
          "color": "green"
        },
        {
          "from": "particles",
          "to": "render",
          "color": "green"
        }
      ],
      "vars": [
        [
          "time",
          "10"
        ],
        [
          "W0",
          "idle"
        ],
        [
          "W1",
          "idle"
        ],
        [
          "ready queue",
          "empty"
        ]
      ]
    },
    {
      "note": "Frame done at t = 10 with 2 workers. The longest chain, input → ai → physics → cull → render, takes 1 + 3 + 3 + 1 + 2 = 10: no number of workers can beat that.",
      "nodeColors": [
        {
          "id": "input",
          "color": "green"
        },
        {
          "id": "ai",
          "color": "green"
        },
        {
          "id": "anim",
          "color": "green"
        },
        {
          "id": "physics",
          "color": "green"
        },
        {
          "id": "cull",
          "color": "green"
        },
        {
          "id": "particles",
          "color": "green"
        },
        {
          "id": "render",
          "color": "green"
        }
      ],
      "nodeNotes": [],
      "edgeColors": [
        {
          "from": "input",
          "to": "ai",
          "color": "green"
        },
        {
          "from": "input",
          "to": "anim",
          "color": "green"
        },
        {
          "from": "ai",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "anim",
          "to": "physics",
          "color": "green"
        },
        {
          "from": "physics",
          "to": "cull",
          "color": "green"
        },
        {
          "from": "input",
          "to": "particles",
          "color": "green"
        },
        {
          "from": "cull",
          "to": "render",
          "color": "green"
        },
        {
          "from": "particles",
          "to": "render",
          "color": "green"
        }
      ],
      "vars": [
        [
          "time",
          "10"
        ],
        [
          "W0",
          "idle"
        ],
        [
          "W1",
          "idle"
        ],
        [
          "ready queue",
          "empty"
        ]
      ]
    }
  ]
},
        {
          type: 'p',
          text: 'The **critical path**, the longest chain of dependent jobs, sets a hard lower bound on frame time no matter how many cores you have. Two workers already reach it here; more workers would only sit idle. To make the frame faster you must shorten the chain: split physics into parallel islands, or start culling with last frame\'s data.',
        },
        {
          type: 'code',
          runnable: true,
          title: 'job_graph.cpp',
          code: `#include <atomic>
#include <condition_variable>
#include <iostream>
#include <latch>
#include <mutex>
#include <queue>
#include <string>
#include <thread>
#include <vector>

struct Job {
    std::string name;
    std::vector<int> deps;           // jobs that must finish first
    std::vector<int> dependents;     // jobs waiting on this one
    std::atomic<int> pending{0};     // unfinished dependencies
    int result = 0;
};

std::vector<Job> jobs(7);
std::mutex qm;
std::condition_variable qcv;
std::queue<int> ready;
std::latch allDone{7};
bool stopping = false;            // guarded by qm

void push(int j) {
    { std::lock_guard l{qm}; ready.push(j); }
    qcv.notify_one();
}

void execute(int j) {
    Job& job = jobs[j];
    job.result = j + 1;              // "work": own id plus inputs
    for (int d : job.deps) job.result += jobs[d].result;
    for (int k : job.dependents) {
        if (jobs[k].pending.fetch_sub(1) == 1) {
            push(k);                 // we finished its last dep
        }
    }
    allDone.count_down();
}

void worker() {
    while (true) {
        int j;
        {
            std::unique_lock l{qm};
            qcv.wait(l, [] { return !ready.empty() || stopping; });
            if (ready.empty()) return;
            j = ready.front();
            ready.pop();
        }
        execute(j);
    }
}

int main() {
    const char* names[] = {"input", "ai", "anim", "physics",
                           "cull", "particles", "render"};
    std::vector<std::vector<int>> deps = {
        {}, {0}, {0}, {1, 2}, {3}, {0}, {4, 5}};
    for (int j = 0; j < 7; ++j) {
        jobs[j].name = names[j];
        jobs[j].deps = deps[j];
        jobs[j].pending = static_cast<int>(deps[j].size());
        for (int d : deps[j]) jobs[d].dependents.push_back(j);
    }
    {
        std::vector<std::jthread> pool;
        for (int w = 0; w < 3; ++w) pool.emplace_back(worker);
        push(0);                     // only "input" is ready
        allDone.wait();
        { std::lock_guard l{qm}; stopping = true; }
        qcv.notify_all();
    }
    for (const Job& j : jobs) {
        std::cout << j.name << " = " << j.result << '\\n';
    }
}`,
          output: 'input = 1\nai = 3\nanim = 4\nphysics = 11\ncull = 16\nparticles = 7\nrender = 30',
          annotations: [
            { lines: 15, text: 'The dependency counter. It starts at the number of inputs and only ever counts down.' },
            { lines: '33-34', text: 'A job reads its inputs\' results. That is safe without a lock because each input finished, and decremented this job\'s counter, before this job could be queued.' },
            { lines: '35-39', text: '`fetch_sub` returns the old value, so exactly one finishing input sees 1 and pushes the dependent. If two inputs finish at once on different workers, only one of them schedules it.' },
            { lines: 40, text: 'Counting finished jobs lets `main` wait for the whole frame with one latch.' },
            { lines: '72-74', text: 'Shutdown follows the condition-variable rules: change `stopping` under the mutex, then notify everyone.' },
            { lines: '76-78', text: 'Jobs ran in a different order on each run, but every result depends only on its inputs, so the output is always the same, which is a good property for a frame\'s jobs to have.' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'numeric',
      prompt: 'In the frame\'s job graph (input 1, ai 3, anim 2, physics 3, cull 1, particles 2, render 2 time units; physics needs ai and anim; cull needs physics; render needs cull and particles; ai, anim and particles need input), physics gets heavier and now takes **5** units. With **unlimited** workers, what is the shortest possible frame time?',
      answer: 12,
      unit: 'time units',
      hint: 'With unlimited workers, frame time equals the longest path through the graph.',
      explanation:
        'With unlimited workers every job starts the moment its inputs are done, so frame time is the **critical path**. The chains are input → ai → physics → cull → render = 1 + 3 + 5 + 1 + 2 = **12**, input → anim → physics → cull → render = 1 + 2 + 5 + 1 + 2 = 11, and input → particles → render = 1 + 2 + 2 = 5. Adding cores cannot beat 12; only shortening a job on the critical path can, which is why engine programmers profile the critical path first.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Fibers in the Naughty Dog engine',
      blocks: [
        {
          type: 'p',
          text: 'A job often needs to wait halfway through: an animation job kicks off ten IK jobs and needs their results before it can continue. In the job system above it would have to **block its worker thread**, wasting a core, or be split into "before" and "after" jobs by hand, which makes code hard to follow.',
        },
        {
          type: 'p',
          text: 'For *The Last of Us Remastered* on PS4, Naughty Dog rebuilt its engine so that **every job runs on a [[fiber]]**. Christian Gyrling\'s GDC 2015 talk describes the design:',
        },
        {
          type: 'list',
          items: [
            '**One worker thread per CPU core**, each locked to its core. The OS scheduler barely matters any more; the job system is the scheduler.',
            '**A pool of fibers allocated up front**, each with its own stack. A worker takes a job, picks a free fiber and runs the job on it.',
            '**Waiting means switching, not blocking.** A job calls something like `WaitForCounter(counter, 0)`. If the counter is not zero, the worker puts the current fiber on a wait list keyed by that counter, switches to a fresh fiber and keeps running other jobs. When the counter reaches zero, the waiting fiber becomes ready and is resumed, possibly by a different worker thread, exactly where it left off.',
            '**Job queues with a few priority levels** feed the workers, and the whole engine, including gameplay and rendering, is written as jobs.',
          ],
        },
        {
          type: 'p',
          text: 'Because a fiber switch only saves a few registers and swaps the stack pointer (the `ucontext` lesson showed the idea), waiting costs about as much as a function call and never enters the kernel. Code can be written in a natural, sequential style with waits in the middle, and cores stay busy.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'What breaks on fibers',
          text: 'A fiber can resume on a **different thread** after a wait. Anything tied to the thread is then wrong: a `thread_local` variable read before the wait and after it may come from two different threads\' copies, and a `std::mutex` locked before the wait would be unlocked by a different thread, which is undefined behavior. Fiber-based engines therefore ban OS locks and thread-locals across waits, use fiber-aware locks, and keep blocking system calls off the workers, since a blocked worker stalls every fiber it could have run.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'The pipelined frame',
          text: 'The same talk describes a second change: instead of finishing game logic, then rendering, for one frame at a time, the engine keeps several frames in flight at different stages (game logic for one frame while rendering commands are built for the previous one and the GPU draws the one before). The job system makes that overlap natural, at the cost of extra memory for per-frame data and a little latency.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'In a fiber-based job system, a job does `std::lock_guard g{statsMutex};`, then calls `WaitForCounter(physicsDone)`, then updates the stats and returns. Why is this dangerous?',
      options: [
        { text: 'It is not dangerous: the lock is held for the whole wait, so the stats are protected', why: 'The fiber may resume on a different worker thread, and that thread would then unlock a `std::mutex` it never locked.' },
        { text: 'The fiber may resume on another worker thread, which would unlock a mutex owned by the original thread (undefined behavior), and meanwhile the original thread may run other jobs that try to take the same mutex', correct: true, why: 'Both problems are real. OS mutexes are owned by threads, not fibers, and a worker that tries to relock a mutex it already owns deadlocks or worse.' },
        { text: '`WaitForCounter` releases all mutexes automatically before switching fibers', why: 'The job system knows nothing about your mutexes. Nothing releases them for you.' },
        { text: 'It only matters if the job system uses more than one priority queue', why: 'Priorities are unrelated. The problem is thread ownership across a fiber switch.' },
      ],
      explanation:
        'OS synchronization is built around threads: a mutex records its owner thread, and the kernel parks threads, not fibers. Once jobs can migrate between threads mid-execution, those primitives stop matching reality. Fiber job systems therefore provide their own waiting (counters) and, where needed, fiber-aware locks, and the rule "never hold an OS lock across a wait" becomes part of the engine\'s coding standard.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Lock-free data structures and the ABA problem',
      blocks: [
        {
          type: 'p',
          text: 'Locks block. If the thread holding one is preempted, page-faults or crashes, everyone waiting for it stops too. **[[lock-free|Lock-free]]** algorithms avoid that by building every update from atomic compare-and-swap loops. The formal guarantees form a ladder:',
        },
        {
          type: 'table',
          headers: ['Guarantee', 'Meaning'],
          rows: [
            ['**Obstruction-free**', 'A thread running alone (others paused) finishes in a bounded number of steps'],
            ['**Lock-free**', 'At any moment, *some* thread makes progress: the system as a whole never stalls, though one unlucky thread can retry for a long time'],
            ['**Wait-free**', '*Every* thread finishes in a bounded number of its own steps: no starvation either'],
          ],
        },
        {
          type: 'p',
          text: 'The classic example is the Treiber stack (1986): `top` is an atomic pointer, push is "point the new node at `top`, then CAS `top` to the new node", and pop is "read `top` and its `next`, then CAS `top` to `next`". If another thread changed `top` in between, the CAS fails and you retry. That reasoning has a hole, the [[aba-problem]]:',
        },
        {
  "type": "algo",
  "view": "graph",
  "nodes": [
    {
      "id": "top",
      "x": 50,
      "y": 130,
      "label": "top"
    },
    {
      "id": "A",
      "x": 170,
      "y": 60,
      "label": "A"
    },
    {
      "id": "B",
      "x": 270,
      "y": 130,
      "label": "B"
    },
    {
      "id": "C",
      "x": 370,
      "y": 200,
      "label": "C"
    }
  ],
  "edges": [
    {
      "from": "top",
      "to": "A",
      "directed": true
    },
    {
      "from": "top",
      "to": "B",
      "directed": true
    },
    {
      "from": "top",
      "to": "C",
      "directed": true
    },
    {
      "from": "A",
      "to": "B",
      "directed": true
    },
    {
      "from": "B",
      "to": "C",
      "directed": true
    },
    {
      "from": "A",
      "to": "C",
      "directed": true
    }
  ],
  "width": 420,
  "height": 260,
  "code": "Node* pop() {\n  Node* old = top.load();\n  Node* nxt;\n  do {\n    if (!old) return nullptr;\n    nxt = old->next;        // read\n  } while (!top.compare_exchange_weak(\n               old, nxt));  // swap\n  return old;\n}",
  "interval": 1700,
  "caption": "The ABA problem: T1's compare-and-swap succeeds even though the stack changed underneath it.",
  "frames": [
    {
      "note": "A lock-free stack: `top` → A → B → C. Thin arrows are links that do not exist yet.",
      "lines": [],
      "edgeColors": [
        {
          "from": "top",
          "to": "A",
          "color": "blue"
        },
        {
          "from": "A",
          "to": "B",
          "color": "blue"
        },
        {
          "from": "B",
          "to": "C",
          "color": "blue"
        }
      ],
      "nodeColors": [],
      "nodeNotes": [],
      "vars": [
        [
          "T1 old",
          "—"
        ],
        [
          "T1 nxt",
          "—"
        ],
        [
          "stack",
          "A B C"
        ]
      ]
    },
    {
      "note": "T1 starts `pop`: it reads `old = A` and `nxt = A->next = B`. Then it is preempted before its compare-and-swap.",
      "lines": [
        2,
        6
      ],
      "edgeColors": [
        {
          "from": "top",
          "to": "A",
          "color": "blue"
        },
        {
          "from": "A",
          "to": "B",
          "color": "blue"
        },
        {
          "from": "B",
          "to": "C",
          "color": "blue"
        }
      ],
      "nodeColors": [
        {
          "id": "A",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "A",
          "text": "T1: old"
        }
      ],
      "vars": [
        [
          "T1 old",
          "A"
        ],
        [
          "T1 nxt",
          "B"
        ],
        [
          "stack",
          "A B C"
        ]
      ]
    },
    {
      "note": "T2 pops A. `top` now points to B.",
      "lines": [
        7,
        8
      ],
      "edgeColors": [
        {
          "from": "top",
          "to": "B",
          "color": "blue"
        },
        {
          "from": "B",
          "to": "C",
          "color": "blue"
        }
      ],
      "nodeColors": [
        {
          "id": "A",
          "color": "gray"
        }
      ],
      "nodeNotes": [
        {
          "id": "A",
          "text": "popped by T2"
        }
      ],
      "vars": [
        [
          "T1 old",
          "A"
        ],
        [
          "T1 nxt",
          "B"
        ],
        [
          "stack",
          "B C"
        ]
      ]
    },
    {
      "note": "T2 pops B and **deletes** it. Its memory goes back to the allocator.",
      "lines": [
        7,
        8
      ],
      "edgeColors": [
        {
          "from": "top",
          "to": "C",
          "color": "blue"
        }
      ],
      "nodeColors": [
        {
          "id": "A",
          "color": "gray"
        },
        {
          "id": "B",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "A",
          "text": "popped by T2"
        },
        {
          "id": "B",
          "text": "freed"
        }
      ],
      "vars": [
        [
          "T1 old",
          "A"
        ],
        [
          "T1 nxt",
          "B"
        ],
        [
          "stack",
          "C"
        ]
      ]
    },
    {
      "note": "T2 pushes A back (or allocates a new node that lands at A's old address). Stack: A → C. `top` holds the **same value** it had when T1 read it.",
      "lines": [],
      "edgeColors": [
        {
          "from": "top",
          "to": "A",
          "color": "blue"
        },
        {
          "from": "A",
          "to": "C",
          "color": "blue"
        }
      ],
      "nodeColors": [
        {
          "id": "B",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "B",
          "text": "freed"
        }
      ],
      "vars": [
        [
          "T1 old",
          "A"
        ],
        [
          "T1 nxt",
          "B"
        ],
        [
          "stack",
          "A C"
        ]
      ]
    },
    {
      "note": "T1 resumes. Its CAS compares `top` with `old`: both are A, so it **succeeds** and stores `nxt`, the stale B.",
      "lines": [
        7,
        8
      ],
      "edgeColors": [
        {
          "from": "top",
          "to": "B",
          "color": "red"
        },
        {
          "from": "A",
          "to": "C",
          "color": "gray"
        }
      ],
      "nodeColors": [
        {
          "id": "B",
          "color": "red"
        },
        {
          "id": "C",
          "color": "gray"
        }
      ],
      "nodeNotes": [
        {
          "id": "B",
          "text": "freed!"
        },
        {
          "id": "C",
          "text": "lost"
        }
      ],
      "vars": [
        [
          "T1 old",
          "A"
        ],
        [
          "T1 nxt",
          "B"
        ],
        [
          "stack",
          "B?"
        ]
      ]
    },
    {
      "note": "`top` now points at freed memory and C has vanished from the stack. The CAS checked that the **value** was unchanged, not that nothing had happened: the ABA problem.",
      "lines": [
        9
      ],
      "edgeColors": [
        {
          "from": "top",
          "to": "B",
          "color": "red"
        }
      ],
      "nodeColors": [
        {
          "id": "B",
          "color": "red"
        },
        {
          "id": "C",
          "color": "gray"
        }
      ],
      "nodeNotes": [
        {
          "id": "B",
          "text": "freed!"
        },
        {
          "id": "C",
          "text": "lost"
        }
      ],
      "vars": [
        [
          "T1 old",
          "A"
        ],
        [
          "T1 nxt",
          "B"
        ],
        [
          "stack",
          "corrupt"
        ]
      ]
    }
  ]
},
        {
          type: 'p',
          text: 'CAS asks "is the value still A?", but the question you meant was "has nothing changed since I looked?". When memory is freed and reused, the answer to the first can be yes while the answer to the second is no. Standard fixes:',
        },
        {
          type: 'list',
          items: [
            '**Tagged pointers**: pair the pointer with a version counter that every update increments, and CAS both together (x86-64 has a 16-byte `cmpxchg16b` for this). A recycled A now carries a different tag.',
            '**Safe memory reclamation**: never free a node while another thread might still be looking at it. **Hazard pointers** (each thread publishes the pointers it is using), **epoch-based reclamation**, and **RCU** (read-copy-update: readers never lock, writers publish a new version and free the old one after all readers have moved on; the Linux kernel uses it everywhere). C++26 adds `std::hazard_pointer` and `std::rcu_domain` to the standard library.',
            '**Garbage collection**, which is why lock-free code is much easier in Java or C#: memory cannot be reused while anyone can still reach it.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Use one, do not write one',
          text: 'Lock-free code is famously hard: ABA, memory ordering on ARM, and reclamation all have to be right, and bugs show up once a month on one customer\'s machine. Lock-free is also not automatically faster; under heavy contention a CAS retry loop can lose to a good mutex. Use well-tested libraries (moodycamel\'s ConcurrentQueue, Boost.Lockfree, your engine\'s queues) and keep your own lock-free code to the simplest cases, like the one on the next card.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'Why does the compare-and-swap in the Treiber stack\'s `pop` succeed in the ABA scenario even though the stack has changed?',
      options: [
        { text: 'Because `compare_exchange_weak` may succeed spuriously', why: 'The weak form can **fail** spuriously, never succeed spuriously. Here it succeeds legitimately: the values really are equal.' },
        { text: 'Because CAS compares only the current value of `top` with the expected value, and after A was popped, freed or reused, and pushed again, `top` holds the same address A', correct: true, why: 'CAS has no notion of history. Same bits, same answer, even though the node after A is no longer B.' },
        { text: 'Because T1 holds a lock on `top` while it is preempted', why: 'There is no lock in a lock-free stack; that is the point. T1 holds nothing while it is preempted.' },
        { text: 'Because x86 does not implement CAS atomically for pointers', why: '`lock cmpxchg` is fully atomic. The problem is in the algorithm\'s assumption, not in the hardware.' },
      ],
      explanation:
        'The ABA problem is a logic error: "value unchanged" was used as a proxy for "nothing happened". Tagged pointers make the value change on every update; hazard pointers, epochs or RCU prevent A\'s memory from being reused while T1 might still use it. Either way, the stale `next` can no longer be installed.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'The SPSC queue: the lock-free structure you should know',
      blocks: [
        {
          type: 'p',
          text: 'One lock-free structure is simple enough to write yourself and is used in almost every engine: the **single-producer, single-consumer** ring buffer. With exactly one thread writing and one reading, the producer only ever writes `head_`, the consumer only ever writes `tail_`, and no CAS is needed, so ABA cannot occur. It is the standard way for the game thread to send commands to the **audio thread**, which must never block on a lock (a lock held by a preempted game thread would become an audible glitch, the priority-inversion story again).',
        },
        {
          type: 'code',
          runnable: true,
          title: 'spsc_queue.cpp',
          code: `#include <array>
#include <atomic>
#include <cstddef>
#include <iostream>
#include <optional>
#include <thread>

// Single-producer, single-consumer queue: no locks, no waiting.
template <typename T, std::size_t N>
class SpscQueue {
public:
    bool push(const T& v) {                    // producer thread only
        const std::size_t h = head_.load(std::memory_order_relaxed);
        const std::size_t next = (h + 1) % N;
        if (next == tail_.load(std::memory_order_acquire)) {
            return false;                      // full: try later
        }
        slots_[h] = v;
        head_.store(next, std::memory_order_release);  // publish
        return true;
    }
    std::optional<T> pop() {                   // consumer thread only
        const std::size_t t = tail_.load(std::memory_order_relaxed);
        if (t == head_.load(std::memory_order_acquire)) {
            return std::nullopt;               // empty
        }
        T v = slots_[t];
        tail_.store((t + 1) % N, std::memory_order_release);
        return v;
    }
private:
    std::array<T, N> slots_{};
    alignas(64) std::atomic<std::size_t> head_{0};  // producer's
    alignas(64) std::atomic<std::size_t> tail_{0};  // consumer's
};

SpscQueue<int, 64> commands;    // game thread -> audio thread

int main() {
    long mixed = 0;
    {
        std::jthread audio{[&mixed] {
            int received = 0;
            while (received < 1000) {
                if (auto cmd = commands.pop()) {
                    mixed += *cmd;             // "play sound *cmd"
                    ++received;
                }
            }
        }};
        for (int i = 1; i <= 1000; ++i) {
            while (!commands.push(i)) {
                std::this_thread::yield();     // full: try again
            }
        }
    }
    std::cout << "audio thread mixed " << mixed << '\\n';
}`,
          output: 'audio thread mixed 500500',
          annotations: [
            { lines: 13, text: 'The producer is the only writer of `head_`, so it can read its own value with `relaxed` ordering.' },
            { lines: '15-17', text: 'Full when advancing `head_` would meet `tail_`. One slot is kept empty so that "full" and "empty" look different. The `acquire` pairs with the consumer\'s `release` on `tail_`, so the slot really is free to overwrite.' },
            { lines: '18-19', text: 'Write the slot **first**, then publish it with a `release` store. A consumer that sees the new `head_` (with `acquire`) is guaranteed to see the slot\'s contents.' },
            { lines: '33-34', text: '`alignas(64)` puts the two indices on different cache lines, so producer and consumer do not slow each other down through [[false-sharing]].' },
            { lines: '44-47', text: 'This demo consumer polls in a loop. A real audio callback pops whatever is available once per buffer and never waits.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Know the contract',
          text: 'The "SP" and "SC" are not suggestions. With two producers, both can read the same `head_`, write the same slot and publish it: one command silently overwrites the other. If you need several producers, use one SPSC queue per producer or a properly designed MPSC queue.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'bug',
      prompt: 'Both the game thread and the UI thread send sound commands to the audio thread through the same `SpscQueue`. Occasionally a UI click sound never plays. Tap the line that breaks the queue\'s contract.',
      code: `SpscQueue<SoundCmd, 256> toAudio;

void gameThreadTick() {
    for (const Event& e : frameEvents) {
        toAudio.push(SoundCmd::from(e));
    }
}

void uiThreadOnClick(const Button& b) {
    toAudio.push(SoundCmd::click(b.soundId));
}

void audioCallback(float* out, int frames) {
    while (auto cmd = toAudio.pop()) {
        voices.start(*cmd);
    }
    voices.mix(out, frames);
}`,
      bugLines: [10],
      hint: 'How many threads call `push`?',
      explanation:
        'An SPSC queue assumes exactly **one** producer. The game thread (line 5) and the UI thread (line 10) can both load the same `head_`, write the same slot and store the same new `head_`: one command overwrites the other and is lost, and the data race on the slot is undefined behavior. Give the UI its own SPSC queue to the audio thread (the audio callback pops from both), or route UI sounds through the game thread. The return value of `push` is also ignored here, so a full queue would drop commands silently; check it, or size the queue for the worst frame.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'concept',
      title: 'How to choose',
      blocks: [
        {
          type: 'p',
          text: 'The best synchronization is none. Work down this list and stop at the first thing that works:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Do not share', text: 'Give each thread its own data (per-thread scratch, partitioned arrays, `thread_local` accumulators) and merge once at the end of the phase.' },
            { title: 'Share immutable data', text: 'Data nobody writes needs no lock: loaded level geometry, last frame\'s snapshot that this frame only reads.' },
            { title: 'Pass messages', text: 'Hand ownership of data from one thread to another through a queue: SPSC to the audio thread, a job queue to workers, futures for results.' },
            { title: 'Structure the work as jobs', text: 'Express a frame as a dependency graph and let the job system order it, instead of locking inside each job.' },
            { title: 'Lock, simply', text: 'When state really is shared and mutable, use a `std::mutex` around whole operations, with a documented lock order.' },
            { title: 'Specialize after measuring', text: '`std::shared_mutex` for long read-mostly sections, atomics for counters and flags, and lock-free structures from a library only where a profiler shows contention.' },
          ],
        },
        {
          type: 'table',
          headers: ['Engine problem', 'Pattern'],
          rows: [
            ['Hundreds of small CPU tasks per frame with dependencies', 'Job system with counters (on fibers if jobs must wait mid-way)'],
            ['Loading and decompressing assets', 'Dedicated I/O threads or async I/O, handing results to jobs'],
            ['Game thread to audio thread commands', 'SPSC lock-free queue; the audio thread never locks'],
            ['Read-mostly registry or config', 'Immutable snapshot swapped atomically, or `std::shared_mutex`'],
            ['Statistics from many workers', 'Per-thread counters merged at end of frame'],
            ['Game and render threads', 'Double-buffered frame data plus a semaphore or fence limiting frames in flight'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why engines converge on the same design',
          text: 'Cores are only useful if they are busy and not waiting for each other. Threads cost microseconds to create and switch, locks serialize, and blocking wastes cores. A fixed pool of workers, one per core, running short jobs over data each job owns for its duration, synchronized by dependencies rather than locks, minimizes all three. That is why Unreal\'s task graph, Unity\'s job system, Frostbite\'s and Naughty Dog\'s look so alike under the hood.',
        },
      ],
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'mcq',
      prompt: 'Eight worker threads each count how many particles they spawned this frame, and the HUD shows the total once per frame. Which design is best?',
      options: [
        { text: 'One global `std::atomic<int>` that every worker increments for every particle', why: 'Correct, but every increment is a locked instruction on one shared cache line that bounces between eight cores millions of times per second.' },
        { text: 'A global `int` protected by a `std::mutex`, locked for every particle', why: 'Correct but even slower: contention on one lock for the hottest operation in the system.' },
        { text: 'A per-worker counter (thread-local or one padded slot per worker) summed once at the end of the frame, after the workers\' jobs are known to be done', correct: true, why: 'No sharing in the hot path at all; one cheap merge per frame. The job system\'s completion counter already provides the "after" ordering.' },
        { text: 'A `std::shared_mutex` so the workers can increment under a shared lock', why: 'A shared lock is for **readers**. Several threads incrementing under a shared lock is a data race.' },
      ],
      explanation:
        'Rule one of the choice list: do not share. Per-thread accumulation plus a merge after a synchronization point turns millions of contended operations into a handful. Pad per-worker slots to separate cache lines to avoid false sharing, and read them only after the frame\'s jobs have completed, so the merge happens-after every write.',
    },
  ],
  takeaways: [
    'Readers–writer locks (`std::shared_mutex`) let many readers in at once; mind the fairness policy (writer starvation) and measure before assuming they are faster.',
    'A thread pool creates workers once and feeds them through a queue; size CPU pools to the free cores and keep blocking I/O elsewhere.',
    'Work stealing gives each worker its own deque: owners pop the newest job from the bottom, thieves steal the oldest from the top.',
    'Job systems express a frame as a dependency graph with atomic counters; the critical path bounds the frame time however many cores you add.',
    'Naughty Dog runs every job on a fiber, so waiting on a counter switches fibers instead of blocking a thread, but OS locks and `thread_local` must not span a wait.',
    'Lock-free algorithms guarantee system-wide progress, but CAS checks values, not history: ABA needs tags or safe reclamation (hazard pointers, epochs, RCU).',
    'The SPSC ring buffer is the lock-free queue to know, for example for audio commands. Prefer not sharing, then message passing, then simple locks.',
  ],
  reading: [
    {
      title: 'Parallelizing the Naughty Dog Engine Using Fibers (GDC 2015)',
      url: 'https://www.gdcvault.com/play/1022186/Parallelizing-the-Naughty-Dog-Engine',
      source: 'video',
      note: 'Christian Gyrling\'s talk on the fiber-based job system and frame pipelining behind The Last of Us Remastered at 60 fps.',
    },
    {
      title: 'Work stealing',
      url: 'https://en.wikipedia.org/wiki/Work_stealing',
      source: 'article',
      note: 'The scheduling idea, its history in Cilk, and the deque operations.',
    },
    {
      title: 'ABA problem',
      url: 'https://en.wikipedia.org/wiki/ABA_problem',
      source: 'article',
      note: 'The problem with a worked example and the standard workarounds.',
    },
    {
      title: 'std::shared_mutex',
      url: 'https://en.cppreference.com/w/cpp/thread/shared_mutex',
      source: 'cppreference',
      note: 'Shared and exclusive locking, with `std::shared_lock`.',
    },
    {
      title: 'Operating Systems: Three Easy Pieces',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/',
      source: 'book',
      note: 'The "Lock-based Concurrent Data Structures" chapter covers concurrent counters, lists, queues and hash tables and how their locking scales.',
    },
  ],
};
