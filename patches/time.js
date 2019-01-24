import * as reload from '../utils/reload.js';

//
// patch how timers work
//

const Timer = "ml";

const FPS = 60;

var frameCount = 0;

export function frames() {
    return frameCount;
}

export function setFrames(frames) {
    frameCount = frames;
    return ig[Timer].time = frames / FPS;
}

export function step() {
    setFrames(frameCount+1);
}

// the current game time measured in seconds
// the actual value is not meaningful except when comparing to another time returned by this function
export function gameNow() {
    return ig[Timer].time;
}

// the current time measured in seconds
// the actual value is not meaningful except when comparing to another time returned by this function
export function now() {
    return performance.now() / 1000;
}

// for some reason the game.loader module calls this outside of the gameloop
// so just make it a no-op
ig[Timer].step = function() {}


//
// patch the single event step that uses Date instead of Timer
// which is also only used for Jet's tutorial on the M.S. Solar
//

const eventSteps = "oa";
const EventUtils = "Ka";
const getVar = "Fr";
const varName = "Jd";

ig[eventSteps].SET_VAR_TIME.prototype.start = function() {
    var v = ig[EventUtils][getVar](this[varName]);
    if(v) {
        ig.vars.set(v, gameNow() * 1000);
    } else {
        ig.log("SET_VAR_TIME: Variable Name is not a String!");
    }
}


//
// recover state from reload
//

reload.serde("frame", frames, setFrames);
