import * as reload from '../../utils/reload.js';
import {traceValue} from '../../patches/trace.js';

// sc.Ep.NX - delay
// sc.Ep.BR - events

const origTriggerEvent = sc.Ep.Ws.bind(sc.Ep);
sc.Ep.Ws = function processEvent(type, data) {
    traceValue(type);
    return origTriggerEvent(type, data);
};

// TODO has not been tested when there are active events

function serialize(hint) {
    if(hint === reload.RESTART) return undefined;

    if(sc.Ep.BR.length) console.log('created savestate while there are common events');

    return {
        delay: sc.Ep.NX,
        events: ig.copy(sc.Ep.BR), // only needs to be a shallow copy?
    };
}

function deserialize(data) {
    if(data === undefined) return;

    sc.Ep.NX = data.delay;
    sc.Ep.BR.length = 0;
    data.events.forEach((type) => sc.Ep.BR.push(type));
}

reload.serde('common-events', serialize, deserialize);
