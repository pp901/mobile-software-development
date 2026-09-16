# ongoing_ / 未完

一款用 `Chapter` 组织一段假期、用 `Moment` 持续记录，并从瞬间、日历和回望三个维度浏览经历的原生微信小程序。

当前版本已完成 Quick Moment、多人共同 Chapter、邀请补完、Chapter 生命周期、Calendar、数据 Review 与照片海报。首次使用展示真实空状态；本地数据与可部署的微信云函数支持持续记录和跨设备协作。

V1 的产品边界、页面职责和后续阶段规划以 [`PRODUCT_SCOPE_V1.md`](./PRODUCT_SCOPE_V1.md) 为准。

## 运行

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择本目录 `project-my summer holiday`。
4. 使用 `project.config.json` 中已有的 AppID，或替换为自己的测试号。
5. 编译后进入首页。新建 Chapter 或直接记录 Moment；无需清除已有本地记录。

### 2026-09-15 移动端 UI 重构

雾蓝主色、淡粉紫点缀与白色内容面板。首页包含进行中 Chapter 横滑卡、唯一「记录此刻」按钮、跟随当前章节的最近 Moment 与 Memory Echo。底部为当下 / 章节 / 回望 / 我的四栏悬浮导航。

Chapter 页面提供瞬间 / 日历 / 目标 / 成员 / 回望；复用现有数据接口，不改变存储结构。Composer 支持文字、图片、录音、地点、日期、标签和本地草稿。Moment 详情将原记录与共同视角分开展示，并保留单 Moment 邀请。Review 提供摘要、精选瞬间、完整记录展开与分享海报。

保留 WebView 和微信系统胶囊；自定义导航根据系统胶囊坐标预留区域。微信 style v2 原生按钮规则需要由显式组件选择器覆盖，避免固定宽度导致卡片、头像和工具栏变形。

验证：`node --test tests/*.test.js`；`tests/compile-wechat.ps1` 调用微信官方编译器。本轮原生模拟器截图和测量记录位于工作区 `ui-review/*-native.png`、`native-review-results.json`。320–430px 的安全区、触控尺寸与日历布局另有自动检查。

云函数 `collaboration` 修复了已有 `tags` 字段的同步遗漏，需重新部署该云函数后在云端生效；本地草稿与记录不依赖部署。

详细修复范围、数据结构、测试记录和云开发部署步骤见 `IMPLEMENTATION_REPAIR_LOG.md`。

## 已完成的体验

- 品牌启动页与首次引导；
- “当下”首页的当前 Chapter 与最近 Moment；
- 首页「记录此刻」与统一 Composer；
- 回望 Gallery：正在发生 / 已成章 / 已归档；
- 创建、编辑、切换、完成、归档、恢复与删除 Chapter；
- 图片、文字、地点、心情、标签、语音 Moment；
- Moment 新建、编辑、收藏、删除与微信分享；
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
│   ├── app-tabbar/            当下 / 章节 / 回望 / 我的
│   ├── chapter-card/          Chapter 视觉卡片
│   ├── moment-card/           Moment 内容卡片
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
    ├── history/               回望 Gallery
    ├── chapter/detail/        瞬间 / 日历 / 回望
    ├── chapter/members/       成员管理与分享邀请
    ├── chapter/join/          接受邀请
    ├── chapter/editor/        Chapter 创建与编辑
    ├── moment/editor/         Moment 创建与编辑
    ├── moment/detail/         Moment 详情
    ├── moment/contribute/     补完他人的 Moment
    ├── review/                Chapter 叙事回顾与完成
    ├── search/                全局搜索
    └── profile/               个人偏好
```

## 数据层约定

页面不直接读写 `wx.setStorageSync`，业务数据统一通过 `services/store.js`：

- `getActiveChapter / getChapters / getChapter`
- `saveChapter / setChapterStatus / completeChapter / deleteChapter`
- `getMoments / getTimelineMoments / getMoment / saveMoment / deleteMoment`
- `getCalendarData / getMapData`
- `getMembers / createInvite / joinChapter / removeMember`
- `saveContribution / deleteContribution / getReviewData / search`

未来接后端时，保持这些方法的输入输出不变，把内部实现替换为云函数或 HTTP 请求即可，页面层无需重写。

核心数据关系：

```text
Chapter 1 ─── N Member
Chapter 1 ─── N Moment
Chapter 1 ─── N Goal
Moment  1 ─── N Contribution
User    1 ─── N Moment / Contribution
```

Goal 关系仅为历史数据和 API 兼容保留，不再进入 Chapter 一级导航或新建主流程。

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

语义 Token 定义在 `app.wxss`，覆盖 Color、Typography、Spacing、Radius 与 Elevation。视觉方向为 Adaptive Editorial × Apple Craft：内容优先、系统字体为主、衬线仅用于少量 Editorial Display，并保证无照片、纯文字、声音或少量内容时页面仍然成立。

自动检查可直接运行：

```bash
node tests/static-project.test.js
node tests/design-system.test.js
node tests/core-experience.test.js
```
