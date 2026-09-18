Component({
  options: { styleIsolation: 'apply-shared' },
  properties: { item: { type: Object, value: {} } },
  data: { expanded: false, summary: '', previewImage: '', imageCount: 0, comments: [], commentInput: '' },
  observers: {
    item(item) {
      item = item || {}
      const media = Array.isArray(item.media) ? item.media : []
      const images = media.filter(one => one && one.type === 'image')
      const content = String(item.content || '').trim()
      this.setData({
        summary: content || (item.voicePath ? '留下一段那时的声音' : images.length ? '留下了这一刻的画面' : '留下了这一刻的记忆'),
        previewImage: item.image || (images[0] && (images[0].displayPath || images[0].path)) || '',
        imageCount: images.length,
        comments: Array.isArray(item.comments) ? item.comments : []
      })
    }
  },
  methods: {
    toggle() { this.setData({ expanded: !this.data.expanded }) },
    collapse() { this.setData({ expanded: false }) },
    more() { this.triggerEvent('more', { id: this.data.item.id }) },
    inputComment(e) { this.setData({ commentInput: e.detail.value }) },
    submitComment() {
      const content = String(this.data.commentInput || '').trim()
      if (!content) return
      this.triggerEvent('submitcomment', { perspectiveId: this.data.item.id, content })
      this.setData({ commentInput: '' })
    },
    deleteComment(e) { this.triggerEvent('deletecomment', { id: e.currentTarget.dataset.id }) }
  }
})
