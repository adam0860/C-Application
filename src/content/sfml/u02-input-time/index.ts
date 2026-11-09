import type { Unit } from '../../types';
import { lesson as sfmlEvents } from './sfml-events';
import { lesson as sfmlKeyboardMouse } from './sfml-keyboard-mouse';
import { lesson as sfmlDeltaTime } from './sfml-delta-time';

export const unit: Unit = {
  id: "sfml-u02-input-time",
  title: "Events, Input and Time",
  description: "Handling events the SFML 3 way, reading the keyboard and mouse, and moving things at the same speed on every computer.",
  icon: "🎮",
  lessons: [sfmlEvents, sfmlKeyboardMouse, sfmlDeltaTime],
};
