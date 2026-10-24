import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-loops',
  title: 'while, do-while and for Loops',
  summary: 'Repeating work with while, do-while and for: how each one runs, off-by-one and infinite-loop bugs, nested loops for grids and tile maps, and how to pick the right loop.',
  minutes: 17,
  objectives: [
    'Trace the execution of `while`, `do-while` and `for` loops step by step',
    'Choose `do-while` when a body must run at least once, such as an input prompt',
    'Read and write the three parts of a `for` loop header',
    'Avoid off-by-one errors by using half-open ranges `[0, n)`',
    'Recognise accidental infinite loops, including unsigned and floating-point counters',
    'Use nested loops to process grids, and estimate how many times the inner body runs',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'while: repeat as long as a condition holds',
      blocks: [
        {
          type: 'p',
          text: 'An `if` decides **whether** code runs. A [[loop]] decides **how many times** it runs. The simplest is `while`: it checks a condition, runs its body if the condition is true, and then goes back and checks again. It stops the first time the condition is false.',
        },
        {
          type: 'code',
          title: 'regen.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int hp = 40;
    int maxHp = 100;
    int seconds = 0;

    while (hp < maxHp) {
        hp += 25;
        ++seconds;
    }
    if (hp > maxHp) {
        hp = maxHp;
    }
    std::cout << "Healed after " << seconds << " s, HP "
              << hp << '\\n';
}`,
          output: 'Healed after 3 s, HP 100',
          annotations: [
            { lines: 8, text: 'Checked **before** every iteration, including the first. If `hp` already were 100, the body would run zero times.' },
            { lines: '9-10', text: 'The body must make progress toward ending the loop. Here `hp` grows: 40 → 65 → 90 → 115.' },
            { lines: '12-14', text: 'The last step overshoots to 115, so we clamp it. Overshooting the target is common with step sizes that do not divide evenly.' },
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'Check', text: 'Evaluate the condition. If it is false, skip the body and continue after the loop.' },
            { title: 'Run the body', text: 'Execute every statement in the block once.' },
            { title: 'Repeat', text: 'Jump back to the check. One pass through the body is called an **iteration**.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why loops are the heart of every game',
          text: 'A game is, at its core, one big loop: read input, update the world, draw a frame, repeat — 60 or more times per second. Inside each frame, more loops update every enemy, every particle, every projectile. Without loops you could only write programs whose length grows with the work they do; with them, ten lines can process ten million items.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'How many times does the loop body run?',
      code: `int n = 100;
int count = 0;
while (n > 1) {
    n /= 2;
    ++count;
}`,
      options: [
        { text: '`50`', why: 'The body halves `n` each time; it does not subtract 1 or 2. Halving reaches 1 very quickly.' },
        { text: '`7`', why: 'Count carefully: after the 6th iteration `n` is 1, and `1 > 1` is false, so there is no 7th.' },
        { text: '`6`', correct: true, why: '`n` goes 100 → 50 → 25 → 12 → 6 → 3 → 1 (integer division). That is 6 iterations, then the condition fails.' },
        { text: '`5`', why: 'After 5 iterations `n` is 3, which is still greater than 1, so the loop runs once more.' },
      ],
      explanation:
        'Trace a loop by writing down the variables at each check. Repeated halving takes about log₂(n) steps, which is why algorithms that halve their problem each round (such as binary search) stay fast even on huge inputs.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'do-while: run first, ask afterwards',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes the body must run **at least once** before the condition even makes sense. A menu has to be shown before you can check what the player chose. `do { … } while (condition);` runs the body first and checks the condition **after** each iteration.',
        },
        {
          type: 'code',
          title: 'menu.cpp',
          runnable: true,
          stdin: '7\n0\n2\n',
          code: `#include <iostream>

int main() {
    int choice = 0;
    do {
        std::cout << "1) New game  2) Load  3) Quit\\n> ";
        std::cin >> choice;
    } while (choice < 1 || choice > 3);

    std::cout << "You chose " << choice << '\\n';
}`,
          output: `1) New game  2) Load  3) Quit
> 1) New game  2) Load  3) Quit
> 1) New game  2) Load  3) Quit
> You chose 2`,
          annotations: [
            { lines: '5-7', text: 'The body always runs once: the menu is printed and a choice is read before anything is checked.' },
            { lines: 8, text: 'The condition comes after the body, and the statement ends with a **semicolon**. With the inputs 7, 0 and 2, the menu appears three times.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'With while: duplicated code',
            tone: 'neutral',
            code: `std::cout << "Choose 1-3: ";
std::cin >> choice;
while (choice < 1 || choice > 3) {
    std::cout << "Choose 1-3: ";
    std::cin >> choice;
}`,
            text: 'The prompt has to be written before the loop **and** inside it.',
          },
          right: {
            title: 'With do-while',
            tone: 'good',
            code: `do {
    std::cout << "Choose 1-3: ";
    std::cin >> choice;
} while (choice < 1 || choice > 3);`,
            text: 'The prompt appears once in the code, and runs at least once.',
          },
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Input loops and failed reads',
          text: 'If the player types `abc`, the read fails, `choice` becomes 0, and the stream enters the fail state from the previous unit. Every later `>>` then fails instantly, so this loop would print the menu forever. Robust versions check the stream too, for example `while (std::cin && (choice < 1 || choice > 3))`, or clear and ignore the bad input inside the loop.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'If its condition is false from the start, a `do-while` loop\'s body runs zero times.',
      answer: false,
      explanation:
        'A `do-while` checks its condition only **after** the body, so the body always runs at least once. Zero iterations is possible with `while` and `for`, which check first. That difference is the entire reason `do-while` exists.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'The for loop: counting made compact',
      blocks: [
        {
          type: 'p',
          text: 'Most loops follow the same pattern: set up a counter, test it, do the work, update the counter. The `for` loop gathers all three bookkeeping parts into its header, separated by semicolons: `for (init; condition; update) body`. Everything that controls the loop is visible on one line.',
        },
        {
          type: 'code',
          title: 'waves.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    for (int i = 3; i > 0; --i) {
        std::cout << i << "... ";
    }
    std::cout << "Go!\\n";

    for (int wave = 1; wave <= 4; ++wave) {
        int enemies = wave * 5;
        std::cout << "Wave " << wave << ": " << enemies
                  << " enemies\\n";
    }
}`,
          output: `3... 2... 1... Go!
Wave 1: 5 enemies
Wave 2: 10 enemies
Wave 3: 15 enemies
Wave 4: 20 enemies`,
          annotations: [
            { lines: 4, text: 'Counting down: start at 3, continue while `i > 0`, decrement after each iteration. The body runs for 3, 2 and 1.' },
            { lines: 9, text: '`wave` exists only inside this loop. Each loop can reuse common names without clashing. `++wave` (pre-increment) is the habit from the arithmetic lesson.' },
            { lines: 10, text: 'A variable declared in the body is created fresh on **every** iteration and destroyed at the end of it.' },
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'init — once', text: '`int wave = 1` runs a single time, before anything else.' },
            { title: 'condition — before each iteration', text: '`wave <= 4` is tested. False ends the loop immediately.' },
            { title: 'body', text: 'The statements in the block run.' },
            { title: 'update — after each iteration', text: '`++wave` runs, then control returns to the condition.' },
          ],
        },
        {
          type: 'p',
          text: 'Any part of the header may be empty. `for (; hp > 0;)` behaves exactly like `while (hp > 0)`, and `for (;;)` — with no condition at all — loops forever. The update can be any expression: `i += 2` counts in steps of two, and the comma operator handles two variables at once, as in `for (int lo = 0, hi = 9; lo < hi; ++lo, --hi)`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have for at all, if while can do the same?',
          text: 'Any `for` can be rewritten as a `while` with the init before it and the update at the end of the body. But spread out like that, the update is easy to forget (an infinite loop) and the counter leaks into the surrounding scope. Packing init, condition and update into one header makes counting loops harder to get wrong and easier to read at a glance.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'order',
      prompt: 'Order the steps a `for (init; condition; update)` loop performs, starting from the moment execution reaches it.',
      linesAreCode: false,
      lines: [
        'Run init once',
        'Test the condition; leave the loop if it is false',
        'Run the body',
        'Run the update expression',
        'Go back to testing the condition',
      ],
      distractors: ['Run init again before each iteration'],
      explanation:
        'Init happens exactly once. After that, the cycle is test → body → update → test. Because the test comes first, a `for` loop can run zero times, and because the update comes after the body, the body sees the counter\'s value **before** it is incremented.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Off-by-one errors and half-open ranges',
      blocks: [
        {
          type: 'p',
          text: 'The most common loop bug, the [[off-by-one-error|off-by-one error]], runs **one time too many or one too few**. A fence 10 metres long with a post every metre needs 11 posts, not 10 — the "fencepost problem". In code it shows up as `<=` where `<` was meant, a counter starting at 1 instead of 0, or a loop that stops one short of the last element.',
        },
        {
          type: 'table',
          headers: ['Loop header', 'Values of i', 'Iterations'],
          rows: [
            ['`for (int i = 0; i < n; ++i)`', '0, 1, …, n−1', '**n**'],
            ['`for (int i = 1; i <= n; ++i)`', '1, 2, …, n', 'n'],
            ['`for (int i = 0; i <= n; ++i)`', '0, 1, …, n', 'n + 1 ⚠'],
            ['`for (int i = 1; i < n; ++i)`', '1, 2, …, n−1', 'n − 1 ⚠'],
          ],
        },
        {
          type: 'p',
          text: 'The C++ convention is the first row: start at 0 and stop **before** `n`, written `i < n`. This is a [[half-open-range|half-open range]], `[0, n)`: it includes the start and excludes the end. Indexes in strings, arrays and every standard container run from 0 to `size() - 1`, so `i < size` visits each element exactly once.',
        },
        {
          type: 'code',
          title: 'health_bar.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int hp = 70;
    int filled = hp / 10;   // 10 segments, each worth 10 HP

    std::cout << '[';
    for (int i = 0; i < 10; ++i) {
        std::cout << (i < filled ? '#' : '-');
    }
    std::cout << "] " << hp << "%\\n";
}`,
          output: '[#######---] 70%',
          annotations: [
            { lines: 8, text: 'Exactly 10 iterations, for segments 0 to 9. Writing `i <= 10` would draw 11 segments.' },
            { lines: 9, text: 'Segments 0–6 (seven of them) are filled; `i < filled` uses the same half-open logic.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why half-open ranges win',
          text: 'With `[begin, end)` the number of elements is simply `end - begin`, an empty range is `begin == end` (no special case), and adjacent ranges join without overlap: `[0, 5)` and `[5, 10)` cover 0–9 exactly once. The computer scientist Edsger Dijkstra argued for this convention in a famous 1982 note, and the whole C++ standard library is built on it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'bug',
      prompt: 'This should draw a wall exactly 10 tiles wide, but it draws 11. Tap the faulty line.',
      code: `#include <iostream>

int main() {
    const int width = 10;
    for (int x = 0; x <= width; ++x) {
        std::cout << '#';
    }
    std::cout << '\\n';
}`,
      bugLines: [5],
      hint: 'List the values `x` takes. How many are there?',
      explanation:
        '`x` takes the values 0, 1, …, 10 — eleven values — because `<=` includes the end. Starting at 0, the condition should be `x < width`, which gives exactly `width` iterations. When a loop starts at 0, a `<=` in the condition deserves a second look.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'fill',
      prompt: 'Complete the header so the loop spawns exactly 10 enemies, numbered 0 to 9.',
      template: `for (int i = ___; i ___ 10; ___i) {
    spawnEnemy(i);
}`,
      blanks: [{ answers: ['0'] }, { answers: ['<'] }, { answers: ['++'] }],
      wordBank: ['0', '1', '<', '<=', '++', '--', '>'],
      explanation:
        'Start at 0, continue while `i < 10`, and increment: the canonical half-open loop, giving 0 through 9. Starting at 1 with `<` would spawn only 9; starting at 0 with `<=` would spawn 11; `--` would count away from 10 forever (well, until the `int` overflowed, which is undefined behavior).',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Infinite loops: accidental and deliberate',
      blocks: [
        {
          type: 'p',
          text: 'An [[infinite-loop]] never reaches a false condition. Accidental ones freeze your program (stop it with **Ctrl+C** in a terminal). They usually come from one of these mistakes:',
        },
        {
          type: 'code',
          code: `int i = 0;
while (i < 10) {
    std::cout << i;          // forgot ++i
}

for (unsigned u = 10; u >= 0; --u) { }   // u is never < 0

for (double x = 0.0; x != 1.0; x += 0.1) { }  // skips 1.0`,
          annotations: [
            { lines: '2-4', text: 'Nothing in the body changes `i`, so the condition never changes either.' },
            { lines: 6, text: 'An `unsigned` value is never negative: decrementing 0 wraps around to about 4 billion, so `u >= 0` is always true. GCC warns with `-Wextra`: *comparison of unsigned expression in \'>= 0\' is always true*.' },
            { lines: 8, text: 'Ten additions of 0.1 give 0.9999999999999999, not 1.0, so `!=` never becomes false. Use an integer counter, or `<` instead of `!=`.' },
          ],
        },
        {
          type: 'p',
          text: 'Deliberate infinite loops are common too. Servers, menus and game loops run "forever" and exit from inside the body (with `break` or `return`, covered next lesson). They are written `while (true)` or `for (;;)`.',
        },
        {
          type: 'code',
          code: `bool running = true;
while (running) {
    processInput();       // may set running = false on Quit
    updateWorld(deltaTime);
    renderFrame();
}`,
          annotations: [
            { lines: '1-6', text: 'The classic game-loop shape. In Unreal you never write this yourself: the engine owns the loop and calls your code each frame through `Tick`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Loops must make progress',
          text: 'C++ lets the compiler assume that a loop eventually terminates or does something observable (input/output, a `volatile` access, synchronisation). A loop that does nothing observable forever is undefined behavior, and optimizers have been known to delete such loops entirely. C++26 carves out an exception for trivially empty loops like `while (true) {}`, but the safe rule is: every loop should change something that eventually ends it, or do real work.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Long loops freeze the frame',
          text: 'Everything your gameplay code does in one frame happens on the game thread before the frame can be drawn. A loop that takes 50 ms drops the game from 60 to under 20 frames per second, and an infinite loop freezes the editor. Spread heavy work over several frames (with timers or `Tick`) and keep per-frame loops small. Blueprints even abort loops that exceed a maximum iteration count with an "infinite loop detected" error.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: 'Which of these loops **never** terminates?',
      codeOptions: true,
      options: [
        { text: 'for (int i = 10; i >= 0; --i) { }', why: 'A signed `int` does become negative: after `i == 0` the decrement gives -1 and the loop stops after 11 iterations.' },
        { text: 'for (unsigned i = 10; i >= 0; --i) { }', correct: true, why: 'An unsigned value can never be below 0. Decrementing 0 wraps to the maximum value, so `i >= 0` is always true.' },
        { text: 'int n = 5; while (n > 0) { n -= 2; }', why: '`n` goes 5 → 3 → 1 → -1, and `-1 > 0` is false. It never equals 0, but the condition uses `>`, so it still stops.' },
        { text: 'for (int i = 0; i < 10; i += 3) { }', why: '`i` takes 0, 3, 6, 9, then 12, which fails `i < 10`. Skipping past 10 is fine with `<`.' },
      ],
      explanation:
        'Count-down loops with unsigned counters are a classic trap, and they are easy to write by accident because container sizes are unsigned. Notice also why the third option terminates: `>` (or `<`) tolerates stepping past the boundary, whereas `!=` would not. Prefer `<`/`>` over `!=` in loop conditions when the step might skip the exact end value.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Nested loops: grids and tile maps',
      blocks: [
        {
          type: 'p',
          text: 'A loop body can contain another loop. For each single iteration of the **outer** loop, the **inner** loop runs all of its iterations. This is exactly what two-dimensional data needs: a tile map, an inventory grid, a chess board. The outer loop walks the rows; the inner loop walks across one row.',
        },
        {
          type: 'code',
          title: 'tilemap.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    const int width = 8;
    const int height = 5;
    const int playerX = 2;
    const int playerY = 3;

    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            bool border = y == 0 || y == height - 1 ||
                          x == 0 || x == width - 1;
            if (x == playerX && y == playerY) {
                std::cout << '@';
            } else if (border) {
                std::cout << '#';
            } else {
                std::cout << '.';
            }
        }
        std::cout << '\\n';
    }
}`,
          output: `########
#......#
#......#
#.@....#
########`,
          annotations: [
            { lines: 9, text: 'Outer loop: one iteration per row, top to bottom.' },
            { lines: 10, text: 'Inner loop: one iteration per tile in the current row. It restarts at `x = 0` for every new row.' },
            { lines: '11-12', text: 'A tile is on the border if it is in the first or last row or column. Note the `- 1`: with half-open ranges the last index is `height - 1`.' },
            { lines: 21, text: 'After the inner loop finishes a row, end the line. This statement belongs to the outer loop.' },
          ],
        },
        {
          type: 'p',
          text: 'The inner body runs `height × width` times — 40 here. That multiplication is the key to nested-loop performance. A 1000 × 1000 map means a million iterations; three loops nested 1000 deep would be a billion. This growth is described with [[big-o]] notation: a loop inside a loop over the same `n` items is O(n²).',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Name your counters',
          text: 'In nested loops, `i` and `j` are easy to mix up — and `grid[i][j]` versus `grid[j][i]` is a bug that compiles happily. Use names that carry meaning: `row`/`col`, `y`/`x`. When you start storing grids in arrays (Unit 7), you will also see that looping row by row, in the order the data sits in memory, is much faster than looping column by column.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'What is the value of `count` afterwards?',
      code: `int count = 0;
for (int row = 0; row < 4; ++row) {
    for (int col = 0; col < row; ++col) {
        ++count;
    }
}`,
      options: [
        { text: '`16`', why: 'That would be true if the inner loop always ran 4 times. Here it runs `row` times, which changes on every outer iteration.' },
        { text: '`10`', why: '10 is 1 + 2 + 3 + 4. But for `row == 0` the inner loop runs 0 times, and `row` never reaches 4.' },
        { text: '`6`', correct: true, why: 'The inner loop runs 0, 1, 2 and 3 times for rows 0–3: 0 + 1 + 2 + 3 = 6.' },
        { text: '`4`', why: 'That counts outer iterations only. `++count` is in the inner loop, so it runs once per inner iteration.' },
      ],
      explanation:
        'When the inner bound depends on the outer counter, add up the inner iterations row by row. This "triangular" pattern appears when every pair of objects must be checked once, such as testing each enemy against every other enemy for collisions: n objects give n(n−1)/2 pairs, still O(n²).',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Choosing the right loop',
      blocks: [
        {
          type: 'p',
          text: 'Every loop can be rewritten as any other, so the choice is about **communicating intent**. Pick the loop whose shape matches the question you are asking.',
        },
        {
          type: 'table',
          headers: ['Situation', 'Loop', 'Example'],
          rows: [
            ['You know how many times, or count through a range', '`for`', 'spawn 10 enemies; draw a 10-segment bar'],
            ['Repeat until something happens; may be zero times', '`while`', 'regenerate until full; read until end of input'],
            ['The body must run once before the test makes sense', '`do-while`', 'show a menu, then check the choice'],
            ['Visit every element of a string or container', 'range-based `for` (next lesson)', 'check every character of a name'],
            ['Run until an exit inside the body', '`while (true)` + `break`', 'game loop, server loop'],
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Works, but hides the intent',
            tone: 'bad',
            code: `int wave = 1;
while (wave <= 4) {
    spawnWave(wave);
    // ... 30 more lines ...
    ++wave;
}`,
            text: 'The reader must find the update at the bottom, and forgetting it means an infinite loop.',
          },
          right: {
            title: 'Says "count from 1 to 4"',
            tone: 'good',
            code: `for (int wave = 1; wave <= 4; ++wave) {
    spawnWave(wave);
    // ... 30 more lines ...
}`,
            text: 'All loop control is in the header, and `wave` does not leak out of the loop.',
          },
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Loops in Unreal',
          text: 'Unreal C++ uses the same loops, mostly over its containers: `for (int32 Index = 0; Index < Enemies.Num(); ++Index)` or, more often, the range-based form `for (AEnemy* Enemy : Enemies)`. Note the `int32` counter compared with `Num()`, which returns a signed `int32` — Unreal deliberately uses signed sizes to avoid the unsigned-countdown trap you just met.',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'The game must ask "Overwrite save? (y/n)" and keep asking until the player types `y` or `n`. Which loop fits best?',
      options: [
        { text: 'A `for` loop counting from 0 to 2', why: 'There is no fixed number of attempts: the player may answer correctly on the first try or the tenth. A counting loop does not match.' },
        { text: 'A `do-while` loop', correct: true, why: 'The question must be asked at least once, and only after reading the answer can you decide whether to repeat. That is exactly the `do-while` shape.' },
        { text: 'A `while` loop with the prompt only inside the body', why: 'A `while` checks before the first iteration, when there is no answer yet. You would have to fake an initial value or duplicate the prompt before the loop.' },
        { text: 'No loop: a single `if` is enough', why: 'An `if` asks once. If the player types `x`, the program needs to ask again, which requires repetition.' },
      ],
      explanation:
        '"Do it once, then repeat while the result is unacceptable" is the signature of `do-while`. Input validation and menus are its most common uses. A `while` can do the job too, but needs either a duplicated prompt or an artificial starting value to get into the loop.',
    },
  ],
  takeaways: [
    '`while` tests before each iteration (it may run zero times); `do-while` tests after (it always runs at least once — note the trailing semicolon).',
    'A `for` header is `init; condition; update`: init runs once, the condition is checked before each iteration, the update after it.',
    'Prefer half-open ranges: `for (int i = 0; i < n; ++i)` runs exactly n times. A `<=` in a loop that starts at 0 is a classic off-by-one.',
    'Every loop must make progress. Watch for missing updates, unsigned counters compared with `>= 0`, and floating-point counters tested with `!=`.',
    'In nested loops the inner loop runs completely for each outer iteration, so costs multiply: rows × columns.',
    'Choose the loop that expresses intent: `for` for counting, `while` for "until", `do-while` for "at least once".',
  ],
  reading: [
    {
      title: 'for loop',
      url: 'https://en.cppreference.com/w/cpp/language/for',
      source: 'cppreference',
      note: 'The exact grammar of `for`, including what may appear in each part of the header.',
    },
    {
      title: 'while loop',
      url: 'https://en.cppreference.com/w/cpp/language/while',
      source: 'cppreference',
      note: 'Formal definition of `while`, with notes on declarations inside the condition.',
    },
    {
      title: 'do-while loop',
      url: 'https://en.cppreference.com/w/cpp/language/do',
      source: 'cppreference',
      note: 'The `do-while` statement and how it differs from `while`.',
    },
    {
      title: 'For statements',
      url: 'https://www.learncpp.com/cpp-tutorial/for-statements/',
      source: 'learncpp',
      note: 'More practice with `for` loops, off-by-one errors and loops with multiple counters.',
    },
    {
      title: 'Introduction to loops and while statements',
      url: 'https://www.learncpp.com/cpp-tutorial/introduction-to-loops-and-while-statements/',
      source: 'learncpp',
      note: 'A gentle introduction to `while`, with exercises on nested loops.',
    },
  ],
};
