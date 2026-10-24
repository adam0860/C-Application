import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-variables',
  title: 'Variables and Objects in Memory',
  summary: 'What a variable really is — a named, typed region of memory — and why reading one before giving it a value is a serious bug.',
  minutes: 15,
  objectives: [
    'Explain what an object and a variable are in C++ terms: typed regions of memory',
    'Declare variables and explain why a declaration must come before any use',
    'Distinguish initialization from assignment, even when both use `=`',
    'Trace how assignment reads, computes and overwrites values, using memory diagrams',
    'Explain why reading an uninitialized variable is undefined behavior and how to avoid it',
    'Describe how the optimizer may keep variables in registers or remove them entirely',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'What a variable really is',
      blocks: [
        {
          type: 'p',
          text: 'Your computer\'s memory is, conceptually, one enormous row of numbered boxes, each holding one **byte** (8 bits). The number of a box is its [[memory-address|address]]. Every piece of data your program works with — a player\'s health, a score, a position — lives in some run of these bytes.',
        },
        {
          type: 'p',
          text: 'In C++, a region of memory that holds a value of a particular [[type]] is called an [[object]]. A [[variable]] is an object with a **name**, so you can refer to it in your code. When you write `int health = 100;`, you ask the compiler to set aside enough bytes for an `int` (4 on every mainstream platform), remember that they are called `health`, and store the value 100 in them.',
        },
        {
          type: 'memory',
          caption: 'Three variables in memory. Addresses are illustrative; each int occupies 4 bytes.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'health', type: 'int', value: '100', address: '0x1000' },
                { name: 'ammo', type: 'int', value: '30', address: '0x1004' },
                { name: 'level', type: 'int', value: '7', address: '0x1008' },
              ],
            },
          ],
        },
        {
          type: 'definition',
          term: 'Object (in C++)',
          text: 'A region of storage with a type, a size, a lifetime and a value. In C++ an `int` is an object just as much as an `Enemy` is — the word has nothing to do with object-oriented programming here.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does every object need a type?',
          text: 'Memory only holds bits. The byte `01000001` could be the number 65 or the letter `A`; four bytes could be a whole number or a decimal number. The type tells the compiler **how many bytes** to reserve, **how to interpret** the bits, and **which machine instructions** to use — integer addition and floating-point addition are different instructions. Because C++ fixes every type at compile time, mistakes like adding a name to a score are caught before the game ever runs.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Labelled boxes in a warehouse',
          text: 'A variable is a labelled box on a shelf. The label is the name, the box\'s size and shape are the type, its position on the shelf is the address, and whatever is inside is the value. You can swap what is inside as often as you like, but the label, size and position stay fixed.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Declaring variables',
      blocks: [
        {
          type: 'p',
          text: 'A **declaration** introduces a name and its type. The basic form is the type, then the name, then (ideally) an initial value:',
        },
        {
          type: 'code',
          title: 'stats.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int level = 1;
    double moveSpeed = 4.5;
    bool hasShield = true;
    char rank = 'S';

    std::cout << "Level " << level << ", speed " << moveSpeed
              << ", rank " << rank << '\\n';
    std::cout << "Shield: " << hasShield << '\\n';
}`,
          output: 'Level 1, speed 4.5, rank S\nShield: 1',
          annotations: [
            { lines: 4, text: '`int`: a whole number. Type first, then name, then the starting value.' },
            { lines: 5, text: '`double`: a number with a fractional part.' },
            { lines: 6, text: '`bool`: `true` or `false`.' },
            { lines: 7, text: '`char`: a single character, written in single quotes.' },
            { lines: 11, text: '`std::cout` prints a `bool` as `1` or `0` by default. (Unit 4 shows how to print `true`/`false` instead.)' },
          ],
        },
        {
          type: 'p',
          text: 'These are a preview — the next lesson covers each type, its size and its limits. For now, focus on the shape: **type, name, initial value, semicolon**.',
        },
        {
          type: 'list',
          items: [
            '**Declare before use.** The compiler reads each file top to bottom; using a name before its declaration is a compile error ("was not declared in this scope").',
            '**Declare close to first use.** In modern C++, create a variable where you first need it, not in a list at the top of the function. Readers see its type and value right where it matters.',
            '**One variable per declaration.** `int x = 1, y = 2;` is legal, but separate lines are easier to read and avoid surprises you will meet with pointers.',
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Why old code declares everything at the top',
          text: 'Early C required all variables to be declared at the start of a block, before any other statements. C++ never had that rule, and C dropped it in 1999, but you will still see the habit in old code bases. Declaring late keeps each variable\'s scope small and usually lets you give it a meaningful initial value.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'In C++ terminology, which of these is an **object**?',
      options: [
        {
          text: 'Only an instance of a class, such as an `Enemy` — never an `int`',
          why: 'That is the object-oriented meaning of the word. In the C++ standard, any typed region of storage is an object, including a plain `int`.',
        },
        {
          text: 'The `int` that `int ammo = 30;` creates',
          correct: true,
          why: 'Yes. It is a region of storage (4 bytes) with a type (`int`) and a value (30). Because it has a name, it is also a variable.',
        },
        {
          text: 'The keyword `int` itself',
          why: '`int` is a type, a description of how to store and interpret data. An object is a region of memory that *has* a type.',
        },
        {
          text: 'The line `int ammo = 30;`',
          why: 'That line is a declaration statement — source code. The object is what it creates in memory when the program runs.',
        },
      ],
      explanation:
        'C++ uses "object" in a precise, low-level sense: a region of storage with a type, size, lifetime and value. A variable is a named object. Keeping that picture in mind — a variable is a box of bytes with a type — explains copying, references, pointers and almost everything else in the coming units.',
    },
    {
      kind: 'concept',
      title: 'Initialization vs assignment',
      blocks: [
        {
          type: 'p',
          text: 'There are two different ways a variable gets a value, and C++ treats them as different operations — even though both are often written with `=`.',
        },
        {
          type: 'compare',
          left: {
            title: 'Initialization',
            tone: 'neutral',
            code: 'int health = 100;',
            text: 'Gives the object its **first** value at the moment it is created. Part of the declaration.',
          },
          right: {
            title: 'Assignment',
            tone: 'neutral',
            code: 'health = 80;',
            text: '**Replaces** the value of an object that already exists. A separate statement; the old value is gone.',
          },
        },
        {
          type: 'code',
          code: `int health = 100;     // initialization: born holding 100
health = 80;          // assignment: overwrite 100 with 80
health = health - 30; // assignment: read 80, compute 50, store`,
          annotations: [
            { lines: 1, text: 'The `=` here is part of the declaration syntax. No "assignment" happens — the object never exists without a value.' },
            { lines: 2, text: 'An assignment expression. The 100 that was there is overwritten; nothing remembers it.' },
            { lines: 3, text: 'The right-hand side is evaluated first, using the *current* value, then the result is stored.' },
          ],
        },
        {
          type: 'memory',
          caption: 'The same object over time: its address and type never change, only its value.',
          regions: [
            { label: 'After line 1', kind: 'stack', cells: [{ name: 'health', type: 'int', value: '100', address: '0x1000' }] },
            { label: 'After line 2', kind: 'stack', cells: [{ name: 'health', type: 'int', value: '80', address: '0x1000', highlight: true }] },
            { label: 'After line 3', kind: 'stack', cells: [{ name: 'health', type: 'int', value: '50', address: '0x1000', highlight: true }] },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the distinction matters',
          text: 'Some things can be initialized but never assigned: a `const` variable (two lessons from now) must get its value at creation and can never change. For the class types you will write later, initialization and assignment even run different code. And the most important reason: an object that is *initialized* never exists in an undefined state, which rules out an entire category of bugs — as you are about to see.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'In the declaration `int lives = 3;`, the `=` performs an assignment.',
      answer: false,
      explanation:
        'When `=` appears in a declaration, it introduces the **initializer**: `lives` is created already holding 3, and no assignment takes place. Assignment only happens to an object that already exists, as in a later statement `lives = 2;`. The difference sounds academic now, but it decides what `const` allows and, for class types, which special functions run.',
    },
    {
      kind: 'concept',
      title: 'How assignment works',
      blocks: [
        {
          type: 'p',
          text: 'In C++, `=` means "store", not "is equal to" — so `coins = coins + 5;` is not a contradictory equation. The program evaluates the right-hand side using the **current** values, then writes the result into the object on the left.',
        },
        {
          type: 'code',
          title: 'coins.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int coins = 10;
    coins = coins + 5;
    coins = coins * 2;
    int saved = coins;
    coins = 0;
    std::cout << coins << ' ' << saved << '\\n';
}`,
          output: '0 30',
          annotations: [
            { lines: 5, text: 'Read 10, add 5, store 15.' },
            { lines: 6, text: 'Read 15, double it, store 30.' },
            { lines: 7, text: '`saved` is a brand-new object initialized with a **copy** of the value 30. It is not linked to `coins` in any way.' },
            { lines: 8, text: 'Changing `coins` has no effect on `saved`: two objects, two separate regions of memory.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Line 7 copies the value; after line 8 the two objects hold different values.',
          regions: [
            {
              label: 'After line 7',
              kind: 'stack',
              cells: [
                { name: 'coins', type: 'int', value: '30', address: '0x1000' },
                { name: 'saved', type: 'int', value: '30', address: '0x1004', highlight: true },
              ],
            },
            {
              label: 'After line 8',
              kind: 'stack',
              cells: [
                { name: 'coins', type: 'int', value: '0', address: '0x1000', highlight: true },
                { name: 'saved', type: 'int', value: '30', address: '0x1004' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Value semantics',
          text: 'Copying an `int` copies the bytes, and the copies are independent. C++ applies this **value semantics** to most types, including the ones you will define yourself. In languages like Python, Java or C#, assigning an object usually copies a *reference* to the same object instead. Later you will learn C++\'s own references and pointers, which share an object on purpose — but the default is always a copy.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Compound assignment',
          text: '`coins = coins + 5;` is so common that C++ has a shorthand: `coins += 5;`. There are matching forms for other operators (`-=`, `*=`, `/=`). Unit 3 covers them.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>

int main() {
    int score = 10;
    int best = score;
    score = 25;
    std::cout << score << ' ' << best << '\\n';
}`,
      options: [
        { text: '25 25', why: '`best` is not tied to `score`. Line 5 copied the value 10 into a separate object; changing `score` afterwards does not reach it.' },
        { text: '10 10', why: 'Line 6 really does change `score` to 25 — assignment overwrites the old value.' },
        { text: '25 10', correct: true, why: 'Correct. `best` got its own copy of 10, and only `score` was then overwritten with 25.' },
        { text: '10 25', why: 'The order is reversed: `score` is printed first, and it is the one that changed.' },
      ],
      explanation:
        'Initializing `best` from `score` copies the value at that moment. From then on the two are independent objects in different memory locations. If you come from a language where assignment shares objects, this is worth internalizing now: in C++, the default is a copy.',
    },
    {
      kind: 'order',
      prompt: '`first` holds 10 and `second` holds 20. Arrange the lines to swap their values.',
      lines: ['int temp = first;', 'first = second;', 'second = temp;'],
      distractors: ['second = first;'],
      explanation:
        'Assignment overwrites, so writing `first = second;` first would destroy 10 forever. The temporary keeps a copy of the original `first` before it is overwritten, then hands it to `second`. The distractor `second = first;` would copy the *new* value of `first` (20), leaving both at 20. (The standard library offers `std::swap` for this, but the idea underneath is exactly the same.)',
    },
    {
      kind: 'concept',
      title: 'Uninitialized variables',
      blocks: [
        {
          type: 'p',
          text: 'You may declare a local variable without giving it a value: `int kills;`. This is called [[default-initialization]], and for basic types like `int` it does **nothing at all**. The variable gets whatever bits happened to be left in that memory or register by earlier code — an [[indeterminate-value]], often called a *garbage value*.',
        },
        {
          type: 'code',
          code: `int main() {
    int kills;                    // declared, never given a value
    std::cout << kills << '\\n';   // undefined behavior!
}`,
          annotations: [
            { lines: 2, text: 'No initializer, so `kills` holds an indeterminate value. Declaring it this way is legal…' },
            { lines: 3, text: '…but **reading** it is [[undefined-behavior]]. Not "prints a random number" — the standard places no requirements on what happens at all.' },
          ],
        },
        {
          type: 'memory',
          caption: 'An uninitialized int: four bytes of leftover data from whatever used that memory before.',
          regions: [
            { label: 'Stack — main()', kind: 'stack', cells: [{ name: 'kills', type: 'int', value: '??? (leftover bits)', address: '0x1000', highlight: true }] },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Why it is worse than a random number',
          text: 'Optimizers assume your program never reads an uninitialized variable, and transform code based on that assumption. Real compilers have produced programs where such a variable seemed to be both zero and non-zero, or where entire branches vanished. It may work in debug builds and fail in release, or only on a player\'s machine. Treat any read of an uninitialized variable as a crash waiting to happen.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does C++ allow uninitialized variables at all?',
          text: 'Zero overhead. Initializing costs an instruction; for a large buffer that is about to be filled anyway, zeroing it first is pure waste, and in the 1970s and 80s every instruction mattered. C++ kept C\'s rule so that you only pay for initialization when you ask for it. The trade-off is that forgetting is a bug the language will not stop.',
        },
        {
          type: 'list',
          items: [
            '**Always initialize** when you declare: `int kills = 0;`. If you have no meaningful value yet, consider declaring the variable later.',
            '**Turn warnings on.** GCC and Clang warn about many uninitialized reads with `-Wall`; MSVC reports warning C4700. Without warning flags you get no message at all.',
            '**Use tools.** Sanitizers and Valgrind catch uninitialized reads at run time that warnings miss.',
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'C++26 tightens the rules',
          text: 'C++26 reclassifies reading an uninitialized local variable as *erroneous behavior*: still a bug, which implementations are encouraged to diagnose, but the variable holds a fixed implementation-chosen value instead of giving the optimizer free rein. Until your compiler implements C++26 (and even after), treat it as a bug. Note also that variables declared outside any function start at zero — a rule Unit 6 explains.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Unreal zero-fills the memory of `UObject`-derived objects before their constructors run, so their member variables start at zero. Local variables inside your functions get no such help, and members of ordinary structs are not zeroed either. Epic\'s coding standard expects you to initialize them — uninitialized members are a classic cause of bugs that only appear in Shipping builds.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This program usually prints 65 in debug builds, but it is wrong. Tap the line that causes the problem.',
      code: `#include <iostream>

int main() {
    int totalDamage;
    int hit1 = 40;
    int hit2 = 25;
    totalDamage = totalDamage + hit1;
    totalDamage = totalDamage + hit2;
    std::cout << totalDamage << '\\n';
}`,
      bugLines: [4, 7],
      hint: 'What value does `totalDamage` hold the first time it is read?',
      explanation:
        '`totalDamage` is declared on line 4 without an initializer, then read on line 7 to compute `totalDamage + hit1`. That read is undefined behavior: the starting value is indeterminate, and the optimizer may do anything with it. Debug builds often happen to have zero in that spot, which hides the bug. The fix is on line 4: `int totalDamage = 0;`. With `-Wall`, GCC warns "\'totalDamage\' is used uninitialized".',
    },
    {
      kind: 'concept',
      title: 'Where variables really live',
      blocks: [
        {
          type: 'p',
          text: '"A named region of memory" is how the C++ standard describes variables, in terms of an idealized **abstract machine**. Real compilers only promise that your program *behaves as if* it ran on that machine (the [[as-if-rule]]) — the observable results (output, files, network traffic) must match. How they achieve it is up to them.',
        },
        {
          type: 'code',
          title: 'damage.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int base = 20;
    int bonus = 5;
    int damage = base + bonus;
    std::cout << damage << '\\n';
}`,
          output: '25',
          annotations: [
            { lines: '4-6', text: 'In a debug build (`-O0`), each variable really gets its own 4 bytes on the stack, and the addition happens at run time.' },
            { lines: 7, text: 'In a release build (`-O2`), the compiler computes 25 while compiling. `base`, `bonus` and `damage` never exist in memory; the machine code just prints the constant.' },
          ],
        },
        {
          type: 'list',
          items: [
            'A variable may live in a CPU **register** for its whole life and never touch memory.',
            'A variable may be **eliminated** entirely if its value can be computed at compile time or is never used.',
            'Two variables whose lifetimes do not overlap may **share** the same memory.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why this matters to you',
          text: 'This "as-if" freedom is what lets optimizers make C++ fast, and it is why undefined behavior is so dangerous: the optimizer only promises to preserve the behavior of programs that follow the rules. It also explains a common debugging surprise — in an optimized build, your debugger may show a variable as `<optimized out>`, because there is no memory to read.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Think in the abstract model',
          text: 'When reasoning about whether code is *correct*, use the simple model: every variable is a named box of bytes. When reasoning about *performance* or debugging a release build, remember the compiler is free to be cleverer than that.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'While debugging a release build, your debugger shows `healthRatio = <optimized out>`. What is the most likely reason?',
      options: [
        {
          text: 'The variable was never declared, so the program has a bug',
          why: 'An undeclared variable is a compile error — the program would not have built at all.',
        },
        {
          text: 'The optimizer kept the value in a register or eliminated the variable, so there is no memory location for the debugger to read',
          correct: true,
          why: 'Right. Under the as-if rule, the compiler only has to preserve observable behavior. It is free to keep variables in registers, merge them, or remove them.',
        },
        {
          text: 'The variable holds an uninitialized value, and the debugger refuses to display garbage',
          why: 'Debuggers happily display garbage values; they do not know whether a value was initialized. `<optimized out>` is about *where* the variable lives, not what it holds.',
        },
        {
          text: 'Release builds do not support variables of that type',
          why: 'Every type works in every build configuration. Only the generated machine code differs.',
        },
      ],
      explanation:
        'The standard describes variables as regions of memory in an abstract machine, but compilers only have to behave *as if* they followed that model. In optimized builds, many variables never touch memory at all. That is why game developers often debug in an unoptimized configuration — such as Unreal\'s DebugGame — when they need to inspect every variable.',
    },
    {
      kind: 'truefalse',
      prompt: 'Reading an uninitialized local `int` is harmless as long as you don\'t care which value you get.',
      answer: false,
      explanation:
        'Reading an uninitialized local is undefined behavior (erroneous behavior in C++26), not merely "an unknown value". Because optimizers assume it never happens, the consequences can spread far beyond that one read: impossible branches, inconsistent values, or code removed entirely. Always initialize; it costs almost nothing, and compilers often optimize redundant initialization away.',
    },
  ],
  takeaways: [
    'An object is a region of memory with a type, size, lifetime and value; a variable is a named object. An `int` is an object too.',
    'The type tells the compiler how many bytes to use, how to interpret them and which instructions to generate.',
    'Declare variables before use and as close as possible to where you first need them, one per declaration.',
    'Initialization gives an object its first value at creation; assignment replaces the value of an existing object — even though both may use `=`.',
    'Assignment evaluates the right-hand side first, then overwrites the left; copies of values are independent.',
    'Reading an uninitialized local variable is undefined behavior. Always initialize, and build with warnings on.',
    'Compilers only need to behave *as if* every variable lived in memory; optimized builds may keep variables in registers or remove them.',
  ],
  reading: [
    {
      title: 'Introduction to objects and variables',
      url: 'https://www.learncpp.com/cpp-tutorial/introduction-to-objects-and-variables/',
      source: 'learncpp',
      note: 'A gentle introduction to the same object/variable vocabulary, with more examples.',
    },
    {
      title: 'Uninitialized variables and undefined behavior',
      url: 'https://www.learncpp.com/cpp-tutorial/uninitialized-variables-and-undefined-behavior/',
      source: 'learncpp',
      note: 'More on why uninitialized reads are dangerous and how they show up in practice.',
    },
    {
      title: 'Object',
      url: 'https://en.cppreference.com/w/cpp/language/object',
      source: 'cppreference',
      note: 'The standard\'s precise definition of an object: size, alignment, lifetime, type and value.',
    },
    {
      title: 'C++ Core Guidelines: ES.20 — Always initialize an object',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Res-always',
      source: 'core-guidelines',
      note: 'The rule, its rationale, and the rare exceptions.',
    },
  ],
};
