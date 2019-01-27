// patch for save file for easy access to save file data and to keep TAS saves from overwriting user saves

import * as reload from '../utils/reload.js';

import {
    SaveSlot,
    StorageListener,
    Storage,
    storage,
    CryptUtils
} from '../utils/defs.js';


function getData(globals) {
    var slots = [];
    for(var slot of ig[storage][Storage.slots]) {
        slots.push(slot.src);
    }
    return {
        lastSlot: ig[storage][Storage.lastSlot],
        slots: slots,
        autoSlot: ig[storage][Storage.autoSlot] ? ig[storage][Storage.autoSlot].src : null,
        globals: ig[CryptUtils][CryptUtils.encrypt](globals)
    };
}

function getGlobals() {
    var globals = {};
    for (var listener of ig[storage][Storage.listeners]) {
        if(listener[StorageListener.update]) listener[StorageListener.update](globals);
    }
    return globals;
}


// disable default writing to disk because we write to the movie file instead
ig[storage][Storage.writeToDisk] = function(){};

// allow writing globals to disk on request
var userSave = getData({});
export function writeGlobalsToDisk() {
    var globals = getGlobals();
    userSave.globals = ig[CryptUtils][CryptUtils.encrypt](globals);
    ig[storage].data.save(JSON.stringify(userSave));
}

function _getSaveFileData(startup) {
    var globals = startup ? ig[storage][Storage.globals] : getGlobals();
    return getData(globals);
}

export function getSaveFileData() {
    return _getSaveFileData(false);
}

export function getStartupSaveFileData() {
    return _getSaveFileData(true);
}

var whiteList = [];
export function whiteListOptions(options) {
    whiteList.push(...options);
}

function _setSaveFileData(data, filter) {
    // save slots
    ig[storage][Storage.lastSlot] = data.lastSlot;
    ig[storage][Storage.slots] = [];
    for(var slotSrc of data.slots) {
        ig[storage][Storage.slots].push(new ig[SaveSlot](slotSrc));
    }
    if(data.autoSlot) {
        ig[storage][Storage.autoSlot] = new ig[SaveSlot](data.autoSlot);
    } else {
        ig[storage][Storage.autoSlot] = null;
    }
    
    // globals
    var globals = ig[CryptUtils][CryptUtils.decrypt](data.globals);
    if(filter) {
        var filtered = {};
        for(var option of whiteList) {
            if(option in globals.options) {
                filtered[option] = globals.options[option];
            } else {
                console.warn("Option '"+option+"' does not exist.");
            }
        }
        // drop achievements, they should not matter...
        globals = {options:filtered}
    }
    globals = ig.merge(ig[storage][Storage.globals], globals);
    for (var listener of ig[storage][Storage.listeners]) {
        if(listener[StorageListener.apply]) listener[StorageListener.apply](globals);
    }
}

export function setSaveFileData(data) {
    _setSaveFileData(data, true);
}

function restoreSaveFileData(data) {
    // disabling the filtering maybe isn't necessary
    // but I like that it makes sure nothing changes
    _setSaveFileData(data, false);
}

// fix Storage.getSlotSrc to be able to properly show errors when there is no auto save
// TODO this should be moved into a mod on its own (ideally ccloader or simplify)
ig[storage][Storage.getSlotSrc] = function(slot, extra) {
    var save;
    if(slot == -1) {
        save = this[Storage.autoSlot];
    } else {
        save = this[Storage.slots][slot];
    }
    if(save) {
        var data = save.getData();
        if(extra) {
            data = ig.merge(ig.copy(data), extra);
        }
        return ig[CryptUtils][CryptUtils.encrypt](data);
    } else {
        return "";
    }
}


//
// recover state from reload
//

reload.serde("save", getSaveFileData, restoreSaveFileData);
