// TODO axis limits?
// TODO dead zones?


//
// Keys
//

export const INTERNAL = 'INTERNAL';
export const KEYBOARD = 'KEYBOARD';
export const MOUSE = 'MOUSE';
export const GAMEPAD_BUTTON = 'GAMEPAD_BUTTON';
export const GAMEPAD_AXIS = 'GAMEPAD_AXIS';

// an arbitrary large range that prints using only 0-9 (no exponent)
export const MIN_CODE = 0;
export const MAX_CODE = 999999999;

export const MOUSE_X_CODE = 0;
export const MOUSE_Y_CODE = 1;
export const WHEEL_X_CODE = 2;
export const WHEEL_Y_CODE = 3;
function canInternalDerive(code) {
    return code === WHEEL_X_CODE || code === WHEEL_Y_CODE;
}

const namedKeys = new Map();
const codedKeys = new Map();

codedKeys.set(INTERNAL, new Map());
codedKeys.set(KEYBOARD, new Map());
codedKeys.set(MOUSE, new Map());
codedKeys.set(GAMEPAD_BUTTON, new Map());
codedKeys.set(GAMEPAD_AXIS, new Map());

const keyNameRegex = /^[A-Z0-9_]+$/;
const keyCodeRegex = /^(INTERNAL|KEYBOARD|MOUSE|GAMEPAD_BUTTON|GAMEPAD_AXIS)_([0-9]+)$/;

export function isValidKeyString(string) {
    if(string.endsWith('+') || string.endsWith('-')) {
        string = string.substring(0, string.length - 1);
    }
    return keyNameRegex.test(string);
}

export function isValidKeyName(string) {
    return keyNameRegex.test(string) && !keyCodeRegex.test(string);
}

export function isValidCodedKey(string) {
    if(string.endsWith('+') || string.endsWith('-')) {
        string = string.substring(0, string.length - 1);
    }
    return keyCodeRegex.test(string);
}

class Key {
    constructor(source, code, name) {
        this.source = source;
        this.code = code;
        this.canDerive = this.isGamepadAxis || this.isInternal && canInternalDerive(code);
        this._rawName = null;
        this._name = null;
        this._positive = null;
        this._negative = null;
    }
    
    get isDerived() {
        return this.source instanceof Key;
    }
    
    get isInternal() {
        return this.source === INTERNAL;
    }
    get isKeyboard() {
        return this.source === KEYBOARD;
    }
    get isMouse() {
        return this.source === MOUSE;
    }
    get isGamepadButton() {
        return this.source === GAMEPAD_BUTTON;
    }
    get isGamepadAxis() {
        return this.source === GAMEPAD_AXIS;
    }
    
    get name() {
        return this._name || this.rawName;
    }
    
    get rawName() {
        if(!this._rawName) {
            if(this.isDerived) {
                this._rawName = this.source.rawName + (this.code === 1 ? '+' : '-');
            } else {
                this._rawName = this.source + '_' + this.code;
            }
        }
        return this._rawName;
    }
    
    set name(name) {
        if(!isValidKeyName(name)) throw new Error("Attempting to set "+this.rawName+".name to "+name+", which is invalid");
        if(this._name) throw new Error("Attempting to set "+this.rawName+".name to "+name+", but it is already named "+this._name);
        if(namedKeys.has(name)) throw new Error("Attempting to set "+this.rawName+".name to "+name+", but "+namedKeys.get(name).rawName+" already has that name");
        namedKeys.set(name, this);
        this._name = name;
    }
    
    withSign(sign) {
        if(!this.canDerive) throw new Error("Key "+this+" is cannot be derived");
        if(sign > 0) {
            if(!this._positive) this._positive = new Key(this, 1);
            return this._positive;
        }
        if(sign < 0) {
            if(!this._negative) this._negative = new Key(this, -1);
            return this._negative;
        }
        throw new Error("Invalid axis direction "+sign);
    }
    withOtherSign() {
        if(!this.isDerived) throw new Error("Key "+this.name+" is not derived");
        return this.source.withSign(-this.code);
    }
    
    toString() {
        if(this._name) {
            return this.name+"("+this.rawName+")";
        } else {
            return this.rawName;
        }
    }
}

export function getKey(name) {
    let key = namedKeys.get(name);
    if(key) return key;
    let sign = 0;
    if(name.endsWith('+')) sign = 1;
    else if(name.endsWith('-')) sign = -1;
    const subName = sign === 0 ? name : name.substring(0, name.length - 1);
    let subKey = namedKeys.get(subName);
    if(!subKey) {
        const match = keyCodeRegex.exec(subName);
        if(!match) throw new Error("Unknown key "+name);
        const source = match[1];
        const code = parseInt(match[2], 10);
        subKey = getCodedKey(source, code);
    }
    if(sign === 0) return subKey;
    key = subKey.withSign(sign);
    return key;
}

export function getCodedKey(source, code, sign = null) {
    const codes = codedKeys.get(source);
    if(!codes) throw new Error("Invalid key source "+source);
    if(!Number.isInteger(code) || code < 0 || code > MAX_CODE) throw new Error("Invalid key code "+code);
    let key = codes.get(code);
    if(!key) {
        key = new Key(source, code);
        codes.set(code, key);
    }
    return sign === null ? key : key.withSign(sign);
}

export function getKeyboardKey(code) {
    return getCodedKey(KEYBOARD, code);
}

export function getMouseKey(code) {
    return getCodedKey(MOUSE, code);
}

export function getGamepadButton(code) {
    return getCodedKey(GAMEPAD_BUTTON, code);
}

export function getGamepadAxis(code) {
    return getCodedKey(GAMEPAD_AXIS, code);
}

export const MOUSE_X = getCodedKey(INTERNAL, MOUSE_X_CODE);
export const MOUSE_Y = getCodedKey(INTERNAL, MOUSE_Y_CODE);
export const WHEEL_X = getCodedKey(INTERNAL, WHEEL_X_CODE);
export const WHEEL_Y = getCodedKey(INTERNAL, WHEEL_Y_CODE);
export const WHEEL_LEFT = WHEEL_X.withSign(-1);
export const WHEEL_RIGHT = WHEEL_X.withSign(1);
export const WHEEL_UP = WHEEL_Y.withSign(-1);
export const WHEEL_DOWN = WHEEL_Y.withSign(1);

export function isKey(key) {
    return key instanceof Key;
}

//
// Key states
//

// TODO put this in config, or set configurable per key?
export const THRESHOLD = .1;

export class Input {
    constructor() {
        this._prev = new Map();
        this._trans = new Map();
        this._curr = new Map();
    }
    get(key) {
        if(key.isDerived) {
            const value = this._curr.get(key.source) || 0;
            return Math.max(0, value * key.code);
        } else {
            return this._curr.get(key) || 0;
        }
    }
    getTrans(key) {
        if(key.isDerived) {
            const value = this._trans.get(key.source);
            if(value === undefined) return undefined;
            return Math.max(0, value * key.code);
        } else {
            return this._trans.get(key);
        }
    }
    getPrev(key) {
        if(key.isDerived) {
            const value = this._prev.get(key.source) || 0;
            return Math.max(0, value * key.code);
        } else {
            return this._prev.get(key) || 0;
        }
    }
    isUp(key) {
        return Math.abs(this.get(key)) < THRESHOLD;
    }
    isDown(key) {
        return !this.isUp(key);
    }
    isPrevUp(key) {
        return Math.abs(this.getPrev(key)) < THRESHOLD;
    }
    isPrevDown(key) {
        return !this.isPrevUp(key);
    }
    isPressed(key) {
        return this.isDown(key) && this.isPrevUp(key);
    }
    isReleased(key) {
        return this.isUp(key) && this.isPrevDown(key);
    }
    getAnyPressed() {
        for(const [key, value] of this.transEntries()) {
            if(this.isPressed(key)) {
                return key.canDerive ? key.withSign(value) : key;
            }
        }
        return null;
    }
    
    // iterable over every known key
    keys() {
        return this._curr.keys();
    }
    // will include an entry for every known key, even if the key is up
    entries() {
        return this._curr.entries();
    }
    // will include an entry for every key that was set (even to the same value) since the last update.
    transEntries() {
        return this._trans.entries();
    }
    // will include an entry for every known key (before the last update), even if the key is up
    prevEntries() {
        return this._prev.entries();
    }
    
    _set(key, value) {
        this._curr.set(key, value);
        this._trans.set(key, value);
    }
    set(key, value) {
        if(!Number.isFinite(value)) throw new Error("Invalid value "+value+" for key "+key);
        if(!key.canDerive) {
            if(value < 0) throw new Error("Invalid value "+value+" for key "+key);
        }
        
        if(key.isDerived) {
            value *= key.code;
            key = key.source;
        }
        this._set(key, value);
        return this;
    }
    setMax(key, value) {
        if(!Number.isFinite(value)) throw new Error("Invalid value "+value+" for key "+key);
        if(!key.canDerive) {
            if(value < 0) throw new Error("Invalid value "+value+" for key "+key);
        }
        
        if(key.isDerived) {
            value *= key.code;
            key = key.source;
        }
        
        const old = this.getTrans(key)
        if(!old || Math.abs(value) > Math.abs(old)) {
            this._curr.set(key, value);
            this._trans.set(key, value);
        }
        return this;
    }
    press(key) {
        return this.set(key, 1);
    }
    release(key) {
        return this.set(key, 0);
    }
    
    releaseAll() {
        // this cannot call this._curr.clear() as that would break entries
        for(const key of this._curr.keys()) {
            this._set(key, 0);
        }
        return this;
    }
    
    update() {
        this._prev = new Map(this._curr);
        this._trans.clear();
        return this;
    }
}
