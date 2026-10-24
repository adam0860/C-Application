import type { Unit } from '../../types';
import { lesson as ueCasting } from './ue-casting';
import { lesson as ueInterfaces } from './ue-interfaces';
import { lesson as ueActorCommunication } from './ue-actor-communication';

export const unit: Unit = {
  id: "ue-u12-communication",
  title: "Casting, Interfaces and Communication",
  description: "Cast<T>, Unreal interfaces, and choosing the right way for actors to talk to each other.",
  icon: "🔗",
  lessons: [ueCasting, ueInterfaces, ueActorCommunication],
};
