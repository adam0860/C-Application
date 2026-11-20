import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-measuring-performance',
  title: 'Measuring Performance',
  summary: 'The iron law and Amdahl\'s law, honest benchmarks, sampling vs instrumenting profilers, and the hardware counters that tell you why code is slow.',
  minutes: 20,
  objectives: [
    'Decompose run time with the iron law: instructions × CPI × cycle time',
    'Use Amdahl\'s law to predict the payoff of more cores or of speeding up one system',
    'Write a microbenchmark that survives dead-code elimination, warm-up effects and noise',
    'Choose between sampling and instrumenting profilers, and know what perf, VTune, Superluminal, Tracy and PIX are for',
    'Read hardware performance counters (cycles, instructions, IPC, cache misses, branch misses) and turn them into a hypothesis',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Performance is a budget',
      blocks: [
        {
          type: 'p',
          text: 'In most software, "fast" is a feeling. In games it is a number. At 60 frames per second every frame must finish in **16.67 ms**; at 120 fps you have **8.33 ms**; a 30 fps console game gets 33.3 ms. Miss the deadline once and the player sees a hitch. Miss it often and the game feels broken, whatever its art looks like.',
        },
        {
          type: 'table',
          headers: ['Target', 'Frame budget', 'Typical use'],
          rows: [
            ['30 fps', '33.3 ms', 'Cinematic console modes'],
            ['60 fps', '16.67 ms', 'Console performance modes, most PC games'],
            ['120 fps', '8.33 ms', 'Competitive shooters, high-refresh monitors'],
            ['90 fps', '11.1 ms', 'VR headsets (missing frames causes nausea)'],
          ],
        },
        {
          type: 'p',
          text: 'Studios split that [[frame-budget]] between systems: so many milliseconds for gameplay, physics, animation, audio and render submission. Each team owns its slice and watches it in every build. When a slice grows, someone has to find out **why**, and that is what this lesson is about: turning "it feels slow" into numbers that point at a cause.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why measure instead of reason?',
          text: 'Everything you learned in this course (pipelines, caches, branch predictors, out-of-order cores) interacts in ways nobody predicts reliably by reading code. A change that removes instructions can make code slower because it adds a cache miss; a "slow" virtual call can cost nothing because it is perfectly predicted. Experienced engineers are wrong about hotspots all the time. The profile is the ground truth; your intuition is a hypothesis to test.',
        },
        {
          type: 'p',
          text: 'You will learn two laws that frame every optimization, then the practical tools: honest timing with `std::chrono`, sampling and instrumenting profilers, and the CPU\'s own hardware counters.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The iron law of performance',
      blocks: [
        {
          type: 'p',
          text: 'Any piece of code takes some number of instructions, each instruction takes some number of clock cycles on average, and each cycle takes a fixed time. Multiply them and you get the run time. That product is the [[iron-law-of-performance]]:',
        },
        {
          type: 'definition',
          term: 'Iron law',
          text: '**time = instruction count × CPI × cycle time**, where [[cpi|CPI]] is the average number of *cycles per instruction*. Cycle time is 1 / clock rate, so at 3 GHz one cycle is 0.333 ns. The reciprocal of CPI is **IPC**, *instructions per cycle*.',
        },
        {
          type: 'p',
          text: 'The law is useful because each factor is moved by different things, so it tells you **where** a speedup can come from:',
        },
        {
          type: 'table',
          headers: ['Factor', 'What changes it'],
          rows: [
            ['Instruction count', 'The algorithm, the compiler and its flags, the ISA (one SIMD instruction does 4–16 operations), removing redundant work'],
            ['CPI', 'Cache misses, branch mispredictions, dependency chains, how many instructions the core can issue per cycle'],
            ['Cycle time', 'The clock: fixed by the hardware (and by turbo and thermal limits), not by your code'],
          ],
        },
        {
          type: 'code',
          runnable: true,
          title: 'iron_law.cpp',
          code: `#include <cstdio>

// The iron law: time = instructions x CPI x cycle time.
struct Build {
    const char* name;
    double instructions;   // dynamic count per frame
    double cpi;            // average cycles per instruction
};

int main() {
    const double ghz = 3.0;                 // clock rate
    const double cycleNs = 1.0 / ghz;       // cycle time
    const Build builds[] = {
        {"baseline", 30e6, 1.50},
        {"fewer cache misses", 30e6, 0.75},
        {"SIMD (fewer instrs)", 12e6, 1.00},
    };
    for (const Build& b : builds) {
        double cycles = b.instructions * b.cpi;
        double ms = cycles * cycleNs / 1e6;
        std::printf("%-20s %5.1fM instr  CPI %.2f"
                    "  -> %5.2f ms\\n",
                    b.name, b.instructions / 1e6, b.cpi, ms);
    }
}`,
          output: `baseline              30.0M instr  CPI 1.50  -> 15.00 ms
fewer cache misses    30.0M instr  CPI 0.75  ->  7.50 ms
SIMD (fewer instrs)   12.0M instr  CPI 1.00  ->  4.00 ms`,
          annotations: [
            { lines: 6, text: '*Dynamic* instruction count: how many instructions actually execute, loop iterations included. It is not the number of lines of assembly in the binary.' },
            { lines: '14-16', text: 'Three versions of the same frame. The second keeps every instruction but halves CPI (fewer stalls on memory). The third executes fewer, wider instructions, and its CPI went *up* because each SIMD instruction does more work.' },
            { lines: '19-20', text: 'cycles = instructions × CPI; milliseconds = cycles × ns per cycle / 10⁶.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Never compare CPI alone',
          text: 'The SIMD build has a *worse* CPI than the cache-friendly build and is still the fastest. A metric that is one factor of a product can mislead on its own. IPC is a great diagnostic ("this loop stalls a lot") and a terrible scoreboard. The scoreboard is time.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'numeric',
      prompt: 'A physics step executes 50 million instructions with an average CPI of 1.2 on a 4 GHz core. How long does it take, in milliseconds?',
      hint: 'Cycles = instructions × CPI. At 4 GHz one cycle is 0.25 ns.',
      answer: 15,
      unit: 'ms',
      explanation: 'Cycles = 50 × 10⁶ × 1.2 = 60 × 10⁶. At 4 GHz each cycle is 0.25 ns, so the time is 60 × 10⁶ × 0.25 ns = 15 × 10⁶ ns = **15 ms**, almost an entire 60 fps frame. To halve it you must halve one of the factors: half the instructions (a better algorithm or SIMD), half the CPI (fewer misses and mispredictions) or double the clock, which is the one lever you do not have.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Amdahl\'s law: the part you did not speed up',
      blocks: [
        {
          type: 'p',
          text: 'Suppose a fraction *p* of the run time can be made *s* times faster, and the rest cannot. The new time is (1 − p) + p / s of the old one, so the overall speedup is:',
        },
        {
          type: 'definition',
          term: 'Amdahl\'s law',
          text: '**speedup = 1 / ((1 − p) + p / s)**. As *s* grows without limit, the speedup approaches **1 / (1 − p)**. The part you did not improve sets the ceiling.',
        },
        {
          type: 'p',
          text: '[[amdahls-law]] has two everyday uses. With *s* = number of cores it predicts the payoff of parallelism. With *s* = how much faster you made one system, it predicts what that optimization does for the whole frame. Step through a frame of 20 ms where 4 ms must run on one thread:',
        },
        {
  "type": "algo",
  "view": "array",
  "bars": true,
  "interval": 1400,
  "caption": "Amdahl's law on a 20 ms frame with a 4 ms serial part. Bars are milliseconds: the 1-core frame for scale, the serial part, the parallel part, and the new frame time.",
  "code": "// p = parallel fraction, n = cores\ndouble speedup(double p, int n) {\n    return 1.0 / ((1.0 - p) + p / n);\n}\n// as n grows: speedup -> 1 / (1 - p)",
  "frames": [
    {
      "note": "One core: 4 ms of serial work plus 16 ms of parallel work make a 20 ms frame. So *p* = 16/20 = 0.8.",
      "array": [
        20,
        4,
        16,
        20
      ],
      "marks": [
        {
          "index": 0,
          "color": "gray"
        },
        {
          "index": 1,
          "color": "red"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "1 core",
          "color": "gray"
        },
        {
          "index": 1,
          "label": "serial",
          "color": "red"
        },
        {
          "index": 2,
          "label": "parallel",
          "color": "blue"
        },
        {
          "index": 3,
          "label": "frame",
          "color": "orange"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "cores",
          "1"
        ],
        [
          "frame",
          "20 ms"
        ],
        [
          "speedup",
          "1.00×"
        ]
      ]
    },
    {
      "note": "Two cores halve the parallel part: 4 + 8 = 12 ms, a 1.67× speedup, not 2×.",
      "array": [
        20,
        4,
        8,
        12
      ],
      "marks": [
        {
          "index": 0,
          "color": "gray"
        },
        {
          "index": 1,
          "color": "red"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "1 core",
          "color": "gray"
        },
        {
          "index": 1,
          "label": "serial",
          "color": "red"
        },
        {
          "index": 2,
          "label": "parallel",
          "color": "blue"
        },
        {
          "index": 3,
          "label": "frame",
          "color": "orange"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "cores",
          "2"
        ],
        [
          "frame",
          "12 ms"
        ],
        [
          "speedup",
          "1.67×"
        ]
      ]
    },
    {
      "note": "Four cores: 4 + 4 = 8 ms. The serial part is now half of the frame.",
      "array": [
        20,
        4,
        4,
        8
      ],
      "marks": [
        {
          "index": 0,
          "color": "gray"
        },
        {
          "index": 1,
          "color": "red"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "1 core",
          "color": "gray"
        },
        {
          "index": 1,
          "label": "serial",
          "color": "red"
        },
        {
          "index": 2,
          "label": "parallel",
          "color": "blue"
        },
        {
          "index": 3,
          "label": "frame",
          "color": "orange"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "cores",
          "4"
        ],
        [
          "frame",
          "8 ms"
        ],
        [
          "speedup",
          "2.50×"
        ]
      ]
    },
    {
      "note": "Eight cores: 4 + 2 = 6 ms. Doubling the cores again bought only 2 ms.",
      "array": [
        20,
        4,
        2,
        6
      ],
      "marks": [
        {
          "index": 0,
          "color": "gray"
        },
        {
          "index": 1,
          "color": "red"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "1 core",
          "color": "gray"
        },
        {
          "index": 1,
          "label": "serial",
          "color": "red"
        },
        {
          "index": 2,
          "label": "parallel",
          "color": "blue"
        },
        {
          "index": 3,
          "label": "frame",
          "color": "orange"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "cores",
          "8"
        ],
        [
          "frame",
          "6 ms"
        ],
        [
          "speedup",
          "3.33×"
        ]
      ]
    },
    {
      "note": "Sixteen cores: 4 + 1 = 5 ms, a 4× speedup from 16× the hardware.",
      "array": [
        20,
        4,
        1,
        5
      ],
      "marks": [
        {
          "index": 0,
          "color": "gray"
        },
        {
          "index": 1,
          "color": "red"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "1 core",
          "color": "gray"
        },
        {
          "index": 1,
          "label": "serial",
          "color": "red"
        },
        {
          "index": 2,
          "label": "parallel",
          "color": "blue"
        },
        {
          "index": 3,
          "label": "frame",
          "color": "orange"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "cores",
          "16"
        ],
        [
          "frame",
          "5 ms"
        ],
        [
          "speedup",
          "4.00×"
        ]
      ]
    },
    {
      "note": "64 cores: 4.25 ms. The serial 4 ms is now 94% of the frame.",
      "array": [
        20,
        4,
        0.25,
        4.25
      ],
      "marks": [
        {
          "index": 0,
          "color": "gray"
        },
        {
          "index": 1,
          "color": "red"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "1 core",
          "color": "gray"
        },
        {
          "index": 1,
          "label": "serial",
          "color": "red"
        },
        {
          "index": 2,
          "label": "parallel",
          "color": "blue"
        },
        {
          "index": 3,
          "label": "frame",
          "color": "orange"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "cores",
          "64"
        ],
        [
          "frame",
          "4.25 ms"
        ],
        [
          "speedup",
          "4.71×"
        ]
      ]
    },
    {
      "note": "Infinite cores: the parallel part shrinks to zero, but the 4 ms serial part remains. The speedup can never exceed 1 / (1 − *p*) = 5×.",
      "array": [
        20,
        4,
        0,
        4
      ],
      "marks": [
        {
          "index": 0,
          "color": "gray"
        },
        {
          "index": 1,
          "color": "red"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "1 core",
          "color": "gray"
        },
        {
          "index": 1,
          "label": "serial",
          "color": "red"
        },
        {
          "index": 2,
          "label": "parallel",
          "color": "blue"
        },
        {
          "index": 3,
          "label": "frame",
          "color": "green"
        }
      ],
      "lines": [
        5
      ],
      "vars": [
        [
          "cores",
          "∞"
        ],
        [
          "frame",
          "4 ms"
        ],
        [
          "speedup",
          "5.00×"
        ]
      ]
    }
  ]
},
        {
          type: 'code',
          runnable: true,
          title: 'amdahl.cpp',
          code: `#include <cstdio>
#include <initializer_list>

// Amdahl's law: speed up a fraction p of the work by s.
double amdahl(double p, double s) {
    return 1.0 / ((1.0 - p) + p / s);
}

int main() {
    // A 20 ms frame: 4 ms must run on one thread,
    // 16 ms is spread across worker cores.
    const double p = 16.0 / 20.0;
    std::printf("cores  frame ms  speedup\\n");
    for (int cores : {1, 2, 4, 8, 16, 64}) {
        double ms = 4.0 + 16.0 / cores;
        std::printf("%5d  %8.2f  %6.2fx\\n",
                    cores, ms, amdahl(p, cores));
    }
    std::printf("limit  %8.2f  %6.2fx\\n", 4.0, 1.0 / (1.0 - p));

    // Optimizing one system: physics is 6 of the 20 ms.
    std::printf("physics 3x faster: %.3fx overall\\n",
                amdahl(6.0 / 20.0, 3.0));
}`,
          output: `cores  frame ms  speedup
    1     20.00    1.00x
    2     12.00    1.67x
    4      8.00    2.50x
    8      6.00    3.33x
   16      5.00    4.00x
   64      4.25    4.71x
limit      4.00    5.00x
physics 3x faster: 1.250x overall`,
          annotations: [
            { lines: '5-7', text: 'The whole law in one line: the untouched fraction (1 − p) plus the improved fraction shrunk by *s*.' },
            { lines: 12, text: '*p* is a fraction of **time**, not of code. 16 of the 20 ms can run in parallel.' },
            { lines: 19, text: 'With infinitely many cores the parallel term vanishes and 4 ms remains: at most 5×.' },
            { lines: '22-23', text: 'Making physics 3× faster only takes the frame from 20 ms to 16 ms (14 ms untouched + 2 ms of physics): 1.25× overall.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why this law runs game engines',
          text: 'Engines have stubbornly serial work: the game thread\'s gameplay logic, some render submission, anything with strict ordering. On an 8-core console, every millisecond left on one thread is a millisecond no amount of cores can remove. That is why engines move work into [[task-graph|job systems]] that spread it over all cores, and why "make the serial part parallel" usually beats "make the parallel part faster". It is also why a 3× win on a 2 ms system is worth less than a 1.2× win on a 10 ms one.',
        },
        {
          type: 'deepdive',
          title: 'Gustafson\'s counterpoint',
          blocks: [
            {
              type: 'p',
              text: 'Amdahl assumes a fixed amount of work. In practice, when hardware gets more parallel, games add *more* parallel work: more particles, more AI agents, higher resolution. John Gustafson pointed out in 1988 that if the parallel part grows with the core count, the serial fraction shrinks and the achievable speedup keeps rising. Both views are right: Amdahl tells you how fast today\'s frame can get; Gustafson tells you how much bigger tomorrow\'s frame can be in the same time.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'numeric',
      prompt: 'A job system parallelizes 90% of a frame\'s CPU time perfectly. What is the overall speedup on 8 cores? Round to 2 decimal places.',
      hint: 'p = 0.9 and s = 8: compute 1 / ((1 − p) + p / s).',
      answer: 4.71,
      tolerance: 0.006,
      unit: '×',
      explanation: '1 / (0.1 + 0.9 / 8) = 1 / (0.1 + 0.1125) = 1 / 0.2125 ≈ **4.71×**. Eight cores give less than five times the speed because the 10% serial part becomes almost half of the new frame time (0.1 of 0.2125). With infinitely many cores the limit is 1 / 0.1 = 10×.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'numeric',
      prompt: 'AI takes 25% of a frame. An optimization makes AI **5× faster**. By what factor does the whole frame get faster? Give an exact decimal.',
      answer: 1.25,
      alsoAccept: ['5/4'],
      unit: '×',
      explanation: 'New time = 0.75 + 0.25 / 5 = 0.75 + 0.05 = 0.80 of the old frame, so the speedup is 1 / 0.8 = **1.25×**. Even an infinitely fast AI could only reach 1 / 0.75 ≈ 1.33×. Before you spend a week on a system, multiply its share of the frame by how much you can save: that is the most you can win.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Timing with std::chrono',
      blocks: [
        {
          type: 'p',
          text: 'The simplest measurement is a stopwatch: read a clock, run the code, read the clock again. In C++ that clock should be `std::chrono::steady_clock`, which is guaranteed never to jump backwards. `system_clock` follows the wall clock, which the OS may adjust at any time (NTP sync, daylight saving), and `high_resolution_clock` is just an alias for one of the two on common implementations, so it adds nothing.',
        },
        {
          type: 'code',
          title: 'bench.cpp (timings vary per run)',
          code: `#include <algorithm>
#include <chrono>
#include <cstdio>
#include <vector>

template <class F>
double medianMs(F&& work, int runs = 31) {
    using Clock = std::chrono::steady_clock;
    work();                            // warm-up run
    std::vector<double> ms;
    for (int r = 0; r < runs; ++r) {
        auto t0 = Clock::now();
        work();
        auto t1 = Clock::now();
        ms.push_back(std::chrono::duration<double,
                     std::milli>(t1 - t0).count());
    }
    std::nth_element(ms.begin(), ms.begin() + runs / 2,
                     ms.end());
    return ms[runs / 2];               // the median
}

volatile long g_sink;          // an observable sink

int main() {
    std::vector<int> hp(1'000'000, 7);
    double t = medianMs([&] {
        long sum = 0;
        for (int h : hp) sum += h * h;
        g_sink = sum;                  // the result escapes
    });
    std::printf("median: %.3f ms\\n", t);
}`,
          annotations: [
            { lines: 8, text: '`steady_clock` is monotonic. Its resolution is implementation-defined; on Linux and Windows it is effectively nanoseconds, and each `now()` call costs tens of nanoseconds.' },
            { lines: 9, text: 'The first run pays for cold caches, page faults on freshly allocated memory and lazy initialization. Throw it away.' },
            { lines: '11-17', text: 'Time many runs, not one. A single sample is mostly noise: interrupts, other processes, frequency changes.' },
            { lines: '18-20', text: 'Report the **median**: one unlucky run (the OS preempted you) cannot drag it around the way it drags a mean. Also look at the spread; a wide spread means the measurement cannot resolve small differences.' },
            { lines: [23, 30], text: 'Storing the result in a `volatile` makes it observable, so the compiler must actually compute it. You will see what happens without this in the next card.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Coarse timing has its place',
          text: 'A scoped `steady_clock` timer is perfect for coarse questions: how long does a frame take, a level load, a whole system update? It is too coarse for a 20-instruction function, where the clock calls cost more than the work. For that, use a profiler, a proper benchmark library such as Google Benchmark, or reasoning from counters.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Always measure release builds',
          text: 'A debug build (`-O0`) keeps every variable in memory, inlines nothing and adds checks. Its hotspots are often in different places than in the shipping game. Profile an optimized build with debug symbols (`-O2 -g`), the configuration engines call "Development" or "Profile".',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'truefalse',
      prompt: 'For timing code, `std::chrono::high_resolution_clock` is always more precise than `std::chrono::steady_clock`, so benchmarks should use it.',
      answer: false,
      explanation: 'The standard only says `high_resolution_clock` has the shortest tick period the implementation offers; in libstdc++, libc++ and MSVC it is an alias for `system_clock` or `steady_clock`. If it aliases `system_clock`, it is not even monotonic and can jump when the wall clock is adjusted. Use `steady_clock`: it is guaranteed monotonic, and on mainstream platforms it already has nanosecond resolution.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Benchmarking pitfalls: the compiler is smarter than your stopwatch',
      blocks: [
        {
          type: 'p',
          text: 'Here are two "benchmarks" of the same loop. The only difference is whether the result is used:',
        },
        {
          type: 'code',
          code: `// Two "benchmarks" of the same loop.
void benchNaive(const int* hp, int n) {
    long sum = 0;
    for (int i = 0; i < n; ++i)
        sum += hp[i] * hp[i];
}   // sum is never used

long benchKept(const int* hp, int n) {
    long sum = 0;
    for (int i = 0; i < n; ++i)
        sum += hp[i] * hp[i];
    return sum;  // the result escapes
}`,
          annotations: [
            { lines: 6, text: '`sum` dies here without affecting anything observable, so the whole loop is dead code.' },
            { lines: 12, text: 'Returning the value makes it observable; the loop must run.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2 -masm=intel (directives trimmed)',
          code: `_Z10benchNaivePKii:          ; benchNaive
    ret                        ; the entire function
_Z9benchKeptPKii:            ; benchKept
    test  esi, esi
    jle   .L6
    movsx rsi, esi
    xor   edx, edx
    lea   rcx, [rdi+rsi*4]
.L5:
    mov   eax, DWORD PTR [rdi] ; load hp[i]
    add   rdi, 4
    imul  eax, eax             ; hp[i] * hp[i]
    cdqe
    add   rdx, rax             ; sum += ...
    cmp   rcx, rdi
    jne   .L5
    mov   rax, rdx
    ret
.L6:
    xor   edx, edx
    mov   rax, rdx
    ret`,
          annotations: [
            { lines: 2, text: '[[dead-code-elimination]]: under the [[as-if-rule]] the compiler may delete work whose result nobody can observe. Timing `benchNaive` measures one `ret` and reports an impossibly fast loop.' },
            { lines: '9-16', text: 'The real loop: one load, one multiply, a sign extension and an add per element.' },
          ],
        },
        {
          type: 'p',
          text: 'Dead-code elimination is the most famous pitfall, but not the only one:',
        },
        {
          type: 'list',
          items: [
            '**Constant folding.** If the input is a compile-time constant, the compiler may compute the answer at compile time. Feed benchmarks data it cannot see through, for example data generated at run time.',
            '**Cold start.** The first run takes page faults on new memory, fills caches and the branch predictor, and may run before the CPU has raised its clock. Warm up, then measure.',
            '**Unrealistic warmth.** The opposite problem: a [[microbenchmark]] that loops over 4 KB of data keeps it in L1 forever. In the real game, the rest of the frame evicts it between calls. A micro-win can vanish in context.',
            '**Noise and variance.** Other processes, interrupts, thermal throttling and turbo all move timings. Repeat runs, report the median and the spread, and do not believe a 2% difference that is smaller than your run-to-run variation.',
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'The real test is the frame',
          text: 'A microbenchmark answers "is A faster than B in isolation?". The question that matters is "did the frame get faster?". Always confirm a micro-win with the profiler on a real scene, ideally the same repeatable capture (a fixed camera path or a recorded replay) before and after.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: 'This benchmark reports that computing the squared length of 1,000,000 vectors takes almost no time with `-O2`. Tap the line that explains why the number is meaningless.',
      code: `#include <chrono>
#include <cstdio>
#include <vector>

int main() {
    std::vector<float> xs(1'000'000, 3.0f);
    std::vector<float> ys(1'000'000, 4.0f);
    auto t0 = std::chrono::steady_clock::now();
    for (std::size_t i = 0; i < xs.size(); ++i) {
        float lenSq = xs[i] * xs[i] + ys[i] * ys[i];
        (void)lenSq;
    }
    auto t1 = std::chrono::steady_clock::now();
    std::printf("%lld ns\\n", static_cast<long long>(
        (t1 - t0).count()));
}`,
      bugLines: [10, 11],
      explanation: '`lenSq` is computed and immediately discarded; `(void)lenSq;` only silences the unused-variable warning. Nothing observable depends on the loop, so the optimizer deletes it: GCC 13 at `-O2` emits the two `steady_clock::now()` calls back to back, and the program times an empty interval. Fix it by making the result escape: accumulate a sum and print it (or store it in a `volatile` sink), or use a benchmark library\'s `DoNotOptimize`. Because every element is the same constant, a real benchmark should also use varied run-time data.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Profilers: sampling vs instrumenting',
      blocks: [
        {
          type: 'p',
          text: 'A profiler answers "where does the time go?" for the whole program at once. There are two basic designs, and game developers use both every day.',
        },
        {
  "type": "figure",
  "svg": "<svg viewBox=\"0 0 520 300\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\">\n<text x=\"10\" y=\"20\" font-size=\"13\" font-weight=\"700\" stroke=\"none\">Instrumentation: timestamps at zone edges</text>\n<rect x=\"20\" y=\"32\" width=\"480\" height=\"20\" rx=\"3\" class=\"s-gray f-gray\" fill-opacity=\"0.18\" fill=\"currentColor\"/>\n<text x=\"260.0\" y=\"46.0\" text-anchor=\"middle\" font-size=\"11\" stroke=\"none\">Frame</text>\n<rect x=\"20\" y=\"58\" width=\"90\" height=\"20\" rx=\"3\" class=\"s-orange f-orange\" fill-opacity=\"0.18\" fill=\"currentColor\"/>\n<text x=\"65.0\" y=\"72.0\" text-anchor=\"middle\" font-size=\"11\" stroke=\"none\">AI</text>\n<rect x=\"110\" y=\"58\" width=\"250\" height=\"20\" rx=\"3\" class=\"s-blue f-blue\" fill-opacity=\"0.18\" fill=\"currentColor\"/>\n<text x=\"235.0\" y=\"72.0\" text-anchor=\"middle\" font-size=\"11\" stroke=\"none\">Physics</text>\n<rect x=\"360\" y=\"58\" width=\"140\" height=\"20\" rx=\"3\" class=\"s-green f-green\" fill-opacity=\"0.18\" fill=\"currentColor\"/>\n<text x=\"430.0\" y=\"72.0\" text-anchor=\"middle\" font-size=\"11\" stroke=\"none\">Render</text>\n<rect x=\"118\" y=\"84\" width=\"9\" height=\"14\" rx=\"2\" class=\"s-purple f-purple\" fill-opacity=\"0.3\"/>\n<rect x=\"138\" y=\"84\" width=\"9\" height=\"14\" rx=\"2\" class=\"s-purple f-purple\" fill-opacity=\"0.3\"/>\n<rect x=\"158\" y=\"84\" width=\"9\" height=\"14\" rx=\"2\" class=\"s-purple f-purple\" fill-opacity=\"0.3\"/>\n<rect x=\"178\" y=\"84\" width=\"9\" height=\"14\" rx=\"2\" class=\"s-purple f-purple\" fill-opacity=\"0.3\"/>\n<rect x=\"198\" y=\"84\" width=\"9\" height=\"14\" rx=\"2\" class=\"s-purple f-purple\" fill-opacity=\"0.3\"/>\n<rect x=\"218\" y=\"84\" width=\"9\" height=\"14\" rx=\"2\" class=\"s-purple f-purple\" fill-opacity=\"0.3\"/>\n<rect x=\"238\" y=\"84\" width=\"9\" height=\"14\" rx=\"2\" class=\"s-purple f-purple\" fill-opacity=\"0.3\"/>\n<rect x=\"258\" y=\"84\" width=\"9\" height=\"14\" rx=\"2\" class=\"s-purple f-purple\" fill-opacity=\"0.3\"/>\n<rect x=\"278\" y=\"84\" width=\"9\" height=\"14\" rx=\"2\" class=\"s-purple f-purple\" fill-opacity=\"0.3\"/>\n<rect x=\"298\" y=\"84\" width=\"9\" height=\"14\" rx=\"2\" class=\"s-purple f-purple\" fill-opacity=\"0.3\"/>\n<rect x=\"318\" y=\"84\" width=\"9\" height=\"14\" rx=\"2\" class=\"s-purple f-purple\" fill-opacity=\"0.3\"/>\n<rect x=\"338\" y=\"84\" width=\"9\" height=\"14\" rx=\"2\" class=\"s-purple f-purple\" fill-opacity=\"0.3\"/>\n<text x=\"235\" y=\"114\" text-anchor=\"middle\" font-size=\"10.5\" class=\"t-purple\" stroke=\"none\">GetXform × 20,000: each zone pays a timestamp pair</text>\n<path d=\"M16 26 L24 26 L20 32 Z\" fill=\"currentColor\" stroke=\"none\" class=\"f-red\"/>\n<path d=\"M106 26 L114 26 L110 32 Z\" fill=\"currentColor\" stroke=\"none\" class=\"f-red\"/>\n<path d=\"M356 26 L364 26 L360 32 Z\" fill=\"currentColor\" stroke=\"none\" class=\"f-red\"/>\n<path d=\"M496 26 L504 26 L500 32 Z\" fill=\"currentColor\" stroke=\"none\" class=\"f-red\"/>\n<text x=\"500\" y=\"20\" text-anchor=\"end\" font-size=\"10\" class=\"t-red\" stroke=\"none\">▼ = timestamp read</text>\n<line x1=\"10\" y1=\"132\" x2=\"510\" y2=\"132\" class=\"s-gray\" stroke-dasharray=\"4 4\"/>\n<text x=\"10\" y=\"156\" font-size=\"13\" font-weight=\"700\" stroke=\"none\">Sampling: a timer asks \"who is running?\"</text>\n<rect x=\"20\" y=\"168\" width=\"90\" height=\"20\" rx=\"3\" class=\"s-orange f-orange\" fill-opacity=\"0.18\" fill=\"currentColor\"/>\n<text x=\"65.0\" y=\"182.0\" text-anchor=\"middle\" font-size=\"11\" stroke=\"none\">AI</text>\n<rect x=\"110\" y=\"168\" width=\"250\" height=\"20\" rx=\"3\" class=\"s-blue f-blue\" fill-opacity=\"0.18\" fill=\"currentColor\"/>\n<text x=\"235.0\" y=\"182.0\" text-anchor=\"middle\" font-size=\"11\" stroke=\"none\">Physics + GetXform</text>\n<rect x=\"360\" y=\"168\" width=\"140\" height=\"20\" rx=\"3\" class=\"s-green f-green\" fill-opacity=\"0.18\" fill=\"currentColor\"/>\n<text x=\"430.0\" y=\"182.0\" text-anchor=\"middle\" font-size=\"11\" stroke=\"none\">Render</text>\n<line x1=\"34\" y1=\"196\" x2=\"34\" y2=\"214\" class=\"s-orange\"/>\n<circle cx=\"34\" cy=\"218\" r=\"4\" class=\"s-orange f-orange\"/>\n<line x1=\"71\" y1=\"196\" x2=\"71\" y2=\"214\" class=\"s-orange\"/>\n<circle cx=\"71\" cy=\"218\" r=\"4\" class=\"s-orange f-orange\"/>\n<line x1=\"108\" y1=\"196\" x2=\"108\" y2=\"214\" class=\"s-orange\"/>\n<circle cx=\"108\" cy=\"218\" r=\"4\" class=\"s-orange f-orange\"/>\n<line x1=\"145\" y1=\"196\" x2=\"145\" y2=\"214\" class=\"s-blue\"/>\n<circle cx=\"145\" cy=\"218\" r=\"4\" class=\"s-blue f-blue\"/>\n<line x1=\"182\" y1=\"196\" x2=\"182\" y2=\"214\" class=\"s-blue\"/>\n<circle cx=\"182\" cy=\"218\" r=\"4\" class=\"s-blue f-blue\"/>\n<line x1=\"219\" y1=\"196\" x2=\"219\" y2=\"214\" class=\"s-blue\"/>\n<circle cx=\"219\" cy=\"218\" r=\"4\" class=\"s-blue f-blue\"/>\n<line x1=\"256\" y1=\"196\" x2=\"256\" y2=\"214\" class=\"s-blue\"/>\n<circle cx=\"256\" cy=\"218\" r=\"4\" class=\"s-blue f-blue\"/>\n<line x1=\"293\" y1=\"196\" x2=\"293\" y2=\"214\" class=\"s-blue\"/>\n<circle cx=\"293\" cy=\"218\" r=\"4\" class=\"s-blue f-blue\"/>\n<line x1=\"330\" y1=\"196\" x2=\"330\" y2=\"214\" class=\"s-blue\"/>\n<circle cx=\"330\" cy=\"218\" r=\"4\" class=\"s-blue f-blue\"/>\n<line x1=\"367\" y1=\"196\" x2=\"367\" y2=\"214\" class=\"s-green\"/>\n<circle cx=\"367\" cy=\"218\" r=\"4\" class=\"s-green f-green\"/>\n<line x1=\"404\" y1=\"196\" x2=\"404\" y2=\"214\" class=\"s-green\"/>\n<circle cx=\"404\" cy=\"218\" r=\"4\" class=\"s-green f-green\"/>\n<line x1=\"441\" y1=\"196\" x2=\"441\" y2=\"214\" class=\"s-green\"/>\n<circle cx=\"441\" cy=\"218\" r=\"4\" class=\"s-green f-green\"/>\n<line x1=\"478\" y1=\"196\" x2=\"478\" y2=\"214\" class=\"s-green\"/>\n<circle cx=\"478\" cy=\"218\" r=\"4\" class=\"s-green f-green\"/>\n<text x=\"20\" y=\"246\" font-size=\"11.5\" stroke=\"none\">13 samples → AI 3, Physics 6, Render 4: an estimate of where time goes,</text>\n<text x=\"20\" y=\"262\" font-size=\"11.5\" stroke=\"none\">with the call stack attached to each sample. Overhead stays small and</text>\n<text x=\"20\" y=\"278\" font-size=\"11.5\" stroke=\"none\">fixed, but a single brief spike can fall between samples.</text>\n<line x1=\"20\" y1=\"226\" x2=\"500\" y2=\"226\" class=\"s-gray\"/>\n<path d=\"M500 222 L508 226 L500 230 Z\" fill=\"currentColor\" stroke=\"none\" class=\"f-gray\"/>\n<text x=\"508\" y=\"244\" text-anchor=\"end\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">time</text>\n</svg>",
  "alt": "Timeline comparison. Top: instrumentation, with Frame, AI, Physics and Render zones bracketed by timestamp reads and many tiny GetXform zones under Physics. Bottom: sampling, with evenly spaced sample ticks colored by the function running at each tick.",
  "caption": "Instrumentation brackets each zone with timestamps; sampling periodically records whoever is running. Short, frequent zones are where instrumentation overhead piles up."
},
        {
          type: 'list',
          items: [
            'A [[sampling-profiler]] interrupts the program at a regular rate (typically a few thousand times per second, or every *N* hardware events) and records which instruction was running plus the call stack. Functions that run longer collect more samples. It needs no code changes and its overhead is low and fixed, but its answer is statistical.',
            'An [[instrumenting-profiler]] records a timestamp when each marked *zone* begins and ends. It gives exact durations and call counts on a timeline, frame by frame, but only for the zones you marked, and each zone costs a little time.',
          ],
        },
        {
          type: 'p',
          text: 'This simulation runs a frame on a virtual clock and profiles it both ways. `GetXform` is a 6-cycle helper called 20,000 times:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'profiler_sim.cpp',
          code: `#include <array>
#include <cstdio>

// A simulated frame on a virtual clock (cycles), profiled
// two ways: a sampler and instrumentation zones.
enum Fn { AI, Physics, GetXform, Render, kFns };
const char* names[kFns] = {"AI", "Physics", "GetXform",
                           "Render"};

std::array<long, kFns> trueCycles{};   // ground truth
std::array<long, kFns> samples{};      // sampling profiler
long clockNow = 0, nextSample = 0, zones = 0;
const long kPeriod = 997;    // cycles between samples

void run(Fn f, long cycles) {           // f executes
    trueCycles[f] += cycles;
    clockNow += cycles;
    while (nextSample < clockNow) {     // timer interrupt
        ++samples[f];                   // "who is running?"
        nextSample += kPeriod;
    }
    ++zones;                            // one zone per call
}

int main() {
    run(AI, 40'000);
    for (int body = 0; body < 20'000; ++body) {
        run(Physics, 6);
        run(GetXform, 6);               // tiny, hot helper
    }
    run(Render, 60'000);

    long total = 0, nSamples = 0;
    for (int f = 0; f < kFns; ++f) {
        total += trueCycles[f];
        nSamples += samples[f];
    }
    std::printf("%-9s %7s %8s\\n", "function", "true %",
                "sampled %");
    for (int f = 0; f < kFns; ++f)
        std::printf("%-9s %6.1f%% %8.1f%%\\n", names[f],
                    100.0 * trueCycles[f] / total,
                    100.0 * samples[f] / nSamples);
    const long kZoneCost = 30;          // modeled overhead
    std::printf("samples taken: %ld\\n", nSamples);
    std::printf("zones: %ld, instrumented frame: +%.0f%%\\n",
                zones, 100.0 * zones * kZoneCost / total);
}`,
          output: `function   true % sampled %
AI          11.8%     12.0%
Physics     35.3%     35.1%
GetXform    35.3%     35.1%
Render      17.6%     17.8%
samples taken: 342
zones: 40002, instrumented frame: +353%`,
          annotations: [
            { lines: 13, text: 'Sampling period, scaled down for the demo. A real sampler at 1–10 kHz on a 3 GHz core fires every 300,000 to 3,000,000 cycles. 997 is prime so the samples do not lock into step with the 12-cycle loop.' },
            { lines: '18-21', text: 'The sampler only ever learns "who was running when the timer fired". Yet 342 samples estimate every share to within a fraction of a percent, including the tiny `GetXform`: called often enough, it is caught often enough.' },
            { lines: 22, text: 'An instrumenting profiler would wrap each call in a zone. With a modeled 30 cycles per zone (two timestamp reads plus bookkeeping), the 6-cycle helper\'s zones cost five times its own work.' },
            { lines: 47, text: 'Instrumenting every call would make the frame 4.5× slower and distort exactly the function you care about. Instrument coarse zones (systems, jobs, frames), not tiny helpers.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why studios use both',
          text: 'Sampling is the best "where is the time?" tool: no code changes, low overhead, sees into every function, including third-party code and the OS. Instrumentation is the best "what happened in *that* frame?" tool: an exact timeline per thread, so you can see a 40 ms hitch, which job ran late, and what the game thread was waiting for. A sampler aggregates over thousands of frames and smears one bad frame into the average.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'The profilers you will meet',
      blocks: [
        {
          type: 'table',
          headers: ['Tool', 'Method', 'Where', 'Best for'],
          rows: [
            ['**perf**', 'Sampling + counters', 'Linux', '`perf stat` for counters, `perf record -g` / `perf report` for hotspots with call stacks'],
            ['**Intel VTune**', 'Sampling + counters', 'Windows, Linux', 'Hotspots and *microarchitecture* analysis: is the code bound by the front end, mispredictions, memory or execution units?'],
            ['**Superluminal**', 'High-rate sampling + optional instrumentation', 'Windows, Xbox, PlayStation', 'Fast, game-focused CPU profiling with full call stacks and per-thread timelines'],
            ['**Tracy**', 'Instrumentation (+ sampling)', 'Windows, Linux, macOS, Android', 'Open-source frame profiler: `ZoneScoped` macros give nanosecond timelines of every frame and thread'],
            ['**PIX**', 'Timing captures + GPU captures', 'Windows (Direct3D 12), Xbox', 'Microsoft\'s tool for CPU timelines and for inspecting what the GPU did in a frame'],
            ['**[[unreal-insights|Unreal Insights]]**', 'Instrumentation (trace)', 'All Unreal platforms', 'Unreal\'s built-in timeline of `TRACE_CPUPROFILER_EVENT_SCOPE` zones, loading, memory and networking'],
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'A first look with perf on Linux',
          code: `# hotspots with call stacks (sampling)
perf record -g ./game --benchmark-scene
perf report

# counters for the whole run
perf stat -e cycles,instructions,cache-misses,branch-misses \\
    ./game --benchmark-scene`,
          annotations: [
            { lines: 2, text: '`-g` records a call stack with every sample, so you can see not just that `std::sort` is hot but *who* called it.' },
            { lines: 3, text: 'An interactive table of functions sorted by the share of samples they received.' },
            { lines: '6-7', text: 'Counts hardware events instead of sampling them. The next card explains what they mean.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'A typical workflow',
          text: 'Start with an instrumenting timeline (Tracy, PIX, Unreal Insights) to see *which* system and which frames blow the budget. Then take a sampling capture (Superluminal, VTune, perf) of that system to see which functions and lines are hot. Then read the hardware counters for those lines to learn *why* they are hot.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'Players report a hitch: every few seconds one frame takes 45 ms instead of 16 ms. A sampling profiler run over two minutes shows a flat profile with nothing standing out. What should you reach for next?',
      options: [
        { text: 'A longer sampling run, so the hitch collects more samples', why: 'The hitch is a few percent of total time no matter how long you sample. Aggregating over every frame keeps diluting the one bad frame into the average.' },
        { text: 'An instrumenting frame profiler (Tracy, PIX timing capture, Unreal Insights) to inspect the slow frame on a timeline', correct: true, why: 'A per-frame timeline shows exactly which zone grew in the 45 ms frame and what each thread was doing (or waiting for) at that moment.' },
        { text: '`perf stat` to read the cache-miss counter', why: 'Whole-run counters are averages too. They cannot tell you which frame or which system caused the spike.' },
        { text: 'Rebuild with `-O0` so that functions are not inlined and show up separately', why: 'A debug build changes what is slow. Profile an optimized build with symbols.' },
      ],
      explanation: 'Sampling profilers answer "where does time go **on average**?". Hitches are rare events, which averages hide. Instrumentation records every zone of every frame, so you can jump to the 45 ms frame and see, for example, that a garbage collection, a shader compile or a synchronous file load ran on the game thread. Once you know the culprit, sampling it in isolation is useful again.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Hardware performance counters',
      blocks: [
        {
          type: 'p',
          text: 'Timers tell you *how long*. To learn *why*, ask the CPU itself. Every modern core has a performance monitoring unit with a handful of programmable [[hardware-performance-counter|hardware performance counters]]: registers that count microarchitectural events as they happen, at essentially no cost. `perf stat`, VTune and Superluminal read them for you.',
        },
        {
          type: 'table',
          headers: ['Counter or ratio', 'Meaning', 'How to read it'],
          rows: [
            ['cycles', 'Core clock cycles spent', 'The denominator for everything else'],
            ['instructions', 'Instructions *retired* (completed)', 'Mispredicted, squashed work does not count'],
            ['IPC = instructions / cycles', 'Average throughput', 'Modern big cores can retire 4+ per cycle. Below ~1 in a hot loop usually means stalls, very often on memory'],
            ['cache misses (LLC)', 'Loads that missed the last-level cache and went to DRAM', 'Each can cost roughly 60–100 ns: hundreds of cycles'],
            ['L1D misses', 'Loads that missed the L1 data cache', 'Usually served by L2 or L3 in roughly 10–50 cycles'],
            ['branch misses', '[[branch-misprediction|Mispredicted]] branches', 'Each costs roughly 15–20 cycles of discarded work on current desktop cores'],
            ['MPKI', 'Misses per 1,000 instructions', 'Normalizes misses so that runs of different lengths compare fairly'],
          ],
        },
        {
          type: 'p',
          text: 'Counters turn into a hypothesis. A hot loop with IPC 0.4 and many LLC misses is waiting on memory: fix the data layout, not the arithmetic. IPC 0.8 with a 10% branch miss rate points at an unpredictable branch: sort the data or go branchless. IPC 3 and few misses means the core is busy doing real work: now only fewer instructions (a better algorithm, SIMD) will help. That is the iron law again: counters tell you which factor to attack.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Top-down analysis',
          text: 'Intel\'s *top-down microarchitecture analysis*, which VTune and `perf stat --topdown` implement on supported CPUs, sorts every issue slot into four buckets: **retiring** (useful work), **bad speculation** (mispredictions), **front-end bound** (the core was not fed instructions) and **back-end bound** (waiting on memory or execution units). It is the counter-based version of the questions above.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Numbers vary by microarchitecture',
          text: 'Miss penalties, pipeline widths and even what an event counts differ between CPU generations and between Intel and AMD. Use the counters to compare two versions of *your* code on the *same* machine, and treat absolute thresholds as rough guides.',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'numeric',
      prompt: '`perf stat` on an entity update reports **2.4 × 10⁹ cycles** and **3.0 × 10⁹ instructions**. What is the IPC? Give an exact decimal.',
      answer: 1.25,
      alsoAccept: ['5/4'],
      label: 'IPC =',
      explanation: 'IPC = instructions / cycles = 3.0 / 2.4 = **1.25**, so CPI = 0.8. On a core that can retire four or more instructions per cycle, that is modest: the loop is probably stalling on something. The next counters to read are cache misses and branch misses, to find out which.',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'order',
      prompt: 'Put this performance investigation in order.',
      linesAreCode: false,
      lines: [
        'Build an optimized build with symbols and a repeatable test scene, and record a baseline',
        'Find the slow frames and the system responsible on a frame timeline',
        'Sample that system to find the hot functions and lines',
        'Read hardware counters for the hot code and form a hypothesis about the cause',
        'Change one thing, then measure the same scene again and compare with the baseline',
      ],
      distractors: ['Rewrite the hottest-looking function in SIMD before profiling'],
      explanation: 'Each step needs the one before it: you cannot judge a change without a baseline, cannot sample the right system before the timeline shows which one it is, and cannot interpret counters without knowing which code they describe. Changing one thing at a time keeps cause and effect clear. "Hottest-looking" is a guess; the profile tells you what is really hot.',
    },
    // ------------------------------------------------------------------ 17
    {
      kind: 'truefalse',
      prompt: 'If a function receives zero samples in a sampling profile, it never ran.',
      answer: false,
      explanation: 'Samples are a statistical snapshot. A function that ran briefly and rarely can fall entirely between samples: at 1 kHz, anything that runs for well under a millisecond in total may never be caught. Zero samples means "too little time to matter on average", not "never ran". If you need to know whether and when something ran, instrument it or count its calls.',
    },
  ],
  takeaways: [
    'Games have hard deadlines: 16.67 ms at 60 fps, 8.33 ms at 120 fps. Performance work means keeping each system inside its slice of that budget.',
    'Iron law: time = instructions × CPI × cycle time. Every optimization reduces instruction count or CPI; IPC (= 1/CPI) is a diagnostic, not a scoreboard.',
    'Amdahl\'s law: speedup = 1 / ((1 − p) + p / s). The untouched part sets the ceiling, so serial game-thread work limits what extra cores can do.',
    'Benchmark honestly: make results observable, warm up, use `steady_clock`, repeat runs and report the median and spread, and confirm wins in the real frame.',
    'Sampling profilers (perf, VTune, Superluminal) show where time goes on average; instrumenting profilers (Tracy, PIX, Unreal Insights) show exactly what happened in each frame.',
    'Hardware counters (cycles, instructions, cache misses, branch misses) explain *why* code is slow and tell you which factor of the iron law to attack.',
  ],
  reading: [
    {
      title: 'Computer Systems: A Programmer\'s Perspective',
      url: 'https://csapp.cs.cmu.edu/',
      source: 'book',
      note: 'Chapter 5, "Optimizing Program Performance", measures loops in cycles per element and builds the same habits as this lesson.',
    },
    {
      title: 'Agner Fog: Software optimization resources',
      url: 'https://www.agner.org/optimize/',
      source: 'article',
      note: 'The "Optimizing software in C++" manual has excellent chapters on measuring performance and on what counters and timers can and cannot tell you.',
    },
    {
      title: 'std::chrono::steady_clock',
      url: 'https://en.cppreference.com/w/cpp/chrono/steady_clock',
      source: 'cppreference',
      note: 'The monotonic clock to use for timing, and why `high_resolution_clock` is not a better choice.',
    },
    {
      title: 'Amdahl\'s law',
      url: 'https://en.wikipedia.org/wiki/Amdahl%27s_law',
      source: 'article',
      note: 'The derivation, the classic speedup curves for different parallel fractions, and the relation to Gustafson\'s law.',
    },
    {
      title: 'Compiler Explorer',
      url: 'https://godbolt.org/',
      source: 'other',
      note: 'Paste the two benchmark functions from this lesson and watch `benchNaive` compile to a single `ret`.',
    },
  ],
};
