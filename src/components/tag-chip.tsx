import { cn } from "@/lib/utils"
import type { Tag } from "@/lib/types"

export function TagChip({
  tag,
  selected,
  onClick,
  className,
}: {
  tag: Tag
  selected?: boolean
  onClick?: () => void
  className?: string
}) {
  const content = (
    <>
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
      <span className="truncate">{tag.name}</span>
    </>
  )
  const base =
    "inline-flex max-w-full items-center gap-1.5 rounded-full border text-xs font-medium transition-colors"

  if (!onClick) {
    return (
      <span className={cn(base, "border-border bg-muted/50 px-2 py-0.5 text-foreground", className)}>
        {content}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        base,
        "min-h-9 px-3 py-1.5 text-sm",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:bg-muted",
        className
      )}
    >
      {content}
    </button>
  )
}
