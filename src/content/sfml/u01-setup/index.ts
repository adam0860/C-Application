import type { Unit } from '../../types';
import { lesson as sfmlWhatIsSfml } from './sfml-what-is-sfml';
import { lesson as sfmlSetupBuild } from './sfml-setup-build';
import { lesson as sfmlWindowGameLoop } from './sfml-window-game-loop';

export const unit: Unit = {
  id: "sfml-u01-setup",
  title: "Getting Started with SFML",
  description: "What SFML is, how to install and build it, and your first window with a proper game loop.",
  icon: "🧰",
  lessons: [sfmlWhatIsSfml, sfmlSetupBuild, sfmlWindowGameLoop],
};
