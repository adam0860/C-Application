import { useMemo } from 'react';
import { courses } from '../content';
import { CourseGlyph } from '../components/CourseGlyph';
import { Icon } from '../components/Icon';
import { achievements } from '../lib/achievements';
import { addDays, dayKey, formatMinutes } from '../lib/dates';
import { courseProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { effectiveStreak, levelInfo, useProgress, useSettings } from '../lib/store';

export function ProfileScreen() {
  const p = useProgress();
  const s = useSettings();
  const lvl = levelInfo(p.xp);
  const streak = effectiveStreak(p);
  const lessonsDone = Object.keys(p.lessons).length;
  const accuracy = p.stats.questionsAnswered ? Math.round((p.stats.questionsCorrect / p.stats.questionsAnswered) * 100) : null;
  const unlocked = achievements.filter((a) => p.achievements[a.id]).length;
  const initials = (s.name || 'C++')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="screen profile">
      <header className="profile-hero">
        <div className="avatar">{initials}</div>
        <div className="profile-id">
          <h1>{s.name || 'Learner'}</h1>
          <div className="muted">Learning since {new Date(p.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
          <div className="level-row">
            <span className="level-badge">Level {lvl.level}</span>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${lvl.progress * 100}%` }} />
            </div>
            <span className="muted small">
              {p.xp - lvl.start}/{lvl.next - lvl.start} XP
            </span>
          </div>
        </div>
        <button type="button" className="icon-btn bordered" onClick={() => navigate('/settings')} aria-label="Settings">
          <Icon name="settings" size={20} />
        </button>
      </header>

      <div className="stats-grid">
        <Stat icon="flame" color="orange" value={streak} label="Day streak" />
        <Stat icon="trophy" color="gold" value={p.streak.best} label="Best streak" />
        <Stat icon="zap" color="violet" value={p.xp} label="Total XP" />
        <Stat icon="book-open" color="blue" value={lessonsDone} label="Lessons" />
        <Stat icon="target" color="green" value={accuracy === null ? '—' : `${accuracy}%`} label="Accuracy" />
        <Stat icon="clock" color="teal" value={formatMinutes(p.stats.secondsLearning)} label="Time learning" />
      </div>

      <section className="card">
        <h2 className="card-title">
          <Icon name="calendar" size={18} /> Activity
        </h2>
        <Heatmap daily={p.dailyXp} />
      </section>

      <section className="card">
        <h2 className="card-title">
          <Icon name="learn" size={18} /> Courses
        </h2>
        {courses.map((c) => {
          const cp = courseProgress(p, c.id);
          return (
            <button key={c.id} type="button" className="course-row" onClick={() => navigate(`/course/${c.id}`)}>
              <CourseGlyph course={c.id} size={36} />
              <div className="course-row-main">
                <div className="course-row-top">
                  <b>{c.title}</b>
                  <span className="muted small">
                    {cp.done}/{cp.total}
                  </span>
                </div>
                <div className={`bar course-${c.id}`}>
                  <div className="bar-fill" style={{ width: `${cp.ratio * 100}%` }} />
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <section className="card">
        <h2 className="card-title">
          <Icon name="award" size={18} /> Achievements <span className="muted small">{unlocked}/{achievements.length}</span>
        </h2>
        <div className="ach-grid">
          {achievements.map((a) => {
            const at = p.achievements[a.id];
            return (
              <div key={a.id} className={`ach${at ? ' on' : ''}`} title={at ? `Unlocked ${new Date(at).toLocaleDateString()}` : 'Locked'}>
                <span className="ach-icon">{a.icon}</span>
                <b>{a.title}</b>
                <span className="muted small">{a.description}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <div className={`stat stat-${color}`}>
      <span className="stat-icon">
        <Icon name={icon} size={20} />
      </span>
      <b>{value}</b>
      <span className="muted small">{label}</span>
    </div>
  );
}

function Heatmap({ daily }: { daily: Record<string, number> }) {
  const weeks = 18;
  const cells = useMemo(() => {
    const today = new Date();
    // Align to the start of the week (Sunday) so columns are calendar weeks.
    const start = addDays(today, -(weeks * 7 - 1) - (6 - today.getDay()));
    return Array.from({ length: weeks * 7 }, (_, i) => {
      const d = addDays(start, i);
      const key = dayKey(d);
      return { key, xp: daily[key] ?? 0, future: d > today };
    });
  }, [daily]);
  const level = (xp: number) => (xp === 0 ? 0 : xp < 15 ? 1 : xp < 30 ? 2 : xp < 60 ? 3 : 4);
  const total = Object.values(daily).reduce((a, b) => a + b, 0);
  const activeDays = Object.values(daily).filter((v) => v > 0).length;
  return (
    <div className="heatmap-wrap">
      <div className="heatmap" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
        {Array.from({ length: weeks }, (_, w) => (
          <div key={w} className="hm-col">
            {cells.slice(w * 7, w * 7 + 7).map((c) => (
              <span key={c.key} className={`hm-cell l${level(c.xp)}${c.future ? ' future' : ''}`} title={`${c.key}: ${c.xp} XP`} />
            ))}
          </div>
        ))}
      </div>
      <div className="hm-legend">
        <span className="muted small">
          {activeDays} active day{activeDays === 1 ? '' : 's'} · {total} XP total
        </span>
        <span className="hm-scale">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`hm-cell l${l}`} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
