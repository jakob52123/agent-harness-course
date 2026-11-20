# Agent Harness 第二期课件

这是给产品经理讲 **Agent Harness** 的一堂课的网页幻灯片。全套课件共 48 页（61 步，4 张章节页 + 44 张内容页），分为四个部分：

1. **Agent Harness 是什么**
2. **Agent Harness 的组成部分**。以 Pi 为标本，逐个讲工具、权限、沙箱、三期记忆、Agent Loop、Skills。
3. **有哪些 Harness 和 Agent 产品**
4. **AI 产品经理怎么做**

打包成品是单个 HTML 文件（字体、Three.js、图片全部内嵌），断网双击就能播放。

## 怎么看

下载仓库根目录的 `Agent-Harness-第二期.html`，用 **Chrome** 打开即可离线播放（建议 16:9 比例；设计画布 1920×1080，窗口自动等比缩放；页面内的网页资料链接仅在主动点击时需联网打开）。

### 播放按键

| 操作 | 按键 / 鼠标 |
|---|---|
| 下一步；本页结束后下一页 | →、↓、空格、PageDown、左键 |
| 上一步；本页开头回上页末步 | ←、↑、PageUp、右键 |
| 第一页 / 最后一页末步 | Home / End |
| 全屏 | F |
| 本屏讲稿开关 | N |
| 演讲者窗口（讲稿、下一页、计时） | S；浏览器需允许弹窗 |
| 跳章 | 右上「01 是什么」「02 组成」「03 有哪些」「04 怎么做」分别跳至 c1、c2、c3、c4；当前章墨色粗体、朱红下划线 |

- 非车页按一下就是下一页；只有车页 `p3`–`p6` 页内分步。
- 演讲者窗口也支持翻页，点计时器清零。
- 地址末尾加 `#p1`…`#p6`、`#p8`…`#p14`、`#p16`…`#p26`、`#p32`、`#c1`…`#c4` 可以直达对应页。
- 系统开启“减少动态效果”后不插值、不溶解、不闪烁；无 WebGL 时使用像素图标降级。

## 怎么自己打包

### 1. 环境要求

- **Node.js 与 npm**：构建脚本以 Node 18+ 为基线，但仓库锁定的 `camera-controls` `3.1.2` 要求 **Node 22+** 且 **npm 10.5.1+**，实际安装和构建请使用 Node 22+ 与 npm 10.5.1+。
- **Python 3**：构建时用于提取字体子集并压缩为 WOFF2，需先安装 `fonttools` 和 `brotli`：

```sh
pip install fonttools brotli
```

### 2. 安装与关联依赖

在仓库根目录安装依赖后，因为 `app/build.mjs` 明确从 `app/node_modules` 读取 `esbuild`，须将根目录的 `node_modules` 软链或复制到 `app/node_modules`：

```sh
npm install
ln -s ../node_modules app/node_modules
```

（若当前环境不支持软链接，将根目录 `node_modules` 复制到 `app/node_modules` 即可。）

### 3. 运行构建

日常构建验证请用 `--out` 指定输出路径：

```sh
node app/build.mjs --out _build/deck.html
```

- **`--out` 路径**：相对路径相对于 `app/` 目录解析（例如 `--out _build/deck.html` 会输出到 `app/_build/deck.html`）。不传 `--out`（如直接运行 `node app/build.mjs` 或 `npm run build`）会直接覆盖仓库根目录的原成品 `Agent-Harness-第二期.html`，本地验证时请勿使用默认输出。
- **`PYTHON` 环境变量**：默认调用 `python3`；如需指定其他 Python 解释器（如虚拟环境），可通过环境变量 `PYTHON` 传入：

```sh
PYTHON=python3 node app/build.mjs --out _build/deck.html
# 或指定虚拟环境：
PYTHON=.venv/bin/python node app/build.mjs --out _build/deck.html
```

## 目录说明

- `Agent-Harness-第二期.html`：单文件幻灯片成品，双击可离线播放
- `app/build.mjs`：单文件打包脚本
- `app/README.md`：页面结构、镜头参数与版式说明
- `app/src/pages/`：各章页面 HTML 与讲稿
- `app/src/shots/`：各章分步镜头与车辆状态配置
- `app/src/props/`：各章 3D 道具
- `app/fonts-src/`：源字体文件及 SIL OFL 1.1 许可证（含 `许可-OFL.txt`）
- `app/test/e2e.py`：端到端验收脚本
- `images/`：课件引用的图片素材（构建时自动内嵌）

## 许可

- **代码**：采用 MIT 许可，详见 [`LICENSE`](LICENSE)。
- **课件内容**：上屏文字、讲稿、版式设计采用 CC BY-NC 4.0 许可。
- **字体与截图**：`app/fonts-src/` 下的字体采用 SIL OFL 1.1；`images/products/` 下的产品截图版权归原方所有，仅作课程讲解引用。详见 [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md)。
