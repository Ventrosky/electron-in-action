const marked = require('marked');
const sanitizeHtml = require('sanitize-html');

const { remote, ipcRenderer  } = require('electron');
const path = require('path');
const mainProcess = remote.require('./main.js');

const currentWindow = remote.getCurrentWindow();

const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileButton = document.querySelector('#new-file');
const openFileButton = document.querySelector('#open-file');
const saveMarkdownButton = document.querySelector('#save-markdown');
const revertButton = document.querySelector('#revert');
const saveHtmlButton = document.querySelector('#save-html');
const showFileButton = document.querySelector('#show-file');
const openInDefaultButton = document.querySelector('#open-in-default');

let filePath = null;
let originalContent = '';

document.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragleave', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());

const getDraggedFile = (event) => event.dataTransfer.items[0];

const getDroppedFile = (event) => event.dataTransfer.files[0];

const fileTypeIsSupported = (file) => file.type != '' ? ['text/plain', 'text/markdown'].includes(file.type) : /\.(md|markdown|txt)$/i.test(file.name);

const renderMarkdownToHtml = (markdown) => {
    var clean = sanitizeHtml(markdown);
    htmlView.innerHTML = marked(clean);
};

const updateUserInterface = (isEdited) => {
    let title = 'Fire Sale';

    if (filePath) { 
        title = `${path.basename(filePath)} - ${title}`; 
    };
    if (isEdited) { 
        title = `${title} (Edited)`; 
    };

    currentWindow.setTitle(title);
    currentWindow.setDocumentEdited(isEdited);
    saveMarkdownButton.disabled = !isEdited;
    revertButton.disabled = !isEdited;
};

const renderFile = (file, content) => {
    console.log(content)
    filePath = file;
    originalContent = content;
    markdownView.value = content;
    currentWindow.setDocumentEdited(false);
    renderMarkdownToHtml(content);
    updateUserInterface(false);
};

markdownView.addEventListener('keyup', (event) => {
    const currentContent = event.target.value;
    renderMarkdownToHtml(currentContent);
    updateUserInterface(currentContent !== originalContent);
});

markdownView.addEventListener('dragover', (event) => {
    const file = getDraggedFile(event);
    if (fileTypeIsSupported(file)) {
        markdownView.classList.add('drag-over');
    } else {
        markdownView.classList.add('drag-error');
    }
});

markdownView.addEventListener('dragleave', () => {
    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
});

markdownView.addEventListener('drop', (event) => {
    const file = getDroppedFile(event);
    if (fileTypeIsSupported(file)) {
        mainProcess.openFile(currentWindow, file.path);
    } else {
        alert('That file type is not supported');
    }
    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
});

openFileButton.addEventListener('click', () => {
    mainProcess.getFileFromUser(currentWindow);
});

ipcRenderer.on('file-opened', (event, file, content) => {
    if (currentWindow.isDocumentEdited()) {
        remote.dialog.showMessageBox(currentWindow, {
            type: 'warning',
            title: 'Overwrite Current Unsaved Changes?',
            message: 'Opening a new file in this window will overwrite your unsaved changes. Open this file anyway?',
            buttons: [
                'Yes',
                'Cancel',
            ],
            defaultId: 0,
            cancelId: 1
        }).then(result => {
            if (result.response === 1) renderFile(file, content);
        }).catch(function(error) {
            console.error(error);
        });
    } else {
        renderFile(file, content)
    }
});

ipcRenderer.on('file-changed', (event, file, content) => {
    console.log("received changes")
    remote.dialog.showMessageBox(currentWindow, {
        type: 'warning',
        title: 'Overwrite Current Unsaved Changes?',
        message: 'Another application has changed this file. Load changes?',
        buttons: [
            'Yes',
            'Cancel',
        ],
        defaultId: 0,
        cancelId: 1
    }).then(result => {
        if (result.response === 0) renderFile(file, content);
    }).catch(function(error) {
        console.error(error);
    });
});

newFileButton.addEventListener('click', () => {
    mainProcess.createWindow();
});

saveHtmlButton.addEventListener('click', () => {
    mainProcess.saveHtml(currentWindow, `<!DOCTYPE html><html><head></head><body>${htmlView.innerHTML}</body></html>`);
});

saveMarkdownButton.addEventListener('click', () => {
    mainProcess.saveMarkdown(currentWindow, filePath, markdownView.value);
});

revertButton.addEventListener('click', () => {
    currentWindow.setDocumentEdited(false);
    markdownView.value = originalContent;
    renderMarkdownToHtml(originalContent);
});