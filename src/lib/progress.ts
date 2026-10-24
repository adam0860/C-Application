import { findLesson, lessonsOf, isStub } from '../content';
import type { CourseId } from '../content/types';
import type { AnswerRecord } from '../screens/Player';
import { checkAchievements } from './achievements';
import { awardXp, progressStore, recordReview, settingsStore, type Progress } from './store';

export interface CompletionSummary {
  xp: number;
  accuracy: number;
  correct: number;
  total: number;
  perfect: boolean;
  firstCompletion: boolean;
  streakExtended: boolean;
  leveledUp: boolean;
  seconds: number;
}

function recordAnswers(answers: AnswerRecord[], alwaysSchedule: boolean) {
  for (const a of answers) {
    const qid = a.item.step.kind !== 'concept' && a.item.step.id ? a.item.step.id : `${a.item.lessonId}#${a.item.stepIndex}`;
    if (alwaysSchedule || !a.firstTryCorrect) {
      recordReview({ qid, lessonId: a.item.lessonId, stepIndex: a.item.stepIndex }, a.firstTryCorrect);
    }
  }
}

export function completeLesson(lessonId: string, answers: AnswerRecord[], seconds: number): CompletionSummary {
  const p = progressStore.get();
  const total = answers.length;
  const correct = answers.filter((a) => a.firstTryCorrect).length;
  const accuracy = total ? correct / total : 1;
  const perfect = correct === total;
  const prev = p.lessons[lessonId];
  const firstCompletion = !prev;
  let xp = 10 + correct * 2 + (perfect ? 5 : 0);
  if (!firstCompletion) xp = Math.ceil(xp / 2);

  recordAnswers(answers, false);
  const now = Date.now();
  progressStore.set((s) => ({
    lessons: {
      ...s.lessons,
      [lessonId]: {
        completedAt: prev?.completedAt ?? now,
        bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
        lastAccuracy: accuracy,
        attempts: (prev?.attempts ?? 0) + 1,
      },
    },
    stats: {
      ...s.stats,
      questionsAnswered: s.stats.questionsAnswered + total,
      questionsCorrect: s.stats.questionsCorrect + correct,
      secondsLearning: s.stats.secondsLearning + seconds,
      perfectLessons: s.stats.perfectLessons + (perfect && total > 0 ? 1 : 0),
    },
    lastLessonId: lessonId,
  }));
  const { streakExtended, leveledUp } = awardXp(xp);
  checkAchievements();
  return { xp, accuracy, correct, total, perfect, firstCompletion, streakExtended, leveledUp, seconds };
}

export function completePractice(answers: AnswerRecord[], seconds: number): CompletionSummary {
  const total = answers.length;
  const correct = answers.filter((a) => a.firstTryCorrect).length;
  const xp = 5 + correct * 2;
  recordAnswers(answers, true);
  progressStore.set((s) => ({
    stats: {
      ...s.stats,
      questionsAnswered: s.stats.questionsAnswered + total,
      questionsCorrect: s.stats.questionsCorrect + correct,
      secondsLearning: s.stats.secondsLearning + seconds,
      practiceSessions: s.stats.practiceSessions + 1,
    },
  }));
  const { streakExtended, leveledUp } = awardXp(xp);
  checkAchievements();
  return {
    xp,
    accuracy: total ? correct / total : 1,
    correct,
    total,
    perfect: correct === total,
    firstCompletion: false,
    streakExtended,
    leveledUp,
    seconds,
  };
}

/** Is a lesson available to start? Lessons unlock in order unless free navigation is on. */
export function isUnlocked(p: Progress, lessonId: string): boolean {
  if (settingsStore.get().freeNavigation) return true;
  const loc = findLesson(lessonId);
  if (!loc) return false;
  if (p.lessons[lessonId]) return true;
  const list = lessonsOf(loc.course.id);
  if (loc.globalIndex === 0) return true;
  // Unlocked when the previous written lesson is complete (stub lessons are skipped).
  for (let i = loc.globalIndex - 1; i >= 0; i--) {
    const prev = list[i].lesson;
    if (isStub(prev)) continue;
    return !!p.lessons[prev.id];
  }
  return true;
}

/** The next lesson the learner should take in a course (first incomplete, written lesson). */
export function nextLessonId(p: Progress, courseId: CourseId): string | null {
  const list = lessonsOf(courseId).filter((l) => !isStub(l.lesson));
  return list.find((l) => !p.lessons[l.lesson.id])?.lesson.id ?? null;
}

export function courseProgress(p: Progress, courseId: CourseId) {
  const list = lessonsOf(courseId);
  const done = list.filter((l) => p.lessons[l.lesson.id]).length;
  return { done, total: list.length, ratio: list.length ? done / list.length : 0 };
}

export function lessonAfter(lessonId: string): string | null {
  const loc = findLesson(lessonId);
  if (!loc) return null;
  const list = lessonsOf(loc.course.id);
  for (let i = loc.globalIndex + 1; i < list.length; i++) if (!isStub(list[i].lesson)) return list[i].lesson.id;
  return null;
}
