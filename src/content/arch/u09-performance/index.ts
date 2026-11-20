import type { Unit } from '../../types';
import { lesson as archMeasuringPerformance } from './arch-measuring-performance';
import { lesson as archOptimizationCaseStudy } from './arch-optimization-case-study';

export const unit: Unit = {
  id: "arch-u09-performance",
  title: "Performance Engineering",
  description: "Measuring performance with profilers and counters, the iron law and Amdahl's law, and a frame-budget optimization case study.",
  icon: "⏱️",
  lessons: [archMeasuringPerformance, archOptimizationCaseStudy],
};
