import { useSyncExternalStore } from 'react';
import { settingsStore, useSettings } from './store';

const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

function systemReduced() {
  return mq.matches;
}

export function useReducedMotion(): boolean {
  const s = useSettings();
  const sys = useSyncExternalStore(
    (l) => {
      mq.addEventListener('change', l);
      return () => mq.removeEventListener('change', l);
    },
    systemReduced,
  );
  return s.motion === 'reduced' || (s.motion === 'system' && sys);
}

export function reducedMotionNow(): boolean {
  const m = settingsStore.get().motion;
  return m === 'reduced' || (m === 'system' && mq.matches);
}
