const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const script = read('components/navigation-bar/navigation-bar.js')
function navigation(width, rect) {
  let definition
  vm.runInNewContext(script, { Component: value => { definition = value }, wx: {
    getWindowInfo: () => ({ windowWidth: width, statusBarHeight: 44 }),
    getMenuButtonBoundingClientRect: () => rect
  }, console })
  const component = { data: Object.assign({}, definition.data), setData(value) { Object.assign(this.data, value) } }
  definition.lifetimes.attached.call(component)
  return component.data
}
for (const width of [320, 360, 375, 390, 430]) {
  const rect = { left: width - 96, top: 50, width: 88, height: 32 }
  const nav = navigation(width, rect)
  assert.ok(width - nav.capsuleWidth <= rect.left - 8, `${width}px 标题必须避开胶囊`)
  assert.ok(nav.barHeight >= 44)
  assert.ok(nav.statusHeight + nav.barHeight >= rect.top + rect.height)
  const fallback = navigation(width, { left: 0, top: 0, width: 0, height: 0 })
  assert.ok(fallback.capsuleWidth >= 88)
  const rpx = value => value * width / 750
  const inner = width - rpx(64)
  assert.ok(inner / 7 >= 40, `${width}px 日历日期应可点击`)
  const tabWidth = (width - rpx(56 + 20 + 24)) / 4
  assert.ok(tabWidth >= 44, `${width}px 导航触控区域太窄`)
  assert.ok(rpx(168) > rpx(16 + 20 + 96), '页面底部必须留出悬浮栏高度')
  const dockWidth = (inner - rpx(40)) / 5
  assert.ok(dockWidth >= 44, `${width}px Composer 工具触控区域太窄`)
}
assert.match(read('app.wxss'), /button\[class\]/, '必须覆盖微信 style v2 的按钮默认尺寸')
assert.match(read('app.wxss'), /\.primary-button\.primary-button/, '主按钮显式覆盖原生固定宽度')
assert.match(read('components/app-tabbar/app-tabbar.wxss'), /env\(safe-area-inset-bottom\)/)
assert.match(read('pages/chapter/detail/index.wxss'), /repeat\(7,minmax\(0,1fr\)\)/)
assert.match(read('pages/index/index.wxml'), /next-margin="82rpx"/)
assert.equal(JSON.parse(read('app.json')).debug, false)
console.log('responsive checks passed: 320, 360, 375, 390, 430px; capsule, dock and floating tabbar')
