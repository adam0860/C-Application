import { useEffect, useMemo, useRef, useState } from 'react';
import { courses, getCourse, isStub, lessonsOf, type LessonLocation } from '../content';
import type { CourseId } from '../content/types';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { Inline } from '../components/RichText';
import { courseProgress, isUnlocked, nextLessonId } from '../lib/progress';
import { navigate } from '../lib/router';
import { sfx } from '../lib/sound';
import { toggleBookmark, useProgress, useSettings, type Progress } from '../lib/store';
import { CourseGlyph } from '../components/CourseGlyph';

const UNIT_GRADIENTS = [
  ['#2563eb', '#06b6d4'],
  ['#7c3aed', '#db2777'],
  ['#059669', '#0ea5e9'],
  ['#ea580c', '#e11d48'],
  ['#4f46e5', '#7c3aed'],
  ['#0891b2', '#10b981'],
  ['#c026d3', '#f97316'],
  ['#0f766e', '#4d7c0f'],
];
const OFFSETS = [0, 1, 1.55, 1, 0, -1, -1.55, -1];

export function CourseScreen({ courseId }: { courseId: string }) {
  const course = getCourse(courseId) ?? courses[0];
  const p = useProgress();
  const settings = useSettings();
  const [sheet, setSheet] = useState<LessonLocation | null>(null);
  const currentRef = useRef<HTMLButtonElement>(null);
  const next = nextLessonId(p, course.id);
  const prog = courseProgress(p, course.id);
  const cppProg = courseProgress(p, 'cpp');
  const all = useMemo(() => lessonsOf(course.id), [course.id]);
  const totalMinutes = all.reduce((s, l) => s + l.lesson.minutes, 0);

  useEffect(() => {
    const t = setTimeout(() => currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
    return () => clearTimeout(t);
  }, [course.id]);

  return (
    <div className="screen course-screen">
      <div className="course-switch" role="tablist">
        {courses.map((c) => (
          <button
            key={c.id}
            role="tab"
            type="button"
            aria-selected={c.id === course.id}
            className={`course-tab${c.id === course.id ? ' on' : ''} course-${c.id}`}
            onClick={() => {
              sfx.tap();
              navigate(`/course/${c.id}`, { replace: true });
            }}
          >
            <CourseGlyph course={c.id} size={22} />
            <span>{c.id === 'cpp' ? 'C++' : 'Unreal C++'}</span>
          </button>
        ))}
      </div>

      <header className={`course-hero course-${course.id}`}>
        <div className="course-hero-text">
          <div className="eyebrow">{course.id === 'cpp' ? 'Course 1' : 'Course 2'}</div>
          <h1>{course.title}</h1>
          <p>{course.subtitle}</p>
          <div className="hero-meta">
            <span>
              <Icon name="layers" size={15} /> {course.units.length} units
            </span>
            <span>
              <Icon name="book-open" size={15} /> {all.length} lessons
            </span>
            <span>
              <Icon name="clock" size={15} /> ~{Math.round(totalMinutes / 60)} hours
            </span>
          </div>
          <div className="hero-progress">
            <div className="bar">
              <div className="bar-fill" style={{ width: `${prog.ratio * 100}%` }} />
            </div>
            <span>{Math.round(prog.ratio * 100)}%</span>
          </div>
        </div>
        <CourseGlyph course={course.id} size={96} className="hero-glyph" />
      </header>

      {course.id === 'unreal' && cppProg.ratio < 0.3 && (
        <div className="recommend">
          <Icon name="info" size={18} />
          <div>
            <b>New to C++?</b> Unreal C++ builds directly on standard C++. We recommend working through C++ Fundamentals first —
            or dive in if you already know the basics.
          </div>
          <button type="button" className="btn btn-sm btn-soft" onClick={() => navigate('/course/cpp', { replace: true })}>
            Go to C++
          </button>
        </div>
      )}

      {course.units.map((unit, ui) => {
        const [g1, g2] = UNIT_GRADIENTS[ui % UNIT_GRADIENTS.length];
        const done = unit.lessons.filter((l) => p.lessons[l.id]).length;
        const locs = all.filter((l) => l.unit.id === unit.id);
        return (
          <section className="unit" key={unit.id}>
            <div className="unit-banner" style={{ ['--g1' as string]: g1, ['--g2' as string]: g2 }}>
              <div className="unit-icon">{unit.icon}</div>
              <div className="unit-text">
                <div className="unit-eyebrow">Unit {ui + 1}</div>
                <h2>{unit.title}</h2>
                <p>{unit.description}</p>
              </div>
              <div className="unit-count" title={`${done} of ${unit.lessons.length} lessons complete`}>
                <ProgressRing value={done / unit.lessons.length} size={46} stroke={5} light />
                <span>
                  {done}/{unit.lessons.length}
                </span>
              </div>
            </div>
            <div className="path">
              {locs.map((loc, li) => {
                const state = nodeState(p, loc, next);
                const offset = OFFSETS[(li + ui * 3) % OFFSETS.length];
                return (
                  <div className="path-row" key={loc.lesson.id} style={{ ['--x' as string]: offset }}>
                    <button
                      type="button"
                      ref={state === 'current' ? currentRef : undefined}
                      className={`node node-${state}`}
                      onClick={() => {
                        sfx.tap();
                        setSheet(loc);
                      }}
                      aria-label={`${loc.lesson.title} (${state})`}
                    >
                      {state === 'current' && <span className="node-bubble">{p.lessons[loc.lesson.id] ? 'Review' : 'Start'}</span>}
                      <span className="node-face">
                        <Icon name={NODE_ICON[state]} size={state === 'perfect' ? 26 : 24} filled={state === 'perfect'} strokeWidth={state === 'done' ? 3 : 2} />
                      </span>
                    </button>
                    <div className="node-label">
                      <span className="node-title">{loc.lesson.title}</span>
                      <span className="node-meta">{isStub(loc.lesson) ? 'Coming soon' : `${loc.lesson.minutes} min`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="course-end">
        <div className="course-end-icon">🏁</div>
        <p className="muted">
          {course.id === 'cpp' ? 'Finish line: you’ll be ready for Unreal Engine C++.' : 'Finish line: you’ll be writing real gameplay code.'}
        </p>
      </div>

      <LessonSheet loc={sheet} onClose={() => setSheet(null)} progress={p} freeNav={settings.freeNavigation} />
    </div>
  );
}

type NodeState = 'perfect' | 'done' | 'current' | 'open' | 'locked' | 'stub';
const NODE_ICON: Record<NodeState, string> = {
  perfect: 'star',
  done: 'check',
  current: 'play',
  open: 'book-open',
  locked: 'lock',
  stub: 'clock',
};

function nodeState(p: Progress, loc: LessonLocation, next: string | null): NodeState {
  if (isStub(loc.lesson)) return 'stub';
  const lp = p.lessons[loc.lesson.id];
  if (loc.lesson.id === next) return 'current';
  if (lp) return lp.bestAccuracy >= 1 ? 'perfect' : 'done';
  return isUnlocked(p, loc.lesson.id) ? 'open' : 'locked';
}

export function ProgressRing({ value, size = 40, stroke = 4, light }: { value: number; size?: number; stroke?: number; light?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className={`ring${light ? ' light' : ''}`} viewBox={`0 0 ${size} ${size}`}>
      <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
      <circle
        className="ring-fill"
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function LessonSheet({ loc, onClose, progress: p, freeNav }: { loc: LessonLocation | null; onClose: () => void; progress: Progress; freeNav: boolean }) {
  if (!loc) return null;
  const { lesson, unit, unitIndex } = loc;
  const lp = p.lessons[lesson.id];
  const stub = isStub(lesson);
  const unlocked = isUnlocked(p, lesson.id);
  const questions = lesson.steps.filter((s) => s.kind !== 'concept').length;
  const bookmarked = p.bookmarks.includes(`lesson:${lesson.id}`);
  const go = (path: string) => {
    onClose();
    navigate(path);
  };
  return (
    <Modal open onClose={onClose} label={lesson.title} className="lesson-sheet">
      <div className="sheet-eyebrow">
        Unit {unitIndex + 1} · {unit.title}
      </div>
      <h2 className="sheet-title">{lesson.title}</h2>
      <p className="sheet-summary">
        <Inline text={lesson.summary} />
      </p>
      {!stub && (
        <div className="sheet-meta">
          <span>
            <Icon name="clock" size={15} /> {lesson.minutes} min
          </span>
          <span>
            <Icon name="help" size={15} /> {questions} questions
          </span>
          {lp && (
            <span className="good-text">
              <Icon name="target" size={15} /> Best {Math.round(lp.bestAccuracy * 100)}%
            </span>
          )}
        </div>
      )}
      {lesson.objectives.length > 0 && (
        <div className="sheet-objectives">
          <div className="sheet-sub">You’ll learn to</div>
          <ul>
            {lesson.objectives.map((o, i) => (
              <li key={i}>
                <Icon name="check" size={15} strokeWidth={3} />
                <span>
                  <Inline text={o} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {stub ? (
        <div className="locked-note">
          <Icon name="clock" size={16} /> This lesson is still being written. Check back after the next update.
        </div>
      ) : !unlocked ? (
        <div className="locked-note">
          <Icon name="lock" size={16} /> Complete the previous lesson to unlock this one{freeNav ? '' : ' — or turn on “Unlock all lessons” in Settings'}.
        </div>
      ) : null}
      <div className="sheet-actions">
        {!stub && (
          <button
            type="button"
            className="icon-btn bordered"
            onClick={() => toggleBookmark(`lesson:${lesson.id}`)}
            aria-pressed={bookmarked}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark lesson'}
          >
            <Icon name="bookmark" size={20} filled={bookmarked} />
          </button>
        )}
        {!stub && (
          <button type="button" className="btn btn-soft" onClick={() => go(`/notes/${lesson.id}`)}>
            <Icon name="book-open" size={18} /> Notes
          </button>
        )}
        {!stub && unlocked && (
          <button type="button" className="btn btn-primary grow" onClick={() => go(`/lesson/${lesson.id}`)}>
            {lp ? 'Practice again' : 'Start lesson'} <Icon name="arrow-right" size={18} />
          </button>
        )}
      </div>
    </Modal>
  );
}

export function courseOf(id: string): CourseId {
  return id === 'unreal' ? 'unreal' : 'cpp';
}
