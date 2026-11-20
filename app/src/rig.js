// Harness instrument. Self-contained: only the caller's THREE, no imports or lights.
// +Z = front. Shape controls are in DESIGN / the named construction blocks below.
const DESIGN = Object.freeze({ cell: .07, detail: .035, ringRadius: .98, ringY: 1.75,
  coreY: 2.03, coreRadius: .63, width: 4.06, domeHeight: 2.94 });
const PALETTE = Object.freeze({ graphite: '#28262E', gunmetal: '#53515B', inset: '#131219',
  pearl: '#E9E2DF', silver: '#99939D', pink: '#ED3D8C', soft: '#FF66A8', warm: '#FFF0DA' });
const GROUP_MAP = { llm: ['core'], loop: ['loop'], tools: ['tools'],
  context: ['context', 'memory'], skills: ['skills'], guard: ['guard'] };

export function createRig(THREE, opts = {}) {
  const D = DESIGN, P = PALETTE;
  const variant = ['base', 'coding', 'super', 'personal'].includes(opts.variant) ? opts.variant : 'base';
  const group = new THREE.Group(); group.name = `harness-${variant}`;
  const names = ['core', 'loop', 'tools', 'context', 'memory', 'skills', 'guard', 'base', 'extras'];
  const parts = Object.fromEntries(names.map(name => {
    const p = new THREE.Group(); p.name = name; group.add(p); return [name, p];
  }));
  const GROUPS = Object.fromEntries(Object.entries(GROUP_MAP).map(([k, v]) => [k, [...v]]));
  const resources = new Set(), records = [], grids = [], screens = [];
  const state = { dim: 0, silhouette: 0, explode: 0, assemble: 1, activity: 0 };
  const lit = Object.fromEntries(names.map(n => [n, 0]));
  const clamp = v => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
  const keep = r => (resources.add(r), r);
  const node = (parent, name, position = [0, 0, 0]) => {
    const p = new THREE.Group(); p.name = name; p.position.set(...position); parent.add(p); return p;
  };
  // Sparse voxel solids, hidden-face culling and three-neighbour corner AO.
  // One mesh per material family per moving node, NOT one mesh per voxel.
  function grid(owner, step = D.cell) {
    const cells = new Map(), key = (x, y, z) => `${x},${y},${z}`;
    function fill(bounds, c, glow = false, predicate = () => true) {
      const [x0, x1, y0, y1, z0, z1] = bounds;
      for (let x = Math.ceil(x0 / step - .5 - 1e-7); (x + .5) * step < x1 - 1e-6; x++)
        for (let y = Math.ceil(y0 / step - .5 - 1e-7); (y + .5) * step < y1 - 1e-6; y++)
          for (let z = Math.ceil(z0 / step - .5 - 1e-7); (z + .5) * step < z1 - 1e-6; z++) {
            const X = (x + .5) * step, Y = (y + .5) * step, Z = (z + .5) * step;
            if (predicate(X, Y, Z)) cells.set(key(x, y, z), { x, y, z, c: typeof c === 'function' ? c(X, Y, Z) : c, glow });
          }
    }
    const box = (x, y, z, w, h, d, c, glow = false) => fill([x-w/2,x+w/2,y-h/2,y+h/2,z-d/2,z+d/2], c, glow);
    function beam(a, b, r, c, glow = false) {
      const A = new THREE.Vector3(...a), V = new THREE.Vector3(...b).sub(A), len = V.lengthSq(), q = new THREE.Vector3();
      fill([Math.min(a[0],b[0])-r,Math.max(a[0],b[0])+r,Math.min(a[1],b[1])-r,Math.max(a[1],b[1])+r,
        Math.min(a[2],b[2])-r,Math.max(a[2],b[2])+r], c, glow, (x,y,z) => {
        q.set(x,y,z).sub(A); return q.addScaledVector(V, -Math.max(0,Math.min(1,q.dot(V)/len))).lengthSq() <= r*r;
      });
    }
    const g = { owner, step, cells, key, fill, box, beam }; grids.push(g); return g;
  }
  // BASE: chamfered graphite chassis, fine perimeter light, inset service panels.
  const base = grid(parts.base);
  const footprint = (x,z,inset=0) => Math.abs(x)<D.width/2-inset && Math.abs(z)<1.61-inset && Math.abs(x)+Math.abs(z)<3.15-inset;
  base.fill([-2.03,2.03,0,.35,-1.61,1.61], (x,y,z) => y<.08?'inset':y>.28?'gunmetal':'graphite', false,
    (x,y,z) => footprint(x,z, y<.07?.14:0));
  base.fill([-2.03,2.03,.14,.21,-1.61,1.61], 'pink', true,
    (x,y,z) => footprint(x,z) && !footprint(x,z,.055));
  base.fill([-.56,.56,.35,.56,-.56,.56], 'graphite', false, (x,y,z)=>Math.hypot(x,z)<.54);
  base.fill([-.49,.49,.49,.56,-.49,.49], 'pearl', false, (x,y,z)=>Math.hypot(x,z)<.48 && Math.hypot(x,z)>.37);
  const bf=grid(parts.base,D.detail);
  for(const x of [-1.4,1.4]) for(let z=-1.05;z<1.1;z+=.175) bf.box(x,.36,z,.28,.035,.035,'inset');
  for(const x of [-1.75,1.75]) for(const z of [-.98,.98]) {
    bf.box(x,.3675,z,.105,.035,.105,'silver'); bf.box(x,.39,z,.035,.035,.035,'inset');
  }
  for(const x of [-.28,0,.28]) bf.box(x,.3675,1.26,.14,.035,.07,'soft',true);
  // CORE: stepped octahedral warm crystal. Pink seams expose its inner volume.
  const crystal = node(parts.core,'breathing-crystal',[0,D.coreY,0]);
  const cg=grid(crystal);
  cg.fill([-.7,.7,-.7,.7,-.7,.7], (x,y,z) => {
    const seam=Math.abs(x)<.065 || (y<-.12 && Math.abs(z)<.065);
    return seam?'soft':y>.26?'warm':x<0?'pearl':'warm';
  }, true, (x,y,z)=>Math.abs(x)+Math.abs(y)+Math.abs(z)<D.coreRadius);
  const cradle=grid(parts.core);
  for(const s of [-1,1]) {
    cradle.beam([s*.35,.56,0],[s*.49,1.12,0],.075,'gunmetal');
    cradle.box(s*.49,1.155,0,.14,.21,.28,'pearl');
    cradle.box(s*.49,1.295,0,.14,.07,.14,'pink',true);
  }
  // LOOP: annular raceway, pearl inner rail, pink directional chevrons on top.
  const raceway=node(parts.loop,'raceway',[0,D.ringY-1.54,0]);
  const lp=grid(raceway);
  lp.fill([-1.19,1.19,1.40,1.68,-1.19,1.19], (x,y,z)=> {
    const r=Math.hypot(x,z); return y>1.60 && r<.91?'pearl':y<1.48?'graphite':'gunmetal';
  }, false, (x,y,z)=>{const r=Math.hypot(x,z);return r>.82&&r<1.15&&(y<1.61||r<.91||r>1.08);});
  const lf=grid(raceway,D.detail);
  for(let a=0;a<Math.PI*2;a+=Math.PI/3) {
    const X=Math.cos(a)*D.ringRadius,Z=Math.sin(a)*D.ringRadius;
    for(let i=-2;i<=2;i++) {
      const u=i*.035, v=(2-Math.abs(i))*.035;
      lf.box(X+Math.cos(a)*u-Math.sin(a)*v,1.6275,Z+Math.sin(a)*u+Math.cos(a)*v,.035,.035,.035,'pink',true);
    }
  }
  const runner=node(parts.loop,'loop-runner',[D.ringRadius,D.ringY+.14,0]);const rg=grid(runner,D.detail);
  rg.box(0,0,0,.105,.105,.105,'warm',true);rg.box(-.105,0,0,.105,.035,.035,'soft',true);
  // TOOLS: three articulated instruments. Animation pivots are individual shoulders.
  const armNodes=[];
  function arm(x,z,side,head) {
    const mount=grid(parts.tools);
    mount.box(x,.49,z,.35,.28,.35,'graphite');mount.box(x,.665,z,.28,.07,.28,'pearl');
    const joint=node(parts.tools,`arm-${head}`,[x,.70,z]);armNodes.push({joint,side});
    const g=grid(joint,D.detail);
    g.box(0,.035,0,.21,.21,.28,'gunmetal');g.box(0,.035,.1575,.105,.105,.035,'pink',true);
    g.beam([0,.07,0],[side*.21,.49,-.07],.08,'gunmetal');
    g.beam([side*.085,.07,.07],[side*.295,.49,0],.025,'pearl');
    g.box(side*.21,.49,-.07,.245,.21,.21,'graphite');g.box(side*.21,.49,.0525,.105,.105,.035,'silver');
    g.beam([side*.21,.49,-.07],[-side*.105,.77,.035],.065,'pearl');
    g.beam([side*.21,.49,-.15],[-side*.105,.77,-.045],.025,'gunmetal');
    const tx=-side*.105,ty=.805,tz=.035;
    g.box(tx,ty,tz,.175,.14,.175,'graphite');
    if(head==='claw') {
      for(const s of [-1,1]) { g.beam([tx+s*.07,ty+.035,tz],[tx+s*.175,ty+.21,tz],.038,'silver');
        g.beam([tx+s*.175,ty+.21,tz],[tx+s*.105,ty+.315,tz],.038,'pearl'); }
      g.box(tx,ty+.07,tz+.105,.07,.07,.035,'pink',true);
    } else if(head==='cursor') {
      g.fill([tx-.14,tx+.175,ty+.07,ty+.42,tz-.035,tz+.035], 'pearl', false,
        (x,y)=>x-tx < .14-(y-ty-.07)*.75 && x-tx>-.14+(y-ty-.07)*.1);
      g.beam([tx,ty+.10,tz+.035],[tx+.105,ty+.035,tz+.035],.035,'pink',true);
    } else {
      g.box(tx,ty+.175,tz,.07,.28,.07,'silver');
      g.fill([tx-.14,tx+.14,ty+.245,ty+.49,tz-.035,tz+.035],'pearl',false,
        (x,y)=>!(Math.abs(x-tx)<.06&&y>ty+.35));
    }
  }
  arm(-1.36,.63,-1,'claw');arm(1.40,.42,1,'cursor');arm(1.47,-.77,1,'wrench');
  // CONTEXT: framed, slightly inclined front display; canvas draws only abstract bars.
  const panel=node(parts.context,'context-panel',[0,.98,1.10]);panel.rotation.x=-.18;
  const pg=grid(panel,D.detail);
  pg.box(0,0,0,1.19,.665,.14,'graphite');pg.box(0,0,.07,1.12,.595,.035,'pearl');
  pg.box(0,0,.105,.98,.455,.035,'inset');
  for(const x of [-.525,.525]) for(const y of [-.245,.245]) pg.box(x,y,.105,.035,.035,.035,'silver');
  const cs=grid(parts.context);cs.box(0,.56,1.015,.21,.35,.21,'gunmetal');cs.box(0,.385,1.05,.70,.07,.35,'graphite');
  function screen(parent,w,h,position,mode) {
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;
    const ctx=canvas.getContext('2d');
    const texture=keep(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;
    texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;
    const material=finishMaterial(false,texture);
    const mesh=new THREE.Mesh(keep(new THREE.PlaneGeometry(w,h)),material.mat);mesh.position.set(...position);parent.add(mesh);
    records.push({...material,mesh,owner:parent});
    const s={canvas,ctx,texture,mode,phase:NaN};screens.push(s);paintScreen(s,0);return s;
  }
  function paintScreen(s,time) {
    const phase=s.mode==='context'?Math.floor(time*14):Math.floor(time*2);
    if(s.phase===phase)return;s.phase=phase;
    const c=s.ctx;c.fillStyle='#131219';c.fillRect(0,0,128,64);
    c.fillStyle='#ED3D8C';c.fillRect(7,5,21,2);c.fillStyle='#53515B';c.fillRect(33,5,86,2);
    if(s.mode==='terminal') {
      c.fillStyle='#FF66A8';c.fillRect(9,16,3,3);c.fillRect(12,19,3,3);c.fillRect(9,22,3,3);
      if(phase%2===0){c.fillStyle='#FFF0DA';c.fillRect(20,23,9,3);}
      for(let r=0;r<3;r++){c.fillStyle='#53515B';c.fillRect(9,35+r*7,34+r*17,2);}
    } else {
      for(let row=-1;row<9;row++) {
        const y=13+row*7-(phase%7); if(y<11||y>58)continue;
        const n=row+Math.floor(phase/7);c.fillStyle='#ED3D8C';c.fillRect(7,y,3,3);
        for(let col=0;col<3;col++) {
          const width=9+((n*13+col*7+1000)%17);c.fillStyle=col===0?'#E9E2DF':'#99939D';
          c.fillRect(16+col*34,y,width,3);
        }
      }
    }
    s.texture.needsUpdate=true;
  }
  screen(panel,.94,.42,[0,0,.127],'context');
  // MEMORY: pearl index cards in a slotted graphite tray, behind the core.
  const rack=node(parts.memory,'memory-rack',[-.28,0,-.07]);
  const mem=grid(rack,D.detail);
  mem.box(0,.56,-1.015,.98,.21,.56,'graphite');
  for(let i=0;i<5;i++) {
    const z=-.84-i*.105, y=.91+i*.175;
    mem.box(0,(.56+y-.245)/2,z,.77,y-.245-.56,.07,'gunmetal');
    mem.box(0,y,z,.84,.49,.07,'pearl');mem.box(-.245,y+.14,z+.0525,.21,.07,.035,'pink',true);
    for(let r=0;r<3;r++)mem.box(.07,y+.035-r*.105,z+.0525,.42-r*.07,.035,.035,'gunmetal');
  }
  const newCard=node(rack,'new-memory-card',[0,1.785,-1.40]);const mc=grid(newCard,D.detail);
  mc.box(0,0,0,.84,.49,.07,'pearl');mc.box(-.245,.14,.0525,.21,.07,.035,'pink',true);
  for(let r=0;r<3;r++)mc.box(.07,.035-r*.105,.0525,.42-r*.07,.035,.035,'gunmetal');
  // SKILLS: four removable upright cartridges, labelled only with pink pixels.
  const sk=grid(parts.skills,D.detail);
  sk.box(-1.26,.49,-.49,.84,.28,.77,'graphite');
  for(let i=0;i<4;i++) {
    const x=-1.575+i*.21;
    sk.box(x,.6475,-.49,.175,.035,.63,'inset');
    sk.box(x,.875,-.49,.14,.49,.49,'gunmetal');sk.box(x,1.1375,-.49,.14,.035,.49,'pearl');
    sk.box(x,.98,-.2275,.105,.14,.035,'pink',true);
    for(let j=0;j<3;j++)sk.box(x,.735+j*.07,-.2275,.07,.035,.035,'silver');
  }
  // GUARD: low pearl fence with a front gate; very faint octagonal canopy.
  const gu=grid(parts.guard);
  const rimPoints=[[-1.89,-1.05],[-1.33,-1.47],[1.33,-1.47],[1.89,-1.05],[1.89,1.05],[1.33,1.47],[-1.33,1.47],[-1.89,1.05]];
  for(let i=0;i<rimPoints.length;i++) {
    const [x,z]=rimPoints[i], [nx,nz]=rimPoints[(i+1)%rimPoints.length];
    gu.box(x,.56,z,.14,.42,.14,'gunmetal');gu.box(x,.805,z,.14,.07,.14,'pearl');
    if(i!==5)gu.beam([x,.735,z],[nx,.735,nz],.04,'pearl');
    else for(const s of [-1,1]) {
      gu.beam([s*1.33,.735,1.47],[s*.56,.735,1.47],.04,'pearl');
      gu.box(s*.56,.56,1.47,.14,.42,.14,'pearl');gu.box(s*.56,.805,1.47,.14,.07,.14,'pink',true);
    }
  }
  // A few registration marks, not a cage of lines obscuring the core.
  for(const x of [-1.89,1.89])for(const z of [-.49,.49])gu.box(x,.875,z,.035,.07,.07,'soft',true);
  const profile=[[1,.35],[1,2.10],[.58,2.73],[.10,D.domeHeight],[0,D.domeHeight]].map(([r,y])=>new THREE.Vector2(r,y));
  const domeGeo=keep(new THREE.LatheGeometry(profile,8,Math.PI/8));
  domeGeo.scale(2.10,1,1.67);domeGeo.computeBoundingBox();
  const domeMat=keep(new THREE.MeshBasicMaterial({color:P.pearl,transparent:true,opacity:.024,depthWrite:false,side:THREE.FrontSide}));
  const dome=new THREE.Mesh(domeGeo,domeMat);dome.name='sandbox-canopy';parts.guard.add(dome);
  records.push({mesh:dome,mat:domeMat,owner:parts.guard,dome:true});
  // EXTRAS: keep the same eight basic parts; all kit-specific geometry lives here.
  const ex=grid(parts.extras,D.detail);
  function desk(x,z,w=.84,h=.63) {
    ex.box(x,h,z,w,.105,.49,'graphite');ex.box(x,h+.07,z,w,.035,.49,'pearl');
    for(const s of [-1,1])ex.box(x+s*(w/2-.105),h/2,z,.07,h,.35,'gunmetal');
    ex.box(x,h-.07,z+.245,w-.14,.035,.035,'pink',true);
  }
  function terminal(x,z,w=.63,h=.42,y=.98,mode='terminal') {
    ex.box(x,y,z,w+.105,h+.105,.105,'graphite');ex.box(x,y,z+.07,w+.035,h+.035,.035,'pearl');
    ex.box(x,y-.35,z,.105,.28,.105,'gunmetal');
    screen(parts.extras,w,h,[x,y,z+.092],mode);
    ex.box(x,.735,z+.28,w+.07,.035,.21,'gunmetal');
    for(let row=0;row<3;row++)for(let col=0;col<8;col++)ex.box(x-w*.43+col*w*.12,.77,z+.21+row*.07,.035,.035,.035,col===7?'pink':'pearl');
  }
  if(variant==='coding') {desk(.98,1.855,1.12,.665);terminal(.98,1.75,.77,.455,1.12);}
  if(variant==='personal') {
    desk(.63,1.96,1.82,.665);terminal(.175,1.82,.63,.42,1.12,'context');terminal(1.015,1.82,.63,.42,1.12);
    ex.box(1.785,.455,1.89,.35,.91,.63,'graphite');ex.box(1.785,.455,2.2225,.28,.77,.035,'gunmetal');
    for(let y=.28;y<.8;y+=.105)ex.box(1.785,y,2.2575,.21,.035,.035,'inset');ex.box(1.785,.84,2.2575,.07,.035,.035,'pink',true);
    // Stepped analog clock, square pearl face and two dark hands.
    ex.fill([-.7,-.28,.77,1.19,1.82,1.96],'pearl',false,(x,y)=>Math.hypot(x+.49,y-.98)<.21);
    ex.beam([-.49,.98,1.9775],[-.49,1.12,1.9775],.022,'graphite');ex.beam([-.49,.98,1.9775],[-.385,.91,1.9775],.022,'graphite');
    ex.box(-.49,.98,2.0125,.035,.035,.035,'pink',true);
  }
  if(variant==='super') {
    desk(0,1.96,.98,.665);
    ex.fill([-.28,.28,.77,1.33,1.68,2.24],'warm',true,(x,y,z)=>Math.abs(x)+Math.abs(y-1.05)+Math.abs(z-1.96)<.28);
    for(const [x,z] of [[-1.47,1.96],[1.47,1.96],[0,2.94]]) {
      desk(x,z,.70,.455);
      ex.fill([x-.175,x+.175,.56,.91,z-.175,z+.175],'warm',true,(X,Y,Z)=>Math.abs(X-x)+Math.abs(Y-.735)+Math.abs(Z-z)<.175);
      ex.beam([0,.77,1.96],[x,.77,z],.022,'pink',true);
      ex.box(x,.525,z+.175,.21,.035,.035,'pink',true);
    }
  }
  // Shader finish keeps AO and saturation independent of lighting state.
  function finishMaterial(glow, map=null) {
    const mat=keep(new THREE.MeshStandardMaterial({vertexColors:!map,map,flatShading:true,roughness:.65,metalness:.16,
      emissive:glow||map?'#FFFFFF':'#000000',emissiveIntensity:glow?.48:map?.45:0,emissiveMap:map}));
    const uniforms={uDim:{value:0},uSil:{value:0},uLit:{value:0},uCore:{value:0}};
    mat.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.fragmentShader='uniform float uDim; uniform float uSil; uniform float uLit; uniform float uCore;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float gray=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(gray),uDim*.90);
        diffuseColor.rgb*=1.0-uDim*.90;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.94,.83,.72)*(.20+sqrt(gray)*.80),uLit*.72);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.0012,.001,.0015),uSil);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        ${glow?'totalEmissiveRadiance*=vColor.rgb;':''}
        totalEmissiveRadiance*=(1.0-uDim)*(1.0-uSil);
        totalEmissiveRadiance+=vec3(1.0,.84,.70)*uLit*(.22+gray*.32)*(1.0-uSil);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        outgoingLight*=1.0-uDim*.5;
        outgoingLight=mix(outgoingLight,vec3(.0008,.0005,.0009)+vec3(.035,.018,.024)*uCore,uSil);
        #include <opaque_fragment>`);
    };
    mat.customProgramCacheKey=()=>`rig-v1-${glow}-${!!map}`;
    return {mat,uniforms,glow};
  }
  const faces=[[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[0,0,1],[1,0,0]],
    [[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[0,1,0],[1,0,0]]];
  const buckets=new Map(), colors=new Map();
  for(const g of grids) {
    if(!buckets.has(g.owner))buckets.set(g.owner,new Map());const families=buckets.get(g.owner);
    const has=a=>g.cells.has(g.key(...a));
    for(const v of g.cells.values())for(const [n,u,t] of faces) {
      const a=[v.x,v.y,v.z],out=a.map((c,i)=>c+n[i]);if(has(out))continue;
      if(!families.has(v.glow))families.set(v.glow,{pos:[],norm:[],rgb:[]});const b=families.get(v.glow);
      if(!colors.has(v.c))colors.set(v.c,new THREE.Color(P[v.c]||v.c));const c=colors.get(v.c);
      const verts=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([su,st])=>{
        const s1=has(out.map((c,i)=>c+u[i]*su)),s2=has(out.map((c,i)=>c+t[i]*st)),co=has(out.map((c,i)=>c+u[i]*su+t[i]*st));
        return {p:a.map((c,i)=>(c+.5+n[i]*.5+u[i]*su*.5+t[i]*st*.5)*g.step),ao:s1&&s2?.58:1-.13*(+s1 + +s2 + +co)};
      });
      const order=verts[0].ao+verts[2].ao>verts[1].ao+verts[3].ao?[0,1,3,1,2,3]:[0,1,2,0,2,3];
      for(const i of order){b.pos.push(...verts[i].p);b.norm.push(...n);b.rgb.push(c.r*verts[i].ao,c.g*verts[i].ao,c.b*verts[i].ao);}
    }
  }
  function geometry(data) {
    const geo=keep(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(data.pos,3));
    geo.setAttribute('normal',new THREE.Float32BufferAttribute(data.norm,3));
    if(data.rgb)geo.setAttribute('color',new THREE.Float32BufferAttribute(data.rgb,3));
    geo.computeBoundingBox();geo.computeBoundingSphere();return geo;
  }
  for(const [owner,families] of buckets) {
    const full={pos:[],norm:[]};
    for(const [glow,data] of families) {
      const material=finishMaterial(glow);const mesh=new THREE.Mesh(geometry(data),material.mat);mesh.name=`${owner.name}-${glow?'inlays':'solid'}`;
      owner.add(mesh);records.push({...material,mesh,owner});
      for(const v of data.pos)full.pos.push(v);for(const v of data.norm)full.norm.push(v);
    }
    if(!full.pos.length)continue;
    // Weld normals before inflating the reverse shell: continuous pink contour, no cracks.
    const sums=new Map(),key=a=>a.map(v=>Math.round(v*100000)).join(',');
    for(let i=0;i<full.pos.length;i+=3){const k=key(full.pos.slice(i,i+3));if(!sums.has(k))sums.set(k,new THREE.Vector3());sums.get(k).add(new THREE.Vector3(...full.norm.slice(i,i+3)));}
    const shell={pos:[],norm:full.norm};
    for(let i=0;i<full.pos.length;i+=3){const xyz=full.pos.slice(i,i+3),n=sums.get(key(xyz)).clone().normalize();shell.pos.push(xyz[0]+n.x*.016,xyz[1]+n.y*.016,xyz[2]+n.z*.016);}
    const mat=keep(new THREE.MeshBasicMaterial({color:P.soft,side:THREE.BackSide,transparent:true,opacity:0,depthWrite:false}));
    const mesh=new THREE.Mesh(geometry(shell),mat);mesh.name=`${owner.name}-outline`;mesh.userData.outline=true;owner.add(mesh);
    records.push({mesh,mat,owner,outline:true});
  }
  // Stable pivots / anchor coordinates, independent of instantaneous visible meshes.
  function boxOf(object) {
    object.updateWorldMatrix(true,true);const b=new THREE.Box3();
    object.traverse(o=>{if(o.isMesh&&!o.userData.outline){o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});return b;
  }
  const homes={}, bottoms={};
  for(const name of names) {
    const p=parts[name],box=boxOf(p),center=box.isEmpty()?new THREE.Vector3():box.getCenter(new THREE.Vector3());
    homes[name]=center.clone();bottoms[name]=box.isEmpty()?0:center.y-box.min.y;
    p.position.copy(center);for(const child of p.children)child.position.sub(center);
  }
  for(const r of records){let o=r.owner;while(o.parent!==group)o=o.parent;r.part=o.name;}
  const crystalHome=crystal.position.clone(),cardHome=newCard.position.clone();
  const exploded={loop:[0,6,0],tools:[-4.0,3.8,0],context:[-2.7,1.2,.8],skills:[2.5,1.0,.8],guard:[4.1,4.2,-.2]};
  const scattered={loop:[-3.1,0,-1.8],tools:[-3.6,0,1.7],context:[0,0,3.1],skills:[2.7,0,2.1],guard:[3.6,0,-2.3]};
  function layout() {
    for(const [key,members] of Object.entries(GROUPS)) {
      if(key==='llm')continue;
      const origin=new THREE.Vector3();for(const n of members)origin.add(homes[n]);origin.multiplyScalar(1/members.length);
      const minY=Math.min(...members.map(n=>homes[n].y-bottoms[n]));
      const ground=new THREE.Vector3(...scattered[key]);ground.y=origin.y-minY;
      const e=new THREE.Vector3(...exploded[key]);
      const position=ground.lerp(origin,state.assemble);position.y+=Math.sin(Math.PI*state.assemble)*1.25;
      position.lerp(e,state.explode);
      for(const n of members)parts[n].position.copy(position).add(homes[n].clone().sub(origin));
    }
    // Kit is not a sixth basic module; its desk leaves / returns with assembly.
    parts.extras.position.copy(homes.extras);parts.extras.position.z+=(1-state.assemble)*2;
    parts.extras.position.y+=Math.sin(Math.PI*state.assemble)*.6;
    group.updateMatrixWorld(true);
  }
  function refresh() {
    for(const r of records) {
      const active=lit[r.part];
      if(r.outline){r.mat.opacity=Math.max(active*.95,state.silhouette*.82);r.mesh.visible=r.mat.opacity>.001;}
      else if(r.dome){r.mat.opacity=(.024+active*.055)*(1-state.silhouette*.85)*(1-state.dim*(1-active));r.mat.color.set(active?P.soft:P.pearl);}
      else {r.uniforms.uDim.value=state.dim*(1-active);r.uniforms.uSil.value=state.silhouette;r.uniforms.uLit.value=active;r.uniforms.uCore.value=r.owner===crystal?1:0;}
    }
  }
  let clock=0,work=0;
  function animate() {
    const angle=work*2.1;
    runner.position.set(Math.cos(angle)*D.ringRadius,D.ringY+.14,Math.sin(angle)*D.ringRadius).sub(homes.loop);
    runner.rotation.y=-angle;
    const breath=Math.sin(clock*1.7);
    crystal.scale.setScalar(1+breath*.025);crystal.position.copy(crystalHome);crystal.position.y+=breath*.035;
    for(const r of records)if(r.owner===crystal&&r.glow)r.mat.emissiveIntensity=.48+breath*.12;
    armNodes.forEach(({joint,side},i)=>{joint.rotation.z=Math.sin(work*2.5+i*1.8)*.13*state.activity*side;joint.rotation.x=Math.sin(work*1.7+i)*.09*state.activity;});
    newCard.visible=state.activity>.05;newCard.position.copy(cardHome);newCard.position.y+=state.activity*(.035+.07*(1+Math.sin(work*1.5)));
    for(const s of screens)paintScreen(s,s.mode==='terminal'?clock:work);
    group.updateMatrixWorld(true);
  }
  function anchors() {
    group.updateWorldMatrix(true,true);const out={};
    for(const n of names)out[n]=parts[n].getWorldPosition(new THREE.Vector3());
    out.core=crystal.getWorldPosition(new THREE.Vector3());
    // Compute groups from an immutable part snapshot (context also names a part).
    const snapshot={...out};
    for(const [key,members] of Object.entries(GROUPS)) {out[key]=new THREE.Vector3();for(const n of members)out[key].add(snapshot[n]);out[key].multiplyScalar(1/members.length);}
    return out;
  }
  layout();refresh();animate();let disposed=false;
  return {kind:'rig',variant,group,parts,GROUPS,
    setLit(name,v){for(const n of GROUPS[name]||[name])if(n in lit)lit[n]=clamp(v);refresh();},
    setDim(v){state.dim=clamp(v);refresh();},setSilhouette(v){state.silhouette=clamp(v);refresh();},
    setExplode(v){state.explode=clamp(v);layout();},setAssemble(v){state.assemble=clamp(v);layout();},
    setActivity(v){state.activity=clamp(v);animate();},anchors,
    update(dt){if(disposed||!Number.isFinite(dt)||dt<=0)return;clock+=dt;work+=dt*state.activity;animate();},
    dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const r of resources)r.dispose();resources.clear();}
  };
}
