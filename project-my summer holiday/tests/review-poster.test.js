const assert = require('node:assert/strict')
const poster = require('../services/review-poster')
function context() {
 let size = 20
 const calls = []
 const ctx = { calls, measureText: value => ({ width: Array.from(value).length * size * .6 }), setFontSize(value) { size = value; calls.push(['font', value]) } }
 ;['setFillStyle', 'fillRect', 'fillText', 'beginPath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'closePath', 'save', 'restore', 'clip', 'drawImage', 'arc', 'fill', 'setStrokeStyle', 'setLineWidth', 'stroke', 'setTextAlign'].forEach(name => { ctx[name] = (...args) => calls.push([name, ...args]) })
 return ctx
}
const model = { title: '我的暑期生活', dateRange: '2026.07.30 — 至今', excerpt: '我们在不同的角度里，记住了同一阵海风。', momentCount: 21, recordedDayCount: 12, sharedCount: 3, ongoing: true }
for (let count = 0; count <= 3; count++) {
 const ctx = context()
 const photos = Array.from({ length: count }, (_, index) => ({ path: 'photo-' + index, width: index % 2 ? 400 : 1600, height: index % 2 ? 1800 : 900 }))
 poster.paint(ctx, model, photos)
 assert.equal(ctx.calls.filter(call => call[0] === 'drawImage').length, count)
 assert.equal(ctx.calls.filter(call => call[0] === 'clip').length, count, '照片按版面裁切，不拉伸')
 const texts = ctx.calls.filter(call => call[0] === 'fillText')
 assert.ok(texts.some(call => call[1] === 'ongoing_'))
 assert.ok(texts.some(call => call[1] === '21'))
 assert.ok(texts.some(call => call[1] === '12'))
 assert.ok(texts.every(call => call[2] >= 0 && call[2] <= poster.WIDTH && call[3] > 0 && call[3] < poster.HEIGHT))
}
const long = context()
poster.paint(long, Object.assign({}, model, { title: '很长的章节名'.repeat(20), excerpt: '写下今天的生活。'.repeat(200) }), [])
assert.ok(long.calls.filter(call => call[0] === 'fillText').some(call => call[1].endsWith('…')), '超长内容在版心内截断')
assert.ok(long.calls.filter(call => call[0] === 'fillText').every(call => call[3] < poster.HEIGHT))
let exported = null
global.wx = {
 getImageInfo({ src, success, fail }) { src === 'missing' ? fail({}) : success({ path: src, width: 1200, height: 800 }) },
 createCanvasContext() { const ctx = context(); ctx.draw = (reserve, callback) => callback(); return ctx },
 canvasToTempFilePath(options) { exported = options; options.success({ tempFilePath: '/tmp/poster.png' }) }
}
;(async () => {
 assert.equal(await poster.generate({}, model, []), '/tmp/poster.png', '无照片也能导出')
 assert.equal(exported.destWidth, 1500)
 assert.equal(exported.destHeight, 2400)
 assert.equal(exported.fileType, 'png')
 await assert.rejects(poster.generate({}, model, [{ path: 'missing' }]), /第 1 张照片暂时无法读取/)
 console.log('poster passed: 0–3 photos, crop geometry, long text bounds, portrait export and missing-photo feedback')
})().catch(error => { console.error(error); process.exitCode = 1 })
