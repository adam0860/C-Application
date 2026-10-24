import { useSyncExternalStore } from 'react';
import { loadJSON, saveJSON } from './storage';
import { addDays, dayKey } from './dates';

// ---------------------------------------------------------------------------
// A tiny observable store. Each store persists itself to localStorage.
// ---------------------------------------------------------------------------

class Store<T extends object> {
  private state: T;
  private listeners = new Set<() => void>();
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private key: string,
    private defaults: T,
  ) {
    this.state = loadJSON(key, defaults);
  }

  get = () => this.state;

  set = (update: Partial<T> | ((s: T) => Partial<T>)) => {
    const patch = typeof update === 'function' ? update(this.state) : update;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => saveJSON(this.key, this.state), 150);
  };

  replace = (next: T) => {
    this.state = { ...this.defaults, ...next };
    this.listeners.forEach((l) => l());
    saveJSON(this.key, this.state);
  };

  reset = () => this.replace(this.defaults);

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  flush = () => {
    clearTimeout(this.saveTimer);
    saveJSON(this.key, this.state);
  };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type ThemePref = 'system' | 'light' | 'dark' | 'midnight';
export type Accent = 'ocean' | 'violet' | 'emerald' | 'sunset' | 'rose';

export interface Settings {
  name: string;
  theme: ThemePref;
  accent: Accent;
  codeTheme: 'match' | 'dark';
  textScale: number; // 0.9 – 1.25
  codeFontSize: number; // px
  lineNumbers: boolean;
  wrapCode: boolean;
  motion: 'system' | 'full' | 'reduced';
  sound: boolean;
  volume: number; // 0 – 1
  haptics: boolean;
  celebrations: boolean;
  dailyGoal: number; // XP per day
  freeNavigation: boolean;
  retryMistakes: boolean;
  shuffleOptions: boolean;
  onboarded: boolean;
}

export const defaultSettings: Settings = {
  name: '',
  theme: 'system',
  accent: 'ocean',
  codeTheme: 'match',
  textScale: 1,
  codeFontSize: 14,
  lineNumbers: true,
  wrapCode: false,
  motion: 'system',
  sound: true,
  volume: 0.6,
  haptics: true,
  celebrations: true,
  dailyGoal: 30,
  freeNavigation: false,
  retryMistakes: true,
  shuffleOptions: true,
  onboarded: false,
};

export const settingsStore = new Store<Settings>('cppforge.settings.v1', defaultSettings);

export function useSettings(): Settings {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.get);
}

export const setSettings = settingsStore.set;

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export interface LessonProgress {
  completedAt: number;
  bestAccuracy: number; // 0 – 1
  lastAccuracy: number;
  attempts: number;
}

/** A question the learner got wrong, scheduled with a Leitner box. */
export interface ReviewItem {
  qid: string;
  lessonId: string;
  stepIndex: number;
  box: number; // 0 = due now … 5 = mastered
  due: number; // epoch ms
  misses: number;
}

export interface Progress {
  lessons: Record<string, LessonProgress>;
  xp: number;
  dailyXp: Record<string, number>;
  streak: { current: number; best: number; lastDay: string | null };
  review: Record<string, ReviewItem>;
  achievements: Record<string, number>;
  bookmarks: string[];
  stats: {
    questionsAnswered: number;
    questionsCorrect: number;
    secondsLearning: number;
    practiceSessions: number;
    perfectLessons: number;
  };
  lastLessonId: string | null;
  createdAt: number;
}

export const defaultProgress: Progress = {
  lessons: {},
  xp: 0,
  dailyXp: {},
  streak: { current: 0, best: 0, lastDay: null },
  review: {},
  achievements: {},
  bookmarks: [],
  stats: { questionsAnswered: 0, questionsCorrect: 0, secondsLearning: 0, practiceSessions: 0, perfectLessons: 0 },
  lastLessonId: null,
  createdAt: Date.now(),
};

export const progressStore = new Store<Progress>('cppforge.progress.v1', defaultProgress);

export function useProgress(): Progress {
  return useSyncExternalStore(progressStore.subscribe, progressStore.get);
}

/** Streak as it should be displayed today (a missed day breaks it). */
export function effectiveStreak(p: Progress, now = new Date()): number {
  const { lastDay, current } = p.streak;
  if (!lastDay) return 0;
  if (lastDay === dayKey(now) || lastDay === dayKey(addDays(now, -1))) return current;
  return 0;
}

export function todayXp(p: Progress): number {
  return p.dailyXp[dayKey()] ?? 0;
}

/** Level curve: level n starts at 25·(n−1)² XP. */
export function levelInfo(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 25)) + 1;
  const start = 25 * (level - 1) ** 2;
  const next = 25 * level ** 2;
  return { level, start, next, progress: (xp - start) / (next - start) };
}

/** Adds XP, updates the daily log and streak. Returns the new streak if it grew today. */
export function awardXp(amount: number): { streakExtended: boolean; leveledUp: boolean } {
  const before = progressStore.get();
  const today = dayKey();
  const yesterday = dayKey(addDays(new Date(), -1));
  const { streak } = before;
  let current = streak.current;
  let extended = false;
  if (streak.lastDay !== today) {
    current = streak.lastDay === yesterday ? streak.current + 1 : 1;
    extended = true;
  }
  const xp = before.xp + amount;
  progressStore.set({
    xp,
    dailyXp: { ...before.dailyXp, [today]: (before.dailyXp[today] ?? 0) + amount },
    streak: { current, best: Math.max(streak.best, current), lastDay: today },
  });
  return { streakExtended: extended, leveledUp: levelInfo(xp).level > levelInfo(before.xp).level };
}

// Leitner intervals in days for boxes 1…5 (box 0 is "due immediately").
const BOX_DAYS = [0, 1, 3, 7, 16, 35];

export function recordReview(item: Omit<ReviewItem, 'box' | 'due' | 'misses'>, correct: boolean) {
  const p = progressStore.get();
  const existing = p.review[item.qid];
  if (!existing && correct) return; // only track questions that were missed at some point
  const box = correct ? Math.min((existing?.box ?? 0) + 1, 5) : 0;
  const misses = (existing?.misses ?? 0) + (correct ? 0 : 1);
  const due = Date.now() + BOX_DAYS[box] * 86_400_000;
  const review = { ...p.review };
  if (correct && box >= 5) delete review[item.qid];
  else review[item.qid] = { ...item, box, due, misses };
  progressStore.set({ review });
}

export function dueReviews(p: Progress, now = Date.now()): ReviewItem[] {
  return Object.values(p.review)
    .filter((r) => r.due <= now)
    .sort((a, b) => a.due - b.due);
}

export function toggleBookmark(key: string) {
  const p = progressStore.get();
  const has = p.bookmarks.includes(key);
  progressStore.set({ bookmarks: has ? p.bookmarks.filter((b) => b !== key) : [key, ...p.bookmarks] });
}

export function exportData(): string {
  return JSON.stringify({ app: 'cpp-forge', version: 1, progress: progressStore.get(), settings: settingsStore.get() }, null, 2);
}

export function importData(json: string): boolean {
  try {
    const data = JSON.parse(json);
    if (data?.app !== 'cpp-forge' || !data.progress) return false;
    progressStore.replace({ ...defaultProgress, ...data.progress });
    if (data.settings) settingsStore.replace({ ...defaultSettings, ...data.settings });
    return true;
  } catch {
    return false;
  }
}

window.addEventListener('pagehide', () => {
  progressStore.flush();
  settingsStore.flush();
});
