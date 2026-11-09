import type { CheatSheet } from '../types';
import { cppCheatSheets } from './cpp';
import { unrealCheatSheets } from './unreal';
import { sfmlCheatSheets } from './sfml';

export const cheatSheets: CheatSheet[] = [...cppCheatSheets, ...unrealCheatSheets, ...sfmlCheatSheets];
