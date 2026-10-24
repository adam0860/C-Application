import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-switch',
  title: 'switch Statements',
  summary: 'Choosing among many constant values: case labels, break and fallthrough, default and exhaustiveness warnings, variables inside cases, and why switch can be faster than an if chain.',
  minutes: 15,
  objectives: [
    'Write a `switch` over an integer, `char` or enumeration with `case`, `break` and `default`',
    'Explain why case labels must be constant expressions and which types a `switch` accepts',
    'Predict fallthrough, and mark intentional fallthrough with `[[fallthrough]]`',
    'Decide when to include `default` and how to get compiler warnings for unhandled enum values',
    'Fix the "jump to case label" error by giving a case its own block',
    'Choose between `switch` and an `if`/`else if` chain, and describe how jump tables work',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'switch: one value, many possible cases',
      blocks: [
        {
          type: 'p',
          text: 'A long `else if` chain that keeps comparing the **same** variable with different constants — "is the key `w`? is it `s`? is it `e`?" — has a dedicated statement: the [[switch-statement]]. It evaluates a value once and jumps straight to the matching `case` label.',
        },
        {
          type: 'code',
          title: 'keys.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    char key = 'e';

    switch (key) {
        case 'w':
            std::cout << "Move forward\\n";
            break;
        case 's':
            std::cout << "Move back\\n";
            break;
        case 'e':
            std::cout << "Interact\\n";
            break;
        default:
            std::cout << "Unbound key\\n";
            break;
    }
}`,
          output: 'Interact',
          annotations: [
            { lines: 6, text: 'The value in parentheses is evaluated **once**. It must be an integer, a character, a `bool` or an enumeration.' },
            { lines: 7, text: 'A `case` label marks a place to jump to. The value after `case` must be a constant known at compile time.' },
            { lines: 9, text: '`break` jumps out of the `switch`, to the line after its closing brace. Without it, execution would carry on into the next case (more on this soon).' },
            { lines: '16-18', text: '`default` handles every value that has no matching `case`. It is optional.' },
          ],
        },
        {
          type: 'p',
          text: 'Compared with the equivalent `if` chain, the `switch` states the intent up front — "this is a decision about `key`" — and each option is a short, flat block. With many options it is easier to scan, and, as you will see, the compiler can check it more thoroughly and often run it faster.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Switches over enumerations are everywhere in gameplay code: movement modes (`EMovementMode`), collision channels, weapon types, AI states, input trigger events. Unreal\'s enums declared with `UENUM()` are ordinary C++ enums underneath, so everything in this lesson applies directly.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'What you can switch on — and why labels must be constants',
      blocks: [
        {
          type: 'p',
          text: 'The `switch` condition must have an **integral or enumeration type**: `int`, `char`, `bool`, `long`, the fixed-width integers, or an `enum`. You cannot switch on a `std::string`, a `std::string_view` or a `double`. Each `case` label must be a [[constexpr|constant expression]] — a value the compiler can compute while compiling — and no two labels may have the same value.',
        },
        {
          type: 'p',
          text: 'Switches pair naturally with **enumerations**, which Unit 15 covers in depth. An `enum class` defines a type with a fixed set of named values, such as the states of an enemy\'s AI. Each name is written with the type as a prefix, like `EnemyState::Chase`.',
        },
        {
          type: 'code',
          title: 'enemy_ai.cpp',
          runnable: true,
          code: `#include <iostream>

enum class EnemyState { Idle, Patrol, Chase, Attack };

int main() {
    EnemyState state = EnemyState::Chase;

    switch (state) {
        case EnemyState::Idle:
            std::cout << "Standing still\\n";
            break;
        case EnemyState::Patrol:
            std::cout << "Walking the route\\n";
            break;
        case EnemyState::Chase:
            std::cout << "Running at the player\\n";
            break;
        case EnemyState::Attack:
            std::cout << "Swinging sword\\n";
            break;
    }
}`,
          output: 'Running at the player',
          annotations: [
            { lines: 3, text: 'Defines the type `EnemyState` with exactly four possible values. Behind the scenes they are the integers 0 to 3.' },
            { lines: 8, text: 'Switching on the AI state: the heart of a simple **state machine**, one of the most common patterns in game AI.' },
            { lines: '9-20', text: 'One case per enumerator and no `default`. That is deliberate, as the card on `default` explains.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why only constants, and only integers?',
          text: 'Because all labels are known at compile time, the compiler can verify that no two are equal, warn about unhandled enumerators, and — most importantly — choose the fastest way to reach the right case, such as a lookup table indexed by the value. None of that would be possible if a label could be a variable decided at run time, or a string whose comparison requires a function call.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'C++20: using enum',
          text: 'Writing `EnemyState::` on every label gets repetitive. In C++20 you can put `using enum EnemyState;` inside the switch (just after the opening brace) and then write `case Idle:`, `case Chase:` and so on.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'No ranges',
          text: 'Standard C++ has no `case 1 to 5:` syntax. GCC and Clang accept `case 1 ... 5:` as a non-standard extension, but MSVC (which builds Unreal on Windows) does not. For ranges, use an `if` chain.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'Which variable **cannot** be used as the condition of a `switch`?',
      codeOptions: true,
      options: [
        { text: 'char key', why: '`char` is an integer type, so it is a perfectly good switch condition. Labels are written as character literals like `\'w\'`.' },
        { text: 'EnemyState state  // an enum class', why: 'Enumerations are allowed, and are among the best things to switch on.' },
        { text: 'std::string command', correct: true, why: 'A `std::string` is not an integral or enumeration type. Comparing strings requires a function call, so it cannot be done with case labels. Use an `if` chain, or convert the text to an enum first.' },
        { text: 'int slot', why: '`int` is the most basic switch condition.' },
      ],
      explanation:
        'A switch needs an integral or enumeration type, because case labels must be compile-time constants of that type and the compiler wants to compare them (or index a table with them) directly. Text commands are typically parsed once into an `enum` value, and the rest of the code switches on that.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'break and fallthrough',
      blocks: [
        {
          type: 'p',
          text: 'A `case` label is only an **entry point**, not a boundary. After jumping to a label, execution runs through the statements that follow until it reaches a `break` (or the end of the switch) — straight past any other `case` labels on the way. Running on into the next case is called [[fallthrough]].',
        },
        {
          type: 'p',
          text: 'Usually fallthrough is a bug: a forgotten `break`. Occasionally it is exactly what you want, such as for cumulative rewards. C++17 added the attribute `[[fallthrough]];` to say "I meant this", which also silences the compiler\'s warning.',
        },
        {
          type: 'code',
          title: 'loot_chest.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int tier = 2;   // loot tier of the chest
    int gold = 0;
    int gems = 0;
    int relics = 0;

    switch (tier) {
        case 3:
            ++relics;
            [[fallthrough]];
        case 2:
            gems += 5;
            [[fallthrough]];
        case 1:
            gold += 100;
            break;
        default:
            std::cout << "Empty chest\\n";
            break;
    }
    std::cout << gold << " gold, " << gems << " gems, "
              << relics << " relics\\n";
}`,
          output: '100 gold, 5 gems, 0 relics',
          annotations: [
            { lines: 9, text: 'With `tier == 2`, execution jumps to `case 2:`. Case 3 is skipped entirely.' },
            { lines: '14-17', text: 'Tier 2 adds gems, then deliberately falls through into tier 1 and adds gold too. A tier-3 chest would collect all three rewards.' },
            { lines: 15, text: '`[[fallthrough]];` must be the last statement before the next label. Without it, GCC\'s `-Wextra` warns *this statement may fall through*.' },
          ],
        },
        {
          type: 'p',
          text: 'Several labels in a row with no statements between them do not need the attribute: `case \'w\': case \'W\':` simply gives one block two entry points, a common way to handle upper- and lower-case keys together.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Why does C++ fall through by default?',
          text: 'C designed `switch` as a computed jump into a single block, with `case` labels being little more than `goto` targets. Falling through was the natural consequence, and occasionally handy for sharing code. In practice, forgotten `break`s became one of C\'s most common bugs, which is why C# forbids implicit fallthrough and C++ added warnings and `[[fallthrough]]`. The behaviour itself could not be changed without breaking decades of code.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `int x = 2;
switch (x) {
    case 1: std::cout << 'A';
    case 2: std::cout << 'B';
    case 3: std::cout << 'C'; break;
    case 4: std::cout << 'D';
}`,
      options: [
        { text: '`B`', why: 'That would require a `break` after `\'B\'`. Without one, execution continues into case 3.' },
        { text: '`ABC`', why: 'The switch jumps directly to `case 2:`. Labels above the matching one are never executed.' },
        { text: '`BCD`', why: 'The `break` after `\'C\'` exits the switch, so case 4 never runs.' },
        { text: '`BC`', correct: true, why: 'Jump to case 2, print B, fall through into case 3, print C, then `break` leaves the switch.' },
      ],
      explanation:
        'A switch jumps to the matching label and then runs **downwards** until a `break` or the closing brace. Labels do not stop execution. Reading a switch correctly means asking two questions: where does it enter, and where does it leave?',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'bug',
      prompt: 'Drinking a health potion (`potion == 1`) prints both `Restored 50 HP` and `Restored 30 MP`. Tap the line where the fix belongs.',
      code: `#include <iostream>

int main() {
    int potion = 1;   // 1 = health, 2 = mana
    switch (potion) {
        case 1:
            std::cout << "Restored 50 HP\\n";
        case 2:
            std::cout << "Restored 30 MP\\n";
            break;
    }
}`,
      bugLines: [7, 8],
      hint: 'What stops execution from running into the next case?',
      explanation:
        'Case 1 has no `break`, so after printing the HP message, execution falls through into case 2 and also restores mana. Add `break;` after line 7. GCC flags this with `-Wextra` (*this statement may fall through*) — if the fallthrough were intentional, `[[fallthrough]];` would say so and silence the warning.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'default, and letting the compiler check every case',
      blocks: [
        {
          type: 'p',
          text: '`default:` runs when no `case` matches. It can appear anywhere in the switch, but by convention it comes last. If there is no `default` and nothing matches, the switch simply does nothing. For integers and characters, which have far more possible values than you will ever list, a `default` is almost always right: it handles bad input gracefully.',
        },
        {
          type: 'p',
          text: 'Enumerations are different. With `-Wall`, GCC and Clang warn when a switch over an enum has no `case` for some enumerator — **but only if there is no `default`**. That warning is extremely valuable: when someone adds `Axe` to the `Weapon` enum six months from now, every switch that forgot to handle it lights up.',
        },
        {
          type: 'code',
          code: `enum class Weapon { Sword, Bow, Staff, Axe };  // Axe is new

switch (weapon) {
    case Weapon::Sword: swing(); break;
    case Weapon::Bow:   shoot(); break;
    case Weapon::Staff: cast();  break;
}
// warning: enumeration value 'Axe' not handled in switch [-Wswitch]`,
          annotations: [
            { lines: 1, text: 'A new enumerator was added to the type.' },
            { lines: 8, text: 'Because the switch has no `default`, the compiler knows the cases were meant to be exhaustive and points at the gap. Add a `default:` and this warning disappears — along with the protection it gives.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a default can hide bugs',
          text: 'A `default` says "every other value is handled here". For an enum where you meant to list everything, that turns a compile-time warning into a silent run-time behaviour: the new `Axe` quietly does whatever `default` does. So for enums, list every enumerator and leave `default` out; deal with impossible values (for example, data loaded from a corrupt file) after the switch instead.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'checkNoEntry in Unreal',
          text: 'Unreal code often marks branches that must never run with `checkNoEntry();`, an assertion that halts development builds if reached. You will also see `default: checkNoEntry(); break;` in engine switches, trading the compiler warning for a loud run-time failure. Assertions are covered in the Unreal course.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'truefalse',
      prompt: 'If a `switch` over an `enum class` contains a `default:` label, GCC with `-Wall` still warns when a newly added enumerator has no `case`.',
      answer: false,
      explanation:
        'The `-Wswitch` warning only fires when there is no `default`. With a `default`, the compiler assumes unlisted enumerators are handled on purpose. (GCC has an extra, off-by-default flag, `-Wswitch-enum`, that warns even then, but most projects do not enable it.) This is why switches over enums usually omit `default`.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Declaring variables inside cases',
      blocks: [
        {
          type: 'p',
          text: 'Try to declare an initialized variable inside a case and you may hit a confusing error: *jump to case label … crosses initialization of \'int amount\'*. The reason is that all the cases share **one** scope — the switch\'s braces. A variable declared in one case is still in scope in the cases below it, so jumping to a later label would skip its initialization while leaving the name usable.',
        },
        {
          type: 'compare',
          left: {
            title: 'Does not compile',
            tone: 'bad',
            code: `switch (action) {
    case 1:
        int amount = 25 + bonus;
        hp += amount;
        break;
    case 2:   // error: jump to case label
        rest();
        break;
}`,
            text: 'Jumping to `case 2` would bypass `amount`\'s initialization, yet `amount` would still be visible there.',
          },
          right: {
            title: 'Give the case its own block',
            tone: 'good',
            code: `switch (action) {
    case 1: {
        int amount = 25 + bonus;
        hp += amount;
        break;
    }
    case 2:
        rest();
        break;
}`,
            text: 'The braces end `amount`\'s scope before the next label, so no jump can skip into its lifetime.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is skipping an initialization forbidden?',
          text: 'If the jump were allowed, code in `case 2` could read `amount` as if it existed — but its initializer never ran, so its value would be garbage. For class types (like `std::string`) it would be worse: an object would be used, and later destroyed, without ever having been constructed. C++ rules out the whole situation at compile time.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'switch with an initializer (C++17)',
          text: 'Like `if`, a `switch` can declare a variable before its condition: `switch (auto cmd = parseCommand(line); cmd) { … }`. The variable is visible in all cases and disappears after the switch.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'fill',
      prompt: 'Complete the switch: the Idle case declares a local variable, Patrol must not fall through, and any other state should do nothing.',
      template: `switch (state) {
    case State::Idle: ___
        int waitTime = 3;
        idleFor(waitTime);
        break;
    }
    case State::Patrol:
        patrol();
        ___;
    ___:
        break;
}`,
      blanks: [{ answers: ['{'] }, { answers: ['break'] }, { answers: ['default'] }],
      wordBank: ['{', 'break', 'default', 'continue', 'else', '('],
      explanation:
        'The opening brace gives the Idle case its own scope (matching the `}` after its `break`), so `waitTime` cannot be skipped over. `break` stops Patrol from falling into the next label. `default` catches every remaining state. `continue` is for loops and does not end a switch case; `else` belongs to `if`.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'switch versus if chains, and jump tables',
      blocks: [
        {
          type: 'table',
          headers: ['Situation', 'Better choice'],
          rows: [
            ['One integer, `char` or enum compared with several constants', '`switch`'],
            ['Every value of an enum must be handled', '`switch` without `default` (compiler checks it)'],
            ['Ranges: `hp < 25`, `score >= 10000`', '`if` / `else if`'],
            ['Conditions on different variables, or combined with `&&`', '`if` / `else if`'],
            ['Strings or floating-point values', '`if` / `else if` (or convert to an enum first)'],
          ],
        },
        {
          type: 'p',
          text: 'There is also a performance story. When the case values are dense — say 0 to 7 — compilers typically build a [[jump-table|jump table]]: an array of code addresses indexed by the value. Reaching the right case then takes the same time whether there are 3 cases or 300. Sparse values (1, 50, 9000) are usually compiled into a binary search of comparisons instead.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Range check', text: 'Is the value outside the lowest-to-highest label range? Then go to `default` (or past the switch).' },
            { title: 'Index the table', text: 'Subtract the lowest label to get an index, and load the code address stored at that index.' },
            { title: 'Jump', text: 'One indirect jump lands directly on the matching case. No comparisons with the other labels are needed.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Do not choose switch just for speed',
          text: 'Optimizers are clever in both directions: an `if` chain comparing one variable with constants may be turned into a jump table, and a tiny switch may become two comparisons. Choose the construct that expresses the logic most clearly. The C++ Core Guidelines (rule ES.70) prefer `switch` when there is a choice, mainly for readability and the exhaustiveness checks.',
        },
        {
          type: 'deepdive',
          title: 'What a jump table looks like',
          blocks: [
            {
              type: 'p',
              text: 'For a switch over cases 0–4, the generated code is roughly equivalent to this pseudo-C++ (real compilers do it in two or three machine instructions):',
            },
            {
              type: 'code',
              lang: 'text',
              code: `if ((unsigned)value > 4) goto default_case;
goto *table[value];   // table = { &case0, &case1, ..., &case4 }`,
              annotations: [
                { lines: 1, text: 'Converting to unsigned turns negative values into huge ones, so one comparison rejects values below 0 and above 4.' },
                { lines: 2, text: 'An indirect jump through a table of addresses. This is also why labels must be compile-time constants: the table is built by the compiler.' },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'Which decision is better written as an `if` / `else if` chain than as a `switch`?',
      options: [
        { text: 'Choosing an action for the menu key the player pressed (`\'1\'` to `\'5\'`)', why: 'One `char` compared with a handful of constants is the textbook use of `switch`.' },
        { text: 'Choosing a health-bar colour: red below 25 HP, yellow below 60, green otherwise', correct: true, why: 'These are ranges, and case labels can only be single constant values. An `if` chain expresses ranges directly.' },
        { text: 'Running the behaviour for the current `EnemyState` enum value', why: 'An enum state machine is ideal for `switch`, especially without `default`, so the compiler warns about unhandled states.' },
        { text: 'Picking which of four weapon slots (0–3) to equip', why: 'A small integer compared with constants suits `switch`, and dense values like 0–3 may even compile to a jump table.' },
      ],
      explanation:
        'A `switch` compares one value against individual constants. As soon as the decision involves ranges, several variables or non-integer types, an `if` chain is the right tool. Health thresholds like `hp < 25` are the classic example.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'order',
      prompt: 'Put the steps of executing a `switch` statement in order.',
      linesAreCode: false,
      lines: [
        'Evaluate the condition expression once',
        'Find the case label equal to the value (by comparisons or a jump table)',
        'Jump to that label, or to default if none matches',
        'Run statements downwards until a break or the closing brace',
        'Continue with the statement after the switch',
      ],
      distractors: ['Evaluate every case label\'s statements to see which one is true'],
      explanation:
        'The condition is evaluated once, which is one advantage over an `if` chain that re-reads its variable for every test. The switch then jumps to a single entry point and runs downward, which is exactly why a missing `break` falls through into the next case. The statements in other cases are never evaluated "to check"; labels are just positions to jump to.',
    },
  ],
  takeaways: [
    'A `switch` evaluates an integral or enum value once and jumps to the matching `case` label; `default` handles everything else.',
    'Case labels must be distinct compile-time constants. You cannot switch on strings or floating-point values, and there are no standard range labels.',
    'Execution falls through into the next case unless you `break`. Mark intentional fallthrough with `[[fallthrough]];` to document it and silence the warning.',
    'For integers and characters, include a `default`. For enums, list every enumerator and omit `default`, so `-Wall` warns when a new one is not handled.',
    'Declaring an initialized variable in a case requires braces around that case, or you get "jump to case label crosses initialization".',
    'Use `switch` for one value against many constants and `if` chains for ranges and complex conditions; dense cases may compile to an O(1) jump table.',
  ],
  reading: [
    {
      title: 'switch statement',
      url: 'https://en.cppreference.com/w/cpp/language/switch',
      source: 'cppreference',
      note: 'The full rules, including the condition\'s allowed types and the switch initializer.',
    },
    {
      title: 'C++ attribute: fallthrough',
      url: 'https://en.cppreference.com/w/cpp/language/attributes/fallthrough',
      source: 'cppreference',
      note: 'Where `[[fallthrough]]` may appear and what it promises.',
    },
    {
      title: 'Switch fallthrough and scoping',
      url: 'https://www.learncpp.com/cpp-tutorial/switch-fallthrough-and-scoping/',
      source: 'learncpp',
      note: 'More examples of fallthrough, stacked labels and declaring variables inside cases.',
    },
    {
      title: 'C++ Core Guidelines',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines',
      source: 'core-guidelines',
      note: 'See ES.70 (prefer switch to if when there is a choice), ES.78 (do not rely on implicit fallthrough) and ES.79 (use default only for common cases).',
    },
  ],
};
