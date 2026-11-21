import type { Unit } from '../../types';
import { lesson as osProcesses } from './os-processes';
import { lesson as osProcessApi } from './os-process-api';
import { lesson as osContextSwitch } from './os-context-switch';

export const unit: Unit = {
  id: "os-u02-processes",
  title: "Processes",
  description: "The process abstraction, creating and waiting for processes, and limited direct execution with context switches.",
  icon: "🧬",
  lessons: [osProcesses, osProcessApi, osContextSwitch],
};
