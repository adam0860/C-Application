import type { Unit } from '../../types';
import { lesson as cppMemoryModel } from './cpp-memory-model';
import { lesson as cppPointers } from './cpp-pointers';
import { lesson as cppReferences } from './cpp-references';
import { lesson as cppDynamicMemory } from './cpp-dynamic-memory';
import { lesson as cppPointersArraysConst } from './cpp-pointers-arrays-const';

export const unit: Unit = {
  id: "cpp-u08-pointers",
  title: "Pointers and References",
  description: "The memory model, addresses, pointers, references and dynamic memory — demystified.",
  icon: "📍",
  lessons: [cppMemoryModel, cppPointers, cppReferences, cppDynamicMemory, cppPointersArraysConst],
};
