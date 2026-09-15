Component({
  properties: {
    moment: {
      type: Object, value: {},
      observer(moment) {
        const parts = String(moment.localDateKey || '').split('-')
        const shortDate = parts.length === 3 ? `${Number(parts[1])}月${Number(parts[2])}日` : moment.dateLabel || ''
        const mediaCount = (moment.media || []).length
        const summary = moment.content || moment.location || (mediaCount ? `${mediaCount} 张照片` : moment.voicePath ? '录音' : 'Moment')
        const typeLabel = moment.voicePath || moment.type === 'voice' ? 'VOICE' : 'PHOTO'
        this.setData({ imageFailed: false, shortDate, summary, typeLabel })
      }
    },
    showDate: { type: Boolean, value: false }
  },
  data: { imageFailed: false, shortDate: '', summary: '', typeLabel: 'PHOTO' },
  methods: {
    open() { this.triggerEvent('open', { id: this.data.moment.id }) },
    imageError() { this.setData({ imageFailed: true }) }
  }
})
