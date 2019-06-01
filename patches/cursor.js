import * as mainLoop from '../patches/main-loop.js';
import * as inputs from '../patches/inputs.js';
import * as keys from '../utils/keys.js';
import {showError} from '../utils/misc.js';

// TODO move to a util class
// wrapper around Image for a simpler draw method
class Img {
    constructor(path) {
        this.loaded = false;
        this.width = 0;
        this.height = 0;
        this.path = path;
        this.img = new Image();
        this.img.onload = this.onload.bind(this);
        this.img.onerror = this.onerror.bind(this);
        this.img.src = path;
    }

    draw(targetX, targetY) {
        if(!this.loaded) return;
        ig.system.context.drawImage(
            this.img,
            0, 0, this.width, this.height,
            targetX, targetY, this.width, this.height
        );
    }

    onload(e__) {
        this.width = this.img.width;
        this.height = this.img.height;
        this.loaded = true;
    }

    onerror(e) {
        console.error(e);
        showError(new Error(`Error parsing ${this.path}`));
    }
}

const cursorIcon = new Img('game/page/img/cursor-1.png');
const throwIcon = new Img('game/page/img/cursor-throw-1.png');
const meleeIcon = new Img('game/page/img/cursor-melee-1.png');

// always show system cursor
ig.system.inputDom.className = '';
ig.System.inject({
    updateCursorClass() {},
});

// draw cursor in game
mainLoop.postFrame.add(() => {
    const mouseX = inputs.game.getPrev(keys.MOUSE_X);
    const mouseY = inputs.game.getPrev(keys.MOUSE_Y);
    switch(ig.system.cursorType) {
        case 'none':
            // gamepad, dont draw cursor
            break;
        case 'throw':
            throwIcon.draw(mouseX - 8, mouseY - 8);
            break;
        case 'melee':
            meleeIcon.draw(mouseX - 8, mouseY - 8);
            break;
        default:
            cursorIcon.draw(mouseX, mouseY);
            break;
    }
});
