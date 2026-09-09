# ongoing_ 项目修复与开发记录

> 更新日期：2026-09-08  
> 当前版本：0.2.0  
> 依据：`OPTIMIZATION_AND_REDESIGN_PLAN.md`

## 本轮目标

把原本偏静态的课程 Demo 改造成可完整演示的生活共同记录产品，主闭环为：

`创建 Chapter → 邀请成员 → 3 秒快速记录 → 邀请补完 → 结束 Chapter → 生成 Review / 海报`

## 已完成修复

### 1. 数据与状态

- 数据结构升级为 Schema V2，并从旧缓存自动迁移。
- Chapter 保存 `ownerId`、`memberIds`、`status`、`endedAt`、`reviewPhotoIds`。
- Moment 保存 `creatorId`、`createdAt`、`status`、多图 `media`、语音和可选元数据。
- 新增 Contribution，一条 Moment 可关联多条补完记录，每条独立保存补充者与媒体。
- 统计数字全部从原始数据实时计算，避免 Moment、地点、成员和待补完数量失真。
- 完成 Chapter 后停止新增 Moment；原作者仍可修正自己已有的 Moment。

### 2. Quick Moment

- 底部“＋”只保留拍照、写一句、语音三个高频入口。
- 自动归属当前进行中的 Chapter，自动写入创建者和创建时间。
- 主内容优先，地点、心情、标签统一收进可选区域。
- 支持空内容先存为“待补完”；详情页可继续编辑多图、文字、地点等。
- 拍照入口可直接唤起相机/相册，语音采用按住录制。

### 3. 多人共同 Chapter

- 创建者可生成微信分享邀请，邀请路径直达加入页面。
- Chapter 顶部显示成员头像和人数。
- 时间线支持“全部 / 我的 / 指定成员”筛选，每条 Moment 显示记录者。
- 普通成员只能编辑自己的 Moment；创建者可删除违规内容、管理成员并结束 Chapter。
- 成员退出或被移除后，已发布内容继续保留。
- 新增可选云开发同步层和 `collaboration` 云函数；没有云环境时自动使用本地演示模式。

### 4. 邀请补完

- Moment 详情显示原始记录者，原始内容与补完内容分区呈现。
- 可选择 Chapter 成员并发送“邀请补完”微信卡片。
- 卡片直达补完页，支持照片、一句话、语音。
- Contribution 独立署名；补充者不能修改原始 Moment。
- 详情页显示共同补完人数与补完条数。

### 5. Chapter 生命周期与 Review

- 创建者结束 Chapter 前会看到待补完数量并二次确认。
- 完成后记录结束日期和时间、停止新增并进入回望状态。
- Review 自动聚合封面、标题、起止日期、持续天数、Moment 数、成员数、地点数、第一个和最后一个 Moment、记录最多的一天、共同补完时刻与完整时间线。
- 结束文案统一为“这一章，写完了。”。
- 海报支持从 Chapter 照片中选择 1～3 张，Canvas 本地生成，可预览并保存到相册。

### 6. 视觉与布局

- 保留米白纸张底色，用深森林绿、珊瑚红、明黄和湖蓝建立高对比色块。
- 主要卡片增加实体投影和底部压边，形成清晰层次。
- 快速记录三入口、统计卡、成员条、补完区和 Review 高光区各自使用稳定的语义色。
- 统一 28rpx 页面边距、三列/四列规则栅格、最小触控高度和安全区留白。
- 取消无功能的地点快捷入口，地点作为 Moment 可选信息保留。
- 修复资源打包忽略列表，所有实际使用的示例图片都会进入小程序包。
- 将 7 张体积异常的 WebP 压缩到移动端合适尺寸，项目目录由约 2.4MB 降至约 1.1MB，避免主包超限。

## 关键文件

- `services/store.js`：本地数据、迁移、权限、派生统计和 Review 聚合。
- `services/collaboration.js`：本地/云端协作适配层。
- `cloudfunctions/collaboration/index.js`：多人同步与服务端权限校验。
- `pages/moment/editor/`：快速记录。
- `pages/chapter/members/`、`pages/chapter/join/`：成员管理与邀请加入。
- `pages/moment/contribute/`：补完页面。
- `pages/moment/detail/`：原始记录与 Contributions 展示。
- `pages/review/`：结束确认、数据回望和海报生成。

## 验收记录

- JavaScript 语法检查：通过。
- JSON 配置解析：通过。
- Schema V2 初始化与旧缓存迁移：通过本地脚本验证。
- 新建待补完 Moment、创建邀请、成员加入、保存 Contribution、Review 聚合、结束后禁止新增：通过本地流程测试。
- 仍需在微信开发者工具执行最终编译和真机验证，重点检查录音授权、微信转发、相册权限与云函数部署后的跨设备同步。

## 云开发启用步骤

1. 在微信开发者工具中开通云开发环境。
2. 将 `cloudfunctions/collaboration` 上传并部署，选择“云端安装依赖”。
3. 创建集合：`ongoing_users`、`ongoing_chapters`、`ongoing_moments`、`ongoing_contributions`、`ongoing_invites`。
4. 重新编译。`app.js` 会自动初始化云能力；失败时不会阻断本地数据。

## 后续验收重点

- 两台真实微信设备通过分享卡加入同一 Chapter，并相互新增/刷新 Moment。
- 创建者、普通成员分别验证编辑、删除、移除成员和结束权限。
- iOS 与 Android 分别验证按住录音、图片选择和海报保存。
- 对 0 条、1 条、50 条 Moment，以及无照片、长标题、长昵称做极端布局检查。
