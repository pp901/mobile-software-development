const assert = require('node:assert/strict')
const date = require('../utils/date')
const browse = require('../services/chapter-browse')
const product = require('../constants/product')

function moment(id, createdAt, extra) {
  return Object.assign({ id, createdAt, content: id, media: [] }, extra || {})
}

function calendarTests() {
  const completed = { id: 'chapter', status: 'COMPLETED', startDate: '2024-07-01', endDate: '2025-01-15' }
  let result = browse.buildCalendarData(completed, [], { todayKey: '2026-09-14' })
  assert.equal(result.monthKey, '2024-07', '0 Moment 时应显示 Chapter 开始月')
  assert.equal(result.hasMoments, false)
  assert.equal(result.days[0].key, '2024-07-01', '月历应以周一为首列')

  const moments = [
    moment('late', '2024-07-18T18:47:00+08:00', { localDateKey: '2024-07-18' }),
    moment('early', '2024-07-18T14:32:00+08:00', { localDateKey: '2024-07-18' }),
    moment('august', '2024-08-01T09:00:00+08:00', { localDateKey: '2024-08-01' }),
    moment('new-year', '2025-01-02T09:00:00+08:00', { localDateKey: '2025-01-02' }),
    moment('invalid', 'not-a-date')
  ]
  result = browse.buildCalendarData(completed, moments, { monthKey: '2024-07', selectedDateKey: '2024-07-18', todayKey: '2026-09-14' })
  assert.equal(result.selectedMomentCount, 2, '同一天多个 Moment 应聚合')
  assert.deepEqual(result.selectedMoments.map(item => item.id), ['early', 'late'], '日内 Moment 应按时间正序')
  assert.equal(result.days.find(item => item.key === '2024-07-18').count, 2)
  assert.equal(result.invalidMomentCount, 1, '异常 createdAt 应被安全排除')
  assert.equal(result.nextMonthKey, '2024-08')
  assert.equal(date.shiftMonth('2024-12', 1), '2025-01', '月份切换应兼容跨年')

  result = browse.buildCalendarData(completed, moments, { todayKey: '2026-09-14' })
  assert.equal(result.monthKey, '2025-01', '已结束 Chapter 应优先显示最近有记录的月份')

  const ongoing = { id: 'ongoing', status: 'ONGOING', startDate: '2026-08-01', endDate: '2026-10-01' }
  result = browse.buildCalendarData(ongoing, [moment('aug', '2026-08-02T09:00:00+08:00')], { todayKey: '2026-09-14' })
  assert.equal(result.monthKey, '2026-09', '进行中且当前月在范围内时应显示当前月')

  assert.equal(date.momentDateKey(moment('night', '2024-07-19T06:30:00.000Z', { localDateKey: '2024-07-18' })), '2024-07-18', '新数据应优先使用创建时保存的自然日')
  assert.equal(date.dateKey('invalid'), '', '异常日期不能输出 Invalid Date')
  assert.equal(Number.isFinite(date.chapterTiming({ status: 'ONGOING', startDate: 'invalid', endDate: 'invalid' }).progress), true, '异常 Chapter 日期不能产生 NaN')
}

function mapTests() {
  let result = browse.buildMapData([])
  assert.equal(result.hasPlaces, false)

  const valid = moment('one', '2024-07-18T09:00:00+08:00', { location: '镰仓高校前', latitude: 35.3062, longitude: 139.5007, image: '/one.jpg' })
  result = browse.buildMapData([valid])
  assert.equal(result.groups.length, 1)
  assert.equal(result.scale, 14)
  assert.equal(result.markers.length, 1)

  const cases = [
    moment('missing-name', '2024-07-18', { location: '', latitude: 35, longitude: 139 }),
    moment('string-coordinates', '2024-07-18', { location: '字符串坐标', latitude: '35', longitude: '139' }),
    moment('bad-latitude', '2024-07-18', { location: '无效纬度', latitude: 91, longitude: 139 }),
    moment('bad-longitude', '2024-07-18', { location: '无效经度', latitude: 35, longitude: 181 }),
    moment('schema-default', '2024-07-18', { location: '仅有名称', latitude: 0, longitude: 0 })
  ]
  assert.equal(browse.buildMapData(cases).groups.length, 0, '无效或缺失坐标不能生成 Marker')

  const sameName = moment('same-name', '2024-07-18T10:00:00+08:00', { location: ' 镰仓高校前 ', latitude: 35.307, longitude: 139.501 })
  const nearby = moment('nearby', '2024-07-18T11:00:00+08:00', { location: '高校前站', latitude: 35.30675, longitude: 139.5009 })
  const far = moment('far', '2024-07-19T09:00:00+08:00', { location: '七里滨', latitude: 35.304, longitude: 139.51 })
  result = browse.buildMapData([valid, sameName, nearby, far])
  assert.equal(result.groups.length, 2, '同名或极近地点应轻量聚合，较远地点保持独立')
  assert.equal(result.groups.reduce((sum, group) => sum + group.momentCount, 0), 4)
  assert.equal(result.includePoints.length, 2)
  assert.equal(result.markers.some(marker => marker.polyline), false, 'Map 不应生成路线')
}

function storeCompatibilityTests() {
  const memory = {}
  global.wx = {
    getStorageSync(key) { return memory[key] },
    setStorageSync(key, value) { memory[key] = value }
  }
  const store = require('../services/store')
  store.setState({
    version: 2,
    schemaVersion: 2,
    currentUserId: 'owner',
    activeChapterId: 'chapter',
    profile: { id: 'owner', nickname: 'Owner', avatar: '' },
    users: [{ id: 'owner', nickname: 'Owner', avatar: '' }],
    chapters: [{ id: 'chapter', title: 'Summer', status: 'ONGOING', startDate: '2024-07-01', ownerId: 'owner', memberIds: ['owner'], modules: ['瞬间', '足迹', '目标', '回望'], goals: [{ id: 'goal', title: '保留历史目标', done: false }] }],
    moments: [moment('moment', '2024-07-18T23:30:00+08:00', { chapterId: 'chapter', creatorId: 'owner', type: 'text', location: '镰仓', latitude: 35.3, longitude: 139.5 })],
    contributions: [{ id: 'contribution', momentId: 'moment', chapterId: 'chapter', creatorId: 'owner', content: '补完', createdAt: '2024-07-19T08:00:00+08:00' }],
    invites: [{ id: 'invite', chapterId: 'chapter', code: 'TEST' }]
  })
  const state = store.getState()
  assert.deepEqual(state.chapters[0].modules, product.CHAPTER_MODULES, '历史模块应规范为当前 V1 三维结构')
  assert.equal(state.chapters[0].goals[0].title, '保留历史目标', 'Goal 数据必须保留')
  assert.equal(state.contributions.length, 1, 'Contribution 必须保留')
  assert.equal(state.invites.length, 1, 'Invite 必须保留')
  assert.equal(state.moments[0].localDateKey, '2024-07-18', '旧 Moment 应补齐可用日期 key')
  assert.equal(store.getMapData('chapter').groups.length, 1)
  const created = store.saveMoment({ chapterId: 'chapter', type: 'text', content: '跨年记录', createdAt: '2025-01-01T00:30:00+08:00' })
  assert.equal(created.localDateKey, date.dateKey('2025-01-01T00:30:00+08:00'), '新 Moment 应保存创建设备上的自然日')
  const photo = store.saveMoment({ chapterId: 'chapter', type: 'photo', content: '', media: [{ id: 'photo', type: 'image', path: '/photo.jpg' }], location: '镰仓', latitude: 35.30001, longitude: 139.50001, createdAt: '2024-07-18T16:00:00+08:00', localDateKey: '2024-07-18' })
  const voice = store.saveMoment({ chapterId: 'chapter', type: 'voice', content: '', voicePath: '/voice.mp3', voiceDuration: 12, createdAt: '2024-07-19T22:00:00+08:00', localDateKey: '2024-07-19' })
  assert.equal(store.getCalendarData('chapter', '2024-07', '2024-07-18').selectedMomentCount, 2, '文字/照片/语音创建后应进入同一 Calendar selector')
  assert.equal(store.getMapData('chapter').groups[0].momentCount, 2, '只有带真实地点的 Moment 应进入 Map')
  const editedVoice = store.saveMoment({ id: voice.id, chapterId: 'chapter', content: '补上说明', voicePath: voice.voicePath, voiceDuration: voice.voiceDuration })
  assert.equal(editedVoice.content, '补上说明', 'Moment 应可通过同一 Store 流程编辑')
  assert.equal(editedVoice.localDateKey, '2024-07-19', '编辑不应改变原记录自然日')
  assert.equal(store.getMoment(photo.id).media[0].path, '/photo.jpg', '图片媒体数据应保留')
  assert.equal(store.toggleGoal('chapter', 'goal').goal.done, true, '隐藏 Goal 的底层 API 仍需兼容')

  const flowChapter = store.saveChapter({ title: 'Core Flow', startDate: '2026-09-01', endDate: '2026-09-30' })
  const flowText = store.saveMoment({ chapterId: flowChapter.id, type: 'text', content: '第一句话', createdAt: '2026-09-10T09:00:00+08:00', localDateKey: '2026-09-10' })
  store.saveMoment({ chapterId: flowChapter.id, type: 'photo', media: [{ id: 'flow-photo', type: 'image', path: '/flow.jpg' }], location: '海边', latitude: 36.07, longitude: 120.44, createdAt: '2026-09-10T14:00:00+08:00', localDateKey: '2026-09-10' })
  store.saveMoment({ chapterId: flowChapter.id, type: 'voice', voicePath: '/flow.mp3', voiceDuration: 8, createdAt: '2026-09-11T20:00:00+08:00', localDateKey: '2026-09-11' })
  assert.equal(store.getCalendarData(flowChapter.id, '2026-09', '2026-09-10').selectedMomentCount, 2, '核心流程中的三种 Moment 应进入 Calendar')
  assert.equal(store.getMapData(flowChapter.id).validMomentCount, 1, '核心流程中只有带地点的 Moment 应进入 Map')
  assert.equal(store.saveMoment({ id: flowText.id, chapterId: flowChapter.id, content: '编辑后的文字' }).content, '编辑后的文字')
  assert.equal(store.completeChapter(flowChapter.id, '这一章，写完了。').status, 'COMPLETED')
  assert.equal(store.getReviewData(flowChapter.id).moments.length, 3, '结束 Chapter 后 Review 应保留全部 Moment')
  delete global.wx
}

calendarTests()
mapTests()
storeCompatibilityTests()
console.log('core-experience tests passed')
