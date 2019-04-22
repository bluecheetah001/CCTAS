// track ig.Class style classes, enabling logging and enforcing save states


// enable tracking on fields, may impact performance more than normal logging
const TRACK_FIELDS = true;

export let nextTrackID = 0;

// TODO get a library for this
const invalidIds = []
function invalidIndex(id) {
    let min = -1;
    let max = invalidIds.length;
    while(min + 1 < max) {
        const mid = ((min + max) / 2) | 0;
        const v = invalidIds[mid];
        if(v < id) {
            max = v;
        } else if(v > id) {
            min = v;
        } else {
            return mid;
        }
    }
    return min;
}
function isIndexValid(index) {
    return (index & 1) === 1;
}
export function invalidateIds(start, end) {
    if(start === end) return;

    let startIndex = invalidIndex(start);
    if(!isIndexValid(startIndex)) {
        start = invalidIds[startIndex];
        startIndex -= 1;
    }

    let endIndex = invalidIndex(end);
    if(!isIndexValid(endIndex)) {
        endIndex += 1;
        end = invalidIds[endIndex];
    }

    invalidIds.splice(startIndex + 1, endIndex - startIndex, start, end);
}
function isValid(id) {
    return isIndexValid(invalidIndex(id));
}

const trackID = Symbol('trackId');
const lateDiscovery = Symbol('lateDiscovery');
const classInfo = new Map();


// this uses obfuscated names, so just for dev right now
// this is un able to track fields in already existing instances
// and will only track fields if TRACK_FIELDS is true
// this will not track
export function trackClass(Class) {
    trackClass(Class.prototype.prototype.constructor); // TODO is this right?
    const classId = Class.yba;

}

function patchClass(classProto) {
    if(classProto === ig.Ca.prototype) return; // nothing to track in Class
}
