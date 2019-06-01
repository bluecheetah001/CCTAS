import * as reload from '../../utils/reload.js';

// every load will always drop all particles
// but first calls update and clear, both of which will can call random
// so we can get away with forcably clearing the particles and reconstructing dummy objects which will then be updated, cleared, and droped like nothing happend

// note that the actual EnvParticleSpawner class is Cacheable and cannot be directly constructed during deserialization.
// partly because EnvParticles does not call increaseRef/decreateRef on the EnvParticleSpawner instances.
function FakeEnvParticleSpawner(state) {
    this.name = state.name;
    this.config = ig.ENV_PARTICLES[state.name];
    this.levels = state.levels.map((level) => ({
        scale: level.scale,
        // anim: not drawing
        spawnInterval: level.spawnInterval,
        spawnTimer: level.spawnTimer,
        particles: [], // dont need to recover the individual particles
    }));
}
const epsProto = ig.EnvParticleSpawner.prototype;
Object.assign(FakeEnvParticleSpawner.prototype, {
    // copy called functions to avoid false positives in trace.js
    setQuantity: epsProto.setQuantity,
    update: epsProto.update,
    spawnParticle: epsProto.spawnParticle,
    updateParticles: epsProto.updateParticles,
    // ignore draw since we dont want to init this.animSheet (its Cacheable) and the screen is faded out anyway
    draw() {},
});

function serialize(hint) {
    if(hint === reload.RESTART) return undefined;

    const spawnerState = [];
    for(const particleSpawner of ig.envParticles.activeSpawners) {
        spawnerState.push({
            name: particleSpawner.name,
            sizes: particleSpawner.levels.map((level) => ({
                scale: level.scale,
                spawnInterval: level.spawnInterval,
                spawnTimer: level.spawnTimer,
            })),
        });
    }
    return spawnerState;
}

function deserialize(spawnerState) {
    if(spawnerState === undefined) return;

    ig.envParticles.activeSpawners.length = 0;
    for(const state of spawnerState) {
        ig.envParticles.activeSpawners.push(new FakeEnvParticleSpawner(state));
    }
}

reload.serde('env-particles', serialize, deserialize);
