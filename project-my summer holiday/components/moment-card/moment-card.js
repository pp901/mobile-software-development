Component({
  properties: { moment: { type: Object, value: {} }, layout: { type: String, value: 'row' } },
  methods: { open() { this.triggerEvent('open', { id: this.data.moment.id }) } }
})
