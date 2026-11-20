import type { Unit } from '../../types';
import { lesson as archGatesBoolean } from './arch-gates-boolean';
import { lesson as archCombinational } from './arch-combinational';
import { lesson as archSequential } from './arch-sequential';

export const unit: Unit = {
  id: "arch-u02-logic",
  title: "Digital Logic",
  description: "From transistors to gates and Boolean algebra, combinational circuits up to an ALU, and sequential logic with flip-flops, registers and clocks.",
  icon: "🔌",
  lessons: [archGatesBoolean, archCombinational, archSequential],
};
