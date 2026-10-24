import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-algorithms',
  title: 'Standard Algorithms',
  summary: 'Search, count, sort, transform and remove with tested, named building blocks instead of hand-rolled loops.',
  minutes: 19,
  objectives: [
    'Explain why named algorithms beat raw loops for clarity, correctness and speed',
    'Search and count with `std::find`, `std::find_if`, `std::count` and `std::count_if`',
    'Sort with custom comparators that respect strict weak ordering',
    'Transform and fold ranges with `std::transform` and `std::accumulate`, avoiding the initial-value trap',
    'Remove elements correctly with the erase–remove idiom and C++20 `std::erase_if`',
    'Use `std::min_element`/`std::max_element` and `std::any_of`/`std::all_of`/`std::none_of`',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Why algorithms instead of raw loops?',
      blocks: [
        {
          type: 'p',
          text: 'The headers `<algorithm>` and `<numeric>` contain over a hundred [[algorithm|algorithms]]: function templates that operate on a range given as a pair of iterators. Almost every loop you write is one of a handful of patterns — find something, count something, transform everything, keep some things — and each pattern has a name in the standard library.',
        },
        {
          type: 'compare',
          left: {
            title: 'Raw loop',
            tone: 'bad',
            code: `bool hasBoss = false;
for (std::size_t i = 0; i < wave.size(); ++i) {
    if (wave[i].isBoss) {
        hasBoss = true;
        break;
    }
}`,
            text: 'Seven lines; you must read every one to discover it answers "is there a boss?". Index type, bounds, `break` and the flag are all chances for bugs.',
          },
          right: {
            title: 'Named algorithm',
            tone: 'good',
            code: `bool hasBoss = std::any_of(
    wave.begin(), wave.end(),
    [](const Enemy& e) { return e.isBoss; });`,
            text: 'The name states the intent. It stops at the first match, cannot run off the end, and lets `hasBoss` be `const`.',
          },
        },
        {
          type: 'list',
          items: [
            '**Intent**: `count_if`, `any_of` and `remove_if` say *what* happens; a loop only says *how*, and the reader must reverse-engineer the what.',
            '**Correctness**: no off-by-one bounds, no forgotten `break`, no accidental modification. The implementations are used and tested by millions of programs.',
            '**Performance**: library implementers specialize algorithms — copying trivially copyable types can become a single `memmove`, and complexity guarantees (such as `std::sort` being O(n log n)) are written into the standard.',
            '**Composition**: because algorithms take iterators, the same `std::find` works on vectors, lists, arrays, maps and your own containers.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why algorithms take iterators, not containers',
          text: 'Taking a pair of iterators lets an algorithm work on *any* sequence, or on just part of one — the first ten scores, everything after the first boss. The trade-off is that an algorithm only sees elements, never the container. It can read, write and reorder elements, but it can **never add or remove** them. Keep that in mind; it explains the strangest algorithm in this lesson, `std::remove`.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: '"No raw loops"',
          text: 'In his 2013 talk *C++ Seasoning*, Adobe\'s Sean Parent gave the advice "no raw loops": whenever a loop does something nameable, use (or write) a named algorithm instead. It has become one of the most quoted guidelines in modern C++, and you will see it applied in code reviews at many game studios.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Searching and counting',
      blocks: [
        {
          type: 'p',
          text: '`std::find` looks for a value and `std::find_if` for the first element satisfying a [[predicate]] — any callable that takes an element and returns `bool`. Both return an **iterator**: to the match, or `end` when there is none. `std::count` and `std::count_if` return how many elements match.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Enemy {
    std::string name;
    int health;
    bool isBoss;
};

int main() {
    std::vector<int> drops{5, 12, 7, 12, 3};
    auto it = std::find(drops.begin(), drops.end(), 12);
    if (it != drops.end()) {
        std::cout << "First 12 at index "
                  << (it - drops.begin()) << '\\n';
    }
    std::cout << "12 appears "
              << std::count(drops.begin(), drops.end(), 12)
              << " times\\n";

    std::vector<Enemy> wave{{"Rat", 10, false}, {"Ogre", 80, false},
                            {"Lich", 200, true}, {"Bat", 5, false}};
    auto boss = std::find_if(wave.begin(), wave.end(),
                             [](const Enemy& e) { return e.isBoss; });
    if (boss != wave.end()) {
        std::cout << "Boss: " << boss->name << '\\n';
    }

    auto weak = std::count_if(
        wave.begin(), wave.end(),
        [](const Enemy& e) { return e.health < 20; });
    std::cout << weak << " weak enemies\\n";
}`,
          output: `First 12 at index 1
12 appears 2 times
Boss: Lich
2 weak enemies`,
          annotations: [
            { lines: 14, text: '`std::find` compares each element with `==` and stops at the **first** match.' },
            { lines: '15-18', text: 'Always compare with `end()` before using the result. With random-access iterators, subtracting `begin()` turns the iterator into an index.' },
            { lines: '25-26', text: 'For anything more complex than equality, pass a lambda predicate to `find_if`.' },
            { lines: '31-33', text: '`count_if` visits every element and counts those for which the predicate returns `true`. It returns a signed count type, so `auto` is the simplest choice.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Use member functions when containers have them',
          text: 'Associative containers have their own `find` and `count`. `std::map::find` uses the tree and runs in O(log n); the generic `std::find` would walk every element in O(n). Rule: if the container offers a member with the same name, prefer it — it knows the container\'s structure.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal',
          text: '`TArray` builds the common searches in as members: `Find`, `Contains`, `FindByPredicate`, `ContainsByPredicate` and `IndexOfByPredicate`, which take lambdas just like `std::find_if`. Unreal also has free functions in the `Algo` namespace (`Algo::Find`, `Algo::Sort`, `Algo::Accumulate`…) mirroring the standard ones.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `std::vector<int> drops{4, 9, 2, 9};
auto it = std::find(drops.begin(), drops.end(), 9);
std::cout << (it - drops.begin()) << ' '
          << std::count(drops.begin(), drops.end(), 9) << '\\n';`,
      options: [
        { text: '3 2', why: '`std::find` returns the *first* match, not the last. To find the last, search with reverse iterators.' },
        { text: '9 2', why: 'Subtracting `begin()` from the iterator gives a position, not the element. The element would be `*it`.' },
        { text: '1 1', why: '`std::count` does not stop at the first match; it counts every element equal to 9.' },
        { text: '1 2', correct: true, why: '`find` stops at the first 9, at index 1; `count` checks every element and finds two.' },
      ],
      explanation:
        '`find` answers "where is the first one?" with an iterator; `count` answers "how many?" with a number. Searching algorithms return iterators rather than values because a position is more useful: you can dereference it, erase at it, continue searching after it — and `end()` cleanly signals "not found" in a way a value could not.',
    },
    {
      kind: 'concept',
      title: 'Sorting and comparators',
      blocks: [
        {
          type: 'p',
          text: '`std::sort(first, last)` puts elements in ascending order using `<`. Pass a comparator to choose a different order: a callable `comp(a, b)` that returns `true` when `a` should come **before** `b`. `std::sort` needs random-access iterators — vectors, arrays, deques — and guarantees O(n log n) comparisons.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Entry {
    std::string name;
    int score;
};

int main() {
    std::vector<int> times{42, 17, 99, 8};
    std::sort(times.begin(), times.end());
    for (int t : times) std::cout << t << ' ';
    std::cout << '\\n';

    std::vector<Entry> board{
        {"Kai", 900}, {"Ana", 1200}, {"Bo", 900}, {"Cy", 450}};
    std::sort(board.begin(), board.end(),
              [](const Entry& a, const Entry& b) {
                  if (a.score != b.score) return a.score > b.score;
                  return a.name < b.name;
              });
    for (const Entry& e : board) {
        std::cout << e.name << ' ' << e.score << '\\n';
    }
}`,
          output: `8 17 42 99
Ana 1200
Bo 900
Kai 900
Cy 450`,
          annotations: [
            { lines: 13, text: 'No comparator: ascending order via `<`, ideal for speedrun times.' },
            { lines: '19-23', text: 'A leaderboard: highest score first, ties broken alphabetically. Take parameters by `const&` — the comparator is called O(n log n) times, so copying entries would add up.' },
            { lines: 21, text: '`>` on scores gives descending order. Note it is *strict*: equal scores return `false`, and the next line decides.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Comparators must be strict: `<`, never `<=`',
          text: 'A comparator must obey a [[strict-weak-ordering]]: `comp(a, a)` must be `false`, and if `comp(a, b)` is `true` then `comp(b, a)` must be `false`. A comparator using `<=` or `>=` breaks this, and passing it to `std::sort` is **undefined behavior** — not just a wrong order. Real implementations rely on the rule to skip bounds checks, so a bad comparator can make the sort read past the end of the array and crash, typically only for certain inputs with many equal elements.',
        },
        {
          type: 'table',
          headers: ['Algorithm', 'Use it when'],
          rows: [
            ['`std::sort`', 'You need a full sort and the relative order of equal elements does not matter'],
            ['`std::stable_sort`', 'Equal elements must keep their original order (e.g. sort by team, keep join order)'],
            ['`std::partial_sort`', 'You only need the top *k* in order — a top-10 leaderboard'],
            ['`std::nth_element`', 'You need the *k*-th element (a median, a cut-off score) without sorting the rest'],
          ],
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This leaderboard sort sometimes crashes when many players have the same score. Tap the line responsible.',
      code: `struct Entry {
    std::string name;
    int score;
};

void sortBoard(std::vector<Entry>& board) {
    std::sort(board.begin(), board.end(),
              [](const Entry& a, const Entry& b) {
                  return a.score >= b.score;
              });
}`,
      bugLines: [9],
      hint: 'What does the comparator return when it compares an entry with itself?',
      explanation:
        'Line 9 uses `>=`, so `comp(a, a)` is `true` and two equal scores each claim to come before the other. That violates strict weak ordering, which makes `std::sort` undefined behavior: implementations may run past the end of the range while partitioning, causing crashes or memory corruption that depend on the data. Use `a.score > b.score`, and add a tie-breaker (such as the name) if you need a deterministic order for equal scores.',
    },
    {
      kind: 'concept',
      title: 'Transforming and accumulating',
      blocks: [
        {
          type: 'p',
          text: '`std::transform` applies a function to every element of an input range and writes the results to an output range — "map" in other languages. `std::accumulate`, from `<numeric>`, folds a range into a single value by repeatedly applying `+` (or an operation you supply) to a running total.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <algorithm>
#include <iostream>
#include <iterator>
#include <numeric>
#include <vector>

int main() {
    std::vector<int> baseDamage{10, 25, 40};

    std::vector<double> crit(baseDamage.size());
    std::transform(baseDamage.begin(), baseDamage.end(),
                   crit.begin(),
                   [](int d) { return d * 1.5; });

    std::vector<int> gold;
    std::transform(baseDamage.begin(), baseDamage.end(),
                   std::back_inserter(gold),
                   [](int d) { return d * 2; });

    for (double d : crit) std::cout << d << ' ';
    std::cout << '\\n';

    int totalGold = std::accumulate(gold.begin(), gold.end(), 0);
    double totalCrit = std::accumulate(crit.begin(), crit.end(), 0.0);
    std::cout << totalGold << ' ' << totalCrit << '\\n';
}`,
          output: `15 37.5 60
150 112.5`,
          annotations: [
            { lines: '10-13', text: 'The output range must already have room: `crit` is created with three elements, and `transform` overwrites them. Writing into an empty vector this way would be undefined behavior.' },
            { lines: 17, text: '`std::back_inserter(gold)` is an output iterator that calls `push_back` on every assignment, so the destination may start empty.' },
            { lines: 23, text: 'The third argument is the starting value. Its **type** is the type of the running total — here `int`.' },
            { lines: 24, text: 'For doubles, start from `0.0`. Starting from `0` would make the total an `int`, truncating after every addition.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The initial-value trap',
          text: '`std::accumulate(prices.begin(), prices.end(), 0)` on a vector of `double`s compiles without a peep and returns the wrong answer, because the accumulator is an `int` and each partial sum is converted back to `int`. The template deduces its accumulator type from the initial value, not from the elements. Match the initial value to the result type you want: `0.0`, `0LL`, or `std::string{}` for concatenation.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: '`std::reduce` and parallel algorithms',
          text: 'C++17 added `std::reduce`, which is like `accumulate` but may combine elements in any order, so it requires an operation where order does not matter (such as `+` on integers). In exchange it can be vectorized or run in parallel with an execution policy: `std::reduce(std::execution::par, ...)`. Many algorithms accept these policies; with GCC, actually running in parallel requires linking Intel\'s TBB library.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `std::vector<double> loot{1.5, 2.5, 3.5};
std::cout << std::accumulate(loot.begin(), loot.end(), 0)
          << '\\n';`,
      options: [
        { text: '7.5', why: 'That is the mathematical sum, but the accumulator is not a `double`. The type of the initial value `0` decides it.' },
        { text: '7', why: 'The truncation happens after *every* addition, not just once at the end, so the error compounds.' },
        { text: '6', correct: true, why: '0 + 1.5 → 1 (stored as `int`), 1 + 2.5 → 3, 3 + 3.5 → 6. Each partial sum is truncated back to `int`.' },
        { text: 'It does not compile: `0` is not a `double`', why: 'It compiles: `double` converts to `int` implicitly. That silence is exactly what makes this bug dangerous.' },
      ],
      explanation:
        '`std::accumulate` is a template that deduces its accumulator type `T` from the initial value. With `0`, `T` is `int`, so every `total = total + element` computes a `double` and then truncates it back into an `int`. Writing `0.0` makes the accumulator a `double` and gives 7.5.',
    },
    {
      kind: 'concept',
      title: 'Removing elements: erase–remove and std::erase_if',
      blocks: [
        {
          type: 'p',
          text: 'Here is the most surprising algorithm in the library: **`std::remove` does not remove anything**. Remember, algorithms cannot change a container\'s size. So `std::remove(first, last, value)` instead shifts every element you want to *keep* towards the front, and returns an iterator to the new **logical end**. The elements after it are left in a valid but unspecified state.',
        },
        {
          type: 'memory',
          caption: 'std::remove(hp.begin(), hp.end(), 0) on {0, 40, 0, 75, 10}. The size is still 5 afterwards.',
          regions: [
            {
              label: 'Before',
              kind: 'heap',
              cells: [
                { name: '[0]', value: '0' },
                { name: '[1]', value: '40' },
                { name: '[2]', value: '0' },
                { name: '[3]', value: '75' },
                { name: '[4]', value: '10' },
              ],
            },
            {
              label: 'After remove',
              kind: 'heap',
              cells: [
                { name: '[0]', value: '40' },
                { name: '[1]', value: '75' },
                { name: '[2]', value: '10' },
                { name: '[3]', value: '(unspecified)', id: 'newEnd', highlight: true },
                { name: '[4]', value: '(unspecified)', highlight: true },
              ],
            },
            {
              label: 'Returned',
              kind: 'stack',
              cells: [{ name: 'newEnd', type: 'iterator', value: 'hp.begin() + 3', pointsTo: 'newEnd' }],
            },
          ],
        },
        {
          type: 'p',
          text: 'To actually delete the leftovers, hand that iterator to the container\'s own `erase`, which *can* change the size. This two-step combination is the [[erase-remove-idiom|erase–remove idiom]]. C++20 finally wraps it in one call: `std::erase(container, value)` and `std::erase_if(container, predicate)`, available for every standard container, returning how many elements were removed.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> hp{0, 40, 0, 75, 10};
    auto newEnd = std::remove(hp.begin(), hp.end(), 0);
    std::cout << "after remove: size " << hp.size() << '\\n';
    hp.erase(newEnd, hp.end());
    std::cout << "after erase:  size " << hp.size() << '\\n';

    std::vector<int> shields{5, 0, 0, 20};
    auto removed = std::erase_if(shields,
                                 [](int s) { return s == 0; });
    std::cout << removed << " removed, "
              << shields.size() << " left\\n";
}`,
          output: `after remove: size 5
after erase:  size 3
2 removed, 2 left`,
          annotations: [
            { lines: 7, text: 'Compacts the kept values (40, 75, 10) to the front. Nothing is deleted yet.' },
            { lines: 8, text: 'Proof: the size is still 5.' },
            { lines: 9, text: 'The two-argument `erase(first, last)` deletes the whole unwanted tail in one go.' },
            { lines: '13-14', text: 'C++20: one call does both steps and returns the number of removed elements. Prefer this in new code.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why this design is fast',
          text: 'Erasing matching elements one by one from a vector shifts the tail every time — O(n²) for many removals. `remove`/`remove_if` move each kept element at most once, so remove-then-erase is a single O(n) pass. That makes `std::erase_if` the right way to purge dead enemies or expired buffs from a vector each frame.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the erase–remove idiom so every dead enemy is really deleted from `enemies`.',
      template: `enemies.___(std::remove_if(enemies.begin(), enemies.end(), isDead),
              enemies.___());`,
      blanks: [{ answers: ['erase'] }, { answers: ['end'] }],
      wordBank: ['erase', 'end', 'remove', 'begin', 'clear', 'size'],
      explanation:
        '`std::remove_if` moves the survivors to the front and returns the new logical end; `erase(newEnd, end())` then deletes everything from there to the real end. Calling `erase` with only the first iterator would delete just *one* element, and wrapping it in `remove` again would not change the size at all. In C++20, `std::erase_if(enemies, isDead)` does the same thing in one call.',
    },
    {
      kind: 'order',
      prompt: 'Arrange the lines so the program prints `2` (the number of non-zero health values).',
      lines: [
        'std::vector<int> hp{0, 30, 0, 80};',
        'auto newEnd = std::remove(hp.begin(), hp.end(), 0);',
        'hp.erase(newEnd, hp.end());',
        'std::cout << hp.size() << \'\\n\';',
      ],
      distractors: ['hp.erase(newEnd);', 'std::remove(hp.begin(), hp.end(), 0);'],
      explanation:
        'The vector must exist before anything uses it; `remove` must run before `erase` can use its result; and the size is printed last, after the tail is gone. The distractors are the two classic mistakes: `hp.erase(newEnd)` erases only the single element at `newEnd` (printing 3), and calling `std::remove` without using its result leaves the size at 4.',
    },
    {
      kind: 'concept',
      title: 'Min, max and logical tests',
      blocks: [
        {
          type: 'p',
          text: '`std::min_element` and `std::max_element` return an **iterator** to the smallest or largest element, using `<` or your comparator. `std::any_of`, `std::all_of` and `std::none_of` test a predicate against a range and return `bool`, stopping as soon as the answer is known.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Enemy {
    std::string name;
    int health;
};

int main() {
    std::vector<Enemy> wave{{"Rat", 10}, {"Ogre", 80}, {"Imp", 25}};
    auto byHealth = [](const Enemy& a, const Enemy& b) {
        return a.health < b.health;
    };
    auto isAlive = [](const Enemy& e) { return e.health > 0; };

    auto strongest = std::max_element(wave.begin(), wave.end(),
                                      byHealth);
    auto weakest = std::min_element(wave.begin(), wave.end(),
                                    byHealth);
    std::cout << strongest->name << ' ' << weakest->name << '\\n';

    std::cout << std::boolalpha
              << std::all_of(wave.begin(), wave.end(), isAlive) << ' '
              << std::any_of(wave.begin(), wave.end(),
                             [](const Enemy& e) {
                                 return e.health > 100;
                             })
              << '\\n';

    std::vector<Enemy> empty;
    std::cout << std::all_of(empty.begin(), empty.end(), isAlive)
              << ' '
              << (std::max_element(empty.begin(), empty.end(),
                                   byHealth) == empty.end())
              << '\\n';

    std::cout << std::max({3, 9, 4}) << '\\n';
}`,
          output: `Ogre Rat
true false
true true
9`,
          annotations: [
            { lines: '13-15', text: 'One comparator reused by both searches. Like a sorting comparator, it answers "is `a` less than `b`?".' },
            { lines: '18-21', text: 'Iterators, not values: you can read `->name`, or modify or erase the element in place.' },
            { lines: 25, text: '`std::boolalpha` makes the stream print `true`/`false` instead of `1`/`0`.' },
            { lines: 34, text: '`all_of` on an empty range is `true`: there is no element that fails the test.' },
            { lines: '36-37', text: 'On an empty range, `max_element` returns `end()` — which is exactly why it returns an iterator: there is no value it could return.' },
            { lines: 40, text: 'For plain values rather than ranges, `std::max` and `std::min` accept an initializer list.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is `all_of` true for nothing?',
          text: 'This is "vacuous truth" from logic, and it is the only consistent choice. `all_of` means "no element fails the test", which is true when there are no elements. It also keeps the identities intact: `all_of(p)` is always the same as `none_of(not p)`, and splitting a range in two, the whole passes `all_of` exactly when both halves do — even if one half is empty. Correspondingly, `any_of` on an empty range is `false`.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: '`std::all_of(v.begin(), v.end(), isAlive)` returns `false` when `v` is empty, because there are no living enemies.',
      answer: false,
      explanation:
        'On an empty range `all_of` returns `true` and `any_of` returns `false`. "All enemies are alive" is vacuously true when there are no enemies — nothing contradicts it. This matters in game logic: a "wave cleared when all enemies are dead" check passes immediately for a wave that spawned no enemies, so guard such checks with an emptiness test when that would be wrong.',
    },
    {
      kind: 'concept',
      title: 'Choosing the right algorithm',
      blocks: [
        {
          type: 'p',
          text: 'Learning the library is mostly learning the vocabulary. When you are about to write a loop, ask which question it answers, and look it up:',
        },
        {
          type: 'table',
          headers: ['Question', 'Algorithm'],
          rows: [
            ['Is there any / are all / is none…?', '`std::any_of`, `std::all_of`, `std::none_of`'],
            ['Where is the first…?', '`std::find`, `std::find_if`'],
            ['How many…?', '`std::count`, `std::count_if`'],
            ['Put them in order', '`std::sort`, `std::stable_sort`, `std::partial_sort`'],
            ['Which is biggest / smallest?', '`std::max_element`, `std::min_element`, `std::minmax_element`'],
            ['Turn each into something else', '`std::transform`'],
            ['Combine them into one value', '`std::accumulate`, `std::reduce`'],
            ['Get rid of some', '`std::erase_if` (C++20), or remove + erase'],
            ['Copy some of them elsewhere', '`std::copy_if` with `std::back_inserter`'],
            ['Shuffle the loot table', '`std::shuffle` with a random engine'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'When a loop is still fine',
          text: 'Algorithms are not a religion. If a loop does several unrelated things per element, or the lambda would be longer and harder to read than the loop, a plain range-based `for` is fine. The goal is code whose intent is obvious; most of the time a named algorithm achieves that best.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal\'s algorithm toolbox',
          text: 'In Unreal code you will mostly use `TArray` members — `Sort`, `StableSort`, `FindByPredicate`, `RemoveAll(Predicate)`, `RemoveAllSwap` (faster when order does not matter), `FilterByPredicate` — plus the `Algo::` free functions. The vocabulary is the same as here, so knowing the standard algorithms transfers directly.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'You need to know whether **any** enemy in a wave of 10,000 is a boss, and you want to stop checking as soon as one is found. Which is the best choice?',
      options: [
        {
          text: '`std::count_if(wave.begin(), wave.end(), isBoss) > 0`',
          why: 'Correct result, but `count_if` must visit every element to produce a count, so it cannot stop early — and the comparison hides the intent.',
        },
        {
          text: '`std::any_of(wave.begin(), wave.end(), isBoss)`',
          correct: true,
          why: 'It returns `true` at the first boss it finds and its name states the question exactly.',
        },
        {
          text: '`std::all_of(wave.begin(), wave.end(), isBoss)`',
          why: 'That asks whether *every* enemy is a boss — a different question.',
        },
        {
          text: '`std::find(wave.begin(), wave.end(), isBoss) != wave.end()`',
          why: '`std::find` compares elements with `==` against a *value*; it would try to compare each `Enemy` with the lambda and fail to compile. The predicate version is `find_if`.',
        },
      ],
      explanation:
        'Pick the algorithm whose name matches the question. `any_of` short-circuits at the first match and says what it does. (`find_if(...) != end()` would also stop early, but it answers "where?" when you only asked "whether?".) Choosing precisely is what turns algorithm use from a style preference into clearer and often faster code.',
    },
  ],
  takeaways: [
    'Algorithms name common loop patterns; they state intent, avoid off-by-one bugs, and are carefully optimized.',
    'Algorithms work on iterator ranges, so they can read, write and reorder elements but never change a container\'s size.',
    'Searches return iterators — compare with `end()` before dereferencing; prefer a container\'s own `find` when it has one.',
    'Comparators must be strict (`<`, `>`), never `<=`: violating strict weak ordering in `std::sort` is undefined behavior.',
    '`std::transform` needs room in its output (or a `std::back_inserter`); `std::accumulate`\'s initial value decides the accumulator type.',
    '`std::remove`/`remove_if` only compact the kept elements; follow with `erase`, or use C++20 `std::erase_if` in one call.',
    '`min_element`/`max_element` return iterators (end for empty ranges); `all_of` is true and `any_of` false on empty ranges.',
  ],
  reading: [
    {
      title: 'Algorithms library',
      url: 'https://en.cppreference.com/w/cpp/algorithm',
      source: 'cppreference',
      note: 'The complete catalogue, grouped by purpose — skim it once to learn what exists before you write your next loop.',
    },
    {
      title: 'std::remove, std::remove_if',
      url: 'https://en.cppreference.com/w/cpp/algorithm/remove',
      source: 'cppreference',
      note: 'The precise behavior of remove, including what the tail elements contain afterwards, and the erase–remove example.',
    },
    {
      title: 'std::sort',
      url: 'https://en.cppreference.com/w/cpp/algorithm/sort',
      source: 'cppreference',
      note: 'Complexity guarantees and the exact comparator requirements.',
    },
    {
      title: 'Introduction to standard library algorithms',
      url: 'https://www.learncpp.com/cpp-tutorial/introduction-to-standard-library-algorithms/',
      source: 'learncpp',
      note: 'A gentle tour of find, count, sort and for_each with extra practice exercises.',
    },
  ],
};
