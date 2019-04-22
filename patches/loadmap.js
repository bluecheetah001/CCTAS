// patch to load the map when loading a savestate

import * as reload from '../utils/reload.js';

import {
    storage,
} from '../utils/defs.js';

// TODO

// difficult to recover after the map has finished loading
// so just preemptivly serialize it before it gets overwritten
let lastTeleportConfig = null;
const origOnTeleportStart = ig.r.b8a.bind(ig.r);
ig.r.b8a = function onTeleportStart(...args) {
    lastTeleportConfig = ig.copy(this.$p);
    return origOnTeleportStart(...args);
};

function serialize(hint) {
    // no need to serialize cache when restarting
    if(hint === reload.RESTART) return undefined;
    if(hint === reload.MAIN_MENU) return undefined;

    return {
        teleportConfig: lastTeleportConfig,
        // Mf
        prevMap: ig.r.T8a,
        currMap: ig.r.uZ,
        position: ig.r.cOa,
        hint: ig[storage].b6a,
        // XHb
        cubaum: window.kib,
    };
}

function deserialize(data) {
    if(data === undefined) return;

    ig.merge(ig.r.$p, data.teleportConfig);
    ig.r.$p.Zua = 0; // only used to set overlay timer, which we want to be complete

    // ig.r.Mf
    ig.r.T8a = data.prevMap;
    ig.r.uZ = data.currMap;
    ig.r.If = data.position ? data.position.If : null;
    ig.r.cOa = data.position;
    ig.r.kia = true;
    ig.r.b8a();
    ig.r.Ix = 0;
    ig.r.vi.clearQueue();
    for(const listener of ig.r.tf.Mf) {
        listener.RJa(data.currMap, data.position, data.hint);
    }
    // ig.r.XHb
    ig.r.rla = null;
    ig.r.tR = `LOADING MAP: ${data.currMap}`;
    window.kib = data.cubaum;
    const b = data.currMap.vm(`${ig.root}data/maps/`, '.json') + ig.Kn();
    $.ajax({ // TODO verify ajax will always invoke later or add ordering to reload.serde
        dataType: 'json',
        url: ig.dpa(b),
        success: (mapData) => {
            ig.r.QHa(mapData);
            // orig also sets a value to false that is never read
        },
        error: (a, d, f) => {
            ig.system.error(new Error(`Loading of Map '${b}' failed: ${a} / ${d} / ${f}`));
        },
    });
}
function finishLoadingMap(mapData) {
}

reload.serde('map', serialize, deserialize);
