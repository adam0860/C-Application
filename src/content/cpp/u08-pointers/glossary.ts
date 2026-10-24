import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'memory-alignment',
    term: 'Alignment and Padding',
    aliases: ['alignment', 'alignof', 'padding', 'struct padding'],
    course: 'cpp',
    category: 'Memory',
    short:
      'The requirement that an object of a given type starts at an address that is a multiple of a certain number (its alignment, reported by `alignof`). The compiler inserts unused **padding** bytes to satisfy it.',
    long:
      'Fundamental types are usually aligned to their own size: a 4-byte `int` wants an address divisible by 4, an 8-byte `double` one divisible by 8. Aligned data never straddles a hardware memory chunk, so it can be loaded in one access; some CPUs fault on misaligned access.\n\nInside a struct or class the compiler adds padding between members so each one is aligned, and trailing padding so that every element of an array of that type is aligned too. Ordering members from largest to smallest alignment minimizes padding.',
    example: `struct Loose { char a; int b; char c; };  // 12 bytes
struct Tight { int b; char a; char c; };  //  8 bytes
static_assert(alignof(double) == 8);      // typical`,
    see: ['sizeof', 'memory-address', 'cache-locality'],
    reading: [
      {
        title: 'alignof operator',
        url: 'https://en.cppreference.com/w/cpp/language/alignof',
        source: 'cppreference',
      },
    ],
  },
  {
    id: 'aslr',
    term: 'ASLR (Address Space Layout Randomization)',
    aliases: ['address space layout randomization'],
    course: 'both',
    category: 'Memory',
    short:
      'An operating-system security feature that places a program\'s stack, heap and code at random addresses each time it starts, so printed addresses differ from run to run.',
    long:
      'Many memory-corruption exploits depend on knowing where a particular object or function lives. Randomizing the layout at every launch makes those addresses unpredictable. A consequence for programmers: never write code or tests that depend on specific address values.',
    see: ['memory-address', 'stack-memory', 'heap-memory'],
  },
  {
    id: 'segmentation-fault',
    term: 'Segmentation Fault',
    aliases: ['segfault', 'SIGSEGV'],
    course: 'cpp',
    category: 'Memory',
    short:
      'The crash that occurs when a program touches memory it is not allowed to access, such as address 0 through a null pointer. Called a segfault (`SIGSEGV`) on Linux/macOS and an access violation on Windows.',
    long:
      'The operating system deliberately leaves the lowest page of the address space unmapped, so dereferencing a null pointer usually triggers a hardware fault and the OS terminates the program. Not every invalid access crashes, though: reading a dangling or out-of-bounds pointer may silently return garbage. In both cases the C++ program has undefined behavior; the crash is just the lucky outcome.',
    see: ['null-pointer', 'dangling-pointer', 'undefined-behavior'],
  },
  {
    id: 'use-after-free',
    term: 'Use-After-Free',
    aliases: ['UAF'],
    course: 'both',
    category: 'Memory',
    short:
      'Reading or writing an object through a pointer or reference after the object\'s memory has been freed (for example after `delete`). It is undefined behavior and a major source of crashes and security holes.',
    long:
      'Freed memory often still contains the old bytes, so a use-after-free can appear to work — until the allocator hands the block to another object, at which point writes through the dangling pointer silently corrupt that object. Tools such as AddressSanitizer (`-fsanitize=address`) detect it at run time. The cure is clear ownership: RAII types and smart pointers make it hard to keep using memory after it is released.',
    example: `int* p = new int{5};
int* q = p;
delete p;
*q = 7;   // use-after-free: q dangles`,
    see: ['dangling-pointer', 'double-free', 'ownership', 'sanitizer'],
  },
  {
    id: 'one-past-the-end',
    term: 'One-Past-the-End Pointer',
    aliases: ['past-the-end', 'end pointer', 'half-open range'],
    course: 'cpp',
    category: 'Memory',
    short:
      'A pointer (or iterator) to the position just after the last element of an array or container. It may be formed and compared, but never dereferenced.',
    long:
      'Ranges in C++ are half-open: `[begin, end)` includes `begin` but not `end`. This makes loops simple (`while (p != end)`), makes the element count `end - begin`, and represents an empty range as `begin == end`. The standard library\'s `end()` functions return exactly this kind of position.',
    example: `int hp[4]{10, 20, 30, 40};
for (int* p = hp; p != hp + 4; ++p) {
    // hp + 4 is one past the end: compare, never read
}`,
    see: ['pointer-arithmetic', 'iterator', 'array'],
  },
  {
    id: 'const-correctness',
    term: 'Const Correctness',
    aliases: ['const-correct'],
    course: 'both',
    category: 'Types',
    short:
      'The practice of marking everything that should not be modified — parameters, pointees, member functions, local variables — as `const`, so the compiler enforces read-only access.',
    long:
      'Const correctness documents intent in signatures (`const T*` and `const T&` parameters mean "I only read"), turns accidental writes into compile errors, and lets functions accept read-only data. It works best applied consistently from the bottom up: one function that takes a non-const pointer for read-only work forces all its callers to give up `const` too. For classes it extends to `const` member functions, which are the only ones callable on const objects.',
    example: `int highest(const int* values, int count);  // reads only
void doubleAll(int* values, int count);      // modifies`,
    see: ['const', 'const-pointer', 'const-reference', 'const-member-function'],
    reading: [
      {
        title: 'isocpp FAQ: Const correctness',
        url: 'https://isocpp.org/wiki/faq/const-correctness',
        source: 'isocpp',
      },
    ],
  },
  {
    id: 'temporary-object',
    term: 'Temporary Object',
    aliases: ['temporary', 'temporaries'],
    course: 'cpp',
    category: 'Memory',
    short:
      'An unnamed object created during the evaluation of an expression — such as a function\'s returned value or the `std::string` built from a literal — that is normally destroyed at the end of the full expression (the statement) that created it.',
    long:
      'Temporaries appear constantly: `makeTitle(3)` returns one, `a + b` on two strings produces one, and passing `"text"` to a `const std::string&` parameter creates one. Because they are about to disappear, C++ only lets a `const` lvalue reference (or an rvalue reference) bind to them. Binding a temporary directly to a local `const&` extends its lifetime to match the reference.',
    example: `std::string makeTitle(int level);

announce(makeTitle(3));   // temporary lives until the ';'
const std::string& t = makeTitle(4);   // lifetime extended`,
    see: ['rvalue', 'const-reference', 'lifetime-extension', 'lifetime'],
  },
  {
    id: 'lifetime-extension',
    term: 'Temporary Lifetime Extension',
    aliases: ['lifetime extension'],
    course: 'cpp',
    category: 'Memory',
    short:
      'The rule that a temporary bound **directly** to a local `const T&` (or `T&&`) lives as long as that reference, instead of dying at the end of the statement.',
    long:
      'Lifetime extension only applies to the reference the temporary is bound to directly. It does not propagate through function calls: if a function takes `const T&` and returns that same reference, the temporary still dies at the end of the calling statement and the returned reference dangles. It also does not apply to a temporary bound to a reference member in a constructor\'s initializer list.',
    example: `const std::string& ok = makeTitle(1);        // extended
const std::string& bad = pick(makeTitle(1)); // dangles`,
    see: ['temporary-object', 'const-reference', 'dangling-reference'],
    reading: [
      {
        title: 'Reference initialization — lifetime of a temporary',
        url: 'https://en.cppreference.com/w/cpp/language/reference_initialization',
        source: 'cppreference',
      },
    ],
  },
];
