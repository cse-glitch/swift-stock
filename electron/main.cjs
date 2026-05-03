const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: "SAMAN Inventory Management"
  });

  // In production, load the index.html from the dist folder
  // In development, load from the local dev server
  const startUrl = isDev 
    ? 'http://localhost:8080' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  win.loadURL(startUrl);

  if (isDev) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
