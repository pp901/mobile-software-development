const date = require('../utils/date')

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const NEARBY_METERS = 80

function compareMomentsAsc(left, right) {
  const leftTime = date.timestamp(left && left.createdAt)
  const rightTime = date.timestamp(right && right.createdAt)
  if (leftTime === null && rightTime !== null) return 1
  if (leftTime !== null && rightTime === null) return -1
  const difference = (leftTime || 0) - (rightTime || 0)
  return difference || String(left.id || '').localeCompare(String(right.id || ''))
}

function compareMomentsDesc(left, right) {
  const leftTime = date.timestamp(left && left.createdAt)
  const rightTime = date.timestamp(right && right.createdAt)
  if (leftTime === null && rightTime !== null) return 1
  if (leftTime !== null && rightTime === null) return -1
  const difference = (rightTime || 0) - (leftTime || 0)
  return difference || String(left.id || '').localeCompare(String(right.id || ''))
}

function chapterRange(chapter) {
  return {
    start: date.dateKey(chapter && chapter.startDate),
    end: date.dateKey(chapter && chapter.endDate)
  }
}

function isDateInRange(key, range) {
  if (!date.isDateKey(key)) return false
  if (range.start && key < range.start) return false
  if (range.end && key > range.end) return false
  return true
}

function chooseCalendarMonth(chapter, validDateKeys, requestedMonth, todayKey) {
  if (date.isMonthKey(requestedMonth)) return requestedMonth
  const range = chapterRange(chapter)
  const startMonth = date.monthKey(range.start)
  const currentMonth = date.monthKey(todayKey)
  if (!validDateKeys.length) return startMonth || currentMonth

  const endMonth = date.monthKey(range.end)
  const currentInRange = !!currentMonth && (!startMonth || currentMonth >= startMonth) && (!endMonth || currentMonth <= endMonth)
  if (chapter && chapter.status === 'ONGOING' && currentInRange) return currentMonth
  return date.monthKey(validDateKeys[validDateKeys.length - 1]) || startMonth || currentMonth
}

function chooseSelectedDate(displayedMonth, requestedDate, momentDates, range, todayKey) {
  if (date.isDateKey(requestedDate) && date.monthKey(requestedDate) === displayedMonth) return requestedDate
  const datesInMonth = momentDates.filter(key => date.monthKey(key) === displayedMonth)
  if (datesInMonth.length) return datesInMonth[datesInMonth.length - 1]
  if (date.monthKey(todayKey) === displayedMonth && isDateInRange(todayKey, range)) return todayKey
  if (date.monthKey(range.start) === displayedMonth) return range.start
  const firstInRange = date.monthDays(displayedMonth).find(item => item.inMonth && isDateInRange(item.key, range))
  return firstInRange ? firstInRange.key : `${displayedMonth}-01`
}

function buildCalendarData(chapter, moments, options) {
  const settings = options || {}
  const todayKey = date.isDateKey(settings.todayKey) ? settings.todayKey : date.today()
  const range = chapterRange(chapter)
  const momentsByDate = {}
  let invalidMomentCount = 0

  ;(moments || []).forEach(moment => {
    const key = date.momentDateKey(moment)
    if (!key) {
      invalidMomentCount += 1
      return
    }
    if (!momentsByDate[key]) momentsByDate[key] = []
    momentsByDate[key].push(moment)
  })

  Object.keys(momentsByDate).forEach(key => momentsByDate[key].sort(compareMomentsAsc))
  const momentDates = Object.keys(momentsByDate).sort()
  const displayedMonth = chooseCalendarMonth(chapter, momentDates, settings.monthKey, todayKey)
  const selectedDateKey = chooseSelectedDate(displayedMonth, settings.selectedDateKey, momentDates, range, todayKey)
  const selectedMoments = (momentsByDate[selectedDateKey] || []).slice()
  const days = date.monthDays(displayedMonth).map(item => {
    const count = (momentsByDate[item.key] || []).length
    const isInChapter = isDateInRange(item.key, range)
    return Object.assign({}, item, {
      count,
      hasMoments: count > 0,
      countLabel: count > 9 ? '9+' : String(count || ''),
      isToday: item.key === todayKey,
      isSelected: item.key === selectedDateKey,
      isInChapter,
      // Historical data can contain a real Moment beyond an edited Chapter
      // range. Keep it readable while still styling the date as outside.
      isSelectable: isInChapter || count > 0
    })
  })

  return {
    weekdays: WEEKDAYS.slice(),
    monthKey: displayedMonth,
    monthLabel: date.displayMonth(displayedMonth),
    previousMonthKey: date.shiftMonth(displayedMonth, -1),
    nextMonthKey: date.shiftMonth(displayedMonth, 1),
    selectedDateKey,
    selectedDateLabel: date.displayDate(selectedDateKey, true),
    selectedMomentCount: selectedMoments.length,
    selectedMoments,
    days,
    hasMoments: momentDates.length > 0,
    validMomentCount: (moments || []).length - invalidMomentCount,
    invalidMomentCount
  }
}

function isValidCoordinatePair(moment) {
  const latitude = moment && moment.latitude
  const longitude = moment && moment.longitude
  return typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    typeof longitude === 'number' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
}

function isMapMoment(moment) {
  return !!String(moment && moment.location || '').trim() && isValidCoordinatePair(moment)
}

function placeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s·•,，。/\\_-]+/g, '')
}

function distanceInMeters(first, second) {
  const radians = value => value * Math.PI / 180
  const earthRadius = 6371000
  const latDistance = radians(second.latitude - first.latitude)
  const lonDistance = radians(second.longitude - first.longitude)
  const firstLatitude = radians(first.latitude)
  const secondLatitude = radians(second.latitude)
  const latSine = Math.sin(latDistance / 2)
  const lonSine = Math.sin(lonDistance / 2)
  const value = Math.min(1, latSine * latSine + lonSine * lonSine * Math.cos(firstLatitude) * Math.cos(secondLatitude))
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function stableHash(value) {
  let hash = 2166136261
  const source = String(value || '')
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function placeDateLabel(moments) {
  const keys = moments.map(item => date.momentDateKey(item)).filter(Boolean).sort()
  if (!keys.length) return '日期未知'
  if (keys[0] === keys[keys.length - 1]) return date.displayDate(keys[0])
  return `${date.displayDate(keys[0])} - ${date.displayDate(keys[keys.length - 1])}`
}

function buildMapData(moments, selectedPlaceId) {
  const source = (moments || []).filter(isMapMoment).slice().sort(compareMomentsDesc)
  const groups = []

  source.forEach(moment => {
    const key = placeKey(moment.location)
    const existing = groups.find(group => group.placeKey === key || distanceInMeters(group, moment) <= NEARBY_METERS)
    if (existing) {
      existing.moments.push(moment)
      const size = existing.moments.length
      existing.latitude = ((existing.latitude * (size - 1)) + moment.latitude) / size
      existing.longitude = ((existing.longitude * (size - 1)) + moment.longitude) / size
      return
    }
    groups.push({
      placeKey: key,
      name: String(moment.location).trim(),
      latitude: moment.latitude,
      longitude: moment.longitude,
      moments: [moment]
    })
  })

  groups.forEach((group, index) => {
    group.id = `place-${stableHash(`${group.placeKey}:${group.latitude.toFixed(5)}:${group.longitude.toFixed(5)}`)}`
    group.markerId = index + 1
    group.moments.sort(compareMomentsAsc)
    group.momentCount = group.moments.length
    group.momentCountLabel = `${group.momentCount} Moment${group.momentCount === 1 ? '' : 's'}`
    group.dateLabel = placeDateLabel(group.moments)
    group.cover = (group.moments.find(item => item.image) || {}).image || ''
  })

  const selectedIndex = Math.max(0, groups.findIndex(group => group.id === selectedPlaceId))
  const selectedPlace = groups[selectedIndex] || null
  const markers = groups.map(group => ({
    id: group.markerId,
    latitude: group.latitude,
    longitude: group.longitude,
    iconPath: group.id === (selectedPlace && selectedPlace.id)
      ? '/assets/icons/map-marker-selected.png'
      : (group.momentCount > 1 ? '/assets/icons/map-marker-cluster.png' : '/assets/icons/map-marker.png'),
    width: group.id === (selectedPlace && selectedPlace.id) ? 38 : 32,
    height: group.id === (selectedPlace && selectedPlace.id) ? 38 : 32,
    anchor: { x: 0.5, y: 1 },
    callout: {
      content: `${group.name}\n${group.momentCountLabel}`,
      display: 'BYCLICK',
      padding: 8,
      borderRadius: 10,
      fontSize: 12,
      color: '#20201e',
      bgColor: '#faf9f6'
    }
  }))

  return {
    groups,
    markers,
    includePoints: groups.map(group => ({ latitude: group.latitude, longitude: group.longitude })),
    selectedIndex,
    selectedPlaceId: selectedPlace ? selectedPlace.id : '',
    selectedPlace,
    center: selectedPlace ? { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude } : null,
    scale: groups.length === 1 ? 14 : 11,
    hasPlaces: groups.length > 0,
    validMomentCount: source.length,
    excludedMomentCount: (moments || []).length - source.length
  }
}

module.exports = {
  WEEKDAYS,
  NEARBY_METERS,
  buildCalendarData,
  buildMapData,
  isValidCoordinatePair,
  isMapMoment,
  distanceInMeters,
  compareMomentsAsc,
  compareMomentsDesc
}
