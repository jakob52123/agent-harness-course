# Agent Harness 第二期 · 讲师使用说明

本轮成品：[`_build/style-A.html`](_build/style-A.html)。**48 页、60 步：4 张章节页 + 44 张内容页。** 字体、Three.js、图片全部内嵌，断网双击即可播放。建议 Chrome、16:9；设计画布 1920×1080，窗口自动等比缩放。网页资料链接需联网，只有主动点击才打开。

## 1. 播放按键

| 操作 | 按键 / 鼠标 |
|---|---|
| 下一步；本页结束后下一页 | →、↓、空格、PageDown、左键 |
| 上一步；本页开头回上页末步 | ←、↑、PageUp、右键 |
| 第一页 / 最后一页末步 | Home / End |
| 全屏 | F |
| 本屏讲稿开关 | N |
| 演讲者窗口（讲稿、下一页、计时） | S；浏览器需允许弹窗 |
| 跳章 | 右上「01 是什么」「02 组成」「03 有哪些」「04 怎么做」分别跳至 c1、c2、c3、c4；当前章墨色粗体、朱红下划线 |

非车页按一下就是下一页；只有车页 p3–p5 页内分步。

C 无动作，不再换车。演讲者窗口也支持翻页，点计时器清零。系统开启“减少动态效果”后不插值、不溶解、不闪烁；无 WebGL 时使用像素图标降级。

地址末尾 `#p1`…`#p5`、`#p8`…`#p14`、`#p16`…`#p26`、`#p32`…`#p53`、`#c1`…`#c4` 可以直达。刷新保留当前页，回到该页第 0 步（不是记住当前步骤）。章节页进、出均为强烈版像素溶解；普通换页用普通版；同页走步无溶解。

## 2. 全套页面结构

章节按页序中的 c 页切分，不按源文件切分。p1–p2 开场；01 章只有 p3；02 章依次是 p4、p32、p5、p9、p33–p53；03 章是 p8、p10–p14、p16–p19；04 章以 p21 开始，p20「五步」结束。步数包括第 0 步，不是需要按键的次数。

| 页 | 标题 | 步数 |
|---|---|---:|
| p1 | Agent Harness | 1 |
| p2 | 今天 | 1 |
| c1 | Agent Harness 是什么 | 1 |
| p3 | Agent = LLM + Harness | 4 |
| c2 | Agent Harness 的组成部分 | 1 |
| p4 | Harness 里有什么（只展示车，左列零件名随步骤点亮） | 7 |
| p32 | 用开车来理解 | 1 |
| p5 | Loop | 4 |
| p9 | Pi | 1 |
| p33 | 为什么选 Pi：OpenRouter 排名 | 1 |
| p34 | 为什么选 Pi：Databricks 基准测试 | 1 |
| p35 | Pi 的组成部分（pi-web 界面） | 1 |
| p36 | Tools | 1 |
| p37 | Function Calling | 1 |
| p38 | Permission | 1 |
| p39 | Sandbox | 1 |
| p40 | Tool Use | 1 |
| p41 | Agent 的三期记忆 | 1 |
| p42 | 长期记忆：Pi 的 System Prompt | 1 |
| p43 | 长期记忆：Claude Code | 1 |
| p44 | 中期记忆：项目的工作手册 | 1 |
| p46 | 中期记忆：项目的经验笔记 | 1 |
| p47 | 短期记忆：Session 和压缩 | 1 |
| p48 | 三期记忆汇总 | 1 |
| p49 | Agent Loop：把它们串起来 | 1 |
| p50 | Skills | 1 |
| p51 | 一个 Skill 长什么样 | 1 |
| p52 | Skills 汇总 | 1 |
| p53 | 本章汇总：一页记住 Agent Harness | 1 |
| c3 | 有哪些 Harness 和 Agent 产品 | 1 |
| p8 | 有哪些 Harness | 1 |
| p10 | Claude Code / Codex | 1 |
| p11 | DeepSeek Harness | 1 |
| p12 | 四级台阶 | 1 |
| p13 | Coding Agent | 1 |
| p14 | Super Agent | 1 |
| p16 | Personal Agent | 1 |
| p17 | Grok Bot | 1 |
| p18 | 谁说同事只能是一个 | 1 |
| p19 | 对比表 | 1 |
| c4 | AI 产品经理怎么做 | 1 |
| p21 | 明确来源 | 1 |
| p23 | 设计上下文 | 1 |
| p22 | 工具设计 | 1 |
| p25 | 权限设计 | 1 |
| p24 | 业务知识 Skills 化 | 1 |
| p26 | 设计任务闭环 | 1 |
| p20 | 五步 | 1 |

P5 共 4 步；11-19 讲师删去了原第 4 步的 Pi 运行截图。

## 3. 仍待讲师提供

无：讲师 11-19 定不要例子。

## 4. 打包和验收

在 `app/` 目录执行（不需要装依赖）：

```sh
node build.mjs --out _build/style-A.html
python3 test/e2e.py --file _build/style-A.html --outdir test/shots/style-A
```

本轮 A 版只打包到 `_build/style-A.html`。旧成品保留：不传 `--out` 会覆盖项目根的 HTML，请勿省略。

单章预览不会覆盖成品，`--out` 相对 `app/`：

```sh
node build.mjs --only 03 --out _build/preview-03.html
python3 test/e2e.py --file _build/preview-03.html --outdir test/shots/preview-03
```

预览包含开场两页和所选文件的页面（如下方对照表），并不按新章节边界截取；未打包的 c 页对应导航禁用。`--only` 必须配 `--out`。Python 参数路径相对命令执行目录。

全量验收从 DOM 读取 48 页/60 步，逐步检查布局、字级、图片、链接、导航与道具隔离；再用正常动态模式从头按 → 到尾、按 ← 返回，检查跳页、状态继承、47 个相邻转场、讲稿、降级、减少动态效果及离线零错误。全屏用 mock、浏览器一律 headless，不触碰真实账号。

截图：
- `test/shots-all/<页>.png`：48 页各自最后一步，1920×1080。
- `test/shots-all/contact-1.jpg`…`contact-4.jpg`：既有联系表，未随本次验收更新。
- `test/shots/`：逐步截图及布局测量 JSON。
- `_build/i1-e2e.log`：全量验收输出；`_build/i1-font-audit.json`：字体覆盖结果。

## 5. 改文字、讲稿、图片

按章找到下面三件套，**上屏内容和例子须经讲师批准**：

| 内容范围 | 文件名（分别位于 `src/pages/`、`src/shots/`、`src/props/`） |
|---|---|
| p1–p2 | `00-open` |
| c1、p3、c2、p4、p32、p5 | `01-what` |
| p9、p33–p35 | `01b-pi` |
| p36–p40 | `01c-tools` |
| p41–p48 | `01d-memory` |
| p49–p53 | `01e-loop` |
| c3、p8、p10、p11 | `02-why` |
| p12–p14、p16–p19 | `03-products` |
| c4、p21、p23、p22、p25、p24、p26、p20 | `04-how` |
| 打包保留的空壳，无页面 | `05-end` |

- 文字和讲稿在 `src/pages/同名.html`。讲稿是 `<aside class="notes">`，不在投影画面显示。
- 原生文字标题同时修改标签正文、`data-pixeltext`；页标题还需同步 `data-title` / `aria-label`。
- `data-step="N"` 表示第 N 步亮起；`data-steps` 是本页总步数，必须等于镜头数组长度。只有车页 p3–p5 分步，其余页一页一步。不随意增删步骤。非车页的 `on` / `current` 直接写在元素上，保留原末步的亮起与朱红强调；`data-fill` / `data-gray` / `data-pink` / `data-flash` 在第 0 步生效。
- 图片 `src="images/…"` 从项目根 `../images/` 读取并内嵌，缺图会报错。不要接远程图片/CDN。
- 局部样式仅使用本章 `ch02-` / `ch03-` / `ch04-` / `ch05-` 前缀或本页 ID，避免串章。
- 讲稿中的本机绝对路径只能写成资料相对路径文字；网上的 https 链接保留。

## 6. 改镜头与插图

`src/shots/同名.js` 每个页面 ID 对应一个镜头数组。每页首步应从 `BASE` 建立完整状态，后续步骤只写变化；对象字段继承，`insets:[]` 清空插图，`lit()` 清掉所有零件亮度。不要依赖上一章状态。

| 字段 | 含义 |
|---|---|
| `cam.pos / look / fov` | 相机位置、看向哪里、视角 |
| `cam.center` | 主体在画面的位置，归一化坐标；往右放可增大第一项 |
| `car.visible / pos / rotY` | 车显隐、位置、朝向 |
| `car.dim / silhouette / lit` | A 版 dim、silhouette 始终取 0；lit 控制零件点亮 |
| `car.gray` | 1 = 暖灰概览，当前零件用朱红；p4 拆解仍按零件点亮。封面和章节车全彩用 0 |
| `car.explode / xray / driver / hideDriver / chassisOnly` | 拆开、透视、换司机、藏司机、底盘模式 |
| `car.speed / world.speed` | 轮速 / 地面速度线 |
| `world.backdrop` | 3D 画面透明度，纯文字页为 0 |
| `effect.part / duration / count` | 短闪零件、时长、次数 |
| `insets` | 漫画小格，包含 `id / rect / cam / view / opacity` |

通用参数在 `src/shot-base.js`：画布 1920×1080，`PIXEL=3`，镜头插值 `SHOT_MS=1200`。信息是主体，车是插图；不能为了避让车去缩小或改写讲师文字。

### 车页开车（p3–p5，`src/drive.js`）

讲师 11-16 定：车页的讲法照第一期 3D 车页——车一直在开，点亮哪个零件就演哪个零件的动作。开车模块由 `world.js` 创建，只在 p3–p5 生效（另有页面白名单），其它页 `drive.active` 一律关。镜头字段 `drive`（默认值见 `shot-base.js` 的 `DRIVE`）：

| 字段 | 含义 |
|---|---|
| `drive.active` | 开启开车画面：路往后退、轮子转 |
| `drive.speed` | 路速和轮速（单位/秒）；平时 3，发动机那步 4，拆开那步 0 |
| `drive.lane` | `0` 本车道、`1` 相邻车道（真变道：1.5 秒五次曲线，车头偏最多 14°，方向盘先打后回正）；`'tools'` = 来回变道 |
| `drive.beam` | 挡风玻璃前张开视野框，框内路段提亮 |
| `drive.trail` | 记录仪每约 0.55 秒往车后落一帧 |
| `drive.route` | 车道上亮起往前流动的朱红导航线 |
| `drive.gate` | `''` 无拦杆；`'stop'` 停在拦杆前；`'pass'` 减速、抬杆、继续开（过闸） |
| `drive.engine` | 发动机一下一下鼓动（配合 `car.xray` 和 `car.lit`） |
| `drive.loop` | p5 四拍 look → think → act（变道）→ relook，相位和左边小圆点同一个公式（一圈 9 秒） |

每页每步：
- p3：一直在开。0 总览，1 司机亮，2 整车亮，3 换司机。
- p4：0 灰车行驶；1 司机；2 方向盘，来回变道；3 挡风玻璃，展开视野框；4 行车记录仪，留下记录帧；5 整车点亮；6 停车拆开。
- p5：1 看（视野框），2 想（司机），3 起四拍循环，4 Pi 截图。

开车画面（路、视野框、记录帧、导航线、拦杆）在屏幕左边和顶部软淡出，不进文字区、不压章节导航。减少动态效果时：路不滚、不变道，各效果直接摆终态。只读诊断 `window.__drive`（`active / road / lane / steer / beam / frames / route / gate / gateOpen / beat`）只给验收用。专项检查：`test/ch01_drive_shots.py`（逐步和动画中间时刻截图）。

道具在 `src/props/同名.js`。用 `onShot` 进入时显示、返回 cleanup 离开时隐藏；只更新本章道具，不改共享车。图层保留：开场/主车 1–4，02 章 5–9（当前 8），03 章 10–14（当前 13），04 章预留 15–19（当前未使用）。`registerView` 会拒绝重复名称/图层。

共享组件：`src/components.js`、`src/style.css`。字体随全部选中页面重新取子集；`src/pin-font.py` 为 📍 提供内嵌原创像素字形（CC0），不依赖系统 emoji。体素车只换漆色与打光，不动车模几何、动作或素材。

## 版式规矩（A 纸本朱红）

- **配色**：纸底 `--bg #F2EEE6`，卡面 `--surface #E9E3D7`，正文 `--ink #1B1916`，次要文字 `--ink2 #6A645B`，细线 `--line #D3CBBC`。只有当前项、关键词和点亮零件用朱红 `--accent #DE3B22`，关键词色块用 `--accent-soft #F7D8CF`；车下椭圆影用 `--shadow rgba(60,40,20,.16)`。不做发光、暗角或虚线框。
- **字体**：大字和正文统一内嵌 AH Noto；页标题 96px/900、字距 −2px，关键信息 48–56px/800，次要文字 36–40px/500，表格 30–32px，工具名 26px。`data-pixeltext` 与 `aria-label` 保留，不生成 canvas。像素字只做小标签：英文 AH Silk 22–24px，中文 AH Fusion 24px。
- **构图**：以 1920×1080 为准，左右留 120px，标题顶约 y=150；用足 y=300–1000 内容区，可见下沿 ≥860px、纵向跨度 ≥640px。图表和流程以内容为主，不把信息挤在左上。截图为主角时，单张实际显示宽 ≥760px。
- **车与外框**：右侧投影车框 ≤42% 宽，不与文字、标注重叠；弱化零件用 gray，不用 dim。左上品牌、右上章导航、右下页码（封面除外）；底边 6px 条按全课已走的步数填充。
- **分期**：Phase 1 重排 p1、p2、c1–c4、p3、p4、p8、p16、p26；Phase 2（11-19）按本节重排其余 24 页；验收项包括撑满、留边、标题位置、截图 ≥400px、`.info` ≥48px、孤字孤点、车不压字。
- **`.info` 只给关键信息**：e2e 要求 `.info` ≥48px；次要文字（36–40px）不挂 `.info`。窄格放大字用 `<br>` 在词边界断行，不用 `text-wrap: balance`（会把中文词拆开）。
