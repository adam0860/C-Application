import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-structured-bindings-tuples',
  title: 'pair, tuple and Structured Bindings',
  summary: 'Bundling values with std::pair and std::tuple, unpacking them with structured bindings — and when a named struct is better.',
  minutes: 16,
  objectives: [
    'Group values with `std::pair` and `std::tuple` and read them with `.first`/`.second` and `std::get`',
    'Unpack pairs, tuples, structs and arrays with structured bindings, choosing between `auto`, `auto&` and `const auto&`',
    'Iterate a map with `for (const auto& [key, value] : map)` and explain why the binding form avoids hidden copies',
    'Decide between returning a tuple and returning a named struct',
    'Use `std::tie` to unpack into existing variables and to write lexicographic comparisons',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'std::pair: two values as one',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes two values belong together but don\'t deserve a whole class: a player name and a score, a grid coordinate, a key and its value. [[std-pair]] (header `<utility>`) is a tiny struct template with two public members, `first` and `second`, which may have different types.',
        },
        {
          type: 'code',
          title: 'pair.cpp',
          runnable: true,
          code: `#include <iostream>
#include <map>
#include <string>
#include <utility>

int main() {
    std::pair<std::string, int> topScore{"Ada", 9800};
    std::cout << topScore.first << ": " << topScore.second << '\\n';

    auto runnerUp = std::make_pair(std::string{"Bo"}, 8700);
    std::cout << std::boolalpha << (runnerUp < topScore) << '\\n';

    std::map<std::string, int> kills{{"Ada", 12}};
    auto result = kills.insert({"Ada", 99});   // key exists
    std::cout << result.second << ' ' << result.first->second << '\\n';
}`,
          output: `Ada: 9800
false
false 12`,
          annotations: [
            { lines: 7, text: 'The two types are template arguments; the braces initialize `first` and `second` in order.' },
            { lines: 10, text: '`std::make_pair` deduces the types from its arguments — the pre-C++17 way to avoid spelling them out.' },
            { lines: 11, text: 'Pairs compare **lexicographically**: `first` decides, and `second` only breaks ties. "Bo" sorts after "Ada", so this is `false` even though Bo\'s score is lower.' },
            { lines: 14, text: '`std::map::insert` returns a pair: an [[iterator]] to the element, and a `bool` saying whether insertion happened.' },
            { lines: 15, text: '`false`: "Ada" already existed, so nothing was inserted, and the iterator points at the existing value 12.' },
          ],
        },
        {
          type: 'p',
          text: 'You have been using pairs all along: every element of a `std::map<K, V>` is a `std::pair<const K, V>`. That is why map iteration hands you `.first` (the key) and `.second` (the value).',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Deduction can surprise you',
          text: 'Since C++17, [[ctad|class template argument deduction]] lets you write `std::pair p{"Ada", 9800};` with no template arguments. But a string literal is an array of `const char`, which decays to a pointer, so `p` is a `std::pair<const char*, int>` — not a pair holding a `std::string`. Comparing `p.first == "Ada"` would then compare **addresses**. Spell out `std::string` when you want one.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'std::tuple: any number of values',
      blocks: [
        {
          type: 'p',
          text: '[[std-tuple]] (header `<tuple>`) generalizes pair to any number of elements. Its elements have no names, so you access them by **position** or by **type** with `std::get`:',
        },
        {
          type: 'code',
          title: 'tuple.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <tuple>

int main() {
    std::tuple<std::string, int, double> enemy{"Goblin", 30, 1.5};
    std::cout << std::get<0>(enemy) << " hp=" << std::get<1>(enemy)
              << " speed=" << std::get<double>(enemy) << '\\n';

    std::get<1>(enemy) -= 10;                // get returns a reference
    auto boss = std::make_tuple(std::string{"Troll"}, 200, 0.8);
    std::cout << std::get<0>(boss) << ' ' << std::get<1>(enemy) << '\\n';
    std::cout << std::tuple_size_v<decltype(boss)> << '\\n';
}`,
          output: `Goblin hp=30 speed=1.5
Troll 20
3`,
          annotations: [
            { lines: 6, text: 'Three elements of three different types. What does element 1 *mean*? Nothing in the type says — remember that for later.' },
            { lines: 7, text: '`std::get<0>` returns element 0. The index goes in the angle brackets because it is a **template argument**.' },
            { lines: 8, text: '`std::get<double>` selects by type. It only compiles if exactly one element has that type.' },
            { lines: 10, text: '`std::get` on a non-const tuple returns a reference, so you can modify the element in place.' },
            { lines: 13, text: '`std::tuple_size_v` gives the number of elements at compile time. `decltype(boss)` means "the declared type of `boss`".' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why can\'t you loop over a tuple with an index variable?',
          text: 'Each element can have a different type, and every C++ expression must have a single type known at [[compile-time]]. `std::get<1>(enemy)` is an `int&`, while `std::get<0>(enemy)` is a `std::string&` — so the index must be known when compiling, to know what type the expression has. A runtime `int i` cannot provide that. Tuples are for a fixed handful of values, not for sequences; use a `std::vector` or `std::array` when you need to loop.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'No hidden cost',
          text: 'A tuple is laid out much like a struct with the same members — no heap allocation, no type tags, no indirection. `std::get<1>(t)` compiles down to a plain member access. The cost of tuples is in readability, not speed.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Why does `for (int i = 0; i < 3; ++i) std::cout << std::get<i>(enemy);` fail to compile?',
      options: [
        { text: 'Because `std::get` only works on `std::pair`, not on `std::tuple`', why: '`std::get` works on pairs, tuples, `std::array` and `std::variant`. The problem is the index, not the type.' },
        { text: 'Because the index must be a compile-time constant: each element may have a different type, and the expression\'s type must be known when compiling', correct: true, why: 'The index is a template argument. Since `std::get<0>` and `std::get<1>` return different types, a runtime `i` cannot be used to choose between them.' },
        { text: 'Because tuple indices start at 1, so `std::get<0>` is invalid', why: 'Tuple indices start at 0, like arrays. `std::get<0>` is the first element.' },
        { text: 'Because `std::get` copies the element and copying is not allowed in a loop', why: '`std::get` returns a reference, and copying inside loops is perfectly legal. This is about compile-time vs. run-time values.' },
      ],
      explanation:
        'Everything in angle brackets is decided at compile time. A tuple\'s elements can each have a different type, so the compiler must know *which* element you mean in order to know the type of `std::get<N>(t)`. A loop variable only has a value at run time. (Advanced code can iterate tuples with compile-time tools like `std::apply` and fold expressions, but for a sequence of same-typed values you want a container.)',
    },
    {
      kind: 'concept',
      title: 'Structured bindings',
      blocks: [
        {
          type: 'p',
          text: '`std::get<0>(t)` and `.second` are not very descriptive. C++17\'s [[structured-binding|structured bindings]] unpack an object into named variables in one declaration: `auto [name, score] = topScore;`. They work with three kinds of things:',
        },
        {
          type: 'list',
          items: [
            '**Arrays** — C-style arrays and `std::array`: one name per element.',
            '**Tuple-like types** — `std::pair`, `std::tuple` and anything else that supports `std::get`.',
            '**Structs and classes whose non-static data members are all public** — one name per member, in declaration order.',
          ],
        },
        {
          type: 'code',
          title: 'bindings.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <utility>

struct Stats {
    int hp;
    int mana;
};

int main() {
    Stats hero{100, 40};

    auto [hp, mana] = hero;        // a hidden COPY of hero
    hp -= 30;
    std::cout << hero.hp << ' ' << hp << '\\n';

    auto& [rhp, rmana] = hero;     // refers to hero itself
    rhp -= 30;
    rmana += 5;
    std::cout << hero.hp << ' ' << hero.mana << '\\n';

    int spawn[3]{10, 0, 25};
    const auto& [x, y, z] = spawn;
    std::cout << x + y + z << '\\n';

    std::pair<std::string, int> drop{"Gem", 3};
    auto [item, count] = drop;
    std::cout << count << "x " << item << '\\n';
}`,
          output: `100 70
70 45
35
3x Gem`,
          annotations: [
            { lines: 13, text: 'With plain `auto`, the compiler makes a hidden copy of `hero`; `hp` and `mana` are names for that copy\'s members.' },
            { lines: 15, text: 'Changing `hp` changed the copy. The original `hero.hp` is still 100.' },
            { lines: 17, text: 'With `auto&`, the hidden variable is a [[reference]] to `hero`, so the names refer to `hero`\'s own members.' },
            { lines: 20, text: 'Both changes went straight into `hero`.' },
            { lines: 23, text: '`const auto&` — read-only and no copy. The usual choice when you only want to look.' },
            { lines: 27, text: 'Pairs and tuples unpack the same way. The names are yours to choose — `item` reads far better than `drop.first`.' },
          ],
        },
        {
          type: 'definition',
          term: 'How it works',
          text: '`auto [a, b] = expr;` declares one hidden, unnamed variable initialized from `expr` (using whatever `auto`, `auto&` or `const auto&` you wrote), and then makes `a` and `b` **aliases** for its first and second element. The qualifiers apply to the hidden variable, not to the individual names.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The rules',
          text: 'You must provide **exactly** as many names as there are elements — no more, no fewer, and you cannot skip one (C++26 adds `_` as a placeholder for that). Bindings cannot be nested, and the struct form requires every data member to be public. If you only use some of the names, that\'s fine; GCC only warns when none of them is used.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'After `auto [hp, mana] = stats;` the statement `hp -= 10;` also reduces `stats.hp`.',
      answer: false,
      explanation:
        'Plain `auto` initializes the hidden variable by **copying** `stats`, and `hp` is a name for a member of that copy. To modify the original, write `auto& [hp, mana] = stats;` — then the hidden variable is a reference to `stats` and the names refer straight into it. Read the declaration as "`auto` (copy) or `auto&` (reference) of the whole object, then name its parts".',
    },
    {
      kind: 'concept',
      title: 'Iterating maps the modern way',
      blocks: [
        {
          type: 'p',
          text: 'Structured bindings shine in range-based `for` loops over maps. Each element is a `std::pair<const Key, Value>`, so you can name both halves directly:',
        },
        {
          type: 'code',
          title: 'map_loop.cpp',
          runnable: true,
          code: `#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> gold{
        {"Ada", 120}, {"Bo", 45}, {"Cy", 300}};

    for (auto& [name, coins] : gold) {
        coins += 10;                    // payday: edits the map
    }
    for (const auto& [name, coins] : gold) {
        std::cout << name << ": " << coins << '\\n';
    }

    auto [it, inserted] = gold.try_emplace("Dee", 0);
    std::cout << it->first << ' ' << std::boolalpha << inserted << '\\n';
}`,
          output: `Ada: 130
Bo: 55
Cy: 310
Dee true`,
          annotations: [
            { lines: 9, text: '`auto&` binds to each element in the map, so `coins` refers to the stored value and can modify it. `name` is a reference to a `const std::string` — map keys can never be changed in place.' },
            { lines: 12, text: '`const auto&`: read-only, no copies. The default choice for loops that just look.' },
            { lines: 16, text: 'Bindings also tidy up functions that return pairs: `try_emplace` returns an iterator and a "was it inserted?" flag.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Spelled-out type (subtly wrong)',
            tone: 'bad',
            code: `for (const std::pair<std::string, int>& e
         : gold) {
    std::cout << e.first << e.second;
}`,
            text: 'The element type is `pair<const std::string, int>`. This is a *different* type, so each iteration converts — **copying the string** into a temporary.',
          },
          right: {
            title: 'Structured binding',
            tone: 'good',
            code: `for (const auto& [name, coins] : gold) {
    std::cout << name << coins;
}`,
            text: '`auto` deduces the exact element type, so nothing is copied — and the names say what the parts mean.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the spelled-out version copies',
          text: 'A `const` reference may bind to a temporary created by an [[implicit-conversion]]. `std::pair<const std::string, int>` converts to `std::pair<std::string, int>`, so the loop quietly builds a converted copy of every element, string and all, and binds the reference to that temporary. It compiles, it prints the right thing, and it is slow. (Recent GCC versions flag it under `-Wall` with `-Wrange-loop-construct`.) Letting `auto` deduce the type makes the mistake impossible.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Maps in Unreal',
          text: 'Unreal\'s `TMap` stores `TPair<Key, Value>` elements whose members are named `Key` and `Value` instead of `first` and `second`, so engine code typically reads `for (const TPair<FName, int32>& Pair : Scores)` followed by `Pair.Key` and `Pair.Value`. Recent engine versions also accept structured bindings over a `TMap`, but you will see the `Pair.Key` style far more often in existing code.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'The first loop must give every player 10 extra gold. The second loop must only read the map, without copying anything.',
      template: `std::map<std::string, int> bank{{"Ada", 50}, {"Bo", 20}};

for (___ [name, coins] : bank) {
    coins += 10;
}
for (___ [name, coins] : bank) {
    std::cout << name << ' ' << coins << '\\n';
}`,
      blanks: [{ answers: ['auto&'] }, { answers: ['const auto&'] }],
      wordBank: ['auto&', 'const auto&', 'auto', 'auto*', 'const auto'],
      explanation:
        'Modifying the stored values needs a reference to each element: `auto&`. Reading without copying needs a reference too, and `const` documents (and enforces) that nothing changes: `const auto&`. Plain `auto` and `const auto` would copy every pair — including the key string — on each iteration, and in the first loop the `+= 10` would only change the copy. `auto*` does not compile: the elements are not pointers.',
    },
    {
      kind: 'mcq',
      prompt: 'This loop compiles and prints the right output, but profiling shows every element of the map being copied. Why?',
      code: `std::map<std::string, Stats> roster = loadRoster();
for (const std::pair<std::string, Stats>& entry : roster) {
    print(entry.first, entry.second);
}`,
      options: [
        { text: 'Range-based `for` always copies elements; only an index-based loop avoids that', why: 'Range-based `for` with a reference to the right type copies nothing. The issue is that the type written here is not the element type.' },
        { text: '`print` must be taking its arguments by value', why: 'Maybe, but that would not be fixed by changing the loop. Something in the loop header itself is creating copies.' },
        { text: 'The element type is `std::pair<const std::string, Stats>`, so each element is converted into a temporary of the written type — copying the string', correct: true, why: 'The written type lacks the `const` on the key. A `const&` can bind to a converted temporary, so the compiler silently builds one per element. `const auto&` (or `const auto& [name, stats]`) fixes it.' },
        { text: '`std::map` stores its elements as copies and must rebuild them when iterated', why: 'Map elements live in tree nodes and iterating hands you references to them. Nothing needs rebuilding.' },
      ],
      explanation:
        'Map elements are `std::pair<const Key, Value>`. Writing the type by hand and forgetting that `const` creates a mismatch, and a `const` reference happily binds to a converted temporary — one fresh copy per element, and copying a long string even allocates memory. Letting the compiler deduce the type with `auto`, or using a structured binding, avoids the trap entirely.',
    },
    {
      kind: 'concept',
      title: 'Returning several values: tuple or named struct?',
      blocks: [
        {
          type: 'p',
          text: 'A function that needs to produce several results used to take [[out-parameter|out-parameters]]: `bool rollDamage(int& outDamage, bool& outCrit)`. Returning a tuple and unpacking it with a structured binding is far clearer — but returning a **named struct** is often clearer still:',
        },
        {
          type: 'compare',
          left: {
            title: 'tuple: meaning lives in your head',
            tone: 'bad',
            code: `std::tuple<int, bool, bool>
rollDamage(const Weapon& w);

// Which bool is which?
auto [dmg, crit, killed] =
    rollDamage(sword);`,
            text: 'The signature says "an int and two bools". Every caller must remember the order — and two `bool`s can be swapped without any error.',
          },
          right: {
            title: 'named struct: meaning lives in the code',
            tone: 'good',
            code: `struct DamageRoll {
    int damage;
    bool critical;
    bool killedTarget;
};
DamageRoll rollDamage(const Weapon& w);

auto [dmg, crit, killed] =
    rollDamage(sword);   // still works!`,
            text: 'Self-documenting, readable as `roll.critical`, and it still supports structured bindings. Adding a field later doesn\'t break callers that use member names.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why prefer the struct',
          text: 'A tuple\'s element names exist only at each call site, chosen independently by each caller. A struct\'s names are part of the **interface**, checked by the compiler and shown by your IDE. The C++ Core Guidelines (F.21) recommend returning a struct or tuple instead of using out-parameters, and favour a named struct whenever the values have meaning. Tuples remain handy in generic code and for short-lived, obvious groupings — like `insert` returning "iterator and success flag".',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Returning a struct is cheap',
          text: 'Returning a struct by value does not mean copying it around. Thanks to guaranteed [[copy-elision]] (C++17), `return DamageRoll{42, true, false};` constructs the result directly in the caller\'s storage. Small structs are typically returned in CPU registers anyway.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal does both',
          text: 'Unreal APIs return rich results through named structs — [[fhitresult]] bundles everything about a trace hit: location, normal, actor, component, distance. But they usually pass the struct as an out-parameter with an `Out` prefix and return a `bool`: `bool LineTraceSingleByChannel(FHitResult& OutHit, ...)`. That shape makes `if (World->LineTraceSingleByChannel(Hit, ...))` read naturally.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'Critical hits barely scratch the enemy, and normal hits do 1 damage. Tap the line with the bug.',
      code: `// returns {damage, isCritical}
std::tuple<int, bool> rollDamage(int base) {
    bool crit = rollPercent() < 10;
    return {crit ? base * 2 : base, crit};
}

void attack(Enemy& target) {
    auto [crit, damage] = rollDamage(25);
    target.health -= damage;
    if (crit) showCritPopup();
}`,
      bugLines: [8],
      hint: 'Structured binding names are matched to elements by position, not by name.',
      explanation:
        'The names in a structured binding are assigned **by position**: `crit` refers to element 0 (the `int` damage) and `damage` refers to element 1 (the `bool`). So line 9 subtracts a `bool` — 1 or 0 — from health, and line 10 treats any non-zero damage as a crit. It all compiles, because `int` and `bool` convert to each other silently. The fix is `auto [damage, crit] = ...`, or better, return a struct with named members so the order cannot be confused.',
    },
    {
      kind: 'concept',
      title: 'std::tie: unpack into existing variables, compare in order',
      blocks: [
        {
          type: 'p',
          text: 'Structured bindings always declare **new** variables. To unpack into variables that already exist, use [[std-tie]]: it builds a tuple of references to its arguments, so assigning a tuple to it writes into those variables. `std::ignore` skips an element. Its other big use is ordering: comparing two `std::tie` tuples compares the referenced values lexicographically, without copying anything.',
        },
        {
          type: 'code',
          title: 'tie.cpp',
          runnable: true,
          code: `#include <algorithm>
#include <iostream>
#include <string>
#include <tuple>
#include <vector>

struct Entry {
    std::string name;
    int level;
};

bool byLevelThenName(const Entry& a, const Entry& b) {
    return std::tie(a.level, a.name) < std::tie(b.level, b.name);
}

std::tuple<std::string, int, bool> lastSession() {
    return {"Ada", 7, true};
}

int main() {
    std::vector<Entry> board{{"Cy", 5}, {"Ada", 7}, {"Bo", 5},
                             {"Dee", 7}};
    std::sort(board.begin(), board.end(), byLevelThenName);
    for (const auto& e : board) std::cout << e.name << e.level << ' ';
    std::cout << '\\n';

    std::string player = "?";
    int level = 0;
    std::tie(player, level, std::ignore) = lastSession();
    std::cout << player << " reached level " << level << '\\n';
}`,
          output: `Bo5 Cy5 Ada7 Dee7
Ada reached level 7`,
          annotations: [
            { lines: 13, text: 'Compare by level first; only if the levels are equal, compare names. Writing this by hand takes several `if`s and is easy to get wrong.' },
            { lines: 23, text: 'Any comparison that follows this "first key, then tie-breaker" pattern can be passed straight to `std::sort`.' },
            { lines: 29, text: 'Assigns element 0 to `player` and element 1 to `level`; `std::ignore` swallows the `bool`. Both variables already existed.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'C++20: let the compiler write comparisons',
          text: 'If you want a struct to compare member by member in declaration order, C++20 can generate the whole set of comparison operators for you: `auto operator<=>(const Entry&) const = default;` (the [[three-way-comparison]] operator). Use `std::tie` when you need a custom order — different members, a different order, or descending keys.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Ties hold references',
          text: '`std::tie` stores references, so every assignment through it is immediate. That makes `std::tie(a, b) = std::tie(b, a);` a trap: it assigns `a = b` first, and then `b = a` using the **already overwritten** `a`. To swap, use `std::swap(a, b)`.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this fragment print?',
      code: `int a = 1, b = 2;
std::tie(a, b) = std::tie(b, a);
std::cout << a << ' ' << b;`,
      options: [
        { text: '`2 1`', why: 'That would be a real swap, but both sides are tuples of **references**. The right side doesn\'t hold the old values; it refers to the live variables.' },
        { text: '`2 2`', correct: true, why: 'Element-wise assignment runs in order: `a = b` makes `a` 2, then `b = a` copies the new value of `a`, so `b` is also 2.' },
        { text: '`1 1`', why: 'The assignments happen left to right: `a` receives `b`\'s value first, so `a` becomes 2, not the other way around.' },
        { text: 'It does not compile', why: 'Assigning one tuple of references to another is perfectly legal; it assigns element by element.' },
      ],
      explanation:
        'Because `std::tie` creates references rather than copies, the right-hand side has no snapshot of the old values. Element 0 is assigned first (`a = b`), then element 1 (`b = a`) reads the updated `a`. Use `std::swap(a, b)`, or put copies on the right: `std::tie(a, b) = std::pair{b, a};`.',
    },
    {
      kind: 'mcq',
      prompt: 'What type does `p` have after `std::pair p{"Ada", 9800};`?',
      options: [
        { text: '`std::pair<std::string, int>`', why: 'Deduction never invents a `std::string`. It deduces from the argument types exactly as given.' },
        { text: '`std::pair<const char*, int>`', correct: true, why: 'The string literal is a `const char[4]` that decays to `const char*`, and `9800` is an `int`. Class template argument deduction uses those types.' },
        { text: '`std::pair<char[4], int>`', why: 'Arrays decay to pointers when deduced for a pair, so the first type is a pointer, not an array.' },
        { text: 'It does not compile without explicit template arguments', why: 'Since C++17, class template argument deduction lets the compiler deduce the pair\'s types from the initializers.' },
      ],
      explanation:
        'Class template argument deduction takes argument types literally, and a string literal decays to `const char*`. The pair then stores a pointer, and comparing `p.first == "Ada"` compares addresses rather than text. Write `std::pair<std::string, int> p{"Ada", 9800};` (or use the `s` string-literal suffix) when you want a string.',
    },
  ],
  takeaways: [
    '`std::pair` groups two values (`first`, `second`); map elements are `std::pair<const Key, Value>`. Pairs and tuples compare lexicographically.',
    '`std::tuple` groups any number of values, accessed with `std::get<Index>` or `std::get<Type>`; the index must be a compile-time constant.',
    'Structured bindings (`auto [a, b] = x;`) unpack arrays, tuple-like types and all-public structs. `auto` copies the whole object; `auto&` and `const auto&` refer to it.',
    'Iterate maps with `for (const auto& [key, value] : map)` (or `auto&` to modify values); spelling the pair type by hand can silently copy every element.',
    'Prefer returning a named struct over a tuple when the values have meaning — names become part of the interface, and structs still support structured bindings.',
    '`std::tie` unpacks into existing variables and makes "compare by A, then B" orderings easy — but it holds references, so it cannot swap.',
  ],
  reading: [
    {
      title: 'Structured binding declaration',
      url: 'https://en.cppreference.com/w/cpp/language/structured_binding',
      source: 'cppreference',
      note: 'The precise rules for the hidden variable and the three binding cases.',
    },
    {
      title: 'std::tuple',
      url: 'https://en.cppreference.com/w/cpp/utility/tuple',
      source: 'cppreference',
      note: 'Every tuple helper, including std::get, std::tie, std::apply and tuple_size.',
    },
    {
      title: 'std::pair',
      url: 'https://en.cppreference.com/w/cpp/utility/pair',
      source: 'cppreference',
      note: 'Members, comparison rules and deduction guides for pair.',
    },
    {
      title: 'C++ Core Guidelines — F.21: To return multiple "out" values, prefer returning a struct or tuple',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rf-out-multi',
      source: 'core-guidelines',
      note: 'The reasoning behind returning aggregates instead of using out-parameters.',
    },
  ],
};
