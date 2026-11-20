/*
 * Structural validator for all course content.
 *
 *   npm run validate                         # everything (final check)
 *   npm run validate -- --unit cpp-u08-pointers [--unit ...]
 *                                            # only those units; glossary links may
 *                                            # point at ids from scripts/glossary-master.ts
 *   npm run validate -- --glossary           # only glossary + cheat sheets
 *   npm run validate -- --allow-stubs        # don't fail on unwritten lessons
 *
 * Exit code is non-zero when any ERROR is found. WARNINGS are advisory.
 */
import type { AlgoBlock, Block, FigureBlock, Lesson, Step, QuestionStep, GlossaryEntry, ReadingRef } from '../src/content/types';
import { CPP_GLOSSARY_IDS, UNREAL_GLOSSARY_IDS } from './glossary-master';
import { loadContent } from './load-content';
import { numberMatches, parseNumber } from '../src/lib/numeric';

const args = process.argv.slice(2);
const units = new Set<string>();
let glossaryOnly = false;
let allowStubs = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--unit') units.add(args[++i]);
  else if (args[i] === '--glossary') glossaryOnly = true;
  else if (args[i] === '--allow-stubs') allowStubs = true;
}
const partial = units.size > 0 || glossaryOnly;
const { courses, glossary, cheatSheets, loadProblems } = await loadContent(units, { glossary: !partial || glossaryOnly });

const errors: string[] = [];
const warnings: string[] = [];
const err = (where: string, msg: string) => errors.push(`✗ ${where}: ${msg}`);
const warn = (where: string, msg: string) => warnings.push(`! ${where}: ${msg}`);

const masterIds = new Set([...Object.keys(CPP_GLOSSARY_IDS), ...Object.keys(UNREAL_GLOSSARY_IDS)]);
const definedIds = new Set(glossary.map((g) => g.id));
const resolvable = (id: string) => definedIds.has(id) || (partial && masterIds.has(id));

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ---------------------------------------------------------------- inline text
function checkInline(where: string, text: string) {
  if (typeof text !== 'string') {
    err(where, `expected a string, got ${typeof text}`);
    return;
  }
  if (!text.trim()) err(where, 'empty text');
  // Code spans are literal text: `[[nodiscard]]` or `[](int x)` inside backticks is not markup.
  const prose = text.replace(/`[^`]+`/g, '``');
  for (const m of prose.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    const id = m[1].trim();
    if (!resolvable(id)) err(where, `unknown glossary id [[${id}]]`);
  }
  for (const m of prose.matchAll(/\]\(([^)]+)\)/g)) {
    if (!/^https:\/\//.test(m[1])) err(where, `link must be https: ${m[1]}`);
  }
  // Odd number of backticks usually means a broken `code` span.
  const ticks = (text.match(/`/g) ?? []).length;
  if (ticks % 2 === 1) warn(where, 'odd number of backticks — unbalanced `code` span?');
  const stars = (text.replace(/`[^`]*`/g, '').match(/\*\*/g) ?? []).length;
  if (stars % 2 === 1) warn(where, 'odd number of ** — unbalanced bold?');
}

function lineCount(code: string) {
  return code.split('\n').length;
}

function parseLines(spec: number | string | number[]): number[] {
  if (typeof spec === 'number') return [spec];
  if (Array.isArray(spec)) return spec;
  const m = /^(\d+)\s*-\s*(\d+)$/.exec(spec.trim());
  if (m) {
    const out: number[] = [];
    for (let i = +m[1]; i <= +m[2]; i++) out.push(i);
    return out;
  }
  const n = Number(spec);
  return Number.isInteger(n) ? [n] : [];
}

function checkReading(where: string, refs: ReadingRef[]) {
  refs.forEach((r, i) => {
    const w = `${where} reading[${i}]`;
    if (!r.title?.trim()) err(w, 'missing title');
    if (!/^https:\/\//.test(r.url ?? '')) err(w, `url must be https: ${r.url}`);
    if (r.note) checkInline(w + ' note', r.note);
  });
}

// --------------------------------------------------------------------- blocks
interface LessonStats {
  why: number;
  annotatedCode: number;
  codeBlocks: number;
}

function checkFigure(where: string, b: FigureBlock) {
  const svg = b.svg ?? '';
  if (!/^\s*<svg[\s>]/.test(svg)) err(where, 'figure svg must start with <svg');
  if (!/<svg[^>]*\bviewBox=/.test(svg)) err(where, 'figure <svg> needs a viewBox so it can scale');
  if (/<script|\son[a-z]+\s*=|javascript:|<image|<foreignObject|xlink:href="http/i.test(svg))
    err(where, 'figure svg may not contain scripts, event handlers, external images or foreignObject');
  // Balanced tags (a cheap well-formedness check).
  const stack: string[] = [];
  for (const m of svg.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    const [, close, name, , self] = m;
    if (self) continue;
    if (close) {
      if (stack.pop() !== name) {
        err(where, `figure svg: unexpected </${name}>`);
        return;
      }
    } else stack.push(name);
  }
  if (stack.length) err(where, `figure svg: unclosed <${stack[stack.length - 1]}>`);
  for (const tag of svg.matchAll(/<[a-zA-Z][^>]*>/g)) {
    const names = [...tag[0].matchAll(/\s([a-zA-Z:-]+)=/g)].map((m) => m[1]);
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) {
      err(where, `figure svg: duplicate ${dup}="…" attribute (the browser keeps only the first): ${tag[0].slice(0, 80)}`);
      break;
    }
  }
  if (!b.alt?.trim()) err(where, 'figure needs alt text');
  if (b.caption) checkInline(where + ' caption', b.caption);
}

function checkAlgo(where: string, a: AlgoBlock) {
  if (a.caption) checkInline(where + ' caption', a.caption);
  if (!Array.isArray(a.frames) || a.frames.length < 2) {
    err(where, 'algo needs at least 2 frames');
    return;
  }
  const codeLines = a.code ? a.code.split('\n').length : 0;
  if (a.code && /\t/.test(a.code)) warn(where, 'algo code contains tab characters; indent with spaces');
  const ids = new Set<string>();
  if (a.view === 'graph') {
    if (!a.nodes?.length) err(where, 'algo graph view needs nodes');
    const W = a.width ?? 420, H = a.height ?? 260;
    for (const nd of a.nodes ?? []) {
      if (ids.has(nd.id)) err(where, `duplicate node id "${nd.id}"`);
      ids.add(nd.id);
      if (nd.x < 18 || nd.x > W - 18 || nd.y < 18 || nd.y > H - 30) warn(where, `node "${nd.id}" at (${nd.x}, ${nd.y}) is too close to the edge of the ${W}×${H} box`);
    }
    for (const e of a.edges ?? []) if (!ids.has(e.from) || !ids.has(e.to)) err(where, `edge ${e.from}→${e.to} uses an unknown node`);
  } else if (a.view !== 'array') {
    err(where, `algo view must be 'array' or 'graph'`);
  }
  let len = -1;
  a.frames.forEach((f, i) => {
    const w = `${where} frame ${i + 1}`;
    if (!f.note?.trim()) err(w, 'frame needs a note');
    else checkInline(w + ' note', f.note);
    f.vars?.forEach(([k]) => checkInline(w + ' var', k));
    f.lines?.forEach((l) => {
      if (!a.code) err(w, 'lines given but the block has no code');
      else if (!Number.isInteger(l) || l < 1 || l > codeLines) err(w, `line ${l} is outside the code (${codeLines} lines)`);
    });
    if (a.view === 'array') {
      if (f.array) len = f.array.length;
      if (i === 0 && !f.array) err(w, 'the first frame must set array');
      if (a.bars && f.array?.some((v) => typeof v !== 'number')) err(w, 'bars need numeric values');
      const inRange = (k: number, lab: string, allowEnd = false) => {
        if (!Number.isInteger(k) || k < 0 || k > (allowEnd ? len : len - 1)) err(w, `${lab} index ${k} is outside the array (length ${len})`);
      };
      f.marks?.forEach((m) => inRange(m.index, 'mark'));
      f.dim?.forEach((k) => inRange(k, 'dim'));
      f.pointers?.forEach((p) => inRange(p.index, `pointer ${p.label}`, true));
      if (f.nodeColors || f.edgeColors || f.nodeNotes) err(w, 'graph fields in an array view');
    } else {
      const known = (id: string, lab: string) => {
        if (!ids.has(id)) err(w, `${lab} refers to unknown node "${id}"`);
      };
      f.nodeColors?.forEach((c) => known(c.id, 'nodeColors'));
      f.nodeNotes?.forEach((c) => known(c.id, 'nodeNotes'));
      f.nodeLabels?.forEach((c) => known(c.id, 'nodeLabels'));
      f.hidden?.forEach((id) => known(id, 'hidden'));
      f.edgeColors?.forEach((e) => {
        known(e.from, 'edgeColors');
        known(e.to, 'edgeColors');
        if (!(a.edges ?? []).some((x) => (x.from === e.from && x.to === e.to) || (!x.directed && x.from === e.to && x.to === e.from)))
          err(w, `edgeColors ${e.from}→${e.to} is not an edge`);
      });
      if (f.array || f.marks || f.pointers) err(w, 'array fields in a graph view');
    }
  });
}

function checkBlocks(where: string, blocks: Block[], stats: LessonStats) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    err(where, 'no blocks');
    return;
  }
  blocks.forEach((b, i) => {
    const w = `${where} block[${i}](${b.type})`;
    switch (b.type) {
      case 'p':
      case 'heading':
        checkInline(w, b.text);
        break;
      case 'code': {
        stats.codeBlocks++;
        if (!b.code?.trim()) err(w, 'empty code');
        if (b.code.startsWith('\n')) warn(w, 'code starts with a blank line');
        const n = lineCount(b.code);
        if (b.annotations?.length) stats.annotatedCode++;
        b.annotations?.forEach((a, ai) => {
          const ls = parseLines(a.lines);
          if (ls.length === 0) err(`${w} annotation[${ai}]`, `bad lines spec ${JSON.stringify(a.lines)}`);
          for (const l of ls) if (l < 1 || l > n) err(`${w} annotation[${ai}]`, `line ${l} out of range 1..${n}`);
          checkInline(`${w} annotation[${ai}]`, a.text);
        });
        b.highlight?.forEach((l) => {
          if (l < 1 || l > n) err(w, `highlight line ${l} out of range`);
        });
        if (b.runnable && (b.lang ?? 'cpp') !== 'cpp') err(w, 'runnable code must be C++');
        if (b.runnable && !/\bmain\s*\(/.test(b.code)) err(w, 'runnable code has no main()');
        break;
      }
      case 'callout':
        if (b.variant === 'why') stats.why++;
        if (b.title) checkInline(w + ' title', b.title);
        checkInline(w, b.text);
        break;
      case 'list':
        if (!b.items?.length) err(w, 'empty list');
        b.items?.forEach((it, ii) => checkInline(`${w} item[${ii}]`, it));
        break;
      case 'table':
        if (!b.headers?.length) err(w, 'table without headers');
        b.headers.forEach((h, hi) => checkInline(`${w} header[${hi}]`, h));
        b.rows.forEach((r, ri) => {
          if (r.length !== b.headers.length) err(w, `row ${ri} has ${r.length} cells, expected ${b.headers.length}`);
          r.forEach((c, ci) => checkInline(`${w} row[${ri}][${ci}]`, c));
        });
        break;
      case 'deepdive':
        checkInline(w + ' title', b.title);
        checkBlocks(w, b.blocks, stats);
        break;
      case 'compare':
        for (const side of [b.left, b.right]) {
          if (!side?.title) err(w, 'compare side missing title');
          if (!side.code && !side.text) err(w, 'compare side needs code or text');
          if (side.text) checkInline(w, side.text);
        }
        break;
      case 'steps':
        if (!b.items?.length) err(w, 'empty steps');
        b.items.forEach((s, si) => {
          checkInline(`${w} step[${si}] title`, s.title);
          checkInline(`${w} step[${si}]`, s.text);
        });
        break;
      case 'memory': {
        if (!b.regions?.length) err(w, 'memory diagram without regions');
        const ids = new Set(b.regions.flatMap((r) => r.cells.map((c) => c.id).filter(Boolean)));
        b.regions.forEach((r) =>
          r.cells.forEach((c) => {
            if (c.pointsTo && !ids.has(c.pointsTo)) err(w, `cell points to unknown id "${c.pointsTo}"`);
          }),
        );
        break;
      }
      case 'definition':
        checkInline(w, b.text);
        break;
      case 'figure':
        checkFigure(w, b);
        break;
      case 'algo':
        checkAlgo(w, b);
        break;
      default:
        err(w, `unknown block type ${(b as { type: string }).type}`);
    }
  });
}

// ------------------------------------------------------------------ questions
function checkQuestion(where: string, q: QuestionStep) {
  checkInline(where + ' prompt', q.prompt);
  checkInline(where + ' explanation', q.explanation);
  if ((q.explanation ?? '').length < 60) warn(where, 'explanation is very short — teach the "why"');
  if (q.hint) checkInline(where + ' hint', q.hint);
  switch (q.kind) {
    case 'mcq': {
      if (q.options.length < 3) err(where, 'mcq needs at least 3 options');
      const correct = q.options.filter((o) => o.correct).length;
      if (q.multi ? correct < 1 : correct !== 1) err(where, `mcq has ${correct} correct options`);
      const seen = new Set<string>();
      q.options.forEach((o, i) => {
        if (seen.has(o.text)) err(where, `duplicate option "${o.text}"`);
        seen.add(o.text);
        if (!q.codeOptions) checkInline(`${where} option[${i}]`, o.text);
        if (!o.why) warn(`${where} option[${i}]`, 'option has no "why" explanation');
        else checkInline(`${where} option[${i}] why`, o.why);
      });
      break;
    }
    case 'truefalse':
      if (typeof q.answer !== 'boolean') err(where, 'truefalse answer must be boolean');
      break;
    case 'fill': {
      const count = (q.template.match(/___/g) ?? []).length;
      if (count === 0) err(where, 'fill template has no ___ blanks');
      if (count !== q.blanks.length) err(where, `template has ${count} blanks but ${q.blanks.length} answers`);
      q.blanks.forEach((b, i) => {
        if (!b.answers?.length || b.answers.some((a) => !a.trim())) err(where, `blank ${i} has an empty answer`);
      });
      if (q.wordBank) {
        const bank = q.wordBank;
        q.blanks.forEach((b, i) => {
          if (!b.answers.some((a) => bank.includes(a))) err(where, `no accepted answer for blank ${i} is in the word bank`);
        });
        const answerCount = q.blanks.length;
        if (bank.length <= answerCount) warn(where, 'word bank has no distractors');
      }
      break;
    }
    case 'order':
      if (q.lines.length < 3) err(where, 'order question needs at least 3 lines');
      q.distractors?.forEach((d) => {
        if (q.lines.includes(d)) err(where, `distractor "${d}" is also a correct line`);
      });
      break;
    case 'numeric': {
      const ok = (v: number | string) => Number.isFinite(parseNumber(v));
      if (!ok(q.answer)) err(where, `numeric answer "${q.answer}" does not parse as a number`);
      q.alsoAccept?.forEach((v) => {
        if (!ok(v)) err(where, `alsoAccept value "${v}" does not parse as a number`);
      });
      if (q.tolerance !== undefined && !(q.tolerance >= 0)) err(where, 'tolerance must be >= 0');
      if (q.label) checkInline(where + ' label', q.label);
      if (typeof q.answer === 'string' && !numberMatches(String(q.answerText ?? q.answer).replace(/\s.*$/, ''), [q.answer, ...(q.alsoAccept ?? [])], q.tolerance ?? 0) && q.answerText === undefined)
        err(where, 'numeric answer does not match itself');
      break;
    }
    case 'bug': {
      const n = lineCount(q.code);
      if (!q.bugLines.length) err(where, 'bug question has no bugLines');
      q.bugLines.forEach((l) => {
        if (l < 1 || l > n) err(where, `bug line ${l} out of range 1..${n}`);
      });
      break;
    }
    default:
      err(where, `unknown step kind ${(q as { kind: string }).kind}`);
  }
}

// -------------------------------------------------------------------- lessons
const lessonIds = new Set<string>();
const questionIds = new Set<string>();
let checkedLessons = 0;
let stubCount = 0;
let questionCount = 0;
let conceptCount = 0;

function checkLesson(where: string, lesson: Lesson, coursePrefix: string) {
  const w = `${where} › ${lesson.id}`;
  if (!KEBAB.test(lesson.id)) err(w, 'lesson id must be kebab-case');
  if (!lesson.id.startsWith(coursePrefix)) err(w, `lesson id must start with "${coursePrefix}"`);
  if (lessonIds.has(lesson.id)) err(w, 'duplicate lesson id');
  lessonIds.add(lesson.id);
  if (lesson.summary === 'This lesson is being written.') {
    stubCount++;
    if (!allowStubs) err(w, 'lesson is still a stub');
    return;
  }
  checkedLessons++;
  checkInline(w + ' title', lesson.title);
  checkInline(w + ' summary', lesson.summary);
  if (!(lesson.minutes > 0)) err(w, 'minutes must be > 0');
  if (lesson.objectives.length < 3) err(w, 'needs at least 3 objectives');
  lesson.objectives.forEach((o, i) => checkInline(`${w} objective[${i}]`, o));
  if (lesson.takeaways.length < 4) err(w, 'needs at least 4 takeaways');
  lesson.takeaways.forEach((t, i) => checkInline(`${w} takeaway[${i}]`, t));
  if (lesson.reading.length < 2) err(w, 'needs at least 2 reading references');
  checkReading(w, lesson.reading);

  const stats: LessonStats = { why: 0, annotatedCode: 0, codeBlocks: 0 };
  let concepts = 0;
  let questions = 0;
  const kinds = new Set<string>();
  lesson.steps.forEach((s: Step, i) => {
    const sw = `${w} step[${i}](${s.kind})`;
    if (s.kind === 'concept') {
      concepts++;
      checkInline(sw + ' title', s.title);
      checkBlocks(sw, s.blocks, stats);
    } else {
      questions++;
      kinds.add(s.kind);
      const qid = s.id ?? `${lesson.id}#${i}`;
      if (questionIds.has(qid)) err(sw, `duplicate question id ${qid}`);
      questionIds.add(qid);
      if (s.code) stats.codeBlocks++;
      checkQuestion(sw, s);
    }
  });
  conceptCount += concepts;
  questionCount += questions;
  if (lesson.steps[0]?.kind !== 'concept') err(w, 'first step must be a concept');
  if (concepts < 4) err(w, `needs at least 4 concept steps (has ${concepts})`);
  if (questions < 5) err(w, `needs at least 5 questions (has ${questions})`);
  if (kinds.size < 3) err(w, `needs at least 3 question kinds (has ${[...kinds].join(', ')})`);
  if (stats.why < 1) err(w, 'needs at least one callout with variant "why"');
  if (stats.annotatedCode < 1) err(w, 'needs at least one annotated code block');
  // Interleave teaching and practice: a long run of questions mid-lesson is a
  // wall of quizzes. (A closing review run at the very end is fine.)
  let run = 0;
  lesson.steps.forEach((s, i) => {
    run = s.kind === 'concept' ? 0 : run + 1;
    const next = lesson.steps[i + 1];
    if (run >= 4 && next?.kind === 'concept') warn(w, `${run} questions in a row before step ${i + 1}`);
  });
}

if (!glossaryOnly) {
  const unitIds = new Set<string>();
  for (const course of courses) {
    const prefix = course.id === 'cpp' ? 'cpp-' : course.id === 'sfml' ? 'sfml-' : 'ue-';
    for (const unit of course.units) {
      if (unitIds.has(unit.id)) err(unit.id, 'duplicate unit id');
      unitIds.add(unit.id);
      const selected = units.size === 0 || units.has(unit.id);
      for (const lesson of unit.lessons) {
        if (selected) checkLesson(`${course.id} › ${unit.id}`, lesson, prefix);
        else lessonIds.add(lesson.id);
      }
    }
  }
  for (const u of units) if (!unitIds.has(u)) err(u, 'no such unit');
}

// ------------------------------------------------------------------- glossary
function checkGlossary() {
  const ids = new Set<string>();
  const terms = new Map<string, string>();
  glossary.forEach((g: GlossaryEntry) => {
    const w = `glossary › ${g.id}`;
    if (!KEBAB.test(g.id)) err(w, 'id must be kebab-case');
    if (ids.has(g.id)) err(w, 'duplicate glossary id');
    ids.add(g.id);
    const t = g.term.toLowerCase();
    if (terms.has(t)) warn(w, `same term as ${terms.get(t)}`);
    terms.set(t, g.id);
    checkInline(w + ' short', g.short);
    if (g.long) checkInline(w + ' long', g.long);
    g.see?.forEach((s) => {
      if (!definedIds.has(s) && !(partial && masterIds.has(s))) err(w, `see: unknown id ${s}`);
    });
    if (g.reading) checkReading(w, g.reading);
  });
  if (!partial || glossaryOnly) {
    for (const id of masterIds) if (!definedIds.has(id)) (partial ? warn : err)('glossary', `master id "${id}" is not defined`);
  }
  const sheetIds = new Set<string>();
  cheatSheets.forEach((s) => {
    const w = `cheatsheet › ${s.id}`;
    if (sheetIds.has(s.id)) err(w, 'duplicate cheat sheet id');
    sheetIds.add(s.id);
    if (!s.sections.length) err(w, 'no sections');
    s.sections.forEach((sec) =>
      sec.items.forEach((it, i) => {
        if (!it.code && !it.text) err(`${w} › ${sec.title}[${i}]`, 'item needs code or text');
        if (it.text) checkInline(`${w} › ${sec.title}[${i}]`, it.text);
      }),
    );
  });
}
if (!partial || glossaryOnly) checkGlossary();

// --------------------------------------------------------------------- report
if (loadProblems.length)
  console.log('Note: some shared files failed to load (probably mid-edit by another author):\n  ' + loadProblems.join('\n  ') + '\n');
if (warnings.length) console.log(warnings.join('\n') + '\n');
if (errors.length) console.log(errors.join('\n') + '\n');
console.log(
  `Checked ${checkedLessons} lessons (${conceptCount} concept steps, ${questionCount} questions), ` +
    `${glossary.length} glossary entries, ${cheatSheets.length} cheat sheets. ` +
    `${stubCount} stub lesson(s). ${errors.length} error(s), ${warnings.length} warning(s).`,
);
process.exit(errors.length ? 1 : 0);
