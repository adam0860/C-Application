import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-pointers-arrays-const',
  title: 'Pointer Arithmetic, Arrays and const Pointers',
  summary: 'Moving through memory element by element, why arrays decay into pointers, and how to read `const int*` versus `int* const`.',
  minutes: 18,
  objectives: [
    'Use pointer arithmetic to move between array elements, and explain why it is scaled by element size',
    'Explain array decay and its consequences, including the lost array size',
    'Iterate over an array with begin and one-past-the-end pointers, and recognize out-of-bounds undefined behavior',
    'Read `const int*`, `int* const` and `const int* const` from right to left and say what each forbids',
    'Apply const correctness to pointer parameters',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Pointer arithmetic: moving by elements',
      blocks: [
        {
          type: 'p',
          text: 'The elements of an [[array]] sit side by side in [[contiguous-memory]]. That makes it meaningful to step from one element to the next with a pointer. Adding an integer to a pointer moves it by that many **elements**, not bytes: if `p` points at an `int`, then `p + 1` points at the next `int`, 4 bytes further on. This is called [[pointer-arithmetic]].',
        },
        {
          type: 'code',
          title: 'arith.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int ammo[4]{30, 12, 8, 0};
    int* p = &ammo[0];

    std::cout << *p << '\\n';           // 30
    std::cout << *(p + 2) << '\\n';     // two ints further
    ++p;                               // now at ammo[1]
    std::cout << *p << '\\n';           // 12
    std::cout << p[1] << '\\n';         // means *(p + 1)
    std::cout << (p - &ammo[0]) << '\\n';  // elements apart
}`,
          output: '30\n8\n12\n8\n1',
          annotations: [
            { lines: 8, text: '`p + 2` is the address two elements along (8 bytes further for 4-byte ints). The parentheses matter: `*p + 2` would mean "the value at `p`, plus 2".' },
            { lines: 9, text: '`++p` moves the pointer itself one element forward. The array is unchanged.' },
            { lines: 11, text: 'Subscripting a pointer is defined as arithmetic plus dereference: `p[i]` means exactly `*(p + i)`.' },
            { lines: 12, text: 'Subtracting two pointers into the same array gives the distance in elements (as a `std::ptrdiff_t`), not in bytes.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Four ints at consecutive addresses. `p + 2` is not a variable — it is a computed address, shown here for comparison.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { id: 'a0', name: 'ammo[0]', type: 'int', value: '30', address: '0x1000' },
                { id: 'a1', name: 'ammo[1]', type: 'int', value: '12', address: '0x1004' },
                { id: 'a2', name: 'ammo[2]', type: 'int', value: '8', address: '0x1008', highlight: true },
                { name: 'ammo[3]', type: 'int', value: '0', address: '0x100C' },
                { name: 'p', type: 'int*', value: '0x1000', pointsTo: 'a0' },
                { name: 'p + 2', type: 'int*', value: '0x1008', pointsTo: 'a2' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why arithmetic counts elements, not bytes',
          text: 'Because the pointer\'s type already knows the element size, the compiler can do the multiplication for you: `p + i` becomes "address plus `i * sizeof(int)`". The same loop then works for arrays of `int`, `double` or 64-byte particle structs without change. It also maps directly onto CPU addressing modes, which compute "base + index × scale" in a single instruction.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Only within one array',
          text: 'Pointer arithmetic is only defined while the result stays inside the same array (or exactly one past its end, as you will see shortly). Stepping a pointer from one unrelated variable to another, or before the first element, is [[undefined-behavior]] even if you never dereference it.',
        },
        {
          type: 'deepdive',
          title: 'a[i] is really *(a + i)',
          blocks: [
            {
              type: 'p',
              text: 'The built-in subscript operator is *defined* in terms of pointer arithmetic: `a[i]` is `*(a + i)`. Since addition is commutative, `i[a]` is technically the same thing, so `2[ammo]` compiles and yields `ammo[2]`. It is a fun piece of trivia and a terrible idea in real code.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: '`double* d` holds the address `0x1000`, and `sizeof(double)` is 8. What address does `d + 3` hold?',
      options: [
        { text: '`0x1003`', why: 'That would be adding 3 *bytes*. Pointer arithmetic adds whole elements.' },
        { text: '`0x1018`', correct: true, why: '3 elements × 8 bytes = 24 bytes, and 24 in hexadecimal is `0x18`. So `0x1000 + 0x18 = 0x1018`.' },
        { text: '`0x1024`', why: 'Right byte count (24), wrong base: 24 is a decimal number, and addresses are written in hexadecimal, where 24 is `0x18`.' },
        { text: '`0x100C`', why: 'That assumes 4-byte elements (3 × 4 = 12 = `0xC`). A `double*` steps by `sizeof(double)`, which is 8 here.' },
      ],
      explanation:
        'The compiler scales by the pointee size: `d + 3` means "3 doubles further", i.e. `0x1000 + 3 * 8` bytes. Remember to convert the byte offset to hexadecimal when reading addresses: 24 decimal is `0x18`.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Array decay',
      blocks: [
        {
          type: 'p',
          text: 'In almost every expression, the name of a C array is implicitly converted to a pointer to its first element. This is [[array-decay]]: `int* first = loot;` is the same as `int* first = &loot[0];`. Passing an array to a function decays it too — and the function receives only a pointer. The array\'s **size is lost**.',
        },
        {
          type: 'code',
          title: 'decay.cpp',
          runnable: true,
          code: `#include <iostream>

int sum(int* values, int count) {
    int total = 0;
    for (int i = 0; i < count; ++i) {
        total += values[i];
    }
    return total;
}

int main() {
    int loot[5]{90, 85, 70, 60, 99};
    int* first = loot;                  // decay: &loot[0]
    std::cout << (first == &loot[0]) << '\\n';
    std::cout << sizeof(loot) << ' ' << sizeof(first) << '\\n';
    std::cout << sum(loot, 5) << '\\n';  // decays again
}`,
          output: '1\n20 8\n404',
          annotations: [
            { lines: 3, text: 'A function cannot receive a C array by value: it gets a pointer to the first element, so the caller must pass the count separately.' },
            { lines: 13, text: 'No `&` needed: the array name converts to the address of element 0 automatically.' },
            { lines: 15, text: '`sizeof` is one of the few places an array does **not** decay: the array is 5 × 4 = 20 bytes, while the pointer is 8 bytes on a 64-bit platform.' },
            { lines: 16, text: 'Here the array decays to `int*` when passed. We will tighten this signature with `const` at the end of the lesson.' },
          ],
        },
        {
          type: 'p',
          text: 'The trap: writing the parameter with square brackets changes nothing. `void f(int scores[])` and even `void f(int scores[5])` are silently adjusted to `void f(int* scores)`:',
        },
        {
          type: 'code',
          code: `void printSize(int scores[5]) {   // really: int* scores
    std::cout << sizeof(scores);   // 8 (a pointer), not 20!
}`,
          annotations: [
            { lines: 1, text: 'The `5` is ignored entirely. Callers may pass an array of any length — or any `int*`.' },
            { lines: 2, text: 'GCC warns: "\'sizeof\' on array function parameter \'scores\' will return size of \'int*\'" — read your warnings!' },
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Why do arrays decay?',
          text: 'C inherited the behaviour from its predecessor B, where an array variable literally *was* a pointer to its storage. Dennis Ritchie kept the conversion when designing C so that old code kept working, and because copying whole arrays just to pass them to a function was unthinkable on 1970s hardware. C++ kept it for compatibility with C.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Prefer types that know their size',
          text: '[[std-array]] and [[std-vector]] never decay, know their own size, and can be passed by (const) reference. When you need the element count of a real C array in the same scope, use `std::size(loot)` (C++17) rather than `sizeof` arithmetic — `std::size` refuses to compile on a decayed pointer, so it cannot silently give a wrong answer.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'Inside `void f(int arr[10])`, the expression `sizeof(arr)` equals `10 * sizeof(int)`.',
      answer: false,
      explanation:
        'An array parameter is adjusted to a pointer: `int arr[10]` really declares `int* arr`, and the `10` is ignored. So `sizeof(arr)` is the size of a pointer (8 on 64-bit systems). Only in the scope where the array itself is declared does `sizeof` see the whole array.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Walking an array with begin and end pointers',
      blocks: [
        {
          type: 'p',
          text: 'A classic way to visit every element is with two pointers: `begin` at the first element and `end` **one past the last**. Loop while `p != end`. The language specifically allows you to form and compare a [[one-past-the-end]], but never to dereference it.',
        },
        {
          type: 'code',
          title: 'walk.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int damage[]{12, 40, 7, 33};
    int* begin = damage;        // &damage[0]
    int* end = damage + 4;      // one past the last element

    int strongest = *begin;
    for (int* p = begin; p != end; ++p) {
        if (*p > strongest) {
            strongest = *p;
        }
    }
    std::cout << "Strongest hit: " << strongest << '\\n';
    std::cout << "Hits: " << (end - begin) << '\\n';
}`,
          output: 'Strongest hit: 40\nHits: 4',
          annotations: [
            { lines: 6, text: '`end` points just beyond `damage[3]`. It is a valid value to compare against, not an element.' },
            { lines: 9, text: 'Start at `begin`, stop when you reach `end`, step one element at a time. `end` itself is never dereferenced.' },
            { lines: 15, text: 'The half-open range `[begin, end)` makes the count a simple subtraction, and an empty range is just `begin == end`.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Mid-loop: `p` is visiting `damage[1]`; `end` marks the boundary.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { id: 'd0', name: 'damage[0]', type: 'int', value: '12', address: '0x1000' },
                { id: 'd1', name: 'damage[1]', type: 'int', value: '40', address: '0x1004', highlight: true },
                { name: 'damage[2]', type: 'int', value: '7', address: '0x1008' },
                { name: 'damage[3]', type: 'int', value: '33', address: '0x100C' },
                { id: 'past', value: '(one past the end — never read)', address: '0x1010' },
                { name: 'begin', type: 'int*', value: '0x1000', pointsTo: 'd0' },
                { name: 'p', type: 'int*', value: '0x1004', pointsTo: 'd1' },
                { name: 'end', type: 'int*', value: '0x1010', pointsTo: 'past' },
              ],
            },
          ],
        },
        {
          type: 'p',
          text: 'This begin/end pattern is not a curiosity: it is exactly how standard-library [[iterator|iterators]] and the range-based `for` loop work under the hood, as you will see in Unit 13.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Out of bounds means undefined behavior',
          text: 'Reading `damage[4]` or `*end` reads memory that is not part of the array. Nothing checks: you might get a neighbouring variable\'s value, garbage, a crash, or code the optimizer has "simplified" in baffling ways. Writing out of bounds is worse — it overwrites whatever lives next door. This is the classic **buffer overflow**.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why doesn\'t C++ check array bounds?',
          text: 'Zero overhead: a check on every access would add a compare and branch to the innermost loops of every program, including the ones that are already correct. C++ lets you opt in instead: `std::vector::at()` and `std::array::at()` throw on a bad index, standard-library debug modes (such as `-D_GLIBCXX_ASSERTIONS` or MSVC debug builds) check `operator[]`, and AddressSanitizer, a [[sanitizer]] built into GCC and Clang, catches out-of-bounds accesses at run time.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: '`TArray`\'s `operator[]` asserts with "Array index out of bounds" in Debug and Development builds, which catches most of these bugs during testing. Those checks are compiled out of Shipping builds for speed, so an index bug that slips through behaves just like a raw out-of-bounds access in the released game.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'order',
      prompt: 'Order the lines to print every element of the array `hp`, which holds `count` ints.',
      lines: [
        'int* begin = hp;',
        'int* end = begin + count;',
        'for (int* p = begin; p != end; ++p) {',
        '    std::cout << *p << \'\\n\';',
        '}',
      ],
      distractors: ['int* end = begin + count - 1;', 'for (int* p = begin; p <= end; ++p) {'],
      explanation:
        '`end` must be computed from `begin` (so `begin` comes first) and must be **one past** the last element, so `begin + count` is right. With `count - 1`, the `p != end` loop would stop before the last element. Using `p <= end` with a one-past-the-end pointer would dereference `end` — reading outside the array.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'bug',
      prompt: 'This program has undefined behavior and may print a wrong total. Tap the faulty line.',
      code: `#include <iostream>

int main() {
    int scores[3]{120, 340, 90};
    int* end = scores + 3;
    int total = 0;
    for (int* p = scores; p <= end; ++p) {
        total += *p;
    }
    std::cout << total << '\\n';
}`,
      bugLines: [7],
      hint: 'How many times does the loop body run? Which address does `p` hold on the last iteration?',
      explanation:
        'With `p <= end`, the loop runs four times, and the last iteration dereferences `end` — one past the last element — reading memory that is not part of `scores`. That is undefined behavior: the total may include garbage, or the program may appear fine today and misbehave after an unrelated change. Use `p != end` (or `p < end`) with a one-past-the-end pointer.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'const and pointers: two things to protect',
      blocks: [
        {
          type: 'p',
          text: 'A pointer involves two objects: the pointer itself and the thing it points to. `const` can protect either one, or both, depending on where you write it. The reliable way to decode a declaration is to **read it from right to left**, starting at the name:',
        },
        {
          type: 'table',
          headers: ['Declaration', 'Read right to left', 'Change `*p`?', 'Change `p`?'],
          rows: [
            ['`int* p`', '"p is a pointer to int"', 'Yes', 'Yes'],
            ['`const int* p`', '"p is a pointer to int that is const"', 'No', 'Yes'],
            ['`int* const p`', '"p is a const pointer to int"', 'Yes', 'No'],
            ['`const int* const p`', '"p is a const pointer to int that is const"', 'No', 'No'],
          ],
        },
        {
          type: 'code',
          code: `int gold = 100;
int gems = 5;

const int* viewer = &gold;  // pointer to const int
// *viewer = 50;            // error: read-only through viewer
viewer = &gems;             // OK: may point elsewhere

int* const slot = &gold;    // const pointer to int
*slot = 50;                 // OK: may modify gold
// slot = &gems;            // error: slot cannot be re-aimed

const int* const sealed = &gold;
// *sealed = 1;             // error
// sealed = &gems;          // error`,
          annotations: [
            { lines: '4-6', text: 'A **pointer to const** is a read-only view. It can move between objects, but cannot be used to modify any of them.' },
            { lines: '8-10', text: 'A **const pointer** is welded to one object, but the object can be modified through it.' },
            { lines: 12, text: 'Both protections at once: neither the pointer nor the pointee can change through `sealed`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'The rule behind the trick',
          text: '`const` applies to whatever is immediately to its **left**; if nothing is on its left, it applies to what is on its right. So `const int*` and `int const*` mean the same thing (some codebases prefer the second form, nicknamed "east const", because it always follows the rule).',
        },
        {
          type: 'p',
          text: 'Two subtleties. First, a pointer to const does not make the object const: `gold = 7;` still works, and so would writing through some other `int*`. It only restricts **this** access path. Second, adding `const` is always allowed (`int*` converts to `const int*` implicitly), but removing it is not, because that would break a promise.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why two kinds of const?',
          text: 'They protect different things. "Don\'t modify the data" (`const int*`) is a contract between a function and its caller — it is the pointer version of a [[const-reference|const reference]] and you will use it constantly. "Don\'t re-aim the handle" (`int* const`) is mostly a local-variable safeguard. See [[const-pointer|pointer to const vs const pointer]] for a summary card.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'A HUD widget must be able to switch between displaying different players\' scores, but must never modify a score. Which declaration fits?',
      codeOptions: true,
      options: [
        { text: 'int* const shown = &p1Score;', why: 'This is the reverse: the pointer is stuck on `p1Score` forever, and the score *can* be modified through it.' },
        { text: 'const int* shown = &p1Score;', correct: true, why: 'Read right to left: "shown is a pointer to an int that is const". It can be re-aimed, but cannot modify what it points to.' },
        { text: 'const int* const shown = &p1Score;', why: 'Read-only, yes, but the trailing `const` also prevents switching to another player\'s score.' },
        { text: 'int* shown = &p1Score;', why: 'It can switch targets, but nothing stops the widget from modifying a score by accident.' },
      ],
      explanation:
        'The requirement has two parts: the *pointer* must be changeable (switch players) and the *pointee* must be protected (never modify scores). `const` to the left of `*` protects the pointee; `const` to the right of `*` would freeze the pointer. So `const int*` (equivalently `int const*`) is the match.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'const correctness with pointers',
      blocks: [
        {
          type: 'p',
          text: '[[const-correctness|Const correctness]] means marking everything that should not change as `const`, so the compiler enforces it. For pointer parameters the rule is simple: if a function only **reads** through a pointer, take `const T*`. Let\'s fix the `sum`-style signature from earlier:',
        },
        {
          type: 'code',
          title: 'const-params.cpp',
          runnable: true,
          code: `#include <iostream>

int highest(const int* values, int count) {
    int best = values[0];
    for (const int* p = values + 1; p != values + count; ++p) {
        if (*p > best) {
            best = *p;
        }
    }
    return best;
}

void doubleAll(int* values, int count) {
    for (int* p = values; p != values + count; ++p) {
        *p *= 2;
    }
}

int main() {
    const int highScores[3]{900, 1500, 1200};
    int combo[3]{2, 5, 3};

    std::cout << highest(highScores, 3) << '\\n';
    std::cout << highest(combo, 3) << '\\n';
    doubleAll(combo, 3);
    // doubleAll(highScores, 3);   // error: would drop const
    std::cout << combo[0] << ' ' << combo[1] << ' '
              << combo[2] << '\\n';
}`,
          output: '1500\n5\n4 10 6',
          annotations: [
            { lines: 3, text: 'The signature now promises "I only read". Any accidental `*p = ...` inside becomes a compile error.' },
            { lines: 13, text: '`doubleAll` genuinely modifies elements, so it must take a plain `int*` — and the signature honestly says so.' },
            { lines: 20, text: 'A truly read-only array. It decays to `const int*`, which can never be passed where an `int*` is expected.' },
            { lines: 24, text: '`int*` converts to `const int*` implicitly: adding a promise is always safe.' },
            { lines: 26, text: 'Removing a promise is not. Had `highest` taken `int*`, it could not accept `highScores` either — that is why read-only parameters must say `const`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why bother?',
          text: 'Const is a promise the compiler checks. It documents intent right in the signature, turns accidental writes into compile errors, and makes functions usable with read-only data. It is also contagious: one function that takes `int*` for read-only access forces every caller to have non-const data, so const correctness is easiest when applied from the start, bottom-up.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Epic\'s coding standard asks for const correctness throughout: engine getters such as `GetActorLocation()` are `const` member functions (Unit 9), read-only parameters are `const AActor*` or `const FVector&`, and Unreal\'s `TArrayView` / `TConstArrayView` play the same role as the `std::span` described below.',
        },
        {
          type: 'deepdive',
          title: 'std::span: pointer + count, done right (C++20)',
          blocks: [
            {
              type: 'p',
              text: 'The "pointer plus count" pair is so common that C++20 bundled it into `std::span` (header `<span>`): a lightweight, non-owning view of contiguous elements, much like [[string-view|`std::string_view`]] is for text. A `std::span<const int>` is the modern spelling of `const int* values, int count`:',
            },
            {
              type: 'code',
              code: `#include <span>

int highest(std::span<const int> values) {
    int best = values[0];
    for (int v : values) {
        if (v > best) {
            best = v;
        }
    }
    return best;
}

// highest(highScores);  // size deduced from the array
// highest(myVector);    // works with std::vector too`,
              annotations: [
                { lines: 3, text: 'The size travels with the pointer, so it can no longer be passed wrongly. `std::span<int>` would allow modification.' },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'fill',
      prompt: 'Complete this read-only function that sums `count` ints using a pointer loop.',
      template: `int total(___ int* values, int count) {
    int sum = 0;
    for (const int* p = values; p ___ values + count; ++p) {
        sum += ___p;
    }
    return sum;
}`,
      blanks: [{ answers: ['const'] }, { answers: ['!=', '<'] }, { answers: ['*'] }],
      wordBank: ['const', 'mutable', '!=', '<=', '*', '&'],
      explanation:
        '`const int*` promises the function only reads, so callers with const data can use it. The loop runs while `p` has not reached the one-past-the-end address (`!=` or `<`; `<=` would read past the end). Finally `*p` dereferences to get each value — `&p` would be the address of the pointer variable itself.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `int lvls[]{3, 6, 9, 12};
int* p = lvls + 1;
p += 2;
std::cout << *p - *(p - 2) << ' ' << (p - lvls) << '\\n';`,
      options: [
        { text: '6 3', correct: true, why: '`p` ends at `lvls + 3` (value 12); `p - 2` is `lvls + 1` (value 6); 12 − 6 = 6, and `p` is 3 elements from the start.' },
        { text: '6 12', why: 'Pointer subtraction gives a distance in **elements**, not bytes, so `p - lvls` is 3, not 12.' },
        { text: '2 3', why: 'This reads `*(p - 2)` as `*p - 2` (12 − 2 = 10). The parentheses move the pointer first, then dereference.' },
        { text: 'Undefined behavior: `p - 2` points before the array', why: '`p - 2` is `lvls + 1`, comfortably inside the array, so the arithmetic is well defined.' },
      ],
      explanation:
        'Trace the pointer: `lvls + 1` → `lvls + 3` after `+= 2`. `*p` is 12, `*(p - 2)` is `lvls[1]` = 6, so the difference is 6. Subtracting pointers into the same array yields an element count, 3. Pointer arithmetic is always in elements — both when adding and when subtracting.',
    },
  ],
  takeaways: [
    'Adding `n` to a pointer moves it `n` elements (`n * sizeof(T)` bytes); `p[i]` means `*(p + i)`, and subtracting pointers gives an element count.',
    'Arrays decay to a pointer to their first element in most expressions, so functions receiving them lose the size — pass a count, or better, use `std::array`, `std::vector` or `std::span`.',
    'Iterate with `[begin, end)`: a one-past-the-end pointer may be formed and compared, but never dereferenced.',
    'Raw arrays have no bounds checks; going out of bounds is undefined behavior, and checked alternatives such as `.at()` and sanitizers exist.',
    'Read declarations right to left: `const int*` protects the pointee, `int* const` protects the pointer, `const int* const` protects both.',
    'Take `const T*` for read-only pointer parameters; adding const is implicit, removing it is not.',
  ],
  reading: [
    {
      title: 'Pointer arithmetic and subscripting',
      url: 'https://www.learncpp.com/cpp-tutorial/pointer-arithmetic-and-subscripting/',
      source: 'learncpp',
      note: 'More worked examples of stepping through arrays with pointers.',
    },
    {
      title: 'Array declaration — array-to-pointer conversion',
      url: 'https://en.cppreference.com/w/cpp/language/array',
      source: 'cppreference',
      note: 'The precise rules for when arrays decay and when they do not.',
    },
    {
      title: 'Pointers and const',
      url: 'https://www.learncpp.com/cpp-tutorial/pointers-and-const/',
      source: 'learncpp',
      note: 'Practice reading every combination of `const` and `*`.',
    },
    {
      title: 'isocpp FAQ: Const correctness',
      url: 'https://isocpp.org/wiki/faq/const-correctness',
      source: 'isocpp',
      note: 'Why const correctness pays off, including the "read right to left" rule.',
    },
    {
      title: 'std::span',
      url: 'https://en.cppreference.com/w/cpp/container/span',
      source: 'cppreference',
      note: 'The C++20 replacement for passing a pointer and a count.',
    },
  ],
};
