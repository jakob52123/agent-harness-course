import { createWorld } from './world.js';
import { initComponents, updateComponents } from './components.js';
import { SHOTS, RESOLVED, W, H, SHOT_MS, clone, ease, interpolate } from './shots.js';
import { Dissolve } from './dissolve.js';
import { initPixelText } from './pixeltext.js';
import { Presenter } from './presenter.js';
import { iconSVG, factories } from '@assets';

const $ = selector => document.querySelector(selector);
const stage = $('#stage'), sections = [...document.querySelectorAll('.page')];
const pages = sections.map(section=>section.id), motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motionQuery.matches;
let page = pages.includes(location.hash.slice(1)) ? location.hash.slice(1) : pages[0];
let step = 0, shownPage = page, state = clone(RESOLVED[page][0]);
let world, motion = null, lastTime = performance.now();
let visibleInsets = new Set(), toastTimer, idleTimer;
let effectStarted = performance.now(), activeEffect = clone(state.effect), loopStarted = null;
const pageNumber = document.createElement('div');
pageNumber.className = 'page-number';
$('#chrome').append(pageNumber);
for (const button of document.querySelectorAll('nav button')) {
  const [number, label] = button.textContent.split(' ');
  const mark = document.createElement('em'); mark.textContent = number;
  button.replaceChildren(mark, ` ${label}`);
}
const dissolve = new Dissolve($('#dissolve'));
const stepsOf = id => Number(document.getElementById(id)?.dataset.steps || 0);
for(const id of pages)if(stepsOf(id)!==SHOTS[id]?.length)throw new Error(`data-steps / SHOTS mismatch: ${id}`);
const sectionOf = id => document.getElementById(id);
const notesOf = id => sectionOf(id)?.querySelector('.notes')?.innerHTML.trim() || '';
const titleOf = id => sectionOf(id)?.dataset.title || '';
function notify(text) {
  $('#toast').textContent = text; $('#toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; },3000);
}
const presenter = new Presenter({ snapshot:() => ({
  title:titleOf(page), notes:notesOf(page), base:document.baseURI, index:pages.indexOf(page), total:pages.length,
  step, steps:stepsOf(page), nextTitle:titleOf(pages[pages.indexOf(page)+1]),
}), key:onKey, notify });

function fit() {
  const scale = Math.min(innerWidth/W,innerHeight/H);
  stage.style.transform = `translate(${(innerWidth-W*scale)/2}px,${(innerHeight-H*scale)/2}px) scale(${scale})`;
}
function noWebGL() { document.documentElement.classList.add('no-webgl'); }
function refreshDOM() {
  shownPage = page; stage.dataset.page = page; stage.dataset.step = step;
  effectStarted = performance.now(); activeEffect = clone(RESOLVED[page][step].effect);
  if(page==='p5' && step>=3)loopStarted ??= effectStarted; else loopStarted=null;
  for (const section of sections) {
    const active = section.id === page, entering = active && !section.classList.contains('active');
    section.classList.toggle('active',active); section.setAttribute('aria-hidden',String(!active));
    if (active) updateComponents(section,step,{entering});
  }
  visibleInsets = new Set([...sectionOf(page).querySelectorAll('[data-inset]')].map(el=>el.dataset.inset));
  $('#notes-overlay').innerHTML = notesOf(page);
  $('.formula')?.classList.toggle('flash',page==='p3' && step===3);
  $('.loop-diagram')?.classList.toggle('running',page==='p5' && step>=3);
  $('.round-diagram')?.classList.toggle('flash',page==='p6' && step===6);
  $('.round-diagram')?.classList.toggle('running',page==='p6' && step===6);
  const fallback=sectionOf(page).querySelector('.hero-fallback');
  if (fallback) {
    const icons={p3:['car','driver','car','driver'],p4:['car','engine','steering','windshield','nav','brake','car'],p5:['engine','windshield','driver','steering','car'],p6:['car','windshield','driver','brake','steering','windshield','dashcam']};
    const name=icons[page]?.[step] || 'car';
    try { fallback.innerHTML=iconSVG(name,{size:512}); } catch { /* optional icons */ }
    if (step>0) fallback.dataset.active=name; else delete fallback.dataset.active;
  }
  const index=pages.indexOf(page), before=pages.slice(0,index).reduce((n,id)=>n+stepsOf(id),0);
  const total=pages.reduce((n,id)=>n+stepsOf(id),0);
  pageNumber.textContent = `${String(index+1).padStart(2,'0')} / ${pages.length}`;
  $('.progress i').style.transform = `scaleX(${(before+step+1)/total})`;
  for (const button of document.querySelectorAll('[data-chapter]')) {
    const chapterIndex=pages.indexOf(button.dataset.chapter);
    const nextChapter=pages.findIndex((id,i)=>i>chapterIndex && id.startsWith('c'));
    button.disabled=chapterIndex<0;
    const firstChapter=pages.findIndex(id=>id.startsWith('c'));
    button.classList.toggle('current',chapterIndex>=0 && (index>=chapterIndex || (index<firstChapter && chapterIndex===firstChapter)) && (nextChapter<0 || index<nextChapter));
  }
  try { history.replaceState(null,'',`#${page}`); } catch { /* file sandbox */ }
  world?.setShot(page,step);
  presenter.refresh();
}
function syncInsetFrames() {
  for (const inset of state.insets) {
    if (!visibleInsets.has(inset.id)) continue;
    const element=document.getElementById(inset.id);
    if (!element) continue;
    const [x,y,w,h]=inset.rect;
    const scale=stage.getBoundingClientRect().width/W;
    const parent=element.offsetParent?.getBoundingClientRect(),base=stage.getBoundingClientRect();
    element.style.left=`${x-(parent?parent.x-base.x:0)/scale}px`;
    element.style.top=`${y-(parent?parent.y-base.y:0)/scale}px`;
    element.style.width=`${w}px`; element.style.height=`${h}px`;
    const frame=element.querySelector('.frame');
    if (frame) {
      frame.setAttribute('viewBox',`0 0 ${w} ${h}`);
      frame.querySelectorAll('rect').forEach(r=>{r.setAttribute('width',w-2);r.setAttribute('height',h-2);});
    }
  }
}
function begin(target,{mask=false,strong=false,mid=()=>{}}={}) {
  dissolve.cancel();
  if (reduced) {
    state=clone(target); motion=null; mid(); syncInsetFrames();
    world?.render(state,0,visibleInsets,true,{...activeEffect,age:0});
    return;
  }
  motion={from:clone(state),to:clone(target),start:performance.now(),mask,strong,mid,committed:!mask};
  if (mask) dissolve.start({strong}); else mid();
}
function go(id, requestedStep=0) {
  if (!pages.includes(id)) return false;
  const nextStep=Math.max(0,Math.min(stepsOf(id)-1,Math.trunc(Number(requestedStep)||0)));
  if (id===page && nextStep===step && !motion) return true;
  const different=id!==shownPage;
  const strong=id.startsWith('c') || shownPage.startsWith('c'); // Strong on both sides of every chapter boundary.
  page=id; step=nextStep;
  begin(RESOLVED[id][step],{mask:different,strong,mid:refreshDOM});
  return true;
}
function next() {
  if (step+1<stepsOf(page)) go(page,step+1);
  else if (pages.indexOf(page)+1<pages.length) go(pages[pages.indexOf(page)+1],0);
}
function prev() {
  if (step>0) go(page,step-1);
  else if (pages.indexOf(page)>0) {const id=pages[pages.indexOf(page)-1];go(id,stepsOf(id)-1);}
}
function toggleFull() {
  try {
    const result=document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.();
    result?.catch(()=>{});
  } catch { /* optional browser feature */ }
}
const NEXT=new Set(['ArrowRight','ArrowDown',' ','Spacebar','PageDown']);
const PREV=new Set(['ArrowLeft','ArrowUp','PageUp']);
function onKey(event) {
  if (event.metaKey||event.ctrlKey||event.altKey) return false;
  const key=event.key;
  if (NEXT.has(key)) {if(!event.repeat)next();return true;}
  if (PREV.has(key)) {if(!event.repeat)prev();return true;}
  if (event.repeat) return false;
  switch(key.toLowerCase()) {
    case 'home':go(pages[0],0);break;
    case 'end':go(pages.at(-1),stepsOf(pages.at(-1))-1);break;
    case 'n':$('#notes-overlay').hidden=!$('#notes-overlay').hidden;break;
    case 'f':toggleFull();break;
    case 's':presenter.open();break;
    case 'c':break; // Retired: deliberately no model switch, toast or transition.
    default:return false;
  }
  return true;
}
function animate(now) {
  const dt=Math.min(.05,Math.max(0,(now-lastTime)/1000)); lastTime=now;
  if (motion) {
    const m=motion, elapsed=now-m.start, t=Math.min(1,elapsed/SHOT_MS);
    const crossing=m.mask && !m.committed && t>=.5;
    state=interpolate(m.from,m.to,ease(crossing?.5:t));
    // Frame trace (160 ms), then the same 400 ms content reveal as HTML.
    if (!m.mask) {
      const reveal=ease(Math.min(1,Math.max(0,(elapsed-160)/400)));
      for (const inset of state.insets) {
        const from=m.from.insets.find(i=>i.id===inset.id),to=m.to.insets.find(i=>i.id===inset.id);
        inset.opacity=(from?.opacity||0)*(1-reveal)+(to?.opacity||0)*reveal;
      }
    }
    if (m.mask) {
      // 700/900 ms dissolve centered on the 1200 ms camera move; both meet at 600 ms.
      const duration=m.strong?900:700, lead=(SHOT_MS-duration)/2;
      const phase=Math.max(0,Math.min(1,(elapsed-lead)/duration));
      dissolve.draw(crossing?.5:phase);
      if (crossing) {m.committed=true;m.mid();}
    }
    if (t>=1) {state=clone(m.to);motion=null;dissolve.cancel();}
  } else if (!reduced) {
    state.car.rotY+=state.car.spin*dt;
  }
  syncInsetFrames();
  const age=(now-effectStarted)/1000;
  for (const dot of document.querySelectorAll('.page.active .running .circuit-dot')) {
    const track=document.getElementById(dot.dataset.track);
    const phase=reduced?0:shownPage==='p6'?Math.min(1,age/2.4):((now-loopStarted)/9000)%1;
    const point=track.getPointAtLength(track.getTotalLength()*phase);
    dot.setAttribute('cx',point.x);dot.setAttribute('cy',point.y);
    dot.style.opacity=shownPage==='p6' && age>2.4?'0':'1';
  }
  world?.render(state,dt,visibleInsets,reduced,{...activeEffect,age});
  requestAnimationFrame(animate);
}
async function boot() {
  initComponents();fit(); refreshDOM();
  for (const el of document.querySelectorAll('[data-icon]')) {
    let svg='';
    try { svg=iconSVG(el.dataset.icon,{size:512}); } catch { /* optional icon module */ }
    if (svg) el.innerHTML=svg; else el.classList.add('empty');
  }
  await initPixelText();
  try { world=await createWorld($('#world-canvas'),noWebGL); } catch { world=null; }
  if (!world) noWebGL();
  world?.setShot(page,step);world?.apply(state);
  addEventListener('resize',fit);
  addEventListener('keydown',e=>{if(onKey(e))e.preventDefault();});
  document.addEventListener('click',event=>{
    const link=event.target.closest('a');
    if(link){link.target='_blank';link.rel='noopener noreferrer';return;}
    const chapter=event.target.closest('[data-chapter]');
    if(chapter && !chapter.disabled){go(chapter.dataset.chapter,0);return;}
    if(event.target.closest('button,input,textarea,select,#notes-overlay,#toast'))return;
    next();
  });
  document.addEventListener('contextmenu',event=>{if(event.target.closest('a,input,textarea'))return;event.preventDefault();prev();});
  const wake=()=>{document.body.classList.remove('idle');clearTimeout(idleTimer);idleTimer=setTimeout(()=>document.body.classList.add('idle'),2000);};
  addEventListener('mousemove',wake);wake();
  addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(pages.includes(id))go(id,0);});
  motionQuery.addEventListener('change',event=>{
    reduced=event.matches;
    if(reduced){
      if(motion){state=clone(motion.to);if(!motion.committed)motion.mid();motion=null;}
      dissolve.cancel();syncInsetFrames();
      world?.render(state,0,visibleInsets,true,{...activeEffect,age:0});
    }
  });
  window.__app={go,next,prev,stepsOf,pages:[...pages],
    get page(){return page;},get step(){return step;},get car(){return world?.car||null;},
    get transitioning(){return !!motion;},get presenter(){return presenter.window;},
    // Read-only diagnostics for downstream QA; never drive the scene through these.
    get state(){return clone(state);},get carKinds(){return factories.map(f=>f.kind);},
    get family(){return world?.family||[];},get chassis(){return world?.chassis||[];},get wrench(){return world?.wrench||null;},
    get idle(){return world?.idle||null;},get views(){return world?.views||[];},
    get bounds(){return world?.bounds()||[];},get effect(){return world?.effect||null;},
    get props(){return world?.props||[];},get layers(){return world?.layers||{};},
    get lights(){return world?.lights||{};},get camera(){return world?.camera||null;},
    get renderer(){return world?.renderer||null;},
  };
  addEventListener('beforeunload',()=>presenter.dispose());
  lastTime=performance.now(); requestAnimationFrame(animate);
}
void boot();
