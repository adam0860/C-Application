/*
 * Loads course content for the validation scripts.
 *
 * With no unit filter everything is imported through src/content/index.ts (any
 * broken file fails the run). With a filter, only the selected unit modules are
 * imported, and glossary/cheat sheet files are loaded best-effort, so authors
 * working on different units in parallel cannot break each other's checks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CheatSheet, CourseId, GlossaryEntry, Unit } from '../src/content/types';

interface OutlineUnit {
  dir: string;
  id: string;
}
export const outline: Record<CourseId, OutlineUnit[]> = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, 'curriculum.json'), 'utf8'),
);

export interface LoadedContent {
  courses: { id: CourseId; units: Unit[] }[];
  glossary: GlossaryEntry[];
  cheatSheets: CheatSheet[];
  loadProblems: string[];
}

const contentDir = path.join(import.meta.dirname, '..', 'src', 'content');
const importFile = (rel: string) => import(pathToFileURL(path.join(contentDir, rel)).href);

export async function loadContent(units: Set<string>, opts: { glossary: boolean }): Promise<LoadedContent> {
  if (units.size === 0 && opts.glossary) {
    const all = await import('../src/content/index');
    return {
      courses: all.courses.map((c) => ({ id: c.id, units: c.units })),
      glossary: all.glossary,
      cheatSheets: all.cheatSheets,
      loadProblems: [],
    };
  }
  const loadProblems: string[] = [];
  const courses: LoadedContent['courses'] = [];
  for (const courseId of Object.keys(outline) as CourseId[]) {
    const list: Unit[] = [];
    for (const u of outline[courseId]) {
      if (!units.has(u.id)) continue;
      const mod = await importFile(`${courseId}/${u.dir}/index.ts`); // let errors surface
      list.push(mod.unit as Unit);
    }
    courses.push({ id: courseId, units: list });
  }
  const glossary: GlossaryEntry[] = [];
  const cheatSheets: CheatSheet[] = [];
  const tryImport = async (rel: string, key: string, into: unknown[]) => {
    try {
      const mod = await importFile(rel);
      into.push(...(mod[key] as unknown[]));
    } catch (e) {
      loadProblems.push(`${rel}: ${(e as Error).message.split('\n')[0]}`);
    }
  };
  await tryImport('glossary/cpp.ts', 'cppGlossary', glossary);
  await tryImport('glossary/unreal.ts', 'unrealGlossary', glossary);
  for (const courseId of Object.keys(outline) as CourseId[])
    for (const u of outline[courseId]) await tryImport(`${courseId}/${u.dir}/glossary.ts`, 'glossary', glossary);
  if (opts.glossary) {
    await tryImport('cheatsheets/cpp.ts', 'cppCheatSheets', cheatSheets);
    await tryImport('cheatsheets/unreal.ts', 'unrealCheatSheets', cheatSheets);
    await tryImport('cheatsheets/sfml.ts', 'sfmlCheatSheets', cheatSheets);
  }
  return { courses, glossary, cheatSheets, loadProblems };
}
