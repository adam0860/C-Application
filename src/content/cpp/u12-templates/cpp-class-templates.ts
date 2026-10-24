import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-class-templates',
  title: 'Class Templates',
  summary: 'Build your own generic containers — and understand how std::array, std::vector and Unreal\'s TArray are put together.',
  minutes: 18,
  objectives: [
    'Write a class template and define its member functions inside and outside the class',
    'Explain why `Stack<int>` and `Stack<double>` are unrelated types',
    'Use class template argument deduction (CTAD) and recognize its traps',
    'Use non-type template parameters such as the `N` in `std::array<int, N>`',
    'Write a full specialization and an alias template',
    'Read Unreal container types such as `TArray<int32, TInlineAllocator<8>>` and `TMap<FName, int32>`',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'From function templates to class templates',
      blocks: [
        {
          type: 'p',
          text: 'Function templates gave you one function for many types. A [[class-template]] does the same for a whole class: you describe the data and member functions once, with a type placeholder, and the compiler builds a separate class for every type you use. Here is an undo stack that works for any element type:',
        },
        {
          type: 'code',
          title: 'stack.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

template <typename T>
class Stack {
public:
    void push(const T& item) { items_.push_back(item); }
    T pop() {
        T top = std::move(items_.back());
        items_.pop_back();
        return top;
    }
    bool isEmpty() const { return items_.empty(); }
    std::size_t size() const { return items_.size(); }

private:
    std::vector<T> items_;
};

int main() {
    Stack<std::string> undo;
    undo.push("move north");
    undo.push("pick up key");
    undo.push("open door");

    Stack<int> hits;
    hits.push(12);
    hits.push(30);

    std::cout << undo.size() << " actions, "
              << hits.size() << " hits\\n";
    while (!undo.isEmpty()) {
        std::cout << "Undo: " << undo.pop() << '\\n';
    }
}`,
          output: `3 actions, 2 hits
Undo: open door
Undo: pick up key
Undo: move north`,
          annotations: [
            { lines: '6-7', text: 'Same `template <typename T>` header as before, now in front of a class. Everything up to the closing `};` is part of the template.' },
            { lines: 9, text: 'Member functions use `T` freely. Defined inside the class body, they look exactly like ordinary member functions.' },
            { lines: 11, text: 'We [[std-move|move]] the top element out rather than copying it — `T` might be an expensive type. Calling `pop()` on an empty stack would call `back()` on an empty vector: undefined behavior. Production code would check or assert first.' },
            { lines: 19, text: 'A class template can use other templates: the storage is a `std::vector<T>` of whatever `T` turns out to be.' },
            { lines: [23, 28], text: 'You name the element type in angle brackets (C++17 can sometimes deduce it — more on that soon). `Stack` alone is **not** a type — `Stack<std::string>` and `Stack<int>` are.' },
          ],
        },
        {
          type: 'p',
          text: 'You already know many class templates: `std::vector<T>`, `std::array<T, N>`, `std::map<K, V>`, `std::unique_ptr<T>`. Each instantiation is a brand-new, independent class. `Stack<int>` and `Stack<double>` share a *recipe*, but to the type system they are as unrelated as `Player` and `Texture`: no conversion between them, no common base class, separate `static` members.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why containers are templates',
          text: 'Without templates, a generic container must store something like `void*` or a pointer to a common base class (`Object*`, as early Java did). Every access then needs a cast, mistakes are found at run time instead of compile time, and every element lives behind a pointer — scattered across the heap, terrible for [[cache-locality]]. A `std::vector<int>` instead stores raw `int`s side by side and the compiler rejects `push_back("oops")`. Type safety *and* speed.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Given the `Stack` template above, which statement is true?',
      options: [
        {
          text: '`Stack<double>` derives from `Stack<int>`, so a `Stack<double>` can be used where a `Stack<int>&` is expected',
          why: 'Instantiations of a template have no inheritance relationship at all. Unless you write one yourself, there is not even a conversion between them.',
        },
        {
          text: '`Stack<int>` and `Stack<double>` are two unrelated class types generated from the same template',
          correct: true,
          why: 'Each set of template arguments produces a distinct class with its own members, layout and functions.',
        },
        {
          text: 'You can declare a variable of type `Stack` and choose the element type later',
          why: '`Stack` names a template, not a type. A variable needs a concrete type, so the arguments must be known at compile time (written out or deduced).',
        },
        {
          text: 'All `Stack` instantiations share a single compiled copy of `push`',
          why: '`Stack<int>::push` and `Stack<std::string>::push` do different things (copy an `int` vs. copy a string), so each is compiled separately.',
        },
      ],
      explanation:
        'A class template is a generator of types. This matters in practice: a function taking `Stack<int>&` will not accept a `Stack<long>`, and a `std::vector<Derived*>` does not convert to `std::vector<Base*>` even though `Derived*` converts to `Base*`. If you need code that works for every instantiation, make that code a template too.',
    },
    {
      kind: 'concept',
      title: 'Defining members outside the class',
      blocks: [
        {
          type: 'p',
          text: 'For larger classes you will want to keep the class body readable and move the member function bodies below it. With a class template, each out-of-class definition needs two extra things: its own `template <typename T>` line, and the full name `Grid<T>::` in front of the member.',
        },
        {
          type: 'code',
          title: 'grid.cpp',
          runnable: true,
          code: `#include <cstddef>
#include <iostream>
#include <vector>

template <typename T>
class Grid {
public:
    Grid(int width, int height, const T& fill);
    T& at(int x, int y);
    int count(const T& value) const;
    int width() const { return width_; }
    int height() const { return height_; }

private:
    int width_;
    int height_;
    std::vector<T> cells_;
};

template <typename T>
Grid<T>::Grid(int width, int height, const T& fill)
    : width_{width}, height_{height},
      cells_(static_cast<std::size_t>(width * height), fill) {}

template <typename T>
T& Grid<T>::at(int x, int y) {
    return cells_[static_cast<std::size_t>(y * width_ + x)];
}

template <typename T>
int Grid<T>::count(const T& value) const {
    int n = 0;
    for (const T& cell : cells_) {
        if (cell == value) ++n;
    }
    return n;
}

int main() {
    Grid<char> map{5, 3, '.'};
    map.at(1, 1) = '@';
    map.at(3, 0) = 'E';
    map.at(4, 2) = 'E';
    for (int y = 0; y < map.height(); ++y) {
        for (int x = 0; x < map.width(); ++x) {
            std::cout << map.at(x, y);
        }
        std::cout << '\\n';
    }
    std::cout << map.count('E') << " enemies\\n";
}`,
          output: `...E.
.@...
....E
2 enemies`,
          annotations: [
            { lines: '8-10', text: 'Only declarations here. The class body reads like a summary of what a `Grid` can do.' },
            { lines: '20-21', text: 'The constructor defined outside: `template <typename T>` again, then `Grid<T>::Grid`. The first `Grid<T>` names the class; the second `Grid` is the constructor\'s name.' },
            { lines: 23, text: 'Parentheses, not braces: `std::vector<T>(count, fill)` means "count copies of fill". Braces would prefer the vector\'s `initializer_list` constructor and try to treat both values as *elements*.' },
            { lines: '25-26', text: 'Return type first (`T&`), then the qualified name `Grid<T>::at`. Forgetting the `<T>` is the most common mistake here.' },
            { lines: 31, text: '`const` goes in the same place as for a normal [[const-member-function|const member function]] — after the parameter list.' },
            { lines: 34, text: 'This line requires `T` to support `==`. It is only compiled for a `T` if someone actually calls `count`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Inside the class, `Grid` means `Grid<T>`',
          text: 'Within the class template (and within its member definitions after `Grid<T>::`), you may write plain `Grid` to mean the current instantiation, for example in a copy constructor `Grid(const Grid& other)`. Outside, you must always supply the arguments.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why members are instantiated lazily',
          text: 'The member functions of a class template are only instantiated when they are used. A `Grid<Tile>` works even if `Tile` has no `==`, as long as nobody calls `count`. This is deliberate: it lets one template serve types with different abilities. It is why `std::vector<std::unique_ptr<Enemy>>` works even though `unique_ptr` cannot be copied — the vector\'s copying members are simply never instantiated unless you try to copy the vector.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Still header-only',
          text: 'Out-of-class does not mean out-of-header. The member definitions are still templates, so in a real project they go in the same header as the class (often below it, or in a `.inl`/`.tpp` file the header includes), for the same reason as function templates.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the out-of-class definition of `Stack<T>::isEmpty`.',
      template: `___ <___ T>
bool Stack<___>::isEmpty() const {
    return items_.empty();
}`,
      blanks: [{ answers: ['template'] }, { answers: ['typename', 'class'] }, { answers: ['T'] }],
      wordBank: ['template', 'typename', 'T', 'auto', 'Stack', 'int'],
      explanation:
        'An out-of-class member of a class template is itself a template, so it repeats `template <typename T>`. The qualified name must be `Stack<T>::` — plain `Stack::` is an error outside the class, because `Stack` alone is a template, not a class. Writing `Stack<int>::` would define a member of one specific instantiation instead (that is a specialization, covered later).',
    },
    {
      kind: 'concept',
      title: 'Class template argument deduction (C++17)',
      blocks: [
        {
          type: 'p',
          text: 'Since C++17 you can often leave the angle brackets off when you create an object. [[ctad|Class template argument deduction]] (CTAD) lets the compiler work out the arguments from the constructor arguments, much like function template deduction:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

template <typename T>
struct Reward {
    std::string name;
    T amount;
    Reward(std::string n, T a) : name{std::move(n)}, amount{a} {}
};

int main() {
    std::vector levels{1, 2, 3};
    std::pair drop{"Potion", 3};
    Reward xp{"XP", 250};
    Reward speed{"Speed", 1.25};

    std::cout << levels.size() << ' ' << drop.first << ' '
              << xp.amount << ' ' << speed.amount << '\\n';
}`,
          output: '3 Potion 250 1.25',
          annotations: [
            { lines: 14, text: 'Deduced as `std::vector<int>` from the `int` elements.' },
            { lines: 15, text: 'Deduced as `std::pair<const char*, int>` — the literal decays to a pointer. Not `std::string`! Write `std::pair<std::string, int>` if you want an owning string.' },
            { lines: 16, text: 'Our own template works too: the constructor\'s second parameter has type `T`, and `250` is an `int`, so this is a `Reward<int>`.' },
            { lines: 17, text: '`1.25` is a `double`, so this is a `Reward<double>` — a completely different class from `xp`\'s.' },
          ],
        },
        {
          type: 'p',
          text: 'Under the hood, the compiler pretends each constructor is a function template and runs ordinary deduction on it. When that is not enough, a class can provide **deduction guides** that say "a call that looks like this should produce that type".',
        },
        {
          type: 'table',
          headers: ['Code', 'Deduced type', 'Why it surprises people'],
          rows: [
            ['`std::pair p{"Gem", 5};`', '`std::pair<const char*, int>`', 'String literals decay to pointers'],
            ['`std::vector v{5, 1};`', '`std::vector<int>` holding **2** elements', 'Braces prefer the list constructor; `v(5, 1)` would hold five 1s'],
            ['`std::vector w{v};`', '`std::vector<int>` (a copy of `v`)', 'Copying is preferred over making a vector of vectors'],
            ['`std::array a{1, 2, 3};`', '`std::array<int, 3>`', 'Even the size is deduced'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'When to use CTAD',
          text: 'Use CTAD when the type is obvious from the initializer, like `std::array a{1, 2, 3}` or `std::vector levels{1, 2, 3}`. Spell the type out when the deduced type would surprise a reader, and for class members, where the full type documents your intent. Note that CTAD is all-or-nothing: `std::array<int> a{1, 2, 3};` is an error — you cannot give some arguments and deduce the rest.',
        },
        {
          type: 'deepdive',
          title: 'Writing a deduction guide',
          blocks: [
            {
              type: 'p',
              text: 'Suppose you want `Label l{"Sword"};` to store a `std::string`, not a `const char*`. A deduction guide looks like a function declaration with a trailing return type naming the class to produce:',
            },
            {
              type: 'code',
              code: `template <typename T>
struct Label {
    T text;
};

Label(const char*) -> Label<std::string>;

Label l{"Sword"};   // Label<std::string>`,
              annotations: [
                { lines: 6, text: 'Read it as: "when constructed from a `const char*`, deduce `Label<std::string>`". This is how the standard library steers CTAD for its own types.' },
              ],
            },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'With C++17 CTAD, what is the type of `drop` in `std::pair drop{"Elixir", 2};`?',
      options: [
        { text: '`std::pair<std::string, int>`', why: 'Nothing in the initializer is a `std::string`. CTAD only deduces from the actual argument types; it does not guess what you meant.' },
        { text: '`std::pair<const char*, int>`', correct: true, why: '`std::pair`\'s deduction guide takes its arguments by value, so the `const char[7]` array decays to `const char*`.' },
        { text: '`std::pair<const char[7], int>`', why: 'Arrays cannot be copied into a pair member like this; the standard deduction guide decays them to pointers.' },
        { text: 'It does not compile — `std::pair` needs explicit template arguments', why: 'Before C++17 that was true (hence `std::make_pair`). Since C++17, CTAD deduces the arguments from the initializer.' },
      ],
      explanation:
        'CTAD follows the same decay rules as by-value template deduction: arrays become pointers, top-level `const` is dropped. A `std::pair<const char*, int>` does not own its text — it points at the literal, which is fine here, but would dangle if it pointed into a temporary buffer. When you want an owning string, write the type out: `std::pair<std::string, int>`.',
    },
    {
      kind: 'concept',
      title: 'Non-type template parameters',
      blocks: [
        {
          type: 'p',
          text: 'Template parameters do not have to be types. A [[non-type-template-parameter]] is a compile-time *value* — most often a size. You have used one already: the `5` in `std::array<int, 5>`. Here we build a fixed-size room whose dimensions are part of its type:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <array>
#include <cstddef>
#include <iostream>

template <typename T, std::size_t Width, std::size_t Height>
struct FixedGrid {
    std::array<T, Width * Height> cells{};

    T& at(std::size_t x, std::size_t y) {
        return cells[y * Width + x];
    }
};

template <typename T, std::size_t N>
std::size_t countOf(const std::array<T, N>& arr, const T& value) {
    std::size_t n = 0;
    for (const T& v : arr) {
        if (v == value) ++n;
    }
    return n;
}

int main() {
    FixedGrid<char, 4, 3> room;
    room.cells.fill('.');
    room.at(0, 0) = 'E';
    room.at(3, 2) = 'E';
    std::cout << room.cells.size() << " cells, "
              << countOf(room.cells, 'E') << " enemies\\n";

    std::array<int, 5> hp{100, 0, 40, 0, 75};
    std::cout << countOf(hp, 0) << " knocked out\\n";
}`,
          output: `12 cells, 2 enemies
2 knocked out`,
          annotations: [
            { lines: 5, text: 'One type parameter and two **value** parameters. `Width` and `Height` are constants known at compile time, not member variables.' },
            { lines: 7, text: 'They can be used anywhere a constant expression is allowed — even to compute another template argument: `Width * Height`.' },
            { lines: 14, text: 'Function templates can deduce non-type parameters too: passing a `std::array<int, 5>` deduces `T = int` and `N = 5`. This one function handles arrays of every size.' },
            { lines: 24, text: '`FixedGrid<char, 4, 3>` and `FixedGrid<char, 5, 3>` are different types with separately compiled member functions.' },
          ],
        },
        {
          type: 'p',
          text: 'The argument must be a **constant expression**: a literal, a `constexpr` variable, or anything else the compiler can evaluate at compile time. Allowed parameter types are integers, enums, pointers and references, `std::nullptr_t`, and since C++20 also floating-point values and simple "structural" class types.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why put a size in the type?',
          text: 'When the size is part of the type, the compiler knows exactly how big an object is. A `FixedGrid<char, 4, 3>` is just 12 chars stored inline — on the stack or inside another object — with no heap allocation and no stored size field. Loops over it can be unrolled, and passing a 4×3 grid where an 8×8 one is expected is a compile error instead of a crash. The trade-off: the size must be fixed when you compile, and each distinct size means another instantiation.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Fixed sizes in Unreal',
          text: 'Unreal has `TStaticArray<T, N>`, its counterpart to `std::array`, and uses non-type parameters in allocators: `TInlineAllocator<8>` tells a `TArray` to reserve room for 8 elements *inside the array object itself*, avoiding the heap entirely until a ninth element arrives.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This program does not compile. Tap the line the compiler rejects.',
      code: `#include <array>
#include <iostream>

int main() {
    int partySize = 4;
    std::array<int, partySize> health{};
    health[0] = 100;
    std::cout << health[0] << '\\n';
}`,
      bugLines: [6],
      hint: 'A template argument must be known when the program is compiled, not when it runs.',
      explanation:
        '`partySize` is an ordinary variable, so its value is only guaranteed to exist at run time; g++ reports "the value of \'partySize\' is not usable in a constant expression". Template arguments are part of a type, and types are fixed at compile time. Declare it `constexpr int partySize = 4;` — or, if the party size really changes while the game runs, use a `std::vector<int>` sized at run time.',
    },
    {
      kind: 'concept',
      title: 'Full specialization: a custom version for one type',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes the generic version is wrong or wasteful for one particular type. A [[template-specialization|full specialization]] replaces the template for exactly one set of arguments. You write `template <>` (empty brackets — no parameters left) and name the arguments after the class name:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string>

template <typename T>
struct Setting {
    std::string name;
    T value;
    void print() const {
        std::cout << name << " = " << value << '\\n';
    }
};

template <>
struct Setting<bool> {
    std::string name;
    bool value;
    void print() const {
        std::cout << name << " = "
                  << (value ? "ON" : "OFF") << '\\n';
    }
};

int main() {
    Setting<int> volume{"Volume", 80};
    Setting<double> sens{"Sensitivity", 1.5};
    Setting<bool> vsync{"VSync", true};
    volume.print();
    sens.print();
    vsync.print();
}`,
          output: `Volume = 80
Sensitivity = 1.5
VSync = ON`,
          annotations: [
            { lines: '4-11', text: 'The **primary template** handles every type by default. It must be declared before any specialization.' },
            { lines: '13-14', text: '`template <>` plus `Setting<bool>`: "when `T` is `bool`, use this class instead". No placeholders remain.' },
            { lines: '15-16', text: 'The specialization is a completely separate class definition. It inherits **nothing** from the primary template, so every member must be written again — here `name` and `value`.' },
            { lines: 26, text: '`Setting<bool>` picks the specialization automatically; users of the template do not need to know it exists.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The famous cautionary tale: std::vector<bool>',
          text: 'The standard library specializes `std::vector<bool>` to pack eight `bool`s into each byte. It saves memory, but it is not a real container of `bool`: `operator[]` returns a proxy object rather than a `bool&`, so `bool& b = flags[0];` does not compile and generic code that works for every other `vector<T>` can break. Specialize to change *how* something is done, not *what* the interface promises.',
        },
        {
          type: 'p',
          text: 'Class templates also support **partial specialization** — a version for a whole family of arguments, such as every pointer type `Setting<T*>`. For function templates, prefer writing an ordinary overload instead of specializing; overloads interact with overload resolution in the way readers expect.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'If the primary template `Setting<T>` has a `name` member, the specialization `template <> struct Setting<bool>` automatically gets `name` too, so it only needs to define the members that differ.',
      answer: false,
      explanation:
        'A full specialization is an independent class that merely shares the template\'s name. It starts empty: anything it needs, including `name`, must be declared again. If several specializations share a lot of code, the usual technique is to move the shared parts into a common base class (or a helper template) that each version uses.',
    },
    {
      kind: 'concept',
      title: 'Alias templates: names for families of types',
      blocks: [
        {
          type: 'p',
          text: 'A [[type-alias]] gives an existing type a new name: `using Score = int;` (the namespaces and aliases lesson covers them fully). An [[alias-template]] gives a name to a whole family of types, leaving some arguments open:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <map>
#include <string>
#include <vector>

template <typename T>
using Grid2D = std::vector<std::vector<T>>;

template <typename V>
using ByName = std::map<std::string, V>;

int main() {
    Grid2D<int> heights{{1, 2, 3}, {4, 5, 6}};
    ByName<int> gold{{"Ayla", 120}, {"Brom", 75}};
    ByName<Grid2D<int>> savedMaps;
    savedMaps["Cave"] = heights;

    std::cout << heights[1][2] << ' ' << gold["Brom"] << ' '
              << savedMaps["Cave"][0][1] << '\\n';
}`,
          output: '6 75 2',
          annotations: [
            { lines: '6-7', text: '`Grid2D<int>` now means `std::vector<std::vector<int>>`. The alias hides a noisy type behind a name that states its purpose.' },
            { lines: '9-10', text: 'An alias can fix some arguments and leave others open: the key is always `std::string`, only the value type varies.' },
            { lines: 15, text: 'Aliases compose: this is `std::map<std::string, std::vector<std::vector<int>>>`. Compare the readability.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'An alias is not a new type',
          text: '`ByName<int>` *is* `std::map<std::string, int>` — same type, interchangeable everywhere. Aliases improve readability and let you change a type in one place, but they do not add type safety. Note also that the older `typedef` keyword cannot be templated at all; alias templates need `using`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'You have seen these in the standard library',
          text: 'The standard library is full of alias templates. `std::pmr::vector<T>` is an alias for a `std::vector` with a special allocator, and type helpers such as `std::remove_reference_t<T>` are alias templates that save you writing `typename std::remove_reference<T>::type`.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which line correctly declares an alias template so that `Pool<Enemy>` means `std::vector<std::unique_ptr<Enemy>>`?',
      codeOptions: true,
      options: [
        {
          text: 'using Pool<T> = std::vector<std::unique_ptr<T>>;',
          why: 'The template parameter must be introduced with `template <typename T>` first; without it, `T` is an unknown name and `Pool<T>` is not valid on the left side.',
        },
        {
          text: 'template <typename T>\ntypedef std::vector<std::unique_ptr<T>> Pool;',
          why: '`typedef` cannot be templated. This is exactly the limitation alias templates were added (in C++11) to remove.',
        },
        {
          text: 'template <typename T>\nusing Pool = std::vector<std::unique_ptr<T>>;',
          correct: true,
          why: 'Template header, then `using Name = type;` where the type may use the parameters.',
        },
        {
          text: 'template <typename T>\nclass Pool = std::vector<std::unique_ptr<T>>;',
          why: 'This mixes class template syntax with alias syntax. A class template needs a body; an alias uses `using`.',
        },
      ],
      explanation:
        'An alias template is `template <parameters>` followed by `using Name = some-type-using-the-parameters;`. Because it is a true alias, `Pool<Enemy>` and `std::vector<std::unique_ptr<Enemy>>` are interchangeable — functions accepting one accept the other.',
    },
    {
      kind: 'concept',
      title: 'Default template arguments and Unreal\'s containers',
      blocks: [
        {
          type: 'p',
          text: 'Template parameters can have defaults, just like function parameters. The standard containers use this constantly: `std::vector<T>` is really `std::vector<T, Allocator = std::allocator<T>>`, and `std::map<K, V>` hides a comparison and an allocator. Here our stack lets advanced users choose the storage:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <deque>
#include <iostream>
#include <vector>

template <typename T, typename Container = std::vector<T>>
class Stack {
public:
    void push(const T& item) { items_.push_back(item); }
    std::size_t size() const { return items_.size(); }

private:
    Container items_;
};

int main() {
    Stack<int> a;
    Stack<int, std::deque<int>> b;
    a.push(1);
    b.push(1);
    b.push(2);
    std::cout << a.size() << ' ' << b.size() << '\\n';
}`,
          output: '1 2',
          annotations: [
            { lines: 5, text: 'The default can depend on earlier parameters: `std::vector<T>`. Parameters with defaults must come after those without (as with function parameters).' },
            { lines: 16, text: 'Most users never think about the second parameter: `Stack<int>` is `Stack<int, std::vector<int>>`.' },
            { lines: 17, text: 'Anyone who needs different storage passes it explicitly. The standard `std::stack` adapter is designed exactly like this.' },
          ],
        },
        {
          type: 'p',
          text: 'Unreal\'s containers follow the same design, with a `T` prefix that the engine\'s coding standard reserves for templates. Everything in this lesson shows up in their declarations:',
        },
        {
          type: 'code',
          title: 'Inventory.h (Unreal, excerpt)',
          code: `UPROPERTY(EditAnywhere, Category = "Loot")
TArray<TObjectPtr<AActor>> Targets;

UPROPERTY(EditAnywhere, Category = "Loot")
TMap<FName, int32> LootTable;

// plain C++ member, not reflected
TArray<FVector, TInlineAllocator<16>> PathPoints;`,
          annotations: [
            { lines: 2, text: '[[tarray]] is Unreal\'s `std::vector`. Here `T` is itself a template instantiation, [[tobjectptr]] wrapping a pointer to an actor.' },
            { lines: 5, text: '[[tmap]] takes a key and a value type, like `std::map<K, V>`, but it is a [[hash-table]] — closer to `std::unordered_map`.' },
            { lines: 8, text: 'The second parameter of `TArray` is an allocator with a default (`FDefaultAllocator`). `TInlineAllocator<16>` — a template with a non-type parameter — stores the first 16 points inside the array object, so short paths never touch the heap.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Templates and Unreal reflection',
          text: 'Unreal\'s reflection system (the code generator behind `UPROPERTY` and `UCLASS`) only understands a fixed set of templates — `TArray`, `TMap`, `TSet`, `TObjectPtr`, `TSubclassOf`, `TWeakObjectPtr`, `TSoftObjectPtr` and a few more. A `UCLASS` or `USTRUCT` cannot itself be a template, and reflected containers cannot be nested (`TArray<TArray<int32>>` is not allowed as a `UPROPERTY`). Plain C++ templates are fine everywhere else in your code.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'In the Unreal declaration `TArray<FVector, TInlineAllocator<16>> PathPoints;`, what is the `16`?',
      options: [
        {
          text: 'The maximum number of elements; adding a 17th fails',
          why: 'An inline allocator is an optimization, not a limit. Beyond the inline capacity the array moves to the heap like a normal `TArray`.',
        },
        {
          text: 'A constructor argument that reserves 16 elements at run time',
          why: 'Constructor arguments go in parentheses or braces after the variable name. Anything inside the angle brackets is a template argument, fixed at compile time.',
        },
        {
          text: 'A default template argument that can be changed later with `SetNum`',
          why: 'Template arguments are part of the type and can never change at run time. `SetNum` changes the element count, not the type.',
        },
        {
          text: 'A non-type template argument: the number of elements stored inline before the array falls back to heap allocation',
          correct: true,
          why: '`TInlineAllocator` is a class template with a size parameter, and that instantiation is passed as `TArray`\'s second (allocator) argument.',
        },
      ],
      explanation:
        'Reading nested template arguments is a core Unreal skill. `TArray` has two template parameters: the element type and an allocator (defaulted to `FDefaultAllocator`). `TInlineAllocator<16>` is an instantiation of a class template whose non-type parameter sets how many elements live inside the `TArray` object itself — the same idea as the `N` in `std::array<T, N>`, used to avoid small heap allocations in hot gameplay code.',
    },
  ],
  takeaways: [
    'A class template generates a separate, unrelated class for each set of template arguments: `Stack<int>` and `Stack<double>` share nothing but source code.',
    'Out-of-class member definitions repeat `template <typename T>` and use the qualified name `ClassName<T>::member`, and still belong in the header.',
    'Members of a class template are instantiated only when used, so one template can serve types with different capabilities.',
    'CTAD (C++17) deduces class template arguments from constructor arguments; watch out for string literals deducing `const char*` and brace-initialization surprises.',
    'Non-type template parameters such as `std::array<T, N>` bake compile-time values into the type: no heap, known size, but one instantiation per value.',
    'A full specialization (`template <> class X<bool>`) is an independent class; an alias template (`template <typename T> using ...`) is just a new name.',
    'Unreal\'s `TArray`, `TMap` and `TInlineAllocator<N>` are ordinary class templates with default and non-type arguments.',
  ],
  reading: [
    {
      title: 'Class template',
      url: 'https://en.cppreference.com/w/cpp/language/class_template',
      source: 'cppreference',
      note: 'Declaration and instantiation rules for class templates, including when members are implicitly instantiated.',
    },
    {
      title: 'Class template argument deduction (CTAD)',
      url: 'https://en.cppreference.com/w/cpp/language/class_template_argument_deduction',
      source: 'cppreference',
      note: 'How the implicit deduction guides are formed and how to write your own.',
    },
    {
      title: 'Template parameters and template arguments',
      url: 'https://en.cppreference.com/w/cpp/language/template_parameters',
      source: 'cppreference',
      note: 'Every kind of template parameter — type, non-type and template template — with the allowed types for non-type parameters.',
    },
    {
      title: 'Class templates',
      url: 'https://www.learncpp.com/cpp-tutorial/class-templates/',
      source: 'learncpp',
      note: 'A beginner-friendly companion to this lesson with extra worked examples.',
    },
    {
      title: 'Array Containers in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/array-containers-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s guide to `TArray`, including allocators and how it differs from `std::vector`.',
    },
  ],
};
