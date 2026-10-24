import { useMemo, useState } from 'react';
import { findLesson } from '../content';
import type { ReadingRef } from '../content/types';
import { Confetti } from '../components/Confetti';
import { Icon } from '../components/Icon';
import { Inline } from '../components/RichText';
import { ReadingList } from '../components/ReadingList';
import { completeLesson, lessonAfter, type CompletionSummary } from '../lib/progress';
import { goBack, navigate } from '../lib/router';
import { sfx } from '../lib/sound';
import { haptic } from '../lib/platform';
import { effectiveStreak, useProgress, useSettings } from '../lib/store';
import { formatMinutes } from '../lib/dates';
import { Player, type PlayerItem, type PlayerResult } from './Player';
import { NotFound } from './NotFound';

export function LessonScreen({ lessonId }: { lessonId: string }) {
  const loc = findLesson(lessonId);
  const [summary, setSummary] = useState<CompletionSummary | null>(null);
  const [run, setRun] = useState(0);
  const items: PlayerItem[] = useMemo(
    () => (loc ? loc.lesson.steps.map((step, stepIndex) => ({ lessonId, stepIndex, step })) : []),
    [loc, lessonId],
  );
  if (!loc) return <NotFound />;
  const { lesson, course } = loc;

  const onComplete = (r: PlayerResult) => {
    const s = completeLesson(lesson.id, r.answers, r.seconds);
    sfx.complete();
    void haptic('success');
    setSummary(s);
  };

  if (summary) {
    return (
      <CompleteView
        key={run}
        title={summary.perfect ? 'Perfect lesson!' : 'Lesson complete!'}
        subtitle={lesson.title}
        summary={summary}
        takeaways={lesson.takeaways}
        reading={lesson.reading}
        primaryLabel={lessonAfter(lesson.id) ? 'Next lesson' : 'Back to course'}
        onPrimary={() => {
          const next = lessonAfter(lesson.id);
          navigate(next ? `/lesson/${next}` : `/course/${course.id}`, { replace: true });
        }}
        secondary={[
          { label: 'Back to course', icon: 'learn', onClick: () => navigate(`/course/${course.id}`, { replace: true }) },
          { label: 'Read notes', icon: 'book-open', onClick: () => navigate(`/notes/${lesson.id}`, { replace: true }) },
          {
            label: 'Retry',
            icon: 'refresh',
            onClick: () => {
              setSummary(null);
              setRun((n) => n + 1);
            },
          },
        ]}
      />
    );
  }

  return <Player key={run} items={items} title={lesson.title} onExit={() => goBack(`/course/${course.id}`)} onComplete={onComplete} />;
}

export function CompleteView({
  title,
  subtitle,
  summary,
  takeaways,
  reading,
  primaryLabel,
  onPrimary,
  secondary,
}: {
  title: string;
  subtitle: string;
  summary: CompletionSummary;
  takeaways?: string[];
  reading?: ReadingRef[];
  primaryLabel: string;
  onPrimary: () => void;
  secondary: { label: string; icon: string; onClick: () => void }[];
}) {
  const settings = useSettings();
  const p = useProgress();
  const streak = effectiveStreak(p);
  const pct = Math.round(summary.accuracy * 100);
  return (
    <div className="complete">
      {settings.celebrations && <Confetti />}
      <div className="complete-scroll">
        <div className="complete-inner">
          <div className={`medal${summary.perfect ? ' perfect' : ''}`}>
            <div className="medal-ring" />
            <span className="medal-icon">{summary.perfect ? '💎' : pct >= 70 ? '🏆' : '🎯'}</span>
          </div>
          <h1 className="complete-title">{title}</h1>
          <p className="complete-sub">{subtitle}</p>

          <div className="stat-tiles">
            <div className="stat-tile xp">
              <div className="stat-label">
                <Icon name="zap" size={14} /> XP earned
              </div>
              <div className="stat-value">+{summary.xp}</div>
            </div>
            <div className={`stat-tile acc${pct >= 80 ? ' good' : pct >= 50 ? ' ok' : ' low'}`}>
              <div className="stat-label">
                <Icon name="target" size={14} /> Accuracy
              </div>
              <div className="stat-value">{summary.total ? `${pct}%` : '—'}</div>
            </div>
            <div className="stat-tile time">
              <div className="stat-label">
                <Icon name="clock" size={14} /> Time
              </div>
              <div className="stat-value">{formatMinutes(Math.max(60, summary.seconds))}</div>
            </div>
          </div>

          {summary.streakExtended && streak > 0 && (
            <div className="streak-banner">
              <span className="streak-flame">🔥</span>
              <div>
                <b>{streak}-day streak!</b>
                <div className="muted">{streak === 1 ? 'You started a new streak. Come back tomorrow to keep it going.' : 'You kept your streak alive. See you tomorrow!'}</div>
              </div>
            </div>
          )}
          {summary.leveledUp && (
            <div className="streak-banner level">
              <span className="streak-flame">⬆️</span>
              <div>
                <b>Level up!</b>
                <div className="muted">Your hard work is paying off.</div>
              </div>
            </div>
          )}

          {takeaways && takeaways.length > 0 && (
            <section className="complete-section">
              <h2>
                <Icon name="check" size={18} /> Key takeaways
              </h2>
              <ul className="takeaways">
                {takeaways.map((t, i) => (
                  <li key={i}>
                    <Inline text={t} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {reading && reading.length > 0 && (
            <section className="complete-section">
              <h2>
                <Icon name="library" size={18} /> Keep reading
              </h2>
              <ReadingList refs={reading} />
            </section>
          )}
        </div>
      </div>
      <footer className="complete-foot">
        <div className="complete-secondary">
          {secondary.map((s) => (
            <button key={s.label} type="button" className="btn btn-ghost" onClick={s.onClick}>
              <Icon name={s.icon} size={18} /> {s.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-lg btn-primary" onClick={onPrimary} autoFocus>
          {primaryLabel} <Icon name="arrow-right" size={18} />
        </button>
      </footer>
    </div>
  );
}
