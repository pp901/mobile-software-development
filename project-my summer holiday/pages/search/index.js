const store = require('../../services/store')

Page({
  data: { keyword: '', chapters: [], moments: [], places: [], searched: false, noResults: false, suggestions: [] },
  input(event) { const keyword = event.detail.value; this.setData({ keyword }); this.runSearch(keyword) },
  clear() { this.setData({ keyword: '', chapters: [], moments: [], places: [], searched: false, noResults: false }) },
  useSuggestion(event) { const keyword = event.currentTarget.dataset.value; this.setData({ keyword }); this.runSearch(keyword) },
  runSearch(keyword) {
    const result = store.search(keyword)
    const searched = !!String(keyword).trim()
    this.setData({ chapters: result.chapters, moments: result.moments, places: result.places, searched, noResults: searched && !result.chapters.length && !result.moments.length && !result.places.length })
  },
  openChapter(event) { wx.navigateTo({ url: `/pages/chapter/detail/index?id=${event.detail.id}` }) },
  openMoment(event) { wx.navigateTo({ url: `/pages/moment/detail/index?id=${event.detail.id}` }) }
})
