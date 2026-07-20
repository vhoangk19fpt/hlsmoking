import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wallet, Copy, ShieldCheck, Clock } from "lucide-react";

export const Route = createFileRoute("/wallet")({
  component: WalletPage,
  head: () => ({
    meta: [
      { title: "Ví của tôi — HoLA smoking" },
      { name: "description", content: "Nạp tiền qua mã QR (mô phỏng) và xem số dư ví." },
    ],
  }),
});

type Tx = { id: string; amount: number; kind: string; note: string | null; created_at: string };

// Thông tin ngân hàng mô phỏng (KHÔNG phải tài khoản thật)
const BANK = {
  bin: "970436", // Vietcombank BIN (VietQR)
  name: "Vietcombank",
  account: "1029384756",
  holder: "HOLA SMOKING DEMO",
};

function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  // QR state
  const [qrOpen, setQrOpen] = useState(false);
  const [qrAmount, setQrAmount] = useState(0);
  const [orderCode, setOrderCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

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

  // Đếm ngược 15 phút cho phiên QR
  useEffect(() => {
    if (!qrOpen) return;
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [qrOpen, secondsLeft]);

  const qrUrl = useMemo(() => {
    if (!qrAmount) return "";
    const memo = encodeURIComponent(`HOLA ${orderCode}`);
    return `https://img.vietqr.io/image/${BANK.bin}-${BANK.account}-compact2.png?amount=${qrAmount}&addInfo=${memo}&accountName=${encodeURIComponent(BANK.holder)}`;
  }, [qrAmount, orderCode]);

  const openQr = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amount);
    if (!Number.isFinite(val) || val < 10000) return toast.error("Số tiền tối thiểu 10.000₫");
    if (val > 100_000_000) return toast.error("Số tiền tối đa 100.000.000₫");
    const code = "HL" + Date.now().toString().slice(-8);
    setOrderCode(code);
    setQrAmount(val);
    setSecondsLeft(15 * 60);
    setQrOpen(true);
  };

  const confirmPaid = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("topup_wallet", { _amount: qrAmount });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Đã ghi nhận ${qrAmount.toLocaleString("vi-VN")}₫ vào ví`);
    setQrOpen(false);
    setAmount("");
    setQrAmount(0);
    load();
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`Đã sao chép ${label}`));
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Ví của tôi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nạp tiền qua mã QR — <span className="font-medium">đây là môi trường demo, không phát sinh giao dịch ngân hàng thật</span>.
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

        {!qrOpen ? (
          <form onSubmit={openQr} className="mt-8 rounded-xl border border-border p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Số tiền muốn nạp (₫)</Label>
              <Input
                id="amount"
                type="number"
                min={10000}
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
            <Button type="submit" className="w-full">
              Tạo mã QR thanh toán
            </Button>
          </form>
        ) : (
          <div className="mt-8 rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between bg-secondary/40 px-6 py-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                <span>Cổng thanh toán VietQR (mô phỏng)</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-foreground">
                <Clock className="h-4 w-4" />
                {mm}:{ss}
              </div>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-[220px_1fr]">
              <div className="flex flex-col items-center">
                <div className="rounded-lg border border-border bg-white p-2">
                  {qrUrl && (
                    <img
                      src={qrUrl}
                      alt="Mã QR thanh toán VietQR"
                      className="h-52 w-52 object-contain"
                    />
                  )}
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Quét bằng app ngân hàng / Momo / ZaloPay
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <Row label="Ngân hàng" value={BANK.name} />
                <Row label="Chủ tài khoản" value={BANK.holder} />
                <Row label="Số tài khoản" value={BANK.account} onCopy={() => copy(BANK.account, "số tài khoản")} />
                <Row
                  label="Số tiền"
                  value={`${qrAmount.toLocaleString("vi-VN")} ₫`}
                  onCopy={() => copy(String(qrAmount), "số tiền")}
                  bold
                />
                <Row label="Nội dung CK" value={`HOLA ${orderCode}`} onCopy={() => copy(`HOLA ${orderCode}`, "nội dung")} />

                <div className="rounded-md border border-dashed border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                  ⚠️ Đây là màn hình <b>mô phỏng phục vụ demo học tập</b>. Không chuyển tiền thật vào tài khoản trên — nhấn <b>“Tôi đã thanh toán”</b> để cộng số dư ảo vào ví.
                </div>

                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Button onClick={confirmPaid} disabled={busy || secondsLeft <= 0} className="flex-1">
                    {busy ? "Đang xác nhận..." : "Tôi đã thanh toán"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setQrOpen(false);
                      setQrAmount(0);
                    }}
                    className="flex-1"
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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

function Row({
  label,
  value,
  onCopy,
  bold,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-none">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={bold ? "font-semibold text-foreground" : "text-foreground"}>{value}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Sao chép ${label}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
