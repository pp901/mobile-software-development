<div align="center">

# 移动软件开发

**Mobile Software Development · Personal Course Archive**

中国海洋大学 26 夏 

[课程主页](https://oucai.club/classes/MobileDev.html)　·　[GitHub Repository](https://github.com/pp901/mobile-software-development)

</div>

---

## About

这是我的《移动软件开发》课程档案，记录从微信小程序基础到个人项目实践的学习过程。

课程以移动应用开发基本能力为主线，围绕页面结构、交互逻辑、组件使用和项目实践展开。每次实验只保留最重要的三部分：**作品、实现、复盘**。

## Course Map

| Stage | Content | Status |
| :---: | --- | :---: |
| 01 | 开发环境与小程序基础 | In progress |
| 02 | 课程实验归档 | [EXP1](#exp1) · [EXP2](#exp2) · [EXP3](#exp3) · [EXP4](#exp4) · [EXP6](#exp6) 已完成 |
| 03 | 个人项目实践 | [Project](#project) V1 框架完成 |
| 04 | 课程总结与作品展示 | Coming soon |

## Experiments

### EXP1　热身运动：第一个微信小程序 <a id="exp1"></a>

一个最小可运行的微信小程序：首页通过按钮控制文字与图片同步切换。

| Focus | Implementation |
| --- | --- |
| 页面 | WXML + WXSS + 自定义导航栏 |
| 交互 | `isHello` 状态与 `setData` |
| 资源 | 微信图标、QQ 图标 |
| 渲染 | Skyline |

**核心体验：** `状态 → 视图 → 用户操作 → 状态更新`

<div align="right">

[查看 EXP1 源码 →](./Exp1/)

</div>

### EXP2　个人名片：可分享的自我介绍页 <a id="exp2"></a>

一张可上下滚动、可转发给好友的个人名片小程序：头图定调，向下依次展开个人信息、简介、学习方向、近期动态与兴趣日常。

| Focus | Implementation |
| --- | --- |
| 页面 | `scroll-view` 长页面 + 自定义导航栏适配 |
| 布局 | Grid · Flex · `rpx` 多端排版 |
| 交互 | `open-type="share"` 原生转发按钮 |
| 分享 | `onShareAppMessage` + 分享图本地化与回退 |

**核心体验：** `头图设计 → 内容提纲 → 页面搭建 → 样式打磨 → 分享闭环`

<div align="right">

[查看 EXP2 源码 →](./Exp2/)

</div>

### EXP3　高校新闻网：观海听涛 · 海大新闻网 <a id="exp3"></a>

一个三页面结构的高校新闻小程序：首页轮播与「栏目 × 时间」组合筛选，详情页沉浸阅读与收藏入夹，个人中心收藏夹管理与多账号浏览足迹。

| Focus | Implementation |
| --- | --- |
| 页面 | 首页 / 新闻详情 / 个人中心 · `tabBar` 切换 |
| 数据 | `utils/common.js` 模拟数据层 + `utils/store.js` 存储封装层 |
| 收藏 | 多收藏夹（新建 / 重命名 / 清空 / 删除 / 移动）· 按 `userId` 账号隔离 |
| 交互 | 骨架屏 · 下拉刷新 · 左滑删除 · 全文搜索与历史词 · 相关阅读 |

**核心体验：** `数据分层 → 三页联动 → 收藏闭环 → 多账号隔离`

<div align="right">

[查看 EXP3 源码 →](./Exp3/)

</div>

### EXP4　推箱子游戏：Canvas 绘图与关卡进度 <a id="exp4"></a>

一个基于 Canvas 2D 的推箱子小游戏：选关首页管理解锁进度与星级纪录，游戏页负责地图绘制、推箱判定与通关动效，8 个关卡均经 BFS 验证可解。

| Focus | Implementation |
| --- | --- |
| 页面 | 选关首页 / 游戏页 · Canvas 2D 绘图 + `dpr` 高分屏适配 |
| 关卡 | 8 关地图矩阵（`utils/data.js`）· BFS 求解验证可解性并定三星线 |
| 进度 | 解锁进度 / 星级 / 最佳步数 · `utils/store.js` 存储封装 |
| 交互 | 方向键与滑动手势 · 150ms 补间动画 · 3 次撤销限制 · 死局提示 · 通关撒花与震动反馈 |

**核心体验：** `关卡设计 → BFS 验证 → Canvas 分层绘制 → 动效反馈 → 进度闭环`

<div align="right">

[查看 EXP4 源码 →](./Exp4/)

</div>

### EXP6　图片分享社区：小程序云开发 <a id="exp6"></a>

一个基于微信小程序云开发的图片分享社区：云数据库、云存储与云函数协同支撑发布、浏览、搜索、点赞、评论、下载与转发分享的完整社区闭环，并提供可重复执行的一键演示数据。

| Focus | Implementation |
| --- | --- |
| 页面 | 首页 / 发布 / 图片详情 / 我的 · `tabBar` 切换 |
| 云数据库 | `photo` / `comments` / `likes` 三集合 · 所有用户可读、仅创建者可写 |
| 云存储 | `wx.cloud.uploadFile` 多图上传 · `fileID` 直显 · 删除联动清理文件与记录 |
| 云函数 | `getOpenid` 身份预取与缓存 · `initData` mock 前缀隔离、可重复执行的演示数据 |
| 交互 | 精选轮播 · 骨架屏 · 下拉刷新 · 正则全文搜索 · 点赞操作锁与心跳动画 · 多图轮播自适应高度 |

**核心体验：** `云环境开通 → 集合与权限设计 → 发布闭环 → 互动闭环 → 演示数据`

<div align="right">

[查看 EXP6 源码 →](./Exp6/cloudPhoto/)

</div>

### Project　ongoing_ · 未完：生活片段记录框架 <a id="project"></a>

一个围绕 `Chapter → Moment → Review` 组织生活片段的个人项目：当下页聚焦当前章节与快速记录，回望页以 Gallery 归档正在发生 / 已成章 / 已归档的片段，章节详情以时间线、足迹与 Goal 进度呈现叙事。当前版本为可直接运行的 V1 交互骨架，全部数据走本地缓存，数据层与方法边界已为接入云开发或自有 API 预留。

| Focus | Implementation |
| --- | --- |
| 页面 | 11 个页面：启动 / 引导 / 当下 / 回望 / 章节详情与编辑 / Moment 编辑与详情 / 回顾 / 搜索 / 个人偏好 |
| 数据 | `services/store.js` 唯一数据访问层 + `data/demo.js` 课程演示数据 |
| 结构 | `Chapter 1 ─ N Moment` · 状态机 `ONGOING / COMPLETED / ARCHIVED` |
| 交互 | 图片 / 文字 / 地点 / 心情 / 标签 / 语音 Moment · 全文搜索 · 收藏与微信分享 |

**核心体验：** `数据边界 → 章节时间线 → 片段记录 → 回望叙事 → 演示闭环`

<div align="right">

[查看 Project 源码 →](./project-my%20summer%20holiday/)

</div>

## Repository

```text
.
├── Exp1/                        # 实验 1：第一个微信小程序
├── Exp2/                        # 实验 2：个人名片小程序
├── Exp3/                        # 实验 3：高校新闻网小程序
├── Exp4/                        # 实验 4：推箱子游戏小程序
├── Exp6/cloudPhoto/             # 实验 6：图片分享社区（云开发）
├── project-my summer holiday/   # 个人项目：ongoing_ · 未完
├── README.md                    # 课程总览
└── .gitignore
```

后续实验将按照相同结构加入仓库，并在上方的课程地图中更新进度。

## Notes

- 开发工具：微信开发者工具 · DevEco Studio
- 当前项目：原生微信小程序
- 实验记录：[EXP1 博客](https://blog.csdn.net/ppxl01/article/details/164024454) · [EXP2 博客](https://blog.csdn.net/ppxl01/article/details/164054481) · [EXP3 博客](https://blog.csdn.net/ppxl01/article/details/164219398) · [EXP4 博客](https://blog.csdn.net/ppxl01/article/details/164256841) · [实验5 博客](https://blog.csdn.net/ppxl01/article/details/164485373) · [EXP6 博客](https://blog.csdn.net/ppxl01/article/details/164754460)
- 个人项目：[ongoing_ · 未完](./project-my%20summer%20holiday/)（V1 交互框架，数据层为云开发预留边界）

---

<div align="center">
  <sub>Learning by building · Updating throughout the course</sub>
</div>
