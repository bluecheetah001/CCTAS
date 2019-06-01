import * as reload from '../../utils/reload.js';
import {traceValue} from '../../patches/trace.js';


// TODO trace should not be in save state
sc.CommonEvents.inject({
    processEvent(type, data) {
        traceValue(type);
        return parent(type, data);
    },
});

// TODO has not been tested when there are active events

function serialize(hint) {
    if(hint === reload.RESTART) return undefined;

    if(sc.commonEvents.delayedTriggerStack.length) console.log('created savestate while there are common events');

    return {
        delay: sc.commonEvents.delayedTriggerTimer,
        events: ig.copy(sc.commonEvents.delayedTriggerStack), // only needs to be a shallow copy?
    };
}

function deserialize(data) {
    if(data === undefined) return;

    sc.commonEvents.delayedTriggerTimer = data.delay;
    sc.commonEvents.delayedTriggerStack.length = 0;
    data.events.forEach((type) => sc.commonEvents.delayedTriggerStack.push(type));
}

reload.serde('common-events', serialize, deserialize);
