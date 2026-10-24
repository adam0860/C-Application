import { useSyncExternalStore } from 'react';

/* Global, transient UI state: glossary popover, toasts and confirm dialogs. */

export interface Toast {
  id: number;
  icon?: string;
  title: string;
  body?: string;
  tone?: 'default' | 'success' | 'achievement';
}

export interface ConfirmRequest {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

interface UiState {
  glossaryId: string | null;
  toasts: Toast[];
  confirm: ConfirmRequest | null;
}

let state: UiState = { glossaryId: null, toasts: [], confirm: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<UiState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export function useUi(): UiState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export const openGlossary = (id: string) => set({ glossaryId: id });
export const closeGlossary = () => set({ glossaryId: null });

let toastId = 0;
export function toast(t: Omit<Toast, 'id'>, ms = 3200) {
  const id = ++toastId;
  set({ toasts: [...state.toasts, { ...t, id }] });
  setTimeout(() => set({ toasts: state.toasts.filter((x) => x.id !== id) }), ms);
}

export function confirmDialog(req: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    set({
      confirm: {
        ...req,
        resolve: (ok) => {
          set({ confirm: null });
          resolve(ok);
        },
      },
    });
  });
}

// Screens (like the lesson player) can intercept the Android back button.
const backHandlers: (() => boolean)[] = [];
export function pushBackHandler(handler: () => boolean): () => void {
  backHandlers.push(handler);
  return () => {
    const i = backHandlers.lastIndexOf(handler);
    if (i >= 0) backHandlers.splice(i, 1);
  };
}
export function runBackHandlers(): boolean {
  for (let i = backHandlers.length - 1; i >= 0; i--) if (backHandlers[i]()) return true;
  return false;
}

/** Close the top-most overlay. Returns true if something was closed (used by the Android back button). */
export function closeTopOverlay(): boolean {
  if (state.confirm) {
    state.confirm.resolve(false);
    return true;
  }
  if (state.glossaryId) {
    closeGlossary();
    return true;
  }
  return false;
}
