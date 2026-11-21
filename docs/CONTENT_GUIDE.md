# C++ Forge — Content Authoring Guide

C++ Forge teaches C++, then Unreal Engine C++ and SFML game development through short interactive lessons. It is
inspired by Sololearn/Duolingo but aims to be **much deeper**: every lesson explains *why*
things work the way they do, shows what happens under the hood, warns about real-world
pitfalls, and checks understanding with varied questions whose feedback teaches.

Read this whole guide, then read `src/content/types.ts` (the data model) and the
reference lesson `src/content/cpp/u01-getting-started/cpp-hello-world.ts`. Match or exceed
the reference lesson's depth and polish.

## 1. Where content lives

```
src/content/
  types.ts                         data model (do not change)
  cpp/<unit-dir>/<lesson-id>.ts    one file per lesson:  export const lesson: Lesson = {...}
  cpp/<unit-dir>/index.ts          unit metadata + lesson imports (already wired up)
  cpp/<unit-dir>/glossary.ts       extra glossary terms introduced by this unit
  unreal/...                       same structure for the Unreal course
  sfml/...                         same structure for the SFML course (lesson ids start with `sfml-`)
  glossary/cpp.ts, unreal.ts       the core glossary (ids listed in scripts/glossary-master.ts)
  cheatsheets/cpp.ts, unreal.ts, sfml.ts quick-reference sheets
```

Every lesson file already exists as a **stub**. Replace the whole stub with the finished
lesson. Keep the lesson `id` exactly as in the stub. You may refine the title slightly.
The full outline is in `scripts/curriculum.json` — look at neighbouring lessons so you
don't duplicate topics owned by another lesson, and so you know what learners have
already seen.

**Only edit files inside the unit directories you were assigned.** Other authors are
working on other units at the same time.

## 2. Audience and voice

- Learners range from complete beginners (early C++ units) to people preparing for a
  games-industry job (late Unreal units). Assume knowledge of all *earlier* lessons in
  the outline, nothing later. If you must mention a later concept, explain it in one
  sentence or link it to the glossary.
- Voice: warm, precise, confident, never condescending. Second person ("you").
  Short paragraphs (2–4 sentences). No filler, no hype.
- Prefer concrete, game-flavoured examples (health, inventories, scores, enemies,
  damage, levels, loot) — the course leads into Unreal, so this keeps learners motivated.
- Technical accuracy is paramount. When behaviour is undefined, implementation-defined,
  or changed between standards / engine versions, say so precisely.

## 3. Lesson recipe (enforced by the validator)

A lesson is a sequence of **steps**: `concept` cards that teach and **question** cards that
check. Requirements:

| Rule | Minimum |
|---|---|
| First step | must be a `concept` |
| Concept steps | ≥ 4 (typically 5–8) |
| Questions | ≥ 5 (typically 6–9) |
| Distinct question kinds | ≥ 3 of `mcq`, `truefalse`, `fill`, `order`, `bug` |
| `why` callouts | ≥ 1 (typically 2–4) |
| Code blocks with `annotations` | ≥ 1 (typically most code blocks) |
| Objectives | ≥ 3 |
| Takeaways | ≥ 4 |
| Reading references | ≥ 2 |

Recommended rhythm: concept → question → concept → question → … Interleave practice
with teaching; do not stack more than 3 questions in a row except an optional short
review at the very end. Aim for **12–18 steps** and **12–20 minutes** per lesson.

Depth target: each concept card ~150–450 words of teaching text plus code. A whole
lesson is typically 2,000–4,000 words. Depth beats breadth: one idea per card, explained
fully, with an example and the reasoning behind it.

### What a great concept card contains

1. The idea in plain language first, then the precise version.
2. A code example (annotated line by line where lines are non-obvious).
3. **The why** — a `why` callout: why the language/engine is designed this way, what
   problem it solves, what would go wrong otherwise.
4. Where relevant: a `warning` (common bug/UB), `perf` note, `analogy`, `history`, or
   `unreal` callout (how this applies or differs in Unreal Engine — use these liberally
   in the C++ course to bridge to the Unreal course).
5. Optional `deepdive` for the curious: what the compiler/engine actually does, memory
   layout, assembly intuition, standard wording, edge cases.

## 4. Inline text format

Used in every string that is displayed as prose (paragraphs, prompts, explanations, list
items, table cells, option text unless `codeOptions`, takeaways, objectives…):

- `` `code` `` → inline code
- `**bold**`, `*italic*`
- `[label](https://…)` → external link (https only)
- `[[glossary-id]]` or `[[glossary-id|display text]]` → glossary popover. Use ids from
  `scripts/glossary-master.ts`. Link a term the **first time** it appears in a lesson,
  not every time. If a term you need is not in the master list, add a full
  `GlossaryEntry` to your unit's `glossary.ts` (check the master list and other units'
  `glossary.ts` files first to avoid duplicates; use a specific id).
- `"\n\n"` inside a string → paragraph break.

## 5. Writing strings safely in TypeScript

- Use **template literals** (backticks) for multi-line `code`. Inside them you must
  escape: backslashes (`\\n` to display `\n`), backticks (`` \` ``), and `${` (`\${`).
- Use **single-quoted** strings for prose. Escape apostrophes (`don\'t`) or use double
  quotes for that string. Inline code spans in prose use real backticks, which is fine
  inside quoted strings.
- To display a backslash sequence in prose, e.g. `'\n'`, write `'\\n'` in the source.
- Code inside `code`, `options[].text` (with `codeOptions`), `template`, `lines` is raw
  text — no inline formatting is applied.
- Indent code with **4 spaces**. Braces on the same line (`int main() {`). Keep lines
  under ~70 characters so they fit on a phone without much scrolling.

## 6. Blocks reference (see types.ts for exact shapes)

- `p` — paragraph. `heading` — small sub-heading inside a card.
- `code` — code with optional `title` (filename), `output` (console panel),
  `annotations` (line-number → explanation, the heart of "explain the why"),
  `highlight`, `lang` (default `cpp`; use `shell`, `text`, `ini`, `csharp` for Build.cs,
  `cmake`, `json`).
- `callout` — variants: `why`, `tip`, `warning`, `note`, `unreal`, `history`, `perf`,
  `analogy`.
- `list`, `table`, `steps` (numbered process), `definition` (key term box).
- `compare` — side-by-side, usually `tone: 'bad'` vs `tone: 'good'`.
- `memory` — memory diagram (stack/heap boxes with names, values, addresses,
  `pointsTo` arrows by cell `id`). Excellent for pointers, references, objects, vectors.
- `deepdive` — collapsible "go deeper" section containing other blocks.
- `figure` — a hand-drawn diagram as inline SVG (`svg`, `alt`, optional `caption`,
  `maxWidth`): CPU datapaths, cache organizations, page tables, process state diagrams,
  file-system layouts. Use `currentColor` for strokes and fills and the accent classes
  `s-<c>` (stroke), `f-<c>` (fill), `t-<c>` (text), c ∈ blue, red, green, purple, orange,
  teal, gray, so it follows the theme. Give `font-size` as an attribute. No scripts, event
  handlers, images or foreignObject; the svg needs a `viewBox`. Draw arrowheads as small
  filled paths.
- `algo` — a step-through algorithm animation: the learner steps (◀ ▶), scrubs or plays a
  sequence of frames. Use it to show an algorithm *running*: a sort partitioning, a binary
  search narrowing, BFS/Dijkstra settling nodes, a heap sifting, a tree rotating.
  ```ts
  {
    type: 'algo',
    view: 'array',                 // or 'graph' (nodes at fixed positions; trees too)
    bars?: true,                   // array: draw values as bar heights
    code?: 'for (int i = 0; …',    // optional listing; frames highlight `lines`
    interval?: 900,                // ms per frame when playing
    // graph view only:
    nodes: [{ id: 'A', x: 60, y: 60, label? }], edges: [{ from: 'A', to: 'B', label?: '4', directed? }],
    width?: 420, height?: 260,
    frames: [
      { note: 'Compare $a[j]$ with the pivot.',            // required, inline markdown
        array: [7, 2, 9, 1, 4],                           // array view; carries forward if omitted
        marks: [{ index: 4, color: 'purple' }],           // colored cells
        pointers: [{ index: 0, label: 'i' }, { index: 1, label: 'j', color: 'blue' }],
        dim: [0],                                         // faded cells (outside the active range)
        lines: [3, 4],                                    // highlighted code lines (1-based)
        vars: [['comparisons', '3'], ['queue', 'B, C']],  // readouts under the note
        // graph view:
        nodeColors: [{ id: 'A', color: 'green' }], nodeNotes: [{ id: 'A', text: 'd=0' }],
        nodeLabels: [{ id: 'A', label: '42' }], hidden: ['E'],
        edgeColors: [{ from: 'A', to: 'B', color: 'blue' }] },
    ],
  }
  ```
  Generate frames with a script that actually runs the algorithm (Python or C++), so every
  frame is a true state, and keep notes short (one sentence). Only `array` carries forward
  between frames; marks, pointers, colors and notes are per frame. Color conventions:
  orange = current/active, blue = being compared or in the frontier, green = done/sorted/settled,
  red = swapped/rejected, purple = pivot/special, gray = visited.

## 7. Questions

Every question has a `prompt`, an `explanation` (shown after answering — it must
**teach the why**, not repeat the answer), and optionally `code` and a `hint`.

- `mcq` — 3–5 options, exactly one `correct: true` (or `multi: true` for
  select-all-that-apply). **Every option gets a `why`** explaining why it is right or
  wrong. Distractors must be plausible misconceptions, not jokes. Use `codeOptions: true`
  when options are code snippets. "What does this print?" questions are great: put the
  program in `code` and outputs as options. Vary the position of the correct option.
- `truefalse` — a crisp statement that targets a common misconception.
- `fill` — `template` contains `___` for each blank (in order). Each blank lists all
  acceptable `answers` (e.g. `['nullptr']`, or `['++i', 'i++']`). Prefer a `wordBank`
  (tap-to-fill on phones) containing all answers plus 2–4 believable distractors.
  Blanks should test meaningful tokens (keywords, operators, types), not trivia.
  For sentence blanks set `templateIsCode: false`.
- `order` — `lines` in the correct order (3–7 lines); optional `distractors` that do
  not belong. Make sure there is exactly one valid order.
- `bug` — `code` with a realistic bug; `bugLines` = the 1-based line(s) at fault.
  Explain the bug, the consequence (compile error? UB? crash? wrong result?) and the fix.
- `numeric` — type a number: an address, a bit width, a cycle count, a hit rate, a
  page-table size. `answer` is a number or numeric string; the checker accepts decimal,
  negative, fractions (`3/8`), `1.5e9`, hex (`0x1F`), binary (`0b1011`) and octal (`0o17`),
  with `_` or `'` separators. Use `tolerance` for rounded decimals (say in the prompt how
  to round), `alsoAccept` for equivalent values, `unit` and `label` around the input, and
  `answerText` to show the answer in a nicer form (e.g. `"0x7FFF_F000"`). Set `inputBase: 16` (or `2`) when the prompt says "answer in hex" so bare digits like `7fffe038` count. Integer answers must match exactly unless you set a `tolerance`.

Questions must be answerable from what the lesson (and earlier lessons) taught.

## 8. Code examples must be real

For the C++ course, mark **complete programs** with `runnable: true` and give their exact
`output`. The build check compiles each with `g++ -std=c++20 -Wall -Wextra -pthread`
(override with `std: 'c++23'` for things like `std::expected` or `std::print`), runs it,
and compares stdout exactly. It must compile **without warnings**. Do not mark as
runnable: fragments, code that is wrong on purpose, code whose output is unspecified
(UB, addresses, unordered_map iteration order, timing, thread interleaving), or Unreal
code. Fragments are fine and encouraged for focused explanations.

Style: modern C++ (C++20), `std::` prefix (never `using namespace std;`), brace
initialization where idiomatic, `'\n'` rather than `std::endl`, `nullptr` not `NULL`,
`const` where appropriate, smart pointers over raw owning pointers once taught.

## 9. Unreal-specific conventions

- Target **Unreal Engine 5.4+** (note when something changed in a specific UE5
  version). Use Enhanced Input (not the legacy input system), `TObjectPtr<>` for
  `UPROPERTY` object pointers in headers, `UE_LOG` with a custom or `LogTemp` category.
- Use a fictional project/module named `MyGame` with export macro `MYGAME_API`, e.g.
  `class MYGAME_API AMyActor : public AActor`.
- Always show the `#include "MyActor.generated.h"` as the **last** include in headers
  and explain why when first introduced. Show both `.h` and `.cpp` where it matters,
  using `title` (e.g. `"HealthComponent.h"`).
- Use `lang: 'csharp'` for `*.Build.cs` / `*.Target.cs`, `lang: 'ini'` for config files.
- Bridge back to standard C++ often: "In standard C++ you'd use `std::vector`; Unreal
  uses `TArray` because …". This reinforces the first course and explains the why.
- Unreal code is never `runnable`. Make sure it would compile in a real UE5 project.

## 10. Reading references

Only include URLs you are highly confident exist (they cannot be checked automatically).
Good patterns:
- cppreference: `https://en.cppreference.com/w/cpp/language/pointer`,
  `https://en.cppreference.com/w/cpp/container/vector`, `…/w/cpp/memory/unique_ptr`
- learncpp.com: `https://www.learncpp.com/cpp-tutorial/<slug>/` (only slugs you know)
- C++ Core Guidelines: `https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines`
  (optionally with a well-known anchor such as `#Rr-raii`)
- isocpp FAQ: `https://isocpp.org/faq`
- Unreal docs: `https://dev.epicgames.com/documentation/en-us/unreal-engine/<slug>`
  (e.g. `unreal-engine-uproperties`, `gameplay-framework-in-unreal-engine`,
  `enhanced-input-in-unreal-engine`, `epic-cplusplus-coding-standard-for-unreal-engine`)
- Books: use `source: 'book'` and a stable URL (publisher or author page).
Each reference gets a one-sentence `note` explaining what to look for.

## 11. Validate before you finish

```
npm run validate -- --unit <unit-id> [--unit <unit-id> …]
npm run compile-examples -- --unit <unit-id>     # C++ course only
```

Fix **all errors**, and fix warnings unless you have a good reason. Then re-read each
lesson once as a learner would: is every new term explained? Is the "why" answered? Would
a beginner know what to do in each question?

Also type-check (filter to your own files, since other authors are editing theirs):

```
npx tsc --noEmit -p tsconfig.content.json 2>&1 | grep -E "<your-unit-dir>|glossary" || echo "types OK"
```

## SFML course conventions

- Target **SFML 3** only (`std::optional<Event>` polling, `getIf<T>()`, `VideoMode({w, h})`,
  scoped enums, `sf::degrees`). Old SFML 2 tutorial code does not compile against it.
- Lessons use CMake for builds; use `cmake` as the `lang` of those blocks.
- Every code block containing `int main` is compiled by `npm run check-sfml` (optionally
  `-- --unit <unit-id>`). Set `SFML_INCLUDE` to the SFML 3 `include` folder (required; the folder containing
  `SFML/Graphics.hpp`).
- Prefer self-contained programs: build textures and sounds in memory so a learner can
  paste the code and run it without asset files.
- In template literals escape backticks and `${`; the CMake variables `${CMAKE_BINARY_DIR}`
  etc. need the escaped form in source.
