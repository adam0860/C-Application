import { useMemo, useState } from 'react';
import { courses, findLesson, glossary, isStub } from '../content';
import type { CourseId } from '../content/types';
import { CourseGlyph } from '../components/CourseGlyph';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { Inline } from '../components/RichText';
import { addDays, dayKey, greeting } from '../lib/dates';
import { courseProgress, nextLessonId } from '../lib/progress';
import { hashString } from '../lib/random';
import { navigate } from '../lib/router';
import { sfx } from '../lib/sound';
import { dueReviews, effectiveStreak, levelInfo, setSettings, todayXp, useProgress, useSettings } from '../lib/store';
import { openGlossary } from '../lib/ui';
import { ProgressRing } from './CourseScreen';

export function HomeScreen() {
  const p = useProgress();
  const s = useSettings();
  const streak = effectiveStreak(p);
  const today = todayXp(p);
  const lvl = levelInfo(p.xp);
  const due = dueReviews(p).length;

  // Continue where you left off: the course of the last lesson, else C++.
  const lastCourse: CourseId = (p.lastLessonId && findLesson(p.lastLessonId)?.course.id) || 'cpp';
  const nextId = nextLessonId(p, lastCourse) ?? nextLessonId(p, lastCourse === 'cpp' ? 'unreal' : 'cpp');
  const next = nextId ? findLesson(nextId) : null;
  const started = Object.keys(p.lessons).length > 0;

  const term = useMemo(() => {
    const pool = glossary.filter((g) => g.long);
    if (!pool.length) return null;
    return pool[hashString(dayKey()) % pool.length];
  }, []);

  const week = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(now, i - 6);
      const key = dayKey(d);
      return { key, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), xp: p.dailyXp[key] ?? 0, today: i === 6 };
    });
  }, [p.dailyXp]);

  return (
    <div className="screen home">
      <header className="home-head">
        <div>
          <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1>
            {greeting()}
            {s.name ? `, ${s.name}` : ''}!
          </h1>
        </div>
        <div className="home-chips">
          <span className={`chip-stat streak${streak > 0 ? ' lit' : ''}`} title="Day streak">
            <Icon name="flame" size={18} filled={streak > 0} /> {streak}
          </span>
          <span className="chip-stat level" title={`Level ${lvl.level}`}>
            <Icon name="zap" size={18} filled /> {p.xp}
          </span>
        </div>
      </header>

      <div className="home-grid">
        <section className="card goal-card">
          <div className="goal-ring">
            <ProgressRing value={today / s.dailyGoal} size={92} stroke={9} />
            <div className="goal-ring-text">
              <b>{today}</b>
              <span>/ {s.dailyGoal} XP</span>
            </div>
          </div>
          <div className="goal-text">
            <h2>Daily goal</h2>
            <p className="muted">
              {today >= s.dailyGoal
                ? 'Goal reached — brilliant work today! 🎉'
                : today > 0
                  ? `${s.dailyGoal - today} XP to go. One more lesson should do it.`
                  : 'Complete a lesson to start today’s progress.'}
            </p>
            <div className="week">
              {week.map((d) => (
                <div key={d.key} className={`week-day${d.xp > 0 ? ' done' : ''}${d.today ? ' today' : ''}`} title={`${d.key}: ${d.xp} XP`}>
                  <span className="week-dot">{d.xp > 0 ? <Icon name="check" size={12} strokeWidth={3.5} /> : null}</span>
                  <span className="week-label">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {next && (
          <section className={`card continue-card course-${next.course.id}`}>
            <div className="continue-top">
              <CourseGlyph course={next.course.id} size={44} />
              <div>
                <div className="eyebrow">{started ? 'Continue learning' : 'Start your journey'}</div>
                <div className="continue-course">
                  {next.course.title} · Unit {next.unitIndex + 1}
                </div>
              </div>
            </div>
            <h2 className="continue-title">{next.lesson.title}</h2>
            <p className="continue-summary">
              <Inline text={next.lesson.summary} />
            </p>
            <div className="continue-actions">
              <button
                type="button"
                className="btn btn-lg btn-primary"
                onClick={() => {
                  sfx.tap();
                  navigate(`/lesson/${next.lesson.id}`);
                }}
              >
                {started ? 'Continue' : 'Start'} <Icon name="arrow-right" size={18} />
              </button>
              <span className="muted small">
                <Icon name="clock" size={14} /> {next.lesson.minutes} min
              </span>
            </div>
          </section>
        )}
      </div>

      {due > 0 && (
        <button type="button" className="card review-card" onClick={() => navigate('/practice/review')}>
          <span className="review-icon">
            <Icon name="refresh" size={22} />
          </span>
          <span className="review-text">
            <b>
              {due} question{due === 1 ? '' : 's'} ready for review
            </b>
            <span className="muted">Revisit what tripped you up — spaced repetition locks it in.</span>
          </span>
          <Icon name="chevron-right" size={20} />
        </button>
      )}

      <h2 className="section-title">Courses</h2>
      <div className="course-cards">
        {courses.map((c) => {
          const cp = courseProgress(p, c.id);
          const written = c.units.flatMap((u) => u.lessons).filter((l) => !isStub(l)).length;
          return (
            <button key={c.id} type="button" className={`course-card course-${c.id}`} onClick={() => navigate(`/course/${c.id}`)}>
              <div className="course-card-top">
                <CourseGlyph course={c.id} size={56} />
                <span className="course-card-pct">{Math.round(cp.ratio * 100)}%</span>
              </div>
              <h3>{c.title}</h3>
              <p>{c.subtitle}</p>
              <div className="bar light">
                <div className="bar-fill" style={{ width: `${cp.ratio * 100}%` }} />
              </div>
              <div className="course-card-meta">
                {cp.done}/{cp.total} lessons · {c.units.length} units
                {written < cp.total ? ` · ${cp.total - written} coming soon` : ''}
              </div>
            </button>
          );
        })}
      </div>

      <div className="home-grid lower">
        {term && (
          <button type="button" className="card term-card" onClick={() => openGlossary(term.id)}>
            <div className="eyebrow">
              <Icon name="sparkles" size={14} /> Term of the day
            </div>
            <h3>{term.term}</h3>
            <p>
              <Inline text={term.short} />
            </p>
            <span className="link-like">
              Learn more <Icon name="arrow-right" size={14} />
            </span>
          </button>
        )}
        <div className="card quick-card">
          <div className="eyebrow">
            <Icon name="library" size={14} /> Quick reference
          </div>
          <button type="button" className="quick-link" onClick={() => navigate('/library/sheets')}>
            <span>🧾</span> Cheat sheets <Icon name="chevron-right" size={16} />
          </button>
          <button type="button" className="quick-link" onClick={() => navigate('/library/glossary')}>
            <span>📖</span> Glossary <Icon name="chevron-right" size={16} />
          </button>
          <button type="button" className="quick-link" onClick={() => navigate('/practice')}>
            <span>🎯</span> Practice <Icon name="chevron-right" size={16} />
          </button>
        </div>
      </div>

      {!s.onboarded && <Onboarding />}
    </div>
  );
}

function Onboarding() {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState(30);
  const [path, setPath] = useState<CourseId>('cpp');
  const finish = () => {
    setSettings({ onboarded: true, name: name.trim(), dailyGoal: goal });
    sfx.complete();
    navigate(`/course/${path}`);
  };
  return (
    <Modal open onClose={() => setSettings({ onboarded: true })} label="Welcome" className="onboarding">
      <div className="onb-hero">
        <CourseGlyph course="cpp" size={64} />
        <CourseGlyph course="unreal" size={64} />
      </div>
      <h2 className="sheet-title center">Welcome to C++ Forge</h2>
      <p className="center muted">
        Deep, interactive lessons that take you from your first line of C++ to gameplay programming in Unreal Engine — and always explain
        the <b>why</b>.
      </p>
      <label className="field">
        <span>What should we call you? (optional)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={30} />
      </label>
      <div className="field">
        <span>Daily goal</span>
        <div className="seg">
          {[
            [10, 'Casual'],
            [30, 'Regular'],
            [50, 'Serious'],
            [80, 'Intense'],
          ].map(([v, l]) => (
            <button key={v} type="button" className={`seg-btn${goal === v ? ' on' : ''}`} onClick={() => setGoal(v as number)}>
              <b>{l}</b>
              <small>{v} XP</small>
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Where do you want to start?</span>
        <div className="choice-list">
          <button type="button" className={`choice${path === 'cpp' ? ' on' : ''}`} onClick={() => setPath('cpp')}>
            <CourseGlyph course="cpp" size={36} />
            <span>
              <b>I’m new to C++</b>
              <small>Start with C++ Fundamentals</small>
            </span>
          </button>
          <button type="button" className={`choice${path === 'unreal' ? ' on' : ''}`} onClick={() => setPath('unreal')}>
            <CourseGlyph course="unreal" size={36} />
            <span>
              <b>I know C++ — take me to Unreal</b>
              <small>Start with Unreal Engine C++</small>
            </span>
          </button>
        </div>
      </div>
      <button type="button" className="btn btn-lg btn-primary full" onClick={finish}>
        Let’s go <Icon name="arrow-right" size={18} />
      </button>
    </Modal>
  );
}
