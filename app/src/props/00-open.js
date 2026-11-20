// Agenda-only illustrations. Kept out of the shared world engine.
let THREE;
// Chunky, rounded silhouettes sampled into cubes: no external models or textures.
function createTools() {
  const group = new THREE.Group(), wrench = new THREE.Group();
  group.position.set(-16,0,0); group.add(wrench);
  wrench.position.set(-.95,1.5,0); wrench.rotation.z=-.28;
  const cell=.12, geo=new THREE.BoxGeometry(cell,cell,cell);
  function voxels(parent,bounds,predicate,color,metalness=0) {
    const points=[];
    for(let x=bounds[0];x<=bounds[1];x+=cell) for(let y=bounds[2];y<=bounds[3];y+=cell) for(let z=bounds[4];z<=bounds[5];z+=cell) {
      if(predicate(x,y,z)) points.push([x,y,z]);
    }
    const material=new THREE.MeshStandardMaterial({color,roughness:.7,metalness});
    const mesh=new THREE.InstancedMesh(geo,material,points.length), matrix=new THREE.Matrix4();
    points.forEach((p,i)=>mesh.setMatrixAt(i,matrix.makeTranslation(...p)));
    mesh.instanceMatrix.needsUpdate=true;parent.add(mesh);return mesh;
  }
  function rounded(x,y,z,cx,cy,cz,hx,hy,hz,r) {
    return Math.hypot(Math.max(0,Math.abs(x-cx)-hx+r),Math.max(0,Math.abs(y-cy)-hy+r),Math.max(0,Math.abs(z-cz)-hz+r))<=r;
  }
  // Open U jaw, thick neck and a rounded butt with a hanging hole.
  voxels(wrench,[-.72,.72,-1.38,1.38,-.18,.18],(x,y,z)=> {
    const jaw=Math.hypot(x,y-.73)<.69 && !(Math.abs(x)<.30 && y>.51);
    const shaft=rounded(x,y,z,0,-.24,0,.24,.87,.24,.18);
    const butt=Math.hypot(x,y+1.02)<.36 && Math.hypot(x,y+1.02)>.13;
    return jaw||shaft||butt;
  },'#FBF7EF',.18);
  voxels(wrench,[-.24,.24,-.78,.06,-.24,.24],(x,y,z)=>rounded(x,y,z,0,-.36,0,.29,.48,.27,.18),'#DE3B22');
  const box=new THREE.Group();box.position.set(1,.08,.18);box.rotation.y=-.18;group.add(box);
  voxels(box,[-.90,.90,0,.96,-.54,.54],(x,y,z)=>rounded(x,y,z,0,.48,0,.91,.48,.55,.23),'#DE3B22');
  voxels(box,[-.90,.90,.72,1.08,-.54,.54],(x,y,z)=>rounded(x,y,z,0,.88,0,.94,.19,.58,.15),'#9C3220');
  voxels(box,[-.54,.54,1.02,1.50,-.12,.12],(x,y,z)=>rounded(x,y,z,0,1.23,0,.55,.30,.16,.17) && !(Math.abs(x)<.30&&y<1.28),'#FBF7EF');
  voxels(box,[-.12,.12,.48,.84,.54,.66],()=>true,'#FBF7EF',.15);
  return {group,wrench,box};
}

export default async function register(ctx) {
  THREE=ctx.THREE;
  const {scene,createCar,addUpdate,onShot,registerView,expose,addDispose}=ctx;
  const cars=[];
  for(const paint of ['#DE3B22','#FBF7EF','#3A2C26','#DE3B22','#FBF7EF','#3A2C26']) {
    const item=await createCar(THREE,{palette:{paint}});cars.push(item);addDispose(()=>item.dispose());
  }
  const family=cars.slice(0,3),chassis=cars.slice(3,6);
  // A loosely parked family: different depths, angles and sizes, not a showroom row.
  const parking=[{pos:[15.9,0,-.5],yaw:-.32,scale:.78},{pos:[18,0,-2.45],yaw:.08,scale:.82},{pos:[20.1,0,-.85],yaw:-.45,scale:.70}];
  for(const [items,layer] of [[family,2],[chassis,4]]) items.forEach((item,i)=>{
    const p=parking[i];item.group.position.fromArray(p.pos);item.group.rotation.y=p.yaw;item.group.scale.setScalar(p.scale);
    item.setSpeed(0);item.setDim(0);if(layer===4)item.setChassisOnly(1);
    item.group.traverse(o=>o.layers.set(layer));scene.add(item.group);
  });
  const tools=createTools();tools.group.traverse(o=>o.layers.set(3));scene.add(tools.group);

  registerView('cars',2,family);registerView('tools',3);registerView('chassis',4,chassis);
  expose({family,chassis,wrench:tools.wrench});
  onShot('p2','*',()=>{tools.group.visible=true;return ()=>{tools.group.visible=false;};});
  let wrenchTime=0;
  addUpdate(({state,delta,reduced,idleTime})=>{
    const bob=phase=>reduced?0:state.idle.amplitude*(1-Math.cos(idleTime*2*Math.PI/state.idle.period+phase))/2;
    for(const items of [family,chassis])items.forEach((item,i)=>{
      item.group.visible=state.world.props>.01;
      item.group.position.y=parking[i].pos[1]+bob(i*.7)*parking[i].scale;item.update(delta);
    });
    tools.group.visible=state.world.props>.01;
    wrenchTime+=delta*state.world.wrenchSpin;
    tools.wrench.rotation.y=reduced?0:.48*Math.sin(wrenchTime);
  });
}
