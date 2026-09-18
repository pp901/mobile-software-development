const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value))
let memory = {}, destination = '', failStorage = false
const cloud = { refreshAll: async () => {}, pullChapter: async () => {}, pullMoment: async () => {}, flush() {} }
const wx = global.wx = {
  getStorageSync: key => clone(memory[key]),
  setStorageSync(key, value) { if (failStorage) throw Error('full'); memory[key] = clone(value) },
  navigateTo({ url }) { destination = url }, redirectTo({ url }) { destination = url }, navigateBack() {},
  hideKeyboard() {}, showToast() {}, showModal({ success }) { success({ confirm: true }) },
  getRecorderManager: () => ({ onStop() {}, onError() {}, offStop() {}, offError() {} }),
  createInnerAudioContext: () => ({ onPause() {}, onEnded() {}, onError() {}, pause() {}, stop() {}, destroy() {} })
}
const store = require('../services/store')
store.init()
function page(relative) {
  const filename = path.resolve(__dirname, '..', relative)
  const localRequire = createRequire(filename)
  let definition
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    require: name => name.endsWith('/collaboration') ? cloud : localRequire(name),
    Page: value => { definition = value }, wx, console, Date,
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {}
  })
  definition.data = clone(definition.data)
  definition.setData = function (patch, callback) {
    for (const [key, value] of Object.entries(patch)) {
      const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.')
      let target = this.data
      for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]] ||= {}
      target[parts.at(-1)] = value
    }
    if (callback) callback()
  }
  return definition
}
const first = store.saveChapter({ title: '一段日常', startDate: '2026-09-01' })
const second = store.saveChapter({ title: '旅行', startDate: '2026-09-01' })
const a = store.saveMoment({ chapterId: first.id, content: '第一章的记录', localDateKey: '2026-09-08' })
const b = store.saveMoment({ chapterId: second.id, content: '第二章的记录', localDateKey: '2026-09-09' })
store.saveMoment({ content: '未归档的记录' })
store.setActiveChapter(first.id)
const home = page('pages/index/index.js'); home.load()
assert.deepEqual(home.data.moments.map(x => x.id), [a.id])
const next = home.data.chapters.findIndex(x => x.id === second.id)
home.changeChapter({ detail: { current: next } })
assert.deepEqual(home.data.moments.map(x => x.id), [b.id], '横滑后的 Moment 必须属于当前 Chapter')
home.createMoment(); assert.ok(destination.endsWith('chapterId=' + second.id))
home.changeChapter({ detail: { current: home.data.chapters.length } })
assert.equal(home.data.moments.length, 0, '新建卡不应继续显示上一章记录')
const detail = page('pages/chapter/detail/index.js'); detail.onLoad({ id: first.id })
detail.openCalendar(); detail.selectDay({ currentTarget: { dataset: { key: '2026-09-08' } } })
assert.equal(detail.data.calendar.selectedMomentCount, 1)
assert.equal(detail.data.calendar.selectedMoments[0].id, a.id)
detail.recordSelectedDay(); assert.ok(destination.endsWith('date=2026-09-08'))
detail.inputGoal({detail:{value:'读一本书'}}); detail.saveGoal();
assert.ok(store.getPendingOps().find(x=>x.action==='saveChapter'&&x.id===first.id).data.chapter.goals.some(x=>x.title==='读一本书'), '目标变化必须进入已有 Chapter 同步队列')
detail.nextMonth(); assert.equal(detail.data.calendar.monthKey, '2026-10')
const composer = page('pages/moment/editor/index.js'); composer.onLoad({ chapterId: second.id, date: '2026-09-10' })
assert.equal(composer.data.localDateKey, '2026-09-10')
composer.input({ detail: { value: '此刻的想法' } })
composer.inputTags({ detail: { value: '日常，朋友，日常' } }); composer.saveTags(); composer.flushDraft()
const restored = page('pages/moment/editor/index.js'); restored.onLoad({})
assert.equal(restored.data.content, '此刻的想法')
assert.deepEqual(Array.from(restored.data.tags), ['日常', '朋友'])
assert.equal(restored.data.chapterId, second.id)
failStorage = true; assert.equal(restored.flushDraft(), false); assert.equal(restored.data.draftStatus, '草稿未保存'); failStorage = false
restored.save()
assert.equal(store.getEditorDraft(store.getCurrentUser().id + ':new'), null)
assert.deepEqual(store.getMoments(second.id).find(x => x.content === '此刻的想法').tags, ['日常', '朋友'])
const moment = page('pages/moment/detail/index.js'); moment.onLoad({ id: a.id })
assert.equal(moment.data.perspectives.length, 0, '原记录不重复出现在不同视角列表')
const history = page('pages/history/index.js'); history.onLoad({ view: 'review' }); history.openChapter({ detail: { id: first.id } })
assert.ok(destination.includes('/pages/review/index?id='))
const review = page('pages/review/index.js'); review.onLoad({ id: first.id })
const limit = review.data.limit; review.onReachBottom(); assert.equal(review.data.limit, limit, '未展开时不加载长回望列表')
console.log('UI interactions passed: swiper scope, calendar, backfill date, mixed draft tags, failed storage and review routes')
