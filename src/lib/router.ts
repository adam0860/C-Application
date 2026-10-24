import { useSyncExternalStore } from 'react';

/*
 * Minimal hash router. Hash URLs work identically on the web dev server,
 * Electron's file:// protocol and the Capacitor Android WebView.
 */

export interface Route {
  path: string; // e.g. "/lesson/cpp-hello-world"
  segments: string[];
  query: URLSearchParams;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return {
    path,
    segments: path.split('/').filter(Boolean).map(decodeURIComponent),
    query: new URLSearchParams(qs),
  };
}

let current = parse();
const listeners = new Set<() => void>();
const emit = () => {
  current = parse();
  listeners.forEach((l) => l());
};
window.addEventListener('hashchange', emit);

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

// Number of in-app navigations we can safely undo with history.back().
let depth = 0;

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const hash = '#' + to;
  if (window.location.hash === hash) return;
  if (opts.replace) {
    window.history.replaceState(null, '', hash);
    emit();
  } else {
    depth++;
    window.location.hash = to;
  }
}

/** Go back within the app, or to `fallback` when there is nothing to go back to. */
export function goBack(fallback = '/') {
  if (depth > 0) {
    depth--;
    window.history.back();
  } else {
    navigate(fallback, { replace: true });
  }
}

export function canGoBack() {
  return depth > 0;
}
