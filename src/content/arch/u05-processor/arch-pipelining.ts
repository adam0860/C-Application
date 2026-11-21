import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-pipelining',
  title: 'Pipelining',
  summary: 'Overlap instructions like loads of laundry: the classic five-stage pipeline, latency versus throughput, pipeline registers, and why ever-deeper pipelines stopped paying off.',
  minutes: 17,
  objectives: [
    'Explain pipelining with the laundry analogy and say precisely what it speeds up (throughput) and what it does not (latency)',
    'Name the five classic stages IF, ID, EX, MEM and WB and what hardware each uses',
    'Compute the cycles to run n instructions on a k-stage pipeline, and the pipelined clock period from stage latencies',
    'Explain what pipeline registers hold and why control signals travel with the instruction',
    'Weigh the trade-off of deeper pipelines: faster clocks against register overhead and costlier hazards',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Laundry: the whole idea in one picture',
      blocks: [
        {
          type: 'p',
          text: 'You have four loads of laundry. Each goes through four steps: wash, dry, fold, put away, 30 minutes each. Done one load at a time, that is 4 × 2 hours = **8 hours**, and at any moment three of your four "machines" (washer, dryer, folding table, closet) sit idle.',
        },
        {
          type: 'p',
          text: 'The obvious fix: as soon as load A moves to the dryer, start load B in the washer. Step through it:',
        },
        {
          type: 'algo',
          view: 'array',
          interval: 1200,
          frames: [
            {
              note: 'Four loads of laundry, four machines, 30 minutes per step. Each frame is one 30-minute slot.',
              array: ['–', '–', '–', '–'],
              pointers: [
                { index: 0, label: 'wash', color: 'gray' },
                { index: 1, label: 'dry', color: 'gray' },
                { index: 2, label: 'fold', color: 'gray' },
                { index: 3, label: 'store', color: 'gray' },
              ],
              vars: [
                ['time', '0:00'],
                ['loads done', '0'],
              ],
            },
            {
              note: 'Load A goes in the washer. The other machines sit idle: the pipeline is **filling**.',
              array: ['A', '–', '–', '–'],
              marks: [
                { index: 0, color: 'orange' },
              ],
              pointers: [
                { index: 0, label: 'wash', color: 'gray' },
                { index: 1, label: 'dry', color: 'gray' },
                { index: 2, label: 'fold', color: 'gray' },
                { index: 3, label: 'store', color: 'gray' },
              ],
              vars: [
                ['time', '0:30'],
                ['loads done', '0'],
              ],
            },
            {
              note: '2 machines busy, each working on a different load.',
              array: ['B', 'A', '–', '–'],
              marks: [
                { index: 0, color: 'orange' },
                { index: 1, color: 'orange' },
              ],
              pointers: [
                { index: 0, label: 'wash', color: 'gray' },
                { index: 1, label: 'dry', color: 'gray' },
                { index: 2, label: 'fold', color: 'gray' },
                { index: 3, label: 'store', color: 'gray' },
              ],
              vars: [
                ['time', '1:00'],
                ['loads done', '0'],
              ],
            },
            {
              note: '3 machines busy, each working on a different load.',
              array: ['C', 'B', 'A', '–'],
              marks: [
                { index: 0, color: 'orange' },
                { index: 1, color: 'orange' },
                { index: 2, color: 'orange' },
              ],
              pointers: [
                { index: 0, label: 'wash', color: 'gray' },
                { index: 1, label: 'dry', color: 'gray' },
                { index: 2, label: 'fold', color: 'gray' },
                { index: 3, label: 'store', color: 'gray' },
              ],
              vars: [
                ['time', '1:30'],
                ['loads done', '0'],
              ],
            },
            {
              note: 'All four machines busy at once. Load A is stored: it took 2 hours, exactly as long as without pipelining.',
              array: ['D', 'C', 'B', 'A'],
              marks: [
                { index: 0, color: 'orange' },
                { index: 1, color: 'orange' },
                { index: 2, color: 'orange' },
                { index: 3, color: 'green' },
              ],
              pointers: [
                { index: 0, label: 'wash', color: 'gray' },
                { index: 1, label: 'dry', color: 'gray' },
                { index: 2, label: 'fold', color: 'gray' },
                { index: 3, label: 'store', color: 'gray' },
              ],
              vars: [
                ['time', '2:00'],
                ['loads done', '1'],
              ],
            },
            {
              note: 'The pipeline is **draining**. 3 machines still busy.',
              array: ['–', 'D', 'C', 'B'],
              marks: [
                { index: 1, color: 'orange' },
                { index: 2, color: 'orange' },
                { index: 3, color: 'green' },
              ],
              pointers: [
                { index: 0, label: 'wash', color: 'gray' },
                { index: 1, label: 'dry', color: 'gray' },
                { index: 2, label: 'fold', color: 'gray' },
                { index: 3, label: 'store', color: 'gray' },
              ],
              vars: [
                ['time', '2:30'],
                ['loads done', '2'],
              ],
            },
            {
              note: 'The pipeline is **draining**. 2 machines still busy.',
              array: ['–', '–', 'D', 'C'],
              marks: [
                { index: 2, color: 'orange' },
                { index: 3, color: 'green' },
              ],
              pointers: [
                { index: 0, label: 'wash', color: 'gray' },
                { index: 1, label: 'dry', color: 'gray' },
                { index: 2, label: 'fold', color: 'gray' },
                { index: 3, label: 'store', color: 'gray' },
              ],
              vars: [
                ['time', '3:00'],
                ['loads done', '3'],
              ],
            },
            {
              note: 'Done at **3:30**: 3.5 hours instead of 8. Each load still took 2 hours; a load now *finishes* every 30 minutes.',
              array: ['–', '–', '–', 'D'],
              marks: [
                { index: 3, color: 'green' },
              ],
              pointers: [
                { index: 0, label: 'wash', color: 'gray' },
                { index: 1, label: 'dry', color: 'gray' },
                { index: 2, label: 'fold', color: 'gray' },
                { index: 3, label: 'store', color: 'gray' },
              ],
              vars: [
                ['time', '3:30'],
                ['loads done', '4'],
              ],
            },
          ],
          caption: 'Pipelined laundry: each cell is a machine, showing which load it holds in that half-hour.',
        },
        {
          type: 'p',
          text: 'All four loads are done in **3.5 hours**. Nothing got faster: every load still spends 2 hours from washer to closet. What changed is that the machines work in parallel on different loads, so once the pipeline is full, a load *finishes* every 30 minutes. That is the entire idea of an [[instruction-pipeline]]: split each instruction into stages and overlap the stages of consecutive instructions.',
        },
        {
          type: 'definition',
          term: 'Latency vs. throughput',
          text: '**Latency** is how long one item takes from start to finish (2 hours per load). **Throughput** is how many items finish per unit of time (one load per 30 minutes once full). Pipelining raises throughput; it does not lower latency, and in real hardware it raises latency slightly.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Where the analogy goes further',
          text: 'The analogy holds in detail. Filling and draining cost time at the start and end. The slowest step paces everything: if drying took 40 minutes, a load would finish only every 40 minutes. And if load B needs something from load A (say, a sock that is still in the dryer), B has to wait, which is a hazard, the subject of the next lesson.',
        },
      ],
    },
    {
      kind: 'numeric',
      prompt: 'Same four steps, 30 minutes each, but now **10** loads, pipelined as in the animation. How many minutes until the last load is put away?',
      answer: 390,
      unit: 'minutes',
      label: 'Total time =',
      hint: 'The first load takes 4 slots. After that, one more load finishes every slot.',
      explanation: 'The first load finishes after 4 slots; each of the other 9 finishes one slot after the previous: (4 + 9) × 30 = 390 minutes, 6.5 hours. Done one at a time it would take 10 × 120 = 1200 minutes. The speedup, 1200 / 390 ≈ 3.1, approaches 4 (the number of stages) as the number of loads grows, because the fill time is paid only once.',
    },
    {
      kind: 'concept',
      title: 'The classic five-stage pipeline',
      blocks: [
        {
          type: 'p',
          text: 'Apply the same trick to the single-cycle datapath from the last lesson. Its five steps become five **stages**, each taking one (short) clock cycle:',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 560 210">
<rect x="8" y="60" width="82" height="80" rx="4" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="8" y="60" width="82" height="80" rx="4" fill="none" class="s-blue" stroke-width="1.6"/>
<text x="49" y="88" font-size="16" text-anchor="middle" font-weight="800">IF</text>
<text x="49" y="108" font-size="10" text-anchor="middle">Instruction</text>
<text x="49" y="121" font-size="10" text-anchor="middle">fetch</text>
<rect x="100" y="50" width="10" height="100" rx="2" class="f-gray" fill-opacity="0.12" stroke="none"/>
<rect x="100" y="50" width="10" height="100" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
<polyline points="90,100 95.2,100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M100,100 L94,102.7 L94,97.3 Z" fill="currentColor" stroke="none"/>
<polyline points="110,100 115.2,100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M120,100 L114,102.7 L114,97.3 Z" fill="currentColor" stroke="none"/>
<text x="105" y="44" font-size="9" text-anchor="middle" font-weight="600">IF/ID</text>
<rect x="120" y="60" width="82" height="80" rx="4" class="f-purple" fill-opacity="0.12" stroke="none"/>
<rect x="120" y="60" width="82" height="80" rx="4" fill="none" class="s-purple" stroke-width="1.6"/>
<text x="161" y="88" font-size="16" text-anchor="middle" font-weight="800">ID</text>
<text x="161" y="108" font-size="10" text-anchor="middle">Decode +</text>
<text x="161" y="121" font-size="10" text-anchor="middle">reg read</text>
<rect x="212" y="50" width="10" height="100" rx="2" class="f-gray" fill-opacity="0.12" stroke="none"/>
<rect x="212" y="50" width="10" height="100" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
<polyline points="202,100 207.2,100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M212,100 L206,102.7 L206,97.3 Z" fill="currentColor" stroke="none"/>
<polyline points="222,100 227.2,100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M232,100 L226,102.7 L226,97.3 Z" fill="currentColor" stroke="none"/>
<text x="217" y="44" font-size="9" text-anchor="middle" font-weight="600">ID/EX</text>
<rect x="232" y="60" width="82" height="80" rx="4" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="232" y="60" width="82" height="80" rx="4" fill="none" class="s-orange" stroke-width="1.6"/>
<text x="273" y="88" font-size="16" text-anchor="middle" font-weight="800">EX</text>
<text x="273" y="108" font-size="10" text-anchor="middle">Execute</text>
<text x="273" y="121" font-size="10" text-anchor="middle">(ALU)</text>
<rect x="324" y="50" width="10" height="100" rx="2" class="f-gray" fill-opacity="0.12" stroke="none"/>
<rect x="324" y="50" width="10" height="100" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
<polyline points="314,100 319.2,100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M324,100 L318,102.7 L318,97.3 Z" fill="currentColor" stroke="none"/>
<polyline points="334,100 339.2,100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M344,100 L338,102.7 L338,97.3 Z" fill="currentColor" stroke="none"/>
<text x="329" y="44" font-size="9" text-anchor="middle" font-weight="600">EX/MEM</text>
<rect x="344" y="60" width="82" height="80" rx="4" class="f-teal" fill-opacity="0.12" stroke="none"/>
<rect x="344" y="60" width="82" height="80" rx="4" fill="none" class="s-teal" stroke-width="1.6"/>
<text x="385" y="88" font-size="16" text-anchor="middle" font-weight="800">MEM</text>
<text x="385" y="108" font-size="10" text-anchor="middle">Memory</text>
<text x="385" y="121" font-size="10" text-anchor="middle">access</text>
<rect x="436" y="50" width="10" height="100" rx="2" class="f-gray" fill-opacity="0.12" stroke="none"/>
<rect x="436" y="50" width="10" height="100" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
<polyline points="426,100 431.2,100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M436,100 L430,102.7 L430,97.3 Z" fill="currentColor" stroke="none"/>
<polyline points="446,100 451.2,100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M456,100 L450,102.7 L450,97.3 Z" fill="currentColor" stroke="none"/>
<text x="441" y="44" font-size="9" text-anchor="middle" font-weight="600">MEM/WB</text>
<rect x="456" y="60" width="82" height="80" rx="4" class="f-green" fill-opacity="0.12" stroke="none"/>
<rect x="456" y="60" width="82" height="80" rx="4" fill="none" class="s-green" stroke-width="1.6"/>
<text x="497" y="88" font-size="16" text-anchor="middle" font-weight="800">WB</text>
<text x="497" y="108" font-size="10" text-anchor="middle">Write</text>
<text x="497" y="121" font-size="10" text-anchor="middle">back</text>
<polyline points="8,178 552,178" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round" stroke-dasharray="4 3"/>
<text x="10" y="196" font-size="10" text-anchor="start" font-style="italic">clock: every pipeline register captures its inputs on the same edge</text>
<polyline points="105,178 105,156" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
<path d="M105,152 L107.2,157 L102.8,157 Z" fill="currentColor" stroke="none"/>
<polyline points="217,178 217,156" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
<path d="M217,152 L219.2,157 L214.8,157 Z" fill="currentColor" stroke="none"/>
<polyline points="329,178 329,156" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
<path d="M329,152 L331.2,157 L326.8,157 Z" fill="currentColor" stroke="none"/>
<polyline points="441,178 441,156" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
<path d="M441,152 L443.2,157 L438.8,157 Z" fill="currentColor" stroke="none"/>
<polyline points="497,60 497,20 171,20 171,52.4" fill="none" class="s-green" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M171,58 L167.8,51 L174.2,51 Z" class="f-green" stroke="none"/>
<text x="330" y="15" font-size="10" text-anchor="middle" class="t-green">WB writes the register file that ID reads</text>
</svg>`,
          alt: 'Five pipeline stages IF, ID, EX, MEM, WB in a row, separated by pipeline registers IF/ID, ID/EX, EX/MEM and MEM/WB, all clocked together; an arrow shows WB writing the register file that ID reads.',
          caption: 'Every [[pipeline-register]] captures its stage\'s results at the same clock edge and hands them to the next stage.',
        },
        {
          type: 'table',
          headers: ['Stage', 'Work', 'Hardware it uses'],
          rows: [
            [
              '**IF** instruction fetch',
              'Read the instruction at PC; compute PC + 4',
              'Instruction memory, PC adder',
            ],
            [
              '**ID** instruction decode',
              'Decode; read `rs1`, `rs2`; generate the immediate',
              'Control, register file (read ports), immediate generator',
            ],
            [
              '**EX** execute',
              'ALU operation, address calculation or branch comparison',
              'ALU, ALUSrc mux, branch adder',
            ],
            ['**MEM** memory access', 'Loads read and stores write data memory', 'Data memory'],
            [
              '**WB** write back',
              'Write the result into `rd`',
              'MemtoReg mux, register file (write port)',
            ],
          ],
        },
        {
          type: 'p',
          text: 'Because each stage uses different hardware, five instructions can be in flight at once: one being fetched, one decoded, one in the ALU, one in memory and one writing back. The register file is the one block used by two stages (ID reads, WB writes). The classic design writes in the first half of the cycle and reads in the second half, so a value written in WB can be read by ID in the same cycle.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why this ISA pipelines so cleanly',
          text: 'RISC-V (like MIPS before it) was designed for exactly this pipeline. All instructions are **the same length**, so fetch never has to decode to find the next one. **Register fields sit in fixed positions**, so ID can read registers while still decoding. Only loads and stores touch memory, so each instruction uses MEM at most once, always **after** the ALU has computed its address. x86, by contrast, has instructions from 1 to 15 bytes long that can read memory, compute and write memory in one instruction; modern x86 cores therefore translate them into RISC-like [[micro-op|micro-ops]] first and pipeline those.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Put the five pipeline stages of the classic RISC pipeline in order.',
      linesAreCode: false,
      lines: [
        'IF: fetch the instruction at PC',
        'ID: decode and read the source registers',
        'EX: compute in the ALU (result, address or comparison)',
        'MEM: read or write data memory',
        'WB: write the result into the destination register',
      ],
      explanation: 'The order follows the data: you need the instruction before decoding it, its register values before computing, the computed address before touching memory, and the loaded value before writing it back. Each instruction visits each stage exactly once, in this order, which is what makes the pipeline regular enough to overlap.',
    },
    {
      kind: 'concept',
      title: 'Watching the pipeline fill',
      blocks: [
        {
          type: 'p',
          text: 'Here five independent instructions go through the pipeline. Rows are instructions, columns are clock cycles, and each cell shows which stage an instruction occupies in that cycle. Step through it cycle by cycle:',
        },
        {
          type: 'algo',
          view: 'graph',
          width: 452,
          height: 278,
          nodes: [
            { id: 'c1', x: 70, y: 26, label: '1' },
            { id: 'c2', x: 114, y: 26, label: '2' },
            { id: 'c3', x: 158, y: 26, label: '3' },
            { id: 'c4', x: 202, y: 26, label: '4' },
            { id: 'c5', x: 246, y: 26, label: '5' },
            { id: 'c6', x: 290, y: 26, label: '6' },
            { id: 'c7', x: 334, y: 26, label: '7' },
            { id: 'c8', x: 378, y: 26, label: '8' },
            { id: 'c9', x: 422, y: 26, label: '9' },
            { id: 'r0', x: 26, y: 70, label: 'I1' },
            { id: 'r1', x: 26, y: 114, label: 'I2' },
            { id: 'r2', x: 26, y: 158, label: 'I3' },
            { id: 'r3', x: 26, y: 202, label: 'I4' },
            { id: 'r4', x: 26, y: 246, label: 'I5' },
            { id: 'n0_1', x: 70, y: 70, label: 'IF' },
            { id: 'n0_2', x: 114, y: 70, label: 'ID' },
            { id: 'n0_3', x: 158, y: 70, label: 'EX' },
            { id: 'n0_4', x: 202, y: 70, label: 'Mem' },
            { id: 'n0_5', x: 246, y: 70, label: 'WB' },
            { id: 'n1_2', x: 114, y: 114, label: 'IF' },
            { id: 'n1_3', x: 158, y: 114, label: 'ID' },
            { id: 'n1_4', x: 202, y: 114, label: 'EX' },
            { id: 'n1_5', x: 246, y: 114, label: 'Mem' },
            { id: 'n1_6', x: 290, y: 114, label: 'WB' },
            { id: 'n2_3', x: 158, y: 158, label: 'IF' },
            { id: 'n2_4', x: 202, y: 158, label: 'ID' },
            { id: 'n2_5', x: 246, y: 158, label: 'EX' },
            { id: 'n2_6', x: 290, y: 158, label: 'Mem' },
            { id: 'n2_7', x: 334, y: 158, label: 'WB' },
            { id: 'n3_4', x: 202, y: 202, label: 'IF' },
            { id: 'n3_5', x: 246, y: 202, label: 'ID' },
            { id: 'n3_6', x: 290, y: 202, label: 'EX' },
            { id: 'n3_7', x: 334, y: 202, label: 'Mem' },
            { id: 'n3_8', x: 378, y: 202, label: 'WB' },
            { id: 'n4_5', x: 246, y: 246, label: 'IF' },
            { id: 'n4_6', x: 290, y: 246, label: 'ID' },
            { id: 'n4_7', x: 334, y: 246, label: 'EX' },
            { id: 'n4_8', x: 378, y: 246, label: 'Mem' },
            { id: 'n4_9', x: 422, y: 246, label: 'WB' },
          ],
          edges: [],
          code: `add  x1, x2, x3
sub  x4, x5, x6
lw   x7, 0(x8)
or   x9, x10, x11
sw   x12, 4(x8)`,
          lang: 'text',
          interval: 1100,
          frames: [
            {
              note: 'Five **independent** instructions enter a 5-stage pipeline, one per cycle. Step through the clock.',
              hidden: [
                'c1',
                'c2',
                'c3',
                'c4',
                'c5',
                'c6',
                'c7',
                'c8',
                'c9',
                'n0_1',
                'n0_2',
                'n0_3',
                'n0_4',
                'n0_5',
                'n1_2',
                'n1_3',
                'n1_4',
                'n1_5',
                'n1_6',
                'n2_3',
                'n2_4',
                'n2_5',
                'n2_6',
                'n2_7',
                'n3_4',
                'n3_5',
                'n3_6',
                'n3_7',
                'n3_8',
                'n4_5',
                'n4_6',
                'n4_7',
                'n4_8',
                'n4_9',
              ],
              vars: [
                ['cycle', '0'],
                ['finished', '0'],
              ],
            },
            {
              note: 'Cycle 1: I1 enters IF.',
              hidden: [
                'c2',
                'c3',
                'c4',
                'c5',
                'c6',
                'c7',
                'c8',
                'c9',
                'n0_2',
                'n0_3',
                'n0_4',
                'n0_5',
                'n1_2',
                'n1_3',
                'n1_4',
                'n1_5',
                'n1_6',
                'n2_3',
                'n2_4',
                'n2_5',
                'n2_6',
                'n2_7',
                'n3_4',
                'n3_5',
                'n3_6',
                'n3_7',
                'n3_8',
                'n4_5',
                'n4_6',
                'n4_7',
                'n4_8',
                'n4_9',
              ],
              nodeColors: [
                { id: 'c1', color: 'orange' },
                { id: 'n0_1', color: 'orange' },
              ],
              lines: [1],
              vars: [
                ['cycle', '1'],
                ['finished', '0'],
              ],
            },
            {
              note: 'Cycle 2: 2 instructions in flight, each in a different stage.',
              hidden: [
                'c3',
                'c4',
                'c5',
                'c6',
                'c7',
                'c8',
                'c9',
                'n0_3',
                'n0_4',
                'n0_5',
                'n1_3',
                'n1_4',
                'n1_5',
                'n1_6',
                'n2_3',
                'n2_4',
                'n2_5',
                'n2_6',
                'n2_7',
                'n3_4',
                'n3_5',
                'n3_6',
                'n3_7',
                'n3_8',
                'n4_5',
                'n4_6',
                'n4_7',
                'n4_8',
                'n4_9',
              ],
              nodeColors: [
                { id: 'c2', color: 'orange' },
                { id: 'n0_2', color: 'orange' },
                { id: 'n1_2', color: 'orange' },
              ],
              lines: [1, 2],
              vars: [
                ['cycle', '2'],
                ['finished', '0'],
              ],
            },
            {
              note: 'Cycle 3: 3 instructions in flight, each in a different stage.',
              hidden: [
                'c4',
                'c5',
                'c6',
                'c7',
                'c8',
                'c9',
                'n0_4',
                'n0_5',
                'n1_4',
                'n1_5',
                'n1_6',
                'n2_4',
                'n2_5',
                'n2_6',
                'n2_7',
                'n3_4',
                'n3_5',
                'n3_6',
                'n3_7',
                'n3_8',
                'n4_5',
                'n4_6',
                'n4_7',
                'n4_8',
                'n4_9',
              ],
              nodeColors: [
                { id: 'c3', color: 'orange' },
                { id: 'n0_3', color: 'orange' },
                { id: 'n1_3', color: 'orange' },
                { id: 'n2_3', color: 'orange' },
              ],
              lines: [1, 2, 3],
              vars: [
                ['cycle', '3'],
                ['finished', '0'],
              ],
            },
            {
              note: 'Cycle 4: 4 instructions in flight, each in a different stage.',
              hidden: [
                'c5',
                'c6',
                'c7',
                'c8',
                'c9',
                'n0_5',
                'n1_5',
                'n1_6',
                'n2_5',
                'n2_6',
                'n2_7',
                'n3_5',
                'n3_6',
                'n3_7',
                'n3_8',
                'n4_5',
                'n4_6',
                'n4_7',
                'n4_8',
                'n4_9',
              ],
              nodeColors: [
                { id: 'c4', color: 'orange' },
                { id: 'n0_4', color: 'orange' },
                { id: 'n1_4', color: 'orange' },
                { id: 'n2_4', color: 'orange' },
                { id: 'n3_4', color: 'orange' },
              ],
              lines: [1, 2, 3, 4],
              vars: [
                ['cycle', '4'],
                ['finished', '0'],
              ],
            },
            {
              note: 'I1 writes back and leaves the pipeline. From now on one instruction finishes every cycle.',
              hidden: [
                'c6',
                'c7',
                'c8',
                'c9',
                'n1_6',
                'n2_6',
                'n2_7',
                'n3_6',
                'n3_7',
                'n3_8',
                'n4_6',
                'n4_7',
                'n4_8',
                'n4_9',
              ],
              nodeColors: [
                { id: 'c5', color: 'orange' },
                { id: 'n0_5', color: 'green' },
                { id: 'n1_5', color: 'orange' },
                { id: 'n2_5', color: 'orange' },
                { id: 'n3_5', color: 'orange' },
                { id: 'n4_5', color: 'orange' },
              ],
              lines: [1, 2, 3, 4, 5],
              vars: [
                ['cycle', '5'],
                ['finished', '1'],
              ],
            },
            {
              note: 'I2 writes back and leaves the pipeline.',
              hidden: ['c7', 'c8', 'c9', 'n2_7', 'n3_7', 'n3_8', 'n4_7', 'n4_8', 'n4_9'],
              nodeColors: [
                { id: 'c6', color: 'orange' },
                { id: 'n1_6', color: 'green' },
                { id: 'n2_6', color: 'orange' },
                { id: 'n3_6', color: 'orange' },
                { id: 'n4_6', color: 'orange' },
              ],
              lines: [2, 3, 4, 5],
              vars: [
                ['cycle', '6'],
                ['finished', '2'],
              ],
            },
            {
              note: 'I3 writes back and leaves the pipeline.',
              hidden: ['c8', 'c9', 'n3_8', 'n4_8', 'n4_9'],
              nodeColors: [
                { id: 'c7', color: 'orange' },
                { id: 'n2_7', color: 'green' },
                { id: 'n3_7', color: 'orange' },
                { id: 'n4_7', color: 'orange' },
              ],
              lines: [3, 4, 5],
              vars: [
                ['cycle', '7'],
                ['finished', '3'],
              ],
            },
            {
              note: 'I4 writes back and leaves the pipeline.',
              hidden: ['c9', 'n4_9'],
              nodeColors: [
                { id: 'c8', color: 'orange' },
                { id: 'n3_8', color: 'green' },
                { id: 'n4_8', color: 'orange' },
              ],
              lines: [4, 5],
              vars: [
                ['cycle', '8'],
                ['finished', '4'],
              ],
            },
            {
              note: 'Done in **9 cycles** = 5 stages + 4 more instructions. Unpipelined, the same work takes 5 × 5 = 25 stage-times.',
              hidden: [],
              nodeColors: [
                { id: 'c9', color: 'orange' },
                { id: 'n4_9', color: 'green' },
              ],
              lines: [5],
              vars: [
                ['cycle', '9'],
                ['finished', '5'],
              ],
            },
          ],
          caption: 'Five independent instructions. Rows are instructions, columns are clock cycles; each cell is the stage an instruction occupies in that cycle.',
        },
        {
          type: 'p',
          text: 'The diagonal shape is the signature of a pipeline. The first instruction needs all 5 cycles; after that, one instruction completes **every cycle**. For n instructions on a k-stage pipeline with no stalls:',
        },
        {
          type: 'code',
          title: 'Cycle count of an ideal pipeline',
          lang: 'text',
          code: `cycles = k + (n - 1)

n = 5      →        9 cycles   (CPI 1.8)
n = 100    →      104 cycles   (CPI 1.04)
n = 10^6   →  1000004 cycles   (CPI ≈ 1.000004)`,
          annotations: [
            {
              lines: 1,
              text: 'k cycles for the first instruction to fill the pipe, then one more cycle per remaining instruction.',
            },
            {
              lines: '3-5',
              text: 'Dividing cycles by n gives the [[cpi]]: it approaches 1 as the fill time is spread over more instructions.',
            },
          ],
        },
        {
          type: 'p',
          text: 'So the **ideal CPI of a pipeline is 1**, the same as the single-cycle design, but each cycle is now about a fifth as long. That is where the speedup comes from: same instructions, same CPI, much shorter clock. Every hazard in the next lesson pushes CPI back above 1, so a large part of processor design is the fight to keep it close to 1 (and later, with superscalar cores, below 1).',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'In practice',
          text: 'Hot loops in games run for millions of iterations, so the fill and drain cost of a pipeline is irrelevant there. What matters is anything that interrupts the steady flow: dependences, mispredicted branches and cache misses. That is why profilers like VTune and AMD uProf report stall reasons, not just time.',
        },
      ],
    },
    {
      kind: 'numeric',
      prompt: 'How many clock cycles does an ideal (stall-free) 5-stage pipeline need to execute 100 instructions?',
      answer: 104,
      unit: 'cycles',
      label: 'Cycles =',
      explanation: 'k + n − 1 = 5 + 100 − 1 = 104. The first instruction takes 5 cycles to come out of WB; each of the remaining 99 comes out one cycle later. Without pipelining (five short cycles per instruction, not overlapped) it would be 500 cycles, nearly 5× more.',
    },
    {
      kind: 'concept',
      title: 'Pipeline registers and the new clock period',
      blocks: [
        {
          type: 'p',
          text: 'Between every pair of stages sits a pipeline register: IF/ID, ID/EX, EX/MEM, MEM/WB. At each clock edge, every stage\'s results are captured and passed on, and every stage starts on the next instruction. Without them, the instruction being fetched would overwrite the signals the instruction in EX is still using.',
        },
        {
          type: 'p',
          text: 'They carry more than data. The **destination register number** and the **control signals** (RegWrite, MemtoReg, MemWrite...) are generated in ID and then *travel with the instruction* through ID/EX, EX/MEM and MEM/WB. When an `add` reaches WB, it must write `rd` from its own MEM/WB register, not the `rd` field of whatever instruction is currently in ID. Mixing those up is a classic bug in student pipeline designs: the result goes into the wrong register.',
        },
        { type: 'heading', text: 'How fast can it go?' },
        {
          type: 'p',
          text: 'The clock period is now set by the **slowest stage**, plus the overhead of the pipeline register itself. With the textbook latencies from the last lesson (instruction memory 200 ps, register read 100, ALU 200, data memory 200, register write 100) and ignoring register overhead:',
        },
        {
          type: 'table',
          headers: ['Measure', 'Single-cycle', '5-stage pipeline'],
          rows: [
            ['Clock period', '800 ps (slowest instruction)', '200 ps (slowest stage)'],
            ['Latency of one instruction', '800 ps', '5 × 200 = **1000 ps**'],
            ['Throughput (steady state)', '1 instruction / 800 ps', '1 instruction / 200 ps'],
            ['Speedup on a long program', '1×', '**4×**'],
          ],
        },
        {
          type: 'p',
          text: 'Two lessons hide in that table. The latency of a single instruction got **worse** (1000 ps instead of 800), because the 100 ps register-file stages are padded to a full 200 ps slot. And the speedup is 4×, not 5×, for the same reason: the stages are **unbalanced**. Real designs also pay 10 to 20% of each cycle as pipeline-register overhead (setup time, clock-to-output delay, clock skew). Balancing stages is a major part of real CPU design.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not 5× faster?',
          text: 'The ideal speedup of a k-stage pipeline is k, but only if the work divides into k equal parts with zero overhead. The clock waits for the slowest stage, so any imbalance is wasted time in every other stage, every cycle. That is the same "slowest one sets the pace" rule as the single-cycle design, moved from instructions to stages.',
        },
      ],
    },
    {
      kind: 'numeric',
      prompt: 'A 5-stage pipeline has stage latencies IF 250 ps, ID 150 ps, EX 200 ps, MEM 300 ps, WB 100 ps, and each pipeline register adds 20 ps. What is the clock period?',
      answer: 320,
      unit: 'ps',
      label: 'Clock period =',
      hint: 'Slowest stage, plus the register overhead.',
      explanation: 'The slowest stage is MEM at 300 ps; adding 20 ps of register overhead gives 320 ps (about 3.1 GHz). The unpipelined version would take 250 + 150 + 200 + 300 + 100 = 1000 ps per instruction, so the long-run speedup is 1000 / 320 ≈ 3.1×, well short of 5× because of the imbalance (MEM is twice as slow as ID) and the overhead.',
    },
    {
      kind: 'concept',
      title: 'Deeper pipelines: faster clocks, bigger penalties',
      blocks: [
        {
          type: 'p',
          text: 'If five stages give about 4×, why not 50 stages? Each stage would hold a tenth as much logic, so the clock could run several times faster. Two forces push back. First, register overhead does not shrink: cut the logic per stage small enough and the overhead dominates the cycle. Second, **hazards get more expensive**. A mispredicted branch throws away all the work in the stages between fetch and the point where the branch is resolved; the more stages, the more work lost.',
        },
        {
          type: 'p',
          text: 'This toy model makes the trade-off concrete. Total logic per instruction is 160 gate delays, each pipeline register costs 3, and 5% of instructions cause a pipeline flush that wastes about one cycle per stage:',
        },
        {
          type: 'code',
          title: 'pipeline_depth.cpp',
          code: `#include <format>
#include <iostream>

// Toy model of pipeline depth. Times are in gate delays.
int main() {
    const double logic = 160.0;    // logic in one instruction's path
    const double overhead = 3.0;   // pipeline-register cost per stage
    const double flushRate = 0.05; // instructions that flush the pipe

    std::cout << "stages  cycle  clock  CPI   time/instr\\n";
    for (int k : {1, 5, 10, 20, 30, 40, 60}) {
        double cycle = logic / k + overhead;  // stage + register
        double cpi = 1.0 + flushRate * k;     // flush wastes ~k cycles
        double speed = (logic + overhead) / cycle;
        std::cout << std::format("{:6} {:6.1f} {:5.1f}x {:4.2f} {:9.1f}\\n",
                                 k, cycle, speed, cpi, cycle * cpi);
    }
}`,
          runnable: true,
          output: `stages  cycle  clock  CPI   time/instr
     1  163.0   1.0x 1.05     171.2
     5   35.0   4.7x 1.25      43.8
    10   19.0   8.6x 1.50      28.5
    20   11.0  14.8x 2.00      22.0
    30    8.3  19.6x 2.50      20.8
    40    7.0  23.3x 3.00      21.0
    60    5.7  28.8x 4.00      22.7`,
          annotations: [
            {
              lines: 6,
              text: 'All the logic one instruction passes through. Splitting it into k stages gives each stage `logic / k`.',
            },
            {
              lines: 7,
              text: 'Each pipeline register adds a fixed delay that does not shrink as stages get shorter.',
            },
            {
              lines: 8,
              text: 'A crude stand-in for every hazard whose cost grows with depth: mispredicted branches, mainly.',
            },
            {
              lines: 12,
              text: 'The cycle is one stage of logic plus one register.',
            },
            {
              lines: 13,
              text: 'With k stages, a flush throws away about k cycles of work, so CPI grows linearly with depth.',
            },
            {
              lines: 16,
              text: '"time/instr" = cycle × CPI is what you actually feel. It falls fast at first, flattens around 20 to 30 stages, then rises.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Going from 1 to 10 stages makes each instruction 6× faster; going from 10 to 30 gains only 1.4×, and beyond about 30 stages this model gets slower. The exact optimum depends on the numbers you plug in, but the shape is real, and the industry learned it the hard way.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'The megahertz race',
          text: 'Intel\'s Pentium 4 (NetBurst) bet on depth: 20 stages in 2000, 31 in the 2004 "Prescott" core, with plans to reach 10 GHz. It topped out at 3.8 GHz because power, not logic, became the limit: dynamic power grows with frequency and with the square of voltage, and higher clocks need higher voltage. Its successor, the Core microarchitecture (2006), went back to a pipeline of about 14 stages and won by doing more work per cycle instead. Modern high-performance cores sit somewhere in the mid-teens to around 20 stages, depending on how you count; vendors rarely publish exact figures.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Coming up',
          text: 'The real cost of a deep pipeline shows up in the next two lessons: a branch misprediction on a modern desktop core costs roughly 15 to 20 cycles, which is why branch prediction matters so much for game code.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Pipelining reduces the time it takes to execute each individual instruction.',
      answer: false,
      explanation: 'Each instruction still passes through every stage, and now each stage takes a full cycle sized for the slowest stage, plus pipeline-register overhead. In our example one instruction\'s latency went from 800 ps to 1000 ps. Pipelining wins on **throughput**: many instructions overlap, so one completes every 200 ps.',
    },
    {
      kind: 'mcq',
      prompt: 'A design team doubles their pipeline from 10 to 20 stages, keeping the same logic. Which effect should they **expect to get worse**?',
      options: [
        {
          text: 'The clock frequency',
          why: 'Shorter stages mean a shorter cycle, so frequency goes **up** (though not quite double, because register overhead stays fixed).',
        },
        {
          text: 'The ideal CPI',
          why: 'An ideal pipeline of any depth completes one instruction per cycle once full: ideal CPI stays 1.',
        },
        {
          text: 'The cost of a branch misprediction in cycles',
          correct: true,
          why: 'The branch is resolved further from fetch, so more wrong-path instructions are in flight when a misprediction is discovered: the penalty in cycles roughly doubles.',
        },
        {
          text: 'The number of instructions in the program',
          why: 'Pipelining is invisible to the ISA: the compiled program is identical.',
        },
      ],
      explanation: 'Depth trades a faster clock for more expensive hazards. Each misprediction now flushes about twice as many stages, so the real CPI rises. Whether the net effect is a win depends on how often the hazards happen, which is why deep pipelines and accurate branch predictors always come together.',
    },
    {
      kind: 'concept',
      title: 'Pipelines everywhere: your game\'s frame',
      blocks: [
        {
          type: 'p',
          text: 'Pipelining is a general idea, and game engines use it at a much larger scale. A typical engine splits a frame into stages that run on different processors:',
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Game thread (CPU)',
              text: 'Runs input, gameplay logic, physics and animation for frame N + 1.',
            },
            {
              title: 'Render thread (CPU)',
              text: 'Turns frame N\'s scene into draw calls and command buffers.',
            },
            { title: 'GPU', text: 'Draws frame N − 1.' },
          ],
        },
        {
          type: 'p',
          text: 'All three work at once on different frames, exactly like IF, ID and EX working on different instructions. The payoff is the same: **throughput** (frames per second) is set by the slowest stage, not by the sum of the stages. The cost is also the same: **latency** grows. A button press can take two or three frames to reach the screen, which is why competitive games work hard to keep the pipeline short and why some offer "reduced latency" modes.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal',
          text: 'Unreal Engine runs a game thread, a rendering thread and an RHI thread that talks to the graphics API, with the rendering thread typically working one frame behind the game thread. That is why game-thread code must not touch render resources directly: data is handed between stages through commands, much like pipeline registers.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the idea keeps coming back',
          text: 'Whenever work is a sequence of steps and you have many items, overlapping the steps raises throughput without making any step faster. The same three prices appear every time: a fill/drain cost, a slowest-stage limit, and dependences between items that force waits.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the summary.',
      templateIsCode: false,
      template: 'Pipelining improves ___, the number of instructions finished per second, but not ___, the time one instruction takes. The clock period of a pipeline is set by its slowest ___.',
      blanks: [
        {
          answers: ['throughput'],
        },
        {
          answers: ['latency'],
        },
        {
          answers: ['stage'],
        },
      ],
      wordBank: ['throughput', 'latency', 'stage', 'instruction', 'bandwidth', 'register'],
      explanation: 'Overlap multiplies throughput while each instruction still walks through every stage, so latency stays the same or grows slightly. Because all stages advance on the same clock edge, the slowest stage (plus register overhead) sets the period, just as the slowest instruction did in the single-cycle design.',
    },
    {
      kind: 'numeric',
      prompt: 'An ideal 5-stage pipeline runs at 4 GHz with no stalls. How long does it take to execute 1,000,000,000 instructions? Answer in milliseconds, rounded to 1 decimal place.',
      answer: 250,
      tolerance: 0.05,
      unit: 'ms',
      label: 'Time =',
      hint: 'Cycles = k + n − 1; a 4 GHz clock ticks every 0.25 ns.',
      explanation: 'Cycles = 5 + 10⁹ − 1 ≈ 1.000000004 × 10⁹. At 4 × 10⁹ cycles per second that is 0.25 s = 250 ms (the 4 fill cycles add one nanosecond). This is the [[iron-law-of-performance|iron law of performance]] in action: time = instructions × CPI × clock period = 10⁹ × 1 × 0.25 ns.',
    },
  ],
  takeaways: [
    'Pipelining overlaps the stages of consecutive instructions: it multiplies **throughput** but does not reduce (and slightly increases) each instruction\'s **latency**.',
    'The classic RISC pipeline has five stages: IF, ID, EX, MEM, WB, separated by pipeline registers that also carry each instruction\'s control signals.',
    'n instructions on an ideal k-stage pipeline take k + n − 1 cycles, so CPI approaches 1 while the clock gets much shorter.',
    'The clock period is the slowest stage plus register overhead; unbalanced stages are why 5 stages give less than 5× speedup.',
    'Deeper pipelines raise the clock but pay more for every hazard and add overhead; the Pentium 4 showed the limits, and power ended the megahertz race.',
    'Game engines pipeline whole frames across game thread, render thread and GPU, with the same throughput/latency trade-off.',
  ],
  reading: [
    {
      title: 'Classic RISC pipeline (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Classic_RISC_pipeline',
      source: 'article',
      note: 'The five stages in detail, with diagrams of the hazards you will meet next.',
    },
    {
      title: 'Instruction pipelining (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Instruction_pipelining',
      source: 'article',
      note: 'The history of pipelining from the IBM Stretch to modern cores, and the laundry-style timing diagrams.',
    },
    {
      title: 'Computer Systems: A Programmer\'s Perspective (CS:APP)',
      url: 'https://csapp.cs.cmu.edu/',
      source: 'book',
      note: 'Section 4.4 covers general principles of pipelining, including the nonuniform-stage and register-overhead limits shown here.',
    },
    {
      title: 'Agner Fog: Software optimization resources',
      url: 'https://www.agner.org/optimize/',
      source: 'article',
      note: 'The microarchitecture manual describes the real pipelines of Intel and AMD cores generation by generation.',
    },
  ],
};
