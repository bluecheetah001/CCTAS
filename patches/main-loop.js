// patch the main loop to use custom timer and inputs
// also add features like frame advance

import * as keys from '../utils/keys.js';
import * as config from '../utils/config.js';
import Notifier from '../utils/notifier.js';
import * as reload from '../utils/reload.js';

import * as inputs from '../patches/inputs.js';
import * as time from '../patches/time.js';

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

ig.System.inject({
    // TODO this does not intercept on the same frame every time
    // so the first thing that any TAS would need to do is skip the intro to resync it
    // and hopefully loading mods is never so slow that the intro advances on its own before interception
    run() {
        try {
            const start = time.now();

            inputs.pollGamepads();

            preUpdate.fire();

            framesToRun += config.framesPerUpdate;
            while(framesToRun >= 1) {
                if(canRunGame // mod fully loaded
                    && !ig.loading // game is not loading
                    && (ig.game.teleporting.timer <= 0 || ig.game.teleporting.levelData !== null) // game is not preloading
                    && time.frames() < config.pauseOnFrame // tas is not paused
                    && time.now() - start < MAX_UPDATE_TIME // more time left in the update cycle
                ) {
                    framesToRun -= 1;


                    preFrame.fire();

                    inputs.inject();

                    // update time
                    time.step();
                    this.rawTick = this.clock.tick();
                    this.actualTick = this.hasFocusLost() ? 0 : this.rawTick;
                    this.tick = this.actualTick * this.timeFactor;
                    if(this.skipMode) {
                        this.actualTick *= 8;
                        this.tick *= 8;
                    }
                    // supposedly timeOffset could be non-zero, but im not sure what circumstances that would actually happen in
                    // perhaps when sound is paused, but when the sound is resumed it will get set back to 0 anyway
                    // if sound is ever patched then this will probably be obsolete or make more sense
                    ig.soundManager.context.timeOffset = 0;

                    // update the game
                    // this ends up drawing multiple times when fastforwarding...
                    ig.game.run();

                    postFrame.fire();

                    if(willLoad()) {
                        reload.serialize(reload.LOAD_MAP);
                    }
                } else {
                    framesToRun = 0;
                }
            }

            postUpdate.fire();

            inputs.user.update();
            inputs.user.release(keys.WHEEL_X);
            inputs.user.release(keys.WHEEL_Y);

            window.requestAnimationFrame(this.run.bind(this));
        } catch(e) {
            this.error(e);
        }
    },
});

function willLoad() {
    if(ig.game.paused && !ig.loading) return false;
    if(ig.game.teleporting.timer <= 0) return false;

    let tick = time.framesToSeconds(time.frames() + 1) - time.gameNow();
    if(ig.system.hasFocusLost()) tick = 0;
    if(ig.system.skipMode) tick *= 8;
    if(ig.game.teleporting.timer - tick > 0) return false;

    tick = Math.min(0.05, tick);
    if(ig.game.teleporting.timer - tick > 0) {
        console.warn('Not creating save state due to fast forward');
        return false;
    }

    return true;
}
