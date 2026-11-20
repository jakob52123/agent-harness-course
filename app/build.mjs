import { build } from './node_modules/esbuild/lib/main.js';
import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const APP=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.dirname(APP);
const args=process.argv.slice(2);let only=null,out=null;
for(let i=0;i<args.length;i++) {
  if(args[i]==='--only' && args[i+1])only=args[++i].split(',');
  else if(args[i]==='--out' && args[i+1])out=args[++i];
  else throw new Error(`Unknown or incomplete argument: ${args[i]}`);
}
if(only && !out)throw new Error('--only requires --out (protect the full deck)');
const OUT=out?path.resolve(APP,out):path.join(ROOT,'Agent-Harness-第二期.html');
const WORK=out?path.join(APP,'_build',`work-${createHash('sha256').update(OUT).digest('hex').slice(0,12)}`):path.join(APP,'_build');
const PY=process.env.PYTHON||'python3';
await mkdir(WORK,{recursive:true});await mkdir(path.dirname(OUT),{recursive:true});
const exists=async file=>{try{await access(file);return true;}catch{return false;}};
const groups={};
for(const [kind,ext] of [['pages','.html'],['shots','.js'],['props','.js']])
  groups[kind]=(await readdir(path.join(APP,'src',kind))).filter(f=>f.endsWith(ext)).map(f=>f.slice(0,-ext.length)).sort();
const selected=n=>!only||n.startsWith('00-')||only.includes(n.split('-')[0]);
for(const kind of ['shots','props'])if(JSON.stringify(groups[kind].filter(selected))!==JSON.stringify(groups.pages.filter(selected)))throw new Error(`Selected chapter filenames differ: pages / ${kind}`);
for(const prefix of only||[])if(!groups.pages.some(n=>n.split('-')[0]===prefix))throw new Error(`Unknown chapter: ${prefix}`);
const names=groups.pages.filter(selected);
const chapterHTML=(await Promise.all(names.map(n=>readFile(path.join(APP,'src/pages',`${n}.html`),'utf8')))).join('\n');
const ids=[...chapterHTML.matchAll(/<section\b([^>]*)>/g)].map(([,attrs])=>{
  const id=attrs.match(/\bid="([^"]+)"/)?.[1], steps=Number(attrs.match(/\bdata-steps="(\d+)"/)?.[1]);
  if(!id||!steps)throw new Error(`Page requires id and positive data-steps: ${attrs}`);
  return [id,steps];
});
const shots={};
for(const name of names) {
  const mod=(await import(pathToFileURL(path.join(APP,'src/shots',`${name}.js`)))).default;
  for(const [id,steps] of Object.entries(mod)) {
    if(shots[id])throw new Error(`Duplicate shot id: ${id}`);shots[id]=steps;
  }
}
if(new Set(ids.map(([id])=>id)).size!==ids.length || JSON.stringify(ids)!==JSON.stringify(Object.entries(shots).map(([id,steps])=>[id,steps.length])))throw new Error('Page order/data-steps must match chapter SHOTS ids/lengths');
const virtual={};
for(const kind of ['shots','props']) {
  const imports=names.map((n,i)=>`import c${i} from ${JSON.stringify(path.join(APP,'src',kind,`${n}.js`))};`).join('\n');
  virtual[`@chapters/${kind}`]=imports+`\nexport default ${kind==='shots'?'{'+names.map((_,i)=>`...c${i}`).join(',')+'}':'['+names.map((_,i)=>`c${i}`).join(',')+']'};`;
}
const carName=await exists(path.join(APP,'src/car-voxel.js'))?'car-voxel':'car-stub';
virtual['@assets']=`import {createCar} from ${JSON.stringify(path.join(APP,`src/${carName}.js`))};
export {iconSVG} from ${JSON.stringify(path.join(APP,'src/icons.js'))};
export const factories=[{kind:${JSON.stringify(carName==='car-voxel'?'voxel':'stub')},createCar}];`;
const result=await build({entryPoints:[path.join(APP,'src/main.js')],bundle:true,format:'iife',platform:'browser',target:['chrome110'],minify:true,legalComments:'none',write:false,metafile:true,
  plugins:[{name:'chapters',setup(b){
    b.onResolve({filter:/^@(assets|chapters\/.*)$/},a=>({path:a.path,namespace:'chapters'}));
    b.onLoad({filter:/.*/,namespace:'chapters'},a=>({contents:virtual[a.path],resolveDir:APP,loader:'js'}));
  }}],
});
await writeFile(path.join(WORK,'bundle-inputs.json'),JSON.stringify(result.metafile.inputs,null,2));
let html=(await readFile(path.join(APP,'src/index.html'),'utf8')).replace('<!--__PAGES__-->',()=>chapterHTML);
// Preview navigation keeps the four labels, disabling only chapters not packaged.
html=html.replace(/<button data-chapter="([^"]+)"/g,(match,id)=>match+(shots[id]?'':' disabled'));
const css=await readFile(path.join(APP,'src/style.css'),'utf8');
const demo=await readFile(path.join(APP,'src/components-demo.html'),'utf8');
const sourceTexts=[];
for(const e of await readdir(path.join(APP,'src'),{withFileTypes:true}))if(e.isFile()&&/\.(js|html|css)$/.test(e.name))sourceTexts.push(await readFile(path.join(APP,'src',e.name),'utf8'));
for(const kind of ['pages','shots','props'])for(const n of names)sourceTexts.push(await readFile(path.join(APP,'src',kind,n+(kind==='pages'?'.html':'.js')),'utf8'));
const characters=[...new Set([...sourceTexts.join('\n'),...'0123456789 /:·—下一页第步允许弹出窗口后再按 S'])].sort().join('');
await writeFile(path.join(WORK,'characters.txt'),characters);
const fonts=[
  ['AH Fusion','fusion-pixel-12px-zh_hans.woff2','fusion.woff2','400','许可-OFL.txt'],
  ['AH Noto','noto-sans-sc/NotoSansSC[wght].ttf','noto.woff2','100 900','noto-sans-sc/OFL.txt'],
  ['AH Silk','silkscreen/Silkscreen-Regular.ttf','silk.woff2','400','silkscreen/OFL.txt'],
];
const env={...process.env,PYTHONDONTWRITEBYTECODE:'1'};let fontCSS='',licenses='';
for(const [family,input,output,weight,license] of fonts) {
  const subset=path.join(WORK,output);
  execFileSync(PY,['-B','-m','fontTools.subset',path.join(APP,'fonts-src',input),`--text-file=${path.join(WORK,'characters.txt')}`,`--output-file=${subset}`,'--flavor=woff2','--no-hinting','--ignore-missing-glyphs'],{env,stdio:['ignore','pipe','pipe'],timeout:120000});
  const data=await readFile(subset);
  fontCSS+=`@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${data.toString('base64')}) format('woff2');font-weight:${weight};font-display:block;}\n`;
  licenses+=`\n${family}\n${await readFile(path.join(APP,'fonts-src',license),'utf8')}\n`;
  console.log(`FONT ${family}: ${data.length} bytes, shared + selected chapter subset`);
}
// Fusion/Noto do not include U+1F4CD. Embed an original pixel pin instead of
// relying on a platform emoji font (or redistributing a proprietary system font).
const pin=path.join(WORK,'pin.woff2');
execFileSync(PY,['-B',path.join(APP,'src/pin-font.py'),pin],{env,timeout:30000});
const pinData=await readFile(pin);
fontCSS+=`@font-face{font-family:'AH Pin';src:url(data:font/woff2;base64,${pinData.toString('base64')}) format('woff2');unicode-range:U+1F4CD;font-display:block;}\n`;
licenses+='\nAH Pin: original pixel pushpin outline, CC0-1.0.\n';
console.log(`FONT AH Pin: ${pinData.length} bytes, embedded placeholder glyph`);
async function inlineImages(input){
  const matches=[...input.matchAll(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi)];
  for(const [tag,,src] of matches){
    if(src.startsWith('data:'))continue;
    if(!src.startsWith('images/'))throw new Error(`Image must be under S2/images/: ${src}`);
    const file=path.resolve(ROOT,src),imageRoot=path.join(ROOT,'images')+path.sep;
    if(!file.startsWith(imageRoot))throw new Error(`Image escapes S2/images/: ${file}`);
    let data;try{data=await readFile(file);}catch{throw new Error(`Missing image: ${file}`);}
    const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.avif':'image/avif'}[path.extname(file).toLowerCase()];
    if(!mime)throw new Error(`Unsupported image: ${file}`);
    input=input.replace(tag,()=>tag.replace(src,`data:${mime};base64,${data.toString('base64')}`));
  }
  return input;
}
const render=async (template,js)=>(await inlineImages(template)).replace('/*__STYLES__*/',()=>fontCSS+css).replace('/*__SCRIPT__*/',()=>js.replace(/<\/script/gi,'<\\/script'))+`\n<!--\nFONT LICENSES (SIL OFL 1.1)\n${licenses.replace(/--/g,'—')}\n-->\n`;
const output=await render(html,result.outputFiles[0].text);
await writeFile(OUT,output);
// A full build refreshes the standalone component gallery; previews never overwrite it.
if(!out){
  const fixture=await build({stdin:{contents:"import {initComponents,updateComponents} from './src/components.js';window.demoStep=n=>{updateComponents(document.body,n);document.querySelector('#demo-step').textContent=n;};initComponents(document);demoStep(3);",resolveDir:APP},bundle:true,format:'iife',write:false,minify:true});
  await writeFile(path.join(APP,'test/components.html'),await render(demo,fixture.outputFiles[0].text));
}
console.log(`CHAPTERS ${names.join(', ')}; ${ids.length} pages / ${ids.reduce((n,[,s])=>n+s,0)} steps`);
console.log(`BUILD OK ${OUT} (${(Buffer.byteLength(output)/1024/1024).toFixed(2)} MiB)`);
