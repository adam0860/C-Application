import type { Unit } from '../../types';
import { lesson as cppIfElse } from './cpp-if-else';
import { lesson as cppSwitch } from './cpp-switch';
import { lesson as cppLoops } from './cpp-loops';
import { lesson as cppRangeForBreak } from './cpp-range-for-break';

export const unit: Unit = {
  id: "cpp-u05-control-flow",
  title: "Control Flow",
  description: "Decisions and repetition: if, switch, loops, break and continue.",
  icon: "🔀",
  lessons: [cppIfElse, cppSwitch, cppLoops, cppRangeForBreak],
};
