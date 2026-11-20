import type { Course } from '../types';
import { unit as u01 } from './u01-intro';
import { unit as u02 } from './u02-processes';
import { unit as u03 } from './u03-scheduling';
import { unit as u04 } from './u04-memory';
import { unit as u05 } from './u05-threads';
import { unit as u06 } from './u06-concurrency';
import { unit as u07 } from './u07-storage';
import { unit as u08 } from './u08-ipc-networking';
import { unit as u09 } from './u09-security-virtualization';

export const osCourse: Course = {
  id: "os",
  title: "Operating Systems",
  subtitle: "Processes, memory, threads and files, from the kernel up",
  description: "What the operating system does under your C++ program: system calls, processes and context switches, CPU scheduling, virtual memory and allocators, threads, locks and condition variables, deadlock and job systems, I/O and file systems, IPC and sockets, and security and virtualization.",
  units: [u01, u02, u03, u04, u05, u06, u07, u08, u09],
};
