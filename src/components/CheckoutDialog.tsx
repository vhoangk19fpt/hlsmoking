import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(1, "Nhập họ tên").max(100),
  phone: z
    .string()
    .trim()
    .min(8, "Số điện thoại không hợp lệ")
    .max(20)
    .regex(/^[+\d\s-]+$/, "Số điện thoại chỉ chứa số"),
  address: z.string().trim().min(5, "Nhập địa chỉ đầy đủ").max(500),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}

export function CheckoutDialog({ open, onOpenChange, userId }: Props) {
  const { items, getCheckoutUrl } = useCartStore();
  const [busy, setBusy] = useState(false);

  const total = items.reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0);
  const currency = items[0]?.price.currencyCode || "USD";

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      full_name: fd.get("full_name"),
      phone: fd.get("phone"),
      address: fd.get("address"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setBusy(true);
    const itemsPayload = items.map((i) => ({
      title: i.product.node.title,
      variantId: i.variantId,
      variantTitle: i.variantTitle,
      quantity: i.quantity,
      price: i.price,
    }));
    const { error } = await supabase.from("orders").insert({
      user_id: userId,
      items: itemsPayload,
      total,
      currency,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      address: parsed.data.address,
    });
    setBusy(false);
    if (error) return toast.error(error.message);

    const url = getCheckoutUrl();
    if (url) window.open(url, "_blank");
    toast.success("Đã lưu thông tin, chuyển đến trang thanh toán");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thông tin người mua</DialogTitle>
          <DialogDescription>
            Điền thông tin giao hàng trước khi tiếp tục thanh toán.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="co-name">Họ và tên</Label>
            <Input id="co-name" name="full_name" required maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="co-phone">Số điện thoại</Label>
            <Input id="co-phone" name="phone" required maxLength={20} inputMode="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="co-address">Địa chỉ nhận hàng</Label>
            <Textarea id="co-address" name="address" required maxLength={500} rows={3} />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Đang xử lý..." : "Tiếp tục thanh toán"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
