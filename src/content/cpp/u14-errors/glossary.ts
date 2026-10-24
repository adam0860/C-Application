import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'std-exception',
    term: 'std::exception',
    course: 'cpp',
    category: 'Errors',
    short: 'The base class of every exception the standard library throws. It provides the virtual member function `what()`, which returns a description of the error.',
    long: 'Standard exceptions form a hierarchy under `std::exception`: `std::logic_error` (with `invalid_argument`, `out_of_range`, `length_error`…) for preventable bugs, `std::runtime_error` (with `system_error`, `overflow_error`…) for problems only detectable at run time, plus `bad_alloc`, `bad_cast` and others.\n\nDerive your own exception types from the closest standard class (usually `std::runtime_error`) so a generic `catch (const std::exception& e)` can still handle them.',
    example: `class SaveFileError : public std::runtime_error {
public:
    explicit SaveFileError(const std::string& msg)
        : std::runtime_error{msg} {}
};`,
    see: ['exception', 'try-catch', 'object-slicing'],
    reading: [
      { title: 'std::exception', url: 'https://en.cppreference.com/w/cpp/error/exception', source: 'cppreference' },
    ],
  },
  {
    id: 'std-terminate',
    term: 'std::terminate',
    aliases: ['terminate'],
    course: 'cpp',
    category: 'Errors',
    short: 'The function the C++ runtime calls when exception handling cannot continue — for example, an exception nobody catches or one escaping a `noexcept` function. By default it calls `std::abort()`, ending the program abnormally.',
    long: '`std::terminate` is called when no handler matches a thrown exception, when an exception tries to leave a `noexcept` function (including destructors, which are implicitly `noexcept`), when a destructor throws during stack unwinding, and when `throw;` runs with no exception being handled.\n\nWhen no handler exists, it is implementation-defined whether the stack is unwound first, so destructors may not run. A last-resort `try`/`catch` in `main` avoids that.',
    see: ['exception', 'noexcept', 'stack-unwinding'],
    reading: [
      { title: 'std::terminate', url: 'https://en.cppreference.com/w/cpp/error/terminate', source: 'cppreference' },
    ],
  },
  {
    id: 'copy-and-swap',
    term: 'Copy-and-Swap Idiom',
    aliases: ['copy and swap'],
    course: 'cpp',
    category: 'Errors',
    short: 'A way to write assignment operators with the strong exception guarantee: take the parameter by value (making the copy before touching `*this`), then swap its contents into `*this` with a non-throwing `swap`.',
    long: 'If the copy fails, `*this` is untouched. If it succeeds, the `noexcept` swap commits the new state, and the parameter\'s destructor releases the old state. Self-assignment works without a special check, and if the class has a move constructor the same operator also serves as move assignment.\n\nThe trade-off is performance: it always allocates fresh storage, even when existing storage could be reused.',
    example: `Heightmap& operator=(Heightmap other) noexcept {
    swap(other);      // noexcept member swap
    return *this;
}                     // other destroys the old data`,
    see: ['exception-safety', 'copy-assignment', 'rule-of-three'],
  },
  {
    id: 'std-visit',
    term: 'std::visit',
    course: 'cpp',
    category: 'Errors',
    short: 'Calls a callable (the *visitor*) with whichever alternative a `std::variant` currently holds. The visitor must accept every alternative, so forgetting a case is a compile error.',
    long: 'The visitor is usually a generic lambda or an "overloaded" set of lambdas, one per alternative. Because the compiler checks that every alternative can be handled, `std::visit` gives the exhaustiveness checking that a chain of `holds_alternative` tests lacks.',
    example: `std::visit(Overloaded{
    [](const Gold& g)   { std::cout << g.amount; },
    [](const Weapon& w) { std::cout << w.name; },
}, pickup);`,
    see: ['std-variant', 'lambda'],
    reading: [
      { title: 'std::visit', url: 'https://en.cppreference.com/w/cpp/utility/variant/visit', source: 'cppreference' },
    ],
  },
];
