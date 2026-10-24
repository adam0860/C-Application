import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-containers',
  title: 'TArray, TMap and TSet',
  summary:
    'Unreal\'s three core containers: adding, finding, removing and sorting; how they differ from the STL; using them as UPROPERTYs; and the modify-while-iterating trap.',
  minutes: 18,
  objectives: [
    'Add, find, remove and iterate elements in a `TArray`, and sort it with a predicate',
    'Use `TMap` lookups safely with `Find`, `FindOrAdd` and `Contains`, and iterate key/value pairs',
    'Use `TSet` for fast membership tests',
    'Explain the key differences from `std::vector` and `std::unordered_map`: `Num()`, `int32` indices, allocators, checks',
    'Expose containers as `UPROPERTY`s and avoid modifying a container while iterating over it',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Unreal\'s containers at a glance',
      blocks: [
        {
          type: 'p',
          text: 'In the C++ course you used [[std-vector]], [[std-unordered-map]] and [[std-set]]. Unreal code uses its own equivalents almost everywhere. The ideas carry straight over — contiguous dynamic arrays, hash tables — but the names and a few behaviours differ.',
        },
        {
          type: 'table',
          headers: ['Unreal', 'Closest STL type', 'What it is'],
          rows: [
            ['[[tarray|TArray<T>]]', '`std::vector<T>`', 'A dynamic, contiguous array — the container you will use 90% of the time'],
            ['[[tmap|TMap<K, V>]]', '`std::unordered_map<K, V>`', 'A hash map from unique keys to values'],
            ['[[tset|TSet<T>]]', '`std::unordered_set<T>`', 'A hash set of unique elements'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why doesn\'t Unreal just use the STL?',
          text: 'Three reasons. **Integration:** Unreal containers work with reflection, so they can be `UPROPERTY`s that the editor displays, the save system serializes, the network replicates and the garbage collector scans for object references — a `std::vector` can do none of that. **Consistency:** when Unreal\'s containers were designed, standard library implementations varied in performance and behaviour between compilers and consoles; owning the code guarantees identical behaviour everywhere. **Control:** pluggable allocators, no exceptions (errors are assertions), and memory tricks the standard doesn\'t allow.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Everything you know still applies',
          text: 'Contiguous memory and [[cache-locality]], amortized growth with [[capacity]], hashing and [[big-o]] costs — all of it carries over. A `TArray` really is a vector with a different interface.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'TArray basics: adding and reading',
      blocks: [
        {
          type: 'code',
          title: 'Inventory.cpp (excerpts)',
          code: `TArray<FName> Items;
Items.Reserve(16);

Items.Add(TEXT("Sword"));
Items.Emplace(TEXT("Shield"));
Items.AddUnique(TEXT("Sword"));

const int32 Count = Items.Num();
const FName First = Items[0];

if (Items.IsValidIndex(5)) {
    UseItem(Items[5]);
}

for (const FName& Item : Items) {
    UE_LOG(LogTemp, Display, TEXT("%s"), *Item.ToString());
}`,
          annotations: [
            { lines: 2, text: '`Reserve` allocates room for 16 elements up front, so the next 16 additions never reallocate. Like `std::vector::reserve`, it doesn\'t change `Num()`.' },
            { lines: 4, text: '`Add` copies or moves an existing value in, and returns the new element\'s index. The literal is converted to an `FName` first.' },
            { lines: 5, text: '`Emplace` constructs the element directly in the array\'s memory from the arguments — the same idea as `emplace_back`.' },
            { lines: 6, text: '`AddUnique` adds only if no equal element exists. "Sword" is already present, so nothing is added. (It searches linearly, so it is O(n).)' },
            { lines: 8, text: '`Num()`, not `size()`, and it returns `int32`, a signed type.' },
            { lines: 9, text: '`operator[]` is bounds-checked in development builds: an invalid index triggers an assertion instead of silently reading garbage.' },
            { lines: 11, text: '`IsValidIndex` tests `0 <= i < Num()` — handy before indexing with an untrusted value.' },
            { lines: '15-17', text: 'Range-based `for` works exactly as with `std::vector`. Use `const&` to avoid copying each element.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Max() is not the largest element',
          text: '`TArray::Max()` returns the **capacity** — how many elements fit before the next reallocation — not the largest value. To find the biggest element, use an algorithm such as `FMath::Max` in a loop or `Algo::MaxElement`.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Reserve when you know the size',
          text: 'A growing `TArray` reallocates and moves every element when it outgrows its capacity, just like `std::vector`. If you are about to add a known number of elements — one per enemy in a wave, one per hit in a trace — call `Reserve` first.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'What is `Loot.Num()` after this code runs?',
      code: `TArray<FName> Loot;
Loot.Reserve(10);
Loot.Add(TEXT("Sword"));
Loot.Add(TEXT("Shield"));
Loot.AddUnique(TEXT("Sword"));
Loot.Emplace(TEXT("Potion"));`,
      options: [
        { text: '13', why: '`Reserve` allocates capacity but adds no elements, so it contributes nothing to `Num()`.' },
        { text: '4', why: '`AddUnique` skips "Sword" because an equal element is already in the array.' },
        { text: '3', correct: true, why: '"Sword", "Shield", then "Potion". `Reserve` changes capacity only, and `AddUnique` found a duplicate.' },
        { text: '10', why: '`Num()` counts elements, not capacity. Capacity is what `Max()` reports.' },
      ],
      explanation:
        'Keep **size** and **capacity** apart: `Num()` is how many elements exist, `Max()` is how many fit before reallocating, and `Reserve` affects only the latter. `AddUnique` makes the array behave like a small set, at the cost of a linear search on every call.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Finding and removing',
      blocks: [
        {
          type: 'code',
          title: 'Searching and removing',
          code: `if (Items.Contains(TEXT("Key"))) {
    OpenDoor();
}

const int32 Index = Items.Find(TEXT("Shield"));
if (Index != INDEX_NONE) {
    Items.RemoveAt(Index);
}

const FLootDrop* Rare = Drops.FindByPredicate(
    [](const FLootDrop& Drop) {
        return Drop.Rarity == EItemRarity::Legendary;
    });

const int32 Removed = Items.Remove(TEXT("Junk"));
Items.RemoveSingle(TEXT("Arrow"));
Items.RemoveAtSwap(0);`,
          annotations: [
            { lines: 1, text: '`Contains` answers yes/no with a linear search (O(n)).' },
            { lines: '5-6', text: '`Find` returns the index of the first match, or [[index-none]] (−1) if there is none. Signed indices make that sentinel possible.' },
            { lines: 7, text: '`RemoveAt` removes by index and shifts every later element down one place: O(n), order preserved.' },
            { lines: '10-13', text: '`FindByPredicate` takes a [[lambda]] and returns a **pointer** to the first matching element, or `nullptr`. The pointer is invalidated if the array reallocates.' },
            { lines: 15, text: '`Remove(Value)` removes **every** element equal to `Value` and returns how many it removed.' },
            { lines: 16, text: '`RemoveSingle` removes only the first match.' },
            { lines: 17, text: '`RemoveAtSwap` moves the last element into the gap instead of shifting: O(1), but the order changes.' },
          ],
        },
        {
          type: 'table',
          headers: ['Function', 'Removes', 'Cost', 'Keeps order?'],
          rows: [
            ['`Remove(Value)`', 'All equal elements', 'O(n)', 'Yes'],
            ['`RemoveSingle(Value)`', 'First equal element', 'O(n)', 'Yes'],
            ['`RemoveAt(Index)`', 'One element by index', 'O(n) shift', 'Yes'],
            ['`RemoveAtSwap(Index)`', 'One element by index', 'O(1)', 'No'],
            ['`RemoveAll(Predicate)`', 'Every element matching a predicate', 'O(n), single pass', 'Yes'],
            ['`Empty()` / `Reset()`', 'Everything', 'O(n)', '—'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Empty vs Reset',
          text: '`Empty()` destroys the elements **and frees** the memory. `Reset()` destroys the elements but **keeps** the allocation for reuse. For an array you refill every frame, `Reset()` avoids a free and a fresh allocation each time.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'truefalse',
      prompt: '`Arrows.Remove(Broken)` removes only the first element equal to `Broken`, just as `std::vector::erase` removes a single position.',
      answer: false,
      explanation:
        '`TArray::Remove(Value)` removes **all** elements equal to the value and returns the count. If you want only the first, use `RemoveSingle`; to remove one known position, use `RemoveAt` or `RemoveAtSwap`. Mixing these up causes subtle inventory bugs, such as selling one potion and losing all of them.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Sorting with predicates',
      blocks: [
        {
          type: 'p',
          text: '`Sort()` with no arguments orders elements with `operator<`. Pass a predicate — a lambda that returns `true` when its first argument should come **before** the second — to sort any way you like:',
        },
        {
          type: 'code',
          title: 'Leaderboard.cpp',
          code: `struct FScoreEntry {
    FString Name;
    int32 Score = 0;
};

TArray<FScoreEntry> Board = LoadScores();

Board.Sort([](const FScoreEntry& A, const FScoreEntry& B) {
    return A.Score > B.Score;
});

Board.StableSort([](const FScoreEntry& A,
                    const FScoreEntry& B) {
    return A.Name < B.Name;
});`,
          annotations: [
            { lines: '8-10', text: 'Highest score first. The predicate must be a **strict weak ordering** (from the algorithms lesson): use `>` or `<`, never `>=`, or sorting can misbehave.' },
            { lines: '12-15', text: '`Sort` is an introsort and **not stable**: equal elements may be reordered. `StableSort` keeps equal elements in their original relative order, at some extra cost.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Arrays of raw pointers sort by the pointed-to value',
          text: 'If a `TArray` holds raw pointers, such as `TArray<AEnemy*>`, `Sort` automatically **dereferences** them: your predicate receives `const AEnemy&` parameters and `Sort()` without a predicate compares the objects, not the addresses. Epic documents this behaviour; use `Algo::Sort` if you really need to sort the pointer values themselves.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Algo:: — Unreal\'s <algorithm>',
          text: '`TArray` has `begin()` and `end()`, so range-based `for` works. For algorithms, Unreal provides its own namespace: `Algo::Sort`, `Algo::Find`, `Algo::Transform`, `Algo::Accumulate` and more, which accept whole containers instead of iterator pairs.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'fill',
      prompt: 'Sort the leaderboard so the highest score comes first, then find the local player\'s entry.',
      template: `Board.___([](const FScoreEntry& A, const FScoreEntry& B) {
    return A.Score ___ B.Score;
});

const FScoreEntry* Mine = Board.___(
    [this](const FScoreEntry& Entry) {
        return Entry.Name == LocalPlayerName;
    });`,
      blanks: [
        { answers: ['Sort', 'StableSort'] },
        { answers: ['>'] },
        { answers: ['FindByPredicate'] },
      ],
      wordBank: ['Sort', '>', 'FindByPredicate', '<', '>=', 'Find', 'Contains'],
      explanation:
        '`Sort` with a predicate returning `A.Score > B.Score` puts higher scores first; `>=` would break the strict-weak-ordering requirement. `FindByPredicate` returns a pointer to the first match or `nullptr`, which is why the result is a `const FScoreEntry*`. `Find` searches for an equal *value* and returns an index, and `Contains` only returns a `bool`.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'TMap: keys to values',
      blocks: [
        {
          type: 'code',
          title: 'Ammo by weapon',
          code: `TMap<FName, int32> Ammo;

Ammo.Add(TEXT("Rifle"), 30);
Ammo.Add(TEXT("Rifle"), 10);

if (int32* Shells = Ammo.Find(TEXT("Shotgun"))) {
    *Shells -= 1;
}

Ammo.FindOrAdd(TEXT("Pistol")) += 12;

const bool bHasRifle = Ammo.Contains(TEXT("Rifle"));
Ammo.Remove(TEXT("Rifle"));

for (const TPair<FName, int32>& Pair : Ammo) {
    UE_LOG(LogTemp, Display, TEXT("%s: %d"),
        *Pair.Key.ToString(), Pair.Value);
}`,
          annotations: [
            { lines: '3-4', text: '`Add` **replaces** the value if the key already exists, so Rifle now holds 10. (`std::unordered_map::insert` would have kept 30.)' },
            { lines: '6-8', text: '`Find` returns a **pointer** to the value, or `nullptr` if the key is missing. One lookup answers "is it there?" and gives you access. Declaring the pointer inside the `if` keeps its scope tight.' },
            { lines: 10, text: '`FindOrAdd` returns a reference, inserting a default-constructed value (0 for `int32`) if the key is missing — what `std::unordered_map::operator[]` does.' },
            { lines: '12-13', text: '`Contains` tests for a key; `Remove` deletes the entry and returns how many were removed (0 or 1).' },
            { lines: '15-18', text: 'Iteration yields `TPair<K, V>` elements with `.Key` and `.Value` members — the equivalent of `std::pair`\'s `.first` and `.second`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'TMap\'s [] does not insert',
          text: 'With `std::map` or `std::unordered_map`, `Map[Key]` quietly inserts a default value when the key is missing. With `TMap`, `Map[Key]` **asserts** if the key is missing. Use `[]` only when absence would be a bug; otherwise use `Find` or `FindOrAdd`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does Find return a pointer?',
          text: 'A lookup has two possible outcomes, and a pointer encodes both: `nullptr` for "absent", an address for "here it is". The standard library\'s `at()` reports absence by throwing an exception — but exceptions are disabled in Unreal — and `operator[]` hides absence by inserting. A pointer makes you handle the missing case, costs one lookup, and lets you modify the value in place.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'No guaranteed order',
          text: 'Like `std::unordered_map`, a `TMap` makes no promise about iteration order. If you need sorted output, sort the map with `KeySort` or `ValueSort`, or copy the keys out with `GenerateKeyArray` and sort those.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'After this code runs, which statement is true?',
      code: `TMap<FName, int32> Ammo;
Ammo.Add(TEXT("Rifle"), 30);
Ammo.Add(TEXT("Rifle"), 10);
Ammo.FindOrAdd(TEXT("Shotgun")) += 8;
int32* Pistol = Ammo.Find(TEXT("Pistol"));`,
      options: [
        {
          text: '`Ammo.Num()` is 3, because both `Add` calls created a "Rifle" entry',
          why: 'Keys in a `TMap` are unique. The second `Add` replaced the existing value instead of adding an entry.',
        },
        {
          text: 'Rifle holds 30, because `Add` never overwrites an existing key',
          why: 'That is how `std::unordered_map::insert` behaves. `TMap::Add` overwrites.',
        },
        {
          text: '`Ammo.Num()` is 2, Rifle holds 10, Shotgun holds 8, and `Pistol` is `nullptr`',
          correct: true,
          why: '`Add` replaced Rifle\'s value, `FindOrAdd` inserted Shotgun with 0 and added 8, and `Find` doesn\'t insert anything.',
        },
        {
          text: '`Ammo.Num()` is 3 and `Pistol` points to a new value of 0',
          why: '`Find` never inserts — that is `FindOrAdd`. A missing key simply produces `nullptr`.',
        },
      ],
      explanation:
        'Each lookup function has a precise contract: `Add` inserts **or overwrites**, `FindOrAdd` inserts a default if missing and returns a reference, `Find` returns a pointer or `nullptr` and never inserts, and `operator[]` asserts if missing. Several of these differ from their `std::` look-alikes, so learn them deliberately.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'TSet, hashing, and what differs from the STL',
      blocks: [
        {
          type: 'p',
          text: 'A `TSet` stores unique elements with O(1) average lookup — perfect for "have we seen this?" questions:',
        },
        {
          type: 'code',
          title: 'Tracking visited rooms',
          code: `TSet<FName> VisitedRooms;
VisitedRooms.Add(TEXT("Crypt"));
VisitedRooms.Add(TEXT("Crypt"));

if (!VisitedRooms.Contains(CurrentRoom)) {
    ShowDiscoveryBanner(CurrentRoom);
    VisitedRooms.Add(CurrentRoom);
}`,
          annotations: [
            { lines: '2-3', text: 'Adding a duplicate does nothing; `Num()` is still 1.' },
            { lines: 5, text: 'A hash lookup, O(1) on average — unlike `TArray::Contains`, which is O(n).' },
          ],
        },
        {
          type: 'p',
          text: 'Keys of a `TMap` and elements of a `TSet` must be hashable. Unreal types already are. For your own struct, provide `operator==` and a `GetTypeHash` function — Unreal\'s counterpart to specializing `std::hash`:',
        },
        {
          type: 'code',
          title: 'GridCoord.h',
          code: `struct FGridCoord {
    int32 X = 0;
    int32 Y = 0;

    bool operator==(const FGridCoord& Other) const {
        return X == Other.X && Y == Other.Y;
    }

    friend uint32 GetTypeHash(const FGridCoord& C) {
        return HashCombine(GetTypeHash(C.X),
                           GetTypeHash(C.Y));
    }
};`,
          annotations: [
            { lines: '5-7', text: 'Equality decides whether two keys are the same key.' },
            { lines: '9-12', text: 'Found by the containers through argument-dependent lookup. `HashCombine` mixes the members\' hashes. Equal keys must produce equal hashes.' },
          ],
        },
        {
          type: 'table',
          headers: ['Topic', 'STL', 'Unreal'],
          rows: [
            ['Element count', '`size()` returns `size_t` (unsigned)', '`Num()` returns `int32` (signed)'],
            ['"Not found"', 'End iterator, `npos`', '`INDEX_NONE` or `nullptr`'],
            ['Out-of-range `[]`', 'Undefined behavior', 'Assertion in development builds (still UB in Shipping)'],
            ['Errors', 'Some functions throw', 'Never throw; misuse asserts'],
            ['Memory', '`std::allocator` by default', 'Pluggable allocators, e.g. `TArray<int32, TInlineAllocator<8>>`'],
            ['Reflection', 'None', 'Can be `UPROPERTY`s'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Signed indices make reverse loops safe',
          text: 'With `size_t`, `for (size_t i = v.size() - 1; i >= 0; --i)` loops forever, because an unsigned value is never negative. With `int32`, `for (int32 i = Arr.Num() - 1; i >= 0; --i)` works exactly as it reads.',
        },
        {
          type: 'deepdive',
          title: 'Allocators and relocation',
          blocks: [
            {
              type: 'p',
              text: 'Unreal containers take an allocator as a template parameter. [[tinlineallocator|TInlineAllocator<N>]] stores the first N elements inside the container object itself, so small arrays never touch the heap — great for short-lived arrays in hot code, such as the results of a trace.',
            },
            {
              type: 'p',
              text: 'Unreal containers also assume elements can be moved to a new address by copying their bytes (bitwise relocation), rather than by calling move constructors one by one. That makes growth fast, but it means a type that stores a pointer to *itself* (or registers its own address somewhere) must not be stored by value in a `TArray`. Ordinary structs, `FString`, `FName` and pointers are all fine.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Containers as UPROPERTYs',
      blocks: [
        {
          type: 'p',
          text: 'Because Unreal containers are understood by reflection, you can mark them `UPROPERTY` like any other member. The editor shows a list with **+** and **×** buttons, the values are saved with the level or Blueprint, and object pointers inside them are tracked by the garbage collector.',
        },
        {
          type: 'code',
          title: 'WaveSpawner.h (excerpt)',
          code: `UPROPERTY(EditAnywhere, Category = "Patrol")
TArray<TObjectPtr<AActor>> PatrolPoints;

UPROPERTY(EditAnywhere, Category = "Loot")
TMap<FName, int32> StartingItems;

UPROPERTY(VisibleAnywhere, Category = "Progress")
TSet<FName> UnlockedLevels;

UPROPERTY(EditAnywhere, Category = "Waves")
TArray<FWaveSpawns> Waves;`,
          annotations: [
            { lines: 2, text: 'A designer picks patrol points in the level. `TObjectPtr` is the pointer wrapper Unreal uses for object properties; the garbage collector sees every element, so the referenced actors aren\'t collected while listed.' },
            { lines: 5, text: 'Maps appear as key/value rows in the Details panel.' },
            { lines: 8, text: 'Sets work too. All three container types are also usable in Blueprints.' },
            { lines: 11, text: '`FWaveSpawns` is a `USTRUCT` that itself contains a `TArray` — the standard workaround for a limitation explained below.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**No nested containers:** `UPROPERTY() TArray<TArray<int32>> Grid;` is rejected by UnrealHeaderTool. Wrap the inner array in a `USTRUCT` and make an array of that struct.',
            '**Replication:** `TArray` properties can be replicated over the network; `TMap` and `TSet` cannot.',
            '**Standard containers can\'t be reflected:** a `std::vector` member compiles, but it can never be a `UPROPERTY` — invisible to the editor, saving and the garbage collector.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the garbage collector cares',
          text: 'Unreal\'s garbage collector keeps an object alive only if it can find a reference to it through reflected properties. A `TArray<TObjectPtr<AActor>>` marked `UPROPERTY` is visible to it. The same pointers in an unmarked array — or in a `std::vector` — are invisible, so the objects can be collected while you still hold their addresses. The garbage-collection lesson explores this in depth.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which of these member declarations can be marked `UPROPERTY()`? Select all that apply.',
      codeOptions: true,
      options: [
        { text: 'TArray<int32> Scores;', correct: true, why: 'Arrays of supported types are fully reflected.' },
        { text: 'TMap<FName, float> Resistances;', correct: true, why: 'Maps with hashable keys and supported values can be reflected (though not replicated).' },
        { text: 'TArray<TArray<int32>> Grid;', why: 'Nested containers are not supported by reflection. Wrap the inner array in a `USTRUCT`.' },
        { text: 'std::vector<int32> Scores;', why: 'Reflection knows nothing about standard containers. It compiles as a plain member, but cannot be a `UPROPERTY`.' },
        { text: 'TSet<FName> VisitedRooms;', correct: true, why: 'Sets are supported as properties and in Blueprints.' },
      ],
      explanation:
        'UnrealHeaderTool understands `TArray`, `TMap` and `TSet` of supported element types — but only one level deep. When you need a grid or a list of lists, wrap the inner container in a `USTRUCT` with its own `UPROPERTY`. That extra struct also gives designers a cleaner editing experience.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'The modify-while-iterating trap',
      blocks: [
        {
          type: 'p',
          text: 'In the C++ course you learned about [[iterator-invalidation]]: erasing from a `std::vector` while iterating over it invalidates the iterators. `TArray` has the same problem. Removing an element shifts the later ones down, so a range-based `for` skips the element that moved into the gap and runs past the new end.',
        },
        {
          type: 'p',
          text: 'Development builds of Unreal catch this in range-based `for` loops over a `TArray` with an assertion — *"Array has changed during ranged-for iteration!"*. In Shipping builds the check is compiled out and the result is [[undefined-behavior]]. Here are the safe patterns:',
        },
        {
          type: 'code',
          title: 'Safe removal patterns',
          code: `// 1. Let the container do it in one pass
ActiveEnemies.RemoveAll([](const AEnemy* Enemy) {
    return Enemy->IsDead();
});

// 2. Iterate backwards by index
for (int32 i = ActiveEnemies.Num() - 1; i >= 0; --i) {
    if (ActiveEnemies[i]->IsDead()) {
        ActiveEnemies.RemoveAtSwap(i);
    }
}

// 3. TMap / TSet: remove through an iterator
for (auto It = Cooldowns.CreateIterator(); It; ++It) {
    It.Value() -= DeltaTime;
    if (It.Value() <= 0.f) {
        It.RemoveCurrent();
    }
}`,
          annotations: [
            { lines: '2-4', text: 'The clearest option: `RemoveAll` takes a predicate and compacts the array in a single O(n) pass.' },
            { lines: 7, text: 'Walking backwards means removals only affect elements you have **already** visited.' },
            { lines: 9, text: '`RemoveAtSwap` moves the last element into slot `i`. Going backwards, that element was already checked, so nothing is skipped.' },
            { lines: '14-19', text: 'Maps and sets offer iterators with `RemoveCurrent()`, which removes the current entry and keeps the iterator valid.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Adding while iterating is just as bad',
          text: 'Calling `Add` inside a range-based `for` over the same array can reallocate the buffer, leaving the loop reading freed memory. Collect new elements in a separate array and append them after the loop with `Append`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'bug',
      prompt: 'In a development build this function triggers an assertion the first time an enemy dies. Tap the line responsible.',
      code: `void AWaveManager::CleanUpDeadEnemies() {
    for (AEnemy* Enemy : ActiveEnemies) {
        if (Enemy->IsDead()) {
            ActiveEnemies.Remove(Enemy);
        }
    }
}`,
      bugLines: [4],
      hint: 'What happens to a range-based for loop when the array it is walking changes size?',
      explanation:
        'Removing from `ActiveEnemies` inside a range-based `for` over `ActiveEnemies` changes the array under the loop: elements shift, `Num()` shrinks and the iterator\'s assumptions break. Development builds assert with "Array has changed during ranged-for iteration!"; in Shipping it is undefined behavior (skipped enemies or out-of-bounds reads). Replace the whole loop with a single `ActiveEnemies.RemoveAll(...)` call whose lambda returns `Enemy->IsDead()`, or iterate backwards by index.',
    },
  ],
  takeaways: [
    '`TArray`, `TMap` and `TSet` are Unreal\'s counterparts to `std::vector`, `std::unordered_map` and `std::unordered_set`, and the only ones that work with reflection.',
    '`TArray`: `Add`/`Emplace`/`AddUnique` to insert, `Num()` for the count, `Find` returns an index or `INDEX_NONE`, `Remove(Value)` removes **all** matches, `RemoveAtSwap` is O(1) but reorders.',
    'Sort with a strict-weak-ordering predicate; `Sort` is not stable, `StableSort` is.',
    '`TMap::Add` overwrites, `Find` returns a pointer or `nullptr`, `FindOrAdd` inserts a default, and `operator[]` asserts on a missing key.',
    'Indices and counts are signed `int32`; containers never throw; out-of-range access asserts in development builds.',
    'Containers can be `UPROPERTY`s (editable, saved, scanned by the garbage collector) but not nested; only `TArray` replicates.',
    'Never add or remove elements while range-iterating; use `RemoveAll`, a backwards index loop, or an iterator\'s `RemoveCurrent()`.',
  ],
  reading: [
    {
      title: 'Array Containers in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/array-containers-in-unreal-engine',
      source: 'unreal-docs',
      note: 'The complete `TArray` guide, including heap functions, slack and allocators.',
    },
    {
      title: 'Map Containers in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/map-containers-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Every `TMap` operation, plus `KeyFuncs` for custom hashing.',
    },
    {
      title: 'Set Containers in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/set-containers-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How `TSet` works and the set operations it supports.',
    },
    {
      title: 'std::vector',
      url: 'https://en.cppreference.com/w/cpp/container/vector',
      source: 'cppreference',
      note: 'Compare with `TArray` — especially the iterator-invalidation rules, which apply to both.',
    },
  ],
};
