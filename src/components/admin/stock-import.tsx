"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import type { Product } from "@/lib/catalog";
import { errorCode } from "@/lib/firebase/client";
import { updateStock, type StockChange } from "@/lib/products";
import {
  parseDelimitedText,
  readSpreadsheetFile,
  UnreadableFileError,
  type Sheet,
} from "@/lib/spreadsheet";
import {
  buildStockPlan,
  changesStock,
  describeColumns,
  formatQuantity,
  guessColumns,
} from "@/lib/stock-import";

/* Rows of the preview shown before "Show all" is pressed */
const PREVIEW_ROWS = 10;

function currentStock(product: Product): string {
  if (!product.inStock) return "Out of stock";
  return product.stock === undefined ? "In stock" : formatQuantity(product.stock);
}

/*
  Admin tool: take a stock report exported from 1C, match its rows to the
  products by SKU, show what would change, and save it after the admin agrees.
*/
export function StockImport({
  products,
  onUpdated,
}: {
  products: Product[];
  onUpdated: (changes: StockChange[]) => void;
}) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [skuColumn, setSkuColumn] = useState(-1);
  const [quantityColumn, setQuantityColumn] = useState(-1);
  const [markMissing, setMarkMissing] = useState(true);
  const [pasted, setPasted] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [saving, setSaving] = useState(false);
  /* Changing this number empties the file input */
  const [fileInputKey, setFileInputKey] = useState(0);

  /* A table was read: remember it and guess which columns matter */
  function loadTable(table: Sheet, name: string) {
    setDone("");
    if (table.length === 0) {
      setSheet(null);
      setError("No rows were found. Check that you picked the stock report.");
      return;
    }
    const guess = guessColumns(table, products);
    setSheet(table);
    setSourceName(name);
    setSkuColumn(guess.skuColumn);
    setQuantityColumn(guess.quantityColumn);
    setShowAll(false);
    setError("");
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      loadTable(await readSpreadsheetFile(file), file.name);
    } catch (reason) {
      console.error("Reading the stock file failed:", reason);
      setSheet(null);
      setDone("");
      setError(
        reason instanceof UnreadableFileError
          ? reason.message
          : "That file could not be read. Save the report as .xlsx, or copy the rows and paste them below.",
      );
    }
  }

  function handlePaste() {
    loadTable(parseDelimitedText(pasted), "pasted rows");
  }

  function reset() {
    setSheet(null);
    setPasted("");
    setError("");
    setFileInputKey((key) => key + 1);
  }

  const columns = useMemo(() => (sheet ? describeColumns(sheet) : []), [sheet]);

  const plan = useMemo(
    () =>
      sheet && skuColumn >= 0 && quantityColumn >= 0
        ? buildStockPlan(sheet, skuColumn, quantityColumn, products, markMissing)
        : null,
    [sheet, skuColumn, quantityColumn, products, markMissing],
  );

  /* Only products whose stock would really change are saved */
  const changedLines = plan ? plan.lines.filter(changesStock) : [];
  const visibleLines = showAll ? changedLines : changedLines.slice(0, PREVIEW_ROWS);

  async function handleSave() {
    if (changedLines.length === 0) return;
    const changes = changedLines.map((line) => ({
      id: line.product.id,
      stock: line.newStock,
    }));

    setSaving(true);
    setError("");
    try {
      await updateStock(changes);
    } catch (reason) {
      console.error("Saving the stock failed:", reason);
      setError(
        errorCode(reason) === "permission-denied"
          ? "This account is not allowed to change stock. Check that the Firestore rules are published and the account is in the admins collection."
          : "The stock could not be saved. Some products may already be updated. Check your connection and save again.",
      );
      return;
    } finally {
      setSaving(false);
    }

    onUpdated(changes);
    setDone(
      `Stock updated for ${changes.length} ${changes.length === 1 ? "product" : "products"}.`,
    );
    reset();
  }

  return (
    <section
      aria-labelledby="stock-import-title"
      className="rounded-box border border-base-300 p-5 sm:p-6"
    >
      <h2 id="stock-import-title" className="text-lg font-semibold">
        Update stock from 1C
      </h2>
      <p className="mt-1 text-sm text-base-content/70">
        In 1C, open a stock report that shows each product&apos;s SKU and
        quantity, and save it as Excel (.xlsx). Products are matched by SKU.
      </p>

      {done && (
        <p role="status" className="alert alert-success alert-soft mt-4 text-sm">
          {done}
        </p>
      )}
      {error && (
        <p role="alert" className="alert alert-error alert-soft mt-4 text-sm">
          {error}
        </p>
      )}

      {!sheet ? (
        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="stock-file" className="mb-1.5 block text-sm font-medium">
              Stock report file
            </label>
            <input
              key={fileInputKey}
              id="stock-file"
              type="file"
              accept=".xlsx,.csv,.txt"
              onChange={handleFile}
              className="file-input w-full"
            />
          </div>

          <div>
            <label htmlFor="stock-paste" className="mb-1.5 block text-sm font-medium">
              Or paste the rows copied from 1C or Excel
            </label>
            <textarea
              id="stock-paste"
              rows={3}
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              className="textarea w-full"
            />
            <button
              type="button"
              className="btn btn-neutral btn-sm mt-3"
              disabled={pasted.trim() === ""}
              onClick={handlePaste}
            >
              Read pasted rows
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <p className="text-sm">
            <span className="font-medium">{sourceName}</span>
            <span className="text-base-content/70">, {sheet.length} rows</span>
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="stock-sku-column" className="mb-1.5 block text-sm font-medium">
                Column with the SKU
              </label>
              <select
                id="stock-sku-column"
                value={skuColumn}
                onChange={(event) => setSkuColumn(Number(event.target.value))}
                className="select w-full"
              >
                <option value={-1}>Choose a column</option>
                {columns.map((column) => (
                  <option key={column.index} value={column.index}>
                    {column.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="stock-quantity-column"
                className="mb-1.5 block text-sm font-medium"
              >
                Column with the quantity
              </label>
              <select
                id="stock-quantity-column"
                value={quantityColumn}
                onChange={(event) => setQuantityColumn(Number(event.target.value))}
                className="select w-full"
              >
                <option value={-1}>Choose a column</option>
                {columns.map((column) => (
                  <option key={column.index} value={column.index}>
                    {column.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!plan ? (
            <p className="text-sm text-base-content/70">
              {skuColumn < 0
                ? "No column in this file contains SKUs of products on the site. Choose the SKU column yourself, or check that the SKUs here are the same as in 1C."
                : "Choose the column that holds the quantity."}
            </p>
          ) : (
            <>
              <ul className="space-y-1.5 text-sm">
                <li>
                  <strong>{plan.matchedCount}</strong> of {products.length} products
                  on the site were found in the file.
                </li>
                {plan.unreadable.length > 0 && (
                  <li className="text-error">
                    {plan.unreadable.length} found, but the quantity is not a
                    number. They are left as they are:{" "}
                    {plan.unreadable.map((product) => product.sku).join(", ")}
                  </li>
                )}
                <li>
                  <strong>{plan.missing.length}</strong>{" "}
                  {plan.missing.length === 1 ? "is" : "are"} not in the file.
                </li>
              </ul>

              {plan.missing.length > 0 && (
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={markMissing}
                    onChange={(event) => setMarkMissing(event.target.checked)}
                    className="checkbox checkbox-primary checkbox-sm mt-0.5"
                  />
                  <span>
                    Mark products that are not in the file as out of stock.
                    <span className="block text-base-content/70">
                      Leave this on when the file is the full stock report: 1C
                      usually leaves out products with nothing in stock.
                    </span>
                  </span>
                </label>
              )}

              {changedLines.length === 0 ? (
                <p className="text-sm text-base-content/70">
                  Nothing to change: the stock on the site already matches this file.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-field border border-base-300">
                  {/* On phones the SKU moves under the product name so "New" stays in view */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-base-200 text-left text-base-content/70">
                        <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">SKU</th>
                        <th scope="col" className="px-3 py-2 font-medium">Product</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Now</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">New</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleLines.map((line) => (
                        <tr key={line.product.id} className="border-t border-base-200">
                          <td className="hidden whitespace-nowrap px-3 py-2 tabular-nums sm:table-cell">
                            {line.product.sku}
                          </td>
                          <td className="px-3 py-2">
                            {line.product.name}
                            <span className="block tabular-nums text-base-content/70 sm:hidden">
                              {line.product.sku}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-base-content/70">
                            {currentStock(line.product)}
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums sm:whitespace-nowrap">
                            {line.newStock > 0
                              ? formatQuantity(line.newStock)
                              : line.source === "missing"
                                ? "Out of stock (not in file)"
                                : "Out of stock"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {changedLines.length > PREVIEW_ROWS && (
                    <div className="border-t border-base-200 px-2 py-2">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowAll((value) => !value)}
                      >
                        {showAll ? "Show fewer" : `Show all ${changedLines.length} changes`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || changedLines.length === 0}
              onClick={handleSave}
            >
              {saving
                ? "Saving…"
                : changedLines.length === 0
                  ? "Update stock"
                  : `Update stock for ${changedLines.length} ${changedLines.length === 1 ? "product" : "products"}`}
            </button>
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={reset}>
              Choose another file
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
