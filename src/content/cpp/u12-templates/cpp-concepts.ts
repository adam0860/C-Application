import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-concepts',
  title: 'Constraining Templates with Concepts',
  summary: 'Say what your templates need in plain code — and turn pages of template errors into one clear sentence.',
  minutes: 18,
  objectives: [
    'Explain why unconstrained templates produce confusing errors and unclear interfaces',
    'Constrain templates with `requires` clauses and the standard concepts from `<concepts>`',
    'Write your own concept using a `requires` expression',
    'Use constrained `auto` and recognize the four equivalent ways to spell a constraint',
    'Overload functions on concepts and predict which overload wins',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'The problem: invisible requirements',
      blocks: [
        {
          type: 'p',
          text: 'Every template quietly demands things from its type parameters. This `average` needs `T` to support `+=` and division — but nothing in its **signature** says so. You only find out by reading the body, or by calling it with the wrong type:',
        },
        {
          type: 'code',
          code: `template <typename T>
T average(const std::vector<T>& values) {
    T sum{};
    for (const T& v : values) sum += v;
    return sum / values.size();
}

std::vector<std::string> names{"Ayla", "Brom"};
average(names);   // compiles?`,
          annotations: [
            { lines: '1-2', text: 'The declaration accepts *any* `T`. A caller reading only this line has no idea what is allowed.' },
            { lines: 5, text: 'The hidden requirement: `T` divided by a size must work. `std::string` supports `+=` (concatenation) but not `/`.' },
            { lines: 9, text: 'Deduction happily picks `T = std::string`. The failure only appears later, while the compiler instantiates the body.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ output',
          code: `In instantiation of 'T average(const std::vector<T>&)
    [with T = std::string]':
  required from here
error: no match for 'operator/' (operand types are
    'std::string' and 'std::vector<std::string>::size_type')
    5 |     return sum / values.size();`,
          annotations: [
            { lines: 4, text: 'The error points at line 5 of the *template* — code the caller may never have seen, perhaps deep inside a library.' },
          ],
        },
        {
          type: 'p',
          text: 'Here the template is ours and the message is short. With library templates the failing line is often several calls deep in internal helpers. Try `std::sort` on a `std::list` and g++ complains about a missing `operator-` inside a function called `std::__sort` in `stl_algo.h`, followed by a list of candidates that do not match — nowhere does it say "`std::sort` needs random-access iterators and a list does not have them".',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why concepts were added',
          text: 'A [[concept]] is a named, compile-time true/false test on types. Attaching one to a template moves its requirements **into the interface**: the compiler checks them at the call site, *before* instantiating anything, and reports which requirement failed. Readers learn what the template accepts from the declaration alone, and — as you will see — the compiler can choose between overloads based on what a type can do.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Twenty years in the making',
          text: 'Stroustrup wanted constraints on templates from the beginning. A large "concepts" design was voted into the C++0x draft and then removed in 2009 as too complex. A simpler version ("Concepts Lite") was published as a Technical Specification in 2015, and finally became part of C++20. GCC, Clang and MSVC all support it.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Calling `std::sort(scores.begin(), scores.end())` on a `std::list<int>` produces an error about a missing `operator-` inside `stl_algo.h`. Why does the error look like that?',
      options: [
        {
          text: 'You forgot to `#include <list>`, so the compiler cannot find the subtraction operator',
          why: 'If `<list>` were missing, declaring `std::list<int>` would already fail. The operator is genuinely absent: list iterators cannot jump by distance.',
        },
        {
          text: 'Inside its body `std::sort` subtracts two iterators, which list iterators do not support, and the problem is only discovered while instantiating that body',
          correct: true,
          why: 'Classic templates have no declared requirements, so the compiler only notices the mismatch when an expression in the body fails to compile.',
        },
        {
          text: '`std::sort` only works on containers of numbers',
          why: '`std::sort` sorts anything comparable with `<`, including strings. The issue is the iterator kind, not the element type.',
        },
        {
          text: 'It is a bug in the standard library that was fixed in C++20',
          why: 'Nothing is broken: the call is invalid. C++20 offers a constrained version, `std::ranges::sort`, whose error names the unmet requirement instead — that is the improvement concepts bring.',
        },
      ],
      explanation:
        'An unconstrained template accepts any type during [[template-argument-deduction|deduction]], so the mismatch surfaces only when some expression in the body fails, possibly many calls deep. The message describes a *symptom* (no `operator-`) rather than the *cause* (a list is not random-access). Concepts fix this by checking requirements at the call site.',
    },
    {
      kind: 'concept',
      title: 'requires clauses',
      blocks: [
        {
          type: 'p',
          text: 'The most direct way to constrain a template is a [[requires-clause|requires clause]]: the keyword `requires` followed by a compile-time `bool` expression, usually built from concepts. The template is only usable for types that make it `true`.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <concepts>
#include <iostream>

template <typename T>
    requires std::integral<T>
T percentOf(T value, T percent) {
    return value * percent / 100;
}

int main() {
    std::cout << percentOf(250, 40) << '\\n';
    std::cout << percentOf(7L, 50L) << '\\n';
    // percentOf(2.5, 50.0);  // error: constraints not satisfied
}`,
          output: `100
3`,
          annotations: [
            { lines: 1, text: 'The standard concepts live in `<concepts>`.' },
            { lines: 5, text: '`std::integral<T>` is `true` for `int`, `long`, `char`, `bool` and the other integer types. Placed right after the template parameter list, this clause filters which `T` are allowed.' },
            { lines: 7, text: 'Integer arithmetic is intended here: 7 × 50 / 100 truncates to 3. The constraint documents that this function was designed for whole numbers.' },
            { lines: 13, text: 'With `double` arguments the constraint is `false`, so the call is rejected *at this line*, before the body is ever looked at.' },
          ],
        },
        {
          type: 'p',
          text: 'Constrain `average` with `requires std::floating_point<T>` and the earlier `std::string` call now fails at the call site, with a message that states the actual problem:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ output with the constraint',
          code: `error: no matching function for call to 'average(std::vector<std::string>&)'
note: candidate: 'template<class T> requires floating_point<T>
      T average(const std::vector<T>&)'
note: constraints not satisfied
note: the expression 'is_floating_point_v<_Tp>
      [with _Tp = std::string]' evaluated to 'false'`,
          annotations: [
            { lines: 4, text: 'The key message: the requirement was checked and failed. No instantiation of the body was attempted.' },
            { lines: '5-6', text: 'It even tells you which test failed and for which type.' },
          ],
        },
        {
          type: 'list',
          items: [
            'Combine constraints with `&&` and `||`: `requires std::integral<T> || std::floating_point<T>`.',
            'Other constant expressions work too, but need parentheses unless they are a simple name such as `std::is_integral_v<T>`: write `requires (sizeof(T) <= 16)`.',
            'A clause can also trail the function declarator: `T percentOf(T value, T percent) requires std::integral<T>`.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Not satisfied means "not a candidate", not "error"',
          text: 'During [[overload-resolution]], a template whose constraints are not satisfied is simply removed from the list of candidates. You only get an error if *no* candidate remains. This is what makes constraints more than nicer error messages: you can write several versions of a function for different kinds of types, and let the compiler pick the one whose requirements are met.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'If a call matches two function templates and one of them has a `requires` clause that is not satisfied for the argument types, the call still compiles using the other template.',
      answer: true,
      explanation:
        'An unsatisfied constraint silently removes that template from overload resolution; it is not an error by itself. The call compiles using the remaining candidate. Only when every candidate is eliminated do you get "no matching function", together with notes explaining which constraints failed.',
    },
    {
      kind: 'concept',
      title: 'The standard concepts',
      blocks: [
        {
          type: 'p',
          text: 'Before writing your own, reach for the ones the standard library already defines. The core set lives in `<concepts>`:',
        },
        {
          type: 'table',
          headers: ['Concept', 'True when…'],
          rows: [
            ['`std::integral<T>`', '`T` is an integer type (`int`, `char`, `long long`, `bool`…)'],
            ['`std::signed_integral<T>` / `std::unsigned_integral<T>`', '`T` is an integer type that is signed / unsigned'],
            ['`std::floating_point<T>`', '`T` is `float`, `double` or `long double`'],
            ['`std::same_as<T, U>`', '`T` and `U` are exactly the same type'],
            ['`std::convertible_to<From, To>`', '`From` can be implicitly converted to `To`'],
            ['`std::derived_from<D, B>`', '`D` is publicly derived from `B` (or is `B`)'],
            ['`std::equality_comparable<T>`', '`T` supports `==` and `!=`'],
            ['`std::totally_ordered<T>`', '`T` supports `<`, `>`, `<=`, `>=` (and equality)'],
            ['`std::copyable<T>` / `std::movable<T>`', '`T` can be copied / moved'],
            ['`std::invocable<F, Args...>`', '`F` can be called with arguments of types `Args...`'],
          ],
        },
        {
          type: 'p',
          text: 'There is a shorthand when a constraint applies to a single parameter: write the concept **in place of `typename`**. The concept receives the parameter as its first argument, so `template <std::derived_from<Enemy> T>` means `requires std::derived_from<T, Enemy>`.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <concepts>
#include <iostream>
#include <memory>
#include <string>

struct Enemy {
    virtual ~Enemy() = default;
    virtual std::string name() const { return "Enemy"; }
};
struct Goblin : Enemy {
    std::string name() const override { return "Goblin"; }
};
struct Treasure {};

template <std::derived_from<Enemy> T>
std::unique_ptr<Enemy> spawn() {
    auto enemy = std::make_unique<T>();
    std::cout << "Spawned " << enemy->name() << '\\n';
    return enemy;
}

int main() {
    auto first = spawn<Goblin>();
    auto second = spawn<Enemy>();
    // spawn<Treasure>();  // error: constraints not satisfied
}`,
          output: `Spawned Goblin
Spawned Enemy`,
          annotations: [
            { lines: 15, text: 'A type-constraint instead of `typename`: only `Enemy` and classes derived from it are accepted.' },
            { lines: 19, text: 'The `std::unique_ptr<Goblin>` converts to `std::unique_ptr<Enemy>` on return — guaranteed to work because of the constraint.' },
            { lines: 24, text: '`derived_from<Enemy, Enemy>` is true: a class counts as derived from itself for this concept.' },
            { lines: 25, text: 'A `Treasure` is not an enemy. The compiler refuses at this line instead of failing somewhere inside `make_unique` or the conversion.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: '`same_as` vs `convertible_to`',
          text: '`std::same_as<T, int>` accepts exactly `int` and nothing else — not `short`, not `long`. `std::convertible_to<T, int>` accepts anything that converts implicitly, including `double` (with truncation). Prefer the looser concept unless the exact type really matters. Iterator and range concepts such as `std::random_access_iterator` live in `<iterator>` and `<ranges>`; you will meet them in the next unit.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Concepts and Unreal',
          text: 'Unreal\'s `TSubclassOf<AEnemy>` solves a similar problem at run time for class references chosen in the editor. For your own templates, recent engine versions (UE 5.3 and later) compile game modules as C++20 by default, so standard concepts work. Many engine headers still use older tricks such as `TEnableIf` — Unreal\'s version of `std::enable_if` — because they were written to support compilers without concepts. When you see one, read it as "this template is constrained".',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Constrain `lerp` to floating-point types, and `registerEnemy` to types derived from `Enemy`.',
      template: `template <std::___ T>
T lerp(T from, T to, T alpha) {
    return from + (to - from) * alpha;
}

template <typename T>
    requires std::___<T, Enemy>
void registerEnemy(T& enemy);`,
      blanks: [{ answers: ['floating_point'] }, { answers: ['derived_from'] }],
      wordBank: ['floating_point', 'derived_from', 'integral', 'same_as', 'convertible_to', 'signed_integral'],
      explanation:
        '`lerp` with an `alpha` like 0.5 only makes sense for floating-point types; `std::integral` would allow it to silently truncate. For enemies, `std::derived_from<T, Enemy>` accepts `Enemy` and every subclass, whereas `std::same_as<T, Enemy>` would reject `Goblin`, and `std::convertible_to` is about value conversions rather than class hierarchies.',
    },
    {
      kind: 'concept',
      title: 'Writing your own concept',
      blocks: [
        {
          type: 'p',
          text: 'The standard concepts describe general properties. Your game needs concepts about *your* abstractions: "something that can take damage". A concept definition is `template <...> concept Name = constraint-expression;`, and the most useful expression is a [[requires-expression|requires expression]] that lists operations which must compile:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <concepts>
#include <iostream>

template <typename T>
concept Damageable = requires(T target, int amount) {
    target.takeDamage(amount);
    { target.isAlive() } -> std::convertible_to<bool>;
};

struct Player {
    int hp = 100;
    void takeDamage(int amount) { hp -= amount; }
    bool isAlive() const { return hp > 0; }
};

struct Barrel {
    int durability = 30;
    void takeDamage(int amount) { durability -= amount; }
    bool isAlive() const { return durability > 0; }
};

static_assert(Damageable<Player>);
static_assert(!Damageable<int>);

template <Damageable T>
void explode(T& target) {
    target.takeDamage(50);
    std::cout << (target.isAlive() ? "survived" : "destroyed")
              << '\\n';
}

int main() {
    Player hero;
    Barrel barrel;
    explode(hero);
    explode(barrel);
}`,
          output: `survived
destroyed`,
          annotations: [
            { lines: 5, text: '`requires(T target, int amount)` introduces imaginary variables to write expressions with. They are never created, and nothing here runs — the compiler only checks whether the expressions *would* compile.' },
            { lines: 6, text: 'A **simple requirement**: `target.takeDamage(amount)` must be a valid expression. Its return type does not matter.' },
            { lines: 7, text: 'A **compound requirement**: the expression must compile *and* its type must satisfy `std::convertible_to<..., bool>`. The expression\'s type is slotted in as the concept\'s first argument.' },
            { lines: '22-23', text: 'A concept is just a compile-time `bool`. `static_assert` is a cheap way to check that your types satisfy it — right next to their definitions.' },
            { lines: 25, text: 'Use your concept exactly like a standard one. `Player` and `Barrel` share no base class; they just have the right member functions.' },
          ],
        },
        {
          type: 'table',
          headers: ['Requirement', 'Syntax inside `requires { }`', 'Checks that…'],
          rows: [
            ['Simple', '`a + b;`', 'the expression compiles'],
            ['Compound', '`{ a.size() } -> std::integral;`', 'it compiles and its type satisfies a concept'],
            ['Type', '`typename T::value_type;`', 'the named type exists'],
            ['Nested', '`requires sizeof(T) <= 64;`', 'a further constant expression is `true`'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Concepts check syntax, not meaning',
          text: 'The compiler only verifies that the listed expressions compile with suitable types. It cannot check that `takeDamage` actually reduces health, or that a type\'s `<` is a consistent ordering. Those *semantic* expectations are part of a concept\'s documented contract, and satisfying the syntax while breaking the meaning is a logic bug the compiler will not catch.',
        },
        {
          type: 'deepdive',
          title: 'What does `requires requires` mean?',
          blocks: [
            {
              type: 'p',
              text: 'The keyword `requires` has two jobs: it starts a *requires clause* (a constraint on a template) and a *requires expression* (a `bool` test listing operations). Using an expression directly inside a clause, without naming a concept, produces the odd-looking double keyword:',
            },
            {
              type: 'code',
              code: `template <typename T>
    requires requires(T t) { t.reload(); }
void prepare(T& weapon);`,
              annotations: [
                { lines: 2, text: 'The first `requires` begins the clause; the second begins an expression. It works, but a named concept such as `Reloadable` reads far better and can be reused.' },
              ],
            },
          ],
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Arrange the lines to define a `Healable` concept and then a function template constrained by it.',
      lines: [
        'template <typename T>',
        'concept Healable = requires(T unit, int amount) {',
        '    unit.heal(amount);',
        '};',
        'template <Healable T>',
        'void restore(T& unit) { unit.heal(25); }',
      ],
      distractors: ['typename Healable = requires(T unit, int amount) {', 'void restore(Healable unit) { unit.heal(25); }'],
      explanation:
        'A concept is a template, so it starts with `template <typename T>`, followed by `concept Name = ...;` — the closing `};` ends both the requires-expression body and the definition. It must be declared before it is used, so the constrained function comes second. `typename Healable` is not how you introduce a concept, and a concept name cannot be used as a parameter type on its own: you would need `Healable auto unit`.',
    },
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which of these types satisfy the `Damageable` concept from the previous card? Select all that apply.',
      codeOptions: true,
      options: [
        {
          text: 'struct Crate {\n    void takeDamage(int amount);\n    bool isAlive() const;\n};',
          correct: true,
          why: 'Both required expressions compile, and `isAlive()` returns `bool`. This is the textbook match.',
        },
        {
          text: 'struct Shield {\n    int takeDamage(double amount);\n    int isAlive() const;\n};',
          correct: true,
          why: 'Surprising but true: `takeDamage(amount)` compiles because the `int` converts to `double`, a simple requirement ignores the return type, and an `int` result is convertible to `bool`.',
        },
        {
          text: 'struct Statue {\n    void takeDamage(int amount);\n};',
          why: 'There is no `isAlive()`, so the compound requirement fails to compile.',
        },
        {
          text: 'struct Ghost {\n    void takeDamage(int amount);\n    std::string isAlive() const;\n};',
          why: '`isAlive()` compiles, but `std::string` is not convertible to `bool`, so the `-> std::convertible_to<bool>` part fails.',
        },
      ],
      explanation:
        'A concept is a purely syntactic check of the expressions you list, with the usual implicit conversions allowed. That makes it flexible — `Shield` qualifies even though nobody designed it with `Damageable` in mind — but also means you should write requirements precisely. Use `std::same_as<bool>` instead of `std::convertible_to<bool>` if you really need an exact return type.',
    },
    {
      kind: 'concept',
      title: 'Constrained auto and the four spellings',
      blocks: [
        {
          type: 'p',
          text: 'Remember abbreviated templates with `auto` parameters? Put a concept in front of `auto` and you get a constrained one. The same works for return types and even local variables, where it checks the deduced type:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <concepts>
#include <iostream>
#include <string_view>

void logStat(std::string_view label, std::integral auto value) {
    std::cout << label << ": " << value << '\\n';
}

std::floating_point auto speedFor(int level) {
    return 3.5 + level * 0.25;
}

int main() {
    logStat("Gold", 120);
    logStat("Kills", 7u);
    std::floating_point auto speed = speedFor(4);
    std::cout << "Speed: " << speed << '\\n';
    // logStat("Speed", speed);  // error: double is not integral
}`,
          output: `Gold: 120
Kills: 7
Speed: 4.5`,
          annotations: [
            { lines: 5, text: '`std::integral auto` is an abbreviated template whose invented parameter must satisfy `std::integral`. Both `int` and `unsigned` arguments work.' },
            { lines: 9, text: 'On a return type, the deduced type is checked: if someone later changes the body to return an `int`, this line stops compiling instead of silently changing behavior.' },
            { lines: 16, text: 'On a variable, it documents and verifies what you expect `auto` to deduce — `auto` with a safety net.' },
          ],
        },
        {
          type: 'p',
          text: 'All four forms below declare the same constrained template. Pick the shortest one that stays readable:',
        },
        {
          type: 'table',
          headers: ['Form', 'Example'],
          rows: [
            ['requires clause', '`template <typename T> requires std::integral<T> void f(T x);`'],
            ['trailing requires clause', '`template <typename T> void f(T x) requires std::integral<T>;`'],
            ['type-constraint', '`template <std::integral T> void f(T x);`'],
            ['constrained auto', '`void f(std::integral auto x);`'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Choosing a form',
          text: 'Use a type-constraint (`template <std::integral T>`) for most templates — short, and `T` is still nameable. Use constrained `auto` for small functions that never need to name the type. Use a requires clause when the condition involves several parameters (`requires std::convertible_to<From, To>`) or combines tests with `||`.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This concept definition does not compile. Tap the faulty line.',
      code: `#include <concepts>

template <typename T>
concept Damageable = requires(T target, int amount) {
    target.takeDamage(amount);
    { target.isAlive() } -> bool;
};

struct Player {
    int hp = 100;
    void takeDamage(int amount) { hp -= amount; }
    bool isAlive() const { return hp > 0; }
};

static_assert(Damageable<Player>);`,
      bugLines: [6],
      hint: 'What is allowed after the arrow in a compound requirement?',
      explanation:
        'After `->` in a compound requirement you must name a **concept**, not a type; g++ says "return-type-requirement is not a type-constraint". The concept receives the expression\'s type as its first argument. Write `-> std::convertible_to<bool>` to accept anything usable as a condition, or `-> std::same_as<bool>` to demand exactly `bool`. (Early concept drafts allowed a plain type here, which is why you may see it in old articles.)',
    },
    {
      kind: 'concept',
      title: 'Overloading on concepts',
      blocks: [
        {
          type: 'p',
          text: 'Because unsatisfied constraints remove candidates, you can write several overloads that differ only in their constraints. And when more than one is viable, the compiler prefers the **most constrained** one:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <concepts>
#include <iostream>
#include <string>

void describe(auto) {
    std::cout << "something else\\n";
}
void describe(std::integral auto value) {
    std::cout << "integer " << value << '\\n';
}
void describe(std::signed_integral auto value) {
    std::cout << "signed integer " << value << '\\n';
}
void describe(std::floating_point auto value) {
    std::cout << "floating-point " << value << '\\n';
}

int main() {
    describe(-42);
    describe(42u);
    describe(2.5);
    describe(std::string{"loot"});
}`,
          output: `signed integer -42
integer 42
floating-point 2.5
something else`,
          annotations: [
            { lines: 5, text: 'An unconstrained fallback that accepts anything. The parameter is unnamed because the body never uses it.' },
            { lines: [8, 11], text: 'For an `int`, both of these are viable. `std::signed_integral` is *defined* as `std::integral<T> && std::is_signed_v<T>`, so it is strictly more specific, and it wins.' },
            { lines: 20, text: '`unsigned` fails `signed_integral`, so the plain `std::integral` overload is the most constrained one left.' },
            { lines: 22, text: 'A `std::string` satisfies none of the constrained overloads; only the fallback remains.' },
          ],
        },
        {
          type: 'p',
          text: 'The rule behind this is [[constraint-subsumption]]: if one overload\'s constraints logically include everything another\'s require *and more*, it is more constrained. Any constrained overload also beats an unconstrained one when everything else is equal.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Subsumption only sees through named concepts',
          text: 'If you write raw type traits instead — `requires std::is_integral_v<T>` on one overload and `requires std::is_integral_v<T> && std::is_signed_v<T>` on another — the compiler treats the two `is_integral_v` tests as unrelated expressions, and calling it with an `int` is **ambiguous**. Build overload sets from concepts, which the compiler can compare.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'What this replaces',
          text: 'Before C++20, choosing an implementation by type capability required tricks with names like SFINAE, `std::enable_if` and tag dispatch — powerful but notoriously hard to read. Concept-based overloading expresses the same intent in ordinary-looking declarations.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Using the four `describe` overloads from the previous card, what does `describe(true);` print?',
      options: [
        { text: 'something else', why: '`bool` is not left to the fallback: the standard counts it as an integral type, so constrained overloads are viable.' },
        { text: 'signed integer 1', why: '`std::is_signed_v<bool>` is `false`, so `std::signed_integral<bool>` is not satisfied.' },
        { text: 'integer 1', correct: true, why: '`bool` satisfies `std::integral` but not `std::signed_integral`, and `std::cout` prints `true` as `1` by default.' },
        { text: 'integer true', why: 'Without `std::boolalpha`, streams print `bool` values as `1` and `0`.' },
      ],
      explanation:
        'Concepts follow the language\'s type categories exactly, including the corner cases: `bool` (and `char`) are integral types. If your `std::integral` overload must not accept `bool`, add `&& !std::same_as<T, bool>` — or define a concept with that name, such as `Number`. Always check the edge cases of a standard concept before relying on it.',
    },
    {
      kind: 'concept',
      title: 'Using concepts well',
      blocks: [
        {
          type: 'list',
          items: [
            '**Constrain every template you write** — at minimum with what its body actually uses. An unconstrained parameter promises "anything", which is almost never true.',
            '**Prefer standard concepts** (`std::integral`, `std::invocable`, `std::totally_ordered`…). Readers already know them, and they compose correctly.',
            '**Name concepts after capabilities, not types**: `Damageable`, `Saveable`, `Spawnable` — not `PlayerLike`. A concept describes what you can *do* with a type.',
            '**Do not over-constrain.** Requiring `std::same_as<T, int>` when `std::integral<T>` would do throws away the point of a template.',
            '**Test your types** with `static_assert(Concept<Type>)` beside the type, so a broken requirement is caught where the type is defined.',
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Unconstrained',
            tone: 'bad',
            code: `template <typename T>
void applyBuff(T& unit, float amount);`,
            text: 'Accepts anything. Misuse is reported deep inside the body, and the reader must study the implementation to learn what `T` needs.',
          },
          right: {
            title: 'Constrained',
            tone: 'good',
            code: `template <Buffable T>
void applyBuff(T& unit, float amount);`,
            text: 'The interface states the requirement. Misuse is reported at the call, naming `Buffable`.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why bother, if the unconstrained version also works?',
          text: 'Constraints turn a template\'s hidden assumptions into checked documentation. They catch misuse earlier, make error messages useful, enable overloading by capability, and stop a template from "accidentally" accepting a type that compiles but does the wrong thing. In a large game code base where dozens of people call your utilities, that clarity pays for itself quickly.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which declaration is **not** a valid way to write a template constrained to integral types?',
      codeOptions: true,
      options: [
        {
          text: 'void addXp(std::integral auto amount);',
          why: 'Valid: constrained `auto` creates an abbreviated template whose parameter must satisfy `std::integral`.',
        },
        {
          text: 'template <std::integral T>\nvoid addXp(T amount);',
          why: 'Valid: a type-constraint in place of `typename`.',
        },
        {
          text: 'void addXp(std::integral amount);',
          correct: true,
          why: 'Invalid: a concept is not a type, so it cannot be used as one. It must constrain something — `std::integral auto` or a template parameter.',
        },
        {
          text: 'template <typename T>\nvoid addXp(T amount) requires std::integral<T>;',
          why: 'Valid: a trailing requires clause after the function declarator.',
        },
      ],
      explanation:
        'Concepts constrain types; they are not types themselves. The four valid spellings — requires clause, trailing requires clause, type-constraint and constrained `auto` — all produce the same template. Writing a bare concept name as a parameter type is a compile error, which is why `auto` must follow it.',
    },
  ],
  takeaways: [
    'Unconstrained templates hide their requirements in the body; misuse is reported deep inside the instantiation.',
    'A concept is a named compile-time predicate on types; a `requires` clause attaches one to a template and is checked at the call site.',
    'Unsatisfied constraints remove a template from overload resolution rather than causing an error by themselves.',
    'Use standard concepts from `<concepts>` first: `std::integral`, `std::floating_point`, `std::same_as`, `std::convertible_to`, `std::derived_from`…',
    'Write your own concepts with `requires` expressions (simple, compound, type and nested requirements); they check syntax, not meaning.',
    'Constrained `auto` (`std::integral auto x`) works for parameters, return types and variables.',
    'Overloads constrained by concepts are chosen by subsumption: the most constrained viable overload wins — and `bool` counts as integral.',
  ],
  reading: [
    {
      title: 'Constraints and concepts',
      url: 'https://en.cppreference.com/w/cpp/language/constraints',
      source: 'cppreference',
      note: 'The full language rules: requires clauses, how constraints are normalized, and how subsumption picks an overload.',
    },
    {
      title: 'Concepts library',
      url: 'https://en.cppreference.com/w/cpp/concepts',
      source: 'cppreference',
      note: 'Every standard concept with its exact definition — useful for checking edge cases like `bool` and `char`.',
    },
    {
      title: 'Requires expression',
      url: 'https://en.cppreference.com/w/cpp/language/requires',
      source: 'cppreference',
      note: 'Details of simple, type, compound and nested requirements.',
    },
    {
      title: 'C++ Core Guidelines: T.10 Specify concepts for all template arguments',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rt-concepts',
      source: 'core-guidelines',
      note: 'The reasoning behind constraining every template, plus neighboring rules on designing good concepts.',
    },
  ],
};
