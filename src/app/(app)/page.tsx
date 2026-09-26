"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Copy, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDialog, type ConfirmRequest } from "@/components/confirm-dialog"
import { EntryFormDialog } from "@/components/entry-form-dialog"
import { EntryList } from "@/components/entry-list"
import { CategoryBreakdown } from "@/components/category-breakdown"
import { useTags } from "@/components/tags-provider"
import { copyMonth, deleteEntry, fetchEntries } from "@/lib/data"
import { addMonths, currentMonth, formatHKD, formatMonth, todayISO } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Entry } from "@/lib/types"

export default function MonthPage() {
  const { byId } = useTags()
  const [month, setMonth] = useState(currentMonth)
  // Entries tagged with the month they belong to, so switching months shows "Loading…"
  const [loaded, setLoaded] = useState<{ month: string; entries: Entry[] } | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const loading = loaded?.month !== month
  const entries = useMemo(() => (loaded && !loading ? loaded.entries : []), [loading, loaded])

  const load = useCallback(async () => {
    try {
      setLoaded({ month, entries: await fetchEntries(month, month) })
    } catch (e) {
      toast.error(`Couldn't load entries: ${(e as Error).message}`)
    }
  }, [month])

  useEffect(() => {
    let cancelled = false
    fetchEntries(month, month)
      .then((rows) => !cancelled && setLoaded({ month, entries: rows }))
      .catch((e) => toast.error(`Couldn't load entries: ${(e as Error).message}`))
    return () => {
      cancelled = true
    }
  }, [month])

  const totals = useMemo(() => {
    let income = 0
    let outgoings = 0
    let invested = 0
    for (const e of entries) {
      if (e.type === "income") {
        income += e.amount
        continue
      }
      outgoings += e.amount
      if (e.tagIds.some((id) => byId.get(id)?.name.toLowerCase() === "investments")) {
        invested += e.amount
      }
    }
    return { income, outgoings, invested, left: income - outgoings }
  }, [entries, byId])

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(entry: Entry) {
    setEditing(entry)
    setFormOpen(true)
  }

  function askDelete(entry: Entry) {
    setConfirm({
      title: "Delete this entry?",
      description: `${entry.description || "Entry"} · ${formatHKD(entry.amount)}`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteEntry(entry.id)
          toast.success("Entry deleted")
          await load()
        } catch (e) {
          toast.error((e as Error).message)
        }
      },
    })
  }

  async function runCopy() {
    const from = addMonths(month, -1)
    try {
      const n = await copyMonth(from, month)
      if (n === 0) toast.info(`${formatMonth(from)} has no entries to copy`)
      else toast.success(`Copied ${n} entries from ${formatMonth(from)}`)
      await load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  function askCopy() {
    const from = formatMonth(addMonths(month, -1))
    if (entries.length === 0) return void runCopy()
    setConfirm({
      title: `Copy ${from} into ${formatMonth(month)}?`,
      description: `${formatMonth(month)} already has ${entries.length} entries. Copying adds ${from}'s entries on top, so you may get duplicates.`,
      confirmLabel: "Copy anyway",
      onConfirm: runCopy,
    })
  }

  // New entries default to today when viewing the current month, else the 1st
  const defaultDate = month === currentMonth() ? todayISO() : `${month}-01`

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center">
          <Button variant="ghost" size="icon-lg" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
            <ChevronLeft />
          </Button>
          <h1 className="min-w-40 text-center text-xl font-semibold tabular-nums">
            {formatMonth(month)}
          </h1>
          <Button variant="ghost" size="icon-lg" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight />
          </Button>
        </div>
        {month !== currentMonth() && (
          <Button variant="link" size="sm" onClick={() => setMonth(currentMonth())}>
            Today
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={askCopy} disabled={loading}>
            <Copy /> <span className="hidden sm:inline">Copy last month</span>
            <span className="sm:hidden">Copy prev.</span>
          </Button>
          <Button onClick={openAdd} className="hidden sm:inline-flex">
            <Plus /> Add entry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Income" value={totals.income} />
        <Stat label="Outgoings" value={totals.outgoings} />
        <Stat
          label="Left over"
          value={totals.left}
          tone={totals.left < 0 ? "negative" : "positive"}
        />
        <Stat label="Invested" value={totals.invested} hint="Included in outgoings" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : (
              <EntryList
                entries={entries}
                onEdit={openEdit}
                onDelete={askDelete}
                emptyAction={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={openAdd}>
                      <Plus /> Add your salary
                    </Button>
                    <Button variant="outline" onClick={askCopy}>
                      <Copy /> Copy last month
                    </Button>
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdown entries={entries} />
          </CardContent>
        </Card>
      </div>

      {/* Floating add button on phones */}
      <Button
        onClick={openAdd}
        size="icon-lg"
        aria-label="Add entry"
        className="fixed right-4 bottom-20 z-30 size-14 rounded-full shadow-lg sm:hidden [&_svg:not([class*='size-'])]:size-6"
      >
        <Plus />
      </Button>

      <EntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={editing}
        defaultDate={defaultDate}
        onSaved={load}
      />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: number
  hint?: string
  tone?: "positive" | "negative"
}) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span
          className={cn(
            "text-lg font-semibold tabular-nums sm:text-2xl",
            tone === "negative" && "text-destructive"
          )}
        >
          {formatHKD(value)}
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  )
}
