const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function todayLocal() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function startOfWeek() {
  const today = todayLocal()
  const day = today.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff)
}

function startOfMonth() {
  const today = todayLocal()
  return new Date(today.getFullYear(), today.getMonth(), 1)
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDateShort(d) {
  return SHORT_MONTHS[d.getMonth()] + ' ' + d.getDate()
}

export default function Stats({ expenses }) {
  const today = todayLocal()
  const weekStart = startOfWeek()
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)
  const monthStart = startOfMonth()

  const weekTotal = expenses.reduce((sum, e) => {
    const d = parseLocalDate(e.date)
    return d >= weekStart && d <= weekEnd ? sum + Number(e.amount) : sum
  }, 0)

  const monthTotal = expenses.reduce((sum, e) => {
    const d = parseLocalDate(e.date)
    return d >= monthStart && d <= today ? sum + Number(e.amount) : sum
  }, 0)

  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-label">This Week</div>
        <div className="stat-amount">{fmt(weekTotal)}</div>
        <div className="stat-range">
          {formatDateShort(weekStart)} – {formatDateShort(weekEnd)}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">This Month</div>
        <div className="stat-amount">{fmt(monthTotal)}</div>
        <div className="stat-range">
          {MONTHS[today.getMonth()]} {today.getFullYear()}
        </div>
      </div>
    </div>
  )
}
