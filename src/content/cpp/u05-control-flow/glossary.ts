import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'guard-clause',
    term: 'Guard Clause',
    aliases: ['early return', 'early exit'],
    course: 'both',
    category: 'Control Flow',
    short: 'A check at the start of a function (or loop body) that handles an invalid or uninteresting case and exits immediately with `return` (or `continue`), keeping the main logic un-nested.',
    long: 'Instead of wrapping the real work in several nested `if` blocks, invert each precondition and leave early. Each guard deals with one problem completely, and code after the guards can assume every precondition holds. Unreal code uses guards constantly, for example `if (!IsValid(Target)) { return; }`.',
    example: 'void Fire() {\n    if (!bIsAlive) { return; }\n    if (Ammo <= 0) { return; }\n    // happy path: actually fire\n}',
    see: ['if-statement', 'break-continue'],
  },
  {
    id: 'dangling-else',
    term: 'Dangling Else',
    course: 'cpp',
    category: 'Control Flow',
    short: 'The ambiguity of an `else` after nested brace-less `if` statements. C++ always pairs an `else` with the nearest preceding `if` that has no `else`, regardless of indentation.',
    long: 'Code such as `if (a) if (b) x(); else y();` attaches the `else` to `if (b)`, even if it is indented to line up with `if (a)`. GCC warns with `-Wall` ("suggest explicit braces to avoid ambiguous else"). Always using braces removes the problem entirely.',
    example: 'if (hp > 50)\n    if (hasShield)\n        protect();\nelse            // belongs to if (hasShield)!\n    warn();',
    see: ['if-statement'],
  },
  {
    id: 'jump-table',
    term: 'Jump Table',
    aliases: ['branch table'],
    course: 'cpp',
    category: 'Control Flow',
    short: 'An array of code addresses that a compiler may generate for a `switch` with dense case values, so the matching case is reached with one indexed jump instead of a series of comparisons.',
    long: 'For cases such as 0–7, the compiler checks that the value is in range, uses it as an index into the table and jumps to the stored address, taking the same time however many cases there are. Sparse case values are usually compiled into a binary search of comparisons instead. Optimizers decide this automatically; it is one reason `switch` labels must be compile-time constants.',
    see: ['switch-statement'],
  },
  {
    id: 'off-by-one-error',
    term: 'Off-by-One Error',
    aliases: ['OBOE', 'fencepost error'],
    course: 'both',
    category: 'Control Flow',
    short: 'A bug in which a loop runs one time too many or too few, or an index is one too high or too low — typically `<=` written where `<` was meant.',
    long: 'The classic "fencepost" version: a 10-metre fence with a post every metre needs 11 posts. In C++, using half-open ranges (`for (int i = 0; i < n; ++i)`) and range-based `for` loops avoids most off-by-one errors. Reading one element past the end of an array is undefined behavior, so these bugs can corrupt memory rather than just produce a wrong count.',
    example: 'for (int i = 0; i <= 10; ++i) { }  // 11 iterations\nfor (int i = 0; i < 10; ++i) { }   // 10 iterations',
    see: ['loop', 'range-based-for'],
  },
];
