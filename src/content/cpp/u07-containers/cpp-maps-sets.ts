import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-maps-sets',
  title: 'std::map, std::unordered_map and std::set',
  summary: 'Looking things up by key: sorted trees, hash tables, the operator[] trap, and how to choose the right container.',
  minutes: 19,
  objectives: [
    'Store key → value data in `std::map` and explain its sorted, tree-based O(log n) behavior',
    'Avoid the `operator[]` trap by choosing between `find`, `contains`, `at` and `try_emplace`',
    'Explain hashing and buckets in `std::unordered_map`, and when its average O(1) holds',
    'Use `std::set` to store unique values and test membership',
    'Choose an appropriate container for a task, and map the choices to Unreal\'s `TMap` and `TSet`',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Key → value: std::map',
      blocks: [
        {
          type: 'p',
          text: 'A vector answers "what is at position 3?". Games constantly ask a different question: "how many potions do I have?", "what are the stats of an Orc?", "what is Ada\'s high score?". You want to look things up by a **key**, not by a position. [[std-map]] (from `<map>`) stores key → value pairs, each key at most once, and finds a value from its key.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> inventory{
        {"potion", 3},
        {"arrow", 20},
    };
    inventory["shield"] = 1;
    inventory["potion"] += 2;

    std::cout << "Potions: " << inventory["potion"] << '\\n';
    std::cout << "Distinct items: " << inventory.size() << '\\n';
    for (const auto& [item, count] : inventory) {
        std::cout << item << " x" << count << '\\n';
    }
}`,
          output: 'Potions: 5\nDistinct items: 3\narrow x20\npotion x5\nshield x1',
          annotations: [
            { lines: 6, text: 'Two template arguments: the key type (`std::string`) and the value type (`int`).' },
            { lines: '7-8', text: 'Each element is a key/value pair written as `{key, value}`.' },
            { lines: 10, text: '`map[key]` gives access to the value for that key. Here `"shield"` does not exist yet, so it is created and then assigned 1.' },
            { lines: 11, text: 'For an existing key, `[]` refers to the stored value, so `+= 2` updates it in place.' },
            { lines: 15, text: 'Each element is a [[std-pair]] with members `.first` (key) and `.second` (value). The `[item, count]` syntax is a [[structured-binding]]: it names the two halves of each pair directly (a later lesson covers it fully).' },
            { lines: '16-17', text: 'Notice the order: **alphabetical by key**, not the order the items were added. A `std::map` is always sorted.' },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A dictionary, literally',
          text: 'A `std::map` works like a printed dictionary: words (keys) are kept in sorted order, each word appears once, and you find a definition (value) by looking up the word, not by knowing it is entry number 4,812.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Keys are unique and constant',
          text: 'Inserting a key that already exists never creates a second entry. And while you may change a value freely, you cannot change an element\'s key in place: that would break the sorted order. To "rename" a key, erase the old element and insert a new one.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Under the hood: a balanced binary search tree',
      blocks: [
        {
          type: 'p',
          text: 'Every major standard library implements `std::map` as a [[red-black-tree|red-black tree]], a self-balancing binary search tree. Each element lives in its own heap-allocated **node**, which also stores links to its parent and its two children. For every node, keys in its left subtree are smaller and keys in its right subtree are larger.',
        },
        {
          type: 'memory',
          caption: 'A std::map<std::string, int> as a tree of separately allocated nodes.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'inventory.root', type: 'node*', value: '0xA100', pointsTo: 'potion' },
                { name: 'inventory.size', type: 'size_t', value: '3' },
              ],
            },
            {
              label: 'Heap — nodes scattered wherever the allocator put them',
              kind: 'heap',
              cells: [
                { id: 'potion', name: '"potion" → 5', value: 'left: arrow, right: shield', address: '0xA100' },
                { id: 'arrow', name: '"arrow" → 20', value: 'leaf', address: '0x3F40' },
                { id: 'shield', name: '"shield" → 1', value: 'leaf', address: '0xC7E0' },
              ],
            },
          ],
        },
        {
          type: 'p',
          text: 'To find `"shield"`, start at the root: `"shield"` comes after `"potion"`, so go right, and there it is. Because the tree is kept balanced, its height stays around log₂ n. Finding one key among 1,000,000 takes about 20 comparisons. Insertion and removal are O(log n) as well, and iterating visits the nodes in key order, which is why the output came out alphabetical.',
        },
        {
          type: 'table',
          headers: ['Operation', '`std::map` cost'],
          rows: [
            ['Find / `contains` / `at`', 'O(log n)'],
            ['Insert / erase one element', 'O(log n)'],
            ['Iterate all, in sorted order', 'O(n)'],
            ['Smallest / largest key', 'Cheap: `begin()` gives the smallest, `rbegin()` the largest'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a tree?',
          text: 'A tree gives three guarantees together: keys always in sorted order, O(log n) operations in the *worst* case (no unlucky inputs), and **stable references**. Since each element has its own node, inserting or erasing other elements never moves it, so references to map elements stay valid until that element itself is erased, unlike `std::vector`. Keys only need to be comparable with `<`, which is how the map decides left or right.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'The price of nodes',
          text: 'One heap allocation per element, plus roughly 32 bytes of bookkeeping (three links and a colour) per node on a 64-bit system. Worse, nodes are scattered across memory, so walking a map hops between cache lines, the opposite of a vector\'s [[cache-locality|cache-friendly]] layout. For small collections, a plain vector searched linearly is often faster than a map.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A `std::map` holds about 1,000,000 player names. Roughly how many key comparisons does `find` need?',
      options: [
        { text: 'About 1,000,000', why: 'That is a linear scan, what you would do with an unsorted vector. A balanced tree discards half of the remaining candidates at every step.' },
        { text: 'About 20', correct: true, why: 'A balanced tree has height around log₂(1,000,000) ≈ 20, and each comparison moves one level down.' },
        { text: 'About 1,000', why: 'That would be the square root of n, which is not how a binary search tree behaves.' },
        { text: 'Exactly 1, because maps use hashing', why: '`std::map` is a sorted tree, not a hash table. Hashing is what `std::unordered_map` does.' },
      ],
      explanation:
        'O(log n) grows incredibly slowly: doubling the map to 2,000,000 names adds only one more comparison. That is why sorted trees remain useful at huge sizes, even though each step (following a link to a scattered node) is slower than stepping through a vector.',
    },
    {
      kind: 'concept',
      title: 'The operator[] trap',
      blocks: [
        {
          type: 'p',
          text: '`operator[]` has a surprising rule: if the key is **not** in the map, it inserts it with a default-constructed value (0 for `int`, an empty string for `std::string`) and returns a reference to that new value. So simply *looking* with `[]` can change the map:',
        },
        {
          type: 'code',
          code: `std::map<std::string, int> inventory{{"potion", 3}};

if (inventory["sword"] > 0) {     // inserts {"sword", 0}!
    std::cout << "You have a sword\\n";
}
std::cout << inventory.size();    // prints 2, not 1`,
          annotations: [
            { lines: 3, text: 'Intended as a read-only check, but `"sword"` is missing, so `[]` silently inserts it with value 0. The comparison then sees 0.' },
            { lines: 6, text: 'The inventory now lists a sword with a count of zero. Save files, UI and item counts all inherit the ghost entry.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why would anyone design it that way?',
          text: '`operator[]` must return a *reference* to a value, and a reference must refer to something, so for a missing key the map has to create an element. That makes `[]` perfect for its intended job: **write or accumulate**. `drops[item]++` works whether or not the item was seen before, because a missing count starts at 0. It is only as a *lookup* that it becomes a trap. It also explains why `[]` does not compile on a `const` map: it might need to insert.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <map>
#include <string>
#include <vector>

int main() {
    const std::vector<std::string> lootLog{
        "gem", "coin", "gem", "sword", "coin", "gem"};

    std::map<std::string, int> drops;
    for (const std::string& item : lootLog) {
        ++drops[item];
    }

    for (const auto& [item, count] : drops) {
        std::cout << item << ": " << count << '\\n';
    }
}`,
          output: 'coin: 2\ngem: 3\nsword: 1',
          annotations: [
            { lines: 12, text: 'The right use of `[]`: the first `"gem"` creates `{"gem", 0}` and increments it to 1; later gems just increment.' },
          ],
        },
        {
          type: 'heading',
          text: 'Lookups that never insert',
        },
        {
          type: 'table',
          headers: ['Expression', 'Missing key', 'Use it when'],
          rows: [
            ['`m[key]`', '**Inserts** a default value', 'Writing, or counting/accumulating'],
            ['`m.contains(key)` (C++20)', 'Returns `false`', 'You only need yes/no'],
            ['`m.find(key)`', 'Returns `m.end()`', 'You need the value if it exists'],
            ['`m.at(key)`', 'Throws `std::out_of_range`', 'A missing key would be a bug'],
            ['`m.count(key)`', 'Returns `0`', 'Pre-C++20 yes/no (`1` if present)'],
          ],
        },
        {
          type: 'code',
          code: `auto it = inventory.find("arrow");
if (it != inventory.end()) {
    std::cout << it->first << ": " << it->second << '\\n';
}`,
          annotations: [
            { lines: 1, text: '`find` returns an [[iterator]], a position in the container. For a missing key it returns the special past-the-end position `end()`.' },
            { lines: 3, text: '`it->first` and `it->second` mean "the key and the value of the element at that position". One search does both the existence check and the access.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'TMap does the opposite',
          text: 'In Unreal, `TMap::operator[]` does **not** insert: a missing key triggers an assertion (a crash in development builds). Use `Find(Key)`, which returns a pointer to the value or `nullptr`, `Contains(Key)` for yes/no, and `FindOrAdd(Key)` when you really want the insert-if-missing behaviour of `std::map::operator[]`.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `std::map<std::string, int> kills{{"goblin", 4}};
if (kills["dragon"] == 0) {
    std::cout << "No dragons yet. ";
}
std::cout << kills.size() << '\\n';`,
      options: [
        { text: 'No dragons yet. 1', why: 'The lookup with `[]` inserted `{"dragon", 0}`, so the map now has two elements.' },
        { text: '2', why: 'The condition is true: the newly inserted value is 0, so the message prints too.' },
        { text: 'It throws, because `"dragon"` is not in the map', why: 'Only `at()` throws for a missing key. `operator[]` inserts a default value instead.' },
        { text: 'No dragons yet. 2', correct: true, why: '`kills["dragon"]` inserts `{"dragon", 0}` and returns that 0, so the condition is true and the size grows to 2.' },
      ],
      explanation:
        'Reading a missing key with `[]` inserts it. Here the bug is harmless-looking, but imagine iterating over `kills` to build an end-of-level report: a dragon row with zero kills appears out of nowhere. Use `contains` or `find` for checks.',
    },
    {
      kind: 'concept',
      title: 'Inserting and erasing: insert, try_emplace, insert_or_assign',
      blocks: [
        {
          type: 'p',
          text: 'Besides `[]`, maps offer several insertion functions that differ in one crucial way: **what happens if the key already exists**.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> highScores{{"Ada", 900}};

    auto [it, inserted] = highScores.insert({"Ada", 1200});
    std::cout << std::boolalpha << inserted << ' ' << it->second << '\\n';

    highScores.try_emplace("Ada", 1500);
    highScores.try_emplace("Linus", 700);
    highScores.insert_or_assign("Ada", 1300);
    highScores["Grace"] = 1100;

    for (const auto& [name, score] : highScores) {
        std::cout << name << ' ' << score << '\\n';
    }
    std::cout << "erased: " << highScores.erase("Linus") << '\\n';
}`,
          output: 'false 900\nAda 1300\nGrace 1100\nLinus 700\nerased: 1',
          annotations: [
            { lines: 8, text: '`insert` never overwrites. It returns a pair: an iterator to the element with that key, and a `bool` saying whether insertion happened. Here `"Ada"` exists, so `inserted` is `false` and the old 900 stays.' },
            { lines: 11, text: '`try_emplace` (C++17) also leaves an existing key alone, and does not even construct the new value in that case.' },
            { lines: 12, text: 'New key: `"Linus"` is added with 700.' },
            { lines: 13, text: '`insert_or_assign` (C++17) overwrites if present, inserts if not. Ada is now 1300.' },
            { lines: 14, text: '`[]` with assignment also inserts or overwrites (and requires the value type to be default-constructible).' },
            { lines: 19, text: '`erase(key)` returns how many elements were removed: 1 or 0 for a map.' },
          ],
        },
        {
          type: 'table',
          headers: ['Function', 'If the key exists', 'If it is missing'],
          rows: [
            ['`insert({k, v})`', 'Keeps the old value', 'Inserts'],
            ['`emplace(k, v)`', 'Keeps the old value (may still build a node and throw it away)', 'Constructs in place'],
            ['`try_emplace(k, args...)`', 'Keeps the old value; constructs nothing', 'Constructs the value from `args`'],
            ['`insert_or_assign(k, v)`', 'Overwrites', 'Inserts'],
            ['`m[k] = v`', 'Overwrites', 'Inserts a default, then assigns'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Say what you mean',
          text: 'Pick the function whose name states your intent. "Add this player only if they are new": `try_emplace`. "Record the latest value either way": `insert_or_assign`. `try_emplace` is usually preferable to `emplace` for maps, because it guarantees no wasted construction when the key is already present.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'TMap::Add overwrites',
          text: 'Careful when switching between the two worlds: `TMap::Add(Key, Value)` **replaces** the value if the key exists, behaving like `insert_or_assign`, whereas `std::map::insert` keeps the old value. Same word, opposite behaviour.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Add `"shield"` only if it is not already present (constructing nothing otherwise), then do a C++20 yes/no lookup without inserting anything.',
      template: `std::map<std::string, int> inventory{{"potion", 2}};
inventory.___("shield", 1);
if (inventory.___("shield")) {
    std::cout << inventory.at("shield") << '\\n';
}`,
      blanks: [{ answers: ['try_emplace'] }, { answers: ['contains', 'count'] }],
      wordBank: ['try_emplace', 'contains', 'insert_or_assign', 'find', 'erase'],
      explanation:
        '`try_emplace` inserts only when the key is missing and builds nothing otherwise. `contains` (C++20) answers yes/no without modifying the map (`count` also works, returning 1 or 0). `insert_or_assign` would overwrite an existing shield count, and `find` returns an iterator, which cannot be used directly as a condition.',
    },
    {
      kind: 'concept',
      title: 'std::unordered_map: hashing',
      blocks: [
        {
          type: 'p',
          text: 'Often you never need keys in sorted order; you just want lookups to be as fast as possible. [[std-unordered-map]] (from `<unordered_map>`) is a [[hash-table]]. It runs each key through a [[hash-function]] that turns it into a number, and uses that number to pick a **bucket**: `bucket = hash(key) % bucket_count`. A lookup hashes the key, jumps straight to its bucket and checks the few elements there.',
        },
        {
          type: 'memory',
          caption: 'Four buckets. "Goblin" and "Dragon" collided in bucket 2, so they share a chain.',
          regions: [
            {
              label: 'Heap — bucket array',
              kind: 'heap',
              cells: [
                { name: 'bucket[0]', value: '→', pointsTo: 'orc' },
                { name: 'bucket[1]', value: '(empty)' },
                { name: 'bucket[2]', value: '→', pointsTo: 'goblin' },
                { name: 'bucket[3]', value: '→', pointsTo: 'troll' },
              ],
            },
            {
              label: 'Heap — element nodes',
              kind: 'heap',
              cells: [
                { id: 'orc', name: '"Orc" → 40', value: 'next: none' },
                { id: 'goblin', name: '"Goblin" → 15', value: 'next: Dragon', pointsTo: 'dragon' },
                { id: 'dragon', name: '"Dragon" → 5000', value: 'next: none' },
                { id: 'troll', name: '"Troll" → 120', value: 'next: none' },
              ],
            },
          ],
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <unordered_map>

int main() {
    std::unordered_map<std::string, int> enemyXp{
        {"Goblin", 15}, {"Orc", 40}, {"Dragon", 5000},
    };
    enemyXp["Troll"] = 120;

    int totalXp = enemyXp.at("Goblin") * 3 + enemyXp.at("Troll");
    std::cout << "XP earned: " << totalXp << '\\n';
    std::cout << "Known enemies: " << enemyXp.size() << '\\n';
    std::cout << std::boolalpha << enemyXp.contains("Lich") << '\\n';
}`,
          output: 'XP earned: 165\nKnown enemies: 4\nfalse',
          annotations: [
            { lines: 6, text: 'The interface is almost identical to `std::map`: `[]`, `at`, `find`, `contains`, `insert`, `try_emplace`, `erase`. The `operator[]` trap applies here too.' },
            { lines: 11, text: 'Each `at` hashes the string, goes to one bucket and compares against the few keys there: average O(1), whatever the size.' },
          ],
        },
        {
          type: 'p',
          text: 'Lookups are O(1) **on average**, but O(n) in the worst case: if many keys land in the same bucket, that bucket\'s chain becomes a slow linear list. To keep chains short, the table tracks its [[load-factor]] (elements per bucket). When adding an element would push it above `max_load_factor()` (1.0 by default), the table **rehashes**: it allocates more buckets and redistributes every element. Call `reserve(n)` up front to avoid repeated rehashing.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Iteration order is unspecified',
          text: 'Elements come out of an `unordered_map` in whatever order the buckets happen to hold them. It differs between compilers and standard libraries, can change after a rehash, and has nothing to do with insertion order. Never write code or tests that depend on it. If you need sorted output, copy the keys into a vector and sort them, or use `std::map`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have both map and unordered_map?',
          text: 'They trade different things. `std::map` gives sorted order, range queries ("all players with scores between 1000 and 2000") and a guaranteed O(log n) worst case. `std::unordered_map` gives up ordering for faster average lookups. Keys also need different abilities: a tree needs `<`, a hash table needs a hash function and `==`. The standard library hashes built-in types and `std::string` for you.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Iterating over a `std::unordered_map` visits the keys in the order they were inserted.',
      answer: false,
      explanation:
        'The order depends on hash values and bucket layout, which vary between standard library implementations and can change completely after a rehash. It is not insertion order and not sorted order: it is unspecified. If order matters, use `std::map` (sorted) or keep a separate `std::vector` that records insertion order.',
    },
    {
      kind: 'concept',
      title: 'std::set: unique values',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes there is no value to look up, only a question of membership: has this achievement been unlocked? Has the player visited this room? Which enemy types have appeared? [[std-set]] (from `<set>`) stores **unique keys** with no values, in sorted order. It is a `std::map` without the mapped values: the same red-black tree and the same O(log n) operations.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <set>
#include <string>

int main() {
    std::set<std::string> achievements;
    achievements.insert("First Blood");
    achievements.insert("Treasure Hunter");
    bool isNew = achievements.insert("First Blood").second;
    std::cout << std::boolalpha << "new? " << isNew << '\\n';
    achievements.insert("Dragon Slayer");

    std::cout << achievements.size() << " unlocked:\\n";
    for (const std::string& name : achievements) {
        std::cout << "  " << name << '\\n';
    }
    std::cout << achievements.contains("Pacifist") << '\\n';
}`,
          output: 'new? false\n3 unlocked:\n  Dragon Slayer\n  First Blood\n  Treasure Hunter\nfalse',
          annotations: [
            { lines: 9, text: '`insert` returns a pair; `.second` is `true` only if the value was not already present. A perfect "show the unlock popup only the first time" check.' },
            { lines: 13, text: 'The duplicate was ignored, so there are 3 elements, not 4.' },
            { lines: '14-16', text: 'Sorted iteration, just like `std::map`.' },
            { lines: 17, text: '`contains` (C++20) is the membership test.' },
          ],
        },
        {
          type: 'list',
          items: [
            '[[std-unordered-set]] is the hash-table version: average O(1) membership tests, unspecified order.',
            '`std::multiset` and `std::multimap` allow duplicate keys, for example several items with the same name in a loot list.',
            'Elements of a set are effectively `const`: changing one in place could break the ordering, so you erase and re-insert instead.',
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'TSet',
          text: 'Unreal\'s `TSet` is a hash set, the counterpart of `std::unordered_set`; `TMap` is built on top of it. Keys need a `GetTypeHash` function, which Unreal provides for its common types such as `FName`, `FString` and integers.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `std::set<int> levels{3, 1, 3, 2, 1};
for (int l : levels) {
    std::cout << l << ' ';
}
std::cout << "| " << levels.size() << '\\n';`,
      options: [
        { text: '3 1 3 2 1 | 5', why: 'A set keeps each value only once and does not preserve the order of the initializer.' },
        { text: '1 1 2 3 3 | 5', why: 'Sorted, yes, but duplicates are discarded. That output would come from a `std::multiset`.' },
        { text: '1 2 3 | 3', correct: true, why: 'Duplicates are dropped, leaving {1, 2, 3}, and iteration is in sorted order.' },
        { text: '3 1 2 | 3', why: 'That is first-appearance order. `std::set` always iterates in sorted order, regardless of insertion order.' },
      ],
      explanation:
        'A `std::set` has two defining properties: every value appears at most once, and iteration is sorted (by `<`). Both come from its balanced-tree structure, where a duplicate simply finds its equal already in place and is not inserted.',
    },
    {
      kind: 'concept',
      title: 'Choosing a container',
      blocks: [
        {
          type: 'p',
          text: 'You now know the core standard containers. Choosing between them comes down to how you will access the data, how big it gets, and whether order matters:',
        },
        {
          type: 'table',
          headers: ['You need…', 'Use', 'Game example'],
          rows: [
            ['A fixed number of elements, known at compile time', '`std::array`', 'Four ability slots on a hotbar'],
            ['An ordered sequence, accessed by index or iterated; the default', '`std::vector`', 'Active enemies, particles, a path of waypoints'],
            ['Lookup by key **and** keys in sorted order or range queries', '`std::map`', 'Leaderboard sorted by name, timeline events by time'],
            ['Fastest lookup by key; order irrelevant', '`std::unordered_map`', 'Item name → item stats, entity ID → entity'],
            ['Unique membership, sorted', '`std::set`', 'Unlocked achievements listed alphabetically'],
            ['Unique membership, fastest', '`std::unordered_set`', 'Visited tiles, IDs already processed'],
          ],
        },
        {
          type: 'table',
          headers: ['Container', 'Index access', 'Find by key/value', 'Insert', 'Ordered?'],
          rows: [
            ['`std::vector`', 'O(1)', 'O(n) (O(log n) if kept sorted)', 'End: amortized O(1); middle: O(n)', 'Insertion order'],
            ['`std::map` / `std::set`', 'n/a', 'O(log n)', 'O(log n)', 'Sorted'],
            ['`std::unordered_map` / `_set`', 'n/a', 'Average O(1), worst O(n)', 'Average O(1)', 'Unspecified'],
          ],
          caption: 'Complexity cheat sheet. Remember that constant factors and cache locality matter too.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <unordered_map>

struct EnemyStats {
    int hp;
    int damage;
    int xp;
};

int main() {
    const std::unordered_map<std::string, EnemyStats> bestiary{
        {"Goblin", {30, 4, 15}},
        {"Orc", {80, 12, 40}},
        {"Dragon", {2000, 150, 5000}},
    };

    if (auto it = bestiary.find("Orc"); it != bestiary.end()) {
        const EnemyStats& orc = it->second;
        std::cout << "Orc: " << orc.hp << " HP, " << orc.damage
                  << " dmg, " << orc.xp << " XP\\n";
    }
}`,
          output: 'Orc: 80 HP, 12 dmg, 40 XP',
          annotations: [
            { lines: '5-9', text: 'A [[struct]] bundles named values into one type (the classes unit covers them fully). It makes a natural map value: one entry per enemy type.' },
            { lines: 12, text: 'The bestiary is `const` after setup, so lookups must use `find`, `contains` or `at`; `operator[]` would not compile.' },
            { lines: 18, text: 'The C++17 `if` with an initializer keeps `it` scoped to the check, a perfect fit for `find`.' },
            { lines: 19, text: 'Binding the value to a `const&` avoids copying the struct.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Measure, and remember small n',
          text: 'Big-O describes growth, not speed at your actual size. For a dozen elements, a `std::vector` searched linearly is frequently faster than either map, because it is one contiguous block with no hashing and no pointer chasing. Start with the container that expresses your intent most clearly, and switch when a profiler shows it matters.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal\'s containers',
          text: 'Unreal\'s big three are `TArray` (like `std::vector`), `TMap` (a hash map, like `std::unordered_map`) and `TSet` (a hash set). Unlike the standard hash containers, `TMap` and `TSet` store their elements in a single array internally (a sparse array that can have gaps after removals), so iteration is fast and usually follows insertion order, but that order is not guaranteed once elements are removed. For the rare case where you need sorted keys, Unreal offers `TSortedMap`, which keeps a sorted array and uses binary search.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'You need a leaderboard that maps player names to scores and must always display the names in alphabetical order. Which container fits best?',
      options: [
        { text: '`std::unordered_map<std::string, int>`', why: 'Fast lookups, but iteration order is unspecified, so you would have to copy and sort the names every time you display them.' },
        { text: '`std::map<std::string, int>`', correct: true, why: 'Lookup by name in O(log n), and iteration is always in sorted key order, so displaying alphabetically is just a loop.' },
        { text: '`std::set<std::string>`', why: 'A set stores the names in order, but there is nowhere to keep each player\'s score.' },
        { text: '`std::vector<int>`', why: 'A vector of scores has no names at all, and finding a player would require extra bookkeeping.' },
      ],
      explanation:
        'Two requirements, key → value lookup and sorted iteration, point directly at `std::map`. If you only ever needed lookups, `std::unordered_map` would be the faster choice; if you needed scores sorted by *value*, you would sort a vector of pairs instead, since maps are sorted by key.',
    },
    {
      kind: 'bug',
      prompt: 'This function does not compile. Tap the line with the error.',
      code: `#include <map>
#include <string>

int countOf(const std::map<std::string, int>& inv,
            const std::string& item) {
    return inv[item];
}`,
      bugLines: [6],
      hint: 'What could `operator[]` do that a `const` map does not allow?',
      explanation:
        '`operator[]` may insert a missing key, so it is only available on non-const maps, and `inv` is a `const&`. That is the compiler protecting you from the operator[] trap. Use a lookup that never inserts: `auto it = inv.find(item); return it != inv.end() ? it->second : 0;` (or `inv.at(item)` if a missing item should be an error).',
    },
    {
      kind: 'order',
      prompt: 'Arrange the lines to print a troll\'s stats only if `"Troll"` is in the `bestiary` map, without ever inserting into it.',
      lines: [
        'auto it = bestiary.find("Troll");',
        'if (it != bestiary.end()) {',
        '    std::cout << it->second.hp << \'\\n\';',
        '}',
      ],
      distractors: ['std::cout << bestiary["Troll"].hp << \'\\n\';', 'if (it == bestiary.end()) {'],
      explanation:
        '`find` performs one search and returns either the element\'s position or `end()`. Comparing with `end()` before touching `it->second` is essential: dereferencing `end()` is undefined behavior. The `bestiary["Troll"]` distractor would insert a default-constructed troll if none existed (and would not compile on a `const` map).',
    },
  ],
  takeaways: [
    '`std::map` stores unique keys with values in a balanced (red-black) tree: sorted iteration, O(log n) operations, and stable references to elements.',
    '`operator[]` inserts a default value for a missing key. Use it to write or count; use `contains`, `find` or `at` to look up.',
    '`insert` and `try_emplace` keep an existing value; `insert_or_assign` and `m[k] = v` overwrite. `try_emplace` constructs nothing when the key exists.',
    '`std::unordered_map` is a hash table: average O(1) lookups, worst case O(n), rehashing as the load factor grows, and an unspecified iteration order.',
    '`std::set` and `std::unordered_set` store unique values for membership tests; `insert(...).second` tells you whether a value was new.',
    'Choose by access pattern: vector by default, array for fixed sizes, map for sorted keyed data, unordered_map for fast keyed lookup, and measure when it matters.',
    'Unreal\'s `TMap` and `TSet` are hash-based; `TMap::operator[]` asserts on a missing key and `TMap::Add` overwrites.',
  ],
  reading: [
    {
      title: 'std::map',
      url: 'https://en.cppreference.com/w/cpp/container/map',
      source: 'cppreference',
      note: 'All member functions with complexity guarantees; compare `operator[]`, `insert`, `try_emplace` and `insert_or_assign`.',
    },
    {
      title: 'std::unordered_map',
      url: 'https://en.cppreference.com/w/cpp/container/unordered_map',
      source: 'cppreference',
      note: 'Buckets, load factor, rehashing and the iterator invalidation rules for hash containers.',
    },
    {
      title: 'Containers library',
      url: 'https://en.cppreference.com/w/cpp/container',
      source: 'cppreference',
      note: 'An overview of every standard container, with a member function comparison table.',
    },
    {
      title: 'Map Containers in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/map-containers-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How `TMap` works, including `Add`, `Find`, `FindOrAdd` and its hashing requirements.',
    },
  ],
};
