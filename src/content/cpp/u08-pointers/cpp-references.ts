import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-references',
  title: 'References vs Pointers',
  summary: 'References as aliases: their three rules, how they compare to pointers, const references and temporaries, and how they dangle.',
  minutes: 17,
  objectives: [
    'Explain a reference as an alias — another name for an existing object',
    'State the three rules of references: always initialized, never reseated, never null',
    'Compare references and pointers, and choose the right one for parameters, return values and loops',
    'Explain why a `const` reference can bind to a temporary and how that extends the temporary\'s lifetime',
    'Recognize dangling references, such as a reference to a local returned from a function',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'A reference is another name',
      blocks: [
        {
          type: 'p',
          text: 'You have already used [[reference|references]] as function parameters for [[pass-by-reference]]. Now let\'s see what they really are. A reference is an **alias**: a second name for an object that already exists. It is not a copy and not a separate container — everything you do to the reference, you do to the original object.',
        },
        {
          type: 'code',
          title: 'alias.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int health = 100;
    int& ref = health;      // ref is another name for health

    ref -= 30;              // no * needed
    std::cout << health << '\\n';
    health += 5;
    std::cout << ref << '\\n';
    std::cout << std::boolalpha
              << (&ref == &health) << '\\n';
}`,
          output: '70\n75\ntrue',
          annotations: [
            { lines: 5, text: 'In a type, `&` means "reference to". `ref` is bound to `health` at this moment, permanently.' },
            { lines: 7, text: 'Unlike a pointer, a reference needs no `*`: using the name *is* using the object.' },
            { lines: '9-10', text: 'Changes made through either name are visible through the other, because there is only one object.' },
            { lines: '11-12', text: 'Taking the address of a reference gives the address of the object it refers to. There is no separate "reference object" whose address you could take.' },
          ],
        },
        {
          type: 'memory',
          caption: 'One object, two names. Unlike a pointer, a reference does not appear as a separate box.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [{ name: 'health ≡ ref', type: 'int', value: '75', address: '0xff4c', highlight: true }],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A nickname, not a note',
          text: 'If a pointer is a slip of paper with someone\'s address on it, a reference is a **nickname**. When you call your friend "Ace" instead of "Alice", there is still only one person, and whatever you hand to Ace, Alice receives.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Why C++ added references',
          text: 'C only had pointers. Bjarne Stroustrup added references to C++ primarily to support **operator overloading**: so that `a + b` on two large objects could take its arguments without copying them, and without forcing you to write `&a + &b`. Clean pass-by-reference for ordinary functions came along as a bonus.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'truefalse',
      prompt: 'After `int& r = a;`, the expression `&r` gives the address of a separate reference variable, which differs from `&a`.',
      answer: false,
      explanation:
        'A reference is an alias, so `&r` is exactly `&a`. Whether the compiler needs any hidden storage to implement a reference is unspecified — often it needs none at all — but the language never lets you see or take the address of the reference itself. Compare a pointer `int* p = &a;`, where `&p` and `&a` really are different.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Three rules: initialized, never reseated, never null',
      blocks: [
        {
          type: 'list',
          ordered: true,
          items: [
            '**A reference must be initialized.** `int& r;` does not compile — an alias for nothing makes no sense.',
            '**A reference cannot be reseated.** Once bound, it refers to the same object for its whole life. There is no syntax to point it elsewhere.',
            '**There are no null references.** A valid program cannot create a reference that refers to nothing.',
          ],
        },
        {
          type: 'p',
          text: 'Rule 2 has a sneaky consequence. Assigning to a reference does not rebind it — it assigns to the object it refers to:',
        },
        {
          type: 'code',
          title: 'no-reseat.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int sword = 30;
    int axe = 45;
    int& equipped = sword;      // bound to sword for life

    equipped = axe;             // NOT a rebind: sword = axe
    std::cout << sword << ' ' << axe << '\\n';
    equipped = 99;
    std::cout << sword << ' ' << axe << '\\n';
}`,
          output: '45 45\n99 45',
          annotations: [
            { lines: 8, text: 'This copies the *value* of `axe` (45) into `sword`. `equipped` still refers to `sword`.' },
            { lines: 10, text: 'Proof: writing through `equipped` still changes `sword`, never `axe`.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Pointer: can be re-aimed',
            tone: 'neutral',
            code: `int* p = &sword;
p = &axe;    // p now points at axe
*p = 99;     // changes axe`,
          },
          right: {
            title: 'Reference: bound forever',
            tone: 'neutral',
            code: `int& r = sword;
r = axe;     // copies axe's value into sword
r = 99;      // changes sword`,
          },
        },
        {
          type: 'p',
          text: 'Rule 3 is a contract. The only way to "make" a null reference is to dereference a null pointer first — `int& r = *p;` with `p == nullptr` — and that line is already [[undefined-behavior]]. So a function that takes `Player& p` may assume, without checking, that a real player was passed.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why can\'t a reference be reseated?',
          text: 'Because a reference is designed to **be** the object. Every operation on it — including `=` — is an operation on the referent, so there is no syntax left over that could mean "rebind". The payoff is simplicity: when you see where a reference is initialized, you know what it refers to for its entire lifetime, and so does the optimizer.',
        },
        {
          type: 'deepdive',
          title: 'How references are implemented',
          blocks: [
            {
              type: 'p',
              text: 'The standard deliberately leaves it unspecified whether a reference occupies storage. In practice, a reference parameter or a reference stored inside an object is implemented as a hidden pointer: `void heal(int& hp)` compiles to the same machine code as `void heal(int* hp)` using `*hp`. A local alias like `int& ref = health;` usually compiles to nothing at all — the compiler just uses `health` directly.',
            },
            {
              type: 'p',
              text: 'One visible consequence: `sizeof(ref)` reports the size of the referred-to type (`sizeof(int)`), not the size of a pointer.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'bug',
      prompt: 'The programmer expected `15 25`, but this prints `25 20`. Tap the line with the mistaken assumption.',
      code: `#include <iostream>

int main() {
    int player1Score = 10;
    int player2Score = 20;
    int& current = player1Score;
    current += 5;              // player 1 scores
    current = player2Score;    // switch to player 2
    current += 5;              // player 2 scores
    std::cout << player1Score << ' ' << player2Score << '\\n';
}`,
      bugLines: [8],
      hint: 'What does `=` do to a reference that is already bound?',
      explanation:
        'Line 8 does not switch `current` to player 2 — references cannot be reseated. It copies `player2Score` (20) into `player1Score`, and line 9 then adds 5 to player 1 again, giving `25 20`. When you need something that can change what it refers to, use a pointer: `int* current = &player1Score;` … `current = &player2Score;` … `*current += 5;`.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'References vs pointers, side by side',
      blocks: [
        {
          type: 'table',
          headers: ['Property', 'Pointer `int* p`', 'Reference `int& r`'],
          rows: [
            ['Must be initialized', 'No (but always should be)', 'Yes'],
            ['Can be null', 'Yes — `nullptr`', 'No'],
            ['Can change what it refers to', 'Yes — `p = &other;`', 'No — `=` assigns to the referent'],
            ['Access the object', '`*p`, `p->member`', '`r`, `r.member`'],
            ['Is an object itself', 'Yes: own address and size', 'Not necessarily'],
            ['Arithmetic, arrays of them', 'Yes', 'No (`std::vector<int&>` does not compile)'],
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Pointer parameter',
            tone: 'neutral',
            code: `void heal(int* hp, int amount) {
    if (hp) {
        *hp += amount;
    }
}
heal(&health, 10);`,
            text: 'Caller writes `&`. The function must handle `nullptr`.',
          },
          right: {
            title: 'Reference parameter',
            tone: 'neutral',
            code: `void heal(int& hp, int amount) {
    hp += amount;
}
heal(health, 10);`,
            text: 'No `&` or `*` noise, and no null case to handle.',
          },
        },
        { type: 'heading', text: 'When to use which' },
        {
          type: 'list',
          items: [
            '**Read-only and cheap to copy** (`int`, `float`, small structs): pass by value.',
            '**Read-only and expensive to copy** (`std::string`, `std::vector`): `const T&` — a [[const-reference|const reference]].',
            '**Must modify an object that must exist**: `T&`.',
            '**The object is optional**, or you need to **re-aim** later, or store it in a container: an observing `T*`.',
            '**Owning heap memory**: neither raw form — that job belongs to smart pointers (Unit 11).',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why prefer references when you can?',
          text: 'A reference states a guarantee in the type: "there is definitely an object here, and it is always the same one". The caller cannot pass null, the function needs no checks, and readers need not wonder whether the target changes halfway through. Use a pointer exactly when you need one of the things a reference cannot do.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Unreal follows the same rules with its own flavour: read-only structs pass as `const FString&` or `const FVector&`, and output parameters are non-const references named with an `Out` prefix, as in `UWorld::LineTraceSingleByChannel(FHitResult& OutHit, const FVector& Start, const FVector& End, ECollisionChannel TraceChannel)`. Engine objects (`AActor`, `UActorComponent`) are always passed by **pointer**, because they are heap objects that may be null or destroyed.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: '`heal` must modify the target\'s health, and calling it without a target makes no sense. Which parameter type fits best?',
      code: 'void heal(/* ??? */, int amount);',
      codeOptions: true,
      options: [
        { text: 'int target', why: 'Pass by value gives the function a copy; the caller\'s health would never change.' },
        { text: 'const int& target', why: 'A `const` reference avoids a copy but forbids modification, and an `int` is cheap to copy anyway.' },
        { text: 'int& target', correct: true, why: 'A non-const reference lets the function modify the caller\'s object, and guarantees an object is always supplied.' },
        { text: 'int* target', why: 'It works, but it admits `nullptr`, forcing a null check and `&` at every call site, to express an "optional" that the requirements rule out.' },
      ],
      explanation:
        'Match the type to the contract. "Modifies the caller\'s object" rules out pass-by-value and `const&`. "Always has a target" means null is not a valid input, which is exactly what a reference guarantees. Save pointers for when "no object" is a legitimate case.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'const references and temporaries',
      blocks: [
        {
          type: 'p',
          text: 'A plain reference can only bind to an [[lvalue]] — an object with a name and an address. But a `const` reference can also bind to a [[temporary-object|temporary]]: `int& r = 5;` is an error, while `const int& r = 5;` compiles. This is what lets a function taking `const std::string&` accept a string literal or a function\'s return value.',
        },
        {
          type: 'code',
          title: 'hud.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

void announce(const std::string& message) {
    std::cout << "[HUD] " << message << '\\n';
}

std::string makeTitle(int level) {
    return "Level " + std::to_string(level);
}

int main() {
    std::string boss = "Dragon";
    announce(boss);             // binds to an existing string
    announce("Checkpoint");     // binds to a temporary string
    announce(makeTitle(3));     // binds to a returned temporary

    const std::string& title = makeTitle(4);   // lifetime extended
    std::cout << title.size() << '\\n';
}`,
          output: '[HUD] Dragon\n[HUD] Checkpoint\n[HUD] Level 3\n7',
          annotations: [
            { lines: 4, text: 'The classic read-only parameter: no copy for existing strings, and temporaries are accepted too.' },
            { lines: 15, text: '`"Checkpoint"` is a character array, not a `std::string`. The compiler creates a temporary `std::string`, binds `message` to it, and destroys it when the call finishes.' },
            { lines: 16, text: 'The `std::string` returned by `makeTitle(3)` is a temporary too; it lives until the end of this statement.' },
            { lines: 18, text: '**Lifetime extension**: binding a temporary directly to a local `const&` keeps the temporary alive as long as the reference — here, to the end of `main`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why can\'t a non-const reference bind to a temporary?',
          text: 'Because modifying a temporary is almost always a bug. Early C++ allowed it, and code like this silently did nothing: given `void addXp(long& total, int gained)`, the call `addXp(xp, 50)` with an `int xp` converted `xp` into a temporary `long`, added 50 to the **temporary**, and threw it away — `xp` stayed 0. Banning the binding turned that silent bug into a compile error, while `const&` stays safe because you cannot modify through it anyway.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Lifetime extension does not chain',
          text: '[[lifetime-extension|Lifetime extension]] only applies when the temporary is bound **directly** to the reference. Given `const std::string& pick(const std::string& s) { return s; }`, the line `const std::string& t = pick(makeTitle(1));` leaves `t` dangling: the temporary was bound to the parameter `s`, not to `t`, so it dies at the end of the statement.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: 'Fill in the blanks so both lines compile: the first creates an alias, the second binds to a temporary.',
      template: `int lives = 3;
int___ alias = lives;           // another name for lives
___ int& bonus = 2 * lives;     // binds to a temporary`,
      blanks: [{ answers: ['&'] }, { answers: ['const'] }],
      wordBank: ['&', '*', '&&', 'const', 'static', 'auto'],
      explanation:
        '`int& alias = lives;` binds a plain reference to an lvalue. `2 * lives` produces a temporary [[rvalue]], and only a `const` lvalue reference can bind to it (extending its lifetime). `int* alias = lives` fails because an `int` is not an address, and `int&& alias = lives` fails because an rvalue reference (Unit 11) cannot bind to a named variable.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'References you already use',
      blocks: [
        {
          type: 'p',
          text: 'References are not just for parameters. Two places you have used them, perhaps without noticing:',
        },
        {
          type: 'list',
          items: [
            'In a [[range-based-for]] loop, `for (int hp : party)` copies each element into `hp`, while `for (int& hp : party)` makes `hp` an alias for each element in turn, so you can modify them in place. `for (const std::string& name : names)` reads without copying.',
            '`scores[2] = 99;` works because `std::vector`\'s `operator[]` returns an `int&` — a reference to the element inside the vector.',
          ],
        },
        {
          type: 'p',
          text: 'Your own functions can return references too. That is safe exactly when the referred-to object **outlives the call** — for example, an element of a container the caller passed in:',
        },
        {
          type: 'code',
          title: 'party.cpp',
          runnable: true,
          code: `#include <iostream>
#include <vector>

int& strongest(std::vector<int>& party) {
    int best = 0;
    for (int i = 1; i < static_cast<int>(party.size()); ++i) {
        if (party[i] > party[best]) {
            best = i;
        }
    }
    return party[best];        // lives in the caller's vector
}

int main() {
    std::vector<int> partyHp{80, 120, 95};
    for (int& hp : partyHp) {
        hp += 10;              // modifies each element in place
    }
    strongest(partyHp) -= 50;  // the returned reference is assignable
    for (int hp : partyHp) {   // ints are cheap: copy is fine
        std::cout << hp << ' ';
    }
    std::cout << '\\n';
}`,
          output: '90 80 105',
          annotations: [
            { lines: 4, text: 'Returns a reference **into** the caller\'s vector. The vector outlives the call, so the reference stays valid (as long as the vector is not resized).' },
            { lines: '16-18', text: '`int&` makes `hp` an alias for each element; without the `&` you would be adding 10 to a copy.' },
            { lines: 19, text: 'Assigning through the returned reference modifies the strongest party member directly: 130 becomes 80.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Choosing the loop variable',
          text: 'Use `T&` to modify elements, `const T&` to read expensive elements (strings, structs), and plain `T` to read cheap ones (`int`, `float`). Forgetting the `&` when you meant to modify is one of the most common silent bugs in C++.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `std::vector<int> ammo{5, 5, 5};
for (int a : ammo) {
    a += 10;
}
for (int& a : ammo) {
    a *= 2;
}
std::cout << ammo[0] << ' ' << ammo[2] << '\\n';`,
      options: [
        { text: '30 30', why: 'That would require both loops to modify the vector. The first loop\'s `a` is a copy, so its `+= 10` is lost.' },
        { text: '15 15', why: 'That assumes the first loop modified the elements and the second did not — the opposite of what the `&` means.' },
        { text: '10 10', correct: true, why: 'Only the second loop, with `int&`, modifies the elements: 5 × 2 = 10.' },
        { text: '5 5', why: 'The second loop binds `a` as a reference to each element, so `a *= 2` really doubles them.' },
      ],
      explanation:
        'In the first loop `a` is a fresh copy of each element, so adding 10 changes only the copy. In the second loop `a` is a reference — an alias for each element in turn — so doubling it doubles the element itself.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Dangling references',
      blocks: [
        {
          type: 'p',
          text: 'A reference does not keep its object alive. If the object\'s [[lifetime]] ends while a reference to it still exists, you have a [[dangling-reference]], and using it is undefined behavior. The most common way to create one is returning a reference to a local variable:',
        },
        {
          type: 'compare',
          left: {
            title: 'Dangling',
            tone: 'bad',
            code: `int& bestScore() {
    int best = 9001;
    return best;   // best dies right here
}`,
            text: '`best` lives in `bestScore`\'s stack frame, which is popped on return. The caller receives an alias for dead memory.',
          },
          right: {
            title: 'Correct',
            tone: 'good',
            code: `int bestScore() {
    int best = 9001;
    return best;   // returns a copy
}`,
            text: 'Return by value. Modern compilers construct the result directly in the caller, so this is not even slow.',
          },
        },
        {
          type: 'p',
          text: 'GCC and Clang warn about the obvious case ("reference to local variable returned"), but subtler cases slip through. A favourite: holding a reference into a vector while it grows. Recall [[iterator-invalidation]] — when `push_back` exceeds the capacity, the elements move to a new heap buffer and the old one is freed:',
        },
        {
          type: 'code',
          code: `std::vector<int> scores{10, 20};
int& first = scores[0];
scores.push_back(30);   // may move every element
first = 99;             // undefined behavior if it did`,
          annotations: [
            { lines: 2, text: '`first` aliases the element in the *current* heap buffer.' },
            { lines: 3, text: 'The vector is full, so it allocates a bigger buffer, copies the elements across and frees the old buffer.' },
            { lines: 4, text: '`first` still refers into the freed buffer. Writing there may corrupt the heap or do nothing visible — until it crashes later.' },
          ],
        },
        {
          type: 'memory',
          caption: 'After the `push_back`: the vector moved on, the reference did not.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'scores', type: 'std::vector<int>', value: 'data · size 3 · cap 4', address: '0xff30', pointsTo: 'new0' },
                { name: 'first', type: 'int&', value: '(alias)', address: '—', pointsTo: 'old0', highlight: true },
              ],
            },
            {
              label: 'Heap — old buffer (freed)',
              kind: 'heap',
              cells: [
                { id: 'old0', value: '10 (freed)', address: '0x9e20' },
                { value: '20 (freed)', address: '0x9e24' },
              ],
            },
            {
              label: 'Heap — new buffer',
              kind: 'heap',
              cells: [
                { id: 'new0', type: 'int', value: '10', address: '0xa340' },
                { type: 'int', value: '20', address: '0xa344' },
                { type: 'int', value: '30', address: '0xa348' },
                { value: '(spare)', address: '0xa34c' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why doesn\'t C++ just keep the object alive?',
          text: 'In Java or C#, a reference keeps its object alive because a garbage collector tracks every reference. C++ has no garbage collector: tracking references would cost time and memory on every use, and C++ promises you do not pay for what you do not use. The price is that **you** must make sure the object outlives every reference to it — exactly as with pointers.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: '[[tarray]] behaves like `std::vector`: `FItem& Item = Inventory[0];` followed by `Inventory.Add(NewItem);` can reallocate and leave `Item` dangling. Unreal\'s garbage collector only tracks `UObject` pointers it can see (such as `UPROPERTY` members); plain C++ references get no protection.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'Which of these creates a dangling reference?',
      codeOptions: true,
      options: [
        {
          text: 'int& pick(int& x) { return x; }',
          why: 'Safe: `x` refers to the caller\'s object, which outlives the call. Returning it hands back the same alias.',
        },
        {
          text: 'int& counter() { static int n = 0; return n; }',
          why: 'Safe: a `static` local has static storage duration and lives until the program ends.',
        },
        {
          text: 'const int& r = 6 * 7;',
          why: 'Safe: the temporary is bound directly to a local `const&`, so its lifetime is extended to match `r`.',
        },
        {
          text: 'int& make() { int n = 0; return n; }',
          correct: true,
          why: 'Dangling: `n` is an automatic local that is destroyed when `make` returns, so the returned reference refers to a dead object.',
        },
      ],
      explanation:
        'The question is always the same: does the referred-to object outlive the reference? Caller-owned objects, statics and directly-bound temporaries do. Automatic locals die when their function returns, so a reference to one is dangling the moment the caller receives it.',
    },
  ],
  takeaways: [
    'A reference is an alias for an existing object: using it is using the object, and `&ref` is the object\'s address.',
    'References must be initialized, cannot be reseated (`=` assigns to the referent), and cannot be null.',
    'Prefer references when an object must exist; use pointers for "maybe no object", for re-aiming, or for storing in containers.',
    'Only `const` references bind to temporaries, and binding one directly to a local `const&` extends its lifetime — but not through function returns.',
    'Use `T&` in range-for loops to modify elements; forgetting the `&` silently modifies copies.',
    'A reference never keeps its object alive: returning a reference to a local, or holding one into a growing vector, creates a dangling reference.',
  ],
  reading: [
    {
      title: 'Reference declaration',
      url: 'https://en.cppreference.com/w/cpp/language/reference',
      source: 'cppreference',
      note: 'The rules for lvalue and rvalue references, including dangling references.',
    },
    {
      title: 'Reference initialization',
      url: 'https://en.cppreference.com/w/cpp/language/reference_initialization',
      source: 'cppreference',
      note: 'See "Lifetime of a temporary" for exactly when lifetime extension applies — and when it does not.',
    },
    {
      title: 'Lvalue references',
      url: 'https://www.learncpp.com/cpp-tutorial/lvalue-references/',
      source: 'learncpp',
      note: 'A step-by-step introduction to references as aliases.',
    },
    {
      title: 'isocpp FAQ: References',
      url: 'https://isocpp.org/wiki/faq/references',
      source: 'isocpp',
      note: 'Short answers to "when should I use references, and when pointers?"',
    },
  ],
};
