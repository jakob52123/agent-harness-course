// Intentionally about:blank: file:// does not permit cross-file DOM access.
export class Presenter {
  constructor({ snapshot, key, notify }) {
    this.snapshot = snapshot; this.key = key; this.notify = notify;
    this.window = null; this.started = null;
    this.timer = setInterval(() => this.tick(), 500);
  }
  open() {
    if (this.started === null) this.started = Date.now();
    if (this.window && !this.window.closed) { this.window.focus(); this.refresh(); return; }
    let win;
    try { win = window.open('', 'ah-presenter', 'width=1280,height=800'); } catch { /* blocked */ }
    if (!win) { this.notify('允许弹出窗口后再按 S'); return; }
    this.window = win;
    const doc = win.document;
    doc.open();
    doc.write(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Agent Harness</title>
      <style>${[...document.styleSheets[0].cssRules].filter(r=>r.selectorText===':root'||(r.type===CSSRule.FONT_FACE_RULE && r.cssText.includes('AH Noto'))).map(r=>r.cssText).join('\n')}
      *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:24px/1.7 'AH Noto',sans-serif;padding:48px}
      header{display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:20px;color:var(--ink2)}
      h1{font-size:42px;line-height:1.2;margin:32px 0}#notes{max-width:1100px}a{color:var(--accent)}td,th{border:1px solid var(--line);padding:8px;text-align:left}
      footer{margin-top:40px;border-top:1px solid var(--line);padding-top:20px;color:var(--ink2)}
      button{font:inherit;color:inherit;border:1px solid var(--line);background:transparent;padding:0 18px;cursor:pointer}</style>
      <header><span id="status"></span><button id="elapsed" title="点击清零">00:00</button></header>
      <h1 id="title"></h1><div id="notes"></div><footer id="next"></footer></html>`);
    doc.close();
    doc.getElementById('elapsed').addEventListener('click', () => { this.started = Date.now(); this.tick(); });
    win.addEventListener('keydown', e => { if (this.key(e)) e.preventDefault(); });
    this.refresh();
  }
  refresh() {
    const win = this.window;
    if (!win || win.closed) return;
    try {
      const data = this.snapshot(), doc = win.document;
      doc.getElementById('title').textContent = data.title;
      doc.getElementById('notes').innerHTML = data.notes;
      for (const link of doc.querySelectorAll('#notes a')) {
        link.href = new URL(link.getAttribute('href'),data.base).href;
        link.target = '_blank'; link.rel = 'noopener noreferrer';
      }
      doc.getElementById('status').textContent = `第 ${data.index + 1} / ${data.total} 页 · 第 ${data.step + 1} / ${data.steps} 步`;
      doc.getElementById('next').textContent = `下一页：${data.nextTitle || '—'}`;
      this.tick();
    } catch { this.window = null; }
  }
  tick() {
    if (!this.window || this.window.closed || this.started === null) return;
    const seconds = Math.max(0,Math.floor((Date.now()-this.started)/1000));
    const text = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    try { this.window.document.getElementById('elapsed').textContent = text; } catch { this.window = null; }
  }
  dispose() { clearInterval(this.timer); if (this.window && !this.window.closed) this.window.close(); }
}
