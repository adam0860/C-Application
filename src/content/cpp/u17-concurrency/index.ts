import type { Unit } from '../../types';
import { lesson as cppThreads } from './cpp-threads';
import { lesson as cppMutexRace } from './cpp-mutex-race';
import { lesson as cppAtomicsAsync } from './cpp-atomics-async';

export const unit: Unit = {
  id: "cpp-u17-concurrency",
  title: "Concurrency Basics",
  description: "Threads, data races, mutexes, atomics and futures — doing more than one thing at once safely.",
  icon: "🧵",
  lessons: [cppThreads, cppMutexRace, cppAtomicsAsync],
};
