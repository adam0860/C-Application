import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-memory-model',
  title: 'Stack, Heap and Addresses',
  summary: 'Where your variables actually live: numbered bytes, the stack, the heap, static storage, addresses and alignment.',
  minutes: 18,
  objectives: [
    'Picture memory as a long row of numbered bytes and explain what an address is',
    'Distinguish automatic (stack), dynamic (heap) and static storage, and say when each is used',
    'Explain how stack frames are pushed and popped, and why the stack is fast but small',
    'Use the address-of operator `&` and explain why printed addresses change between runs',
    'Use `sizeof` and `alignof`, and explain why the compiler inserts padding',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Memory is a long row of numbered bytes',
      blocks: [
        {
          type: 'p',
          text: 'Every variable you have written so far lives somewhere in your computer\'s memory (RAM). To understand pointers — the big topic of this unit — you first need a clear mental picture of what "somewhere" means. Fortunately the picture is simple.',
        },
        {
          type: 'p',
          text: 'From your program\'s point of view, memory is one enormous row of **bytes** (8 bits each). Each byte has a number, called its [[memory-address|address]], just like houses on a very long street. A byte is the smallest unit that has its own address. An object bigger than one byte, such as a 4-byte `int`, occupies several **consecutive** bytes, and the address of the object is the address of its **first** byte.',
        },
        {
          type: 'memory',
          caption: 'Three local variables in memory (addresses are illustrative). The int spans four bytes, the double eight.',
          regions: [
            {
              label: 'A tiny slice of memory',
              kind: 'other',
              cells: [
                { name: 'score', type: 'int', value: '1250', address: '0x1000–0x1003', highlight: true },
                { name: 'grade', type: 'char', value: "'A'", address: '0x1004' },
                { name: '', value: '(unused)', address: '0x1005–0x1007' },
                { name: 'speed', type: 'double', value: '4.5', address: '0x1008–0x100F' },
              ],
            },
          ],
        },
        {
          type: 'p',
          text: 'Notice the three unused bytes after `grade`. That gap is not a mistake; by the end of this lesson you will know exactly why the compiler left it there.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A street of mailboxes',
          text: 'Think of memory as a street where every mailbox holds one byte and has a house number painted on it. A variable is a family that rents one or more neighbouring mailboxes. Its name (`score`) is what *you* call it; its address (`0x1000`) is what the *postman* — the CPU — uses.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why addresses matter: the CPU never sees your names',
          text: 'Variable names exist only in your source code. When the [[compiler]] translates your program, every name becomes either a CPU register or an address (often "the stack pointer plus 12 bytes"). The hardware only knows how to say "load 4 bytes from address X" or "store 4 bytes at address Y". C++ is a systems language, so it lets *you* work with addresses directly too — which is exactly what pointers do.',
        },
        {
          type: 'deepdive',
          title: 'Virtual memory: every program gets its own street',
          blocks: [
            {
              type: 'p',
              text: 'The addresses your program sees are **virtual** addresses. The operating system and the CPU\'s memory-management unit translate them, page by page (typically 4 KiB pages), into physical RAM locations. Each process gets its own private address space, so two programs can both use address `0x7ffd1000` without ever touching each other\'s data.',
            },
            {
              type: 'p',
              text: 'This is also why touching an address your process has not been given causes a crash instead of corrupting another program: the hardware finds no mapping for that page and the OS stops your program.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'A 4-byte `int` named `ammo` is stored starting at address `0x2000`. Which statement is true?',
      options: [
        {
          text: '`ammo` occupies bytes `0x2000` to `0x2003`, and its address is `0x2000`',
          correct: true,
          why: 'An object occupies consecutive bytes, and its address is the address of its first byte.',
        },
        {
          text: '`ammo` occupies bytes `0x2000` to `0x2003`, and its address is `0x2003`',
          why: 'The address of an object is always the address of its *first* (lowest) byte, not its last.',
        },
        {
          text: '`ammo` occupies only the byte at `0x2000`, because an address names one variable',
          why: 'An address names one *byte*. A 4-byte `int` needs four bytes, so it covers four addresses.',
        },
        {
          text: 'Another variable could start at `0x2001`, since `ammo` only "starts" at `0x2000`',
          why: 'Bytes `0x2001`–`0x2003` belong to `ammo`. Two live objects never share bytes (except for special cases like a member inside its enclosing object).',
        },
      ],
      explanation:
        'Memory is addressed byte by byte. A multi-byte object takes a run of neighbouring bytes, and we refer to it by the address of the first one. The type (`int`, 4 bytes here) tells the compiler how many bytes to read or write starting from that address.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Three kinds of storage',
      blocks: [
        {
          type: 'p',
          text: 'Not all objects live for the same amount of time, so C++ stores them in different places. The standard calls this an object\'s [[storage-duration]]. You will mostly hear the everyday names: the **stack**, the **heap**, and **static storage**.',
        },
        {
          type: 'table',
          headers: ['Storage', 'Everyday name', 'Created', 'Destroyed', 'Example'],
          rows: [
            ['Automatic', '[[stack-memory|Stack]]', 'When execution reaches the declaration', 'Automatically, when the enclosing scope ends', 'Local variables, parameters'],
            ['Dynamic', '[[heap-memory|Heap]] (free store)', 'When you ask with `new`', 'Only when you say so with `delete`', 'Objects whose lifetime or size is decided at run time'],
            ['Static', 'Static / global data', 'Before `main` (or on first use, for `static` locals)', 'After `main` returns', '[[global-variable|Globals]], [[static-local|static locals]]'],
          ],
        },
        {
          type: 'code',
          title: 'storage.cpp',
          code: `int g_highScore = 9001;        // static storage

int main() {
    int lives = 3;              // automatic: on the stack
    int* boss = new int{500};   // the int lives on the heap
    // ... play the level ...
    delete boss;                // heap memory must be returned
}                               // lives and boss vanish here`,
          annotations: [
            { lines: 1, text: 'A global exists for the whole run of the program. Its storage is reserved in the executable\'s data section before `main` even starts.' },
            { lines: 4, text: '`lives` is created when execution reaches this line and destroyed automatically at the closing brace of `main`.' },
            { lines: 5, text: 'A preview of the next lessons: `new` creates an unnamed `int` on the heap and gives back its address, which we store in `boss` (a [[pointer]] — itself an ordinary local on the stack).' },
            { lines: 7, text: 'Heap objects never clean themselves up. You will learn all about `new` and `delete` — and why modern C++ rarely writes them by hand — later in this unit.' },
          ],
        },
        {
          type: 'memory',
          caption: 'The program above just before `delete boss`. Addresses are made up, but follow a typical layout: static data low, the heap above it, the stack near the top.',
          regions: [
            {
              label: 'Static storage',
              kind: 'static',
              cells: [{ name: 'g_highScore', type: 'int', value: '9001', address: '0x4010' }],
            },
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'lives', type: 'int', value: '3', address: '0xff4c' },
                { name: 'boss', type: 'int*', value: '0x9e20', address: '0xff40', pointsTo: 'bossHp' },
              ],
            },
            {
              label: 'Heap',
              kind: 'heap',
              cells: [{ id: 'bossHp', type: 'int', value: '500', address: '0x9e20' }],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why three kinds instead of one?',
          text: 'Each serves a different lifetime. Most objects only need to live while a function runs, and tying them to scope makes their cleanup **free and automatic** — that is the stack. Some objects must outlive the function that made them, or have a size only known at run time — that is the heap. A few must exist for the whole program — that is static storage. Languages that put everything on a garbage-collected heap pay for that convenience with allocation cost and collection pauses.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: '"Stack" and "heap" are nicknames',
          text: 'The C++ standard never says "stack" or "heap"; it talks about automatic, dynamic and static storage duration. Real implementations do use a hardware stack and a heap allocator, so the nicknames are universal — just remember they describe *how* compilers implement the rules, not the rules themselves.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'The stack: frames that push and pop',
      blocks: [
        {
          type: 'p',
          text: 'You met the [[call-stack]] when you learned about functions and recursion. Now let\'s look at it as memory. Each time a function is called, a block called a [[stack-frame]] is pushed on top of the stack. It holds that call\'s local variables, often its parameters, and the return address (where to continue when the call ends). When the function returns, its frame is popped. Last in, first out — **LIFO**.',
        },
        {
          type: 'code',
          title: 'frames.cpp',
          runnable: true,
          code: `#include <iostream>

void descend(int level) {
    int localCopy = level * 10;     // lives in THIS call's frame
    if (level < 3) {
        descend(level + 1);         // push a new frame on top
    }
    std::cout << "frame " << level << " sees "
              << localCopy << '\\n';
}                                   // this frame is popped here

int main() {
    descend(1);
}`,
          output: 'frame 3 sees 30\nframe 2 sees 20\nframe 1 sees 10',
          annotations: [
            { lines: 4, text: 'Every call gets its **own** `localCopy` in its own frame. Three calls means three separate variables with the same name.' },
            { lines: '5-7', text: 'The first two calls push another frame before printing anything, so three frames are stacked up at the deepest point.' },
            { lines: '8-9', text: 'Printing happens as the calls return. The last frame pushed (level 3) finishes first — that is LIFO in action.' },
            { lines: 10, text: 'Popping a frame costs almost nothing: the CPU simply moves the stack pointer back.' },
          ],
        },
        {
          type: 'memory',
          caption: 'At the deepest point. On most platforms the stack grows toward lower addresses, so newer frames sit lower.',
          regions: [
            {
              label: 'Stack — descend(3)  ← top, running now',
              kind: 'stack',
              cells: [
                { name: 'level', type: 'int', value: '3', address: '0xff14' },
                { name: 'localCopy', type: 'int', value: '30', address: '0xff10', highlight: true },
              ],
            },
            {
              label: 'Stack — descend(2)',
              kind: 'stack',
              cells: [
                { name: 'level', type: 'int', value: '2', address: '0xff34' },
                { name: 'localCopy', type: 'int', value: '20', address: '0xff30' },
              ],
            },
            {
              label: 'Stack — descend(1)',
              kind: 'stack',
              cells: [
                { name: 'level', type: 'int', value: '1', address: '0xff54' },
                { name: 'localCopy', type: 'int', value: '10', address: '0xff50' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the stack is so fast',
          text: 'The operating system reserves each thread\'s stack once, up front. After that, "allocating" a whole frame is a single instruction that subtracts the frame size from the **stack pointer** register, and freeing it adds the size back. There is no searching for free space and no bookkeeping. The top of the stack is also almost always in the CPU cache, because it was used moments ago.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The stack is small',
          text: 'A thread\'s stack has a fixed size — typically **1 MB** on Windows and **8 MB** on Linux and macOS for the main thread, and often less for other threads. Huge local arrays or runaway recursion exceed it and cause a [[stack-overflow]], which crashes the program. Large or variable-sized data belongs on the heap — for example inside a `std::vector`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'order',
      prompt: '`main` calls `loadLevel`, which calls `spawnEnemy`. Put the stack events in the order they happen.',
      lines: [
        'main()\'s frame is pushed',
        'loadLevel()\'s frame is pushed on top',
        'spawnEnemy()\'s frame is pushed on top',
        'spawnEnemy() returns and its frame is popped',
        'loadLevel() returns and its frame is popped',
      ],
      distractors: ['main()\'s frame is popped before loadLevel()\'s frame'],
      linesAreCode: false,
      explanation:
        'The stack is last-in, first-out: the most recently called function is always the one running, and it must finish (pop its frame) before its caller can continue. `main` is pushed first and popped last, which is why its locals stay valid for the whole program while it runs.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'Each time a function is called, the program asks the operating system for fresh memory to hold that function\'s local variables.',
      answer: false,
      explanation:
        'The stack region is reserved once when the thread starts. A function call just moves the stack pointer down by the size of its frame, and a return moves it back up — no operating-system call, no allocator. That is why local variables are essentially free to create, and why games keep hot per-frame data on the stack whenever they can.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'The heap and static storage',
      blocks: [
        {
          type: 'p',
          text: 'The **heap** is a large pool of memory managed by an allocator. You ask for a block of any size at run time, and you get back the address of that block. The block stays allocated until you explicitly give it back. Heap objects have **no name** — the only way to reach one is through its address.',
        },
        {
          type: 'list',
          items: [
            '**Size unknown at compile time** — a level file says it contains 3,000 enemies.',
            '**Lifetime longer than a function** — a loader creates the level, then returns; the level must survive.',
            '**Too big for the stack** — a 64 MB lightmap would overflow any stack.',
          ],
        },
        {
          type: 'p',
          text: 'You have already been using the heap without noticing. A [[std-vector]] object itself is small (typically three pointers, 24 bytes) and can sit on the stack, but the elements it manages live in a heap buffer. That is how a vector can grow: it allocates a bigger buffer and moves its elements over.',
        },
        {
          type: 'memory',
          caption: '`std::vector<int> scores{10, 20, 30};` after a `reserve(4)`: the vector object is on the stack, its elements on the heap.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [{ name: 'scores', type: 'std::vector<int>', value: 'data · size 3 · cap 4', address: '0xff30', pointsTo: 'buf0' }],
            },
            {
              label: 'Heap',
              kind: 'heap',
              cells: [
                { id: 'buf0', type: 'int', value: '10', address: '0x9e20' },
                { type: 'int', value: '20', address: '0x9e24' },
                { type: 'int', value: '30', address: '0x9e28' },
                { value: '(spare capacity)', address: '0x9e2c' },
              ],
            },
          ],
        },
        {
          type: 'p',
          text: '**Static storage** holds globals, `static` local variables and (later) `static` class members. Its size is fixed when the program is built, and its objects live from before `main` starts until after it ends. String literals like `"Game Over"` live here too.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Heap allocation has a cost',
          text: 'The allocator has to find a free block of the right size, record it, and (in multithreaded programs) synchronize with other threads. Freed blocks leave holes that can fragment memory over a long session. That is why game code avoids allocating in per-frame hot paths, reuses buffers, and uses pools.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Almost every gameplay object — actors, components, assets — lives on the heap. You create them with engine functions such as `SpawnActor` and `NewObject`, and Unreal\'s garbage collector frees them when nothing references them anymore. That is why Unreal code is full of pointers like `AActor*`. Unreal also routes allocations through its own allocator (`FMalloc`, with binned allocators tuned for games) instead of the default system heap.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'A level loader reads the number of enemies from a file, builds their data, and returns. The data must stay alive after the loader function returns. Where should the enemy data live?',
      options: [
        {
          text: 'On the stack, as a local array inside the loader',
          why: 'The loader\'s frame is popped when it returns, destroying everything in it. Also, the stack is small and a local C array needs a size known at compile time.',
        },
        {
          text: 'On the heap, for example inside a `std::vector` that is returned to the caller',
          correct: true,
          why: 'The heap is for data whose size is decided at run time and whose lifetime is not tied to one function call. A `std::vector` manages that heap memory for you.',
        },
        {
          text: 'In static storage, as a global array',
          why: 'A global array needs a size fixed at compile time, so you would have to guess a maximum. It also exists for the whole program, even when no level is loaded.',
        },
        {
          text: 'In CPU registers, because they are fastest',
          why: 'Registers hold a handful of values for a few instructions. The compiler decides what goes in them; you cannot store a list of enemies there.',
        },
      ],
      explanation:
        'Two requirements point to the heap: the amount of data is only known at run time, and it must outlive the function that created it. Stack objects die with their frame, and static storage has a fixed, compile-time size. In modern C++ you rarely touch the heap directly — containers like `std::vector` do it for you.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Taking an address with &',
      blocks: [
        {
          type: 'p',
          text: 'The unary [[address-of-operator|address-of operator]] `&` gives you the address of an object. Put it in front of a variable and you get a number — the address of the variable\'s first byte. Sending an address to `std::cout` prints it in hexadecimal.',
        },
        {
          type: 'code',
          title: 'addresses.cpp',
          code: `#include <iostream>

int main() {
    int health = 100;
    double speed = 4.5;
    char grade = 'A';

    std::cout << "health is at " << &health << '\\n';
    std::cout << "speed is at  " << &speed << '\\n';
    std::cout << "grade is at  "
              << static_cast<const void*>(&grade) << '\\n';
}`,
          annotations: [
            { lines: 8, text: '`&health` is the address of `health`. Its type is `int*` — "pointer to int" — which the next lesson is all about.' },
            { lines: '10-11', text: 'A `char*` is treated by `std::cout` as a C-style string, so `&grade` alone would print the character and then garbage until it found a zero byte. Converting to `const void*` (an address with no type) prints the address itself.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Two runs on the same machine — yours will differ',
          code: `health is at 0x7ffd3c9a1b4c
speed is at  0x7ffd3c9a1b50
grade is at  0x7ffd3c9a1b4b

health is at 0x7ffe81e2f0ac
speed is at  0x7ffe81e2f0b0
grade is at  0x7ffe81e2f0ab`,
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why do addresses change every run?',
          text: 'Modern operating systems use [[aslr]]: they place the stack, heap and code at random offsets each time a program starts. If attackers cannot predict where things live, many memory-corruption exploits stop working. That is why examples in this course never show printed addresses as fixed output — and why your code must never depend on a particular address value or on how the compiler arranges locals.',
        },
        {
          type: 'table',
          headers: ['Where `&` appears', 'Meaning', 'Example'],
          rows: [
            ['Before an expression (unary)', 'Address-of: "where is this object?"', '`&health`'],
            ['In a type, after the type name', 'Reference (later in this unit)', '`int& ref = health;`'],
            ['Between two operands (binary)', 'Bitwise AND', '`flags & 0x4`'],
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Only objects have addresses',
          text: '`&health` works because `health` is an object with a location (an [[lvalue]]). `&42` or `&(health + 1)` do not compile: a literal or the result of an arithmetic expression is a temporary value with no address you are allowed to take.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'fill',
      prompt: 'Complete the code so it prints where `ammo` lives and how many bytes it occupies.',
      template: `int ammo = 30;
std::cout << "ammo is at " << ___ammo << '\\n';
std::cout << "it uses " << ___(ammo) << " bytes\\n";`,
      blanks: [{ answers: ['&'] }, { answers: ['sizeof'] }],
      wordBank: ['&', '*', 'sizeof', 'size', 'length', '->'],
      explanation:
        'Unary `&` yields the address of an object, and `sizeof` yields its size in bytes (computed at compile time, so it costs nothing at run time). `*` does the opposite of `&` — it follows an address to the object, as the next lesson shows. `size` and `length` are member functions of containers like `std::string`, not operators that work on any object.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'sizeof, alignment and padding',
      blocks: [
        {
          type: 'p',
          text: '[[sizeof]] tells you how many bytes a type or object occupies. Only `char` is guaranteed to be exactly 1; the other sizes are [[implementation-defined|implementation-defined]], but every mainstream 64-bit desktop and console platform agrees on the values below.',
        },
        {
          type: 'p',
          text: 'There is a second, less famous property: [[memory-alignment|alignment]]. Each type wants to start at an address that is a multiple of its alignment — typically its own size for fundamental types. `alignof` reports it. To keep every member aligned, the compiler inserts invisible **padding** bytes. A `struct` (which you will build properly in Unit 9) simply bundles several variables into one object, which makes padding easy to see:',
        },
        {
          type: 'code',
          title: 'layout.cpp',
          runnable: true,
          code: `#include <iostream>

struct Loose {
    char tag;      // 1 byte
    int damage;    // 4 bytes, wants a multiple-of-4 address
    char rarity;   // 1 byte
};

struct Tight {
    int damage;
    char tag;
    char rarity;
};

int main() {
    std::cout << "char:   " << sizeof(char) << '\\n';
    std::cout << "int:    " << sizeof(int)
              << ", align " << alignof(int) << '\\n';
    std::cout << "double: " << sizeof(double)
              << ", align " << alignof(double) << '\\n';
    std::cout << "int*:   " << sizeof(int*) << '\\n';
    std::cout << "Loose:  " << sizeof(Loose) << '\\n';
    std::cout << "Tight:  " << sizeof(Tight) << '\\n';
}`,
          output: 'char:   1\nint:    4, align 4\ndouble: 8, align 8\nint*:   8\nLoose:  12\nTight:  8',
          annotations: [
            { lines: '3-7', text: 'Six bytes of data — yet `Loose` is 12 bytes. Three padding bytes follow `tag` so `damage` starts on a multiple of 4, and three more follow `rarity`.' },
            { lines: '9-13', text: 'The same members, largest first: `damage` at offset 0, `tag` at 4, `rarity` at 5, and only two bytes of trailing padding. Total: 8.' },
            { lines: 21, text: 'A pointer holds an address, so its size depends on the platform\'s address width: 8 bytes on 64-bit systems, 4 on 32-bit ones.' },
          ],
        },
        {
          type: 'memory',
          caption: 'The 12 bytes of a `Loose` object, by offset from its start.',
          regions: [
            {
              label: 'Loose (12 bytes)',
              kind: 'other',
              cells: [
                { name: 'tag', type: 'char', value: "'R'", address: '+0' },
                { value: 'padding', address: '+1 … +3' },
                { name: 'damage', type: 'int', value: '45', address: '+4 … +7', highlight: true },
                { name: 'rarity', type: 'char', value: '2', address: '+8' },
                { value: 'padding', address: '+9 … +11' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why alignment exists',
          text: 'Memory hardware moves data in aligned chunks — cache lines are typically 64 bytes. An `int` at an address that is a multiple of 4 always sits inside one chunk; a misaligned one could straddle two chunks and need two fetches, and some CPUs refuse misaligned access outright. The trailing padding exists so that in an **array** of `Loose`, every element (and therefore every `damage`) is aligned too.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Order members from largest to smallest',
          text: 'Reordering members never changes behaviour, but it can shrink an object. For one object a few bytes are irrelevant; for an array of 100,000 particles, shrinking each from 12 to 8 bytes saves 400 KB and fits more particles into each cache line, which makes loops over them faster.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Unreal classes often pack many flags as **bitfields** — `uint8 bIsActive : 1;` — so that eight booleans share a single byte instead of taking eight. You will see this pattern throughout engine headers such as `AActor`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'On a typical 64-bit platform (`char` is 1 byte, `double` is 8 bytes with alignment 8), what is `sizeof(Pickup)`?',
      code: `struct Pickup {
    char kind;
    double value;
    char flags;
};`,
      options: [
        { text: '10', why: 'That is just the sum of the members (1 + 8 + 1). It ignores the padding needed to align `value` and the trailing padding.' },
        { text: '17', why: 'This accounts for the 7 padding bytes before `value` but forgets the trailing padding that keeps array elements aligned.' },
        { text: '16', why: 'Close, but `flags` lands at offset 16, so the object is at least 17 bytes before rounding up.' },
        { text: '24', correct: true, why: '`kind` at 0, 7 bytes of padding, `value` at 8–15, `flags` at 16, then 7 bytes of trailing padding to reach a multiple of 8.' },
      ],
      explanation:
        'The compiler places `value` at the next multiple of 8 (offset 8), and then rounds the whole size up to a multiple of the largest alignment (8) so that consecutive `Pickup`s in an array keep `value` aligned. Reordering to `double value; char kind; char flags;` would bring it down to 16.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'bug',
      prompt: 'This program compiles, but on typical systems it crashes as soon as `bakeLighting` runs. Tap the line responsible.',
      code: `#include <iostream>

void bakeLighting() {
    float lightmap[4096][4096];
    lightmap[0][0] = 1.0f;
    std::cout << lightmap[0][0] << '\\n';
}

int main() {
    bakeLighting();
}`,
      bugLines: [4],
      hint: 'Multiply it out: how many bytes is that local array?',
      explanation:
        '4096 × 4096 floats × 4 bytes = 64 MiB, far larger than a typical 1–8 MB stack. Creating the frame runs past the end of the stack and the program dies with a [[stack-overflow]]. Large or run-time-sized buffers belong on the heap: `std::vector<float> lightmap(4096 * 4096);` keeps only a small vector object on the stack and puts the 64 MiB of floats on the heap.',
    },
  ],
  takeaways: [
    'Memory is a row of numbered bytes; an object occupies consecutive bytes, and its address is the address of its first byte.',
    'Automatic (stack) objects die at the end of their scope, dynamic (heap) objects live until you free them, and static objects live for the whole program.',
    'Function calls push stack frames and returns pop them (LIFO); this makes the stack extremely fast but small, so big data belongs on the heap.',
    'Unary `&` gives an object\'s address; printed addresses change between runs (ASLR), so never rely on specific values or local layout.',
    '`sizeof` gives a size in bytes; alignment requirements make the compiler insert padding, which member order can reduce.',
  ],
  reading: [
    {
      title: 'Storage class specifiers and storage duration',
      url: 'https://en.cppreference.com/w/cpp/language/storage_duration',
      source: 'cppreference',
      note: 'The precise rules for automatic, static, thread and dynamic storage duration.',
    },
    {
      title: 'The stack and the heap',
      url: 'https://www.learncpp.com/cpp-tutorial/the-stack-and-the-heap/',
      source: 'learncpp',
      note: 'A beginner-friendly walkthrough of the call stack, stack overflow and heap allocation.',
    },
    {
      title: 'Object — alignment',
      url: 'https://en.cppreference.com/w/cpp/language/object',
      source: 'cppreference',
      note: 'See the "Alignment" section for how size, alignment and padding are defined.',
    },
    {
      title: 'sizeof operator',
      url: 'https://en.cppreference.com/w/cpp/language/sizeof',
      source: 'cppreference',
      note: 'What `sizeof` measures, including the surprising cases for references and arrays.',
    },
  ],
};
