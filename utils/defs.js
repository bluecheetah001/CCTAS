// its a bit awkward for all of this to be specified in a js file instead of a json file
// but it really cleans up usage because files can just import the parts they need
// instead of having to go though a top level object
// I have opted to not use a definitions.db file, although it mostly simplifies code
// it is worse when having to patch objects, or work with objects that are not statically accessable
// and it can also really annoying to construct


const allVersions = ['v1.0.0-10', 'v1.0.1-1', 'v1.0.2-2'];
const version = sc.version.toString();
if(allVersions.indexOf(version) === -1) {
    throw new Error(`unsupported cross code version ${version}`);
}

function def(arg) {
    const obj = {};
    const name = arg[version];
    if(name === undefined) {
        // wrapper object does not define exists or toString
    } else if(name === null) {
        // field that does not exist in this version
        obj.exists = false;
    } else {
        obj.exists = true;
        obj.toString = () => name;
    }
    for(const v of allVersions) {
        delete arg[v];
    }
    for(const key in arg) {
        obj[key] = def(arg[key]);
    }
    return obj;
}


// used all over the place, so leaving it at top level
export const run = def({
    // can be found as the function passed into window.requestAnimationFrame
    'v1.0.0-10': 'ya',
    'v1.0.1-1': 'ya',
    'v1.0.2-2': 'ya',
});


// impact.base.event
export const Event = def({
    // constructor uses a.name, a.input, a.steps
    // also defines a couple of static utils
    'v1.0.0-10': 'Ja',
    'v1.0.1-1': 'Ka',
    'v1.0.2-2': 'Ja',
    getVarName: {
        // static, gets indirect varNames, otherwise is just a pass through
        // used in SET_VAR_TIME.start
        'v1.0.0-10': 'Fr',
        'v1.0.1-1': 'Fr',
        'v1.0.2-2': 'Cq',
    },
});
export const EventStepBase = def({
    // actual definition is in impact.base.step
    // but currently this is just being used as wrapper for common fields in event steps
    varName: {
        // used to hold the var name
        // used in SET_VAR_TIME.init
        'v1.0.0-10': 'Hd',
        'v1.0.1-1': 'Jd',
        'v1.0.2-2': 'Ad',
    },
});
export const EventSteps = def({
    // container for event steps
    // a lot of which are defined in impact.feature.base.event-steps
    'v1.0.0-10': 'oa',
    'v1.0.1-1': 'oa',
    'v1.0.2-2': 'oa',
});


// impact.base.game
export const Game = def({
    preloadTimer: {
        // compared against 0 in Game.update
        'v1.0.0-10': 'Ix',
        'v1.0.1-1': 'Kx',
        'v1.0.2-2': 'Ox',
    },
    preloadMap: {
        // in the "LOADING MAP: " function, this is where the ajax result is stored
        'v1.0.0-10': 'rla',
        'v1.0.1-1': 'Jla',
        'v1.0.2-2': 'Rla',
    },
});


// impact.base.input
export const Input = def({
    // singleton instance is constructed with the nice name ig.input
    lastMouse: {
        // ?.assign(lastMouse, mouse) at the end of mousemove function
        'v1.0.0-10': 'O5a',
        'v1.0.1-1': 'l6a',
        'v1.0.2-2': 'q6a',
    },
    mouseOut: {
        // set in mouseout function
        'v1.0.0-10': null,
        'v1.0.1-1': 'LIa',
        'v1.0.2-2': 'PIa',
    },
    locked: {
        // set in keydown along with being checked before setting pressed
        'v1.0.0-10': 'VHa',
        'v1.0.1-1': 'iIa',
        'v1.0.2-2': 'mIa',
    },
    pressed: {
        // set in keydown after checking locked
        'v1.0.0-10': 'vga',
        'v1.0.1-1': 'Oga',
        'v1.0.2-2': 'Xga',
    },
    down: {
        // set in keydown without checking locked
        'v1.0.0-10': 'Pg',
        'v1.0.1-1': 'Pg',
        'v1.0.2-2': 'Pg',
    },
    up: {
        // set in keyup
        'v1.0.0-10': 'Eea',
        'v1.0.1-1': 'Wea',
        'v1.0.2-2': 'dfa',
    },
    released: {
        // pushed to in keyup
        // a list instead of an object like the others
        'v1.0.0-10': 'MX',
        'v1.0.1-1': 'VX',
        'v1.0.2-2': '$X',
    },
    isFocusLost: {
        // checks document.hasFocus
        'v1.0.0-10': 'R4a',
        'v1.0.1-1': 'n5a',
        'v1.0.2-2': 's5a',
    },
});


// impact.base.system
export const System = def({
    // singleton instance is constructed with the nice name ig.system
    // though most uses are going to use shorter variable it is copied to
    canvasWidth: {
        // gotten from canvas.style.width
        'v1.0.0-10': 'Hta',
        'v1.0.1-1': 'Vta',
        'v1.0.2-2': 'aua',
    },
    canvasHeight: {
        // gotten from canvas.style.height
        'v1.0.0-10': 'KLa',
        'v1.0.1-1': 'ZLa',
        'v1.0.2-2': 'cMa',
    },
    timer: {
        // set in constructor to new ig.Timer
        // accessed in System.run to to compute System.tick
        'v1.0.0-10': 'QZa',
        'v1.0.1-1': 'j_a',
        'v1.0.2-2': 'p_a',
    },
    tick: {
        // unscalled (except clamped and scaled by a constant 1)
        // second step in System.run (within the module local function)
        'v1.0.0-10': 'gz',
        'v1.0.1-1': 'jz',
        'v1.0.2-2': 'Dx',
    },
    tickPause: {
        // scaled by pausing and fastforward
        // third step in System.run, condition is System.isPaused
        'v1.0.0-10': 'Sa',
        'v1.0.1-1': 'Sa',
        'v1.0.2-2': 'Sa',
    },
    tickScale: {
        // scaled by pausing, fastforward, and some other factor (used for slowdowns?)
        // forth step in System.run, scale factor is System.timeScale
        'v1.0.0-10': 'ja',
        'v1.0.1-1': 'ja',
        'v1.0.2-2': 'ja',
    },
    isPaused: {
        // third step of System.run to compute tickPause
        'v1.0.0-10': 'Mda',
        'v1.0.1-1': 'dea',
        'v1.0.2-2': 'mea',
    },
    timeScale: {
        // forth step of System.run to compute tickScale
        'v1.0.0-10': 'fm',
        'v1.0.1-1': 'gm',
        'v1.0.2-2': 'hm',
    },
    fastForward: {
        // fifth step (skipping ig.system.sound.context) to scale tickPause and tickScale by 8
        'v1.0.0-10': 'Un',
        'v1.0.1-1': 'Wn',
        'v1.0.2-2': 'Yn',
    },
    cursorType: {
        // conditionally is added to "cursorSize" string
        'v1.0.0-10': 'vna',
        'v1.0.1-1': 'tca',
        'v1.0.2-2': 'Aca',
    },
    updateCursorClass: {
        // has the string "curosrSize"
        'v1.0.0-10': 'KOa',
        'v1.0.1-1': 'Kva',
        'v1.0.2-2': 'Qva',
    },
});
export const sound = def({
    // used in System.run as ig.system.sound.context.offset = ...
    'v1.0.0-10': 'ke',
    'v1.0.1-1': 'le',
    'v1.0.2-2': 'me',
});


// impact.base.system.web-audio
export const WebAudio = def({
    // this is the class of system.sound.context
    offset: {
        // used in System.run as ig.system.sound.context.offset = ...
        'v1.0.0-10': '$ua',
        'v1.0.1-1': 'ova',
        'v1.0.2-2': 'uva',
    },
});


// impact.base.timer
export const Timer = def({
    // sole class in this module
    // step is called in first step System.run
    'v1.0.0-10': 'jl',
    'v1.0.1-1': 'ml',
    'v1.0.2-2': 'ml',
    tick: {
        // returns difference of time and last, and sets last to time
        // called in second step of System.run
        'v1.0.0-10': 'ja',
        'v1.0.1-1': 'ja',
        'v1.0.2-2': 'ja',
    },
});


// impact.feature.gamepad.gamepad
export const Gamepads = def({
    // class with name in constructor
    plugins: {
        // derived from a module local list in the constructor
        'v1.0.0-10': 'Jda',
        'v1.0.1-1': 'aea',
        'v1.0.2-2': 'iea',
    },
    gamepads: {
        // passed to the plugins in an update function
        'v1.0.0-10': 'JEa',
        'v1.0.1-1': 'YEa',
        'v1.0.2-2': 'bFa',
    },
});
export const Gamepad = def({
    // class with a bunch of arrays
    // see impact.feature.gamepad.html5-gamepad for where easy to identify usages
    'v1.0.0-10': 'bRa',
    'v1.0.1-1': 'qRa',
    'v1.0.2-2': 'vRa',
    buttonThresholds: {
        // first value accessed in setButton, defaults to 0.5
        // assigned to with 30/255
        'v1.0.0-10': 'm3',
        'v1.0.1-1': 's3',
        'v1.0.2-2': 'z3',
    },
    axisThresholds: {
        // accessed in axis getters in Gamepads, defaults to 0.1
        // assigned to with 7849/32767 and 8689/32767
        'v1.0.0-10': 'bJ',
        'v1.0.1-1': 'iJ',
        'v1.0.2-2': 'kJ',
    },
    setButton: {
        // function that sets the buttonValues, buttonPressed, and buttonReleased arrays
        // called with a value from a buttons field
        'v1.0.0-10': 'HOa',
        'v1.0.1-1': 'UOa',
        'v1.0.2-2': 'ZOa',
    },
    setAxis: {
        // just wraps setting of the axisValues array
        // called with a value from an axes field
        'v1.0.0-10': 'Cia',
        'v1.0.1-1': 'Uia',
        'v1.0.2-2': 'cja',
    },
});
export const gamepads = def({
    // singleton instance of Gamepads
    'v1.0.0-10': 'Xc',
    'v1.0.1-1': 'Yc',
    'v1.0.2-2': 'Yc',
});


// impact.feature.storage.storage
export const SaveSlot = def({
    // has src and data fields
    'v1.0.0-10': 'T1',
    'v1.0.1-1': 'a2',
    'v1.0.2-2': 'h2',
});
export const StorageListener = def({
    // pseudo interface
    apply: {
        // the only time ig.storage.globals is used is as an argument to this function
        // this is not called from Storage, its just that all callers use the same function name
        // and register themselves to get the update callback
        // modifies listener
        'v1.0.0-10': 'NJa',
        'v1.0.1-1': 'aKa',
        'v1.0.2-2': 'eKa',
    },
    update: {
        // called from Storage.writeToDisk to fill out a new object
        // modifies globals
        'v1.0.0-10': 'OJa',
        'v1.0.1-1': 'bKa',
        'v1.0.2-2': 'fKa',
    },
});
export const Storage = def({
    // class name in constructor
    lastSlot: {
        // derived from this.data.data.lastSlot in constructor
        'v1.0.0-10': 'cK',
        'v1.0.1-1': 'kK',
        'v1.0.2-2': 'mK',
    },
    autoSlot: {
        // derived from this.data.data.autoSlot in constructor
        'v1.0.0-10': 'kt',
        'v1.0.1-1': 'lt',
        'v1.0.2-2': 'qt',
    },
    slots: {
        // derived from this.data.data.slots in constructor
        'v1.0.0-10': 'kg',
        'v1.0.1-1': 'ng',
        'v1.0.2-2': 'ng',
    },
    globals: {
        // derived from this.data.data.globals in constructor
        'v1.0.0-10': 'GFa',
        'v1.0.1-1': 'VFa',
        'v1.0.2-2': 'ZFa',
    },
    listeners: {
        // the other array field (not slots)
        'v1.0.0-10': 'Op',
        'v1.0.1-1': 'Op',
        'v1.0.2-2': 'Up',
    },
    writeToDisk: {
        // calls this.data.save
        'v1.0.0-10': 'xaa',
        'v1.0.1-1': 'Maa',
        'v1.0.2-2': 'Taa',
    },
    getSlotSrc: {
        // get data from slot a, merges with b, and encrypts
        'v1.0.0-10': 'G2a',
        'v1.0.1-1': 'c3a',
        'v1.0.2-2': 'h3a',
    },
});
export const storage = def({
    // single instance of Storage
    'v1.0.0-10': 'zd',
    'v1.0.1-1': 'zd',
    'v1.0.2-2': 'yd',
});
export const CryptUtils = def({
    // utils for encrypting and decrypting
    'v1.0.0-10': '$P',
    'v1.0.1-1': 'hQ',
    'v1.0.2-2': 'jQ',
    decrypt: {
        // wrapper for JSON.parse(AES.decrypt(a))
        'v1.0.0-10': 'Wwb',
        'v1.0.1-1': 'Dxb',
        'v1.0.2-2': 'Lxb',
    },
    encrypt: {
        // wrapper for AES.encrypt(JSON.stringify(a))
        'v1.0.0-10': 'i0a',
        'v1.0.1-1': 'C0a',
        'v1.0.2-2': 'H0a',
    },
});
