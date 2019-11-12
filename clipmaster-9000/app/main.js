const { globalShortcut, Menu } = require('electron');
const { menubar } = require('menubar');
const path = require('path');

const mb = menubar({
    preloadWindow: true,
    index: path.resolve('app/index.html'),
    browserWindow: {
        webPreferences: {
            nodeIntegration: true
        }
    }
});

const secondaryMenu = Menu.buildFromTemplate([
    {
        label: 'Quit',
        click() { mb.app.quit(); },
        accelerator: 'CommandOrControl+Q'
    },
]);

mb.on('ready', function () {
    console.log('Application is ready.');

    mb.tray.on('right-click', () => {
        mb.tray.popUpContextMenu(secondaryMenu);
    });

    const createClipping = globalShortcut.register('CommandOrControl+Alt+c', () => {
        mb.window.webContents.send('create-new-clipping');
    });
    const writeClipping = globalShortcut.register('CmdOrCtrl+Alt+w', () => {
        mb.window.webContents.send('write-to-clipboard');
    });
    const publishClipping = globalShortcut.register('CmdOrCtrl+Alt+p', () => {
        mb.window.webContents.send('publish-clipping');
    });
    if (!createClipping) {
        console.error('Registration failed', 'createClipping');
    }
    if (!writeClipping) {
        console.error('Registration failed', 'writeClipping');
    }
    if (!publishClipping) {
        console.error('Registration failed', 'publishClipping');
    }
});

mb.on('after-create-window', () => {
    mb.window.loadURL(path.resolve('app/index.html'));
});