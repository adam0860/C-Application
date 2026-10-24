import type { Unit } from '../../types';
import { lesson as ueEnhancedInputConcepts } from './ue-enhanced-input-concepts';
import { lesson as ueEnhancedInputCpp } from './ue-enhanced-input-cpp';
import { lesson as ueCharacterMovement } from './ue-character-movement';

export const unit: Unit = {
  id: "ue-u07-input",
  title: "Player Input",
  description: "The Enhanced Input system from concepts to C++ bindings, and character movement.",
  icon: "🕹️",
  lessons: [ueEnhancedInputConcepts, ueEnhancedInputCpp, ueCharacterMovement],
};
