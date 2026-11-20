import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-sequential',
  title: 'Latches, Flip-Flops, Registers and Clocks',
  summary: 'Give circuits memory with feedback, build latches and edge-triggered flip-flops, assemble registers and register files, see how the critical path sets the clock frequency, and simulate a hardware state machine cycle by cycle in C++.',
  minutes: 20,
  objectives: [
    'Explain why feedback creates memory and trace the behaviour of an SR latch',
    'Distinguish a level-sensitive D latch from an edge-triggered D flip-flop, and explain why CPUs use flip-flops',
    'Describe registers and register files built from flip-flops, decoders and multiplexers',
    'Compute the maximum clock frequency from clock-to-Q, logic and setup delays, and explain setup and hold violations',
    'Design a finite-state machine in hardware terms and simulate it cycle by cycle in C++ with a correct two-phase update',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Why circuits need memory',
      blocks: [
        {
          type: 'p',
          text: 'Everything in the previous lesson was combinational: the outputs are a pure function of the inputs right now. That is enough to add two numbers, but not to run a program. A CPU must **remember** things between steps: which instruction comes next, the values in its registers, a timer counting down. Circuits whose outputs depend on the past as well as the present are called [[sequential-logic|sequential]].',
        },
        {
          type: 'p',
          text: 'The trick that creates memory is **feedback**: wire a gate\'s output back into its own input. Take two inverters in a loop. If the first outputs 1, the second outputs 0, which makes the first output 1 again: the loop holds itself in that state forever (as long as power is on). The opposite state is just as stable. Two stable states is exactly one bit of storage, a *bistable* circuit.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Doorbell versus light switch',
          text: 'A doorbell button is combinational: the bell rings only while you press it. A light switch is sequential: flip it once and it stays where you left it, remembering your last action. Feedback is what turns a doorbell into a light switch.',
        },
        {
          type: 'p',
          text: 'Two inverters in a loop can hold a bit but give you no way to **change** it. Replacing the inverters with gates that have a second input fixes that, and gives us the first real memory element.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The SR latch',
      blocks: [
        {
          type: 'p',
          text: 'Cross-couple two NOR gates, each feeding its output into one input of the other, and use the remaining inputs as controls. This is the **[[sr-latch|SR latch]]**: S (set) forces the output Q to 1, R (reset) forces it to 0, and when both are 0 the feedback loop **holds** whatever Q was.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 220" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M170,50.0 Q185.0,70 170,90.0 Q205.0,90.0 220.0,70 Q205.0,50.0 170,50.0 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M170,50.0 Q185.0,70 170,90.0 Q205.0,90.0 220.0,70 Q205.0,50.0 170,50.0 Z"/>
<circle cx="224.0" cy="70" r="4"/>
<path d="M170,150.0 Q185.0,170 170,190.0 Q205.0,190.0 220.0,170 Q205.0,150.0 170,150.0 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M170,150.0 Q185.0,170 170,190.0 Q205.0,190.0 220.0,170 Q205.0,150.0 170,150.0 Z"/>
<circle cx="224.0" cy="170" r="4"/>
<text x="40" y="65" font-size="15" text-anchor="end" stroke="none" font-weight="bold">R</text>
<line x1="46" y1="60" x2="173" y2="60"/>
<text x="40" y="185" font-size="15" text-anchor="end" stroke="none" font-weight="bold">S</text>
<line x1="46" y1="180" x2="173" y2="180"/>
<line x1="228.0" y1="70" x2="330" y2="70" class="s-blue"/>
<text x="338" y="75" font-size="15" text-anchor="start" stroke="none" class="t-blue" font-weight="bold">Q</text>
<line x1="228.0" y1="170" x2="330" y2="170" class="s-orange"/>
<text x="338" y="175" font-size="15" text-anchor="start" stroke="none" class="t-orange" font-weight="bold">Q̄</text>
<polyline points="270,70 270,112 140,128 140,160 173,160.0" class="s-blue"/>
<circle cx="270" cy="70" r="3.5" class="f-blue" stroke="none"/>
<polyline points="290,170 290,128 125,112 125,80 173,80.0" class="s-orange"/>
<circle cx="290" cy="170" r="3.5" class="f-orange" stroke="none"/>
<text x="395" y="40" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">S</text>
<text x="425" y="40" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">R</text>
<text x="477" y="40" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">Q next</text>
<text x="395" y="64" font-size="13" text-anchor="middle" stroke="none">0</text>
<text x="425" y="64" font-size="13" text-anchor="middle" stroke="none">0</text>
<text x="477" y="64" font-size="13" text-anchor="middle" stroke="none">Q (hold)</text>
<text x="395" y="88" font-size="13" text-anchor="middle" stroke="none">1</text>
<text x="425" y="88" font-size="13" text-anchor="middle" stroke="none">0</text>
<text x="477" y="88" font-size="13" text-anchor="middle" stroke="none" class="t-blue">1 (set)</text>
<text x="395" y="112" font-size="13" text-anchor="middle" stroke="none">0</text>
<text x="425" y="112" font-size="13" text-anchor="middle" stroke="none">1</text>
<text x="477" y="112" font-size="13" text-anchor="middle" stroke="none" class="t-orange">0 (reset)</text>
<text x="395" y="136" font-size="13" text-anchor="middle" stroke="none">1</text>
<text x="425" y="136" font-size="13" text-anchor="middle" stroke="none">1</text>
<text x="477" y="136" font-size="13" text-anchor="middle" stroke="none" class="t-red">forbidden</text>
<line x1="381" y1="48" x2="520" y2="48" class="s-gray" stroke-width="1"/>
</svg>`,
          alt: 'An SR latch: R feeds the top NOR gate whose output is Q; S feeds the bottom NOR gate whose output is Q-bar. Q is fed back into the bottom gate and Q-bar into the top gate. A table shows S=0 R=0 holds, S=1 R=0 sets Q to 1, S=0 R=1 resets Q to 0, and S=1 R=1 is forbidden.',
          caption: 'Cross-coupled NOR gates. A NOR outputs 1 only when both inputs are 0, so a 1 on S or R overrides the feedback; with both at 0 the feedback wins and the state is held.',
          maxWidth: 520,
        },
        {
          type: 'p',
          text: 'You can simulate it by letting each gate recompute from the other gate\'s **previous** output, one gate delay at a time, until nothing changes:',
        },
        {
          type: 'code',
          title: 'sr_latch.cpp',
          runnable: true,
          code: `#include <cstdio>

// Cross-coupled NOR gates. Each "tick" every gate recomputes
// from the other gate's previous output, like a real gate delay.
struct SRLatch {
    bool q = false, qBar = true;

    void apply(bool s, bool r) {
        for (int tick = 0; tick < 4; ++tick) {      // let it settle
            bool newQ    = !(r || qBar);
            bool newQBar = !(s || q);
            q = newQ;
            qBar = newQBar;
        }
    }
};

int main() {
    SRLatch latch;
    struct { bool s, r; const char* what; } inputs[] = {
        {1, 0, "set"},  {0, 0, "hold"}, {0, 0, "hold"},
        {0, 1, "reset"}, {0, 0, "hold"}, {1, 0, "set"},
    };
    for (auto& in : inputs) {
        latch.apply(in.s, in.r);
        std::printf("S=%d R=%d (%-5s) -> Q=%d  Qbar=%d\\n",
                    in.s, in.r, in.what, latch.q, latch.qBar);
    }
}`,
          output: `S=1 R=0 (set  ) -> Q=1  Qbar=0
S=0 R=0 (hold ) -> Q=1  Qbar=0
S=0 R=0 (hold ) -> Q=1  Qbar=0
S=0 R=1 (reset) -> Q=0  Qbar=1
S=0 R=0 (hold ) -> Q=0  Qbar=1
S=1 R=0 (set  ) -> Q=1  Qbar=0`,
          annotations: [
            { lines: '10-11', text: 'Both new values are computed from the **old** outputs before either is stored, because real gates switch at the same time. Updating `q` first and then using it would model a different circuit.' },
            { lines: 9, text: 'Four gate delays are plenty: after a couple of ticks the loop is stable and further ticks change nothing.' },
            { lines: '20-23', text: 'The inputs S = 0, R = 0 appear after a set and after a reset, and the output differs (Q = 1, then Q = 0): the latch remembers what happened before. That is the definition of sequential logic.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Why S = R = 1 is forbidden',
          text: 'With both inputs at 1, both NOR outputs are forced to 0, so Q and Q̄ are no longer complements. Worse, if S and R then drop to 0 at the same moment, both gates see 0, 0 and switch to 1 together, then both see a 1 and switch back to 0: the latch can oscillate, or settle randomly depending on which gate is a few picoseconds faster. Designs avoid the input combination entirely, which the next element does by construction.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'An SR latch was just reset (S = 0, R = 1, so Q = 0). Now R goes back to 0, so S = 0 and R = 0. What is Q?',
      options: [
        { text: '0, because with S = R = 0 the feedback loop holds the previous state', correct: true, why: 'The top NOR sees R = 0 and Q̄ = 1, so it keeps outputting 0; the bottom NOR sees S = 0 and Q = 0 and keeps outputting 1. The state is stable.' },
        { text: '1, because S = R = 0 always means "set"', why: 'Set requires S = 1. With both inputs at 0 the latch neither sets nor resets; it remembers.' },
        { text: 'Undefined: S = R = 0 is the forbidden input combination', why: 'The forbidden combination is S = R = 1, where both outputs are forced to 0. S = R = 0 is the normal "hold" state.' },
        { text: 'It oscillates between 0 and 1', why: 'Oscillation can happen when leaving S = R = 1 with both inputs changing together, not when releasing R alone after a reset.' },
      ],
      explanation:
        'The hold state is the whole point of a latch: once the inputs return to 0, the cross-coupled gates keep reinforcing each other\'s outputs, so the bit stays whatever S or R last made it. Memory in an SRAM cache cell works on the same principle: a pair of cross-coupled inverters, with two extra transistors for access.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'From latch to edge-triggered flip-flop',
      blocks: [
        {
          type: 'p',
          text: 'Two problems remain. The SR latch has a forbidden input, and it changes **whenever** its inputs change. In a CPU you want every storage element to update at the same, well-defined moment. Both are solved with a [[clock-signal|clock]]: a square wave that ticks billions of times per second and tells every storage element when to update.',
        },
        {
          type: 'list',
          items: [
            'A **D latch** has a single data input D and a clock (enable) input. While the clock is high it is *transparent*: Q follows D. While the clock is low it holds. Deriving S and R from D and its inverse makes the forbidden input impossible.',
            'A **[[d-flip-flop|D flip-flop]]** samples D only at the **rising edge** of the clock, the instant it goes from 0 to 1, and holds that value for the whole following cycle. It is usually built from two D latches in series that are transparent on opposite clock phases (*master–slave*), so there is never a moment when data can flow straight through both.',
          ],
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 212" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<rect x="30" y="70" width="56" height="70" rx="4" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="30" y="70" width="56" height="70" rx="4"/>
<text x="38" y="94" font-size="12" text-anchor="start" stroke="none" font-weight="bold">D</text>
<text x="78" y="94" font-size="12" text-anchor="end" stroke="none" font-weight="bold">Q</text>
<path d="M30,120 L40,126 L30,132" stroke-width="1.6"/>
<text x="58.0" y="62" font-size="12" text-anchor="middle" stroke="none" font-weight="bold">D flip-flop</text>
<line x1="10" y1="90" x2="30" y2="90"/>
<text x="8" y="94" font-size="12" text-anchor="end" stroke="none">D</text>
<line x1="10" y1="126" x2="30" y2="126"/>
<text x="8" y="130" font-size="11" text-anchor="end" stroke="none">clk</text>
<line x1="86" y1="90" x2="106" y2="90"/>
<text x="142" y="45" font-size="13" text-anchor="end" stroke="none" font-weight="bold">clk</text>
<text x="142" y="115" font-size="13" text-anchor="end" stroke="none" font-weight="bold">D</text>
<text x="142" y="185" font-size="13" text-anchor="end" stroke="none" font-weight="bold">Q</text>
<polyline points="150,52.0 190,52.0 190,28.0 230,28.0 230,52.0 270,52.0 270,28.0 310,28.0 310,52.0 350,52.0 350,28.0 390,28.0 390,52.0 430,52.0 430,28.0 470,28.0 470,52.0 510,52.0 510,28.0 512,28.0" class="s-gray" stroke-width="2"/>
<line x1="190" y1="20" x2="190" y2="205" class="s-gray" stroke-width="1" stroke-dasharray="3 4"/>
<path d="M190.0,27.0 L193.5,34.0 L186.5,34.0 Z" class="f-gray" stroke="none"/>
<line x1="270" y1="20" x2="270" y2="205" class="s-gray" stroke-width="1" stroke-dasharray="3 4"/>
<path d="M270.0,27.0 L273.5,34.0 L266.5,34.0 Z" class="f-gray" stroke="none"/>
<line x1="350" y1="20" x2="350" y2="205" class="s-gray" stroke-width="1" stroke-dasharray="3 4"/>
<path d="M350.0,27.0 L353.5,34.0 L346.5,34.0 Z" class="f-gray" stroke="none"/>
<line x1="430" y1="20" x2="430" y2="205" class="s-gray" stroke-width="1" stroke-dasharray="3 4"/>
<path d="M430.0,27.0 L433.5,34.0 L426.5,34.0 Z" class="f-gray" stroke="none"/>
<line x1="510" y1="20" x2="510" y2="205" class="s-gray" stroke-width="1" stroke-dasharray="3 4"/>
<path d="M510.0,27.0 L513.5,34.0 L506.5,34.0 Z" class="f-gray" stroke="none"/>
<polyline points="150,122.0 232,122.0 232,98.0 318,98.0 318,122.0 392,122.0 392,98.0 448,98.0 448,122.0 470,122.0 470,98.0 512,98.0" class="s-orange" stroke-width="2.2"/>
<rect x="418" y="92.0" width="20" height="36" rx="2" class="f-purple" fill-opacity="0.22" stroke="none"/>
<rect x="418" y="92.0" width="20" height="36" rx="2" class="s-purple" stroke-width="1"/>
<text x="428" y="144.0" font-size="10" text-anchor="middle" stroke="none" class="t-purple">setup | hold</text>
<polyline points="150,192.0 278,192.0 278,168.0 358,168.0 358,192.0 438,192.0 438,168.0 512,168.0" class="s-blue" stroke-width="2.2"/>
<text x="460" y="90" font-size="10" text-anchor="middle" stroke="none" class="t-gray">glitch</text>
</svg>`,
          alt: 'A D flip-flop symbol beside timing waveforms for clk, D and Q. Q changes only shortly after each rising clock edge, to the value D had at that edge. A purple window around one edge marks the setup and hold times, and a short glitch on D between edges never appears on Q.',
          caption: 'A D flip-flop. Q takes the value D had at each rising edge, a short clock-to-Q delay later. Changes of D between edges, including the glitch on the right, are ignored.',
          maxWidth: 520,
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why edges and not levels?',
          text: 'Picture a counter: a register feeds an adder that computes `count + 1`, and the result goes back into the same register. With a transparent latch, while the clock is high the new value would race around the loop again and again, adding 1 as many times as the adder\'s delay fits into the high phase. An edge-triggered flip-flop takes exactly one sample per cycle, so `count` increments exactly once. Edge triggering makes **feedback loops through logic safe**, and every CPU is full of them.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'truefalse',
      prompt: 'A D flip-flop\'s output follows its D input for as long as the clock is high.',
      answer: false,
      explanation:
        'That describes a **D latch**, which is transparent while its enable is high. A D flip-flop is **edge-triggered**: it captures D at the rising edge (after a short clock-to-Q delay) and then holds that value for the entire cycle, no matter how D changes. The difference is exactly what makes a loop like `count = count + 1` safe in hardware.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Registers and register files',
      blocks: [
        {
          type: 'p',
          text: 'A **register** is n D flip-flops sharing one clock, storing an n-bit value. To let the register keep its value on some cycles, add a 2-to-1 mux in front of each D input: when the *enable* (write) signal is 0, the mux feeds Q back into D so the same value is captured again; when it is 1, the mux feeds in new data.',
        },
        {
          type: 'p',
          text: 'A CPU\'s [[general-purpose-register|general-purpose registers]] live in a [[register-file]]: an array of registers with **read ports** and **write ports**, built from the combinational blocks of the previous lesson.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 268" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<rect x="200" y="62" width="110" height="30" rx="3" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="200" y="62" width="110" height="30" rx="3"/>
<text x="255.0" y="82" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">x0</text>
<rect x="200" y="107" width="110" height="30" rx="3" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="200" y="107" width="110" height="30" rx="3"/>
<text x="255.0" y="127" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">x1</text>
<rect x="200" y="152" width="110" height="30" rx="3" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="200" y="152" width="110" height="30" rx="3"/>
<text x="255.0" y="172" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">x2</text>
<rect x="200" y="197" width="110" height="30" rx="3" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="200" y="197" width="110" height="30" rx="3"/>
<text x="255.0" y="217" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">x3</text>
<text x="255.0" y="44" font-size="11" text-anchor="middle" stroke="none" class="t-gray">each register: 8 D flip-flops</text>
<rect x="60" y="70" width="60" height="150" rx="4" class="f-orange" fill-opacity="0.14" stroke="none"/>
<rect x="60" y="70" width="60" height="150" rx="4"/>
<text x="90" y="140" font-size="12" text-anchor="middle" stroke="none" font-weight="bold">2→4</text>
<text x="90" y="156" font-size="11" text-anchor="middle" stroke="none">decoder</text>
<line x1="90" y1="248" x2="90.0" y2="227.6" class="s-orange" stroke-width="1.6"/>
<path d="M90.0,222.0 L93.5,229.0 L86.5,229.0 Z" class="f-orange" stroke="none"/>
<text x="90" y="262" font-size="11" text-anchor="middle" stroke="none" class="t-orange">write address</text>
<line x1="120" y1="71" x2="195.2" y2="71.0" class="s-orange" stroke-width="1.4"/>
<path d="M200.0,71.0 L194.0,74.0 L194.0,68.0 Z" class="f-orange" stroke="none"/>
<line x1="120" y1="116" x2="195.2" y2="116.0" class="s-orange" stroke-width="1.4"/>
<path d="M200.0,116.0 L194.0,119.0 L194.0,113.0 Z" class="f-orange" stroke="none"/>
<line x1="120" y1="161" x2="195.2" y2="161.0" class="s-orange" stroke-width="1.4"/>
<path d="M200.0,161.0 L194.0,164.0 L194.0,158.0 Z" class="f-orange" stroke="none"/>
<line x1="120" y1="206" x2="195.2" y2="206.0" class="s-orange" stroke-width="1.4"/>
<path d="M200.0,206.0 L194.0,209.0 L194.0,203.0 Z" class="f-orange" stroke="none"/>
<text x="140" y="64" font-size="10" text-anchor="middle" stroke="none" class="t-orange">enables</text>
<text x="150" y="22" font-size="11" text-anchor="end" stroke="none" class="t-green">write data</text>
<polyline points="156,18 175,18 175,220" class="s-green"/>
<line x1="175" y1="85" x2="195.2" y2="85.0" class="s-green" stroke-width="1.4"/>
<path d="M200.0,85.0 L194.0,88.0 L194.0,82.0 Z" class="f-green" stroke="none"/>
<circle cx="175" cy="85" r="3.5" class="f-green" stroke="none"/>
<line x1="175" y1="130" x2="195.2" y2="130.0" class="s-green" stroke-width="1.4"/>
<path d="M200.0,130.0 L194.0,133.0 L194.0,127.0 Z" class="f-green" stroke="none"/>
<circle cx="175" cy="130" r="3.5" class="f-green" stroke="none"/>
<line x1="175" y1="175" x2="195.2" y2="175.0" class="s-green" stroke-width="1.4"/>
<path d="M200.0,175.0 L194.0,178.0 L194.0,172.0 Z" class="f-green" stroke="none"/>
<circle cx="175" cy="175" r="3.5" class="f-green" stroke="none"/>
<line x1="175" y1="220" x2="195.2" y2="220.0" class="s-green" stroke-width="1.4"/>
<path d="M200.0,220.0 L194.0,223.0 L194.0,217.0 Z" class="f-green" stroke="none"/>
<circle cx="175" cy="220" r="3.5" class="f-green" stroke="none"/>
<path d="M380,46 L410,62 L410,114 L380,130 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M380,46 L410,62 L410,114 L380,130 Z"/>
<line x1="410" y1="88.0" x2="440.4" y2="88.0" stroke-width="1.6"/>
<path d="M446.0,88.0 L439.0,91.5 L439.0,84.5 Z" fill="currentColor" stroke="none"/>
<text x="450" y="92.0" font-size="11" text-anchor="start" stroke="none" class="t-blue">read data 1</text>
<line x1="395" y1="54" x2="395" y2="22"/>
<text x="402" y="20" font-size="11" text-anchor="start" stroke="none" class="t-blue">read addr 1</text>
<path d="M380,142 L410,158 L410,216 L380,232 Z" class="f-blue" fill-opacity="0.13" stroke="none"/>
<path d="M380,142 L410,158 L410,216 L380,232 Z"/>
<line x1="410" y1="187.0" x2="440.4" y2="187.0" stroke-width="1.6"/>
<path d="M446.0,187.0 L439.0,190.5 L439.0,183.5 Z" fill="currentColor" stroke="none"/>
<text x="450" y="191.0" font-size="11" text-anchor="start" stroke="none" class="t-blue">read data 2</text>
<line x1="395" y1="224" x2="395" y2="254"/>
<text x="402" y="258" font-size="11" text-anchor="start" stroke="none" class="t-blue">read addr 2</text>
<line x1="310" y1="77" x2="335" y2="77" class="s-gray" stroke-width="1.4"/>
<polyline points="335,77 335,60 380,60" class="s-gray"/>
<polyline points="335,77 335,158 380,158" class="s-gray"/>
<circle cx="335" cy="77" r="3.5" class="f-gray" stroke="none"/>
<line x1="310" y1="122" x2="346" y2="122" class="s-gray" stroke-width="1.4"/>
<polyline points="346,122 346,78 380,78" class="s-gray"/>
<polyline points="346,122 346,178 380,178" class="s-gray"/>
<circle cx="346" cy="122" r="3.5" class="f-gray" stroke="none"/>
<line x1="310" y1="167" x2="357" y2="167" class="s-gray" stroke-width="1.4"/>
<polyline points="357,167 357,96 380,96" class="s-gray"/>
<polyline points="357,167 357,198 380,198" class="s-gray"/>
<circle cx="357" cy="167" r="3.5" class="f-gray" stroke="none"/>
<line x1="310" y1="212" x2="368" y2="212" class="s-gray" stroke-width="1.4"/>
<polyline points="368,212 368,114 380,114" class="s-gray"/>
<polyline points="368,212 368,218 380,218" class="s-gray"/>
<circle cx="368" cy="212" r="3.5" class="f-gray" stroke="none"/>
</svg>`,
          alt: 'A register file with four 8-bit registers x0 to x3. A 2-to-4 decoder driven by the write address produces one enable line per register, and a write-data bus feeds all registers. Each register output goes to two multiplexers; read address 1 and read address 2 select which register appears on read data 1 and read data 2.',
          caption: 'A register file with one write port and two read ports. The decoder enables exactly one register for writing; each read port is a multiplexer selecting one register.',
          maxWidth: 520,
        },
        {
          type: 'list',
          items: [
            '**Write port:** a decoder turns the destination register number into a one-hot enable, so only that register captures the write data at the clock edge.',
            '**Read ports:** each is a wide multiplexer selecting one register by number. An instruction such as `add rax, rbx` needs two operands in the same cycle, so register files have at least two read ports.',
            'Reads are combinational (they happen during the cycle); writes happen at the clock edge.',
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Bigger than the ISA says',
          text: 'x86-64 code can name 16 general-purpose registers, but a modern out-of-order core has a much larger **physical** register file, around 180 integer entries in AMD\'s Zen 2 (the PS5 and Xbox Series CPU), with many read and write ports so several instructions can run per cycle. Register renaming maps the 16 names onto them; the out-of-order lesson explains why. Every extra port adds wires to every register, which is why register files are among the most power-hungry structures on a core.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'numeric',
      prompt: 'A RISC-V core has 32 integer registers of 64 bits each. If every bit is one D flip-flop, how many flip-flops does the register file contain?',
      answer: 2048,
      unit: 'flip-flops',
      hint: 'One flip-flop per bit.',
      explanation:
        '32 registers × 64 bits = 2,048 flip-flops (256 bytes of storage). Its write-port decoder needs 5 address bits (2⁵ = 32 registers), and each read port is a 64-bit-wide 32-to-1 multiplexer. In practice RISC-V\'s register `x0` is hard-wired to zero, so real designs can omit its flip-flops, and large register files are often built from denser SRAM-like cells rather than standard flip-flops.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'The clock and the critical path',
      blocks: [
        {
          type: 'p',
          text: 'Almost all digital chips are **synchronous**: every flip-flop is driven by the same clock. In each cycle, flip-flops launch their values at the rising edge, the values flow through combinational logic, and the results must arrive at the next flip-flops **before the next edge**. Three delays matter:',
        },
        {
          type: 'list',
          items: [
            '**Clock-to-Q** (t_clk→Q): how long after the edge a flip-flop\'s new output appears.',
            '**Logic delay** (t_logic): the propagation delay through the combinational logic, which for the slowest path is the [[critical-path]].',
            '**Setup time** (t_setup): how long before the edge D must be stable for the flip-flop to capture it reliably.',
          ],
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 262" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<rect x="30" y="30" width="56" height="70" rx="4" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="30" y="30" width="56" height="70" rx="4"/>
<text x="38" y="54" font-size="12" text-anchor="start" stroke="none" font-weight="bold">D</text>
<text x="78" y="54" font-size="12" text-anchor="end" stroke="none" font-weight="bold">Q</text>
<path d="M30,80 L40,86 L30,92" stroke-width="1.6"/>
<text x="58.0" y="22" font-size="12" text-anchor="middle" stroke="none" font-weight="bold">register A</text>
<rect x="430" y="30" width="56" height="70" rx="4" class="f-blue" fill-opacity="0.12" stroke="none"/>
<rect x="430" y="30" width="56" height="70" rx="4"/>
<text x="438" y="54" font-size="12" text-anchor="start" stroke="none" font-weight="bold">D</text>
<text x="478" y="54" font-size="12" text-anchor="end" stroke="none" font-weight="bold">Q</text>
<path d="M430,80 L440,86 L430,92" stroke-width="1.6"/>
<text x="458.0" y="22" font-size="12" text-anchor="middle" stroke="none" font-weight="bold">register B</text>
<line x1="86" y1="50" x2="150" y2="50"/>
<path d="M150,30 C160,10 200,12 215,22 C235,4 290,8 300,24 C330,18 345,40 340,55 C352,72 330,92 305,86 C290,104 240,102 225,88 C200,100 160,96 160,80 C140,76 138,40 150,30 Z" class="s-blue" stroke-width="2"/>
<path d="M150,30 C160,10 200,12 215,22 C235,4 290,8 300,24 C330,18 345,40 340,55 C352,72 330,92 305,86 C290,104 240,102 225,88 C200,100 160,96 160,80 C140,76 138,40 150,30 Z" class="f-blue" fill-opacity="0.12" stroke="none"/>
<text x="245" y="52" font-size="12" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">combinational</text>
<text x="245" y="68" font-size="12" text-anchor="middle" stroke="none" class="t-blue" font-weight="bold">logic</text>
<line x1="342" y1="50" x2="423.6" y2="50.0" stroke-width="2"/>
<path d="M430.0,50.0 L422.0,54.0 L422.0,46.0 Z" fill="currentColor" stroke="none"/>
<polyline points="20,130 20,86 30,86" class="s-gray"/>
<polyline points="20,130 420,130 420,86 430,86" class="s-gray"/>
<text x="14" y="134" font-size="11" text-anchor="end" stroke="none" class="t-gray">clk</text>
<rect x="40" y="180" width="55" height="22" rx="2" class="f-purple" fill-opacity="0.2" stroke="none"/>
<rect x="40" y="180" width="55" height="22" rx="2" class="s-purple"/>
<text x="67.5" y="220" font-size="11" text-anchor="middle" stroke="none" class="t-purple">t_clk→Q</text>
<rect x="95" y="180" width="275" height="22" rx="2" class="f-blue" fill-opacity="0.2" stroke="none"/>
<rect x="95" y="180" width="275" height="22" rx="2" class="s-blue"/>
<text x="232.5" y="220" font-size="11" text-anchor="middle" stroke="none" class="t-blue">t_logic (longest path)</text>
<rect x="370" y="180" width="55" height="22" rx="2" class="f-orange" fill-opacity="0.2" stroke="none"/>
<rect x="370" y="180" width="55" height="22" rx="2" class="s-orange"/>
<text x="397.5" y="220" font-size="11" text-anchor="middle" stroke="none" class="t-orange">t_setup</text>
<rect x="425" y="180" width="65" height="22" rx="2" class="f-green" fill-opacity="0.2" stroke="none"/>
<rect x="425" y="180" width="65" height="22" rx="2" class="s-green"/>
<text x="457.5" y="220" font-size="11" text-anchor="middle" stroke="none" class="t-green">slack</text>
<line x1="40" y1="166" x2="40" y2="210" stroke-width="2"/>
<line x1="490" y1="166" x2="490" y2="210" stroke-width="2"/>
<text x="40" y="160" font-size="11" text-anchor="middle" stroke="none">clock edge</text>
<text x="490" y="160" font-size="11" text-anchor="middle" stroke="none">next edge</text>
<text x="265" y="250" font-size="13" text-anchor="middle" stroke="none" font-weight="bold">T_clk ≥ t_clk→Q + t_logic + t_setup</text>
</svg>`,
          alt: 'Register A feeds combinational logic which feeds register B; both share a clock. Below, a time bar from one clock edge to the next is divided into clock-to-Q, logic (longest path), setup time and remaining slack.',
          caption: 'One cycle of a register-to-register path. The clock period must cover clock-to-Q, the slowest logic path and the setup time. Anything left over is slack.',
          maxWidth: 520,
        },
        {
          type: 'p',
          text: 'So the clock period has a floor: **T_clk ≥ t_clk→Q + t_logic,max + t_setup**, and the maximum frequency is f_max = 1 / T_clk. With t_clk→Q = 30 ps, a critical path of 220 ps and a setup time of 20 ps, T_clk = 270 ps and f_max ≈ 3.7 GHz. A single slow path anywhere on the chip limits the entire chip, which is why designers obsess over the critical path, and why the fast adders of the previous lesson matter so much.',
        },
        {
          type: 'p',
          text: 'There is a second constraint. **Hold time** (t_hold) is how long *after* the edge D must stay stable. If a path is too *short*, the newly launched value can race through and corrupt the capture at the same edge. Designers fix hold violations by adding delay to short paths. And because the clock arrives at different flip-flops at slightly different times (**skew**), the clock network itself is carefully engineered; it can account for a large share of a chip\'s dynamic power, which is why idle units are **clock-gated**.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why synchronous design won',
          text: 'With a global clock, the messy continuous-time behaviour of gates (glitches, races, different path delays) only has to be correct **at the edges**. Between edges anything may happen; at the edge every signal has settled. That turns an analog problem into a discrete, step-by-step one that humans and tools can reason about. If you have written a game loop with a fixed timestep, you know the idea: compute the next state from the current one, then advance all of it at once on the tick.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'The road to pipelining',
          text: 'If the critical path limits the clock, cut it: put flip-flops in the middle of a long path, so each piece fits in a shorter cycle. The work now takes more cycles, but a new piece of work can start every (shorter) cycle. That is **pipelining**, the topic of the Processor Design unit, and it is how CPUs reach 4–5 GHz even though an instruction needs far more than 250 ps of logic.',
        },
        {
          type: 'deepdive',
          title: 'When flip-flops fail: metastability and radiation',
          blocks: [
            {
              type: 'p',
              text: '**Metastability.** If D changes inside the setup/hold window, the flip-flop may hang between 0 and 1 for an unpredictable time before falling one way. Signals arriving from another clock domain (a USB controller, a button, another core\'s clock) can do this at any time, so designs pass them through a **synchronizer**: two or more flip-flops in a row, which makes the chance of a metastable value escaping astronomically small.',
            },
            {
              type: 'p',
              text: '**Single-event upsets.** A cosmic-ray neutron or alpha particle striking a storage node can deposit enough charge to flip a stored bit. It happens at sea level (one reason servers use ECC memory) and far more often at altitude and in space. Radiation-hardened processors such as BAE Systems\' RAD750, which flies on the Curiosity and Perseverance Mars rovers and many satellites, use hardened cell designs, and many military and aerospace systems add **triple modular redundancy**: three copies of each flip-flop or module with a majority vote, the majority function you met in the previous two lessons. The cost is area, power and clock speed: the RAD750 runs at around 200 MHz.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'numeric',
      prompt: 'A register-to-register path has t_clk→Q = 40 ps, a critical-path logic delay of 310 ps and a setup time of 50 ps. What is the maximum clock frequency? (Give the answer in GHz, to two decimal places.)',
      answer: 2.5,
      tolerance: 0.01,
      unit: 'GHz',
      hint: 'Add the three delays to get the minimum period, then take 1 / period. 1 / (1 ps) = 1000 GHz.',
      explanation:
        'T_clk ≥ 40 + 310 + 50 = 400 ps, so f_max = 1 / 400 ps = 2.5 GHz. Notice that the flip-flop overheads (clock-to-Q plus setup, 90 ps here) are paid on **every** cycle no matter how short the logic is. That overhead is why splitting a design into ever more pipeline stages has diminishing returns: halve the logic to 155 ps per stage and the period only drops to 245 ps, not 200 ps.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Finite-state machines in hardware',
      blocks: [
        {
          type: 'p',
          text: 'Put a register and combinational logic together and you have the universal pattern of sequential hardware, the **[[state-machine|finite-state machine]]** (FSM). The register holds the current state. The **next-state logic** computes the next state from the current state and the inputs. **Output logic** computes the outputs. At each clock edge, the next state is loaded.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 530 186" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<text x="20" y="92" font-size="12" text-anchor="start" stroke="none">inputs</text>
<line x1="64" y1="88" x2="104.4" y2="88.0" stroke-width="1.8"/>
<path d="M110.0,88.0 L103.0,91.5 L103.0,84.5 Z" fill="currentColor" stroke="none"/>
<rect x="110" y="60" width="110" height="60" rx="4" class="f-blue" fill-opacity="0.13" stroke="none"/>
<rect x="110" y="60" width="110" height="60" rx="4"/>
<text x="165" y="86" font-size="12" text-anchor="middle" stroke="none" font-weight="bold">next-state</text>
<text x="165" y="102" font-size="12" text-anchor="middle" stroke="none" font-weight="bold">logic</text>
<line x1="220" y1="90" x2="264.4" y2="90.0" stroke-width="1.8"/>
<path d="M270.0,90.0 L263.0,93.5 L263.0,86.5 Z" fill="currentColor" stroke="none"/>
<text x="245" y="82" font-size="11" text-anchor="middle" stroke="none" class="t-gray">D</text>
<rect x="270" y="55" width="80" height="70" rx="4" class="f-purple" fill-opacity="0.15" stroke="none"/>
<rect x="270" y="55" width="80" height="70" rx="4" class="s-purple"/>
<text x="310" y="86" font-size="12" text-anchor="middle" stroke="none" class="t-purple" font-weight="bold">state</text>
<text x="310" y="102" font-size="12" text-anchor="middle" stroke="none" class="t-purple" font-weight="bold">register</text>
<path d="M270,105 L280,111 L270,117" stroke-width="1.6"/>
<polyline points="250,160 250,111 270,111" class="s-gray"/>
<text x="250" y="175" font-size="11" text-anchor="middle" stroke="none" class="t-gray">clk</text>
<line x1="350" y1="90" x2="384.4" y2="90.0" stroke-width="1.8"/>
<path d="M390.0,90.0 L383.0,93.5 L383.0,86.5 Z" fill="currentColor" stroke="none"/>
<text x="360" y="106" font-size="11" text-anchor="middle" stroke="none" class="t-gray">Q</text>
<rect x="390" y="60" width="80" height="60" rx="4" class="f-green" fill-opacity="0.13" stroke="none"/>
<rect x="390" y="60" width="80" height="60" rx="4"/>
<text x="430" y="86" font-size="12" text-anchor="middle" stroke="none" font-weight="bold">output</text>
<text x="430" y="102" font-size="12" text-anchor="middle" stroke="none" font-weight="bold">logic</text>
<line x1="470" y1="90" x2="504.4" y2="90.0" stroke-width="1.8"/>
<path d="M510.0,90.0 L503.0,93.5 L503.0,86.5 Z" fill="currentColor" stroke="none"/>
<text x="492" y="78" font-size="12" text-anchor="middle" stroke="none">outputs</text>
<polyline points="370,90 370,30 150,30" class="s-purple"/>
<circle cx="370" cy="90" r="3.5" class="f-purple" stroke="none"/>
<line x1="150" y1="30" x2="150.0" y2="54.4" class="s-purple" stroke-width="1.8"/>
<path d="M150.0,60.0 L146.5,53.0 L153.5,53.0 Z" class="f-purple" stroke="none"/>
<text x="260" y="24" font-size="11" text-anchor="middle" stroke="none" class="t-purple">current state</text>
<text x="165" y="145" font-size="11" text-anchor="middle" stroke="none" class="t-gray">combinational</text>
<text x="430" y="145" font-size="11" text-anchor="middle" stroke="none" class="t-gray">combinational</text>
</svg>`,
          alt: 'Block diagram of a finite-state machine: inputs feed next-state logic, whose output D goes into a state register clocked by clk. The register output Q (the current state) feeds both the output logic, which produces the outputs, and back into the next-state logic.',
          caption: 'Every synchronous FSM has this shape: two blocks of combinational logic around a state register. A whole CPU is a (very large) FSM of this kind.',
          maxWidth: 520,
        },
        {
          type: 'list',
          items: [
            'In a **Moore** machine the outputs depend only on the state (a traffic light\'s colour depends only on which state it is in).',
            'In a **Mealy** machine the outputs may also depend on the current inputs, which can save states but lets an input glitch reach the output within the same cycle.',
            'With k state bits you can encode up to 2ᵏ states (*binary encoding*). FPGA designs often use **one-hot** encoding instead, one flip-flop per state, because the next-state logic becomes simpler and faster.',
          ],
        },
        {
          type: 'p',
          text: 'You have almost certainly written FSMs in software: game states such as menu, playing and paused, or enemy AI that patrols, chases and attacks. Hardware FSMs are the same idea with one extra rule: **all state updates happen at once, at the clock edge**. Let us build a traffic light controller with a minimum green time and a car sensor, then simulate it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Simulating hardware cycle by cycle in C++',
      blocks: [
        {
          type: 'p',
          text: 'The state register becomes a `struct`, the next-state logic becomes a **pure function** of the current state and inputs, and the clock edge becomes one assignment that replaces the whole state at once:',
        },
        {
          type: 'code',
          title: 'traffic_fsm.cpp',
          runnable: true,
          code: `#include <cstdio>

enum class Light { Green, Yellow, Red };

struct State {           // everything held in flip-flops
    Light light = Light::Red;
    int timer = 0;       // a small counter register
};

// Combinational next-state logic: reads only the current state
// and the inputs, never the state being built.
State next(const State& s, bool carWaiting) {
    State n = s;
    n.timer = s.timer + 1;
    switch (s.light) {
    case Light::Green:
        if (s.timer >= 3 && carWaiting) n = {Light::Yellow, 0};
        break;
    case Light::Yellow:
        if (s.timer >= 1) n = {Light::Red, 0};
        break;
    case Light::Red:
        if (s.timer >= 2) n = {Light::Green, 0};
        break;
    }
    return n;
}

int main() {
    const char* names[] = {"GREEN", "YELLOW", "RED"};
    const bool car[] = {0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0};
    State s;                                   // reset state
    for (int cycle = 0; cycle < 12; ++cycle) {
        std::printf("cycle %2d: %-6s timer=%d car=%d\\n", cycle,
                    names[static_cast<int>(s.light)], s.timer,
                    car[cycle]);
        s = next(s, car[cycle]);               // the clock edge
    }
}`,
          output: `cycle  0: RED    timer=0 car=0
cycle  1: RED    timer=1 car=0
cycle  2: RED    timer=2 car=0
cycle  3: GREEN  timer=0 car=0
cycle  4: GREEN  timer=1 car=0
cycle  5: GREEN  timer=2 car=1
cycle  6: GREEN  timer=3 car=1
cycle  7: YELLOW timer=0 car=0
cycle  8: YELLOW timer=1 car=0
cycle  9: RED    timer=0 car=0
cycle 10: RED    timer=1 car=0
cycle 11: RED    timer=2 car=0`,
          annotations: [
            { lines: '5-8', text: 'The state register: a 2-bit light state plus a counter. In hardware these are flip-flops; here they are a struct.' },
            { lines: 12, text: '`const State&`: the next-state logic can only **read** the current state. That mirrors hardware, where combinational logic sees the flip-flop outputs, never the values being loaded.' },
            { lines: 17, text: 'Green holds for at least 3 cycles, then changes only if a car is waiting. In cycle 5 a car arrives, but the timer is still 2, so the light stays green one more cycle.' },
            { lines: 37, text: 'The clock edge: the entire state is replaced in one assignment. Every "flip-flop" updates simultaneously.' },
          ],
        },
        {
          type: 'algo',
          view: 'graph',
          width: 420,
          height: 260,
          nodes: [
            { id: 'G', x: 80, y: 190, label: 'G' },
            { id: 'Y', x: 360, y: 190, label: 'Y' },
            { id: 'R', x: 220, y: 50, label: 'R' },
          ],
          edges: [
            { from: 'G', to: 'Y', label: 't≥3 & car', directed: true },
            { from: 'Y', to: 'R', label: 't≥1', directed: true },
            { from: 'R', to: 'G', label: 't≥2', directed: true },
          ],
          caption: 'The traffic-light FSM from the program above, one frame per clock cycle; t is the timer. Orange arrow: the transition that the next clock edge will take.',
          interval: 1100,
          frames: [
            {
              note: 'Cycle 0: reset puts the state register in RED with timer = 0. Each frame is one clock cycle.',
              nodeColors: [{ id: 'R', color: 'red' }],
              nodeNotes: [{ id: 'R', text: 't=0' }],
              edgeColors: [],
              vars: [['cycle', '0'], ['state', 'RED'], ['timer', '0'], ['car', '0']],
            },
            {
              note: 'Cycle 1: RED, timer = 1. The condition is not met yet, so the state holds and the timer counts up.',
              nodeColors: [{ id: 'R', color: 'red' }],
              nodeNotes: [{ id: 'R', text: 't=1' }],
              edgeColors: [],
              vars: [['cycle', '1'], ['state', 'RED'], ['timer', '1'], ['car', '0']],
            },
            {
              note: 'Cycle 2: in RED with timer = 2. The next-state logic outputs **GREEN**; it is loaded at the next clock edge.',
              nodeColors: [{ id: 'R', color: 'red' }],
              nodeNotes: [{ id: 'R', text: 't=2' }],
              edgeColors: [{ from: 'R', to: 'G', color: 'orange' }],
              vars: [['cycle', '2'], ['state', 'RED'], ['timer', '2'], ['car', '0']],
            },
            {
              note: 'Cycle 3: GREEN, timer = 0. The minimum green time has not passed, so stay.',
              nodeColors: [{ id: 'G', color: 'green' }],
              nodeNotes: [{ id: 'G', text: 't=0' }],
              edgeColors: [],
              vars: [['cycle', '3'], ['state', 'GREEN'], ['timer', '0'], ['car', '0']],
            },
            {
              note: 'Cycle 4: GREEN, timer = 1. The minimum green time has not passed, so stay.',
              nodeColors: [{ id: 'G', color: 'green' }],
              nodeNotes: [{ id: 'G', text: 't=1' }],
              edgeColors: [],
              vars: [['cycle', '4'], ['state', 'GREEN'], ['timer', '1'], ['car', '0']],
            },
            {
              note: 'Cycle 5: a car is waiting, but timer = 2 < 3, so the light stays GREEN this cycle.',
              nodeColors: [{ id: 'G', color: 'green' }],
              nodeNotes: [{ id: 'G', text: 't=2' }],
              edgeColors: [],
              vars: [['cycle', '5'], ['state', 'GREEN'], ['timer', '2'], ['car', '1']],
            },
            {
              note: 'Cycle 6: in GREEN with timer = 3 and a car waiting. The next-state logic outputs **YELLOW**; it is loaded at the next clock edge.',
              nodeColors: [{ id: 'G', color: 'green' }],
              nodeNotes: [{ id: 'G', text: 't=3' }],
              edgeColors: [{ from: 'G', to: 'Y', color: 'orange' }],
              vars: [['cycle', '6'], ['state', 'GREEN'], ['timer', '3'], ['car', '1']],
            },
            {
              note: 'Cycle 7: YELLOW, timer = 0. The condition is not met yet, so the state holds and the timer counts up.',
              nodeColors: [{ id: 'Y', color: 'orange' }],
              nodeNotes: [{ id: 'Y', text: 't=0' }],
              edgeColors: [],
              vars: [['cycle', '7'], ['state', 'YELLOW'], ['timer', '0'], ['car', '0']],
            },
            {
              note: 'Cycle 8: in YELLOW with timer = 1. The next-state logic outputs **RED**; it is loaded at the next clock edge.',
              nodeColors: [{ id: 'Y', color: 'orange' }],
              nodeNotes: [{ id: 'Y', text: 't=1' }],
              edgeColors: [{ from: 'Y', to: 'R', color: 'orange' }],
              vars: [['cycle', '8'], ['state', 'YELLOW'], ['timer', '1'], ['car', '0']],
            },
            {
              note: 'Cycle 9: RED, timer = 0. The condition is not met yet, so the state holds and the timer counts up.',
              nodeColors: [{ id: 'R', color: 'red' }],
              nodeNotes: [{ id: 'R', text: 't=0' }],
              edgeColors: [],
              vars: [['cycle', '9'], ['state', 'RED'], ['timer', '0'], ['car', '0']],
            },
            {
              note: 'Cycle 10: RED, timer = 1. The condition is not met yet, so the state holds and the timer counts up.',
              nodeColors: [{ id: 'R', color: 'red' }],
              nodeNotes: [{ id: 'R', text: 't=1' }],
              edgeColors: [],
              vars: [['cycle', '10'], ['state', 'RED'], ['timer', '1'], ['car', '0']],
            },
            {
              note: 'Cycle 11: RED, timer = 2. The condition is not met yet, so the state holds and the timer counts up.',
              nodeColors: [{ id: 'R', color: 'red' }],
              nodeNotes: [{ id: 'R', text: 't=2' }],
              edgeColors: [],
              vars: [['cycle', '11'], ['state', 'RED'], ['timer', '2'], ['car', '0']],
            },
          ],
        },
        {
          type: 'p',
          text: 'The `const State&` parameter is doing important work. Hardware updates all flip-flops **simultaneously**, but C++ statements run one after another. If you update state variables in place, later statements see values that, in hardware, would not exist until the next cycle. A shift register shows the difference:',
        },
        {
          type: 'code',
          title: 'shift_register.cpp',
          runnable: true,
          code: `#include <array>
#include <cstdio>

using Regs = std::array<int, 4>;

void print(const char* label, const Regs& r) {
    std::printf("%s %d %d %d %d\\n", label, r[0], r[1], r[2], r[3]);
}

int main() {
    Regs wrong = {7, 0, 0, 0};
    Regs right = {7, 0, 0, 0};

    // One clock edge of a 4-stage shift register.
    for (int i = 1; i < 4; ++i) wrong[i] = wrong[i - 1];  // in place

    Regs next = right;                       // compute from old...
    for (int i = 1; i < 4; ++i) next[i] = right[i - 1];
    right = next;                            // ...commit together

    print("in-place:", wrong);
    print("two-phase:", right);
}`,
          output: `in-place: 7 7 7 7
two-phase: 7 7 0 0`,
          annotations: [
            { lines: 15, text: 'Each assignment sees the value just written by the previous iteration, so the 7 races through all four stages in one "cycle": the transparent-latch problem again, in software.' },
            { lines: '17-19', text: 'Compute every next value from the old state, then commit them all at once. One clock edge moves the 7 exactly one stage.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Same rule in game code and in Verilog',
          text: 'Hardware description languages build this rule into the syntax: in Verilog, nonblocking assignments (`q <= d;`) inside a clocked block all take effect together at the edge. Tools such as Verilator compile Verilog into C++ that does exactly the two-phase update above. In games the same pattern appears as double-buffered state: cellular automata, physics integrators and AI that read last frame\'s world and write this frame\'s, so update order between entities cannot change the result.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'bug',
      prompt: 'This function simulates one clock edge of two registers that swap values every cycle, as a hardware circuit with crossed wires would. After one call, `a` and `b` are equal. Tap the line that breaks the simulation.',
      code: `struct Regs {
    int a;
    int b;
};

void clockEdge(Regs& r) {
    r.a = r.b;
    r.b = r.a;
}`,
      bugLines: [7, 8],
      hint: 'In hardware, both registers load at the same instant from the values they had before the edge.',
      explanation:
        'Line 7 overwrites `a` before line 8 reads it, so `b` receives the new value of `a` (its own old value) and both end up equal. In hardware both flip-flops capture their D inputs simultaneously from the **old** outputs, so a crossed pair swaps cleanly every cycle. Simulate it in two phases: `Regs old = r; r.a = old.b; r.b = old.a;` (or `std::swap`). Either line can be blamed: the bug is the order-dependent pair of in-place updates.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'order',
      prompt: 'Put the events of one clock cycle in a synchronous circuit in order, starting at a rising edge.',
      linesAreCode: false,
      lines: [
        'The rising clock edge arrives and every flip-flop samples its D input',
        'After the clock-to-Q delay, the new values appear on the flip-flop outputs',
        'The combinational logic computes the next-state values; outputs may glitch until they settle',
        'The next-state values are stable at the D inputs at least a setup time before the next edge',
      ],
      distractors: [
        'The flip-flops copy D to Q continuously while the clock is high',
      ],
      explanation:
        'Each cycle is launch, propagate, settle, capture. The flip-flops launch new values just after the edge, the logic needs t_logic to produce stable results, and those results must arrive t_setup before the next edge, which then starts the cycle again. Copying D to Q while the clock is high describes a transparent latch, the behaviour edge-triggered flip-flops exist to avoid.',
    },
  ],
  takeaways: [
    'Feedback creates memory: cross-coupled gates have two stable states, and an SR latch sets, resets or holds one bit.',
    'A D latch is transparent while its clock is high; a D flip-flop samples D only at the clock edge, which makes feedback loops through logic (counters, CPUs) safe.',
    'Registers are banks of flip-flops with an enable mux; a register file adds a decoder for writes and multiplexers for each read port.',
    'The clock period must cover clock-to-Q, the critical path and setup time: f_max = 1 / (t_clk→Q + t_logic,max + t_setup); hold time constrains paths that are too short.',
    'Every synchronous design is a finite-state machine: next-state logic, a state register and output logic.',
    'Simulate hardware with a two-phase update (compute the whole next state from the old one, then commit), the same discipline as double-buffered game state.',
  ],
  reading: [
    { title: 'Flip-flop (electronics)', url: 'https://en.wikipedia.org/wiki/Flip-flop_(electronics)', source: 'article', note: 'Latches and flip-flops of every kind, with timing parameters, metastability and master-slave construction.' },
    { title: 'Nand2Tetris', url: 'https://www.nand2tetris.org/', source: 'other', note: 'Project 3 builds bits, registers, RAM and a program counter from a D flip-flop.' },
    { title: 'Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', source: 'article', note: 'How tools find the critical path and check setup and hold constraints across a whole chip.' },
    { title: 'Computer Systems: A Programmer\'s Perspective', url: 'https://csapp.cs.cmu.edu/', source: 'book', note: 'Chapter 4.2 covers logic design, memory elements and clocking on the way to a pipelined processor.' },
  ],
};
