import { Fragment, type ReactNode } from 'react';
import { getGlossaryEntry } from '../content';
import { openExternal } from '../lib/platform';
import { openGlossary } from '../lib/ui';
import { sfx } from '../lib/sound';

/*
 * Renders the inline text format used throughout the content:
 *   `code`  **bold**  *italic*  [label](https://…)  [[glossary-id]]  [[glossary-id|label]]
 * Paragraph breaks ("\n\n") become separate paragraphs; single "\n" becomes <br>.
 */

const TOKEN = /(`[^`]+`)|(\[\[[^\]]+\]\])|(\[[^\]]+\]\(https?:\/\/[^)\s]+\))|(\*\*(?:[^*]|\*(?!\*))+\*\*)|(\*[^*\s][^*]*\*)/g;

function parseInline(text: string, keyPrefix = ''): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  TOKEN.lastIndex = 0;
  const re = new RegExp(TOKEN.source, 'g');
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...withBreaks(text.slice(last, m.index), `${keyPrefix}t${n}`));
    const key = `${keyPrefix}${n++}`;
    const tok = m[0];
    if (m[1]) {
      out.push(
        <code key={key} className="ic">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (m[2]) {
      const inner = tok.slice(2, -2);
      const [id, label] = inner.split('|').map((s) => s.trim());
      const entry = getGlossaryEntry(id);
      out.push(
        <button
          key={key}
          type="button"
          className="gloss"
          onClick={(e) => {
            e.stopPropagation();
            sfx.tap();
            openGlossary(id);
          }}
          title={entry?.short.replace(/[`*[\]]/g, '')}
        >
          {label ?? entry?.term ?? id}
        </button>,
      );
    } else if (m[3]) {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!;
      out.push(
        <a
          key={key}
          href={lm[2]}
          className="link"
          onClick={(e) => {
            e.preventDefault();
            void openExternal(lm[2]);
          }}
        >
          {lm[1]}
        </a>,
      );
    } else if (m[4]) {
      out.push(<strong key={key}>{parseInline(tok.slice(2, -2), key + 'b')}</strong>);
    } else if (m[5]) {
      out.push(<em key={key}>{parseInline(tok.slice(1, -1), key + 'i')}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(...withBreaks(text.slice(last), `${keyPrefix}t${n}`));
  return out;
}

function withBreaks(s: string, key: string): ReactNode[] {
  const parts = s.split('\n');
  return parts.map((p, i) => (
    <Fragment key={key + i}>
      {i > 0 && <br />}
      {p}
    </Fragment>
  ));
}

/** Inline content (no wrapping paragraph). */
export function Inline({ text }: { text: string }) {
  return <>{parseInline(text)}</>;
}

/** Block content: splits on blank lines into paragraphs. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const paras = text.split(/\n\s*\n/);
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} className={className}>
          {parseInline(p, `p${i}-`)}
        </p>
      ))}
    </>
  );
}

/** Strip inline markup to plain text (for search and titles). */
export function plainText(text: string): string {
  return text
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, (_, id: string) => getGlossaryEntry(id.trim())?.term ?? id)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*|`|\*/g, '');
}
