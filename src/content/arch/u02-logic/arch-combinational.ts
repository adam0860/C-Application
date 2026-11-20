import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-combinational',
  title: 'Adders, Multiplexers and the ALU',
  summary: 'Build binary addition out of gates, watch a carry ripple through an adder, see how carry-lookahead makes a 64-bit add fit in one clock cycle, and assemble multiplexers into a working ALU.',
  minutes: 20,
  objectives: [
    'Build half and full adders from gates and chain them into a ripple-carry adder',
    'Explain propagation delay and why a ripple-carry adder\'s worst case grows linearly with its width',
    'Explain how generate/propagate signals let carry-lookahead and prefix adders compute all carries in logarithmic time',
    'Describe multiplexers and decoders and connect them to C++ conditional selects and `cmov`',
    'Assemble a 1-bit ALU slice into an n-bit ALU that adds, subtracts and sets the Z, N, C and V flags',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Combinational logic and propagation delay',
      blocks: [
        {
          type: 'p',
          text: 'A [[combinational-logic|combinational circuit]] is a network of gates with no loops: its outputs depend **only on its current inputs**, like a pure function in C++. Everything in this lesson, from adders to the whole ALU, is combinational. (The next lesson adds memory.)',
        },
        {
          type: 'p',
          text: 'But a pure function in hardware is not instantaneous. Each gate needs a little time to charge or discharge the wires it drives, its [[propagation-delay]], on the order of picoseconds to tens of picoseconds in a modern chip. When an input changes, the change ripples forward gate by gate, and outputs may briefly show **wrong intermediate values** (glitches) before they settle. A circuit\'s delay is set by its slowest input-to-output path, measured in gate delays.',
        },
        {
          type: 'p',
          text: 'Start with the smallest useful circuit: adding two bits. 1 + 1 = 10₂, so the result needs two outputs, a **sum** bit and a **carry** bit. Looking at the truth table, the sum is 1 when exactly one input is 1 (that is XOR) and the carry is 1 when both are 1 (that is AND). This is a **half adder**:',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 530 250" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<text x="95" y="20" font-size="14" text-anchor="middle" stroke="none" font-weight="bold">Half adder</text>
<path d="M87.0,42.0 Q102.0,62 87.0,82.0 Q122.0,82.0 137.0,62 Q122.0,42.0 87.0,42.0 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M87.0,42.0 Q102.0,62 87.0,82.0 Q122.0,82.0 137.0,62 Q122.0,42.0 87.0,42.0 Z"/>
<path d="M80,42.0 Q95.0,62 80,82.0"/>
<path d="M80,120.0 H105.0 A20.0,20.0 0 0 1 105.0,160.0 H80 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M80,120.0 H105.0 A20.0,20.0 0 0 1 105.0,160.0 H80 Z"/>
<text x="14" y="57" font-size="14" text-anchor="end" stroke="none" font-weight="bold">a</text>
<text x="14" y="77" font-size="14" text-anchor="end" stroke="none" font-weight="bold">b</text>
<line x1="20" y1="52" x2="82" y2="52"/>
<line x1="20" y1="72" x2="82" y2="72"/>
<polyline points="40,52 40,130 80,130.0"/>
<circle cx="40" cy="52" r="3.5" fill="currentColor" stroke="none"/>
<polyline points="55,72 55,150 80,150.0"/>
<circle cx="55" cy="72" r="3.5" fill="currentColor" stroke="none"/>
<line x1="137.0" y1="62" x2="170" y2="62"/>
<text x="176" y="67" font-size="14" text-anchor="start" stroke="none" class="t-blue" font-weight="bold">S</text>
<line x1="125.0" y1="140" x2="170" y2="140"/>
<text x="176" y="145" font-size="14" text-anchor="start" stroke="none" class="t-purple" font-weight="bold">C</text>
<text x="95" y="196" font-size="13" text-anchor="middle" stroke="none" class="t-blue">S = a ⊕ b</text>
<text x="95" y="216" font-size="13" text-anchor="middle" stroke="none" class="t-purple">C = a · b</text>
<line x1="205" y1="10" x2="205" y2="250" class="s-gray" stroke-width="1" stroke-dasharray="3 4"/>
<text x="370" y="20" font-size="14" text-anchor="middle" stroke="none" font-weight="bold">Full adder</text>
<path d="M277.0,36.0 Q292.0,56 277.0,76.0 Q312.0,76.0 327.0,56 Q312.0,36.0 277.0,36.0 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M277.0,36.0 Q292.0,56 277.0,76.0 Q312.0,76.0 327.0,56 Q312.0,36.0 277.0,36.0 Z"/>
<path d="M270,36.0 Q285.0,56 270,76.0"/>
<path d="M377.0,46.0 Q392.0,66 377.0,86.0 Q412.0,86.0 427.0,66 Q412.0,46.0 377.0,46.0 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M377.0,46.0 Q392.0,66 377.0,86.0 Q412.0,86.0 427.0,66 Q412.0,46.0 377.0,46.0 Z"/>
<path d="M370,46.0 Q385.0,66 370,86.0"/>
<path d="M370,176.0 H395.0 A20.0,20.0 0 0 1 395.0,216.0 H370 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M370,176.0 H395.0 A20.0,20.0 0 0 1 395.0,216.0 H370 Z"/>
<path d="M370,106.0 H395.0 A20.0,20.0 0 0 1 395.0,146.0 H370 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M370,106.0 H395.0 A20.0,20.0 0 0 1 395.0,146.0 H370 Z"/>
<path d="M450,155.0 Q465.0,175 450,195.0 Q485.0,195.0 500.0,175 Q485.0,155.0 450,155.0 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M450,155.0 Q465.0,175 450,195.0 Q485.0,195.0 500.0,175 Q485.0,155.0 450,155.0 Z"/>
<text x="224" y="51" font-size="14" text-anchor="end" stroke="none" font-weight="bold">a</text>
<text x="224" y="71" font-size="14" text-anchor="end" stroke="none" font-weight="bold">b</text>
<text x="224" y="165" font-size="14" text-anchor="end" stroke="none" font-weight="bold">cᵢₙ</text>
<line x1="230" y1="46" x2="272" y2="46"/>
<line x1="230" y1="66" x2="272" y2="66"/>
<polyline points="244,46 244,186 370,186.0"/>
<circle cx="244" cy="46" r="3.5" fill="currentColor" stroke="none"/>
<polyline points="256,66 256,206 370,206.0"/>
<circle cx="256" cy="66" r="3.5" fill="currentColor" stroke="none"/>
<line x1="327.0" y1="56" x2="372" y2="56"/>
<text x="335" y="50" font-size="13" text-anchor="middle" stroke="none" class="t-orange" font-weight="bold">p</text>
<polyline points="345,56 345,116 370,116.0"/>
<circle cx="345" cy="56" r="3.5" fill="currentColor" stroke="none"/>
<polyline points="230,160 330,160 330,76 372,76.0"/>
<polyline points="330,136 370,136.0"/>
<circle cx="330" cy="136" r="3.5" fill="currentColor" stroke="none"/>
<line x1="427.0" y1="66" x2="510" y2="66"/>
<text x="512" y="60" font-size="14" text-anchor="end" stroke="none" class="t-blue" font-weight="bold">S</text>
<polyline points="415.0,126 435,126 435,165 453,165.0"/>
<polyline points="415.0,196 435,196 435,185 453,185.0"/>
<text x="441" y="222" font-size="12" text-anchor="start" stroke="none" class="t-gray">g = a·b</text>
<text x="441" y="116" font-size="12" text-anchor="start" stroke="none" class="t-gray">p·cᵢₙ</text>
<line x1="500.0" y1="175" x2="525" y2="175"/>
<text x="522" y="200" font-size="14" text-anchor="end" stroke="none" class="t-purple" font-weight="bold">cₒᵤₜ</text>
</svg>`,
          alt: 'Left: half adder made of an XOR gate producing S and an AND gate producing C from inputs a and b. Right: full adder with inputs a, b and carry-in; one XOR computes p = a xor b, a second XOR computes S = p xor cin, one AND computes g = a·b, another computes p·cin, and an OR combines them into cout.',
          caption: 'A half adder (left) adds two bits. A full adder (right) also accepts a carry in: two XORs make the sum, and the carry out is g + p·cᵢₙ.',
          maxWidth: 520,
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The full adder',
      blocks: [
        {
          type: 'p',
          text: 'To add multi-bit numbers, every column except the first must also add the carry coming in from the column to its right. A [[full-adder|full adder]] adds three bits, a, b and cᵢₙ, producing a sum bit and a carry out:',
        },
        {
          type: 'table',
          headers: ['a', 'b', 'cᵢₙ', 'cₒᵤₜ', 'S'],
          rows: [
            ['0', '0', '0', '0', '0'],
            ['0', '0', '1', '0', '1'],
            ['0', '1', '0', '0', '1'],
            ['0', '1', '1', '1', '0'],
            ['1', '0', '0', '0', '1'],
            ['1', '0', '1', '1', '0'],
            ['1', '1', '0', '1', '0'],
            ['1', '1', '1', '1', '1'],
          ],
          caption: 'The output pair (cₒᵤₜ, S) is simply the 2-bit count of how many inputs are 1.',
        },
        {
          type: 'list',
          items: [
            '**Sum:** S = a ⊕ b ⊕ cᵢₙ. It is 1 when an odd number of inputs are 1.',
            '**Carry out:** cₒᵤₜ = a·b + cᵢₙ·(a ⊕ b). It is 1 when at least two inputs are 1, the *majority* function you verified in the previous lesson.',
          ],
        },
        {
          type: 'p',
          text: 'The two terms of the carry have names that the rest of this lesson depends on. **Generate** g = a·b: this column produces a carry no matter what comes in. **Propagate** p = a ⊕ b: this column passes an incoming carry through. So cₒᵤₜ = g + p·cᵢₙ.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why build it from two half adders?',
          text: 'The first XOR computes p = a ⊕ b, which serves twice: as the propagate signal for the carry and as an input to the second XOR for the sum. Sharing it keeps the full adder at five gates (two XOR, two AND, one OR) and, more importantly, keeps the **carry path** short: from cᵢₙ to cₒᵤₜ it passes through only an AND and an OR, two gate delays. That path is the one that matters when adders are chained.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'The ripple-carry adder',
      blocks: [
        {
          type: 'p',
          text: 'Chain n full adders, feeding each carry out into the next carry in, and you have an n-bit [[ripple-carry-adder]]. It is exactly column addition by hand. The catch is in the name: bit i cannot produce its final sum until the carry from bit i − 1 has arrived, which waits for bit i − 2, and so on. Watch 7 + 1 in a 4-bit adder, one full-adder delay per frame:',
        },
        {
          type: 'algo',
          view: 'graph',
          width: 440,
          height: 280,
          nodes: [
            { id: 'in0', x: 365, y: 40, label: '11' },
            { id: 'FA0', x: 365, y: 130, label: 'FA0' },
            { id: 's0', x: 365, y: 222, label: '0' },
            { id: 'in1', x: 270, y: 40, label: '10' },
            { id: 'FA1', x: 270, y: 130, label: 'FA1' },
            { id: 's1', x: 270, y: 222, label: '0' },
            { id: 'in2', x: 175, y: 40, label: '10' },
            { id: 'FA2', x: 175, y: 130, label: 'FA2' },
            { id: 's2', x: 175, y: 222, label: '0' },
            { id: 'in3', x: 80, y: 40, label: '00' },
            { id: 'FA3', x: 80, y: 130, label: 'FA3' },
            { id: 's3', x: 80, y: 222, label: '0' },
            { id: 'cin', x: 418, y: 130, label: '0' },
            { id: 'cout', x: 24, y: 130, label: '0' },
          ],
          edges: [
            { from: 'in0', to: 'FA0', directed: true },
            { from: 'in1', to: 'FA1', directed: true },
            { from: 'in2', to: 'FA2', directed: true },
            { from: 'in3', to: 'FA3', directed: true },
            { from: 'FA0', to: 's0', directed: true },
            { from: 'FA1', to: 's1', directed: true },
            { from: 'FA2', to: 's2', directed: true },
            { from: 'FA3', to: 's3', directed: true },
            { from: 'cin', to: 'FA0', directed: true },
            { from: 'FA0', to: 'FA1', directed: true },
            { from: 'FA1', to: 'FA2', directed: true },
            { from: 'FA2', to: 'FA3', directed: true },
            { from: 'FA3', to: 'cout', directed: true },
          ],
          caption: 'A 4-bit ripple-carry adder computing 7 + 1. Top: input bit pairs aᵢbᵢ. Bottom: sum bits. Purple arrows carry a 1. Red sums are not yet valid.',
          interval: 1500,
          frames: [
            {
              note: 'The adder has settled on 0000 + 0000. Now the inputs change to a = 0111 (7) and b = 0001 (1). Each node above shows aᵢbᵢ.',
              nodeLabels: [
                { id: 's0', label: '0' },
                { id: 's1', label: '0' },
                { id: 's2', label: '0' },
                { id: 's3', label: '0' },
                { id: 'cout', label: '0' },
              ],
              nodeColors: [
                { id: 'in0', color: 'blue' },
                { id: 'in1', color: 'blue' },
                { id: 'in2', color: 'blue' },
                { id: 'in3', color: 'blue' },
              ],
              vars: [['time', '0'], ['sum', '0000'], ['correct', '1000 (8)']],
            },
            {
              note: 'After 1 full-adder delay, every adder has reacted to its own aᵢ and bᵢ, but each still assumes carry-in 0. FA0 produces a carry. The sum reads 0110: **wrong**.',
              nodeLabels: [
                { id: 's0', label: '0' },
                { id: 's1', label: '1' },
                { id: 's2', label: '1' },
                { id: 's3', label: '0' },
                { id: 'cout', label: '0' },
              ],
              nodeColors: [
                { id: 'FA0', color: 'orange' },
                { id: 'FA1', color: 'orange' },
                { id: 'FA2', color: 'orange' },
                { id: 's0', color: 'red' },
                { id: 's1', color: 'red' },
                { id: 's2', color: 'red' },
                { id: 's3', color: 'red' },
              ],
              edgeColors: [{ from: 'FA0', to: 'FA1', color: 'purple' }],
              vars: [['time', '1 FA delay'], ['sum', '0110'], ['correct', '1000 (8)']],
            },
            {
              note: 'After 2 delays the carry has rippled into FA1, which flips its sum bit and passes a carry on. The sum reads 0100: still wrong.',
              nodeLabels: [
                { id: 's0', label: '0' },
                { id: 's1', label: '0' },
                { id: 's2', label: '1' },
                { id: 's3', label: '0' },
                { id: 'cout', label: '0' },
              ],
              nodeColors: [
                { id: 'FA1', color: 'orange' },
                { id: 's0', color: 'red' },
                { id: 's1', color: 'red' },
                { id: 's2', color: 'red' },
                { id: 's3', color: 'red' },
              ],
              edgeColors: [{ from: 'FA0', to: 'FA1', color: 'purple' }, { from: 'FA1', to: 'FA2', color: 'purple' }],
              vars: [['time', '2 FA delays'], ['sum', '0100'], ['correct', '1000 (8)']],
            },
            {
              note: 'After 3 delays the carry has rippled into FA2, which flips its sum bit and passes a carry on. The sum reads 0000: still wrong.',
              nodeLabels: [
                { id: 's0', label: '0' },
                { id: 's1', label: '0' },
                { id: 's2', label: '0' },
                { id: 's3', label: '0' },
                { id: 'cout', label: '0' },
              ],
              nodeColors: [
                { id: 'FA2', color: 'orange' },
                { id: 's0', color: 'red' },
                { id: 's1', color: 'red' },
                { id: 's2', color: 'red' },
                { id: 's3', color: 'red' },
              ],
              edgeColors: [
                { from: 'FA0', to: 'FA1', color: 'purple' },
                { from: 'FA1', to: 'FA2', color: 'purple' },
                { from: 'FA2', to: 'FA3', color: 'purple' },
              ],
              vars: [['time', '3 FA delays'], ['sum', '0000'], ['correct', '1000 (8)']],
            },
            {
              note: 'After 4 delays the carry reaches FA3. The sum is 1000 = 8 ✓ and nothing changes any more: the adder has settled.',
              nodeLabels: [
                { id: 's0', label: '0' },
                { id: 's1', label: '0' },
                { id: 's2', label: '0' },
                { id: 's3', label: '1' },
                { id: 'cout', label: '0' },
              ],
              nodeColors: [
                { id: 'FA3', color: 'orange' },
                { id: 's0', color: 'green' },
                { id: 's1', color: 'green' },
                { id: 's2', color: 'green' },
                { id: 's3', color: 'green' },
              ],
              edgeColors: [
                { from: 'FA0', to: 'FA1', color: 'purple' },
                { from: 'FA1', to: 'FA2', color: 'purple' },
                { from: 'FA2', to: 'FA3', color: 'purple' },
              ],
              vars: [['time', '4 FA delays'], ['sum', '1000'], ['correct', '1000 (8)']],
            },
            {
              note: 'Worst case for n bits: the carry crosses all n adders. A 64-bit ripple-carry adder would need 64 full-adder delays before the sum can be trusted.',
              nodeLabels: [
                { id: 's0', label: '0' },
                { id: 's1', label: '0' },
                { id: 's2', label: '0' },
                { id: 's3', label: '1' },
                { id: 'cout', label: '0' },
              ],
              nodeColors: [
                { id: 'FA0', color: 'purple' },
                { id: 'FA1', color: 'purple' },
                { id: 'FA2', color: 'purple' },
              ],
              edgeColors: [
                { from: 'FA0', to: 'FA1', color: 'purple' },
                { from: 'FA1', to: 'FA2', color: 'purple' },
                { from: 'FA2', to: 'FA3', color: 'purple' },
              ],
              vars: [['delay', '∝ n'], ['64-bit', '64 FA delays']],
            },
          ],
        },
        {
          type: 'p',
          text: 'Here is the same circuit in C++, built from the gate equations and checked against the built-in `+`. It also measures the longest run of consecutive carries, which is how many full adders the carry had to ripple through:',
        },
        {
          type: 'code',
          title: 'ripple_adder.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <cstdio>

struct Bit2 { bool sum, carry; };

// One full adder: 2 XOR, 2 AND, 1 OR.
Bit2 fullAdder(bool a, bool b, bool cin) {
    bool p = a ^ b;                    // propagate
    bool sum = p ^ cin;
    bool cout = (a & b) | (p & cin);   // generate | propagate*cin
    return {sum, cout};
}

// n-bit ripple-carry adder; also reports how far the carry rippled.
std::uint32_t rippleAdd(std::uint32_t a, std::uint32_t b, int n,
                        bool& carryOut, int& longestChain) {
    std::uint32_t result = 0;
    bool carry = false;
    int chain = 0;
    longestChain = 0;
    for (int i = 0; i < n; ++i) {
        Bit2 r = fullAdder((a >> i) & 1, (b >> i) & 1, carry);
        result |= std::uint32_t{r.sum} << i;
        chain = r.carry ? (carry ? chain + 1 : 1) : 0;
        if (chain > longestChain) longestChain = chain;
        carry = r.carry;
    }
    carryOut = carry;
    return result;
}

int main() {
    const std::uint32_t tests[][2] = {
        {5, 3}, {100, 27}, {0x7FFF, 1}, {0xFFFF, 1}};
    for (auto& t : tests) {
        bool cout;
        int chain;
        std::uint32_t s = rippleAdd(t[0], t[1], 16, cout, chain);
        std::printf("%5u + %u = %5u  carry-out %d  carry chain %2d"
                    "  (check %u)\\n", t[0], t[1], s, cout, chain,
                    (t[0] + t[1]) & 0xFFFF);
    }
}`,
          output: `    5 + 3 =     8  carry-out 0  carry chain  3  (check 8)
  100 + 27 =   127  carry-out 0  carry chain  0  (check 127)
32767 + 1 = 32768  carry-out 0  carry chain 15  (check 32768)
65535 + 1 =     0  carry-out 1  carry chain 16  (check 0)`,
          annotations: [
            { lines: '7-12', text: 'The gate equations from the previous card, one C++ operator per gate.' },
            { lines: 22, text: 'Each iteration is one full adder. The loop runs in order because bit i really does need the carry from bit i − 1: that dependency **is** the ripple.' },
            { lines: 24, text: 'Count how many consecutive adders produced a carry. A long chain means the carry had to travel far before the sum was valid.' },
            { lines: 35, text: '100 + 27 = 0b1100100 + 0b0011011: no column has two 1s, so no carry is ever generated and every sum bit is ready after one delay.' },
            { lines: 36, text: '0xFFFF + 1 is the worst case: a carry generated in bit 0 must ripple through all 16 adders and out the top.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why the worst case is what counts',
          text: 'Most additions have short carry chains, but the hardware cannot know in advance which inputs it will get, and the clock (next lesson) must leave enough time for the slowest possible case. A 64-bit ripple-carry adder needs about 64 carry delays, roughly 128 gate delays. Yet a modern x86 core performs a 64-bit `add` with a latency of a single cycle at 4–5 GHz. Something cleverer is going on.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'numeric',
      prompt: 'In a 32-bit ripple-carry adder, the carry path through each full adder (cᵢₙ → AND → OR → cₒᵤₜ) takes 2 gate delays. In the worst case, how many gate delays does it take for a carry generated in bit 0 to reach the final carry out of bit 31? (Count only the carry path through each of the 32 adders.)',
      answer: 64,
      unit: 'gate delays',
      hint: 'The carry passes through every one of the 32 adders.',
      explanation:
        'The worst case is a carry that is generated at bit 0 and propagated by every other bit (for example 0xFFFFFFFF + 1). It must pass through the carry logic of all 32 full adders, 2 gate delays each: 32 × 2 = 64 gate delays. Delay grows **linearly** with the width, so a 64-bit ripple adder would take twice as long again. That linear growth is the problem carry-lookahead solves.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Carry-lookahead: computing carries in parallel',
      blocks: [
        {
          type: 'p',
          text: 'The trick behind the [[carry-lookahead-adder|carry-lookahead adder]] is to stop waiting for carries and **compute them directly from the inputs**. Every column\'s g and p depend only on its own aᵢ and bᵢ, so all of them are ready after one gate delay. Then unroll the recurrence cᵢ₊₁ = gᵢ + pᵢ·cᵢ:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'carry equations, expanded',
          code: `c1 = g0 + p0·c0
c2 = g1 + p1·g0 + p1·p0·c0
c3 = g2 + p2·g1 + p2·p1·g0 + p2·p1·p0·c0
c4 = g3 + p3·g2 + p3·p2·g1 + p3·p2·p1·g0 + p3·p2·p1·p0·c0`,
          annotations: [
            { lines: 2, text: 'Read it as: "a carry reaches bit 2 if bit 1 generates one, or if bit 0 generates one and bit 1 propagates it, or if c0 comes in and both propagate it".' },
            { lines: 4, text: 'Every carry is a sum of products of signals that are already known, so each is just one level of AND gates followed by one OR: two gate delays, no matter which bit.' },
          ],
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 250" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<text x="400" y="18" font-size="13" text-anchor="middle" stroke="none">a₀ b₀</text>
<line x1="400" y1="24" x2="400.0" y2="36.4" stroke-width="1.6"/>
<path d="M400.0,42.0 L396.5,35.0 L403.5,35.0 Z" fill="currentColor" stroke="none"/>
<rect x="364" y="42" width="72" height="34" rx="4" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="364" y="42" width="72" height="34" rx="4"/>
<text x="400" y="64" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">g, p</text>
<line x1="388" y1="76" x2="388.0" y2="102.4" class="s-blue" stroke-width="1.6"/>
<path d="M388.0,108.0 L384.5,101.0 L391.5,101.0 Z" class="f-blue" stroke="none"/>
<line x1="412" y1="140" x2="412.0" y2="166.4" class="s-purple" stroke-width="1.6"/>
<path d="M412.0,172.0 L408.5,165.0 L415.5,165.0 Z" class="f-purple" stroke="none"/>
<text x="434" y="160" font-size="12" text-anchor="middle" stroke="none" class="t-purple">c₀</text>
<rect x="364" y="172" width="72" height="34" rx="4" class="f-green" fill-opacity="0.12" stroke="none"/>
<rect x="364" y="172" width="72" height="34" rx="4"/>
<text x="400" y="194" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">p ⊕ c</text>
<line x1="400" y1="206" x2="400.0" y2="220.4" stroke-width="1.6"/>
<path d="M400.0,226.0 L396.5,219.0 L403.5,219.0 Z" fill="currentColor" stroke="none"/>
<text x="400" y="242" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">s₀</text>
<text x="300" y="18" font-size="13" text-anchor="middle" stroke="none">a₁ b₁</text>
<line x1="300" y1="24" x2="300.0" y2="36.4" stroke-width="1.6"/>
<path d="M300.0,42.0 L296.5,35.0 L303.5,35.0 Z" fill="currentColor" stroke="none"/>
<rect x="264" y="42" width="72" height="34" rx="4" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="264" y="42" width="72" height="34" rx="4"/>
<text x="300" y="64" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">g, p</text>
<line x1="288" y1="76" x2="288.0" y2="102.4" class="s-blue" stroke-width="1.6"/>
<path d="M288.0,108.0 L284.5,101.0 L291.5,101.0 Z" class="f-blue" stroke="none"/>
<line x1="312" y1="140" x2="312.0" y2="166.4" class="s-purple" stroke-width="1.6"/>
<path d="M312.0,172.0 L308.5,165.0 L315.5,165.0 Z" class="f-purple" stroke="none"/>
<text x="334" y="160" font-size="12" text-anchor="middle" stroke="none" class="t-purple">c₁</text>
<rect x="264" y="172" width="72" height="34" rx="4" class="f-green" fill-opacity="0.12" stroke="none"/>
<rect x="264" y="172" width="72" height="34" rx="4"/>
<text x="300" y="194" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">p ⊕ c</text>
<line x1="300" y1="206" x2="300.0" y2="220.4" stroke-width="1.6"/>
<path d="M300.0,226.0 L296.5,219.0 L303.5,219.0 Z" fill="currentColor" stroke="none"/>
<text x="300" y="242" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">s₁</text>
<text x="200" y="18" font-size="13" text-anchor="middle" stroke="none">a₂ b₂</text>
<line x1="200" y1="24" x2="200.0" y2="36.4" stroke-width="1.6"/>
<path d="M200.0,42.0 L196.5,35.0 L203.5,35.0 Z" fill="currentColor" stroke="none"/>
<rect x="164" y="42" width="72" height="34" rx="4" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="164" y="42" width="72" height="34" rx="4"/>
<text x="200" y="64" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">g, p</text>
<line x1="188" y1="76" x2="188.0" y2="102.4" class="s-blue" stroke-width="1.6"/>
<path d="M188.0,108.0 L184.5,101.0 L191.5,101.0 Z" class="f-blue" stroke="none"/>
<line x1="212" y1="140" x2="212.0" y2="166.4" class="s-purple" stroke-width="1.6"/>
<path d="M212.0,172.0 L208.5,165.0 L215.5,165.0 Z" class="f-purple" stroke="none"/>
<text x="234" y="160" font-size="12" text-anchor="middle" stroke="none" class="t-purple">c₂</text>
<rect x="164" y="172" width="72" height="34" rx="4" class="f-green" fill-opacity="0.12" stroke="none"/>
<rect x="164" y="172" width="72" height="34" rx="4"/>
<text x="200" y="194" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">p ⊕ c</text>
<line x1="200" y1="206" x2="200.0" y2="220.4" stroke-width="1.6"/>
<path d="M200.0,226.0 L196.5,219.0 L203.5,219.0 Z" fill="currentColor" stroke="none"/>
<text x="200" y="242" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">s₂</text>
<text x="100" y="18" font-size="13" text-anchor="middle" stroke="none">a₃ b₃</text>
<line x1="100" y1="24" x2="100.0" y2="36.4" stroke-width="1.6"/>
<path d="M100.0,42.0 L96.5,35.0 L103.5,35.0 Z" fill="currentColor" stroke="none"/>
<rect x="64" y="42" width="72" height="34" rx="4" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="64" y="42" width="72" height="34" rx="4"/>
<text x="100" y="64" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">g, p</text>
<line x1="88" y1="76" x2="88.0" y2="102.4" class="s-blue" stroke-width="1.6"/>
<path d="M88.0,108.0 L84.5,101.0 L91.5,101.0 Z" class="f-blue" stroke="none"/>
<line x1="112" y1="140" x2="112.0" y2="166.4" class="s-purple" stroke-width="1.6"/>
<path d="M112.0,172.0 L108.5,165.0 L115.5,165.0 Z" class="f-purple" stroke="none"/>
<text x="134" y="160" font-size="12" text-anchor="middle" stroke="none" class="t-purple">c₃</text>
<rect x="64" y="172" width="72" height="34" rx="4" class="f-green" fill-opacity="0.12" stroke="none"/>
<rect x="64" y="172" width="72" height="34" rx="4"/>
<text x="100" y="194" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">p ⊕ c</text>
<line x1="100" y1="206" x2="100.0" y2="220.4" stroke-width="1.6"/>
<path d="M100.0,226.0 L96.5,219.0 L103.5,219.0 Z" fill="currentColor" stroke="none"/>
<text x="100" y="242" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">s₃</text>
<rect x="60" y="108" width="380" height="32" rx="4" class="f-purple" fill-opacity="0.14" stroke="none"/>
<rect x="60" y="108" width="380" height="32" rx="4" class="s-purple"/>
<text x="250" y="129" font-size="13" text-anchor="middle" stroke="none" class="t-purple" font-weight="bold">carry-lookahead logic: all carries in 2 gate levels</text>
<line x1="480" y1="124" x2="447.6" y2="124.0" class="s-purple" stroke-width="1.6"/>
<path d="M442.0,124.0 L449.0,120.5 L449.0,127.5 Z" class="f-purple" stroke="none"/>
<text x="486" y="128" font-size="13" text-anchor="start" stroke="none" class="t-purple">c₀</text>
<line x1="60" y1="124" x2="27.6" y2="124.0" class="s-purple" stroke-width="1.6"/>
<path d="M22.0,124.0 L29.0,120.5 L29.0,127.5 Z" class="f-purple" stroke="none"/>
<text x="28" y="112" font-size="13" text-anchor="middle" stroke="none" class="t-purple">c₄</text>
</svg>`,
          alt: 'A 4-bit carry-lookahead adder: four boxes compute g and p from each input pair, a carry-lookahead logic block computes c1 to c4 from all g, p and c0 at once, and four boxes compute each sum bit as p xor c.',
          caption: 'A 4-bit carry-lookahead adder. Every sum bit is ready after the same small, fixed number of gate delays.',
          maxWidth: 520,
        },
        {
          type: 'p',
          text: 'The price is hardware: the equation for bit i has i + 1 terms and gates with up to i + 1 inputs, so you cannot flatten 64 bits this way. Real designs apply the idea **hierarchically**. Group 4 bits into a block with its own block-generate G and block-propagate P, then look ahead across blocks, then across groups of blocks. Modern CPUs use **parallel-prefix adders** (Kogge–Stone, Brent–Kung, Han–Carlson and hybrids) that combine (g, p) pairs in a tree, so the carry into every bit is known after about log₂ n levels: 6 levels for 64 bits instead of 64 sequential steps.',
        },
        {
          type: 'table',
          headers: ['Adder', 'Delay for n bits', 'Hardware', 'Used where'],
          rows: [
            ['Ripple-carry', 'grows like n', 'n full adders, smallest', 'Tiny or slow circuits, simple counters'],
            ['Carry-lookahead (blocked)', 'grows like log n with hierarchy', 'More gates and wider gates', 'Classic textbook fast adder'],
            ['Parallel-prefix (e.g. Kogge–Stone)', 'grows like log n', 'Most gates and wiring', 'The integer adders in high-frequency CPUs'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Trading area for time',
          text: 'This is the first appearance of a theme that runs through the whole course: spend transistors to save time. Transistors became almost free (billions per chip), while clock periods are limited by physics. So designers happily triple an adder\'s gate count to shave its delay, because the adder sits on the critical path of nearly every instruction. You will see the same trade-off in caches, branch predictors and out-of-order execution.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: 'Why is a carry-lookahead adder faster than a ripple-carry adder of the same width?',
      options: [
        { text: 'Its gates switch faster because it uses a different transistor technology', why: 'Both are built from the same gates on the same chip. The speedup comes from the circuit\'s structure, not from faster gates.' },
        { text: 'It computes every carry directly from the generate and propagate signals of the lower bits instead of waiting for each carry to arrive from the previous bit', correct: true, why: 'The g and p signals depend only on each bit\'s own inputs, so they are all available at once, and expanding the carry recurrence turns the long chain into shallow sum-of-products logic.' },
        { text: 'It skips the carry computation for bits where both inputs are 0', why: 'A circuit cannot skip work depending on data; every gate is always there. Bits with both inputs 0 simply have g = 0 and p = 0.' },
        { text: 'It adds the bits from the most significant end first, where carries matter most', why: 'Order is not the issue. Carries flow from low bits to high bits in both designs; lookahead just computes them without a sequential chain.' },
      ],
      explanation:
        'A ripple-carry adder is a chain of n dependent steps, so its delay grows linearly. Carry-lookahead removes the chain by observing that cᵢ₊₁ = gᵢ + pᵢ·cᵢ can be expanded into an expression of signals that are all known after one gate delay. Applied hierarchically or as a prefix tree, that gives roughly log₂ n levels of logic, at the cost of more gates and wires.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Multiplexers and decoders',
      blocks: [
        {
          type: 'p',
          text: 'Adders compute; the other essential combinational building blocks **route** data. A [[multiplexer]] (mux) selects one of several inputs based on a select signal. A 2-to-1 mux outputs `a` when s = 0 and `b` when s = 1: y = s̄·a + s·b.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 250" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<text x="150" y="18" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">Gate level</text>
<path d="M150,44.0 H175.0 A20.0,20.0 0 0 1 175.0,84.0 H150 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M150,44.0 H175.0 A20.0,20.0 0 0 1 175.0,84.0 H150 Z"/>
<path d="M150,130.0 H175.0 A20.0,20.0 0 0 1 175.0,170.0 H150 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M150,130.0 H175.0 A20.0,20.0 0 0 1 175.0,170.0 H150 Z"/>
<path d="M240,87.0 Q255.0,107 240,127.0 Q275.0,127.0 290.0,107 Q275.0,87.0 240,87.0 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M240,87.0 Q255.0,107 240,127.0 Q275.0,127.0 290.0,107 Q275.0,87.0 240,87.0 Z"/>
<path d="M60,191.0 L88.0,205 L60,219.0 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M60,191.0 L88.0,205 L60,219.0 Z"/>
<circle cx="92.0" cy="205" r="4"/>
<text x="18" y="59" font-size="14" text-anchor="end" stroke="none" font-weight="bold">a</text>
<line x1="22" y1="54" x2="150" y2="54"/>
<text x="18" y="165" font-size="14" text-anchor="end" stroke="none" font-weight="bold">b</text>
<line x1="22" y1="160" x2="150" y2="160"/>
<text x="18" y="210" font-size="14" text-anchor="end" stroke="none" font-weight="bold">s</text>
<line x1="22" y1="205" x2="60" y2="205"/>
<polyline points="40,205 40,240 125,240 125,140 150,140.0"/>
<circle cx="40" cy="205" r="3.5" fill="currentColor" stroke="none"/>
<polyline points="96.0,205 110,205 110,74 150,74.0"/>
<text x="118" y="92" font-size="12" text-anchor="start" stroke="none" class="t-gray">s̄</text>
<polyline points="195.0,64 225,64 225,97 243,97.0"/>
<polyline points="195.0,150 225,150 225,117 243,117.0"/>
<line x1="290.0" y1="107" x2="320" y2="107"/>
<text x="326" y="112" font-size="14" text-anchor="start" stroke="none" class="t-blue" font-weight="bold">y</text>
<line x1="345" y1="10" x2="345" y2="250" class="s-gray" stroke-width="1" stroke-dasharray="3 4"/>
<text x="440" y="18" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">Symbol</text>
<path d="M420,60 L460,80 L460,140 L420,160 Z"/>
<path d="M420,60 L460,80 L460,140 L420,160 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<line x1="380" y1="85" x2="420" y2="85"/>
<text x="375" y="90" font-size="14" text-anchor="end" stroke="none" font-weight="bold">a</text>
<text x="428" y="90" font-size="12" text-anchor="start" stroke="none" class="t-gray">0</text>
<line x1="380" y1="135" x2="420" y2="135"/>
<text x="375" y="140" font-size="14" text-anchor="end" stroke="none" font-weight="bold">b</text>
<text x="428" y="140" font-size="12" text-anchor="start" stroke="none" class="t-gray">1</text>
<line x1="440" y1="150" x2="440" y2="185"/>
<text x="440" y="200" font-size="14" text-anchor="middle" stroke="none" font-weight="bold">s</text>
<line x1="460" y1="110" x2="495" y2="110"/>
<text x="500" y="115" font-size="14" text-anchor="start" stroke="none" class="t-blue" font-weight="bold">y</text>
<text x="440" y="232" font-size="13" text-anchor="middle" stroke="none" class="t-blue">y = s ? b : a</text>
</svg>`,
          alt: 'Left: a 2-to-1 multiplexer built from a NOT gate on s, two AND gates computing a·s-bar and b·s, and an OR gate producing y. Right: the trapezoid symbol of the same multiplexer with inputs a (0) and b (1), select s and output y.',
          caption: 'A 2-to-1 multiplexer at gate level and as a symbol. It is the hardware form of `y = s ? b : a`.',
          maxWidth: 520,
        },
        {
          type: 'list',
          items: [
            'Wider muxes are built from smaller ones: a 4-to-1 mux is three 2-to-1 muxes in two levels, selected by two bits. An n-bit-wide mux is n one-bit muxes sharing a select line.',
            'A **decoder** turns an n-bit number into 2ⁿ outputs of which exactly one is 1 (*one-hot*). A 2-to-4 decoder maps 10₂ to outputs 0100. Decoders select which register to write and which memory row to activate.',
            'Muxes are everywhere in a CPU: choosing the ALU\'s second operand (a register or an immediate constant), choosing the value written back (ALU result or loaded data), and reading registers out of a register file.',
          ],
        },
        {
          type: 'p',
          text: 'Software has its own mux. When the compiler can, it turns a C++ conditional into a **conditional move**, which selects between two values already computed instead of jumping. Here is GCC 13 at `-O2`:',
        },
        {
          type: 'code',
          title: 'select.cpp',
          code: `int pick(bool useB, int a, int b) { return useB ? b : a; }
int clampHealth(int hp) { return hp < 0 ? 0 : hp; }`,
          annotations: [
            { lines: 1, text: 'A mux: the select is `useB`, the inputs are `a` and `b`.' },
            { lines: 2, text: 'Clamping is a mux too: select 0 or `hp` based on the sign bit.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'x86-64, g++ 13 -O2 -masm=intel',
          code: `pick(bool, int, int):
    test    dil, dil        ; set flags from useB
    mov     eax, edx        ; assume b
    cmove   eax, esi        ; if useB == 0, take a
    ret
clampHealth(int):
    xor     eax, eax        ; candidate 0
    test    edi, edi        ; flags from hp
    cmovns  eax, edi        ; if hp is not negative, take hp
    ret`,
          annotations: [
            { lines: 4, text: '`cmove` ("move if equal", that is, if the zero flag is set) is a multiplexer driven by a flag. No branch, so nothing for the branch predictor to get wrong.' },
            { lines: 9, text: '`cmovns`: move if the sign flag is not set. The flags from the previous lesson select the mux input.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Branchless selects',
          text: 'When the condition is unpredictable (say, half of your particles are alive at random), a `cmov` avoids branch mispredictions, which cost on the order of 15–20 cycles on modern cores. The branch-prediction lesson covers when branchless code wins and when it loses. In SIMD code there are no branches at all: every select is a mask-based mux, `(a & ~m) | (b & m)`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: 'Complete this branchless 32-bit multiplexer. `s` is 0 or 1; `m` becomes all zeros or all ones; `y` must equal `s ? b : a`.',
      template: `std::uint32_t m = 0u - s;   // 0x00000000 or 0xFFFFFFFF
std::uint32_t y = (a & ___m) ___ (b & m);`,
      blanks: [{ answers: ['~'] }, { answers: ['|'] }],
      wordBank: ['~', '!', '-', '|', '&'],
      explanation:
        'This is the gate-level mux y = s̄·a + s·b applied to all 32 bits at once. When s = 0, m is all zeros, `~m` is all ones, so the left term keeps `a` and the right term is 0. When s = 1 it is the other way round. `|` combines the two terms (since they never have a 1 in the same position, `^` or `+` would also work). `!m` would produce a `bool`, which is only 0 or 1, not a 32-bit mask.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Building an ALU',
      blocks: [
        {
          type: 'p',
          text: 'An [[alu|ALU]] (arithmetic logic unit) is the combinational heart of a CPU: it takes two operands and an operation code and produces a result plus status flags. You now have every part. Start with a **1-bit slice** that computes AND, OR and sum for one bit position, and let a mux choose among them:',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 276" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<text x="14" y="49" font-size="14" text-anchor="end" stroke="none" font-weight="bold">a</text>
<text x="14" y="189" font-size="14" text-anchor="end" stroke="none" font-weight="bold">b</text>
<path d="M50,200.0 L78.0,214 L50,228.0 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M50,200.0 L78.0,214 L50,228.0 Z"/>
<circle cx="82.0" cy="214" r="4"/>
<line x1="18" y1="184" x2="130" y2="184"/>
<circle cx="36" cy="184" r="3.5" fill="currentColor" stroke="none"/>
<polyline points="36,184 36,214 50,214"/>
<polyline points="86.0,214 130,214"/>
<path d="M130,170 L156,182 L156,218 L130,230 Z" class="f-orange" fill-opacity="0.15" stroke="none"/>
<path d="M130,170 L156,182 L156,218 L130,230 Z"/>
<text x="136" y="188" font-size="10" text-anchor="start" stroke="none" class="t-gray">0</text>
<text x="136" y="218" font-size="10" text-anchor="start" stroke="none" class="t-gray">1</text>
<line x1="143" y1="224" x2="143" y2="250"/>
<text x="143" y="262" font-size="11" text-anchor="middle" stroke="none" class="t-orange">Binvert</text>
<line x1="156" y1="200" x2="190" y2="200"/>
<text x="172" y="194" font-size="12" text-anchor="middle" stroke="none" class="t-gray">b'</text>
<path d="M240,40.0 H265.0 A20.0,20.0 0 0 1 265.0,80.0 H240 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M240,40.0 H265.0 A20.0,20.0 0 0 1 265.0,80.0 H240 Z"/>
<path d="M240,105.0 Q255.0,125 240,145.0 Q275.0,145.0 290.0,125 Q275.0,105.0 240,105.0 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M240,105.0 Q255.0,125 240,145.0 Q275.0,145.0 290.0,125 Q275.0,105.0 240,105.0 Z"/>
<line x1="18" y1="44" x2="205" y2="44"/>
<polyline points="205,44 205,50 240,50.0"/>
<polyline points="205,44 205,115 243,115.0"/>
<circle cx="205" cy="50" r="3.5" fill="currentColor" stroke="none"/>
<polyline points="190,200 190,70 240,70.0"/>
<polyline points="190,135 243,135.0"/>
<circle cx="190" cy="135" r="3.5" fill="currentColor" stroke="none"/>
<rect x="240" y="180" width="50" height="50" rx="4" class="f-green" fill-opacity="0.14" stroke="none"/>
<rect x="240" y="180" width="50" height="50" rx="4"/>
<text x="265" y="212" font-size="22" text-anchor="middle" stroke="none" font-weight="bold">+</text>
<polyline points="205,115 205,192 240,192"/>
<circle cx="205" cy="115" r="3.5" fill="currentColor" stroke="none"/>
<polyline points="190,200 190,218 240,218"/>
<circle cx="190" cy="200" r="3.5" fill="currentColor" stroke="none"/>
<line x1="265" y1="160" x2="265" y2="180"/>
<text x="272" y="168" font-size="12" text-anchor="start" stroke="none">cᵢₙ</text>
<line x1="265" y1="230" x2="265" y2="252"/>
<text x="265" y="266" font-size="12" text-anchor="middle" stroke="none">cₒᵤₜ</text>
<path d="M370,40 L405,58 L405,212 L370,230 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M370,40 L405,58 L405,212 L370,230 Z"/>
<polyline points="285.0,60 370,60"/>
<text x="376" y="64" font-size="10" text-anchor="start" stroke="none" class="t-gray">0</text>
<polyline points="290.0,125 370,125"/>
<text x="376" y="129" font-size="10" text-anchor="start" stroke="none" class="t-gray">1</text>
<polyline points="290,205 370,205"/>
<text x="376" y="209" font-size="10" text-anchor="start" stroke="none" class="t-gray">2</text>
<line x1="388" y1="222" x2="388" y2="252"/>
<text x="388" y="266" font-size="11" text-anchor="middle" stroke="none" class="t-blue">Operation</text>
<line x1="405" y1="135" x2="450" y2="135"/>
<text x="456" y="132" font-size="14" text-anchor="start" stroke="none" class="t-blue" font-weight="bold">Result</text>
<text x="456" y="150" font-size="11" text-anchor="start" stroke="none" class="t-gray">bit i</text>
<text x="320" y="54" font-size="11" text-anchor="middle" stroke="none" class="t-gray">a AND b'</text>
<text x="322" y="119" font-size="11" text-anchor="middle" stroke="none" class="t-gray">a OR b'</text>
<text x="330" y="199" font-size="11" text-anchor="middle" stroke="none" class="t-gray">a + b' + cᵢₙ</text>
</svg>`,
          alt: 'A 1-bit ALU slice: input b passes through a 2-to-1 mux that selects b or NOT b under control Binvert, producing b-prime. An AND gate, an OR gate and a full adder each combine a with b-prime; the adder also has carry-in and carry-out. A 3-input multiplexer controlled by Operation selects one of the three as the result bit.',
          caption: 'One bit of an ALU. Copy it n times, chain cₒᵤₜ of bit i into cᵢₙ of bit i + 1, and drive all slices with the same Operation and Binvert signals.',
          maxWidth: 520,
        },
        {
          type: 'list',
          items: [
            '**Add:** Binvert = 0, carry into bit 0 = 0, select the adder.',
            '**Subtract:** Binvert = 1 and carry into bit 0 = 1, select the adder. The adder computes a + ~b + 1 = a − b. This is the two\'s complement trick from the integers lesson, built in hardware.',
            '**AND / OR:** select the AND or OR gate. Carries are ignored.',
            '**Flags:** Z = NOR of all result bits; N = the top result bit; C = the carry out of the top slice; V = carry into the top slice XOR carry out of it.',
          ],
        },
        {
          type: 'code',
          title: 'alu.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <cstdio>

enum class Op { And, Or, Add, Sub };

struct Flags { bool z, n, c, v; };

// An 8-bit ALU: the adder is shared by Add and Sub.
std::uint8_t alu(Op op, std::uint8_t a, std::uint8_t b, Flags& f) {
    bool invertB = (op == Op::Sub);
    std::uint8_t bIn = invertB ? std::uint8_t(~b) : b;
    unsigned carryIn = invertB ? 1 : 0;          // a + ~b + 1
    unsigned wide = unsigned{a} + bIn + carryIn;
    auto sum = static_cast<std::uint8_t>(wide);

    std::uint8_t result = op == Op::And ? (a & b)
                        : op == Op::Or  ? (a | b)
                        : sum;                    // the output mux
    f.z = (result == 0);
    f.n = (result & 0x80) != 0;
    bool arith = (op == Op::Add || op == Op::Sub);
    f.c = arith && wide > 0xFF;   // Sub: 1 means "no borrow"
    f.v = arith && ((a ^ result) & (bIn ^ result) & 0x80) != 0;
    return result;
}

int main() {
    Flags f;
    struct { Op op; const char* name; int a, b; } tests[] = {
        {Op::And, "AND", 0b1100, 0b1010}, {Op::Add, "ADD", 100, 50},
        {Op::Sub, "SUB", 7, 7},           {Op::Sub, "SUB", 5, 7},
        {Op::Add, "ADD", 200, 100},
    };
    for (auto& t : tests) {
        std::uint8_t r = alu(t.op, t.a, t.b, f);
        std::printf("%s %3d, %3d -> %3u (%4d)  Z=%d N=%d C=%d V=%d\\n",
                    t.name, t.a, t.b, r, static_cast<std::int8_t>(r),
                    f.z, f.n, f.c, f.v);
    }
}`,
          output: `AND  12,  10 ->   8 (   8)  Z=0 N=0 C=0 V=0
ADD 100,  50 -> 150 (-106)  Z=0 N=1 C=0 V=1
SUB   7,   7 ->   0 (   0)  Z=1 N=0 C=1 V=0
SUB   5,   7 -> 254 (  -2)  Z=0 N=1 C=0 V=0
ADD 200, 100 ->  44 (  44)  Z=0 N=0 C=1 V=0`,
          annotations: [
            { lines: '10-12', text: 'Binvert and the carry-in: the only difference between add and subtract.' },
            { lines: '16-18', text: 'The output multiplexer. In hardware all three results are computed every time; the mux just picks one.' },
            { lines: 19, text: 'Zero flag: one big NOR over all result bits.' },
            { lines: 22, text: 'ARM sets C = 1 after a subtraction that did **not** borrow, which is the raw carry out of a + ~b + 1. x86 stores the inverse (CF = 1 means a borrow happened). Same adder, different convention.' },
            { lines: 33, text: '7 − 7: the result is 0, so Z = 1. A `cmp` instruction is exactly this subtraction with the result thrown away, which is how `if (a == b)` becomes a flag test.' },
            { lines: 34, text: '5 − 7 = −2 (`1111 1110`): N = 1, and C = 0 because a borrow was needed (5 < 7 unsigned).' },
          ],
        },
        {
          type: 'deepdive',
          title: 'Multipliers and dividers',
          blocks: [
            {
              type: 'p',
              text: 'A multiplier is also combinational: multiplying by each bit of b gives a *partial product* (either 0 or a shifted copy of a), and a tree of adders (a Wallace or Dadda tree of carry-save adders) sums them in logarithmic depth. That is why a 64-bit `imul` on current x86 cores has a latency of only about 3 cycles. Division has no such shortcut: each quotient bit depends on the remainder from the previous step, so dividers iterate, and 64-bit `div` takes tens of cycles on many cores (see Agner Fog\'s instruction tables). This is the hardware reason behind the "avoid division in hot loops" advice from the integers lesson.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'numeric',
      prompt: 'A **4-bit** ALU performs `SUB` with a = 5 (`0101`) and b = 7 (`0111`). What 4-bit result does it output? Type it in binary, such as `0b0011`.',
      answer: '0b1110',
      alsoAccept: [14, -2],
      answerText: '0b1110 (14 unsigned, −2 signed)',
      label: 'Result =',
      hint: 'Compute a + ~b + 1 and keep 4 bits.',
      explanation:
        '~b = ~0111 = 1000. Then 0101 + 1000 + 1 = 1110 with no carry out of bit 3. As a two\'s complement number, 1110 is −8 + 4 + 2 = −2, which is correct for 5 − 7; as unsigned it is 14. The carry out is 0, so on ARM C = 0 ("a borrow happened") and on x86 CF = 1, and N = 1 because the top bit is set. The same 4 bits answer both the signed and the unsigned question; the flags tell you which interpretation is valid.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'order',
      prompt: 'Put the steps the ALU goes through to compute `a − b` in order.',
      linesAreCode: false,
      lines: [
        'The control logic sets Binvert = 1 and the carry into bit 0 to 1',
        'Every slice feeds a and the inverted b into its full adder',
        'The carries ripple (or are looked ahead) and every adder produces its sum bit, computing a + ~b + 1',
        'The output multiplexer selects the adder\'s result',
        'The flag logic computes Z, N, C and V from the result and the top carries',
      ],
      distractors: [
        'A separate subtractor circuit computes a − b directly',
      ],
      explanation:
        'Subtraction reuses the adder: inverting b and injecting a carry of 1 into bit 0 computes a + (~b + 1) = a + (−b). The sum bits are only valid once the carries have settled, and the output mux and flag logic work on those settled values. There is no separate subtractor: sharing the adder is one of the main reasons two\'s complement won.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'bug',
      prompt: 'This simulated full adder, chained into a 4-bit ripple-carry adder, passes many tests but computes `0b0110 + 0b0010` as `0b0000`. Tap the buggy line.',
      code: `struct Bit2 { bool sum, carry; };

Bit2 fullAdder(bool a, bool b, bool cin) {
    bool p = a ^ b;
    bool sum = p ^ cin;
    bool cout = a & b;
    return {sum, cout};
}`,
      bugLines: [6],
      hint: 'When should a column pass an incoming carry on?',
      explanation:
        'Line 6 only handles **generate** (both inputs are 1). It forgets **propagate**: when exactly one of a and b is 1 and a carry comes in, the column must pass the carry on. The correct carry is `(a & b) | (p & cin)`, the majority of the three inputs. With this bug, 0110 + 0010 gives 0000 instead of 1000: bit 1 generates a carry, but bit 2 (1 + 0 + carry) writes a 0 and drops the carry, so it never reaches bit 3.',
    },
  ],
  takeaways: [
    'Combinational circuits are pure functions of their inputs, but every gate has a propagation delay, and outputs may glitch before they settle.',
    'A full adder computes S = a ⊕ b ⊕ cᵢₙ and cₒᵤₜ = g + p·cᵢₙ, with generate g = a·b and propagate p = a ⊕ b.',
    'A ripple-carry adder chains n full adders; its worst-case delay grows linearly with n because each carry waits for the previous one.',
    'Carry-lookahead and parallel-prefix adders compute all carries from g and p in about log₂ n levels, trading more gates for the speed that lets a 64-bit add finish in one cycle.',
    'Multiplexers select and decoders pick one of 2ⁿ outputs; a C++ conditional select can compile to a `cmov`, a mux driven by a flag.',
    'An ALU is a row of slices sharing one adder: subtraction is a + ~b + 1, an output mux picks the operation, and flag logic produces Z, N, C and V.',
  ],
  reading: [
    { title: 'Nand2Tetris', url: 'https://www.nand2tetris.org/', source: 'other', note: 'Project 2 has you build a half adder, full adder, 16-bit adder and ALU yourself in a simple hardware description language.' },
    { title: 'Carry-lookahead adder', url: 'https://en.wikipedia.org/wiki/Carry-lookahead_adder', source: 'article', note: 'The generate/propagate equations worked out in detail, plus block lookahead.' },
    { title: 'Kogge–Stone adder', url: 'https://en.wikipedia.org/wiki/Kogge%E2%80%93Stone_adder', source: 'article', note: 'A parallel-prefix adder with logarithmic depth, the family used in fast CPUs.' },
    { title: 'Agner Fog\'s optimization resources', url: 'https://www.agner.org/optimize/', source: 'article', note: 'Instruction tables with measured latencies for add, imul, div and cmov on each microarchitecture.' },
    { title: 'Compiler Explorer', url: 'https://godbolt.org/', source: 'other', note: 'Try the select and clamp functions with different compilers and see when they produce cmov and when they branch.' },
  ],
};
