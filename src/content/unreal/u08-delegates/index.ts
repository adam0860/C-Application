import type { Unit } from '../../types';
import { lesson as ueDelegatesBasics } from './ue-delegates-basics';
import { lesson as ueDynamicDelegates } from './ue-dynamic-delegates';
import { lesson as ueComponentEvents } from './ue-component-events';

export const unit: Unit = {
  id: "ue-u08-delegates",
  title: "Delegates and Events",
  description: "Single, multicast and dynamic delegates, Blueprint-assignable events and collision events.",
  icon: "📡",
  lessons: [ueDelegatesBasics, ueDynamicDelegates, ueComponentEvents],
};
