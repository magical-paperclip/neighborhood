const { app, BrowserWindow, ipcMain, protocol, net } = require("electron");
const fs = require('fs');
const path = require('path');

// Import disable-keychain module early to set app.commandLine switches 
// before app initialization
require('./disable-keychain');

// Strongest possible keychain disabling measures
app.commandLine.appendSwitch('disable-features', 'Credentials,KeyboardLock,CredentialManagement');
app.commandLine.appendSwitch('use-mock-keychain');
app.commandLine.appendSwitch('disable-cookie-encryption');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('disable-ipc-flooding-protection');

// Disable default session persistence to avoid keychain access
app.setPath('userData', app.getPath('temp'));

// Check for special environment variable
if (process.env.FORCE_NO_KEYCHAIN) {
  console.log('Forcing keychain disabling through environment variable');
}

// Create the browser window.
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: require('path').join(__dirname, 'preload.js'),
      devTools: false,
      disableDialogs: true,
      enableWebSQL: false
    },
    // Set smaller memory footprint
    backgroundColor: '#FFFFFF',
    show: false
  });

  // Show window once it's ready (prevents flickering)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Define a custom protocol that doesn't use the keychain
  protocol.registerFileProtocol('neighborhood', (request, callback) => {
    const url = request.url.substr(14);
    callback(path.normalize(`${__dirname}/${url}`));
  });

  // Load the Neighborhood website
  mainWindow.loadURL("https://neighborhood.hackclub.dev/desktop");

  // Open DevTools only in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  // Disable ALL sensitive features
  mainWindow.webContents.session.clearStorageData();
  mainWindow.webContents.session.clearAuthCache();
  mainWindow.webContents.session.clearCache();
  mainWindow.webContents.session.clearHostResolverCache();
  
  // Block all permission requests
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log(`Permission request blocked: ${permission}`);
    return callback(false);
  });

  // Override any cookie storage attempts
  mainWindow.webContents.session.cookies.on('changed', (event, cookie, cause, removed) => {
    if (!removed && (cookie.secure || cookie.httpOnly)) {
      // Remove any secure cookies that might trigger keychain
      mainWindow.webContents.session.cookies.remove(
        cookie.url, cookie.name, (err) => {
          if (err) console.error(`Failed to remove cookie: ${err}`);
        }
      );
    }
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});