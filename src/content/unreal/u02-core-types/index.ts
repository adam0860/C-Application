import type { Unit } from '../../types';
import { lesson as ueNamingConventions } from './ue-naming-conventions';
import { lesson as ueNumericTypes } from './ue-numeric-types';
import { lesson as ueStrings } from './ue-strings';
import { lesson as ueContainers } from './ue-containers';
import { lesson as ueLogging } from './ue-logging';

export const unit: Unit = {
  id: "ue-u02-core-types",
  title: "Conventions and Core Types",
  description: "Unreal's naming prefixes, numeric types, the three string types, containers and logging.",
  icon: "🔤",
  lessons: [ueNamingConventions, ueNumericTypes, ueStrings, ueContainers, ueLogging],
};
