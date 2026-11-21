import type { Unit } from '../../types';
import { lesson as osSchedulingBasics } from './os-scheduling-basics';
import { lesson as osMlfqFairShare } from './os-mlfq-fair-share';
import { lesson as osMulticoreRealtime } from './os-multicore-realtime';

export const unit: Unit = {
  id: "os-u03-scheduling",
  title: "CPU Scheduling",
  description: "Scheduling metrics and the classic policies, MLFQ and fair-share schedulers, and multicore and real-time scheduling for games.",
  icon: "📅",
  lessons: [osSchedulingBasics, osMlfqFairShare, osMulticoreRealtime],
};
