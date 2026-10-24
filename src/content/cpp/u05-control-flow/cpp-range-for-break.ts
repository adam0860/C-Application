import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-range-for-break',
  title: 'Range-based for, break and continue',
  summary: 'Looping over every element without indexes, choosing between copies and references, and steering loops with break and continue — including how to escape nested loops.',
  minutes: 16,
  objectives: [
    'Iterate over arrays, strings and vectors with a range-based `for` loop',
    'Choose between by-value, by-reference and by-const-reference loop variables, and explain the cost of each',
    'Stop a loop early with `break`, and know which statement it exits',
    'Skip iterations with `continue` without creating an infinite `while` loop',
    'Leave nested loops with a flag or an early `return`',
    'Decide when an index-based loop is still the better tool',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Range-based for: visit every element',
      blocks: [
        {
          type: 'p',
          text: 'The most common loop of all is "do something with each element": sum every score, print every party member, check every character of a name. The [[range-based-for]] loop (C++11) expresses exactly that, with no counter and no index: `for (declaration : range) body`. Read the colon as "in": *for each `s` in `scores`*.',
        },
        {
          type: 'code',
          title: 'each.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <vector>

int main() {
    int scores[] = {120, 340, 95, 410};
    int total = 0;
    for (int s : scores) {
        total += s;
    }
    std::cout << "Total: " << total << '\\n';

    std::string name = "Aria";
    for (char c : name) {
        std::cout << c << '.';
    }
    std::cout << '\\n';

    std::vector<int> ammo{30, 12, 5};
    for (int clip : ammo) {
        std::cout << clip << ' ';
    }
    std::cout << '\\n';
}`,
          output: `Total: 965
A.r.i.a.
30 12 5`,
          annotations: [
            { lines: 6, text: 'A built-in [[array]]: a fixed number of values of one type, stored side by side. The compiler counts the four initializers. Unit 7 covers arrays properly.' },
            { lines: 8, text: 'On each iteration, `s` is initialized with the next element: 120, then 340, 95 and 410. The loop knows where the array ends — no size to get wrong.' },
            { lines: 14, text: 'A `std::string` is a sequence of `char`, so each element is one character.' },
            { lines: 19, text: 'A preview of [[std-vector|std::vector]] from `<vector>`: a growable array, and the container you will use most (Unit 7). Range-based `for` works on it, and on every other standard [[container]], in exactly the same way.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why prefer range-based for?',
          text: 'Everything that could go wrong in an index loop is gone: no off-by-one in the condition, no wrong index variable in a nested loop, no signed/unsigned comparison with `size()`. The code also says what it means — "each element" — rather than how to compute positions. The C++ Core Guidelines (ES.71) recommend it whenever you have the choice.',
        },
        {
          type: 'deepdive',
          title: 'What the compiler turns it into',
          blocks: [
            {
              type: 'p',
              text: 'A range-based `for` is shorthand. The compiler rewrites it into an ordinary loop over [[iterator|iterators]] — small objects that point at an element and can step to the next one (Unit 13):',
            },
            {
              type: 'code',
              code: `// for (int s : scores) { total += s; }  becomes roughly:
{
    auto&& range = scores;
    auto it = std::begin(range);
    auto last = std::end(range);
    for (; it != last; ++it) {
        int s = *it;
        total += s;
    }
}`,
              annotations: [
                { lines: '4-5', text: '`begin` points at the first element; `end` points **one past** the last — the half-open range `[begin, end)` from the previous lesson.' },
                { lines: 6, text: 'Note `++it`: pre-increment, because iterators may be class types where post-increment would make a needless copy (the reason from the arithmetic lesson).' },
                { lines: 7, text: 'Your loop variable is initialized from the current element. Whether that copies depends on how you declare it — the topic of the next card.' },
              ],
            },
            {
              type: 'p',
              text: 'This also explains a rule: do not add or remove elements of a container while a range-based `for` is walking it. Growing a `std::vector` can move its elements to new memory, leaving `it` and `last` pointing at the old location ([[iterator-invalidation]], Unit 7).',
            },
            {
              type: 'callout',
              variant: 'unreal',
              title: 'In Unreal Engine',
              text: 'Range-based `for` works on `TArray`, `TMap` and `TSet`, and is the usual way to loop in Unreal code: `for (AActor* Actor : OverlappingActors) { … }`. Development builds check the rule above: if a `TArray` changes size during a range-based loop, you get the assertion *Array has changed during ranged-for iteration!*',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'truefalse',
      prompt: 'Inside `for (int s : scores)`, the variable `s` holds the index of the current element (0, 1, 2, …).',
      answer: false,
      explanation:
        '`s` holds the element **itself** (120, 340, …), not its position. A range-based `for` hides positions entirely, which is what makes it safe. If you also need the index, keep a counter (C++20 lets you declare it in the loop header, as you will see) or use a classic index-based `for`.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Copy, reference or const reference?',
      blocks: [
        {
          type: 'p',
          text: 'How you declare the loop variable decides whether each element is **copied**. `for (int h : hp)` copies each element into `h`; changing `h` changes only the copy. To work on the elements themselves, declare a [[reference]] with `&`: `for (int& h : hp)` makes `h` another name for the current element. (Unit 8 explains references fully; for now, a reference is an alias — it refers to an existing object instead of being a new one.)',
        },
        {
          type: 'code',
          title: 'by_ref.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<int> hp{100, 45, 80};

    for (int h : hp) {
        h += 10;               // changes a copy only
    }
    for (int h : hp) {
        std::cout << h << ' ';
    }
    std::cout << '\\n';

    for (int& h : hp) {
        h += 10;               // changes the element itself
    }
    for (int h : hp) {
        std::cout << h << ' ';
    }
    std::cout << '\\n';

    std::vector<std::string> party{"Aria", "Borin"};
    for (const std::string& member : party) {
        std::cout << member << " (" << member.size() << ")\\n";
    }
}`,
          output: `100 45 80
110 55 90
Aria (4)
Borin (5)`,
          annotations: [
            { lines: '8-10', text: 'Each `h` is a fresh copy, thrown away at the end of the iteration. The vector is untouched — and the compiler does not warn you.' },
            { lines: '16-18', text: 'With `int&`, `h` *is* the element on each iteration, so the healing sticks.' },
            { lines: 25, text: '`const std::string&` refers to each element without copying it, and `const` forbids modifying it. This is the standard way to read elements that are expensive to copy.' },
          ],
          highlight: [16],
        },
        {
          type: 'memory',
          caption: 'Iteration 2 of each loop: a copy has its own storage; a reference is just another name for the element.',
          regions: [
            {
              label: 'Heap — the vector\'s elements',
              kind: 'heap',
              cells: [
                { name: 'hp[0]', type: 'int', value: '100' },
                { id: 'el1', name: 'hp[1]', type: 'int', value: '45', highlight: true },
                { name: 'hp[2]', type: 'int', value: '80' },
              ],
            },
            {
              label: 'Loop variable',
              kind: 'stack',
              cells: [
                { name: 'h (int, a copy)', type: 'int', value: '45 → 55, then discarded' },
                { name: 'h (int&, an alias)', type: 'int&', value: 'refers to hp[1]', pointsTo: 'el1' },
              ],
            },
          ],
        },
        {
          type: 'table',
          headers: ['Loop variable', 'Copies each element?', 'Can modify the element?', 'Use for'],
          rows: [
            ['`auto x` / `int x`', 'yes', 'no (only the copy)', 'small, cheap types: `int`, `char`, `float`'],
            ['`auto& x`', 'no', '**yes**', 'changing elements in place'],
            ['`const auto& x`', 'no', 'no', 'reading anything bigger than a few bytes, e.g. `std::string`'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why const reference is the default for big types',
          text: 'Copying a `std::string` longer than the small-string buffer allocates memory and copies every character — on every iteration. Looping over 10,000 item names by value could mean 10,000 allocations just to *read* them. A `const` reference costs nothing and also documents that the loop does not change anything. GCC\'s `-Wall` even warns about `for (const std::string n : names)`: *loop variable \'n\' creates a copy*.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'bug',
      prompt: 'Each turn, every ability cooldown above 0 should go down by 1. After the loop, `cooldowns[0]` is still 3. Tap the faulty line.',
      code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> cooldowns{3, 0, 5};
    for (int c : cooldowns) {
        if (c > 0) {
            --c;
        }
    }
    std::cout << cooldowns[0] << '\\n';   // expected 2
}`,
      bugLines: [6],
      hint: 'Is `c` the element, or a copy of it?',
      explanation:
        '`int c` copies each element, so `--c` decrements the copy, which is discarded at the end of the iteration. Declare the loop variable as a reference — `for (int& c : cooldowns)` — so the decrement changes the vector. This bug compiles silently, which is exactly why you should decide consciously between copy and reference every time.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'fill',
      prompt: 'Print every item name without copying the strings, and make sure the loop cannot change them by accident.',
      template: `std::vector<std::string> inventory{"Potion", "Rope", "Lantern"};
for (___ auto___ item : inventory) {
    std::cout << item << '\\n';
}`,
      blanks: [{ answers: ['const'] }, { answers: ['&'] }],
      wordBank: ['const', '&', '*', '&&', 'static', 'mutable'],
      explanation:
        '`const auto&` deduces `const std::string&`: a reference (no copy) that cannot be used to modify the element. Without `&`, every name would be copied; without `const`, the loop could change the inventory by mistake. `*` would declare a pointer, which a vector of strings does not contain.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'break: stop as soon as you know',
      blocks: [
        {
          type: 'p',
          text: '[[break-continue|break]] immediately ends the **innermost** enclosing loop (or `switch`), and execution continues after it. It is the natural tool for searching: once you have found what you were looking for, there is no point examining the remaining elements.',
        },
        {
          type: 'code',
          title: 'find_target.cpp',
          runnable: true,
          code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> enemyHp{80, 55, 12, 90, 5};
    int target = -1;

    for (int i = 0; int hp : enemyHp) {
        if (hp < 20) {
            target = i;
            break;
        }
        ++i;
    }
    std::cout << "First weak enemy: #" << target << '\\n';
}`,
          output: 'First weak enemy: #2',
          annotations: [
            { lines: 6, text: '`-1` is a **sentinel**: an impossible index meaning "not found". After the loop, `target == -1` tells you the search failed.' },
            { lines: 8, text: 'C++20 lets a range-based `for` start with an init statement, just like `if`. Here it declares an index counter whose scope is limited to the loop.' },
            { lines: '9-12', text: 'Enemy #2 (12 HP) matches: remember it and leave the loop. Enemies #3 and #4 are never examined, and the 5 HP enemy is ignored even though it is weaker — we asked for the *first* match.' },
            { lines: 13, text: 'The counter is advanced manually at the end of each iteration.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'break inside a switch inside a loop',
          text: 'In a `switch` that sits inside a loop, `break` ends the **switch**, not the loop — `break` always applies to the innermost loop *or* switch. If you need to leave the loop from inside a switch, set a flag and test it after the switch, or move the code into a function and `return`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Coming later: algorithms',
          text: 'Searching is so common that the standard library has ready-made algorithms for it, such as `std::find` and `std::find_if` (Unit 13). They contain exactly this kind of loop with a `break`, already tested and clearly named. Writing the loop yourself first is the best way to understand what they do.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `for (int i = 0; i < 5; ++i) {
    switch (i) {
        case 2:
            break;
        default:
            std::cout << i;
    }
}`,
      options: [
        { text: '`01`', why: 'That assumes `break` leaves the `for` loop. Inside a `switch`, `break` only leaves the `switch`.' },
        { text: '`01234`', why: 'For `i == 2`, the `case 2:` label matches and its `break` skips the printing, so 2 is not printed.' },
        { text: '`0134`', correct: true, why: 'Only the iteration with `i == 2` prints nothing: its `break` exits the switch, and the loop carries on with 3 and 4.' },
        { text: '`2`', why: 'The `default` label prints; `case 2` does not. So 2 is the one value that is **not** printed.' },
      ],
      explanation:
        '`break` binds to the nearest enclosing `switch` or loop — here the `switch`. Code that looks like "stop the loop when i is 2" actually means "skip printing when i is 2". When a `switch` sits inside a loop, double-check what each `break` is meant to exit.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'order',
      prompt: 'Build a loop that sets `hasKey` when the inventory contains `"Key"`, and stops searching as soon as it is found.',
      lines: [
        'for (const std::string& item : inventory) {',
        '    if (item == "Key") {',
        '        hasKey = true;',
        '        break;',
        '    }',
        '}',
      ],
      distractors: ['        continue;', 'for (int i = 0; i <= inventory.size(); ++i) {'],
      explanation:
        'Read each item by const reference, test it, record the result, and `break` — in that order, because statements after `break` in the same block would never run. `continue` would keep searching needlessly, and the index loop with `<=` would run one past the end (as well as comparing a signed `int` with an unsigned size).',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'continue: skip to the next iteration',
      blocks: [
        {
          type: 'p',
          text: '`continue` abandons the **rest of the current iteration** and moves on to the next one. It is the loop version of a guard clause: handle the "nothing to do here" cases at the top, and keep the main logic un-indented below.',
        },
        {
          type: 'code',
          title: 'area_damage.cpp',
          runnable: true,
          code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> enemyHp{80, 0, 35, 0, 60};
    int hits = 0;

    for (int& hp : enemyHp) {
        if (hp == 0) {
            continue;   // already defeated: skip
        }
        hp -= 30;
        if (hp < 0) {
            hp = 0;
        }
        ++hits;
    }

    for (int hp : enemyHp) {
        std::cout << hp << ' ';
    }
    std::cout << "\\nEnemies hit: " << hits << '\\n';
}`,
          output: `50 0 5 0 30
Enemies hit: 3`,
          annotations: [
            { lines: 8, text: 'By reference, because the loop changes each enemy\'s health.' },
            { lines: '9-11', text: 'The guard: defeated enemies are skipped. Everything below runs only for living ones.' },
            { lines: '12-16', text: 'The main logic stays at one indentation level instead of being wrapped in `if (hp != 0) { … }`.' },
          ],
        },
        {
          type: 'p',
          text: 'Where exactly does `continue` go? In a `for` loop it jumps to the **update** expression (then the condition). In a `while` or `do-while` loop it jumps straight to the **condition** — so any update at the bottom of the body is skipped.',
        },
        {
          type: 'compare',
          left: {
            title: 'Infinite loop',
            tone: 'bad',
            code: `int i = 0;
while (i < 10) {
    if (i % 2 == 0) {
        continue;   // skips ++i
    }
    std::cout << i;
    ++i;
}`,
            text: 'At `i == 0`, `continue` jumps back to the condition without ever reaching `++i`. `i` stays 0 forever.',
          },
          right: {
            title: 'Update before continue',
            tone: 'good',
            code: `for (int i = 0; i < 10; ++i) {
    if (i % 2 == 0) {
        continue;   // ++i still runs
    }
    std::cout << i;
}`,
            text: 'In a `for`, the update lives in the header and runs even after `continue`. Prints `13579`.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does continue behave differently?',
          text: '`continue` always means "go to the end of the loop body". In a `for` loop the update expression runs at the end of every iteration — that is part of the loop\'s definition — so it still happens. A `while` loop has no update part; your increment is just an ordinary statement in the body, and `continue` skips it like any other. This is one more reason counting loops belong in `for`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: 'This loop should print the odd numbers below 10, but it hangs forever. Tap the line that causes the hang.',
      code: `#include <iostream>

int main() {
    int i = 0;
    while (i < 10) {
        if (i % 2 == 0) {
            continue;
        }
        std::cout << i << ' ';
        ++i;
    }
}`,
      bugLines: [7],
      hint: 'When `i` is 0, which statements run on each pass?',
      explanation:
        'When `i` is even, `continue` jumps straight back to the `while` condition, skipping `++i` on line 10. `i` stays 0, the condition stays true, and the loop never ends. Increment before continuing (`++i; continue;`), or better, rewrite it as `for (int i = 0; i < 10; ++i)`, where the update always runs.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Escaping nested loops',
      blocks: [
        {
          type: 'p',
          text: '`break` leaves only the innermost loop. When a search runs over a grid with two nested loops, breaking out of the inner loop just moves on to the next row. C++ has **no labelled break** (Java, JavaScript and Rust let you write `break outer;`), so you use one of these techniques instead.',
        },
        {
          type: 'heading',
          text: '1. A flag checked by the outer loop',
        },
        {
          type: 'code',
          title: 'find_chest_flag.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    const int width = 6;
    const int height = 4;
    const int chestX = 3;
    const int chestY = 2;

    bool found = false;
    int checked = 0;
    for (int y = 0; y < height && !found; ++y) {
        for (int x = 0; x < width; ++x) {
            ++checked;
            if (x == chestX && y == chestY) {
                std::cout << "Chest at (" << x << ", " << y << ")\\n";
                found = true;
                break;
            }
        }
    }
    std::cout << "Tiles checked: " << checked << '\\n';
}`,
          output: `Chest at (3, 2)
Tiles checked: 16`,
          annotations: [
            { lines: 11, text: 'The outer condition also tests `!found`, so once the flag is set, no further rows start.' },
            { lines: '16-17', text: 'Set the flag, then `break` out of the inner loop. The outer loop\'s condition then fails as well.' },
            { lines: 21, text: 'Two full rows of 6 plus four tiles of row 2: 16 tiles, instead of all 24.' },
          ],
        },
        {
          type: 'heading',
          text: '2. Put the loops in a function and return',
        },
        {
          type: 'code',
          title: 'find_chest_return.cpp',
          runnable: true,
          code: `#include <iostream>

bool findChest(int width, int height, int chestX, int chestY) {
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            if (x == chestX && y == chestY) {
                std::cout << "Chest at (" << x << ", " << y << ")\\n";
                return true;   // leaves both loops at once
            }
        }
    }
    return false;
}

int main() {
    if (!findChest(6, 4, 3, 2)) {
        std::cout << "No chest\\n";
    }
}`,
          output: 'Chest at (3, 2)',
          annotations: [
            { lines: 3, text: 'A function that returns a `bool`: `true` if it found the chest. Unit 6 covers writing functions in detail.' },
            { lines: 8, text: '`return` ends the whole function immediately, no matter how deeply nested the loops are. This is usually the cleanest solution.' },
            { lines: 12, text: 'Reached only if both loops finish without finding anything.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is the function version usually best?',
          text: 'It gives the search a name (`findChest`), keeps the flag variable out of the caller, and makes "found" and "not found" two clear exit points. It is also easy to test on its own. The flag version is fine for short code where a separate function would feel heavy.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'What about goto?',
          text: 'C++ still has `goto label;`, and jumping forward to a label just after the outer loop does work. It is widely discouraged because unrestricted jumps make code hard to follow. The C++ Core Guidelines (ES.76) say to avoid `goto`, mentioning breaking out of nested loops as the one case where a forward jump may be acceptable. Most teams, including most game studios, prefer the flag or the function.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'Which of these is **not** a way to leave two nested loops at once in standard C++?',
      options: [
        { text: 'Setting a `bool` flag, breaking the inner loop, and testing the flag in the outer loop\'s condition', why: 'This is the classic flag technique and works in any function.' },
        { text: 'Moving the loops into a function and using `return`', why: '`return` ends the whole function, so it leaves every loop inside it at once.' },
        { text: 'Writing `break outer;` with a label on the outer loop', correct: true, why: 'Labelled break exists in Java, JavaScript and Rust, but not in C++. It does not compile.' },
        { text: 'Jumping with `goto` to a label placed right after the outer loop', why: 'Legal, if controversial. It works, but most style guides prefer the flag or the function.' },
      ],
      explanation:
        'C++ `break` has no target: it always leaves the innermost loop or `switch`. To exit several levels, communicate through a flag, restructure the code so that `return` can do the job, or (rarely) use `goto`.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Range-based for or index loop?',
      blocks: [
        {
          type: 'p',
          text: 'A range-based `for` visits every element, in order, one at a time. That covers most loops — but not all. When the **position** itself matters, a classic index-based `for` is still the right tool.',
        },
        {
          type: 'table',
          headers: ['Task', 'Best fit'],
          rows: [
            ['Read or modify every element, in order', 'range-based `for`'],
            ['Every element, and you also want a counter', 'range-based `for` with a C++20 init statement'],
            ['Compare neighbours (`v[i]` with `v[i + 1]`)', 'index loop'],
            ['Go backwards, skip every other element, or process only part', 'index loop (or ranges, Unit 13)'],
            ['Add or remove elements while looping', 'neither, naively: special techniques (Unit 7)'],
          ],
        },
        {
          type: 'code',
          code: `std::string combo = "AABBBA";
int longestRun = 1;
int run = 1;
for (std::size_t i = 1; i < combo.size(); ++i) {
    if (combo[i] == combo[i - 1]) {
        ++run;
    } else {
        run = 1;
    }
    if (run > longestRun) {
        longestRun = run;
    }
}
// longestRun == 3 ("BBB")`,
          annotations: [
            { lines: 4, text: 'Comparing each character with the previous one needs positions, so this is an index loop. `std::size_t` matches the type of `size()`, avoiding a signed/unsigned comparison, and starting at 1 makes `i - 1` always valid.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Default to range-based for',
          text: 'Start with a range-based loop and switch to an index loop only when the task genuinely needs positions. A reader seeing a range-based `for` immediately knows that every element is visited exactly once, in order — a guarantee an index loop has to prove line by line.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'Which task is the **poorest** fit for a plain range-based `for` loop?',
      options: [
        { text: 'Adding up the damage values of every hit in a combo', why: 'Every element, in order, read once: the ideal range-based loop.' },
        { text: 'Converting every letter of a player name to upper case', why: 'Every element modified in place: a range-based loop with `char&` does it neatly.' },
        { text: 'Detecting two identical button presses in a row', correct: true, why: 'Each element must be compared with its neighbour, which needs positions (`i` and `i - 1`). An index loop expresses that directly.' },
        { text: 'Printing the name of every party member', why: 'Every element, read-only: a range-based loop with `const std::string&`.' },
      ],
      explanation:
        'A range-based `for` gives you one element at a time with no notion of where it sits. Tasks involving neighbours, partial ranges or reverse order need positions, so an index loop (or, later, the ranges library) fits better. For everything else, the range-based form is shorter and safer.',
    },
  ],
  takeaways: [
    '`for (declaration : range)` visits every element of an array, string or container, with no index to get wrong.',
    '`auto x` copies each element, `auto& x` refers to it (changes stick), and `const auto& x` reads it without copying — the default for types like `std::string`.',
    'Modifying a by-value loop variable silently changes only a copy.',
    '`break` exits the innermost loop **or switch**; inside a switch in a loop, it does not end the loop.',
    '`continue` skips to the next iteration; in a `while` loop it also skips any increment at the bottom of the body.',
    'C++ has no labelled break: leave nested loops with a flag or, more cleanly, by returning from a function.',
    'Use an index loop when positions matter (neighbours, reverse, partial ranges); otherwise prefer range-based `for`.',
  ],
  reading: [
    {
      title: 'Range-based for loop',
      url: 'https://en.cppreference.com/w/cpp/language/range-for',
      source: 'cppreference',
      note: 'The exact rewrite the compiler performs, including the C++20 init statement and lifetime pitfalls.',
    },
    {
      title: 'break statement',
      url: 'https://en.cppreference.com/w/cpp/language/break',
      source: 'cppreference',
      note: 'Precisely which statement `break` exits.',
    },
    {
      title: 'continue statement',
      url: 'https://en.cppreference.com/w/cpp/language/continue',
      source: 'cppreference',
      note: 'Where `continue` jumps to in each kind of loop.',
    },
    {
      title: 'Range-based for loops (for-each)',
      url: 'https://www.learncpp.com/cpp-tutorial/range-based-for-loops-for-each/',
      source: 'learncpp',
      note: 'More examples of by-value versus by-reference loop variables.',
    },
    {
      title: 'Break and continue',
      url: 'https://www.learncpp.com/cpp-tutorial/break-and-continue/',
      source: 'learncpp',
      note: 'A walkthrough of both statements, with advice on when early exits improve readability.',
    },
  ],
};
