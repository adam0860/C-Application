import type { Unit } from '../../types';
import { lesson as uePointerTypes } from './ue-pointer-types';
import { lesson as ueSmartPointers } from './ue-smart-pointers';
import { lesson as ueSoftReferences } from './ue-soft-references';

export const unit: Unit = {
  id: "ue-u11-memory",
  title: "Memory and Pointers in Unreal",
  description: "TObjectPtr, weak pointers, Unreal's smart pointers for non-UObjects, and soft references.",
  icon: "🧠",
  lessons: [uePointerTypes, ueSmartPointers, ueSoftReferences],
};
