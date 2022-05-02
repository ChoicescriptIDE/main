import { shell } from 'electron';

export async function handleShellShowItemInFolder(event: Electron.IpcMainInvokeEvent, itemPath: string) {
    return shell.showItemInFolder(itemPath);
}

export async function handleShellOpenPath(event: Electron.IpcMainInvokeEvent, path: string) {
    return shell.openPath(path);
}

export function handleShellOpenExternal(event: Electron.IpcMainInvokeEvent, path: string) {
    return shell.openExternal(path, { activate: true });
}

export async function handleShellTrashItem(event: Electron.IpcMainInvokeEvent, itemPath: string) {
    return shell.trashItem(itemPath);
}