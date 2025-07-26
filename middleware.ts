import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "./lib/supabase/middleware"
import { createClient } from "./lib/supabase/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Update session
  const response = await updateSession(request)

  // Get user from session
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Handle auth redirects
  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Protect private routes
  if (!user && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
