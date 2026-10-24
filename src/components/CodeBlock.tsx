import { Fragment, useMemo, useState, type ReactNode } from 'react';
import type { Annotation, CodeLang } from '../content/types';
import { highlightLines, parseLineSpec, type Token } from '../lib/highlight';
import { compilerExplorerUrl } from '../lib/godbolt';
import { copyText, openExternal } from '../lib/platform';
import { useSettings } from '../lib/store';
import { sfx } from '../lib/sound';
import { toast } from '../lib/ui';
import { Icon } from './Icon';
import { Inline } from './RichText';

const LANG_LABEL: Record<CodeLang, string> = {
  cpp: 'C++',
  text: 'Text',
  shell: 'Terminal',
  csharp: 'C#',
  ini: 'Config',
  json: 'JSON',
  cmake: 'CMake',
};

export function Tokens({ tokens, render }: { tokens: Token[]; render?: (t: Token, i: number) => ReactNode }) {
  return (
    <>
      {tokens.map((t, i) =>
        render ? (
          <Fragment key={i}>{render(t, i)}</Fragment>
        ) : (
          <span key={i} className={`tk-${t.kind}`}>
            {t.text}
          </span>
        ),
      )}
    </>
  );
}

export interface CodeBlockProps {
  code: string;
  lang?: CodeLang;
  title?: string;
  output?: string;
  annotations?: Annotation[];
  highlight?: number[];
  runnable?: boolean;
  stdin?: string;
  std?: string;
  compact?: boolean;
  /** Hide the header bar (used inside questions). */
  bare?: boolean;
  /** Make lines tappable (bug-hunt questions). */
  onLineClick?: (line: number) => void;
  lineClass?: (line: number) => string | undefined;
}

export function CodeBlock(props: CodeBlockProps) {
  const { code, lang = 'cpp', title, output, annotations, highlight, runnable, compact, bare, onLineClick, lineClass } = props;
  const settings = useSettings();
  const lines = useMemo(() => highlightLines(code, lang), [code, lang]);
  const [active, setActive] = useState<number | null>(null);
  const [wrap, setWrap] = useState(settings.wrapCode);

  // Map each line to the annotation numbers that mention it.
  const lineNotes = useMemo(() => {
    const map = new Map<number, number[]>();
    annotations?.forEach((a, idx) => {
      for (const l of parseLineSpec(a.lines)) map.set(l, [...(map.get(l) ?? []), idx]);
    });
    return map;
  }, [annotations]);

  const activeLines = useMemo(
    () => new Set(active === null || !annotations ? [] : parseLineSpec(annotations[active].lines)),
    [active, annotations],
  );
  const highlighted = useMemo(() => new Set(highlight ?? []), [highlight]);

  const copy = async () => {
    sfx.tap();
    if (await copyText(code)) toast({ icon: 'copy', title: 'Code copied' }, 1600);
  };

  const showNumbers = settings.lineNumbers && lines.length > 1;

  return (
    <div className={`code-block${compact ? ' compact' : ''}${bare ? ' bare' : ''}`}>
      {!bare && (
        <div className="code-head">
          <span className="code-title">
            <Icon name={lang === 'shell' ? 'terminal' : 'code'} size={15} />
            {title ?? LANG_LABEL[lang]}
          </span>
          <span className="code-actions">
            <button type="button" className="icon-btn sm" onClick={() => setWrap((w) => !w)} title="Toggle line wrap" aria-pressed={wrap}>
              <Icon name="wrap-text" size={16} />
            </button>
            <button type="button" className="icon-btn sm" onClick={copy} title="Copy code">
              <Icon name="copy" size={16} />
            </button>
            {runnable && (
              <button
                type="button"
                className="run-btn"
                onClick={() => {
                  sfx.tap();
                  void openExternal(compilerExplorerUrl(code, { std: props.std, stdin: props.stdin }));
                }}
                title="Compile and run this program in Compiler Explorer"
              >
                <Icon name="play" size={13} filled /> Run
              </button>
            )}
          </span>
        </div>
      )}
      <div className={`code-scroll${wrap ? ' wrap' : ''}`} style={{ fontSize: settings.codeFontSize }}>
        <pre className="code">
          {lines.map((toks, i) => {
            const n = i + 1;
            const notes = lineNotes.get(n);
            const cls = [
              'line',
              activeLines.has(n) && 'active',
              highlighted.has(n) && 'hl',
              onLineClick && 'clickable',
              lineClass?.(n),
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={i}
                className={cls}
                onClick={onLineClick ? () => onLineClick(n) : notes ? () => setActive(notes[0] === active ? null : notes[0]) : undefined}
              >
                {showNumbers && <span className="ln">{n}</span>}
                {annotations && annotations.length > 0 && (
                  <span className="note-gutter">
                    {notes && <span className={`note-dot${notes.includes(active ?? -1) ? ' on' : ''}`}>{notes[0] + 1}</span>}
                  </span>
                )}
                <span className="lc">{toks.length ? <Tokens tokens={toks} /> : '​'}</span>
              </div>
            );
          })}
        </pre>
      </div>
      {output !== undefined && (
        <div className="code-output">
          <div className="out-label">
            <Icon name="terminal" size={14} /> Output
          </div>
          <pre>{output}</pre>
        </div>
      )}
      {annotations && annotations.length > 0 && (
        <ol className="annotations">
          {annotations.map((a, idx) => (
            <li
              key={idx}
              className={active === idx ? 'on' : ''}
              onMouseEnter={() => setActive(idx)}
              onMouseLeave={() => setActive((cur) => (cur === idx ? null : cur))}
              onClick={() => setActive(active === idx ? null : idx)}
            >
              <span className="note-num">{idx + 1}</span>
              <span className="note-lines">{formatLines(a.lines)}</span>
              <span className="note-text">
                <Inline text={a.text} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function formatLines(spec: Annotation['lines']): string {
  const ls = parseLineSpec(spec);
  if (ls.length === 1) return `Line ${ls[0]}`;
  const contiguous = ls.every((l, i) => i === 0 || l === ls[i - 1] + 1);
  return contiguous ? `Lines ${ls[0]}–${ls[ls.length - 1]}` : `Lines ${ls.join(', ')}`;
}
