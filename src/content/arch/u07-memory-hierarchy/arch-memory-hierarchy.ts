import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-memory-hierarchy',
  title: 'The Memory Hierarchy',
  summary:
    'Why a 4 GHz core spends much of its life waiting for memory, how a stack of ever larger and slower memories hides that wait, and the latency numbers every programmer should know.',
  minutes: 20,
  objectives: [
    'Explain the processor–memory gap and convert memory latencies into cycles and frame-budget costs',
    'Compare SRAM and DRAM and explain why that trade-off forces a hierarchy of caches',
    'Give typical size and latency ranges for registers, L1, L2, L3, DRAM and SSD',
    'Spot temporal and spatial locality in C++ loops and data structures',
    'Compute the average memory access time (AMAT) of a multi-level hierarchy',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The memory wall',
      blocks: [
        {
          type: 'p',
          text: 'A desktop core runs at 4–5 GHz, so one clock cycle lasts 0.2–0.25 ns. In that time, light in a vacuum travels about 7 cm, and electrical signals on a chip and a motherboard travel less. Main memory sits several centimetres away on the board, behind a memory controller, and it is built from a technology tuned for density rather than speed. A load that has to go all the way to main memory takes roughly **60–100 ns**: 250–400 cycles in which the core may have nothing useful to do.',
        },
        {
          type: 'p',
          text: 'That gap between how fast the core computes and how fast memory answers is called the **memory wall**. It is the single most important fact about performance on modern hardware, and it is why this unit exists. Put it in a game programmer\'s units:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <format>
#include <iostream>

int main() {
    const double ghz = 4.0;               // 4 cycles per nanosecond
    const double frameMs = 1000.0 / 60.0; // 60 fps budget
    const double frameCycles = frameMs * 1e6 * ghz;

    const double dramNs = 80.0;           // one trip to DRAM
    const double missCycles = dramNs * ghz;

    std::cout << std::format("Frame budget:   {:>12.0f} cycles\\n",
                             frameCycles);
    std::cout << std::format("One DRAM miss:  {:>12.0f} cycles\\n",
                             missCycles);
    std::cout << std::format("Misses that fill a frame if "
                             "nothing overlaps: {:.0f}\\n",
                             frameCycles / missCycles);
    std::cout << std::format("Adds a 4-wide core could have done "
                             "while waiting: {:.0f}\\n",
                             missCycles * 4);
}`,
          output: "Frame budget:       66666667 cycles\nOne DRAM miss:           320 cycles\nMisses that fill a frame if nothing overlaps: 208333\nAdds a 4-wide core could have done while waiting: 1280",
          annotations: [
            { lines: 6, text: 'At 60 fps you have 16.67 ms per frame for everything: gameplay, physics, animation, audio mixing and submitting rendering work.' },
            { lines: '9-10', text: '80 ns is a typical full trip to DRAM on a desktop. It varies with the CPU, the memory and how busy the memory system is; treat it as an order of magnitude, not a constant.' },
            { lines: '16-18', text: 'About 200,000 cache misses, if each one waited for the previous to finish, would eat the entire frame. A game touching a million objects per frame cannot afford one miss each.' },
            { lines: '19-21', text: 'A core that can retire about four simple instructions per cycle gives up over a thousand additions\' worth of work for every miss it cannot hide.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why did memory fall so far behind?',
          text: 'For decades, processor performance grew far faster than DRAM latency improved. The DRAM industry optimized for what buyers paid for, capacity and cost per bit and later bandwidth, and DRAM latency is dominated by physics that does not shrink well: charging long wires inside the memory array, sensing a tiny stored charge, and the trip across the board. Bandwidth and capacity grew enormously; latency improved only modestly. Hennessy and Patterson call this the **processor–memory performance gap**, and every cache in this unit exists to hide it.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Not every miss costs the full 300 cycles',
          text: 'The out-of-order cores from the Modern CPUs unit keep working past a missing load and can have a dozen or more misses in flight at once (each core has a limited number of miss buffers). Independent misses, like loads from `a[i]` and `a[i + 8]`, overlap and share the wait: that is **[[memory-level-parallelism]]**. Dependent misses, like `p = p->next`, cannot overlap, because the next address is not known until the previous load returns. Keep that distinction in mind; it decides how bad a miss really is.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'numeric',
      prompt: 'A core runs at 3.5 GHz. A load misses in every cache and DRAM answers after 90 ns. For how many clock cycles does that load wait? (Give a whole number.)',
      answer: 315,
      unit: 'cycles',
      hint: 'At 3.5 GHz, 3.5 cycles pass every nanosecond.',
      explanation:
        'Cycles = time × frequency = 90 ns × 3.5 cycles/ns = **315 cycles**. Converting nanoseconds to cycles is the habit to build: a latency only means something relative to how much work the core could have done meanwhile. The same 90 ns costs a 2 GHz mobile core 180 cycles and a 5 GHz desktop core 450, which is one reason faster CPUs gain less than their clock speed suggests on memory-bound code.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'SRAM vs DRAM: why one memory cannot do it all',
      blocks: [
        {
          type: 'p',
          text: 'Two memory technologies dominate a computer, and they sit at opposite ends of a trade-off.',
        },
        {
          type: 'p',
          text: '**[[sram|SRAM]]** (static RAM) stores each bit in a pair of cross-coupled inverters, the same feedback loop as the latch from the Digital Logic unit, plus two access transistors: **six transistors per bit**. As long as power is on, the loop holds the value, and reading it is fast because the cell actively drives its output. Caches and register files are built from SRAM-style cells on the CPU die itself.',
        },
        {
          type: 'p',
          text: '**[[dram|DRAM]]** (dynamic RAM) stores each bit as charge on a tiny capacitor behind **one transistor**. That makes it far denser and cheaper per bit, but slower and fussier: the charge leaks, so every row must be **refreshed** periodically (within 64 ms for DDR4); reading drains the capacitor, so a whole row is copied into a row buffer by sense amplifiers and then written back; and a read must first *activate* a row, then select columns from it, then *precharge* before another row can open.',
        },
        {
          type: 'table',
          headers: ['Property', 'SRAM', 'DRAM'],
          rows: [
            ['Cell', '6 transistors (a latch)', '1 transistor + 1 capacitor'],
            ['Density', 'Low: roughly an order of magnitude more area per bit', 'High: billions of bits per chip'],
            ['Access time', 'Under a nanosecond for a small array', 'Tens of nanoseconds (activate, read, precharge)'],
            ['Refresh', 'None while powered', 'Every row, every few tens of milliseconds'],
            ['Process', 'Same logic process as the CPU, on the die', 'Separate DRAM chips on the board or package'],
            ['Used for', 'Registers, L1/L2/L3 caches, TLBs', 'Main memory, GPU memory (GDDR, HBM)'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not build all of RAM from SRAM?',
          text: 'Area and physics. A leading-edge SRAM bit cell is around 0.02 µm²; 16 GB of it would need over 2,000 mm² for the cells alone, roughly ten times a whole desktop CPU die, before any wiring. And it would not even be fast: **bigger memories are slower** no matter the technology, because signals must cross more distance and pass through bigger decoders. That is why an L1 of 48 KB answers in about 5 cycles while an L3 of 32 MB, also SRAM, takes 40 or more. The only way to get *both* large and fast is a hierarchy: a small fast memory in front of a bigger slower one, repeated.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'One transistor per bit',
          text: 'Robert Dennard at IBM invented the one-transistor DRAM cell in 1966, and Intel\'s 1103 of 1970 was the first commercially successful DRAM chip. The 1T1C cell is still how main memory is built more than half a century later; only the dimensions, the interface (SDRAM, DDR1 through DDR5) and the capacitor\'s clever 3D shapes have changed.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: 'An L1 data cache is typically only 32–64 KB, even though the same chip carries tens of megabytes of SRAM in its L3. What is the main reason L1 stays so small?',
      options: [
        {
          text: 'SRAM is too expensive to put more than 64 KB of it on one chip',
          why: 'The L3 on the same die holds tens of megabytes of SRAM, so cost per bit alone cannot be the limit.',
        },
        {
          text: 'A bigger array is physically slower, and L1 must answer within about 4–5 cycles on every load',
          correct: true,
          why: 'Longer wires and larger decoders add delay. L1 sits on the critical path of almost every instruction, so designers keep it small enough to hit in a few cycles and let L2 and L3 provide capacity.',
        },
        {
          text: 'Programs rarely use more than 32 KB of data, so a bigger L1 would be wasted',
          why: 'Many programs and nearly all games have working sets of many megabytes. That is precisely why there are bigger L2 and L3 caches behind L1.',
        },
        {
          text: 'The operating system limits how much cache each core may use',
          why: 'Cache size is fixed in hardware. The OS cannot change it, although some server CPUs let the OS partition the shared L3 between workloads.',
        },
      ],
      explanation:
        'Every level is a compromise between capacity and latency. L1 is tuned for latency because loads feed directly into dependent instructions: one extra L1 cycle slows a huge fraction of all code. Capacity is the job of the levels behind it. The same logic explains why a register file is smaller still.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'The hierarchy, level by level',
      blocks: [
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 314" xmlns="http://www.w3.org/2000/svg"><text x="318" y="26" font-size="12" text-anchor="start" font-weight="600">Size</text><text x="398" y="26" font-size="12" text-anchor="start" font-weight="600">Latency (typical)</text><polygon points="142,42 188,42 205,82 125,82" class="f-purple" fill-opacity="0.18"/><polygon points="142,42 188,42 205,82 125,82" fill="none" class="s-purple" stroke-width="1.6"/><text x="165" y="67" font-size="11" text-anchor="middle" font-weight="600">Registers</text><line x1="209" y1="62" x2="312" y2="62" class="s-gray" stroke-width="0.8" stroke-dasharray="2 3"/><text x="318" y="66.5" font-size="12" text-anchor="start">~1–2 KB</text><text x="398" y="66.5" font-size="12" text-anchor="start" class="t-purple">~0 cycles</text><polygon points="125,82 205,82 222,122 108,122" class="f-blue" fill-opacity="0.18"/><polygon points="125,82 205,82 222,122 108,122" fill="none" class="s-blue" stroke-width="1.6"/><text x="165" y="107" font-size="12.5" text-anchor="middle" font-weight="600">L1 cache</text><line x1="226" y1="102" x2="312" y2="102" class="s-gray" stroke-width="0.8" stroke-dasharray="2 3"/><text x="318" y="106.5" font-size="12" text-anchor="start">32–64 KB</text><text x="398" y="106.5" font-size="12" text-anchor="start" class="t-blue">4–5 cyc · ~1 ns</text><polygon points="108,122 222,122 239,162 91,162" class="f-teal" fill-opacity="0.18"/><polygon points="108,122 222,122 239,162 91,162" fill="none" class="s-teal" stroke-width="1.6"/><text x="165" y="147" font-size="12.5" text-anchor="middle" font-weight="600">L2 cache</text><line x1="243" y1="142" x2="312" y2="142" class="s-gray" stroke-width="0.8" stroke-dasharray="2 3"/><text x="318" y="146.5" font-size="12" text-anchor="start">0.25–3 MB</text><text x="398" y="146.5" font-size="12" text-anchor="start" class="t-teal">12–16 cyc · ~4 ns</text><polygon points="91,162 239,162 256,202 74,202" class="f-green" fill-opacity="0.18"/><polygon points="91,162 239,162 256,202 74,202" fill="none" class="s-green" stroke-width="1.6"/><text x="165" y="187" font-size="12.5" text-anchor="middle" font-weight="600">L3 cache</text><line x1="260" y1="182" x2="312" y2="182" class="s-gray" stroke-width="0.8" stroke-dasharray="2 3"/><text x="318" y="186.5" font-size="12" text-anchor="start">8–96 MB</text><text x="398" y="186.5" font-size="12" text-anchor="start" class="t-green">30–70 cyc · ~15 ns</text><polygon points="74,202 256,202 273,242 57,242" class="f-orange" fill-opacity="0.18"/><polygon points="74,202 256,202 273,242 57,242" fill="none" class="s-orange" stroke-width="1.6"/><text x="165" y="227" font-size="12.5" text-anchor="middle" font-weight="600">DRAM</text><line x1="277" y1="222" x2="312" y2="222" class="s-gray" stroke-width="0.8" stroke-dasharray="2 3"/><text x="318" y="226.5" font-size="12" text-anchor="start">8–64 GB</text><text x="398" y="226.5" font-size="12" text-anchor="start" class="t-orange">60–100+ ns</text><polygon points="57,242 273,242 290,282 40,282" class="f-gray" fill-opacity="0.18"/><polygon points="57,242 273,242 290,282 40,282" fill="none" class="s-gray" stroke-width="1.6"/><text x="165" y="267" font-size="12.5" text-anchor="middle" font-weight="600">NVMe SSD</text><line x1="294" y1="262" x2="312" y2="262" class="s-gray" stroke-width="0.8" stroke-dasharray="2 3"/><text x="318" y="266.5" font-size="12" text-anchor="start">0.5–4 TB</text><text x="398" y="266.5" font-size="12" text-anchor="start">20–100 µs</text><line x1="18" y1="282" x2="18" y2="54" class="s-blue" stroke-width="1.6"/><path d="M18 46 L22 54 L14 54 Z" class="f-blue"/><text x="0" y="0" font-size="11.5" text-anchor="middle" class="t-blue" transform="translate(10 162) rotate(-90)">faster · smaller · more $ per byte</text><text x="260" y="304" font-size="11.5" text-anchor="middle" class="t-gray">Each level holds copies of the most useful data from the level below.</text></svg>`,
          alt: 'A pyramid with six levels: registers at the top, then L1, L2 and L3 caches, DRAM, and NVMe SSD at the bottom, with typical sizes and latencies beside each level.',
          caption: 'Typical figures for a 2020s desktop CPU. Exact values vary by microarchitecture, so read them as ranges.',
        },
        {
          type: 'table',
          headers: ['Level', 'Typical size', 'Typical latency', 'Managed by'],
          rows: [
            ['Registers', '16 integer + 16–32 vector registers per thread on x86-64', 'Part of the pipeline: no extra wait', 'The compiler (register allocation)'],
            ['L1 data + L1 instruction, per core', '32–64 KB each (Apple M-series: 128 KB L1d)', '4–5 cycles (~1 ns)', 'Hardware'],
            ['L2, per core (shared per cluster on some chips)', '256 KB – 3 MB', '12–16 cycles (3–5 ns)', 'Hardware'],
            ['L3 / last-level cache, shared by cores', '8–96 MB', '30–70 cycles (10–20 ns)', 'Hardware'],
            ['DRAM main memory', '8–64 GB', '60–100+ ns (250–400 cycles)', 'Hardware, with the OS deciding what is resident'],
            ['NVMe SSD', '0.5–4 TB', '20–100 µs for a random read', 'The OS (file system and page cache)'],
          ],
        },
        {
          type: 'p',
          text: 'The [[cpu-cache|caches]] are transparent: your C++ never names them. Every load and store goes to L1 first; if the data is not there, L1 asks L2, which asks L3, which asks DRAM. You can still ask the machine what it has. This is real output from a cloud VM on a 5th-generation Intel Xeon:',
        },
        {
          type: 'code',
          lang: 'shell',
          code: `$ getconf -a | grep DCACHE
LEVEL1_DCACHE_SIZE                 49152
LEVEL1_DCACHE_ASSOC                12
LEVEL1_DCACHE_LINESIZE             64`,
          annotations: [
            { lines: 2, text: '48 KiB of L1 data cache per core.' },
            { lines: 3, text: '12-way set-associative: the next lesson explains what that means and why it matters.' },
            { lines: 4, text: 'Data moves in 64-byte [[cache-line|cache lines]], never single bytes. Almost every x86 and ARM CPU uses 64-byte lines (Apple\'s M-series uses 128).' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Console reality',
          text: 'PS5 and Xbox Series X|S use eight AMD Zen 2 cores, each with 32 KB of L1d and 512 KB of L2, but only 4 MB of L3 per four-core cluster, a quarter of what desktop Zen 2 has. Main memory is 16 GB of GDDR6 shared with the GPU: superb bandwidth for graphics, but built for throughput rather than CPU latency. Console engine teams treat cache misses as a first-class budget item for exactly this reason.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'To benefit from the CPU cache, a C++ program must explicitly copy data into it before using it.',
      answer: false,
      explanation:
        'CPU caches are managed entirely by hardware: every ordinary load and store goes through them automatically, and the hardware decides what to keep. What *you* control is the access pattern, which determines whether the hardware\'s guesses work. The alternative design does exist: a software-managed **scratchpad**. The PS3\'s Cell processor gave each SPE core a 256 KB local store with no cache at all, and programmers had to move every byte in and out with explicit DMA. It was fast and predictable, and famously hard to program.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Locality: why caches work at all',
      blocks: [
        {
          type: 'p',
          text: 'A cache only helps if the program asks for the same data, or nearby data, again soon. Real programs do, in two ways that have names:',
        },
        {
          type: 'definition',
          term: 'Temporal locality',
          text: 'Data used recently is likely to be used again soon: a loop counter, an accumulator, the player\'s transform, the top of the stack, the instructions of a loop body. Caches exploit it by **keeping** recently used lines.',
        },
        {
          type: 'definition',
          term: 'Spatial locality',
          text: 'Data near something just used is likely to be used soon: the next array element, the next field of a struct, the next instruction. Caches exploit it by fetching a whole **64-byte line** at a time, so neighbours arrive for free.',
        },
        {
          type: 'p',
          text: 'Step through 64 loads of a 32-element `int` array. Each `int` is 4 bytes, so 16 of them share one 64-byte line:',
        },
        {
  "type": "algo",
  "view": "array",
  "interval": 1600,
  "code": "int sum = 0;\nfor (int i = 0; i < 32; ++i) {\n    sum += a[i];   // pass 1\n}\nfor (int i = 0; i < 32; ++i) {\n    sum += a[i];   // pass 2\n}",
  "caption": "Where each load of a 64-byte-aligned `int a[32]` is found. Orange = where the data finally came from, red = levels that missed, green = L1 hit.",
  "frames": [
    {
      "note": "Cold start: no part of `a` is in any cache yet. Toy latencies: L1 4, L2 14, L3 40, DRAM 250 cycles (no prefetching).",
      "array": [
        "L1",
        "L2",
        "L3",
        "DRAM"
      ],
      "lines": [
        1
      ],
      "vars": [
        [
          "total cycles",
          "0"
        ]
      ]
    },
    {
      "note": "`a[0]` misses in L1, L2 and L3. The request goes all the way to DRAM, and the **whole 64-byte line** `a[0..15]` is copied into every cache level.",
      "marks": [
        {
          "index": 0,
          "color": "red"
        },
        {
          "index": 1,
          "color": "red"
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
          "label": "a[0]"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "pass",
          "1"
        ],
        [
          "loads",
          "a[0]"
        ],
        [
          "cost",
          "250 cycles"
        ],
        [
          "total cycles",
          "250"
        ]
      ]
    },
    {
      "note": "`a[1]` sits in the same line, which is now in L1: a hit. That is **spatial locality** paying off.",
      "marks": [
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "a[1]"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "pass",
          "1"
        ],
        [
          "loads",
          "a[1]"
        ],
        [
          "cost",
          "4 cycles"
        ],
        [
          "total cycles",
          "254"
        ]
      ]
    },
    {
      "note": "The other 14 elements of that line hit in L1 too: 14 × 4 = 56 cycles.",
      "marks": [
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "a[2..15]"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "pass",
          "1"
        ],
        [
          "loads",
          "a[2..15]"
        ],
        [
          "cost",
          "56 cycles"
        ],
        [
          "total cycles",
          "310"
        ]
      ]
    },
    {
      "note": "`a[16]` starts a new line (bytes 64..127). Another trip to DRAM.",
      "marks": [
        {
          "index": 0,
          "color": "red"
        },
        {
          "index": 1,
          "color": "red"
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
          "label": "a[16]"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "pass",
          "1"
        ],
        [
          "loads",
          "a[16]"
        ],
        [
          "cost",
          "250 cycles"
        ],
        [
          "total cycles",
          "560"
        ]
      ]
    },
    {
      "note": "The rest of the second line hits. First pass: 32 loads, 2 misses, 620 cycles, about 19 cycles per load.",
      "marks": [
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "a[17..31]"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "pass",
          "1"
        ],
        [
          "loads",
          "a[17..31]"
        ],
        [
          "cost",
          "60 cycles"
        ],
        [
          "total cycles",
          "620"
        ]
      ]
    },
    {
      "note": "Second pass: `a[0]` was used a moment ago and is still in L1. That is **temporal locality**.",
      "marks": [
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "a[0]"
        }
      ],
      "lines": [
        5
      ],
      "vars": [
        [
          "pass",
          "2"
        ],
        [
          "loads",
          "a[0]"
        ],
        [
          "cost",
          "4 cycles"
        ],
        [
          "total cycles",
          "624"
        ]
      ]
    },
    {
      "note": "Every load of the second pass hits: 32 loads in 128 cycles, 4 per load. Without any cache, the 64 loads would have cost 64 × 250 = 16,000 cycles.",
      "marks": [
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "a[1..31]"
        }
      ],
      "lines": [
        5
      ],
      "vars": [
        [
          "pass",
          "2"
        ],
        [
          "loads",
          "a[1..31]"
        ],
        [
          "cost",
          "124 cycles"
        ],
        [
          "total cycles",
          "748"
        ]
      ]
    }
  ]
},
        {
          type: 'p',
          text: 'The first pass paid for two DRAM trips and then rode on [[spatial-locality]]; the second pass ran entirely on [[temporal-locality]]. The set of data a program touches over a short window is its **working set**: when the working set fits in a level, that level serves almost every access.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is locality so common?',
          text: 'Because of how we write programs. Loops run the same instructions repeatedly (temporal locality in code), walk arrays in order (spatial locality in data), and keep a few hot variables (temporal). Functions use the stack, which is reused at the same addresses over and over. Compilers and allocators reinforce it by laying out code and data sequentially. Caches are a bet that programs behave this way, and most of the time the bet pays off. The rest of this unit is about making sure *your* code wins that bet.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: 'Complete the sentences about this loop over `std::vector<float> damage`.',
      template: 'In `for (float d : damage) total += d;`, reusing `total` on every iteration is ___ locality, and reading `damage[i + 1]` right after `damage[i]` is ___ locality. The cache exploits the second kind by fetching a whole ___ at a time.',
      templateIsCode: false,
      blanks: [{ answers: ['temporal'] }, { answers: ['spatial'] }, { answers: ['cache line', 'line'] }],
      wordBank: ['temporal', 'spatial', 'cache line', 'register', 'sequential', 'page'],
      explanation:
        '`total` is the same variable over and over: **temporal** locality (here the compiler keeps it in a register, the very top of the hierarchy). Consecutive elements sit next to each other in a contiguous vector: **spatial** locality, which the cache exploits by moving whole **cache lines**, so one miss brings in 16 floats. "Sequential" describes the access pattern but is not one of the two kinds of locality; a page is the unit of virtual memory, covered at the end of this unit.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Average memory access time',
      blocks: [
        {
          type: 'p',
          text: 'How fast is "memory" for a given program? The standard measure is the **[[amat|average memory access time]]**:',
        },
        {
          type: 'p',
          text: '**AMAT = hit time + miss rate × miss penalty**',
        },
        {
          type: 'p',
          text: 'The miss penalty of one level is the AMAT of the level behind it, so the formula nests. With *local* miss rates (the fraction of requests *reaching* a level that miss there):',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <format>
#include <iostream>

// Average memory access time for a three-level cache,
// using *local* miss rates (the fraction of requests that
// reach a level and miss there).
double amat(double l1Miss) {
    const double l1 = 4, l2 = 14, l3 = 40, dram = 250; // cycles
    const double l2Miss = 0.40, l3Miss = 0.30;
    return l1 + l1Miss * (l2 + l2Miss * (l3 + l3Miss * dram));
}

int main() {
    for (double m : {0.01, 0.02, 0.05, 0.10, 0.20}) {
        std::cout << std::format(
            "L1 miss rate {:>4.0f}% -> AMAT {:>4.1f} cycles\\n",
            m * 100, amat(m));
    }
}`,
          output: "L1 miss rate    1% -> AMAT  4.6 cycles\nL1 miss rate    2% -> AMAT  5.2 cycles\nL1 miss rate    5% -> AMAT  7.0 cycles\nL1 miss rate   10% -> AMAT 10.0 cycles\nL1 miss rate   20% -> AMAT 16.0 cycles",
          annotations: [
            { lines: 8, text: 'Hit times for each level and the DRAM latency, in cycles. Illustrative, but in the right range for a desktop CPU.' },
            { lines: 9, text: 'Local miss rates: of the requests that reach L2, 40% miss there; of those that reach L3, 30% miss. Big caches behind L1 often have high *local* miss rates, because L1 already caught the easy hits.' },
            { lines: 10, text: 'The nesting: on an L1 miss you pay L2\'s hit time, and on an L2 miss you additionally pay L3\'s AMAT, and so on.' },
          ],
        },
        {
          type: 'p',
          text: 'Look at the shape of the output. Going from a 1% to a 5% L1 miss rate raises the average from 4.6 to 7 cycles; at 20% it is 16 cycles, four times the L1 hit time. Tiny miss rates matter enormously, because the penalty is so much larger than the hit time.',
        },
        {
          type: 'deepdive',
          title: 'Local vs global miss rates',
          blocks: [
            {
              type: 'p',
              text: 'The **global** miss rate of a level is the fraction of *all* memory accesses that miss there. It is the product of the local rates above it: here, at 5% L1 misses, the L3 global miss rate is 0.05 × 0.40 × 0.30 = 0.6%. Only 6 accesses in a thousand reach DRAM, yet they contribute 0.006 × 250 = 1.5 of the 7 average cycles.',
            },
            {
              type: 'p',
              text: 'Hardware counters usually report misses per level, from which you can compute both rates. Do not compare a 40% local L2 miss rate with a 5% L1 miss rate and conclude that L2 is "worse": L2 only sees the hard cases.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'numeric',
      prompt: 'A two-level system has an L1 hit time of 1 ns and an L1 miss rate of 5%. L2 has a hit time of 5 ns and a local miss rate of 20%. DRAM takes 100 ns. What is the AMAT in nanoseconds? (Give two decimal places.)',
      answer: 2.25,
      tolerance: 0.005,
      unit: 'ns',
      hint: 'Work from the inside out: first the average cost of an access that reaches L2, then the whole formula.',
      explanation:
        'An access that reaches L2 costs on average 5 + 0.20 × 100 = 25 ns. So AMAT = 1 + 0.05 × 25 = **2.25 ns**. Even though 99% of accesses (95% L1 hits plus 4% L2 hits) never reach DRAM, the average is more than double the L1 hit time. Halving the L1 miss rate to 2.5% would bring it to 1.625 ns.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Latency numbers every programmer should know',
      blocks: [
        {
          type: 'p',
          text: 'Jeff Dean at Google popularized a list of latencies that every engineer should carry in their head; Peter Norvig published an early version. The exact values drift with hardware generations, but the **ratios** between them have stayed remarkably stable. A modern version, with typical ranges:',
        },
        {
          type: 'table',
          headers: ['Operation', 'Typical latency'],
          rows: [
            ['L1 cache hit', '~1 ns (4–5 cycles)'],
            ['Branch mispredict', '~3–5 ns (15–20 cycles)'],
            ['L2 cache hit', '~3–5 ns'],
            ['L3 cache hit', '~10–20 ns'],
            ['Uncontended mutex lock + unlock', '~10–25 ns'],
            ['Cache line transfer between two cores', '~40–100+ ns'],
            ['DRAM access', '~60–100+ ns'],
            ['Random 4 KB read from an NVMe SSD', '~20–100 µs'],
            ['Sequential 1 MB read from an NVMe SSD', '~150–500 µs'],
            ['Hard disk seek', '~5–10 ms'],
            ['One frame at 120 / 60 fps', '8.3 / 16.7 ms'],
            ['Network round trip to a nearby game server', '~10–50 ms'],
          ],
          caption: 'Ranges, not specs: measured values depend on the CPU, memory, drive and load.',
        },
        {
          type: 'p',
          text: 'Human intuition fails on numbers spanning seven orders of magnitude, so scale them up:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <format>
#include <iostream>
#include <string>

// Turn a duration in seconds into a human-friendly string.
std::string human(double s) {
    if (s < 120) return std::format("{:.0f} s", s);
    if (s < 7200) return std::format("{:.0f} minutes", s / 60);
    if (s < 172800) return std::format("{:.0f} hours", s / 3600);
    return std::format("{:.0f} days", s / 86400);
}

struct Level {
    const char* name;
    double ns;                  // typical latency
};

int main() {
    const Level levels[] = {
        {"L1 hit", 1},          {"L2 hit", 4},
        {"L3 hit", 15},         {"DRAM", 80},
        {"NVMe SSD read", 50'000},
        {"Hard disk seek", 5'000'000},
    };
    std::cout << "If an L1 hit took one second...\\n";
    for (const Level& l : levels) {
        const double scaled = l.ns / levels[0].ns;  // seconds
        std::cout << std::format("{:<15} {:>11.0f} ns -> {}\\n",
                                 l.name, l.ns, human(scaled));
    }
}`,
          output: "If an L1 hit took one second...\nL1 hit                    1 ns -> 1 s\nL2 hit                    4 ns -> 4 s\nL3 hit                   15 ns -> 15 s\nDRAM                     80 ns -> 80 s\nNVMe SSD read         50000 ns -> 14 hours\nHard disk seek      5000000 ns -> 58 days",
          annotations: [
            { lines: '6-11', text: 'Picks a sensible unit for a duration, so the output reads like a story rather than a column of exponents.' },
            { lines: '19-24', text: 'The `\'` digit separators (C++14) make large literals readable: 5\'000\'000 ns is 5 ms.' },
            { lines: 27, text: 'Scale every latency so that an L1 hit takes one second.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Use the table to sanity-check designs',
          text: 'Before writing code, multiply: 10,000 enemies × one DRAM miss each × 80 ns = 0.8 ms, about 5% of a 60 fps frame for a single pass, if nothing overlaps. 100 random SSD reads at 50 µs each, one after another, is 5 ms: a visible hitch if done on the game thread. Back-of-the-envelope latency math catches bad designs before a profiler has to.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'order',
      prompt: 'Order these places data can live, from the fastest to access to the slowest.',
      lines: ['CPU registers', 'L1 cache', 'L2 cache', 'L3 cache', 'DRAM main memory', 'NVMe SSD', 'Hard disk'],
      linesAreCode: false,
      explanation:
        'Each step down is larger and slower, by a factor of roughly 3–10 between caches, about 5–10 from L3 to DRAM, and about a thousand from DRAM to an SSD. The hard disk is slower still because a mechanical arm must physically move. Every level exists to hide the latency of the one below it.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'What this means for your C++',
      blocks: [
        {
          type: 'p',
          text: 'The cache does not know about your objects, containers or classes. It sees only addresses, and it moves memory in 64-byte lines. So the question to ask of any data structure is: **how many distinct lines does this loop touch, and in what order?**',
        },
        {
          type: 'compare',
          left: {
            title: 'Pointer-based: a line per element',
            tone: 'bad',
            code: `std::list<Particle> particles;
for (Particle& p : particles) {
    p.pos += p.vel * dt;
}`,
            text: 'Each node was allocated separately and can be anywhere in the heap. Every step is likely a new line, and the next address is only known after the previous load: no spatial locality, no overlap.',
          },
          right: {
            title: 'Contiguous: lines shared, order predictable',
            tone: 'good',
            code: `std::vector<Particle> particles;
for (Particle& p : particles) {
    p.pos += p.vel * dt;
}`,
            text: 'Elements are packed back to back. Several particles share each line, addresses are predictable, and the hardware prefetcher runs ahead of the loop.',
          },
        },
        {
          type: 'p',
          text: 'This is why "use `std::vector` by default" is good advice even where [[big-o|Big-O]] seems to favour a linked list: Big-O counts operations and ignores that some operations cost 1 ns and others 100. [[contiguous-memory|Contiguous memory]] and [[cache-locality]] usually dominate. The next two lessons make this quantitative: first how caches decide what to keep, then how to write code that plays to them.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'When caches are a liability',
          text: 'Caches make *average* performance great and *worst-case* timing hard to predict. Hard real-time embedded systems, such as flight controls, weapons guidance and engine controllers, must prove a worst-case execution time, so their designers often use processors that can lock or partition cache contents, use on-chip scratchpad RAM instead, or account for every possible miss. Game engines face a softer version of the same problem: a frame that is fast on average but occasionally misses its budget still stutters.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'A profiler shows that a particle update spends most of its time stalled waiting for memory. Particles are stored as `std::list<Particle*>`, each one allocated with `new`. Which change is most likely to give a large speed-up?',
      options: [
        {
          text: 'Mark the update function `inline`',
          why: 'Inlining removes call overhead, which is a few cycles. The stalls are hundreds of cycles per particle, caused by where the data lives.',
        },
        {
          text: 'Store the particles by value in a `std::vector<Particle>` and update them in order',
          correct: true,
          why: 'Contiguous storage puts several particles in each cache line and makes addresses predictable, so most loads hit and the prefetcher can stream ahead. This attacks the actual bottleneck: misses.',
        },
        {
          text: 'Switch the particle fields from `float` to `double` for better precision',
          why: 'That doubles the bytes per particle, so the loop touches twice as many cache lines. It makes a memory-bound loop slower.',
        },
        {
          text: 'Unroll the loop by hand so the CPU executes fewer branch instructions',
          why: 'Branches in a simple loop are predicted almost perfectly and are not the bottleneck. Unrolling does nothing about where each particle lives in memory.',
        },
      ],
      explanation:
        'When a profiler says "memory-bound", the fix is almost always about **data layout and access order**, not instruction count. Here there are two layers of indirection (list node, then the `Particle*` it holds), each a potential miss that cannot overlap with the next. Storing values contiguously removes both. The lesson on cache-friendly code shows how to measure the difference in misses.',
    },
  ],
  takeaways: [
    'A DRAM access costs roughly 60–100 ns, which is hundreds of cycles: the memory wall dominates performance on modern hardware.',
    'SRAM (6 transistors per bit) is fast but large; DRAM (1 transistor + 1 capacitor) is dense but slow and needs refresh. Bigger memories are slower, so the only way to be both big and fast is a hierarchy.',
    'Typical levels: registers; L1 32–64 KB at ~4–5 cycles; L2 0.25–3 MB at ~12–16 cycles; L3 8–96 MB at ~30–70 cycles; DRAM at 60–100+ ns; NVMe SSD at tens of µs.',
    'Caches work because of temporal locality (reuse) and spatial locality (neighbours), and they move data in 64-byte lines.',
    'AMAT = hit time + miss rate × miss penalty, nested level by level; small changes in miss rate cause large changes in average latency.',
    'Independent misses can overlap (memory-level parallelism); dependent misses, as in pointer chasing, cannot.',
  ],
  reading: [
    {
      title: 'What Every Programmer Should Know About Memory',
      url: 'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf',
      source: 'article',
      note: 'Ulrich Drepper\'s classic: sections 2 and 3 explain DRAM internals and the cache hierarchy in depth.',
    },
    {
      title: 'Computer Systems: A Programmer\'s Perspective',
      url: 'https://csapp.cs.cmu.edu/',
      source: 'book',
      note: 'Chapter 6, "The Memory Hierarchy", covers storage technologies, locality and the memory mountain.',
    },
    {
      title: 'Memory hierarchy',
      url: 'https://en.wikipedia.org/wiki/Memory_hierarchy',
      source: 'article',
      note: 'A short overview of the levels and the reasoning behind them, with links to each technology.',
    },
    {
      title: 'Game Programming Patterns: Data Locality',
      url: 'https://gameprogrammingpatterns.com/data-locality.html',
      source: 'book',
      note: 'Robert Nystrom\'s game-focused introduction to why the cache matters, with particle and component examples.',
    },
  ],
};
