import { NextResponse, type NextRequest } from "next/server";

const ADMIN_MATCHERS = [/^\/admin(?:\/|$)/, /^\/api\/admin(?:\/|$)/];

function needsAuth(pathname: string) {
  return ADMIN_MATCHERS.some((pattern) => pattern.test(pathname));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!needsAuth(pathname)) {
    return NextResponse.next();
  }

  const user = process.env.ADMIN_BASIC_USER;
  const pass = process.env.ADMIN_BASIC_PASS;
  if (!user || !pass) {
    return new NextResponse("Admin auth not configured", { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Basic ")) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
    });
  }

  let decoded = "";
  try {
    decoded = atob(auth.slice(6));
  } catch {
    return new NextResponse("Invalid credentials", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
    });
  }
  const sep = decoded.indexOf(":");
  const providedUser = sep >= 0 ? decoded.slice(0, sep) : decoded;
  const providedPass = sep >= 0 ? decoded.slice(sep + 1) : "";

  if (providedUser !== user || providedPass !== pass) {
    return new NextResponse("Invalid credentials", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
