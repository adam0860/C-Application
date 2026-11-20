import type { Unit } from '../../types';
import { lesson as archMemoryHierarchy } from './arch-memory-hierarchy';
import { lesson as archCaches } from './arch-caches';
import { lesson as archCacheFriendlyCode } from './arch-cache-friendly-code';
import { lesson as archAddressTranslation } from './arch-address-translation';

export const unit: Unit = {
  id: "arch-u07-memory-hierarchy",
  title: "The Memory Hierarchy",
  description: "Latency from registers to SSD, how caches work, writing cache-friendly C++, and address translation with the TLB.",
  icon: "🗄️",
  lessons: [archMemoryHierarchy, archCaches, archCacheFriendlyCode, archAddressTranslation],
};
