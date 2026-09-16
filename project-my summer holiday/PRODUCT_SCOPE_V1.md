# ongoing_ V1 产品范围

> 本文档是 V1 的产品边界和信息架构约束。后续修改应先核对本文档，不得因为页面需要“更丰富”而扩大产品范围。

## 1. 产品定位

`ongoing_` 是一个假期记录小程序。用户用 Chapter 表示一段假期，用 Moment 持续记录照片、文字、声音和地点。Chapter 最终通过“瞬间、日历、回望”三个维度组织这段经历。

产品优先保持记录低成本、内容有归属、共同记录有边界、回望有上下文。V1 不引入与假期记录无关的一级概念。

## 2. 核心用户流程

1. 用户创建或进入一个正在发生的 Chapter。
2. 首页“当下”展示当前 Chapter 与最近 Moment。
3. 用户通过底部中央 `+` 进入全局 Quick Capture，选择照片、文字或语音并创建 Moment。
4. 用户在 Moment Detail 查看、编辑或补完记录；其他 Chapter 成员可以通过 Contribution 补充自己记得的内容。
5. 用户在 Chapter Detail 中从瞬间、日历和回望三个维度浏览整段假期。
6. Chapter 结束时生成 Review，并可输出 Poster；过去的 Chapter 在 Gallery / 回望中继续可访问。

## 3. V1 功能范围

V1 保留：

- Chapter 的创建、编辑、状态和生命周期；
- Moment 的创建、查看、编辑、收藏和删除；
- 图片、文字、语音和地点记录；
- Calendar：基于真实 Moment 时间的月历、日期状态和日内浏览；
- Review 与 Poster；
- 多人 Chapter、Member、Invite 和 Contribution / 补完；
- 本地 Storage、Schema V2 兼容与现有云同步适配；
- Search 与 Profile；
- Theme / 个性化、Motion / Gesture 的后续接入位置，但本阶段不实现最终系统。

V1 不新增 AI、天气、新社交模式或其他无关的一级功能。

地图浏览不属于 V1。Moment 仍可保存地点名称、经纬度并在内容与搜索中展示，但 V1 不提供地图 Tab、Marker、地点地图卡片或路线。

## 4. Chapter 的三个核心维度

Chapter 一级结构固定为：

1. **瞬间**：内容维度，回答“发生了什么”。
2. **日历**：时间维度，回答“什么时候发生”。
3. **回望**：总结维度，回答“最终留下了什么”。

`chapter.modules` 必须按照上述顺序保存。历史数据中的“足迹 / 地图 / 目标 / 路线 / 进度 / 里程碑”等旧导航名称在读取时统一规范为新三维结构，不影响其他 Chapter 内容字段。

Calendar 进入 V1 核心浏览链路，只按真实 Moment 时间组织记录。地点继续作为 Moment 的可选信息存在；缺少地点的 Moment 仍正常出现在瞬间和日历中。

## 5. Goal 降级决定

Goal 退出 V1 主流程，不再作为 Chapter 的一级模块，新建 Chapter 时也不再提供“目标”类型入口。

为保持历史数据和云端兼容，以下能力必须保留：

- `chapter.goals`；
- Moment 的 `goalId`；
- `saveGoal`、`deleteGoal`、`moveGoal`、`toggleGoal`；
- 云适配中的 Goal 字段和 `toggleGoal` 调用；
- 已有 Demo、本地 Storage 和云端快照中的 Goal 数据。

这是隐藏和降级，不是删除 Schema 或 API。若未来重新评估 Goal，必须作为独立产品决策，不得直接恢复为 Chapter 一级导航。

## 6. 主要页面职责

- **首页“当下”**：当前 Chapter 与最近 Moment。首页不再另设三个 Quick Capture 入口。
- **底部中央 `+`**：唯一的全局 Quick Capture 入口，负责选择照片、文字或语音记录。
- **Moment Editor**：低成本完成一次记录，可稍后补充地点、心情和标签。
- **Moment Detail**：查看、编辑和完善一条记录，展示 Contribution。
- **Chapter Detail**：浏览整段假期，承载瞬间、日历与回望导航。
- **Calendar**：从时间维度浏览当前 Chapter，在月视图内选择日期并阅读当天 Moment。
- **Review**：总结 Chapter，管理结语、完整时间线与 Poster。
- **Gallery / 回望**：浏览正在发生、已成章和已归档的 Chapter。
- **Together / 共同记录**：管理成员、邀请与共同记录关系。
- **Search**：查找已有 Chapter、Moment、文字、地点和标签。
- **Profile**：用户资料、设置、个性化、同步状态和隐私入口。

不新增其他一级导航。局部页面可保留与当前 Chapter 上下文绑定的操作，但不得建立第二套全局 Quick Capture。

## 7. 后续阶段待实现

- **Calendar 后续强化**：仅做真机兼容、无障碍、大数据量性能和必要的交互细化；不得把 Calendar 改成任务或签到。
- **Design System**：Phase 3 已建立基础语义令牌、内容模板和页面视觉规则；后续只做验证与必要扩展，不借此扩大产品范围。
- **Theme**：主题配置、个性化范围与数据结构。
- **Motion**：动效、手势、降低动效偏好与性能预算。
- **Cloud hardening**：冲突解决、增量同步、错误可见性、权限校验、媒体生命周期与多端验证。
- **Release / Review**：隐私合规、内容安全、真机兼容、可访问性、性能和微信审核准备。

## 8. 数据与兼容约束

- 保持 `ongoing:data:v2` 和 Schema V2 兼容，不清空或覆盖用户业务数据。
- Chapter、Moment、Contribution、Member、Invite、Review、图片、语音、地点和 Goal 的历史字段不得因信息架构调整而丢失。
- 页面继续通过 `services/store.js` 读写业务数据，不直接分散读写 Storage。
- 云端快照与本地数据合并必须保持上述字段；强化同步机制属于后续阶段。
- 新 Moment 保存 `localDateKey`，用于保留创建设备上的本地自然日；旧数据由 `createdAt` 安全推导并在规范化时补齐。该兼容字段不得替代或删除原始 `createdAt`。
- Calendar 的日期过滤和聚合必须通过数据层 selector 提供，页面不直接操作 Storage 或伪造展示数据。现有 Map 数据 helper 可为历史兼容保留，但不属于 V1 页面能力。
