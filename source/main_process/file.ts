import fs from 'fs';
import path from 'path';
import { StatOptions, WriteFileOptions } from 'fs';
import { promisify } from 'util';
import mkdirp from 'mkdirp';

export async function handleWriteFile(event: Electron.IpcMainInvokeEvent, filePath: string, data: string, options: WriteFileOptions) {
    const promisedWriteFile = promisify(fs.writeFile);
    return await promisedWriteFile(filePath, data, options);
}

export async function handleMkdirp(event: Electron.IpcMainInvokeEvent, filePath: string, options: mkdirp.Options) {
    return await mkdirp(filePath, options);
}

export async function handleReadFile(event: Electron.IpcMainInvokeEvent, filePath: string, options: { encoding?: null | undefined; flag?: string | undefined; }) {
    const promisedReadFile = promisify(fs.readFile);
    return await promisedReadFile(filePath, Object.assign(options || {}, { encoding: 'utf8' }));
}

export async function handleStatFile(event: Electron.IpcMainInvokeEvent, filePath: string, options: StatOptions) {
    const promisedStat = promisify(fs.stat);
    return await promisedStat(filePath, options);
}

export async function handleMoveFile(event: Electron.IpcMainInvokeEvent, oldPath: string, newPath: string) {
    const promisedRename = promisify(fs.rename);
    return await promisedRename(oldPath, newPath);
}

export async function handleGetDirName(event: Electron.IpcMainInvokeEvent, dirPath: string) {
    return path.dirname(dirPath);
}

export async function handleReadDir(event: Electron.IpcMainInvokeEvent, dirPath: string, options: { encoding: BufferEncoding | null; withFileTypes?: false | undefined }) {
    const promisedReadDir = promisify(fs.readdir);
    return await promisedReadDir(dirPath, options);
}
