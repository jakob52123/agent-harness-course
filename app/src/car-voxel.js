// Self-contained candy voxel mascot. No imports, textures, network or scene lights.
// Edit DESIGN / PALETTE first; all dimensions below are world units (+Z = nose).
const DESIGN = Object.freeze({ cell: 0.07, detail: 0.035, axleFront: 1.19,
  axleRear: -1.19, wheelX: 1.05, wheelY: 0.56, wheelRadius: 0.56 });
const PALETTE = Object.freeze({ paint: '#DE3B22', pearl: '#FBF7EF', chrome: '#DDDAD8',
  rubber: '#15151C', tread: '#26252D', leather: '#3A2C26', seam: '#9C3220',
  dark: '#211E2A', grille: '#17151D', warm: '#FFF0CC', red: '#E2462B',
  skin: '#E9AD88', hair: '#2B211D', jacket: '#22304E', jacket2: '#EDE6D9', hair2: '#BA8455' });
const GROUP_MAP = Object.freeze({ loop: ['engine'], tools: ['steering'],
  context: ['windshield', 'dashcam'], skills: ['nav'], guard: ['brake'],
  llm: ['driver'], trigger: ['key'], desk: ['radio'] });

export async function createCar(THREE, opts = {}) {
  const D = DESIGN, P = { ...PALETTE, ...(opts.palette||{}) };
  const f3=v=>Number(v).toFixed(3); const AC=new THREE.Color(opts.accent||'#E2462B'); const NA=f3(opts.neutralA??.16), NB=f3(opts.neutralB??.50);
  const paint = new THREE.Color(P.paint);
  P.paintLight = '#' + paint.clone().lerp(new THREE.Color('#FFF3E8'), 0.09).getHexString();
  P.paintDark = '#' + paint.clone().multiplyScalar(0.58).getHexString();
  const group = new THREE.Group(); group.name = 'voxel-roadster';
  const names = ['body', 'driver', 'driver2', 'engine', 'steering', 'windshield',
    'dashcam', 'nav', 'brake', 'wheels', 'chassis', 'key', 'radio'];
  const parts = Object.fromEntries(names.map(n => {
    const p = new THREE.Group(); p.name = n; group.add(p); return [n, p];
  }));
  const GROUPS = Object.fromEntries(Object.entries(GROUP_MAP).map(([k, v]) => [k, [...v]]));
  const records = [], resources = new Set(), chunks = [];
  const clamp = v => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
  const state = { gray: 0, dim: 0, silhouette: 0, explode: 0, xray: 0, chassis: 0, driver: 1, speed: 0 };
  const lit = Object.fromEntries(names.map(n => [n, 0]));
  const colorCache = new Map();
  const color = c => {
    const hex = P[c] || c;
    if (!colorCache.has(hex)) colorCache.set(hex, new THREE.Color(hex));
    return colorCache.get(hex);
  };
  // A sparse occupancy grid. Later writes replace earlier cells (trim / inlays).
  function grid(owner, step = D.cell) {
    const cells = new Map(), key = (x, y, z) => `${x},${y},${z}`;
    function put(x, y, z, c, family = 'solid') { cells.set(key(x, y, z), { x, y, z, c, family }); }
    function fill(bounds, c, family = 'solid', predicate = () => true) {
      const [x0, x1, y0, y1, z0, z1] = bounds;
      for (let x = Math.ceil(x0 / step - 0.5 - 1e-7); (x + 0.5) * step < x1 - 1e-6; x++)
        for (let y = Math.ceil(y0 / step - 0.5 - 1e-7); (y + 0.5) * step < y1 - 1e-6; y++)
          for (let z = Math.ceil(z0 / step - 0.5 - 1e-7); (z + 0.5) * step < z1 - 1e-6; z++) {
            const X = (x + 0.5) * step, Y = (y + 0.5) * step, Z = (z + 0.5) * step;
            if (predicate(X, Y, Z)) put(x, y, z, typeof c === 'function' ? c(X, Y, Z) : c, family);
          }
    }
    const box = (x, y, z, w, h, d, c, family = 'solid') => fill([x-w/2,x+w/2,y-h/2,y+h/2,z-d/2,z+d/2], c, family);
    function beam(a, b, r, c, family = 'solid') {
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), V = B.clone().sub(A);
      const len = V.lengthSq(), q = new THREE.Vector3();
      fill([Math.min(a[0],b[0])-r,Math.max(a[0],b[0])+r,
        Math.min(a[1],b[1])-r,Math.max(a[1],b[1])+r,Math.min(a[2],b[2])-r,Math.max(a[2],b[2])+r], c, family,
      (x,y,z) => { q.set(x,y,z).sub(A); const t = Math.max(0,Math.min(1,q.dot(V)/len)); return q.addScaledVector(V,-t).lengthSq() <= r*r; });
    }
    const chunk = { owner, step, cells, key, fill, box, beam }; chunks.push(chunk); return chunk;
  }

  // A tall, broad capsule: stepped shoulders and inflated wheel arches.
  const b = grid(parts.body);
  b.fill([-1.19,1.19,.28,1.47,-2.03,2.03], (x,y) =>
    y < .49 ? 'paintDark' : y > 1.19 ? 'paintLight' : 'paint', 'solid', (x,y,z) => {
    const ax=Math.abs(x), az=Math.abs(z);
    const width=1.155-Math.max(0,az-1.40)*.50-Math.max(0,y-1.12)*.6;
    if(ax>width) return false;
    const top=z>.42 ? 1.43-Math.max(0,z-1.05)**2*.42 : z<-1.12 ? 1.34-Math.max(0,-z-1.35)*.3 : 1.05;
    if(y>top) return false;
    if(z>-1.12&&z<.42&&ax<.77&&y>.49) return false;
    if(z>.49&&z<1.75&&ax<.63&&y>.35&&y<top-.14) return false;
    if(ax>.77&&[D.axleFront,D.axleRear].some(wz=>Math.hypot(z-wz,y-D.wheelY)<.63))return false;
    return true;
  });
  for(const side of [-1,1])for(const wz of [D.axleFront,D.axleRear]) {
    b.fill([side<0?-1.26:.77,side<0?-.77:1.26,.49,1.4,wz-.77,wz+.77],
      'paintLight','solid',(x,y,z)=> {
        const r=Math.hypot(z-wz,y-D.wheelY);
        return r>.63&&r<.77-Math.max(0,Math.abs(x)-1.05)*.5;
      });
  }
  // Pearl shoulder stripe, rocker trim, inset door panel / handle / shut lines.
  for (const side of [-1,1]) {
    for (let z=-1.855; z<1.89; z+=.07) {
      const width = 1.155-Math.max(0,Math.abs(z)-1.40)*.5;
      if(![D.axleFront,D.axleRear].some(wz=>Math.hypot(z-wz,.98-D.wheelY)<.65))
        b.box(side*(width-.035),.98,z,.07,.07,.07,'pearl');
    }
    b.box(side*1.12,.455,-.035,.07,.07,.91,'pearl');
    b.box(side*1.12,.735,-.12,.07,.28,.84,'paintLight');
    b.box(side*1.155,1.05,-.42,.07,.07,.21,'chrome','metal');
    // Swept wing mirrors with pearl backs and dark reflective faces.
    b.beam([side*.84,.98,.28],[side*1.05,1.12,.21],.045,'chrome','metal');
    b.box(side*1.05,1.155,.21,.21,.14,.14,'paintLight');
    b.box(side*1.05,1.155,.12,.14,.07,.07,'chrome','metal');
  }
  b.box(0,.49,2.065,1.26,.14,.07,'pearl');
  b.box(0,.49,-2.065,1.26,.14,.07,'pearl');
  // Front oval grille, bright surround, vertical teeth and raised twin lamps.
  const trim = grid(parts.body,D.detail);
  trim.fill([-.385,.385,.59,.875,1.995,2.065],'pearl','solid',(x,y) => (x/.385)**2+((y-.735)/.14)**2 < 1);
  trim.fill([-.315,.315,.63,.84,2.03,2.10],'grille','solid',(x,y) =>
    (x/.315)**2+((y-(.72+.35*x*x))/.085)**2 < 1);
  for(const x of [-.14,0,.14])trim.box(x,.735,2.10,.035,.105,.035,'chrome','metal');
  for (const side of [-1,1]) {
    trim.fill([side*.665-.315,side*.665+.315,.805,1.435,1.75,2.03],'pearl','solid',
      (x,y) => Math.hypot(x-side*.665,y-1.12)<.315);
    trim.fill([side*.665-.245,side*.665+.245,.875,1.365,1.995,2.065],'#E9D9BA','solid',
      (x,y) => Math.hypot(x-side*.665,y-1.12)<.245);
    trim.box(side*.665-.07,1.225,2.0825,.105,.105,.035,'#FFFFFF','warm');
    trim.box(side*.70,.63,-2.03,.315,.14,.07,'chrome','metal');
    trim.box(side*.70,.63,-2.065,.245,.07,.035,'red','red');
    trim.box(side*.665,.455,-2.03,.21,.035,.035,'warm','warm');
    trim.box(side*.58,.28,-1.995,.14,.07,.14,'grille');
    // Restrained bonnet seams: no racing stripes or aggressive grille teeth.
    trim.box(side*.525,1.4175,.805,.035,.035,.35,'paint');
  }
  trim.box(0,1.435,1.05,.105,.035,.14,'pearl');
  // Deep cabin, piped bucket seats and dashboard.
  b.box(0,.385,-.385,1.47,.14,1.54,'dark');
  b.box(0,.945,.245,1.47,.21,.28,'leather');
  b.box(0,1.05,.245,1.4,.07,.28,'dark');
  for(const x of [-.42,.42]) {
    b.box(x,.56,-.63,.56,.21,.63,'leather');
    b.box(x,.875,-1.015,.56,.63,.21,'leather');
    b.box(x,1.225,-1.015,.35,.14,.21,'leather');
    for(const sx of [-.245,.245]) b.box(x+sx,.875,-.98,.07,.56,.07,'seam');
    for(const sx of [-.14,0,.14]) b.box(x+sx,.875,-.875,.035,.49,.035,'seam');
  }
  b.box(0,.63,-.49,.14,.35,.91,'leather');
  trim.beam([0,.77,-.385],[0,.945,-.35],.035,'chrome','metal');
  trim.box(0,.945,-.35,.105,.07,.105,'pearl');
  for(const x of [-.56,-.35]) {
    trim.box(x,1.085,.12,.14,.105,.035,'chrome','metal');
    trim.box(x,1.085,.085,.07,.07,.035,'dark');
    trim.box(x,1.102,.06,.035,.035,.035,'warm','warm');
  }

  // Four voxel lathed wheels: rubber shoulders, fine tread, open silver spokes.
  const wheelNodes=[], brakeNodes=[];
  for(const z of [D.axleFront,D.axleRear]) for(const side of [-1,1]) {
    const w = new THREE.Group(); w.name=`wheel-${side < 0 ? 'left' : 'right'}-${z > 0 ? 'front' : 'rear'}`;
    parts.wheels.add(w); w.position.set(side*D.wheelX,D.wheelY,z); wheelNodes.push(w);
    const g = grid(w,D.detail);
    g.fill([-.175,.175,-.42,.42,-.42,.42],(x,y,z) => {
      const r=Math.hypot(y,z), angle=Math.atan2(y,z);
      return r>.37 && (Math.floor(angle*18/Math.PI)+Math.floor(x/.035))%3===0 ? 'tread':'rubber';
    },'solid',(x,y,z)=> { const r=Math.hypot(y,z); return r<.422-Math.max(0,Math.abs(x)-.105)*.40 && r>.257; });
    g.fill([-.14,.14,-.30,.30,-.30,.30],'chrome','metal', (x,y,z)=> {
      const r=Math.hypot(y,z), a=Math.atan2(y,z);
      return r<.295 && (r>.245 || r<.09 || (Math.abs(Math.sin(a*4))<.23 && r<.26));
    });
    g.box(side*.1575,0,0,.035,.105,.105,'pearl','metal');
    // Brake discs sit inboard of spokes and do not rotate with the tire.
    const br = new THREE.Group(); br.name=w.name.replace('wheel','brake');
    parts.brake.add(br); br.position.set(side*.805,D.wheelY,z); brakeNodes.push(br);
    const bg=grid(br,D.detail);
    bg.fill([-.035,.035,-.245,.245,-.245,.245],'chrome','metal',(x,y,z)=> {
      const r=Math.hypot(y,z), a=Math.atan2(y,z);
      return r<.245 && !(r>.14 && r<.20 && Math.abs(Math.sin(a*6))<.20);
    });
    bg.box(side*.0525,.07,.1925,.105,.245,.105,'paint');
    bg.box(side*.105,.07,.1925,.035,.105,.07,'pearl');
  }
  const ch=grid(parts.chassis);
  ch.box(0,.245,0,1.47,.14,3.57,'dark');
  for(const x of [-.56,.56]) ch.box(x,.175,0,.14,.07,3.5,'chrome','metal');
  for(const z of [D.axleFront,D.axleRear]) ch.box(0,.35,z,1.68,.14,.14,'chrome','metal');
  const en=grid(parts.engine,D.detail);
  en.box(0,.665,1.085,.70,.49,.91,'dark');
  for(const side of [-1,1]) {
    en.box(side*.245,.91,1.085,.28,.14,.91,'paintDark');
    for(let z=.77;z<1.45;z+=.14) {
      en.box(side*.245,1.0,z,.245,.035,.035,'chrome','metal');
      en.beam([side*.35,.84,z],[side*.49,.665,z+.035],.06,'chrome','metal');
    }
  }
  en.box(0,.98,1.05,.21,.14,.56,'chrome','metal');
  en.box(0,1.085,1.085,.385,.07,.385,'pearl','metal');
  en.box(0,1.1375,1.085,.21,.035,.21,'paint');
  en.box(0,.70,1.61,.77,.49,.07,'grille');
  for(let x=-.35;x<.36;x+=.07) en.box(x,.70,1.6625,.035,.385,.035,'chrome','metal');

  // Raked windscreen is a thin stepped sheet; transparent glass is one draw.
  const ws=grid(parts.windshield,D.detail);
  ws.fill([-.805,.805,1.05,1.68,-.14,.35],'pearl','metal',(x,y,z)=> {
    const plane=.29-(y-1.05)*.60;
    return Math.abs(z-plane)<.04 && (Math.abs(x)>.735 || y<1.10 || y>1.625);
  });
  ws.fill([-.735,.735,1.10,1.625,-.14,.35],(P.glass||'#CFE3E8'),'glass',(x,y,z)=>Math.abs(z-(.29-(y-1.05)*.60))<.022);
  const dc=grid(parts.dashcam,D.detail);
  dc.box(0,1.575,-.14,.35,.105,.07,'chrome','metal');
  dc.box(0,1.575,-.1925,.28,.07,.035,'dark');
  dc.box(.245,1.54,-.14,.175,.14,.14,'dark');
  dc.box(.245,1.54,-.035,.105,.105,.07,'chrome','metal');
  dc.box(.245,1.54,.0175,.035,.035,.035,'warm','screen');
  // Steering wheel in a tilted plane. Driver's hands coincide with the rim.
  const st=grid(parts.steering,D.detail);
  st.fill([-.70,-.14,1.015,1.505,-.29,.07],(P.wheel2||'#4A403B'),'solid',(x,y,z)=> {
    const dy=y-1.26, dz=z+.105, u=dy*.88-dz*.475, n=dy*.475+dz*.88;
    return Math.abs(n)<.043 && Math.abs(Math.hypot(x+.42,u)-.2275)<.035;
  });
  for(const a of [0,2.094,4.189]) st.beam([-.42,1.26,-.105],[-.42+Math.cos(a)*.21,1.26+Math.sin(a)*.185,-.105-Math.sin(a)*.10],.022,'chrome','metal');
  st.box(-.42,1.26,-.105,.105,.105,.105,'pearl','metal');
  st.beam([-.42,1.26,-.105],[-.42,.945,.21],.05,'dark');
  const nv=grid(parts.nav,D.detail);
  nv.box(.14,1.19,.105,.385,.28,.14,'dark');
  nv.box(.14,1.19,.0175,.315,.21,.035,(P.screen||'#2C3A48'),'screen');
  // One pixel arrow; points up, visibly different from the radio's grille.
  for(const [x,y] of [[0,2],[-1,1],[0,1],[1,1],[-2,0],[-1,0],[0,0],[1,0],[2,0],[0,-1],[0,-2]])
    nv.box(.14+x*.035,1.19+y*.035,-.0175,.035,.035,.035,'warm','warm');
  nv.box(.14,1.015,.105,.14,.07,.14,'chrome','metal');
  const ky=grid(parts.key,D.detail);
  ky.box(-.175,1.12,.035,.105,.105,.07,'dark');
  ky.beam([-.175,1.12,0],[-.175,1.05,-.14],.024,'chrome','metal');
  ky.fill([-.28,-.07,.875,1.085,-.21,-.14],'pearl','metal',(x,y)=> {
    const r=Math.hypot(x+.175,y-.98);return r<.105&&r>.058;
  });
  ky.box(-.175,.84,-.175,.105,.105,.07,'paint');
  const ra=grid(parts.radio,D.detail);
  ra.box(.56,1.155,.07,.28,.28,.175,'dark');
  for(let y=1.085;y<1.23;y+=.07) ra.box(.56,y,-.035,.21,.035,.035,'chrome','metal');
  ra.box(.49,1.26,-.035,.07,.035,.035,'warm','screen');
  ra.beam([.665,1.26,.07],[.70,1.68,.07],.019,'dark');
  ra.box(.63,1.33,.07,.07,.07,.07,'chrome','metal');

  function person(part, second) {
    const p=grid(part,D.detail), jacket=second?'jacket2':'jacket', hair=second?'hair2':'hair';
    p.box(-.42,.735,-.56,.35,.28,.42,'dark');
    for(const x of [-.525,-.315]) p.beam([x,.70,-.56],[x,.49,-.035],.085,'dark');
    p.fill([-.665,-.175,.875,1.33,-.91,-.525],jacket,'solid',(x,y)=>Math.abs(x+.42)<.18+Math.max(0,y-.91)*.1);
    p.box(-.42,1.12,-.5075,.105,.385,.035,second?'paintDark':'pearl');
    p.box(-.42,1.40,-.70,.14,.14,.14,'skin');
    p.fill([-.77,-.07,1.365,2.03,-1.05,-.385],'skin','solid',(x,y,z)=>
      ((x+.42)/.35)**6+((y-1.6975)/.35)**6+((z+.7175)/.35)**6<1.15);
    p.fill([-.805,-.035,1.61,2.10,-1.085,-.385],hair,'solid',(x,y,z)=>
      ((x+.42)/.385)**6+((z+.735)/.3675)**6+((y-1.82)/.28)**6<1.2 &&
      (y>1.96 || z<-.98 || (Math.abs(x+.42)>.28 && z<-.56)));
    for(const x of [-.56,-.28]) p.box(x,1.785,-.385,.07,.07,.035,'dark');
    for(const x of [-.665,-.175]) p.box(x,1.645,-.4025,.105,.07,.035,'paint');
    // Bent sleeves connect torso to two hands at 9 and 3 on the wheel.
    for(const [sx,hx] of [[-.63,-.6475],[-.21,-.1925]]) {
      p.beam([sx,1.26,-.70],[sx,1.085,-.385],.085,jacket);
      p.beam([sx,1.085,-.385],[hx,1.26,-.14],.07,jacket);
      p.box(hx,1.26,-.105,.105,.105,.14,'skin');
    }
  }
  person(parts.driver,false); person(parts.driver2,true);

  // Re-voxelize enlarged tires on the original half-cell grid (not stretched cubes).
  function remapChunk(g, transform) {
    const old=[...g.cells.values()];g.cells.clear();
    for(const v of old){
      const lo=transform([v.x*g.step,v.y*g.step,v.z*g.step]);
      const hi=transform([(v.x+1)*g.step,(v.y+1)*g.step,(v.z+1)*g.step]);
      g.fill([lo[0],hi[0],lo[1],hi[1],lo[2],hi[2]],v.c,v.family);
    }
  }
  for(const g of chunks){
    if(wheelNodes.includes(g.owner))remapChunk(g,([x,y,z])=>[x*1.4,y*4/3,z*4/3]);
    if([parts.driver,parts.driver2,parts.steering,parts.windshield,parts.dashcam,parts.nav,parts.key,parts.radio].includes(g.owner))
      remapChunk(g,([x,y,z])=>[x,y+.21,z]);
    if(g.owner===parts.key)remapChunk(g,([x,y,z])=>[-.175+(x+.175)*1.5,1.19+(y-1.19)*1.5,-.175+(z+.175)*1.5]);
    if(g.owner===parts.dashcam)remapChunk(g,([x,y,z])=>[.14+(x-.14)*1.5,1.75+(y-1.75)*1.5,-.07+(z+.07)*1.5]);
  }

  // Seat the entire engine below the closed hood (including the air cleaner).
  const lowered=new Map();
  for(const v of en.cells.values()){const moved={...v,y:v.y-6};lowered.set(en.key(moved.x,moved.y,moved.z),moved);}
  en.cells=lowered;
  // Resolve coarse body and half-cell trim into ONE occupancy field before meshing.
  // This removes coplanar seams / z-fighting and bakes AO across trim boundaries.
  const combined=new Map();
  for(const chunk of chunks){
    if(!combined.has(chunk.owner))combined.set(chunk.owner,[]);
    combined.get(chunk.owner).push(chunk);
  }
  const bakeChunks=[];
  for(const siblings of combined.values()){
    if(siblings.length===1){bakeChunks.push(siblings[0]);continue;}
    const step=Math.min(...siblings.map(g=>g.step)), cells=new Map(), key=siblings[0].key;
    for(const g of siblings){
      const ratio=Math.round(g.step/step);
      for(const v of g.cells.values())for(let dx=0;dx<ratio;dx++)for(let dy=0;dy<ratio;dy++)for(let dz=0;dz<ratio;dz++){
        const x=v.x*ratio+dx,y=v.y*ratio+dy,z=v.z*ratio+dz;
        cells.set(key(x,y,z),{...v,x,y,z});
      }
    }
    bakeChunks.push({owner:siblings[0].owner,step,cells,key});
  }
  // Cull all interior faces. Per-vertex voxel AO uses two side neighbours + corner.
  // Material families batch all voxels of a part, rather than one draw per cube.
  const faceDefs = [
    [[1,0,0],[0,1,0],[0,0,1]], [[-1,0,0],[0,0,1],[0,1,0]],
    [[0,1,0],[0,0,1],[1,0,0]], [[0,-1,0],[1,0,0],[0,0,1]],
    [[0,0,1],[1,0,0],[0,1,0]], [[0,0,-1],[0,1,0],[1,0,0]] ];
  const buckets = new Map();
  function emitQuad(data,verts,n,c){
    const order=verts[0].ao+verts[2].ao>verts[1].ao+verts[3].ao?[0,1,3,1,2,3]:[0,1,2,0,2,3];
    for(const i of order){
      data.pos.push(...verts[i].p);data.norm.push(...n);
      if(data.rgb)data.rgb.push(c.r*verts[i].ao,c.g*verts[i].ao,c.b*verts[i].ao);
    }
  }
  for(const g of bakeChunks) {
    if(!buckets.has(g.owner)) buckets.set(g.owner,new Map());
    const ownerBuckets=buckets.get(g.owner), has=(x,y,z)=>g.cells.has(g.key(x,y,z));
    for(const v of g.cells.values()) for(const [n,u,t] of faceDefs) {
      const a=[v.x,v.y,v.z], out=a.map((c,i)=>c+n[i]);
      const neighbor=g.cells.get(g.key(...out));
      if(neighbor && !(neighbor.family==='glass' && v.family!=='glass')) continue;
      if(!ownerBuckets.has(v.family)) ownerBuckets.set(v.family,{pos:[],norm:[],rgb:[],flat:new Map(),shell:{pos:[],norm:[]}});
      const bucket=ownerBuckets.get(v.family), c=color(v.c), verts=[];
      for(const [su,st] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
        const side1=has(...out.map((c,i)=>c+u[i]*su));
        const side2=has(...out.map((c,i)=>c+t[i]*st));
        const corner=has(...out.map((c,i)=>c+u[i]*su+t[i]*st));
        const ao=side1&&side2 ? .58 : 1-.13*(Number(side1)+Number(side2)+Number(corner));
        verts.push({p:a.map((c,i)=>(c+.5+n[i]*.5+u[i]*su*.5+t[i]*st*.5)*g.step),ao});
      }
      emitQuad(bucket.shell,verts,n,c);
      // Greedy rectangles on constant-AO planes; retain vertex gradients at creases.
      if(v.family!=='glass' && verts.every(q=>q.ao===verts[0].ao)){
        const layer=a.reduce((sum,v,i)=>sum+v*n[i],0);
        const sig=[g.step,...n,layer,c.getHex(),verts[0].ao].join('/');
        if(!bucket.flat.has(sig))bucket.flat.set(sig,{step:g.step,n,u,t,layer,c,ao:verts[0].ao,cells:new Map()});
        const U=a.reduce((s,v,i)=>s+v*u[i],0), V=a.reduce((s,v,i)=>s+v*t[i],0);
        bucket.flat.get(sig).cells.set(`${U},${V}`,[U,V]);
      }else emitQuad(bucket,verts,n,c);
    }
  }
  for(const families of buckets.values())for(const bucket of families.values()){
    for(const plane of bucket.flat.values()){
      const {cells,step,n,u,t,layer,c,ao}=plane;
      for(const [U,V]of [...cells.values()].sort((a,b)=>a[1]-b[1]||a[0]-b[0])){
        if(!cells.has(`${U},${V}`))continue;
        let w=1,h=1;
        while(cells.has(`${U+w},${V}`))w++;
        outer:while(true){for(let i=0;i<w;i++)if(!cells.has(`${U+i},${V+h}`))break outer;h++;}
        for(let i=0;i<w;i++)for(let j=0;j<h;j++)cells.delete(`${U+i},${V+j}`);
        const normalCoordinate=layer+n.reduce((sum,v)=>sum+v,0)*.5+.5;
        const verts=[[U,V],[U+w,V],[U+w,V+h],[U,V+h]].map(([A,B])=>({
          p:n.map((N,i)=>(N*normalCoordinate+u[i]*A+t[i]*B)*step),ao}));
        emitQuad(bucket,verts,n,c);
      }
    }
    bucket.flat.clear();
  }
  function geometry(data) {
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(data.pos,3));
    geo.setAttribute('normal',new THREE.Float32BufferAttribute(data.norm,3));
    if(data.rgb)geo.setAttribute('color',new THREE.Float32BufferAttribute(data.rgb,3));
    geo.computeBoundingBox(); geo.computeBoundingSphere(); resources.add(geo);return geo;
  }
  for(const [owner,families] of buckets) {
    const full={pos:[],norm:[]};
    for(const [family,data] of families) {
      const glass=family==='glass';
      const glow={warm:'#FFF0CC',red:'#FF2445',screen:(P.screenGlow||'#BFE6F0')}[family];
      // Glass retains the stepped voxel sheet but has one pane normal, not striped reflections.
      if(glass)for(let i=0;i<data.norm.length;i+=3){
        const sign=data.norm[i+1]*.5145+data.norm[i+2]*.8575>=0?1:-1;
        data.norm[i]=0;data.norm[i+1]=sign*.5145;data.norm[i+2]=sign*.8575;
      }
      const mat=new THREE.MeshStandardMaterial({ vertexColors:true, flatShading:!glass,
        roughness:family==='metal'?.78:glass?.40:.82, metalness:family==='metal'?.08:0,
        transparent:glass,opacity:glass?.16:1,depthWrite:!glass,
        emissive:glow||'#000000',emissiveIntensity:family==='screen'?.12:glow?.4:0 });
      const uniforms={uDim:{value:0},uSil:{value:0},uLit:{value:0},uGray:{value:0}};
      mat.onBeforeCompile=shader=> {
        Object.assign(shader.uniforms,uniforms);
        shader.fragmentShader='uniform float uDim; uniform float uSil; uniform float uLit; uniform float uGray;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          float gray=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(gray),uDim*.82);
          diffuseColor.rgb*=1.0-uDim*.85;
          // The gray teaching pass keeps its previous luminance response.
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.94,.82,.70)*(.12+sqrt(gray)*.88),uGray*uLit*.62);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.0015,.001,.002),uSil);`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
          totalEmissiveRadiance*= (1.0-uDim)*(1.0-uSil);
          totalEmissiveRadiance+=vec3(1.0,.86,.72)*uGray*uLit*(.16+gray*.32)*(1.0-uSil);`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
          outgoingLight*=(1.0-uDim*.40)*(1.0+.06*uLit*(1.0-uGray));
          outgoingLight=mix(outgoingLight,vec3(.0007,.0005,.0009),uSil);
          // Final-light desaturation also removes the pink scene rim. The zero
          // branch preserves the original finish, including glass and emission.
          if(uGray>0.) {
            float luminance=dot(outgoingLight,vec3(.2126,.7152,.0722));
            vec3 neutral=vec3(${NA}+${NB}*sqrt(max(0.,luminance)));
            vec3 pink=vec3(${f3(AC.r)},${f3(AC.g)},${f3(AC.b)})*(1.0+luminance*.5);
            outgoingLight=mix(outgoingLight,mix(neutral,pink,uLit),uGray);
          }
          #include <opaque_fragment>`);
      };
      mat.customProgramCacheKey=()=> 'v-'+NA+NB+AC.getHexString();
      resources.add(mat);
      const mesh=new THREE.Mesh(geometry(data),mat); mesh.name=`${owner.name}-${family}`;
      owner.add(mesh);
      records.push({mesh,mat,uniforms,owner,glass,baseOpacity:glass?.16:1});
      // Transparent screen excluded: its opaque perimeter supplies the outline.
      if(!glass) { for(const v of data.shell.pos) full.pos.push(v); for(const v of data.shell.norm) full.norm.push(v); }
    }
    // Welded vertex-normal inflation: a single reverse shell per independent part.
    const sums=new Map();
    for(let i=0;i<full.pos.length;i+=3) {
      const k=full.pos.slice(i,i+3).map(v=>Math.round(v*100000)).join(',');
      if(!sums.has(k)) sums.set(k,new THREE.Vector3());
      sums.get(k).add(new THREE.Vector3(...full.norm.slice(i,i+3)));
    }
    const shell={pos:[],norm:full.norm};
    for(let i=0;i<full.pos.length;i+=3) {
      const xyz=full.pos.slice(i,i+3), k=xyz.map(v=>Math.round(v*100000)).join(',');
      const normal=sums.get(k).clone().normalize();
      shell.pos.push(xyz[0]+normal.x*.035,xyz[1]+normal.y*.035,xyz[2]+normal.z*.035);
    }
    const mat=new THREE.MeshBasicMaterial({color:(opts.accent||'#E2462B'),toneMapped:false,side:THREE.BackSide,transparent:true,opacity:0,depthWrite:false});
    const mesh=new THREE.Mesh(geometry(shell),mat);mesh.name=`${owner.name}-outline`;mesh.visible=false;
    mesh.userData.outline=true;owner.add(mesh);resources.add(mat);
    records.push({mesh,mat,owner,outline:true});
  }
  // Pivot all top-level parts around their own geometry, preserving world placement.
  const bases={};
  for(const name of names) {
    const p=parts[name];p.updateMatrixWorld(true);
    const center=new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3());
    p.position.copy(center); for(const child of p.children)child.position.sub(center);
    bases[name]=center.clone();
  }
  const wheelBases=wheelNodes.map(w=>w.position.clone());
  const brakeBases=brakeNodes.map(w=>w.position.clone());
  const targets={engine:[-2.8,1.95,-1.65],steering:[-2.35,3.55,-.65],
    windshield:[0,3.85,0],dashcam:[0,3.85,0],nav:[1.85,3.15,1.4],brake:[3.25,1.55,2.2]};
  const windshieldBase=bases.windshield.clone();
  const ownerName=owner=> {let o=owner;while(o.parent!==group)o=o.parent;return o.name;};
  for(const r of records)r.part=ownerName(r.owner);
  function refresh() {
    for(const r of records) {
      const name=r.part, active=name==='driver2'?Math.max(lit.driver2,lit.driver):lit[name];
      const keep=['wheels','chassis','engine'].includes(name);
      const fade=keep?1:1-state.chassis;
      const driverVisible=name!=='driver'&&name!=='driver2'||(name==='driver')===(state.driver===1);
      if(r.outline) {
        r.mat.opacity=Math.max(active*.95,state.silhouette*.85)*fade;
        r.mesh.visible=driverVisible&&r.mat.opacity>.001;
      } else {
        r.uniforms.uDim.value=state.dim*(1-active);
        r.uniforms.uSil.value=state.silhouette;
        r.uniforms.uLit.value=active;
        r.uniforms.uGray.value=state.gray;
        // In teaching xray, tires must not hide the inboard brake discs.
        const wheelXray=name==='wheels'?1-state.gray*state.xray*.94*(1-active):1;
        const opacity=r.baseOpacity*fade*(name==='body'?1-state.xray*.88*(1-active*(1-state.gray)):1)*wheelXray;
        const transparent=r.glass||opacity<.999;
        if(r.mat.transparent!==transparent){r.mat.transparent=transparent;r.mat.needsUpdate=true;}
        r.mat.opacity=opacity;r.mat.depthWrite=!transparent;
        r.mesh.visible=driverVisible&&opacity>.001;
      }
    }
    parts.driver.visible=state.driver===1 && state.chassis<1;
    parts.driver2.visible=state.driver===2 && state.chassis<1;
    group.updateMatrixWorld(true);
  }
  function setExplode(v) {
    state.explode=clamp(v);const t=state.explode;
    for(const [name,target] of Object.entries(targets)) {
      const destination=new THREE.Vector3(...target);
      if(name==='dashcam')destination.add(bases.dashcam.clone().sub(windshieldBase).multiplyScalar(2));
      parts[name].position.copy(bases[name]).lerp(destination,t);
      parts[name].scale.setScalar(1+t);
    }
    parts.nav.rotation.y=t*Math.PI;
    parts.steering.rotation.y=t*Math.PI;
    parts.engine.rotation.y=-t*.25;
    brakeNodes.forEach((br,i)=> {
      const compact=new THREE.Vector3((i%2-.5)*.56,Math.floor(i/2)*.56-.28,0);
      br.position.copy(brakeBases[i]).lerp(compact,t);
      br.rotation.y=-t*Math.PI/2;
    });
    group.updateMatrixWorld(true);
  }
  function anchors() {
    group.updateWorldMatrix(true,true);
    const out={};
    for(const name of names)out[name]=parts[name].getWorldPosition(new THREE.Vector3());
    for(const [name,members]of Object.entries(GROUPS)) {
      out[name]=new THREE.Vector3();
      for(const m of members)out[name].add(out[m==='driver'&&state.driver===2?'driver2':m]);
      out[name].multiplyScalar(1/members.length);
    }
    return out;
  }
  refresh();
  return { kind:'voxel',group,parts,GROUPS,
    get solidFinish(){return (1-state.gray)*Math.min(lit.body,lit.chassis,lit.wheels);},
    setLit(name,v) {for(const n of GROUPS[name]||[name])if(n in lit)lit[n]=clamp(v);refresh();},
    setDim(v){state.dim=clamp(v);refresh();},
    setGray(v){state.gray=clamp(v);refresh();},
    setSilhouette(v){state.silhouette=clamp(v);refresh();},setExplode,
    setXray(v){state.xray=clamp(v);refresh();},
    setDriver(n){state.driver=n===2?2:1;refresh();},
    setChassisOnly(v){state.chassis=clamp(v);refresh();},
    setSpeed(v){state.speed=Number.isFinite(v)?v:0;}, anchors,
    update(dt){if(!Number.isFinite(dt)||dt<=0)return; for(let i=0;i<wheelNodes.length;i++) {
      wheelNodes[i].rotation.x=(wheelNodes[i].rotation.x+state.speed*dt/D.wheelRadius)%(Math.PI*2);
      wheelNodes[i].position.copy(wheelBases[i]);
    }},
    dispose(){group.removeFromParent();for(const r of resources)r.dispose();resources.clear();}
  };
}
