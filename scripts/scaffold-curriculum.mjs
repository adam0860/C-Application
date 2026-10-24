// Generates the folder/file skeleton for every unit and lesson listed in
// scripts/curriculum.json. Existing lesson and glossary files are never
// overwritten, so it is safe to re-run after adding new lessons to the outline.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'scripts/curriculum.json'), 'utf8'));

const courseMeta = {
  cpp: {
    exportName: 'cppCourse',
    title: 'C++ Fundamentals',
    subtitle: 'From your first line of code to modern, professional C++',
    description:
      'A deep, practical path through the C++ language: how the compiler sees your code, how memory really works, object-oriented and generic programming, the standard library, and the modern idioms professionals rely on.',
  },
  unreal: {
    exportName: 'unrealCourse',
    title: 'Unreal Engine C++',
    subtitle: 'Gameplay programming the way Epic designed it',
    description:
      "Learn the dialect of C++ that powers Unreal Engine 5: reflection and the UObject system, actors and components, Blueprint exposure, the gameplay framework, input, collision, networking and the habits that keep a project fast and crash-free.",
  },
};

const q = (s) => JSON.stringify(s);
const camel = (id) => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const glossaryImports = [];

for (const [courseId, units] of Object.entries(curriculum)) {
  const courseDir = path.join(root, 'src/content', courseId);
  fs.mkdirSync(courseDir, { recursive: true });
  const unitImports = [];
  units.forEach((u, ui) => {
    const unitDir = path.join(courseDir, u.dir);
    fs.mkdirSync(unitDir, { recursive: true });
    for (const [lessonId, title] of u.lessons) {
      const file = path.join(unitDir, `${lessonId}.ts`);
      if (!fs.existsSync(file)) {
        fs.writeFileSync(
          file,
          `import type { Lesson } from '../../types';

// STUB — replace this whole file with the finished lesson.
export const lesson: Lesson = {
  id: ${q(lessonId)},
  title: ${q(title)},
  summary: 'This lesson is being written.',
  minutes: 10,
  objectives: [],
  steps: [{ kind: 'concept', title: ${q(title)}, blocks: [{ type: 'p', text: 'Coming soon.' }] }],
  takeaways: [],
  reading: [],
};
`,
        );
      }
    }
    const imports = u.lessons
      .map(([lessonId]) => `import { lesson as ${camel(lessonId)} } from './${lessonId}';`)
      .join('\n');
    fs.writeFileSync(
      path.join(unitDir, 'index.ts'),
      `import type { Unit } from '../../types';
${imports}

export const unit: Unit = {
  id: ${q(u.id)},
  title: ${q(u.title)},
  description: ${q(u.description)},
  icon: ${q(u.icon)},
  lessons: [${u.lessons.map(([l]) => camel(l)).join(', ')}],
};
`,
    );
    const gfile = path.join(unitDir, 'glossary.ts');
    if (!fs.existsSync(gfile)) {
      fs.writeFileSync(
        gfile,
        `import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [];
`,
      );
    }
    const alias = `u${String(ui + 1).padStart(2, '0')}`;
    unitImports.push([alias, u.dir]);
    glossaryImports.push([`${courseId}_${alias}`, `../${courseId}/${u.dir}/glossary`]);
  });
  const meta = courseMeta[courseId];
  fs.writeFileSync(
    path.join(courseDir, 'index.ts'),
    `import type { Course } from '../types';
${unitImports.map(([a, d]) => `import { unit as ${a} } from './${d}';`).join('\n')}

export const ${meta.exportName}: Course = {
  id: ${q(courseId)},
  title: ${q(meta.title)},
  subtitle: ${q(meta.subtitle)},
  description: ${q(meta.description)},
  units: [${unitImports.map(([a]) => a).join(', ')}],
};
`,
  );
}

fs.writeFileSync(
  path.join(root, 'src/content/glossary/index.ts'),
  `import type { GlossaryEntry } from '../types';
import { cppGlossary } from './cpp';
import { unrealGlossary } from './unreal';
${glossaryImports.map(([a, p]) => `import { glossary as ${a} } from '${p}';`).join('\n')}

export const glossary: GlossaryEntry[] = [
  ...cppGlossary,
  ...unrealGlossary,
${glossaryImports.map(([a]) => `  ...${a},`).join('\n')}
];
`,
);
for (const [file, name] of [
  ['cpp.ts', 'cppGlossary'],
  ['unreal.ts', 'unrealGlossary'],
]) {
  const p = path.join(root, 'src/content/glossary', file);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, `import type { GlossaryEntry } from '../types';\n\nexport const ${name}: GlossaryEntry[] = [];\n`);
  }
}
console.log('Scaffold complete.');
