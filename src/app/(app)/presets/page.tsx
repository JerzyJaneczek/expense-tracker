"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ConfirmDialog, type ConfirmRequest } from "@/components/confirm-dialog"
import { PresetItemDialog } from "@/components/preset-item-dialog"
import { TagChip } from "@/components/tag-chip"
import { useTags } from "@/components/tags-provider"
import {
  createPreset,
  deletePreset,
  deletePresetItem,
  fetchPresets,
  renamePreset,
} from "@/lib/data"
import { formatHKD } from "@/lib/format"
import type { Preset, PresetItem, Tag } from "@/lib/types"

export default function PresetsPage() {
  const [presets, setPresets] = useState<Preset[] | null>(null)
  const [name, setName] = useState("")
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [itemDialog, setItemDialog] = useState<{ preset: Preset; item: PresetItem | null } | null>(
    null
  )

  const reload = useCallback(async () => {
    try {
      setPresets(await fetchPresets())
    } catch (e) {
      toast.error(`Couldn't load presets: ${(e as Error).message}`)
    }
  }, [])

  useEffect(() => {
    fetchPresets()
      .then(setPresets)
      .catch((e) => toast.error(`Couldn't load presets: ${(e as Error).message}`))
  }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (presets?.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error(`"${trimmed}" already exists`)
    }
    try {
      await createPreset(trimmed)
      setName("")
      toast.success(`Created ${trimmed}. Now add its items.`)
      await reload()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  function askDeletePreset(preset: Preset) {
    setConfirm({
      title: `Delete "${preset.name}"?`,
      description:
        "The preset and its items are removed. Entries you already added to months from it stay as they are.",
      confirmLabel: "Delete preset",
      destructive: true,
      onConfirm: async () => {
        try {
          await deletePreset(preset.id)
          toast.success(`Deleted ${preset.name}`)
          await reload()
        } catch (e) {
          toast.error((e as Error).message)
        }
      },
    })
  }

  function askDeleteItem(item: PresetItem) {
    setConfirm({
      title: `Remove "${item.description}"?`,
      description: "It's removed from the preset. Months it was already added to keep their entry.",
      confirmLabel: "Remove",
      destructive: true,
      onConfirm: async () => {
        try {
          await deletePresetItem(item.id)
          await reload()
        } catch (e) {
          toast.error((e as Error).message)
        }
      },
    })
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">Presets</h1>
        <p className="text-sm text-muted-foreground">
          Lists of regular entries, like your subscriptions. Add a preset to any month from the
          Month page, then edit that month&apos;s amounts without changing the preset.
        </p>
      </div>

      <form onSubmit={add} className="flex gap-2">
        <Input
          placeholder="New preset, e.g. Subscriptions"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10"
        />
        <Button type="submit" className="h-10" disabled={!name.trim()}>
          <Plus /> Create
        </Button>
      </form>

      {presets === null ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : presets.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No presets yet. Create one above, e.g. &ldquo;Subscriptions&rdquo;.
        </p>
      ) : (
        presets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            onRenamed={reload}
            onDelete={() => askDeletePreset(preset)}
            onAddItem={() => setItemDialog({ preset, item: null })}
            onEditItem={(item) => setItemDialog({ preset, item })}
            onDeleteItem={askDeleteItem}
          />
        ))
      )}

      {itemDialog && (
        <PresetItemDialog
          open
          onOpenChange={(open) => !open && setItemDialog(null)}
          presetId={itemDialog.preset.id}
          presetName={itemDialog.preset.name}
          item={itemDialog.item}
          onSaved={reload}
        />
      )}
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}

function PresetCard({
  preset,
  onRenamed,
  onDelete,
  onAddItem,
  onEditItem,
  onDeleteItem,
}: {
  preset: Preset
  onRenamed: () => Promise<void>
  onDelete: () => void
  onAddItem: () => void
  onEditItem: (item: PresetItem) => void
  onDeleteItem: (item: PresetItem) => void
}) {
  const { byId } = useTags()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(preset.name)

  const net = preset.items.reduce((s, i) => s + (i.type === "income" ? i.amount : -i.amount), 0)

  async function saveName() {
    const trimmed = name.trim()
    setEditing(false)
    if (!trimmed || trimmed === preset.name) return setName(preset.name)
    try {
      await renamePreset(preset.id, trimmed)
      await onRenamed()
    } catch (e) {
      const msg = (e as Error).message
      toast.error(msg.includes("duplicate") ? "That name is already used" : msg)
      setName(preset.name)
    }
  }

  return (
    <Card>
      <CardHeader>
        {editing ? (
          <div className="flex gap-2">
            <Input
              autoFocus
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              className="h-9"
            />
            <Button variant="ghost" size="icon" aria-label="Save name" onClick={saveName}>
              <Check />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cancel"
              onClick={() => {
                setName(preset.name)
                setEditing(false)
              }}
            >
              <X />
            </Button>
          </div>
        ) : (
          <>
            <CardTitle>{preset.name}</CardTitle>
            <CardDescription>
              {preset.items.length} {preset.items.length === 1 ? "item" : "items"} ·{" "}
              {net <= 0 ? `${formatHKD(-net)} a month` : `+${formatHKD(net)} a month`}
            </CardDescription>
            <CardAction className="flex">
              <Button variant="ghost" size="icon" aria-label={`Rename ${preset.name}`} onClick={() => setEditing(true)}>
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Delete ${preset.name}`} onClick={onDelete}>
                <Trash2 />
              </Button>
            </CardAction>
          </>
        )}
      </CardHeader>
      <CardContent className="grid gap-3">
        {preset.items.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {preset.items.map((item) => {
              const tags = item.tagIds.map((id) => byId.get(id)).filter((t): t is Tag => !!t)
              return (
                <li key={item.id} className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    className="grid min-w-0 flex-1 gap-1 text-left"
                    onClick={() => onEditItem(item)}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-medium">{item.description}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        day {item.day}
                      </span>
                    </span>
                    {tags.length > 0 && (
                      <span className="flex flex-wrap gap-1">
                        {tags.map((t) => (
                          <TagChip key={t.id} tag={t} />
                        ))}
                      </span>
                    )}
                  </button>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {item.type === "income" ? "+" : ""}
                    {formatHKD(item.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${item.description}`}
                    onClick={() => onEditItem(item)}
                    className="hidden sm:inline-flex"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${item.description}`}
                    onClick={() => onDeleteItem(item)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        <Button variant="outline" className="justify-self-start" onClick={onAddItem}>
          <Plus /> Add item
        </Button>
      </CardContent>
    </Card>
  )
}
