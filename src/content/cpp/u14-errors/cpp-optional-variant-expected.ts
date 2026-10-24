import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-optional-variant-expected',
  title: 'optional, variant and expected',
  summary: 'Errors and "maybe" values as ordinary types: std::optional, std::variant, std::expected — and when to use which.',
  minutes: 18,
  objectives: [
    'Return "maybe a value" with `std::optional` and read it safely with `has_value`, `value_or`, `*` and `value()`',
    'Model "one of several types" with `std::variant`, and process it with `std::visit` and the overloaded-lambdas trick',
    'Report recoverable errors with `std::expected` (C++23), carrying the reason for the failure',
    'Choose between exceptions, `optional`, `expected`, `variant`, assertions and error codes for a given situation',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Errors as values',
      blocks: [
        {
          type: 'p',
          text: 'The last two lessons covered exceptions, which shine for **rare** failures far from where they can be handled. But many "failures" are perfectly ordinary: the item isn\'t in the inventory, the player typed letters into a number field, the save slot is empty. These are expected outcomes, and the caller right next to the call usually knows what to do about them. They belong in the **return value**.',
        },
        {
          type: 'p',
          text: 'Before C++17, returning "no result" meant improvising. Each workaround has a weakness:',
        },
        {
          type: 'table',
          headers: ['Old workaround', 'Example', 'Weakness'],
          rows: [
            ['Sentinel value', '`return -1;` for "not found"', 'Collides with real values (what if -1 is valid?) and nothing forces the caller to check.'],
            ['Null pointer', '`return nullptr;`', 'Only works when you already return a pointer, and dereferencing it unchecked crashes.'],
            ['bool + out-parameter', '`bool tryFind(int& out)`', 'Clumsy to call, needs a pre-declared variable, and `out` may be left garbage.'],
          ],
        },
        {
          type: 'p',
          text: 'Modern C++ has *vocabulary types* that put the possibility of failure into the type itself, where the compiler and every reader can see it: [[std-optional]] for "a value, or nothing", [[std-variant]] for "exactly one of these types", and [[std-expected]] for "a value, or an error explaining why not".',
        },
        {
          type: 'compare',
          left: {
            title: 'Sentinel',
            tone: 'bad',
            code: `int findSlot(const Bag& bag,
             std::string_view item);
// returns -1 if missing... probably?
bag.items[findSlot(bag, "Key")];`,
            text: 'The signature hides the failure case. Forgetting the check compiles fine and indexes with -1.',
          },
          right: {
            title: 'optional',
            tone: 'good',
            code: `std::optional<std::size_t>
findSlot(const Bag& bag,
         std::string_view item);`,
            text: 'The return type itself says "might be missing". To get at the number, the caller has to unwrap it.',
          },
        },
      ],
    },
    {
      kind: 'concept',
      title: 'std::optional<T>: a value or nothing',
      blocks: [
        {
          type: 'p',
          text: 'A `std::optional<T>` (header `<optional>`) either **contains** a `T` or is **empty**. You return a `T` to produce a value, or `std::nullopt` to produce an empty optional. Converting an optional to `bool` tests whether it contains something.',
        },
        {
          type: 'code',
          title: 'find_slot.cpp',
          runnable: true,
          code: `#include <iostream>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

std::optional<std::size_t> findSlot(
        const std::vector<std::string>& bag, std::string_view item) {
    for (std::size_t i = 0; i < bag.size(); ++i) {
        if (bag[i] == item) return i;
    }
    return std::nullopt;
}

int main() {
    const std::vector<std::string> bag{"Torch", "Rope", "Potion"};

    if (auto slot = findSlot(bag, "Potion")) {
        std::cout << "Potion in slot " << *slot << '\\n';
    }

    std::optional<std::size_t> key = findSlot(bag, "Key");
    std::cout << std::boolalpha << key.has_value() << '\\n';
    std::cout << key.value_or(99) << '\\n';
}`,
          output: `Potion in slot 2
false
99`,
          annotations: [
            { lines: 10, text: 'Returning a plain `std::size_t` implicitly wraps it in an engaged (non-empty) optional.' },
            { lines: 12, text: '`std::nullopt` is a special constant meaning "empty". It reads as clearly as `nullptr` does for pointers.' },
            { lines: 18, text: 'Declare and test in one go: the `if` body runs only when the optional holds a value, and `slot` is scoped to the `if`.' },
            { lines: 19, text: '`*slot` reads the contained value. Only do this after checking — on an empty optional it is undefined behavior.' },
            { lines: 23, text: '`has_value()` is the explicit spelling of the `bool` test.' },
            { lines: 24, text: '`value_or(fallback)` returns the value if present, otherwise the fallback. Perfect for defaults.' },
          ],
        },
        {
          type: 'memory',
          caption: 'An optional stores its value inline, plus a flag. No heap allocation: sizeof(std::optional<int>) is typically 8.',
          regions: [
            {
              label: 'Stack — std::optional<int> score{42}',
              kind: 'stack',
              cells: [
                { name: 'storage', type: 'int', value: '42' },
                { name: 'engaged', type: 'bool', value: 'true', highlight: true },
              ],
            },
            {
              label: 'Stack — std::optional<int> none',
              kind: 'stack',
              cells: [
                { name: 'storage', type: 'int', value: '(no object)' },
                { name: 'engaged', type: 'bool', value: 'false', highlight: true },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just return a pointer?',
          text: 'A pointer can express "nothing" too, but it raises questions an optional never does: who owns the pointee? How long does it live? Is it on the heap? An `std::optional<T>` **owns** its value, stores it right inside itself, and copies or destroys it along with the optional. It is a value type: returning one is as cheap as returning the `T` plus one flag.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this fragment print?',
      code: `std::optional<int> best;
std::optional<int> score{0};
std::cout << best.value_or(-1) << ' '
          << score.value_or(-1) << ' '
          << score.has_value();`,
      options: [
        { text: '`-1 -1 0`', why: 'An optional holding `0` is **not** empty. Zero is a perfectly good value; emptiness is tracked by a separate flag.' },
        { text: '`-1 0 1`', correct: true, why: '`best` is default-constructed, so it is empty and `value_or` returns -1. `score` holds 0, so `value_or` returns 0 and `has_value()` is true, printed as 1.' },
        { text: '`0 0 1`', why: 'A default-constructed optional does not hold a default `int`; it holds nothing at all.' },
        { text: '`-1 0 true`', why: 'Without `std::boolalpha`, a `bool` prints as `1` or `0`, not `true`.' },
      ],
      explanation:
        'An optional\'s emptiness is completely separate from the value it holds. `std::optional<int>{}` is empty; `std::optional<int>{0}` contains the value zero. Keep that distinction in mind — it is the root of the most common optional bug, coming up next.',
    },
    {
      kind: 'concept',
      title: 'Using optional well',
      blocks: [
        {
          type: 'p',
          text: 'There are two ways to read the value, and they differ exactly where it matters — when the optional is empty:',
        },
        {
          type: 'table',
          headers: ['Access', 'If empty', 'Use when'],
          rows: [
            ['`*opt` / `opt->member`', '[[undefined-behavior]]', 'You have just checked, so the cost of another check is pointless.'],
            ['`opt.value()`', 'Throws `std::bad_optional_access`', 'Emptiness would be a genuine error you want reported.'],
            ['`opt.value_or(x)`', 'Returns `x`', 'There is a sensible default.'],
          ],
        },
        {
          type: 'code',
          title: 'optional_ops.cpp',
          runnable: true,
          code: `#include <iostream>
#include <optional>

int main() {
    std::optional<int> ammo{0};   // engaged, holds 0
    std::optional<int> none;      // empty

    if (ammo) std::cout << "ammo is set (to " << *ammo << ")\\n";
    if (!none) std::cout << "none is empty\\n";

    try {
        std::cout << none.value() << '\\n';
    } catch (const std::bad_optional_access&) {
        std::cout << "value() threw\\n";
    }

    ammo.reset();                 // make it empty
    std::cout << ammo.has_value() << '\\n';
    ammo.emplace(30);             // construct a value in place
    std::cout << *ammo << '\\n';
}`,
          output: `ammo is set (to 0)
none is empty
value() threw
0
30`,
          annotations: [
            { lines: 8, text: '`if (ammo)` asks "does it contain a value?" — not "is the value non-zero?". It is true here even though the value is 0.' },
            { lines: 12, text: '`value()` checks for you and throws `std::bad_optional_access` (derived from `std::exception`) when empty.' },
            { lines: 17, text: '`reset()` destroys the contained value, if any. Assigning `std::nullopt` does the same.' },
            { lines: 19, text: '`emplace(args...)` constructs a new value directly inside the optional, destroying any previous one first.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The optional<bool> / optional<int> trap',
          text: 'With `std::optional<bool> isFriendly`, the test `if (isFriendly)` is true whenever a value is present — **including** `false`. The same goes for an optional `int` holding 0. When the contained value itself is a truth value or a number, compare explicitly: `if (isFriendly == true)` or `if (isFriendly.value_or(false))`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'optional as a member',
          text: 'Optionals are great for members that are legitimately absent part of the time: `std::optional<Weapon> equipped_;` says "maybe a weapon" far more clearly than a separate `bool hasWeapon_` that can drift out of sync. Note that `std::optional<T&>` is not allowed before C++26; for an optional *reference*, use a pointer.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'TOptional in Unreal',
          text: 'Unreal has its own equivalent, `TOptional<T>`, used throughout the engine. The names differ: `IsSet()` instead of `has_value()`, `GetValue()` for the value, `Get(Default)` instead of `value_or`, and `Reset()` / `Emplace()`. Same idea, same reasoning.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Given `std::optional<int> ammo{0};`, the condition `if (ammo)` is false.',
      answer: false,
      explanation:
        'Converting an optional to `bool` tests whether it **contains a value**, not what the value is. `ammo` contains 0, so `if (ammo)` is true. To test the value itself, unwrap it: `if (ammo && *ammo > 0)` or `if (ammo.value_or(0) > 0)`.',
    },
    {
      kind: 'concept',
      title: 'std::variant: exactly one of several types',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes a value can be one of several **different kinds** of thing. A pickup on the ground might be gold (an amount), a health pack (a heal value) or a weapon (a name and damage). A `std::variant<A, B, C>` (header `<variant>`) holds exactly one object of one of its alternative types at any time, and always knows which one.',
        },
        {
          type: 'code',
          title: 'pickup.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <variant>

struct Gold { int amount; };
struct HealthPack { int heal; };
struct Weapon { std::string name; int damage; };

using Pickup = std::variant<Gold, HealthPack, Weapon>;

int main() {
    Pickup p = Gold{50};
    std::cout << "index " << p.index() << '\\n';
    if (std::holds_alternative<Gold>(p)) {
        std::cout << "gold: " << std::get<Gold>(p).amount << '\\n';
    }

    p = Weapon{"Flame Sword", 35};   // Gold destroyed, Weapon built
    if (auto* w = std::get_if<Weapon>(&p)) {
        std::cout << "weapon: " << w->name << '\\n';
    }

    try {
        std::cout << std::get<HealthPack>(p).heal << '\\n';
    } catch (const std::bad_variant_access&) {
        std::cout << "not a health pack\\n";
    }
}`,
          output: `index 0
gold: 50
weapon: Flame Sword
not a health pack`,
          annotations: [
            { lines: 9, text: 'A [[type-alias]] keeps the long variant type readable. `Pickup` is now exactly one of the three structs.' },
            { lines: 13, text: '`index()` returns the zero-based position of the active alternative: `Gold` is index 0.' },
            { lines: 14, text: '`std::holds_alternative<T>` asks "is it currently a `T`?".' },
            { lines: 15, text: '`std::get<T>` returns a reference to the `T` inside. Safe here because we just checked.' },
            { lines: 18, text: 'Assigning a different alternative destroys the old object (`Gold`) and constructs the new one (`Weapon`), including its `std::string`.' },
            { lines: 19, text: '`std::get_if<T>` takes a **pointer** to the variant and returns a pointer to the `T`, or `nullptr` if it holds something else — check and access in one step.' },
            { lines: 24, text: 'Asking for the wrong alternative with `std::get` throws `std::bad_variant_access`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not a plain union?',
          text: 'C has `union`, which overlays several members in the same memory — but it does not record which member is active. Reading the wrong one is undefined behavior, and a union cannot correctly construct or destroy members like `std::string`. A variant is a **tagged union**: the same overlapped storage plus a small index, and it uses the index to construct, copy, destroy and check access correctly. Its size is roughly the largest alternative plus the tag, with no heap allocation.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'variant vs. inheritance',
          text: 'You could model pickups with a `Pickup` base class and virtual functions instead. Inheritance suits an **open** set of types — anyone can add a new subclass later. A variant suits a **closed** set known up front, stored by value with no heap allocation and no virtual calls, and lets you add new *operations* without touching the types. Game event queues, network messages and save-file records are classic variant territory.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: '`p` is a `std::variant<Gold, HealthPack, Weapon>` that currently holds a `Weapon`. What happens when this line runs?',
      code: 'int heal = std::get<HealthPack>(p).heal;',
      options: [
        { text: 'It returns a default-constructed `HealthPack`, so `heal` is 0', why: 'A variant never invents a value of a type it isn\'t holding. That would hide the bug.' },
        { text: 'Undefined behavior: it reinterprets the `Weapon`\'s bytes as a `HealthPack`', why: 'That is what reading the wrong member of a plain C `union` does. The variant checks its tag first.' },
        { text: 'It does not compile, because the variant might not hold a `HealthPack`', why: '`HealthPack` is one of the alternatives, so the call compiles. (Asking for a type that is **not** an alternative, like `std::get<int>(p)`, is the compile error.)' },
        { text: 'It throws `std::bad_variant_access`', correct: true, why: '`std::get<T>` checks the active alternative at run time and throws if it is not `T`.' },
      ],
      explanation:
        'Variants are **type-safe**: every access is checked. `std::get` throws on a mismatch, `std::get_if` returns `nullptr`, and `std::holds_alternative` lets you ask first. Even better, as the next card shows, `std::visit` lets you handle every alternative without asking at all.',
    },
    {
      kind: 'concept',
      title: 'std::visit and the overloaded trick',
      blocks: [
        {
          type: 'p',
          text: 'Chains of `holds_alternative` checks get long, and nothing reminds you to update them when you add a fourth pickup type. [[std-visit]] solves both problems: you give it a callable that can accept **every** alternative, and it calls the right overload for whatever the variant holds. If any alternative is not handled, the code does not compile.',
        },
        {
          type: 'p',
          text: 'A neat idiom lets you write one [[lambda]] per alternative, right at the call site. A tiny helper struct inherits from all the lambdas you give it, so it ends up with every one of their call operators as overloads:',
        },
        {
          type: 'code',
          title: 'visit.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <variant>
#include <vector>

struct Gold { int amount; };
struct HealthPack { int heal; };
struct Weapon { std::string name; int damage; };
using Pickup = std::variant<Gold, HealthPack, Weapon>;

template <typename... Ts>
struct Overloaded : Ts... {
    using Ts::operator()...;
};

int main() {
    std::vector<Pickup> loot{Gold{50}, Weapon{"Bow", 12},
                             HealthPack{25}};
    int gold = 0;
    for (const Pickup& p : loot) {
        std::visit(Overloaded{
            [&](const Gold& g) { gold += g.amount; },
            [](const HealthPack& h) {
                std::cout << "Healed " << h.heal << '\\n';
            },
            [](const Weapon& w) {
                std::cout << "Equipped " << w.name << '\\n';
            },
        }, p);
    }
    std::cout << "Gold: " << gold << '\\n';
}`,
          output: `Equipped Bow
Healed 25
Gold: 50`,
          annotations: [
            { lines: '11-14', text: 'The whole trick in four lines. `Ts...` is a *pack* of any number of types; the struct inherits from each one and `using Ts::operator()...;` pulls every lambda\'s call operator into one overload set.' },
            { lines: 21, text: '`std::visit` looks at the active alternative and calls the matching overload with it.' },
            { lines: 22, text: 'Each lambda handles one alternative. This one captures `gold` by reference so it can add to it.' },
            { lines: 29, text: 'Delete the `Weapon` lambda and this stops compiling: visiting must be exhaustive.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'One lambda for everything',
          text: 'If every alternative can be handled the same way, pass a single *generic lambda* — one whose parameter is declared `const auto&` — and the compiler stamps out one version of it per alternative. In the next unit you will see `if constexpr`, which lets one generic lambda branch on the type it was given.',
        },
        {
          type: 'deepdive',
          title: 'How does Overloaded{...} work without naming any types?',
          blocks: [
            {
              type: 'p',
              text: 'Every lambda has its own unique, unnamed class type with an `operator()`. `Overloaded{l1, l2, l3}` is **aggregate initialization**: each lambda initializes one base class. Since C++20, the compiler can deduce the template arguments of an aggregate from its initializers, so `Ts...` becomes the three lambda types automatically. (In C++17 you needed an extra line, a *deduction guide*: `template <typename... Ts> Overloaded(Ts...) -> Overloaded<Ts...>;`.)',
            },
            {
              type: 'p',
              text: 'Because the struct inherits all three call operators and the `using` declaration puts them in the same scope, ordinary [[overload-resolution]] picks the right one for each alternative — exactly as if you had written a struct with three `operator()` overloads by hand.',
            },
          ],
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the code: test for an alternative, read it, and then handle every alternative generically.',
      template: `if (std::___<Gold>(pickup)) {
    std::cout << std::___<Gold>(pickup).amount << '\\n';
}
std::___([](const auto& item) { describe(item); }, pickup);`,
      blanks: [{ answers: ['holds_alternative'] }, { answers: ['get'] }, { answers: ['visit'] }],
      wordBank: ['holds_alternative', 'get', 'visit', 'has_value', 'value_or', 'any_cast'],
      explanation:
        '`std::holds_alternative<T>` asks whether the variant currently holds a `T`, `std::get<T>` returns a reference to it (throwing on a mismatch), and `std::visit` calls a visitor with whatever is active — here a generic lambda that works for every alternative. `has_value` and `value_or` belong to `std::optional`, and `std::any_cast` belongs to `std::any`, a different type that can hold *anything* at all.',
    },
    {
      kind: 'concept',
      title: 'std::expected<T, E>: a value or a reason (C++23)',
      blocks: [
        {
          type: 'p',
          text: 'An empty optional tells the caller *that* something failed but not *why*. When the reason matters — show "file not found" versus "corrupt data", decide whether to retry — use `std::expected<T, E>` (header `<expected>`, C++23). It holds either a `T` (the expected value) or an `E` (the error). You return a `T` normally, and wrap an error in `std::unexpected(...)`.',
        },
        {
          type: 'code',
          title: 'parse_volume.cpp',
          runnable: true,
          std: 'c++23',
          code: `#include <charconv>
#include <expected>
#include <iostream>
#include <string>
#include <string_view>

std::expected<int, std::string> parseVolume(std::string_view text) {
    int value = 0;
    const char* end = text.data() + text.size();
    auto result = std::from_chars(text.data(), end, value);
    if (result.ec != std::errc{} || result.ptr != end) {
        return std::unexpected("'" + std::string{text}
                               + "' is not a number");
    }
    if (value < 0 || value > 100) {
        return std::unexpected("volume must be 0-100");
    }
    return value;
}

int main() {
    for (std::string_view input : {"75", "loud", "250"}) {
        auto volume = parseVolume(input);
        if (volume) {
            std::cout << "Volume set to " << *volume << '\\n';
        } else {
            std::cout << "Error: " << volume.error() << '\\n';
        }
    }
}`,
          output: `Volume set to 75
Error: 'loud' is not a number
Error: volume must be 0-100`,
          annotations: [
            { lines: 7, text: 'The signature tells the whole story: you get an `int`, or a `std::string` describing what went wrong.' },
            { lines: 10, text: '`std::from_chars` (from `<charconv>`) parses a number without throwing and without allocating; it reports problems through its result, which we translate into our own error.' },
            { lines: '12-13', text: '`std::unexpected(...)` marks the value as an **error**. Without it, the compiler would try to treat the string as the success value.' },
            { lines: 18, text: 'The happy path just returns the `int`; it converts to an `expected` holding a value.' },
            { lines: 24, text: 'Same `bool` test as optional: true if it holds a value.' },
            { lines: 27, text: '`error()` gives the error object. Only call it when there is no value.' },
          ],
        },
        {
          type: 'p',
          text: 'The interface mirrors `optional`: `has_value()`, `*`, `->`, `value_or(x)`, and `value()`, which throws `std::bad_expected_access<E>` if there is an error instead. For an operation that produces nothing on success, use `std::expected<void, E>`. The error type is often a small `enum class` of error codes (you\'ll meet `enum class` in the next unit) or a struct with details.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why expected instead of an exception?',
          text: 'The failure is **visible in the signature**, so callers know to handle it; the error path costs about as much as a normal return, so frequent failures are fine; and control flow stays explicit — no invisible jumps. The price: every caller must handle or forward the error by hand, the same plumbing that made error codes tedious. Mark such functions with the `nodiscard` [[attribute]] so that ignoring the result triggers a compiler warning.',
        },
        {
          type: 'deepdive',
          title: 'Chaining without if statements',
          blocks: [
            {
              type: 'p',
              text: 'C++23 gives `expected` (and `optional`) *monadic* member functions that skip the `if (result)` plumbing. `transform(f)` applies `f` to the value if there is one; `and_then(f)` calls a function that itself returns an `expected`; `or_else(f)` runs only on the error path. Errors flow through untouched.',
            },
            {
              type: 'code',
              code: `auto fraction = parseVolume(input)
    .transform([](int v) { return v / 100.0; })  // 75 -> 0.75
    .value_or(0.5);                              // error -> 0.5`,
              annotations: [
                { lines: 2, text: 'Runs only if parsing succeeded; the result is an `expected<double, std::string>`.' },
                { lines: 3, text: 'Collapses to a plain `double`: the converted value, or 0.5 on any error.' },
              ],
            },
          ],
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'When loading fails, this code is supposed to print the reason. Instead it throws an exception. Tap the faulty line.',
      code: `std::expected<int, std::string> loadHealth(const Save& save);

void restore(const Save& save, int& health) {
    auto hp = loadHealth(save);
    if (!hp) {
        std::cout << "Load failed: " << hp.value() << '\\n';
        return;
    }
    health = *hp;
}`,
      bugLines: [6],
      hint: 'Inside the `if (!hp)` branch, what does `hp` contain?',
      explanation:
        'Inside `if (!hp)`, the expected holds an **error**, not a value. Calling `value()` on it throws `std::bad_expected_access<std::string>`. The reason is retrieved with `hp.error()`. (Had it been `*hp` instead, the result would be even worse: undefined behavior.) Line 9 is fine — by then we know a value is present.',
    },
    {
      kind: 'concept',
      title: 'Choosing an error-handling strategy',
      blocks: [
        {
          type: 'p',
          text: 'You now have a full toolbox. None of these tools is "the right one" in general; each fits a particular kind of failure. Ask two questions: **how often** does it happen, and **who can deal with it**?',
        },
        {
          type: 'table',
          headers: ['Situation', 'Tool', 'Why'],
          rows: [
            ['A value may legitimately be absent (lookup, search, optional config)', '`std::optional<T>`', 'Absence is normal and needs no explanation.'],
            ['An operation can fail and the caller needs to know why (parsing, loading, validation)', '`std::expected<T, E>`', 'Cheap, explicit, carries the reason.'],
            ['A value is one of a fixed set of different types (pickups, events, messages)', '`std::variant<...>`', 'Type-safe, value semantics, exhaustive visiting.'],
            ['A rare failure that the immediate caller cannot handle, or a failing constructor', 'Exception', 'Clean happy path; propagates automatically through many layers.'],
            ['A programmer error: a broken invariant that "can\'t happen"', '[[assertion]] (`assert`, Unreal\'s `check`)', 'A bug should be found and fixed, not handled at run time.'],
            ['Hot loops, C APIs, or exceptions disabled (most game engines)', '`bool`, error codes, `optional` / `expected`', 'Predictable cost, works everywhere.'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Don\'t mix strategies at random',
          text: 'Pick a consistent policy per layer of your program. A common one in non-engine C++: exceptions for rare, unrecoverable-locally failures; `optional`/`expected` for expected outcomes; assertions for bugs. Converting at boundaries is fine — for example, catching a library\'s exceptions and returning an `expected`.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'The Unreal equivalents',
          text: 'Since exceptions are off in Unreal, value-based error handling is the norm. The engine has `TOptional<T>`, `TVariant<Ts...>` (with `IsType<T>()`, `Get<T>()`, `TryGet<T>()` and a `Visit` function) and `TValueOrError<T, E>` — built with `MakeValue(...)` or `MakeError(...)` and, in UE5, queried with `HasValue()`, `GetValue()` and `GetError()`. Everything you learned here transfers directly.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A function loads `settings.ini`. If it fails, the caller shows *why* (file missing vs. syntax error on line 12) and then falls back to default settings. Which return type fits best?',
      options: [
        { text: '`std::optional<Settings>`', why: 'An empty optional says *that* loading failed, but the caller needs to know *why* to show the right message.' },
        { text: '`std::expected<Settings, ConfigError>`', correct: true, why: 'Either the settings or a `ConfigError` describing the problem. The failure is visible in the signature, cheap, and handled right at the call site.' },
        { text: '`Settings`, throwing an exception on failure', why: 'Workable, but the caller handles the failure immediately and failure is a normal outcome (first launch has no file). Return-value handling is clearer and cheaper here.' },
        { text: '`std::variant<Settings, int>`', why: 'A variant *can* hold either, but nothing says which alternative means failure, and an `int` code is less descriptive. `expected` names the roles and provides `error()` and `value_or()`.' },
      ],
      explanation:
        'Match the tool to the failure. Loading a config file fails routinely (first launch, user edits), the caller right there knows what to do, and it needs the reason — the textbook case for `std::expected`. Use `optional` when the reason doesn\'t matter, exceptions when the failure is rare and must cross many layers.',
    },
    {
      kind: 'truefalse',
      prompt: 'Just like an empty `std::optional`, a `std::variant<Gold, Weapon>` can be empty in normal use, holding none of its alternatives.',
      answer: false,
      explanation:
        'A variant always holds exactly one of its alternatives; a default-constructed variant holds a value-initialized first alternative (here a `Gold`). The only exception is a rare corner case called *valueless by exception*, when constructing a new alternative throws midway — check it with `valueless_by_exception()`. If you need a deliberate "nothing" state, add `std::monostate` as an alternative or wrap the variant in an optional.',
    },
  ],
  takeaways: [
    'Ordinary, expected failures belong in the return value; vocabulary types make that failure visible in the type.',
    '`std::optional<T>` is "a value or nothing": test with `if (opt)` / `has_value()`, read with `*opt` after checking, or use `value_or(fallback)`. `value()` throws when empty.',
    '`if (opt)` tests **presence**, not the value — an optional holding `0` or `false` is still true.',
    '`std::variant<Ts...>` is a type-safe tagged union holding exactly one alternative; access it with `holds_alternative`, `get`, `get_if`, or best of all `std::visit`.',
    '`std::visit` with the `Overloaded` lambda trick gives exhaustive, compile-checked handling of every alternative.',
    '`std::expected<T, E>` (C++23) carries either a value or an error explaining why; create errors with `std::unexpected(...)` and read them with `error()`.',
    'Choose by frequency and by who can handle it: `optional`/`expected` for expected outcomes, exceptions for rare far-away failures, assertions for bugs.',
  ],
  reading: [
    {
      title: 'std::optional',
      url: 'https://en.cppreference.com/w/cpp/utility/optional',
      source: 'cppreference',
      note: 'The full interface, including the monadic and_then / transform / or_else added in C++23.',
    },
    {
      title: 'std::variant',
      url: 'https://en.cppreference.com/w/cpp/utility/variant',
      source: 'cppreference',
      note: 'Look for valueless_by_exception and std::monostate, the two corner cases mentioned in this lesson.',
    },
    {
      title: 'std::visit',
      url: 'https://en.cppreference.com/w/cpp/utility/variant/visit',
      source: 'cppreference',
      note: 'The example at the bottom shows the overloaded-lambdas trick alongside generic-lambda visitors.',
    },
    {
      title: 'std::expected',
      url: 'https://en.cppreference.com/w/cpp/utility/expected',
      source: 'cppreference',
      note: 'The C++23 value-or-error type, with std::unexpected and bad_expected_access.',
    },
    {
      title: 'C++ Core Guidelines — E: Error handling',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-errors',
      source: 'core-guidelines',
      note: 'Guidance on when exceptions are appropriate and what to do when you cannot use them.',
    },
  ],
};
