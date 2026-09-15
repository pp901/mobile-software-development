const store = require('./store')
let identityReady = null
let flushing = null
let lastError = ''
const errors = { CLOUD_OFFLINE: '暂时无法连接，内容已保存在本机', NOT_A_MEMBER: '你已不在这个 Chapter 中', NO_ACCESS: '你没有这条记录的访问权限', OWNER_ONLY: '只有创建者可以操作', CREATOR_ONLY: '只能编辑自己的记录', INVITE_INVALID: '邀请已失效，请重新邀请', INVITE_NOT_FOR_USER: '这份邀请不属于当前账号', CONFLICT: '其他设备修改了同一内容，本机版本已保留', DELETED: '这条内容已在另一台设备删除', UNKNOWN_ACTION: '同步服务需要更新，请稍后重试' }
function enabled() { try { return !!wx.cloud && !!getApp().globalData.cloudEnabled } catch (e) { return false } }
async function call(action, data) {
  if (!enabled()) throw Object.assign(new Error(errors.CLOUD_OFFLINE), { code: 'CLOUD_OFFLINE' })
  try {
    const result = (await wx.cloud.callFunction({ name: 'collaboration', data: Object.assign({ action }, data || {}) })).result
    if (!result || !result.ok) { const code = result && result.error || 'CLOUD_OFFLINE'; throw Object.assign(new Error(errors[code] || '操作未完成，请稍后重试'), { code }) }
    lastError = ''; return result.data
  } catch (e) { lastError = e.code ? e.message : errors.CLOUD_OFFLINE; throw Object.assign(new Error(lastError), { code: e.code || 'CLOUD_OFFLINE' }) }
}
async function bootstrap() {
  if (!enabled()) return null
  if (!identityReady) identityReady = (async () => {
    const profile = store.getCurrentUser()
    const user = await call('ensureUser', { profile: { nickname: profile.nickname, avatar: profile.avatar && profile.avatar.startsWith('cloud://') ? profile.avatar : '', bio: profile.bio || '' } })
    if (user.id !== profile.id && !store.adoptIdentity(Object.assign({}, user, { avatar: profile.avatar || user.avatar }))) throw new Error(store.getLastError())
    if(!store.queueLocalContent())throw new Error(store.getLastError()||'无法保存同步状态')
    return user
  })().catch(e => { identityReady = null; lastError = e.message; return null })
  return identityReady
}
async function ready() { if (!await bootstrap()) throw new Error(lastError || errors.CLOUD_OFFLINE) }
async function upload(path, type) {
  if (!path || /^(cloud:\/\/|https?:\/\/)/.test(path)) return path
  if (path.startsWith('/assets/')) throw new Error('示例媒体仅在本机可用，请换成自己的照片或声音')
  if (!enabled()) throw new Error(errors.CLOUD_OFFLINE)
  const extension = (path.match(/\.([a-zA-Z0-9]+)(?:\?|$)/) || [null, type === 'voice' ? 'mp3' : 'jpg'])[1]
  const result = await wx.cloud.uploadFile({ cloudPath: `ongoing/${store.getCurrentUser().id}/${Date.now()}-${Math.random().toString(36).slice(2,9)}.${extension}`, filePath: path })
  if (!result.fileID) throw new Error('媒体上传未完成，已保留本机文件')
  return result.fileID
}
async function prepare(item) {
  const next = Object.assign({}, item)
  if (next.cover) next.cover = await upload(next.cover, 'image')
  if (next.media) next.media = await Promise.all(next.media.map(async media => Object.assign({}, media, { path: await upload(media.path, 'image') })))
  if (next.voicePath) next.voicePath = await upload(next.voicePath, 'voice')
  return next
}
function flush() {
  if (flushing) return flushing
  flushing = (async () => {
    if (!await bootstrap()) return false
    const priority = { saveChapter: 0, saveMoment: 1, saveContribution: 2 }
    const operations = store.getPendingOps().slice().sort((a,b) => (priority[a.action] === undefined ? 3 : priority[a.action]) - (priority[b.action] === undefined ? 3 : priority[b.action]))
    let success = true; const failures = []
    for (const op of operations) {
      if (!store.getPendingOps().some(current => current.revision === op.revision)) continue
      try {
        const field = op.action === 'saveChapter' ? 'chapter' : op.action === 'saveMoment' ? 'moment' : op.action === 'saveContribution' ? 'contribution' : ''
        const data = Object.assign({}, op.data, { operationId: op.revision })
        if (field) data[field] = await prepare(data[field])
        const remote = await call(op.action, data)
        if (!store.acknowledgeOperation(op, remote)) success = false
      } catch (e) { success = false; store.setSyncIssue(op,e); failures.push(e.message); lastError = e.message; if (e.code === 'CLOUD_OFFLINE') break }
    }
    if (failures.length) lastError = failures[0]
    return success
  })().catch(e => { lastError = e.message; return false }).finally(() => { flushing = null })
  return flushing
}
async function pull(kind, id) {
  if (!id) return null
  try { await ready(); const snapshot = await call(kind === 'chapter' ? 'getChapter' : 'getMoment', kind === 'chapter' ? {chapterId:id} : {momentId:id}); store.mergeSharedSnapshot(snapshot); return snapshot }
  catch (e) { if (['NOT_A_MEMBER','NO_ACCESS','DELETED'].includes(e.code)) store.revokeAccess(kind,id); return null }
}
async function refreshAll() {
  try {
    await ready(); await flush()
    const result = await call('listMine')
    for (const id of result.chapterIds) await pull('chapter', id)
    for (const id of result.momentIds) await pull('moment', id)
    // Re-check cached membership too: absence alone is never interpreted as deletion.
    for (const chapter of store.getChapters()) if (!result.chapterIds.includes(chapter.id) && chapter.syncState === 'synced') await pull('chapter',chapter.id)
    return true
  } catch (e) { lastError = e.message; return false }
}
async function createInvite(chapterId) { await ready(); await flush(); return call('createInvite', { scope: 'chapter', chapterId }) }
async function createMomentInvite(momentId) { await ready(); await flush(); return call('createInvite', { scope: 'moment', momentId }) }
async function peekInvite(code) { await ready(); return call('peekInvite', { code }) }
async function joinInvite(code) { await ready(); const snapshot = await call('joinInvite',{code}); store.mergeSharedSnapshot(snapshot); return snapshot.chapter ? {scope:'chapter',id:snapshot.chapter.id} : {scope:'moment',id:snapshot.moment.id} }
async function removeMember(chapterId,memberId) { try { await ready(); await call('removeMember',{chapterId,memberId}); store.removeMember(chapterId,memberId); return true } catch(e) { return false } }
async function updateProfile() { try { await ready(); const profile=store.getCurrentUser(); const avatar=await upload(profile.avatar,'image'); await call('ensureUser',{update:true,profile:{nickname:profile.nickname,avatar,bio:profile.bio||''}}); if(avatar!==profile.avatar)store.saveProfile({avatar}); return true } catch(e) { lastError=e.message; return false } }
async function readConflict(key) {
 await ready()
 const op=store.getPendingOps().find(item=>item.key===key);if(!op)throw new Error('这项内容已更新，请重新检查')
 const field=op.action==='saveChapter'?'chapter':op.action==='saveMoment'?'moment':'contribution'
 const local=op.data[field]
 const snapshot=await call(field==='chapter'?'getChapter':'getMoment',field==='chapter'?{chapterId:op.id}:{momentId:field==='moment'?op.id:local.momentId})
 const remote=field==='chapter'?snapshot.chapter:field==='moment'?snapshot.moment:snapshot.contributions.find(item=>item.id===op.id)
 if(!remote)throw new Error('远端内容已删除，本机版本仍被保留')
 return {op,local,remote,snapshot}
}
async function resolveConflict(conflict,useLocal){if(!store.resolveConflict(conflict.op,conflict.remote,useLocal))throw new Error(store.getLastError()||'内容已有变化，请重新检查');if(!useLocal)store.mergeSharedSnapshot(conflict.snapshot);return flush()}
module.exports = { readConflict, resolveConflict, enabled, bootstrap, flush, refreshAll, createInvite, createMomentInvite, peekInvite, joinInvite, removeMember, updateProfile, upload, pullChapter:id=>pull('chapter',id), pullMoment:id=>pull('moment',id), getLastError:()=>lastError }
