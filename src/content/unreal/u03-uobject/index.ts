import type { Unit } from '../../types';
import { lesson as ueReflection } from './ue-reflection';
import { lesson as ueUclassMacros } from './ue-uclass-macros';
import { lesson as ueUobjectCreation } from './ue-uobject-creation';
import { lesson as ueGarbageCollection } from './ue-garbage-collection';

export const unit: Unit = {
  id: "ue-u03-uobject",
  title: "The UObject System and Reflection",
  description: "Reflection, the U-macros, how objects are created, and how garbage collection keeps them alive.",
  icon: "🪞",
  lessons: [ueReflection, ueUclassMacros, ueUobjectCreation, ueGarbageCollection],
};
