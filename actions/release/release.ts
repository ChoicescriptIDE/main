import * as core from '@actions/core';
import * as github from '@actions/github';
import { readFileSync } from 'fs';
import { basename, extname } from 'path';

const INVALID_CHARS = [' '];

const date = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
const GITHUB_TOKEN = core.getInput('github_token');
const repo = core.getInput('repo') || 'main';
const owner = core.getInput('owner') || 'ChoiceScriptIDE';
const timePeriod = core.getInput('time_period_hours') || '24';
const tag = core.getInput('tag') || `nightly_${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
const draft = core.getBooleanInput('draft') || true;
const prerelease = core.getBooleanInput('prerelease') || false;
const assets = core.getMultilineInput('assets') || [];

const api = github.getOctokit(GITHUB_TOKEN);
const release = async() => {
    const commits = (await api.rest.repos.listCommits({ owner, repo, since: `${timePeriod} hours ago`})).data;

    if (!commits.length) {
        console.log('No new commits in time period. Abandoning release.');
        process.exit();
    }

    let rel = (await api.rest.repos.listReleases({ owner, repo })).data.filter(rel => rel.tag_name === tag)[0];
    if (!rel) {
        console.log('Release not found. Creating new release.');
        console.log(`Generating release notes from ${commits.length} commits since ${timePeriod}hrs ago`);
        const release_notes = commits.map(c => `- ${c.commit.message}`);
        rel = (await api.rest.repos.createRelease({ owner, repo, tag_name: tag, body: release_notes.join('\n'), draft, prerelease })).data;
    } else {
        console.log('Release found. Updating existing release.');
    }

    if (assets.length) {
        for (const a of assets) {
            const ext = extname(a);
            let name = `${basename(a, ext)}-${tag}${ext}`;
            for (const c of INVALID_CHARS) {
                name = name.replace(c, '.');
            }
            const prevAsset = rel.assets.find(fa => fa.name === name);
            if (prevAsset) {
                console.log(`Asset ${name} already exists. Deleting.`);
                await api.rest.repos.deleteReleaseAsset({ owner, repo, asset_id: prevAsset.id });
            }
            console.log(`Uploading asset: ${name}`);
            await api.rest.repos.uploadReleaseAsset({release_id: rel.id, owner, repo, name,
                data: readFileSync(a) as any });  // eslint-disable-line @typescript-eslint/no-explicit-any
        }
    } else {
        console.log('No assets found.');
    }
};

(async () => {
    console.log('Release Workflow');
    console.log(`Target: ${owner}/${repo}`);
    console.log(`Release tag: ${tag}`);
    try {
        await release();
    } catch (err: any) {  // eslint-disable-line @typescript-eslint/no-explicit-any
        core.setFailed(err.message);
    }
})();


