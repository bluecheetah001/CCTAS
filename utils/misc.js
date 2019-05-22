// util for showing an error from a callback
export function showError(e) {
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

export function shortStr(val, depth) {
    if(Array.isArray(val)) {
        if(depth) {
            const subStr = val.map((v) => shortStr(v, depth - 1)).join(', ');
            return `[${subStr}]`;
        } else {
            return `[].length=${val.length}`;
        }
    }
    if(typeof val === 'function') return 'function';
    if(val === null) return 'null';
    if(val === undefined) return 'undefined';
    const str = val.toString();
    if(str === '[object Object]') {
        if(depth) {
            const subStr = Object.getOwnPropertyNames(val).map((k) => `${k}: ${shortStr(val[k], depth - 1)}`).join(', ');
            return `{${subStr}}`;
        } else {
            return '{...}';
        }
    }
    return str;
}
