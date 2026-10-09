export function buildQuotationTitle(options: {
  title?: string;
  customerName?: string;
  supplierName?: string;
}): string {
  const raw = options.title?.trim();
  if (raw) return raw;

  // Basic fallback if title not provided.
  const parts = [
    options.customerName?.trim(),
    options.supplierName?.trim(),
  ].filter(Boolean);
  return parts.length ? parts.join(" - ") : "";
}
