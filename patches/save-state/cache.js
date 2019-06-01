// patch to recover the state of the data cache when loading a save state

import * as reload from '../../utils/reload.js';

// definitions for constrcting cache entries by type

// single path argument for file to load
function Loadable(class_) {
    return ([path]) => {
        return new class_(path);
    };
}

// array of string arguments (often to read a const object)
function Simple(class_) {
    return (args) => {
        return new class_(...args);
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
const typeToConstructor = {
    AnimationSheet: Loadable(ig.AnimationSheet),
    AreaMap: Loadable(sc.AreaLoadable),
    ARENA_CACHE: Simple(sc.ArenaCache),
    CHAR_EXPRESSION: Simple(sc.CharacterExpression),
    Character: Loadable(sc.Character),
    Credit: Loadable(sc.CreditSectionLoadable),
    CupAsset: Loadable(sc.CupAsset),
    EffectSheet: Loadable(ig.EffectSheet),
    Enemy: Loadable(sc.EnemyType),
    EnvParticleSpawner: Simple(ig.EnvParticleSpawner),
    EventSheet: Loadable(ig.EventSheet),
    Extension: Loadable(ig.Extension),
    Font: Loadable(ig.Font),
    GLOW_COLOR: Simple(ig.GlowColor),
    Image: Loadable(ig.Image),
    ImagePatternSheet: ImagePatternSheet(ig.ImagePatternSheet),
    MultiAudio: Loadable(ig.MultiAudio),
    MultiFont: Loadable(ig.MultiFont),
    Parallax: Loadable(ig.Parallax),
    PlayerConfig: Loadable(sc.PlayerConfig),
    PropSheet: Loadable(ig.PropSheet),
    SavePresetData: Loadable(sc.SavePresetData),
    ScalablePropSheet: Loadable(ig.ScalePropSheet),
    TrackDefault: AudioTrack(ig.TrackDefault),
    TrackWebAudio: AudioTrack(ig.TrackWebAudio),
    Video: Loadable(ig.Video),
    Weather: Simple(ig.WeatherInstance),
    WebAudioBuffer: Loadable(ig.WebAudioBuffer),
};

function serialize(hint) {
    // no need to serialize cache when restarting
    if(hint === reload.RESTART) return undefined;

    const cacheCounts = {};
    for(const type in ig.cacheList) {
        const igTypeCache = ig.cacheList[type];
        const typeCache = {};
        for(const key in igTypeCache) {
            const cached = igTypeCache[key];
            if(cached) {
                typeCache[key] = {
                    refCount: cached.referenceCount,
                    emptyCount: cached.emptyMapChangeCount,
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
    for(const type in ig.cacheList) {
        const igTypeCache = ig.cacheList[type];
        const typeCache = cacheCounts[type] || {};
        for(const key in igTypeCache) {
            const cached = igTypeCache[key];
            const counts = typeCache[key];
            if(!counts && cached) {
                if(cached.referenceCount === 0) {
                    if(cached.onCacheCleared) cached.onCacheCleared();
                } else {
                    // remove cache key so it does not clear the actual cache when cleaning.
                    // and enables immediate cleanup
                    cached.cacheKey = null;
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
        const igTypeCache = ig.cacheList[type];
        for(const key in typeCache) {
            igTypeCache[key].emptyMapChangeCount = typeCache[key].emptyCount;
        }
    }

    silentLoad();
}

function silentLoad() {
    ig.ready = false;
    ig.loading = true;
    let loaded = 0;
    let loading = 0;
    function loadedCallback(type__, path__, status__) {
        loaded += 1;
        if(loading < ig.resources.length) {
            console.warn('Loading save state did not fully populate cache?');
        }
        loadMore();
    }
    function loadMore() {
        for(;loading < ig.resources.length; loading += 1) {
            ig.resources[loading].load(loadedCallback);
        }
        if(loaded === loading) {
            ig.resources.length = 0;
            ig.ready = true;
            ig.loading = false;
        }
    }
    loadMore();
}

reload.serde('cache', serialize, deserialize);
