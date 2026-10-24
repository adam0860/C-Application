import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cheatSheets, findLesson, getGlossaryEntry, glossary } from '../content';
import type { CourseId, GlossaryEntry } from '../content/types';
import { CodeBlock } from '../components/CodeBlock';
import { Icon } from '../components/Icon';
import { Inline, RichText } from '../components/RichText';
import { ReadingList } from '../components/ReadingList';
import { lessonsMentioning, search } from '../lib/search';
import { goBack, navigate } from '../lib/router';
import { toggleBookmark, useProgress } from '../lib/store';
import { NotFound } from './NotFound';

type Tab = 'glossary' | 'sheets' | 'saved';

// One shared collator: localeCompare with options builds a new one per call.
const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

export function LibraryScreen({ tab }: { tab: Tab }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => search(query), [query]);

  return (
    <div className="screen library">
      <header className="page-head">
        <h1>Library</h1>
        <p className="muted">Your C++ and Unreal quick reference: {glossary.length} glossary terms and {cheatSheets.length} cheat sheets.</p>
      </header>
      <div className="search-box">
        <Icon name="search" size={18} />
        <input
          type="search"
          placeholder="Search lessons, terms and cheat sheets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the library"
        />
        {query && (
          <button type="button" className="icon-btn sm" onClick={() => setQuery('')} aria-label="Clear search">
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      {query.trim() ? (
        <SearchResults results={results} />
      ) : (
        <>
          <div className="tabs" role="tablist">
            {(
              [
                ['glossary', 'Glossary', 'book-open'],
                ['sheets', 'Cheat sheets', 'grid'],
                ['saved', 'Saved', 'bookmark'],
              ] as const
            ).map(([id, label, icon]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => navigate(`/library/${id}`, { replace: true })}>
                <Icon name={icon} size={16} /> {label}
              </button>
            ))}
          </div>
          {tab === 'glossary' && <GlossaryList />}
          {tab === 'sheets' && <SheetGrid />}
          {tab === 'saved' && <SavedList />}
        </>
      )}
    </div>
  );
}

function SearchResults({ results }: { results: ReturnType<typeof search> }) {
  if (!results.length)
    return (
      <div className="empty small">
        <div className="empty-icon">🔍</div>
        <p className="muted">No matches. Try a different word, like “pointer” or “UPROPERTY”.</p>
      </div>
    );
  const icon = { lesson: 'learn', glossary: 'book-open', sheet: 'grid' } as const;
  return (
    <ul className="result-list">
      {results.map((r) => (
        <li key={`${r.kind}:${r.id}`}>
          <button type="button" className="result" onClick={() => navigate(r.kind === 'lesson' ? `/notes/${r.id}` : r.kind === 'glossary' ? `/glossary/${r.id}` : `/sheet/${r.id}`)}>
            <span className={`result-icon kind-${r.kind}`}>
              <Icon name={icon[r.kind]} size={18} />
            </span>
            <span className="result-text">
              <b>{r.title}</b>
              <span className="muted">{r.subtitle}</span>
            </span>
            <Icon name="chevron-right" size={18} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function GlossaryList() {
  const [course, setCourse] = useState<'all' | CourseId>('all');
  const [category, setCategory] = useState<string | null>(null);
  const filtered = glossary.filter((g) => course === 'all' || g.course === course || g.course === 'both');
  const categories = [...new Set(filtered.map((g) => g.category))].sort();
  const list = filtered.filter((g) => !category || g.category === category).sort((a, b) => collator.compare(a.term, b.term));
  // Paint the first screenful immediately, then the rest of the (long) list a moment later.
  const [limit, setLimit] = useState(80);
  useEffect(() => {
    if (limit >= list.length) return;
    const t = setTimeout(() => setLimit(list.length), 60);
    return () => clearTimeout(t);
  }, [limit, list.length]);
  const groups = new Map<string, GlossaryEntry[]>();
  for (const g of list.slice(0, limit)) {
    const letter = /[a-z]/i.test(g.term.replace(/^[^a-z0-9]+/i, '')[0] ?? '') ? g.term.replace(/^[^a-z0-9]+/i, '')[0].toUpperCase() : '#';
    groups.set(letter, [...(groups.get(letter) ?? []), g]);
  }
  return (
    <div>
      <div className="filter-row">
        <div className="seg small">
          {(['all', 'cpp', 'unreal'] as const).map((c) => (
            <button
              key={c}
              type="button"
              className={`seg-btn${course === c ? ' on' : ''}`}
              onClick={() => {
                setCourse(c);
                setCategory(null);
              }}
            >
              {c === 'all' ? 'All' : c === 'cpp' ? 'C++' : 'Unreal'}
            </button>
          ))}
        </div>
      </div>
      <div className="chip-row">
        <button type="button" className={`filter-chip${!category ? ' on' : ''}`} onClick={() => setCategory(null)}>
          All topics
        </button>
        {categories.map((c) => (
          <button key={c} type="button" className={`filter-chip${category === c ? ' on' : ''}`} onClick={() => setCategory(category === c ? null : c)}>
            {c}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="muted">The glossary is still being written.</p>}
      {[...groups.entries()].map(([letter, entries]) => (
        <section key={letter} className="gloss-group">
          <h3 className="gloss-letter">{letter}</h3>
          <ul className="gloss-list">
            {entries.map((g) => (
              <li key={g.id}>
                <button type="button" className="gloss-item" onClick={() => navigate(`/glossary/${g.id}`)}>
                  <span className="gloss-term">{g.term}</span>
                  <span className="gloss-short">
                    <Inline text={g.short} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SheetGrid() {
  const [course, setCourse] = useState<'all' | CourseId>('all');
  const list = cheatSheets.filter((s) => course === 'all' || s.course === course);
  return (
    <div>
      <div className="filter-row">
        <div className="seg small">
          {(['all', 'cpp', 'unreal'] as const).map((c) => (
            <button key={c} type="button" className={`seg-btn${course === c ? ' on' : ''}`} onClick={() => setCourse(c)}>
              {c === 'all' ? 'All' : c === 'cpp' ? 'C++' : 'Unreal'}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 && <p className="muted">Cheat sheets are on their way.</p>}
      <div className="sheet-grid">
        {list.map((s) => (
          <button key={s.id} type="button" className={`sheet-card course-${s.course}`} onClick={() => navigate(`/sheet/${s.id}`)}>
            <span className="sheet-icon">{s.icon}</span>
            <b>{s.title}</b>
            <span className="muted">{s.description}</span>
            <span className="sheet-badge">{s.course === 'cpp' ? 'C++' : 'Unreal'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SavedList() {
  const p = useProgress();
  const items = p.bookmarks
    .map((key) => {
      const [kind, id] = key.split(':');
      if (kind === 'lesson') {
        const loc = findLesson(id);
        return loc ? { key, title: loc.lesson.title, sub: `Lesson · ${loc.unit.title}`, to: `/notes/${id}`, icon: 'learn' } : null;
      }
      if (kind === 'glossary') {
        const g = getGlossaryEntry(id);
        return g ? { key, title: g.term, sub: `Glossary · ${g.category}`, to: `/glossary/${id}`, icon: 'book-open' } : null;
      }
      const s = cheatSheets.find((c) => c.id === id);
      return s ? { key, title: s.title, sub: 'Cheat sheet', to: `/sheet/${id}`, icon: 'grid' } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (!items.length)
    return (
      <div className="empty small">
        <div className="empty-icon">🔖</div>
        <p className="muted">Tap the bookmark icon on any lesson, term or cheat sheet to save it here.</p>
      </div>
    );
  return (
    <ul className="result-list">
      {items.map((it) => (
        <li key={it.key}>
          <button type="button" className="result" onClick={() => navigate(it.to)}>
            <span className="result-icon">
              <Icon name={it.icon} size={18} />
            </span>
            <span className="result-text">
              <b>{it.title}</b>
              <span className="muted">{it.sub}</span>
            </span>
            <Icon name="chevron-right" size={18} />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function BookmarkButton({ bookmarkKey }: { bookmarkKey: string }) {
  const p = useProgress();
  const on = p.bookmarks.includes(bookmarkKey);
  return (
    <button type="button" className={`icon-btn bordered${on ? ' on' : ''}`} onClick={() => toggleBookmark(bookmarkKey)} aria-pressed={on} title={on ? 'Remove bookmark' : 'Save'}>
      <Icon name="bookmark" size={20} filled={on} />
    </button>
  );
}

function BackBar({ fallback, children }: { fallback: string; children?: ReactNode }) {
  return (
    <div className="back-bar">
      <button type="button" className="icon-btn" onClick={() => goBack(fallback)} aria-label="Back">
        <Icon name="arrow-left" size={22} />
      </button>
      <div className="back-bar-actions">{children}</div>
    </div>
  );
}

export function GlossaryEntryScreen({ id }: { id: string }) {
  const g = getGlossaryEntry(id);
  if (!g) return <NotFound />;
  const mentions = lessonsMentioning(g.id)
    .map((l) => findLesson(l))
    .filter((l): l is NonNullable<typeof l> => !!l);
  return (
    <div className="screen detail">
      <BackBar fallback="/library/glossary">
        <BookmarkButton bookmarkKey={`glossary:${g.id}`} />
      </BackBar>
      <div className="detail-badges">
        <span className={`course-badge ${g.course}`}>{g.course === 'cpp' ? 'C++' : g.course === 'unreal' ? 'Unreal' : 'C++ & Unreal'}</span>
        <span className="cat-badge">{g.category}</span>
      </div>
      <h1 className="detail-title">{g.term}</h1>
      {g.aliases?.length ? <div className="muted small">Also known as: {g.aliases.join(', ')}</div> : null}
      <div className="detail-lead">
        <RichText text={g.short} />
      </div>
      {g.long && (
        <div className="detail-body">
          <RichText text={g.long} className="para" />
        </div>
      )}
      {g.example && (
        <section className="detail-section">
          <h2>Example</h2>
          <CodeBlock code={g.example} lang={g.exampleLang ?? 'cpp'} />
        </section>
      )}
      {g.see && g.see.length > 0 && (
        <section className="detail-section">
          <h2>Related terms</h2>
          <div className="chip-row">
            {g.see.map((sid) => {
              const s = getGlossaryEntry(sid);
              return s ? (
                <button key={sid} type="button" className="filter-chip" onClick={() => navigate(`/glossary/${sid}`)}>
                  {s.term}
                </button>
              ) : null;
            })}
          </div>
        </section>
      )}
      {mentions.length > 0 && (
        <section className="detail-section">
          <h2>Taught in</h2>
          <ul className="result-list compact">
            {mentions.slice(0, 8).map((m) => (
              <li key={m.lesson.id}>
                <button type="button" className="result" onClick={() => navigate(`/notes/${m.lesson.id}`)}>
                  <span className="result-icon">
                    <Icon name="learn" size={16} />
                  </span>
                  <span className="result-text">
                    <b>{m.lesson.title}</b>
                    <span className="muted">
                      {m.course.id === 'cpp' ? 'C++' : 'Unreal'} · Unit {m.unitIndex + 1}: {m.unit.title}
                    </span>
                  </span>
                  <Icon name="chevron-right" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {g.reading && g.reading.length > 0 && (
        <section className="detail-section">
          <h2>Further reading</h2>
          <ReadingList refs={g.reading} />
        </section>
      )}
    </div>
  );
}

export function CheatSheetScreen({ id }: { id: string }) {
  const s = cheatSheets.find((c) => c.id === id);
  if (!s) return <NotFound />;
  return (
    <div className="screen detail sheet-detail">
      <BackBar fallback="/library/sheets">
        <BookmarkButton bookmarkKey={`sheet:${s.id}`} />
      </BackBar>
      <div className="detail-badges">
        <span className={`course-badge ${s.course}`}>{s.course === 'cpp' ? 'C++' : 'Unreal'}</span>
        <span className="cat-badge">Cheat sheet</span>
      </div>
      <h1 className="detail-title">
        <span className="title-emoji">{s.icon}</span> {s.title}
      </h1>
      <p className="detail-lead">{s.description}</p>
      <nav className="toc">
        {s.sections.map((sec, i) => (
          <a
            key={i}
            href={`#sec-${i}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(`sec-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            {sec.title}
          </a>
        ))}
      </nav>
      {s.sections.map((sec, i) => (
        <section key={i} className="cs-section" id={`sec-${i}`}>
          <h2>{sec.title}</h2>
          <div className="cs-items">
            {sec.items.map((it, j) => (
              <div key={j} className="cs-item">
                <div className="cs-label">{it.label}</div>
                {it.code && <CodeBlock code={it.code} lang={it.lang ?? 'cpp'} bare compact />}
                {it.text && (
                  <div className="cs-text">
                    <Inline text={it.text} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
