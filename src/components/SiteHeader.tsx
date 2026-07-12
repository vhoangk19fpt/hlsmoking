import { Link } from "@tanstack/react-router";
import { CartDrawer } from "./CartDrawer";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">Shop with Love</span>
        </Link>
        <nav className="hidden gap-6 sm:flex">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <Link to="/products" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Shop
          </Link>
        </nav>
        <CartDrawer />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Shop with Love. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
