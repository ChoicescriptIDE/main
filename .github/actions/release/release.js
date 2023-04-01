"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var core = require("@actions/core");
var github = require("@actions/github");
var fs_1 = require("fs");
var path_1 = require("path");
var INVALID_CHARS = [' '];
var date = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
var GITHUB_TOKEN = core.getInput('github_token');
var repo = core.getInput('repo') || 'main';
var owner = core.getInput('owner') || 'ChoiceScriptIDE';
var timePeriod = core.getInput('time_period_hours') || '24';
var tag = core.getInput('tag') || "nightly_".concat(date.getFullYear(), ".").concat(date.getMonth() + 1, ".").concat(date.getDate());
var draft = core.getBooleanInput('draft') || true;
var prerelease = core.getBooleanInput('prerelease') || false;
var assets = core.getMultilineInput('assets') || [];
var api = github.getOctokit(GITHUB_TOKEN);
var release = function () { return __awaiter(void 0, void 0, void 0, function () {
    var commits, rel, release_notes, _loop_1, _i, assets_1, a;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, api.rest.repos.listCommits({ owner: owner, repo: repo, since: "".concat(timePeriod, " hours ago") })];
            case 1:
                commits = (_a.sent()).data;
                if (!commits.length) {
                    console.log('No new commits in time period. Abandoning release.');
                    process.exit();
                }
                return [4 /*yield*/, api.rest.repos.listReleases({ owner: owner, repo: repo })];
            case 2:
                rel = (_a.sent()).data.filter(function (rel) { return rel.tag_name === tag; })[0];
                if (!!rel) return [3 /*break*/, 4];
                console.log('Release not found. Creating new release.');
                console.log("Generating release notes from ".concat(commits.length, " commits since ").concat(timePeriod, "hrs ago"));
                release_notes = commits.map(function (c) { return "- ".concat(c.commit.message); });
                return [4 /*yield*/, api.rest.repos.createRelease({ owner: owner, repo: repo, tag_name: tag, body: release_notes.join('\n'), draft: draft, prerelease: prerelease })];
            case 3:
                rel = (_a.sent()).data;
                return [3 /*break*/, 5];
            case 4:
                console.log('Release found. Updating existing release.');
                _a.label = 5;
            case 5:
                if (!assets.length) return [3 /*break*/, 10];
                _loop_1 = function (a) {
                    var ext, name_1, _b, INVALID_CHARS_1, c, prevAsset;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                ext = (0, path_1.extname)(a);
                                name_1 = "".concat((0, path_1.basename)(a, ext), "-").concat(tag).concat(ext);
                                for (_b = 0, INVALID_CHARS_1 = INVALID_CHARS; _b < INVALID_CHARS_1.length; _b++) {
                                    c = INVALID_CHARS_1[_b];
                                    name_1 = name_1.replace(c, '.');
                                }
                                prevAsset = rel.assets.find(function (fa) { return fa.name === name_1; });
                                if (!prevAsset) return [3 /*break*/, 2];
                                console.log("Asset ".concat(name_1, " already exists. Deleting."));
                                return [4 /*yield*/, api.rest.repos.deleteReleaseAsset({ owner: owner, repo: repo, asset_id: prevAsset.id })];
                            case 1:
                                _c.sent();
                                _c.label = 2;
                            case 2:
                                console.log("Uploading asset: ".concat(name_1));
                                return [4 /*yield*/, api.rest.repos.uploadReleaseAsset({ release_id: rel.id, owner: owner, repo: repo, name: name_1, data: (0, fs_1.readFileSync)(a) })];
                            case 3:
                                _c.sent(); // eslint-disable-line @typescript-eslint/no-explicit-any
                                return [2 /*return*/];
                        }
                    });
                };
                _i = 0, assets_1 = assets;
                _a.label = 6;
            case 6:
                if (!(_i < assets_1.length)) return [3 /*break*/, 9];
                a = assets_1[_i];
                return [5 /*yield**/, _loop_1(a)];
            case 7:
                _a.sent();
                _a.label = 8;
            case 8:
                _i++;
                return [3 /*break*/, 6];
            case 9: return [3 /*break*/, 11];
            case 10:
                console.log('No assets found.');
                _a.label = 11;
            case 11: return [2 /*return*/];
        }
    });
}); };
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('Release Workflow');
                console.log("Target: ".concat(owner, "/").concat(repo));
                console.log("Release tag: ".concat(tag));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, release()];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                err_1 = _a.sent();
                core.setFailed(err_1.message);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); })();
