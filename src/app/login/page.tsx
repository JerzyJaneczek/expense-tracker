import { LoginForm } from "./login-form"

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <LoginForm linkFailed={error === "link"} />
    </main>
  )
}
