// utils for serializing and deserializing save states

const serializers = {};
const deserializers = {};

export const MAIN_MENU = 'MAIN_MENU';
export const LOAD_MAP = 'LOAD_MAP';
export const RESTART = 'RESTART';

export let lastSaveState = null;

export function serialize(hint) {
    const state = {};
    for(const key in serializers) {
        state[key] = serializers[key](hint);
    }
    lastSaveState = state;
    return state;
}
export function deserialize(state) {
    for(const key in deserializers) {
        deserializers[key](state[key]);
    }
    lastSaveState = state;
}

export function serde(key, serializer, deserializer) {
    if(key in serializers) {
        throw new Error(`Reload key ${key} is already taken`);
    }
    serializers[key] = serializer;
    deserializers[key] = deserializer;
}
