import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-false-sharing',
  title: 'False Sharing',
  summary:
    'How threads that never touch each other\'s data can still slow each other down through a shared cache line, how to fix it with alignas(64) and std::hardware_destructive_interference_size, how to avoid it by design, and how to detect it.',
  minutes: 18,
  objectives: [
    'Explain false sharing in terms of cache lines and the coherence protocol',
    'Recognize the per-thread counter pattern and other layouts that cause false sharing',
    'Pad hot per-thread data with `alignas` and `std::hardware_destructive_interference_size`, and know the portability caveats',
    'Prefer designs that avoid sharing: contiguous partitions, local accumulation and separated producer/consumer fields',
    'Detect false sharing with `perf c2c`, VTune and its symptoms',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Sharing nothing, paying anyway',
      blocks: [
        {
          type: 'p',
          text: 'The previous lesson showed that writing a variable from several cores makes its cache line bounce between them. That is **true sharing**: the threads really do share the variable, and some cost is unavoidable. **[[false-sharing|False sharing]]** is the same cost without the sharing: two threads write **different** variables that happen to live in the **same cache line**.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 332" xmlns="http://www.w3.org/2000/svg"><text x="260" y="16" font-size="12.5" text-anchor="middle" font-weight="700">Packed: long counts[8] in one line, written by two threads</text><rect x="20" y="26" width="208" height="30" rx="6" class="f-orange" fill-opacity="0.12"/><rect x="20" y="26" width="208" height="30" rx="6" fill="none" class="s-orange" stroke-width="1.6"/><text x="124" y="46" font-size="12" text-anchor="middle" class="t-orange" font-weight="600">Core 0 (writes c0)</text><line x1="124" y1="56" x2="124" y2="72" stroke="currentColor" stroke-width="1.4"/><rect x="292" y="26" width="208" height="30" rx="6" class="f-blue" fill-opacity="0.12"/><rect x="292" y="26" width="208" height="30" rx="6" fill="none" class="s-blue" stroke-width="1.6"/><text x="396" y="46" font-size="12" text-anchor="middle" class="t-blue" font-weight="600">Core 1 (writes c1)</text><line x1="396" y1="56" x2="396" y2="72" stroke="currentColor" stroke-width="1.4"/><text x="124" y="112" font-size="11" text-anchor="middle" class="t-gray">core 0’s L1 copy of the line</text><rect x="20" y="72" width="26" height="26" rx="1" class="f-orange" fill-opacity="0.25"/><rect x="20" y="72" width="26" height="26" rx="1" fill="none" class="s-orange" stroke-width="1.2"/><text x="33" y="89" font-size="10.5" text-anchor="middle">c0</text><rect x="46" y="72" width="26" height="26" rx="1" class="f-blue" fill-opacity="0.25"/><rect x="46" y="72" width="26" height="26" rx="1" fill="none" class="s-blue" stroke-width="1.2"/><text x="59" y="89" font-size="10.5" text-anchor="middle">c1</text><rect x="72" y="72" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="85" y="89" font-size="10.5" text-anchor="middle">c2</text><rect x="98" y="72" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="111" y="89" font-size="10.5" text-anchor="middle">c3</text><rect x="124" y="72" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="137" y="89" font-size="10.5" text-anchor="middle">c4</text><rect x="150" y="72" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="163" y="89" font-size="10.5" text-anchor="middle">c5</text><rect x="176" y="72" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="189" y="89" font-size="10.5" text-anchor="middle">c6</text><rect x="202" y="72" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="215" y="89" font-size="10.5" text-anchor="middle">c7</text><text x="396" y="112" font-size="11" text-anchor="middle" class="t-gray">core 1’s L1 copy of the line</text><rect x="292" y="72" width="26" height="26" rx="1" class="f-orange" fill-opacity="0.25"/><rect x="292" y="72" width="26" height="26" rx="1" fill="none" class="s-orange" stroke-width="1.2"/><text x="305" y="89" font-size="10.5" text-anchor="middle">c0</text><rect x="318" y="72" width="26" height="26" rx="1" class="f-blue" fill-opacity="0.25"/><rect x="318" y="72" width="26" height="26" rx="1" fill="none" class="s-blue" stroke-width="1.2"/><text x="331" y="89" font-size="10.5" text-anchor="middle">c1</text><rect x="344" y="72" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="357" y="89" font-size="10.5" text-anchor="middle">c2</text><rect x="370" y="72" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="383" y="89" font-size="10.5" text-anchor="middle">c3</text><rect x="396" y="72" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="409" y="89" font-size="10.5" text-anchor="middle">c4</text><rect x="422" y="72" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="435" y="89" font-size="10.5" text-anchor="middle">c5</text><rect x="448" y="72" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="461" y="89" font-size="10.5" text-anchor="middle">c6</text><rect x="474" y="72" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="487" y="89" font-size="10.5" text-anchor="middle">c7</text><line x1="232" y1="85" x2="280" y2="85" class="s-red" stroke-width="1.8"/><path d="M288 85 L280 89 L280 81 Z" class="f-red"/><line x1="288" y1="85" x2="240" y2="85" class="s-red" stroke-width="1.8"/><path d="M232 85 L240 81 L240 89 Z" class="f-red"/><text x="260" y="140" font-size="11.5" text-anchor="middle" class="t-red">every write: invalidate the other copy and transfer the whole line</text><line x1="14" y1="160" x2="506" y2="160" class="s-gray" stroke-width="0.8"/><text x="260" y="188" font-size="12.5" text-anchor="middle" font-weight="700">Padded: alignas(64) gives each counter its own line</text><rect x="20" y="198" width="208" height="30" rx="6" class="f-orange" fill-opacity="0.12"/><rect x="20" y="198" width="208" height="30" rx="6" fill="none" class="s-orange" stroke-width="1.6"/><text x="124" y="218" font-size="12" text-anchor="middle" class="t-orange" font-weight="600">Core 0 (writes c0)</text><line x1="124" y1="228" x2="124" y2="244" stroke="currentColor" stroke-width="1.4"/><text x="124" y="284" font-size="11" text-anchor="middle" class="t-gray">line A in core 0’s L1: Modified</text><rect x="20" y="244" width="26" height="26" rx="1" class="f-orange" fill-opacity="0.25"/><rect x="20" y="244" width="26" height="26" rx="1" fill="none" class="s-orange" stroke-width="1.2"/><text x="33" y="261" font-size="10.5" text-anchor="middle">c0</text><rect x="46" y="244" width="26" height="26" rx="1" class="f-gray" fill-opacity="0.08"/><rect x="46" y="244" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="59" y="261" font-size="10.5" text-anchor="middle">·</text><rect x="72" y="244" width="26" height="26" rx="1" class="f-gray" fill-opacity="0.08"/><rect x="72" y="244" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="85" y="261" font-size="10.5" text-anchor="middle">·</text><rect x="98" y="244" width="26" height="26" rx="1" class="f-gray" fill-opacity="0.08"/><rect x="98" y="244" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="111" y="261" font-size="10.5" text-anchor="middle">·</text><rect x="124" y="244" width="26" height="26" rx="1" class="f-gray" fill-opacity="0.08"/><rect x="124" y="244" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="137" y="261" font-size="10.5" text-anchor="middle">·</text><rect x="150" y="244" width="26" height="26" rx="1" class="f-gray" fill-opacity="0.08"/><rect x="150" y="244" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="163" y="261" font-size="10.5" text-anchor="middle">·</text><rect x="176" y="244" width="26" height="26" rx="1" class="f-gray" fill-opacity="0.08"/><rect x="176" y="244" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="189" y="261" font-size="10.5" text-anchor="middle">·</text><rect x="202" y="244" width="26" height="26" rx="1" class="f-gray" fill-opacity="0.08"/><rect x="202" y="244" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="215" y="261" font-size="10.5" text-anchor="middle">·</text><rect x="292" y="198" width="208" height="30" rx="6" class="f-blue" fill-opacity="0.12"/><rect x="292" y="198" width="208" height="30" rx="6" fill="none" class="s-blue" stroke-width="1.6"/><text x="396" y="218" font-size="12" text-anchor="middle" class="t-blue" font-weight="600">Core 1 (writes c1)</text><line x1="396" y1="228" x2="396" y2="244" stroke="currentColor" stroke-width="1.4"/><text x="396" y="284" font-size="11" text-anchor="middle" class="t-gray">line B in core 1’s L1: Modified</text><rect x="292" y="244" width="26" height="26" rx="1" class="f-blue" fill-opacity="0.25"/><rect x="292" y="244" width="26" height="26" rx="1" fill="none" class="s-blue" stroke-width="1.2"/><text x="305" y="261" font-size="10.5" text-anchor="middle">c1</text><rect x="318" y="244" width="26" height="26" rx="1" class="f-gray" fill-opacity="0.08"/><rect x="318" y="244" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="331" y="261" font-size="10.5" text-anchor="middle">·</text><rect x="344" y="244" width="26" height="26" rx="1" class="f-gray" fill-opacity="0.08"/><rect x="344" y="244" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="357" y="261" font-size="10.5" text-anchor="middle">·</text><rect x="370" y="244" width="26" height="26" rx="1" class="f-gray" fill-opacity="0.08"/><rect x="370" y="244" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="383" y="261" font-size="10.5" text-anchor="middle">·</text><rect x="396" y="244" width="26" height="26" rx="1" class="f-gray" fill-opacity="0.08"/><rect x="396" y="244" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="409" y="261" font-size="10.5" text-anchor="middle">·</text><rect x="422" y="244" width="26" height="26" rx="1" class="f-gray" fill-opacity="0.08"/><rect x="422" y="244" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="435" y="261" font-size="10.5" text-anchor="middle">·</text><rect x="448" y="244" width="26" height="26" rx="1" class="f-gray" fill-opacity="0.08"/><rect x="448" y="244" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="461" y="261" font-size="10.5" text-anchor="middle">·</text><rect x="474" y="244" width="26" height="26" rx="1" class="f-gray" fill-opacity="0.08"/><rect x="474" y="244" width="26" height="26" rx="1" fill="none" class="s-gray" stroke-width="0.8"/><text x="487" y="261" font-size="10.5" text-anchor="middle">·</text><text x="260" y="308" font-size="11.5" text-anchor="middle" class="t-green">no other core holds either line: every increment is an L1 hit</text><text x="260" y="324" font-size="11" text-anchor="middle" class="t-gray">(the rest of each line is padding)</text></svg>`,
          alt: 'Top: two cores each hold a copy of the same 64-byte line containing counters c0 to c7; core 0 writes c0 and core 1 writes c1, and a red double arrow shows the line bouncing between them. Bottom: with alignas(64) padding, c0 is in line A in core 0\'s cache and c1 in line B in core 1\'s cache, both Modified, with no traffic.',
          caption: 'Coherence works on whole lines. It cannot tell that the two cores write different bytes.',
        },
        {
          type: 'p',
          text: 'Step through it with MESI states. Thread 0 only ever touches `a`, thread 1 only `b`:',
        },
        {
  "type": "algo",
  "view": "array",
  "interval": 1500,
  "frames": [
    {
      "note": "Packed layout: thread 0 increments `a`, thread 1 increments `b`, and **both counters sit in line A**. Cells: core 0's and core 1's copy of line A, then of line B.",
      "array": [
        "—",
        "—",
        "—",
        "—"
      ],
      "vars": [
        [
          "line transfers",
          "0"
        ],
        [
          "invalidations",
          "0"
        ]
      ]
    },
    {
      "note": "Thread 0 increments `a`: core 0 fetches line A for ownership and holds it **Modified**.",
      "array": [
        "M",
        "—",
        "—",
        "—"
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
          "label": "a++"
        }
      ],
      "vars": [
        [
          "line transfers",
          "1"
        ],
        [
          "invalidations",
          "0"
        ]
      ]
    },
    {
      "note": "Thread 1 increments `b`. Different variable, **same line**: core 1 must take line A, so core 0's copy is invalidated and the line moves.",
      "array": [
        "I",
        "M",
        "—",
        "—"
      ],
      "marks": [
        {
          "index": 1,
          "color": "orange"
        },
        {
          "index": 0,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "b++"
        }
      ],
      "vars": [
        [
          "line transfers",
          "2"
        ],
        [
          "invalidations",
          "1"
        ]
      ]
    },
    {
      "note": "Thread 0 increments `a`. Different variable, **same line**: core 0 must take line A, so core 1's copy is invalidated and the line moves.",
      "array": [
        "M",
        "I",
        "—",
        "—"
      ],
      "marks": [
        {
          "index": 0,
          "color": "orange"
        },
        {
          "index": 1,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "a++"
        }
      ],
      "vars": [
        [
          "line transfers",
          "3"
        ],
        [
          "invalidations",
          "2"
        ]
      ]
    },
    {
      "note": "Thread 1 increments `b`. Different variable, **same line**: core 1 must take line A, so core 0's copy is invalidated and the line moves.",
      "array": [
        "I",
        "M",
        "—",
        "—"
      ],
      "marks": [
        {
          "index": 1,
          "color": "orange"
        },
        {
          "index": 0,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "b++"
        }
      ],
      "vars": [
        [
          "line transfers",
          "4"
        ],
        [
          "invalidations",
          "3"
        ]
      ]
    },
    {
      "note": "Thread 0 increments `a`. Different variable, **same line**: core 0 must take line A, so core 1's copy is invalidated and the line moves.",
      "array": [
        "M",
        "I",
        "—",
        "—"
      ],
      "marks": [
        {
          "index": 0,
          "color": "orange"
        },
        {
          "index": 1,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "a++"
        }
      ],
      "vars": [
        [
          "line transfers",
          "5"
        ],
        [
          "invalidations",
          "4"
        ]
      ]
    },
    {
      "note": "Thread 1 increments `b`. Different variable, **same line**: core 1 must take line A, so core 0's copy is invalidated and the line moves.",
      "array": [
        "I",
        "M",
        "—",
        "—"
      ],
      "marks": [
        {
          "index": 1,
          "color": "orange"
        },
        {
          "index": 0,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "b++"
        }
      ],
      "vars": [
        [
          "line transfers",
          "6"
        ],
        [
          "invalidations",
          "5"
        ]
      ]
    },
    {
      "note": "Packed: 6 transfers for 6 increments: the line ping-pongs on every write although the threads never touch each other's data. Now pad: `b` moves to line B.",
      "array": [
        "—",
        "—",
        "—",
        "—"
      ],
      "vars": [
        [
          "line transfers",
          "0"
        ],
        [
          "invalidations",
          "0"
        ]
      ]
    },
    {
      "note": "Thread 0 increments `a`: core 0 fetches line A once and holds it Modified.",
      "array": [
        "M",
        "—",
        "—",
        "—"
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
          "label": "a++"
        }
      ],
      "vars": [
        [
          "line transfers",
          "1"
        ],
        [
          "invalidations",
          "0"
        ]
      ]
    },
    {
      "note": "Thread 1 increments `b`: core 1 fetches line B once and holds it Modified.",
      "array": [
        "M",
        "—",
        "—",
        "M"
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
          "label": "b++"
        }
      ],
      "vars": [
        [
          "line transfers",
          "2"
        ],
        [
          "invalidations",
          "0"
        ]
      ]
    },
    {
      "note": "Thread 0 increments `a`: **L1 hit**. Nobody else holds line A.",
      "array": [
        "M",
        "—",
        "—",
        "M"
      ],
      "marks": [
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "a++"
        }
      ],
      "vars": [
        [
          "line transfers",
          "2"
        ],
        [
          "invalidations",
          "0"
        ]
      ]
    },
    {
      "note": "Thread 1 increments `b`: **L1 hit**. Nobody else holds line B.",
      "array": [
        "M",
        "—",
        "—",
        "M"
      ],
      "marks": [
        {
          "index": 3,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 3,
          "label": "b++"
        }
      ],
      "vars": [
        [
          "line transfers",
          "2"
        ],
        [
          "invalidations",
          "0"
        ]
      ]
    },
    {
      "note": "Thread 0 increments `a`: **L1 hit**. Nobody else holds line A.",
      "array": [
        "M",
        "—",
        "—",
        "M"
      ],
      "marks": [
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "a++"
        }
      ],
      "vars": [
        [
          "line transfers",
          "2"
        ],
        [
          "invalidations",
          "0"
        ]
      ]
    },
    {
      "note": "Thread 1 increments `b`: **L1 hit**. Nobody else holds line B.",
      "array": [
        "M",
        "—",
        "—",
        "M"
      ],
      "marks": [
        {
          "index": 3,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 3,
          "label": "b++"
        }
      ],
      "vars": [
        [
          "line transfers",
          "2"
        ],
        [
          "invalidations",
          "0"
        ]
      ]
    },
    {
      "note": "Padded: 2 transfers in total, both compulsory. From now on every increment is a private L1 hit, however many there are.",
      "vars": [
        [
          "line transfers",
          "2"
        ],
        [
          "invalidations",
          "0"
        ]
      ]
    }
  ],
  "caption": "Cells 0–1: core 0's and core 1's copy of line A. Cells 2–3: their copies of line B. Letters are MESI states. Red = just invalidated."
},
        {
          type: 'callout',
          variant: 'why',
          title: 'Why doesn\'t the hardware track bytes instead of lines?',
          text: 'Coherence state, tags and directory entries are kept per line; tracking every byte would multiply that bookkeeping by 64, and the protocol would have to merge partial lines from different cores on every transfer. Lines are the unit of caching for good reasons (the caches lesson), and coherence inherits that granularity. The consequence for software: **the unit of sharing between threads is the cache line**, not the variable.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'numeric',
      prompt: 'An array `std::atomic<long> hits[8]` starts on a 64-byte boundary. Eight threads run, and thread *t* only ever increments `hits[t]`. How many distinct cache lines do the eight threads write to?',
      answer: 1,
      unit: 'line(s)',
      hint: '`sizeof(std::atomic<long>)` is 8 on x86-64.',
      explanation:
        '8 counters × 8 bytes = 64 bytes: **one line**, written by all eight threads. Every increment needs that line in Modified state on its own core, so it bounces among eight cores, exactly as if they all incremented a single shared counter. The array looks "per-thread" in the source code but is fully shared in hardware.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'The counter-per-thread trap',
      blocks: [
        {
          type: 'p',
          text: 'False sharing is most often introduced by programmers who are *trying* to avoid contention. "Each thread gets its own slot" is the right idea; packing those slots next to each other undoes it. Counting coherence transfers for four threads, each incrementing its own counter 1000 times while the scheduler interleaves them:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>
#include <map>

// Per-line MESI-style ownership for 4 cores. We only track
// writes: a write by a core that does not own the line in M
// needs a read for ownership and invalidates other copies.
class Coherence {
public:
    void write(int core, std::uint64_t addr) {
        Owners& o = lines_[addr / 64];
        if (o.modifiedBy == core) return;          // L1 hit in M
        ++transfers;                               // RFO
        if (o.modifiedBy != kNobody) ++invalidations;
        o.modifiedBy = core;
    }
    long transfers = 0, invalidations = 0;

private:
    static constexpr int kNobody = -1;
    struct Owners {
        int modifiedBy = kNobody;
    };
    std::map<std::uint64_t, Owners> lines_;
};

// Four threads each increment their own counter 1000 times.
// The scheduler interleaves them round-robin.
Coherence run(std::uint64_t stride) {
    Coherence c;
    for (int round = 0; round < 1000; ++round) {
        for (int t = 0; t < 4; ++t) {
            c.write(t, t * stride);   // counter t lives at t*stride
        }
    }
    return c;
}

int main() {
    for (std::uint64_t stride : {8, 64}) {
        const Coherence c = run(stride);
        std::cout << "counters " << stride << " bytes apart: "
                  << c.transfers << " line transfers, "
                  << c.invalidations << " invalidations\\n";
    }
}`,
          output: "counters 8 bytes apart: 4000 line transfers, 3999 invalidations\ncounters 64 bytes apart: 4 line transfers, 0 invalidations",
          annotations: [
            { lines: '10-16', text: 'A write by a core that does not hold the line in M costs a read for ownership and invalidates the previous owner\'s copy. A write by the owner is a free L1 hit.' },
            { lines: 11, text: 'The key line: ownership is tracked per `addr / 64`, the cache line, not per variable.' },
            { lines: '31-35', text: 'Fine-grained round-robin interleaving is the worst case. Real threads run in bursts, which softens it a little but does not change the picture.' },
            { lines: 40, text: '8 bytes apart: all four counters share one line. 64 bytes apart: each has its own.' },
          ],
        },
        {
          type: 'p',
          text: 'With packed counters, **every** increment transfers the line; with spaced counters, only the first one per thread does. On real hardware the packed version of such a loop is commonly several times slower, and the gap grows with the number of threads and the distance between cores. The code is correct either way, which is what makes false sharing hard to spot: nothing fails, it is just slow, and adding threads makes it *slower*.',
        },
        {
          type: 'list',
          items: [
            '**Arrays of small per-thread structs**: stats, random-number generator states, scratch counters, per-worker flags.',
            '**Adjacent fields written by different threads**: a queue\'s `head` (written by the consumer) next to its `tail` (written by the producer).',
            '**A lock next to unrelated hot data**: every thread taking the lock invalidates the line holding the data.',
            '**Interleaved parallel loops**: thread *t* processes elements `t, t + N, t + 2N…` of an output array, so neighbouring elements, written by different threads, share lines.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'bug',
      prompt: 'Each worker thread of a job system updates only its own entry of `stats`. Profiling shows the job system gets *slower* when more workers are added. Tap the line where the layout problem is introduced.',
      code: `struct WorkerStats {
    std::uint32_t jobsDone = 0;
    std::uint32_t jobsStolen = 0;
};
WorkerStats stats[8];          // one entry per worker

void workerLoop(int id, JobQueue& queue) {
    while (Job* job = queue.pop()) {
        job->run();
        ++stats[id].jobsDone;
    }
}`,
      bugLines: [1, 5],
      hint: 'How big is one `WorkerStats`, and how many fit in 64 bytes?',
      explanation:
        'Each `WorkerStats` is 8 bytes, so all eight workers\' entries share a single 64-byte line, and every `++jobsDone` steals that line from whichever worker wrote last: classic false sharing. (Each worker writes only its own entry and nothing is read concurrently here, so there is no data race; it is purely a performance bug.) Fix the type, `struct alignas(64) WorkerStats { … };`, so each entry gets its own line, or better, keep the counters in local variables inside `workerLoop` and publish them once at the end of the frame.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Padding with alignas and hardware_destructive_interference_size',
      blocks: [
        {
          type: 'p',
          text: 'The direct fix is to give each independently written object its own line. `alignas(N)` on a type makes every object of it start on an N-byte boundary, and `sizeof` is rounded up to a multiple of N, so arrays of it get one element per line automatically. C++17 added a portable name for the right N, `std::hardware_destructive_interference_size` in `<new>`: the minimum distance between two objects to avoid false sharing.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <atomic>
#include <cstddef>
#include <iostream>
#include <new>
#include <thread>
#include <vector>

#ifdef __cpp_lib_hardware_interference_size
constexpr std::size_t kLine =
    std::hardware_destructive_interference_size;
#else
constexpr std::size_t kLine = 64;   // a safe guess for x86-64
#endif

struct PackedStats {                  // 4 counters in one line
    std::atomic<long> hits[4];
};

struct alignas(kLine) PaddedCounter { // one counter per line
    std::atomic<long> value{0};
};

struct PaddedStats {
    PaddedCounter hits[4];
};

constexpr int kThreads = 4;
constexpr long kIncrements = 1'000'000;

// Each thread increments only its own counter.
long runPacked() {
    PackedStats s{};
    {
        std::vector<std::jthread> pool;
        for (int t = 0; t < kThreads; ++t) {
            pool.emplace_back([&s, t] {
                for (long i = 0; i < kIncrements; ++i) {
                    s.hits[t].fetch_add(1, std::memory_order_relaxed);
                }
            });
        }
    }
    long total = 0;
    for (const auto& h : s.hits) total += h.load();
    return total;
}

long runPadded() {
    PaddedStats s{};
    {
        std::vector<std::jthread> pool;
        for (int t = 0; t < kThreads; ++t) {
            pool.emplace_back([&s, t] {
                for (long i = 0; i < kIncrements; ++i) {
                    s.hits[t].value.fetch_add(
                        1, std::memory_order_relaxed);
                }
            });
        }
    }
    long total = 0;
    for (const auto& h : s.hits) total += h.value.load();
    return total;
}

int main() {
    std::cout << "line size used: " << kLine << '\\n';
    std::cout << "sizeof(PackedStats) = " << sizeof(PackedStats)
              << ", sizeof(PaddedStats) = " << sizeof(PaddedStats)
              << '\\n';
    std::cout << "packed total: " << runPacked() << '\\n';
    std::cout << "padded total: " << runPadded() << '\\n';
}`,
          output: "line size used: 64\nsizeof(PackedStats) = 32, sizeof(PaddedStats) = 256\npacked total: 4000000\npadded total: 4000000",
          annotations: [
            { lines: '8-13', text: 'Not every toolchain provides the constant (GCC 12+ and MSVC do; Clang only gained support recently), so test the library feature macro and fall back to 64.' },
            { lines: '15-17', text: 'Four 8-byte atomics: 32 bytes, all in one line.' },
            { lines: '19-21', text: '`alignas(kLine)` on the type pads each counter to a full line, so `sizeof(PaddedCounter)` is 64: 8 bytes of counter, 56 of padding.' },
            { lines: '23-25', text: 'An array of padded counters: four lines, 256 bytes, one per thread.' },
            { lines: '71-72', text: 'Both versions compute the same totals, because false sharing never changes results. Only the time differs, and timings are deliberately not printed: they vary by machine and run.' },
          ],
        },
        {
          type: 'p',
          text: 'GCC (13.3 here) also warns when the constant is used in a **header**, because its value is a compiler guess for the target CPU and could differ between translation units compiled with different flags, silently changing a struct\'s layout:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ -std=c++20 -Wall (struct in a header)',
          code: `warning: use of 'std::hardware_destructive_interference_size' [-Winterference-size]
note: its value can vary between compiler versions or with different '-mtune' or '-mcpu' flags
note: if this use is part of a public ABI, change it to instead use a constant variable you define
note: the default value for the current CPU tuning is 64 bytes`,
          annotations: [
            { lines: 1, text: 'Real output from g++ 13.3. Many engines simply define their own `constexpr std::size_t kCacheLine = 64;` in a core header and use it everywhere.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: '64 or 128?',
          text: 'Lines are 64 bytes on x86 and most ARM cores, but Intel\'s L2 **spatial prefetcher** fetches lines in 128-byte-aligned pairs, which can make neighbouring lines interfere, and Apple\'s M-series cores use 128-byte lines. Some libraries therefore pad to 128 bytes on these platforms (Rust\'s crossbeam does on x86-64 and AArch64). There is also `std::hardware_constructive_interference_size`: the maximum size of data you want to **keep together** in one line, the opposite goal.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Padding costs memory and cache',
          text: 'A padded 8-byte counter uses 64 bytes. Pad only data that different threads **write** frequently. Padding read-mostly data wastes cache space for nothing, since read-shared lines sit happily in S state in every core. Since C++17, `new`, `std::make_unique` and `std::vector` honour over-aligned types, so `std::vector<PaddedCounter>` gets properly aligned elements.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'fill',
      prompt: 'Complete the per-worker counter so no two workers\' counters ever share a 64-byte line.',
      template: `struct ___(64) WorkerCounter {
    std::atomic<long> value{0};
};
static_assert(sizeof(WorkerCounter) == ___);

std::vector<WorkerCounter> counters(numWorkers);`,
      blanks: [{ answers: ['alignas'] }, { answers: ['64'] }],
      wordBank: ['alignas', 'alignof', 'volatile', 'packed', '64', '8', '16'],
      explanation:
        '`alignas(64)` makes every `WorkerCounter` start on a line boundary, and `sizeof` is rounded up to a multiple of its alignment, so it becomes **64** (8 bytes of counter and 56 of padding). Consecutive vector elements therefore occupy separate lines. `alignof` only *queries* alignment, `volatile` has nothing to do with layout, and "packed" is the opposite of what we want.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Better than padding: don\'t share at all',
      blocks: [
        {
          type: 'p',
          text: 'Padding treats the symptom. The cheapest shared write is the one you never make, so design the data flow first:',
        },
        {
          type: 'list',
          items: [
            '**Accumulate locally, publish once**: a counter in a local variable lives in a register. Combine per-thread results at the end of the job or frame, as in the previous lesson.',
            '**Partition data in contiguous chunks**: give each thread a large, contiguous range of an output array. Threads then share at most the line at each chunk boundary.',
            '**Group data by writer**: fields written by the producer in one line, fields written by the consumer in another, read-only configuration in a third.',
            '**Keep per-thread state per thread**: `thread_local` variables or per-worker objects allocated separately are naturally apart.',
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Interleaved: neighbours written by different threads',
            tone: 'bad',
            code: `// thread t handles i = t, t + T, t + 2T, ...
for (std::size_t i = t; i < n; i += T) {
    out[i] = shade(in[i]);
}`,
            text: 'With 4-byte elements and 4 threads, each 64-byte line of `out` is written by all four threads: false sharing on almost every store.',
          },
          right: {
            title: 'Chunked: each thread owns a contiguous range',
            tone: 'good',
            code: `// thread t handles [t * n / T, (t + 1) * n / T)
const std::size_t begin = t * n / T;
const std::size_t end = (t + 1) * n / T;
for (std::size_t i = begin; i < end; ++i) {
    out[i] = shade(in[i]);
}`,
            text: 'Only the lines at the boundaries between ranges can be shared. Each thread also streams through memory sequentially, which the prefetcher loves.',
          },
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'In engines',
          text: 'Job systems split `parallel_for` ranges into contiguous batches for exactly these reasons, and well-written lock-free queues place their producer and consumer indices on separate lines. The memory models lesson builds such a queue. When you write per-worker data structures for an engine, give each worker\'s hot data its own lines from the start; retrofitting it after a profiler finds the problem is much harder.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'Four threads fill `std::vector<float> brightness(1\'000\'000)`. Which partitioning avoids false sharing best?',
      options: [
        {
          text: 'Thread t writes the elements where `i % 4 == t`',
          why: 'Neighbouring floats belong to different threads, so every 64-byte line (16 floats) is written by all four threads: maximal false sharing.',
        },
        {
          text: 'Thread t writes the contiguous range `[t * 250000, (t + 1) * 250000)`',
          correct: true,
          why: 'Each thread owns 250,000 consecutive floats. At most the three lines at the range boundaries could be touched by two threads, and if the buffer starts on a line boundary, not even those are, because 250,000 × 4 bytes is a multiple of 64.',
        },
        {
          text: 'Each thread writes one element at a time, chosen from a shared atomic index with `fetch_add(1)`',
          why: 'That adds true sharing on the index, every element, and still interleaves neighbouring elements across threads.',
        },
        {
          text: 'It does not matter, because each element is written by exactly one thread',
          why: 'Correctness does not depend on it, but performance does: coherence operates on lines, not elements.',
        },
      ],
      explanation:
        'Contiguous chunks give each thread whole lines of its own and sequential access. Atomic work-stealing indices are fine for coarse tasks, but they should hand out *batches* of elements (say, 1,024 at a time), not single ones.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Detecting false sharing',
      blocks: [
        {
          type: 'p',
          text: 'False sharing leaves no wrong output and no crash. Suspect it when a parallel section **scales badly**, getting slower or barely faster as you add threads, even though the threads do not logically share data. Then confirm it with tools that watch coherence traffic.',
        },
        {
          type: 'code',
          lang: 'shell',
          code: `# Linux: record cache-to-cache transfers ("c2c")
perf c2c record -- ./game --benchmark
perf c2c report --stdio`,
          annotations: [
            { lines: 2, text: '`perf c2c` samples loads and stores with their data addresses, using the CPU\'s precise sampling features.' },
            { lines: 3, text: 'The report lists the most contended cache lines, ranked by **HITM** events (a load that hit a line held Modified in another core\'s cache), with the byte offsets within each line, the code locations that touched them, and which CPUs did. Several threads hitting *different offsets* of one line is the signature of false sharing.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Intel VTune Profiler**: the Memory Access and Microarchitecture Exploration analyses flag contested accesses and attribute them to source lines.',
            '**AMD uProf** and console profilers expose equivalent coherence events.',
            '**Code review**: look for arrays indexed by thread or worker ID, structs whose fields are written by different threads, and atomics declared next to each other.',
            '**Experiment**: add `alignas(64)` to the suspect type. If the parallel section suddenly scales, you found it.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Sanitizers will not find it',
          text: 'ThreadSanitizer reports **data races**, and false sharing is not a race: each variable is accessed by one thread only. Correct but slow code is invisible to correctness tools; only performance tools and measurements reveal it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'truefalse',
      prompt: 'Two threads that write different `int` variables sharing a cache line, with no synchronization, cause a data race and therefore undefined behavior.',
      answer: false,
      explanation:
        'A data race in C++ requires two accesses to the **same memory location** (and at least one write, without synchronization). Different `int` objects are different memory locations, even in the same cache line or the same struct, so the program is correct: the hardware\'s coherence protocol keeps each byte right. The only effect is speed. (Adjacent **bit-fields** are the exception: they can share one memory location, so writing neighbouring bit-fields from two threads *is* a data race.)',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'numeric',
      prompt: 'An engine pads each worker\'s hot counters to **128 bytes** to also avoid interference from Intel\'s paired-line prefetcher. How many bytes does an array of 16 such padded counters occupy?',
      answer: 2048,
      unit: 'bytes',
      explanation:
        '16 × 128 = **2,048 bytes** (2 KiB) to hold 16 counters of 8 bytes, which would fit in 128 bytes unpadded. That is a good trade for a handful of hot, frequently written per-worker values, and a terrible one for large arrays of data, which is why padding is reserved for small, write-heavy, per-thread state.',
    },
  ],
  takeaways: [
    'Coherence works on whole cache lines, so threads writing different variables in the same line make it bounce: false sharing.',
    'Packed per-thread counters, adjacent producer/consumer fields and interleaved output partitions are the classic causes.',
    'Pad hot, frequently written per-thread data with `alignas(64)` or `std::hardware_destructive_interference_size` (with a fallback, and your own constant in headers); some platforms warrant 128 bytes.',
    'Better still, avoid sharing: accumulate locally, partition into contiguous chunks, and group fields by the thread that writes them.',
    'False sharing is not a data race; correctness tools miss it. Find it through poor scaling, `perf c2c` HITM reports and VTune.',
  ],
  reading: [
    {
      title: 'std::hardware_destructive_interference_size',
      url: 'https://en.cppreference.com/w/cpp/thread/hardware_destructive_interference_size',
      source: 'cppreference',
      note: 'Both interference-size constants, their intent, and an example of padding with them.',
    },
    {
      title: 'False sharing',
      url: 'https://en.wikipedia.org/wiki/False_sharing',
      source: 'article',
      note: 'A concise definition with an example and the standard mitigations.',
    },
    {
      title: 'alignas specifier',
      url: 'https://en.cppreference.com/w/cpp/language/alignas',
      source: 'cppreference',
      note: 'The rules for over-aligned types, including how they affect `sizeof` and arrays.',
    },
    {
      title: 'What Every Programmer Should Know About Memory',
      url: 'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf',
      source: 'article',
      note: 'Section 6.4 measures the cost of false sharing and discusses how to lay out data for multi-threaded code.',
    },
  ],
};
