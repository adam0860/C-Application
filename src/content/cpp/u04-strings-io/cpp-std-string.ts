import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-std-string',
  title: 'std::string in Depth',
  summary: 'What a std::string really is, how to build, slice, search and compare text safely, the getline trap, and the small-string optimization hiding inside every string.',
  minutes: 20,
  objectives: [
    'Explain what `std::string` owns and why it is safer than C-style character arrays',
    'Create, concatenate, index, slice and search strings, choosing between `[]` and `at()`',
    'Use `find` correctly by comparing against `std::string::npos`',
    'Read whole lines with `std::getline` and fix the leftover-newline problem after `>>`',
    'Describe the small-string optimization and how capacity grows',
    'Convert between numbers and strings with `std::to_string`, `std::stoi` and `std::stod`',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'What std::string actually is',
      blocks: [
        {
          type: 'p',
          text: 'A [[std-string|std::string]] is an object that **owns** a sequence of characters. Inside, it keeps three things: a pointer to a buffer of characters, the current length (size), and how much room the buffer has (capacity). When you add text and the buffer is full, the string allocates a bigger one on the [[heap-memory|heap]], copies the characters across, and frees the old one — all automatically.',
        },
        {
          type: 'memory',
          caption: 'A std::string named title holding "Dragonslayer": the object on the stack, its characters in a heap buffer.',
          regions: [
            {
              label: 'Stack — main()',
              kind: 'stack',
              cells: [
                { name: 'title.data', type: 'char*', value: '0x5a10', pointsTo: 'buf' },
                { name: 'title.size', type: 'size_t', value: '12' },
                { name: 'title.capacity', type: 'size_t', value: '15' },
              ],
            },
            {
              label: 'Heap',
              kind: 'heap',
              cells: [{ id: 'buf', value: '"Dragonslayer\\0" + spare room', address: '0x5a10', highlight: true }],
            },
          ],
        },
        {
          type: 'p',
          text: 'Before `std::string`, C programs stored text in plain character arrays ending with a `\'\\0\'` [[null-terminator]] — a [[c-string]]. String literals like `"Aria"` are still that type: an array of `const char`. `std::string` wraps the same idea in a class that manages the memory for you, and when the string goes out of scope its buffer is released automatically (a technique called [[raii|RAII]], covered in Unit 11).',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just use char arrays?',
          text: 'A char array has a fixed size chosen when you write the code; copy a longer name into it and you overwrite whatever memory follows — the **buffer overflow**, historically one of the most exploited security bugs in C programs. Finding its length means scanning for `\'\\0\'` every time. And dynamically sized arrays must be freed by hand. `std::string` knows its size, grows on demand and cleans up after itself, at essentially no extra cost.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Unreal has its own string types: `FString` (a growable, owning string much like `std::string`, built on wide `TCHAR` characters), `FName` (an immutable, cheap-to-compare identifier) and `FText` (localisable text for the UI). Engine APIs use them instead of `std::string`, but the ideas in this lesson carry over directly.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `std::string original = "Sword";
std::string copy = original;
copy[0] = 'W';
std::cout << original << ' ' << copy << '\\n';`,
      options: [
        { text: '`Word Word`', why: 'That would happen if both variables shared one buffer. Copying a `std::string` copies the characters into a new buffer.' },
        { text: '`Sword Word`', correct: true, why: 'The copy owns its own characters, so changing it leaves the original untouched.' },
        { text: '`Sword Sword`', why: 'Strings are mutable in C++; assigning to `copy[0]` really changes `copy`.' },
        { text: 'It does not compile, because strings cannot be modified', why: 'Unlike strings in Java, C# or Python, `std::string` is mutable. You can change individual characters.' },
      ],
      explanation:
        'A `std::string` behaves like a value: copying it duplicates the characters (a [[deep-copy]]), and each copy is independent. That is safe and intuitive, but it also means copying a long string costs an allocation and a character-by-character copy — one reason later lessons care about avoiding unnecessary copies.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Creating strings',
      blocks: [
        {
          type: 'p',
          text: '`std::string` lives in the `<string>` header and can be created in several ways. Most are obvious; one contains a famous trap.',
        },
        {
          type: 'code',
          title: 'create.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

int main() {
    std::string empty;
    std::string hero{"Aria"};
    std::string copy = hero;
    std::string bar(12, '=');
    std::string oops{12, '='};

    std::cout << '[' << empty << "] " << empty.size() << '\\n';
    std::cout << hero << ' ' << copy << '\\n';
    std::cout << bar << ' ' << bar.size() << '\\n';
    std::cout << oops.size() << '\\n';
}`,
          output: `[] 0
Aria Aria
============ 12
2`,
          annotations: [
            { lines: 5, text: 'A default-constructed string is **empty**, never garbage. Unlike an uninitialized `int`, it is always safe to use.' },
            { lines: 6, text: 'From a string literal. `std::string hero = "Aria";` does the same.' },
            { lines: 8, text: 'With **parentheses**: the "count, character" constructor — 12 copies of `=`. Handy for separators and health bars.' },
            { lines: 9, text: 'With **braces**, the compiler prefers the constructor taking a list of characters, so this is the two characters `\'\\x0C\'` (character code 12) and `\'=\'`.' },
          ],
          highlight: [9],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Braces versus parentheses',
          text: 'In the previous unit you learned to prefer [[brace-initialization]]. Containers are the exception to remember: when a class has a constructor taking an initializer list, braces choose it whenever they can. `std::string s{12, \'=\'}` is a two-character string; `std::string s(12, \'=\')` is twelve `=`. The same trap exists for `std::vector` in Unit 7.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: '`std::string s{5, \'x\'};` creates the string `"xxxxx"`.',
      answer: false,
      explanation:
        'Braces make the compiler prefer the initializer-list constructor, so `s` contains two characters: the one with code 5 and `\'x\'`. To repeat a character, use parentheses: `std::string s(5, \'x\');`. This is one of the few places where brace and parenthesis initialization mean different things.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Joining strings together',
      blocks: [
        {
          type: 'p',
          text: '`+` creates a new string from two pieces; `+=` and `append` add to the end of an existing one. You can join `std::string`s, string literals and single `char`s — as long as **at least one side of each `+` is a `std::string`**.',
        },
        {
          type: 'code',
          title: 'concat.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

int main() {
    std::string name = "Aria";
    std::string title = "the Bold";

    std::string full = name + " " + title;
    full += '!';
    full.append(" (Lv. 12)");
    std::cout << full << '\\n';

    std::string score = "Score: " + std::to_string(4200);
    std::cout << score << '\\n';
}`,
          output: `Aria the Bold! (Lv. 12)
Score: 4200`,
          annotations: [
            { lines: 8, text: 'Evaluated left to right: `name + " "` makes a temporary `std::string`, then `+ title` makes another. Each step involves a `std::string`, so it works.' },
            { lines: '9-10', text: '`+=` and `append` modify `full` in place, reusing its buffer when there is room, which is cheaper than building new strings.' },
            { lines: 13, text: 'Numbers are not text. `std::to_string` converts 4200 into `"4200"` first (more on conversions at the end of the lesson).' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Compiles, but wrong',
            tone: 'bad',
            code: `std::string a = "Hello " + "World";  // error
std::string b = "Score: " + 4200;    // UB!
std::string c;
c += 65;                             // "A"`,
            text: 'Two literals cannot be added (they are arrays, not strings). A literal plus an integer is **pointer arithmetic**: it skips 4200 characters into an 8-character array. `+=` with an integer appends the character with that code.',
          },
          right: {
            title: 'Correct',
            tone: 'good',
            code: `std::string a = std::string{"Hello "} + "World";
std::string b = "Score: " + std::to_string(4200);
std::string c;
c += std::to_string(65);             // "65"`,
            text: 'Make sure one operand is a `std::string`, and convert numbers explicitly with `std::to_string` or `std::format`.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does "Score: " + 4200 even compile?',
          text: 'A string literal is a C array of characters, and in an expression it decays into a pointer to its first character. Adding an integer to a pointer moves the pointer forward by that many elements — a C feature you will meet properly in Unit 8. So the compiler sees a perfectly legal pointer computation; it has no idea you wanted text. The `std::string` `+` operator only gets involved when one operand actually is a `std::string`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'bug',
      prompt: 'This should print `Coins: 3`, but prints `ns: ` (or garbage). Tap the faulty line.',
      code: `#include <iostream>
#include <string>

int main() {
    int coins = 3;
    std::string msg = "Coins: " + coins;
    std::cout << msg << '\\n';
}`,
      bugLines: [6],
      hint: 'What is the type of `"Coins: "`, and what does adding an `int` to it do?',
      explanation:
        '`"Coins: "` is a character array, not a `std::string`, so `+ coins` is pointer arithmetic: it produces a pointer 3 characters into the literal, which spells `ns: `. With a larger number the pointer would run past the end of the array — undefined behavior. Fix it with `"Coins: " + std::to_string(coins)` or `std::format("Coins: {}", coins)`.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Size, indexing and bounds checking',
      blocks: [
        {
          type: 'p',
          text: '`size()` and `length()` are identical: both return the number of characters, not counting any terminator. `empty()` tells you whether the size is zero. Individual characters are reached by index, starting at 0, with either `[]` or `at()`.',
        },
        {
          type: 'code',
          title: 'index.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

int main() {
    std::string weapon = "Longsword";
    std::cout << weapon.size() << ' ' << weapon.length() << '\\n';
    std::cout << weapon[0] << weapon.back() << '\\n';

    weapon[0] = 'S';
    std::cout << weapon << '\\n';
    std::cout << weapon.at(4) << '\\n';

    // weapon[42];     undefined behavior: no check
    // weapon.at(42);  throws std::out_of_range
}`,
          output: `9 9
Ld
Songsword
s`,
          annotations: [
            { lines: 6, text: 'Both return a `std::size_t`, an **unsigned** integer type. Comparing it with a negative `int` gives the signed/unsigned surprise from the previous unit.' },
            { lines: 7, text: '`front()` and `back()` give the first and last characters. Calling either on an empty string is undefined behavior.' },
            { lines: 9, text: 'Strings are mutable: indexing returns a reference to the character itself, so you can assign to it.' },
            { lines: 11, text: '`at(i)` does the same as `[i]` but first checks that `i < size()`.' },
          ],
        },
        {
          type: 'table',
          headers: ['Index', '`s[i]`', '`s.at(i)`'],
          rows: [
            ['Valid index', 'the character', 'the character'],
            ['`i == s.size()`', '`\'\\0\'` (read only)', 'throws `std::out_of_range`'],
            ['`i > s.size()`', '**undefined behavior**', 'throws `std::out_of_range`'],
            ['Cost', 'no check at all', 'one comparison'],
          ],
        },
        {
          type: 'p',
          text: 'An [[exception]] (Unit 14) is C++\'s way of reporting an error that the current code cannot handle. If nothing catches it, the program stops with a message such as *terminate called after throwing an instance of \'std::out_of_range\'*. That sounds harsh, but a clean, immediate stop pointing at the problem is far better than silently reading random memory.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why have an unchecked version?',
          text: 'C++\'s rule is "you don\'t pay for what you don\'t use". In a loop that already guarantees valid indices, a bounds check on every access would be wasted work, so `[]` skips it. Use `at()` when an index comes from outside (user input, a file, the network). Debug builds can add checks to `[]` too: MSVC does by default in Debug, and GCC does with `-D_GLIBCXX_ASSERTIONS`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'Given `std::string s = "Ammo";`, which statement is correct?',
      options: [
        { text: '`s.size()` is 5, because of the null terminator', why: '`size()` counts only the visible characters. The terminator, if stored, is not included, so the size is 4.' },
        { text: '`s[10]` throws an exception', why: '`[]` performs no checking at all. An index past the end is undefined behavior, which may crash, return garbage or appear to work.' },
        { text: '`s.at(10)` returns `\'\\0\'`', why: '`at()` never returns a placeholder for a bad index; it throws.' },
        { text: '`s.at(10)` throws `std::out_of_range`', correct: true, why: '`at()` checks the index against `size()` and throws when it is out of range.' },
      ],
      explanation:
        '`[]` trusts you and `at()` checks you. Since C++11, `s[s.size()]` is guaranteed to be `\'\\0\'` (so the buffer can be handed to C functions), but anything beyond that is undefined. Choose `at()` whenever an index has not already been validated.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Slicing and searching: substr, find and npos',
      blocks: [
        {
          type: 'p',
          text: '`s.substr(pos, count)` returns a **new** string containing up to `count` characters starting at `pos` (leave out `count` to take everything to the end). `s.find(x)` searches for a character or a piece of text and returns the index where it starts — or the special value [[string-npos|std::string::npos]] if it is not there.',
        },
        {
          type: 'code',
          title: 'config_line.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

int main() {
    std::string line = "weapon=Frost Axe";
    auto eq = line.find('=');
    if (eq != std::string::npos) {
        std::string key = line.substr(0, eq);
        std::string value = line.substr(eq + 1);
        std::cout << '[' << key << "] [" << value << "]\\n";
    }

    std::cout << std::boolalpha;
    std::cout << line.find("Axe") << '\\n';
    std::cout << (line.find("Bow") == std::string::npos) << '\\n';
    std::cout << line.starts_with("weapon") << '\\n';
}`,
          output: `[weapon] [Frost Axe]
13
true
true`,
          annotations: [
            { lines: 6, text: '`auto` gives `eq` the right type, `std::size_t`. Storing the result in an `int` would mangle `npos`.' },
            { lines: 7, text: 'Always compare with `npos` before using a position. (An `if` runs its block only when the condition is true; Unit 5 covers it.)' },
            { lines: '8-9', text: 'Everything before the `=` (6 characters starting at 0), and everything after it. `substr` copies the characters into a new string.' },
            { lines: 16, text: 'C++20 added `starts_with` and `ends_with`; C++23 adds `contains`. They read better than comparing `find` results.' },
          ],
        },
        {
          type: 'p',
          text: '`npos` is the largest value a `std::size_t` can hold — 18446744073709551615 on a 64-bit system. No real string is that long, so it can never be confused with a genuine index. Related searches: `rfind` searches backwards from the end, and `find_first_of(" ,;")` finds the first of any listed characters.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Never test find() as a bool',
          text: '`if (name.find("Lord"))` is a bug twice over: a match at index 0 gives `0`, which is `false`, and "not found" gives `npos`, which is non-zero and therefore `true`. The logic is exactly backwards for the most common cases. Always write `!= std::string::npos`.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'substr copies',
          text: 'Each `substr` call allocates (for longer results) and copies characters. That is fine for parsing a config file once, but wasteful when you only want to **look** at part of a string — say, in a parser that runs every frame. The next lesson introduces `std::string_view`, whose `substr` is free.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'fill',
      prompt: 'Leaderboard entries look like `"Aria:15200"`. Extract the player name safely.',
      template: `auto colon = entry.___(':');
if (colon != std::string::___) {
    std::string name = entry.___(0, colon);
}`,
      blanks: [{ answers: ['find'] }, { answers: ['npos'] }, { answers: ['substr'] }],
      wordBank: ['find', 'npos', 'substr', 'at', 'end', 'size', '-1'],
      explanation:
        '`find` returns the colon\'s index or `npos`; checking against `npos` guards the slice; `substr(0, colon)` takes the `colon` characters before it. Comparing with `-1` happens to work (the `-1` is converted to the same huge unsigned value), but `npos` states the intent and is what every C++ programmer expects to read.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Comparing strings',
      blocks: [
        {
          type: 'p',
          text: 'Strings compare with the usual operators: `==`, `!=`, `<`, `<=`, `>`, `>=` (and C++20\'s `<=>`). Equality means same length and same characters. Ordering is **lexicographic**, like a dictionary: compare the first characters; if they are equal, move on to the next; a string that runs out first is the smaller one.',
        },
        {
          type: 'code',
          title: 'compare.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

int main() {
    std::string a = "apple";
    std::string b = "banana";
    std::string c = "Banana";

    std::cout << std::boolalpha;
    std::cout << (a < b) << ' ' << (b < c) << ' '
              << (a == "apple") << '\\n';
    std::cout << (std::string{"item10"} < "item9") << '\\n';
}`,
          output: `true false true
true`,
          annotations: [
            { lines: 10, text: '`\'a\'` comes before `\'b\'`, so `"apple" < "banana"`. But `"banana" < "Banana"` is false: characters are compared by their numeric codes, and every upper-case letter (65–90) is smaller than every lower-case one (97–122).' },
            { lines: 11, text: 'Comparing with a literal works because one side is a `std::string`.' },
            { lines: 12, text: '`\'1\'` < `\'9\'`, so `"item10"` sorts before `"item9"`. Lexicographic order knows nothing about numbers inside text.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why so literal-minded?',
          text: 'Comparing raw character codes is fast, predictable and identical on every machine. "Human" orderings — ignoring case, sorting `item9` before `item10`, putting `é` next to `e` — depend on language and culture, so they are left to explicit code or libraries. To compare case-insensitively, convert both strings to the same case first.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Two literals compare addresses',
          text: 'With two `const char*` values, as in `"abc" == "abc"` or two C-string variables, `==` compares the **addresses** of the arrays, not their contents. The result depends on whether the compiler merged identical literals. Make sure at least one side is a `std::string` (or `std::string_view`).',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'truefalse',
      prompt: '`std::string{"Zelda"} < "apple"` is `true`.',
      answer: true,
      explanation:
        'Comparison starts with the first characters: `\'Z\'` has code 90 and `\'a\'` has code 97, so `"Zelda"` is smaller — even though "apple" comes first alphabetically. Default string ordering is by character code, which puts all upper-case letters before all lower-case ones. Sort case-insensitively by comparing lower-cased copies.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Reading lines: getline and the leftover newline',
      blocks: [
        {
          type: 'p',
          text: '`std::cin >> text` reads a single word: it stops at the first space. To read a whole line, spaces included, use [[std-getline|std::getline]]`(std::cin, text)`. It reads everything up to the next `\'\\n\'`, removes that newline from the stream, and stores the rest.',
        },
        {
          type: 'p',
          text: 'Mixing the two causes one of the most-asked beginner questions. After `std::cin >> age;` the newline from pressing Enter is **still in the stream** (remember: `>>` stops at the first character that does not belong). A following `getline` finds that newline immediately, reads an empty line, and returns — the user never gets a chance to type.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Input arrives', text: 'The user types `27`, Enter, `Aria the Bold`, Enter. The stream holds `27\\nAria the Bold\\n`.' },
            { title: '`std::cin >> age`', text: 'Reads `27`, stops at `\\n`. The stream now holds `\\nAria the Bold\\n`.' },
            { title: '`std::getline(std::cin, fullName)`', text: 'Reads up to the first `\\n` — which comes immediately. `fullName` becomes `""`, the newline is discarded.' },
            { title: 'The fix', text: 'Skip the leftover whitespace first. `std::ws` is a manipulator that discards whitespace, so `std::cin >> std::ws` throws away the `\\n` before `getline` starts.' },
          ],
        },
        {
          type: 'code',
          title: 'character_sheet.cpp',
          runnable: true,
          stdin: '27\nAria the Bold\n',
          code: `#include <iostream>
#include <string>

int main() {
    int age = 0;
    std::string fullName;

    std::cout << "Age: ";
    std::cin >> age;
    std::cout << "Full name: ";
    std::getline(std::cin >> std::ws, fullName);

    std::cout << fullName << " (" << age << ")\\n";
}`,
          output: `Age: Full name: Aria the Bold (27)`,
          annotations: [
            { lines: 9, text: 'Leaves `\\nAria the Bold\\n` in the stream.' },
            { lines: 11, text: '`std::cin >> std::ws` evaluates to `std::cin` after discarding the whitespace, so `getline` starts right at `A`. Alternatively call `std::cin.ignore(…, \'\\n\')` after the `>>`.' },
          ],
          highlight: [11],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'A robust habit',
          text: 'Many programmers avoid mixing styles altogether: read **every** line with `getline`, then convert the pieces they need (with `std::stoi`, covered shortly). Each line is consumed completely, so nothing is ever left over to confuse the next read.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'The user types `27`, Enter, `Aria the Bold`, Enter. What does `fullName` contain afterwards?',
      code: `int age = 0;
std::string fullName;
std::cin >> age;
std::getline(std::cin, fullName);`,
      options: [
        { text: '`"Aria the Bold"`', why: 'That is the intended result, but the newline left behind by `>>` is read first.' },
        { text: '`"Aria"`', why: '`getline` does not stop at spaces — that is the behaviour of `>>`. Here the problem is something else.' },
        { text: '`""` (an empty string)', correct: true, why: '`>>` stopped before the `\\n`, so `getline` immediately reads an empty line and consumes that newline.' },
        { text: '`"27"`', why: '`>>` already consumed the digits; they are not read again.' },
      ],
      explanation:
        '`>>` leaves the terminating newline in the stream; `getline` treats it as the end of an (empty) line. Insert `std::cin >> std::ws` before `getline`, or ignore the rest of the line after `>>`. Debug-printing values with brackets around them, like `\'[\' << fullName << \']\'`, makes empty strings easy to spot.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'concept',
      title: 'Under the hood: capacity and the small-string optimization',
      blocks: [
        {
          type: 'p',
          text: '`size()` is how many characters are in use; `capacity()` is how many fit before the string must reallocate. When an append exceeds the capacity, the string allocates a **larger** buffer — typically double the old capacity — copies everything over and frees the old buffer. Doubling means that, averaged over many appends, each one costs a constant amount of work (*amortized* O(1)), even though an individual append occasionally copies the whole string.',
        },
        {
          type: 'p',
          text: 'Heap allocation is slow compared with everything else a string does, and most strings in real programs are short: names, keys, tags, file extensions. So every major standard library implements the [[small-string-optimization]] (SSO): the string object reuses its own bytes as a small inline buffer, and only strings too long for it get a heap allocation.',
        },
        {
          type: 'memory',
          caption: 'With SSO (libstdc++): a short string lives entirely inside the object; a long one points to the heap.',
          regions: [
            {
              label: 'Stack — short = "Aria"',
              kind: 'stack',
              cells: [
                { name: 'data', type: 'char*', value: '→ own buffer' },
                { name: 'size', type: 'size_t', value: '4' },
                { name: 'inline buffer', type: 'char[16]', value: '"Aria\\0"', highlight: true },
              ],
            },
            {
              label: 'Stack — long = "Aria the Unbreakable Dragonslayer"',
              kind: 'stack',
              cells: [
                { name: 'data', type: 'char*', value: '0x7c40', pointsTo: 'heapbuf' },
                { name: 'size', type: 'size_t', value: '33' },
                { name: 'capacity', type: 'size_t', value: '33' },
              ],
            },
            {
              label: 'Heap',
              kind: 'heap',
              cells: [{ id: 'heapbuf', value: '"Aria the Unbreakable Dragonslayer\\0"', address: '0x7c40' }],
            },
          ],
        },
        {
          type: 'code',
          title: 'sso.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

int main() {
    std::string shortName = "Aria";
    std::string longName = "Aria the Unbreakable Dragonslayer";
    std::cout << sizeof(std::string) << ' '
              << shortName.capacity() << ' '
              << longName.capacity() << '\\n';

    std::string log;
    log.reserve(1000);   // one allocation up front
    std::cout << (log.capacity() >= 1000) << '\\n';
}`,
          annotations: [
            { lines: '7-9', text: 'The exact numbers are implementation details; see the table below. With GCC this prints `32 15 33`.' },
            { lines: 12, text: 'If you know roughly how big a string will get, `reserve` allocates once instead of reallocating repeatedly as it grows.' },
          ],
        },
        {
          type: 'table',
          headers: ['Standard library', 'Used by', '`sizeof(std::string)`', 'Inline capacity'],
          rows: [
            ['libstdc++', 'GCC', '32 bytes', '15 chars'],
            ['MSVC STL', 'Visual Studio', '32 bytes', '15 chars'],
            ['libc++', 'Clang on macOS, Android', '24 bytes', '22 chars'],
          ],
          caption: '64-bit release builds. The standard does not require SSO at all; it just happens that everyone does it.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'FString has no SSO',
          text: 'Unreal\'s `FString` is essentially a `TArray<TCHAR>`, so even a one-character `FString` allocates on the heap. That is one reason Unreal uses `FName` for identifiers: the text is stored once in a global table, and an `FName` is just a small index that is cheap to copy and compare. Creating `FString`s every frame in `Tick` is a classic performance smell.',
        },
      ],
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'concept',
      title: 'Converting between numbers and strings',
      blocks: [
        {
          type: 'p',
          text: 'Text and numbers are different types, and C++ never converts between them silently (as `"Score: " + 4200` showed). The `<string>` header provides explicit conversions in both directions.',
        },
        {
          type: 'code',
          title: 'convert.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

int main() {
    std::string hp = std::to_string(75);
    std::string speed = std::to_string(3.5);
    std::cout << hp << ' ' << speed << '\\n';

    int level = std::stoi("42");
    int damage = std::stoi("  120 dmg");
    double scale = std::stod("1.25");
    std::cout << level + 1 << ' ' << damage << ' '
              << scale * 2 << '\\n';
}`,
          output: `75 3.500000
43 120 2.5`,
          annotations: [
            { lines: 5, text: '`std::to_string` turns any number into its text form.' },
            { lines: 6, text: 'For floating-point values it always uses six decimal places: `3.500000`. For nicer output, use `std::format("{}", 3.5)`, which gives `3.5`.' },
            { lines: 9, text: '`std::stoi` ("string to int") parses text into an `int`. There are siblings: `stol`, `stoll`, `stoul`, `stof`, `stod`.' },
            { lines: 10, text: 'Like `>>`, it skips leading whitespace and stops at the first character that cannot be part of the number: `"  120 dmg"` gives 120.' },
          ],
        },
        {
          type: 'table',
          headers: ['Input to `std::stoi`', 'Result'],
          rows: [
            ['`"42"`', '`42`'],
            ['`"  -7"`', '`-7` (leading whitespace skipped)'],
            ['`"12abc"`', '`12` (stops at `a`)'],
            ['`"abc"`', 'throws `std::invalid_argument`'],
            ['`"99999999999"`', 'throws `std::out_of_range`'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why do these throw, when streams just set a flag?',
          text: '`std::stoi` returns the number itself, so there is no spare return value to signal "this was not a number" — any `int` could be a legitimate result. An exception is the remaining channel. Streams, by contrast, have an object (the stream) that can carry state. If you would rather not deal with exceptions, C++17\'s `std::from_chars` in `<charconv>` reports errors through a result value instead, and is the fastest option the standard offers.',
        },
      ],
    },
    // ------------------------------------------------------------------ 17
    {
      kind: 'mcq',
      prompt: 'A save file contains the line `gold=250coins`. After extracting `"250coins"`, the code calls `std::stoi("250coins")`. What happens?',
      options: [
        { text: 'It returns 250', correct: true, why: '`std::stoi` parses as many characters as form a number and stops at the first one that cannot belong. The trailing text is ignored.' },
        { text: 'It throws `std::invalid_argument`, because the text is not entirely a number', why: '`std::invalid_argument` is thrown only when **no** digits can be parsed at the start, as with `"coins250"`.' },
        { text: 'It returns 0', why: 'Returning 0 on failure is the stream behaviour (and only on a real failure). `std::stoi` either returns the parsed value or throws.' },
        { text: 'It does not compile, because a literal is not a `std::string`', why: 'The literal converts to a `std::string` automatically, so the call compiles.' },
      ],
      explanation:
        '`std::stoi` is lenient about trailing characters. If you need to verify that the **whole** string was a number, pass a second argument to learn how many characters were used: `std::size_t used = 0; int v = std::stoi(text, &used);` then check `used == text.size()`. (The `&` passes the variable\'s address so the function can write into it; Unit 8 explains how.)',
    },
  ],
  takeaways: [
    '`std::string` owns a growable heap buffer, knows its size, copies deeply and frees its memory automatically.',
    '`std::string s(12, \'=\')` repeats a character; `std::string s{12, \'=\'}` makes a two-character string.',
    'At least one operand of `+` must be a `std::string`; a literal plus an integer is pointer arithmetic. Convert numbers with `std::to_string` or `std::format`.',
    '`[]` is unchecked (out of range is undefined behavior); `at()` checks and throws `std::out_of_range`.',
    '`find` returns an index or `std::string::npos`: always compare with `npos`, never test the result as a bool.',
    'After `std::cin >> x`, use `std::getline(std::cin >> std::ws, line)` to skip the leftover newline.',
    'Short strings live inside the object thanks to the small-string optimization; `reserve` avoids repeated reallocation for long ones.',
  ],
  reading: [
    {
      title: 'std::basic_string',
      url: 'https://en.cppreference.com/w/cpp/string/basic_string',
      source: 'cppreference',
      note: 'Every member function of `std::string`, grouped by purpose, with the C++ version each was added in.',
    },
    {
      title: 'std::getline',
      url: 'https://en.cppreference.com/w/cpp/string/basic_string/getline',
      source: 'cppreference',
      note: 'Exact behaviour of `getline`, including custom delimiters such as `getline(in, field, \',\')`.',
    },
    {
      title: 'Introduction to std::string',
      url: 'https://www.learncpp.com/cpp-tutorial/introduction-to-stdstring/',
      source: 'learncpp',
      note: 'A gentle second explanation of string basics and the `getline` pitfall, with exercises.',
    },
    {
      title: 'std::stoi, std::stol, std::stoll',
      url: 'https://en.cppreference.com/w/cpp/string/basic_string/stol',
      source: 'cppreference',
      note: 'The parsing rules and exceptions of the string-to-integer functions, including the `pos` output parameter.',
    },
  ],
};
