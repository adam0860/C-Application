/*
 * Content model for C++ Forge.
 *
 * Every lesson in the app is plain data that conforms to these types. The UI
 * renders it, the validator (scripts/validate-content.ts) checks it, and the
 * example compiler (scripts/compile-examples.ts) builds every code block marked
 * `runnable` with g++ to prove the examples are real, working C++.
 *
 * INLINE TEXT FORMAT (used by every `text`, `prompt`, `explanation`, list item,
 * table cell, takeaway, glossary definition, etc.):
 *   `code`              inline code (rendered with syntax highlighting)
 *   **bold**            strong emphasis
 *   *italic*            emphasis
 *   [label](https://…)  external link (opens in the system browser)
 *   [[glossary-id]]     glossary term; shows the term name and a tap-to-define popover
 *   [[glossary-id|text]] glossary term with custom display text
 * Paragraph breaks inside a single string: use "\n\n".
 */

export type CourseId = 'cpp' | 'unreal' | 'sfml';

export type CodeLang = 'cpp' | 'text' | 'shell' | 'csharp' | 'ini' | 'json' | 'cmake';

export interface ReadingRef {
  title: string;
  url: string;
  /** Where the link points, shown as a small badge. */
  source:
    | 'cppreference'
    | 'learncpp'
    | 'isocpp'
    | 'core-guidelines'
    | 'unreal-docs'
    | 'book'
    | 'article'
    | 'video'
    | 'other';
  /** One sentence on why it's worth reading / what to look for. */
  note?: string;
}

/** Explains specific lines of a code block. Line numbers are 1-based. */
export interface Annotation {
  /** A single line (3), an inclusive range ("3-5") or a list ([2, 6]). */
  lines: number | string | number[];
  text: string;
}

export interface CodeBlock {
  type: 'code';
  code: string;
  lang?: CodeLang; // default 'cpp'
  /** File name or caption shown in the code header, e.g. "main.cpp". */
  title?: string;
  /** Expected program output, shown in a console panel under the code. */
  output?: string;
  /** Line-by-line explanations ("why" each line exists). */
  annotations?: Annotation[];
  /** Lines to visually emphasize (1-based). */
  highlight?: number[];
  /**
   * true  => this is a complete program; the build check compiles it with
   *          `g++ -std=c++20 -Wall -Wextra` and, if `output` is given, runs it and
   *          compares stdout exactly (trailing whitespace ignored).
   * Leave unset/false for fragments, Unreal code, or code that is wrong on purpose.
   */
  runnable?: boolean;
  /** If runnable and the program reads stdin, feed this text. */
  stdin?: string;
  /** Language standard for the build check. Default 'c++20'. */
  std?: 'c++17' | 'c++20' | 'c++23';
}

export type CalloutVariant =
  | 'why' // explains the reasoning / design motivation behind something
  | 'tip' // practical advice
  | 'warning' // common mistake, undefined behavior, crash risk
  | 'note' // side information
  | 'unreal' // how this relates to / differs in Unreal Engine
  | 'history' // how/why the language evolved this way
  | 'perf' // performance implications
  | 'analogy'; // real-world analogy to build intuition

export type Block =
  | { type: 'p'; text: string }
  | { type: 'heading'; text: string }
  | CodeBlock
  | { type: 'callout'; variant: CalloutVariant; title?: string; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][]; caption?: string }
  /** Collapsible "go deeper" section for the curious. */
  | { type: 'deepdive'; title: string; blocks: Block[] }
  /** Side-by-side comparison, typically "don't" vs "do". */
  | {
      type: 'compare';
      left: CompareSide;
      right: CompareSide;
    }
  /** A numbered process, e.g. the stages of compilation. */
  | { type: 'steps'; items: { title: string; text: string }[] }
  /** A memory diagram: rows of labelled boxes (stack frames, heap blocks…). */
  | { type: 'memory'; caption?: string; regions: MemoryRegion[] }
  /** Key term definition box. */
  | { type: 'definition'; term: string; text: string };

export interface CompareSide {
  title: string;
  /** 'bad' renders red with ✗, 'good' renders green with ✓, 'neutral' plain. */
  tone: 'good' | 'bad' | 'neutral';
  code?: string;
  lang?: CodeLang;
  text?: string;
}

export interface MemoryRegion {
  /** e.g. "Stack — main()" or "Heap" */
  label: string;
  kind: 'stack' | 'heap' | 'static' | 'other';
  cells: MemoryCell[];
}

export interface MemoryCell {
  /** Variable name, e.g. "x" or "p". Empty for anonymous heap blocks. */
  name?: string;
  /** Displayed value, e.g. "42" or "0x7ffd…10". */
  value: string;
  /** Optional address label, e.g. "0x1000". */
  address?: string;
  /** Type, e.g. "int" or "int*". */
  type?: string;
  /** Name of another cell's `id` this cell points to (draws an arrow label). */
  pointsTo?: string;
  id?: string;
  highlight?: boolean;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

/** A teaching card: explanation, examples, callouts. */
export interface ConceptStep {
  kind: 'concept';
  title: string;
  blocks: Block[];
}

interface QuestionBase {
  /** Optional stable id; defaults to `${lessonId}#${stepIndex}`. */
  id?: string;
  prompt: string;
  /** Optional code shown with the prompt. */
  code?: string;
  lang?: CodeLang;
  /** Shown if the learner taps "Hint" before answering. */
  hint?: string;
  /**
   * The "why" behind the correct answer. Shown after every answer, right or
   * wrong. Should teach, not just restate the answer.
   */
  explanation: string;
}

export interface McqOption {
  text: string;
  correct?: boolean;
  /** Why this option is right or wrong. Shown after answering. */
  why?: string;
}

/** Multiple choice. Exactly one correct option unless `multi` is true. */
export interface McqQuestion extends QuestionBase {
  kind: 'mcq';
  options: McqOption[];
  /** Allow selecting several options; all correct ones must be chosen. */
  multi?: boolean;
  /** Render option text as code (monospace + highlighting). */
  codeOptions?: boolean;
}

export interface TrueFalseQuestion extends QuestionBase {
  kind: 'truefalse';
  answer: boolean;
}

/**
 * Fill in the blank. Put `___` (three underscores) in `template` where each
 * blank goes; blanks are numbered in order of appearance.
 * If `wordBank` is given, learners tap chips (mobile-friendly); otherwise they
 * type. The word bank should contain every correct answer plus distractors.
 */
export interface FillQuestion extends QuestionBase {
  kind: 'fill';
  /** Code (or a sentence if `templateIsCode` is false) containing `___` blanks. */
  template: string;
  templateIsCode?: boolean; // default true
  blanks: { answers: string[]; caseSensitive?: boolean }[];
  wordBank?: string[];
}

/** Put the lines in the right order. `lines` is the correct order. */
export interface OrderQuestion extends QuestionBase {
  kind: 'order';
  lines: string[];
  /** Extra lines that do not belong in the answer. */
  distractors?: string[];
  linesAreCode?: boolean; // default true
}

/** Tap the line(s) that contain the bug. `code` is required. */
export interface BugQuestion extends QuestionBase {
  kind: 'bug';
  code: string;
  /** 1-based line numbers of the buggy line(s). Any one tapped counts as correct. */
  bugLines: number[];
}

export type QuestionStep =
  | McqQuestion
  | TrueFalseQuestion
  | FillQuestion
  | OrderQuestion
  | BugQuestion;

export type Step = ConceptStep | QuestionStep;

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

export interface Lesson {
  /** Globally unique, kebab-case, prefixed with course: "cpp-hello-world". */
  id: string;
  title: string;
  /** One-line description shown on the lesson card. */
  summary: string;
  /** Estimated minutes to complete. */
  minutes: number;
  /** What the learner will be able to do afterwards. */
  objectives: string[];
  steps: Step[];
  /** Bullet-point recap shown on the completion screen. */
  takeaways: string[];
  /** Further reading shown at the end of the lesson. */
  reading: ReadingRef[];
}

export interface Unit {
  /** Unique, kebab-case: "cpp-u01-getting-started". */
  id: string;
  title: string;
  description: string;
  /** A single emoji used as the unit badge. */
  icon: string;
  lessons: Lesson[];
}

export interface Course {
  id: CourseId;
  title: string;
  subtitle: string;
  description: string;
  units: Unit[];
}

// ---------------------------------------------------------------------------
// Reference material
// ---------------------------------------------------------------------------

export interface GlossaryEntry {
  /** kebab-case id used in [[id]] links, e.g. "rvalue-reference". */
  id: string;
  term: string;
  aliases?: string[];
  course: CourseId | 'both';
  /** e.g. "Memory", "Types", "Reflection", "Build", "OOP". */
  category: string;
  /** One or two sentence definition (inline format). */
  short: string;
  /** Longer explanation, may include "\n\n" paragraph breaks. */
  long?: string;
  example?: string;
  exampleLang?: CodeLang;
  /** Related glossary ids. */
  see?: string[];
  reading?: ReadingRef[];
}

export interface CheatSheet {
  id: string;
  title: string;
  course: CourseId;
  icon: string;
  description: string;
  sections: {
    title: string;
    items: { label: string; code?: string; lang?: CodeLang; text?: string }[];
  }[];
}
