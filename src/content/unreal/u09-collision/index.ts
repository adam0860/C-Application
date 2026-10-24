import type { Unit } from '../../types';
import { lesson as ueCollisionSetup } from './ue-collision-setup';
import { lesson as ueLineTraces } from './ue-line-traces';
import { lesson as uePhysics } from './ue-physics';

export const unit: Unit = {
  id: "ue-u09-collision",
  title: "Collision, Traces and Physics",
  description: "Collision channels and profiles, line traces and sweeps, and physics simulation.",
  icon: "💥",
  lessons: [ueCollisionSetup, ueLineTraces, uePhysics],
};
