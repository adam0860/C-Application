import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-scope-lifetime-recursion',
  title: 'Scope, Lifetime and Recursion',
  summary: 'Where names are visible, how long objects live, and what happens when a function calls itself.',
  minutes: 19,
  objectives: [
    'Explain block scope and predict the effect of shadowing',
    'Explain why mutable global variables cause problems, and how static locals differ',
    'Name the three main storage durations and the lifetime each one gives an object',
    'Write recursive functions with a correct base case and a step toward it',
    'Explain the exponential cost of naive recursive Fibonacci and how to avoid it',
    'Explain stack overflow and choose between recursion and iteration',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Scope: where a name is visible',
      blocks: [
        {
          type: 'p',
          text: 'Two ideas are easy to blur but worth keeping apart. [[scope]] is about **names**: the region of source code in which a name can be used. It is decided entirely at compile time. [[lifetime]] is about **objects**: the span of time, while the program runs, during which an object exists. This lesson covers both, starting with scope.',
        },
        {
          type: 'p',
          text: 'A variable declared inside a block `{ ... }` has **block scope**: it is visible from its declaration to the closing brace of that block, and not outside it. Function bodies, `if` and loop bodies are all blocks. A variable declared in a `for` statement\'s first part belongs to the loop alone.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

int main() {
    int gold = 100;
    if (gold >= 50) {
        int price = 50;
        gold -= price;
    }
    // price is not visible here
    for (int i = 0; i < 3; ++i) {
        gold += 10;
    }
    // neither is i
    std::cout << "Gold: " << gold << '\\n';
}`,
          output: 'Gold: 80',
          annotations: [
            { lines: 4, text: '`gold` is visible from here to the end of `main` (line 15), including inside the nested blocks.' },
            { lines: 6, text: '`price` exists only inside the `if` block. Using it on line 9 would be a compile error: *price was not declared in this scope*.' },
            { lines: 10, text: '`i` is scoped to the loop: created once before the first iteration, gone after the last.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why keep scopes small?',
          text: 'Every line that can see a variable is a line that might change it. A variable visible in three lines is easy to reason about; one visible in three hundred is not. Small scopes also free names for reuse and let the compiler reuse the same register or stack slot for variables whose lifetimes do not overlap. The rule of thumb: declare each variable as late as possible, as close as possible to where it is used, and in the innermost block that needs it.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Shadowing',
      blocks: [
        {
          type: 'p',
          text: 'Blocks can nest, and an inner block may declare a name that already exists outside. The inner declaration then hides the outer one for the rest of the inner block. This is [[shadowing|shadowing]]. It is legal, and it is a classic source of bugs, because code that looks like it updates the outer variable quietly updates a different one.',
        },
        {
          type: 'code',
          code: `int health = 100;
if (tookHit) {
    int health = 50;     // a NEW variable shadowing the outer one
    health -= 10;        // changes the inner health (now 40)
}
std::cout << health;     // prints 100`,
          annotations: [
            { lines: 3, text: 'The author probably meant `health = 50;` (an assignment). Adding the type `int` turns it into a declaration of a brand-new variable.' },
            { lines: 5, text: 'The inner `health` is destroyed here, taking the change with it.' },
            { lines: 6, text: 'The outer variable was never touched.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Your warnings will not catch this by default',
          text: 'GCC and Clang only warn about shadowing with `-Wshadow`, which is **not** included in `-Wall -Wextra`. Consider adding it to your builds. A parameter can also shadow a global, and a shadowed global can still be reached as `::name` using the [[scope-resolution-operator|scope resolution operator]], but if you need that, renaming is the better fix.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Shadowing in Unreal',
          text: 'Unreal\'s build tool enables shadow-variable diagnostics (controlled by `ShadowVariableWarningLevel` in your target rules), and many projects treat them as errors. A local named `Health` inside a member function of a class that also has a `Health` member is exactly the kind of code that compiles in a toy project and fails in a real Unreal build.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>

int main() {
    int score = 10;
    {
        int score = 20;
        score += 5;
    }
    score += 1;
    std::cout << score << '\\n';
}`,
      options: [
        { text: '26', why: 'That would mean lines 6–7 changed the outer `score`. Line 6 declares a new variable instead, so they did not.' },
        { text: '11', correct: true, why: 'The inner `score` (20, then 25) shadows the outer one and is destroyed at line 8. The outer `score` goes from 10 to 11.' },
        { text: '25', why: '25 is the inner variable\'s final value, but it is destroyed at the closing brace before line 9 runs.' },
        { text: 'It does not compile: `score` is declared twice', why: 'Redeclaring a name in the **same** block is an error, but a nested block may legally shadow an outer name.' },
      ],
      explanation:
        'A bare pair of braces creates a new block scope. `int score = 20;` inside it declares a second, independent variable that hides the outer one until the closing brace. Once the block ends, the name `score` refers to the outer variable again, which only ever received the `+= 1`.',
    },
    {
      kind: 'concept',
      title: 'Global variables, and why to avoid them',
      blocks: [
        {
          type: 'p',
          text: 'A [[global-variable|global variable]] is declared outside every function. Its scope is the rest of the file (or the whole program, via an `extern` declaration in a header), and it lives for the entire run of the program. Globals are tempting, because every function can reach them with no parameters to pass. That is exactly the problem.',
        },
        {
          type: 'compare',
          left: {
            title: 'Hidden shared state',
            tone: 'bad',
            code: `int gPlayerHealth = 100;

void applyPoison() {
    gPlayerHealth -= 5;
}

void drinkPotion() {
    gPlayerHealth += 30;
}`,
            text: 'Neither signature reveals that the function reads or writes health. When health is wrong, *any* function in the program could be the culprit.',
          },
          right: {
            title: 'Explicit data flow',
            tone: 'good',
            code: `void applyPoison(int& health) {
    health -= 5;
}

void drinkPotion(int& health) {
    health += 30;
}`,
            text: 'Each function states what it touches. You can test it with any value, and run it on two players at once.',
          },
        },
        {
          type: 'list',
          items: [
            '**Hidden coupling.** A function\'s behaviour depends on inputs that do not appear in its signature.',
            '**Hard debugging.** Any line anywhere can change the value, so you cannot narrow down who did.',
            '**One of everything.** A global `gPlayerHealth` assumes there will only ever be one player. Split-screen co-op just broke.',
            '**Threads.** Two threads touching the same global without care is a [[data-race|data race]], which is undefined behavior (covered in the concurrency unit).',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Constants are the exception',
          text: 'The trouble with globals comes from *mutation*. A global `constexpr int kMaxPartySize = 4;` can never change, so there is nothing hidden to track, and it is perfectly fine. The [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Ri-global) put it as "avoid non-const global variables".',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Where Unreal keeps "global" state',
          text: 'Unreal projects almost never use raw global variables for game state. State that must outlive a level lives in the [[game-instance]] or a [[subsystem|subsystem]]; per-match state lives in the GameState; per-player state in the PlayerState. Each has a clear owner and lifetime, which is precisely what a raw global lacks.',
        },
        {
          type: 'deepdive',
          title: 'The static initialization order fiasco',
          blocks: [
            {
              type: 'p',
              text: 'Globals in one `.cpp` file are initialized in the order they are defined, but the order *between* files is unspecified. If a global in `a.cpp` is initialized using a global from `b.cpp`, it may read it before it has been initialized. This bug has a famous name, and it is another reason to avoid globals with non-trivial initialization. A common fix is to wrap the object in a function with a static local, which the next card explains.',
            },
          ],
        },
      ],
    },
    {
      kind: 'concept',
      title: 'static local variables',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes a function genuinely needs to remember something between calls, like a counter for handing out unique IDs. A [[static-local|static local variable]] gives you that without a global. Adding `static` to a local variable changes its **lifetime** but not its **scope**: it is initialized once, keeps its value between calls, and lives until the program ends, yet only that function can see it.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

int nextEnemyId() {
    static int lastId = 0;
    ++lastId;
    return lastId;
}

int main() {
    std::cout << "Spawned enemy #" << nextEnemyId() << '\\n';
    std::cout << "Spawned enemy #" << nextEnemyId() << '\\n';
    std::cout << "Spawned enemy #" << nextEnemyId() << '\\n';
}`,
          output: 'Spawned enemy #1\nSpawned enemy #2\nSpawned enemy #3',
          annotations: [
            { lines: 4, text: 'Initialized only the **first** time control reaches this line. On later calls the declaration is skipped and `lastId` keeps its previous value.' },
            { lines: 5, text: 'Without `static`, `lastId` would be a fresh 0 on every call and every enemy would get ID 1.' },
            { lines: 10, text: 'No code outside `nextEnemyId` can touch the counter, which is the advantage over a global.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Thread-safe initialization',
          text: 'Since C++11, the one-time initialization of a static local is guaranteed to be thread-safe: if two threads call the function at once, one initializes and the other waits. (Later modifications like `++lastId` are *not* automatically safe; that needs the tools from the concurrency unit.)',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Hidden state is still state',
          text: 'A function with a static local gives different results for the same arguments, depending on its history. That makes it harder to test and to reason about, just like a global, only better contained. Use static locals for genuinely program-wide things (ID counters, one-time setup, caches), not as a shortcut around passing parameters.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the function so that it returns 1 on the first call, 2 on the second, and so on.',
      template: `int nextLootId() {
    ___ int id = 0;
    return ___;
}`,
      blanks: [{ answers: ['static'] }, { answers: ['++id'] }],
      wordBank: ['static', '++id', 'id++', 'const', 'extern', 'id + 1'],
      explanation:
        '`static` makes `id` survive between calls and be initialized to 0 only once. `++id` increments first and returns the new value, so the first call returns 1. `id++` would return the old value (0 on the first call), `id + 1` never changes `id` at all, and a `const` variable could not be incremented.',
    },
    {
      kind: 'concept',
      title: 'Storage durations: automatic, static, dynamic',
      blocks: [
        {
          type: 'p',
          text: 'Every object has a [[storage-duration|storage duration]], which determines its lifetime. C++ has four; three matter right now (the fourth, *thread* storage, gives each thread its own copy and comes with concurrency).',
        },
        {
          type: 'table',
          headers: ['Storage duration', 'Who has it', 'Created', 'Destroyed', 'Typically lives in'],
          rows: [
            ['**Automatic**', 'Local variables, parameters', 'When execution reaches the declaration', 'At the end of the enclosing block', 'The [[stack-memory|stack]]'],
            ['**Static**', 'Globals, static locals', 'Before `main` (globals) or on first use (static locals)', 'After `main` returns', 'A fixed data area in the executable'],
            ['**Dynamic**', 'Objects you request at run time', 'When explicitly requested', 'When explicitly released', 'The [[heap-memory|heap]]'],
          ],
        },
        {
          type: 'memory',
          caption: 'One snapshot of a running game: three regions with three lifetimes.',
          regions: [
            {
              label: 'Static data (lives for the whole program)',
              kind: 'static',
              cells: [
                { name: 'kMaxPartySize', type: 'const int', value: '4' },
                { name: 'nextEnemyId()::lastId', type: 'int', value: '3' },
              ],
            },
            {
              label: 'Stack — main() (automatic: dies at end of block)',
              kind: 'stack',
              cells: [
                { name: 'round', type: 'int', value: '7' },
                { name: 'questText', type: 'std::string', value: '{ data, size: 52 }', pointsTo: 'chars' },
              ],
            },
            {
              label: 'Heap (dynamic: lives until released)',
              kind: 'heap',
              cells: [{ id: 'chars', value: '"Find the lost amulet in the..."', type: 'char[53]' }],
            },
          ],
        },
        {
          type: 'p',
          text: 'Notice the string: the `std::string` object itself is an automatic variable on the stack, but its characters live in a dynamically allocated heap block. The string manages that block for you, freeing it when the string is destroyed. Managing dynamic memory, directly and through helpers like this, is the subject of the pointers and modern-memory units.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have different lifetimes?',
          text: 'Automatic storage is the fastest and safest (cleanup is automatic and free), but it cannot outlive the block that created it. Static storage outlives everything but is fixed in size and shared. Dynamic storage is flexible in both size and lifetime, at the cost of an allocation and of someone being responsible for releasing it. Picking the right one is a constant design decision in C++, and in Unreal, which adds garbage collection for its own objects on top.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which statement about `static int counter = 0;` declared **inside** a function is correct?',
      options: [
        { text: 'Its scope is the function body, but its lifetime is the whole program', correct: true, why: '`static` on a local changes how long the object lives, not where its name can be used.' },
        { text: 'It is visible to every function in the file, like a global', why: 'Its name is still block-scoped: only code inside that function can refer to it.' },
        { text: 'It is re-created and reset to 0 each time the function is called', why: 'That describes an ordinary automatic local. A static local is initialized only once, the first time its declaration is reached.' },
        { text: 'It is stored on the heap because it outlives the function call', why: 'Static objects live in a fixed data area set up when the program loads, not on the heap, and they need no allocation at run time.' },
      ],
      explanation:
        'Scope and lifetime are independent. A static local combines *narrow scope* (only its function can name it) with *static storage duration* (one object for the entire run). That combination is what makes it a well-contained alternative to a global.',
    },
    {
      kind: 'concept',
      title: 'Recursion: a function that calls itself',
      blocks: [
        {
          type: 'p',
          text: '[[recursion]] means a function calls itself to solve a smaller version of the same problem. Every correct recursive function has two parts: a **base case** that answers directly without recursing, and a **recursive case** that moves strictly closer to the base case. The classic example is factorial: 5! = 5 × 4!, and 1! = 1.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>

std::uint64_t factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    std::cout << factorial(5) << '\\n';
    std::cout << factorial(20) << '\\n';
}`,
          output: '120\n2432902008176640000',
          annotations: [
            { lines: 4, text: '`std::uint64_t` (from `<cstdint>`) is a 64-bit unsigned integer. Factorials explode: 13! already overflows a 32-bit `int`, and 20! is the largest that fits in 64 bits.' },
            { lines: '5-7', text: 'The **base case**. Without it the function would call itself forever.' },
            { lines: 8, text: 'The **recursive case**: solve the smaller problem `factorial(n - 1)`, then combine. `n - 1` moves toward the base case on every call.' },
          ],
        },
        {
          type: 'p',
          text: 'Each recursive call is an ordinary function call, so it gets its own [[stack-frame|stack frame]] with its own `n`. While `factorial(1)` runs, five frames are stacked up, each paused partway through line 8, waiting for the answer from the call above it:',
        },
        {
          type: 'memory',
          caption: 'The stack at the deepest point of factorial(5).',
          regions: [
            { label: 'factorial(1) (top: base case, returns 1)', kind: 'stack', cells: [{ name: 'n', type: 'int', value: '1', highlight: true }] },
            { label: 'factorial(2): waiting to compute 2 × ?', kind: 'stack', cells: [{ name: 'n', type: 'int', value: '2' }] },
            { label: 'factorial(3): waiting to compute 3 × ?', kind: 'stack', cells: [{ name: 'n', type: 'int', value: '3' }] },
            { label: 'factorial(4): waiting to compute 4 × ?', kind: 'stack', cells: [{ name: 'n', type: 'int', value: '4' }] },
            { label: 'factorial(5): waiting to compute 5 × ?', kind: 'stack', cells: [{ name: 'n', type: 'int', value: '5' }] },
          ],
        },
        {
          type: 'p',
          text: 'Then the stack unwinds: `factorial(1)` returns 1, so `factorial(2)` returns 2 × 1 = 2, then 3 × 2 = 6, 4 × 6 = 24, and finally 5 × 24 = 120 reaches `main`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why recursion is worth knowing',
          text: 'Factorial is easier as a loop, honestly. Recursion shines on problems that are *self-similar*: trees and hierarchies, where each node looks like a smaller tree. Scene graphs, folder structures, menus with submenus, flood-filling a region of a tile map, and divide-and-conquer algorithms such as quicksort are all naturally recursive, and the recursive code is often a fraction of the length of the iterative version.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Hierarchies in Unreal',
          text: 'In Unreal, components attach to other components, forming a tree under each actor\'s root component. Walking "this component and everything attached below it" is a natural recursive function, and the engine offers helpers such as `GetChildrenComponents(true, Children)` that do this walk for you.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: '`countdown(5)` is meant to print `5 3 1` and stop, but it crashes instead. Tap the line with the bug.',
      code: `#include <iostream>

void countdown(int n) {
    if (n == 0) {
        return;
    }
    std::cout << n << ' ';
    countdown(n - 2);
}

int main() {
    countdown(5);
}`,
      bugLines: [4, 8],
      hint: 'Write out the values of `n` on each call. Does any of them hit the base case?',
      explanation:
        'Starting at 5 and stepping by 2 gives 5, 3, 1, -1, -3, … and never exactly 0, so the base case on line 4 never fires. The recursion continues until the stack runs out and the program crashes with a stack overflow. Make the base case cover every stopping value, `if (n <= 0)`, and the output is exactly `5 3 1`. A base case must be *reachable* from every starting input, so compare with `<=` or `>=` rather than `==` whenever the step can jump over the target.',
    },
    {
      kind: 'concept',
      title: 'Fibonacci and the exponential trap',
      blocks: [
        {
          type: 'p',
          text: 'The Fibonacci sequence (0, 1, 1, 2, 3, 5, 8, …) has a famously elegant recursive definition: each number is the sum of the two before it. Translated directly into C++, it is short, correct and, for larger inputs, catastrophically slow. Here the call count is tracked through a reference parameter:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

long long fib(int n, long long& calls) {
    ++calls;
    if (n < 2) {
        return n;
    }
    return fib(n - 1, calls) + fib(n - 2, calls);
}

int main() {
    for (int n : {20, 30}) {
        long long calls = 0;
        long long result = fib(n, calls);
        std::cout << "fib(" << n << ") = " << result
                  << " using " << calls << " calls\\n";
    }
}`,
          output: 'fib(20) = 6765 using 21891 calls\nfib(30) = 832040 using 2692537 calls',
          annotations: [
            { lines: 3, text: '`calls` is passed by reference so every recursive call increments the same counter in `main`.' },
            { lines: '5-7', text: 'Two base cases: `fib(0) = 0` and `fib(1) = 1`.' },
            { lines: 8, text: 'Two recursive calls per call. This is where the cost explodes: `fib(n - 1)` itself calls `fib(n - 2)` again, so the same values are recomputed over and over.' },
          ],
        },
        {
          type: 'p',
          text: 'Draw the call tree for `fib(5)` and you will find `fib(2)` computed three times and `fib(1)` five times. Each extra step of `n` multiplies the work by about 1.6 (the golden ratio), so the cost grows *exponentially*: about φⁿ in [[big-o|Big-O]] terms. `fib(40)` needs 331,160,281 calls; `fib(50)` would need around 40 billion.',
        },
        {
          type: 'code',
          code: `long long fibIterative(int n) {
    long long a = 0;   // fib(i)
    long long b = 1;   // fib(i + 1)
    for (int i = 0; i < n; ++i) {
        long long next = a + b;
        a = b;
        b = next;
    }
    return a;
}`,
          annotations: [
            { lines: '2-3', text: 'Keep only the last two values; that is all the next one needs.' },
            { lines: '4-8', text: 'One addition per step: `n` steps in total, so O(n). `fibIterative(90)` finishes instantly; the naive version would take longer than the age of the universe.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Recursion is not the problem; repeated work is',
          text: 'The naive version is slow because it solves the same subproblems again and again, not because it is recursive. Keeping the recursion but storing each result the first time it is computed ([[memoization|memoization]]) also makes it linear. Whenever a recursive function makes more than one recursive call, ask whether those calls overlap.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Roughly how does the number of calls made by the naive recursive `fib(n)` change when `n` increases by 1?',
      options: [
        { text: 'It increases by one call', why: 'That would be linear growth, like the iterative version. Each naive call spawns two more calls.' },
        { text: 'It is multiplied by about 1.6', correct: true, why: 'The call count follows the Fibonacci numbers themselves, which grow by the golden ratio (≈1.618) per step: exponential growth.' },
        { text: 'It exactly doubles', why: 'Close in spirit, but the two branches are unequal (`n-1` and `n-2`), so the factor is about 1.6, not 2. Still exponential.' },
        { text: 'It stays the same, because results are cached automatically', why: 'C++ never caches function results for you. You would have to add memoization yourself.' },
      ],
      explanation:
        'From the program above: 21,891 calls for `fib(20)` and 2,692,537 for `fib(30)`, a factor of about 123 for ten steps, which is 1.618¹⁰. Exponential algorithms become unusable shockingly fast, which is why recognizing overlapping recursive calls matters.',
    },
    {
      kind: 'concept',
      title: 'Stack overflow, and recursion vs iteration',
      blocks: [
        {
          type: 'p',
          text: 'Every recursive call pushes a frame, and the stack is small. On Windows the default for a program\'s main thread is 1 MB; on Linux it is typically 8 MB; worker threads often get less. Recurse too deeply (or forever, with a missing base case) and you run off the end of the stack: a [[stack-overflow|stack overflow]].',
        },
        {
          type: 'code',
          code: `int depth(int n) {
    return depth(n + 1) + 1;   // no base case
}

// Linux:   Segmentation fault (core dumped)
// Windows: 0xC00000FD: Stack overflow`,
          lang: 'cpp',
          annotations: [
            { lines: 2, text: 'Each call adds a frame and none ever returns. GCC even warns about it (*infinite recursion detected*), and it would crash within a fraction of a second.' },
            { lines: '5-6', text: 'A stack overflow is not a C++ exception: you cannot catch it. The operating system simply kills the process.' },
          ],
        },
        {
          type: 'p',
          text: 'Even a *correct* recursive function can overflow when the input is large. A recursive flood fill over a 2048 × 2048 tile map might recurse millions of levels deep. Converting it to a loop that keeps its own to-do list (an explicit stack, which you will be able to build with the containers in the next unit) removes the limit.',
        },
        {
          type: 'table',
          headers: ['Aspect', 'Recursion', 'Iteration'],
          rows: [
            ['Clarity', 'Often clearest for trees and divide-and-conquer', 'Clearest for straight sequences and counting'],
            ['Memory', 'One stack frame per level of depth', 'Fixed, or a container you control'],
            ['Failure mode', 'Stack overflow on deep inputs: an uncatchable crash', 'None from depth; a container can grow on the heap'],
            ['Speed', 'Call overhead per level (often small)', 'Usually at least as fast'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Tail calls are not guaranteed',
          text: 'A *tail call* is a recursive call that is the very last thing a function does. Some languages guarantee such calls reuse the current frame. C++ does **not**: optimizers often perform this transformation in release builds, but debug builds generally do not. Code that only survives thanks to the optimizer will crash in your debug build, so never rely on it for deep recursion.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'A practical rule',
          text: 'Use recursion when the depth is naturally bounded and small (a scene hierarchy a few dozen levels deep, a balanced tree, a menu system), and iteration when the depth grows with the size of the input (lists, long paths, large grids). Game code runs on many threads with modest stacks, so engine programmers are deliberately cautious with deep recursion.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'C++ compilers are required to turn a tail-recursive function into a loop, so tail recursion can never overflow the stack.',
      answer: false,
      explanation:
        'The C++ standard makes no such guarantee. Optimizing compilers frequently eliminate tail calls in optimized builds, but unoptimized (debug) builds usually keep every frame. Code that depends on this optimization works in release and crashes in debug, a very confusing combination. Write an explicit loop when depth can be large.',
    },
    {
      kind: 'order',
      prompt: 'Put these events of evaluating `factorial(3)` in the order they happen.',
      lines: [
        '`factorial(3)` is called and calls `factorial(2)`',
        '`factorial(2)` calls `factorial(1)`',
        '`factorial(1)` hits the base case and returns 1',
        '`factorial(2)` computes 2 × 1 and returns 2',
        '`factorial(3)` computes 3 × 2 and returns 6',
      ],
      linesAreCode: false,
      explanation:
        'Recursion goes *down* first, pushing a frame per call until the base case is reached, and then the results flow back *up* as the frames are popped in reverse order. Each paused frame finishes its own multiplication only once the call above it has returned.',
    },
  ],
  takeaways: [
    'Scope is where a name is visible (compile time); lifetime is when an object exists (run time). Keep scopes as small as possible.',
    'An inner declaration with the same name shadows the outer one. It is legal but bug-prone, and `-Wshadow` is not part of `-Wall -Wextra`.',
    'Avoid mutable globals: they hide data flow, make bugs hard to trace and assume there is only one of everything. Global constants are fine.',
    'A static local is initialized once, keeps its value between calls and lives for the whole program, yet only its function can see it.',
    'Storage durations: automatic (locals, freed at block end), static (globals and static locals, whole program), dynamic (heap, until released).',
    'A recursive function needs a reachable base case and a step toward it; each call gets its own stack frame.',
    'Naive recursive Fibonacci is exponential because it recomputes subproblems; iteration or memoization makes it linear.',
    'Deep recursion overflows the stack with an uncatchable crash, and C++ does not guarantee tail-call elimination. Prefer iteration when depth grows with input size.',
  ],
  reading: [
    {
      title: 'Scope',
      url: 'https://en.cppreference.com/w/cpp/language/scope',
      source: 'cppreference',
      note: 'The formal kinds of scope (block, namespace, class) and how name hiding works.',
    },
    {
      title: 'Storage class specifiers',
      url: 'https://en.cppreference.com/w/cpp/language/storage_duration',
      source: 'cppreference',
      note: 'Storage durations and linkage in full, including thread storage and static local initialization.',
    },
    {
      title: 'Recursion',
      url: 'https://www.learncpp.com/cpp-tutorial/recursion/',
      source: 'learncpp',
      note: 'More recursive examples with traced call stacks, plus quiz exercises.',
    },
    {
      title: 'C++ Core Guidelines I.2: avoid non-const global variables',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Ri-global',
      source: 'core-guidelines',
      note: 'The reasoning behind avoiding mutable globals, with the exceptions that are acceptable.',
    },
  ],
};
