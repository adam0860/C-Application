import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-enums',
  title: 'enum and enum class',
  summary: 'Named sets of values done right: why plain enums leak and convert, and how enum class fixes both.',
  minutes: 17,
  objectives: [
    'Explain the two big problems with unscoped enums: implicit conversion to `int` and enumerator names leaking into the surrounding scope',
    'Define and use `enum class` with an explicit underlying type',
    'Write `switch` statements over enums that let the compiler warn about missing cases',
    'Convert between enums and integers deliberately with `static_cast`, validating untrusted values',
    'Build type-safe bit-flag enums with operator overloads, and use `using enum` (C++20)',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Naming a fixed set of values',
      blocks: [
        {
          type: 'p',
          text: 'Games are full of values that come from a small, fixed set: weapon types, difficulty levels, AI states, item rarities. You could store them as plain integers — `int weapon = 2;` — but then what is 2? A bow? A staff? And nothing stops someone from writing `weapon = 57`.',
        },
        {
          type: 'p',
          text: 'An [[enum|enumeration]] creates a brand-new type whose values are a list of named constants called **enumerators**. Each enumerator is stored as an integer: by default the first is 0 and each next one is one more than the previous, but you can assign values explicitly.',
        },
        {
          type: 'code',
          title: 'rarity.cpp',
          runnable: true,
          code: `#include <iostream>

enum Rarity { Common, Uncommon, Rare = 10, Epic, Legendary = 20 };

int main() {
    Rarity drop = Epic;
    std::cout << Common << ' ' << Uncommon << ' ' << Rare << ' '
              << drop << ' ' << Legendary << '\\n';
}`,
          output: '0 1 10 11 20',
          annotations: [
            { lines: 3, text: 'Defines the type `Rarity` with five enumerators. `Common` is 0 and `Uncommon` 1; `Rare` is set to 10, so `Epic` continues from there as 11; `Legendary` is set to 20.' },
            { lines: 6, text: '`drop` is a variable of type `Rarity`. Note that `Epic` is written without any prefix — remember that, it becomes a problem in a moment.' },
            { lines: '7-8', text: 'Printing a plain enum prints its integer value, because it silently converts to `int`. That convenience is the other problem.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just use const int constants?',
          text: '`const int Sword = 0, Bow = 1;` names the values, but the variable is still an `int` — any integer fits, and a function taking an `int` accepts a weapon, a score or a player count alike. An enum is a **distinct type**: functions can demand a `WeaponType` specifically, the compiler can check `switch` statements for missing cases, and the debugger shows `Bow` instead of `1`.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'What is wrong with plain enums',
      blocks: [
        {
          type: 'p',
          text: 'The `enum` you just saw is called an **unscoped enum**, inherited from C. It has two serious flaws.',
        },
        {
          type: 'p',
          text: '**1. Enumerator names leak into the enclosing scope.** `Common`, `Epic` and friends are not inside `Rarity`; they are dumped into the surrounding scope, right next to your variables and functions. Two enums in the same scope cannot share an enumerator name:',
        },
        {
          type: 'code',
          code: `enum TrafficLight { Red, Yellow, Green };
enum TeamColor { Red, Blue };       // error: 'Red' redeclared
int Green = 5;                      // error: 'Green' redeclared`,
          annotations: [
            { lines: 2, text: 'Both `Red`s would live in the same (global) scope, so the second one is a redefinition. C programmers work around this with prefixes like `TEAM_RED`.' },
            { lines: 3, text: 'Even an ordinary variable collides with an enumerator from an unrelated enum.' },
          ],
        },
        {
          type: 'p',
          text: '**2. They convert implicitly to integers.** An unscoped enum value turns into an `int` whenever the context wants one, via [[implicit-conversion]]. That makes nonsense compile:',
        },
        {
          type: 'code',
          code: `enum Weapon { Sword, Bow };
enum Difficulty { Easy, Hard };

void setVolume(int percent);

setVolume(Bow);                 // compiles: volume 1%?
int total = Sword + Hard;       // compiles: 0 + 1
if (Bow == Hard) { /* ... */ }  // compiles: true!`,
          annotations: [
            { lines: 6, text: 'A weapon silently becomes a volume level. No error, no warning.' },
            { lines: 8, text: 'Comparing a weapon with a difficulty is meaningless, but both convert to 1. (GCC warns with `-Wenum-compare`, and C++20 deprecates some mixed-enum arithmetic — but the code still compiles.)' },
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Why C++ kept them',
          text: 'Unscoped enums come straight from C, where enumerators were really just named integer constants. C++ could not change their behaviour without breaking millions of lines of existing code, so C++11 added a second, safer kind of enum instead. You will still meet unscoped enums in older code, C libraries and parts of Unreal Engine.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>

enum Rarity { Common, Rare = 5, Epic, Legendary = 10 };

int main() {
    std::cout << Epic + Legendary << '\\n';
}`,
      options: [
        { text: '`12`', why: 'That assumes `Epic` is 2 because it is the third enumerator. But numbering continues from the previous value: `Rare` is 5, so `Epic` is 6.' },
        { text: '`16`', correct: true, why: '`Epic` follows `Rare = 5`, so it is 6; `Legendary` is 10. Both convert implicitly to `int`, and 6 + 10 = 16.' },
        { text: '`EpicLegendary`', why: 'C++ never prints enumerator names automatically. An unscoped enum converts to its integer value.' },
        { text: 'It does not compile: you cannot add two enum values', why: 'With an unscoped enum you can — both silently convert to `int`. That permissiveness is exactly the problem `enum class` fixes.' },
      ],
      explanation:
        'Two rules are at work. An enumerator without an explicit value is one more than the previous enumerator (not its position in the list). And unscoped enumerators convert implicitly to integers, so arithmetic on them compiles even when it makes no sense.',
    },
    {
      kind: 'concept',
      title: 'enum class: scoped and strongly typed',
      blocks: [
        {
          type: 'p',
          text: 'C++11 added the [[enum-class|scoped enumeration]], written `enum class` (or `enum struct`, which means the same). It fixes both flaws at once: enumerators live **inside** the enum\'s scope, and there is **no implicit conversion** to integers.',
        },
        {
          type: 'code',
          title: 'enum_class.cpp',
          runnable: true,
          code: `#include <iostream>

enum class WeaponType { Sword, Bow, Staff };
enum class TeamColor { Red, Blue, Green };
enum class TrafficLight { Red, Yellow, Green };   // no clash

int main() {
    WeaponType equipped = WeaponType::Bow;
    TeamColor team = TeamColor::Red;

    if (equipped == WeaponType::Bow && team != TeamColor::Blue) {
        std::cout << "Red archer ready\\n";
    }
    // std::cout << equipped;          // error: no operator<<
    // int n = equipped;               // error: no conversion
    // if (equipped == 1) {}           // error: no conversion
    std::cout << static_cast<int>(equipped) << '\\n';
}`,
          output: `Red archer ready
1`,
          annotations: [
            { lines: '4-5', text: 'Both enums have a `Red` and a `Green`. Since each enumerator lives inside its own enum, there is no conflict.' },
            { lines: 8, text: 'Enumerators must be qualified with the enum name using the [[scope-resolution-operator]] — just like names in a namespace.' },
            { lines: 11, text: 'Comparing values of the **same** enum type works as expected.' },
            { lines: '14-16', text: 'Each of these would compile with a plain enum. With `enum class` they are compile errors — mistakes caught before the game ever runs.' },
            { lines: 17, text: 'When you really want the number, say so explicitly with [[static-cast]].' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why stronger typing is worth the extra typing',
          text: 'Writing `WeaponType::Bow` instead of `Bow` costs a few characters, but it buys a guarantee: a `WeaponType` can only ever be compared with, assigned from or passed as a `WeaponType`. A whole class of "wrong kind of number" bugs becomes impossible. The C++ Core Guidelines put it simply: prefer `enum class` over plain `enum`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Printing an enum class',
          text: 'Because there is no implicit conversion, `std::cout << equipped` does not compile. Write a `toString` function (coming up next card), or overload `operator<<` for your enum. C++ has no built-in way to turn an enumerator into its name — reflection is coming in C++26, and Unreal provides it through its own reflection system.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'A value of an `enum class` type converts to `int` automatically when you pass it to a function that takes an `int` parameter.',
      answer: false,
      explanation:
        'Scoped enums have **no** implicit conversions — that is their whole point. Passing a `WeaponType` where an `int` is expected is a compile error. If you genuinely need the integer, write `static_cast<int>(value)`, which makes the conversion visible to every reader.',
    },
    {
      kind: 'concept',
      title: 'Underlying types',
      blocks: [
        {
          type: 'p',
          text: 'Every enum is stored as some integer type, called its [[underlying-type]]. For an `enum class`, the default is `int`. You can choose a different one after a colon — usually a smaller [[fixed-width-integer]] when memory layout matters:',
        },
        {
          type: 'code',
          title: 'underlying.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>

enum class Direction { North, East, South, West };
enum class ItemKind : std::uint8_t { Junk, Potion, Weapon, Quest };

struct InventorySlot {
    ItemKind kind;
    std::uint8_t count;
};

int main() {
    std::cout << sizeof(Direction) << ' ' << sizeof(ItemKind) << ' '
              << sizeof(InventorySlot) << '\\n';
}`,
          output: '4 1 2',
          annotations: [
            { lines: 4, text: 'No underlying type given, so it is `int`: 4 bytes on every mainstream platform.' },
            { lines: 5, text: '`: std::uint8_t` makes each `ItemKind` a single byte. Plenty for four (or up to 256) kinds.' },
            { lines: '7-10', text: 'A whole inventory slot in 2 bytes. With an `int`-sized enum (plus alignment padding) it would be 8.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Memory and cache:** a million particles or tiles with a 1-byte state field instead of 4 bytes means far less memory traffic.',
            '**Save files and network packets:** the exact size and layout must be fixed and identical on every machine.',
            '**Forward declarations:** because an `enum class` always has a known underlying type, you can declare it without listing its enumerators — `enum class ItemKind : std::uint8_t;` — and define it elsewhere. Headers can then mention the type without pulling in its full definition.',
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Plain enums and underlying types',
          text: 'An unscoped enum without an explicit underlying type uses an [[implementation-defined]] integer type big enough for its values, and cannot be forward-declared. You can give a plain enum an underlying type too (`enum Legacy : int { ... };`), which also makes it forward-declarable.',
        },
        {
          type: 'deepdive',
          title: 'Getting the underlying type in code',
          blocks: [
            {
              type: 'p',
              text: 'The trait `std::underlying_type_t<E>` (from `<type_traits>`) names an enum\'s underlying type, which is handy in generic code: `static_cast<std::underlying_type_t<ItemKind>>(k)` converts without hard-coding `std::uint8_t`. C++23 adds `std::to_underlying(k)` (in `<utility>`), which does exactly that in one call.',
            },
            {
              type: 'p',
              text: 'An enum with a fixed underlying type can legally hold **any** value of that type, named or not: `static_cast<ItemKind>(200)` is a valid `ItemKind` that matches no enumerator. Keep that in mind — it is why the compiler can never assume a `switch` over an enum covers every possibility.',
            },
          ],
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Declare a one-byte scoped enum for ammo types, then get its numeric value for a network packet.',
      template: `enum ___ AmmoType : std::___ { Bullet, Shell, Rocket };

AmmoType ammo = AmmoType::Rocket;
auto raw = ___<std::uint8_t>(ammo);   // 2`,
      blanks: [{ answers: ['class', 'struct'] }, { answers: ['uint8_t'] }, { answers: ['static_cast'] }],
      wordBank: ['class', 'uint8_t', 'static_cast', 'int64_t', 'reinterpret_cast', 'namespace'],
      explanation:
        '`enum class` makes the enum scoped and strongly typed, `: std::uint8_t` fixes its underlying type at one byte, and `static_cast` performs the explicit conversion back to an integer. `reinterpret_cast` is for reinterpreting pointers and references, not for converting values, and would not compile here.',
    },
    {
      kind: 'concept',
      title: 'switch over enums',
      blocks: [
        {
          type: 'p',
          text: 'Enums and [[switch-statement|switch]] statements are natural partners. With an `enum class`, each `case` label uses the qualified name. The real benefit is a compiler check: with `-Wall`, GCC and Clang warn when a `switch` over an enum does not handle every enumerator — **as long as there is no `default:`**.',
        },
        {
          type: 'code',
          title: 'weapon_name.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string_view>

enum class WeaponType { Sword, Bow, Staff };

std::string_view toString(WeaponType w) {
    switch (w) {
        case WeaponType::Sword: return "Sword";
        case WeaponType::Bow:   return "Bow";
        case WeaponType::Staff: return "Staff";
    }
    return "Unknown";   // reached only by unnamed values
}

int main() {
    std::cout << toString(WeaponType::Staff) << '\\n';
}`,
          output: 'Staff',
          annotations: [
            { lines: '7-11', text: 'No `default:` label on purpose. If someone adds `Axe` to the enum and forgets this function, the compiler points straight at it.' },
            { lines: 12, text: 'Why a return after a switch that covers every case? Because an enum can legally hold values with no name (from a cast or a corrupted save). The compiler knows that, so without this line GCC warns *control reaches end of non-void function*.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'After adding Axe to WeaponType',
          code: `weapon_name.cpp:7:12: warning: enumeration value 'Axe'
    not handled in switch [-Wswitch]`,
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Skip default when you want completeness checks',
          text: 'A `default:` label tells the compiler "I have handled everything else", which silences the missing-case warning. Use `default:` when there really is a sensible catch-all; leave it out when every enumerator deserves its own decision, and handle stray values after the `switch`. Many teams turn `-Wswitch` into an error with `-Werror=switch`.',
        },
        {
          type: 'heading',
          text: 'using enum (C++20)',
        },
        {
          type: 'p',
          text: 'Repeating `WeaponType::` on every case gets noisy. C++20\'s `using enum` brings all of an enum\'s enumerators into the current scope, so you can write them unqualified — but only where you choose, not everywhere like a plain enum:',
        },
        {
          type: 'code',
          code: `int baseDamage(WeaponType w) {
    switch (w) {
        using enum WeaponType;   // only inside this switch
        case Sword: return 12;
        case Bow:   return 8;
        case Staff: return 15;
    }
    return 0;
}`,
          annotations: [
            { lines: 3, text: 'A declaration, not a statement, so it is allowed before the first `case`. Its effect is limited to the switch\'s braces.' },
            { lines: '4-6', text: 'Short names, full type safety: these are still `WeaponType` values, and the missing-case warning still works.' },
          ],
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This function does not compile. Tap the line with the error.',
      code: `enum class Weapon { Sword, Bow, Staff };

int attackRange(Weapon w) {
    switch (w) {
        case Weapon::Sword: return 1;
        case Bow:           return 30;
        case Weapon::Staff: return 12;
    }
    return 0;
}`,
      bugLines: [6],
      hint: 'Where do the enumerators of an `enum class` live?',
      explanation:
        'The enumerators of an `enum class` live inside the enum\'s scope, so plain `Bow` is not a known name here — the compiler reports something like *\'Bow\' was not declared in this scope*. Write `Weapon::Bow`, or put `using enum Weapon;` at the top of the switch (C++20) to make all three names available unqualified.',
    },
    {
      kind: 'concept',
      title: 'Converting on purpose: static_cast',
      blocks: [
        {
          type: 'p',
          text: 'Conversions are still possible, they just have to be explicit. `static_cast<int>(e)` gives you the integer value of an enumerator. `static_cast<E>(n)` goes the other way — and that direction needs care, because the compiler will happily produce an enum value that matches no enumerator.',
        },
        {
          type: 'p',
          text: 'Integers that come from **outside** your program — a save file, a network packet, a config value typed by a designer — must be validated before you turn them into an enum. A common pattern adds a final `Count` enumerator that marks the end of the valid range:',
        },
        {
          type: 'code',
          title: 'load_rarity.cpp',
          runnable: true,
          code: `#include <array>
#include <cstddef>
#include <iostream>
#include <optional>

enum class Rarity { Common, Rare, Epic, Count };

constexpr std::array<const char*, 3> RarityNames{
    "Common", "Rare", "Epic"};

std::optional<Rarity> rarityFromInt(int raw) {
    if (raw < 0 || raw >= static_cast<int>(Rarity::Count)) {
        return std::nullopt;
    }
    return static_cast<Rarity>(raw);
}

const char* name(Rarity r) {
    return RarityNames[static_cast<std::size_t>(r)];
}

int main() {
    for (int raw : {0, 2, 7}) {          // values from a save file
        if (auto r = rarityFromInt(raw)) {
            std::cout << raw << " -> " << name(*r) << '\\n';
        } else {
            std::cout << raw << " -> invalid, using Common\\n";
        }
    }
}`,
          output: `0 -> Common
2 -> Epic
7 -> invalid, using Common`,
          annotations: [
            { lines: 6, text: '`Count` is not a real rarity. Because numbering starts at 0, its value equals the number of real enumerators — here 3.' },
            { lines: '8-9', text: 'A lookup table indexed by the enum\'s value. (Keep it in sync with the enum — later in this unit you will see how `static_assert` can check that at compile time.)' },
            { lines: 12, text: 'The range check. Anything outside `[0, Count)` is rejected before it ever becomes a `Rarity`.' },
            { lines: 15, text: 'Only now is the cast safe. The function returns a `std::optional`, so callers must handle the invalid case.' },
            { lines: 19, text: 'Enum to index: an explicit `static_cast` to `std::size_t`, the type arrays are indexed with.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Out-of-range casts',
          text: 'For an enum with a fixed underlying type (every `enum class`), casting any value that fits in that type is well-defined — you just get an unnamed value that your `switch` statements and lookup tables don\'t expect. For a plain enum **without** a fixed underlying type, casting a value outside its range is [[undefined-behavior]] since C++17. Either way: validate first.',
        },
      ],
    },
    {
      kind: 'mcq',
      codeOptions: true,
      prompt: 'Given `enum class Rarity { Common, Rare, Epic };`, which line compiles?',
      options: [
        { text: 'int n = Rarity::Epic;', why: 'There is no implicit conversion from a scoped enum to `int`, so this initialization is a compile error.' },
        { text: 'Rarity r = 2;', why: 'There is no implicit conversion from `int` to an enum either — of any kind. You would need `static_cast<Rarity>(2)`.' },
        { text: 'int n = static_cast<int>(Rarity::Epic);', correct: true, why: 'An explicit `static_cast` is the sanctioned way to get the integer value. `n` becomes 2.' },
        { text: 'bool b = (Rarity::Epic == 2);', why: 'A scoped enum cannot be compared with an integer. Compare with another enumerator, or cast first.' },
      ],
      explanation:
        'Scoped enums block every implicit conversion in both directions; `static_cast` is the explicit escape hatch. That strictness is a feature: whenever you see an enum turning into a number (or back) in `enum class` code, there is a visible cast marking the spot — exactly where a reviewer should look for range bugs.',
    },
    {
      kind: 'concept',
      title: 'Bit flags with enum class',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes a value is a **set** of options rather than one choice: a character can be burning *and* poisoned *and* frozen at the same time. The classic technique gives each enumerator its own bit (powers of two) and combines them with the bitwise operators — each bit acts as a [[bit-mask]] for one flag.',
        },
        {
          type: 'p',
          text: 'Plain enums made this easy because they convert to `int`, but that also let you OR a status effect with a weapon type. With `enum class`, `|` and `&` do not compile until you define them — so you write a few small [[operator-overloading|operator overloads]] once, and get type-safe flags forever:',
        },
        {
          type: 'code',
          title: 'status_flags.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>
#include <type_traits>

enum class Status : std::uint8_t {
    None     = 0,
    Burning  = 1 << 0,
    Poisoned = 1 << 1,
    Frozen   = 1 << 2,
    Stunned  = 1 << 3,
};

using StatusBits = std::underlying_type_t<Status>;

constexpr Status operator|(Status a, Status b) {
    return static_cast<Status>(static_cast<StatusBits>(a)
                               | static_cast<StatusBits>(b));
}
constexpr Status operator&(Status a, Status b) {
    return static_cast<Status>(static_cast<StatusBits>(a)
                               & static_cast<StatusBits>(b));
}
constexpr Status operator~(Status a) {
    return static_cast<Status>(~static_cast<StatusBits>(a));
}
constexpr Status& operator|=(Status& a, Status b) { return a = a | b; }
constexpr Status& operator&=(Status& a, Status b) { return a = a & b; }

constexpr bool has(Status set, Status flag) {
    return (set & flag) != Status::None;
}

int main() {
    Status s = Status::Burning | Status::Frozen;
    s |= Status::Poisoned;           // add a flag
    s &= ~Status::Burning;           // remove a flag
    std::cout << std::boolalpha << has(s, Status::Burning) << ' '
              << has(s, Status::Frozen) << ' '
              << has(s, Status::Poisoned) << '\\n';
    std::cout << static_cast<int>(s) << '\\n';
}`,
          output: `false true true
6`,
          annotations: [
            { lines: '7-10', text: 'Each flag owns one bit: 1, 2, 4, 8. `1 << n` makes the intent obvious. A `std::uint8_t` holds up to eight flags.' },
            { lines: 13, text: 'A [[type-alias]] for the underlying integer type, so the operators don\'t hard-code `std::uint8_t`.' },
            { lines: '15-18', text: 'Convert both operands to integers, combine the bits, convert back. The function is `constexpr`, so it even works in constants.' },
            { lines: 24, text: '`~` flips every bit; combined with `&=` it clears one flag (line 36).' },
            { lines: '26-27', text: 'Compound assignment builds on the binary operators.' },
            { lines: '29-31', text: 'Testing a flag: AND with it and see if anything is left.' },
            { lines: 40, text: 'Frozen (4) + Poisoned (2) = 6. Burning (1) was added and then removed.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why bother with the operators?',
          text: 'Compare with plain integers: `int status = BURNING | WEAPON_BOW;` compiles and silently mixes unrelated concepts. With the `enum class` version, `Status::Burning | WeaponType::Bow` is a compile error because no such operator exists — the operators accept only `Status`. The flag set is just as small and fast as a raw integer, and the type system guards it.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal writes the operators for you',
          text: 'Unreal has a macro for exactly this boilerplate: after an `enum class EStatusFlags : uint8 { ... };`, writing `ENUM_CLASS_FLAGS(EStatusFlags)` generates `|`, `&`, `^`, `~` and the compound assignments, and helpers like `EnumHasAnyFlags(Flags, Test)` test bits. Flag enums exposed to the editor add `UENUM(meta = (Bitflags))`.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Assemble a correct `operator|` for the `Status` flag enum.',
      lines: [
        'constexpr Status operator|(Status a, Status b) {',
        '    using U = std::underlying_type_t<Status>;',
        '    return static_cast<Status>(',
        '        static_cast<U>(a) | static_cast<U>(b));',
        '}',
      ],
      distractors: ['    return a | b;'],
      explanation:
        'Inside the operator you must leave the enum world: cast both operands to the underlying integer type, combine them with the built-in integer `|`, then cast the result back to `Status`. The alias `U` has to be declared before it is used. The tempting `return a | b;` would call this very same `operator|` again — infinite recursion and a stack overflow.',
    },
    {
      kind: 'concept',
      title: 'Enums in Unreal Engine',
      blocks: [
        {
          type: 'p',
          text: 'Unreal gameplay code uses `enum class` everywhere, with two conventions: names start with **E** (`EWeaponType`), and enums that the editor or Blueprints should see are marked with the [[uenum]] macro so Unreal\'s reflection system knows about them.',
        },
        {
          type: 'code',
          title: 'WeaponTypes.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "WeaponTypes.generated.h"

UENUM(BlueprintType)
enum class EWeaponType : uint8 {
    Sword   UMETA(DisplayName = "Sword"),
    Bow     UMETA(DisplayName = "Longbow"),
    Staff   UMETA(DisplayName = "Magic Staff")
};`,
          annotations: [
            { lines: 4, text: 'Even a header that only declares an enum needs its generated header, included last, because `UENUM` produces reflection code.' },
            { lines: 6, text: '`UENUM` registers the enum with reflection; `BlueprintType` lets Blueprints use it as a variable type.' },
            { lines: 7, text: '`: uint8` is required for a `BlueprintType` enum — Blueprints store enums as bytes. Unreal\'s `uint8` is the same as `std::uint8_t`.' },
            { lines: '8-10', text: '`UMETA(DisplayName = ...)` controls the name shown in editor dropdowns — reflection gives Unreal the enumerator names that standard C++ cannot.' },
          ],
        },
        {
          type: 'code',
          title: 'WeaponComponent.h (excerpt)',
          code: `UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Weapon")
EWeaponType WeaponType = EWeaponType::Sword;`,
          annotations: [
            { lines: 1, text: 'Designers now get a dropdown with "Sword", "Longbow" and "Magic Staff" in the Details panel.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Older patterns you will still see',
          text: 'Pre-C++11 engine code emulated scoped enums with a namespace trick — `namespace ECollisionChannel { enum Type { ... }; }` — and stored them in properties as `TEnumAsByte<ECollisionChannel::Type>` to force one-byte storage. New code should simply use `enum class ... : uint8`, but recognising the old pattern helps when reading engine source.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Why is the Unreal enum declared as `enum class EWeaponType : uint8` rather than leaving the underlying type as the default `int`?',
      options: [
        { text: 'Because enums marked `BlueprintType` must use `uint8` as their underlying type', correct: true, why: 'Blueprints store enum values as bytes, so Unreal\'s header tool requires `uint8` for enums exposed to Blueprints. (As a bonus, it also saves memory.)' },
        { text: 'Because `enum class` cannot use `int` as its underlying type', why: '`int` is in fact the default underlying type of every `enum class`.' },
        { text: 'Because `uint8` makes the enum convert implicitly to integers', why: 'The underlying type never changes the conversion rules: an `enum class` with any underlying type still requires `static_cast`.' },
        { text: 'Because the E prefix only works with one-byte enums', why: 'The E prefix is a naming convention with no technical effect. It tells readers "this is an enum".' },
      ],
      explanation:
        'Choosing an underlying type is about storage, not semantics. Unreal requires `uint8` for Blueprint-exposed enums because Blueprints represent them as bytes; standard C++ code picks small underlying types for memory, file and network layouts. In every case the enum stays strongly typed.',
    },
  ],
  takeaways: [
    'An enum is a distinct type whose values are named constants; unnamed enumerators count up from the previous value.',
    'Plain (unscoped) enums leak their enumerator names into the surrounding scope and convert silently to `int` — both are sources of bugs.',
    '`enum class` keeps enumerators inside the enum (`WeaponType::Bow`) and blocks all implicit conversions; prefer it for new code.',
    'Choose an underlying type such as `std::uint8_t` with `: type` when size matters (memory, save files, packets); it also allows forward declaration.',
    'Omit `default:` in a `switch` over an enum so `-Wswitch` warns about missing cases, and handle unnamed values after the switch.',
    'Convert with `static_cast` in both directions, and validate integers from outside the program before turning them into enums.',
    'Type-safe bit flags = an `enum class` with power-of-two values plus `|`, `&`, `~` overloads (Unreal: `ENUM_CLASS_FLAGS`). `using enum` (C++20) shortens names locally.',
  ],
  reading: [
    {
      title: 'Enumeration declaration',
      url: 'https://en.cppreference.com/w/cpp/language/enum',
      source: 'cppreference',
      note: 'The full rules for scoped and unscoped enums, underlying types and using enum.',
    },
    {
      title: 'Scoped enumerations (enum classes)',
      url: 'https://www.learncpp.com/cpp-tutorial/scoped-enumerations-enum-classes/',
      source: 'learncpp',
      note: 'A friendly comparison of plain enums and enum class with extra exercises.',
    },
    {
      title: 'C++ Core Guidelines — Enum.3: Prefer class enums over plain enums',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Renum-class',
      source: 'core-guidelines',
      note: 'The rationale for enum class, plus related rules on naming and underlying types.',
    },
    {
      title: 'Epic C++ Coding Standard',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine',
      source: 'unreal-docs',
      note: 'See the sections on naming (the E prefix) and on strongly typed enums.',
    },
  ],
};
