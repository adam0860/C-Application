import type { Unit } from '../../types';
import { lesson as ueTickDeltatime } from './ue-tick-deltatime';
import { lesson as ueTimers } from './ue-timers';
import { lesson as uePerformanceTick } from './ue-performance-tick';

export const unit: Unit = {
  id: "ue-u10-time",
  title: "Tick, Timers and Time",
  description: "Frame-rate independence, timers, and keeping Tick from eating your frame budget.",
  icon: "⏱️",
  lessons: [ueTickDeltatime, ueTimers, uePerformanceTick],
};
