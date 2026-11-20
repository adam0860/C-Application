import type { Unit } from '../../types';
import { lesson as archCacheCoherence } from './arch-cache-coherence';
import { lesson as archFalseSharing } from './arch-false-sharing';
import { lesson as archMemoryModels } from './arch-memory-models';

export const unit: Unit = {
  id: "arch-u08-multicore",
  title: "Multicore Hardware",
  description: "Cache coherence, false sharing, and memory consistency with C++ atomics and memory orders.",
  icon: "🧵",
  lessons: [archCacheCoherence, archFalseSharing, archMemoryModels],
};
