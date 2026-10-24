import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'bounds-checking',
    term: 'Bounds Checking',
    aliases: ['range checking', 'index checking'],
    course: 'cpp',
    category: 'Containers',
    short: 'Verifying at run time that an index is within a container\'s valid range before accessing the element.',
    long: 'C++ does not bounds-check built-in arrays or `operator[]` on standard containers, following the zero-overhead principle: an out-of-range index is undefined behavior. Checked access is available on request through member functions such as `std::array::at` and `std::vector::at`, which throw `std::out_of_range`. Tools such as AddressSanitizer and debug-mode standard libraries add checking during development.\n\nUnreal\'s `TArray` checks `operator[]` in Debug and Development builds and compiles the check out of Shipping builds.',
    example: `std::array<int, 3> ammo{30, 30, 30};
ammo[3] = 0;      // unchecked: undefined behavior
ammo.at(3) = 0;   // checked: throws std::out_of_range`,
    see: ['array', 'std-array', 'undefined-behavior', 'buffer-overflow'],
  },
  {
    id: 'buffer-overflow',
    term: 'Buffer Overflow',
    aliases: ['buffer overrun', 'out-of-bounds write'],
    course: 'cpp',
    category: 'Memory',
    short: 'Writing past the end (or before the start) of an array or buffer, corrupting whatever memory lies next to it.',
    long: 'A buffer overflow is undefined behavior. It may silently overwrite neighbouring variables, corrupt a function\'s return address, crash later in unrelated code, or appear to work. Attackers have exploited buffer overflows for decades, making them one of the most important classes of security bug. Prevent them with containers that know their size, checked access where indices are untrusted, and sanitizers during development.',
    see: ['bounds-checking', 'undefined-behavior', 'sanitizer', 'array'],
  },
  {
    id: 'amortized-complexity',
    term: 'Amortized Complexity',
    aliases: ['amortized O(1)', 'amortized constant time'],
    course: 'cpp',
    category: 'Containers',
    short: 'The average cost per operation over a long sequence of operations, even if some individual operations are much more expensive.',
    long: '`std::vector::push_back` is *amortized O(1)*: most calls just place an element in spare capacity, and the occasional reallocation that moves every element is paid for by the many cheap calls before it. This only works because capacity grows geometrically (for example doubling); growing by a fixed amount would make n pushes cost O(n²) in total.\n\nAmortized cost is about averages over time. A single expensive call can still cause a noticeable hitch, which is why games often `reserve` capacity in advance.',
    see: ['big-o', 'capacity', 'std-vector'],
  },
  {
    id: 'red-black-tree',
    term: 'Red-Black Tree',
    aliases: ['balanced binary search tree', 'self-balancing tree'],
    course: 'cpp',
    category: 'Containers',
    short: 'A self-balancing binary search tree that keeps its height proportional to log n, guaranteeing O(log n) lookup, insertion and removal.',
    long: 'Each node holds one element plus links to its children and parent, and a one-bit colour used by the rebalancing rules. Because the tree stays balanced, finding a key among a million takes about 20 comparisons. All major standard library implementations use red-black trees for `std::map` and `std::set`, which is why those containers iterate in sorted order and why each element is a separate heap allocation.',
    see: ['std-map', 'std-set', 'big-o'],
  },
  {
    id: 'hash-function',
    term: 'Hash Function',
    aliases: ['hash', 'std::hash'],
    course: 'cpp',
    category: 'Containers',
    short: 'A function that turns a key into a fixed-size number (its hash), used by hash tables to pick the bucket where the key is stored.',
    long: 'A good hash function is fast and spreads different keys evenly across the possible values, so few keys collide in the same bucket. Equal keys must always produce equal hashes. The standard library provides `std::hash` for built-in types and strings; `std::unordered_map` and `std::unordered_set` use it by default. Unreal\'s `TMap` and `TSet` call a function named `GetTypeHash` instead.',
    example: `std::size_t h = std::hash<std::string>{}("Goblin");
std::size_t bucket = h % table.bucket_count();`,
    see: ['hash-table', 'std-unordered-map', 'load-factor'],
  },
  {
    id: 'load-factor',
    term: 'Load Factor',
    aliases: ['max_load_factor'],
    course: 'cpp',
    category: 'Containers',
    short: 'The average number of elements per bucket in a hash table: its size divided by its bucket count.',
    long: 'As the load factor rises, chains get longer and lookups slow down. `std::unordered_map` rehashes (allocates more buckets and redistributes every element) when the load factor would exceed `max_load_factor()`, which defaults to 1.0. Rehashing invalidates iterators and can change iteration order, but references to elements stay valid. Calling `reserve(n)` up front avoids repeated rehashing.',
    see: ['hash-table', 'std-unordered-map', 'hash-function'],
  },
  {
    id: 'std-unordered-set',
    term: 'std::unordered_set',
    aliases: ['unordered_set'],
    course: 'cpp',
    category: 'Containers',
    short: 'A standard container of unique values stored in a hash table: average O(1) insertion and membership tests, with no defined iteration order.',
    long: 'It is to `std::set` what `std::unordered_map` is to `std::map`: faster lookups on average, but unordered iteration and keys that need a hash function and `==`. Use it for questions like "have I already visited this tile?" when you never need the values in sorted order. Unreal\'s closest equivalent is `TSet`.',
    example: `std::unordered_set<std::string> visited;
visited.insert("Crypt");
bool seen = visited.contains("Crypt");   // C++20`,
    see: ['std-set', 'hash-table', 'std-unordered-map'],
  },
];
