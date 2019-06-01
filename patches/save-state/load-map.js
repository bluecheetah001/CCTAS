// patch to load the map when loading a savestate

import * as reload from '../../utils/reload.js';

function serialize(hint) {
    // no need to serialize cache when restarting
    if(hint === reload.RESTART) return undefined;
    if(hint === reload.MAIN_MENU) return undefined;

    return {
        teleportColor: ig.copy(ig.game.teleportColor),
        previousMap: ig.game.previousMap,
        mapName: ig.game.mapName,
        position: ig.game.teleporting.position,
        loadHint: ig.storage.loadHint,
        cubaum: window.IS_IT_CUBAUM,
    };
}

function deserialize(data) {
    if(data === undefined) return;

    ig.merge(ig.game.teleportColor, data.teleportColor);
    ig.game.teleportColor.timeIn = 0.01; // only used to set overlay timer, which we want to complete in a single frame

    // ig.game.teleport
    ig.game.previousMap = data.previousMap;
    ig.game.mapName = data.mapName;
    ig.game.marker = data.position ? data.position.marker : null;
    ig.game.teleporting.position = data.position;
    ig.game.teleporting.active = true;
    ig.game.teleporting.timer = ig.game.onTeleportStart(data.mapName, data.position, data.loadHint);
    ig.game.events.clearQueue();
    for(const listener of ig.game.addons.teleport) {
        listener.onTeleport(data.mapName, data.position, data.loadHint);
    }
    // ig.game.preloadLevel
    ig.game.teleporting.levelData = null;
    ig.game.currentLoadingResource = `LOADING MAP: ${data.mapName}`;
    window.IS_IT_CUBAUM = data.cubaum;
    const path = data.mapName.toPath(`${ig.root}data/maps/`, '.json') + ig.getCacheSuffix();
    $.ajax({ // TODO verify ajax will always invoke later or add ordering to reload.serde
        dataType: 'json',
        url: ig.getFilePath(path),
        success: (levelData) => {
            ig.game.teleporting.levelData = levelData;
        },
        error: (a, b, c) => {
            ig.system.error(new Error(`Loading of Map '${path}' failed: ${a} / ${b} / ${c}`));
        },
    });
}

reload.serde('load-map', serialize, deserialize);
