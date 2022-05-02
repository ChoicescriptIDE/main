import { app } from 'electron';
import axios, { AxiosResponse } from 'axios';
import fs from 'fs';
import { handleSpawnDetatchedNodeProcess } from './process';

export interface CSIDEVersions {
    electron: string,
    cside: string
}

export interface GithubReleaseAsset {
    id: number,
    name: string,
    url: string,
    browser_download_url: string,
    size: number,
    download_count: number,
    created_at: string
}

export interface GithubRelease {
    id: number,
    name: string,
    desc: string,
    tag_name: string,
    url: string,
    html_url: string,
    preRelease: boolean,
    draft: boolean,
    published_at: Date,
    created_at: Date,
    assets: Array<GithubReleaseAsset>
}


export type UpdateChannel = 'stable' | 'latest' | 'development' | 'nightly' | 'none';

export default class VersionManager {

    public async checkForUpdates(versions: CSIDEVersions, channel: UpdateChannel): Promise<GithubRelease> {
        let response: AxiosResponse;
        try {
            response = await axios.get('https://api.github.com/repos/ChoiceScriptIDE/main/releases');
        } catch (err) {
            throw new Error('Failed to fetch release data.');
        }

        if (response.status === 200) {
            let releases = response.data as Array<GithubRelease>;
            releases = releases.filter(r => r.tag_name.includes(channel));
            releases.forEach(r => {
                r.desc = `${r.tag_name} (<a target='_blank' href='${r.html_url}'>details</a>)`;
            });
            releases = releases.sort((a, b) => {
                const aDate = new Date(a.published_at);
                const bDate = new Date(b.published_at);
                if (aDate > bDate) {
                    return 1;
                } else if (bDate > aDate) {
                    return 0;
                } else {
                    return -1;
                }
            });
            return releases[0];
        } else {
            throw new Error('Failed to fetch release data.');
        }
    }

    public async downloadUpdate(updateChannel: UpdateChannel, ) {
        const release = await this.checkForUpdates({} as CSIDEVersions, updateChannel);
        const url = release.assets.find(a => a.name === 'app.asar')?.browser_download_url;
        if (url) {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);
            fs.writeFileSync(`${app.getAppPath().slice(0, -('app.asar'.length))}update.file`, buffer, { 'encoding': 'binary' });
            handleSpawnDetatchedNodeProcess(undefined, 'update.js');
        } else {
            throw new Error('Failed to download update.');
        }
    }
}