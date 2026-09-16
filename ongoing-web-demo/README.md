# ongoing_ Web Demo

这是 `ongoing_ / 未完` 原生微信小程序的静态 Web 体验版，用于课程汇报后的扫码体验。

## 包含的体验

- 当下首页与进行中 Chapter
- Moment 列表和详情
- 新增 Moment（保存在浏览器 localStorage）
- Contribution / 邀请补完模拟
- Calendar 时间维度浏览
- Review 回望与统计
- 一键重置 Demo 数据

## 本地运行

直接双击 `index.html` 即可。若浏览器对本地文件有限制，也可以运行：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

## GitHub Pages 部署

仓库已包含 `.github/workflows/deploy-web-demo.yml`。在仓库 Settings → Pages 中将 Source 设为 **GitHub Actions**；推送到 `main` 后，工作流会仅发布本目录。

## 说明

Web Demo 用 `localStorage` 保存每位体验者自己的操作；它不模拟微信真实跨设备多人同步。完整协作能力仍属于微信小程序版本。
