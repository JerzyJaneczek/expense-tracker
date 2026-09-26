"use client"

import { useState } from "react"
import { Check, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmDialog, type ConfirmRequest } from "@/components/confirm-dialog"
import { useTags } from "@/components/tags-provider"
import { TAG_COLORS, nextColor } from "@/lib/colors"
import { countTagUsage, deleteTag, updateTag } from "@/lib/data"
import { cn } from "@/lib/utils"
import type { Tag, TagKind } from "@/lib/types"

export default function TagsPage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Tags & People</h1>
      <Tabs defaultValue="category">
        <TabsList>
          <TabsTrigger value="category" className="px-4">
            Categories
          </TabsTrigger>
          <TabsTrigger value="person" className="px-4">
            People
          </TabsTrigger>
        </TabsList>
        <TabsContent value="category" className="mt-3">
          <TagManager
            kind="category"
            title="Categories"
            description="What the money is for: Salary, Rent, Bills, Investments…"
          />
        </TabsContent>
        <TabsContent value="person" className="mt-3">
          <TagManager
            kind="person"
            title="People"
            description="Who a payment is with or for. An entry can have several people."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TagManager({
  kind,
  title,
  description,
}: {
  kind: TagKind
  title: string
  description: string
}) {
  const { tags, loading, addTag, reload } = useTags()
  const list = tags.filter((t) => t.kind === kind)
  const noun = kind === "category" ? "category" : "person"

  const [name, setName] = useState("")
  const [color, setColor] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const suggestedColor = color ?? nextColor(list.map((t) => t.color))

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (list.some((t) => t.name.toLowerCase() === name.trim().toLowerCase())) {
      return toast.error(`"${name.trim()}" already exists`)
    }
    const tag = await addTag(name, kind, suggestedColor)
    if (tag) {
      toast.success(`Added ${tag.name}`)
      setName("")
      setColor(null)
    }
  }

  async function askDelete(tag: Tag) {
    let uses = 0
    try {
      uses = await countTagUsage(tag.id)
    } catch (e) {
      return toast.error((e as Error).message)
    }
    setConfirm({
      title: `Delete "${tag.name}"?`,
      description:
        uses > 0
          ? `It's attached to ${uses} ${uses === 1 ? "entry" : "entries"}. The entries stay; only this ${noun} is removed from them.`
          : `It isn't used by any entries.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteTag(tag.id)
          toast.success(`Deleted ${tag.name}`)
          await reload()
        } catch (e) {
          toast.error((e as Error).message)
        }
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={add} className="flex gap-2">
          <ColorPicker value={suggestedColor} onChange={setColor} />
          <Input
            placeholder={kind === "category" ? "New category, e.g. Insurance" : "Name, e.g. Alex"}
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10"
          />
          <Button type="submit" className="h-10" disabled={!name.trim()}>
            <Plus /> Add
          </Button>
        </form>

        {loading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
        ) : list.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No {kind === "category" ? "categories" : "people"} yet. Add one above.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {list.map((tag) => (
              <TagRow key={tag.id} tag={tag} onDelete={() => askDelete(tag)} onChanged={reload} />
            ))}
          </ul>
        )}
      </CardContent>
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </Card>
  )
}

function TagRow({
  tag,
  onDelete,
  onChanged,
}: {
  tag: Tag
  onDelete: () => void
  onChanged: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(tag.name)

  async function save(patch: Partial<Pick<Tag, "name" | "color">>) {
    try {
      await updateTag(tag.id, patch)
      await onChanged()
    } catch (e) {
      const msg = (e as Error).message
      toast.error(msg.includes("duplicate") ? "That name is already used" : msg)
    }
  }

  async function saveName() {
    const trimmed = name.trim()
    setEditing(false)
    if (!trimmed || trimmed === tag.name) return setName(tag.name)
    await save({ name: trimmed })
  }

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <ColorPicker value={tag.color} onChange={(color) => save({ color })} />
      {editing ? (
        <>
          <Input
            autoFocus
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName()
              if (e.key === "Escape") {
                setName(tag.name)
                setEditing(false)
              }
            }}
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
              setName(tag.name)
              setEditing(false)
            }}
          >
            <X />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 truncate font-medium">{tag.name}</span>
          <Button variant="ghost" size="icon" aria-label={`Rename ${tag.name}`} onClick={() => setEditing(true)}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${tag.name}`} onClick={onDelete}>
            <Trash2 />
          </Button>
        </>
      )}
    </li>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Choose colour"
        className="flex size-10 shrink-0 items-center justify-center rounded-lg border hover:bg-muted"
      >
        <span className="size-5 rounded-full" style={{ backgroundColor: value }} />
      </PopoverTrigger>
      <PopoverContent className="w-auto" align="start">
        <div className="grid grid-cols-5 gap-2">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => {
                onChange(c)
                setOpen(false)
              }}
              className={cn(
                "size-8 rounded-full ring-offset-2 ring-offset-popover",
                c === value && "ring-2 ring-foreground"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
