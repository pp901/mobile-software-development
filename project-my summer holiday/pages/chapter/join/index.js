const cloud = require('../../../services/collaboration')
const store = require('../../../services/store')
const media = require('../../../services/media')
Page({
 data: { code: '', inputCode: '', invitation: null, loading: true, joining: false, uploading: false, error: '', nickname: '', avatar: '' },
 onLoad(options) {
  const code = options.code || ''
  this.setData({ code, inputCode: code, loading: false })
  if (code) this.load()
 },
 inputCode(e) { this.setData({ inputCode: e.detail.value, error: '' }) },
 pasteInvite() {
  wx.getClipboardData({
   success: result => { this.setData({ inputCode: result.data }); this.load() },
   fail: () => this.setData({ error: '没有读到剪贴板，请长按输入框粘贴邀请' })
  })
 },
 changeInvite() { this.setData({ invitation: null, error: '', code: '', inputCode: '' }) },
 async load() {
  if (this.data.loading) return
  const code = cloud.parseInviteCode(this.data.inputCode || this.data.code)
  if (!code) return this.setData({ error: '请粘贴邀请信息，或输入完整的邀请码' })
  this.setData({ code, loading: true, invitation: null, error: '' })
  try {
   const invitation = await cloud.peekInvite(this.data.code)
   const urls = invitation.mediaUrls || {}
   invitation.inviterAvatar = (urls[invitation.inviterAvatar] || {}).url || invitation.inviterAvatar
   invitation.cover = (urls[invitation.cover] || {}).url || invitation.cover
   const profile = store.getCurrentUser()
   this.setData({ invitation, nickname: profile.nickname, avatar: profile.avatar })
  } catch (error) { this.setData({ error: error.message }) }
  finally { this.setData({ loading: false }) }
 },
 inputNickname(e) { this.setData({ nickname: e.detail.value }) },
 async chooseAvatar(e) {
  this.setData({ uploading: true, error: '' })
  try { this.setData({ avatar: await media.persist(e.detail.avatarUrl) }) }
  catch (error) { this.setData({ error: error.message }) }
  finally { this.setData({ uploading: false }) }
 },
 imageError(e) { this.setData({ [e.currentTarget.dataset.field]: '' }) },
 async join() {
  if (this.data.joining || this.data.uploading || !this.data.invitation) return
  this.setData({ joining: true, error: '' })
  try {
   const current = store.getCurrentUser()
   const nickname = this.data.nickname.trim() || current.nickname
   if (nickname !== current.nickname || this.data.avatar !== current.avatar) {
    if (!store.saveProfile({ nickname, avatar: this.data.avatar })) throw new Error(store.getLastError())
    if (!await cloud.updateProfile()) throw new Error(cloud.getLastError())
   }
   const target = await cloud.joinInvite(this.data.code)
   wx.redirectTo({ url: target.scope === 'moment' ? '/pages/moment/detail/index?id=' + target.id : '/pages/chapter/detail/index?id=' + target.id,
    fail: () => this.setData({ joining: false, error: '已经加入，点击下方按钮重新进入即可' }) })
  } catch (error) { this.setData({ joining: false, error: error.message }) }
 },
 goHome() { wx.redirectTo({ url: '/pages/index/index' }) }
})
