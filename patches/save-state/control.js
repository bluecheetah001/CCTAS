// save state for for controls
// currently only saves the hidden lastControllerMoveDir which does not update every fame
// TODO this way want to get moved into patches to be exposed for estimating actual controls for the next frame

import * as reload from '../../utils/reload.js';

const lastControllerMoveDir = Vec2.create();
sc.$fb.prototype.Nh = function moveDir(result, lastVel, ignoreLastDir) {
    if(this.jb) {
        result.x = this.jb.get('resultX');
        result.y = this.jb.get('resultY');
        return 1;
    }
    if(ig.Xc.tqa()) {
        result.x = ig.Xc.Cf(ig.Nd.wn, true);
        result.y = ig.Xc.Cf(ig.Nd.xn, true);
        let vel = undefined;
        if(!ignoreLastDir) {
            if(Vec2.ug(result, lastControllerMoveDir) >= 0) {
                vel = Vec2.length(result);
                vel = vel > 0.8 ? 1 : vel * vel / 0.64;
                if(lastVel > vel) {
                    vel = (lastVel * 0.8) + (0.2 * vel);
                }
            } else {
                result.x = 0;
                result.y = 0;
                vel = 0;
            }
        }
        Vec2.assign(lastControllerMoveDir, result);
        return vel; // yes this is undefined when ignoreLastDir
    }
    if(ig.input.state('left')) result.x = -1;
    else if(ig.input.state('right')) result.x = 1;
    else result.x = 0;
    if(ig.input.state('up')) result.y = -1;
    else if(ig.input.state('down')) result.y = 1;
    else result.y = 0;
    return result.x || result.y ? 1 : 0;
};


function serialize(hint) {
    if(hint === reload.RESTART) return undefined;

    return {
        lastControllerMoveDir: ig.copy(lastControllerMoveDir),
    };
}

function deserialize(data) {
    if(data === undefined) return;

    Vec2.assign(lastControllerMoveDir, data.lastControllerMoveDir);
}

reload.serde('control', serialize, deserialize);
