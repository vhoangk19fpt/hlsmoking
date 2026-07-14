import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/wallet")({
  component: WalletPage,
  head: () => ({
    meta: [
      { title: "Ví của tôi — LH smoking" },
      { name: "description", content: "Nạp tiền mô phỏng và xem số dư ví của bạn." },
    ],
  }),
});

type Tx = { id: string; amount: number; kind: string; note: string | null; created_at: string };

function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("wallet_balance").eq("id", user.id).maybeSingle();
    setBalance(p?.wallet_balance ? Number(p.wallet_balance) : 0);
    const { data: t } = await supabase
      .from("wallet_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setTxs((t as Tx[]) ?? []);
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const topup = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) return toast.error("Số tiền không hợp lệ");
    if (val > 100_000_000) return toast.error("Số tiền quá lớn");
    setBusy(true);
    const { error } = await supabase.rpc("topup_wallet", { _amount: val });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Đã nạp ${val.toLocaleString("vi-VN")} vào ví`);
    setAmount("");
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Ví của tôi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nạp tiền mô phỏng để dùng thử — đây là môi trường demo, không phát sinh giao dịch thật.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-secondary/30 p-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Wallet className="h-5 w-5" />
            <span className="text-sm">Số dư hiện tại</span>
          </div>
          <p className="mt-2 text-4xl font-bold">
            {balance === null ? "…" : balance.toLocaleString("vi-VN")}{" "}
            <span className="text-lg font-medium text-muted-foreground">₫</span>
          </p>
        </div>

        <form onSubmit={topup} className="mt-8 rounded-xl border border-border p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Số tiền muốn nạp (₫)</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              max={100000000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="ví dụ: 500000"
              required
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[100000, 500000, 1000000, 5000000].map((v) => (
              <Button key={v} type="button" variant="outline" size="sm" onClick={() => setAmount(String(v))}>
                +{v.toLocaleString("vi-VN")}₫
              </Button>
            ))}
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Đang nạp..." : "Nạp ngay (mô phỏng)"}
          </Button>
        </form>

        <div className="mt-8">
          <h2 className="text-lg font-semibold">Lịch sử giao dịch</h2>
          {txs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Chưa có giao dịch nào.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
              {txs.map((t) => (
                <li key={t.id} className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <p className="font-medium">{t.kind === "topup" ? "Nạp tiền" : t.kind}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <span className={t.amount > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    {t.amount > 0 ? "+" : ""}
                    {Number(t.amount).toLocaleString("vi-VN")}₫
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
