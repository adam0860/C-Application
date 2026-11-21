import type { Unit } from '../../types';
import { lesson as osWhatIsAnOs } from './os-what-is-an-os';
import { lesson as osKernelUserMode } from './os-kernel-user-mode';
import { lesson as osSyscallsInCpp } from './os-syscalls-in-cpp';

export const unit: Unit = {
  id: "os-u01-intro",
  title: "What an Operating System Does",
  description: "The OS as abstraction and resource manager, kernel and user mode with system calls and interrupts, and calling the OS from C++.",
  icon: "🖥️",
  lessons: [osWhatIsAnOs, osKernelUserMode, osSyscallsInCpp],
};
