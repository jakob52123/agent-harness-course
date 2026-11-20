import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Convertible: Poly by Google / Poly Pizza, CC BY 3.0 (modified upstream).
// Driver: Quaternius, Man in Long Sleeves, CC0. Original GLB stays untouched.
export async function createCar(THREE, opts = {}) {
  if (!(opts.glb instanceof ArrayBuffer)) throw new TypeError('createCar: opts.glb must be an ArrayBuffer');
  const source = await new Promise((resolve, reject) => {
    new GLTFLoader().parse(opts.glb, '', (gltf) => resolve(gltf.scene), reject);
  });
  const group = new THREE.Group();
  group.name = 'Convertible';
  const names = ['body', 'driver', 'driver2', 'engine', 'steering', 'windshield', 'dashcam',
    'nav', 'brake', 'wheels', 'chassis', 'key', 'radio'];
  const parts = Object.fromEntries(names.map((name) => {
    const part = new THREE.Group(); part.name = name; group.add(part); return [name, part];
  }));
  const GROUPS = Object.freeze({ loop: ['engine'], tools: ['steering'], context: ['windshield', 'dashcam'],
    skills: ['nav'], guard: ['brake'], llm: ['driver'], trigger: ['key'], desk: ['radio'] });
  Object.values(GROUPS).forEach(Object.freeze);
  const geometries = new Set(), materials = new Set(), textures = new Set(), images = new Set();
  const materialList = (o) => Array.isArray(o.material) ? o.material : [o.material];
  const ownMaterial = (m) => {
    materials.add(m);
    for (const value of Object.values(m)) if (value?.isTexture) {
      textures.add(value); if (value.image?.close) images.add(value.image);
    }
    return m;
  };
  source.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) materialList(o).forEach(ownMaterial);
  });
  for (const name of ['Brain', 'Spotlight', 'Spotlight2']) {
    const unused = source.getObjectByName(name);
    if (unused) { unused.visible = false; unused.removeFromParent(); }
  }
  const boxOf = (o) => new THREE.Box3().setFromObject(o, true);
  const centerOf = (o) => boxOf(o).getCenter(new THREE.Vector3());
  source.updateMatrixWorld(true);
  const bodySource = source.getObjectByName('Convertible1');
  const windshieldSource = source.getObjectByName('Windshield');
  if (!bodySource || !windshieldSource) throw new Error('Convertible GLB: missing body or windshield');
  const bodyBox = boxOf(bodySource), bodySize = bodyBox.getSize(new THREE.Vector3());
  const forward = centerOf(windshieldSource).sub(bodyBox.getCenter(new THREE.Vector3()));
  const alongZ = bodySize.z >= bodySize.x;
  const yaw = alongZ ? (forward.z < 0 ? Math.PI : 0) : (forward.x < 0 ? Math.PI / 2 : -Math.PI / 2);
  source.rotation.y += yaw;
  source.updateMatrixWorld(true);
  source.scale.multiplyScalar(4.2 / boxOf(source).getSize(new THREE.Vector3()).z);
  source.updateMatrixWorld(true);
  const normalized = boxOf(source), c = normalized.getCenter(new THREE.Vector3());
  source.position.sub(new THREE.Vector3(c.x, normalized.min.y, c.z));
  source.updateMatrixWorld(true);

  // Palette texture remap, in sRGB bytes, same tolerance as the previous course.
  const remapped = new Map();
  const paint = new THREE.Color(opts.paint ?? '#FF5AA5').convertLinearToSRGB();
  const rgb = [paint.r, paint.g, paint.b].map((v) => Math.round(v * 255));
  let paintPixels = 0;
  function cloneMaterial(original) {
    const m = ownMaterial(original.clone());
    m.flatShading = true;
    if (m.name === 'lambert6SG') { m.side = THREE.DoubleSide; m.depthWrite = false; }
    if (m.name === 'lambert5SG' && m.map) {
      if (!remapped.has(m.map)) {
        const canvas = document.createElement('canvas'), image = m.map.image;
        canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height), p = pixels.data;
        for (let i = 0; i < p.length; i += 4) {
          const d = [p[i] - 199, p[i + 1] - 68, p[i + 2] - 90];
          if (d.reduce((s, x) => s + x * x, 0) > 40 * 40) continue;
          for (let k = 0; k < 3; k++) p[i + k] = Math.max(0, Math.min(255, rgb[k] + d[k]));
          paintPixels++;
        }
        ctx.putImageData(pixels, 0, 0);
        const texture = m.map.clone(); texture.image = canvas; texture.needsUpdate = true;
        textures.add(texture); remapped.set(m.map, texture);
      }
      m.map = remapped.get(m.map);
    }
    return m;
  }
  // Bake the imported hierarchy into car-space geometry. Every part then has an
  // unscaled, meaningful pivot; wheel rotation never orbits the GLB's old origin.
  function importNode(name, parent) {
    const node = source.getObjectByName(name);
    if (!node) throw new Error(`Convertible GLB: missing ${name}`);
    node.traverse((o) => {
      if (!o.isMesh) return;
      const geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
      geometries.add(geometry);
      const m = Array.isArray(o.material) ? o.material.map(cloneMaterial) : cloneMaterial(o.material);
      const mesh = new THREE.Mesh(geometry, m); mesh.name = o.name;
      parent.add(mesh);
    });
  }
  function recenter(part) {
    const center = centerOf(part);
    for (const child of part.children) child.position.sub(center);
    part.position.copy(center);
  }
  for (const name of ['Convertible1', 'Windshield_wipers_c2', 'Windshield_wipers_c3']) importNode(name, parts.body);
  for (const [part, node] of Object.entries({ driver: 'Driver', steering: 'Steering_wheel',
    windshield: 'Windshield', dashcam: 'Dashcam' })) importNode(node, parts[part]);
  for (const name of ['body', 'driver', 'steering', 'windshield', 'dashcam']) recenter(parts[name]);
  for (let i = 2; i <= 5; i++) {
    const wheel = new THREE.Group(); wheel.name = `Wheel_a${i}`;
    parts.wheels.add(wheel); importNode(wheel.name, wheel); recenter(wheel);
  }
  parts.driver2.position.copy(parts.driver.position);
  for (const child of parts.driver.children) {
    const twin = child.clone();
    const recolor = (m) => {
      const copy = ownMaterial(m.clone());
      if (m.name === 'Shirt') copy.color.set('#F5EDF1');
      if (m.name === 'Pants') copy.color.set('#A53668');
      return copy;
    };
    twin.material = Array.isArray(child.material) ? child.material.map(recolor) : recolor(child.material);
    parts.driver2.add(twin);
  }

  const metal = '#79767C', dark = '#29242D', warm = '#E5DAD5', pink = opts.paint ?? '#FF5AA5';
  function mesh(parent, geometry, color, position, rotation = [0, 0, 0]) {
    geometries.add(geometry);
    const material = ownMaterial(new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.78, metalness: 0.12 }));
    const item = new THREE.Mesh(geometry, material);
    item.position.set(...position); item.rotation.set(...rotation); parent.add(item); return item;
  }
  const block = (p, size, color, pos, rot) => mesh(p, new THREE.BoxGeometry(...size), color, pos, rot);
  const cylinder = (p, radius, depth, color, pos, rot = [0, 0, Math.PI / 2]) =>
    mesh(p, new THREE.CylinderGeometry(radius, radius, depth, 12), color, pos, rot);
  // Engine under the front hood: low-poly block, two banks, ribs and air cleaner.
  parts.engine.position.set(0, 0.55, 1.28);
  block(parts.engine, [0.68, 0.29, 0.66], dark, [0, -0.08, 0]);
  for (const x of [-0.23, 0.23]) {
    block(parts.engine, [0.25, 0.21, 0.67], metal, [x, 0.1, 0], [0, 0, -Math.sign(x) * 0.2]);
    for (let z = -0.24; z <= 0.25; z += 0.12) block(parts.engine, [0.28, 0.035, 0.035], warm, [x, 0.22, z]);
  }
  cylinder(parts.engine, 0.19, 0.12, pink, [0, 0.21, 0], [0, 0, 0]);
  block(parts.engine, [0.09, 0.1, 0.26], metal, [0, 0.16, -0.22]);
  // Dashboard hardware faces the seated driver (-Z), not through the windshield.
  parts.nav.position.set(0, 1.13, 0.43);
  block(parts.nav, [0.32, 0.22, 0.065], dark, [0, 0, 0]);
  block(parts.nav, [0.27, 0.17, 0.008], '#C7BCBD', [0, 0, -0.038]);
  block(parts.nav, [0.035, 0.11, 0.01], pink, [-0.055, -0.018, -0.045]);
  block(parts.nav, [0.13, 0.025, 0.01], pink, [-0.005, 0.025, -0.045]);
  block(parts.nav, [0.055, 0.1, 0.055], metal, [0, -0.14, 0.015]);
  parts.radio.position.set(-0.4, 1.13, 0.35);
  block(parts.radio, [0.15, 0.21, 0.095], dark, [0, 0, 0]);
  block(parts.radio, [0.09, 0.04, 0.008], pink, [0, 0.055, -0.052]);
  for (const y of [-0.055, -0.025, 0.005]) block(parts.radio, [0.1, 0.009, 0.01], metal, [0, y, -0.055]);
  cylinder(parts.radio, 0.012, 0.15, dark, [-0.05, 0.18, 0], [0, 0, 0]);
  const steeringCenter = parts.steering.position;
  parts.key.position.copy(steeringCenter).add(new THREE.Vector3(-0.14, -0.17, -0.035));
  block(parts.key, [0.1, 0.11, 0.045], pink, [0, -0.045, 0]);
  block(parts.key, [0.035, 0.12, 0.025], warm, [0, 0.065, 0]);
  block(parts.key, [0.025, 0.025, 0.025], warm, [0.023, 0.08, 0]);
  block(parts.key, [0.025, 0.025, 0.025], warm, [0.023, 0.125, 0]);
  // Ladder chassis with crossmembers and two axles, all above ground.
  parts.chassis.position.set(0, 0.25, 0);
  for (const x of [-0.4, 0.4]) block(parts.chassis, [0.12, 0.14, 3.45], dark, [x, 0, 0]);
  for (const z of [-1.45, -0.7, 0, 0.7, 1.45]) block(parts.chassis, [0.83, 0.11, 0.12], metal, [0, 0.01, z]);
  const wheels = parts.wheels.children;
  for (const z of [...new Set(wheels.map((w) => Number(w.position.z.toFixed(5))))])
    cylinder(parts.chassis, 0.065, 1.3, metal, [0, 0.11, z]);
  for (const wheel of wheels) {
    const brake = new THREE.Group(); brake.name = `brake-${wheel.name}`;
    brake.position.copy(wheel.position); brake.position.x -= Math.sign(wheel.position.x) * 0.19;
    parts.brake.add(brake);
    cylinder(brake, 0.255, 0.045, metal, [0, 0, 0]);
    cylinder(brake, 0.085, 0.06, dark, [0, 0, 0]);
    block(brake, [0.1, 0.23, 0.12], pink, [0, 0.025, 0.21]);
  }

  const state = { dim: 0, silhouette: 0, explode: 0, xray: 0, driver: 1, chassis: 0, speed: 0 };
  const lit = Object.fromEntries(names.map((name) => [name, 0]));
  const records = [];
  const warmLight = new THREE.Color('#FFF0D9');
  for (const [name, part] of Object.entries(parts)) {
    const meshes = []; part.traverse((o) => { if (o.isMesh) meshes.push(o); });
    for (const item of meshes) {
      item.castShadow = item.receiveShadow = true;
      const mats = materialList(item).map((m) => {
        const uniforms = { shade: { value: 1 }, silhouette: { value: 0 } };
        m.onBeforeCompile = (shader) => {
          shader.uniforms.carShade = uniforms.shade; shader.uniforms.carSilhouette = uniforms.silhouette;
          shader.fragmentShader = 'uniform float carShade; uniform float carSilhouette;\n' + shader.fragmentShader.replace(
            '#include <opaque_fragment>',
            'outgoingLight *= carShade; outgoingLight = mix(outgoingLight, vec3(0.0007, 0.0004, 0.0006), carSilhouette);\n#include <opaque_fragment>');
        };
        m.customProgramCacheKey = () => 'convertible-effects-v1';
        return { m, uniforms, opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite,
          emissive: m.emissive.clone(), intensity: m.emissiveIntensity,
          glow: warmLight.clone().multiplyScalar(0.18 + 0.42 * (0.2126 * m.color.r + 0.7152 * m.color.g + 0.0722 * m.color.b)) };
      });
      // Inverted hull: no renderer/postprocessing dependency and no triangulation wireframe.
      const outlineMaterial = ownMaterial(new THREE.MeshBasicMaterial({ color: '#ED3D8C', side: THREE.BackSide,
        transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      item.geometry.computeBoundingBox();
      const center = item.geometry.boundingBox.getCenter(new THREE.Vector3());
      outlineMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.hullCenter = { value: center };
        shader.vertexShader = 'uniform vec3 hullCenter;\n' + shader.vertexShader.replace('#include <begin_vertex>',
          'vec3 transformed = hullCenter + (position - hullCenter) * 1.025;');
      };
      outlineMaterial.customProgramCacheKey = () => 'convertible-hull-v1';
      let outline;
      if (name === 'windshield') {
        // A translucent sheet has no closed hull: draw its boundary, never its back face.
        const edges = new THREE.EdgesGeometry(item.geometry, 35); geometries.add(edges);
        const lineMaterial = ownMaterial(new THREE.LineBasicMaterial({ color: '#ED3D8C',
          transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
        outline = new THREE.LineSegments(edges, lineMaterial);
      } else outline = new THREE.Mesh(item.geometry, outlineMaterial);
      outline.name = `${item.name || name}-outline`; outline.userData.carOutline = true;
      outline.visible = false; item.add(outline);
      records.push({ name, item, mats, outline });
    }
  }
  const rest = Object.fromEntries(names.map((n) => [n, parts[n].position.clone()]));
  const targets = { engine: [-2.2, 2.3, 1.3], steering: [2.2, 2.3, 1.3],
    windshield: [0, 3.9, -0.25], nav: [-2.2, 3.3, -1.3], brake: [2.2, 3.3, -1.35] };
  const offsets = Object.fromEntries(Object.entries(targets).map(([n, p]) => [n, new THREE.Vector3(...p).sub(rest[n])]));
  offsets.dashcam = offsets.windshield.clone();
  const brakeRest = parts.brake.children.map((b) => b.position.clone());
  const brakeDisplay = brakeRest.map((_, i) => new THREE.Vector3((Math.floor(i / 2) - 0.5) * 0.7, (i % 2 - 0.5) * 0.66, 0));
  let disposed = false;
  function refresh() {
    if (disposed) return;
    for (const [n, offset] of Object.entries(offsets)) parts[n].position.copy(rest[n]).addScaledVector(offset, state.explode);
    parts.nav.rotation.y = Math.PI * state.explode;
    parts.brake.children.forEach((b, i) => {
      b.position.copy(brakeRest[i]).lerp(brakeDisplay[i], state.explode);
      b.rotation.y = -Math.PI / 2 * state.explode;
    });
    parts.driver.visible = state.driver === 1;
    parts.driver2.visible = state.driver === 2;
    for (const { name, item, mats, outline } of records) {
      const level = name === 'driver2' ? Math.max(lit.driver, lit.driver2) : lit[name];
      const keep = ['wheels', 'chassis', 'engine'].includes(name);
      const alpha = keep ? 1 : 1 - state.chassis;
      // Tires and body must both stop occluding the four inboard brake disks.
      const ghost = name === 'body' ? 1 - 0.9 * state.xray : name === 'wheels' ? 1 - 0.86 * state.xray : 1;
      item.visible = alpha > 0.001;
      for (const r of mats) {
        const m = r.m;
        r.uniforms.shade.value = 1 - state.dim * (1 - level) * 0.88;
        r.uniforms.silhouette.value = state.silhouette;
        m.emissive.copy(r.emissive).lerp(r.glow, level);
        m.emissiveIntensity = r.intensity * (1 - level) + 1.35 * level;
        m.opacity = (name === 'windshield' ? Math.max(r.opacity, level * 0.42) : r.opacity) * alpha * ghost;
        // A silhouette must also close the glass instead of leaking lit interiors.
        if (state.silhouette) m.opacity = THREE.MathUtils.lerp(m.opacity, alpha, state.silhouette);
        const transparent = r.transparent || m.opacity < 0.999;
        if (m.transparent !== transparent) { m.transparent = transparent; m.needsUpdate = true; }
        m.depthWrite = transparent ? false : r.depthWrite;
      }
      outline.material.opacity = Math.max(level, state.silhouette * 0.9) * alpha * ghost;
      outline.visible = outline.material.opacity > 0.001;
    }
    group.updateMatrixWorld(true);
  }
  const unit = (v) => Number.isFinite(v) ? THREE.MathUtils.clamp(v, 0, 1) : 0;
  const set = (key) => (v) => { state[key] = unit(v); refresh(); };
  function anchors() {
    group.updateWorldMatrix(true, true);
    const result = {};
    for (const name of names) {
      const box = new THREE.Box3();
      const inverse = parts[name].matrixWorld.clone().invert();
      parts[name].traverse((o) => {
        if (o.isMesh && !o.userData.carOutline) {
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          const local = new THREE.Matrix4().multiplyMatrices(inverse, o.matrixWorld);
          box.union(o.geometry.boundingBox.clone().applyMatrix4(local));
        }
      });
      result[name] = parts[name].localToWorld(box.getCenter(new THREE.Vector3()));
    }
    if (state.driver === 2) result.driver.copy(result.driver2);
    for (const [name, members] of Object.entries(GROUPS)) {
      result[name] = new THREE.Vector3();
      for (const member of members) result[name].add(result[member]);
      result[name].multiplyScalar(1 / members.length);
    }
    return result;
  }
  const wheelRadius = boxOf(wheels[0]).getSize(new THREE.Vector3()).y / 2;
  group.userData.paintPixels = paintPixels;
  group.userData.attribution = 'Convertible — Poly by Google / Poly Pizza, CC BY 3.0, modified; Driver — Quaternius, CC0';
  refresh();
  return {
    kind: 'glb', group, parts, GROUPS,
    setLit(name, v) {
      const members = GROUPS[name] ?? (parts[name] ? [name] : []);
      for (const member of members) lit[member] = unit(v);
      refresh();
    },
    setDim: set('dim'), setSilhouette: set('silhouette'), setExplode: set('explode'),
    setXray: set('xray'), setChassisOnly: set('chassis'),
    setDriver(n) { state.driver = n === 2 ? 2 : 1; refresh(); },
    setSpeed(v) { state.speed = Number.isFinite(v) ? v : 0; },
    anchors,
    update(dt) {
      if (disposed || !Number.isFinite(dt) || dt <= 0) return;
      const angle = state.speed * dt / wheelRadius;
      for (const wheel of wheels) wheel.rotation.x = (wheel.rotation.x + angle) % (Math.PI * 2);
      group.updateMatrixWorld(true);
    },
    dispose() {
      if (disposed) return;
      disposed = true; group.removeFromParent();
      geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose()); images.forEach((image) => image.close());
      group.clear(); source.clear();
    },
  };
}
