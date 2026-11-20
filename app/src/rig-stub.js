// Interface-compatible staging model; build.mjs selects rig.js as soon as H1 supplies it.
export function createRig(THREE, { variant = 'base' } = {}) {
  const group = new THREE.Group(); group.name = `rig-stub-${variant}`;
  const names = ['core','loop','tools','context','memory','skills','guard','base','extras'];
  const parts = Object.fromEntries(names.map(name => {
    const part = new THREE.Group(); part.name = name; group.add(part); return [name,part];
  }));
  const GROUPS = { llm:['core'], loop:['loop'], tools:['tools'], context:['context','memory'], skills:['skills'], guard:['guard'] };
  const materials = [], lights = {};
  let silhouette=0, dim=0, explode=0, assemble=1, activity=.3, time=0;
  function box(part, size, pos, color='#51404c', glow=0) {
    const material = new THREE.MeshStandardMaterial({color,roughness:.48,metalness:.45,emissive:glow?'#ffe7ee':'#ED3D8C',emissiveIntensity:glow});
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size),material);
    mesh.position.set(...pos); parts[part].add(mesh);
    const edgeMaterial = new THREE.LineBasicMaterial({color:'#ED3D8C',transparent:true,opacity:.6});
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),edgeMaterial); mesh.add(edges);
    materials.push({material,edgeMaterial,color:new THREE.Color(color),part,glow}); return mesh;
  }
  box('base',[3.5,.22,2.6],[0,.11,0]);
  box('base',[1.1,.4,1.1],[0,.4,0]);
  box('core',[.82,1.08,.82],[0,1.65,0],'#f5edf1',1.2);
  // A square loop and a traveling light: intentionally simple, not a substitute for H1's model.
  for(const x of [-1.2,1.2]) box('loop',[.12,2.25,.12],[x,1.65,0]);
  for(const y of [.52,2.78]) box('loop',[2.5,.12,.12],[0,y,0]);
  const dot=box('loop',[.18,.18,.18],[1.2,1.65,0],'#ffeef5',2);
  for(const x of [-1.55,1.55]) {
    box('tools',[.18,1.1,.18],[x,.8,.25]);
    box('tools',[.5,.16,.22],[x-Math.sign(x)*.16,1.35,.25]);
  }
  box('context',[1.2,.66,.14],[0,1.0,1.15]);
  for(let i=0;i<3;i++) box('context',[.8-i*.15,.045,.03],[-i*.075,1.18-i*.15,1.24],'#f5edf1',.45);
  for(let i=0;i<4;i++) box('memory',[.85,.1,.6],[0,.65+i*.15,-1]);
  for(let i=0;i<3;i++) box('skills',[.15,.68,.45],[1.1+i*.22,.7,-.65],'#ac577d');
  for(const x of [-1.7,1.7]) box('guard',[.08,.35,2.5],[x,.42,0]);
  for(const z of [-1.24,1.24]) box('guard',[3.5,.35,.08],[0,.42,z]);
  if(variant==='coding') for(let i=0;i<3;i++) box('extras',[.6,.3,.55],[-1.1,.8+i*.34,-.8]);
  if(variant==='super') for(const x of [-1.8,1.8]) box('extras',[.3,1.7,.4],[x,1.35,-.65]);
  if(variant==='personal') box('extras',[.65,.8,.18],[-1.25,1.45,.9],'#ac577d');
  const offsets={loop:[0,1.6,-.2],tools:[-1.3,.5,0],context:[0,.35,1.9],memory:[0,.65,-1.9],skills:[1.6,.7,0],guard:[0,-.1,1]};
  function refresh() {
    for(const {material,edgeMaterial,color,part,glow} of materials) {
      const lit=lights[part]||0;
      material.color.copy(color).multiplyScalar((1-.97*silhouette)*(1-.72*dim*(1-lit)));
      material.emissive.set(lit?'#fff0df':glow?'#ffe7ee':'#ED3D8C');
      material.emissiveIntensity=glow*(1-.84*silhouette)+lit*.7;
      edgeMaterial.opacity=.48+silhouette*.4+lit*.12;
    }
  }
  function arrange() {
    Object.entries(offsets).forEach(([name,offset],i)=>{
      const progress=Math.min(1,Math.max(0,assemble*1.65-i*.105));
      const smooth=progress*progress*(3-2*progress);
      parts[name].position.fromArray(offset).multiplyScalar(Math.max(explode,1-smooth));
    });
  }
  refresh();
  return {
    kind:'rig',variant,group,parts,GROUPS,
    setLit(name,v){for(const part of GROUPS[name]||[name]) lights[part]=v;refresh();},
    setDim(v){dim=v;refresh();}, setSilhouette(v){silhouette=v;refresh();},
    setExplode(v){explode=v;arrange();}, setAssemble(v){assemble=v;arrange();},
    setActivity(v){activity=v;},
    anchors(){
      group.updateMatrixWorld(true);
      const out=Object.fromEntries(names.map(name=>{
        const bounds=new THREE.Box3().setFromObject(parts[name]);
        return [name,bounds.isEmpty()?parts[name].getWorldPosition(new THREE.Vector3()):bounds.getCenter(new THREE.Vector3())];
      }));
      const snapshot={...out};
      for(const [name,members] of Object.entries(GROUPS)) {
        out[name]=new THREE.Vector3();members.forEach(part=>out[name].add(snapshot[part]));out[name].divideScalar(members.length);
      }
      return out;
    },
    update(dt){
      time+=dt*(.2+activity); const angle=time*.7;
      dot.position.set(Math.cos(angle)*1.2,1.65+Math.sin(angle)*1.12,0);
      parts.loop.rotation.y=Math.sin(time*.25)*.3;
      parts.core.rotation.y=time*.2;
    },
    dispose(){group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});},
  };
}
