// pages/game/game.js —— 推箱子游戏页
const data = require('../../utils/data.js')
const store = require('../../utils/store.js')

Page({
  data: {
    level: 1,
    levelName: '',
    steps: 0,
    par: 0,
    bestText: '—',
    placed: 0,
    total: 0,
    dotsArr: [],
    cvSize: 320,
    canUndo: false,
    undosLeft: 3,
    started: false,
    boardError: false
  },

  onLoad(options) {
    const level = Math.min(data.levels.length, Math.max(1, parseInt(options.level, 10) || 1))
    const lv = data.levels[level - 1]
    this.levelNo = level
    this.level = lv
    this.origMap = lv.map.map(row => row.slice())

    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    // 棋盘尺寸按屏宽比例计算（框体 padding 均为 rpx，避免 px/rpx 混算导致不居中）
    const size = Math.min(440, Math.floor(info.windowWidth * 0.84))

    const total = this.origMap.reduce(function (s, row) {
      return s + row.filter(function (v) { return v === 4 }).length
    }, 0)
    const dotsArr = []
    for (let i = 0; i < total; i++) dotsArr.push(i)

    const prog = store.getProgress()
    const st = prog.stats[level]

    this.setData({
      level: level,
      levelName: lv.name,
      par: lv.par,
      total: total,
      dotsArr: dotsArr,
      bestText: st ? st.best + ' 步' : '—',
      cvSize: size,
      started: false,
      boardError: false
    })

    wx.setNavigationBarTitle({ title: '第' + level + '关 · ' + lv.name })
  },

  onReady() {
    this.setupCanvas(0)
  },

  // 画布初始化（带重试：节点偶发查询失败时不至于白屏）
  setupCanvas(attempt) {
    wx.createSelectorQuery()
      .select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec(res => {
        const r = res && res[0]
        if (!r || !r.node) {
          if (attempt < 5) {
            setTimeout(() => this.setupCanvas(attempt + 1), 300)
          } else {
            console.error('canvas 节点获取失败')
            this.setData({ boardError: true })
          }
          return
        }
        try {
          const node = r.node
          const width = r.size && r.size.width > 0 ? r.size.width : this.data.cvSize
          const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
          const dpr = info.pixelRatio || 2
          node.width = width * dpr
          node.height = width * dpr
          const ctx = node.getContext('2d')
          ctx.scale(dpr, dpr)
          this.canvas = node
          this.ctx = ctx
          this.block = width / 8
        } catch (e) {
          console.error('canvas 初始化异常：', e)
          this.setData({ boardError: true })
          return
        }
        // 图片异步加载，不阻塞棋盘绘制（未加载完时用同色系色块兜底）
        this.loadImages(() => {
          this.imgsReady = true
          this.drawCanvas()
        })
        this.ready = true
        this.initMap()
      })
  },

  retryBoard() {
    this.setData({ boardError: false })
    this.setupCanvas(0)
  },

  // 预加载全部素材图片
  loadImages(cb) {
    const names = ['ice', 'stone', 'pig', 'box', 'bird']
    this.imgs = {}
    let pending = names.length
    names.forEach(nm => {
      const img = this.canvas.createImage()
      img.onload = () => {
        if (--pending === 0) cb()
      }
      img.onerror = () => {
        console.error('图片加载失败：', nm)
        if (--pending === 0) cb()
      }
      img.src = '/images/icons/' + nm + '.png'
      this.imgs[nm] = img
    })
  },

  // 初始化地图：从原始地图中解析箱子和小鸟的位置
  initMap() {
    this.map = this.origMap.map(row => row.slice())
    this.boxes = []
    this.bird = null
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.map[r][c] === 4) {
          this.boxes.push({ r: r, c: c })
          this.map[r][c] = 1
        } else if (this.map[r][c] === 5) {
          this.bird = { r: r, c: c, facing: 'right' }
          this.map[r][c] = 1
        }
      }
    }
    this.history = []
    this.steps = 0
    this.won = false
    this.animating = false
    this.pending = null
    this.popBox = null

    // 计算地图内容的包围盒，绘制时整体居中
    let minR = 8, maxR = -1, minC = 8, maxC = -1
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.origMap[r][c] !== 0) {
          if (r < minR) minR = r
          if (r > maxR) maxR = r
          if (c < minC) minC = c
          if (c > maxC) maxC = c
        }
      }
    }
    this.offR = Math.floor((8 - (maxR - minR + 1)) / 2) - minR
    this.offC = Math.floor((8 - (maxC - minC + 1)) / 2) - minC

    this.setData({
      steps: 0,
      placed: this.placedCount(),
      canUndo: false,
      undosLeft: 3
    })
    this.drawCanvas()
  },

  // 绘制游戏画面（anim 传入时对移动中的小鸟/箱子做插值定位）
  drawCanvas(anim) {
    if (!this.ctx) return
    const ctx = this.ctx
    const B = this.block
    const S = this.data.cvSize
    ctx.clearRect(0, 0, S, S)

    // 箱子占位表：底图绘制时用于让被箱子压住的猪隐藏
    const boxAt = {}
    this.boxes.forEach(b => {
      boxAt[b.r + ',' + b.c] = true
    })
    // 居中偏移
    const X = c => (c + this.offC) * B
    const Y = r => (r + this.offR) * B

    // 底图：冰面 / 石墙 / 终点小猪（被箱子压住的小猪不再绘制）
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const v = this.map[r][c]
        if (v === 1 || v === 3) this.drawImg('ice', X(c), Y(r), B)
        if (v === 3 && !boxAt[r + ',' + c]) this.drawImg('pig', X(c), Y(r), B)
        if (v === 2) this.drawImg('stone', X(c), Y(r), B)
      }
    }

    // 箱子层
    this.boxes.forEach((b, i) => {
      let x = X(b.c)
      let y = Y(b.r)
      let scale = 1
      let moving = false
      if (anim && anim.box && anim.box.idx === i) {
        x = this.lerp(X(anim.box.fc), X(anim.box.tc), anim.p)
        y = this.lerp(Y(anim.box.fr), Y(anim.box.tr), anim.p)
        moving = true
      } else if (this.popBox && this.popBox.idx === i) {
        const t = (Date.now() - this.popBox.t0) / 280
        if (t >= 1) {
          this.popBox = null
        } else {
          scale = 1 + 0.14 * Math.sin(Math.PI * t)
        }
      }
      if (scale !== 1) {
        ctx.save()
        ctx.translate(x + B / 2, y + B / 2)
        ctx.scale(scale, scale)
        this.drawImgCenter('box', B)
        ctx.restore()
      } else {
        this.drawImg('box', x, y, B)
      }
      // 已归位的箱子加一圈描边作为反馈
      if (!moving && this.origMap[b.r][b.c] === 3) {
        ctx.strokeStyle = 'rgba(255, 201, 60, 0.95)'
        ctx.lineWidth = 3
        ctx.strokeRect(x + 2, y + 2, B - 4, B - 4)
      }
    })

    // 小鸟层（朝左时水平翻转；移动时有挤压拉伸）
    let bx = X(this.bird.c)
    let by = Y(this.bird.r)
    let sx = 1
    let sy = 1
    if (anim) {
      bx = this.lerp(X(anim.bird.fc), X(anim.bird.tc), anim.p)
      by = this.lerp(Y(anim.bird.fr), Y(anim.bird.tr), anim.p)
      const s = Math.sin(Math.PI * anim.p)
      if (anim.bird.fc !== anim.bird.tc) {
        sx = 1 + 0.12 * s
        sy = 1 - 0.1 * s
      } else {
        sy = 1 + 0.12 * s
        sx = 1 - 0.1 * s
      }
    }
    ctx.save()
    ctx.translate(bx + B / 2, by + B / 2)
    ctx.scale(this.bird.facing === 'left' ? -sx : sx, sy)
    this.drawImgCenter('bird', B)
    ctx.restore()
  },

  // 带兜底的图片绘制（素材缺失时画同色系色块，保证游戏不中断）
  drawImg(name, x, y, s) {
    const img = this.imgs[name]
    if (img && img.width > 0) {
      this.ctx.drawImage(img, x, y, s, s)
    } else {
      const colors = { ice: '#bfe8f2', stone: '#909090', pig: '#60d848', box: '#c07830', bird: '#c00018' }
      this.ctx.fillStyle = colors[name] || '#ccc'
      this.ctx.fillRect(x, y, s, s)
    }
  },

  drawImgCenter(name, s) {
    const img = this.imgs[name]
    if (img && img.width > 0) {
      this.ctx.drawImage(img, -s / 2, -s / 2, s, s)
    } else {
      const colors = { box: '#c07830', bird: '#c00018' }
      this.ctx.fillStyle = colors[name] || '#ccc'
      this.ctx.beginPath()
      this.ctx.arc(0, 0, s / 3, 0, Math.PI * 2)
      this.ctx.fill()
    }
  },

  lerp(a, b, p) {
    return a + (b - a) * p
  },

  // 点击开始游戏
  startGame() {
    this.setData({ started: true })
    wx.vibrateShort({ type: 'light', fail: () => {} })
  },

  // 移动逻辑：dr/dc 为位移方向
  move(dr, dc) {
    if (!this.ready || this.won || !this.data.started) return
    // 动画进行中缓存一次输入，动画结束后立即执行（连招手感）
    if (this.animating) {
      this.pending = [dr, dc]
      return
    }
    const r = this.bird.r
    const c = this.bird.c
    const nr = r + dr
    const nc = c + dc

    // 越界判断
    if (nr < 0 || nr > 7 || nc < 0 || nc > 7) return
    const cell = this.map[nr][nc]
    // 小鸟只能走冰面（1）；石墙(2)、墙外(0)、有猪的终点(3)都不可进入
    if (cell !== 1) return

    const boxIdx = this.boxes.findIndex(b => b.r === nr && b.c === nc)
    let target = null
    let landed = false

    if (boxIdx > -1) {
      // 推箱子判断：箱子前方不能是墙 / 空白 / 另一个箱子
      const br = nr + dr
      const bc = nc + dc
      if (br < 0 || br > 7 || bc < 0 || bc > 7) return
      const bcell = this.map[br][bc]
      if (bcell === 0 || bcell === 2) return
      if (this.boxes.some(b => b.r === br && b.c === bc)) return
      target = { idx: boxIdx, r: br, c: bc }
      landed = this.origMap[br][bc] === 3
    }

    // 记录快照供撤销使用
    this.history.push({
      bird: { r: r, c: c, facing: this.bird.facing },
      boxes: this.boxes.map(b => ({ r: b.r, c: b.c })),
      steps: this.steps
    })
    if (this.history.length > 300) this.history.shift()

    if (dc !== 0) this.bird.facing = dc > 0 ? 'right' : 'left'
    this.bird.r = nr
    this.bird.c = nc
    const anim = { bird: { fr: r, fc: c, tr: nr, tc: nc } }
    if (target) {
      const b = this.boxes[target.idx]
      anim.box = { idx: target.idx, fr: b.r, fc: b.c, tr: target.r, tc: target.c }
      b.r = target.r
      b.c = target.c
    }

    // 150ms 补间动画
    this.animating = true
    this.popBox = null
    this.runTween(anim, () => {
      this.animating = false
      this.steps++
      if (target) {
        if (landed) {
          wx.vibrateShort({ type: 'medium', fail: () => {} })
          this.startPop(target.idx)
        } else {
          wx.vibrateShort({ type: 'light', fail: () => {} })
          if (this.isDeadlockAt(target.r, target.c)) this.warnDeadlock()
        }
      }
      this.setData({
        steps: this.steps,
        placed: this.placedCount(),
        canUndo: this.history.length > 0
      })
      this.checkWin()
      if (!this.won && this.pending) {
        const pd = this.pending
        this.pending = null
        this.move(pd[0], pd[1])
      }
    })
  },

  runTween(anim, done) {
    if (!this.canvas) {
      done()
      return
    }
    const t0 = Date.now()
    const dur = 150
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / dur)
      anim.p = 1 - (1 - p) * (1 - p)
      this.drawCanvas(anim)
      if (p < 1) {
        this.canvas.requestAnimationFrame(step)
      } else {
        this.drawCanvas()
        done()
      }
    }
    this.canvas.requestAnimationFrame(step)
  },

  // 箱子归位时的弹跳动效
  startPop(idx) {
    if (!this.canvas) return
    this.popBox = { idx: idx, t0: Date.now() }
    let frames = 0
    const loop = () => {
      if (!this.popBox || this.won) {
        this.drawCanvas()
        return
      }
      frames++
      if (Date.now() - this.popBox.t0 > 280 || frames > 30) {
        this.popBox = null
        this.drawCanvas()
        return
      }
      this.drawCanvas()
      this.canvas.requestAnimationFrame(loop)
    }
    this.canvas.requestAnimationFrame(loop)
  },

  // 死局检测：2x2 的墙/箱死块中存在未归位箱子即无解
  isDeadlockAt(r, c) {
    if (this.origMap[r][c] === 3) return false
    const that = this
    const solid = function (rr, cc) {
      if (rr < 0 || rr > 7 || cc < 0 || cc > 7) return true
      const v = that.map[rr][cc]
      return v === 0 || v === 2 || that.boxes.some(function (b) { return b.r === rr && b.c === cc })
    }
    const drs = [-1, 1]
    const dcs = [-1, 1]
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const dr = drs[i]
        const dc = dcs[j]
        if (solid(r + dr, c) && solid(r, c + dc) && solid(r + dr, c + dc)) {
          const cells = [[r, c], [r + dr, c], [r, c + dc], [r + dr, c + dc]]
          const stuck = cells.some(function (cell) {
            const rr = cell[0]
            const cc = cell[1]
            return that.boxes.some(function (b) { return b.r === rr && b.c === cc }) &&
              that.origMap[rr][cc] !== 3
          })
          if (stuck) return true
        }
      }
    }
    return false
  },

  warnDeadlock() {
    wx.vibrateShort({ type: 'light', fail: () => {} })
    wx.showToast({ title: '箱子卡住啦，撤销或重开试试', icon: 'none', duration: 2200 })
  },

  // 四个方向键（与教程章节保持一致的函数名）
  up() {
    this.move(-1, 0)
  },
  down() {
    this.move(1, 0)
  },
  left() {
    this.move(0, -1)
  },
  right() {
    this.move(0, 1)
  },

  // 棋盘滑动手势操作
  onTouchStart(e) {
    if (e.touches && e.touches[0]) {
      this.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  },
  onTouchMove() {},
  onTouchEnd(e) {
    if (!this.touchStart || !e.changedTouches || !e.changedTouches[0]) return
    const dx = e.changedTouches[0].clientX - this.touchStart.x
    const dy = e.changedTouches[0].clientY - this.touchStart.y
    this.touchStart = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    if (Math.abs(dx) > Math.abs(dy)) {
      this.move(0, dx > 0 ? 1 : -1)
    } else {
      this.move(dy > 0 ? 1 : -1, 0)
    }
  },

  // 撤销一步（每关仅 3 次机会，用完只能重新开始）
  undo() {
    if (!this.data.started || this.won || this.animating || !this.history || this.history.length === 0) return
    if (this.data.undosLeft <= 0) {
      wx.showToast({ title: '撤销机会已用完，重新开始吧', icon: 'none' })
      return
    }
    const s = this.history.pop()
    this.bird = { r: s.bird.r, c: s.bird.c, facing: s.bird.facing }
    this.boxes = s.boxes.map(b => ({ r: b.r, c: b.c }))
    this.steps = s.steps
    this.pending = null
    this.popBox = null
    this.setData({
      steps: this.steps,
      placed: this.placedCount(),
      canUndo: this.history.length > 0,
      undosLeft: this.data.undosLeft - 1
    })
    this.drawCanvas()
  },

  // 重新开始（带确认，防误触）
  onRestartTap() {
    if (this.steps > 0 && !this.won) {
      wx.showModal({
        title: '重新开始',
        content: '当前进度将丢失，确定要重开吗？',
        confirmText: '重开',
        cancelText: '继续玩',
        success: res => {
          if (res.confirm) this.restartGame()
        }
      })
    } else {
      this.restartGame()
    }
  },

  // 重新开始本关（与教程章节保持一致的函数名）
  restartGame() {
    this.initMap()
  },

  goIndex() {
    wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/index/index' }) })
  },

  placedCount() {
    return this.boxes.filter(b => this.origMap[b.r][b.c] === 3).length
  },

  // 胜负判断
  isWin() {
    return this.boxes.every(b => this.origMap[b.r][b.c] === 3)
  },

  checkWin() {
    if (this.isWin()) {
      this.won = true
      this.onWin()
    }
  },

  onWin() {
    const lv = this.level
    const stars = this.steps <= lv.par ? 3 : this.steps <= lv.par2 ? 2 : 1
    const newBest = store.recordWin(this.levelNo, data.levels.length, stars, this.steps)
    wx.vibrateShort({ type: 'heavy', fail: () => {} })
    this.confetti()

    const starText = '★'.repeat(stars) + '☆'.repeat(3 - stars)
    setTimeout(() => {
      wx.showModal({
        title: '恭喜，游戏成功！',
        content:
          '第' + this.levelNo + '关「' + lv.name + '」通关\n' +
          this.steps + ' 步（目标 ' + lv.par + ' 步） · ' + starText +
          (newBest ? '\n刷新了最佳纪录' : ''),
        confirmText: this.levelNo < data.levels.length ? '下一关' : '返回选关',
        cancelText: '再玩一次',
        success: res => {
          if (res.confirm) {
            if (this.levelNo < data.levels.length) {
              wx.redirectTo({ url: '/pages/game/game?level=' + (this.levelNo + 1) })
            } else {
              this.goIndex()
            }
          } else {
            this.restartGame()
          }
        }
      })
    }, 1100)
  },

  // 通关撒花粒子特效
  confetti() {
    if (!this.canvas || !this.ctx) return
    const S = this.data.cvSize
    const ctx = this.ctx
    const colors = ['#ff5a4e', '#ffc93c', '#58c24f', '#c07830', '#ffffff', '#4fc3f7']
    const parts = []
    for (let i = 0; i < 80; i++) {
      parts.push({
        x: Math.random() * S,
        y: -20 - Math.random() * S * 0.6,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 2.5,
        s: 4 + Math.random() * 6,
        c: colors[i % colors.length],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.4
      })
    }
    const t0 = Date.now()
    const dur = 1900
    const maxFrames = 130
    let frames = 0
    const frame = () => {
      this.drawCanvas()
      frames++
      parts.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.c
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6)
        ctx.restore()
      })
      if (Date.now() - t0 < dur && frames < maxFrames && this.canvas) {
        this.canvas.requestAnimationFrame(frame)
      } else {
        this.drawCanvas()
      }
    }
    this.canvas.requestAnimationFrame(frame)
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '推箱子第' + this.levelNo + '关我只用 ' + this.steps + ' 步，来挑战',
      path: '/pages/index/index'
    }
  }
})
