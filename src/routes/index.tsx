import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Truck, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ProductCard } from "@/components/ProductCard";
import { fetchProducts } from "@/lib/shopify";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => fetchProducts(8),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Hàng mới mỗi tuần
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              HoLA smoking — sản phẩm tuyển chọn cho bạn.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Khám phá bộ sưu tập của HoLA smoking, giao hàng toàn quốc, thanh toán an toàn.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/products">
                  Xem tất cả sản phẩm <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:px-8">
          <Feature icon={<Truck className="h-5 w-5" />} title="Miễn phí vận chuyển" desc="Đơn từ $50" />
          <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Thanh toán an toàn" desc="Bảo mật bởi Shopify" />
          <Feature icon={<Sparkles className="h-5 w-5" />} title="Chất lượng chọn lọc" desc="Sản phẩm chính hãng" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Sản phẩm nổi bật</h2>
            <p className="mt-2 text-muted-foreground">Những lựa chọn hàng đầu tại HoLA smoking.</p>
          </div>
          <Link to="/products" className="hidden text-sm font-medium hover:underline sm:block">
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-secondary" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.node.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground">
        {icon}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <h3 className="text-lg font-semibold">No products found</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Your store is set up and ready. Tell me what you'd like to sell — e.g. "Add a ceramic mug for $28" — and I'll create it.
      </p>
    </div>
  );
}
