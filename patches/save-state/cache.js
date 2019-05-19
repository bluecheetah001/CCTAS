// patch to recover the state of the data cache when loading a save state

import * as reload from '../../utils/reload.js';

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

    const cacheCounts = {};
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
        cacheCounts[type] = typeCache;
    }
    return cacheCounts;
}

function deserialize(cacheCounts) {
    if(cacheCounts === undefined) return;

    if(ig.ready === false) {
        throw new Error('Cannot deserialize cache while already loading');
    }
    if(ig.hn.length) {
        console.warn('ig.toLoad had entries before loading save state');
    }

    // remove cache entries that should not exist
    for(const type in ig.KBa) {
        const igTypeCache = ig.KBa[type];
        const typeCache = cacheCounts[type] || {};
        for(const key in igTypeCache) {
            const cached = igTypeCache[key];
            const counts = typeCache[key];
            if(!counts && cached) {
                if(cached.Lga === 0) {
                    if(cached.Wo) cached.Wo();
                } else {
                    // remove cache key so it does not clear the actual cache when cleaning.
                    // and enables immediate cleanup
                    cached.kr = null;
                }
                igTypeCache[key] = null;
            }
        }
    }

    // populate cache
    for(const type in cacheCounts) {
        const typeCache = cacheCounts[type];
        for(const key in typeCache) {
            typeToConstructor[type](key.split('|')).Tc();
        }
    }

    // reset cache empty count
    for(const type in cacheCounts) {
        const typeCache = cacheCounts[type];
        const igTypeCache = ig.KBa[type];
        for(const key in typeCache) {
            igTypeCache[key].CDa = typeCache[key].emptyCount;
        }
    }

    silentLoad();
}

function silentLoad() {
    ig.ready = false;
    // ig.Wv = true;
    let loaded = 0;
    let loading = 0;
    function loadedCallback(type__, path__, status__) {
        loaded += 1;
        if(loading < ig.hn.length) {
            console.warn('Loading save state did not fully populate cache?');
        }
        loadMore();
    }
    function loadMore() {
        for(;loading < ig.hn.length; loading += 1) {
            ig.hn[loading].load(loadedCallback);
        }
        if(loaded === loading) {
            ig.hn.length = 0;
            ig.ready = true;
            // ig.Wv = false;
        }
    }
    loadMore();
}

reload.serde('cache', serialize, deserialize);
