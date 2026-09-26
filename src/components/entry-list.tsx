"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TagChip } from "@/components/tag-chip"
import { useTags } from "@/components/tags-provider"
import { formatDay, formatHKD } from "@/lib/format"
import type { Entry, Tag } from "@/lib/types"

type Group = { key: string; title: string; color?: string; total: number; entries: Entry[] }

/** Income first, then expenses grouped by category, largest group first. */
function groupEntries(entries: Entry[], byId: Map<string, Tag>): Group[] {
  const income: Group = { key: "income", title: "Income", total: 0, entries: [] }
  const groups = new Map<string, Group>()

  for (const e of entries) {
    if (e.type === "income") {
      income.entries.push(e)
      income.total += e.amount
      continue
    }
    const category = e.tagIds.map((id) => byId.get(id)).find((t) => t?.kind === "category")
    const key = category?.id ?? "none"
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        title: category?.name ?? "Uncategorised",
        color: category?.color,
        total: 0,
        entries: [],
      }
      groups.set(key, group)
    }
    group.entries.push(e)
    group.total += e.amount
  }

  const expenses = [...groups.values()].sort((a, b) => b.total - a.total)
  return income.entries.length ? [income, ...expenses] : expenses
}

export function EntryList({
  entries,
  onEdit,
  onDelete,
  emptyAction,
}: {
  entries: Entry[]
  onEdit?: (e: Entry) => void
  onDelete?: (e: Entry) => void
  emptyAction?: React.ReactNode
}) {
  const { byId } = useTags()

  if (entries.length === 0) {
    return (
      <div className="grid gap-3 py-8 text-center text-sm text-muted-foreground">
        <p>No entries this month yet.</p>
        {emptyAction}
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      {groupEntries(entries, byId).map((group) => (
        <section key={group.key} className="grid gap-1">
          <header className="flex items-center gap-2 border-b pb-1.5 text-sm font-semibold">
            {group.color && (
              <span className="size-2.5 rounded-full" style={{ backgroundColor: group.color }} />
            )}
            <span>{group.title}</span>
            <span className="ml-auto tabular-nums">{formatHKD(group.total)}</span>
          </header>
          <ul className="divide-y">
            {group.entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                people={entry.tagIds
                  .map((id) => byId.get(id))
                  .filter((t): t is Tag => t?.kind === "person")}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function EntryRow({
  entry,
  people,
  onEdit,
  onDelete,
}: {
  entry: Entry
  people: Tag[]
  onEdit?: (e: Entry) => void
  onDelete?: (e: Entry) => void
}) {
  return (
    <li className="flex items-center gap-2 py-2">
      <button
        type="button"
        className="grid min-w-0 flex-1 gap-1 text-left disabled:cursor-default"
        onClick={() => onEdit?.(entry)}
        disabled={!onEdit}
      >
        <span className="flex items-baseline gap-2">
          <span className="truncate font-medium">{entry.description || "—"}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatDay(entry.date)}</span>
        </span>
        {people.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {people.map((p) => (
              <TagChip key={p.id} tag={p} />
            ))}
          </span>
        )}
      </button>
      <span
        className={
          entry.type === "income"
            ? "shrink-0 font-semibold tabular-nums text-green-700 dark:text-green-400"
            : "shrink-0 font-semibold tabular-nums"
        }
      >
        {entry.type === "income" ? "+" : ""}
        {formatHKD(entry.amount)}
      </span>
      {onEdit && (
        <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => onEdit(entry)} className="hidden sm:inline-flex">
          <Pencil />
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => onDelete(entry)}>
          <Trash2 />
        </Button>
      )}
    </li>
  )
}
