import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-console-io',
  title: 'Console Input and Output',
  summary: 'The stream model behind cout and cin: reading values, surviving bad input, and formatting tidy output with <iomanip> and C++20 std::format.',
  minutes: 18,
  objectives: [
    'Explain what a stream is and when to use `std::cout`, `std::cin`, `std::cerr` and `std::clog`',
    'Read one or several values with `>>` and predict how whitespace and leftover characters are handled',
    'Detect failed input and recover with `clear()` and `ignore()`',
    'Read an unknown number of values with `while (std::cin >> x)`',
    'Format aligned, fixed-precision output with `<iomanip>` and with C++20 `std::format`',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The stream model',
      blocks: [
        {
          type: 'p',
          text: 'You have been using `std::cout` since your first program. It is one of four standard [[stream|stream]] objects declared in `<iostream>`. A stream is a **sequence of characters flowing in one direction** between your program and somewhere else: the console, a file, another program. Your code just pushes characters in or pulls them out; it does not need to know where they come from or go to.',
        },
        {
          type: 'table',
          headers: ['Object', 'Direction', 'Connected to', 'Buffered?', 'Use it for'],
          rows: [
            ['[[cout|std::cout]]', 'output', 'standard output (stdout)', 'yes', 'normal program output'],
            ['[[cin|std::cin]]', 'input', 'standard input (stdin)', 'yes', 'reading what the user types'],
            ['`std::cerr`', 'output', 'standard error (stderr)', '**no** — written immediately', 'error messages'],
            ['`std::clog`', 'output', 'standard error (stderr)', 'yes', 'diagnostic / log messages'],
          ],
        },
        {
          type: 'code',
          title: 'streams.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    std::cout << "Loading level 1...\\n";
    std::clog << "[log] textures: 42 MB\\n";
    std::cerr << "[error] save file corrupted\\n";
    std::cout << "Starting new game\\n";
}`,
          annotations: [
            { lines: 4, text: 'Regular output goes to **stdout**.' },
            { lines: 5, text: '`std::clog` goes to **stderr**, but is buffered like `std::cout` — fine for chatty diagnostics where speed matters more than immediacy.' },
            { lines: 6, text: '`std::cerr` also goes to **stderr** and is unbuffered: each message is written at once, so it is not lost if the program crashes right afterwards.' },
          ],
        },
        {
          type: 'p',
          text: 'In a terminal all four lines appear together, because stdout and stderr both default to the console. The difference shows when you **redirect** output, which shells let you do for any program:',
        },
        {
          type: 'code',
          lang: 'shell',
          code: `./streams > game.log      # stdout to a file
[log] textures: 42 MB
[error] save file corrupted
./streams 2> errors.txt   # stderr to a file
Loading level 1...
Starting new game`,
          annotations: [
            { lines: '1-3', text: '`>` captures stdout in `game.log`. The stderr lines still reach your screen, so errors are never silently buried in a file.' },
            { lines: '4-6', text: '`2>` redirects stream number 2 (stderr) instead, leaving normal output on screen.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why two output channels?',
          text: 'Unix programs are often chained together, each one\'s stdout feeding the next one\'s stdin. If error messages travelled on the same channel, they would be mixed into the data and corrupt it. A separate error channel lets data flow through a pipeline while problems are still reported to a human. Build tools, game servers and test runners all rely on this split.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'cin is tied to cout',
          text: 'Before `std::cin` reads anything, it automatically flushes `std::cout`. That is why a prompt written without `std::endl` still appears before the program waits for input. You get correct prompts without paying for a flush on every line.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'A dedicated game server writes its normal output to a file with `./server > server.log`. Which stream should report "failed to bind port 7777" so that an operator watching the terminal still sees it immediately?',
      options: [
        { text: '`std::cout`', why: 'stdout is redirected into `server.log`, so the message would be hidden in the file — and, being buffered, might not even be written yet if the server crashes.' },
        { text: '`std::cerr`', correct: true, why: 'stderr is not affected by `>`, so the message reaches the terminal, and `std::cerr` is unbuffered, so it appears instantly.' },
        { text: '`std::clog`', why: '`std::clog` does go to stderr, but it is buffered, so the message may sit in memory for a while. For urgent errors, `std::cerr` is the better choice.' },
        { text: '`std::cin`', why: '`std::cin` is an input stream; you cannot write to it.' },
      ],
      explanation:
        'Error messages belong on stderr because it is a separate channel from normal output: redirecting or piping stdout leaves it visible. Between the two stderr streams, `std::cerr` writes immediately, which matters for errors that may be followed by a crash.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Reading input with >>',
      blocks: [
        {
          type: 'p',
          text: '`std::cin >> x` is **extraction**: it pulls characters out of the input stream, converts them to the type of `x`, and stores the result. The arrows point the way data flows — out of `std::cin`, into the variable. Like `<<`, it returns the stream itself, so you can chain several reads in one statement.',
        },
        {
          type: 'code',
          title: 'new_hero.cpp',
          runnable: true,
          stdin: '  Aria   12\n  350\n',
          code: `#include <iostream>
#include <string>

int main() {
    std::string name;
    int level = 0;
    int gold = 0;

    std::cout << "Name, level and gold: ";
    std::cin >> name >> level >> gold;

    std::cout << name << " is level " << level
              << " with " << gold << " gold\\n";
}`,
          output: 'Name, level and gold: Aria is level 12 with 350 gold',
          annotations: [
            { lines: 2, text: '`std::string` holds text of any length. The next lesson covers it in depth; for now, `>>` into a `std::string` reads one word.' },
            { lines: '6-7', text: 'Initialize variables you are about to read into. If the read fails you still have a known value instead of garbage.' },
            { lines: 10, text: 'Three extractions in a row. The input was `"  Aria   12\\n  350\\n"` — extra spaces and a line break in the middle make no difference.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'About the console panel',
          text: 'The output panel shows only what the program **writes**. When you run it yourself, the text you type appears after each prompt as well (your terminal echoes it), so you would see `Name, level and gold: Aria 12 350` and then the result on the next line.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Skip leading whitespace', text: 'Spaces, tabs and newlines before the value are discarded. This is why line breaks between values do not matter.' },
            { title: 'Read characters that fit the type', text: 'For an `int`: an optional sign and digits. For a `std::string`: everything up to the next whitespace. For a `double`: digits, a decimal point, an exponent…' },
            { title: 'Stop at the first character that does not fit', text: 'That character is **not consumed**. It stays in the stream, waiting for the next read.' },
            { title: 'Convert and store', text: 'The characters are converted to the target type and stored. If nothing usable was found, the read **fails** (next card).' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is reading driven by the variable\'s type?',
          text: '`>>` is overloaded separately for each type, so `std::cin >> level` calls the `int` version and `std::cin >> name` calls the `std::string` version. The compiler picks the right parser at compile time from the variable\'s type, so you cannot accidentally parse a number with string rules — the type safety that C\'s `scanf("%d", …)` lacked.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Nothing arrives until Enter',
          text: 'Terminals are normally **line-buffered**: the characters you type are held by the terminal until you press Enter, and then the whole line, including the `\'\\n\'`, is delivered to the program. That newline sits in the input stream after your value, a detail that matters a great deal in the next lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: 'The program runs `int level = 0; std::cin >> level;` and the user types `12.75` and presses Enter. What happens?',
      options: [
        { text: '`level` becomes 13 (rounded)', why: 'Extraction into an `int` never rounds. It reads characters that can form an integer and stops.' },
        { text: '`level` becomes 12, and `.75` plus the newline remain in the input stream', correct: true, why: 'The `int` reader accepts `12`, stops at `.` because a decimal point cannot be part of an integer, and leaves the rest for the next read.' },
        { text: 'The read fails and `level` becomes 0', why: 'The read succeeds, because at least one valid digit was found. It would fail only if the first non-whitespace character could not start an integer, e.g. `abc`.' },
        { text: 'The program crashes with a conversion error', why: 'Streams never crash on bad input. At worst they enter a "failed" state that your code must check.' },
      ],
      explanation:
        '`>>` reads as many characters as can form a value of the target type, then stops and leaves the rest in the stream. Here `.75\\n` stays behind, so the **next** `std::cin >> someInt` would immediately fail on the `.`. Leftover input is the root cause of most beginner input bugs.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'When input fails',
      blocks: [
        {
          type: 'p',
          text: 'Users type nonsense. If the first non-whitespace character cannot start a value of the requested type — `abc` when reading an `int` — the extraction **fails**. Three things happen: the stream sets its **failbit**, the variable is set to `0` (since C++11), and the offending characters are left in the stream. See [[stream-fail-state]].',
        },
        {
          type: 'p',
          text: 'The dangerous part is what comes next: **a stream in the fail state ignores every further read** until you reset it. Each subsequent `std::cin >> x` returns immediately without touching `x`. Programs that do not check end up acting on stale values or looping forever.',
        },
        {
          type: 'code',
          title: 'choose_level.cpp',
          runnable: true,
          stdin: 'abc\n7\n',
          code: `#include <iostream>
#include <limits>

int main() {
    int level = 0;
    std::cout << "Choose a level (1-10): ";
    while (!(std::cin >> level)) {
        std::cout << "That's not a number. Try again: ";
        std::cin.clear();
        std::cin.ignore(
            std::numeric_limits<std::streamsize>::max(), '\\n');
    }
    std::cout << "Loading level " << level << "...\\n";
}`,
          output: `Choose a level (1-10): That's not a number. Try again: Loading level 7...`,
          annotations: [
            { lines: 7, text: 'The extraction returns the stream, and a stream converts to `bool`: `true` if the last operation succeeded. A `while` loop (Unit 5) repeats its body as long as its condition is true — here, as long as the read **fails**.' },
            { lines: 9, text: '`clear()` resets the error flags so the stream will accept reads again. It does **not** remove the bad characters.' },
            { lines: '10-11', text: '`ignore(n, \'\\n\')` discards up to `n` characters, stopping after the first newline. Passing the maximum `std::streamsize` means "the rest of the line, however long".' },
            { lines: 13, text: 'With the input `abc` then `7`, the first read fails, the line is discarded, and the second read succeeds.' },
          ],
        },
        {
          type: 'table',
          headers: ['Check', 'True when'],
          rows: [
            ['`if (std::cin)` or `if (std::cin >> x)`', 'no error so far / this read succeeded'],
            ['`std::cin.fail()`', 'a read failed (bad format, out of range, or end of input)'],
            ['`std::cin.eof()`', 'the end of input was reached (Ctrl+D on Linux/macOS, Ctrl+Z then Enter on Windows)'],
            ['`std::cin.bad()`', 'a serious, usually unrecoverable, error such as a broken device'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Out-of-range numbers fail too',
          text: 'Typing `99999999999` for an `int` also sets the failbit, and the variable receives the largest `int` value instead of 0. And if the input simply ends (end of file, or a closed pipe), the loop above would retry forever; production code should also stop when `std::cin.eof()` is true.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why doesn\'t bad input throw an exception?',
          text: 'iostreams were designed in the 1980s, before exceptions were part of C++, and bad input is an expected event rather than an exceptional one — users mistype all the time. So streams report problems through state flags that you check. If you prefer exceptions, you can opt in with `std::cin.exceptions(std::ios::failbit)`, but checking the stream is the idiomatic approach.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'order',
      prompt: 'Order the lines to read `level` and, if the read fails, recover the stream so the next read can work.',
      lines: [
        'std::cin >> level;',
        'if (!std::cin) {',
        '    std::cin.clear();',
        '    std::cin.ignore(1000, \'\\n\');',
        '}',
      ],
      distractors: ['    std::cin.reset();'],
      explanation:
        'Read, test, then recover — and the recovery order matters. `ignore()` is itself an input operation, and every input operation on a stream in the fail state does nothing, so you must `clear()` the error flags **first** and then discard the bad line. There is no `reset()` member on streams; `clear()` is the one that resets the state.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Reading an unknown number of values',
      blocks: [
        {
          type: 'p',
          text: 'Because `std::cin >> x` evaluates to the stream, and the stream converts to `true` only while reads succeed, you can read values until there are no more with a single loop condition. This is the standard idiom for processing input of unknown length: a list of scores, a level file, a replay log.',
        },
        {
          type: 'code',
          title: 'score_stats.cpp',
          runnable: true,
          stdin: '120 340 95\n410 275\n',
          code: `#include <iostream>

int main() {
    int score = 0;
    int count = 0;
    int total = 0;

    while (std::cin >> score) {
        ++count;
        total += score;
    }

    std::cout << "Rounds: " << count << '\\n';
    std::cout << "Total:  " << total << '\\n';
    std::cout << "Mean:   " << static_cast<double>(total) / count
              << '\\n';
}`,
          output: `Rounds: 5
Total:  1240
Mean:   248`,
          annotations: [
            { lines: 8, text: 'Read, then test the stream. The loop body runs once per successfully read number and stops at the first failure — end of input **or** a token that is not a number.' },
            { lines: '9-10', text: 'The pattern you saw in the previous unit: increment and compound assignment to accumulate statistics.' },
            { lines: 15, text: 'Convert before dividing to get a floating-point mean (1240 / 5 happens to be exact, 248). With zero rounds this would divide by zero; a real program would check `count` first.' },
          ],
        },
        {
          type: 'p',
          text: 'Input does not have to come from the keyboard. With `./score_stats < scores.txt` the shell connects a file to stdin, and the program reads it without any changes. When typing interactively, signal "no more input" with **Ctrl+D** (Linux/macOS) or **Ctrl+Z then Enter** (Windows).',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Do not test eof() before reading',
          text: 'A common mistake is `while (!std::cin.eof()) { std::cin >> score; … }`. End-of-file is only detected **after** a read attempt fails, so this loop runs one extra time and processes a stale value (and loops forever on non-numeric input, which never sets eof). Always read first and test the result, as in `while (std::cin >> score)`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'truefalse',
      prompt: '`while (std::cin >> score)` stops both at the end of input and at the first token that cannot be read as a number.',
      answer: true,
      explanation:
        'The loop condition is the stream\'s state after the read. Reaching end-of-file sets eofbit and failbit; a non-numeric token like `quit` sets failbit. Either way the stream converts to `false` and the loop ends. If you need to tell the two apart afterwards, check `std::cin.eof()`. In the non-numeric case, remember the token is still waiting in the stream.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Formatting output with <iomanip>',
      blocks: [
        {
          type: 'p',
          text: 'Leaderboards, inventories and debug tables need aligned columns and a fixed number of decimal places. The `<iomanip>` header provides [[stream-manipulator|stream manipulators]]: objects you insert into the stream that change **how** later values are printed rather than printing anything themselves.',
        },
        {
          type: 'code',
          title: 'leaderboard.cpp',
          runnable: true,
          code: `#include <iomanip>
#include <iostream>

int main() {
    std::cout << std::left << std::setw(10) << "Player"
              << std::right << std::setw(8) << "Score"
              << std::setw(8) << "Acc%" << '\\n';
    std::cout << std::setfill('-') << std::setw(26) << ""
              << std::setfill(' ') << '\\n';

    std::cout << std::fixed << std::setprecision(1);
    std::cout << std::left << std::setw(10) << "Aria"
              << std::right << std::setw(8) << 15200
              << std::setw(8) << 87.456 << '\\n';
    std::cout << std::left << std::setw(10) << "Borin"
              << std::right << std::setw(8) << 9875
              << std::setw(8) << 92.0 << '\\n';
}`,
          output: `Player       Score    Acc%
--------------------------
Aria         15200    87.5
Borin         9875    92.0`,
          annotations: [
            { lines: 5, text: '`std::setw(10)` pads the **next** value to at least 10 characters. `std::left` puts the padding after the text.' },
            { lines: '8-9', text: 'A neat trick: print an empty string 26 characters wide with `-` as the fill character, then restore the fill to a space.' },
            { lines: 11, text: '`std::fixed` plus `std::setprecision(1)` means "exactly one digit after the decimal point". Both stay in effect for the rest of the program.' },
            { lines: 14, text: '87.456 is rounded to 87.5 for display; the variable itself is unchanged.' },
          ],
        },
        {
          type: 'table',
          headers: ['Manipulator', 'Effect', 'Lasts'],
          rows: [
            ['`std::setw(n)`', 'minimum width of the next value', '**next value only**'],
            ['`std::left` / `std::right`', 'which side the padding goes', 'until changed'],
            ['`std::setfill(c)`', 'padding character (default space)', 'until changed'],
            ['`std::fixed`', 'always use decimal notation', 'until changed'],
            ['`std::setprecision(n)`', 'with `fixed`: digits after the point; without: significant digits', 'until changed'],
            ['`std::boolalpha`', 'print `bool` as `true`/`false`', 'until changed'],
          ],
          caption: 'Only `setw` resets itself. Everything else is "sticky" and stays on the stream.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'setprecision without fixed',
          text: 'Without `std::fixed`, `std::setprecision(2)` sets **significant digits**, not decimal places: `87.456` prints as `87`, and `1234.5` as `1.2e+03`. Pair it with `std::fixed` whenever you mean "N decimal places".',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why are most manipulators sticky?',
          text: 'Formatting settings live inside the stream object as state, so they stay until something changes them. That makes sense for settings like precision, which you usually want for a whole report. Width is the exception because it almost always applies to one column. The downside of stickiness is that a setting made in one part of a program silently affects output elsewhere, so restore settings you change in shared code.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'What does this print? (Dots are shown here as spaces would be.)',
      code: `std::cout << std::setw(5) << 42 << 7 << '\\n';`,
      options: [
        { text: '`...42....7`', why: 'That assumes `setw(5)` applies to every following value. It applies only to the very next one.' },
        { text: '`...427`', correct: true, why: '`42` is padded to width 5 (three spaces, then 42). The width then resets to 0, so `7` prints with no padding.' },
        { text: '`42...7`', why: 'Numbers are right-aligned by default, so the padding comes **before** 42, not after.' },
        { text: '`00042 7`', why: 'The default fill character is a space, not zero, and nothing inserts a separator before 7.' },
      ],
      explanation:
        '`std::setw` is the one manipulator that is not sticky: the stream resets the width to zero after each formatted output. For a table you must repeat `std::setw` before every column value, as the leaderboard example does.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'std::format: modern, compact formatting (C++20)',
      blocks: [
        {
          type: 'p',
          text: 'Manipulators work, but the leaderboard took 16 lines of `<<` chains. C++20 added [[std-format|std::format]] in `<format>`: you write a format string with `{}` placeholders, pass the values, and get back a `std::string`. GCC 13, Clang 17 and MSVC 2019 16.10 and later support it.',
        },
        {
          type: 'code',
          title: 'format.cpp',
          runnable: true,
          code: `#include <format>
#include <iostream>

int main() {
    std::cout << std::format("{:<10}{:>8}{:>8}\\n",
                             "Player", "Score", "Acc%");
    std::cout << std::format("{:<10}{:>8}{:>8.1f}\\n",
                             "Aria", 15200, 87.456);

    int hp = 45;
    int maxHp = 120;
    std::cout << std::format("HP {}/{} ({:.1f}%)\\n",
                             hp, maxHp, hp * 100.0 / maxHp);
    std::cout << std::format("Flags {:#010b}, tint #{:06X}\\n",
                             13, 0xFF8800);
}`,
          output: `Player       Score    Acc%
Aria         15200    87.5
HP 45/120 (37.5%)
Flags 0b00001101, tint #FF8800`,
          annotations: [
            { lines: '5-6', text: 'Inside `{}`, after a colon, comes the format spec. `<10` = left-align in 10 characters, `>8` = right-align in 8.' },
            { lines: '7-8', text: '`>8.1f` combines alignment, width and precision: right-aligned, 8 wide, fixed notation with 1 decimal place. Nothing is sticky — each placeholder has its own spec.' },
            { lines: '12-13', text: 'Plain `{}` uses the default format for each type. Placeholders are filled from the arguments in order.' },
            { lines: '14-15', text: '`#010b`: binary with a `0b` prefix, zero-padded to width 10. `06X`: upper-case hex, zero-padded to 6 digits — handy for colours and flags.' },
          ],
        },
        {
          type: 'table',
          headers: ['Spec', 'Meaning', 'Example → result'],
          rows: [
            ['`{}`', 'default formatting', '`{}` with 42 → `42`'],
            ['`{:8}`', 'minimum width 8', 'numbers right, text left by default'],
            ['`{:<8}` `{:>8}` `{:^8}`', 'left / right / centre', '`{:^8}` with "mid" → `  mid   `'],
            ['`{:.2f}`', 'fixed, 2 decimals', '3.14159 → `3.14`'],
            ['`{:+}`', 'always show the sign', '7 → `+7`'],
            ['`{:x}` `{:X}` `{:b}`', 'hex / upper hex / binary', '255 → `ff`'],
            ['`{0}` `{1}`', 'pick arguments by position', '`{1} {0}` swaps them'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why another formatting system?',
          text: 'C\'s `printf("%d", x)` is compact but not type-safe: pass a `double` where `%d` expects an `int` and you get undefined behavior. iostreams are type-safe but verbose and have sticky state. `std::format` (based on Victor Zverovich\'s popular {fmt} library) is both: compact like `printf`, type-safe like streams, and the format string is **checked at compile time**, so `std::format("{:d}", "text")` does not even compile.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'std::print (C++23)',
          text: 'C++23 adds `std::print` and `std::println` in `<print>`, which format and write in one step: `std::println("HP {}/{}", hp, maxHp);`. GCC supports them from version 14, so this course uses `std::cout << std::format(…)`, which works on GCC 13.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Formatting in Unreal Engine',
          text: 'Unreal has no console for players, so text goes to the log instead. The classic `UE_LOG(LogTemp, Warning, TEXT("HP %d/%d"), Hp, MaxHp);` uses `printf`-style specifiers (strings are passed as `*MyFString`), and `FString::Printf` builds strings the same way. UE 5.2 added `UE_LOGFMT`, which uses `{}` placeholders much like `std::format`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'fill',
      prompt: 'Complete the format specs so the name is left-aligned in 8 characters and the speed shows exactly one decimal place.',
      template: `std::cout << std::format("{:___}|{:___}\\n", name, speed);
// Aria    |612.5`,
      blanks: [{ answers: ['<8', '8'] }, { answers: ['.1f'] }],
      wordBank: ['<8', '>8', '.1f', '1f', '%.1f', '.1'],
      explanation:
        '`<8` left-aligns in a field 8 wide (for strings, plain `8` would also left-align, because text defaults to the left). `.1f` selects fixed notation with one digit after the point. `%.1f` is `printf` syntax and is invalid inside `{}`; `.1` without `f` means one *significant* digit in general notation, which would print `6e+02`.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'bug',
      prompt: 'The HUD should show `Accuracy: 87.46%`, but it shows `Accuracy: 87%`. Tap the line responsible.',
      code: `#include <iomanip>
#include <iostream>

int main() {
    double accuracy = 87.456;
    std::cout << "Accuracy: "
              << std::setprecision(2)
              << accuracy << "%\\n";
}`,
      bugLines: [7],
      hint: 'What does `setprecision` count when the stream is not in fixed mode?',
      explanation:
        'Without `std::fixed`, `std::setprecision(2)` limits the number to two **significant digits**, so 87.456 becomes `87`. Write `std::fixed << std::setprecision(2)` to mean two decimal places, or use `std::format("{:.2f}", accuracy)`, whose `f` makes the intent explicit.',
    },
  ],
  takeaways: [
    'A stream is a one-way flow of characters; `std::cout` and `std::clog` are buffered, `std::cerr` writes immediately, and stderr stays visible when stdout is redirected.',
    '`>>` skips leading whitespace, reads only the characters that fit the target type, and leaves everything else in the stream.',
    'A failed read sets the failbit and blocks all further reads: check the stream, then `clear()` and `ignore()` the bad line — in that order.',
    '`while (std::cin >> x)` reads until end of input or the first unreadable token; never loop on `!std::cin.eof()`.',
    '`std::setw` affects only the next value; `std::fixed`, `std::setprecision`, `std::left` and `std::setfill` are sticky. Without `fixed`, precision counts significant digits.',
    'C++20 `std::format` gives compact, type-safe, compile-time-checked formatting with specs like `{:>8.1f}`.',
  ],
  reading: [
    {
      title: 'std::cin and handling invalid input',
      url: 'https://www.learncpp.com/cpp-tutorial/stdcin-and-handling-invalid-input/',
      source: 'learncpp',
      note: 'A thorough tour of every way input can go wrong, with robust patterns for each.',
    },
    {
      title: 'Input/output manipulators',
      url: 'https://en.cppreference.com/w/cpp/io/manip',
      source: 'cppreference',
      note: 'The full list of manipulators, which header each lives in, and which ones are sticky.',
    },
    {
      title: 'std::format',
      url: 'https://en.cppreference.com/w/cpp/utility/format/format',
      source: 'cppreference',
      note: 'Reference for `std::format`; follow the link to the standard format specification for every option.',
    },
    {
      title: 'std::basic_istream::ignore',
      url: 'https://en.cppreference.com/w/cpp/io/basic_istream/ignore',
      source: 'cppreference',
      note: 'Exactly how `ignore` counts and stops, including the `std::numeric_limits<std::streamsize>::max()` special case.',
    },
  ],
};
