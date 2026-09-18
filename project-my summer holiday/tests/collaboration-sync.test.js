const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const root = path.resolve(__dirname, '..')
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value))
const rows = {}, collections = new Set()
let caller = '', serverCalls = []
const matches = (row, query) => Object.entries(query).every(([key, value]) => value && value.op === 'exists' ? (row[key] !== undefined) === value.value : Array.isArray(row[key]) ? row[key].includes(value) : row[key] === value)
function apply(row, values) {
 for (const [key, value] of Object.entries(values)) {
  if (value && value.op === 'add') row[key] = Array.from(new Set((row[key] || []).concat(value.value)))
  else if (value && value.op === 'pull') row[key] = (row[key] || []).filter(item => item !== value.value)
  else row[key] = clone(value)
 }
}
function collection(name) {
 const check = () => { if (!collections.has(name)) throw Error('DATABASE_COLLECTION_NOT_EXIST: ' + name); rows[name] = rows[name] || [] }
 function queryFor(query) {
  let offset = 0, limit = 100
  const q = {
   limit(value) { limit = value; return q }, skip(value) { offset = value; return q }, orderBy() { return q },
   async get() { check(); return { data: clone(rows[name].filter(row => matches(row, query)).slice(offset, offset + limit)) } },
   async update({ data }) { check(); const selected = rows[name].filter(row => matches(row, query)); selected.forEach(row => apply(row, data)); return { stats: { updated: selected.length } } }
  }
  return q
 }
 return {
  where: queryFor,
  doc(id) { return { async update({ data }) { check(); const row = rows[name].find(item => item._id === id); if (!row) throw Error('missing'); apply(row, data); return { stats: { updated: 1 } } } } },
  async add({ data }) { check(); if (rows[name].some(row => row._id === data._id)) throw Error('duplicate'); rows[name].push(clone(data)); return { _id: data._id } }
 }
}
const sdk = {
 DYNAMIC_CURRENT_ENV: 'test', init() {}, getWXContext: () => ({ OPENID: caller }),
 database: () => ({ collection, command: { exists: value => ({ op: 'exists', value }), addToSet: value => ({ op: 'add', value }), pull: value => ({ op: 'pull', value }) } }),
 async getTempFileURL({ fileList }) { return { fileList: fileList.map(file => ({ fileID: file.fileID, tempFileURL: 'https://signed.test/' + encodeURIComponent(file.fileID) })) } }
}
const server = { exports: {}, require: name => name === 'wx-server-sdk' ? sdk : require(name), console }
vm.runInNewContext(fs.readFileSync(path.join(root, 'cloudfunctions/collaboration/index.js'), 'utf8'), server)
function client(openid, memory = {}) {
 const cache = {}
 const state = { openid, online: true, uploadDenied: false, uploads: 0, reads: 0, hook: null }
 const wx = {
  getStorageSync: key => { state.reads++; return clone(memory[key]) }, setStorageSync: (key, value) => { memory[key] = clone(value) },
  cloud: {
   async callFunction({ data }) {
    if (!state.online) throw Error('network unavailable')
    if (state.hook) await state.hook(data)
    caller = state.openid; serverCalls.push({ openid: state.openid, action: data.action })
    return { result: await server.exports.main(clone(data)), requestID: 'request-' + serverCalls.length }
   },
   async uploadFile({ cloudPath }) {
    if (!state.online) throw Error('network unavailable')
    if (state.uploadDenied) throw Object.assign(new Error('permission denied'), { code: 'STORAGE_PERMISSION_DENIED' })
    state.uploads++
    return { fileID: 'cloud://test/' + cloudPath }
   }
  }
 }
 function load(filename) {
  filename = path.resolve(filename)
  if (!path.extname(filename)) filename += '.js'
  if (cache[filename]) return cache[filename].exports
  const module = { exports: {} }; cache[filename] = module
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, require: name => load(path.resolve(path.dirname(filename), name)), wx, getApp: () => ({ globalData: { cloudEnabled: true } }), console, Date, setTimeout, clearTimeout, setInterval, clearInterval }, { filename })
  return module.exports
 }
 return { state, memory, store: load(path.join(root, 'services/store.js')), cloud: load(path.join(root, 'services/collaboration.js')) }
}
async function run() {
 const a = client('openid_A')
 a.store.init()
 const reads = a.state.reads
 const previewState = a.store.init()
 previewState.profile.nickname = '不能改动缓存'
 a.store.getCurrentUser(); a.store.getLifeStats(); a.store.getMoments()
 assert.equal(a.state.reads, reads, '本地读取复用内存，不重复读取整份磁盘缓存')
 assert.notEqual(a.store.getCurrentUser().nickname, '不能改动缓存', '公开读取不能修改内部缓存')
 const chapter = a.store.saveChapter({ title: '一起走过的夏天' })
 const original = a.store.saveMoment({ chapterId: chapter.id, content: '海边的第一刻', media: [{ id: 'photo1', type: 'image', path: '/saved/sea.jpg' }] })
 assert.equal(await a.cloud.flush(), false)
 assert.equal(a.cloud.getSyncStatus().diagnostic.code, 'DATABASE_COLLECTION_NOT_EXIST', '缺集合明确报错，不伪装成离线')
 assert.equal(a.store.getPendingOps().length, 2)
 ;['users', 'chapters', 'moments', 'contributions', 'invites'].forEach(name => collections.add('ongoing_' + name))
 assert.equal(await a.cloud.refreshAll(), true, '建齐集合后原本待上传的内容恢复，无需清缓存')
 assert.equal(a.store.getCurrentUser().id, 'openid_A')
 assert.equal(a.store.getMoment(original.id).syncState, 'synced')
 assert.equal(a.store.getPendingOps().length, 0)
 assert.equal(a.state.uploads, 1)

 const b = client('openid_B')
 b.store.init()
 const invitation = await a.cloud.createInvite(chapter.id)
 const invitationText = a.cloud.inviteText(invitation, '夏天 ABCD1234EF56')
 assert.equal(b.cloud.parseInviteCode(invitationText), invitation.code, '完整邀请文字优先读取标注的代码，不误取标题')
 assert.equal(b.cloud.parseInviteCode(invitation.code.toLowerCase()), invitation.code)
 assert.equal(b.cloud.parseInviteCode('普通文字，不是一份邀请'), '')
 assert.equal(b.cloud.parseInviteCode('/pages/chapter/join/index?code=' + 'abc123'.repeat(8)), 'abc123'.repeat(8), '兼容旧卡片路径')
 const legacyInvite = Object.assign({}, rows.ongoing_invites.find(item => item.code === invitation.code), { _id: 'legacy-invite', code: 'abc123'.repeat(8) })
 rows.ongoing_invites.push(legacyInvite)
 assert.equal((await b.cloud.peekInvite(legacyInvite.code)).scope, 'chapter')
 assert.equal((await b.cloud.peekInvite(invitationText)).alreadyMember, false)
 assert.equal((await b.cloud.joinInvite(invitationText)).id, chapter.id)
 assert.equal(b.store.getMoment(original.id).content, '海边的第一刻')
 assert.equal((await b.cloud.peekInvite(invitation.code)).alreadyMember, true)
 await b.cloud.joinInvite(invitation.code)
 assert.equal(b.store.getChapter(chapter.id).memberCount, 2, '重复加入不产生重复成员')
 const bMoment = b.store.saveMoment({ chapterId: chapter.id, content: 'B 也留下自己的 Moment' })
 await b.cloud.flush(); await a.cloud.refreshAll()
 assert.equal(a.store.getMoment(bMoment.id).creator.id, 'openid_B')
 assert.equal(a.store.getMoment(original.id).creator.id, 'openid_A')
 assert.notEqual(a.store.getMoment(bMoment.id).creator.nickname, a.store.getMoment(original.id).creator.nickname, '默认昵称也能区分真实账号')
 assert.ok(b.store.getMoment(original.id).image.startsWith('https://signed.test/'), '第二个设备得到有权限的媒体地址')
 const perspective = b.store.saveContribution({ momentId: original.id, content: '我记得那天的风', media: [{ id: 'b-photo', type: 'image', path: '/saved/b-sea.jpg' }], voicePath: '/saved/b-sea.mp3', voiceDuration: 4 })
 assert.equal(await b.cloud.flush(), true)
 assert.equal(await a.cloud.refreshAll(), true)
 assert.ok(a.store.getMoment(original.id).contributions.some(item => item.id === perspective.id))
 assert.equal(a.store.getMoment(original.id).participantCount, 2)
 assert.equal(a.store.getMoment(original.id).content, '海边的第一刻', 'B 的视角不会修改 A 原内容')
 b.store.saveContribution({ id: perspective.id, momentId: original.id, content: 'B 修改后的视角' })
 await b.cloud.flush()
 const callsBeforePull = serverCalls.filter(item => item.openid === 'openid_A' && item.action === 'getChapter').length
 await Promise.all([a.cloud.pullChapter(chapter.id), a.cloud.pullChapter(chapter.id)])
 assert.equal(serverCalls.filter(item => item.openid === 'openid_A' && item.action === 'getChapter').length - callsBeforePull, 1, '同一个 Chapter 同时进入只拉取一次')
 const updated = a.store.getMoment(original.id).contributions.find(item => item.id === perspective.id)
 assert.equal(updated.content, 'B 修改后的视角')
 assert.ok(updated.media[0].path.startsWith('cloud://'))
 assert.ok(updated.voicePath.startsWith('cloud://'))
 await a.cloud.refreshAll()
 const afterRefresh = serverCalls.length
 await Promise.all([a.cloud.refreshAll({ passive: true }), a.cloud.refreshAll({ passive: true })])
 assert.equal(serverCalls.length, afterRefresh, '一级页面间快速切换不再重复全量拉取')

 // An unfiled Moment uses exactly the same pasted invitation, without granting any Chapter.
 const unfiled = a.store.saveMoment({ content: '独立 Moment，邀请 B' })
 const momentInvite = await a.cloud.createMomentInvite(unfiled.id)
 await b.cloud.joinInvite(a.cloud.inviteText(momentInvite, '一起记住这一刻'))
 const bp = b.store.saveContribution({ momentId: unfiled.id, content: 'B 的第一版' })
 await b.cloud.flush(); await a.cloud.pullMoment(unfiled.id)
 assert.equal(a.store.getMoment(unfiled.id).contributions[0].content, 'B 的第一版')
 const reopened = client('openid_B', b.memory)
 reopened.store.init(true)
 assert.equal(reopened.store.getMoment(unfiled.id).myPerspectiveId, bp.id, '重进仍可编辑已留视角')
 reopened.state.online = false
 reopened.store.saveContribution({ id: bp.id, momentId: unfiled.id, content: 'B 重进后离线修改的第二版' })
 assert.equal(await reopened.cloud.flush(), false)
 reopened.state.online = true
 assert.equal(await reopened.cloud.refreshAll(), true)
 await a.cloud.pullMoment(unfiled.id)
 assert.equal(a.store.getMoment(unfiled.id).contributions[0].content, 'B 重进后离线修改的第二版')
 assert.equal(a.store.getMoment(unfiled.id).content, '独立 Moment，邀请 B')
 const freshPhone = client('openid_B')
 freshPhone.store.init()
 assert.equal(await freshPhone.cloud.refreshAll(), true)
 assert.equal(freshPhone.store.getMoment(unfiled.id).myPerspectiveId, bp.id, '没有旧缓存的新设备也能从云端恢复邀请和视角')

 a.state.online = false
 const offline = a.store.saveMoment({ content: '断网时留下的记录' })
 assert.equal(await a.cloud.flush(), false)
 assert.equal(a.store.getMoment(offline.id).content, '断网时留下的记录')
 a.state.online = true
 assert.equal(await a.cloud.refreshAll(), true)
 assert.equal(a.store.getMoment(offline.id).syncState, 'synced')

 const moving = a.store.saveMoment({ content: '上传期间编辑', media: [{ id: 'racing-photo', type: 'image', path: '/saved/racing.jpg' }] })
 let edited = false, added = null
 a.state.hook = async data => {
  if (!edited && data.action === 'saveMoment' && data.moment.id === moving.id) {
   edited = true
   a.store.saveMoment({ id: moving.id, content: '这是更新后的内容' })
   added = a.store.saveMoment({ content: '同步过程中新增的另一刻' })
   a.cloud.flush()
  }
 }
 const beforeUploads = a.state.uploads
 assert.equal(await a.cloud.flush(), true)
 a.state.hook = null
 assert.equal(a.store.getPendingOps().length, 0, '同一轮排空上传期间新增的操作')
 assert.equal(rows.ongoing_moments.find(item => item.id === moving.id).content, '这是更新后的内容')
 assert.equal(rows.ongoing_moments.find(item => item.id === moving.id).serverVersion, 2)
 assert.ok(rows.ongoing_moments.some(item => item.id === added.id))
 assert.equal(a.state.uploads - beforeUploads, 1, '重试和新版本复用已上传的同一份媒体')

 a.state.uploadDenied = true
 const denied = a.store.saveMoment({ content: '有一张照片', media: [{ id: 'denied-photo', type: 'image', path: '/saved/denied.jpg' }] })
 assert.equal(await a.cloud.refreshAll(), false)
 assert.equal(a.cloud.getSyncStatus().diagnostic.code, 'STORAGE_PERMISSION_DENIED', '成功读取其他记录不掩盖上传失败')
 await assert.rejects(a.cloud.createMomentInvite(denied.id), /上传|权限/)
 assert.ok(a.store.getMoment(denied.id))
 a.state.uploadDenied = false
 assert.equal(await a.cloud.flush(), true)

 const second = a.store.saveChapter({ title: '独立的旅行' })
 const scoped = a.store.saveMoment({ chapterId: second.id, content: '只邀请这一刻' })
 await a.cloud.flush()
 const singleInvite = await a.cloud.createMomentInvite(scoped.id)
 const c = client('openid_C'); c.store.init()
 await c.cloud.joinInvite(singleInvite.code)
 assert.ok(c.store.getMoment(scoped.id))
 assert.equal(await c.cloud.pullChapter(second.id), null, '单条邀请不会获得整章权限')
 const cp = c.store.saveContribution({ momentId: scoped.id, content: '第三个设备的视角' })
 await c.cloud.flush(); await a.cloud.refreshAll()
 assert.ok(a.store.getMoment(scoped.id).contributions.some(item => item.id === cp.id))
 assert.equal(a.store.setReviewPhotos(chapter.id, [original.id]), true)
 assert.ok(a.store.getPendingOps().some(op => op.action === 'saveChapter'))
 await a.cloud.flush()
 assert.ok(rows.ongoing_chapters.find(item => item.id === chapter.id).reviewPhotoIds.includes(original.id))
 // Profiles use the same durable retry queue as records.
 b.state.online = false
 b.store.saveProfile({ nickname: '小林', avatar: '/saved/b-avatar.jpg' })
 assert.equal(await b.cloud.updateProfile(), false)
 assert.ok(b.store.getPendingOps().some(op => op.action === 'ensureUser'))
 b.state.online = true
 assert.equal(await b.cloud.refreshAll(), true)
 await a.cloud.refreshAll()
 assert.equal(a.store.getMoment(bMoment.id).creator.nickname, '小林')
 assert.ok(a.store.getMoment(bMoment.id).creator.avatar.startsWith('https://signed.test/'))

 // Membership is authoritative on the server, including after leaving or removal.
 assert.equal(await b.cloud.removeMember(chapter.id, 'openid_A'), false, '普通成员不能移除创建者')
 assert.equal(await a.cloud.removeMember(chapter.id, 'openid_B'), true)
 await b.cloud.refreshAll()
 assert.equal(b.store.getChapter(chapter.id), null)
 assert.equal(b.store.getMoment(bMoment.id), null, '退出权限后的 Chapter 内容不可继续从缓存浏览')
 assert.ok(a.store.getMoment(bMoment.id), '退出或移除仍保留共同记录')
 await b.cloud.joinInvite(invitation.code)
 assert.equal(await b.cloud.removeMember(chapter.id, 'openid_B'), true)
 assert.equal(b.store.getChapter(chapter.id), null)
 rows.ongoing_invites.find(item => item.code === invitation.code).expiresAt = Date.now() - 1
 await assert.rejects(b.cloud.peekInvite(invitation.code), /失效/)
 const deletedChapter = a.store.saveChapter({ title: '待删除的测试邀请' })
 const deletedInvite = await a.cloud.createInvite(deletedChapter.id)
 a.store.deleteChapter(deletedChapter.id); await a.cloud.flush()
 await assert.rejects(b.cloud.peekInvite(deletedInvite.code), /失效/)

 // Same-device account switching preserves each account's drafts and pending records.
 const held = a.store.saveMoment({ content: 'A 账号尚未同步的记录' })
 a.store.saveEditorDraft('openid_A:new', { content: 'A 私人草稿' })
 a.state.openid = 'openid_B'
 await assert.rejects(a.cloud.createMomentInvite(original.id), /账号/, '旧缓存不能以 B 的真实身份继续写入 A 的内容')
 assert.equal(await a.cloud.refreshAll(), true)
 assert.equal(a.store.getCurrentUser().id, 'openid_B')
 assert.equal(a.store.getCurrentUser().nickname, '小林', '换号不复制上一个账号的资料')
 assert.equal(a.store.getMoment(held.id), null)
 assert.equal(a.store.getEditorDraft('openid_A:new'), null)
 assert.ok(!rows.ongoing_moments.some(item => item.id === held.id), 'A 的离线记录未被上传给 B')
 a.state.openid = 'openid_A'
 assert.equal(await a.cloud.refreshAll(), true)
 assert.equal(a.store.getCurrentUser().id, 'openid_A')
 assert.equal(a.store.getEditorDraft('openid_A:new').content, 'A 私人草稿')
 assert.equal(rows.ongoing_moments.find(item => item.id === held.id).creatorId, 'openid_A')
 console.log('collaboration sync passed: account isolation, two authors, repeat join, expired/deleted invites, removal/leave, profile retry; missing collection recovery, isolated devices, invitations, perspectives, offline retry, queue races, media reuse, upload errors')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
