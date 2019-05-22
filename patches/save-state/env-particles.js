import * as reload from '../../utils/reload.js';

// every load will always drop all particles
// but first calls update and clear, both of which will can call random
// so we can get away with forcably clearing the particles and reconstructing dummy objects which will then be updated, cleared, and droped like nothing happend

// note that the actual EnvParticleSpawner class is Cacheable and cannot be constructed during deserialization.
// and annoyingly EnvParticles does not call increaseRef/decreateRef on the EnvParticleSpawner instances.

// specifically only implementing methods that are called to protect against these objects from escaping
const epsProto = ig.zwa.prototype;
class FakeEnvParticleSpawner {
    constructor(state) {
        this.fd = ig.Pm[state.name];
        this.rb = [];
        for(let i = 0; i < this.fd.rb.length; i += 1) {
            const sizeState = state.sizes[i];
            const sizeDef = this.fd.rb[i];
            this.rb.push({
                scale: sizeDef.scale,
                PK: sizeState.spawnInterval,
                It: sizeState.spawnTimer,
                gc: [],
            });
        }
        this.expectedOrder = 0;
    }
    update() {
        if(this.expectedOrder !== 0) {
            throw new Error('fake env particle spawner updated out of order');
        }
        this.expectedOrder = 1;
        return epsProto.update.call(this);
    }
    nb() {
        if(this.expectedOrder !== 1) {
            throw new Error('fake env particle spawner drawn out of order');
        }
        this.expectedOrder = 2;
        // dont need to render, screen has overlay
    }
    lab(quantity, immediately) {
        if(this.expectedOrder !== 2) {
            throw new Error('fake env particle spawner cleaned out of order');
        }
        if(quantity !== 0 || immediately !== true || this.didInit) {
            throw new Error('fake env particle spawner cleaned with incorrect arguments');
        }
        this.expectedOrder = 3;
        return epsProto.lab.call(this, quantity, immediately);
    }
    Xp(size) {
        return epsProto.Xp.call(this, size);
    }
    Rdb(size, tick) {
        return epsProto.Rdb.call(this, size, tick);
    }
}

function serialize(hint) {
    if(hint === reload.RESTART) return undefined;

    const spawnerState = [];
    for(const particleSpawner of ig.FJ.WI) {
        spawnerState.push({
            name: particleSpawner.name,
            sizes: particleSpawner.rb.map((s) => {
                return {
                    spawnInterval: s.PK,
                    spawnTimer: s.It,
                };
            }),
        });
    }
    return spawnerState;
}

function deserialize(spawnerState) {
    if(spawnerState === undefined) return;

    ig.FJ.WI.length = 0;
    for(const state of spawnerState) {
        ig.FJ.WI.push(new FakeEnvParticleSpawner(state));
    }
}

reload.serde('env-particles', serialize, deserialize);
