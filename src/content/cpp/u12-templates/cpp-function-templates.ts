import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-function-templates',
  title: 'Function Templates and Type Deduction',
  summary: 'Write one function that works for every type — and see exactly what the compiler generates from it.',
  minutes: 18,
  objectives: [
    'Explain why templates beat copy-pasted overloads, macros and `void*` for generic code',
    'Write a function template and call it with deduced and explicit template arguments',
    'Predict when template argument deduction succeeds, fails, or surprises you',
    'Describe template instantiation and its costs: code bloat and compile time',
    'Explain why template definitions live in header files',
    'Use C++20 abbreviated templates with `auto` parameters and know how they differ from a single `T`',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'One function, many types',
      blocks: [
        {
          type: 'p',
          text: 'Your game needs a `maxOf` helper. First for `int` scores, then for `double` damage values, then for `std::string` names when sorting a leaderboard. With [[function-overloading]] you end up with three functions whose bodies are character-for-character identical:',
        },
        {
          type: 'code',
          code: `int maxOf(int a, int b) {
    return (a > b) ? a : b;
}
double maxOf(double a, double b) {
    return (a > b) ? a : b;
}
std::string maxOf(std::string a, std::string b) {
    return (a > b) ? a : b;
}`,
          annotations: [
            { lines: [2, 5, 8], text: 'The same logic, three times. Only the **types** differ. Fix a bug in one copy and you must remember to fix the other two — and the fourth, when someone adds `float`.' },
          ],
        },
        {
          type: 'p',
          text: 'Before templates, C programmers had two escape hatches. A [[macro]] such as `#define MAX(a, b) ((a) > (b) ? (a) : (b))` is pure text substitution: it has no types, ignores [[scope]], and pastes each argument in **twice**. Or you could pass `void*` and a size, the way C\'s `qsort` does — the compiler forgets the real type entirely, so a wrong cast compiles happily and becomes [[undefined-behavior]] at run time.',
        },
        {
          type: 'compare',
          left: {
            title: 'Macro: text pasting',
            tone: 'bad',
            code: `#define MAX(a, b) ((a) > (b) ? (a) : (b))

int best = MAX(rollDice(), 3);
// expands to:
// ((rollDice()) > (3) ? (rollDice()) : (3))`,
            text: 'No type checking, arguments evaluated twice, ignores namespaces, errors point at expanded gibberish.',
          },
          right: {
            title: 'Template: compiler-generated code',
            tone: 'good',
            code: `template <typename T>
T maxOf(T a, T b) {
    return (a > b) ? a : b;
}

int best = maxOf(rollDice(), 3);`,
            text: 'A real function: arguments evaluated once, fully type-checked, respects scope, can be stepped into in a debugger.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why templates are the C++ answer',
          text: 'A [[template]] lets you write the logic once with a *placeholder* for the type. The [[compiler]] then generates a genuine, fully type-checked function for each type you actually use. You get the convenience of a macro, the safety of hand-written overloads, and none of the run-time cost of `void*`: the generated code is exactly what you would have typed yourself. This style — writing algorithms independently of the types they operate on — is called [[generic-programming]].',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Where templates came from',
          text: 'Bjarne Stroustrup added templates to C++ around 1990, mainly so container classes would not need macros or `void*`. Alexander Stepanov then used them to build the Standard Template Library (STL) — containers, iterators and algorithms — which was adopted into the first C++ standard, C++98. Every `std::vector<int>` you have written is a template at work.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Using the `MAX` macro from the comparison, what is wrong with `int best = MAX(rollDice(), 3);`?',
      options: [
        {
          text: 'It does not compile, because macros cannot accept function calls as arguments',
          why: 'Macros accept any text as arguments. That is precisely the problem: they paste whatever you give them, function calls included.',
        },
        {
          text: 'Nothing — the preprocessor evaluates `rollDice()` once and reuses the value',
          why: 'The preprocessor never evaluates anything. It only manipulates text before the compiler runs, so it cannot "remember" a value.',
        },
        {
          text: 'The macro converts the result to `void*`, losing the type',
          why: 'Macros involve no types at all, `void*` or otherwise. The issue is duplicated evaluation, not a type conversion.',
        },
        {
          text: 'If the roll beats 3, `rollDice()` is called a second time, so `best` may not be the roll that was compared',
          correct: true,
          why: 'The macro pastes `rollDice()` into both the condition and the result. Two calls, two different random numbers — a classic macro bug.',
        },
      ],
      explanation:
        'A macro is substituted as text, so every use of a parameter becomes a separate copy of the argument expression. Anything with a side effect — a function call, `++hp`, reading input — runs once per copy. A function template receives its arguments as normal parameters, so each argument is evaluated exactly once, before the call.',
    },
    {
      kind: 'concept',
      title: 'Writing your first function template',
      blocks: [
        {
          type: 'p',
          text: 'A [[function-template]] starts with the keyword `template` followed by a **template parameter list** in angle brackets. Inside the function you use the parameter name wherever a type would go:',
        },
        {
          type: 'code',
          title: 'max_of.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

template <typename T>
T maxOf(T a, T b) {
    return (a > b) ? a : b;
}

int main() {
    std::cout << maxOf(3, 7) << '\\n';
    std::cout << maxOf(2.5, 1.25) << '\\n';
    std::cout << maxOf(std::string{"Axe"}, std::string{"Sword"}) << '\\n';
}`,
          output: `7
2.5
Sword`,
          annotations: [
            { lines: 4, text: '`template <typename T>` declares that what follows is a template with one **type parameter** named `T`. `T` is just a conventional name — `Value` or `Stat` would work too.' },
            { lines: 5, text: '`T` stands in for a type everywhere: the return type and both parameters. Both arguments must therefore end up with the *same* type.' },
            { lines: 6, text: 'The body only needs `T` to support `>` and copying. Any type that does — `int`, `double`, `std::string`, your own classes — can be used.' },
            { lines: 10, text: 'Called with two `int`s, so the compiler works out `T = int` and generates `int maxOf(int, int)`.' },
            { lines: 12, text: '`std::string` compares alphabetically, so `"Sword"` is greater than `"Axe"`. Same template, completely different `>` underneath.' },
          ],
        },
        {
          type: 'definition',
          term: 'Template parameter vs. template argument',
          text: 'The **parameter** is the placeholder in the declaration (`T`). The **argument** is the concrete type that replaces it for a particular use (`int`, `std::string`). This mirrors function parameters and arguments, just one level up: function templates take *types* as inputs at compile time.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A mould, not a part',
          text: 'A function template is like a mould in a forge. The mould itself is not a sword — you cannot swing it. Pour in steel (`int`) and you get one sword; pour in bronze (`std::string`) and you get another. Each casting is a real, separate object; the mould only describes the shape.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: '`typename` or `class`?',
          text: 'You will also see `template <class T>`. In a template parameter list the two keywords mean exactly the same thing, and `T` can still be `int`. `typename` was added during standardization because `class` misleadingly suggests only class types are allowed; most modern code prefers it.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'By value or by const reference?',
          text: 'Our `maxOf` takes `T` by value to keep things simple. That is cheap for `int` but copies two strings for `std::string`. Real generic code usually takes `const T&` (as `std::max` does), because the template has no idea how expensive `T` is to copy — so it assumes the worst.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the function template so it clamps any numeric stat between a minimum and a maximum.',
      template: `___ <typename T>
___ clampStat(T value, T low, ___ high) {
    if (value < low) return low;
    if (value > high) return high;
    return value;
}`,
      blanks: [{ answers: ['template'] }, { answers: ['T'] }, { answers: ['T'] }],
      wordBank: ['template', 'T', 'typename', 'auto', 'int', 'void'],
      explanation:
        'Every function template begins with `template <...>`. The return type is `T` because we hand back one of the inputs, and `high` must be `T` too so all three parameters share one type. Writing `int` would quietly break the template for `float` health or `double` speed values.',
    },
    {
      kind: 'concept',
      title: 'Template argument deduction',
      blocks: [
        {
          type: 'p',
          text: 'Notice that we never wrote `maxOf<int>(3, 7)`. The compiler looked at the argument types and worked out `T` on its own. This is [[template-argument-deduction]]: each function argument is matched against its parameter, and every match must agree on what `T` is.',
        },
        {
          type: 'p',
          text: 'For a by-value parameter `T`, deduction follows exactly the rules you learned for `auto x = expr;` — references and top-level `const` are stripped, and arrays decay to pointers:',
        },
        {
          type: 'table',
          headers: ['Argument expression', 'Its type', 'Deduced `T` for `T param`'],
          rows: [
            ['`42`', '`int`', '`int`'],
            ['a `const int maxHp`', '`const int`', '`int` (top-level `const` dropped — you get a copy)'],
            ['an `int& ref`', '`int&`', '`int` (the reference is looked through)'],
            ['`"Goblin"`', '`const char[7]`', '`const char*` (the array decays)'],
            ['a `std::string name`', '`std::string`', '`std::string`'],
          ],
        },
        {
          type: 'p',
          text: 'When two arguments disagree, deduction fails. Deduction does **not** apply implicit conversions — it will not quietly turn your `int` into a `double`:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ output for maxOf(level, bonus) with int level, double bonus',
          code: `error: no matching function for call to 'maxOf(int&, double&)'
note: candidate: 'template<class T> T maxOf(T, T)'
note:   template argument deduction/substitution failed:
note:   deduced conflicting types for parameter 'T' ('int' and 'double')`,
          annotations: [
            { lines: 4, text: 'The key line. From the first argument `T` would be `int`; from the second it would be `double`. Rather than guess, the compiler gives up.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why no conversions during deduction?',
          text: 'If the compiler were allowed to convert while deducing, `maxOf(3, 4.5)` could mean `maxOf<int>` (losing the `.5`) or `maxOf<double>` — and with user-defined types there could be dozens of candidates. Requiring an exact agreement keeps deduction predictable: the type you get is always visible in the arguments you wrote. Once `T` is fixed (for example by writing it explicitly), normal conversions apply again.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The string-literal trap',
          text: '`maxOf("Zed", "Amy")` compiles — but `T` is deduced as `const char*`, so `>` compares the two **addresses**, not the text. The result is unspecified and may differ between compilers or builds. Pass `std::string` objects, or force the type with `maxOf<std::string>("Zed", "Amy")`.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This program fails to compile. Tap the line the compiler rejects.',
      code: `#include <iostream>

template <typename T>
T maxOf(T a, T b) {
    return (a > b) ? a : b;
}

int main() {
    int baseDamage = 12;
    float critDamage = 18.5f;
    float hit = maxOf(baseDamage, critDamage);
    std::cout << hit << '\\n';
}`,
      bugLines: [11],
      hint: 'Look at the types of the two arguments, and remember that deduction does not convert.',
      explanation:
        'Line 11 asks the compiler to deduce one `T` from an `int` and a `float`: "deduced conflicting types for parameter T". Assigning the result to a `float` does not help — return types never take part in deduction. Fix it by choosing the type yourself, `maxOf<float>(baseDamage, critDamage)`, which lets the `int` convert normally, or by making both variables the same type.',
    },
    {
      kind: 'concept',
      title: 'Explicit template arguments',
      blocks: [
        {
          type: 'p',
          text: 'You can always skip deduction and state the template arguments yourself, in angle brackets after the function name. Explicit arguments fill the template parameters from left to right; any you leave out are deduced.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

template <typename T>
T maxOf(T a, T b) {
    return (a > b) ? a : b;
}

template <typename To, typename From>
To convertTo(From value) {
    return static_cast<To>(value);
}

int main() {
    int level = 3;
    double bonus = 4.5;
    // maxOf(level, bonus);    // error: is T int or double?
    std::cout << maxOf<double>(level, bonus) << '\\n';
    std::cout << convertTo<int>(bonus) << '\\n';
}`,
          output: `4.5
4`,
          annotations: [
            { lines: 8, text: 'Two type parameters. `To` appears only in the return type, so it can **never** be deduced from the arguments — the caller must name it.' },
            { lines: 17, text: '`T` is fixed to `double`, so this is an ordinary call to `double maxOf(double, double)`, and `level` converts from `int` to `double` as usual.' },
            { lines: 18, text: 'We specify only `To = int`. `From` is still deduced from `bonus` as `double`. Putting the non-deducible parameter **first** is what makes this partial specification possible.' },
          ],
        },
        {
          type: 'p',
          text: 'You have used explicit template arguments for a while without the name: `std::make_unique<Enemy>(...)` must be told which type to create, because the constructor arguments alone cannot reveal it.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Everywhere in Unreal',
          text: 'Unreal\'s API leans heavily on function templates with explicit arguments: `CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"))`, `Cast<AEnemy>(OtherActor)`, `FindComponentByClass<UHealthComponent>()` and `GetWorld()->SpawnActor<AProjectile>(...)`. In each case the type you want back cannot be deduced from the arguments, so you name it — exactly like `convertTo<int>` above. Helpers such as `FMath::Max` and `FMath::Clamp` are deduced templates like our `maxOf`.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>

template <typename T>
T half(T value) {
    return value / 2;
}

int main() {
    std::cout << half(9.8) << ' ';
    std::cout << half<int>(9.8) << '\\n';
}`,
      options: [
        { text: '4.9 4.9', why: 'The second call fixes `T = int`, so the argument is converted to `int` before the function runs. It cannot return a fractional value.' },
        { text: '4.9 4', correct: true, why: 'First call: `T` deduced as `double`, 9.8 / 2 = 4.9. Second call: `T` forced to `int`, 9.8 becomes 9, and integer division 9 / 2 gives 4.' },
        { text: '4.9 5', why: 'Converting `double` to `int` truncates toward zero (9.8 becomes 9), and integer division truncates again (9 / 2 is 4). Nothing rounds up.' },
        { text: 'It does not compile: 9.8 is not an `int`', why: 'With an explicit `T`, normal implicit conversions apply to the argument, exactly as for a non-template `int half(int)`.' },
      ],
      explanation:
        'Explicit template arguments switch off deduction for those parameters. The call becomes an ordinary call to the instantiated function `int half(int)`, so the `double` argument is implicitly converted — losing the fraction — and the body performs [[integer-division]]. This is why explicit arguments are powerful but deserve care: they can silently select a type that changes your results.',
    },
    {
      kind: 'concept',
      title: 'Several template parameters',
      blocks: [
        {
          type: 'p',
          text: 'A template can have as many parameters as it needs, and each one is deduced independently. You can also mix template parameters with ordinary, fixed-type parameters:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string_view>

template <typename T, typename U>
auto scaled(T base, U factor) {
    return base * factor;
}

template <typename T>
void printStat(std::string_view label, const T& value) {
    std::cout << label << ": " << value << '\\n';
}

int main() {
    printStat("Damage", scaled(45, 1.5));
    printStat("Gold", scaled(25, 4));
    printStat("Class", "Ranger");
}`,
          output: `Damage: 67.5
Gold: 100
Class: Ranger`,
          annotations: [
            { lines: 4, text: '`T` and `U` are separate parameters, so the two arguments may have different types: `scaled(45, 1.5)` deduces `T = int`, `U = double`.' },
            { lines: 5, text: 'What type is `int * double`? The usual arithmetic conversions say `double`. Rather than work that out for every `T`/`U` pair, the return type is `auto`, deduced from the `return` statement.' },
            { lines: 10, text: 'Only `value` is generic; `label` is always a `std::string_view`. Taking `const T&` avoids copying whatever `T` turns out to be.' },
            { lines: 17, text: 'With a reference parameter, arrays do **not** decay: `T` is deduced as `char[7]` and `value` refers to the literal itself. Printing it works either way.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Only add a parameter for each independent type',
          text: 'Use one `T` when the arguments *must* match (two scores being compared). Use separate parameters when they are genuinely independent (a base value and a multiplier). Each extra parameter also multiplies the number of possible instantiations, which matters for the next card.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Instantiation: the compiler writes the code',
      blocks: [
        {
          type: 'p',
          text: 'A template on its own produces **no machine code**. Code appears only through [[template-instantiation]]: when the compiler sees `maxOf(3, 7)`, it stamps out a concrete function with `T` replaced by `int`, then compiles that function like any other.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Read the template', text: 'The compiler parses the template and checks what it can without knowing `T` — basic syntax, and names that do not depend on `T`.' },
            { title: 'Deduce', text: 'At a call such as `maxOf(3, 7)` it deduces the template arguments: `T = int`.' },
            { title: 'Substitute and instantiate', text: 'It replaces every `T` with `int`, producing the function `maxOf<int>`. Now the body is fully checked: does `int` support `>`?' },
            { title: 'Compile and reuse', text: 'The instantiation is optimized like hand-written code. Every later `maxOf` call with `int` arguments in this file reuses the same function.' },
            { title: 'Merge at link time', text: 'If several files instantiate `maxOf<int>`, each object file holds a copy marked as mergeable, and the [[linker]] keeps just one.' },
          ],
        },
        {
          type: 'p',
          text: 'Because the body is only fully checked at instantiation, a template places **implicit requirements** on `T`: whatever the body does must compile for that type. Try a struct with no `>` operator and the error points *inside* the template:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ output for maxOf(Loot{...}, Loot{...})',
          code: `In instantiation of 'T maxOf(T, T) [with T = Loot]':
  required from here
error: no match for 'operator>' (operand types are
       'Loot' and 'Loot')
    6 |     return (a > b) ? a : b;`,
          annotations: [
            { lines: 1, text: 'The compiler tells you which instantiation failed and, on the next line, which call caused it. In real code this chain can be dozens of levels deep — the problem C++20 [[concept|concepts]] solve, two lessons from now.' },
          ],
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>

template <typename T>
T maxOf(T a, T b) {
    return (a > b) ? a : b;
}

struct Loot {
    std::string name;
    int value;
};

bool operator>(const Loot& a, const Loot& b) {
    return a.value > b.value;
}

int main() {
    Loot best = maxOf(Loot{"Gem", 120}, Loot{"Ring", 90});
    std::cout << best.name << " (" << best.value << " gold)\\n";
}`,
          output: 'Gem (120 gold)',
          annotations: [
            { lines: '14-16', text: 'Give `Loot` the one operation the template needs — [[operator-overloading|overload]] `>` — and `maxOf<Loot>` instantiates cleanly. The template never had to know `Loot` exists.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Zero run-time cost — paid for at compile time',
          text: 'Instantiated code is ordinary code: no run-time type checks, and small functions like `maxOf<int>` are usually inlined away completely. That is why `std::sort` (a template) typically beats C\'s `qsort`, which calls its comparison through a `void*` function pointer the optimizer rarely sees through. The price: every distinct set of template arguments produces another copy of the code (**code bloat** — bigger executables, more instruction-cache pressure) and more work for the compiler (longer builds).',
        },
        {
          type: 'deepdive',
          title: 'See the instantiations in an object file',
          blocks: [
            { type: 'p', text: 'Compile `max_of.cpp` from earlier to an object file and list its symbols, demangled:' },
            {
              type: 'code',
              lang: 'shell',
              code: `g++ -std=c++20 -c max_of.cpp -o max_of.o
nm -C max_of.o | grep maxOf`,
            },
            {
              type: 'code',
              lang: 'text',
              code: `W double maxOf<double>(double, double)
W int maxOf<int>(int, int)
W std::string maxOf<std::string>(std::string, std::string)`,
              annotations: [
                { lines: '1-3', text: 'One symbol per instantiation (the `std::string` line is shortened here; the real one spells out `std::basic_string<char, ...>`). `W` marks a **weak** symbol: the linker is allowed to see the same one in many object files and keep a single copy.' },
              ],
            },
            {
              type: 'p',
              text: 'Some linkers go further with *identical code folding*: if `maxOf<long>` and `maxOf<long long>` compile to the same machine instructions on your platform (both are 64-bit on most 64-bit Linux systems), MSVC\'s `/OPT:ICF` or LLVM `lld`\'s `--icf=all` can merge them, trimming some of the bloat.',
            },
          ],
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'If one `.cpp` file calls `maxOf` with two `int` arguments in 50 different places, the compiler instantiates `maxOf<int>` only once for that file.',
      answer: true,
      explanation:
        'Instantiation happens once per unique set of template arguments per [[translation-unit]]. All 50 calls use the single `maxOf<int>`. Code bloat comes from *different* argument sets — `maxOf<int>`, `maxOf<float>`, `maxOf<Loot>` — not from calling one instantiation many times. (The optimizer may still inline the body at some call sites, but that is a per-call optimization, not extra instantiations.)',
    },
    {
      kind: 'concept',
      title: 'Why templates live in headers',
      blocks: [
        {
          type: 'p',
          text: 'You learned to put declarations in a [[header-file]] and definitions in a `.cpp` file. Do that with a template and you get a surprise:',
        },
        {
          type: 'code',
          code: `// ---- stats.h ----
#pragma once
template <typename T>
T average(T a, T b);              // declaration only

// ---- stats.cpp ----
#include "stats.h"
template <typename T>
T average(T a, T b) {             // definition here
    return (a + b) / 2;
}

// ---- main.cpp ----
#include "stats.h"
#include <iostream>
int main() {
    std::cout << average(10, 20) << '\\n';
}`,
          annotations: [
            { lines: '3-4', text: 'main.cpp sees only this promise. It deduces `T = int` but has no body to instantiate, so it emits a call to `average<int>` and trusts the linker to find it.' },
            { lines: '8-11', text: 'stats.cpp has the body, but nothing in stats.cpp *uses* `average<int>` — so it never instantiates it. A template that is never instantiated generates no code.' },
            { lines: 18, text: 'Result: a [[linker-error]], because no object file contains `int average<int>(int, int)`.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Linker output',
          code: `main.cpp:(.text+0x13): undefined reference to
    \`int average<int>(int, int)'
collect2: error: ld returned 1 exit status`,
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the compiler needs the whole body',
          text: 'Each `.cpp` file is compiled on its own, and instantiation happens *while compiling the file that uses the template*. To generate `average<int>`, the compiler must see the full definition right there. So template definitions go in the header. This does not break the [[one-definition-rule]]: like `inline` functions, templates may be defined in many translation units as long as every definition is identical, and the linker merges the resulting instantiations.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'The escape hatch: explicit instantiation',
          text: 'If you truly want the body hidden in a `.cpp`, you can add `template int average<int>(int, int);` to stats.cpp. This **explicit instantiation** forces that version to be generated there. The catch: callers can only use the types you listed. It is mostly used to cut compile times in large code bases.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Why Unreal builds take a while',
          text: 'Unreal\'s `TArray`, `TMap` and friends are templates, so their full implementations live in headers that thousands of engine and game files include. This is a big part of why Unreal relies on precompiled headers and *unity builds* (gluing many `.cpp` files into one before compiling): the same template code would otherwise be parsed over and over.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Your build fails with `undefined reference to \'float lerp<float>(float, float, float)\'`. The header `Math.h` declares the `lerp` template and `Math.cpp` defines it. What is the most likely fix?',
      options: [
        {
          text: 'Add `#include "Math.cpp"` to every file that calls `lerp`',
          why: 'This would technically expose the body, but including `.cpp` files breaks the normal build model and invites duplicate-definition errors for any non-template code in them. Put template definitions in the header instead.',
        },
        {
          text: 'Declare `lerp` as `extern` in the header',
          why: 'Functions already have external linkage. The problem is not visibility of a symbol; it is that no file ever generated the `float` instantiation.',
        },
        {
          text: 'Move the template\'s definition into `Math.h` so every file that calls `lerp` can instantiate it',
          correct: true,
          why: 'Right. Instantiation happens in the calling file, so it needs the body. Header-only definition is the standard practice.',
        },
        {
          text: 'Call it as `lerp<float>(...)` instead of letting the compiler deduce `T`',
          why: 'Explicit arguments change how `T` is chosen, not whether a body is available. The call site still cannot instantiate a function it has no definition for.',
        },
      ],
      explanation:
        'A template is a recipe, and the recipe must be in front of the compiler at the place the dish is ordered. Since `Math.cpp` never uses `lerp<float>`, nothing instantiated it, and the linker found only a call with no target. Either move the definition to the header (the usual answer) or add an explicit instantiation for `float` in `Math.cpp`.',
    },
    {
      kind: 'concept',
      title: 'Abbreviated templates: `auto` parameters (C++20)',
      blocks: [
        {
          type: 'p',
          text: 'C++20 lets you skip the `template <...>` line for simple cases: write `auto` as a parameter type and the function silently becomes a template. This is an [[abbreviated-function-template]].',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

auto larger(auto a, auto b) {
    return (a > b) ? a : b;
}

void announce(const auto& item) {
    std::cout << "Picked up: " << item << '\\n';
}

int main() {
    std::cout << larger(3, 7.5) << '\\n';
    std::cout << larger(10, 4) << '\\n';
    announce("Health Potion");
    announce(3);
}`,
          output: `7.5
10
Picked up: Health Potion
Picked up: 3`,
          annotations: [
            { lines: 3, text: 'Each `auto` parameter invents its **own** template parameter. This is `template <typename T1, typename T2> auto larger(T1 a, T2 b)` — not one shared `T`.' },
            { lines: 7, text: '`const auto&` works too: it is `template <typename T> void announce(const T& item)`.' },
            { lines: 12, text: 'Compiles even though the types differ: `a` is `int`, `b` is `double`. The `?:` operator converts both to their common type, `double`, so the result is 7.5.' },
          ],
        },
        {
          type: 'table',
          headers: ['Abbreviated', 'Equivalent full template'],
          rows: [
            ['`void f(auto x)`', '`template <typename T> void f(T x)`'],
            ['`void f(const auto& x)`', '`template <typename T> void f(const T& x)`'],
            ['`void f(auto a, auto b)`', '`template <typename T, typename U> void f(T a, U b)`'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why each `auto` is independent',
          text: 'Making two `auto` parameters share a type would be a hidden rule nobody could see in the code. Treating each `auto` exactly like `auto` in a variable declaration — "deduce *this one* from its initializer" — keeps the feature consistent. When two parameters **must** match, or you need to name the type inside the body, write the full `template <typename T>` form.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Coming soon',
          text: 'The same `auto` parameter trick appears in generic lambdas in the next unit, and the concepts lesson shows how to write `std::integral auto` to accept only certain kinds of types.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which full template is exactly equivalent to `auto larger(auto a, auto b);`?',
      codeOptions: true,
      options: [
        {
          text: 'template <typename T>\nauto larger(T a, T b);',
          why: 'This forces both arguments to have the same type, so `larger(3, 7.5)` would fail to deduce. Abbreviated templates do not share a type between `auto` parameters.',
        },
        {
          text: 'template <typename T, typename U>\nauto larger(T a, U b);',
          correct: true,
          why: 'Each `auto` parameter introduces its own invented template parameter, in order.',
        },
        {
          text: 'auto larger(int a, int b);',
          why: '`auto` in a parameter list does not mean "int" or any fixed type — it makes the function a template that accepts any type.',
        },
        {
          text: 'template <typename T>\nT larger(auto a, auto b);',
          why: 'This adds a third template parameter `T` that cannot be deduced (it appears only in the return type), so every call would need `larger<SomeType>(...)`.',
        },
      ],
      explanation:
        'An abbreviated function template is shorthand: every `auto` in the parameter list is replaced by a fresh, independent template parameter. That is convenient for small helpers, but it means "these two must be the same type" can only be expressed with the full syntax (or, later, with a constraint).',
    },
    {
      kind: 'order',
      prompt: 'Arrange the lines into a function template that adds up every element of a `std::vector<T>` and works for both numbers and strings.',
      lines: [
        'template <typename T>',
        'T total(const std::vector<T>& values) {',
        '    T sum{};',
        '    for (const T& v : values) sum += v;',
        '    return sum;',
        '}',
      ],
      distractors: ['    T sum;', 'template <T>'],
      explanation:
        'Deduction can see *inside* compound types: passing a `std::vector<int>` matches `const std::vector<T>&` with `T = int`. `T sum{};` [[value-initialization|value-initializes]] the accumulator — `0` for numbers, an empty string for `std::string` — whereas `T sum;` would leave an `int` uninitialized and reading it would be undefined behavior. `template <T>` is not valid syntax: a type parameter needs `typename` (or `class`).',
    },
  ],
  takeaways: [
    'A function template is a compile-time recipe: the compiler generates a real, type-checked function for each set of template arguments you use.',
    'Templates replace copy-pasted overloads, macros (text pasting, double evaluation) and `void*` (no type safety) for generic code.',
    'Template argument deduction works out `T` from the arguments without implicit conversions; conflicting deductions are errors, and string literals deduce `const char*`.',
    'Explicit template arguments (`maxOf<double>(...)`, `make_unique<Enemy>()`) override deduction and are required when a parameter appears only in the return type.',
    'Each unique set of template arguments is one instantiation: zero run-time overhead, but more code and longer builds.',
    'Template definitions belong in headers, because the file that uses a template must see its full body to instantiate it.',
    'In C++20, `auto` parameters create abbreviated templates — and every `auto` is an independent type.',
  ],
  reading: [
    {
      title: 'Function template',
      url: 'https://en.cppreference.com/w/cpp/language/function_template',
      source: 'cppreference',
      note: 'The full rules for declaring, instantiating and explicitly instantiating function templates, including abbreviated templates.',
    },
    {
      title: 'Template argument deduction',
      url: 'https://en.cppreference.com/w/cpp/language/template_argument_deduction',
      source: 'cppreference',
      note: 'Every deduction rule in detail — look for how references, `const` and arrays are adjusted before matching.',
    },
    {
      title: 'Function templates',
      url: 'https://www.learncpp.com/cpp-tutorial/function-templates/',
      source: 'learncpp',
      note: 'A gentle walkthrough with more exercises; follow on to the neighboring lessons on instantiation and multiple template types.',
    },
    {
      title: 'Using function templates in multiple files',
      url: 'https://www.learncpp.com/cpp-tutorial/using-function-templates-in-multiple-files/',
      source: 'learncpp',
      note: 'The header-placement rule explained step by step, with the same linker error you saw here.',
    },
    {
      title: 'C++ Core Guidelines: Templates and generic programming',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-templates',
      source: 'core-guidelines',
      note: 'Expert guidance on when and how to write templates; skim the T.1–T.10 rules first.',
    },
  ],
};
