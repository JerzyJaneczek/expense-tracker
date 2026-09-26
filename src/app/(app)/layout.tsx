import { BottomNav, TopNav } from "@/components/nav"
import { TagsProvider } from "@/components/tags-provider"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TagsProvider>
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 sm:pb-10">{children}</main>
      <BottomNav />
    </TagsProvider>
  )
}
