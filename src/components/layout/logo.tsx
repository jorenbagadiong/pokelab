import Link from "next/link";
import { LogoWordmark } from "./logo-wordmark";

/** Original "Nexus" mark: a hexagonal node with a split core. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="nexus-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25Z" fill="none" stroke="url(#nexus-mark)" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M9.5 16h13" stroke="url(#nexus-mark)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="4.2" fill="var(--bg)" stroke="url(#nexus-mark)" strokeWidth="2.2" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 rounded-full pr-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
    >
      <LogoMark className="size-8 transition-transform duration-500 ease-out-quart group-hover:rotate-[30deg]" />
      <LogoWordmark />
      <span className="sr-only"> home</span>
    </Link>
  );
}
