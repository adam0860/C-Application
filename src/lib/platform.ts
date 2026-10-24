import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { settingsStore } from './store';

/** Bridge exposed by electron/preload.cjs when running as the Windows desktop app. */
interface DesktopBridge {
  platform: 'electron';
  openExternal: (url: string) => void;
  setTitleBarTheme: (theme: { dark: boolean; color: string; symbol: string }) => void;
}

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

export const isNative = Capacitor.isNativePlatform();
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isDesktopApp = typeof window !== 'undefined' && window.desktop?.platform === 'electron';
export const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export async function openExternal(url: string) {
  if (isDesktopApp) {
    window.desktop!.openExternal(url);
    return;
  }
  if (isNative) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

type HapticKind = 'light' | 'medium' | 'success' | 'error';

export async function haptic(kind: HapticKind) {
  if (!settingsStore.get().haptics) return;
  if (isNative) {
    try {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      if (kind === 'light') await Haptics.impact({ style: ImpactStyle.Light });
      else if (kind === 'medium') await Haptics.impact({ style: ImpactStyle.Medium });
      else await Haptics.notification({ type: kind === 'success' ? NotificationType.Success : NotificationType.Error });
    } catch {
      /* haptics unavailable */
    }
    return;
  }
  if ('vibrate' in navigator && isTouch) {
    const pattern = { light: 8, medium: 15, success: [10, 40, 10], error: [30, 50, 30] }[kind];
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

/** Keep the native status/title bar in sync with the app theme. */
export async function syncSystemBars(dark: boolean, background: string) {
  if (isDesktopApp) {
    window.desktop!.setTitleBarTheme({ dark, color: background, symbol: dark ? '#e8ebf5' : '#141826' });
  }
  if (isNative) {
    try {
      // Dark style = light icons, for use on a dark page (and vice versa).
      await SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
    } catch {
      /* not supported on this platform */
    }
  }
}

/** Android hardware back button. The handler returns true if it consumed the press. */
export async function onBackButton(handler: () => boolean) {
  if (!isNative) return;
  const { App } = await import('@capacitor/app');
  await App.addListener('backButton', () => {
    if (!handler()) void App.exitApp();
  });
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for WebViews without the async clipboard API.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
