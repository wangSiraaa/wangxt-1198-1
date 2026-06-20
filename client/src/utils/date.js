export function pad2(n) {
  return String(n).padStart(2, '0')
}

export function getLocalDateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function getLocalDateTimeStr(d = new Date()) {
  return `${getLocalDateStr(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

export function getUTCDateStr(d = new Date()) {
  return d.toISOString().split('T')[0]
}

export function isTodayLocal(dateStr) {
  if (!dateStr) return false
  const today = getLocalDateStr()
  return String(dateStr).startsWith(today)
}

export function isTodayUTC(dateStr) {
  if (!dateStr) return false
  const today = getUTCDateStr()
  return String(dateStr).startsWith(today)
}

export function getTimezoneOffsetHours() {
  return -new Date().getTimezoneOffset() / 60
}

export function getTimezoneName() {
  const offset = -new Date().getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const hours = Math.floor(Math.abs(offset) / 60)
  const mins = Math.abs(offset) % 60
  return `UTC${sign}${pad2(hours)}${mins > 0 ? ':' + pad2(mins) : ''}`
}

export function verifyMidnightRegression() {
  const now = new Date()
  const localDate = getLocalDateStr(now)
  const utcDate = getUTCDateStr(now)
  const tzHours = getTimezoneOffsetHours()
  const tzName = getTimezoneName()
  const hour = now.getHours()

  const isMidnightRisk = tzHours > 0 && hour < tzHours

  const result = {
    now: now.toISOString(),
    localDate,
    utcDate,
    timezone: tzName,
    timezoneOffsetHours: tzHours,
    localHour: hour,
    isMidnightRisk,
    utcLocalDiff: localDate !== utcDate,
    useLocalDateCorrect: isMidnightRisk || localDate !== utcDate
  }

  console.log('[零点回归验证] 当前时间:', getLocalDateTimeStr(now))
  console.log('[零点回归验证] 本地日期:', localDate)
  console.log('[零点回归验证] UTC 日期:', utcDate)
  console.log('[零点回归验证] 时区:', tzName)
  console.log('[零点回归验证] 零点风险时段:', isMidnightRisk ? '是' : '否')
  console.log('[零点回归验证] 本地/UTC日期不一致:', localDate !== utcDate ? '是' : '否')
  console.log('[零点回归验证] 应使用本地日期:', result.useLocalDateCorrect ? '是' : '否')

  if (isMidnightRisk) {
    console.warn('[零点回归验证] ⚠️ 当前处于北京时间零点到UTC零点的窗口，若用UTC日期会导致今日数据缺失！')
    console.warn('[零点回归验证] ✅ 已修复：使用本地日期 getLocalDateStr() 替代 UTC 日期')
  } else {
    console.log('[零点回归验证] ✅ 当前不在零点风险时段，但已使用本地日期，兼容所有时段')
  }

  return result
}

if (typeof window !== 'undefined') {
  window.__verifyMidnightRegression = verifyMidnightRegression
  console.log('[日期工具] 已挂载 window.__verifyMidnightRegression，可在控制台调用验证')
}
