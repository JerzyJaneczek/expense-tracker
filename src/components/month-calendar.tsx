"use client"

import { daysInMonth, todayISO } from "@/lib/format"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const whole = new Intl.NumberFormat("en-HK", { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat("en-HK", { notation: "compact", maximumFractionDigits: 1 })

/** Short amount that fits a phone-width calendar cell: 1,234 or 12.3K. */
function shortAmount(n: number) {
  return Math.abs(n) >= 10_000 ? compact.format(n) : whole.format(n)
}

/**
 * A month grid (Mon–Sun) with each day's total. Cells are shaded by amount
 * (darker = more), and the number is always printed so colour isn't needed to read it.
 */
export function MonthCalendar({
  month,
  totals,
  selectedDay,
  onSelectDay,
}: {
  month: string
  /** Total per day of month (1-based). Days without entries can be missing. */
  totals: Map<number, number>
  selectedDay: number | null
  onSelectDay: (day: number | null) => void
}) {
  const [y, m] = month.split("-").map(Number)
  const days = daysInMonth(month)
  // getDay(): 0 = Sunday; shift so Monday is the first column
  const leadingBlanks = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const max = Math.max(0, ...[...totals.values()].map(Math.abs))
  const today = todayISO()

  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ]

  return (
    <div className="grid gap-1">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />
          const total = totals.get(day) ?? 0
          const date = `${month}-${String(day).padStart(2, "0")}`
          // 12%–60% tint of the series blue, scaled to the busiest day
          const strength = total && max ? 12 + Math.round((Math.abs(total) / max) * 48) : 0
          const selected = selectedDay === day
          return (
            <button
              key={day}
              type="button"
              aria-pressed={selected}
              aria-label={`${date}: ${total ? whole.format(total) : "nothing"}`}
              title={total ? `HK$${whole.format(total)}` : undefined}
              onClick={() => onSelectDay(selected ? null : day)}
              className={cn(
                "flex aspect-square min-h-11 flex-col items-start justify-between rounded-md border p-1 text-left transition-colors sm:aspect-[4/3] sm:p-1.5",
                total ? "border-transparent" : "border-border/60 hover:bg-muted",
                date === today && "border-foreground/40",
                selected && "ring-2 ring-foreground"
              )}
              style={
                strength
                  ? { backgroundColor: `color-mix(in oklab, #2a78d6 ${strength}%, transparent)` }
                  : undefined
              }
            >
              <span
                className={cn(
                  "text-[11px] leading-none text-muted-foreground sm:text-xs",
                  date === today && "font-bold text-foreground"
                )}
              >
                {day}
              </span>
              {total !== 0 && (
                <span className="w-full truncate text-right text-[11px] font-semibold tabular-nums sm:text-sm">
                  {shortAmount(total)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
