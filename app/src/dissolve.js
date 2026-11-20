import { W, H } from './shots.js';

// DOM cells also work when ALL canvas contexts are unavailable.
// Its clock is supplied by the shot engine: the solid frame is exactly t=0.5.
export class Dissolve {
  constructor(el) { this.el = el; this.cells = []; this.active = false; this.mid = false; }
  start({ strong = false, origin = [1250, 570] } = {}) {
    this.cancel();
    this.strong = strong;
    const size = strong ? 96 : 48;
    const cols = Math.ceil(W / size), rows = Math.ceil(H / size);
    this.el.style.setProperty('--cell',`${size}px`);
    const fragment = document.createDocumentFragment();
    this.cells = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const node = document.createElement('i');
      node.style.left = `${x * size}px`; node.style.top = `${y * size}px`;
      const distance = Math.hypot(x*size-origin[0],y*size-origin[1]) / 1700;
      const rank = strong ? distance * .72 + Math.random() * .28 : Math.random();
      const pink = Math.random() < (strong ? .26 : .065);
      node.className = pink ? 'pink' : '';
      fragment.append(node); this.cells.push({ node, rank, out: Math.random() });
    }
    const ranks = this.cells.map(c => c.rank), min = Math.min(...ranks), span = Math.max(...ranks)-min;
    this.cells.forEach(c => { c.rank = (c.rank-min)/(span || 1); });
    this.el.replaceChildren(fragment); this.el.classList.add('running');
    this.el.setAttribute('aria-hidden','true'); this.active = true;
    this.draw(0);
  }
  draw(t) {
    if (!this.active) return;
    const inward = t <= .5;
    const coverage = inward ? Math.min(1,t*2) : Math.max(0,(1-t)*2);
    for (const c of this.cells) {
      const rank = inward ? c.rank : c.out;
      // Paint every cell at midpoint, including rank=1; no gaps in the cover.
      c.node.style.visibility = coverage > 0 && rank <= coverage ? 'visible' : 'hidden';
    }
    if (t >= 1) this.cancel();
  }
  cancel() { this.active = false; this.el.classList.remove('running'); this.el.replaceChildren(); this.cells = []; }
}
