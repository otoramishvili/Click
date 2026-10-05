/* 2550 -> "2,550 ₾", 59.5 -> "59.50 ₾" */
export function formatPrice(amount: number): string {
  const fixed = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  const [whole, decimals] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${decimals ? `${grouped}.${decimals}` : grouped} ₾`;
}

/*
  Money is added up in tetri (whole numbers) so that 0.1 + 0.2 style rounding
  errors never reach an invoice.
*/
export function toTetri(amount: number): number {
  return Math.round(amount * 100);
}

export function fromTetri(tetri: number): number {
  return tetri / 100;
}
