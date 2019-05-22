import {shortStr} from '../utils/misc.js';
import * as time from '../patches/time.js';
import * as config from '../utils/config.js';
import * as mainLoop from '../patches/main-loop.js';


const stackRegex = /at ([^ ]+) \(.*?assets\/(js\/|mods\/)?([^)]+)\)/g;
export function getStack() {
    const stack = new Error().stack;
    const parsed = [];
    for(;;) {
        const match = stackRegex.exec(stack);
        if(match === null) break;
        const fn = match[1];
        const location = match[3];
        parsed.push(`${fn}@/${location}`);
    }
    parsed.reverse();
    parsed.length -= 1;
    return parsed;
}

const valuesByFrame = [];
let verifyIndex = -1;
let currentFrame = -1;
mainLoop.preFrame.add(() => {
    if(!config.trace) return;

    if(valuesByFrame[time.frames()] === undefined) {
        valuesByFrame[time.frames()] = [];
        verifyIndex = -1;
    } else {
        if(verifyIndex !== -1 && valuesByFrame[currentFrame].length > verifyIndex) {
            console.log(`at ${currentFrame}:${verifyIndex}`);
            console.log('  expected', valuesByFrame[currentFrame][verifyIndex]);
            console.log('   but got next frame');
        }
        verifyIndex = 0;
    }
    currentFrame = time.frames();
});

export function traceValue(value) {
    if(!config.trace) return;

    if(verifyIndex === -1) {
        valuesByFrame[currentFrame].push(value);
    } else {
        if(valuesByFrame[currentFrame][verifyIndex] !== value) {
            console.log(`at ${currentFrame}:${verifyIndex}`);
            console.log('  expected', valuesByFrame[currentFrame][verifyIndex]);
            console.log('   but got', value);
        }
        verifyIndex += 1;
    }
}

export function traceStack() {
    if(!config.trace) return;

    traceValue(getStack().join(' -> '));
}


let depth = 0;
function logFunction(id, orig) {
    return function logger(...args) {
        const indent = '  '.repeat(depth);
        const argStr = args.map(shortStr).join(', ');
        const str = `${indent}${id}(${argStr})`;
        console.log(str);
        depth += 1;
        try {
            return orig.call(this, ...args);
        } finally {
            depth -= 1;
        }
    };
}

export function logClass(name, proto) {
    for(const key of Object.getOwnPropertyNames(proto)) {
        const orig = proto[key];
        if(typeof orig === 'function' && key !== 'parent') {
            proto[key] = logFunction(name + key, orig);
        }
    }
}
