const { app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');
const chokidar = require('chokidar');
const path = require('path');

const openFiles = new Map();
const windows = new Set();

const openFile = exports.openFile = (targetWindow, file) => {
    const content = fs.readFileSync(file).toString();
    startWatchingFile(targetWindow, file);
    app.addRecentDocument(file);
    targetWindow.setRepresentedFilename(file);
    targetWindow.webContents.send('file-opened', file, content);
};

const getFileFromUser =  exports.getFileFromUser = (targetWindow) => {
    dialog.showOpenDialog(targetWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'Markdown Files', extensions: ['md', 'markdown'] }
        ]
    }).then(files => {
        if (files.filePaths.length != 0) { 
            openFile(targetWindow, files.filePaths[0]); 
        }
    }).catch(function(error) {
        console.error(error);
    });
};

const saveHtml = exports.saveHtml = (targetWindow, content) => {
    dialog.showSaveDialog(targetWindow, {
        title: 'Save HTML',
        defaultPath: app.getPath('documents'),
        filters: [
            { name: 'HTML Files', extensions: ['html', 'htm'] }
        ]
    }).then(file => {
        if (file.filePath == '') return;
        fs.writeFileSync(file.filePath, content);
    }).catch(function(error) {
        console.error(error);
    });
};

const saveMarkdown = exports.saveMarkdown = (targetWindow, file, content) => {
    if (! file) {
        dialog.showSaveDialog(targetWindow, {
            title: 'Save Markdown',
            defaultPath: app.getPath('documents'),
            filters: [
                { name: 'Markdown Files', extensions: ['md', 'markdown'] }
            ]
        }).then(fileObj => {
            if (fileObj.filePath == '') return;
            fs.writeFileSync(fileObj.filePath, content);
        }).catch(function(error) {
            console.error(error);
        });
    } else {
        fs.writeFileSync(file, content);
        openFile(targetWindow, file);
    }
}

const startWatchingFile = (targetWindow, file) => {
    stopWatchingFile(targetWindow);
    const watcher = chokidar.watch(file).on('change', (path, stats) => {
        const content = fs.readFileSync(file).toString();
        targetWindow.webContents.send('file-changed', file, content);
    });
    openFiles.set(targetWindow, watcher);
};
    
const stopWatchingFile = (targetWindow) => {
    if (openFiles.has(targetWindow)) {
        openFiles.get(targetWindow).close().then(() => openFiles.delete(targetWindow));;
    }
};

// patching methods only available under macOS
if (process.platform !== 'darwin') {
    BrowserWindow.prototype.setDocumentEdited = function(isEdited) {
        this.firesaleEdit = isEdited;
    };
    BrowserWindow.prototype.isDocumentEdited = function(){ 
        return this.firesaleEdit == undefined ? false : this.firesaleEdit
    };
}


const createWindow = exports.createWindow = () => {
    let x, y;
    const currentWindow = BrowserWindow.getFocusedWindow();
    if (currentWindow) {
        const [ currentWindowX, currentWindowY ] = currentWindow.getPosition();
        x = currentWindowX + 10;
        y = currentWindowY + 10;
    }

    let newWindow = new BrowserWindow({
        x, 
        y,
        show: false,
        webPreferences: {
            nodeIntegration: true
        }
    });

    newWindow.loadFile(path.resolve('app/index.html'));
    //`file://${__dirname}/index.html`
    newWindow.once('ready-to-show', () => {
        newWindow.firesaleEdit = false;
        newWindow.show();
        newWindow.webContents.openDevTools();
    });
    
    newWindow.on('close', (event) => {
        if (newWindow.isDocumentEdited()) {
            event.preventDefault();
            dialog.showMessageBox(newWindow, {
                type: 'warning',
                title: 'Quit with Unsaved Changes?',
                message: 'Your changes will be lost if you do not save.',
                buttons: [
                    'Quit Anyway',
                    'Cancel',
                ],
                defaultId: 0,
                cancelId: 1
            }).then(result => {
                if (result.response === 0) newWindow.destroy()
            }).catch(function(error) {
                console.error(error);
            });
        }
    });

    newWindow.on('closed', () => {
        windows.delete(newWindow);
        stopWatchingFile(newWindow);
        newWindow = null;
    });
    
    windows.add(newWindow);
    return newWindow;
};

app.on('ready', () => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform === 'darwin') {
        return false;
    }
    app.quit();
});

app.on('activate', (event, hasVisibleWindows) => {
    if (!hasVisibleWindows) { createWindow(); }
});

app.on('will-finish-launching', () => {
    app.on('open-file', (event, file) => {
        const win = createWindow();
        win.once('ready-to-show', () => {
            openFile(win, file);
        });
    });
})