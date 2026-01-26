import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function createServerClient() {
  const cookieStore = await cookies()

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  // Custom cookie handling for Next.js
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
      cookieStore.set("supabase-auth-token", session?.access_token || "", {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }
    if (event === "SIGNED_OUT") {
      cookieStore.delete("supabase-auth-token")
    }
  })

  return supabase
}
