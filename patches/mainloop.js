// patch the main loop to use custom timer and inputs
// also add features like frame advance

import * as keys from '../utils/keys.js';
import * as config from '../utils/config.js';
import Notifier from '../utils/notifier.js';
import * as reload from '../utils/reload.js';

import * as inputs from '../patches/inputs.js';
import * as time from '../patches/time.js';
import * as savestate from '../patches/savestate.js';

import {
    run,
    Timer,
    Game,
    System,
    sound,
    WebAudio,
} from '../utils/defs.js';

//
// patch main loop
//

const MAX_UPDATE_TIME = 1 / 20;

let framesToRun = 0;

export const preUpdate = new Notifier();
export const preFrame = new Notifier();
export const postFrame = new Notifier();
export const postUpdate = new Notifier();

let canRunGame = false;
export function startGame() {
    canRunGame = true;
}

let isLongLoad = false;

// TODO this does not intercept on the same frame every time
// so the first thing that any TAS would need to do is skip the intro to resync it
// and hopefully loading mods is never so slow that the intro advances on its own before interception
ig.system[run] = function update() {
    try {
        const start = time.now();

        inputs.pollGamepads();

        preUpdate.fire();

        framesToRun += config.framesPerUpdate;
        while(framesToRun >= 1) {
            if(canRunGame // mod fully loaded
                && ig.ready // game is not loading
                && (ig.system.delegate[Game.preloadTimer] <= 0 || ig.system.delegate[Game.preloadMap] !== null) // game is not preloading
                && time.frames() < config.pauseOnFrame // tas is not paused
                && time.now() - start < MAX_UPDATE_TIME // more time left in the update cycle
            ) {
                framesToRun -= 1;

                if(isLongLoad) {
                    reload.serialize(reload.LOAD_MAP);
                }

                preFrame.fire();

                inputs.inject();

                // update time
                time.step();
                ig.system[System.tick] = ig.system[System.timer][Timer.tick]();
                ig.system[System.tickPause] = ig.system[System.isPaused]() ? 0 : ig.system[System.tick];
                ig.system[System.tickScale] = ig.system[System.tickPause] * ig.system[System.timeScale];
                if(ig.system[System.fastForward]) {
                    ig.system[System.tickPause] *= 8;
                    ig.system[System.tickScale] *= 8;
                }
                // supposedly this could be non-zero, but im not sure what circumstances that would actually happen in
                // perhaps when sound is paused, but when the sound is resumed it will get set back to 0 anyway
                // if sound is ever patched then this will probably be obsolete or make more sense
                ig[sound].context[WebAudio.offset] = 0;

                // update the game
                // this ends up drawing multiple times when fastforwarding...
                ig.system.delegate[run]();

                isLongLoad = !ig.ready && ig.system[System.tickPause] <= .05;

                postFrame.fire();
            } else {
                framesToRun = 0;
            }
        }

        postUpdate.fire();

        inputs.user.update();
        inputs.user.release(keys.WHEEL_X);
        inputs.user.release(keys.WHEEL_Y);

        window.requestAnimationFrame(ig.system[run]);
    } catch(e) {
        ig.system.error(e);
    }
};
