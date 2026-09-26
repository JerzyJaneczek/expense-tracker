"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { nextColor } from "@/lib/colors"
import * as data from "@/lib/data"
import type { Tag, TagKind } from "@/lib/types"

type TagsContextValue = {
  tags: Tag[]
  loading: boolean
  byId: Map<string, Tag>
  categories: Tag[]
  people: Tag[]
  reload: () => Promise<void>
  addTag: (name: string, kind: TagKind, color?: string) => Promise<Tag | null>
}

const TagsContext = createContext<TagsContextValue | null>(null)

export function TagsProvider({ children }: { children: React.ReactNode }) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      setTags(await data.fetchTags())
    } catch (e) {
      toast.error(`Couldn't load tags: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    data
      .ensureDefaultTags()
      .catch((e) => toast.error((e as Error).message))
      .finally(reload)
  }, [reload])

  const addTag = useCallback(
    async (name: string, kind: TagKind, color?: string) => {
      const trimmed = name.trim()
      if (!trimmed) return null
      const existing = tags.find(
        (t) => t.kind === kind && t.name.toLowerCase() === trimmed.toLowerCase()
      )
      if (existing) return existing
      try {
        const tag = await data.createTag(
          trimmed,
          kind,
          color ?? nextColor(tags.filter((t) => t.kind === kind).map((t) => t.color))
        )
        setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
        return tag
      } catch (e) {
        toast.error((e as Error).message)
        return null
      }
    },
    [tags]
  )

  const value = useMemo(
    () => ({
      tags,
      loading,
      byId: new Map(tags.map((t) => [t.id, t])),
      categories: tags.filter((t) => t.kind === "category"),
      people: tags.filter((t) => t.kind === "person"),
      reload,
      addTag,
    }),
    [tags, loading, reload, addTag]
  )

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>
}

export function useTags() {
  const ctx = useContext(TagsContext)
  if (!ctx) throw new Error("useTags must be used inside <TagsProvider>")
  return ctx
}
