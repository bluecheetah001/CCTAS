import * as input from './utils/input.js'

export function update() {}
export function draw() {}

export function getInputs(frameIndex) {
    return input.user._prev.withTransition(input.user._curr);
}