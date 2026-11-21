import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-cache-coherence',
  title: 'Multicore and Cache Coherence',
  summary:
    'Why CPUs went multicore, how private caches can disagree about memory, how snooping and directories keep them coherent, the MESI protocol step by step, and what sharing a written cache line between cores really costs.',
  minutes: 22,
  objectives: [
    'Explain why the end of Dennard scaling pushed CPUs from faster cores to more cores',
    'Describe the cache coherence problem and the single-writer/multiple-reader invariant',
    'Compare snooping and directory-based coherence and explain why directories scale',
    'Trace the MESI protocol for a line shared by two cores and count the messages it sends',
    'Estimate the cost of sharing written data between cores and restructure code to avoid it',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Why every CPU became multicore',
      blocks: [
        {
          type: 'p',
          text: 'From the 1970s to the early 2000s, each new process generation made transistors smaller, faster and lower-voltage at once. Robert Dennard\'s 1974 scaling rules predicted that power *density* would stay constant as transistors shrank, so clock speeds could climb every generation for free. Around 2005 that stopped: supply voltage could not keep falling without transistors leaking badly, and dynamic power grows with **capacitance × voltage² × frequency**. Pushing clocks further would have melted the chips. Desktop clocks have sat around 3–6 GHz ever since.',
        },
        {
          type: 'p',
          text: 'Transistor counts kept growing, though. Making one core wider and deeper had already hit diminishing returns (the out-of-order lessons showed how hard it is to find more instruction-level parallelism), so designers spent the transistors on **more cores**. Today a phone has 6–10 cores, a desktop 8–24, and the PS5 and Xbox Series consoles 8 Zen 2 cores in two 4-core clusters.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 272" xmlns="http://www.w3.org/2000/svg"><rect x="21" y="10" width="112" height="46" rx="6" class="f-blue" fill-opacity="0.14"/><rect x="21" y="10" width="112" height="46" rx="6" fill="none" class="s-blue" stroke-width="1.6"/><text x="77" y="30" font-size="13" text-anchor="middle" class="t-blue" font-weight="700">Core 0</text><text x="77" y="47" font-size="10.5" text-anchor="middle" class="t-gray">registers, pipeline</text><rect x="21" y="62" width="53" height="30" rx="4" class="f-teal" fill-opacity="0.14"/><rect x="21" y="62" width="53" height="30" rx="4" fill="none" class="s-teal" stroke-width="1.6"/><text x="47.5" y="81" font-size="11.5" text-anchor="middle" font-weight="600">L1d</text><rect x="80" y="62" width="53" height="30" rx="4" class="f-teal" fill-opacity="0.14"/><rect x="80" y="62" width="53" height="30" rx="4" fill="none" class="s-teal" stroke-width="1.6"/><text x="106.5" y="81" font-size="11.5" text-anchor="middle" font-weight="600">L1i</text><rect x="21" y="98" width="112" height="30" rx="4" class="f-green" fill-opacity="0.14"/><rect x="21" y="98" width="112" height="30" rx="4" fill="none" class="s-green" stroke-width="1.6"/><text x="77" y="117" font-size="11.5" text-anchor="middle" font-weight="600">L2 (private)</text><line x1="77" y1="128" x2="77" y2="146" stroke="currentColor" stroke-width="1.6"/><rect x="143" y="10" width="112" height="46" rx="6" class="f-blue" fill-opacity="0.14"/><rect x="143" y="10" width="112" height="46" rx="6" fill="none" class="s-blue" stroke-width="1.6"/><text x="199" y="30" font-size="13" text-anchor="middle" class="t-blue" font-weight="700">Core 1</text><text x="199" y="47" font-size="10.5" text-anchor="middle" class="t-gray">registers, pipeline</text><rect x="143" y="62" width="53" height="30" rx="4" class="f-teal" fill-opacity="0.14"/><rect x="143" y="62" width="53" height="30" rx="4" fill="none" class="s-teal" stroke-width="1.6"/><text x="169.5" y="81" font-size="11.5" text-anchor="middle" font-weight="600">L1d</text><rect x="202" y="62" width="53" height="30" rx="4" class="f-teal" fill-opacity="0.14"/><rect x="202" y="62" width="53" height="30" rx="4" fill="none" class="s-teal" stroke-width="1.6"/><text x="228.5" y="81" font-size="11.5" text-anchor="middle" font-weight="600">L1i</text><rect x="143" y="98" width="112" height="30" rx="4" class="f-green" fill-opacity="0.14"/><rect x="143" y="98" width="112" height="30" rx="4" fill="none" class="s-green" stroke-width="1.6"/><text x="199" y="117" font-size="11.5" text-anchor="middle" font-weight="600">L2 (private)</text><line x1="199" y1="128" x2="199" y2="146" stroke="currentColor" stroke-width="1.6"/><rect x="265" y="10" width="112" height="46" rx="6" class="f-blue" fill-opacity="0.14"/><rect x="265" y="10" width="112" height="46" rx="6" fill="none" class="s-blue" stroke-width="1.6"/><text x="321" y="30" font-size="13" text-anchor="middle" class="t-blue" font-weight="700">Core 2</text><text x="321" y="47" font-size="10.5" text-anchor="middle" class="t-gray">registers, pipeline</text><rect x="265" y="62" width="53" height="30" rx="4" class="f-teal" fill-opacity="0.14"/><rect x="265" y="62" width="53" height="30" rx="4" fill="none" class="s-teal" stroke-width="1.6"/><text x="291.5" y="81" font-size="11.5" text-anchor="middle" font-weight="600">L1d</text><rect x="324" y="62" width="53" height="30" rx="4" class="f-teal" fill-opacity="0.14"/><rect x="324" y="62" width="53" height="30" rx="4" fill="none" class="s-teal" stroke-width="1.6"/><text x="350.5" y="81" font-size="11.5" text-anchor="middle" font-weight="600">L1i</text><rect x="265" y="98" width="112" height="30" rx="4" class="f-green" fill-opacity="0.14"/><rect x="265" y="98" width="112" height="30" rx="4" fill="none" class="s-green" stroke-width="1.6"/><text x="321" y="117" font-size="11.5" text-anchor="middle" font-weight="600">L2 (private)</text><line x1="321" y1="128" x2="321" y2="146" stroke="currentColor" stroke-width="1.6"/><rect x="387" y="10" width="112" height="46" rx="6" class="f-blue" fill-opacity="0.14"/><rect x="387" y="10" width="112" height="46" rx="6" fill="none" class="s-blue" stroke-width="1.6"/><text x="443" y="30" font-size="13" text-anchor="middle" class="t-blue" font-weight="700">Core 3</text><text x="443" y="47" font-size="10.5" text-anchor="middle" class="t-gray">registers, pipeline</text><rect x="387" y="62" width="53" height="30" rx="4" class="f-teal" fill-opacity="0.14"/><rect x="387" y="62" width="53" height="30" rx="4" fill="none" class="s-teal" stroke-width="1.6"/><text x="413.5" y="81" font-size="11.5" text-anchor="middle" font-weight="600">L1d</text><rect x="446" y="62" width="53" height="30" rx="4" class="f-teal" fill-opacity="0.14"/><rect x="446" y="62" width="53" height="30" rx="4" fill="none" class="s-teal" stroke-width="1.6"/><text x="472.5" y="81" font-size="11.5" text-anchor="middle" font-weight="600">L1i</text><rect x="387" y="98" width="112" height="30" rx="4" class="f-green" fill-opacity="0.14"/><rect x="387" y="98" width="112" height="30" rx="4" fill="none" class="s-green" stroke-width="1.6"/><text x="443" y="117" font-size="11.5" text-anchor="middle" font-weight="600">L2 (private)</text><line x1="443" y1="128" x2="443" y2="146" stroke="currentColor" stroke-width="1.6"/><rect x="21" y="146" width="478" height="26" rx="13" class="f-gray" fill-opacity="0.12"/><rect x="21" y="146" width="478" height="26" rx="13" fill="none" class="s-gray" stroke-width="1.6"/><text x="260" y="163" font-size="11" text-anchor="middle">on-chip interconnect (ring or mesh) carrying coherence messages</text><line x1="260" y1="172" x2="260" y2="182" stroke="currentColor" stroke-width="1.6"/><rect x="21" y="182" width="478" height="34" rx="4" class="f-orange" fill-opacity="0.14"/><rect x="21" y="182" width="478" height="34" rx="4" fill="none" class="s-orange" stroke-width="1.6"/><text x="260" y="197" font-size="12" text-anchor="middle" font-weight="600">shared L3, split into slices</text><text x="260" y="211" font-size="10.5" text-anchor="middle" class="t-gray">tracks which cores may hold each line (snoop filter / directory)</text><line x1="260" y1="216" x2="260" y2="230" stroke="currentColor" stroke-width="1.6"/><path d="M260 238 L256 230 L264 230 Z" fill="currentColor"/><rect x="150" y="238" width="220" height="28" rx="4" class="f-purple" fill-opacity="0.14"/><rect x="150" y="238" width="220" height="28" rx="4" fill="none" class="s-purple" stroke-width="1.6"/><text x="260" y="257" font-size="12" text-anchor="middle" font-weight="600">memory controller → DRAM</text></svg>`,
          alt: 'Four cores, each with private L1 data, L1 instruction and L2 caches, connected by an on-chip interconnect to a shared, sliced L3 that tracks which cores hold each line, and then to the memory controller and DRAM.',
          caption: 'A typical multicore chip: private L1 and L2 per core, a shared L3, and an interconnect that carries both data and coherence traffic.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not one gigantic core instead?',
          text: 'Single-core performance grows roughly with the square root of the area spent on it (an observation known as **Pollack\'s rule**): doubling a core\'s transistors buys about 40% more speed, while a second core can double throughput, *if the software has parallel work*. That "if" moved the burden to programmers. It is why game engines are built around job systems that split each frame into hundreds of small tasks spread across every core.',
        },
        {
          type: 'p',
          text: 'Multiple cores with **private** caches create a new problem. Each core caches lines independently and, with write-back caches, writes stay in the writer\'s cache. What happens when two cores cache the same line and one of them writes it?',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'Why did desktop CPU clock speeds stop rising quickly in the mid-2000s, even though transistors kept shrinking?',
      options: [
        {
          text: 'Transistors stopped getting smaller, so there was no way to build faster circuits',
          why: 'Transistors kept shrinking for many more generations; transistor counts are still rising today.',
        },
        {
          text: 'Supply voltage could no longer scale down with transistor size, so higher clocks meant unmanageable power and heat',
          correct: true,
          why: 'Dynamic power is proportional to C × V² × f. Once V stopped falling (the end of Dennard scaling), raising f raised power density beyond what chips could dissipate.',
        },
        {
          text: 'DRAM could not keep up, so faster clocks would not have helped any program',
          why: 'The memory wall is real, but compute-bound code does benefit from higher clocks. The hard limit was power, not memory.',
        },
        {
          text: 'Operating systems could not schedule threads on cores faster than about 4 GHz',
          why: 'Clock speed has nothing to do with OS scheduling; the scheduler runs on the same cores at whatever frequency they run.',
        },
      ],
      explanation:
        'This is the **power wall**. With Dennard scaling, each generation could raise frequency at constant power density. After it ended, the only power-efficient way to use more transistors was more cores (and wider SIMD units and bigger caches), each running at a sensible frequency. Performance growth became something software has to earn through parallelism.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'The coherence problem',
      blocks: [
        {
          type: 'p',
          text: 'Here is what goes wrong if each core\'s write-back cache simply minds its own business:',
        },
        {
  "type": "algo",
  "view": "array",
  "interval": 1700,
  "frames": [
    {
      "note": "Two cores with private write-back caches and **no coherence protocol**. Memory holds `x = 0`; neither cache has it yet.",
      "array": [
        "—",
        "—",
        "0"
      ],
      "vars": [
        [
          "core 0 sees",
          "—"
        ],
        [
          "core 1 sees",
          "—"
        ]
      ]
    },
    {
      "note": "Core 0 reads `x`: a miss, so its cache loads the line from memory.",
      "array": [
        "0",
        "—",
        "0"
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "gray"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "C0 read"
        }
      ],
      "vars": [
        [
          "core 0 sees",
          "0"
        ],
        [
          "core 1 sees",
          "—"
        ]
      ]
    },
    {
      "note": "Core 1 reads `x` and gets its own copy.",
      "array": [
        "0",
        "0",
        "0"
      ],
      "marks": [
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "gray"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "C1 read"
        }
      ],
      "vars": [
        [
          "core 0 sees",
          "0"
        ],
        [
          "core 1 sees",
          "0"
        ]
      ]
    },
    {
      "note": "Core 1 writes `x = 1`. Its write-back cache updates only its own copy and marks it dirty. Memory and core 0 still hold 0.",
      "array": [
        "0",
        "1",
        "0"
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
          "label": "C1 x = 1"
        }
      ],
      "vars": [
        [
          "core 0 sees",
          "0"
        ],
        [
          "core 1 sees",
          "1"
        ]
      ]
    },
    {
      "note": "Core 0 reads `x` again: a **hit** on its stale copy. It sees 0 forever, or until the line happens to be evicted. The two cores disagree about one memory location.",
      "array": [
        "0",
        "1",
        "0"
      ],
      "marks": [
        {
          "index": 0,
          "color": "red"
        },
        {
          "index": 1,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "C0 read"
        }
      ],
      "vars": [
        [
          "core 0 sees",
          "0 (stale)"
        ],
        [
          "core 1 sees",
          "1"
        ]
      ]
    }
  ],
  "caption": "Cells: core 0's cached copy of `x`, core 1's cached copy, and main memory. This is what coherence protocols exist to prevent."
},
        {
          type: 'p',
          text: 'A **[[cache-coherence]]** protocol prevents this. It guarantees two things for every memory location:',
        },
        {
          type: 'list',
          items: [
            '**Single writer, multiple readers (SWMR)**: at any moment, a line may either be written by exactly one core, or read by any number of cores, but never both. Before a core may write, every other copy must be invalidated (or updated).',
            '**Data value**: a read returns the value of the most recent write to that location in the order the writes were serialized. Writes to one location are seen by all cores in the same order.',
          ],
        },
        {
          type: 'p',
          text: 'Coherence is invisible to correct programs: caches with a coherence protocol behave, for each individual location, as if there were no caches at all. Its *performance* is anything but invisible, as the rest of this unit shows.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Coherence is per location, and only for the hardware',
          text: 'Coherence says nothing about the **order** in which a core\'s writes to *different* locations become visible to others; that is the memory consistency model, the subject of the last lesson in this unit. It also does not protect you from the *compiler*, which may keep a variable in a register and never re-read memory at all. In C++, sharing written data between threads still requires atomics or locks; coherence is how the hardware makes those efficient.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'Cache coherence guarantees that if core 0 writes `x` and then writes `y`, every other core that sees the new `y` also sees the new `x`.',
      answer: false,
      explanation:
        'Coherence is defined **per location**: all cores agree on the order of writes to `x`, and separately on the order of writes to `y`. Whether another core can see the new `y` before the new `x` is a question of **memory consistency**, and on many CPUs the answer is yes, because of store buffers and reordering. That is why C++ needs `memory_order_release` and `memory_order_acquire`, covered in the memory models lesson.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Snooping and directories',
      blocks: [
        {
          type: 'p',
          text: 'Every coherence protocol needs a way for a core to find out who else holds a line. There are two classic designs.',
        },
        {
          type: 'table',
          headers: ['Aspect', 'Snooping', 'Directory'],
          rows: [
            ['Idea', 'Every miss is **broadcast** on a shared bus; every cache controller watches ("snoops") all traffic and reacts to requests for lines it holds', 'A **directory** at the line\'s home location records which cores may hold it; requests go there and are forwarded only to those cores'],
            ['Ordering', 'The bus itself orders all requests: whoever wins arbitration goes first', 'The directory serializes requests for each line'],
            ['Traffic', 'Every miss reaches every cache', 'Point-to-point messages to the actual sharers'],
            ['Scales to', 'A handful of cores', 'Dozens to hundreds of cores, and multi-socket servers'],
          ],
        },
        {
          type: 'p',
          text: 'Real chips blend the two. A modern Intel or AMD processor sends requests over a ring or mesh to the L3 slice responsible for the address, and that slice keeps tracking information: either an inclusive L3 whose tags know which cores hold each line, or a separate **snoop filter** (a directory by another name). Only cores that might have a copy receive a snoop. That is why the caches lesson said inclusion "simplifies multicore bookkeeping".',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just broadcast everything?',
          text: 'Broadcasting costs bandwidth and energy proportional to the number of cores, *for every miss*. With 4 cores that is fine; with 64 cores, almost every snoop would ask 63 caches that do not have the line. Most lines are private to one core or read-only, so a directory that remembers the few actual sharers avoids almost all of that traffic.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: 'A 64-core server CPU uses a directory instead of broadcast snooping. What is the main benefit?',
      options: [
        {
          text: 'Coherence messages go only to cores that may hold the line, so traffic does not grow with the core count for every miss',
          correct: true,
          why: 'Most lines live in one core or none. The directory turns a 63-way broadcast into zero or a few point-to-point messages.',
        },
        {
          text: 'A directory removes the need for invalidations, because writes update memory immediately',
          why: 'Directory protocols still invalidate other copies before a write (or update them); they just know whom to ask.',
        },
        {
          text: 'A directory lets two cores write the same line at the same time',
          why: 'No coherent design allows that: the single-writer rule holds regardless of how sharers are tracked.',
        },
        {
          text: 'A directory makes every access faster, including L1 hits',
          why: 'L1 hits never involve the coherence protocol. The directory only matters for misses and upgrades.',
        },
      ],
      explanation:
        'Directories trade a little storage (tracking bits per line) and an extra hop for scalability. The price shows up as latency: a request may travel to the home directory and then be forwarded to the owner, which is part of why line transfers between distant cores, chiplets or sockets are slow.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'The MESI protocol',
      blocks: [
        {
          type: 'p',
          text: 'Most CPUs use a variant of **[[mesi-protocol|MESI]]**, which tags every cached line with one of four states:',
        },
        {
          type: 'table',
          headers: ['State', 'Meaning', 'May read?', 'May write?'],
          rows: [
            ['**M**odified', 'Only copy, dirty: memory is stale and this cache must supply the data', 'Yes', 'Yes'],
            ['**E**xclusive', 'Only copy, clean: matches memory', 'Yes', 'Yes, silently moving to M'],
            ['**S**hared', 'Clean, and other caches may also hold it', 'Yes', 'Only after invalidating the others'],
            ['**I**nvalid', 'Not present (or stale)', 'Miss', 'Miss'],
          ],
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 270" xmlns="http://www.w3.org/2000/svg"><text x="124" y="18" font-size="12.5" text-anchor="middle" font-weight="700">This core's own requests</text><circle cx="52" cy="62" r="22" class="f-red" fill-opacity="0.16"/><circle cx="52" cy="62" r="22" fill="none" class="s-red" stroke-width="1.8"/><text x="52" y="68" font-size="17" text-anchor="middle" class="t-red" font-weight="700">M</text><circle cx="196" cy="62" r="22" class="f-purple" fill-opacity="0.16"/><circle cx="196" cy="62" r="22" fill="none" class="s-purple" stroke-width="1.8"/><text x="196" y="68" font-size="17" text-anchor="middle" class="t-purple" font-weight="700">E</text><circle cx="52" cy="206" r="22" class="f-blue" fill-opacity="0.16"/><circle cx="52" cy="206" r="22" fill="none" class="s-blue" stroke-width="1.8"/><text x="52" y="212" font-size="17" text-anchor="middle" class="t-blue" font-weight="700">S</text><circle cx="196" cy="206" r="22" class="f-gray" fill-opacity="0.16"/><circle cx="196" cy="206" r="22" fill="none" class="s-gray" stroke-width="1.8"/><text x="196" y="212" font-size="17" text-anchor="middle" class="t-gray" font-weight="700">I</text><line x1="196" y1="181" x2="196" y2="95" stroke="currentColor" stroke-width="1.6"/><path d="M196 87 L200 95 L192 95 Z" fill="currentColor"/><text x="226" y="126" font-size="10.5" text-anchor="start">read,</text><text x="226" y="139" font-size="10.5" text-anchor="start">no other</text><text x="226" y="152" font-size="10.5" text-anchor="start">copy</text><line x1="171" y1="62" x2="85" y2="62" stroke="currentColor" stroke-width="1.6"/><path d="M77 62 L85 58 L85 66 Z" fill="currentColor"/><text x="124" y="54" font-size="10.5" text-anchor="middle">write (silent)</text><line x1="52" y1="181" x2="52" y2="95" stroke="currentColor" stroke-width="1.6"/><path d="M52 87 L56 95 L48 95 Z" fill="currentColor"/><text x="46" y="126" font-size="10.5" text-anchor="end">write:</text><text x="46" y="139" font-size="10.5" text-anchor="end">upgrade</text><line x1="171" y1="206" x2="85" y2="206" stroke="currentColor" stroke-width="1.6"/><path d="M77 206 L85 202 L85 210 Z" fill="currentColor"/><text x="124" y="232" font-size="10.5" text-anchor="middle">read, others have it</text><line x1="178.3" y1="188.3" x2="75.3" y2="85.3" stroke="currentColor" stroke-width="1.6"/><path d="M69.7 79.7 L78.2 82.5 L72.5 88.2 Z" fill="currentColor"/><text x="136" y="118" font-size="10.5" text-anchor="start">write:</text><text x="136" y="131" font-size="10.5" text-anchor="start">RFO</text><text x="390" y="18" font-size="12.5" text-anchor="middle" font-weight="700">Requests snooped from other cores</text><circle cx="318" cy="62" r="22" class="f-red" fill-opacity="0.16"/><circle cx="318" cy="62" r="22" fill="none" class="s-red" stroke-width="1.8"/><text x="318" y="68" font-size="17" text-anchor="middle" class="t-red" font-weight="700">M</text><circle cx="462" cy="62" r="22" class="f-purple" fill-opacity="0.16"/><circle cx="462" cy="62" r="22" fill="none" class="s-purple" stroke-width="1.8"/><text x="462" y="68" font-size="17" text-anchor="middle" class="t-purple" font-weight="700">E</text><circle cx="318" cy="206" r="22" class="f-blue" fill-opacity="0.16"/><circle cx="318" cy="206" r="22" fill="none" class="s-blue" stroke-width="1.8"/><text x="318" y="212" font-size="17" text-anchor="middle" class="t-blue" font-weight="700">S</text><circle cx="462" cy="206" r="22" class="f-gray" fill-opacity="0.16"/><circle cx="462" cy="206" r="22" fill="none" class="s-gray" stroke-width="1.8"/><text x="462" y="212" font-size="17" text-anchor="middle" class="t-gray" font-weight="700">I</text><line x1="318" y1="87" x2="318" y2="174" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 3"/><line x1="318" y1="173" x2="318" y2="173" stroke="currentColor" stroke-width="1.6"/><path d="M318 181 L314 173 L322 173 Z" fill="currentColor"/><text x="312" y="126" font-size="10.5" text-anchor="end">read:</text><text x="312" y="139" font-size="10.5" text-anchor="end">supply</text><text x="312" y="152" font-size="10.5" text-anchor="end">data</text><line x1="444.3" y1="79.7" x2="340.6" y2="183.4" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 3"/><line x1="341.3" y1="182.7" x2="341.3" y2="182.7" stroke="currentColor" stroke-width="1.6"/><path d="M335.7 188.3 L338.5 179.8 L344.2 185.5 Z" fill="currentColor"/><text x="422" y="88" font-size="10.5" text-anchor="end">read</text><line x1="335.7" y1="79.7" x2="439.4" y2="183.4" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 3"/><line x1="438.7" y1="182.7" x2="438.7" y2="182.7" stroke="currentColor" stroke-width="1.6"/><path d="M444.3 188.3 L435.8 185.5 L441.5 179.8 Z" fill="currentColor"/><text x="358" y="88" font-size="10.5" text-anchor="start">write</text><line x1="462" y1="87" x2="462" y2="174" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 3"/><line x1="462" y1="173" x2="462" y2="173" stroke="currentColor" stroke-width="1.6"/><path d="M462 181 L458 173 L466 173 Z" fill="currentColor"/><text x="466" y="140" font-size="10.5" text-anchor="start">write</text><line x1="343" y1="206" x2="430" y2="206" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 3"/><line x1="429" y1="206" x2="429" y2="206" stroke="currentColor" stroke-width="1.6"/><path d="M437 206 L429 210 L429 202 Z" fill="currentColor"/><text x="390" y="232" font-size="10.5" text-anchor="middle">write (invalidate)</text><text x="260" y="262" font-size="11" text-anchor="middle" class="t-gray">Hits (M/E/S read, M write) change nothing. Evicting goes to I (M writes back first).</text></svg>`,
          alt: 'Two MESI state diagrams. Left, a core\'s own requests: I to E on a read with no other copy, I to S on a read when others have it, I to M on a write (read for ownership), E to M on a silent write, S to M on a write with an upgrade. Right, requests snooped from other cores: M to S and E to S on a remote read, and M, E and S to I on a remote write.',
          caption: 'Solid arrows: what this core\'s own loads and stores do. Dashed arrows: what other cores\' requests force.',
        },
        {
          type: 'p',
          text: 'Two cores sharing one line `x`, step by step:',
        },
        {
  "type": "algo",
  "view": "graph",
  "width": 440,
  "height": 250,
  "nodes": [
    {
      "id": "M0",
      "x": 110,
      "y": 40,
      "label": "M"
    },
    {
      "id": "S0",
      "x": 48,
      "y": 115,
      "label": "S"
    },
    {
      "id": "E0",
      "x": 172,
      "y": 115,
      "label": "E"
    },
    {
      "id": "I0",
      "x": 110,
      "y": 190,
      "label": "I"
    },
    {
      "id": "M1",
      "x": 330,
      "y": 40,
      "label": "M"
    },
    {
      "id": "S1",
      "x": 268,
      "y": 115,
      "label": "S"
    },
    {
      "id": "E1",
      "x": 392,
      "y": 115,
      "label": "E"
    },
    {
      "id": "I1",
      "x": 330,
      "y": 190,
      "label": "I"
    }
  ],
  "edges": [
    {
      "from": "I0",
      "to": "E0"
    },
    {
      "from": "I0",
      "to": "S0"
    },
    {
      "from": "I0",
      "to": "M0"
    },
    {
      "from": "E0",
      "to": "M0"
    },
    {
      "from": "S0",
      "to": "M0"
    },
    {
      "from": "E0",
      "to": "S0"
    },
    {
      "from": "I1",
      "to": "E1"
    },
    {
      "from": "I1",
      "to": "S1"
    },
    {
      "from": "I1",
      "to": "M1"
    },
    {
      "from": "E1",
      "to": "M1"
    },
    {
      "from": "S1",
      "to": "M1"
    },
    {
      "from": "E1",
      "to": "S1"
    }
  ],
  "interval": 2200,
  "frames": [
    {
      "note": "Both cores start with line `x` **Invalid** (not cached). Memory holds `x = 0`. Orange = the core acting, blue = the other core.",
      "nodeColors": [
        {
          "id": "I0",
          "color": "blue"
        },
        {
          "id": "I1",
          "color": "blue"
        }
      ],
      "edgeColors": [],
      "nodeNotes": [
        {
          "id": "I0",
          "text": "core 0"
        },
        {
          "id": "I1",
          "text": "core 1"
        }
      ],
      "vars": [
        [
          "core 0",
          "I"
        ],
        [
          "core 1",
          "I"
        ],
        [
          "bus",
          "—"
        ],
        [
          "memory x",
          "0"
        ],
        [
          "bus messages",
          "0"
        ]
      ]
    },
    {
      "note": "Core 0 reads `x` and misses: it broadcasts a **BusRd**. Nobody else has the line, so it arrives from memory in state **Exclusive**: clean, and the only copy.",
      "nodeColors": [
        {
          "id": "E0",
          "color": "orange"
        },
        {
          "id": "I1",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "I0",
          "to": "E0",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "I0",
          "text": "core 0"
        },
        {
          "id": "I1",
          "text": "core 1"
        }
      ],
      "vars": [
        [
          "core 0",
          "E"
        ],
        [
          "core 1",
          "I"
        ],
        [
          "bus",
          "BusRd, data from memory"
        ],
        [
          "memory x",
          "0"
        ],
        [
          "bus messages",
          "1"
        ]
      ]
    },
    {
      "note": "Core 0 writes `x = 1`. In **Exclusive** it knows nobody else has a copy, so it switches to **Modified** silently: no bus traffic at all.",
      "nodeColors": [
        {
          "id": "M0",
          "color": "orange"
        },
        {
          "id": "I1",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "E0",
          "to": "M0",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "I0",
          "text": "core 0"
        },
        {
          "id": "I1",
          "text": "core 1"
        }
      ],
      "vars": [
        [
          "core 0",
          "M"
        ],
        [
          "core 1",
          "I"
        ],
        [
          "bus",
          "none (silent upgrade)"
        ],
        [
          "memory x",
          "0"
        ],
        [
          "bus messages",
          "1"
        ]
      ]
    },
    {
      "note": "Core 1 reads and misses: **BusRd**. Core 0 holds the line **Modified**, so it supplies the data (also writing it back, memory = 1) and drops to **Shared**. Core 1 enters **Shared**.",
      "nodeColors": [
        {
          "id": "S0",
          "color": "blue"
        },
        {
          "id": "S1",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "M0",
          "to": "S0",
          "color": "red"
        },
        {
          "from": "I1",
          "to": "S1",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "I0",
          "text": "core 0"
        },
        {
          "id": "I1",
          "text": "core 1"
        }
      ],
      "vars": [
        [
          "core 0",
          "S"
        ],
        [
          "core 1",
          "S"
        ],
        [
          "bus",
          "BusRd, data from core 0"
        ],
        [
          "memory x",
          "1"
        ],
        [
          "bus messages",
          "2"
        ]
      ]
    },
    {
      "note": "Core 1 writes `x = 2` while **Shared**. It must first broadcast an **upgrade** (invalidate) so core 0's copy becomes **Invalid**; only then does it enter **Modified** and write.",
      "nodeColors": [
        {
          "id": "I0",
          "color": "blue"
        },
        {
          "id": "M1",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "S0",
          "to": "I0",
          "color": "red"
        },
        {
          "from": "S1",
          "to": "M1",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "I0",
          "text": "core 0"
        },
        {
          "id": "I1",
          "text": "core 1"
        }
      ],
      "vars": [
        [
          "core 0",
          "I"
        ],
        [
          "core 1",
          "M"
        ],
        [
          "bus",
          "BusUpgr: invalidate others"
        ],
        [
          "memory x",
          "1"
        ],
        [
          "bus messages",
          "3"
        ]
      ]
    },
    {
      "note": "Core 0 reads and misses: **BusRd**. Core 1 holds the line **Modified**, so it supplies the data (also writing it back, memory = 2) and drops to **Shared**. Core 0 enters **Shared**.",
      "nodeColors": [
        {
          "id": "S0",
          "color": "orange"
        },
        {
          "id": "S1",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "I0",
          "to": "S0",
          "color": "orange"
        },
        {
          "from": "M1",
          "to": "S1",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "I0",
          "text": "core 0"
        },
        {
          "id": "I1",
          "text": "core 1"
        }
      ],
      "vars": [
        [
          "core 0",
          "S"
        ],
        [
          "core 1",
          "S"
        ],
        [
          "bus",
          "BusRd, data from core 1"
        ],
        [
          "memory x",
          "2"
        ],
        [
          "bus messages",
          "4"
        ]
      ]
    },
    {
      "note": "Core 0 writes `x = 3` while **Shared**. It must first broadcast an **upgrade** (invalidate) so core 1's copy becomes **Invalid**; only then does it enter **Modified** and write.",
      "nodeColors": [
        {
          "id": "M0",
          "color": "orange"
        },
        {
          "id": "I1",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "S0",
          "to": "M0",
          "color": "orange"
        },
        {
          "from": "S1",
          "to": "I1",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "I0",
          "text": "core 0"
        },
        {
          "id": "I1",
          "text": "core 1"
        }
      ],
      "vars": [
        [
          "core 0",
          "M"
        ],
        [
          "core 1",
          "I"
        ],
        [
          "bus",
          "BusUpgr: invalidate others"
        ],
        [
          "memory x",
          "2"
        ],
        [
          "bus messages",
          "5"
        ]
      ]
    },
    {
      "note": "Core 1 writes `x = 4` without a copy: **read for ownership** (BusRdX). Core 0 supplies its Modified data and invalidates its copy; core 1 enters **Modified**.",
      "nodeColors": [
        {
          "id": "I0",
          "color": "blue"
        },
        {
          "id": "M1",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "M0",
          "to": "I0",
          "color": "red"
        },
        {
          "from": "I1",
          "to": "M1",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "I0",
          "text": "core 0"
        },
        {
          "id": "I1",
          "text": "core 1"
        }
      ],
      "vars": [
        [
          "core 0",
          "I"
        ],
        [
          "core 1",
          "M"
        ],
        [
          "bus",
          "BusRdX (RFO)"
        ],
        [
          "memory x",
          "2"
        ],
        [
          "bus messages",
          "6"
        ]
      ]
    },
    {
      "note": "Core 1 evicts the line. It is **Modified**, so it is written back first: memory = 4. Both cores are Invalid again, and memory is up to date.",
      "nodeColors": [
        {
          "id": "I0",
          "color": "blue"
        },
        {
          "id": "I1",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "M1",
          "to": "I1",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "I0",
          "text": "core 0"
        },
        {
          "id": "I1",
          "text": "core 1"
        }
      ],
      "vars": [
        [
          "core 0",
          "I"
        ],
        [
          "core 1",
          "I"
        ],
        [
          "bus",
          "write-back"
        ],
        [
          "memory x",
          "4"
        ],
        [
          "bus messages",
          "7"
        ]
      ]
    },
    {
      "note": "Summary: 7 bus transactions (including the final write-back) and 3 invalidations for 3 reads and 4 writes. Every hand-off of a written line between cores costs a message and a line transfer.",
      "nodeNotes": [
        {
          "id": "I0",
          "text": "core 0"
        },
        {
          "id": "I1",
          "text": "core 1"
        }
      ],
      "nodeColors": [
        {
          "id": "I0",
          "color": "gray"
        },
        {
          "id": "I1",
          "color": "gray"
        }
      ],
      "vars": [
        [
          "bus messages",
          "7"
        ],
        [
          "invalidations",
          "3"
        ]
      ]
    }
  ],
  "caption": "MESI for one line `x`, shared by two cores. Left diamond = core 0's state, right diamond = core 1's. Highlighted edges are the transitions just taken (red = forced by the other core)."
},
        {
          type: 'p',
          text: 'The **E** state is the clever part: a core that reads data nobody else has can later write it without any bus traffic, which makes private data, the common case, free. A write to an **I** line uses a **read for ownership (RFO)**: "send me the line and invalidate everyone else\'s copy" in one request. The same protocol as a C++ simulator:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <array>
#include <iostream>

enum class State { M, E, S, I };

char name(State s) { return "MESI"[static_cast<int>(s)]; }

struct Bus {
    int messages = 0, invalidations = 0, writebacks = 0;
};

// One cache line shared by two cores, kept coherent by MESI
// over a snooping bus. Core c's partner is core 1 - c.
struct Line {
    std::array<State, 2> state{State::I, State::I};
    Bus bus;

    void read(int c) {
        const int o = 1 - c;
        if (state[c] != State::I) return;             // hit
        ++bus.messages;                               // BusRd
        if (state[o] == State::M) ++bus.writebacks;   // o supplies
        if (state[o] != State::I) {
            state[o] = State::S;
            state[c] = State::S;
        } else {
            state[c] = State::E;                      // only copy
        }
    }

    void write(int c) {
        const int o = 1 - c;
        if (state[c] == State::M) return;             // hit
        if (state[c] == State::E) {                   // silent
            state[c] = State::M;
            return;
        }
        ++bus.messages;                // S: upgrade, I: RFO
        if (state[o] != State::I) ++bus.invalidations;
        state[o] = State::I;
        state[c] = State::M;
    }

    void evict(int c) {
        if (state[c] == State::M) {                   // write back
            ++bus.messages;
            ++bus.writebacks;
        }
        state[c] = State::I;
    }
};

int main() {
    Line x;
    auto show = [&x](const char* what) {
        std::cout << what << "  core0=" << name(x.state[0])
                  << " core1=" << name(x.state[1])
                  << "  messages=" << x.bus.messages << '\\n';
    };
    show("start         ");
    x.read(0);  show("core 0 reads  ");
    x.write(0); show("core 0 writes ");
    x.read(1);  show("core 1 reads  ");
    x.write(1); show("core 1 writes ");
    x.read(0);  show("core 0 reads  ");
    x.write(0); show("core 0 writes ");
    x.write(1); show("core 1 writes ");
    x.evict(1); show("core 1 evicts ");
    std::cout << "invalidations=" << x.bus.invalidations
              << " writebacks=" << x.bus.writebacks << "\\n\\n";

    // 1000 increments per core, taking turns. An atomic
    // increment asks for the line in M directly (an RFO).
    Line shared, mine0, mine1;
    for (int k = 0; k < 2000; ++k) {
        const int c = k % 2;
        shared.write(c);                          // same counter
        (c == 0 ? mine0 : mine1).write(c);        // own counter
    }
    std::cout << "one shared counter: " << shared.bus.messages
              << " messages, " << shared.bus.invalidations
              << " invalidations\\n";
    std::cout << "a counter per core: "
              << mine0.bus.messages + mine1.bus.messages
              << " messages, "
              << mine0.bus.invalidations + mine1.bus.invalidations
              << " invalidations\\n";
}`,
          output: "start           core0=I core1=I  messages=0\ncore 0 reads    core0=E core1=I  messages=1\ncore 0 writes   core0=M core1=I  messages=1\ncore 1 reads    core0=S core1=S  messages=2\ncore 1 writes   core0=I core1=M  messages=3\ncore 0 reads    core0=S core1=S  messages=4\ncore 0 writes   core0=M core1=I  messages=5\ncore 1 writes   core0=I core1=M  messages=6\ncore 1 evicts   core0=I core1=I  messages=7\ninvalidations=3 writebacks=3\n\none shared counter: 2000 messages, 1999 invalidations\na counter per core: 2 messages, 0 invalidations",
          annotations: [
            { lines: '18-29', text: 'A read miss broadcasts BusRd. A Modified owner supplies the data (and writes it back); any other holder drops to Shared. With no other copy, the line arrives Exclusive.' },
            { lines: '33-37', text: 'Write hits: M needs nothing, and E upgrades to M without telling anyone, because nobody else can have a copy.' },
            { lines: '38-41', text: 'S or I: one message (an upgrade, or an RFO that also fetches the data) invalidates the other copy before this core may write.' },
            { lines: '44-50', text: 'Evicting a dirty line costs a write-back; clean lines are dropped silently.' },
            { lines: '72-79', text: 'Two cores taking turns incrementing one counter versus each incrementing its own. An atomic increment requests ownership directly, so it is modelled as a write.' },
          ],
        },
        {
          type: 'deepdive',
          title: 'MOESI, MESIF and the real world',
          blocks: [
            {
              type: 'p',
              text: 'Real protocols add states. AMD uses **MOESI**: an **Owned** line is dirty *and* shared, so a Modified line that another core reads can be shared without first writing it back to memory; the owner answers future requests. Intel uses **MESIF**: among several Shared copies, one is designated **Forward** and is the only one that answers a request, so a read does not get a reply from every sharer. Both are refinements of MESI\'s core idea: one writer or many readers, enforced with invalidations.',
            },
            {
              type: 'p',
              text: 'Real implementations also have transient states (a line "waiting for data" or "waiting for invalidation acknowledgements") because messages take time on a mesh. Those details are why coherence protocols are among the most heavily formally verified parts of a CPU.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'numeric',
      prompt: 'Two cores use MESI with a snooping bus, and line `x` starts Invalid in both. The sequence is: core 0 reads, core 1 reads, core 0 writes, core 1 reads, core 1 writes. How many bus transactions does it generate? (Count each BusRd, upgrade or RFO as one; there are no evictions.)',
      answer: 5,
      unit: 'transactions',
      hint: 'Track both states after every step. Which steps are hits that need no bus at all?',
      explanation:
        'Core 0 reads: BusRd, I→E (1). Core 1 reads: BusRd, core 0 E→S, core 1 I→S (2). Core 0 writes in S: upgrade, core 1 S→I, core 0 S→M (3). Core 1 reads: BusRd, core 0 supplies the dirty line and drops M→S, core 1 I→S (4). Core 1 writes in S: upgrade, core 0 S→I (5). **Five** transactions for five accesses: when cores take turns writing a line, *every* access goes to the bus. Had core 0 done all its accesses first, its write in E would have been silent.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'order',
      prompt: 'Core 0 stores to a line it holds in **Shared** state; core 1 also holds it Shared. Put the steps in order.',
      lines: [
        'Core 0\'s store finds the line in its L1 in state S',
        'Core 0 sends an upgrade (invalidate) request for the line',
        'Core 1 marks its copy Invalid and acknowledges',
        'Core 0 changes its line to Modified',
        'Core 0 writes the new value into its cached line',
      ],
      linesAreCode: false,
      explanation:
        'The single-writer rule means the write cannot happen until every other copy is gone: request, invalidate, acknowledge, and only then M and the actual write. Meanwhile the store waits in the store buffer (next lessons), so the core can keep executing. If core 1 later reads the line, it misses and core 0 must supply the data: that round trip is the cost of sharing written data.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'What sharing a written line costs',
      blocks: [
        {
          type: 'p',
          text: 'Reading shared data is cheap: every core can hold the line in S and hit in its own L1 indefinitely. **Writing** shared data is the expensive part. Each time a different core writes, the line must be invalidated everywhere else and transferred to the writer, typically **20–40 ns** between cores in the same cluster and **70–100+ ns** across chiplets, clusters or sockets (it varies a lot by CPU). The simulator above counted it: one counter incremented by two cores in turns costs a bus transaction on *every* increment, while two private counters cost one each, ever.',
        },
        {
          type: 'p',
          text: 'Real threads behave the same way. Both versions below count the same thing; they differ only in how often they write shared memory:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <atomic>
#include <cstddef>
#include <iostream>
#include <thread>
#include <vector>

struct Enemy {
    float x, y;
};

// Count the enemies within 50 units of the origin, split over
// four threads, in two ways.
int main() {
    std::vector<Enemy> enemies;
    for (int i = 0; i < 400'000; ++i) {
        const float x = float(i % 200) - 100;
        enemies.push_back({x, float(i % 37) - 18});
    }
    const float r2 = 50.0f * 50.0f;
    const int workers = 4;
    const std::size_t chunk = enemies.size() / workers;

    // A: every hit increments one shared atomic. Each increment
    // needs the counter's line in M state on that core.
    std::atomic<long> sharedHits{0};
    {
        std::vector<std::jthread> pool;
        for (int w = 0; w < workers; ++w) {
            pool.emplace_back([&, w] {
                for (std::size_t i = w * chunk; i < (w + 1) * chunk;
                     ++i) {
                    const Enemy& e = enemies[i];
                    if (e.x * e.x + e.y * e.y < r2) {
                        sharedHits.fetch_add(
                            1, std::memory_order_relaxed);
                    }
                }
            });
        }
    }   // the jthreads join here

    // B: count in a local variable (a register), publish once.
    std::atomic<long> total{0};
    {
        std::vector<std::jthread> pool;
        for (int w = 0; w < workers; ++w) {
            pool.emplace_back([&, w] {
                long local = 0;
                for (std::size_t i = w * chunk; i < (w + 1) * chunk;
                     ++i) {
                    const Enemy& e = enemies[i];
                    local += e.x * e.x + e.y * e.y < r2;
                }
                total.fetch_add(local, std::memory_order_relaxed);
            });
        }
    }
    std::cout << "shared counter: " << sharedHits << " hits\\n";
    std::cout << "local counters: " << total << " hits\\n";
}`,
          output: "shared counter: 194756 hits\nlocal counters: 194756 hits",
          annotations: [
            { lines: '29-38', text: 'Version A: every hit is an atomic RMW on one shared line. With four cores hitting it, the line bounces from core to core, and each increment waits for the previous owner to give it up.' },
            { lines: '48-54', text: 'Version B: each thread counts in a local variable that lives in a register, then does one atomic add at the end. Four shared writes in total instead of almost 200,000.' },
            { lines: '58-59', text: 'Same answer either way. Only timings would differ, and timings are not printed because they depend on the machine and the moment; on typical desktop CPUs, version A is many times slower.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Rules of thumb for engine code',
          text: 'Share read-only data freely. Give each worker thread its own accumulators, queues and scratch buffers, and combine results once per job or once per frame. Avoid global counters updated from hot loops, including "harmless" statistics and reference counts (`std::shared_ptr` copies do an atomic increment on a shared control block). On consoles with two 4-core clusters, keep threads that exchange data heavily inside one cluster when the platform lets you choose affinity.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'The fourth C',
          text: 'Misses caused by another core\'s write are **coherence misses**, the fourth C next to compulsory, capacity and conflict. They are especially sneaky when the cores are not even writing the same variable, only the same cache line. That is **false sharing**, the next lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'fill',
      prompt: 'Complete the description of MESI states.',
      template: 'A line that only this cache holds and that matches memory is ___. Writing it moves it to ___ without any bus traffic. A line that other caches may also hold is ___, and writing it first requires invalidating the others, which leaves their copies ___.',
      templateIsCode: false,
      blanks: [{ answers: ['Exclusive', 'E'] }, { answers: ['Modified', 'M'] }, { answers: ['Shared', 'S'] }, { answers: ['Invalid', 'I'] }],
      wordBank: ['Exclusive', 'Modified', 'Shared', 'Invalid', 'Owned', 'Forward'],
      explanation:
        'Exclusive means "only copy, clean", so a write can switch it to Modified silently. Shared copies must be invalidated before a write, which keeps the single-writer rule. **Owned** (MOESI) and **Forward** (MESIF) are real states in AMD and Intel variants, but they describe dirty-shared lines and the designated responder among sharers, not the cases in this sentence.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'A job system tracks `std::atomic<int> jobsCompleted`, incremented by all 8 worker threads after every tiny job (thousands per frame). Profiling shows the increments are surprisingly expensive. What is the best fix?',
      options: [
        {
          text: 'Change the increments to `memory_order_relaxed`',
          why: 'Relaxed removes ordering costs, but each increment is still an atomic RMW that needs the line in M state on the incrementing core. The line still bounces between all 8 cores.',
        },
        {
          text: 'Give each worker its own counter (on its own cache line) and sum them when the frame ends',
          correct: true,
          why: 'Each counter stays in M state in its owner\'s cache, so increments are ordinary cache hits; the cross-core traffic happens once per frame.',
        },
        {
          text: 'Protect a plain `int` counter with a `std::mutex` instead',
          why: 'The mutex itself is a shared, written cache line, so it bounces just like the atomic, plus the costs of locking and possible sleeping.',
        },
        {
          text: 'Make `jobsCompleted` `volatile` so it is not cached',
          why: '`volatile` does not bypass the CPU cache or provide atomicity; it only stops the compiler from optimizing accesses. Concurrent `volatile` increments are a data race.',
        },
      ],
      explanation:
        'The cost is the **coherence traffic** of many cores writing one line, not the instruction itself. Per-thread data removes the sharing; combining once per frame keeps the total correct. Note the phrase "on its own cache line": per-thread counters packed next to each other in one array would still share lines. Why that matters, and how to fix it, is the next lesson.',
    },
  ],
  takeaways: [
    'When voltage stopped scaling (the end of Dennard scaling), clock speeds stalled and extra transistors went into more cores.',
    'Private write-back caches can hold different values for one location; a coherence protocol enforces single-writer/multiple-reader per line.',
    'Snooping broadcasts every miss; directories (and snoop filters in L3) track sharers so messages go only where needed, which scales.',
    'MESI: Modified (dirty, only copy), Exclusive (clean, only copy, silent upgrade to M), Shared (clean, maybe other copies), Invalid. Writes require invalidating other copies, often via a read for ownership.',
    'Coherence is per location; ordering between different locations is the memory consistency model.',
    'Reading shared data is cheap; writing it from several cores makes the line bounce at tens to 100+ ns per transfer. Accumulate per thread and combine once.',
  ],
  reading: [
    {
      title: 'MESI protocol',
      url: 'https://en.wikipedia.org/wiki/MESI_protocol',
      source: 'article',
      note: 'The states, transitions and bus operations of MESI, with a worked example.',
    },
    {
      title: 'Bus snooping',
      url: 'https://en.wikipedia.org/wiki/Bus_snooping',
      source: 'article',
      note: 'How snooping caches watch the bus, write-invalidate vs write-update, and snoop filters.',
    },
    {
      title: 'Cache coherence',
      url: 'https://en.wikipedia.org/wiki/Cache_coherence',
      source: 'article',
      note: 'Coherence definitions, snooping vs directory mechanisms, and links to the protocol variants.',
    },
    {
      title: 'What Every Programmer Should Know About Memory',
      url: 'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf',
      source: 'article',
      note: 'The sections on multi-processor support and multi-thread optimizations measure what coherence traffic costs.',
    },
  ],
};
