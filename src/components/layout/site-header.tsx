import { Suspense } from "react";
import { PageContainer } from "./page-container";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLinks, NavLinksView } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/75 backdrop-blur-xl">
      <PageContainer className="relative flex h-[var(--header-height)] items-center justify-between gap-4">
        <Logo />
        <div className="flex items-center gap-2">
          <nav aria-label="Primary" className="hidden md:block">
            <Suspense fallback={<NavLinksView pathname={null} />}>
              <NavLinks />
            </Suspense>
          </nav>
          <ThemeToggle />
          <MobileMenu />
        </div>
      </PageContainer>
    </header>
  );
}
