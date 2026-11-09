import { useEffect, type ReactNode } from 'react';
import { getGlossaryEntry, glossaryCourseLabel } from './content';
import { CodeBlock } from './components/CodeBlock';
import { CourseGlyph } from './components/CourseGlyph';
import { Icon } from './components/Icon';
import { Modal } from './components/Modal';
import { RichText } from './components/RichText';
import { isDesktopApp, onBackButton, syncSystemBars } from './lib/platform';
import { canGoBack, goBack, navigate, useRoute } from './lib/router';
import { dueReviews, effectiveStreak, levelInfo, useProgress, useSettings, type Settings } from './lib/store';
import { closeGlossary, closeTopOverlay, runBackHandlers, useUi } from './lib/ui';
import { useReducedMotion } from './lib/motion';
import { CourseScreen } from './screens/CourseScreen';
import { HomeScreen } from './screens/HomeScreen';
import { CheatSheetScreen, GlossaryEntryScreen, LibraryScreen } from './screens/LibraryScreen';
import { LessonScreen } from './screens/LessonScreen';
import { NotesScreen } from './screens/NotesScreen';
import { NotFound } from './screens/NotFound';
import { PracticeHub, PracticeSession } from './screens/PracticeScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const NAV = [
  { id: 'home', label: 'Home', icon: 'home', to: '/' },
  { id: 'learn', label: 'Learn', icon: 'learn', to: '/course/cpp' },
  { id: 'practice', label: 'Practice', icon: 'practice', to: '/practice' },
  { id: 'library', label: 'Library', icon: 'library', to: '/library/glossary' },
  { id: 'profile', label: 'Profile', icon: 'user', to: '/profile' },
] as const;

function useTheme(s: Settings) {
  const reduced = useReducedMotion();
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const theme = s.theme === 'system' ? (mq.matches ? 'dark' : 'light') : s.theme;
      root.dataset.theme = theme;
      root.dataset.accent = s.accent;
      root.dataset.codeTheme = s.codeTheme;
      root.style.setProperty('--text-scale', String(s.textScale));
      const bg = getComputedStyle(root).getPropertyValue('--bg').trim() || '#0b0e17';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
      void syncSystemBars(theme !== 'light', bg);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [s.theme, s.accent, s.codeTheme, s.textScale]);
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  }, [reduced]);
}

export function App() {
  const s = useSettings();
  const route = useRoute();
  useTheme(s);

  useEffect(() => {
    void onBackButton(() => {
      if (closeTopOverlay()) return true;
      if (runBackHandlers()) return true;
      if (window.location.hash.replace('#', '') === '/' || window.location.hash === '') return false;
      if (canGoBack()) goBack();
      else navigate('/', { replace: true });
      return true;
    });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.path]);

  const [first, second, third] = route.segments;
  let screen: ReactNode;
  let fullscreen = false;
  let active = '';
  switch (first) {
    case undefined:
      screen = <HomeScreen />;
      active = 'home';
      break;
    case 'course':
      screen = <CourseScreen courseId={second ?? 'cpp'} />;
      active = 'learn';
      break;
    case 'lesson':
      screen = second ? <LessonScreen key={second} lessonId={second} /> : <NotFound />;
      fullscreen = true;
      break;
    case 'notes':
      screen = second ? <NotesScreen key={second} lessonId={second} /> : <NotFound />;
      active = 'learn';
      break;
    case 'practice':
      if (second === 'review') screen = <PracticeSession mode="review" />;
      else if (second === 'quick') screen = <PracticeSession key={third} mode="quick" target={third} />;
      else if (second === 'unit') screen = <PracticeSession key={third} mode="unit" target={third} />;
      else screen = <PracticeHub />;
      fullscreen = !!second;
      active = 'practice';
      break;
    case 'library':
      screen = <LibraryScreen tab={second === 'sheets' ? 'sheets' : second === 'saved' ? 'saved' : 'glossary'} />;
      active = 'library';
      break;
    case 'glossary':
      screen = second ? <GlossaryEntryScreen key={second} id={second} /> : <NotFound />;
      active = 'library';
      break;
    case 'sheet':
      screen = second ? <CheatSheetScreen key={second} id={second} /> : <NotFound />;
      active = 'library';
      break;
    case 'profile':
      screen = <ProfileScreen />;
      active = 'profile';
      break;
    case 'settings':
      screen = <SettingsScreen />;
      active = 'settings';
      break;
    default:
      screen = <NotFound />;
  }

  return (
    <>
      {fullscreen ? (
        <div className="fullscreen">{screen}</div>
      ) : (
        <div className="shell">
          <Sidebar active={active} />
          <main className="main" key={route.path}>
            <div className="page">{screen}</div>
          </main>
          <BottomNav active={active} />
        </div>
      )}
      {isDesktopApp && <div className="titlebar-drag" aria-hidden="true" />}
      <GlossarySheet />
      <Toasts />
      <ConfirmHost />
    </>
  );
}

function Sidebar({ active }: { active: string }) {
  const p = useProgress();
  const s = useSettings();
  const streak = effectiveStreak(p);
  const lvl = levelInfo(p.xp);
  return (
    <aside className="sidebar">
      <button type="button" className="brand" onClick={() => navigate('/')}>
        <span className="brand-mark">
          <CourseGlyph course="cpp" size={34} />
        </span>
        <span className="brand-text">
          <b>C++ Forge</b>
          <small>Learn C++ & Unreal</small>
        </span>
      </button>
      <nav className="side-nav">
        {NAV.map((n) => (
          <button key={n.id} type="button" className={`side-link${active === n.id ? ' on' : ''}`} onClick={() => navigate(n.to)}>
            <Icon name={n.icon} size={20} />
            {n.label}
          </button>
        ))}
        <button type="button" className={`side-link${active === 'settings' ? ' on' : ''}`} onClick={() => navigate('/settings')}>
          <Icon name="settings" size={20} />
          Settings
        </button>
      </nav>
      <div className="side-foot">
        <div className="side-stats">
          <span className={`chip-stat streak${streak > 0 ? ' lit' : ''}`} title="Day streak">
            <Icon name="flame" size={16} filled={streak > 0} /> {streak}
          </span>
          <span className="chip-stat level" title="Total XP">
            <Icon name="zap" size={16} filled /> {p.xp}
          </span>
        </div>
        <div className="side-level">
          <div className="side-level-top">
            <span>Level {lvl.level}</span>
            <span className="muted">{s.name || 'Learner'}</span>
          </div>
          <div className="bar thin">
            <div className="bar-fill" style={{ width: `${lvl.progress * 100}%` }} />
          </div>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({ active }: { active: string }) {
  const due = dueReviews(useProgress()).length;
  return (
    <nav className="bottom-nav">
      {NAV.map((n) => (
        <button key={n.id} type="button" className={`bottom-link${active === n.id || (n.id === 'profile' && active === 'settings') ? ' on' : ''}`} onClick={() => navigate(n.to)}>
          <span className="bottom-icon">
            <Icon name={n.icon} size={22} />
            {n.id === 'practice' && due > 0 && <span className="dot" />}
          </span>
          <span className="bottom-label">{n.label}</span>
        </button>
      ))}
    </nav>
  );
}

function GlossarySheet() {
  const { glossaryId } = useUi();
  const g = glossaryId ? getGlossaryEntry(glossaryId) : undefined;
  return (
    <Modal open={!!glossaryId} onClose={closeGlossary} label={g?.term ?? 'Glossary'} className="gloss-sheet">
      {g ? (
        <>
          <div className="detail-badges">
            <span className={`course-badge ${g.course}`}>{glossaryCourseLabel(g.course)}</span>
            <span className="cat-badge">{g.category}</span>
          </div>
          <h2 className="sheet-title">{g.term}</h2>
          <div className="gloss-sheet-short">
            <RichText text={g.short} />
          </div>
          {g.example && <CodeBlock code={g.example} lang={g.exampleLang ?? 'cpp'} compact bare />}
          <div className="sheet-actions">
            <button
              type="button"
              className="btn btn-soft grow"
              onClick={() => {
                closeGlossary();
                navigate(`/glossary/${g.id}`);
              }}
            >
              <Icon name="book-open" size={18} /> Full explanation
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="sheet-title">{glossaryId}</h2>
          <p className="muted">This term hasn’t been added to the glossary yet.</p>
        </>
      )}
    </Modal>
  );
}

function Toasts() {
  const { toasts } = useUi();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast tone-${t.tone ?? 'default'}`}>
          <span className="toast-icon">{t.icon && !/^[a-z-]+$/.test(t.icon) ? t.icon : <Icon name={t.icon ?? 'info'} size={18} />}</span>
          <span className="toast-text">
            <b>{t.title}</b>
            {t.body && <span>{t.body}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function ConfirmHost() {
  const { confirm } = useUi();
  if (!confirm) return null;
  return (
    <Modal open onClose={() => confirm.resolve(false)} label={confirm.title} className="confirm">
      <h2 className="sheet-title">{confirm.title}</h2>
      {confirm.body && <p className="muted">{confirm.body}</p>}
      <div className="sheet-actions">
        <button type="button" className="btn btn-soft grow" onClick={() => confirm.resolve(false)}>
          {confirm.cancelLabel ?? 'Cancel'}
        </button>
        <button type="button" className={`btn grow ${confirm.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => confirm.resolve(true)} autoFocus>
          {confirm.confirmLabel ?? 'OK'}
        </button>
      </div>
    </Modal>
  );
}
