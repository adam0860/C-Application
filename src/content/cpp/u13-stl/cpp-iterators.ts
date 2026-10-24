import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-iterators',
  title: 'Iterators',
  summary: 'The generalized pointers that connect every container to every algorithm — and how range-for really works.',
  minutes: 17,
  objectives: [
    'Explain what an iterator is and why the standard library is built around them',
    'Use `begin()`/`end()` and reason about half-open ranges',
    'Rewrite a range-based `for` loop as the iterator loop the compiler generates',
    'Name the iterator categories and predict which operations a container\'s iterators support',
    'Use `const_iterator`, reverse iterators and the safe erase-while-iterating pattern',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Iterators: generalized pointers',
      blocks: [
        {
          type: 'p',
          text: 'A `std::vector` keeps its elements side by side; a `std::list` chains nodes with pointers; a `std::map` stores a balanced tree. If every algorithm — find, count, sort, copy — had to be written separately for every container, the library would need hundreds of near-identical functions.',
        },
        {
          type: 'p',
          text: 'Instead, containers hand out [[iterator|iterators]]: small objects that mark a *position* in a sequence and know how to move to the next one. Every iterator supports the same core operations, borrowed from pointer syntax: `*it` reads (or writes) the element, `++it` moves forward, and `it == other` / `it != other` compare positions.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> scores{120, 450, 300};

    std::vector<int>::iterator it = scores.begin();
    std::cout << *it << '\\n';
    ++it;
    *it += 50;
    std::cout << *it << '\\n';

    for (auto i = scores.begin(); i != scores.end(); ++i) {
        std::cout << *i << ' ';
    }
    std::cout << '\\n';

    int ammo[] = {7, 8, 9};
    for (int* p = std::begin(ammo); p != std::end(ammo); ++p) {
        std::cout << *p << ' ';
    }
    std::cout << '\\n';
}`,
          output: `120
500
120 500 300
7 8 9`,
          annotations: [
            { lines: 8, text: 'Each container defines its own iterator type. The full name is a mouthful, which is why you will almost always write `auto` instead (as on line 14).' },
            { lines: 9, text: '[[dereference|Dereferencing]] with `*` gives access to the element the iterator points at — exactly like a pointer.' },
            { lines: 11, text: 'Iterators can write too: this changes the second score in the vector itself from 450 to 500.' },
            { lines: 14, text: 'The classic iterator loop: start at `begin()`, stop when you reach `end()`, step with `++`.' },
            { lines: 20, text: 'A raw pointer into an array *is* an iterator. `std::begin` and `std::end` work on C arrays as well as containers.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the library is built on iterators',
          text: 'Iterators decouple *algorithms* from *containers*. With N algorithms and M containers, writing each combination would take N × M functions; with iterators as the shared interface it takes N + M. Alexander Stepanov designed the STL around this idea, deliberately modeling iterators on pointers so that plain arrays would work with every algorithm for free — and so that, after templates are instantiated and inlined, iterator code compiles down to the same machine code as hand-written pointer loops.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'begin, end and the half-open range',
      blocks: [
        {
          type: 'p',
          text: '`begin()` returns an iterator to the first element. `end()` returns an iterator **one past the last element** — a position just beyond the data. Together they describe a [[half-open-range]], written `[begin, end)`: the start is included, the end is not.',
        },
        {
          type: 'memory',
          caption: 'A vector of four scores. end() marks the position after the last element; it does not refer to an element.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'first', type: 'iterator', value: 'scores.begin()', pointsTo: 'e0' },
                { name: 'last', type: 'iterator', value: 'scores.end()', pointsTo: 'eend' },
              ],
            },
            {
              label: 'Heap — the vector\'s buffer',
              kind: 'heap',
              cells: [
                { name: '[0]', value: '120', id: 'e0' },
                { name: '[1]', value: '450' },
                { name: '[2]', value: '300' },
                { name: '[3]', value: '75' },
                { name: 'one past the end', value: '(not an element)', id: 'eend', highlight: true },
              ],
            },
          ],
        },
        {
          type: 'p',
          text: 'Dereferencing `end()` is [[undefined-behavior]] — there is nothing there. But *forming* and *comparing* it is perfectly legal, just like a pointer one past the end of an array, which you met in the [[pointer-arithmetic]] lesson.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why one past the end?',
          text: 'Half-open ranges make the common cases fall out naturally. An **empty** range is simply `begin == end` — no special case. The loop condition is always `it != end`. The number of elements is `end - begin`. And a range splits cleanly at any point `m` into `[begin, m)` and `[m, end)` with no overlap and no gap. A closed range `[first, last]` would need a special "empty" value and constant `+ 1`/`- 1` adjustments — a breeding ground for off-by-one bugs.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: '"Not found" means end()',
          text: 'Because `end()` is never a valid element, functions that search a range use it to mean "nothing found". You saw this with `std::map::find`; the algorithms lesson uses it constantly. Always compare a search result with `end()` before dereferencing it.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Why does `end()` return an iterator **one past** the last element instead of to the last element?',
      options: [
        {
          text: 'Because the last element is reserved for a null terminator, as in C strings',
          why: 'Containers like `std::vector<int>` store no terminator. `end()` is a position, not a stored sentinel element.',
        },
        {
          text: 'So that `*end()` safely returns a default-constructed element',
          why: 'Dereferencing `end()` is undefined behavior. There is no element there to return.',
        },
        {
          text: 'It is a historical accident that C++20 ranges finally fixed',
          why: 'It is a deliberate design that ranges keep: a C++20 range is still a begin position plus an end marker that is not included.',
        },
        {
          text: 'So that an empty range is simply `begin() == end()`, and loops, sizes and range splits need no `+ 1`/`- 1` adjustments',
          correct: true,
          why: 'Exactly. With half-open ranges every container — including an empty one — is described the same way, and `end - begin` is the size.',
        },
      ],
      explanation:
        'The half-open convention `[begin, end)` removes special cases. An empty container has no last element to point at, but it does have a "one past the end" position — the same as its beginning. That uniformity is why every standard loop and algorithm can be written as "advance until you reach `end`".',
    },
    {
      kind: 'concept',
      title: 'What range-for really does',
      blocks: [
        {
          type: 'p',
          text: 'You have been using iterators since the [[range-based-for]] lesson without seeing them. The compiler rewrites every range-based `for` into an iterator loop. This is the actual expansion the standard specifies (names with `__` are invented by the compiler):',
        },
        {
          type: 'compare',
          left: {
            title: 'What you write',
            tone: 'neutral',
            code: `for (const auto& item : inventory) {
    use(item);
}`,
          },
          right: {
            title: 'What the compiler generates',
            tone: 'neutral',
            code: `{
    auto&& __range = inventory;
    auto __begin = __range.begin();
    auto __end = __range.end();
    for (; __begin != __end; ++__begin) {
        const auto& item = *__begin;
        use(item);
    }
}`,
          },
        },
        {
          type: 'p',
          text: 'Two consequences follow. First, **any** type with suitable `begin()` and `end()` works with range-for — including your own classes, which can simply forward to a container inside:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

class Inventory {
public:
    void add(std::string item) { items_.push_back(std::move(item)); }
    auto begin() const { return items_.begin(); }
    auto end() const { return items_.end(); }

private:
    std::vector<std::string> items_;
};

int main() {
    Inventory bag;
    bag.add("Rope");
    bag.add("Torch");
    bag.add("Map");
    for (const std::string& item : bag) {
        std::cout << item << '\\n';
    }
}`,
          output: `Rope
Torch
Map`,
          annotations: [
            { lines: '9-10', text: 'Expose the inner vector\'s iterators. Because these are `const` member functions, `items_` is `const` inside them and they return `const_iterator`s — callers can look but not modify.' },
            { lines: 21, text: 'Range-for calls `bag.begin()` and `bag.end()`. `Inventory` keeps its vector private yet is as easy to loop over as one.' },
          ],
        },
        {
          type: 'p',
          text: 'Second, the end iterator is computed **once**, before the loop starts. If the body adds or removes elements, `__begin` and `__end` can be invalidated, and the loop has undefined behavior. Never change a container\'s size while range-for is walking it.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Temporaries in the range expression',
          text: '`auto&& __range = ...` keeps a temporary alive for the loop — but only if it is the *final result* of the expression. In `for (auto& m : makeParty().members())`, if `members()` returns a reference into the temporary party, the party is destroyed before the loop body runs and you iterate a dangling reference (undefined behavior in C++20). C++23 extends the lifetime of every temporary in that expression, but until all your compilers implement it, store the object in a named variable first.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the hand-written iterator loop so it prints every element, exactly as `for (int s : scores)` would.',
      template: `for (auto it = scores.___(); it ___ scores.end(); ___it) {
    std::cout << ___it << '\\n';
}`,
      blanks: [{ answers: ['begin'] }, { answers: ['!='] }, { answers: ['++'] }, { answers: ['*'] }],
      wordBank: ['begin', '!=', '++', '*', '<=', 'front', '&', '--'],
      explanation:
        'This is the range-for expansion: start at `begin()`, continue while the iterator is not equal to `end()`, advance with `++`, and dereference with `*` to reach the element. Using `<=` would be wrong twice over — it would include the `end()` position (dereferencing it is undefined behavior), and many iterators (such as `std::list`\'s) do not support `<` at all, which is why generic code always uses `!=`.',
    },
    {
      kind: 'concept',
      title: 'Iterator categories',
      blocks: [
        {
          type: 'p',
          text: 'Not every iterator can do everything a pointer can. A list node only knows its neighbors, so a list iterator cannot jump ten elements ahead in one step. The standard groups iterators into [[iterator-category|categories]], each adding abilities to the one before it:',
        },
        {
          type: 'table',
          headers: ['Category', 'Adds', 'Typical source'],
          rows: [
            ['Input', 'Read with `*it`, advance with `++`; single pass only', 'Reading from a stream (`std::istream_iterator`)'],
            ['Forward', 'Multi-pass: copies can revisit the same elements', '`std::forward_list`, `std::unordered_map`, `std::unordered_set`'],
            ['Bidirectional', 'Move backwards with `--`', '`std::list`, `std::map`, `std::set`'],
            ['Random access', '`it + n`, `it[n]`, `it2 - it1`, `<` — all in constant time', '`std::deque`'],
            ['Contiguous (C++20)', 'Elements are guaranteed adjacent in memory', '`std::vector`, `std::array`, `std::string`, raw pointers'],
          ],
        },
        {
          type: 'p',
          text: 'There is also a separate **output** category for write-only iterators, such as `std::back_inserter`, which appends to a container each time you assign through it. C++20 expresses each category as a [[concept]]: `std::forward_iterator`, `std::random_access_iterator` and so on.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <iterator>
#include <list>
#include <vector>

int main() {
    std::vector<int> v{10, 20, 30, 40};
    std::list<int> l{10, 20, 30, 40};

    auto vit = v.begin() + 2;
    auto lit = std::next(l.begin(), 2);
    std::cout << *vit << ' ' << *lit << '\\n';

    std::cout << v.end() - v.begin() << ' '
              << std::distance(l.begin(), l.end()) << '\\n';

    --lit;
    std::cout << *lit << '\\n';
}`,
          output: `30 30
4 4
20`,
          annotations: [
            { lines: 10, text: 'Random access: jump two positions in one step. `l.begin() + 2` would not compile — list iterators have no `operator+`.' },
            { lines: 11, text: '`std::next(it, n)` works for any forward iterator. For a list it steps one node at a time — O(n) — but it compiles everywhere.' },
            { lines: '14-15', text: 'Subtraction gives the distance in O(1) for random-access iterators. `std::distance` works for any iterator, walking the range if it must.' },
            { lines: 17, text: 'Bidirectional iterators can step backwards. A `std::forward_list` iterator could not.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why categories matter',
          text: 'Algorithms state the weakest category they need, and the category tells you the cost. `std::sort` needs random access, so it rejects a `std::list` (which has its own `list.sort()` member instead). `std::find` needs only input iterators, so it works on anything. And helpers like `std::advance` and `std::distance` are O(1) for random-access iterators but O(n) otherwise — the same code, very different [[big-o|complexity]].',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: '`it` is a `std::list<int>::iterator` in the middle of a list. Which expression compiles?',
      codeOptions: true,
      options: [
        { text: 'it + 3', why: 'List iterators are bidirectional, not random access, so there is no `operator+`. Use `std::next(it, 3)` instead.' },
        { text: 'it[2]', why: 'Subscripting is a random-access operation. A list would have to walk node by node, so the standard does not offer it.' },
        { text: '--it', correct: true, why: '`std::list` is doubly linked, so its iterators are bidirectional and can step backwards.' },
        { text: 'it < std::prev(it)', why: 'Ordering comparisons with `<` require random-access iterators. Bidirectional iterators only support `==` and `!=`.' },
      ],
      explanation:
        'A container\'s iterators only offer the operations that container can perform cheaply. Each list node knows its next and previous neighbor, so `++` and `--` are O(1); jumping or comparing positions would require walking the list, so those operators are deliberately missing. The standard\'s rule of thumb: if an operation cannot be done efficiently, it is not provided as an operator.',
    },
    {
      kind: 'order',
      prompt: 'Order the iterator categories from the fewest abilities to the most. Each one supports everything the previous one does.',
      lines: ['Input', 'Forward', 'Bidirectional', 'Random access', 'Contiguous'],
      distractors: ['Reverse'],
      linesAreCode: false,
      explanation:
        'Input iterators read a sequence once; forward iterators can make multiple passes; bidirectional ones can also go back; random-access ones jump in constant time; contiguous ones additionally guarantee the elements sit next to each other in memory. "Reverse" is not a category — `std::reverse_iterator` is an *adaptor* that wraps a bidirectional (or stronger) iterator and flips its direction.',
    },
    {
      kind: 'concept',
      title: 'const iterators',
      blocks: [
        {
          type: 'p',
          text: 'A `const_iterator` lets you read elements but not modify them. You get one from `cbegin()`/`cend()`, or automatically when you call `begin()` on a `const` container. Use them whenever you only need to look — the compiler then stops accidental writes for you.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> loot{{"Gold", 120}, {"Gems", 3}};
    for (auto it = loot.cbegin(); it != loot.cend(); ++it) {
        std::cout << it->first << ": " << it->second << '\\n';
    }

    auto gold = loot.find("Gold");
    if (gold != loot.end()) {
        gold->second += 30;
    }
    std::cout << "Gold now " << loot["Gold"] << '\\n';
}`,
          output: `Gems: 3
Gold: 120
Gold now 150`,
          annotations: [
            { lines: 7, text: '`cbegin()`/`cend()` give `const_iterator`s. Writing `it->second = 0;` here would not compile.' },
            { lines: 8, text: 'A map\'s elements are `std::pair<const Key, Value>`, and `->` reaches a member of the element. The map is sorted, so "Gems" comes before "Gold".' },
            { lines: '11-14', text: '`find` on a non-const map returns a normal iterator, so we may change the value. The key (`first`) is always `const` — changing it would break the map\'s ordering.' },
          ],
        },
        {
          type: 'p',
          text: 'Be careful with the name. A `const_iterator` is like a **pointer to const** (`const int*`): the iterator moves freely, but the element is read-only. A `const iterator` (an iterator variable declared `const`) is like a **const pointer** (`int* const`): it can modify the element but can never move.',
        },
        {
          type: 'table',
          headers: ['Declaration', 'Can modify element?', 'Can move (`++`)?', 'Pointer analogue'],
          rows: [
            ['`std::vector<int>::iterator it`', 'Yes', 'Yes', '`int*`'],
            ['`std::vector<int>::const_iterator it`', 'No', 'Yes', '`const int*`'],
            ['`const std::vector<int>::iterator it`', 'Yes', 'No', '`int* const`'],
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Iterating Unreal containers',
          text: 'Unreal\'s `TArray`, `TMap` and `TSet` support range-for through the same `begin()`/`end()` mechanism, so `for (const auto& Pair : LootTable)` just works. They also offer explicit iterators via `CreateIterator()` and `CreateConstIterator()`; the non-const iterator\'s `RemoveCurrent()` is the safe way to delete while iterating — Unreal\'s answer to the pattern on the next card.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'A `const_iterator` is an iterator that cannot be moved forward with `++`; you use it to keep a fixed position in a container.',
      answer: false,
      explanation:
        'It is the *element* that is `const`, not the iterator: a `const_iterator` moves freely but only gives read access, like `const int*`. An iterator object that is itself `const` (`const auto it = v.begin();`) is the one that cannot move. Use `const_iterator` (via `cbegin()` or a `const` container) whenever a loop only reads.',
    },
    {
      kind: 'concept',
      title: 'Iterator invalidation and erasing safely',
      blocks: [
        {
          type: 'p',
          text: 'An iterator is only meaningful while the thing it points at stays put. Operations that move or destroy elements cause [[iterator-invalidation]]: old iterators become dangling, and using them is undefined behavior. The rules depend on how each container stores its data:',
        },
        {
          type: 'table',
          headers: ['Container', 'Operation', 'Iterators invalidated'],
          rows: [
            ['`std::vector`', '`push_back`, `insert`, `emplace`', '**All**, if the [[capacity]] has to grow; otherwise those at or after the insertion point (including `end()`)'],
            ['`std::vector`', '`erase`', 'Those at or after the erased element (including `end()`)'],
            ['`std::list`, `std::map`, `std::set`', '`insert`', 'None'],
            ['`std::list`, `std::map`, `std::set`', '`erase`', 'Only iterators to the erased element'],
            ['`std::unordered_map` / `set`', '`insert`', 'All, if it triggers a rehash (references to elements stay valid)'],
          ],
        },
        {
          type: 'p',
          text: 'The classic trap is erasing inside an iterator loop. `erase(it)` destroys the element `it` points at, so a following `++it` advances a dead iterator. The fix is built into the API: `erase` **returns an iterator to the element after the erased one**. Use it, and only increment when you did not erase:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <vector>

struct Enemy {
    std::string name;
    int health;
};

int main() {
    std::vector<Enemy> enemies{
        {"Orc", 0}, {"Elf", 40}, {"Imp", 0}, {"Troll", 90}};

    for (auto it = enemies.begin(); it != enemies.end();) {
        if (it->health <= 0) {
            it = enemies.erase(it);
        } else {
            ++it;
        }
    }

    for (const Enemy& e : enemies) {
        std::cout << e.name << '\\n';
    }
}`,
          output: `Elf
Troll`,
          annotations: [
            { lines: 14, text: 'No `++it` in the loop header: whether we advance depends on what happened in the body.' },
            { lines: 16, text: '`erase` shifts the later elements down and returns a valid iterator to the next one. Note that `enemies.end()` is re-evaluated each time round the loop, because erasing changes it.' },
            { lines: 18, text: 'Only advance when nothing was erased — otherwise we would skip the element that just slid into this position.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Correct, but not the fastest',
          text: 'Each `vector::erase` shifts every later element, so erasing many elements this way is O(n²) in the worst case. The next lessons show `std::erase_if` (C++20), which removes everything matching a condition in a single O(n) pass — usually the better choice for vectors. The erase-returns-next pattern remains the right tool for `std::list` and `std::map`, and when you need to do extra work per erased element.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This function is meant to remove dead enemies, but it has undefined behavior. Tap the line that causes it.',
      code: `void removeDead(std::vector<Enemy>& enemies) {
    for (auto it = enemies.begin(); it != enemies.end(); ++it) {
        if (it->health <= 0) {
            enemies.erase(it);
        }
    }
}`,
      bugLines: [4],
      hint: 'What state is `it` in right after the element it points to is erased?',
      explanation:
        'Line 4 erases the element but throws away the returned iterator. `it` is now invalidated, yet the loop header immediately does `++it` on it — undefined behavior. Even when it happens to "work", it skips the element that slid into the erased slot, and erasing the last element can step past `end()` and run off the vector. Fix: `it = enemies.erase(it);` and move `++it` into an `else` branch — or replace the whole loop with `std::erase_if`.',
    },
    {
      kind: 'concept',
      title: 'Reverse iterators',
      blocks: [
        {
          type: 'p',
          text: 'Every container with bidirectional iterators also offers `rbegin()` and `rend()`. They return **reverse iterators**, adaptors whose `++` moves *backwards*. `rbegin()` refers to the last element and `rend()` sits "one before the first", so the familiar loop shape walks the container from back to front:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> history{"move", "jump", "attack", "heal"};

    std::cout << "Undo order:";
    for (auto it = history.rbegin(); it != history.rend(); ++it) {
        std::cout << ' ' << *it;
    }
    std::cout << '\\n';

    auto newest = history.rbegin();
    std::cout << "Newest: " << *newest << '\\n';
    std::cout << "base() is end(): "
              << (newest.base() == history.end() ? "yes" : "no")
              << '\\n';
}`,
          output: `Undo order: heal attack jump move
Newest: heal
base() is end(): yes`,
          annotations: [
            { lines: 9, text: 'Same loop shape as a forward loop — `!=` and `++` — but it visits the newest action first. An undo system wants exactly this order.' },
            { lines: 14, text: '`rbegin()` refers to the last element, "heal".' },
            { lines: 17, text: '`base()` returns the underlying forward iterator. Surprisingly it is `end()`, not an iterator to "heal" — see the deep dive for why.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Reverse algorithms for free',
          text: 'Because reverse iterators are still iterators, any algorithm runs backwards when given them: searching with `rbegin()`/`rend()` finds the **last** match instead of the first. In the ranges lesson you will meet `std::views::reverse`, which lets range-for walk backwards directly.',
        },
        {
          type: 'deepdive',
          title: 'Why base() is off by one',
          blocks: [
            {
              type: 'p',
              text: 'A reverse iterator stores an ordinary iterator, and dereferencing it returns the element **just before** the stored position: `*rit` is `*std::prev(rit.base())`. That lets `rbegin()` simply wrap `end()` and `rend()` wrap `begin()` — both always-valid positions — without ever needing an illegal "one before the beginning" iterator.',
            },
            {
              type: 'p',
              text: 'The practical consequence: to erase the element a reverse iterator refers to, use `v.erase(std::prev(rit.base()))`. Converting with plain `rit.base()` would target the element *after* it.',
            },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3, 4, 5};
    auto r = v.rbegin();
    ++r;
    std::cout << *r << ' ' << *std::next(r, 2) << '\\n';
}`,
      options: [
        { text: '2 4', why: 'That would be a forward iterator starting at the front. `rbegin()` starts at the back.' },
        { text: '4 2', correct: true, why: '`rbegin()` refers to 5; one `++` moves backwards to 4; two more steps backwards reach 2.' },
        { text: '5 3', why: '`++r` already moved `r` from 5 to 4 before anything is printed.' },
        { text: '4 6', why: 'Moving a reverse iterator forward goes towards the *front* of the vector, so the values get smaller, not larger.' },
      ],
      explanation:
        'For a reverse iterator, "forward" (`++`, `std::next`) means towards the beginning of the container. Starting from the last element (5), one step gives 4 and two further steps give 2. Algorithms and helpers like `std::next` do not need to know this — they just call `++`, which is what makes reverse iterators work with every algorithm.',
    },
  ],
  takeaways: [
    'An iterator marks a position in a sequence and supports pointer-like operations: `*it`, `++it`, `it != other`. Raw pointers are iterators.',
    'Ranges are half-open, `[begin, end)`: `end()` is one past the last element, must never be dereferenced, and means "not found" in searches.',
    'Range-for is rewritten into a `begin()`/`end()` iterator loop, so any type with those members works — and changing the container\'s size inside it is undefined behavior.',
    'Iterator categories — input, forward, bidirectional, random access, contiguous — determine which operations exist and how much they cost.',
    'A `const_iterator` (from `cbegin()` or a const container) moves freely but cannot modify elements.',
    'Container modifications can invalidate iterators; when erasing in a loop, use the iterator `erase` returns.',
    'Reverse iterators (`rbegin()`/`rend()`) walk backwards with `++`, so every algorithm can run in reverse.',
  ],
  reading: [
    {
      title: 'Iterator library',
      url: 'https://en.cppreference.com/w/cpp/iterator',
      source: 'cppreference',
      note: 'The categories, the C++20 iterator concepts and helpers such as `std::next`, `std::distance` and `std::back_inserter`.',
    },
    {
      title: 'Range-based for loop',
      url: 'https://en.cppreference.com/w/cpp/language/range-for',
      source: 'cppreference',
      note: 'The exact expansion the compiler performs, including the C++23 change to temporary lifetimes.',
    },
    {
      title: 'std::reverse_iterator',
      url: 'https://en.cppreference.com/w/cpp/iterator/reverse_iterator',
      source: 'cppreference',
      note: 'How reverse iterators wrap a base iterator, with a diagram of the off-by-one relationship.',
    },
    {
      title: 'Introduction to iterators',
      url: 'https://www.learncpp.com/cpp-tutorial/introduction-to-iterators/',
      source: 'learncpp',
      note: 'A beginner-friendly walkthrough with extra examples of pointers as iterators and invalidation.',
    },
  ],
};
