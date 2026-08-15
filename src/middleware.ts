import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";
import { getRequiredRoleForPath } from "@/lib/auth/role-guards";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const requiredRole = getRequiredRoleForPath(request.nextUrl.pathname);
  const userRole = request.auth?.user?.role;

  // If path doesn't require role, allow access
  if (!requiredRole) {
    return NextResponse.next();
  }

  const acceptHeader = request.headers.get("accept") || "";
  const isHtmlRequest = acceptHeader.includes("text/html") || request.nextUrl.pathname === "/";

  // If user not authenticated, for navigations redirect to login, for API/fetch return 401
  if (!request.auth?.user) {
    if (isHtmlRequest) {
      const loginUrl = new URL("/login", request.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", request.nextUrl.href);
      return NextResponse.redirect(loginUrl);
    }

    return new NextResponse(null, { status: 401 });
  }

  // If user role doesn't match required role, for navigations redirect to home, for API/fetch return 403
  if (userRole !== requiredRole) {
    if (isHtmlRequest) {
      return NextResponse.redirect(new URL("/", request.nextUrl.origin));
    }

    return new NextResponse(null, { status: 403 });
  }

  // Allow access
  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/mentor/:path*", "/intern/:path*"]
};
