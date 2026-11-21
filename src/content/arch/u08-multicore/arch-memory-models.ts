import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-memory-models',
  title: 'Memory Models and Atomics',
  summary:
    'Why cores see each other\'s memory operations out of order: store buffers, sequential consistency vs x86-TSO and ARM\'s weak ordering, and how the C++ memory model, memory orders and fences turn into real instructions. Plus why volatile is not for threads.',
  minutes: 26,
  objectives: [
    'Explain how store buffers let a core\'s later loads overtake its earlier stores',
    'Define sequential consistency and use litmus tests to compare it with x86-TSO and ARM\'s weaker ordering',
    'Use `std::atomic` with `relaxed`, `acquire`, `release` and `seq_cst` correctly, including the message-passing pattern',
    'Read the instructions compilers emit for each memory order on x86-64 and AArch64, and use fences',
    'Explain why `volatile` provides neither atomicity nor inter-thread ordering',
    'Build a lock-free single-producer, single-consumer queue with acquire/release',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Store buffers: why stores are late',
      blocks: [
        {
          type: 'p',
          text: 'The C++ Fundamentals lesson on atomics said that "compilers and CPUs reorder memory operations". Here is the main hardware reason. A store to a line that is not in Modified state needs a read for ownership, which can take 100 ns or more. Stalling the core until it completes would waste hundreds of cycles per store, so every modern core puts stores into a **[[store-buffer]]**: a small FIFO queue between the core and its L1 cache. The core moves on immediately; the buffer drains into the cache in program order as lines become available.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 260" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="10" width="228" height="34" rx="6" class="f-orange" fill-opacity="0.14"/><rect x="20" y="10" width="228" height="34" rx="6" fill="none" class="s-orange" stroke-width="1.6"/><text x="134" y="32" font-size="12.5" text-anchor="middle" class="t-orange" font-weight="700">Core 0</text><rect x="30" y="76" width="34" height="24" rx="2" class="f-purple" fill-opacity="0.18"/><rect x="30" y="76" width="34" height="24" rx="2" fill="none" class="s-purple" stroke-width="1.2"/><text x="47" y="92" font-size="11" text-anchor="middle">x=1</text><rect x="64" y="76" width="34" height="24" rx="2" class="f-purple" fill-opacity="0.18"/><rect x="64" y="76" width="34" height="24" rx="2" fill="none" class="s-purple" stroke-width="1.2"/><text x="81" y="92" font-size="11" text-anchor="middle">a=5</text><rect x="98" y="76" width="34" height="24" rx="2" fill="none" class="s-purple" stroke-width="1.2"/><text x="138" y="86" font-size="10.5" text-anchor="start" class="t-purple">store</text><text x="138" y="99" font-size="10.5" text-anchor="start" class="t-purple">buffer</text><line x1="47" y1="44" x2="47" y2="67" class="s-purple" stroke-width="1.6"/><path d="M47 75 L43 67 L51 67 Z" class="f-purple"/><text x="53" y="62" font-size="10.5" text-anchor="start" class="t-purple">stores</text><line x1="47" y1="100" x2="47" y2="127" class="s-purple" stroke-width="1.6"/><path d="M47 135 L43 127 L51 127 Z" class="f-purple"/><text x="53" y="124" font-size="10.5" text-anchor="start" class="t-purple">drains later, oldest first</text><line x1="226" y1="44" x2="226" y2="127" class="s-green" stroke-width="1.6"/><path d="M226 135 L222 127 L230 127 Z" class="f-green"/><text x="221" y="62" font-size="10.5" text-anchor="end" class="t-green">loads</text><rect x="20" y="136" width="228" height="30" rx="6" class="f-teal" fill-opacity="0.14"/><rect x="20" y="136" width="228" height="30" rx="6" fill="none" class="s-teal" stroke-width="1.6"/><text x="134" y="156" font-size="11.5" text-anchor="middle" font-weight="600">L1 data cache (core 0)</text><line x1="134" y1="166" x2="134" y2="184" stroke="currentColor" stroke-width="1.4"/><rect x="272" y="10" width="228" height="34" rx="6" class="f-blue" fill-opacity="0.14"/><rect x="272" y="10" width="228" height="34" rx="6" fill="none" class="s-blue" stroke-width="1.6"/><text x="386" y="32" font-size="12.5" text-anchor="middle" class="t-blue" font-weight="700">Core 1</text><rect x="282" y="76" width="34" height="24" rx="2" class="f-purple" fill-opacity="0.18"/><rect x="282" y="76" width="34" height="24" rx="2" fill="none" class="s-purple" stroke-width="1.2"/><text x="299" y="92" font-size="11" text-anchor="middle">y=1</text><rect x="316" y="76" width="34" height="24" rx="2" fill="none" class="s-purple" stroke-width="1.2"/><rect x="350" y="76" width="34" height="24" rx="2" fill="none" class="s-purple" stroke-width="1.2"/><text x="390" y="86" font-size="10.5" text-anchor="start" class="t-purple">store</text><text x="390" y="99" font-size="10.5" text-anchor="start" class="t-purple">buffer</text><line x1="299" y1="44" x2="299" y2="67" class="s-purple" stroke-width="1.6"/><path d="M299 75 L295 67 L303 67 Z" class="f-purple"/><text x="305" y="62" font-size="10.5" text-anchor="start" class="t-purple">stores</text><line x1="299" y1="100" x2="299" y2="127" class="s-purple" stroke-width="1.6"/><path d="M299 135 L295 127 L303 127 Z" class="f-purple"/><text x="305" y="124" font-size="10.5" text-anchor="start" class="t-purple">drains later, oldest first</text><line x1="478" y1="44" x2="478" y2="127" class="s-green" stroke-width="1.6"/><path d="M478 135 L474 127 L482 127 Z" class="f-green"/><text x="473" y="62" font-size="10.5" text-anchor="end" class="t-green">loads</text><rect x="272" y="136" width="228" height="30" rx="6" class="f-teal" fill-opacity="0.14"/><rect x="272" y="136" width="228" height="30" rx="6" fill="none" class="s-teal" stroke-width="1.6"/><text x="386" y="156" font-size="11.5" text-anchor="middle" font-weight="600">L1 data cache (core 1)</text><line x1="386" y1="166" x2="386" y2="184" stroke="currentColor" stroke-width="1.4"/><rect x="20" y="184" width="480" height="30" rx="6" class="f-gray" fill-opacity="0.12"/><rect x="20" y="184" width="480" height="30" rx="6" fill="none" class="s-gray" stroke-width="1.6"/><text x="260" y="204" font-size="11.5" text-anchor="middle" font-weight="600">coherent memory system: other L1s, L2, L3, DRAM</text><text x="260" y="236" font-size="11" text-anchor="middle" class="t-green">A load first checks its own core’s store buffer (store-to-load forwarding), then L1.</text><text x="260" y="252" font-size="11" text-anchor="middle" class="t-purple">Other cores cannot see a store until it drains from the buffer into the cache.</text></svg>`,
          alt: 'Two cores. Each core\'s stores go into its own store buffer, a small FIFO that later drains into that core\'s L1 cache; loads go to the L1 cache but first check the core\'s own store buffer. Both L1 caches connect to the coherent memory system.',
          caption: 'Each core sees its own pending stores at once (forwarding); other cores see them only after they drain.',
        },
        {
          type: 'p',
          text: 'A load must still see the core\'s own earlier stores, so it first searches the store buffer and takes the newest matching value: **store-to-load forwarding**. Single-threaded code therefore never notices the buffer. But there is a gap: a store sits in the buffer, visible to its own core and invisible to everyone else, while that core\'s *later loads* go straight to the cache. From another core\'s point of view, the load happened **before** the store. Caches stay perfectly coherent throughout; it is the *order* of operations on different addresses that changed.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just wait for each store?',
          text: 'Stores are common (roughly one instruction in ten), and many of them miss or need ownership. An in-order wait would cap performance at the memory latency. With a store buffer of a few dozen to over a hundred entries, a core can run far ahead of its stores, which is a big part of why out-of-order cores perform as they do. The price is a weaker memory ordering guarantee, which software must deal with explicitly when threads communicate.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'Core 0 executes `x = 1;` followed immediately by `int a = x;`. The store is still in core 0\'s store buffer when the load executes. What value does `a` get, and what does core 1 see if it reads `x` at that same moment (initially 0)?',
      options: [
        {
          text: '`a == 1`, while core 1 may still read 0',
          correct: true,
          why: 'Store-to-load forwarding gives core 0 its own pending value. Core 1 reads from the coherent caches, which do not have the store yet.',
        },
        {
          text: '`a == 0` and core 1 reads 0, because the store has not reached the cache',
          why: 'That would break single-threaded programs: a core must always see its own stores in program order. Forwarding guarantees it.',
        },
        {
          text: '`a == 1` and core 1 reads 1, because coherence makes the store visible everywhere at once',
          why: 'Coherence applies to the caches. A store in the store buffer has not reached the cache yet, so it is not visible to other cores.',
        },
        {
          text: 'The load stalls until the store buffer has fully drained',
          why: 'Waiting would defeat the purpose of the buffer. Forwarding answers the load from the buffer immediately.',
        },
      ],
      explanation:
        'The store buffer creates two views of memory: the core\'s own (including pending stores) and everyone else\'s (only drained stores). Every visible reordering on x86 comes from this one mechanism.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Sequential consistency and the store-buffering test',
      blocks: [
        {
          type: 'p',
          text: 'The simplest memory model, defined by Leslie Lamport in 1979, is **[[sequential-consistency]] (SC)**: the result of any execution is as if all threads\' operations were interleaved into one sequence, with each thread\'s operations in program order. It is how most people imagine threads. Hardware architects and language designers test models with tiny programs called **litmus tests**. The most famous is *store buffering* (SB):',
        },
        {
  "type": "algo",
  "view": "array",
  "interval": 1800,
  "frames": [
    {
      "note": "`x` and `y` start at 0 in memory (the coherent caches). Cells: core 0's store buffer, core 1's store buffer, `x`, `y`, and the registers `r1`, `r2`.",
      "array": [
        "—",
        "—",
        "x=0",
        "y=0",
        "r1=?",
        "r2=?"
      ],
      "marks": [],
      "lines": []
    },
    {
      "note": "Core 0 executes `x = 1`. The store goes into core 0's **store buffer**, while the cache fetches line `x` for ownership. Core 0 does not wait.",
      "array": [
        "x=1",
        "—",
        "x=0",
        "y=0",
        "r1=?",
        "r2=?"
      ],
      "marks": [
        {
          "index": 0,
          "color": "purple"
        }
      ],
      "lines": [
        2
      ],
      "pointers": [
        {
          "index": 0,
          "label": "core 0"
        }
      ]
    },
    {
      "note": "Core 1 executes `y = 1`: likewise parked in core 1's store buffer.",
      "array": [
        "x=1",
        "y=1",
        "x=0",
        "y=0",
        "r1=?",
        "r2=?"
      ],
      "marks": [
        {
          "index": 0,
          "color": "purple"
        },
        {
          "index": 1,
          "color": "purple"
        }
      ],
      "lines": [
        5
      ],
      "pointers": [
        {
          "index": 1,
          "label": "core 1"
        }
      ]
    },
    {
      "note": "Core 0 executes `r1 = y`. Its own store buffer has no `y`, so it reads the cache: `y` is still **0**. The load has passed the older store to `x`.",
      "array": [
        "x=1",
        "y=1",
        "x=0",
        "y=0",
        "r1=0",
        "r2=?"
      ],
      "marks": [
        {
          "index": 0,
          "color": "purple"
        },
        {
          "index": 1,
          "color": "purple"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 4,
          "color": "orange"
        }
      ],
      "lines": [
        3
      ],
      "pointers": [
        {
          "index": 3,
          "label": "core 0 reads"
        }
      ]
    },
    {
      "note": "Core 1 executes `r2 = x`: core 0's `x = 1` is still sitting in core 0's buffer, invisible to core 1. `x` reads **0**.",
      "array": [
        "x=1",
        "y=1",
        "x=0",
        "y=0",
        "r1=0",
        "r2=0"
      ],
      "marks": [
        {
          "index": 0,
          "color": "purple"
        },
        {
          "index": 1,
          "color": "purple"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "orange"
        }
      ],
      "lines": [
        6
      ],
      "pointers": [
        {
          "index": 2,
          "label": "core 1 reads"
        }
      ]
    },
    {
      "note": "Core 0's store buffer drains: `x = 1` reaches the cache and becomes visible to everyone.",
      "array": [
        "—",
        "y=1",
        "x=1",
        "y=0",
        "r1=0",
        "r2=0"
      ],
      "marks": [
        {
          "index": 1,
          "color": "purple"
        },
        {
          "index": 2,
          "color": "green"
        }
      ],
      "lines": []
    },
    {
      "note": "Core 1's buffer drains too: `y = 1`.",
      "array": [
        "—",
        "—",
        "x=1",
        "y=1",
        "r1=0",
        "r2=0"
      ],
      "marks": [
        {
          "index": 3,
          "color": "green"
        }
      ],
      "lines": []
    },
    {
      "note": "**r1 = 0 and r2 = 0.** In any interleaving of the four statements, one store comes before the other thread's load, so sequential consistency forbids this outcome. x86 really produces it: each core's store→load order was relaxed by its store buffer.",
      "array": [
        "—",
        "—",
        "x=1",
        "y=1",
        "r1=0",
        "r2=0"
      ],
      "marks": [
        {
          "index": 4,
          "color": "red"
        },
        {
          "index": 5,
          "color": "red"
        }
      ],
      "lines": []
    },
    {
      "note": "Again, with a **full fence** (`mfence`, or a `seq_cst` store, which GCC compiles to `xchg`) between each thread's store and load.",
      "array": [
        "—",
        "—",
        "x=0",
        "y=0",
        "r1=?",
        "r2=?"
      ],
      "marks": [],
      "lines": []
    },
    {
      "note": "Core 0: `x = 1` enters its store buffer.",
      "array": [
        "x=1",
        "—",
        "x=0",
        "y=0",
        "r1=?",
        "r2=?"
      ],
      "marks": [
        {
          "index": 0,
          "color": "purple"
        }
      ],
      "lines": [
        2
      ],
      "pointers": [
        {
          "index": 0,
          "label": "core 0"
        }
      ]
    },
    {
      "note": "Core 1: `y = 1` enters its store buffer.",
      "array": [
        "x=1",
        "y=1",
        "x=0",
        "y=0",
        "r1=?",
        "r2=?"
      ],
      "marks": [
        {
          "index": 0,
          "color": "purple"
        },
        {
          "index": 1,
          "color": "purple"
        }
      ],
      "lines": [
        5
      ],
      "pointers": [
        {
          "index": 1,
          "label": "core 1"
        }
      ]
    },
    {
      "note": "Core 0 reaches the fence: it may not load until its store buffer has **drained**. `x = 1` becomes visible.",
      "array": [
        "—",
        "y=1",
        "x=1",
        "y=0",
        "r1=?",
        "r2=?"
      ],
      "marks": [
        {
          "index": 1,
          "color": "purple"
        },
        {
          "index": 2,
          "color": "green"
        }
      ],
      "lines": []
    },
    {
      "note": "Core 1's fence drains its buffer: `y = 1` becomes visible.",
      "array": [
        "—",
        "—",
        "x=1",
        "y=1",
        "r1=?",
        "r2=?"
      ],
      "marks": [
        {
          "index": 3,
          "color": "green"
        }
      ],
      "lines": []
    },
    {
      "note": "Core 0 loads `y`: **1**.",
      "array": [
        "—",
        "—",
        "x=1",
        "y=1",
        "r1=1",
        "r2=?"
      ],
      "marks": [
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 4,
          "color": "orange"
        }
      ],
      "lines": [
        3
      ],
      "pointers": [
        {
          "index": 3,
          "label": "core 0 reads"
        }
      ]
    },
    {
      "note": "Core 1 loads `x`: **1**. With the fences, whichever store drains first is visible to the other thread's later load, so `r1 = r2 = 0` can no longer happen. The price: each core stalled until its buffer emptied.",
      "array": [
        "—",
        "—",
        "x=1",
        "y=1",
        "r1=1",
        "r2=1"
      ],
      "marks": [
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "orange"
        }
      ],
      "lines": [
        6
      ],
      "pointers": [
        {
          "index": 2,
          "label": "core 1 reads"
        }
      ]
    }
  ],
  "code": "// Thread 0 on core 0\nx = 1;\nr1 = y;\n// Thread 1 on core 1\ny = 1;\nr2 = x;",
  "caption": "The store-buffering litmus test. Purple = a store waiting in a store buffer, green = a store becoming visible, orange = a register being loaded."
},
        {
          type: 'p',
          text: 'You can check such claims mechanically. This tiny model checker runs two threads in **every** possible order, once under SC and once with per-core store buffers (x86\'s model), and collects every reachable result:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <set>
#include <utility>
#include <vector>

// A tiny model checker: run two 2-instruction threads in every
// possible order and collect the final values of r1 and r2.
struct Instr {
    bool store;   // true: mem[var] = value; false: reg = mem[var]
    int var, value, reg;
};
using Thread = std::vector<Instr>;
using Outcome = std::pair<int, int>;

struct State {
    int mem[2] = {0, 0};
    int reg[2] = {0, 0};
    std::size_t pc[2] = {0, 0};
    std::vector<std::pair<int, int>> buffer[2];   // pending stores
};

void explore(const Thread (&t)[2], const State& s, bool tso,
             std::set<Outcome>& out) {
    bool finished = true;
    for (int c = 0; c < 2; ++c) {
        if (s.pc[c] < t[c].size()) {            // next instruction
            finished = false;
            State n = s;
            const Instr& in = t[c][n.pc[c]++];
            if (in.store && tso) {
                n.buffer[c].push_back({in.var, in.value});
            } else if (in.store) {
                n.mem[in.var] = in.value;
            } else {
                n.reg[in.reg] = n.mem[in.var];
                for (const auto& [var, value] : n.buffer[c]) {
                    if (var == in.var) n.reg[in.reg] = value;
                }
            }
            explore(t, n, tso, out);
        }
        if (!s.buffer[c].empty()) {             // drain oldest store
            finished = false;
            State n = s;
            const auto [var, value] = n.buffer[c].front();
            n.buffer[c].erase(n.buffer[c].begin());
            n.mem[var] = value;
            explore(t, n, tso, out);
        }
    }
    if (finished) out.insert({s.reg[0], s.reg[1]});
}

void test(const char* name, const Thread (&t)[2]) {
    std::cout << name << '\\n';
    for (bool tso : {false, true}) {
        std::set<Outcome> out;
        explore(t, State{}, tso, out);
        std::cout << (tso ? "  x86-TSO:   " : "  SC:        ");
        for (const auto& [r1, r2] : out) {
            std::cout << " (" << r1 << ',' << r2 << ')';
        }
        std::cout << '\\n';
    }
}

int main() {
    const int x = 0, y = 1;                     // variable indices
    const Thread sb[2] = {{{true, x, 1, 0}, {false, y, 0, 0}},
                          {{true, y, 1, 0}, {false, x, 0, 1}}};
    test("SB: x=1; r1=y  ||  y=1; r2=x", sb);
    const Thread mp[2] = {{{true, x, 1, 0}, {true, y, 1, 0}},
                          {{false, y, 0, 0}, {false, x, 0, 1}}};
    test("MP: x=1; y=1   ||  r1=y; r2=x", mp);
}`,
          output: "SB: x=1; r1=y  ||  y=1; r2=x\n  SC:         (0,1) (1,0) (1,1)\n  x86-TSO:    (0,0) (0,1) (1,0) (1,1)\nMP: x=1; y=1   ||  r1=y; r2=x\n  SC:         (0,0) (0,1) (1,1)\n  x86-TSO:    (0,0) (0,1) (1,1)",
          annotations: [
            { lines: '25-41', text: 'Step 1 of the search: let core `c` execute its next instruction. Under TSO a store goes into the core\'s buffer; a load reads memory but prefers the newest matching buffered store (forwarding).' },
            { lines: '42-49', text: 'Step 2: let core `c`\'s oldest buffered store drain to memory. Exploring both kinds of step from every state covers every possible timing.' },
            { lines: 51, text: 'When both threads have finished and both buffers are empty, record the registers.' },
            { lines: '69-71', text: 'SB: each thread stores one variable and loads the other.' },
            { lines: '72-74', text: 'MP (message passing): thread 0 writes data `x`, then the flag `y`; thread 1 reads the flag, then the data.' },
          ],
        },
        {
          type: 'p',
          text: 'SB under TSO gains exactly one result, `(0,0)`, the one sequential consistency forbids. MP gains nothing: with FIFO store buffers, if the flag `y = 1` is visible then `x = 1`, stored earlier, drained earlier. So on x86, `(r1,r2) = (1,0)` in MP is impossible in hardware. Remember that; ARM is different.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Classic locks break here',
          text: 'Dekker\'s and Peterson\'s mutual-exclusion algorithms are exactly the SB pattern: "set my flag, then check yours". Written with plain variables (or C++ atomics weaker than `seq_cst`) they fail on x86, letting both threads enter the critical section. Textbook concurrency algorithms assume SC; real hardware does not provide it unless you ask.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'numeric',
      prompt: 'In the store-buffering test (`x = 1; r1 = y;` in parallel with `y = 1; r2 = x;`, everything starting at 0), how many distinct `(r1, r2)` results are possible under **sequential consistency**?',
      answer: 3,
      unit: 'results',
      hint: 'List the interleavings: in which ones can a load run before *both* stores?',
      explanation:
        'Under SC, each thread\'s store comes before its own load, so the first operation of any interleaving is a store, and the other thread\'s load comes after it: at least one register must read 1. The possible results are **(0,1), (1,0) and (1,1)**: three. x86-TSO adds (0,0) for four, which is exactly what the model checker printed.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'What real hardware does: x86-TSO vs ARM',
      blocks: [
        {
          type: 'p',
          text: 'Each architecture defines a **[[memory-consistency-model]]**: which reorderings of memory operations to *different* addresses other cores may observe. Two operations are involved in each case, an earlier one and a later one in program order:',
        },
        {
          type: 'table',
          headers: ['Can the later operation become visible first?', 'SC', 'x86-64 ([[x86-tso|TSO]])', 'ARMv8 (AArch64)'],
          rows: [
            ['Load → later load', 'No', 'No', 'Yes'],
            ['Load → later store', 'No', 'No', 'Yes'],
            ['Store → later store', 'No', 'No', 'Yes'],
            ['Store → later load', 'No', '**Yes** (store buffer)', 'Yes'],
            ['Own stores seen early (forwarding)', '—', 'Yes', 'Yes'],
          ],
          caption: 'x86 relaxes only store→load order. ARM relaxes all four unless the code uses barriers, acquire/release instructions or dependencies.',
        },
        {
          type: 'p',
          text: 'x86\'s model is called **total store order (TSO)**: all cores agree on a single order of all stores, and the only visible reordering comes from store buffers. ARM (and RISC-V\'s default model, and IBM POWER) are **weakly ordered**: out-of-order cores may let loads and stores to different addresses complete and become visible in almost any order, which saves hardware and power. Programs that need ordering must say so with special instructions.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why game code that "worked" breaks on ARM',
          text: 'Lots of hand-rolled threading code is accidentally correct on x86, because TSO provides MP-style ordering for free. Port it to the Nintendo Switch, a phone or an Apple Silicon Mac, and a flag can become visible before the data it guards. Apple even built a hardware TSO mode into its M-series cores so that Rosetta 2 can run x86 programs without inserting fences everywhere: a measure of how much real code depends on x86 ordering.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The compiler reorders too',
          text: 'Even on x86, the *compiler* may reorder, merge or delete ordinary loads and stores as long as a single thread cannot tell (the as-if rule), or keep a value in a register and never reload it. Correct concurrent C++ cannot be written against the hardware model alone; it must be written against the C++ memory model, which constrains both the compiler and the hardware.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'On x86-64, other cores never observe one core\'s two loads (to different addresses) as reordered with each other.',
      answer: true,
      explanation:
        'Under x86-TSO, loads are not reordered with older loads, and stores are not reordered with older stores or older loads; only a later load may pass an earlier store. (Internally, x86 cores *do* execute loads out of order, but they detect when another core\'s write could expose that and replay the loads, so the architectural guarantee holds.) On ARMv8 the same two loads may be observed out of order unless ordered by an acquire load, a barrier or an address dependency.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'The C++ memory model: atomics and orders',
      blocks: [
        {
          type: 'p',
          text: 'C++11 gave the language its own memory model, so portable code no longer depends on any CPU\'s rules. Its core rule: a **[[data-race]]** (two threads accessing the same non-atomic location, at least one writing, without [[happens-before]] ordering) is **undefined behavior**. [[atomic|`std::atomic`]] operations never race, and each takes a [[memory-order]] that says how it orders *surrounding* memory operations:',
        },
        {
          type: 'table',
          headers: ['Order', 'Guarantees', 'Use for'],
          rows: [
            ['`relaxed`', 'Atomicity only; no ordering of other accesses', 'Statistics counters, IDs, values read after `join()`'],
            ['`release` (stores)', 'No earlier read or write may move after this store', 'Publishing data: the "flag" store'],
            ['`acquire` (loads)', 'No later read or write may move before this load', 'Consuming data: the "flag" load'],
            ['`acq_rel` (RMW)', 'Both, for read-modify-write operations', 'Lock handoffs, reference count decrements'],
            ['`seq_cst` (default)', 'Acquire/release plus one global order of all `seq_cst` operations that every thread agrees on', 'Anything SB-shaped, and whenever in doubt'],
          ],
        },
        {
          type: 'p',
          text: 'The central pattern is **message passing**: a release store **synchronizes with** an acquire load that reads the value it stored, and from then on, everything the writer did before the store happens-before everything the reader does after the load. This is the MP litmus test, made portable:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <atomic>
#include <iostream>
#include <string>
#include <thread>

struct LevelInfo {                     // ordinary, non-atomic data
    std::string name;
    int enemies = 0;
    float gravity = 0.0f;
};

LevelInfo info;
std::atomic<bool> published{false};

void loader() {
    info.name = "Frozen Depot";        // (1) plain writes
    info.enemies = 37;
    info.gravity = 9.81f;
    published.store(true, std::memory_order_release);   // (2)
}

void gameplay() {
    while (!published.load(std::memory_order_acquire)) {  // (3)
        std::this_thread::yield();
    }
    std::cout << info.name << ": " << info.enemies     // (4)
              << " enemies, gravity " << info.gravity << '\\n';
}

int main() {
    std::jthread consumer{gameplay};
    std::jthread producer{loader};
}`,
          output: "Frozen Depot: 37 enemies, gravity 9.81",
          annotations: [
            { lines: '6-10', text: 'An ordinary struct with a `std::string`: far too big to be atomic, and it does not need to be.' },
            { lines: '16-18', text: '(1) Plain, non-atomic writes. Nobody may read them yet.' },
            { lines: 19, text: '(2) The release store. On ARM it becomes `stlr`, which waits for all earlier memory operations; on x86 a plain `mov` already has release semantics, so release costs nothing except preventing *compiler* reordering.' },
            { lines: 23, text: '(3) The acquire load. Once it returns `true`, it has synchronized with (2). On ARM it is `ldar`; on x86 a plain `mov`.' },
            { lines: '26-27', text: '(4) Safe: (1) happens-before (2), (2) synchronizes-with (3), and (3) happens-before (4). No data race, on any CPU.' },
          ],
        },
        {
          type: 'p',
          text: 'What the compiler actually emits for each order (real output: GCC 13.3 `-O2` for x86-64, and Clang 18 `-O2 --target=aarch64-linux-gnu` for the same operations written with the `__atomic` builtins that `std::atomic` is built on; `ready` is a global `int`):',
        },
        {
          type: 'compare',
          left: {
            title: 'x86-64 (GCC 13.3)',
            tone: 'neutral',
            lang: 'text',
            code: `store_seq_cst:
    xchg  edi, DWORD PTR ready[rip]
store_release:
    mov   DWORD PTR ready[rip], edi
store_relaxed:
    mov   DWORD PTR ready[rip], edi
load_seq_cst:
    mov   eax, DWORD PTR ready[rip]
load_acquire:
    mov   eax, DWORD PTR ready[rip]
fence_seq_cst:
    lock or QWORD PTR [rsp], 0`,
            text: 'Only `seq_cst` stores and fences cost anything: `xchg` (implicitly locked) and a locked no-op both drain the store buffer, which is exactly the store→load ordering TSO lacks.',
          },
          right: {
            title: 'AArch64 (Clang 18)',
            tone: 'neutral',
            lang: 'text',
            code: `store_seq_cst:
    stlr  w0, [x8]
store_release:
    stlr  w0, [x8]
store_relaxed:
    str   w0, [x8, :lo12:ready]
load_seq_cst:
    ldar  w0, [x8]
load_acquire:
    ldar  w0, [x8]
fence_seq_cst:
    dmb   ish`,
            text: 'Release and acquire need special instructions (`stlr`, `ldar`); relaxed uses plain ones. ARMv8 designed `stlr`/`ldar` so that they are also sequentially consistent with each other. (Each function also has `adrp`/`add` lines to form the address and a `ret`, omitted here.)',
          },
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'See it yourself',
          text: 'Paste the snippet into [Compiler Explorer](https://godbolt.org/) and switch between x86-64 GCC and an ARM64 compiler. Watching `mov` turn into `stlr` is the fastest way to build intuition for what each order costs.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'bug',
      prompt: 'A streaming thread decodes a texture and signals the renderer. The game occasionally draws garbage on ARM devices, and the code is undefined behavior everywhere. Tap the faulty line.',
      code: `Texture* loaded = nullptr;          // plain pointer
std::atomic<bool> done{false};

void streamer() {
    loaded = decodeTexture("rock.dds");
    done.store(true, std::memory_order_relaxed);
}

void renderer() {
    if (done.load(std::memory_order_acquire)) {
        draw(*loaded);
    }
}`,
      bugLines: [6],
      hint: 'An acquire load only synchronizes with a store that has at least release semantics.',
      explanation:
        'Line 6 uses `memory_order_relaxed`, so the flag store does not *release* anything: there is no synchronizes-with edge, and the write to `loaded` (and the texture data behind it) races with the read in `renderer`, which is undefined behavior. In practice the compiler may move the pointer write after the flag store, and an ARM core may make the flag visible first, so the renderer dereferences a null or half-written texture. The fix is `done.store(true, std::memory_order_release);` (or the default `seq_cst`). The acquire on line 10 is correct but useless without a matching release.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Fences, and when you need seq_cst',
      blocks: [
        {
          type: 'p',
          text: 'Acquire/release covers message passing, but not the store-buffering pattern. In SB each thread *stores* one variable and then *loads* another; release only orders things *before* a store and acquire only things *after* a load, so neither stops a later load from passing an earlier store. Only `seq_cst` does: all `seq_cst` operations fall into one global order, so `(0,0)` becomes impossible.',
        },
        {
          type: 'code',
          lang: 'cpp',
          title: 'SB made correct with seq_cst (the default order)',
          code: `std::atomic<int> x{0}, y{0};

// thread 0                      // thread 1
x.store(1);                      y.store(1);
int r1 = y.load();               int r2 = x.load();

// now (r1, r2) == (0, 0) is impossible`,
          annotations: [
            { lines: 4, text: 'Default-order stores: on x86 these compile to `xchg`, which drains the store buffer before the following load can complete. That is the store→load fence from the animation.' },
          ],
        },
        {
          type: 'p',
          text: 'A **[[memory-fence|fence]]** (`std::atomic_thread_fence`) orders operations around it without being attached to a particular variable. A release fence followed by a relaxed store acts like a release store; a relaxed load followed by an acquire fence acts like an acquire load. That lets you pay for ordering once for many variables, or only on the path that needs it:',
        },
        {
          type: 'code',
          lang: 'cpp',
          title: 'Message passing with fences',
          code: `// producer
payload = computeLighting();
std::atomic_thread_fence(std::memory_order_release);
ready.store(true, std::memory_order_relaxed);

// consumer
if (ready.load(std::memory_order_relaxed)) {
    std::atomic_thread_fence(std::memory_order_acquire);
    use(payload);              // safe: fences synchronize
}`,
          annotations: [
            { lines: 3, text: 'Everything above the release fence is published by any later atomic store that the consumer observes.' },
            { lines: 8, text: 'The acquire fence pairs with the release fence through the flag. The consumer only pays for it when the flag is actually set.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why seq_cst is the default',
          text: 'It is the only order under which programs without data races behave as if threads simply interleaved, which is how humans reason. On x86 it costs only on stores (a locked instruction drains the store buffer); on ARMv8 `ldar`/`stlr` already give it to plain loads and stores. Use weaker orders where a profiler proves they matter and the pattern is clearly message passing or a pure counter. (`memory_order_consume` also exists, but compilers implement it as acquire and the standards committee is phasing it out.)',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'fill',
      prompt: 'Choose the weakest correct memory order for each operation of a job hand-off.',
      template: `// producer: write the job, then publish it
slots[tail] = job;
tailIndex.store(next, ___);

// consumer: see the new tail, then read the job
if (head != tailIndex.load(___)) run(slots[head]);

// statistics, only read after all workers are joined
jobsRun.fetch_add(1, ___);`,
      blanks: [
        { answers: ['std::memory_order_release', 'std::memory_order::release'] },
        { answers: ['std::memory_order_acquire', 'std::memory_order::acquire'] },
        { answers: ['std::memory_order_relaxed', 'std::memory_order::relaxed'] },
      ],
      wordBank: ['std::memory_order_release', 'std::memory_order_acquire', 'std::memory_order_relaxed', 'std::memory_order_seq_cst', 'std::memory_order_consume'],
      explanation:
        'The producer must **release** so the job data written before the store is published with it; the consumer must **acquire** so its read of `slots[head]` cannot happen before it sees the new tail. The statistics counter carries no data, and `join()` provides the synchronization for the final read, so **relaxed** suffices. `seq_cst` would also be correct everywhere, just stronger than needed; `consume` is effectively acquire and discouraged.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Why volatile is not for threads',
      blocks: [
        {
          type: 'p',
          text: '`volatile` tells the compiler that every access to an object is an observable side effect: it must perform each read and write exactly as written, without caching the value in a register, merging accesses or deleting them, and keep volatile accesses in order *relative to each other*. That is exactly what you need for **[[memory-mapped-io|memory-mapped I/O]]**, where reading a device register can have effects, and for a `volatile std::sig_atomic_t` flag set by a signal handler.',
        },
        {
          type: 'p',
          text: 'It is not what threads need. `volatile` provides:',
        },
        {
          type: 'list',
          items: [
            '**No atomicity**: `++counter` on a `volatile int` is still a separate load, add and store, and concurrent increments are lost.',
            '**No inter-thread ordering**: ordinary (non-volatile) accesses may still move across volatile ones, and the CPU may still reorder at the hardware level, because volatile emits plain loads and stores, never fences or `ldar`/`stlr`.',
            '**No happens-before**: concurrent conflicting access to a volatile non-atomic object is still a **data race**, so the program has undefined behavior.',
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'volatile: compiles, still broken',
            tone: 'bad',
            code: `volatile bool levelReady = false;
LevelData level;

// loader thread
level = loadLevel();
levelReady = true;

// game thread
while (!levelReady) {}
start(level);       // data race`,
            text: 'The loop does re-read the flag, but nothing orders the write of `level` before the flag, on ARM or even in the compiler.',
          },
          right: {
            title: 'std::atomic: correct everywhere',
            tone: 'good',
            code: `std::atomic<bool> levelReady{false};
LevelData level;

// loader thread
level = loadLevel();
levelReady.store(true, std::memory_order_release);

// game thread
while (!levelReady.load(std::memory_order_acquire)) {}
start(level);       // happens-after the load`,
            text: 'The release/acquire pair orders the data and the flag, and the atomic makes the flag itself race-free.',
          },
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Where the volatile myth comes from',
          text: 'Before C++11 the language had no threads, so people used `volatile` plus platform knowledge. Microsoft\'s compiler even gives `volatile` acquire/release semantics under `/volatile:ms`, the default when targeting x86 and x64, but not when targeting ARM, where the default is `/volatile:iso`. Code relying on that quietly breaks when ported. In Java and C#, `volatile` *does* mean something like `seq_cst`/acquire-release, which adds to the confusion. In C++, use `std::atomic`.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Where volatile belongs',
          text: 'Embedded and defense systems are full of legitimate `volatile`: memory-mapped hardware registers on flight computers, sensor interfaces and radio hardware, where each access must really happen. Even there, sharing data between an interrupt handler and the main loop on a multicore microcontroller needs atomics or barriers in addition.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'An old engine uses `volatile int pendingJobs;`, decremented by worker threads with `--pendingJobs;` and polled by the main thread. Which statement is correct?',
      options: [
        {
          text: 'It is correct because `volatile` forces every access to go to memory',
          why: '`volatile` forces the *compiler* to emit each access, but `--pendingJobs` is still a load, a subtract and a store, and two workers can interleave and lose a decrement.',
        },
        {
          text: 'It is correct on x86 because x86 is strongly ordered',
          why: 'TSO does not make a read-modify-write atomic; that needs a `lock` prefix, which `volatile` never generates. And the data race is undefined behavior regardless of the CPU.',
        },
        {
          text: 'It is a data race: decrements can be lost and the behavior is undefined; use `std::atomic<int>` with `fetch_sub`',
          correct: true,
          why: 'An atomic `fetch_sub` compiles to a `lock sub` or `lock xadd` on x86 (a loop or an atomic instruction on ARM), so no decrement is lost, and the memory order controls what the main thread may assume afterwards.',
        },
        {
          text: 'It only needs a `std::atomic_thread_fence` after each decrement',
          why: 'A fence orders operations; it does not make the decrement indivisible, and accesses to a non-atomic object still race.',
        },
      ],
      explanation:
        '`volatile` addresses a different problem (accesses the compiler must not optimize away) and solves none of the threading ones: atomicity, ordering and the absence of data races. The fix is `std::atomic<int> pendingJobs` with `fetch_sub(1, std::memory_order_acq_rel)` if the decrement also hands off job results (or `release` on the workers and `acquire` on the main thread\'s load).',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Putting it together: a lock-free SPSC queue',
      blocks: [
        {
          type: 'p',
          text: 'A **single-producer, single-consumer** ring buffer is the workhorse lock-free structure of game engines: game thread to render thread command queues, the mixer feeding the audio thread (which must never block on a lock), decoded assets handed to the main thread. It needs only acquire/release, and it uses everything from this unit:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <atomic>
#include <cstddef>
#include <iostream>
#include <optional>
#include <thread>

// Single-producer, single-consumer ring buffer. Exactly one
// thread calls push and exactly one other thread calls pop.
template <typename T, std::size_t N>
class SpscQueue {
public:
    bool push(const T& value) {                       // producer
        const auto tail = tail_.load(std::memory_order_relaxed);
        const auto next = (tail + 1) % N;
        if (next == head_.load(std::memory_order_acquire)) {
            return false;                             // full
        }
        slots_[tail] = value;                         // write data
        tail_.store(next, std::memory_order_release); // publish
        return true;
    }

    std::optional<T> pop() {                          // consumer
        const auto head = head_.load(std::memory_order_relaxed);
        if (head == tail_.load(std::memory_order_acquire)) {
            return std::nullopt;                      // empty
        }
        T value = slots_[head];                       // read data
        head_.store((head + 1) % N, std::memory_order_release);
        return value;
    }

private:
    alignas(64) std::atomic<std::size_t> head_{0};  // consumer writes
    alignas(64) std::atomic<std::size_t> tail_{0};  // producer writes
    alignas(64) T slots_[N]{};
};

int main() {
    SpscQueue<int, 256> queue;
    long long sum = 0;
    std::jthread audio{[&] {                         // consumer
        for (int received = 0; received < 100'000;) {
            if (const auto v = queue.pop()) {
                sum += *v;
                ++received;
            } else {
                std::this_thread::yield();           // empty: wait
            }
        }
    }};
    for (int i = 1; i <= 100'000; ++i) {             // producer
        while (!queue.push(i)) {
            std::this_thread::yield();               // full: wait
        }
    }
    audio.join();
    std::cout << "sum of 1..100000 received: " << sum << '\\n';
}`,
          output: "sum of 1..100000 received: 5000050000",
          annotations: [
            { lines: 13, text: 'The producer reads its *own* index: no other thread writes `tail_`, so relaxed is enough.' },
            { lines: 15, text: 'Acquire on the consumer\'s index: once we see that a slot was freed, the consumer\'s read of that slot has happened, so overwriting it is safe.' },
            { lines: '18-19', text: 'Write the data, then publish it with a release store: the message-passing pattern. The consumer can never see the new `tail_` without also seeing the slot\'s contents.' },
            { lines: 25, text: 'The matching acquire: after this load, the slots up to `tail_` are fully written and visible.' },
            { lines: 29, text: 'Release the slot back to the producer only after reading it.' },
            { lines: '34-36', text: 'Each index on its own cache line (the false sharing lesson): the producer writes `tail_`, the consumer writes `head_`, and neither invalidates the other\'s hot line on every operation.' },
            { lines: 57, text: '`join()` synchronizes-with the end of the consumer thread, so reading `sum` here is not a data race.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Know where the cliff is',
          text: 'SPSC is about as complex as lock-free code should get without serious expertise. Multi-producer queues, lock-free stacks and hash maps run into the ABA problem, memory reclamation and subtle ordering bugs that may appear only on one CPU, once a week. Use well-tested libraries (or your engine\'s task system), test on ARM as well as x86, run ThreadSanitizer, and prefer a mutex until a profiler proves it is the bottleneck.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'Two threads each set their own "I want to enter" flag and then check the other thread\'s flag (Peterson-style). Which memory order makes this correct?',
      code: `// thread A                         // thread B
wantA.store(true, ORDER);            wantB.store(true, ORDER);
if (!wantB.load(ORDER)) enter();     if (!wantA.load(ORDER)) enter();`,
      options: [
        {
          text: '`memory_order_relaxed` for everything, since each flag has a single writer',
          why: 'Relaxed provides no ordering at all; both loads can read `false` and both threads enter.',
        },
        {
          text: '`memory_order_release` for the stores and `memory_order_acquire` for the loads',
          why: 'This is the store-buffering pattern: release/acquire does not prevent a later load from passing an earlier store, so both threads can still read `false`, even on x86.',
        },
        {
          text: '`memory_order_seq_cst` for the stores and the loads',
          correct: true,
          why: 'All four operations join one global order that every thread agrees on, so at least one load comes after the other thread\'s store and the two threads cannot both enter.',
        },
        {
          text: 'No atomics are needed if both flags are `volatile bool`',
          why: '`volatile` gives neither atomicity nor ordering between threads, and on x86 the stores can still sit in the store buffers while the loads read `false`.',
        },
      ],
      explanation:
        'Message passing (write data, then flag; read flag, then data) needs only release/acquire. Mutual exclusion by flags (write mine, then read yours) is SB-shaped and needs `seq_cst`, which on x86 means a store-buffer-draining `xchg`. Recognizing which shape your code has is the core skill of using memory orders, and the reason `seq_cst` is the safe default.',
    },
  ],
  takeaways: [
    'Store buffers let a core continue past slow stores; with forwarding the core sees its own stores at once, while other cores see them only after they drain, so later loads can pass earlier stores.',
    'Sequential consistency is "some interleaving of all threads in program order"; litmus tests like SB and MP show what each hardware model allows.',
    'x86-TSO only relaxes store→load order; ARMv8 relaxes all four orders unless code uses acquire/release instructions or barriers. Code that is accidentally correct on x86 can fail on ARM.',
    'In C++, a data race is undefined behavior. Use `std::atomic`: release/acquire for message passing, relaxed for pure counters, seq_cst (the default) for SB-shaped patterns and when in doubt.',
    'On x86, only seq_cst stores and fences cost extra (`xchg`, `lock or`); on ARM, release/acquire become `stlr`/`ldar` and fences `dmb ish`.',
    '`volatile` is for memory-mapped I/O and signal handlers; it provides no atomicity and no inter-thread ordering.',
    'An SPSC ring buffer with acquire/release and line-separated indices is the canonical safe lock-free structure in engines.',
  ],
  reading: [
    {
      title: 'std::memory_order',
      url: 'https://en.cppreference.com/w/cpp/atomic/memory_order',
      source: 'cppreference',
      note: 'The formal definitions of every order, synchronizes-with and happens-before, with release/acquire and seq_cst examples.',
    },
    {
      title: 'std::atomic_thread_fence',
      url: 'https://en.cppreference.com/w/cpp/atomic/atomic_thread_fence',
      source: 'cppreference',
      note: 'How fences synchronize with atomic operations and with each other.',
    },
    {
      title: 'Memory ordering',
      url: 'https://en.wikipedia.org/wiki/Memory_ordering',
      source: 'article',
      note: 'Compiler and hardware reordering, with a table of what different architectures allow.',
    },
    {
      title: 'Compiler Explorer',
      url: 'https://godbolt.org/',
      source: 'other',
      note: 'Compile the atomics in this lesson for x86-64 and ARM64 side by side and compare the instructions.',
    },
    {
      title: 'Acquire and Release Semantics',
      url: 'https://preshing.com/20120913/acquire-and-release-semantics/',
      source: 'article',
      note: 'Jeff Preshing\'s clear explanation, part of a series on memory ordering that also covers the store-buffering test.',
    },
  ],
};
