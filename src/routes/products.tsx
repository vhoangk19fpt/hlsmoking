import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ProductCard } from "@/components/ProductCard";
import { fetchProducts } from "@/lib/shopify";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Shop — Shop with Love" },
      { name: "description", content: "Browse the full collection." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => fetchProducts(50),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">All products</h1>
          <p className="mt-2 text-muted-foreground">Everything currently in stock.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-secondary" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <h3 className="text-lg font-semibold">No products found</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Tell me what to add and I'll create it — e.g. "Add a linen tote bag for $32".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.node.id} product={p} />
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
