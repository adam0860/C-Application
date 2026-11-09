import type { Course } from '../types';
import { unit as u01 } from './u01-setup';
import { unit as u02 } from './u02-input-time';
import { unit as u03 } from './u03-drawing';
import { unit as u04 } from './u04-animation-audio';
import { unit as u05 } from './u05-gameplay';
import { unit as u06 } from './u06-projects';

export const sfmlCourse: Course = {
  id: "sfml",
  title: "SFML Game Development",
  subtitle: "Build 2D games in C++ with SFML 3",
  description: "Make real 2D games with SFML 3 and modern C++: windows and the game loop, events and input, delta time, shapes, sprites, text, cameras, animation, tilemaps, audio, collision, game states, and two complete projects.",
  units: [u01, u02, u03, u04, u05, u06],
};
