import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-string-view',
  title: 'std::string_view and Text Processing',
  summary: 'Looking at text without copying it: how string_view works, why it makes great function parameters, how it dangles, and how to trim, count and split text with it.',
  minutes: 19,
  objectives: [
    'Explain what a `std::string_view` stores and why it avoids copies',
    'Use `std::string_view` as a read-only function parameter that accepts any kind of string',
    'Recognise views that dangle — of temporaries, of strings that change, and of locals',
    'Trim and slice text cheaply with `remove_prefix`, `remove_suffix` and `substr`',
    'Decide when to use `std::string_view` and when you need an owning `std::string`',
    'Count characters and split text into words with views',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The hidden cost of copying text',
      blocks: [
        {
          type: 'p',
          text: 'In the last lesson every `std::string` owned its characters. Ownership is safe, but it has a price: every copy of a string, and every `substr`, allocates a new buffer (for anything longer than the small-string limit) and copies characters into it. Much of the time you do not want a copy at all — you just want to **look** at some text that already exists.',
        },
        {
          type: 'code',
          code: `std::string log = "[12:04:33] Aria picked up Frost Axe";
std::string time = log.substr(1, 8);     // new string: "12:04:33"
std::string rest = log.substr(11);       // new string, heap allocated
std::string backup = log;                // another full copy`,
          annotations: [
            { lines: '2-4', text: 'Three new strings, three character copies, and (for the longer two) two heap allocations — just to read parts of text we already have.' },
          ],
        },
        {
          type: 'p',
          text: 'C++17 added a lightweight alternative in the `<string_view>` header. A [[string-view|std::string_view]] is a **window onto characters that live somewhere else**. It stores just two things: a pointer to the first character and a length. It never allocates, never copies the characters, and never frees them.',
        },
        {
          type: 'memory',
          caption: 'A string_view looking at part of a std::string. The view owns nothing; it just points into the string\'s buffer.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'log.data', type: 'char*', value: '0x4f00', pointsTo: 'logbuf' },
                { name: 'log.size', type: 'size_t', value: '35' },
                { name: 'time.data', type: 'const char*', value: '0x4f01', pointsTo: 'logbuf', highlight: true },
                { name: 'time.size', type: 'size_t', value: '8', highlight: true },
              ],
            },
            {
              label: 'Heap (owned by log)',
              kind: 'heap',
              cells: [{ id: 'logbuf', value: '"[12:04:33] Aria picked up Frost Axe"', address: '0x4f00' }],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A bookmark, not a photocopy',
          text: 'A `std::string` is your own photocopy of a page: you can scribble on it, and it is yours to keep. A `std::string_view` is a sticky note saying "page 12, lines 3 to 5". It costs nothing to make — but if someone throws the book away, your note points at nothing.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Meet std::string_view',
      blocks: [
        {
          type: 'p',
          text: 'A view can be created from a string literal, a `std::string`, or part of either. It supports almost all of `std::string`\'s **read-only** operations: `size()`, `empty()`, `[]`, `at()`, `front()`, `back()`, `find`, comparisons, `starts_with`/`ends_with`, and printing with `<<`.',
        },
        {
          type: 'code',
          title: 'views.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <string_view>

int main() {
    std::string_view greeting = "Welcome, traveller";
    std::string name = "Aria";
    std::string_view nameView = name;

    std::cout << greeting.size() << '\\n';
    std::cout << greeting.substr(0, 7) << '\\n';
    std::cout << nameView << ' ' << nameView[0] << '\\n';
    std::cout << std::boolalpha << (nameView == "Aria") << '\\n';
}`,
          output: `18
Welcome
Aria A
true`,
          annotations: [
            { lines: 6, text: 'A view of a string literal. Literals live for the whole program, so this view can never dangle. Nothing is copied.' },
            { lines: 8, text: 'A `std::string` converts to a view implicitly and cheaply: the view just records `name`\'s buffer address and length.' },
            { lines: 11, text: '`substr` on a view returns another **view** — a new pointer and length. No allocation, no copy, constant time.' },
            { lines: 13, text: 'Comparisons work just like `std::string` comparisons, character by character.' },
          ],
        },
        {
          type: 'p',
          text: 'What a view cannot do is change the text: there is no `+=`, `append`, `push_back` or assignment to a character. It is a read-only window. (You can move or shrink the window itself, as you will see shortly.)',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Standardising what everyone already built',
          text: 'Before C++17, large code bases kept reinventing this type: Google had `StringPiece`, LLVM has `StringRef`, Chromium and Boost had their own. The standard adopted the idea as `std::string_view` so libraries could finally agree on one vocabulary type for "some characters I am looking at".',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'What does a `std::string_view` actually store?',
      options: [
        { text: 'Its own copy of the characters, in a fixed-size buffer', why: 'That would make it an owning string. A view never copies characters; that is its whole point.' },
        { text: 'A pointer to the first character it looks at, and a length', correct: true, why: 'Exactly two pieces of information, typically 16 bytes on a 64-bit system, no matter how long the text is.' },
        { text: 'A reference to a `std::string` object', why: 'A view can look at a literal, a char array or part of a string, so it cannot be tied to a `std::string` object. It points at characters directly.' },
        { text: 'A pointer to null-terminated characters, with no length', why: 'That is a C-string (`const char*`). A view stores the length explicitly, which is why it can view the middle of a string with no terminator there.' },
      ],
      explanation:
        'Pointer plus length is the entire representation. That is why copying a view is as cheap as copying two integers, why `substr` and `remove_prefix` are just arithmetic on those two values, and why a view is only valid as long as the characters it points at still exist.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'string_view as a function parameter',
      blocks: [
        {
          type: 'p',
          text: 'The most common use of `std::string_view` is as a [[parameter]] of a [[function]]. A function is a named, reusable block of code (Unit 6 covers them fully): `void announce(std::string_view who)` declares a function called `announce` that receives one value, `who`, and returns nothing (`void`). Inside, `who` can be read like any string.',
        },
        {
          type: 'code',
          title: 'announce.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <string_view>

void announce(std::string_view who, std::string_view what) {
    std::cout << who << ' ' << what << "!\\n";
}

int main() {
    std::string boss = "The Lich King";
    announce(boss, "awakens");
    announce("A wild slime", "appears");

    std::string_view line = "Aria levels up";
    announce(line.substr(0, 4), "levels up");
}`,
          output: `The Lich King awakens!
A wild slime appears!
Aria levels up!`,
          annotations: [
            { lines: '5-7', text: 'The function definition. Each call runs the body with `who` and `what` viewing whatever text the caller passed.' },
            { lines: 11, text: 'A `std::string` argument: the view points into `boss`\'s buffer. No copy.' },
            { lines: 12, text: 'String literals: viewed directly. With a `const std::string&` parameter, each literal would first be turned into a temporary `std::string` (and possibly a heap allocation).' },
            { lines: 15, text: 'Part of another view, again without copying.' },
          ],
        },
        {
          type: 'table',
          headers: ['Parameter type', 'Literal argument', '`std::string` argument', 'Substring argument'],
          rows: [
            ['`std::string`', 'builds a new string', 'copies it', 'copy via `substr`'],
            ['`const std::string&`', 'builds a temporary string', 'no copy', 'copy via `substr`'],
            ['`std::string_view`', 'no copy', 'no copy', 'no copy'],
          ],
          caption: 'For a function that only reads text during the call, a view is never worse and often much cheaper.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why pass a view by value, not by reference?',
          text: 'A view is already a kind of reference — two small values that point at the data. Copying it is as cheap as copying two integers, and they can travel in CPU registers. A `const std::string_view&` would add a pointer to the pointer, making every access go through an extra indirection for no benefit. Pass `std::string_view` by value.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Unreal has the same concept: `FStringView` (and `FAnsiStringView`/`FUtf8StringView`) is a non-owning pointer-plus-length view over `TCHAR` text. Many engine APIs still take `const FString&`, but newer ones accept views for the same reason: callers can pass literals and substrings without allocating.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'fill',
      prompt: 'Complete the function so it can check any text — a literal, a `std::string` or part of one — without copying it.',
      template: `#include <___>

bool isChatCommand(std::___ input) {
    return input.___("/");
}`,
      blanks: [{ answers: ['string_view'] }, { answers: ['string_view'] }, { answers: ['starts_with'] }],
      wordBank: ['string_view', 'string', 'starts_with', 'find', 'substr', 'iostream'],
      explanation:
        '`std::string_view` lives in `<string_view>` and makes the parameter accept any text without allocation. `starts_with` (C++20) returns a `bool` directly. `find("/")` would return a position, not a `bool` — and testing it as a `bool` would be exactly backwards, as the previous lesson showed.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'The dangling danger',
      blocks: [
        {
          type: 'p',
          text: 'A view does not keep its characters alive. If the characters are destroyed, moved or overwritten while the view still points at them, the view **dangles**: using it is [[undefined-behavior]], just like a [[dangling-reference]]. The compiler usually cannot tell, and a dangling view often *appears* to work — until a different build, optimisation level or input turns it into garbage or a crash.',
        },
        {
          type: 'compare',
          left: {
            title: 'Dangles',
            tone: 'bad',
            code: `// 1. View of a temporary
std::string_view title =
    first + " the Bold";

// 2. Owner changes after the view
std::string name = "Aria";
std::string_view v = name;
name += " the Unbreakable";  // may reallocate

// 3. Returning a view of a local
std::string_view makeTag() {
    std::string tag = "LOOT";
    return tag;   // tag dies here
}`,
            text: 'Each view outlives, or is invalidated by, the characters it points at.',
          },
          right: {
            title: 'Safe',
            tone: 'good',
            code: `// 1. Keep an owning string
std::string title =
    first + " the Bold";

// 2. Make the view after changes
std::string name = "Aria";
name += " the Unbreakable";
std::string_view v = name;

// 3. Return an owning string
std::string makeTag() {
    std::string tag = "LOOT";
    return tag;
}`,
            text: 'Store results that you need to keep in a `std::string`; take views of data that will outlive them.',
          },
        },
        {
          type: 'steps',
          items: [
            { title: 'Temporaries', text: '`first + " the Bold"` creates a temporary `std::string` that is destroyed at the end of the statement. The view is left pointing at freed memory.' },
            { title: 'Changes to the owner', text: 'Appending may make the string allocate a bigger buffer and free the old one. Any view of the old buffer now dangles — even though `name` itself is fine.' },
            { title: 'Locals', text: 'A local variable is destroyed when its function returns, so a view of it can never safely leave the function.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does C++ allow this?',
          text: 'The whole value of a view is that it skips ownership — and skipping ownership means nobody tracks lifetime for you. Some languages (Rust, for example) check borrowed views at compile time; C++ leaves it to the programmer, with only partial help from compiler warnings and sanitizers. The practical rule: a view must never outlive the thing it views, and the viewed string must not be modified while the view is in use.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'bug',
      prompt: 'On one machine this prints `Aria the Bold`; on another it prints garbage. Tap the line with the bug.',
      code: `#include <iostream>
#include <string>
#include <string_view>

int main() {
    std::string first = "Aria";
    std::string_view title = first + " the Bold";
    std::cout << title << '\\n';
}`,
      bugLines: [7],
      hint: 'How long does the result of `first + " the Bold"` live?',
      explanation:
        '`first + " the Bold"` builds a temporary `std::string`, the view points into its buffer, and the temporary is destroyed at the `;`. Line 8 then reads freed memory — undefined behavior. With GCC at `-O1` it happens to print the right text, which is exactly what makes dangling views so treacherous. Fix: make `title` a `std::string`.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Cheap slicing: remove_prefix, remove_suffix, substr',
      blocks: [
        {
          type: 'p',
          text: 'Because a view is just a pointer and a length, narrowing it is simple arithmetic. `remove_prefix(n)` moves the start forward by `n` characters; `remove_suffix(n)` shortens the end by `n`. The underlying characters are not touched — only the window moves. This makes trimming and tokenizing text almost free.',
        },
        {
          type: 'code',
          title: 'chat_command.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string_view>

int main() {
    std::string_view input = "   /heal 25   ";

    auto first = input.find_first_not_of(' ');
    input.remove_prefix(first);
    auto last = input.find_last_not_of(' ');
    input.remove_suffix(input.size() - last - 1);
    std::cout << '[' << input << "]\\n";

    if (input.starts_with('/')) {
        input.remove_prefix(1);
    }
    std::cout << '[' << input << "]\\n";
}`,
          output: `[/heal 25]
[heal 25]`,
          annotations: [
            { lines: '7-8', text: '`find_first_not_of(\' \')` finds the first non-space character (index 3). Removing 3 characters from the front trims the leading spaces.' },
            { lines: '9-10', text: '`find_last_not_of` finds the last non-space character. Everything after it is removed from the end. The brackets in the output prove the spaces are gone.' },
            { lines: '13-15', text: 'Strip the command prefix. Each step only adjusts the view\'s pointer and length; the literal itself never changes.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Check for npos before removing',
          text: 'If `input` were all spaces, `find_first_not_of` would return `npos`, and `remove_prefix(npos)` is undefined behavior (you may not remove more characters than the view has). Real code checks for `npos` first. Likewise `substr(pos)` throws `std::out_of_range` if `pos > size()`.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Parsing without allocating',
          text: 'With `std::string`, this trim would create one or two new strings. With views it performs zero allocations, no matter how long the input. Parsers for chat commands, config files, network messages and save data run far faster on views, which is why they are popular in game engines, where allocation during gameplay is often avoided entirely.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'After these lines, what does `v` show, and what happened to the original characters?',
      code: `std::string_view v = "Hello, hero";
v.remove_prefix(7);`,
      options: [
        { text: '`v` shows `"hero"`; the literal is unchanged', correct: true, why: '`remove_prefix(7)` moves the view\'s start 7 characters forward. The literal still holds all 11 characters.' },
        { text: '`v` shows `"hero"`; the first 7 characters were erased from the literal', why: 'A view cannot modify the characters it looks at, and string literals are read-only anyway. Only the window moved.' },
        { text: '`v` shows `"Hello, "`', why: 'That would be the first 7 characters, i.e. `v.substr(0, 7)`. `remove_prefix` discards them from the view instead.' },
        { text: 'It does not compile, because `v` was initialized from a literal', why: 'You can freely shrink a view. It is the characters that are read-only, not the view itself.' },
      ],
      explanation:
        'Think of the view as two numbers: start pointer and length. `remove_prefix(7)` adds 7 to the pointer and subtracts 7 from the length; nothing else happens. The view variable can change, while the characters it looks at stay read-only.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'The sv literal and constant strings',
      blocks: [
        {
          type: 'p',
          text: 'A plain literal like `"loot"` has type "array of `const char`", and `auto` turns it into a `const char*`. C++ provides **literal suffixes** to get other string types directly: `s` for `std::string` and `sv` for `std::string_view`. To use them, bring the literal operators into scope with `using namespace std::literals;`.',
        },
        {
          type: 'code',
          title: 'suffixes.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>
#include <string_view>

using namespace std::literals;

int main() {
    auto a = "loot";      // const char*
    auto b = "loot"s;     // std::string
    auto c = "loot"sv;    // std::string_view

    std::cout << c.size() << ' ' << b.size() << '\\n';
    std::cout << std::string_view{"A\\0B"}.size() << ' '
              << "A\\0B"sv.size() << '\\n';
    std::cout << a << '\\n';
}`,
          output: `4 4
1 3
loot`,
          annotations: [
            { lines: 5, text: 'This pulls in only the literal operators (`s`, `sv`, and the time literals like `10ms`), not the whole standard library. It is the one `using namespace` that style guides commonly allow, because these names were designed to be imported.' },
            { lines: '8-10', text: 'Same characters, three different types. With `auto`, the suffix decides the type.' },
            { lines: '13-14', text: 'Constructing a view from a `const char*` stops at the first `\\0`, giving 1. The `sv` literal knows the literal\'s true length at compile time, so it keeps all 3 characters.' },
          ],
        },
        {
          type: 'p',
          text: 'Views also make excellent **named constants** for text. `constexpr std::string_view kGameTitle = "Forge Quest";` costs nothing at run time: no allocation, no startup code, and the length is known at compile time. A global `const std::string` would allocate (for longer text) and run a constructor before `main` starts.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'When the suffix matters',
          text: 'You rarely need `sv` when passing a literal to a `std::string_view` parameter — the conversion happens automatically. Reach for it with `auto` (`auto prefix = "/give "sv;`), for literals that contain `\\0`, and when you want `==` to compare text rather than pointers.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'truefalse',
      prompt: 'After `using namespace std::literals;`, the declaration `auto name = "Aria";` makes `name` a `std::string_view`.',
      answer: false,
      explanation:
        'The `using` only makes the suffixes available; it does not change what an unsuffixed literal is. `"Aria"` is still a `const char` array, so `auto` deduces `const char*`. Write `"Aria"sv` for a view or `"Aria"s` for a `std::string`.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'When not to use string_view',
      blocks: [
        {
          type: 'p',
          text: 'A view is the right tool for **looking at text during an operation** — a function call, a parsing loop. It is the wrong tool whenever the text must outlive that operation or be handed to code that expects something else.',
        },
        {
          type: 'table',
          headers: ['Situation', 'Use', 'Why'],
          rows: [
            ['Read-only function parameter', '`std::string_view`', 'accepts any text with no copy'],
            ['Storing text for later (a player\'s name, a list of item names)', '`std::string`', 'the stored value must own its characters, or it will dangle when the source goes away'],
            ['Returning text built inside a function', '`std::string`', 'the local string dies when the function returns'],
            ['Passing to a C API that expects a null-terminated string', '`std::string` and `.c_str()`', 'a view\'s `data()` is **not** guaranteed to end with `\\0`'],
            ['The function will copy or modify the text anyway', '`std::string`', 'the copy has to be made somewhere; a view just postpones it'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'data() is not c_str()',
          text: 'A view of `"Frost Axe"` shrunk to `"Frost"` points at `F` with length 5, but the next character in memory is a space, not `\\0`. Passing `view.data()` to `std::printf("%s", …)` or `std::fopen` would read past the end of the view. Convert first: `std::string{view}.c_str()`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is view → string conversion explicit?',
          text: '`std::string` converts to a view implicitly, because that direction is free. The reverse requires writing `std::string{view}`, because it allocates and copies. C++ makes the expensive direction visible in the code so that copies never sneak in unnoticed.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'Which of these is a good use of `std::string_view`?',
      options: [
        { text: 'The member that stores a player\'s name, read from the keyboard into a temporary string', why: 'The temporary will be destroyed, leaving the stored view dangling. Long-lived data must own its characters: use `std::string`.' },
        { text: 'The return type of a function that builds a status message in a local `std::string`', why: 'The local string is destroyed when the function returns, so the returned view would dangle immediately. Return `std::string`.' },
        { text: 'The parameter of a function that counts the vowels in some text', correct: true, why: 'The function only reads the text during the call, and callers can pass literals, strings or substrings without copying.' },
        { text: 'Passing `view.data()` to a C function that expects a null-terminated string', why: 'A view is not guaranteed to be followed by `\\0`. Convert to a `std::string` and call `c_str()`.' },
      ],
      explanation:
        'The safe sweet spot for a view is short-lived, read-only access to text that someone else owns and that is guaranteed to outlive the view. Function parameters are the classic case: the caller\'s text exists for the whole duration of the call.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Text processing 1: counting characters',
      blocks: [
        {
          type: 'p',
          text: 'Let\'s use views for real work, starting with chat moderation statistics. To examine each character we need repetition, which Unit 5 covers in depth. The simplest form is the [[range-based-for]] loop: `for (char c : text)` runs its body once for each character of `text`, with `c` holding that character.',
        },
        {
          type: 'code',
          title: 'chat_stats.cpp',
          runnable: true,
          code: `#include <cctype>
#include <iostream>
#include <string_view>

int main() {
    std::string_view chat = "gg wp  team, see you next match";

    int letters = 0;
    int spaces = 0;
    for (char c : chat) {
        if (std::isalpha(static_cast<unsigned char>(c))) {
            ++letters;
        } else if (c == ' ') {
            ++spaces;
        }
    }
    std::cout << letters << " letters, " << spaces << " spaces\\n";
}`,
          output: '23 letters, 7 spaces',
          annotations: [
            { lines: 1, text: '`<cctype>` provides character classification: `std::isalpha`, `std::isdigit`, `std::isspace`, `std::isupper`, and the converters `std::toupper`/`std::tolower`.' },
            { lines: 10, text: 'Visits every character in the view, in order. Viewing the literal means the loop reads it directly, with nothing copied.' },
            { lines: 11, text: 'The cast matters (see below). `std::isalpha` returns non-zero for letters, which converts to `true`.' },
            { lines: '13-14', text: '`else if` tests a second condition only when the first was false. The comma is neither a letter nor a space, so it is not counted.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Why cast to unsigned char?',
          text: 'The `<cctype>` functions come from C and accept an `int` that must be either `EOF` or a value representable as `unsigned char` (0–255). On most platforms `char` is signed, so accented letters such as `é` in a UTF-8 or Latin-1 string are negative. Passing a negative `char` directly is undefined behavior (MSVC\'s debug runtime even asserts on it). Casting to `unsigned char` first makes every character a valid argument.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Characters are not letters',
          text: 'A `char` is a byte. In UTF-8 text, a character like `é` or `🙂` takes several bytes, so "count characters" really means "count bytes" with these tools. For full Unicode text processing, games typically rely on engine or library support (Unreal\'s `FString` uses UTF-16 `TCHAR`s and has its own character helpers).',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'Why does the example write `std::isalpha(static_cast<unsigned char>(c))` instead of `std::isalpha(c)`?',
      options: [
        { text: 'Because `std::isalpha` only compiles with `unsigned char` arguments', why: 'It takes an `int`, and a `char` converts to `int` silently, so `std::isalpha(c)` compiles without complaint. The problem is the value, not the type.' },
        { text: 'For speed: unsigned characters are faster to classify', why: 'There is no speed difference. The cast is about correctness.' },
        { text: 'Because `char` may be signed, and passing a negative value (other than `EOF`) is undefined behavior', correct: true, why: 'Bytes above 127, such as parts of accented letters, become negative in a signed `char`. The cast maps them to the valid range 128–255.' },
        { text: 'To convert the letter to upper case', why: 'Converting case is `std::toupper`\'s job. `std::isalpha` only tests the character.' },
      ],
      explanation:
        'The C character functions index lookup tables with their argument, and their contract allows only `EOF` or values 0–255. Whether plain `char` is signed is implementation-defined (it is signed on x86 with GCC, Clang and MSVC), so the defensive cast is the portable habit.',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'concept',
      title: 'Text processing 2: splitting into words',
      blocks: [
        {
          type: 'p',
          text: 'Splitting text into words is the heart of every command parser. With views, each "word" is just another view into the original text, so splitting a whole sentence allocates nothing. The algorithm repeatedly skips spaces, takes everything up to the next space as a word, and then moves the window past it.',
        },
        {
          type: 'code',
          title: 'split.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string_view>

int main() {
    std::string_view rest = "gg wp  team, see you next match";
    int words = 0;

    while (!rest.empty()) {
        auto start = rest.find_first_not_of(' ');
        if (start == std::string_view::npos) {
            break;
        }
        rest.remove_prefix(start);
        auto end = rest.find(' ');
        std::string_view word = rest.substr(0, end);
        std::cout << '[' << word << ']';
        ++words;
        rest.remove_prefix(word.size());
    }
    std::cout << '\\n' << words << " words\\n";
}`,
          output: `[gg][wp][team,][see][you][next][match]
7 words`,
          annotations: [
            { lines: 8, text: 'A `while` loop repeats as long as its condition is true: here, while there is text left to examine.' },
            { lines: '9-12', text: 'Skip leading spaces. If only spaces remain, there are no more words: `break` leaves the loop immediately.' },
            { lines: '14-15', text: 'The word runs up to the next space. If there is none, `find` returns `npos`, and `substr(0, npos)` simply takes everything that is left — handy for the last word.' },
            { lines: 18, text: 'Move the window past the word and go round again. Each `word` is a view into the original literal; nothing was copied.' },
          ],
        },
        {
          type: 'p',
          text: 'Notice that the double space after `wp` causes no empty word, because spaces are skipped first. Punctuation stays attached (`team,`); a real parser would also skip or split on punctuation, for example with `find_first_of(" ,.!?")`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Coming later',
          text: 'Once you know `std::vector` (Unit 7) you will collect the words into a container instead of printing them, and C++20 ranges (Unit 13) offer `std::views::split`, which does this job in one line. The manual version here is still worth knowing: it shows exactly what those tools do underneath.',
        },
      ],
    },
    // ------------------------------------------------------------------ 17
    {
      kind: 'order',
      prompt: 'Order the body of the word-splitting loop so that `word` holds the next word of `rest` and the loop never gets stuck.',
      lines: [
        'auto start = rest.find_first_not_of(\' \');',
        'if (start == std::string_view::npos) break;',
        'rest.remove_prefix(start);',
        'auto end = rest.find(\' \');',
        'std::string_view word = rest.substr(0, end);',
        'rest.remove_prefix(word.size());',
      ],
      explanation:
        'Find where the next word starts, stop if there is none, slide the window to it, find where the word ends, slice it, then slide past it. Each line needs a value computed by an earlier one: `end` must be searched for **after** the leading spaces are removed, or it would be measured from the wrong place. Removing the word last is what guarantees progress; forget that line and the loop would find the same word forever.',
    },
  ],
  takeaways: [
    'A `std::string_view` is a non-owning pointer-plus-length window onto characters stored elsewhere; creating, copying and slicing it never allocates.',
    'Use `std::string_view`, passed by value, for read-only text parameters: callers can pass literals, `std::string`s and substrings without copies.',
    'A view must not outlive its characters: never view a temporary, never keep a view across changes to its string, never return a view of a local.',
    '`remove_prefix`, `remove_suffix` and `substr` on a view just move the window, making trimming and tokenizing almost free.',
    'Use the `sv` suffix (after `using namespace std::literals;`) for view literals and `constexpr std::string_view` for named text constants.',
    'Store and return owning `std::string`s; a view\'s `data()` is not null-terminated, so convert before calling C APIs.',
    'Cast to `unsigned char` before calling `<cctype>` functions such as `std::isalpha`.',
  ],
  reading: [
    {
      title: 'std::basic_string_view',
      url: 'https://en.cppreference.com/w/cpp/string/basic_string_view',
      source: 'cppreference',
      note: 'All members of `std::string_view`, including `remove_prefix`, `remove_suffix` and the `sv` literal.',
    },
    {
      title: 'Introduction to std::string_view',
      url: 'https://www.learncpp.com/cpp-tutorial/introduction-to-stdstring_view/',
      source: 'learncpp',
      note: 'Why views exist and how to use them as parameters, with plenty of examples.',
    },
    {
      title: 'std::string_view (part 2)',
      url: 'https://www.learncpp.com/cpp-tutorial/stdstring_view-part-2/',
      source: 'learncpp',
      note: 'A careful look at ownership, dangling views and the cases where a view is the wrong choice.',
    },
    {
      title: 'C++ Core Guidelines',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines',
      source: 'core-guidelines',
      note: 'See rule SL.str.2, "Use std::string_view or gsl::span<char> to refer to character sequences", and the related string rules.',
    },
  ],
};
