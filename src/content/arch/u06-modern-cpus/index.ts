import type { Unit } from '../../types';
import { lesson as archOutOfOrder } from './arch-out-of-order';
import { lesson as archSimd } from './arch-simd';

export const unit: Unit = {
  id: "arch-u06-modern-cpus",
  title: "Modern CPUs",
  description: "Superscalar, out-of-order and speculative execution, and SIMD vector instructions with intrinsics and auto-vectorization.",
  icon: "🚀",
  lessons: [archOutOfOrder, archSimd],
};
