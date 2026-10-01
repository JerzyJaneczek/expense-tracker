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
import {
  AmountInput,
  CategoryField,
  PeopleField,
  TypeToggle,
  parseAmount,
  useSplitTags,
} from "@/components/entry-fields"
import { useTags } from "@/components/tags-provider"
import { createEntry, updateEntry } from "@/lib/data"
import type { Entry, EntryType } from "@/lib/types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Entry being edited, or null to add a new one. */
  entry: Entry | null
  defaultDate: string
  onSaved: () => void
}

export function EntryFormDialog({ open, onOpenChange, entry, defaultDate, onSaved }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {/* Mounted only while open so the form resets each time */}
        {open && (
          <EntryForm
            key={entry?.id ?? "new"}
            entry={entry}
            defaultDate={defaultDate}
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

function EntryForm({
  entry,
  defaultDate,
  onDone,
}: {
  entry: Entry | null
  defaultDate: string
  onDone: () => void
}) {
  const { byId } = useTags()
  const initial = useSplitTags(entry?.tagIds)

  const [type, setType] = useState<EntryType>(entry?.type ?? "expense")
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "")
  const [date, setDate] = useState(entry?.date ?? defaultDate)
  const [description, setDescription] = useState(entry?.description ?? "")
  const [categoryId, setCategoryId] = useState(initial.categoryId)
  const [personIds, setPersonIds] = useState(initial.personIds)
  const [saving, setSaving] = useState(false)

  function onCategoryChange(id: string) {
    setCategoryId(id)
    // Picking "Salary" on a new entry is a strong hint that it is income
    if (!entry && byId.get(id)?.name.toLowerCase() === "salary") setType("income")
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (value === null) return toast.error("Enter an amount greater than 0")
    if (!date) return toast.error("Pick a date")

    setSaving(true)
    const input = {
      type,
      amount: value,
      date,
      description: description.trim() || null,
      tagIds: [...(categoryId ? [categoryId] : []), ...personIds],
    }
    try {
      if (entry) await updateEntry(entry.id, input)
      else await createEntry(input)
      toast.success(entry ? "Entry updated" : "Entry added")
      onDone()
    } catch (err) {
      toast.error((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{entry ? "Edit entry" : "Add entry"}</DialogTitle>
        <DialogDescription>Income such as salary, or an expense such as rent.</DialogDescription>
      </DialogHeader>

      <TypeToggle value={type} onChange={setType} />

      <div className="grid grid-cols-2 gap-3">
        <AmountInput value={amount} onChange={setAmount} autoFocus={!entry} />
        <div className="grid gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder={type === "income" ? "e.g. Monthly salary" : "e.g. Electricity"}
          maxLength={120}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-10"
        />
      </div>

      <CategoryField value={categoryId} onChange={onCategoryChange} />
      <PeopleField value={personIds} onChange={setPersonIds} />

      <DialogFooter>
        <Button type="submit" size="lg" className="h-10" disabled={saving}>
          {saving ? "Saving…" : entry ? "Save changes" : "Add entry"}
        </Button>
      </DialogFooter>
    </form>
  )
}
