import type { Unit } from '../../types';
import { lesson as ueDataAssets } from './ue-data-assets';
import { lesson as ueDataTables } from './ue-data-tables';
import { lesson as ueGameplayTags } from './ue-gameplay-tags';

export const unit: Unit = {
  id: "ue-u13-data",
  title: "Data-Driven Design",
  description: "Data Assets, Data Tables and Gameplay Tags — moving tuning out of code.",
  icon: "📊",
  lessons: [ueDataAssets, ueDataTables, ueGameplayTags],
};
