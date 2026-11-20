#!/usr/bin/env python3
"""Offline, headless-only deck acceptance. No web servers, real accounts or videos."""
import argparse
import base64
import json
import re
from math import cos, pi
from pathlib import Path
import sys
import time
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--file', type=Path, default=HERE.parent.parent / 'Agent-Harness-第二期.html')
parser.add_argument('--pages', help='Comma-separated DOM page ids; only these pages are exercised')
parser.add_argument('--outdir', type=Path, default=HERE / 'shots')
args = parser.parse_args()
FILE = args.file.resolve()
SHOTS = args.outdir.resolve()
SHOTS.mkdir(parents=True, exist_ok=True)
errors, remote_requests = [], []
COUNTS = {}  # Populated from section.page[data-steps], never a fixed page list.
layout_report = {}


def watch(page):
    page.on('pageerror', lambda error: errors.append(f'pageerror: {error}'))
    page.on('console', lambda msg: errors.append(f'console error: {msg.text}') if msg.type == 'error' else None)
    page.on('request', lambda req: remote_requests.append(req.url) if req.url.startswith(('http:', 'https:')) else None)


def context(browser, **kwargs):
    ctx = browser.new_context(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1, **kwargs)
    ctx.set_offline(True)
    ctx.on('page', watch)
    return ctx


def ready(page, anchor='p1'):
    page.goto(FILE.as_uri() + '#' + anchor)
    page.wait_for_function('window.__app && !__app.transitioning', timeout=60000)
    page.wait_for_timeout(100)


def settled(page):
    try:
        page.wait_for_function('window.__app && !__app.transitioning', timeout=30000)
    except Exception:
        print('Unsettled page / hash:', page.url.rsplit('#', 1)[-1], file=sys.stderr)
        raise
    page.wait_for_timeout(80)


def state(page):
    return page.evaluate('({page:__app.page, step:__app.step, hash:location.hash})')


def check_state(page, expected):
    got = state(page)
    assert (got['page'], got['step'], got['hash']) == (*expected, '#' + expected[0]), (got, expected)
    assert page.locator('.page.active').get_attribute('id') == expected[0]
    check_isolation(page)
    if expected[0] not in {'p1', 'p2', 'c1', 'p3', 'c2', 'p4', 'p32', 'p5', 'c3'}:
        return  # Later chapters may deliberately have no car.
    if expected[0] == 'p32':
        return  # Summary page: isolation checked above.
    demo = expected == ('p5', 4)
    if page.locator('html').evaluate("el=>el.classList.contains('no-webgl')"):
        if not demo:
            assert page.locator('.page.active [data-icon="car"]').is_visible(), 'Static car/part fallback must be visible'
    elif demo:
        assert page.evaluate('__app.state.world.backdrop===0'), 'Pi replaces the faded car'
    else:
        assert page.evaluate('''__app.car?.group.visible && __app.views.some(v=>v.view==='car' && (v.layer&2) && v.opacity>=.2)'''), 'Car must render except under the Pi screenshot'


def check_isolation(page):
    qa = page.evaluate('''() => ({page:__app.page,props:__app.props,layers:__app.layers,
      webgl:!document.documentElement.classList.contains('no-webgl'),
      carVisible:__app.car?.group.visible,expected:__app.state.car.visible,
      nav:[...document.querySelectorAll('[data-chapter].current')].map(b=>({id:b.dataset.chapter,color:getComputedStyle(b).color}))})''')
    chapters = [id_ for id_ in COUNTS if id_.startswith('c')]
    if chapters:
        preceding = [id_ for id_ in chapters if list(COUNTS).index(id_) <= list(COUNTS).index(qa['page'])]
        assert qa['nav'] == [{'id':preceding[-1] if preceding else chapters[0], 'color':'rgb(27, 25, 22)'}], qa
    if not qa['webgl']:
        return
    assert qa['carVisible'] == qa['expected'], qa
    assert len(set(qa['layers'].values())) == len(qa['layers']), qa
    allowed = {'p2': {2, 3, 4}, 'p11': {8}, 'p17': {13}}.get(qa['page'], set())
    for prop in qa['props']:
        assert not prop['visible'] or prop['layer'] in {1 << n for n in allowed}, qa
    for name, layer in qa['layers'].items():
        if name.startswith('ch02-'): assert 5 <= layer <= 9, qa
        if name.startswith('ch03-'): assert 10 <= layer <= 14, qa
        if name.startswith('ch04-'): assert 15 <= layer <= 19, qa


def go(page, id_, step=0):
    page.evaluate('([id,step])=>__app.go(id,step)', [id_, step])
    settled(page)
    check_state(page, (id_, step))


def check_opacity(page):
    rows = page.evaluate('''() => [...document.querySelectorAll('.page.active [data-step], .page.active .on')].map(el => ({
        n:Number(el.dataset.step || 0), opacity:Number(getComputedStyle(el).opacity), current:__app.step,
        gray:el.classList.contains('is-gray'),part:el.matches('#p4 .parts-list>[data-step]'),on:el.classList.contains('on')
    }))''')
    for row in rows:
        if row['part']:
            assert row['opacity'] >= .95 and row['on'] == (row['n'] <= row['current']), row
        elif row['n'] <= row['current']:
            assert (.15 <= row['opacity'] <= .5) if row['gray'] else row['opacity'] >= .95, row
        else:
            assert .15 <= row['opacity'] <= .5, row


def screenshot(page, name):
    page.screenshot(path=str(SHOTS / name), animations='allow')


def transition_shots(page, before, after, capture=True):
    go(page, before, page.evaluate('(id)=>__app.stepsOf(id)-1', before))
    page.evaluate('''() => {
      const q=window.__transitionQA={from:__app.state.cam,frames:[],started:false};
      const sample=()=>{
        q.started ||= __app.transitioning;
        const cells=[...document.querySelectorAll('#dissolve i')];
        q.frames.push({page:document.querySelector('#stage').dataset.page,cam:__app.state.cam,
          total:cells.length,visible:cells.filter(c=>getComputedStyle(c).visibility==='visible').length,
          size:cells.length?[cells[0].getBoundingClientRect().width,cells[0].getBoundingClientRect().height]:null});
        if(!q.started||__app.transitioning)requestAnimationFrame(sample);
      };requestAnimationFrame(sample);
    }''')
    page.keyboard.press('ArrowRight')
    start = time.monotonic()
    if capture:
        for k, at in enumerate((.32, .49, .68, .87), 1):
            page.wait_for_timeout(max(0, at - (time.monotonic() - start)) * 1000)
            screenshot(page, f'trans-{before}-{after}-{k}.png')
    settled(page)
    check_state(page, (after, 0))
    q = page.evaluate('__transitionQA')
    changed = next(frame for frame in q['frames'] if frame['page'] == after)
    assert changed['visible'] == changed['total'] > 0, changed
    assert changed['size'] == ([96, 96] if before.startswith('c') or after.startswith('c') else [48, 48]), changed['size']
    to = page.evaluate('__app.state.cam')
    for field in ['pos', 'look', 'center']:
        for a, b, mid in zip(q['from'][field], to[field], changed['cam'][field]):
            assert abs((a + b) / 2 - mid) < 1e-6, (field, a, b, mid)
    assert abs((q['from']['fov'] + to['fov']) / 2 - changed['cam']['fov']) < 1e-6


def check_information(page):
    data = page.evaluate('''() => {
      const root=document.querySelector('.page.active'),stage=document.querySelector('#stage').getBoundingClientRect(),scale=stage.width/1920;
      const box=r=>({x:(r.x-stage.x)/scale,y:(r.y-stage.y)/scale,width:r.width/scale,height:r.height/scale});
      const visible=el=>{
        for(let node=el;node && node!==document.body;node=node.parentElement){
          const s=getComputedStyle(node);
          if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;
        }return true;
      };
      const texts=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()){
        const n=walker.currentNode,el=n.parentElement,t=n.textContent.trim();
        if(!t||!visible(el)||el.closest('.notes,svg'))continue;
        const r=document.createRange();r.selectNodeContents(n);
        texts.push({text:t,...box(r.getBoundingClientRect())});
      }
      for(const el of root.querySelectorAll('[data-pixeltext]'))if(visible(el))texts.push({text:el.dataset.pixeltext,...box(el.getBoundingClientRect())});
      const infos=[...root.querySelectorAll('.info')].filter(visible).map(el=>({text:el.getAttribute('aria-label')||el.textContent,size:parseFloat(getComputedStyle(el).fontSize),...box(el.getBoundingClientRect())}));
      return {page:__app.page,step:__app.step,bounds:__app.bounds,texts,infos};
    }''')
    key = f"{data['page']}-{data['step']}"
    assert data['infos'], key
    assert all(info['size'] >= 48 for info in data['infos']), data['infos']
    for text in data['texts']:
        # The approved P14 keyword is not an explanatory instruction.
        checked = text['text'].replace('少占人的注意力', '') if data['page'] == 'p14' else text['text']
        assert not any(word in checked for word in ['这是', '注意', '也就是说']), text
        assert text['x'] >= 0 and text['y'] >= 0 and text['x'] + text['width'] <= 1920.1 and text['y'] + text['height'] <= 1080.1, text
    if key != 'p5-4':
        for car in data['bounds']:
            assert car['width'] <= 1920 * .42, (key, car)
            assert 0 <= car['x'] and car['x'] + car['width'] <= 1920, (key, car)
            for text in data['texts']:
                overlap = (min(car['x'] + car['width'], text['x'] + text['width']) > max(car['x'], text['x']) and
                           min(car['y'] + car['height'], text['y'] + text['height']) > max(car['y'], text['y']))
                assert not overlap, (key, car, text)
    else:
        assert page.locator('.pi-demo img').evaluate('el=>el.complete && el.naturalWidth>0')
        assert page.locator('.pi-demo').is_visible()
        assert abs(page.locator('.pi-demo').bounding_box()['width'] / 1920 - .45) < .01
        encoded = page.locator('.pi-demo img').get_attribute('src').split(',', 1)[1]
        assert base64.b64decode(encoded) == (HERE.parent.parent / 'images/pi-demo-flow.webp').read_bytes()
        assert page.locator('.pi-demo .callout').text_content() == 'Pi'
    layout_report[key] = data


def check_chapter_content(page):
    source = (HERE.parent.parent / '资料/content-ch01.md').read_text()
    compact = lambda text: re.sub(r'\s+', '', text)
    for number in range(3, 6):
        section = re.search(rf'^## P{number} .*?\n(.*?)(?=^## |\Z)', source, re.M | re.S).group(1)
        notes = section.split('- **讲稿**\n', 1)[1]
        lines = []
        for line in notes.splitlines():
            if not line.strip() or set(line.strip()) <= set('|- '):
                continue
            line = re.sub(r'^\s*-\s+', '', line).replace('**', '').replace('`', '').replace('|', '')
            lines.append(line)
        actual = page.locator(f'#p{number} .notes').text_content()
        assert compact(actual) == compact(''.join(lines)), f'P{number} notes differ from content-ch01.md'
    assert page.locator('#p2 .notes').text_content() == '今天主要讲 Agent Harness。Agent Harness 对我们产品经理来说非常重要，因为大家都要去做 Agent 产品。今天只抓两个词：Loop 回答 AI 为什么能自己接着干；Harness 回答为什么同一个模型套不同壳子，就是不同的 Agent 产品。全课分四部分：第一部分讲 Agent Harness 是什么；第二部分拆 Agent Harness 的组成部分，看车里的零件和 Loop 怎么转；第三部分看市面上有哪些 Harness 和 Agent 产品；第四部分讲我们 AI 产品经理怎么做——前三块让你能懂，第四块让你能干。'
    assert page.locator('#p4 [data-inset]').count() == 0
    assert page.locator('#p4 .parts-list>div').count() == 5
    assert page.locator('#p5 .beat').all_text_contents() == ['看', '想', '做']
    assert page.evaluate('''__app.chassis.length===3 && __app.chassis.every(c=>
      !c.parts.body.children.some(m=>m.visible) && c.parts.wheels.children.some(m=>m.visible))''')
    bundle = json.loads((HERE.parent / '_build/bundle-inputs.json').read_text())
    assert not any(Path(name).name in ['car-glb.js', 'rig.js'] for name in bundle)
    print('PASS verbatim P2/P3-P5 notes, clickable links, 3 chassis, list copy; GLB and rig excluded')


def check_all_content(page):
    compact = lambda text: re.sub(r'\s+', '', text)
    checked = 0
    for chapter in range(1, 5):
        source = (HERE.parent.parent / f'资料/content-ch{chapter:02}.md').read_text()
        for match in re.finditer(r'^## ([pc]\d+) [^\n]*\n(.*?)(?=^## |\Z)', source, re.M | re.S | re.I):
            id_, section = match.group(1).lower(), match.group(2)
            if id_ not in COUNTS:
                continue
            steps = re.search(r'^## ' + id_ + r' .*?（(\d+) 步）', source, re.M | re.I)
            if steps:
                expected_steps = (5 if id_ == 'p5' else int(steps.group(1))) if id_ in {'p3', 'p4', 'p5'} else 1
                assert COUNTS[id_] == expected_steps, id_
            notes = re.search(r'- \*\*讲稿\*\*[：:]?(.*)', section, re.S)
            if not notes:
                # c4 uses the unbolded chapter-note form.
                notes = re.search(r'- 讲稿：「(.*?)」', section, re.S)
            if not notes:
                continue
            lines = []
            for line in notes.group(1).splitlines():
                if not line.strip() or set(line.strip()) <= set('|- '):
                    continue
                lines.append(re.sub(r'^\s*-\s+', '', line).replace('**', '').replace('`', '').replace('|', ''))
            actual = page.locator(f'#{id_} .notes').text_content()
            assert compact(actual) == compact(''.join(lines)), f'{id_} notes differ from content-ch{chapter:02}.md'
            checked += 1
    leaks = page.evaluate('''() => {
      const leaks=[];
      for(const style of document.querySelectorAll('#pages>style')){
        const owned=new Set();let node=style.nextElementSibling;
        while(node && node.tagName!=='STYLE'){if(node.matches('.page'))owned.add(node.id);node=node.nextElementSibling;}
        const walk=rules=>{for(const rule of rules){
          if(rule.selectorText){
            const selector=rule.selectorText.replace(/::[a-z-]+/g,'').replace(/#stage\\[data-page="[^"]+"\\]/g,'#stage').replace(/:not\\(\\[data-step="[^"]+"\\]\\)/g,'').replace(/\\[data-step="[^"]+"\\]/g,'');
            for(const el of document.querySelectorAll(selector)){
              const root=el.closest('.page');if(root&&!owned.has(root.id))leaks.push([rule.selectorText,root.id]);
            }
          }else if(rule.cssRules && rule.type!==CSSRule.KEYFRAMES_RULE)walk(rule.cssRules);
        }};walk(style.sheet.cssRules);
      }return leaks;
    }''')
    assert not leaks, leaks
    assert page.locator('.notes a[href^="file:"], .notes a[href^="/Users/"]').count() == 0
    print(f'PASS content: {checked} verbatim notes; single-step non-car pages / specified car counts (P5=5); chapter CSS isolation; no absolute local note links')


def sample_effect(page, id_, before, after, part, flashes=1):
    go(page, id_, before)
    page.evaluate('''([id,step,part])=>{
      const q=window.__effectQA={start:performance.now(),frames:[],done:false};
      __app.go(id,step);
      const sample=()=>{
        q.frames.push({time:performance.now()-q.start,part:__app.effect.part,value:__app.effect.value,lit:__app.lights[part],x:__app.car.group.position.x});
        if(performance.now()-q.start<2800)requestAnimationFrame(sample);else q.done=true;
      };requestAnimationFrame(sample);
    }''', [id_, after, part])
    page.wait_for_function('__effectQA.done', timeout=30000)
    frames = page.evaluate('__effectQA.frames')
    peaks = 0
    on = False
    for frame in frames:
        bright = frame['value'] > .55
        if bright and not on:
            peaks += 1
        on = bright
        assert frame['part'] == part
        assert abs(frame['lit'] - frame['value']) < 1e-8, frame
    assert peaks == flashes, (id_, after, peaks)
    assert frames[-1]['value'] == 0 and max(f['value'] for f in frames) > .8, frames
    return frames


def check_effects(page):
    # U2: inspect rendered motion, not the old authored fake-X/flash effects.
    geometry = []
    def sample(seconds):
        page.evaluate('''seconds=>{
          const q=window.__driveQA={start:performance.now(),rows:[],done:false};
          const tick=()=>{
            const d=__drive,c=__app.car,dot=document.querySelector('#p5 .circuit-dot');
            q.rows.push({ms:performance.now()-q.start,...Object.fromEntries(Object.keys(d).map(k=>[k,d[k]])),
              x:c.group.position.x,engine:c.parts.engine.scale.x,lights:__app.lights,
              bounds:__app.bounds,cam:{pos:__app.camera.position.toArray(),fov:__app.camera.fov,rotation:__app.camera.quaternion.toArray()},
              wheel:c.parts.wheels.children[0].rotation.x,cx:+dot.getAttribute('cx'),cy:+dot.getAttribute('cy')});
            if(performance.now()-q.start<seconds*1000)requestAnimationFrame(tick);else q.done=true;
          };requestAnimationFrame(tick);
        }''', seconds)
        page.wait_for_function('__driveQA.done', timeout=int(seconds * 1000 + 30000))
        rows = page.evaluate('__driveQA.rows')
        # U2-r2: projected Box3 throughout motion, not just its two lane endpoints.
        page_id = page.evaluate('__app.page')
        for row in rows:
            for box in row['bounds']:
                if page_id == 'p3':  # R2: larger illustration, inset from the folio.
                    assert 640 <= box['width'] <= 800, box
                    assert 0 <= box['x'] and box['x'] + box['width'] <= 1800 and box['y'] + box['height'] <= 1000, box
                else:
                    assert 480 <= box['width'] <= 620, box
                    assert box['x'] >= 1260 and box['x'] + box['width'] <= 1920, box
                geometry.append({'page':page_id,'lane':row['lane'],**box})
        return rows

    def lit_parts(*parts):
        assert page.evaluate('(p)=>p.every(n=>__app.lights[n]===1)', list(parts))

    assert page.evaluate('''Object.isFrozen(__drive) && Object.values(Object.getOwnPropertyDescriptors(__drive))
      .every(d=>typeof d.get==='function' && !d.set)''')
    go(page, 'c1', 0)
    assert page.evaluate('!__drive.active && __drive.road===0')
    for step in range(4):
        go(page, 'p3', step)
        rows = sample(.3)
        assert all(r['active'] and r['road'] > .5 for r in rows)
        assert rows[0]['wheel'] != rows[-1]['wheel']
    go(page, 'p3', 1)
    assert page.evaluate('__app.lights.driver===1 && __app.state.car.gray===1 && __app.state.car.dim===0')
    go(page, 'p3', 2)
    assert page.evaluate('__app.lights.driver===1 && __app.lights.body>0')
    go(page, 'p3', 3)
    assert page.evaluate('__app.car.parts.driver2.visible && !__app.car.parts.driver.visible && __app.state.car.driver===2')
    assert page.locator('.formula').evaluate("el=>el.classList.contains('flash')")
    go(page, 'p4', 0)
    assert page.evaluate('__app.state.car.gray===1 && __app.state.car.dim===0')
    assert page.evaluate('__drive.active && __drive.road>.5 && Object.values(__app.lights).every(v=>v===0)')
    assert page.locator('#p4 .part-caption').count() == 0
    origin = page.evaluate('__app.car.parts.engine.position.toArray()')
    assert page.locator('#p4 .parts-list [data-step]').evaluate_all('els=>els.map(e=>+e.dataset.step)') == [1, 2, 3, 4, 5]
    captions = ['司机', '方向盘', '挡风玻璃', '行车记录仪', '看 · 判断 · 操作']
    for step, parts in enumerate([['driver'], ['steering'], ['windshield'], ['dashcam'], None], 1):
        go(page, 'p4', step)
        if parts is not None:  # Step 5 has beat-dependent lights.
            lit_parts(*parts)
            assert page.evaluate('(p)=>Object.entries(__app.lights).every(([n,v])=>v===(p.includes(n)?1:0))', parts)
        assert page.evaluate('__app.state.car.explode===0')
        assert page.evaluate('__app.state.car.gray') == 1
        assert page.evaluate('__app.state.car.dim===0')
        assert page.locator('#p4 .part-caption').all_text_contents() == [captions[step-1]]
        if step == 1:
            rows = sample(1.2)
            assert rows[0]['wheel'] != rows[-1]['wheel'] and rows[-1]['road'] > .5
            assert page.evaluate('__app.car.parts.driver.visible')
        elif step == 2:
            rows = sample(6.5)
            peak = max(range(len(rows)), key=lambda i: rows[i]['lane'])
            assert rows[peak]['lane'] > .95 and min(r['lane'] for r in rows[peak:]) < .05
            assert max(r['steer'] for r in rows) > .4 and min(r['steer'] for r in rows) < -.4
            assert max(r['x'] for r in rows) - min(r['x'] for r in rows) > 2.7
        elif step == 3:
            rows = sample(2.5)
            assert rows[-1]['beam'] > .95 and rows[-1]['frames'] == 0
        elif step == 4:
            rows = sample(2.5)
            assert rows[-1]['frames'] > rows[0]['frames'] and rows[-1]['frames'] >= 3
            assert rows[-1]['beam'] < .05
        else:
            rows = sample(19)
            order = ['look', 'think', 'act', 'relook']
            beats = [r['beat'] for i, r in enumerate(rows) if not i or r['beat'] != rows[i-1]['beat']]
            assert len(beats) >= 8 and all(order[(order.index(a)+1) % 4] == b for a, b in zip(beats, beats[1:]))
            for row in rows:
                part = {'look':'windshield', 'think':'driver', 'act':'steering'}.get(row['beat'])
                assert {name for name, v in row['lights'].items() if v} == ({part} if part else set())
            act_lanes = [r['lane'] for r in rows if r['beat'] == 'act']
            assert max(act_lanes) - min(act_lanes) > .95
            assert rows[-1]['road'] > .5 and page.evaluate('!__app.state.drive.trail && !__app.state.drive.gate')
    go(page, 'p4', 6)
    assert page.evaluate('__app.state.car.explode===1 && !__app.car.parts.driver.visible && !__app.car.parts.driver2.visible')
    assert page.evaluate('__app.car.parts.engine.position.toArray()') != origin
    exploded = ['engine', 'steering', 'windshield', 'dashcam', 'nav', 'brake']
    lit_parts(*exploded)
    assert page.evaluate('(p)=>Object.entries(__app.lights).every(([n,v])=>v===(p.includes(n)?1:0))', exploded)
    assert page.locator('#p4 .part-caption').count() == 0
    assert page.evaluate('__drive.road===0')
    assert page.evaluate('__app.state.car.gray===1 && __app.state.car.dim===0')
    go(page, 'p5', 0)
    assert page.evaluate('__app.state.car.xray>.8 && __app.lights.engine===1 && __drive.road>.5')
    go(page, 'p5', 1)
    lit_parts('windshield')
    assert page.evaluate('__drive.beam>.9')
    go(page, 'p5', 2)
    lit_parts('driver')
    go(page, 'p5', 3)
    rows = sample(18)
    # A single tracking camera for all four beats: no phase-driven cut/zoom/yaw.
    for row in rows:
        assert row['cam']['fov'] == rows[0]['cam']['fov']
        assert all(abs(a-b) < 1e-9 for a, b in zip(row['cam']['rotation'], rows[0]['cam']['rotation']))
        assert abs((row['cam']['pos'][0]-rows[0]['cam']['pos'][0]) - 2.9*(row['lane']-rows[0]['lane'])) < 1e-9
    order = ['look', 'think', 'act', 'relook']
    runs = [r for i, r in enumerate(rows) if i == 0 or r['beat'] != rows[i-1]['beat']]
    assert len(runs) >= 8 and all(order[(order.index(a['beat'])+1) % 4] == b['beat'] for a, b in zip(runs, runs[1:]))
    relooks = [r for r in runs if r['beat'] == 'relook']
    assert len(relooks) >= 2 and abs(relooks[1]['lane'] - relooks[0]['lane']) > .95
    for row in rows:
        part = {'look':'windshield', 'think':'driver', 'act':'steering'}.get(row['beat'])
        assert row['lights'][part] == 1 if part else not any(row['lights'].values())
        # Only the top edge: the last few pixels of the left return edge are relook.
        if row['cy'] == 140 and row['cx'] < 410:
            assert row['beat'] == 'look', row
        if row['cy'] == 140 and 460 < row['cx'] < 725:
            assert row['beat'] == 'think', row
    for a, b in zip(runs, runs[1:]):
        if a['beat'] == 'act':
            assert b['ms'] - a['ms'] >= 1550
    page.emulate_media(reduced_motion='reduce')
    try:
        for id_, step in [('p4', 1), ('p4', 2), ('p4', 3), ('p4', 4), ('p4', 5), ('p5', 3)]:
            go(page, id_, step)
            rows = sample(.65)
            assert all(r['road'] == 0 and r['steer'] == 0 and r['lane'] == rows[0]['lane'] and r['frames'] == rows[0]['frames'] and r['wheel'] == rows[0]['wheel'] for r in rows)
            if id_ == 'p4' and step == 5:
                assert all(r['beat'] == 'look' and r['lights']['windshield'] == 1 and r['lane'] == 0 for r in rows)
    finally:
        page.emulate_media(reduced_motion='no-preference')
    (SHOTS / 'drive-geometry.json').write_text(json.dumps(geometry, indent=2) + '\n')
    print('PASS U2 drive: rolling wheels/road; driver swap; driver, steering, glass, dashcam, four-beat Loop then explode; Tools lanes; beam/frames; synced four-beat Loop; reverse/reduced motion')


def legacy_regressions():
    assert FILE.is_file(), FILE
    for pattern in ['*-alt.png', 'trans-*.png', 'probe-*.png', '*-contact.jpg', 'contact-sheet.jpg']:
        for old in SHOTS.glob(pattern):
            old.unlink()
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        ctx = context(browser)
        page = ctx.new_page()
        ready(page)
        assert not page.locator('html').evaluate("el=>el.classList.contains('no-webgl')"), 'Normal Chrome must render WebGL'
        sequence = page.evaluate('''[...document.querySelectorAll('.page')].flatMap(el=>Array.from({length:Number(el.dataset.steps)},(_,step)=>[el.id,step]))''')
        sequence = [tuple(x) for x in sequence]
        assert sequence == [(id_, step) for id_, count in COUNTS.items() for step in range(count)], sequence
        check_state(page, sequence[0])
        screenshot(page, 'p1-0.png')
        forward = 0
        for expected in sequence[1:]:
            page.keyboard.press('ArrowRight'); forward += 1
            settled(page); check_state(page, expected); check_opacity(page)
            screenshot(page, f'{expected[0]}-{expected[1]}.png')
        assert forward == len(sequence) - 1
        backward = 0
        for expected in reversed(sequence[:-1]):
            page.keyboard.press('ArrowLeft'); backward += 1
            settled(page); check_state(page, expected); check_opacity(page)
        assert backward == len(sequence) - 1
        print(f'PASS navigation: {forward} forward / {backward} backward; anchors and all {len(sequence)} step screenshots')
        go(page, 'p2')
        page.reload(); settled(page)
        check_state(page, ('p2', 0)); check_opacity(page)
        assert COUNTS['p2'] == 1
        assert page.locator('#p2 .agenda-list>li.on').count() == 4
        assert page.locator('#p2 .learning-line.on.current').count() == 1
        assert page.evaluate('__app.state.insets.length===4 && __app.state.insets.every(i=>i.opacity===1)')
        print('PASS refresh #p2 -> its only step; all four items/insets and learning line already lit')
        assert page.evaluate('''() => __app.state.insets.every(inset=>{
          const r=document.getElementById(inset.id).getBoundingClientRect();
          return [r.x,r.y,r.width,r.height].every((v,i)=>Math.abs(v-inset.rect[i])<.01);
        })''')
        assert page.evaluate('''() => [...document.querySelectorAll('[data-pixeltext]')].every(el=>{
          return !el.querySelector('canvas') && el.textContent.trim()===el.dataset.pixeltext &&
            el.getAttribute('aria-label')===el.dataset.pixeltext && getComputedStyle(el).fontFamily.includes('AH Noto');
        })''')
        go(page, 'p3')  # Only car pages still have intra-page steps.
        page.evaluate('''() => {
          window.__stepMask=false;
          const el=document.querySelector('#dissolve');
          window.__stepObserver=new MutationObserver(r=>{if(el.classList.contains('running')||r.some(x=>(x.oldValue||'').includes('running')))window.__stepMask=true;});
          __stepObserver.observe(el,{attributes:true,attributeOldValue:true,attributeFilter:['class']});
        }''')
        page.keyboard.press('ArrowRight'); settled(page)
        assert not page.evaluate('__stepMask')
        page.evaluate('__stepObserver.disconnect()')
        print('PASS inset/HTML alignment; native labelled Noto titles; no dissolve for an intra-page step')

        # Compare canonical numeric states, rather than only the page indicator.
        reference = {}
        for id_, step in sequence:
            go(page, id_, step)
            reference[f'{id_}:{step}'] = page.evaluate('''() => {
              const s=__app.state; if(__app.page==='p1') {s.car.rotY=0;} return s;
            }''')
        for id_, step in sequence[::2][::-1] + sequence[1::2]:
            go(page, id_, step)
            got = page.evaluate("() => {const s=__app.state;if(__app.page==='p1'){s.car.rotY=0;}return s;}")
            assert got == reference[f'{id_}:{step}'], (id_, step)
        page.evaluate("__app.go('p2',0);__app.go('c1',0);__app.go('p1',0);__app.go('p2',0)")
        settled(page); check_state(page, ('p2', 0)); check_opacity(page)
        page.keyboard.press('End'); settled(page); check_state(page, sequence[-1])
        page.keyboard.press('Home'); settled(page); check_state(page, ('p1', 0))
        go(page, 'p2'); page.locator('[data-chapter=c1]').click(); settled(page); check_state(page, ('c1', 0))
        assert page.locator('nav button:disabled').count() == 0
        assert page.locator('nav button').all_text_contents() == ['01 是什么', '02 组成', '03 有哪些', '04 怎么做']
        for button in page.locator('nav button').all():
            button.click(); settled(page)
            check_state(page, (button.get_attribute('data-chapter'), 0))
        print('PASS arbitrary jumps / rapid interruption / backward inheritance / Home / End / chapter navigation')

        go(page, 'p2')
        page.keyboard.press('n'); assert page.locator('#notes-overlay').is_visible()
        expected_notes = page.locator('#p2 .notes').text_content()
        assert page.locator('#notes-overlay').text_content() == expected_notes
        page.keyboard.press('n'); assert page.locator('#notes-overlay').is_hidden()
        go(page, 'p1')
        with page.expect_popup() as popup_info:
            page.keyboard.press('s')
        popup = popup_info.value
        popup.wait_for_selector('#notes')
        assert popup.locator('#notes').text_content() == page.locator('#p1 .notes').text_content()
        assert popup.url == 'about:blank'
        page.keyboard.press('ArrowRight'); settled(page)
        assert popup.locator('#notes').text_content() == expected_notes
        assert popup.locator('#status').text_content() == f'第 2 / {len(COUNTS)} 页 · 第 1 / {COUNTS["p2"]} 步'
        popup.keyboard.press('ArrowRight'); settled(page); check_state(page, ('c1', 0))
        assert popup.locator('#status').text_content() == f'第 3 / {len(COUNTS)} 页 · 第 1 / {COUNTS["c1"]} 步'
        popup.locator('#elapsed').click(); assert popup.locator('#elapsed').text_content() == '00:00'
        go(page, 'p5', 4)
        assert popup.locator('#notes').text_content() == page.locator('#p5 .notes').text_content()
        assert popup.locator('#notes a[href^="https:"]').count() == 0
        assert all(a.get_attribute('target') == '_blank' for a in popup.locator('#notes a').all())
        page.keyboard.press('n')
        assert page.locator('#notes-overlay a[href^="https:"]').count() == 0
        page.keyboard.press('n')
        popup.close()
        page.evaluate('window.__realOpen=window.open;window.open=()=>null')
        page.keyboard.press('s')
        assert page.locator('#toast').text_content() == '允许弹出窗口后再按 S'
        assert page.locator('#toast').is_visible()
        page.wait_for_timeout(3100); assert page.locator('#toast').is_hidden()
        page.evaluate('window.open=window.__realOpen;delete window.__realOpen')
        print('PASS N notes; S about:blank presenter, bidirectional keys, timer reset, blocked-popup toast')

        # All specified next/previous inputs, without requiring network or real fullscreen UI.
        go(page, 'p2')
        cursor = sequence.index(('p2', 0))
        for key in ['ArrowDown', 'Space', 'PageDown']:
            page.keyboard.press(key); settled(page); cursor += 1
            check_state(page, sequence[cursor])
        for key in ['ArrowUp', 'PageUp']:
            page.keyboard.press(key); settled(page); cursor -= 1
            check_state(page, sequence[cursor])
        page.mouse.click(70, 500); settled(page); cursor += 1
        check_state(page, sequence[cursor])
        page.mouse.click(70, 500, button='right'); settled(page); cursor -= 1
        check_state(page, sequence[cursor])
        page.evaluate('''() => {
          window.__fullCalls=0;
          document.documentElement.requestFullscreen=()=>{window.__fullCalls++;return Promise.resolve();};
          const link=document.createElement('a');link.id='qa-link';link.href='about:blank';
          link.style='position:fixed;left:2px;top:2px;z-index:100;padding:20px';document.body.append(link);
        }''')
        page.keyboard.press('f'); assert page.evaluate('__fullCalls') == 1
        before = state(page)
        with page.expect_popup() as link_info:
            page.locator('#qa-link').click()
        link_info.value.close()
        assert state(page) == before
        assert page.locator('#qa-link').get_attribute('target') == '_blank'
        page.locator('#qa-link').evaluate('el=>el.remove()')
        page.mouse.move(40, 20); page.wait_for_timeout(2100)
        assert page.locator('body').evaluate("el=>el.classList.contains('idle')")
        print('PASS other keys / clicks / right-click / F (mock) / new-tab links / idle cursor')

        order = list(COUNTS)
        for before, after in zip(order, order[1:]):
            transition_shots(page, before, after, capture=(before == 'c1'))
        print(f'PASS transitions: all {len(order)-1} adjacent boundaries; 96px entering/leaving chapters, otherwise 48px; full cover + camera halfway')
        for id_ in COUNTS:
            go(page, id_)
            page.evaluate('window.__carBefore=__app.car;window.__kindBefore=__app.car.kind')
            before_errors = len(errors)
            for key in ['c', 'C']:
                page.keyboard.press(key)
                page.wait_for_timeout(150)
                assert page.evaluate('__app.car === window.__carBefore && __app.car.kind === window.__kindBefore')
                assert not page.evaluate('__app.transitioning')
                assert len(errors) == before_errors
                check_state(page, (id_, 0))
        print(f'PASS C no-op on all {len(COUNTS)} pages: kind and object unchanged; no transition or errors')
        assert page.evaluate("__app.carKinds.join(',')==='voxel' && __app.family.length===3")
        assert page.evaluate('''() => __app.family.every(c=>c.group.parent===__app.car.group.parent)
          && new Set(__app.family.map(c=>c.group.position.z)).size===3
          && new Set(__app.family.map(c=>c.group.rotation.y)).size===3''')
        for id_ in ['p1', 'p2', 'c1']:
            go(page, id_, 0)
            page.evaluate('''() => {
              const q=window.__idleQA={start:__app.idle.time,done:false,frames:[],wheel:JSON.stringify(__app.car.parts.wheels.children.map(w=>w.rotation.toArray()))};
              const sample=()=>{
                q.frames.push({time:__app.idle.time,y:__app.car.group.position.y,rot:__app.state.car.rotY,
                  family:__app.family.map(c=>c.group.position.y),wrench:__app.wrench.rotation.y,
                  wheel:JSON.stringify(__app.car.parts.wheels.children.map(w=>w.rotation.toArray()))});
                if(__app.idle.time-q.start<3.1)requestAnimationFrame(sample);else q.done=true;
              };sample();
            }''')
            page.wait_for_function('__idleQA.done', timeout=45000)
            q = page.evaluate('__idleQA')
            ys = [f['y'] for f in q['frames']]
            assert min(ys) >= -1e-9 and .028 < max(ys)-min(ys) <= .030001, (id_, min(ys), max(ys))
            assert all(f['wheel'] == q['wheel'] for f in q['frames']), 'Idle must not turn wheels'
            for f in q['frames']:
                assert abs(f['y'] - .03*(1-cos(f['time']*2*pi/1.5))/2) < 1e-8
            if id_ == 'p1':
                assert q['frames'][-1]['rot'] > q['frames'][0]['rot']
                assert page.evaluate('__app.state.car.silhouette===0 && __app.state.car.gray===0 && Math.abs(__app.state.car.spin-Math.PI*2/28)<1e-10')
            if id_ == 'p2':
                turns = [f['wrench'] for f in q['frames']]
                assert max(turns)-min(turns) > .02 and max(abs(v) for v in turns) <= .48
                for i in range(3):
                    assert max(f['family'][i] for f in q['frames'])-min(f['family'][i] for f in q['frames']) > .018
        print('PASS cars visible on p1/p2/c1; staggered family; P1 full color/28s spin; 0.03-unit/1.5s idle; stationary wheels; slow wrench spin')
        go(page, 'c1')
        assert page.evaluate('__app.idle.blinkMaterials') > 0
        page.evaluate('''() => {
          const q=window.__blinkQA={start:__app.idle.blinkTime,frames:[],done:false};
          const sample=()=>{
            q.frames.push({time:__app.idle.blinkTime,value:__app.idle.blink});
            if(__app.idle.blinkTime-q.start<8.2)requestAnimationFrame(sample);else q.done=true;
          };sample();
        }''')
        page.wait_for_function('__blinkQA.done', timeout=60000)
        frames = page.evaluate('__blinkQA.frames')
        dips = []
        for frame in frames:
            if frame['value'] < .35 and (not dips or frame['time']-dips[-1] > 1):
                dips.append(frame['time'])
        assert len(dips) >= 2 and abs(dips[1]-dips[0]-4) < .12, dips
        assert max(f['value'] for f in frames) == 1
        print('PASS c1 front headlight shader: two brief dim/bright cycles, 4s apart')

        check_chapter_content(page)
        check_effects(page)
        for id_, count in COUNTS.items():
            go(page, id_, count - 1)
            check_information(page)
        go(page, 'p5', 3)
        check_information(page)
        (SHOTS / 'layout-metrics.json').write_text(json.dumps(layout_report, ensure_ascii=False, indent=2))
        print('PASS information-first: projected group Box3 <=42%; no visible-text intersections; info >=48px; no blacklisted copy')

        reduced = context(browser, reduced_motion='reduce')
        rp = reduced.new_page(); ready(rp)
        rp.evaluate('''() => {
          window.__maskSeen=false;
          const el=document.querySelector('#dissolve');
          new MutationObserver(records=>{if(el.classList.contains('running')||records.some(r=>(r.oldValue||'').includes('running')))window.__maskSeen=true;})
            .observe(el,{attributes:true,attributeOldValue:true,attributeFilter:['class','style']});
          const sample=()=>{if(getComputedStyle(el).display!=='none')window.__maskSeen=true;requestAnimationFrame(sample);};sample();
        }''')
        rotation = rp.evaluate('__app.state.car.rotY')
        rp.wait_for_timeout(250)
        assert rp.evaluate('__app.state.car.rotY') == rotation
        assert rp.evaluate('__app.car.group.position.y===0 && __app.idle.time===0 && __app.idle.blink===1 && __app.wrench.rotation.y===0')
        for expected in sequence[1:]:
            rp.keyboard.press('ArrowRight'); check_state(rp, expected); check_opacity(rp)
            assert not rp.evaluate('__app.transitioning')
            rp.wait_for_timeout(80)
            assert rp.evaluate('__app.car.group.position.y===0 && __app.family.every(c=>c.group.position.y===0) && __app.idle.time===0 && __app.idle.blink===1 && __app.wrench.rotation.y===0')
        for expected in reversed(sequence[:-1]):
            rp.keyboard.press('ArrowLeft'); check_state(rp, expected)
        rp.wait_for_timeout(100)
        assert not rp.evaluate('__maskSeen')
        reduced.close()
        print('PASS reduced motion: no dissolve; immediate camera/text; no car/wrench spin, bob or blink on all pages')

        fallback = context(browser)
        fallback.add_init_script('HTMLCanvasElement.prototype.getContext=function(){return null;}')
        fp = fallback.new_page(); ready(fp)
        assert fp.locator('html').evaluate("el=>el.classList.contains('no-webgl')")
        for expected in sequence[1:]:
            fp.keyboard.press('ArrowRight'); settled(fp); check_state(fp, expected)
        assert fp.locator('[data-icon] svg').count() == fp.locator('[data-icon]').count()
        assert fp.locator('[data-icon]').evaluate_all('els=>els.every(el=>el.querySelector("svg[aria-label]"))'), 'Every chapter icon must have a labelled SVG fallback'
        fallback.close()
        throwing = context(browser, reduced_motion='reduce')
        throwing.add_init_script("HTMLCanvasElement.prototype.getContext=function(){throw new Error('QA unavailable canvas');}")
        tp = throwing.new_page(); ready(tp)
        assert tp.locator('html').evaluate("el=>el.classList.contains('no-webgl')")
        tp.keyboard.press('End'); check_state(tp, sequence[-1])
        throwing.close()
        print('PASS no-WebGL: null and thrown getContext; fallback visible; navigation intact')

        page.evaluate("document.querySelector('#world-canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()")
        page.wait_for_function("document.documentElement.classList.contains('no-webgl')")
        page.keyboard.press('Home'); settled(page); check_state(page, ('p1', 0))
        page.keyboard.press('End'); settled(page); check_state(page, sequence[-1])
        print('PASS WebGL context loss -> static fallback; navigation intact')
        ctx.close(); browser.close()
    assert not errors, '\n'.join(errors)
    assert not remote_requests, f'Remote requests: {remote_requests}'
    print('PASS console errors=0; pageerrors=0; remote requests=0 (offline file://)')
    print('APP E2E OK')


def component_checks(browser):
    fixture = HERE / 'components.html'
    assert fixture.is_file(), fixture
    ctx = context(browser)
    page = ctx.new_page(); page.goto(fixture.as_uri())
    page.wait_for_function('window.demoStep && document.fonts.status === "loaded"')
    names = ['info-list', 'flow', 'ring', 'stairs', 'cmp', 'card', 'ph', 'links']
    for name in names:
        assert page.locator('.' + name).count() == 1, name
    page.evaluate('demoStep(0)'); page.wait_for_timeout(500)
    assert page.locator('.flow .station.on').count() == 0
    assert page.locator('.cmp [data-fill].filled').count() == 0
    page.evaluate('demoStep(3)'); page.wait_for_timeout(500)
    assert page.locator('.flow .station.current').text_content().startswith('做')
    assert page.locator('.cmp .is-pink').count() == 1
    assert page.locator('.cmp .flash-three').evaluate('el=>getComputedStyle(el).animationIterationCount') == '3'
    assert page.locator('.cmp [data-fill].filled').count() == 2
    token = page.locator('.flow .component-token').get_attribute('transform')
    assert token and page.locator('.flow .component-token').is_visible()
    page.evaluate('demoStep(1)'); page.wait_for_timeout(500)
    assert page.locator('.flow .component-token').get_attribute('transform') != token
    assert page.locator('.cmp .is-pink').count() == 0
    page.evaluate('demoStep(4)'); page.wait_for_timeout(500)
    assert page.locator('.cmp .is-gray').count() == 1
    assert page.locator('.cmp [data-fill].filled').count() == 3
    page.evaluate('demoStep(3)'); page.wait_for_timeout(2000)
    assert page.locator('img').evaluate('el=>el.complete && el.naturalWidth>0')
    assert page.locator('a[href]').evaluate_all('els=>els.every(a=>a.target==="_blank")')
    # Screenshot all eight primitives together, not eight separate images.
    page.screenshot(path=str(SHOTS / 'components.png'), full_page=True)
    page.emulate_media(reduced_motion='reduce')
    page.evaluate('demoStep(2);demoStep(3)')
    assert page.locator('.cmp [data-flash]').evaluate('el=>getComputedStyle(el).animationName') == 'none'
    ctx.close()
    print('PASS 8 shared components: steps/token/reverse/fill/pink/gray/3 flashes/reduced motion; components.png')


def main():
    global COUNTS
    assert FILE.is_file(), FILE
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        ctx = context(browser, reduced_motion='reduce')
        page = ctx.new_page(); ready(page)
        pairs = page.locator('.page').evaluate_all('els=>els.map(el=>[el.id,Number(el.dataset.steps)])')
        assert pairs and len({id_ for id_, _ in pairs}) == len(pairs), pairs
        assert all(isinstance(n, int) and n > 0 for _, n in pairs), pairs
        COUNTS = dict(pairs)
        wanted = args.pages.split(',') if args.pages else list(COUNTS)
        assert len(wanted) == len(set(wanted)), 'Duplicate --pages'
        assert set(wanted) <= set(COUNTS), f'Unknown --pages: {set(wanted)-set(COUNTS)}'
        selected = [(id_, n) for id_, n in pairs if id_ in wanted]
        assert page.evaluate('__app.pages') == list(COUNTS)
        if not args.pages and FILE in {HERE.parent.parent / 'Agent-Harness-第二期.html', HERE.parent / '_build/style-A.html'}:
            expected = ['p1','p2','c1', 'p3', 'c2', 'p4', 'p32', 'p5', 'p9', *[f'p{i}' for i in range(33,54)], 'c3', 'p8', *[f'p{i}' for i in (*range(10,15), *range(16,20))], 'c4', 'p21', 'p23', 'p22', 'p25', 'p24', 'p26', 'p20']
            assert list(COUNTS) == expected, list(COUNTS)
            assert (len(COUNTS), sum(COUNTS.values())) == (49, 62), COUNTS
        check_all_content(page)
        assert page.locator('img').evaluate_all('els=>els.every(el=>el.complete && el.naturalWidth>0)'), 'Broken image'
        assert page.locator('a[href]').evaluate_all('els=>els.every(el=>el.target==="_blank")'), 'Link missing target=_blank'
        for id_, n in selected:
            for step in range(n):
                go(page, id_, step); check_opacity(page); check_information(page)
                screenshot(page, f'{id_}-{step}.png')
            if not args.pages and len(COUNTS) == 49:
                final_shots = HERE / 'shots-all'
                final_shots.mkdir(exist_ok=True)
                page.screenshot(path=str(final_shots / f'{id_}.png'))
            page.reload(); settled(page); check_state(page, (id_, 0))
            page.goto(FILE.as_uri() + '#' + id_); settled(page); check_state(page, (id_, 0))
        for button in page.locator('[data-chapter]').all():
            id_ = button.get_attribute('data-chapter')
            assert button.is_disabled() == (id_ not in COUNTS)
            if id_ in wanted:
                button.click(); settled(page); check_state(page, (id_, 0))
        (SHOTS / 'layout-metrics.json').write_text(json.dumps(layout_report, ensure_ascii=False, indent=2))
        print(f'PASS DOM-driven: {len(selected)}/{len(COUNTS)} pages, {sum(n for _, n in selected)} steps; all-step information checks, images, links, navigation')
        ctx.close()
        # No real URL is opened: click handling is tested against an inert about:blank link.
        if not args.pages:
            component_checks(browser)
        browser.close()
    assert not errors, '\n'.join(errors)
    assert not remote_requests, remote_requests
    # Keep the original detailed chapter-01 behavior suite on the full deck only.
    if not args.pages and all(id_ in COUNTS for id_ in ['p1','p2','c1','p3','c2','p4','p32','p5','c3','c4','p20']):
        legacy_regressions()
    else:
        print('PASS console errors=0; pageerrors=0; remote requests=0 (offline file://)')
        print('APP E2E OK')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'APP E2E FAIL: {exc}', file=sys.stderr)
        for error in errors:
            print(error, file=sys.stderr)
        sys.exit(1)
