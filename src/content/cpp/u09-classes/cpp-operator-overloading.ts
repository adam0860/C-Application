import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-operator-overloading',
  title: 'Operator Overloading',
  summary: 'Giving your types natural syntax — `a + b`, `a == b`, `std::cout << a`, `a[i]` — and the rules that keep overloaded operators unsurprising.',
  minutes: 19,
  objectives: [
    'Explain what operator overloading is and what it can and cannot change',
    'Implement compound-assignment operators as members and arithmetic operators as free functions built on them',
    'Default `==` and `<=>` (C++20) to get every comparison operator from one or two lines',
    'Overload `<<` for printing and `[]` with const and non-const versions',
    'Apply the guidelines that keep overloaded operators predictable for readers',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Why overload operators?',
      blocks: [
        {
          type: 'p',
          text: 'Game code is full of vector math: positions plus velocities, directions times speeds. With only named functions it reads like `add(position, scale(velocity, dt))`. [[operator-overloading|Operator overloading]] lets your own types use the familiar symbols, so you can write `position + velocity * dt`. An overloaded operator is just a function with a special name: `operator+`, `operator==`, `operator<<`.',
        },
        {
          type: 'code',
          title: 'vec2.cpp',
          runnable: true,
          code: `#include <iostream>

struct Vec2 {
    float x = 0.0f;
    float y = 0.0f;
};

Vec2 operator+(Vec2 a, Vec2 b) {
    return {a.x + b.x, a.y + b.y};
}

int main() {
    Vec2 position{10.0f, 5.0f};
    Vec2 velocity{2.5f, -1.0f};
    Vec2 next = position + velocity;   // operator+(position, velocity)
    std::cout << next.x << ", " << next.y << '\\n';
}`,
          output: '12.5, 4',
          annotations: [
            { lines: '8-10', text: 'An ordinary function whose name is `operator+`. It takes two `Vec2`s and returns a new one; the braced `return` builds the result member by member.' },
            { lines: 15, text: 'When the compiler sees `+` with a `Vec2` operand, it looks for a matching `operator+` and calls it. You could even write `operator+(position, velocity)` yourself.' },
          ],
        },
        { type: 'heading', text: 'What you can and cannot change' },
        {
          type: 'list',
          items: [
            'You can only overload operators that already exist — there is no way to invent `**` or `<>`.',
            'Precedence, associativity and the number of operands stay fixed: `a + b * c` still multiplies first.',
            'At least one operand must be a user-defined type, so nobody can change what `1 + 2` means.',
            'A few operators cannot be overloaded at all: `::`, `.`, `.*`, `?:` and `sizeof`.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does C++ allow this?',
          text: 'So that user-defined types can be as convenient as built-in ones. The standard library relies on it everywhere: `std::string` concatenates with `+`, streams use `<<`, iterators use `*` and `++`, smart pointers use `->`. It also lets generic code (templates, Unit 12) work identically on an `int` and on your `Vec2`. This is the feature references were originally invented for.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: '[[fvector]] overloads the arithmetic operators, so `GetActorLocation() + GetActorForwardVector() * 500.0f` computes a point 500 units ahead of an actor. It also overloads `|` as the dot product and `^` as the cross product — a choice we will revisit at the end of this lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'Given the code above, what does the compiler do with `position + velocity`?',
      options: [
        { text: 'It adds the raw bytes of the two structs together', why: 'The compiler never invents arithmetic on your types. Without an `operator+`, the expression would not compile at all.' },
        { text: 'It reports an error, because `+` only works on numbers', why: 'That is what happens when no suitable `operator+` exists. Here one is declared for two `Vec2`s, so it is used.' },
        { text: 'It converts both vectors to `float` and adds those', why: '`Vec2` has no conversion to `float`, and even if it did, an exact `operator+` match is preferred.' },
        { text: 'It calls the function `operator+` with the two `Vec2`s as arguments', correct: true, why: 'An operator expression on a class type is turned into a call to the matching `operator` function, chosen by overload resolution.' },
      ],
      explanation:
        'Overloaded operators are syntax for function calls: `a + b` becomes `operator+(a, b)` (or `a.operator+(b)` for a member). Everything you know about functions — parameters, references, overload resolution — applies unchanged.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Members vs free functions',
      blocks: [
        {
          type: 'p',
          text: 'An operator can be written as a member function (the left operand becomes `*this`) or as a [[free-function]] (both operands are parameters). The idiomatic split: [[compound-assignment]] operators such as `+=` modify their left operand, so they are **members** returning `*this` by reference; symmetric operators such as `+` produce a new value, so they are **free functions** built on top of `+=`.',
        },
        {
          type: 'code',
          title: 'vec2-ops.cpp',
          runnable: true,
          code: `#include <iostream>

class Vec2 {
public:
    Vec2(float x, float y) : x{x}, y{y} {}

    Vec2& operator+=(const Vec2& rhs) {   // member: modifies *this
        x += rhs.x;
        y += rhs.y;
        return *this;
    }
    Vec2& operator*=(float s) {
        x *= s;
        y *= s;
        return *this;
    }
    float getX() const { return x; }
    float getY() const { return y; }

private:
    float x;
    float y;
};

Vec2 operator+(Vec2 lhs, const Vec2& rhs) {   // free: built on +=
    lhs += rhs;
    return lhs;
}
Vec2 operator*(Vec2 v, float s) { return v *= s; }
Vec2 operator*(float s, Vec2 v) { return v *= s; }

int main() {
    Vec2 pos{1.0f, 2.0f};
    Vec2 vel{0.5f, 0.5f};
    pos += vel * 2.0f;
    Vec2 knockback = 3.0f * Vec2{1.0f, 0.0f};
    std::cout << pos.getX() << ", " << pos.getY() << '\\n';
    std::cout << knockback.getX() << ", " << knockback.getY() << '\\n';
}`,
          output: '2, 3\n3, 0',
          annotations: [
            { lines: '7-11', text: '`a += b` calls `a.operator+=(b)`. Returning `*this` by reference makes it behave like the built-in `+=`, which yields its left operand (and allows chaining).' },
            { lines: '25-28', text: '`lhs` is taken **by value**: we need a copy to return anyway, so the parameter is that copy. The actual math lives only in `+=`.' },
            { lines: 30, text: '`2.0f * v` has a `float` on the left, and `float` has no member functions. Only a free function can support this order.' },
            { lines: 35, text: '`vel * 2.0f` builds a new vector; `+=` then adds it to `pos` in place.' },
          ],
        },
        {
          type: 'table',
          headers: ['Operator', 'Write it as', 'Why'],
          rows: [
            ['`=`, `[]`, `()`, `->`', 'Member (required)', 'The language demands it'],
            ['`+=`, `-=`, `*=` …', 'Member, returns `T&`', 'Modifies the left operand, which must be your object'],
            ['`+`, `-`, `*`, `==` …', 'Free function (or hidden friend)', 'Treats both operands alike, including conversions and `float * Vec2`'],
            ['`<<` / `>>` for streams', 'Free function (or hidden friend)', 'The left operand is a stream, which you cannot add members to'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why build + on top of +=?',
          text: 'One implementation of the math instead of two that could drift apart. `+=` does the work in place (no temporary), and `+` is a three-line wrapper that copies, delegates and returns. The C++ Core Guidelines and the standard library\'s own types follow this pattern.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'fill',
      prompt: 'Complete `operator-=` as a member of `Vec2`, so that it behaves like the built-in `-=`.',
      template: `Vec2___ operator-=(const Vec2& rhs) {
    x -= rhs.x;
    y -= rhs.y;
    return ___;
}`,
      blanks: [{ answers: ['&'] }, { answers: ['*this'] }],
      wordBank: ['&', '*', '*this', 'this', 'rhs', 'void'],
      explanation:
        'Compound assignment modifies the left operand and returns **it** — so the return type is `Vec2&` and the function returns `*this` (the object, not the pointer `this`). Returning `void` would break expressions like `(a -= b).getX()`, and returning by value would hand back a copy, surprising anyone who chains it.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Comparisons: == and the spaceship <=>',
      blocks: [
        {
          type: 'p',
          text: 'Before C++20, a type that wanted every comparison needed six hand-written operators — `==`, `!=`, `<`, `<=`, `>`, `>=` — that all had to agree. C++20 lets you **default** them. `bool operator==(const T&) const = default;` compares all members in declaration order. `auto operator<=>(const T&) const = default;` defines the [[three-way-comparison]], and from it the compiler derives `<`, `<=`, `>` and `>=`. Defaulting `<=>` also gives you a defaulted `==`.',
        },
        {
          type: 'code',
          title: 'versions.cpp',
          runnable: true,
          code: `#include <compare>
#include <iostream>

struct GameVersion {
    int major = 0;
    int minor = 0;
    int patch = 0;

    auto operator<=>(const GameVersion&) const = default;
};

int main() {
    GameVersion installed{1, 4, 2};
    GameVersion latest{1, 10, 0};
    std::cout << std::boolalpha;
    std::cout << (installed < latest) << '\\n';
    std::cout << (installed == latest) << '\\n';
    std::cout << (installed != GameVersion{1, 4, 2}) << '\\n';
    std::cout << (latest >= installed) << '\\n';
}`,
          output: 'true\nfalse\nfalse\ntrue',
          annotations: [
            { lines: 1, text: 'Using `<=>` requires the `<compare>` header, which defines its result types.' },
            { lines: 9, text: 'One line provides all six comparisons. Members are compared lexicographically: `major` first, then `minor` only if the majors are equal, then `patch`.' },
            { lines: 16, text: 'Majors tie at 1, then 4 < 10, so `installed` is older. (Comparing the strings `"1.4.2"` and `"1.10.0"` would get this wrong: `\'4\' > \'1\'`.)' },
            { lines: 18, text: '`!=` is never declared: the compiler rewrites `a != b` as `!(a == b)`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the spaceship operator?',
          text: 'Six separate operators were tedious and easy to get inconsistent (`a < b` true while `b > a` false). A single three-way comparison answers "less, equal or greater?" in one step, and the compiler rewrites every relational expression in terms of it — `a < b` becomes `(a <=> b) < 0`. Less code, and consistent by construction.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Defaulted comparisons and floats',
          text: 'A defaulted `==` compares `float` members exactly, so two positions that differ by 0.0001 are "not equal" — usually not what gameplay code wants. Unreal provides `FVector::Equals(Other, Tolerance)` for this reason; for your own types, write a named function with a tolerance rather than redefining `==` to mean "nearly equal".',
        },
        {
          type: 'deepdive',
          title: 'Comparison categories',
          blocks: [
            {
              type: 'p',
              text: '`<=>` returns one of three types from `<compare>`. `std::strong_ordering` means equal values are interchangeable (integers). `std::weak_ordering` allows values that compare equivalent but are distinguishable (case-insensitive names). `std::partial_ordering` allows values that are not comparable at all — floating point, because NaN is neither less, equal nor greater than anything. A defaulted `<=>` returns the weakest category among the members, so a single `float` member makes it `partial_ordering`.',
            },
            {
              type: 'p',
              text: 'You can also write `<=>` by hand to order by a chosen key — say, leaderboard entries by score only. If you do, make sure `==` agrees with it.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: 'In C++20, if a class declares `bool operator==(const T&) const = default;`, the expression `a != b` compiles even though no `operator!=` is declared.',
      answer: true,
      explanation:
        'C++20 adds "rewritten candidates": when looking for `a != b`, the compiler also considers `!(a == b)`. Likewise `a < b` can use `(a <=> b) < 0`, and the operands may even be swapped (`b == a`). That is why one or two defaulted operators are enough for a complete set of comparisons.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Printing with <<',
      blocks: [
        {
          type: 'p',
          text: '`std::cout << item` calls `operator<<(std::cout, item)`. The left operand is a `std::ostream`, a library class you cannot add members to — so this operator must be a free function. Its canonical form takes the stream by non-const reference (writing changes it, and streams cannot be copied) and **returns the stream**, so that chaining works exactly like returning `*this` did in the last lesson.',
        },
        {
          type: 'code',
          title: 'print.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

class Item {
public:
    Item(const std::string& n, int q) : name{n}, qty{q} {}

    friend std::ostream& operator<<(std::ostream& os, const Item& it) {
        return os << it.name << " x" << it.qty;   // may read privates
    }

private:
    std::string name;
    int qty;
};

int main() {
    Item potion{"Potion", 3};
    Item arrow{"Arrow", 40};
    std::cout << potion << " | " << arrow << '\\n';
}`,
          output: 'Potion x3 | Arrow x40',
          annotations: [
            { lines: 8, text: '[[friend]] makes this free function a friend of `Item`: not a member, but allowed to read private members. Defining it inside the class makes it a [[hidden-friend]].' },
            { lines: 9, text: 'Each `<<` inside returns `os`, so the whole expression evaluates to `os`, which we return.' },
            { lines: 20, text: 'Parsed as `((((std::cout << potion) << " | ") << arrow) << \'\\n\')`. Every step receives the stream returned by the previous one.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Why hidden friends?',
          text: 'A friend defined inside the class can only be found through the class\'s own arguments ([[argument-dependent-lookup]]). It sits right next to the type it prints, needs no public getters, and does not clutter the overload list the compiler searches for every other `<<` in the program — which keeps compile times and error messages under control.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Let the caller decide the layout',
          text: 'Do not end the output with `\'\\n\'` inside `operator<<`, and do not change the object while printing it. Callers expect `std::cout << item` to behave like `std::cout << 42`: print the value, nothing more.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Unreal code does not use iostreams. Its types provide a `ToString()` member returning an `FString` instead, which you pass to logging: `UE_LOG(LogTemp, Log, TEXT("At %s"), *GetActorLocation().ToString());`. The idea is the same: give a type one canonical text form.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'bug',
      prompt: 'This fails to compile on line 13 with "invalid operands of types \'void\' and \'char\'". Tap the line that causes it.',
      code: `#include <iostream>

struct Score {
    int points = 0;
};

void operator<<(std::ostream& os, const Score& s) {
    os << s.points << " pts";
}

int main() {
    Score s{150};
    std::cout << s << '\\n';
}`,
      bugLines: [7],
      hint: 'What does `std::cout << s` evaluate to, and what is the next `<<` applied to?',
      explanation:
        'Because `operator<<` returns `void`, the expression `std::cout << s` has type `void`, and the following `<< \'\\n\'` has nothing to insert into. The fix is the canonical signature: `std::ostream& operator<<(std::ostream& os, const Score& s) { return os << s.points << " pts"; }`. Returning the stream is what makes chaining possible.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Subscript []: const and non-const',
      blocks: [
        {
          type: 'p',
          text: '`operator[]` gives a container-like class natural indexing. It must be a member, and — just like the `slot()` functions in the previous lesson — it usually comes in **two** overloads: a non-const one returning a reference so callers can write through it, and a const one returning a const reference for read-only access.',
        },
        {
          type: 'code',
          title: 'hotbar.cpp',
          runnable: true,
          code: `#include <array>
#include <iostream>

class Hotbar {
public:
    int& operator[](int slot) { return items[slot]; }
    const int& operator[](int slot) const { return items[slot]; }

private:
    std::array<int, 4> items{};   // item IDs, 0 = empty
};

void show(const Hotbar& bar) {
    for (int i = 0; i < 4; ++i) {
        std::cout << bar[i] << ' ';     // const version
    }
    std::cout << '\\n';
}

int main() {
    Hotbar bar;
    bar[0] = 101;       // non-const version returns int&
    bar[2] = 205;
    show(bar);
}`,
          output: '101 0 205 0',
          annotations: [
            { lines: 6, text: 'Returning `int&` makes `bar[0]` an alias for the element, so `bar[0] = 101` writes into the hotbar.' },
            { lines: 7, text: 'Chosen for const objects and const references. `bar[0] = 1;` on a `const Hotbar&` does not compile.' },
            { lines: 15, text: '`bar` is a `const Hotbar&` here, so the const overload is called.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Bounds checking is your call',
          text: 'Like built-in arrays and `std::vector`, this `operator[]` does not check the index. Many game codebases add an assertion that is active in development builds only; another option is an `at()` member that always checks. And since C++23, `operator[]` may take several indices, enabling `grid[x, y]`; before that, grids typically use `operator()(x, y)`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'Why does the non-const `operator[]` return `int&` rather than `int`?',
      options: [
        { text: 'Because returning a reference is faster than copying an `int`', why: 'Copying an `int` is as cheap as it gets. Speed is not the reason here — semantics is.' },
        { text: 'So that `bar[0] = 101;` writes into the hotbar instead of into a temporary copy', correct: true, why: 'With `int`, `bar[0]` would be a temporary value; assigning to it would not compile. A reference makes the expression an alias for the stored element.' },
        { text: 'Because references cannot be null, which makes indexing safe', why: 'A reference to an out-of-range element is just as invalid; references do not add bounds checking.' },
        { text: 'Because the language requires `operator[]` to return a reference', why: 'The language allows any return type. The const overload could even return `int` by value.' },
      ],
      explanation:
        'Built-in `a[i]` is an lvalue you can assign to; returning `T&` gives your class the same behaviour. That is exactly why `std::vector::operator[]` returns a reference, and why the const overload returns a `const` reference (or a value) instead — reading is allowed, writing is not.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Guidelines: don\'t surprise your readers',
      blocks: [
        {
          type: 'p',
          text: 'An overloaded operator hides a function call behind a symbol, and readers will assume the symbol means what it always means. The classic advice is **"do as the ints do"**: make your operators behave like the built-in ones.',
        },
        {
          type: 'list',
          items: [
            '**Overload only when the meaning is obvious** to every reader: math types (vectors, matrices, money), containers (`[]`), streams (`<<`), handles (`*`, `->`).',
            '**Keep the usual semantics**: `+` returns a new value and leaves its operands alone; `+=` modifies and returns `*this` by reference; `==` is symmetric.',
            '**Provide consistent families**: if you have `+`, provide `+=`; let `<=>` and `==` generate the comparisons so they always agree.',
            '**Never overload `&&`, `||` or `,`**: the overloads lose the built-in short-circuit evaluation, so both operands are always evaluated. Leave unary `&` alone too.',
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Clever',
            tone: 'bad',
            code: `enemy - 10;          // damage? move left?
inventory + sword;   // add? merge? compare?
player++;            // level up?? respawn??`,
            text: 'Every reader has to look up what the symbol means for this type.',
          },
          right: {
            title: 'Clear',
            tone: 'good',
            code: `enemy.takeDamage(10);
inventory.add(sword);
player.levelUp();`,
            text: 'Named functions say exactly what happens. Save operators for real algebra.',
          },
        },
        {
          type: 'table',
          headers: ['Operator', 'Canonical form for a class `T`'],
          rows: [
            ['`+=` `-=` `*=`', 'Member: `T& operator+=(const T& rhs);`'],
            ['`+` `-` `*`', 'Free: `T operator+(T lhs, const T& rhs);`'],
            ['`==`', 'Member: `bool operator==(const T&) const = default;`'],
            ['`<=>`', 'Member: `auto operator<=>(const T&) const = default;`'],
            ['`<<` (printing)', 'Hidden friend: `friend std::ostream& operator<<(std::ostream&, const T&);`'],
            ['`[]`', 'Member, two overloads: `U& operator[](int);` and `const U& operator[](int) const;`'],
          ],
          caption: 'A cheat sheet of the signatures from this lesson.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine: FVector\'s | and ^',
          text: '`FVector` overloads `|` as the dot product and `^` as the cross product. Compact for veteran graphics programmers — but opaque to everyone else, and their **precedence** is lower than `+` and even `==`, so `A | B == 0.0f` parses as `A | (B == 0.0f)`. Also, `A * B` on two `FVector`s multiplies component-wise; it is not a dot product. Many teams prefer the named `FVector::DotProduct(A, B)` and `FVector::CrossProduct(A, B)` for readability.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which of these overloads would surprise readers and should be avoided? (Select all that apply.)',
      options: [
        { text: 'An `operator+` on `Vec2` that also modifies its left operand', correct: true, why: 'Built-in `a + b` never changes `a`. Code like `c = a + b;` would silently corrupt `a`.' },
        { text: 'An `operator<<` that prints a `Vec2` to any `std::ostream`', why: 'This is the conventional meaning of `<<` with streams, and works exactly like printing an `int`.' },
        { text: 'An `operator-` on `Enemy` meaning "apply damage"', correct: true, why: 'Subtracting a number from an enemy is not an obvious operation. A named function such as `takeDamage` says what it does.' },
        { text: 'An `operator&&` on a `Condition` class that combines two conditions', correct: true, why: 'An overloaded `&&` always evaluates both operands, so code relying on short-circuiting (`ptr && ptr->ok()`) quietly changes meaning.' },
        { text: 'An `operator+=` on `Vec2` that adds in place and returns `*this` by reference', why: 'That is precisely how the built-in `+=` behaves — the canonical form.' },
      ],
      explanation:
        'The test is always "does it behave like the built-in operator a reader already knows?" Printing with `<<` and in-place `+=` pass. A mutating `+`, an operator with an invented meaning, and an `&&` that loses short-circuiting all fail — each forces readers to look up the implementation before they can trust a one-character expression.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'order',
      prompt: 'Assemble the canonical free `operator+` for `Vec2`, implemented on top of its member `operator+=`.',
      lines: ['Vec2 operator+(Vec2 lhs, const Vec2& rhs) {', '    lhs += rhs;', '    return lhs;', '}'],
      distractors: ['    return *this;', '    lhs = lhs + rhs;'],
      explanation:
        'Take the left operand by value (that copy becomes the result), add the right operand in place with `+=`, and return the copy. `return *this;` is impossible — a free function has no `this` — and `lhs = lhs + rhs;` would call this very `operator+` again, recursing forever.',
    },
  ],
  takeaways: [
    'An overloaded operator is a function named `operator@`; you cannot invent operators or change their precedence, arity, or meaning for built-in types.',
    'Write compound assignment (`+=`) as a member returning `*this` by reference, and symmetric operators (`+`) as free functions built on it.',
    'In C++20, defaulting `operator<=>` (and `operator==`) gives you all six comparisons, comparing members in declaration order.',
    'Printing uses a free (often hidden-friend) `std::ostream& operator<<(std::ostream&, const T&)` that returns the stream for chaining.',
    '`operator[]` must be a member; provide a non-const version returning `T&` and a const version returning `const T&`.',
    'Do as the ints do: overload only when the meaning is obvious, keep usual semantics, and never overload `&&`, `||` or `,`.',
  ],
  reading: [
    {
      title: 'Operator overloading',
      url: 'https://en.cppreference.com/w/cpp/language/operators',
      source: 'cppreference',
      note: 'Canonical implementations of every overloadable operator.',
    },
    {
      title: 'Default comparisons (C++20)',
      url: 'https://en.cppreference.com/w/cpp/language/default_comparisons',
      source: 'cppreference',
      note: 'How defaulted `==` and `<=>` work, including the comparison categories.',
    },
    {
      title: 'isocpp FAQ: Operator overloading',
      url: 'https://isocpp.org/wiki/faq/operator-overloading',
      source: 'isocpp',
      note: 'Practical do\'s and don\'ts, including why not to overload `&&` and `||`.',
    },
    {
      title: 'C++ Core Guidelines: Overloading and overloaded operators',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-overload',
      source: 'core-guidelines',
      note: 'Rules for operators with conventional meaning and symmetric free functions.',
    },
  ],
};
