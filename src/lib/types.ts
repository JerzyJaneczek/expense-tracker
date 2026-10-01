export type TagKind = "category" | "person"
export type EntryType = "income" | "expense"

export type Tag = {
  id: string
  name: string
  kind: TagKind
  color: string
}

export type Entry = {
  id: string
  type: EntryType
  amount: number
  description: string | null
  date: string // YYYY-MM-DD
  tagIds: string[]
  /** The preset this entry was added from, if any. */
  presetId: string | null
}

export type EntryInput = Omit<Entry, "id" | "presetId">

export type PresetItem = {
  id: string
  type: EntryType
  amount: number
  description: string | null
  /** Day of the month the entry lands on (clamped to the month's length). */
  day: number
  tagIds: string[]
}

export type PresetItemInput = Omit<PresetItem, "id">

export type Preset = {
  id: string
  name: string
  items: PresetItem[]
}
