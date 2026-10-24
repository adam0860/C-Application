import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-pointers',
  title: 'Pointers Explained',
  summary: 'Variables that hold addresses: declaring, dereferencing, nullptr, passing pointers to functions — and why they exist at all.',
  minutes: 18,
  objectives: [
    'Declare a pointer, store an address in it, and dereference it to read and write the object it points to',
    'Distinguish the pointer itself from the object it points to, when copying and comparing',
    'Use `nullptr` to mean "no object" and guard every dereference with a null check',
    'Pass pointers to functions to modify the caller\'s objects or to accept an optional argument',
    'Explain the main reasons pointers exist, and why Unreal code uses them everywhere',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'A pointer is a variable that holds an address',
      blocks: [
        {
          type: 'p',
          text: 'In the last lesson you saw that `&health` produces the address of `health`. A [[pointer]] is simply a variable whose job is to **store** such an address. Like any variable it has a type, a value and its own place in memory — its value just happens to be the location of something else.',
        },
        {
          type: 'code',
          code: `int health = 100;
int* p = &health;    // p holds the address of health`,
          annotations: [
            { lines: 1, text: 'An ordinary `int` living on the stack.' },
            { lines: 2, text: 'Read `int*` as "pointer to int". The [[address-of-operator|address-of operator]] `&health` produces `health`\'s address, and that number is what gets stored in `p`.' },
          ],
        },
        {
          type: 'memory',
          caption: '`p` is a separate 8-byte variable whose value is `health`\'s address. The arrow is how we draw "holds the address of".',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { id: 'health', name: 'health', type: 'int', value: '100', address: '0xff4c' },
                { name: 'p', type: 'int*', value: '0xff4c', address: '0xff40', pointsTo: 'health', highlight: true },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A slip of paper with a house number',
          text: 'A pointer is a note with an address written on it. The note is not the house: you can copy the note, cross out the number and write another, or hand the note to a friend — the house stays exactly where it is. And a note can be blank, meaning "no house" (that is `nullptr`, coming up soon).',
        },
        {
          type: 'p',
          text: 'The pointer\'s type must match what it points to. `double* d = &health;` does not compile, because `health` is an `int`, not a `double`. The type is what tells the compiler how to interpret the bytes at that address.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The `*` belongs to the name, not the type',
          text: '`int* a, b;` declares `a` as a pointer but `b` as a plain `int` — the `*` applies only to the name right after it. This surprises everyone once. Declare one pointer per line and the problem disappears. (`int* p` and `int *p` mean the same thing; this course writes `int* p` to keep the type in one piece.)',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why store an address at all?',
          text: 'Because it lets code work with an object that lives **somewhere else**, without copying it, and the "somewhere" can be decided at run time. An AI routine can hold a pointer to whichever enemy it is currently targeting; switching targets just means storing a different address. The last card of this lesson collects all the reasons pointers exist.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'After these two lines, what is the value stored in `p`?',
      code: `int gold = 50;
int* p = &gold;`,
      options: [
        { text: '`50`', why: '`50` is the value of `gold`. You get it by *dereferencing* `p` (`*p`), but `p` itself stores something else.' },
        { text: 'The address of `gold`', correct: true, why: '`&gold` evaluates to `gold`\'s address, and that is what is copied into `p`.' },
        { text: 'The address of `p`', why: '`p` has its own address (`&p`), but its *value* is whatever was assigned to it — here, `&gold`.' },
        { text: 'Nothing yet — a pointer only gets a value when it is dereferenced', why: 'A pointer gets its value from initialization or assignment, exactly like any other variable. Dereferencing reads through it; it does not set it.' },
      ],
      explanation:
        'Keep two things apart: the pointer (a variable holding an address) and the pointee (the object at that address). `p` holds `&gold`; `*p` is `gold` itself, so `*p` evaluates to `50`.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Dereferencing: following the pointer',
      blocks: [
        {
          type: 'p',
          text: 'To get from the address back to the object, put `*` in front of the pointer. This is called [[dereference|dereferencing]]: `*p` means "the object that `p` points to". It is not a copy — `*p` *is* that object, so you can read it and assign to it.',
        },
        {
          type: 'code',
          title: 'deref.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int health = 100;
    int* p = &health;

    std::cout << *p << '\\n';      // read through p
    *p = 75;                      // write through p
    std::cout << health << '\\n';  // health really changed
    health -= 25;
    std::cout << *p << '\\n';      // p sees the change
}`,
          output: '100\n75\n50',
          annotations: [
            { lines: 7, text: '`*p` follows the address stored in `p` and reads the `int` there: `100`.' },
            { lines: 8, text: 'Assigning to `*p` writes into `health` itself. `p` still holds the same address — only the pointee changed.' },
            { lines: '10-11', text: 'It works in both directions: `health` and `*p` are two ways to reach one object, so changing either is visible through the other.' },
          ],
        },
        {
          type: 'table',
          headers: ['Where `*` appears', 'Meaning', 'Example'],
          rows: [
            ['In a declaration, after a type', '"pointer to"', '`int* p = &health;`'],
            ['Before an expression (unary)', 'Dereference: "the object at this address"', '`*p = 75;`'],
            ['Between two operands (binary)', 'Multiplication', '`damage * 2`'],
          ],
        },
        {
          type: 'p',
          text: '`&` and unary `*` are opposites: `&` goes from an object to its address, `*` goes from an address to its object. So `*&health` is just `health`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why pointers have types',
          text: 'An address alone is just a number: it says *where* the data starts, but not how many bytes to read or what they mean. The pointer\'s type supplies that. Dereferencing an `int*` reads 4 bytes as an integer; dereferencing a `double*` reads 8 bytes as a floating-point number. That is why the compiler refuses to quietly store an `int`\'s address in a `double*` — reading those bytes as a `double` would produce nonsense.',
        },
        {
          type: 'deepdive',
          title: 'What a dereference compiles to',
          blocks: [
            {
              type: 'p',
              text: 'With the pointer\'s value in a CPU register, `*p = 75` becomes a single store instruction, roughly `mov dword ptr [rax], 75` on x86-64: "write the 4-byte value 75 to the address held in `rax`". Reading `*p` is a single load. Pointers are not a heavy abstraction — they are how the hardware already works.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'fill',
      prompt: 'Make `ptr` point at `score`, then add 100 to `score` *through* the pointer.',
      template: `int score = 900;
___ ptr = ___score;     // ptr now holds score's address
___ += 100;             // score becomes 1000`,
      blanks: [{ answers: ['int*'] }, { answers: ['&'] }, { answers: ['*ptr'] }],
      wordBank: ['int*', 'int', '&', '*', '*ptr', 'ptr', '&ptr'],
      explanation:
        'A variable that stores an `int`\'s address has type `int*`, and `&score` produces that address. To change the pointee you must dereference: `*ptr += 100`. Writing `ptr += 100` compiles too, but it moves the *pointer* 100 `int`s further along in memory and leaves `score` untouched — a classic bug you will meet again shortly.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Copying and comparing pointers',
      blocks: [
        {
          type: 'p',
          text: 'Copying a pointer copies the **address**, never the object. After `int* b = a;` there are two pointers but still only one pointee. Likewise, comparing pointers with `==` asks "do these point at the same object?" (identity), while comparing dereferenced pointers asks "do these objects hold equal values?".',
        },
        {
          type: 'code',
          code: `int gold = 50;
int gems = 50;
int* a = &gold;
int* b = a;                  // copies the address
int* c = &gems;

bool sameObject = (a == b);  // true:  same address
bool sameTarget = (a == c);  // false: different objects
bool sameValue = (*a == *c); // true:  both hold 50
*b = 75;                     // gold is now 75; *a sees it`,
          annotations: [
            { lines: 4, text: '`b` gets a copy of the address in `a`. Nothing is copied from `gold` itself.' },
            { lines: '7-8', text: 'Pointer comparison compares addresses: identity, not contents.' },
            { lines: 9, text: 'Dereference both sides to compare the values. `gold` and `gems` are different objects that happen to be equal.' },
            { lines: 10, text: 'Writing through `b` changes `gold`, so reading through `a` now gives `75`. Two names (or pointers) for one object is called **aliasing**.' },
          ],
        },
        {
          type: 'memory',
          caption: 'After the last line: `a` and `b` alias `gold`; `c` points at a different object.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { id: 'gold', name: 'gold', type: 'int', value: '75', address: '0xff4c', highlight: true },
                { id: 'gems', name: 'gems', type: 'int', value: '50', address: '0xff48' },
                { name: 'a', type: 'int*', value: '0xff4c', address: '0xff40', pointsTo: 'gold' },
                { name: 'b', type: 'int*', value: '0xff4c', address: '0xff38', pointsTo: 'gold' },
                { name: 'c', type: 'int*', value: '0xff48', address: '0xff30', pointsTo: 'gems' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Debugging "who changed my value?"',
          text: 'When a variable changes and no line of code seems to touch it by name, the culprit is usually a pointer (or reference) aliasing it. Ask: "who else holds this object\'s address?" Debuggers can help with **data breakpoints**, which stop the program the moment a given address is written.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Ordering pointers',
          text: '`==` and `!=` work on any two pointers of compatible type. `<` and `>` are only meaningful for pointers into the **same array**; for unrelated objects the result is unspecified. You will use that array case in the pointer-arithmetic lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `int a = 1;
int b = 2;
int* p = &a;
int* q = p;
q = &b;
*q = 20;
*p = 10;
std::cout << a << ' ' << b << '\\n';`,
      options: [
        { text: '1 10', why: 'This assumes `q = p` tied the two pointers together forever, so moving `q` to `b` moved `p` too. Pointers are independent variables: `q = p` only copied an address once.' },
        { text: '10 2', why: 'This assumes `q` still points at `a` after `q = &b`. Assigning to `q` replaced the address it stores.' },
        { text: '1 2', why: 'Writing through a pointer changes the real object, not a copy. Both `*q = 20` and `*p = 10` modify actual variables.' },
        { text: '10 20', correct: true, why: '`q` is re-aimed at `b` and writes 20 there; `p` still points at `a` and writes 10 there.' },
      ],
      explanation:
        '`q = p` copies the address of `a` into `q`, but the two pointers remain separate variables. `q = &b` changes only `q`. So `*q = 20` writes into `b`, and `*p = 10` writes into `a`. Tracing which address each pointer holds at every line is the core skill for reading pointer code.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'nullptr: pointing at nothing',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes there is nothing to point at: no target locked, no weapon equipped, no save file found. A [[null-pointer]] represents exactly that. In modern C++ you write it as [[nullptr]]. You can test for it with `== nullptr`, or simply use the pointer as a condition, because a null pointer converts to `false` and any other pointer to `true`.',
        },
        {
          type: 'code',
          title: 'target.cpp',
          runnable: true,
          code: `#include <iostream>

void reportTarget(int* targetHp) {
    if (targetHp == nullptr) {
        std::cout << "No target locked\\n";
        return;
    }
    std::cout << "Target HP: " << *targetHp << '\\n';
}

int main() {
    int bossHp = 5000;
    int* target = nullptr;      // nothing locked yet

    reportTarget(target);
    target = &bossHp;           // lock on to the boss
    reportTarget(target);
}`,
          output: 'No target locked\nTarget HP: 5000',
          annotations: [
            { lines: '4-7', text: 'Check **before** dereferencing. `if (!targetHp)` means the same thing and is just as common.' },
            { lines: 8, text: 'Only reached when `targetHp` holds a real address, so the dereference is safe.' },
            { lines: 13, text: 'Always give a pointer a value when you declare it — an address or `nullptr`.' },
          ],
        },
        {
          type: 'p',
          text: 'Dereferencing a null pointer is [[undefined-behavior]]. On desktop operating systems it usually crashes immediately with a [[segmentation-fault]] (an "access violation" on Windows) — and that crash is the *good* outcome, because it points straight at the bug.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Uninitialized pointers are worse than null ones',
          text: 'A local `int* p;` with no initializer holds whatever bits were left in that memory — a random address. You cannot test it (`if (p)` is true for garbage, and even reading `p` is undefined behavior). Writing through it may scribble over some unrelated variable and the program may keep running for minutes before something else breaks. Initialize every pointer, always.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Why not NULL or 0?',
          text: 'Before C++11, null pointers were written `0` or `NULL` — a macro that is usually just `0`. Since those are integers, given `void log(int)` and `void log(const char*)`, the call `log(NULL)` picks the **int** overload. `nullptr` has its own type (`std::nullptr_t`) that converts to any pointer type but never to an integer, so `log(nullptr)` does the right thing. Use `nullptr` exclusively.',
        },
        {
          type: 'deepdive',
          title: 'Why a null dereference usually crashes — and why you cannot rely on it',
          blocks: [
            {
              type: 'p',
              text: 'Operating systems deliberately leave the page of memory at address 0 unmapped, so touching it makes the CPU raise a fault and the OS terminates the program. But because null dereference is undefined behavior, the optimizer is allowed to assume it *never happens*. If you dereference a pointer and only check it for null afterwards, the compiler may reason "it was already dereferenced, so it cannot be null" and delete your check entirely.',
            },
            {
              type: 'p',
              text: 'This has caused real security holes, including one in the Linux kernel in 2009. The rule is simple: check first, dereference second.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'truefalse',
      prompt: 'A local pointer declared as `int* target;` (no initializer) starts out as `nullptr`.',
      answer: false,
      explanation:
        'Local variables of fundamental types — pointers included — get [[default-initialization]], which for them means *no* initialization: the pointer holds leftover garbage. Only pointers with static storage (globals and `static` locals) are zero-initialized to null. That is why the rule is "always write `= nullptr` or a real address".',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Passing pointers to functions',
      blocks: [
        {
          type: 'p',
          text: 'You already know that [[pass-by-value]] gives a function a copy of each argument. Pass a pointer by value and the function receives a copy of the **address** — so both the caller\'s pointer and the function\'s copy lead to the same object. The function can change that object through `*`, but if it reassigns its own pointer, only its local copy changes.',
        },
        {
          type: 'code',
          title: 'damage.cpp',
          runnable: true,
          code: `#include <iostream>

void applyDamage(int* hp, int amount) {
    if (hp) {
        *hp -= amount;          // writes to the caller's object
    }
}

void tryRetarget(int* target, int* other) {
    target = other;             // changes only this local copy
    std::cout << "inside: " << *target << '\\n';
}

int main() {
    int playerHp = 100;
    int enemyHp = 40;
    int* target = &enemyHp;

    applyDamage(&playerHp, 30);
    applyDamage(nullptr, 30);   // "no target": safely ignored
    std::cout << "player: " << playerHp << '\\n';

    tryRetarget(target, &playerHp);
    std::cout << "after: " << *target << '\\n';
}`,
          output: 'player: 70\ninside: 70\nafter: 40',
          annotations: [
            { lines: '3-7', text: 'The function only knows an address. Dereferencing it reaches the caller\'s `playerHp` directly — no copy of the `int` is ever made.' },
            { lines: 10, text: 'Reassigning the parameter changes the function\'s own copy of the address. The caller\'s `target` is a different variable and still points at `enemyHp`.' },
            { lines: 19, text: 'The `&` at the call site is a visible hint that `playerHp` may be modified.' },
            { lines: 20, text: 'Because the parameter is a pointer, "no object" is a legal argument, and the null check inside handles it.' },
          ],
        },
        {
          type: 'memory',
          caption: 'During `applyDamage(&playerHp, 30)`: the parameter `hp` in the new frame points back into `main`\'s frame.',
          regions: [
            {
              label: 'Stack — applyDamage()',
              kind: 'stack',
              cells: [
                { name: 'hp', type: 'int*', value: '0xff4c', address: '0xff18', pointsTo: 'playerHp', highlight: true },
                { name: 'amount', type: 'int', value: '30', address: '0xff14' },
              ],
            },
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { id: 'playerHp', name: 'playerHp', type: 'int', value: '100 → 70', address: '0xff4c' },
                { id: 'enemyHp', name: 'enemyHp', type: 'int', value: '40', address: '0xff48' },
                { name: 'target', type: 'int*', value: '0xff48', address: '0xff40', pointsTo: 'enemyHp' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why pointers, when C++ has references?',
          text: 'C has no references, so pointers were its only way to let a function modify a caller\'s variable. C++ added [[reference|references]] (next lesson) for the common case where an object must always be supplied. A pointer parameter is still the right choice when **"no object" is a valid input** — the caller passes `nullptr` and the function checks for it.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Unreal\'s `AActor::TakeDamage(float DamageAmount, FDamageEvent const& DamageEvent, AController* EventInstigator, AActor* DamageCauser)` takes the instigator and the causer as pointers, because damage from a kill volume or a falling rock may have no controller behind it — those arguments can be `nullptr`, and well-written overrides check them.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'order',
      prompt: 'Order the lines to build a function that swaps two players\' scores through pointers.',
      lines: ['void swapScores(int* a, int* b) {', '    int temp = *a;', '    *a = *b;', '    *b = temp;', '}'],
      distractors: ['    int* temp = a;', '    a = b;'],
      explanation:
        'You must save the first *value* (`int temp = *a;`) before overwriting it. Saving the pointer instead (`int* temp = a;`) is a trap: after `*a = *b;`, `*temp` reads the already-overwritten value. And `a = b;` would only swap the function\'s local copies of the addresses, leaving both scores unchanged.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'bug',
      prompt: 'This program is supposed to print `65`, but it prints `40`. Tap the faulty line.',
      code: `#include <iostream>

void heal(int* hp, int amount) {
    if (hp != nullptr) {
        hp += amount;
    }
}

int main() {
    int health = 40;
    heal(&health, 25);
    std::cout << health << '\\n';
}`,
      bugLines: [5],
      hint: 'What does that line actually modify — the pointer or the pointee?',
      explanation:
        '`hp += amount` adds to the **pointer**, moving the local address 25 `int`s further along in memory; `health` is never touched. It compiles because adding an integer to a pointer is legal (pointer arithmetic, covered later in this unit). The fix is to dereference: `*hp += amount;`. Worse, GCC compiles this silently even with `-Wall -Wextra`, so only testing (or a careful reviewer) catches it.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Why pointers exist',
      blocks: [
        {
          type: 'p',
          text: 'Pointers have a reputation for being dangerous, and raw ones can be. But they exist because they solve problems nothing else in the language can. Here are the big reasons, and where in this course you will see each one developed:',
        },
        {
          type: 'table',
          headers: ['Reason', 'Game example', 'Developed in'],
          rows: [
            ['**Refer without copying** (indirection)', 'Every enemy\'s AI holds a pointer to the same player object', 'This lesson'],
            ['**Optional objects**', '`nullptr` when no target is locked or no weapon is equipped', 'This lesson'],
            ['**Dynamic memory**', 'Enemies spawned at run time live on the heap and can only be reached by address', 'new and delete (this unit)'],
            ['**Walking through memory**', 'Stepping through an array of particles element by element', 'Pointer arithmetic (this unit)'],
            ['**Polymorphism**', 'One `Enemy*` can point at a goblin or a dragon and still call the right behaviour', 'Unit 10'],
            ['**Linked structures**', 'Scene trees, quest graphs, linked lists', 'Later units'],
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal runs on pointers',
          text: 'Every actor, component and asset in Unreal is a heap object owned by the engine, so your code always refers to them through pointers: `GetOwner()` returns an `AActor*`, `GetWorld()` a `UWorld*`, and class members are declared as `TObjectPtr<UStaticMeshComponent>` (a pointer wrapper). Because actors can be destroyed at any time, null and validity checks are a daily habit.',
        },
        {
          type: 'code',
          title: 'Turret.cpp (Unreal, not runnable here)',
          code: `void ATurret::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);

    AActor* Target = FindClosestEnemy();  // may be nullptr
    if (IsValid(Target)) {
        AimAt(Target->GetActorLocation());
    }
}`,
          annotations: [
            { lines: 4, text: 'A function that "finds" something returns a pointer so it can say "nothing found" with `nullptr`.' },
            { lines: 5, text: '[[isvalid]] checks for null **and** for an actor that is already being destroyed. Unreal code checks pointers before every use.' },
            { lines: 6, text: '`->` calls a member function through a pointer. You will learn it properly in Unit 9; for now read it as "follow the pointer, then call".' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Observing vs owning',
          text: 'Modern C++ distinguishes two jobs. A raw pointer that merely **observes** an object someone else manages — like `Target` above — is perfectly fine. A raw pointer that **owns** heap memory (and must eventually free it) is where the danger lies. The next lessons show why, and what to use instead.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which of these are good reasons to use a pointer rather than a plain variable? (Select all that apply.)',
      options: [
        {
          text: 'To refer to an object that might not exist, using `nullptr` for "none"',
          correct: true,
          why: 'A plain variable always holds a value; a pointer can express "no object" explicitly and be checked.',
        },
        {
          text: 'To make arithmetic on an `int` faster by going through its address',
          why: 'Going through a pointer adds a memory access — it is never faster than using the `int` directly.',
        },
        {
          text: 'To reach an object created on the heap at run time, which has no name',
          correct: true,
          why: 'Heap objects are anonymous; their address is the only handle you get.',
        },
        {
          text: 'To let several parts of a program refer to one shared object without copying it',
          correct: true,
          why: 'Copying a pointer copies only an address, so many pointers can share one object cheaply.',
        },
        {
          text: 'To avoid having to initialize variables',
          why: 'Pointers need initialization even more urgently than other variables — an uninitialized pointer is a random address.',
        },
      ],
      explanation:
        'Pointers provide **indirection**: a level of "go look over there" between your code and an object. That buys optional objects, sharing without copies, access to anonymous heap objects and (later) polymorphism. It never buys speed for simple values, and it adds a new duty: making sure the address is valid when you use it.',
    },
  ],
  takeaways: [
    'A pointer is a variable that stores an address; `int*` reads "pointer to int", and the pointer has its own storage separate from its pointee.',
    'Unary `&` turns an object into its address; unary `*` turns an address back into the object, for reading or writing.',
    'Copying a pointer copies the address, not the object; `p == q` compares identity, `*p == *q` compares values.',
    'Use `nullptr` for "no object", always initialize pointers, and check for null before dereferencing — null dereference is undefined behavior.',
    'Passing a pointer lets a function modify the caller\'s object and allows `nullptr` as "no argument"; reassigning the parameter only changes the local copy.',
    'Pointers exist for indirection, optional objects, dynamic memory and polymorphism — and Unreal uses them for every engine-managed object.',
  ],
  reading: [
    {
      title: 'Pointer declaration',
      url: 'https://en.cppreference.com/w/cpp/language/pointer',
      source: 'cppreference',
      note: 'The full rules for pointer types, null pointers and pointer conversions.',
    },
    {
      title: 'Introduction to pointers',
      url: 'https://www.learncpp.com/cpp-tutorial/introduction-to-pointers/',
      source: 'learncpp',
      note: 'A gentle second explanation with plenty of small exercises.',
    },
    {
      title: 'Null pointers',
      url: 'https://www.learncpp.com/cpp-tutorial/null-pointers/',
      source: 'learncpp',
      note: 'More on `nullptr`, null checks and why dangling pointers are not null.',
    },
    {
      title: 'nullptr, the pointer literal',
      url: 'https://en.cppreference.com/w/cpp/language/nullptr',
      source: 'cppreference',
      note: 'Shows the overload-resolution problem with `NULL` that `nullptr` fixes.',
    },
  ],
};
