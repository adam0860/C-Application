import type { CheatSheet } from '../types';
import { cppCheatSheets } from './cpp';
import { unrealCheatSheets } from './unreal';
import { sfmlCheatSheets } from './sfml';
import { archCheatSheets } from './arch';
import { osCheatSheets } from './os';

export const cheatSheets: CheatSheet[] = [...cppCheatSheets, ...unrealCheatSheets, ...sfmlCheatSheets, ...archCheatSheets, ...osCheatSheets];
