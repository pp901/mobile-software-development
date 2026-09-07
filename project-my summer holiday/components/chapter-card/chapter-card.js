Component({
  properties: { chapter: { type: Object, value: {} }, compact: { type: Boolean, value: false } },
  methods: { open() { this.triggerEvent('open', { id: this.data.chapter.id }) } }
})
