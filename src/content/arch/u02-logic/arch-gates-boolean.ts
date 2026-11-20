import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-gates-boolean',
  title: 'Gates and Boolean Algebra',
  summary: 'From transistors used as switches to CMOS gates, truth tables, Boolean algebra and De Morgan, why NAND alone can build a computer, and why `&` on a 64-bit integer is 64 gates working at once.',
  minutes: 18,
  objectives: [
    'Describe a MOSFET as a voltage-controlled switch and explain how a CMOS inverter and NAND gate work',
    'Explain why CMOS logic uses almost no power when idle and why that led to the end of rising clock speeds',
    'Read and write truth tables for AND, OR, NOT, NAND, NOR and XOR, and derive a sum-of-products expression from any truth table',
    'Simplify and verify Boolean expressions with the laws of Boolean algebra, including De Morgan\'s laws',
    'Show that NAND is universal and relate C++ bitwise operators to gates working in parallel',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Transistors are switches',
      blocks: [
        {
          type: 'p',
          text: 'Every computer is built from one component repeated billions of times: the **transistor**. A modern CPU or console chip contains billions of them. For digital logic you can ignore almost all of their physics and treat each one as a **switch controlled by a voltage**.',
        },
        {
          type: 'definition',
          term: 'MOSFET',
          text: 'The [[transistor]] used in all modern chips. It has three terminals: a **gate** that controls it and two terminals (source and drain) that it connects or disconnects. No current flows into the gate; the gate voltage alone opens or closes the path.',
        },
        {
          type: 'list',
          items: [
            'An **nMOS** transistor conducts when its gate is high (1). It is good at pulling a wire down to 0 V.',
            'A **pMOS** transistor conducts when its gate is low (0); its symbol has a small circle (a "bubble") on the gate. It is good at pulling a wire up to the supply voltage.',
          ],
        },
        {
          type: 'p',
          text: 'That is the entire bridge between physics and computing. A voltage on one wire decides whether another wire is connected to 1 or to 0, so **the output of one switch can control the next switch**. Chain them and you can compute any function of bits, which is what the rest of this unit does.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A valve on a water pipe',
          text: 'Think of a valve on a pipe whose handle is turned by water pressure from another pipe. Pressure on the control pipe opens the valve and water flows; no pressure, the valve closes. Now let the output of that pipe drive the next valve, and you have a tiny hydraulic computer. Transistors do the same with electrons, a few billion times per second.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'From relays to tubes to transistors',
          text: 'The first digital computers used electromechanical relays (Konrad Zuse\'s Z3, 1941), then vacuum tubes (ENIAC, 1945). Both are also voltage- or current-controlled switches. The transistor (Bell Labs, 1947) did the same job without moving parts or glowing filaments, and integrated circuits put many on one piece of silicon. The logic you will learn here is identical for all three; only speed, size and power changed.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'CMOS: complementary pairs',
      blocks: [
        {
          type: 'p',
          text: 'Modern chips use **[[cmos|CMOS]]** (complementary metal-oxide-semiconductor) logic: every gate has a pMOS network that can connect the output to the supply (1) and an nMOS network that can connect it to ground (0), built so that **exactly one of them conducts** for any input. The simplest example is the inverter:',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 540 246" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<text x="105" y="18" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">CMOS inverter</text>
<line x1="70" y1="36" x2="150" y2="36" stroke-width="2.5"/>
<text x="160" y="40" font-size="12" text-anchor="start" stroke="none">VDD</text>
<line x1="100" y1="66" x2="100" y2="100" stroke-width="3"/>
<polyline points="100,70 116,70"/>
<polyline points="100,96 116,96"/>
<line x1="92" y1="68" x2="92" y2="98" stroke-width="2"/>
<circle cx="87" cy="83.0" r="4"/>
<line x1="83" y1="83.0" x2="57" y2="83.0"/>
<polyline points="116,70 116,36"/>
<text x="126" y="86" font-size="11" text-anchor="start" stroke="none" class="t-gray">pMOS</text>
<line x1="100" y1="166" x2="100" y2="200" stroke-width="3"/>
<polyline points="100,170 116,170"/>
<polyline points="100,196 116,196"/>
<line x1="92" y1="168" x2="92" y2="198" stroke-width="2"/>
<line x1="92" y1="183.0" x2="57" y2="183.0"/>
<polyline points="116,96 116,133 116,170"/>
<text x="126" y="186" font-size="11" text-anchor="start" stroke="none" class="t-gray">nMOS</text>
<polyline points="116,196 116,222"/>
<line x1="116" y1="222" x2="116" y2="228"/>
<line x1="104" y1="228" x2="128" y2="228"/>
<line x1="109" y1="233" x2="123" y2="233"/>
<line x1="113" y1="238" x2="119" y2="238"/>
<polyline points="57,83.0 57,83.0 57,183.0 57,183.0"/>
<line x1="22" y1="133" x2="57" y2="133"/>
<circle cx="57" cy="133" r="3.5" fill="currentColor" stroke="none"/>
<text x="16" y="137" font-size="14" text-anchor="end" stroke="none" font-weight="bold">A</text>
<line x1="116" y1="133" x2="180" y2="133"/>
<circle cx="116" cy="133" r="3.5" fill="currentColor" stroke="none"/>
<text x="188" y="137" font-size="14" text-anchor="start" stroke="none" font-weight="bold">Y</text>
<text x="300" y="18" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">A = 0</text>
<line x1="270" y1="36" x2="330" y2="36" stroke-width="2.5"/>
<text x="334" y="40" font-size="12" text-anchor="start" stroke="none" class="t-gray">1</text>
<line x1="300" y1="36" x2="300" y2="62" class="s-green"/>
<circle cx="300" cy="62" r="3" class="s-green" fill="currentColor"/>
<circle cx="300" cy="104" r="3" class="s-green" fill="currentColor"/>
<line x1="300" y1="62" x2="300" y2="104" class="s-green" stroke-width="3"/>
<line x1="300" y1="104" x2="300" y2="162" class="s-green"/>
<circle cx="300" cy="162" r="3" class="s-gray" fill="currentColor"/>
<circle cx="300" cy="204" r="3" class="s-gray" fill="currentColor"/>
<line x1="300" y1="204" x2="318" y2="170" class="s-gray" stroke-width="3"/>
<line x1="300" y1="204" x2="300" y2="222"/>
<line x1="300" y1="222" x2="300" y2="228"/>
<line x1="288" y1="228" x2="312" y2="228"/>
<line x1="293" y1="233" x2="307" y2="233"/>
<line x1="297" y1="238" x2="303" y2="238"/>
<line x1="300" y1="133" x2="344" y2="133" class="s-green"/>
<circle cx="300" cy="133" r="3.5" class="f-green" stroke="none"/>
<text x="350" y="138" font-size="14" text-anchor="start" stroke="none" class="t-green" font-weight="bold">Y = 1</text>
<text x="290" y="88" font-size="11" text-anchor="end" stroke="none" class="t-green">on</text>
<text x="290" y="188" font-size="11" text-anchor="end" stroke="none" class="t-gray">off</text>
<text x="440" y="18" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">A = 1</text>
<line x1="410" y1="36" x2="470" y2="36" stroke-width="2.5"/>
<text x="474" y="40" font-size="12" text-anchor="start" stroke="none" class="t-gray">1</text>
<line x1="440" y1="36" x2="440" y2="62"/>
<circle cx="440" cy="62" r="3" class="s-gray" fill="currentColor"/>
<circle cx="440" cy="104" r="3" class="s-gray" fill="currentColor"/>
<line x1="440" y1="104" x2="458" y2="70" class="s-gray" stroke-width="3"/>
<line x1="440" y1="104" x2="440" y2="162" class="s-blue"/>
<circle cx="440" cy="162" r="3" class="s-green" fill="currentColor"/>
<circle cx="440" cy="204" r="3" class="s-green" fill="currentColor"/>
<line x1="440" y1="162" x2="440" y2="204" class="s-green" stroke-width="3"/>
<line x1="440" y1="204" x2="440" y2="222" class="s-blue"/>
<line x1="440" y1="222" x2="440" y2="228"/>
<line x1="428" y1="228" x2="452" y2="228"/>
<line x1="433" y1="233" x2="447" y2="233"/>
<line x1="437" y1="238" x2="443" y2="238"/>
<line x1="440" y1="133" x2="484" y2="133" class="s-blue"/>
<circle cx="440" cy="133" r="3.5" class="f-blue" stroke="none"/>
<text x="490" y="138" font-size="14" text-anchor="start" stroke="none" class="t-blue" font-weight="bold">Y = 0</text>
<text x="430" y="88" font-size="11" text-anchor="end" stroke="none" class="t-gray">off</text>
<text x="430" y="188" font-size="11" text-anchor="end" stroke="none" class="t-green">on</text>
<line x1="228" y1="10" x2="228" y2="240" class="s-gray" stroke-width="1" stroke-dasharray="3 4"/>
</svg>`,
          alt: 'Left: CMOS inverter schematic with a pMOS transistor between VDD and output Y and an nMOS transistor between Y and ground, both gates driven by input A. Middle: with A = 0 the upper switch is on and the lower is off, so Y = 1. Right: with A = 1 the upper switch is off and the lower is on, so Y = 0.',
          caption: 'A CMOS inverter and its switch model. Whatever A is, one transistor connects Y to a rail and the other is open, so there is never a direct path from VDD to ground.',
          maxWidth: 520,
        },
        {
          type: 'p',
          text: 'Gates with more inputs follow the same pattern. In a NAND gate the two nMOS transistors sit in **series** (both must conduct to pull Y down) and the two pMOS transistors sit in **parallel** (either one pulls Y up). Swap series and parallel and you get NOR.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 268" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<line x1="80" y1="30" x2="300" y2="30" stroke-width="2.5"/>
<text x="308" y="34" font-size="12" text-anchor="start" stroke="none">VDD</text>
<line x1="130" y1="56" x2="130" y2="90" stroke-width="3"/>
<polyline points="130,60 146,60"/>
<polyline points="130,86 146,86"/>
<line x1="122" y1="58" x2="122" y2="88" stroke-width="2"/>
<circle cx="117" cy="73.0" r="4"/>
<line x1="113" y1="73.0" x2="73" y2="73.0"/>
<line x1="250" y1="56" x2="250" y2="90" stroke-width="3"/>
<polyline points="250,60 266,60"/>
<polyline points="250,86 266,86"/>
<line x1="242" y1="58" x2="242" y2="88" stroke-width="2"/>
<circle cx="237" cy="73.0" r="4"/>
<line x1="233" y1="73.0" x2="193" y2="73.0"/>
<polyline points="146,60 146,30"/>
<polyline points="266,60 266,30"/>
<polyline points="146,86 146,118 266,118 266,86"/>
<circle cx="146" cy="118" r="3.5" fill="currentColor" stroke="none"/>
<line x1="266" y1="118" x2="330" y2="118"/>
<circle cx="266" cy="118" r="3.5" fill="currentColor" stroke="none"/>
<text x="338" y="123" font-size="15" text-anchor="start" stroke="none" font-weight="bold">Y</text>
<line x1="130" y1="140" x2="130" y2="174" stroke-width="3"/>
<polyline points="130,144 146,144"/>
<polyline points="130,170 146,170"/>
<line x1="122" y1="142" x2="122" y2="172" stroke-width="2"/>
<line x1="122" y1="157.0" x2="72" y2="157.0"/>
<line x1="130" y1="196" x2="130" y2="230" stroke-width="3"/>
<polyline points="130,200 146,200"/>
<polyline points="130,226 146,226"/>
<line x1="122" y1="198" x2="122" y2="228" stroke-width="2"/>
<line x1="122" y1="213.0" x2="72" y2="213.0"/>
<polyline points="146,118 146,144"/>
<polyline points="146,170 146,200"/>
<polyline points="146,226 146,244"/>
<line x1="146" y1="244" x2="146" y2="250"/>
<line x1="134" y1="250" x2="158" y2="250"/>
<line x1="139" y1="255" x2="153" y2="255"/>
<line x1="143" y1="260" x2="149" y2="260"/>
<text x="67" y="78.0" font-size="14" text-anchor="end" stroke="none" font-weight="bold">A</text>
<text x="187" y="78.0" font-size="14" text-anchor="end" stroke="none" font-weight="bold">B</text>
<text x="66" y="162.0" font-size="14" text-anchor="end" stroke="none" font-weight="bold">A</text>
<text x="66" y="218.0" font-size="14" text-anchor="end" stroke="none" font-weight="bold">B</text>
<text x="290" y="66" font-size="11" text-anchor="start" stroke="none" class="t-green">parallel pMOS:</text>
<text x="290" y="80" font-size="11" text-anchor="start" stroke="none" class="t-green">either one pulls Y up</text>
<text x="170" y="192" font-size="11" text-anchor="start" stroke="none" class="t-blue">series nMOS:</text>
<text x="170" y="206" font-size="11" text-anchor="start" stroke="none" class="t-blue">both must conduct</text>
<text x="170" y="220" font-size="11" text-anchor="start" stroke="none" class="t-blue">to pull Y down</text>
<text x="420" y="150" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">A</text>
<text x="450" y="150" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">B</text>
<text x="490" y="150" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">Y</text>
<line x1="472" y1="136" x2="472" y2="230" class="s-gray" stroke-width="1"/>
<text x="420" y="172" font-size="13" text-anchor="middle" stroke="none">0</text>
<text x="450" y="172" font-size="13" text-anchor="middle" stroke="none">0</text>
<text x="490" y="172" font-size="13" text-anchor="middle" stroke="none">1</text>
<text x="420" y="191" font-size="13" text-anchor="middle" stroke="none">0</text>
<text x="450" y="191" font-size="13" text-anchor="middle" stroke="none">1</text>
<text x="490" y="191" font-size="13" text-anchor="middle" stroke="none">1</text>
<text x="420" y="210" font-size="13" text-anchor="middle" stroke="none">1</text>
<text x="450" y="210" font-size="13" text-anchor="middle" stroke="none">0</text>
<text x="490" y="210" font-size="13" text-anchor="middle" stroke="none">1</text>
<text x="420" y="229" font-size="13" text-anchor="middle" stroke="none" class="t-blue">1</text>
<text x="450" y="229" font-size="13" text-anchor="middle" stroke="none" class="t-blue">1</text>
<text x="490" y="229" font-size="13" text-anchor="middle" stroke="none" class="t-blue">0</text>
</svg>`,
          alt: 'CMOS NAND gate: two pMOS transistors in parallel between VDD and Y, gates A and B; two nMOS transistors in series between Y and ground, gates A and B. Truth table: Y is 0 only when A and B are both 1.',
          caption: 'A 2-input CMOS NAND gate: four transistors. Y is pulled low only when A = 1 **and** B = 1.',
          maxWidth: 480,
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why chips are built from NAND and NOR, not AND and OR',
          text: 'A single CMOS stage is naturally **inverting**: a high input turns on an nMOS that pulls the output low. So NAND and NOR take 4 transistors each, while AND and OR need a NAND or NOR followed by an inverter: 6 transistors and an extra gate delay. Chip designers therefore think in NANDs and NORs, and synthesis tools map your logic onto inverting cells wherever they can.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why clock speeds stopped climbing',
          text: 'Because one network is always off, an idle CMOS gate draws almost no current (only leakage). Power is burned mainly when outputs **switch**, charging and discharging wire capacitance: dynamic power ≈ α · C · V² · f, where α is how often gates switch and f is the clock frequency. For decades, shrinking transistors also let designers lower V, so frequency rose for free. Around 2004–2005 voltage stopped scaling, and pushing f higher meant unmanageable heat. That "power wall" is why CPUs stalled around 3–5 GHz and went **multicore** instead, and why your game engine now needs a job system.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'In CMOS, why does a 2-input AND gate cost more than a 2-input NAND gate?',
      options: [
        { text: 'A CMOS stage is naturally inverting, so AND is built as NAND followed by an inverter: 6 transistors instead of 4', correct: true, why: 'A high input turns on an nMOS that pulls the output low, so the cheapest single stage computes an inverted function. Un-inverting it costs an extra inverter and an extra gate delay.' },
        { text: 'AND needs its transistors in series, which is not possible in CMOS', why: 'Series transistors are perfectly possible; the NAND gate itself has its two nMOS transistors in series.' },
        { text: 'AND gates need a clock signal and NAND gates do not', why: 'Neither gate uses a clock. Both are combinational: the output depends only on the current inputs.' },
        { text: 'It does not: AND and NAND both take 4 transistors', why: 'A single CMOS stage cannot produce the non-inverted AND; you need a second stage.' },
      ],
      explanation:
        'In CMOS the pull-down network is made of nMOS transistors that turn **on** when their inputs are 1, and when they turn on they drive the output to **0**. So one stage always computes the complement of some AND/OR combination of its inputs: NOT, NAND, NOR, and more complex "AND-OR-INVERT" cells. Non-inverting functions need a second stage. This is why NAND (and NOR) are the natural primitives of real chips.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'The basic gates and their truth tables',
      blocks: [
        {
          type: 'p',
          text: 'A [[logic-gate]] computes a fixed Boolean function of its inputs. Designers draw them with standard symbols, and a [[truth-table]] lists the output for every combination of inputs: with n inputs there are 2ⁿ rows.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 240" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<text x="85" y="30" font-size="14" text-anchor="middle" stroke="none" font-weight="bold">AND</text>
<path d="M57,42.0 H82.0 A20.0,20.0 0 0 1 82.0,82.0 H57 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M57,42.0 H82.0 A20.0,20.0 0 0 1 82.0,82.0 H57 Z"/>
<line x1="29" y1="52.0" x2="57" y2="52.0"/>
<line x1="29" y1="72.0" x2="57" y2="72.0"/>
<line x1="102.0" y1="62" x2="143" y2="62"/>
<text x="85" y="102" font-size="13" text-anchor="middle" stroke="none" class="t-blue">A · B</text>
<text x="85" y="120" font-size="12" text-anchor="middle" stroke="none" class="t-gray">a & b</text>
<text x="257" y="30" font-size="14" text-anchor="middle" stroke="none" font-weight="bold">OR</text>
<path d="M229,42.0 Q244.0,62 229,82.0 Q264.0,82.0 279.0,62 Q264.0,42.0 229,42.0 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M229,42.0 Q244.0,62 229,82.0 Q264.0,82.0 279.0,62 Q264.0,42.0 229,42.0 Z"/>
<line x1="201" y1="52.0" x2="232" y2="52.0"/>
<line x1="201" y1="72.0" x2="232" y2="72.0"/>
<line x1="279.0" y1="62" x2="315" y2="62"/>
<text x="257" y="102" font-size="13" text-anchor="middle" stroke="none" class="t-blue">A + B</text>
<text x="257" y="120" font-size="12" text-anchor="middle" stroke="none" class="t-gray">a | b</text>
<text x="429" y="30" font-size="14" text-anchor="middle" stroke="none" font-weight="bold">NOT</text>
<path d="M401,48.0 L429.0,62 L401,76.0 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M401,48.0 L429.0,62 L401,76.0 Z"/>
<circle cx="433.0" cy="62" r="4"/>
<line x1="373" y1="62" x2="401" y2="62"/>
<line x1="437.0" y1="62" x2="487" y2="62"/>
<text x="429" y="102" font-size="13" text-anchor="middle" stroke="none" class="t-blue">Ā</text>
<text x="429" y="120" font-size="12" text-anchor="middle" stroke="none" class="t-gray">~a</text>
<text x="85" y="148" font-size="14" text-anchor="middle" stroke="none" font-weight="bold">NAND</text>
<path d="M57,160.0 H82.0 A20.0,20.0 0 0 1 82.0,200.0 H57 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M57,160.0 H82.0 A20.0,20.0 0 0 1 82.0,200.0 H57 Z"/>
<circle cx="106.0" cy="180" r="4"/>
<line x1="29" y1="170.0" x2="57" y2="170.0"/>
<line x1="29" y1="190.0" x2="57" y2="190.0"/>
<line x1="110.0" y1="180" x2="143" y2="180"/>
<text x="85" y="220" font-size="13" text-anchor="middle" stroke="none" class="t-blue">¬(A · B)</text>
<text x="85" y="238" font-size="12" text-anchor="middle" stroke="none" class="t-gray">~(a & b)</text>
<text x="257" y="148" font-size="14" text-anchor="middle" stroke="none" font-weight="bold">NOR</text>
<path d="M229,160.0 Q244.0,180 229,200.0 Q264.0,200.0 279.0,180 Q264.0,160.0 229,160.0 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M229,160.0 Q244.0,180 229,200.0 Q264.0,200.0 279.0,180 Q264.0,160.0 229,160.0 Z"/>
<circle cx="283.0" cy="180" r="4"/>
<line x1="201" y1="170.0" x2="232" y2="170.0"/>
<line x1="201" y1="190.0" x2="232" y2="190.0"/>
<line x1="287.0" y1="180" x2="315" y2="180"/>
<text x="257" y="220" font-size="13" text-anchor="middle" stroke="none" class="t-blue">¬(A + B)</text>
<text x="257" y="238" font-size="12" text-anchor="middle" stroke="none" class="t-gray">~(a | b)</text>
<text x="429" y="148" font-size="14" text-anchor="middle" stroke="none" font-weight="bold">XOR</text>
<path d="M408.0,160.0 Q423.0,180 408.0,200.0 Q443.0,200.0 458.0,180 Q443.0,160.0 408.0,160.0 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M408.0,160.0 Q423.0,180 408.0,200.0 Q443.0,200.0 458.0,180 Q443.0,160.0 408.0,160.0 Z"/>
<path d="M401,160.0 Q416.0,180 401,200.0"/>
<line x1="373" y1="170.0" x2="403" y2="170.0"/>
<line x1="373" y1="190.0" x2="403" y2="190.0"/>
<line x1="458.0" y1="180" x2="487" y2="180"/>
<text x="429" y="220" font-size="13" text-anchor="middle" stroke="none" class="t-blue">A ⊕ B</text>
<text x="429" y="238" font-size="12" text-anchor="middle" stroke="none" class="t-gray">a ^ b</text>
</svg>`,
          alt: 'Standard symbols for AND, OR, NOT, NAND, NOR and XOR, each with its algebraic notation (A·B, A+B, A-bar, not(A·B), not(A+B), A xor B) and the matching C++ bitwise expression.',
          caption: 'The six gates you will use throughout this unit. A bubble on an output means "inverted". In Boolean algebra · is AND, + is OR and a bar is NOT.',
          maxWidth: 520,
        },
        {
          type: 'code',
          title: 'truth_tables.cpp',
          runnable: true,
          code: `#include <cstdio>

bool AND(bool a, bool b)  { return a && b; }
bool OR(bool a, bool b)   { return a || b; }
bool NAND(bool a, bool b) { return !(a && b); }
bool NOR(bool a, bool b)  { return !(a || b); }
bool XOR(bool a, bool b)  { return a != b; }

int main() {
    std::printf("a b | AND OR NAND NOR XOR\\n");
    for (int a = 0; a <= 1; ++a) {
        for (int b = 0; b <= 1; ++b) {
            std::printf("%d %d |  %d   %d   %d    %d   %d\\n", a, b,
                        AND(a, b), OR(a, b), NAND(a, b), NOR(a, b),
                        XOR(a, b));
        }
    }
}`,
          output: `a b | AND OR NAND NOR XOR
0 0 |  0   0   1    1   0
0 1 |  0   1   1    0   1
1 0 |  0   1   1    0   1
1 1 |  1   1   0    0   0`,
          annotations: [
            { lines: 7, text: 'XOR ("exclusive or") is 1 when the inputs **differ**. For `bool` operands, C++\'s `!=` is exactly XOR.' },
            { lines: '11-12', text: 'Two nested loops enumerate all 2² = 4 input rows. For n inputs you would loop over 2ⁿ rows, which is why truth tables are only practical for small functions.' },
          ],
        },
        {
          type: 'p',
          text: 'XOR deserves a second look because it appears everywhere in hardware: it is the **sum bit** of binary addition (1 + 1 = 0, carry 1), it detects differences (`a ^ b` is zero only when a and b are equal), it computes parity for error detection, and XOR with 1 toggles a bit, which is why `flags ^= Mask` flips a flag.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Logical versus bitwise in C++',
          text: '`&&`, `||` and `!` work on whole `bool` values and short-circuit. `&`, `|`, `^` and `~` apply the gate to every bit position independently and never short-circuit. Both families are the same gates; they differ in how many bits they process and whether the right-hand side is evaluated at all.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'numeric',
      prompt: 'A 2-input gate is defined by its truth table: one output bit for each of the 4 input rows. How many **different** 2-input Boolean functions exist (AND, OR, XOR, NAND, … and all the others)?',
      answer: 16,
      label: 'Functions =',
      hint: 'Each of the 4 rows can independently output 0 or 1.',
      explanation:
        'A function is fully described by its 4 output bits, and each can be 0 or 1, so there are 2⁴ = 16 functions. Six of them have famous names (AND, OR, NAND, NOR, XOR, XNOR); the rest include the constants 0 and 1, "just a", "just b", "not a", "not b" and four forms of implication. In general, n inputs give 2^(2ⁿ) functions: 256 for three inputs and about 4.3 billion for five, which is why no one builds a separate gate for each.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Boolean algebra: rewriting circuits',
      blocks: [
        {
          type: 'p',
          text: '[[boolean-algebra|Boolean algebra]] lets you transform a circuit into an equivalent one that is smaller, faster or built from the gates you have. It looks like ordinary algebra, with · for AND, + for OR and a bar (or `¬`) for NOT, but some laws are new. (If you took discrete math, this is a quick recap.)',
        },
        {
          type: 'table',
          headers: ['Law', 'AND form', 'OR form'],
          rows: [
            ['Identity', 'A · 1 = A', 'A + 0 = A'],
            ['Null (annihilator)', 'A · 0 = 0', 'A + 1 = 1'],
            ['Idempotent', 'A · A = A', 'A + A = A'],
            ['Complement', 'A · Ā = 0', 'A + Ā = 1'],
            ['Distributive', 'A · (B + C) = A·B + A·C', '**A + B·C = (A + B) · (A + C)**'],
            ['Absorption', 'A · (A + B) = A', 'A + A·B = A'],
            ['De Morgan', '¬(A · B) = Ā + B̄', '¬(A + B) = Ā · B̄'],
          ],
          caption: 'Every law has a dual: swap · with +, and 0 with 1. The bold distributive law has no equivalent in ordinary arithmetic.',
        },
        {
          type: 'p',
          text: '[[de-morgans-laws|De Morgan\'s laws]] are the ones you will use most: "not (a and b)" is "(not a) or (not b)". In hardware they let you push inversions through gates, turning an AND with inverted inputs into a NOR. In C++ they let you rewrite `!(alive && visible)` as `!alive || !visible`.',
        },
        {
          type: 'p',
          text: 'Because a Boolean function has finitely many inputs, you can always prove two expressions equal by **checking every row**. For a handful of inputs a program does it instantly:',
        },
        {
          type: 'code',
          title: 'equivalence.cpp',
          runnable: true,
          code: `#include <cstdio>
#include <functional>

using Fn = std::function<bool(bool, bool, bool)>;

// Two circuits are equivalent iff they agree on every input row.
bool equivalent(const Fn& f, const Fn& g) {
    for (int row = 0; row < 8; ++row) {
        bool a = row & 4, b = row & 2, c = row & 1;
        if (f(a, b, c) != g(a, b, c)) {
            std::printf("  differ at a=%d b=%d c=%d\\n", a, b, c);
            return false;
        }
    }
    return true;
}

int main() {
    auto majority = [](bool a, bool b, bool c) {
        return (a && b) || (a && c) || (b && c);
    };
    auto carryForm = [](bool a, bool b, bool c) {
        return (a && b) || (c && (a != b));
    };
    std::printf("carry forms: %d\\n", equivalent(majority, carryForm));

    auto lhs = [](bool a, bool b, bool c) { return a && (b || c); };
    auto rhs = [](bool a, bool b, bool c) { return (a && b) || c; };
    bool same = equivalent(lhs, rhs);
    std::printf("tempting rewrite: %d\\n", same);
}`,
          output: `carry forms: 1
  differ at a=0 b=0 c=1
tempting rewrite: 0`,
          annotations: [
            { lines: 9, text: 'Unpack the row number into three input bits, so rows 0 to 7 cover every combination.' },
            { lines: '19-21', text: 'The **majority** function: 1 when at least two inputs are 1. You will meet it again as the carry-out of a full adder.' },
            { lines: '22-24', text: 'An equivalent form that reuses `a != b` (XOR), which the adder computes anyway. Fewer gates in total.' },
            { lines: '27-28', text: 'A plausible-looking but wrong "simplification": it moved `a` out of the bracket without distributing it. One counterexample row is enough to reject it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why exhaustive checking scales, sort of',
          text: 'Checking all rows is exact but costs 2ⁿ evaluations, hopeless for a 64-bit adder with 128 inputs. Real chip verification uses **equivalence checkers** and SAT solvers that reason symbolically with the same laws, plus simulation of carefully chosen cases. The principle is the one you just used: two circuits are equal if no input can tell them apart.',
        },
        {
          type: 'deepdive',
          title: 'From any truth table to a circuit',
          blocks: [
            {
              type: 'p',
              text: 'Any truth table can be turned into a circuit mechanically. For each row whose output is 1, write an AND of all inputs, negating the ones that are 0 in that row (a *minterm*). Then OR all those terms together. This **sum of products** proves that AND, OR and NOT can build *every* Boolean function. The result is usually not minimal, so designers simplify it with the laws above, with Karnaugh maps for up to about five inputs, or with logic-synthesis tools for real designs.',
            },
            {
              type: 'p',
              text: 'Example: XOR is 1 in rows (a=0, b=1) and (a=1, b=0), so XOR = Ā·B + A·B̄.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'fill',
      prompt: 'Apply De Morgan\'s law so both lines compute the same value for any `bool` inputs.',
      template: `bool hidden1 = !(alive && visible);
bool hidden2 = ___alive ___ !visible;`,
      blanks: [{ answers: ['!'] }, { answers: ['||'] }],
      wordBank: ['!', '||', '&&', '~', '^'],
      explanation:
        'De Morgan: ¬(A · B) = Ā + B̄. Negate each operand and swap AND for OR, so `!(alive && visible)` equals `!alive || !visible`. A common mistake is to negate the operands but keep `&&`, which gives "neither alive nor visible", a different function that is false when only one of them holds. `~` would be the bitwise complement, which on a `bool` promoted to `int` gives -1 or -2, both truthy.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'NAND can build everything',
      blocks: [
        {
          type: 'p',
          text: 'The sum-of-products construction shows that AND, OR and NOT are enough for any function. A more surprising fact: **NAND alone** is enough. A gate with this property is called a [[universal-gate|universal gate]]. Tie the two inputs of a NAND together and it becomes NOT; follow a NAND with that NOT and you have AND; and by De Morgan, NAND of the two inverted inputs is OR.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 282" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<text x="20" y="50" font-size="14" text-anchor="start" stroke="none" font-weight="bold">NOT</text>
<text x="80" y="50" font-size="13" text-anchor="end" stroke="none">A</text>
<path d="M130,25.0 H155.0 A20.0,20.0 0 0 1 155.0,65.0 H130 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M130,25.0 H155.0 A20.0,20.0 0 0 1 155.0,65.0 H130 Z"/>
<circle cx="179.0" cy="45" r="4"/>
<polyline points="86,45 116,45"/>
<polyline points="116,35.0 116,55.0"/>
<line x1="116" y1="35.0" x2="130" y2="35.0"/>
<line x1="116" y1="55.0" x2="130" y2="55.0"/>
<circle cx="116" cy="45" r="3.5" fill="currentColor" stroke="none"/>
<line x1="183.0" y1="45" x2="230" y2="45"/>
<text x="238" y="50" font-size="14" text-anchor="start" stroke="none" class="t-blue" font-weight="bold">Ā</text>
<text x="510" y="50" font-size="13" text-anchor="end" stroke="none" class="t-gray">1 NAND</text>
<text x="20" y="140" font-size="14" text-anchor="start" stroke="none" font-weight="bold">AND</text>
<text x="80" y="130" font-size="13" text-anchor="end" stroke="none">A</text>
<text x="80" y="150" font-size="13" text-anchor="end" stroke="none">B</text>
<path d="M116,115.0 H141.0 A20.0,20.0 0 0 1 141.0,155.0 H116 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M116,115.0 H141.0 A20.0,20.0 0 0 1 141.0,155.0 H116 Z"/>
<circle cx="165.0" cy="135" r="4"/>
<line x1="86" y1="125" x2="116" y2="125"/>
<line x1="86" y1="145" x2="116" y2="145"/>
<path d="M220,115.0 H245.0 A20.0,20.0 0 0 1 245.0,155.0 H220 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M220,115.0 H245.0 A20.0,20.0 0 0 1 245.0,155.0 H220 Z"/>
<circle cx="269.0" cy="135" r="4"/>
<polyline points="169.0,135 206,135"/>
<polyline points="206,125.0 206,145.0"/>
<line x1="206" y1="125.0" x2="220" y2="125.0"/>
<line x1="206" y1="145.0" x2="220" y2="145.0"/>
<circle cx="206" cy="135" r="3.5" fill="currentColor" stroke="none"/>
<line x1="273.0" y1="135" x2="320" y2="135"/>
<text x="328" y="140" font-size="14" text-anchor="start" stroke="none" class="t-blue" font-weight="bold">A · B</text>
<text x="510" y="140" font-size="13" text-anchor="end" stroke="none" class="t-gray">2 NANDs</text>
<text x="20" y="230" font-size="14" text-anchor="start" stroke="none" font-weight="bold">OR</text>
<text x="80" y="200" font-size="13" text-anchor="end" stroke="none">A</text>
<text x="80" y="260" font-size="13" text-anchor="end" stroke="none">B</text>
<path d="M130,175.0 H155.0 A20.0,20.0 0 0 1 155.0,215.0 H130 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M130,175.0 H155.0 A20.0,20.0 0 0 1 155.0,215.0 H130 Z"/>
<circle cx="179.0" cy="195" r="4"/>
<polyline points="86,195 116,195"/>
<polyline points="116,185.0 116,205.0"/>
<line x1="116" y1="185.0" x2="130" y2="185.0"/>
<line x1="116" y1="205.0" x2="130" y2="205.0"/>
<circle cx="116" cy="195" r="3.5" fill="currentColor" stroke="none"/>
<path d="M130,235.0 H155.0 A20.0,20.0 0 0 1 155.0,275.0 H130 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M130,235.0 H155.0 A20.0,20.0 0 0 1 155.0,275.0 H130 Z"/>
<circle cx="179.0" cy="255" r="4"/>
<polyline points="86,255 116,255"/>
<polyline points="116,245.0 116,265.0"/>
<line x1="116" y1="245.0" x2="130" y2="245.0"/>
<line x1="116" y1="265.0" x2="130" y2="265.0"/>
<circle cx="116" cy="255" r="3.5" fill="currentColor" stroke="none"/>
<path d="M250,205.0 H275.0 A20.0,20.0 0 0 1 275.0,245.0 H250 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M250,205.0 H275.0 A20.0,20.0 0 0 1 275.0,245.0 H250 Z"/>
<circle cx="299.0" cy="225" r="4"/>
<polyline points="183.0,195 225,195 225,215 250,215.0"/>
<polyline points="183.0,255 225,255 225,235 250,235.0"/>
<line x1="303.0" y1="225" x2="340" y2="225"/>
<text x="348" y="230" font-size="14" text-anchor="start" stroke="none" class="t-blue" font-weight="bold">A + B</text>
<text x="510" y="230" font-size="13" text-anchor="end" stroke="none" class="t-gray">3 NANDs</text>
<text x="200" y="181" font-size="12" text-anchor="middle" stroke="none" class="t-gray">Ā</text>
<text x="200" y="279" font-size="12" text-anchor="middle" stroke="none" class="t-gray">B̄</text>
<text x="368" y="247" font-size="12" text-anchor="start" stroke="none" class="t-gray">¬(Ā·B̄) = A + B</text>
</svg>`,
          alt: 'Three circuits built only from NAND gates: NOT uses one NAND with both inputs tied to A; AND uses a NAND followed by a NAND wired as an inverter; OR inverts A and B with one NAND each and feeds them into a third NAND.',
          caption: 'NOT, AND and OR from NAND gates only. Since AND, OR and NOT can build any function, so can NAND.',
          maxWidth: 520,
        },
        {
          type: 'code',
          title: 'nand_only.cpp',
          runnable: true,
          code: `#include <cstdio>

int nandCount = 0;   // gates "placed" so far

bool nand(bool a, bool b) { ++nandCount; return !(a && b); }

bool NOT(bool a)         { return nand(a, a); }
bool AND(bool a, bool b) { return NOT(nand(a, b)); }
bool OR(bool a, bool b)  { return nand(NOT(a), NOT(b)); }
bool XOR(bool a, bool b) {
    bool n = nand(a, b);
    return nand(nand(a, n), nand(b, n));
}

int main() {
    const char* names[] = {"NOT", "AND", "OR", "XOR"};
    for (int g = 0; g < 4; ++g) {
        std::printf("%-3s:", names[g]);
        for (int row = 0; row < 4; ++row) {
            bool a = row & 2, b = row & 1;
            nandCount = 0;
            bool out = g == 0 ? NOT(a) : g == 1 ? AND(a, b)
                     : g == 2 ? OR(a, b) : XOR(a, b);
            std::printf(" %d", out);
            if (row == 3) std::printf("   (%d NANDs)\\n", nandCount);
        }
    }
}`,
          output: `NOT: 1 1 0 0   (1 NANDs)
AND: 0 0 0 1   (2 NANDs)
OR : 0 1 1 1   (3 NANDs)
XOR: 0 1 1 0   (4 NANDs)`,
          annotations: [
            { lines: 5, text: 'The only primitive. Every other gate below is built by calling it, and the counter tallies the hardware used.' },
            { lines: 9, text: 'De Morgan in action: ¬(Ā · B̄) = A + B.' },
            { lines: '10-13', text: 'The classic 4-NAND XOR shares the first NAND between both halves instead of building XOR from AND, OR and NOT (which would take more).' },
            { lines: 20, text: 'Rows in order a,b = 00, 01, 10, 11. NOT ignores b, so its row is 1 1 0 0.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why universality matters',
          text: 'A chip factory can optimize a small library of cells to perfection instead of supporting every possible gate, and a designer can always reach any function. NOR is universal too; AND and OR are not, because without inversion you cannot build NOT. The course [Nand2Tetris](https://www.nand2tetris.org/) builds a complete working computer, and then a game on it, starting from nothing but a NAND gate. (NAND flash memory, in your console\'s SSD, is named after the NAND-like way its cells are wired in series.)',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'numeric',
      prompt: 'Consider the function `y = (a & b) | c` of three one-bit inputs. In how many of the 8 rows of its truth table is `y` equal to 1?',
      answer: 5,
      label: 'Rows =',
      hint: 'Count the rows with c = 1 first, then the rows with c = 0 where the AND term is 1.',
      explanation:
        'Whenever c = 1 the OR is 1, and c = 1 in 4 of the 8 rows. When c = 0 the output equals a·b, which is 1 only in the row a = 1, b = 1. That gives 4 + 1 = 5 rows. Counting rows like this (the function\'s *weight*) is how you size the sum-of-products form: this function would need 5 minterms before simplification, but the expression `(a & b) | c` needs just two gates.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Bitwise operators: 64 gates at once',
      blocks: [
        {
          type: 'p',
          text: 'When you write `a & b` on two `std::uint64_t` values, the CPU\'s ALU applies **64 AND gates side by side**, one per bit position, in a single instruction. There are no loops over bits; all 64 results appear together after one gate delay plus some wiring. A typical modern x86 core can issue three or four such simple ALU instructions per clock cycle, so bitwise operations are among the cheapest things a program can do.',
        },
        {
          type: 'p',
          text: 'Games exploit this constantly. An entity-component system can give every entity a **signature**, one bit per component type, and decide whether an entity matches a query with one AND and one compare:',
        },
        {
          type: 'code',
          title: 'signatures.cpp',
          runnable: true,
          code: `#include <array>
#include <cstdint>
#include <cstdio>

enum Component : std::uint32_t {
    Transform = 1u << 0,
    Velocity  = 1u << 1,
    Health    = 1u << 2,
    AI        = 1u << 3,
    Renderer  = 1u << 4,
};

int main() {
    std::array<std::uint32_t, 6> signature = {
        Transform | Renderer,
        Transform | Velocity | Renderer,
        Transform | Velocity | Health | AI,
        Health,
        Transform | Velocity | Health | AI | Renderer,
        Transform | Velocity,
    };

    const std::uint32_t movement = Transform | Velocity;  // query
    for (std::size_t e = 0; e < signature.size(); ++e) {
        // 32 AND gates in parallel, then one compare.
        if ((signature[e] & movement) == movement) {
            std::printf("move entity %zu\\n", e);
        }
    }
}`,
          output: `move entity 1
move entity 2
move entity 4
move entity 5`,
          annotations: [
            { lines: '5-11', text: 'Each component type owns one bit. A plain (unscoped) enum keeps `|` working without casts.' },
            { lines: 26, text: '`signature & movement` keeps only the bits the query cares about. Comparing with `movement` asks "are **all** of them set?". Comparing with `!= 0` would ask "is **any** of them set?", a different query.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'SWAR and bitboards',
          text: 'Treating a 64-bit register as 64 one-bit lanes (or eight 8-bit lanes) is called **SWAR**, "SIMD within a register". Chess engines store a whole board as a 64-bit *bitboard* (one bit per square) and compute every knight move on the board with a few shifts and masks. Collision layers in physics engines and visibility masks in renderers use the same trick. The SIMD lesson later in the course widens the idea to 128-, 256- and 512-bit registers.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Masks in Unreal',
          text: 'Collision channels and responses, rendering visibility flags and `UPROPERTY(meta = (Bitmask))` enums all rely on this pattern. Under the hood, testing whether two objects collide is an AND of their channel masks.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'bug',
      prompt: 'An AI behaviour should run only for enemies that are **both** stunned and burning. Players report it running for enemies that are only burning. Tap the buggy line.',
      code: `#include <cstdint>

constexpr std::uint32_t Stunned = 1u << 3;
constexpr std::uint32_t Burning = 1u << 5;

bool shouldPanic(std::uint32_t status) {
    return (status & (Stunned | Burning)) != 0;
}`,
      bugLines: [7],
      hint: 'What does `!= 0` ask about the masked bits?',
      explanation:
        '`status & (Stunned | Burning)` keeps bits 3 and 5 of `status`. Testing `!= 0` is true if **either** bit survived, so it implements OR, not AND. To require both, compare against the full mask: `(status & (Stunned | Burning)) == (Stunned | Burning)`. This "any versus all" slip is one of the most common bit-mask bugs, and it compiles silently because both forms are valid C++.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'truefalse',
      prompt: 'XOR can be built from AND and OR gates alone, as long as you use enough of them (no NOT, NAND or NOR allowed).',
      answer: false,
      explanation:
        'AND and OR are **monotone**: turning an input from 0 to 1 can never turn their output from 1 to 0, and any circuit made only of them inherits that property. XOR is not monotone: going from (1, 0) to (1, 1) changes its output from 1 to 0. So no number of AND and OR gates can compute it. You need inversion somewhere, which is exactly what NAND and NOR provide and why they are universal while AND and OR are not.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'order',
      prompt: 'Put the steps of turning any truth table into a working circuit in order.',
      linesAreCode: false,
      lines: [
        'Find every row of the truth table whose output is 1',
        'For each such row, write an AND of all inputs, negating the inputs that are 0 in that row',
        'OR all of those AND terms together',
        'Simplify the expression with Boolean algebra and map it onto the available gates (for example, NANDs)',
      ],
      distractors: [
        'Add a clock so the circuit remembers the previous output',
      ],
      explanation:
        'This is the sum-of-products construction: each 1-row becomes a minterm that is true for exactly that row, and OR-ing them reproduces the table. It always works, which proves that AND, OR and NOT (and therefore NAND alone) can build any combinational function. Simplification comes last because you need a correct expression before you can make it smaller. A clock has no role here: combinational circuits have no memory, which is the subject of the sequential-logic lesson.',
    },
  ],
  takeaways: [
    'A MOSFET is a voltage-controlled switch: nMOS conducts on 1 and pulls down, pMOS conducts on 0 and pulls up; the output of one switch drives the next.',
    'CMOS gates pair a pull-up and a pull-down network so exactly one conducts; idle gates use almost no power, and dynamic power ≈ α·C·V²·f explains the end of rising clock speeds.',
    'A single CMOS stage is inverting, so NAND and NOR (4 transistors) are cheaper than AND and OR (6).',
    'A truth table with n inputs has 2ⁿ rows; any table can be built as a sum of products and simplified with Boolean algebra, especially De Morgan: ¬(A·B) = Ā + B̄.',
    'NAND (or NOR) alone is universal; AND and OR alone are not, because they cannot invert.',
    'C++ bitwise operators apply a gate to every bit position in parallel in one instruction, which makes masks, signatures and bitboards extremely cheap.',
  ],
  reading: [
    { title: 'Nand2Tetris', url: 'https://www.nand2tetris.org/', source: 'other', note: 'Build every gate, then an ALU, a CPU and a computer, starting from NAND. Projects 1 and 2 match this unit.' },
    { title: 'CMOS', url: 'https://en.wikipedia.org/wiki/CMOS', source: 'article', note: 'How complementary transistor pairs form gates, with schematics of the inverter, NAND and NOR.' },
    { title: 'De Morgan\'s laws', url: 'https://en.wikipedia.org/wiki/De_Morgan%27s_laws', source: 'article', note: 'Statements, proofs and the many places the laws appear in logic and set theory.' },
    { title: 'Computer Systems: A Programmer\'s Perspective', url: 'https://csapp.cs.cmu.edu/', source: 'book', note: 'Chapter 2 covers bit-level operations in C; chapter 4 introduces logic design and hardware description.' },
  ],
};
