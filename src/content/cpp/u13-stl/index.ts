import type { Unit } from '../../types';
import { lesson as cppIterators } from './cpp-iterators';
import { lesson as cppLambdas } from './cpp-lambdas';
import { lesson as cppAlgorithms } from './cpp-algorithms';
import { lesson as cppRanges } from './cpp-ranges';

export const unit: Unit = {
  id: "cpp-u13-stl",
  title: "Iterators, Lambdas and Algorithms",
  description: "The power tools of the standard library: iterators, lambdas, algorithms and ranges.",
  icon: "⚙️",
  lessons: [cppIterators, cppLambdas, cppAlgorithms, cppRanges],
};
