// patch the main loop to use custom timer and inputs
// also add features like frame advance

import * as keys from '../utils/keys.js';
import Notifier from '../utils/notifier.js';

import * as inputs from '../patches/inputs.js';
import * as time from '../patches/time.js';

import {
    run,
    Timer,
    System,
    sound,
    WebAudio
} from '../utils/defs.js';

//
// patch main loop
//

const MAX_UPDATE_TIME = 1/20;

export let framesPerUpdate = 0;
export let pauseOnFrame = 0;
let framesToRun = 0;

export function setFramesPerUpdate(count) {
    const delta = count - framesPerUpdate;
    framesPerUpdate = count;
    framesToRun = Math.max(0, framesToRun+delta);
}
export function pauseOn(frame) {
    pauseOnFrame = frame;
}
export function pause(offset=0) {
    pauseOnFrame = time.frames()+offset;
}
export function unpause() {
    pauseOnFrame = Infinity;
}

export const preUpdate = new Notifier();
export const postFrame = new Notifier();
export const postUpdate = new Notifier();

let canRunGame = false;
export function startGame() {
    canRunGame = true;
}


// TODO this does not intercept on the same frame every time
// so the first thing that any TAS would need to do is skip the intro to resync it
// and hopefully loading mods is never so slow that the intro advances on its own before interception
ig.system[run] = function update() {
    try {
        const start = time.now();
        
        inputs.pollGamepads();
        
        preUpdate.fire();
        
        if(canRunGame && ig.ready && framesPerUpdate > 0) {
            framesToRun += framesPerUpdate;
        }
        
        while(ig.ready && framesToRun > 0 && time.frames() < pauseOnFrame ) {
            framesToRun -= 1;
            
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
            
            postFrame.fire();
            
            if(!ig.ready || (time.now() - start) > MAX_UPDATE_TIME) {
                framesToRun = 0;
                break;
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
}
