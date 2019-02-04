import * as keys from '../utils/keys.js';

import {
    System,
    Input,
    Gamepads,
    Gamepad,
    gamepads
} from '../utils/defs.js';


//
// utils
//

const gameDiv = document.getElementById("game");
const gameCanvas = document.getElementById("canvas");

function clamp(value, min, max) {
    return Math.max(Math.min(value, max), min);
}

function clientToGame_x(x) {
    var c = gameCanvas;
    while(c) {
        x -= c.offsetLeft;
        c = c.offsetParent;
    }
    return clamp(x * ig.system.width / ig.system[System.canvasWidth], 0, ig.system.width);
}
function clientToGame_y(y) {
    var c = gameCanvas;
    while(c) {
        y -= c.offsetTop;
        c = c.offsetParent;
    }
    return clamp(y * ig.system.height / ig.system[System.canvasHeight], 0, ig.system.height);
}

function gameToClient_x(x) {
    x = x * ig.system[System.canvasWidth] / ig.system.width;
    var c = gameCanvas;
    while(c) {
        x += c.offsetLeft;
        c = c.offsetParent;
    }
    return x;
}
function gameToClient_y(y) {
    y = y * ig.system[System.canvasHeight] / ig.system.height;
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

export var user = new keys.Input();

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
    user.set(keys.MOUSE_X, clientToGame_x(e.clientX));
    user.set(keys.MOUSE_Y, clientToGame_y(e.clientY));
}
function touchMoved(e) {
    user.set(keys.MOUSE_X, clientToGame_x(e.touches[0].clientX));
    user.set(keys.MOUSE_Y, clientToGame_y(e.touches[0].clientY));
}
interceptEvents(window, "keydown", (e) => {
    user.press(keys.getKeyboardKey(e.keyCode));
});
interceptEvents(window, "keyup", (e) => {
    user.release(keys.getKeyboardKey(e.keyCode));
});
interceptFocusedEvents(gameDiv, "mousedown", (e) => {
    mouseMoved(e);
    user.press(keys.getMouseKey(e.button));
});
interceptFocusedEvents(window, "mouseup", (e) => {
    mouseMoved(e);
    user.release(keys.getMouseKey(e.button));
});
interceptEvents(window, "mousewheel", (e) => {
    mouseMoved(e);
    user.set(keys.WHEEL_X, e.deltaX);
    user.set(keys.WHEEL_Y, e.deltaY);
});
interceptEvents(window, "DOMMouseScroll", (e) => {
    mosueMoved(e);
    userInput.set(keys.WHEEL_Y, -e.detail);
});
interceptEvents(document, "mousemove", mouseMoved);
interceptEvents(gameDiv, "touchstart", (e) => {
    touchMoved(e);
    user.press(keys.getMouseKey(0));
});
interceptEvents(gameDiv, "touchend", (e) => {
    touchMoved(e);
    user.release(keys.getMouseKey(0));
});
interceptEvents(gameDiv, "touchmove", touchMoved);
interceptEvents(window, "blur", (e) => {
    user.releaseAll();
});
// not useful for TASing or the game
interceptEvents(document, "mouseout", (e) => {});
interceptEvents(window, "focus", (e) => {});


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

export function pollGamepads() {
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
        user.set(key, max);
    }
}


//
// inject inputs
//

// allow injects while not in focus
ig.input[Input.isFocusLost] = function() {
    return false;
};

// clear any inputs that might be pressed during startup
ig.input[Input.lastMouse].x = gameToClient_x(0);
ig.input[Input.lastMouse].y = gameToClient_y(0);
if(Input.mouseOut.exists) ig.input[Input.mouseOut] = false;
ig.input[Input.locked] = {};
ig.input[Input.pressed] = {};
ig.input[Input.down] = {};
ig.input[Input.up] = {};
ig.input[Input.released] = [];

// inject custom gamepad object
var fakeGamepad = new ig[Gamepad]();
var buttonsToSet = [];
var axesToSet = [];
fakeGamepad[Gamepad.buttonThresholds][6] = 30 / 255; // Left Trigger
fakeGamepad[Gamepad.buttonThresholds][7] = 30 / 255; // Right Trigger
fakeGamepad[Gamepad.axisThresholds][0] = 7849 / 32767; // Left Stick X
fakeGamepad[Gamepad.axisThresholds][1] = 7849 / 32767; // Left Stick Y
fakeGamepad[Gamepad.axisThresholds][2] = 8689 / 32767; // Right Stick X
fakeGamepad[Gamepad.axisThresholds][3] = 8689 / 32767; // Right Stick Y
ig[gamepads][Gamepads.gamepads] = {"html5Pad0": fakeGamepad}; // id does not matter, just reusing the default id
// replace gamepad plugins
ig[gamepads][Gamepads.plugins] = [{"update": (gamepads) => {
    for(var i=0;i<buttonsToSet.length; i++) {
        fakeGamepad[Gamepad.setButton](i, buttonsToSet[i]);
    }
    for(var i=0;i<axesToSet.length; i++) {
        fakeGamepad[Gamepad.setAxis](i, axesToSet[i]);
    }
}}];

export var game = new keys.Input();

export function inject() {
    var clientX = gameToClient_x(game.get(keys.MOUSE_X));
    var clientY = gameToClient_y(game.get(keys.MOUSE_Y));
    document.dispatchEvent(new MouseEvent("mousemove", {clientX:clientX, clientY:clientY}));
    for(const [key, value] of game.entries()) {
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
                            window.dispatchEvent(new WheelEvent("mousewheel", {clientX:clientX, clientY:clientY, deltaY:value}));
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
                if(game.isPressed(key)) {
                    window.dispatchEvent(new KeyboardEvent("keydown", {keyCode:key.code}));
                }
                if(game.isReleased(key)) {
                    window.dispatchEvent(new KeyboardEvent("keyup", {keyCode:key.code}));
                }
                break;
            case keys.MOUSE:
                if(game.isPressed(key)) {
                    gameDiv.dispatchEvent(new MouseEvent("mousedown", {clientX:clientX, clientY:clientY, button:key.code}));
                }
                if(game.isReleased(key)) {
                    window.dispatchEvent(new MouseEvent("mouseup", {clientX:clientX, clientY:clientY, button:key.code}));
                }
                break;
            case keys.GAMEPAD_BUTTON:
                buttonsToSet[key.code] = value;
                break;
            case keys.GAMEPAD_AXIS:
                axesToSet[key.code] = value;
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

    game.update();
}