const store = require('./store')
let identityReady = null
let verifiedId = ''
let flushing = null
let refreshing = null
let lastError = ''
let diagnostic = null
let lastSyncedAt = ''
let lastLibraryRefresh = 0
const pulls = new Map()
const uploaded = new Map()
const errors = {
 CLOUD_OFFLINE: '暂时无法连接云端，内容已保存在本机',
 CLOUD_DISABLED: '云开发尚未启用，请检查小程序的云环境配置',
 DATABASE_COLLECTION_NOT_EXIST: '云数据库集合尚未建齐，请按项目说明创建 6 个 ongoing_* 集合',
 DATABASE_PERMISSION_DENIED: '云数据库访问被拒绝，请检查环境和云函数权限',
 FUNCTION_NOT_FOUND: '当前云环境没有 collaboration 云函数，请确认部署环境',
 CLOUD_TIMEOUT: '云端响应超时，内容已保留，稍后会继续同步',
 STORAGE_PERMISSION_DENIED: '照片或声音上传被拒绝，请检查云存储上传权限',
 MEDIA_UPLOAD_FAILED: '照片或声音尚未上传，内容已保留，请联网后重试',
 LOCAL_MEDIA_MISSING: '本机照片或声音无法读取，请重新选择后再同步',
 DEMO_MEDIA_LOCAL: '示例图片仅在本机展示，替换成自己的照片后即可同步',
 IDENTITY_MISMATCH: '微信账号已变化，请重新进入页面；原账号记录已保留',
 CLOUD_UPDATE_REQUIRED: '请重新部署本项目的 collaboration 云函数，再进行共同记录',
 NOT_A_MEMBER: '你已不在这个 Chapter 中', NO_ACCESS: '你没有这条记录的访问权限',
 OWNER_ONLY: '只有创建者可以操作', CREATOR_ONLY: '只能编辑自己的记录',
 INVITE_INVALID: '邀请已失效，请重新邀请', INVITE_NOT_FOR_USER: '这份邀请不属于当前账号',
 CONFLICT: '其他设备修改了同一内容，请在“我的 → 同步与数据”选择保留的版本',
 DELETED: '这条内容已在另一台设备删除', UNKNOWN_ACTION: '云端 collaboration 需要重新部署',
 CHAPTER_NOT_FOUND: '这个 Chapter 不存在或已被删除',
 MOMENT_NOT_FOUND: '这个 Moment 不存在或已被删除', PERSPECTIVE_NOT_FOUND: '这段视角已不存在，暂时无法评论',
 SHARED_MOVE_FORBIDDEN: '共同记录暂时不能更换 Chapter，以免改变他人的访问范围',
 UNAUTHENTICATED: '没有取得微信身份，请从小程序重新进入',
 EMPTY_CONTENT: '内容为空，暂时无法同步', INVALID_STATUS: '记录状态无效，请重新保存',
 SYNC_REQUIRED: '内容还没有同步完成，请处理同步提示后再邀请',
 LOCAL_WRITE_FAILED: '本机同步状态未保存，请检查设备存储空间'
}
function enabled() { try { return !!wx.cloud && !!getApp().globalData.cloudEnabled } catch (e) { return false } }
function normalizeError(error, action) {
 const detail = String(error.detail || error.errMsg || error.message || '未知错误')
 let code = error.code || ''
 if (/DATABASE_COLLECTION_NOT_EXIST|collection.{0,60}(not exist|not found)|集合不存在|-502005/i.test(detail + code)) code = 'DATABASE_COLLECTION_NOT_EXIST'
 else if (/FUNCTION_NOT_FOUND|FUNCTIONS_NOT_FOUND|function.{0,60}(not exist|not found)/i.test(detail + code)) code = 'FUNCTION_NOT_FOUND'
 else if (/timeout|timed out|超时/i.test(detail + code)) code = 'CLOUD_TIMEOUT'
 else if (/permission|access denied|无权限/i.test(detail + code) && !errors[code]) code = action === 'uploadFile' ? 'STORAGE_PERMISSION_DENIED' : 'DATABASE_PERMISSION_DENIED'
 if (!code) code = action === 'uploadFile' ? 'MEDIA_UPLOAD_FAILED' : 'CLOUD_OFFLINE'
 const message = errors[code] || '同步未完成，可在“我的 → 同步与数据”查看具体原因'
 return Object.assign(new Error(message), { code, detail, action, requestId: error.requestId || '' })
}
function remember(error, action) {
 const value = normalizeError(error, action || error.action)
 diagnostic = { code: value.code, detail: value.detail, action: value.action || '', requestId: value.requestId }
 lastError = value.message
 return value
}
function clearError() { lastError = ''; diagnostic = null }
async function call(action, data) {
 if (!enabled()) throw remember({ code: 'CLOUD_DISABLED', message: errors.CLOUD_DISABLED }, action)
 try {
  const expectedUserId = action === 'ensureUser' && !(data && data.update) ? '' : store.getCurrentUser().id
  const response = await wx.cloud.callFunction({ name: 'collaboration', data: Object.assign({ action, expectedUserId }, data || {}) })
  const result = response.result
  if (!result || !result.ok) throw Object.assign(new Error(result && (result.detail || result.error) || '云函数未返回有效结果'), { code: result && result.error || 'CLOUD_OFFLINE', detail: result && result.detail, requestId: response.requestID || '' })
  if (result.protocolVersion !== 2) throw { code: 'CLOUD_UPDATE_REQUIRED' }
  if (expectedUserId && (result.userId !== expectedUserId || store.getCurrentUser().id !== expectedUserId)) throw { code: 'IDENTITY_MISMATCH' }
  return result.data
 } catch (error) { throw remember(error, action) }
}
async function bootstrap(force) {
 if (!enabled()) { remember({ code: 'CLOUD_DISABLED', message: errors.CLOUD_DISABLED }, 'init'); return null }
 if (!identityReady && !force && verifiedId === store.getCurrentUser().id) return store.getCurrentUser()
 if (!identityReady) identityReady = (async () => {
  const profile = store.getCurrentUser()
  const localIdentity = /^(local-|user-)/.test(profile.id)
  const user = await call('ensureUser', { profile: localIdentity ? { nickname: profile.nickname, avatar: profile.avatar && profile.avatar.startsWith('cloud://') ? profile.avatar : '', bio: profile.bio || '' } : {} })
  if (user.id !== profile.id && !store.activateCloudIdentity(user)) throw { code: 'LOCAL_WRITE_FAILED', message: store.getLastError() }
  if (user.id !== profile.id) lastLibraryRefresh = 0
  verifiedId = user.id
  if (!store.queueLocalContent()) throw { code: 'LOCAL_WRITE_FAILED', message: store.getLastError() }
  return user
 })().catch(error => { verifiedId = ''; remember(error, 'ensureUser'); return null }).finally(() => { identityReady = null })
 return identityReady
}
async function ready() { if (!await bootstrap()) throw Object.assign(new Error(lastError || errors.CLOUD_OFFLINE), diagnostic || { code: 'CLOUD_OFFLINE' }) }
async function upload(path, type) {
 if (!path || /^(cloud:\/\/|https?:\/\/)/.test(path)) return path
 if (path.startsWith('/assets/')) throw remember({ code: 'DEMO_MEDIA_LOCAL', message: errors.DEMO_MEDIA_LOCAL }, 'uploadFile')
 if (!enabled()) throw remember({ code: 'CLOUD_DISABLED', message: errors.CLOUD_DISABLED }, 'uploadFile')
 const mediaCache = store.getState().mediaCache
 const known = Object.keys(mediaCache).find(file => mediaCache[file] === path && file.startsWith('cloud://'))
 if (known) return known
 const key = store.getCurrentUser().id + ':' + path
 if (!uploaded.has(key)) uploaded.set(key, (async () => {
  const extension = (path.match(/\.([a-zA-Z0-9]+)(?:\?|$)/) || [null, type === 'voice' ? 'mp3' : 'jpg'])[1]
  try {
   const result = await wx.cloud.uploadFile({ cloudPath: 'ongoing/' + store.getCurrentUser().id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 9) + '.' + extension, filePath: path })
   if (!result.fileID) throw { code: 'MEDIA_UPLOAD_FAILED', message: '上传未返回 fileID' }
   return result.fileID
  } catch (error) {
   uploaded.delete(key)
   if (/no such file|not found|fail.*file|文件不存在/i.test(error.errMsg || error.message || '')) error.code = 'LOCAL_MEDIA_MISSING'
   throw remember(error, 'uploadFile')
  }
 })())
 return uploaded.get(key)
}
async function prepare(item) {
 const next = Object.assign({}, item)
 if (next.cover) next.cover = await upload(next.cover, 'image')
 if (next.media) next.media = await Promise.all(next.media.map(async media => ({ id: media.id, type: media.type, path: await upload(media.path, 'image') })))
 if (next.voicePath) next.voicePath = await upload(next.voicePath, 'voice')
 return next
}
function flush() {
 if (flushing) return flushing
 flushing = (async () => {
  if (!await bootstrap()) return false
  const actor = store.getCurrentUser().id
  const priority = { ensureUser: -1, saveChapter: 0, saveMoment: 1, saveContribution: 2, saveComment: 3 }
  const attempted = new Set()
  let firstFailure = null
  let stop = false
  // Drain revisions added during an upload as well; a failed revision waits for a later retry.
  while (!stop) {
   const operations = store.getPendingOps().filter(op => !attempted.has(op.revision)).sort((a, b) => (priority[a.action] === undefined ? 3 : priority[a.action]) - (priority[b.action] === undefined ? 3 : priority[b.action]))
   if (!operations.length) break
   for (const op of operations) {
    if (store.getCurrentUser().id !== actor) return false
    attempted.add(op.revision)
    if (!store.getPendingOps().some(current => current.revision === op.revision)) continue
    const field = op.action === 'saveChapter' ? 'chapter' : op.action === 'saveMoment' ? 'moment' : op.action === 'saveContribution' ? 'contribution' : op.action === 'saveComment' ? 'comment' : ''
    const item = field && op.data[field]
    const pending = store.getPendingOps()
    if (item && field !== 'chapter' && pending.some(parent => parent.action === 'saveChapter' && parent.id === item.chapterId)) continue
    if (field === 'contribution' && pending.some(parent => parent.action === 'saveMoment' && parent.id === item.momentId)) continue
    if (field === 'comment' && pending.some(parent => parent.action === 'saveContribution' && parent.id === item.perspectiveId)) continue
    try {
     const data = Object.assign({}, op.data, { operationId: op.revision })
     if (field) data[field] = await prepare(item)
     if (op.action === 'ensureUser') data.profile = Object.assign({}, data.profile, { avatar: await upload(data.profile.avatar, 'image') })
     if (store.getCurrentUser().id !== actor) return false
     if (!store.getPendingOps().some(current => current.revision === op.revision)) continue
     const remote = await call(op.action, data)
     const acknowledged = store.acknowledgeOperation(op, remote)
     if (!acknowledged && store.getLastError()) throw { code: 'LOCAL_WRITE_FAILED', message: store.getLastError() }
    } catch (error) {
     const failure = remember(error, error.action || op.action)
     store.setSyncIssue(op, failure)
     if (!firstFailure) firstFailure = failure
     if (['CLOUD_OFFLINE', 'CLOUD_DISABLED', 'CLOUD_TIMEOUT', 'DATABASE_COLLECTION_NOT_EXIST', 'FUNCTION_NOT_FOUND'].includes(failure.code)) { stop = true; break }
    }
   }
  }
  const remaining = store.getPendingOps()
  if (firstFailure) remember(firstFailure)
  else if (!remaining.length) { clearError(); lastSyncedAt = new Date().toISOString() }
  return !remaining.length
 })().catch(error => { remember(error, 'flush'); return false }).finally(() => { flushing = null })
 return flushing
}
function pull(kind, id) {
 const key = store.getCurrentUser().id + ':' + kind + ':' + id
 if (pulls.has(key)) return pulls.get(key)
 const request = pullRemote(kind, id).finally(() => pulls.delete(key))
 pulls.set(key, request)
 return request
}
async function pullRemote(kind, id) {
 if (!id) return null
 try {
  await ready()
  const local = kind === 'chapter' ? store.getChapter(id) : store.getMoment(id)
  if (local && !local.serverVersion && store.getPendingOps().some(op => op.id === id && op.action.startsWith('save'))) {
   await flush()
   if (store.getPendingOps().some(op => op.id === id && op.action.startsWith('save'))) return null
  }
  const snapshot = await call(kind === 'chapter' ? 'getChapter' : 'getMoment', kind === 'chapter' ? { chapterId: id } : { momentId: id })
  if (!store.mergeSharedSnapshot(snapshot)) throw { code: 'LOCAL_WRITE_FAILED', message: store.getLastError() || '同步内容未能写入本机' }
  return snapshot
 } catch (error) {
  remember(error, error.action || 'get' + kind)
  if (['NOT_A_MEMBER', 'NO_ACCESS', 'DELETED', 'CHAPTER_NOT_FOUND', 'MOMENT_NOT_FOUND'].includes(error.code)) store.revokeAccess(kind, id)
  return null
 }
}
function refreshAll(options) {
 if (options && options.passive && verifiedId === store.getCurrentUser().id && Date.now() - lastLibraryRefresh < 15000 && !store.getPendingOps().length) return refreshing || Promise.resolve(true)
 if (refreshing) return refreshing
 refreshing = (async () => {
  if (!await bootstrap(!(options && options.identityChecked))) return false
  const pushed = await flush()
  const pushError = !pushed && lastError ? { message: lastError, diagnostic } : null
  const result = await call('listMine')
  let pulled = true
  const targets = (result.chapterIds || []).map(id => ['chapter', id]).concat((result.momentIds || []).map(id => ['moment', id]))
  for (let index = 0; index < targets.length; index += 3) {
   const results = await Promise.all(targets.slice(index, index + 3).map(target => pull(target[0], target[1])))
   if (results.some(value => !value)) pulled = false
  }
  const checkRemoved = async (kind, id) => {
   if (await pull(kind, id)) return
   const revoked = ['NOT_A_MEMBER', 'NO_ACCESS', 'DELETED', 'CHAPTER_NOT_FOUND', 'MOMENT_NOT_FOUND']
   if (!diagnostic || !revoked.includes(diagnostic.code)) pulled = false
  }
  for (const moment of store.getMoments()) if (!moment.chapterId && moment.syncState === 'synced' && !(result.momentIds || []).includes(moment.id)) await checkRemoved('moment', moment.id)
  for (const chapter of store.getChapters()) if (!(result.chapterIds || []).includes(chapter.id) && chapter.syncState === 'synced') await checkRemoved('chapter', chapter.id)
  if (pushError) { lastError = pushError.message; diagnostic = pushError.diagnostic }
  else if (pushed && pulled) { clearError(); lastSyncedAt = new Date().toISOString() }
  if (pushed && pulled) lastLibraryRefresh = Date.now()
  return pushed && pulled
 })().catch(error => { remember(error, error.action || 'refreshAll'); return false }).finally(() => { refreshing = null })
 return refreshing
}
async function ensureSharedTarget(kind, id) {
 await ready()
 await flush()
 const item = kind === 'chapter' ? store.getChapter(id) : store.getMoment(id)
 if (!item || !item.serverVersion || store.getPendingOps().some(op => op.id === id && op.action.startsWith('save'))) {
  const issue = store.getSyncIssues().find(one => one.key.endsWith(':' + id))
  throw Object.assign(new Error(issue && issue.message || lastError || errors.SYNC_REQUIRED), { code: issue && issue.code || 'SYNC_REQUIRED' })
 }
}
async function createInvite(chapterId) { await ensureSharedTarget('chapter', chapterId); return call('createInvite', { scope: 'chapter', chapterId }) }
async function createMomentInvite(momentId) { await ensureSharedTarget('moment', momentId); return call('createInvite', { scope: 'moment', momentId }) }
function parseInviteCode(value) {
 const text = String(value || '').trim()
 const marked = text.match(/(?:邀请码[：:]?\s*|[?&]code=)([^\r\n&]+)/i)
 const candidate = marked ? marked[1].trim() : text
 const legacy = candidate.match(/\b([a-fA-F0-9]{48})\b/)
 if (legacy) return legacy[1].toLowerCase()
 const short = candidate.match(/\b([a-fA-F0-9]{4}[-\s]?[a-fA-F0-9]{4}[-\s]?[a-fA-F0-9]{4})\b/)
 return short ? short[1].replace(/[-\s]/g, '').toUpperCase() : ''
}
function inviteText(invite, title) {
 const code = invite.code.length === 12 ? invite.code.match(/.{4}/g).join('-') : invite.code
 return 'ongoing_ · ' + title + '\n邀请码：' + code + '\n打开小程序体验版 → 生活 → 加入共同记录，粘贴这段邀请即可。'
}
async function peekInvite(value) {
 const code = parseInviteCode(value)
 if (!code) throw new Error('请粘贴邀请信息，或输入完整的邀请码')
 await ready()
 return call('peekInvite', { code })
}
async function joinInvite(value) {
 const code = parseInviteCode(value)
 if (!code) throw new Error('邀请码不完整，请重新粘贴')
 await ready()
 const snapshot = await call('joinInvite', { code })
 if (!store.mergeSharedSnapshot(snapshot)) throw new Error(store.getLastError() || '邀请已接受，但内容尚未保存到本机，请重试')
 return snapshot.chapter ? { scope: 'chapter', id: snapshot.chapter.id } : { scope: 'moment', id: snapshot.moment.id }
}
async function removeMember(chapterId, memberId) {
 try {
  await ready()
  await call('removeMember', { chapterId, memberId })
  if (!store.removeMember(chapterId, memberId)) throw { code: 'LOCAL_WRITE_FAILED' }
  if (memberId === store.getCurrentUser().id) store.revokeAccess('chapter', chapterId)
  else if (!await pull('chapter', chapterId)) return false
  clearError()
  return true
 } catch (error) { remember(error); return false }
}
async function updateProfile() {
 try {
  await ready()
  if (!store.getPendingOps().some(op => op.action === 'ensureUser') && !store.saveProfile(store.getCurrentUser())) throw { code: 'LOCAL_WRITE_FAILED' }
  return await flush()
 } catch (error) { remember(error, 'updateProfile'); return false }
}
async function readConflict(key) {
 await ready()
 const op = store.getPendingOps().find(item => item.key === key)
 if (!op) throw new Error('这项内容已更新，请重新检查')
 const field = op.action === 'saveChapter' ? 'chapter' : op.action === 'saveMoment' ? 'moment' : op.action === 'saveContribution' ? 'contribution' : 'comment'
 const local = op.data[field]
 const snapshot = await call(field === 'chapter' ? 'getChapter' : 'getMoment', field === 'chapter' ? { chapterId: op.id } : { momentId: field === 'moment' ? op.id : local.momentId })
 const remote = field === 'chapter' ? snapshot.chapter : field === 'moment' ? snapshot.moment : field === 'contribution' ? snapshot.contributions.find(item => item.id === op.id) : snapshot.comments.find(item => item.id === op.id)
 if (!remote) throw new Error('远端内容已删除，本机版本仍被保留')
 return { op, local, remote, snapshot }
}
async function resolveConflict(conflict, useLocal) { if (!store.resolveConflict(conflict.op, conflict.remote, useLocal)) throw new Error(store.getLastError() || '内容已有变化，请重新检查'); if (!useLocal) store.mergeSharedSnapshot(conflict.snapshot); return flush() }
function getSyncStatus() { return { syncing: !!flushing || !!refreshing, pending: store.getPendingOps().length, error: lastError, diagnostic, lastSyncedAt } }
module.exports = { parseInviteCode, inviteText, readConflict, resolveConflict, enabled, bootstrap, flush, refreshAll, createInvite, createMomentInvite, peekInvite, joinInvite, removeMember, updateProfile, upload, getSyncStatus, pullChapter: id => pull('chapter', id), pullMoment: id => pull('moment', id), getLastError: () => lastError }
