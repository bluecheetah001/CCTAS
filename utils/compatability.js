import * as files from '../utils/files.js';

export const optionsWhiteList = [];

export let modInfos = null;

export async function load() {
    const compatability = await files.loadJsonLocal('assets/compatability.json');
    modInfos = {
        crosscode: {version: versions.crosscode, enabled: true},
        ccloader: {version: versions.ccloader, enabled: true},
    };
    for(const mod of activeMods) {
        // aparently ccloader does not require mods to specify a version
        // so normalize undefined with "" to make validating easier
        modInfos[mod.name] = {version: mod.version || '', enabled: true};
    }
    for(const mod of inactiveMods) {
        modInfos[mod.name] = {version: mod.version || ''};
    }
    for(const modName in compatability) {
        const modCompat = compatability[modName];
        let modInfo = modInfos[modName];
        if(!modInfo) {
            modInfo = {};
            compatability.modInfos[modName] = modInfo;
        }
        modInfo.known = true;
        if(modInfo.enabled && modCompat.options) {
            optionsWhiteList.push(...modCompat.options);
        }
        if(modCompat.ignore) {
            modInfo.ignore = true;
        }
    }
}
