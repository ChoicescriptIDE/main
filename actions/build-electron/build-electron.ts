import * as core from '@actions/core';
import * as builder from 'electron-builder';
import { Arch } from 'electron-builder';
const platform = builder.Platform;

const release = async() => {
    let targets: Map<builder.Platform, Map<Arch, Array<string>>> = new Map();
    switch (process.platform) {
        case 'linux':
            targets = platform.LINUX.createTarget(['zip'], Arch['x64']);
            break;
        case 'darwin':
            targets = platform.MAC.createTarget(['zip'], Arch['x64'], Arch['arm64']);
            break;
        case 'win32':
            targets = platform.WINDOWS.createTarget(['zip'], Arch['ia32'], Arch['x64']);
            break;
    }
    console.log('Building...');
    const paths = await builder.build({
        targets: targets,
        publish: 'never'
    });
    const zipFiles = paths.filter(path => /\.zip$/.exec(path));
    console.log(`Built ${zipFiles.length} asset(s).`);
    core.setOutput('assets', zipFiles.join('\n'));
};

(async () => {
    console.log('Building Electron Desktop Application');
    try {
        await release();
    } catch (err: any) {  // eslint-disable-line @typescript-eslint/no-explicit-any
        core.setFailed(err.message);
    }
})();


