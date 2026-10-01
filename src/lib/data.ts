import { createClient } from "@/lib/supabase/client"
import { DEFAULT_CATEGORIES } from "@/lib/colors"
import { addMonths, daysInMonth, monthStart } from "@/lib/format"
import type {
  Entry,
  EntryInput,
  Preset,
  PresetItem,
  PresetItemInput,
  Tag,
  TagKind,
} from "@/lib/types"

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

type EntryRow = Omit<Entry, "tagIds" | "amount" | "presetId"> & {
  amount: number | string
  preset_id: string | null
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
    presetId: row.preset_id,
  }
}

/** Entries from the start of `fromMonth` up to the end of `toMonth`. */
export async function fetchEntries(fromMonth: string, toMonth: string): Promise<Entry[]> {
  const rows = check(
    await db()
      .from("entries")
      .select("id, type, amount, description, date, preset_id, entry_tags(tag_id)")
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

/** `day` of `month` as YYYY-MM-DD, clamped so the 31st becomes e.g. 30 Sep. */
function dateInMonth(month: string, day: number) {
  return `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, "0")}`
}

/** Insert many entries plus their tag links. */
async function insertEntries(rows: (EntryInput & { presetId: string | null })[]) {
  if (!rows.length) return
  const inserted = check(
    await db()
      .from("entries")
      .insert(
        rows.map(({ type, amount, description, date, presetId }) => ({
          type,
          amount,
          description,
          date,
          preset_id: presetId,
        }))
      )
      .select("id")
  )
  // Postgres returns inserted rows in insert order.
  const links = inserted!.flatMap((row, i) =>
    rows[i].tagIds.map((tag_id) => ({ entry_id: row.id, tag_id }))
  )
  if (links.length) check(await db().from("entry_tags").insert(links))
}

/** Copy every entry (and its tags) from one month into another, keeping the day number. */
export async function copyMonth(fromMonth: string, toMonth: string): Promise<number> {
  const source = await fetchEntries(fromMonth, fromMonth)
  await insertEntries(
    source.map((e) => ({ ...e, date: dateInMonth(toMonth, Number(e.date.slice(8))) }))
  )
  return source.length
}

// ---------- presets ----------

type PresetItemRow = Omit<PresetItem, "amount" | "tagIds"> & {
  amount: number | string
  tag_ids: string[]
}

export async function fetchPresets(): Promise<Preset[]> {
  const rows = check(
    await db()
      .from("presets")
      .select("id, name, preset_items(id, type, amount, description, day, tag_ids)")
      .order("name")
  )
  return (rows as { id: string; name: string; preset_items: PresetItemRow[] }[]).map((p) => ({
    id: p.id,
    name: p.name,
    items: p.preset_items
      .map(({ tag_ids, amount, ...item }) => ({ ...item, amount: Number(amount), tagIds: tag_ids }))
      .sort((a, b) => a.day - b.day || (a.description ?? "").localeCompare(b.description ?? "")),
  }))
}

export async function createPreset(name: string) {
  check(await db().from("presets").insert({ name: name.trim() }))
}

export async function renamePreset(id: string, name: string) {
  check(await db().from("presets").update({ name: name.trim() }).eq("id", id))
}

/** Deletes the preset and its items. Entries already added from it are kept. */
export async function deletePreset(id: string) {
  check(await db().from("presets").delete().eq("id", id))
}

function presetItemRow({ tagIds, ...item }: PresetItemInput) {
  return { ...item, tag_ids: tagIds }
}

export async function createPresetItem(presetId: string, item: PresetItemInput) {
  check(await db().from("preset_items").insert({ ...presetItemRow(item), preset_id: presetId }))
}

export async function updatePresetItem(id: string, item: PresetItemInput) {
  check(await db().from("preset_items").update(presetItemRow(item)).eq("id", id))
}

export async function deletePresetItem(id: string) {
  check(await db().from("preset_items").delete().eq("id", id))
}

/**
 * Add preset items to a month as ordinary entries, which can then be edited for that month
 * without changing the preset. Tags deleted since the item was saved are skipped.
 */
export async function applyPreset(
  presetId: string,
  items: PresetItem[],
  month: string,
  existingTagIds: Set<string>
) {
  await insertEntries(
    items.map((item) => ({
      type: item.type,
      amount: item.amount,
      description: item.description,
      date: dateInMonth(month, item.day),
      tagIds: item.tagIds.filter((id) => existingTagIds.has(id)),
      presetId,
    }))
  )
}
