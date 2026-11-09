import type { Unit } from '../../types';
import { lesson as sfmlProjectPong } from './sfml-project-pong';
import { lesson as sfmlProjectShooter } from './sfml-project-shooter';
import { lesson as sfmlPolishShip } from './sfml-polish-ship';

export const unit: Unit = {
  id: "sfml-u06-projects",
  title: "Projects and Next Steps",
  description: "Build Pong and a top-down shooter from scratch, then learn how to polish, ship and keep growing.",
  icon: "🏆",
  lessons: [sfmlProjectPong, sfmlProjectShooter, sfmlPolishShip],
};
