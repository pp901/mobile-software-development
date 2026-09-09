function pad(value) { return String(value).padStart(2, '0') }

function localDate(value) {
  if (!value) return new Date()
  if (value instanceof Date) return value
  const source = String(value)
  if (source.includes('T')) return new Date(source)
  const datePart = source.slice(0, 10)
  const parts = datePart.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date(value)
  return new Date(parts[0], parts[1] - 1, parts[2])
}

function dateKey(value) {
  const parsed = localDate(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}

function displayTime(value) {
  const parsed = localDate(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

function today() {
  const value = new Date()
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

function timeNow() {
  const value = new Date()
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`
}

function displayDate(value, withWeekday) {
  if (!value) return ''
  const parsed = localDate(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const base = `${parsed.getMonth() + 1}月${parsed.getDate()}日`
  if (!withWeekday) return base
  return `${base} 周${['日', '一', '二', '三', '四', '五', '六'][parsed.getDay()]}`
}

function daysBetween(start, end) {
  const first = localDate(start)
  const last = localDate(end)
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) return 1
  return Math.max(1, Math.floor((last - first) / 86400000) + 1)
}

function chapterTiming(chapter) {
  const current = localDate(today())
  const start = localDate(chapter.startDate || today())
  const hasEnd = !!chapter.endDate
  const end = localDate(chapter.endDate || today())
  const dayTotal = hasEnd ? daysBetween(start, end) : daysBetween(start, current)
  const elapsedEnd = current < start ? start : (hasEnd && current > end ? end : current)
  const dayCurrent = daysBetween(start, elapsedEnd)
  const progress = chapter.status === 'COMPLETED' ? 100 : (hasEnd ? Math.min(100, Math.max(0, Math.round(dayCurrent / dayTotal * 100))) : 0)
  return { dayTotal, dayCurrent, progress, isOverdue: chapter.status === 'ONGOING' && hasEnd && current > end }
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，收好此刻'
  if (hour < 11) return '早上好，今天也在继续'
  if (hour < 18) return '午后好，留心微小的光'
  return '晚上好，记下今天'
}

module.exports = { today, timeNow, localDate, dateKey, displayTime, displayDate, daysBetween, chapterTiming, greeting }
