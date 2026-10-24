import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'system-resource',
    term: 'Resource',
    aliases: ['system resource', 'resource handle'],
    course: 'cpp',
    category: 'Memory',
    short: 'Anything a program acquires and must give back exactly once: heap memory, file handles, mutex locks, sockets, GPU buffers, audio voices.',
    long: 'Every resource has an acquire step and a matching release step. Releasing zero times leaks the resource; releasing twice (a double free) or using it after release is a bug that often crashes. RAII ties the release to an object\'s destructor so it happens automatically on every path.',
    example: `std::FILE* f = std::fopen("save.dat", "rb"); // acquire
// ... use f ...
std::fclose(f);                               // release`,
    see: ['raii', 'memory-leak', 'double-free'],
  },
  {
    id: 'deleted-function',
    term: 'Deleted Function (= delete)',
    aliases: ['= delete', 'deleted copy constructor'],
    course: 'cpp',
    category: 'Classes',
    short: 'A function declared with `= delete`. Any attempt to call it is a compile error — the standard way to make a class non-copyable.',
    long: 'Deleting the copy constructor and copy assignment operator forbids copying a type such as a file or texture wrapper, where two copies would release the same resource twice. Deleted functions still take part in overload resolution, so they can also block unwanted implicit conversions. Before C++11, the same effect was achieved by declaring the functions private and never defining them.',
    example: `class Texture {
public:
    Texture(const Texture&) = delete;
    Texture& operator=(const Texture&) = delete;
};`,
    see: ['copy-constructor', 'copy-assignment', 'special-member-functions'],
  },
  {
    id: 'self-assignment',
    term: 'Self-Assignment',
    course: 'cpp',
    category: 'Classes',
    short: 'Assigning an object to itself, as in `a = a` — usually indirectly, through `items[i] = items[j]` with `i == j` or through aliasing pointers or references.',
    long: 'A naive copy assignment operator that frees its old resource before copying from the source destroys the very data it is about to copy when source and target are the same object. Guard with `if (this == &other) return *this;`, allocate before freeing, or use the copy-and-swap idiom.',
    see: ['copy-assignment', 'copy-and-swap'],
  },
  {
    id: 'moved-from-state',
    term: 'Moved-From State',
    aliases: ['moved-from object', 'valid but unspecified state'],
    course: 'cpp',
    category: 'Memory',
    short: 'The state an object is left in after its contents were moved away. For standard library types it is *valid but unspecified*: you may destroy it or assign a new value, but should not rely on its contents.',
    long: 'Some types make stronger promises: a moved-from `std::unique_ptr` or `std::shared_ptr` is guaranteed to be empty (null). Your own move operations should at least leave the source safe to destroy and safe to assign to.',
    example: `std::string a = "Sword";
std::string b = std::move(a);  // a: valid, unspecified
a = "Shield";                  // fine: assign a new value`,
    see: ['std-move', 'move-constructor', 'move-semantics'],
  },
  {
    id: 'nrvo',
    term: 'NRVO (Named Return Value Optimization)',
    aliases: ['NRVO', 'RVO', 'return value optimization'],
    course: 'cpp',
    category: 'Performance',
    short: 'Constructing a named local variable directly in the caller\'s storage so that `return local;` involves no copy or move. Allowed but not required by the standard; mainstream compilers do it routinely.',
    long: 'Returning a prvalue such as `return Mesh{100};` has guaranteed copy elision since C++17 (often called RVO). Returning a named local relies on NRVO; if the compiler does not apply it, the local is implicitly moved, never copied when a move is available. Writing `return std::move(local);` blocks NRVO and is a pessimization.',
    see: ['copy-elision', 'move-semantics', 'std-move'],
  },
  {
    id: 'make-unique',
    term: 'std::make_unique / std::make_shared',
    aliases: ['make_unique', 'make_shared'],
    course: 'cpp',
    category: 'Memory',
    short: 'Factory functions that create an object on the heap and return it already owned by a smart pointer: `auto e = std::make_unique<Enemy>("Orc");`.',
    long: 'They remove naked `new` from your code, mention the type only once, and make ownership explicit from the first moment. `std::make_shared` additionally allocates the object and its control block in a single allocation, which is faster and more cache-friendly than `std::shared_ptr<T>(new T)`.',
    see: ['unique-ptr', 'shared-ptr', 'control-block'],
  },
  {
    id: 'control-block',
    term: 'Control Block',
    course: 'cpp',
    category: 'Memory',
    short: 'The hidden heap structure behind every `std::shared_ptr` group: it holds the strong (owner) count, the weak count, and the deleter.',
    long: 'All `shared_ptr` and `weak_ptr` copies that share ownership of one object point at the same control block. When the strong count reaches zero the object is destroyed; when the weak count also reaches zero the control block itself is freed. Creating two separate `shared_ptr`s from the same raw pointer creates two control blocks — and a double delete.',
    see: ['shared-ptr', 'weak-ptr', 'reference-counting'],
  },
];
