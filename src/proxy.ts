import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap, data-free checks for Pokémon detail URLs:
 * - malformed percent-encoding would otherwise fail inside the router with a 500;
 * - mixed-case slugs get a real 308 to the lowercase URL.
 * Unknown Pokémon and id/alias redirects are resolved by the page, which has the data.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.slice("/pokemon/".length);

  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return new NextResponse("Bad Request: malformed URL", { status: 400 });
  }

  const lower = decoded.toLowerCase();
  if (lower !== decoded) {
    const url = request.nextUrl.clone();
    url.pathname = `/pokemon/${encodeURIComponent(lower)}`;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/pokemon/:name",
};
