import type { Unit } from '../../types';
import { lesson as archGpuArchitecture } from './arch-gpu-architecture';
import { lesson as archIoSystems } from './arch-io-systems';

export const unit: Unit = {
  id: "arch-u10-gpu-io",
  title: "GPUs, Consoles and I/O",
  description: "GPU architecture and SIMT execution, and buses, interrupts, DMA, storage and the unified memory of consoles.",
  icon: "🎮",
  lessons: [archGpuArchitecture, archIoSystems],
};
