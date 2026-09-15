function pad(value) { return String(value).padStart(2, '0') }

function parseDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''))
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(year, month - 1, day)
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null
  return parsed
}

function isDateKey(value) { return !!parseDateKey(value) }

function localDate(value) {
  if (value instanceof Date) return new Date(value.getTime())
  if (value === undefined || value === null || value === '') return new Date(NaN)
  const source = String(value).trim()
  const naturalDay = parseDateKey(source)
  return naturalDay || new Date(value)
}

function dateKey(value) {
  if (isDateKey(value)) return String(value)
  const parsed = localDate(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}

// New Moments persist localDateKey at creation time. Older data falls back to
// converting createdAt into the current device's local natural day.
function momentDateKey(moment) {
  if (!moment) return ''
  if (isDateKey(moment.localDateKey)) return moment.localDateKey
  return dateKey(moment.createdAt)
}

function monthKey(value) {
  const key = isDateKey(value) ? String(value) : dateKey(value)
  return key ? key.slice(0, 7) : ''
}

function isMonthKey(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''))
  if (!match) return false
  const month = Number(match[2])
  return month >= 1 && month <= 12
}

function shiftMonth(value, amount) {
  if (!isMonthKey(value)) return ''
  const [year, month] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1 + Number(amount || 0), 1)
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}`
}

function monthDays(value) {
  if (!isMonthKey(value)) return []
  const [year, month] = value.split('-').map(Number)
  const first = new Date(year, month - 1, 1, 12)
  const leading = (first.getDay() + 6) % 7
  const count = new Date(year, month, 0).getDate()
  const cellCount = Math.ceil((leading + count) / 7) * 7
  return Array.from({ length: cellCount }, (_, index) => {
    const parsed = new Date(year, month - 1, 1 - leading + index, 12)
    const key = dateKey(parsed)
    return { key, day: parsed.getDate(), monthKey: key.slice(0, 7), inMonth: parsed.getMonth() === month - 1 }
  })
}

function displayMonth(value) {
  if (!isMonthKey(value)) return ''
  const [year, month] = value.split('-').map(Number)
  return `${year}年${month}月`
}

function timestamp(value) {
  const parsed = localDate(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
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
  return Math.max(1, Math.round((last - first) / 86400000) + 1)
}

function chapterTiming(chapter) {
  const current = localDate(today())
  const parsedStart = localDate(chapter.startDate)
  const start = Number.isNaN(parsedStart.getTime()) ? current : parsedStart
  const parsedEnd = localDate(chapter.endDate)
  const hasEnd = !!chapter.endDate && !Number.isNaN(parsedEnd.getTime())
  const end = hasEnd ? parsedEnd : current
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

module.exports = {
  today, timeNow, localDate, parseDateKey, isDateKey, dateKey, momentDateKey, monthKey, isMonthKey,
  shiftMonth, monthDays, displayMonth, timestamp, displayTime, displayDate, daysBetween, chapterTiming, greeting
}
