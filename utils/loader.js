// i dont like how ccloader loads mod assets
// so this is a interface that makes it simplier to mod load assets

const fs = require('fs');

var thisMod;
for(const mod of window.activeMods) {
    if(mod.name === 'TAS') {
        thisMod = mod;
        break;
    }
}
if(!thisMod) {
    throw new Error("failed to find TAS mod, did the name change?");
}

const thisDir = thisMod.baseDirectory;

export function loadJsonAsset(path) {
    return loadJsonFile(thisDir + path);
}

export function loadJsonFile(path) {
    return loadFile(path).then((data) => {
        try {
            return JSON.parse(data);
        } catch(e) {
            e.message = e.message.replace('JSON', path);
            throw e;
        }
    });
}

export function loadFile(path) {
    return fs.promises.readFile(path, 'utf-8');
}