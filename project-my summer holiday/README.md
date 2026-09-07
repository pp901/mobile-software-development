# ongoing_ / 未完

一款围绕 `Chapter → Moment → Review` 组织生活片段的原生微信小程序。

当前版本是一套可直接在微信开发者工具中运行的 V1 交互骨架。它使用本地缓存完成完整演示，不依赖服务器，也为后续接入微信云开发或自有 API 保留了清晰的数据边界。

## 运行

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择本目录 `project-my summer holiday`。
4. 使用 `project.config.json` 中已有的 AppID，或替换为自己的测试号。
5. 编译后首次进入会展示三屏产品引导；“我的 → 恢复示例数据”可随时重置演示。

### 2026-09-06 界面调整

本轮按用户提供的手机参考图调整，采用纸白背景、橄榄绿按钮、四列快捷记录、贴底导航和左图右文的章节列表。中央“＋”打开记录方式面板；章节详情使用封面与圆角内容区；片刻详情使用大图、标签和相关片段；回望首屏使用纪念卡片。

项目已改为 WebView 渲染，避免原 Skyline 配置与现有样式能力不一致。导入时确认目录为本文件所在目录；修改渲染配置后请重新编译，若开发者工具仍显示旧页面，可清除编译缓存再编译，无需清除本地记录数据。

验证：全部 WXML 与 WXSS 通过已安装微信开发者工具自带编译器。工作区同级的 `ui-review` 保存了 390px / 320px 浏览器布局预览，它们用于排版检查，不是微信模拟器截图。微信 CLI 服务端口目前关闭，尚未完成自动化模拟器与真机验收。

本轮没有生成新照片，已有三张图片暂作可替换素材。此前下载但未接入的八张照片已从小程序打包清单排除。地图定位、共同章节与保存海报仍属于后续功能范围。

## 已完成的体验

- 品牌启动页与首次引导；
- “当下”首页、当前 Chapter 与快速记录；
- 回望 Gallery：正在发生 / 已成章 / 已归档；
- 创建、编辑、切换、完成、归档、恢复与删除 Chapter；
- 图片、文字、地点、心情、标签、语音 Moment；
- Moment 新建、编辑、收藏、删除与微信分享；
- Chapter 时间线、足迹叙事、Goal 进度与基础 Review；
- Chapter / Moment / 标签 / 地点全文搜索；
- 本地数据持久化与完整的课程 Demo 数据。

## 架构

```text
app.js / app.wxss              应用启动、全局视觉令牌
├── assets/                    本地摄影素材与线性图标
├── components/
│   ├── app-tabbar/            当下 / ＋ / 回望
│   ├── chapter-card/          Chapter 视觉卡片
│   ├── moment-card/           Moment 内容卡片
│   └── navigation-bar/        安全区自适应导航
├── data/demo.js               课程演示数据
├── services/store.js          唯一数据访问层（本地缓存）
├── utils/date.js              日期与问候语
└── pages/
    ├── splash/                启动页
    ├── onboarding/            首次引导
    ├── index/                 当下
    ├── history/               回望 Gallery
    ├── chapter/detail/        时间线 / 足迹 / Goal / 回望
    ├── chapter/editor/        Chapter 创建与编辑
    ├── moment/editor/         Moment 创建与编辑
    ├── moment/detail/         Moment 详情
    ├── review/                Chapter 叙事回顾与完成
    ├── search/                全局搜索
    └── profile/               个人偏好
```

## 数据层约定

页面不直接读写 `wx.setStorageSync`，业务数据统一通过 `services/store.js`：

- `getActiveChapter / getChapters / getChapter`
- `saveChapter / setChapterStatus / deleteChapter`
- `getMoments / getMoment / saveMoment / deleteMoment`
- `toggleFavorite / toggleGoal / completeChapter / search`

未来接后端时，保持这些方法的输入输出不变，把内部实现替换为云函数或 HTTP 请求即可，页面层无需重写。

核心数据关系：

```text
Chapter 1 ─── N Moment
Chapter 1 ─── N Goal
Moment  N ─── 1 Chapter
```

状态值固定为：`ONGOING`、`COMPLETED`、`ARCHIVED`。

## 当前边界与后续接入

当前是单机可交互框架，用户选择的媒体会通过 `wx.saveFile` 保存在本机。正式上线前建议按此顺序继续：

1. 接入登录、云数据库与对象存储；
2. 将足迹的叙事预览替换为真实地图 Marker 聚合；
3. 增加多图上传、语音转写和分享卡片生成；
4. 实现 Shared Chapter 的成员、权限与共同时间线；
5. 补充隐私协议、内容安全检查、埋点和异常上报。

## 视觉资产

三张项目内摄影素材由内置 imagegen 生成，并已压缩为 WebP：

- `assets/images/chapter-summer.webp`：地中海海岸、背影人物、夏日章节封面；
- `assets/images/moment-sunset.webp`：海边日落、饮品与相机；
- `assets/images/moment-study.webp`：窗边书桌、笔记与晨光。

视觉方向遵循产品方案的 Soft Story Gallery：米白底色、橄榄绿主色、克制季节色、摄影优先、编辑式排版和充足留白。
