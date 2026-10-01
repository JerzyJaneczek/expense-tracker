"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MonthCalendar } from "@/components/month-calendar"
import { NativeSelect } from "@/components/native-select"
import { TagChip } from "@/components/tag-chip"
import { useTags } from "@/components/tags-provider"
import { fetchEntries } from "@/lib/data"
import {
  addMonths,
  currentMonth,
  formatDay,
  formatHKD,
  formatMonth,
  monthRange,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Entry, EntryType, Tag } from "@/lib/types"

const RANGES = [
  { value: "month", label: "Single month" },
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
  { value: "custom", label: "Custom…" },
]

type Match = "any" | "all"
type TypeFilter = EntryType | "both"

const compactHKD = new Intl.NumberFormat("en-HK", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export default function ComparePage() {
  const { tags, categories, people, byId } = useTags()

  const [range, setRange] = useState("month")
  const [singleMonth, setSingleMonth] = useState(currentMonth)
  // Day of the single month picked on the calendar, which filters the entries table
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [customFrom, setCustomFrom] = useState(addMonths(currentMonth(), -5))
  const [customTo, setCustomTo] = useState(currentMonth())
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("expense")
  const [match, setMatch] = useState<Match>("any")
  const [selected, setSelected] = useState<string[]>([])
  const [loaded, setLoaded] = useState<{ key: string; entries: Entry[] } | null>(null)

  const [from, to] =
    range === "month"
      ? [singleMonth, singleMonth]
      : range === "custom"
        ? customFrom <= customTo
          ? [customFrom, customTo]
          : [customTo, customFrom]
        : [addMonths(currentMonth(), 1 - Number(range)), currentMonth()]
  const isSingleMonth = from === to
  const rangeKey = `${from}|${to}`
  const loading = loaded?.key !== rangeKey
  const entries = useMemo(() => (loaded && !loading ? loaded.entries : []), [loading, loaded])

  useEffect(() => {
    if (!from || !to) return
    let cancelled = false
    fetchEntries(from, to)
      .then((rows) => !cancelled && setLoaded({ key: `${from}|${to}`, entries: rows }))
      .catch((e) => toast.error((e as Error).message))
    return () => {
      cancelled = true
    }
  }, [from, to])

  // Drop selections for tags that were deleted elsewhere
  const selectedTags = selected.map((id) => byId.get(id)).filter((t): t is Tag => !!t)

  function toggle(id: string) {
    setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  const typed = useMemo(
    () => entries.filter((e) => typeFilter === "both" || e.type === typeFilter),
    [entries, typeFilter]
  )

  const matching = useMemo(() => {
    if (!selectedTags.length) return typed
    return typed.filter((e) =>
      match === "any"
        ? selectedTags.some((t) => e.tagIds.includes(t.id))
        : selectedTags.every((t) => e.tagIds.includes(t.id))
    )
  }, [typed, selectedTags, match])

  const signed = (e: Entry) => (typeFilter === "both" && e.type === "expense" ? -e.amount : e.amount)
  const matchingTotal = matching.reduce((s, e) => s + signed(e), 0)

  const perTag = selectedTags.map((tag) => ({
    tag,
    total: typed.filter((e) => e.tagIds.includes(tag.id)).reduce((s, e) => s + signed(e), 0),
    count: typed.filter((e) => e.tagIds.includes(tag.id)).length,
  }))

  const months = monthRange(from, to)
  const chartData = months.map((m) => {
    const inBucket = typed.filter((e) => e.date.startsWith(m))
    const row: Record<string, string | number> = {
      label: formatMonth(m, "short"),
      title: formatMonth(m),
    }
    if (selectedTags.length) {
      for (const t of selectedTags) {
        row[t.id] = inBucket.filter((e) => e.tagIds.includes(t.id)).reduce((s, e) => s + signed(e), 0)
      }
    } else {
      row.all = inBucket.reduce((s, e) => s + signed(e), 0)
    }
    return row
  })

  // Totals per day of the single month, for the calendar
  const dayTotals = new Map<number, number>()
  if (isSingleMonth) {
    for (const e of matching) {
      const day = Number(e.date.slice(8))
      dayTotals.set(day, (dayTotals.get(day) ?? 0) + signed(e))
    }
  }
  const tableEntries =
    isSingleMonth && selectedDay !== null
      ? matching.filter((e) => Number(e.date.slice(8)) === selectedDay)
      : matching

  // Totals per category over the matching entries; these add up to the overall total
  const byCategory = (() => {
    const rows = new Map<string, { tag: Tag | null; total: number; count: number }>()
    for (const e of matching) {
      const tag = e.tagIds.map((id) => byId.get(id)).find((t) => t?.kind === "category") ?? null
      const key = tag?.id ?? "none"
      const row = rows.get(key) ?? { tag, total: 0, count: 0 }
      row.total += signed(e)
      row.count += 1
      rows.set(key, row)
    }
    return [...rows.values()].sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
  })()

  const chartConfig: ChartConfig = selectedTags.length
    ? Object.fromEntries(selectedTags.map((t) => [t.id, { label: t.name, color: t.color }]))
    : { all: { label: typeLabel(typeFilter), color: "#2a78d6" } }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Compare</h1>

      <Card>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="range">Period</Label>
              <NativeSelect id="range" value={range} onChange={(e) => {
                  setRange(e.target.value)
                  setSelectedDay(null)
                }}>
                {RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="type">Show</Label>
              <NativeSelect
                id="type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              >
                <option value="expense">Expenses</option>
                <option value="income">Income</option>
                <option value="both">Both (net)</option>
              </NativeSelect>
            </div>
            {range === "month" && (
              <div className="col-span-2 grid gap-1.5 sm:col-span-1">
                <Label>Month</Label>
                <div className="flex h-10 items-center rounded-lg border border-input">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Previous month"
                    onClick={() => {
                      setSingleMonth(addMonths(singleMonth, -1))
                      setSelectedDay(null)
                    }}
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="flex-1 px-2 text-center text-sm font-medium tabular-nums">
                    {formatMonth(singleMonth)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Next month"
                    onClick={() => {
                      setSingleMonth(addMonths(singleMonth, 1))
                      setSelectedDay(null)
                    }}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            )}
            {range === "custom" && (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="from">From</Label>
                  <Input id="from" type="month" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-10" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="to">To</Label>
                  <Input id="to" type="month" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-10" />
                </div>
              </>
            )}
            <div className="col-span-2 grid gap-1.5 sm:col-span-1">
              <Label>Match</Label>
              <div className="grid h-10 grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup">
                {(
                  [
                    ["any", "Any selected tag"],
                    ["all", "All selected tags"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={match === value}
                    onClick={() => setMatch(value)}
                    className={cn(
                      "rounded-md px-3 text-sm font-medium text-muted-foreground",
                      match === value && "bg-background text-foreground shadow-sm"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <TagGroup title="Categories" tags={categories} selected={selected} onToggle={toggle} />
          <TagGroup title="People" tags={people} selected={selected} onToggle={toggle} />

          {selected.length > 0 && (
            <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          )}
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground">Add categories and people on the Tags page first.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card size="sm" className="col-span-2 md:col-span-1">
          <CardContent className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              {selectedTags.length === 0
                ? `All ${typeLabel(typeFilter).toLowerCase()}`
                : selectedTags.length === 1
                  ? "Matching entries"
                  : match === "any"
                    ? "Any selected tag"
                    : "All selected tags together"}
            </span>
            <span className="text-2xl font-semibold tabular-nums">{formatHKD(matchingTotal)}</span>
            <span className="text-xs text-muted-foreground">
              {matching.length} {matching.length === 1 ? "entry" : "entries"} · {formatMonth(from, "short")}
              {from !== to && ` – ${formatMonth(to, "short")}`}
            </span>
          </CardContent>
        </Card>
        {perTag.map(({ tag, total, count }) => (
          <Card size="sm" key={tag.id}>
            <CardContent className="grid gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className="size-2 rounded-full" style={{ backgroundColor: tag.color }} />
                <span className="truncate">{tag.name}</span>
              </span>
              <span className="text-lg font-semibold tabular-nums sm:text-xl">{formatHKD(total)}</span>
              <span className="text-xs text-muted-foreground">
                {count} {count === 1 ? "entry" : "entries"}
                {!isSingleMonth && ` · avg ${formatHKD(total / months.length)}/mo`}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {isSingleMonth ? (
        <Card>
          <CardHeader>
            <CardTitle>{formatMonth(from)}</CardTitle>
            <CardDescription>
              {typeLabel(typeFilter)} per day
              {selectedTags.length > 0 && " for the selected tags"} (HKD). Tap a day to see its
              entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : (
              <MonthCalendar
                month={from}
                totals={dayTotals}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>By month</CardTitle>
            <CardDescription>
              {selectedTags.length
                ? `${typeLabel(typeFilter)} for each selected tag`
                : `All ${typeLabel(typeFilter).toLowerCase()}. Select tags above to compare them.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : (
              <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
                <BarChart data={chartData} barGap={2} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval={0}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v: number) => compactHKD.format(v)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.title}
                        formatter={(value, name) => (
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <span
                                className="size-2.5 rounded-[2px]"
                                style={{ backgroundColor: chartConfig[name as string]?.color }}
                              />
                              {chartConfig[name as string]?.label}
                            </span>
                            <span className="font-mono font-medium tabular-nums text-foreground">
                              {formatHKD(Number(value))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  {Object.keys(chartConfig).length > 1 && (
                    <ChartLegend content={<ChartLegendContent />} />
                  )}
                  {Object.keys(chartConfig).map((key) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      fill={`var(--color-${key})`}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>By category</CardTitle>
          <CardDescription>
            {typeLabel(typeFilter)}
            {selectedTags.length > 0 && " matching the selected tags"} ·{" "}
            {isSingleMonth
              ? formatMonth(from)
              : `${formatMonth(from, "short")} – ${formatMonth(to, "short")}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byCategory.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {loading ? "Loading…" : "Nothing to show."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  {typeFilter !== "both" && <TableHead className="text-right">Share</TableHead>}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCategory.map(({ tag, total, count }) => (
                  <TableRow key={tag?.id ?? "none"}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: tag?.color ?? "#94a3b8" }}
                        />
                        {tag?.name ?? "Uncategorised"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {count}
                    </TableCell>
                    {typeFilter !== "both" && (
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {matchingTotal ? Math.round((total / matchingTotal) * 100) : 0}%
                      </TableCell>
                    )}
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatHKD(total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right tabular-nums">{matching.length}</TableCell>
                  {typeFilter !== "both" && (
                    <TableCell className="text-right tabular-nums">100%</TableCell>
                  )}
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatHKD(matchingTotal)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDay !== null && isSingleMonth
              ? `Entries on ${formatDay(`${from}-${String(selectedDay).padStart(2, "0")}`)}`
              : "Matching entries"}
          </CardTitle>
          {selectedDay !== null && isSingleMonth && (
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
                Show whole month
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {tableEntries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {loading ? "Loading…" : "Nothing matches."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="hidden sm:table-cell">Tags</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableEntries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDay(e.date)} {e.date.slice(2, 4)}
                    </TableCell>
                    <TableCell className="max-w-40 truncate">{e.description || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {e.tagIds
                          .map((id) => byId.get(id))
                          .filter((t): t is Tag => !!t)
                          .map((t) => (
                            <TagChip key={t.id} tag={t} />
                          ))}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        e.type === "income" && "text-green-700 dark:text-green-400"
                      )}
                    >
                      {e.type === "income" ? "+" : ""}
                      {formatHKD(e.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function typeLabel(t: TypeFilter) {
  return t === "expense" ? "Expenses" : t === "income" ? "Income" : "Net (income − expenses)"
}

function TagGroup({
  title,
  tags,
  selected,
  onToggle,
}: {
  title: string
  tags: Tag[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  if (!tags.length) return null
  return (
    <div className="grid gap-2">
      <span className="text-xs font-medium text-muted-foreground uppercase">{title}</span>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <TagChip key={t.id} tag={t} selected={selected.includes(t.id)} onClick={() => onToggle(t.id)} />
        ))}
      </div>
    </div>
  )
}
