const demo = require('../data/demo')
const date = require('../utils/date')

const STORAGE_KEY = 'ongoing:data:v2'
const LEGACY_KEY = 'ongoing:data:v1'
const STATUS_TEXT = { ONGOING: '正在发生', COMPLETED: '已成章', ARCHIVED: '已归档' }

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)) }
function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
function storageGet(key) { return typeof wx === 'undefined' ? null : wx.getStorageSync(key) }
function storageSet(key, value) { if (typeof wx !== 'undefined') wx.setStorageSync(key, clone(value)) }

function normalizeMedia(moment) {
  if (Array.isArray(moment.media)) return moment.media.map((item, index) => typeof item === 'string' ? { id: makeId(`media-${index}`), type: 'image', path: item } : item)
  if (moment.image) return [{ id: makeId('media'), type: 'image', path: moment.image }]
  return []
}

function migrate(input) {
  const source = clone(input || demo)
  if (source.schemaVersion === 2) return source
  const profile = Object.assign({}, demo.profile, source.profile || {})
  const currentUserId = profile.id || 'user-owner'
  profile.id = currentUserId
  return {
    version: 2,
    schemaVersion: 2,
    activeChapterId: source.activeChapterId || '',
    currentUserId,
    users: [profile],
    chapters: (source.chapters || []).map(item => ({
      id: item.id,
      title: item.title,
      englishTitle: item.englishTitle || 'LIFE CHAPTER',
      type: item.type || '自定义',
      status: item.status || 'ONGOING',
      statusText: STATUS_TEXT[item.status || 'ONGOING'],
      startDate: item.startDate || date.today(),
      endDate: item.endDate || '',
      description: item.description || '',
      cover: item.cover || '/assets/images/chapter-summer.webp',
      theme: item.theme || '#476354',
      modules: ['瞬间', '足迹', '目标', '回望'],
      ownerId: currentUserId,
      memberIds: [currentUserId],
      createdAt: item.createdAt || `${item.startDate || date.today()}T00:00:00`,
      endedAt: item.endedAt || '',
      ending: item.ending || '',
      goals: (item.goals || []).map(goal => Object.assign({ createdBy: currentUserId, completedAt: goal.done ? new Date().toISOString() : '' }, goal))
    })),
    moments: (source.moments || []).map(item => Object.assign({}, item, {
      creatorId: item.creatorId || currentUserId,
      type: item.type || (item.voicePath ? 'voice' : (item.image ? 'photo' : (item.location && !item.content ? 'place' : 'text'))),
      status: item.status || 'PUBLISHED',
      media: normalizeMedia(item),
      updatedAt: item.updatedAt || item.createdAt
    })),
    contributions: source.contributions || [],
    invites: source.invites || [],
    settings: Object.assign({ privateMode: true, saveOriginal: true, imageQuality: 'compressed' }, source.settings || {}),
    profile
  }
}

function normalizeV2(input) {
  const state = migrate(input)
  state.version = 2
  state.schemaVersion = 2
  state.users = Array.isArray(state.users) ? state.users : []
  state.chapters = Array.isArray(state.chapters) ? state.chapters : []
  state.moments = Array.isArray(state.moments) ? state.moments : []
  state.contributions = Array.isArray(state.contributions) ? state.contributions : []
  state.invites = Array.isArray(state.invites) ? state.invites : []
  state.settings = Object.assign({ privateMode: true, saveOriginal: true, imageQuality: 'compressed' }, state.settings || {})
  state.currentUserId = state.currentUserId || (state.profile && state.profile.id) || 'user-owner'
  state.profile = Object.assign({}, state.users.find(item => item.id === state.currentUserId), state.profile || {}, { id: state.currentUserId })
  if (!state.users.some(item => item.id === state.currentUserId)) state.users.push(clone(state.profile))
  state.chapters = state.chapters.map(chapter => Object.assign({
    status: 'ONGOING', statusText: '正在发生', startDate: date.today(), endDate: '', description: '',
    cover: '/assets/images/chapter-summer.webp', theme: '#476354', modules: ['瞬间', '足迹', '目标', '回望'],
    ownerId: state.currentUserId, memberIds: [state.currentUserId], goals: [], createdAt: new Date().toISOString(), endedAt: ''
  }, chapter, {
    statusText: STATUS_TEXT[chapter.status] || chapter.statusText || '正在发生',
    memberIds: Array.from(new Set([...(chapter.memberIds || []), chapter.ownerId || state.currentUserId])),
    goals: Array.isArray(chapter.goals) ? chapter.goals : []
  }))
  state.moments = state.moments.map(moment => Object.assign({
    creatorId: state.currentUserId, type: 'text', status: 'PUBLISHED', content: '', location: '', tags: [], mood: '', favorite: false
  }, moment, { media: normalizeMedia(moment), tags: Array.isArray(moment.tags) ? moment.tags : [] }))
  return state
}

function init() {
  const cached = storageGet(STORAGE_KEY)
  if (cached) {
    const normalized = normalizeV2(cached)
    storageSet(STORAGE_KEY, normalized)
    return normalized
  }
  const legacy = storageGet(LEGACY_KEY)
  const next = normalizeV2(legacy || demo)
  storageSet(STORAGE_KEY, next)
  return next
}

function getState() { return clone(init()) }
function setState(state) {
  const normalized = normalizeV2(state)
  storageSet(STORAGE_KEY, normalized)
  return clone(normalized)
}

function rawChapter(state, id) { return state.chapters.find(item => item.id === id) }
function rawUser(state, id) { return state.users.find(item => item.id === id) || { id, nickname: '共同记录者', avatar: '/assets/images/chapter-summer.webp' } }

function decorateContribution(item, state) {
  return Object.assign({}, item, { creator: clone(rawUser(state, item.creatorId)), image: (item.media || [])[0] ? item.media[0].path : '' })
}

function decorateMoment(item, state) {
  const media = normalizeMedia(item)
  const contributions = state.contributions.filter(one => one.momentId === item.id).map(one => decorateContribution(one, state))
  const created = item.createdAt || new Date().toISOString()
  const chapter = rawChapter(state, item.chapterId)
  const canDelete = item.creatorId === state.currentUserId || (chapter && chapter.ownerId === state.currentUserId)
  return Object.assign({}, item, {
    media,
    image: media[0] ? media[0].path : '',
    imageCount: media.filter(one => one.type === 'image').length,
    creator: clone(rawUser(state, item.creatorId)),
    contributions,
    contributionCount: contributions.length,
    canEdit: item.creatorId === state.currentUserId,
    canDelete,
    dateLabel: date.displayDate(created, true),
    time: date.displayTime(created),
    statusText: item.status === 'DRAFT' ? '待补完' : ''
  })
}

function decorateChapter(chapter, state) {
  if (!chapter) return null
  const moments = state.moments.filter(item => item.chapterId === chapter.id)
  const places = Array.from(new Set(moments.map(item => item.location).filter(Boolean)))
  const goals = chapter.goals || []
  const timing = date.chapterTiming(chapter)
  const members = (chapter.memberIds || []).map(id => clone(rawUser(state, id)))
  return Object.assign({}, chapter, timing, {
    statusText: STATUS_TEXT[chapter.status] || chapter.statusText,
    momentCount: moments.length,
    placeCount: places.length,
    goalsDone: goals.filter(item => item.done).length,
    goalsTotal: goals.length,
    pendingCount: moments.filter(item => item.status === 'DRAFT').length,
    memberCount: members.length,
    members,
    memberPreview: members.slice(0, 4),
    isOwner: chapter.ownerId === state.currentUserId,
    canAddMoment: chapter.status === 'ONGOING' && (chapter.memberIds || []).includes(state.currentUserId),
    dateRange: `${date.displayDate(chapter.startDate)} - ${chapter.endDate ? date.displayDate(chapter.endDate) : '仍在继续'}`
  })
}

function getCurrentUser() { const state = getState(); return clone(rawUser(state, state.currentUserId)) }
function getUser(id) { return clone(rawUser(getState(), id)) }
function getUsers() { return getState().users }
function setCurrentUser(id) {
  const state = getState()
  if (!state.users.some(item => item.id === id)) return null
  state.currentUserId = id
  state.profile = clone(rawUser(state, id))
  setState(state)
  return clone(state.profile)
}

function adoptIdentity(payload) {
  if (!payload || !payload.id) return null
  const state = getState()
  const oldId = state.currentUserId
  const next = Object.assign({}, state.profile || {}, payload)
  state.currentUserId = payload.id
  state.users = state.users.filter(item => item.id !== oldId && item.id !== payload.id)
  state.users.unshift(next)
  state.profile = clone(next)
  state.chapters.forEach(chapter => {
    if (chapter.ownerId === oldId) chapter.ownerId = payload.id
    chapter.memberIds = Array.from(new Set((chapter.memberIds || []).map(id => id === oldId ? payload.id : id)))
    chapter.goals.forEach(goal => { if (goal.createdBy === oldId) goal.createdBy = payload.id })
  })
  state.moments.forEach(moment => { if (moment.creatorId === oldId) moment.creatorId = payload.id })
  state.contributions.forEach(item => { if (item.creatorId === oldId) item.creatorId = payload.id })
  state.invites.forEach(item => { if (item.createdBy === oldId) item.createdBy = payload.id })
  setState(state)
  return clone(next)
}

function saveProfile(payload) {
  const state = getState()
  const current = rawUser(state, state.currentUserId)
  Object.assign(current, payload, { id: state.currentUserId })
  state.profile = clone(current)
  setState(state)
  return clone(current)
}

function getSettings() { return getState().settings }
function updateSettings(payload) {
  const state = getState()
  state.settings = Object.assign({}, state.settings, payload)
  setState(state)
  return clone(state.settings)
}

function getChapters(status) {
  const state = getState()
  return state.chapters.filter(item => (item.memberIds || []).includes(state.currentUserId) && (!status || item.status === status)).map(item => decorateChapter(item, state))
}

function getChapter(id) { const state = getState(); return decorateChapter(rawChapter(state, id), state) }
function getActiveChapter() {
  const state = getState()
  const chapter = rawChapter(state, state.activeChapterId)
  const fallback = state.chapters.find(item => item.status === 'ONGOING' && item.memberIds.includes(state.currentUserId))
  return decorateChapter(chapter && chapter.status === 'ONGOING' && chapter.memberIds.includes(state.currentUserId) ? chapter : fallback, state)
}

function setActiveChapter(id) {
  const state = getState()
  const chapter = rawChapter(state, id)
  if (!chapter || chapter.status !== 'ONGOING' || !chapter.memberIds.includes(state.currentUserId)) return null
  state.activeChapterId = id
  setState(state)
  return decorateChapter(chapter, state)
}

function getMembers(chapterId) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  return chapter ? chapter.memberIds.map(id => clone(rawUser(state, id))) : []
}

function getMoments(chapterId, creatorFilter) {
  const state = getState()
  let moments = state.moments.filter(item => !chapterId || item.chapterId === chapterId)
  if (creatorFilter === 'mine') moments = moments.filter(item => item.creatorId === state.currentUserId)
  else if (creatorFilter && creatorFilter !== 'all') moments = moments.filter(item => item.creatorId === creatorFilter)
  return moments.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(item => decorateMoment(item, state))
}

function getMoment(id) {
  const state = getState()
  const item = state.moments.find(moment => moment.id === id)
  return item ? decorateMoment(item, state) : null
}

function saveMoment(payload) {
  const state = getState()
  const chapter = rawChapter(state, payload.chapterId)
  if (!chapter || !chapter.memberIds.includes(state.currentUserId)) return null
  const index = state.moments.findIndex(item => item.id === payload.id)
  if (index < 0 && chapter.status !== 'ONGOING') return null
  const now = new Date().toISOString()
  let moment
  if (index > -1) {
    const existing = state.moments[index]
    if (existing.creatorId !== state.currentUserId) return null
    moment = Object.assign({}, existing, payload, { creatorId: existing.creatorId, updatedAt: now })
    state.moments[index] = moment
  } else {
    moment = Object.assign({
      id: makeId('moment'), creatorId: state.currentUserId, type: 'text', status: 'PUBLISHED', content: '',
      location: '', latitude: 0, longitude: 0, mood: '', tags: [], media: [], voicePath: '', voiceDuration: 0,
      favorite: false, createdAt: now, updatedAt: now
    }, payload, { creatorId: state.currentUserId })
    moment.id = payload.id || moment.id || makeId('moment')
    state.moments.unshift(moment)
  }
  setState(state)
  return decorateMoment(moment, state)
}

function removeSavedPath(path) {
  if (!path || path.indexOf('/assets/') === 0 || path.indexOf('cloud://') === 0 || typeof wx === 'undefined' || !wx.removeSavedFile) return
  wx.removeSavedFile({ filePath: path, fail() {} })
}

function cleanupMomentMedia(moment) {
  normalizeMedia(moment).forEach(item => removeSavedPath(item.path))
  removeSavedPath(moment.voicePath)
}

function deleteMoment(id) {
  const state = getState()
  const target = state.moments.find(item => item.id === id)
  if (!target) return false
  const chapter = rawChapter(state, target.chapterId)
  if (target.creatorId !== state.currentUserId && (!chapter || chapter.ownerId !== state.currentUserId)) return false
  cleanupMomentMedia(target)
  state.contributions.filter(item => item.momentId === id).forEach(cleanupMomentMedia)
  state.moments = state.moments.filter(item => item.id !== id)
  state.contributions = state.contributions.filter(item => item.momentId !== id)
  setState(state)
  return true
}

function toggleFavorite(id) {
  const state = getState()
  const item = state.moments.find(moment => moment.id === id)
  if (!item) return null
  item.favorite = !item.favorite
  setState(state)
  return decorateMoment(item, state)
}

function saveChapter(payload) {
  const state = getState()
  const index = state.chapters.findIndex(item => item.id === payload.id)
  let chapter
  if (index > -1) {
    chapter = state.chapters[index]
    if (chapter.ownerId !== state.currentUserId) return null
    chapter = Object.assign({}, chapter, payload, { ownerId: chapter.ownerId, memberIds: chapter.memberIds })
    state.chapters[index] = chapter
  } else {
    chapter = Object.assign({
      id: makeId('chapter'), englishTitle: 'LIFE CHAPTER', status: 'ONGOING', statusText: '正在发生',
      startDate: date.today(), endDate: '', description: '这一章的故事，正在慢慢展开。',
      cover: '/assets/images/chapter-summer.webp', theme: '#476354', modules: ['瞬间', '足迹', '目标', '回望'],
      ownerId: state.currentUserId, memberIds: [state.currentUserId], goals: [], createdAt: new Date().toISOString(), endedAt: ''
    }, payload, { ownerId: state.currentUserId, memberIds: [state.currentUserId] })
    chapter.id = payload.id || chapter.id || makeId('chapter')
    state.chapters.unshift(chapter)
  }
  if (chapter.status === 'ONGOING') state.activeChapterId = chapter.id
  setState(state)
  return decorateChapter(chapter, state)
}

function saveGoal(chapterId, payload) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  if (!chapter || chapter.ownerId !== state.currentUserId) return null
  const index = chapter.goals.findIndex(item => item.id === payload.id)
  let goal
  if (index > -1) {
    goal = Object.assign({}, chapter.goals[index], payload)
    chapter.goals[index] = goal
  } else {
    goal = Object.assign({ id: makeId('goal'), done: false, createdBy: state.currentUserId, completedAt: '' }, payload)
    goal.id = payload.id || goal.id || makeId('goal')
    chapter.goals.push(goal)
  }
  setState(state)
  return clone(goal)
}

function deleteGoal(chapterId, goalId) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  if (!chapter || chapter.ownerId !== state.currentUserId) return false
  chapter.goals = chapter.goals.filter(item => item.id !== goalId)
  setState(state)
  return true
}

function moveGoal(chapterId, goalId, direction) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  if (!chapter || chapter.ownerId !== state.currentUserId) return false
  const index = chapter.goals.findIndex(item => item.id === goalId)
  const target = index + direction
  if (index < 0 || target < 0 || target >= chapter.goals.length) return false
  const temp = chapter.goals[index]
  chapter.goals[index] = chapter.goals[target]
  chapter.goals[target] = temp
  setState(state)
  return true
}

function toggleGoal(chapterId, goalId) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  if (!chapter || chapter.status !== 'ONGOING' || !chapter.memberIds.includes(state.currentUserId)) return null
  const goal = chapter.goals.find(item => item.id === goalId)
  if (!goal) return null
  goal.done = !goal.done
  goal.completedAt = goal.done ? new Date().toISOString() : ''
  setState(state)
  return { chapter: decorateChapter(chapter, state), goal: clone(goal), justCompleted: goal.done }
}

function saveContribution(payload) {
  const state = getState()
  const moment = state.moments.find(item => item.id === payload.momentId)
  const chapter = moment && rawChapter(state, moment.chapterId)
  if (!moment || !chapter || chapter.status !== 'ONGOING' || !chapter.memberIds.includes(state.currentUserId) || moment.creatorId === state.currentUserId) return null
  const item = Object.assign({
    id: makeId('contribution'), chapterId: moment.chapterId, creatorId: state.currentUserId, type: 'text',
    content: '', media: [], voicePath: '', voiceDuration: 0, createdAt: new Date().toISOString()
  }, payload, { chapterId: moment.chapterId, creatorId: state.currentUserId })
  state.contributions.push(item)
  setState(state)
  return decorateContribution(item, state)
}

function deleteContribution(id) {
  const state = getState()
  const item = state.contributions.find(one => one.id === id)
  if (!item || item.creatorId !== state.currentUserId) return false
  cleanupMomentMedia(item)
  state.contributions = state.contributions.filter(one => one.id !== id)
  setState(state)
  return true
}

function createInvite(chapterId, memberId) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  if (!chapter || chapter.ownerId !== state.currentUserId) return null
  const invite = { id: makeId('invite'), code: Math.random().toString(36).slice(2, 10).toUpperCase(), chapterId, memberId: memberId || '', createdBy: state.currentUserId, createdAt: new Date().toISOString(), expiresAt: Date.now() + 7 * 86400000 }
  state.invites.push(invite)
  setState(state)
  return clone(invite)
}

function joinChapter(inviteCode, userPayload) {
  const state = getState()
  const invite = state.invites.find(item => item.code === inviteCode && item.expiresAt > Date.now())
  if (!invite) return null
  let user = state.users.find(item => item.id === state.currentUserId)
  if (userPayload && userPayload.id && userPayload.id !== state.currentUserId) {
    state.currentUserId = userPayload.id
    user = state.users.find(item => item.id === userPayload.id)
    if (!user) { user = clone(userPayload); state.users.push(user) }
  }
  const chapter = rawChapter(state, invite.chapterId)
  if (!chapter) return null
  if (!chapter.memberIds.includes(state.currentUserId)) chapter.memberIds.push(state.currentUserId)
  state.activeChapterId = chapter.id
  state.profile = clone(user || rawUser(state, state.currentUserId))
  setState(state)
  return decorateChapter(chapter, state)
}

function removeMember(chapterId, memberId) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  if (!chapter || memberId === chapter.ownerId) return false
  if (state.currentUserId !== chapter.ownerId && state.currentUserId !== memberId) return false
  chapter.memberIds = chapter.memberIds.filter(id => id !== memberId)
  if (state.activeChapterId === chapterId && memberId === state.currentUserId) state.activeChapterId = ''
  setState(state)
  return true
}

function completeChapter(id, ending) {
  const state = getState()
  const chapter = rawChapter(state, id)
  if (!chapter || chapter.ownerId !== state.currentUserId) return null
  const wasCompleted = chapter.status === 'COMPLETED'
  chapter.status = 'COMPLETED'
  chapter.statusText = '已成章'
  chapter.endedAt = wasCompleted && chapter.endedAt ? chapter.endedAt : new Date().toISOString()
  chapter.endDate = chapter.endDate || date.today()
  chapter.ending = String(ending || chapter.ending || '这一章，写完了。').trim()
  if (state.activeChapterId === id) {
    const next = state.chapters.find(item => item.id !== id && item.status === 'ONGOING' && item.memberIds.includes(state.currentUserId))
    state.activeChapterId = next ? next.id : ''
  }
  setState(state)
  return decorateChapter(chapter, state)
}

function setChapterStatus(id, status) {
  const state = getState()
  const chapter = rawChapter(state, id)
  if (!chapter || chapter.ownerId !== state.currentUserId || !STATUS_TEXT[status]) return null
  chapter.status = status
  chapter.statusText = STATUS_TEXT[status]
  if (status === 'ONGOING') { chapter.endedAt = ''; state.activeChapterId = id }
  if (status !== 'ONGOING' && state.activeChapterId === id) state.activeChapterId = ''
  setState(state)
  return decorateChapter(chapter, state)
}

function setReviewPhotos(chapterId, momentIds) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  if (!chapter || chapter.ownerId !== state.currentUserId) return false
  chapter.reviewPhotoIds = Array.from(new Set(momentIds || [])).slice(0, 3)
  setState(state)
  return true
}

function deleteChapter(id) {
  const state = getState()
  const chapter = rawChapter(state, id)
  if (!chapter || chapter.ownerId !== state.currentUserId) return false
  const momentIds = state.moments.filter(item => item.chapterId === id).map(item => item.id)
  state.moments.filter(item => item.chapterId === id).forEach(cleanupMomentMedia)
  state.contributions.filter(item => momentIds.includes(item.momentId)).forEach(cleanupMomentMedia)
  state.chapters = state.chapters.filter(item => item.id !== id)
  state.moments = state.moments.filter(item => item.chapterId !== id)
  state.contributions = state.contributions.filter(item => !momentIds.includes(item.momentId))
  state.invites = state.invites.filter(item => item.chapterId !== id)
  if (state.activeChapterId === id) state.activeChapterId = ''
  setState(state)
  return true
}

function getReviewData(chapterId) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  if (!chapter) return null
  const moments = state.moments.filter(item => item.chapterId === chapterId).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))).map(item => decorateMoment(item, state))
  const dayCounts = {}
  const tagCounts = {}
  const moodCounts = {}
  const placeSet = new Set()
  moments.forEach(item => {
    const day = date.dateKey(item.createdAt)
    dayCounts[day] = (dayCounts[day] || 0) + 1
    item.tags.forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1 })
    if (item.mood) moodCounts[item.mood] = (moodCounts[item.mood] || 0) + 1
    if (item.location) placeSet.add(item.location)
  })
  const busiestEntry = Object.keys(dayCounts).sort((a, b) => dayCounts[b] - dayCounts[a] || a.localeCompare(b))[0]
  const topTags = Object.keys(tagCounts).map(name => ({ name, count: tagCounts[name] })).sort((a, b) => b.count - a.count).slice(0, 6)
  const moods = Object.keys(moodCounts).map(name => ({ name, count: moodCounts[name] })).sort((a, b) => b.count - a.count)
  const preferredIds = chapter.reviewPhotoIds || []
  const allPhotos = moments.filter(item => item.image)
  const photos = preferredIds.map(id => allPhotos.find(item => item.id === id)).filter(Boolean)
  allPhotos.forEach(item => { if (photos.length < 3 && !photos.some(one => one.id === item.id)) photos.push(item) })
  return {
    chapter: decorateChapter(chapter, state),
    moments,
    firstMoment: moments[0] || null,
    lastMoment: moments[moments.length - 1] || null,
    places: Array.from(placeSet),
    topTags,
    moods,
    photos,
    allPhotos,
    busiestDay: busiestEntry ? { date: date.displayDate(busiestEntry, true), count: dayCounts[busiestEntry] } : null,
    sharedMoments: moments.filter(item => item.contributionCount > 0),
    members: chapter.memberIds.map(id => clone(rawUser(state, id)))
  }
}

function getEchoMoment() {
  const state = getState()
  const currentId = (getActiveChapter() || {}).id
  const candidates = state.moments.filter(item => item.status === 'PUBLISHED' && item.image && item.chapterId !== currentId)
  if (!candidates.length) return null
  return decorateMoment(candidates.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0], state)
}

function search(keyword) {
  const key = String(keyword || '').trim().toLowerCase()
  if (!key) return { chapters: [], moments: [], places: [] }
  const state = getState()
  const visibleIds = new Set(state.chapters.filter(item => (item.memberIds || []).includes(state.currentUserId)).map(item => item.id))
  const chapters = state.chapters.filter(item => visibleIds.has(item.id) && `${item.title}${item.englishTitle}${item.type}${item.description}`.toLowerCase().includes(key)).map(item => decorateChapter(item, state))
  const moments = state.moments.filter(item => visibleIds.has(item.chapterId) && `${item.content}${item.location}${item.mood}${item.tags.join('')}`.toLowerCase().includes(key)).map(item => decorateMoment(item, state))
  const places = Array.from(new Set(state.moments.filter(item => visibleIds.has(item.chapterId)).map(item => item.location).filter(item => item && item.toLowerCase().includes(key))))
  return { chapters, moments, places }
}

function exportChapterSnapshot(chapterId) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  if (!chapter) return null
  const moments = state.moments.filter(item => item.chapterId === chapterId)
  const momentIds = moments.map(item => item.id)
  return clone({
    chapter,
    moments,
    contributions: state.contributions.filter(item => momentIds.includes(item.momentId)),
    users: chapter.memberIds.map(id => rawUser(state, id))
  })
}

function mergeSharedSnapshot(snapshot) {
  if (!snapshot || !snapshot.chapter) return null
  const state = getState()
  const replace = (list, items) => {
    const ids = items.map(item => item.id)
    return list.filter(item => !ids.includes(item.id)).concat(items)
  }
  state.users = replace(state.users, snapshot.users || [])
  state.chapters = replace(state.chapters, [snapshot.chapter])
  const oldMomentIds = state.moments.filter(item => item.chapterId === snapshot.chapter.id).map(item => item.id)
  state.moments = state.moments.filter(item => item.chapterId !== snapshot.chapter.id).concat(snapshot.moments || [])
  state.contributions = state.contributions.filter(item => !oldMomentIds.includes(item.momentId)).concat(snapshot.contributions || [])
  setState(state)
  return getChapter(snapshot.chapter.id)
}

function reset() { return setState(clone(demo)) }

module.exports = {
  init, getState, setState, getCurrentUser, getUser, getUsers, setCurrentUser, adoptIdentity, saveProfile, getSettings, updateSettings,
  getChapters, getChapter, getActiveChapter, setActiveChapter, getMembers, getMoments, getMoment, saveMoment, deleteMoment,
  toggleFavorite, saveChapter, saveGoal, deleteGoal, moveGoal, toggleGoal, saveContribution, deleteContribution,
  createInvite, joinChapter, removeMember, completeChapter, setChapterStatus, setReviewPhotos, deleteChapter,
  getReviewData, getEchoMoment, search, exportChapterSnapshot, mergeSharedSnapshot, reset
}
