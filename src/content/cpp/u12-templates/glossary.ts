import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'abbreviated-function-template',
    term: 'Abbreviated Function Template',
    aliases: ['auto parameter', 'abbreviated template'],
    course: 'cpp',
    category: 'Templates',
    short: 'A function with `auto` in its parameter list, which C++20 turns into a function template without a `template <...>` line.',
    long: 'Each `auto` parameter invents its own independent template parameter, so `void f(auto a, auto b)` means `template <typename T, typename U> void f(T a, U b)` — the two arguments may have different types.\n\nA concept can be placed in front of `auto` (`std::integral auto x`) to constrain the invented parameter.',
    example: `void announce(const auto& item) {
    std::cout << "Picked up: " << item << '\\n';
}
// same as: template <typename T>
//          void announce(const T& item)`,
    see: ['function-template', 'auto', 'concept'],
    reading: [
      {
        title: 'Function template — abbreviated function template',
        url: 'https://en.cppreference.com/w/cpp/language/function_template',
        source: 'cppreference',
      },
    ],
  },
  {
    id: 'ctad',
    term: 'Class Template Argument Deduction (CTAD)',
    aliases: ['CTAD', 'deduction guide'],
    course: 'cpp',
    category: 'Templates',
    short: 'A C++17 feature that deduces a class template\'s arguments from the constructor arguments, so `std::vector v{1, 2, 3};` becomes `std::vector<int>`.',
    long: 'The compiler treats each constructor as if it were a function template and runs ordinary template argument deduction on it. Classes can add *deduction guides* to steer the result.\n\nWatch for surprises: string literals deduce `const char*`, and CTAD is all-or-nothing — you cannot specify some arguments and deduce the rest.',
    example: `std::pair drop{"Potion", 3};  // std::pair<const char*, int>
std::array ids{4, 8, 15};      // std::array<int, 3>`,
    see: ['class-template', 'template-argument-deduction'],
    reading: [
      {
        title: 'Class template argument deduction',
        url: 'https://en.cppreference.com/w/cpp/language/class_template_argument_deduction',
        source: 'cppreference',
      },
    ],
  },
  {
    id: 'non-type-template-parameter',
    term: 'Non-Type Template Parameter',
    aliases: ['NTTP', 'value template parameter'],
    course: 'cpp',
    category: 'Templates',
    short: 'A template parameter that is a compile-time value rather than a type — like the `5` in `std::array<int, 5>`.',
    long: 'Allowed types are integers, enums, pointers, references and `std::nullptr_t`, plus (since C++20) floating-point values and simple structural class types. The argument must be a constant expression.\n\nBecause the value is part of the type, `std::array<int, 5>` and `std::array<int, 6>` are different types, and each value produces a separate instantiation.',
    example: `template <typename T, std::size_t N>
struct RingBuffer {
    std::array<T, N> slots{};
};
RingBuffer<int, 8> recentHits;`,
    see: ['template', 'class-template', 'std-array', 'constexpr'],
  },
  {
    id: 'alias-template',
    term: 'Alias Template',
    aliases: ['template alias', 'templated using'],
    course: 'cpp',
    category: 'Templates',
    short: 'A `using` alias with template parameters, naming a whole family of types: `template <typename T> using Grid = std::vector<std::vector<T>>;`.',
    long: 'An alias template does not create new types — `Grid<int>` *is* `std::vector<std::vector<int>>`. It can leave some arguments open while fixing others, which the older `typedef` keyword cannot do because it cannot be templated.',
    example: `template <typename V>
using ByName = std::map<std::string, V>;
ByName<int> gold;   // std::map<std::string, int>`,
    see: ['type-alias', 'class-template'],
    reading: [
      {
        title: 'Type alias, alias template',
        url: 'https://en.cppreference.com/w/cpp/language/type_alias',
        source: 'cppreference',
      },
    ],
  },
  {
    id: 'requires-expression',
    term: 'requires Expression',
    aliases: ['requires-expression', 'requirement'],
    course: 'cpp',
    category: 'Templates',
    short: 'A compile-time `bool` expression, `requires(params) { requirements; }`, that is `true` when every listed requirement would compile.',
    long: 'Requirements come in four kinds: *simple* (`a + b;` must compile), *compound* (`{ a.size() } -> std::integral;` must compile and its type must satisfy a concept), *type* (`typename T::value_type;` must name a type) and *nested* (`requires sizeof(T) <= 64;`). Nothing inside is ever executed. Requires expressions are most often used to define concepts.',
    example: `template <typename T>
concept Damageable = requires(T t, int amount) {
    t.takeDamage(amount);
    { t.isAlive() } -> std::convertible_to<bool>;
};`,
    see: ['concept', 'requires-clause'],
    reading: [
      {
        title: 'Requires expression',
        url: 'https://en.cppreference.com/w/cpp/language/requires',
        source: 'cppreference',
      },
    ],
  },
  {
    id: 'constraint-subsumption',
    term: 'Constraint Subsumption',
    aliases: ['subsumption', 'more constrained'],
    course: 'cpp',
    category: 'Templates',
    short: 'The rule that picks the "more constrained" overload when several constrained templates match: if A\'s constraints imply B\'s, A wins.',
    long: 'The compiler breaks constraints down into their component concepts and compares them. `std::signed_integral<T>` is defined as `std::integral<T> && std::is_signed_v<T>`, so it subsumes `std::integral<T>`, and an overload using it is preferred for `int`.\n\nSubsumption only works through named concepts: two separately written raw expressions such as `std::is_integral_v<T>` are treated as unrelated, which can make calls ambiguous.',
    see: ['concept', 'overload-resolution', 'requires-clause'],
    reading: [
      {
        title: 'Constraints and concepts — partial ordering of constraints',
        url: 'https://en.cppreference.com/w/cpp/language/constraints',
        source: 'cppreference',
      },
    ],
  },
];
