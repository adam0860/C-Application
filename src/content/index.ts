import type { Course, CourseId, GlossaryEntry, Lesson, Unit } from './types';
import { cppCourse } from './cpp';
import { unrealCourse } from './unreal';
import { glossary } from './glossary';
import { cheatSheets } from './cheatsheets';

export const courses: Course[] = [cppCourse, unrealCourse];
export { glossary, cheatSheets };

export interface LessonLocation {
  course: Course;
  unit: Unit;
  lesson: Lesson;
  unitIndex: number;
  lessonIndex: number;
  /** Position of the lesson within the whole course (0-based). */
  globalIndex: number;
}

const lessonIndex = new Map<string, LessonLocation>();
const courseLessons = new Map<CourseId, LessonLocation[]>();
for (const course of courses) {
  const list: LessonLocation[] = [];
  course.units.forEach((unit, unitIndex) => {
    unit.lessons.forEach((lesson, li) => {
      const loc = { course, unit, lesson, unitIndex, lessonIndex: li, globalIndex: list.length };
      list.push(loc);
      lessonIndex.set(lesson.id, loc);
    });
  });
  courseLessons.set(course.id, list);
}

const glossaryIndex = new Map<string, GlossaryEntry>(glossary.map((g) => [g.id, g]));

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}
export function findLesson(id: string): LessonLocation | undefined {
  return lessonIndex.get(id);
}
export function lessonsOf(courseId: CourseId): LessonLocation[] {
  return courseLessons.get(courseId) ?? [];
}
export function getGlossaryEntry(id: string): GlossaryEntry | undefined {
  return glossaryIndex.get(id);
}
/** Lessons still awaiting content (scaffold stubs). */
export function isStub(lesson: Lesson): boolean {
  return lesson.summary === 'This lesson is being written.';
}
