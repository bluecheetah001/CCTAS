// i dont like how ccloader loads mod assets
// so this is a interface that makes it simplier to mod load assets
// as well as expose a simple interface saving and loading other files

const fs = require('fs');

let thisMod = null;
for(const mod of window.activeMods) {
    if(mod.name === 'TAS') {
        thisMod = mod;
        break;
    }
}
if(thisMod === null) {
    throw new Error('failed to find TAS mod, did the name change?');
}

const thisDir = thisMod.baseDirectory;

export function loadJsonLocal(path) {
    return loadJson(thisDir + path);
}

export function loadJson(path) {
    return load(path).then((data) => {
        try {
            return JSON.parse(data);
        } catch(e) {
            e.message = e.message.replace('JSON', path);
            throw e;
        }
    });
}

export function load(path) {
    return fs.promises.readFile(path, 'utf-8');
}

export function saveJsonLocal(path, data, format = false) {
    return saveJson(thisDir + path, data, format);
}

export function saveJson(path, data, format = false) {
    // TODO move stringify into promise
    return save(path, JSON.stringify(data, null, format ? 4 : 0));
}

export function save(path, data) {
    return fs.promises.writeFile(path, data, 'utf-8');
}
