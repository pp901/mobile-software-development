const focus = require('../../services/audio-focus')

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    showPhotos: { type: Boolean, value: true },
    showText: { type: Boolean, value: true },
    photoLayout: { type: String, value: 'stack' },
    item: { type: Object, value: {} }
  },
  data: { playing: false, elapsed: 0, failed: {}, photos: [], gridPhotos: [], singleRatio: 85 },
  observers: {
    item(item) {
      item = item || {}
      const photos = (item.media || []).filter(media => media.type === 'image').map((media, index) =>
        Object.assign({}, media, { key: media.id || String(index), src: media.displayPath || media.path }))
      const signature = item.id + ':' + photos.map(photo => photo.src).join('|')
      const update = { photos, gridPhotos: photos.slice(0, 9) }
      if (signature !== this.photoSignature) {
        this.photoSignature = signature
        update.failed = {}
        const first = photos[0] || {}
        update.singleRatio = first.width && first.height ? this.photoRatio(first.width, first.height) : 85
      }
      const audioKey = item.id + ':' + (item.displayVoicePath || item.voicePath || '')
      if (audioKey !== this.audioKey) {
        this.audioKey = audioKey
        if (this.audio) this.audio.stop()
        update.playing = false
        update.elapsed = 0
      }
      this.setData(update)
    }
  },
  lifetimes: { detached() { if (this.audio) { focus.release(this.audio); this.audio.destroy() } } },
  pageLifetimes: { hide() { if (this.audio) this.audio.pause() } },
  methods: {
    photoRatio(width, height) { return Math.round(Math.max(0.6, Math.min(1.2, height / width)) * 100) },
    photoLoaded(e) {
      if (this.data.photos.length === 1 && e.detail.width && e.detail.height) {
        const ratio = this.photoRatio(e.detail.width, e.detail.height)
        if (ratio !== this.data.singleRatio) this.setData({ singleRatio: ratio })
      }
    },
    ensureAudio() {
      if (this.audio) return
      this.audio = wx.createInnerAudioContext()
      this.audio.onPlay(() => this.setData({ playing: true }))
      this.audio.onPause(() => this.setData({ playing: false }))
      this.audio.onStop(() => this.setData({ playing: false, elapsed: 0 }))
      this.audio.onEnded(() => this.setData({ playing: false, elapsed: 0 }))
      this.audio.onError(() => { this.setData({ playing: false }); wx.showToast({ title: '声音暂时无法播放', icon: 'none' }) })
      this.audio.onTimeUpdate(() => this.setData({ elapsed: Math.floor(this.audio.currentTime) }))
    },
    preview(e) {
      const urls = this.data.photos.map(photo => photo.src).filter(Boolean)
      if (urls.length) wx.previewImage({ urls, current: e.currentTarget.dataset.src || urls[0] })
    },
    imageError(e) { this.setData({ ['failed.' + e.currentTarget.dataset.index]: true }) },
    play() {
      const path = this.data.item.displayVoicePath || this.data.item.voicePath
      if (!path) return
      this.ensureAudio()
      if (this.data.playing) this.audio.pause()
      else {
        focus.claim(this.audio)
        if (this.audio.src !== path) this.audio.src = path
        this.audio.play()
      }
    }
  }
})
