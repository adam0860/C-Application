import type { Course } from '../types';
import { unit as u01 } from './u01-data';
import { unit as u02 } from './u02-logic';
import { unit as u03 } from './u03-isa';
import { unit as u04 } from './u04-cpp-to-machine';
import { unit as u05 } from './u05-processor';
import { unit as u06 } from './u06-modern-cpus';
import { unit as u07 } from './u07-memory-hierarchy';
import { unit as u08 } from './u08-multicore';
import { unit as u09 } from './u09-performance';
import { unit as u10 } from './u10-gpu-io';

export const archCourse: Course = {
  id: "arch",
  title: "Computer Architecture",
  subtitle: "What your C++ turns into, and how the CPU really runs it",
  description: "How computers actually execute your code: data representation, digital logic, instruction sets and x86-64 assembly, how C++ compiles and links, pipelines and branch prediction, out-of-order and SIMD execution, caches and the memory hierarchy, multicore coherence and memory models, performance engineering, and GPUs and console hardware.",
  units: [u01, u02, u03, u04, u05, u06, u07, u08, u09, u10],
};
