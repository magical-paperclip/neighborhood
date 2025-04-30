const { app, BrowserWindow, ipcMain } = require("electron");
const serve = require("electron-serve");
const path = require("path");
const fs = require('fs');

const appServe = app.isPackaged ? serve({
  directory: path.join(__dirname, "../out"),
  scheme: 'app'
}) : null;

// Get the path to store our data
const userDataPath = app.getPath('userData');
const tokenPath = path.join(userDataPath, 'token.json');

// Ensure the userData directory exists
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false
    }
  });

  win.webContents.openDevTools();

  if (app.isPackaged) {
    appServe(win).then(() => {
      win.loadURL("app://-");
    });
  } else {
    win.loadURL("http://localhost:3000");
    win.webContents.on("did-fail-load", (e, code, desc) => {
      win.webContents.reloadIgnoringCache();
    });
  }
}

// Handle token storage
ipcMain.on('set-token', (event, token) => {
  try {
    fs.writeFileSync(tokenPath, JSON.stringify({ token }));
  } catch (err) {
    console.error('Error saving token:', err);
  }
});

ipcMain.on('remove-token', () => {
  try {
    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath);
    }
  } catch (err) {
    console.error('Error removing token:', err);
  }
});

ipcMain.on('get-token', (event) => {
  try {
    if (fs.existsSync(tokenPath)) {
      const data = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      event.returnValue = data.token;
    } else {
      event.returnValue = null;
    }
  } catch (err) {
    console.error('Error reading token:', err);
    event.returnValue = null;
  }
});

app.on("ready", () => {
    createWindow();
});

app.on("window-all-closed", () => {
    if(process.platform !== "darwin"){
        app.quit();
    }
});