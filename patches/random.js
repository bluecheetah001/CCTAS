// patch for random number generation to make it reproduceable

import * as reload from '../utils/reload.js';
import {traceStack} from '../patches/trace.js';

import newPrng from '../libs/seed-random.js';

let count = 0;
let prng = newPrng({});

const origRandom = Math.random;
function random() {
    count += 1;
    traceStack();
    return prng();
}
Math.random = random;

export function setSeed(seed) {
    prng = newPrng({seed});
}

export function getState(includeCount = true) {
    const state = prng.state();
    if(includeCount) {
        state.numCalls = count;
    }
    return state;
}

export function setState(state) {
    prng = newPrng({state});
    count = state.numCalls || 0;
}

export function getNumCalls(reset = false) {
    const c = count;
    if(reset) count = 0;
    return c;
}

export function withOriginalRandom(fn) {
    if(Math.random === random) {
        Math.random = origRandom;
        try {
            return fn();
        } finally {
            Math.random = random;
        }
    } else {
        return fn();
    }
}

//
// recover state from reload
//

reload.serde('rng', getState, setState);
