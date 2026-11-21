import type { Unit } from '../../types';
import { lesson as osProtectionSecurity } from './os-protection-security';
import { lesson as osVirtualization } from './os-virtualization';

export const unit: Unit = {
  id: "os-u09-security-virtualization",
  title: "Protection, Security and Virtualization",
  description: "Users, permissions and exploit mitigations, and virtual machines, hypervisors and containers.",
  icon: "🛡️",
  lessons: [osProtectionSecurity, osVirtualization],
};
