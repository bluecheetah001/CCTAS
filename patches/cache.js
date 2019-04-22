// patch to recover the state of the data cache when loading a save state

import * as reload from '../utils/reload.js';

// definitions for constrcting cache entries by type
function Loadable(class_) {
    return ([path]) => {
        return new class_(path);
    };
}
function ImagePatternSheet(class_) {
    return ([path, tileWidth, tileHeight, offX, offY, xCount, yCount, optimization]) => {
        // yes, args change order
        return new class_(
            path,
            Number(optimization), // TODO could be any falsy?
            Number(tileWidth),
            Number(tileHeight),
            Number(offX),
            Number(offY),
            Number(xCount),
            Number(yCount),
        );
    };
}
function AudioTrack(class_) {
    return ([path, loopEnd, introPath, introEnd, volume]) => {
        return new class_(
            path,
            loopEnd,
            introPath === '' ? undefined : introPath,
            introEnd === '' ? undefined : Number(introEnd),
            volume === '' ? undefined : Number(volume),
        );
    };
}
function CHAR_EXPRESSION(class_) {
    return ([character, expression]) => {
        return new class_(character, expression);
    };
}
const typeToConstructor = {
    Image: Loadable(ig.ia),
    ImagePatternSheet: ImagePatternSheet(ig.Xz),
    MultiAudio: Loadable(ig.hxa),
    WebAudioBuffer: Loadable(ig.Sya),
    TrackDefault: AudioTrack(ig.dUa),
    TrackWebAudio: AudioTrack(ig.npb),
    AnimationSheet: Loadable(ig.Al),
    Extension: Loadable(ig.rhb),
    EventSheet: Loadable(ig.ohb),
    EffectSheet: Loadable(ig.ud),
    GLOW_COLOR: Loadable(ig.Jwa), // not actually Loadable, arg is fillStyle
    Weather: Loadable(ig.Tka), // not actually Loadable, arg is key into const object
    PropSheet: Loadable(ig.Glb),
    ScalablePropSheet: Loadable(ig.qnb),
    Parallax: Loadable(ig.ySa),
    EnvParticleSpawner: Loadable(ig.zwa), // not actually Loadable, arg is key into const object
    Video: Loadable(ig.Upb),
    PlayerConfig: Loadable(sc.VV),
    AreaMap: Loadable(sc.Sva),
    Character: Loadable(sc.i9),
    CHAR_EXPRESSION: CHAR_EXPRESSION(sc.lI),
    Enemy: Loadable(sc.wV),
    SavePresetData: Loadable(sc.jnb),
    Credit: Loadable(sc.cgb),
};


function serialize(hint) {
    // no need to serialize cache when restarting
    if(hint === reload.RESTART) return undefined;

    const cache = {};
    for(const type in ig.KBa) {
        const igTypeCache = ig.KBa[type];
        const typeCache = {};
        for(const key in igTypeCache) {
            const cached = igTypeCache[key];
            if(cached) {
                typeCache[key] = {
                    refCount: cached.Lga,
                    emptyCount: cached.CDa,
                };
            }
        }
        cache[type] = typeCache;
    }
    return cache;
}

function deserialize(cache) {
    if(cache === undefined) return;

    // populate cache
    for(const type in cache) {
        const typeCache = cache[type];
        const igTypeCache = ig.KBa[type];
        for(const key in typeCache) {
            if(!igTypeCache[key]) {
                typeToConstructor[type](key.split('|')).Tc();
            }
        }
    }

    // TODO this may need to run after the map is loaded
    // so we are in a compareable state to check refCounts

    // theoretically this should only be changing the emptyCount
    // but also checking refCount for debugging
    for(const type in ig.KBa) {
        const igTypeCache = ig.KBa[type];
        const typeCache = cache[type];
        for(const key in igTypeCache) {
            const cached = igTypeCache[key];
            const counts = typeCache[key];
            if(counts) {
                if(cached) {
                    if(cached.Lga !== counts.refCount) {
                        console.log(`cache for ${type} ${key} expected ref=${counts.refCount} but was ${cached.Lga}`);
                    } else {
                        // TODO may need to +1 to survive a call to ig.w3()
                        // or this part of deserialize needs to happen after ig.w3()
                        cached.CDa = counts.emptyCount;
                    }
                } else {
                    throw new Error(`cache for ${type} ${key} did not get populated`);
                }
            } else {
                if(cached) {
                    if(cached.LGa !== 0) {
                        console.log(`cache for ${type} ${key} expected ref=0 but was ${cached.Lga}`);
                    } else {
                        if(cached.Wo) cached.Wo();
                        igTypeCache[key] = null;
                    }
                } else {
                    // nothing to do
                }
            }
        }
    }
}

reload.serde('cache', serialize, deserialize);
