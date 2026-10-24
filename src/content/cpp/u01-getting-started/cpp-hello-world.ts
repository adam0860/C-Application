import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-hello-world',
  title: 'Hello, World — Dissected',
  summary: 'Every character of the classic first program, and the reason it is there.',
  minutes: 14,
  objectives: [
    'Explain what `#include` does and why C++ programs need it',
    'Describe the role of `main` and what its return value means',
    'Read `std::cout << "text";` and explain each piece: namespace, object, operator',
    'Choose between `\'\\n\'` and `std::endl` and justify the choice',
    'Compile and run a program from the command line',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'The whole program',
      blocks: [
        {
          type: 'p',
          text: 'Here is the program almost every C++ programmer writes first. It is only five lines, but every line teaches something fundamental about how C++ works. Tap through the annotations to see what each line does — then we will take it apart piece by piece.',
        },
        {
          type: 'code',
          title: 'hello.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    std::cout << "Hello, World!\\n";
    return 0;
}`,
          output: 'Hello, World!',
          annotations: [
            { lines: 1, text: 'A [[preprocessor]] directive: paste in the declarations from the standard `<iostream>` header so we can use `std::cout`.' },
            { lines: 3, text: 'Defines the function `main`. The operating system starts your program by calling it. `int` means it hands back a whole number when it finishes.' },
            { lines: 4, text: 'Sends the text to the console. `std::cout` is the standard output [[stream]]; `<<` pushes data into it; `\\n` ends the line.' },
            { lines: 5, text: 'Ends `main` and reports **success** (zero) back to the operating system.' },
            { lines: [3, 6], text: 'The braces `{ }` mark the function body — everything between them runs when `main` is called.' },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Think of it like a letter',
          text: 'The `#include` line is the address book you grab before writing (it tells you who `std::cout` is). `main` is the letter itself. The `std::cout` line is the sentence you write, and `return 0;` is signing off with "all good".',
        },
      ],
    },
    {
      kind: 'concept',
      title: '#include: borrowing code',
      blocks: [
        {
          type: 'p',
          text: 'C++ has almost nothing built in for input and output — not even a way to print text. That is deliberate: the core language stays small, and features like printing live in the [[standard-library]]. To use part of the library you must first tell the [[compiler]] it exists. That is the job of `#include`.',
        },
        {
          type: 'p',
          text: 'Lines starting with `#` are not C++ statements. They are instructions to the [[preprocessor]], a text-processing pass that runs **before** the compiler proper. `#include <iostream>` literally means: *find the file called `iostream` and paste its entire contents here.*',
        },
        {
          type: 'compare',
          left: {
            title: 'Angle brackets',
            tone: 'neutral',
            code: '#include <iostream>',
            text: 'Search the compiler\'s system/library include paths. Use for the standard library and installed libraries.',
          },
          right: {
            title: 'Quotes',
            tone: 'neutral',
            code: '#include "player.h"',
            text: 'Search next to the current file first, then the system paths. Use for your own project\'s headers.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does C++ copy-paste text instead of "importing" modules?',
          text: 'C++ inherited this model from C in the early 1980s, when compilers had to process one file at a time with very little memory. A [[header-file]] contains **declarations** — promises like "a thing called `std::cout` exists and has this type". The compiler only needs those promises to check your code; the actual machinery is connected later by the [[linker]]. C++20 added real `import` modules, but `#include` remains the norm in most code bases — including Unreal Engine.',
        },
        {
          type: 'deepdive',
          title: 'See it for yourself: how big is <iostream>?',
          blocks: [
            {
              type: 'p',
              text: 'You can ask GCC or Clang to stop after preprocessing with the `-E` flag and look at what the compiler actually receives:',
            },
            { type: 'code', lang: 'shell', code: 'g++ -E hello.cpp -o hello.ii\nwc -l hello.ii' },
            {
              type: 'p',
              text: 'Your five-line file typically expands to **tens of thousands** of lines, because `<iostream>` includes other headers, which include others. This is one reason large C++ projects compile slowly — and why tricks like precompiled headers (which Unreal uses heavily) exist.',
            },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does `#include <iostream>` actually do?',
      options: [
        {
          text: 'The preprocessor pastes the contents of the `iostream` header into the file before compilation',
          correct: true,
          why: 'Exactly — it is a textual copy-paste performed by the preprocessor, giving the compiler the declarations it needs.',
        },
        {
          text: 'It downloads the iostream library from the internet',
          why: 'Nothing is downloaded. The header ships with your compiler and lives on your disk.',
        },
        {
          text: 'It runs the iostream program before `main` starts',
          why: 'Headers are not programs that run. They are text (mostly declarations) that is inserted into your file.',
        },
        {
          text: 'It tells the program to print text to the console',
          why: 'Including the header only makes `std::cout` *available*. Printing only happens when a statement like `std::cout << ...` runs.',
        },
      ],
      explanation:
        'Directives beginning with `#` are handled by the preprocessor, which runs before the compiler. `#include` is a literal file paste: the compiler then sees all the declarations from `<iostream>`, including `std::cout`, as if you had typed them yourself.',
    },
    {
      kind: 'concept',
      title: 'main: where everything starts',
      blocks: [
        {
          type: 'p',
          text: 'Every C++ program must have exactly one function named `main`. When you launch the program, the operating system (with help from startup code your compiler adds) calls `main`. When `main` returns, the program ends.',
        },
        {
          type: 'code',
          code: `int main() {
    // your program runs here, top to bottom
    return 0;
}`,
          annotations: [
            { lines: 1, text: '`int` is the **return type**: `main` promises to hand back an integer. The empty `()` means it takes no inputs (there is a second form, `main(int argc, char* argv[])`, for reading command-line arguments).' },
            { lines: 3, text: 'The returned number is the **exit code**. By convention `0` means success and any other value signals an error — scripts and build tools check it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'A special rule just for main',
          text: 'If execution reaches the closing `}` of `main` without a `return`, the program behaves as if you wrote `return 0;`. This exception applies **only** to `main`. Any other function declared to return a value must actually return one — flowing off the end is [[undefined-behavior]].',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: '`void main()` is not C++',
          text: 'Some old tutorials and compilers accept `void main()`. The C++ standard requires `main` to return `int`. Modern compilers reject `void main` or warn about it, so always write `int main()`.',
        },
        {
          type: 'deepdive',
          title: 'Checking the exit code yourself',
          blocks: [
            { type: 'p', text: 'After running a program in a terminal you can inspect its exit code:' },
            {
              type: 'table',
              headers: ['Shell', 'Command'],
              rows: [
                ['Linux / macOS (bash, zsh)', '`echo $?`'],
                ['Windows PowerShell', '`echo $LASTEXITCODE`'],
                ['Windows cmd.exe', '`echo %ERRORLEVEL%`'],
              ],
            },
            {
              type: 'p',
              text: 'Try changing `return 0;` to `return 3;`, rebuild, run, and check: the shell will report `3`. Continuous-integration systems use exactly this to decide whether a build or test run failed.',
            },
          ],
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'If you leave out `return 0;` at the end of `main`, the program has undefined behavior.',
      answer: false,
      explanation:
        '`main` is special: reaching its closing brace is the same as `return 0;`. Many style guides still write it explicitly for clarity, but it is not required. Be careful, though — this exception does **not** apply to any other function.',
    },
    {
      kind: 'concept',
      title: 'std::cout << "...": three ideas in one line',
      blocks: [
        { type: 'p', text: 'The printing line packs in three separate concepts. Let\'s unpack them one at a time.' },
        {
          type: 'steps',
          items: [
            {
              title: '`std::` — the namespace',
              text: 'Everything in the standard library lives inside a [[namespace]] called `std`. The `::` is the [[scope-resolution-operator]]: `std::cout` means "the `cout` that belongs to `std`". Namespaces prevent name collisions — your own code can have a variable called `cout` without clashing with the library\'s.',
            },
            {
              title: '`cout` — an object, not a keyword',
              text: '`cout` ("character output") is a global [[object]] of type `std::ostream` that represents the console\'s output stream. It is ordinary library code, not language magic.',
            },
            {
              title: '`<<` — the insertion operator',
              text: 'Normally `<<` shifts bits left. The library [[operator-overloading|overloads]] it for streams to mean "insert this into the stream". The arrows point the way the data flows: from the text, into `cout`.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Because `<<` returns the stream itself, you can **chain** insertions. Each `<<` is evaluated left to right, and each one hands `std::cout` to the next:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>

int main() {
    std::cout << "Level " << 3 << " complete! Score: " << 1250 * 2 << '\\n';
}`,
          output: 'Level 3 complete! Score: 2500',
          annotations: [
            { lines: 4, text: 'Strings, integers and the result of an expression can all be inserted. `std::cout` knows how to turn each type into text. `1250 * 2` is computed first, then printed.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just write `using namespace std;`?',
          text: 'Many tutorials add `using namespace std;` so they can write `cout` instead of `std::cout`. It works in tiny programs, but it dumps hundreds of names (`count`, `distance`, `min`, `size`…) into your scope, which can silently collide with your own names. In headers it is especially harmful because it leaks into every file that includes them. Professional code — and this course — writes `std::` explicitly. It is five extra characters that make code unambiguous.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the program so it compiles and prints a greeting.',
      template: `#include <___>

int ___() {
    std::___ << "Ready, player one\\n";
    return 0;
}`,
      blanks: [{ answers: ['iostream'] }, { answers: ['main'] }, { answers: ['cout'] }],
      wordBank: ['iostream', 'main', 'cout', 'cin', 'start', 'print', 'stdio'],
      explanation:
        '`<iostream>` declares the console streams, `main` is the mandatory entry point, and `std::cout` is the output stream. (`std::cin` is its input counterpart — data flows *out of* it with `>>`.)',
    },
    {
      kind: 'concept',
      title: 'Text, escapes, and ending the line',
      blocks: [
        {
          type: 'p',
          text: 'Text in double quotes is a [[string-literal]]. Some characters can\'t be typed directly inside one — like a newline or a double quote — so C++ uses [[escape-sequence|escape sequences]] that start with a backslash:',
        },
        {
          type: 'table',
          headers: ['Escape', 'Meaning', 'Example'],
          rows: [
            ['`\\n`', 'New line', '`"line 1\\nline 2"`'],
            ['`\\t`', 'Tab', '`"Name:\\tAda"`'],
            ['`\\"`', 'A double quote', '`"She said \\"hi\\""`'],
            ['`\\\\`', 'A single backslash', '`"C:\\\\Games"`'],
          ],
        },
        {
          type: 'p',
          text: 'There are two common ways to end a line. They produce the same visible output but behave differently:',
        },
        {
          type: 'compare',
          left: {
            title: "'\\n'",
            tone: 'good',
            code: 'std::cout << "Done\\n";',
            text: 'Just inserts a newline character. Fast.',
          },
          right: {
            title: 'std::endl',
            tone: 'neutral',
            code: 'std::cout << "Done" << std::endl;',
            text: 'Inserts a newline **and flushes** the stream — forcing buffered output to be written immediately.',
          },
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why flushing matters',
          text: 'Output streams collect text in a memory **buffer** and write it to the screen in big chunks, because each write to the operating system is expensive. `std::endl` forces a write every time. In a loop printing 100,000 lines, using `std::endl` can be several times slower than `\'\\n\'`. Prefer `\'\\n\'` and flush only when you truly need output to appear immediately (for example right before a crash-prone operation while debugging).',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>

int main() {
    std::cout << "Hello";
    std::cout << "World";
    std::cout << '\\n';
}`,
      options: [
        { text: 'HelloWorld', correct: true, why: 'Nothing adds a space or newline between the two words, so they run together on one line.' },
        { text: 'Hello World', why: '`std::cout` never inserts spaces for you. You only get exactly the characters you send.' },
        { text: 'Hello\nWorld', why: 'Separate statements do not mean separate lines. Only `\\n` or `std::endl` start a new line.' },
        { text: 'Nothing — it does not compile', why: 'It compiles fine. `main` may omit `return 0;`.' },
      ],
      explanation:
        '`std::cout` prints exactly what you give it — no automatic spaces or line breaks. Splitting output across multiple statements has no visual effect. This trips up many beginners who expect `print`-style behavior from other languages.',
    },
    {
      kind: 'bug',
      prompt: 'This program fails to compile. Tap the line that contains the mistake.',
      code: `#include <iostream>

int main() {
    std::cout << "Loading assets..." << '\\n'
    std::cout << "Done!" << '\\n';
    return 0;
}`,
      bugLines: [4],
      hint: 'Every statement in C++ has to end with a particular character.',
      explanation:
        'Line 4 is missing its semicolon. Interestingly, compilers usually report the error on **line 5**, because that is where they discover something unexpected: without the `;`, the compiler reads lines 4 and 5 as one long expression. When an error message points at a line that looks fine, always check the end of the line *above* it.',
    },
    {
      kind: 'order',
      prompt: 'Put the lines in order to build a valid program that prints "GG".',
      lines: ['#include <iostream>', 'int main() {', '    std::cout << "GG\\n";', '    return 0;', '}'],
      distractors: ['void main() {'],
      explanation:
        'The `#include` must come before anything uses `std::cout`, because the compiler reads files top to bottom and must see a declaration before a use. `void main()` is a trap — standard C++ requires `int main()`.',
    },
    {
      kind: 'concept',
      title: 'Building and running it yourself',
      blocks: [
        {
          type: 'p',
          text: 'Source code is just text; to run it you must **compile** it into an [[executable]]. Here is how with the three major compilers:',
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'GCC or Clang (Linux, macOS, MSYS2 on Windows)',
          code: `g++ -std=c++20 -Wall -Wextra hello.cpp -o hello
./hello`,
          annotations: [
            { lines: 1, text: '`-std=c++20` selects the language version, `-Wall -Wextra` turn on helpful [[compiler-warning|warnings]], and `-o hello` names the output file. Swap `g++` for `clang++` to use Clang.' },
            { lines: 2, text: 'Runs the program. `./` means "in the current folder".' },
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'MSVC (Developer Command Prompt for Visual Studio)',
          code: `cl /std:c++20 /W4 /EHsc hello.cpp
hello.exe`,
          annotations: [
            { lines: 1, text: '`/W4` is a high warning level and `/EHsc` enables standard C++ exception handling. MSVC is the compiler Unreal Engine uses on Windows.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'No compiler installed? Use Compiler Explorer',
          text: 'Every runnable example in this app has an **Open in Compiler Explorer** button. [Compiler Explorer](https://godbolt.org) compiles and runs C++ in your browser — great for experimenting on the go.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Unreal projects have no `main` you write yourself — the engine owns the entry point and calls into your classes. You will also rarely use `std::cout`; Unreal has its own logging macro, `UE_LOG`. But everything you learn here about the preprocessor, headers and compilation applies directly: Unreal C++ is still C++.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A build script runs your program and sees an exit code of `1`. What does that conventionally mean?',
      options: [
        { text: 'The program reported a failure', correct: true, why: 'Non-zero exit codes signal errors by convention; zero means success.' },
        { text: 'The program printed one line', why: 'The exit code is unrelated to how much output was printed.' },
        { text: 'The program ran successfully once', why: 'Success is conventionally `0`, not `1`.' },
        { text: 'The program is still running', why: 'An exit code only exists after the program has finished.' },
      ],
      explanation:
        'The integer returned from `main` becomes the process exit code. `0` means success; any non-zero value means "something went wrong", and tools like build systems, test runners and shell scripts make decisions based on it.',
    },
  ],
  takeaways: [
    '`#include` is a preprocessor directive that pastes a header\'s declarations into your file before compilation.',
    'Every program has exactly one `int main()`; its return value is the exit code, where `0` means success.',
    '`std::cout` is an output stream object in the `std` namespace; `<<` inserts data into it and can be chained.',
    '`std::cout` prints exactly what you send — no automatic spaces or newlines.',
    'Prefer `\'\\n\'` over `std::endl` unless you specifically need to flush the output buffer.',
    'When the compiler reports an error on a line that looks fine, check the end of the previous line.',
  ],
  reading: [
    {
      title: 'Main function',
      url: 'https://en.cppreference.com/w/cpp/language/main_function',
      source: 'cppreference',
      note: 'The precise rules for `main`, including its allowed signatures and the implicit return 0.',
    },
    {
      title: 'std::cout, std::wcout',
      url: 'https://en.cppreference.com/w/cpp/io/cout',
      source: 'cppreference',
      note: 'Reference for the standard output stream object.',
    },
    {
      title: 'Source file inclusion (#include)',
      url: 'https://en.cppreference.com/w/cpp/preprocessor/include',
      source: 'cppreference',
      note: 'Exactly how the preprocessor searches for and inserts headers.',
    },
    {
      title: 'Statements and the structure of a program',
      url: 'https://www.learncpp.com/cpp-tutorial/statements-and-the-structure-of-a-program/',
      source: 'learncpp',
      note: 'A friendly walkthrough of the same program with more beginner exercises.',
    },
    {
      title: 'Compiler Explorer',
      url: 'https://godbolt.org',
      source: 'other',
      note: 'Compile and run C++ in your browser, and even see the generated assembly.',
    },
  ],
};
