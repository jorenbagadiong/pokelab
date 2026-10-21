export const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/pokemon", label: "Pokédex" },
  { href: "/favorites", label: "Favorites" },
] as const;

export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
