import { createClient } from "@/lib/supabase/client"
import { DEFAULT_CATEGORIES } from "@/lib/colors"
import { addMonths, daysInMonth, monthStart } from "@/lib/format"
import type { Entry, EntryInput, Tag, TagKind } from "@/lib/types"

let client: ReturnType<typeof createClient> | undefined
const db = () => (client ??= createClient())

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data
}

// ---------- tags ----------

export async function fetchTags(): Promise<Tag[]> {
  const rows = check(
    await db().from("tags").select("id, name, kind, color").order("name")
  )
  return rows as Tag[]
}

/** Seed the default categories the first time a user signs in. */
export async function ensureDefaultTags(): Promise<boolean> {
  const { count } = await db().from("tags").select("id", { count: "exact", head: true })
  if (count) return false
  check(
    await db().from("tags").upsert(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, kind: "category" })),
      { onConflict: "user_id,kind,name", ignoreDuplicates: true }
    )
  )
  return true
}

export async function createTag(name: string, kind: TagKind, color: string): Promise<Tag> {
  const row = check(
    await db()
      .from("tags")
      .insert({ name: name.trim(), kind, color })
      .select("id, name, kind, color")
      .single()
  )
  return row as Tag
}

export async function updateTag(id: string, patch: Partial<Pick<Tag, "name" | "color">>) {
  check(await db().from("tags").update(patch).eq("id", id))
}

export async function deleteTag(id: string) {
  check(await db().from("tags").delete().eq("id", id))
}

export async function countTagUsage(id: string): Promise<number> {
  const { count, error } = await db()
    .from("entry_tags")
    .select("entry_id", { count: "exact", head: true })
    .eq("tag_id", id)
  if (error) throw new Error(error.message)
  return count ?? 0
}

// ---------- entries ----------

type EntryRow = Omit<Entry, "tagIds" | "amount"> & {
  amount: number | string
  entry_tags: { tag_id: string }[]
}

function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    date: row.date,
    tagIds: row.entry_tags.map((t) => t.tag_id),
  }
}

/** Entries from the start of `fromMonth` up to the end of `toMonth`. */
export async function fetchEntries(fromMonth: string, toMonth: string): Promise<Entry[]> {
  const rows = check(
    await db()
      .from("entries")
      .select("id, type, amount, description, date, entry_tags(tag_id)")
      .gte("date", monthStart(fromMonth))
      .lt("date", monthStart(addMonths(toMonth, 1)))
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
  )
  return (rows as EntryRow[]).map(toEntry)
}

async function setEntryTags(entryId: string, tagIds: string[]) {
  check(await db().from("entry_tags").delete().eq("entry_id", entryId))
  if (tagIds.length) {
    check(
      await db()
        .from("entry_tags")
        .insert(tagIds.map((tag_id) => ({ entry_id: entryId, tag_id })))
    )
  }
}

export async function createEntry({ tagIds, ...fields }: EntryInput) {
  const row = check(await db().from("entries").insert(fields).select("id").single())
  await setEntryTags(row!.id, tagIds)
}

export async function updateEntry(id: string, { tagIds, ...fields }: EntryInput) {
  check(await db().from("entries").update(fields).eq("id", id))
  await setEntryTags(id, tagIds)
}

export async function deleteEntry(id: string) {
  check(await db().from("entries").delete().eq("id", id))
}

/** Copy every entry (and its tags) from one month into another, keeping the day number. */
export async function copyMonth(fromMonth: string, toMonth: string): Promise<number> {
  const source = await fetchEntries(fromMonth, fromMonth)
  if (!source.length) return 0
  const lastDay = daysInMonth(toMonth)

  const inserted = check(
    await db()
      .from("entries")
      .insert(
        source.map((e) => ({
          type: e.type,
          amount: e.amount,
          description: e.description,
          date: `${toMonth}-${String(Math.min(Number(e.date.slice(8)), lastDay)).padStart(2, "0")}`,
        }))
      )
      .select("id")
  )

  // Postgres returns inserted rows in insert order.
  const links = inserted!.flatMap((row, i) =>
    source[i].tagIds.map((tag_id) => ({ entry_id: row.id, tag_id }))
  )
  if (links.length) check(await db().from("entry_tags").insert(links))
  return source.length
}
