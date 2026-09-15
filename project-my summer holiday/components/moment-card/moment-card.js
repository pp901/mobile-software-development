Component({
  properties: {
    moment: { type: Object, value: {}, observer() { this.setData({ imageFailed: false }) } },
    layout: { type: String, value: 'row' }
  },
  data: { imageFailed: false },
  methods: {
    open() { this.triggerEvent('open', { id: this.data.moment.id }) },
    imageError() { this.setData({ imageFailed: true }) }
  }
})
