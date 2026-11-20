import type { Unit } from '../../types';
import { lesson as archDatapath } from './arch-datapath';
import { lesson as archPipelining } from './arch-pipelining';
import { lesson as archHazards } from './arch-hazards';
import { lesson as archBranchPrediction } from './arch-branch-prediction';

export const unit: Unit = {
  id: "arch-u05-processor",
  title: "Processor Design",
  description: "A single-cycle datapath, pipelining, hazards with forwarding and stalls, and branch prediction.",
  icon: "🏭",
  lessons: [archDatapath, archPipelining, archHazards, archBranchPrediction],
};
