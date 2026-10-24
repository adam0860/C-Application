import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-namespaces-type-aliases',
  title: 'Namespaces, using and Type Aliases',
  summary: 'Organizing names: defining and nesting namespaces, file-private helpers, the two kinds of using, and type aliases.',
  minutes: 17,
  objectives: [
    'Define, reopen and nest namespaces, including the C++17 `a::b::c` shorthand, and predict how unqualified names are looked up',
    'Use anonymous namespaces to keep helpers private to one `.cpp` file',
    'Explain the difference between using-declarations and using-directives, and why neither belongs at namespace scope in a header',
    'Create namespace aliases, `using` type aliases and alias templates, and explain why `using` beats `typedef`',
    'Explain why Unreal gameplay code relies on type prefixes instead of namespaces',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Why namespaces exist',
      blocks: [
        {
          type: 'p',
          text: 'Large programs are built from many pieces written by different people: your gameplay code, a physics library, an audio library, the standard library. Sooner or later two of them want the same name. Your animation system has a `play` function; so does the audio library. Both define a `Vector`. If both end up in the same program, the compiler (or the [[linker]]) cannot tell them apart.',
        },
        {
          type: 'p',
          text: 'C\'s only answer was **prefixes** baked into every name: `SDL_Init`, `glBindBuffer`, `alSourcePlay`. C++ gives you a language feature instead: a [[namespace]] is a named scope that you wrap around declarations. The full name of `play` inside namespace `audio` is `audio::play`, written with the [[scope-resolution-operator]] — exactly like `std::cout`.',
        },
        {
          type: 'code',
          title: 'namespaces.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string_view>

namespace audio {
    void play(std::string_view clip) {
        std::cout << "[audio] playing sound " << clip << '\\n';
    }
}

namespace anim {
    void play(std::string_view clip) {
        std::cout << "[anim] playing animation " << clip << '\\n';
    }
}

namespace audio {   // reopened: adds to the same namespace
    void stopAll() { std::cout << "[audio] silence\\n"; }
}

int main() {
    audio::play("sword_swing");
    anim::play("sword_swing");
    audio::stopAll();
}`,
          output: `[audio] playing sound sword_swing
[anim] playing animation sword_swing
[audio] silence`,
          annotations: [
            { lines: '4-8', text: 'Everything declared between the braces belongs to `audio`. Note: no semicolon after a namespace\'s closing brace.' },
            { lines: '10-14', text: 'A second `play` with the same signature. No conflict: its full name is `anim::play`.' },
            { lines: 16, text: 'Namespaces are **open**: you can add to one in several blocks, even across many files. That is how `std` is spread over hundreds of headers.' },
            { lines: '21-22', text: 'Callers say which `play` they mean.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just use prefixes like C?',
          text: 'Prefixes work, but you must type them everywhere, even inside the library itself, and nothing enforces them. Namespaces let code **inside** a namespace use short names, while outside code uses qualified names, aliases or using-declarations as it sees fit. And the namespace becomes part of every symbol\'s identity, so the linker keeps `audio::play` and `anim::play` apart too.',
        },
        {
          type: 'deepdive',
          title: 'What the linker actually sees',
          blocks: [
            {
              type: 'p',
              text: 'The compiler encodes the namespace, the function name and the parameter types into a single symbol name — [[name-mangling]]. With GCC, `audio::play(std::string_view)` becomes something like `_ZN5audio4playESt17basic_string_viewIcSt11char_traitsIcEE`, while `anim::play` gets a different symbol. Run `nm` on an object file and pipe it through `c++filt` to see the readable names again.',
            },
          ],
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Nesting and name lookup',
      blocks: [
        {
          type: 'p',
          text: 'Namespaces can nest, which helps organize big codebases: `forge::ai::nav` for navigation inside the AI module of the Forge engine. Since C++17 you can open a nested namespace in one line, `namespace forge::ai::nav { ... }`, instead of three nested blocks.',
        },
        {
          type: 'code',
          title: 'nested.cpp',
          runnable: true,
          code: `#include <iostream>

namespace forge::ai::nav {      // C++17 nested shorthand
    int costOf(int tiles) { return tiles * 10; }
    int pathCost(int tiles) {
        return costOf(tiles) + 5;   // same namespace: short name
    }
}

namespace forge::ai {
    int planRoute() {
        return nav::pathCost(3);    // from the parent: nav::...
    }
}

int main() {
    std::cout << forge::ai::planRoute() << ' '
              << forge::ai::nav::costOf(2) << '\\n';
}`,
          output: '35 20',
          annotations: [
            { lines: 3, text: 'Equivalent to `namespace forge { namespace ai { namespace nav { ... } } }`.' },
            { lines: 6, text: 'Code inside a namespace sees that namespace\'s names without qualification.' },
            { lines: 12, text: 'Inside `forge::ai`, the nested namespace can be named relative to where you are.' },
            { lines: '17-18', text: 'From outside (here, the global namespace) you use the full path.' },
          ],
        },
        {
          type: 'p',
          text: 'When the compiler meets an unqualified name, it searches **outward**: first the current block and function, then the enclosing namespace, then *its* enclosing namespace, all the way to the **global namespace** (the unnamed outermost scope). The first scope that contains the name wins. A leading `::` — as in `::damage()` — skips the search and means "the one in the global namespace".',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Keep nesting shallow',
          text: 'Two or three levels (`company::module` or `game::ai::nav`) are plenty. Deep hierarchies like `forge::systems::gameplay::combat::damage::detail` mostly add typing; namespaces are for avoiding collisions, not for mirroring your folder structure.',
        },
        {
          type: 'deepdive',
          title: 'Argument-dependent lookup: why std::cout << x just works',
          blocks: [
            {
              type: 'p',
              text: 'There is one more lookup rule. For an unqualified function call, the compiler also searches the namespaces of the **argument types** — [[argument-dependent-lookup]] (ADL). In `std::cout << "hi"`, the operator function lives in `std`, and you never wrote `std::operator<<`: ADL found it because `std::cout` is a `std::ostream`.',
            },
            {
              type: 'code',
              code: `namespace combat {
    struct Damage { int amount; };
    std::ostream& operator<<(std::ostream& os, const Damage& d) {
        return os << d.amount << " dmg";
    }
}

combat::Damage hit{12};
std::cout << hit;   // finds combat::operator<< via ADL`,
              annotations: [
                { lines: 9, text: 'The argument `hit` has type `combat::Damage`, so namespace `combat` is searched too.' },
              ],
            },
            {
              type: 'p',
              text: 'The practical lesson: declare operators and helper functions for a type (`operator<<`, `swap`, `toString`) **in the same namespace as the type**, so callers find them automatically.',
            },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>

void damage() { std::cout << "global "; }

namespace combat {
    void damage() { std::cout << "combat "; }
    void attack() {
        damage();
        ::damage();
    }
}

int main() {
    combat::attack();
    damage();
}`,
      options: [
        { text: '`global global global`', why: 'Lookup searches from the inside out. Inside `combat::attack`, the nearest enclosing scope with a `damage` is `combat`, so that one is found first.' },
        { text: '`combat combat global`', why: 'The leading `::` in `::damage()` explicitly asks for the global namespace, skipping `combat`.' },
        { text: '`combat global global`', correct: true, why: 'Unqualified `damage()` inside `combat` finds `combat::damage`; `::damage()` names the global one; and `main` lives in the global namespace, so its `damage()` is the global one.' },
        { text: 'It does not compile: the call to `damage()` is ambiguous', why: 'Lookup stops at the first scope that contains the name. `combat::damage` hides the global one; there is no ambiguity.' },
      ],
      explanation:
        'Unqualified lookup walks outward from where the name is used and stops at the first scope that declares it — so names in an inner namespace hide names in outer ones. A leading `::` jumps straight to the global namespace. This is why code inside a namespace can use short names for its own functions without fear of picking up unrelated globals.',
    },
    {
      kind: 'concept',
      title: 'Anonymous namespaces: file-private helpers',
      blocks: [
        {
          type: 'p',
          text: 'Every function you define at namespace scope in a `.cpp` file is, by default, visible to the linker and can be called from other files. Usually that is what you want for your public API. But for small helpers it causes trouble: if two `.cpp` files each define their own `clamp01(float)`, the linker sees two definitions of the same function and fails — a violation of the [[one-definition-rule]].',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Linker output',
          code: `/usr/bin/ld: ui.o: in function \`clamp01(float)':
ui.cpp:(.text+0x0): multiple definition of \`clamp01(float)';
combat.o:combat.cpp:(.text+0x0): first defined here`,
        },
        {
          type: 'p',
          text: 'An [[anonymous-namespace]] — `namespace { ... }` with no name — fixes this. Everything inside it has **internal** [[linkage]]: it is visible only within the current [[translation-unit]] (the `.cpp` file plus everything it includes). Each file gets its own private helper, and the linker never sees them collide.',
        },
        {
          type: 'code',
          title: 'combat.cpp',
          code: `#include "combat.h"

namespace {   // private to combat.cpp
    float clamp01(float v) {
        return v < 0.0f ? 0.0f : (v > 1.0f ? 1.0f : v);
    }
    constexpr float MaxArmor = 0.8f;
}

float applyArmor(float damage, float armor) {   // public API
    return damage * (1.0f - clamp01(armor) * MaxArmor);
}`,
          annotations: [
            { lines: 3, text: 'No name, so no one outside this file can refer to its contents. `ui.cpp` can have its own `clamp01` in its own anonymous namespace.' },
            { lines: '4-7', text: 'Functions, variables and even types can go inside. Code later in the same file uses them with plain, unqualified names.' },
            { lines: 10, text: 'Declared in `combat.h` and meant to be called from other files, so it stays outside the anonymous namespace.' },
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'The old way: static',
          text: 'Before anonymous namespaces, you marked file-private functions and variables `static` at namespace scope: `static float clamp01(float v);`. That still works and is common in C-style code. Anonymous namespaces are preferred in C++ because they also work for **types** (you cannot write `static struct`) and they group all private helpers in one visible block.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Never in a header',
          text: 'An anonymous namespace in a header gives every `.cpp` that includes it a **separate, private copy** of everything inside. Ten includers means ten copies of each function and variable — bloat at best, and at worst baffling bugs when someone expects to share a variable. Anonymous namespaces belong in `.cpp` files only.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Putting a helper function in an anonymous namespace inside a header is a good way to share one private copy of it between several `.cpp` files.',
      answer: false,
      explanation:
        'An anonymous namespace gives its contents internal linkage *per translation unit*. In a header, every `.cpp` that includes it gets its own separate copy — nothing is shared, which is especially surprising for variables (each file would count its own `g_hits`). To share a helper between files, declare it in a header inside a named namespace (perhaps `detail`) and define it once in a `.cpp`, or mark it `inline` and define it in the header.',
    },
    {
      kind: 'concept',
      title: 'using-declarations vs. using-directives',
      blocks: [
        {
          type: 'p',
          text: 'Two different features share the `using` keyword, and they differ enormously in risk:',
        },
        {
          type: 'compare',
          left: {
            title: 'using-declaration',
            tone: 'good',
            code: `void printScore(int score) {
    using std::cout;   // ONE name
    cout << score << '\\n';
}`,
            text: 'Brings exactly one name into the current scope. You know precisely what you imported.',
          },
          right: {
            title: 'using-directive',
            tone: 'bad',
            code: `using namespace std;   // EVERY name

int main() {
    cout << "hi\\n";
}`,
            text: 'Makes every name in `std` visible — hundreds today, and more with each new standard.',
          },
        },
        {
          type: 'p',
          text: 'A [[using-declaration]] is precise and safe. A [[using-directive]] is a blanket import, and it causes real bugs. With `using namespace std;` in effect, names from `std` behave as if they were declared in the global namespace — so they collide with yours:',
        },
        {
          type: 'code',
          code: `#include <algorithm>
#include <vector>
using namespace std;

int count = 0;      // global kill counter

int main() {
    vector<int> hits{1, 2, 3};
    count += 1;     // error: reference to 'count' is ambiguous
}`,
          annotations: [
            { lines: 3, text: 'Every name from `std` that the included headers declared is now visible unqualified — including the algorithm `std::count`.' },
            { lines: 9, text: 'The compiler finds both `::count` and `std::count` and cannot choose. Worse failures are silent: a `std` function that is a better match for your arguments can quietly win overload resolution instead of yours.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why never at namespace scope in a header',
          text: 'A header is pasted into every file that includes it — and into every file that includes *those*. A `using namespace std;` in a header therefore imposes the blanket import on hundreds of files whose authors never asked for it, and they cannot undo it. Even a using-declaration at namespace scope in a header leaks the same way. Inside headers, always write qualified names (`std::vector`).',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Where using is fine',
          text: 'Inside a function body, a using-declaration (or even a narrow using-directive such as `using namespace std::chrono_literals;`) affects only that function. In a `.cpp` file, after all `#include`s, using-declarations are a reasonable convenience. Classes have their own legitimate uses too: `using Base::Base;` inherits constructors and `using Base::fire;` re-exposes a base-class member. When in doubt, write the prefix — it is never wrong.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'After this header was added to the project, unrelated `.cpp` files started failing with "ambiguous" errors. Tap the line responsible.',
      code: `#pragma once
#include <string>
#include <vector>
using namespace std;

struct Inventory {
    vector<string> items;
    size_t capacity = 20;

    bool isFull() const { return items.size() >= capacity; }
};`,
      bugLines: [4],
      hint: 'What happens to every file that includes this header?',
      explanation:
        'The using-directive at namespace scope in a header is pasted into every file that includes `Inventory.h`, directly or indirectly, forcing all of `std` into their global namespace. Any of those files with its own `count`, `distance`, `size` or `data` suddenly has ambiguous names — and the author of that file never wrote `using namespace std;`. Remove line 4 and write `std::vector<std::string>` and `std::size_t` in the header — qualified names cost a few characters and leak nothing.',
    },
    {
      kind: 'concept',
      title: 'Namespace aliases and type aliases',
      blocks: [
        {
          type: 'p',
          text: 'Long names are tiresome to repeat, and an alias gives something a shorter name **without importing anything**. A [[namespace-alias]] shortens a namespace path: `namespace nav = forge::ai::navigation;`. A [[type-alias]] gives a type a new name: `using EntityId = std::uint32_t;`.',
        },
        {
          type: 'code',
          title: 'aliases.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>

namespace forge::ai::navigation {
    int estimate(int dx, int dy) { return dx + dy; }
}
namespace nav = forge::ai::navigation;   // namespace alias

using EntityId = std::uint32_t;          // modern type alias
typedef std::uint32_t LegacyId;          // old style, same idea
using Damage = int;
using Health = int;

using OnHit = void (*)(EntityId, Damage);
// typedef void (*OnHitOld)(EntityId, Damage);

void logHit(EntityId id, Damage amount) {
    std::cout << "Entity " << id << " took " << amount << '\\n';
}

int main() {
    std::cout << nav::estimate(3, 4) << '\\n';
    OnHit callback = logHit;
    callback(42, 15);

    Health hp = 100;
    Damage dmg = 30;
    hp = dmg;       // compiles: both are just int
    std::cout << hp << '\\n';
}`,
          output: `7
Entity 42 took 15
30`,
          annotations: [
            { lines: 7, text: '`nav::` now means `forge::ai::navigation::`. Nothing is imported; you still qualify names, just with a shorter prefix.' },
            { lines: 9, text: 'Reads like an assignment: new name on the left, existing type on the right. If entity ids ever need 64 bits, you change one line.' },
            { lines: 10, text: '`typedef` puts the new name at the **end**, where a variable name would go. It means exactly the same thing.' },
            { lines: 14, text: 'A function-pointer type: "pointer to a function taking `(EntityId, Damage)` and returning `void`". With `using`, the name sits on the left where you can find it.' },
            { lines: 15, text: 'The same alias with `typedef`: the name is buried in the middle of the declarator. This is the readability argument for `using`.' },
            { lines: 28, text: 'An alias is **not** a new type. `Health` and `Damage` are both `int`, so mixing them up compiles without a whisper.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Aliases document; they do not protect',
          text: '`using Health = int;` improves readability and lets you change a type in one place, but the compiler treats `Health` and `int` (and `Damage`) as the very same type. If you need the compiler to stop you from passing damage where health is expected, create a distinct type: a small `struct Health { int value; };`, or an `enum class` with a fixed underlying type for id-like values.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Common namespace aliases',
          text: 'You will see `namespace fs = std::filesystem;` and `namespace chr = std::chrono;` in many codebases. Like using-declarations, put them in `.cpp` files or function bodies rather than at namespace scope in headers, so they don\'t leak into includers.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'After `using Health = int;`, passing a plain `int` to a function that takes a `Health` parameter is a compile error.',
      answer: false,
      explanation:
        'A type alias is just another name for an existing type; it does not create a new one. `Health` *is* `int`, so any `int` — a damage value, a player count, a score — is accepted. Aliases are for readability and single-point changes. For real type safety, wrap the value in its own `struct` (or use an `enum class`), which the compiler treats as a distinct type.',
    },
    {
      kind: 'fill',
      prompt: 'Complete the declarations: a namespace alias, a type alias, and an alias template.',
      template: `___ nav = forge::ai::navigation;

___ EntityId = std::uint32_t;

template <typename T>
___ PerEntity = std::unordered_map<EntityId, T>;`,
      blanks: [{ answers: ['namespace'] }, { answers: ['using'] }, { answers: ['using'] }],
      wordBank: ['namespace', 'using', 'typedef', 'auto', 'define', 'class'],
      explanation:
        'Namespace aliases use the `namespace` keyword: `namespace short = long::path;`. Type aliases and alias templates use `using Name = type;`. `typedef` cannot fill either `using` blank: its syntax puts the new name at the end (`typedef std::uint32_t EntityId;`), and it cannot be templated at all. `#define` would be a preprocessor macro — no scope, no type checking.',
    },
    {
      kind: 'concept',
      title: 'Alias templates, revisited',
      blocks: [
        {
          type: 'p',
          text: 'In the class templates lesson you met the [[alias-template]]: `template <typename T> using Grid = std::vector<std::vector<T>>;`. It names a whole family of types while leaving some arguments open — and it is the decisive reason modern code uses `using` rather than `typedef`, since `typedef` cannot be templated. Here is a typical gameplay use, component storage keyed by entity:',
        },
        {
          type: 'code',
          title: 'components.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>
#include <type_traits>
#include <unordered_map>

using EntityId = std::uint32_t;

template <typename Component>
using ComponentMap = std::unordered_map<EntityId, Component>;

struct Position { float x, y; };

int main() {
    ComponentMap<int> health;            // EntityId -> int
    ComponentMap<Position> positions;    // EntityId -> Position
    health[7] = 100;
    positions[7] = {12.5f, -3.0f};

    std::cout << health[7] << " hp at (" << positions[7].x << ", "
              << positions[7].y << ")\\n";
    std::cout << std::boolalpha
              << std::is_same_v<ComponentMap<int>,
                                std::unordered_map<std::uint32_t, int>>
              << '\\n';
}`,
          output: `100 hp at (12.5, -3)
true`,
          annotations: [
            { lines: '8-9', text: 'One alias template, any component type. The key type is fixed in one place; the value type stays open.' },
            { lines: '14-15', text: 'Reads as intent ("a map of components") instead of plumbing.' },
            { lines: '22-23', text: '`std::is_same_v` confirms it: the alias and the spelled-out type are the very same type.' },
          ],
        },
        {
          type: 'p',
          text: 'Alias templates also explain a naming pattern all over the standard library. Before C++11, the only way to "template a typedef" was a struct containing one, so type traits answered through a nested `::type` member — which, inside templates, must be prefixed with `typename` to tell the compiler it names a type. C++14 added an alias template ending in `_t` for every such trait:',
        },
        {
          type: 'compare',
          left: {
            title: 'C++11 style: nested ::type',
            tone: 'bad',
            code: `template <typename T>
void store(T&& value) {
    using Clean =
        typename std::remove_reference<T>::type;
}`,
            text: 'Wordy, and forgetting `typename` produces confusing errors.',
          },
          right: {
            title: 'C++14 style: _t alias',
            tone: 'good',
            code: `template <typename T>
void store(T&& value) {
    using Clean = std::remove_reference_t<T>;
}`,
            text: '`std::remove_reference_t<T>` is simply an alias template for the nested `::type`.',
          },
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Same idea for values: _v',
          text: 'C++17 did the same for traits that answer yes/no questions: `std::is_same_v<A, B>` is shorthand for `std::is_same<A, B>::value`. Those are *variable templates* rather than alias templates, but the motivation is identical — less noise for the reader.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which of these can a `using` alias do that `typedef` cannot?',
      options: [
        { text: 'Give a name to a function-pointer type', why: 'Both can: `typedef void (*OnHit)(int);` and `using OnHit = void (*)(int);` mean the same thing. `using` is just easier to read.' },
        { text: 'Create a new, distinct type that the compiler checks separately', why: 'Neither can. Both create aliases — other names for an existing type. A distinct type needs a `struct`, `class` or `enum class`.' },
        { text: 'Be declared as a template, naming a family of types such as `Grid<T>`', correct: true, why: 'Alias templates (`template <typename T> using Grid = ...;`) exist only with `using`. `typedef` cannot take template parameters.' },
        { text: 'Give a shorter name to a namespace', why: 'Neither keyword does that. Namespace aliases use `namespace short = long::path;`.' },
      ],
      explanation:
        'For non-template aliases, `typedef` and `using` are exactly equivalent, and `using` wins on readability (the new name comes first). The one capability gap is templates: only `using` can define an alias template. That is why modern style guides, including the C++ Core Guidelines, recommend `using` everywhere.',
    },
    {
      kind: 'concept',
      title: 'Unreal: prefixes instead of namespaces',
      blocks: [
        {
          type: 'p',
          text: 'Open any Unreal project and you will see almost no namespaces in gameplay code. Classes live in the global namespace, and their names carry a **one-letter prefix** that tells you what kind of type they are:',
        },
        {
          type: 'table',
          headers: ['Prefix', 'Kind of type', 'Example'],
          rows: [
            ['`A`', 'Actors (derive from `AActor`)', '`AEnemyCharacter`'],
            ['`U`', 'Other `UObject`-derived classes, including components', '`UHealthComponent`'],
            ['`F`', 'Plain structs and classes', '`FHitResult`, `FVector`'],
            ['`E`', 'Enums', '`EWeaponType`'],
            ['`T`', 'Templates', '`TArray`, `TMap`'],
            ['`I`', 'Interfaces', '`IInteractable`'],
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Why prefixes?',
          text: '**Reflection:** Unreal\'s header tool, which generates the code behind `UCLASS`, `USTRUCT` and `UENUM`, does not support reflected types inside namespaces — so every type the editor and Blueprints can see must live in the global namespace. **Information at a glance:** the prefix tells you how a type is managed — a `U` or `A` type is garbage-collected and created with `NewObject` or `SpawnActor`, while an `F` type is a plain value. **History:** the convention predates widespread namespace use and is baked into millions of lines of engine code and assets. In practice the prefixes double as a collision-avoidance scheme, like C\'s `SDL_`.',
        },
        {
          type: 'code',
          title: 'CombatMath.h',
          code: `#pragma once

#include "CoreMinimal.h"

// Not reflected, so a namespace is fine (and encouraged):
namespace MyGame::Combat {
    float ApplyArmor(float Damage, float Armor);
}

// Reflected types must stay in the global namespace:
// UCLASS() class MYGAME_API UCombatComponent ... { ... };`,
          annotations: [
            { lines: '6-8', text: 'Plain C++ helpers that the reflection system never sees can live in a namespace. Epic\'s coding standard asks new non-reflected engine APIs to use a `UE::` namespace, e.g. `UE::Math`.' },
            { lines: 11, text: 'Anything with a `UCLASS`, `USTRUCT` or `UENUM` macro stays global, distinguished by its prefix and your project\'s naming.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Unity builds change the rules',
          text: 'Unreal\'s build tool uses [[ue-unity-build|unity builds]] by default: it concatenates several `.cpp` files into one big translation unit to compile faster. That makes a `.cpp` file behave like a header for everything after it. A `using namespace` at global scope in one `.cpp` can leak into its neighbours, and two files that each have a `clamp01` in their own **anonymous namespace** can suddenly collide in the combined file. Epic\'s coding standard therefore forbids global `using` declarations even in `.cpp` files — and helpers are often given more specific names or a named namespace.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What is the main technical reason Unreal gameplay classes like `AEnemyCharacter` live in the global namespace with a prefix, instead of in a namespace?',
      options: [
        { text: 'C++ namespaces add run-time overhead to every function call', why: 'Namespaces cost nothing at run time; they only affect names at compile and link time.' },
        { text: 'Unreal\'s reflection system (via its header tool) does not support `UCLASS`, `USTRUCT` and `UENUM` types inside namespaces', correct: true, why: 'Reflected types must be declared in the global namespace, so prefixes do the job that namespaces would otherwise do.' },
        { text: 'MSVC, the compiler Unreal uses on Windows, does not support nested namespaces', why: 'MSVC fully supports namespaces, including the C++17 nested `a::b::c` form.' },
        { text: 'Blueprints cannot call functions whose names contain `::`', why: 'Blueprints see reflected names generated by Unreal, not C++ qualified names. The restriction is in what the reflection tooling accepts, not in Blueprint naming.' },
      ],
      explanation:
        'Unreal\'s reflection system only understands reflected types declared at global scope, so everything exposed to the editor and Blueprints lives there, distinguished by prefixes that also encode the kind of type. Non-reflected helper code can — and in newer engine code does — use namespaces. Knowing the reason helps you decide which style a given piece of Unreal code should use.',
    },
  ],
  takeaways: [
    'A namespace is a named scope that prevents name collisions; namespaces are open, can be nested, and C++17 allows `namespace a::b::c { }`.',
    'Unqualified lookup searches outward from the current scope and stops at the first match; a leading `::` means the global namespace.',
    'An anonymous namespace gives its contents internal linkage — private to one `.cpp` file. Never put one in a header.',
    'A using-declaration (`using std::cout;`) imports one name; a using-directive (`using namespace std;`) imports everything. Neither belongs at namespace scope in a header.',
    'Namespace aliases (`namespace fs = std::filesystem;`) and type aliases (`using EntityId = std::uint32_t;`) shorten names without importing anything.',
    'Type aliases are not new types. Prefer `using` over `typedef`: it reads left to right and supports alias templates.',
    'Unreal keeps reflected types in the global namespace and uses A/U/F/E/T/I prefixes instead; unity builds make global `using` in `.cpp` files risky too.',
  ],
  reading: [
    {
      title: 'Namespaces',
      url: 'https://en.cppreference.com/w/cpp/language/namespace',
      source: 'cppreference',
      note: 'Nested, inline and unnamed namespaces, using-directives and namespace aliases in one page.',
    },
    {
      title: 'Type alias, alias template',
      url: 'https://en.cppreference.com/w/cpp/language/type_alias',
      source: 'cppreference',
      note: 'The using-alias syntax and alias templates, with examples.',
    },
    {
      title: 'Argument-dependent lookup',
      url: 'https://en.cppreference.com/w/cpp/language/adl',
      source: 'cppreference',
      note: 'The extra lookup rule that makes operators for your types work without qualification.',
    },
    {
      title: 'C++ Core Guidelines — SF.7: Don\'t write using namespace at global scope in a header file',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rs-using-directive',
      source: 'core-guidelines',
      note: 'The rule and its rationale, next to related rules on headers and source files.',
    },
    {
      title: 'Epic C++ Coding Standard',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine',
      source: 'unreal-docs',
      note: 'See the sections on naming conventions (type prefixes) and on namespaces.',
    },
  ],
};
