# ongoing_ 本轮交接 · 2026-09-16

## 已完成

- P0 邀请闭环：不依赖微信分享。A 复制邀请文字，B 在「生活 → 加入共同记录」粘贴；同一入口处理 Chapter 和单个 Moment。新代码十二位、分组显示，兼容旧邀请。云端预览信息后确认加入。
- 身份与权限：云函数真实 OPENID + 请求身份核对；真实账号切换使用各自缓存，保留各自草稿和 pendingOps。Chapter 成员能新增自己的 Moment，Perspective 单独保存并允许作者继续编辑。资料和媒体走持久化上传队列。
- P1 速度：本地状态使用内存缓存，仍写入磁盘；公开读取返回副本。首页先显示本地，后台刷新；同一目标并发 pull 合并；一级页十五秒内无待同步时跳过重复全量读取。应用回到前台、联网及前台三十秒轮询继续刷新；详情只同步当前目标。Chapter 日历 / 回望按选中的区域计算。冷启动直接进入首页，移除必经 splash 跳转。
- P2 视角区域：明确未填写 / 已填写状态，主要按钮为「留下我的视角 / 编辑我的内容」；邀请作为独立的次要入口。各人内容保留头像和作者，操作收进更多菜单。整理详情页重复样式。
- P3 导航：三个一级入口共用固定宽度胶囊；独立 + 位于「生活」正上方，不再挤动导航，使用固定正圆尺寸。首页保留顶部记录入口；二级页不显示主导航。
- 包体积：logo 原图 1,325,600 字节，运行版 256px WebP 为 39,248 字节，减少约 97%。原图保留，packOptions 排除原图、tests、ui-review 和 node_modules。运行文件粗计约 0.56 MB；正式包体积以微信工具显示为准。
- 先前已落地：所有 Moment 的个人朋友圈式日期相册预览、logo 接入、自然配色提亮、Composer 圆形控件与溢出修整。没有重置数据或修改核心 schema。

## 仍需用户在微信环境完成

1. 部署当前 `cloudfunctions/collaboration`，云端安装依赖，环境 `cloud1-d3gkyt79x24b49e66`。
2. 上传最新小程序为体验版，两个真实微信体验账号打开同一版本。
3. 按 [CLOUD_SETUP.md](./CLOUD_SETUP.md) 验收 Chapter 与独立 Moment 的「A 创建 → B 加入 → B 填写 → A 看见 → B 修改 → A 看见最新内容」，包含图片、语音、重进与断网恢复。
4. 在云控制台核对不同 OPENID、成员、作者、Contribution 和版本更新；查看开发者工具实际上传包体积。

用户已经创建五个数据库集合，无需重建。线上部署状态与权限没有实际读取或修改；本地模拟通过不能表述为真实双账号已经通过。

## 必要检查结果

- collaboration-sync：实际客户端 / 服务端代码的隔离账号模拟，含完整粘贴邀请、旧码兼容、Chapter 共同记录、独立 Moment、B 编辑、断网补传、重启恢复、无缓存恢复、媒体上传、权限撤销、账号隔离和请求去重，通过。
- cloud-permissions：作用域、所有权、草稿隔离、媒体签名、冲突、幂等、分页与删除，通过。
- time-experience：时间回响、统计、发布与视角编辑、相册分组，通过。
- static-project 与 JS 语法检查，通过。没有运行完整编译、完整测试集或新一轮截图。

## 核心文件

- `cloudfunctions/collaboration/index.js`：身份、邀请和云端权限。
- `services/collaboration.js`：粘贴解析、同步队列、上传、请求合并。
- `services/store.js`：身份缓存、持久化、视角、成员和读性能。
- `pages/chapter/join`、`detail`、`members`：入口、确认加入、邀请及成员。
- `pages/moment/detail`：状态、邀请、视角编辑与读取。
- `app.js`、`app.json`、首页 / 生活 / Review：加载与后台刷新。
- `components/app-tabbar/app-tabbar.wxss`：统一导航与 +。
- `project.config.json`、`assets/images/logo.webp`：上传包瘦身。
