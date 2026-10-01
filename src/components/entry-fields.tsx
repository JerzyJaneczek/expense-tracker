"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/native-select"
import { TagChip } from "@/components/tag-chip"
import { useTags } from "@/components/tags-provider"
import { cn } from "@/lib/utils"
import type { EntryType } from "@/lib/types"

const NEW_CATEGORY = "__new__"

/** Shared fields for entries and preset items: type, category and people. */

export function TypeToggle({
  value,
  onChange,
}: {
  value: EntryType
  onChange: (t: EntryType) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup">
      {(["expense", "income"] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          onClick={() => onChange(t)}
          className={cn(
            "h-9 rounded-md text-sm font-medium capitalize text-muted-foreground",
            value === t && "bg-background text-foreground shadow-sm"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

/** Splits a tag id list into the category and the people. */
export function useSplitTags(tagIds: string[] | undefined) {
  const { byId } = useTags()
  return {
    categoryId: tagIds?.find((id) => byId.get(id)?.kind === "category") ?? "",
    personIds: tagIds?.filter((id) => byId.get(id)?.kind === "person") ?? [],
  }
}

export function CategoryField({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const { categories, addTag } = useTags()
  const [newName, setNewName] = useState<string | null>(null)

  async function confirmNew() {
    const tag = await addTag(newName ?? "", "category")
    if (tag) onChange(tag.id)
    setNewName(null)
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="category">Category</Label>
      {newName === null ? (
        <NativeSelect
          id="category"
          value={value}
          onChange={(e) =>
            e.target.value === NEW_CATEGORY ? setNewName("") : onChange(e.target.value)
          }
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
          value={newName}
          onChange={setNewName}
          onConfirm={confirmNew}
          onCancel={() => setNewName(null)}
        />
      )}
    </div>
  )
}

export function PeopleField({
  value,
  onChange,
}: {
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const { people, addTag } = useTags()
  const [newName, setNewName] = useState<string | null>(null)

  async function confirmNew() {
    const tag = await addTag(newName ?? "", "person")
    if (tag && !value.includes(tag.id)) onChange([...value, tag.id])
    setNewName(null)
  }

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }

  return (
    <div className="grid gap-1.5">
      <Label>People</Label>
      <div className="flex flex-wrap gap-2">
        {people.map((p) => (
          <TagChip key={p.id} tag={p} selected={value.includes(p.id)} onClick={() => toggle(p.id)} />
        ))}
        {newName === null && (
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-full"
            onClick={() => setNewName("")}
          >
            <Plus /> New person
          </Button>
        )}
      </div>
      {newName !== null && (
        <InlineAdd
          placeholder="Name"
          value={newName}
          onChange={setNewName}
          onConfirm={confirmNew}
          onCancel={() => setNewName(null)}
        />
      )}
    </div>
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
          // Enter must not submit the surrounding form
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

/** Amount input that only accepts digits and a decimal point. */
export function AmountInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="amount">Amount (HKD)</Label>
      <Input
        id="amount"
        inputMode="decimal"
        placeholder="0.00"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        className="h-10 text-base"
      />
    </div>
  )
}

/** Parses an amount string; returns null if it isn't a positive number. */
export function parseAmount(value: string) {
  const n = Number(value)
  return n > 0 ? Math.round(n * 100) / 100 : null
}
