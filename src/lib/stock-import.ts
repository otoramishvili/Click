/*
  Turns a table from 1C into a stock update for the products on the site.
  Products are matched by SKU. Nothing here touches Firebase: it only works
  out WHAT would change, so the admin can check it before saving.
*/
import type { Product } from "@/lib/catalog";
import type { Sheet } from "@/lib/spreadsheet";

/* "tk-1001 " and "TK-1001" are the same SKU */
export function normalizeSku(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

/*
  Reads a quantity the way 1C and Excel write it:
  "5", "5.000", "5,000" (comma as decimal mark), "1 234,5", "1,234.5".
  Returns null when the cell is not a number. Negative stock counts as 0.
*/
export function parseQuantity(cell: string): number | null {
  let text = cell.trim().replace(/[\s\u00a0\u202f]/g, "");
  if (!text) return null;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    /* Both are used: the later one is the decimal mark */
    text =
      lastComma > lastDot
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else if (lastComma > -1) {
    text = text.replace(",", ".");
  }

  if (!/^-?\d+(\.\d+)?(e[-+]?\d+)?$/i.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return null;

  return Math.max(0, Math.round(value * 1000) / 1000);
}

/* 0 -> "A", 27 -> "AB" */
export function columnLetter(index: number): string {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
}

export type ColumnOption = { index: number; label: string };

/* One entry per column, labelled like:  B: Артикул */
export function describeColumns(sheet: Sheet): ColumnOption[] {
  const width = sheet.reduce((max, row) => Math.max(max, row.length), 0);
  const options: ColumnOption[] = [];

  for (let index = 0; index < width; index++) {
    /* The first text in the column is most likely its heading */
    const heading = sheet
      .slice(0, 30)
      .map((row) => (row[index] ?? "").trim())
      .find((value) => value !== "" && parseQuantity(value) === null);
    const short = heading && heading.length > 32 ? `${heading.slice(0, 32)}…` : heading;
    options.push({
      index,
      label: short ? `${columnLetter(index)}: ${short}` : columnLetter(index),
    });
  }

  return options;
}

/* Words that mark a quantity column in Russian, English and Georgian exports */
const QUANTITY_WORDS = ["остат", "колич", "кол-во", "qty", "quant", "stock", "balance", "ნაშთ", "რაოდ"];

/*
  Guesses which column holds the SKU and which the quantity. -1 = no idea.
  The SKU column is the one where the most cells are SKUs of products on the site.
*/
export function guessColumns(
  sheet: Sheet,
  products: Product[],
): { skuColumn: number; quantityColumn: number } {
  const skus = new Set(products.map((product) => normalizeSku(product.sku)));
  const width = sheet.reduce((max, row) => Math.max(max, row.length), 0);

  let skuColumn = -1;
  let bestMatches = 0;
  for (let column = 0; column < width; column++) {
    const matches = sheet.filter((row) => skus.has(normalizeSku(row[column] ?? ""))).length;
    if (matches > bestMatches) {
      bestMatches = matches;
      skuColumn = column;
    }
  }
  if (skuColumn === -1) return { skuColumn: -1, quantityColumn: -1 };

  const matchedRows = sheet.filter((row) => skus.has(normalizeSku(row[skuColumn] ?? "")));
  const numericCount = (column: number) =>
    matchedRows.filter((row) => parseQuantity(row[column] ?? "") !== null).length;

  let quantityColumn = -1;

  /* 1st choice: a column whose heading says "quantity" or "balance" */
  for (let column = 0; column < width; column++) {
    if (column === skuColumn || numericCount(column) === 0) continue;
    const hasHeading = sheet.some((row) => {
      const value = (row[column] ?? "").toLowerCase();
      return QUANTITY_WORDS.some((word) => value.includes(word));
    });
    if (hasHeading) quantityColumn = column;
  }

  /* 2nd choice: the right-most column that is a number on nearly every product row */
  if (quantityColumn === -1) {
    for (let column = width - 1; column >= 0; column--) {
      if (column !== skuColumn && numericCount(column) >= matchedRows.length * 0.8) {
        quantityColumn = column;
        break;
      }
    }
  }

  return { skuColumn, quantityColumn };
}

export type StockLine = {
  product: Product;
  newStock: number;
  /* "file": the quantity was in the file. "missing": not in the file, so set to 0. */
  source: "file" | "missing";
};

export type StockPlan = {
  /* Every product whose stock would be set, changed or not */
  lines: StockLine[];
  /* Products found in the file with a readable quantity */
  matchedCount: number;
  /* Products on the site that the file does not mention */
  missing: Product[];
  /* Products found in the file whose quantity cell was not a number: left alone */
  unreadable: Product[];
};

/*
  Works out the new stock of every product.
  A SKU that appears on several rows (several warehouses) has its quantities added up.
*/
export function buildStockPlan(
  sheet: Sheet,
  skuColumn: number,
  quantityColumn: number,
  products: Product[],
  markMissingOutOfStock: boolean,
): StockPlan {
  const bySku = new Map(products.map((product) => [normalizeSku(product.sku), product]));
  const totals = new Map<string, number>();
  const unreadableIds = new Set<string>();

  for (const row of sheet) {
    const sku = normalizeSku(row[skuColumn] ?? "");
    const product = bySku.get(sku);
    if (!product) continue;

    const quantity = parseQuantity(row[quantityColumn] ?? "");
    if (quantity === null) {
      unreadableIds.add(product.id);
      continue;
    }
    totals.set(sku, Math.round(((totals.get(sku) ?? 0) + quantity) * 1000) / 1000);
  }

  const lines: StockLine[] = [];
  const missing: Product[] = [];
  const unreadable: Product[] = [];

  for (const product of products) {
    const total = totals.get(normalizeSku(product.sku));
    if (total !== undefined) {
      lines.push({ product, newStock: total, source: "file" });
    } else if (unreadableIds.has(product.id)) {
      unreadable.push(product);
    } else {
      missing.push(product);
      if (markMissingOutOfStock) {
        lines.push({ product, newStock: 0, source: "missing" });
      }
    }
  }

  return { lines, matchedCount: totals.size, missing, unreadable };
}

/* True when saving this line would change what the site shows */
export function changesStock(line: StockLine): boolean {
  return line.product.stock !== line.newStock || line.product.inStock !== line.newStock > 0;
}

/* 5 -> "5", 2.5 -> "2.5" */
export function formatQuantity(quantity: number): string {
  return String(Math.round(quantity * 1000) / 1000);
}
