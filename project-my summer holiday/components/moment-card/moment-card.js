const store = require('../../services/store')

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    moment: {
      type: Object, value: {},
      observer(moment) {
        moment = moment || {}
        const photos = (moment.media || []).filter(item => item.type === 'image')
        const update = { albumPhotos: photos.slice(0, 4), longText: (moment.content || '').length > 140 || (moment.content || '').split('\n').length > 5 }
        const imageKey = moment.id + ':' + (moment.image || '') + ':' + photos.map(item => item.displayPath || item.path).join('|')
        if (imageKey !== this.imageKey) { this.imageKey = imageKey; update.imageFailed = false; update.albumFailed = {} }
        if (moment.id !== this.momentId) { this.momentId = moment.id; update.textExpanded = false }
        this.setData(update)
      }
    },
    layout: { type: String, value: 'feed' },
    showChapter: { type: Boolean, value: true }
  },
  data: { albumPhotos: [], albumFailed: {}, imageFailed: false, longText: false, textExpanded: false },
  methods: {
    open() { this.triggerEvent('open', { id: this.data.moment.id }) },
    albumImageError(e) { this.setData({ ['albumFailed.' + e.currentTarget.dataset.index]: true }) },
    imageError() { this.setData({ imageFailed: true }) },
    toggleText() { this.setData({ textExpanded: !this.data.textExpanded }) },
    openChapter() {
      const chapter = store.getChapter(this.data.moment.chapterId)
      if (chapter) wx.navigateTo({ url: '/pages/chapter/detail/index?id=' + chapter.id })
      else wx.showToast({ title: '这个 Chapter 暂不可访问', icon: 'none' })
    }
  }
})
