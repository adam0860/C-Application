import type { Unit } from '../../types';
import { lesson as sfmlCollision } from './sfml-collision';
import { lesson as sfmlGameObjects } from './sfml-game-objects';
import { lesson as sfmlResourceManagement } from './sfml-resource-management';
import { lesson as sfmlGameStates } from './sfml-game-states';

export const unit: Unit = {
  id: "sfml-u05-gameplay",
  title: "Gameplay Architecture",
  description: "Collision, game objects, resource management and game states: the structure that keeps a game maintainable.",
  icon: "⚔️",
  lessons: [sfmlCollision, sfmlGameObjects, sfmlResourceManagement, sfmlGameStates],
};
