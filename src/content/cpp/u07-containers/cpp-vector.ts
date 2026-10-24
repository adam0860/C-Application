import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-vector',
  title: 'std::vector in Depth',
  summary: 'The container you will use most: how it grows, what reallocation breaks, and why contiguous memory makes it so fast.',
  minutes: 20,
  objectives: [
    'Create, grow and shrink a `std::vector`, and explain how it differs from `std::array`',
    'Explain size vs capacity and why geometric growth makes `push_back` amortized O(1)',
    'Use `reserve` to avoid reallocations when the final size is known',
    'Compare `push_back` with `emplace_back`, and estimate the cost of `insert` and `erase`',
    'Predict when references and iterators into a vector are invalidated',
    'Explain why contiguous memory and cache locality make `std::vector` the default container, and map it to Unreal\'s `TArray`',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'A dynamic array',
      blocks: [
        {
          type: 'p',
          text: 'Enemies spawn and die, loot drops, chat messages arrive: most collections in a game do not have a size you know at compile time. [[std-vector]] (from `<vector>`) is a [[container|container]] that stores elements contiguously like an array, but can **grow and shrink while the program runs**.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> enemyHp{30, 45};
    enemyHp.push_back(60);
    enemyHp.push_back(25);

    std::cout << "Enemies: " << enemyHp.size() << '\\n';
    std::cout << "First: " << enemyHp[0]
              << ", last: " << enemyHp.back() << '\\n';

    enemyHp.pop_back();
    for (int hp : enemyHp) {
        std::cout << hp << ' ';
    }
    std::cout << '\\n';
    std::cout << std::boolalpha << enemyHp.empty() << '\\n';
}`,
          output: 'Enemies: 4\nFirst: 30, last: 25\n30 45 60\nfalse',
          annotations: [
            { lines: 5, text: 'Only the element type goes in the angle brackets; the size is not part of the type. Starts with two elements.' },
            { lines: '6-7', text: '`push_back` appends an element at the end, growing the vector by one.' },
            { lines: '9-11', text: '`size()`, `[]`, `front()` and `back()` work like on `std::array`. `[]` is unchecked; `at()` is the checked version.' },
            { lines: 13, text: '`pop_back` removes the last element. (Calling it on an empty vector is undefined behavior.)' },
            { lines: 18, text: '`empty()` is the clear way to ask "are there no elements?", rather than `size() == 0`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Parentheses vs braces',
          text: '`std::vector<int> v(5);` creates **five** elements, all zero. `std::vector<int> v{5};` creates **one** element with the value 5, because braces mean "these are the elements". Likewise `v(3, 100)` is three copies of 100, while `v{3, 100}` is the two elements 3 and 100. Use parentheses for a count, braces for a list of values.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Pass vectors like strings',
          text: 'A vector can own thousands of elements, so the functions unit\'s guideline applies: pass `const std::vector<int>&` to read, `std::vector<int>&` to modify. Passing by value copies every element.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'What a vector object really is',
      blocks: [
        {
          type: 'p',
          text: 'How can a variable on the stack hold a collection that grows? It does not hold the elements at all. A `std::vector` object is a small *handle*, typically 24 bytes on a 64-bit platform, containing three pieces of information: where its element buffer is, how many elements are in use, and how many fit in the buffer. The elements themselves live in a block of [[heap-memory|heap memory]] that the vector allocates and frees for you.',
        },
        {
          type: 'memory',
          caption: 'std::vector<int> enemyHp{30, 45, 60} with room for one more.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'enemyHp.data', type: 'int*', value: '0x5000', pointsTo: 'e0' },
                { name: 'enemyHp.size', type: 'size_t', value: '3' },
                { name: 'enemyHp.capacity', type: 'size_t', value: '4' },
              ],
            },
            {
              label: 'Heap — element buffer',
              kind: 'heap',
              cells: [
                { id: 'e0', name: '[0]', type: 'int', value: '30', address: '0x5000' },
                { name: '[1]', type: 'int', value: '45', address: '0x5004' },
                { name: '[2]', type: 'int', value: '60', address: '0x5008' },
                { name: '(unused)', type: 'int', value: '?', address: '0x500C' },
              ],
            },
          ],
        },
        {
          type: 'definition',
          term: 'Size vs capacity',
          text: '**Size** is the number of elements the vector contains. [[capacity|Capacity]] is the number of elements its current buffer can hold before it must allocate a bigger one. Always `size() <= capacity()`. The unused tail of the buffer holds no elements; you must never read it.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why separate the handle from the elements?',
          text: 'A stack frame has a fixed size decided at compile time, so a growing collection cannot live inside it. Keeping only a fixed-size handle on the stack and the elements on the heap gives the best of both: the vector itself is a normal local variable, destroyed automatically at the end of its scope (freeing the buffer), while the elements can grow without limit. Later you will see that this also makes *moving* a vector almost free: hand over the buffer address instead of copying elements.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `std::vector<int> a(3);
std::vector<int> b{3};
std::cout << a.size() << ' ' << b.size() << '\\n';`,
      options: [
        { text: '3 3', why: 'Braces do not mean "count" for a vector of `int`: they list the elements. `b` holds the single element 3.' },
        { text: '1 3', why: 'This is the two forms reversed. Parentheses take a count, braces take element values.' },
        { text: '3 1', correct: true, why: '`a(3)` makes three zero-valued elements; `b{3}` makes one element whose value is 3.' },
        { text: '1 1', why: '`a(3)` calls the "count" constructor, creating three elements.' },
      ],
      explanation:
        'When a type has a constructor taking an initializer list (as `std::vector` does), brace initialization prefers it, so `{3}` means "a vector containing 3". Parentheses select the other constructors, such as "n default-valued elements". This is one of the few places where braces and parentheses give different results, so it is worth memorizing.',
    },
    {
      kind: 'concept',
      title: 'Growth: capacity and reallocation',
      blocks: [
        {
          type: 'p',
          text: 'When you `push_back` and there is spare capacity, the new element simply goes into the next free slot: cheap. When `size() == capacity()`, the vector must **reallocate**:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Allocate a bigger buffer', text: 'Typically 1.5× or 2× the old capacity.' },
            { title: 'Move the elements', text: 'Every existing element is moved (or copied) into the new buffer.' },
            { title: 'Free the old buffer', text: 'The old block is released. Anything still referring into it now dangles.' },
            { title: 'Add the new element', text: 'Then update the data address, size and capacity.' },
          ],
        },
        {
          type: 'memory',
          caption: 'push_back(10) filled the last free slot, so push_back(25) must reallocate.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'enemyHp.data', type: 'int*', value: '0x7000', pointsTo: 'n0', highlight: true },
                { name: 'enemyHp.size', type: 'size_t', value: '4 → 5' },
                { name: 'enemyHp.capacity', type: 'size_t', value: '4 → 8' },
              ],
            },
            {
              label: 'Heap — old buffer (freed)',
              kind: 'other',
              cells: [{ name: '[0]–[3]', value: '30 45 60 10', address: '0x5000' }],
            },
            {
              label: 'Heap — new buffer',
              kind: 'heap',
              cells: [
                { id: 'n0', name: '[0]–[3]', value: '30 45 60 10 (moved)', address: '0x7000' },
                { name: '[4]', value: '25 (new)', address: '0x7010', highlight: true },
                { name: '[5]–[7]', value: '(unused)', address: '0x7014' },
              ],
            },
          ],
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> v;
    std::size_t lastCapacity = v.capacity();
    std::cout << "capacity: " << lastCapacity << '\\n';
    for (int i = 0; i < 20; ++i) {
        v.push_back(i);
        if (v.capacity() != lastCapacity) {
            lastCapacity = v.capacity();
            std::cout << "size " << v.size()
                      << " -> capacity " << lastCapacity << '\\n';
        }
    }
}`,
          annotations: [
            { lines: 10, text: 'A change in capacity means a reallocation just happened.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Output with GCC (libstdc++); other libraries differ',
          code: `capacity: 0
size 1 -> capacity 1
size 2 -> capacity 2
size 3 -> capacity 4
size 5 -> capacity 8
size 9 -> capacity 16
size 17 -> capacity 32`,
        },
        {
          type: 'p',
          text: 'The growth factor is implementation-defined: GCC\'s libstdc++ and Clang\'s libc++ double, while Microsoft\'s library grows by 1.5× (1, 2, 3, 4, 6, 9, 13, 19, …). Either way, growth is **geometric**: proportional to the current size, never a fixed number of slots.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why geometric growth? Amortized O(1)',
          text: 'With doubling, by the time you have pushed *n* elements the reallocations have moved at most 1 + 2 + 4 + … + n/2 < n elements in total. That is less than one extra move per element on average, so `push_back` is [[amortized-complexity|amortized]] constant time: O(1) on average, even though an individual push occasionally costs O(n). If the vector instead grew by a fixed 10 slots each time, pushing *n* elements would move about n²/20 elements, which is quadratic and ruinous for large *n*.',
        },
        {
          type: 'deepdive',
          title: '1.5× or 2×?',
          blocks: [
            {
              type: 'p',
              text: 'Doubling reallocates less often. A factor below the golden ratio (≈1.618), such as 1.5, has a subtle advantage: after a few growth steps, the combined size of the previously freed blocks becomes large enough to hold the next request, so a simple allocator can reuse that memory. With exactly 2×, each new block is always larger than all the old ones combined. Library authors have argued about this for decades; both choices give amortized O(1).',
            },
          ],
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Every call to `push_back` allocates new memory and copies all existing elements.',
      answer: false,
      explanation:
        'Only a `push_back` that finds the vector full (`size() == capacity()`) reallocates, and because capacity grows geometrically, that becomes exponentially rarer as the vector grows. Most pushes just construct one element in already-allocated space. That is why `push_back` is amortized O(1).',
    },
    {
      kind: 'concept',
      title: 'reserve, clear and reusing capacity',
      blocks: [
        {
          type: 'p',
          text: 'If you know roughly how many elements are coming, say 500 bullets in a bullet-hell wave, call `reserve(n)` first. It allocates a buffer for at least *n* elements in one go, and the standard guarantees no reallocation happens until the size exceeds that capacity. `reserve` changes **capacity only**: the vector still contains the same elements as before.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> bullets;
    bullets.reserve(100);
    std::cout << std::boolalpha;
    std::cout << "size " << bullets.size() << ", room for 100: "
              << (bullets.capacity() >= 100) << '\\n';

    const int* buffer = bullets.data();
    for (int i = 0; i < 100; ++i) {
        bullets.push_back(i);
    }
    std::cout << "buffer moved: " << (bullets.data() != buffer) << '\\n';

    bullets.clear();
    std::cout << "after clear: size " << bullets.size()
              << ", still room: " << (bullets.capacity() >= 100) << '\\n';
}`,
          output: 'size 0, room for 100: true\nbuffer moved: false\nafter clear: size 0, still room: true',
          annotations: [
            { lines: 6, text: 'One allocation up front. Size stays 0: no elements exist yet.' },
            { lines: 11, text: '`data()` returns the address of the element buffer. We remember it to prove it never changes.' },
            { lines: '12-14', text: 'A hundred pushes, zero reallocations: guaranteed, because the size never exceeds the reserved capacity.' },
            { lines: 17, text: '`clear()` destroys the elements but **keeps the buffer**. Refilling the vector next frame costs no allocation.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'reserve(n)',
            tone: 'neutral',
            code: `v.reserve(3);   // size 0, capacity >= 3
v.push_back(7); // OK: v[0] is now valid`,
            text: 'Makes room; creates **no** elements.',
          },
          right: {
            title: 'resize(n)',
            tone: 'neutral',
            code: `v.resize(3);    // size 3: {0, 0, 0}
v[2] = 7;       // OK: element exists`,
            text: 'Creates (or destroys) elements so that `size() == n`.',
          },
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Reuse buffers in hot code',
          text: 'Allocating and freeing every frame is a classic source of stutter. A common game pattern is a scratch vector that lives across frames: `clear()` it at the start of each frame and fill it again. After the first few frames its capacity settles and the loop performs no allocations at all. (`shrink_to_fit()` asks the vector to release unused capacity, but it is a non-binding request and itself reallocates.)',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'The same tools in TArray',
          text: 'Unreal\'s `TArray` has `Reserve(N)` too. It also makes the keep-or-free choice explicit: `Reset()` removes all elements but keeps the allocation (like `clear()`), while `Empty()` removes them and frees the memory unless you pass a slack size.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Make room for 500 bullets with a single allocation, without creating any bullets, then print how many bullets exist (it should print 0).',
      template: `std::vector<int> bullets;
bullets.___(500);
std::cout << bullets.___() << '\\n';`,
      blanks: [{ answers: ['reserve'] }, { answers: ['size'] }],
      wordBank: ['reserve', 'size', 'resize', 'capacity', 'push_back'],
      explanation:
        '`reserve(500)` allocates space without creating elements, so `size()` is still 0. `resize(500)` would create 500 zero-valued bullets (size 500), and printing `capacity()` would show at least 500, not the number of bullets that exist.',
    },
    {
      kind: 'bug',
      prompt: 'This code compiles but has undefined behavior. Tap the first line that causes it.',
      code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> damage;
    damage.reserve(3);
    damage[0] = 10;
    damage[1] = 25;
    damage[2] = 40;
    std::cout << damage.size() << '\\n';
}`,
      bugLines: [7],
      hint: 'After `reserve(3)`, how many elements does the vector contain?',
      explanation:
        '`reserve` allocates capacity but creates no elements, so the size is still 0 and `damage[0]` refers to an element that does not exist. `operator[]` does not check, so this is undefined behavior; typically it "works" while scribbling on unused buffer memory, and `size()` still prints 0. Use `push_back` (or `resize(3)` and then assign), or catch such mistakes with `at()`, which would throw.',
    },
    {
      kind: 'concept',
      title: 'push_back vs emplace_back',
      blocks: [
        {
          type: 'p',
          text: '`push_back(value)` takes an object that already exists and copies (or moves) it into the vector. `emplace_back(args...)` instead forwards its arguments to the element type\'s constructor and builds the new element **directly inside the vector\'s buffer**, with no temporary object at all. This is what [[emplace|emplace]] means across the standard library.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> banners;
    std::string title = "Boss Fight";
    banners.push_back(title);
    banners.emplace_back(5, '=');
    banners.emplace_back("Victory");
    for (const std::string& b : banners) {
        std::cout << b << '\\n';
    }
}`,
          output: 'Boss Fight\n=====\nVictory',
          annotations: [
            { lines: 8, text: '`title` already exists, so it is copied in. `title` itself is unchanged.' },
            { lines: 9, text: 'The arguments `(5, \'=\')` go straight to `std::string`\'s "count, character" constructor, building `"====="` in place. `push_back(5, \'=\')` would not even compile: `push_back` takes exactly one element.' },
            { lines: 10, text: 'Constructs the string from the literal right in the buffer, avoiding a temporary `std::string`.' },
            { lines: 11, text: 'Read elements through `const&` to avoid copying each string in the loop.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Which one should you use?',
          text: 'Use `push_back` when you already have the object; it says exactly what happens. Use `emplace_back` when you are constructing a new element from constructor arguments. For simple types like `int` there is no difference at all. Beware one subtlety: `emplace_back` will happily call constructors that `push_back` would refuse to use implicitly, so `push_back` is the safer default.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Add and Emplace',
          text: 'The `TArray` equivalents are `Add` (copy or move an existing element in) and `Emplace` (construct in place from arguments). Epic\'s documentation makes the same point as this card: `Emplace` is never less efficient than `Add`, but `Add` can read more clearly, especially for simple types.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Given `std::vector<std::string> names;`, what does `names.emplace_back(3, \'z\');` add?',
      options: [
        { text: 'Two elements: `"3"` and `"z"`', why: 'All arguments to one `emplace_back` call construct a **single** element. Adding two elements takes two calls.' },
        { text: 'One element: `"zzz"`', correct: true, why: 'The arguments are forwarded to `std::string`\'s constructor taking a count and a character, building `"zzz"` directly in the vector.' },
        { text: 'One element: `"3z"`', why: 'The arguments are not concatenated as text; they are passed to a constructor, and `(3, \'z\')` means "3 copies of z".' },
        { text: 'Nothing: it does not compile, because a string needs a single argument', why: 'That would be true of `push_back`, which takes one finished element. `emplace_back` accepts any arguments that a constructor of the element type accepts.' },
      ],
      explanation:
        '`emplace_back(args...)` means "construct one new element as if by `std::string(args...)`, in place". Here that is `std::string(3, \'z\')`, which is `"zzz"`. Knowing this, you can read emplace calls by mentally writing out the constructor call.',
    },
    {
      kind: 'concept',
      title: 'insert and erase: the cost of keeping order',
      blocks: [
        {
          type: 'p',
          text: 'Adding or removing at the **end** is cheap. Anywhere else, the vector must keep its elements contiguous and in order, so every element after the position has to shift by one. Inserting at the front of a 10,000-element vector moves 10,000 elements: O(n).',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <vector>

void print(const std::vector<int>& v) {
    for (int x : v) {
        std::cout << x << ' ';
    }
    std::cout << '\\n';
}

int main() {
    std::vector<int> queue{10, 20, 30, 40};
    queue.insert(queue.begin() + 1, 15);
    print(queue);
    queue.erase(queue.begin());
    print(queue);

    std::vector<int> enemyHp{50, 0, 35, 0, 80};
    std::erase(enemyHp, 0);
    print(enemyHp);
}`,
          output: '10 15 20 30 40\n15 20 30 40\n50 35 80',
          annotations: [
            { lines: 13, text: 'Positions are given as [[iterator|iterators]]: objects that mark a position in a container. `begin()` is the first element, so `begin() + 1` is index 1. `20`, `30` and `40` all shift right to make room.' },
            { lines: 15, text: 'Erasing the first element shifts every remaining element left by one.' },
            { lines: 19, text: 'C++20\'s `std::erase(container, value)` removes every element equal to `value` in a single pass, shifting each survivor only once. Far better than erasing matches one by one in a loop.' },
          ],
        },
        {
          type: 'table',
          headers: ['Operation', 'Cost', 'Why'],
          rows: [
            ['`v[i]`, `v.at(i)`', 'O(1)', 'Address arithmetic on a contiguous buffer'],
            ['`push_back`, `emplace_back`', 'Amortized O(1)', 'Occasional geometric reallocation'],
            ['`pop_back`', 'O(1)', 'Destroy the last element; nothing shifts'],
            ['`insert` / `erase` in the middle', 'O(n)', 'Every later element shifts by one'],
            ['Find a value (unsorted)', 'O(n)', 'Must check elements one by one'],
          ],
        },
        {
          type: 'p',
          text: 'When order does not matter (a list of active enemies, live particles), there is a classic O(1) trick called **swap-and-pop**: overwrite the element to remove with the last element, then `pop_back()`. Nothing else shifts.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'RemoveAtSwap',
          text: 'Unreal builds this trick in: `TArray::RemoveAt(Index)` preserves order by shifting (O(n)), while `TArray::RemoveAtSwap(Index)` swaps the last element into the gap (O(1)). Choosing `RemoveAtSwap` for unordered gameplay lists is a standard Unreal optimization.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Assemble a function that removes the element at index `i` in O(1) when order does not matter (swap-and-pop).',
      lines: [
        'void removeAtSwap(std::vector<int>& v, std::size_t i) {',
        '    v[i] = v.back();',
        '    v.pop_back();',
        '}',
      ],
      distractors: ['    v.erase(v.begin() + i);', 'void removeAtSwap(std::vector<int> v, std::size_t i) {'],
      explanation:
        'First copy the last element over the one being removed, then drop the now-duplicated last element. Popping first would lose the last element\'s value. The parameter must be a reference so the caller\'s vector changes, and `erase` is the O(n) order-preserving alternative this trick avoids. (If `i` is the last index, the self-assignment is harmless.)',
    },
    {
      kind: 'concept',
      title: 'Invalidation: references that stop being valid',
      blocks: [
        {
          type: 'p',
          text: 'Reallocation has a dangerous side effect. Any reference, pointer or iterator that refers into the **old** buffer is left pointing at freed memory: a [[dangling-reference|dangling reference]]. Using it is undefined behavior. This is called [[iterator-invalidation|iterator invalidation]], and it is one of the most common sources of crashes in C++ game code.',
        },
        {
          type: 'code',
          code: `std::vector<int> hp{100, 80, 60};   // capacity 3
int& boss = hp[0];                    // refers into the buffer

hp.push_back(40);    // full: reallocates, old buffer freed
boss -= 10;          // undefined behavior: boss dangles

for (int h : hp) {
    if (h < 50) {
        hp.push_back(100);   // undefined behavior: may
    }                        // reallocate mid-loop
}`,
          annotations: [
            { lines: 2, text: '`boss` refers to the element at the old buffer\'s address.' },
            { lines: 4, text: 'The elements move to a new buffer. `hp[0]` is fine, but `boss` still refers to the old, freed location.' },
            { lines: 5, text: 'Writes to freed memory. It might corrupt an unrelated object, crash, or seem to work until the day it does not.' },
            { lines: '7-11', text: 'A range-based `for` holds iterators into the vector. Growing the vector inside the loop can invalidate them out from under it.' },
          ],
        },
        {
          type: 'memory',
          caption: 'After the reallocation, boss refers into the freed buffer.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'boss', type: 'int&', value: '(dangling)', pointsTo: 'old0', highlight: true },
                { name: 'hp.data', type: 'int*', value: '0x9000', pointsTo: 'new0' },
              ],
            },
            {
              label: 'Heap — old buffer (freed)',
              kind: 'other',
              cells: [{ id: 'old0', value: '100 80 60', address: '0x6000' }],
            },
            {
              label: 'Heap — new buffer',
              kind: 'heap',
              cells: [{ id: 'new0', value: '100 80 60 40', address: '0x9000' }],
            },
          ],
        },
        {
          type: 'table',
          headers: ['Operation', 'What it invalidates'],
          rows: [
            ['`push_back` / `emplace_back` / `insert` that reallocates', '**Everything**: all references, pointers and iterators'],
            ['`push_back` / `emplace_back` without reallocation', 'Only the `end()` iterator'],
            ['`insert` without reallocation', 'Everything at or after the insertion point'],
            ['`erase`', 'Everything at or after the erased position'],
            ['`reserve` that increases capacity', 'Everything'],
            ['`clear`', 'Everything'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why doesn\'t the vector fix references for you?',
          text: 'To update outstanding references, the vector would have to track every one of them, adding memory and time to every operation, including for the vast majority of code that never holds a reference across a modification. True to C++\'s zero-overhead principle, it does not. The rule you follow instead: **do not hold references, pointers or iterators into a vector across any operation that might change its size**. Store indices instead, or look the element up again.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'The same trap in TArray',
          text: 'Holding `FItem& Item = Items[0];` and then calling `Items.Add(...)` is a classic Unreal crash for exactly the same reason: `TArray` is contiguous and reallocates too. Unreal developers store indices, or re-fetch the element after modifying the array.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: '`std::vector<int> v{1, 2, 3};` and `int& ref = v[0];`. Select **all** operations after which using `ref` may be undefined behavior.',
      multi: true,
      options: [
        { text: '`v.push_back(4);`', correct: true, why: 'If the vector is full (it may well be, with capacity 3), it reallocates, and `ref` refers into the freed buffer.' },
        { text: '`v.reserve(100);`', correct: true, why: 'Increasing capacity always means a new buffer, so every reference into the old one is invalidated.' },
        { text: '`std::cout << v.size();`', why: 'Reading the size changes nothing. Read-only operations never invalidate.' },
        { text: '`v[1] = 7;`', why: 'Assigning to an existing element changes a value, not the buffer. `ref` still refers to element 0.' },
        { text: '`v.erase(v.begin());`', correct: true, why: 'Erase invalidates references at or after the erased position, which includes position 0 itself; the element `ref` named is gone.' },
      ],
      explanation:
        'The question to ask is: "could this move or destroy elements?" Anything that can reallocate (`push_back`, `insert`, growing `reserve`) or shift elements (`insert`, `erase`) is dangerous; reading and assigning to existing elements are not. When in doubt, use an index and look the element up after the modification.',
    },
    {
      kind: 'concept',
      title: 'Why vector is the default: contiguous memory and the cache',
      blocks: [
        {
          type: 'p',
          text: 'Big-O notation counts operations, but on real hardware *where data lives* often matters more. The CPU does not fetch single bytes from main memory; it fetches whole **cache lines**, typically 64 bytes, into small, very fast caches. Fetching from main memory takes on the order of 100 nanoseconds, hundreds of times slower than reading data already in the closest cache.',
        },
        {
          type: 'table',
          headers: ['Where the data is', 'Approximate time to read'],
          rows: [
            ['L1 cache', '~1 ns'],
            ['L2 cache', '~3–5 ns'],
            ['L3 cache', '~10–20 ns'],
            ['Main memory (RAM)', '~60–100 ns'],
          ],
          caption: 'Typical orders of magnitude on modern desktop CPUs.',
        },
        {
          type: 'p',
          text: 'A `std::vector<int>` is [[contiguous-memory|contiguous memory]]: one cache line delivers 16 consecutive `int`s, and the CPU\'s prefetcher notices the sequential pattern and loads the next lines before you ask. A linked list (`std::list`), by contrast, allocates every element separately, scattered across the heap. Walking it means a potential cache miss at every single step. This effect is called [[cache-locality|cache locality]].',
        },
        {
          type: 'compare',
          left: {
            title: 'std::vector<int>',
            tone: 'good',
            text: 'Elements side by side. Iteration streams through memory; the prefetcher keeps the cache full. Best case for modern CPUs.',
          },
          right: {
            title: 'std::list<int>',
            tone: 'bad',
            text: 'One heap node per element, linked by addresses. O(1) insertion in the middle, but every step of iteration can stall on a cache miss.',
          },
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'O(n) can beat O(1)',
          text: 'Inserting into the middle of a list is O(1) once you are there, but you first have to walk the list to find the spot, cache-missing all the way. Benchmarks popularized by Bjarne Stroustrup show a vector beating a list at "insert into sorted position" even for large sizes: shifting contiguous memory is so fast that it wins anyway. The standard advice: **use `std::vector` by default**, and switch only when measurements say otherwise.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Bridge to Unreal: TArray',
          text: '[[tarray]] is Unreal\'s `std::vector`: a contiguous, growable array and by far the most used container in the engine. The ideas from this lesson carry over directly: size vs capacity (`Num()` vs `Max()`), `Reserve`, amortized growth, invalidation on reallocation, `RemoveAtSwap`. Unreal uses its own container rather than `std::vector` for engine-wide reasons: its own memory allocators, `int32` indices, integration with reflection so arrays can be `UPROPERTY`s edited in the editor and replicated, and consistent behaviour across every platform the engine ships on.',
        },
        {
          type: 'table',
          headers: ['std::vector', 'TArray'],
          rows: [
            ['`v.push_back(x)` / `v.emplace_back(args)`', '`A.Add(X)` / `A.Emplace(Args)`'],
            ['`v.size()` / `v.capacity()`', '`A.Num()` / `A.Max()`'],
            ['`v.reserve(n)`', '`A.Reserve(N)`'],
            ['`v.clear()` (keeps capacity)', '`A.Reset()` (keeps) or `A.Empty()` (frees)'],
            ['`v.erase(v.begin() + i)`', '`A.RemoveAt(I)`'],
            ['swap-and-pop by hand', '`A.RemoveAtSwap(I)`'],
            ['`v.at(i)` throws when out of range', '`A[I]` asserts in development builds'],
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Why does iterating over a `std::vector` usually beat iterating over a `std::list` of the same elements, even though both are O(n)?',
      options: [
        { text: 'The vector\'s elements are contiguous, so each cache line fetched brings in many upcoming elements and the prefetcher can stream them', correct: true, why: 'Contiguity turns iteration into a sequential memory scan, the access pattern CPUs are optimized for.' },
        { text: 'The vector uses fewer instructions per element because it is written more efficiently', why: 'The instruction counts are similar. The difference comes from memory stalls: list nodes are scattered, so many steps wait on main memory.' },
        { text: 'A vector stores its elements on the stack, which is faster than the heap', why: 'A vector\'s elements live on the heap too. What matters is that they are adjacent, not which region they are in.' },
        { text: 'It does not: Big-O says they are equally fast', why: 'Big-O hides constant factors. Cache misses can make one O(n) loop many times slower than another.' },
      ],
      explanation:
        'Modern CPUs are far faster than main memory, so programs are often limited by how quickly data arrives. Contiguous storage maximizes useful data per cache line and lets hardware prefetching hide memory latency. Node-based containers lose both advantages, which is why "use vector by default" is the standard advice in C++ and in game engines.',
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `std::vector<int> v{10, 20, 30, 40};
v.erase(v.begin() + 1);
v.push_back(50);
v.insert(v.begin(), 5);
for (int x : v) {
    std::cout << x << ' ';
}`,
      options: [
        { text: '5 10 30 40 50', correct: true, why: 'Erase index 1 (20) gives `10 30 40`, push 50 gives `10 30 40 50`, insert 5 at the front gives `5 10 30 40 50`.' },
        { text: '5 20 30 40 50', why: '`begin() + 1` is index 1, the *second* element (20), not the first. The 10 survives.' },
        { text: '10 5 30 40 50', why: '`insert(v.begin(), 5)` inserts *before* the first element, so 5 becomes the new front.' },
        { text: '5 10 20 30 40 50', why: 'The `erase` call removed 20 before anything was added.' },
      ],
      explanation:
        'Positions passed to `insert` and `erase` are iterators: `begin() + i` means index `i`. `insert` places the new element *before* the given position, shifting later elements right; `erase` removes the element at the position, shifting later elements left. Tracing operations step by step like this is a good habit when debugging container code.',
    },
  ],
  takeaways: [
    '`std::vector` is a growable, contiguous array: a small handle (data address, size, capacity) plus a heap buffer of elements.',
    '`v(3)` makes three elements; `v{3}` makes one element with value 3.',
    'Size is the element count; capacity is how many fit before a reallocation. Geometric growth makes `push_back` amortized O(1).',
    '`reserve(n)` allocates once without creating elements; `clear()` keeps the capacity, so reusing a vector avoids allocations.',
    '`emplace_back` constructs in place from constructor arguments; `push_back` adds an existing object. Middle `insert`/`erase` are O(n); swap-and-pop is O(1).',
    'Reallocation and shifting invalidate references, pointers and iterators into a vector. Do not hold them across size changes; store indices instead.',
    'Contiguous memory and cache locality make `std::vector` the right default container. Unreal\'s `TArray` follows the same design.',
  ],
  reading: [
    {
      title: 'std::vector',
      url: 'https://en.cppreference.com/w/cpp/container/vector',
      source: 'cppreference',
      note: 'Every member function, with complexity guarantees and an iterator invalidation table at the top of the page.',
    },
    {
      title: 'std::vector::reserve',
      url: 'https://en.cppreference.com/w/cpp/container/vector/reserve',
      source: 'cppreference',
      note: 'The exact guarantee that no reallocation happens until the size exceeds the reserved capacity, and what reserve invalidates.',
    },
    {
      title: 'Array Containers in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/array-containers-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s guide to `TArray`: adding, removing, slack, and how it compares to the standard containers.',
    },
    {
      title: 'C++ Core Guidelines SL.con.2: prefer vector by default',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-stdlib',
      source: 'core-guidelines',
      note: 'The standard library section; SL.con.2 states "prefer using STL vector by default unless you have a reason to use a different container".',
    },
  ],
};
