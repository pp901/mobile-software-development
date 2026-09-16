// The same fixed portrait composition is used by the on-page preview and export.
const WIDTH = 750
const HEIGHT = 1200
const PAPER = '#F5F2E9'
const INK = '#314C3D'

function wrap(ctx, value, x, y, width, size, lineHeight, maxLines) {
 ctx.setFontSize(size)
 const chars = Array.from(String(value || ''))
 let line = '', count = 0
 for (let index = 0; index < chars.length; index++) {
  const char = chars[index]
  if (char === '\n' || ctx.measureText(line + char).width > width) {
   if (count === maxLines - 1) {
    while (line && ctx.measureText(line + '…').width > width) line = Array.from(line).slice(0, -1).join('')
    ctx.fillText(line + '…', x, y)
    return y + lineHeight
   }
   ctx.fillText(line, x, y)
   y += lineHeight; count++; line = char === '\n' ? '' : char
  } else line += char
 }
 if (line) { ctx.fillText(line, x, y); y += lineHeight }
 return y
}
function rounded(ctx, x, y, width, height, radius) {
 ctx.beginPath()
 ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y)
 ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
 ctx.lineTo(x + width, y + height - radius)
 ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
 ctx.lineTo(x + radius, y + height)
 ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
 ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y)
 ctx.closePath()
}
function cover(ctx, info, x, y, width, height) {
 ctx.save()
 rounded(ctx, x, y, width, height, 12); ctx.clip()
 const scale = Math.max(width / info.width, height / info.height)
 const drawWidth = info.width * scale, drawHeight = info.height * scale
 ctx.drawImage(info.path, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
 ctx.restore()
}
function circle(ctx, x, y, radius, color) {
 ctx.setFillStyle(color); ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill()
}
function paint(ctx, model, photos) {
 ctx.setFillStyle(PAPER); ctx.fillRect(0, 0, WIDTH, HEIGHT)
 ctx.setFillStyle(INK); ctx.setFontSize(32); ctx.fillText('ongoing_', 46, 62)
 circle(ctx, 620, 51, 9, '#98B494'); circle(ctx, 650, 51, 9, '#D5A78B'); circle(ctx, 680, 51, 9, '#C6C0D7')
 ctx.setFillStyle('#8C967E'); ctx.setFontSize(19); ctx.fillText('A CHAPTER OF MY LIFE', 46, 110)
 ctx.setFillStyle(INK); wrap(ctx, model.title, 44, 177, 660, 49, 62, 2)
 ctx.setFillStyle('#859079'); ctx.setFontSize(22); ctx.fillText(model.dateRange, 46, 270)
 if (photos.length === 1) cover(ctx, photos[0], 46, 303, 658, 474)
 if (photos.length === 2) {
  cover(ctx, photos[0], 46, 303, 382, 474)
  cover(ctx, photos[1], 440, 303, 264, 474)
 }
 if (photos.length === 3) {
  cover(ctx, photos[0], 46, 303, 658, 286)
  cover(ctx, photos[1], 46, 601, 323, 176)
  cover(ctx, photos[2], 381, 601, 323, 176)
 }
 if (photos.length) {
  ctx.setFillStyle('#6E7E61'); wrap(ctx, model.excerpt, 48, 832, 652, 28, 42, 4)
 } else {
  ctx.setFillStyle('#E4E8D6'); rounded(ctx, 46, 309, 658, 647, 22); ctx.fill()
  circle(ctx, 614, 389, 43, '#D3DDC7'); circle(ctx, 642, 416, 27, '#E6C7AD')
  ctx.setFillStyle('#A9B294'); ctx.setFontSize(130); ctx.fillText('“', 72, 460)
  ctx.setFillStyle(INK); wrap(ctx, model.excerpt, 78, 512, 594, 36, 58, 6)
  ctx.setFillStyle('#8A9878'); ctx.setFontSize(20); ctx.fillText('有些日子，文字就能留下颜色。', 78, 906)
 }
 ctx.setStrokeStyle('#D6DDCB'); ctx.setLineWidth(1); ctx.beginPath(); ctx.moveTo(46, 1000); ctx.lineTo(704, 1000); ctx.stroke()
 const values = [model.momentCount, model.recordedDayCount, model.sharedCount]
 const labels = ['MOMENT', '个记录日', model.sharedCount ? '共同 MOMENT' : '共同视角，待续']
 values.forEach((value, index) => {
  const x = 46 + index * 228
  ctx.setFillStyle(INK); ctx.setFontSize(45); ctx.fillText(String(value).padStart(2, '0'), x, 1061)
  ctx.setFillStyle('#8A947F'); ctx.setFontSize(18); ctx.fillText(labels[index], x, 1093)
 })
 ctx.setFillStyle('#8B957E'); ctx.setFontSize(19); ctx.fillText('此刻很轻，时间会记得。', 46, 1161)
 ctx.setFillStyle('#42634D'); ctx.setFontSize(18); ctx.setTextAlign('right')
 ctx.fillText(model.ongoing ? 'TO BE CONTINUED →' : 'A CHAPTER TO KEEP', 704, 1161)
 ctx.setTextAlign('left')
}
function imageInfo(src, index) {
 return new Promise((resolve, reject) => wx.getImageInfo({
  src, success: info => info.width && info.height ? resolve(info) : reject(new Error('图片尺寸无效，请重新选择')),
  fail: () => reject(new Error('第 ' + (index + 1) + ' 张照片暂时无法读取，请重试或换一张'))
 }))
}
async function generate(page, model, selected) {
 const photos = await Promise.all(selected.map((item, index) => imageInfo(item.displayPath || item.path, index)))
 const ctx = wx.createCanvasContext('reviewPoster', page)
 paint(ctx, model, photos)
 await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('海报绘制超时，请重试')), 12000)
  ctx.draw(false, () => { clearTimeout(timer); resolve() })
 })
 return new Promise((resolve, reject) => wx.canvasToTempFilePath({
  canvasId: 'reviewPoster', width: WIDTH, height: HEIGHT, destWidth: WIDTH * 2, destHeight: HEIGHT * 2,
  fileType: 'png', success: result => resolve(result.tempFilePath), fail: () => reject(new Error('海报未能生成，请重试'))
 }, page))
}
module.exports = { generate, paint, wrap, WIDTH, HEIGHT }
