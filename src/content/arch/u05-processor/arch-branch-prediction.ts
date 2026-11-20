import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-branch-prediction',
  title: 'Branch Prediction and Branchless Code',
  summary: 'How deep pipelines guess branches with saturating counters and history, why sorted data runs faster, and how to write branchless C++ with conditional moves, masks, `[[likely]]` and PGO.',
  minutes: 20,
  objectives: [
    'Explain why deep pipelines must predict branches, and estimate the CPI cost of mispredictions',
    'Simulate 1-bit and 2-bit saturating-counter predictors by hand on a branch sequence',
    'Describe at a high level how history-based predictors (gshare, TAGE, perceptron) learn patterns, and what a BTB does',
    'Explain the sorted-versus-unsorted array effect and check whether your compiler already removed the branch',
    'Write branchless C++ with conditional moves, masks and arithmetic, and know when not to; use `[[likely]]`, `[[unlikely]]` and profile-guided optimization',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Why modern CPUs must guess',
      blocks: [
        {
          type: 'p',
          text: 'In the five-stage pipeline a taken branch cost 2 cycles. A modern high-performance core is a very different machine: it fetches **4 to 8 instructions per cycle**, and a branch is resolved only some 15 to 20 stages after it was fetched. By the time the core knows which way a branch went, it has already fetched on the order of a hundred instructions after it. And in typical integer code roughly **one instruction in five to seven is a branch**.',
        },
        {
          type: 'p',
          text: 'Waiting is out of the question; the core would spend most of its time idle. So it uses [[branch-prediction]]: at fetch time, before the instruction is even decoded, it guesses whether the branch is taken and where it goes, and keeps fetching down the predicted path. If the guess was right, the branch cost nothing. If it was wrong, everything fetched after the branch is thrown away and fetch restarts at the right address: a [[branch-misprediction]], typically costing **15 to 20 cycles** on current desktop and console cores (the exact figure varies by microarchitecture).',
        },
        {
          type: 'code',
          title: 'The cost of mispredictions',
          lang: 'text',
          code: `extra CPI = branch fraction × misprediction rate × penalty

          = 0.20 × 0.05 × 17   ≈ 0.17   (a good predictor)
          = 0.20 × 0.50 × 17   ≈ 1.7    (random data: coin flips)`,
          annotations: [
            {
              lines: 1,
              text: 'Same formula as the last lesson\'s control hazards, with a much larger penalty.',
            },
            {
              lines: 3,
              text: 'A 95%-accurate predictor adds 0.17 cycles per instruction. On a core that would otherwise finish 2 to 4 instructions per cycle (CPI 0.25 to 0.5), that is already a large slowdown.',
            },
            {
              lines: 4,
              text: 'A branch that goes either way at random mispredicts half the time and can make a loop several times slower.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why prediction became essential',
          text: 'Every stage added to the pipeline to raise the clock speed adds to the misprediction penalty, and every extra instruction fetched per cycle multiplies the work thrown away. Deep, wide cores are only viable because predictors are right the overwhelming majority of the time. That is why branch predictors are among the most carefully engineered (and most secret) parts of a modern CPU.',
        },
      ],
    },
    {
      kind: 'numeric',
      prompt: 'A program has a base CPI of 1.0. 20% of its instructions are branches, the predictor mispredicts 5% of them, and each misprediction costs 17 cycles. What is the effective CPI? Give 2 decimal places.',
      answer: 1.17,
      tolerance: 0.005,
      label: 'CPI =',
      explanation: 'CPI = 1 + 0.20 × 0.05 × 17 = 1 + 0.17 = 1.17. One misprediction per hundred instructions costs 17% performance. Halving the misprediction rate (or the penalty) would win back half of that, which is why predictor accuracy improvements of a fraction of a percent are worth a lot of silicon.',
    },
    {
      kind: 'concept',
      title: 'Static prediction and the 1-bit predictor',
      blocks: [
        {
          type: 'p',
          text: 'The simplest predictors use fixed rules. **Predict not taken** is what the five-stage pipeline did. **Backward taken, forward not taken** (BTFN) is smarter: a branch that jumps backwards is almost always the bottom of a loop, which is taken every iteration but the last. Compilers cooperate by laying out code so that the common path falls through and rare paths (error handling, cold code) are jumped to.',
        },
        {
          type: 'p',
          text: '**Dynamic** predictors learn from each branch\'s own behaviour. The simplest keeps a table of single bits indexed by the low bits of the branch address: the bit records the branch\'s last outcome, and the prediction is "same as last time".',
        },
        {
          type: 'code',
          title: 'A loop branch',
          code: `for (int frame = 0; frame < 3; ++frame)      // outer loop
    for (int i = 0; i < 4; ++i)              // inner loop branch:
        updateEnemy(i);                      //   T T T N, T T T N, ...`,
          annotations: [
            {
              lines: 2,
              text: 'The inner loop\'s branch is taken 3 times and falls through once, each time the outer loop runs it.',
            },
          ],
        },
        {
          type: 'p',
          text: 'A 1-bit predictor mispredicts this loop branch **twice** per run of the inner loop: once at the exit (it predicts taken, the loop ends) and again at the first iteration of the next run (the bit now says "not taken", but the loop continues). One unusual outcome causes two misses. The fix is to require two surprises in a row before changing the prediction.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Aliasing',
          text: 'The table is indexed by only some address bits, so two unrelated branches can share an entry and disturb each other. This **aliasing** is unavoidable in finite tables; real predictors reduce it with large tables, hashing and tags.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'The 2-bit saturating counter',
      blocks: [
        {
          type: 'p',
          text: 'Replace each bit with a [[saturating-counter|2-bit saturating counter]]: a value from 0 to 3 that counts up on a taken branch and down on a not-taken one, but stops at the ends instead of wrapping. States 2 and 3 predict taken; 0 and 1 predict not taken.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 560 210">
<circle cx="70" cy="105" r="36" class="f-red" fill-opacity="0.12" stroke="none"/>
<circle cx="70" cy="105" r="36" fill="none" class="s-red" stroke-width="1.8"/>
<text x="70" y="99" font-size="15" text-anchor="middle" font-weight="800">SN</text>
<text x="70" y="114" font-size="9" text-anchor="middle">strongly</text>
<text x="70" y="125" font-size="9" text-anchor="middle">not taken</text>
<circle cx="210" cy="105" r="36" class="f-red" fill-opacity="0.12" stroke="none"/>
<circle cx="210" cy="105" r="36" fill="none" class="s-red" stroke-width="1.8"/>
<text x="210" y="99" font-size="15" text-anchor="middle" font-weight="800">WN</text>
<text x="210" y="114" font-size="9" text-anchor="middle">weakly</text>
<text x="210" y="125" font-size="9" text-anchor="middle">not taken</text>
<circle cx="350" cy="105" r="36" class="f-green" fill-opacity="0.12" stroke="none"/>
<circle cx="350" cy="105" r="36" fill="none" class="s-green" stroke-width="1.8"/>
<text x="350" y="99" font-size="15" text-anchor="middle" font-weight="800">WT</text>
<text x="350" y="114" font-size="9" text-anchor="middle">weakly</text>
<text x="350" y="125" font-size="9" text-anchor="middle">taken</text>
<circle cx="490" cy="105" r="36" class="f-green" fill-opacity="0.12" stroke="none"/>
<circle cx="490" cy="105" r="36" fill="none" class="s-green" stroke-width="1.8"/>
<text x="490" y="99" font-size="15" text-anchor="middle" font-weight="800">ST</text>
<text x="490" y="114" font-size="9" text-anchor="middle">strongly</text>
<text x="490" y="125" font-size="9" text-anchor="middle">taken</text>
<text x="70" y="157" font-size="11" text-anchor="middle" font-weight="600">00</text>
<text x="210" y="157" font-size="11" text-anchor="middle" font-weight="600">01</text>
<text x="350" y="157" font-size="11" text-anchor="middle" font-weight="600">10</text>
<text x="490" y="157" font-size="11" text-anchor="middle" font-weight="600">11</text>
<path d="M90,75 Q140.0,43 186,73" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M186,73 L177,67 L180,76 Z" fill="currentColor"/>
<text x="140" y="53" font-size="12" text-anchor="middle" class="t-green" font-weight="700">T</text>
<path d="M190,135 Q140.0,167 94,137" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M94,137 L103,143 L100,134 Z" fill="currentColor"/>
<text x="140" y="165" font-size="12" text-anchor="middle" class="t-red" font-weight="700">N</text>
<path d="M230,75 Q280.0,43 326,73" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M326,73 L317,67 L320,76 Z" fill="currentColor"/>
<text x="280" y="53" font-size="12" text-anchor="middle" class="t-green" font-weight="700">T</text>
<path d="M330,135 Q280.0,167 234,137" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M234,137 L243,143 L240,134 Z" fill="currentColor"/>
<text x="280" y="165" font-size="12" text-anchor="middle" class="t-red" font-weight="700">N</text>
<path d="M370,75 Q420.0,43 466,73" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M466,73 L457,67 L460,76 Z" fill="currentColor"/>
<text x="420" y="53" font-size="12" text-anchor="middle" class="t-green" font-weight="700">T</text>
<path d="M470,135 Q420.0,167 374,137" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M374,137 L383,143 L380,134 Z" fill="currentColor"/>
<text x="420" y="165" font-size="12" text-anchor="middle" class="t-red" font-weight="700">N</text>
<path d="M48,76 C20,25 80,23 66,68" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M66,69 L69,59 L61,61 Z" fill="currentColor"/>
<text x="52" y="35" font-size="12" text-anchor="middle" class="t-red" font-weight="700">N</text>
<path d="M512,76 C540,25 480,23 494,68" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M494,69 L491,59 L499,61 Z" fill="currentColor"/>
<text x="508" y="35" font-size="12" text-anchor="middle" class="t-green" font-weight="700">T</text>
<text x="140" y="202" font-size="11" text-anchor="middle" class="t-red" font-weight="700">predict NOT TAKEN</text>
<text x="420" y="202" font-size="11" text-anchor="middle" class="t-green" font-weight="700">predict TAKEN</text>
<line x1="280" y1="176" x2="280" y2="208" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
</svg>`,
          alt: 'State machine of a 2-bit saturating counter with states SN (00), WN (01), WT (10), ST (11). Taken outcomes move right, not-taken outcomes move left; SN loops on N and ST loops on T. SN and WN predict not taken; WT and ST predict taken.',
          caption: 'Two wrong guesses in a row are needed to flip the prediction. One surprise only moves the counter from "strongly" to "weakly".',
        },
        {
          type: 'p',
          text: 'Run the loop branch from the previous card through it, three runs of `T T T N`, and keep score against a 1-bit predictor:',
        },
        {
          type: 'algo',
          view: 'graph',
          width: 430,
          height: 200,
          nodes: [
            { id: 'SN', x: 50, y: 110 },
            { id: 'WN', x: 160, y: 110 },
            { id: 'WT', x: 270, y: 110 },
            { id: 'ST', x: 380, y: 110 },
          ],
          edges: [
            { from: 'SN', to: 'WN', label: 'T', directed: true },
            { from: 'WN', to: 'WT', label: 'T', directed: true },
            { from: 'WT', to: 'ST', label: 'T', directed: true },
            { from: 'ST', to: 'WT', label: 'N', directed: true },
            { from: 'WT', to: 'WN', label: 'N', directed: true },
            { from: 'WN', to: 'SN', label: 'N', directed: true },
          ],
          interval: 1200,
          frames: [
            {
              note: 'A loop branch that is taken 3 times, then falls through (`T T T N`), run three times. The counter starts at **weakly not taken**.',
              nodeColors: [
                { id: 'WN', color: 'orange' },
              ],
              vars: [
                ['outcomes', '–'],
                ['2-bit misses', '0'],
                ['1-bit misses', '0'],
              ],
            },
            {
              note: 'Branch #1 is **taken**. Predicted not taken: **miss**. Counter moves WN → WT.',
              nodeColors: [
                { id: 'WT', color: 'red' },
              ],
              vars: [
                ['outcomes', 'T'],
                ['2-bit misses', '1'],
                ['1-bit misses', '1'],
              ],
              edgeColors: [
                { from: 'WN', to: 'WT', color: 'red' },
              ],
            },
            {
              note: 'Branch #2 is **taken**. Predicted taken: correct. Counter moves WT → ST.',
              nodeColors: [
                { id: 'ST', color: 'orange' },
              ],
              vars: [
                ['outcomes', 'T T'],
                ['2-bit misses', '1'],
                ['1-bit misses', '1'],
              ],
              edgeColors: [
                { from: 'WT', to: 'ST', color: 'green' },
              ],
            },
            {
              note: 'Branch #3 is **taken**. Predicted taken: correct. Counter is saturated at ST.',
              nodeColors: [
                { id: 'ST', color: 'orange' },
              ],
              vars: [
                ['outcomes', 'T T T'],
                ['2-bit misses', '1'],
                ['1-bit misses', '1'],
              ],
            },
            {
              note: 'Branch #4 is **not taken**. Predicted taken: **miss**. Counter moves ST → WT. One surprise only weakens it: it still predicts taken next time.',
              nodeColors: [
                { id: 'WT', color: 'red' },
              ],
              vars: [
                ['outcomes', 'T T T N'],
                ['2-bit misses', '2'],
                ['1-bit misses', '2'],
              ],
              edgeColors: [
                { from: 'ST', to: 'WT', color: 'red' },
              ],
            },
            {
              note: 'Branch #5 is **taken**. Predicted taken: correct. Counter moves WT → ST.',
              nodeColors: [
                { id: 'ST', color: 'orange' },
              ],
              vars: [
                ['outcomes', 'T T T N T'],
                ['2-bit misses', '2'],
                ['1-bit misses', '3'],
              ],
              edgeColors: [
                { from: 'WT', to: 'ST', color: 'green' },
              ],
            },
            {
              note: 'Branch #6 is **taken**. Predicted taken: correct. Counter is saturated at ST.',
              nodeColors: [
                { id: 'ST', color: 'orange' },
              ],
              vars: [
                ['outcomes', 'T T T N T T'],
                ['2-bit misses', '2'],
                ['1-bit misses', '3'],
              ],
            },
            {
              note: 'Branch #7 is **taken**. Predicted taken: correct. Counter is saturated at ST.',
              nodeColors: [
                { id: 'ST', color: 'orange' },
              ],
              vars: [
                ['outcomes', 'T T T N T T T'],
                ['2-bit misses', '2'],
                ['1-bit misses', '3'],
              ],
            },
            {
              note: 'Branch #8 is **not taken**. Predicted taken: **miss**. Counter moves ST → WT.',
              nodeColors: [
                { id: 'WT', color: 'red' },
              ],
              vars: [
                ['outcomes', 'T T T N T T T N'],
                ['2-bit misses', '3'],
                ['1-bit misses', '4'],
              ],
              edgeColors: [
                { from: 'ST', to: 'WT', color: 'red' },
              ],
            },
            {
              note: 'Branch #9 is **taken**. Predicted taken: correct. Counter moves WT → ST.',
              nodeColors: [
                { id: 'ST', color: 'orange' },
              ],
              vars: [
                ['outcomes', 'T T N T T T N T'],
                ['2-bit misses', '3'],
                ['1-bit misses', '5'],
              ],
              edgeColors: [
                { from: 'WT', to: 'ST', color: 'green' },
              ],
            },
            {
              note: 'Branch #10 is **taken**. Predicted taken: correct. Counter is saturated at ST.',
              nodeColors: [
                { id: 'ST', color: 'orange' },
              ],
              vars: [
                ['outcomes', 'T N T T T N T T'],
                ['2-bit misses', '3'],
                ['1-bit misses', '5'],
              ],
            },
            {
              note: 'Branch #11 is **taken**. Predicted taken: correct. Counter is saturated at ST.',
              nodeColors: [
                { id: 'ST', color: 'orange' },
              ],
              vars: [
                ['outcomes', 'N T T T N T T T'],
                ['2-bit misses', '3'],
                ['1-bit misses', '5'],
              ],
            },
            {
              note: 'Done: the 2-bit counter missed **4 of 12** (only the loop exits after warm-up); a 1-bit predictor misses 6, twice per loop run.',
              nodeColors: [
                { id: 'WT', color: 'red' },
              ],
              vars: [
                ['outcomes', 'T T T N T T T N'],
                ['2-bit misses', '4'],
                ['1-bit misses', '6'],
              ],
              edgeColors: [
                { from: 'ST', to: 'WT', color: 'red' },
              ],
            },
          ],
          caption: 'A 2-bit saturating counter: SN/WN predict not taken, WT/ST predict taken. Red marks a misprediction.',
        },
        {
          type: 'p',
          text: 'After warming up, the 2-bit counter misses only the loop exit, once per run, because the single `N` moves it only to "weakly taken", which still predicts taken when the loop restarts. The 1-bit predictor misses twice per run. For the price of one more bit per entry, loop branches mispredict half as often. Tables of 2-bit counters are still a building block inside today\'s much larger predictors.',
        },
      ],
    },
    {
      kind: 'numeric',
      prompt: 'A branch produces the outcomes `T T N T T N` (T = taken, N = not taken). A 2-bit saturating counter starts in the weakly-not-taken state (WN, value 1). How many of the six predictions are wrong?',
      answer: 3,
      label: 'Mispredictions =',
      hint: 'Predict taken in states 2 and 3. Count up (max 3) on T, down (min 0) on N.',
      explanation: 'Start WN (1). T: predict N, **miss** → 2. T: predict T, hit → 3. N: predict T, **miss** → 2. T: hit → 3. T: hit → 3. N: **miss** → 2. Three misses: the first warm-up miss plus every `N`. A counter can only learn a branch\'s bias; to predict the regular "every third is N" pattern you need history, the subject of the next card.',
    },
    {
      kind: 'concept',
      title: 'History: predicting patterns, not just biases',
      blocks: [
        {
          type: 'p',
          text: 'A per-branch counter learns which way a branch *usually* goes. Many branches are not biased but **patterned**: a loop that always runs 4 times, a branch that alternates, a branch whose outcome depends on an earlier branch (`if (x > 0) ... if (x > 10) ...`). To catch those, predictors keep a **branch history**: a shift register of the last *n* outcomes, either for that branch (local history) or for all recent branches (global history).',
        },
        {
          type: 'p',
          text: 'The classic **gshare** predictor indexes its table of 2-bit counters with `address XOR history`. The same branch then gets a different counter for each recent history, so "after T T T, the next one is N" becomes learnable. This C++ program simulates a plain 2-bit table and gshare with 8 bits of history on four kinds of branch:',
        },
        {
          type: 'code',
          title: 'branch_predictors.cpp',
          code: `#include <algorithm>
#include <array>
#include <cstdint>
#include <format>
#include <iostream>
#include <random>
#include <vector>

// A table of 2-bit saturating counters: 0,1 predict not taken,
// 2,3 predict taken. \`historyBits\` > 0 turns it into gshare.
class Predictor {
public:
    explicit Predictor(int historyBits) : bits_(historyBits) {}
    bool predict(std::uint32_t pc) const {
        return table_[index(pc)] >= 2;
    }
    void update(std::uint32_t pc, bool taken) {
        std::uint8_t& c = table_[index(pc)];
        if (taken && c < 3) ++c;
        if (!taken && c > 0) --c;
        history_ = (history_ << 1 | taken) & ((1u << bits_) - 1);
    }
private:
    std::size_t index(std::uint32_t pc) const {
        return ((pc >> 2) ^ history_) & 4095;  // 4096 counters
    }
    int bits_;
    std::uint32_t history_ = 0;
    std::array<std::uint8_t, 4096> table_{};   // start strongly NT
};

// Feed one branch's outcomes through a predictor, count misses.
int misses(const std::vector<bool>& outcomes, int historyBits) {
    Predictor p(historyBits);
    int wrong = 0;
    for (bool taken : outcomes) {
        if (p.predict(0x400) != taken) ++wrong;
        p.update(0x400, taken);
    }
    return wrong;
}

int main() {
    std::mt19937 rng(42);                      // fixed seed
    std::vector<int> data(32768);
    for (int& v : data) v = static_cast<int>(rng() % 256);

    auto outcomesOf = [](const std::vector<int>& d) {
        std::vector<bool> out;                 // if (v >= 128) ...
        for (int v : d) out.push_back(v >= 128);
        return out;
    };
    std::vector<bool> loop, alt;
    for (int i = 0; i < 32768; ++i) {
        loop.push_back(i % 4 != 3);            // T T T N  T T T N ...
        alt.push_back(i % 2 == 0);             // T N T N ...
    }
    std::vector<int> sorted = data;
    std::sort(sorted.begin(), sorted.end());

    std::cout << "pattern (32768 branches)   2-bit  gshare(8)\\n";
    auto row = [](const char* name, const std::vector<bool>& o) {
        std::cout << std::format("{:<26} {:5}  {:5}\\n", name,
                                 misses(o, 0), misses(o, 8));
    };
    row("loop exit  T T T N", loop);
    row("alternating  T N T N", alt);
    row("v >= 128, unsorted data", outcomesOf(data));
    row("v >= 128, sorted data", outcomesOf(sorted));
}`,
          runnable: true,
          output: `pattern (32768 branches)   2-bit  gshare(8)
loop exit  T T T N          8194     12
alternating  T N T N       16384      6
v >= 128, unsorted data    16363  16355
v >= 128, sorted data          2     10`,
          annotations: [
            {
              lines: '11-30',
              text: 'One class covers both predictors: with `historyBits = 0` the history is always 0 and the index is just the address bits (a plain 2-bit table).',
            },
            {
              lines: '17-22',
              text: 'Update: saturate the counter, then shift the actual outcome into the history register.',
            },
            {
              lines: 25,
              text: 'gshare\'s trick: XOR the history into the index, so each (branch, recent history) pair gets its own counter. Real predictors use hashed indexes like this, much larger tables and several history lengths.',
            },
            {
              lines: '44-46',
              text: 'The data for the `if (v >= 128)` branch: 32,768 bytes from a fixed-seed generator. `std::mt19937` is fully specified by the standard, so the output is the same everywhere.',
            },
            {
              lines: '54-57',
              text: 'Two perfectly regular patterns: the loop branch (taken 3 of 4) and an alternating branch.',
            },
          ],
        },
        {
          type: 'p',
          text: 'The plain 2-bit table misses every loop exit (25%) and **every** outcome of the alternating branch (it never stays in one half of the state machine long enough). With 8 bits of history, gshare learns both patterns almost perfectly; its few misses are warm-up. On random data, nothing helps: about 50% misses for both. On sorted data, both predictors miss only around the single switch point.',
        },
        { type: 'heading', text: 'What real cores do' },
        {
          type: 'list',
          items: [
            'Modern predictors (TAGE-style predictors with several tagged tables of different history lengths; perceptron-style predictors that learn a weighted vote over history bits) combine many history lengths and are typically right well over 90% of the time on ordinary code. AMD has described perceptron and TAGE predictors in its Zen cores; Intel publishes few details.',
            'A [[branch-target-buffer]] (BTB) remembers **where** taken branches went, so fetch can be redirected in the same cycle, before decode.',
            'A **return stack buffer** predicts `ret` targets by mirroring calls, and **indirect predictors** guess the targets of `switch` jump tables and virtual calls, so a [[vtable]] call through the same type over and over predicts well.',
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Inside a game\'s per-frame update, which branch is a modern branch predictor **least** able to predict?',
      options: [
        {
          text: '`for (int i = 0; i < 64; ++i)` running every frame',
          why: 'A loop branch with a fixed trip count is taken 63 times then not taken once; counters plus history predict nearly all of it.',
        },
        {
          text: '`if (ptr == nullptr) return;` where `ptr` is almost never null',
          why: 'A heavily biased branch is the easiest kind: the counter saturates and stays there.',
        },
        {
          text: '`if (rng() % 2 == 0)` deciding whether a particle spawns',
          correct: true,
          why: 'The outcome is independent of all history: no predictor can beat 50%, so this branch mispredicts about half the time.',
        },
        {
          text: 'A virtual call `e->update()` on an array where every object has the same type',
          why: 'The indirect target is always the same, so the target predictor learns it after the first few calls.',
        },
      ],
      explanation: 'Predictors exploit **bias** (counters) and **patterns** (history). A branch on truly random data has neither, so about half its executions are mispredicted, whatever the hardware. When such a branch sits in a hot loop, the fix is in the code: sort or partition the data so outcomes come in runs, or remove the branch entirely.',
    },
    {
      kind: 'concept',
      title: 'The classic: sorted versus unsorted data',
      blocks: [
        {
          type: 'p',
          text: 'One of the most famous Stack Overflow questions asks why this loop runs several times faster when `data` is sorted, although sorting does not change the sum:',
        },
        {
          type: 'code',
          code: `long long sumBig(const std::vector<int>& data) {
    long long sum = 0;
    for (int v : data)
        if (v >= 128) sum += v;    // v is 0..255
    return sum;
}`,
          annotations: [
            {
              lines: 4,
              text: 'On random values the condition is a coin flip. On sorted values it is false for the first half and true for the second half.',
            },
          ],
        },
        {
          type: 'p',
          text: 'You already know the answer. Step through it with a 2-bit counter on twelve random bytes, then the same bytes sorted:',
        },
        {
          type: 'algo',
          view: 'array',
          interval: 900,
          frames: [
            {
              note: 'The loop body runs `if (v >= 128) sum += v;` for each element. A 2-bit counter predicts the `if`, starting at strongly not taken.',
              array: [68, 32, 130, 60, 253, 230, 241, 194, 107, 48, 249, 14],
              vars: [
                ['counter', 'SN'],
                ['misses', '0'],
              ],
              lines: [1],
            },
            {
              note: 'Unsorted: `68 >= 128` is **false**; predicted false: correct.',
              array: [68, 32, 130, 60, 253, 230, 241, 194, 107, 48, 249, 14],
              pointers: [
                { index: 0, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
              ],
              vars: [
                ['counter', 'SN'],
                ['misses', '0'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Unsorted: `32 >= 128` is **false**; predicted false: correct.',
              array: [68, 32, 130, 60, 253, 230, 241, 194, 107, 48, 249, 14],
              pointers: [
                { index: 1, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
              ],
              vars: [
                ['counter', 'SN'],
                ['misses', '0'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Unsorted: `130 >= 128` is **true**; predicted false: **miss**.',
              array: [68, 32, 130, 60, 253, 230, 241, 194, 107, 48, 249, 14],
              pointers: [
                { index: 2, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'red' },
              ],
              vars: [
                ['counter', 'WN'],
                ['misses', '1'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Unsorted: `60 >= 128` is **false**; predicted false: correct.',
              array: [68, 32, 130, 60, 253, 230, 241, 194, 107, 48, 249, 14],
              pointers: [
                { index: 3, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'red' },
                { index: 3, color: 'green' },
              ],
              vars: [
                ['counter', 'SN'],
                ['misses', '1'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Unsorted: `253 >= 128` is **true**; predicted false: **miss**.',
              array: [68, 32, 130, 60, 253, 230, 241, 194, 107, 48, 249, 14],
              pointers: [
                { index: 4, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'red' },
                { index: 3, color: 'green' },
                { index: 4, color: 'red' },
              ],
              vars: [
                ['counter', 'WN'],
                ['misses', '2'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Unsorted: `230 >= 128` is **true**; predicted false: **miss**.',
              array: [68, 32, 130, 60, 253, 230, 241, 194, 107, 48, 249, 14],
              pointers: [
                { index: 5, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'red' },
                { index: 3, color: 'green' },
                { index: 4, color: 'red' },
                { index: 5, color: 'red' },
              ],
              vars: [
                ['counter', 'WT'],
                ['misses', '3'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Unsorted: `241 >= 128` is **true**; predicted true: correct.',
              array: [68, 32, 130, 60, 253, 230, 241, 194, 107, 48, 249, 14],
              pointers: [
                { index: 6, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'red' },
                { index: 3, color: 'green' },
                { index: 4, color: 'red' },
                { index: 5, color: 'red' },
                { index: 6, color: 'green' },
              ],
              vars: [
                ['counter', 'ST'],
                ['misses', '3'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Unsorted: `194 >= 128` is **true**; predicted true: correct.',
              array: [68, 32, 130, 60, 253, 230, 241, 194, 107, 48, 249, 14],
              pointers: [
                { index: 7, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'red' },
                { index: 3, color: 'green' },
                { index: 4, color: 'red' },
                { index: 5, color: 'red' },
                { index: 6, color: 'green' },
                { index: 7, color: 'green' },
              ],
              vars: [
                ['counter', 'ST'],
                ['misses', '3'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Unsorted: `107 >= 128` is **false**; predicted true: **miss**.',
              array: [68, 32, 130, 60, 253, 230, 241, 194, 107, 48, 249, 14],
              pointers: [
                { index: 8, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'red' },
                { index: 3, color: 'green' },
                { index: 4, color: 'red' },
                { index: 5, color: 'red' },
                { index: 6, color: 'green' },
                { index: 7, color: 'green' },
                { index: 8, color: 'red' },
              ],
              vars: [
                ['counter', 'WT'],
                ['misses', '4'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Unsorted: `48 >= 128` is **false**; predicted true: **miss**.',
              array: [68, 32, 130, 60, 253, 230, 241, 194, 107, 48, 249, 14],
              pointers: [
                { index: 9, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'red' },
                { index: 3, color: 'green' },
                { index: 4, color: 'red' },
                { index: 5, color: 'red' },
                { index: 6, color: 'green' },
                { index: 7, color: 'green' },
                { index: 8, color: 'red' },
                { index: 9, color: 'red' },
              ],
              vars: [
                ['counter', 'WN'],
                ['misses', '5'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Unsorted: `249 >= 128` is **true**; predicted false: **miss**.',
              array: [68, 32, 130, 60, 253, 230, 241, 194, 107, 48, 249, 14],
              pointers: [
                { index: 10, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'red' },
                { index: 3, color: 'green' },
                { index: 4, color: 'red' },
                { index: 5, color: 'red' },
                { index: 6, color: 'green' },
                { index: 7, color: 'green' },
                { index: 8, color: 'red' },
                { index: 9, color: 'red' },
                { index: 10, color: 'red' },
              ],
              vars: [
                ['counter', 'WT'],
                ['misses', '6'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Unsorted: `14 >= 128` is **false**; predicted true: **miss**.',
              array: [68, 32, 130, 60, 253, 230, 241, 194, 107, 48, 249, 14],
              pointers: [
                { index: 11, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'red' },
                { index: 3, color: 'green' },
                { index: 4, color: 'red' },
                { index: 5, color: 'red' },
                { index: 6, color: 'green' },
                { index: 7, color: 'green' },
                { index: 8, color: 'red' },
                { index: 9, color: 'red' },
                { index: 10, color: 'red' },
                { index: 11, color: 'red' },
              ],
              vars: [
                ['counter', 'WN'],
                ['misses', '7'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Unsorted: **7 misses in 12** branches. The outcome is a coin flip, and no counter can predict a coin flip. Now sort the same values.',
              array: [14, 32, 48, 60, 68, 107, 130, 194, 230, 241, 249, 253],
              vars: [
                ['counter', 'SN'],
                ['misses', '0'],
              ],
              lines: [1],
            },
            {
              note: 'Sorted: `14 >= 128` is **false**; predicted false: correct.',
              array: [14, 32, 48, 60, 68, 107, 130, 194, 230, 241, 249, 253],
              pointers: [
                { index: 0, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
              ],
              vars: [
                ['counter', 'SN'],
                ['misses', '0'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Sorted: `32 >= 128` is **false**; predicted false: correct.',
              array: [14, 32, 48, 60, 68, 107, 130, 194, 230, 241, 249, 253],
              pointers: [
                { index: 1, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
              ],
              vars: [
                ['counter', 'SN'],
                ['misses', '0'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Sorted: `48 >= 128` is **false**; predicted false: correct.',
              array: [14, 32, 48, 60, 68, 107, 130, 194, 230, 241, 249, 253],
              pointers: [
                { index: 2, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
              ],
              vars: [
                ['counter', 'SN'],
                ['misses', '0'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Sorted: `60 >= 128` is **false**; predicted false: correct.',
              array: [14, 32, 48, 60, 68, 107, 130, 194, 230, 241, 249, 253],
              pointers: [
                { index: 3, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
              ],
              vars: [
                ['counter', 'SN'],
                ['misses', '0'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Sorted: `68 >= 128` is **false**; predicted false: correct.',
              array: [14, 32, 48, 60, 68, 107, 130, 194, 230, 241, 249, 253],
              pointers: [
                { index: 4, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
              ],
              vars: [
                ['counter', 'SN'],
                ['misses', '0'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Sorted: `107 >= 128` is **false**; predicted false: correct.',
              array: [14, 32, 48, 60, 68, 107, 130, 194, 230, 241, 249, 253],
              pointers: [
                { index: 5, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'green' },
              ],
              vars: [
                ['counter', 'SN'],
                ['misses', '0'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Sorted: `130 >= 128` is **true**; predicted false: **miss**.',
              array: [14, 32, 48, 60, 68, 107, 130, 194, 230, 241, 249, 253],
              pointers: [
                { index: 6, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'green' },
                { index: 6, color: 'red' },
              ],
              vars: [
                ['counter', 'WN'],
                ['misses', '1'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Sorted: `194 >= 128` is **true**; predicted false: **miss**.',
              array: [14, 32, 48, 60, 68, 107, 130, 194, 230, 241, 249, 253],
              pointers: [
                { index: 7, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'green' },
                { index: 6, color: 'red' },
                { index: 7, color: 'red' },
              ],
              vars: [
                ['counter', 'WT'],
                ['misses', '2'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Sorted: `230 >= 128` is **true**; predicted true: correct.',
              array: [14, 32, 48, 60, 68, 107, 130, 194, 230, 241, 249, 253],
              pointers: [
                { index: 8, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'green' },
                { index: 6, color: 'red' },
                { index: 7, color: 'red' },
                { index: 8, color: 'green' },
              ],
              vars: [
                ['counter', 'ST'],
                ['misses', '2'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Sorted: `241 >= 128` is **true**; predicted true: correct.',
              array: [14, 32, 48, 60, 68, 107, 130, 194, 230, 241, 249, 253],
              pointers: [
                { index: 9, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'green' },
                { index: 6, color: 'red' },
                { index: 7, color: 'red' },
                { index: 8, color: 'green' },
                { index: 9, color: 'green' },
              ],
              vars: [
                ['counter', 'ST'],
                ['misses', '2'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Sorted: `249 >= 128` is **true**; predicted true: correct.',
              array: [14, 32, 48, 60, 68, 107, 130, 194, 230, 241, 249, 253],
              pointers: [
                { index: 10, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'green' },
                { index: 6, color: 'red' },
                { index: 7, color: 'red' },
                { index: 8, color: 'green' },
                { index: 9, color: 'green' },
                { index: 10, color: 'green' },
              ],
              vars: [
                ['counter', 'ST'],
                ['misses', '2'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Sorted: `253 >= 128` is **true**; predicted true: correct.',
              array: [14, 32, 48, 60, 68, 107, 130, 194, 230, 241, 249, 253],
              pointers: [
                { index: 11, label: 'i' },
              ],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'green' },
                { index: 6, color: 'red' },
                { index: 7, color: 'red' },
                { index: 8, color: 'green' },
                { index: 9, color: 'green' },
                { index: 10, color: 'green' },
                { index: 11, color: 'green' },
              ],
              vars: [
                ['counter', 'ST'],
                ['misses', '2'],
              ],
              lines: [2, 3],
            },
            {
              note: 'Sorted: **2 misses**. All the `false` cases come first, then all the `true` ones: the counter only has to learn the switch once.',
              array: [14, 32, 48, 60, 68, 107, 130, 194, 230, 241, 249, 253],
              marks: [
                { index: 0, color: 'green' },
                { index: 1, color: 'green' },
                { index: 2, color: 'green' },
                { index: 3, color: 'green' },
                { index: 4, color: 'green' },
                { index: 5, color: 'green' },
                { index: 6, color: 'red' },
                { index: 7, color: 'red' },
                { index: 8, color: 'green' },
                { index: 9, color: 'green' },
                { index: 10, color: 'green' },
                { index: 11, color: 'green' },
              ],
              vars: [
                ['misses', '2'],
              ],
              lines: [1],
            },
          ],
          code: `for (int v : data)
    if (v >= 128)
        sum += v;`,
          caption: 'The same ten values, unsorted then sorted, through one 2-bit counter. Green: predicted correctly. Red: mispredicted.',
        },
        {
          type: 'p',
          text: 'Unsorted data mispredicts about half the time; the simulator on the previous card counted 16,363 misses in 32,768 iterations. Sorted data mispredicts **twice** in total. At roughly 15 to 20 cycles each, sixteen thousand misses dominate the loop.',
        },
        { type: 'heading', text: 'But check what your compiler did' },
        {
          type: 'p',
          text: 'Here is what GCC 13 actually emits for `sumBig` at `-O2` (x86-64, `g++ -O2 -S -masm=intel -fno-asynchronous-unwind-tables -fcf-protection=none`):',
        },
        {
          type: 'code',
          title: 'GCC 13, -O2: the if became a conditional move',
          lang: 'text',
          code: `_Z6sumBigRKSt6vectorIiSaIiEE:
    mov     rax, QWORD PTR [rdi]
    mov     rdi, QWORD PTR 8[rdi]
    xor     ecx, ecx
    cmp     rdi, rax
    je      .L1
.L4:
    movsx   rdx, DWORD PTR [rax]
    mov     rsi, rdx
    add     rdx, rcx
    cmp     esi, 127
    cmovg   rcx, rdx
    add     rax, 4
    cmp     rdi, rax
    jne     .L4
.L1:
    mov     rax, rcx
    ret`,
          annotations: [
            {
              lines: 1,
              text: 'The mangled name of `sumBig(const std::vector<int>&)`.',
            },
            {
              lines: '2-6',
              text: 'Load the vector\'s begin and end pointers; skip the loop if it is empty.',
            },
            { lines: 8, text: 'Load `v`, sign-extended to 64 bits.' },
            {
              lines: 10,
              text: 'Compute `sum + v` **unconditionally**, into a scratch register.',
            },
            {
              lines: 11,
              text: 'Compare `v` with 127 (`v > 127` is `v >= 128`).',
            },
            {
              lines: 12,
              text: '`cmovg`: if greater, copy the candidate into `sum`. A data-dependent **move**, not a jump: nothing to predict.',
            },
            {
              lines: 15,
              text: 'The only branch left is the loop branch, which is perfectly predictable.',
            },
          ],
        },
        {
          type: 'p',
          text: 'The `if` is gone: GCC turned it into a [[conditional-move]] (`cmovg`), so sorted and unsorted data run at the same speed. At `-O3` GCC goes further and vectorizes the loop with SIMD compare-and-mask instructions (the SIMD lesson in the next unit shows how). Older compilers, different compilers, or a slightly more complex loop body (a function call, a store) keep the branch, and then the sorted version really is several times faster. Paste the function into [Compiler Explorer](https://godbolt.org/) and try different compilers and flags.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Read the asm, then measure',
          text: 'Never assume a branch exists in the machine code just because there is an `if` in the source, and never assume it does not. Look at the assembly, and measure mispredictions with a profiler that reads hardware counters (`perf stat -e branch-misses` on Linux, VTune, AMD uProf, or Superluminal on Windows).',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'A branch that is taken exactly 50% of the time will necessarily be mispredicted about 50% of the time.',
      answer: false,
      explanation: 'What matters is predictability, not the ratio. A branch that strictly alternates `T N T N ...` is taken 50% of the time, yet gshare in the simulator mispredicted it only 6 times out of 32,768, because history reveals the pattern. Likewise, sorted data is "taken" half the time but in two long runs. Only branches whose outcomes are unpredictable from history, like random data, are stuck near 50%.',
    },
    {
      kind: 'concept',
      title: 'Branchless code',
      blocks: [
        {
          type: 'p',
          text: 'When a branch is unpredictable and sits in a hot loop, you can remove it: compute both possibilities (or a value that covers both) and **select** the result with arithmetic or a conditional move. There is then nothing to mispredict; the condition becomes an ordinary data dependence.',
        },
        {
          type: 'compare',
          left: {
            title: 'Branchy: fine if predictable',
            tone: 'neutral',
            code: `int applyDamage(int hp, int dmg) {
    int h = hp - dmg;
    if (h < 0) h = 0;
    return h;
}

int countAlive(const int* hp, int n) {
    int alive = 0;
    for (int i = 0; i < n; ++i)
        if (hp[i] > 0) ++alive;
    return alive;
}`,
          },
          right: {
            title: 'Branchless by construction',
            tone: 'good',
            code: `int applyDamage(int hp, int dmg) {
    return std::max(hp - dmg, 0);
}


int countAlive(const int* hp, int n) {
    int alive = 0;
    for (int i = 0; i < n; ++i)
        alive += hp[i] > 0;   // bool → 0/1
    return alive;
}`,
          },
        },
        {
          type: 'p',
          text: 'In fact GCC compiles **both** versions of each function to the same branchless code at `-O2`. This is called **if-conversion**:',
        },
        {
          type: 'code',
          title: 'GCC 13, -O2 (loop body of countAlive shown)',
          lang: 'text',
          code: `_Z11applyDamageii:
    sub     edi, esi
    mov     eax, 0
    cmovns  eax, edi
    ret
_Z10countAlivePKii:
    ...
.L6:
    mov     esi, DWORD PTR [rdi]
    xor     edx, edx
    test    esi, esi
    setg    dl
    add     rdi, 4
    add     eax, edx
    cmp     rcx, rdi
    jne     .L6`,
          annotations: [
            {
              lines: '2-4',
              text: '`max(hp - dmg, 0)`: subtract, preload 0, and `cmovns` ("move if not sign") picks the difference when it is not negative.',
            },
            {
              lines: '11-12',
              text: '`test` plus `setg` turns the comparison `hp[i] > 0` into a 0 or 1 in a register...',
            },
            {
              lines: 14,
              text: '...which is simply added to the count. No branch depends on the data.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Common branchless tools in C++: `std::min`, `std::max`, `std::clamp`; a ternary choosing between two simple values; adding a `bool` (which converts to 0 or 1); and masks: `-int(cond)` is all ones when `cond` is true, so `value & -int(cond)` is `value` or 0.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why branchless is not automatically better',
          text: 'A conditional move turns **control** dependence into **data** dependence. The CPU no longer guesses; it waits for the condition like any other input. That is a win when the guess would be wrong often, and a loss when it would almost always be right: a correctly predicted branch costs about nothing and lets the core run ahead speculatively, while a `cmov` makes the result wait for both inputs and the comparison. Branchless code also evaluates both sides, which is wasteful when one side is expensive.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Stores and calls stay branchy',
          text: 'Compilers will not if-convert a branch around a **store** (`if (e.hp <= 0) e.dead = true;`) into an unconditional write, because writing memory the source did not write could create a data race with another thread. Branches around function calls also stay branches. For those, restructure the data instead: for example keep dead and alive entities in separate arrays.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'To avoid a branch, a programmer replaced `&&` with `&` in this hot loop over a sparse array of enemy pointers (many slots are empty). The game now crashes intermittently. Tap the line with the bug.',
      code: `int countBurning(Enemy* const* slots, int n) {
    int burning = 0;
    for (int i = 0; i < n; ++i) {
        const Enemy* e = slots[i];
        burning += (e != nullptr) & e->onFire;
    }
    return burning;
}`,
      bugLines: [5],
      explanation: '`&&` short-circuits: if `e` is null it never evaluates `e->onFire`. `&` evaluates **both** operands, so for every empty slot the code dereferences a null pointer, which is undefined behaviour and usually a crash. Branchless rewrites are only valid when both sides are safe to evaluate. Here a safe branchless version needs a non-null dummy object, or better, a dense array of live enemies so there are no null slots at all.',
    },
    {
      kind: 'concept',
      title: 'Telling the compiler: `[[likely]]`, `[[unlikely]]` and PGO',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes you know which way a branch usually goes and the compiler does not. C++20 lets you say so with the attributes `[[likely]]` and `[[unlikely]]` on the statement after a condition (or on a `case` label):',
        },
        {
          type: 'code',
          title: 'C++20 likelihood attributes',
          code: `void applyHit(Enemy& e, int dmg) {
    e.hp -= dmg;
    if (e.hp <= 0) [[unlikely]] {
        spawnDeathEffects(e);     // rare, big, cold
        e.state = State::Dead;
    }
    e.hitFlashTimer = 0.1f;       // the common path continues here
}`,
          annotations: [
            {
              lines: 3,
              text: 'The attribute marks the **statement** that follows the condition. Here: entering this block is unlikely.',
            },
            {
              lines: '4-5',
              text: 'The compiler can move this block away from the hot path, typically after the function\'s `ret`, so the common case falls straight through with no taken branch.',
            },
            {
              lines: 7,
              text: 'Straight-line hot code also packs more useful instructions into each cache line of the instruction cache.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Important: these attributes mostly change **code layout and optimization decisions**, not the hardware predictor. The dynamic predictor learns from what actually happens and quickly overrides any static guess. x86 has had branch-hint prefixes since the Pentium 4, but for most of the past two decades cores ignored them (Intel has reintroduced a taken hint on some recent cores). Use the attributes sparingly, on branches you are sure about, and measure.',
        },
        {
          type: 'p',
          text: '**[[profile-guided-optimization|Profile-guided optimization]]** (PGO) replaces guesses with data. You build an instrumented binary, run it on a representative workload (for a game: a recorded play session or benchmark level), and rebuild with the recorded branch and call frequencies:',
        },
        {
          type: 'code',
          title: 'PGO with GCC',
          lang: 'shell',
          code: `g++ -O2 -fprofile-generate game.cpp -o game   # 1. instrumented build
./game --benchmark-level                       # 2. run: writes .gcda files
g++ -O2 -fprofile-use game.cpp -o game         # 3. optimized rebuild`,
          annotations: [
            {
              lines: 1,
              text: 'The instrumented binary counts how often each branch goes each way and how often each function is called.',
            },
            {
              lines: 2,
              text: 'The profile is only as good as this run: profile what players actually do.',
            },
            {
              lines: 3,
              text: 'The compiler now lays out hot paths, inlines hot calls and if-converts branches using real frequencies. MSVC offers the same with `/GENPROFILE` and `/USEPROFILE`.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Is PGO worth it?',
          text: 'PGO commonly gives gains from a few percent to well over 10% on large, branchy programs such as compilers, browsers and game engines, with no source changes. Its main cost is build-pipeline complexity: the profile must be regenerated as the code changes.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Mark the rare case so the compiler keeps the common path straight-line.',
      template: `if (packet.isCorrupt()) [[___]] {
    logAndDrop(packet);
    return;
}`,
      blanks: [
        {
          answers: ['unlikely'],
        },
      ],
      wordBank: ['unlikely', 'likely', 'nodiscard', 'maybe_unused', 'noreturn'],
      explanation: '`[[unlikely]]` after the condition says that entering the block is rare, so the compiler places it out of line and lets the normal path fall through. `[[likely]]` would claim the opposite. `[[nodiscard]]`, `[[maybe_unused]]` and `[[noreturn]]` are real attributes, but about return values, unused names and functions that never return, not branch probability.',
    },
    {
      kind: 'mcq',
      prompt: 'A particle system loops over 100,000 particles every frame and does `if (p.alive) simulate(p);`. About half are alive, scattered randomly through the array. Profiling shows heavy branch mispredictions. What is the most effective fix?',
      options: [
        {
          text: 'Add `[[likely]]` to the `if`',
          why: 'The attribute does not make the outcome any more predictable: it is still a coin flip. The hardware predictor would ignore the hint anyway.',
        },
        {
          text: 'Keep alive particles packed at the front of the array (swap dead ones to the end) and loop only over the alive count',
          correct: true,
          why: 'Now there is no data-dependent branch at all in the hot loop, and the loop touches only useful particles, which also helps the cache.',
        },
        {
          text: 'Rebuild with PGO',
          why: 'PGO would record that the branch is taken about 50% of the time, which does not make individual outcomes predictable.',
        },
        {
          text: 'Use `unsigned` for the loop counter',
          why: 'The loop branch is already perfectly predictable; the problem is the `alive` test inside.',
        },
      ],
      explanation: 'The best branchless code is often **no condition at all**: organize data so the hot loop processes only items that need the work. Swap-and-pop removal, separate arrays per state, and entity-component systems that keep each component type in its own dense array all apply this idea. It removes mispredictions and wasted memory traffic at the same time.',
    },
  ],
  takeaways: [
    'Modern cores resolve branches 15 to 20 stages after fetch with many instructions in flight, so they predict every branch; a misprediction costs roughly 15 to 20 cycles.',
    'Extra CPI = branch fraction × misprediction rate × penalty: even a few percent of mispredictions costs a lot.',
    'A **2-bit saturating counter** needs two surprises to change its mind, so loop branches miss only at the exit; history-based predictors (gshare, TAGE, perceptron) learn patterns too.',
    'Random data defeats every predictor: sorting or partitioning the data turns a coin flip into long predictable runs.',
    'Compilers often if-convert simple branches into `cmov`/`setcc`; always check the asm before optimizing, and measure with hardware counters.',
    'Branchless code (`std::min/max`, masks, adding bools) helps for unpredictable branches but costs a data dependence; never evaluate unsafe expressions to avoid a branch.',
    '`[[likely]]`/`[[unlikely]]` and PGO guide code layout; restructuring data so the hot loop has no condition is often the best fix.',
  ],
  reading: [
    {
      title: 'Why is processing a sorted array faster than processing an unsorted array?',
      url: 'https://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster-than-processing-an-unsorted-array',
      source: 'article',
      note: 'The famous question and answers, including the compiler-dependent cmov twist.',
    },
    {
      title: 'Branch predictor (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Branch_predictor',
      source: 'article',
      note: 'From static schemes and 2-bit counters to two-level, gshare, TAGE and neural predictors.',
    },
    {
      title: 'C++ attribute: likely, unlikely',
      url: 'https://en.cppreference.com/w/cpp/language/attributes/likely',
      source: 'cppreference',
      note: 'Exact placement rules for the attributes and what the standard does (and does not) promise.',
    },
    {
      title: 'Agner Fog: The microarchitecture of Intel, AMD and VIA CPUs',
      url: 'https://www.agner.org/optimize/',
      source: 'article',
      note: 'Measured branch prediction behaviour and misprediction penalties for many real cores.',
    },
  ],
};
