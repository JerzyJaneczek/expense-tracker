"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/native-select"
import {
  AmountInput,
  CategoryField,
  PeopleField,
  TypeToggle,
  parseAmount,
  useSplitTags,
} from "@/components/entry-fields"
import { createPresetItem, updatePresetItem } from "@/lib/data"
import type { EntryType, PresetItem } from "@/lib/types"

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export function PresetItemDialog({
  open,
  onOpenChange,
  presetId,
  presetName,
  item,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  presetId: string
  presetName: string
  /** Item being edited, or null to add one. */
  item: PresetItem | null
  onSaved: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {open && (
          <PresetItemForm
            key={item?.id ?? "new"}
            presetId={presetId}
            presetName={presetName}
            item={item}
            onDone={() => {
              onOpenChange(false)
              onSaved()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function PresetItemForm({
  presetId,
  presetName,
  item,
  onDone,
}: {
  presetId: string
  presetName: string
  item: PresetItem | null
  onDone: () => void
}) {
  const initial = useSplitTags(item?.tagIds)
  const [type, setType] = useState<EntryType>(item?.type ?? "expense")
  const [amount, setAmount] = useState(item ? String(item.amount) : "")
  const [day, setDay] = useState(item?.day ?? 1)
  const [description, setDescription] = useState(item?.description ?? "")
  const [categoryId, setCategoryId] = useState(initial.categoryId)
  const [personIds, setPersonIds] = useState(initial.personIds)
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (value === null) return toast.error("Enter an amount greater than 0")
    if (!description.trim()) return toast.error("Give it a name, e.g. Netflix")

    setSaving(true)
    const input = {
      type,
      amount: value,
      day,
      description: description.trim(),
      tagIds: [...(categoryId ? [categoryId] : []), ...personIds],
    }
    try {
      if (item) await updatePresetItem(item.id, input)
      else await createPresetItem(presetId, input)
      toast.success(item ? "Item updated" : `Added to ${presetName}`)
      onDone()
    } catch (err) {
      toast.error((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{item ? "Edit item" : `Add to ${presetName}`}</DialogTitle>
        <DialogDescription>
          Changes here only affect months you add the preset to from now on.
        </DialogDescription>
      </DialogHeader>

      <TypeToggle value={type} onChange={setType} />

      <div className="grid gap-1.5">
        <Label htmlFor="description">Name</Label>
        <Input
          id="description"
          placeholder="e.g. Netflix"
          maxLength={120}
          autoFocus={!item}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-10"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <AmountInput value={amount} onChange={setAmount} />
        <div className="grid gap-1.5">
          <Label htmlFor="day">Day of month</Label>
          <NativeSelect id="day" value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <CategoryField value={categoryId} onChange={setCategoryId} />
      <PeopleField value={personIds} onChange={setPersonIds} />

      <DialogFooter>
        <Button type="submit" size="lg" className="h-10" disabled={saving}>
          {saving ? "Saving…" : item ? "Save changes" : "Add item"}
        </Button>
      </DialogFooter>
    </form>
  )
}
