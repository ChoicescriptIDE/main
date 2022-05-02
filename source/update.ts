'use strict';
import fs from 'fs';
import child_process from 'child_process';
import { IncomingMessage } from 'http';
import { get as httpsGet } from 'https';

function printProgress(progress: string) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`Downloading update: ${progress}%`);
}

function relaunchApp() {
    console.log('Relaunching application...');
    const cp = child_process.spawn(`${process.execPath}`, ['./app.asar'], {
        detached: true,
        stdio: 'ignore',
        env: {} // Drop ELECTRON_RUN_AS_NODE
    });
    cp.on('error', (err: Error) => {
        console.log(err);
        process.exit();
    });
    cp.on('exit', (code: number, signal: NodeJS.Signals) => {
        console.log(`Application closed with: ${code ?? signal}.`);
        process.exit();
    });
    cp.on('spawn', () => {
        console.log('Application restarted successfully.');
        process.exit();
    });
}

function applyUpdate() {
    return fs.rename('update.file', 'app.asar', (err) => {
        throw err;
    });
}

function downloadUpdate(url = 'https://choicescriptide.github.io/downloads/updates/targets/preview141.zip'): Promise<void> {
    return new Promise((resolve, reject) => {
        let timeOutAllowance = 3;
        let timeout: NodeJS.Timer;
        function handleData(fileSize: number, data: string) {
            clearInterval(timeout);
            timeout = setInterval(() => {
                if (--timeOutAllowance < 1) {
                    request.destroy();
                }
                reject(new Error('The application isn\'t receiving any data. Please check your internet connection.'));
            }, 10000);
            fileStream.write(data);
            const percentComplete = ((100 / (fileSize / fileStream.bytesWritten)).toFixed(2));
            printProgress(percentComplete);
        }

        function end() {
            clearInterval(timeout);
            fileStream.end();
            printProgress('100');
            process.stdout.write('\n');
            resolve();
        }

        const fileStream = fs.createWriteStream('./myupdate');
        const request = httpsGet(url, (response: IncomingMessage) => {
            if (!response || typeof response.statusCode !== 'number' || response.statusCode != 200) {
                console.log('Update download failed due to a server error: ' + response.statusCode?.toString());
            }
            const fileSize = parseInt(response.headers['content-length'] || '0');
            fileStream.on('finish', () => fileStream.close());
            response
                .on('data', handleData.bind(null, fileSize))
                .on('end', end);
        });
    });

}

fs.appendFileSync('log',process.argv.toString());
const [,, ppid, pppid] = process.argv;
const timeout = 5000;
let timeoutAttempts = 3;
const interval = setInterval(() => {
    try {
        process.kill(parseInt(ppid), 'SIGTERM');
        process.kill(parseInt(pppid), 'SIGTERM');
        clearInterval(interval);
        applyUpdate();
        relaunchApp();
    } catch (err) {
        fs.appendFileSync('log',`Waiting for application to close... ${timeout * timeoutAttempts} milliseconds left.`);
        if (timeoutAttempts-- <= 0) {
            fs.appendFileSync('log','Giving up.');
            process.exit(); // give up
        }
    }
}, timeout);

/*
z
const promisedSpawn = promisify(child_process.spawn);
console.log('hello');
process.re

*/






// https://api.github.com/repos/ChoiceScriptIDE/main/releases
