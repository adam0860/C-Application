import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-out-of-order',
  title: 'Superscalar and Out-of-Order Execution',
  summary: 'How modern cores run several instructions per cycle, out of program order and past unresolved branches: register renaming, the reorder buffer, speculation, Spectre, SMT, and why multiple accumulators make loops faster.',
  minutes: 22,
  objectives: [
    'Define instruction-level parallelism and explain how a superscalar core reaches a CPI below 1',
    'Distinguish latency-bound dependency chains from throughput-bound independent work, and break chains with multiple accumulators',
    'Explain how register renaming removes false (WAR/WAW) dependences and how the reorder buffer keeps retirement in order',
    'Describe speculative execution and, at a conceptual level, how Spectre leaks data through it',
    'Explain what simultaneous multithreading shares and duplicates, and when it helps a game',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Beyond one instruction per cycle',
      blocks: [
        {
          type: 'p',
          text: 'The pipelined processor of the last unit finishes at most one instruction per cycle: CPI ≥ 1. Clock speeds stopped climbing in the mid-2000s (the power wall from the pipelining lesson), so the way forward was to do **more per cycle**. Look at four lines of game code:',
        },
        {
          type: 'code',
          code: `float dx = target.x - pos.x;     // (1)
float dy = target.y - pos.y;     // (2)  independent of (1)
float dist2 = dx * dx + dy * dy; // (3)  needs (1) and (2)
int frame = animFrame + 1;       // (4)  independent of all`,
          annotations: [
            {
              lines: '1-2',
              text: 'Neither needs the other\'s result: they could execute in the same cycle.',
            },
            {
              lines: 3,
              text: 'This one must wait for both: a true dependence.',
            },
            {
              lines: 4,
              text: 'Completely unrelated work, available any time.',
            },
          ],
        },
        {
          type: 'p',
          text: 'The amount of independent work available in a stream of instructions is its **[[instruction-level-parallelism|instruction-level parallelism]]** (ILP). A **[[superscalar]]** core exploits it by fetching, decoding and executing several instructions per cycle, using several execution units: multiple integer ALUs, load and store units, and floating-point/SIMD units. Current big cores from Intel, AMD and Apple handle roughly **4 to 8** instructions per cycle at their widest point, with a dozen or more execution ports behind that.',
        },
        {
          type: 'p',
          text: 'With several instructions finishing per cycle, the [[cpi]] drops below 1, so it is more natural to quote its inverse, **IPC** (instructions per cycle). A tight, well-behaved loop on a modern core can sustain an IPC of 3 to 4; code that keeps missing the cache may run at an IPC well below 1. The difference is mostly about dependences, which is what the rest of this lesson is about.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why go wide?',
          text: 'Once frequency hit the power wall, widening the core was the remaining lever for single-thread speed: two adders cost far less power than doubling the clock. But width only pays off when the instruction stream contains independent work to fill it. The hardware can find that work over a window of a few hundred instructions; you and the compiler decide how much of it exists.',
        },
      ],
    },
    {
      kind: 'numeric',
      prompt: 'A superscalar core can complete at most 4 instructions per cycle. What is the lowest CPI it can possibly achieve?',
      answer: 0.25,
      alsoAccept: ['1/4'],
      label: 'Best CPI =',
      explanation: 'CPI = 1 / IPC, so a peak IPC of 4 gives a best-case CPI of 0.25. Real code rarely gets there: dependences, branch mispredictions and cache misses all leave issue slots empty. That gap between peak and achieved IPC is exactly what profilers measure with [[hardware-performance-counter|hardware performance counters]] when they report "retiring" versus "stalled" cycles.',
    },
    {
      kind: 'concept',
      title: 'Latency versus throughput: the dependency chain',
      blocks: [
        {
          type: 'p',
          text: 'Every execution unit has two numbers. **Latency**: how many cycles from inputs to result. **Throughput**: how many new operations it can start per cycle (units are pipelined, so they accept new work every cycle). On recent x86 cores a floating-point add has a latency of about 3 to 4 cycles, and two adds can start every cycle. (Exact figures vary by microarchitecture; Agner Fog\'s instruction tables list them.)',
        },
        {
          type: 'p',
          text: 'Now look at the most common loop in the world:',
        },
        {
          type: 'code',
          code: `float sum = 0.0f;
for (float x : values)
    sum += x;      // each add needs the previous sum`,
          annotations: [
            {
              lines: 3,
              text: 'Add *i* + 1 cannot start until add *i* has finished: a [[dependency-chain]] through `sum`. The loop runs at one add per add-**latency**, not per add-throughput.',
            },
          ],
        },
        {
          type: 'p',
          text: 'With a 4-cycle latency and room for 2 adds per cycle, this loop uses 1/8 of the machine\'s adding capacity, no matter how clever the hardware is. The fix is to give the hardware independent chains: keep **several partial sums** and combine them at the end. Step through 8 additions both ways (latency 4, two adders):',
        },
        {
          type: 'algo',
          view: 'graph',
          width: 420,
          height: 260,
          nodes: [
            { id: 'a0', x: 40, y: 40, label: '+0' },
            { id: 'a1', x: 40, y: 98, label: '+1' },
            { id: 'a2', x: 40, y: 156, label: '+2' },
            { id: 'a3', x: 40, y: 214, label: '+3' },
            { id: 'a4', x: 110, y: 40, label: '+4' },
            { id: 'a5', x: 110, y: 98, label: '+5' },
            { id: 'a6', x: 110, y: 156, label: '+6' },
            { id: 'a7', x: 110, y: 214, label: '+7' },
            { id: 'b0', x: 220, y: 40, label: '+0' },
            { id: 'b4', x: 220, y: 100, label: '+4' },
            { id: 'b1', x: 270, y: 40, label: '+1' },
            { id: 'b5', x: 270, y: 100, label: '+5' },
            { id: 'b2', x: 320, y: 40, label: '+2' },
            { id: 'b6', x: 320, y: 100, label: '+6' },
            { id: 'b3', x: 370, y: 40, label: '+3' },
            { id: 'b7', x: 370, y: 100, label: '+7' },
            { id: 'm0', x: 245, y: 160, label: 's01' },
            { id: 'm1', x: 345, y: 160, label: 's23' },
            { id: 'm2', x: 295, y: 215, label: 'sum' },
          ],
          edges: [
            { from: 'a0', to: 'a1', directed: true },
            { from: 'a1', to: 'a2', directed: true },
            { from: 'a2', to: 'a3', directed: true },
            { from: 'a3', to: 'a4', directed: true },
            { from: 'a4', to: 'a5', directed: true },
            { from: 'a5', to: 'a6', directed: true },
            { from: 'a6', to: 'a7', directed: true },
            { from: 'b0', to: 'b4', directed: true },
            { from: 'b1', to: 'b5', directed: true },
            { from: 'b2', to: 'b6', directed: true },
            { from: 'b3', to: 'b7', directed: true },
            { from: 'b4', to: 'm0', directed: true },
            { from: 'b5', to: 'm0', directed: true },
            { from: 'b6', to: 'm1', directed: true },
            { from: 'b7', to: 'm1', directed: true },
            { from: 'm0', to: 'm2', directed: true },
            { from: 'm1', to: 'm2', directed: true },
          ],
          interval: 1200,
          frames: [
            {
              note: 'Left: `sum += a[i]` with one accumulator, 8 adds in a chain. Right: four accumulators, then three adds to combine them. Each add takes 4 cycles; 2 adders.',
              vars: [
                ['cycle', '0'],
              ],
            },
            {
              note: 'Cycle 0: the chain can start only its first add. The right side starts two adds at once (both adders busy).',
              nodeColors: [
                { id: 'a0', color: 'orange' },
                { id: 'b0', color: 'orange' },
                { id: 'b1', color: 'orange' },
              ],
              vars: [
                ['cycle', '0'],
                ['chain adds done', '0/8'],
                ['tree adds done', '0/11'],
              ],
            },
            {
              note: 'Cycle 1: two more independent adds start on the right. The chain is still waiting for `+0`.',
              nodeColors: [
                { id: 'a0', color: 'orange' },
                { id: 'b0', color: 'orange' },
                { id: 'b1', color: 'orange' },
                { id: 'b2', color: 'orange' },
                { id: 'b3', color: 'orange' },
              ],
              vars: [
                ['cycle', '1'],
                ['chain adds done', '0/8'],
                ['tree adds done', '0/11'],
              ],
            },
            {
              note: 'Cycle 4: `+0` finishes, so the chain can start `+1`. On the right, each accumulator\'s second add can start.',
              nodeColors: [
                { id: 'a0', color: 'green' },
                { id: 'a1', color: 'orange' },
                { id: 'b0', color: 'green' },
                { id: 'b1', color: 'green' },
                { id: 'b2', color: 'orange' },
                { id: 'b3', color: 'orange' },
                { id: 'b4', color: 'orange' },
                { id: 'b5', color: 'orange' },
              ],
              vars: [
                ['cycle', '4'],
                ['chain adds done', '1/8'],
                ['tree adds done', '2/11'],
              ],
            },
            {
              note: 'Cycle 5.',
              nodeColors: [
                { id: 'a0', color: 'green' },
                { id: 'a1', color: 'orange' },
                { id: 'b0', color: 'green' },
                { id: 'b1', color: 'green' },
                { id: 'b2', color: 'green' },
                { id: 'b3', color: 'green' },
                { id: 'b4', color: 'orange' },
                { id: 'b5', color: 'orange' },
                { id: 'b6', color: 'orange' },
                { id: 'b7', color: 'orange' },
              ],
              vars: [
                ['cycle', '5'],
                ['chain adds done', '1/8'],
                ['tree adds done', '4/11'],
              ],
            },
            {
              note: 'Cycle 8: the right side starts combining partial sums. The chain is on its third add.',
              nodeColors: [
                { id: 'a0', color: 'green' },
                { id: 'a1', color: 'green' },
                { id: 'a2', color: 'orange' },
                { id: 'b0', color: 'green' },
                { id: 'b1', color: 'green' },
                { id: 'b2', color: 'green' },
                { id: 'b3', color: 'green' },
                { id: 'b4', color: 'green' },
                { id: 'b5', color: 'green' },
                { id: 'b6', color: 'orange' },
                { id: 'b7', color: 'orange' },
                { id: 'm0', color: 'orange' },
              ],
              vars: [
                ['cycle', '8'],
                ['chain adds done', '2/8'],
                ['tree adds done', '6/11'],
              ],
            },
            {
              note: 'Cycle 9.',
              nodeColors: [
                { id: 'a0', color: 'green' },
                { id: 'a1', color: 'green' },
                { id: 'a2', color: 'orange' },
                { id: 'b0', color: 'green' },
                { id: 'b1', color: 'green' },
                { id: 'b2', color: 'green' },
                { id: 'b3', color: 'green' },
                { id: 'b4', color: 'green' },
                { id: 'b5', color: 'green' },
                { id: 'b6', color: 'green' },
                { id: 'b7', color: 'green' },
                { id: 'm0', color: 'orange' },
                { id: 'm1', color: 'orange' },
              ],
              vars: [
                ['cycle', '9'],
                ['chain adds done', '2/8'],
                ['tree adds done', '8/11'],
              ],
            },
            {
              note: 'Cycle 12.',
              nodeColors: [
                { id: 'a0', color: 'green' },
                { id: 'a1', color: 'green' },
                { id: 'a2', color: 'green' },
                { id: 'a3', color: 'orange' },
                { id: 'b0', color: 'green' },
                { id: 'b1', color: 'green' },
                { id: 'b2', color: 'green' },
                { id: 'b3', color: 'green' },
                { id: 'b4', color: 'green' },
                { id: 'b5', color: 'green' },
                { id: 'b6', color: 'green' },
                { id: 'b7', color: 'green' },
                { id: 'm0', color: 'green' },
                { id: 'm1', color: 'orange' },
              ],
              vars: [
                ['cycle', '12'],
                ['chain adds done', '3/8'],
                ['tree adds done', '9/11'],
              ],
            },
            {
              note: 'Cycle 13.',
              nodeColors: [
                { id: 'a0', color: 'green' },
                { id: 'a1', color: 'green' },
                { id: 'a2', color: 'green' },
                { id: 'a3', color: 'orange' },
                { id: 'b0', color: 'green' },
                { id: 'b1', color: 'green' },
                { id: 'b2', color: 'green' },
                { id: 'b3', color: 'green' },
                { id: 'b4', color: 'green' },
                { id: 'b5', color: 'green' },
                { id: 'b6', color: 'green' },
                { id: 'b7', color: 'green' },
                { id: 'm0', color: 'green' },
                { id: 'm1', color: 'green' },
                { id: 'm2', color: 'orange' },
              ],
              vars: [
                ['cycle', '13'],
                ['chain adds done', '3/8'],
                ['tree adds done', '10/11'],
              ],
            },
            {
              note: 'Cycle 16.',
              nodeColors: [
                { id: 'a0', color: 'green' },
                { id: 'a1', color: 'green' },
                { id: 'a2', color: 'green' },
                { id: 'a3', color: 'green' },
                { id: 'a4', color: 'orange' },
                { id: 'b0', color: 'green' },
                { id: 'b1', color: 'green' },
                { id: 'b2', color: 'green' },
                { id: 'b3', color: 'green' },
                { id: 'b4', color: 'green' },
                { id: 'b5', color: 'green' },
                { id: 'b6', color: 'green' },
                { id: 'b7', color: 'green' },
                { id: 'm0', color: 'green' },
                { id: 'm1', color: 'green' },
                { id: 'm2', color: 'orange' },
              ],
              vars: [
                ['cycle', '16'],
                ['chain adds done', '4/8'],
                ['tree adds done', '10/11'],
              ],
            },
            {
              note: 'Cycle 17: four accumulators are **done**. The chain has finished only 4 of 8 adds.',
              nodeColors: [
                { id: 'a0', color: 'green' },
                { id: 'a1', color: 'green' },
                { id: 'a2', color: 'green' },
                { id: 'a3', color: 'green' },
                { id: 'a4', color: 'orange' },
                { id: 'b0', color: 'green' },
                { id: 'b1', color: 'green' },
                { id: 'b2', color: 'green' },
                { id: 'b3', color: 'green' },
                { id: 'b4', color: 'green' },
                { id: 'b5', color: 'green' },
                { id: 'b6', color: 'green' },
                { id: 'b7', color: 'green' },
                { id: 'm0', color: 'green' },
                { id: 'm1', color: 'green' },
                { id: 'm2', color: 'green' },
              ],
              vars: [
                ['cycle', '17'],
                ['chain adds done', '4/8'],
                ['tree adds done', '11/11'],
              ],
            },
            {
              note: 'Cycle 20.',
              nodeColors: [
                { id: 'a0', color: 'green' },
                { id: 'a1', color: 'green' },
                { id: 'a2', color: 'green' },
                { id: 'a3', color: 'green' },
                { id: 'a4', color: 'green' },
                { id: 'a5', color: 'orange' },
                { id: 'b0', color: 'green' },
                { id: 'b1', color: 'green' },
                { id: 'b2', color: 'green' },
                { id: 'b3', color: 'green' },
                { id: 'b4', color: 'green' },
                { id: 'b5', color: 'green' },
                { id: 'b6', color: 'green' },
                { id: 'b7', color: 'green' },
                { id: 'm0', color: 'green' },
                { id: 'm1', color: 'green' },
                { id: 'm2', color: 'green' },
              ],
              vars: [
                ['cycle', '20'],
                ['chain adds done', '5/8'],
                ['tree adds done', '11/11'],
              ],
            },
            {
              note: 'Cycle 24.',
              nodeColors: [
                { id: 'a0', color: 'green' },
                { id: 'a1', color: 'green' },
                { id: 'a2', color: 'green' },
                { id: 'a3', color: 'green' },
                { id: 'a4', color: 'green' },
                { id: 'a5', color: 'green' },
                { id: 'a6', color: 'orange' },
                { id: 'b0', color: 'green' },
                { id: 'b1', color: 'green' },
                { id: 'b2', color: 'green' },
                { id: 'b3', color: 'green' },
                { id: 'b4', color: 'green' },
                { id: 'b5', color: 'green' },
                { id: 'b6', color: 'green' },
                { id: 'b7', color: 'green' },
                { id: 'm0', color: 'green' },
                { id: 'm1', color: 'green' },
                { id: 'm2', color: 'green' },
              ],
              vars: [
                ['cycle', '24'],
                ['chain adds done', '6/8'],
                ['tree adds done', '11/11'],
              ],
            },
            {
              note: 'Cycle 28.',
              nodeColors: [
                { id: 'a0', color: 'green' },
                { id: 'a1', color: 'green' },
                { id: 'a2', color: 'green' },
                { id: 'a3', color: 'green' },
                { id: 'a4', color: 'green' },
                { id: 'a5', color: 'green' },
                { id: 'a6', color: 'green' },
                { id: 'a7', color: 'orange' },
                { id: 'b0', color: 'green' },
                { id: 'b1', color: 'green' },
                { id: 'b2', color: 'green' },
                { id: 'b3', color: 'green' },
                { id: 'b4', color: 'green' },
                { id: 'b5', color: 'green' },
                { id: 'b6', color: 'green' },
                { id: 'b7', color: 'green' },
                { id: 'm0', color: 'green' },
                { id: 'm1', color: 'green' },
                { id: 'm2', color: 'green' },
              ],
              vars: [
                ['cycle', '28'],
                ['chain adds done', '7/8'],
                ['tree adds done', '11/11'],
              ],
            },
            {
              note: 'Cycle 32: the chain finally finishes: 8 × 4 cycles. Same number of additions (more, even, on the right), almost half the time.',
              nodeColors: [
                { id: 'a0', color: 'green' },
                { id: 'a1', color: 'green' },
                { id: 'a2', color: 'green' },
                { id: 'a3', color: 'green' },
                { id: 'a4', color: 'green' },
                { id: 'a5', color: 'green' },
                { id: 'a6', color: 'green' },
                { id: 'a7', color: 'green' },
                { id: 'b0', color: 'green' },
                { id: 'b1', color: 'green' },
                { id: 'b2', color: 'green' },
                { id: 'b3', color: 'green' },
                { id: 'b4', color: 'green' },
                { id: 'b5', color: 'green' },
                { id: 'b6', color: 'green' },
                { id: 'b7', color: 'green' },
                { id: 'm0', color: 'green' },
                { id: 'm1', color: 'green' },
                { id: 'm2', color: 'green' },
              ],
              vars: [
                ['cycle', '32'],
                ['chain adds done', '8/8'],
                ['tree adds done', '11/11'],
              ],
            },
          ],
          caption: 'Dependency graphs: an arrow means "needs the result of". Orange = executing, green = done. Latency 4, two adders.',
        },
        {
          type: 'p',
          text: 'This small C++ scheduler runs the same model for 1,024 additions and counts the cycles:',
        },
        {
          type: 'code',
          title: 'accumulators.cpp',
          code: `#include <algorithm>
#include <format>
#include <iostream>
#include <vector>

// Schedule n dependent-or-independent FP adds on a toy core:
// each add takes \`latency\` cycles, and \`units\` adders can each
// start one new add per cycle (they are pipelined).
int cyclesToSum(int n, int accumulators, int latency, int units) {
    std::vector<int> readyAt(accumulators, 0);  // acc[k] ready at
    std::vector<int> startsPerCycle(8 * n, 0);
    int done = 0;
    for (int i = 0; i < n; ++i) {
        int k = i % accumulators;               // acc[k] += a[i]
        int t = readyAt[k];
        while (startsPerCycle[t] == units) ++t; // all adders busy
        ++startsPerCycle[t];
        readyAt[k] = t + latency;
        done = std::max(done, readyAt[k]);
    }
    // Combine the partial sums pairwise: log2(accumulators) levels.
    for (int a = accumulators; a > 1; a /= 2) done += latency;
    return done;
}

int main() {
    const int n = 1024, latency = 4, units = 2;
    std::cout << "accumulators  cycles  adds/cycle\\n";
    for (int acc : {1, 2, 4, 8, 16}) {
        int c = cyclesToSum(n, acc, latency, units);
        std::cout << std::format("{:12} {:7} {:11.2f}\\n", acc, c,
                                 double(n) / c);
    }
}`,
          runnable: true,
          output: `accumulators  cycles  adds/cycle
           1    4096        0.25
           2    2052        0.50
           4    1033        0.99
           8     527        1.94
          16     531        1.93`,
          annotations: [
            {
              lines: '9-24',
              text: 'A tiny list scheduler: each add starts as soon as its accumulator is ready **and** an adder is free in that cycle.',
            },
            {
              lines: 14,
              text: 'Accumulators are used round-robin, as in an unrolled loop: `acc[i % k] += a[i]`.',
            },
            {
              lines: 16,
              text: 'Throughput limit: at most `units` adds may start in any one cycle.',
            },
            {
              lines: 18,
              text: 'Latency limit: this accumulator\'s next add can start only `latency` cycles later.',
            },
            {
              lines: 22,
              text: 'Combining k partial sums at the end costs log₂(k) more add latencies.',
            },
          ],
        },
        {
          type: 'p',
          text: 'One accumulator: 4,096 cycles, latency-bound. Each doubling of accumulators halves the time until **8** accumulators reach the throughput limit of 2 adds per cycle; 16 gains nothing more. The magic number is **latency × throughput = 4 × 2 = 8** independent chains, the number of adds that must be in flight to keep both adders busy every cycle.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'The pizza oven',
          text: 'A pizza oven bakes for 4 minutes and has room for 2 pizzas at a time, loaded one minute apart. If each pizza can only go in when the previous one comes out, you make one pizza every 4 minutes. Keep 8 orders in progress and the oven turns out 2 pizzas a minute.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Multiple accumulators in real C++',
      blocks: [
        {
          type: 'p',
          text: 'Why doesn\'t the compiler split the chain for you? For integers it often does. For floating point it **may not**, because floating-point addition is not associative: `(a + b) + c` can differ from `a + (b + c)` in the last bits, and C++ requires the compiler to produce exactly the result your source specifies. Here is GCC 13 at `-O2` on the single-accumulator loop:',
        },
        {
          type: 'code',
          title: 'g++ -O2: one accumulator (loop body)',
          lang: 'text',
          code: `_Z4sum1PKfi:
    ...
.L3:
    addss   xmm0, DWORD PTR [rdi]
    add     rdi, 8
    addss   xmm0, DWORD PTR -4[rdi]
    cmp     rdi, rax
    jne     .L3`,
          annotations: [
            { lines: 3, text: 'GCC unrolled the loop by two...' },
            {
              lines: '4-6',
              text: '...but both `addss` instructions add into the same register, `xmm0`. Every add waits for the previous one: the chain is intact.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Write four accumulators yourself and the result changes, slightly, and the speed changes a lot:',
        },
        {
          type: 'code',
          title: 'four_accumulators.cpp',
          code: `#include <cstdio>
#include <vector>

int main() {
    std::vector<float> a(1'000'000);
    for (int i = 0; i < 1'000'000; ++i) a[i] = 1.0f / float(i + 1);

    float one = 0.0f;                       // one dependency chain
    for (float x : a) one += x;

    float s0 = 0, s1 = 0, s2 = 0, s3 = 0;   // four independent chains
    for (std::size_t i = 0; i < a.size(); i += 4) {
        s0 += a[i];     s1 += a[i + 1];
        s2 += a[i + 2]; s3 += a[i + 3];
    }
    float four = (s0 + s1) + (s2 + s3);

    std::printf("one accumulator:   %.7f\\n", one);
    std::printf("four accumulators: %.7f\\n", four);
    std::printf("true value:        %.7f\\n", 14.392726722865);
}`,
          runnable: true,
          output: `one accumulator:   14.3573580
four accumulators: 14.3898878
true value:        14.3927267`,
          annotations: [
            {
              lines: '8-9',
              text: 'One dependency chain through `one`: a million adds, each waiting on the last.',
            },
            {
              lines: '11-15',
              text: 'Four independent chains. The hardware overlaps them; the compiler may even put all four in one SIMD register.',
            },
            {
              lines: 16,
              text: 'Combine the partial sums at the end, pairwise.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Neither float result equals the true value (14.3927267); the four-accumulator sum is actually **closer**, because each partial sum stays smaller and loses fewer low bits when tiny terms are added to it. But it is *different*, and that is why the compiler will not make this change on its own. Compiled as a function, GCC turns the four-accumulator version into this:',
        },
        {
          type: 'code',
          title: 'g++ -O2: four accumulators (loop body)',
          lang: 'text',
          code: `_Z4sum4PKfi:
    ...
.L3:
    mov     rcx, rax
    add     rax, 1
    sal     rcx, 4
    movups  xmm0, XMMWORD PTR [rdi+rcx]
    addps   xmm1, xmm0
    cmp     eax, edx
    jb      .L3`,
          annotations: [
            {
              lines: 7,
              text: 'One `movups` loads `a[i..i+3]` into a 128-bit register...',
            },
            {
              lines: 8,
              text: '...and one `addps` performs all four accumulator updates at once: `s0..s3` live in the four lanes of `xmm1`. Your independent chains became SIMD lanes, the subject of the next lesson.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Fast-math and determinism',
          text: '`-ffast-math` (or `-fassociative-math`) lets GCC and Clang reassociate floating-point math, and they will then vectorize the simple loop for you. It also changes results in ways that differ between compilers, flags and CPUs. For a game with **[[lockstep-simulation|deterministic lockstep]] multiplayer or replays**, where every machine must compute bit-identical simulations, that is a bug factory. Many engines keep fast-math off in gameplay code and write the accumulators explicitly where speed matters.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the loop so it keeps two independent dependency chains (`n` is even), then combines them.',
      template: `float s0 = 0.0f, s1 = 0.0f;
for (int i = 0; i < n; i += ___) {
    s0 += a[i];
    ___ += a[i + 1];
}
float sum = s0 ___ s1;`,
      blanks: [
        {
          answers: ['2'],
        },
        {
          answers: ['s1'],
        },
        {
          answers: ['+'],
        },
      ],
      wordBank: ['2', 's1', '+', '1', 's0', 'sum', '*'],
      explanation: 'Stepping by 2 and sending odd elements to `s1` creates two chains that never wait for each other, so two adds can be in flight at once, doubling speed on a latency-bound loop. The partial sums are added at the end. Sending both elements to `s0` would keep a single chain; stepping by 1 would double-count elements.',
    },
    {
      kind: 'concept',
      title: 'Out-of-order execution',
      blocks: [
        {
          type: 'p',
          text: 'Even with good code, the next instruction is often not ready: it may wait for a load that missed the cache, or for a multiply. An in-order pipeline stalls everything behind it. An **[[out-of-order-execution|out-of-order]]** core instead keeps a window of upcoming instructions and runs **whichever are ready**, in any order, while preserving the illusion of sequential execution.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 560 330">
<text x="90" y="16" font-size="10" text-anchor="middle" class="t-blue" font-weight="700">IN ORDER</text>
<rect x="20" y="26" width="140" height="34" rx="4" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="20" y="26" width="140" height="34" rx="4" fill="none" class="s-blue" stroke-width="1.6"/>
<text x="90" y="46.9" font-size="11" text-anchor="middle" font-weight="600">Fetch + predict</text>
<rect x="20" y="76" width="140" height="34" rx="4" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="20" y="76" width="140" height="34" rx="4" fill="none" class="s-blue" stroke-width="1.6"/>
<text x="90" y="96.8" font-size="11" text-anchor="middle" font-weight="600">Decode → µops</text>
<rect x="20" y="126" width="140" height="46" rx="4" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="20" y="126" width="140" height="46" rx="4" fill="none" class="s-purple" stroke-width="1.6"/>
<text x="90" y="146" font-size="11" text-anchor="middle" font-weight="600">Rename</text>
<text x="90" y="159.7" font-size="11" text-anchor="middle" font-weight="600">arch reg → phys reg</text>
<polyline points="90,60 90,70.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M90,76 L86.8,69 L93.2,69 Z" fill="currentColor" stroke="none"/>
<polyline points="90,110 90,120.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M90,126 L86.8,119 L93.2,119 Z" fill="currentColor" stroke="none"/>
<rect x="210" y="100" width="150" height="62" rx="4" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="210" y="100" width="150" height="62" rx="4" fill="none" class="s-orange" stroke-width="1.6"/>
<text x="285" y="128" font-size="11" text-anchor="middle" font-weight="600">Scheduler</text>
<text x="285" y="141.7" font-size="11" text-anchor="middle" font-weight="600">(waits for operands)</text>
<rect x="20" y="210" width="340" height="40" rx="4" class="f-green" fill-opacity="0.12" stroke="none"/>
<rect x="20" y="210" width="340" height="40" rx="4" fill="none" class="s-green" stroke-width="1.6"/>
<line x1="20" y1="210" x2="20" y2="250" stroke="currentColor" stroke-width="0.8" class="s-green"/>
<line x1="54" y1="210" x2="54" y2="250" stroke="currentColor" stroke-width="0.8" class="s-green"/>
<line x1="88" y1="210" x2="88" y2="250" stroke="currentColor" stroke-width="0.8" class="s-green"/>
<line x1="122" y1="210" x2="122" y2="250" stroke="currentColor" stroke-width="0.8" class="s-green"/>
<line x1="156" y1="210" x2="156" y2="250" stroke="currentColor" stroke-width="0.8" class="s-green"/>
<line x1="190" y1="210" x2="190" y2="250" stroke="currentColor" stroke-width="0.8" class="s-green"/>
<line x1="224" y1="210" x2="224" y2="250" stroke="currentColor" stroke-width="0.8" class="s-green"/>
<line x1="258" y1="210" x2="258" y2="250" stroke="currentColor" stroke-width="0.8" class="s-green"/>
<line x1="292" y1="210" x2="292" y2="250" stroke="currentColor" stroke-width="0.8" class="s-green"/>
<line x1="326" y1="210" x2="326" y2="250" stroke="currentColor" stroke-width="0.8" class="s-green"/>
<text x="20" y="268" font-size="10" text-anchor="start" class="t-green" font-weight="600">Reorder buffer: entries kept in program order</text>
<text x="354" y="234" font-size="9" text-anchor="end" font-weight="700">head</text>
<text x="26" y="234" font-size="9" text-anchor="start" font-weight="700">tail</text>
<polyline points="160,149 204.7,132.9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M210,131 L204.5,136.3 L202.3,130.4 Z" fill="currentColor" stroke="none"/>
<polyline points="90,172 90,204.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M90,210 L86.8,203 L93.2,203 Z" fill="currentColor" stroke="none"/>
<text x="96" y="196" font-size="9" text-anchor="start">allocate entry</text>
<text x="470" y="16" font-size="10" text-anchor="middle" class="t-orange" font-weight="700">OUT OF ORDER</text>
<rect x="420" y="26" width="120" height="24" rx="4" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="420" y="26" width="120" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="480" y="41.5" font-size="10" text-anchor="middle" font-weight="600">ALU</text>
<polyline points="360,131 390,131 390,38 416,38" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
<path d="M420,38 L415,40.2 L415,35.8 Z" fill="currentColor" stroke="none"/>
<rect x="420" y="56" width="120" height="24" rx="4" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="420" y="56" width="120" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="480" y="71.5" font-size="10" text-anchor="middle" font-weight="600">ALU</text>
<polyline points="360,131 390,131 390,68 416,68" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
<path d="M420,68 L415,70.2 L415,65.8 Z" fill="currentColor" stroke="none"/>
<rect x="420" y="86" width="120" height="24" rx="4" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="420" y="86" width="120" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="480" y="101.5" font-size="10" text-anchor="middle" font-weight="600">ALU / branch</text>
<polyline points="360,131 390,131 390,98 416,98" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
<path d="M420,98 L415,100.2 L415,95.8 Z" fill="currentColor" stroke="none"/>
<rect x="420" y="116" width="120" height="24" rx="4" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="420" y="116" width="120" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="480" y="131.5" font-size="10" text-anchor="middle" font-weight="600">FP / SIMD</text>
<polyline points="360,131 390,131 390,128 416,128" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
<path d="M420,128 L415,130.2 L415,125.8 Z" fill="currentColor" stroke="none"/>
<rect x="420" y="146" width="120" height="24" rx="4" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="420" y="146" width="120" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="480" y="161.5" font-size="10" text-anchor="middle" font-weight="600">FP / SIMD</text>
<polyline points="360,131 390,131 390,158 416,158" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
<path d="M420,158 L415,160.2 L415,155.8 Z" fill="currentColor" stroke="none"/>
<rect x="420" y="176" width="120" height="24" rx="4" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="420" y="176" width="120" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="480" y="191.5" font-size="10" text-anchor="middle" font-weight="600">Load</text>
<polyline points="360,131 390,131 390,188 416,188" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
<path d="M420,188 L415,190.2 L415,185.8 Z" fill="currentColor" stroke="none"/>
<rect x="420" y="206" width="120" height="24" rx="4" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="420" y="206" width="120" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="480" y="221.5" font-size="10" text-anchor="middle" font-weight="600">Store</text>
<polyline points="360,131 390,131 390,218 416,218" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
<path d="M420,218 L415,220.2 L415,215.8 Z" fill="currentColor" stroke="none"/>
<polyline points="540,38 550,38" fill="none" class="s-orange" stroke-width="1.2" stroke-linejoin="round"/>
<polyline points="540,68 550,68" fill="none" class="s-orange" stroke-width="1.2" stroke-linejoin="round"/>
<polyline points="540,98 550,98" fill="none" class="s-orange" stroke-width="1.2" stroke-linejoin="round"/>
<polyline points="540,128 550,128" fill="none" class="s-orange" stroke-width="1.2" stroke-linejoin="round"/>
<polyline points="540,158 550,158" fill="none" class="s-orange" stroke-width="1.2" stroke-linejoin="round"/>
<polyline points="540,188 550,188" fill="none" class="s-orange" stroke-width="1.2" stroke-linejoin="round"/>
<polyline points="540,218 550,218" fill="none" class="s-orange" stroke-width="1.2" stroke-linejoin="round"/>
<polyline points="550,38 550,270 376,270 376,230 364.8,230" fill="none" class="s-orange" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M360,230 L366,227.3 L366,232.7 Z" class="f-orange" stroke="none"/>
<text x="462" y="288" font-size="9" text-anchor="middle" class="t-orange" font-weight="600">results: mark the ROB entry done</text>
<text x="462" y="300" font-size="9" text-anchor="middle" class="t-orange" font-weight="600">and wake up µops waiting for them</text>
<polyline points="330,250 330,280.4" fill="none" class="s-green" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M330,286 L326.9,279 L333.1,279 Z" class="f-green" stroke="none"/>
<rect x="200" y="286" width="160" height="30" rx="4" class="f-green" fill-opacity="0.12" stroke="none"/>
<rect x="200" y="286" width="160" height="30" rx="4" fill="none" class="s-green" stroke-width="1.6"/>
<text x="280" y="304.9" font-size="11" text-anchor="middle" font-weight="600">Retire (commit) in order</text>
<text x="196" y="306" font-size="10" text-anchor="end">architectural state ←</text>
</svg>`,
          alt: 'Block diagram of an out-of-order core: an in-order front end (fetch with branch prediction, decode into micro-ops, rename) feeds a scheduler and allocates reorder-buffer entries; the scheduler issues micro-ops out of order to ALU, branch, FP/SIMD, load and store units; results mark ROB entries done and wake waiting micro-ops; instructions retire in order from the ROB head.',
          caption: 'In order at both ends, out of order in the middle. The front end feeds the window in program order; the reorder buffer drains it in program order.',
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Fetch and decode, in order',
              text: 'Following the branch predictor, the front end decodes instructions into [[micro-op|micro-ops]].',
            },
            {
              title: 'Rename, in order',
              text: 'Each µop\'s registers are renamed to physical registers (next card), and it gets an entry at the tail of the reorder buffer.',
            },
            {
              title: 'Schedule and execute, out of order',
              text: 'µops wait in the scheduler until their input values are ready, then issue to any free execution unit of the right kind.',
            },
            {
              title: 'Complete',
              text: 'The result is written, the ROB entry is marked done, and µops waiting for this value are woken up.',
            },
            {
              title: 'Retire, in order',
              text: 'From the head of the ROB, finished instructions commit their results to the architectural state, oldest first.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why reorder in hardware?',
          text: 'The compiler schedules code once, without knowing which loads will miss the cache this time, which branch direction comes next, or what other work is around. The hardware sees all of that at run time. Out-of-order execution lets a core keep working during a 4-cycle L1 hit, a 15-cycle L2 hit, or part of a several-hundred-cycle DRAM miss, as long as independent instructions exist in its window. The idea dates back to Tomasulo\'s algorithm in the IBM System/360 Model 91 (1967); it became standard in desktop CPUs with the Pentium Pro in 1995.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Register renaming: removing false dependences',
      blocks: [
        {
          type: 'p',
          text: 'x86-64 has only 16 general-purpose registers, so compilers reuse register names constantly. Reuse creates dependences that have nothing to do with data flow:',
        },
        {
          type: 'code',
          title: 'Name dependences (hand-written x86-64)',
          lang: 'text',
          code: `imul  rax, rbx         ; (1) slow multiply writes rax
add   rcx, rax         ; (2) reads rax: true dependence on (1)
mov   rax, [rsi]       ; (3) reuses the NAME rax for new data
add   rdx, rax         ; (4) reads the new rax`,
          annotations: [
            {
              lines: 2,
              text: 'Read after write (RAW): must wait for (1). This is real data flow.',
            },
            {
              lines: 3,
              text: 'Write after read (WAR) with (2) and write after write (WAW) with (1). If (3) wrote `rax` early, (2) would read the wrong value. But (3) does not *use* anything from (1) or (2): the conflict is only about the name.',
            },
            {
              lines: 4,
              text: 'With only one physical `rax`, (3) and (4) would wait behind the slow multiply for no reason.',
            },
          ],
        },
        {
          type: 'p',
          text: '[[register-renaming|Register renaming]] gives every new value its own **physical register**. The core has a few hundred physical registers (on the order of 150 to 300 integer registers in recent big cores) behind the 16 architectural names, and a rename table that records which physical register currently holds each name:',
        },
        {
          type: 'table',
          headers: ['Instruction', 'Writes', 'Renamed to', 'Reads'],
          rows: [
            ['(1) `imul rax, rbx`', '`rax`', '`p41`', '`rax`→`p7`, `rbx`→`p12`'],
            ['(2) `add rcx, rax`', '`rcx`', '`p42`', '`rcx`→`p3`, `rax`→**`p41`**'],
            ['(3) `mov rax, [rsi]`', '`rax`', '**`p43`**', '`rsi`→`p9`'],
            ['(4) `add rdx, rax`', '`rdx`', '`p44`', '`rdx`→`p5`, `rax`→**`p43`**'],
          ],
          caption: 'After renaming, (3) and (4) use `p43` and share nothing with (1) and (2). They can execute while the multiply is still running.',
        },
        {
          type: 'p',
          text: 'Only true (RAW) dependences survive renaming. That is why the small architectural register file of x86 is not the handicap it looks like, and why the "multiple accumulators" trick works even when the compiler reuses the same few registers.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Free instructions',
          text: 'Renaming also makes some instructions free. Recent cores can perform a register-to-register `mov` in the rename stage just by updating the table ("move elimination"), and recognize zeroing idioms such as `xor eax, eax` as having no input dependence at all.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Put the life of one instruction in an out-of-order core in order.',
      linesAreCode: false,
      lines: [
        'Fetch it, following the branch predictor\'s guess',
        'Decode it into one or more µops',
        'Rename its registers and allocate an entry at the tail of the reorder buffer',
        'Wait in the scheduler until its operands are ready, then execute on a free unit',
        'Write the result, mark its ROB entry done and wake up waiting µops',
        'Retire it from the head of the ROB, in program order',
      ],
      explanation: 'The front end (fetch, decode, rename) works strictly in program order, because renaming must see register writes in order to build the right mapping. Execution and completion happen in data-flow order, whenever operands are ready. Retirement returns to program order, so that exceptions and mispredictions can be handled as if the program had run one instruction at a time.',
    },
    {
      kind: 'concept',
      title: 'The reorder buffer: out of order inside, in order outside',
      blocks: [
        {
          type: 'p',
          text: 'If instructions finish out of order, what happens when one of them faults, or turns out to be on the wrong side of a mispredicted branch? The [[reorder-buffer]] (ROB) solves both. It is a circular queue with one entry per instruction in flight, in program order. Instructions enter at the tail, may complete in any order, and **retire only from the head**, and only once they are complete. Step through a toy 2-wide core with an 8-entry ROB. `I1` is a load that takes 6 cycles:',
        },
        {
          type: 'algo',
          view: 'array',
          interval: 1300,
          frames: [
            {
              note: 'An empty 8-entry reorder buffer. Instructions will **enter in order**, **execute when their inputs are ready**, and **retire in order** from the head.',
              array: ['·', '·', '·', '·', '·', '·', '·', '·'],
              pointers: [
                { index: 0, label: 'head' },
              ],
              vars: [
                ['cycle', '0'],
                ['retired', '–'],
              ],
            },
            {
              note: 'Cycle 1: I1 and I2 enter the ROB.',
              array: ['I1', 'I2', '·', '·', '·', '·', '·', '·'],
              marks: [
                { index: 0, color: 'blue' },
                { index: 1, color: 'blue' },
              ],
              dim: [2, 3, 4, 5, 6, 7],
              pointers: [
                { index: 0, label: 'head' },
                { index: 2, label: 'tail', color: 'blue' },
              ],
              vars: [
                ['cycle', '1'],
                ['retired', '–'],
              ],
              lines: [],
            },
            {
              note: 'Cycle 2: I1 starts executing; I3 and I4 enter the ROB.',
              array: ['I1', 'I2', 'I3', 'I4', '·', '·', '·', '·'],
              marks: [
                { index: 0, color: 'orange' },
                { index: 1, color: 'blue' },
                { index: 2, color: 'blue' },
                { index: 3, color: 'blue' },
              ],
              dim: [4, 5, 6, 7],
              pointers: [
                { index: 0, label: 'head' },
                { index: 4, label: 'tail', color: 'blue' },
              ],
              vars: [
                ['cycle', '2'],
                ['retired', '–'],
              ],
              lines: [1],
            },
            {
              note: 'Cycle 3: I3 and I4 start executing; I5 and I6 enter the ROB.',
              array: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', '·', '·'],
              marks: [
                { index: 0, color: 'orange' },
                { index: 1, color: 'blue' },
                { index: 2, color: 'orange' },
                { index: 3, color: 'orange' },
                { index: 4, color: 'blue' },
                { index: 5, color: 'blue' },
              ],
              dim: [6, 7],
              pointers: [
                { index: 0, label: 'head' },
                { index: 6, label: 'tail', color: 'blue' },
              ],
              vars: [
                ['cycle', '3'],
                ['retired', '–'],
              ],
              lines: [3, 4],
            },
            {
              note: 'Cycle 4: I4 finishes; I5 starts executing; I7 and I8 enter the ROB.',
              array: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8'],
              marks: [
                { index: 0, color: 'orange' },
                { index: 1, color: 'blue' },
                { index: 2, color: 'orange' },
                { index: 3, color: 'green' },
                { index: 4, color: 'orange' },
                { index: 5, color: 'blue' },
                { index: 6, color: 'blue' },
                { index: 7, color: 'blue' },
              ],
              dim: [],
              pointers: [
                { index: 0, label: 'head' },
              ],
              vars: [
                ['cycle', '4'],
                ['retired', '–'],
              ],
              lines: [4, 5],
            },
            {
              note: 'Cycle 5: I3 and I5 finish; I7 and I8 start executing.',
              array: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8'],
              marks: [
                { index: 0, color: 'orange' },
                { index: 1, color: 'blue' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'blue' },
                { index: 6, color: 'orange' },
                { index: 7, color: 'orange' },
              ],
              dim: [],
              pointers: [
                { index: 0, label: 'head' },
              ],
              vars: [
                ['cycle', '5'],
                ['retired', '–'],
              ],
              lines: [3, 5, 7, 8],
            },
            {
              note: 'Cycle 6: I7 and I8 finish.',
              array: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8'],
              marks: [
                { index: 0, color: 'orange' },
                { index: 1, color: 'blue' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'blue' },
                { index: 6, color: 'green' },
                { index: 7, color: 'green' },
              ],
              dim: [],
              pointers: [
                { index: 0, label: 'head' },
              ],
              vars: [
                ['cycle', '6'],
                ['retired', '–'],
              ],
              lines: [7, 8],
            },
            {
              note: 'Cycle 7: I1 finishes; I2 starts executing.',
              array: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8'],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'orange' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'blue' },
                { index: 6, color: 'green' },
                { index: 7, color: 'green' },
              ],
              dim: [],
              pointers: [
                { index: 0, label: 'head' },
              ],
              vars: [
                ['cycle', '7'],
                ['retired', '–'],
              ],
              lines: [1, 2],
            },
            {
              note: 'Cycle 8: **retire** I1; I2 finishes; I6 starts executing.',
              array: ['·', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8'],
              marks: [
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'orange' },
                { index: 6, color: 'green' },
                { index: 7, color: 'green' },
              ],
              dim: [0],
              pointers: [
                { index: 1, label: 'head' },
                { index: 0, label: 'tail', color: 'blue' },
              ],
              vars: [
                ['cycle', '8'],
                ['retired', 'I1'],
              ],
              lines: [2, 6],
            },
            {
              note: 'Cycle 9: **retire** I2 and I3; I6 finishes.',
              array: ['·', '·', '·', 'I4', 'I5', 'I6', 'I7', 'I8'],
              marks: [
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'green' },
                { index: 6, color: 'green' },
                { index: 7, color: 'green' },
              ],
              dim: [0, 1, 2],
              pointers: [
                { index: 3, label: 'head' },
                { index: 0, label: 'tail', color: 'blue' },
              ],
              vars: [
                ['cycle', '9'],
                ['retired', 'I1 I2 I3'],
              ],
              lines: [6],
            },
            {
              note: 'Cycle 10: **retire** I4 and I5.',
              array: ['·', '·', '·', '·', '·', 'I6', 'I7', 'I8'],
              marks: [
                { index: 5, color: 'green' },
                { index: 6, color: 'green' },
                { index: 7, color: 'green' },
              ],
              dim: [0, 1, 2, 3, 4],
              pointers: [
                { index: 5, label: 'head' },
                { index: 0, label: 'tail', color: 'blue' },
              ],
              vars: [
                ['cycle', '10'],
                ['retired', 'I1 I2 I3 I4 I5'],
              ],
              lines: [],
            },
            {
              note: 'Cycle 11: **retire** I6 and I7.',
              array: ['·', '·', '·', '·', '·', '·', '·', 'I8'],
              marks: [
                { index: 7, color: 'green' },
              ],
              dim: [0, 1, 2, 3, 4, 5, 6],
              pointers: [
                { index: 7, label: 'head' },
                { index: 0, label: 'tail', color: 'blue' },
              ],
              vars: [
                ['cycle', '11'],
                ['retired', 'I1 I2 I3 I4 I5 I6 I7'],
              ],
              lines: [],
            },
            {
              note: 'Cycle 12: **retire** I8.',
              array: ['·', '·', '·', '·', '·', '·', '·', '·'],
              marks: [],
              dim: [0, 1, 2, 3, 4, 5, 6, 7],
              pointers: [
                { index: 0, label: 'head' },
              ],
              vars: [
                ['cycle', '12'],
                ['retired', 'I1 I2 I3 I4 I5 I6 I7 I8'],
              ],
              lines: [],
            },
          ],
          code: `I1: lw   x1, 0(x10)
I2: add  x2, x1, x3
I3: mul  x4, x5, x6
I4: add  x7, x8, x9
I5: sub  x11, x7, x12
I6: add  x13, x2, x14
I7: and  x15, x11, x4
I8: or   x16, x9, x9`,
          lang: 'text',
          caption: 'A toy out-of-order core: 2 instructions enter and 2 retire per cycle. Blue = waiting for inputs, orange = executing, green = finished but not yet retired. New entries go in at the tail, just after the last filled entry.',
        },
        {
          type: 'p',
          text: 'By cycle 6, everything except `I1` and its dependents has finished, but nothing can retire: `I1` sits at the head. Once it completes, the backlog retires two per cycle. The program\'s visible state (architectural registers and memory) changed in exactly the original order.',
        },
        {
          type: 'table',
          headers: ['Event', 'How the ROB handles it'],
          rows: [
            [
              'Exception (page fault, divide by zero)',
              'Recorded in the entry; raised only when that entry reaches the head. Older instructions are done, younger ones are discarded: a **precise** exception.',
            ],
            [
              'Branch misprediction',
              'All entries younger than the branch are squashed and their physical registers freed; fetch restarts at the right target.',
            ],
            [
              'Stores',
              'Held in a store buffer and written to the cache only after retiring, so a squashed store never reaches memory.',
            ],
          ],
        },
        {
          type: 'p',
          text: 'The ROB\'s size limits how far ahead the core can look. Recent big cores have roughly 200 to 500+ entries (for example 224 in Intel Skylake and AMD Zen 2, 320 in Zen 4, 512 in Intel Golden Cove). That sounds large, but a DRAM miss costs a few hundred cycles; at 4 instructions per cycle the window fills long before the data arrives, and the core stalls. Out-of-order execution hides cache **hits** and short misses; it cannot hide a long run of DRAM misses. Hence the memory hierarchy unit.',
        },
      ],
    },
    {
      kind: 'numeric',
      prompt: 'A core with a 224-entry reorder buffer adds 4 instructions per cycle to the ROB. A load at the head of the ROB misses all caches and needs 300 cycles. Assuming the front end keeps up, after how many cycles is the ROB full so the core must stop issuing?',
      answer: 56,
      unit: 'cycles',
      label: 'Full after',
      hint: 'The load cannot retire, so nothing behind it can retire either.',
      explanation: '224 entries / 4 per cycle = 56 cycles. For the remaining ~244 cycles of the miss, the core can still finish instructions already in the window but cannot add new ones, and nothing retires. That is why a cache miss on a pointer you need right away (like `node->next`) is so expensive, and why prefetching and cache-friendly layouts matter even on the most advanced cores.',
    },
    {
      kind: 'concept',
      title: 'Speculative execution',
      blocks: [
        {
          type: 'p',
          text: 'Put branch prediction and out-of-order execution together and the core runs **far ahead of certainty**. With a window of hundreds of instructions and a branch every five or so, most of the instructions in flight lie beyond one or more branches that have not been resolved. The core executes them anyway: [[speculative-execution]].',
        },
        {
          type: 'p',
          text: 'Correctness is protected by the ROB. Speculative results live in physical registers and the store buffer; they become architectural only at retirement, and retirement waits for every older branch to be confirmed. On a misprediction, the wrong-path instructions are squashed and it is as if they never ran. Architecturally, that is exactly true.',
        },
        {
          type: 'p',
          text: 'Microarchitecturally, it is not. A squashed load **did** fetch its cache line into the cache. Squashed instructions **did** train the branch predictor and occupy execution units. None of this changes a register or a byte of memory, so the ISA contract holds, but it changes **timing**, and timing can be measured.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Speculation and performance',
          text: 'Speculation is where most of a modern core\'s performance comes from: it turns branch prediction accuracy directly into speed. It also means that a mispredicted branch throws away not just a few stages but potentially hundreds of instructions of work, and the energy spent on them.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Instructions executed speculatively on a mispredicted path leave no trace anywhere in the processor once they are squashed.',
      answer: false,
      explanation: 'They leave no **architectural** trace: no register or memory value changes. But they can leave **microarchitectural** traces: cache lines they loaded stay cached, predictor tables they trained stay trained. Those traces are invisible to correctness but visible to timing, which is precisely what the Spectre family of attacks exploits.',
    },
    {
      kind: 'concept',
      title: 'Spectre, conceptually',
      blocks: [
        {
          type: 'p',
          text: 'In 2018 researchers disclosed [[spectre|Spectre]]: a way to turn speculative execution\'s timing traces into a data leak. The classic "bounds check bypass" (variant 1) needs nothing more exotic than this pattern in a victim program:',
        },
        {
          type: 'code',
          title: 'The Spectre v1 pattern',
          code: `if (x < arraySize) {                 // (1) bounds check
    std::uint8_t secret = array1[x];   // (2) load, maybe out of bounds
    probe = array2[secret * 4096];     // (3) secret picks a cache line
}`,
          annotations: [
            {
              lines: 1,
              text: 'The attacker first calls this many times with valid `x`, training the predictor that the branch is taken. Then they pass an out-of-bounds `x`, ideally while `arraySize` is not in the cache, so the check resolves slowly.',
            },
            {
              lines: 2,
              text: 'Predicted taken, the core speculatively reads `array1[x]`, which is really some other byte in the victim\'s memory.',
            },
            {
              lines: 3,
              text: 'Still speculating, it loads one line of `array2` chosen by that byte. Then the misprediction is discovered and everything is squashed, except that the line stays in the cache.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Finally the attacker times accesses to each of the 256 candidate lines of `array2`: the one that is fast reveals the secret byte. No architectural rule was broken; the leak is purely in timing. Variants poison other predictors, such as the branch target buffer for indirect jumps (variant 2).',
        },
        {
          type: 'table',
          headers: ['Mitigation', 'Idea'],
          rows: [
            [
              'Speculation barriers (`lfence` on x86)',
              'Stop speculation past a sensitive check, at a cost in speed.',
            ],
            [
              'Index masking',
              'Clamp `x` with arithmetic (no branch) so even a speculative access stays in bounds. Linux uses this as `array_index_nospec`.',
            ],
            [
              'Retpolines and hardware controls',
              'Prevent attackers from steering indirect branch prediction (variant 2).',
            ],
            [
              'Isolation',
              'Keep secrets out of the same address space as untrusted code; browsers moved each site into its own process.',
            ],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why it cannot simply be patched away',
          text: 'Spectre is not a bug in one chip but a consequence of the design principle "speculate freely, roll back architectural state": rollback restores registers and memory but not caches or predictors. Fixing it completely would mean giving up much of what speculation buys, so the industry uses targeted mitigations at the boundaries where untrusted code meets secrets: kernels, browsers, hypervisors, and other high-assurance systems.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'In the Spectre v1 pattern, how does the secret byte actually reach the attacker?',
      options: [
        {
          text: 'The speculative load writes it into a register the attacker can read after the squash',
          why: 'Squashing restores all architectural registers; the attacker never sees the speculative register values.',
        },
        {
          text: 'It is encoded in **which cache line** of `array2` was loaded, and recovered by timing accesses to each line',
          correct: true,
          why: 'The only lasting effect of the squashed instructions is microarchitectural: one line is now cached. Measuring access times finds that line, and its index is the secret.',
        },
        {
          text: 'The processor raises an exception that contains the out-of-bounds value',
          why: 'No exception is raised: the faulting-looking access was on a squashed path and never retired.',
        },
        {
          text: 'The branch predictor stores the secret in its history table',
          why: 'The predictor is used to *trigger* the mis-speculation, not to carry the data out; the covert channel is the cache.',
        },
      ],
      explanation: 'Spectre needs two ingredients: a way to make the victim speculatively access a secret (mistrained prediction), and a covert channel that survives the squash (cache state, read by timing). Mitigations attack one or the other: stop the speculative access (barriers, masking) or remove the attacker\'s ability to observe it (isolation).',
    },
    {
      kind: 'concept',
      title: 'Simultaneous multithreading (Hyper-Threading)',
      blocks: [
        {
          type: 'p',
          text: 'Even a great out-of-order core leaves execution units idle: one thread stalls on a cache miss, or simply lacks enough ILP to fill 4 to 8 issue slots. [[simultaneous-multithreading|Simultaneous multithreading]] (SMT, Intel\'s brand name is Hyper-Threading) lets **two hardware threads share one core**. The core keeps a separate architectural state for each thread (registers, PC, rename map) and mixes µops from both into the same scheduler and execution units.',
        },
        {
          type: 'table',
          headers: ['Resource', 'With SMT'],
          rows: [
            [
              'Architectural registers, PC, rename tables',
              'One copy **per thread**',
            ],
            [
              'Execution units, scheduler',
              'Shared: µops from both threads mix freely',
            ],
            [
              'L1/L2 caches, TLBs, branch predictor',
              'Shared: the threads compete for capacity',
            ],
            [
              'ROB, load and store buffers',
              'Typically partitioned, often split in half',
            ],
          ],
        },
        {
          type: 'p',
          text: 'The OS sees two logical CPUs per core. When one thread stalls, the other uses the idle units, so total throughput typically rises by a modest fraction, often quoted in the 10 to 30% range for mixed workloads. But each thread runs **slower** than it would alone, since it shares caches and units; two threads that both hammer the same units, or both thrash the same cache, can gain nothing or even lose.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Consoles and engines',
          text: 'The PS5 and Xbox Series X|S both use 8 AMD Zen 2 cores with SMT, 16 hardware threads in total. The Series X even lets developers choose: 3.8 GHz with SMT off, or 3.66 GHz with SMT on. Engines like Unreal size their task-graph worker pools to the hardware threads available, and latency-critical threads (game thread, render thread) are often given whole cores where the platform allows it.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Sibling threads',
          text: 'When profiling, know whether two of your threads share a physical core. A job system that puts two heavy SIMD jobs on sibling hyperthreads may see each run at little more than half speed.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which of these can an out-of-order core with a 300-entry ROB **not** hide effectively?',
      options: [
        {
          text: 'A 4-cycle L1 cache hit followed by an unrelated multiply',
          why: 'The multiply is independent and simply executes while the load is in flight: easily hidden.',
        },
        {
          text: '`rax` being reused by the compiler for an unrelated value',
          why: 'That is a WAR/WAW name dependence, which register renaming removes entirely.',
        },
        {
          text: 'A linked-list walk in which every `node->next` misses to DRAM',
          correct: true,
          why: 'Each miss costs hundreds of cycles and the next address depends on it. The window fills behind each miss and there is no independent work to overlap: the loop runs at the speed of memory latency.',
        },
        {
          text: 'A correctly predicted branch',
          why: 'A correctly predicted branch costs essentially nothing: speculation simply continues down the right path.',
        },
      ],
      explanation: 'Out-of-order execution hides latency only by finding **independent** work within its window. A chain of dependent long-latency loads offers none: each miss must finish before the next can even start. The cures are in software: contiguous arrays, prefetching, and data layouts that turn chains into independent accesses.',
    },
  ],
  takeaways: [
    'Instruction-level parallelism is independent work in the instruction stream; superscalar cores exploit it by issuing several instructions per cycle (IPC > 1).',
    'Dependency chains run at the speed of **latency**; independent work runs at the speed of **throughput**. Keep about latency × throughput operations in flight.',
    'Multiple accumulators break a reduction\'s chain; compilers will not do it for floats without fast-math because the result changes slightly.',
    'Out-of-order cores fetch and rename in order, execute when operands are ready, and retire in order through the reorder buffer.',
    'Register renaming maps architectural names to many physical registers, removing WAR and WAW dependences.',
    'Speculative execution runs past unresolved branches and rolls back architectural state on a mispredict; Spectre exploits the microarchitectural traces that remain.',
    'SMT shares one core\'s execution resources between two hardware threads: more total throughput, less per-thread speed.',
  ],
  reading: [
    {
      title: 'Agner Fog: Instruction tables and microarchitecture guide',
      url: 'https://www.agner.org/optimize/',
      source: 'article',
      note: 'Measured latency and throughput of every instruction, and ROB, scheduler and port details for real cores.',
    },
    {
      title: 'Out-of-order execution (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Out-of-order_execution',
      source: 'article',
      note: 'History from the CDC 6600 and IBM 360/91 to modern cores, and the basic structures.',
    },
    {
      title: 'Register renaming (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Register_renaming',
      source: 'article',
      note: 'A clear walk through architectural versus physical registers and rename tables.',
    },
    {
      title: 'Spectre and Meltdown',
      url: 'https://spectreattack.com/',
      source: 'article',
      note: 'The original papers and FAQ from the researchers who found the attacks.',
    },
    {
      title: 'Simultaneous multithreading (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Simultaneous_multithreading',
      source: 'article',
      note: 'What is shared and duplicated, and the performance and security trade-offs.',
    },
  ],
};
