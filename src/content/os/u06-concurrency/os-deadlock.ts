import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-deadlock',
  title: 'Deadlock and Other Concurrency Bugs',
  summary:
    'The four conditions for deadlock and how resource allocation graphs reveal it, the dining philosophers, prevention by lock ordering, avoidance with the banker\'s algorithm, detection and recovery, livelock and starvation, priority inversion on Mars, and the atomicity and order violations behind most other concurrency bugs.',
  minutes: 24,
  objectives: [
    'State the four Coffman conditions and explain how breaking any one prevents deadlock',
    'Draw and read a resource allocation graph, and tell when a cycle means deadlock',
    'Prevent deadlock with a global lock order, lock hierarchies and `std::scoped_lock`',
    'Run the banker\'s safety check and explain why general-purpose OSes rarely use avoidance',
    'Detect deadlock with a wait-for graph and choose a recovery strategy',
    'Recognize livelock, starvation and priority inversion, and explain how priority inheritance fixed Mars Pathfinder',
    'Identify atomicity and order violations, the most common non-deadlock concurrency bugs',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Deadlock and the four conditions',
      blocks: [
        {
          type: 'p',
          text: 'C++ Fundamentals showed the classic [[deadlock]]: one thread transfers gold from Alice to Bob, locking Alice then Bob, while another transfers the other way, locking Bob then Alice. Each holds one lock and waits forever for the other. The last unit added another instance: a producer asleep on a full buffer while holding the mutex the consumer needs.',
        },
        {
          type: 'definition',
          term: 'Deadlock',
          text: 'A set of threads (or [[process|processes]]) in which every member is blocked waiting for something that only another member of the set can provide. None can ever proceed without outside intervention.',
        },
        {
          type: 'p',
          text: 'In 1971 Coffman, Elphick and Shoshani showed that deadlock over resources such as locks can happen **only if all four** of these [[coffman-conditions|conditions]] hold at once:',
        },
        {
          type: 'table',
          headers: ['Condition', 'Meaning', 'For a mutex'],
          rows: [
            ['**Mutual exclusion**', 'A resource can be held by only one thread at a time', 'That is what a mutex is for'],
            ['**Hold and wait**', 'A thread holds some resources while waiting for others', 'Locking B while already holding A'],
            ['**No preemption**', 'Resources cannot be taken away; only the holder releases them', 'Nobody can force another thread to unlock'],
            ['**Circular wait**', 'There is a cycle: T1 waits for T2, which waits for …, which waits for T1', 'Two threads taking the same two locks in opposite orders'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the list is useful',
          text: 'The conditions are a checklist of attack points. Remove any one and deadlock becomes impossible, so every prevention technique in this lesson is "pick a condition and make sure it cannot hold". In practice the cheapest one to break is almost always circular wait, by agreeing on a lock order.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Not just locks',
          text: 'Deadlock happens with any resource that is waited for: two processes each waiting to read from a pipe the other should write, a job waiting on a job queue that only it could drain, a thread joining itself, or a render thread waiting on a GPU fence the game thread was supposed to submit. The analysis is the same.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'fill',
      prompt: 'Complete the four conditions for deadlock.',
      template: 'Deadlock requires mutual exclusion, ___ and wait, no ___, and a circular ___. Removing any ___ of them makes deadlock impossible.',
      templateIsCode: false,
      blanks: [{ answers: ['hold'] }, { answers: ['preemption'] }, { answers: ['wait'] }, { answers: ['one'] }],
      wordBank: ['hold', 'preemption', 'wait', 'one', 'two', 'starvation', 'priority', 'all'],
      explanation:
        'The Coffman conditions are mutual exclusion, hold and wait, no preemption and circular wait, and all four are **necessary**. That is what makes them practical: you do not have to defeat all four, just one. Lock ordering removes circular wait; acquiring everything at once removes hold and wait; `try_lock` with back-off simulates preemption; lock-free data structures avoid mutual exclusion.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Resource allocation graphs',
      blocks: [
        {
          type: 'p',
          text: 'A [[resource-allocation-graph|resource allocation graph]] makes circular wait visible. It has a node for each thread and each resource, and two kinds of directed edges: a **request edge** from a thread to a resource it is waiting for, and an **assignment edge** from a resource to the thread holding it. Watch three threads build one, one lock at a time:',
        },
        {
  "type": "algo",
  "view": "graph",
  "nodes": [
    {
      "id": "A",
      "x": 210,
      "y": 40,
      "label": "A"
    },
    {
      "id": "T1",
      "x": 350,
      "y": 100,
      "label": "T1"
    },
    {
      "id": "B",
      "x": 350,
      "y": 200,
      "label": "B"
    },
    {
      "id": "T2",
      "x": 210,
      "y": 255,
      "label": "T2"
    },
    {
      "id": "C",
      "x": 70,
      "y": 200,
      "label": "C"
    },
    {
      "id": "T3",
      "x": 70,
      "y": 100,
      "label": "T3"
    }
  ],
  "edges": [
    {
      "from": "A",
      "to": "T1",
      "directed": true
    },
    {
      "from": "T1",
      "to": "B",
      "directed": true
    },
    {
      "from": "B",
      "to": "T2",
      "directed": true
    },
    {
      "from": "T2",
      "to": "C",
      "directed": true
    },
    {
      "from": "C",
      "to": "T3",
      "directed": true
    },
    {
      "from": "T3",
      "to": "A",
      "directed": true
    }
  ],
  "width": 420,
  "height": 290,
  "code": "void worker(Mutex& x, Mutex& y) {\n  std::lock_guard a{x};\n  std::lock_guard b{y};\n  work();\n}\n// T1: x = A, y = B\n// T2: x = B, y = C\n// T3: x = C, y = A",
  "interval": 1500,
  "caption": "A resource allocation graph forming a cycle. Green: lock → owner. Orange: thread → lock it waits for. Red: the deadlock cycle.",
  "frames": [
    {
      "note": "Three mutexes (A, B, C) and three threads. Thin arrows are edges that do not exist yet.",
      "lines": [
        1
      ],
      "edgeColors": [],
      "nodeColors": [],
      "vars": [
        [
          "held",
          "none"
        ],
        [
          "waiting",
          "none"
        ]
      ]
    },
    {
      "note": "T1 locks A: an **assignment edge** A → T1.",
      "lines": [
        2
      ],
      "edgeColors": [
        {
          "from": "A",
          "to": "T1",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "A",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "held",
          "A→T1"
        ],
        [
          "waiting",
          "none"
        ]
      ]
    },
    {
      "note": "T2 locks B: an **assignment edge** B → T2.",
      "lines": [
        2
      ],
      "edgeColors": [
        {
          "from": "A",
          "to": "T1",
          "color": "green"
        },
        {
          "from": "B",
          "to": "T2",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "A",
          "color": "purple"
        },
        {
          "id": "B",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "held",
          "A→T1, B→T2"
        ],
        [
          "waiting",
          "none"
        ]
      ]
    },
    {
      "note": "T3 locks C: an **assignment edge** C → T3.",
      "lines": [
        2
      ],
      "edgeColors": [
        {
          "from": "A",
          "to": "T1",
          "color": "green"
        },
        {
          "from": "B",
          "to": "T2",
          "color": "green"
        },
        {
          "from": "C",
          "to": "T3",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "A",
          "color": "purple"
        },
        {
          "id": "B",
          "color": "purple"
        },
        {
          "id": "C",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "held",
          "A→T1, B→T2, C→T3"
        ],
        [
          "waiting",
          "none"
        ]
      ]
    },
    {
      "note": "T1 requests B, which T2 holds: a **request edge** T1 → B. T1 blocks. No cycle yet, so T2 could still finish and free it.",
      "lines": [
        3
      ],
      "edgeColors": [
        {
          "from": "A",
          "to": "T1",
          "color": "green"
        },
        {
          "from": "B",
          "to": "T2",
          "color": "green"
        },
        {
          "from": "C",
          "to": "T3",
          "color": "green"
        },
        {
          "from": "T1",
          "to": "B",
          "color": "orange"
        }
      ],
      "nodeColors": [
        {
          "id": "A",
          "color": "purple"
        },
        {
          "id": "B",
          "color": "purple"
        },
        {
          "id": "C",
          "color": "purple"
        },
        {
          "id": "T1",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "held",
          "A→T1, B→T2, C→T3"
        ],
        [
          "waiting",
          "T1→B"
        ]
      ]
    },
    {
      "note": "T2 requests C, which T3 holds: a **request edge** T2 → C. T2 blocks. No cycle yet, so T3 could still finish and free it.",
      "lines": [
        3
      ],
      "edgeColors": [
        {
          "from": "A",
          "to": "T1",
          "color": "green"
        },
        {
          "from": "B",
          "to": "T2",
          "color": "green"
        },
        {
          "from": "C",
          "to": "T3",
          "color": "green"
        },
        {
          "from": "T1",
          "to": "B",
          "color": "orange"
        },
        {
          "from": "T2",
          "to": "C",
          "color": "orange"
        }
      ],
      "nodeColors": [
        {
          "id": "A",
          "color": "purple"
        },
        {
          "id": "B",
          "color": "purple"
        },
        {
          "id": "C",
          "color": "purple"
        },
        {
          "id": "T1",
          "color": "orange"
        },
        {
          "id": "T2",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "held",
          "A→T1, B→T2, C→T3"
        ],
        [
          "waiting",
          "T1→B, T2→C"
        ]
      ]
    },
    {
      "note": "T3 requests A, held by T1. The edges now form a **cycle** T1 → B → T2 → C → T3 → A → T1. Every lock has one instance, so this is a deadlock: no thread can ever proceed.",
      "lines": [
        3
      ],
      "edgeColors": [
        {
          "from": "T1",
          "to": "B",
          "color": "red"
        },
        {
          "from": "B",
          "to": "T2",
          "color": "red"
        },
        {
          "from": "T2",
          "to": "C",
          "color": "red"
        },
        {
          "from": "C",
          "to": "T3",
          "color": "red"
        },
        {
          "from": "T3",
          "to": "A",
          "color": "red"
        },
        {
          "from": "A",
          "to": "T1",
          "color": "red"
        }
      ],
      "nodeColors": [
        {
          "id": "T1",
          "color": "red"
        },
        {
          "id": "B",
          "color": "red"
        },
        {
          "id": "T2",
          "color": "red"
        },
        {
          "id": "C",
          "color": "red"
        },
        {
          "id": "T3",
          "color": "red"
        },
        {
          "id": "A",
          "color": "red"
        }
      ],
      "vars": [
        [
          "held",
          "A→T1, B→T2, C→T3"
        ],
        [
          "waiting",
          "T1→B, T2→C, T3→A"
        ]
      ]
    },
    {
      "note": "All four Coffman conditions hold: exclusive locks, each thread **holds** one while **waiting** for another, no lock can be taken away, and the waits form a **circle**.",
      "lines": [
        3
      ],
      "edgeColors": [
        {
          "from": "T1",
          "to": "B",
          "color": "red"
        },
        {
          "from": "B",
          "to": "T2",
          "color": "red"
        },
        {
          "from": "T2",
          "to": "C",
          "color": "red"
        },
        {
          "from": "C",
          "to": "T3",
          "color": "red"
        },
        {
          "from": "T3",
          "to": "A",
          "color": "red"
        },
        {
          "from": "A",
          "to": "T1",
          "color": "red"
        }
      ],
      "nodeColors": [
        {
          "id": "T1",
          "color": "red"
        },
        {
          "id": "B",
          "color": "red"
        },
        {
          "id": "T2",
          "color": "red"
        },
        {
          "id": "C",
          "color": "red"
        },
        {
          "id": "T3",
          "color": "red"
        },
        {
          "id": "A",
          "color": "red"
        }
      ],
      "vars": [
        [
          "held",
          "A→T1, B→T2, C→T3"
        ],
        [
          "waiting",
          "T1→B, T2→C, T3→A"
        ]
      ]
    }
  ]
},
        {
          type: 'p',
          text: 'If every resource has a **single instance**, as with mutexes, the rule is simple: a cycle in the graph means deadlock, and no cycle means no deadlock. With several identical instances of a resource (three free audio voices, two DMA channels), a cycle is necessary but **not sufficient**:',
        },
        {
          type: 'figure',
          svg: "<svg viewBox=\"0 0 520 330\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"220\" y=\"30\" width=\"80\" height=\"54\" rx=\"4\" fill=\"currentColor\" fill-opacity=\"0.06\" stroke=\"currentColor\" stroke-width=\"2\" class=\"s-purple f-purple\"/><text x=\"260\" y=\"22\" text-anchor=\"middle\" font-size=\"13\" class=\"t-purple\">R1 (1 instance)</text><circle cx=\"260\" cy=\"57\" r=\"6\" class=\"f-purple\"/><rect x=\"200\" y=\"210\" width=\"120\" height=\"54\" rx=\"4\" fill=\"currentColor\" fill-opacity=\"0.06\" stroke=\"currentColor\" stroke-width=\"2\" class=\"s-purple f-purple\"/><text x=\"260\" y=\"284\" text-anchor=\"middle\" font-size=\"13\" class=\"t-purple\">R2 (2 instances)</text><circle cx=\"236\" cy=\"237\" r=\"6\" class=\"f-purple\"/><circle cx=\"284\" cy=\"237\" r=\"6\" class=\"f-purple\"/><circle cx=\"80\" cy=\"147\" r=\"28\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" class=\"s-blue\"/><text x=\"80\" y=\"152\" text-anchor=\"middle\" font-size=\"14\" class=\"t-blue\">P1</text><circle cx=\"440\" cy=\"147\" r=\"28\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" class=\"s-blue\"/><text x=\"440\" y=\"152\" text-anchor=\"middle\" font-size=\"14\" class=\"t-blue\">P2</text><circle cx=\"440\" cy=\"270\" r=\"28\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" class=\"s-green\"/><text x=\"440\" y=\"275\" text-anchor=\"middle\" font-size=\"14\" class=\"t-green\">P3</text><path d=\"M98,126 L212,64\" stroke=\"currentColor\" stroke-width=\"2\" class=\"s-orange\"/><path d=\"M220,60 L207,59 L212,69 Z\" class=\"f-orange\"/><path d=\"M266,57 L404,128\" stroke=\"currentColor\" stroke-width=\"2\" class=\"s-green\"/><path d=\"M413,133 L400,123 L397,134 Z\" class=\"f-green\"/><path d=\"M418,165 L328,214\" stroke=\"currentColor\" stroke-width=\"2\" class=\"s-orange\"/><path d=\"M320,219 L332,210 L334,220 Z\" class=\"f-orange\"/><path d=\"M230,237 L111,165\" stroke=\"currentColor\" stroke-width=\"2\" class=\"s-green\"/><path d=\"M103,160 L115,160 L109,170 Z\" class=\"f-green\"/><path d=\"M290,240 L404,264\" stroke=\"currentColor\" stroke-width=\"2\" class=\"s-green\"/><path d=\"M412,266 L400,259 L400,269 Z\" class=\"f-green\"/><text x=\"140\" y=\"84\" text-anchor=\"middle\" font-size=\"11\" class=\"t-orange\">P1 requests R1</text><text x=\"372\" y=\"84\" text-anchor=\"middle\" font-size=\"11\" class=\"t-green\">R1 held by P2</text><text x=\"398\" y=\"207\" text-anchor=\"middle\" font-size=\"11\" class=\"t-orange\">P2 requests R2</text><text x=\"130\" y=\"215\" text-anchor=\"middle\" font-size=\"11\" class=\"t-green\">one R2 held by P1</text><text x=\"352\" y=\"244\" text-anchor=\"middle\" font-size=\"11\" class=\"t-green\">one by P3</text><text x=\"260\" y=\"310\" text-anchor=\"middle\" font-size=\"11\" class=\"t-gray\">Orange: request edge (process \u2192 resource). Green: assignment edge (instance \u2192 process).</text><text x=\"260\" y=\"148\" text-anchor=\"middle\" font-size=\"12\" class=\"t-gray\">cycle: P1 \u2192 R1 \u2192 P2 \u2192 R2 \u2192 P1</text><text x=\"260\" y=\"166\" text-anchor=\"middle\" font-size=\"12\" class=\"t-gray\">but P3 can finish and free its R2</text></svg>",
          alt: 'Resource allocation graph with resources R1 (one instance) and R2 (two instances) and processes P1, P2, P3. P1 requests R1; R1 is held by P2; P2 requests R2; one instance of R2 is held by P1 and the other by P3. There is a cycle P1, R1, P2, R2, P1, but P3 is not waiting for anything.',
          caption: 'A cycle without a deadlock. P3 is not waiting, so it can finish and release its instance of R2; P2 then gets it, finishes and frees R1 for P1.',
        },
        {
          type: 'p',
          text: 'For mutexes you can simplify further to a **wait-for graph**: drop the resource nodes and draw an edge from each blocked thread straight to the thread that holds the lock it wants. Since a blocked thread waits on exactly one lock, each thread has at most one outgoing edge, and finding a cycle is just following arrows. Detection tools work this way.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'If a resource allocation graph contains a cycle, the threads in that cycle are always deadlocked.',
      answer: false,
      explanation:
        'True only when every resource in the cycle has a single instance, which is the case for mutexes. With multiple instances, a thread outside the cycle may hold an instance and be free to finish, as P3 is in the figure; when it releases, the cycle breaks. For multi-instance resources you need a reduction algorithm (repeatedly "finish" any thread whose requests can be met and release its resources) to decide whether a deadlock exists, which is exactly what the banker\'s safety check later in this lesson does.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'The dining philosophers',
      blocks: [
        {
          type: 'p',
          text: 'Dijkstra\'s famous puzzle (1965, told in its modern form by Tony Hoare): five philosophers sit around a table with one fork between each pair. A philosopher alternates between thinking and eating, and needs **both** neighbouring forks to eat. Each fork is a mutex; each philosopher is a thread. If everyone picks up their left fork first, everyone can end up holding one fork and waiting for the other. Then watch the fix:',
        },
        {
  "type": "algo",
  "view": "graph",
  "nodes": [
    {
      "id": "P0",
      "x": 210,
      "y": 40,
      "label": "P0"
    },
    {
      "id": "P1",
      "x": 310,
      "y": 113,
      "label": "P1"
    },
    {
      "id": "P2",
      "x": 272,
      "y": 230,
      "label": "P2"
    },
    {
      "id": "P3",
      "x": 148,
      "y": 230,
      "label": "P3"
    },
    {
      "id": "P4",
      "x": 110,
      "y": 113,
      "label": "P4"
    },
    {
      "id": "F0",
      "x": 244,
      "y": 98,
      "label": "F0"
    },
    {
      "id": "F1",
      "x": 265,
      "y": 163,
      "label": "F1"
    },
    {
      "id": "F2",
      "x": 210,
      "y": 203,
      "label": "F2"
    },
    {
      "id": "F3",
      "x": 155,
      "y": 163,
      "label": "F3"
    },
    {
      "id": "F4",
      "x": 176,
      "y": 98,
      "label": "F4"
    }
  ],
  "edges": [
    {
      "from": "P0",
      "to": "F4"
    },
    {
      "from": "P0",
      "to": "F0"
    },
    {
      "from": "P1",
      "to": "F0"
    },
    {
      "from": "P1",
      "to": "F1"
    },
    {
      "from": "P2",
      "to": "F1"
    },
    {
      "from": "P2",
      "to": "F2"
    },
    {
      "from": "P3",
      "to": "F2"
    },
    {
      "from": "P3",
      "to": "F3"
    },
    {
      "from": "P4",
      "to": "F3"
    },
    {
      "from": "P4",
      "to": "F4"
    }
  ],
  "width": 420,
  "height": 290,
  "interval": 1300,
  "caption": "Dining philosophers. Green edge: holds that fork; red edge: waiting for it. Philosophers turn orange when holding one fork, red when waiting, green when eating.",
  "frames": [
    {
      "note": "Five philosophers, five forks. To eat, a philosopher needs both neighbouring forks. Naive rule: pick up the left fork, then the right.",
      "edgeColors": [],
      "nodeColors": [],
      "vars": [
        [
          "rule",
          "left fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P0 picks up F4.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "orange"
        },
        {
          "id": "F4",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "left fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P1 picks up F0.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "orange"
        },
        {
          "id": "P1",
          "color": "orange"
        },
        {
          "id": "F4",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "left fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P2 picks up F1.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "orange"
        },
        {
          "id": "P1",
          "color": "orange"
        },
        {
          "id": "P2",
          "color": "orange"
        },
        {
          "id": "F4",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "left fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P3 picks up F2.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "orange"
        },
        {
          "id": "P1",
          "color": "orange"
        },
        {
          "id": "P2",
          "color": "orange"
        },
        {
          "id": "P3",
          "color": "orange"
        },
        {
          "id": "F4",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "left fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P4 picks up F3.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "orange"
        },
        {
          "id": "P1",
          "color": "orange"
        },
        {
          "id": "P2",
          "color": "orange"
        },
        {
          "id": "P3",
          "color": "orange"
        },
        {
          "id": "P4",
          "color": "orange"
        },
        {
          "id": "F4",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "left fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P0 wants F0, but P1 has it. P0 waits holding F4.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        },
        {
          "from": "P0",
          "to": "F0",
          "color": "red"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "red"
        },
        {
          "id": "P1",
          "color": "orange"
        },
        {
          "id": "P2",
          "color": "orange"
        },
        {
          "id": "P3",
          "color": "orange"
        },
        {
          "id": "P4",
          "color": "orange"
        },
        {
          "id": "F4",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "left fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P1 wants F1, but P2 has it. P1 waits holding F0.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        },
        {
          "from": "P0",
          "to": "F0",
          "color": "red"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F1",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "red"
        },
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "orange"
        },
        {
          "id": "P3",
          "color": "orange"
        },
        {
          "id": "P4",
          "color": "orange"
        },
        {
          "id": "F4",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "left fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P2 wants F2, but P3 has it. P2 waits holding F1.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        },
        {
          "from": "P0",
          "to": "F0",
          "color": "red"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F1",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "red"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "red"
        },
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "red"
        },
        {
          "id": "P3",
          "color": "orange"
        },
        {
          "id": "P4",
          "color": "orange"
        },
        {
          "id": "F4",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "left fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P3 wants F3, but P4 has it. P3 waits holding F2.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        },
        {
          "from": "P0",
          "to": "F0",
          "color": "red"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F1",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "red"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F3",
          "color": "red"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "red"
        },
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "red"
        },
        {
          "id": "P3",
          "color": "red"
        },
        {
          "id": "P4",
          "color": "orange"
        },
        {
          "id": "F4",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "left fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P4 wants F4, but P0 has it. P4 waits holding F3.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        },
        {
          "from": "P0",
          "to": "F0",
          "color": "red"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F1",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "red"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F3",
          "color": "red"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        },
        {
          "from": "P4",
          "to": "F4",
          "color": "red"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "red"
        },
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "red"
        },
        {
          "id": "P3",
          "color": "red"
        },
        {
          "id": "P4",
          "color": "red"
        },
        {
          "id": "F4",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "left fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "Every philosopher holds one fork and waits for the next: a cycle of five. **Deadlock**; nobody will ever eat.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        },
        {
          "from": "P0",
          "to": "F0",
          "color": "red"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F1",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "red"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F3",
          "color": "red"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        },
        {
          "from": "P4",
          "to": "F4",
          "color": "red"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "red"
        },
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "red"
        },
        {
          "id": "P3",
          "color": "red"
        },
        {
          "id": "P4",
          "color": "red"
        },
        {
          "id": "F4",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "left fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "**Fixed:** every philosopher picks up the **lower-numbered** fork first. For P0 that is F0 (its right fork), not F4.",
      "edgeColors": [],
      "nodeColors": [],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P0 picks up F0.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F0",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "orange"
        },
        {
          "id": "F0",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P1 wants F0, but P0 has it. P1 waits, holding nothing.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "red"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "orange"
        },
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "F0",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P2 picks up F1.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "orange"
        },
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "orange"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P3 picks up F2.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "orange"
        },
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "orange"
        },
        {
          "id": "P3",
          "color": "orange"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P4 picks up F3.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "orange"
        },
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "orange"
        },
        {
          "id": "P3",
          "color": "orange"
        },
        {
          "id": "P4",
          "color": "orange"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P0 picks up F4: it has both forks and **eats**.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "green"
        },
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "orange"
        },
        {
          "id": "P3",
          "color": "orange"
        },
        {
          "id": "P4",
          "color": "orange"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        },
        {
          "id": "F4",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P2 wants F2, but P3 has it. P2 waits holding F1.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "red"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "green"
        },
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "red"
        },
        {
          "id": "P3",
          "color": "orange"
        },
        {
          "id": "P4",
          "color": "orange"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        },
        {
          "id": "F4",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P3 wants F3, but P4 has it. P3 waits holding F2.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "red"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F3",
          "color": "red"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "green"
        },
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "red"
        },
        {
          "id": "P3",
          "color": "red"
        },
        {
          "id": "P4",
          "color": "orange"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        },
        {
          "id": "F4",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P4 wants F4, but P0 has it. P4 waits holding F3.",
      "edgeColors": [
        {
          "from": "P0",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P0",
          "to": "F4",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F0",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "red"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F3",
          "color": "red"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        },
        {
          "from": "P4",
          "to": "F4",
          "color": "red"
        }
      ],
      "nodeColors": [
        {
          "id": "P0",
          "color": "green"
        },
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "red"
        },
        {
          "id": "P3",
          "color": "red"
        },
        {
          "id": "P4",
          "color": "red"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        },
        {
          "id": "F4",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:0 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P0 finishes eating and puts both forks down.",
      "edgeColors": [
        {
          "from": "P1",
          "to": "F0",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "red"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F3",
          "color": "red"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        },
        {
          "from": "P4",
          "to": "F4",
          "color": "red"
        }
      ],
      "nodeColors": [
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "red"
        },
        {
          "id": "P3",
          "color": "red"
        },
        {
          "id": "P4",
          "color": "red"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:1 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P1 picks up F0.",
      "edgeColors": [
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "red"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F3",
          "color": "red"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        },
        {
          "from": "P4",
          "to": "F4",
          "color": "red"
        }
      ],
      "nodeColors": [
        {
          "id": "P1",
          "color": "orange"
        },
        {
          "id": "P2",
          "color": "red"
        },
        {
          "id": "P3",
          "color": "red"
        },
        {
          "id": "P4",
          "color": "red"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:1 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P4 picks up F4: it has both forks and **eats**.",
      "edgeColors": [
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "red"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F3",
          "color": "red"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        },
        {
          "from": "P4",
          "to": "F4",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P1",
          "color": "orange"
        },
        {
          "id": "P2",
          "color": "red"
        },
        {
          "id": "P3",
          "color": "red"
        },
        {
          "id": "P4",
          "color": "green"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F4",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:1 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P1 wants F1, but P2 has it. P1 waits holding F0.",
      "edgeColors": [
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F1",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "red"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F3",
          "color": "red"
        },
        {
          "from": "P4",
          "to": "F3",
          "color": "green"
        },
        {
          "from": "P4",
          "to": "F4",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "red"
        },
        {
          "id": "P3",
          "color": "red"
        },
        {
          "id": "P4",
          "color": "green"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F4",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:1 P1:0 P2:0 P3:0 P4:0"
        ]
      ]
    },
    {
      "note": "P4 finishes eating and puts both forks down.",
      "edgeColors": [
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F1",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "red"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F3",
          "color": "red"
        }
      ],
      "nodeColors": [
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "red"
        },
        {
          "id": "P3",
          "color": "red"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:1 P1:0 P2:0 P3:0 P4:1"
        ]
      ]
    },
    {
      "note": "P3 picks up F3: it has both forks and **eats**.",
      "edgeColors": [
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F1",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "red"
        },
        {
          "from": "P3",
          "to": "F2",
          "color": "green"
        },
        {
          "from": "P3",
          "to": "F3",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "red"
        },
        {
          "id": "P3",
          "color": "green"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F3",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:1 P1:0 P2:0 P3:0 P4:1"
        ]
      ]
    },
    {
      "note": "P3 finishes eating and puts both forks down.",
      "edgeColors": [
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F1",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "red"
        }
      ],
      "nodeColors": [
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "red"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:1 P1:0 P2:0 P3:1 P4:1"
        ]
      ]
    },
    {
      "note": "P2 picks up F2: it has both forks and **eats**.",
      "edgeColors": [
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F1",
          "color": "red"
        },
        {
          "from": "P2",
          "to": "F1",
          "color": "green"
        },
        {
          "from": "P2",
          "to": "F2",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "P2",
          "color": "green"
        },
        {
          "id": "F1",
          "color": "purple"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F2",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:1 P1:0 P2:0 P3:1 P4:1"
        ]
      ]
    },
    {
      "note": "P2 finishes eating and puts both forks down.",
      "edgeColors": [
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F1",
          "color": "red"
        }
      ],
      "nodeColors": [
        {
          "id": "P1",
          "color": "red"
        },
        {
          "id": "F0",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:1 P1:0 P2:1 P3:1 P4:1"
        ]
      ]
    },
    {
      "note": "P1 picks up F1: it has both forks and **eats**.",
      "edgeColors": [
        {
          "from": "P1",
          "to": "F0",
          "color": "green"
        },
        {
          "from": "P1",
          "to": "F1",
          "color": "green"
        }
      ],
      "nodeColors": [
        {
          "id": "P1",
          "color": "green"
        },
        {
          "id": "F0",
          "color": "purple"
        },
        {
          "id": "F1",
          "color": "purple"
        }
      ],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:1 P1:0 P2:1 P3:1 P4:1"
        ]
      ]
    },
    {
      "note": "P1 finishes eating and puts both forks down.",
      "edgeColors": [],
      "nodeColors": [],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:1 P1:1 P2:1 P3:1 P4:1"
        ]
      ]
    },
    {
      "note": "Everyone ate. With a global fork order a cycle is impossible: each philosopher waits only for a fork numbered higher than the one it holds, and numbers cannot keep increasing all the way around a circle.",
      "edgeColors": [],
      "nodeColors": [],
      "vars": [
        [
          "rule",
          "lower-numbered fork first"
        ],
        [
          "meals",
          "P0:1 P1:1 P2:1 P3:1 P4:1"
        ]
      ]
    }
  ]
},
        {
          type: 'p',
          text: 'The fix breaks circular wait by **numbering the forks and always taking the lower number first**. Four philosophers behave as before, but the one between fork 4 and fork 0 now reaches for fork 0 first and so cannot complete the cycle. The same idea in C++:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'philosophers.cpp',
          code: `#include <algorithm>
#include <array>
#include <iostream>
#include <mutex>
#include <thread>
#include <vector>

constexpr int kSeats = 5;
std::array<std::mutex, kSeats> forks;
std::array<int, kSeats> meals{};

void dine(int seat, int servings) {
    int left = (seat + kSeats - 1) % kSeats;
    int right = seat;
    int first = std::min(left, right);   // global order:
    int second = std::max(left, right);  // lower number first
    for (int i = 0; i < servings; ++i) {
        std::lock_guard a{forks[first]};
        std::lock_guard b{forks[second]};
        ++meals[seat];                   // eat
    }
}

int main() {
    {
        std::vector<std::jthread> table;
        for (int s = 0; s < kSeats; ++s) {
            table.emplace_back(dine, s, 10000);
        }
    }
    for (int s = 0; s < kSeats; ++s) {
        std::cout << "P" << s << " ate " << meals[s] << " times\\n";
    }
}`,
          output: 'P0 ate 10000 times\nP1 ate 10000 times\nP2 ate 10000 times\nP3 ate 10000 times\nP4 ate 10000 times',
          annotations: [
            { lines: '13-14', text: 'Fork *i* lies between philosopher *i* and *i* + 1, so philosopher *s* uses forks *s* − 1 and *s* (wrapping around for seat 0).' },
            { lines: '15-16', text: 'The whole fix: lock in increasing fork number. For seats 1 to 4 that is left then right; for seat 0 it is fork 0 (right) before fork 4 (left).' },
            { lines: 20, text: 'Each philosopher writes only its own counter, and `main` reads them after every thread has joined.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Other fixes',
          text: 'You could also lock both forks in one step with `std::scoped_lock both{forks[left], forks[right]};`, which removes hold-and-wait by never holding one fork while blocked on the other. Or seat at most four philosophers at once with a `std::counting_semaphore<4>`, the "waiter" solution: with one empty chair the cycle cannot close. Each fix attacks a different Coffman condition.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'numeric',
      prompt: 'With five philosophers and five forks, what is the **largest** number of philosophers that can be eating at the same moment?',
      answer: 2,
      unit: 'philosophers',
      hint: 'Each eater holds two forks, and neighbours share a fork.',
      explanation:
        'Each eating philosopher holds two of the five forks, so at most ⌊5 / 2⌋ = **2** can eat at once, and they must not be neighbours (for example P0 and P2). That is also why ordered acquisition costs almost nothing here: even a perfect schedule only ever runs two philosophers in parallel. In engine terms, the maximum parallelism is limited by the shared resources, not by the number of threads.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Prevention: make one condition impossible',
      blocks: [
        {
          type: 'table',
          headers: ['Break…', 'How', 'Cost'],
          rows: [
            ['**Circular wait**', 'A global lock order: by level ("world before actor"), by ID, or by address', 'Discipline across the whole codebase; easiest to check'],
            ['**Hold and wait**', 'Acquire all locks at once (`std::scoped_lock`), or release everything before blocking', 'You must know every lock you need up front'],
            ['**No preemption**', '`try_lock`; on failure release what you hold and retry', 'Wasted work, and risk of livelock'],
            ['**Mutual exclusion**', 'Lock-free data structures, immutable data, per-thread copies', 'Hard to write; only for specific structures'],
          ],
        },
        {
          type: 'p',
          text: 'A lock order only helps if people follow it, so large codebases make it checkable. A [[lock-hierarchy|hierarchical mutex]] gives every lock a level and refuses to lock a level that is not lower than the one the thread already holds. Here it is as a lock type that `std::lock_guard` can use:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'hierarchical_mutex.cpp',
          code: `#include <iostream>
#include <mutex>
#include <stdexcept>

class HierarchicalMutex {
public:
    explicit HierarchicalMutex(int level) : level_{level} {}
    void lock() {
        if (level_ >= current_) {
            throw std::logic_error("lock order violation");
        }
        m_.lock();
        previous_ = current_;
        current_ = level_;
    }
    void unlock() {
        current_ = previous_;
        m_.unlock();
    }
private:
    std::mutex m_;
    int level_;
    int previous_ = 0;
    static thread_local int current_;
};
thread_local int HierarchicalMutex::current_ = 1'000'000;

HierarchicalMutex worldLock{100};    // outer: take first
HierarchicalMutex actorLock{50};     // inner: take second

void goodUpdate() {
    std::lock_guard w{worldLock};
    std::lock_guard a{actorLock};    // 100 then 50: allowed
    std::cout << "good: world then actor\\n";
}

void badUpdate() {
    std::lock_guard a{actorLock};
    std::lock_guard w{worldLock};    // 50 then 100: refused
    std::cout << "never printed\\n";
}

int main() {
    goodUpdate();
    try {
        badUpdate();
    } catch (const std::logic_error& e) {
        std::cout << "bad: " << e.what() << '\\n';
    }
}`,
          output: 'good: world then actor\nbad: lock order violation',
          annotations: [
            { lines: '9-11', text: 'The check happens **before** blocking, so a wrong order is reported every time the code runs, even in a single-threaded test, instead of deadlocking once in a thousand runs.' },
            { lines: '13-14', text: 'Remember the level this thread held before (safe to store in the mutex, because only the owner touches it), then record the new, lower level.' },
            { lines: 24, text: 'Each thread has its own "lowest level I currently hold", starting above every real level.' },
            { lines: 39, text: 'Throws while `actorLock` is held. Stack unwinding destroys `a`, which unlocks `actorLock` and restores the thread\'s level.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'How std::scoped_lock avoids deadlock without an order',
          text: 'When you write `std::scoped_lock lock{a, b};`, the library uses the `std::lock` algorithm: lock one mutex, then `try_lock` the others; if any is busy, release everything held and start again, this time blocking first on the one that was busy. It never waits while holding another of the set, so hold-and-wait cannot form. It is ideal when one function needs a few locks at once, but it cannot help when the locks are taken in different functions at different times. That is where an order or hierarchy is needed.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Ordering by address',
          text: 'When the objects have no natural order (two arbitrary players, two inventory slots), order them by address: `if (&a > &b) std::swap(pa, pb);` before locking, comparing with `std::less<>` to be strictly portable. Every thread then locks any given pair in the same order.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'bug',
      prompt: 'The project rule is "always lock `sceneMutex` before `assetMutex`". The game occasionally freezes when a level streams in. Tap the line that breaks the rule.',
      code: `std::mutex sceneMutex;   // level 2: take first
std::mutex assetMutex;   // level 1: take second

void spawnEnemy(const Archetype& type) {
    std::lock_guard s{sceneMutex};
    std::lock_guard a{assetMutex};
    world.add(instantiate(assetDb.lookup(type)));
}

void onTextureStreamed(TextureId id) {
    std::lock_guard a{assetMutex};
    markResident(id);
    std::lock_guard s{sceneMutex};
    refreshMaterialsUsing(id);
}`,
      bugLines: [13],
      hint: 'Compare the order of the two lock_guards in each function.',
      explanation:
        '`onTextureStreamed` runs on the streaming thread and takes `assetMutex` first, then asks for `sceneMutex` while still holding it, the reverse of `spawnEnemy`. If the game thread is inside `spawnEnemy` holding `sceneMutex` at that moment, each waits for the other: a two-thread cycle. Fix it by releasing the asset lock before taking the scene lock (put lines 11–12 in their own block), or by taking both in the agreed order. A hierarchical mutex would have thrown on line 13 the first time it ran in any test.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Avoidance: the banker\'s algorithm',
      blocks: [
        {
          type: 'p',
          text: 'Prevention restricts how programs may request resources. **Avoidance** lets them request freely, but has the OS refuse (delay) any request that could lead to deadlock later. Dijkstra\'s **[[bankers-algorithm|banker\'s algorithm]]** needs each process to declare up front the *maximum* it will ever need of each resource type. A state is **safe** if there is some order in which every process could get its maximum and finish. A request is granted only if the state after granting it is still safe.',
        },
        {
          type: 'p',
          text: 'The safety check repeatedly looks for a process whose remaining need (maximum minus what it holds) fits in what is available, pretends it finishes and returns its resources, and repeats. This is the textbook example from Silberschatz: five processes and three resource types with 10, 5 and 7 instances.',
        },
        {
          type: 'code',
          runnable: true,
          title: 'bankers.cpp',
          code: `#include <array>
#include <iostream>
#include <vector>

constexpr int P = 5;   // processes
constexpr int R = 3;   // resource types A, B, C
using Row = std::array<int, R>;

bool fits(const Row& need, const Row& work) {
    for (int r = 0; r < R; ++r) {
        if (need[r] > work[r]) return false;
    }
    return true;
}

int main() {
    const std::array<Row, P> maxNeed{{
        {7, 5, 3}, {3, 2, 2}, {9, 0, 2}, {2, 2, 2}, {4, 3, 3}}};
    const std::array<Row, P> alloc{{
        {0, 1, 0}, {2, 0, 0}, {3, 0, 2}, {2, 1, 1}, {0, 0, 2}}};
    Row work{3, 3, 2};                       // available now

    std::array<bool, P> finished{};
    std::vector<int> order;
    bool progress = true;
    while (progress) {
        progress = false;
        for (int p = 0; p < P; ++p) {
            Row need;
            for (int r = 0; r < R; ++r) {
                need[r] = maxNeed[p][r] - alloc[p][r];
            }
            if (!finished[p] && fits(need, work)) {
                for (int r = 0; r < R; ++r) work[r] += alloc[p][r];
                finished[p] = true;
                order.push_back(p);
                progress = true;
            }
        }
    }
    if (order.size() == P) {
        std::cout << "safe; one safe order:";
        for (int p : order) std::cout << " P" << p;
        std::cout << '\\n';
    } else {
        std::cout << "unsafe\\n";
    }
}`,
          output: 'safe; one safe order: P1 P3 P4 P0 P2',
          annotations: [
            { lines: '17-20', text: 'Each process\'s declared maximum and what it holds now. The totals held are (7, 2, 5), so (3, 3, 2) of the (10, 5, 7) instances are free.' },
            { lines: '29-31', text: 'Need = maximum − allocated: what the process may still ask for. P1 needs (1, 2, 2), which fits in (3, 3, 2).' },
            { lines: '33-38', text: 'If its whole remaining need fits, the process could run to completion and release everything, so add its allocation back to `work`.' },
            { lines: 41, text: 'If every process could finish in some order, the state is safe. Any other state is *unsafe*: not necessarily deadlocked yet, but a sequence of requests exists that would deadlock it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why your OS does not do this',
          text: 'Avoidance needs every process to declare its maximum needs in advance, a fixed set of processes and resources, and a safety check on every request. A desktop OS has none of that: programs allocate locks and memory dynamically, and nobody knows a game\'s maximum mutex usage. Avoidance survives in specialised settings, such as some real-time and embedded systems with static task sets, and as a way of thinking about admission control ("do not start a job unless the memory budget can cover its worst case").',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'numeric',
      prompt: 'In the banker\'s example, the safe order starts with P1 and then P3. After both have finished and returned their allocations, how many instances of resource **B** are available?',
      answer: 4,
      unit: 'instances of B',
      hint: 'Start from the available (3, 3, 2) and add P1\'s and P3\'s allocations.',
      explanation:
        'Available starts at (3, 3, 2). P1 returns its allocation (2, 0, 0), giving (5, 3, 2). P3 returns (2, 1, 1), giving (7, 4, 3). So **4** instances of B are free. That is enough for P4, which needs (4, 3, 1), and then for P0, which needs (7, 4, 3), and finally for P2. Note that P0 had to wait: its need of 4 B was more than the 3 free at the start, so granting P0 first was impossible.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Detection and recovery',
      blocks: [
        {
          type: 'p',
          text: 'The third strategy is optimistic: let deadlocks happen, notice them, and recover. Detection is a cycle search in the wait-for graph. Because a thread blocked on a mutex waits for exactly one owner, following the arrows from any blocked thread either reaches a running thread (no deadlock) or comes back to a thread already visited (a cycle):',
        },
        {
          type: 'code',
          runnable: true,
          title: 'detect.cpp',
          code: `#include <iostream>
#include <map>
#include <string>
#include <vector>

// waitsFor[t] = the thread that owns the lock t is blocked on
std::map<std::string, std::string> waitsFor = {
    {"render", "loader"},   // render waits for a lock loader holds
    {"loader", "audio"},
    {"audio", "render"},
    {"physics", "render"},  // blocked, but not part of the cycle
};

std::vector<std::string> findCycle(const std::string& start) {
    std::vector<std::string> path;
    std::string t = start;
    while (waitsFor.count(t)) {
        for (std::size_t i = 0; i < path.size(); ++i) {
            if (path[i] == t) {           // seen before: a cycle
                auto first = path.begin() + static_cast<long>(i);
                return {first, path.end()};
            }
        }
        path.push_back(t);
        t = waitsFor[t];
    }
    return {};                            // chain ended: no cycle
}

int main() {
    for (const auto& [thread, owner] : waitsFor) {
        auto cycle = findCycle(thread);
        std::cout << thread << ": ";
        if (cycle.empty()) {
            std::cout << "no deadlock\\n";
        } else {
            bool inCycle = cycle.front() == thread;
            std::cout << (inCycle ? "in cycle" : "stuck behind");
            for (const auto& c : cycle) std::cout << ' ' << c;
            std::cout << '\\n';
        }
    }
}`,
          output: 'audio: in cycle audio render loader\nloader: in cycle loader audio render\nphysics: stuck behind render loader audio\nrender: in cycle render loader audio',
          annotations: [
            { lines: '7-12', text: 'A snapshot of who waits for whom. A real detector builds this from lock-owner records, for example a debug mutex wrapper that remembers its owner thread.' },
            { lines: '17-26', text: 'Follow the single outgoing edge until the chain ends (someone who is not blocked) or revisits a thread. Revisiting means a cycle.' },
            { lines: '37-38', text: '`physics` is blocked forever too, but it is a victim, not part of the cycle: breaking the cycle will free it.' },
          ],
        },
        {
          type: 'p',
          text: 'Once a deadlock is found, something has to give, which means removing a thread or a resource from the cycle:',
        },
        {
          type: 'list',
          items: [
            '**Kill** one or more threads or processes in the cycle (the OS\'s blunt option, and what you do by hand with Task Manager).',
            '**Roll back** a victim to an earlier checkpoint and retry it. Databases do exactly this: when two transactions deadlock, one is aborted with an error and the application retries it.',
            '**Preempt** a resource: take it away and give it to another thread. Only possible for resources whose state can be saved and restored.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Detectors you can use today',
          text: 'ThreadSanitizer (`-fsanitize=thread`) reports lock-order inversions it observes, even if the deadlock never actually happens in that run. The Linux kernel\'s **lockdep** does the same for kernel locks, recording every "held A while taking B" pair and flagging any pair seen in both orders. Windows Driver Verifier has a deadlock detection option for drivers. And game engines ship a **watchdog** thread that notices when the game thread has not finished a frame for several seconds and writes a crash dump with every thread\'s stack, which shows the cycle directly.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'ThreadSanitizer reports "lock-order-inversion (potential deadlock)" in a test run that completed normally. What does that mean?',
      options: [
        { text: 'Nothing to fix: the test passed, so the program cannot deadlock', why: 'Deadlocks depend on timing. A passing run only proves this particular interleaving was lucky.' },
        { text: 'Two mutexes were taken in opposite orders on different code paths, so some interleaving can deadlock', correct: true, why: 'The tool saw both "A then B" and "B then A". That alone creates a possible cycle, whether or not this run hit it.' },
        { text: 'A thread locked the same `std::mutex` twice', why: 'That is a different error (recursive locking of a non-recursive mutex) with its own report.' },
        { text: 'There was a data race on the mutex itself', why: 'Mutex operations are synchronized by design; the report is about the order of acquisitions, not unsynchronized access.' },
      ],
      explanation:
        'Order-based detectors are powerful precisely because they do not need the deadlock to happen: they look for the circular-wait condition in the pattern of acquisitions. Fix the inversion by choosing one order (or locking both together with `std::scoped_lock`) and the whole class of deadlock disappears, not just the instance you happened to see.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Livelock and starvation',
      blocks: [
        {
          type: 'p',
          text: 'Attacking "no preemption" with `try_lock` creates a new failure. Two threads each take their first lock, fail to get the second, politely release and retry, in perfect step, forever. Nobody is blocked; both are busy; nothing gets done. This is **[[livelock]]**, like two people in a corridor who keep stepping aside in the same direction.',
        },
        {
          type: 'code',
          code: `void transfer(Account& from, Account& to) {
    while (true) {
        std::unique_lock a{from.m};
        std::unique_lock b{to.m, std::try_to_lock};
        if (b.owns_lock()) {
            move(from, to);
            return;
        }
        a.unlock();                      // back off...
        std::this_thread::sleep_for(randomBackoff());
    }
}`,
          annotations: [
            { lines: 4, text: '`try_to_lock` attempts the lock without blocking. If the other thread holds it, `b` simply does not own it.' },
            { lines: 9, text: 'Releasing what we hold removes hold-and-wait: no deadlock is possible.' },
            { lines: 10, text: 'Without this line, two threads running the mirror-image transfer can collide on every retry. A **random** delay desynchronizes them, which is the same trick Ethernet uses after a collision. Better still: use `std::scoped_lock lock{from.m, to.m};`, which does this dance for you.' },
          ],
        },
        {
          type: 'p',
          text: '**[[starvation|Starvation]]** is the milder cousin: the system as a whole makes progress, but one thread never gets what it needs. Examples: an unfair spinlock that the same thread keeps winning, a reader-preferring readers–writer lock where a steady stream of readers keeps a writer out forever (next lesson), and a low-priority thread that never runs because higher-priority threads are always ready. Fair queuing (ticket locks, FIFO wait queues) and aging (raising the priority of threads that have waited long) are the standard cures; the scheduling unit\'s MLFQ priority boost is aging.',
        },
        {
          type: 'table',
          headers: ['Failure', 'Threads blocked?', 'CPU use', 'Progress'],
          rows: [
            ['Deadlock', 'Yes, all in the cycle', 'Near 0% for those threads', 'None, ever'],
            ['Livelock', 'No, all busy', 'High', 'None, while it lasts'],
            ['Starvation', 'The victim waits', 'Normal', 'Others progress; the victim does not'],
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'A server hangs. The profiler shows two threads each using 100% of a core, both looping inside the same transfer function, and the transfer count is not increasing. Which bug is it most likely?',
      options: [
        { text: 'Deadlock', why: 'Deadlocked threads are blocked in the kernel and use almost no CPU. These threads are busy.' },
        { text: 'Livelock', correct: true, why: 'Busy threads, repeating the same actions, with no progress: the signature of livelock, typically from symmetric try-lock-and-retry code.' },
        { text: 'Starvation', why: 'Starvation means some threads make progress while a victim does not. Here nobody progresses.' },
        { text: 'Priority inversion', why: 'Priority inversion delays a high-priority thread behind lower-priority work; it does not make two equal threads spin without progress.' },
      ],
      explanation:
        'CPU usage is the quickest way to tell a deadlock from a livelock: deadlocked threads sleep in the kernel, livelocked threads burn cycles. Fix livelock by breaking the symmetry (randomized back-off, or a fixed order so that one thread always wins) or by using `std::scoped_lock`.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'concept',
      title: 'Priority inversion and Mars Pathfinder',
      blocks: [
        {
          type: 'p',
          text: 'With a priority scheduler, the highest-priority ready thread always runs. Add a mutex and that rule can backfire. A low-priority thread L takes a mutex; a high-priority thread H blocks on it; and now a **medium**-priority thread M, which does not use the mutex at all, preempts L. While M runs, L cannot release the mutex, so H waits for M: the high-priority thread is effectively running at the lowest priority. This is [[priority-inversion]]. Step through it, then through the fix:',
        },
        {
  "type": "algo",
  "view": "array",
  "interval": 1300,
  "caption": "A CPU timeline, one cell per time slot. Red = H, orange = M, blue = L.",
  "frames": [
    {
      "note": "One CPU, fixed priorities: H (high) > M (medium) > L (low). L and H share a mutex; M never touches it. `*` marks a slot spent inside the critical section.",
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
        "·"
      ],
      "vars": [
        [
          "mode",
          "no priority inheritance"
        ]
      ]
    },
    {
      "note": "t = 0: L runs.",
      "array": [
        "L",
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
          "label": "t=0"
        }
      ],
      "vars": [
        [
          "mode",
          "no priority inheritance"
        ],
        [
          "mutex owner",
          "none"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 1: L locks the mutex. L runs.",
      "array": [
        "L",
        "L*",
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
          "index": 1,
          "label": "t=1"
        }
      ],
      "vars": [
        [
          "mode",
          "no priority inheritance"
        ],
        [
          "mutex owner",
          "L"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 2: H runs. H arrived and preempted L, which still holds the mutex.",
      "array": [
        "L",
        "L*",
        "H",
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
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "t=2"
        }
      ],
      "vars": [
        [
          "mode",
          "no priority inheritance"
        ],
        [
          "mutex owner",
          "L"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 3: H blocks on the mutex (held by L). M runs. H is blocked, so the highest-priority **ready** task is M.",
      "array": [
        "L",
        "L*",
        "H",
        "M",
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
          "color": "red"
        },
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
      "vars": [
        [
          "mode",
          "no priority inheritance"
        ],
        [
          "mutex owner",
          "L"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 4: M runs.",
      "array": [
        "L",
        "L*",
        "H",
        "M",
        "M",
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
          "color": "red"
        },
        {
          "index": 3,
          "color": "orange"
        },
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
      "vars": [
        [
          "mode",
          "no priority inheritance"
        ],
        [
          "mutex owner",
          "L"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 5: M runs.",
      "array": [
        "L",
        "L*",
        "H",
        "M",
        "M",
        "M",
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
          "color": "red"
        },
        {
          "index": 3,
          "color": "orange"
        },
        {
          "index": 4,
          "color": "orange"
        },
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
      "vars": [
        [
          "mode",
          "no priority inheritance"
        ],
        [
          "mutex owner",
          "L"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 6: M runs. M has delayed H for 4 slots without ever touching the mutex: **priority inversion**.",
      "array": [
        "L",
        "L*",
        "H",
        "M",
        "M",
        "M",
        "M",
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
          "color": "red"
        },
        {
          "index": 3,
          "color": "orange"
        },
        {
          "index": 4,
          "color": "orange"
        },
        {
          "index": 5,
          "color": "orange"
        },
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
      "vars": [
        [
          "mode",
          "no priority inheritance"
        ],
        [
          "mutex owner",
          "L"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 7: L runs.",
      "array": [
        "L",
        "L*",
        "H",
        "M",
        "M",
        "M",
        "M",
        "L*",
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
          "color": "red"
        },
        {
          "index": 3,
          "color": "orange"
        },
        {
          "index": 4,
          "color": "orange"
        },
        {
          "index": 5,
          "color": "orange"
        },
        {
          "index": 6,
          "color": "orange"
        },
        {
          "index": 7,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 7,
          "label": "t=7"
        }
      ],
      "vars": [
        [
          "mode",
          "no priority inheritance"
        ],
        [
          "mutex owner",
          "L"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 8: L runs.",
      "array": [
        "L",
        "L*",
        "H",
        "M",
        "M",
        "M",
        "M",
        "L*",
        "L*",
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
          "color": "red"
        },
        {
          "index": 3,
          "color": "orange"
        },
        {
          "index": 4,
          "color": "orange"
        },
        {
          "index": 5,
          "color": "orange"
        },
        {
          "index": 6,
          "color": "orange"
        },
        {
          "index": 7,
          "color": "blue"
        },
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
      "vars": [
        [
          "mode",
          "no priority inheritance"
        ],
        [
          "mutex owner",
          "L"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 9: L unlocks; H wakes and gets the mutex. H runs.",
      "array": [
        "L",
        "L*",
        "H",
        "M",
        "M",
        "M",
        "M",
        "L*",
        "L*",
        "H*",
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
          "color": "red"
        },
        {
          "index": 3,
          "color": "orange"
        },
        {
          "index": 4,
          "color": "orange"
        },
        {
          "index": 5,
          "color": "orange"
        },
        {
          "index": 6,
          "color": "orange"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 9,
          "label": "t=9"
        }
      ],
      "vars": [
        [
          "mode",
          "no priority inheritance"
        ],
        [
          "mutex owner",
          "H"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 10: H unlocks. H runs.",
      "array": [
        "L",
        "L*",
        "H",
        "M",
        "M",
        "M",
        "M",
        "L*",
        "L*",
        "H*",
        "H",
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
          "color": "red"
        },
        {
          "index": 3,
          "color": "orange"
        },
        {
          "index": 4,
          "color": "orange"
        },
        {
          "index": 5,
          "color": "orange"
        },
        {
          "index": 6,
          "color": "orange"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "red"
        },
        {
          "index": 10,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 10,
          "label": "t=10"
        }
      ],
      "vars": [
        [
          "mode",
          "no priority inheritance"
        ],
        [
          "mutex owner",
          "none"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 11: L runs.",
      "array": [
        "L",
        "L*",
        "H",
        "M",
        "M",
        "M",
        "M",
        "L*",
        "L*",
        "H*",
        "H",
        "L"
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
          "color": "red"
        },
        {
          "index": 3,
          "color": "orange"
        },
        {
          "index": 4,
          "color": "orange"
        },
        {
          "index": 5,
          "color": "orange"
        },
        {
          "index": 6,
          "color": "orange"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "red"
        },
        {
          "index": 10,
          "color": "red"
        },
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
      "vars": [
        [
          "mode",
          "no priority inheritance"
        ],
        [
          "mutex owner",
          "none"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "H finished at time 11 although its own work takes only 3 slots. Its delay depended on M, an unrelated task.",
      "array": [
        "L",
        "L*",
        "H",
        "M",
        "M",
        "M",
        "M",
        "L*",
        "L*",
        "H*",
        "H",
        "L"
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
          "color": "red"
        },
        {
          "index": 3,
          "color": "orange"
        },
        {
          "index": 4,
          "color": "orange"
        },
        {
          "index": 5,
          "color": "orange"
        },
        {
          "index": 6,
          "color": "orange"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "red"
        },
        {
          "index": 10,
          "color": "red"
        },
        {
          "index": 11,
          "color": "blue"
        }
      ],
      "vars": [
        [
          "mode",
          "no priority inheritance"
        ],
        [
          "H done at",
          "11"
        ],
        [
          "M done at",
          "7"
        ],
        [
          "L done at",
          "12"
        ]
      ]
    },
    {
      "note": "**Now replay with priority inheritance** on the mutex.",
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
        "·"
      ],
      "vars": [
        [
          "mode",
          "with priority inheritance"
        ]
      ]
    },
    {
      "note": "t = 0: L runs.",
      "array": [
        "L",
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
          "label": "t=0"
        }
      ],
      "vars": [
        [
          "mode",
          "with priority inheritance"
        ],
        [
          "mutex owner",
          "none"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 1: L locks the mutex. L runs.",
      "array": [
        "L",
        "L*",
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
          "index": 1,
          "label": "t=1"
        }
      ],
      "vars": [
        [
          "mode",
          "with priority inheritance"
        ],
        [
          "mutex owner",
          "L"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 2: H runs. H arrived and preempted L, which still holds the mutex.",
      "array": [
        "L",
        "L*",
        "H",
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
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "t=2"
        }
      ],
      "vars": [
        [
          "mode",
          "with priority inheritance"
        ],
        [
          "mutex owner",
          "L"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 3: H blocks on the mutex (held by L); L inherits priority 3. L runs. L now runs at H's priority, so M cannot preempt it.",
      "array": [
        "L",
        "L*",
        "H",
        "L*",
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
          "color": "red"
        },
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
      "vars": [
        [
          "mode",
          "with priority inheritance"
        ],
        [
          "mutex owner",
          "L"
        ],
        [
          "effective priority",
          "H=3, M=2, L=3"
        ]
      ]
    },
    {
      "note": "t = 4: L runs.",
      "array": [
        "L",
        "L*",
        "H",
        "L*",
        "L*",
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
          "color": "red"
        },
        {
          "index": 3,
          "color": "blue"
        },
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
      "vars": [
        [
          "mode",
          "with priority inheritance"
        ],
        [
          "mutex owner",
          "L"
        ],
        [
          "effective priority",
          "H=3, M=2, L=3"
        ]
      ]
    },
    {
      "note": "t = 5: L unlocks; H wakes and gets the mutex. H runs.",
      "array": [
        "L",
        "L*",
        "H",
        "L*",
        "L*",
        "H*",
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
          "color": "red"
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
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 5,
          "label": "t=5"
        }
      ],
      "vars": [
        [
          "mode",
          "with priority inheritance"
        ],
        [
          "mutex owner",
          "H"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 6: H unlocks. H runs.",
      "array": [
        "L",
        "L*",
        "H",
        "L*",
        "L*",
        "H*",
        "H",
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
          "color": "red"
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
          "color": "red"
        },
        {
          "index": 6,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 6,
          "label": "t=6"
        }
      ],
      "vars": [
        [
          "mode",
          "with priority inheritance"
        ],
        [
          "mutex owner",
          "none"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 7: M runs.",
      "array": [
        "L",
        "L*",
        "H",
        "L*",
        "L*",
        "H*",
        "H",
        "M",
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
          "color": "red"
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
          "color": "red"
        },
        {
          "index": 6,
          "color": "red"
        },
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
      "vars": [
        [
          "mode",
          "with priority inheritance"
        ],
        [
          "mutex owner",
          "none"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 8: M runs.",
      "array": [
        "L",
        "L*",
        "H",
        "L*",
        "L*",
        "H*",
        "H",
        "M",
        "M",
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
          "color": "red"
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
          "color": "red"
        },
        {
          "index": 6,
          "color": "red"
        },
        {
          "index": 7,
          "color": "orange"
        },
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
      "vars": [
        [
          "mode",
          "with priority inheritance"
        ],
        [
          "mutex owner",
          "none"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 9: M runs.",
      "array": [
        "L",
        "L*",
        "H",
        "L*",
        "L*",
        "H*",
        "H",
        "M",
        "M",
        "M",
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
          "color": "red"
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
          "color": "red"
        },
        {
          "index": 6,
          "color": "red"
        },
        {
          "index": 7,
          "color": "orange"
        },
        {
          "index": 8,
          "color": "orange"
        },
        {
          "index": 9,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 9,
          "label": "t=9"
        }
      ],
      "vars": [
        [
          "mode",
          "with priority inheritance"
        ],
        [
          "mutex owner",
          "none"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 10: M runs.",
      "array": [
        "L",
        "L*",
        "H",
        "L*",
        "L*",
        "H*",
        "H",
        "M",
        "M",
        "M",
        "M",
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
          "color": "red"
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
          "color": "red"
        },
        {
          "index": 6,
          "color": "red"
        },
        {
          "index": 7,
          "color": "orange"
        },
        {
          "index": 8,
          "color": "orange"
        },
        {
          "index": 9,
          "color": "orange"
        },
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
      "vars": [
        [
          "mode",
          "with priority inheritance"
        ],
        [
          "mutex owner",
          "none"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "t = 11: L runs.",
      "array": [
        "L",
        "L*",
        "H",
        "L*",
        "L*",
        "H*",
        "H",
        "M",
        "M",
        "M",
        "M",
        "L"
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
          "color": "red"
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
          "color": "red"
        },
        {
          "index": 6,
          "color": "red"
        },
        {
          "index": 7,
          "color": "orange"
        },
        {
          "index": 8,
          "color": "orange"
        },
        {
          "index": 9,
          "color": "orange"
        },
        {
          "index": 10,
          "color": "orange"
        },
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
      "vars": [
        [
          "mode",
          "with priority inheritance"
        ],
        [
          "mutex owner",
          "none"
        ],
        [
          "effective priority",
          "H=3, M=2, L=1"
        ]
      ]
    },
    {
      "note": "H finished at time 7 instead of 11: it waited only for the rest of L's critical section.",
      "array": [
        "L",
        "L*",
        "H",
        "L*",
        "L*",
        "H*",
        "H",
        "M",
        "M",
        "M",
        "M",
        "L"
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
          "color": "red"
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
          "color": "red"
        },
        {
          "index": 6,
          "color": "red"
        },
        {
          "index": 7,
          "color": "orange"
        },
        {
          "index": 8,
          "color": "orange"
        },
        {
          "index": 9,
          "color": "orange"
        },
        {
          "index": 10,
          "color": "orange"
        },
        {
          "index": 11,
          "color": "blue"
        }
      ],
      "vars": [
        [
          "mode",
          "with priority inheritance"
        ],
        [
          "H done at",
          "7"
        ],
        [
          "M done at",
          "11"
        ],
        [
          "L done at",
          "12"
        ]
      ]
    }
  ]
},
        {
          type: 'p',
          text: 'The fix shown in the second half is **[[priority-inheritance|priority inheritance]]**: while a thread holds a mutex that a higher-priority thread is waiting for, it temporarily runs at the waiter\'s priority, so medium-priority work cannot preempt it. An alternative is the **priority ceiling** protocol: a mutex has a ceiling equal to the highest priority of any thread that uses it, and whoever holds it runs at that ceiling.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Mars Pathfinder, 1997',
          text: 'A few days after landing on Mars on 4 July 1997, NASA\'s Pathfinder lander began resetting itself. Its VxWorks real-time OS ran a high-priority task that managed the spacecraft\'s information bus, a low-priority meteorological task that occasionally published data through the bus under a shared mutex, and a medium-priority communications task. When the communications task ran while the weather task held the mutex, the bus task was blocked too long; a watchdog noticed it had not completed its cycle and, treating that as a fatal fault, reset the whole computer. Engineers at JPL reproduced it on a replica on the ground. The mutex had been created with priority inheritance **off**. They uploaded a small patch that switched it on, and the resets stopped.',
        },
        {
          type: 'list',
          items: [
            'POSIX: create the mutex with `pthread_mutexattr_setprotocol(&attr, PTHREAD_PRIO_INHERIT)` (or `PTHREAD_PRIO_PROTECT` for a ceiling). Linux implements this with priority-inheritance futexes.',
            'Windows does not do priority inheritance for its locks. Instead, its scheduler periodically gives threads that have been ready but starved for about four seconds a temporary boost, which eventually lets a starved lock holder run.',
            'Games: the audio mixer thread usually runs at raised priority with a hard deadline every few milliseconds. If it takes a lock that a normal-priority thread holds, a priority inversion becomes an audible glitch. Audio code therefore avoids locks entirely and talks to the game through lock-free queues (next lesson).',
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Why real-time systems care most',
          text: 'In a [[real-time-system|hard real-time system]] (flight control, weapons systems, a car\'s brakes), meeting deadlines is part of correctness, and the schedulability analysis that proves deadlines are met assumes a high-priority task is delayed at most by the critical sections it shares. Unbounded priority inversion breaks that proof. This is why safety-critical RTOS configurations require inheritance or ceiling protocols on every shared mutex.',
        },
      ],
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'mcq',
      prompt: 'What actually fixed the resets on Mars Pathfinder?',
      options: [
        { text: 'Raising the priority of the communications task above the bus task', why: 'That would have made the bus task wait even longer. The medium-priority task was the one causing the delay.' },
        { text: 'Turning on priority inheritance for the mutex, so the low-priority task holding it ran at the bus task\'s priority', correct: true, why: 'With inheritance, the medium-priority task could no longer preempt the mutex holder, so the high-priority task waited only for the short critical section.' },
        { text: 'Disabling the watchdog timer', why: 'The watchdog was doing its job: it detected that the bus task missed its deadline. Silencing it would have hidden the problem, not fixed it.' },
        { text: 'Replacing the mutex with a spinlock', why: 'On a single processor a spinning high-priority task would never let the low-priority holder run at all: a worse hang.' },
      ],
      explanation:
        'Priority inversion is a scheduling problem created by a synchronization primitive. Inheritance makes the scheduler aware of who is blocking whom. The episode is also a lesson in debuggability: JPL could diagnose it because VxWorks could record a detailed trace, and fix it remotely because the system could be patched in flight.',
    },
    // ------------------------------------------------------------------ 17
    {
      kind: 'concept',
      title: 'Beyond deadlock: atomicity and order violations',
      blocks: [
        {
          type: 'p',
          text: 'Deadlocks are dramatic, but they are not the most common concurrency bug. Lu and colleagues studied 105 real concurrency bugs in MySQL, Apache, Mozilla and OpenOffice (ASPLOS 2008). 74 were **not** deadlocks, and of those, **97%** fell into two simple categories:',
        },
        {
          type: 'list',
          items: [
            '**[[atomicity-violation|Atomicity violation]]**: code assumes a sequence of operations is indivisible, but another thread can interleave. "Check the pointer is not null, then use it" with another thread nulling it in between. The `Inventory` count-then-add bug from the locks lesson is one.',
            '**Order violation**: code assumes A happens before B in another thread, but nothing enforces it. A thread reads a field its creator has not initialized yet, or the main thread uses a result before the worker has produced it.',
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Atomicity violation',
            tone: 'bad',
            code: `// thread 1
if (player->weapon) {
    // thread 2 runs: player->weapon = nullptr;
    player->weapon->fire();   // crash
}`,
            text: 'Fix: hold one lock across the check and the use, or copy the pointer (a `std::shared_ptr` copy) under the lock and use the copy.',
          },
          right: {
            title: 'Order violation',
            tone: 'bad',
            code: `// main thread
startWorker();          // worker reads config
config = loadConfig();  // ...maybe after this
`,
            text: 'Fix: make the order explicit: initialize before starting the thread (thread creation is a synchronization point), or have the reader wait on a latch, future or condition variable.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why these two dominate',
          text: 'Both come from the same mistake: reasoning about one thread\'s code as if it ran alone. Atomicity violations happen when you forget that "between my lines" other threads run; order violations when you forget that "before my line" in another thread is not guaranteed. Locks fix the first, and waiting primitives (joins, latches, futures, condition variables) fix the second. The tools for both are the ones you now have.',
        },
      ],
    },
    // ------------------------------------------------------------------ 18
    {
      kind: 'bug',
      prompt: '`AudioStreamer` starts its worker thread in the constructor. Occasionally the worker crashes on its first iteration with a garbage `buffer_`. Tap the line responsible.',
      code: `class AudioStreamer {
public:
    explicit AudioStreamer(std::size_t frames)
        : buffer_(frames) {}
private:
    void pump(std::stop_token stop) {
        while (!stop.stop_requested()) {
            fill(buffer_.data(), buffer_.size());
        }
    }
    std::jthread worker_{[this](std::stop_token s) { pump(s); }};
    std::vector<float> buffer_;
};`,
      bugLines: [11],
      hint: 'Members are initialized in the order they are declared, not the order in the initializer list.',
      explanation:
        'An **order violation**. `worker_` is declared before `buffer_`, so it is constructed first, and its thread can start running `pump` before `buffer_` has been constructed. Reading the vector then is undefined behavior. Destruction is also backwards: `buffer_` is destroyed before `worker_` stops and joins, so the thread can touch a dead vector at shutdown. Declare `worker_` **last** (members are constructed in declaration order and destroyed in reverse), so the thread starts after everything it uses exists and is joined before any of it is destroyed. GCC\'s `-Wreorder` warns when an initializer list is out of declaration order, but it cannot catch this case, where the thread is started from a default member initializer.',
    },
  ],
  takeaways: [
    'Deadlock needs mutual exclusion, hold and wait, no preemption and circular wait; break any one and it cannot happen.',
    'In a resource allocation graph with single-instance resources (mutexes), a cycle is a deadlock; with multiple instances it is only a warning sign.',
    'Prevention in practice means a global lock order (by level, ID or address), checkable with a hierarchical mutex, plus `std::scoped_lock` when one function needs several locks.',
    'The banker\'s algorithm avoids unsafe states but needs maximum demands in advance, so general-purpose OSes do not use it.',
    'Detection follows wait-for edges to find cycles; recovery kills, rolls back or preempts. TSan, lockdep and engine watchdogs make detection practical.',
    'Livelock burns CPU without progress, starvation leaves one thread behind, and priority inversion lets medium-priority work delay high-priority work; priority inheritance fixed Mars Pathfinder.',
    'Most non-deadlock bugs are atomicity violations (lock the whole operation) or order violations (wait explicitly for the event you depend on).',
  ],
  reading: [
    {
      title: 'Operating Systems: Three Easy Pieces, "Common Concurrency Problems"',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf',
      source: 'book',
      note: 'The Lu et al. bug study, atomicity and order violations, and deadlock prevention, avoidance and detection.',
    },
    {
      title: 'Deadlock (computer science)',
      url: 'https://en.wikipedia.org/wiki/Deadlock_(computer_science)',
      source: 'article',
      note: 'The Coffman conditions and the classic handling strategies, with references.',
    },
    {
      title: 'Banker\'s algorithm',
      url: 'https://en.wikipedia.org/wiki/Banker%27s_algorithm',
      source: 'article',
      note: 'The full request-granting algorithm, not just the safety check, with a worked example.',
    },
    {
      title: 'Priority inversion',
      url: 'https://en.wikipedia.org/wiki/Priority_inversion',
      source: 'article',
      note: 'Inheritance versus ceiling protocols, and a summary of the Mars Pathfinder incident.',
    },
    {
      title: 'std::scoped_lock',
      url: 'https://en.cppreference.com/w/cpp/thread/scoped_lock',
      source: 'cppreference',
      note: 'Locking several mutexes at once with the deadlock-avoiding `std::lock` algorithm.',
    },
  ],
};
