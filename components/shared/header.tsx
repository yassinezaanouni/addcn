import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./logo";
import { UserDropdown } from "./user-dropdown";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/30 bg-gradient-to-r from-background/80 via-background/60 to-background/80 backdrop-blur-md">
      {/* Subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="container flex h-14 items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Logo />
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserDropdown />
        </div>
      </div>
    </header>
  );
}
