const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const isDev = Boolean(process.env.ELECTRON_START_URL);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0A0A0A',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'public', 'pwa-512x512.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Links that try to open a new window (e.g. HIBP references) should go to the
  // system browser instead of spawning another Electron window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // DevTools stays closed by default; F12 / Ctrl+Shift+I opens it on demand.
  win.webContents.on('before-input-event', (_event, input) => {
    const isToggleShortcut = input.key === 'F12' || (input.control && input.shift && input.key.toUpperCase() === 'I');
    if (isToggleShortcut) win.webContents.toggleDevTools();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
