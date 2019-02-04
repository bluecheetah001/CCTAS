// patch for random number generation to make it reproduceable

import * as reload from '../utils/reload.js';

import newPrng from '../libs/seedrandom.js'

let count = 0;
let prng = newPrng({})

Math.random = function() {
    count += 1;
    return prng();
}

export function setSeed(seed) {
    prng = newPrng({seed:seed});
}

export function getState() {
    return prng.state();
}

export function setState(state) {
    prng = newPrng({state:state});
}

export function getNumCalls(reset=false) {
    const c = count;
    if(reset) count = 0;
    return c;
}


//
// recover state from reload
//

reload.serde("rng", getState, setState);
