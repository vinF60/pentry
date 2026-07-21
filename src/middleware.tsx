import { NextRequest, NextResponse } from "next/server";

function shuffleString(input: string): string {
  const chars = input?.split("");
  // Create a seed from the string
  let seed = 0;
  for (const ch of input) {
    seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  }
  // Seeded pseudo-random generator
  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Allow auth page
  // if (pathname.startsWith("/auth")) {
  //   return NextResponse.next();
  // }
  const emailCookie = request.cookies.get("email")?.value;
  const passwordCookie = request.cookies.get("password")?.value;
  const emailHash = shuffleString(process.env.NEXT_PUBLIC_API_EMAIL!);
  const passwordHash = shuffleString(process.env.NEXT_PUBLIC_API_PASSWORD!);
  const isAuthenticated =
    emailCookie === emailHash && passwordCookie === passwordHash;
  if (!isAuthenticated &&  !pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }else if(isAuthenticated && pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/", request.url));

  }
  return NextResponse.next();
}
export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"],
};
