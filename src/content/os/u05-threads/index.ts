import type { Unit } from '../../types';
import { lesson as osThreads } from './os-threads';
import { lesson as osLocks } from './os-locks';
import { lesson as osConditionVariables } from './os-condition-variables';

export const unit: Unit = {
  id: "os-u05-threads",
  title: "Threads and Synchronization",
  description: "Threads, race conditions and locks built from atomics, and condition variables and semaphores.",
  icon: "🔐",
  lessons: [osThreads, osLocks, osConditionVariables],
};
