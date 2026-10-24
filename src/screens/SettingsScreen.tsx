import { useRef, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { CodeBlock } from '../components/CodeBlock';
import { isNative, isTouch } from '../lib/platform';
import { sfx } from '../lib/sound';
import {
  defaultSettings,
  exportData,
  importData,
  progressStore,
  setSettings,
  useSettings,
  type Accent,
  type Settings,
  type ThemePref,
} from '../lib/store';
import { confirmDialog, toast } from '../lib/ui';

const ACCENTS: { id: Accent; label: string; color: string }[] = [
  { id: 'ocean', label: 'Ocean', color: 'linear-gradient(135deg,#3b6cff,#00b4d8)' },
  { id: 'violet', label: 'Violet', color: 'linear-gradient(135deg,#7c4dff,#c04dff)' },
  { id: 'emerald', label: 'Emerald', color: 'linear-gradient(135deg,#10b981,#0ea5a4)' },
  { id: 'sunset', label: 'Sunset', color: 'linear-gradient(135deg,#f97316,#f43f5e)' },
  { id: 'rose', label: 'Rose', color: 'linear-gradient(135deg,#e11d48,#c026d3)' },
];

const THEMES: { id: ThemePref; label: string; icon: string }[] = [
  { id: 'system', label: 'System', icon: 'monitor' },
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'midnight', label: 'Midnight', icon: 'sparkles' },
];

const SAMPLE = `// Preview
UPROPERTY(EditAnywhere, Category = "Combat")
float MaxHealth = 100.0f;

int main() {
    std::vector<int> scores{90, 75, 88};
    return 0;
}`;

export function SettingsScreen() {
  const s = useSettings();
  const fileInput = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Settings>) => {
    setSettings(patch);
    sfx.tap();
  };

  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cpp-forge-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ icon: 'download', title: 'Progress exported' });
  };

  const doImport = async (file: File) => {
    const text = await file.text();
    if (importData(text)) toast({ icon: 'check', title: 'Progress imported', tone: 'success' });
    else toast({ icon: 'warning', title: 'That file isn’t a C++ Forge backup' });
  };

  const reset = async () => {
    const ok = await confirmDialog({
      title: 'Reset all progress?',
      body: 'This erases your XP, streak, completed lessons, review queue and achievements. Settings are kept. This cannot be undone.',
      confirmLabel: 'Reset progress',
      danger: true,
    });
    if (ok) {
      progressStore.replace({ ...progressStore.get(), lessons: {}, xp: 0, dailyXp: {}, streak: { current: 0, best: 0, lastDay: null }, review: {}, achievements: {}, stats: { questionsAnswered: 0, questionsCorrect: 0, secondsLearning: 0, practiceSessions: 0, perfectLessons: 0 }, lastLessonId: null, createdAt: Date.now() });
      toast({ icon: 'trash', title: 'Progress reset' });
    }
  };

  return (
    <div className="screen settings">
      <header className="page-head">
        <h1>Settings</h1>
      </header>

      <Group title="Profile" icon="user">
        <Row label="Your name" hint="Used for greetings. Stored only on this device.">
          <input className="text-input" value={s.name} maxLength={30} placeholder="Learner" onChange={(e) => setSettings({ name: e.target.value })} />
        </Row>
        <Row label="Daily goal" hint="XP you aim to earn each day.">
          <select className="select" value={s.dailyGoal} onChange={(e) => set({ dailyGoal: Number(e.target.value) })}>
            <option value={10}>Casual · 10 XP</option>
            <option value={30}>Regular · 30 XP</option>
            <option value={50}>Serious · 50 XP</option>
            <option value={80}>Intense · 80 XP</option>
          </select>
        </Row>
      </Group>

      <Group title="Appearance" icon="palette">
        <div className="setting-block">
          <div className="setting-label">Theme</div>
          <div className="theme-picker">
            {THEMES.map((t) => (
              <button key={t.id} type="button" className={`theme-opt theme-${t.id}${s.theme === t.id ? ' on' : ''}`} onClick={() => set({ theme: t.id })}>
                <span className="theme-swatch">
                  <Icon name={t.icon} size={18} />
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-block">
          <div className="setting-label">Accent colour</div>
          <div className="accent-picker">
            {ACCENTS.map((a) => (
              <button key={a.id} type="button" className={`accent-opt${s.accent === a.id ? ' on' : ''}`} onClick={() => set({ accent: a.id })} aria-label={a.label} title={a.label}>
                <span style={{ background: a.color }}>{s.accent === a.id && <Icon name="check" size={16} strokeWidth={3} />}</span>
              </button>
            ))}
          </div>
        </div>
        <Row label="Text size">
          <Stepper value={s.textScale} min={0.9} max={1.3} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ textScale: v })} />
        </Row>
        <Row label="Code font size">
          <Stepper value={s.codeFontSize} min={11} max={20} step={1} format={(v) => `${v}px`} onChange={(v) => set({ codeFontSize: v })} />
        </Row>
        <Row label="Code theme" hint="Keep code blocks dark even in light mode.">
          <select className="select" value={s.codeTheme} onChange={(e) => set({ codeTheme: e.target.value as Settings['codeTheme'] })}>
            <option value="match">Match app theme</option>
            <option value="dark">Always dark</option>
          </select>
        </Row>
        <Toggle label="Line numbers" checked={s.lineNumbers} onChange={(v) => set({ lineNumbers: v })} />
        <Toggle label="Wrap long code lines" hint="Otherwise long lines scroll sideways." checked={s.wrapCode} onChange={(v) => set({ wrapCode: v })} />
        <div className="setting-preview">
          <CodeBlock code={SAMPLE} title="Preview" />
        </div>
        <Row label="Animations">
          <select className="select" value={s.motion} onChange={(e) => set({ motion: e.target.value as Settings['motion'] })}>
            <option value="system">Follow system</option>
            <option value="full">Full</option>
            <option value="reduced">Reduced</option>
          </select>
        </Row>
      </Group>

      <Group title="Sound & feedback" icon="volume">
        <Toggle label="Sound effects" hint="Chimes for correct and incorrect answers." checked={s.sound} onChange={(v) => set({ sound: v })} />
        {s.sound && (
          <Row label="Volume">
            <input
              className="range"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.volume}
              onChange={(e) => setSettings({ volume: Number(e.target.value) })}
              onPointerUp={() => sfx.correct()}
              onKeyUp={() => sfx.correct()}
            />
          </Row>
        )}
        {(isNative || isTouch) && <Toggle label="Haptic feedback" hint="Vibrate on answers." checked={s.haptics} onChange={(v) => set({ haptics: v })} />}
        <Toggle label="Celebrations" hint="Confetti when you finish a lesson." checked={s.celebrations} onChange={(v) => set({ celebrations: v })} />
      </Group>

      <Group title="Learning" icon="learn">
        <Toggle label="Unlock all lessons" hint="Jump to any lesson instead of following the path in order." checked={s.freeNavigation} onChange={(v) => set({ freeNavigation: v })} />
        <Toggle label="Retry mistakes" hint="Questions you miss come back at the end of the lesson." checked={s.retryMistakes} onChange={(v) => set({ retryMistakes: v })} />
        <Toggle label="Shuffle answer options" checked={s.shuffleOptions} onChange={(v) => set({ shuffleOptions: v })} />
      </Group>

      <Group title="Your data" icon="download">
        <p className="muted small group-note">Everything is stored on this device. Export a backup to move your progress between your PC and phone.</p>
        <div className="data-actions">
          <button type="button" className="btn btn-soft" onClick={doExport}>
            <Icon name="download" size={18} /> Export progress
          </button>
          <button type="button" className="btn btn-soft" onClick={() => fileInput.current?.click()}>
            <Icon name="upload" size={18} /> Import progress
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = '';
            }}
          />
          <button type="button" className="btn btn-danger-soft" onClick={() => void reset()}>
            <Icon name="trash" size={18} /> Reset progress
          </button>
        </div>
        <button type="button" className="btn btn-ghost subtle" onClick={() => set({ ...defaultSettings, name: s.name, onboarded: true })}>
          Restore default settings
        </button>
      </Group>

      <Group title="About" icon="info">
        <p className="muted small group-note">
          <b>C++ Forge</b> v{__APP_VERSION__} — deep, interactive lessons for C++ and Unreal Engine C++. Works fully offline. Every runnable C++ example in this app is
          compiled and tested with GCC before release.
        </p>
        <p className="muted small group-note">
          Unreal Engine is a trademark of Epic Games, Inc. This app is an independent learning resource and is not affiliated with or endorsed by Epic Games.
        </p>
      </Group>
    </div>
  );
}

function Group({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section className="card settings-group">
      <h2 className="card-title">
        <Icon name={icon} size={18} /> {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="setting-row">
      <div className="setting-text">
        <div className="setting-label">{label}</div>
        {hint && <div className="setting-hint">{hint}</div>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="setting-row toggle-row">
      <div className="setting-text">
        <div className="setting-label">{label}</div>
        {hint && <div className="setting-hint">{hint}</div>}
      </div>
      <span className={`switch${checked ? ' on' : ''}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch-knob" />
      </span>
    </label>
  );
}

function Stepper({ value, min, max, step, format, onChange }: { value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.round(Math.min(max, Math.max(min, v)) * 100) / 100;
  return (
    <div className="stepper">
      <button type="button" className="icon-btn sm bordered" onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label="Decrease">
        <Icon name="minus" size={16} />
      </button>
      <span className="stepper-value">{format(value)}</span>
      <button type="button" className="icon-btn sm bordered" onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label="Increase">
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
