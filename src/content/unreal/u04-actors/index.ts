import type { Unit } from '../../types';
import { lesson as ueActorLifecycle } from './ue-actor-lifecycle';
import { lesson as ueComponents } from './ue-components';
import { lesson as ueTransforms } from './ue-transforms';
import { lesson as ueSpawningDestroying } from './ue-spawning-destroying';

export const unit: Unit = {
  id: "ue-u04-actors",
  title: "Actors and Components",
  description: "The actor lifecycle, component hierarchies, transforms, and spawning and destroying actors.",
  icon: "🧱",
  lessons: [ueActorLifecycle, ueComponents, ueTransforms, ueSpawningDestroying],
};
