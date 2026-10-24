import type { Unit } from '../../types';
import { lesson as ueNetworkModel } from './ue-network-model';
import { lesson as uePropertyReplication } from './ue-property-replication';
import { lesson as ueRpcs } from './ue-rpcs';

export const unit: Unit = {
  id: "ue-u14-networking",
  title: "Networking and Replication",
  description: "The client–server model, authority, replicated properties, RepNotify and RPCs.",
  icon: "🌐",
  lessons: [ueNetworkModel, uePropertyReplication, ueRpcs],
};
