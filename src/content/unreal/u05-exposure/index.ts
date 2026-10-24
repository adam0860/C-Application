import type { Unit } from '../../types';
import { lesson as ueUpropertySpecifiers } from './ue-uproperty-specifiers';
import { lesson as ueUfunctionSpecifiers } from './ue-ufunction-specifiers';
import { lesson as ueMetaSpecifiers } from './ue-meta-specifiers';
import { lesson as ueCppBpWorkflow } from './ue-cpp-bp-workflow';

export const unit: Unit = {
  id: "ue-u05-exposure",
  title: "Exposing C++ to the Editor and Blueprints",
  description: "UPROPERTY and UFUNCTION specifiers, metadata, and designing a clean C++/Blueprint workflow.",
  icon: "🎛️",
  lessons: [ueUpropertySpecifiers, ueUfunctionSpecifiers, ueMetaSpecifiers, ueCppBpWorkflow],
};
