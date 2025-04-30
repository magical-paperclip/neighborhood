// Disable keychain access and use localStorage instead
const { app, ipcMain } = require('electron');

// Disable Electron's built-in encrypted storage
// This forces Electron to use plain localStorage instead of keychain
app.commandLine.appendSwitch('disable-features', 'Credentials');
app.commandLine.appendSwitch('persistent', 'use-mock-keychain');

// Simple localStorage-like implementation for main process
// This could be replaced with a file-based storage if needed
const storage = {};

// Set up handlers for token storage
ipcMain.on('set-token', (event, token) => {
  storage.token = token;
});

ipcMain.on('get-token', (event) => {
  event.returnValue = storage.token || null;
});

ipcMain.on('remove-token', (event) => {
  delete storage.token;
});

// Export for use in main.js
module.exports = {
  storage
}; 