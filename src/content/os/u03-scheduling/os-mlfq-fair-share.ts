import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-mlfq-fair-share',
  title: 'MLFQ and Fair-Share Scheduling',
  summary:
    'How real schedulers cope without knowing job lengths: the multi-level feedback queue and its five rules, lottery and stride scheduling, Linux CFS and its successor EEVDF, and Windows\' priority classes and boosts.',
  minutes: 22,
  objectives: [
    'State the five MLFQ rules and explain which problem each one solves, including starvation and gaming the scheduler',
    'Simulate MLFQ in C++ and show why allotment must be counted across blocking',
    'Explain proportional-share scheduling with lottery tickets and deterministic stride scheduling',
    'Compute CPU shares from Linux nice values and explain how CFS uses vruntime',
    'Explain how EEVDF (Linux 6.6 and later) separates latency from CPU share using lag and virtual deadlines',
    'Describe Windows\' priority classes, dynamic boosts and quantum stretching at a high level',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Learning from the past: the MLFQ idea',
      blocks: [
        {
          type: 'p',
          text: 'The last lesson ended with a dilemma. STCF gives the best turnaround but needs to know each job\'s length; round robin gives great response time but terrible turnaround. The **[[mlfq|multi-level feedback queue]] (MLFQ)**, first used in MIT\'s CTSS in 1962 (work that earned Fernando Corbató a Turing Award), gets close to both by *observing* jobs and predicting their future from their past.',
        },
        {
          type: 'p',
          text: 'MLFQ keeps several ready queues, each with a priority. A job is in exactly one queue at a time, and the first two rules decide who runs:',
        },
        {
          type: 'list',
          items: [
            '**Rule 1:** if Priority(A) > Priority(B), A runs and B does not.',
            '**Rule 2:** if Priority(A) = Priority(B), A and B run in round robin, using that queue\'s [[time-slice]].',
          ],
        },
        {
          type: 'p',
          text: 'The "feedback" is how priorities change. A job that keeps giving up the CPU before its slice ends (waiting for a key press, a packet, the disk) looks **interactive** and should stay high. A job that burns through whole slices looks **CPU-bound** and should sink. The first attempt at encoding this:',
        },
        {
          type: 'list',
          items: [
            '**Rule 3:** a new job enters at the highest priority.',
            '**Rule 4a:** if a job uses up its whole slice, its priority drops one level.',
            '**Rule 4b:** if a job gives up the CPU before its slice ends, it stays at the same level.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why start everyone at the top?',
          text: 'Rule 3 is a bet that every new job is short. If it is, it finishes quickly at high priority, which is just what SJF would do. If it is not, Rule 4a demotes it slice by slice until it reaches the bottom, where long jobs share the CPU among themselves. MLFQ never knows run times; it *discovers* them, and it pays for a wrong guess with only a few slices.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'Under rules 1 to 4b, a long CPU-bound job has sunk to the lowest queue. A short job that needs only a third of one top-level slice arrives. What happens?',
      options: [
        {
          text: 'The new job enters the top queue, preempts the long job and finishes within its first slice',
          correct: true,
          why: 'Rule 3 puts it at the top, Rule 1 makes it run ahead of anything lower, and it completes before its slice ends, never being demoted. That is SJF-like behaviour without knowing its length.',
        },
        {
          text: 'The new job waits until the long job\'s slice in the bottom queue ends',
          why: 'Rule 1 is preemptive in practice: when a higher-priority job becomes ready, the lower one is switched out, just as STCF preempts on arrival.',
        },
        {
          text: 'The new job starts in the bottom queue because the scheduler cannot know it is short',
          why: 'Not knowing is exactly why MLFQ starts every job at the top and lets behaviour push it down.',
        },
        {
          text: 'Both jobs round-robin in the bottom queue',
          why: 'Rule 2 only applies to jobs at the same priority. The new job is several levels higher.',
        },
      ],
      explanation:
        'MLFQ approximates SJF by assuming new jobs are short and correcting the guess over time. A short job never lives long enough to be corrected.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Three problems and two fixes',
      blocks: [
        {
          type: 'p',
          text: 'Rules 1 to 4b work beautifully on paper and fail in three ways in practice:',
        },
        {
          type: 'list',
          items: [
            '**Starvation:** if there are enough interactive jobs, they consume all the CPU and long jobs at the bottom never run.',
            '**Changing behaviour:** a job that was CPU-bound (loading a level) and becomes interactive (now waiting for input) is stuck at the bottom forever.',
            '**Gaming the scheduler:** under Rule 4b, a program can issue a pointless I/O just before its slice ends, keep its top priority, and take almost the whole machine.',
          ],
        },
        {
          type: 'p',
          text: 'The first two are fixed by one rule, the third by rewriting Rule 4:',
        },
        {
          type: 'list',
          items: [
            '**Rule 4:** once a job uses up its **time allotment** at a level, *regardless of how many times it has given up the CPU*, its priority drops.',
            '**Rule 5:** after some period S, move every job back to the top queue (a **priority boost**).',
          ],
        },
        {
          type: 'p',
          text: 'Step through all five rules at work. A is CPU-bound, B is interactive (1 unit of CPU, then 2 units of I/O, forever), and C is a short batch job:',
        },
        {
  "type": "algo",
  "view": "graph",
  "width": 400,
  "height": 250,
  "nodes": [
    {
      "id": "Q2",
      "x": 52,
      "y": 52,
      "label": "Q2"
    },
    {
      "id": "Q1",
      "x": 52,
      "y": 127,
      "label": "Q1"
    },
    {
      "id": "Q0",
      "x": 52,
      "y": 202,
      "label": "Q0"
    },
    {
      "id": "A2",
      "x": 150,
      "y": 52,
      "label": "A"
    },
    {
      "id": "A1",
      "x": 150,
      "y": 127,
      "label": "A"
    },
    {
      "id": "A0",
      "x": 150,
      "y": 202,
      "label": "A"
    },
    {
      "id": "B2",
      "x": 240,
      "y": 52,
      "label": "B"
    },
    {
      "id": "B1",
      "x": 240,
      "y": 127,
      "label": "B"
    },
    {
      "id": "B0",
      "x": 240,
      "y": 202,
      "label": "B"
    },
    {
      "id": "C2",
      "x": 330,
      "y": 52,
      "label": "C"
    },
    {
      "id": "C1",
      "x": 330,
      "y": 127,
      "label": "C"
    },
    {
      "id": "C0",
      "x": 330,
      "y": 202,
      "label": "C"
    }
  ],
  "edges": [],
  "interval": 1700,
  "frames": [
    {
      "note": "Three queues: Q2 is the highest priority. Allotments: 2 units in Q2, 4 in Q1, unlimited in Q0. The note under a job is the allotment it has used.",
      "hidden": [
        "A2",
        "A1",
        "A0",
        "B2",
        "B1",
        "B0",
        "C2",
        "C1",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        }
      ],
      "nodeNotes": []
    },
    {
      "note": "t = 0: A arrives and enters Q2 (rule 3). A runs in Q2.",
      "hidden": [
        "A1",
        "A0",
        "B2",
        "B1",
        "B0",
        "C2",
        "C1",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A2",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "A2",
          "text": "1/2"
        }
      ]
    },
    {
      "note": "t = 1: A runs one unit. A has used its whole Q2 allotment, so it drops to Q1 (rule 4).",
      "hidden": [
        "A2",
        "A0",
        "B2",
        "B1",
        "B0",
        "C2",
        "C1",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A1",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "A1",
          "text": "0/4"
        }
      ]
    },
    {
      "note": "t = 2 to 4: A runs in Q1, the highest non-empty queue (rule 1).",
      "hidden": [
        "A2",
        "A0",
        "B2",
        "B1",
        "B0",
        "C2",
        "C1",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A1",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "A1",
          "text": "3/4"
        }
      ]
    },
    {
      "note": "t = 5: A runs one unit. A has used its whole Q1 allotment, so it drops to Q0 (rule 4).",
      "hidden": [
        "A2",
        "A1",
        "B2",
        "B1",
        "B0",
        "C2",
        "C1",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A0",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "A0",
          "text": "0/∞"
        }
      ]
    },
    {
      "note": "t = 6: B arrives and enters Q2 (rule 3). B runs one unit. B issues I/O and blocks; the allotment it used still counts.",
      "hidden": [
        "A2",
        "A1",
        "B1",
        "B0",
        "C2",
        "C1",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A0",
          "color": "blue"
        },
        {
          "id": "B2",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "A0",
          "text": "0/∞"
        },
        {
          "id": "B2",
          "text": "I/O"
        }
      ]
    },
    {
      "note": "t = 7 to 8: A runs in Q0, the highest non-empty queue (rule 1).",
      "hidden": [
        "A2",
        "A1",
        "B1",
        "B0",
        "C2",
        "C1",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A0",
          "color": "orange"
        },
        {
          "id": "B2",
          "color": "gray"
        }
      ],
      "nodeNotes": [
        {
          "id": "A0",
          "text": "2/∞"
        },
        {
          "id": "B2",
          "text": "I/O"
        }
      ]
    },
    {
      "note": "t = 9: B's I/O completes; it rejoins Q2 at the same level. A higher-priority job is ready, so A is preempted (rule 1). B runs one unit. B has used its whole Q2 allotment, so it drops to Q1 (rule 4). B issues I/O and blocks; the allotment it used still counts.",
      "hidden": [
        "A2",
        "A1",
        "B2",
        "B0",
        "C2",
        "C1",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A0",
          "color": "blue"
        },
        {
          "id": "B1",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "A0",
          "text": "2/∞"
        },
        {
          "id": "B1",
          "text": "I/O"
        }
      ]
    },
    {
      "note": "t = 10: C arrives and enters Q2 (rule 3). C runs in Q2.",
      "hidden": [
        "A2",
        "A1",
        "B2",
        "B0",
        "C1",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A0",
          "color": "blue"
        },
        {
          "id": "B1",
          "color": "gray"
        },
        {
          "id": "C2",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "A0",
          "text": "2/∞"
        },
        {
          "id": "B1",
          "text": "I/O"
        },
        {
          "id": "C2",
          "text": "1/2"
        }
      ]
    },
    {
      "note": "t = 11: C runs one unit. C has used its whole Q2 allotment, so it drops to Q1 (rule 4).",
      "hidden": [
        "A2",
        "A1",
        "B2",
        "B0",
        "C2",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A0",
          "color": "blue"
        },
        {
          "id": "B1",
          "color": "gray"
        },
        {
          "id": "C1",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "A0",
          "text": "2/∞"
        },
        {
          "id": "B1",
          "text": "I/O"
        },
        {
          "id": "C1",
          "text": "0/4"
        }
      ]
    },
    {
      "note": "t = 12: B's I/O completes; it rejoins Q1 at the same level. C runs one unit. C finishes.",
      "hidden": [
        "A2",
        "A1",
        "B2",
        "B0",
        "C2",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A0",
          "color": "blue"
        },
        {
          "id": "B1",
          "color": "blue"
        },
        {
          "id": "C1",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "A0",
          "text": "2/∞"
        },
        {
          "id": "B1",
          "text": "0/4"
        },
        {
          "id": "C1",
          "text": "done"
        }
      ]
    },
    {
      "note": "t = 13: B runs one unit. B issues I/O and blocks; the allotment it used still counts.",
      "hidden": [
        "A2",
        "A1",
        "B2",
        "B0",
        "C2",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A0",
          "color": "blue"
        },
        {
          "id": "B1",
          "color": "orange"
        },
        {
          "id": "C1",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "A0",
          "text": "2/∞"
        },
        {
          "id": "B1",
          "text": "I/O"
        },
        {
          "id": "C1",
          "text": "done"
        }
      ]
    },
    {
      "note": "t = 14 to 15: A runs in Q0, the highest non-empty queue (rule 1).",
      "hidden": [
        "A2",
        "A1",
        "B2",
        "B0",
        "C2",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A0",
          "color": "orange"
        },
        {
          "id": "B1",
          "color": "gray"
        },
        {
          "id": "C1",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "A0",
          "text": "4/∞"
        },
        {
          "id": "B1",
          "text": "I/O"
        },
        {
          "id": "C1",
          "text": "done"
        }
      ]
    },
    {
      "note": "t = 16: B's I/O completes; it rejoins Q1 at the same level. A higher-priority job is ready, so A is preempted (rule 1). B runs one unit. B issues I/O and blocks; the allotment it used still counts.",
      "hidden": [
        "A2",
        "A1",
        "B2",
        "B0",
        "C2",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A0",
          "color": "blue"
        },
        {
          "id": "B1",
          "color": "orange"
        },
        {
          "id": "C1",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "A0",
          "text": "4/∞"
        },
        {
          "id": "B1",
          "text": "I/O"
        },
        {
          "id": "C1",
          "text": "done"
        }
      ]
    },
    {
      "note": "t = 17 to 18: A runs in Q0, the highest non-empty queue (rule 1).",
      "hidden": [
        "A2",
        "A1",
        "B2",
        "B0",
        "C2",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A0",
          "color": "orange"
        },
        {
          "id": "B1",
          "color": "gray"
        },
        {
          "id": "C1",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "A0",
          "text": "6/∞"
        },
        {
          "id": "B1",
          "text": "I/O"
        },
        {
          "id": "C1",
          "text": "done"
        }
      ]
    },
    {
      "note": "t = 19: B's I/O completes; it rejoins Q1 at the same level. A higher-priority job is ready, so A is preempted (rule 1). B runs one unit. B issues I/O and blocks; the allotment it used still counts.",
      "hidden": [
        "A2",
        "A1",
        "B2",
        "B0",
        "C2",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A0",
          "color": "blue"
        },
        {
          "id": "B1",
          "color": "orange"
        },
        {
          "id": "C1",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "A0",
          "text": "6/∞"
        },
        {
          "id": "B1",
          "text": "I/O"
        },
        {
          "id": "C1",
          "text": "done"
        }
      ]
    },
    {
      "note": "t = 20: Priority boost: every job moves back to Q2 with a fresh allotment (rule 5). A runs in Q2.",
      "hidden": [
        "A1",
        "A0",
        "B1",
        "B0",
        "C2",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A2",
          "color": "orange"
        },
        {
          "id": "B2",
          "color": "gray"
        },
        {
          "id": "C1",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "A2",
          "text": "1/2"
        },
        {
          "id": "B2",
          "text": "I/O"
        },
        {
          "id": "C1",
          "text": "done"
        }
      ]
    },
    {
      "note": "t = 21: A runs one unit. A has used its whole Q2 allotment, so it drops to Q1 (rule 4).",
      "hidden": [
        "A2",
        "A0",
        "B1",
        "B0",
        "C2",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A1",
          "color": "orange"
        },
        {
          "id": "B2",
          "color": "gray"
        },
        {
          "id": "C1",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "A1",
          "text": "0/4"
        },
        {
          "id": "B2",
          "text": "I/O"
        },
        {
          "id": "C1",
          "text": "done"
        }
      ]
    },
    {
      "note": "t = 22: B's I/O completes; it rejoins Q2 at the same level. B runs one unit. B issues I/O and blocks; the allotment it used still counts.",
      "hidden": [
        "A2",
        "A0",
        "B1",
        "B0",
        "C2",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A1",
          "color": "blue"
        },
        {
          "id": "B2",
          "color": "orange"
        },
        {
          "id": "C1",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "A1",
          "text": "0/4"
        },
        {
          "id": "B2",
          "text": "I/O"
        },
        {
          "id": "C1",
          "text": "done"
        }
      ]
    },
    {
      "note": "t = 23: A runs in Q1, the highest non-empty queue (rule 1).",
      "hidden": [
        "A2",
        "A0",
        "B1",
        "B0",
        "C2",
        "C0"
      ],
      "nodeColors": [
        {
          "id": "Q2",
          "color": "gray"
        },
        {
          "id": "Q1",
          "color": "gray"
        },
        {
          "id": "Q0",
          "color": "gray"
        },
        {
          "id": "A1",
          "color": "orange"
        },
        {
          "id": "B2",
          "color": "gray"
        },
        {
          "id": "C1",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "A1",
          "text": "1/4"
        },
        {
          "id": "B2",
          "text": "I/O"
        },
        {
          "id": "C1",
          "text": "done"
        }
      ]
    }
  ],
  "caption": "MLFQ with three queues and a priority boost every 20 time units. A is CPU-bound, B is interactive (1 unit of CPU, then 2 units of I/O), C is a short batch job. Orange = running, blue = ready, gray = blocked on I/O."
},
        {
          type: 'p',
          text: 'Watch three moments. At t = 6 and t = 9, B arrives or wakes and immediately preempts A: interactive work gets fast response. At t = 9, B is demoted although it never used a full slice in one go, because Rule 4 counts its *total* use. And at t = 20, the boost lifts A out of the bottom queue, so it cannot starve however busy the upper queues get.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the boost period is a "voodoo constant"',
          text: 'Set S too long and long jobs starve in the meantime; set it too short and interactive jobs lose their advantage, because CPU hogs are constantly promoted next to them. There is no correct value, only a tuned one. Real MLFQ implementations (Solaris\' time-sharing class, for example) ship tables of such constants, and administrators rarely touch them. OSTEP calls these Ousterhout\'s law: avoid voodoo constants if you can.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'True or false: under the original Rule 4b, a job that runs for 99% of its slice and then issues a tiny I/O request keeps its top priority indefinitely.',
      answer: true,
      explanation:
        'True. Rule 4b only looks at whether the job gave up the CPU before the slice ended, not at how much CPU it used in total. A job that blocks just before the timer fires keeps its level and can monopolise the CPU. The rewritten Rule 4 charges *all* CPU used at a level against the allotment, so blocking no longer launders it.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Gaming the scheduler, measured',
      blocks: [
        {
          type: 'p',
          text: 'Let\'s prove the attack works and that Rule 4 stops it. The simulator below runs two jobs for one simulated second under MLFQ with three levels, a 10 ms allotment per level and a boost every 100 ms. Job 0 is an honest CPU-bound job. Job 1 runs 9 ms, then does a 1 ms I/O, so it never uses a full 10 ms slice in one go.',
        },
        {
          type: 'code',
          title: 'mlfq_gaming.cpp',
          runnable: true,
          code: `#include <array>
#include <deque>
#include <iostream>

// A tiny MLFQ: 3 levels, 10 ms allotment per level, boost every
// 100 ms. Job 0 is CPU-bound. Job 1 "games" the scheduler: it
// runs 9 ms, then does a 1 ms I/O, so it never uses a full slice.
struct Job {
    int level = 2;      // 2 = highest priority
    int used = 0;       // allotment used at this level (ms)
    int burst = 0;      // ms run since it last blocked
    int blockedFor = 0; // ms of I/O left
    int cpu = 0;        // total CPU received (ms)
};

void run(bool resetOnBlock) {
    constexpr int kAllot = 10, kBoost = 100, kTotal = 1000;
    std::array<Job, 2> jobs{};
    std::array<std::deque<int>, 3> queue;
    queue[2] = {0, 1};
    int running = -1;

    for (int t = 0; t < kTotal; ++t) {
        if (t > 0 && t % kBoost == 0) {          // rule 5
            for (auto& q : queue) q.clear();
            running = -1;
            for (int i = 0; i < 2; ++i) {
                jobs[i].level = 2;
                jobs[i].used = 0;
                if (jobs[i].blockedFor == 0) queue[2].push_back(i);
            }
        }
        for (int i = 0; i < 2; ++i)              // I/O completes
            if (jobs[i].blockedFor > 0 && --jobs[i].blockedFor == 0)
                queue[jobs[i].level].push_back(i);

        for (int lv = 2; lv >= 0; --lv) {        // rules 1 and 2
            if (running != -1 && jobs[running].level >= lv) break;
            if (!queue[lv].empty()) {
                if (running != -1)               // preempted
                    queue[jobs[running].level].push_front(running);
                running = queue[lv].front();
                queue[lv].pop_front();
                break;
            }
        }
        if (running == -1) continue;             // CPU idle

        Job& j = jobs[running];
        ++j.cpu; ++j.used; ++j.burst;
        if (running == 1 && j.burst == 9) {      // gamer blocks
            j.burst = 0;
            j.blockedFor = 1;
            if (resetOnBlock) j.used = 0;        // old rule 4b
            else if (j.used >= kAllot && j.level > 0) {
                --j.level;                       // rule 4
                j.used = 0;
            }
            running = -1;
        } else if (j.used >= kAllot) {           // slice used up
            if (j.level > 0) --j.level;          // rule 4
            j.used = 0;
            queue[j.level].push_back(running);
            running = -1;
        }
    }
    std::cout << (resetOnBlock ? "reset on block:   "
                               : "total accounting: ")
              << "CPU-bound " << jobs[0].cpu << " ms, gamer "
              << jobs[1].cpu << " ms\\n";
}

int main() {
    run(true);   // allotment forgiven whenever a job blocks
    run(false);  // allotment counted across blocking
}`,
          output: "reset on block:   CPU-bound 100 ms, gamer 900 ms\ntotal accounting: CPU-bound 601 ms, gamer 399 ms",
          annotations: [
            { lines: '8-14', text: '`used` is the allotment consumed at the current level, the quantity Rule 4 is about. `cpu` is only for the final report.' },
            { lines: '24-32', text: 'Rule 5: every 100 ms everyone returns to the top with a fresh allotment. A job that is blocked right now rejoins the top queue when its I/O completes.' },
            { lines: '37-46', text: 'Rules 1 and 2: scan from the highest queue down. If a ready job sits above the running job\'s level, the running job is preempted and put back at the front of its own queue.' },
            { lines: '51-54', text: 'The gamer blocks just before the slice ends. With `resetOnBlock` (the old Rule 4b) its allotment is forgiven, so it never moves down.' },
            { lines: '55-58', text: 'The new Rule 4: the allotment it used is still counted, so once it has used 10 ms at a level, it drops even though it blocked.' },
            { lines: '60-64', text: 'A job that uses its whole allotment without blocking drops a level and goes to the back of the new queue.' },
          ],
        },
        {
          type: 'p',
          text: 'With the old rule the gamer takes 90% of the CPU: it holds the top queue forever, and the honest job only runs during the gamer\'s 1 ms I/O waits. With total accounting both jobs sink after their allotments and share the bottom queue, and the gamer actually ends up with *less* than half, because it keeps throwing away the rest of its turn on I/O.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Where MLFQ lives today',
          text: 'Solaris\' time-sharing class, the classic BSD scheduler (which computes priority from recent CPU usage that decays over time) and the Windows scheduler, with its priority boosts, are all MLFQ descendants. Linux used priority arrays with interactivity bonuses in its 2.6 O(1) scheduler, then dropped the heuristics for a different idea entirely: fair sharing.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'fill',
      prompt: 'Match each MLFQ rule to the problem it solves.',
      template: 'Starting every new job at the ___ priority lets short jobs finish quickly. Counting a job\'s ___ at a level, even when it blocks, stops programs from gaming the scheduler. A periodic priority ___ prevents starvation and lets jobs that became interactive climb back.',
      templateIsCode: false,
      blanks: [{ answers: ['highest', 'top'] }, { answers: ['total CPU use', 'allotment'] }, { answers: ['boost'] }],
      wordBank: ['highest', 'lowest', 'total CPU use', 'slice count', 'boost', 'inversion'],
      explanation:
        'Rule 3 (start at the top) is the bet that new jobs are short. Rule 4 (total accounting) closes the 99%-then-I/O loophole. Rule 5 (boost) handles both starvation and jobs whose behaviour changes. Counting *slices* instead of CPU time would reopen the loophole, since a gamer never completes a slice.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Proportional share: lottery scheduling',
      blocks: [
        {
          type: 'p',
          text: 'MLFQ optimises response time and turnaround. A different family of schedulers optimises something else: **fairness by share**. Instead of asking "who is interactive?", a **proportional-share** scheduler asks "what fraction of the CPU should each job get?" and guarantees it over time.',
        },
        {
          type: 'p',
          text: 'The simplest version is **[[lottery-scheduling|lottery scheduling]]** (Waldspurger and Weihl, 1994). Each job holds **tickets**; its share is its fraction of all tickets. Every slice, the scheduler draws a random winning ticket and runs its owner. With A holding 100 tickets, B 50 and C 250, A should get 100/400 = 25% of the CPU, B 12.5% and C 62.5%.',
        },
        {
          type: 'p',
          text: 'The implementation is almost embarrassingly small: pick a random number below the ticket total, then walk the job list adding up tickets until the running sum exceeds it. There is no per-job history to maintain, and a new job is fair from its first slice. Tickets also make policy easy to express: a job can **transfer** tickets to a server working on its behalf, and a group of jobs can be given its own **currency** that is converted to global tickets.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Fair only on average',
          text: 'Randomness converges slowly. Over 40 slices, B (12.5% of the tickets) can easily win 3 instead of the expected 5. For long-running jobs that is fine; for short ones, or for anything where predictability matters, it is not.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Stride scheduling: the lottery without luck',
      blocks: [
        {
          type: 'p',
          text: '**Stride scheduling** is the deterministic version. Divide a large number by each job\'s tickets to get its **stride**: with 10,000, A\'s stride is 100, B\'s 200 and C\'s 40. Each job has a **pass** counter starting at 0. Every slice, run the job with the lowest pass and add its stride. Jobs with many tickets have small strides, so their pass grows slowly and they are picked often.',
        },
        {
          type: 'code',
          title: 'lottery_vs_stride.cpp',
          runnable: true,
          code: `#include <array>
#include <cstdint>
#include <format>
#include <iostream>
#include <random>

constexpr std::array<int, 3> kTickets{100, 50, 250};
constexpr std::array<char, 3> kName{'A', 'B', 'C'};
constexpr int kTotalTickets = 400;

// Lottery: draw a winning ticket, walk the list to find its owner.
std::array<int, 3> lottery(int slices, std::mt19937& rng) {
    std::array<int, 3> wins{};
    for (int s = 0; s < slices; ++s) {
        const int winner = static_cast<int>(rng() % kTotalTickets);
        int counter = 0;
        for (int i = 0; i < 3; ++i) {
            counter += kTickets[i];
            if (counter > winner) { ++wins[i]; break; }
        }
    }
    return wins;
}

// Stride: run the job with the lowest pass, then add its stride.
std::array<int, 3> stride(int slices, bool trace) {
    constexpr std::int64_t kBig = 10'000;
    std::array<std::int64_t, 3> pass{}, step{};
    for (int i = 0; i < 3; ++i) step[i] = kBig / kTickets[i];
    std::array<int, 3> wins{};
    for (int s = 0; s < slices; ++s) {
        int k = 0;
        for (int i = 1; i < 3; ++i)
            if (pass[i] < pass[k]) k = i;
        if (trace)
            std::cout << std::format(
                "  pass {:3} {:3} {:3} -> run {}\\n",
                pass[0], pass[1], pass[2], kName[k]);
        pass[k] += step[k];
        ++wins[k];
    }
    return wins;
}

void show(const char* label, const std::array<int, 3>& w) {
    std::cout << std::format("{:<14} A {:4}  B {:4}  C {:4}\\n",
                             label, w[0], w[1], w[2]);
}

int main() {
    std::cout << "tickets A 100, B 50, C 250"
                 " -> strides 100, 200, 40\\n";
    stride(8, true);
    std::mt19937 rng{2024};
    show("lottery x40", lottery(40, rng));
    show("stride  x40", stride(40, false));
    show("lottery x4000", lottery(4000, rng));
    show("stride  x4000", stride(4000, false));
}`,
          output: "tickets A 100, B 50, C 250 -> strides 100, 200, 40\n  pass   0   0   0 -> run A\n  pass 100   0   0 -> run B\n  pass 100 200   0 -> run C\n  pass 100 200  40 -> run C\n  pass 100 200  80 -> run C\n  pass 100 200 120 -> run A\n  pass 200 200 120 -> run C\n  pass 200 200 160 -> run C\nlottery x40    A   10  B    3  C   27\nstride  x40    A   10  B    5  C   25\nlottery x4000  A 1023  B  509  C 2468\nstride  x4000  A 1000  B  500  C 2500",
          annotations: [
            { lines: '15', text: '`std::mt19937` is fully specified by the standard, so this sequence is the same on every compiler. (`std::uniform_int_distribution` is *not* specified exactly, which is why we take `rng() % 400` here; the tiny bias does not matter for a demo.)' },
            { lines: '16-20', text: 'The lottery walk: the winner is the first job whose cumulative ticket count passes the drawn number.' },
            { lines: '29', text: 'Strides are inversely proportional to tickets.' },
            { lines: '32-34', text: 'Run the job with the lowest pass value; ties go to the earlier job.' },
            { lines: '39', text: 'Advance the winner\'s pass by its stride. After 8 slices, A has run 2 times, B once and C 5 times: already exactly 25%, 12.5% and 62.5%.' },
          ],
        },
        {
          type: 'p',
          text: 'Stride hits the target shares exactly every time the pass values line up. Lottery wanders (B got 3 slices instead of 5 out of 40) and only approaches the targets over thousands of draws. The catch for stride is **global state**: when a new job arrives, what should its pass be? Starting it at 0 would let it monopolise the CPU until it catches up. Lottery has no such problem, since a new job just adds tickets.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'numeric',
      prompt: 'Stride scheduling with a big number of 10,000: A holds 200 tickets, B 100 and C 50. Over 700 slices, how many does A run?',
      answer: 400,
      unit: 'slices',
      explanation:
        'The strides are 50, 100 and 200, so in a stretch where each pass advances by 200, A runs 4 times, B twice and C once: 7 slices. A\'s share is 200/350 = 4/7, and 4/7 of 700 is **400**. Stride is exact, so the count is 400 on the nose, where lottery would only be close.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Linux CFS: fairness as virtual time',
      blocks: [
        {
          type: 'p',
          text: 'From 2007 (kernel 2.6.23) to 2023, Linux scheduled normal threads with the **[[cfs|Completely Fair Scheduler]] (CFS)**, written by Ingo Molnár. It is stride scheduling dressed for production. Each task has a **vruntime** (virtual runtime). When a task runs for `delta` nanoseconds, its vruntime grows by `delta × 1024 / weight`, and the scheduler always runs the task with the **smallest vruntime**. Runnable tasks sit in a red-black tree ordered by vruntime, so the next task is the leftmost node.',
        },
        {
          type: 'p',
          text: 'The weight comes from the task\'s **[[nice-value]]**, the Unix priority from −20 to +19. Nice 0 has weight 1024, and each step multiplies or divides the weight by about 1.25, so one nice level is worth roughly 10% of CPU against a competitor:',
        },
        {
          type: 'table',
          headers: ['nice', '−20', '−5', '−1', '0', '1', '5', '19'],
          rows: [['weight', '88761', '3121', '1277', '1024', '820', '335', '15']],
          caption: 'Selected entries of the kernel\'s `sched_prio_to_weight` table.',
        },
        {
  "type": "algo",
  "view": "array",
  "bars": true,
  "code": "pick smallest vruntime\nrun it for delta ms\nvruntime += delta*1024/weight\nreinsert into the tree",
  "lang": "text",
  "interval": 1300,
  "frames": [
    {
      "note": "Three runnable tasks, all with vruntime 0. Bar 0 is A (nice 0, weight 1024), bar 1 is B (nice 5, weight 335), bar 2 is C (nice −5, weight 3121).",
      "array": [
        0,
        0,
        0
      ],
      "lines": [
        1
      ],
      "vars": [
        [
          "CPU ms",
          "A 0  B 0  C 0"
        ]
      ]
    },
    {
      "note": "A has the smallest vruntime, so it runs 3 ms; its vruntime grows by 3 × 1024 / 1024 = 3.00.",
      "array": [
        3.0,
        0.0,
        0.0
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
          "label": "ran"
        }
      ],
      "lines": [
        2,
        3,
        4
      ],
      "vars": [
        [
          "CPU ms",
          "A 3  B 0  C 0"
        ],
        [
          "share",
          "A 100%  B 0%  C 0%"
        ]
      ]
    },
    {
      "note": "B has the smallest vruntime, so it runs 3 ms; its vruntime grows by 3 × 1024 / 335 = 9.17.",
      "array": [
        3.0,
        9.17,
        0.0
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
          "label": "ran"
        }
      ],
      "lines": [
        2,
        3,
        4
      ],
      "vars": [
        [
          "CPU ms",
          "A 3  B 3  C 0"
        ],
        [
          "share",
          "A 50%  B 50%  C 0%"
        ]
      ]
    },
    {
      "note": "C has the smallest vruntime, so it runs 3 ms; its vruntime grows by 3 × 1024 / 3121 = 0.98.",
      "array": [
        3.0,
        9.17,
        0.98
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
          "label": "ran"
        }
      ],
      "lines": [
        2,
        3,
        4
      ],
      "vars": [
        [
          "CPU ms",
          "A 3  B 3  C 3"
        ],
        [
          "share",
          "A 33%  B 33%  C 33%"
        ]
      ]
    },
    {
      "note": "C has the smallest vruntime, so it runs 3 ms; its vruntime grows by 3 × 1024 / 3121 = 0.98.",
      "array": [
        3.0,
        9.17,
        1.97
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
          "label": "ran"
        }
      ],
      "lines": [
        2,
        3,
        4
      ],
      "vars": [
        [
          "CPU ms",
          "A 3  B 3  C 6"
        ],
        [
          "share",
          "A 25%  B 25%  C 50%"
        ]
      ]
    },
    {
      "note": "C has the smallest vruntime, so it runs 3 ms; its vruntime grows by 3 × 1024 / 3121 = 0.98.",
      "array": [
        3.0,
        9.17,
        2.95
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
          "label": "ran"
        }
      ],
      "lines": [
        2,
        3,
        4
      ],
      "vars": [
        [
          "CPU ms",
          "A 3  B 3  C 9"
        ],
        [
          "share",
          "A 20%  B 20%  C 60%"
        ]
      ]
    },
    {
      "note": "C has the smallest vruntime, so it runs 3 ms; its vruntime grows by 3 × 1024 / 3121 = 0.98.",
      "array": [
        3.0,
        9.17,
        3.94
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
          "label": "ran"
        }
      ],
      "lines": [
        2,
        3,
        4
      ],
      "vars": [
        [
          "CPU ms",
          "A 3  B 3  C 12"
        ],
        [
          "share",
          "A 17%  B 17%  C 67%"
        ]
      ]
    },
    {
      "note": "A has the smallest vruntime, so it runs 3 ms; its vruntime grows by 3 × 1024 / 1024 = 3.00.",
      "array": [
        6.0,
        9.17,
        3.94
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
          "label": "ran"
        }
      ],
      "lines": [
        2,
        3,
        4
      ],
      "vars": [
        [
          "CPU ms",
          "A 6  B 3  C 12"
        ],
        [
          "share",
          "A 29%  B 14%  C 57%"
        ]
      ]
    },
    {
      "note": "C has the smallest vruntime, so it runs 3 ms; its vruntime grows by 3 × 1024 / 3121 = 0.98.",
      "array": [
        6.0,
        9.17,
        4.92
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
          "label": "ran"
        }
      ],
      "lines": [
        2,
        3,
        4
      ],
      "vars": [
        [
          "CPU ms",
          "A 6  B 3  C 15"
        ],
        [
          "share",
          "A 25%  B 12%  C 62%"
        ]
      ]
    },
    {
      "note": "C has the smallest vruntime, so it runs 3 ms; its vruntime grows by 3 × 1024 / 3121 = 0.98.",
      "array": [
        6.0,
        9.17,
        5.91
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
          "label": "ran"
        }
      ],
      "lines": [
        2,
        3,
        4
      ],
      "vars": [
        [
          "CPU ms",
          "A 6  B 3  C 18"
        ],
        [
          "share",
          "A 22%  B 11%  C 67%"
        ]
      ]
    },
    {
      "note": "C has the smallest vruntime, so it runs 3 ms; its vruntime grows by 3 × 1024 / 3121 = 0.98.",
      "array": [
        6.0,
        9.17,
        6.89
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
          "label": "ran"
        }
      ],
      "lines": [
        2,
        3,
        4
      ],
      "vars": [
        [
          "CPU ms",
          "A 6  B 3  C 21"
        ],
        [
          "share",
          "A 20%  B 10%  C 70%"
        ]
      ]
    },
    {
      "note": "A has the smallest vruntime, so it runs 3 ms; its vruntime grows by 3 × 1024 / 1024 = 3.00.",
      "array": [
        9.0,
        9.17,
        6.89
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
          "label": "ran"
        }
      ],
      "lines": [
        2,
        3,
        4
      ],
      "vars": [
        [
          "CPU ms",
          "A 9  B 3  C 21"
        ],
        [
          "share",
          "A 27%  B 9%  C 64%"
        ]
      ]
    },
    {
      "note": "C has the smallest vruntime, so it runs 3 ms; its vruntime grows by 3 × 1024 / 3121 = 0.98.",
      "array": [
        9.0,
        9.17,
        7.87
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
          "label": "ran"
        }
      ],
      "lines": [
        2,
        3,
        4
      ],
      "vars": [
        [
          "CPU ms",
          "A 9  B 3  C 24"
        ],
        [
          "share",
          "A 25%  B 8%  C 67%"
        ]
      ]
    },
    {
      "note": "The heavier a task, the slower its vruntime rises, so the more often it is the minimum. Long-run shares converge to the weights: A 22.9%, B 7.5%, C 69.7%.",
      "array": [
        9.0,
        9.17,
        7.87
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
        }
      ],
      "vars": [
        [
          "CPU ms",
          "A 9  B 3  C 24"
        ]
      ]
    }
  ],
  "caption": "CFS-style selection with a fixed 3 ms slice. Bars are vruntime in ms. Real CFS sizes slices by weight too, but the selection rule is exactly this."
},
        {
          type: 'p',
          text: 'A few details make it practical. Instead of a fixed slice, CFS divided a **target latency** (6 ms, scaled up on machines with more CPUs) among the runnable tasks in proportion to weight, with a minimum granularity so that 1,000 runnable tasks do not each get 6 microseconds. And a task that wakes from a long sleep has its vruntime raised to near the minimum in the tree; otherwise a thread that slept for an hour would return with an hour of credit and lock everyone else out.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why virtual time instead of queues?',
          text: 'MLFQ\'s queues, allotments and boost period are all tuning knobs with no right answer. Virtual time has one rule, "run whoever has received the least weighted CPU", and fairness follows from it: interactive tasks that sleep a lot naturally have low vruntime when they wake and run promptly. The difficulty CFS never fully solved was *latency*: it had no way to say "this task wants the CPU soon, but not more of it", and grew wakeup heuristics to compensate.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'numeric',
      prompt: 'Two CPU-bound threads share one core under Linux\'s fair scheduler: one at nice 0, one at nice 5. What percentage of the CPU does the nice 0 thread get? Round to the nearest whole percent.',
      answer: 75,
      tolerance: 0.5,
      unit: '%',
      explanation:
        'Shares follow weights: 1024 / (1024 + 335) = 1024 / 1359 ≈ **75%**, leaving about 25% for the nice 5 thread. Five nice levels at about 1.25× each give 1.25⁵ ≈ 3.05, and indeed 1024 / 335 ≈ 3.06. This is how a background asset compiler run with `nice -n 5` stays out of the way of your editor without stopping.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'EEVDF: Linux\'s scheduler since 6.6',
      blocks: [
        {
          type: 'p',
          text: 'In Linux 6.6 (October 2023), Peter Zijlstra replaced CFS\'s pick logic with **[[eevdf|EEVDF]]**, *Earliest Eligible Virtual Deadline First*, from a 1995 paper by Stoica and Abdel-Wahab. The weights, vruntime and the "fair" scheduling class (`SCHED_NORMAL`, called `SCHED_OTHER` in POSIX) all remain; what changed is how the next task is chosen. Two ideas do the work:',
        },
        {
          type: 'list',
          items: [
            '**Lag and eligibility.** A task\'s *lag* is the CPU time it is owed: the service it should have received under perfect fair sharing minus what it actually got. A task is **eligible** only if its lag is zero or positive, meaning it has not run ahead of its share. In vruntime terms: its vruntime is at or behind V, the weighted average vruntime of the queue.',
            '**Virtual deadlines.** Each task requests a slice. Its virtual deadline is its eligible time plus `slice / weight`. Among eligible tasks, EEVDF runs the one with the **earliest virtual deadline**.',
          ],
        },
        {
          type: 'p',
          text: 'The effect is that a task asking for **shorter slices** gets **earlier deadlines** and is picked sooner, but because eligibility still enforces the share, it does not get more CPU in total. Latency and bandwidth become two separate knobs:',
        },
        {
  "type": "algo",
  "view": "array",
  "code": "eligible: vruntime <= V\ndeadline = vruntime + slice/w\nrun eligible, earliest deadline",
  "lang": "text",
  "interval": 1800,
  "frames": [
    {
      "note": "A and B have equal weight. A asks for 3 ms slices, B (latency-sensitive) asks for 1 ms. Both start with vruntime 0.",
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
      "lines": [
        1
      ]
    },
    {
      "note": "t = 0: Both are eligible; B's deadline 1 is earlier than A's 3. It runs its 1 ms slice.",
      "array": [
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
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "V (average vruntime)",
          "0"
        ],
        [
          "A",
          "vruntime 0, deadline 3, eligible"
        ],
        [
          "B",
          "vruntime 0, deadline 1, eligible"
        ]
      ]
    },
    {
      "note": "t = 1: B is not eligible (its vruntime 1 is ahead of V = 0.5: it has had more than its share), so A runs. It runs its 3 ms slice.",
      "array": [
        "B",
        "A",
        "A",
        "A",
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
        },
        {
          "index": 2,
          "color": "orange"
        },
        {
          "index": 3,
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
        1,
        2,
        3
      ],
      "vars": [
        [
          "V (average vruntime)",
          "0.5"
        ],
        [
          "A",
          "vruntime 0, deadline 3, eligible"
        ],
        [
          "B",
          "vruntime 1, deadline 2, not eligible"
        ]
      ]
    },
    {
      "note": "t = 4: A is not eligible (its vruntime 3 is ahead of V = 2: it has had more than its share), so B runs. It runs its 1 ms slice.",
      "array": [
        "B",
        "A",
        "A",
        "A",
        "B",
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
        1,
        2,
        3
      ],
      "vars": [
        [
          "V (average vruntime)",
          "2"
        ],
        [
          "A",
          "vruntime 3, deadline 6, not eligible"
        ],
        [
          "B",
          "vruntime 1, deadline 2, eligible"
        ]
      ]
    },
    {
      "note": "t = 5: A is not eligible (its vruntime 3 is ahead of V = 2.5: it has had more than its share), so B runs. It runs its 1 ms slice.",
      "array": [
        "B",
        "A",
        "A",
        "A",
        "B",
        "B",
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
        1,
        2,
        3
      ],
      "vars": [
        [
          "V (average vruntime)",
          "2.5"
        ],
        [
          "A",
          "vruntime 3, deadline 6, not eligible"
        ],
        [
          "B",
          "vruntime 2, deadline 3, eligible"
        ]
      ]
    },
    {
      "note": "t = 6: Both are eligible; B's deadline 4 is earlier than A's 6. It runs its 1 ms slice.",
      "array": [
        "B",
        "A",
        "A",
        "A",
        "B",
        "B",
        "B",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 6,
          "color": "blue"
        }
      ],
      "pointers": [
        {
          "index": 6,
          "label": "t=6"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "V (average vruntime)",
          "3"
        ],
        [
          "A",
          "vruntime 3, deadline 6, eligible"
        ],
        [
          "B",
          "vruntime 3, deadline 4, eligible"
        ]
      ]
    },
    {
      "note": "t = 7: B is not eligible (its vruntime 4 is ahead of V = 3.5: it has had more than its share), so A runs. It runs its 3 ms slice.",
      "array": [
        "B",
        "A",
        "A",
        "A",
        "B",
        "B",
        "B",
        "A",
        "A",
        "A",
        "·",
        "·"
      ],
      "marks": [
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
          "index": 7,
          "label": "t=7"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "V (average vruntime)",
          "3.5"
        ],
        [
          "A",
          "vruntime 3, deadline 6, eligible"
        ],
        [
          "B",
          "vruntime 4, deadline 5, not eligible"
        ]
      ]
    },
    {
      "note": "t = 10: A is not eligible (its vruntime 6 is ahead of V = 5: it has had more than its share), so B runs. It runs its 1 ms slice.",
      "array": [
        "B",
        "A",
        "A",
        "A",
        "B",
        "B",
        "B",
        "A",
        "A",
        "A",
        "B",
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
        1,
        2,
        3
      ],
      "vars": [
        [
          "V (average vruntime)",
          "5"
        ],
        [
          "A",
          "vruntime 6, deadline 9, not eligible"
        ],
        [
          "B",
          "vruntime 4, deadline 5, eligible"
        ]
      ]
    },
    {
      "note": "t = 11: A is not eligible (its vruntime 6 is ahead of V = 5.5: it has had more than its share), so B runs. It runs its 1 ms slice.",
      "array": [
        "B",
        "A",
        "A",
        "A",
        "B",
        "B",
        "B",
        "A",
        "A",
        "A",
        "B",
        "B"
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
        1,
        2,
        3
      ],
      "vars": [
        [
          "V (average vruntime)",
          "5.5"
        ],
        [
          "A",
          "vruntime 6, deadline 9, not eligible"
        ],
        [
          "B",
          "vruntime 5, deadline 6, eligible"
        ]
      ]
    },
    {
      "note": "After 12 ms each task has had exactly 6 ms. B never waited more than 3 ms, while A got longer, cache-friendly runs. Same share, different latency.",
      "array": [
        "B",
        "A",
        "A",
        "A",
        "B",
        "B",
        "B",
        "A",
        "A",
        "A",
        "B",
        "B"
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
        }
      ]
    }
  ],
  "caption": "EEVDF with two equal-weight tasks. V is the average vruntime; a task is eligible when it has not run ahead of it. Orange cells are A, blue cells are B."
},
        {
          type: 'p',
          text: 'The default slice (the *base slice*) is 0.75 ms scaled by `1 + log₂(CPUs)`, so 3 ms on a machine with 8 or more CPUs. A latency-sensitive thread can request a shorter one with the `sched_setattr()` system call. A thread that sleeps does not simply reset its lag either: the kernel keeps a negative lag around for a while (a "deferred dequeue"), so a task cannot erase its debt by napping briefly.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Versions matter',
          text: 'Articles and Stack Overflow answers written before 2024 describe CFS. If you are on a kernel 6.6 or newer (any current desktop distribution, SteamOS 3 builds and most cloud images), the fair class is EEVDF. Check with `uname -r`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'Under EEVDF, two threads have the same nice value. The audio mixer requests a 0.5 ms slice; a physics baker uses the default 3 ms. Which statement is correct?',
      options: [
        {
          text: 'The mixer tends to be picked sooner after it wakes, but over time both get the same share of CPU',
          correct: true,
          why: 'A shorter requested slice gives an earlier virtual deadline, so the mixer wins the pick when both are eligible. Eligibility, based on lag, still caps it at its fair share.',
        },
        {
          text: 'The mixer gets six times as much CPU, because its slice is six times shorter',
          why: 'Share is set by weight (nice), not slice length. A short slice means more frequent, shorter turns, not more total time.',
        },
        {
          text: 'The baker always runs first, because its deadline is further away and it can afford to wait',
          why: 'EEVDF runs the *earliest* deadline among eligible tasks; the baker\'s later deadline makes it lose ties.',
        },
        {
          text: 'Nothing changes: EEVDF ignores slice requests and behaves exactly like CFS',
          why: 'Separating latency (slice) from bandwidth (weight) is the main thing EEVDF adds over CFS.',
        },
      ],
      explanation:
        'EEVDF keeps CFS\'s fairness and adds an explicit latency knob. That suits games and audio well: threads that wake often for short bursts can ask for short slices and be served promptly without being granted a bigger share of the machine.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Windows: priority classes and boosts',
      blocks: [
        {
          type: 'p',
          text: 'Windows takes the MLFQ road. Every thread has a priority from 0 to 31, and the scheduler always runs the highest-priority ready thread, round robin within a level, preempting immediately when a higher one becomes ready. Levels **16 to 31** are the *real-time* range: their priorities never change. Levels **1 to 15** are the *dynamic* range, where normal programs live.',
        },
        {
          type: 'p',
          text: 'A thread\'s **base priority** combines its process\'s **priority class** (Idle, Below Normal, Normal, Above Normal, High, Realtime) with the thread\'s **relative priority** (Idle, Lowest, Below Normal, Normal, Above Normal, Highest, Time Critical). A Normal-class process has base 8; its Highest thread sits at 10. In the dynamic range the kernel adds temporary **boosts** that decay back to the base, one level per quantum:',
        },
        {
          type: 'list',
          items: [
            '**I/O completion:** a thread whose disk, network, keyboard or sound I/O just completed gets a boost, larger for devices a person is waiting on.',
            '**Foreground and GUI:** a thread woken by window input gets a boost, and on client Windows threads of the foreground process get longer quanta.',
            '**Anti-starvation:** a ready thread that has not run for about 4 seconds is boosted to 15 for a quantum, which also helps with priority inversion.',
          ],
        },
        {
          type: 'code',
          title: 'Windows (not runnable on Linux)',
          lang: 'cpp',
          code: `#include <windows.h>

void configureGameThreads(HANDLE renderThread,
                          HANDLE streamingThread) {
    // The whole process: one step above normal.
    SetPriorityClass(GetCurrentProcess(),
                     ABOVE_NORMAL_PRIORITY_CLASS);
    // Within it: favour rendering, deprioritise streaming.
    SetThreadPriority(renderThread, THREAD_PRIORITY_HIGHEST);
    SetThreadPriority(streamingThread,
                      THREAD_PRIORITY_BELOW_NORMAL);
}`,
          annotations: [
            { lines: '6-7', text: 'The class applies to every thread in the process. Avoid `REALTIME_PRIORITY_CLASS`: real-time threads outrank the threads that handle mouse input and disk caching, so a busy loop there can freeze the machine.' },
            { lines: '9', text: 'Relative priority moves one thread within the class. Raising a thread that never blocks just starves its siblings.' },
            { lines: '10-11', text: 'A background loader at lower priority still gets CPU whenever the higher threads block, which on a well-written frame is often.' },
          ],
        },
        {
          type: 'p',
          text: 'The Linux counterpart for normal threads is the nice value, which any process may raise (making itself *less* important). Lowering it below 0 needs privilege:',
        },
        {
          type: 'code',
          title: 'be_nice.cpp',
          runnable: true,
          code: `#include <sys/resource.h>
#include <cerrno>
#include <cstring>
#include <iostream>

int main() {
    // Lower our own priority to the minimum: nice 19.
    // Any process may do this; raising priority needs privilege.
    if (setpriority(PRIO_PROCESS, 0, 19) != 0) {
        std::cout << "setpriority failed: " << std::strerror(errno)
                  << '\\n';
        return 1;
    }
    errno = 0;                       // -1 is a valid nice value,
    const int nice = getpriority(PRIO_PROCESS, 0);
    if (errno != 0) {                // so check errno instead
        std::cout << "getpriority failed\\n";
        return 1;
    }
    std::cout << "now running at nice " << nice << '\\n';
}`,
          output: "now running at nice 19",
          annotations: [
            { lines: '9', text: '`PRIO_PROCESS, 0` means "this process". On Linux, nice is really a per-thread attribute, and this call affects the calling thread.' },
            { lines: '15-17', text: '`getpriority` can legitimately return −1, so the only reliable way to detect failure is to clear `errno` first and check it afterwards. Many POSIX calls have this quirk.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Priorities are not a performance feature',
          text: 'Raising a thread\'s priority does not make it run faster; it only lets it run *instead of* something else. If the game thread is CPU-bound, giving it Highest priority just starves your own workers and the audio thread. Raise priority for threads that are mostly blocked and must respond quickly when they wake (audio, input), and lower it for background work (streaming, shader compilation).',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'bug',
      prompt: 'This Linux helper is meant to report a thread\'s nice value and returns −2 ("error") when it fails. Testers report "error" for threads that are running perfectly normally. Tap the line at fault.',
      code: `#include <sys/resource.h>

int currentNice() {
    const int nice = getpriority(PRIO_PROCESS, 0);
    if (nice == -1) {
        return -2;          // report failure
    }
    return nice;
}`,
      bugLines: [5],
      explanation:
        'A nice value of −1 is perfectly legal, so `getpriority` returning −1 does not mean failure. The correct pattern is `errno = 0;` before the call and `if (errno != 0)` after it. Any thread running at nice −1 is misreported as an error. Functions whose error value is also a valid result (`getpriority`, `strtol`, `readdir`) all need this errno dance.',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'mcq',
      prompt: 'Which pairing of scheduler and core idea is correct?',
      options: [
        {
          text: 'Linux EEVDF: run the eligible task with the earliest virtual deadline',
          correct: true,
          why: 'Eligibility (lag ≥ 0) enforces the share; the deadline (slice / weight) controls latency.',
        },
        {
          text: 'MLFQ: give each job tickets and draw a random winner each slice',
          why: 'That is lottery scheduling. MLFQ uses priority queues and observed behaviour.',
        },
        {
          text: 'CFS: demote any task that uses its whole slice to a lower queue',
          why: 'That is MLFQ\'s Rule 4. CFS has no queues of priorities; it runs the task with the smallest vruntime.',
        },
        {
          text: 'Windows: all threads share one weighted fair queue with no fixed priorities',
          why: 'Windows uses 32 strict priority levels with boosts in the dynamic range, an MLFQ-style design.',
        },
      ],
      explanation:
        'Two families dominate. Priority-based feedback schedulers (MLFQ, BSD, Windows) guess interactivity from behaviour and favour it. Proportional-share schedulers (lottery, stride, CFS, EEVDF) guarantee shares and get responsiveness from sleeping tasks being behind on their share, plus, in EEVDF, explicit latency requests.',
    },
  ],
  takeaways: [
    '**MLFQ** learns from behaviour: new jobs start at the top, jobs that use their allotment sink, interactive jobs stay high. Rule 4 counts total use so programs cannot game it; Rule 5\'s periodic boost prevents starvation.',
    '**Lottery** and **stride** scheduling give each job a share in proportion to its tickets; lottery is simple and stateless but only fair on average, stride is exact but needs global state.',
    '**CFS** (Linux 2.6.23 to 6.5) runs the task with the smallest **vruntime**, which grows by `delta × 1024 / weight`; nice values map to weights about 1.25× apart.',
    '**EEVDF** (Linux 6.6+) keeps the weights but picks the *eligible* task (lag ≥ 0) with the earliest *virtual deadline*, so short slice requests mean lower latency without a bigger share.',
    '**Windows** uses 32 priority levels: classes plus relative thread priorities set the base, and temporary boosts favour I/O completion, the foreground and starving threads.',
    'Priority decides *who* runs, not how fast. Raise it for threads that mostly wait and must react quickly; lower it for background work.',
  ],
  reading: [
    {
      title: 'OSTEP chapter 8: Multi-Level Feedback Queue',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-mlfq.pdf',
      source: 'book',
      note: 'Derives the five rules one failure at a time, with the Solaris tables as a case study.',
    },
    {
      title: 'OSTEP chapter 9: Scheduling: Proportional Share',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-lottery.pdf',
      source: 'book',
      note: 'Lottery, stride and CFS, including the nice-to-weight table and red-black trees.',
    },
    {
      title: 'EEVDF Scheduler (Linux kernel documentation)',
      url: 'https://docs.kernel.org/scheduler/sched-eevdf.html',
      source: 'other',
      note: 'The kernel\'s own description of lag, eligibility, virtual deadlines and slice requests.',
    },
    {
      title: 'Scheduling Priorities (Microsoft Learn)',
      url: 'https://learn.microsoft.com/en-us/windows/win32/procthread/scheduling-priorities',
      source: 'other',
      note: 'The full table of priority classes, relative priorities and the base priorities they produce.',
    },
  ],
};
