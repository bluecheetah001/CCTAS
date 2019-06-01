// save state for for controls
// currently only saves the hidden lastControllerMoveDir which does not update every fame
// TODO this may want to get moved into patches to be exposed for estimating actual controls for the next frame

import * as reload from '../../utils/reload.js';

const lastControllerMoveDir = Vec2.create();
sc.GlobalInput.inject({
    moveDir(result, lastVel, ignoreLastDir) {
        if(this.autoControl) {
            result.x = this.autoControl.get('moveDirX');
            result.y = this.autoControl.get('moveDirY');
            return 1;
        } else if(ig.gamepad.isLeftStickDown()) {
            result.x = ig.gamepad.getAxesValue(ig.AXES.LEFT_STICK_X, true);
            result.y = ig.gamepad.getAxesValue(ig.AXES.LEFT_STICK_Y, true);
            let vel = undefined;
            if(!ignoreLastDir) {
                if(Vec2.dot(result, lastControllerMoveDir) >= 0) {
                    vel = Vec2.length(result);
                    vel = vel > 0.8 ? 1 : vel * vel / 0.64;
                    if(lastVel > vel) {
                        vel = (0.8 * lastVel) + (0.2 * vel);
                    }
                } else {
                    result.x = 0;
                    result.y = 0;
                    vel = 0;
                }
                Vec2.assign(lastControllerMoveDir, result);
            }
            return vel;
        } else {
            if(ig.input.state('left')) result.x = -1;
            else if(ig.input.state('right')) result.x = 1;
            else result.x = 0;
            if(ig.input.state('up')) result.y = -1;
            else if(ig.input.state('down')) result.y = 1;
            else result.y = 0;
            return result.x || result.y ? 1 : 0;
        }
    },
});

function serialize(hint) {
    if(hint === reload.RESTART) return undefined;

    return {
        lastControllerMoveDir: Vec2.create(lastControllerMoveDir),
    };
}

function deserialize(data) {
    if(data === undefined) return;

    Vec2.assign(lastControllerMoveDir, data.lastControllerMoveDir);
}

reload.serde('control', serialize, deserialize);
