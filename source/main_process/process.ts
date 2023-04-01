import cp, { ExecFileOptionsWithStringEncoding, ForkOptions, SpawnOptions } from 'child_process';
import { app } from 'electron';
import { promisify } from 'util';

export async function handleProcessExit(_: Electron.IpcMainInvokeEvent) {
    process.exit();
}

export async function handleForkProcess(event: Electron.IpcMainInvokeEvent, channel: string, target: string, args: ReadonlyArray<string>, options: ForkOptions) {
    switch (target) {
        case 'compile.js': {
            cp.fork(target, args, options);
            break;
        }
        default: {
            throw new Error(`Unsupported fork operation requested! '${target}' is not a valid target.`);
        }
    }
}

export async function handleSpawnDetatchedNodeProcess(event: Electron.IpcMainInvokeEvent | undefined, target: string, args: ReadonlyArray<string> = [], _?: SpawnOptions) {
    const promisedSpawn = promisify(cp.spawn);
    return promisedSpawn(`${process.execPath}`, [target, process.pid.toString(), process.ppid.toString()], {
        detached: true,
        stdio: 'ignore',
        cwd: app.getAppPath().slice(0, -('app.asar'.length)),
        env: {
            ELECTRON_RUN_AS_NODE: '1'
        }
    });
}

export async function handleExecFile(event: Electron.IpcMainInvokeEvent, target: string, args: ReadonlyArray<string> | undefined, options: ExecFileOptionsWithStringEncoding) {
    const promisedExecFile = promisify(cp.execFile);
    return await promisedExecFile(target, args, options);
}