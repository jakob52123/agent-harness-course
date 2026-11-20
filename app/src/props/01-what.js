import { W, H } from '../shot-base.js';

// Paper annotations live in slide coordinates so their strokes remain true 2px
// at design size, independent of the pixelated WebGL render target.
export default function register({THREE,car,drive,onShot,afterCamera}) {
  const page=document.getElementById('p4');
  const parts=[null,['driver','司机'],['steering','方向盘'],['windshield','挡风玻璃'],['dashcam','行车记录仪'],['body','看 · 判断 · 操作']];
  let draw=null;
  afterCamera(camera=>draw?.(camera));
  onShot('p4','*',({step})=>{
    if(!parts[step])return; // Neither the intro nor the exploded overview singles out a part.
    const [key,name]=parts[step];
    const part=car.parts[key];
    const box=new THREE.Box3(),v=new THREE.Vector3();
    const label=document.createElement('div');label.className='part-caption';
    label.textContent=name;label.setAttribute('aria-hidden','true');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.classList.add('part-overlay');svg.setAttribute('aria-hidden','true');
    svg.innerHTML=`<defs><linearGradient id="p4-field"><stop stop-color="currentColor"/><stop offset=".45" stop-color="currentColor"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
      <polygon fill="url(#p4-field)" fill-opacity=".12" stroke="url(#p4-field)" stroke-opacity=".42" stroke-width="2"/>
      <g fill="none" stroke="currentColor" stroke-width="2"></g>
      <path fill="none" stroke="currentColor" stroke-width="2"/><circle r="5" fill="currentColor"/>`;
    const [field,frames,line,dot]=[...svg.children].slice(1);
    page.append(svg,label);
    draw=camera=>{
      box.setFromObject(part);
      let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
        v.set(x,y,z).project(camera);const px=(1+v.x)*W/2,py=(1-v.y)*H/2;
        left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);
      }
      const x=(left+right)/2,y=top+.18*(bottom-top);
      const lx=THREE.MathUtils.clamp(x,1210+label.offsetWidth/2,1800-label.offsetWidth/2);
      const ly=step===4?130:step===1||step===3?305:230;
      label.style.left=`${lx}px`;label.style.top=`${ly}px`;
      line.setAttribute('d',`M${lx} ${ly+50} L${x} ${y}`);dot.setAttribute('cx',x);dot.setAttribute('cy',y);
      if(step===3){
      // A short forward field anchored on the glass. Its far end stays inside
      // the illustration column even during camera movement.
        const ax=right-10,ay=(top+bottom)/2,end=Math.min(1840,ax+185),dy=(end-ax)*.48;
        field.setAttribute('points',`${ax},${ay-10} ${end},${ay+dy-40} ${end},${ay+dy+40} ${ax},${ay+10}`);
        field.setAttribute('opacity',drive.beamStrength);
      }
      if(step!==4)return;
      const live=drive.recordFrames;
      while(frames.childElementCount>live.length)frames.lastChild.remove();
      live.forEach((mesh,i)=>{
        let outline=frames.children[i];if(!outline){outline=document.createElementNS(svg.namespaceURI,'polygon');frames.append(outline);}
        const pts=[0,1,3,2].map(j=>{v.fromBufferAttribute(mesh.geometry.attributes.position,j).applyMatrix4(mesh.matrixWorld).project(camera);return [(1+v.x)*W/2,(1-v.y)*H/2];});
        const inside=pts.every(([x,y])=>x>1200&&x<1860&&y>120&&y<990);
        outline.setAttribute('opacity',inside ? .6*mesh.material.uniforms.alpha.value : 0);outline.setAttribute('points',pts.map(p=>p.join(',')).join(' '));
      });
    };
    return ()=>{draw=null;svg.remove();label.remove();};
  });
}
