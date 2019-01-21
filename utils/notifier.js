export default class Notifier {
    constructor() {
        this._listeners = [];
    }
    add(listener) {
        this._listeners.push(listener);
    }
    remove(listener) {
        for(var i=0; i<this._listeners.length; i++) {
            if(this._listeners[i] === listener) {
                this._listeners.splice(i, 1);
                break;
            }
        }
    }
    fire() {
        for(var listener of this._listeners) {
            listener();
        }
    }
}
