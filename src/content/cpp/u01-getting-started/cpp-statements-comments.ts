import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-statements-comments',
  title: 'Statements, Comments and Whitespace',
  summary: 'The grammar of a C++ program: statements, expressions, blocks, comments that earn their place, and names that read well.',
  minutes: 16,
  objectives: [
    'Distinguish a statement from an expression and explain why statements end with a semicolon',
    'Group statements into blocks and describe what a block does to the names declared inside it',
    'Explain what "whitespace-insensitive" means, including where whitespace does matter',
    'Write single-line, multi-line and documentation comments that explain *why*, not *what*',
    'Apply the rules for valid identifiers and recognize keywords and reserved names',
    'Choose clear, conventional names for variables, functions and types',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Statements: the sentences of C++',
      blocks: [
        {
          type: 'p',
          text: 'A C++ function body is a sequence of [[statement|statements]]. A statement is one complete instruction — "create this variable", "print this", "return this value" — and, unless told otherwise, they run one after another, top to bottom. Most statements end with a semicolon.',
        },
        {
          type: 'code',
          title: 'statements.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int score = 0;
    score = score + 250;
    std::cout << "Score: " << score << '\\n';
    return 0;
}`,
          output: 'Score: 250',
          annotations: [
            { lines: 4, text: 'A **declaration statement**: creates a [[variable]] called `score` that holds a whole number (`int`), starting at `0`. Unit 2 explains variables in depth.' },
            { lines: 5, text: 'An **expression statement**: compute `score + 250` and store the result back into `score`.' },
            { lines: 6, text: 'Another expression statement — the `<<` chain you met in Hello World.' },
            { lines: 7, text: 'A **return statement**: ends `main` and reports success.' },
          ],
        },
        {
          type: 'table',
          headers: ['Kind of statement', 'Example', 'Covered in'],
          rows: [
            ['Declaration', '`int lives = 3;`', 'Unit 2'],
            ['Expression statement', '`lives = lives - 1;`', 'This lesson, Unit 3'],
            ['Compound statement (block)', '`{ ... }`', 'This lesson'],
            ['Selection', '`if`, `switch`', 'Unit 5'],
            ['Iteration', '`for`, `while`', 'Unit 5'],
            ['Jump', '`return`, `break`, `continue`', 'Units 5–6'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the semicolon?',
          text: 'C++ ignores line breaks, so the compiler cannot use the end of a line to know where a statement ends. The semicolon is an explicit terminator. That freedom lets you split a long statement across several lines or (rarely) put two short ones on one line. Languages that end statements at line breaks, like Python, trade this freedom for less punctuation; JavaScript tries to guess where semicolons go, which causes its own famous bugs.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Expressions: things that produce a value',
      blocks: [
        {
          type: 'p',
          text: 'An [[expression]] is a piece of code that the program **evaluates** to produce a value. It can be as small as a single [[literal]] like `42`, or a combination of values, variables, [[operator|operators]] and function calls. The values an operator works on are its [[operand|operands]].',
        },
        {
          type: 'table',
          headers: ['Expression', 'Value it produces'],
          rows: [
            ['`250`', 'The number 250 (a literal)'],
            ['`score`', 'Whatever `score` currently holds'],
            ['`score + 250`', 'The sum — `score` itself is unchanged'],
            ['`score = 500`', 'Stores 500 in `score`; the expression\'s value is `score` itself'],
            ['`std::cout << "hi"`', 'Prints, and produces `std::cout` itself — which is why `<<` can be chained'],
          ],
        },
        {
          type: 'p',
          text: 'Expressions can also have **side effects**: changes to the world beyond producing a value, such as storing into a variable or printing text. An **expression statement** is simply an expression followed by `;`. The program evaluates it, keeps any side effects, and throws the resulting value away.',
        },
        {
          type: 'compare',
          left: {
            title: 'Expression',
            tone: 'neutral',
            code: 'score + 250',
            text: 'Computes something. Can be used inside other code: `std::cout << score + 250;`',
          },
          right: {
            title: 'Statement',
            tone: 'neutral',
            code: 'score = score + 250;',
            text: 'Does something. Stands on its own as a step in the program.',
          },
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'A useful mental model',
          text: 'Expressions are the *phrases* that produce values; statements are the *sentences* that put those phrases to work. Unit 3 explores operators and expressions in detail.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does line 5 do, and what does the program print?',
      code: `#include <iostream>

int main() {
    int health = 100;
    health - 10;
    std::cout << health << '\\n';
}`,
      options: [
        {
          text: 'It subtracts 10 from `health`, so the program prints `90`',
          why: 'Nothing stores the result. `health - 10` computes 90 and then discards it; `health` itself never changes.',
        },
        {
          text: 'It causes a compile error, because an expression on its own is not a valid statement',
          why: 'Any expression followed by `;` is a valid expression statement, even a useless one.',
        },
        {
          text: 'It computes `90` and throws the value away, so the program prints `100`',
          correct: true,
          why: 'Right. `health - 10;` is a legal expression statement with no side effect, so `health` stays 100. GCC and Clang warn "statement has no effect" when warnings are on.',
        },
        {
          text: 'It compiles, but the program crashes because the result of the subtraction is never used',
          why: 'Discarding a value is perfectly safe — every expression statement discards its value. It is pointless here, not dangerous.',
        },
      ],
      explanation:
        '`health - 10;` evaluates an expression and throws the value away. To change `health` you need an assignment: `health = health - 10;`. With `-Wall`, GCC reports `warning: statement has no effect` for this line — one of many reasons to always build with warnings on.',
    },
    {
      kind: 'concept',
      title: 'Blocks: grouping statements',
      blocks: [
        {
          type: 'p',
          text: 'A **block** (formally a *compound statement*) is a pair of braces containing zero or more statements. Wherever C++ expects a single statement, you can put a block, and its contents run in order. You have already used one: the body of `main` is a block.',
        },
        {
          type: 'code',
          title: 'blocks.cpp',
          runnable: true,
          code: `#include <iostream>

int main() {
    int score = 100;
    {
        int bonus = 50;
        std::cout << score + bonus << '\\n';
    }
    std::cout << score << '\\n';
}`,
          output: '150\n100',
          annotations: [
            { lines: 3, text: 'The outer block: the body of `main`.' },
            { lines: '5-8', text: 'A nested block. It groups two statements and creates its own [[scope]].' },
            { lines: 6, text: '`bonus` exists only from here until the closing brace on line 8. Using `bonus` after line 8 is a compile error: "not declared in this scope".' },
            { lines: 7, text: 'Inner blocks can see names from the blocks around them, so `score` is available here.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why blocks limit names',
          text: 'Keeping a name visible only where it is needed means less to keep in your head, no accidental reuse of a stale value, and the freedom to reuse short names like `i` in different places. It also tells the compiler exactly when a variable\'s storage can be reused. Unit 6 covers scope and lifetime fully; for now, remember that a name declared inside braces disappears at the closing brace.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'No semicolon after a block',
          text: 'A block ends at its `}`; it does not need a `;`. A stray `;` after it is an *empty statement*, which does nothing and is usually harmless. (Later you will meet class definitions, which *do* require `};` — a classic source of confusing errors.)',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Whitespace and formatting',
      blocks: [
        {
          type: 'p',
          text: 'C++ is **whitespace-insensitive**: spaces, tabs and line breaks between tokens are interchangeable, and any amount counts the same as one. The compiler splits your code into *tokens* — names, numbers, operators, punctuation — and only the tokens matter. These two programs are identical to the compiler:',
        },
        {
          type: 'compare',
          left: {
            title: 'Legal, but cruel',
            tone: 'bad',
            code: `int main(){int lives=3;lives=lives-1;
std::cout<<lives
<<'\\n';}`,
          },
          right: {
            title: 'Formatted for humans',
            tone: 'good',
            code: `int main() {
    int lives = 3;
    lives = lives - 1;
    std::cout << lives << '\\n';
}`,
          },
        },
        {
          type: 'p',
          text: 'Whitespace *does* matter in a few places:',
        },
        {
          type: 'list',
          items: [
            'Inside string literals: `"Game Over"` and `"GameOver"` are different text.',
            'Between tokens that would otherwise merge: `int lives` is not `intlives`.',
            'Inside a token: `re turn` is two unknown names, not `return`.',
            'Preprocessor directives such as `#include` end at the line break, and `//` comments run to the end of the line.',
          ],
        },
        {
          type: 'heading',
          text: 'Conventions',
        },
        {
          type: 'p',
          text: 'Because the compiler does not care, teams agree on a style: indent each nested block by one level, one statement per line, spaces around operators, and a consistent brace placement. This course indents with 4 spaces and puts opening braces on the same line. Tools such as **clang-format** apply a style automatically, which ends debates and keeps diffs clean.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal\'s style',
          text: 'Epic\'s coding standard puts opening braces on **their own line** and indents with tabs. Neither is better; what matters is consistency within a code base. When you work in Unreal, follow Epic\'s style so your code reads like the engine around it.',
        },
        {
          type: 'deepdive',
          title: 'Splitting long text across lines',
          blocks: [
            {
              type: 'p',
              text: 'Two string literals separated only by whitespace are joined into one at compile time. That lets you split long text without any run-time cost:',
            },
            {
              type: 'code',
              code: `std::cout << "Welcome to the arena. "
             "Defeat three waves to win.\\n";`,
              annotations: [
                { lines: '1-2', text: 'The compiler glues these into a single literal, `"Welcome to the arena. Defeat three waves to win.\\n"`. There is no `<<` between them.' },
              ],
            },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'How many statements are inside the body of `main`?',
      code: `int main() {
    int gold = 10; int gems = 2;
    std::cout << gold
              << ' '
              << gems << '\\n';
    return 0;
}`,
      options: [
        { text: '3', why: 'Line 2 holds two statements, not one — each `;` ends a separate declaration.' },
        { text: '4', correct: true, why: 'Two declarations on line 2, one output statement spread over lines 3–5, and the `return`. Statements are counted by their terminators, not by lines.' },
        { text: '5', why: 'Lines 3–5 are a single statement: there is only one `;`, at the end of line 5.' },
        { text: '7', why: 'That is the number of lines in the snippet. Line breaks are just whitespace to the compiler.' },
      ],
      explanation:
        'The compiler sees tokens, not lines: a statement ends at its `;`, however many lines it spans, and one line can hold several statements. Splitting a long `<<` chain across lines (lines 3–5) is a common, readable style. Cramming two declarations onto one line (line 2) is legal but usually discouraged.',
    },
    {
      kind: 'concept',
      title: 'Comments: notes for humans',
      blocks: [
        {
          type: 'p',
          text: 'A [[comment]] is text the compiler ignores; it is removed before compilation, so it costs nothing at run time. C++ has two forms:',
        },
        {
          type: 'code',
          code: `// A single-line comment runs to the end of the line.
int ammo = 30; // It can follow code, too.

/* A multi-line comment starts with slash-star
   and continues until the first star-slash. */`,
          annotations: [
            { lines: 1, text: '`//` starts a comment that ends at the line break.' },
            { lines: 2, text: 'An end-of-line comment: the code before `//` still compiles normally.' },
            { lines: '4-5', text: '`/* ... */` can span lines. It ends at the **first** `*/`, so these comments cannot be nested.' },
          ],
        },
        {
          type: 'heading',
          text: 'Explain why, not what',
        },
        {
          type: 'p',
          text: 'Code already says *what* it does. A good comment adds what the code cannot: the reason, the constraint, the surprising fact. Comments that just repeat the code add noise and go stale when the code changes.',
        },
        {
          type: 'compare',
          left: {
            title: 'Repeats the code',
            tone: 'bad',
            code: `// subtract 1 from lives
lives = lives - 1;`,
          },
          right: {
            title: 'Explains the reason',
            tone: 'good',
            code: `// Falling out of the world costs a life
// but not the checkpoint (design doc 4.2).
lives = lives - 1;`,
          },
        },
        {
          type: 'heading',
          text: 'Documentation comments',
        },
        {
          type: 'p',
          text: 'Comments written as `/** ... */` or `///` directly above a declaration are **doc comments**. Tools such as Doxygen turn them into reference documentation, and IDEs show them when you hover over the name.',
        },
        {
          type: 'code',
          code: `/**
 * Applies damage after armor and returns the new health.
 * Never returns less than zero.
 */
int applyDamage(int health, int damage, int armor);`,
          annotations: [
            { lines: '1-4', text: 'Describes the contract — what callers can rely on — rather than how it is implemented.' },
            { lines: 5, text: 'A function declaration, like the one you saw in the pipeline lesson.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Comments become editor tooltips',
          text: 'In Unreal, the comment directly above a reflected property or function is read by the build tools and shown as a **tooltip** in the editor and in Blueprints. Designers will read your comments, so write them for that audience.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Commenting out code',
          text: 'Putting `//` in front of lines to disable them is handy while debugging. Don\'t leave blocks of commented-out code behind, though: version control already remembers old code, and dead code confuses the next reader.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This program fails to compile. Tap the line that causes the problem.',
      code: `#include <iostream>

int main() {
    int damage = 25;
    /* Temporarily disabled while testing:
    damage = damage * 2; /* double damage */
    damage = damage + 5;
    */
    std::cout << damage << '\\n';
}`,
      bugLines: [6],
      hint: 'Where does a /* comment end?',
      explanation:
        'A `/*` comment ends at the **first** `*/`, and comments do not nest. The `*/` at the end of line 6 closes the comment that began on line 5, so line 7 becomes live code and the `*/` on line 8 is a syntax error (GCC: "expected primary-expression before \'/\' token"). GCC also warns `"/*" within comment` on line 6 — the real culprit. Use `//` for short notes inside code so that you can still wrap a region in `/* */` when you need to.',
    },
    {
      kind: 'fill',
      prompt: 'Add a single-line comment on line 2, then disable lines 4–5 with one multi-line comment so the program prints 100.',
      template: `int main() {
    int gold = 100; ___ starting gold for a new save
    ___
    gold = gold * 2;
    gold = gold + 10;
    ___
    std::cout << gold << '\\n';
}`,
      blanks: [{ answers: ['//'] }, { answers: ['/*'] }, { answers: ['*/'] }],
      wordBank: ['//', '/*', '*/', '#', '--', '<!--'],
      explanation:
        '`//` comments to the end of the line, which is perfect after code. A `/*` … `*/` pair disables everything between them, across as many lines as you like. `#` starts a preprocessor directive (not a comment), `--` is the decrement operator, and `<!--` is HTML — none of them comment out C++.',
    },
    {
      kind: 'concept',
      title: 'Identifiers: the rules for names',
      blocks: [
        {
          type: 'p',
          text: 'The names you give variables, functions and types are [[identifier|identifiers]]. The compiler enforces a few rules:',
        },
        {
          type: 'list',
          items: [
            'Use letters (`a`–`z`, `A`–`Z`), digits (`0`–`9`) and underscores (`_`).',
            'Do not start with a digit.',
            'No spaces or punctuation — `-` is the minus operator, so `max-ammo` means "max minus ammo".',
            'A name cannot be a [[keyword]] such as `int` or `return`.',
            'Names are **case-sensitive**: `score`, `Score` and `SCORE` are three different names.',
          ],
        },
        {
          type: 'table',
          headers: ['Name', 'Valid?', 'Why'],
          rows: [
            ['`playerHealth`', 'Yes', 'Letters only'],
            ['`player_health2`', 'Yes', 'Letters, underscore, digit (not first)'],
            ['`2ndPlayer`', 'No', 'Starts with a digit'],
            ['`max-ammo`', 'No', 'Parsed as `max - ammo`'],
            ['`enemy count`', 'No', 'Two separate names'],
            ['`return`', 'No', 'A keyword'],
            ['`_Health`, `boss__hp`', 'Compiles, but reserved', 'See the warning below'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Reserved names',
          text: 'Identifiers that begin with an underscore followed by an uppercase letter (`_Health`), or that contain a double underscore anywhere (`boss__hp`), are reserved for the compiler and standard library. Names beginning with a single underscore are also reserved at global scope. Using them may compile today and clash with a library macro tomorrow — the behaviour is undefined. The simple rule: never start a name with an underscore.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why case-sensitive?',
          text: 'C++ inherited case sensitivity from C, where it was cheap to implement and gave programmers more distinct names. It means `Main` is not `main` and `std::Cout` does not exist. Conventions (next) turn case into useful information instead of a trap.',
        },
      ],
    },
    {
      kind: 'mcq',
      multi: true,
      codeOptions: true,
      prompt: 'Which of these are valid identifiers that you could safely use as variable names? Select all that apply.',
      options: [
        { text: 'enemyCount', correct: true, why: 'Letters only, starts with a letter — valid and conventional.' },
        { text: 'hp_max2', correct: true, why: 'Letters, underscore and a digit that is not the first character — valid.' },
        { text: '3dModel', why: 'Identifiers cannot start with a digit; the compiler would try to read `3` as a number.' },
        { text: 'max-ammo', why: 'The hyphen is the subtraction operator, so this is the expression `max - ammo`, not a single name.' },
        { text: 'class', why: '`class` is a keyword, reserved for defining types. Keywords can never be used as names.' },
        { text: '__score', why: 'It compiles, but names containing a double underscore are reserved for the implementation, so it is not *safe* to use.' },
      ],
      explanation:
        'Identifiers may contain letters, digits and underscores, must not start with a digit, and must not be keywords. On top of the hard rules, avoid reserved patterns (leading underscore + capital, or any double underscore). When in doubt, start with a lowercase letter and use only letters and digits.',
    },
    {
      kind: 'concept',
      title: 'Keywords',
      blocks: [
        {
          type: 'p',
          text: '[[keyword|Keywords]] are words the language itself reserves, each with a fixed meaning. C++ has around ninety of them, and you will learn the important ones gradually. Your editor highlights them in a distinct colour.',
        },
        {
          type: 'table',
          headers: ['Purpose', 'Examples'],
          rows: [
            ['Built-in types', '`int`, `double`, `char`, `bool`, `void`, `auto`'],
            ['Literal values', '`true`, `false`, `nullptr`'],
            ['Control flow', '`if`, `else`, `switch`, `for`, `while`, `return`, `break`'],
            ['Declarations', '`const`, `constexpr`, `static`, `class`, `struct`, `enum`, `namespace`, `using`'],
            ['Memory and objects', '`new`, `delete`, `this`, `sizeof`'],
          ],
        },
        {
          type: 'p',
          text: 'Just as important is what is **not** a keyword. `main` is the name of a function the standard requires; `std` is a namespace; `cout` is an object defined in the standard library. They are ordinary identifiers that happen to be famous.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Context-sensitive words',
          text: 'A few words, such as `override`, `final`, `import` and `module`, only have special meaning in particular positions. Elsewhere they are legal names. C++ added them this way so that new features would not break old code that already used those words as names — backward compatibility again.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: '`cout` is a keyword built into the C++ language.',
      answer: false,
      explanation:
        '`cout` is an ordinary object declared in the `<iostream>` header and living in the `std` namespace. That is why you must `#include <iostream>` and write `std::` before it. Real keywords, like `int` or `return`, need no header and can never be used as names. You could even declare your own variable called `cout` inside a function (though you shouldn\'t).',
    },
    {
      kind: 'concept',
      title: 'Naming conventions',
      blocks: [
        {
          type: 'p',
          text: 'The compiler accepts any valid identifier, but people have to read your code. **Conventions** make names predictable, so the shape of a name tells you what kind of thing it is.',
        },
        {
          type: 'table',
          headers: ['Style', 'Looks like', 'Commonly used for'],
          rows: [
            ['camelCase', '`currentHealth`', 'Variables and functions (this course)'],
            ['PascalCase', '`EnemySpawner`', 'Types; everything in Unreal'],
            ['snake_case', '`current_health`', 'The C++ standard library (`push_back`, `string_view`)'],
            ['SCREAMING_SNAKE_CASE', '`MAX_PLAYERS`', 'Macros'],
          ],
        },
        {
          type: 'list',
          items: [
            '**Describe the meaning, not the type**: `remainingAmmo`, not `intValue`.',
            '**Put units in the name** when there is any doubt: `respawnDelaySeconds`, `distanceCm`.',
            '**Make booleans read as yes/no questions**: `isAlive`, `hasKey`, `canJump`.',
            '**Match length to reach**: `i` is fine for a three-line loop; a value used across a whole file deserves a full name.',
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Needs a comment to make sense',
            tone: 'bad',
            code: `int t = 30; // respawn time in seconds
int n = 4;  // number of enemies`,
          },
          right: {
            title: 'The name is the comment',
            tone: 'good',
            code: `int respawnDelaySeconds = 30;
int enemyCount = 4;`,
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why naming matters so much',
          text: 'Code is read far more often than it is written — by teammates, by reviewers, and by you six months from now. A precise name removes the need for a comment, and it cannot go out of date the way a comment can, because it changes whenever the code that uses it is refactored.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Unreal\'s conventions',
          text: 'Unreal uses PascalCase for nearly everything, plus prefixes that encode what a type is: `A` for actors (`AEnemy`), `U` for other engine objects, `F` for plain structs (`FVector`), and `b` for booleans (`bIsDead`). The Unreal course covers them in detail — and some engine tools rely on them.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'You need a variable for how long, in seconds, an enemy waits before respawning. Which name best follows the advice in this lesson?',
      codeOptions: true,
      options: [
        { text: 't', why: 'Too short for a value that matters across a game system — readers cannot tell what it stores or in which unit.' },
        { text: 'respawnTime', why: 'Better, but ambiguous: is it a delay or a moment in time? Seconds or milliseconds?' },
        { text: 'RESPAWN_DELAY', why: 'All-caps names conventionally signal macros, so this would mislead readers. It also leaves out the unit.' },
        { text: 'respawnDelaySeconds', correct: true, why: 'Says what it is (a delay), what it is for (respawning) and the unit (seconds), in this course\'s camelCase style.' },
      ],
      explanation:
        'A good name answers the questions a reader would otherwise have to ask. Including the unit prevents a classic class of bugs, such as passing milliseconds where seconds were expected. Unreal\'s own APIs follow similar advice — many time values are explicitly documented as being in seconds.',
    },
  ],
  takeaways: [
    'A statement is a complete instruction; most end with `;` because C++ ignores line breaks.',
    'An expression produces a value and may have side effects; adding `;` turns it into an expression statement.',
    'A block `{ ... }` groups statements, and names declared inside it disappear at its closing brace.',
    'Whitespace between tokens does not matter to the compiler — format for humans, consistently, ideally with a tool.',
    '`//` comments run to the end of the line; `/* ... */` comments end at the first `*/` and cannot nest.',
    'Good comments explain why; good names explain what. Doc comments (`/** */`) document contracts for tools and IDEs.',
    'Identifiers use letters, digits and underscores, cannot start with a digit, are case-sensitive and cannot be keywords; avoid leading underscores and double underscores.',
    '`main`, `std` and `cout` are not keywords — they are ordinary names.',
  ],
  reading: [
    {
      title: 'Statements',
      url: 'https://en.cppreference.com/w/cpp/language/statements',
      source: 'cppreference',
      note: 'All the kinds of statements in C++, including compound statements (blocks).',
    },
    {
      title: 'Comments',
      url: 'https://www.learncpp.com/cpp-tutorial/comments/',
      source: 'learncpp',
      note: 'More examples of good and bad comments, and how to comment out code.',
    },
    {
      title: 'Identifiers',
      url: 'https://en.cppreference.com/w/cpp/language/identifiers',
      source: 'cppreference',
      note: 'The exact rules for identifiers, including the reserved patterns.',
    },
    {
      title: 'C++ keywords',
      url: 'https://en.cppreference.com/w/cpp/keyword',
      source: 'cppreference',
      note: 'The complete keyword list, with the standard version each was added in.',
    },
    {
      title: 'C++ Core Guidelines: Naming and layout',
      url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-naming',
      source: 'core-guidelines',
      note: 'Widely followed advice on naming, comments and formatting.',
    },
  ],
};
