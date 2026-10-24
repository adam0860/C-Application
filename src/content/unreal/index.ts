import type { Course } from '../types';
import { unit as u01 } from './u01-intro';
import { unit as u02 } from './u02-core-types';
import { unit as u03 } from './u03-uobject';
import { unit as u04 } from './u04-actors';
import { unit as u05 } from './u05-exposure';
import { unit as u06 } from './u06-gameplay-framework';
import { unit as u07 } from './u07-input';
import { unit as u08 } from './u08-delegates';
import { unit as u09 } from './u09-collision';
import { unit as u10 } from './u10-time';
import { unit as u11 } from './u11-memory';
import { unit as u12 } from './u12-communication';
import { unit as u13 } from './u13-data';
import { unit as u14 } from './u14-networking';
import { unit as u15 } from './u15-debugging';
import { unit as u16 } from './u16-capstone';

export const unrealCourse: Course = {
  id: "unreal",
  title: "Unreal Engine C++",
  subtitle: "Gameplay programming the way Epic designed it",
  description: "Learn the dialect of C++ that powers Unreal Engine 5: reflection and the UObject system, actors and components, Blueprint exposure, the gameplay framework, input, collision, networking and the habits that keep a project fast and crash-free.",
  units: [u01, u02, u03, u04, u05, u06, u07, u08, u09, u10, u11, u12, u13, u14, u15, u16],
};
