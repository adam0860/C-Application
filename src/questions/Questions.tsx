import { useEffect, useImperativeHandle, useMemo, useState, type Ref } from 'react';
import type {
  BugQuestion,
  FillQuestion,
  McqQuestion,
  OrderQuestion,
  QuestionStep,
  TrueFalseQuestion,
} from '../content/types';
import { CodeBlock, Tokens } from '../components/CodeBlock';
import { Icon } from '../components/Icon';
import { Inline, RichText } from '../components/RichText';
import { highlightLines } from '../lib/highlight';
import { shuffled, shuffledNotIdentity } from '../lib/random';
import { useSettings } from '../lib/store';
import { sfx } from '../lib/sound';
import { haptic } from '../lib/platform';

export interface QuestionHandle {
  /** Grade the current answer. */
  evaluate(): boolean;
}

interface QProps<Q> {
  q: Q;
  revealed: boolean;
  onReady: (ready: boolean) => void;
  seed: number;
  ref?: Ref<QuestionHandle>;
}

const LETTERS = 'ABCDEFGH';

export const KIND_LABEL: Record<QuestionStep['kind'], string> = {
  mcq: 'Multiple choice',
  truefalse: 'True or false',
  fill: 'Fill in the blanks',
  order: 'Put in order',
  bug: 'Find the bug',
};

export function QuestionView({
  q,
  revealed,
  onReady,
  seed,
  ref,
}: {
  q: QuestionStep;
  revealed: boolean;
  onReady: (r: boolean) => void;
  seed: number;
  ref?: Ref<QuestionHandle>;
}) {
  const showCode = q.code && (q.kind === 'mcq' || q.kind === 'truefalse' || q.kind === 'order');
  return (
    <div className={`question q-${q.kind}`}>
      <div className="q-kind">
        <Icon name={q.kind === 'bug' ? 'bug' : q.kind === 'order' ? 'list' : q.kind === 'fill' ? 'type' : 'help'} size={14} />
        {KIND_LABEL[q.kind]}
        {q.kind === 'mcq' && q.multi && <span className="q-multi">· select all that apply</span>}
      </div>
      <div className="q-prompt">
        <RichText text={q.prompt} />
      </div>
      {showCode && <CodeBlock code={q.code!} lang={q.lang} compact />}
      {q.kind === 'mcq' && <Mcq q={q} revealed={revealed} onReady={onReady} seed={seed} ref={ref} />}
      {q.kind === 'truefalse' && <TrueFalse q={q} revealed={revealed} onReady={onReady} seed={seed} ref={ref} />}
      {q.kind === 'fill' && <Fill q={q} revealed={revealed} onReady={onReady} seed={seed} ref={ref} />}
      {q.kind === 'order' && <Order q={q} revealed={revealed} onReady={onReady} seed={seed} ref={ref} />}
      {q.kind === 'bug' && <Bug q={q} revealed={revealed} onReady={onReady} seed={seed} ref={ref} />}
    </div>
  );
}

function useNumberKeys(active: boolean, count: number, onKey: (i: number) => void) {
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= count) {
        e.preventDefault();
        onKey(n - 1);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [active, count, onKey]);
}

const feedbackTap = () => {
  sfx.select();
  void haptic('light');
};

// ---------------------------------------------------------------------------

function Mcq({ q, revealed, onReady, seed, ref }: QProps<McqQuestion>) {
  const settings = useSettings();
  const order = useMemo(
    () => (settings.shuffleOptions ? shuffled(q.options.map((_, i) => i), seed) : q.options.map((_, i) => i)),
    [q, seed, settings.shuffleOptions],
  );
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => onReady(selected.length > 0), [selected, onReady]);
  useImperativeHandle(ref, () => ({
    evaluate: () => {
      const correct = q.options.flatMap((o, i) => (o.correct ? [i] : []));
      return correct.length === selected.length && correct.every((i) => selected.includes(i));
    },
  }));

  const toggle = (i: number) => {
    if (revealed) return;
    feedbackTap();
    setSelected((s) => (q.multi ? (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]) : [i]));
  };
  useNumberKeys(!revealed, order.length, (k) => toggle(order[k]));

  return (
    <div className={`options${q.codeOptions ? ' code-options' : ''}`} role={q.multi ? 'group' : 'radiogroup'}>
      {order.map((idx, pos) => {
        const o = q.options[idx];
        const isSel = selected.includes(idx);
        const state = revealed ? (o.correct ? 'correct' : isSel ? 'wrong' : 'dim') : isSel ? 'selected' : '';
        return (
          <button
            key={idx}
            type="button"
            className={`option ${state}`}
            onClick={() => toggle(idx)}
            role={q.multi ? 'checkbox' : 'radio'}
            aria-checked={isSel}
            disabled={revealed}
          >
            <span className={`option-key${q.multi ? ' square' : ''}`}>
              {revealed && o.correct ? (
                <Icon name="check" size={14} strokeWidth={3} />
              ) : revealed && isSel ? (
                <Icon name="x" size={14} strokeWidth={3} />
              ) : (
                LETTERS[pos]
              )}
            </span>
            <span className="option-body">
              <span className="option-text">
                {q.codeOptions ? <OptionCode text={o.text} /> : <Inline text={o.text} />}
              </span>
              {revealed && o.why && (isSel || o.correct || q.options.length <= 4) && (
                <span className="option-why">
                  <Inline text={o.why} />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OptionCode({ text }: { text: string }) {
  const lines = useMemo(() => highlightLines(text, 'cpp'), [text]);
  return (
    <code className="opt-code">
      {lines.map((l, i) => (
        <span key={i} className="opt-code-line">
          <Tokens tokens={l} />
        </span>
      ))}
    </code>
  );
}

// ---------------------------------------------------------------------------

function TrueFalse({ q, revealed, onReady, ref }: QProps<TrueFalseQuestion>) {
  const [value, setValue] = useState<boolean | null>(null);
  useEffect(() => onReady(value !== null), [value, onReady]);
  useImperativeHandle(ref, () => ({ evaluate: () => value === q.answer }));
  const choose = (v: boolean) => {
    if (revealed) return;
    feedbackTap();
    setValue(v);
  };
  useNumberKeys(!revealed, 2, (k) => choose(k === 0));
  return (
    <div className="tf">
      {[true, false].map((v) => {
        const isSel = value === v;
        const state = revealed ? (q.answer === v ? 'correct' : isSel ? 'wrong' : 'dim') : isSel ? 'selected' : '';
        return (
          <button key={String(v)} type="button" className={`tf-btn ${state}`} onClick={() => choose(v)} disabled={revealed}>
            <Icon name={v ? 'check' : 'x'} size={22} strokeWidth={3} />
            {v ? 'True' : 'False'}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

const normalize = (s: string, caseSensitive: boolean) => {
  const t = s.trim().replace(/\s+/g, ' ');
  return caseSensitive ? t : t.toLowerCase();
};

function Fill({ q, revealed, onReady, seed, ref }: QProps<FillQuestion>) {
  const isCode = q.templateIsCode !== false;
  const n = q.blanks.length;
  const [values, setValues] = useState<string[]>(() => Array(n).fill(''));
  const [chipOf, setChipOf] = useState<(number | null)[]>(() => Array(n).fill(null));
  const [focus, setFocus] = useState(0);
  const bank = useMemo(() => (q.wordBank ? shuffledNotIdentity(q.wordBank, seed) : null), [q.wordBank, seed]);

  useEffect(() => onReady(values.every((v) => v.trim() !== '')), [values, onReady]);
  const isRight = (i: number) =>
    q.blanks[i].answers.some(
      (a) => normalize(a, q.blanks[i].caseSensitive ?? isCode) === normalize(values[i], q.blanks[i].caseSensitive ?? isCode),
    );
  useImperativeHandle(ref, () => ({ evaluate: () => q.blanks.every((_, i) => isRight(i)) }));

  const placeChip = (chip: number) => {
    if (revealed || !bank) return;
    let target = values[focus] === '' ? focus : values.findIndex((v) => v === '');
    if (target === -1) target = focus;
    feedbackTap();
    const nv = [...values];
    const nc = [...chipOf];
    nv[target] = bank[chip];
    nc[target] = chip;
    setValues(nv);
    setChipOf(nc);
    const nextEmpty = nv.findIndex((v) => v === '');
    setFocus(nextEmpty === -1 ? target : nextEmpty);
  };
  const clearBlank = (i: number) => {
    if (revealed) return;
    if (bank) {
      if (values[i] === '') {
        setFocus(i);
        return;
      }
      sfx.tap();
      const nv = [...values];
      const nc = [...chipOf];
      nv[i] = '';
      nc[i] = null;
      setValues(nv);
      setChipOf(nc);
      setFocus(i);
    }
  };

  const slot = (i: number) => {
    const state = revealed ? (isRight(i) ? 'correct' : 'wrong') : focus === i && bank ? 'focus' : '';
    if (!bank) {
      return (
        <span className={`blank-wrap ${state}`} key={`b${i}`}>
          <input
            className={`blank-input ${state}`}
            value={values[i]}
            disabled={revealed}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            aria-label={`Blank ${i + 1}`}
            size={Math.max(4, values[i].length + 1, ...q.blanks[i].answers.map((a) => Math.min(a.length, 14)))}
            onChange={(e) => {
              const nv = [...values];
              nv[i] = e.target.value;
              setValues(nv);
            }}
            onFocus={() => setFocus(i)}
          />
          {revealed && !isRight(i) && <span className="blank-answer">{q.blanks[i].answers[0]}</span>}
        </span>
      );
    }
    return (
      <span className={`blank-wrap ${state}`} key={`b${i}`}>
        <button type="button" className={`blank ${state}${values[i] ? ' filled' : ''}`} onClick={() => clearBlank(i)} disabled={revealed}>
          {values[i] || ' '}
        </button>
        {revealed && !isRight(i) && <span className="blank-answer">{q.blanks[i].answers[0]}</span>}
      </span>
    );
  };

  // Render the template with blanks spliced into the highlighted tokens.
  const rendered = useMemo(() => {
    let k = 0;
    const marked = q.template.replace(/___/g, () => `__BLANK${k++}__`);
    return isCode ? highlightLines(marked, q.lang ?? 'cpp') : null;
  }, [q.template, q.lang, isCode]);

  const splitWithSlots = (text: string, cls?: string) =>
    text.split(/(__BLANK\d+__)/).map((part, j) => {
      const m = /^__BLANK(\d+)__$/.exec(part);
      if (m) return slot(Number(m[1]));
      return part ? (
        <span key={j} className={cls}>
          {part}
        </span>
      ) : null;
    });

  return (
    <div className="fill">
      {isCode && rendered ? (
        <div className="code-block bare fill-code">
          <div className="code-scroll">
            <pre className="code">
              {rendered.map((toks, li) => (
                <div className="line" key={li}>
                  <span className="lc">
                    {toks.length === 0
                      ? '​'
                      : toks.map((t, ti) => <span key={ti}>{splitWithSlots(t.text, `tk-${t.kind}`)}</span>)}
                  </span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      ) : (
        <p className="fill-sentence">
          {(() => {
            let k = 0;
            return q.template.split('___').map((seg, i, arr) => (
              <span key={i}>
                <Inline text={seg} />
                {i < arr.length - 1 && slot(k++)}
              </span>
            ));
          })()}
        </p>
      )}
      {bank && (
        <div className="word-bank">
          {bank.map((w, ci) => {
            const used = chipOf.includes(ci);
            return (
              <button
                key={ci}
                type="button"
                className={`chip${used ? ' used' : ''}${isCode ? ' mono' : ''}`}
                onClick={() => !used && placeChip(ci)}
                disabled={revealed || used}
              >
                {w}
              </button>
            );
          })}
        </div>
      )}
      {!bank && !revealed && <div className="fill-help">Type your answer{n > 1 ? 's' : ''} in the highlighted blank{n > 1 ? 's' : ''}.</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface OrderItem {
  id: number;
  text: string;
}

function Order({ q, revealed, onReady, seed, ref }: QProps<OrderQuestion>) {
  const isCode = q.linesAreCode !== false;
  const items: OrderItem[] = useMemo(
    () => [...q.lines, ...(q.distractors ?? [])].map((text, id) => ({ id, text })),
    [q.lines, q.distractors],
  );
  const poolOrder = useMemo(() => shuffledNotIdentity(items, seed), [items, seed]);
  const [answer, setAnswer] = useState<number[]>([]);

  useEffect(() => onReady(answer.length >= q.lines.length), [answer, onReady, q.lines.length]);
  const isCorrect = () => answer.length === q.lines.length && answer.every((id, i) => items[id].text === q.lines[i]);
  useImperativeHandle(ref, () => ({ evaluate: isCorrect }));

  const add = (id: number) => {
    if (revealed) return;
    feedbackTap();
    setAnswer((a) => [...a, id]);
  };
  const remove = (id: number) => {
    if (revealed) return;
    sfx.tap();
    setAnswer((a) => a.filter((x) => x !== id));
  };

  const lineText = (text: string, keepIndent: boolean) => {
    const t = keepIndent ? text : text.trimStart();
    if (!isCode) return <Inline text={t} />;
    const toks = highlightLines(t, q.lang ?? 'cpp')[0] ?? [];
    return (
      <code className="order-code">
        <Tokens tokens={toks} />
      </code>
    );
  };

  return (
    <div className="order">
      <div className="order-answer">
        {answer.length === 0 && <div className="order-empty">Tap the lines below in the right order</div>}
        {answer.map((id, pos) => {
          const state = revealed ? (items[id].text === q.lines[pos] ? 'correct' : 'wrong') : '';
          return (
            <button key={id} type="button" className={`order-line placed ${state}`} onClick={() => remove(id)} disabled={revealed}>
              <span className="order-pos">{pos + 1}</span>
              {lineText(items[id].text, true)}
            </button>
          );
        })}
      </div>
      {!revealed && (
        <div className="order-pool">
          {poolOrder.map((it) => {
            const used = answer.includes(it.id);
            return (
              <button key={it.id} type="button" className={`order-line pool${used ? ' used' : ''}`} onClick={() => !used && add(it.id)} disabled={used}>
                {lineText(it.text, false)}
              </button>
            );
          })}
        </div>
      )}
      {revealed && !isCorrect() && (
        <div className="order-solution">
          <div className="order-solution-label">Correct order</div>
          <CodeBlock code={q.lines.join('\n')} lang={isCode ? (q.lang ?? 'cpp') : 'text'} bare compact />
        </div>
      )}
      {!revealed && (
        <div className="order-count">
          {answer.length} / {q.lines.length} placed
          {q.distractors?.length ? ' · some lines don’t belong' : ''}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Bug({ q, revealed, onReady, ref }: QProps<BugQuestion>) {
  const [line, setLine] = useState<number | null>(null);
  useEffect(() => onReady(line !== null), [line, onReady]);
  useImperativeHandle(ref, () => ({ evaluate: () => line !== null && q.bugLines.includes(line) }));
  return (
    <div className="bug">
      <CodeBlock
        code={q.code}
        lang={q.lang}
        bare
        onLineClick={
          revealed
            ? undefined
            : (n) => {
                feedbackTap();
                setLine(n);
              }
        }
        lineClass={(n) => {
          if (revealed) {
            if (q.bugLines.includes(n)) return n === line ? 'bug-correct' : 'bug-answer';
            if (n === line) return 'bug-wrong';
            return undefined;
          }
          return n === line ? 'bug-selected' : undefined;
        }}
      />
      {!revealed && <div className="fill-help">Tap the line that contains the bug.</div>}
    </div>
  );
}
