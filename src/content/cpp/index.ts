import type { Course } from '../types';
import { unit as u01 } from './u01-getting-started';
import { unit as u02 } from './u02-variables-types';
import { unit as u03 } from './u03-operators';
import { unit as u04 } from './u04-strings-io';
import { unit as u05 } from './u05-control-flow';
import { unit as u06 } from './u06-functions';
import { unit as u07 } from './u07-containers';
import { unit as u08 } from './u08-pointers';
import { unit as u09 } from './u09-classes';
import { unit as u10 } from './u10-inheritance';
import { unit as u11 } from './u11-modern-memory';
import { unit as u12 } from './u12-templates';
import { unit as u13 } from './u13-stl';
import { unit as u14 } from './u14-errors';
import { unit as u15 } from './u15-modern';
import { unit as u16 } from './u16-building';
import { unit as u17 } from './u17-concurrency';

export const cppCourse: Course = {
  id: "cpp",
  title: "C++ Fundamentals",
  subtitle: "From your first line of code to modern, professional C++",
  description: "A deep, practical path through the C++ language: how the compiler sees your code, how memory really works, object-oriented and generic programming, the standard library, and the modern idioms professionals rely on.",
  units: [u01, u02, u03, u04, u05, u06, u07, u08, u09, u10, u11, u12, u13, u14, u15, u16, u17],
};
