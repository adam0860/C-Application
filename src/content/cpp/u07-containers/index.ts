import type { Unit } from '../../types';
import { lesson as cppArrays } from './cpp-arrays';
import { lesson as cppVector } from './cpp-vector';
import { lesson as cppMapsSets } from './cpp-maps-sets';

export const unit: Unit = {
  id: "cpp-u07-containers",
  title: "Arrays and Containers",
  description: "Storing collections: C arrays, std::array, std::vector and associative containers.",
  icon: "🗃️",
  lessons: [cppArrays, cppVector, cppMapsSets],
};
