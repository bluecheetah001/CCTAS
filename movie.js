import * as keys from './utils/keys.js';
import * as config from './utils/config.js';
import * as compatability from './utils/compatability.js';
import * as reload from './utils/reload.js';
import * as files from './utils/files.js';

import * as inputs from './patches/inputs.js';
import * as time from './patches/time.js';
import * as random from './patches/random.js';
import * as savefile from './patches/savefile.js';
import * as mainloop from './patches/mainloop.js';

export async function loadFile(fileName) {
    const movie = await files.loadJson(fileName);

    // check compatability
    // TODO should some of this also happend during deserialize?
    // TODO make warn into prompts
    // TODO add compatability option for looser version checks (specifically for TAS, which may just get handled specally)
    for(const modName in compatability.modInfos) {
        const modInfo = compatability.modInfos[modName];
        if(modInfo.ignore) continue;
        if(!modInfo.known) {
            console.warn(`Unknown mod ${modName} add an entry to assets/compatability.json to specify its compatability`);
        }
        const expected = movie.versions[modName];
        const correctEnabled = (expected !== undefined) === (modInfo.enabled || false);
        const correctVersion = expected === modInfo.version;
        if(!correctVersion) {
            console.warn(`TAS is expecting ${modName} version ${expected} but version ${modInfo.version} is installed`);
        }
        if(!correctEnabled) {
            console.warn(`TAS is expecting ${modName} to be ${modInfo.enabled ? 'disabled' : 'enabled'}`);
        }
    }
    for(const modName in movie.veresions) {
        const modInfo = compatability.modInfos[modName];
        const expected = movie.versions[modName];
        if(modInfo === undefined) {
            console.warn(`TAS is expecting unknown mod ${modName} version ${expected}, get an updated assets/compatability.json`);
        }
    }

    // apply movie state
    random.setState(movie.rng);
    savefile.setSaveFileData(movie.save);
    expectedVersions = movie.versions;
    initialRng = movie.rng;
    initialSave = movie.save;
    setInputs(movie.inputs);
}

export async function saveFile(fileName) {
    if(config.mode === config.SETUP) {
        recordSetup();
    }
    await files.saveJson(fileName, {
        versions: expectedVersions,
        rng: initialRng,
        save: initialSave,
        inputs: getInputs(),
    });
}


let expectedVersions = {};
let initialRng = null;
let initialSave = null;

function recordSetup() {
    expectedVersions = getVersions();
    initialRng = random.getState();
    initialSave = savefile.getSaveFileData();
}
function getVersions() {
    const versions = {};
    for(const modName in compatability.modInfos) {
        const modInfo = compatability.modInfos[modName];
        if(modInfo.enabled) {
            versions[modName] = modInfo.version;
        }
    }
    return versions;
}

// array of frames, where a frame is an object with {keyName: value}
// TODO or should a frame be a Map from Key to value?
let recordedInputs = [];

function setInputs(inputs_) {
    // this could be `ig.copy(inputs_)` for safety
    recordedInputs = inputs_;
}

export function getInputs() {
    // this could be wrapped in a get-only Proxy for safety
    return recordedInputs;
}

function recordPrevInputs() {
    // pad and trim to prevFrame
    const prevFrame = time.frames() - 1;
    while(recordedInputs.length < prevFrame) {
        recordedInputs.push({});
    }
    recordedInputs.length = prevFrame;

    // record frame
    const frame = {};
    for(const [key, value] of inputs.game.prevEntries()) {
        if(value !== 0) {
            frame[key.name] = value;
        }
    }
    recordedInputs.push(frame);
}

function applyInputs() {
    const frame = recordedInputs[time.frames()];

    inputs.game.releaseAll();
    if(frame !== undefined) {
        for(const key in frame) {
            inputs.game.set(keys.getKey(key), frame[key]);
        }
    }
}

mainloop.postFrame.add(() => {
    if(config.mode === config.PLAY) {
        applyInputs();
    }
    if(config.mode === config.RECORD) {
        recordPrevInputs();
    }
});

function serialize() {
    // we wont hit postFrame if we are restarting
    // so record inputs before serializing
    if(config.mode === config.RECORD) {
        recordPrevInputs();
    }
    return {
        versions: expectedVersions,
        rng: initialRng,
        save: initialSave,
        inputs: getInputs(),
    };
}
function deserialize(data) {
    expectedVersions = data.versions;
    initialRng = data.rng;
    initialSave = data.save;
    setInputs(data.inputs);
}
reload.serde('movie', serialize, deserialize);
