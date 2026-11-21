import type { Unit } from '../../types';
import { lesson as osDeadlock } from './os-deadlock';
import { lesson as osConcurrencyPatterns } from './os-concurrency-patterns';

export const unit: Unit = {
  id: "os-u06-concurrency",
  title: "Concurrency Problems and Patterns",
  description: "Deadlock, livelock and priority inversion, and readers–writers, thread pools and engine job systems.",
  icon: "🍝",
  lessons: [osDeadlock, osConcurrencyPatterns],
};
