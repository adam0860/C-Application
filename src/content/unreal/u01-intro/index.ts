import type { Unit } from '../../types';
import { lesson as ueWhyCpp } from './ue-why-cpp';
import { lesson as ueProjectStructure } from './ue-project-structure';
import { lesson as ueBuildSystem } from './ue-build-system';
import { lesson as ueFirstClass } from './ue-first-class';

export const unit: Unit = {
  id: "ue-u01-intro",
  title: "Welcome to Unreal C++",
  description: "Why Unreal uses C++, how a project is laid out, how it builds, and your first C++ Actor.",
  icon: "🎮",
  lessons: [ueWhyCpp, ueProjectStructure, ueBuildSystem, ueFirstClass],
};
