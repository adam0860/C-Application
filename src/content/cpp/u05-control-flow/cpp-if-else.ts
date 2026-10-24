import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-if-else',
  title: 'Making Decisions with if / else',
  summary: 'Branching with if, else if and else: why braces matter, what counts as true, if with an initializer, the dangling else, guard clauses, and the conditional operator.',
  minutes: 17,
  objectives: [
    'Write `if`, `else if` and `else` chains and order their conditions correctly',
    'Explain why braces should always be used and spot the empty-statement and dangling-else bugs',
    'Predict how integers, floating-point values, pointers and streams convert to `bool` in a condition',
    'Use C++17 `if` with an initializer to limit a variable\'s scope',
    'Flatten nested conditions into guard clauses with early `return`',
    'Choose between `if`/`else` and the conditional operator `?:`',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'if: run code only when it should',
      blocks: [
        {
          type: 'p',
          text: 'So far every program has run its statements top to bottom, every time. Real programs react: they heal the player only when health is low, open the door only with the right key. Changing which statements run is called [[control-flow]], and the most fundamental tool for it is the [[if-statement]].',
        },
        {
          type: 'code',
          title: 'potion.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int hp = 35;
    int maxHp = 100;

    if (hp < maxHp / 2) {
        std::cout << "Low health! Drinking a potion.\\n";
        hp += 40;
    } else {
        std::cout << "Health is fine.\\n";
    }
    std::cout << "HP: " << hp << '\\n';
}`,
          output: `Low health! Drinking a potion.
HP: 75`,
          annotations: [
            { lines: 7, text: 'The condition goes in parentheses. It is evaluated once; if it is `true`, the block that follows runs.' },
            { lines: '8-9', text: 'The **block**: any number of statements between braces. Variables declared inside a block exist only inside it.' },
            { lines: '10-12', text: '`else` is optional. Its block runs when the condition was `false`. Exactly one of the two blocks runs, never both.' },
            { lines: 13, text: 'After the `if`/`else`, execution continues normally, whichever branch ran.' },
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'Evaluate the condition', text: '`hp < maxHp / 2` is `35 < 50`, which is `true`.' },
            { title: 'Pick a branch', text: 'True: run the `if` block. False: run the `else` block if there is one, or skip ahead.' },
            { title: 'Continue after the statement', text: 'Both paths rejoin at the line after the closing brace.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why parentheses around the condition?',
          text: 'C++ grammar needs to know where the condition ends and the statement begins. Without parentheses, `if x - 1 < y ...` would be ambiguous in many cases. Other languages solve this with a keyword (`then`) or a colon; C++, following C, uses mandatory parentheses, which also leaves the statement itself free to be a single line or a whole block.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'else if chains: first match wins',
      blocks: [
        {
          type: 'p',
          text: 'To choose between more than two options, chain conditions with `else if`. C++ tests them **from the top**, runs the block of the **first** condition that is true, and skips the rest. The optional final `else` catches everything that matched nothing.',
        },
        {
          type: 'code',
          title: 'rank.cpp',
          runnable: true,
          stdin: '8450\n',
          code: `#include <iostream>

int main() {
    int score = 0;
    std::cout << "Final score: ";
    std::cin >> score;

    if (score >= 10000) {
        std::cout << "Rank: S\\n";
    } else if (score >= 7500) {
        std::cout << "Rank: A\\n";
    } else if (score >= 5000) {
        std::cout << "Rank: B\\n";
    } else {
        std::cout << "Rank: C\\n";
    }
}`,
          output: 'Final score: Rank: A',
          annotations: [
            { lines: 8, text: 'With input 8450, this is false, so the next condition is tried.' },
            { lines: 10, text: 'True: "Rank: A" is printed and the remaining conditions are **not evaluated at all**. We do not need `score < 10000 && score >= 7500` because reaching this line already implies `score < 10000`.' },
            { lines: '14-16', text: 'The final `else` handles every score below 5000.' },
          ],
        },
        {
          type: 'p',
          text: 'There is no `elseif` keyword in C++. `else if (…) { … }` is simply an `else` whose statement happens to be another `if`. That is also why **order matters**: put the most restrictive conditions first. Reverse the chain and every score of 5000 or more stops at the first test.',
        },
        {
          type: 'compare',
          left: {
            title: 'Wrong order',
            tone: 'bad',
            code: `if (score >= 5000) {
    rank = 'B';
} else if (score >= 7500) {
    rank = 'A';   // unreachable
} else if (score >= 10000) {
    rank = 'S';   // unreachable
}`,
            text: '12000 points gives rank B: the first true condition wins.',
          },
          right: {
            title: 'Most restrictive first',
            tone: 'good',
            code: `if (score >= 10000) {
    rank = 'S';
} else if (score >= 7500) {
    rank = 'A';
} else if (score >= 5000) {
    rank = 'B';
}`,
            text: 'Each test only sees scores that every earlier test rejected.',
          },
        },
        {
          type: 'deepdive',
          title: 'What the CPU does with an if: branches and prediction',
          blocks: [
            {
              type: 'p',
              text: 'An `if` compiles to a comparison followed by a **conditional jump**: "if the result was false, jump past this block". Modern CPUs work on many instructions at once in a pipeline, so they cannot wait to find out which way a jump goes. They **predict**, based on what that jump did recently, and start executing the predicted path. A wrong guess throws the work away, costing roughly 15–20 cycles.',
            },
            {
              type: 'p',
              text: 'Predictable branches (almost always true, or alternating in a pattern) are nearly free. Random ones, such as testing randomly ordered data, can dominate a hot loop. C++20 lets you hint which path is common with the `likely` and `unlikely` [[attribute|attributes]], written in double square brackets after the condition. Measure first, though: compilers and CPUs usually guess well without help.',
            },
            {
              type: 'code',
              code: `if (hp <= 0) [[unlikely]] {
    // rare: handle the player's death
} else {
    // common case: keep playing
}`,
              annotations: [
                { lines: 1, text: 'A hint for the optimizer to lay out the common path first. It never changes what the program does, only how fast each path may be.' },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'order',
      prompt: 'Armor reduces damage: at 100+ armor damage is quartered, at 50+ it is halved, and any armor above 0 subtracts 5. Each tier must apply only its own reduction. Order the lines.',
      lines: [
        'if (armor >= 100) {',
        '    damage /= 4;',
        '} else if (armor >= 50) {',
        '    damage /= 2;',
        '} else if (armor > 0) {',
        '    damage -= 5;',
        '}',
      ],
      explanation:
        'In an `else if` chain only the first true condition runs, so the most restrictive test (`armor >= 100`) must come first. If `armor > 0` were tested first, every armored character, even one with 150 armor, would only get the 5-point reduction. Each body line must sit right after its own condition.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Braces: always use them',
      blocks: [
        {
          type: 'p',
          text: 'The braces are optional when a branch contains exactly one statement: `if (hp <= 0) gameOver = true;` is valid C++. But the `if` controls **only that one statement**, no matter how the following lines are indented. Indentation means nothing to the compiler.',
        },
        {
          type: 'compare',
          left: {
            title: 'Looks right, is wrong',
            tone: 'bad',
            code: `if (hp <= 0)
    std::cout << "You died\\n";
    lives -= 1;   // ALWAYS runs`,
            text: 'Only the first line belongs to the `if`. The player loses a life on every call, dead or not.',
          },
          right: {
            title: 'Unambiguous',
            tone: 'good',
            code: `if (hp <= 0) {
    std::cout << "You died\\n";
    lives -= 1;
}`,
            text: 'With braces, adding a second line later can never silently escape the condition.',
          },
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Apple\'s "goto fail" bug',
          text: 'In 2014 Apple shipped an SSL/TLS bug (CVE-2014-1266) caused by exactly this pattern. A line `goto fail;` was accidentally duplicated under an `if` without braces. The second copy was not controlled by the `if` and always ran, jumping past a crucial signature check — so an attacker could impersonate a secure server (a man-in-the-middle attack). One brace-less `if` undermined secure connections on millions of iPhones and Macs.',
        },
        {
          type: 'p',
          text: 'A related trap is a stray semicolon: `if (hp <= 0);` ends the `if` right there with an **empty statement**. The block on the next line is then just an ordinary block that always runs. With `-Wall -Wextra`, GCC warns about both problems (`-Wmisleading-indentation` and `-Wempty-body`).',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does C++ allow brace-less branches at all?',
          text: 'In the grammar, a pair of braces is itself a single statement (a *compound statement*). So `if` is defined as controlling one statement, and a block is just the most common kind of statement to put there. The rule is simple and consistent, inherited from C. Most style guides — including Epic\'s Unreal Engine coding standard — require braces anyway, because the cost is two characters and the benefit is immunity to a whole class of bugs.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'bug',
      prompt: 'The player has 50 HP, yet the game prints `You died`. Tap the line that causes it.',
      code: `#include <iostream>

int main() {
    int hp = 50;
    if (hp <= 0);
    {
        std::cout << "You died\\n";
    }
    std::cout << "HP: " << hp << '\\n';
}`,
      bugLines: [5],
      hint: 'Look very closely at the end of the `if` line.',
      explanation:
        'The `;` after the condition is an empty statement, and that empty statement is what the `if` controls. The block on lines 6–8 is not part of the `if` at all, so it runs every time. Remove the semicolon. GCC warns *suggest braces around empty body in an \'if\' statement* with `-Wextra`.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'What counts as true?',
      blocks: [
        {
          type: 'p',
          text: 'The condition does not have to be a `bool`. Any value that can be **contextually converted** to `bool` is accepted, using these rules:',
        },
        {
          type: 'table',
          headers: ['Condition type', 'false when…', 'true when…'],
          rows: [
            ['`bool`', '`false`', '`true`'],
            ['integers (`int`, `char`, …)', 'zero', 'any non-zero value, including negatives'],
            ['floating point', '`0.0` (or `-0.0`)', 'any other value — **including NaN**'],
            ['pointers', '`nullptr`', 'pointing at something'],
            ['streams (`std::cin`)', 'the last operation failed', 'everything is OK'],
            ['`std::string`', '— does not compile —', 'use `!s.empty()`'],
          ],
        },
        {
          type: 'code',
          title: 'truthiness.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

int main() {
    int ammo = 0;
    double speed = 0.5;
    std::string name;

    if (ammo) {
        std::cout << "Fire!\\n";
    } else {
        std::cout << "Click. Out of ammo.\\n";
    }
    if (speed) {
        std::cout << "Moving\\n";
    }
    if (name.empty()) {
        std::cout << "Enter a name\\n";
    }
}`,
          output: `Click. Out of ammo.
Moving
Enter a name`,
          annotations: [
            { lines: 9, text: '`ammo` is 0, so the condition is false. This is shorthand for `ammo != 0`.' },
            { lines: 14, text: 'Legal, but fragile: floating-point values rarely land on exactly 0.0, so "is it zero?" checks on floats deserve a tolerance (previous unit).' },
            { lines: 17, text: '`if (name)` would not compile: `std::string` deliberately has no conversion to `bool`, because it would be unclear what it means. Ask the question you mean.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Style: say what you mean',
          text: 'For pointers and `bool`s, the short form is idiomatic: `if (target)`, `if (isAlive)`. For numbers, an explicit comparison is clearer: `if (ammo > 0)` tells the reader that negative ammo is not expected; `if (ammo)` does not. And never write `if (isAlive == true)`: it is redundant, and with non-`bool` types it can even be wrong (`2 == true` is false).',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'In Unreal Engine',
          text: 'Pointer truthiness is everywhere in Unreal code: `if (OwnerCharacter) { … }`. For `UObject` pointers prefer `if (IsValid(OwnerCharacter))`, which also returns false for objects that are being destroyed but whose memory has not been reclaimed yet.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: 'If `speed` is a `double` holding NaN, then `if (speed) { … }` skips the block, because NaN is "not a number".',
      answer: false,
      explanation:
        'A floating-point value converts to `false` only when it compares equal to zero. NaN compares unequal to everything, including zero, so it converts to `true` and the block runs. That is one more way NaN slips through game logic unnoticed; test for it explicitly with `std::isnan`.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'if with an initializer (C++17)',
      blocks: [
        {
          type: 'p',
          text: 'Often you compute a value only to test it: find a character, look something up, call a function. C++17 lets you declare that variable **inside** the `if`, before the condition, separated by a semicolon: `if (init; condition)`. The variable exists in the condition, the `if` block and any `else` blocks — and nowhere else.',
        },
        {
          type: 'code',
          title: 'parse_command.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string>

int main() {
    std::string command = "give sword";

    if (auto space = command.find(' '); space != std::string::npos) {
        std::cout << "verb: " << command.substr(0, space) << '\\n';
        std::cout << "item: " << command.substr(space + 1) << '\\n';
    } else {
        std::cout << "verb only: " << command << '\\n';
    }
    // space does not exist here
}`,
          output: `verb: give
item: sword`,
          annotations: [
            { lines: 7, text: 'First the initializer runs (`auto space = command.find(\' \')`), then the condition after the `;` is tested.' },
            { lines: 10, text: '`space` is still in scope in the `else` branch, which is useful when the failure path needs the value too.' },
            { lines: 13, text: 'Using `space` here would be a compile error. It cannot be misused later, and the name is free to reuse.' },
          ],
        },
        {
          type: 'p',
          text: 'An older form, still common, declares the variable **as** the condition: `if (int found = countEnemies()) { … }`. The condition is then the variable converted to `bool`. The C++17 form is more flexible because the test can be anything, not just "is it non-zero".',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does narrow scope matter?',
          text: 'Every variable that stays alive longer than needed is one more name a reader has to track and one more chance to use a stale value by accident. Without the initializer you would declare `space` before the `if`, and it would linger for the rest of the function. Keeping it inside the `if` documents that it only matters for this decision.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'An Unreal staple',
          text: 'You will see the declaration-as-condition form constantly in Unreal code: `if (APlayerController* PC = Cast<APlayerController>(GetController())) { … }`. `Cast` returns a null pointer when the object is not of that type, so the block runs only with a valid, correctly typed `PC` — and `PC` cannot be used outside it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'fill',
      prompt: 'Complete the C++17 `if` with an initializer so that `pos` is only in scope inside the `if`/`else`, and the block runs only when `=` was found.',
      template: `if (auto pos = line.find('=')___ pos ___ std::string::npos) {
    value = line.substr(pos + 1);
}`,
      blanks: [{ answers: [';'] }, { answers: ['!='] }],
      wordBank: [';', ',', ':', '!=', '==', '&&'],
      explanation:
        'A semicolon separates the initializer from the condition, just like the parts of a `for` loop header (next lessons). The block should run when the position is **not** `npos`. A comma would be parsed as part of the declaration and fail to compile, and `==` would run the block exactly when the `=` is missing.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'The dangling else',
      blocks: [
        {
          type: 'p',
          text: 'When `if` statements are nested without braces, which `if` does an `else` belong to? This is the [[dangling-else]] problem, and C++\'s rule is: an `else` pairs with the **nearest preceding `if` that does not already have an `else`**. Indentation is ignored, so code can say one thing to the reader and another to the compiler.',
        },
        {
          type: 'code',
          code: `if (hp > 50)
    if (hasShield)
        std::cout << "Fully protected\\n";
else
    std::cout << "Low health\\n";`,
          annotations: [
            { lines: '4-5', text: 'Indented as if it belonged to `if (hp > 50)`, but it pairs with the nearest `if`, the inner `if (hasShield)`. So a healthy player without a shield is told "Low health", and a player with low health is told nothing.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'else for the inner if',
            tone: 'neutral',
            code: `if (hp > 50) {
    if (hasShield) {
        std::cout << "Fully protected\\n";
    } else {
        std::cout << "No shield\\n";
    }
}`,
          },
          right: {
            title: 'else for the outer if',
            tone: 'neutral',
            code: `if (hp > 50) {
    if (hasShield) {
        std::cout << "Fully protected\\n";
    }
} else {
    std::cout << "Low health\\n";
}`,
          },
        },
        {
          type: 'p',
          text: 'Braces make either meaning explicit. GCC warns about the ambiguous version with `-Wall` (*suggest explicit braces to avoid ambiguous \'else\'*) — yet another reason the "always use braces" rule exists.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why "nearest if"?',
          text: 'The grammar of `if`/`else` is genuinely ambiguous when braces are left out — it is a textbook problem in language design. Every C-family language resolves it the same way, binding the `else` to the innermost `if`, because that is what a simple parser does naturally. The rule is consistent; the danger is only that humans read indentation instead.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: 'What does this print?',
      code: `int hp = 80;
bool hasShield = false;
if (hp > 50)
    if (hasShield)
        std::cout << "Fully protected\\n";
else
    std::cout << "Low health\\n";`,
      options: [
        { text: 'Nothing', why: 'That would be true if the `else` belonged to `if (hp > 50)`, as the indentation suggests. It does not.' },
        { text: '`Fully protected`', why: '`hasShield` is `false`, so the inner `if` body does not run.' },
        { text: '`Low health`', correct: true, why: 'The `else` belongs to the nearest `if`, which is `if (hasShield)`. `hp > 50` is true, `hasShield` is false, so the inner `else` runs — printing a misleading message for a healthy player.' },
        { text: 'It does not compile', why: 'It compiles (GCC only warns about the ambiguous `else`). The language rule decides the pairing.' },
      ],
      explanation:
        'An `else` always attaches to the closest unmatched `if`. The indentation here is a lie: the compiler reads it as `if (hp > 50) { if (hasShield) … else … }`. Braces would have made the intended structure explicit and the bug impossible.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Guard clauses: flatten the nesting',
      blocks: [
        {
          type: 'p',
          text: 'When an action requires several conditions, it is tempting to nest one `if` inside another. Three or four levels later the real work is buried at the far right of the screen, and each `else` is far from its `if` — so-called **arrow code**. The fix is the [[guard-clause|guard clause]]: test each reason *not* to proceed first, handle it, and leave immediately with `return`.',
        },
        {
          type: 'p',
          text: 'You have used `return` only at the end of `main`, but it can appear anywhere: it ends the current [[function]] at once. Below, `castFireball` is a small function (Unit 6 covers functions in detail) that takes three values and returns a message.',
        },
        {
          type: 'compare',
          left: {
            title: 'Nested: the happy path is buried',
            tone: 'bad',
            code: `if (alive) {
    if (!silenced) {
        if (mana >= 30) {
            return "Fireball!";
        } else {
            return "Not enough mana.";
        }
    } else {
        return "You are silenced!";
    }
} else {
    return "Dead players can't cast.";
}`,
          },
          right: {
            title: 'Guard clauses: flat and readable',
            tone: 'good',
            code: `if (!alive) {
    return "Dead players can't cast.";
}
if (silenced) {
    return "You are silenced!";
}
if (mana < 30) {
    return "Not enough mana.";
}
return "Fireball!";`,
          },
        },
        {
          type: 'code',
          title: 'fireball.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string_view>

std::string_view castFireball(bool alive, bool silenced, int mana) {
    if (!alive) {
        return "Dead players can't cast.";
    }
    if (silenced) {
        return "You are silenced!";
    }
    if (mana < 30) {
        return "Not enough mana.";
    }
    return "Fireball!";
}

int main() {
    std::cout << castFireball(true, false, 50) << '\\n';
    std::cout << castFireball(true, true, 50) << '\\n';
    std::cout << castFireball(true, false, 10) << '\\n';
}`,
          output: `Fireball!
You are silenced!
Not enough mana.`,
          annotations: [
            { lines: 4, text: 'The function returns a `std::string_view`. Viewing string literals is safe because literals live for the whole program — no dangling.' },
            { lines: '5-13', text: 'Each guard inverts one requirement and exits early. Once past a guard, you know that condition holds, so it never needs re-checking.' },
            { lines: 14, text: 'The happy path sits at the end, at the lowest indentation level, where it is easiest to read and extend.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why guard clauses read better',
          text: 'Each guard deals with one problem completely and then gets it out of the way, so the reader never has to remember a stack of open conditions. Adding a new requirement means adding one more guard, not re-indenting everything. De Morgan\'s laws from the previous unit help with the inversion: "proceed if alive and not silenced" becomes two guards, "stop if not alive" and "stop if silenced".',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Early returns in Unreal',
          text: 'Unreal gameplay code is full of guard clauses at the top of functions: `if (!IsValid(Target)) { return; }`, `if (!HasAuthority()) { return; }` (only the server may change this), `if (bIsDead) { return; }`. They make each function\'s preconditions obvious at a glance.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'A function\'s entire body is wrapped in `if (isAlive) { … }`. Which guard clause lets you remove that wrapper and un-indent the body?',
      codeOptions: true,
      options: [
        { text: 'if (isAlive) { return; }', why: 'This leaves exactly when the body *should* run. A guard must test the opposite of the original condition.' },
        { text: 'if (!isAlive) { return; }', correct: true, why: 'Invert the condition and exit early. Everything after this line only runs for living characters, just like the original wrapper.' },
        { text: 'if (!isAlive) { continue; }', why: '`continue` only works inside loops (next lessons). In an ordinary function body it does not compile.' },
        { text: 'if (!isAlive) { break; }', why: '`break` only exits loops and `switch` statements. It cannot leave a function.' },
      ],
      explanation:
        'A guard clause is the inverse of the wrapping condition, followed by an early exit. "Do the work only if alive" becomes "if not alive, leave now". In a function returning a value, the guard returns a value too (as in `castFireball`); in a `void` function it is a plain `return;`.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'The conditional operator ?:',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes you do not want to choose between two *actions* but between two *values*. The [[ternary-operator|conditional operator]] `condition ? a : b` is an **expression**: it evaluates the condition and then evaluates and yields either `a` (if true) or `b` (if false). It is C++\'s only operator with three operands, hence the nickname "the ternary operator".',
        },
        {
          type: 'code',
          title: 'ternary.cpp',
          runnable: true,
          code: `#include <iostream>
#include <string_view>

int main() {
    int hp = 0;
    int kills = 1;

    std::string_view status = hp > 0 ? "alive" : "defeated";
    std::cout << "Player is " << status << '\\n';
    std::cout << kills << (kills == 1 ? " kill" : " kills") << '\\n';

    int damage = 30;
    bool crit = true;
    const int dealt = crit ? damage * 2 : damage;
    std::cout << "Dealt " << dealt << '\\n';
}`,
          output: `Player is defeated
1 kill
Dealt 60`,
          annotations: [
            { lines: 8, text: 'Choosing a value to initialize a variable — the classic use. Only the chosen operand is evaluated.' },
            { lines: 10, text: 'Inside a stream chain the parentheses are **mandatory**: `?:` has very low precedence, so without them `<<` would grab `kills == 1` first.' },
            { lines: 14, text: 'Because `?:` is an expression, it can initialize a `const` variable. With `if`/`else` you would have to declare `dealt` without `const` first and assign it in each branch.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Keep it to one level',
          text: 'Nested ternaries like `a ? b : c ? d : e` are legal (they group to the right) but quickly become unreadable. If you need more than two outcomes, use `if`/`else if`. Both operands should also have the same or compatible types, because the whole expression has a single type.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have both if and ?:?',
          text: '`if` is a **statement**: it controls which code runs, and produces no value. `?:` is an **expression**: it produces a value, so it can appear where only expressions are allowed — in an initializer, a function argument, a `return`, a `<<` chain. Use `?:` for a quick choice between two values and `if` for anything with side effects or more than one line.',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'Which line correctly prints `kill` when `kills` is 1 and `kills` otherwise?',
      codeOptions: true,
      options: [
        { text: 'std::cout << kills == 1 ? "kill" : "kills";', why: '`<<` binds tighter than `==`, so this starts as `(std::cout << kills) == 1`, comparing a stream with an integer. It does not compile.' },
        { text: 'std::cout << (kills == 1) ? "kill" : "kills";', why: 'This compiles, but the parentheses are in the wrong place: it prints `1` or `0`, and the ternary\'s result is thrown away. GCC warns that its operands have no effect.' },
        { text: 'std::cout << if (kills == 1) "kill" else "kills";', why: '`if` is a statement, not an expression, so it cannot appear inside a `<<` chain.' },
        { text: 'std::cout << (kills == 1 ? "kill" : "kills");', correct: true, why: 'The whole conditional expression is parenthesised, so it is evaluated first and its result is inserted into the stream.' },
      ],
      explanation:
        'The conditional operator sits near the bottom of the precedence table, below `<<`, so it must be wrapped **as a whole** in parentheses when used inside an output chain. Parenthesising only the condition is a sneaky variant of the bug: it compiles, prints the `bool`, and discards the text.',
    },
  ],
  takeaways: [
    '`if` runs its statement only when the condition is true; `else if` chains test from the top and stop at the first true condition, so put the most restrictive tests first.',
    'Always use braces: without them an `if` controls only one statement, and a stray `;` after the condition creates an empty body.',
    'Conditions convert to `bool`: zero, `0.0` and `nullptr` are false; everything else — including negative numbers and NaN — is true. `std::string` does not convert; use `empty()`.',
    'C++17 `if (init; condition)` keeps a helper variable\'s scope limited to the `if` and its `else` branches.',
    'An `else` binds to the nearest unmatched `if`, regardless of indentation.',
    'Guard clauses (invert the condition, return early) keep the happy path flat and readable.',
    '`?:` is an expression that chooses between two values; parenthesise it inside `<<` chains and avoid nesting it.',
  ],
  reading: [
    {
      title: 'if statement',
      url: 'https://en.cppreference.com/w/cpp/language/if',
      source: 'cppreference',
      note: 'The full grammar, including `if` with an initializer, `if constexpr` and the `likely`/`unlikely` attributes.',
    },
    {
      title: 'If statements and blocks',
      url: 'https://www.learncpp.com/cpp-tutorial/if-statements-and-blocks/',
      source: 'learncpp',
      note: 'A friendly explanation of blocks and why braces are recommended even for single statements.',
    },
    {
      title: 'Common if statement problems',
      url: 'https://www.learncpp.com/cpp-tutorial/common-if-statement-problems/',
      source: 'learncpp',
      note: 'Dangling else, null statements and other pitfalls, each with a fix.',
    },
    {
      title: 'The conditional operator',
      url: 'https://www.learncpp.com/cpp-tutorial/the-conditional-operator/',
      source: 'learncpp',
      note: 'When `?:` is the better choice and how its precedence trips people up.',
    },
    {
      title: 'Epic C++ Coding Standard',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine',
      source: 'unreal-docs',
      note: 'Unreal\'s formatting rules, including braces on every branch.',
    },
  ],
};
