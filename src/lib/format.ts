const hkd = new Intl.NumberFormat("en-HK", { style: "currency", currency: "HKD" })

export function formatHKD(amount: number) {
  return hkd.format(amount)
}

/** Month keys are "YYYY-MM" strings, which avoids time-zone surprises. */
export function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function todayISO() {
  const d = new Date()
  return `${currentMonth()}-${String(d.getDate()).padStart(2, "0")}`
}

export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number)
  const total = y * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`
}

export function daysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number)
  return new Date(y, m, 0).getDate()
}

/** First day of the month, as YYYY-MM-DD. */
export function monthStart(month: string) {
  return `${month}-01`
}

/** Inclusive list of month keys from `from` to `to`. */
export function monthRange(from: string, to: string) {
  const months: string[] = []
  for (let m = from; m <= to; m = addMonths(m, 1)) months.push(m)
  return months
}

export function formatMonth(month: string, style: "long" | "short" = "long") {
  const [y, m] = month.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
    month: style,
    year: style === "long" ? "numeric" : "2-digit",
  })
}

export function formatDay(date: string) {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}
