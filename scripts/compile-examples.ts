/*
 * Compiles every code block marked `runnable: true` with g++ and, when the
 * block declares an `output`, runs the program and compares stdout.
 *
 *   npm run compile-examples
 *   npm run compile-examples -- --unit cpp-u08-pointers [--unit ...]
 *
 * Requires g++ (13+) on PATH.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { courses } from '../src/content/index';
import type { Block, CodeBlock } from '../src/content/types';

const run = promisify(execFile);
const args = process.argv.slice(2);
const units = new Set<string>();
for (let i = 0; i < args.length; i++) if (args[i] === '--unit') units.add(args[++i]);

interface Job {
  where: string;
  block: CodeBlock;
}
const jobs: Job[] = [];

function collect(where: string, blocks: Block[]) {
  blocks.forEach((b, i) => {
    if (b.type === 'code' && b.runnable) jobs.push({ where: `${where} block[${i}]`, block: b });
    if (b.type === 'deepdive') collect(`${where} block[${i}]`, b.blocks);
  });
}

for (const course of courses)
  for (const unit of course.units) {
    if (units.size && !units.has(unit.id)) continue;
    for (const lesson of unit.lessons)
      lesson.steps.forEach((s, si) => {
        if (s.kind === 'concept') collect(`${lesson.id} step[${si}]`, s.blocks);
      });
  }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cppforge-'));
const normalize = (s: string) =>
  s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');

let failures = 0;
let warnings = 0;

async function runJob(job: Job, n: number) {
  const dir = path.join(tmp, String(n));
  fs.mkdirSync(dir);
  const src = path.join(dir, 'main.cpp');
  const exe = path.join(dir, 'main');
  fs.writeFileSync(src, job.block.code);
  const std = job.block.std ?? 'c++20';
  try {
    const { stderr } = await run('g++', [`-std=${std}`, '-Wall', '-Wextra', '-pthread', '-O1', src, '-o', exe], {
      timeout: 60_000,
    });
    if (stderr.trim()) {
      warnings++;
      console.log(`! ${job.where}: compiler warnings\n${indent(stderr)}`);
    }
  } catch (e) {
    failures++;
    const ex = e as { stderr?: string };
    console.log(`✗ ${job.where}: does not compile\n${indent(ex.stderr ?? String(e))}\n${indent(job.block.code, '    | ')}`);
    return;
  }
  if (job.block.output === undefined) return;
  try {
    const child = execFile(exe, [], { timeout: 10_000 });
    let out = '';
    child.stdout?.on('data', (d) => (out += d));
    if (job.block.stdin) child.stdin?.end(job.block.stdin);
    else child.stdin?.end();
    await new Promise<void>((resolve) => child.on('close', () => resolve()));
    if (normalize(out) !== normalize(job.block.output)) {
      failures++;
      console.log(
        `✗ ${job.where}: output mismatch\n  expected:\n${indent(job.block.output, '    > ')}\n  actual:\n${indent(out, '    > ')}`,
      );
    }
  } catch (e) {
    failures++;
    console.log(`✗ ${job.where}: failed to run: ${e}`);
  }
}

function indent(s: string, prefix = '    ') {
  return s
    .trimEnd()
    .split('\n')
    .map((l) => prefix + l)
    .join('\n');
}

const concurrency = Math.max(1, os.cpus().length);
let next = 0;
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (next < jobs.length) {
      const i = next++;
      await runJob(jobs[i], i);
    }
  }),
);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nCompiled ${jobs.length} runnable example(s): ${failures} failure(s), ${warnings} with warnings.`);
process.exit(failures ? 1 : 0);
