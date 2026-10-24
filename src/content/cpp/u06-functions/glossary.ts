import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'function-signature',
    term: 'Function Signature',
    aliases: ['signature'],
    course: 'cpp',
    category: 'Functions',
    short: 'The parts of a function that identify it for overloading: its name plus the number, types and order of its parameters (and its enclosing namespace or class).',
    long: 'Two functions with the same name in the same scope must have different signatures. The return type and parameter *names* are not part of the signature, and neither is `const` applied directly to a by-value parameter.\n\nThe compiler encodes the signature into the symbol name it emits (see name mangling), which is how the linker tells overloads apart.',
    example: `void print(int value);           // print(int)
void print(double value);        // print(double): different
void print(int amount);          // same as print(int)
int  print(int value);           // error: differs only in return type`,
    see: ['function-overloading', 'overload-resolution', 'name-mangling'],
  },
  {
    id: 'name-mangling',
    term: 'Name Mangling',
    aliases: ['name decoration', 'mangled name'],
    course: 'cpp',
    category: 'Build',
    short: 'The compiler\'s encoding of a function\'s namespace, name and parameter types into a single symbol name, so that overloads get distinct names in object files.',
    long: 'Linkers match calls to definitions by symbol name alone. To support overloading, namespaces and classes, C++ compilers mangle names: GCC and Clang (Itanium ABI) turn `void print(int)` into `_Z5printi`, while MSVC produces `?print@@YAXH@Z`.\n\nThe scheme is not standardized, which is one reason object files from different compilers cannot be linked together. `extern "C"` disables mangling so a function can be called from C or looked up by its plain name. Tools such as `c++filt` and `nm -C` demangle names back into readable form.',
    example: `// g++ -c combat.cpp && nm combat.o
// _Z5printi          print(int)
// _Z5printd          print(double)
// _ZN4game5printEi   game::print(int)`,
    exampleLang: 'shell',
    see: ['function-overloading', 'linker', 'object-file', 'linker-error'],
    reading: [
      {
        title: 'Itanium C++ ABI: mangling',
        url: 'https://itanium-cxx-abi.github.io/cxx-abi/abi.html#mangling',
        source: 'other',
        note: 'The mangling specification used by GCC and Clang.',
      },
    ],
  },
  {
    id: 'out-parameter',
    term: 'Out-Parameter',
    aliases: ['output parameter', 'in-out parameter'],
    course: 'cpp',
    category: 'Functions',
    short: 'A reference (or pointer) parameter that a function writes a result into, instead of returning it.',
    long: 'Out-parameters were common in C and older C++. Modern guidelines prefer returning values (possibly bundled in a struct), because the data flow is clearer and copy elision makes returning cheap. Reference parameters remain appropriate for *in-out* updates of an existing object and for "try" functions that return a success flag.\n\nUnreal\'s coding standard prefixes such parameters with `Out`, as in `FHitResult& OutHit`.',
    example: `bool tryBuy(int price, int& gold);   // in-out parameter
Stats statsForLevel(int level);      // preferred: return a value`,
    see: ['pass-by-reference', 'return-value', 'copy-elision'],
  },
  {
    id: 'shadowing',
    term: 'Shadowing',
    aliases: ['variable shadowing', 'name hiding'],
    course: 'cpp',
    category: 'Functions',
    short: 'When a name declared in an inner scope hides an entity with the same name in an outer scope, so the outer one cannot be reached by that name inside the inner scope.',
    long: 'Shadowing is legal but a frequent source of bugs: code that seems to modify the outer variable actually modifies the inner one. GCC and Clang warn about it with `-Wshadow`, which is not part of `-Wall -Wextra`. A shadowed global can still be reached with the scope resolution operator, `::name`.',
    example: `int health = 100;
if (hit) {
    int health = 50;   // shadows the outer health
    health -= 10;      // changes the inner one only
}
// health is still 100 here`,
    see: ['scope', 'global-variable', 'scope-resolution-operator'],
  },
  {
    id: 'memoization',
    term: 'Memoization',
    aliases: ['memoisation', 'caching results'],
    course: 'cpp',
    category: 'Functions',
    short: 'An optimization that stores the results of expensive function calls and returns the stored result when the same inputs occur again.',
    long: 'Memoization turns naive recursive algorithms with overlapping subproblems, such as Fibonacci, from exponential to linear time: each distinct input is computed only once. The cache is typically a container such as `std::vector` or `std::unordered_map` keyed by the function\'s arguments. It only works for functions whose result depends solely on their inputs.',
    see: ['recursion', 'big-o', 'std-unordered-map'],
  },
];
