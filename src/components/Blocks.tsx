import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { Block, CalloutVariant, MemoryRegion } from '../content/types';
import { CodeBlock } from './CodeBlock';
import { Icon } from './Icon';
import { Inline, RichText } from './RichText';
import { sfx } from '../lib/sound';

export const CALLOUT_META: Record<CalloutVariant, { icon: string; label: string }> = {
  why: { icon: 'bulb', label: 'Why does it work this way?' },
  tip: { icon: 'sparkles', label: 'Tip' },
  warning: { icon: 'warning', label: 'Watch out' },
  note: { icon: 'info', label: 'Note' },
  unreal: { icon: 'unreal', label: 'In Unreal Engine' },
  history: { icon: 'history', label: 'A bit of history' },
  perf: { icon: 'gauge', label: 'Performance' },
  analogy: { icon: 'puzzle', label: 'Analogy' },
};

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="blocks">
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}

function BlockView({ block: b }: { block: Block }) {
  switch (b.type) {
    case 'p':
      return <RichText text={b.text} className="para" />;
    case 'heading':
      return (
        <h3 className="block-heading">
          <Inline text={b.text} />
        </h3>
      );
    case 'code':
      return (
        <CodeBlock
          code={b.code}
          lang={b.lang}
          title={b.title}
          output={b.output}
          annotations={b.annotations}
          highlight={b.highlight}
          runnable={b.runnable}
          stdin={b.stdin}
          std={b.std}
        />
      );
    case 'callout': {
      const meta = CALLOUT_META[b.variant];
      return (
        <aside className={`callout callout-${b.variant}`}>
          <div className="callout-icon">
            <Icon name={meta.icon} size={18} />
          </div>
          <div className="callout-body">
            <div className="callout-title">
              <Inline text={b.title ?? meta.label} />
            </div>
            <RichText text={b.text} />
          </div>
        </aside>
      );
    }
    case 'list': {
      const Tag = b.ordered ? 'ol' : 'ul';
      return (
        <Tag className={`block-list${b.ordered ? ' ordered' : ''}`}>
          {b.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'table':
      return (
        <figure className="block-table">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {b.headers.map((h, i) => (
                    <th key={i}>
                      <Inline text={h} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, ri) => (
                  <tr key={ri}>
                    {r.map((c, ci) => (
                      <td key={ci}>
                        <Inline text={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {b.caption && (
            <figcaption>
              <Inline text={b.caption} />
            </figcaption>
          )}
        </figure>
      );
    case 'deepdive':
      return <DeepDive title={b.title} blocks={b.blocks} />;
    case 'compare':
      return (
        <div className="compare">
          {[b.left, b.right].map((side, i) => (
            <div key={i} className={`compare-side tone-${side.tone}`}>
              <div className="compare-title">
                {side.tone === 'good' && <Icon name="check" size={16} strokeWidth={3} />}
                {side.tone === 'bad' && <Icon name="x" size={16} strokeWidth={3} />}
                <Inline text={side.title} />
              </div>
              {side.code && <CodeBlock code={side.code} lang={side.lang} bare compact />}
              {side.text && <RichText text={side.text} className="compare-text" />}
            </div>
          ))}
        </div>
      );
    case 'steps':
      return (
        <ol className="steps">
          {b.items.map((s, i) => (
            <li key={i}>
              <span className="step-num">{i + 1}</span>
              <div>
                <div className="step-title">
                  <Inline text={s.title} />
                </div>
                <RichText text={s.text} />
              </div>
            </li>
          ))}
        </ol>
      );
    case 'memory':
      return <MemoryDiagram regions={b.regions} caption={b.caption} />;
    case 'definition':
      return (
        <div className="definition">
          <div className="definition-term">
            <Icon name="book-open" size={16} /> {b.term}
          </div>
          <RichText text={b.text} />
        </div>
      );
    default:
      return null;
  }
}

function DeepDive({ title, blocks }: { title: string; blocks: Block[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`deepdive${open ? ' open' : ''}`}>
      <button
        type="button"
        className="deepdive-head"
        aria-expanded={open}
        onClick={() => {
          sfx.tap();
          setOpen((o) => !o);
        }}
      >
        <span className="deepdive-badge">
          <Icon name="layers" size={16} /> Go deeper
        </span>
        <span className="deepdive-title">
          <Inline text={title} />
        </span>
        <Icon name="chevron-down" size={18} className="deepdive-chev" />
      </button>
      <div className="deepdive-body">
        <div className="deepdive-inner">{open && <Blocks blocks={blocks} />}</div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Memory diagram with arrows drawn between pointer cells and their targets
// ---------------------------------------------------------------------------

interface Arrow {
  d: string;
  key: string;
}

function MemoryDiagram({ regions, caption }: { regions: MemoryRegion[]; caption?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const markerId = `mem-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const compute = () => {
      const box = el.getBoundingClientRect();
      const next: Arrow[] = [];
      el.querySelectorAll<HTMLElement>('[data-points-to]').forEach((src) => {
        const target = el.querySelector<HTMLElement>(`[data-cell-id="${CSS.escape(src.dataset.pointsTo!)}"]`);
        if (!target) return;
        const s = src.getBoundingClientRect();
        const t = target.getBoundingClientRect();
        const sy = s.top + s.height / 2 - box.top;
        const ty = t.top + t.height / 2 - box.top;
        let d: string;
        if (t.left >= s.right - 4) {
          const sx = s.right - box.left;
          const tx = t.left - box.left;
          const dx = Math.max(24, (tx - sx) / 2);
          d = `M${sx},${sy} C${sx + dx},${sy} ${tx - dx},${ty} ${tx - 2},${ty}`;
        } else if (t.right <= s.left + 4) {
          const sx = s.left - box.left;
          const tx = t.right - box.left;
          const dx = Math.max(24, (sx - tx) / 2);
          d = `M${sx},${sy} C${sx - dx},${sy} ${tx + dx},${ty} ${tx + 2},${ty}`;
        } else {
          // Same column: loop out to the right.
          const sx = s.right - box.left;
          const tx = t.right - box.left;
          const out = Math.max(sx, tx) + 28;
          d = `M${sx},${sy} C${out},${sy} ${out},${ty} ${tx + 2},${ty}`;
        }
        next.push({ d, key: `${src.dataset.cellKey}` });
      });
      setArrows(next);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [regions]);

  return (
    <figure className="memory">
      <div className="memory-wrap" ref={wrap}>
        {regions.map((r, ri) => (
          <div key={ri} className={`mem-region kind-${r.kind}`}>
            <div className="mem-label">
              <Icon name={r.kind === 'heap' ? 'layers' : r.kind === 'stack' ? 'memory' : 'grid'} size={14} />
              {r.label}
            </div>
            <div className="mem-cells">
              {r.cells.map((c, ci) => {
                const key = `${ri}-${ci}`;
                const isTarget = hover !== null && c.id === hover;
                return (
                  <div
                    key={ci}
                    className={`mem-cell${c.highlight ? ' hl' : ''}${isTarget ? ' target' : ''}`}
                    data-cell-id={c.id}
                  >
                    {c.address && <span className="mem-addr">{c.address}</span>}
                    <span className="mem-name">
                      {c.name && <b>{c.name}</b>}
                      {c.type && <span className="mem-type">{c.type}</span>}
                    </span>
                    <span
                      className={`mem-value${c.pointsTo ? ' ptr' : ''}`}
                      data-points-to={c.pointsTo}
                      data-cell-key={key}
                      onMouseEnter={() => c.pointsTo && setHover(c.pointsTo)}
                      onMouseLeave={() => setHover(null)}
                    >
                      {c.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <svg className="mem-arrows" aria-hidden="true">
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
            </marker>
          </defs>
          {arrows.map((a) => (
            <path key={a.key} d={a.d} markerEnd={`url(#${markerId})`} />
          ))}
        </svg>
      </div>
      {caption && (
        <figcaption>
          <Inline text={caption} />
        </figcaption>
      )}
    </figure>
  );
}
