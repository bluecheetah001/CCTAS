// root of TAS mod to get everything setup
import * as keys from './utils/keys.js';
import * as reload from './utils/reload.js';
import * as compatability from './utils/compatability.js';
import * as config from './utils/config.js';
import {showError} from './utils/misc.js';

import * as inputs from './patches/inputs.js';
import * as mainloop from './patches/mainloop.js';
import * as random from './patches/random.js';
import './patches/savefile.js';
import * as time from './patches/time.js';
import './patches/cursor.js';
import * as cache from './patches/cache.js';
import './patches/loadmap.js';

import * as movie from './tools/movie.js';


const gameActions = {
    speedUp: () => {
        config.setFramesPerUpdate(config.speed * 2);
    },
    speedDown: () => {
        config.setFramesPerUpdate(config.speed / 2);
    },
    pause: () => {
        if(time.frames() < config.pauseOnFrame) {
            config.setPauseOnFrame(time.frames());
        } else {
            config.setPauseOnFrame(Infinity);
        }
    },
    step: () => {
        config.setPauseOnFrame(time.frames() + 1);
    },
    restart: () => {
        restartButton.restart(true);
    },
};

mainloop.preUpdate.add(() => {
    const actions = getActions(config.gameKeys);
    for(const [action, vals] of actions.entries()) {
        const func = gameActions[action];
        if(func) {
            if(vals.isPressed) {
                func();
            }
        } else if(keys.isKey(action)) {
            if(config.mode !== config.PLAY) {
                inputs.game.set(action, vals.value);
            }
        }
    }
});
function getActions(keyMap) {
    const actions = new Map();
    for(const key of inputs.user.keys()) {
        if(key.canDerive) {
            const posAction = keyMap.getKeyAction(key.withSign(1));
            const negAction = keyMap.getKeyAction(key.withSign(-1));
            if(posAction || negAction) {
                putAction(actions, posAction, key.withSign(1));
                putAction(actions, negAction, key.withSign(-1));
                continue;
            }
        }
        const action = keyMap.getKeyAction(key);
        putAction(actions, action, key);
    }
    return actions;
}
function putAction(actions, action, key) {
    if(action) {
        let vals = actions.get(action);
        if(!vals) {
            vals = new ActionVals();
            actions.set(action, vals);
        }
        vals.value = inputs.user.get(key);
        vals.prev = inputs.user.getPrev(key);
    }
}
class ActionVals {
    constructor() {
        this._prev = 0;
        this._val = 0;
    }

    set prev(value) {
        if(Math.abs(value) > Math.abs(this._prev)
                && Math.abs(value) > keys.THRESHOLD) {
            this._prev = value;
        }
    }

    set value(value) {
        if(Math.abs(value) > Math.abs(this._val)
                && Math.abs(value) > keys.THRESHOLD) {
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


//
// load everything
//

async function loadEverything() {
    try {
        // save state on restarting
        restartButton.addListener(() => {
            localStorage.tas = JSON.stringify(reload.serialize(reload.RESTART));
        });

        // load keys
        await keys.load();

        // load compatability
        await compatability.load();

        // TODO code flow of reloading vs startup is a bit confusing
        // because they need to end up in effectivly the same state
        // but data is stored quite differently
        if(localStorage.tas) {
            reload.deserialize(JSON.parse(localStorage.tas));
            delete localStorage.tas;
        } else {
            // load config
            await config.load();

            // load movie
            if(config.movieFile) {
                await movie.loadFile(config.movieFile);
            }
        }
    } catch(e) {
        showError(e);
    } finally {
        mainloop.startGame();
    }
}
document.body.addEventListener('modsLoaded', loadEverything);


//
// export to console
//

class TAS {
    constructor() {
        this.SETUP = config.SETUP;
        this.RECORD = config.RECORD;
        this.PLAY = config.PLAY;
    }

    setKey(key, value) {
        if(config.mode !== config.PLAY) {
            inputs.game.set(keys.getKey(key), value);
        }
    }
    pressKey(key) {
        if(config.mode !== config.PLAY) {
            inputs.game.press(keys.getKey(key));
        }
    }
    releaseKey(key) {
        if(config.mode !== config.PLAY) {
            inputs.game.release(keys.getKey(key));
        }
    }
    releaseAll() {
        inputs.game.releaseAll();
    }
    getKey(key) {
        inputs.get.get(keys.getKey(key));
    }
    get nextInputs() {
        const obj = {};
        for(const [key, value] of inputs.game.entries()) {
            if(value !== 0) {
                obj[key.name] = value;
            }
        }
        return obj;
    }

    get inputs() {
        return movie.getInputs();
    }

    get movieFileName() {
        return config.movieFile;
    }
    set movieFileName(fileName) {
        config.setMovieFile(fileName);
    }

    get mode() {
        return config.mode;
    }
    set mode(mode) {
        config.setMode(mode);
    }

    get speed() {
        return config.framesPerUpdate;
    }
    set speed(value) {
        config.setFramesPerUpdate(value);
    }
    get paused() {
        return time.frames() >= config.pauseOnFrame;
    }
    set paused(pause) {
        config.setPauseOnFrame(pause ? 0 : Infinity);
    }
    get pauseOn() {
        return config.pauseOnFrame;
    }
    set pauseOn(frame) {
        config.setPauseOnFrame(frame);
    }
    step(offset = 1) {
        config.setPauseOnFrame(time.frames() + offset);
    }
    get frames() {
        return time.frames();
    }

    getNumRngCalls(reset = false) {
        return random.getNumCalls(reset);
    }
    getCacheCounts() {
        return cache.getCounts();
    }

    save(finishSetup = false) {
        if(finishSetup && config.mode !== config.SETUP) {
            throw new Error('Not in setup');
        }
        if(config.movieFile === '') {
            throw new Error('Movie file is not set');
        }
        return _save(finishSetup);
    }

    restart() {
        reload.reload();
    }

    getLastSaveState() {
        return reload.lastSaveState;
    }
    loadSaveState(saveState) {
        if(ig.ready === false) {
            console.log('Cannot load save state while already loading');
            return;
        }
        reload.deserialize(saveState || reload.lastSaveState);
        mainloop.justLoadedSaveState();
    }
}

async function _save(finishSetup) {
    await movie.saveFile(config.movieFile);
    if(finishSetup) {
        config.setMode(config.RECORD);
    }
    await config.save();
    console.log('saved.');
    if(finishSetup) {
        reload.reload();
    }
}

window.tas = new TAS();
