import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'half-open-range',
    term: 'Half-Open Range',
    aliases: ['[begin, end)', 'past-the-end iterator'],
    course: 'cpp',
    category: 'STL',
    short: 'A range written `[begin, end)`: it includes the element at `begin` but stops *before* `end`, which is one past the last element.',
    long: 'Every standard container and algorithm uses half-open ranges. An empty range is simply `begin == end`, the size is `end - begin`, and a range splits at any position `m` into `[begin, m)` and `[m, end)` without overlap.\n\nThe `end()` position may be formed and compared but never dereferenced. Search functions return it to mean "not found".',
    example: `std::vector<int> v{10, 20, 30};
// [v.begin(), v.end()) covers 10, 20, 30
// *v.end() would be undefined behavior`,
    see: ['iterator', 'range', 'pointer-arithmetic'],
  },
  {
    id: 'iterator-category',
    term: 'Iterator Category',
    aliases: ['random-access iterator', 'bidirectional iterator', 'forward iterator', 'contiguous iterator'],
    course: 'cpp',
    category: 'STL',
    short: 'A classification of iterators by what they can do: input, forward, bidirectional, random access and contiguous, each adding abilities to the previous.',
    long: 'Input iterators read a sequence once; forward iterators allow multiple passes; bidirectional ones add `--`; random-access ones add constant-time `it + n`, `it[n]`, subtraction and `<`; contiguous ones (C++20) also guarantee the elements are adjacent in memory. Output iterators are a separate, write-only category.\n\nAlgorithms state the weakest category they need — `std::sort` needs random access, which is why it rejects `std::list`. In C++20 each category is a concept such as `std::random_access_iterator`.',
    see: ['iterator', 'algorithm', 'concept'],
    reading: [
      {
        title: 'Iterator library',
        url: 'https://en.cppreference.com/w/cpp/iterator',
        source: 'cppreference',
      },
    ],
  },
  {
    id: 'init-capture',
    term: 'Init-Capture',
    aliases: ['generalized lambda capture', 'capture with initializer'],
    course: 'cpp',
    category: 'STL',
    short: 'A lambda capture with its own initializer, `[name = expression]`, which creates a new member of the closure (C++14).',
    long: 'Init-captures let a lambda capture a computed value (`[hp = player.health()]`), give a capture a different name, or move a move-only object such as a `std::unique_ptr` into the lambda (`[w = std::move(weapon)]`). They also create private state: `[count = 0]() mutable { return ++count; }`.',
    example: `auto weapon = std::make_unique<Weapon>();
auto fire = [w = std::move(weapon)] { w->shoot(); };`,
    see: ['lambda', 'capture', 'closure', 'std-move'],
  },
  {
    id: 'generic-lambda',
    term: 'Generic Lambda',
    aliases: ['auto lambda', 'template lambda'],
    course: 'cpp',
    category: 'STL',
    short: 'A lambda with `auto` parameters (C++14) or an explicit template parameter list (C++20), whose call operator is a template.',
    long: 'The closure type of a generic lambda has a templated `operator()`, so one lambda object can be called with arguments of different types. C++20 also allows `[]<typename T>(const std::vector<T>& v) { ... }` when the body needs to name the type.',
    example: `auto show = [](const auto& value) {
    std::cout << value << '\\n';
};
show(42);
show("loot");`,
    see: ['lambda', 'function-template', 'closure'],
  },
  {
    id: 'type-erasure',
    term: 'Type Erasure',
    aliases: ['type-erased wrapper'],
    course: 'cpp',
    category: 'STL',
    short: 'A technique that hides an object\'s concrete type behind a uniform interface, so different types can be stored and used through one type — like `std::function<void()>` holding any callable.',
    long: 'The wrapper stores the object (often on the heap, unless it fits in a small internal buffer) together with a way to call it indirectly, similar to a virtual function. The cost is an indirect call the optimizer usually cannot inline and a possible allocation; the benefit is that callers and containers no longer depend on the concrete type.\n\n`std::function`, `std::any` and Unreal\'s `TFunction` all use type erasure.',
    see: ['std-function', 'lambda', 'virtual-function', 'dynamic-dispatch'],
  },
  {
    id: 'immediately-invoked-lambda',
    term: 'Immediately Invoked Lambda',
    aliases: ['IIFE', 'IILE'],
    course: 'cpp',
    category: 'STL',
    short: 'A lambda that is defined and called in the same expression, `[&] { ... }()`, typically to initialize a `const` variable with complex logic.',
    long: 'The trailing `()` calls the lambda straight away, so the variable receives its result. This keeps the variable `const` (or `constexpr`) even when computing it needs branches or loops, instead of declaring it uninitialized and assigning later.',
    example: `const int maxHealth = [&] {
    if (difficulty == Difficulty::Hard) return 50;
    return 100;
}();`,
    see: ['lambda', 'const'],
  },
  {
    id: 'erase-remove-idiom',
    term: 'Erase–Remove Idiom',
    aliases: ['remove-erase idiom', 'std::erase_if'],
    course: 'cpp',
    category: 'STL',
    short: 'The pattern `v.erase(std::remove_if(v.begin(), v.end(), pred), v.end());` that actually deletes matching elements from a container.',
    long: '`std::remove` and `std::remove_if` only see iterators, so they cannot shrink a container. They move the elements to keep to the front and return the new logical end; the leftover tail holds valid but unspecified values. The container\'s own `erase` then chops the tail off.\n\nSince C++20, `std::erase(container, value)` and `std::erase_if(container, pred)` do both steps in one call for every standard container.',
    example: `std::erase_if(enemies, [](const Enemy& e) {
    return e.health <= 0;
});`,
    see: ['algorithm', 'predicate', 'iterator-invalidation'],
    reading: [
      {
        title: 'std::remove, std::remove_if',
        url: 'https://en.cppreference.com/w/cpp/algorithm/remove',
        source: 'cppreference',
      },
    ],
  },
  {
    id: 'strict-weak-ordering',
    term: 'Strict Weak Ordering',
    aliases: ['comparator requirements'],
    course: 'cpp',
    category: 'STL',
    short: 'The rules a comparator for `std::sort`, `std::map` and friends must follow: behave like `<`, never like `<=`.',
    long: 'A valid comparator `comp` must be irreflexive (`comp(a, a)` is false), asymmetric (if `comp(a, b)` then not `comp(b, a)`), and transitive, and "neither is less than the other" must behave as an equivalence. Using `<=` or `>=` breaks irreflexivity; passing such a comparator to `std::sort` is undefined behavior and can crash or corrupt memory in practice.',
    example: `// OK: strict
[](const Entry& a, const Entry& b) { return a.score > b.score; }
// UB with std::sort: not strict
[](const Entry& a, const Entry& b) { return a.score >= b.score; }`,
    see: ['algorithm', 'predicate', 'undefined-behavior'],
  },
  {
    id: 'ranges-projection',
    term: 'Projection (Ranges)',
    aliases: ['projection'],
    course: 'cpp',
    category: 'STL',
    short: 'An extra argument to C++20 `std::ranges` algorithms that transforms each element before it is compared or tested — e.g. sorting enemies by `&Enemy::health`.',
    long: 'Projections remove the need for many small lambdas: `std::ranges::sort(enemies, {}, &Enemy::health)` sorts by health using the default comparison, and `std::ranges::find(items, "Key", &Item::name)` searches by name. A projection can be a pointer to a data member, a pointer to a member function, or any callable.',
    example: `std::ranges::sort(party, std::ranges::greater{}, &Hero::level);`,
    see: ['range', 'algorithm', 'lambda'],
  },
  {
    id: 'lazy-evaluation',
    term: 'Lazy Evaluation',
    aliases: ['lazy', 'deferred evaluation'],
    course: 'cpp',
    category: 'STL',
    short: 'Delaying a computation until its result is actually needed. C++20 views are lazy: building a pipeline does no work; each element is computed when you iterate to it.',
    long: 'Laziness avoids temporary containers and lets you stop early — `std::views::iota(1) | std::views::take(5)` describes an infinite sequence but only ever produces five numbers. The flip side is that work happens during iteration, possibly repeatedly if you iterate a view more than once.',
    see: ['view', 'range'],
  },
  {
    id: 'borrowed-range',
    term: 'Borrowed Range',
    aliases: ['std::ranges::dangling', 'dangling protection'],
    course: 'cpp',
    category: 'STL',
    short: 'A range whose iterators do not depend on the lifetime of the range object passed in — such as `std::string_view`, `std::span`, or a named (lvalue) container. Ranges algorithms return `std::ranges::dangling` instead of an iterator when given a temporary non-borrowed range.',
    long: 'Calling `std::ranges::max_element(makeScores())` on a temporary `std::vector` would return an iterator into a vector that dies at the end of the statement. Instead the algorithm returns the empty type `std::ranges::dangling`, so trying to dereference the result is a compile error rather than undefined behavior.',
    see: ['range', 'view', 'dangling-reference', 'string-view'],
  },
];
