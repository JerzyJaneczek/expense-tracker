"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
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
import { TagChip } from "@/components/tag-chip"
import { useTags } from "@/components/tags-provider"
import { createEntry, updateEntry } from "@/lib/data"
import { cn } from "@/lib/utils"
import type { Entry, EntryType } from "@/lib/types"

const NEW_CATEGORY = "__new__"

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
  const { categories, people, byId, addTag } = useTags()

  const [type, setType] = useState<EntryType>(entry?.type ?? "expense")
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "")
  const [date, setDate] = useState(entry?.date ?? defaultDate)
  const [description, setDescription] = useState(entry?.description ?? "")
  const [categoryId, setCategoryId] = useState(
    entry?.tagIds.find((id) => byId.get(id)?.kind === "category") ?? ""
  )
  const [personIds, setPersonIds] = useState<string[]>(
    entry?.tagIds.filter((id) => byId.get(id)?.kind === "person") ?? []
  )
  const [newCategory, setNewCategory] = useState<string | null>(null)
  const [newPerson, setNewPerson] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function onCategoryChange(value: string) {
    if (value === NEW_CATEGORY) {
      setNewCategory("")
      return
    }
    setCategoryId(value)
    // Picking "Salary" on a new entry is a strong hint that it is income
    if (!entry && byId.get(value)?.name.toLowerCase() === "salary") setType("income")
  }

  async function confirmNewCategory() {
    const tag = await addTag(newCategory ?? "", "category")
    if (tag) setCategoryId(tag.id)
    setNewCategory(null)
  }

  async function confirmNewPerson() {
    const tag = await addTag(newPerson ?? "", "person")
    if (tag) setPersonIds((ids) => (ids.includes(tag.id) ? ids : [...ids, tag.id]))
    setNewPerson(null)
  }

  function togglePerson(id: string) {
    setPersonIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (!(value > 0)) return toast.error("Enter an amount greater than 0")
    if (!date) return toast.error("Pick a date")

    setSaving(true)
    const input = {
      type,
      amount: Math.round(value * 100) / 100,
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

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={cn(
              "h-9 rounded-md text-sm font-medium capitalize text-muted-foreground",
              type === t && "bg-background text-foreground shadow-sm"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="amount">Amount (HKD)</Label>
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="0.00"
            autoFocus={!entry}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="h-10 text-base"
          />
        </div>
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

      <div className="grid gap-1.5">
        <Label htmlFor="category">Category</Label>
        {newCategory === null ? (
          <NativeSelect
            id="category"
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={NEW_CATEGORY}>+ New category…</option>
          </NativeSelect>
        ) : (
          <InlineAdd
            placeholder="New category name"
            value={newCategory}
            onChange={setNewCategory}
            onConfirm={confirmNewCategory}
            onCancel={() => setNewCategory(null)}
          />
        )}
      </div>

      <div className="grid gap-1.5">
        <Label>People</Label>
        <div className="flex flex-wrap gap-2">
          {people.map((p) => (
            <TagChip
              key={p.id}
              tag={p}
              selected={personIds.includes(p.id)}
              onClick={() => togglePerson(p.id)}
            />
          ))}
          {newPerson === null && (
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full"
              onClick={() => setNewPerson("")}
            >
              <Plus /> New person
            </Button>
          )}
        </div>
        {newPerson !== null && (
          <InlineAdd
            placeholder="Name"
            value={newPerson}
            onChange={setNewPerson}
            onConfirm={confirmNewPerson}
            onCancel={() => setNewPerson(null)}
          />
        )}
      </div>

      <DialogFooter>
        <Button type="submit" size="lg" className="h-10" disabled={saving}>
          {saving ? "Saving…" : entry ? "Save changes" : "Add entry"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function InlineAdd({
  placeholder,
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex gap-2">
      <Input
        autoFocus
        placeholder={placeholder}
        maxLength={40}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Enter must not submit the whole entry form
          if (e.key === "Enter") {
            e.preventDefault()
            onConfirm()
          } else if (e.key === "Escape") {
            e.preventDefault()
            onCancel()
          }
        }}
        className="h-10"
      />
      <Button type="button" className="h-10" onClick={onConfirm} disabled={!value.trim()}>
        Add
      </Button>
      <Button type="button" variant="ghost" className="h-10" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  )
}
