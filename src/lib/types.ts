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
}

export type EntryInput = Omit<Entry, "id">
