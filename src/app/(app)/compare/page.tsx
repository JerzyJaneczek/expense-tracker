"use client"

import { useEffect, useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { NativeSelect } from "@/components/native-select"
import { TagChip } from "@/components/tag-chip"
import { useTags } from "@/components/tags-provider"
import { fetchEntries } from "@/lib/data"
import { addMonths, currentMonth, formatDay, formatHKD, formatMonth, monthRange } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Entry, EntryType, Tag } from "@/lib/types"

const RANGES = [
  { value: "1", label: "This month" },
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

  const [range, setRange] = useState("3")
  const [customFrom, setCustomFrom] = useState(addMonths(currentMonth(), -5))
  const [customTo, setCustomTo] = useState(currentMonth())
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("expense")
  const [match, setMatch] = useState<Match>("any")
  const [selected, setSelected] = useState<string[]>([])
  const [loaded, setLoaded] = useState<{ key: string; entries: Entry[] } | null>(null)

  const [from, to] =
    range === "custom"
      ? customFrom <= customTo
        ? [customFrom, customTo]
        : [customTo, customFrom]
      : [addMonths(currentMonth(), 1 - Number(range)), currentMonth()]
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
    const inMonth = typed.filter((e) => e.date.startsWith(m))
    const row: Record<string, string | number> = { month: formatMonth(m, "short") }
    if (selectedTags.length) {
      for (const t of selectedTags) {
        row[t.id] = inMonth.filter((e) => e.tagIds.includes(t.id)).reduce((s, e) => s + signed(e), 0)
      }
    } else {
      row.all = inMonth.reduce((s, e) => s + signed(e), 0)
    }
    return row
  })

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
              <NativeSelect id="range" value={range} onChange={(e) => setRange(e.target.value)}>
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
                {count} {count === 1 ? "entry" : "entries"} · avg {formatHKD(total / months.length)}/mo
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

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
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v: number) => compactHKD.format(v)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
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

      <Card>
        <CardHeader>
          <CardTitle>Matching entries</CardTitle>
        </CardHeader>
        <CardContent>
          {matching.length === 0 ? (
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
                {matching.map((e) => (
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
