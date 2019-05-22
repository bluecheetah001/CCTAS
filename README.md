# Tool Assisted Speedrun (TAS) Mod for Cross Code

## Install

Install [CCLoader](...)

[Download Zip](...) and unzip into the CCLoader mods folder

## Config Foramt

`config.json` is a json file used to store the mods global configuration.

The file has the following fields and default values:
* `"movie": ""` path to a movie file to use (either .json or .zip) see [Movie Format](#movie-format)
* `"mode": "record"` sets the initial operating mode
** `"record"` all game inputs are recorded and will be saved to the movie file
** `"playback"` all game input is disabled and the movie file is played, (tas inputs like speed or menu still work)
* `"speed": 1` sets the speed of the game, can be fractional
* `"paused": true` starts the tas paused if true
* `"useKeyboardMouse": false` sets if the mouse should be controled by the keyboard
* `"menu": {}` key bindings for the tas menu
** `"closeMenu": "F1"` close the tas menu and return to the game
** `"up": "W,UP"` move selection up
** `"down": "S,DOWN"` move the selection down
** `"left": "A,LEFT"` move the selection left
** `"right": "D,RIGHT"` move the selection right
** `"select": "ENTER,MOUSE_LEFT"` interact with the selection
** `"back": "ESC,BACKSPACE"` leave the current menu or selection
** `"tabLeft": "Q,SHIFT TAB"` cycle menu tabs left
** `"tabRight": "E,TAB"` cycle menu tabs right
* `"game": {}` key bindings for the game
** `"openMenu": "F1"` pause the game and open the tas menu
** `"speedUp": "ADD"` increase the game speed
** `"speedDown": "SUBTRACT"` decrease the game speed
** `"pause": "DECIMAL"` pause or unpause the game
** `"step": "NUMPAD_0"` advance the game 1 frame
** `"keyboardMouse": "M"` toggle moving the game cursor with keyboard or system mouse
** `"mouseMoveSpeed": 1` sets the speed of keyboard mouse movements, can be fractional
** `"mouseUp": "UP"` move the mouse up
** `"mouseDown": "DOWN"` move the mouse down
** `"mouseLeft": "LEFT"` move the mouse left
** `"mouseRight": "RIGHT"` move the mouse right
** `"toggle": "CTRL"` modifier for game inputs to toggle between pressed and released
** `"pressAndRelease": "ALT"` modifier for game keys to press and release it that frame, this is only intended for frame advance mode
** `<any game key>: <the same key>` game keys are bound to themselves by default but they can be rebound, for example remapping the mouse buttons onto the keyboard

## Inputs

For a list of named inputs see [inputs.json](...).
Inputs with regex `(KEYBOARD|MOUSE)_[0-9]+` identify a key based on its source and numerical identifier.

The cofig file has a number of key binding fields, these are a comma separated list of keys with optional modifiers.
Key modifiers are specified by a list of keys joined with spaces.
For example:
* `"action": "A"` will bind the action to pressing `A`
* `"action": "A,B"` will bind the action to pressing `A` or pressing `B`
* `"action": "SHIFT A,B"` will bind the action to pressing `A` while `SHIFT` is held or pressing `B` by itself
* `"action": ""` will the the action unbound

## Movie Format

TAS movies are json files but they can be read and saved in a zip file containing a single file that is the original json file since an hour long movie can easily be over 10 Mb.
The file must have the standard .json or .zip extension, though a naming convention like name.cc.tas.json could be useful.

Hand editing this file is generally not useful, and is mostly just here as a reference for development

The file has the following fields:
* `"versions"` a map from mod name to version of the mod, having a game or mod at the wrong version can easily lead to a desync and will cause a warning to popup.
Some mods can be ignored (eg most utility and graphical mods), see [compatability.json](...) for a list of such mods. `"crosscode"` is for the game's version.
* `"cc.save"` replaces the game's save file in memory, the game's save file on disk is never modified while the TAS mod is active.
most TASes will want to use a minimal save that only has global settings.
** The settings 'Video>Disaply Type', 'Video>Enable Fullscreen', 'Video>Pixel Size', 'General>Music Volume', and 'General>Sound Volume'
are not modified when replacing the game's save file for consistency when sharing movie files.
* `"rngState"` the initial state of the deterministic rng
* `"inputs"` an array with the input for each frame. 0 valued inputs should be excluded from the listed input fields. some examples are:
** `"A":1` indicates that the `A` key should be held for this frame
** `"A":.5` indicates that the `A` key should be pressed and released for this frame.
This can only be applied to keyboard and mouse button inputs, as they are handled differently than gamepad inputs
** `"MOUSE_X":123` indicates the x position of the mouse in game pixels, and can be fractional
* `"saveStates"` an array of objects with input fields with numerical values.
** `"frame"` the frame to start input from
** `"cc.save"` the game's save file
** `"rngState"` the rng state
** TODO current room, the location/state of every entitiy, the state of every level and global variable, gui popups...
Timers may be annoying to restore and probably indicates that absolute time (not just frame index) needs to be restored when loading a save state
** TODO mods
