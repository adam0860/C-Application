import type { Unit } from '../../types';
import { lesson as archCompilationPipeline } from './arch-compilation-pipeline';
import { lesson as archControlFlowAsm } from './arch-control-flow-asm';
import { lesson as archObjectsInMemory } from './arch-objects-in-memory';

export const unit: Unit = {
  id: "arch-u04-cpp-to-machine",
  title: "From C++ to Machine Code",
  description: "The compilation pipeline and linking, how C++ control flow and functions compile, and how objects, padding and virtual functions look in memory.",
  icon: "⚙️",
  lessons: [archCompilationPipeline, archControlFlowAsm, archObjectsInMemory],
};
