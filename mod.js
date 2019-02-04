// root of TAS mod to get everything setup
if(!cc) throw new Error("No ModLoader Found!");

import {loadJsonAsset, loadJsonFile} from './utils/loader.js';
import * as keys from './utils/keys.js';
import * as reload from './utils/reload.js';

import * as time from './patches/time.js';
import * as inputs from './patches/inputs.js';
import * as mainloop from './patches/mainloop.js';
import * as random from './patches/random.js';
import * as savefile from './patches/savefile.js'
// import './patches/cursor.js'; // (patch Kva and draw cursor ingame)

// util for showing an error from a Promise
function showError(e) {
    try {
        ig.system.error(e);
    } catch(e2) {
        // ig.system.error throws the given error, but this does not want to throw
        if(e !== e2) {
            // shouldn't happen, just being safe
            throw e2;
        }
    }
}

class ActionVals {
    constructor() {
        this._prev = 0;
        this._val = 0;
    }
    
    set prev(value) {
        if(Math.abs(value) > Math.abs(this._prev)) {
            this._prev = value;
        }
    }
    
    set value(value) {
        if(Math.abs(value) > Math.abs(this._val)) {
            this._val = value;
        }
    }
    
    get prev() {
        return this._prev;
    }
    
    get value() {
        return this._val;
    }
    
    get isPrevUp() {
        return Math.abs(this._prev) < keys.THRESHOLD;
    }
    
    get isPrevDown() {
        return !this.isPrevUp;
    }
    
    get isUp() {
        return Math.abs(this._val) < keys.THRESHOLD;
    }
    
    get isDown() {
        return !this.isUp;
    }
    
    get isPressed() {
        return this.isDown && this.isPrevUp;
    }
    
    get isReleased() {
        return this.isUp && this.isPrevDown;
    }
}
// a bi directional map from key to action
class KeyMap {
    constructor(remapKeys) {
        this._keyToAction = new Map(); // map from Key to action
        this._actionToKeys = new Map(); // map from action to Set of Keys
        this.remapKeys = remapKeys;
    }
    
    getActions() {
        var actions = new Map();
        for(const [key, value] of inputs.user.entries()) {
            if(key.canDerive) {
                var posAction = this.getKeyAction(key.withSign(1));
                var negAction = this.getKeyAction(key.withSign(-1));
                if(posAction || negAction) {
                    this._getAction(key.withSign(1), posAction, actions);
                    this._getAction(key.withSign(-1), negAction, actions);
                    continue;
                }
            }
            var action = this.getKeyAction(key);
            this._getAction(key, action, actions);
        }
        return actions;
    }
    _getAction(key, action, actions) {
        if(action) {
            var vals = actions.get(action);
            if(!vals) {
                vals = new ActionVals();
                actions.set(action, vals);
            }
            vals.value = inputs.user.get(key);
            vals.prev = inputs.user.getPrev(key);
        }
    }
    
    removeKey(key) {
        var oldAction = this._keyToAction.get(key);
        this._keyToAction.delete(key);
        var oldActionKeys = this._actionToKeys.get(oldAction);
        if(oldActionKeys) {
            oldActionKeys.delete(key);
        }
    }
    
    setKeyAction(key, action) {
        if(key.isDerived) {
            this.removeKey(key.source);
        } else if(key.canDerive) {
            this.removeKey(key.withSign(1));
            this.removeKey(key.withSign(-1));
        }
        this.removeKey(key);
        
        this._keyToAction.set(key, action);
        var keys = this._actionToKeys.get(action);
        if(!keys) {
            keys = new Set();
            this._actionToKeys.set(action, keys);
        }
        keys.add(key);
    }
    
    getKeyAction(key) {
        var action = this._keyToAction.get(key);
        if(!action && !key.isDerived && this.remapKeys) {
            // passthough doesn't make sense for derived keys
            // since the user chose to configure only half of the axis
            if(!this._actionToKeys.has(key)) {
                // dont passtrough keys that are remapped
                action = key;
            }
        }
        return action;
    }
    
    getConfig() {
        var config = {};
        for(const [action, keys] of this._actionToKeys.entries()) {
            var name = action.name || action; // action is either a Key or a String
            var val = "";
            for(const key of keys) {
                if(val !== "") {
                    val += ",";
                }
                val += key.name;
            }
            config[name] = val;
        }
        return config;
    }
    
    setConfig(config) {
        this._keyToAction.clear();
        this._actionToKeys.clear();
        for(var actionName in config) {
            var action = actionName;
            if(this.remapKeys && keys.isValidKeyString(actionName)) {
                action = keys.getKey(actionName);
            }
            // TODO handle empty config[actionName] to disable passthough for that key
            for(var key of config[actionName].split(',')) {
                this.setKeyAction(keys.getKey(key.trim()), action);
            }
        }
    }
}

class TAS {
    constructor() {
        // config
        this.movieFile = "";
        this.mode = "setup";
        this.keyboardMouseSpeed = 1;
        this._menuKeys = new KeyMap(false);
        this._gameKeys = new KeyMap(true);
        
        // state
        this._doneLoading = false;
        this._inMenu = false;
        
        // movie
        this._versions = {};
        this._rng = null;
        this._saveFile = null;
        this._inputs = [];
    }
    
    // finish initialization
    // assumes that _verions, and _inputs are already set
    setConfig(config) {
        this._rng = random.getState();
        this._saveFile = savefile.getStartupSaveFileData();
        
        this.movieFile = config.movie;
        this.mode = config.mode;
        this.speed = config.speed;
        this.paused = config.paused;
        this._menuKeys.setConfig(config.menu);
        this._gameKeys.setConfig(config.game);
    }
    
    getConfig() {
        return {
            movie: this.movieFile,
            mode: this.mode,
            speed: this.speed,
            paused: this.paused,
            menu: this._menuKeys.getConfig(),
            game: this._gameKeys.getConfig()
        };
    }
    
    getMovie() {
        return {
            versions: this._versions,
            rng: this._rng,
            saveFile: this._saveFile,
            inputs: this._inputs,
        }
    }
    
    // TODO this is very similar to setConfig
    serialize() {
        return  {
            // movie
            initialRng: this._rng,
            initialSave: this._saveFile,
            inputs: this._inputs,
            
            // config
            movie: this.movieFile,
            mode: this.mode,
            speed: this.speed,
            paused: this.paused,
            menuKeys: this._menuKeys.getConfig(),
            gameKeys: this._gameKeys.getConfig()
        };
    }
    
    deserialize(state) {
        // movie
        // this._versions is recomputed on startup
        this._rng = state.initialRng;
        this._saveFile = state.initialSave;
        this._inputs = state.inputs;
        
        // config
        this.movieFile = state.movie;
        this.mode = state.mode;
        this.speed = state.speed;
        this.paused = state.paused;
        this._menuKeys.setConfig(state.menuKeys);
        this._gameKeys.setConfig(state.gameKeys);
    }
    
    isDoneLoading() {
        return this._doneLoading;
    }
    
    setKey(key, value) {
        inputs.game.set(keys.getKey(key), value);
    }
    pressKey(key) {
        inputs.game.press(keys.getKey(key));
    }
    releaseKey(key) {
        inputs.game.release(keys.getKey(key));
    }
    
    get speed() {
        return mainloop.framesPerUpdate;
    }
    set speed(value) {
        mainloop.setFramesPerUpdate(value);
    }
    get paused() {
        return mainloop.pauseOnFrame === time.frames();
    }
    set paused(pause) {
        if(pause) {
            mainloop.pause();
        } else {
            mainloop.unpause();
        }
    }
    pauseOn(frame) {
        mainloop.pauseOn(frame);
    }
    pauseIn(offset) {
        mainloop.pause(offset);
    }
    step() {
        mainloop.pause(1);
    }
    
    getNumRngCalls(reset=false) {
        return random.getNumCalls(reset);
    }
};
window.tas = new TAS();

const gameActions = {
    "speedUp": () => {
        tas.speed = tas.speed*2;
    },
    "speedDown": () => {
        tas.speed = tas.speed/2;
    },
    "pause": () => {
        tas.paused = !tas.paused;
    },
    "step": () => {
        tas.step();
    },
    "restart": () => {
        reload.reload();
    }
};

mainloop.preUpdate.add(() => {
    var actions = tas._gameKeys.getActions();
    for(const [action, vals] of actions.entries()) {
        var func = gameActions[action];
        if(func) {
            if(vals.isPressed) {
                func();
            }
        } else if(keys.isKey(action)) {
            if(action === keys.MOUSE_X || action === keys.MOUSE_Y) {
                inputs.game.set(action, vals.value);
            } else {
                inputs.game.setMax(action, vals.value);
            }
        }
    }
});


//
// recover state from reload
//

// put the config (and movie) into reload storage so they dont have to be saved to disk
// alternativly reload will need a mechanism to wait on saving the movie file to disk
reload.serde("config", tas.serialize.bind(tas), tas.deserialize.bind(tas));


//
// load everything
//

async function loadEverything() {
    // load keys
    var keysNames = await loadJsonAsset('assets/keys.json');
    for(var name in keysNames) {
        keys.getKey(keysNames[name]).name = name;
    }
    
    // load compatability
    var compatability = await loadJsonAsset('assets/compatability.json');
    var modInfos = {
        crosscode: {version: versions.crosscode, enabled: true},
        ccloader: {version: versions.ccloader, enabled: true},
    };
    for(var mod of activeMods) {
        // aparently ccloader does not require mods to specify a version
        // so normalize undefined with "" to make validating easier
        modInfos[mod.name] = {installed:mod.version||"", enabled:true};
    }
    for(var mod of inactiveMods) {
        modInfos[mod.name] = {installed:mod.version||""};
    }
    for(var modName in compatability) {
        var modCompat = compatability[modName];
        var modInfo = modInfos[modName];
        if(!modInfo) {
            modInfo = modInfos[modName] = {};
        }
        modInfo.known = true;
        if(modInfo.enabled && modCompat.options) {
            savefile.whiteListOptions(modCompat.options);
        }
        if(modCompat.ignore) {
            modInfo.ignore = true;
        }
    }
    for(var modName in modInfos) {
        var modInfo = modInfos[modName]
        if(modInfo.enabled && !modInfo.ignore) {
            tas._versions[modName] = modInfo.version;
        }
    }
    
    // TODO code flow of reloading vs startup is a bit confusing
    // because they need to end up in effectivly the same state
    // but data is stored quite differently
    if(!reload.recover()) {
        // load config
        var config = await loadJsonAsset('config.json');
        
        // load movie
        if(config.movie) {
            var movie = await loadJsonFile(config.movie);
            
            // check compatability
            // TODO should this (or something similar) happen during reload.recover as well?
            for(var modName in movie.versions) {
                var modInfo = modInfos[modName];
                if(!modInfo) {
                    modInfo = modInfos[modName] = {};
                }
                modInfo.expected = movie.versions[modName];
            }
            // TODO make warn into prompts
            // TODO add compatability option for looser version checks (specifically for TAS, which may just get handled specally)
            for(var modName in modInfos) {
                var modInfo = modInfos[modName];
                if(modInfo.ignore) continue;
                if(!modInfo.known) {
                    console.warn('Unknown mod '+modName+' add an entry to assets/compatability.json to specify its compatability');
                }
                var correctEnabled = (modInfo.expected !== undefined) === (modInfo.enabled||false);
                var correctVersion = modInfo.expected === modInfo.installed;
                if(!correctVersion) {
                    console.warn('TAS is expecting '+modName+' version '+modInfo.expected+' but version '+modInfo.installed+' is installed');
                }
                if(!correctEnabled) {
                    console.warn('TAS is expecting '+modName+' to be '+(modInfo.enabled?'disabled':'enabled'));
                }
            }
            
            // apply movie state
            random.setState(movie.rng);
            savefile.setSaveFileData(movie.save);
            tas._inputs = movie._inputs;
        }
        
        // apply config
        tas.setConfig(config);
    }
}


var loadingPromise = loadEverything()
    .catch(showError)
    .finally(() => {
        tas._doneLoading = true;
        document.body.dispatchEvent(new Event('tasInitialized'));
        mainloop.startGame();
    });
