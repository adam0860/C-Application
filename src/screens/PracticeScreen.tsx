import { useState } from 'react';
import { courses, findLesson, isStub, lessonsOf } from '../content';
import type { CourseId, QuestionStep } from '../content/types';
import { CourseGlyph } from '../components/CourseGlyph';
import { Icon } from '../components/Icon';
import { completePractice, type CompletionSummary } from '../lib/progress';
import { shuffled } from '../lib/random';
import { goBack, navigate } from '../lib/router';
import { sfx } from '../lib/sound';
import { haptic } from '../lib/platform';
import { dueReviews, progressStore, useProgress, type Progress } from '../lib/store';
import { CompleteView } from './LessonScreen';
import { Player, type PlayerItem, type PlayerResult } from './Player';

function questionItems(lessonIds: string[]): PlayerItem[] {
  const out: PlayerItem[] = [];
  for (const id of lessonIds) {
    const loc = findLesson(id);
    if (!loc) continue;
    loc.lesson.steps.forEach((step, stepIndex) => {
      if (step.kind !== 'concept') out.push({ lessonId: id, stepIndex, step, context: loc.lesson.title });
    });
  }
  return out;
}

function reviewItems(p: Progress): PlayerItem[] {
  return dueReviews(p)
    .slice(0, 15)
    .flatMap((r) => {
      const loc = findLesson(r.lessonId);
      const step = loc?.lesson.steps[r.stepIndex];
      if (!loc || !step || step.kind === 'concept') return [];
      return [{ lessonId: r.lessonId, stepIndex: r.stepIndex, step: step as QuestionStep, context: loc.lesson.title }];
    });
}

const completedIn = (p: Progress, courseId: CourseId) => lessonsOf(courseId).filter((l) => p.lessons[l.lesson.id]).map((l) => l.lesson.id);

export function PracticeHub() {
  const p = useProgress();
  const due = dueReviews(p).length;
  const tracked = Object.keys(p.review).length;
  const accuracy = p.stats.questionsAnswered ? Math.round((p.stats.questionsCorrect / p.stats.questionsAnswered) * 100) : null;

  return (
    <div className="screen practice">
      <header className="page-head">
        <h1>Practice</h1>
        <p className="muted">Strengthen what you’ve learned. Mistakes come back at growing intervals until they stick.</p>
      </header>

      <div className="practice-stats">
        <div className="mini-stat">
          <b>{due}</b>
          <span>due now</span>
        </div>
        <div className="mini-stat">
          <b>{tracked}</b>
          <span>in review</span>
        </div>
        <div className="mini-stat">
          <b>{accuracy === null ? '—' : `${accuracy}%`}</b>
          <span>accuracy</span>
        </div>
        <div className="mini-stat">
          <b>{p.stats.practiceSessions}</b>
          <span>sessions</span>
        </div>
      </div>

      <button type="button" className={`card practice-card review${due ? '' : ' disabled'}`} onClick={() => due && navigate('/practice/review')}>
        <span className="pc-icon">
          <Icon name="refresh" size={26} />
        </span>
        <span className="pc-text">
          <b>Review mistakes</b>
          <span className="muted">
            {due ? `${Math.min(due, 15)} question${due === 1 ? '' : 's'} ready — spaced repetition at work.` : tracked ? 'Nothing due right now. Check back later!' : 'Questions you miss in lessons will appear here.'}
          </span>
        </span>
        {due > 0 && <span className="badge">{due}</span>}
      </button>

      <h2 className="section-title">Quick quiz</h2>
      <div className="practice-grid">
        {courses.map((c) => {
          const n = completedIn(p, c.id).length;
          return (
            <button key={c.id} type="button" className={`card practice-card course-${c.id}${n ? '' : ' disabled'}`} onClick={() => n && navigate(`/practice/quick/${c.id}`)}>
              <CourseGlyph course={c.id} size={44} />
              <span className="pc-text">
                <b>{c.title}</b>
                <span className="muted">{n ? `10 random questions from your ${n} completed lesson${n === 1 ? '' : 's'}` : 'Complete a lesson to unlock'}</span>
              </span>
              <Icon name="shuffle" size={20} />
            </button>
          );
        })}
      </div>

      <h2 className="section-title">Unit drills</h2>
      {courses.map((c) => (
        <div key={c.id} className="drill-group">
          <div className="drill-course">
            <CourseGlyph course={c.id} size={22} /> {c.title}
          </div>
          <div className="drill-list">
            {c.units.map((u, ui) => {
              const done = u.lessons.filter((l) => p.lessons[l.id]).length;
              const enabled = done > 0;
              return (
                <button key={u.id} type="button" className={`drill${enabled ? '' : ' disabled'}`} onClick={() => enabled && navigate(`/practice/unit/${u.id}`)} title={enabled ? `Drill ${u.title}` : 'Complete a lesson in this unit first'}>
                  <span className="drill-icon">{u.icon}</span>
                  <span className="drill-text">
                    <span className="drill-num">Unit {ui + 1}</span>
                    <span className="drill-title">{u.title}</span>
                  </span>
                  <span className="drill-count">
                    {done}/{u.lessons.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PracticeSession({ mode, target }: { mode: 'review' | 'quick' | 'unit'; target?: string }) {
  const [items] = useState<PlayerItem[]>(() => {
    const p = progressStore.get();
    if (mode === 'review') return reviewItems(p);
    if (mode === 'quick') {
      const ids = completedIn(p, target === 'unreal' ? 'unreal' : 'cpp');
      return shuffled(questionItems(ids), Date.now() % 100000).slice(0, 10);
    }
    const unit = courses.flatMap((c) => c.units).find((u) => u.id === target);
    const ids = unit ? unit.lessons.filter((l) => p.lessons[l.id] && !isStub(l)).map((l) => l.id) : [];
    return shuffled(questionItems(ids), Date.now() % 100000).slice(0, 12);
  });
  const [summary, setSummary] = useState<CompletionSummary | null>(null);
  const title = mode === 'review' ? 'Review' : mode === 'quick' ? 'Quick quiz' : 'Unit drill';

  if (items.length === 0) {
    return (
      <div className="screen center-screen">
        <div className="empty">
          <div className="empty-icon">🎉</div>
          <h2>All caught up</h2>
          <p className="muted">There’s nothing to practice here right now.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/practice', { replace: true })}>
            Back to practice
          </button>
        </div>
      </div>
    );
  }

  if (summary) {
    return (
      <CompleteView
        title={summary.perfect ? 'Flawless practice!' : 'Practice complete!'}
        subtitle={`${title} · ${summary.correct} of ${summary.total} correct`}
        summary={summary}
        primaryLabel="Done"
        onPrimary={() => navigate('/practice', { replace: true })}
        secondary={[{ label: 'Home', icon: 'home', onClick: () => navigate('/', { replace: true }) }]}
      />
    );
  }

  const onComplete = (r: PlayerResult) => {
    const s = completePractice(r.answers, r.seconds);
    sfx.complete();
    void haptic('success');
    setSummary(s);
  };
  return <Player items={items} title={title} onExit={() => goBack('/practice')} onComplete={onComplete} />;
}
