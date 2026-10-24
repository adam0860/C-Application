import type { Unit } from '../../types';
import { lesson as ueFrameworkOverview } from './ue-framework-overview';
import { lesson as uePawnsCharacters } from './ue-pawns-characters';
import { lesson as uePlayerController } from './ue-player-controller';
import { lesson as ueGameInstanceSubsystems } from './ue-game-instance-subsystems';

export const unit: Unit = {
  id: "ue-u06-gameplay-framework",
  title: "The Gameplay Framework",
  description: "GameMode, GameState, PlayerState, Pawns, Characters, Controllers, GameInstance and Subsystems.",
  icon: "🏛️",
  lessons: [ueFrameworkOverview, uePawnsCharacters, uePlayerController, ueGameInstanceSubsystems],
};
