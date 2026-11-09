/*
 * Compile-checks every complete SFML program in the SFML course.
 *
 * SFML examples open windows and load assets, so they are never marked `runnable`
 * (the normal build check runs programs and compares their output). Instead this
 * script type-checks them against the real SFML headers with `g++ -fsyntax-only`,
 * which is enough to prove that every SFML 3 call in a lesson actually exists with
 * the signature the lesson shows.
 *
 *   SFML_INCLUDE=/path/to/SFML-3.x/include npm run check-sfml
 *   npm run check-sfml -- --unit sfml-u02-input-time      # only one unit
 *
 * A code block is checked when it is C++ and contains `int main`. Fragments (no
 * `main`) are skipped. Needs g++ (or set CXX) and the SFML include directory.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Block, Unit } from '../src/content/types';
import { sfmlCourse } from '../src/content/sfml';

const args = process.argv.slice(2);
const only = new Set<string>();
for (let i = 0; i < args.length; i++) if (args[i] === '--unit') only.add(args[++i]);

const include = process.env.SFML_INCLUDE;
if (!include || !fs.existsSync(path.join(include, 'SFML', 'Graphics.hpp'))) {
  console.error('Set SFML_INCLUDE to the SFML 3 include directory (the folder that contains SFML/Graphics.hpp).');
  process.exit(2);
}
const cxx = process.env.CXX ?? 'g++';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sfml-check-'));

function* codeBlocks(blocks: Block[]): Generator<Extract<Block, { type: 'code' }>> {
  for (const b of blocks) {
    if (b.type === 'code') yield b;
    else if (b.type === 'deepdive') yield* codeBlocks(b.blocks);
  }
}

let checked = 0;
let failed = 0;
for (const unit of sfmlCourse.units as Unit[]) {
  if (only.size && !only.has(unit.id)) continue;
  for (const lesson of unit.lessons) {
    let n = 0;
    for (const step of lesson.steps) {
      if (step.kind !== 'concept') continue;
      for (const b of codeBlocks(step.blocks)) {
        if ((b.lang ?? 'cpp') !== 'cpp' || !/\bint\s+main\s*\(/.test(b.code)) continue;
        n++;
        const file = path.join(tmp, `${lesson.id}-${n}.cpp`);
        fs.writeFileSync(file, b.code + '\n');
        const r = spawnSync(cxx, ['-std=c++17', '-fsyntax-only', '-Wall', '-Wextra', `-I${include}`, file], { encoding: 'utf8' });
        checked++;
        if (r.status !== 0 || (r.stderr ?? '').includes('warning')) {
          failed++;
          console.log(`✗ ${lesson.id} — program #${n}${b.title ? ` (${b.title})` : ''}\n${(r.stderr ?? '').split('\n').slice(0, 14).join('\n')}\n`);
        }
      }
    }
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Checked ${checked} SFML program(s): ${failed === 0 ? 'all compile cleanly against SFML headers.' : `${failed} failed.`}`);
process.exit(failed ? 1 : 0);
