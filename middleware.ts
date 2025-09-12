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

  // Handle auth redirects - redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup" || pathname === "/callback")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Protect private routes - redirect unauthenticated users to login
  // Since route groups don't affect URLs, we protect specific paths that map to (private) routes
  if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/function-model") || pathname.startsWith("/profile") || pathname.startsWith("/settings"))) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
