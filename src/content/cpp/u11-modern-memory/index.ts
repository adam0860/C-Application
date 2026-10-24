import type { Unit } from '../../types';
import { lesson as cppRaii } from './cpp-raii';
import { lesson as cppCopySemantics } from './cpp-copy-semantics';
import { lesson as cppMoveSemantics } from './cpp-move-semantics';
import { lesson as cppSmartPointers } from './cpp-smart-pointers';

export const unit: Unit = {
  id: "cpp-u11-modern-memory",
  title: "Modern Memory Management",
  description: "RAII, copy and move semantics, and smart pointers — how modern C++ makes leaks a thing of the past.",
  icon: "🧠",
  lessons: [cppRaii, cppCopySemantics, cppMoveSemantics, cppSmartPointers],
};
