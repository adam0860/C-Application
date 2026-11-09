import { courses } from '../content';
import { effectiveStreak, progressStore, type Progress } from './store';
import { sfx } from './sound';
import { toast } from './ui';

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  test: (p: Progress) => boolean;
}

const completedCount = (p: Progress) => Object.keys(p.lessons).length;
const unitDone = (unitId: string) => (p: Progress) => {
  const unit = courses.flatMap((c) => c.units).find((u) => u.id === unitId);
  return !!unit && unit.lessons.every((l) => p.lessons[l.id]);
};
const courseDone = (courseId: string) => (p: Progress) => {
  const course = courses.find((c) => c.id === courseId);
  return !!course && course.units.every((u) => u.lessons.every((l) => p.lessons[l.id]));
};
const anyUnitDone = (p: Progress) => courses.some((c) => c.units.some((u) => u.lessons.every((l) => p.lessons[l.id])));

export const achievements: Achievement[] = [
  { id: 'first-lesson', icon: '🌱', title: 'First Steps', description: 'Complete your first lesson.', test: (p) => completedCount(p) >= 1 },
  { id: 'flawless', icon: '💎', title: 'Flawless', description: 'Finish a lesson with 100% accuracy.', test: (p) => p.stats.perfectLessons >= 1 },
  { id: 'five-perfect', icon: '🏹', title: 'Sharpshooter', description: 'Finish 5 lessons with 100% accuracy.', test: (p) => p.stats.perfectLessons >= 5 },
  { id: 'lessons-5', icon: '🔥', title: 'Warming Up', description: 'Complete 5 lessons.', test: (p) => completedCount(p) >= 5 },
  { id: 'lessons-25', icon: '📚', title: 'Dedicated', description: 'Complete 25 lessons.', test: (p) => completedCount(p) >= 25 },
  { id: 'lessons-60', icon: '🎓', title: 'Scholar', description: 'Complete 60 lessons.', test: (p) => completedCount(p) >= 60 },
  { id: 'lessons-100', icon: '🏛️', title: 'Centurion', description: 'Complete 100 lessons.', test: (p) => completedCount(p) >= 100 },
  { id: 'unit-cleared', icon: '🧱', title: 'Unit Cleared', description: 'Complete every lesson in a unit.', test: anyUnitDone },
  { id: 'streak-3', icon: '⚡', title: 'On a Roll', description: 'Reach a 3-day streak.', test: (p) => Math.max(p.streak.best, effectiveStreak(p)) >= 3 },
  { id: 'streak-7', icon: '📅', title: 'Week Warrior', description: 'Reach a 7-day streak.', test: (p) => p.streak.best >= 7 },
  { id: 'streak-30', icon: '🌋', title: 'Unstoppable', description: 'Reach a 30-day streak.', test: (p) => p.streak.best >= 30 },
  { id: 'xp-500', icon: '✨', title: 'XP Collector', description: 'Earn 500 XP.', test: (p) => p.xp >= 500 },
  { id: 'xp-2500', icon: '🌟', title: 'XP Hoarder', description: 'Earn 2,500 XP.', test: (p) => p.xp >= 2500 },
  { id: 'reviewer', icon: '🔁', title: 'Second Chances', description: 'Complete a practice session.', test: (p) => p.stats.practiceSessions >= 1 },
  { id: 'reviewer-10', icon: '🧠', title: 'Spaced Out', description: 'Complete 10 practice sessions.', test: (p) => p.stats.practiceSessions >= 10 },
  { id: 'pointer-pro', icon: '📍', title: 'Pointer Pro', description: 'Finish the Pointers and References unit.', test: unitDone('cpp-u08-pointers') },
  { id: 'class-act', icon: '🏗️', title: 'Class Act', description: 'Finish the Classes and Objects unit.', test: unitDone('cpp-u09-classes') },
  { id: 'memory-master', icon: '🧠', title: 'Memory Master', description: 'Finish the Modern Memory Management unit.', test: unitDone('cpp-u11-modern-memory') },
  { id: 'template-wizard', icon: '🧙', title: 'Template Wizard', description: 'Finish the Templates unit.', test: unitDone('cpp-u12-templates') },
  { id: 'cpp-graduate', icon: '🎖️', title: 'C++ Graduate', description: 'Complete the entire C++ Fundamentals course.', test: courseDone('cpp') },
  { id: 'mirror', icon: '🪞', title: 'Mirror, Mirror', description: 'Finish the UObject and Reflection unit.', test: unitDone('ue-u03-uobject') },
  { id: 'netcode', icon: '🌐', title: 'Netcode Navigator', description: 'Finish the Networking and Replication unit.', test: unitDone('ue-u14-networking') },
  { id: 'first-window', icon: '🪟', title: 'First Window', description: 'Finish the Getting Started with SFML unit.', test: unitDone('sfml-u01-setup') },
  { id: 'game-feel', icon: '🎞️', title: 'Game Feel', description: 'Finish the Animation, Tiles and Audio unit.', test: unitDone('sfml-u04-animation-audio') },
  { id: 'sfml-developer', icon: '🕹️', title: 'SFML Game Dev', description: 'Complete the entire SFML Game Development course.', test: courseDone('sfml') },
  { id: 'unreal-engineer', icon: '🏆', title: 'Unreal Engineer', description: 'Complete the entire Unreal Engine C++ course.', test: courseDone('unreal') },
  {
    id: 'night-owl',
    icon: '🦉',
    title: 'Night Owl',
    description: 'Complete a lesson after 10 pm.',
    test: (p) => Object.values(p.lessons).some((l) => new Date(l.completedAt).getHours() >= 22),
  },
  {
    id: 'early-bird',
    icon: '🐦',
    title: 'Early Bird',
    description: 'Complete a lesson before 7 am.',
    test: (p) => Object.values(p.lessons).some((l) => new Date(l.completedAt).getHours() < 7),
  },
];

/** Check for newly earned achievements, store them and announce them. */
export function checkAchievements(): Achievement[] {
  const p = progressStore.get();
  const fresh = achievements.filter((a) => !p.achievements[a.id] && a.test(p));
  if (fresh.length) {
    const now = Date.now();
    progressStore.set({ achievements: { ...p.achievements, ...Object.fromEntries(fresh.map((a) => [a.id, now])) } });
    fresh.forEach((a, i) =>
      setTimeout(() => {
        sfx.achievement();
        toast({ icon: a.icon, title: `Achievement unlocked: ${a.title}`, body: a.description, tone: 'achievement' }, 4200);
      }, 900 + i * 1200),
    );
  }
  return fresh;
}
