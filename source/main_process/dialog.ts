import { BrowserWindow, dialog } from 'electron';

export async function handleFileOpen(window: BrowserWindow, event: Electron.IpcMainInvokeEvent, defaultPath: string) {
    const { canceled, filePaths } = await dialog.showOpenDialog(window,
        {
            filters: [
                { name: 'Scenes', extensions: ['txt', 'log'] }
            ],
            properties: ['openFile', 'multiSelections'], defaultPath: defaultPath
        });
    if (canceled) {
        return undefined;
    } else {
        return filePaths;
    }
}

export async function handleDirSelect(window: BrowserWindow, event: Electron.IpcMainInvokeEvent, defaultPath: string) {
    const { canceled, filePaths } = await dialog.showOpenDialog(window,
        { properties: ['openDirectory'], defaultPath: defaultPath }
    );
    if (canceled) {
        return undefined;
    } else {
        return filePaths;
    }
}

export async function handleImageSelect(window: BrowserWindow, event: Electron.IpcMainInvokeEvent, defaultPath: string) {
    const { canceled, filePaths } = await dialog.showOpenDialog(window,
        {
            filters: [
                { name: 'Supported Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
            ],
            properties: ['openFile'], defaultPath: defaultPath
        });
    if (canceled) {
        return undefined;
    } else {
        return filePaths;
    }
}
