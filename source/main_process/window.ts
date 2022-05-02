import { BrowserWindow } from 'electron';

export async function handleWindowClose(window: BrowserWindow, _: Electron.IpcMainInvokeEvent) {
    window.close();
}

export async function handleWindowRestore(window: BrowserWindow, _: Electron.IpcMainInvokeEvent) {
    window.restore();
}

export async function handleWindowSetFullScreen(window: BrowserWindow, _: Electron.IpcMainInvokeEvent, value: boolean) {
    window.setFullScreen(value);
}

export async function handleWindowMinimize(window: BrowserWindow, _: Electron.IpcMainInvokeEvent) {
    window.minimize();
}

export async function handleWindowMaximize(window: BrowserWindow, _: Electron.IpcMainInvokeEvent) {
    window.maximize();
}

export async function handleWindowIsMinimized(window: BrowserWindow, _: Electron.IpcMainInvokeEvent) {
    return window.isMaximized();
}

export async function handleWindowIsMaximized(window: BrowserWindow, _: Electron.IpcMainInvokeEvent) {
    return window.isMinimized();
}

export async function handleWindowIsFullScreen(window: BrowserWindow, _: Electron.IpcMainInvokeEvent) {
    return window.isFullScreen();
}
