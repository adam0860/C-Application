import type { Unit } from '../../types';
import { lesson as ueAssertions } from './ue-assertions';
import { lesson as ueDebugDrawing } from './ue-debug-drawing';
import { lesson as ueCommonCrashes } from './ue-common-crashes';
import { lesson as ueCodingStandard } from './ue-coding-standard';

export const unit: Unit = {
  id: "ue-u15-debugging",
  title: "Debugging and Best Practices",
  description: "Assertions, visual debugging, avoiding common crashes and following Epic's coding standard.",
  icon: "🐞",
  lessons: [ueAssertions, ueDebugDrawing, ueCommonCrashes, ueCodingStandard],
};
