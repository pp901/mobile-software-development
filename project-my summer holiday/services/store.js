const demo = require('../data/demo')
const STORAGE_KEY = 'ongoing:data:v1'

function clone(value) { return JSON.parse(JSON.stringify(value)) }

function init() {
  const cached = wx.getStorageSync(STORAGE_KEY)
  if (!cached || cached.version !== demo.version) wx.setStorageSync(STORAGE_KEY, clone(demo))
}

function getState() { init(); return clone(wx.getStorageSync(STORAGE_KEY)) }
function setState(state) { wx.setStorageSync(STORAGE_KEY, clone(state)); return clone(state) }
function getChapters(status) {
  const chapters = getState().chapters
  return status ? chapters.filter(item => item.status === status) : chapters
}
function getChapter(id) { return getState().chapters.find(item => item.id === id) }
function getActiveChapter() {
  const state = getState()
  return state.chapters.find(item => item.id === state.activeChapterId && item.status === 'ONGOING') || state.chapters.find(item => item.status === 'ONGOING') || null
}
function setActiveChapter(id) { const state = getState(); state.activeChapterId = id; return setState(state) }
function getMoments(chapterId) {
  return getState().moments
    .filter(item => !chapterId || item.chapterId === chapterId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
function getMoment(id) { return getState().moments.find(item => item.id === id) }

function saveMoment(payload) {
  const state = getState()
  const existingIndex = state.moments.findIndex(item => item.id === payload.id)
  let moment
  if (existingIndex > -1) {
    moment = Object.assign({}, state.moments[existingIndex], payload)
    state.moments[existingIndex] = moment
  } else {
    moment = Object.assign({
      id: `moment-${Date.now()}`, createdAt: new Date().toISOString(), favorite: false,
      tags: [], imageCount: payload.image ? 1 : 0
    }, payload)
    if (!moment.id) moment.id = `moment-${Date.now()}`
    state.moments.unshift(moment)
    const chapter = state.chapters.find(item => item.id === moment.chapterId)
    if (chapter) chapter.momentCount += 1
  }
  setState(state)
  return moment
}

function deleteMoment(id) {
  const state = getState()
  const target = state.moments.find(item => item.id === id)
  state.moments = state.moments.filter(item => item.id !== id)
  if (target) {
    const chapter = state.chapters.find(item => item.id === target.chapterId)
    if (chapter) chapter.momentCount = Math.max(0, chapter.momentCount - 1)
  }
  return setState(state)
}

function toggleFavorite(id) {
  const state = getState()
  const item = state.moments.find(moment => moment.id === id)
  if (item) item.favorite = !item.favorite
  setState(state)
  return item
}

function saveChapter(payload) {
  const state = getState()
  const existingIndex = state.chapters.findIndex(item => item.id === payload.id)
  let chapter
  if (existingIndex > -1) {
    chapter = Object.assign({}, state.chapters[existingIndex], payload)
    state.chapters[existingIndex] = chapter
  } else {
    chapter = Object.assign({
      id: `chapter-${Date.now()}`, englishTitle: 'NEW CHAPTER', status: 'ONGOING', statusText: '正在发生',
      dayCurrent: 1, dayTotal: 30, progress: 3, momentCount: 0, placeCount: 0, goalsDone: 0,
      goalsTotal: 0, goals: [], modules: ['瞬间', '足迹', '目标', '回望'],
      cover: '/assets/images/chapter-summer.webp'
    }, payload)
    if (!chapter.id) chapter.id = `chapter-${Date.now()}`
    state.chapters.unshift(chapter)
  }
  if (chapter.status === 'ONGOING') state.activeChapterId = chapter.id
  setState(state)
  return chapter
}

function toggleGoal(chapterId, goalId) {
  const state = getState()
  const chapter = state.chapters.find(item => item.id === chapterId)
  if (!chapter) return null
  const goal = chapter.goals.find(item => item.id === goalId)
  if (goal) goal.done = !goal.done
  chapter.goalsDone = chapter.goals.filter(item => item.done).length
  setState(state)
  return chapter
}

function completeChapter(id, ending) {
  const state = getState()
  const chapter = state.chapters.find(item => item.id === id)
  if (chapter) {
    chapter.status = 'COMPLETED'; chapter.statusText = '已成章'; chapter.progress = 100
    chapter.ending = ending || chapter.ending || '谢谢这一章，让我成为了更丰富的自己。'
    if (state.activeChapterId === id) {
      const next = state.chapters.find(item => item.id !== id && item.status === 'ONGOING')
      state.activeChapterId = next ? next.id : ''
    }
  }
  setState(state)
  return chapter
}

function setChapterStatus(id, status) {
  const state = getState()
  const chapter = state.chapters.find(item => item.id === id)
  if (!chapter) return null
  const labels = { ONGOING: '正在发生', COMPLETED: '已成章', ARCHIVED: '已归档' }
  chapter.status = status
  chapter.statusText = labels[status]
  if (status === 'ONGOING') state.activeChapterId = id
  if (status !== 'ONGOING' && state.activeChapterId === id) {
    const next = state.chapters.find(item => item.id !== id && item.status === 'ONGOING')
    state.activeChapterId = next ? next.id : ''
  }
  setState(state)
  return chapter
}

function deleteChapter(id) {
  const state = getState()
  state.chapters = state.chapters.filter(item => item.id !== id)
  state.moments = state.moments.filter(item => item.chapterId !== id)
  if (state.activeChapterId === id) {
    const next = state.chapters.find(item => item.status === 'ONGOING')
    state.activeChapterId = next ? next.id : ''
  }
  return setState(state)
}

function search(keyword) {
  const key = String(keyword || '').trim().toLowerCase()
  if (!key) return { chapters: [], moments: [] }
  const state = getState()
  return {
    chapters: state.chapters.filter(item => `${item.title}${item.englishTitle}${item.type}${item.description}`.toLowerCase().includes(key)),
    moments: state.moments.filter(item => `${item.content}${item.location}${item.mood}${item.tags.join('')}`.toLowerCase().includes(key))
  }
}

function reset() { return setState(clone(demo)) }

module.exports = {
  init, getState, getChapters, getChapter, getActiveChapter, setActiveChapter, getMoments,
  getMoment, saveMoment, deleteMoment, toggleFavorite, saveChapter, toggleGoal,
  completeChapter, setChapterStatus, deleteChapter, search, reset
}
