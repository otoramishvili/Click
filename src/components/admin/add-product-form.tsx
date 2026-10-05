"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { describedBy, FieldShell } from "@/components/field-shell";
import { categories, getCategory, type Product } from "@/lib/catalog";
import { errorCode } from "@/lib/firebase/client";
import { createProduct, ImageUploadError } from "@/lib/products";
import { parseQuantity } from "@/lib/stock-import";

type FieldName =
  | "name"
  | "sku"
  | "price"
  | "stock"
  | "category"
  | "image"
  | "description";
type Errors = Partial<Record<FieldName, string>>;

/* The order the fields appear in, used to jump to the first one with an error */
const FIELD_ORDER: FieldName[] = [
  "name",
  "sku",
  "price",
  "stock",
  "category",
  "image",
  "description",
];

const IMAGE_HINT = "Optional. JPG, PNG or WebP, up to 5 MB.";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUBCATEGORY_HINT = "Optional. Lets customers narrow the category down.";
const STOCK_HINT = "A stock update from 1C replaces this number.";

/* "249", "249.5", "249,50" -> number. Anything else, or zero -> null */
function parsePrice(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return amount > 0 ? amount : null;
}

export function AddProductForm({
  products,
  onAdd,
}: {
  /* Current products, to check the SKU is not already taken */
  products: Product[];
  onAdd: (product: Product) => void;
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [subcategorySlug, setSubcategorySlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  /* A temporary address the browser gives the chosen picture, for showing it */
  const [imageUrl, setImageUrl] = useState("");
  /* Changing this number empties the file input after a product is added */
  const [imageInputKey, setImageInputKey] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [addedName, setAddedName] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (imageUrl) URL.revokeObjectURL(imageUrl);

    if (!file) {
      setImageFile(null);
      setImageUrl("");
      setErrors((current) => ({ ...current, image: undefined }));
    } else if (!file.type.startsWith("image/")) {
      setImageFile(null);
      setImageUrl("");
      setErrors((current) => ({
        ...current,
        image: "That file is not an image. Choose a JPG, PNG or WebP.",
      }));
    } else if (file.size > MAX_IMAGE_BYTES) {
      setImageFile(null);
      setImageUrl("");
      setErrors((current) => ({
        ...current,
        image: "That image is larger than 5 MB. Choose a smaller one.",
      }));
    } else {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
      setErrors((current) => ({ ...current, image: undefined }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddedName("");
    setFormError("");

    const cleanName = name.trim();
    const cleanSku = sku.trim();
    const cleanDescription = description.trim();
    const amount = parsePrice(price);
    const quantity = parseQuantity(stock);

    /* 1. Check the fields */
    const found: Errors = {};
    if (!cleanName) {
      found.name = "Enter the product name.";
    }
    if (!cleanSku) {
      found.sku = "Enter the SKU.";
    } else if (
      products.some(
        (product) => product.sku.toLowerCase() === cleanSku.toLowerCase(),
      )
    ) {
      found.sku = "Another product already has this SKU.";
    }
    if (!price.trim()) {
      found.price = "Enter the price.";
    } else if (amount === null) {
      found.price = "Enter a number above zero, like 249 or 249.50.";
    }
    if (quantity === null) {
      found.stock = "Enter how many are in stock. Use 0 if there are none.";
    }
    if (!categorySlug) {
      found.category = "Choose a category.";
    }
    if (errors.image) {
      found.image = errors.image;
    }
    if (!cleanDescription) {
      found.description = "Enter a description.";
    }
    setErrors(found);

    /* 2. If something is wrong, move to the first field that needs fixing */
    const firstInvalid = FIELD_ORDER.find((field) => found[field]);
    if (firstInvalid || amount === null || quantity === null) {
      document.getElementById(`product-${firstInvalid}`)?.focus();
      return;
    }

    /* 3. Save: upload the photo, then write the product to Firestore */
    setSaving(true);
    try {
      const product = await createProduct(
        {
          sku: cleanSku,
          name: cleanName,
          description: cleanDescription,
          categorySlug,
          subcategorySlug: subcategorySlug || undefined,
          price: amount,
          stock: quantity,
        },
        imageFile,
      );
      onAdd(product);
    } catch (error) {
      console.error("Saving the product failed:", error);
      if (error instanceof ImageUploadError) {
        setFormError(
          "The image could not be uploaded, so the product was not saved. Photo uploads need Firebase Storage to be switched on (see the README). To continue without a photo, clear the image and add the product again.",
        );
      } else if (errorCode(error) === "permission-denied") {
        setFormError(
          "This account is not allowed to add products. Check that the Firestore rules are published and the account is in the admins collection.",
        );
      } else {
        setFormError(
          "The product could not be saved. Check your connection and try again.",
        );
      }
      return;
    } finally {
      setSaving(false);
    }

    /* 4. Empty the form for the next product */
    setName("");
    setSku("");
    setPrice("");
    setStock("");
    setCategorySlug("");
    setSubcategorySlug("");
    setDescription("");
    setImageFile(null);
    setImageUrl("");
    setImageInputKey((key) => key + 1);
    setAddedName(cleanName);
  }

  /* The subcategories of the category chosen above */
  const subcategories = getCategory(categorySlug)?.children ?? [];

  return (
    <section
      aria-labelledby="add-product-title"
      className="rounded-box border border-base-300 p-5 sm:p-6"
    >
      <h2 id="add-product-title" className="text-lg font-semibold">
        Add a product
      </h2>
      <p className="mt-1 text-sm text-base-content/70">
        A saved product shows up in the store straight away.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
        {addedName && (
          <p role="status" className="alert alert-success alert-soft text-sm">
            Saved “{addedName}”. It is at the top of the product list.
          </p>
        )}
        {formError && (
          <p role="alert" className="alert alert-error alert-soft text-sm">
            {formError}
          </p>
        )}

        <FieldShell id="product-name" label="Name" error={errors.name}>
          <input
            id="product-name"
            name="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`input w-full ${errors.name ? "input-error" : ""}`}
            {...describedBy("product-name", undefined, errors.name)}
          />
        </FieldShell>

        <div className="grid gap-5 sm:grid-cols-2">
          <FieldShell id="product-sku" label="SKU" error={errors.sku}>
            <input
              id="product-sku"
              name="sku"
              type="text"
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              className={`input w-full tabular-nums ${errors.sku ? "input-error" : ""}`}
              {...describedBy("product-sku", undefined, errors.sku)}
            />
          </FieldShell>

          <FieldShell id="product-price" label="Price" error={errors.price}>
            <label
              className={`input w-full ${errors.price ? "input-error" : ""}`}
            >
              <input
                id="product-price"
                name="price"
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="grow tabular-nums"
                {...describedBy("product-price", undefined, errors.price)}
              />
              <span className="text-base-content/60" aria-hidden>
                ₾
              </span>
            </label>
          </FieldShell>
        </div>

        <FieldShell
          id="product-stock"
          label="Quantity in stock"
          hint={STOCK_HINT}
          error={errors.stock}
        >
          <input
            id="product-stock"
            name="stock"
            type="text"
            inputMode="decimal"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            className={`input w-full tabular-nums ${errors.stock ? "input-error" : ""}`}
            {...describedBy("product-stock", STOCK_HINT, errors.stock)}
          />
        </FieldShell>

        <FieldShell id="product-category" label="Category" error={errors.category}>
          <select
            id="product-category"
            name="category"
            value={categorySlug}
            onChange={(event) => {
              setCategorySlug(event.target.value);
              /* The old subcategory belongs to the old category */
              setSubcategorySlug("");
            }}
            className={`select w-full ${errors.category ? "select-error" : ""}`}
            {...describedBy("product-category", undefined, errors.category)}
          >
            <option value="">Choose a category</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </FieldShell>

        {subcategories.length > 0 && (
          <FieldShell id="product-subcategory" label="Subcategory" hint={SUBCATEGORY_HINT}>
            <select
              id="product-subcategory"
              name="subcategory"
              value={subcategorySlug}
              onChange={(event) => setSubcategorySlug(event.target.value)}
              className="select w-full"
              {...describedBy("product-subcategory", SUBCATEGORY_HINT)}
            >
              <option value="">None</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.slug} value={subcategory.slug}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </FieldShell>
        )}

        <FieldShell
          id="product-image"
          label="Image"
          hint={IMAGE_HINT}
          error={errors.image}
        >
          <div className="flex items-center gap-3">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Chosen product image"
                className="size-12 shrink-0 rounded-field border border-base-300 object-cover"
              />
            )}
            <input
              key={imageInputKey}
              id="product-image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className={`file-input w-full min-w-0 ${errors.image ? "file-input-error" : ""}`}
              {...describedBy("product-image", IMAGE_HINT, errors.image)}
            />
          </div>
        </FieldShell>

        <FieldShell
          id="product-description"
          label="Description"
          error={errors.description}
        >
          <textarea
            id="product-description"
            name="description"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`textarea w-full ${errors.description ? "textarea-error" : ""}`}
            {...describedBy("product-description", undefined, errors.description)}
          />
        </FieldShell>

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary btn-block"
        >
          {saving ? "Saving…" : "Add product"}
        </button>
      </form>
    </section>
  );
}
