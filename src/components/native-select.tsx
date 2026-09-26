import { cn } from "@/lib/utils"

/** Native <select>: uses the phone's own picker, which is the nicest option on mobile. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:[&>option]:bg-popover",
        className
      )}
      {...props}
    />
  )
}
