import type { Unit } from '../../types';
import { lesson as sfmlShapesTransforms } from './sfml-shapes-transforms';
import { lesson as sfmlTexturesSprites } from './sfml-textures-sprites';
import { lesson as sfmlTextFonts } from './sfml-text-fonts';
import { lesson as sfmlViewsCamera } from './sfml-views-camera';

export const unit: Unit = {
  id: "sfml-u03-drawing",
  title: "Drawing and Graphics",
  description: "Shapes, transforms, textures, sprites, text and cameras: everything you put on screen.",
  icon: "🎨",
  lessons: [sfmlShapesTransforms, sfmlTexturesSprites, sfmlTextFonts, sfmlViewsCamera],
};
