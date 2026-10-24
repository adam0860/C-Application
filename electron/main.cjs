// Electron entry point for the Windows desktop build of C++ Forge.
const { app, BrowserWindow, ipcMain, nativeTheme, protocol, net, shell, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// Serve the built web app from a custom, privileged scheme (app://cppforge/…)
// instead of file://. This gives the page a stable origin (so localStorage
// progress persists), lets the Content-Security-Policy use 'self', and keeps
// fetch/ES modules working exactly as they do on the web.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const DIST = path.join(__dirname, '..', 'dist');
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 560,
    backgroundColor: '#0b0e17',
    title: 'C++ Forge',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0b0e17', symbolColor: '#e8ebf5', height: 36 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => win.show());

  // Every external link opens in the user's default browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://')) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });

  win.loadURL('app://cppforge/index.html');
}

// Only one window: launching again focuses the existing one.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    protocol.handle('app', (request) => {
      const { pathname } = new URL(request.url);
      const file = path.normalize(path.join(DIST, decodeURIComponent(pathname)));
      if (!file.startsWith(DIST)) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).toString());
    });

    ipcMain.on('open-external', (_e, url) => {
      if (typeof url === 'string' && /^https?:\/\//.test(url)) shell.openExternal(url);
    });
    ipcMain.on('title-bar-theme', (_e, theme) => {
      if (!win || !theme) return;
      nativeTheme.themeSource = theme.dark ? 'dark' : 'light';
      try {
        win.setTitleBarOverlay({ color: theme.color, symbolColor: theme.symbol, height: 36 });
      } catch {
        // Title bar overlay is unsupported on this platform.
      }
      win.setBackgroundColor(theme.color);
    });

    Menu.setApplicationMenu(null);
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
