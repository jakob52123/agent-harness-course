// Shared, content-free presentation primitives. No page IDs or chapter facts here.
const SVG='http://www.w3.org/2000/svg';
const diagrams=new WeakMap(),lastSteps=new WeakMap();
let serial=0;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function svg(tag,attrs={}){const el=document.createElementNS(SVG,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;}

function diagram(root){
  if(diagrams.has(root)||root.classList.contains('round-diagram'))return;
  const nodes=[...root.querySelectorAll(':scope > .station')];
  if(nodes.length<3||nodes.length>6)throw new Error('.flow / .ring requires 3–6 direct .station children');
  const ring=root.classList.contains('ring'),closed=ring||root.hasAttribute('data-closed');
  if(ring)nodes.forEach((node,i)=>{
    const angle=-Math.PI/2+i*Math.PI*2/nodes.length;
    node.style.left=`${50+36*Math.cos(angle)}%`;node.style.top=`${50+36*Math.sin(angle)}%`;
  });
  const canvas=svg('svg',{'aria-hidden':'true',class:'component-path'});
  const markerId=`component-arrow-${++serial}`;
  const defs=svg('defs'),marker=svg('marker',{id:markerId,markerWidth:8,markerHeight:8,refX:7,refY:4,orient:'auto'});
  marker.append(svg('path',{d:'M1 1L7 4L1 7'}));defs.append(marker);canvas.append(defs);
  const arrows=svg('g',{'marker-end':`url(#${markerId})`}),track=svg('path',{class:'component-track'}),token=svg('rect',{class:'component-token',width:12,height:12,x:-6,y:-6});
  canvas.append(arrows,track,token);root.prepend(canvas);
  const d={root,nodes,ring,closed,canvas,arrows,track,token,stops:[],position:0,frame:0,index:0};diagrams.set(root,d);
  function layout(){
    const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;
    canvas.setAttribute('viewBox',`0 0 ${w} ${h}`);arrows.replaceChildren();
    const points=nodes.map(n=>[n.offsetLeft+n.offsetWidth/2,n.offsetTop+n.offsetHeight/2]);
    // Ring stations use translate(-50%,-50%); flow stations are ordinary grid cells.
    if(ring)points.forEach((p,i)=>{p[0]-=nodes[i].offsetWidth/2;p[1]-=nodes[i].offsetHeight/2;});
    const tokenPoints=ring?points.map((p,i)=>[p[0],p[1]+nodes[i].offsetHeight/2+12]):points.map(p=>[p[0],h-40]);
    let path=`M${tokenPoints[0].join(' ')}`,length=0;d.stops=[0];
    for(let i=1;i<tokenPoints.length;i++){
      length+=Math.hypot(tokenPoints[i][0]-tokenPoints[i-1][0],tokenPoints[i][1]-tokenPoints[i-1][1]);d.stops.push(length);path+=`L${tokenPoints[i].join(' ')}`;
    }
    if(closed){
      if(ring)path+='Z';
      else path+=`L${tokenPoints.at(-1)[0]} ${h-8}H${tokenPoints[0][0]}V${h-40}`;
    }
    track.setAttribute('d',path);
    for(let i=0;i<nodes.length-(closed?0:1);i++){
      const j=(i+1)%nodes.length,[x,y]=points[i],[xx,yy]=points[j];
      if(!ring&&j===0){
        const bottom=n=>root.hasAttribute('data-card-loop')?n.offsetTop+n.offsetHeight+8:h-40;
        arrows.append(svg('path',{d:`M${x} ${bottom(nodes[i])}V${h-8}H${xx}V${bottom(nodes[j])}`}));continue;
      }
      const dx=xx-x,dy=yy-y,dist=Math.hypot(dx,dy);
      const edge=n=>Math.min(Math.abs(dx)>1?nodes[n].offsetWidth/2/Math.abs(dx/dist):Infinity,Math.abs(dy)>1?nodes[n].offsetHeight/2/Math.abs(dy/dist):Infinity)+12;
      const a=edge(i),b=edge(j);
      if(a+b<dist)arrows.append(svg('path',{d:`M${x+dx*a/dist} ${y+dy*a/dist}L${xx-dx*b/dist} ${yy-dy*b/dist}`}));
    }
    d.position=d.stops[d.index]||0;place(d,d.position);
  }
  d.layout=layout;layout();
  new ResizeObserver(layout).observe(root);
}
function place(d,length){const p=d.track.getPointAtLength(length);d.token.setAttribute('transform',`translate(${p.x} ${p.y})`);}
function moveToken(d,step){
  let index=-1;d.nodes.forEach((node,i)=>{if(Number(node.dataset.step||0)<=step)index=i;});
  d.token.style.visibility=d.root.hasAttribute('data-token')&&index>=0?'visible':'hidden';
  if(index<0)return;
  d.index=index;
  if(!d.stops.length)d.layout();
  const to=d.stops[index]||0,from=d.position;cancelAnimationFrame(d.frame);
  if(reduced()||d.root.closest('.page')?.dataset.steps==='1'||from===to){d.position=to;place(d,to);return;}
  const start=performance.now();
  const tick=now=>{const t=Math.min(1,(now-start)/450),e=t*t*(3-2*t);d.position=from+(to-from)*e;place(d,d.position);if(t<1)d.frame=requestAnimationFrame(tick);};
  d.frame=requestAnimationFrame(tick);
}
export function initComponents(root=document){
  root.querySelectorAll('.flow,.ring').forEach(diagram);
  root.querySelectorAll('a[href]').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer';});
}
export function updateComponents(root,step,{entering=false}={}){
  const previous=lastSteps.get(root);lastSteps.set(root,step);
  for(const el of root.querySelectorAll('[data-step]')){
    el.classList.toggle('on',Number(el.dataset.step)<=step);
    el.classList.toggle('current',Number(el.dataset.step)===step);
  }
  for(const [attr,cls] of [['fill','filled'],['gray','is-gray'],['pink','is-pink']])
    root.querySelectorAll(`[data-${attr}]`).forEach(el=>el.classList.toggle(cls,Number(el.dataset[attr])<=step));
  root.querySelectorAll('[data-flash]').forEach(el=>{
    if(previous===step&&!entering)return;
    el.classList.remove('flash-three');
    if(Number(el.dataset.flash)===step&&!reduced()){void el.offsetWidth;el.classList.add('flash-three');}
  });
  root.querySelectorAll('.flow,.ring').forEach(el=>{const d=diagrams.get(el);if(d)moveToken(d,step);});
}
