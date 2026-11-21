import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-scheduling-basics',
  title: 'Scheduling Policies',
  summary:
    'How the OS decides which ready thread runs next: turnaround and response time, FIFO and the convoy effect, SJF and STCF, round robin and the slice-length trade-off, and overlapping I/O, all checked with a C++ simulator.',
  minutes: 20,
  objectives: [
    'Separate scheduling *mechanism* (context switching) from *policy* (who runs next), and list the moments when the scheduler runs',
    'Define turnaround time and response time and compute their averages for a given schedule',
    'Explain the convoy effect and why SJF and STCF fix it, and why they cannot be implemented directly',
    'Trace round robin and explain how the time-slice length trades response time against context-switch overhead',
    'Explain how a scheduler overlaps one job\'s I/O with another job\'s computation',
    'Read and extend a C++ scheduler simulator that prints timelines and averages',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Mechanism and policy',
      blocks: [
        {
          type: 'p',
          text: 'In the Processes unit you saw the *mechanism* that lets one CPU run many programs: a timer interrupt hands control to the kernel, which saves the running thread\'s registers and restores another\'s. That answers **how** to switch. This unit answers the other question: **which** ready [[thread]] should run next, and for how long? That decision is the **scheduling policy**, and the part of the kernel that makes it is the **scheduler**.',
        },
        {
          type: 'p',
          text: 'The scheduler runs whenever the set of runnable threads might have changed or the running thread has had enough: when the timer interrupt fires, when the running thread blocks (on a file read, a mutex, a `sleep_for`), when a blocked thread is woken up, and when a thread is created or exits. Each time, it picks from the threads that are ready to run, which the kernel keeps in a [[run-queue]].',
        },
        {
          type: 'p',
          text: 'To reason about policies we follow the classic route of *Operating Systems: Three Easy Pieces* (OSTEP): start from a set of deliberately unrealistic assumptions about the **workload** (the jobs being scheduled), find the best policy under them, then remove the assumptions one at a time and watch the policy evolve:',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            'Each job runs for the same amount of time.',
            'All jobs arrive at the same time.',
            'Once started, each job runs to completion.',
            'All jobs only use the CPU (they perform no I/O).',
            'The run time of each job is known in advance.',
          ],
        },
        {
          type: 'definition',
          term: 'Turnaround time',
          text: '`T_turnaround = T_completion − T_arrival`: how long a job takes from the moment it arrives until it is finished. Our first metric is its **average** over all jobs. See [[turnaround-time]].',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why separate mechanism from policy?',
          text: 'The mechanism (trap, save registers, switch stacks, return-from-trap) is architecture-specific assembly that rarely changes. The policy is a few data structures and a choice rule that kernels change surprisingly often: Linux replaced its scheduler in 2.6.0 (the O(1) scheduler), in 2.6.23 (CFS) and again in 6.6 (EEVDF) without touching how a context switch works. Keeping the two apart is what makes that possible.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: '"Job", "process", "thread"',
          text: 'Scheduling papers say *job*. Modern kernels schedule **threads** (Linux calls each one a *task*); a single-threaded process is just one of them. In this unit, read "job" as "one schedulable thread".',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'numeric',
      prompt: 'Three jobs arrive at time 0: A needs 30 ms, B needs 20 ms, C needs 10 ms. They run to completion in the order A, B, C. What is the **average turnaround time**? Round to two decimal places.',
      answer: 46.67,
      tolerance: 0.01,
      alsoAccept: ['140/3'],
      unit: 'ms',
      explanation:
        'A finishes at 30, B at 30 + 20 = 50, C at 50 + 10 = 60. All arrived at 0, so turnaround equals completion time: (30 + 50 + 60) / 3 = 140 / 3 ≈ **46.67 ms**. Notice that C, the shortest job, waited the longest. Hold on to that: the next card is about exactly this.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'FIFO and the convoy effect',
      blocks: [
        {
          type: 'p',
          text: 'The simplest policy is **First In, First Out** (FIFO, also called first-come first-served): run jobs in arrival order, each to completion. It is easy to implement, needs no knowledge about the jobs, and is fair in the everyday sense. Under all five assumptions it is even reasonable, because equal-length jobs give the same average whatever the order.',
        },
        {
          type: 'p',
          text: 'Now drop assumption 1 and let lengths differ. Suppose A needs 100 ms and B and C need 10 ms each, and A happens to arrive a moment earlier:',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 164" xmlns="http://www.w3.org/2000/svg"><text x="56" y="22" font-size="13" text-anchor="start" font-weight="700">FIFO</text><text x="98" y="22" font-size="12.5" text-anchor="start">turnaround A 100, B 110, C 120: average 110</text><rect x="56" y="30" width="373.333" height="30" rx="3" class="f-orange" fill-opacity="0.22"/><rect x="56" y="30" width="373.333" height="30" rx="3" fill="none" class="s-orange" stroke-width="1.5"/><text x="242.667" y="49.5" font-size="13" text-anchor="middle" class="t-orange" font-weight="700">A</text><rect x="429.333" y="30" width="37.3333" height="30" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="429.333" y="30" width="37.3333" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="448" y="49.5" font-size="13" text-anchor="middle" class="t-blue" font-weight="700">B</text><rect x="466.667" y="30" width="37.3333" height="30" rx="3" class="f-teal" fill-opacity="0.22"/><rect x="466.667" y="30" width="37.3333" height="30" rx="3" fill="none" class="s-teal" stroke-width="1.5"/><text x="485.333" y="49.5" font-size="13" text-anchor="middle" class="t-teal" font-weight="700">C</text><text x="56" y="86" font-size="13" text-anchor="start" font-weight="700">SJF</text><text x="90" y="86" font-size="12.5" text-anchor="start">turnaround B 10, C 20, A 120: average 50</text><rect x="56" y="94" width="37.3333" height="30" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="56" y="94" width="37.3333" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="74.6667" y="113.5" font-size="13" text-anchor="middle" class="t-blue" font-weight="700">B</text><rect x="93.3333" y="94" width="37.3333" height="30" rx="3" class="f-teal" fill-opacity="0.22"/><rect x="93.3333" y="94" width="37.3333" height="30" rx="3" fill="none" class="s-teal" stroke-width="1.5"/><text x="112" y="113.5" font-size="13" text-anchor="middle" class="t-teal" font-weight="700">C</text><rect x="130.667" y="94" width="373.333" height="30" rx="3" class="f-orange" fill-opacity="0.22"/><rect x="130.667" y="94" width="373.333" height="30" rx="3" fill="none" class="s-orange" stroke-width="1.5"/><text x="317.333" y="113.5" font-size="13" text-anchor="middle" class="t-orange" font-weight="700">A</text><line x1="56" y1="136" x2="504" y2="136" stroke="currentColor" stroke-width="1.2"/><line x1="56" y1="136" x2="56" y2="141" stroke="currentColor" stroke-width="1.2"/><text x="56" y="155" font-size="11.5" text-anchor="middle" class="t-gray">0</text><line x1="130.667" y1="136" x2="130.667" y2="141" stroke="currentColor" stroke-width="1.2"/><text x="130.667" y="155" font-size="11.5" text-anchor="middle" class="t-gray">20</text><line x1="205.333" y1="136" x2="205.333" y2="141" stroke="currentColor" stroke-width="1.2"/><text x="205.333" y="155" font-size="11.5" text-anchor="middle" class="t-gray">40</text><line x1="280" y1="136" x2="280" y2="141" stroke="currentColor" stroke-width="1.2"/><text x="280" y="155" font-size="11.5" text-anchor="middle" class="t-gray">60</text><line x1="354.667" y1="136" x2="354.667" y2="141" stroke="currentColor" stroke-width="1.2"/><text x="354.667" y="155" font-size="11.5" text-anchor="middle" class="t-gray">80</text><line x1="429.333" y1="136" x2="429.333" y2="141" stroke="currentColor" stroke-width="1.2"/><text x="429.333" y="155" font-size="11.5" text-anchor="middle" class="t-gray">100</text><line x1="504" y1="136" x2="504" y2="141" stroke="currentColor" stroke-width="1.2"/><text x="504" y="155" font-size="11.5" text-anchor="middle" class="t-gray">120</text><text x="12" y="155" font-size="11.5" text-anchor="start" class="t-gray">time</text></svg>`,
          alt: 'Two timelines. FIFO runs A for 100 ms, then B and C for 10 ms each; turnaround 100, 110, 120, average 110. SJF runs B, C, then A; turnaround 10, 20, 120, average 50.',
          caption: 'The same three jobs in two orders. Running the short jobs first cuts the average turnaround from 110 ms to 50 ms, and A finishes at 120 ms either way.',
        },
        {
          type: 'p',
          text: 'Under FIFO, two jobs that need 10 ms each wait 100 ms for one long job. This is the **[[convoy-effect]]**: short jobs stuck in a queue behind a heavyweight. The average is dominated by waiting, not by work.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'One till open',
          text: 'You are holding a single energy drink, and the person in front of you at the only open till has a cart full of groceries. Every shop has the fix: an express lane, which is a scheduling policy that favours short jobs.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why ordering matters for the average',
          text: 'Every unit of time a job runs is added to the waiting time of **every job queued behind it**. A long job at the front of a queue of *n* jobs is charged *n − 1* times. Putting short jobs first means the expensive delays are paid by as few jobs as possible.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: 'An asset build server processes jobs FIFO on one core. At 09:00 someone submits a 40-minute lightmap bake; just after, 30 artists each submit a 20-second texture compression. What happens?',
      options: [
        {
          text: 'Every artist waits at least 40 minutes, and the average turnaround is dominated by waiting for the bake',
          correct: true,
          why: 'That is the convoy effect: thirty short jobs each pay the full cost of the one long job ahead of them.',
        },
        {
          text: 'The artists finish quickly because FIFO alternates between jobs',
          why: 'FIFO never alternates. Each job runs to completion before the next starts; alternating is round robin.',
        },
        {
          text: 'The average turnaround is the same as with any other order, because the total work is fixed',
          why: 'The total work and the finish time of the *last* job are fixed, but the average turnaround depends heavily on order. Running the 20-second jobs first gives an average of under 7 minutes instead of 45.',
        },
        {
          text: 'Nothing bad: FIFO is optimal whenever jobs arrive at different times',
          why: 'FIFO is optimal only when all jobs have equal length. With mixed lengths it can be arbitrarily bad.',
        },
      ],
      explanation:
        'Average turnaround punishes making many jobs wait for one. The usual fixes are to run short jobs first (SJF), to preempt long jobs (STCF, round robin), or, as real build farms do, to give the long bakes their own queue so they cannot block the express lane.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Shortest job first, then preemption',
      blocks: [
        {
          type: 'p',
          text: 'The figure suggests the fix directly: **[[shortest-job-first|Shortest Job First]] (SJF)** runs the job with the least work first. If all jobs arrive together (assumption 2), SJF is **provably optimal** for average turnaround time.',
        },
        {
          type: 'deepdive',
          title: 'Why SJF is optimal: the exchange argument',
          blocks: [
            {
              type: 'p',
              text: 'Take any schedule in which a longer job L runs immediately before a shorter job S. Swap them. S now finishes `len(L)` earlier and L finishes `len(S)` later; every other job is unaffected. Because `len(L) > len(S)`, the sum of completion times strictly drops. Keep swapping until no longer job precedes a shorter one: you have SJF, and no swap ever made things worse. So no ordering beats SJF.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Now drop assumption 2: jobs arrive at different times. Plain SJF is *non-preemptive*: once a job starts, it runs to the end. If A (100 ms) starts at time 0 and B and C (10 ms each) arrive at time 10, SJF has nothing to choose at time 0 and they still wait behind A. The convoy is back.',
        },
        {
          type: 'p',
          text: 'Dropping assumption 3 lets the scheduler **preempt**: stop a running job and switch to another, which the timer interrupt makes possible. **Shortest Time-to-Completion First (STCF)**, also called *shortest remaining time first*, checks whenever a job arrives: if the newcomer needs less time than the running job has left, it takes the CPU. In the example, A runs 0 to 10, B and C run 10 to 30, and A finishes at 120. Average turnaround: (120 + (20 − 10) + (30 − 10)) / 3 = **50 ms** instead of 103.3 ms. With arbitrary arrivals, STCF is optimal for average turnaround.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Two catches',
          text: '**Starvation:** if short jobs keep arriving, a long job may never run. **The oracle:** both policies need to know how long each job will run. A real kernel has no idea whether a new thread is about to compute for an hour or exit after a millisecond. Assumption 5 is the hardest one to drop, and the next lesson is about how real schedulers fake it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'numeric',
      prompt: 'Under **STCF**, job A arrives at 0 needing 8 units, B arrives at 1 needing 4, and C arrives at 2 needing 2. What is the average turnaround time? Round to two decimal places.',
      hint: 'At every arrival, compare the newcomer\'s need with the remaining time of the running job.',
      answer: 7.33,
      tolerance: 0.01,
      alsoAccept: ['22/3'],
      unit: 'units',
      explanation:
        'At t = 1, B (4) beats A\'s remaining 7 and preempts it. At t = 2, C (2) beats B\'s remaining 3 and preempts it. C runs 2 to 4, B resumes 4 to 7, A finishes 7 to 14. Turnaround: A 14 − 0 = 14, B 7 − 1 = 6, C 4 − 2 = 2. Average 22 / 3 ≈ **7.33**. Every job started the moment it arrived, which also gives the best possible response time here. FIFO on the same jobs would average (8 + 11 + 12) / 3 ≈ 10.33.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Response time and round robin',
      blocks: [
        {
          type: 'p',
          text: 'Turnaround is the right metric for batch work like compiling shaders. It is the wrong metric for anything a person is interacting with. If you click a menu while three 10-second jobs are queued, a turnaround-optimal policy happily finishes them one by one before your click is even looked at. "The click registers after 30 seconds" is unacceptable, so we add a second metric:',
        },
        {
          type: 'definition',
          term: 'Response time',
          text: '`T_response = T_firstrun − T_arrival`: how long a job waits before it first gets the CPU. See [[response-time]].',
        },
        {
          type: 'p',
          text: '**[[round-robin|Round robin]] (RR)** is built for it. Instead of running jobs to completion, it runs each ready job for one **[[time-slice]]** (also called a *quantum*), then moves it to the back of the ready queue and runs the next. Step through it on the workload the simulator below uses:',
        },
        {
  "type": "algo",
  "view": "array",
  "code": "each time unit t:\n    enqueue jobs that arrive at t\n    if running job used its slice: re-queue it\n    if CPU is free: take the front job\n    run that job for one unit\n    if it has no work left: record finish time",
  "lang": "text",
  "interval": 1400,
  "caption": "Round robin with a 2-unit slice on the workload from the simulator. When an arrival and an expired slice happen at the same tick, the arrival joins the queue first.",
  "frames": [
    {
      "note": "A arrives at 0 needing 12 units, B at 2 needing 4, C at 4 needing 2. Each cell is one time unit; the slice is 2 units.",
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
          "ready queue",
          "(empty)"
        ],
        [
          "remaining",
          "A:12  B:4  C:2"
        ]
      ]
    },
    {
      "note": "t = 0: A arrives and joins the back of the queue. A is at the front, so it gets the CPU.",
      "array": [
        "A",
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
        4,
        5
      ],
      "vars": [
        [
          "ready queue",
          "(empty)"
        ],
        [
          "remaining",
          "A:11  B:4  C:2"
        ]
      ]
    },
    {
      "note": "t = 1: A keeps running (unit 2 of its slice).",
      "array": [
        "A",
        "A",
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
        5
      ],
      "vars": [
        [
          "ready queue",
          "(empty)"
        ],
        [
          "remaining",
          "A:10  B:4  C:2"
        ]
      ]
    },
    {
      "note": "t = 2: B arrives and joins the back of the queue. A's slice is used up, so it goes to the back. B is at the front, so it gets the CPU.",
      "array": [
        "A",
        "A",
        "B",
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
      "marks": [
        {
          "index": 2,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "t=2"
        }
      ],
      "lines": [
        2,
        3,
        4,
        5
      ],
      "vars": [
        [
          "ready queue",
          "A"
        ],
        [
          "remaining",
          "A:10  B:3  C:2"
        ]
      ]
    },
    {
      "note": "t = 3: B keeps running (unit 2 of its slice).",
      "array": [
        "A",
        "A",
        "B",
        "B",
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
          "index": 3,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 3,
          "label": "t=3"
        }
      ],
      "lines": [
        5
      ],
      "vars": [
        [
          "ready queue",
          "A"
        ],
        [
          "remaining",
          "A:10  B:2  C:2"
        ]
      ]
    },
    {
      "note": "t = 4: C arrives and joins the back of the queue. B's slice is used up, so it goes to the back. A is at the front, so it gets the CPU.",
      "array": [
        "A",
        "A",
        "B",
        "B",
        "A",
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
          "index": 4,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 4,
          "label": "t=4"
        }
      ],
      "lines": [
        2,
        3,
        4,
        5
      ],
      "vars": [
        [
          "ready queue",
          "C, B"
        ],
        [
          "remaining",
          "A:9  B:2  C:2"
        ]
      ]
    },
    {
      "note": "t = 5: A keeps running (unit 2 of its slice).",
      "array": [
        "A",
        "A",
        "B",
        "B",
        "A",
        "A",
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
          "index": 5,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 5,
          "label": "t=5"
        }
      ],
      "lines": [
        5
      ],
      "vars": [
        [
          "ready queue",
          "C, B"
        ],
        [
          "remaining",
          "A:8  B:2  C:2"
        ]
      ]
    },
    {
      "note": "t = 6: A's slice is used up, so it goes to the back. C is at the front, so it gets the CPU.",
      "array": [
        "A",
        "A",
        "B",
        "B",
        "A",
        "A",
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
        3,
        4,
        5
      ],
      "vars": [
        [
          "ready queue",
          "B, A"
        ],
        [
          "remaining",
          "A:8  B:2  C:1"
        ]
      ]
    },
    {
      "note": "t = 7: C keeps running (unit 2 of its slice). C finishes at time 8.",
      "array": [
        "A",
        "A",
        "B",
        "B",
        "A",
        "A",
        "C",
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
        "·"
      ],
      "marks": [
        {
          "index": 7,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 7,
          "label": "t=7"
        }
      ],
      "lines": [
        5,
        6
      ],
      "vars": [
        [
          "ready queue",
          "B, A"
        ],
        [
          "remaining",
          "A:8  B:2  C:0"
        ]
      ]
    },
    {
      "note": "t = 8: B is at the front, so it gets the CPU.",
      "array": [
        "A",
        "A",
        "B",
        "B",
        "A",
        "A",
        "C",
        "C",
        "B",
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
          "index": 8,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 8,
          "label": "t=8"
        }
      ],
      "lines": [
        4,
        5
      ],
      "vars": [
        [
          "ready queue",
          "A"
        ],
        [
          "remaining",
          "A:8  B:1  C:0"
        ]
      ]
    },
    {
      "note": "t = 9: B keeps running (unit 2 of its slice). B finishes at time 10.",
      "array": [
        "A",
        "A",
        "B",
        "B",
        "A",
        "A",
        "C",
        "C",
        "B",
        "B",
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
          "index": 9,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 9,
          "label": "t=9"
        }
      ],
      "lines": [
        5,
        6
      ],
      "vars": [
        [
          "ready queue",
          "A"
        ],
        [
          "remaining",
          "A:8  B:0  C:0"
        ]
      ]
    },
    {
      "note": "t = 10: A is at the front, so it gets the CPU.",
      "array": [
        "A",
        "A",
        "B",
        "B",
        "A",
        "A",
        "C",
        "C",
        "B",
        "B",
        "A",
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
          "index": 10,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 10,
          "label": "t=10"
        }
      ],
      "lines": [
        4,
        5
      ],
      "vars": [
        [
          "ready queue",
          "(empty)"
        ],
        [
          "remaining",
          "A:7  B:0  C:0"
        ]
      ]
    },
    {
      "note": "t = 11 to 17: A is alone, so it runs slice after slice (re-queued and picked again each time) and finishes at time 18.",
      "array": [
        "A",
        "A",
        "B",
        "B",
        "A",
        "A",
        "C",
        "C",
        "B",
        "B",
        "A",
        "A",
        "A",
        "A",
        "A",
        "A",
        "A",
        "A"
      ],
      "marks": [
        {
          "index": 11,
          "color": "orange"
        },
        {
          "index": 12,
          "color": "orange"
        },
        {
          "index": 13,
          "color": "orange"
        },
        {
          "index": 14,
          "color": "orange"
        },
        {
          "index": 15,
          "color": "orange"
        },
        {
          "index": 16,
          "color": "orange"
        },
        {
          "index": 17,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 17,
          "label": "t=17"
        }
      ],
      "lines": [
        3,
        4,
        5,
        6
      ],
      "vars": [
        [
          "ready queue",
          "(empty)"
        ],
        [
          "remaining",
          "A:0  B:0  C:0"
        ]
      ]
    },
    {
      "note": "Done. Turnaround = finish − arrival; response = first run − arrival.",
      "array": [
        "A",
        "A",
        "B",
        "B",
        "A",
        "A",
        "C",
        "C",
        "B",
        "B",
        "A",
        "A",
        "A",
        "A",
        "A",
        "A",
        "A",
        "A"
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
        },
        {
          "index": 14,
          "color": "green"
        },
        {
          "index": 15,
          "color": "green"
        },
        {
          "index": 16,
          "color": "green"
        },
        {
          "index": 17,
          "color": "green"
        }
      ],
      "vars": [
        [
          "turnaround",
          "A 18, B 8, C 4 → avg 30/3 = 10.00"
        ],
        [
          "response",
          "A 0, B 0, C 2 → avg 2/3 = 0.67"
        ]
      ]
    }
  ]
},
        {
          type: 'p',
          text: 'Every job gets the CPU within one slice of arriving, so the average response time is tiny (0.67 here, against 7.33 for FIFO). The price shows in turnaround: RR deliberately stretches every job out. For jobs of equal length it is close to the *worst* possible policy for turnaround, because all of them finish near the very end.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why you cannot have both',
          text: 'Turnaround rewards finishing jobs, which means running one job at a time. Response time rewards starting jobs, which means sharing the CPU. Any policy that is *fair* in the short term, giving everyone a little, does badly on turnaround. This tension runs through the whole unit, and real schedulers resolve it by guessing which jobs are interactive.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'numeric',
      prompt: 'Three jobs A, B and C arrive at time 0 and each needs 6 units. Round robin uses a slice of 2 units and starts with A. What is the **average turnaround time**?',
      answer: 16,
      unit: 'units',
      explanation:
        'The timeline is AABBCC AABBCC AABBCC. A finishes at 14, B at 16, C at 18, so the average is (14 + 16 + 18) / 3 = **16**. SJF (any order, since they are equal) gives 6, 12, 18 for an average of 12. In exchange, RR\'s average response time is (0 + 2 + 4) / 3 = 2 against SJF\'s (0 + 6 + 12) / 3 = 6.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'How long should a slice be?',
      blocks: [
        {
          type: 'p',
          text: 'The slice length is round robin\'s one knob. Shorter slices mean better response time, but every slice boundary costs a context switch: the direct cost of trapping into the kernel, running the scheduler and swapping register state (on the order of a microsecond on a modern CPU), plus the **indirect** cost. The thread that comes in finds the [[cpu-cache|caches]], branch predictors and [[tlb|TLB]] full of the previous thread\'s state and runs slowly until it has rebuilt its own. That refill can cost far more than the switch itself.',
        },
        {
          type: 'p',
          text: 'If a switch effectively costs `s` and a slice is `q`, the fraction of CPU time lost is `s / (q + s)`. With `s` = 0.5 ms and `q` = 4 ms that is 11%; stretch the slice to 50 ms and it falls below 1%. Long slices **amortize** the cost; but as `q` grows, round robin turns back into FIFO and response time suffers.',
        },
        {
          type: 'table',
          headers: ['System', 'Typical slice', 'Notes'],
          rows: [
            ['Classic Unix', '10 to 100 ms', 'A fixed quantum per priority level'],
            ['Linux 6.6+ (EEVDF)', '0.75 ms × (1 + log₂ CPUs), up to 3 ms', 'A *base slice*; tasks may request their own with `sched_setattr()`'],
            ['Windows client', '2 clock ticks', 'Stretched for threads of the foreground process'],
            ['Windows Server', '12 clock ticks', 'Longer, fixed quanta favour throughput'],
          ],
          caption: 'Real values (Windows figures from *Windows Internals*). Next lesson explains why modern Linux no longer thinks in fixed slices.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'What this means for your threads',
          text: 'Creating more busy threads than cores does not make work finish faster. It forces the scheduler to time-slice them, and every slice boundary throws away cache state. That is why engines create about one worker per core and feed it many small jobs instead of spawning a thread per task: [[thread-pool|thread pools]] avoid paying the scheduler\'s overhead for parallelism they cannot get anyway.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'numeric',
      prompt: 'Each context switch effectively costs 0.5 ms once you include refilling caches, and the time slice is 4 ms. What percentage of CPU time is lost to switching? Round to one decimal place.',
      answer: 11.1,
      tolerance: 0.1,
      alsoAccept: ['1/9'],
      unit: '%',
      explanation:
        'Each cycle is 4 ms of useful work plus 0.5 ms of switching, so the lost fraction is 0.5 / 4.5 = 1/9 ≈ **11.1%**. Doubling the slice to 8 ms cuts it to 0.5 / 8.5 ≈ 5.9%. This is why slices are not made arbitrarily small even though response time would love it.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'A scheduler simulator in C++',
      blocks: [
        {
          type: 'p',
          text: 'Time to check all of this with real code. The simulator below advances time one unit per loop iteration. Each unit it adds arrivals to the ready queue, applies the policy\'s preemption rule, picks a job if the CPU is free, and runs it for one unit, recording first-run and finish times. One function handles all four policies.',
        },
        {
          type: 'code',
          title: 'scheduler_sim.cpp',
          runnable: true,
          code: `#include <algorithm>
#include <deque>
#include <format>
#include <iostream>
#include <string>
#include <vector>

struct Job {
    char name;
    int arrival;
    int burst;
    int remaining = 0;
    int firstRun = -1;
    int finish = 0;
};

enum class Policy { FIFO, SJF, STCF, RR };

// Runs the jobs one time unit per loop iteration and returns
// the timeline: one letter per unit, '.' when the CPU idles.
std::string simulate(std::vector<Job>& jobs, Policy p,
                     int quantum = 0) {
    std::deque<int> ready;      // indices of ready jobs
    std::string timeline;
    int running = -1, used = 0, done = 0;
    const int n = static_cast<int>(jobs.size());
    for (auto& j : jobs) j.remaining = j.burst;

    for (int t = 0; done < n; ++t) {
        for (int i = 0; i < n; ++i)          // arrivals first
            if (jobs[i].arrival == t) ready.push_back(i);

        if (running != -1 && p == Policy::STCF) {
            ready.push_front(running);       // compete again
            running = -1;
        }
        if (running != -1 && p == Policy::RR && used == quantum) {
            ready.push_back(running);        // slice expired
            running = -1;
        }
        if (running == -1 && !ready.empty()) {
            auto pick = ready.begin();
            if (p == Policy::SJF || p == Policy::STCF)
                pick = std::ranges::min_element(ready, {},
                    [&](int i) { return jobs[i].remaining; });
            running = *pick;
            ready.erase(pick);
            used = 0;
        }
        if (running == -1) { timeline += '.'; continue; }

        Job& j = jobs[running];
        if (j.firstRun < 0) j.firstRun = t;
        timeline += j.name;
        --j.remaining;
        ++used;
        if (j.remaining == 0) {
            j.finish = t + 1;
            running = -1;
            ++done;
        }
    }
    return timeline;
}

void report(const char* label, Policy p, int quantum = 0) {
    std::vector<Job> jobs{{'A', 0, 12}, {'B', 2, 4}, {'C', 4, 2}};
    const std::string line = simulate(jobs, p, quantum);
    double turnaround = 0, response = 0;
    for (const Job& j : jobs) {
        turnaround += j.finish - j.arrival;
        response += j.firstRun - j.arrival;
    }
    const double n = static_cast<double>(jobs.size());
    std::cout << std::format("{:<5} {}  turnaround {:5.2f}"
                             "  response {:5.2f}\\n", label, line,
                             turnaround / n, response / n);
}

int main() {
    std::cout << "jobs: A(arrives 0, needs 12) B(2, 4) C(4, 2)\\n";
    report("FIFO", Policy::FIFO);
    report("SJF", Policy::SJF);
    report("STCF", Policy::STCF);
    report("RR2", Policy::RR, 2);
    report("RR1", Policy::RR, 1);
}`,
          output: "jobs: A(arrives 0, needs 12) B(2, 4) C(4, 2)\nFIFO  AAAAAAAAAAAABBBBCC  turnaround 13.33  response  7.33\nSJF   AAAAAAAAAAAACCBBBB  turnaround 12.67  response  6.67\nSTCF  AABBBBCCAAAAAAAAAA  turnaround  8.67  response  0.67\nRR2   AABBAACCBBAAAAAAAA  turnaround 10.00  response  0.67\nRR1   AABABCABCABAAAAAAA  turnaround 10.67  response  0.33",
          annotations: [
            { lines: '9-14', text: '`remaining` counts down as the job runs. `firstRun` starts at −1 meaning "never ran", which is how response time is measured.' },
            { lines: '23', text: 'The ready queue holds indices into `jobs`. A `std::deque` gives cheap push and pop at both ends, which STCF and RR need.' },
            { lines: '30-31', text: 'New arrivals join the queue **before** any preempted job is put back. Real kernels make choices like this too, and they change the timeline, so a simulator must pin them down.' },
            { lines: '33-36', text: 'STCF: the running job goes back into the pool every unit and must win again. Putting it at the *front* makes it win ties, which avoids pointless switches.' },
            { lines: '37-40', text: 'Round robin: once the job has used a whole slice, it goes to the back of the queue.' },
            { lines: '43-45', text: 'SJF and STCF choose the job with the least remaining work. `std::ranges::min_element` with a projection keeps that to one expression and returns the first minimum, so ties go to the earliest queued job.' },
            { lines: '53', text: 'Record the first time a job gets the CPU and never overwrite it.' },
            { lines: '57-61', text: 'A finished job leaves for good. `finish` is `t + 1` because it completed at the *end* of unit `t`.' },
            { lines: '71-72', text: 'The two metrics, straight from their definitions.' },
          ],
        },
        {
          type: 'p',
          text: 'Read the output column by column. STCF has by far the best turnaround, as theory promised. Round robin with a 1-unit slice has the best response time but worse turnaround than with a 2-unit slice, because it switches more and finishes B and C later. Shrinking the slice buys responsiveness with turnaround, before the simulator even charges anything for the switches.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Make it yours',
          text: 'Add a context-switch cost: whenever `running` changes, append an `x` to the timeline and spend a unit doing nothing. Then rerun RR1 and RR2 and watch the slice trade-off appear in the numbers.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'bug',
      prompt: 'A teammate changed one line of the simulator\'s inner loop and now round robin reports a much worse **response** time than before, although the timeline is unchanged. Tap the faulty line.',
      code: `Job& j = jobs[running];
j.firstRun = t;
timeline += j.name;
--j.remaining;
++used;
if (j.remaining == 0) {
    j.finish = t + 1;
    running = -1;
    ++done;
}`,
      bugLines: [2],
      explanation:
        'Line 2 overwrites `firstRun` **every** time the job runs, so it ends up holding the *last* time the job started a unit, not the first. Response time is defined by the first run, so it must be recorded once: `if (j.firstRun < 0) j.firstRun = t;`. The timeline is unaffected because scheduling never reads `firstRun`, which is exactly why metric bugs like this slip through: the program looks correct and the numbers are quietly wrong.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'fill',
      prompt: 'Complete the summary.',
      template: 'Turnaround time is the ___ time minus the arrival time. Response time is the ___ time minus the arrival time. When all jobs arrive together, ___ is optimal for average turnaround, while ___ with a short slice gives excellent response time.',
      templateIsCode: false,
      blanks: [
        { answers: ['completion', 'finish'] },
        { answers: ['first-run', 'first run'] },
        { answers: ['SJF'] },
        { answers: ['round robin', 'RR'] },
      ],
      wordBank: ['completion', 'first-run', 'SJF', 'round robin', 'FIFO', 'arrival', 'context-switch'],
      explanation:
        'The two metrics differ only in which event ends the clock: finishing the job, or first getting the CPU. SJF wins turnaround by finishing short jobs early; round robin wins response time by starting everyone early. FIFO is optimal for neither unless the jobs are equal.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Overlapping I/O',
      blocks: [
        {
          type: 'p',
          text: 'Drop assumption 4: real jobs do I/O. A thread that reads a file, waits for a network packet or sleeps until the next frame **blocks**. It cannot use the CPU until the I/O completes, so the scheduler must run something else, or the CPU sits idle. When the I/O finishes (typically signalled by an interrupt), the thread becomes ready again.',
        },
        {
          type: 'p',
          text: 'Treat each **CPU burst** as its own job. In the figure, A computes 10 ms, reads from disk for 10 ms, and repeats three times; B is a pure 30 ms computation. Under STCF, each 10 ms burst of A is shorter than B, so A runs whenever it is ready and B fills A\'s I/O gaps:',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 228" xmlns="http://www.w3.org/2000/svg"><text x="12" y="22" font-size="13" text-anchor="start" font-weight="700">No overlap</text><text x="12" y="50" font-size="12" text-anchor="start" class="t-gray">CPU</text><text x="12" y="82" font-size="12" text-anchor="start" class="t-gray">Disk</text><line x1="92" y1="60" x2="504" y2="60" class="s-gray" stroke-width="0.8" stroke-dasharray="3 3"/><rect x="92" y="32" width="51.5" height="26" rx="3" class="f-orange" fill-opacity="0.22"/><rect x="92" y="32" width="51.5" height="26" rx="3" fill="none" class="s-orange" stroke-width="1.5"/><text x="117.75" y="49.5" font-size="12" text-anchor="middle" class="t-orange" font-weight="700">A1</text><rect x="195" y="32" width="51.5" height="26" rx="3" class="f-orange" fill-opacity="0.22"/><rect x="195" y="32" width="51.5" height="26" rx="3" fill="none" class="s-orange" stroke-width="1.5"/><text x="220.75" y="49.5" font-size="12" text-anchor="middle" class="t-orange" font-weight="700">A2</text><rect x="298" y="32" width="51.5" height="26" rx="3" class="f-orange" fill-opacity="0.22"/><rect x="298" y="32" width="51.5" height="26" rx="3" fill="none" class="s-orange" stroke-width="1.5"/><text x="323.75" y="49.5" font-size="12" text-anchor="middle" class="t-orange" font-weight="700">A3</text><rect x="349.5" y="32" width="154.5" height="26" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="349.5" y="32" width="154.5" height="26" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="426.75" y="49.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">B</text><rect x="143.5" y="64" width="51.5" height="26" rx="3" class="f-gray" fill-opacity="0.22"/><rect x="143.5" y="64" width="51.5" height="26" rx="3" fill="none" class="s-gray" stroke-width="1.5"/><text x="169.25" y="81.5" font-size="11" text-anchor="middle" class="t-gray" font-weight="700">A I/O</text><rect x="246.5" y="64" width="51.5" height="26" rx="3" class="f-gray" fill-opacity="0.22"/><rect x="246.5" y="64" width="51.5" height="26" rx="3" fill="none" class="s-gray" stroke-width="1.5"/><text x="272.25" y="81.5" font-size="11" text-anchor="middle" class="t-gray" font-weight="700">A I/O</text><text x="169.25" y="49" font-size="11" text-anchor="middle" class="t-red" font-style="italic">idle</text><text x="272.25" y="49" font-size="11" text-anchor="middle" class="t-red" font-style="italic">idle</text><text x="504" y="22" font-size="12" text-anchor="end" class="t-red">done at 80</text><text x="12" y="120" font-size="13" text-anchor="start" font-weight="700">Overlap</text><text x="12" y="148" font-size="12" text-anchor="start" class="t-gray">CPU</text><text x="12" y="180" font-size="12" text-anchor="start" class="t-gray">Disk</text><line x1="92" y1="158" x2="504" y2="158" class="s-gray" stroke-width="0.8" stroke-dasharray="3 3"/><rect x="92" y="130" width="51.5" height="26" rx="3" class="f-orange" fill-opacity="0.22"/><rect x="92" y="130" width="51.5" height="26" rx="3" fill="none" class="s-orange" stroke-width="1.5"/><text x="117.75" y="147.5" font-size="12" text-anchor="middle" class="t-orange" font-weight="700">A1</text><rect x="143.5" y="130" width="51.5" height="26" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="143.5" y="130" width="51.5" height="26" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="169.25" y="147.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">B</text><rect x="195" y="130" width="51.5" height="26" rx="3" class="f-orange" fill-opacity="0.22"/><rect x="195" y="130" width="51.5" height="26" rx="3" fill="none" class="s-orange" stroke-width="1.5"/><text x="220.75" y="147.5" font-size="12" text-anchor="middle" class="t-orange" font-weight="700">A2</text><rect x="246.5" y="130" width="51.5" height="26" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="246.5" y="130" width="51.5" height="26" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="272.25" y="147.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">B</text><rect x="298" y="130" width="51.5" height="26" rx="3" class="f-orange" fill-opacity="0.22"/><rect x="298" y="130" width="51.5" height="26" rx="3" fill="none" class="s-orange" stroke-width="1.5"/><text x="323.75" y="147.5" font-size="12" text-anchor="middle" class="t-orange" font-weight="700">A3</text><rect x="349.5" y="130" width="51.5" height="26" rx="3" class="f-blue" fill-opacity="0.22"/><rect x="349.5" y="130" width="51.5" height="26" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="375.25" y="147.5" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">B</text><rect x="143.5" y="162" width="51.5" height="26" rx="3" class="f-gray" fill-opacity="0.22"/><rect x="143.5" y="162" width="51.5" height="26" rx="3" fill="none" class="s-gray" stroke-width="1.5"/><text x="169.25" y="179.5" font-size="11" text-anchor="middle" class="t-gray" font-weight="700">A I/O</text><rect x="246.5" y="162" width="51.5" height="26" rx="3" class="f-gray" fill-opacity="0.22"/><rect x="246.5" y="162" width="51.5" height="26" rx="3" fill="none" class="s-gray" stroke-width="1.5"/><text x="272.25" y="179.5" font-size="11" text-anchor="middle" class="t-gray" font-weight="700">A I/O</text><text x="401" y="120" font-size="12" text-anchor="middle" class="t-green">done at 60</text><line x1="92" y1="204" x2="504" y2="204" stroke="currentColor" stroke-width="1.2"/><line x1="92" y1="204" x2="92" y2="209" stroke="currentColor" stroke-width="1.2"/><text x="92" y="222" font-size="11" text-anchor="middle" class="t-gray">0</text><line x1="143.5" y1="204" x2="143.5" y2="209" stroke="currentColor" stroke-width="1.2"/><text x="143.5" y="222" font-size="11" text-anchor="middle" class="t-gray">10</text><line x1="195" y1="204" x2="195" y2="209" stroke="currentColor" stroke-width="1.2"/><text x="195" y="222" font-size="11" text-anchor="middle" class="t-gray">20</text><line x1="246.5" y1="204" x2="246.5" y2="209" stroke="currentColor" stroke-width="1.2"/><text x="246.5" y="222" font-size="11" text-anchor="middle" class="t-gray">30</text><line x1="298" y1="204" x2="298" y2="209" stroke="currentColor" stroke-width="1.2"/><text x="298" y="222" font-size="11" text-anchor="middle" class="t-gray">40</text><line x1="349.5" y1="204" x2="349.5" y2="209" stroke="currentColor" stroke-width="1.2"/><text x="349.5" y="222" font-size="11" text-anchor="middle" class="t-gray">50</text><line x1="401" y1="204" x2="401" y2="209" stroke="currentColor" stroke-width="1.2"/><text x="401" y="222" font-size="11" text-anchor="middle" class="t-gray">60</text><line x1="452.5" y1="204" x2="452.5" y2="209" stroke="currentColor" stroke-width="1.2"/><text x="452.5" y="222" font-size="11" text-anchor="middle" class="t-gray">70</text><line x1="504" y1="204" x2="504" y2="209" stroke="currentColor" stroke-width="1.2"/><text x="504" y="222" font-size="11" text-anchor="middle" class="t-gray">80</text><text x="12" y="222" font-size="11" text-anchor="start" class="t-gray">time (ms)</text></svg>`,
          alt: 'Two timelines with a CPU row and a disk row. Without overlap, the CPU idles during A\'s disk reads and everything finishes at 80 ms. With overlap, B runs on the CPU while A reads from disk, and everything finishes at 60 ms.',
          caption: 'Running B while A waits for the disk keeps both devices busy. The work is identical; only the schedule changed.',
        },
        {
          type: 'p',
          text: 'This also explains a classic preference: schedulers favour **I/O-bound** threads (short bursts between waits, like an input or audio thread) over **CPU-bound** ones. Running an I/O-bound thread costs little CPU and quickly gets another device working in parallel. Running a CPU-bound thread first makes the I/O-bound one, and its device, wait.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Blocking versus spinning in your code',
          text: 'When your loading thread calls a blocking `read`, the kernel can give its core to the game thread until the data arrives. If you instead **busy-wait**, `while (!ready) {}`, the scheduler sees a thread that wants the CPU all the time and charges it whole slices of spinning. Block on the OS (a condition variable, a future, an I/O completion) unless you have measured that the wait is shorter than a context switch.',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'truefalse',
      prompt: 'True or false: for a set of jobs that all arrive at once and all have the same length, round robin with a short slice gives a better average turnaround time than FIFO.',
      answer: false,
      explanation:
        'False, and by a lot. Round robin interleaves the jobs, so they all finish near the end: three 6-unit jobs with a 2-unit slice finish at 14, 16 and 18 (average 16), while FIFO finishes them at 6, 12 and 18 (average 12). RR is excellent for *response* time and close to the worst policy for *turnaround* on equal-length jobs.',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'concept',
      title: 'Living without an oracle',
      blocks: [
        {
          type: 'p',
          text: 'Four assumptions are gone. The fifth, knowing every job\'s run time, cannot simply be dropped, because the best policy for turnaround (STCF) depends on it. Here is where we stand:',
        },
        {
          type: 'table',
          headers: ['Policy', 'Preemptive?', 'Good for', 'Weakness'],
          rows: [
            ['FIFO', 'No', 'Simplicity; equal jobs', 'Convoy effect'],
            ['SJF', 'No', 'Turnaround when jobs arrive together', 'Needs run times; late arrivals wait'],
            ['STCF', 'Yes', 'Turnaround, optimal in general', 'Needs run times; starves long jobs'],
            ['Round robin', 'Yes', 'Response time; short-term fairness', 'Turnaround; switch overhead'],
          ],
        },
        {
          type: 'p',
          text: 'Real schedulers want STCF\'s turnaround for short jobs **and** round robin\'s response time for interactive ones, without knowing which is which. The next lesson\'s answer is to *learn from the past*: watch how each thread behaves (does it use its whole slice, or block quickly?) and predict the future from it. That is the multi-level feedback queue, and its descendants run on every machine you own.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Game engines schedule too',
          text: 'Your engine\'s job system is a user-mode scheduler with a different goal. Within a frame, the metric that matters is **makespan**: when does the *last* job finish, so the frame can be presented? For that goal, a good heuristic is the opposite of SJF: start the **longest** jobs first (the classic LPT rule), so no core is left with one long job at the end while the others idle. Same jobs, different metric, opposite policy.',
        },
      ],
    },
    // ------------------------------------------------------------------ 17
    {
      kind: 'order',
      prompt: 'A thread\'s slice runs out under round robin. Put the events in order, from the timer firing to the next thread running.',
      lines: [
        'The timer interrupt fires; the CPU saves the running thread\'s user registers and enters the kernel',
        'The interrupt handler charges the tick to the thread and finds its slice used up',
        'The scheduler puts that thread at the back of the ready queue and picks the one at the front',
        'The kernel switches kernel stacks and saved registers from the old thread to the new one',
        'Return-from-trap restores the new thread\'s user registers and it resumes in user mode',
      ],
      distractors: ['The kernel waits for the running thread to call `yield()` before switching'],
      linesAreCode: false,
      explanation:
        'Preemption is driven by the timer, not by the thread\'s cooperation, which is why the `yield()` line does not belong: a thread stuck in an infinite loop is still switched out. Policy (step 3) sits between the two halves of the mechanism (entering the kernel, and leaving it in a different thread).',
    },
    // ------------------------------------------------------------------ 18
    {
      kind: 'mcq',
      prompt: 'A frame has 8 independent jobs for 2 worker cores: one takes 6 ms and seven take 1 ms. To finish the whole frame as early as possible, which order should the job system start them in?',
      options: [
        {
          text: 'The 6 ms job first, so one core runs it while the other core runs the seven short ones',
          correct: true,
          why: 'Core 1 runs the 6 ms job while core 2 runs six short ones; the seventh starts at 6 ms on whichever core is free. The frame\'s work is done at 7 ms, the best possible packing of 13 ms of work with one 6 ms piece onto two cores.',
        },
        {
          text: 'The seven 1 ms jobs first (SJF), because SJF is optimal',
          why: 'SJF optimises *average turnaround*. Here the two cores share the short jobs until 3 ms, then the 6 ms job starts and ends at 9 ms while the other core idles from 4 ms on. The goal is the last finish time, not the average.',
        },
        {
          text: 'Round robin between all eight jobs with a 1 ms slice',
          why: 'Time-slicing does not create extra cores; it adds switches and still leaves the 6 ms job finishing late.',
        },
        {
          text: 'The order does not matter; total work is 13 ms whatever you do',
          why: 'Total work is fixed, but how it packs onto two cores is not. The finish time ranges from 7 ms to 9 ms depending on order.',
        },
      ],
      explanation:
        'Choose the policy for the metric. Kernels mostly care about average turnaround and response time; a frame cares about makespan, and the longest-processing-time-first heuristic packs work onto cores well. Engine job systems often let you mark long jobs as high priority for exactly this reason.',
    },
  ],
  takeaways: [
    'The **scheduler** is the policy that picks the next thread; context switching is the mechanism it relies on. It runs on timer interrupts, blocking, wake-ups, creation and exit.',
    '**Turnaround** = completion − arrival; **response** = first run − arrival. Policies that are good for one tend to be bad for the other.',
    'FIFO suffers the **convoy effect**. SJF is optimal for turnaround when jobs arrive together; preemptive **STCF** is optimal in general, but both need an oracle and can starve long jobs.',
    '**Round robin** gives great response time; its slice length trades responsiveness against context-switch overhead, including cache and TLB refill.',
    'Treating each CPU burst as a job lets the scheduler **overlap I/O with computation**, which favours I/O-bound threads.',
    'Without knowing run times, real schedulers must learn them from behaviour, which is the subject of the next lesson.',
  ],
  reading: [
    {
      title: 'OSTEP chapter 7: Scheduling: Introduction',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf',
      source: 'book',
      note: 'The workload assumptions, FIFO, SJF, STCF, RR and I/O overlap, with homework that uses a Python simulator much like ours.',
    },
    {
      title: 'sched(7) — Linux manual page',
      url: 'https://man7.org/linux/man-pages/man7/sched.7.html',
      source: 'other',
      note: 'An overview of the Linux scheduling policies and the system calls that set them.',
    },
    {
      title: 'Scheduling (Microsoft Learn)',
      url: 'https://learn.microsoft.com/en-us/windows/win32/procthread/scheduling',
      source: 'other',
      note: 'Windows\' scheduling overview: priorities, quanta and context switches from the Win32 side.',
    },
  ],
};
