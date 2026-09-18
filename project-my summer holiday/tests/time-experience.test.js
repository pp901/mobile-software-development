const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value))
let memory = {}, destination = '', backCount = 0, failWrite = false, pullCount = 0
const cloud = { refreshAll: async () => {}, flush: async () => false, pullMoment: async () => { pullCount++ } }
global.wx = {
 getStorageSync: key => clone(memory[key]),
 setStorageSync(key, value) { if (failWrite) throw Error('full'); memory[key] = clone(value) },
 navigateTo({ url }) { destination = url }, redirectTo({ url }) { destination = url },
 navigateBack() { backCount++ }, showToast() {}, hideKeyboard() {},
 getRecorderManager: () => ({ onStop() {}, onError() {}, offStop() {}, offError() {} }),
 createInnerAudioContext: () => ({ onPause() {}, onEnded() {}, onError() {}, pause() {}, destroy() {} })
}
const store = require('../services/store')
const date = require('../utils/date')
function fresh() { memory = {}; store.init(true); return store.getCurrentUser().id }
function moment(key, extra) {
 return store.saveMoment(Object.assign({ content: '留下这一天', localDateKey: key, createdAt: key + 'T12:00:00+08:00' }, extra))
}
function page(relative) {
 const filename = path.resolve(__dirname, '..', relative)
 const localRequire = createRequire(filename)
 let definition
 vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
  require: name => name.endsWith('/collaboration') ? cloud : localRequire(name),
  Page: value => { definition = value }, wx: global.wx, Date,
  setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {}
 })
 definition.data = clone(definition.data)
 definition.setData = function (patch, callback) { Object.assign(this.data, patch); if (callback) callback() }
 return definition
}
async function run() {
 fresh()
 assert.equal(store.getEchoMoment('2026-09-16'), null)
 moment('2026-09-15')
 moment('2026-09-16')
 moment('2027-09-16')
 moment('2025-09-16', { status: 'DRAFT' })
 assert.equal(store.getEchoMoment('2026-09-16'), null, '近期、未来和草稿都不是 Echo')
 assert.equal(store.getEchoMoment('invalid'), null)

 fresh()
 const chapter = store.saveChapter({ title: '我的暑期生活', startDate: '2025-01-01' })
 moment('2025-02-01', { chapterId: chapter.id })
 moment('2026-08-17')
 const anniversary = moment('2025-09-16', { chapterId: chapter.id, location: '青岛' })
 store.setActiveChapter(chapter.id)
 const echo = store.getEchoMoment('2026-09-16')
 assert.equal(echo.id, anniversary.id, '往年同日优先，且可来自当前 Chapter 的纯文字')
 assert.equal(echo.reason, 'anniversary')
 assert.equal(echo.label, '一年前的今天')
 assert.equal(echo.explanation, '你在青岛留下了这一刻。')
 moment('2024-09-16', { id: 'a-newly-synced-record' })
 assert.equal(store.getEchoMoment('2026-09-16').id, echo.id, '当天同步新内容不打乱已出现的 Echo')
 store.deleteMoment(echo.id)
 assert.notEqual(store.getEchoMoment('2026-09-16').id, echo.id, '删除后不继续展示缓存')

 for (const [key, reason, age] of [['2026-08-17', 'days_30', 30], ['2026-06-18', 'days_90', 90], ['2026-03-20', 'days_180', 180]]) {
  fresh()
  const voice = moment(key, { content: '', voicePath: '/saved/voice.mp3', voiceDuration: 8 })
  const selected = store.getEchoMoment('2026-09-16')
  assert.equal(selected.id, voice.id)
  assert.equal(selected.reason, reason)
  assert.equal(selected.ageDays, age)
 }
 fresh()
 moment('2026-08-15')
 assert.equal(store.getEchoMoment('2026-09-16').label, '大约一个月前')
 fresh()
 moment('2026-08-10')
 assert.equal(store.getEchoMoment('2026-09-16'), null, '不把任意旧内容包装成一个月前')
 fresh()
 moment('2024-02-29')
 assert.equal(store.getEchoMoment('2028-02-29').label, '4 年前的今天')
 assert.equal(store.getEchoMoment('2025-03-01'), null)

 fresh()
 const firstChapter = store.saveChapter({ title: '一段生活', startDate: '2026-01-01' })
 moment('2026-05-10', { chapterId: firstChapter.id, createdAt: '2026-05-10T12:00:00Z' })
 const backfill = moment('2026-04-01', { chapterId: firstChapter.id, createdAt: '2026-09-16T12:00:00Z' })
 assert.equal(store.getEchoMoment('2026-09-16').id, backfill.id, '第一刻按经历的日期选择，兼容后来补记')
 assert.equal(store.getEchoMoment('2026-09-16').reason, 'chapter_first')
 store.revokeAccess('chapter', firstChapter.id)
 assert.equal(store.getEchoMoment('2026-09-16'), null, '失去访问权限后 Echo 也不可见')

 const me = fresh()
 const sharedChapter = store.saveChapter({ title: '共同的日子', startDate: '2026-07-30' })
 let state = store.getState()
 state.users.push({ id: 'guest', nickname: '林一', avatar: '' })
 state.chapters[0].memberIds.push('guest')
 store.setState(state)
 const own = moment('2026-09-14', { chapterId: sharedChapter.id })
 moment('2026-09-14')
 moment('2026-09-12', { status: 'DRAFT' })
 store.setCurrentUser('guest')
 store.saveContribution({ momentId: own.id, content: '我的另一个角度', createdAt: '2026-09-14T12:00:00+08:00' })
 const theirs = moment('2026-09-10', { chapterId: sharedChapter.id })
 moment('2025-09-16', { content: '不可见的私人记录' })
 store.setCurrentUser(me)
 const perspective = store.saveContribution({ momentId: theirs.id, content: '一起记得', localDateKey: '2026-09-15', createdAt: '2026-09-15T12:00:00+08:00' })
 const stats = store.getLifeStats()
 assert.equal(stats.momentCount, 3, '个人档案仅计创建或实际参与的 Moment')
 assert.equal(stats.recordedDayCount, 2, '同一天多条记录只算一个记录日')
 assert.equal(stats.sharedMomentCount, 2)
 assert.equal(stats.firstDate, '2026.09.14')
 assert.equal(stats.chapterCount, 1)
 assert.equal(store.getEchoMoment('2026-09-16'), null, '其他人的私有旧记录不可成为 Echo')
 assert.equal(store.getMoment(theirs.id).myPerspectiveId, perspective.id)
 assert.equal(store.getMoment(own.id).canOrganize, false)

 const existingPerspective = page('pages/moment/editor/index.js')
 existingPerspective.onLoad({ momentId: theirs.id })
 assert.equal(existingPerspective.data.contributionId, perspective.id, '已有视角自动打开编辑')
 existingPerspective.input({ detail: { value: '编辑后的视角' } })
 existingPerspective.save()
 assert.equal(store.getMoment(theirs.id).contributions.length, 1)
 const myOriginal = page('pages/moment/editor/index.js')
 myOriginal.onLoad({ momentId: own.id })
 assert.equal(myOriginal.data.id, own.id, '原作者编辑原有视角，不另建同义视角')

 const home = page('pages/index/index.js')
 home.load()
 assert.equal(home.data.total, 3)
 assert.ok(home.data.moments.some(item => !item.chapterId), '首页包含未归类的记录')
 home.createMoment()
 assert.equal(destination, '/pages/moment/editor/index', '首页记录不预选活跃 Chapter')

 const composer = page('pages/moment/editor/index.js')
 composer.onLoad({})
 assert.equal(composer.data.chapterId, '')
 composer.input({ detail: { value: '此刻的想法' } })
 composer.flushDraft()
 assert.ok(store.getWritingDrafts().some(item => item.content === '此刻的想法'))
 failWrite = true
 const before = store.getMoments().length
 composer.save()
 assert.equal(store.getMoments().length, before)
 assert.ok(composer.data.error)
 failWrite = false
 composer.save()
 assert.match(destination, /\/pages\/moment\/detail\/index\?id=.+&saved=1$/)
 const createdId = destination.split('id=')[1].split('&')[0]
 assert.equal(store.getMoment(createdId).chapterId, '')
 assert.equal(store.getEditorDraft(me + ':new'), null)
 composer.save()
 assert.equal(store.getMoments().length, before + 1, '重复点击不重复创建')
 const detail = page('pages/moment/detail/index.js')
 detail.onLoad({ id: createdId, saved: '1' })
 assert.equal(detail.data.showReceipt, true)
 assert.equal(detail.data.stats.recordedDayCount, store.getLifeStats().recordedDayCount)
 await detail.refreshMoment()
 assert.equal(pullCount, 0, '新 Moment 未同步时不抢先拉取远端，防止误判为已删除')
 assert.ok(store.getMoment(createdId))
 const editing = page('pages/moment/editor/index.js')
 editing.onLoad({ id: createdId }); editing.input({ detail: { value: '修改后的想法' } })
 const previousBacks = backCount
 editing.save()
 assert.equal(backCount, previousBacks + 1, '编辑仍普通返回')
 const fromChapter = page('pages/moment/editor/index.js')
 fromChapter.onLoad({ chapterId: sharedChapter.id })
 assert.equal(fromChapter.data.chapterId, sharedChapter.id)
 const history = page('pages/history/index.js')
 history.onLoad({ view: 'review' }); history.load()
 assert.ok(history.data.months.some(group => group.days.some(day => day.moments.some(item => item.id === createdId))), '月度回望包含未归类 Moment')
 assert.equal(store.getLifeStats().todayMomentCount, store.getMoments().filter(item => item.creator.id === me && item.localDateKey === date.today()).length)
 console.log('time experience passed: Echo dates/privacy/stability, life totals, capture/detail flow, shared perspectives, monthly reading')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
