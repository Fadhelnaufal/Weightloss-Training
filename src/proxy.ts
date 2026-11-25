import { NextResponse, type NextRequest } from "next/server";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/session";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/offline"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionToken(token);

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json(
        { error: "Sesi tidak valid atau sudah berakhir." },
        { status: 401 },
      );
      if (pathname === "/api/auth/logout") {
        response.cookies.set(SESSION_COOKIE_NAME, "", {
          ...getSessionCookieOptions(),
          maxAge: 0,
        });
      }
      return response;
    }

    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/" && pathname.startsWith("/")) {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|sw.js|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
