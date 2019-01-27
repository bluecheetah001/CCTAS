// util to ease recovering state across reloading

// right now I am just dumping data to localStorage for simplicity
// but if that is ever an issue then it should be pretty simple to move to making a save file

var serializers = {};
var deserializers = {};


var cmd = "reload_runtime";
export function setReloadCmd(cmd_) {
    switch(cmd_) {
        case "refreshPage":
        case "reloadRuntime":
            // always ok
            break;
        case "newProcess":
            if(getNewProcessCmd() === null){
                alert('reloadCmd "newProcess" has not been configured for '+process.platform+' systems yet, falling back to "reloadRuntime"');
                cmd_ = "reload_runtime";
            }
            break;
        default:
            alert('Unknown reloadCmd '+JSON.stringify(cmd_)+', falling back to "reloadRuntime"');
            cmd_ = "reloadRuntime";
            break;
    }
    cmd = cmd_;
}
export function getReloadCmd(type) {
    return cmd;
}

function execAndQuit(cmd) {
    require('child_process').exec(cmd).unref();
    nw.App.quit();
}

function getNewProcessCmd() {
    switch(process.platform) {
        case "win32":
            return "timeout /t 2 & CrossCode.exe";
        default:
            return null;
    }
}

export function hardReload() {
    switch(cmd) {
        case "refreshPage":
            // keep the game in the same window, but requires user interaction and leaks memory
            location.reload();
            break;
        case "reloadRuntime":
            // fastest, but leaks memory
            chrome.runtime.reload();
            break;
        case "newProcess":
            // does not leak memory, but slower
            execAndQuit(getNewProcessCmd());
            break;
    }
}

export function reload() {
    var state = {}
    for(var key in serializers) {
        state[key] = serializers[key]();
    }
    localStorage.tas = JSON.stringify(state);
    hardReload();
}

export function recover() {
    if(localStorage.tas) {
        var state = JSON.parse(localStorage.tas);
        delete localStorage.tas;
        for(var key in deserializers) {
            deserializers[key](state[key]);
        }
        return true;
    } else {
        return false;
    }
}

export function serde(key, serializer, deserializer) {
    if(key in serializers) {
        throw new Error("Reload key "+key+" is already taken");
    }
    serializers[key] = serializer;
    deserializers[key] = deserializer;
}
