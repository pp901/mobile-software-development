const store = require('../../../services/store')
const date = require('../../../utils/date')

Page({
  data: {
    id: '', title: '', description: '', type: '假期', startDate: '', endDate: '', cover: '/assets/images/chapter-summer.webp', saving: false,
    templates: [
      { key: '假期', mark: '假', copy: '日常、足迹与愿望' }, { key: '旅行', mark: '旅', copy: '路线、地点与同行人' },
      { key: '目标', mark: '标', copy: '进展与里程碑' }, { key: '校园', mark: '校', copy: '同学、课程与成长' },
      { key: '实习', mark: '习', copy: '项目、收获与成果' }, { key: '自定义', mark: '自', copy: '自由组合你的模块' }
    ],
    modules: [
      { key: '瞬间', enabled: true, fixed: true }, { key: '足迹', enabled: true },
      { key: '目标', enabled: true }, { key: '回望', enabled: true, fixed: true }
    ]
  },
  onLoad(options) {
    if (options.id) {
      const chapter = store.getChapter(options.id)
      if (chapter) this.setData({ id: chapter.id, title: chapter.title, description: chapter.description, type: chapter.type, startDate: chapter.startDate, endDate: chapter.endDate, cover: chapter.cover, modules: this.data.modules.map(item => Object.assign(item, { enabled: chapter.modules.indexOf(item.key) > -1 || item.fixed })) })
    } else this.setData({ startDate: date.today() })
  },
  inputTitle(event) { this.setData({ title: event.detail.value }) },
  inputDescription(event) { this.setData({ description: event.detail.value }) },
  chooseType(event) { this.setData({ type: event.currentTarget.dataset.type }) },
  chooseStart(event) { this.setData({ startDate: event.detail.value }) },
  chooseEnd(event) { this.setData({ endDate: event.detail.value }) },
  toggleModule(event) {
    const key = event.currentTarget.dataset.key
    this.setData({ modules: this.data.modules.map(item => item.key === key && !item.fixed ? Object.assign(item, { enabled: !item.enabled }) : item) })
  },
  chooseCover() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], success: res => {
      const tempPath = res.tempFiles[0].tempFilePath
      wx.saveFile({ tempFilePath: tempPath, success: saved => this.setData({ cover: saved.savedFilePath }), fail: () => this.setData({ cover: tempPath }) })
    } })
  },
  save() {
    if (!this.data.title.trim()) return wx.showToast({ title: '先为这一章取个名字', icon: 'none' })
    const start = this.data.startDate
    const end = this.data.endDate || start
    const total = Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000) + 1)
    this.setData({ saving: true })
    const chapter = store.saveChapter({
      id: this.data.id || undefined, title: this.data.title.trim(), englishTitle: `${new Date(start).getFullYear()} · ${this.data.type.toUpperCase()}`,
      type: this.data.type, startDate: start, endDate: this.data.endDate, dateRange: `${date.displayDate(start)} — ${this.data.endDate ? date.displayDate(this.data.endDate) : '未定'}`,
      dayTotal: total, description: this.data.description.trim() || '这一章的故事，正在慢慢展开。', cover: this.data.cover,
      modules: this.data.modules.filter(item => item.enabled).map(item => item.key)
    })
    wx.showToast({ title: this.data.id ? '这一章已更新' : '新的一章开始了', icon: 'none' })
    setTimeout(() => wx.redirectTo({ url: `/pages/chapter/detail/index?id=${chapter.id}` }), 500)
  }
})
