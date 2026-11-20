import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-datapath',
  title: 'The Datapath and Control',
  summary: 'Build a single-cycle RISC-V processor from registers, an ALU and memories, see why its clock is set by the slowest instruction, and run one in C++.',
  minutes: 18,
  objectives: [
    'Describe the fetch–decode–execute cycle and the five steps an instruction goes through',
    'Name the parts of a single-cycle datapath and trace `add`, `lw`, `sw` and `beq` through them',
    'Derive the control signals for each instruction class from its opcode',
    'Explain why the slowest instruction sets the clock period of a single-cycle design, and compute that period',
    'Read and extend a C++ simulator that decodes and executes real RISC-V machine code',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Two halves of every processor',
      blocks: [
        {
          type: 'p',
          text: 'In the ISA unit you learned what instructions *mean*: `add` adds two registers, `lw` loads a word, `beq` maybe jumps. This lesson builds the hardware that makes them happen. Surprisingly little is needed: a handful of storage elements, an ALU like the one you built in the logic unit, some multiplexers, and a small block of logic that decides what everything does.',
        },
        {
          type: 'p',
          text: 'Every processor splits into two halves. The [[datapath]] is where data flows and is transformed: registers, memories, the ALU and the wires between them. **Control** is the logic that, for each instruction, sets the switches on that datapath: which value goes into the ALU, whether memory is written, whether a register is updated.',
        },
        {
          type: 'p',
          text: 'The processor runs one loop forever, the **fetch–decode–execute cycle**. Written as C++, it looks like this:',
        },
        {
          type: 'code',
          title: 'The processor\'s main loop (pseudo-C++)',
          code: `while (true) {
    std::uint32_t instr = memory[pc];   // fetch
    Fields f = decode(instr);           // decode
    execute(f);                         // execute (+ memory, write back)
    pc = nextPc(f);                     // usually pc + 4
}`,
          annotations: [
            {
              lines: 1,
              text: 'Hardware does not "loop": this whole body happens once per clock cycle, forever, from power-on.',
            },
            {
              lines: 2,
              text: 'The [[program-counter]] (PC) holds the address of the current instruction. Instructions live in memory like any other data.',
            },
            {
              lines: 3,
              text: 'Decoding splits the 32-bit word into fields: opcode, register numbers, immediate. In hardware this is just wires, since each field sits at fixed bit positions.',
            },
            {
              lines: 5,
              text: 'Sequential code advances by 4 bytes (one RISC-V instruction). Branches and jumps put a different value here.',
            },
          ],
        },
        {
          type: 'p',
          text: 'For our RISC-V processor, executing one instruction takes up to five steps:',
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Fetch',
              text: 'Read the instruction at address PC from instruction memory.',
            },
            {
              title: 'Decode and read registers',
              text: 'Split out the fields and read up to two source registers (`rs1`, `rs2`).',
            },
            {
              title: 'Execute',
              text: 'The ALU computes: a sum, a difference, an address, or a comparison for a branch.',
            },
            {
              title: 'Memory',
              text: 'Loads read data memory, stores write it. Other instructions skip this step.',
            },
            {
              title: 'Write back',
              text: 'Write the result to the destination register `rd`, and update the PC.',
            },
          ],
        },
        {
          type: 'table',
          headers: ['Instruction', 'Format', 'Meaning'],
          rows: [
            ['`add rd, rs1, rs2` / `sub`', 'R', '`rd = rs1 + rs2` (or `-`)'],
            ['`addi rd, rs1, imm`', 'I', '`rd = rs1 + imm`'],
            ['`lw rd, imm(rs1)`', 'I', '`rd = Mem[rs1 + imm]`'],
            ['`sw rs2, imm(rs1)`', 'S', '`Mem[rs1 + imm] = rs2`'],
            ['`beq` / `bne rs1, rs2, off`', 'B', 'if equal / not equal: `pc = pc + off`'],
          ],
          caption: 'The RISC-V subset this unit uses. It is enough to run loops over arrays.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why split datapath and control?',
          text: 'The same wires serve every instruction. An `add` and a `lw` both read `rs1` and both use the ALU; they differ only in what feeds the ALU\'s second input and where the result goes. Separating a fixed datapath from a small control function means the expensive part (wires, ALU, register file) is built once and shared, while the per-instruction differences shrink to a truth table of a few bits. RISC-V helps on purpose: `rs1`, `rs2` and `rd` sit at the **same bit positions in every format**, so the register file can start reading before the processor even knows which instruction it has.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which part of the single-cycle datapath does `add x5, x6, x7` **not** use?',
      options: [
        {
          text: 'Instruction memory',
          why: 'Every instruction must be fetched first, so every instruction uses instruction memory.',
        },
        {
          text: 'The register file',
          why: '`add` reads two registers (`x6`, `x7`) and writes one (`x5`): it uses the register file twice.',
        },
        {
          text: 'Data memory',
          correct: true,
          why: '`add` works only on registers. Its result goes from the ALU straight back to the register file, so data memory sits idle (MemRead = MemWrite = 0).',
        },
        { text: 'The ALU', why: 'The ALU does the actual addition.' },
      ],
      explanation: 'Only loads and stores touch data memory. In a single-cycle design the data memory still exists during an `add`, it just is not enabled. That idle hardware is one of the inefficiencies pipelining will fix: in a pipeline, while one instruction uses the ALU, another can use data memory.',
    },
    {
      kind: 'concept',
      title: 'The building blocks',
      blocks: [
        {
          type: 'p',
          text: 'Here is the whole single-cycle datapath for our subset. Read it left to right: it is the five steps above, laid out in space.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 600 380">
<rect x="14" y="150" width="16" height="46" rx="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="22" y="164" font-size="9" text-anchor="middle">0</text>
<text x="22" y="190" font-size="9" text-anchor="middle">1</text>
<rect x="44" y="160" width="34" height="50" rx="4" class="f-gray" fill-opacity="0.12" stroke="none"/>
<rect x="44" y="160" width="34" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="61" y="189.2" font-size="12" text-anchor="middle" font-weight="600">PC</text>
<polyline points="30,175 38.4,175" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M44,175 L37,178.2 L37,171.8 Z" fill="currentColor" stroke="none"/>
<rect x="104" y="150" width="82" height="100" rx="4" class="f-gray" fill-opacity="0.12" stroke="none"/>
<rect x="104" y="150" width="82" height="100" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="145" y="197" font-size="11" text-anchor="middle" font-weight="600">Instruction</text>
<text x="145" y="210.7" font-size="11" text-anchor="middle" font-weight="600">memory</text>
<polyline points="78,185 98.4,185" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M104,185 L97,188.2 L97,181.8 Z" fill="currentColor" stroke="none"/>
<polygon points="100,40 134,56.8 134,79.2 100,96 100,73.6 111.9,68 100,62.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
<text x="121.1" y="72.5" font-size="13" text-anchor="middle" font-weight="700">+</text>
<polyline points="90,185 90,52 94.4,52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M100,52 L93,55.1 L93,48.9 Z" fill="currentColor" stroke="none"/>
<circle cx="90" cy="185" r="2.6" fill="currentColor"/>
<text x="88" y="82" font-size="11" text-anchor="end">4</text>
<polyline points="78,84 94.4,84" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M100,84 L93,87.2 L93,80.8 Z" fill="currentColor" stroke="none"/>
<polyline points="134,68 150,68 150,22 8,22 8,162 8.4,162" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M14,162 L7,165.2 L7,158.8 Z" fill="currentColor" stroke="none"/>
<rect x="240" y="140" width="92" height="130" rx="4" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="240" y="140" width="92" height="130" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="286" y="262" font-size="11" text-anchor="middle" font-weight="700">Registers</text>
<text x="244" y="160" font-size="9" text-anchor="start">rs1</text>
<text x="244" y="186" font-size="9" text-anchor="start">rs2</text>
<text x="244" y="212" font-size="9" text-anchor="start">rd</text>
<text x="244" y="238" font-size="9" text-anchor="start">wdata</text>
<text x="328" y="170" font-size="9" text-anchor="end">r1</text>
<text x="328" y="216" font-size="9" text-anchor="end">r2</text>
<polyline points="186,200 206,200 206,156 234.4,156" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M240,156 L233,159.2 L233,152.8 Z" fill="currentColor" stroke="none"/>
<polyline points="206,182 234.4,182" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M240,182 L233,185.2 L233,178.8 Z" fill="currentColor" stroke="none"/>
<polyline points="206,208 234.4,208" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M240,208 L233,211.2 L233,204.8 Z" fill="currentColor" stroke="none"/>
<circle cx="206" cy="182" r="2.6" fill="currentColor"/>
<circle cx="206" cy="200" r="2.6" fill="currentColor"/>
<circle cx="206" cy="208" r="2.6" fill="currentColor"/>
<text x="200" y="146" font-size="9" text-anchor="middle" font-style="italic">instruction</text>
<ellipse cx="286" cy="314" rx="40" ry="16" class="f-purple" fill-opacity="0.12" stroke="none"/>
<ellipse cx="286" cy="314" rx="40" ry="16" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="286" y="317.5" font-size="10" text-anchor="middle" font-weight="600">Imm gen</text>
<polyline points="206,208 206,314 240.4,314" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M246,314 L239,317.1 L239,310.9 Z" fill="currentColor" stroke="none"/>
<rect x="366" y="200" width="16" height="46" rx="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="374" y="214" font-size="9" text-anchor="middle">0</text>
<text x="374" y="240" font-size="9" text-anchor="middle">1</text>
<polyline points="332,212 360.4,212" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M366,212 L359,215.2 L359,208.8 Z" fill="currentColor" stroke="none"/>
<polyline points="326,314 356,314 356,238 360.4,238" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M366,238 L359,241.2 L359,234.8 Z" fill="currentColor" stroke="none"/>
<polygon points="400,150 448,181.2 448,222.8 400,254 400,212.4 416.8,202 400,191.6" class="f-orange" fill-opacity="0.12" stroke="none"/>
<polygon points="400,150 448,181.2 448,222.8 400,254 400,212.4 416.8,202 400,191.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
<text x="429.8" y="206.2" font-size="12" text-anchor="middle" font-weight="700">ALU</text>
<polyline points="332,166 394.4,166" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M400,166 L393,169.2 L393,162.8 Z" fill="currentColor" stroke="none"/>
<polyline points="382,224 394.4,224" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M400,224 L393,227.2 L393,220.8 Z" fill="currentColor" stroke="none"/>
<rect x="478" y="168" width="76" height="96" rx="4" class="f-gray" fill-opacity="0.12" stroke="none"/>
<rect x="478" y="168" width="76" height="96" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="516" y="213" font-size="11" text-anchor="middle" font-weight="600">Data</text>
<text x="516" y="226.7" font-size="11" text-anchor="middle" font-weight="600">memory</text>
<polyline points="448,202 472.4,202" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M478,202 L471,205.2 L471,198.8 Z" fill="currentColor" stroke="none"/>
<text x="482" y="198" font-size="9" text-anchor="middle"></text>
<text x="484" y="184" font-size="9" text-anchor="start">addr</text>
<polyline points="348,212 348,278 466,278 466,246 472.4,246" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M478,246 L471,249.2 L471,242.8 Z" fill="currentColor" stroke="none"/>
<circle cx="348" cy="212" r="2.6" fill="currentColor"/>
<text x="484" y="250" font-size="9" text-anchor="start">wdata</text>
<rect x="570" y="196" width="16" height="46" rx="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="578" y="210" font-size="9" text-anchor="middle">0</text>
<text x="578" y="236" font-size="9" text-anchor="middle">1</text>
<polyline points="554,230 564.4,230" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M570,230 L563,233.2 L563,226.8 Z" fill="currentColor" stroke="none"/>
<polyline points="462,202 462,156 562,156 562,208 564.4,208" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M570,208 L563,211.2 L563,204.8 Z" fill="currentColor" stroke="none"/>
<circle cx="462" cy="202" r="2.6" fill="currentColor"/>
<polyline points="586,219 594,219 594,360 226,360 226,234 234.4,234" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M240,234 L233,237.2 L233,230.8 Z" fill="currentColor" stroke="none"/>
<polygon points="400,40 434,56.8 434,79.2 400,96 400,73.6 411.9,68 400,62.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
<text x="421.1" y="72.5" font-size="13" text-anchor="middle" font-weight="700">+</text>
<polyline points="90,120 380,120 380,52 394.4,52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M400,52 L393,55.1 L393,48.9 Z" fill="currentColor" stroke="none"/>
<circle cx="90" cy="120" r="2.6" fill="currentColor"/>
<polyline points="356,314 356,84 394.4,84" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M400,84 L393,87.2 L393,80.8 Z" fill="currentColor" stroke="none"/>
<circle cx="356" cy="314" r="2.6" fill="currentColor"/>
<text x="362" y="100" font-size="9" text-anchor="middle"></text>
<polyline points="434,68 452,68 452,10 2,10 2,186 8.4,186" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M14,186 L7,189.2 L7,182.8 Z" fill="currentColor" stroke="none"/>
<ellipse cx="250" cy="56" rx="46" ry="22" class="f-blue" fill-opacity="0.12" stroke="none"/>
<ellipse cx="250" cy="56" rx="46" ry="22" fill="none" class="s-blue" stroke-width="1.6"/>
<text x="250" y="59.9" font-size="11" text-anchor="middle" font-weight="600">Control</text>
<polyline points="206,156 206,56 209.6,56" fill="none" class="s-blue" stroke-width="1.2" stroke-linejoin="round"/>
<path d="M204,56 L211,52.9 L211,59.1 Z" class="f-blue" stroke="none"/>
<text x="212" y="110" font-size="9" text-anchor="start" class="t-blue">opcode</text>
<polyline points="296,56 300,56 300,131.2" fill="none" class="s-blue" stroke-width="1.1" stroke-linejoin="round" stroke-dasharray="3 3"/>
<path d="M300,136 L297.3,130 L302.7,130 Z" class="f-blue" stroke="none"/>
<text x="304" y="100" font-size="9" text-anchor="start" class="t-blue">RegWrite</text>
<polyline points="374,136 374,193.2" fill="none" class="s-blue" stroke-width="1.1" stroke-linejoin="round" stroke-dasharray="3 3"/>
<path d="M374,198 L371.3,192 L376.7,192 Z" class="f-blue" stroke="none"/>
<text x="374" y="132" font-size="9" text-anchor="middle" class="t-blue">ALUSrc</text>
<polyline points="516,134 516,161.2" fill="none" class="s-blue" stroke-width="1.1" stroke-linejoin="round" stroke-dasharray="3 3"/>
<path d="M516,166 L513.3,160 L518.7,160 Z" class="f-blue" stroke="none"/>
<text x="516" y="130" font-size="9" text-anchor="middle" class="t-blue">MemRead/Write</text>
<polyline points="578,266 578,248.8" fill="none" class="s-blue" stroke-width="1.1" stroke-linejoin="round" stroke-dasharray="3 3"/>
<path d="M578,244 L580.7,250 L575.3,250 Z" class="f-blue" stroke="none"/>
<text x="574" y="278" font-size="9" text-anchor="middle" class="t-blue">MemtoReg</text>
<text x="22" y="146" font-size="9" text-anchor="middle" class="t-blue">PCSrc</text>
<polyline points="424,242 424,257.2" fill="none" class="s-blue" stroke-width="1.1" stroke-linejoin="round"/>
<path d="M424,262 L421.3,256 L426.7,256 Z" class="f-blue" stroke="none"/>
<text x="428" y="272" font-size="9" text-anchor="start" class="t-blue">Zero → PCSrc</text>
<text x="437" y="34" font-size="9" text-anchor="end">PC + imm</text>
<text x="154" y="36" font-size="9" text-anchor="start">PC + 4</text>
</svg>`,
          alt: 'Single-cycle RISC-V datapath: PC feeds instruction memory and a +4 adder; instruction fields feed the register file, immediate generator and control; register values and the immediate feed the ALU through the ALUSrc mux; the ALU feeds data memory and the MemtoReg mux, which writes back to the register file; a branch adder and the PCSrc mux choose the next PC.',
          caption: 'Black wires carry data, blue dashed lines are control signals. Each mux picks one of its inputs; the number beside each input is the control value that selects it.',
        },
        {
          type: 'table',
          headers: ['Part', 'What it does', 'Kind'],
          rows: [
            [
              'PC',
              'A 32-bit register holding the current instruction\'s address. Loads a new value at every clock edge.',
              'State',
            ],
            [
              'Instruction memory',
              'Given an address, outputs the 32-bit instruction there.',
              'State (read only here)',
            ],
            [
              'Register file',
              '32 registers. Two read ports (`rs1`, `rs2`) and one write port (`rd`), written at the clock edge if RegWrite = 1. `x0` always reads 0.',
              'State',
            ],
            [
              'Immediate generator',
              'Pulls the immediate bits out of the instruction and sign-extends them to 32 bits.',
              'Combinational',
            ],
            [
              'ALU',
              'Adds, subtracts, ANDs, ORs; raises a **Zero** output when the result is 0.',
              'Combinational',
            ],
            [
              'Data memory',
              'Reads (MemRead) or writes (MemWrite) one word at the address the ALU computed.',
              'State',
            ],
            [
              'Muxes',
              'ALUSrc: register or immediate into the ALU. MemtoReg: ALU result or loaded data to the register file. PCSrc: PC + 4 or the branch target.',
              'Combinational',
            ],
          ],
        },
        {
          type: 'p',
          text: 'Two kinds of element appear here, and the difference is the key to how the design works. **State elements** (PC, register file, memories) hold values from one cycle to the next and only change at a clock edge. **Combinational logic** (ALU, adders, muxes, immediate generator) just computes outputs from inputs, continuously. During a cycle, values ripple from the state elements through the logic; at the end of the cycle, the clock edge captures the results into the state elements. That is exactly the register-plus-logic pattern from the sequential logic lesson, scaled up to a CPU.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Two memories?',
          text: 'Real chips do not have two separate memories. But they do have separate **L1 instruction and L1 data caches**, so the core can fetch an instruction and load data in the same cycle, which is the same reason this design has two memories. You will meet caches in the memory hierarchy unit.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Following instructions through the datapath',
      blocks: [
        {
          type: 'p',
          text: 'Step through three consecutive instructions. Watch which parts light up for each one: the datapath is the same, only the control settings change.',
        },
        {
          type: 'algo',
          view: 'graph',
          width: 470,
          height: 270,
          nodes: [
            { id: 'PCM', x: 40, y: 40, label: 'mux' },
            { id: 'PC', x: 40, y: 150, label: 'PC' },
            { id: 'P4', x: 130, y: 80, label: '+4' },
            { id: 'IM', x: 120, y: 205, label: 'IM' },
            { id: 'BR', x: 300, y: 40, label: '+' },
            { id: 'RF', x: 220, y: 150, label: 'Reg' },
            { id: 'IMM', x: 220, y: 235, label: 'Imm' },
            { id: 'ALU', x: 320, y: 150, label: 'ALU' },
            { id: 'DM', x: 410, y: 235, label: 'DM' },
            { id: 'WB', x: 430, y: 40, label: 'mux' },
          ],
          edges: [
            { from: 'PC', to: 'IM', directed: true },
            { from: 'PC', to: 'P4', directed: true },
            { from: 'P4', to: 'PCM', directed: true },
            { from: 'PC', to: 'BR', directed: true },
            { from: 'IMM', to: 'BR', directed: true },
            { from: 'BR', to: 'PCM', directed: true },
            { from: 'PCM', to: 'PC', directed: true },
            { from: 'IM', to: 'RF', directed: true },
            { from: 'IM', to: 'IMM', directed: true },
            { from: 'RF', to: 'ALU', directed: true },
            { from: 'IMM', to: 'ALU', directed: true },
            { from: 'RF', to: 'DM', directed: true },
            { from: 'ALU', to: 'DM', directed: true },
            { from: 'ALU', to: 'WB', directed: true },
            { from: 'DM', to: 'WB', directed: true },
            { from: 'WB', to: 'RF', directed: true },
          ],
          code: `0x0C  lw   x5, 8(x10)
0x10  add  x7, x5, x6
0x14  beq  x7, x0, +12
0x18  ...`,
          lang: 'text',
          interval: 1600,
          frames: [
            {
              note: '**Fetch.** The PC sends `0x0C` to instruction memory, which returns the 32-bit `lw` word. In parallel, an adder computes PC + 4.',
              lines: [1],
              edgeColors: [
                { from: 'PC', to: 'IM', color: 'orange' },
                { from: 'PC', to: 'P4', color: 'orange' },
              ],
              nodeColors: [
                { id: 'PC', color: 'orange' },
                { id: 'IM', color: 'orange' },
                { id: 'P4', color: 'orange' },
              ],
              nodeNotes: [
                { id: 'PC', text: '0x0C' },
                { id: 'P4', text: '0x10' },
              ],
              vars: [
                ['instruction', '`lw x5, 8(x10)`'],
                ['cycle', '1'],
              ],
            },
            {
              note: '**Decode.** The register fields go to the register file (read `x10`); the immediate generator extracts and sign-extends `8`.',
              lines: [1],
              edgeColors: [
                { from: 'IM', to: 'RF', color: 'orange' },
                { from: 'IM', to: 'IMM', color: 'orange' },
              ],
              nodeColors: [
                { id: 'RF', color: 'orange' },
                { id: 'IMM', color: 'orange' },
              ],
              nodeNotes: [
                { id: 'RF', text: 'x10=0x100' },
                { id: 'IMM', text: '8' },
              ],
              vars: [
                ['instruction', '`lw x5, 8(x10)`'],
                ['cycle', '1'],
              ],
            },
            {
              note: '**Execute.** ALUSrc = 1, so the ALU adds the register to the immediate: the address `0x108`.',
              lines: [1],
              edgeColors: [
                { from: 'RF', to: 'ALU', color: 'orange' },
                { from: 'IMM', to: 'ALU', color: 'orange' },
              ],
              nodeColors: [
                { id: 'ALU', color: 'orange' },
              ],
              nodeNotes: [
                { id: 'ALU', text: '0x108' },
              ],
              vars: [
                ['instruction', '`lw x5, 8(x10)`'],
                ['ALUSrc', '1'],
              ],
            },
            {
              note: '**Memory.** MemRead = 1: data memory reads the word at `0x108`.',
              lines: [1],
              edgeColors: [
                { from: 'ALU', to: 'DM', color: 'orange' },
              ],
              nodeColors: [
                { id: 'DM', color: 'orange' },
              ],
              nodeNotes: [
                { id: 'DM', text: '[0x108]=42' },
              ],
              vars: [
                ['instruction', '`lw x5, 8(x10)`'],
                ['MemRead', '1'],
              ],
            },
            {
              note: '**Write back.** MemtoReg = 1 picks the loaded value; RegWrite = 1 stores 42 in `x5` at the clock edge. The PC takes PC + 4.',
              lines: [1],
              edgeColors: [
                { from: 'DM', to: 'WB', color: 'green' },
                { from: 'WB', to: 'RF', color: 'green' },
                { from: 'P4', to: 'PCM', color: 'green' },
                { from: 'PCM', to: 'PC', color: 'green' },
              ],
              nodeColors: [
                { id: 'WB', color: 'green' },
                { id: 'RF', color: 'green' },
                { id: 'PC', color: 'green' },
              ],
              nodeNotes: [
                { id: 'RF', text: 'x5=42' },
                { id: 'PC', text: '0x10' },
              ],
              vars: [
                ['instruction', '`lw x5, 8(x10)`'],
                ['RegWrite', '1'],
                ['MemtoReg', '1'],
                ['cycle ends', '1'],
              ],
            },
            {
              note: '**Next cycle: `add`.** Fetch and decode as before, but both ALU inputs now come from registers (ALUSrc = 0): 42 + 7.',
              lines: [2],
              edgeColors: [
                { from: 'PC', to: 'IM', color: 'orange' },
                { from: 'IM', to: 'RF', color: 'orange' },
                { from: 'RF', to: 'ALU', color: 'orange' },
              ],
              nodeColors: [
                { id: 'IM', color: 'orange' },
                { id: 'RF', color: 'orange' },
                { id: 'ALU', color: 'orange' },
              ],
              nodeNotes: [
                { id: 'PC', text: '0x10' },
                { id: 'RF', text: 'x5=42 x6=7' },
                { id: 'ALU', text: '49' },
              ],
              vars: [
                ['instruction', '`add x7, x5, x6`'],
                ['ALUSrc', '0'],
                ['cycle', '2'],
              ],
            },
            {
              note: '`add` **skips data memory**: MemtoReg = 0 routes the ALU result straight to the register file, so `x7 = 49`.',
              lines: [2],
              edgeColors: [
                { from: 'ALU', to: 'WB', color: 'green' },
                { from: 'WB', to: 'RF', color: 'green' },
                { from: 'P4', to: 'PCM', color: 'green' },
                { from: 'PCM', to: 'PC', color: 'green' },
              ],
              nodeColors: [
                { id: 'WB', color: 'green' },
                { id: 'RF', color: 'green' },
                { id: 'DM', color: 'gray' },
              ],
              nodeNotes: [
                { id: 'RF', text: 'x7=49' },
                { id: 'PC', text: '0x14' },
              ],
              vars: [
                ['instruction', '`add x7, x5, x6`'],
                ['MemtoReg', '0'],
                ['MemRead', '0'],
              ],
            },
            {
              note: '**Cycle 3: `beq`.** The ALU subtracts `x7 - x0` = 49; the result is not zero, so the branch is **not taken**.',
              lines: [3],
              edgeColors: [
                { from: 'PC', to: 'IM', color: 'orange' },
                { from: 'IM', to: 'RF', color: 'orange' },
                { from: 'RF', to: 'ALU', color: 'orange' },
              ],
              nodeColors: [
                { id: 'ALU', color: 'orange' },
              ],
              nodeNotes: [
                { id: 'PC', text: '0x14' },
                { id: 'ALU', text: '49 (≠0)' },
              ],
              vars: [
                ['instruction', '`beq x7, x0, +12`'],
                ['Branch', '1'],
                ['Zero', '0'],
              ],
            },
            {
              note: 'Meanwhile a separate adder computed the target PC + 12 = `0x20`. Branch = 1 but Zero = 0, so the PC mux picks PC + 4 = `0x18`. Nothing is written.',
              lines: [3],
              edgeColors: [
                { from: 'PC', to: 'BR', color: 'blue' },
                { from: 'IMM', to: 'BR', color: 'blue' },
                { from: 'P4', to: 'PCM', color: 'green' },
                { from: 'PCM', to: 'PC', color: 'green' },
              ],
              nodeColors: [
                { id: 'BR', color: 'blue' },
                { id: 'PCM', color: 'green' },
                { id: 'PC', color: 'green' },
              ],
              nodeNotes: [
                { id: 'BR', text: '0x20' },
                { id: 'PC', text: '0x18' },
              ],
              vars: [
                ['instruction', '`beq x7, x0, +12`'],
                ['RegWrite', '0'],
                ['next PC', '0x18'],
              ],
            },
          ],
          caption: 'Three instructions on the single-cycle datapath. Orange marks the parts working in this step, green the results being written at the end of the cycle.',
        },
        {
          type: 'p',
          text: 'Notice three things. First, `lw` is the only one of the three that uses every block in the chain: instruction memory, register file, ALU, data memory, then the register file again. Second, the PC + 4 adder and the branch-target adder work **every cycle**, whether or not the instruction is a branch; the PCSrc mux simply picks which result to keep. Third, nothing waits: in a single-cycle machine all of this happens within one clock period, and the register write and the PC update both happen at the edge that ends the cycle.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Branches are cheap in hardware',
          text: 'A branch is just an ALU subtraction plus a mux. `beq` computes `rs1 - rs2`; if the ALU\'s Zero output is 1 **and** the instruction is a branch, PCSrc selects the target. `bne` uses the opposite test. That AND gate is the whole "decision".',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Put the work of `lw x5, 8(x10)` in the order the data flows through the single-cycle datapath.',
      linesAreCode: false,
      lines: [
        'Read the instruction word from instruction memory at address PC',
        'Read `x10` from the register file and sign-extend the immediate 8',
        'The ALU adds `x10 + 8` to form the address',
        'Data memory reads the word at that address',
        'The MemtoReg mux selects the loaded word and it is written into `x5` at the clock edge',
      ],
      explanation: 'Each step needs the previous one\'s output: you cannot read registers before you know which registers, compute an address before you have the base, or read memory before you have the address. That chain of dependencies is also why `lw` is the slowest instruction: its signal must pass through every block in series. (Computing PC + 4 happens in parallel with all of this, which is why it is not in the list.)',
    },
    {
      kind: 'concept',
      title: 'Control: a truth table in hardware',
      blocks: [
        {
          type: 'p',
          text: 'The control unit looks only at the 7-bit **opcode** (plus `funct3`/`funct7` for the ALU operation) and produces a handful of one-bit signals. For our subset the whole control unit is this table:',
        },
        {
          type: 'table',
          headers: ['Signal', 'R-type', '`addi`', '`lw`', '`sw`', '`beq`/`bne`', 'Meaning when 1'],
          rows: [
            ['RegWrite', '1', '1', '1', '0', '0', 'write `rd` at the clock edge'],
            ['ALUSrc', '0', '1', '1', '1', '0', 'ALU input B = immediate (else `rs2`)'],
            ['MemRead', '0', '0', '1', '0', '0', 'read data memory'],
            ['MemWrite', '0', '0', '0', '1', '0', 'write data memory'],
            [
              'MemtoReg',
              '0',
              '0',
              '1',
              'X',
              'X',
              'write back loaded data (else ALU result)',
            ],
            [
              'Branch',
              '0',
              '0',
              '0',
              '0',
              '1',
              'take the target if the comparison succeeds',
            ],
          ],
          caption: 'X = "don\'t care": the instruction writes no register, so the mux\'s choice does not matter.',
        },
        {
          type: 'p',
          text: 'In the C++ simulator later in this lesson the control unit is literally a `switch` over the opcode that returns these bits:',
        },
        {
          type: 'code',
          title: 'The control unit as code',
          code: `struct Control {
    bool regWrite, aluSrc, memRead, memWrite, memToReg, branch;
};
Control control(u32 opcode) {
    switch (opcode) {
    case 0x33: return {true, false, false, false, false, false};
    case 0x13: return {true, true, false, false, false, false};
    case 0x03: return {true, true, true, false, true, false};
    case 0x23: return {false, true, false, true, false, false};
    case 0x63: return {false, false, false, false, false, true};
    }
    return {};
}`,
          annotations: [
            {
              lines: 6,
              text: 'Opcode `0x33` is R-type (`add`, `sub`): both ALU inputs from registers, result written back.',
            },
            {
              lines: 7,
              text: '`0x13` is `addi`: like R-type, but ALUSrc = 1 feeds the immediate to the ALU.',
            },
            {
              lines: 8,
              text: '`0x03` is `lw`, the only row that sets MemRead and MemtoReg.',
            },
            {
              lines: 9,
              text: '`0x23` is `sw`: no register write, MemWrite = 1. The don\'t-care MemtoReg is simply `false`.',
            },
            {
              lines: 10,
              text: '`0x63` covers the branches. `funct3` (0 for `beq`, 1 for `bne`) picks the test later.',
            },
          ],
        },
        {
          type: 'p',
          text: 'A second, smaller decoder, **ALU control**, turns the instruction class plus `funct3`/`funct7` into the ALU operation: add for loads, stores and `addi`; subtract for branches; whatever `funct3`/`funct7` say for R-type. Splitting control into two levels keeps each piece tiny.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why can control be so simple?',
          text: 'Every entry is a Boolean function of a few opcode bits, so the control unit is a small block of combinational logic, with no memory and no sequencing. That is **hardwired control**. ISAs with complex, variable-length instructions, like x86, instead decode each instruction into simpler internal operations called [[micro-op|micro-ops]], and use a **microcode** ROM for the rare very complex ones. The datapath that runs those micro-ops looks a lot like this one.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the description of the control settings for `lw x5, 8(x10)`.',
      templateIsCode: false,
      template: 'To execute `lw`, ___ = 1 makes the immediate the ALU\'s second input, ___ = 1 reads data memory, and ___ = 1 routes the loaded word, not the ALU result, to the register file.',
      blanks: [
        {
          answers: ['ALUSrc'],
        },
        {
          answers: ['MemRead'],
        },
        {
          answers: ['MemtoReg'],
        },
      ],
      wordBank: ['ALUSrc', 'MemRead', 'MemtoReg', 'MemWrite', 'Branch', 'PCSrc'],
      explanation: 'A load computes `base + offset` (so the ALU needs the immediate: ALUSrc), reads memory at that address (MemRead), and writes the **memory** data back (MemtoReg). RegWrite is 1 too. MemWrite would turn it into a store, and Branch only matters for `beq`/`bne`.',
    },
    {
      kind: 'concept',
      title: 'A tiny CPU in C++',
      blocks: [
        {
          type: 'p',
          text: 'Now build one. This program assembles a short RISC-V loop into real 32-bit machine code, then runs it on a simulated single-cycle processor: one loop iteration per clock cycle, with the same fetch, decode, control, ALU, memory and write-back steps as the hardware. The program sums four numbers in data memory.',
        },
        {
          type: 'code',
          title: 'single_cycle_cpu.cpp',
          code: `#include <array>
#include <cstdint>
#include <format>
#include <iostream>
#include <vector>

using u32 = std::uint32_t;

// --- What an assembler does: pack fields into 32-bit words -------
u32 R(u32 f7, u32 rs2, u32 rs1, u32 f3, u32 rd, u32 op) {
    return f7 << 25 | rs2 << 20 | rs1 << 15 | f3 << 12 | rd << 7 | op;
}
u32 I(int imm, u32 rs1, u32 f3, u32 rd, u32 op) {
    return (u32(imm) & 0xFFF) << 20 | rs1 << 15 | f3 << 12 | rd << 7
         | op;
}
u32 S(int imm, u32 rs2, u32 rs1, u32 f3, u32 op) {
    u32 i = u32(imm);
    return (i >> 5 & 0x7F) << 25 | rs2 << 20 | rs1 << 15 | f3 << 12
         | (i & 0x1F) << 7 | op;
}
u32 B(int imm, u32 rs2, u32 rs1, u32 f3) {
    u32 i = u32(imm);
    return (i >> 12 & 1) << 31 | (i >> 5 & 0x3F) << 25 | rs2 << 20
         | rs1 << 15 | f3 << 12 | (i >> 1 & 0xF) << 8
         | (i >> 11 & 1) << 7 | 0x63;
}

// --- Control: one row of the truth table per opcode --------------
struct Control {
    bool regWrite, aluSrc, memRead, memWrite, memToReg, branch;
};
Control control(u32 opcode) {
    switch (opcode) {
    case 0x33: return {true, false, false, false, false, false};
    case 0x13: return {true, true, false, false, false, false};
    case 0x03: return {true, true, true, false, true, false};
    case 0x23: return {false, true, false, true, false, false};
    case 0x63: return {false, false, false, false, false, true};
    }
    return {};
}

// --- Immediate generator: reassemble and sign-extend -------------
std::int32_t immediate(u32 ins) {
    switch (ins & 0x7F) {
    case 0x13: case 0x03:                       // I-type
        return std::int32_t(ins) >> 20;
    case 0x23:                                  // S-type
        return (std::int32_t(ins) >> 25 << 5) | (ins >> 7 & 0x1F);
    case 0x63: {                                // B-type
        u32 v = (ins >> 31 & 1) << 12 | (ins >> 7 & 1) << 11
              | (ins >> 25 & 0x3F) << 5 | (ins >> 8 & 0xF) << 1;
        return std::int32_t(v << 19) >> 19;     // sign-extend 13 bits
    }
    }
    return 0;
}

int main() {
    // Sum four words starting at 0x100, store the total at 0x110.
    const std::vector<u32> imem = {
        I(0x100, 0, 0, 10, 0x13),   // 0x00 addi x10, x0, 0x100
        I(4, 0, 0, 11, 0x13),       // 0x04 addi x11, x0, 4
        I(0, 0, 0, 5, 0x13),        // 0x08 addi x5,  x0, 0
        I(0, 10, 2, 6, 0x03),       // 0x0C lw   x6, 0(x10)
        R(0, 6, 5, 0, 5, 0x33),     // 0x10 add  x5, x5, x6
        I(4, 10, 0, 10, 0x13),      // 0x14 addi x10, x10, 4
        I(-1, 11, 0, 11, 0x13),     // 0x18 addi x11, x11, -1
        B(-16, 0, 11, 1),           // 0x1C bne  x11, x0, -16
        S(0, 5, 10, 2, 0x23),       // 0x20 sw   x5, 0(x10)
    };
    std::array<std::int32_t, 32> reg{};
    std::array<std::int32_t, 128> dmem{};  // 512 bytes, as words
    dmem[0x100 / 4] = 10; dmem[0x104 / 4] = 20;
    dmem[0x108 / 4] = 30; dmem[0x10C / 4] = 40;

    u32 pc = 0;
    int cycles = 0;
    while (pc < imem.size() * 4) {      // one iteration = one cycle
        u32 ins = imem[pc / 4];                           // fetch
        u32 op = ins & 0x7F, rd = ins >> 7 & 0x1F;        // decode
        u32 f3 = ins >> 12 & 7, rs1 = ins >> 15 & 0x1F;
        u32 rs2 = ins >> 20 & 0x1F, f7 = ins >> 25;
        Control c = control(op);
        std::int32_t imm = immediate(ins);
        std::int32_t a = reg[rs1];                        // read regs
        std::int32_t b = c.aluSrc ? imm : reg[rs2];
        bool sub = op == 0x63 || (op == 0x33 && f7 == 0x20);
        std::int32_t y = sub ? a - b : a + b;             // execute
        std::int32_t loaded = 0;
        if (c.memRead) loaded = dmem[u32(y) / 4];         // memory
        if (c.memWrite) dmem[u32(y) / 4] = reg[rs2];
        if (c.regWrite && rd != 0)                        // write back
            reg[rd] = c.memToReg ? loaded : y;
        bool taken = c.branch && (f3 == 0 ? y == 0 : y != 0);
        if (cycles < 6)
            std::cout << std::format("cycle {:2}  pc=0x{:02X}  {:08X}\\n",
                                     cycles, pc, ins);
        pc = taken ? pc + imm : pc + 4;                   // next PC
        ++cycles;
    }
    std::cout << "...\\n";
    std::cout << std::format("sum at 0x110 = {}\\n", dmem[0x110 / 4]);
    std::cout << std::format("{} instructions, {} cycles, CPI = 1\\n",
                             cycles, cycles);
}`,
          runnable: true,
          output: `cycle  0  pc=0x00  10000513
cycle  1  pc=0x04  00400593
cycle  2  pc=0x08  00000293
cycle  3  pc=0x0C  00052303
cycle  4  pc=0x10  006282B3
cycle  5  pc=0x14  00450513
...
sum at 0x110 = 100
24 instructions, 24 cycles, CPI = 1`,
          annotations: [
            {
              lines: '10-27',
              text: 'The **assembler** side: pack each field into its bit positions. The B-format scrambles its immediate bits (see the deep dive below), which is why `B` is the messiest function.',
            },
            {
              lines: '33-42',
              text: 'The control unit: one row of the truth table per opcode.',
            },
            {
              lines: '45-58',
              text: 'The immediate generator. `std::int32_t(ins) >> 20` relies on arithmetic right shift of a negative value, which C++20 guarantees, to sign-extend the 12-bit I-type immediate.',
            },
            {
              lines: '63-71',
              text: 'The program, with its assembly in the comments. `x10` walks the array, `x11` counts down, `x5` accumulates. The loop is the five instructions from `0x0C` to `0x1C`.',
            },
            {
              lines: 81,
              text: '**Fetch**: the PC indexes instruction memory. `pc / 4` because instructions are 4 bytes and our memory is an array of words.',
            },
            {
              lines: '82-84',
              text: '**Decode**: pure bit slicing. In hardware these "computations" are just wires to fixed bit positions, which cost no time at all.',
            },
            {
              lines: '87-88',
              text: '**Register read** and the **ALUSrc mux**: the second operand is either `rs2` or the immediate.',
            },
            {
              lines: 90,
              text: '**Execute**: the ALU. Branches subtract so that Zero tells us whether the registers are equal.',
            },
            {
              lines: '92-93',
              text: '**Memory**: only loads and stores touch data memory.',
            },
            {
              lines: '94-95',
              text: '**Write back** through the MemtoReg mux. The `rd != 0` check implements the hardwired-zero register `x0`.',
            },
            {
              lines: 100,
              text: '**Next PC**: the PCSrc mux. Unsigned wraparound makes `pc + imm` work for negative (backward) offsets.',
            },
          ],
        },
        {
          type: 'p',
          text: 'The output shows the real encodings. `10000513` is `addi x10, x0, 256`, the exact word a RISC-V assembler emits for `li a0, 256` (`a0` is the ABI name of `x10`). The loop runs 4 times × 5 instructions, plus 3 setup instructions and 1 store: **24 instructions in 24 cycles**. In a single-cycle machine the CPI, the average [[cpi|cycles per instruction]], is exactly 1 by construction.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Emulators',
          text: 'This loop is exactly how an **interpreting emulator** works: fetch, decode with shifts and masks, dispatch on the opcode. It is also why interpreters are slow: every simulated instruction costs dozens of real ones. Emulators for game consoles therefore use **dynamic recompilation** (a JIT): they translate blocks of guest machine code into host machine code once and run that directly.',
        },
        {
          type: 'deepdive',
          title: 'Why does the B-format scramble its immediate bits?',
          blocks: [
            {
              type: 'p',
              text: 'Look at `B()`: immediate bit 11 goes to instruction bit 7, bits 4:1 to bits 11:8, bits 10:5 to bits 30:25 and bit 12 to bit 31. It looks perverse, but it serves the hardware. The **sign bit is always instruction bit 31** in every format, so sign extension can start before decoding finishes. And most immediate bits land in the **same instruction positions as in the S-format**, so the immediate generator needs fewer multiplexers. RISC-V trades a little assembler complexity (software, written once) for a simpler, faster decoder (hardware, run billions of times a second).',
            },
            {
              type: 'p',
              text: 'Branch offsets are always even (instructions are at least 2 bytes apart with the compressed extension), so bit 0 is not stored at all: a 12-bit field covers ±4 KiB of branch range.',
            },
          ],
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'A teammate rewrote the write-back step of the simulator. Programs now give wrong answers whenever they use `addi x0, x0, 1` as padding or compare against zero. Tap the faulty line.',
      code: `// write back
if (c.regWrite)
    reg[rd] = c.memToReg ? loaded : y;

// next PC
bool taken = c.branch && (f3 == 0 ? y == 0 : y != 0);
pc = taken ? pc + imm : pc + 4;`,
      bugLines: [2],
      explanation: 'RISC-V\'s `x0` must always read as 0; programs rely on it (`bne x11, x0, loop`, `addi x10, x0, 256`). The original simulator guarded the write with `rd != 0`. Without it, an instruction whose destination is `x0` (often used deliberately as a no-op or to discard a result) overwrites the zero, and every later comparison against `x0` and every `li`-style `addi rd, x0, imm` silently breaks. Real hardware implements the rule by simply having no storage behind register 0. Fix: `if (c.regWrite && rd != 0)`.',
    },
    {
      kind: 'concept',
      title: 'Why the slowest instruction sets the clock',
      blocks: [
        {
          type: 'p',
          text: 'A single-cycle processor must finish **every** instruction within one clock period, because the register file and PC update at the clock edge whether the instruction is done or not. So the period must be long enough for the slowest instruction\'s signals to ripple through every block on its path, which is called its [[critical-path|critical path]].',
        },
        {
          type: 'p',
          text: 'Use these classic textbook latencies (from Patterson & Hennessy) for each block, ignoring the muxes and the time to set up the registers:',
        },
        {
          type: 'table',
          headers: ['Instruction', 'Instr. mem', 'Reg read', 'ALU', 'Data mem', 'Reg write', 'Total'],
          rows: [
            ['R-type', '200 ps', '100 ps', '200 ps', '–', '100 ps', '600 ps'],
            ['`lw`', '200 ps', '100 ps', '200 ps', '200 ps', '100 ps', '**800 ps**'],
            ['`sw`', '200 ps', '100 ps', '200 ps', '200 ps', '–', '700 ps'],
            ['`beq`', '200 ps', '100 ps', '200 ps', '–', '–', '500 ps'],
          ],
        },
        {
          type: 'p',
          text: 'The clock period must be **800 ps** (1.25 GHz), set by `lw`. An `add` is done after 600 ps but still waits out the full 800; a `beq` wastes 300 ps of every 800. Suppose a program\'s mix is 25% loads, 10% stores, 45% R-type and 20% branches. If each instruction could take only as long as it needs, the average would be:',
        },
        {
          type: 'code',
          title: 'Average instruction time with a variable clock',
          lang: 'text',
          code: `avg = 0.25 × 800 + 0.10 × 700 + 0.45 × 600 + 0.20 × 500
    = 200 + 70 + 270 + 100
    = 640 ps   (vs. 800 ps for every instruction)`,
          annotations: [
            {
              lines: 1,
              text: 'Weight each instruction class\'s time by how often it occurs.',
            },
            {
              lines: 3,
              text: 'The single-cycle design is 800 / 640 = **1.25× slower** than this ideal, purely because everything is paid at `lw` speed.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not let fast instructions finish early?',
          text: 'A digital chip has one clock, distributed to every flip-flop so that they all capture new values at the same instant. Giving each instruction its own clock length would require knowing, before the cycle starts, how long it needs, and redesigning that global clock network for every instruction. Instead designers keep the clock fixed and change **how much work fits in a cycle**. There are two ways: a **multicycle** design breaks each instruction into several short cycles and lets simple instructions use fewer of them; **pipelining**, the next lesson, overlaps instructions so that the hardware is never idle.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'The convoy',
          text: 'A convoy moves at the speed of its slowest truck. Every vehicle in a single-cycle convoy is assigned the slowest truck\'s travel time, even the motorcycles.',
        },
      ],
    },
    {
      kind: 'numeric',
      prompt: 'A different single-cycle design has these block latencies: instruction memory 250 ps, register read 150 ps, ALU 200 ps, data memory 300 ps, register write 100 ps. Ignoring mux and register overheads, what is the shortest possible clock period?',
      answer: 1000,
      unit: 'ps',
      label: 'Clock period =',
      hint: 'Find the instruction whose path goes through the most blocks.',
      explanation: '`lw` passes through every block in series: 250 + 150 + 200 + 300 + 100 = 1000 ps. R-type skips data memory (700 ps) and `sw` skips the register write (900 ps), but the clock must accommodate the worst case, so the period is 1000 ps (1 GHz). Note how the slow data memory hurts every instruction, even those that never touch it.',
    },
    {
      kind: 'numeric',
      prompt: 'Using the 800/700/600/500 ps table from the lesson, a game\'s physics loop runs 30% `lw`, 10% `sw`, 40% R-type and 20% branches. How many times faster would an ideal variable-length clock be than the 800 ps single-cycle clock? Round to 2 decimal places.',
      answer: 1.23,
      tolerance: 0.006,
      label: 'Speedup =',
      unit: '×',
      hint: 'Average time = Σ (fraction × time). Speedup = 800 / average.',
      explanation: 'Average = 0.3 × 800 + 0.1 × 700 + 0.4 × 600 + 0.2 × 500 = 240 + 70 + 240 + 100 = 650 ps. Speedup = 800 / 650 ≈ 1.23. The more loads a program has, the less the single-cycle design wastes, because loads are the instructions that actually need the full period.',
    },
    {
      kind: 'concept',
      title: 'From this design to a real CPU',
      blocks: [
        {
          type: 'p',
          text: 'Nobody ships a single-cycle processor at speed: 800 ps per instruction is 1.25 billion instructions per second at best, and real memories are far slower than 200 ps (a trip to DRAM takes tens of nanoseconds). Modern cores run at 3 to 6 GHz, a clock period of roughly 170 to 330 ps, and finish several instructions per cycle. They get there by cutting each instruction\'s work into many short steps and overlapping those steps across instructions, as the rest of this unit shows.',
        },
        {
          type: 'p',
          text: 'But this simple machine remains the **reference model**. The ISA promises that instructions execute one at a time, in order, each finishing before the next begins. Every trick in the next lessons (pipelining, forwarding, branch prediction, out-of-order execution) is built to keep that promise while breaking it internally. When you reason about what your C++ means, the one-instruction-at-a-time model is still correct for a single thread; when you reason about how fast it runs, you need the real machine.',
        },
        {
          type: 'list',
          items: [
            '**Pipelining** overlaps the five steps of consecutive instructions (next lesson).',
            '**Hazards** appear when overlapped instructions depend on each other; forwarding and stalls fix them.',
            '**Branch prediction** guesses the next PC before the branch is decided.',
            '**Out-of-order execution** (next unit) runs independent instructions as soon as their inputs are ready.',
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Slow on purpose',
          text: 'Simplicity has value of its own. Radiation-hardened processors for spacecraft and some military systems, such as the BAE RAD750 used on NASA\'s Curiosity and Perseverance Mars rovers, run at a few hundred MHz at most. They are built on older, larger, radiation-tolerant manufacturing processes and favour designs that can be verified exhaustively, because a bit flipped by a cosmic ray must never become a wrong answer.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'In a single-cycle processor, an `add` finishes before a `lw` would, so the next instruction can start earlier after an `add`.',
      answer: false,
      explanation: 'The next instruction starts at the next clock edge, and the edges come at a fixed period sized for the slowest instruction (`lw`). The `add`\'s result is ready early, but it just sits on the wires until the edge captures it. That fixed, worst-case cycle is the main weakness of the single-cycle design.',
    },
    {
      kind: 'mcq',
      prompt: 'Which change would let this single-cycle processor run at a shorter clock period?',
      options: [
        {
          text: 'Adding a second ALU',
          why: 'Each instruction already uses only one ALU, and adding another does not shorten the path any instruction takes through the blocks.',
        },
        {
          text: 'Making data memory faster',
          correct: true,
          why: 'The critical path runs through `lw`, which includes data memory. Shortening any block on that path shortens the slowest instruction, and therefore the clock period.',
        },
        {
          text: 'Removing the `beq` instruction',
          why: '`beq` is the *fastest* instruction (500 ps). Removing it changes nothing about the 800 ps `lw` path.',
        },
        {
          text: 'Encoding instructions in 16 bits instead of 32',
          why: 'Decoding is just wires and fetching one word takes the same time; this does not touch the critical path.',
        },
      ],
      explanation: 'Only the critical path matters for the clock period. Speeding up anything not on the slowest instruction\'s path gives nothing. This "find the critical path" reasoning comes back constantly: in pipelines (the slowest stage sets the clock), in multithreaded frames (the longest dependency chain sets the frame time), and in profiling (optimize what is on the critical path, not what is easy).',
    },
  ],
  takeaways: [
    'A processor is a **datapath** (PC, memories, register file, ALU, muxes) plus **control** that sets its switches for each instruction.',
    'Each instruction goes through fetch, decode/register read, execute, memory and write back; state elements update only at the clock edge.',
    'Control is a truth table over the opcode: RegWrite, ALUSrc, MemRead, MemWrite, MemtoReg and Branch.',
    'In a single-cycle design every instruction takes one long cycle, so the **slowest instruction** (`lw`) sets the clock period, and faster instructions waste the rest.',
    'A CPU simulator is the same loop in software: fetch, decode with shifts and masks, dispatch on the opcode, write back; CPI is exactly 1.',
    'Every later optimization keeps the single-cycle machine\'s one-at-a-time behaviour while overlapping work internally.',
  ],
  reading: [
    {
      title: 'Computer Systems: A Programmer\'s Perspective (CS:APP)',
      url: 'https://csapp.cs.cmu.edu/',
      source: 'book',
      note: 'Chapter 4 builds a sequential and then a pipelined processor (Y86-64) step by step, the same journey as this unit.',
    },
    {
      title: 'Nand2Tetris',
      url: 'https://www.nand2tetris.org/',
      source: 'other',
      note: 'Build a complete computer from NAND gates up; project 5 assembles the CPU from the ALU and registers.',
    },
    {
      title: 'RISC-V (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/RISC-V',
      source: 'article',
      note: 'Look at the instruction format diagrams to see the fixed register-field positions this lesson relies on.',
    },
    {
      title: 'Datapath (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Datapath',
      source: 'article',
      note: 'A short overview of datapaths, control units and how single-cycle and multicycle designs differ.',
    },
  ],
};
