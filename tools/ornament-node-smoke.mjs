/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Dev harness (NOT part of the shipped app)
 *  `node tools/ornament-node-smoke.mjs`
 *
 *  Boots the real `client/src/ornaments/core/engine.js` under Node with
 *   • a mocked DOM (canvas / observers / rAF) and
 *   • a mocked `three` (Proxy that answers every class + constant)
 *  served from a tiny in-process HTTP module server.
 *
 *  Purpose: execute every code path that a bundler check cannot reach —
 *  constructors, per-preset scene builders, 8 frames of the animation loop,
 *  every public setter, preset hot-swap, bloom toggling and dispose() — so
 *  wiring mistakes surface here instead of in a reviewer's browser.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';

const core = new URL('../client/src/ornaments/core/', import.meta.url);

/* ─────────────────────────────────────────────── DOM mocks ─────────────── */

class FakeGL {
  getParameter() { return 16; }
  getExtension() { return null; }
  getShaderPrecisionFormat() { return { precision: 23, rangeMin: 127, rangeMax: 127 }; }
  getProgramParameter() { return true; }
  getActiveInfo() { return { name: 'u', type: 35664, size: 1 }; }
}
class FakeCtx2D {
  createRadialGradient() { return { addColorStop() {} }; }
  createLinearGradient() { return { addColorStop() {} }; }
  fillRect() {} clearRect() {} drawImage() {} save() {} restore() {}
  beginPath() {} closePath() {} clip() {} arc() {} ellipse() {} moveTo() {}
  lineTo() {} stroke() {} fill() {} bezierCurveTo() {} fillText() {}
  translate() {} rotate() {} scale() {} setTransform() {}
  measureText() { return { width: 10 }; }
}
class FakeCanvas {
  constructor() {
    this.width = 300;
    this.height = 150;
    this.style = {};
    this.clientWidth = 190;
    this.clientHeight = 190;
    this._gl = new FakeGL();
    this.parentElement = this;
  }
  getContext(kind) { return kind === '2d' ? new FakeCtx2D() : this._gl; }
  addEventListener() {}
  removeEventListener() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 190, height: 190 }; }
  toDataURL() { return 'data:image/png;base64,iVBOR'; }
  appendChild() {}
  remove() {}
  setAttribute() {}
}

globalThis.__rendered = 0;
globalThis.document = {
  visibilityState: 'visible',
  createElement: (t) => (t === 'canvas' ? new FakeCanvas() : new FakeCanvas()),
  addEventListener() {},
  removeEventListener() {},
  documentElement: { style: {} }
};
globalThis.window = {
  devicePixelRatio: 2,
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
};
globalThis.self = globalThis.window;
try {
  Object.defineProperty(globalThis, 'navigator', { value: { hardwareConcurrency: 8, deviceMemory: 8, language: 'en' }, configurable: true, writable: true });
} catch { /* node already exposes a read-only navigator */ }
globalThis.matchMedia = globalThis.window.matchMedia;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver = class {
  constructor(cb) { this.cb = cb; }
  observe(el) { this.cb([{ isIntersecting: true, target: el }]); }
  disconnect() {}
};
globalThis.Image = class {
  set src(_v) { setTimeout(() => this.onerror?.(new Error('network blocked in node')), 0); }
};
let rafQ = [];
globalThis.requestAnimationFrame = (cb) => { rafQ.push(cb); return rafQ.length; };
globalThis.cancelAnimationFrame = () => {};
const pump = (n) => {
  for (let i = 0; i < n; i++) {
    const q = rafQ;
    rafQ = [];
    q.forEach((c) => c(performance.now()));
  }
};

/* ────────────────────────────────── three.js mock (Proxy) ───────────────── */

const CONSTS = {
  SRGBColorSpace: 'srgb',
  LinearSRGBColorSpace: 'srgb-linear',
  NoColorSpace: '',
  ACESFilmicToneMapping: 4,
  NoToneMapping: 0,
  HalfFloatType: 1016,
  UnsignedByteType: 1009,
  DoubleSide: 2,
  FrontSide: 0,
  BackSide: 1,
  AdditiveBlending: 2,
  NormalBlending: 1,
  DynamicDrawUsage: 35048,
  RepeatWrapping: 1000,
  ClampToEdgeWrapping: 1001,
  NearestFilter: 1003,
  LinearFilter: 1006,
  RGBAFormat: 1023,
  OneMinusSrcAlphaFactor: 771,
  SrcAlphaFactor: 770
};

function mockNode(label) {
  const store = {};
  const fn = () => mockNode(`${label}()`);
  return new Proxy(fn, {
    get(_t, prop) {
      if (prop === 'then') return undefined;
      if (prop === Symbol.toPrimitive || prop === 'toString') return () => `[${label}]`;
      if (typeof prop === 'symbol') return undefined;
      if (prop in store) return store[prop];
      if (prop === 'count') return 4;
      if (['isMesh', 'isPoints', 'isSprite', 'isColor', 'isTexture', 'isMaterial', 'isShaderMaterial', 'isBufferGeometry', 'needsUpdate'].includes(prop)) {
        return prop === 'needsUpdate' ? false : true;
      }
      const child = mockNode(`${label}.${String(prop)}`);
      store[prop] = child;
      return child;
    },
    set(_t, prop, v) { store[prop] = v; return true; },
    apply() { return mockNode(`${label}()`); },
    construct() { return mockNode(`new ${label}`); }
  });
}

class Vec3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z ?? 0; return this; }
  setScalar(v) { this.x = this.y = this.z = v; return this; }
  copy() { return this; }
  lookAt() { return this; }
  normalize() { return this; }
  length() { return 1; }
}
class BufAttr {
  constructor(array, itemSize) {
    this.array = array || new Float32Array(12);
    this.itemSize = itemSize || 3;
    this.count = array ? array.length / (itemSize || 3) : 4;
    this.needsUpdate = false;
  }
  setUsage() { return this; }
  getX(i) { return this.array ? this.array[(i | 0) * this.itemSize] ?? 0 : 0; }
  getY(i) { return this.array ? this.array[(i | 0) * this.itemSize + 1] ?? 0 : 0; }
  getZ(i) { return this.array ? this.array[(i | 0) * this.itemSize + 2] ?? 0 : 0; }
  setX(i, v) { if (this.array) this.array[(i | 0) * this.itemSize] = v; }
  setY(i, v) { if (this.array) this.array[(i | 0) * this.itemSize + 1] = v; }
  setZ(i, v) { if (this.array) this.array[(i | 0) * this.itemSize + 2] = v; }
  setXY() {}
}
class Geo {
  constructor() {
    this.attributes = { position: new BufAttr(new Float32Array(12), 3) };
    this.index = { count: 12, needsUpdate: false };
  }
  setAttribute(name, attr) { this.attributes[name] = attr; return this; }
  getAttribute(name) { return this.attributes[name]; }
  computeVertexNormals() { return this; }
  scale() { return this; }
  rotateX() { return this; }
  translate() { return this; }
  dispose() {}
}
class Mat {
  constructor(params = {}) {
    Object.assign(this, params);
    this.userData = params.userData || {};
    this.color = { isColor: true, r: 1, g: 1, b: 1, set: (v) => (this.color.v = v) || this.color, copy() { return this; } };
    this.emissive = { r: 0, g: 0, b: 0, set() { return this; }, copy() { return this; } };
    this.emissiveIntensity = params.emissiveIntensity ?? 1;
    this.map = params.map ?? { offset: new Vec3(), wrapS: 1000, wrapT: 1000, needsUpdate: false, dispose() {} };
    this.needsUpdate = false;
  }
  dispose() {}
}
class Object3D {
  constructor() {
    this.children = [];
    this.position = new Vec3();
    this.rotation = new Vec3();
    this.scale = new Vec3(1, 1, 1);
    this.userData = {};
    this.visible = true;
    this.renderOrder = 0;
    this.frustumCulled = true;
    this.isObject3D = true;
  }
  add(...o) { this.children.push(...o); }
  remove(o) { const i = this.children.indexOf(o); if (i >= 0) this.children.splice(i, 1); }
  traverse(cb) { for (const c of this.children) { cb(c); c.traverse?.(cb); } }
  updateMatrixWorld() {}
  lookAt() {}
}

let mockSeq = 0;
class Mesh extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.isMesh = true;
    this.uuid = `mesh-${mockSeq++}`;
  }
}
class Points extends Mesh { constructor(g, m) { super(g, m); this.isPoints = true; } }
class InstancedMesh extends Mesh {
  constructor(g, m, count) {
    super(g, m);
    this.count = count;
    this.instanceMatrix = { setUsage: () => {}, needsUpdate: false };
  }
  setMatrixAt(i, m) { if (!(m && m.compose)) throw new Error('setMatrixAt got a non-Matrix4'); }
  setColorAt(i) {}
}
class ClassMesh extends Mesh {}

const THREE = new Proxy({}, {
  get(_t, prop) {
    if (typeof prop !== 'string') return undefined;
    if (prop in CONSTS) return CONSTS[prop];
    switch (prop) {
      case 'MathUtils': return { lerp: (a, b, t) => a + (b - a) * t, clamp: (v, a, b) => Math.min(b, Math.max(a, v)), degToRad: (d) => (d * Math.PI) / 180 };
      case 'Vector2': case 'Vector3': return Vec3;
      case 'Color': return class { constructor() { this.r = 1; this.g = 1; this.b = 1; this.isColor = true; } set() { return this; } setHex() { return this; } copy() { return this; } lerp() { return this; } getHex() { return 0xffffff; } getHexString() { return '#ffffff'; } };
      case 'Euler': return class { constructor() { this.x = 0; this.y = 0; this.z = 0; } set() { return this; } };
      case 'Quaternion': return class { setFromEuler() { return this; } };
      case 'Matrix4': return class { compose() { return this; } identity() { return this; } };
      case 'Plane': return class { constructor(n, c) { this.normal = n || new Vec3(); this.constant = c || 0; } set() { return this; } setFromNormalAndCoplanarPoint() { return this; } };
      case 'Shape': return class { moveTo() {} lineTo() {} bezierCurveTo() {} quadraticCurveTo() {} };
      case 'BufferAttribute': case 'Float32BufferAttribute': return BufAttr;
      case 'Clock': return class { constructor() { this.elapsedTime = 0; } getDelta() { this.elapsedTime += 0.016; return 0.016; } getElapsedTime() { return this.elapsedTime; } };
      case 'Group': return Object3D;
      case 'Scene': return class extends Object3D { constructor() { super(); this.fog = null; this.environment = null; this.background = null; } };
      case 'PerspectiveCamera': return class { constructor(fov = 50, aspect = 1) { this.fov = fov; this.aspect = aspect; this.position = new Vec3(0, 0, 5); this.rotation = new Vec3(); this.near = 0.1; this.far = 2000; } lookAt() {} updateProjectionMatrix() {} };
      case 'Mesh': case 'ClassMesh': return Mesh;
      case 'Points': return Points;
      case 'Sprite': return ClassMesh;
      case 'InstancedMesh': return InstancedMesh;
      case 'WebGLRenderer': return class {
        constructor() {
          this.domElement = new FakeCanvas();
          this.info = { render: { triangles: 22000, calls: 11 }, memory: { geometries: 12, textures: 6 }, autoReset: true };
          this.shadowMap = { enabled: false };
          this.capabilities = { isWebGL2: true, getMaxAnisotropy: () => 8 };
          this.localClippingEnabled = false;
          this._pr = 1;
          this.toneMapping = 0;
          this.outputColorSpace = 'srgb';
        }
        setPixelRatio(v) { this._pr = v; }
        getPixelRatio() { return this._pr; }
        setSize() {}
        setClearColor() {}
        setClearAlpha() {}
        render() { globalThis.__rendered++; }
        compile() {}
        dispose() {}
        forceContextLoss() {}
      };
      case 'WebGLRenderTarget': return class { constructor() { this.texture = { uuid: 'rt', dispose() {}, isTexture: true }; this.samples = 0; } setSize() {} dispose() {} };
      case 'PMREMGenerator': return class { constructor() {} fromScene() { return { texture: { uuid: 'env', isTexture: true, dispose() {} } }; } compileEquirectangularShader() {} dispose() {} };
      case 'TextureLoader': return class { setCrossOrigin() {} load(_u, ok) { ok?.({ dispose() {}, isTexture: true }); } };
      case 'CanvasTexture': case 'Texture': case 'DataTexture': return class { constructor() { this.colorSpace = ''; this.needsUpdate = false; this.wrapS = 1000; this.wrapT = 1000; this.repeat = new Vec3(); this.offset = new Vec3(); this.anisotropy = 1; this.isTexture = true; this.uuid = `tex-${mockSeq++}`; } dispose() {} };
      default: break;
    }
    if (/Geometry$/.test(prop)) return Geo;
    if (/Material$/.test(prop)) return Mat;
    if (/Light$/.test(prop)) {
      return class { constructor(_c, i) { this.color = { set: () => {} }; this.intensity = i ?? 1; this.position = new Vec3(); this.distance = 0; this.decay = 2; } };
    }
    return mockNode(`THREE.${prop}`);
  },
  has() { return true; }
});

/* ─────────────── transform + load the real engine with mocks ─────────────── */

globalThis.__THREE = THREE;
globalThis.__MOCKS = {
  EffectComposer: class {
    constructor(renderer, target) { this.renderer = renderer; this.target = target; this.passes = []; }
    addPass(p) { this.passes.push(p); }
    render() { globalThis.__rendered++; }
    setSize() {}
    setPixelRatio() {}
    dispose() {}
  },
  RenderPass: class { constructor() { this.enabled = true; } setSize() {} },
  UnrealBloomPass: class {
    constructor(res, strength, radius, threshold) { this.strength = strength; this.radius = radius; this.threshold = threshold; this.enabled = true; }
    setSize() {}
    dispose() {}
  },
  OutputPass: class { constructor() { this.enabled = true; } },
  RoomEnvironment: class { constructor() { this.children = []; } add() {} dispose() {} },
  GLTFLoader: class { setCrossOrigin() {} load(u, p, e, ok) { ok?.({ scene: { traverse() {}, add() {} } }); } }
};

const TMP = new URL('./.__smoke_engine.mock.mjs', core);
function instrument(src) {
  return src
    .replace(/import \* as THREE from 'three';/, "const THREE = globalThis.__THREE;")
    .replace(/^import \{([^}]+)\} from 'three\/addons\/[^']+';$/gm, (_m, names) =>
      names.split(',').map((n) => n.trim()).filter(Boolean)
        .map((n) => `const ${n} = globalThis.__MOCKS.${n};`).join('\n'));
}
writeFileSync(TMP, instrument(readFileSync(new URL('./engine.js', core), 'utf8')));

/* ─────────────────────────────────── run ─────────────────────────────────── */

const { mountOrnament, OrnamentEngine, createAvatarTexture } = await import(TMP.href);
const { ORNAMENT_PRESETS, BANNER_PRESETS } = await import(new URL('./ornaments.js', core).href);

const ids = Object.keys(ORNAMENT_PRESETS);
const bannerIds = Object.keys(BANNER_PRESETS);
let failures = 0;
const fail = (what, err) => {
  failures++;
  console.log(`✗ ${what}\n   ${err?.message}\n   ${(err?.stack || '').split('\n')[1]?.trim() || ''}`);
};

for (const id of ids) {
  for (const quality of ['cinematic', 'balanced', 'lite']) {
    try {
      const e = await mountOrnament({
        canvas: new FakeCanvas(),
        container: new FakeCanvas(),
        mode: 'frame',
        ornament: id,
        quality,
        interactive: true,
        withAvatar: true,
        avatarSrc: null,
        avatarLabel: 'ZX',
        avatarColor: '#22d3ee',
        onStats: () => {},
        onDegrade: () => {}
      });
      if (!e) throw new Error('mountOrnament() returned null');
      pump(10);
      e.setOptions({ tilt: 0.42, bloomStrength: 1.15, emissive: 3, glassTransmission: 0.8, glassRoughness: 0.05, glassIor: 1.7, particleSpeed: 1.4, spin: 0.1, scrollRotation: 2 });
      pump(4);
      e.setOrnament(ids[(ids.indexOf(id) + 1) % ids.length]);
      pump(4);
      e.pulse(1.2);
      await e.setAvatar({ label: 'AB', color: '#ff0066' });
      e.setSize();
      e.renderNow();
      if (typeof e.toDataURL !== 'function') throw new Error('toDataURL missing');
      const st = e.getStats();
      if (!st.quality) throw new Error('getStats() incomplete');
      e.setBloom(false);
      e.setBloom(true);
      pump(3);
      e.dispose();
      pump(3);                                     // frames must no-op after dispose
    } catch (err) { fail(`${id} @ ${quality}`, err); }
  }
}

for (const id of bannerIds) {
  for (const quality of ['cinematic', 'lite']) {
    try {
      const e = new OrnamentEngine({
        canvas: new FakeCanvas(),
        container: new FakeCanvas(),
        mode: 'banner',
        ornament: id,
        quality,
        imageOverride: null
      });
      pump(12);                                    // exercises the animated canvas layers
      e.setSize();
      e.dispose();
    } catch (err) { fail(`banner ${id} @ ${quality}`, err); }
  }
}

try {
  const tex = await createAvatarTexture({ label: 'Z', color: '#ff0000' });
  if (!tex) throw new Error('no texture returned');
} catch (err) { fail('createAvatarTexture (initials)', err); }
try {
  await createAvatarTexture({ src: 'https://example.invalid/x.png', label: 'Z' });
} catch (err) { fail('createAvatarTexture (broken url must not throw)', err); }

/* reduced-motion path */
try {
  const e = new OrnamentEngine({ canvas: new FakeCanvas(), container: new FakeCanvas(), ornament: 'cyber-neon', reduceMotion: true, quality: 'lite' });
  pump(6);
  e.dispose();
} catch (err) { fail('reduced-motion path', err); }

console.log(`\npresets ok: ${ids.length} frames × 3 tiers + ${bannerIds.length} banners × 2 tiers`);
console.log(`render calls executed: ${globalThis.__rendered}`);
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS ✓');
rmSync(TMP, { force: true });
process.exit(failures ? 1 : 0);
