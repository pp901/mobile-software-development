const store = require('./store')

function enabled() {
  try { return typeof wx !== 'undefined' && !!wx.cloud && !!getApp().globalData.cloudEnabled } catch (error) { return false }
}

function call(action, data) {
  if (!enabled()) return Promise.resolve(null)
  return wx.cloud.callFunction({ name: 'collaboration', data: Object.assign({ action }, data || {}) })
    .then(res => res && res.result && res.result.ok ? res.result.data : null)
    .catch(() => null)
}

function bootstrap() {
  const profile = store.getCurrentUser()
  return call('ensureUser', { profile: { nickname: profile.nickname, avatar: profile.avatar, bio: profile.bio || '' } }).then(user => {
    if (user && user.id && user.id !== profile.id) store.adoptIdentity(user)
    return user
  })
}

function publishChapter(chapterId) {
  const snapshot = store.exportChapterSnapshot(chapterId)
  if (!snapshot) return Promise.resolve(null)
  return call('upsertChapter', { snapshot })
}

function createInvite(chapterId, memberId) {
  if (!enabled()) return Promise.resolve(store.createInvite(chapterId, memberId))
  return publishChapter(chapterId).then(() => call('createInvite', { chapterId, memberId: memberId || '' }))
}

function joinInvite(code) {
  if (!enabled()) return Promise.resolve(store.joinChapter(code))
  return call('joinInvite', { code, profile: store.getCurrentUser() }).then(snapshot => {
    if (snapshot) store.mergeSharedSnapshot(snapshot)
    return snapshot ? store.getChapter(snapshot.chapter.id) : null
  })
}

function pullChapter(chapterId) {
  return call('getChapter', { chapterId }).then(snapshot => {
    if (snapshot) store.mergeSharedSnapshot(snapshot)
    return snapshot ? store.getChapter(snapshot.chapter.id) : null
  })
}

function momentPayload(moment) {
  const keys = ['id', 'chapterId', 'creatorId', 'type', 'status', 'content', 'media', 'location', 'latitude', 'longitude', 'mood', 'tags', 'voicePath', 'voiceDuration', 'favorite', 'createdAt', 'updatedAt', 'goalId']
  return keys.reduce((next, key) => { if (moment[key] !== undefined) next[key] = moment[key]; return next }, {})
}

function contributionPayload(item) {
  const keys = ['id', 'momentId', 'chapterId', 'creatorId', 'type', 'content', 'media', 'voicePath', 'voiceDuration', 'createdAt']
  return keys.reduce((next, key) => { if (item[key] !== undefined) next[key] = item[key]; return next }, {})
}

function pushMoment(moment) { return call('saveMoment', { moment: momentPayload(moment) }) }
function removeMoment(momentId) { return call('deleteMoment', { momentId }) }
function pushContribution(contribution) { return call('saveContribution', { contribution: contributionPayload(contribution) }) }
function removeContribution(contributionId) { return call('deleteContribution', { contributionId }) }
function finishChapter(chapterId, ending) { return call('completeChapter', { chapterId, ending }) }
function removeMember(chapterId, memberId) { return call('removeMember', { chapterId, memberId }) }
function pushGoal(chapterId, goalId, done) { return call('toggleGoal', { chapterId, goalId, done }) }

function upload(path, type) {
  if (!enabled() || !path || path.indexOf('/assets/') === 0 || path.indexOf('cloud://') === 0) return Promise.resolve(path)
  const extension = (path.match(/\.([a-zA-Z0-9]+)(?:\?|$)/) || [null, type === 'voice' ? 'mp3' : 'jpg'])[1]
  const cloudPath = `ongoing/${store.getCurrentUser().id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extension}`
  return wx.cloud.uploadFile({ cloudPath, filePath: path }).then(res => res.fileID).catch(() => path)
}

module.exports = {
  enabled, bootstrap, publishChapter, createInvite, joinInvite, pullChapter, pushMoment, removeMoment,
  pushContribution, removeContribution, finishChapter, removeMember, pushGoal, upload
}
