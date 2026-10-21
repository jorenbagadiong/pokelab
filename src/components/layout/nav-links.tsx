"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { FavoritesCount } from "./favorites-count";
import { isActivePath, NAV_ITEMS } from "./nav-config";

const linkBase =
  "relative inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium transition-colors duration-200 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export function NavLinksView({
  pathname,
  orientation = "horizontal",
  onNavigate,
}: {
  pathname: string | null;
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
}) {
  return (
    <ul className={cn("flex gap-1", orientation === "vertical" && "flex-col")}>
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                linkBase,
                orientation === "vertical" && "h-11 w-full px-4 text-base",
                active ? "bg-accent-soft text-text" : "text-muted hover:bg-surface-hover hover:text-text",
              )}
            >
              {item.label}
              {item.href === "/favorites" && <FavoritesCount />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Nav links with active state. Must be rendered inside a Suspense boundary. */
export function NavLinks(props: { orientation?: "horizontal" | "vertical"; onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavLinksView pathname={pathname} {...props} />;
}
