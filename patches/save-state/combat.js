import * as reload from '../../utils/reload.js';

// TODO this will need to be looked at again when loading a save (probably dont need to do save state?)
// TODO have not tested with combat active during serialize

let deserializing = false;

sc.GameModel.inject({
    setCombatMode(active, force) {
        if(!deserializing) {
            this.parent(active, force);
        }
    },
    // TODO this is kinda awkward, probably will want to not abuse the save system like this in the future
    // (only 17 total implementations)
    onStoragePostLoad(save) {
        if(deserializing) {
            deserializing = false;
            // every map transition will end up calling setCombatMode(false) if combat mode was active
            // I'm not sure if this calls it at the correct time (normally would happen while killing entities?)
            this.setCombatMode(false);

            // load player state from save like normal
            // have not looked into if there is any state in player that needs to be loaded from stave state
            this.player.postLoad(save.player);
        } else {
            this.parent(save);
        }
    },
});

function serialize(hint) {
    if(hint === reload.RESTART) return undefined;

    return {
        active: sc.model.combatMode,
        forced: sc.model.forceCombatMode,
        streakTime: sc.model.inCombatTime,
        cooldownTime: sc.model.combatTimer,
        rank: sc.model.combatRank,
        prevRank: sc.combat.stats.prevRank,
        killStreak: sc.combat.stats.killStreak,
        killedEnemies: ig.copy(sc.combat.stats.killedEnemies),
    };
}

function deserialize(data) {
    if(data === undefined) return;

    deserializing = true;

    sc.model.combatMode = data.active;
    sc.model.forceCombatMode = data.forced;
    sc.model.inCombatTime = data.streakTime;
    sc.model.combatTimer = data.cooldownTime;
    sc.model.combatRank = data.rank;
    sc.combat.stats.prevRank = data.prevRank;
    sc.combat.stats.killStreak = data.killStreak;
    sc.combat.stats.killedEnemies.length = 0;
    data.killedEnemies.forEach((type) => sc.combat.stats.killedEnemies.push(type));

    // update gui by sending it the combat mode changed event
    // which conveniently ignores the event data for how combat changed
    for(const hook of ig.gui.guiHooks) {
        if(hook.gui instanceof sc.CombatHudGui) {
            hook.gui.modelChanged(sc.model, sc.GAME_MODEL_MSG.COMBAT_MODE_CHANGED);
            break;
        }
    }
}

reload.serde('combat', serialize, deserialize);
