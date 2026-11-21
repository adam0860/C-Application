import type { Unit } from '../../types';
import { lesson as osIoDevices } from './os-io-devices';
import { lesson as osFileApi } from './os-file-api';
import { lesson as osFileSystemImplementation } from './os-file-system-implementation';
import { lesson as osIoPerformance } from './os-io-performance';

export const unit: Unit = {
  id: "os-u07-storage",
  title: "I/O and File Systems",
  description: "Device I/O and drivers, the file-system interface, file-system implementation and crash consistency, and I/O performance for asset streaming.",
  icon: "💾",
  lessons: [osIoDevices, osFileApi, osFileSystemImplementation, osIoPerformance],
};
