/* Green dot and "In stock", or grey dot and "Out of stock". */
export function StockStatus({
  inStock,
  className = "",
}: {
  inStock: boolean;
  className?: string;
}) {
  return (
    <p
      className={`flex items-center gap-2 text-sm font-medium ${
        inStock ? "text-success" : "text-base-content/60"
      } ${className}`}
    >
      <span
        className={`size-2 rounded-full ${inStock ? "bg-success" : "bg-base-content/30"}`}
        aria-hidden
      />
      {inStock ? "In stock" : "Out of stock"}
    </p>
  );
}
