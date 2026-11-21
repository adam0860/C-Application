import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-hazards',
  title: 'Pipeline Hazards',
  summary: 'When overlapped instructions depend on each other: structural, data and control hazards, forwarding, load-use stalls, compiler scheduling, and a pipeline-timing simulator in C++.',
  minutes: 19,
  objectives: [
    'Classify a conflict between pipelined instructions as a structural, data or control hazard',
    'Draw the timing of dependent instructions with and without forwarding, and count the stall cycles',
    'Explain how a forwarding unit chooses its inputs, and why a load followed by its use still stalls',
    'Reorder instructions to hide load-use stalls, as compilers do, and measure the result with a simulator',
    'Compute the CPI cost of control hazards and connect dependency chains to the C++ you write',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'When overlap breaks the rules',
      blocks: [
        {
          type: 'p',
          text: 'The ISA promises that instructions run **one at a time, in order**: when `sub` runs, the `add` before it has completely finished. The pipeline breaks that promise internally, because five instructions are in flight at once. Most of the time nobody can tell. A [[pipeline-hazard]] is a situation where somebody *could* tell: the next instruction cannot safely do its work in the scheduled cycle.',
        },
        {
          type: 'table',
          headers: ['Hazard', 'Cause', 'Example', 'Main fixes'],
          rows: [
            [
              '[[structural-hazard|Structural]]',
              'Two instructions need the same hardware in the same cycle',
              'One memory for both instruction fetch and a load',
              'Duplicate the resource',
            ],
            [
              '[[data-hazard|Data]]',
              'An instruction needs a result that is not written yet',
              '`add x1, ...` then `sub x4, x1, x5`',
              'Forwarding, stalls, scheduling',
            ],
            [
              '[[control-hazard|Control]]',
              'The next PC depends on a branch that has not been decided',
              '`beq` followed by anything',
              'Prediction, flushing',
            ],
          ],
        },
        {
          type: 'p',
          text: '**Structural hazards** are mostly designed away. The five-stage pipeline has separate instruction and data memories (in real chips, separate L1 instruction and data caches), so IF and MEM never fight over a port. The register file is used by ID (reads) and WB (writes) in the same cycle, so it gets two read ports and one write port, with the write in the first half of the cycle and the reads in the second half. Remaining structural hazards in real cores, like a single non-pipelined divider, simply cause a stall when two divides arrive close together.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why hazards must be invisible',
          text: 'Every fix in this lesson exists to preserve the sequential illusion. The hardware may overlap, reorder and guess internally, but the results must be exactly what one-at-a-time execution would produce. That contract is why your single-threaded C++ never sees a pipeline hazard as a wrong answer, only as lost cycles.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'In the five-stage pipeline, `lw x1, 0(x10)` is immediately followed by `add x2, x1, x3`. What kind of hazard is this?',
      options: [
        {
          text: 'Structural hazard',
          why: 'They use different stages in each cycle: the load is in MEM while the add is in EX. No piece of hardware is double-booked.',
        },
        {
          text: 'Data hazard',
          correct: true,
          why: '`add` reads `x1`, which `lw` produces. The add needs the value in EX, but the load is only then starting its memory read: a read-after-write dependence.',
        },
        {
          text: 'Control hazard',
          why: 'Neither instruction changes the flow of control; the next PC is simply PC + 4.',
        },
        {
          text: 'No hazard: forwarding handles it',
          why: 'Forwarding helps, but a load\'s value appears only at the end of MEM, one cycle after the add needs it in EX. This is the one data hazard forwarding cannot fully hide.',
        },
      ],
      explanation: 'It is a data hazard (read after write), and a special one: the **load-use hazard**. Even with forwarding it costs one stall cycle in the classic pipeline. Recognizing it matters because loads are everywhere in real code, and a load immediately followed by its use is exactly what pointer-chasing code produces.',
    },
    {
      kind: 'concept',
      title: 'Data hazards: reading a value before it is written',
      blocks: [
        {
          type: 'p',
          text: 'Consider four instructions that all use `x1`, which the first one computes:',
        },
        {
          type: 'code',
          title: 'A read-after-write (RAW) chain',
          lang: 'text',
          code: `add  x1, x2, x3     # writes x1 in WB (cycle 5)
sub  x4, x1, x5     # wants x1 in ID (cycle 3)
and  x6, x1, x7     # wants x1 in ID (cycle 4)
or   x8, x1, x9     # wants x1 in ID (cycle 5): OK`,
          annotations: [
            {
              lines: 1,
              text: 'The result exists at the end of EX (cycle 3) but reaches the register file only in WB, cycle 5.',
            },
            {
              lines: 2,
              text: 'Without help, `sub` would read the **old** value of `x1`, two cycles too early. That would be a wrong answer, which is never allowed.',
            },
            {
              lines: 4,
              text: '`or` reads in the second half of cycle 5, after `add` writes in the first half, so it is safe.',
            },
          ],
        },
        {
          type: 'p',
          text: 'The simplest correct fix is to **stall**: hold `sub` in ID (and everything behind it) until `x1` has been written. The hardware freezes the PC and the IF/ID register, and sends a [[pipeline-stall|bubble]], a do-nothing instruction, into EX in its place. Step through it:',
        },
        {
          type: 'algo',
          view: 'graph',
          width: 496,
          height: 234,
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
            { id: 'c10', x: 466, y: 26, label: '10' },
            { id: 'r0', x: 26, y: 70, label: 'I1' },
            { id: 'r1', x: 26, y: 114, label: 'I2' },
            { id: 'r2', x: 26, y: 158, label: 'I3' },
            { id: 'r3', x: 26, y: 202, label: 'I4' },
            { id: 'n0_1', x: 70, y: 70, label: 'IF' },
            { id: 'n0_2', x: 114, y: 70, label: 'ID' },
            { id: 'n0_3', x: 158, y: 70, label: 'EX' },
            { id: 'n0_4', x: 202, y: 70, label: 'Mem' },
            { id: 'n0_5', x: 246, y: 70, label: 'WB' },
            { id: 'n1_2', x: 114, y: 114, label: 'IF' },
            { id: 'n1_3', x: 158, y: 114, label: 'ID' },
            { id: 'n1_4', x: 202, y: 114, label: 'ID' },
            { id: 'n1_5', x: 246, y: 114, label: 'ID' },
            { id: 'n1_6', x: 290, y: 114, label: 'EX' },
            { id: 'n1_7', x: 334, y: 114, label: 'Mem' },
            { id: 'n1_8', x: 378, y: 114, label: 'WB' },
            { id: 'n2_3', x: 158, y: 158, label: 'IF' },
            { id: 'n2_4', x: 202, y: 158, label: 'IF' },
            { id: 'n2_5', x: 246, y: 158, label: 'IF' },
            { id: 'n2_6', x: 290, y: 158, label: 'ID' },
            { id: 'n2_7', x: 334, y: 158, label: 'EX' },
            { id: 'n2_8', x: 378, y: 158, label: 'Mem' },
            { id: 'n2_9', x: 422, y: 158, label: 'WB' },
            { id: 'n3_6', x: 290, y: 202, label: 'IF' },
            { id: 'n3_7', x: 334, y: 202, label: 'ID' },
            { id: 'n3_8', x: 378, y: 202, label: 'EX' },
            { id: 'n3_9', x: 422, y: 202, label: 'Mem' },
            { id: 'n3_10', x: 466, y: 202, label: 'WB' },
          ],
          edges: [
            { from: 'n0_5', to: 'n1_5', directed: true },
          ],
          code: `add  x1, x2, x3
sub  x4, x1, x5
and  x6, x1, x7
or   x8, x1, x9`,
          lang: 'text',
          interval: 1100,
          frames: [
            {
              note: '`sub`, `and` and `or` all read `x1`, which `add` produces. **No forwarding**: register values come only from the register file.',
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
                'c10',
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
                'n1_7',
                'n1_8',
                'n2_3',
                'n2_4',
                'n2_5',
                'n2_6',
                'n2_7',
                'n2_8',
                'n2_9',
                'n3_6',
                'n3_7',
                'n3_8',
                'n3_9',
                'n3_10',
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
                'c10',
                'n0_2',
                'n0_3',
                'n0_4',
                'n0_5',
                'n1_2',
                'n1_3',
                'n1_4',
                'n1_5',
                'n1_6',
                'n1_7',
                'n1_8',
                'n2_3',
                'n2_4',
                'n2_5',
                'n2_6',
                'n2_7',
                'n2_8',
                'n2_9',
                'n3_6',
                'n3_7',
                'n3_8',
                'n3_9',
                'n3_10',
              ],
              nodeColors: [
                { id: 'c1', color: 'orange' },
                { id: 'n0_1', color: 'orange' },
              ],
              lines: [1],
              vars: [
                ['cycle', '1'],
                ['finished', '0'],
                ['stall cycles', '0'],
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
                'c10',
                'n0_3',
                'n0_4',
                'n0_5',
                'n1_3',
                'n1_4',
                'n1_5',
                'n1_6',
                'n1_7',
                'n1_8',
                'n2_3',
                'n2_4',
                'n2_5',
                'n2_6',
                'n2_7',
                'n2_8',
                'n2_9',
                'n3_6',
                'n3_7',
                'n3_8',
                'n3_9',
                'n3_10',
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
                ['stall cycles', '0'],
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
                'c10',
                'n0_4',
                'n0_5',
                'n1_4',
                'n1_5',
                'n1_6',
                'n1_7',
                'n1_8',
                'n2_4',
                'n2_5',
                'n2_6',
                'n2_7',
                'n2_8',
                'n2_9',
                'n3_6',
                'n3_7',
                'n3_8',
                'n3_9',
                'n3_10',
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
                ['stall cycles', '0'],
              ],
            },
            {
              note: '**Stall.** I2 (`sub`) reached ID but `x1` is not in the register file yet. I2 waits in ID and I3 waits in IF; a bubble enters EX.',
              hidden: [
                'c5',
                'c6',
                'c7',
                'c8',
                'c9',
                'c10',
                'n0_5',
                'n1_5',
                'n1_6',
                'n1_7',
                'n1_8',
                'n2_5',
                'n2_6',
                'n2_7',
                'n2_8',
                'n2_9',
                'n3_6',
                'n3_7',
                'n3_8',
                'n3_9',
                'n3_10',
              ],
              nodeColors: [
                { id: 'c4', color: 'orange' },
                { id: 'n0_4', color: 'orange' },
                { id: 'n1_4', color: 'red' },
                { id: 'n2_4', color: 'red' },
              ],
              lines: [1, 2, 3],
              vars: [
                ['cycle', '4'],
                ['finished', '0'],
                ['stall cycles', '1'],
              ],
            },
            {
              note: 'I1 writes `x1` in the **first half** of cycle 5 and I2 reads it in the **second half**. I2 can move to EX next cycle: 2 stall cycles in total.',
              hidden: [
                'c6',
                'c7',
                'c8',
                'c9',
                'c10',
                'n1_6',
                'n1_7',
                'n1_8',
                'n2_6',
                'n2_7',
                'n2_8',
                'n2_9',
                'n3_6',
                'n3_7',
                'n3_8',
                'n3_9',
                'n3_10',
              ],
              nodeColors: [
                { id: 'c5', color: 'orange' },
                { id: 'n0_5', color: 'green' },
                { id: 'n1_5', color: 'red' },
                { id: 'n2_5', color: 'red' },
                { id: 'n1_4', color: 'red' },
                { id: 'n2_4', color: 'red' },
              ],
              lines: [1, 2, 3],
              vars: [
                ['cycle', '5'],
                ['finished', '1'],
                ['stall cycles', '2'],
              ],
              edgeColors: [
                { from: 'n0_5', to: 'n1_5', color: 'blue' },
              ],
            },
            {
              note: 'Cycle 6: I2 finally executes. I3 reads `x1` from the register file with no wait.',
              hidden: [
                'c7',
                'c8',
                'c9',
                'c10',
                'n1_7',
                'n1_8',
                'n2_7',
                'n2_8',
                'n2_9',
                'n3_7',
                'n3_8',
                'n3_9',
                'n3_10',
              ],
              nodeColors: [
                { id: 'c6', color: 'orange' },
                { id: 'n1_6', color: 'orange' },
                { id: 'n2_6', color: 'orange' },
                { id: 'n3_6', color: 'orange' },
                { id: 'n1_4', color: 'red' },
                { id: 'n1_5', color: 'red' },
                { id: 'n2_4', color: 'red' },
                { id: 'n2_5', color: 'red' },
              ],
              lines: [2, 3, 4],
              vars: [
                ['cycle', '6'],
                ['finished', '1'],
                ['stall cycles', '2'],
              ],
            },
            {
              note: 'Cycle 7: 3 instructions in flight, each in a different stage.',
              hidden: ['c8', 'c9', 'c10', 'n1_8', 'n2_8', 'n2_9', 'n3_8', 'n3_9', 'n3_10'],
              nodeColors: [
                { id: 'c7', color: 'orange' },
                { id: 'n1_7', color: 'orange' },
                { id: 'n2_7', color: 'orange' },
                { id: 'n3_7', color: 'orange' },
                { id: 'n1_4', color: 'red' },
                { id: 'n1_5', color: 'red' },
                { id: 'n2_4', color: 'red' },
                { id: 'n2_5', color: 'red' },
              ],
              lines: [2, 3, 4],
              vars: [
                ['cycle', '7'],
                ['finished', '1'],
                ['stall cycles', '2'],
              ],
            },
            {
              note: 'I2 writes back and leaves the pipeline.',
              hidden: ['c9', 'c10', 'n2_9', 'n3_9', 'n3_10'],
              nodeColors: [
                { id: 'c8', color: 'orange' },
                { id: 'n1_8', color: 'green' },
                { id: 'n2_8', color: 'orange' },
                { id: 'n3_8', color: 'orange' },
                { id: 'n1_4', color: 'red' },
                { id: 'n1_5', color: 'red' },
                { id: 'n2_4', color: 'red' },
                { id: 'n2_5', color: 'red' },
              ],
              lines: [2, 3, 4],
              vars: [
                ['cycle', '8'],
                ['finished', '2'],
                ['stall cycles', '2'],
              ],
            },
            {
              note: 'I3 writes back and leaves the pipeline.',
              hidden: ['c10', 'n3_10'],
              nodeColors: [
                { id: 'c9', color: 'orange' },
                { id: 'n2_9', color: 'green' },
                { id: 'n3_9', color: 'orange' },
                { id: 'n1_4', color: 'red' },
                { id: 'n1_5', color: 'red' },
                { id: 'n2_4', color: 'red' },
                { id: 'n2_5', color: 'red' },
              ],
              lines: [3, 4],
              vars: [
                ['cycle', '9'],
                ['finished', '3'],
                ['stall cycles', '2'],
              ],
            },
            {
              note: 'All 4 instructions are done after **10 cycles**: 5 + 3 + 2 stall cycles.',
              hidden: [],
              nodeColors: [
                { id: 'c10', color: 'orange' },
                { id: 'n3_10', color: 'green' },
                { id: 'n1_4', color: 'red' },
                { id: 'n1_5', color: 'red' },
                { id: 'n2_4', color: 'red' },
                { id: 'n2_5', color: 'red' },
              ],
              lines: [4],
              vars: [
                ['cycle', '10'],
                ['finished', '4'],
                ['stall cycles', '2'],
              ],
            },
          ],
          caption: 'No forwarding: a dependent instruction must wait in ID until the producer writes the register file. Red cells are stall cycles.',
        },
        {
          type: 'p',
          text: 'Two stall cycles for one dependence. Dependent instructions are extremely common (compilers produce them constantly: compute a value, then use it), so stalling alone would push CPI far above 1. The hardware needs a better trick.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'RAW, WAR and WAW',
          text: 'Data hazards come in three flavours named by the order of accesses. **RAW** (read after write) is the true dependence shown here. **WAR** (write after read) and **WAW** (write after write) are about reusing a register *name*. They cannot cause problems in this in-order pipeline, because reads always happen early (ID) and writes late (WB) and in program order. Out-of-order cores must handle them, using register renaming, which you will meet in the next unit.',
        },
      ],
    },
    {
      kind: 'numeric',
      prompt: 'A chain of three dependent instructions runs on the five-stage pipeline **without forwarding** (register file written in the first half of a cycle, read in the second): `add x1, x2, x3`, then `sub x4, x1, x5`, then `and x6, x4, x7`. How many cycles from the first IF to the last WB?',
      answer: 11,
      unit: 'cycles',
      label: 'Total =',
      hint: 'Ideal time is 5 + 3 − 1 = 7 cycles. How many stalls does each dependence add?',
      explanation: 'Each dependent instruction must wait in ID until its producer\'s WB: 2 stall cycles per dependence. `sub` waits 2 cycles for `x1`, and `and` waits 2 more for `x4`. Total = 7 ideal + 4 stall cycles = 11. A dependency **chain** pays the full penalty at every link, which is why long chains are the enemy of pipelines.',
    },
    {
      kind: 'concept',
      title: 'Forwarding: use the result before it is written',
      blocks: [
        {
          type: 'p',
          text: 'The key observation: `add`\'s result exists at the **end of its EX stage**, sitting in the EX/MEM pipeline register. `sub` needs it at the **start of its EX stage**, one cycle later. The value is there; it is just not in the register file yet. So add wires that carry it straight from the pipeline registers to the ALU inputs. This is [[forwarding]], also called bypassing.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 560 280">
<rect x="10" y="30" width="12" height="200" rx="2" class="f-gray" fill-opacity="0.12" stroke="none"/>
<rect x="10" y="30" width="12" height="200" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="16" y="22" font-size="10" text-anchor="middle" font-weight="600">ID/EX</text>
<rect x="300" y="30" width="12" height="200" rx="2" class="f-gray" fill-opacity="0.12" stroke="none"/>
<rect x="300" y="30" width="12" height="200" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="306" y="22" font-size="10" text-anchor="middle" font-weight="600">EX/MEM</text>
<rect x="450" y="30" width="12" height="200" rx="2" class="f-gray" fill-opacity="0.12" stroke="none"/>
<rect x="450" y="30" width="12" height="200" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="456" y="22" font-size="10" text-anchor="middle" font-weight="600">MEM/WB</text>
<rect x="150" y="40" width="18" height="72" rx="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<rect x="150" y="140" width="18" height="72" rx="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="159" y="34" font-size="9" text-anchor="middle" class="t-purple" font-weight="700">ForwardA</text>
<text x="159" y="134" font-size="9" text-anchor="middle" class="t-purple" font-weight="700">ForwardB</text>
<polyline points="22,52 144.4,52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M150,52 L143,55.1 L143,48.9 Z" fill="currentColor" stroke="none"/>
<polyline points="22,152 144.4,152" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M150,152 L143,155.2 L143,148.8 Z" fill="currentColor" stroke="none"/>
<text x="28" y="46" font-size="9" text-anchor="start">rs1 value</text>
<text x="28" y="146" font-size="9" text-anchor="start">rs2 value</text>
<polygon points="200,50 254,95 254,155 200,200 200,140 218.9,125 200,110" class="f-orange" fill-opacity="0.12" stroke="none"/>
<polygon points="200,50 254,95 254,155 200,200 200,140 218.9,125 200,110" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
<text x="233.5" y="129.2" font-size="12" text-anchor="middle" font-weight="700">ALU</text>
<polyline points="168,76 194.4,76" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M200,76 L193,79.2 L193,72.8 Z" fill="currentColor" stroke="none"/>
<polyline points="168,176 194.4,176" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M200,176 L193,179.2 L193,172.8 Z" fill="currentColor" stroke="none"/>
<polyline points="254,125 294.4,125" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M300,125 L293,128.2 L293,121.8 Z" fill="currentColor" stroke="none"/>
<polyline points="312,125 444.4,125" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M450,125 L443,128.2 L443,121.8 Z" fill="currentColor" stroke="none"/>
<circle cx="340" cy="125" r="2.6" fill="currentColor"/>
<text x="390" y="118" font-size="9" text-anchor="middle">ALU result</text>
<rect x="366" y="150" width="56" height="50" rx="4" class="f-gray" fill-opacity="0.12" stroke="none"/>
<rect x="366" y="150" width="56" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="394" y="172.2" font-size="10" text-anchor="middle" font-weight="600">Data</text>
<text x="394" y="184.8" font-size="10" text-anchor="middle" font-weight="600">mem</text>
<polyline points="340,125 340,175 360.4,175" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M366,175 L359,178.2 L359,171.8 Z" fill="currentColor" stroke="none"/>
<circle cx="340" cy="175" r="2.6" fill="currentColor"/>
<polyline points="422,175 444.4,175" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M450,175 L443,178.2 L443,171.8 Z" fill="currentColor" stroke="none"/>
<polyline points="340,175 340,240 120,240 120,76 144.4,76" fill="none" class="s-blue" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M150,76 L143,79.2 L143,72.8 Z" class="f-blue" stroke="none"/>
<polyline points="120,176 144.4,176" fill="none" class="s-blue" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M150,176 L143,179.2 L143,172.8 Z" class="f-blue" stroke="none"/>
<circle cx="120" cy="176" r="2.6" class="f-blue"/>
<text x="230" y="234" font-size="10" text-anchor="middle" class="t-blue" font-weight="600">from EX/MEM: the previous instruction</text>
<polyline points="462,150 500,150 500,256 100,256 100,100 144.4,100" fill="none" class="s-green" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M150,100 L143,103.2 L143,96.8 Z" class="f-green" stroke="none"/>
<polyline points="100,200 144.4,200" fill="none" class="s-green" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M150,200 L143,203.2 L143,196.8 Z" class="f-green" stroke="none"/>
<circle cx="100" cy="200" r="2.6" class="f-green"/>
<text x="300" y="272" font-size="10" text-anchor="middle" class="t-green" font-weight="600">from MEM/WB: two instructions back (ALU result or loaded value)</text>
</svg>`,
          alt: 'The EX stage with forwarding: two multiplexers in front of the ALU inputs choose between the register-file value from ID/EX, the ALU result in EX/MEM (previous instruction), and the value in MEM/WB (two instructions back).',
          caption: 'Two muxes in front of the ALU, steered by the forwarding unit. Blue: the previous instruction\'s result. Green: the result of the instruction before that.',
        },
        {
          type: 'algo',
          view: 'graph',
          width: 408,
          height: 234,
          nodes: [
            { id: 'c1', x: 70, y: 26, label: '1' },
            { id: 'c2', x: 114, y: 26, label: '2' },
            { id: 'c3', x: 158, y: 26, label: '3' },
            { id: 'c4', x: 202, y: 26, label: '4' },
            { id: 'c5', x: 246, y: 26, label: '5' },
            { id: 'c6', x: 290, y: 26, label: '6' },
            { id: 'c7', x: 334, y: 26, label: '7' },
            { id: 'c8', x: 378, y: 26, label: '8' },
            { id: 'r0', x: 26, y: 70, label: 'I1' },
            { id: 'r1', x: 26, y: 114, label: 'I2' },
            { id: 'r2', x: 26, y: 158, label: 'I3' },
            { id: 'r3', x: 26, y: 202, label: 'I4' },
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
          ],
          edges: [
            { from: 'n0_3', to: 'n1_4', directed: true },
            { from: 'n0_4', to: 'n2_5', directed: true },
          ],
          code: `add  x1, x2, x3
sub  x4, x1, x5
and  x6, x1, x7
or   x8, x1, x9`,
          lang: 'text',
          interval: 1100,
          frames: [
            {
              note: 'Same code, now **with forwarding**. The ALU result exists at the end of `add`\'s EX stage, long before WB.',
              hidden: [
                'c1',
                'c2',
                'c3',
                'c4',
                'c5',
                'c6',
                'c7',
                'c8',
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
              note: '**Forward.** I2 needs `x1` now. The forwarding mux takes it from the EX/MEM pipeline register instead of the register file.',
              hidden: [
                'c5',
                'c6',
                'c7',
                'c8',
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
              edgeColors: [
                { from: 'n0_3', to: 'n1_4', color: 'blue' },
              ],
            },
            {
              note: '**Forward.** I3 needs `x1` now. The forwarding mux takes it from the MEM/WB pipeline register instead of the register file.',
              hidden: ['c6', 'c7', 'c8', 'n1_6', 'n2_6', 'n2_7', 'n3_6', 'n3_7', 'n3_8'],
              nodeColors: [
                { id: 'c5', color: 'orange' },
                { id: 'n0_5', color: 'green' },
                { id: 'n1_5', color: 'orange' },
                { id: 'n2_5', color: 'orange' },
                { id: 'n3_5', color: 'orange' },
              ],
              lines: [1, 2, 3, 4],
              vars: [
                ['cycle', '5'],
                ['finished', '1'],
              ],
              edgeColors: [
                { from: 'n0_4', to: 'n2_5', color: 'blue' },
              ],
            },
            {
              note: 'I4 (`or`) reads `x1` from the register file as usual: I1 wrote it in cycle 5. I2 writes back.',
              hidden: ['c7', 'c8', 'n2_7', 'n3_7', 'n3_8'],
              nodeColors: [
                { id: 'c6', color: 'orange' },
                { id: 'n1_6', color: 'green' },
                { id: 'n2_6', color: 'orange' },
                { id: 'n3_6', color: 'orange' },
              ],
              lines: [2, 3, 4],
              vars: [
                ['cycle', '6'],
                ['finished', '2'],
              ],
            },
            {
              note: 'I3 writes back and leaves the pipeline.',
              hidden: ['c8', 'n3_8'],
              nodeColors: [
                { id: 'c7', color: 'orange' },
                { id: 'n2_7', color: 'green' },
                { id: 'n3_7', color: 'orange' },
              ],
              lines: [3, 4],
              vars: [
                ['cycle', '7'],
                ['finished', '3'],
              ],
            },
            {
              note: 'All 4 instructions are done after **8 cycles** with no stalls: 5 + 3.',
              hidden: [],
              nodeColors: [
                { id: 'c8', color: 'orange' },
                { id: 'n3_8', color: 'green' },
              ],
              lines: [4],
              vars: [
                ['cycle', '8'],
                ['finished', '4'],
              ],
            },
          ],
          caption: 'With forwarding the same four instructions need no stalls: blue arrows show results routed from a pipeline register straight to the ALU input.',
        },
        {
          type: 'p',
          text: 'No stalls at all. The forwarding unit decides each mux setting by comparing register numbers carried in the pipeline registers:',
        },
        {
          type: 'code',
          title: 'The forwarding unit (as C++ pseudo-code)',
          code: `// ForwardA: where does the ALU's first operand come from?
if (exMem.regWrite && exMem.rd != 0 && exMem.rd == idEx.rs1)
    forwardA = Source::ExMem;      // previous instruction's result
else if (memWb.regWrite && memWb.rd != 0 && memWb.rd == idEx.rs1)
    forwardA = Source::MemWb;      // result from two back
else
    forwardA = Source::RegFile;    // no hazard
// ForwardB: the same three tests against idEx.rs2`,
          annotations: [
            {
              lines: 2,
              text: 'Forward only if the earlier instruction actually writes a register (stores and branches do not), it is not `x0` (whose value is always 0, whatever was "computed" for it), and its destination is our source.',
            },
            {
              lines: 4,
              text: 'This is an `else if` on purpose. If **both** older instructions write `rs1`, the newer one (in EX/MEM) must win, because sequential semantics says the most recent write is the one we read.',
            },
            {
              lines: 6,
              text: 'Most of the time no forwarding is needed and the value read in ID is correct.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why forwarding is worth it',
          text: 'Forwarding costs a few multiplexers and comparators, a tiny amount of hardware, and removes almost all data-hazard stalls between ALU instructions. Waiting would cost 2 cycles per dependence, and dependences are everywhere. Few trade-offs in CPU design are this one-sided, which is why every pipelined processor has bypass paths.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This forwarding unit gives wrong results for `add x1, x1, x2` repeated three times in a row (a running sum), even though each line looks reasonable. Tap the line where the bug starts.',
      code: `Source pickA(const ExMem& exMem, const MemWb& memWb,
             const IdEx& idEx) {
    if (memWb.regWrite && memWb.rd != 0 && memWb.rd == idEx.rs1)
        return Source::MemWb;
    if (exMem.regWrite && exMem.rd != 0 && exMem.rd == idEx.rs1)
        return Source::ExMem;
    return Source::RegFile;
}`,
      bugLines: [3],
      explanation: 'The MEM/WB check runs first, so when both older instructions write `x1` the unit forwards the **older** value. In the running sum, the third `add` needs the second `add`\'s result (in EX/MEM), but receives the first one\'s (in MEM/WB), and the sum comes out wrong. The newest write must win: test EX/MEM first and fall back to MEM/WB only when EX/MEM does not match. It is a silent wrong-answer bug that only appears with back-to-back writes to the same register, which is exactly the kind of case hardware verification hunts for.',
    },
    {
      kind: 'concept',
      title: 'The load-use hazard: one stall forwarding cannot remove',
      blocks: [
        {
          type: 'p',
          text: 'A load is different. Its value is not computed by the ALU; it comes out of data memory at the **end of MEM**. If the very next instruction needs it in EX, the value arrives one cycle too late, and no wire can send data backwards in time. The pipeline must stall once, then forward from MEM/WB:',
        },
        {
          type: 'algo',
          view: 'graph',
          width: 452,
          height: 234,
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
            { id: 'n0_1', x: 70, y: 70, label: 'IF' },
            { id: 'n0_2', x: 114, y: 70, label: 'ID' },
            { id: 'n0_3', x: 158, y: 70, label: 'EX' },
            { id: 'n0_4', x: 202, y: 70, label: 'Mem' },
            { id: 'n0_5', x: 246, y: 70, label: 'WB' },
            { id: 'n1_2', x: 114, y: 114, label: 'IF' },
            { id: 'n1_3', x: 158, y: 114, label: 'ID' },
            { id: 'n1_4', x: 202, y: 114, label: 'ID' },
            { id: 'n1_5', x: 246, y: 114, label: 'EX' },
            { id: 'n1_6', x: 290, y: 114, label: 'Mem' },
            { id: 'n1_7', x: 334, y: 114, label: 'WB' },
            { id: 'n2_3', x: 158, y: 158, label: 'IF' },
            { id: 'n2_4', x: 202, y: 158, label: 'IF' },
            { id: 'n2_5', x: 246, y: 158, label: 'ID' },
            { id: 'n2_6', x: 290, y: 158, label: 'EX' },
            { id: 'n2_7', x: 334, y: 158, label: 'Mem' },
            { id: 'n2_8', x: 378, y: 158, label: 'WB' },
            { id: 'n3_5', x: 246, y: 202, label: 'IF' },
            { id: 'n3_6', x: 290, y: 202, label: 'ID' },
            { id: 'n3_7', x: 334, y: 202, label: 'EX' },
            { id: 'n3_8', x: 378, y: 202, label: 'Mem' },
            { id: 'n3_9', x: 422, y: 202, label: 'WB' },
          ],
          edges: [
            { from: 'n0_4', to: 'n1_5', directed: true },
            { from: 'n0_5', to: 'n2_6', directed: true },
          ],
          code: `lw   x1, 0(x2)
sub  x4, x1, x5
and  x6, x1, x7
or   x8, x2, x9`,
          lang: 'text',
          interval: 1100,
          frames: [
            {
              note: 'Now the producer is a **load**. Its value comes out of data memory at the end of MEM, one stage later than an ALU result.',
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
                'n1_7',
                'n2_3',
                'n2_4',
                'n2_5',
                'n2_6',
                'n2_7',
                'n2_8',
                'n3_5',
                'n3_6',
                'n3_7',
                'n3_8',
                'n3_9',
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
                'n1_7',
                'n2_3',
                'n2_4',
                'n2_5',
                'n2_6',
                'n2_7',
                'n2_8',
                'n3_5',
                'n3_6',
                'n3_7',
                'n3_8',
                'n3_9',
              ],
              nodeColors: [
                { id: 'c1', color: 'orange' },
                { id: 'n0_1', color: 'orange' },
              ],
              lines: [1],
              vars: [
                ['cycle', '1'],
                ['finished', '0'],
                ['stall cycles', '0'],
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
                'n1_7',
                'n2_3',
                'n2_4',
                'n2_5',
                'n2_6',
                'n2_7',
                'n2_8',
                'n3_5',
                'n3_6',
                'n3_7',
                'n3_8',
                'n3_9',
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
                ['stall cycles', '0'],
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
                'n1_7',
                'n2_4',
                'n2_5',
                'n2_6',
                'n2_7',
                'n2_8',
                'n3_5',
                'n3_6',
                'n3_7',
                'n3_8',
                'n3_9',
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
                ['stall cycles', '0'],
              ],
            },
            {
              note: '**Stall.** I2 needs `x1` in EX now, but I1 is only *starting* its memory read. The hazard unit holds I2 in ID and I3 in IF, and sends a bubble into EX.',
              hidden: [
                'c5',
                'c6',
                'c7',
                'c8',
                'c9',
                'n0_5',
                'n1_5',
                'n1_6',
                'n1_7',
                'n2_5',
                'n2_6',
                'n2_7',
                'n2_8',
                'n3_5',
                'n3_6',
                'n3_7',
                'n3_8',
                'n3_9',
              ],
              nodeColors: [
                { id: 'c4', color: 'orange' },
                { id: 'n0_4', color: 'orange' },
                { id: 'n1_4', color: 'red' },
                { id: 'n2_4', color: 'red' },
              ],
              lines: [1, 2, 3],
              vars: [
                ['cycle', '4'],
                ['finished', '0'],
                ['stall cycles', '1'],
              ],
            },
            {
              note: '**Forward.** The loaded value is in the MEM/WB register; the forwarding mux routes it to I2\'s ALU input. One bubble was the price.',
              hidden: [
                'c6',
                'c7',
                'c8',
                'c9',
                'n1_6',
                'n1_7',
                'n2_6',
                'n2_7',
                'n2_8',
                'n3_6',
                'n3_7',
                'n3_8',
                'n3_9',
              ],
              nodeColors: [
                { id: 'c5', color: 'orange' },
                { id: 'n0_5', color: 'green' },
                { id: 'n1_5', color: 'orange' },
                { id: 'n2_5', color: 'orange' },
                { id: 'n3_5', color: 'orange' },
                { id: 'n1_4', color: 'red' },
                { id: 'n2_4', color: 'red' },
              ],
              lines: [1, 2, 3, 4],
              vars: [
                ['cycle', '5'],
                ['finished', '1'],
                ['stall cycles', '1'],
              ],
              edgeColors: [
                { from: 'n0_4', to: 'n1_5', color: 'blue' },
              ],
            },
            {
              note: '**Forward.** I3 also gets `x1` forwarded. I4 does not use `x1`, so it flows normally.',
              hidden: ['c7', 'c8', 'c9', 'n1_7', 'n2_7', 'n2_8', 'n3_7', 'n3_8', 'n3_9'],
              nodeColors: [
                { id: 'c6', color: 'orange' },
                { id: 'n1_6', color: 'orange' },
                { id: 'n2_6', color: 'orange' },
                { id: 'n3_6', color: 'orange' },
                { id: 'n1_4', color: 'red' },
                { id: 'n2_4', color: 'red' },
              ],
              lines: [2, 3, 4],
              vars: [
                ['cycle', '6'],
                ['finished', '1'],
                ['stall cycles', '1'],
              ],
              edgeColors: [
                { from: 'n0_5', to: 'n2_6', color: 'blue' },
              ],
            },
            {
              note: 'I2 writes back and leaves the pipeline.',
              hidden: ['c8', 'c9', 'n2_8', 'n3_8', 'n3_9'],
              nodeColors: [
                { id: 'c7', color: 'orange' },
                { id: 'n1_7', color: 'green' },
                { id: 'n2_7', color: 'orange' },
                { id: 'n3_7', color: 'orange' },
                { id: 'n1_4', color: 'red' },
                { id: 'n2_4', color: 'red' },
              ],
              lines: [2, 3, 4],
              vars: [
                ['cycle', '7'],
                ['finished', '2'],
                ['stall cycles', '1'],
              ],
            },
            {
              note: 'I3 writes back and leaves the pipeline.',
              hidden: ['c9', 'n3_9'],
              nodeColors: [
                { id: 'c8', color: 'orange' },
                { id: 'n2_8', color: 'green' },
                { id: 'n3_8', color: 'orange' },
                { id: 'n1_4', color: 'red' },
                { id: 'n2_4', color: 'red' },
              ],
              lines: [3, 4],
              vars: [
                ['cycle', '8'],
                ['finished', '3'],
                ['stall cycles', '1'],
              ],
            },
            {
              note: 'All 4 instructions are done after **9 cycles**: 5 + 3 + 1 stall cycle.',
              hidden: [],
              nodeColors: [
                { id: 'c9', color: 'orange' },
                { id: 'n3_9', color: 'green' },
                { id: 'n1_4', color: 'red' },
                { id: 'n2_4', color: 'red' },
              ],
              lines: [4],
              vars: [
                ['cycle', '9'],
                ['finished', '4'],
                ['stall cycles', '1'],
              ],
            },
          ],
          caption: 'A load-use hazard: even with forwarding, a value loaded from memory reaches the next instruction one cycle too late, so the hazard unit inserts one bubble.',
        },
        {
          type: 'p',
          text: 'A **hazard detection unit** in ID spots the situation before it happens:',
        },
        {
          type: 'code',
          title: 'Load-use hazard detection',
          code: `// In ID: is the instruction now in EX a load whose result we need?
if (idEx.memRead &&
    (idEx.rd == ifId.rs1 || idEx.rd == ifId.rs2)) {
    stallPc = true;      // fetch the same instruction again
    stallIfId = true;    // keep this instruction in ID
    bubbleIdEx = true;   // send a no-op into EX next cycle
}`,
          annotations: [
            {
              lines: 2,
              text: '`memRead` is set only for loads: only they produce a value too late to forward in time.',
            },
            {
              lines: '4-6',
              text: 'The three actions of a stall: freeze the PC, freeze IF/ID, and zero the control signals going into ID/EX so the "instruction" in EX does nothing.',
            },
          ],
        },
        {
          type: 'p',
          text: 'This [[load-use-hazard]] costs one cycle in the classic pipeline. On a modern core a load that hits the L1 cache takes about 4 to 5 cycles before its value can be used, and much longer on a cache miss, so in-order cores lose far more than one cycle per load-use pair. Out-of-order cores (next unit) hide this latency by running other independent instructions meanwhile, but only if there are independent instructions to run.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Pointer chasing',
          text: 'Following a linked list is a chain of load-use hazards, the classic case of [[pointer-chasing]]: `node = node->next` cannot start loading the next node until the current load finishes. Walking a `std::vector` of the same objects has no such chain, because every element\'s address is computed by simple arithmetic, so many loads can be in flight at once. That is one reason (caches being the other) entity lists in games are arrays, not linked lists.',
        },
      ],
    },
    {
      kind: 'numeric',
      prompt: 'With full forwarding, how many cycles does this sequence take on the five-stage pipeline, from the first IF to the last WB?\n\n`lw x1, 0(x2)` → `add x3, x1, x4` → `sub x5, x3, x6` → `sw x5, 0(x2)`',
      answer: 9,
      unit: 'cycles',
      label: 'Total =',
      hint: 'Ideal time for 4 instructions is 8 cycles. Which dependences can forwarding not cover?',
      explanation: 'Ideal: 5 + 4 − 1 = 8 cycles. `add` uses the loaded `x1` immediately: a load-use hazard, one stall. `sub` uses `add`\'s result: forwarded from EX/MEM, no stall. `sw` stores `sub`\'s result: also forwarded, no stall. Total 8 + 1 = 9 cycles.',
    },
    {
      kind: 'concept',
      title: 'Scheduling instructions to avoid stalls',
      blocks: [
        {
          type: 'p',
          text: 'If the instruction after a load does not need the loaded value, there is no stall. So a compiler that knows the pipeline can **reorder** independent instructions to fill the gap. This is [[instruction-scheduling]]. The classic textbook example compiles two lines of C++:',
        },
        {
          type: 'code',
          code: `a = b + e;
c = b + f;`,
          annotations: [
            {
              lines: '1-2',
              text: 'Three loads (`b`, `e`, `f`), two adds, two stores. Both adds want a value loaded by the instruction right before them.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Here is a pipeline-timing simulator in C++. It schedules each instruction as early as the pipeline\'s rules allow, with or without forwarding, prints the timing diagram of the naive order, and compares it with a version where the third load is moved up:',
        },
        {
          type: 'code',
          title: 'pipeline_sim.cpp',
          code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

enum class Kind { Alu, Load, Store };
struct Instr {
    std::string text;
    Kind kind;
    int rd, rs1, rs2;   // -1 = unused
};

// Returns total cycles; prints the timing diagram if asked.
int simulate(const std::vector<Instr>& prog, bool fwd, bool print) {
    const int n = static_cast<int>(prog.size());
    std::vector<int> fetch(n), decode(n), exec(n);
    for (int i = 0; i < n; ++i) {
        fetch[i] = i == 0 ? 1 : decode[i - 1];     // IF frees up
        decode[i] = i == 0 ? 2 : std::max(fetch[i] + 1, exec[i - 1]);
        int ready = decode[i] + 1;
        for (int j = std::max(0, i - 3); j < i; ++j) {
            const Instr& p = prog[j];
            bool dep = p.rd > 0 && p.kind != Kind::Store &&
                       (p.rd == prog[i].rs1 || p.rd == prog[i].rs2);
            if (!dep) continue;
            int need = !fwd ? exec[j] + 3          // wait for WB
                     : p.kind == Kind::Load ? exec[j] + 2  // post-MEM
                     : exec[j] + 1;                // after EX
            ready = std::max(ready, need);
        }
        exec[i] = ready;                            // stall in ID
    }
    const int total = exec[n - 1] + 2;              // last WB
    if (print) {
        std::string head(17, ' ');
        for (int c = 1; c <= total; ++c)
            head += (c < 10 ? " " : "") + std::to_string(c) + " ";
        head.erase(head.find_last_not_of(' ') + 1);
        std::cout << head << '\\n';
        for (int i = 0; i < n; ++i) {
            std::string row = prog[i].text;
            row.resize(17, ' ');
            for (int c = 1; c <= total; ++c) {
                const char* s = "   ";
                if (c == fetch[i]) s = "IF ";
                else if (c == decode[i]) s = "ID ";
                else if (c > fetch[i] && c < exec[i]) s = "-- ";
                else if (c == exec[i]) s = "EX ";
                else if (c == exec[i] + 1) s = "ME ";
                else if (c == exec[i] + 2) s = "WB ";
                row += s;
            }
            row.erase(row.find_last_not_of(' ') + 1);
            std::cout << row << '\\n';
        }
    }
    return total;
}

int main() {
    using K = Kind;
    // a = b + e;  c = b + f;   (b, e, f at 0, 8, 16 off x31)
    std::vector<Instr> naive = {
        {"lw  x1, 0(x31)", K::Load, 1, 31, -1},
        {"lw  x2, 8(x31)", K::Load, 2, 31, -1},
        {"add x3, x1, x2", K::Alu, 3, 1, 2},
        {"sw  x3, 24(x31)", K::Store, -1, 31, 3},
        {"lw  x4, 16(x31)", K::Load, 4, 31, -1},
        {"add x5, x1, x4", K::Alu, 5, 1, 4},
        {"sw  x5, 32(x31)", K::Store, -1, 31, 5},
    };
    // Same work, with the third load hoisted above the first add.
    std::vector<Instr> sched = {naive[0], naive[1], naive[4], naive[2],
                                naive[3], naive[5], naive[6]};

    simulate(naive, true, true);
    std::cout << '\\n';
    for (bool fwd : {false, true}) {
        std::cout << (fwd ? "forwarding:    " : "no forwarding: ")
                  << "naive " << simulate(naive, fwd, false)
                  << " cycles, scheduled "
                  << simulate(sched, fwd, false) << " cycles\\n";
    }
}`,
          runnable: true,
          output: `                  1  2  3  4  5  6  7  8  9 10 11 12 13
lw  x1, 0(x31)   IF ID EX ME WB
lw  x2, 8(x31)      IF ID EX ME WB
add x3, x1, x2         IF ID -- EX ME WB
sw  x3, 24(x31)           IF -- ID EX ME WB
lw  x4, 16(x31)                 IF ID EX ME WB
add x5, x1, x4                     IF ID -- EX ME WB
sw  x5, 32(x31)                       IF -- ID EX ME WB

no forwarding: naive 19 cycles, scheduled 16 cycles
forwarding:    naive 13 cycles, scheduled 11 cycles`,
          annotations: [
            {
              lines: '7-11',
              text: 'Each instruction records what it writes (`rd`) and reads (`rs1`, `rs2`). That is all the hazard logic needs.',
            },
            {
              lines: 18,
              text: 'An instruction can start fetching when the previous one has left IF.',
            },
            {
              lines: 19,
              text: 'It can enter ID only when the previous instruction has moved on to EX: this is how a stall ripples backwards.',
            },
            {
              lines: '21-30',
              text: 'Check the three previous instructions for read-after-write dependences and compute the earliest cycle this one may execute.',
            },
            {
              lines: 26,
              text: 'No forwarding: the value is written in WB (EX + 2); the consumer reads it in that same cycle\'s second half and executes the cycle after.',
            },
            {
              lines: 27,
              text: 'Forwarding from a load: the value exists after MEM, so the consumer\'s EX can be at the earliest one cycle after the load\'s MEM.',
            },
            {
              lines: 28,
              text: 'Forwarding from an ALU instruction: the very next cycle.',
            },
            {
              lines: 47,
              text: 'Cycles spent waiting are printed as `--`. In IF that means the fetch unit is frozen behind a stalled instruction.',
            },
            {
              lines: '73-74',
              text: 'The scheduled version: `lw x4` is hoisted above the first `add`. Nothing else changes, and the program computes the same values.',
            },
          ],
        },
        {
          type: 'p',
          text: 'The naive order stalls twice (two load-use hazards): 13 cycles. Moving `lw x4` up puts an independent instruction between every load and its use, so both stalls disappear: **11 cycles**, the minimum for 7 instructions. Without forwarding, scheduling helps even more in absolute terms (19 → 16), but forwarding is the bigger win.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Who does this for you',
          text: 'Compilers do this automatically at `-O2` (GCC\'s instruction scheduling passes, guided by a model of the target CPU you select with `-mtune`). It matters most for **in-order** cores, such as the small efficiency cores in phones and many embedded and console-era CPUs. Out-of-order cores reschedule dynamically, but the compiler still helps by keeping dependency chains short.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'On the five-stage pipeline with forwarding, this code stalls twice. Which change removes both stalls while computing the same results?',
      code: `lw   x1, 0(x10)
add  x2, x1, x1
lw   x3, 4(x10)
add  x4, x3, x3`,
      lang: 'text',
      options: [
        {
          text: 'Move `lw x3, 4(x10)` up to just after `lw x1, 0(x10)`',
          correct: true,
          why: 'Now each `add` is two instructions after its load, so the value is forwarded from MEM/WB just in time. Both loads are independent of the first add, so the reordering is legal: 10 cycles become 8.',
        },
        {
          text: 'Swap the two `add` instructions',
          why: 'Then `add x4, x3, x3` would run before `x3` is loaded, computing a wrong result. Reordering is only legal across instructions that do not depend on each other.',
        },
        {
          text: 'Insert a `nop` after each load',
          why: 'That makes the stalls explicit instead of removing them: the program takes the same 10 cycles (and is longer).',
        },
        {
          text: 'Nothing: forwarding already removes these stalls',
          why: 'Forwarding cannot deliver a loaded value to the very next instruction\'s EX: each load-use pair costs one stall.',
        },
      ],
      explanation: 'Scheduling fills the cycle after each load with an instruction that does not need the loaded value. The legal reorderings are those that keep every dependence (read after write, and also the order of memory writes and reads that might alias) intact. Interleaving two independent computations, as here, is the standard trick, and it is exactly what [[loop-unrolling]] enables.',
    },
    {
      kind: 'concept',
      title: 'Control hazards: which instruction comes next?',
      blocks: [
        {
          type: 'p',
          text: 'A branch is decided in EX, two stages after the next instruction is fetched. The pipeline cannot just wait: stalling for every branch would add 2 cycles to roughly one instruction in five. Instead the simplest pipelines **predict not taken**: keep fetching sequentially, and if the branch turns out taken, **flush** the wrong-path instructions (turn them into bubbles) and restart at the target.',
        },
        {
          type: 'algo',
          view: 'graph',
          width: 408,
          height: 234,
          nodes: [
            { id: 'c1', x: 70, y: 26, label: '1' },
            { id: 'c2', x: 114, y: 26, label: '2' },
            { id: 'c3', x: 158, y: 26, label: '3' },
            { id: 'c4', x: 202, y: 26, label: '4' },
            { id: 'c5', x: 246, y: 26, label: '5' },
            { id: 'c6', x: 290, y: 26, label: '6' },
            { id: 'c7', x: 334, y: 26, label: '7' },
            { id: 'c8', x: 378, y: 26, label: '8' },
            { id: 'r0', x: 26, y: 70, label: 'I1' },
            { id: 'r1', x: 26, y: 114, label: 'I2' },
            { id: 'r2', x: 26, y: 158, label: 'I3' },
            { id: 'r3', x: 26, y: 202, label: 'I4' },
            { id: 'n0_1', x: 70, y: 70, label: 'IF' },
            { id: 'n0_2', x: 114, y: 70, label: 'ID' },
            { id: 'n0_3', x: 158, y: 70, label: 'EX' },
            { id: 'n0_4', x: 202, y: 70, label: 'Mem' },
            { id: 'n0_5', x: 246, y: 70, label: 'WB' },
            { id: 'n1_2', x: 114, y: 114, label: 'IF' },
            { id: 'n1_3', x: 158, y: 114, label: 'ID' },
            { id: 'n2_3', x: 158, y: 158, label: 'IF' },
            { id: 'n3_4', x: 202, y: 202, label: 'IF' },
            { id: 'n3_5', x: 246, y: 202, label: 'ID' },
            { id: 'n3_6', x: 290, y: 202, label: 'EX' },
            { id: 'n3_7', x: 334, y: 202, label: 'Mem' },
            { id: 'n3_8', x: 378, y: 202, label: 'WB' },
          ],
          edges: [],
          code: `beq  x1, x2, L
add  x3, x4, x5
sub  x6, x7, x8
L: or  x9, x1, x2`,
          lang: 'text',
          interval: 1200,
          frames: [
            {
              note: 'A taken branch in the 5-stage pipeline. The branch outcome is known only at the end of EX.',
              hidden: [
                'c1',
                'c2',
                'c3',
                'c4',
                'c5',
                'c6',
                'c7',
                'c8',
                'n0_1',
                'n0_2',
                'n0_3',
                'n0_4',
                'n0_5',
                'n1_2',
                'n1_3',
                'n2_3',
                'n3_4',
                'n3_5',
                'n3_6',
                'n3_7',
                'n3_8',
              ],
              vars: [
                ['cycle', '0'],
              ],
            },
            {
              note: 'Cycle 1: `beq` is fetched. The fetch unit simply assumes **not taken** and keeps going.',
              hidden: [
                'c2',
                'c3',
                'c4',
                'c5',
                'c6',
                'c7',
                'c8',
                'n0_2',
                'n0_3',
                'n0_4',
                'n0_5',
                'n1_2',
                'n1_3',
                'n2_3',
                'n3_4',
                'n3_5',
                'n3_6',
                'n3_7',
                'n3_8',
              ],
              nodeColors: [
                { id: 'c1', color: 'orange' },
                { id: 'n0_1', color: 'orange' },
              ],
              lines: [1],
              vars: [
                ['cycle', '1'],
                ['flushed', '0'],
              ],
            },
            {
              note: 'Cycle 2: the next sequential instruction (`add`) is fetched behind the branch.',
              hidden: [
                'c3',
                'c4',
                'c5',
                'c6',
                'c7',
                'c8',
                'n0_3',
                'n0_4',
                'n0_5',
                'n1_3',
                'n2_3',
                'n3_4',
                'n3_5',
                'n3_6',
                'n3_7',
                'n3_8',
              ],
              nodeColors: [
                { id: 'c2', color: 'orange' },
                { id: 'n0_2', color: 'orange' },
                { id: 'n1_2', color: 'orange' },
              ],
              lines: [1, 2],
              vars: [
                ['cycle', '2'],
                ['flushed', '0'],
              ],
            },
            {
              note: 'Cycle 3: `beq` compares in EX and finds `x1 == x2`: **taken**. But `add` and `sub` are already in the pipe.',
              hidden: ['c4', 'c5', 'c6', 'c7', 'c8', 'n0_4', 'n0_5', 'n3_4', 'n3_5', 'n3_6', 'n3_7', 'n3_8'],
              nodeColors: [
                { id: 'c3', color: 'orange' },
                { id: 'n0_3', color: 'orange' },
                { id: 'n1_3', color: 'orange' },
                { id: 'n2_3', color: 'orange' },
                { id: 'n0_3', color: 'purple' },
              ],
              lines: [1, 2, 3],
              vars: [
                ['cycle', '3'],
                ['flushed', '0'],
              ],
            },
            {
              note: 'Cycle 4: the wrong-path instructions are **flushed** (turned into bubbles) and fetch restarts at `L`.',
              hidden: ['c5', 'c6', 'c7', 'c8', 'n0_5', 'n3_5', 'n3_6', 'n3_7', 'n3_8'],
              nodeColors: [
                { id: 'c4', color: 'orange' },
                { id: 'n0_4', color: 'orange' },
                { id: 'n1_2', color: 'red' },
                { id: 'n1_3', color: 'red' },
                { id: 'n2_3', color: 'red' },
                { id: 'n3_4', color: 'orange' },
              ],
              lines: [1, 4],
              vars: [
                ['cycle', '4'],
                ['flushed', '2'],
              ],
            },
            {
              note: 'Cycle 5: two cycles of work were thrown away. That is the **branch penalty** of this pipeline.',
              hidden: ['c6', 'c7', 'c8', 'n3_6', 'n3_7', 'n3_8'],
              nodeColors: [
                { id: 'c5', color: 'orange' },
                { id: 'n0_5', color: 'green' },
                { id: 'n1_2', color: 'red' },
                { id: 'n1_3', color: 'red' },
                { id: 'n2_3', color: 'red' },
                { id: 'n3_5', color: 'orange' },
              ],
              lines: [1, 4],
              vars: [
                ['cycle', '5'],
                ['flushed', '2'],
              ],
            },
            {
              note: 'The `or` at the target proceeds normally.',
              hidden: ['c7', 'c8', 'n3_7', 'n3_8'],
              nodeColors: [
                { id: 'c6', color: 'orange' },
                { id: 'n1_2', color: 'red' },
                { id: 'n1_3', color: 'red' },
                { id: 'n2_3', color: 'red' },
                { id: 'n3_6', color: 'orange' },
              ],
              lines: [4],
              vars: [
                ['cycle', '6'],
                ['flushed', '2'],
              ],
            },
            {
              note: 'Cycle 7.',
              hidden: ['c8', 'n3_8'],
              nodeColors: [
                { id: 'c7', color: 'orange' },
                { id: 'n1_2', color: 'red' },
                { id: 'n1_3', color: 'red' },
                { id: 'n2_3', color: 'red' },
                { id: 'n3_7', color: 'orange' },
              ],
              lines: [4],
              vars: [
                ['cycle', '7'],
                ['flushed', '2'],
              ],
            },
            {
              note: 'Done in 8 cycles instead of 6: a taken branch cost 2 bubbles. Deeper pipelines resolve branches later and lose more.',
              hidden: [],
              nodeColors: [
                { id: 'c8', color: 'orange' },
                { id: 'n1_2', color: 'red' },
                { id: 'n1_3', color: 'red' },
                { id: 'n2_3', color: 'red' },
                { id: 'n3_8', color: 'green' },
              ],
              lines: [4],
              vars: [
                ['cycle', '8'],
                ['flushed', '2'],
              ],
            },
          ],
          caption: 'Predict-not-taken with the branch resolved in EX: a taken branch flushes the two instructions fetched behind it (red).',
        },
        {
          type: 'p',
          text: 'Flushing is safe because the wrong-path instructions have not reached MEM or WB yet: they have changed no register and no memory. That is the general rule for speculation in every CPU: **guess, but do not commit anything until the guess is confirmed**.',
        },
        {
          type: 'table',
          headers: ['Strategy', 'Cost per branch', 'Notes'],
          rows: [
            ['Always stall until resolved', '2 cycles, every branch', 'Simple and slow'],
            [
              'Predict not taken, flush if taken',
              '2 cycles per **taken** branch',
              'Loops are mostly taken branches: still costly',
            ],
            [
              'Resolve in ID with extra hardware',
              '1 cycle per taken branch',
              'Needs a comparator and forwarding into ID',
            ],
            [
              'Dynamic branch prediction',
              '~0 when right; full penalty when wrong',
              'What every modern CPU does (next lesson)',
            ],
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Branch delay slots',
          text: 'MIPS, an ancestor of RISC-V, hid this penalty with a **branch delay slot**: the instruction after a branch always executed, taken or not, and the compiler tried to put something useful there. It baked one particular pipeline into the ISA forever, and later deeper and out-of-order MIPS cores had to emulate it. RISC-V deliberately has no delay slots.',
        },
      ],
    },
    {
      kind: 'numeric',
      prompt: 'A program on the five-stage pipeline has an ideal CPI of 1. 20% of its instructions are branches, 60% of branches are taken, and each taken branch costs 2 flushed cycles (predict not taken). What is the effective CPI? Give 2 decimal places.',
      answer: 1.24,
      tolerance: 0.005,
      label: 'CPI =',
      hint: 'Extra cycles per instruction = fraction of instructions that are taken branches × penalty.',
      explanation: 'CPI = 1 + 0.20 × 0.60 × 2 = 1 + 0.24 = 1.24. A quarter more time, from a two-cycle penalty! Scale the penalty to the 15 to 20 cycles of a modern deep pipeline and it is clear why real CPUs need predictors that are right far more than 40% of the time.',
    },
    {
      kind: 'truefalse',
      prompt: 'In the classic five-stage pipeline, forwarding eliminates all stalls caused by data hazards.',
      answer: false,
      explanation: 'Forwarding removes stalls between ALU instructions, but a load\'s value exists only after MEM. An instruction that uses it immediately needs it at the start of its EX, which is the same cycle the load is still reading memory, so one stall remains (the load-use hazard). Scheduling an independent instruction into that slot is the cure.',
    },
    {
      kind: 'concept',
      title: 'Hazards in the C++ you write',
      blocks: [
        {
          type: 'p',
          text: 'You never see hazards as wrong answers; you see them as **lost cycles**. The pattern to recognize is a **dependency chain**: each operation needs the result of the one before it, so no amount of hardware cleverness can overlap them. Two everyday examples:',
        },
        {
          type: 'compare',
          left: {
            title: 'Chain: each load waits for the last',
            tone: 'bad',
            code: `// Linked list of enemies
for (Enemy* e = head; e; e = e->next)
    total += e->hp;   // next address comes
                      // from the previous load`,
          },
          right: {
            title: 'Independent: addresses are arithmetic',
            tone: 'good',
            code: `// Array of enemies
for (const Enemy& e : enemies)
    total += e.hp;    // address of e[i+1] needs
                      // no load to compute`,
          },
        },
        {
          type: 'p',
          text: 'In the linked list, the address of node *i* + 1 is *inside* node *i*, so loads form a strict load-use chain; every cache miss is paid in full, one after another. In the array, the hardware (and the compiler) can start loads for many elements at once. The `total += ...` additions also form a chain, a short one that the next unit shows how to break with multiple accumulators.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why data layout is a pipeline issue too',
          text: 'A pipeline, and later an out-of-order core, can only overlap work that is independent. Your data structures decide how much independent work exists. Arrays, structure-of-arrays layouts and batched updates are not just cache-friendly: they expose parallelism the hardware can actually use.',
        },
      ],
    },
  ],
  takeaways: [
    'Hazards occur when overlapped instructions conflict: **structural** (same hardware), **data** (result not written yet) and **control** (next PC unknown).',
    'Stalling is always correct but slow: without forwarding, each read-after-write dependence costs 2 cycles in the five-stage pipeline.',
    '**Forwarding** routes results from the EX/MEM and MEM/WB pipeline registers to the ALU, removing ALU-to-ALU stalls; the newest value must win.',
    'A **load-use hazard** still costs a stall, because the loaded value appears only after MEM; compilers hide it by scheduling independent instructions.',
    'Predict-not-taken plus flushing handles branches until a better predictor arrives; the cost is the number of stages before the branch resolves.',
    'In C++, dependency chains (pointer chasing, single accumulators) cannot be overlapped; independent work in arrays can.',
  ],
  reading: [
    {
      title: 'Hazard (computer architecture) (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Hazard_(computer_architecture)',
      source: 'article',
      note: 'Structural, data (RAW, WAR, WAW) and control hazards with the standard fixes.',
    },
    {
      title: 'Operand forwarding (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Operand_forwarding',
      source: 'article',
      note: 'Short worked examples of bypass paths in a pipeline.',
    },
    {
      title: 'Computer Systems: A Programmer\'s Perspective (CS:APP)',
      url: 'https://csapp.cs.cmu.edu/',
      source: 'book',
      note: 'Section 4.5 handles data hazards with stalling and forwarding and load/use hazards in the PIPE processor.',
    },
    {
      title: 'Compiler Explorer',
      url: 'https://godbolt.org/',
      source: 'other',
      note: 'Compile a small function for a RISC-V target (for example RISC-V rv32gc gcc) and watch how loads are scheduled away from their uses.',
    },
  ],
};
