import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-condition-variables',
  title: 'Condition Variables and Semaphores',
  summary:
    'Waiting for something to become true without burning a core: condition variables and why their wait sits in a `while` loop, the bounded-buffer producer/consumer, semaphores and how to build one, and latches and barriers for whole groups of threads.',
  minutes: 22,
  objectives: [
    'Explain why waiting needs both a mutex and a condition variable, and how `wait` avoids lost wakeups',
    'Always wait in a `while` loop (or with a predicate), and explain Mesa semantics and spurious wakeups',
    'Implement a bounded buffer with two condition variables, and again with two semaphores',
    'Use `std::counting_semaphore` and `std::binary_semaphore`, and implement a semaphore from a mutex and a condition variable',
    'Choose between a latch and a barrier for one-shot and repeated group synchronization',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Waiting for a condition',
      blocks: [
        {
          type: 'p',
          text: 'Locks answer one question: "may I touch this data now?" Threads often need a different one: "has something happened yet?" Has the loader finished? Is there a job in the queue? Is there space in the audio buffer? `join` answers it for one special case, thread exit. For everything else you need a way to **wait until a condition on shared state becomes true**.',
        },
        {
          type: 'p',
          text: 'The obvious approach is to spin on a flag:',
        },
        {
          type: 'code',
          code: `std::atomic<bool> levelReady{false};

void streamingThread() {
    loadLevel();
    levelReady.store(true, std::memory_order_release);
}

void gameThread() {
    while (!levelReady.load(std::memory_order_acquire)) {
        // spin
    }
    startLevel();
}`,
          annotations: [
            { lines: 2, text: 'An atomic, so there is no data race; the last unit\'s broken plain `bool` is fixed.' },
            { lines: '9-11', text: 'Correct, but loading may take seconds, and this loop keeps a core at 100% the whole time, competing with the very thread it is waiting for. On a laptop it also drains the battery.' },
          ],
        },
        {
          type: 'p',
          text: 'What we want is for the waiting thread to **sleep**, using no CPU, and for whoever changes the state to wake it. The OS already has the machinery from the last lesson: wait queues inside the kernel. A [[condition-variable|condition variable]] packages that machinery for user code.',
        },
        {
          type: 'definition',
          term: 'Condition variable',
          text: 'A queue of threads waiting for some condition on shared state to become true. `wait` puts the calling thread to sleep on the queue; `notify_one` (POSIX: *signal*) wakes one waiter, and `notify_all` (*broadcast*) wakes them all. It always works together with a mutex that protects the shared state.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Recap from C++ Fundamentals',
          text: 'You have already used `std::condition_variable` with `wait(lock, predicate)` to build a job queue in *Data Races, Mutexes and Locks*. This lesson explains *why* every part of that pattern is necessary, which is what lets you get the variations right on your own.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Why wait needs the mutex',
      blocks: [
        {
          type: 'p',
          text: 'Suppose a condition variable worked *without* a lock: check the queue, and if it is empty, sleep. Here is what goes wrong:',
        },
        {
          type: 'table',
          caption: 'A lost wakeup',
          headers: ['Step', 'Consumer', 'Producer'],
          rows: [
            ['1', 'checks: queue is empty', '—'],
            ['2', '—', 'pushes a job'],
            ['3', '—', '`notify_one()`: nobody is asleep yet, so the notification does nothing'],
            ['4', 'goes to sleep', '—'],
            ['5', 'sleeps forever, with a job in the queue', 'never notifies again'],
          ],
        },
        {
          type: 'p',
          text: 'The gap between checking and sleeping is the same disease as the gap between load and store in `counter++`. The cure is to make "check, then sleep" atomic with respect to "change, then notify". So the checker holds the mutex while checking, and `wait(lock)` **releases the mutex and puts the thread to sleep as one indivisible step**. A producer that changes the state under the same mutex cannot squeeze in between. When the waiter is woken, `wait` reacquires the mutex before returning, so the waiter is back inside the critical section, holding the lock, ready to look at the state again.',
        },
        {
          type: 'figure',
          svg: "<svg viewBox=\"0 0 520 340\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"170\" y=\"40\" width=\"190\" height=\"120\" rx=\"10\" fill=\"currentColor\" fill-opacity=\"0.06\" stroke=\"currentColor\" stroke-width=\"2\" class=\"s-purple f-purple\"/><text x=\"265\" y=\"62\" text-anchor=\"middle\" font-size=\"13\" class=\"t-purple\">critical section</text><text x=\"265\" y=\"80\" text-anchor=\"middle\" font-size=\"11\" class=\"t-gray\">shared state: items, count</text><rect x=\"232\" y=\"100\" width=\"66\" height=\"32\" rx=\"6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" class=\"s-green\"/><text x=\"265\" y=\"121\" text-anchor=\"middle\" font-size=\"12\" class=\"t-green\">owner</text><rect x=\"160\" y=\"88\" width=\"20\" height=\"44\" fill=\"currentColor\" fill-opacity=\"0.25\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-purple f-purple\"/><text x=\"170\" y=\"150\" text-anchor=\"middle\" font-size=\"10\" class=\"t-purple\">mutex</text><text x=\"64\" y=\"28\" text-anchor=\"middle\" font-size=\"12\" class=\"t-orange\">waiting to lock()</text><rect x=\"20\" y=\"40\" width=\"40\" height=\"28\" rx=\"5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-orange\"/><text x=\"40\" y=\"59\" text-anchor=\"middle\" font-size=\"11\">T4</text><rect x=\"66\" y=\"40\" width=\"40\" height=\"28\" rx=\"5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-orange\"/><text x=\"86\" y=\"59\" text-anchor=\"middle\" font-size=\"11\">T5</text><path d=\"M110,54 L140,54 L140,108 L150,108\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-orange\"/><path d=\"M160,108 L150,102 L150,114 Z\" class=\"f-orange\"/><rect x=\"150\" y=\"238\" width=\"230\" height=\"56\" rx=\"10\" fill=\"currentColor\" fill-opacity=\"0.06\" stroke=\"currentColor\" stroke-width=\"2\" stroke-dasharray=\"6 4\" class=\"s-blue f-blue\"/><text x=\"265\" y=\"310\" text-anchor=\"middle\" font-size=\"12\" class=\"t-blue\">condition variable notEmpty: sleepers</text><rect x=\"170\" y=\"252\" width=\"40\" height=\"28\" rx=\"5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-blue\"/><text x=\"190\" y=\"271\" text-anchor=\"middle\" font-size=\"11\">T2</text><rect x=\"218\" y=\"252\" width=\"40\" height=\"28\" rx=\"5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" class=\"s-blue\"/><text x=\"238\" y=\"271\" text-anchor=\"middle\" font-size=\"11\">T3</text><text x=\"318\" y=\"271\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\">hold no lock</text><path d=\"M340,160 L340,228\" stroke=\"currentColor\" stroke-width=\"1.8\" class=\"s-blue\"/><path d=\"M340,238 L334,226 L346,226 Z\" class=\"f-blue\"/><text x=\"350\" y=\"182\" font-size=\"11\" class=\"t-blue\">wait(lock):</text><text x=\"350\" y=\"197\" font-size=\"11\" class=\"t-blue\">unlock + sleep,</text><text x=\"350\" y=\"212\" font-size=\"11\" class=\"t-blue\">as one step</text><path d=\"M150,266 L64,266 L64,80\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" class=\"s-teal\"/><path d=\"M64,70 L58,82 L70,82 Z\" class=\"f-teal\"/><text x=\"74\" y=\"168\" font-size=\"11\" class=\"t-teal\">notify_one():</text><text x=\"74\" y=\"183\" font-size=\"11\" class=\"t-teal\">move a sleeper to</text><text x=\"74\" y=\"198\" font-size=\"11\" class=\"t-teal\">the mutex queue;</text><text x=\"74\" y=\"213\" font-size=\"11\" class=\"t-teal\">it relocks, then</text><text x=\"74\" y=\"228\" font-size=\"11\" class=\"t-teal\">rechecks (while)</text><path d=\"M360,100 L440,100\" stroke=\"currentColor\" stroke-width=\"1.8\" class=\"s-green\"/><path d=\"M450,100 L438,94 L438,106 Z\" class=\"f-green\"/><text x=\"404\" y=\"90\" text-anchor=\"middle\" font-size=\"11\" class=\"t-green\">unlock()</text><text x=\"260\" y=\"332\" text-anchor=\"middle\" font-size=\"11\" class=\"t-gray\">A condition variable has no state of its own: the condition lives in the shared data.</text></svg>",
          alt: 'A critical section box guarded by a mutex, with one owner thread inside. Threads T4 and T5 wait in a queue to lock the mutex. Below, a dashed box for the condition variable notEmpty holds sleeping threads T2 and T3, which hold no lock. An arrow from the critical section down to the condition variable is labelled "wait(lock): unlock + sleep, as one step". An arrow from the condition variable up to the mutex queue is labelled "notify_one(): move a sleeper to the mutex queue; it relocks, then rechecks (while)".',
          caption: 'Two kinds of waiting. Threads queued on the **mutex** want to enter; threads on the **condition variable** are inside the protocol but waiting for the state to change. A notified thread must still win the mutex before it can continue.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does the condition variable not just remember notifications?',
          text: 'Because the thing worth remembering is already stored: the **shared state**. A non-empty queue *is* the memory that work arrived. If the waiter checks that state under the mutex before sleeping, it can never miss work, and the condition variable can stay a simple, stateless queue of sleepers. Something that does remember signals, a counter, is a semaphore, which is the second half of this lesson.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Notify inside or outside the lock?',
          text: 'Both are correct, provided the **state change** happened under the lock. Notifying after unlocking can save the woken thread from waking up only to block on the mutex you still hold; notifying while holding the lock is simpler to reason about and needed in a few patterns (for example when the condition variable might be destroyed right after the state change). Changing the state *without* the lock is the real bug: it reopens the lost-wakeup window above.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'truefalse',
      prompt: 'Calling `notify_one()` on a `std::condition_variable` while **not** holding the associated mutex is undefined behavior.',
      answer: false,
      explanation:
        'Notifying without holding the mutex is allowed by both C++ and POSIX, and is sometimes slightly faster. What *is* required is that the shared state the waiters check was **modified while holding the mutex**. If you set `ready = true` outside the lock, a waiter can check `ready` (false), get descheduled, miss your notification, and then sleep forever. The rule is about the data, not about the call to `notify`.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Always wait in a while loop',
      blocks: [
        {
          type: 'p',
          text: 'When a waiter wakes up and reacquires the mutex, is the condition true? **Not necessarily**, for three reasons:',
        },
        {
          type: 'list',
          items: [
            '**Another thread got there first.** `notify_one` moves a sleeper toward the mutex, but it must still win the lock. Meanwhile some other consumer that was not even waiting may grab the mutex and take the item. By the time our waiter runs, the queue is empty again.',
            '**notify_all woke everyone.** Ten consumers wake for one item; one gets it, nine must go back to sleep.',
            '**Spurious wakeups.** POSIX and C++ both allow `wait` to return without any notification at all. Implementations need this freedom: a futex wait can be interrupted by a signal, and some multiprocessor implementations cannot cheaply guarantee exactly-once wakeups.',
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Wrong: if',
            tone: 'bad',
            code: `std::unique_lock lock{m};
if (jobs.empty()) {
    cv.wait(lock);
}
auto job = jobs.front();  // may be empty!
jobs.pop();`,
            text: 'Assumes "I was woken" means "the condition holds". With two consumers or one spurious wakeup, `front()` on an empty queue is undefined behavior.',
          },
          right: {
            title: 'Right: while, or a predicate',
            tone: 'good',
            code: `std::unique_lock lock{m};
while (jobs.empty()) {
    cv.wait(lock);
}
// same thing, shorter:
// cv.wait(lock, [&] { return !jobs.empty(); });
auto job = jobs.front();
jobs.pop();`,
            text: 'Re-check after every wakeup, under the lock. The predicate overload is defined as exactly this loop.',
          },
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Mesa versus Hoare semantics',
          text: 'Tony Hoare\'s 1974 monitors handed the lock *directly* to the woken thread, so the condition was guaranteed true when it ran, and an `if` was enough. That made the signaller give up the CPU at every signal. Lampson and Redell\'s Mesa language (1980) made a signal a mere **hint**: the woken thread just becomes runnable and competes for the lock like anyone else. [[mesa-semantics|Mesa semantics]] are cheaper and simpler to implement, and every real system (pthreads, Java, C++, Windows `CONDITION_VARIABLE`) uses them. That is why the `while` is not optional.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'bug',
      prompt: 'Two worker threads run `takeJob`, and the game thread pushes jobs and calls `notify_one`. Very rarely a worker crashes inside `front()`. Tap the buggy line.',
      code: `std::mutex m;
std::condition_variable jobReady;
std::deque<Job> jobs;

Job takeJob() {
    std::unique_lock lock{m};
    if (jobs.empty()) {
        jobReady.wait(lock);
    }
    Job job = std::move(jobs.front());
    jobs.pop_front();
    return job;
}`,
      bugLines: [7],
      hint: 'Is the queue guaranteed to be non-empty when `wait` returns?',
      explanation:
        'With Mesa semantics, waking up only means "something may have changed". Worker A waits; the game thread pushes a job and notifies; before A reacquires the mutex, worker B (which was not waiting) locks, sees a job and takes it. A then returns from `wait`, skips any re-check because of the `if`, and calls `front()` on an empty deque: undefined behavior, here a crash. A spurious wakeup does the same with just one worker. Change `if` to `while`, or write `jobReady.wait(lock, [] { return !jobs.empty(); });`.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'The bounded buffer',
      blocks: [
        {
          type: 'p',
          text: 'The classic [[bounded-buffer|producer/consumer problem]]: producers put items into a buffer with a fixed number of slots, and consumers take them out. Producers must wait when it is full, consumers when it is empty. It is everywhere: the audio mixer filling buffers the sound card drains, the game thread queueing render commands, the streaming thread handing decompressed chunks to workers, and a pipe between two processes, which is a bounded buffer inside the kernel.',
        },
        {
          type: 'p',
          text: 'Two different conditions mean two condition variables: `notFull` for producers and `notEmpty` for consumers. Watch one producer and one consumer share three slots:',
        },
        {
  "type": "algo",
  "view": "array",
  "code": "void put(T item) {\n  std::unique_lock lk{m};\n  while (count == N)\n    notFull.wait(lk);\n  buf[in] = item;\n  in = (in + 1) % N; ++count;\n  notEmpty.notify_one();\n}\nT get() {\n  std::unique_lock lk{m};\n  while (count == 0)\n    notEmpty.wait(lk);\n  T item = buf[out];\n  out = (out + 1) % N; --count;\n  notFull.notify_one();\n  return item;\n}",
  "interval": 1500,
  "caption": "A bounded buffer with one mutex and two condition variables. Blue = holds an item.",
  "frames": [
    {
      "note": "Empty buffer of 3 slots. `in` is where the producer writes next, `out` where the consumer reads next.",
      "array": [
        "·",
        "·",
        "·"
      ],
      "marks": [],
      "pointers": [
        {
          "index": 0,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 0,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [],
      "vars": [
        [
          "count",
          "0"
        ],
        [
          "producer",
          "running"
        ],
        [
          "consumer",
          "running"
        ],
        [
          "notFull waiters",
          "none"
        ],
        [
          "notEmpty waiters",
          "none"
        ],
        [
          "signal",
          "—"
        ]
      ]
    },
    {
      "note": "Buffer empty: the consumer waits on `notEmpty`, releasing the mutex.",
      "array": [
        "·",
        "·",
        "·"
      ],
      "marks": [],
      "pointers": [
        {
          "index": 0,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 0,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [
        11,
        12
      ],
      "vars": [
        [
          "count",
          "0"
        ],
        [
          "producer",
          "running"
        ],
        [
          "consumer",
          "asleep on notEmpty"
        ],
        [
          "notFull waiters",
          "none"
        ],
        [
          "notEmpty waiters",
          "C"
        ],
        [
          "signal",
          "—"
        ]
      ]
    },
    {
      "note": "Producer puts item 1 in slot 0 and signals `notEmpty`.",
      "array": [
        1,
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 0,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 0,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "count",
          "1"
        ],
        [
          "producer",
          "running"
        ],
        [
          "consumer",
          "woken: must recheck"
        ],
        [
          "notFull waiters",
          "none"
        ],
        [
          "notEmpty waiters",
          "none"
        ],
        [
          "signal",
          "notEmpty.notify_one() wakes consumer"
        ]
      ]
    },
    {
      "note": "The woken consumer reacquires the mutex and **rechecks** the `while` condition: count is 1, so it proceeds.",
      "array": [
        1,
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
          "index": 1,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 0,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [
        11
      ],
      "vars": [
        [
          "count",
          "1"
        ],
        [
          "producer",
          "running"
        ],
        [
          "consumer",
          "running"
        ],
        [
          "notFull waiters",
          "none"
        ],
        [
          "notEmpty waiters",
          "none"
        ],
        [
          "signal",
          "notEmpty.notify_one() wakes consumer"
        ]
      ]
    },
    {
      "note": "Consumer takes item 1 from slot 0 and signals `notFull`.",
      "array": [
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 1,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [
        13,
        14,
        15
      ],
      "vars": [
        [
          "count",
          "0"
        ],
        [
          "producer",
          "running"
        ],
        [
          "consumer",
          "running"
        ],
        [
          "notFull waiters",
          "none"
        ],
        [
          "notEmpty waiters",
          "none"
        ],
        [
          "signal",
          "notFull.notify_one(): nobody waiting, signal lost (harmless)"
        ]
      ]
    },
    {
      "note": "Producer puts item 2 in slot 1 and signals `notEmpty`.",
      "array": [
        "·",
        2,
        "·"
      ],
      "marks": [
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 1,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "count",
          "1"
        ],
        [
          "producer",
          "running"
        ],
        [
          "consumer",
          "running"
        ],
        [
          "notFull waiters",
          "none"
        ],
        [
          "notEmpty waiters",
          "none"
        ],
        [
          "signal",
          "notEmpty.notify_one(): nobody waiting, signal lost (harmless)"
        ]
      ]
    },
    {
      "note": "Producer puts item 3 in slot 2 and signals `notEmpty`.",
      "array": [
        "·",
        2,
        3
      ],
      "marks": [
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 1,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "count",
          "2"
        ],
        [
          "producer",
          "running"
        ],
        [
          "consumer",
          "running"
        ],
        [
          "notFull waiters",
          "none"
        ],
        [
          "notEmpty waiters",
          "none"
        ],
        [
          "signal",
          "notEmpty.notify_one(): nobody waiting, signal lost (harmless)"
        ]
      ]
    },
    {
      "note": "Producer puts item 4 in slot 0 and signals `notEmpty`.",
      "array": [
        4,
        2,
        3
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
          "index": 0,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 1,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "count",
          "3"
        ],
        [
          "producer",
          "running"
        ],
        [
          "consumer",
          "running"
        ],
        [
          "notFull waiters",
          "none"
        ],
        [
          "notEmpty waiters",
          "none"
        ],
        [
          "signal",
          "notEmpty.notify_one(): nobody waiting, signal lost (harmless)"
        ]
      ]
    },
    {
      "note": "Buffer full: the producer's `while` test is true, so it **waits**, which releases the mutex while it sleeps.",
      "array": [
        4,
        2,
        3
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
          "index": 1,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 1,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [
        3,
        4
      ],
      "vars": [
        [
          "count",
          "3"
        ],
        [
          "producer",
          "asleep on notFull"
        ],
        [
          "consumer",
          "running"
        ],
        [
          "notFull waiters",
          "P"
        ],
        [
          "notEmpty waiters",
          "none"
        ],
        [
          "signal",
          "—"
        ]
      ]
    },
    {
      "note": "Consumer takes item 2 from slot 1 and signals `notFull`.",
      "array": [
        4,
        "·",
        3
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 2,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [
        13,
        14,
        15
      ],
      "vars": [
        [
          "count",
          "2"
        ],
        [
          "producer",
          "woken: must recheck"
        ],
        [
          "consumer",
          "running"
        ],
        [
          "notFull waiters",
          "none"
        ],
        [
          "notEmpty waiters",
          "none"
        ],
        [
          "signal",
          "notFull.notify_one() wakes producer"
        ]
      ]
    },
    {
      "note": "The producer wakes, reacquires the mutex and rechecks: count is 2 now, so there is room.",
      "array": [
        4,
        "·",
        3
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 2,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "count",
          "2"
        ],
        [
          "producer",
          "running"
        ],
        [
          "consumer",
          "running"
        ],
        [
          "notFull waiters",
          "none"
        ],
        [
          "notEmpty waiters",
          "none"
        ],
        [
          "signal",
          "notFull.notify_one() wakes producer"
        ]
      ]
    },
    {
      "note": "Producer puts item 5 in slot 1 and signals `notEmpty`.",
      "array": [
        4,
        5,
        3
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
          "index": 1,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 2,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "count",
          "3"
        ],
        [
          "producer",
          "running"
        ],
        [
          "consumer",
          "running"
        ],
        [
          "notFull waiters",
          "none"
        ],
        [
          "notEmpty waiters",
          "none"
        ],
        [
          "signal",
          "notEmpty.notify_one(): nobody waiting, signal lost (harmless)"
        ]
      ]
    },
    {
      "note": "Consumer takes item 3 from slot 2 and signals `notFull`.",
      "array": [
        4,
        5,
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
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 0,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [
        13,
        14,
        15
      ],
      "vars": [
        [
          "count",
          "2"
        ],
        [
          "producer",
          "running"
        ],
        [
          "consumer",
          "running"
        ],
        [
          "notFull waiters",
          "none"
        ],
        [
          "notEmpty waiters",
          "none"
        ],
        [
          "signal",
          "notFull.notify_one(): nobody waiting, signal lost (harmless)"
        ]
      ]
    },
    {
      "note": "Consumer takes item 4 from slot 0 and signals `notFull`.",
      "array": [
        "·",
        5,
        "·"
      ],
      "marks": [
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 1,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [
        13,
        14,
        15
      ],
      "vars": [
        [
          "count",
          "1"
        ],
        [
          "producer",
          "running"
        ],
        [
          "consumer",
          "running"
        ],
        [
          "notFull waiters",
          "none"
        ],
        [
          "notEmpty waiters",
          "none"
        ],
        [
          "signal",
          "notFull.notify_one(): nobody waiting, signal lost (harmless)"
        ]
      ]
    },
    {
      "note": "Consumer takes item 5 from slot 1 and signals `notFull`.",
      "array": [
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 1,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "in",
          "color": "orange"
        },
        {
          "index": 2,
          "label": "out",
          "color": "green"
        }
      ],
      "lines": [
        13,
        14,
        15
      ],
      "vars": [
        [
          "count",
          "0"
        ],
        [
          "producer",
          "running"
        ],
        [
          "consumer",
          "running"
        ],
        [
          "notFull waiters",
          "none"
        ],
        [
          "notEmpty waiters",
          "none"
        ],
        [
          "signal",
          "notFull.notify_one(): nobody waiting, signal lost (harmless)"
        ]
      ]
    }
  ]
},
        {
          type: 'p',
          text: 'Here is a complete version with a `close()` operation, so consumers know when to stop. One producer feeds 20 items to two consumers; which consumer gets which item varies from run to run, so the program prints only totals, which are always the same.',
        },
        {
          type: 'code',
          runnable: true,
          title: 'bounded_buffer.cpp',
          code: `#include <condition_variable>
#include <cstddef>
#include <iostream>
#include <mutex>
#include <optional>
#include <queue>
#include <thread>

template <typename T>
class BoundedBuffer {
public:
    explicit BoundedBuffer(std::size_t capacity)
        : capacity_{capacity} {}

    void put(T item) {
        std::unique_lock lock{m_};
        while (items_.size() == capacity_) {   // full
            notFull_.wait(lock);
        }
        items_.push(std::move(item));
        notEmpty_.notify_one();
    }

    std::optional<T> get() {                   // nullopt = closed
        std::unique_lock lock{m_};
        while (items_.empty() && !closed_) {   // empty
            notEmpty_.wait(lock);
        }
        if (items_.empty()) return std::nullopt;
        T item = std::move(items_.front());
        items_.pop();
        notFull_.notify_one();
        return item;
    }

    void close() {
        std::lock_guard lock{m_};
        closed_ = true;
        notEmpty_.notify_all();                // wake every consumer
    }

private:
    std::mutex m_;
    std::condition_variable notFull_;
    std::condition_variable notEmpty_;
    std::queue<T> items_;
    std::size_t capacity_;
    bool closed_ = false;
};

int main() {
    BoundedBuffer<int> buffer{3};
    long sums[2] = {0, 0};
    int counts[2] = {0, 0};
    auto consume = [&](int k) {
        while (auto item = buffer.get()) {
            sums[k] += *item;
            ++counts[k];
        }
    };
    {
        std::jthread producer{[&] {
            for (int i = 1; i <= 20; ++i) buffer.put(i);
            buffer.close();
        }};
        std::jthread c0{consume, 0};
        std::jthread c1{consume, 1};
    }
    std::cout << "items consumed: " << counts[0] + counts[1] << '\\n';
    std::cout << "sum of items:   " << sums[0] + sums[1] << '\\n';
}`,
          output: 'items consumed: 20\nsum of items:   210',
          annotations: [
            { lines: '17-19', text: 'Producers wait on `notFull_` while there is no room, re-checking after every wakeup.' },
            { lines: 21, text: 'We just made the buffer non-empty, so a consumer may be able to proceed.' },
            { lines: 26, text: 'Consumers wait while there is nothing to take **and** the buffer is still open. The condition can be any expression over the protected state.' },
            { lines: 29, text: 'Woke up with nothing to take: the buffer must be closed and drained. Returning an empty optional ends the consumer\'s loop.' },
            { lines: 32, text: 'We just freed a slot. `notify_one` is enough: one free slot can help at most one producer.' },
            { lines: 39, text: 'Closing changes the condition for **every** consumer, so wake them all. `notify_one` here would leave the other consumer asleep forever.' },
            { lines: '68-70', text: 'Each consumer writes only its own element of `sums` and `counts`; `main` reads them after the `jthread`s have joined at the end of the block.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Why not one condition variable?',
          text: 'With a single condition variable for both "not full" and "not empty", a consumer that takes an item and calls `notify_one` might wake **another consumer** instead of the sleeping producer. That consumer finds the buffer empty and goes back to sleep, and now everyone can be asleep at once. One condition variable per condition avoids this; the alternative, `notify_all` on a shared one, works but wakes threads that cannot proceed.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'order',
      prompt: 'A consumer calls `cv.wait(lock, [&] { return !items.empty(); })` while the buffer is empty, and later a producer adds an item. Put the consumer\'s experience in order.',
      lines: [
        'Holding the mutex, evaluate the predicate: the buffer is empty, so it is false',
        'Atomically release the mutex and go to sleep on the condition variable',
        'The producer locks the mutex, adds an item and calls `notify_one`',
        'Wake up and reacquire the mutex before `wait` can return',
        'Evaluate the predicate again: now true, so return and take the item while still holding the lock',
      ],
      linesAreCode: false,
      explanation:
        'The predicate is first checked under the lock, so the consumer cannot miss an item that arrived before it slept. Releasing and sleeping are one step, so the producer cannot slip a notification into a gap. After waking, the consumer must hold the mutex again before it may look at the buffer, and it rechecks because, with Mesa semantics, another thread might have taken the item first or the wakeup might have been spurious.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Semaphores',
      blocks: [
        {
          type: 'p',
          text: 'Edsger Dijkstra invented the **[[semaphore]]** in the early 1960s for the THE operating system, and it predates condition variables. A semaphore is an integer counter with two atomic operations:',
        },
        {
          type: 'list',
          items: [
            '**P** (Dutch *proberen*, "try"; C++ `acquire`, POSIX `sem_wait`): if the counter is positive, decrement it and continue; if it is zero, sleep until it is positive, then decrement.',
            '**V** (*verhogen*, "increase"; C++ `release`, POSIX `sem_post`): increment the counter and wake one sleeper if there is one.',
          ],
        },
        {
          type: 'p',
          text: 'Unlike a condition variable, a semaphore **remembers**: a `release` with nobody waiting is not lost, it is banked in the counter. Think of the counter as a number of permits. That one idea covers three uses:',
        },
        {
          type: 'table',
          headers: ['Use', 'Initial value', 'Example'],
          rows: [
            ['Lock (binary semaphore)', '1', '`acquire` to enter, `release` to leave'],
            ['Signal an event / ordering', '0', 'The waiter `acquire`s and sleeps until the other thread `release`s'],
            ['Limit concurrency (counting)', '*N*', 'At most *N* threads decompress textures at once, *N* free slots in a buffer'],
          ],
        },
        {
          type: 'code',
          runnable: true,
          title: 'semaphore_buffer.cpp',
          code: `#include <array>
#include <iostream>
#include <mutex>
#include <semaphore>
#include <thread>

constexpr int kSlots = 4;
std::array<int, kSlots> ring{};
int in = 0, out = 0;
std::counting_semaphore<kSlots> emptySlots{kSlots};
std::counting_semaphore<kSlots> fullSlots{0};
std::mutex ringMutex;

void put(int value) {
    emptySlots.acquire();               // wait for a free slot
    {
        std::lock_guard lock{ringMutex};
        ring[in] = value;
        in = (in + 1) % kSlots;
    }
    fullSlots.release();                // one more item to take
}

int take() {
    fullSlots.acquire();                // wait for an item
    int value;
    {
        std::lock_guard lock{ringMutex};
        value = ring[out];
        out = (out + 1) % kSlots;
    }
    emptySlots.release();               // one more free slot
    return value;
}

int main() {
    long total = 0;
    {
        std::jthread producer{[] {
            for (int i = 1; i <= 100; ++i) put(i);
        }};
        std::jthread consumer{[&total] {
            for (int i = 0; i < 100; ++i) total += take();
        }};
    }
    std::cout << "total = " << total << '\\n';
}`,
          output: 'total = 5050',
          annotations: [
            { lines: '10-11', text: 'Two counters replace the two condition variables and the `while` loops: `emptySlots` counts free slots (starts full: 4), `fullSlots` counts items (starts at 0). The template argument is the maximum value the counter may reach.' },
            { lines: 15, text: 'Sleeps while there are 0 free slots. After it returns, this producer owns one slot, so it cannot overfill the buffer.' },
            { lines: '16-20', text: 'The semaphores count, but they do not protect `ring`, `in` and `out` from two producers at once. That still needs a mutex (with one producer and one consumer, as here, the indices are never shared, but keep the mutex so more threads stay safe).' },
            { lines: 21, text: 'Bank one item for consumers. If a consumer is asleep in `fullSlots.acquire()`, it wakes.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Order matters: semaphore first, then mutex',
          text: 'If `put` locked `ringMutex` **before** `emptySlots.acquire()`, a producer could fall asleep on a full buffer while holding the mutex. The consumer then blocks on the mutex and can never take an item to free a slot. Both threads wait forever: a deadlock. Acquire the counting semaphore first, then take the mutex only for the short update.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'numeric',
      prompt: 'In `semaphore_buffer.cpp` (`kSlots = 4`), suppose that at some moment the producer has completed **9** calls to `put` and the consumer has completed **7** calls to `take`, and nobody is in the middle of a call. What is the value of the `emptySlots` counter?',
      answer: 2,
      hint: 'Each `put` takes one free-slot permit; each `take` gives one back.',
      explanation:
        '`emptySlots` starts at 4. Each completed `put` acquired one permit (−9) and each completed `take` released one (+7): 4 − 9 + 7 = **2**. Equivalently, 9 − 7 = 2 items are in the buffer, so 4 − 2 = 2 slots are free, and `fullSlots` is 2. The invariant `emptySlots + fullSlots = 4` holds whenever no call is half done, which is a good thing to assert in a debug build.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Building a semaphore, and the C++ and OS versions',
      blocks: [
        {
          type: 'p',
          text: 'A semaphore is easy to build from the tools you already have: a counter protected by a mutex, and a condition variable to sleep on while the counter is zero. This version limits how many threads decode textures at once:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'my_semaphore.cpp',
          code: `#include <algorithm>
#include <condition_variable>
#include <iostream>
#include <mutex>
#include <thread>
#include <vector>

class Semaphore {
public:
    explicit Semaphore(int initial) : count_{initial} {}
    void acquire() {
        std::unique_lock lock{m_};
        cv_.wait(lock, [this] { return count_ > 0; });
        --count_;
    }
    void release() {
        {
            std::lock_guard lock{m_};
            ++count_;
        }
        cv_.notify_one();
    }
private:
    std::mutex m_;
    std::condition_variable cv_;
    int count_;
};

Semaphore decoders{2};          // at most 2 decodes at once
std::mutex statsMutex;
int active = 0, peak = 0;

void decodeTexture() {
    decoders.acquire();
    {
        std::lock_guard lock{statsMutex};
        peak = std::max(peak, ++active);
    }
    std::this_thread::yield();  // pretend to work
    {
        std::lock_guard lock{statsMutex};
        --active;
    }
    decoders.release();
}

int main() {
    {
        std::vector<std::jthread> loaders;
        for (int i = 0; i < 6; ++i) {
            loaders.emplace_back([] {
                for (int k = 0; k < 1000; ++k) decodeTexture();
            });
        }
    }
    std::cout << "peak above 2? " << (peak > 2 ? "yes" : "no") << '\\n';
}`,
          output: 'peak above 2? no',
          annotations: [
            { lines: 13, text: 'Sleep while there are no permits. The predicate overload hides the `while` loop, but it is still there.' },
            { lines: 14, text: 'Take a permit while still holding the lock, so two threads can never take the last permit twice.' },
            { lines: '17-21', text: 'Return a permit under the lock, then wake one sleeper. One permit can satisfy at most one waiter, so `notify_one` is right.' },
            { lines: 36, text: '`peak` records the largest number of threads ever inside at once. Six threads compete, but the semaphore never lets more than two in.' },
          ],
        },
        {
          type: 'table',
          headers: ['API', 'Create', 'P / acquire', 'V / release'],
          rows: [
            ['C++20 `<semaphore>`', '`std::counting_semaphore<Max> s{n};` or `std::binary_semaphore`', '`s.acquire()`, `try_acquire()`, `try_acquire_for(d)`', '`s.release()` or `s.release(k)`'],
            ['POSIX', '`sem_init(&s, 0, n)` (or named: `sem_open`)', '`sem_wait(&s)`', '`sem_post(&s)`'],
            ['Win32', '`CreateSemaphoreW(nullptr, n, max, nullptr)`', '`WaitForSingleObject(h, INFINITE)`', '`ReleaseSemaphore(h, 1, nullptr)`'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have both semaphores and condition variables?',
          text: 'They are equally powerful: each can build the other. Semaphores shine when the condition really is a **count** (free slots, permits, pending signals), because the counter remembers releases that happen before anyone waits. Condition variables shine when the condition is an arbitrary expression over several variables ("queue non-empty **or** shutting down"), which a single counter cannot express. A semaphore also has no owner: any thread may `release`, which makes it ideal for signalling between threads but means it catches none of the misuse that a mutex can.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Not a lock substitute',
          text: '`std::binary_semaphore` can act as a lock, but prefer `std::mutex` for mutual exclusion. A mutex has an owner, which lets debuggers and sanitizers report "unlocked by the wrong thread", and lets some implementations apply priority inheritance (next unit). Semaphores are for counting and signalling.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'fill',
      prompt: 'Complete the semaphore built from a mutex and a condition variable.',
      template: `void acquire() {
    std::___ lock{m_};
    cv_.wait(lock, [this] { return count_ > 0; });
    ___count_;
}
void release() {
    {
        std::lock_guard lock{m_};
        ++count_;
    }
    cv_.___();
}`,
      blanks: [{ answers: ['unique_lock'] }, { answers: ['--'] }, { answers: ['notify_one'] }],
      wordBank: ['unique_lock', 'lock_guard', '--', '++', 'notify_one', 'notify_all', 'wait'],
      explanation:
        '`wait` must unlock and relock the mutex, which `lock_guard` cannot do, so `acquire` needs a `std::unique_lock`. After the predicate says a permit exists, the thread takes it with `--count_` while still holding the lock. `release` adds one permit, and one permit can satisfy at most one waiter, so `notify_one` is enough; `notify_all` would also be correct but would wake threads that immediately go back to sleep.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Latches and barriers: waiting for a whole group',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes the condition is "everyone has reached this point". C++20 provides two primitives for it ([[thread-barrier]]):',
        },
        {
          type: 'list',
          items: [
            '**`std::latch`**: a one-shot countdown. Threads call `count_down()`; anyone calling `wait()` sleeps until the count reaches zero. It cannot be reset. Use it for start-up and shutdown: "all loaders done", "all workers ready".',
            '**`std::barrier`**: a reusable rendezvous for a fixed group. Each participant calls `arrive_and_wait()` at the end of a phase; when the last one arrives, an optional **completion function** runs once, then everyone is released and the barrier resets for the next phase. Use it for repeated lockstep work: physics substeps, simulation ticks.',
          ],
        },
        {
          type: 'code',
          runnable: true,
          title: 'latch_barrier.cpp',
          code: `#include <array>
#include <barrier>
#include <iostream>
#include <latch>
#include <thread>
#include <vector>

constexpr int kWorkers = 3;
std::array<int, kWorkers> partial{};
int frame = 1;

void onPhaseDone() noexcept {                 // runs once per phase
    int sum = partial[0] + partial[1] + partial[2];
    std::cout << "frame " << frame << ": physics sum " << sum << '\\n';
    ++frame;
}

int main() {
    std::latch assetsLoaded{kWorkers};
    std::latch startGame{1};
    std::barrier frameSync{kWorkers, onPhaseDone};
    std::vector<std::jthread> workers;
    for (int w = 0; w < kWorkers; ++w) {
        workers.emplace_back([&, w] {
            assetsLoaded.count_down();        // "my assets are ready"
            startGame.wait();                 // until main says go
            for (int f = 1; f <= 3; ++f) {
                partial[w] = (w + 1) * f;     // this frame's work
                frameSync.arrive_and_wait();  // wait for everyone
            }
        });
    }
    assetsLoaded.wait();
    std::cout << "all assets loaded\\n";
    startGame.count_down();                   // release the workers
}`,
          output: 'all assets loaded\nframe 1: physics sum 6\nframe 2: physics sum 12\nframe 3: physics sum 18',
          annotations: [
            { lines: '12-16', text: 'The completion function runs on **one** of the arriving threads, after all have arrived and before any is released, so it may safely read every worker\'s result. `std::barrier` requires it to be `noexcept`.' },
            { lines: '19-20', text: 'Two latches: one counts down from 3 as workers finish loading; the other, counting from 1, is a "start" gun that `main` fires.' },
            { lines: 26, text: 'Without this second latch, the workers could finish frame 1 before `main` prints "all assets loaded", and the output order would vary.' },
            { lines: '28-29', text: 'Each worker writes only its own slot, then waits. No worker can start frame 2 until the completion function has summed frame 1.' },
            { lines: 22, text: '`workers` is declared after the latches and the barrier, so it is destroyed first: the `jthread`s join before the objects they use disappear.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Barriers in engines',
          text: 'A barrier makes every thread wait for the slowest one, so uneven work wastes cores at every phase boundary. That is fine for a few fixed phases per frame (and pthreads has `pthread_barrier_wait` for the same job), but engines with many small, uneven tasks prefer job systems with dependency counters, where a finished worker grabs the next ready job instead of waiting. That is next unit\'s topic.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'Four simulation threads must each finish substep *k* before any of them starts substep *k + 1*, eight substeps per frame, every frame. Which primitive fits best?',
      options: [
        { text: '`std::latch` with a count of 4', why: 'A latch is single-use: once it reaches zero it stays there. You would need a new latch for every substep of every frame.' },
        { text: '`std::barrier` with 4 participants', correct: true, why: 'A barrier resets automatically after each phase, and its completion function can do per-substep bookkeeping exactly once.' },
        { text: 'One `std::mutex` that each thread locks for its whole substep', why: 'That serializes the substeps (only one thread computes at a time) and still does not make anyone wait for the others to finish.' },
        { text: '`std::binary_semaphore` released once by each thread', why: 'A binary semaphore\'s counter tops out at 1, and nothing in it tracks how many of the four have arrived or resets for the next phase.' },
      ],
      explanation:
        'Repeated "everyone waits for everyone" points are exactly what `std::barrier` (or `pthread_barrier_t`) is for. Use `std::latch` for one-time events such as start-up, semaphores for counted resources and signals, and condition variables for arbitrary conditions.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Game and render threads in lockstep',
      blocks: [
        {
          type: 'p',
          text: 'Semaphores make a neat handshake between two threads. The game thread simulates a frame and signals the render thread; the render thread draws it and signals back. Two binary semaphores give strict alternation:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'frame_handshake.cpp',
          code: `#include <iostream>
#include <semaphore>
#include <thread>

std::binary_semaphore frameReady{0};   // game -> render
std::binary_semaphore renderDone{1};   // render -> game (1: may start)

int main() {
    std::jthread render{[] {
        for (int f = 1; f <= 3; ++f) {
            frameReady.acquire();          // wait for frame f
            std::cout << "  render: draw frame " << f << '\\n';
            renderDone.release();
        }
    }};
    for (int f = 1; f <= 3; ++f) {
        renderDone.acquire();              // previous frame drawn?
        std::cout << "game:   simulate frame " << f << '\\n';
        frameReady.release();
    }
}`,
          output: 'game:   simulate frame 1\n  render: draw frame 1\ngame:   simulate frame 2\n  render: draw frame 2\ngame:   simulate frame 3\n  render: draw frame 3',
          annotations: [
            { lines: 5, text: 'Starts at 0: the render thread has nothing to draw until the game thread produces frame 1.' },
            { lines: 6, text: 'Starts at 1: the game thread may simulate the first frame immediately.' },
            { lines: '11-13', text: 'Each `release` on one side is matched by an `acquire` on the other, so the two threads take strict turns and the output order is fixed.' },
          ],
        },
        {
          type: 'p',
          text: 'Strict alternation wastes parallelism: while one thread works, the other waits. Real engines let the game thread simulate frame *N + 1* while the render thread draws frame *N*, by double-buffering the frame data and allowing one frame of lead (a semaphore with 2 permits instead of 1). Allowing more lead raises throughput but adds input latency, because what you see is older than what the game is computing. That is the trade-off behind every engine\'s "frames in flight" setting.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal',
          text: 'Unreal\'s game thread may run at most about one frame ahead of the render thread; at the end of each frame it waits on a render fence (`FRenderCommandFence`) if the render thread has fallen behind. In Unreal Insights, that wait shows up on the game thread as time spent waiting for the render thread, a sign that the bottleneck is rendering, not gameplay.',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'numeric',
      prompt: 'A `std::counting_semaphore<8> s{3};` is shared by threads. Five threads call `s.acquire()` (and nobody releases yet). Then one thread calls `s.release()`. Afterwards, how many threads are **still blocked** in `acquire`?',
      answer: 1,
      unit: 'threads',
      hint: 'How many of the five get a permit immediately, and how many permits does one `release` add?',
      explanation:
        'Three permits let the first three `acquire` calls through, taking the counter to 0, and the other two block. `release()` adds one permit, which lets exactly one of the two sleepers through, taking the counter straight back to 0. That leaves **1** thread blocked. (Textbook semaphores in OSTEP\'s style let the counter go negative, where −2 would mean "two waiters"; C++ and POSIX semaphores never go below 0 and keep the waiters separately, but the number blocked is the same.)',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'concept',
      title: 'Choosing a waiting primitive',
      blocks: [
        {
          type: 'table',
          headers: ['You need to…', 'Use', 'Why'],
          rows: [
            ['Wait for an arbitrary condition on shared data', '`std::condition_variable` + `std::mutex`', 'Any predicate; the state lives in your data'],
            ['Count resources or bank signals', '`std::counting_semaphore`', 'Releases are remembered; no mutex needed for the count itself'],
            ['Signal one event from one thread to another, repeatedly', '`std::binary_semaphore`, or `std::atomic<T>::wait`/`notify_one`', 'Cheapest one-to-one handshake'],
            ['Get one result back from a task', '`std::future` / `std::promise`', 'Carries the value or exception, not just a signal'],
            ['Wait once for *N* threads or events', '`std::latch`', 'Single use, counts down to zero'],
            ['Run in lockstep phases', '`std::barrier`', 'Reusable, with a completion step'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Always have a way out',
          text: 'Every wait needs a matching way to end it at shutdown, or the game hangs on exit. The `close()` in the bounded buffer is one pattern; `std::condition_variable_any` can also wait with a `std::stop_token` from a `std::jthread`, so `request_stop()` wakes the waiter. Timed waits (`wait_for`, `try_acquire_for`) are a safety net, not a design: a thread that times out still needs to know what to do next.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Under the hood',
          text: 'On Linux all of these bottom out in the [[futex]] from the previous lesson: libstdc++\'s condition variables wrap glibc\'s `pthread_cond_t`, and its C++20 semaphores, latches and barriers use `std::atomic` waiting, which uses futexes. On Windows, Microsoft\'s STL builds them on `SRWLOCK`, `CONDITION_VARIABLE` and `WaitOnAddress`. In every case the uncontended path stays in user space.',
        },
      ],
    },
  ],
  takeaways: [
    'A condition variable is a queue of sleepers; the condition itself lives in shared state protected by a mutex.',
    '`wait(lock)` releases the mutex and sleeps in one atomic step, then relocks before returning, which is what prevents lost wakeups.',
    'With Mesa semantics, a wakeup is only a hint: always re-check in a `while` loop or use the predicate overload.',
    'A bounded buffer needs two conditions (not full, not empty): two condition variables, or two counting semaphores plus a mutex for the data.',
    'A semaphore is a counter of permits that remembers releases; acquire the semaphore before the mutex, never while holding it.',
    '`std::latch` is a one-shot countdown; `std::barrier` is a reusable phase rendezvous with a completion function.',
    'Every blocking wait needs a shutdown path, and all of these primitives are built on futex-style kernel waiting.',
  ],
  reading: [
    {
      title: 'Operating Systems: Three Easy Pieces, "Condition Variables" chapter',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/threads-cv.pdf',
      source: 'book',
      note: 'Derives the producer/consumer solution step by step, including the single-condition-variable failure and Mesa semantics.',
    },
    {
      title: 'Operating Systems: Three Easy Pieces, "Semaphores" chapter',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/threads-sema.pdf',
      source: 'book',
      note: 'Semaphores as locks, ordering tools and bounded-buffer counters, plus the deadlock from taking the mutex first.',
    },
    {
      title: 'std::condition_variable',
      url: 'https://en.cppreference.com/w/cpp/thread/condition_variable',
      source: 'cppreference',
      note: 'The precise rules for waiting and notifying, including spurious wakeups.',
    },
    {
      title: 'std::counting_semaphore, std::binary_semaphore',
      url: 'https://en.cppreference.com/w/cpp/thread/counting_semaphore',
      source: 'cppreference',
      note: 'The C++20 semaphore API and its guarantees.',
    },
    {
      title: 'std::barrier',
      url: 'https://en.cppreference.com/w/cpp/thread/barrier',
      source: 'cppreference',
      note: 'Phases, the completion function and `arrive_and_drop`.',
    },
  ],
};
