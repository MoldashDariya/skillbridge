import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const ROLE_REDIRECT: Record<string, string> = {
  student: "/student",
  employer: "/employer",
  college_admin: "/admin",
}

const PROTECTED_PREFIXES = ["/student", "/employer", "/admin"]

// Maps each role to the ONLY prefix it may access
const ROLE_ALLOWED_PREFIX: Record<string, string> = {
  student: "/student",
  employer: "/employer",
  college_admin: "/admin",
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const redirect = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    return NextResponse.redirect(url)
  }

  // Not logged in trying to access protected route
  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return redirect("/auth")
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, approval_status")
      .eq("user_id", user.id)
      .single()

    if (!profile) return redirect("/auth")

    const status = profile.approval_status

    // Pending/rejected users can't access dashboards
    if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
      if (status === "pending" || status === "rejected") return redirect("/pending")

      // RBAC: approved users may only access their own role's prefix
      const allowedPrefix = ROLE_ALLOWED_PREFIX[profile.role]
      if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
        return redirect(ROLE_REDIRECT[profile.role] ?? "/")
      }
    }

    // Approved user on /pending → send to dashboard
    if (pathname === "/pending" && status === "approved") {
      return redirect(ROLE_REDIRECT[profile.role] ?? "/")
    }

    // Logged-in user on /auth → send to dashboard
    if (pathname === "/auth") {
      if (status === "pending" || status === "rejected") return redirect("/pending")
      return redirect(ROLE_REDIRECT[profile.role] ?? "/")
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
