import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-functions-basics',
  title: 'Defining and Calling Functions',
  summary: 'Why programs are built from functions, how a call really works, and what the call stack does for you.',
  minutes: 17,
  objectives: [
    'Explain why programs are split into functions: reuse, abstraction and naming intent',
    'Write a function with a return type, name, parameter list and body, and call it',
    'Distinguish parameters from arguments and describe how arguments initialize parameters',
    'Use `return` correctly in value-returning and `void` functions',
    'Describe the call stack and what a stack frame contains',
    'Explain why a function must be declared before it is called',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Why functions exist',
      blocks: [
        {
          type: 'p',
          text: 'So far every program you have written lived inside `main`. That works for twenty lines, but a real game has thousands of rules: how damage is calculated, when a player levels up, how loot is rolled. If all of that lived in one giant block, you would copy the same logic over and over, and every bug would have to be fixed in every copy.',
        },
        {
          type: 'p',
          text: 'A [[function|function]] is a named, reusable block of code. You write the logic once, give it a name, and *call* it wherever you need it. Compare the two versions below: same behaviour, very different maintenance story.',
        },
        {
          type: 'compare',
          left: {
            title: 'Copy-pasted logic',
            tone: 'bad',
            code: `int goblinHp = 30 - 12;
if (goblinHp < 0) {
    goblinHp = 0;
}
int dragonHp = 500 - 120;
if (dragonHp < 0) {
    dragonHp = 0;
}`,
            text: 'The clamping rule is duplicated. Change it (say, armor now absorbs 2 damage) and you must find and edit every copy.',
          },
          right: {
            title: 'One function, called twice',
            tone: 'good',
            code: `int goblinHp = applyDamage(30, 12);
int dragonHp = applyDamage(500, 120);`,
            text: 'The rule lives in exactly one place. Each call site reads like a sentence describing *what* happens.',
          },
        },
        {
          type: 'list',
          items: [
            '**Reuse** — write the logic once, call it from anywhere. Fix a bug once and every caller benefits.',
            '**Abstraction** — callers only need to know *what* `applyDamage` does, not *how*. You can think about "apply damage" as a single idea and forget the details.',
            '**Naming intent** — a well-named function documents itself. `if (isAlive(hp))` says more than `if (hp > 0)`, and it keeps saying the right thing if the rule later changes.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why this matters more than it seems',
          text: 'Human working memory holds only a handful of things at once. Functions let you build a program out of layers: at the top, `runTurn()` calls `moveEnemies()` and `resolveCombat()`; each of those is made of smaller functions. At every layer you only have to understand a few names, never the whole program at once. This is how million-line code bases (like Unreal Engine) stay workable.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Almost all of your Unreal C++ is functions that the engine calls for you: `BeginPlay()` when an actor enters the world, `Tick(float DeltaTime)` every frame, `TakeDamage(...)` when something hits it. Learning to write small, well-named functions is the single most transferable skill in this course.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Anatomy of a function',
      blocks: [
        {
          type: 'p',
          text: 'A function definition has four parts: a **return type** (what kind of value it hands back), a **name**, a **parameter list** in parentheses (the inputs), and a **body** in braces (the code that runs). Here is `applyDamage` in a complete program:',
        },
        {
          type: 'code',
          title: 'damage.cpp',
          runnable: true,
          code: `#include <iostream>

int applyDamage(int health, int damage) {
    int remaining = health - damage;
    if (remaining < 0) {
        remaining = 0;
    }
    return remaining;
}

int main() {
    int goblinHp = applyDamage(30, 12);
    int dragonHp = applyDamage(500, 120);
    std::cout << "Goblin: " << goblinHp << '\\n';
    std::cout << "Dragon: " << dragonHp << '\\n';
    std::cout << "Slime: " << applyDamage(5, 99) << '\\n';
}`,
          output: 'Goblin: 18\nDragon: 380\nSlime: 0',
          annotations: [
            { lines: 3, text: 'The **function header**. `int` is the return type, `applyDamage` the name, and `(int health, int damage)` the parameter list: two inputs, each with its own type and name.' },
            { lines: '4-7', text: 'The **body**. `remaining` is a *local variable*: it exists only while this call is running and is invisible to `main`.' },
            { lines: 8, text: '`return` ends the function and hands the value back to whoever called it.' },
            { lines: '12-13', text: 'Two **calls**. Each call runs the body from the top with fresh values, then the returned value initializes the variable on the left.' },
            { lines: 16, text: 'A call is an [[expression|expression]], so you can use it anywhere a value of its return type fits, including directly inside a `std::cout` chain.' },
          ],
        },
        {
          type: 'table',
          headers: ['Part', 'In the example', 'Meaning'],
          rows: [
            ['Return type', '`int`', 'The type of the value the caller gets back (`void` if nothing).'],
            ['Name', '`applyDamage`', 'An [[identifier|identifier]] used to call it. Choose a verb phrase.'],
            ['Parameter list', '`(int health, int damage)`', 'Comma-separated inputs. Empty `()` means no inputs.'],
            ['Body', '`{ ... }`', 'The statements that run on each call.'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Naming functions',
          text: 'Name functions after what they *do* (`applyDamage`, `spawnEnemy`, `calculateScore`) and boolean checks as questions (`isAlive`, `hasKey`, `canJump`). This course uses `camelCase` for standard C++. Unreal\'s coding standard uses `PascalCase` (`ApplyDamage`), so you will see both styles.',
        },
        {
          type: 'deepdive',
          title: 'Where does the code of a function live?',
          blocks: [
            {
              type: 'p',
              text: 'The compiler turns each function body into a block of machine instructions stored once in the executable\'s code section. Calling the function twice does not duplicate the code; the processor simply *jumps* to that block and later jumps back. (An optimizing compiler may still choose to copy a small function\'s body into each caller — called *inlining* — to save the jump. You will meet the `inline` keyword later in this unit.)',
            },
          ],
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'The body of a function runs at the point in the file where the function is *defined*, before `main` starts.',
      answer: false,
      explanation:
        'Defining a function only describes what it would do; nothing runs until something **calls** it. Execution always starts at `main`. A function that is defined but never called is never executed at all (and an optimizer may even remove it).',
    },
    {
      kind: 'concept',
      title: 'Parameters and arguments',
      blocks: [
        {
          type: 'p',
          text: 'These two words are often mixed up, but the distinction is precise. A [[parameter|parameter]] is the variable declared in the function\'s header (`health`, `damage`). An [[argument|argument]] is the actual value or expression you pass at the call site (`30`, `goblinHp - 5`). Parameters are the *slots*; arguments are what you put in them.',
        },
        {
          type: 'code',
          code: `int applyDamage(int health, int damage);   // parameters

int baseHp = 40;
int hp = applyDamage(baseHp, 3 * 4);       // arguments`,
          annotations: [
            { lines: 1, text: '`health` and `damage` are parameters: local variables of `applyDamage` that get their initial values from the call.' },
            { lines: 4, text: 'The arguments are `baseHp` and `3 * 4`. Each argument expression is evaluated first (`40` and `12`), then used to **initialize** the matching parameter.' },
          ],
        },
        {
          type: 'p',
          text: 'Arguments are matched to parameters **by position**, never by name. The first argument initializes the first parameter, and so on. If you write `applyDamage(12, 40)` you have swapped health and damage, and the compiler cannot help you: both are `int`. If an argument has a different type, the usual [[implicit-conversion|implicit conversions]] apply, exactly as in `int x = 7.9;` (so `7.9` would silently become `7`).',
        },
        {
          type: 'p',
          text: 'By default each parameter is a brand-new variable holding a **copy** of its argument. Changing a parameter inside the function changes only the copy; the caller\'s variable is untouched. This is called [[pass-by-value|pass by value]], and the next lesson explores it (and its alternatives) in depth.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why copy by default?',
          text: 'Copying makes a function a sealed box: whatever it does to its parameters cannot leak back and surprise the caller. You can read a call like `applyDamage(goblinHp, 12)` and know for certain that `goblinHp` still has the same value afterwards. C++ lets you opt out of copying when you need to (with references, next lesson), but the safe behaviour is the default.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Argument evaluation order is unspecified',
          text: 'In `applyDamage(rollDice(), rollDice())` you cannot know which `rollDice()` call runs first. The C++ standard leaves the order in which arguments are evaluated unspecified, and real compilers differ (GCC often goes right to left on x86-64). The program is valid, but never write code whose result depends on that order: store the values in named variables first.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>

int doubleIt(int x) {
    x = x * 2;
    return x;
}

int main() {
    int gold = 10;
    int result = doubleIt(gold);
    std::cout << gold << ' ' << result << '\\n';
}`,
      options: [
        { text: '20 20', why: 'This assumes `x` *is* `gold`. It is not: `x` is a separate variable initialized with a copy of `gold`\'s value.' },
        { text: '10 10', why: 'The function does compute and return `20`, and that return value initializes `result`.' },
        { text: '10 20', correct: true, why: '`x` is a copy, so doubling it leaves `gold` at 10. The doubled value comes back through `return` and lands in `result`.' },
        { text: 'It does not compile: you cannot assign to a parameter', why: 'Parameters are ordinary local variables. Unless declared `const`, you may modify them freely.' },
      ],
      explanation:
        'Passing by value means the parameter `x` starts life as a copy of the argument `gold`. The function can do anything it likes to `x` without affecting `gold`. The only way information flows back to the caller here is the return value.',
    },
    {
      kind: 'concept',
      title: 'return, and functions that return nothing',
      blocks: [
        {
          type: 'p',
          text: 'A `return` statement does two things at once: it produces the function\'s [[return-value|return value]] and it **ends the function immediately**. Any code after it in the same path never runs. A function may contain several `return` statements, one per path, and returning early is often the clearest way to handle special cases first (a pattern called a *guard clause*).',
        },
        {
          type: 'p',
          text: 'Some functions exist only for their effect, like printing or changing game state, and have no value to hand back. Their return type is [[void]]. In a `void` function you may write a bare `return;` to leave early, or simply let execution reach the closing brace.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string_view>

bool isAlive(int health) {
    return health > 0;
}

void printStatus(std::string_view name, int health) {
    if (!isAlive(health)) {
        std::cout << name << " is down!\\n";
        return;
    }
    std::cout << name << ": " << health << " HP\\n";
}

int main() {
    printStatus("Knight", 75);
    printStatus("Archer", 0);
}`,
          output: 'Knight: 75 HP\nArcher is down!',
          annotations: [
            { lines: '4-6', text: 'A one-line function is still worth writing: `isAlive(health)` names the rule, and if "alive" ever changes (say, a revive timer), there is one place to update.' },
            { lines: 5, text: 'The value of `health > 0` is converted to the return type (`bool`) and handed back.' },
            { lines: 8, text: '`void` means "returns nothing". Its parameters are a [[string-view]] (cheap, read-only text) and an `int`.' },
            { lines: 11, text: 'A guard clause: handle the special case and leave. Line 13 never runs for a downed character.' },
            { lines: 18, text: 'Calling a `void` function is a statement on its own; there is no value to store.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Every path of a non-void function must return',
          text: 'If a function declared to return a value can reach its closing brace without hitting `return`, that is [[undefined-behavior|undefined behavior]] the moment it happens: the caller reads a "value" that was never produced. `main` is the only exception (it implicitly returns `0`). GCC and Clang warn with *control reaches end of non-void function*; treat that warning as an error.',
        },
        {
          type: 'p',
          text: 'You are allowed to ignore a return value: `applyDamage(30, 12);` on its own compiles and simply throws the result away. Sometimes that is a bug, because the caller expected the function to change something. For functions whose result must not be ignored, C++17 added the `nodiscard` [[attribute|attribute]]:',
        },
        {
          type: 'code',
          code: `[[nodiscard]] int applyDamage(int health, int damage);

applyDamage(30, 12);   // warning: ignoring return value`,
          annotations: [
            { lines: 1, text: 'The attribute goes before the return type. Callers that discard the result now get a compiler warning.' },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does the C++ standard say happens when `clampHealth(50)` is called?',
      code: `int clampHealth(int hp) {
    if (hp > 100) {
        return 100;
    } else if (hp < 0) {
        return 0;
    }
}`,
      options: [
        { text: 'It returns `50`, because the value passes through unchanged', why: 'Nothing in the code returns `hp`. The author probably intended a final `return hp;`, but the compiler will not add it for you.' },
        { text: 'It returns `0`, the default value for `int`', why: 'There is no default return value. That rule exists only for `main`.' },
        { text: 'It fails to compile', why: 'It compiles (with a warning). Proving that every path returns is not always possible in general, so the language makes it a run-time problem, not a compile error.' },
        { text: 'The behavior is undefined: control flows off the end of a non-void function', correct: true, why: 'Exactly. For `50`, neither branch runs, so execution reaches the closing brace without a `return`. Anything may happen, including garbage values or crashes in optimized builds.' },
      ],
      explanation:
        'Reaching the end of a value-returning function (other than `main`) is undefined behavior. In practice you might see a leftover register value, or an optimizer may assume that path is impossible and generate surprising code. The fix is one line: `return hp;` after the `if` chain. Compile with warnings on and you will be told about it.',
    },
    {
      kind: 'bug',
      prompt: 'The player should end with 150 gold, but the program prints 100. Tap the line with the bug.',
      code: `#include <iostream>

int addBonus(int score, int bonus) {
    return score + bonus;
}

int main() {
    int score = 100;
    addBonus(score, 50);
    std::cout << score << '\\n';
}`,
      bugLines: [9],
      hint: 'Where does the result of `addBonus` go?',
      explanation:
        'Line 9 calls `addBonus` and then throws the returned value away. The function never touched the caller\'s `score` (its parameter is a copy), so `score` stays 100. The fix is `score = addBonus(score, 50);`. Marking the function with the `nodiscard` attribute would have made the compiler warn about this exact mistake.',
    },
    {
      kind: 'concept',
      title: 'The call stack and stack frames',
      blocks: [
        {
          type: 'p',
          text: 'How does the program remember where to come back to after a function returns, and where do each call\'s parameters and locals live? The answer is the [[call-stack|call stack]]: a region of memory that grows by one [[stack-frame|stack frame]] every time a function is called and shrinks by one every time a function returns.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

int calculateDamage(int base, int multiplier) {
    int result = base * multiplier;
    return result;
}

int main() {
    int sword = 20;
    int hit = calculateDamage(sword, 3);
    std::cout << "Hit for " << hit << '\\n';
}`,
          output: 'Hit for 60',
          annotations: [
            { lines: 10, text: 'The call: the arguments are evaluated, a new frame is pushed on top of `main`\'s frame, and execution jumps into `calculateDamage`.' },
            { lines: 5, text: 'The diagram below shows memory at this moment: two frames, with `calculateDamage` on top.' },
            { lines: 11, text: 'By now the `calculateDamage` frame has been popped. `base`, `multiplier` and `result` no longer exist; only the returned `60` survived, stored in `hit`.' },
          ],
        },
        {
          type: 'memory',
          caption: 'The stack while line 5 runs. The newest frame is on top.',
          regions: [
            {
              label: 'Stack — calculateDamage() (top)',
              kind: 'stack',
              cells: [
                { name: 'base', type: 'int', value: '20', address: '0x7ffc…a0' },
                { name: 'multiplier', type: 'int', value: '3', address: '0x7ffc…a4' },
                { name: 'result', type: 'int', value: '60', address: '0x7ffc…a8', highlight: true },
                { name: '(return address)', value: 'main, line 10' },
              ],
            },
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'sword', type: 'int', value: '20', address: '0x7ffc…c0' },
                { name: 'hit', type: 'int', value: '(not yet set)', address: '0x7ffc…c4' },
              ],
            },
          ],
        },
        {
          type: 'p',
          text: 'Each frame holds the call\'s parameters, its local variables and the **return address**: the spot in the caller where execution resumes. Notice that `base` and `sword` are different boxes at different addresses, which is exactly why changing a parameter never changes the caller\'s variable. When the function returns, its whole frame is discarded at once and every local in it is destroyed.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a stack?',
          text: 'Function calls nest perfectly: if `main` calls `a` and `a` calls `b`, then `b` must finish before `a` can, and `a` before `main`. Last in, first out is exactly a stack. It is also extremely fast: creating a frame is just moving one processor register (the stack pointer) by a fixed amount, and cleanup is moving it back. No searching for free memory, no bookkeeping. That is why local variables are so cheap in C++.',
        },
        {
          type: 'deepdive',
          title: 'What the machine actually does',
          blocks: [
            {
              type: 'p',
              text: 'On x86-64, the `call` instruction pushes the return address and jumps; `ret` pops it and jumps back. Arguments usually travel in registers rather than memory: the Linux/macOS convention (System V) passes the first six integer arguments in `rdi`, `rsi`, `rdx`, `rcx`, `r8`, `r9`, while Windows x64 uses `rcx`, `rdx`, `r8`, `r9`. Small return values come back in `rax`. These rules are called the **calling convention**.',
            },
            {
              type: 'p',
              text: 'With optimizations on, a tiny function like `calculateDamage` is usually *inlined*: the compiler pastes its body into `main` and no call happens at all. So never avoid writing small functions "for speed". The optimizer removes the overhead for you, and the readability benefit stays.',
            },
          ],
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Put the events of a function call in the order they happen.',
      lines: [
        'Evaluate the argument expressions',
        'Push a new stack frame and initialize the parameters from the arguments',
        'Run the function body until a `return` (or the closing brace of a `void` function)',
        'Produce the return value, then destroy the locals and pop the frame',
        'Resume the caller right after the call expression',
      ],
      linesAreCode: false,
      explanation:
        'Arguments must be known before parameters can be initialized from them. The body then runs in its new frame. The return value is produced *before* the locals are destroyed (it may be computed from them), and only after the frame is popped does the caller continue, using the returned value.',
    },
    {
      kind: 'mcq',
      prompt: '`main` calls `runTurn()`, which calls `moveEnemy()`, which calls `findPath()`. While `findPath()` is running, which statement is true?',
      options: [
        { text: 'There are four frames on the stack and `findPath`\'s is on top; it will be the first one popped', correct: true, why: 'Every active call has its own frame. The most recent call is on top and must finish first: last in, first out.' },
        { text: 'Only `findPath`\'s frame exists; the callers\' frames were discarded when they made their calls', why: 'Callers are only *paused*. Their frames, with their local variables, wait underneath until the call returns.' },
        { text: 'There are four frames and `main`\'s is on top, because it was called first', why: 'The first call ends up at the bottom of the stack, not the top. New frames are always pushed on top.' },
        { text: 'All four functions share one frame to save memory', why: 'Each call gets its own frame so that each has its own parameters, locals and return address. Sharing would let calls overwrite each other\'s variables.' },
      ],
      explanation:
        'The call stack mirrors the chain of active calls: `main` at the bottom, then `runTurn`, `moveEnemy`, and `findPath` on top. When `findPath` returns, its frame is popped and `moveEnemy` resumes exactly where it left off. A debugger\'s *call stack* window shows you exactly this list, which makes it one of the most useful tools for understanding a crash.',
    },
    {
      kind: 'concept',
      title: 'Declare before use',
      blocks: [
        {
          type: 'p',
          text: 'The [[compiler|compiler]] reads your file from top to bottom, once. When it reaches a call, it must already know the function\'s name, parameter types and return type, so it can check the arguments and generate the right code. If the function is defined further down the file, the compiler has not seen it yet and stops with an error.',
        },
        {
          type: 'compare',
          left: {
            title: 'Error: used before declared',
            tone: 'bad',
            code: `int main() {
    heal(25);   // error: 'heal' was not
                // declared in this scope
}

void heal(int amount) {
    // ...
}`,
            text: 'At the call, the compiler has never heard of `heal`.',
          },
          right: {
            title: 'Fixed with a declaration',
            tone: 'good',
            code: `void heal(int amount);  // declaration

int main() {
    heal(25);   // OK: the compiler knows it
}

void heal(int amount) {
    // ...
}`,
            text: 'A one-line **declaration** (also called a *prototype*) promises the function exists. The full definition can come later.',
          },
        },
        {
          type: 'p',
          text: 'You have two fixes: define functions above the code that calls them, or put a [[function-prototype|function prototype]] near the top. A prototype is just the header followed by a semicolon. It tells the compiler everything it needs to check a call; the [[linker|linker]] later connects the call to the actual body. This idea, a [[declaration|declaration]] separate from a [[definition|definition]], is the foundation of header files, and has a whole lesson of its own later in this unit.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does C++ need this when other languages don\'t?',
          text: 'C++ inherited a one-pass compilation model from C, designed when computers could not hold a whole program in memory. Each file is compiled on its own, top to bottom, without peeking ahead or at other files. Languages like C# or Java scan everything first. The C++ model is stricter, but it is also what allows each file to be compiled independently and in parallel, which matters a lot for large projects.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the program: declare `isCritical` before `main` uses it, and make the definition hand back its result.',
      template: `#include <iostream>

___ isCritical(int roll);

int main() {
    if (isCritical(19)) {
        std::cout << "Critical hit!\\n";
    }
}

bool isCritical(int roll) {
    ___ roll >= 18;
}`,
      blanks: [{ answers: ['bool'] }, { answers: ['return'] }],
      wordBank: ['bool', 'return', 'void', 'int', 'auto', 'yield'],
      explanation:
        'The declaration must match the definition, so its return type is `bool`. (A `void` declaration could not be used in an `if`; an `auto` declaration cannot be called before the compiler has seen the body it deduces from.) In the body, `return` hands the result of `roll >= 18` back to the caller. Without it, control would flow off the end of a non-void function.',
    },
    {
      kind: 'concept',
      title: 'Return by value, and designing good functions',
      blocks: [
        {
          type: 'p',
          text: 'When a function returns, the value it hands back is a new object initialized from the `return` expression; the caller gets its own independent value, just as parameters get copies. This is **return by value**, and it is the normal way to get results out of a function, even for bigger objects like strings.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <string_view>

std::string makeTitle(std::string_view name, int level) {
    std::string title{name};
    title += " (Lv ";
    title += std::to_string(level);
    title += ')';
    return title;
}

int main() {
    std::string boss = makeTitle("Lich King", 60);
    std::cout << boss << '\\n';
}`,
          output: 'Lich King (Lv 60)',
          annotations: [
            { lines: 5, text: 'The return type is `std::string`: the caller receives a whole string object, not a link to the local one.' },
            { lines: 6, text: '`title` is a local variable built inside this frame.' },
            { lines: 8, text: '`std::to_string` turns a number into text so it can be appended.' },
            { lines: 10, text: 'Returning a local by value is safe: the caller gets a value of its own, and `title` itself is destroyed when the frame is popped.' },
            { lines: 14, text: 'With modern compilers `title` is typically built directly in `boss`\'s memory, so no copy is made at all.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Returning big objects is cheap',
          text: 'Beginners often fear that returning a string copies every character. In practice compilers apply [[copy-elision|copy elision]]: the returned object is constructed directly where the caller wants it. Since C++17 this is *guaranteed* when you return a temporary (`return std::string{...};`), and compilers routinely do it for named locals too (*named return value optimization*). When elision does not happen, the string is *moved* (its buffer handed over) rather than copied. Return by value is the clear, fast default.',
        },
        {
          type: 'heading',
          text: 'What makes a good function?',
        },
        {
          type: 'list',
          items: [
            '**Does one thing.** If you need "and" to describe it (`loadLevelAndSpawnEnemies`), it probably wants to be two functions.',
            '**Is short enough to read in one go.** A screenful is a good upper bound.',
            '**Takes few parameters.** More than four or five is a hint that some of them belong together in a type of their own (coming in the classes unit).',
            '**Communicates through parameters and return values**, not hidden shared variables. Then each call can be understood on its own.',
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Return by value in Unreal',
          text: 'Unreal\'s API returns plenty of objects by value: `GetActorLocation()` returns an `FVector`, and `GetName()` returns an `FString`. You can store the result in a local and use it freely; it is your own copy and cannot be changed behind your back.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Returning a `std::string` local variable by value always copies every character of the string, so it should be avoided for long strings.',
      answer: false,
      explanation:
        'Compilers construct the returned object directly in the caller\'s variable (copy elision, guaranteed since C++17 for temporaries and almost always applied to named locals). Even when that is not possible, the string is *moved*, which just hands over its internal buffer. Return by value is idiomatic modern C++.',
    },
  ],
  takeaways: [
    'Functions give you reuse, abstraction and named intent: write a rule once, call it everywhere.',
    'A definition has a return type, a name, a parameter list and a body. Parameters are the slots; arguments are the values passed at the call.',
    'Arguments are matched by position and, by default, each parameter is a copy of its argument.',
    '`return` produces the result and ends the function. Flowing off the end of a non-void function (other than `main`) is undefined behavior.',
    'Each call pushes a stack frame holding parameters, locals and a return address; returning pops it and destroys the locals.',
    'The compiler reads top to bottom, so a function must be declared (or defined) before it is called.',
    'Return results by value: copy elision and moves make it cheap even for strings.',
  ],
  reading: [
    {
      title: 'Function declaration',
      url: 'https://en.cppreference.com/w/cpp/language/function',
      source: 'cppreference',
      note: 'The precise grammar of declaring and defining functions, including parameter lists and return types.',
    },
    {
      title: 'The return statement',
      url: 'https://en.cppreference.com/w/cpp/language/return',
      source: 'cppreference',
      note: 'What `return` does, including the rules about copy elision and flowing off the end of a function.',
    },
    {
      title: 'Introduction to functions',
      url: 'https://www.learncpp.com/cpp-tutorial/introduction-to-functions/',
      source: 'learncpp',
      note: 'A gentle walkthrough with many small exercises if you want more practice.',
    },
    {
      title: 'C++ Core Guidelines: Functions',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-functions',
      source: 'core-guidelines',
      note: 'Expert rules for designing functions; F.2 and F.3 cover "one logical operation" and keeping functions short.',
    },
  ],
};
