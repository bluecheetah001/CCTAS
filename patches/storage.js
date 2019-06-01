// patch for save file for easy access to save file data and to keep TAS saves from overwriting user saves

import * as random from '../patches/random.js';
import * as reload from '../utils/reload.js';
import * as compatability from '../utils/compatability.js';

function safeEncrypt(data) {
    return random.withOriginalRandom(() => {
        return ig.storage._encrypt(data);
    });
}

function getData(startupGlobals, includeSaveState) {
    const globals = startupGlobals ? ig.storage.globalData : getGlobals();
    const slots = [];
    for(const slot of ig.storage.slots) {
        slots.push(slot.src);
    }
    const data = {
        lastUsedSlot: ig.storage.lastUsedSlot,
        slots: slots,
        autoSlot: ig.storage.autoSlot ? ig.storage.autoSlot.src : null,
        globals: safeEncrypt(globals),
    };
    if(includeSaveState) {
        data.currentSave = buildSave();
        data.resetAfterTeleport = ig.storage.resetAfterTeleport;
    }
    return data;
}

function getGlobals() {
    const globals = {};
    for(const listener of ig.storage.listeners) {
        if(listener.onStorageGlobalSave) listener.onStorageGlobalSave(globals);
    }
    return globals;
}

function buildSave() {
    const save = {};
    // TODO
    ig.storage._saveState(save, ig.game.uZ, ig.game.cOa && ig.game.cOa.kpa());
    return save;
}

ig.Storage.inject({
    // disable default writing to disk because we write to the movie file instead
    // but still need to encrypt globals to advance rng like normal
    _saveToStorage() {
        this._encrypt(getGlobals());
    },
});

// allow writing globals to disk on request
const userSave = getData(true, false);
export function writeGlobalsToDisk() {
    const globals = getGlobals();
    userSave.globals = safeEncrypt(globals);
    ig.storage.data.save(JSON.stringify(userSave));
}

export function getSaveFileData() {
    return getData(false, false);
}

export function getStartupSaveFileData() {
    return getData(true, false);
}

function _setSaveFileData(data, filter) {
    // save slots
    ig.storage.lastUsedSlot = data.lastSlot;
    ig.storage.slots = [];
    for(const slotSrc of data.slots) {
        ig.storage.slots.push(new ig.SaveSlot(slotSrc));
    }
    if(data.autoSlot) {
        ig.storage.autoSlot = new ig.SaveSlot(data.autoSlot);
    } else {
        ig.storage.autoSlot = null;
    }

    // globals
    let globals = ig.storage._decrypt(data.globals);
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
    globals = ig.merge(ig.storage.globalData, globals);
    for(const listener of ig.storage.listeners) {
        if(listener.onStorageGlobalLoad) listener.onStorageGlobalLoad(globals);
    }

    // savestate
    if(data.currentSave) {
        // the game suggests useing ig.copy(data.currentSave), but that probably insn't necessary.
        ig.storage.currentLoadFile = data.currentSave;
        ig.storage.checkPointSave = data.currentSave;
        ig.storage.resetAfterTeleport = data.resetAfterTeleport;
    }
}

export function setSaveFileData(data) {
    _setSaveFileData(data, true);
}

//
// recover state from reload
//
function serialize(hint) {
    const includeCheckpoint = hint === reload.LOAD_MAP;
    return getData(false, includeCheckpoint);
}
function deserialize(data) {
    // disabling the filtering maybe isn't necessary
    // but I like that it makes sure nothing changes
    _setSaveFileData(data, false);
}

reload.serde('save', serialize, deserialize);
