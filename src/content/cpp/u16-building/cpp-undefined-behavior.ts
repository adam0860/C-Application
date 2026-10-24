import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-undefined-behavior',
  title: 'Undefined Behavior and How to Avoid It',
  summary:
    'What "undefined" really means, why C++ has it, how optimizers exploit it, and the tools that catch it before your players do.',
  minutes: 18,
  objectives: [
    'Define undefined behavior precisely and explain why the standard keeps it',
    'Recognise the most common sources of UB in everyday code',
    'Explain how optimizers legally exploit UB, using concrete compiler output',
    'Distinguish implementation-defined, unspecified and undefined behavior',
    'Catch UB early with warnings, sanitizers and constant evaluation',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'What "undefined" really means',
      blocks: [
        {
          type: 'p',
          text: 'You have met the phrase [[undefined-behavior]] (UB) many times in this course: reading past the end of an array, using a dangling pointer, flowing off the end of a function. It is time to understand exactly what it means, because it is the single most important difference between C++ and safer languages.',
        },
        {
          type: 'definition',
          term: 'Undefined behavior',
          text: 'Behavior for which the C++ standard imposes **no requirements**. Once a program executes an operation with UB, the standard says nothing about what that run of the program does — not even about operations that came *before* it.',
        },
        {
          type: 'p',
          text: 'UB does **not** mean "it crashes" or "you get a garbage value". Those are possible outcomes, but so is printing the right answer, deleting a security check, or looping forever. Worst of all, the outcome can change when you change the optimization level, the compiler version or some unrelated line of code.',
        },
        {
          type: 'code',
          code: `#include <array>
#include <iostream>

int main() {
    std::array<int, 3> lootTable{10, 25, 50};
    std::cout << lootTable[3] << '\\n';   // one past the end
}`,
          annotations: [
            { lines: 6, text: 'Index 3 does not exist. `operator[]` does no bounds check, so this is UB. On your machine it might print `0` or some leftover number, run fine for months, then crash on a player\'s machine — all of which are "correct" as far as the standard is concerned.' },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A contract with the compiler',
          text: 'Think of the standard as a contract. You promise never to do certain things (index out of bounds, overflow a signed integer…). In exchange, the compiler promises to faithfully translate everything else — as fast as it possibly can. If you break your side, the contract is void, and the compiler owes you nothing.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: '"It works on my machine" proves nothing',
          text: 'A program with UB that passes every test is not a correct program that happens to have a bug somewhere — it is a program whose behavior is unconstrained. Testing can show UB exists (when something goes visibly wrong); it can never show UB is harmless.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Why would a language allow this?',
      blocks: [
        {
          type: 'p',
          text: 'Languages like Java, C# and Rust (in safe code) define what happens in every situation. C++ deliberately does not, for three historical and practical reasons.',
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Portability across very different hardware',
              text: 'C and C++ had to run on machines that disagreed about basic things: what happens on integer overflow (wrap? trap? saturate?), what shifting by 40 bits does, whether misaligned memory reads work. Rather than force every CPU to emulate one behavior expensively, the standard left these cases undefined.',
            },
            {
              title: 'Zero overhead',
              text: 'Defining out-of-bounds access would mean a bounds check on every `array[i]`; defining null dereference would mean a check on every `*p`. C++ keeps "you don\'t pay for what you don\'t use": `std::vector::at()` checks, `operator[]` does not. You choose.',
            },
            {
              title: 'Optimization opportunities',
              text: 'Because UB "cannot happen" in a valid program, the compiler may assume it doesn\'t. Assuming signed loop counters never overflow lets it compute trip counts, widen counters to 64-bit registers and vectorize loops. These assumptions are worth real speed in tight loops — exactly the code games care about.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just make overflow wrap around?',
          text: 'Unsigned arithmetic *is* defined to wrap. For signed integers, keeping overflow undefined lets the compiler treat `i + 1 > i` as always true and `x * 2 / 2` as `x`, simplifications that make loops faster. If overflow wrapped, those identities would be false and the optimizer would have to prove values stay small first. The trade-off: you must make sure overflow never happens.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'C++20 tidied one corner',
          text: 'C++20 finally requires signed integers to use two\'s complement representation, so converting `-1` to `unsigned` is now precisely defined. But signed arithmetic **overflow** is still undefined — the optimization benefits were judged too valuable to give up.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'truefalse',
      prompt: 'If a program with undefined behavior passes all its tests, it is safe to ship as long as you never change compilers.',
      answer: false,
      explanation:
        'The same compiler can produce different results when you change the optimization level, edit an unrelated function (changing inlining decisions), link in a different order, run on different input, or install a patch release of the compiler. UB means the standard places no requirements at all, so "it worked yesterday" carries no guarantee about tomorrow\'s build — or about tomorrow\'s player with a different save file.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'The usual suspects: a field guide',
      blocks: [
        {
          type: 'p',
          text: 'The standard lists hundreds of UB cases, but a handful cause almost all real bugs. Learn to spot these on sight:',
        },
        {
          type: 'table',
          headers: ['UB', 'Game-flavoured example', 'Typical symptom'],
          rows: [
            ['Out-of-bounds access', '`waveEnemies[waveEnemies.size()]`', 'Garbage values, corrupted neighbours, crashes far away'],
            ['[[integer-overflow|Signed integer overflow]]', '`score += bonus;` past `INT_MAX`', 'Negative scores, or the optimizer deleting your checks'],
            ['[[null-pointer]] dereference', '`target->hp -= 10;` with `target == nullptr`', 'Usually a [[segmentation-fault]] / access violation — but not guaranteed'],
            ['Reading an uninitialized variable', '`int damage; if (crit) damage = 50; return damage;`', 'Random damage numbers that differ between builds'],
            ['Use-after-free / [[dangling-pointer|dangling]] access', 'Keeping `&scores[0]` across `scores.push_back()`', 'Works until the vector reallocates, then reads freed memory'],
            ['[[data-race|Data race]]', 'Two threads incrementing `kills` with no lock (next unit)', 'Lost updates, torn values, impossible states'],
            ['Missing `return` in a non-void function', 'A `lootTier()` with a path that falls off the end', 'Wrong value, or the compiler deleting a branch'],
            ['[[double-free]]', '`delete enemy;` twice', 'Heap corruption, crashes later in unrelated code'],
            ['Shift by ≥ the bit width', '`1 << shift` with `shift == 32` for a 32-bit `int`', 'Different results on x86 and ARM'],
          ],
        },
        {
          type: 'code',
          code: `int damageRoll(bool crit) {
    int damage;              // no initializer
    if (crit) {
        damage = 50;
    }
    return damage;           // UB whenever crit is false
}

const std::string& rankName() {
    std::string name = "Legend";
    return name;             // reference to a dead local
}`,
          annotations: [
            { lines: '2-6', text: 'Reading an uninitialized local is UB. In practice you get whatever bits were left on the stack — often `0` in a Debug build and junk in Release, the classic "only breaks in Release" bug.' },
            { lines: '10-11', text: '`name` is destroyed when the function returns, so the caller gets a [[dangling-reference]]. GCC warns about this one (`-Wreturn-local-addr`); not every case is caught.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'C++26: uninitialized reads become "erroneous"',
          text: 'C++26 reclassifies reading an uninitialized local variable as **erroneous behavior**: still a bug the compiler may diagnose, but the variable holds some fixed value instead of making the whole program undefined. Until your compiler supports it, treat it as UB — and better still, always initialize.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'bug',
      prompt: 'This program compiles without warnings and usually prints a plausible number. Tap the line that causes undefined behavior.',
      code: `#include <array>
#include <iostream>

int main() {
    std::array<int, 4> waveEnemies{3, 5, 8, 13};
    int total = 0;
    for (std::size_t i = 0; i <= waveEnemies.size(); ++i) {
        total += waveEnemies[i];
    }
    std::cout << "Enemies: " << total << '\\n';
}`,
      bugLines: [7],
      hint: 'How many times does the loop body run for a 4-element array?',
      explanation:
        'The condition `i <= waveEnemies.size()` lets `i` reach 4, and `waveEnemies[4]` reads past the end — UB, because `operator[]` performs no bounds check. It may add a stray stack value, crash, or (as GCC really does with a similar loop) let the optimizer conclude the loop can exit early and rewrite it. Use `i < waveEnemies.size()`, or better, a range-based `for (int n : waveEnemies)` that cannot go out of bounds. `waveEnemies.at(i)` would turn the mistake into a well-defined `std::out_of_range` exception.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'How optimizers exploit UB',
      blocks: [
        {
          type: 'p',
          text: 'The optimizer does not "detect" UB and then sabotage your program. It does something subtler: it **assumes UB never happens** and uses that assumption as a fact to simplify code. Under the [[as-if-rule]], any transformation is allowed if a program *without* UB could not tell the difference. Here are three real examples, compiled with GCC 13 and Clang 18 at `-O2`.',
        },
        {
          type: 'heading',
          text: '1. The vanishing null check',
        },
        {
          type: 'code',
          code: `int readHealth(const int* hp) {
    int value = *hp;          // dereference first...
    if (hp == nullptr) {      // ...check afterwards
        return -1;
    }
    return value;
}`,
          annotations: [
            { lines: 2, text: 'If `hp` were null, this line would already be UB. So the compiler concludes: at line 3, `hp` cannot be null.' },
            { lines: '3-5', text: 'Therefore the `if` is dead code and is deleted. Both compilers emit just two instructions: load `*hp`, return it.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'x86-64 output (GCC and Clang, -O2)',
          code: `readHealth(int const*):
    mov   eax, DWORD PTR [rdi]   ; value = *hp
    ret                          ; no null check left`,
        },
        {
          type: 'heading',
          text: '2. The overflow check that always says "no"',
        },
        {
          type: 'code',
          code: `bool willOverflow(int score) {
    return score + 1 < score;   // compiled to: return false;
}`,
          annotations: [
            { lines: 2, text: 'For this to be true, `score + 1` would have to overflow — which is UB, so it "cannot happen". Mathematically `x + 1 < x` is false, and that is exactly what both compilers return. The check you wrote to detect overflow is gone.' },
          ],
        },
        {
          type: 'heading',
          text: '3. The loop that runs forever',
        },
        {
          type: 'code',
          code: `#include <iostream>

int main() {
    for (int wave = 0; wave < 4; ++wave) {
        std::cout << wave * 1000000000 << '\\n';
    }
}`,
          annotations: [
            { lines: 5, text: 'When `wave` reaches 3, `3 * 1000000000` overflows a 32-bit `int`. GCC warns at `-O2`: "iteration 3 invokes undefined behavior". Since iteration 3 cannot legally happen, `wave < 4` is always true in every legal iteration — so GCC deletes the exit test.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'GCC -O0',
            tone: 'neutral',
            lang: 'text',
            code: `0
1000000000
2000000000
-1294967296`,
            text: 'Four lines, the last one wrapped. Looks "fine".',
          },
          right: {
            title: 'GCC -O2',
            tone: 'bad',
            lang: 'text',
            code: `0
1000000000
2000000000
-1294967296
-294967296
705032704
...forever`,
            text: 'The loop condition no longer exists. (Clang happens to stop after four lines — UB means both are "correct".)',
          },
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'This happened to the Linux kernel',
          text: 'In 2009 a kernel network driver read `tun->sk` *before* checking `if (!tun)`. GCC removed the check exactly as in example 1, and attackers turned the resulting null access into a privilege-escalation exploit (CVE-2009-1897). The kernel has been compiled with `-fno-delete-null-pointer-checks` ever since.',
        },
        {
          type: 'deepdive',
          title: 'A missing return can delete a branch',
          blocks: [
            {
              type: 'code',
              code: `int lootTier(int rarity) {
    if (rarity > 90) return 3;
    if (rarity > 50) return 2;
    if (rarity > 10) return 1;
}   // falls off the end when rarity <= 10`,
              annotations: [
                { lines: 5, text: 'Flowing off the end of a non-void function (other than `main`) is UB. Both compilers warn: "control reaches end of non-void function".' },
              ],
            },
            {
              type: 'p',
              text: 'Both GCC and Clang at `-O2` reason: "reaching the end is impossible, so if `rarity <= 50`, it must be `> 10`." The third comparison disappears from the machine code, and `lootTier(5)` returns `1` — common loot for a roll that should have given nothing. No crash, no garbage, just quietly wrong game logic.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'mcq',
      prompt: 'Your designer promises `bonus` can be any `int`. What does GCC at `-O2` compile this function to?',
      code: `bool canAddScore(int score, int bonus) {
    return score + bonus > score;
}`,
      codeOptions: true,
      options: [
        {
          text: 'return true;',
          why: 'That would be wrong for `bonus <= 0`, where the result must be false even without overflow. The optimizer only drops what is impossible in a UB-free program.',
        },
        {
          text: 'int sum = score + bonus;  // wraps\nreturn sum > score;',
          why: 'The compiler is not required to model wrap-around for signed `int`, and here it does not: it never computes the sum at all.',
        },
        {
          text: 'return bonus > 0;',
          correct: true,
          why: 'Assuming no overflow, `score + bonus > score` is algebraically identical to `bonus > 0`. GCC 13 emits exactly that: `test esi, esi` / `setg al`.',
        },
        {
          text: 'if (overflows) trap();\nreturn score + bonus > score;',
          why: 'C++ never inserts overflow checks on its own. You get traps only with options such as `-ftrapv` or `-fsanitize=undefined`.',
        },
      ],
      explanation:
        'Because signed overflow is UB, the optimizer may use ordinary algebra: subtract `score` from both sides and the comparison becomes `bonus > 0`. If you wrote this to *detect* overflow, it never will. A correct check compares against the limit **before** adding: `bonus > 0 && score > INT_MAX - bonus`.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Undefined vs unspecified vs implementation-defined',
      blocks: [
        {
          type: 'p',
          text: 'Not every "it depends" in C++ is undefined behavior. The standard has a ladder of looseness, and knowing which rung you are on tells you what you may rely on.',
        },
        {
          type: 'table',
          headers: ['Category', 'What the standard says', 'Example', 'Can you rely on it?'],
          rows: [
            ['[[implementation-defined|Implementation-defined]]', 'Each implementation picks a behavior **and documents it**', '`sizeof(long)` is 8 on 64-bit Linux but 4 on 64-bit Windows; whether plain `char` is signed', 'Yes on that compiler and platform, but not portably'],
            ['[[unspecified-behavior|Unspecified]]', 'Implementation picks among allowed options, need not document, may differ each time', 'The order in which function arguments are evaluated', 'Only on what is true for *every* allowed option'],
            ['Undefined', 'No requirements whatsoever', 'Signed overflow, null dereference, data races', 'Never'],
            ['Ill-formed, no diagnostic required', 'The program is invalid, but the compiler need not tell you', 'ODR violations (previous lesson)', 'Never'],
          ],
        },
        {
          type: 'code',
          code: `int nextId() {
    static int id = 0;
    return ++id;
}

void spawnPair(int first, int second);

spawnPair(nextId(), nextId());   // (1, 2) or (2, 1)?`,
          annotations: [
            { lines: 8, text: 'Unspecified, not undefined: each argument is fully evaluated before the other starts (since C++17), but which goes first is up to the compiler. On x86-64, GCC 13 really passes `(2, 1)` and Clang 18 passes `(1, 2)`. The program is valid either way — just do not depend on the order.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have three different categories?',
          text: '**Implementation-defined** lets the standard fit very different hardware while still giving you a documented answer per platform — `int` can be the natural word size of the machine. **Unspecified** gives the compiler freedom to choose whatever is fastest in each situation (argument order affects register allocation) without making the program meaningless. **Undefined** is reserved for situations where even listing the possible outcomes would cost performance or be impossible to specify.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'The fix for order-dependence',
          text: 'Give each call its own statement: `const int a = nextId(); const int b = nextId(); spawnPair(a, b);`. Statements run in order, so the result is now fully specified — and easier to read.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'In `spawnEnemy(rollHealth(), rollArmor());` both helper functions print a line. How does the standard classify the order in which the two lines appear?',
      options: [
        {
          text: 'Undefined behavior',
          why: 'Nothing here breaks a rule: both orders produce a valid, meaningful program. UB would mean *no* requirements at all.',
        },
        {
          text: 'Implementation-defined: the compiler must document which goes first',
          why: 'No documentation is required, and the order may even differ between two calls in the same program.',
        },
        {
          text: 'Unspecified: either order is allowed and need not be documented or consistent',
          correct: true,
          why: 'The standard allows both orders and only requires that one call finishes before the other starts — they cannot interleave.',
        },
        {
          text: 'Always left to right since C++17',
          why: 'C++17 fixed the order for some operators (`<<`, `>>`, `=`, `.`, `->`, `[]`) but not for function arguments. GCC on x86-64 often evaluates them right to left.',
        },
      ],
      explanation:
        'Function arguments are *indeterminately sequenced*: each is evaluated completely, but in an order the compiler chooses. That makes the output order unspecified — not a bug in the language, but a bug in any code that depends on it. Note the contrast with `std::cout << rollHealth() << rollArmor();`, where C++17 guarantees left-to-right evaluation of the `<<` chain.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Catching UB: warnings, sanitizers and constant evaluation',
      blocks: [
        {
          type: 'p',
          text: 'You cannot test UB away, but you can catch most of it with a layered defence. Each layer is cheap; together they find the overwhelming majority of real bugs.',
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Compiler warnings (free, at compile time)',
              text: '`-Wall -Wextra` (GCC/Clang) or `/W4` (MSVC) flag many UB patterns: `-Wreturn-type` / C4715 for missing returns, `-Wuninitialized` / C4700 for uninitialized reads, `-Wreturn-local-addr` for dangling returns. Some warnings only fire when optimizing, because they rely on the optimizer\'s analysis.',
            },
            {
              title: 'UndefinedBehaviorSanitizer (cheap, at run time)',
              text: '`-fsanitize=undefined` instruments signed overflow, invalid shifts, null and misaligned accesses, out-of-range enum and bool values, and more. It reports the exact file, line and values involved, and the program keeps running.',
            },
            {
              title: 'AddressSanitizer (moderate cost, at run time)',
              text: '`-fsanitize=address` catches out-of-bounds accesses on the heap, stack and globals, use-after-free and double free. (Data races need ThreadSanitizer, covered in the next unit.) You will read a full report in the debugging lesson.',
            },
            {
              title: 'Library hardening',
              text: '`-D_GLIBCXX_ASSERTIONS` makes GCC\'s standard library bounds-check `operator[]` on `std::vector`, `std::array` and friends; MSVC\'s Debug configuration enables checked iterators by default.',
            },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'UBSan catching an overflowing score',
          code: `$ g++ -std=c++20 -g -fsanitize=undefined score.cpp -o score
$ ./score
score.cpp:7:11: runtime error: signed integer overflow:
    2147483647 + 1 cannot be represented in type 'int'
-2147483648`,
          annotations: [
            { lines: 1, text: 'Add `-g` so reports include file and line numbers.' },
            { lines: '3-4', text: 'Exactly what overflowed, where, and with which values. Without the sanitizer, this run would have printed the same negative number silently.' },
          ],
        },
        {
          type: 'p',
          text: 'There is also a neat trick hiding in [[constexpr]]: the compiler is **required** to reject core-language UB during constant evaluation. A `static_assert` on a `constexpr` function is therefore a unit test that doubles as a UB detector:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

constexpr int addBonus(int score, int bonus) {
    return score + bonus;
}

static_assert(addBonus(100, 50) == 150);
// static_assert(addBonus(2147483647, 1) > 0);
//   GCC: error: overflow in constant expression

int main() {
    std::cout << "Final score: " << addBonus(100, 50) << '\\n';
}`,
          output: 'Final score: 150',
          annotations: [
            { lines: 7, text: 'Checked while compiling. If it fails, the build fails — no test runner needed.' },
            { lines: '8-9', text: 'Uncomment this and the build stops: overflow is UB, and UB is never allowed in a constant expression. The same function called at run time would just overflow silently.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Run sanitizers in a dedicated build',
          text: 'Sanitizers slow the program down (UBSan a little, ASan roughly twice), so keep a separate "sanitize" build configuration and run your tests — or a playthrough of your game — with it regularly. Many teams run it automatically on every commit.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'fill',
      prompt: 'Pick the sanitizer for each job.',
      template: `# Catch signed overflow, bad shifts and null access:
g++ -std=c++20 -g -fsanitize=___ game.cpp -o game

# Catch use-after-free and buffer overflows:
g++ -std=c++20 -g -fsanitize=___ game.cpp -o game`,
      blanks: [{ answers: ['undefined'] }, { answers: ['address'] }],
      wordBank: ['undefined', 'address', 'thread', 'memory', 'leak'],
      explanation:
        '`undefined` enables UndefinedBehaviorSanitizer, which checks arithmetic and similar core-language rules. `address` enables AddressSanitizer, which tracks which bytes are valid to touch and reports out-of-bounds and use-after-free accesses. The distractors are real but do other jobs: `thread` (TSan) finds data races, `memory` (Clang-only MSan) finds reads of uninitialized memory, and `leak` (LSan) finds memory leaks — LSan also runs automatically with ASan on Linux.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Habits that keep UB out of your game',
      blocks: [
        {
          type: 'p',
          text: 'Tools catch UB after you write it. Good habits stop you writing it in the first place. Most of these you have already met in this course — now you know the deeper reason for each.',
        },
        {
          type: 'list',
          items: [
            '**Initialize everything.** `int damage{};` costs nothing and removes a whole UB category.',
            '**Prefer constructs that cannot go out of bounds**: range-based `for`, standard algorithms, `std::span`. Use `.at()` where an index comes from outside your control (save files, network packets, mod data).',
            '**Own memory with [[raii|RAII]] and [[smart-pointer|smart pointers]]**, so use-after-free and double free become hard to express.',
            '**Never keep pointers, references or iterators into a container across operations that may reallocate it** ([[iterator-invalidation]]).',
            '**Check arithmetic limits before computing**, not after (see below).',
            '**Turn on warnings, treat the important ones as errors** (`-Werror=return-type` costs nothing), and run sanitizers regularly.',
          ],
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <limits>

int addScoreSaturating(int score, int bonus) {
    constexpr int kMax = std::numeric_limits<int>::max();
    constexpr int kMin = std::numeric_limits<int>::min();
    if (bonus > 0 && score > kMax - bonus) {
        return kMax;                 // clamp instead of overflowing
    }
    if (bonus < 0 && score < kMin - bonus) {
        return kMin;
    }
    return score + bonus;            // now provably safe
}

int main() {
    std::cout << addScoreSaturating(100, 50) << '\\n';
    std::cout << addScoreSaturating(2147483600, 100) << '\\n';
}`,
          output: '150\n2147483647',
          annotations: [
            { lines: 7, text: '`kMax - bonus` cannot overflow when `bonus > 0`, so this comparison is always safe. It asks "would the sum exceed the max?" without computing the sum.' },
            { lines: 10, text: 'The mirror case for negative bonuses (penalties): `kMin - bonus` is safe when `bonus < 0`.' },
            { lines: 13, text: 'Only reached when the result is known to fit. C++26 adds `std::add_sat` in `<numeric>`, which does exactly this for you.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'UB and Unreal build configurations',
          text: 'Unreal\'s **Shipping** configuration is compiled with full optimization, so UB that seemed harmless in a `DebugGame` build can suddenly behave differently in the build players run. MSVC, the default Windows compiler for Unreal, supports AddressSanitizer (`/fsanitize=address`) but has no UBSan, so warnings and careful habits matter even more there. Unreal\'s own `check()` and `ensure()` macros, covered in the Unreal course, are the engine\'s tools for catching broken assumptions early.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'Which of these snippets have undefined behavior? Select all that apply.',
      multi: true,
      codeOptions: true,
      options: [
        {
          text: 'int hp;\nstd::cout << hp;',
          correct: true,
          why: 'Reading an uninitialized local `int` is UB (erroneous behavior from C++26, but still a bug).',
        },
        {
          text: 'unsigned int ammo = 0;\n--ammo;',
          why: 'Defined: unsigned arithmetic wraps modulo 2ⁿ, so `ammo` becomes the maximum `unsigned int`. Surprising, perhaps, but not UB.',
        },
        {
          text: 'int* target = nullptr;\nint hp = *target;',
          correct: true,
          why: 'Dereferencing a null pointer is UB. It often crashes, but the optimizer may also assume it never happens and rearrange surrounding code.',
        },
        {
          text: 'int best = INT_MAX;\nbest += 1;',
          correct: true,
          why: 'Signed integer overflow is UB, even though C++20 fixed the representation to two\'s complement.',
        },
        {
          text: 'std::vector<int> v{1, 2};\nv.at(5);',
          why: 'Defined: `.at()` checks the index and throws `std::out_of_range`. That is the whole point of `.at()`.',
        },
      ],
      explanation:
        'The pattern to remember: *signed* overflow, null dereference and uninitialized reads are UB; *unsigned* wrap-around and checked accessors like `.at()` are fully defined. When in doubt, ask "does the standard tell me what happens here?" — if the answer is no, assume the optimizer will exploit it.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'truefalse',
      prompt: 'Compiling with `-O0` makes undefined behavior safe, because without optimization the compiler cannot exploit it.',
      answer: false,
      explanation:
        'At `-O0` the machine code follows your source more literally, so UB is often *less surprising* — but it is still UB. An out-of-bounds write still corrupts memory, a use-after-free still reads freed data, and a data race still loses updates. Worse, `-O0` hides bugs that appear the day you ship an optimized build. Use `-O0` for debugging convenience, never as a safety measure; use sanitizers to actually find the UB.',
    },
  ],
  takeaways: [
    'Undefined behavior means the standard imposes no requirements on the whole run — not "a crash" or "a random value".',
    'C++ keeps UB for portability, zero-overhead operations and optimization freedom.',
    'Common sources: out-of-bounds access, signed overflow, null dereference, uninitialized reads, use-after-free, data races, missing returns.',
    'Optimizers assume UB never happens, which can delete null checks, overflow checks and loop exit conditions.',
    'Implementation-defined behavior is documented per platform; unspecified behavior picks among valid options; undefined behavior has no rules.',
    'Defend in layers: initialize everything, prefer bounds-safe constructs, enable warnings, and run UBSan and ASan builds regularly.',
  ],
  reading: [
    {
      title: 'Undefined behavior',
      url: 'https://en.cppreference.com/w/cpp/language/ub',
      source: 'cppreference',
      note: 'The four categories of behavior with standard references and several optimizer examples.',
    },
    {
      title: 'A Guide to Undefined Behavior in C and C++',
      url: 'https://blog.regehr.org/archives/213',
      source: 'article',
      note: 'John Regehr\'s classic three-part series on why UB exists and how compilers use it.',
    },
    {
      title: 'What Every C Programmer Should Know About Undefined Behavior',
      url: 'https://blog.llvm.org/2011/05/what-every-c-programmer-should-know.html',
      source: 'article',
      note: 'Chris Lattner (creator of LLVM) explains, from the compiler\'s side, which optimizations depend on UB.',
    },
    {
      title: 'UndefinedBehaviorSanitizer',
      url: 'https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html',
      source: 'other',
      note: 'The full list of UBSan checks and how to enable them individually.',
    },
  ],
};
