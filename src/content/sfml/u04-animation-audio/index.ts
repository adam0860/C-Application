import type { Unit } from '../../types';
import { lesson as sfmlSpriteAnimation } from './sfml-sprite-animation';
import { lesson as sfmlVertexArraysTilemaps } from './sfml-vertex-arrays-tilemaps';
import { lesson as sfmlAudio } from './sfml-audio';

export const unit: Unit = {
  id: "sfml-u04-animation-audio",
  title: "Animation, Tiles and Audio",
  description: "Spritesheet animation, drawing thousands of tiles cheaply, and sound effects and music.",
  icon: "🔊",
  lessons: [sfmlSpriteAnimation, sfmlVertexArraysTilemaps, sfmlAudio],
};
