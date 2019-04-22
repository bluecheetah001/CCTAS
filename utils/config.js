import * as keys from '../utils/keys.js';
import * as reload from '../utils/reload.js';
import * as files from '../utils/files.js';


// a bi directional map from key to action
class KeyMap {
    constructor(remapKeys) {
        this._keyToAction = new Map(); // map from Key to action
        this._actionToKeys = new Map(); // map from action to Set of Keys
        this.remapKeys = remapKeys;
    }

    // TODO move to mod.js

    removeKey(key) {
        const oldAction = this._keyToAction.get(key);
        this._keyToAction.delete(key);
        const oldActionKeys = this._actionToKeys.get(oldAction);
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
        let keys_ = this._actionToKeys.get(action);
        if(!keys_) {
            keys_ = new Set();
            this._actionToKeys.set(action, keys_);
        }
        keys_.add(key);
    }

    getKeyAction(key) {
        let action = this._keyToAction.get(key);
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
        const config = {};
        for(const [action, keys_] of this._actionToKeys.entries()) {
            const name = action.name || action; // action is either a Key or a String
            let val = '';
            for(const key of keys_) {
                if(val !== '') {
                    val += ',';
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
        for(const actionName in config) {
            let action = actionName;
            if(this.remapKeys && keys.isValidKeyString(actionName)) {
                action = keys.getKey(actionName);
            }
            // TODO handle empty config[actionName] to disable passthough for that key
            for(const key of config[actionName].split(',')) {
                this.setKeyAction(keys.getKey(key.trim()), action);
            }
        }
    }
}

export let movieFile = '';
export function setMovieFile(fileName) {
    movieFile = fileName;
}

export const PLAY = 'play';
export const RECORD = 'record';
export const SETUP = 'setup';

export let mode = SETUP;
export function setMode(mode_) {
    mode = mode_;
}

export let framesPerUpdate = 1;
export function setFramesPerUpdate(speed) {
    framesPerUpdate = speed;
}

export let pauseOnFrame = Infinity;
export function setPauseOnFrame(frame) {
    pauseOnFrame = frame;
}

export let inMenu = false;
export function setInMenu(inMenu_) {
    inMenu = inMenu_;
}
export const menuKeys = new KeyMap(false);

export const gameKeys = new KeyMap(true);

export function load() {
    return files.loadJsonLocal('config.json')
        .then(deserialize);
}

export function save() {
    return files.saveJsonLocal('config.json', serialize(), true);
}

function serialize(hint) {
    // dont need to save anything unless we are restarting
    if(hint !== reload.RESTART) return undefined;

    return {
        movie: movieFile,
        mode: mode,
        speed: framesPerUpdate,
        pauseOn: Number.isFinite(pauseOnFrame) ? pauseOnFrame : false,
        inMenu: inMenu,
        menu: menuKeys.getConfig(),
        game: gameKeys.getConfig(),
    };
}

function deserialize(config) {
    if(config === undefined) return;

    setMovieFile(config.movie);
    setMode(config.mode);
    setFramesPerUpdate(config.speed);
    setPauseOnFrame(config.pauseOn === false ? Infinity : config.pauseOn);
    setInMenu(config.inMenu);
    menuKeys.setConfig(config.menu);
    gameKeys.setConfig(config.game);
}

reload.serde('config', serialize, deserialize);
