// patch for random number generation to make it reproduceable

import newPrng from '../libs/seedrandom.js'

var count = 0;
var prng = newPrng({})

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
    var c = count;
    if(reset) count = 0;
    return c;
}