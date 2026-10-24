import type { Unit } from '../../types';
import { lesson as ueCapstoneHealth } from './ue-capstone-health';
import { lesson as ueCapstonePickup } from './ue-capstone-pickup';
import { lesson as ueCapstoneProjectile } from './ue-capstone-projectile';

export const unit: Unit = {
  id: "ue-u16-capstone",
  title: "Capstone: Building Gameplay Features",
  description: "Put it all together: a health component, an interactive pickup and a projectile weapon.",
  icon: "🏆",
  lessons: [ueCapstoneHealth, ueCapstonePickup, ueCapstoneProjectile],
};
