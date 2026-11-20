import type { Unit } from '../../types';
import { lesson as osIpc } from './os-ipc';
import { lesson as osSockets } from './os-sockets';

export const unit: Unit = {
  id: "os-u08-ipc-networking",
  title: "IPC and Networking",
  description: "Pipes, signals and shared memory, and the sockets API with TCP and UDP for games.",
  icon: "📡",
  lessons: [osIpc, osSockets],
};
