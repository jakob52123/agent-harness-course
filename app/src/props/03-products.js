// Chapter 03 only. One shared renderer; cloud-computer illustration uses layer 13.
// The HTML fallback uses the same icons and remains independent of WebGL hooks.
export default function register(ctx) {
  const {THREE, scene, icons, onShot, addUpdate, addDispose, registerView} = ctx;
  const cloud = new THREE.Group();
  cloud.visible=false;
  scene.add(cloud);
  const resources=[];
  function sprite(name,x,y,size) {
    const texture=new THREE.CanvasTexture(icons.iconCanvas(name,8));
    texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
    texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false});
    const item=new THREE.Sprite(material);item.position.set(x,y,0);item.scale.set(size,size,1);
    cloud.add(item);resources.push(texture,material);return item;
  }
  sprite('cloud-pc',0,1.55,2.8);
  const cursors=[];
  const square=new THREE.PlaneGeometry(.12,.12);
  const ink=new THREE.MeshBasicMaterial({color:'#DE3B22',toneMapped:false});
  resources.push(square,ink);
  for(const x of [-2.8,0,2.8]) {
    sprite('screen',x,-.65,2.1);
    const dot=new THREE.Mesh(square,ink);dot.position.set(x-.40,-.35,.05);cloud.add(dot);
    cursors.push({dot,x});
  }
  const lidGeo=new THREE.BoxGeometry(1.8,.10,.12);
  const lidMaterial=new THREE.MeshBasicMaterial({color:'#6A645B',toneMapped:false});
  resources.push(lidGeo,lidMaterial);
  const laptop=new THREE.Mesh(lidGeo,lidMaterial);laptop.position.set(0,-2.35,0);cloud.add(laptop);
  cloud.traverse(o=>o.layers.set(13));registerView('ch03-cloud',13);
  let time=0;
  onShot('p17','*',()=>{
    cloud.visible=true;laptop.visible=true;
    return ()=>{cloud.visible=false;};
  });
  addUpdate(({delta,reduced})=>{
    if(!cloud.visible)return;
    time+=delta;
    cursors.forEach(({dot,x},i)=>{
      dot.position.x=x-.40+(reduced?0:Math.floor((time*2+i)%3)*.28);
    });
  });
  addDispose(()=>{scene.remove(cloud);resources.forEach(r=>r.dispose());});
  ctx.expose({ch03Cloud:cloud,ch03Cursors:cursors.map(c=>c.dot),ch03Laptop:laptop});
}
