import type { Unit } from '../../types';
import { lesson as cppMultiFile } from './cpp-multi-file';
import { lesson as cppUndefinedBehavior } from './cpp-undefined-behavior';
import { lesson as cppCmakeTooling } from './cpp-cmake-tooling';
import { lesson as cppDebugging } from './cpp-debugging';

export const unit: Unit = {
  id: "cpp-u16-building",
  title: "Building Real Programs",
  description: "Multi-file projects, linker errors, undefined behavior, CMake and debugging.",
  icon: "🔧",
  lessons: [cppMultiFile, cppUndefinedBehavior, cppCmakeTooling, cppDebugging],
};
