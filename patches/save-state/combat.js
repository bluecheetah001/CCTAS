import * as reload from '../../utils/reload.js';

// fields
// sc.q = new sc.w9
//   VZa - combat mode
//   KJ - force combat mode
//   cea - streak time
//   qJ - cooldown time
//   IM - rank
// sc.Ta = new sc.Ofb
//   pa.L5 - killed enemies count
//   pa.lZ - killed enemy types
//   pa.Usa - prev combat rank

// events
// sc.zf.e9 - combat mode changed
//   true - enter combat
//   undefined - toggle cooldown
//   false - leave cooldown

// TODO this will need to be looked at again when loading a save (probably dont need to do save state?)
// TODO have not tested with combat active during serialize

let deserializing = false;

const origSetCombatMode = sc.q.zU.bind(sc.q);
sc.q.zU = function setCombatMode(active, force) {
    if(!deserializing) {
        // dont let cleanup events accidentally put us back into combat mode
        // the only event that should fire will be fired during postSaveLoad if necessary
        origSetCombatMode(active, force);
    }
};

const origPostSaveLoad = sc.q.PJa.bind(sc.q);
sc.q.PJa = function postSaveLoad(save) {
    if(deserializing) {
        deserializing = false;
        // every map transition will end up calling setCombatMode(false) if combat mode was active
        // I'm not sure if this calls it at the correct time (normally would happen while killing entities?)
        origSetCombatMode(false);

        // load player state from save like normal
        // have not looked into if there is any state in player that needs to be loaded from stave state
        this.T.UHb(save.player);
    } else {
        origPostSaveLoad(save);
    }
};

function serialize(hint) {
    if(hint === reload.RESTART) return undefined;

    return {
        active: sc.q.VZa,
        forced: sc.q.KJ,
        streakTime: sc.q.cea,
        cooldownTime: sc.q.qJ,
        rank: sc.q.IM,
        prevRank: sc.Ta.pa.Usa,
        killCount: sc.Ta.pa.L5,
        typesKilled: ig.copy(sc.Ta.pa.lZ),
    };
}

function deserialize(data) {
    if(data === undefined) return;

    deserializing = true;

    sc.q.VZa = data.active;
    sc.q.KJ = data.forced;
    sc.q.cda = data.streakTime;
    sc.q.qJ = data.cooldownTime;
    sc.q.IM = data.rank;
    sc.Ta.pa.Usa = data.prevRank;
    sc.Ta.pa.L5 = data.killCount;
    sc.Ta.pa.lZ.length = 0;
    data.typesKilled.forEach((type) => sc.Ta.pa.lZ.push(type));

    // update gui by sending it the combat mode changed event
    // which conveniently ignores the event data for how combat changed
    for(const elem of ig.X.sD) {
        if(elem.X instanceof sc.Pfb) {
            elem.X.Ab(sc.q, sc.zf.e9);
            break;
        }
    }
}

reload.serde('combat', serialize, deserialize);
