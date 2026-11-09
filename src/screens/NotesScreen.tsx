import { courseLabel, findLesson, isStub } from '../content';
import { Blocks } from '../components/Blocks';
import { Icon } from '../components/Icon';
import { Inline } from '../components/RichText';
import { ReadingList } from '../components/ReadingList';
import { isUnlocked } from '../lib/progress';
import { goBack, navigate } from '../lib/router';
import { useProgress } from '../lib/store';
import { BookmarkButton } from './LibraryScreen';
import { NotFound } from './NotFound';

/** The lesson as a readable article — great for revision and quick reference. */
export function NotesScreen({ lessonId }: { lessonId: string }) {
  const loc = findLesson(lessonId);
  const p = useProgress();
  if (!loc || isStub(loc.lesson)) return <NotFound />;
  const { lesson, unit, course, unitIndex } = loc;
  const concepts = lesson.steps.filter((s) => s.kind === 'concept');
  const unlocked = isUnlocked(p, lesson.id);
  const lp = p.lessons[lesson.id];

  return (
    <div className="screen detail notes">
      <div className="back-bar">
        <button type="button" className="icon-btn" onClick={() => goBack(`/course/${course.id}`)} aria-label="Back">
          <Icon name="arrow-left" size={22} />
        </button>
        <div className="back-bar-actions">
          <BookmarkButton bookmarkKey={`lesson:${lesson.id}`} />
          {unlocked && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/lesson/${lesson.id}`)}>
              <Icon name="play" size={14} filled /> {lp ? 'Practice' : 'Start lesson'}
            </button>
          )}
        </div>
      </div>
      <div className="detail-badges">
        <span className={`course-badge ${course.id}`}>{courseLabel(course.id)}</span>
        <span className="cat-badge">
          Unit {unitIndex + 1} · {unit.title}
        </span>
        <span className="cat-badge">
          <Icon name="clock" size={12} /> {lesson.minutes} min
        </span>
      </div>
      <h1 className="detail-title">{lesson.title}</h1>
      <p className="detail-lead">
        <Inline text={lesson.summary} />
      </p>

      <div className="notes-objectives">
        <div className="sheet-sub">In this lesson</div>
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

      {concepts.map((c, i) => (
        <section key={i} className="notes-section">
          <h2>
            <span className="notes-num">{i + 1}</span>
            <Inline text={c.title} />
          </h2>
          <Blocks blocks={c.blocks} />
        </section>
      ))}

      <section className="notes-section">
        <h2>
          <Icon name="check" size={20} /> Key takeaways
        </h2>
        <ul className="takeaways">
          {lesson.takeaways.map((t, i) => (
            <li key={i}>
              <Inline text={t} />
            </li>
          ))}
        </ul>
      </section>
      {lesson.reading.length > 0 && (
        <section className="notes-section">
          <h2>
            <Icon name="library" size={20} /> Further reading
          </h2>
          <ReadingList refs={lesson.reading} />
        </section>
      )}
    </div>
  );
}
