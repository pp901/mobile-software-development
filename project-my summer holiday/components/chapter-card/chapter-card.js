Component({
  options:{styleIsolation:'apply-shared'},
  properties: { chapter: { type: Object, value: {} }, compact: { type: Boolean, value: false } },
  data: { imageFailed: false },
  observers: {
    'chapter.cover': function () { this.setData({ imageFailed: false }) }
  },
  methods: {
    open() { this.triggerEvent('open', { id: this.data.chapter.id }) },
    imageError() { this.setData({ imageFailed: true }) }
  }
})
