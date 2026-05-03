const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow, clockWindow, tray;

function createMain() {
  mainWindow = new BrowserWindow({
    width: 1000, height: 850,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  mainWindow.loadFile('index.html');
  

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) { 
      e.preventDefault(); 
      mainWindow.hide(); 
    }
  });
}

function createClock() {
  if (clockWindow) return;
  clockWindow = new BrowserWindow({
    width: 200, height: 200, frame: false, transparent: true,
    resizable: false, alwaysOnTop: true, skipTaskbar: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  clockWindow.loadFile('clock.html');
}

app.whenReady().then(() => {
  createMain();
  
  
  try {
    tray = new Tray(path.join(__dirname, 'icon.png')); 
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Buka Aplikasi', click: () => mainWindow.show() },
      { label: 'Keluar Total', click: () => { app.isQuitting = true; app.quit(); } }
    ]);
    tray.setContextMenu(contextMenu);
  } catch (e) { console.log("Ikon tidak ditemukan"); }
});


ipcMain.on('show-main-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.on('get-path', (event) => { event.returnValue = app.getPath('userData'); });
ipcMain.on('start-clock', createClock);
ipcMain.on('stop-clock', () => { if (clockWindow) { clockWindow.close(); clockWindow = null; } });

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });