"use client"

import { useTags } from "@/components/tags-provider"
import { formatHKD } from "@/lib/format"
import type { Entry } from "@/lib/types"

/** Expense totals per category as a ranked bar list, each bar labelled with its value. */
export function CategoryBreakdown({ entries }: { entries: Entry[] }) {
  const { byId } = useTags()

  const totals = new Map<string, { name: string; color: string; total: number }>()
  for (const e of entries) {
    if (e.type !== "expense") continue
    const category = e.tagIds.map((id) => byId.get(id)).find((t) => t?.kind === "category")
    const key = category?.id ?? "none"
    const row = totals.get(key) ?? {
      name: category?.name ?? "Uncategorised",
      color: category?.color ?? "#94a3b8",
      total: 0,
    }
    row.total += e.amount
    totals.set(key, row)
  }

  const rows = [...totals.values()].sort((a, b) => b.total - a.total)
  const sum = rows.reduce((s, r) => s + r.total, 0)
  const max = rows[0]?.total ?? 0

  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No expenses yet.</p>
  }

  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li
          key={r.name}
          className="grid gap-1"
          title={`${r.name}: ${formatHKD(r.total)} (${Math.round((r.total / sum) * 100)}%)`}
        >
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate">{r.name}</span>
            <span className="shrink-0 tabular-nums">
              {formatHKD(r.total)}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {Math.round((r.total / sum) * 100)}%
              </span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full"
              style={{ width: `${(r.total / max) * 100}%`, backgroundColor: r.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
