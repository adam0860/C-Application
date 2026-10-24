import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-debugging',
  title: 'Debugging Like a Pro',
  summary:
    'Read compiler errors efficiently, drive a debugger with breakpoints and stepping, and let assert and sanitizers find bugs for you.',
  minutes: 20,
  objectives: [
    'Work through compiler errors efficiently by fixing the first one first',
    'Explain what debug symbols are and why optimized builds are harder to debug',
    'Use breakpoints, conditional breakpoints, stepping, watches and the call stack to investigate a bug',
    'Drive gdb or lldb from the terminal and find the same tools in Visual Studio',
    'Use `assert` correctly and read ASan, UBSan and TSan reports',
    'Debug Unreal C++ from Visual Studio using the DebugGame Editor configuration',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Debugging is a method, not luck',
      blocks: [
        {
          type: 'p',
          text: 'Beginners debug by staring at code and changing things until the symptom goes away. Professionals treat a bug like an experiment: they gather evidence, form a hypothesis, and test it. The difference is not talent — it is method and tools.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Reproduce', text: 'Find reliable steps that trigger the bug. A bug you cannot reproduce is a bug you cannot confirm you fixed. Shrink the case: the smaller the reproduction, the fewer places the bug can hide.' },
            { title: 'Hypothesize', text: 'Based on the symptom, guess where and why things go wrong: "the enemy\'s HP goes negative because damage is applied twice in the same frame".' },
            { title: 'Test', text: 'Use the [[debugger]], logging or a [[sanitizer]] to confirm or reject the guess. A rejected hypothesis is progress — it removes a suspect.' },
            { title: 'Fix the cause, not the symptom', text: 'Clamping HP to zero hides the double damage. Find out *why* damage is applied twice.' },
            { title: 'Verify and protect', text: 'Re-run the reproduction, and if you can, add a test or an assertion so the bug can never silently return.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why be so systematic?',
          text: 'Because the bug is, by definition, somewhere your understanding of the program is wrong. Re-reading the code with that same understanding tends to confirm your mistaken beliefs. Tools show you what the program *actually* does, and a method keeps you honest about what you have and have not ruled out.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'The rubber duck',
          text: 'Explaining the problem out loud, line by line, to a colleague — or a rubber duck on your desk — is a surprisingly effective debugging tool. Saying "and then this variable is obviously 3" is often the moment you realise it obviously isn\'t.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'order',
      prompt: 'A player reports that the boss sometimes gets stuck at 1 HP. Put the debugging steps in a sensible order.',
      linesAreCode: false,
      lines: [
        'Find steps that reproduce the bug reliably',
        'Form a hypothesis about what causes it',
        'Test the hypothesis with the debugger, logs or a sanitizer',
        'Fix the root cause in the code',
        'Re-run the reproduction and add a regression test',
      ],
      distractors: ['Clamp the boss HP to 0 whenever it equals 1'],
      explanation:
        'Reproduction comes first because every later step depends on being able to trigger the bug on demand. Hypotheses guide where to look, tests confirm them, and only then do you change code. Verifying afterwards proves the fix works, and a regression test keeps it fixed. The distractor "fixes" the symptom: the boss dies, but whatever leaves it at 1 HP (perhaps a rounding error or a damage check using `>` instead of `>=`) is still there.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Reading compiler errors: fix the first one first',
      blocks: [
        {
          type: 'p',
          text: 'Before you can debug a program, it has to compile. Compiler output can look terrifying — dozens of errors from one typo — but there is a simple rule that cuts through it: **read and fix the first error first**, then rebuild.',
        },
        {
          type: 'code',
          title: 'inventory.cpp',
          code: `#include <iostream>

struct Inventory {
    std::vector<int> items;
    int count() const { return items.size(); }
};

int main() {
    Inventory bag;
    bag.items.push_back(7);
    std::cout << bag.count() << '\\n';
}`,
          annotations: [
            { lines: 1, text: 'The real mistake is a *missing* line: `#include <vector>`.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'GCC 13 output (trimmed)',
          code: `inventory.cpp:4:10: error: 'vector' in namespace 'std' does
    not name a template type
inventory.cpp:2:1: note: 'std::vector' is defined in header
    '<vector>'; did you forget to '#include <vector>'?
inventory.cpp:5:32: error: 'items' was not declared in this
    scope
inventory.cpp:10:9: error: 'struct Inventory' has no member
    named 'items'`,
          annotations: [
            { lines: '1-2', text: 'The root cause, in the format `file:line:column: error: message`. Line 4 is where the compiler noticed the problem.' },
            { lines: '3-4', text: 'A `note:` belongs to the error above it. Modern compilers often suggest the exact fix.' },
            { lines: '5-8', text: '**Cascade errors.** Because the member declaration failed, `items` does not exist, so every later use is an error too. Fix line 4 and these vanish.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does one mistake produce many errors?',
          text: 'After an error, the compiler tries to *recover* so it can report more problems in one pass. It guesses what you meant — here, it pretends the member `items` was never declared. If the guess is wrong, every later line that depends on it fails too. Errors after the first are therefore unreliable until the first is fixed.',
        },
        {
          type: 'list',
          items: [
            '**Look at the line above** when the reported line looks fine — a missing `;` or `}` is noticed only at the next token.',
            '**Template errors**: scroll to the first `error:` line, then look for `required from here` pointing into *your* file. The middle is the compiler explaining its reasoning through library code.',
            '**Distinguish compile errors from linker errors**: `undefined reference` / `LNK2019` come from the linker (first lesson of this unit) and mean every file compiled.',
            '**Build often.** Ten new lines with one error are easy to search; five hundred are not.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: 'A build prints three errors. What is the most efficient next step?',
      code: `hud.cpp:3:5: error: 'string' in namespace 'std' does not
    name a type
hud.cpp:9:12: error: 'title' was not declared in this scope
hud.cpp:14:5: error: 'title' was not declared in this scope`,
      lang: 'text',
      options: [
        {
          text: 'Fix line 14 first, since it is the last error and the most recent code',
          why: 'Later errors are often consequences of earlier ones; fixing them first can mean "fixing" code that was never wrong.',
        },
        {
          text: 'Add `#include <string>` for the error on line 3, rebuild, then see what remains',
          correct: true,
          why: 'If the member `title` failed to declare because `std::string` is unknown, the other two errors are fallout and disappear after the rebuild.',
        },
        {
          text: 'Declare a second variable called `title` near line 9',
          why: 'That treats a symptom. `title` almost certainly exists in the code; the compiler just could not process its declaration.',
        },
        {
          text: 'Ignore them: errors in `.cpp` files only matter at link time',
          why: 'Compile errors stop the build. Nothing is linked until every file compiles.',
        },
      ],
      explanation:
        'Compilers recover from an error by guessing, and later errors are often the result of a wrong guess. The first error is the only one guaranteed to be real. Fix it, rebuild, and re-read — a long list frequently collapses to nothing.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Debug symbols: a map from machine code to source',
      blocks: [
        {
          type: 'p',
          text: 'The CPU knows nothing about your variable names or line numbers; it only sees addresses and registers. For a debugger to say "you are on line 7 and `total` is 170", the compiler must write [[debug-symbols]]: tables that map machine-code addresses back to source files, lines, functions, variables and types.',
        },
        {
          type: 'table',
          headers: ['Toolchain', 'Flag', 'Where the symbols go'],
          rows: [
            ['GCC / Clang (Linux)', '`-g`', 'DWARF sections inside the object files and executable (can be split into separate files)'],
            ['Clang (macOS)', '`-g`', 'DWARF, collected into a `.dSYM` bundle'],
            ['MSVC', '`/Zi` (compile) + `/DEBUG` (link)', 'A separate `.pdb` (program database) file next to the `.exe`'],
          ],
        },
        {
          type: 'p',
          text: 'Symbols are independent of optimization. You can have an optimized build with symbols (`-O2 -g`), which is exactly what you want for profiling or for understanding crash reports from players. But optimization changes the *quality* of what the debugger can show: variables that live only in registers may display as `<optimized out>`, inlined functions vanish from the call stack, and stepping can jump back and forth as the optimizer has reordered lines.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Keep the symbols for every build you ship',
          text: 'Shipped games usually strip symbols to keep downloads small and make reverse engineering harder. But store the matching `.pdb` / debug files for every release: when a crash report arrives with raw addresses, those files turn `0x7ff6a1c2` back into `AEnemy::TakeHit, Enemy.cpp line 88`. Without them, the crash dump is almost useless.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why are symbols kept outside the code?',
          text: 'Debug information can be several times larger than the code itself. Storing it in separate sections or files means it is never loaded into memory when the program runs normally, so it costs nothing at run time — and it can be stripped or archived without recompiling.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Breakpoints, stepping, watches and the call stack',
      blocks: [
        {
          type: 'p',
          text: 'Every debugger — gdb, lldb, Visual Studio, Rider, Xcode — is built from the same handful of ideas. Here is a small program to practise on:',
        },
        {
          type: 'code',
          title: 'loot.cpp',
          runnable: true,
          code: `#include <iostream>
#include <vector>

int totalValue(const std::vector<int>& loot) {
    int total = 0;
    for (std::size_t i = 0; i < loot.size(); ++i) {
        total += loot[i];
    }
    return total;
}

int main() {
    std::vector<int> loot{50, 120, 75, 300};
    int value = totalValue(loot);
    std::cout << "Loot worth " << value << '\\n';
}`,
          output: 'Loot worth 545',
          annotations: [
            { lines: 7, text: 'A good spot for a **breakpoint**: execution pauses *before* this line runs, letting you inspect `i` and `total` on each iteration.' },
            { lines: 14, text: 'Paused here, **step over** runs the whole `totalValue` call and stops on line 15; **step into** enters `totalValue` and stops on line 5.' },
          ],
        },
        {
          type: 'table',
          headers: ['Idea', 'What it does'],
          rows: [
            ['[[breakpoint|Breakpoint]]', 'Pause when execution reaches a line or function.'],
            ['Conditional breakpoint', 'Pause only when an expression is true, e.g. `i == 2` or `hp < 0`. Essential in loops that run thousands of times.'],
            ['[[watchpoint|Watchpoint / data breakpoint]]', 'Pause when a memory location **changes**. The answer to "who keeps setting my health to zero?"'],
            ['[[stepping|Step over / into / out]]', 'Run one line, skipping over calls; run into the called function; run until the current function returns.'],
            ['Continue', 'Run until the next breakpoint (or the end).'],
            ['Watch / locals', 'Show values of variables and arbitrary expressions every time you pause.'],
            ['[[call-stack|Call stack]] (backtrace)', 'The chain of function calls that led here, one [[stack-frame]] per call. Select a frame to inspect *its* local variables.'],
          ],
        },
        {
          type: 'table',
          headers: ['Action', 'gdb', 'lldb', 'Visual Studio'],
          rows: [
            ['Start', '`run`', '`run`', 'F5'],
            ['Breakpoint', '`break loot.cpp:7`', '`b loot.cpp:7`', 'F9 on the line'],
            ['Conditional', '`break 7 if i == 2`', '`br set -l 7 -c "i == 2"`', 'Right-click breakpoint → Conditions'],
            ['Step over / into / out', '`next` / `step` / `finish`', '`next` / `step` / `finish`', 'F10 / F11 / Shift+F11'],
            ['Continue', '`continue`', '`continue`', 'F5'],
            ['Print a value', '`print total`', '`p total`', 'Hover, or the Watch window'],
            ['Watch for changes', '`watch total`', '`watchpoint set variable total`', 'New Breakpoint → Data Breakpoint'],
            ['Call stack', '`backtrace`', '`bt`', 'Call Stack window'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is the call stack so valuable?',
          text: 'A crash location tells you *where* things blew up; the call stack tells you *how you got there*. A null pointer crash inside `ApplyDamage` is rarely ApplyDamage\'s fault — walking up two frames usually reveals the caller that passed the null in. Learning to read a stack trace is the single highest-value debugging skill.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'mcq',
      prompt: 'Execution is paused on line 14 of `loot.cpp` (`int value = totalValue(loot);`). You suspect the bug is inside `totalValue`. Which command takes you there?',
      options: [
        {
          text: 'Step over (F10 / `next`)',
          why: 'Step over runs the entire call and pauses on line 15 — the bug would happen without you seeing it.',
        },
        {
          text: 'Step out (Shift+F11 / `finish`)',
          why: 'Step out runs until the *current* function (`main`) returns, which here means the end of the program.',
        },
        {
          text: 'Continue (F5 / `continue`)',
          why: 'Continue only stops at the next breakpoint. With none inside `totalValue`, the program runs to the end.',
        },
        {
          text: 'Step into (F11 / `step`)',
          correct: true,
          why: 'Step into enters the called function and pauses at its first line, ready for you to watch `total` grow.',
        },
      ],
      explanation:
        'Think of the three steps as zoom levels: *into* goes one level deeper into a call, *over* stays at the current level, *out* climbs back to the caller. A common workflow is to step over lines until a value looks wrong, restart, and step into the call that produced it.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'A gdb session, start to finish',
      blocks: [
        {
          type: 'p',
          text: 'Command-line debuggers are worth learning: they work over SSH on a build server, inside containers, and on platforms where no IDE runs. **gdb** is the GNU debugger, standard on Linux; **lldb** is LLVM\'s, standard on macOS. Here is a real session on `loot.cpp` (output lightly trimmed):',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Terminal',
          code: `$ g++ -std=c++20 -g -O0 loot.cpp -o loot
$ gdb -q ./loot
(gdb) break totalValue
Breakpoint 1 at 0x12b9: file loot.cpp, line 5.
(gdb) run
Breakpoint 1, totalValue (loot=std::vector of length 4,
    capacity 4 = {...}) at loot.cpp:5
5           int total = 0;
(gdb) print loot
$1 = std::vector of length 4, capacity 4 = {50, 120, 75, 300}
(gdb) break 7 if i == 2
Breakpoint 2 at 0x5555555552ca: file loot.cpp, line 7.
(gdb) continue
Breakpoint 2, totalValue (...) at loot.cpp:7
7               total += loot[i];
(gdb) print total
$2 = 170
(gdb) backtrace
#0  totalValue (loot=...) at loot.cpp:7
#1  0x0000555555555374 in main () at loot.cpp:14
(gdb) finish
Run till exit from #0  totalValue (...) at loot.cpp:7
Value returned is $3 = 545`,
          annotations: [
            { lines: 1, text: '`-g` for symbols, `-O0` so every variable stays visible.' },
            { lines: '3-4', text: 'You can break on a function name instead of a line number.' },
            { lines: '9-10', text: 'gdb ships "pretty printers" for standard containers, so a `std::vector` shows its elements rather than raw pointers.' },
            { lines: '11-15', text: 'A conditional breakpoint: the loop runs freely until `i == 2`, then stops before adding `loot[2]`.' },
            { lines: '16-17', text: '`50 + 120 = 170`: exactly what we expect after two iterations. Each check like this narrows down where reality and expectation diverge.' },
            { lines: '18-20', text: 'The call stack: frame #0 is where we are, frame #1 is who called us. `frame 1` would let you inspect `main`\'s variables.' },
            { lines: '21-23', text: '`finish` runs to the end of the current function and shows its return value.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Post-mortem debugging',
          text: 'When a program crashes, the OS can save a *core dump* (Linux/macOS) or *minidump* (Windows) — a snapshot of its memory. Loading it into the debugger (`gdb ./game core`, or opening the `.dmp` in Visual Studio) shows the call stack and variables at the moment of the crash, even on a machine where you could not reproduce it. Unreal\'s crash reporter is built on minidumps.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'fill',
      prompt: 'In gdb, pause on line 7 of `loot.cpp` only when `i` is 3, and then display the running total.',
      template: `(gdb) ___ 7 if i == 3
(gdb) run
(gdb) ___ total`,
      blanks: [{ answers: ['break', 'b', 'br'] }, { answers: ['print', 'p'] }],
      wordBank: ['break', 'print', 'watch', 'step', 'finish', 'next'],
      explanation:
        '`break LOCATION if CONDITION` creates a conditional breakpoint — the program runs at full speed until the condition is true. `print EXPR` evaluates any expression in the paused program\'s context, including function calls and members like `loot.size()`. The distractors: `watch total` would stop whenever `total` changes (useful, but not "on line 7 when i is 3"), `step`/`next` move one line, and `finish` runs to the end of the current function.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'The Visual Studio debugger',
      blocks: [
        {
          type: 'p',
          text: 'On Windows — and therefore for most Unreal developers — the Visual Studio debugger is the daily tool. The ideas are identical to gdb; they just live in windows instead of commands. Click in the left margin (or press F9) to set a breakpoint, press F5 to start, and these windows appear:',
        },
        {
          type: 'table',
          headers: ['Window', 'Use it for'],
          rows: [
            ['**Autos / Locals**', 'Variables used near the current line / all locals of the current function, updated at every pause'],
            ['**Watch**', 'Expressions you pin, such as `enemies.size()` or `player->Health`'],
            ['**Call Stack**', 'Double-click a frame to jump to that caller and see its locals'],
            ['**Threads**', 'Every thread in the process; switch between them (essential for the next unit)'],
            ['**Memory / Disassembly**', 'Raw bytes and machine code, for the truly mysterious bugs'],
          ],
        },
        {
          type: 'list',
          items: [
            '**Conditional breakpoints and hit counts**: right-click a breakpoint → *Conditions*, e.g. `wave == 7`, or "break on the 100th hit".',
            '**Tracepoints**: a breakpoint with an *Action* that prints a message such as `HP is {Health}` to the Output window and keeps running — logging without recompiling.',
            '**Data breakpoints**: *Debug → New Breakpoint → Data Breakpoint* pauses when a given address is written. Set one on a member once the object exists.',
            '**Run to Cursor** (Ctrl+F10) and **Set Next Statement** (Ctrl+Shift+F10): jump ahead quickly, or even re-run a line. Use the latter with care — it skips code without undoing its effects.',
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'How does the debugger know what a std::vector looks like?',
          text: 'Visual Studio uses **Natvis** files — XML descriptions of how to display a type — so a `std::vector` shows its elements instead of three raw pointers. gdb uses Python pretty-printers for the same purpose. Unreal ships a Natvis file so `TArray`, `FString` and `FName` display readably too.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Print debugging: when it shines, when it hurts',
      blocks: [
        {
          type: 'p',
          text: 'Adding `std::cout << "here " << hp << \'\\n\';` is the oldest debugging technique there is, and it is not shameful — it is a tool with specific strengths and weaknesses.',
        },
        {
          type: 'compare',
          left: {
            title: 'Print / log debugging',
            tone: 'neutral',
            text: '**Shows history**: a log of 10,000 frames reveals patterns a single pause cannot. **Works anywhere**: release builds, players\' machines, servers. **Less intrusive for timing** than stopping the whole program. But: needs a rebuild per change, clutters code, and output buffered when the program crashes may never appear.',
          },
          right: {
            title: 'Debugger',
            tone: 'neutral',
            text: '**Inspect everything** at a pause, including values you did not think to print. **No rebuild** to look at a new variable. **Call stack for free.** But: pausing freezes time, which breaks frame-timing and network bugs, and stepping through thousands of iterations is slow without good conditions.',
          },
        },
        {
          type: 'code',
          code: `#include <iostream>
#include <source_location>
#include <string_view>

void debugLog(std::string_view msg,
              std::source_location where =
                  std::source_location::current()) {
    std::cerr << where.file_name() << ':' << where.line()
              << " [" << where.function_name() << "] "
              << msg << '\\n';
}

void spawnWave(int wave) {
    debugLog("spawning");   // prints file, line and function
}`,
          annotations: [
            { lines: '5-7', text: 'C++20 `std::source_location` captures the *caller\'s* file, line and function as a default argument — no macros needed. GCC prints something like `game.cpp:14 [void spawnWave(int)] spawning`.' },
            { lines: 8, text: '`std::cerr` is unbuffered, so each message is written immediately and survives a crash right afterwards. `std::cout` output may still be sitting in a buffer when the program dies.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Heisenbugs',
          text: 'A [[heisenbug]] disappears when you try to observe it. Printing to the console is slow and takes internal locks, so adding a print can change timing enough to hide a threading bug; a debugger pause changes timing even more. If a bug vanishes the moment you add logging, suspect a race condition or undefined behavior — and reach for a sanitizer.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal',
          text: 'Unreal\'s `UE_LOG` macro is structured print debugging: messages have categories and verbosity levels, go to the Output Log and log files, and can be filtered or compiled out. You will learn it early in the Unreal course.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'truefalse',
      prompt: 'Adding print statements can make a multithreaded bug disappear without fixing it.',
      answer: true,
      explanation:
        'Console output is slow and internally synchronized: printing changes how long each thread takes and can force threads to wait for each other, which shifts the interleaving that triggered the bug. The bug is still there, just hiding — a classic heisenbug. This is why threading bugs are best hunted with ThreadSanitizer, which detects unsynchronized accesses regardless of whether they happened to collide in this particular run.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'assert: assumptions that check themselves',
      blocks: [
        {
          type: 'p',
          text: 'An [[assertion]] states something that must be true if your code is correct. `assert(condition)` from `<cassert>` does nothing when the condition holds; when it fails, it prints the expression, file, line and function, then aborts the program — immediately, at the scene of the crime.',
        },
        {
          type: 'code',
          title: 'loot.cpp',
          code: `#include <cassert>
#include <iostream>
#include <vector>

int pickLoot(const std::vector<int>& table, std::size_t roll) {
    assert(roll < table.size() && "loot roll out of range");
    return table[roll];
}

int main() {
    std::vector<int> table{10, 20, 30};
    std::cout << pickLoot(table, 1) << '\\n';
    std::cout << pickLoot(table, 7) << '\\n';
}`,
          annotations: [
            { lines: 6, text: '`&& "message"` is a common trick: a string literal is always true, so it does not change the result, but it appears in the failure message.' },
            { lines: 13, text: 'Without the assert, `table[7]` is undefined behavior that might "work". With it, the bug is reported right here.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Output (Debug build, GCC on Linux)',
          code: `20
loot: loot.cpp:6: int pickLoot(const std::vector<int>&,
  std::size_t): Assertion \`roll < table.size() &&
  "loot roll out of range"' failed.
Aborted (core dumped)`,
        },
        {
          type: 'p',
          text: 'When the `NDEBUG` macro is defined — as it is in Release builds — every `assert` expands to nothing. Assertions therefore cost nothing in shipped code, which means you can use them generously. It also means the expression **must not have side effects**, because in Release it is never evaluated.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why crash on purpose?',
          text: 'A violated assumption means the program is already in a state you did not design for. Continuing usually turns one clear bug into mysterious corruption that surfaces minutes later, far from the cause. Failing fast, with a precise message, while you are developing is far cheaper. Use assertions for *programmer errors* ("this index can never be out of range"); use exceptions or `std::expected` for *runtime conditions* that can legitimately happen ("the save file is missing").',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal\'s assertions',
          text: 'Unreal replaces `assert` with a family of macros: `check()` (like assert; crashes), `verify()` (always evaluates its expression, even when checks are compiled out), and `ensure()` (reports the failure and a call stack, then *continues*). They are covered in depth in the Unreal course.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'bug',
      prompt: 'This works perfectly in Debug builds, but in Release builds the boss never appears and the game crashes. Tap the line responsible.',
      code: `#include <cassert>
#include <vector>

struct Enemy { int hp = 100; };

bool spawnBoss(std::vector<Enemy>& enemies) {
    enemies.push_back(Enemy{500});
    return true;
}

int main() {
    std::vector<Enemy> enemies;
    assert(spawnBoss(enemies));
    Enemy& boss = enemies.back();
    boss.hp -= 50;
}`,
      bugLines: [13],
      hint: 'What happens to an `assert` when `NDEBUG` is defined?',
      explanation:
        'Line 13 puts the *work* inside the assertion. Release builds define `NDEBUG`, which removes the whole `assert(...)` — including the call to `spawnBoss`. The vector stays empty, and `enemies.back()` on line 14 is undefined behavior (typically a crash). Do the work unconditionally and assert only on the result: `const bool spawned = spawnBoss(enemies); assert(spawned);` (give `spawned` the `maybe_unused` attribute to avoid an unused-variable warning in Release). Unreal\'s `verify()` exists precisely for this situation.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'concept',
      title: 'Sanitizers: let the compiler watch your program',
      blocks: [
        {
          type: 'p',
          text: 'A **sanitizer** is a compiler mode that adds checking code around memory accesses, arithmetic or synchronization, plus a runtime library that reports violations the moment they happen. You met them briefly in the undefined behavior lesson; here is how to use and read them.',
        },
        {
          type: 'table',
          headers: ['Sanitizer', 'Flag (GCC / Clang)', 'Finds', 'Typical cost'],
          rows: [
            ['AddressSanitizer (ASan)', '`-fsanitize=address`', 'Out-of-bounds on heap/stack/globals, use-after-free, double free, leaks (Linux)', '~2× slower, more memory'],
            ['UndefinedBehaviorSanitizer (UBSan)', '`-fsanitize=undefined`', 'Signed overflow, bad shifts, null/misaligned access, invalid enum/bool values', 'Small'],
            ['ThreadSanitizer (TSan)', '`-fsanitize=thread`', '[[data-race|Data races]] between threads', '5–15× slower, much more memory'],
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          code: `g++ -std=c++20 -g -O1 -fno-omit-frame-pointer \\
    -fsanitize=address,undefined scores.cpp -o scores`,
          annotations: [
            { lines: 1, text: '`-g` gives file/line numbers in reports; `-O1` keeps it reasonably fast; `-fno-omit-frame-pointer` gives accurate call stacks.' },
            { lines: 2, text: 'ASan and UBSan combine well. TSan cannot be combined with ASan — build it separately. MSVC supports ASan too, with `/fsanitize=address`.' },
          ],
        },
        {
          type: 'p',
          text: 'Here is the iterator-invalidation bug from the containers unit — a pointer kept across `push_back` — and the report ASan produces (trimmed; the elided frames are `std::vector` internals):',
        },
        {
          type: 'code',
          title: 'scores.cpp',
          code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> scores{10, 20, 30};
    int* best = &scores[0];
    scores.push_back(40);        // may reallocate the buffer
    std::cout << *best << '\\n';  // reads the old, freed buffer
}`,
        },
        {
          type: 'code',
          lang: 'text',
          title: 'AddressSanitizer report',
          code: `==15653==ERROR: AddressSanitizer: heap-use-after-free on
    address 0x502000000010 at pc 0x... bp 0x... sp 0x...
READ of size 4 at 0x502000000010 thread T0
    #0 0x... in main scores.cpp:8

0x502000000010 is located 0 bytes inside of 12-byte region
    [0x502000000010,0x50200000001c)
freed by thread T0 here:
    #0 0x... in operator delete(void*, unsigned long)
    ...
    #7 0x... in std::vector<int>::push_back(int&&)
    #8 0x... in main scores.cpp:7

previously allocated by thread T0 here:
    #0 0x... in operator new(unsigned long)
    ...
    #7 0x... in main scores.cpp:5

SUMMARY: AddressSanitizer: heap-use-after-free scores.cpp:8`,
          annotations: [
            { lines: '1-2', text: '**What** went wrong: a read of memory that has already been freed.' },
            { lines: '3-4', text: '**Where**: a 4-byte read (one `int`) on line 8 — the `*best`.' },
            { lines: '6-7', text: 'The address lies inside a 12-byte block: the vector\'s original buffer of three `int`s.' },
            { lines: '8-12', text: '**Who freed it**: `push_back` on line 7, which allocated a bigger buffer and released the old one.' },
            { lines: '14-17', text: '**Who allocated it**: the vector\'s constructor on line 5. Three stacks tell the whole story of the bug.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'ThreadSanitizer report (two threads incrementing a shared counter)',
          code: `WARNING: ThreadSanitizer: data race (pid=4279)
  Read of size 4 at 0x5614fc186154 by thread T2:
    #0 hunt() race.cpp:8
  Previous write of size 4 at 0x5614fc186154 by thread T1:
    #0 hunt() race.cpp:8
  Location is global 'kills' of size 4 at 0x5614fc186154
SUMMARY: ThreadSanitizer: data race race.cpp:8 in hunt()`,
          annotations: [
            { lines: '2-5', text: 'Two threads touched the same 4 bytes, at least one was a write, and nothing synchronized them. You will learn exactly why that is a bug — and how to fix it — in the next unit.' },
            { lines: 6, text: 'TSan even names the variable involved.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why do sanitizers find bugs tests miss?',
          text: 'A normal test only notices a bug if it changes the output. Reading freed memory often returns the old value by luck, so the test passes. ASan marks every freed or out-of-bounds byte as poisoned and checks each access, so it reports the bug on the first bad read whether or not anything visibly broke. Likewise TSan reports unsynchronized accesses even when this run\'s timing happened to produce the right answer.',
        },
      ],
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'mcq',
      prompt: 'Your game\'s kill counter is sometimes slightly too low at the end of a match. Two worker threads update it. Which build is most likely to pinpoint the bug?',
      options: [
        {
          text: '`-fsanitize=address`',
          why: 'ASan looks for invalid memory: out-of-bounds and use-after-free. Two threads writing valid memory without synchronization is invisible to it.',
        },
        {
          text: '`-fsanitize=thread`',
          correct: true,
          why: 'TSan tracks which thread accessed which memory and whether those accesses were synchronized, reporting both threads\' stacks for the racing accesses.',
        },
        {
          text: '`-fsanitize=undefined`',
          why: 'UBSan checks arithmetic and similar rules within a thread. A data race is UB, but UBSan does not track cross-thread accesses.',
        },
        {
          text: 'A Release build with `-O3`',
          why: 'Optimization may make the bug more or less frequent, but it reports nothing. You would still be guessing.',
        },
      ],
      explanation:
        'Lost updates from unsynchronized threads are the textbook data race, and ThreadSanitizer exists for exactly that. Remember that TSan is incompatible with ASan, so keep separate sanitizer builds — many teams run their test suite under each one in CI.',
    },
    // ------------------------------------------------------------------ 17
    {
      kind: 'concept',
      title: 'Debugging Unreal C++ in Visual Studio',
      blocks: [
        {
          type: 'p',
          text: 'Everything in this lesson applies to Unreal, with one twist: your code lives in a module DLL loaded by the huge Unreal Editor process. The build configuration you pick decides how debuggable each part is.',
        },
        {
          type: 'table',
          headers: ['Configuration', 'Your game module', 'The engine', 'When to use'],
          rows: [
            ['**DebugGame Editor**', 'Unoptimized', 'Optimized', 'Stepping through *your* gameplay code — the best everyday debugging choice'],
            ['**Development Editor**', 'Optimized', 'Optimized', 'The default: fast, but locals often show as optimized away'],
            ['**Debug Editor**', 'Unoptimized', 'Unoptimized', 'Debugging inside the engine itself; very slow, and requires an engine built from source'],
          ],
        },
        {
          type: 'list',
          ordered: true,
          items: [
            'In Visual Studio, set your game project as the startup project and choose **DebugGame Editor** and **Win64** in the toolbar.',
            'Press **F5**. Visual Studio builds the module and launches the Unreal Editor with your project, already attached.',
            'Set breakpoints in your code and play in the editor (PIE). Execution pauses inside your C++ while the editor freezes.',
            'Alternatively, with the editor already running: **Debug → Attach to Process** and pick `UnrealEditor.exe`.',
          ],
        },
        {
          type: 'code',
          title: 'Enemy.cpp',
          code: `#include "Enemy.h"

UE_DISABLE_OPTIMIZATION
void AEnemy::TakeHit(float Amount) {
    Health -= Amount;   // every local is visible here,
    if (Health <= 0.f) {  // even in Development Editor
        Die();
    }
}
UE_ENABLE_OPTIMIZATION`,
          annotations: [
            { lines: 3, text: 'Turns optimization off for the code that follows (UE 5.2+; older versions used `PRAGMA_DISABLE_OPTIMIZATION`). Handy when only one function needs inspecting.' },
            { lines: 10, text: 'Always re-enable — and never commit these lines; they slow down every build of that file.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Practical tips',
          text: 'Install the **editor symbols for debugging** option in the Epic Games Launcher, or engine frames in your call stacks will show as raw addresses. Unreal\'s Natvis file makes `TArray`, `FString` and `FName` readable in the Watch window. And when an `ensure()` fails with a debugger attached, Visual Studio breaks right at the failing line — a free breakpoint on every broken assumption.',
        },
      ],
    },
    // ------------------------------------------------------------------ 18
    {
      kind: 'mcq',
      prompt: 'You are debugging your `AEnemy::TakeHit` in Unreal, but the Watch window shows most locals as "optimized away" and stepping jumps around. Which configuration should you switch to first?',
      options: [
        {
          text: 'Shipping',
          why: 'Shipping is the *most* optimized configuration and strips debugging aids — it would make things worse.',
        },
        {
          text: 'Debug Editor',
          why: 'It would work, but it unoptimizes the entire engine too, making the editor very slow — and it needs a source-built engine. Overkill for gameplay code.',
        },
        {
          text: 'DebugGame Editor',
          correct: true,
          why: 'It builds only your game module without optimization while keeping the engine fast — exactly right for stepping through your own code.',
        },
        {
          text: 'Development Editor with more breakpoints',
          why: 'More breakpoints do not bring back variables the optimizer removed. The problem is the optimization level, not the number of pauses.',
        },
      ],
      explanation:
        '"Optimized away" means the compiler kept the value in a register or eliminated it entirely, so the debug information has nowhere to point. DebugGame Editor compiles your module at the equivalent of `-O0` (every variable lives in memory, lines map 1:1) while the engine remains optimized, giving you debuggability where you need it and speed everywhere else.',
    },
  ],
  takeaways: [
    'Debug with a method: reproduce, hypothesize, test, fix the root cause, verify and protect with a test.',
    'Fix the first compiler error first; later errors are often cascades from the compiler\'s recovery.',
    'Debug symbols (`-g`, `/Zi` + `.pdb`) map machine code to source; they do not slow the program, but optimization makes debugging harder.',
    'Core debugger tools: breakpoints (including conditional and data breakpoints), step over/into/out, watches and the call stack.',
    'Print debugging shows history and works anywhere, but can hide timing bugs; use unbuffered `std::cerr` for crash-adjacent logs.',
    '`assert` documents and checks assumptions in Debug builds and vanishes with `NDEBUG` — never put side effects inside it.',
    'ASan finds memory errors, UBSan finds undefined arithmetic and similar UB, TSan finds data races; read reports as what / where / who freed / who allocated.',
    'For Unreal gameplay code, debug in DebugGame Editor from Visual Studio, or attach to `UnrealEditor.exe`.',
  ],
  reading: [
    {
      title: 'Using an integrated debugger: Stepping',
      url: 'https://www.learncpp.com/cpp-tutorial/using-an-integrated-debugger-stepping/',
      source: 'learncpp',
      note: 'The first of several hands-on chapters on breakpoints, watches and the call stack in common IDEs.',
    },
    {
      title: 'First look at the Visual Studio Debugger',
      url: 'https://learn.microsoft.com/en-us/visualstudio/debugger/debugger-feature-tour',
      source: 'other',
      note: 'A tour of breakpoints, data tips, the Watch and Call Stack windows and more.',
    },
    {
      title: 'GDB to LLDB command map',
      url: 'https://lldb.llvm.org/use/map.html',
      source: 'other',
      note: 'Side-by-side equivalents for every common gdb and lldb command.',
    },
    {
      title: 'AddressSanitizer',
      url: 'https://clang.llvm.org/docs/AddressSanitizer.html',
      source: 'other',
      note: 'What ASan detects, its overhead, and options for tuning reports.',
    },
    {
      title: 'assert',
      url: 'https://en.cppreference.com/w/cpp/error/assert',
      source: 'cppreference',
      note: 'The exact behaviour of `assert` and its interaction with `NDEBUG`.',
    },
  ],
};
