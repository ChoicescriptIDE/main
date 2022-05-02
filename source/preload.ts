import { ExecFileOptionsWithStringEncoding, ForkOptions, SpawnOptions } from 'child_process';
import { contextBridge, ipcRenderer } from 'electron';
import { WriteFileOptions } from 'fs';
import { CSIDEVersions } from 'main_process/version-manager';

contextBridge.exposeInMainWorld('electronAPI', {
    openFile: (defaultPath: string) => ipcRenderer.invoke('dialog:openFile', defaultPath),
    selectDir: (defaultPath: string) => ipcRenderer.invoke('dialog:selectDir', defaultPath),
    selectImage: (defaultPath: string) => ipcRenderer.invoke('dialog:selectImage', defaultPath),
    writeFile: (path: string, data: string, options: WriteFileOptions) => ipcRenderer.invoke('file:write', path, data, options),
    readFile: (path: string, options: { encoding?: null | undefined; flag?: string | undefined; }) => ipcRenderer.invoke('file:read', path, options),
    statFile: (path: string) => ipcRenderer.invoke('file:stat', path),
    moveFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('file:move', oldPath, newPath),
    mkdirp: (path: string) => ipcRenderer.invoke('file:mkdirp', path),
    getDirName: (path: string) => ipcRenderer.invoke('file:getDirName', path),
    readDir: (path: string, options: { encoding: BufferEncoding | null; withFileTypes?: false | undefined } ) => ipcRenderer.invoke('file:readDir', path, options),
    app: {
        getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
        exit: () => ipcRenderer.invoke('app:exit')
    },
    mediaServer: {
        setDir: (path: string) => ipcRenderer.invoke('mediaServer:setDir', path),
        getAddr: () => ipcRenderer.invoke('mediaServer:getAddr'),
    },
    getAppPath: () => ipcRenderer.invoke('app:getPath', 'app'),
    getPlatform: () => ipcRenderer.invoke('getPlatform'),
    getUserDetails: () => ipcRenderer.invoke('getUserDetails'),
    getVersions: () => ipcRenderer.invoke('getVersions'),
    handleNotification: (callback: () => unknown) => ipcRenderer.on('notification', callback),
    hanldeInformationRequest: (callback: () => unknown) => ipcRenderer.on('infoReq', callback),
    window: {
        close: () => ipcRenderer.invoke('window:close'),
        restore: () => ipcRenderer.invoke('window:restore'),
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        setFullScreen: (value: boolean) => ipcRenderer.invoke('window:setFullScreen', value),
        isMinimized: () => ipcRenderer.invoke('window:isMinimized'),
        isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
        isFullScreen: () => ipcRenderer.invoke('window:isFullScreen')
    },
    updates: {
        check: (versions: CSIDEVersions, updateChannel: string) => ipcRenderer.invoke('updates:check', versions, updateChannel),
        restore: () => ipcRenderer.invoke('updates:restore'),
        download: (updateChannel: string) => ipcRenderer.invoke('updates:update', updateChannel)
    },
    process: {
        registerChannel: (channel: string, callback: () => unknown) => ipcRenderer.on(`process-${channel}`, callback),
        unregisterChannel: (channel: string, callback: () => unknown) => ipcRenderer.off(`process-${channel}`, callback),
        fork: (channel: string, target: string, args: string[], options: ForkOptions) => ipcRenderer.invoke('process:fork', channel, target, args, options),
        spawn: (target: string, args: string[], options: SpawnOptions) => ipcRenderer.invoke('process:spawn', target, args, options),
        execFile: (target: string, args: string[], options: ExecFileOptionsWithStringEncoding) => ipcRenderer.invoke('process:execFile', target, args, options),
        exit: () => ipcRenderer.invoke('process:exit')
    },
    shell: {
        show: (path: string) => ipcRenderer.invoke('shell:showItemInFolder', path),
        openItem: (path: string) => ipcRenderer.invoke('shell:openPath', path),
        openExternal: (path: string) => ipcRenderer.invoke('shell:openExternal', path),
        trash: (path: string) => ipcRenderer.invoke('shell:trashItem', path),
    }
});