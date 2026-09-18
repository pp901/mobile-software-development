const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const browse = require('../services/chapter-browse')
const product = require('../constants/product')

const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const appStyles = read('app.wxss')
const semanticTokens = [
  'background-primary', 'background-secondary', 'surface-primary', 'surface-elevated',
  'text-primary', 'text-secondary', 'text-tertiary', 'border-subtle', 'accent',
  'accent-soft', 'danger', 'success', 'type-display', 'type-page-title',
  'type-section-title', 'type-body', 'type-caption', 'type-metadata', 'type-micro',
  'radius-small', 'radius-medium', 'radius-large', 'radius-full'
]
semanticTokens.forEach(token => assert.match(appStyles, new RegExp(`--${token}\\s*:`), `缺少 Design Token --${token}`))

const visualFiles = []
function collect(dir) {
  fs.readdirSync(path.join(root, dir), { withFileTypes: true }).forEach(entry => {
    const relative = path.join(dir, entry.name)
    if (entry.isDirectory()) collect(relative)
    else if (/\.(wxss|wxml)$/.test(entry.name)) visualFiles.push(relative)
  })
}
collect('pages')
collect('components')
visualFiles.push('app.wxss')

const visualSource = visualFiles.map(file => read(file)).join('\n')
assert.match(appStyles, /--font-display:/, '品牌使用统一展示字体')
;['#f2bd42', '#ec765f', '#73a9d8', '#173f2d', '#fff0b8', '#ffe0d7', '#dcebf6'].forEach(color => {
  assert.equal(visualSource.toLowerCase().includes(color), false, `旧多 Accent 颜色仍存在：${color}`)
})
assert.equal((visualSource.match(/box-shadow\s*:/g) || []).length <= 10, true, '阴影只应保留给 Material、Modal 和轻量状态')

const momentCard = read('components/moment-card/moment-card.wxml')
assert.match(momentCard, /widthFix/, '内容流保留真实图片比例')
assert.match(momentCard, /aspectFill/, '紧凑卡片使用统一缩略图比例')
assert.match(momentCard, /lazy-load/)
assert.match(read('pages/moment/detail/index.wxml'), /mode="aspectFit"/, '详情图片不裁切')
assert.doesNotMatch(read('pages/index/index.wxml'), /拍照记录|写点想法|语音记录/, '首页只保留统一 Composer 入口')
assert.deepEqual(product.CHAPTER_MODULES, ['瞬间', '日历', '回望'], 'UI 扩展不改写存储层模块结构')
for (const token of ['bg','surface','surface-soft','primary','primary-deep','primary-soft','primary-pale','lavender','blue','blush','text','text-muted','line']) assert.ok(appStyles.includes('--'+token+':'))
const moments = [
  { id: 'a', type: 'photo', createdAt: '2026-09-01T10:00:00+08:00', localDateKey: '2026-09-01', location: '海边', latitude: 36.07, longitude: 120.44, media: [] },
  { id: 'b', type: 'text', createdAt: '2026-09-01T11:00:00+08:00', localDateKey: '2026-09-01', location: '海边', latitude: 36.0701, longitude: 120.4401, media: [] },
  { id: 'c', type: 'voice', createdAt: '2026-09-02T12:00:00+08:00', localDateKey: '2026-09-02', location: '车站', latitude: 36.2, longitude: 120.6, media: [] }
]
let mapData = browse.buildMapData(moments)
const singleton = mapData.groups.find(group => group.momentCount === 1)
mapData = browse.buildMapData(moments, singleton.id)
assert.equal(mapData.markers.some(marker => marker.iconPath.endsWith('map-marker-selected.png')), true)
assert.equal(mapData.markers.some(marker => marker.iconPath.endsWith('map-marker-cluster.png')), true)
;['map-marker.png', 'map-marker-selected.png', 'map-marker-cluster.png'].forEach(file => {
  assert.equal(fs.existsSync(path.join(root, 'assets/icons', file)), true, `缺少地图 Marker 资源 ${file}`)
})

console.log('design-system tests passed')
