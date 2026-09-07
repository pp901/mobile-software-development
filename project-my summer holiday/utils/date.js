function pad(value) { return String(value).padStart(2, '0') }
function today() {
  const date = new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
function timeNow() {
  const date = new Date()
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}
function displayDate(value) {
  if (!value) return ''
  const parts = value.split('-')
  return `${Number(parts[1])}月${Number(parts[2])}日`
}
function greeting() {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，也别忘记照顾自己'
  if (hour < 11) return '早上好，今天也在继续'
  if (hour < 18) return '午后好，留心那些微小的光'
  return '晚上好，收好今天的片刻'
}
module.exports = { today, timeNow, displayDate, greeting }
