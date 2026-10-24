import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-ranges',
  title: 'Ranges and Views',
  summary: 'C++20 ranges: algorithms that take whole containers, projections, and lazy pipelines built with the pipe operator.',
  minutes: 18,
  objectives: [
    'Call `std::ranges` algorithms on whole containers and explain why they are safer than iterator pairs',
    'Use projections to sort, search and compare by a member',
    'Build lazy pipelines with views such as `filter`, `transform`, `take`, `reverse` and `iota`',
    'Explain lazy evaluation and predict when work actually happens',
    'Recognise dangling protection and view lifetime pitfalls, and collect a view into a container',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'From iterator pairs to ranges',
      blocks: [
        {
          type: 'p',
          text: 'Classic algorithms take two iterators. That is flexible, but it is also verbose and fragile: nothing stops you writing `std::sort(scores.begin(), backup.end())`, mixing iterators from two different containers — undefined behavior that compiles without a warning.',
        },
        {
          type: 'p',
          text: 'C++20 introduces [[range|ranges]]: anything you can call `begin()` and `end()` on, such as a container, an array, a `std::string_view` or a view (more on those soon). The namespace `std::ranges` contains new versions of the algorithms that take a whole range at once:',
        },
        {
          type: 'compare',
          left: {
            title: 'Classic algorithms',
            tone: 'neutral',
            code: `std::sort(scores.begin(), scores.end());
auto it = std::find(names.begin(),
                    names.end(), "Ayla");`,
            text: 'Two iterators per call; nothing checks they belong together.',
          },
          right: {
            title: 'C++20 ranges algorithms',
            tone: 'good',
            code: `std::ranges::sort(scores);
auto it = std::ranges::find(names, "Ayla");`,
            text: 'Pass the range itself. Shorter, and mismatched iterators are impossible.',
          },
        },
        {
          type: 'p',
          text: 'The ranges algorithms are also **constrained with concepts**. Hand `std::ranges::sort` a `std::list` and the error says `random_access_range` is not satisfied — the cause — rather than complaining about a missing `operator-` deep inside the library, as `std::sort` does.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why add a second set of algorithms?',
          text: 'Changing the signatures of the existing algorithms would have broken decades of code, so the improved versions live in their own namespace. Beyond convenience, they fix real problems: whole-range calls rule out mismatched iterators, concepts give clear errors, and they add projections and dangling protection, which you will see in this lesson. In new code, prefer `std::ranges::` versions whenever one exists.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Compiler support',
          text: 'Everything in this lesson is standard C++20 and works with recent GCC, Clang and MSVC releases (the app\'s examples are checked with GCC 13). Ranges algorithms are in `<algorithm>`; views are in `<ranges>`.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Compared with `std::sort(scores.begin(), scores.end())`, what is the main safety benefit of `std::ranges::sort(scores)`?',
      options: [
        {
          text: 'It sorts in parallel automatically, so it cannot cause data races',
          why: 'Ranges algorithms are not automatically parallel; that is what execution policies on the classic algorithms are for. Their benefit is safety and convenience.',
        },
        {
          text: 'It sorts a copy, so the original vector is never modified',
          why: '`std::ranges::sort` sorts the range in place, exactly like `std::sort`.',
        },
        {
          text: 'It cannot be given iterators from two different containers, and its concept constraints give a clear error for unsuitable ranges',
          correct: true,
          why: 'Passing the range as one argument removes the mismatched-iterator bug entirely, and the concepts check requirements at the call site.',
        },
        {
          text: 'It also works on `std::list`, which `std::sort` rejects',
          why: '`std::ranges::sort` still needs random access. The difference is that its error message says so clearly. A list is sorted with its member `sort()`.',
        },
      ],
      explanation:
        'Iterator pairs carry an unchecked promise: both iterators belong to the same sequence and the first comes before the second. Passing a range as a single object makes that promise automatic. Combined with concept constraints such as `std::ranges::random_access_range`, misuse is caught at compile time with a message that names the real problem.',
    },
    {
      kind: 'concept',
      title: 'Projections: compare by a member',
      blocks: [
        {
          type: 'p',
          text: 'Sorting heroes by level with a classic algorithm means writing a comparator lambda. Ranges algorithms accept an extra argument, a [[ranges-projection|projection]], that is applied to each element *before* it is compared. A pointer to a data member such as `&Hero::level` is the most common projection:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <string>
#include <vector>

struct Hero {
    std::string name;
    int level;
};

int main() {
    std::vector<int> scores{300, 1200, 450, 900};
    std::ranges::sort(scores);
    for (int s : scores) std::cout << s << ' ';
    std::cout << '\\n';

    std::vector<Hero> party{{"Ayla", 7}, {"Brom", 12}, {"Cyra", 3}};
    std::ranges::sort(party, std::ranges::greater{}, &Hero::level);
    for (const Hero& h : party) std::cout << h.name << ' ';
    std::cout << '\\n';

    auto it = std::ranges::find(party, "Cyra", &Hero::name);
    if (it != party.end()) {
        std::cout << it->name << " is level " << it->level << '\\n';
    }

    auto rookie = std::ranges::min_element(party, {}, &Hero::level);
    std::cout << "Lowest level: " << rookie->name << '\\n';
}`,
          output: `300 450 900 1200
Brom Ayla Cyra
Cyra is level 3
Lowest level: Cyra`,
          annotations: [
            { lines: 14, text: 'The whole vector is the argument. Default order: ascending.' },
            { lines: 19, text: 'Three arguments: the range, a comparator, and a projection. `&Hero::level` turns each hero into its level, and `std::ranges::greater{}` orders the levels descending. Highest level first.' },
            { lines: 23, text: 'Projections work for searching too: compare each hero\'s *name* with "Cyra". No lambda needed.' },
            { lines: 28, text: '`{}` means "use the default comparator" (`std::ranges::less`), so only the projection changes.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Classic: comparator lambda',
            tone: 'neutral',
            code: `std::sort(party.begin(), party.end(),
    [](const Hero& a, const Hero& b) {
        return a.level > b.level;
    });`,
          },
          right: {
            title: 'Ranges: comparator + projection',
            tone: 'good',
            code: `std::ranges::sort(party,
    std::ranges::greater{},
    &Hero::level);`,
          },
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'What can be a projection?',
          text: 'Any callable that takes an element: a pointer to a data member (`&Hero::level`), a pointer to a member function (`&Hero::power`), or a lambda that computes a value from the element, such as a weighted score. Algorithms call it with `std::invoke`, which knows how to "call" member pointers. The default projection, `std::identity`, returns the element unchanged.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Given `struct Enemy { std::string name; int threat; };` and a `std::vector<Enemy> wave`, what does `std::ranges::sort(wave, {}, &Enemy::threat);` do?',
      options: [
        {
          text: 'Sorts the enemies in descending order of `threat`',
          why: 'Descending order needs a different comparator, such as `std::ranges::greater{}`. `{}` is the default "less than".',
        },
        {
          text: 'Sorts only the `threat` values, leaving each enemy\'s name where it was',
          why: 'A projection only affects what is *compared*. The algorithm still moves complete elements, so names stay with their threat values.',
        },
        {
          text: 'Fails to compile, because `Enemy` has no `operator<`',
          why: 'That would be true without the projection. With it, the comparison is done on `int` threat values, which have `<`.',
        },
        {
          text: 'Sorts the enemies in ascending order of `threat`',
          correct: true,
          why: 'The projection compares enemies by their `threat`, and `{}` selects the default `std::ranges::less`, giving ascending order. Whole `Enemy` objects are moved around.',
        },
      ],
      explanation:
        'A projection is applied to each element just before comparing; the comparator then sees the projected values (here `int`s). The elements themselves are rearranged as a whole. This removes most small comparator lambdas and keeps the intent — "sort by threat" — readable at a glance.',
    },
    {
      kind: 'concept',
      title: 'Views: lazy windows onto data',
      blocks: [
        {
          type: 'p',
          text: 'A [[view]] is a lightweight range that does not (usually) own elements. It *describes* a sequence computed from another range: "the alive enemies of `wave`", "each score doubled". Creating a view copies nothing and computes nothing; elements are produced one at a time as you iterate.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <ranges>
#include <string>
#include <vector>

struct Enemy {
    std::string name;
    int health;
};

int main() {
    std::vector<Enemy> wave{
        {"Rat", 0}, {"Ogre", 80}, {"Imp", 0}, {"Troll", 95}};

    auto alive = wave | std::views::filter([](const Enemy& e) {
                     return e.health > 0;
                 });
    for (const Enemy& e : alive) std::cout << e.name << ' ';
    std::cout << '\\n';

    wave[3].name = "Mountain Troll";
    for (const Enemy& e : alive) std::cout << e.name << ' ';
    std::cout << '\\n';

    auto names = alive | std::views::transform(&Enemy::name);
    for (const std::string& n : names) std::cout << '[' << n << ']';
    std::cout << '\\n';
}`,
          output: `Ogre Troll
Ogre Mountain Troll
[Ogre][Mountain Troll]`,
          annotations: [
            { lines: '15-17', text: '`std::views::filter` keeps elements for which the predicate is true. `alive` holds a reference to `wave` and the lambda — no enemies are copied.' },
            { lines: 18, text: 'Iterating the view walks `wave`, skipping elements that fail the predicate.' },
            { lines: '21-22', text: 'Proof that the view refers to the original data: rename the troll and the view shows the new name.' },
            { lines: 25, text: '`std::views::transform` produces each element passed through a function — here a projection-style member pointer. Views stack on top of views.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why views instead of building new vectors?',
          text: 'The classic approach — `copy_if` into a temporary vector, `transform` into another — allocates memory and copies every element at each step, even if you only need the first result. A view does none of that: it is a small object (typically a reference plus the function you gave it) that computes elements on demand. For per-frame game logic, avoiding those temporary allocations matters.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'A view must not outlive its data',
          text: 'Because `alive` refers to `wave`, it is only valid while `wave` exists and is not reallocated. A view is like a [[string-view]] for sequences: cheap and handy, but a borrowed window, not an owner. We will come back to this on the dangling card.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'The pipe syntax and common views',
      blocks: [
        {
          type: 'p',
          text: 'Views are created by **range adaptors** in `std::views`. Each adaptor can be called like a function, `std::views::take(r, 3)`, or applied with the pipe operator `|`, which reads left to right like a data pipeline:',
        },
        {
          type: 'compare',
          left: {
            title: 'Nested calls — read inside-out',
            tone: 'bad',
            code: `auto top = std::views::take(
    std::views::transform(
        std::views::filter(wave, isAlive),
        nameOf),
    3);`,
          },
          right: {
            title: 'Pipes — read left to right',
            tone: 'good',
            code: `auto top = wave
    | std::views::filter(isAlive)
    | std::views::transform(nameOf)
    | std::views::take(3);`,
          },
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <map>
#include <ranges>
#include <string>
#include <vector>

int main() {
    for (int wave : std::views::iota(1, 6)) std::cout << wave << ' ';
    std::cout << '\\n';

    auto odds = std::views::iota(1)
              | std::views::filter([](int n) { return n % 2 == 1; })
              | std::views::take(4);
    for (int n : odds) std::cout << n << ' ';
    std::cout << '\\n';

    std::vector<std::string> log{"spawn", "move", "attack", "die"};
    for (const auto& e : log | std::views::reverse
                             | std::views::take(2)) {
        std::cout << e << ' ';
    }
    std::cout << '\\n';
    for (const auto& e : log | std::views::drop(1)) {
        std::cout << e << ' ';
    }
    std::cout << '\\n';

    std::map<std::string, int> stock{{"Arrow", 40}, {"Potion", 3}};
    for (const auto& item : stock | std::views::keys) {
        std::cout << item << ' ';
    }
    for (int count : stock | std::views::values) {
        std::cout << count << ' ';
    }
    std::cout << '\\n';
}`,
          output: `1 2 3 4 5
1 3 5 7
die attack
move attack die
Arrow Potion 40 3`,
          annotations: [
            { lines: 8, text: '`iota(1, 6)` generates the numbers 1 to 5 — a half-open range, like iterators. No container is created.' },
            { lines: '11-13', text: '`iota(1)` with no end is an **infinite** range. That is fine, because `take(4)` stops after four elements and nothing is computed ahead of time.' },
            { lines: '18-19', text: '`reverse` walks backwards (it needs a bidirectional range), and `take(2)` keeps the first two of *that* — the two most recent log entries.' },
            { lines: 23, text: '`drop(n)` skips the first `n` elements.' },
            { lines: [29, 32], text: 'For maps (or any range of pairs), `keys` and `values` view just the first or second member of each element.' },
          ],
        },
        {
          type: 'table',
          headers: ['View', 'Produces'],
          rows: [
            ['`std::views::filter(pred)`', 'Only the elements for which `pred` is true'],
            ['`std::views::transform(f)`', '`f(element)` for each element'],
            ['`std::views::take(n)` / `drop(n)`', 'The first `n` elements / all but the first `n`'],
            ['`std::views::take_while(pred)`', 'Elements up to the first one failing `pred`'],
            ['`std::views::reverse`', 'The elements in reverse order'],
            ['`std::views::iota(a, b)`', 'The integers `a, a+1, …, b-1` (or forever, without `b`)'],
            ['`std::views::keys` / `values`', 'The first / second member of each pair-like element'],
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Order matters',
          text: 'A pipeline runs in the order written. `filter(isAlive) | take(3)` gives the first three *alive* enemies; `take(3) | filter(isAlive)` looks at only the first three enemies and keeps the alive ones among them — possibly fewer than three.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the pipeline so it yields the first three scores that are at least 1000.',
      template: `auto isHigh = [](int s) { return s >= 1000; };
auto podium = scores
    | std::views::___(isHigh)
    | std::views::___(3);`,
      blanks: [{ answers: ['filter'] }, { answers: ['take'] }],
      wordBank: ['filter', 'take', 'transform', 'drop', 'reverse', 'sort'],
      explanation:
        '`filter` keeps only the scores for which `isHigh` returns `true`; `take(3)` then stops after three of them. Swapping the order would take the first three scores and filter those. `transform` would replace each score with `isHigh`\'s `bool` result, and there is no `std::views::sort` — sorting needs to see every element before producing the first, so it cannot be a lazy view.',
    },
    {
      kind: 'concept',
      title: 'Lazy evaluation: when does the work happen?',
      blocks: [
        {
          type: 'p',
          text: 'Views use [[lazy-evaluation]]: building a pipeline only records what to do. The work happens element by element, at the moment you iterate. This program makes every step announce itself:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <ranges>
#include <vector>

int main() {
    std::vector<int> scores{20, 75, 40, 90, 60};

    auto pipeline = scores
        | std::views::filter([](int s) {
              std::cout << "  check " << s << '\\n';
              return s >= 50;
          })
        | std::views::transform([](int s) {
              std::cout << "  double " << s << '\\n';
              return s * 2;
          });

    std::cout << "pipeline built\\n";
    for (int v : pipeline) {
        std::cout << "got " << v << '\\n';
    }
}`,
          output: `pipeline built
  check 20
  check 75
  double 75
got 150
  check 40
  check 90
  double 90
got 180
  check 60
  double 60
got 120`,
          annotations: [
            { lines: '8-16', text: 'Constructing the pipeline calls neither lambda. "pipeline built" is printed first.' },
            { lines: '19-21', text: 'Each element flows through the whole pipeline before the next one starts: check, double, deliver. No intermediate vector of "high scores" ever exists.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Benefit — no temporaries**: each element is produced, used and forgotten.',
            '**Benefit — early exit and infinity**: `take`, `take_while` or a `break` in your loop stop the work; `iota(1)` can be endless.',
            '**Cost — work repeats**: iterate a view twice and the lambdas run twice. If a transformation is expensive and you need the results more than once, store them in a container.',
            '**Cost — side effects run late**: anything a lambda captures by reference is read when you *iterate*, not when you built the view.',
          ],
        },
        {
          type: 'deepdive',
          title: 'Lazy does not always mean minimal',
          blocks: [
            {
              type: 'p',
              text: 'To satisfy the rule that `begin()` is fast, `filter_view` remembers (caches) its first matching position the first time you ask for it. And `filter | take(n)` may test a few elements beyond the last one taken: after delivering the n-th element, the loop still increments the underlying filter iterator once, which searches ahead for the next match before `take` reports it is done. With side-effect-free predicates — which is what you should write — this only costs a little extra work.',
            },
          ],
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'The statement `auto doubled = scores | std::views::transform(f);` calls `f` on every element of `scores` immediately and stores the results inside `doubled`.',
      answer: false,
      explanation:
        'Views are lazy. The statement just creates a small object that remembers `scores` (by reference) and `f`. `f` runs only when you iterate `doubled`, once per element visited — and again if you iterate it a second time. If you actually want stored results, collect the view into a container.',
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>
#include <ranges>

int main() {
    for (int n : std::views::iota(1, 10)
               | std::views::filter([](int n) { return n % 2 == 0; })
               | std::views::transform([](int n) { return n * n; })) {
        std::cout << n << ' ';
    }
    std::cout << '\\n';
}`,
      options: [
        { text: '2 4 6 8', why: 'Those are the even numbers that pass the filter, but each is then squared by `transform`.' },
        { text: '4 16 36 64', correct: true, why: '`iota(1, 10)` gives 1 to 9, the filter keeps 2, 4, 6, 8, and the transform squares them.' },
        { text: '4 16 36 64 100', why: '`iota(1, 10)` is half-open: it stops at 9, so 10 is never generated.' },
        { text: '1 9 25 49 81', why: 'The filter keeps numbers where `n % 2 == 0` — the even ones, not the odd ones.' },
      ],
      explanation:
        'Read the pipe left to right: generate 1–9 (the end value is excluded, just like `end()`), keep the evens, square each. Pipelines like this replace a loop with an `if` and a calculation, and because the view is lazy, no container of intermediate numbers is ever built.',
    },
    {
      kind: 'concept',
      title: 'Dangling protection and view lifetimes',
      blocks: [
        {
          type: 'p',
          text: 'An algorithm that returns an iterator into a **temporary** container would return a dangling iterator: the container dies at the end of the statement. The ranges algorithms detect this case at compile time. Instead of an iterator, they return the empty type `std::ranges::dangling`, which cannot be dereferenced:',
        },
        {
          type: 'code',
          code: `std::vector<int> makeScores() { return {40, 90, 15}; }

auto it = std::ranges::max_element(makeScores());
std::cout << *it;          // compile error

auto scores = makeScores();
auto best = std::ranges::max_element(scores);
std::cout << *best;        // OK: scores is still alive`,
          annotations: [
            { lines: 3, text: 'The vector returned by `makeScores()` is destroyed at the `;`. With `std::max_element` this would compile and dangle.' },
            { lines: 4, text: 'g++: "no match for \'operator*\' (operand type is \'std::ranges::dangling\')". A run-time bug became a compile-time error.' },
            { lines: '6-8', text: 'Give the data a name, so it outlives the iterator, and everything works.' },
          ],
        },
        {
          type: 'p',
          text: 'Ranges whose iterators do not depend on the lifetime of the argument itself are called [[borrowed-range|borrowed ranges]]: a named (lvalue) container, which outlives the call, or a `std::string_view` or `std::span` (a non-owning view of contiguous elements), which merely point at data owned elsewhere. For those, algorithms return real iterators.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Views over locals are a classic dangling bug',
          text: 'Piping a named container into an adaptor makes a view that *refers* to it. Return such a view from a function and it refers to a destroyed local — no compile error this time. Piping a temporary or `std::move(local)` is safe, though: since a fix applied to C++20 (supported by GCC 12+), the view then takes ownership of the container (an `owning_view`).',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Pass views by value, not by const&',
          text: 'Views are cheap to copy, so take them by value. Some views, notably `filter_view`, cannot even be iterated through a `const&`, because `begin()` must update its cached position: a function `void print(const auto& r)` fails to compile when handed a filter view. Use `auto r` or `auto&& r` parameters for generic range code.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This compiles, but iterating the result of `bossHealth()` is undefined behavior. Tap the faulty line.',
      code: `#include <ranges>
#include <vector>

auto bossHealth() {
    std::vector<int> hp{0, 450, 80, 900};
    return hp | std::views::filter([](int h) { return h > 100; });
}

int main() {
    for (int h : bossHealth()) {
        // show boss health bars...
    }
}`,
      bugLines: [6],
      hint: 'What does a view built from a named vector hold, and what happens to `hp` when the function returns?',
      explanation:
        'Line 6 pipes the *named* local `hp`, so the filter view stores a reference to it (a `ref_view`). When `bossHealth` returns, `hp` is destroyed and the returned view refers to dead memory. Fixes: return `std::move(hp) | std::views::filter(...)`, which makes the view own the vector, or return a filtered `std::vector<int>` instead of a view.',
    },
    {
      kind: 'concept',
      title: 'Collecting results and when to use ranges',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes you need a real container at the end of a pipeline — to store results, index them, or iterate them repeatedly without recomputing. C++23 adds `std::ranges::to`, but GCC 13 does not have it yet, so in C++20 you construct the container from the view\'s iterators or copy into it:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <algorithm>
#include <iostream>
#include <iterator>
#include <ranges>
#include <string>
#include <vector>

struct Enemy {
    std::string name;
    int health;
};

int main() {
    std::vector<Enemy> wave{
        {"Rat", 0}, {"Ogre", 80}, {"Imp", 0}, {"Troll", 95}};
    auto names = wave
        | std::views::filter([](const Enemy& e) {
              return e.health > 0;
          })
        | std::views::transform(&Enemy::name);

    std::vector<std::string> roster(names.begin(), names.end());

    std::vector<std::string> firstUp;
    std::ranges::copy(names | std::views::take(1),
                      std::back_inserter(firstUp));

    std::cout << roster.size() << ' ' << firstUp.front() << '\\n';
}`,
          output: '2 Ogre',
          annotations: [
            { lines: 22, text: 'The iterator-pair constructor works when the view\'s `begin()` and `end()` have the same type, as they do here.' },
            { lines: '25-26', text: '`std::ranges::copy` with a `back_inserter` works for any view, including ones whose end is a different type (a *sentinel*), such as `take` over a filter.' },
          ],
        },
        {
          type: 'code',
          title: 'C++23 (GCC 14 and newer)',
          code: `auto roster = names | std::ranges::to<std::vector>();`,
          annotations: [
            { lines: 1, text: 'Collects any range into a container in one step, deducing the element type. Prefer it once your compilers support it.' },
          ],
        },
        {
          type: 'heading',
          text: 'When to reach for ranges',
        },
        {
          type: 'list',
          items: [
            '**Ranges algorithms**: in new code, almost always — they are the same algorithms with safer calls and projections.',
            '**Views**: for filtering, transforming and slicing data you are about to loop over, especially when it saves a temporary container.',
            '**Plain loops or containers**: when the pipeline gets long and clever, when results are reused many times, or when you need the data sorted — sorting is eager by nature, which is why no `views::sort` exists.',
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Debug builds and compile times',
          text: 'With optimizations on, a view pipeline usually compiles to the same tight loop you would write by hand. In unoptimized debug builds, though, every layer is a real function call, so deep pipelines can be noticeably slower — relevant for games, where debug builds must stay playable. Heavy template use also lengthens compile times. Measure hot paths rather than assuming.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Ranges and Unreal',
          text: 'Engine code does not use `std::ranges`; it has its own toolbox — `TArray` members like `FilterByPredicate` and `Sort`, and `Algo::` functions that accept projections in a similar spirit. The ideas carry over directly: name the operation, keep data where it is, avoid temporary arrays in per-frame code. Check your team\'s coding standard before mixing standard ranges into gameplay code.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Build a pipeline that yields the health values of living enemies whose health is low. `isAlive` takes an `Enemy`, `hpOf` turns an `Enemy` into its `int` health, and `isLow` takes an `int`.',
      lines: [
        'auto critical = enemies',
        '    | std::views::filter(isAlive)',
        '    | std::views::transform(hpOf)',
        '    | std::views::filter(isLow);',
      ],
      distractors: ['    | std::views::sort(byHealth)'],
      explanation:
        'Types decide the order. `isAlive` needs whole `Enemy` objects, so it must come before `transform(hpOf)`, which turns each enemy into an `int`; `isLow` takes an `int`, so it must come after. The statement ends with the semicolon on the last adaptor. There is no `std::views::sort`: a lazy view cannot produce the smallest element without first seeing them all, so sorting stays an eager algorithm (`std::ranges::sort`).',
    },
  ],
  takeaways: [
    'A range is anything with `begin()` and `end()`; `std::ranges` algorithms take the whole range, ruling out mismatched iterators and giving concept-based errors.',
    'Projections (`std::ranges::sort(party, {}, &Hero::level)`) let algorithms compare or search by a member without writing a lambda.',
    'Views (`filter`, `transform`, `take`, `drop`, `reverse`, `iota`, `keys`, `values`) are cheap, usually non-owning, and compose left to right with `|`.',
    'Views are lazy: nothing runs until you iterate, elements flow through the whole pipeline one at a time, and iterating twice repeats the work.',
    'Ranges algorithms return `std::ranges::dangling` for temporary containers; a view of a named local must never outlive it.',
    'Pass views by value; collect them with an iterator-pair constructor or `std::ranges::copy` in C++20, or `std::ranges::to` in C++23.',
  ],
  reading: [
    {
      title: 'Ranges library',
      url: 'https://en.cppreference.com/w/cpp/ranges',
      source: 'cppreference',
      note: 'Every view and range adaptor, with notes on which standard version introduced each one.',
    },
    {
      title: 'Constrained algorithms (std::ranges)',
      url: 'https://en.cppreference.com/w/cpp/algorithm/ranges',
      source: 'cppreference',
      note: 'The ranges versions of the algorithms, including how projections and `std::ranges::dangling` work.',
    },
    {
      title: 'C++ Core Guidelines: Templates and generic programming',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-templates',
      source: 'core-guidelines',
      note: 'Background on the concept-based design that ranges are built on.',
    },
  ],
};
