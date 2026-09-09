# ongoing_ / 未完

一款围绕 `Chapter → Moment → Review` 组织生活片段的原生微信小程序。

当前版本 0.2.0 已完成 Quick Moment、多人共同 Chapter、邀请补完、Chapter 生命周期、数据 Review 与照片海报。默认可用本地示例数据完整演示，也提供可部署的微信云函数用于跨设备协作。

## 运行

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择本目录 `project-my summer holiday`。
4. 使用 `project.config.json` 中已有的 AppID，或替换为自己的测试号。
5. 编译后首次进入会展示三屏产品引导；“我的 → 恢复示例数据”可随时重置演示。

### 2026-09-08 产品与视觉升级

本轮把产品主链路改为“3 秒记录—共同记录—邀请补完—完成回望”。界面采用米白底、森林绿主色，以及珊瑚红、明黄、湖蓝高对比色块；卡片通过实体压边和阴影增强层次。

项目已改为 WebView 渲染，避免原 Skyline 配置与现有样式能力不一致。导入时确认目录为本文件所在目录；修改渲染配置后请重新编译，若开发者工具仍显示旧页面，可清除编译缓存再编译，无需清除本地记录数据。

验证：全部 WXML 与 WXSS 通过已安装微信开发者工具自带编译器。工作区同级的 `ui-review` 保存了 390px / 320px 浏览器布局预览，它们用于排版检查，不是微信模拟器截图。微信 CLI 服务端口目前关闭，尚未完成自动化模拟器与真机验收。

详细修复范围、数据结构、测试记录和云开发部署步骤见 `IMPLEMENTATION_REPAIR_LOG.md`。

## 已完成的体验

- 品牌启动页与首次引导；
- “当下”首页、当前 Chapter 与拍照/文字/语音快速记录；
- 回望 Gallery：正在发生 / 已成章 / 已归档；
- 创建、编辑、切换、完成、归档、恢复与删除 Chapter；
- 图片、文字、地点、心情、标签、语音 Moment；
- Moment 新建、编辑、收藏、删除与微信分享；
- 共同 Chapter 邀请、成员权限、混合时间线与成员筛选；
- Moment 邀请补完、独立 Contribution 与共同记忆展示；
- Chapter 结束确认、完整数据 Review、照片选择和海报生成；
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
├── services/store.js          本地数据、权限与聚合
├── services/collaboration.js  本地/云端协作适配
├── cloudfunctions/            微信云端协作与权限校验
├── utils/date.js              日期与问候语
└── pages/
    ├── splash/                启动页
    ├── onboarding/            首次引导
    ├── index/                 当下
    ├── history/               回望 Gallery
    ├── chapter/detail/        共同时间线 / 足迹 / Goal / 回望
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
- `getMoments / getMoment / saveMoment / deleteMoment`
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

状态值固定为：`ONGOING`、`COMPLETED`、`ARCHIVED`。

## 当前边界与后续接入

默认模式会通过 `wx.saveFile` 与本地缓存保存媒体和数据。跨设备协作需要在微信开发者工具部署项目内的 `collaboration` 云函数。正式上线前还需：

1. 创建云数据库集合并部署云函数；
2. 配置隐私协议、用户信息授权与内容安全检查；
3. 在两台真机验证跨设备邀请、刷新和权限；
4. 根据课程答辩设备补做 iOS/Android 兼容测试。

## 视觉资产

三张项目内摄影素材由内置 imagegen 生成，并已压缩为 WebP：

- `assets/images/chapter-summer.webp`：地中海海岸、背影人物、夏日章节封面；
- `assets/images/moment-sunset.webp`：海边日落、饮品与相机；
- `assets/images/moment-study.webp`：窗边书桌、笔记与晨光。

视觉方向遵循产品方案的 Soft Story Gallery：米白底色、橄榄绿主色、克制季节色、摄影优先、编辑式排版和充足留白。
