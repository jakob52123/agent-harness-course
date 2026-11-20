import * as THREE from 'three';
import { factories } from '@assets';
import { PIXEL, BAYER, W, H, RESOLVED } from './shots.js';
import { createDrive } from './drive.js';
import registers from '@chapters/props';
import * as icons from './icons.js';

const BG = '#F2EEE6';

// Blink only the front warm pixels, retaining the model's existing finish shader.
// The optional material adapter leaves geometry and all public car APIs untouched.
function headlightBlink(car) {
  const uniform={value:1};let count=0;
  car.parts.body.traverse(mesh=>{
    if(!mesh.isMesh || !mesh.name.endsWith('-warm')) return;
    mesh.geometry.computeBoundingBox();
    const front=mesh.geometry.boundingBox.max.z-.30;
    const material=mesh.material, compile=material.onBeforeCompile, cacheKey=material.customProgramCacheKey();
    material.onBeforeCompile=shader=>{
      compile.call(material,shader);
      shader.uniforms.uHeadlightBlink=uniform;
      shader.vertexShader='varying float vLampZ;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLampZ=position.z;');
      shader.fragmentShader='varying float vLampZ; uniform float uHeadlightBlink;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`outgoingLight*=mix(1.,uHeadlightBlink,step(${front.toFixed(5)},vLampZ));\n#include <opaque_fragment>`);
    };
    material.customProgramCacheKey=()=>cacheKey+'-idle-blink';material.needsUpdate=true;count++;
  });
  return {uniform,count};
}

export async function createWorld(canvas,onFailure) {
  let context;
  try { context=canvas.getContext('webgl2',{alpha:true,antialias:false,powerPreference:'high-performance'}); } catch {return null;}
  if(!context)return null;
  const renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:false});
  renderer.setPixelRatio(1);renderer.setSize(W/PIXEL,H/PIXEL,false);renderer.autoClear=false;
  renderer.setClearColor(BG,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1;
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(BG,.038);
  const camera=new THREE.PerspectiveCamera(38,W/H,.08,180),insetCameras=new Map();
  const key=new THREE.DirectionalLight('#FFF6EA',3.2);key.position.set(-3,6,5);
  const rim=new THREE.DirectionalLight('#FFFFFF',1);rim.position.set(3,3,-4);
  const fill=new THREE.DirectionalLight(BG,.9);fill.position.set(4,2,2);
  scene.add(key,rim,fill,new THREE.HemisphereLight('#FFFFFF','#BDB4A4',1.5));
  const gridMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{uGrid:{value:.4},uSpeed:{value:0},uTime:{value:0},uLine:{value:new THREE.Color('#B9AE9C')}},
    vertexShader:`varying vec3 vWorld;void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`varying vec3 vWorld;uniform float uGrid,uSpeed,uTime;uniform vec3 uLine;
      void main(){vec2 p=vWorld.xz;p.y+=uTime*uSpeed;
        vec2 q=p/1.6,d=abs(fract(q-.5)-.5)/max(fwidth(q),vec2(.0001));
        float grid=1.-min(min(d.x,d.y),1.);float dist=length(vWorld.xz-cameraPosition.xz);
        float fade=exp(-dist*.065)*(1.-smoothstep(25.,75.,dist));
        float streak=pow(max(0.,1.-abs(sin(p.x*4.5))),40.)*smoothstep(.2,5.,abs(uSpeed));
        gl_FragColor=vec4(uLine,fade*.6*min(1.,grid*uGrid+streak*.3));}`});
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(260,260),gridMaterial);
  floor.rotation.x=-Math.PI/2;floor.position.y=-.035;scene.add(floor);
  // Short moving road strokes stay around the illustration, not behind the text.
  const roadSeeds=[];
  for(const x of [-2.5,-1.75,1.75,2.5])for(const z of [-7,-3,1,5])roadSeeds.push([x,z]);
  const roadGeometry=new THREE.BufferGeometry(),roadPositions=new Float32Array(roadSeeds.length*6);
  roadGeometry.setAttribute('position',new THREE.BufferAttribute(roadPositions,3));
  const road=new THREE.LineSegments(roadGeometry,new THREE.LineBasicMaterial({color:'#B9AE9C',transparent:true,opacity:.52,depthWrite:false,toneMapped:false}));
  road.layers.set(1);road.frustumCulled=false;scene.add(road);
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(5.6,7.4),new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;void main(){float d=length((vUv-.5)*vec2(2.8,1.9));float a=pow(max(0.,1.-d),2.);gl_FragColor=vec4(.045,.021,.007,a*.16);}`}));
  contact.rotation.x=-Math.PI/2;contact.position.y=-.025;contact.layers.set(1);scene.add(contact);

  const car=await factories[0].createCar(THREE);
  car.group.traverse(o=>o.layers.set(1));scene.add(car.group);
  const drive=createDrive({scene,car,contact});
  const updates=[],projectionUpdates=[],shotHooks=[],disposers=[],diagnostics={};
  const viewLayers={car:1},viewCars={car:[car]};
  let leaveShot=[],shotKey='';
  function setShot(pageId,step){
    if(shotKey===`${pageId}:${step}`)return;
    leaveShot.forEach(fn=>fn());leaveShot=[];shotKey=`${pageId}:${step}`;
    drive.setShot(pageId,step,RESOLVED[pageId]?.[step]?.drive);
    for(const hook of shotHooks)if(hook.pageId===pageId && (hook.step==='*'||hook.step===step)){
      const cleanup=hook.fn({pageId,step});if(typeof cleanup==='function')leaveShot.push(cleanup);
    }
  }
  const ctx={THREE,scene,car,drive,afterCamera:fn=>projectionUpdates.push(fn),createCar:factories[0].createCar,icons,
    addUpdate:fn=>updates.push(fn),onShot:(pageId,step,fn)=>shotHooks.push({pageId,step,fn}),
    addDispose:fn=>disposers.push(fn),expose:values=>Object.assign(diagnostics,values),
    registerView:(name,layer,items=[])=>{
      if(name in viewLayers || Object.values(viewLayers).includes(layer) || !Number.isInteger(layer) || layer<2 || layer>31)
        throw new Error(`Duplicate or invalid view layer: ${name} / ${layer}`);
      viewLayers[name]=layer;viewCars[name]=items;
    },
  };
  for(const register of registers)await register(ctx);
  const blink=headlightBlink(car);
  const contours=[],outlineAccent=new THREE.Color('#E2462B');
  car.group.traverse(o=>{if(o.userData.outline)contours.push(o.material);});
  function selectView(cam,view){cam.layers.set(0);cam.layers.enable(viewLayers[view]||1);}
  selectView(camera,'car');
  const setterCache={};let disabled=false,idleTime=0,blinkTime=0,wasBlinking=false;
  let renderedViews=[],renderedPasses=[],appliedEffect={part:'',value:0};
  function apply(state,effect={part:'',value:0}) {
    if(disabled)return;
    const methods={gray:'setGray',dim:'setDim',silhouette:'setSilhouette',explode:'setExplode',xray:'setXray',driver:'setDriver',chassisOnly:'setChassisOnly',speed:'setSpeed'};
    for(const [name,method] of Object.entries(methods)) {
      const value=name==='driver'?Math.round(state.car[name]):state.car[name];
      if(setterCache[name]!==value){car[method](value);setterCache[name]=value;}
    }
    setterCache.lit||={};
    for(const name of new Set([...Object.keys(setterCache.lit),...Object.keys(state.car.lit)])) {
      const value=Math.max(state.car.lit[name]||0,name===effect.part?effect.value:0);
      if(setterCache.lit[name]!==value){car.setLit(name,value);setterCache.lit[name]=value;}
    }
    // Lift the silhouette rim above V1 without turning the black body into pink paint.
    for(const material of contours){
      material.color.copy(outlineAccent);
      material.opacity=Math.max(material.opacity,.98*state.car.silhouette);
    }
    car.group.position.fromArray(state.car.pos);car.group.rotation.y=state.car.rotY;car.group.visible=state.car.visible;
    car.parts.driver.visible=!state.car.hideDriver && Math.round(state.car.driver)===1;
    car.parts.driver2.visible=!state.car.hideDriver && Math.round(state.car.driver)===2;
    selectView(camera,state.view);
    scene.fog.density=state.world.fog;
    gridMaterial.uniforms.uGrid.value=state.world.grid;gridMaterial.uniforms.uSpeed.value=state.world.speed;
    contact.position.x=state.car.pos[0];contact.position.z=state.car.pos[2];
  }
  const target=new THREE.WebGLRenderTarget(W/PIXEL,H/PIXEL,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
  const insetTargets=new Map(),postScene=new THREE.Scene(),postCamera=new THREE.Camera();
  const post=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,transparent:true,
    uniforms:{tMap:{value:target.texture},uOpacity:{value:1},uInset:{value:0},uBayer:{value:BAYER?1:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform sampler2D tMap;uniform float uOpacity,uInset,uBayer;
      float b2(vec2 p){return mod(2.*p.x+3.*p.y,4.);}
      float bayer(vec2 p){p=floor(p);return (4.*b2(mod(p,2.))+b2(mod(floor(p/2.),2.)))/16.;}
      void main(){vec4 c=texture2D(tMap,vUv);c.rgb+=(bayer(gl_FragCoord.xy)-.46875)*.009*uBayer;
        gl_FragColor=vec4(max(c.rgb,vec3(0.))/max(c.a,.0001),c.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.a*=uOpacity;}`});
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),post));
  function positionCamera(cam,state,aspect){
    cam.position.fromArray(state.pos);cam.fov=state.fov;cam.aspect=aspect;cam.lookAt(...state.look);
    if(state.center)cam.setViewOffset(W,H,(.5-state.center[0])*W,(.5-state.center[1])*H,W,H);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();cam.updateMatrixWorld(true);
  }
  // Actual group Box3, all eight corners, projected through each rendered camera.
  // No DOM estimates, clipping, or hard-coded slide bounds in these diagnostics.
  function bounds(){
    const out=[];
    for(const pass of renderedPasses){
      if(pass.opacity<.001)continue;
      for(const [i,item] of (viewCars[pass.view]||[]).entries()){
        if(!item.group.visible)continue;
        item.group.updateWorldMatrix(true,true);
        const box=new THREE.Box3().setFromObject(item.group),points=[];
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
          const p=new THREE.Vector3(x,y,z).project(pass.cam),[rx,ry,rw,rh]=pass.rect;
          points.push([rx+(p.x+1)*rw/2,ry+(1-p.y)*rh/2]);
        }
        const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
        out.push({view:pass.view,index:i,x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)});
      }
    }
    return out;
  }
  function pass(cam,rt,rect,opacity,inset){
    renderer.setRenderTarget(rt);renderer.setScissorTest(false);renderer.setViewport(0,0,rt.width,rt.height);renderer.clear();renderer.render(scene,cam);
    renderer.setRenderTarget(null);renderer.setViewport(...rect);renderer.setScissor(...rect);renderer.setScissorTest(true);
    post.uniforms.tMap.value=rt.texture;post.uniforms.uOpacity.value=opacity;post.uniforms.uInset.value=inset;renderer.render(postScene,postCamera);
  }
  function fail(){if(disabled)return;disabled=true;onFailure();}
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fail();});
  return {
    scene,camera,renderer,apply,car,bounds,setShot,...diagnostics,
    get disabled(){return disabled;},get views(){return renderedViews.map(v=>({...v}));},
    get props(){return scene.children.filter(o=>o.isGroup && o!==car.group).map(o=>({layer:o.layers.mask,visible:o.visible}));},
    get layers(){return {...viewLayers};},
    get effect(){return {...appliedEffect};},get lights(){return {...setterCache.lit};},
    get idle(){return {time:idleTime,blinkTime,blink:blink.uniform.value,blinkMaterials:blink.count};},
    render(state,dt,visibleInsets,reduced,effect={part:'',age:0,duration:1,count:1}){
      if(disabled)return;
      try {
        const progress=effect.age/effect.duration;
        appliedEffect={part:effect.part,value:!reduced && progress>=0 && progress<1 ? (1-Math.cos(progress*Math.PI*2*effect.count))/2 : 0};
        const drivingState=drive.update(state,dt,reduced);
        apply(drivingState,appliedEffect);const delta=reduced?0:dt;idleTime+=delta;
        // Positive half-cosine: 0.03 units peak lift, no sinking through the floor.
        const bob=phase=>reduced?0:state.idle.amplitude*(1-Math.cos(idleTime*2*Math.PI/state.idle.period+phase))/2;
        car.group.position.y+=bob(0);car.update(delta);
        drive.pose(drivingState,reduced);
        for(const update of updates)update({state,dt,delta,reduced,idleTime});
        const blinking=state.car.blink>.99;
        if(blinking&&!wasBlinking)blinkTime=0;
        if(blinking)blinkTime+=delta;wasBlinking=blinking;
        const phase=blinkTime%4;
        blink.uniform.value=reduced||!blinking?1:1-.96*Math.max(0,1-Math.abs(phase-3.70)/.15);
        gridMaterial.uniforms.uTime.value+=delta;
        floor.visible=!drive.active;
        road.visible=!drive.active && state.world.speed>.01;
        if(road.visible){
          roadSeeds.forEach(([x,z],i)=>{
            const moving=((z-gridMaterial.uniforms.uTime.value*state.world.speed+1000)%16)-8;
            roadPositions.set([x,-.015,moving,x,-.015,moving+1.25],i*6);
          });
          roadGeometry.attributes.position.needsUpdate=true;
        }
        positionCamera(camera,drive.frameCamera(state.cam,state),W/H);
        renderer.setRenderTarget(null);renderer.setScissorTest(false);renderer.setViewport(0,0,W/PIXEL,H/PIXEL);renderer.clear();
        for(const update of projectionUpdates)update(camera);
        // A fully lit illustration is foreground ink, not a translucent backdrop.
        // Preserve authored fades (including fully hidden passes) for unlit views.
        const finish=Math.max(0,...(viewCars[state.view]||[]).map(c=>c.group.visible?(c.solidFinish||0):0));
        const opacity=state.world.backdrop>0?THREE.MathUtils.lerp(state.world.backdrop,1,finish):0;
        pass(camera,target,[0,0,W/PIXEL,H/PIXEL],opacity,0);
        renderedViews=[{view:state.view,layer:camera.layers.mask,opacity}];
        renderedPasses=[{view:state.view,cam:camera,rect:[0,0,W,H],opacity}];
        for(const inset of state.insets){
          if(!visibleInsets.has(inset.id))continue;
          const [x,y,w,h]=inset.rect;
          if(!insetCameras.has(inset.id)){
            insetCameras.set(inset.id,new THREE.PerspectiveCamera(38,w/h,.08,180));
            insetTargets.set(inset.id,new THREE.WebGLRenderTarget(Math.round(w/PIXEL),Math.round(h/PIXEL),{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter}));
          }
          const cam=insetCameras.get(inset.id),rt=insetTargets.get(inset.id);
          if(rt.width!==Math.round(w/PIXEL)||rt.height!==Math.round(h/PIXEL))rt.setSize(Math.round(w/PIXEL),Math.round(h/PIXEL));
          positionCamera(cam,inset.cam,w/h);selectView(cam,inset.view);
          pass(cam,rt,[Math.round(x/PIXEL),Math.round((H-y-h)/PIXEL),Math.round(w/PIXEL),Math.round(h/PIXEL)],inset.opacity,1);
          renderedViews.push({view:inset.view,layer:cam.layers.mask,opacity:inset.opacity});
          renderedPasses.push({view:inset.view,cam,rect:inset.rect,opacity:inset.opacity});
        }
        renderer.setScissorTest(false);
      }catch{fail();}
    },
    dispose(){
      leaveShot.forEach(fn=>fn());disposers.forEach(fn=>fn());drive.dispose();car.dispose();target.dispose();insetTargets.forEach(rt=>rt.dispose());
      scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
      post.dispose();postScene.children[0].geometry.dispose();renderer.dispose();
    },
  };
}
