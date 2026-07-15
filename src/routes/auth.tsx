import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Đăng nhập — HoLA smoking" },
      { name: "description", content: "Đăng nhập hoặc đăng ký tài khoản HoLA smoking." },
    ],
  }),
});

const emailSchema = z.string().trim().email("Email không hợp lệ").max(255);
const passwordSchema = z
  .string()
  .min(8, "Mật khẩu tối thiểu 8 ký tự")
  .max(72)
  .regex(/[A-Za-z]/, "Mật khẩu phải chứa chữ cái")
  .regex(/[0-9]/, "Mật khẩu phải chứa số");
const nameSchema = z.string().trim().min(1, "Nhập họ tên").max(100);

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = emailSchema.safeParse(fd.get("email"));
    const password = passwordSchema.safeParse(fd.get("password"));
    if (!email.success) return toast.error(email.error.issues[0].message);
    if (!password.success) return toast.error(password.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.data,
      password: password.data,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Đăng nhập thành công");
    navigate({ to: "/" });
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = nameSchema.safeParse(fd.get("full_name"));
    const email = emailSchema.safeParse(fd.get("email"));
    const password = passwordSchema.safeParse(fd.get("password"));
    const confirm = passwordSchema.safeParse(fd.get("confirm_password"));
    if (!name.success) return toast.error(name.error.issues[0].message);
    if (!email.success) return toast.error(email.error.issues[0].message);
    if (!password.success) return toast.error(password.error.issues[0].message);
    if (!confirm.success) return toast.error(confirm.error.issues[0].message);
    if (password.data !== confirm.data)
      return toast.error("Mật khẩu xác nhận không khớp");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.data,
      password: password.data,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name.data },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Đăng ký thành công");
    navigate({ to: "/" });
  };

  const handleForgot = async () => {
    const emailEl = document.getElementById("login-email") as HTMLInputElement | null;
    const parsed = emailSchema.safeParse(emailEl?.value);
    if (!parsed.success) return toast.error("Nhập email ở ô phía trên để đặt lại mật khẩu");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Đã gửi email đặt lại mật khẩu");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center text-2xl font-bold tracking-tight mb-8">
          HoLA smoking
        </Link>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Đăng nhập</TabsTrigger>
            <TabsTrigger value="signup">Đăng ký</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-6 rounded-lg border border-border p-6">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" name="email" type="email" required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Mật khẩu</Label>
                  <button
                    type="button"
                    onClick={handleForgot}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <Input id="login-password" name="password" type="password" required autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Đang xử lý..." : "Đăng nhập"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4 mt-6 rounded-lg border border-border p-6">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Họ và tên</Label>
                <Input id="signup-name" name="full_name" required maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" name="email" type="email" required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Mật khẩu</Label>
                <Input id="signup-password" name="password" type="password" required autoComplete="new-password" minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-confirm">Xác nhận mật khẩu</Label>
                <Input id="signup-confirm" name="confirm_password" type="password" required autoComplete="new-password" minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Đang xử lý..." : "Tạo tài khoản"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
