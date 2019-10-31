const {app, BrowserWindow} = require('electron');

let mainWindow = null;

app.on('ready', () => {
    console.log('Hello from Electron!');
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
    });
    mainWindow.webContents.loadURL(`file://${__dirname}/index.html`);
    mainWindow.webContents.openDevTools()
});