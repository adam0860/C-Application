import type { CheatSheet } from '../types';
import { cppCheatSheets } from './cpp';
import { unrealCheatSheets } from './unreal';

export const cheatSheets: CheatSheet[] = [...cppCheatSheets, ...unrealCheatSheets];
