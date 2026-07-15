import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Đặt lại mật khẩu — HoLA smoking" },
      { name: "description", content: "Đặt lại mật khẩu tài khoản HoLA smoking." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const passwordSchema = z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(72);

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase sets a recovery session from the URL hash automatically.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = passwordSchema.safeParse(fd.get("password"));
    const confirm = passwordSchema.safeParse(fd.get("confirm_password"));
    if (!password.success) return toast.error(password.error.issues[0].message);
    if (!confirm.success) return toast.error(confirm.error.issues[0].message);
    if (password.data !== confirm.data)
      return toast.error("Mật khẩu xác nhận không khớp");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password.data });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Đã cập nhật mật khẩu");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center text-2xl font-bold tracking-tight mb-8">
          HoLA smoking
        </Link>
        <div className="rounded-lg border border-border p-6">
          <h1 className="text-xl font-semibold mb-1">Đặt lại mật khẩu</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {ready
              ? "Nhập mật khẩu mới cho tài khoản của bạn."
              : "Mở đường dẫn đặt lại mật khẩu từ email để tiếp tục."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input id="new-password" name="password" type="password" required minLength={6} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-confirm">Xác nhận mật khẩu</Label>
              <Input id="new-confirm" name="confirm_password" type="password" required minLength={6} autoComplete="new-password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !ready}>
              {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
