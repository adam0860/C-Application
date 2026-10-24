import { cheatSheets, courses, glossary, isStub } from '../content';
import type { Block, Lesson } from '../content/types';

export interface SearchHit {
  kind: 'lesson' | 'glossary' | 'sheet';
  id: string;
  title: string;
  subtitle: string;
  score: number;
}

const strip = (s: string) =>
  s
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*]/g, '')
    .toLowerCase();

function blockText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'p':
        case 'heading':
        case 'definition':
          return b.text;
        case 'callout':
          return `${b.title ?? ''} ${b.text}`;
        case 'list':
          return b.items.join(' ');
        case 'deepdive':
          return `${b.title} ${blockText(b.blocks)}`;
        case 'steps':
          return b.items.map((i) => `${i.title} ${i.text}`).join(' ');
        default:
          return '';
      }
    })
    .join(' ');
}

interface Doc {
  hit: Omit<SearchHit, 'score'>;
  title: string;
  aux: string;
  body: string;
}

let docs: Doc[] | null = null;
let mentions: Map<string, string[]> | null = null;

function lessonBody(l: Lesson) {
  return l.steps.map((s) => (s.kind === 'concept' ? `${s.title} ${blockText(s.blocks)}` : '')).join(' ');
}

function build() {
  docs = [];
  for (const c of courses)
    for (const u of c.units)
      for (const l of u.lessons) {
        if (isStub(l)) continue;
        docs.push({
          hit: { kind: 'lesson', id: l.id, title: l.title, subtitle: `${c.id === 'cpp' ? 'C++' : 'Unreal'} · ${u.title}` },
          title: l.title.toLowerCase(),
          aux: strip(`${l.summary} ${l.objectives.join(' ')}`),
          body: strip(lessonBody(l)),
        });
      }
  for (const g of glossary)
    docs.push({
      hit: { kind: 'glossary', id: g.id, title: g.term, subtitle: `${g.course === 'unreal' ? 'Unreal' : g.course === 'both' ? 'C++ & Unreal' : 'C++'} · ${g.category}` },
      title: `${g.term} ${(g.aliases ?? []).join(' ')}`.toLowerCase(),
      aux: strip(g.short),
      body: strip(g.long ?? ''),
    });
  for (const s of cheatSheets)
    docs.push({
      hit: { kind: 'sheet', id: s.id, title: s.title, subtitle: `Cheat sheet · ${s.course === 'cpp' ? 'C++' : 'Unreal'}` },
      title: s.title.toLowerCase(),
      aux: strip(s.description),
      body: strip(s.sections.map((sec) => `${sec.title} ${sec.items.map((i) => `${i.label} ${i.text ?? ''} ${i.code ?? ''}`).join(' ')}`).join(' ')),
    });
}

export function search(query: string, limit = 40): SearchHit[] {
  if (!docs) build();
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  const hits: SearchHit[] = [];
  for (const d of docs!) {
    let score = 0;
    if (d.title === q) score += 200;
    else if (d.title.startsWith(q)) score += 120;
    else if (d.title.includes(q)) score += 80;
    for (const t of terms) {
      if (d.title.includes(t)) score += 25;
      else if (d.aux.includes(t)) score += 10;
      else if (d.body.includes(t)) score += 3;
      else {
        score = 0;
        break;
      }
    }
    if (score > 0) {
      if (d.hit.kind === 'glossary') score += 5;
      hits.push({ ...d.hit, score });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Lessons that link to a glossary term with [[id]]. */
export function lessonsMentioning(glossaryId: string): string[] {
  if (!mentions) {
    mentions = new Map();
    for (const c of courses)
      for (const u of c.units)
        for (const l of u.lessons) {
          const json = JSON.stringify(l.steps);
          for (const m of json.matchAll(/\[\[([^\]|]+)/g)) {
            const id = m[1].trim();
            const list = mentions.get(id) ?? [];
            if (!list.includes(l.id)) list.push(l.id);
            mentions.set(id, list);
          }
        }
  }
  return mentions.get(glossaryId) ?? [];
}
