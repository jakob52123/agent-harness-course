// Development fallback only. Never replaces or writes the parallel car modules.
export async function createCar(T, opts = {}) {
  const group = new T.Group(); group.name = 'car-stub';
  const names = ['body','driver','driver2','engine','steering','windshield','dashcam','nav','brake','wheels','chassis','key','radio'];
  const parts = Object.fromEntries(names.map(name => {
    const part = new T.Group(); part.name = name; group.add(part); return [name, part];
  }));
  const GROUPS = { loop:['engine'], tools:['steering'], context:['windshield','dashcam'], skills:['nav'], guard:['brake'], llm:['driver'], trigger:['key'], desk:['radio'] };
  const all = [];
  function box(part, size, pos, color = opts.paint || '#FF5AA5') {
    const material = new T.MeshStandardMaterial({ color, roughness: 0.36, metalness: 0.35 });
    const mesh = new T.Mesh(new T.BoxGeometry(...size), material);
    mesh.position.set(...pos); parts[part].add(mesh);
    mesh.userData = { color: material.color.clone(), pos: mesh.position.clone(), part };
    all.push(mesh); return mesh;
  }
  box('chassis',[1.75,.18,3.7],[0,.4,0],'#25242a');
  box('body',[1.86,.42,4.16],[0,.7,0]);
  box('body',[1.74,.24,1.65],[0,.98,1.15]);
  box('body',[1.74,.24,.7],[0,.98,-1.6]);
  box('body',[.15,.25,1.6],[-.86,1,-.45]);
  box('body',[.15,.25,1.6],[.86,1,-.45]);
  box('body',[1.55,.08,.1],[0,.76,2.13],'#e6cbd7');
  box('body',[.25,.18,.05],[-.64,.92,2.1],'#fff0da');
  box('body',[.25,.18,.05],[.64,.92,2.1],'#fff0da');
  box('windshield',[1.55,.5,.08],[0,1.38,.25],'#524853');
  box('engine',[1.1,.48,.9],[0,.85,1.1],'#b7b4ba');
  box('steering',[.4,.3,.12],[-.44,1.27,.06],'#25202a');
  box('dashcam',[.14,.1,.1],[0,1.54,.19],'#d5bcc8');
  box('nav',[.23,.2,.08],[.3,1.25,.08],'#f2e3eb');
  box('driver',[.42,.55,.34],[-.42,1.22,-.52],'#b9a59d');
  box('driver',[.28,.28,.28],[-.42,1.65,-.52],'#f3d5c3');
  box('driver2',[.42,.55,.34],[-.42,1.22,-.52],'#48474e');
  box('driver2',[.28,.28,.28],[-.42,1.65,-.52],'#c4b3a9');
  box('key',[.09,.06,.18],[-.25,1.12,-.08],'#f4e5eb');
  box('radio',[.18,.25,.14],[.5,1,-.4],'#3e343e');
  for (const x of [-.96,.96]) for (const z of [-1.3,1.3]) {
    const wheel = box('wheels',[.3,.64,.64],[x,.34,z],'#19171c');
    const hub = new T.Mesh(new T.BoxGeometry(.32,.3,.3), new T.MeshStandardMaterial({color:'#aca3ab',metalness:.7,roughness:.3}));
    wheel.add(hub);
    box('brake',[.05,.3,.26],[x*.88,.36,z],'#b5a5ad');
  }
  const values = { silhouette:0, dim:0, explode:0, xray:0, chassisOnly:0, driver:1, speed:0 };
  const lit = {};
  const exploded = { engine:[0,2.4,1.1],steering:[-2,1.6,.2],windshield:[0,2.4,-1.4],dashcam:[0,2.8,-1.4],nav:[2,1.8,-.3],brake:[0,1.1,2.7] };
  function refresh() {
    for (const mesh of all) {
      const name = mesh.userData.part, m = mesh.material;
      const level = lit[name] || 0;
      m.color.copy(mesh.userData.color).multiplyScalar((1 - values.silhouette * .96) * (1 - values.dim * .8 * (1-level)));
      m.emissive.set(level ? '#fff1df' : '#ED3D8C');
      m.emissiveIntensity = level * 1.4 + values.silhouette * .018;
      let alpha = name === 'body' ? 1 - values.xray * .85 : 1;
      if (!['wheels','chassis','engine'].includes(name)) alpha *= 1-values.chassisOnly;
      m.transparent = alpha < 1; m.opacity = alpha; m.depthWrite = alpha > .5;
      mesh.visible = alpha > .001;
      mesh.position.copy(mesh.userData.pos);
      if (exploded[name]) mesh.position.addScaledVector(new T.Vector3(...exploded[name]),values.explode);
    }
    parts.driver.visible = values.driver < 1.5; parts.driver2.visible = values.driver >= 1.5;
  }
  refresh();
  const setter = name => value => { values[name] = value; refresh(); };
  return {
    kind:'stub',group,parts,GROUPS,
    setLit(name,v) { for (const n of GROUPS[name] || [name]) lit[n]=v; refresh(); },
    setDim:setter('dim'),setSilhouette:setter('silhouette'),setExplode:setter('explode'),
    setXray:setter('xray'),setDriver:setter('driver'),setChassisOnly:setter('chassisOnly'),
    setSpeed(v) { values.speed=v; },
    anchors() {
      group.updateMatrixWorld(true);
      const result = {};
      for (const [name, part] of Object.entries(parts)) result[name] = new T.Box3().setFromObject(part).getCenter(new T.Vector3());
      for (const [name, members] of Object.entries(GROUPS)) result[name] = result[members[0]].clone();
      return result;
    },
    update(dt) { for (const wheel of parts.wheels.children) wheel.rotation.x += values.speed * dt / .32; },
    dispose() { group.traverse(o => { o.geometry?.dispose(); if (o.material) o.material.dispose(); }); group.removeFromParent(); },
  };
}
