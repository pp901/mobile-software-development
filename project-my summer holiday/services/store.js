const demo = require('../data/demo')
const date = require('../utils/date')
const product = require('../constants/product')
const chapterBrowse = require('./chapter-browse')

const STORAGE_KEY = 'ongoing:data:v2'
const LEGACY_KEY = 'ongoing:data:v1'
const STATUS_TEXT = { ONGOING: '进行中', COMPLETED: '已结束', ARCHIVED: '已归档' }
let lastError = ''
let dailyEcho = null
let cachedState = null

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)) }
function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
function storageGet(key) {
  if (typeof wx === 'undefined') return null
  try { return wx.getStorageSync(key) } catch (error) {
    throw new Error('无法读取本地数据，请重启后再试。现有记录未被覆盖。')
  }
}
function storageSet(key, value) {
  if (typeof wx === 'undefined') throw new Error('本地存储不可用')
  try {
    wx.setStorageSync(key, clone(value))
    return true
  } catch (error) {
    throw new Error('未能保存，请检查设备存储空间后重试')
  }
}

function normalizeMedia(moment) {
  if (Array.isArray(moment.media)) return moment.media.reduce((items, item, index) => {
    if (typeof item === 'string' && item) items.push({ id: makeId(`media-${index}`), type: 'image', path: item })
    else if (item && typeof item.path === 'string' && item.path) items.push(Object.assign({ id: makeId(`media-${index}`), type: 'image' }, item))
    return items
  }, [])
  if (moment.image) return [{ id: makeId('media'), type: 'image', path: moment.image }]
  return []
}

function migrate(input) {
  const source = clone(input || demo)
  if (source.schemaVersion >= 2) return source
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
      modules: product.getChapterModules(),
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
      localDateKey: date.momentDateKey(item),
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
  state.version = 3
  state.schemaVersion = 3
  state.editorDrafts = state.editorDrafts || {}
  state.pendingOps = state.pendingOps || []
  state.deletedIds = state.deletedIds || []
  state.momentAccess = state.momentAccess || []
  state.mediaUrls = state.mediaUrls || {}
  state.mediaCache = state.mediaCache || {}
  state.syncIssues = state.syncIssues || {}
  state.users = (Array.isArray(state.users) ? state.users : []).filter(item => item && typeof item === 'object')
  state.chapters = (Array.isArray(state.chapters) ? state.chapters : []).filter(item => item && typeof item === 'object')
  state.moments = (Array.isArray(state.moments) ? state.moments : []).filter(item => item && typeof item === 'object')
  state.contributions = (Array.isArray(state.contributions) ? state.contributions : []).filter(item => item && typeof item === 'object')
  state.invites = (Array.isArray(state.invites) ? state.invites : []).filter(item => item && typeof item === 'object')
  state.settings = Object.assign({ privateMode: true, saveOriginal: true, imageQuality: 'compressed' }, state.settings || {})
  state.currentUserId = state.currentUserId || (state.profile && state.profile.id) || 'user-owner'
  state.profile = Object.assign({}, state.users.find(item => item.id === state.currentUserId), state.profile || {}, { id: state.currentUserId })
  if (!state.users.some(item => item.id === state.currentUserId)) state.users.push(clone(state.profile))
  state.chapters = state.chapters.map(chapter => Object.assign({
    status: 'ONGOING', statusText: '正在发生', startDate: date.today(), endDate: '', description: '',
    cover: '', theme: '#476354', modules: product.getChapterModules(),
    ownerId: state.currentUserId, memberIds: [state.currentUserId], goals: [], createdAt: new Date().toISOString(), endedAt: ''
  }, chapter, {
    statusText: STATUS_TEXT[chapter.status] || chapter.statusText || '正在发生',
    modules: product.getChapterModules(),
    memberIds: Array.from(new Set([...(Array.isArray(chapter.memberIds) ? chapter.memberIds : []), chapter.ownerId || state.currentUserId])),
    goals: Array.isArray(chapter.goals) ? chapter.goals : []
  }))
  state.moments = state.moments.map(moment => Object.assign({
    creatorId: state.currentUserId, type: 'text', status: 'PUBLISHED', content: '', location: '', tags: [], mood: '', favorite: false
  }, moment, {
    media: normalizeMedia(moment),
    content: typeof moment.content === 'string' ? moment.content : '',
    location: typeof moment.location === 'string' ? moment.location : '',
    tags: Array.isArray(moment.tags) ? moment.tags.filter(tag => typeof tag === 'string') : [],
    voicePath: typeof moment.voicePath === 'string' ? moment.voicePath : '',
    voiceDuration: Number.isFinite(moment.voiceDuration) ? Math.max(0, moment.voiceDuration) : 0,
    localDateKey: date.momentDateKey(moment)
  }))
  return state
}

function emptyState() {
  const id = makeId('local')
  return { schemaVersion: 3, currentUserId: id, profile: { id, nickname: '我', avatar: '', bio: '' }, users: [{ id, nickname: '我', avatar: '' }], chapters: [], moments: [], contributions: [], invites: [], activeChapterId: '', settings: { privateMode: true, saveOriginal: false } }
}
function init(reload) {
  if (reload) cachedState = null
  if (cachedState) return clone(cachedState)
  const cached = storageGet(STORAGE_KEY)
  if (cached) {
    if (cached.schemaVersion >= 3) { cachedState = normalizeV2(cached); return clone(cachedState) }
    if (!storageGet('ongoing:backup:before-v3')) storageSet('ongoing:backup:before-v3', cached)
    const normalized = normalizeV2(cached)
    storageSet(STORAGE_KEY, normalized)
    cachedState = normalized
    return clone(cachedState)
  }
  const legacy = storageGet(LEGACY_KEY)
  if (legacy && !storageGet('ongoing:backup:before-v3')) storageSet('ongoing:backup:before-v3', legacy)
  const next = normalizeV2(legacy || emptyState())
  storageSet(STORAGE_KEY, next)
  cachedState = next
  return clone(cachedState)
}

function getState() { return init() }
function setState(state) {
  const normalized = normalizeV2(state)
  storageSet(STORAGE_KEY, normalized)
  cachedState = normalized
  return clone(normalized)
}

function rawChapter(state, id) { return state.chapters.find(item => item.id === id) }
function rawUser(state, id) { return state.users.find(item => item.id === id) || { id, nickname: '共同记录者', avatar: '' } }

function canReadChapter(chapter, state) { return !!chapter && !chapter.accessRevoked && (chapter.memberIds || []).includes(state.currentUserId) }
function canReadMoment(item, state) {
  if (!item || item.accessRevoked) return false
  if (item.status === 'DRAFT') return item.creatorId === state.currentUserId
  if (!item.chapterId) return item.creatorId === state.currentUserId || (item.participantIds || []).includes(state.currentUserId)
  return canReadChapter(rawChapter(state, item.chapterId), state) || (item.participantIds || []).includes(state.currentUserId)
}
function queueOperation(state, action, id, data) {
  const key = action + ':' + id
  if(state.syncIssues)delete state.syncIssues[key]
  state.pendingOps = (state.pendingOps || []).filter(item => item.key !== key)
  state.pendingOps.push({ key, action, id, data: clone(data), revision: makeId('op') })
}
function markDeleted(state, id) { state.deletedIds = Array.from(new Set(state.deletedIds.concat(id))); state.pendingOps = state.pendingOps.filter(op => op.id !== id) }
function contentType(item) { return normalizeMedia(item).length ? 'photo' : item.voicePath ? 'voice' : 'text' }
function hasContent(item) { return !!(String(item.content || '').trim() || normalizeMedia(item).length || item.voicePath) }

function displayPath(path, state) { const cached = state.mediaUrls[path]; return state.mediaCache[path] || (cached && cached.expiresAt > Date.now() ? cached.url : path) }
function displayUser(id,state) { const user = clone(rawUser(state,id)); user.avatar = displayPath(user.avatar,state); return user }
function displayMedia(item,state) { return normalizeMedia(item).map(media => Object.assign({},media,{displayPath:displayPath(media.path,state)})) }
function decorateContribution(item, state) {
  const media = displayMedia(item,state)
  return Object.assign({}, item, {
    creator: displayUser(item.creatorId,state),
    displayVoicePath: displayPath(item.voicePath,state),
    media,
    image: media[0] ? media[0].displayPath || media[0].path : '',
    content: typeof item.content === 'string' ? item.content : '',
    voicePath: typeof item.voicePath === 'string' ? item.voicePath : '',
    voiceDuration: Number.isFinite(item.voiceDuration) ? Math.max(0, item.voiceDuration) : 0,
    dateLabel: date.displayDate(item.createdAt, true) || '日期未知'
  })
}

function decorateMoment(item, state) {
  const media = displayMedia(item,state)
  const contributions = state.contributions.filter(one => one.momentId === item.id).map(one => decorateContribution(one, state))
  const created = item.createdAt
  const localDateKey = date.momentDateKey(item)
  const chapter = rawChapter(state, item.chapterId)
  const canDelete = item.creatorId === state.currentUserId || (chapter && chapter.ownerId === state.currentUserId)
  const participantIds = Array.from(new Set([item.creatorId].concat(contributions.map(one => one.creatorId))))
  return Object.assign({}, item, {
    media,
    image: media[0] ? media[0].displayPath || media[0].path : '',
    imageCount: media.filter(one => one.type === 'image').length,
    creator: displayUser(item.creatorId,state),
    displayVoicePath: displayPath(item.voicePath,state),
    contributions,
    contributionCount: contributions.length,
    participantCount: participantIds.length,
    participantPreview: participantIds.slice(0, 3).map(id => displayUser(id, state)),
    myPerspectiveId: item.creatorId === state.currentUserId ? item.id : (contributions.find(one => one.creatorId === state.currentUserId) || {}).id || '',
    canOrganize: item.creatorId === state.currentUserId && !item.chapterId && !(item.participantIds || []).length && !contributions.length,
    chapterTitle: canReadChapter(chapter, state) ? chapter.title : item.chapterId ? '受邀 Moment' : '暂未归入',
    canContribute: item.status !== 'DRAFT' && canReadMoment(item, state),
    syncState: item.syncState || '',
    type: contentType(item),
    canEdit: item.creatorId === state.currentUserId,
    canDelete,
    localDateKey,
    dateLabel: date.displayDate(localDateKey || created, true) || '日期未知',
    time: date.displayTime(created) || '--:--',
    statusText: item.status === 'DRAFT' ? '草稿' : ''
  })
}

function decorateChapter(chapter, state) {
  if (!chapter) return null
  const moments = state.moments.filter(item => item.chapterId === chapter.id && item.status !== 'DRAFT' && canReadMoment(item, state))
  const places = Array.from(new Set(moments.map(item => item.location).filter(Boolean)))
  const recordedDays = Array.from(new Set(moments.map(item => date.momentDateKey(item)).filter(Boolean)))
  const goals = chapter.goals || []
  const timing = date.chapterTiming(chapter)
  const members = (chapter.memberIds || []).map(id => displayUser(id,state))
  return Object.assign({}, chapter, timing, {
    statusText: STATUS_TEXT[chapter.status] || chapter.statusText,
    displayCover: displayPath(chapter.cover,state),
    momentCount: moments.length,
    recordedDayCount: recordedDays.length,
    placeCount: places.length,
    goalsDone: goals.filter(item => item.done).length,
    goalsTotal: goals.length,
    pendingCount: moments.filter(item => item.status === 'DRAFT').length,
    memberCount: members.length,
    members,
    memberPreview: members.slice(0, 4),
    isOwner: chapter.ownerId === state.currentUserId,
    canAddMoment: (chapter.memberIds || []).includes(state.currentUserId),
    dateRange: `${String(chapter.startDate || '').replace(/-/g, '.')} — ${chapter.endDate ? String(chapter.endDate).replace(/-/g, '.') : chapter.status === 'ONGOING' ? '至今' : '结束日期未记录'}`,
    elapsedLabel: chapter.startDate > date.today() ? '即将开始' : chapter.status === 'ONGOING' ? `已走过 ${date.daysBetween(chapter.startDate, date.today())} 天` : chapter.endDate ? `一起走过 ${timing.dayTotal} 天` : '这一段，已成章'
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
  state.moments.forEach(item => { item.participantIds = (item.participantIds || []).map(id => id === oldId ? payload.id : id) })
  const rewrite = value => { if (Array.isArray(value)) return value.map(rewrite); if (value && typeof value === 'object') return Object.keys(value).reduce((result,key) => { result[key] = rewrite(value[key]); return result }, {}); return value === oldId ? payload.id : value }
  state.pendingOps = rewrite(state.pendingOps)
  Object.keys(state.editorDrafts).forEach(key => { if (key.startsWith(oldId + ':')) { state.editorDrafts[payload.id + key.slice(oldId.length)] = state.editorDrafts[key]; delete state.editorDrafts[key] } })
  setState(state)
  return clone(next)
}

// A verified WeChat account owns its own cache. Never reassign another account's records.
function activateCloudIdentity(user) {
  const current = getState()
  if (current.currentUserId === user.id) return getCurrentUser()
  if (/^(local-|user-)/.test(current.currentUserId)) {
    return adoptIdentity(Object.assign({}, user, { avatar: current.profile.avatar || user.avatar || '' }))
  }
  storageSet('ongoing:account:' + current.currentUserId, current)
  const saved = storageGet('ongoing:account:' + user.id)
  const next = saved || emptyState()
  if (!saved) {
    next.currentUserId = user.id
    next.profile = clone(user)
    next.users = [clone(user)]
  }
  if (next.currentUserId !== user.id) throw new Error('账号缓存不一致，原记录已保留')
  setState(next)
  dailyEcho = null
  return getCurrentUser()
}

function saveProfile(payload) {
  const state = getState()
  const current = rawUser(state, state.currentUserId)
  Object.assign(current, payload, { id: state.currentUserId })
  state.profile = clone(current)
  queueOperation(state, 'ensureUser', current.id, { update: true, profile: clone(current) })
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
  return state.chapters.filter(item => canReadChapter(item, state) && (!status || item.status === status)).map(item => decorateChapter(item, state))
}

function getChapter(id) { const state = getState(); const item = rawChapter(state, id); return canReadChapter(item, state) ? decorateChapter(item, state) : null }
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
  return canReadChapter(chapter, state) ? chapter.memberIds.map(id => clone(rawUser(state, id))) : []
}

function getMoments(chapterId, creatorFilter) {
  const state = getState()
  let moments = state.moments.filter(item => canReadMoment(item, state) && item.status !== 'DRAFT' && (!chapterId || item.chapterId === chapterId))
  if (creatorFilter === 'mine') moments = moments.filter(item => item.creatorId === state.currentUserId || state.contributions.some(one => one.momentId === item.id && one.creatorId === state.currentUserId))
  else if (creatorFilter && creatorFilter !== 'all') moments = moments.filter(item => item.creatorId === creatorFilter)
  return moments.sort(chapterBrowse.compareMomentsDesc).map(item => decorateMoment(item, state))
}

function getTimelineMoments(chapterId, creatorFilter) {
  return getMoments(chapterId, creatorFilter).sort(chapterBrowse.compareMomentsAsc)
}

function getCalendarData(chapterId, monthKey, selectedDateKey) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  if (!canReadChapter(chapter, state)) return null
  const moments = state.moments.filter(item => item.chapterId === chapterId && item.status !== 'DRAFT').map(item => decorateMoment(item, state))
  return chapterBrowse.buildCalendarData(chapter, moments, { monthKey, selectedDateKey })
}

function getMapData(chapterId, selectedPlaceId) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  if (!canReadChapter(chapter, state)) return null
  const moments = state.moments.filter(item => item.chapterId === chapterId && item.status !== 'DRAFT').map(item => decorateMoment(item, state))
  return chapterBrowse.buildMapData(moments, selectedPlaceId)
}

function getMoment(id) {
  const state = getState()
  const item = state.moments.find(moment => moment.id === id)
  return canReadMoment(item, state) ? decorateMoment(item, state) : null
}

function saveMoment(payload) {
  const state = getState()
  const index = state.moments.findIndex(item => item.id === payload.id)
  const existing = index >= 0 ? state.moments[index] : null
  if (existing && (existing.creatorId !== state.currentUserId || !canReadMoment(existing, state))) return null
  const chapterId = payload.chapterId === undefined ? (existing && existing.chapterId || '') : payload.chapterId
  if (chapterId && !canReadChapter(rawChapter(state, chapterId), state)) return null
  // Moving a shared event would change other people's access. Keep it in place.
  if (existing && existing.chapterId !== chapterId && ((existing.participantIds || []).length || state.contributions.some(one => one.momentId === existing.id))) return null
  const now = new Date().toISOString()
  const moment = Object.assign({ id: makeId('moment'), status: 'PUBLISHED', content: '', media: [], voicePath: '', voiceDuration: 0, location: '', tags: [], mood: '', favorite: false, createdAt: now }, existing || {}, payload, { chapterId, creatorId: state.currentUserId, updatedAt: now, syncState: 'pending' })
  moment.id = (existing && existing.id) || payload.id || makeId('moment')
  moment.type = contentType(moment)
  moment.localDateKey = date.isDateKey(payload.localDateKey) ? payload.localDateKey : (existing && existing.localDateKey || date.dateKey(moment.createdAt))
  if (moment.status !== 'DRAFT' && !hasContent(moment)) return null
  if (index >= 0) state.moments[index] = moment
  else state.moments.unshift(moment)
  if (moment.status !== 'DRAFT') queueOperation(state, 'saveMoment', moment.id, { moment })
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
  const removed = [target].concat(state.contributions.filter(item => item.momentId === id))
  removed.forEach(item => markDeleted(state, item.id))
  if (target.status !== 'DRAFT') queueOperation(state, 'deleteMoment', id, { momentId: id })
  state.moments = state.moments.filter(item => item.id !== id)
  state.contributions = state.contributions.filter(item => item.momentId !== id)
  setState(state)
  removed.forEach(cleanupMomentMedia)
  return true
}

function toggleFavorite(id) {
  const state = getState()
  const item = state.moments.find(moment => moment.id === id)
  if (!canReadMoment(item, state)) return null
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
    chapter = Object.assign({}, chapter, payload, {
      modules: product.getChapterModules(),
      ownerId: chapter.ownerId,
      memberIds: chapter.memberIds
    })
    state.chapters[index] = chapter
  } else {
    chapter = Object.assign({
      id: makeId('chapter'), englishTitle: 'LIFE CHAPTER', status: 'ONGOING', statusText: '正在发生',
      startDate: date.today(), endDate: '', description: '',
      cover: '', theme: '#476354', modules: product.getChapterModules(),
      ownerId: state.currentUserId, memberIds: [state.currentUserId], goals: [], createdAt: new Date().toISOString(), endedAt: ''
    }, payload, { modules: product.getChapterModules(), ownerId: state.currentUserId, memberIds: [state.currentUserId] })
    chapter.id = payload.id || chapter.id || makeId('chapter')
    state.chapters.unshift(chapter)
  }
  if (chapter.status === 'ONGOING') state.activeChapterId = chapter.id
  queueOperation(state, 'saveChapter', chapter.id, { chapter })
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
  if (!canReadMoment(moment, state) || moment.status === 'DRAFT') return null
  const index = state.contributions.findIndex(one => one.id === payload.id)
  const existing = index >= 0 ? state.contributions[index] : null
  if (existing && (existing.creatorId !== state.currentUserId || existing.momentId !== moment.id)) return null
  const item = Object.assign({ id: makeId('perspective'), content: '', media: [], voicePath: '', voiceDuration: 0, createdAt: new Date().toISOString() }, existing || {}, payload, { chapterId: moment.chapterId, creatorId: state.currentUserId, updatedAt: new Date().toISOString(), syncState: 'pending' })
  item.id = (existing && existing.id) || payload.id || makeId('perspective')
  item.type = contentType(item)
  if (!hasContent(item)) return null
  if (index >= 0) state.contributions[index] = item
  else state.contributions.push(item)
  queueOperation(state, 'saveContribution', item.id, { contribution: item })
  setState(state)
  return decorateContribution(item, state)
}

function deleteContribution(id) {
  const state = getState()
  const item = state.contributions.find(one => one.id === id)
  if (!item || item.creatorId !== state.currentUserId) return false
  markDeleted(state, id)
  queueOperation(state, 'deleteContribution', id, { contributionId: id })
  state.contributions = state.contributions.filter(one => one.id !== id)
  setState(state)
  cleanupMomentMedia(item)
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
  chapter.endDate = wasCompleted && chapter.endDate ? chapter.endDate : date.today()
  chapter.ending = String(ending === undefined ? chapter.ending || '' : ending).trim()
  if (state.activeChapterId === id) {
    const next = state.chapters.find(item => item.id !== id && item.status === 'ONGOING' && item.memberIds.includes(state.currentUserId))
    state.activeChapterId = next ? next.id : ''
  }
  queueOperation(state, 'saveChapter', chapter.id, { chapter })
  setState(state)
  return decorateChapter(chapter, state)
}

function setChapterStatus(id, status) {
  const state = getState()
  const chapter = rawChapter(state, id)
  if (!chapter || chapter.ownerId !== state.currentUserId || !STATUS_TEXT[status]) return null
  chapter.status = status
  chapter.statusText = STATUS_TEXT[status]
  if (status === 'ONGOING') { chapter.endedAt = ''; chapter.endDate = ''; state.activeChapterId = id }
  if (status !== 'ONGOING' && state.activeChapterId === id) state.activeChapterId = ''
  queueOperation(state, 'saveChapter', id, { chapter })
  setState(state)
  return decorateChapter(chapter, state)
}

function setReviewPhotos(chapterId, momentIds) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  if (!chapter || chapter.ownerId !== state.currentUserId) return false
  chapter.reviewPhotoIds = Array.from(new Set(momentIds || [])).slice(0, 3)
  chapter.updatedAt = new Date().toISOString()
  chapter.syncState = 'pending'
  queueOperation(state, 'saveChapter', chapter.id, { chapter })
  setState(state)
  return true
}

function deleteChapter(id) {
  const state = getState()
  const chapter = rawChapter(state, id)
  if (!chapter || chapter.ownerId !== state.currentUserId) return false
  const momentIds = state.moments.filter(item => item.chapterId === id).map(item => item.id)
  const removed = state.moments.filter(item => item.chapterId === id).concat(state.contributions.filter(item => momentIds.includes(item.momentId)))
  removed.concat([chapter]).forEach(item => markDeleted(state, item.id))
  queueOperation(state, 'deleteChapter', id, { chapterId: id })
  state.chapters = state.chapters.filter(item => item.id !== id)
  state.moments = state.moments.filter(item => item.chapterId !== id)
  state.contributions = state.contributions.filter(item => !momentIds.includes(item.momentId))
  state.invites = state.invites.filter(item => item.chapterId !== id)
  if (state.activeChapterId === id) state.activeChapterId = ''
  setState(state)
  removed.forEach(cleanupMomentMedia)
  return true
}

function getReviewData(chapterId) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  if (!canReadChapter(chapter, state)) return null
  const moments = state.moments.filter(item => item.chapterId === chapterId && item.status !== 'DRAFT').sort(chapterBrowse.compareMomentsAsc).map(item => decorateMoment(item, state))
  const dayCounts = {}
  const tagCounts = {}
  const moodCounts = {}
  const placeSet = new Set()
  moments.forEach(item => {
    const day = date.momentDateKey(item)
    if (day) dayCounts[day] = (dayCounts[day] || 0) + 1
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

// Select by the recorded natural day, never by upload time or Chapter selection.
function getEchoMoment(todayKey = date.today()) {
  if (!date.isDateKey(todayKey)) return null
  const state = getState()
  const dayNumber = key => { const parts = key.split('-').map(Number); return Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000 }
  const moments = state.moments.filter(item => canReadMoment(item, state) && item.status === 'PUBLISHED' && hasContent(item) && date.isDateKey(date.momentDateKey(item)))
  const firstInChapter = {}
  moments.slice().sort((a, b) => date.momentDateKey(a).localeCompare(date.momentDateKey(b)) || chapterBrowse.compareMomentsAsc(a, b)).forEach(item => {
    if (item.chapterId && !firstInChapter[item.chapterId]) firstInChapter[item.chapterId] = item.id
  })
  const candidates = []
  moments.forEach(item => {
    const key = date.momentDateKey(item)
    const age = dayNumber(todayKey) - dayNumber(key)
    if (age < 27) return
    const years = Number(todayKey.slice(0, 4)) - Number(key.slice(0, 4))
    if (years > 0 && key.slice(5) === todayKey.slice(5)) {
      candidates.push({ item, reason: 'anniversary', label: years === 1 ? '一年前的今天' : `${years} 年前的今天`, rank: 0, distance: years, age })
      return
    }
    const interval = [{ days: 30, tolerance: 3, label: '一个月前' }, { days: 90, tolerance: 5, label: '三个月前' }, { days: 180, tolerance: 7, label: '半年前' }]
      .find(one => Math.abs(age - one.days) <= one.tolerance)
    if (interval) {
      candidates.push({ item, reason: `days_${interval.days}`, label: (age === interval.days ? '' : '大约') + interval.label, rank: 1, distance: Math.abs(age - interval.days), age })
      return
    }
    const chapter = rawChapter(state, item.chapterId)
    if (age >= 30 && firstInChapter[item.chapterId] === item.id && canReadChapter(chapter, state)) {
      candidates.push({ item, reason: 'chapter_first', label: `这是「${chapter.title}」的第一刻`, rank: 2, distance: -age, age })
    }
  })
  const cacheKey = state.currentUserId + ':' + todayKey
  // Keep today's selection through refresh/sync; removal or lost access invalidates it.
  const cached = dailyEcho && dailyEcho.key === cacheKey && candidates.find(one => one.item.id === dailyEcho.id)
  const selected = cached || candidates.sort((a, b) => a.rank - b.rank || a.distance - b.distance || b.age - a.age || a.item.id.localeCompare(b.item.id))[0]
  if (!selected) { dailyEcho = null; return null }
  dailyEcho = { key: cacheKey, id: selected.item.id }
  const moment = decorateMoment(selected.item, state)
  const includesMe = moment.participantPreview.some(user => user.id === state.currentUserId) || selected.item.creatorId === state.currentUserId || moment.contributions.some(one => one.creatorId === state.currentUserId)
  const who = includesMe ? moment.participantCount > 1 ? '你和 TA 一起' : '你' : moment.participantCount > 1 ? '他们一起' : moment.creator.nickname
  return Object.assign(moment, {
    reason: selected.reason, label: selected.label, ageDays: selected.age,
    echoDate: date.momentDateKey(selected.item).replace(/-/g, '.'),
    returnDate: todayKey.replace(/-/g, '.'),
    explanation: `${who}${moment.location ? '在' + moment.location : ''}留下了这一刻。`
  })
}

function getLifeStats() {
  const state = getState()
  const visible = state.moments.filter(item => canReadMoment(item, state) && item.status === 'PUBLISHED')
  const visibleIds = new Set(visible.map(item => item.id))
  const contributions = state.contributions.filter(item => item.creatorId === state.currentUserId && visibleIds.has(item.momentId))
  const contributedIds = new Set(contributions.map(item => item.momentId))
  const own = visible.filter(item => item.creatorId === state.currentUserId)
  const mine = visible.filter(item => item.creatorId === state.currentUserId || contributedIds.has(item.id))
  const days = Array.from(new Set(own.concat(contributions).map(date.momentDateKey).filter(Boolean))).sort()
  return {
    momentCount: mine.length,
    recordedDayCount: days.length,
    chapterCount: state.chapters.filter(item => canReadChapter(item, state)).length,
    sharedMomentCount: mine.filter(item => new Set([item.creatorId].concat(state.contributions.filter(one => one.momentId === item.id).map(one => one.creatorId))).size > 1).length,
    firstDate: days[0] ? days[0].replace(/-/g, '.') : '',
    todayMomentCount: own.filter(item => date.momentDateKey(item) === date.today()).length
  }
}

function search(keyword) {
  const key = String(keyword || '').trim().toLowerCase()
  if (!key) return { chapters: [], moments: [], places: [] }
  const state = getState()
  const visibleIds = new Set(state.chapters.filter(item => canReadChapter(item, state)).map(item => item.id))
  const chapters = state.chapters.filter(item => visibleIds.has(item.id) && `${item.title}${item.englishTitle}${item.type}${item.description}`.toLowerCase().includes(key)).map(item => decorateChapter(item, state))
  const moments = state.moments.filter(item => canReadMoment(item, state) && item.status !== 'DRAFT' && `${item.content}${item.location}${item.mood}${item.tags.join('')}${state.contributions.filter(one => one.momentId === item.id).map(one => one.content).join(' ')}`.toLowerCase().includes(key)).map(item => decorateMoment(item, state))
  const places = Array.from(new Set(state.moments.filter(item => canReadMoment(item, state) && item.status !== 'DRAFT').map(item => item.location).filter(item => item && item.toLowerCase().includes(key))))
  return { chapters, moments, places }
}

function exportChapterSnapshot(chapterId) {
  const state = getState()
  const chapter = rawChapter(state, chapterId)
  if (!chapter) return null
  const moments = state.moments.filter(item => item.chapterId === chapterId && item.status !== 'DRAFT')
  const momentIds = moments.map(item => item.id)
  return clone({
    chapter,
    moments,
    contributions: state.contributions.filter(item => momentIds.includes(item.momentId)),
    users: chapter.memberIds.map(id => rawUser(state, id))
  })
}

function mergeSharedSnapshot(snapshot) {
  if (!snapshot || (!snapshot.chapter && !snapshot.moment)) return null
  const state = getState()
  const merge = (local, remote) => {
    const result = local.slice()
    ;(remote || []).forEach(item => {
      if (state.deletedIds.includes(item.id)) return
      const index = result.findIndex(one => one.id === item.id)
      if (index >= 0 && (result[index].syncState === 'pending' || result[index].status === 'DRAFT')) return
      const value = Object.assign({}, item, { syncState: 'synced', accessRevoked: false }); if (index >= 0 && result[index].favorite !== undefined) value.favorite = result[index].favorite
      if (index < 0) result.push(value)
      else result[index] = value
    })
    return result
  }
  state.mediaUrls = Object.assign(state.mediaUrls,snapshot.mediaUrls||{})
  state.users = merge(state.users, snapshot.users)
  if (snapshot.chapter) {
    const pending = state.pendingOps.some(op => op.action === 'saveChapter' && op.id === snapshot.chapter.id)
    if (!pending) state.chapters = merge(state.chapters, [Object.assign({},snapshot.chapter,{accessRevoked:false})])
  }
  state.moments = merge(state.moments, snapshot.moments || (snapshot.moment ? [snapshot.moment] : []))
  state.contributions = merge(state.contributions, snapshot.contributions)
  ;(snapshot.deletedIds || []).forEach(id => {
    state.chapters = state.chapters.filter(item => item.id !== id || state.pendingOps.some(op => op.id === id))
    state.moments = state.moments.filter(item => item.id !== id || item.syncState === 'pending')
    state.contributions = state.contributions.filter(item => item.id !== id || item.syncState === 'pending')
  })
  setState(state)
  return snapshot.chapter ? getChapter(snapshot.chapter.id) : getMoment(snapshot.moment.id)
}

function reset() { return setState(clone(demo)) }

module.exports = {
  init, getState, setState, getCurrentUser, getUser, getUsers, setCurrentUser, adoptIdentity, activateCloudIdentity, saveProfile, getSettings, updateSettings,
  getChapters, getChapter, getActiveChapter, setActiveChapter, getMembers, getMoments, getTimelineMoments, getCalendarData, getMapData,
  getMoment, saveMoment, deleteMoment,
  toggleFavorite, saveChapter, saveGoal, deleteGoal, moveGoal, toggleGoal, saveContribution, deleteContribution,
  createInvite, joinChapter, removeMember, completeChapter, setChapterStatus, setReviewPhotos, deleteChapter,
  getReviewData, getEchoMoment, getLifeStats, search, exportChapterSnapshot, mergeSharedSnapshot, reset
}

function getDrafts() { const state = getState(); return state.moments.filter(item => item.creatorId === state.currentUserId && item.status === 'DRAFT').map(item => decorateMoment(item, state)) }
function saveEditorDraft(key, value) { const state = getState(); if (value) state.editorDrafts[key] = Object.assign({}, value, { savedAt: new Date().toISOString() }); else delete state.editorDrafts[key]; setState(state); return true }
function getEditorDraft(key) { return clone(getState().editorDrafts[key] || null) }
function getWritingDrafts() {
  const state = getState()
  const prefix = state.currentUserId + ':'
  return Object.keys(state.editorDrafts).filter(key => key.startsWith(prefix)).map(key => {
    const draft = state.editorDrafts[key]
    const scope = key.slice(prefix.length)
    let url = '/pages/moment/editor/index'
    if (scope.startsWith('moment:')) {
      const moment = getMoment(scope.slice(7))
      if (!moment || !moment.canEdit) return null
      url += '?id=' + moment.id
    } else if (scope.startsWith('perspective-new:')) {
      const moment = getMoment(scope.slice(16))
      if (!moment || !moment.canContribute) return null
      url += '?momentId=' + moment.id
    } else if (scope.startsWith('perspective:')) {
      const item = state.contributions.find(one => one.id === scope.slice(12) && one.creatorId === state.currentUserId)
      if (!item || !getMoment(item.momentId)) return null
      url += '?momentId=' + item.momentId + '&contributionId=' + item.id
    }
    return hasContent(draft) ? { id: key, content: draft.content || (draft.voicePath ? '还没发布的声音' : '还没发布的照片'), dateLabel: date.displayDate(draft.savedAt), url } : null
  }).filter(Boolean)
}
function getPerspectives(id) {
  const moment = getMoment(id)
  if (!moment) return []
  return [Object.assign({}, moment, { isOriginal: true })].concat(moment.contributions.map(item => Object.assign({}, item, { canEdit: item.creatorId === getState().currentUserId })))
}
function getPendingOps() { return getState().pendingOps }
function acknowledgeOperation(operation, remote) {
  const state = getState()
  const current = state.pendingOps.find(item => item.key === operation.key)
  if (!current) return false
  const source = operation.data.moment || operation.data.contribution || operation.data.chapter || {}
  if (remote) {
    ;(remote.media||[]).forEach(media=>{const local=(source.media||[]).find(item=>item.id===media.id);if(local && local.path && !/^(cloud:|https?:)/.test(local.path))state.mediaCache[media.path]=local.path})
    if(remote.voicePath && source.voicePath && !/^(cloud:|https?:)/.test(source.voicePath))state.mediaCache[remote.voicePath]=source.voicePath
    if(remote.cover && source.cover && !/^(cloud:|https?:)/.test(source.cover))state.mediaCache[remote.cover]=source.cover
  }
  if (current.revision !== operation.revision) {
    const field = operation.action === 'saveMoment' ? 'moment' : operation.action === 'saveContribution' ? 'contribution' : operation.action === 'saveChapter' ? 'chapter' : ''
    if (field && remote) { current.data[field].serverVersion = remote.serverVersion; const list = field === 'chapter' ? state.chapters : field === 'moment' ? state.moments : state.contributions; const item = list.find(one => one.id === operation.id); if (item) item.serverVersion = remote.serverVersion; setState(state) }
    return false
  }
  state.pendingOps = state.pendingOps.filter(item => item.revision !== operation.revision)
  delete state.syncIssues[operation.key]
  if (operation.action === 'ensureUser' && remote) {
    const localAvatar = operation.data.profile && operation.data.profile.avatar
    if (remote.avatar && localAvatar && !/^(cloud:|https?:)/.test(localAvatar)) state.mediaCache[remote.avatar] = localAvatar
    const user = rawUser(state, state.currentUserId)
    Object.assign(user, remote)
    state.profile = clone(user)
  }
  if (operation.action === 'saveChapter' && remote) { const chapter = state.chapters.find(item => item.id === operation.id); if (chapter) Object.assign(chapter, remote, { syncState: 'synced' }) }
  const list = operation.action === 'saveMoment' ? state.moments : operation.action === 'saveContribution' ? state.contributions : null
  if (list) { const item = list.find(one => one.id === operation.id); if (item) Object.assign(item, remote || {}, { syncState: 'synced' }) }
  setState(state)
  return true
}
function revokeAccess(kind, id) {
  const state = getState()
  const list = kind === 'chapter' ? state.chapters : state.moments
  const target = list.find(item => item.id === id)
  if (target) target.accessRevoked = true
  if (kind === 'chapter') { if (target) target.memberIds = target.memberIds.filter(userId => userId !== state.currentUserId); state.moments.filter(item => item.chapterId === id).forEach(item => { item.accessRevoked = !(item.participantIds||[]).includes(state.currentUserId) }) }
  setState(state)
}
function queueLocalContent() {
  const state = getState()
  let changed = false
  const enqueue = (action, item, field) => { changed = true; if (!state.pendingOps.some(op => op.action === action && op.id === item.id)) queueOperation(state, action, item.id, { [field]: item }) }
  state.chapters.filter(item => item.ownerId === state.currentUserId && !item.syncState && !item.accessRevoked).forEach(item => { item.syncState = 'pending'; enqueue('saveChapter',item,'chapter') })
  state.moments.filter(item => item.creatorId === state.currentUserId && item.status !== 'DRAFT' && !item.syncState && !item.accessRevoked).forEach(item => { item.syncState = 'pending'; enqueue('saveMoment',item,'moment') })
  state.contributions.filter(item => item.creatorId === state.currentUserId && !item.syncState).forEach(item => { item.syncState = 'pending'; enqueue('saveContribution',item,'contribution') })
  if (changed) setState(state)
  return true
}
Object.assign(module.exports, { revokeAccess, queueLocalContent })
function setSyncIssue(op, error) { const state = getState(); if(state.pendingOps.some(item=>item.revision===op.revision))state.syncIssues[op.key]={key:op.key,revision:op.revision,code:error.code||'UPLOAD_FAILED',message:error.message};setState(state);return true }
function getSyncIssues() { const state=getState();return Object.values(state.syncIssues).filter(issue=>state.pendingOps.some(op=>op.key===issue.key)) }
function resolveConflict(op, remote, useLocal) {
 const state=getState();const current=state.pendingOps.find(item=>item.key===op.key);if(!current||current.revision!==op.revision)return false
 const field=op.action==='saveChapter'?'chapter':op.action==='saveMoment'?'moment':'contribution'
 const list=field==='chapter'?state.chapters:field==='moment'?state.moments:state.contributions
 const index=list.findIndex(item=>item.id===op.id);if(index<0)return false
 if(useLocal){list[index].serverVersion=remote.serverVersion;queueOperation(state,op.action,op.id,{[field]:list[index]})}
 else{list[index]=Object.assign({},remote,{syncState:'synced',favorite:list[index].favorite||false});state.pendingOps=state.pendingOps.filter(item=>item.key!==op.key)}
 delete state.syncIssues[op.key];setState(state);return true
}
Object.assign(module.exports,{setSyncIssue,getSyncIssues,resolveConflict})
function getLastError() { return lastError }
Object.assign(module.exports, { getDrafts, getWritingDrafts, saveEditorDraft, getEditorDraft, getPerspectives, getPendingOps, acknowledgeOperation, getLastError, hasContent })
const writes = ['saveMoment','saveChapter','saveContribution','deleteMoment','deleteChapter','deleteContribution','saveEditorDraft','completeChapter','setChapterStatus','saveProfile','updateSettings','removeMember','toggleFavorite','acknowledgeOperation','revokeAccess','queueLocalContent','adoptIdentity','activateCloudIdentity','setSyncIssue','resolveConflict']
writes.forEach(name => { const action = module.exports[name]; module.exports[name] = function () { lastError = ''; try { return action.apply(null, arguments) } catch (error) { lastError = error.message; return null } } })
