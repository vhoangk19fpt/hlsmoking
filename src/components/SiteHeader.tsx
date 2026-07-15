import { Link, useNavigate } from "@tanstack/react-router";
import { CartDrawer } from "./CartDrawer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Wallet, LogOut } from "lucide-react";

export function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">HoLA smoking</span>
        </Link>
        <nav className="hidden gap-6 sm:flex">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Trang chủ
          </Link>
          <Link to="/products" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Sản phẩm
          </Link>
          {user && (
            <Link to="/wallet" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Ví
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/wallet" })}>
                  <Wallet className="h-4 w-4 mr-2" /> Ví của tôi
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/auth" })}>
              Đăng nhập
            </Button>
          )}
          <CartDrawer />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} HoLA smoking. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
