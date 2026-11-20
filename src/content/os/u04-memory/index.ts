import type { Unit } from '../../types';
import { lesson as osAddressSpaces } from './os-address-spaces';
import { lesson as osPaging } from './os-paging';
import { lesson as osPageReplacement } from './os-page-replacement';
import { lesson as osMemoryAllocation } from './os-memory-allocation';

export const unit: Unit = {
  id: "os-u04-memory",
  title: "Memory Management",
  description: "Address spaces, paging and multi-level page tables, page faults and replacement, and memory allocators from malloc to game arenas.",
  icon: "🧠",
  lessons: [osAddressSpaces, osPaging, osPageReplacement, osMemoryAllocation],
};
