// patch for save file for easy access to save file data and to keep TAS saves from overwriting user saves

import * as reload from '../utils/reload.js';
import * as compatability from '../utils/compatability.js';

import {
    SaveSlot,
    StorageListener,
    Storage,
    storage,
    CryptUtils,
} from '../utils/defs.js';

// difficult to recover after the map has finished loading
// so just preemptivly serialize it before it gets overwritten
let lastLoadingData = null;
let lastCheckPoint = null;
const origOnSaveLoaded = ig[storage].qx.bind(ig[storage]);
ig[storage].qx = function onSaveLoaded(...args) {
    // I think loadingData either deep equals checkPoint or is null...
    lastLoadingData = ig[storage].sR;
    lastCheckPoint = ig[storage].TF;
    return origOnSaveLoaded(...args);
};

function getData(startupGlobals, includeSaveState) {
    const globals = startupGlobals ? ig[storage][Storage.globals] : getGlobals();
    const slots = [];
    for(const slot of ig[storage][Storage.slots]) {
        slots.push(slot.src);
    }
    const data = {
        lastSlot: ig[storage][Storage.lastSlot],
        slots: slots,
        autoSlot: ig[storage][Storage.autoSlot] ? ig[storage][Storage.autoSlot].src : null,
        globals: ig[CryptUtils][CryptUtils.encrypt](globals),
    };
    if(includeSaveState) {
        data.loadingData = lastLoadingData;
        data.checkPoint = lastCheckPoint;
    }
    return data;
}

function getGlobals() {
    const globals = {};
    for(const listener of ig[storage][Storage.listeners]) {
        if(listener[StorageListener.update]) listener[StorageListener.update](globals);
    }
    return globals;
}


// disable default writing to disk because we write to the movie file instead
ig[storage][Storage.writeToDisk] = function writeToDisk() {};

// allow writing globals to disk on request
const userSave = getData(true, false);
export function writeGlobalsToDisk() {
    const globals = getGlobals();
    userSave.globals = ig[CryptUtils][CryptUtils.encrypt](globals);
    ig[storage].data.save(JSON.stringify(userSave));
}

export function getSaveFileData() {
    return getData(false, false);
}

export function getStartupSaveFileData() {
    return getData(true, false);
}

function _setSaveFileData(data, filter) {
    // save slots
    ig[storage][Storage.lastSlot] = data.lastSlot;
    ig[storage][Storage.slots] = [];
    for(const slotSrc of data.slots) {
        ig[storage][Storage.slots].push(new ig[SaveSlot](slotSrc));
    }
    if(data.autoSlot) {
        ig[storage][Storage.autoSlot] = new ig[SaveSlot](data.autoSlot);
    } else {
        ig[storage][Storage.autoSlot] = null;
    }

    // globals
    let globals = ig[CryptUtils][CryptUtils.decrypt](data.globals);
    if(filter) {
        const filtered = {};
        for(const option of compatability.optionsWhiteList) {
            if(option in globals.options) {
                filtered[option] = globals.options[option];
            } else {
                console.warn(`Option '${option}' does not exist.`);
            }
        }
        // drop achievements, they should not matter...
        globals = {options: filtered};
    }
    globals = ig.merge(ig[storage][Storage.globals], globals);
    for(const listener of ig[storage][Storage.listeners]) {
        if(listener[StorageListener.apply]) listener[StorageListener.apply](globals);
    }

    // savestate
    if('loadingData' in data) {
        ig[storage].sR = data.loadingData;
        ig[storage].TF = data.checkPoint;
    }
}

export function setSaveFileData(data) {
    _setSaveFileData(data, true);
}

// fix Storage.getSlotSrc to be able to properly show errors when there is no auto save
// TODO this should be moved into a mod on its own (ideally ccloader or simplify)
ig[storage][Storage.getSlotSrc] = function getSlotSrc(slot, extra) {
    let save = null;
    if(slot === -1) {
        save = this[Storage.autoSlot];
    } else {
        save = this[Storage.slots][slot];
    }
    if(save) {
        let data = save.getData();
        if(extra) {
            data = ig.merge(ig.copy(data), extra);
        }
        return ig[CryptUtils][CryptUtils.encrypt](data);
    } else {
        return '';
    }
};


//
// recover state from reload
//
function serialize(hint) {
    const includeCheckpoint = hint !== reload.RESTART;
    return getData(false, includeCheckpoint);
}
function deserialize(data) {
    // disabling the filtering maybe isn't necessary
    // but I like that it makes sure nothing changes
    _setSaveFileData(data, false);
}

reload.serde('save', serialize, deserialize);
