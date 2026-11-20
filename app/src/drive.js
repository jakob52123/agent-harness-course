import * as THREE from 'three';
import { PIXEL, H, lit } from './shot-base.js';

// Car-space: +Z is forward. The road never follows a lane change.
const C = Object.freeze({lane:2.9,laneTime:1.5,delay:.9,hold:1.3,steer:1.1,
  back:11.5,front:9.5,beamLength:5.4,frameEvery:.55});
const clamp = THREE.MathUtils.clamp;
const smooth = t => {t=clamp(t,0,1);return t*t*(3-2*t);};
const damp = (a,b,dt,rate=6) => a+(b-a)*(1-Math.exp(-dt*rate));
const UP = new THREE.Vector3(0,1,0);

export function createDrive({scene,car,contact}) {
  // Object3D, not a chapter prop Group: this belongs to the shared car pass.
  const root=new THREE.Object3D();root.name='car-drive';root.visible=false;scene.add(root);
  const resources=new Set();
  const own=o=>{resources.add(o);return o;};
  // Render-target pixels -> 1920×1080 design coordinates (Y points down).
  // Only drive props use this alpha mask; the car's materials are untouched.
  const screenFade=`(pow(smoothstep(1150.,1330.,gl_FragCoord.x*${PIXEL.toFixed(1)}),10.)
    *smoothstep(125.,240.,${H.toFixed(1)}-gl_FragCoord.y*${PIXEL.toFixed(1)}))`;
  function soften(material) {
    material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',
      `diffuseColor.a*=${screenFade};\n#include <opaque_fragment>`);};
    material.customProgramCacheKey=()=> 'drive-screen-soft-fade';
    return material;
  }
  function basic(color,opacity=1) {
    const m=own(new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false}));
    return soften(m);
  }
  function box(parent,size,pos,color) {
    const mesh=new THREE.Mesh(own(new THREE.BoxGeometry(...size)),basic(color));
    mesh.position.set(...pos);parent.add(mesh);return mesh;
  }
  const U={scroll:{value:0},beam:{value:0},reach:{value:0},lane:{value:0},
    route:{value:0},flow:{value:0},lines:{value:0}};
  const roadMat=own(new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:U,
    vertexShader:`varying vec2 p;void main(){p=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 p;uniform float scroll,beam,reach,lane,route,flow,lines;
      void main(){
        float x=p.x,z=p.y;
        float fade=1.-smoothstep(5.5,${C.back},abs(z));
        fade*=1.-smoothstep(7.,${C.front},z);
        float shoulder=1.-smoothstep(3.02,3.35,abs(x-1.45));
        float center=(1.-smoothstep(.055,.105,abs(x-1.45)))*step(.43,fract((z+scroll)/2.5));
        float edge=1.-smoothstep(.035,.085,abs(abs(x-1.45)-2.96));
        vec3 accent=vec3(.7305,.0437,.0160), line=vec3(.485,.423,.332);
        vec3 color=mix(vec3(.815,.768,.680),line,max(edge,center*(.8+.2*lines)));
        float end=2.2+${C.beamLength}*reach;
        float t=clamp((z-.3)/max(.01,end-.3),0.,1.);
        float inside=(1.-smoothstep(mix(.8,2.,t)-.1,mix(.8,2.,t),abs(x-lane)))
          *step(.3,z)*(1.-smoothstep(end-.12,end,z));
        color=mix(color,accent,inside*beam*.38);
        float path=step(2.1,z)*(1.-smoothstep(2.1+5.8*route,2.3+5.8*route,z));
        float spine=1.-smoothstep(.13,.22,abs(x-lane));
        float dash=step(.40,fract((z-flow)/1.4));
        float arrow=1.-smoothstep(.14,.24,abs(mod(z-flow,2.)-.6+abs(x-lane)*1.3));
        arrow*=1.-smoothstep(.62,.76,abs(x-lane));
        color=mix(color,accent,path*route*max(spine*(.65+.35*dash),arrow));
        gl_FragColor=vec4(color,fade*.6*shoulder*${screenFade});
      }` }));
  const road=new THREE.Mesh(own(new THREE.PlaneGeometry(6.7,C.front+C.back).rotateX(-Math.PI/2).translate(1.45,0,(C.front-C.back)/2)),roadMat);
  road.position.y=-.018;road.renderOrder=-3;root.add(road);
  const posts=[];
  for(const x of [-1.78,4.68])for(let z=-10;z<=9;z+=2.5){
    const post=new THREE.Group();root.add(post);
    box(post,[.14,.64,.14],[0,.32,0],'#B9AE9C');
    box(post,[.19,.16,.19],[0,.57,0],'#E9E3D7');
    posts.push({post,x,z});
  }
  const beamGeo=own(new THREE.BufferGeometry());
  beamGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(48),3));
  const beamMat=own(new THREE.LineBasicMaterial({color:'#DE3B22',transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
  soften(beamMat);
  const beam=new THREE.LineSegments(beamGeo,beamMat);beam.frustumCulled=false;root.add(beam);
  const windshield=new THREE.Box3().setFromObject(car.parts.windshield);
  const near=[[windshield.min.x,windshield.min.y,windshield.max.z],
    [windshield.max.x,windshield.min.y,windshield.max.z],
    [windshield.max.x,windshield.max.y,windshield.min.z],
    [windshield.min.x,windshield.max.y,windshield.min.z]].map(p=>new THREE.Vector3(...p));
  const dashOrigin=car.parts.dashcam.position.clone();
  const frames=[];
  const frameGeo=own(new THREE.PlaneGeometry(.94,.74).rotateX(-Math.PI/2));
  for(let i=0;i<24;i++) {
    const material=own(new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{alpha:{value:0}},
      vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 uv0;uniform float alpha;void main(){
        vec2 d=min(uv0,1.-uv0);float edge=1.-smoothstep(.07,.12,min(d.x,d.y));
        gl_FragColor=vec4(.7305,.0437,.0160,alpha*max(edge,.13)*${screenFade});}` }));
    const mesh=new THREE.Mesh(frameGeo,material);mesh.visible=false;mesh.renderOrder=2;root.add(mesh);
    frames.push({mesh,live:false,age:0,x:0,z:0,from:new THREE.Vector3(),land:0});
  }
  const gate=new THREE.Group();gate.visible=false;root.add(gate);
  box(gate,[.26,1.35,.28],[-1.42,.675,0],'#E9E3D7');
  box(gate,[.32,.26,.33],[-1.42,1.35,0],'#DE3B22');
  const arm=new THREE.Group();arm.position.set(-1.42,1.15,0);gate.add(arm);
  for(let i=0;i<8;i++)box(arm,[.36,.24,.20],[.18+i*.36,0,0],i%2?'#F2EEE6':'#DE3B22');
  root.traverse(o=>o.layers.set(1));

  let cfg={},page='',step=-1,started=0,loopStarted=null,changed=false,wasReduced=false;
  let active=false,speed=0,scroll=0,lat=0,vlat=0,alat=0,steer=0,lc=null;
  let beamValue=0,routeValue=0,gateValue=0,gateOpen=0,beat='',lastBeat='',spawn=0;
  let gateZ=6.65,gateLane=0,gateEntrySpeed=3,stopEntrySpeed=3,toolsTarget=0;
  let pulseTime=0,flow=0,overlays=[],resetLoopLane=false;
  // Wheel plane normal, not the car origin. Account for the model's +.21 cabin lift.
  const steeringPivot=new THREE.Vector3(-.42,1.47,-.105).sub(car.parts.steering.position);
  const steeringAxis=new THREE.Vector3(0,.475,.88).normalize();
  const q=new THREE.Quaternion(),offset=new THREE.Vector3();
  function clearFrames(){for(const f of frames){f.live=false;f.mesh.visible=false;}spawn=0;}
  function restore(){for(const [part,p,r,s] of overlays){part.position.copy(p);part.quaternion.copy(r);part.scale.copy(s);}overlays=[];}
  function remember(part){if(!overlays.some(([p])=>p===part))overlays.push([part,part.position.clone(),part.quaternion.clone(),part.scale.clone()]);}
  function laneTo(to,now) {
    if(lc?Math.abs(lc.to-to)<1e-6:Math.abs(lat-to)<1e-6)return;
    const T=C.laneTime,D=to-lat,T2=T*T,T3=T2*T;
    lc={to,T,start:now,c:[lat,vlat,alat/2,(20*D-12*vlat*T-3*alat*T2)/(2*T3),
      (-30*D+16*vlat*T+3*alat*T2)/(2*T3*T),(12*D-6*vlat*T-alat*T2)/(2*T3*T2)]};
  }
  function laneUpdate(now) {
    if(!lc){vlat=0;alat=0;return;}
    const t=clamp((now-lc.start)/1000,0,lc.T),c=lc.c;
    lat=c[0]+t*(c[1]+t*(c[2]+t*(c[3]+t*(c[4]+t*c[5]))));
    vlat=c[1]+t*(2*c[2]+t*(3*c[3]+t*(4*c[4]+t*5*c[5])));
    alat=2*c[2]+t*(6*c[3]+t*(12*c[4]+t*20*c[5]));
    if(t>=lc.T){lat=lc.to;vlat=0;alat=0;lc=null;}
  }
  function setShot(id,n,config) {
    const now=performance.now(),keepLoop=page==='p5'&&step>=3&&id==='p5'&&n>=3;
    if(id==='p5'&&n>=3){if(!keepLoop)loopStarted=now;}else loopStarted=null;
    const prev=cfg;cfg=config||{};page=id;step=n;started=now;changed=true;
    resetLoopLane=!!cfg.loop&&!keepLoop;
    active=['p3','p4','p5','p6'].includes(id)&&cfg.active===true;
    if(!keepLoop)lastBeat='';
    if(cfg.gate!==prev.gate || !active){gateEntrySpeed=Math.max(speed,3);gateZ=3.35+1.1*gateEntrySpeed;gateLane=0;}
    stopEntrySpeed=speed;toolsTarget=0;
    if(!cfg.trail || !prev.trail)clearFrames();
    if(!active){speed=0;lat=0;vlat=0;alat=0;lc=null;steer=0;beat='';beamValue=0;routeValue=0;gateValue=0;gateOpen=0;clearFrames();}
    root.visible=active;
  }
  function dropFrame() {
    const f=frames.find(f=>!f.live);if(!f)return;
    f.live=true;f.age=0;f.x=lat;f.from.copy(dashOrigin);f.from.x+=lat;
    f.z=-2.85;f.land=scroll-2.85;f.mesh.visible=true;
  }
  function updateFrames(dt,reduced) {
    if(!cfg.trail){clearFrames();return;}
    if(reduced){
      if(changed||!wasReduced){clearFrames();for(let i=0;i<5;i++){const f=frames[i];f.live=true;f.age=1;f.x=lat;f.z=-3-i*1.45;f.mesh.visible=true;}}
    } else {
      spawn+=dt;
      while(spawn>=C.frameEvery){spawn-=C.frameEvery;dropFrame();}
    }
    for(const f of frames){
      if(!f.live)continue;
      if(!reduced)f.age+=dt;
      const fly=smooth(f.age/.7);
      if(!reduced){
        if(f.age<.7)f.land=scroll-2.85;
        f.z=f.age<.7?-2.85:f.land-scroll;
      }
      if(f.z<-C.back){f.live=false;f.mesh.visible=false;continue;}
      f.mesh.position.set(f.x,.045,f.z);
      if(fly<1){f.mesh.position.lerpVectors(f.from,f.mesh.position,fly);f.mesh.position.y+=Math.sin(Math.PI*fly)*.8;}
      f.mesh.rotation.x=-(1-fly)*1.1;f.mesh.scale.setScalar(.45+.55*fly);
      f.mesh.material.uniforms.alpha.value=(1-smooth((Math.abs(f.z)-6)/(C.back-6)))*Math.min(1,f.age*6);
    }
  }
  // Called before world.apply: resolve only runtime lights/speed, never mutate SHOTS.
  function update(state,dt,reduced) {
    restore();
    const now=performance.now(),age=Math.max(0,(now-started)/1000);
    if(!active){contact.rotation.set(-Math.PI/2,0,0);wasReduced=reduced;changed=false;return state;}
    let beamOn=cfg.beam,lights=state.car.lit;
    beat='';
    if(cfg.loop){
      const elapsed=reduced?0:Math.max(0,(now-loopStarted)/1000),t=(elapsed/9%1)*9;
      const think=315/1744*9,act=630/1744*9;
      beat=t<think?'look':t<act?'think':t<act+1.65?'act':'relook';
      lights=lit(beat==='look'?{windshield:1}:beat==='think'?{driver:1}:beat==='act'?{steering:1}:{});
      beamOn=beat==='look'||beat==='relook';
      if(beat==='act'&&lastBeat!=='act'&&!reduced)laneTo((Math.floor(elapsed/9)%2?0:1)*C.lane,now);
      lastBeat=beat;
    }
    if(reduced){lat=(cfg.loop||cfg.lane==='tools'?0:Number(cfg.lane)||0)*C.lane;vlat=0;alat=0;lc=null;}
    else if(cfg.lane==='tools'){
      toolsTarget=age<C.delay?0:(Math.floor((age-C.delay)/(C.laneTime+C.hold))%2?0:C.lane);
      laneTo(toolsTarget,now);
    }else if(!cfg.loop || resetLoopLane)laneTo((Number(cfg.lane)||0)*C.lane,now);
    resetLoopLane=false;
    if(!reduced)laneUpdate(now);
    steer=reduced?0:C.steer*clamp(alat/(5.7735*C.lane/C.laneTime**2),-1,1);
    if(reduced)speed=0;
    else if(cfg.gate){
      speed=gateEntrySpeed*(1-smooth(age/2.2));
      if(cfg.gate==='pass'&&age>=3.35)speed=(cfg.speed||3)*smooth((age-3.35)/1.1);
    }else if(cfg.speed===0)speed=stopEntrySpeed*(1-smooth(age/1.2));
    else speed=damp(speed,cfg.speed||3,dt,5);
    if(speed<.001)speed=0;
    const delta=reduced?0:dt;scroll+=speed*delta;flow+=delta*3.1;pulseTime+=delta;
    beamValue=reduced?Number(!!beamOn):damp(beamValue,Number(!!beamOn),dt,beamOn?4.8:10);
    routeValue=reduced?Number(!!cfg.route):damp(routeValue,Number(!!cfg.route),dt,5);
    gateValue=reduced?Number(!!cfg.gate):damp(gateValue,Number(!!cfg.gate),dt,7);
    if(cfg.gate==='pass')gateOpen=reduced?1:smooth((age-2.35)/.9);
    else if(cfg.gate==='stop'||gateValue<.005)gateOpen=0;
    if(reduced)gateZ=3.35;
    else if(cfg.gate){gateZ-=speed*dt;if(gateOpen<.99)gateZ=Math.max(3.35,gateZ);}
    root.position.fromArray(state.car.pos);root.rotation.y=state.car.rotY;
    U.scroll.value=scroll;U.lane.value=lat;U.beam.value=page==='p4'?0:beamValue;U.reach.value=beamValue;
    U.route.value=routeValue;U.flow.value=flow;U.lines.value=cfg.lane==='tools'||cfg.loop||Number(cfg.lane)>0?1:0;
    for(const {post,x,z} of posts){
      const moving=((z-scroll+C.back)%21+21)%21-C.back;
      post.position.set(x,0,moving);
      const alpha=(1-smooth((Math.abs(moving)-5.5)/6))*(1-smooth((moving-7)/2.5));
      for(const mesh of post.children)mesh.material.opacity=alpha*(1-beamValue*.25);
    }
    gate.position.set(gateLane,0,gateZ);gate.visible=gateValue>.005&&gateZ>-C.back;
    gate.scale.setScalar(.8+.2*gateValue);arm.rotation.z=gateOpen*Math.PI/2;
    gate.traverse(o=>{if(o.isMesh)o.material.opacity=gateValue*(1-smooth((-gateZ-6)/5));});
    updateFrames(delta,reduced);
    wasReduced=reduced;changed=false;
    return {...state,car:{...state.car,lit:lights,speed}};
  }
  // Called after the authored car pose and wheel update; all transforms are additive.
  function pose(state,reduced) {
    if(!active)return;
    const yaw=reduced?0:clamp(Math.atan2(vlat,Math.max(speed,.5))*.30,-14*Math.PI/180,14*Math.PI/180);
    offset.set(lat,0,0).applyAxisAngle(UP,state.car.rotY);
    car.group.position.add(offset);car.group.rotation.y+=yaw;
    contact.position.x=car.group.position.x;contact.position.z=car.group.position.z;
    contact.rotation.set(-Math.PI/2,0,-car.group.rotation.y);
    // Small cockpit controls get a reversible teaching close-up, not new mesh
    // geometry. Their neutral/default and exploded poses remain untouched.
    if(state.car.gray>.001 && state.car.explode<.001){
      for(const [name,scale,lift] of [['steering',1.5,.16],['nav',1.5,.12],['dashcam',1.35,.30]]){
        const focus=(state.car.lit[name]||0)*state.car.gray;
        if(focus<=0)continue;
        const part=car.parts[name];remember(part);
        part.scale.multiplyScalar(1+(scale-1)*focus);part.position.y+=lift*focus;
      }
    }
    if(Math.abs(steer)>.00001){
      const part=car.parts.steering;remember(part);
      q.setFromAxisAngle(steeringAxis,-steer);
      const pivot=steeringPivot.clone().multiply(part.scale);
      offset.copy(pivot).sub(pivot.clone().applyQuaternion(q)).applyQuaternion(part.quaternion);
      part.position.add(offset);part.quaternion.multiply(q);
    }
    if(cfg.engine){
      const part=car.parts.engine;remember(part);
      const pulse=reduced?0:Math.pow((1-Math.cos(pulseTime*Math.PI*2/1.05))/2,3);
      part.scale.multiplyScalar(1+.20*pulse);part.position.y+=.07*pulse;
    }
    car.group.updateMatrixWorld(true);root.updateMatrixWorld(true);
    const far=[[-2,.04],[2,.04],[2,1.8],[-2,1.8]].map(([x,y])=>new THREE.Vector3(lat+x,y,2.2+C.beamLength*beamValue));
    const n=near.map(p=>root.worldToLocal(car.group.localToWorld(p.clone())));
    const a=beamGeo.attributes.position;let k=0;
    for(let i=0;i<4;i++)for(const p of [n[i],far[i],far[i],far[(i+1)%4]])a.setXYZ(k++,p.x,p.y,p.z);
    a.needsUpdate=true;beamMat.opacity=.95*beamValue;beam.visible=page!=='p4'&&beamValue>.005;
    // On the paper inventory the frames are stroked in slide pixels instead.
    for(const f of frames)if(f.live)f.mesh.material.visible=page!=='p4';
  }
  const diagnostic=Object.freeze({
    get active(){return active;},get road(){return active?speed:0;},get lane(){return lat/C.lane;},
    get steer(){return steer;},get beam(){return beamValue;},get route(){return routeValue;},
    get gate(){return gate.visible?gateValue:0;},get gateOpen(){return gateOpen;},
    get frames(){return active?frames.filter(f=>f.live&&f.mesh.visible).length:0;},get beat(){return beat;},
  });
  Object.defineProperty(window,'__drive',{get:()=>diagnostic,configurable:true});
  function frameCamera(cam,state) {
    if(!active || !cam.followLane)return cam;
    const shift=new THREE.Vector3(lat*cam.followLane,0,0).applyAxisAngle(UP,state.car.rotY);
    return {...cam,pos:cam.pos.map((v,i)=>v+shift.getComponent(i)),look:cam.look.map((v,i)=>v+shift.getComponent(i))};
  }
  return {setShot,update,pose,restore,frameCamera,
    get recordFrames(){return frames.filter(f=>f.live).map(f=>f.mesh);},get beamStrength(){return beamValue;},get active(){return active;},dispose(){restore();root.removeFromParent();for(const r of resources)r.dispose();}};
}
