// patch the main loop to fix aparent frame rate and allow frame advance
// intercept user inputs for consumption by this mod (userInputs)
// injects user inputs for the game and other mods (gameInputs)

import * as keys from '../utils/keys.js';


//
// utils
//

const gameDiv = document.getElementById("game");
const gameCanvas = document.getElementById("canvas");
const fullWidth = "Vta";
const fullHeight = "ZLa";

function clamp(value, min, max) {
    return Math.max(Math.min(value, max), min);
}

function clientToGame_x(x) {
    var c = gameCanvas;
    while(c) {
        x -= c.offsetLeft;
        c = c.offsetParent;
    }
    return clamp(x * ig.system.width / ig.system[fullWidth], 0, ig.system.width);
}
function clientToGame_y(y) {
    var c = gameCanvas;
    while(c) {
        y -= c.offsetTop;
        c = c.offsetParent;
    }
    return clamp(y * ig.system.height / ig.system[fullHeight], 0, ig.system.height);
}

function gameToClient_x(x) {
    x = x * ig.system[fullWidth] / ig.system.width;
    var c = gameCanvas;
    while(c) {
        x += c.offsetLeft;
        c = c.offsetParent;
    }
    return x;
}
function gameToClient_y(y) {
    y = y * ig.system[fullHeight] / ig.system.height;
    var c = gameCanvas;
    while(c) {
        y += c.offsetTop;
        c = c.offsetParent;
    }
    return y;
}


//
// intercept events
//

export var userInputs = new keys.Input();

// this wont intercept events for rebinding keys (not that a TAS would want to rebind keys)
// but it also wont intercept events for mods that explicitly call *.addEventListener
function interceptEvents(source, type, handle) {
    source.addEventListener(type, (e) => {
        if(e.isTrusted) {
            // stop user inputs from propagating anywhere outside TAS UI
            handle(e);
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
        // otherwise let events propagate into the game
    }, true);
}
function interceptFocusedEvents(source, type, handle) {
    source.addEventListener(type, (e) => {
        if(e.isTrusted) {
            // stop user inputs from propagating anywhere outside TAS UI
            if(document.hasFocus()) {
                handle(e)
                e.preventDefault();
                e.stopPropagation();
            }
            e.stopImmediatePropagation();
        }
        // otherwise let events propagate into the game
    }, true);
}
function mouseMoved(e) {
    userInputs.set(keys.MOUSE_X, clientToGame_x(e.clientX));
    userInputs.set(keys.MOUSE_Y, clientToGame_y(e.clientY));
}
function touchMoved(e) {
    userInputs.set(keys.MOUSE_X, clientToGame_x(e.touches[0].clientX));
    userInputs.set(keys.MOUSE_Y, clientToGame_y(e.touches[0].clientY));
}
interceptEvents(window, "keydown", (e) => {
    userInputs.press(keys.getKeyboardKey(e.keyCode));
});
interceptEvents(window, "keyup", (e) => {
    userInputs.release(keys.getKeyboardKey(e.keyCode));
});
interceptFocusedEvents(gameDiv, "mousedown", (e) => {
    mouseMoved(e);
    userInputs.press(keys.getMouseKey(e.button));
});
interceptFocusedEvents(window, "mouseup", (e) => {
    mouseMoved(e);
    userInputs.release(keys.getMouseKey(e.button));
});
interceptEvents(window, "mousewheel", (e) => {
    mouseMoved(e);
    userInputs.set(keys.WHEEL_X, e.deltaX);
    userInputs.set(keys.WHEEL_Y, e.deltaY);
});
interceptEvents(window, "DOMMouseScroll", (e) => {
    mosueMoved(e);
    userInput.set(keys.WHEEL_Y, -e.detail);
});
interceptEvents(document, "mousemove", mouseMoved);
interceptEvents(gameDiv, "touchstart", (e) => {
    touchMoved(e);
    userInputs.press(keys.getMouseKey(0));
});
interceptEvents(gameDiv, "touchend", (e) => {
    touchMoved(e);
    userInputs.release(keys.getMouseKey(0));
});
interceptEvents(gameDiv, "touchmove", touchMoved);
interceptEvents(window, "blur", (e) => {
    userInputs.releaseAll();
});
// not useful for TASing or the game
interceptEvents(document, "mouseout", (e) => {});
interceptEvents(document, "focus", (e) => {});


//
// poll gamepads
//

// hardcoded keys to avoid issues with disconnecting
const numGamepadAxes = 4;
const numGamepadButtons = 16;
var gamepadKeys = [];
for(var i = 0; i<numGamepadAxes; i++){
    gamepadKeys.push(keys.getGamepadAxis(i));
}
for(var i = 0; i<numGamepadButtons; i++){
    gamepadKeys.push(keys.getGamepadButton(i));
}

function getGamepadKey(gamepad, key) {
    if(key.isGamepadButton) {
        return gamepad.buttons[key.code].value;
    } else {
        return gamepad.axes[key.code];
    }
}

function pollGamepads() {
    var connected = []
    for(var gamepad of navigator.getGamepads()) {
        if(gamepad && gamepad.connected) {
            connected.push(gamepad);
        }
    }
    for(const key of gamepadKeys) {
        var max = 0;
        var absMax = 0;
        for(var gamepad of connected) {
            var val = getGamepadKey(gamepad, key);
            var absVal = Math.abs(val);
            if(absVal > absMax) {
                max = val;
                absMax = absVal;
            }
        }
        userInputs.set(key, max);
    }
}


//
// patch main loop
//

const run = "ya";
const Timer = "ml";
const timerTick = "ja";
const systemTimer = "j_a";
const systemTick = "jz";
const systemTickPause = "Sa";
const systemTickScale = "ja";
const isPaused = "dea";
const gameTimeScale = "gm";
const fastForward = "Wn";
const sound = "le";
const offsetTime = "ova";

const erase = "ze"; // TODO move to a util (possibly by copying the implementation)

const FPS = 60;
const MAX_UPDATE_TIME = 1/15;

export var frameCount = 0;
export var framesPerUpdate = 0;
export var pauseOnFrame = 0;
var framesToRun = 0;

function setFrameCount(count) {
    frameCount = count;
    return ig[Timer].time = count / FPS;
}
export function setFramesPerUpdate(count) {
    framesPerUpdate = count;
    framesToRun = 0;
}
export function pauseOn(frame) {
    pauseOnFrame = frame;
}
export function pause(offset=0) {
    pauseOnFrame = frameCount+offset;
}
export function unpause() {
    pauseOnFrame = Infinity;
}

// TODO notifier library to make this look nicer
var preUpdate = [];
export function addPreUpdate(handler) {
    preUpdate.push(handler);
}
export function removePreUpdate(handler) {
    preUpdate[erase](handler);
}
function firePreUpdate() {
    preUpdate.forEach(h=>h());
}

var postFrame = [];
export function addPostFrame(handler) {
    postFrame.push(handler);
}
export function removePostFrame(handler) {
    postFrame[erase](handler);
}
function firePostFrame() {
    postFrame.forEach(h=>h());
}

var postUpdate = [];
export function addPostUpdate(handler) {
    postUpdate.push(handler);
}
export function removePostUpdate(handler) {
    postUpdate[erase](handler);
}
export function firePostUpdate() {
    postUpdate.forEach(h=>h());
}

function update() {
    try {
        var start = Date.now();
        
        pollGamepads();
        
        firePreUpdate();
        
        // TODO handle loading frames
        // so that we can properly only increment the frame count once (or some fixed amount of times) when loading
        // making sure that save warp logic works
        
        if(framesPerUpdate > 0) {
            if(framesToRun >= 1) {
                framesToRun = framesPerUpdate;
            } else {
                framesToRun += framesPerUpdate;
            }
        }
        
        while(framesToRun > 0 && frameCount < pauseOnFrame ) {
            checkGlobalState();
            
            injectInputs();
            
            // update time
            setFrameCount(frameCount + 1);
            framesToRun -= 1;
            ig.system[systemTick] = ig.system[systemTimer][timerTick](); // *ig.system.Ddb;
            ig.system[systemTickPause] = ig.system[isPaused]() ? 0 : ig.system[systemTick];
            ig.system[systemTickScale] = ig.system[systemTickPause] * ig.system[gameTimeScale];
            if(ig.system[fastForward]) {
                ig.system[systemTickPause] *= 8;
                ig.system[systemTickScale] *= 8;
            }
            // supposedly this could be non-zero, but im not sure what circumstances that would actually happen in
            // perhaps when sound is paused, but when the sound is resumed it will get set back to 0 anyway
            // if sound is ever patched then this will probably be obsolete or make more sense
            ig[sound].context[offsetTime] = 0;
            
            // update the game
            // this ends up drawing multiple times when fastforwarding...
            ig.system.delegate[run]();
            
            firePostFrame();
            
            if((Date.now() - start) < MAX_UPDATE_TIME) break;
        }
        
        firePostUpdate();
        
        userInputs.update();
        userInputs.release(keys.WHEEL_X);
        userInputs.release(keys.WHEEL_Y);
        
        
        window.requestAnimationFrame(update);
    } catch(e) {
        ig.system.error(e);
    }
}
ig.system[run] = function() {
    // on first intercepted frame we need to reset time to 0, to keep exact times consistent
    var time = setFrameCount(0);
    ig.system[systemTimer].last = time;
    
    update();
}

//
// inject inputs
//

const disableMouse = "n5a";
const mousePos = "l6a";
const mouseOut = "LIa";
const lockedActions = "iIa";
const pressedActions = "Oga";
const downActions = "Pg";
const upActions = "Wea";
const releasedActions = "VX";
const gamepads = "Yc";
const gamepadObjects = "YEa";
const gamepadPlugins = "aea";
const Gamepad = "qRa";
const buttonThresholds = "s3";
const axisThresholds = "iJ";
const setButton = "UOa";
const setAxis = "Uia";

// allow injects while not in focus
ig.input[disableMouse] = function() {
    return false;
};

// clear any inputs that might be pressed during startup
ig.input[mousePos].x = gameToClient_x(0);
ig.input[mousePos].y = gameToClient_y(0);
ig.input[mouseOut] = false;
ig.input[lockedActions] = {};
ig.input[pressedActions] = {};
ig.input[releasedActions] = [];
ig.input[downActions] = {};
ig.input[upActions] = {};

// these get set every frame, so i dont think they need to be fixed
// ig.input.Kd = true; // something about using mouse input
// ig.input.rb = null; // something about last input source

// inject custom gamepad object
var fakeGamepad = new ig[Gamepad]();
fakeGamepad.buttonsToSet = [];
fakeGamepad.axesToSet = [];
fakeGamepad[buttonThresholds][6] = 30 / 255; // Left Trigger
fakeGamepad[buttonThresholds][7] = 30 / 255; // Right Trigger
fakeGamepad[axisThresholds][0] = 7849 / 32767; // Left Stick X
fakeGamepad[axisThresholds][1] = 7849 / 32767; // Left Stick Y
fakeGamepad[axisThresholds][2] = 8689 / 32767; // Right Stick X
fakeGamepad[axisThresholds][3] = 8689 / 32767; // Right Stick Y
ig[gamepads][gamepadObjects] = {"html5Pad0": fakeGamepad}; // id does not matter, just reusing the default id
// replace gamepad plugins 
ig[gamepads][gamepadPlugins] = [{"update": (gamepadObjects) => {
    for(var i=0;i<fakeGamepad.buttonsToSet.length; i++) {
        fakeGamepad[setButton](i, fakeGamepad.buttonsToSet[i]);
    }
    for(var i=0;i<fakeGamepad.axesToSet.length; i++) {
        fakeGamepad[setAxis](i, fakeGamepad.axesToSet[i]);
    }
}}];

export var gameInputs = new keys.Input();

function injectInputs() {
   var clientX = gameToClient_x(gameInputs.get(keys.MOUSE_X));
   var clientY = gameToClient_y(gameInputs.get(keys.MOUSE_Y));
   document.dispatchEvent(new MouseEvent("mousemove", {clientX:clientX, clientY:clientY}));
   for(const [key, value] of gameInputs.entries()) {
       switch(key.source) {
           case keys.INTERNAL:
               switch(key.code) {
                   case keys.MOUSE_X_CODE:
                   case keys.MOUSE_Y_CODE:
                       // already handled
                       break;
                   case keys.WHEEL_Y_CODE:
                       if(value === 0) {
                           // nothing
                       } else {
                           document.dispatchEvent(new WheelEvent("mousewheel", {clientX:clientX, clientY:clientY, deltaY:deltaY}));
                       }
                       break;
                   case keys.WHEEL_X_CODE:
                       // nothing, game does not use wheel x
                       break;
                   default:
                       console.warn("Attempting to inject unknown key "+key);
                       break;
               }
               break;
           case keys.KEYBOARD:
               if(gameInputs.isPressed(key)) {
                   window.dispatchEvent(new KeyboardEvent("keydown", {keyCode:key.code}));
               }
               if(gameInputs.isReleased(key)) {
                   window.dispatchEvent(new KeyboardEvent("keyup", {keyCode:key.code}));
               }
               break;
           case keys.MOUSE:
               if(gameInputs.isPressed(key)) {
                   gameDiv.dispatchEvent(new MouseEvent("mousedown", {clientX:clientX, clientY:clientY, button:key.code}));
               }
               if(gameInputs.isReleased(key)) {
                   window.dispatchEvent(new MouseEvent("mouseup", {clientX:clientX, clientY:clientY, button:key.code}));
               }
               break;
           case keys.GAMEPAD_BUTTON:
               fakeGamepad.buttonsToSet[key.code] = value;
               break;
           case keys.GAMEPAD_AXIS:
               fakeGamepad.axesToSet[key.code] = value;
               break;
           default:
               console.warn("Attempting to inject unknown key "+key);
               break;
       }
   }
    // not useful for TASing:
    // mouseout - clears cursor style
    // blur - releases every key, pauses the game if not IG_KEEP_WINDOW_FOCUS
    // focus - unpauses the game if not IG_KEEP_WINDOW_FOCUS
    // touch* - equivalent to mouse*
    
    gameInputs.update();
}


// NOTE: the TAS could support some of these, but they would have to get restored when loading a save state
// TODO find more globals
// ig.Yf is a global config object, validate it?
function checkGlobalState() {
    if(1 !== ig.system.Azb) throw new Error("frame skip was modified");
    if(60 !== ig.system.Zoa) throw new Error("frame rate was modified");
    if(1 !== ig[Timer].N8) throw new Error("global time scale was modified");
    if(1 !== ig.system.Ddb) throw new Error("game time scale was modified");
    if(null !== ig.system.Nra) throw new Error("game class was modified");
    if(expectedDelegate !== ig.system.delegate) throw new Error("game object was modified");
}
var expectedDelegate = ig.system.delegate;
if(0 !== ig.system.Z4a) throw new Error("initialization did not use requestAnimationFrame");
