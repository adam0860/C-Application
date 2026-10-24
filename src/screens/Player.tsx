import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuestionStep, Step } from '../content/types';
import { ConceptCard } from '../components/ConceptCard';
import { Icon } from '../components/Icon';
import { RichText } from '../components/RichText';
import { QuestionView, type QuestionHandle } from '../questions/Questions';
import { haptic } from '../lib/platform';
import { pick, hashString } from '../lib/random';
import { sfx } from '../lib/sound';
import { useSettings } from '../lib/store';
import { confirmDialog } from '../lib/ui';

export interface PlayerItem {
  lessonId: string;
  stepIndex: number;
  step: Step;
  /** Optional context line shown above practice questions, e.g. the lesson title. */
  context?: string;
}

export interface AnswerRecord {
  item: PlayerItem;
  firstTryCorrect: boolean;
}

export interface PlayerResult {
  answers: AnswerRecord[];
  seconds: number;
}

const PRAISE = ['Correct!', 'Nice work!', 'Exactly right!', 'You got it!', 'Spot on!', 'Brilliant!', 'Nailed it!', 'Perfect!'];
const ENCOURAGE = ['Not quite', 'Almost there', 'Good try', 'Let’s review this one'];

export function Player({
  items,
  title,
  onExit,
  onComplete,
  xpPerCorrect = 2,
}: {
  items: PlayerItem[];
  title: string;
  onExit: () => void;
  onComplete: (r: PlayerResult) => void;
  xpPerCorrect?: number;
}) {
  const settings = useSettings();
  const [queue, setQueue] = useState<number[]>(() => items.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [passed, setPassed] = useState<Set<number>>(() => new Set());
  const firstTry = useRef(new Map<number, boolean>());
  const retried = useRef(new Set<number>());
  const startedAt = useRef(Date.now());
  const qref = useRef<QuestionHandle>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);

  const itemIndex = queue[pos];
  const item = items[itemIndex];
  const step = item.step;
  const isQuestion = step.kind !== 'concept';
  const isRetry = isQuestion && firstTry.current.has(itemIndex) && !revealed;
  const message = useMemo(() => (correct ? pick(PRAISE) : pick(ENCOURAGE)), [correct]);

  const onReady = useCallback((r: boolean) => setReady(r), []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
    setReady(false);
    setHintOpen(false);
  }, [pos]);

  const finish = useCallback(() => {
    const answers: AnswerRecord[] = [];
    items.forEach((it, i) => {
      if (it.step.kind !== 'concept') answers.push({ item: it, firstTryCorrect: firstTry.current.get(i) ?? false });
    });
    onComplete({ answers, seconds: Math.min(3600, Math.round((Date.now() - startedAt.current) / 1000)) });
  }, [items, onComplete]);

  const advance = useCallback(() => {
    setRevealed(false);
    setCorrect(null);
    setAttempt((a) => a + 1);
    if (pos + 1 >= queue.length) finish();
    else setPos(pos + 1);
  }, [pos, queue.length, finish]);

  const grade = useCallback(
    (isCorrect: boolean) => {
      setRevealed(true);
      setCorrect(isCorrect);
      if (!firstTry.current.has(itemIndex)) firstTry.current.set(itemIndex, isCorrect);
      const canRetry = !isCorrect && settings.retryMistakes && !retried.current.has(itemIndex);
      if (canRetry) {
        retried.current.add(itemIndex);
        setQueue((q) => [...q, itemIndex]);
      } else {
        setPassed((p) => new Set(p).add(itemIndex));
      }
      if (isCorrect) {
        sfx.correct();
        void haptic('success');
      } else {
        sfx.wrong();
        void haptic('error');
        // Options shake themselves; for other question types shake the whole card.
        if (step.kind === 'fill' || step.kind === 'order' || step.kind === 'bug') {
          cardRef.current?.animate(
            [0, -7, 7, -7, 7, -4, 4, 0].map((x) => ({ transform: `translateX(${x}px)` })),
            { duration: 450, easing: 'ease-out' },
          );
        }
      }
    },
    [itemIndex, settings.retryMistakes, step.kind],
  );

  const check = useCallback(() => {
    if (!ready || revealed || !qref.current) return;
    grade(qref.current.evaluate());
  }, [ready, revealed, grade]);

  const giveUp = useCallback(() => {
    if (revealed) return;
    grade(false);
  }, [revealed, grade]);

  const continueConcept = useCallback(() => {
    sfx.tap();
    setPassed((p) => new Set(p).add(itemIndex));
    advance();
  }, [advance, itemIndex]);

  const back = useCallback(() => {
    if (pos === 0 || revealed) return;
    sfx.tap();
    setPos(pos - 1);
  }, [pos, revealed]);

  const exit = useCallback(async () => {
    const started = pos > 0 || revealed;
    if (!started || (await confirmDialog({ title: 'Leave this lesson?', body: 'Your progress in this session will not be saved.', confirmLabel: 'Leave', cancelLabel: 'Keep learning', danger: true }))) {
      onExit();
    }
  }, [pos, revealed, onExit]);

  // Keyboard: Enter = primary action, ← = back, Esc = exit, H = hint.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (document.querySelector('.modal-backdrop')) return;
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        if (!isQuestion) continueConcept();
        else if (revealed) advance();
        else check();
      } else if (e.key === 'Escape') {
        void exit();
      } else if (e.key === 'ArrowLeft' && !isQuestion && !(e.target instanceof HTMLInputElement)) {
        back();
      } else if ((e.key === 'h' || e.key === 'H') && isQuestion && !revealed && !(e.target instanceof HTMLInputElement)) {
        const q = step as QuestionStep;
        if (q.hint) {
          sfx.hint();
          setHintOpen(true);
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isQuestion, revealed, continueConcept, advance, check, exit, back, step]);

  const progress = passed.size / items.length;
  const q = isQuestion ? (step as QuestionStep) : null;
  const seed = hashString(`${item.lessonId}#${item.stepIndex}`) + attempt * 31;

  return (
    <div className="player">
      <header className="player-head">
        <button type="button" className="icon-btn" onClick={() => void exit()} aria-label="Close lesson">
          <Icon name="x" size={22} />
        </button>
        <div className="player-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="player-progress-fill" style={{ width: `${Math.max(3, progress * 100)}%` }} />
        </div>
        <div className="player-count" title={title}>
          {Math.min(passed.size + 1, items.length)}/{items.length}
        </div>
      </header>

      <div className="player-body" ref={bodyRef}>
        <div className="player-card" key={`${pos}-${attempt}`} ref={cardRef}>
          {item.context && <div className="player-context">{item.context}</div>}
          {isRetry && (
            <div className="retry-badge">
              <Icon name="refresh" size={14} /> Let’s try this one again
            </div>
          )}
          {step.kind === 'concept' ? (
            <ConceptCard step={step} />
          ) : (
            <QuestionView q={step} revealed={revealed} onReady={onReady} seed={seed} ref={qref} />
          )}
          {q?.hint && !revealed && hintOpen && (
            <div className="hint-box">
              <Icon name="hint" size={16} />
              <RichText text={q.hint} />
            </div>
          )}
        </div>
      </div>

      <footer className={`player-foot${revealed ? (correct ? ' good' : ' bad') : ''}`}>
        {revealed && q ? (
          <div className="feedback" role="status" aria-live="polite">
            <div className="feedback-head">
              <span className={`feedback-icon${correct ? ' good' : ' bad'}`}>
                <Icon name={correct ? 'check' : 'x'} size={24} strokeWidth={3} />
              </span>
              <span className="feedback-title">{message}</span>
              {correct && !retried.current.has(itemIndex) && <span className="xp-pop">+{xpPerCorrect} XP</span>}
            </div>
            <div className="feedback-text">
              <RichText text={q.explanation} />
            </div>
            <div className="foot-actions">
              <button type="button" className={`btn btn-lg ${correct ? 'btn-success' : 'btn-danger'} grow`} onClick={advance} autoFocus>
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="foot-actions">
            {isQuestion ? (
              <>
                {q?.hint && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      sfx.hint();
                      setHintOpen((o) => !o);
                    }}
                  >
                    <Icon name="hint" size={18} /> Hint
                  </button>
                )}
                <button type="button" className="btn btn-ghost subtle" onClick={giveUp}>
                  Show answer
                </button>
                <button type="button" className="btn btn-lg btn-primary grow" onClick={check} disabled={!ready}>
                  Check
                </button>
              </>
            ) : (
              <>
                {pos > 0 && items[queue[pos - 1]].step.kind === 'concept' && (
                  <button type="button" className="btn btn-ghost" onClick={back} aria-label="Previous card">
                    <Icon name="arrow-left" size={18} /> Back
                  </button>
                )}
                <button type="button" className="btn btn-lg btn-primary grow" onClick={continueConcept}>
                  Continue
                </button>
              </>
            )}
          </div>
        )}
      </footer>
    </div>
  );
}
