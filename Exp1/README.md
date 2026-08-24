<div align="center">

# 移动软件开发

**Mobile Software Development · Course Portfolio**

从第一个微信小程序开始，记录每一次实验、每一个问题和每一项能力的形成。

<p>
  <img src="https://img.shields.io/badge/course-Mobile%20Software%20Development-243447?style=flat-square" alt="课程">
  <img src="https://img.shields.io/badge/platform-WeChat%20Mini%20Program-07c160?style=flat-square" alt="平台">
  <img src="https://img.shields.io/badge/progress-EXP1%20complete-c47f4b?style=flat-square" alt="进度">
</p>

</div>

---

## 课程档案

| 项目 | 信息 |
| --- | --- |
| 课程 | 中国海洋大学 26 夏《移动软件开发》 |
| 开发工具 | 微信开发者工具 |
| 技术栈 | WXML · WXSS · JavaScript · Skyline |
| 课程主页 | [OUC《移动软件开发》](https://oucai.club/classes/MobileDev.html) |

这门课程以移动应用开发基本编程能力为目标，先从微信小程序基础入门，再通过实践逐步完成个人项目。这个仓库是对应的个人课程档案：每个阶段都保留源码、运行效果、实现思路和调试记录。

## 课程路线

| 阶段 | 内容 | 本仓库的记录方式 |
| --- | --- | --- |
| 01 | 课程介绍与开发环境 | 在 README 中说明课程背景与工具链 |
| 02 | 小程序基础实验 | 按实验归档源码、效果、原理与复盘 |
| 03 | 个人项目实践 | 后续补充项目目标、功能与迭代记录 |
| 04 | 课程总结归档 | 汇总作品链接、问题清单与学习收获 |

## 实验索引

| 实验 | 主题 | 关键能力 | 状态 |
| --- | --- | --- | --- |
| [EXP1](./Exp1/) | 热身运动：第一个微信小程序 | 项目结构、组件、数据绑定、事件响应、资源管理 | 已完成 |
| 个人项目 | 待更新 | 需求分析、页面设计、功能实现与迭代 | 计划中 |

> 后续内容会沿用相同的记录方式：先完成作品，再沉淀实现原理与问题复盘。

---

## EXP1 · First WeChat Mini Program

### 实验目标

从零创建一个不使用模板的微信小程序，熟悉最基本的目录结构与开发流程，并完成一个可交互的首页。

### 作品概览

页面只有一个核心动作：点击按钮，让文字和图片同时切换。

```text
初始状态   Hello Weixing!  +  微信图标
     点击按钮
切换状态   Hi! QQ          +  QQ 图标
```

文字与图片共享同一个 `isHello` 状态，因此一次点击会触发两个视图的同步更新。这是本次实验最小但完整的数据驱动界面闭环：**状态 → 视图 → 用户事件 → 状态更新**。



### 项目结构

```text
Exp1/
├── app.js                         # 小程序全局逻辑
├── app.json                       # 页面、渲染器与全局配置
├── app.wxss                       # 全局样式
├── project.config.json            # 微信开发者工具项目配置
├── sitemap.json                   # 页面索引规则
├── img/
│   ├── weixing.png                # 微信图标
│   └── QQ.jpeg                    # QQ 图标
├── pages/index/
│   ├── index.wxml                 # 首页结构
│   ├── index.wxss                 # 首页样式
│   ├── index.js                   # 首页数据与交互
│   └── index.json                 # 首页组件配置
└── components/navigation-bar/     # 自定义导航栏组件
```


### 如何运行

1. 安装并打开[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 选择“导入项目”，将项目目录指向仓库中的 `Exp1/`。
3. 使用自己的小程序 AppID，或在本地开发时选择测试号。
4. 编译项目，在模拟器中点击“点击”按钮验证两种状态的切换。


## 相关链接

- [EXP1 源码](./Exp1/)
- [EXP1 博客](https://blog.csdn.net/ppxl01/article/details/164024454)
- [课程仓库](https://github.com/pp901/mobile-software-development)

---

<div align="center">
  <sub>持续更新中 · Built one experiment at a time</sub>
</div>
