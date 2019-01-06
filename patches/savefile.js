// patch for save file so 

const storage = 'zd';
const saveSlots = 'ng';
const autoSlot = 'lt';
const lastSlot = 'kK';
const globalsObj = 'VFa';
const listeners = 'Op';
const writeToDisk = 'Maa';
const saveGlobals = 'Uta';
const getEncryptedSaveSlot = 'c3a';

const SaveSlot = 'a2';

const CryptUtils = 'hQ';
const decryptJson = 'Dxb';
const encryptJson = 'C0a';

const applyGlobals = 'aKa';
const updateGlobals = 'bKa';

function getData(globals) {
    var slots = [];
    for(var slot of ig[storage][saveSlots]) {
        slots.push(slot.src);
    }
    return {
        lastSlot: ig[storage][lastSlot],
        saveSlots: slots,
        autoSlot: ig[storage][autoSlot] ? ig[storage][autoSlot].src : null,
        globals: ig[CryptUtils][encryptJson](globals)
    };
}

function getGlobals() {
    var globals = {};
    for (var listener of ig[storage][listeners]) {
        if(listener[updateGlobals]) listener[updateGlobals](globals);
    }
    return globals;
}


// disable default writing to disk because we write to the movie file instead
ig[storage][writeToDisk] = function(){};

// allow writing globals to disk on request
var userSave = getData({});
export function writeGlobalsToDisk() {
    var globals = getGlobals();
    userSave.globals = ig[CryptUtils][encryptJson](globals);
    ig[storage].data.save(JSON.stringify(userSave));
}

export function getSaveFileData(filter, internal=false) {
    var globals = internal ? ig[storage][globalsObj] : getGlobals();
    var options = globals.options;
    var tasOptions = {}
    for(var option of filter) {
        if(option in options) {
            tasOptions[option] = options[option];
        } else {
            console.warn("Option '"+option+"' does not exist.");
        }
    }
    // drop achievements, they should not matter...
    return getData({options:tasOptions});
}

export function getStartupSaveFileData(filter) {
    return getSaveFileData(filter, true);
}


export function setSaveFileData(data) {
    // save slots
    ig[storage][lastSlot] = data.lastSlot;
    ig[storage][saveSlots] = [];
    for(var encryptedSaveSlot of data.slots) {
        ig[storage][saveSlots].push(new ig[SaveSlot](encryptedSaveSlot));
    }
    if(data.autoSlot) {
        ig[storage][autoSlot] = new ig[SaveSlot](data.autoSlot);
    } else {
        ig[storage][autoSlot] = null;
    }
    
    // globals
    var globals = ig[CryptUtils][decryptJson](data.globals);
    globals = ig.merge(ig[storage][globalsObj], globals);
    for (var listener of ig[storage][listeners]) {
        if(listener[applyGlobals]) listener[applyGlobals](globals);
    }
}

// fix getEncryptedSaveSlot to be able to properly show errors when there is no auto save
// this should be moved into a mod on its own (ideally ccloader or simplify)
ig[storage][getEncryptedSaveSlot] = function(slot, extra) {
    var save;
    if(slot == -1) {
        save = this[autoSlot];
    } else {
        save = this[saveSlots][slot];
    }
    if(save) {
        var data = save.getData();
        if(extra) {
            data = ig.merge(ig.copy(data), extra);
        }
        return ig[CryptUtils][encryptJson](data);
    } else {
        return "";
    }
}