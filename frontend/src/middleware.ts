import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { locales, defaultLocale, Locale } from "@/i18n/config";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/en",
  "/tr",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/book(.*)",
  "/confirm(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  "/data-deletion(.*)",
]);

// Define admin routes that require special handling
const isAdminRoute = createRouteMatcher([
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  
  // Debug logging - remove after confirming middleware runs
  console.log("[Clerk Middleware] Running for path:", pathname);

  // Handle root path - redirect to detected locale
  if (pathname === "/") {
    // Check for locale cookie first
    const localeCookie = request.cookies.get("NEXT_LOCALE")?.value as Locale | undefined;
    
    if (localeCookie && locales.includes(localeCookie)) {
      return NextResponse.redirect(new URL(`/${localeCookie}`, request.url));
    }

    // Detect from Accept-Language header
    const acceptLanguage = request.headers.get("accept-language");
    let detectedLocale: Locale = defaultLocale;

    if (acceptLanguage) {
      const browserLocales = acceptLanguage
        .split(",")
        .map((lang) => lang.split(";")[0].trim().substring(0, 2).toLowerCase());

      for (const browserLocale of browserLocales) {
        if (locales.includes(browserLocale as Locale)) {
          detectedLocale = browserLocale as Locale;
          break;
        }
      }
    }

    const response = NextResponse.redirect(new URL(`/${detectedLocale}`, request.url));
    response.cookies.set("NEXT_LOCALE", detectedLocale, {
      path: "/",
      maxAge: 31536000, // 1 year
      sameSite: "lax",
    });
    return response;
  }

  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Explicitly return NextResponse.next() for public routes
  // This ensures Clerk properly attaches auth context
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
