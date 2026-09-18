# ongoing_ / 未完

一款用 `Moment` 留下此刻、用 `Chapter` 组织一段生活的原生微信小程序。今天很容易留下一刻，以后能重新看见自己的生活。

当前版本已完成 Quick Moment、多人共同 Chapter、邀请补完、Chapter 生命周期、Calendar、数据 Review 与照片海报。首次使用展示真实空状态；本地数据与可部署的微信云函数支持持续记录和跨设备协作。

V1 的产品边界、页面职责和后续阶段规划以 [`PRODUCT_SCOPE_V1.md`](./PRODUCT_SCOPE_V1.md) 为准。

## 运行

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择本目录 `project-my summer holiday`。
4. 使用 `project.config.json` 中已有的 AppID，或替换为自己的测试号。
5. 编译后进入首页。新建 Chapter 或直接记录 Moment；无需清除已有本地记录。

### 当前版本：个人相册与真实双账号共同记录

所有 Moment 改为个人朋友圈式的日期相册预览：按天显示日期，照片拼图与文字摘要紧凑排列，点击任意一条进入完整详情。数据仍包含所有可见 Moment 和未归类记录。使用提供的 logo 替代首页「此刻 / now」，提亮原有自然色系，统一为清晰的系统字体，重新约束 Composer 按钮、图片格和圆形控件尺寸。

Chapter 和 Moment 均采用「复制邀请文字 → 对方在生活页粘贴加入」，不依赖当前体验环境受限的微信分享卡片。加入页展示云端邀请人、范围、封面、日期、人数和已有成员状态。B 的 Perspective 单独保存，A 可查看 B 新增和修改后的内容；作者可以继续编辑自己的视角。

真实 OPENID 由云函数读取，并逐次核对写入身份。切换微信账号时各自的本地数据、待同步操作和草稿隔离保存；不会把原账号记录重新署名给新账号。昵称头像也进入持久化同步队列。此版本需要先部署新的 collaboration 云函数（协议版本 2），再上传体验版。

页面先展示本地数据，再后台同步；同一目标请求合并，一级页短时间切换避免重复全量读取。冷启动直接进入首页，Chapter 的日历与回望按需计算。三个主导航位置固定，独立 + 位于生活上方。logo 使用 39 KB 的 WebP，原始 PNG 保留并排除出上传包，运行资源粗计约 0.56 MB（非正式编译包体积）。

定向同步、权限、时间体验、模板和语法检查通过；尚未部署远端或完成真实双账号验收，未运行完整编译。部署步骤、真实双账号验收和已完成 / 待完成项见 [CLOUD_SETUP.md](./CLOUD_SETUP.md) 与 [HANDOFF.md](./HANDOFF.md)。

### 2026-09-16 导航与生活流整理（先前版本，Moment 浏览已由上文调整）

沿用鼠尾草绿、杏色和淡紫的生活调色盘。底部只保留「当下 / 生活 / 我的」三项悬浮胶囊导航，详情和编辑页不显示。首页保留顶部「记录此刻」作为主入口；生活流中的圆形记录按钮独立于导航，直接新建不绑定 Chapter 的 Moment。

「生活」默认按时间浏览所有可见 Moment，未归类记录同样展示；Chapter 是另一个切换视图，保留原有阶段筛选与详情、日历、回望入口。月份只作为内容分隔。首页「查看全部」进入生活流，不再展开缩略列表。

Moment 内容流复用到 Chapter 瞬间和搜索结果：文字、多图、可播放录音、地点、标签、Chapter 和共同记录信息。单图按图片比例展示并限制长图高度，两图并排、四图四宫格，其余多图采用三列；超出九张可通过预览浏览全部原图。紧凑卡片继续用于首页预览与 Review 精选，Calendar 保留日内紧凑行。

合并三个一级页和通用组件的重复样式，共享字体、间距、圆角与阴影令牌。展开项统一使用方向箭头，＋保留创建和添加语义。数据模型、存储和云端协议未改动。

本轮验证：静态模板、事件、资源与样式检查通过；定向检查覆盖未归类 Moment、分页排序、旧回望链接、多图完整预览、语音互斥与离页暂停、全局记录不绑定 Chapter。未执行完整编译或真机视觉验收。

### 2026-09-16 此刻与时间体验

首页以今天和记录行为为中心，最近 Moment 展示全部可见记录；进行中 Chapter 下移为紧凑的生活阶段卡。首页新建不预选 Chapter，从章节内部记录才预选。Composer 先写文字或加入图片、声音，再决定日期、地点与可选归属。

新建发布后直接进入详情，展示「这一刻留下了」与真实累计记录日数；编辑仍普通返回。共同 Moment 展示参与者头像和不同视角，已参与的用户直接编辑自己的视角。未分享的独立 Moment 可以在详情页稍后整理到 Chapter，原有共享访问边界保持不变。

Memory Echo 按往年同日、约 30 / 90 / 180 天前、Chapter 第一刻选择，支持照片、文字和声音。时间窗口分别为 ±3 / ±5 / ±7 天；第一刻至少距今 30 天。按本地自然日判断，同日会话内固定选择，重启后按相同规则稳定排序；删除或失去访问权限会立即失效。没有符合条件的内容时隐藏。

「我的」首屏为生活档案。Moment 数统计本人创建或实际贡献过视角的可见已发布记录；记录日数对本人 Moment 和视角的日期去重；开始日期取其中最早一天。共同数统计实际有多个作者的 Moment，不把仅接受邀请的人数算成共同记录。全部 Moment 与 Chapter 浏览现已整合到「生活」。

本轮仅运行 `node tests/time-experience.test.js`（时间选择、权限、统计与发布链路）及 `node tests/static-project.test.js`（模板、事件、样式括号和资源引用），未执行完整编译与模拟器截图。

三分钟演示：**首页 → 写下一句话并发布 → 留存反馈 → 打开已有共同 Moment → 回首页看 Echo → 我的生活档案**。演示前准备一条有两位作者的共同 Moment，以及一条符合上述时间条件的旧记录；使用真实记录日期。初次空账号不会自动填充示例或伪造积累。

### 2026-09-15 移动端 UI 重构（历史记录，首页行为已由上述版本更新）

雾蓝主色、淡粉紫点缀与白色内容面板。首页包含进行中 Chapter 横滑卡、唯一「记录此刻」按钮、跟随当前章节的最近 Moment 与 Memory Echo。底部为当下 / 章节 / 回望 / 我的四栏悬浮导航。

Chapter 页面提供瞬间 / 日历 / 目标 / 成员 / 回望；复用现有数据接口，不改变存储结构。Composer 支持文字、图片、录音、地点、日期、标签和本地草稿。Moment 详情将原记录与共同视角分开展示，并保留单 Moment 邀请。Review 提供摘要、精选瞬间、完整记录展开与分享海报。

保留 WebView 和微信系统胶囊；自定义导航根据系统胶囊坐标预留区域。微信 style v2 原生按钮规则需要由显式组件选择器覆盖，避免固定宽度导致卡片、头像和工具栏变形。

验证：`node --test tests/*.test.js`；`tests/compile-wechat.ps1` 调用微信官方编译器。本轮原生模拟器截图和测量记录位于工作区 `ui-review/*-native.png`、`native-review-results.json`。320–430px 的安全区、触控尺寸与日历布局另有自动检查。

云函数 `collaboration` 修复了已有 `tags` 字段的同步遗漏，需重新部署该云函数后在云端生效；本地草稿与记录不依赖部署。

详细修复范围、数据结构、测试记录和云开发部署步骤见 `IMPLEMENTATION_REPAIR_LOG.md`。

## 已完成的体验

- 首页直接启动，保留品牌与使用引导页面；
- “当下”首页的今日状态、全部可见的最近 Moment、Memory Echo 与生活阶段；
- 首页「记录此刻」与统一 Composer；
- 「生活」：所有 Moment 内容流与 Chapter 阶段浏览；
- 创建、编辑、切换、完成、归档、恢复与删除 Chapter；
- 图片、文字、地点、心情、标签、语音 Moment；
- Moment 新建、编辑、收藏、删除与共同记录邀请；
- 共同 Chapter 邀请、成员权限、混合时间线与成员筛选；
- Moment 邀请补完、独立 Contribution 与共同记忆展示；
- Chapter 结束确认、完整数据 Review、照片选择和海报生成；
- Chapter 五个轻量标签：瞬间 / 日历 / 目标 / 成员 / 回望；
- 基于真实 Moment 日期的月历、日期状态与日内记录浏览；
- Chapter / Moment / 标签 / 地点全文搜索；
- 本地数据持久化与完整的课程 Demo 数据。

## 架构

```text
app.js / app.wxss              应用启动、全局视觉令牌
├── assets/                    本地摄影素材与线性图标
├── constants/product.js        V1 Chapter 三维信息架构
├── components/
│   ├── app-tabbar/            当下 / 生活 / 我的，独立记录按钮
│   ├── chapter-card/          Chapter 视觉卡片
│   ├── moment-card/           Moment 生活流与紧凑预览
│   ├── moment-row/            Calendar 紧凑记录行
│   └── navigation-bar/        安全区自适应导航
├── data/demo.js               课程演示数据
├── services/store.js          本地数据、权限与页面级 selector
├── services/chapter-browse.js Calendar 与兼容性地点聚合 helper
├── services/collaboration.js  本地/云端协作适配
├── cloudfunctions/            微信云端协作与权限校验
├── utils/date.js              日期与问候语
└── pages/
    ├── splash/                启动页
    ├── onboarding/            首次引导
    ├── index/                 当下
    ├── history/               所有 Moment / Chapter
    ├── chapter/detail/        瞬间 / 日历 / 回望
    ├── chapter/members/       成员管理与分享邀请
    ├── chapter/join/          接受邀请
    ├── chapter/editor/        Chapter 创建与编辑
    ├── moment/editor/         Moment 创建与编辑
    ├── moment/detail/         Moment 详情
    ├── moment/contribute/     补完他人的 Moment
    ├── review/                Chapter 叙事回顾与完成
    ├── search/                全局搜索
    └── profile/               生活档案、草稿与同步设置
```

## 数据层约定

页面不直接读写 `wx.setStorageSync`，业务数据统一通过 `services/store.js`：

- `getActiveChapter / getChapters / getChapter`
- `saveChapter / setChapterStatus / completeChapter / deleteChapter`
- `getMoments / getTimelineMoments / getMoment / saveMoment / deleteMoment`
- `getCalendarData / getMapData`
- `getMembers / createInvite / joinChapter / removeMember`
- `saveContribution / deleteContribution / getReviewData / search`

线上协作统一通过 services/collaboration.js 调用微信云函数，本地修改先进入持久化待同步队列。不要使用 store 中历史本机邀请 helper 作为真实多人入口。

核心数据关系：

```text
Chapter 1 ─── N Member
Chapter 1 ─── N Moment
Chapter 1 ─── N Goal
Moment  1 ─── N Contribution
User    1 ─── N Moment / Contribution
```

目标保留在 Chapter 详情内，不设独立一级入口。

状态值固定为：`ONGOING`、`COMPLETED`、`ARCHIVED`。

## 当前边界与后续接入

默认模式会通过 `wx.saveFile` 与本地缓存保存媒体和数据。跨设备协作需要在微信开发者工具部署项目内的 `collaboration` 云函数。正式上线前还需：

1. 创建云数据库集合并部署云函数；
2. 配置隐私协议、用户信息授权与内容安全检查；
3. 在两台真机验证跨设备邀请、刷新和权限；
4. 根据课程答辩设备补做 iOS/Android 兼容测试。

## 视觉系统与资产

三张项目内摄影素材由内置 imagegen 生成，并已压缩为 WebP：

- `assets/images/chapter-summer.webp`：地中海海岸、背影人物、夏日章节封面；
- `assets/images/moment-sunset.webp`：海边日落、饮品与相机；
- `assets/images/moment-study.webp`：窗边书桌、笔记与晨光。

语义 Token 定义在 `app.wxss`，覆盖 Color、Typography、Spacing、Radius 与 Elevation。视觉方向为 Adaptive Editorial × Apple Craft：内容优先、系统字体为主、展示文字也统一使用系统字体，并保证无照片、纯文字、声音或少量内容时页面仍然成立。

自动检查可直接运行：

```bash
node tests/static-project.test.js
node tests/design-system.test.js
node tests/core-experience.test.js
```
