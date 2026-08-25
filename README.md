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
| 02 | 课程实验归档 | [EXP1](#exp1) · [EXP2](#exp2) 已完成 |
| 03 | 个人项目实践 | Coming soon |
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

## Repository

```text
.
├── Exp1/        # 实验 1：第一个微信小程序
├── Exp2/        # 实验 2：个人名片小程序
├── README.md    # 课程总览
└── .gitignore
```

后续实验将按照相同结构加入仓库，并在上方的课程地图中更新进度。

## Notes

- 开发工具：微信开发者工具
- 当前项目：原生微信小程序
- 实验记录：[EXP1 博客](https://blog.csdn.net/ppxl01/article/details/164024454) · [EXP2 博客](https://blog.csdn.net/ppxl01/article/details/164054481)

---

<div align="center">
  <sub>Learning by building · Updating throughout the course</sub>
</div>
