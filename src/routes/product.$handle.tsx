import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { fetchProductByHandle, formatMoney } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";

export const Route = createFileRoute("/product/$handle")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { handle } = useParams({ from: "/product/$handle" });
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", handle],
    queryFn: () => fetchProductByHandle(handle),
  });
  const addItem = useCartStore((s) => s.addItem);
  const cartLoading = useCartStore((s) => s.isLoading);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="aspect-square animate-pulse rounded-lg bg-secondary" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded bg-secondary" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-secondary" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <p className="mt-2 text-muted-foreground">This item may no longer be available.</p>
          <Button asChild className="mt-6">
            <Link to="/products">Back to shop</Link>
          </Button>
        </div>
      </div>
    );
  }

  const p = product.node;
  const variants = p.variants.edges.map((e) => e.node);
  const selectedVariant = variants.find((v) => v.id === variantId) ?? variants[0];
  const images = p.images.edges;
  const image = images[activeImage]?.node ?? images[0]?.node;

  const handleAdd = async () => {
    if (!selectedVariant) return;
    await addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions || [],
    });
    toast.success("Added to cart", { position: "top-center" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/products"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to shop
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-lg bg-secondary">
              {image && (
                <img src={image.url} alt={image.altText || p.title} className="h-full w-full object-cover" />
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={img.node.url}
                    onClick={() => setActiveImage(i)}
                    className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border-2 ${
                      i === activeImage ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={img.node.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">{p.title}</h1>
            <p className="mt-3 text-2xl font-semibold">
              {selectedVariant &&
                formatMoney(selectedVariant.price.amount, selectedVariant.price.currencyCode)}
            </p>

            {p.description && (
              <div className="mt-6 whitespace-pre-line text-muted-foreground">{p.description}</div>
            )}

            {p.options.length > 0 && variants.length > 1 && (
              <div className="mt-8 space-y-4">
                {p.options.map((opt) => (
                  <div key={opt.name}>
                    <p className="mb-2 text-sm font-medium">{opt.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {variants.map((v) => {
                        const optVal = v.selectedOptions.find((o) => o.name === opt.name)?.value;
                        if (!optVal) return null;
                        const isActive = (selectedVariant?.id ?? variants[0].id) === v.id;
                        return (
                          <button
                            key={v.id + opt.name}
                            onClick={() => setVariantId(v.id)}
                            disabled={!v.availableForSale}
                            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                              isActive
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border hover:border-foreground"
                            } ${!v.availableForSale ? "opacity-40" : ""}`}
                          >
                            {optVal}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleAdd}
              size="lg"
              className="mt-8 w-full sm:w-auto"
              disabled={cartLoading || !selectedVariant?.availableForSale}
            >
              {cartLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : selectedVariant?.availableForSale ? (
                "Add to cart"
              ) : (
                "Sold out"
              )}
            </Button>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
