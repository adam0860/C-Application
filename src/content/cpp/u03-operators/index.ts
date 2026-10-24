import type { Unit } from '../../types';
import { lesson as cppArithmetic } from './cpp-arithmetic';
import { lesson as cppComparisonLogic } from './cpp-comparison-logic';
import { lesson as cppPrecedenceBitwise } from './cpp-precedence-bitwise';

export const unit: Unit = {
  id: "cpp-u03-operators",
  title: "Operators and Expressions",
  description: "Arithmetic, comparisons, logic, precedence and bit manipulation — and the surprises hiding in each.",
  icon: "➗",
  lessons: [cppArithmetic, cppComparisonLogic, cppPrecedenceBitwise],
};
