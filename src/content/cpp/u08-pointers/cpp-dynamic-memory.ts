import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-dynamic-memory',
  title: 'new, delete and the Dangers of Raw Ownership',
  summary: 'Allocating on the heap by hand, the three classic bugs it invites — leaks, dangling pointers, double deletes — and why modern C++ hands ownership to objects.',
  minutes: 18,
  objectives: [
    'Allocate and free single objects with `new`/`delete` and arrays with `new[]`/`delete[]`',
    'Explain why mismatching `new[]` with `delete` is undefined behavior',
    'Describe memory leaks, dangling pointers and double deletes, and how each one happens',
    'Explain ownership, and why a raw owning pointer makes it invisible',
    'Explain how RAII types such as `std::vector` and `std::unique_ptr` free memory automatically',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Asking for memory at run time: new',
      blocks: [
        {
          type: 'p',
          text: 'In the memory-model lesson you saw that the heap holds objects whose size or lifetime is decided at run time. You request heap memory with a [[new-expression|`new` expression]]. It finds a free block big enough for the object, creates the object there, and evaluates to the object\'s **address**. The object has no name; the pointer you store is your only way to reach it.',
        },
        {
          type: 'code',
          title: 'boss.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int* bossHp = new int{5000};   // allocate + initialize
    std::cout << *bossHp << '\\n';
    *bossHp -= 1200;
    std::cout << *bossHp << '\\n';
    delete bossHp;                 // destroy + free
    bossHp = nullptr;              // forget the stale address
}`,
          output: '5000\n3800',
          annotations: [
            { lines: 4, text: '`new int{5000}` allocates `sizeof(int)` bytes on the heap, initializes them to 5000, and returns the address, which we store in a stack variable.' },
            { lines: '5-7', text: 'From here on it is ordinary pointer use: dereference to read or write.' },
            { lines: 8, text: '[[delete-expression|`delete`]] destroys the object and hands its memory back to the allocator. Every `new` needs exactly one matching `delete`.' },
            { lines: 9, text: 'After `delete`, `bossHp` still holds the old address. Setting it to `nullptr` makes "no object" explicit.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Just after line 4. The pointer is on the stack; the object it points to is on the heap.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [{ name: 'bossHp', type: 'int*', value: '0x9e20', address: '0xff48', pointsTo: 'bossObj' }],
            },
            {
              label: 'Heap',
              kind: 'heap',
              cells: [{ id: 'bossObj', type: 'int', value: '5000', address: '0x9e20', highlight: true }],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does C++ make you free memory yourself?',
          text: 'Because it gives you **control over timing**. A game running at 60 fps has 16.7 ms per frame; a garbage-collection pause of even a few milliseconds is a visible hitch. With `new` and `delete`, memory is acquired and released exactly when your code says so, with no background collector. The cost is responsibility: nothing reminds you if you forget — which is why the rest of this lesson is about the ways it goes wrong.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'new is not malloc',
          text: 'C\'s `malloc` hands you raw, uninitialized bytes; `new` also **constructs** the object (for class types it runs a constructor, as you will see in Unit 9). Never free `new`ed memory with `free`, or `malloc`ed memory with `delete`. And if the heap is exhausted, `new` does not return `nullptr` — it throws a `std::bad_alloc` exception (Unit 14), so checking its result for null is pointless.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'What does the expression `new int{7}` evaluate to?',
      options: [
        { text: 'An `int` with the value 7, stored on the heap', why: 'The `int` is on the heap, but the *expression\'s* value is its address. You need a pointer to hold it: `int* p = new int{7};`.' },
        { text: 'An `int*` pointing to seven consecutive `int`s', why: 'That would be `new int[7]`. Braces initialize one object; square brackets give a count.' },
        { text: 'An `int*` holding the address of a new heap `int` whose value is 7', correct: true, why: '`new` allocates, initializes the object with 7, and yields a pointer to it.' },
        { text: 'A reference to a new `int` on the stack', why: '`new` always allocates dynamic (heap) storage, and it produces a pointer, not a reference.' },
      ],
      explanation:
        '`new T{args}` does two jobs: obtain heap memory for one `T`, then initialize a `T` in it. The result is a `T*`. Because the object has no name, losing that pointer means losing the object — remember that for the leak section.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'delete: giving it back',
      blocks: [
        {
          type: 'p',
          text: '`delete p;` destroys the object `p` points to and returns its memory to the allocator. Notice what it does **not** do: it does not change `p`. The pointer still holds the old address, which now leads to memory you no longer own.',
        },
        {
          type: 'code',
          code: `int* shield = new int{250};
// ... use *shield ...
delete shield;       // the int is gone; memory returned
// shield still holds the old address here!
shield = nullptr;    // make the "no object" state explicit
delete shield;       // deleting a null pointer does nothing`,
          annotations: [
            { lines: 3, text: 'After this line the heap block may be handed out again by the very next `new` — perhaps to a completely different object.' },
            { lines: 4, text: 'A pointer holding the address of a destroyed object is a [[dangling-pointer]]. Reading or writing through it is undefined behavior.' },
            { lines: 6, text: '`delete nullptr` is defined to be a safe no-op, so null-after-delete also protects against accidentally deleting twice through *this* pointer.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Between lines 3 and 5: the pointer survived, the object did not.',
          regions: [
            {
              label: 'Stack',
              kind: 'stack',
              cells: [{ name: 'shield', type: 'int*', value: '0x9e20', address: '0xff48', pointsTo: 'freedShield', highlight: true }],
            },
            {
              label: 'Heap',
              kind: 'heap',
              cells: [{ id: 'freedShield', value: '(freed — not yours)', address: '0x9e20' }],
            },
          ],
        },
        {
          type: 'table',
          headers: ['Property', 'Stack object', 'Heap object'],
          rows: [
            ['Created by', 'Its declaration', '`new`'],
            ['Destroyed by', 'End of scope, automatically', '`delete`, manually'],
            ['Has a name', 'Yes', 'No — reached only through a pointer'],
            ['Size decided', 'At compile time', 'At run time'],
            ['Cost', 'Practically free', 'An allocator call each way'],
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Why doesn\'t delete null the pointer for you?',
          text: 'Its operand can be any expression, such as `delete findEnemy();`, which has no variable to reset. And even when it could, other copies of the same address elsewhere in the program would still dangle, so it would give a false sense of safety. C++ does not add hidden work that only half-solves a problem.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Arrays: new[] and delete[]',
      blocks: [
        {
          type: 'p',
          text: 'To allocate several objects at once, put a count in square brackets: `new int[count]`. Unlike a C array on the stack, the count may be a run-time value. Memory from `new[]` must be freed with `delete[]` — the brackets are not optional.',
        },
        {
          type: 'code',
          title: 'wave.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int enemyCount = 4;              // imagine: read from a level file
    int* hp = new int[enemyCount]{}; // 4 ints, all zero

    for (int i = 0; i < enemyCount; ++i) {
        hp[i] = 100 + i * 25;
    }
    for (int i = 0; i < enemyCount; ++i) {
        std::cout << "enemy " << i << ": " << hp[i] << '\\n';
    }
    delete[] hp;                     // [] because we used new[]
}`,
          output: 'enemy 0: 100\nenemy 1: 125\nenemy 2: 150\nenemy 3: 175',
          annotations: [
            { lines: 5, text: 'Allocates room for `enemyCount` ints in one contiguous heap block and returns a pointer to the first. The empty `{}` zero-initializes them; without it they would hold garbage.' },
            { lines: 8, text: '`hp[i]` works on a pointer exactly as on an array — the last lesson of this unit explains why.' },
            { lines: 13, text: '`delete[]` destroys every element and frees the whole block.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Mismatched',
            tone: 'bad',
            code: `int* hp = new int[count];
// ...
delete hp;     // undefined behavior`,
            text: 'Plain `delete` on `new[]` memory (or `delete[]` on `new` memory) is undefined behavior. It may seem to work for `int`s and corrupt the heap for other types.',
          },
          right: {
            title: 'Matched',
            tone: 'good',
            code: `int* hp = new int[count];
// ...
delete[] hp;   // correct`,
            text: '`new` pairs with `delete`, `new[]` pairs with `delete[]`. Always.',
          },
        },
        {
          type: 'deepdive',
          title: 'How does delete[] know how many elements there are?',
          blocks: [
            {
              type: 'p',
              text: 'The pointer itself carries no size. For element types with destructors, the implementation quietly stores the element count in a small hidden header (often called an **array cookie**) just before the first element. `delete[]` reads that header to run every destructor, then frees the block starting at the header.',
            },
            {
              type: 'p',
              text: 'Plain `delete` assumes there is no header: it runs one destructor and hands the allocator an address that is *not* the start of the block. That is why the mismatch can corrupt the heap. For `int`s there may be no cookie, so the bug can hide for years — until someone changes the element type.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'In real code, use std::vector',
          text: '`std::vector<int> hp(enemyCount);` does everything the example does — one contiguous heap block, run-time size — and also remembers its size, can grow, and frees itself. You will almost never write `new[]` in modern C++; it is taught here so you understand what containers do for you, and so you can read older code.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'fill',
      prompt: 'Allocate a run-time-sized array of `float`s on the heap, then free it correctly.',
      template: `float* weights = ___ float[count];
// ... use weights[0] .. weights[count - 1] ...
___ weights;`,
      blanks: [{ answers: ['new'] }, { answers: ['delete[]'] }],
      wordBank: ['new', 'new[]', 'delete', 'delete[]', 'malloc', 'free'],
      explanation:
        'The array form is `new T[count]`, and memory obtained that way must be released with `delete[]`. Plain `delete` would be undefined behavior because it does not match the allocation form. `malloc`/`free` are C functions that know nothing about C++ object construction and must never be mixed with `new`/`delete`.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Memory leaks',
      blocks: [
        {
          type: 'p',
          text: 'A [[memory-leak]] happens when the last pointer to a heap block disappears before the block is freed. The memory stays allocated, but nothing can ever reach it again to `delete` it. Leaks rarely come from forgetting `delete` altogether — they come from **paths** that skip it:',
        },
        {
          type: 'code',
          code: `void loadLevel(int enemyCount, bool corrupt) {
    int* hp = new int[enemyCount]{};
    if (corrupt) {
        return;              // leak: delete[] never runs
    }
    // ... use hp ...
    delete[] hp;
}`,
          annotations: [
            { lines: 2, text: 'The only record of the block\'s address is the local variable `hp`.' },
            { lines: 4, text: 'Returning early pops the frame, destroying `hp` — the pointer — but not the block it pointed to.' },
            { lines: 7, text: 'The cleanup exists, but only on the "happy path". Exceptions (Unit 14) create the same problem invisibly: any function call between `new` and `delete` might throw and skip the `delete`.' },
          ],
        },
        {
          type: 'memory',
          caption: 'After the early return: the frame and its pointer are gone; the block is unreachable forever.',
          regions: [
            {
              label: 'Stack — loadLevel() (popped)',
              kind: 'stack',
              cells: [{ name: 'hp', type: 'int*', value: '(destroyed)', address: '—' }],
            },
            {
              label: 'Heap — leaked block',
              kind: 'heap',
              cells: [
                { type: 'int', value: '0', address: '0x9e20', highlight: true },
                { type: 'int', value: '0', address: '0x9e24', highlight: true },
                { type: 'int', value: '0', address: '0x9e28', highlight: true },
              ],
            },
          ],
        },
        {
          type: 'p',
          text: 'Other common causes: overwriting a pointer that owns memory (`hp = new int[8];` while it still held the only copy of an earlier block), or storing a pointer in a container and clearing the container without deleting what the pointers owned.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Small leaks add up',
          text: 'The OS reclaims everything when a process exits, so a one-off leak in a short tool is harmless. A game leaking 1 KB per frame at 60 fps loses about 210 MB per hour — on a console with a fixed memory budget, that eventually means a crash in the middle of someone\'s boss fight. Servers that run for weeks are even less forgiving.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Finding leaks',
          text: 'Compile with `-fsanitize=address` on GCC or Clang: AddressSanitizer\'s leak checker reports every unfreed block, with the line that allocated it, when the program exits. Valgrind and Visual Studio\'s diagnostic tools do the same. Unreal developers use Memory Insights and the `memreport` console command.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: 'When a raw pointer variable goes out of scope, the heap object it points to is deleted automatically.',
      answer: false,
      explanation:
        'A raw pointer is just a number holding an address. Destroying the pointer destroys that number — nothing more. The heap object is untouched and, if that was the last copy of its address, leaked. Having an object free its memory automatically when it goes out of scope is exactly what smart pointers like `std::unique_ptr` add on top of raw pointers.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Dangling pointers and double delete',
      blocks: [
        {
          type: 'p',
          text: 'The opposite mistake is freeing too **early**. Copies of an address do not know that the block was deleted, so every copy becomes a dangling pointer at the same instant. Using one is a [[use-after-free]]; deleting through one is a [[double-free|double delete]]. Both are undefined behavior.',
        },
        {
          type: 'code',
          code: `int* boss = new int{5000};
int* target = boss;     // second pointer, same block
delete boss;
boss = nullptr;         // boss is safe now...
*target -= 10;          // ...but target dangles: use-after-free
delete target;          // double delete`,
          annotations: [
            { lines: 2, text: 'Copying the pointer does not copy the object. Two pointers now refer to one block.' },
            { lines: 4, text: 'Nulling `boss` protects `boss` only. `target` still holds the old address and has no way to know it is stale.' },
            { lines: 5, text: 'Writes into freed memory. If the allocator already reused the block for another object, this silently corrupts that object.' },
            { lines: 6, text: 'Frees the same block twice, corrupting the allocator\'s bookkeeping. glibc often aborts with "free(): double free detected"; sometimes nothing visible happens until much later.' },
          ],
        },
        {
          type: 'memory',
          caption: 'After line 4: one pointer was cleaned up, its copy was not.',
          regions: [
            {
              label: 'Stack',
              kind: 'stack',
              cells: [
                { name: 'boss', type: 'int*', value: 'nullptr', address: '0xff48' },
                { name: 'target', type: 'int*', value: '0x9e20', address: '0xff40', pointsTo: 'deadBoss', highlight: true },
              ],
            },
            {
              label: 'Heap',
              kind: 'heap',
              cells: [{ id: 'deadBoss', value: '(freed — may be reused)', address: '0x9e20' }],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: '"It works on my machine"',
          text: 'Use-after-free often appears to work: freed memory usually still contains the old bytes until something reuses it. The program then breaks only in release builds, only on some machines, or only after an hour of play — and the crash happens far from the actual bug. Never treat "it didn\'t crash" as evidence that pointer code is correct.',
        },
        {
          type: 'deepdive',
          title: 'Why use-after-free is a security problem',
          blocks: [
            {
              type: 'p',
              text: 'Allocators eagerly reuse freed blocks. If an attacker can make the program allocate an object of their choosing into the freed block, then every write through the dangling pointer modifies the attacker\'s object, and every read leaks it. This is one of the most exploited bug classes in browsers and operating systems: both the Chromium project and Microsoft have reported that roughly 70% of their serious security bugs are memory-safety issues like this.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'bug',
      prompt: 'This program prints the right total, but it has undefined behavior. Tap the faulty line.',
      code: `#include <iostream>

int main() {
    int* loot = new int[3]{50, 10, 75};
    int total = 0;
    for (int i = 0; i < 3; ++i) {
        total += loot[i];
    }
    std::cout << "Loot value: " << total << '\\n';
    delete loot;
}`,
      bugLines: [10],
      hint: 'Look at how the memory was allocated on line 4.',
      explanation:
        'The block came from `new int[3]`, so it must be freed with `delete[] loot;`. Plain `delete` on array memory is undefined behavior: for element types with destructors it runs only one destructor and passes the allocator the wrong address. GCC can warn about some mismatches (`-Wmismatched-new-delete`), but not reliably — and better still, a `std::vector<int>` would have freed itself.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Ownership: who deletes this?',
      blocks: [
        {
          type: 'p',
          text: 'Leaks, dangling pointers and double deletes share one root cause: confusion about [[ownership]]. The **owner** of a heap object is whoever is responsible for deleting it. Correct code needs exactly one owner per object, and that owner must delete it exactly once, on every path, after the last use. The trouble is that a raw pointer type says nothing about ownership:',
        },
        {
          type: 'table',
          headers: ['Declaration', 'Must I delete what I get?'],
          rows: [
            ['`int* findTarget();`', 'Probably not — it likely points at something someone else owns.'],
            ['`int* createWave(int size);`', 'Probably yes — but with `delete` or `delete[]`?'],
            ['`void setTarget(int* t);`', 'Will it keep the pointer? Delete it? Can I delete mine afterwards?'],
          ],
          caption: 'The type is identical in every row; only comments or the implementation can answer.',
        },
        {
          type: 'p',
          text: 'Modern C++ solves this by making ownership part of the **type**. An object that owns a resource frees it in its destructor — a special function that runs automatically when the object goes out of scope (Unit 9). This idiom is called [[raii]]. You have been using RAII types all along: `std::vector` and `std::string` own their heap buffers. For a single heap object there is the [[smart-pointer]] [[unique-ptr|`std::unique_ptr`]]:',
        },
        {
          type: 'code',
          title: 'raii-preview.cpp',
          runnable: true,
          code: `#include <iostream>
#include <memory>
#include <vector>

void loadLevel(int enemyCount, bool corrupt) {
    std::vector<int> hp(enemyCount, 100);     // owns a heap buffer
    auto boss = std::make_unique<int>(5000);  // owns one heap int
    if (corrupt) {
        std::cout << "corrupt level, bailing out\\n";
        return;                               // no leak!
    }
    std::cout << hp.size() << " enemies, boss " << *boss << '\\n';
}   // vector and unique_ptr free their memory here

int main() {
    loadLevel(3, false);
    loadLevel(5, true);
}`,
          output: '3 enemies, boss 5000\ncorrupt level, bailing out',
          annotations: [
            { lines: 6, text: 'The vector allocates its elements on the heap and owns them. No `new[]`, no `delete[]`.' },
            { lines: 7, text: '`std::make_unique<int>(5000)` allocates one `int` and wraps the pointer in a `std::unique_ptr`, which deletes it when it goes out of scope. Dereference it like a raw pointer.' },
            { lines: 10, text: 'The early return that leaked in the earlier example is now harmless: leaving the scope by *any* path runs the cleanup.' },
            { lines: 13, text: 'Same for the normal path, and for exceptions. Cleanup is automatic, exactly once, never early.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why modern C++ says "no naked new"',
          text: 'The C++ Core Guidelines advise avoiding explicit `new` and `delete` in application code. It is not that they are broken; it is that pairing them correctly on every path, through every early return and exception, in code that many people edit for years, is something humans reliably get wrong. Letting a destructor do it turns a discipline into a guarantee. RAII and smart pointers get full lessons in Unit 11.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'You never `new` or `delete` a `UObject`. You create objects with `NewObject<T>()` or `SpawnActor<T>()`, and Unreal\'s garbage collector frees them once nothing references them through tracked pointers (such as `UPROPERTY` members). For plain C++ objects that are not `UObject`s, Unreal provides its own smart pointers: `TUniquePtr`, `TSharedPtr` and `TWeakPtr`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: 'A library declares `int* spawnWave(int size);`. From this declaration alone, what do you know about who must free the returned memory?',
      options: [
        { text: 'The caller must always `delete` it', why: 'Many functions return pointers to memory they still own (a pool, a cache, a static buffer). Deleting those would be a double delete or worse.' },
        { text: 'Nothing — a raw pointer does not express ownership, so you must read the documentation', correct: true, why: 'Exactly. `int*` is the same type whether you own the memory, borrow it, or must free it with `delete[]`.' },
        { text: 'The function will free it automatically when you are done', why: 'The function cannot know when you are done. Nothing tracks raw pointers at run time.' },
        { text: 'Returned pointers are freed when the caller\'s scope ends', why: 'Raw pointers never free anything when destroyed; that behaviour only comes from RAII types like `std::unique_ptr`.' },
      ],
      explanation:
        'Raw pointers make ownership invisible, and invisible responsibilities get dropped. Had the function returned `std::vector<int>` or `std::unique_ptr<int[]>`, the type itself would say "you own this, and it frees itself". That is the core argument for RAII.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'order',
      prompt: 'Order the lines so the program fires one shot, prints the remaining ammo (29), and cleans up safely.',
      lines: ['int* ammo = new int{30};', '*ammo -= 1;', 'std::cout << *ammo << \'\\n\';', 'delete ammo;', 'ammo = nullptr;'],
      distractors: ['delete[] ammo;', 'ammo = new int{29};'],
      explanation:
        'Allocate, use, free, then forget the address. `delete` comes after the last use (otherwise the print would be a use-after-free), and `ammo = nullptr;` comes after `delete` (doing it first would lose the only address and leak the block). `delete[]` does not match a single-object `new`, and allocating a second `int` just to hold 29 would leak the first.',
    },
  ],
  takeaways: [
    '`new` allocates and initializes a heap object and returns its address; `delete` destroys it and frees the memory.',
    'Arrays from `new[]` must be freed with `delete[]`; mismatching the forms is undefined behavior.',
    'A leak is a heap block whose last pointer is gone; early returns and exceptions are the usual culprits.',
    'After `delete`, every copy of the address dangles; using one is a use-after-free, deleting through one is a double delete.',
    'Raw pointers do not express ownership, so the rule "one owner, one delete, every path" is enforced only by discipline.',
    'RAII types — `std::vector`, `std::string`, `std::unique_ptr` — free memory in their destructors, so modern C++ rarely writes `new` or `delete`.',
  ],
  reading: [
    {
      title: 'new expression',
      url: 'https://en.cppreference.com/w/cpp/language/new',
      source: 'cppreference',
      note: 'Everything `new` does, including array forms and allocation failure.',
    },
    {
      title: 'delete expression',
      url: 'https://en.cppreference.com/w/cpp/language/delete',
      source: 'cppreference',
      note: 'Why the operand must match the allocation form exactly.',
    },
    {
      title: 'Dynamic memory allocation with new and delete',
      url: 'https://www.learncpp.com/cpp-tutorial/dynamic-memory-allocation-with-new-and-delete/',
      source: 'learncpp',
      note: 'A beginner-friendly tour of leaks and dangling pointers with more examples.',
    },
    {
      title: 'C++ Core Guidelines: Resource management',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-resource',
      source: 'core-guidelines',
      note: 'The rules behind "no naked new" and RAII — skim the R.1 to R.11 summaries.',
    },
  ],
};
