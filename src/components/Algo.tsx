import { useEffect, useMemo, useState } from 'react';
import type { AlgoBlock, AlgoFrame, GraphColor } from '../content/types';
import { highlightLines } from '../lib/highlight';
import { Tokens } from './CodeBlock';
import { Inline } from './RichText';

/*
 * Step-through algorithm animations: arrays (boxes or bars) and graphs/trees, one frame
 * at a time, with notes, pointers, readouts and highlighted code lines.
 */

const AW = 440;

function ArrayView({ frame, arr, bars, slots }: { frame: AlgoFrame; arr: (number | string)[]; bars?: boolean; slots: number }) {
  // `slots` may be one more than the array length so a one-past-the-end pointer (hi = n) has room.
  const n = Math.max(1, slots);
  const cw = Math.min(60, (AW - 16) / n);
  const x0 = (AW - cw * n) / 2;
  const marks = new Map((frame.marks ?? []).map((m) => [m.index, m.color]));
  const dim = new Set(frame.dim ?? []);
  const ptrs = new Map<number, { label: string; color?: GraphColor }[]>();
  (frame.pointers ?? []).forEach((p) => ptrs.set(p.index, [...(ptrs.get(p.index) ?? []), p]));
  const fs = Math.max(10, Math.min(18, cw * 0.38));

  const nums = arr.map((v) => (typeof v === 'number' ? v : Number(v)));
  const maxAbs = Math.max(1, ...nums.filter(Number.isFinite).map((v) => Math.abs(v)));
  const BH = 150; // bar area
  const top = 44;
  const cellTop = bars ? top + BH : top;
  const H = (bars ? top + BH : top + cw * 0.9) + 26;

  return (
    <svg viewBox={`0 0 ${AW} ${H}`} className="algo-svg" role="img">
      {arr.map((v, i) => {
        const x = x0 + i * cw;
        const c = marks.get(i);
        const cls = c ? `algo-cell c-${c}` : 'algo-cell';
        const op = dim.has(i) ? 0.3 : 1;
        if (bars) {
          const h = Math.max(2, (Math.abs(nums[i]) / maxAbs) * (BH - 18));
          return (
            <g key={i} opacity={op}>
              <rect x={x + 2} y={cellTop - h} width={cw - 4} height={h} rx={3} className={`${cls} algo-bar`} />
              <text x={x + cw / 2} y={cellTop - h - 4} textAnchor="middle" className="algo-val" fontSize={Math.min(14, fs)}>
                {String(v)}
              </text>
              <text x={x + cw / 2} y={cellTop + 16} textAnchor="middle" className="algo-idx">
                {i}
              </text>
            </g>
          );
        }
        const h = cw * 0.9;
        return (
          <g key={i} opacity={op}>
            <rect x={x + 1.5} y={cellTop} width={cw - 3} height={h} rx={5} className={cls} />
            <text x={x + cw / 2} y={cellTop + h / 2 + fs * 0.36} textAnchor="middle" className="algo-val" fontSize={fs}>
              {String(v)}
            </text>
            <text x={x + cw / 2} y={cellTop + h + 16} textAnchor="middle" className="algo-idx">
              {i}
            </text>
          </g>
        );
      })}
      {[...ptrs.entries()].map(([i, list]) => {
        if (i < 0 || i > arr.length) return null;
        const x = x0 + i * cw + cw / 2;
        const col = list[0].color ?? 'orange';
        const yTip = bars ? top + 2 : cellTop - 3;
        return (
          <g key={`p${i}`} className={`algo-ptr c-${col}`}>
            <text x={x} y={14} textAnchor="middle" stroke="none">
              {list.map((p) => p.label).join(', ')}
            </text>
            <path d={`M${x},20 L${x},${yTip - 6}`} fill="none" strokeWidth={2} />
            <path d={`M${x - 5},${yTip - 8} L${x + 5},${yTip - 8} L${x},${yTip} Z`} stroke="none" />
          </g>
        );
      })}
    </svg>
  );
}

function GraphView({ a, frame }: { a: AlgoBlock; frame: AlgoFrame }) {
  const W = a.width ?? 420;
  const H = a.height ?? 260;
  const nodes = a.nodes ?? [];
  // Circles grow to fit longer labels (e.g. "MEM", "0x1F").
  const radius = (id: string) => {
    const n = byIdLabel.get(id) ?? id;
    return Math.max(18, n.length * 4.6 + 8);
  };
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byIdLabel = new Map(nodes.map((n) => [n.id, frame.nodeLabels?.find((l) => l.id === n.id)?.label ?? n.label ?? n.id]));
  const hidden = new Set(frame.hidden ?? []);
  const ncol = new Map((frame.nodeColors ?? []).map((c) => [c.id, c.color]));
  const notes = new Map((frame.nodeNotes ?? []).map((c) => [c.id, c.text]));
  const labels = new Map((frame.nodeLabels ?? []).map((c) => [c.id, c.label]));
  const ecol = new Map<string, GraphColor>();
  (frame.edgeColors ?? []).forEach((e) => {
    ecol.set(`${e.from}>${e.to}`, e.color);
  });
  const edgeColor = (f: string, t: string, directed?: boolean) => ecol.get(`${f}>${t}`) ?? (directed ? undefined : ecol.get(`${t}>${f}`));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="algo-svg" role="img">
      {(a.edges ?? []).map((e, i) => {
        const p = byId.get(e.from);
        const q = byId.get(e.to);
        if (!p || !q || hidden.has(e.from) || hidden.has(e.to)) return null;
        const dx = q.x - p.x, dy = q.y - p.y;
        const L = Math.hypot(dx, dy) || 1;
        const ux = dx / L, uy = dy / L;
        const rp = radius(e.from), rq = radius(e.to);
        const x1 = p.x + ux * rp, y1 = p.y + uy * rp;
        const x2 = q.x - ux * (rq + (e.directed ? 2 : 0)), y2 = q.y - uy * (rq + (e.directed ? 2 : 0));
        const c = edgeColor(e.from, e.to, e.directed);
        const h = 9;
        return (
          <g key={i} className={c ? `algo-edge on c-${c}` : 'algo-edge'}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={c ? 3.5 : 1.8} />
            {e.directed && (
              <path
                d={`M${x2},${y2} L${x2 - h * ux + h * 0.5 * uy},${y2 - h * uy - h * 0.5 * ux} L${x2 - h * ux - h * 0.5 * uy},${y2 - h * uy + h * 0.5 * ux} Z`}
                stroke="none"
                className={c ? `c-${c}` : 'algo-head'}
              />
            )}
            {e.label && (
              <text x={(p.x + q.x) / 2 - uy * 11} y={(p.y + q.y) / 2 + ux * 11 + 4} textAnchor="middle" className="algo-elabel" stroke="none">
                {e.label}
              </text>
            )}
          </g>
        );
      })}
      {nodes.map((n) => {
        if (hidden.has(n.id)) return null;
        const c = ncol.get(n.id);
        const note = notes.get(n.id);
        return (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={radius(n.id)} className={c ? `algo-node c-${c}` : 'algo-node'} />
            <text x={n.x} y={n.y + 5} textAnchor="middle" className="algo-nlabel">
              {labels.get(n.id) ?? n.label ?? n.id}
            </text>
            {note !== undefined && (
              <text x={n.x} y={n.y + radius(n.id) + 15} textAnchor="middle" className="algo-note">
                {note}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function Algo({ a }: { a: AlgoBlock }) {
  const [k, setK] = useState(0);
  const [playing, setPlaying] = useState(false);
  const n = a.frames.length;

  // The array carries forward from the last frame that set it.
  const arrays = useMemo(() => {
    const out: (number | string)[][] = [];
    let cur: (number | string)[] = [];
    for (const f of a.frames) {
      if (f.array) cur = f.array;
      out.push(cur);
    }
    return out;
  }, [a.frames]);

  // Layout width: the longest array, plus one slot if any pointer ever sits one past the end.
  const slots = useMemo(() => {
    let m = 1;
    a.frames.forEach((f, i) => {
      const len = arrays[i].length;
      m = Math.max(m, len);
      if ((f.pointers ?? []).some((p) => p.index >= len)) m = Math.max(m, len + 1);
    });
    return m;
  }, [a.frames, arrays]);

  const codeLines = useMemo(() => (a.code ? highlightLines(a.code, a.lang ?? 'cpp') : null), [a.code, a.lang]);

  useEffect(() => {
    if (!playing) return;
    if (k >= n - 1) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setK((x) => Math.min(n - 1, x + 1)), a.interval ?? 1000);
    return () => window.clearTimeout(id);
  }, [playing, k, n, a.interval]);

  const frame = a.frames[k];
  const hl = new Set(frame.lines ?? []);
  const go = (i: number) => {
    setPlaying(false);
    setK(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <figure className="graph algo">
      <div className="algo-pic">{a.view === 'array' ? <ArrayView frame={frame} arr={arrays[k]} bars={a.bars} slots={slots} /> : <GraphView a={a} frame={frame} />}</div>
      <div className="algo-note-line" aria-live="polite">
        <span className="algo-count">
          {k + 1}/{n}
        </span>
        <span className="algo-note-text">
          <Inline text={frame.note} />
        </span>
      </div>
      {frame.vars && frame.vars.length > 0 && (
        <div className="graph-readouts">
          {frame.vars.map(([name, val], i) => (
            <span key={i} className="graph-readout">
              <Inline text={name} /> <b><Inline text={val} /></b>
            </span>
          ))}
        </div>
      )}
      <div className="algo-controls">
        <button type="button" className="algo-btn" onClick={() => go(0)} disabled={k === 0} aria-label="First step">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
            <rect x="2.5" y="3" width="2" height="10" rx="0.8" fill="currentColor" />
            <path d="M13.5 3 L5.5 8 L13.5 13 Z" fill="currentColor" />
          </svg>
        </button>
        <button type="button" className="algo-btn" onClick={() => go(k - 1)} disabled={k === 0} aria-label="Previous step">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
            <path d="M11.5 2.5 L4.5 8 L11.5 13.5 Z" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          className={`algo-btn play${playing ? ' on' : ''}`}
          onClick={() => {
            if (playing) setPlaying(false);
            else {
              if (k >= n - 1) setK(0);
              setPlaying(true);
            }
          }}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
              <rect x="3" y="2.5" width="3.6" height="11" rx="1" fill="currentColor" />
              <rect x="9.4" y="2.5" width="3.6" height="11" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
              <path d="M4 2.5 L13.5 8 L4 13.5 Z" fill="currentColor" />
            </svg>
          )}
        </button>
        <button type="button" className="algo-btn" onClick={() => go(k + 1)} disabled={k === n - 1} aria-label="Next step">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
            <path d="M4.5 2.5 L11.5 8 L4.5 13.5 Z" fill="currentColor" />
          </svg>
        </button>
        <input
          type="range"
          className="algo-scrub"
          min={0}
          max={n - 1}
          step={1}
          value={k}
          onChange={(e) => go(Number(e.target.value))}
          aria-label="Step"
        />
      </div>
      {codeLines && (
        <div className="code-block bare algo-code">
          <pre className="code">
            {codeLines.map((toks, i) => (
              <div key={i} className={`algo-line${hl.has(i + 1) ? ' hl' : ''}`}>
                <span className="algo-ln">{i + 1}</span>
                <span className="algo-src">
                  <Tokens tokens={toks} />
                  {toks.length === 0 ? ' ' : ''}
                </span>
              </div>
            ))}
          </pre>
        </div>
      )}
      {a.caption && (
        <figcaption>
          <Inline text={a.caption} />
        </figcaption>
      )}
    </figure>
  );
}
