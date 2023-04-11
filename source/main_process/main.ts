import { app, BrowserWindow, ipcMain, BrowserWindowConstructorOptions, Menu, MenuItem } from 'electron';
import { handleDirSelect, handleFileOpen, handleImageSelect } from './dialog';
import { handleWindowClose, handleWindowIsFullScreen, handleWindowIsMaximized, handleWindowIsMinimized, handleWindowMaximize, handleWindowMinimize, handleWindowRestore, handleWindowSetFullScreen } from './window';
import { handleReadFile, handleGetDirName, handleMkdirp, handleMoveFile, handleStatFile, handleWriteFile, handleReadDir } from './file';
import { handleShellOpenPath, handleShellShowItemInFolder, handleShellTrashItem, handleShellOpenExternal } from './shell';
import { handleExecFile, handleForkProcess, handleProcessExit, handleSpawnDetatchedNodeProcess } from './process';

import path from 'path';
import fs from 'fs';
import VersionManager, { CSIDEVersions, UpdateChannel } from './version-manager';
import mediaServer from './media-server';
import { sync as getUserName } from 'username';

const versionManager = new VersionManager();
let mainWindow: BrowserWindow;
type windowOpenHandlerReturn = { action: 'deny' } | { action: 'allow', overrideBrowserWindowOptions?: BrowserWindowConstructorOptions };

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
            webviewTag: true,
            sandbox: true
        }
    });
    mainWindow.loadFile('index.html');
    if (process.env.CSIDE_DEV) {
        mainWindow.webContents.openDevTools();
    }
    mainWindow.setMenu(null); // No CMD + W closure etc.
    const menu = new Menu();
    menu.append(new MenuItem({
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => { console.log('Cmd + Q is pressed'); }
    }));
    menu.append(new MenuItem({
        label: 'WQuit',
        accelerator: 'CmdOrCtrl+W',
        click: () => { console.log('Cmd + W is pressed'); }
    }));
    Menu.setApplicationMenu(null);
    mainWindow.setMenu(menu); // No CMD + W closure etc.
    mainWindow.webContents.on('will-navigate', (event: Electron.Event) => {
        event.preventDefault();
    });
    mainWindow.webContents.setWindowOpenHandler((details: Electron.HandlerDetails): windowOpenHandlerReturn => {
        if (details.url.match(/^https?:/)) {
            handleShellOpenExternal({} as Electron.IpcMainInvokeEvent, details.url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
    mainWindow.on('close', (evt: Event) => {
        evt.preventDefault();
    });
    registerHandler('dialog:openFile', handleFileOpen.bind(null, mainWindow));
    registerHandler('dialog:selectDir', handleDirSelect.bind(null, mainWindow));
    registerHandler('dialog:selectImage', handleImageSelect.bind(null, mainWindow));
    registerHandler('window:close', handleWindowClose.bind(null, mainWindow));
    registerHandler('window:restore', handleWindowRestore.bind(null, mainWindow));
    registerHandler('window:setFullScreen', handleWindowSetFullScreen.bind(null, mainWindow));
    registerHandler('window:minimize', handleWindowMinimize.bind(null, mainWindow));
    registerHandler('window:maximize', handleWindowMaximize.bind(null, mainWindow));
    registerHandler('window:isMinimized', handleWindowIsMinimized.bind(null, mainWindow));
    registerHandler('window:isMaximized', handleWindowIsMaximized.bind(null, mainWindow));
    registerHandler('window:isFullScreen', handleWindowIsFullScreen.bind(null, mainWindow));
    registerHandler('file:read', handleReadFile);
    registerHandler('file:write', handleWriteFile);
    registerHandler('file:stat', handleStatFile);
    registerHandler('file:move', handleMoveFile);
    registerHandler('file:mkdirp', handleMkdirp);
    registerHandler('file:getDirName', handleGetDirName);
    registerHandler('file:readDir', handleReadDir);
    registerHandler('app:getPath', handleGetAppPath);
    registerHandler('app:exit', handleAppExit);
    registerHandler('process:fork', handleForkProcess);
    registerHandler('process:spawn', handleSpawnDetatchedNodeProcess);
    registerHandler('process:execFile', handleExecFile);
    registerHandler('process:exit', handleProcessExit);
    registerHandler('updates:check', handleCheckForUpdates);
    registerHandler('updates:update', handleUpdate);
    registerHandler('mediaServer:setDir', handleMediaServerSetDir);
    registerHandler('mediaServer:getAddr', handleMediaServerGetAddr);
    registerHandler('getUserDetails', handleGetUserDetails);
    registerHandler('getPlatform', handleGetPlatform);
    registerHandler('getVersions', handleGetVersions);
    registerHandler('shell:showItemInFolder', handleShellShowItemInFolder);
    registerHandler('shell:openExternal', handleShellOpenExternal);
    registerHandler('shell:openPath', handleShellOpenPath);
    registerHandler('shell:trashItem', handleShellTrashItem);
});

app.on('window-all-closed', () => {
    app.quit();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const encodeError = (err: any) => {
    return {
        message: err.message,
        code: err.code,
    };
};

// Error objects can't be serialized properly, see:
// https://github.com/electron/electron/issues/24427
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registerHandler = (channel: string, handler: (...args: (any)[]) => unknown) => {
    ipcMain.handle(channel, async (...args) => {
        try {
            return { result: await Promise.resolve(handler(...args)) };
        } catch (err) {
            return { error: encodeError(err) };
        }
    });
};

const handleAppExit = () => {
    mainWindow.close();
    process.exit();
};

async function handleCheckForUpdates(_: Electron.IpcMainInvokeEvent, versions: CSIDEVersions, updateChannel: UpdateChannel) {
    return await versionManager.checkForUpdates(versions, updateChannel);
}

async function handleUpdate(_: Electron.IpcMainInvokeEvent, updateChannel: UpdateChannel) {
    /*const handlers = {
        error: (title: string, desc: string) => {
            mainWindow.webContents.send('process-update-error', { title, desc });
        },
        progress: (progressPercent: string) => {
            mainWindow.webContents.send('process-update-progress', progressPercent);
        }
    }*/
    return await versionManager.downloadUpdate(updateChannel); //, handlers);
}

async function handleMediaServerSetDir(_: Electron.IpcMainInvokeEvent, dir: string) {
    return mediaServer.setDir(dir);
}

async function handleMediaServerGetAddr(_: Electron.IpcMainInvokeEvent) {
    return mediaServer.getAddr();
}

async function handleGetAppPath(event: Electron.IpcMainInvokeEvent, name: 'app' | 'userData' | 'cwd') {
    if (name === 'app') {
        return app.getAppPath();
    } else if (name ==='cwd') {
        return process.cwd();
    } else {
        return app.getPath(name);
    }
}

async function handleGetUserDetails(_: Electron.IpcMainInvokeEvent) {
    return {
        name: getUserName(),
        path: app.getPath('home')
    };
}

async function handleGetVersions(_: Electron.IpcMainInvokeEvent) {
    return {
        cside: app.getVersion(),
        electron: process.versions.electron
    };
}

async function handleGetPlatform(_: Electron.IpcMainInvokeEvent) {
    return process.platform === 'darwin' ? 'mac_os' : process.platform;
}

process.on('uncaughtException', (err) => {
    mainWindow.webContents.send('notification', '<h3>Uncaught Exception <span aria-hidden=\'true\'>=(</span></h3><p>' + err.message + '\
    </p><p>Something went (unexpectedly!) wrong.<br/>Please close \
    and restart the application (then report this!).');
    try {
        fs.appendFileSync(app.getPath('userData') + '/cside-errors.txt', new Date(Date.now()) + ': ' + err.message + '\n' + err.stack + '\n');
        console.log(err);
    } catch (err) { /* Failed to write to error log */ }
});

process.on('SIGTERM', (signal: NodeJS.Signals, code: number) => {
    mainWindow.webContents.send('infoReq', 'dirty');
    process.exit(128 + code);
});