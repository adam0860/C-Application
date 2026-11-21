import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-multicore-realtime',
  title: 'Multicore and Real-Time Scheduling',
  summary:
    'Scheduling many cores (shared versus per-CPU queues, cache affinity, load balancing and work stealing), real-time scheduling with rate-monotonic and EDF, and what it all means for a game: priorities, core affinity, timer resolution and frame pacing.',
  minutes: 22,
  objectives: [
    'Compare a single shared run queue with per-CPU queues and explain cache affinity',
    'Explain load balancing and work stealing, and why owners and thieves use opposite ends of a deque',
    'Set a thread\'s CPU affinity on Linux and Windows, and say when pinning helps and when it hurts',
    'Apply the rate-monotonic utilisation bound and explain why EDF can schedule sets that RMS cannot',
    'Describe Linux\'s real-time policies and where hard real-time systems differ',
    'Explain how timer resolution, sleep granularity and thread placement cause stutter, and how engines pace frames',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'From one core to many',
      blocks: [
        {
          type: 'p',
          text: 'Everything so far assumed one CPU. Your PC has 8 to 24 hardware threads and a current console has 8 cores, so the scheduler now decides **where** a thread runs as well as **when**. Two hardware facts from the Computer Architecture course shape the answer: each core has its own [[cpu-cache|caches]] and [[tlb|TLB]], and keeping shared data consistent between cores costs coherence traffic.',
        },
        {
          type: 'p',
          text: 'The obvious design reuses a single-CPU policy with **one shared [[run-queue]]**: whichever core becomes free takes the next thread. It balances load perfectly. It also has two serious problems:',
        },
        {
          type: 'list',
          items: [
            '**Contention.** Every scheduling decision on every core must lock the same queue. With dozens of cores, they spend their time waiting for that lock and bouncing its cache line between them.',
            '**No cache affinity.** A thread that ran on core 2 has its working set in core 2\'s caches. If core 5 picks it up next, it starts cold and refills everything from L3 or memory.',
          ],
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 234" xmlns="http://www.w3.org/2000/svg"><text x="130" y="20" font-size="13" text-anchor="middle" font-weight="700">One shared queue</text><rect x="30" y="40" width="34" height="30" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="30" y="40" width="34" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="47" y="59.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">A</text><rect x="70" y="40" width="34" height="30" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="70" y="40" width="34" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="87" y="59.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">B</text><rect x="110" y="40" width="34" height="30" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="110" y="40" width="34" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="127" y="59.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">C</text><rect x="150" y="40" width="34" height="30" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="150" y="40" width="34" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="167" y="59.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">D</text><rect x="190" y="40" width="34" height="30" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="190" y="40" width="34" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="207" y="59.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">E</text><rect x="24" y="34" width="206" height="42" rx="3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/><text x="130" y="92" font-size="11.5" text-anchor="middle" class="t-red">one lock, every core contends</text><rect x="30" y="130" width="42" height="34" rx="3" class="f-gray" fill-opacity="0.15"/><rect x="30" y="130" width="42" height="34" rx="3" fill="none" class="s-gray" stroke-width="1.5"/><text x="51" y="151" font-size="11.5" text-anchor="middle" font-weight="700">CPU0</text><line x1="130" y1="100" x2="56.6553" y2="125.996" class="s-gray" stroke-width="1.2"/><path d="M51.0,128.0 L58.7,128.6 L56.5,122.7 Z" class="f-gray"/><rect x="82" y="130" width="42" height="34" rx="3" class="f-gray" fill-opacity="0.15"/><rect x="82" y="130" width="42" height="34" rx="3" fill="none" class="s-gray" stroke-width="1.5"/><text x="103" y="151" font-size="11.5" text-anchor="middle" font-weight="700">CPU1</text><line x1="130" y1="100" x2="107.165" y2="123.681" class="s-gray" stroke-width="1.2"/><path d="M103.0,128.0 L110.1,125.1 L105.6,120.8 Z" class="f-gray"/><rect x="134" y="130" width="42" height="34" rx="3" class="f-gray" fill-opacity="0.15"/><rect x="134" y="130" width="42" height="34" rx="3" fill="none" class="s-gray" stroke-width="1.5"/><text x="155" y="151" font-size="11.5" text-anchor="middle" font-weight="700">CPU2</text><line x1="130" y1="100" x2="151.004" y2="123.524" class="s-gray" stroke-width="1.2"/><path d="M155.0,128.0 L152.7,120.7 L148.0,124.9 Z" class="f-gray"/><rect x="186" y="130" width="42" height="34" rx="3" class="f-gray" fill-opacity="0.15"/><rect x="186" y="130" width="42" height="34" rx="3" fill="none" class="s-gray" stroke-width="1.5"/><text x="207" y="151" font-size="11.5" text-anchor="middle" font-weight="700">CPU3</text><line x1="130" y1="100" x2="201.361" y2="125.95" class="s-gray" stroke-width="1.2"/><path d="M207.0,128.0 L201.5,122.6 L199.3,128.6 Z" class="f-gray"/><text x="130" y="186" font-size="11.5" text-anchor="middle">jobs hop between cores:</text><text x="130" y="201" font-size="11.5" text-anchor="middle">caches and TLBs start cold</text><line x1="262" y1="14" x2="262" y2="226" class="s-gray" stroke-width="1" stroke-dasharray="3 4"/><text x="392" y="20" font-size="13" text-anchor="middle" font-weight="700">One queue per CPU</text><rect x="280" y="36" width="52" height="30" rx="3" class="f-gray" fill-opacity="0.15"/><rect x="280" y="36" width="52" height="30" rx="3" fill="none" class="s-gray" stroke-width="1.5"/><text x="306" y="56" font-size="11.5" text-anchor="middle" font-weight="700">CPU0</text><rect x="352" y="36" width="32" height="30" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="352" y="36" width="32" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="368" y="55.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">A</text><rect x="390" y="36" width="32" height="30" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="390" y="36" width="32" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="406" y="55.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">E</text><line x1="350" y1="51" x2="339" y2="51" class="s-gray" stroke-width="1.2"/><path d="M334.0,51.0 L340.0,53.7 L340.0,48.3 Z" class="f-gray"/><rect x="280" y="76" width="52" height="30" rx="3" class="f-gray" fill-opacity="0.15"/><rect x="280" y="76" width="52" height="30" rx="3" fill="none" class="s-gray" stroke-width="1.5"/><text x="306" y="96" font-size="11.5" text-anchor="middle" font-weight="700">CPU1</text><rect x="352" y="76" width="32" height="30" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="352" y="76" width="32" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="368" y="95.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">B</text><line x1="350" y1="91" x2="339" y2="91" class="s-gray" stroke-width="1.2"/><path d="M334.0,91.0 L340.0,93.7 L340.0,88.3 Z" class="f-gray"/><rect x="280" y="116" width="52" height="30" rx="3" class="f-gray" fill-opacity="0.15"/><rect x="280" y="116" width="52" height="30" rx="3" fill="none" class="s-gray" stroke-width="1.5"/><text x="306" y="136" font-size="11.5" text-anchor="middle" font-weight="700">CPU2</text><rect x="352" y="116" width="32" height="30" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="352" y="116" width="32" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="368" y="135.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">C</text><rect x="390" y="116" width="32" height="30" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="390" y="116" width="32" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="406" y="135.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">F</text><line x1="350" y1="131" x2="339" y2="131" class="s-gray" stroke-width="1.2"/><path d="M334.0,131.0 L340.0,133.7 L340.0,128.3 Z" class="f-gray"/><rect x="280" y="156" width="52" height="30" rx="3" class="f-gray" fill-opacity="0.15"/><rect x="280" y="156" width="52" height="30" rx="3" fill="none" class="s-gray" stroke-width="1.5"/><text x="306" y="176" font-size="11.5" text-anchor="middle" font-weight="700">CPU3</text><rect x="352" y="156" width="32" height="30" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="352" y="156" width="32" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="368" y="175.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">D</text><line x1="350" y1="171" x2="339" y2="171" class="s-gray" stroke-width="1.2"/><path d="M334.0,171.0 L340.0,173.7 L340.0,168.3 Z" class="f-gray"/><path d="M462,51 L488,51 L488,156 L438,156" fill="none" class="s-orange" stroke-width="1.4" stroke-dasharray="4 3"/><path d="M432.0,156.0 L439.0,159.2 L439.0,152.8 Z" class="f-orange"/><text x="500" y="108" font-size="11" text-anchor="middle" class="t-orange">balance</text><text x="392" y="210" font-size="11.5" text-anchor="middle">no shared lock, warm caches;</text><text x="392" y="225" font-size="11.5" text-anchor="middle">needs load balancing or stealing</text></svg>`,
          alt: 'Left: five jobs in one shared queue feeding four CPUs, labelled as one lock that every core contends for. Right: each of four CPUs has its own short queue of jobs, with an arrow labelled balance moving a job from a long queue to a short one.',
          caption: 'A shared queue balances perfectly but scales badly. Per-CPU queues scale and keep caches warm, but can drift out of balance.',
        },
        {
          type: 'p',
          text: 'So Linux, Windows and FreeBSD all keep **one run queue per CPU**. A thread usually stays on the same core, which gives **cache affinity** for free and needs no global lock. The new problem is **load imbalance**: one core may have four runnable threads while another idles.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why affinity matters so much',
          text: 'A thread\'s performance depends on state the scheduler cannot see: hot cache lines, TLB entries and branch-predictor history built up over thousands of instructions. Moving it to another core throws that away, and can cost tens of microseconds of refill on a large working set. Schedulers therefore treat migration as expensive and move a thread only when the imbalance is worth it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'Why do modern kernels use per-CPU run queues instead of one shared queue?',
      options: [
        {
          text: 'They avoid a global lock and keep threads on the core whose caches already hold their data',
          correct: true,
          why: 'Both scalability (no shared lock) and cache affinity improve. The cost is that the kernel must balance load explicitly.',
        },
        {
          text: 'A shared queue cannot be implemented safely on multicore hardware',
          why: 'It can, with a lock, and early multiprocessor kernels did exactly that. It is correct, just slow at scale.',
        },
        {
          text: 'Per-CPU queues balance load automatically, so no migration is ever needed',
          why: 'The opposite: per-CPU queues drift out of balance, which is why load balancing and work stealing exist.',
        },
        {
          text: 'Each core needs a different scheduling policy',
          why: 'All queues normally run the same policy; the split is about data structure ownership, not policy.',
        },
      ],
      explanation:
        'Per-CPU queues trade automatic balance for scalability and locality. The kernel then adds explicit balancing that migrates threads rarely and deliberately, preferring nearby cores (SMT siblings, then cores sharing a cache, then other NUMA nodes).',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Load balancing and work stealing',
      blocks: [
        {
          type: 'p',
          text: 'Linux balances in two ways. **Periodic balancing** runs on a timer: each core compares its load with others in its *scheduling domain* and pulls threads from the busiest. Domains mirror the hardware: SMT siblings first (they share a core, so moving between them is nearly free), then cores sharing a last-level cache, then whole NUMA nodes, with balancing getting rarer and more reluctant at each level. **Idle balancing** runs when a core is about to go idle: before sleeping, it tries to pull work from a busy neighbour.',
        },
        {
          type: 'p',
          text: 'Idle balancing is a form of **[[work-stealing|work stealing]]**, the technique at the heart of every modern job system (Cilk, Intel TBB, .NET\'s thread pool and most game engines). Each worker owns a double-ended queue of jobs. It pushes and pops at one end, newest first; when it runs dry it steals from the *other* end of a random victim\'s deque:',
        },
        {
  "type": "algo",
  "view": "array",
  "interval": 1800,
  "frames": [
    {
      "note": "CPU 0 spawned five jobs into its own deque (cells 0 to 4). CPU 1's deque (cells 6 to 10) is empty.",
      "array": [
        "j1",
        "j2",
        "j3",
        "j4",
        "j5",
        "‖",
        "",
        "",
        "",
        "",
        ""
      ],
      "pointers": [
        {
          "index": 4,
          "label": "bottom"
        },
        {
          "index": 0,
          "label": "top",
          "color": "blue"
        }
      ],
      "vars": [
        [
          "CPU 0",
          "idle"
        ],
        [
          "CPU 1",
          "idle"
        ]
      ]
    },
    {
      "note": "CPU 0 pops j5 from the bottom of its own deque: newest job first, whose data is still in cache. No other core is involved.",
      "array": [
        "j1",
        "j2",
        "j3",
        "j4",
        "",
        "‖",
        "",
        "",
        "",
        "",
        ""
      ],
      "marks": [],
      "pointers": [
        {
          "index": 3,
          "label": "bottom"
        },
        {
          "index": 0,
          "label": "top",
          "color": "blue"
        }
      ],
      "vars": [
        [
          "CPU 0",
          "running j5"
        ],
        [
          "CPU 1",
          "idle, deque empty"
        ]
      ]
    },
    {
      "note": "CPU 1 has nothing to do, so it steals from the top of CPU 0's deque: j1, the oldest job, which tends to be the biggest piece of work.",
      "array": [
        "j2",
        "j3",
        "j4",
        "",
        "",
        "‖",
        "",
        "",
        "",
        "",
        ""
      ],
      "marks": [],
      "pointers": [
        {
          "index": 2,
          "label": "bottom"
        },
        {
          "index": 0,
          "label": "top",
          "color": "blue"
        }
      ],
      "vars": [
        [
          "CPU 0",
          "running j5"
        ],
        [
          "CPU 1",
          "running j1 (stolen)"
        ]
      ]
    },
    {
      "note": "j1 splits itself into two child jobs, which CPU 1 pushes onto its own deque. Now both cores have local work.",
      "array": [
        "j2",
        "j3",
        "j4",
        "",
        "",
        "‖",
        "j1a",
        "j1b",
        "",
        "",
        ""
      ],
      "marks": [
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "bottom"
        },
        {
          "index": 7,
          "label": "bottom"
        }
      ],
      "vars": [
        [
          "CPU 0",
          "running j5"
        ],
        [
          "CPU 1",
          "running j1"
        ]
      ]
    },
    {
      "note": "Each core keeps popping from the bottom of its own deque (j4 on CPU 0, j1b on CPU 1). Thieves and owners work at opposite ends, so they rarely touch the same entry.",
      "array": [
        "j2",
        "j3",
        "",
        "",
        "",
        "‖",
        "j1a",
        "",
        "",
        "",
        ""
      ],
      "pointers": [
        {
          "index": 1,
          "label": "bottom"
        },
        {
          "index": 6,
          "label": "bottom"
        }
      ],
      "vars": [
        [
          "CPU 0",
          "running j4"
        ],
        [
          "CPU 1",
          "running j1b"
        ]
      ]
    }
  ],
  "caption": "Work stealing with two per-core deques. The owner pushes and pops at the bottom; an idle core steals from the top of someone else's deque."
},
        {
          type: 'callout',
          variant: 'why',
          title: 'Why opposite ends?',
          text: 'The owner pops its newest job, whose data it just touched and which is still in its cache. The thief takes the oldest job, which in divide-and-conquer code is the *largest* unsplit piece, so one steal moves a lot of work and steals stay rare. And because the two ends are far apart, owner and thief almost never contend for the same entry, so the common case (an owner working alone) needs no lock at all, just carefully ordered atomics.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Job systems in engines',
          text: 'Unreal\'s [[task-graph]] and the job systems of Frostbite and Naughty Dog\'s engine all run roughly one worker [[thread]] per core, each draining queues of small jobs, with idle workers stealing. Naughty Dog went further (GDC 2015): jobs run on **[[fiber|fibers]]**, user-mode stacks that a worker can switch between without the kernel, so a job that waits on another simply parks its fiber and the worker picks up something else. The Threads and Concurrency units build one of these.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'True or false: in a work-stealing scheduler, an idle worker steals the job its victim pushed most recently, because that job\'s data is hottest in cache.',
      answer: false,
      explanation:
        'False. The *owner* takes its most recent job (hot in its own cache). The thief takes the **oldest** job from the opposite end. Its data is not in the thief\'s cache either way, it tends to be the largest chunk of remaining work, and working at the opposite end keeps owner and thief from contending.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Choosing a core yourself: affinity',
      blocks: [
        {
          type: 'p',
          text: '**[[cpu-affinity|CPU affinity]]** is the set of cores a thread may run on. By default it is all of them, and the scheduler applies *soft* affinity (prefer the last core). You can set *hard* affinity yourself. On Linux:',
        },
        {
          type: 'code',
          title: 'pin_thread.cpp',
          runnable: true,
          code: `#include <pthread.h>
#include <sched.h>
#include <iostream>
#include <thread>

int main() {
    std::jthread worker([] {
        cpu_set_t set;
        CPU_ZERO(&set);
        CPU_SET(0, &set);                  // allow CPU 0 only
        const int rc = pthread_setaffinity_np(
            pthread_self(), sizeof set, &set);
        if (rc != 0) {                     // returns an errno value
            std::cout << "setaffinity failed: " << rc << '\\n';
            return;
        }
        std::cout << "pinned; running on CPU " << sched_getcpu()
                  << '\\n';
    });
}`,
          output: "pinned; running on CPU 0",
          annotations: [
            { lines: '8-10', text: '`cpu_set_t` is a bitmask of allowed CPUs. Here only bit 0 is set.' },
            { lines: '11-12', text: '`pthread_setaffinity_np` (the `_np` means non-portable, a GNU extension) applies the mask to one thread. `sched_setaffinity(0, ...)` does the same for the calling thread.' },
            { lines: '13', text: 'Unlike most POSIX calls, pthread functions **return** an error number instead of setting `errno`. Checking `rc` is the only way to notice failure, for example inside a container restricted to other CPUs.' },
            { lines: '17', text: 'The kernel migrated the thread before the call returned, so `sched_getcpu()` already reports CPU 0.' },
          ],
        },
        {
          type: 'p',
          text: 'Windows has `SetThreadAffinityMask(thread, mask)` for hard affinity and the gentler `SetThreadIdealProcessor`, which only expresses a preference the scheduler may override. On machines with more than 64 logical processors, Windows groups them into **processor groups** and the plain affinity APIs only see one group, one reason to avoid hard-coding masks.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Pinning on PC is usually a mistake',
          text: 'You do not know how many cores the player has, which are SMT siblings, which are Intel E-cores or AMD cores on a second chiplet, or what else is running. A thread pinned to a core that a driver or the antivirus is busy on **cannot escape**, and you get exactly the stutter you were trying to avoid. On PC, size your worker pool from `std::thread::hardware_concurrency()`, use priorities and ideal-processor hints, and let the scheduler place threads. Consoles are different, as you will see at the end of this lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'fill',
      prompt: 'Complete the summary of thread placement.',
      template: 'Keeping a thread on the core it last ran on preserves its warm caches; this is called ___ affinity. An idle core taking queued work from a busy core is called ___. On Linux, `pthread_setaffinity_np` reports failure through its ___, not through errno.',
      templateIsCode: false,
      blanks: [{ answers: ['cache', 'soft'] }, { answers: ['work stealing', 'stealing'] }, { answers: ['return value'] }],
      wordBank: ['cache', 'work stealing', 'return value', 'priority', 'preemption', 'errno variable'],
      explanation:
        'Cache (soft) affinity is the scheduler\'s default preference; work stealing (and Linux\'s idle balancing) fixes the imbalance per-CPU queues create. The pthread family returns error numbers directly, a frequent source of unchecked failures when people assume the usual `-1` and `errno` convention.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Real-time scheduling',
      blocks: [
        {
          type: 'p',
          text: 'In a **[[real-time-system|real-time system]]**, a result is only correct if it arrives on time. In **hard** real-time systems (flight controls, engine control units, a missile\'s guidance loop, anti-lock brakes) a missed deadline is a failure. In **soft** real-time systems (audio, video, games) it degrades quality: a click in the sound, a dropped frame.',
        },
        {
          type: 'p',
          text: 'The classic model is a set of **periodic tasks**. Task *i* releases a job every period `Pᵢ`, each job needs `Cᵢ` of CPU time, and it must finish before the next release. Its **utilisation** is `Uᵢ = Cᵢ / Pᵢ`, and the set\'s total `U = Σ Cᵢ / Pᵢ` can never exceed 1 on one CPU. Two policies dominate:',
        },
        {
          type: 'list',
          items: [
            '**[[rate-monotonic-scheduling|Rate-monotonic scheduling]] (RMS):** fixed priorities, shorter period means higher priority. Liu and Layland (1973) proved every deadline is met if `U ≤ n(2^(1/n) − 1)`: 1.0 for one task, about 0.828 for two, 0.780 for three, approaching ln 2 ≈ 0.693.',
            '**[[earliest-deadline-first|Earliest Deadline First]] (EDF):** dynamic priorities, always run the job whose absolute deadline is nearest. On one CPU it meets every deadline whenever `U ≤ 1`.',
          ],
        },
        {
          type: 'code',
          title: 'rms_vs_edf.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <vector>

struct Task {
    int cost;       // C: CPU time per period
    int period;     // P: also the relative deadline
    int left = 0;   // work left in the current job
    int deadline = 0;
};

// Simulates one hyperperiod. edf=false gives rate-monotonic
// priorities (shorter period wins); edf=true picks the job
// with the earliest absolute deadline.
void simulate(std::vector<Task> tasks, int horizon, bool edf) {
    std::string line, missed;
    for (int t = 0; t < horizon; ++t) {
        for (Task& k : tasks) {
            if (t % k.period == 0) {
                if (k.left > 0)          // last job unfinished
                    missed += " t=" + std::to_string(t);
                k.left = k.cost;
                k.deadline = t + k.period;
            }
        }
        int pick = -1;
        for (int i = 0; i < static_cast<int>(tasks.size()); ++i) {
            if (tasks[i].left == 0) continue;
            if (pick == -1) { pick = i; continue; }
            const Task& a = tasks[i];
            const Task& b = tasks[pick];
            if (edf ? a.deadline < b.deadline : a.period < b.period)
                pick = i;
        }
        if (pick == -1) { line += '.'; continue; }
        --tasks[pick].left;
        line += static_cast<char>('1' + pick);
    }
    for (const Task& k : tasks)                 // last deadlines
        if (k.left > 0) missed += " t=" + std::to_string(horizon);
    std::cout << (edf ? "EDF " : "RMS ") << line << "  missed:"
              << (missed.empty() ? " none" : missed) << '\\n';
}

int main() {
    const std::vector<Task> set{{2, 5}, {4, 7}};   // U = 0.971
    std::cout << "T1: 2 every 5, T2: 4 every 7\\n";
    simulate(set, 35, false);
    simulate(set, 35, true);
}`,
          output: "T1: 2 every 5, T2: 4 every 7\nRMS 1122211222112.21122211222112221122.  missed: t=7\nEDF 1122221122221121122211222211221122.  missed: none",
          annotations: [
            { lines: '19-24', text: 'At each release, a job left over from the previous period is a deadline miss. This simulator records the miss and drops the late work.' },
            { lines: '32', text: 'The only difference between the policies: compare absolute deadlines (EDF) or periods (RMS).' },
            { lines: '46', text: 'U = 2/5 + 4/7 ≈ 0.971: above the two-task RMS bound of 0.828, but below EDF\'s bound of 1.' },
          ],
        },
        {
          type: 'p',
          text: 'Under RMS, T1 always wins. In the first 7 time units T1 takes 4 of them (its jobs at 0 and 5), leaving only 3 for T2\'s 4-unit job, so T2 misses at t = 7. EDF instead lets T2 finish at t = 5 because its deadline (7) is earlier than T1\'s new one (10):',
        },
        {
  "type": "algo",
  "view": "array",
  "code": "at each tick:\n  release jobs due now\n  run earliest-deadline job",
  "lang": "text",
  "interval": 1400,
  "frames": [
    {
      "note": "T1 needs 2 units every 5; T2 needs 4 units every 7. Each deadline is the next release. Utilisation = 2/5 + 4/7 ≈ 0.971.",
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
        "·"
      ],
      "lines": [
        1
      ],
      "vars": [
        [
          "T1",
          "idle"
        ],
        [
          "T2",
          "idle"
        ]
      ]
    },
    {
      "note": "t = 0: T1 and T2 are released. T1 runs: deadline 5 beats T2's 7.",
      "array": [
        "T1",
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
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "t=0"
        }
      ],
      "lines": [
        2,
        3
      ],
      "vars": [
        [
          "T1",
          "1 left, deadline 5"
        ],
        [
          "T2",
          "4 left, deadline 7"
        ]
      ]
    },
    {
      "note": "t = 1: T1 runs: deadline 5 beats T2's 7. T1 completes at 2, before its deadline 5.",
      "array": [
        "T1",
        "T1",
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
          "index": 1,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "t=1"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "T1",
          "done (next release 5)"
        ],
        [
          "T2",
          "4 left, deadline 7"
        ]
      ]
    },
    {
      "note": "t = 2: T2 runs (the only ready task).",
      "array": [
        "T1",
        "T1",
        "T2",
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
          "index": 2,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "t=2"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "T1",
          "done (next release 5)"
        ],
        [
          "T2",
          "3 left, deadline 7"
        ]
      ]
    },
    {
      "note": "t = 3: T2 runs (the only ready task).",
      "array": [
        "T1",
        "T1",
        "T2",
        "T2",
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
          "index": 3,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 3,
          "label": "t=3"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "T1",
          "done (next release 5)"
        ],
        [
          "T2",
          "2 left, deadline 7"
        ]
      ]
    },
    {
      "note": "t = 4: T2 runs (the only ready task).",
      "array": [
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
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
          "index": 4,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 4,
          "label": "t=4"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "T1",
          "done (next release 5)"
        ],
        [
          "T2",
          "1 left, deadline 7"
        ]
      ]
    },
    {
      "note": "t = 5: T1 is released. T2 runs: deadline 7 beats T1's 10. T2 completes at 6, before its deadline 7.",
      "array": [
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "T2",
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
          "index": 5,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 5,
          "label": "t=5"
        }
      ],
      "lines": [
        2,
        3
      ],
      "vars": [
        [
          "T1",
          "2 left, deadline 10"
        ],
        [
          "T2",
          "done (next release 7)"
        ]
      ]
    },
    {
      "note": "t = 6: T1 runs (the only ready task).",
      "array": [
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "T2",
        "T1",
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
          "index": 6,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 6,
          "label": "t=6"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "T1",
          "1 left, deadline 10"
        ],
        [
          "T2",
          "done (next release 7)"
        ]
      ]
    },
    {
      "note": "t = 7: T2 is released. T1 runs: deadline 10 beats T2's 14. T1 completes at 8, before its deadline 10.",
      "array": [
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "T2",
        "T1",
        "T1",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 7,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 7,
          "label": "t=7"
        }
      ],
      "lines": [
        2,
        3
      ],
      "vars": [
        [
          "T1",
          "done (next release 10)"
        ],
        [
          "T2",
          "4 left, deadline 14"
        ]
      ]
    },
    {
      "note": "t = 8: T2 runs (the only ready task).",
      "array": [
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "T2",
        "T1",
        "T1",
        "T2",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 8,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 8,
          "label": "t=8"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "T1",
          "done (next release 10)"
        ],
        [
          "T2",
          "3 left, deadline 14"
        ]
      ]
    },
    {
      "note": "t = 9: T2 runs (the only ready task).",
      "array": [
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "T2",
        "T1",
        "T1",
        "T2",
        "T2",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 9,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 9,
          "label": "t=9"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "T1",
          "done (next release 10)"
        ],
        [
          "T2",
          "2 left, deadline 14"
        ]
      ]
    },
    {
      "note": "t = 10: T1 is released. T2 runs: deadline 14 beats T1's 15.",
      "array": [
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "T2",
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 10,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 10,
          "label": "t=10"
        }
      ],
      "lines": [
        2,
        3
      ],
      "vars": [
        [
          "T1",
          "2 left, deadline 15"
        ],
        [
          "T2",
          "1 left, deadline 14"
        ]
      ]
    },
    {
      "note": "t = 11: T2 runs: deadline 14 beats T1's 15. T2 completes at 12, before its deadline 14.",
      "array": [
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "T2",
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "T2",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 11,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 11,
          "label": "t=11"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "T1",
          "2 left, deadline 15"
        ],
        [
          "T2",
          "done (next release 14)"
        ]
      ]
    },
    {
      "note": "t = 12: T1 runs (the only ready task).",
      "array": [
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "T2",
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "T2",
        "T1",
        "·"
      ],
      "marks": [
        {
          "index": 12,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 12,
          "label": "t=12"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "T1",
          "1 left, deadline 15"
        ],
        [
          "T2",
          "done (next release 14)"
        ]
      ]
    },
    {
      "note": "t = 13: T1 runs (the only ready task). T1 completes at 14, before its deadline 15.",
      "array": [
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "T2",
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "T2",
        "T1",
        "T1"
      ],
      "marks": [
        {
          "index": 13,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 13,
          "label": "t=13"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "T1",
          "done (next release 15)"
        ],
        [
          "T2",
          "done (next release 14)"
        ]
      ]
    },
    {
      "note": "Every deadline in the first 14 units is met. Under rate-monotonic priorities T1 would always win, and T2 would miss its deadline at t = 7.",
      "array": [
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "T2",
        "T1",
        "T1",
        "T2",
        "T2",
        "T2",
        "T2",
        "T1",
        "T1"
      ],
      "marks": [
        {
          "index": 0,
          "color": "green"
        },
        {
          "index": 1,
          "color": "green"
        },
        {
          "index": 2,
          "color": "green"
        },
        {
          "index": 3,
          "color": "green"
        },
        {
          "index": 4,
          "color": "green"
        },
        {
          "index": 5,
          "color": "green"
        },
        {
          "index": 6,
          "color": "green"
        },
        {
          "index": 7,
          "color": "green"
        },
        {
          "index": 8,
          "color": "green"
        },
        {
          "index": 9,
          "color": "green"
        },
        {
          "index": 10,
          "color": "green"
        },
        {
          "index": 11,
          "color": "green"
        },
        {
          "index": 12,
          "color": "green"
        },
        {
          "index": 13,
          "color": "green"
        }
      ]
    }
  ],
  "caption": "Earliest Deadline First on two periodic tasks. The cell just run is orange for T1 and blue for T2."
},
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does anyone use RMS, then?',
          text: 'Predictability. With fixed priorities you can prove ahead of time exactly which task fails under overload: the lowest-priority one, and only it. EDF under overload can cause a cascade where *every* task misses, and its priorities change constantly, which makes certification harder. Safety-critical systems often prefer RMS and leave the utilisation headroom unused on purpose.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'numeric',
      prompt: 'Three periodic tasks have (C, P) = (1, 4), (2, 6) and (1, 8), with deadlines equal to periods. What is their total utilisation? Round to three decimal places.',
      answer: 0.708,
      tolerance: 0.001,
      alsoAccept: ['17/24'],
      explanation:
        'U = 1/4 + 2/6 + 1/8 = 0.25 + 0.333 + 0.125 = 17/24 ≈ **0.708**. The rate-monotonic bound for three tasks is 3(2^(1/3) − 1) ≈ 0.780, and 0.708 is below it, so RMS is **guaranteed** to meet every deadline. EDF would be too, since 0.708 ≤ 1.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'A two-task set has U = 0.90. What can you conclude?',
      options: [
        {
          text: 'EDF meets every deadline; RMS might or might not, and needs a closer check',
          correct: true,
          why: 'EDF needs only U ≤ 1. The RMS bound for two tasks is 0.828; above it the test is inconclusive, so you simulate the worst case or run response-time analysis.',
        },
        {
          text: 'RMS will certainly miss a deadline because U is above 0.828',
          why: 'The Liu and Layland bound is *sufficient*, not necessary. Many sets above it are schedulable, for example two tasks with harmonic periods are fine up to U = 1.',
        },
        {
          text: 'Both policies will miss deadlines, because U is above 0.693',
          why: '0.693 is the limit of the RMS bound for many tasks; it says nothing about EDF and is too pessimistic for two tasks.',
        },
        {
          text: 'Neither policy can be analysed without knowing the code inside the tasks',
          why: 'The periodic task model abstracts the code into C and P. That abstraction is exactly what makes the analysis possible.',
        },
      ],
      explanation:
        'Utilisation bounds are quick sufficient tests. EDF\'s is exact on one CPU (U ≤ 1 if and only if schedulable, for this task model); RMS\'s is conservative, which is why real projects back it up with exact response-time analysis.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Real time on real kernels',
      blocks: [
        {
          type: 'p',
          text: 'Linux has three real-time policies beside the fair class. `SCHED_FIFO` and `SCHED_RR` use fixed priorities 1 to 99, always above every normal thread; FIFO runs a thread until it blocks or yields, RR adds a time slice among equal priorities. `SCHED_DEADLINE` (since 3.14) is EDF: a thread declares a runtime, deadline and period, and the kernel refuses to admit it if the total would overload the CPUs. Setting any of them needs privilege (`CAP_SYS_NICE`).',
        },
        {
          type: 'p',
          text: 'A `SCHED_FIFO` thread in an infinite loop would starve everything else on its core, so by default the kernel keeps back 5% of every second (`sched_rt_runtime_us` = 950000 out of 1000000) for normal threads. Newer kernels implement that guarantee with a "deadline server" for the fair class, but the idea is the same: a safety net, not a scheduling policy.',
        },
        {
          type: 'p',
          text: 'Priorities raise a classic hazard: **[[priority-inversion|priority inversion]]**, where a high-priority thread waits for a lock held by a low-priority one that a medium-priority thread keeps preempting. It famously reset NASA\'s Mars Pathfinder lander in 1997, and the Deadlock lesson covers it and its fix, [[priority-inheritance|priority inheritance]].',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Hard real-time in the field',
          text: 'General-purpose kernels give soft real-time at best: page faults, interrupt storms and long non-preemptible sections create unbounded delays. Since Linux 6.12 the PREEMPT_RT work is in mainline, making the kernel almost fully preemptible and cutting worst-case latency to tens of microseconds. Avionics and weapons systems go further with certified RTOSes such as VxWorks, INTEGRITY or QNX, often with **ARINC 653** partitioning, which gives each application a fixed time window and memory region so one failing component cannot steal time or memory from another.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Timers, sleep and stutter',
      blocks: [
        {
          type: 'p',
          text: 'A game is a soft real-time system with one big periodic task: produce a frame every 16.7 ms (60 Hz) or 8.3 ms (120 Hz). The OS affects whether it hits the deadline in a way that surprises many programmers: **sleeping is imprecise**. `std::this_thread::sleep_for(1ms)` promises *at least* 1 ms. The thread wakes when the next timer interrupt or hardware timer fires after that point, and then has to be scheduled on a core.',
        },
        {
          type: 'code',
          title: 'sleep_overshoot.cpp',
          code: `#include <algorithm>
#include <chrono>
#include <format>
#include <iostream>
#include <thread>
#include <vector>

int main() {
    using namespace std::chrono;
    for (const auto request : {100us, 1000us, 5000us}) {
        std::vector<long long> late;           // overshoot in us
        for (int i = 0; i < 200; ++i) {
            const auto start = steady_clock::now();
            std::this_thread::sleep_for(request);
            const auto took = steady_clock::now() - start;
            late.push_back(
                duration_cast<microseconds>(took - request).count());
        }
        std::ranges::sort(late);
        std::cout << std::format(
            "sleep_for({:>4} us): late by median {} us, worst {} us\\n",
            request.count(), late[100], late.back());
    }
}`,
          annotations: [
            { lines: '14', text: '`sleep_for` blocks the thread; the kernel will not consider it runnable again until its timer expires.' },
            { lines: '15-17', text: 'Measure how much *later* than requested the thread actually woke, using the monotonic `steady_clock`.' },
            { lines: '19-22', text: 'Report the median and the worst case of 200 sleeps. For frame pacing the worst case is what matters.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Measured on the course\'s Linux VM (kernel 6.18); your numbers will differ',
          code: `sleep_for( 100 us): late by median 60 us, worst 157 us
sleep_for(1000 us): late by median 122 us, worst 267 us
sleep_for(5000 us): late by median 161 us, worst 1644 us`,
        },
        {
          type: 'p',
          text: 'Linux uses high-resolution timers and adds a small **timer slack** (50 µs by default for normal threads) so nearby wake-ups can be merged to save power; the occasional millisecond-plus outlier is another task holding the core. On **Windows** the default system timer ticks at 64 Hz, every **15.625 ms**, and `Sleep(1)` can take a whole tick: an entire frame at 60 FPS. That is the origin of the old engine habit of calling `timeBeginPeriod(1)` at startup:',
        },
        {
          type: 'table',
          headers: ['Windows version', 'Effect of `timeBeginPeriod(1)`'],
          rows: [
            ['Before Windows 10 2004', 'Raises the timer resolution for the **whole system** (and costs power for everyone)'],
            ['Windows 10 2004 and later', 'Affects only processes that call it; others keep the default resolution'],
            ['Windows 11', 'Not guaranteed while the calling process\'s window is minimised or fully hidden'],
          ],
          caption: 'From the Remarks of Microsoft\'s `timeBeginPeriod` documentation. `CreateWaitableTimerEx` with `CREATE_WAITABLE_TIMER_HIGH_RESOLUTION` (Windows 10 1803+) gives precise waits without changing the global resolution.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 214" xmlns="http://www.w3.org/2000/svg"><line x1="52" y1="168" x2="458" y2="168" stroke="currentColor" stroke-width="1.2"/><text x="46" y="172" font-size="11" text-anchor="end" class="t-gray">0</text><text x="46" y="137" font-size="11" text-anchor="end" class="t-gray">10</text><line x1="52" y1="133" x2="458" y2="133" class="s-gray" stroke-width="0.5" stroke-dasharray="2 3"/><text x="46" y="102" font-size="11" text-anchor="end" class="t-gray">20</text><line x1="52" y1="98" x2="458" y2="98" class="s-gray" stroke-width="0.5" stroke-dasharray="2 3"/><text x="46" y="67" font-size="11" text-anchor="end" class="t-gray">30</text><line x1="52" y1="63" x2="458" y2="63" class="s-gray" stroke-width="0.5" stroke-dasharray="2 3"/><text x="46" y="32" font-size="11" text-anchor="end" class="t-gray">40</text><line x1="52" y1="28" x2="458" y2="28" class="s-gray" stroke-width="0.5" stroke-dasharray="2 3"/><rect x="56" y="109.55" width="14" height="58.45" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="56" y="109.55" width="14" height="58.45" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="76" y="109.9" width="14" height="58.1" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="76" y="109.9" width="14" height="58.1" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="96" y="109.2" width="14" height="58.8" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="96" y="109.2" width="14" height="58.8" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="116" y="109.55" width="14" height="58.45" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="116" y="109.55" width="14" height="58.45" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="136" y="109.9" width="14" height="58.1" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="136" y="109.9" width="14" height="58.1" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="156" y="51.45" width="14" height="116.55" rx="2" class="f-red" fill-opacity="0.35"/><rect x="156" y="51.45" width="14" height="116.55" rx="2" fill="none" class="s-red" stroke-width="1.2"/><rect x="176" y="109.55" width="14" height="58.45" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="176" y="109.55" width="14" height="58.45" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="196" y="109.55" width="14" height="58.45" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="196" y="109.55" width="14" height="58.45" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="216" y="109.9" width="14" height="58.1" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="216" y="109.9" width="14" height="58.1" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="236" y="109.2" width="14" height="58.8" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="236" y="109.2" width="14" height="58.8" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="256" y="109.55" width="14" height="58.45" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="256" y="109.55" width="14" height="58.45" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="276" y="109.9" width="14" height="58.1" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="276" y="109.9" width="14" height="58.1" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="296" y="56.35" width="14" height="111.65" rx="2" class="f-red" fill-opacity="0.35"/><rect x="296" y="56.35" width="14" height="111.65" rx="2" fill="none" class="s-red" stroke-width="1.2"/><rect x="316" y="109.55" width="14" height="58.45" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="316" y="109.55" width="14" height="58.45" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="336" y="109.9" width="14" height="58.1" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="336" y="109.9" width="14" height="58.1" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="356" y="109.55" width="14" height="58.45" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="356" y="109.55" width="14" height="58.45" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="376" y="109.2" width="14" height="58.8" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="376" y="109.2" width="14" height="58.8" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="396" y="109.9" width="14" height="58.1" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="396" y="109.9" width="14" height="58.1" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="416" y="109.55" width="14" height="58.45" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="416" y="109.55" width="14" height="58.45" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><rect x="436" y="109.55" width="14" height="58.45" rx="2" class="f-blue" fill-opacity="0.35"/><rect x="436" y="109.55" width="14" height="58.45" rx="2" fill="none" class="s-blue" stroke-width="1.2"/><line x1="52" y1="109.55" x2="458" y2="109.55" class="s-green" stroke-width="1.4" stroke-dasharray="6 3"/><text x="462" y="113.55" font-size="11.5" text-anchor="start" class="t-green">16.7 ms</text><text x="462" y="127.55" font-size="11" text-anchor="start" class="t-green">(60 Hz)</text><text x="166" y="43.45" font-size="11.5" text-anchor="start" class="t-red">missed vsync: shown twice</text><text x="14" y="26" font-size="11" text-anchor="start" class="t-gray">ms</text><text x="252" y="188" font-size="11.5" text-anchor="middle" class="t-gray">frame number</text><text x="252" y="206" font-size="11.5" text-anchor="middle">average 18.3 ms (55 FPS), but the two spikes are what players feel</text></svg>`,
          alt: 'A bar chart of 20 frame times. Most are 16.7 ms, two are about 32 to 33 ms and highlighted in red as missed vsync. A green dashed line marks 16.7 ms.',
          caption: 'Average frame rate hides stutter. A 55 FPS average with two 33 ms spikes looks worse than a steady 50 FPS.',
        },
        {
          type: 'p',
          text: 'That is what **[[frame-pacing|frame pacing]]** is about: even [[frame-time|frame times]], not a high average. Engines pace frames by waiting on the display rather than on a timer (DXGI\'s frame-latency waitable object, Vulkan present modes, VRR displays), and when they must wait on the CPU, by sleeping for most of the gap with a high-resolution timer and **spinning** for the last fraction of a millisecond.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'numeric',
      prompt: 'Windows\' default system timer fires 64 times per second. At that resolution, what is the longest a `Sleep(1)` can take before the thread is even eligible to run? Give the timer period in milliseconds.',
      answer: 15.625,
      tolerance: 0.001,
      alsoAccept: ['1000/64'],
      unit: 'ms',
      explanation:
        '1000 ms / 64 = **15.625 ms**. A sleep that starts just after a tick may not end until about a full tick later, nearly a whole 60 Hz frame (16.7 ms). That is why frame limiters built on plain `Sleep` stutter at default resolution, and why engines either raise the resolution for their own process or use high-resolution waitable timers.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'What this means for a game',
      blocks: [
        {
          type: 'p',
          text: 'A typical engine runs a handful of named threads (game, render, RHI or GPU submission, audio, streaming) plus a pool of job workers. Everything in this unit applies to them:',
        },
        {
          type: 'table',
          headers: ['Thread', 'Behaviour', 'Scheduling advice'],
          rows: [
            ['Audio', 'Wakes every few ms, short bursts, hard-ish deadline (buffer underrun = click)', 'High priority; it mostly sleeps, so it cannot starve others. On Windows, MMCSS ("Pro Audio") exists for this'],
            ['Game and render', 'CPU-bound for most of the frame', 'Normal or slightly raised priority; never Time Critical'],
            ['Job workers', 'CPU-bound, many small jobs', 'About one per hardware thread minus the dedicated threads; work stealing'],
            ['Streaming, shader compilation', 'Long background work and I/O waits', 'Below normal, so it only uses idle time'],
          ],
        },
        {
          type: 'p',
          text: '**Oversubscription** is the most common self-inflicted stutter: dedicated threads plus a worker per hardware thread plus a middleware library\'s own pool means more runnable threads than cores, so the OS time-slices them and a job on the frame\'s critical path can sit in a run queue for a whole slice. Count every thread you create.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Consoles are different',
          text: 'A console runs one game on a known CPU. The system reserves part of it (on current consoles, roughly one of the eight cores) and the game owns the rest, so engines **pin** threads to cores: each job worker gets its own core, and timing is repeatable from run to run. Naughty Dog\'s fiber-based engine ran one worker locked to each of its six available cores on PS4. The same pinning on PC, where cores are shared and unknown, is the stutter source described two cards back.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Diagnose before you tune',
          text: 'Use a timeline profiler that shows context switches and which core each thread ran on (Unreal Insights, PIX, Superluminal, Tracy, or Windows Performance Analyzer with CPU scheduling events). A hitch caused by your thread waiting in a run queue looks completely different from one caused by your code running slowly.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'bug',
      prompt: 'This frame limiter should hold the game at a steady 60 FPS. On test machines it runs at about 45 to 55 FPS with uneven pacing. Tap the line that causes it.',
      code: `using namespace std::chrono;
constexpr auto kFrame = microseconds{16'667};

while (running) {
    pollInput();
    update();
    render();
    std::this_thread::sleep_for(kFrame);
}`,
      bugLines: [8],
      explanation:
        'Line 8 sleeps a full frame **after** doing the frame\'s work, so each frame lasts work time + 16.7 ms + sleep overshoot, and varies with both. A limiter must wait until an absolute deadline: keep `auto next = steady_clock::now();` before the loop, then `next += kFrame; std::this_thread::sleep_until(next);`. Better still, sleep until slightly before `next` and spin the rest, or wait on the swap chain so the display sets the pace.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'A PC game stutters every few seconds. Profiling shows the render thread is ready to run but waits 4 to 8 ms in a run queue at those moments. The game pins its render thread to core 2. What is the best first fix?',
      options: [
        {
          text: 'Remove the hard pin, so the scheduler can move the render thread to an idle core when core 2 is busy',
          correct: true,
          why: 'A pinned thread cannot escape a core that another process or a driver is using. Removing the pin (or using an ideal-processor hint instead) lets the scheduler balance it.',
        },
        {
          text: 'Set the render thread\'s priority to Time Critical so it always preempts everything',
          why: 'That might hide this symptom but starves your own workers, input and audio when the render thread is busy. Fix placement before reaching for extreme priorities.',
        },
        {
          text: 'Add more job worker threads so there is more parallelism',
          why: 'More runnable threads than cores makes run-queue waits worse, not better.',
        },
        {
          text: 'Call `timeBeginPeriod(1)` so the thread wakes faster',
          why: 'Timer resolution affects how precisely a *sleeping* thread wakes. This thread is already runnable and waiting for a core.',
        },
      ],
      explanation:
        'Read the profile: "ready but not running" is a scheduling problem, not a code-speed problem. On PC the usual culprits are hard affinity, oversubscription and background processes, and the fixes are placement and thread count before priority.',
    },
  ],
  takeaways: [
    'Kernels keep **per-CPU run queues** for scalability and **cache affinity**, and fix the resulting imbalance with periodic and idle **load balancing**.',
    '**Work stealing**: owners pop their newest job from one end of a deque, idle workers steal the oldest from the other; it powers engine job systems.',
    '**Hard affinity** (`pthread_setaffinity_np`, `SetThreadAffinityMask`) is right on consoles, where the game owns known cores, and usually wrong on PC.',
    '**RMS** (shorter period, higher fixed priority) is guaranteed up to `n(2^(1/n) − 1)` utilisation; **EDF** schedules anything up to 100% on one CPU but fails badly under overload.',
    'Linux offers `SCHED_FIFO`, `SCHED_RR` and `SCHED_DEADLINE`; hard real-time systems use certified RTOSes and time and space partitioning.',
    'Sleeps only promise a minimum: Windows\' default 15.625 ms tick, `timeBeginPeriod` (per-process since Windows 10 2004) and high-resolution timers decide **frame pacing**, which matters more than average FPS.',
  ],
  reading: [
    {
      title: 'OSTEP chapter 10: Multiprocessor Scheduling',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-multi.pdf',
      source: 'book',
      note: 'Single-queue versus multi-queue scheduling, cache affinity and migration.',
    },
    {
      title: 'Parallelizing the Naughty Dog Engine Using Fibers (GDC 2015)',
      url: 'https://www.gdcvault.com/play/1022186/Parallelizing-the-Naughty-Dog-Engine',
      source: 'video',
      note: 'Christian Gyrling on pinned worker threads, fibers and a job system built for a fixed console CPU.',
    },
    {
      title: 'sched(7) — Linux manual page',
      url: 'https://man7.org/linux/man-pages/man7/sched.7.html',
      source: 'other',
      note: 'SCHED_FIFO, SCHED_RR, SCHED_DEADLINE, real-time throttling and CPU affinity.',
    },
    {
      title: 'timeBeginPeriod function (Microsoft Learn)',
      url: 'https://learn.microsoft.com/en-us/windows/win32/api/timeapi/nf-timeapi-timebeginperiod',
      source: 'other',
      note: 'Read the Remarks for the Windows 10 2004 and Windows 11 behaviour changes.',
    },
  ],
};
