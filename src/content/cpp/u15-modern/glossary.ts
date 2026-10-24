import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'underlying-type',
    term: 'Underlying Type (enum)',
    course: 'cpp',
    category: 'Types',
    short: 'The integer type an enumeration is stored as. An `enum class` uses `int` unless you choose another type after a colon, e.g. `enum class ItemKind : std::uint8_t`.',
    long: 'Fixing the underlying type controls the enum\'s size (important for save files, network packets and large arrays) and allows the enum to be forward-declared without listing its enumerators. An enum with a fixed underlying type can hold any value of that type, named or not.\n\n`std::underlying_type_t<E>` names the underlying type in generic code, and C++23\'s `std::to_underlying(e)` converts a value to it.',
    example: `enum class ItemKind : std::uint8_t { Junk, Potion, Weapon };
static_assert(sizeof(ItemKind) == 1);`,
    see: ['enum-class', 'enum', 'fixed-width-integer'],
  },
  {
    id: 'std-tie',
    term: 'std::tie',
    course: 'cpp',
    category: 'Types',
    short: 'Creates a `std::tuple` of **references** to existing variables. Assigning a tuple to it unpacks the values into those variables; comparing two ties compares the referenced values lexicographically.',
    long: 'Before C++17 structured bindings, `std::tie(a, b) = makePair();` was the way to unpack multiple return values; `std::ignore` skips an element. Today it remains useful for assigning into variables that already exist and for writing ordering comparisons: `return std::tie(a.level, a.name) < std::tie(b.level, b.name);`.',
    example: `int level;
std::string name;
std::tie(level, name) = loadProfile();`,
    see: ['std-tuple', 'structured-binding', 'std-pair'],
    reading: [{ title: 'std::tie', url: 'https://en.cppreference.com/w/cpp/utility/tuple/tie', source: 'cppreference' }],
  },
  {
    id: 'constant-expression',
    term: 'Constant Expression',
    course: 'cpp',
    category: 'Types',
    short: 'An expression the compiler can evaluate during compilation. Array sizes, template arguments, `case` labels, `static_assert` conditions and `constexpr` variable initializers all require one.',
    long: 'Constant expressions may call `constexpr` and `consteval` functions. During constant evaluation the compiler acts as an interpreter with strict rules: any undefined behavior (signed overflow, out-of-bounds access, reading an uninitialized value) is a compile error rather than a silent bug.',
    see: ['constexpr', 'consteval', 'compile-time'],
    reading: [{ title: 'Constant expressions', url: 'https://en.cppreference.com/w/cpp/language/constant_expression', source: 'cppreference' }],
  },
  {
    id: 'static-assert',
    term: 'static_assert',
    course: 'cpp',
    category: 'Types',
    short: 'A declaration that checks a condition at compile time: `static_assert(sizeof(Packet) == 8, "Packet layout changed");`. If the condition is false, compilation fails with the message.',
    long: 'The condition must be a constant expression. Use it to lock down assumptions (sizes, alignment, type properties) and to test `constexpr` functions as "unit tests that run in the compiler". The message became optional in C++17. Unlike `assert`, it costs nothing at run time because it never exists at run time.',
    example: `constexpr int square(int x) { return x * x; }
static_assert(square(12) == 144);`,
    see: ['constexpr', 'assertion', 'constant-expression'],
    reading: [{ title: 'static_assert declaration', url: 'https://en.cppreference.com/w/cpp/language/static_assert', source: 'cppreference' }],
  },
  {
    id: 'if-constexpr',
    term: 'if constexpr',
    course: 'cpp',
    category: 'Templates',
    short: 'An `if` whose condition is evaluated at compile time (C++17). Inside a template, the branch not taken is discarded and never instantiated, so it may contain code that would not compile for the current type.',
    long: 'It replaces many uses of overloading and template specialization for small type-dependent differences, e.g. `if constexpr (std::is_integral_v<T>) { ... } else { ... }`. Outside templates, both branches are still fully checked by the compiler; only template-dependent code benefits from discarding.',
    example: `template <typename T>
std::string describe(const T& v) {
    if constexpr (std::is_arithmetic_v<T>) return std::to_string(v);
    else return std::string{v};
}`,
    see: ['template', 'constexpr', 'concept'],
    reading: [{ title: 'if statement (constexpr if)', url: 'https://en.cppreference.com/w/cpp/language/if', source: 'cppreference' }],
  },
  {
    id: 'constinit',
    term: 'constinit',
    course: 'cpp',
    category: 'Types',
    short: 'A C++20 specifier for variables with static or thread storage duration that guarantees they are initialized at compile time, without making them `const`.',
    long: 'Globals whose initializer must run at program start-up (dynamic initialization) are initialized in an unspecified order across translation units — the "static initialization order fiasco". `constinit` turns accidental dynamic initialization into a compile error, while still allowing the variable to change at run time.',
    example: `constinit int g_enemiesSpawned = 0;   // mutable, but
                                      // initialized at compile time`,
    see: ['constexpr', 'consteval', 'storage-duration', 'global-variable'],
    reading: [{ title: 'constinit specifier', url: 'https://en.cppreference.com/w/cpp/language/constinit', source: 'cppreference' }],
  },
  {
    id: 'anonymous-namespace',
    term: 'Anonymous Namespace',
    aliases: ['unnamed namespace'],
    course: 'cpp',
    category: 'Language',
    short: 'A `namespace { ... }` block with no name. Everything declared inside has internal linkage: it is visible only within the current `.cpp` file (translation unit).',
    long: 'Anonymous namespaces let several `.cpp` files each have their own private helper called, say, `clamp01` without violating the One Definition Rule or causing "multiple definition" linker errors. They replace the older practice of marking namespace-scope functions and variables `static`, and also work for types. Never put one in a header: every file that includes it would get its own separate copy.',
    example: `namespace {
    float clamp01(float v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
}`,
    see: ['namespace', 'linkage', 'translation-unit', 'one-definition-rule'],
    reading: [{ title: 'Namespaces (unnamed namespaces)', url: 'https://en.cppreference.com/w/cpp/language/namespace', source: 'cppreference' }],
  },
  {
    id: 'using-declaration',
    term: 'using-declaration',
    course: 'cpp',
    category: 'Language',
    short: 'Brings a **single** name from a namespace into the current scope: `using std::string;`. Compare with a using-directive (`using namespace std;`), which makes every name in the namespace visible.',
    long: 'Because it names exactly one entity, a using-declaration is far safer than a using-directive: it cannot suddenly start pulling in new names when the library adds them. Inside classes, `using Base::member;` re-exposes a base-class member, and `using Base::Base;` inherits constructors.',
    see: ['using-directive', 'namespace', 'scope'],
    reading: [{ title: 'Using-declaration', url: 'https://en.cppreference.com/w/cpp/language/using_declaration', source: 'cppreference' }],
  },
  {
    id: 'namespace-alias',
    term: 'Namespace Alias',
    course: 'cpp',
    category: 'Language',
    short: 'A shorter name for an existing namespace: `namespace fs = std::filesystem;`. It shortens qualified names without importing anything.',
    long: 'Aliases are local to the scope where they are declared, so a `.cpp` file or function can use a short name without affecting anyone else. Common examples are `namespace fs = std::filesystem;` and `namespace chr = std::chrono;`.',
    example: `namespace nav = forge::ai::navigation;
nav::Path p = nav::findPath(start, goal);`,
    see: ['namespace', 'type-alias'],
  },
  {
    id: 'argument-dependent-lookup',
    term: 'Argument-Dependent Lookup (ADL)',
    aliases: ['ADL', 'Koenig lookup'],
    course: 'cpp',
    category: 'Language',
    short: 'When you call an unqualified function, the compiler also searches the namespaces of the argument types. That is how `std::cout << s` finds `std::operator<<` without you writing `std::`.',
    long: 'ADL is why operators and free functions such as `swap` or `toString` for your types should be declared in the same namespace as the types themselves: callers find them automatically. It is also why the "`using std::swap; swap(a, b);`" idiom works — it considers both `std::swap` and any `swap` declared next to the argument\'s type.',
    see: ['namespace', 'operator-overloading', 'overload-resolution'],
    reading: [{ title: 'Argument-dependent lookup', url: 'https://en.cppreference.com/w/cpp/language/adl', source: 'cppreference' }],
  },
];
