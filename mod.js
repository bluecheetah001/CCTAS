// root of TAS mod to get everything setup
import * as keys from './utils/keys.js';
import * as reload from './utils/reload.js';
import * as compatability from './utils/compatability.js';
import * as config from './utils/config.js';

import * as inputs from './patches/inputs.js';
import * as mainloop from './patches/mainloop.js';
import * as random from './patches/random.js';
import './patches/savefile.js';
import * as time from './patches/time.js';
// import './patches/cursor.js'; // (patch Kva and draw cursor ingame)

import * as movie from './movie.js';


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


const gameActions = {
    speedUp: () => {
        config.setSpeed(config.speed * 2);
    },
    speedDown: () => {
        config.setSpeed(config.speed / 2);
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
        reload.reload();
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
            if(config.mode === config.RECORD) {
                if(action === keys.MOUSE_X || action === keys.MOUSE_Y) {
                    inputs.game.set(action, vals.value);
                } else {
                    inputs.game.setMax(action, vals.value);
                }
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


//
// load everything
//

async function loadEverything() {
    try {
        // load keys
        await keys.load();

        // load compatability
        await compatability.load();

        // TODO code flow of reloading vs startup is a bit confusing
        // because they need to end up in effectivly the same state
        // but data is stored quite differently
        if(!reload.recover()) {
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
loadEverything();


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
        if(config.mode === config.RECORD) {
            inputs.game.set(keys.getKey(key), value);
        }
    }
    pressKey(key) {
        if(config.mode === config.RECORD) {
            inputs.game.press(keys.getKey(key));
        }
    }
    releaseKey(key) {
        if(config.mode === config.RECORD) {
            inputs.game.release(keys.getKey(key));
        }
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
