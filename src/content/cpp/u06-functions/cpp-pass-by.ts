import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-pass-by',
  title: 'Pass by Value, Reference and const Reference',
  summary: 'How data gets into and out of a function, what each choice costs, and the one rule that covers most cases.',
  minutes: 18,
  objectives: [
    'Explain what pass by value copies and when that copy becomes expensive',
    'Use a reference parameter to let a function modify the caller\'s variable',
    'Pass large objects as `const&` to read them without copying',
    'Apply the guideline: cheap types by value, everything else by `const&`',
    'Prefer return values over out-parameters, and recognize when out-parameters still fit',
    'Spot and avoid returning a reference to a local variable',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Pass by value: the function gets a copy',
      blocks: [
        {
          type: 'p',
          text: 'In the previous lesson you saw that a parameter is a new variable initialized from its argument. That is [[pass-by-value|pass by value]]: the function receives its own **copy**. Here is what that means when a function tries to heal the player:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

void heal(int hp, int amount) {
    hp += amount;
    std::cout << "Inside heal: " << hp << '\\n';
}

int main() {
    int health = 50;
    heal(health, 25);
    std::cout << "After heal: " << health << '\\n';
}`,
          output: 'Inside heal: 75\nAfter heal: 50',
          annotations: [
            { lines: 3, text: '`hp` is a separate `int` in `heal`\'s stack frame, initialized with a copy of the argument.' },
            { lines: 4, text: 'This changes the copy. The caller\'s `health` lives in a different box and is not affected.' },
            { lines: 11, text: 'Still 50. The healing happened to a variable that was destroyed when `heal` returned.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Inside heal(), after line 4: two independent ints.',
          regions: [
            {
              label: 'Stack — heal()',
              kind: 'stack',
              cells: [
                { name: 'hp', type: 'int', value: '75', address: '0x7ffc…10', highlight: true },
                { name: 'amount', type: 'int', value: '25', address: '0x7ffc…14' },
              ],
            },
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [{ name: 'health', type: 'int', value: '50', address: '0x7ffc…40' }],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why copying is a feature',
          text: 'A copy isolates the function from the caller. When you read `heal(health, 25)` and know `heal` takes its parameters by value, you know for certain `health` is unchanged afterwards, without reading `heal`\'s code. That *local reasoning* is valuable in a big code base. The problems start when you actually want the change to stick, or when the copy is expensive. This lesson solves both.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>
#include <string>

void shout(std::string text) {
    text += "!";
    std::cout << text << '\\n';
}

int main() {
    std::string msg = "Victory";
    shout(msg);
    std::cout << msg << '\\n';
}`,
      options: [
        { text: 'Victory!\nVictory!', why: 'That would require `text` to *be* `msg`. With a by-value parameter, `text` is a separate string copied from `msg`.' },
        { text: 'Victory!\nVictory', correct: true, why: '`shout` appends to its own copy and prints it. `msg` in `main` was never touched.' },
        { text: 'Victory\nVictory', why: 'Inside `shout`, the copy really does get the `!` appended before it is printed.' },
        { text: 'It does not compile: a `std::string` cannot be passed by value', why: 'Any copyable type can be passed by value. It compiles fine; whether it is a *good idea* is a separate question.' },
      ],
      explanation:
        'Pass by value works the same for strings as for ints: the parameter is a full, independent copy. For a `std::string` that copy may involve allocating memory and copying every character, which is the cost we look at next.',
    },
    {
      kind: 'concept',
      title: 'The cost of a copy',
      blocks: [
        {
          type: 'p',
          text: 'Copying an `int` costs essentially nothing: it is 4 bytes and fits in a processor register. Copying a [[std-string]] is a different story. A string object is small (24–32 bytes depending on the library), but its characters usually live in a separate block of [[heap-memory|heap memory]]. A copy must ask for a new block of memory and copy every character into it.',
        },
        {
          type: 'code',
          code: `int countVowels(std::string text);   // copies!

std::string questLog = loadQuestLog();  // 50,000 chars
for (int frame = 0; frame < 60; ++frame) {
    countVowels(questLog);   // 60 allocations,
}                            // 3 million chars copied`,
          annotations: [
            { lines: 1, text: 'The function only *reads* the text, yet every call makes a full copy of it.' },
            { lines: '4-6', text: 'Called once per frame, this wastes an allocation and 50,000 character copies every frame for no benefit at all.' },
          ],
        },
        {
          type: 'table',
          headers: ['Type', 'Typical size', 'Cost of a copy'],
          rows: [
            ['`int`, `float`, `bool`, `char`', '1–8 bytes', 'One register move: free'],
            ['`double`, `long long`', '8 bytes', 'Free'],
            ['`std::string_view`', '16 bytes', 'Free (it never owns characters)'],
            ['`std::string` (short)', '24–32 bytes', 'Cheap: short text is stored inside the object'],
            ['`std::string` (long)', '24–32 bytes + heap', 'Heap allocation + copy every character'],
            ['Containers (next unit)', '24 bytes + heap', 'Allocation + copy **every element**'],
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why allocations hurt in games',
          text: 'A heap allocation means asking the memory allocator to find a free block, which takes far longer than copying a few bytes, and freeing it later costs again. A game running at 60 frames per second has about 16.7 milliseconds per frame for *everything*. Accidental copies inside hot functions are one of the most common reasons C++ games stutter, and they are invisible at the call site.',
        },
        {
          type: 'deepdive',
          title: 'Small string optimization (SSO)',
          blocks: [
            {
              type: 'p',
              text: 'All three major standard libraries store short strings directly inside the `std::string` object, with no heap allocation. The limit is 15 characters in libstdc++ (GCC) and MSVC, and 22 in libc++ (Clang), on 64-bit platforms. Copying `"Goblin"` is therefore cheap; copying a paragraph of quest text is not. Do not rely on SSO when designing function signatures: you rarely know how long the text will be.',
            },
          ],
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Pass by reference: changing the caller\'s variable',
      blocks: [
        {
          type: 'p',
          text: 'A [[reference|reference]] is an **alias**: another name for an existing object. You declare one by adding `&` after the type. Once bound, everything you do to the reference happens to the original object. A reference parameter therefore lets a function work directly on the caller\'s variable. This is [[pass-by-reference|pass by reference]].',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

void heal(int& hp, int amount) {
    hp += amount;
}

int main() {
    int health = 50;
    heal(health, 25);
    std::cout << "After heal: " << health << '\\n';

    int& alias = health;
    alias = 10;
    std::cout << "After alias: " << health << '\\n';
}`,
          output: 'After heal: 75\nAfter alias: 10',
          annotations: [
            { lines: 3, text: '`int& hp` reads "reference to int". `hp` is not a new int; it is bound to whatever variable the caller passes.' },
            { lines: 4, text: 'This modifies `health` in `main` directly, because `hp` *is* `health` for the duration of the call.' },
            { lines: 9, text: 'The call site looks exactly like pass by value. Only the function\'s signature tells you the argument may be modified.' },
            { lines: '12-13', text: 'References are not only for parameters. `alias` is another name for `health`, so assigning to it assigns to `health`.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Inside heal(): hp is not a separate box, it refers to main\'s health.',
          regions: [
            {
              label: 'Stack — heal()',
              kind: 'stack',
              cells: [
                { name: 'hp', type: 'int&', value: '(refers to health)', pointsTo: 'health' },
                { name: 'amount', type: 'int', value: '25' },
              ],
            },
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [{ id: 'health', name: 'health', type: 'int', value: '50 → 75', address: '0x7ffc…40', highlight: true }],
            },
          ],
        },
        {
          type: 'p',
          text: 'A reference must be bound to an object when it is created, and it stays bound to that same object for its whole life; there is no "null reference" and no way to re-point it. A non-const reference parameter also requires an actual variable as its argument: `heal(50, 25)` does not compile, because there is no variable named "50" whose value could be changed.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why references exist',
          text: 'C had only pointers for this job (they are coming in a later unit). Stroustrup added references to C++ mainly so that overloaded operators could work naturally (`a = b` must modify `a` without writing `&a`), and they turned out to be a safer tool for parameters too: no null checks, no special syntax at the call site, no re-pointing. Under the hood the compiler usually implements a reference parameter by passing the object\'s [[memory-address|memory address]].',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'References in Unreal and Blueprints',
          text: 'When you expose a C++ function to Blueprints, a non-const reference parameter such as `int32& OutCount` appears as an **output pin** on the node, because Blueprint assumes the function writes to it. A `const` reference appears as a normal input. Unreal signatures communicate intent through references, so this lesson\'s rules carry straight over.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete `swapScores` so that it actually swaps the caller\'s two variables.',
      template: `void swapScores(int___ a, int___ b) {
    int temp = a;
    a = b;
    b = temp;
}`,
      blanks: [{ answers: ['&'] }, { answers: ['&'] }],
      wordBank: ['&', '*', 'const', '&&', '[]'],
      explanation:
        'Both parameters must be references (`int&`) so that `a` and `b` are aliases for the caller\'s variables. With plain `int` parameters the function would swap two local copies and the caller would see no change. (`int*` would need pointer syntax inside and at the call site; `const` would forbid the assignments.)',
    },
    {
      kind: 'bug',
      prompt: 'This program fails to compile. Tap the line that causes the error.',
      code: `#include <iostream>

void addGold(int& gold, int amount) {
    gold += amount;
}

int main() {
    int playerGold = 100;
    addGold(playerGold, 50);
    addGold(250, 10);
    std::cout << playerGold << '\\n';
}`,
      bugLines: [10],
      hint: 'What would `gold += amount` modify on that call?',
      explanation:
        'A non-const `int&` must bind to a modifiable variable (an [[lvalue]]). `250` is a temporary value with no variable behind it, so GCC reports *cannot bind non-const lvalue reference of type int& to an rvalue of type int*. The rule protects you: modifying a temporary that disappears at the end of the statement would silently lose the change. If the function did not need to modify its input, it should take `int` (or `const int&`), and then a literal would be fine.',
    },
    {
      kind: 'concept',
      title: 'const reference: read-only, no copy',
      blocks: [
        {
          type: 'p',
          text: 'Most of the time a function only needs to *read* a big object. Pass by value would copy it; pass by plain reference would avoid the copy but also allow accidental modification and refuse temporaries. The answer is a [[const-reference|const reference]]: `const std::string&` means "an alias I promise not to modify".',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>

int countVowels(const std::string& text) {
    int count = 0;
    for (char c : text) {
        if (c == 'a' || c == 'e' || c == 'i' ||
            c == 'o' || c == 'u') {
            ++count;
        }
    }
    return count;
}

int main() {
    std::string lore = "an ancient evil awakens";
    std::cout << countVowels(lore) << '\\n';
    std::cout << countVowels("goblin") << '\\n';
}`,
          output: '9\n2',
          annotations: [
            { lines: 4, text: 'No copy is made: `text` is bound to the caller\'s string. `const` means any attempt to modify `text` is a compile error.' },
            { lines: 6, text: 'Reading is fine. Writing `text += "!";` here would not compile.' },
            { lines: 17, text: 'Binds directly to `lore`: no allocation, no character copying.' },
            { lines: 18, text: 'A string literal is not a `std::string`, so a temporary `std::string` is created, bound to `text` for the duration of the call, then destroyed. A non-const `std::string&` would reject this call.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'By value',
            tone: 'neutral',
            code: 'int countVowels(std::string text);',
            text: 'Copies the whole string on every call. The function can modify its copy freely.',
          },
          right: {
            title: 'By const reference',
            tone: 'good',
            code: 'int countVowels(const std::string& text);',
            text: 'No copy. The compiler enforces read-only access. Accepts variables, temporaries and literals.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why can const& bind to a temporary when & cannot?',
          text: 'A temporary vanishes at the end of the full statement. Letting a function *modify* it is almost always a bug, since the change would be thrown away immediately, so the language forbids binding a non-const reference to it. Reading a temporary, on the other hand, is perfectly safe, so `const&` allows it. That makes `const&` parameters as convenient to call as by-value parameters.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'For read-only text, consider std::string_view',
          text: 'You met [[string-view]] earlier: a cheap, non-owning view of characters. A `std::string_view` parameter accepts `std::string`s, literals and substrings without creating any temporary `std::string`, so `countVowels("goblin")` would not allocate at all. Use `const std::string&` when you need a real `std::string` (for example to pass it on to an API that wants one), and `std::string_view` for plain read-only text.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A function prints a character\'s biography, which can be thousands of characters long. It never modifies the text. Which `std::string` parameter is best?',
      codeOptions: true,
      options: [
        { text: 'void printBio(std::string bio)', why: 'Correct behaviour, but it copies the entire biography on every call, possibly with a heap allocation, for nothing.' },
        { text: 'void printBio(std::string& bio)', why: 'Avoids the copy, but it suggests the function will modify the text, and it refuses temporaries and literals: `printBio("Unknown")` would not compile.' },
        { text: 'void printBio(const std::string& bio)', correct: true, why: 'No copy, read-only access enforced by the compiler, and it accepts any string expression including literals.' },
        { text: 'void printBio(const std::string bio)', why: 'The `const` only stops the function from modifying its *own copy*; the expensive copy still happens.' },
      ],
      explanation:
        '`const std::string&` is the classic answer for read-only access to a potentially large string: no copy, no accidental modification, and it binds to temporaries. In modern code, `std::string_view` is an equally good (often better) choice for this exact situation.',
    },
    {
      kind: 'concept',
      title: 'The guideline: cheap by value, everything else by const&',
      blocks: [
        {
          type: 'p',
          text: 'You now have three options, and choosing between them is a daily decision in C++. The [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rf-in) reduce it to a simple rule for inputs: **pass cheaply copied types by value, and others by reference to const.** Use a non-const reference only when the function must modify the caller\'s object.',
        },
        {
          type: 'table',
          headers: ['Situation', 'Parameter style', 'Example'],
          rows: [
            ['Read a small type', 'By value', '`float distance(float a, float b)`'],
            ['Read a large or heap-owning type', '`const&`', '`bool hasItem(const std::string& name)`'],
            ['Read text only', '`std::string_view`', '`void log(std::string_view msg)`'],
            ['Modify the caller\'s object', '`&`', '`void heal(int& hp, int amount)`'],
          ],
        },
        {
          type: 'p',
          text: '"Cheap" roughly means the fundamental types, small views like `std::string_view`, and small types of a couple of machine words (16 bytes or so) that do not own heap memory. Anything that owns memory, such as `std::string` or the containers in the next unit, goes by `const&`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not pass everything by const&?',
          text: 'Because a reference is not free either. It is usually implemented as an address, so the function must read the value *through* memory instead of having it in a register. Worse, the compiler must assume the referenced object could be changed by any other write in the function (it might be aliased), which blocks optimizations. For an `int`, the copy is cheaper than the indirection. `const int&` is legal but is a small pessimization and signals that the author did not know the rule.',
        },
        {
          type: 'deepdive',
          title: 'Aliasing in action',
          blocks: [
            {
              type: 'p',
              text: 'Two references can refer to the same object. The compiler must generate code that is correct even then, and so must you:',
            },
            {
              type: 'code',
              runnable: true,
              code: `#include <iostream>

void addTwice(int& total, const int& amount) {
    total += amount;
    total += amount;
}

int main() {
    int x = 5;
    addTwice(x, x);
    std::cout << x << '\\n';
}`,
              output: '20',
              annotations: [
                { lines: 3, text: '`const int&` only promises that *this function* will not write through `amount`. It does not promise the object will not change.' },
                { lines: 10, text: 'Both parameters alias `x`. The first line makes `x` 10, so `amount` is now 10 too, and the second line makes it 20, not 15.' },
              ],
            },
            {
              type: 'p',
              text: 'Had `amount` been a plain `int`, it would have been a copy (5) and the result would be 15. Passing small types by value sidesteps this whole class of surprise.',
            },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Select **all** signatures that follow the guideline for read-only inputs.',
      multi: true,
      codeOptions: true,
      options: [
        { text: 'float distance(float a, float b)', correct: true, why: '`float` is cheap to copy, so by value is right.' },
        { text: 'bool hasItem(const std::string& itemName)', correct: true, why: '`std::string` may own heap memory, so read-only access goes through `const&`.' },
        { text: 'int scale(const int& value)', why: 'Works, but an `int` is cheaper to copy than to access through a reference. Pass it by value.' },
        { text: 'void logMessage(std::string message)', why: 'If the function only prints `message`, this copies the string for nothing. Use `const std::string&` or `std::string_view`.' },
        { text: 'char toUpper(char c)', correct: true, why: 'A `char` is a single byte: by value is ideal.' },
      ],
      explanation:
        'The rule is about cost: copy when the copy is trivially cheap (fundamental types, small views), refer when the copy could be expensive (strings, containers, large types). `const int&` is not wrong, just pointless; `std::string` by value for read-only use is a real, if silent, performance bug.',
    },
    {
      kind: 'concept',
      title: 'Out-parameters vs return values',
      blocks: [
        {
          type: 'p',
          text: 'An **out-parameter** is a reference parameter whose only job is to receive a result: the caller passes a variable, the function writes into it. Older C and C++ code uses them everywhere. Modern C++ prefers to return results, because data flowing *out through the return value* is easier to read than data sneaking out through an argument.',
        },
        {
          type: 'compare',
          left: {
            title: 'Out-parameters',
            tone: 'bad',
            code: `void statsForLevel(int level,
                   int& outHp,
                   int& outMana);

int hp;    // must exist first,
int mana;  // uninitialized
statsForLevel(3, hp, mana);`,
            text: 'Caller must declare variables first, cannot make them `const`, and cannot tell from the call which arguments are inputs and which are outputs.',
          },
          right: {
            title: 'Return a value',
            tone: 'good',
            code: `struct Stats {
    int hp;
    int mana;
};

Stats statsForLevel(int level);

const Stats s = statsForLevel(3);`,
            text: 'Data flows one way. The result can be `const`, used with `auto`, or passed straight into another call.',
          },
        },
        {
          type: 'p',
          text: 'The [[struct]] on the right simply bundles named values into one type; you will learn to write them properly in the classes unit. The point here is the shape of the data flow, and [[copy-elision|copy elision]] makes returning it just as cheap as writing through references.',
        },
        {
          type: 'p',
          text: 'Reference parameters are still the right tool when the function genuinely **updates** an existing object (an *in-out* parameter), or for the common "try" pattern, where the return value reports success:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

bool tryBuy(int price, int& gold) {
    if (gold < price) {
        return false;
    }
    gold -= price;
    return true;
}

int main() {
    int gold = 120;
    if (tryBuy(80, gold)) {
        std::cout << "Bought sword, gold left: " << gold << '\\n';
    }
    if (!tryBuy(80, gold)) {
        std::cout << "Cannot afford another, gold: " << gold << '\\n';
    }
}`,
          output: 'Bought sword, gold left: 40\nCannot afford another, gold: 40',
          annotations: [
            { lines: 3, text: '`gold` is an in-out parameter: read to check affordability, then updated. The `bool` return reports whether the purchase happened.' },
            { lines: 5, text: 'On failure the caller\'s gold is left untouched, which is an important part of the function\'s contract.' },
            { lines: 13, text: 'The call reads naturally in an `if`. Later units show `std::optional`, a modern way to return "a value or nothing".' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'The Out prefix in Unreal',
          text: 'Epic\'s coding standard recommends prefixing reference parameters that a function writes to with `Out`, so the call site intent is obvious from the signature. You will see it all over the engine, for example `LineTraceSingleByChannel(FHitResult& OutHit, const FVector& Start, const FVector& End, ...)`: the trace writes what it hit into `OutHit`, and reads `Start` and `End` through `const&`.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Out-parameters are generally faster than returning a value, because returning a large object always copies it.',
      answer: false,
      explanation:
        'Returning a value is subject to copy elision: the result is usually constructed directly in the caller\'s variable, so no copy happens (guaranteed since C++17 for returned temporaries). Out-parameters have no speed advantage in modern C++ and make code harder to read, which is why the Core Guidelines say to prefer return values for outputs.',
    },
    {
      kind: 'concept',
      title: 'Never return a reference to a local',
      blocks: [
        {
          type: 'p',
          text: 'Functions can *return* references too. That is useful when the referenced object outlives the call, but deadly when it does not. A local variable dies when its stack frame is popped, so a reference to it is left referring to memory that no longer belongs to anything: a [[dangling-reference|dangling reference]].',
        },
        {
          type: 'code',
          code: `const std::string& rankName(int score) {
    std::string rank = score > 1000 ? "Gold" : "Bronze";
    return rank;   // returns a reference to a local
}

const std::string& r = rankName(1500);
std::cout << r;    // undefined behavior: rank is gone`,
          annotations: [
            { lines: 1, text: 'The return type is a reference, so the function hands back an alias, not a value.' },
            { lines: 3, text: '`rank` is destroyed as the function returns. GCC warns: *reference to local variable rank returned*.' },
            { lines: 7, text: 'Reading through a dangling reference is [[undefined-behavior|undefined behavior]]. It may print garbage, crash, or appear to work today and fail after an unrelated change.' },
          ],
        },
        {
          type: 'memory',
          caption: 'After rankName returns, r refers into a popped frame.',
          regions: [
            {
              label: 'Stack — rankName() (popped, memory may be reused)',
              kind: 'other',
              cells: [{ id: 'dead', name: 'rank', type: 'std::string', value: '(destroyed)' }],
            },
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [{ name: 'r', type: 'const std::string&', value: '(dangling)', pointsTo: 'dead', highlight: true }],
            },
          ],
        },
        {
          type: 'p',
          text: 'The fix is to return **by value**: `std::string rankName(int score)`. Returning a reference is fine when the object lives on after the call, for example when it was passed in by reference:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

int& strongerHp(int& a, int& b) {
    return (a > b) ? a : b;
}

int main() {
    int knight = 80;
    int ogre = 120;
    strongerHp(knight, ogre) -= 30;
    std::cout << knight << ' ' << ogre << '\\n';
}`,
          output: '80 90',
          annotations: [
            { lines: 3, text: 'Returns an alias to one of the caller\'s own variables, which are still alive after the call. Safe.' },
            { lines: 10, text: 'The call result *is* `ogre`, so `-= 30` damages the ogre directly.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'const& parameters can bind to temporaries',
          text: 'A function like `const std::string& longer(const std::string& a, const std::string& b)` is safe when called with variables. But `const std::string& r = longer("axe", "sword");` binds the parameters to temporaries that die at the end of that statement, so `r` dangles on the next line. Returning a reference is a promise about lifetime that the *caller* has to keep. When in doubt, return by value.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This compiles with a warning but has undefined behavior. Tap a line that causes it.',
      code: `#include <iostream>
#include <string>

const std::string& titleFor(int level) {
    std::string title = level >= 50 ? "Champion" : "Recruit";
    return title;
}

int main() {
    std::cout << titleFor(60) << '\\n';
}`,
      bugLines: [4, 6],
      hint: 'When is `title` destroyed, and what does the caller receive?',
      explanation:
        'The function returns a *reference* (line 4) to `title`, a local that is destroyed when the function returns (line 6). The caller then reads through a dangling reference. Change the return type to `std::string` (return by value); copy elision makes that just as efficient, and it is correct.',
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>

void update(int a, int& b, const int& c) {
    a += 1;
    b += c;
}

int main() {
    int x = 1;
    int y = 2;
    int z = 3;
    update(x, y, z);
    std::cout << x << y << z << '\\n';
}`,
      options: [
        { text: '253', why: '`a` is a by-value copy, so incrementing it does not change `x`.' },
        { text: '123', why: '`b` is a reference to `y`, so `b += c` really does add 3 to `y`.' },
        { text: '153', correct: true, why: '`x` is unchanged (copy), `y` becomes 2 + 3 = 5 (reference), and `z` cannot be modified through a `const&`.' },
        { text: '156', why: '`c` is a `const&`: the function can read `z` but cannot change it, and nothing writes to it.' },
      ],
      explanation:
        'The three parameter styles side by side: by value isolates (`x` stays 1), by reference modifies the caller (`y` becomes 5), and by const reference reads without copying or modifying (`z` stays 3). Reading a signature tells you exactly which arguments a call can change.',
    },
  ],
  takeaways: [
    'Pass by value gives the function its own copy: safe and isolating, but expensive for objects that own heap memory.',
    'A reference (`T&`) is an alias. A reference parameter lets a function modify the caller\'s variable, and it must bind to a real variable.',
    '`const T&` reads a large object without copying, enforces read-only access, and accepts temporaries and literals.',
    'The guideline: cheap types (ints, floats, bools, views) by value; everything else by `const&`; `&` only when you must modify.',
    'Prefer returning results over out-parameters; use reference parameters for genuine in-out updates or "try" functions.',
    'Never return a reference to a local variable: it dangles the moment the function returns. Return by value instead.',
  ],
  reading: [
    {
      title: 'C++ Core Guidelines F.16: pass cheap types by value, others by const&',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rf-in',
      source: 'core-guidelines',
      note: 'The official version of this lesson\'s guideline, with the reasoning and exceptions; F.20 next to it covers return values vs out-parameters.',
    },
    {
      title: 'Reference declaration',
      url: 'https://en.cppreference.com/w/cpp/language/reference',
      source: 'cppreference',
      note: 'Precise rules for references, including binding to temporaries and dangling references.',
    },
    {
      title: 'Pass by lvalue reference',
      url: 'https://www.learncpp.com/cpp-tutorial/pass-by-lvalue-reference/',
      source: 'learncpp',
      note: 'A beginner-friendly treatment of reference parameters with extra exercises.',
    },
    {
      title: 'Epic C++ Coding Standard',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine',
      source: 'unreal-docs',
      note: 'See the naming section for the `Out` parameter prefix and how Unreal passes `FString` and other large types.',
    },
  ],
};
