const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    // Add any Electron APIs you want to expose to the renderer process here
  }
);

contextBridge.exposeInMainWorld("electronAPI", {
    on: (channel, callback) => {
        ipcRenderer.on(channel, callback);
    },
    send: (channel, args) => {
        ipcRenderer.send(channel, args);
    },
    // Add storage methods
    getToken: () => {
        return ipcRenderer.sendSync('get-token');
    },
    setToken: (token) => {
        ipcRenderer.send('set-token', token);
    },
    removeToken: () => {
        ipcRenderer.send('remove-token');
    },
    isElectron: true
}); 