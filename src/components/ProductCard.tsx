import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { formatMoney, type ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";

export function ProductCard({ product }: { product: ShopifyProduct }) {
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const p = product.node;
  const variant = p.variants.edges[0]?.node;
  const image = p.images.edges[0]?.node;
  const price = p.priceRange.minVariantPrice;

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });
    toast.success("Added to cart", { position: "top-center" });
  };

  return (
    <Link
      to="/product/$handle"
      params={{ handle: p.handle }}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-lg"
    >
      <div className="aspect-square overflow-hidden bg-secondary">
        {image ? (
          <img
            src={image.url}
            alt={image.altText || p.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-medium leading-tight">{p.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="font-semibold">{formatMoney(price.amount, price.currencyCode)}</span>
          <Button size="sm" onClick={handleAdd} disabled={isLoading || !variant}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to cart"}
          </Button>
        </div>
      </div>
    </Link>
  );
}
