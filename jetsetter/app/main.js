import { app, BrowserWindow } from 'electron';
import { enableLiveReload } from 'electron-compile';
//import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

const path = require('path');

const isDevMode = process.execPath.match(/[\\/]GitHub/);

if (isDevMode) enableLiveReload({ strategy: 'react-hmr' });


let mainWindow;

app.on('ready', () => {
  console.log('App ready!')
  mainWindow = new BrowserWindow({
    width: 400,
    height: 700,
    minWidth: 400,
    minHeight: 400,
    show: true,
    webPreferences: {
      nodeIntegration: true
    }
  });
  //mainWindow.loadFile(path.resolve('app/index.jade'));
  mainWindow.loadURL(`file://${__dirname}/index.jade`);
  mainWindow.once('ready-to-show', async () => {
    console.log('ready-to-show');
    mainWindow.show();
    mainWindow.webContents.openDevTools();
    /*if (isDevMode) {
      //await installExtension(REACT_DEVELOPER_TOOLS);
      mainWindow.webContents.openDevTools();
    }*/
  });
});