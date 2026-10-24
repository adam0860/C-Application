import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-arrays',
  title: 'C-Style Arrays and std::array',
  summary: 'Fixed-size collections: how arrays sit in memory, why C++ never checks your indices, and why std::array is the modern choice.',
  minutes: 17,
  objectives: [
    'Declare, initialize and iterate C-style arrays, and explain why their size must be a compile-time constant',
    'Explain why out-of-bounds access is undefined behavior and why C++ does not check indices',
    'Recognize array decay when a C array is passed to a function',
    'Model a 2D grid such as a tile map with nested arrays and a flat array',
    'Use `std::array` with `size()`, `at()` and pass it by reference',
    'Explain why `std::array` is preferred over C arrays in modern C++',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Arrays: many values, one name',
      blocks: [
        {
          type: 'p',
          text: 'A party of five heroes, a hotbar of ten slots, the last eight scores: games are full of fixed-size groups of values. Declaring `score0`, `score1`, … `score4` as separate variables makes them impossible to loop over. An [[array|array]] stores a fixed number of elements of the same type under one name, and you reach each one by its **index**.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

int main() {
    int scores[5] = {90, 75, 60, 85, 100};
    std::cout << "First: " << scores[0] << '\\n';
    std::cout << "Last: " << scores[4] << '\\n';
    scores[2] = 65;
    std::cout << "Third: " << scores[2] << '\\n';
}`,
          output: 'First: 90\nLast: 100\nThird: 65',
          annotations: [
            { lines: 4, text: '`int scores[5]` declares an array of five `int`s. The braces give the initial values in order.' },
            { lines: 5, text: 'Indices start at **0**, so the first element is `scores[0]`…' },
            { lines: 6, text: '…and the last of five is `scores[4]`. There is no `scores[5]`.' },
            { lines: 7, text: 'An element is an ordinary `int` variable: read it, assign to it, pass it to functions.' },
          ],
        },
        {
          type: 'p',
          text: 'The elements are laid out in [[contiguous-memory|contiguous memory]]: one directly after another, with no gaps. With 4-byte `int`s, each element sits exactly 4 bytes after the previous one:',
        },
        {
          type: 'memory',
          caption: 'int scores[5]: twenty contiguous bytes.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'scores[0]', type: 'int', value: '90', address: '0x1000' },
                { name: 'scores[1]', type: 'int', value: '75', address: '0x1004' },
                { name: 'scores[2]', type: 'int', value: '65', address: '0x1008', highlight: true },
                { name: 'scores[3]', type: 'int', value: '85', address: '0x100C' },
                { name: 'scores[4]', type: 'int', value: '100', address: '0x1010' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why indices start at zero',
          text: 'An index is an **offset** from the start of the array, not a position in a queue. The address of `scores[i]` is simply *start + i × sizeof(int)*: one multiply and one add, whatever the index. Element 0 is at offset zero. That formula is why indexing an array is constant time, and why the elements must be contiguous and all the same size.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The size must be a compile-time constant',
          text: 'The compiler reserves the array\'s memory in the stack frame, so it must know the size in advance: a literal or a `constexpr` value, not a number read from the player at run time. GCC accepts `int a[n];` with a run-time `n` as a non-standard extension (a *VLA*, inherited from C) without a warning under `-Wall -Wextra`, but it is not C++ and MSVC rejects it. For sizes known only at run time, use `std::vector` (next lesson).',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Initialization and iteration',
      blocks: [
        {
          type: 'table',
          headers: ['Declaration', 'Contents', 'Notes'],
          rows: [
            ['`int a[4];`', 'Garbage (inside a function)', 'Local arrays are [[default-initialization|default-initialized]]: reading the values is undefined behavior.'],
            ['`int a[4]{};`', '`0 0 0 0`', 'Empty braces [[value-initialization|value-initialize]] every element. The safe default.'],
            ['`int a[4]{7, 3};`', '`7 3 0 0`', 'Listed values first; every remaining element is zeroed.'],
            ['`int a[]{7, 3, 9};`', '`7 3 9`', 'Size deduced from the initializer: here 3.'],
            ['`int a[2]{1, 2, 3};`', 'Compile error', 'Too many initializers for the size.'],
          ],
        },
        {
          type: 'p',
          text: 'To visit every element, use an index loop when you need the position, or a [[range-based-for|range-based for]] loop when you only need the values. `std::size(array)` (C++17) gives the element count, so you never hard-code the size twice.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <cstddef>
#include <iostream>
#include <iterator>

int main() {
    int damage[]{12, 7, 30, 18};
    int total = 0;
    int highest = damage[0];
    for (std::size_t i = 0; i < std::size(damage); ++i) {
        total += damage[i];
        if (damage[i] > highest) {
            highest = damage[i];
        }
    }
    std::cout << "Hits: " << std::size(damage) << '\\n';
    std::cout << "Total: " << total << '\\n';
    std::cout << "Highest: " << highest << '\\n';

    for (int d : damage) {
        std::cout << d << ' ';
    }
    std::cout << '\\n';
}`,
          output: 'Hits: 4\nTotal: 67\nHighest: 30\n12 7 30 18',
          annotations: [
            { lines: 6, text: 'Size deduced as 4 from the four initializers.' },
            { lines: 9, text: '`std::size_t` (from `<cstddef>`) is the unsigned type the standard library uses for sizes and indices. `std::size` (from `<iterator>`) returns the element count; it updates automatically if you add a fifth value.' },
            { lines: '19-21', text: 'A range-based `for` visits each element in order, with no index to get wrong.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Arrays cannot be assigned or compared as a whole',
          text: 'With two C arrays `a` and `b`, `a = b;` does not compile, and `a == b` compares their *addresses*, not their contents, so it is false for two distinct arrays even if every element matches. (C++20 deprecates that comparison, and GCC warns about it.) You must copy and compare element by element. This is one of several C-array quirks that `std::array` fixes.',
        },
        {
          type: 'deepdive',
          title: 'The old sizeof trick',
          blocks: [
            {
              type: 'p',
              text: 'Before C++17 you will often see `sizeof(damage) / sizeof(damage[0])`: the array\'s total size in bytes divided by the size of one element. It works only where the real array is in scope; as you will see shortly, inside a function that received the array as a parameter it silently gives the wrong answer. `std::size` refuses to compile in that situation, which is exactly what you want.',
            },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Inside a function, what does `int loot[4]{7, 3};` contain?',
      options: [
        { text: '`7 3` followed by two garbage values', why: 'Garbage appears only with no initializer at all (`int loot[4];`). As soon as you provide braces, unlisted elements are zeroed.' },
        { text: '`7 3 0 0`', correct: true, why: 'Listed values initialize the first elements in order; every remaining element is value-initialized, which for `int` means 0.' },
        { text: '`7 3 7 3`', why: 'The initializer list is never repeated to fill the array.' },
        { text: 'It does not compile: four elements need four values', why: 'Fewer initializers than elements is allowed. Only *more* initializers than elements is an error.' },
      ],
      explanation:
        'A brace initializer that is shorter than the array zero-fills the rest. That makes `int loot[4]{};` the idiomatic way to get a fully zeroed array, while `int loot[4];` inside a function leaves every element uninitialized.',
    },
    {
      kind: 'concept',
      title: 'No bounds checking: out of bounds is undefined behavior',
      blocks: [
        {
          type: 'p',
          text: 'Here is the most important fact about C++ arrays: **nothing checks your index**. There is no [[bounds-checking|bounds checking]]. `scores[5]` on a five-element array does not raise an error. The computer calculates *start + 5 × 4*, which is the address just past the end, and reads or writes whatever happens to live there.',
        },
        {
          type: 'code',
          code: `int ammo[5]{30, 30, 30, 30, 30};
int lives = 3;

ammo[5] = 0;             // out of bounds: undefined behavior
std::cout << ammo[-1];   // also out of bounds

for (int i = 0; i <= 5; ++i) {   // classic off-by-one
    ammo[i] = 99;                // writes ammo[5] too
}`,
          annotations: [
            { lines: 4, text: 'Valid indices are 0 to 4. This might overwrite `lives`, overwrite the function\'s return address, crash, or appear to work perfectly today.' },
            { lines: 5, text: 'Negative indices are not "from the end" as in some languages. They are simply out of bounds.' },
            { lines: 7, text: '`<=` instead of `<` runs one iteration too many. Off-by-one mistakes like this are the most common way programs walk off the end of an array.' },
          ],
        },
        {
          type: 'p',
          text: 'This is [[undefined-behavior|undefined behavior]]: the C++ standard places no requirements at all on what happens. The optimizer is allowed to assume it never occurs, which can make the consequences appear far away from the bug. Out-of-bounds writes, known as [[buffer-overflow|buffer overflows]], have been behind a large share of real-world security vulnerabilities for decades.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why doesn\'t C++ just check?',
          text: 'A check costs a comparison and a branch on every single access. In a physics loop touching millions of elements per frame, that adds up, and the compiler cannot always prove the checks redundant. C++ follows the [[zero-cost-abstraction|zero-overhead principle]]: you do not pay for what you do not use. Checking is available when you ask for it (`std::array::at`, below), and tools can add it during development.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Let a sanitizer find it',
          text: 'Compile with `-fsanitize=address` (GCC, Clang, and recent MSVC with `/fsanitize=address`) while developing. The AddressSanitizer [[sanitizer|sanitizer]] stops the program at the exact line of an out-of-bounds access and prints a detailed report. It is one of the most valuable debugging tools in C++.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal checks by default (in development)',
          text: 'Unreal\'s `TArray` checks every `[]` index in Debug and Development builds and halts with an *array index out of bounds* assertion naming the index and the size. The check is compiled out of Shipping builds for speed. Same trade-off as C++, different default: safety while you develop, zero cost when you ship.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This loop is meant to refill every ammo slot. Tap the line that causes undefined behavior.',
      code: `#include <iostream>

int main() {
    int ammo[5]{0, 12, 0, 30, 7};
    for (int i = 0; i <= 5; ++i) {
        ammo[i] = 30;
    }
    std::cout << ammo[0] << '\\n';
}`,
      bugLines: [5],
      hint: 'What is the last value of `i` inside the loop, and is it a valid index?',
      explanation:
        'With `i <= 5` the loop also runs for `i == 5`, and `ammo[5]` is one element past the end of a five-element array. That write is undefined behavior; it may corrupt a neighbouring variable without any visible symptom. Use `i < 5`, or better, `i < std::size(ammo)` or a range-based `for (int& slot : ammo)`, which cannot go out of bounds.',
    },
    {
      kind: 'concept',
      title: '2D arrays: a tile map',
      blocks: [
        {
          type: 'p',
          text: 'Grids are everywhere in games: tile maps, inventories, chess boards, heightmaps. A 2D array is an *array of arrays*: `int tiles[4][6]` is 4 rows, each an array of 6 `int`s. `tiles[row][col]` picks the row first, then the column within it.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

constexpr int kRows = 4;
constexpr int kCols = 6;

int main() {
    int tiles[kRows][kCols]{
        {1, 1, 1, 1, 1, 1},
        {1, 0, 0, 0, 2, 1},
        {1, 0, 1, 0, 0, 1},
        {1, 1, 1, 1, 1, 1},
    };

    int walls = 0;
    for (int row = 0; row < kRows; ++row) {
        for (int col = 0; col < kCols; ++col) {
            int tile = tiles[row][col];
            if (tile == 1) {
                ++walls;
            }
            std::cout << (tile == 1 ? '#' : tile == 2 ? '$' : '.');
        }
        std::cout << '\\n';
    }
    std::cout << "Walls: " << walls << '\\n';
}`,
          output: '######\n#...$#\n#.#..#\n######\nWalls: 17',
          annotations: [
            { lines: '3-4', text: 'The dimensions are `constexpr`, so they are compile-time constants usable as array sizes, and the loops below use the same names.' },
            { lines: '7-12', text: 'One inner brace list per row. 1 is a wall, 0 is floor, 2 is treasure.' },
            { lines: '16-17', text: 'Rows in the outer loop, columns in the inner loop: this visits memory in exactly the order it is stored.' },
            { lines: 22, text: 'A nested conditional operator picks the character to draw for each tile.' },
          ],
        },
        {
          type: 'p',
          text: 'C++ stores 2D arrays in **row-major** order: all of row 0, then all of row 1, and so on, as one contiguous block. Element `[r][c]` therefore lives at offset `r × kCols + c` from the start.',
        },
        {
          type: 'memory',
          caption: 'int grid[2][3]{{1, 2, 3}, {4, 5, 6}} is one block of six ints.',
          regions: [
            {
              label: 'Contiguous memory, row-major',
              kind: 'stack',
              cells: [
                { name: '[0][0]', value: '1', address: '+0' },
                { name: '[0][1]', value: '2', address: '+4' },
                { name: '[0][2]', value: '3', address: '+8' },
                { name: '[1][0]', value: '4', address: '+12', highlight: true },
                { name: '[1][1]', value: '5', address: '+16' },
                { name: '[1][2]', value: '6', address: '+20' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Loop order matters',
          text: 'Looping rows-outer, columns-inner walks memory sequentially, which the CPU cache loves. Swapping the loops jumps `kCols` elements ahead on every step; on large grids that can be several times slower, for identical results. The next lesson explains why, under *cache locality*.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Many engines use a flat array instead',
          text: 'Because a 2D array is really one block, many programs store grids as a single 1D array of `rows × cols` elements and compute the index themselves: `tiles[row * kCols + col]`. It is easy to resize, pass around and serialize. Unreal\'s landscape heightmaps and texture data are stored this way.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `int grid[2][3]{{1, 2, 3}, {4, 5, 6}};
std::cout << grid[1][0] + grid[0][2] << '\\n';`,
      options: [
        { text: '5', why: 'That reads `grid[1][0]` as the second element of the first row (2). The first index picks the **row**, so `grid[1][0]` is 4.' },
        { text: '6', why: '6 is `grid[1][2]`, the last element, but neither expression refers to it: `grid[1][0]` is the *first* element of row 1.' },
        { text: '7', correct: true, why: '`grid[1][0]` is row 1, column 0: the 4. `grid[0][2]` is row 0, column 2: the 3. 4 + 3 = 7.' },
        { text: 'It does not compile: 2D arrays need nested loops', why: 'You can index any single element directly. Loops are only needed to visit many elements.' },
      ],
      explanation:
        'In `grid[r][c]` the first index selects a row (an inner array) and the second selects an element within that row. Both are zero-based, so `grid[1][0]` is the first element of the second row.',
    },
    {
      kind: 'concept',
      title: 'Arrays and functions: decay',
      blocks: [
        {
          type: 'p',
          text: 'C arrays have one more surprise. When you pass one to a function, the array is **not** copied, and its size does not come with it. The array *decays* into the address of its first element: a [[pointer|pointer]], a type the next unit covers in depth. This is called [[array-decay|array decay]].',
        },
        {
          type: 'code',
          code: `void printScores(int scores[5]) {      // the 5 is ignored!
    // sizeof(scores) is the size of a pointer (8),
    // not 5 * sizeof(int). std::size(scores) won't compile.
    for (int i = 0; i < 5; ++i) {
        std::cout << scores[i] << ' ';
    }
}

void printScores(const int scores[], std::size_t count);`,
          annotations: [
            { lines: 1, text: 'Despite the `[5]`, the compiler treats this parameter as `int* scores`. You could pass an array of 3 elements and it would compile.' },
            { lines: '2-3', text: 'GCC warns about this exact mistake (`-Wsizeof-array-argument`), but only for `sizeof`; indexing past the real size gets no warning at all.' },
            { lines: 9, text: 'The traditional C workaround: pass the element count as a separate parameter and hope callers get it right.' },
          ],
        },
        {
          type: 'list',
          items: [
            'Arrays **decay** when passed, losing their size.',
            'They cannot be **assigned** (`a = b`) or meaningfully **compared** (`a == b` compares addresses).',
            'They cannot be **returned** from a function.',
            'There is no `.size()` and no **checked access** option.',
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Why arrays behave this way',
          text: 'This all comes from C, designed in the early 1970s for machines with a few kilobytes of memory. Copying an array into every function call was unthinkable, so the language passes its address instead, and an array name turns into that address almost everywhere. C++ kept the rule for compatibility with C code, and added `std::array` so that you do not have to live with it.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'std::span: the modern parameter type',
          text: 'C++20\'s `std::span<const int>` (from `<span>`) is a lightweight view of *any* contiguous sequence (a C array, a `std::array` or a `std::vector`) that carries the pointer and the size together. A function taking `std::span<const int> scores` can use `scores.size()` and range-for safely, regardless of what the caller passed.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Inside `void f(int arr[10])`, the expression `sizeof(arr)` equals `10 * sizeof(int)`.',
      answer: false,
      explanation:
        'An array parameter is adjusted to a pointer, so `arr` has type `int*` and `sizeof(arr)` is the size of a pointer (8 bytes on 64-bit platforms), regardless of the `[10]`. GCC warns about exactly this. Only where the actual array is in scope does `sizeof` measure the whole array.',
    },
    {
      kind: 'concept',
      title: 'std::array: a fixed-size array that behaves',
      blocks: [
        {
          type: 'p',
          text: '[[std-array]] (from `<array>`) wraps a C array in a small standard type. It has exactly the same memory layout and speed (the elements are stored inline, contiguously, with no heap allocation), but it behaves like a normal value: it knows its size, can be copied, assigned and compared, and never decays.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <array>
#include <iostream>

int main() {
    std::array<int, 5> scores{90, 75, 60, 85, 100};
    std::cout << "Count: " << scores.size() << '\\n';
    std::cout << "First: " << scores.front()
              << ", last: " << scores.back() << '\\n';

    std::array<int, 5> backup = scores;
    scores.fill(0);
    std::cout << "After reset: " << scores[0]
              << ", backup: " << backup[0] << '\\n';
    std::cout << std::boolalpha << (scores == backup) << '\\n';
}`,
          output: 'Count: 5\nFirst: 90, last: 100\nAfter reset: 0, backup: 90\nfalse',
          annotations: [
            { lines: 5, text: 'The element type and the size are both part of the type: `std::array<int, 5>`. The size must still be a compile-time constant.' },
            { lines: 6, text: '`size()` is always right, and it travels with the array wherever it goes.' },
            { lines: 10, text: 'A real element-by-element copy, which a C array cannot do with `=`.' },
            { lines: 11, text: '`fill` sets every element to one value: handy for resetting a hotbar or a scoreboard.' },
            { lines: 14, text: '`==` compares the **contents**. `std::boolalpha` prints `bool`s as `true`/`false` instead of `1`/`0`.' },
          ],
        },
        {
          type: 'heading',
          text: 'Checked and unchecked access',
        },
        {
          type: 'code',
          code: `std::array<int, 3> ammo{30, 30, 30};

ammo[3] = 0;      // unchecked: undefined behavior
ammo.at(3) = 0;   // checked: throws std::out_of_range`,
          annotations: [
            { lines: 3, text: '`operator[]` is exactly as fast, and exactly as unchecked, as on a C array.' },
            { lines: 4, text: '`at()` checks the index and throws an [[exception|exception]] instead of corrupting memory. Exceptions get their own unit; for now, an uncaught one stops the program with a clear message.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'What happens if at() throws and nothing catches it (GCC)',
          code: `terminate called after throwing an instance of 'std::out_of_range'
  what():  array::at: __n (which is 3) >= _Nm (which is 3)`,
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why std::array is a zero-cost upgrade',
          text: '`std::array` is essentially a struct containing a C array, plus member functions that the compiler inlines away. There is no extra memory and no hidden work: `scores[i]` compiles to the same instruction as on a C array. You gain safety and convenience for free, which is why modern C++ guidelines recommend it over raw C arrays.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Let the compiler count',
          text: 'Since C++17, *class template argument deduction* lets you omit the template arguments: `std::array weights{1.5, 2.0, 0.5};` deduces `std::array<double, 3>`.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: '`std::array<int, 5> slots{};` What happens on `slots.at(5) = 1;` compared with `slots[5] = 1;`?',
      options: [
        { text: 'Both silently write past the end of the array', why: '`at()` exists precisely to avoid this: it validates the index first.' },
        { text: '`at(5)` throws `std::out_of_range`; `slots[5]` is undefined behavior', correct: true, why: '`at()` is the checked accessor. `operator[]` stays unchecked for speed, just like a C array.' },
        { text: 'Both throw `std::out_of_range`', why: '`operator[]` performs no check at all. That is a deliberate performance choice.' },
        { text: 'Neither compiles, because the compiler knows the size is 5', why: 'Indices are run-time values in general, so these compile. (Some compilers can warn when a constant index is obviously out of range.)' },
      ],
      explanation:
        'Valid indices for five elements are 0 to 4. `std::array` gives you a choice: `[]` for zero-overhead access when you know the index is valid (for example inside a correctly bounded loop), and `at()` when the index comes from somewhere you do not fully trust, such as save files or player input.',
    },
    {
      kind: 'concept',
      title: 'Passing std::array, and why to prefer it',
      blocks: [
        {
          type: 'p',
          text: 'Because a `std::array` is a real value, passing it **by value copies every element**, unlike a C array, which decays. So the guideline from the functions unit applies directly: `const&` to read it, `&` to modify it.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <array>
#include <cstddef>
#include <iostream>

constexpr std::size_t kPartySize = 4;

void healAll(std::array<int, kPartySize>& hp, int amount) {
    for (int& h : hp) {
        h += amount;
    }
}

int totalHp(const std::array<int, kPartySize>& hp) {
    int sum = 0;
    for (int h : hp) {
        sum += h;
    }
    return sum;
}

int main() {
    std::array<int, kPartySize> party{40, 25, 60, 10};
    healAll(party, 15);
    std::cout << "Party HP: " << totalHp(party) << '\\n';
}`,
          output: 'Party HP: 195',
          annotations: [
            { lines: 7, text: 'Non-const reference: `healAll` modifies the caller\'s array in place. No copy.' },
            { lines: 8, text: '`int& h` makes each loop variable a reference to an element, so `h += amount` changes the array itself, not a copy of the element.' },
            { lines: 13, text: '`const&`: read the array without copying its elements.' },
            { lines: 22, text: 'The size is part of the type, so passing an array of 3 or 5 elements here would be a compile error, not a silent bug.' },
          ],
        },
        {
          type: 'table',
          headers: ['Feature', 'C array `int a[5]`', '`std::array<int, 5>`'],
          rows: [
            ['Memory and speed', 'Contiguous, no heap', 'Identical'],
            ['Knows its size', 'Only in its own scope', '`a.size()`, always'],
            ['Passed to a function', 'Decays to a pointer, size lost', 'By value (copy) or by reference, size kept'],
            ['Copy / assign with `=`', 'No', 'Yes'],
            ['Compare with `==`', 'Compares addresses (deprecated in C++20)', 'Compares contents'],
            ['Return from a function', 'No', 'Yes'],
            ['Checked access', 'No', '`a.at(i)`'],
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Fixed-size arrays in Unreal',
          text: 'Unreal has `TStaticArray<T, N>`, its equivalent of `std::array`, but in practice most gameplay code uses `TArray` even for small fixed collections, because `TArray` integrates with reflection, Blueprints and serialization. You will still meet C arrays in low-level engine code and in tightly packed data structures.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'An 8 × 8 tile map is stored as one flat `std::array` in row-major order. Complete the index calculation.',
      template: `constexpr int kCols = 8;

int tileAt(const std::array<int, 64>& tiles, int row, int col) {
    return tiles[___ * kCols + ___];
}`,
      blanks: [{ answers: ['row'] }, { answers: ['col'] }],
      wordBank: ['row', 'col', 'kCols', '64', 'tiles'],
      explanation:
        'Row-major order stores each row of `kCols` tiles one after another. To reach row `row`, skip `row * kCols` tiles; then step `col` tiles into that row. This is exactly the offset the compiler computes for a built-in 2D array `tiles[row][col]`.',
    },
    {
      kind: 'mcq',
      prompt: 'Which declaration fits a function that adds 10 to every element of the caller\'s `std::array<int, 10>`?',
      codeOptions: true,
      options: [
        { text: 'void buffAll(std::array<int, 10> hp);', why: 'By value: the function receives a copy of all ten elements, buffs the copy, and the caller sees no change.' },
        { text: 'void buffAll(std::array<int, 10>& hp);', correct: true, why: 'A non-const reference: no copy, and changes affect the caller\'s array.' },
        { text: 'void buffAll(const std::array<int, 10>& hp);', why: 'No copy, but `const` forbids modifying the elements, so the buffs would not compile.' },
        { text: 'void buffAll(std::array<int> hp);', why: 'The size is part of `std::array`\'s type and cannot be left out.' },
      ],
      explanation:
        'Unlike a C array, a `std::array` follows the normal value rules: by value copies, `&` modifies the original, `const&` reads without copying. Choose exactly as you would for any other type, based on whether the function needs to change the caller\'s data.',
    },
  ],
  takeaways: [
    'An array stores a fixed number of same-typed elements contiguously; indices run from 0 to size − 1, and the size must be a compile-time constant.',
    '`int a[4];` inside a function is uninitialized; `int a[4]{};` zeroes everything; a short initializer list zero-fills the rest.',
    'C++ never checks array indices: out-of-bounds access is undefined behavior. Watch for `<=` off-by-one errors, and use AddressSanitizer while developing.',
    'C arrays decay to a pointer when passed to a function, losing their size; they also cannot be assigned, compared by value or returned.',
    '2D arrays are row-major: element `[r][c]` is at offset `r * cols + c`. Loop rows outer, columns inner.',
    '`std::array` has the same layout and speed as a C array but knows its size, copies, compares and offers checked `at()`. Prefer it, and pass it by `const&` or `&`.',
  ],
  reading: [
    {
      title: 'std::array',
      url: 'https://en.cppreference.com/w/cpp/container/array',
      source: 'cppreference',
      note: 'Every member function of `std::array`, plus notes on its aggregate initialization.',
    },
    {
      title: 'Array declaration',
      url: 'https://en.cppreference.com/w/cpp/language/array',
      source: 'cppreference',
      note: 'The precise rules for C arrays, including initialization and array-to-pointer conversion.',
    },
    {
      title: 'Introduction to std::array',
      url: 'https://www.learncpp.com/cpp-tutorial/introduction-to-stdarray/',
      source: 'learncpp',
      note: 'A gentle chapter on `std::array` with extra exercises on passing arrays to functions.',
    },
    {
      title: 'AddressSanitizer',
      url: 'https://github.com/google/sanitizers/wiki/AddressSanitizer',
      source: 'other',
      note: 'How the sanitizer that catches out-of-bounds accesses works, and how to enable it.',
    },
  ],
};
