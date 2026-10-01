"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NativeSelect } from "@/components/native-select"
import { useTags } from "@/components/tags-provider"
import { applyPreset, fetchPresets } from "@/lib/data"
import { formatHKD, formatMonth } from "@/lib/format"
import type { Entry, Preset } from "@/lib/types"

export function ApplyPresetDialog({
  open,
  onOpenChange,
  month,
  monthEntries,
  onApplied,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string
  monthEntries: Entry[]
  onApplied: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {open && (
          <ApplyPresetForm
            month={month}
            monthEntries={monthEntries}
            onDone={() => {
              onOpenChange(false)
              onApplied()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ApplyPresetForm({
  month,
  monthEntries,
  onDone,
}: {
  month: string
  monthEntries: Entry[]
  onDone: () => void
}) {
  const { byId } = useTags()
  const [presets, setPresets] = useState<Preset[] | null>(null)
  const [presetId, setPresetId] = useState("")
  // Item ids the user has unticked; everything else is included
  const [skipped, setSkipped] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPresets()
      .then((rows) => {
        setPresets(rows)
        setPresetId(rows[0]?.id ?? "")
      })
      .catch((e) => toast.error((e as Error).message))
  }, [])

  const preset = presets?.find((p) => p.id === presetId)
  const chosen = preset?.items.filter((i) => !skipped.includes(i.id)) ?? []
  const total = chosen.reduce((s, i) => s + (i.type === "income" ? -i.amount : i.amount), 0)
  const alreadyAdded = monthEntries.filter((e) => e.presetId === presetId).length

  function toggle(id: string, include: boolean) {
    setSkipped((ids) => (include ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!preset || !chosen.length) return
    setSaving(true)
    try {
      await applyPreset(preset.id, chosen, month, new Set(byId.keys()))
      toast.success(`Added ${chosen.length} entries from ${preset.name}`)
      onDone()
    } catch (err) {
      toast.error((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Add a preset to {formatMonth(month)}</DialogTitle>
        <DialogDescription>
          Each item becomes a normal entry for this month, so you can edit or delete it without
          changing the preset.
        </DialogDescription>
      </DialogHeader>

      {presets === null ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : presets.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          You don&apos;t have any presets yet.{" "}
          <Link href="/presets" className="font-medium text-foreground underline">
            Create one
          </Link>
          , e.g. &ldquo;Subscriptions&rdquo;.
        </p>
      ) : (
        <>
          {presets.length > 1 && (
            <NativeSelect
              aria-label="Preset"
              value={presetId}
              onChange={(e) => {
                setPresetId(e.target.value)
                setSkipped([])
              }}
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.items.length})
                </option>
              ))}
            </NativeSelect>
          )}

          {alreadyAdded > 0 && (
            <p className="flex gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {formatMonth(month)} already has {alreadyAdded}{" "}
              {alreadyAdded === 1 ? "entry" : "entries"} from {preset?.name}. Adding again will
              create duplicates.
            </p>
          )}

          {preset && preset.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {preset.name} has no items yet. Add some on the{" "}
              <Link href="/presets" className="font-medium text-foreground underline">
                Presets page
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {preset?.items.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
                    <Checkbox
                      checked={!skipped.includes(item.id)}
                      onCheckedChange={(checked) => toggle(item.id, checked)}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.description}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">day {item.day}</span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {item.type === "income" ? "+" : ""}
                      {formatHKD(item.amount)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <DialogFooter className="items-center">
        {chosen.length > 0 && (
          <span className="mr-auto text-sm text-muted-foreground">
            Total {formatHKD(Math.abs(total))}
          </span>
        )}
        <Button type="submit" size="lg" className="h-10" disabled={saving || !chosen.length}>
          {saving
            ? "Adding…"
            : `Add ${chosen.length} ${chosen.length === 1 ? "entry" : "entries"}`}
        </Button>
      </DialogFooter>
    </form>
  )
}
