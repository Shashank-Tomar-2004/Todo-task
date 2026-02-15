import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/constants";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuth = request.cookies.get(AUTH_COOKIE)?.value === "1";

  if (pathname.startsWith("/board") && !hasAuth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/login") && hasAuth) {
    return NextResponse.redirect(new URL("/board", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/board/:path*", "/login"],
};
