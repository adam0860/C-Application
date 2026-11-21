import type { Unit } from '../../types';
import { lesson as archIsaBasics } from './arch-isa-basics';
import { lesson as archX86Assembly } from './arch-x86-assembly';
import { lesson as archCallingConventions } from './arch-calling-conventions';

export const unit: Unit = {
  id: "arch-u03-isa",
  title: "Instruction Set Architecture",
  description: "What an ISA is, reading x86-64 assembly from your own C++, and calling conventions with stack frames.",
  icon: "📜",
  lessons: [archIsaBasics, archX86Assembly, archCallingConventions],
};
