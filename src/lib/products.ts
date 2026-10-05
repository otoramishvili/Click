/*
  Reading and adding products in Firestore, from the browser.
  Reading is open to everyone; adding works only for admins (firestore.rules).
*/
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { productFromData, type Product } from "@/lib/catalog";
import { firebaseStorage, firestore } from "@/lib/firebase/client";

/* Where the next page of products starts. Opaque: just pass it back in. */
export type ProductCursor = QueryDocumentSnapshot<DocumentData>;

export type ProductPage = {
  products: Product[];
  cursor: ProductCursor | null;
  hasMore: boolean;
};

function toProduct(snapshot: QueryDocumentSnapshot<DocumentData>): Product {
  return productFromData(snapshot.id, snapshot.data());
}

/* Newest products first, one page at a time (for the store). */
export async function fetchProductPage(
  pageSize: number,
  after: ProductCursor | null = null,
): Promise<ProductPage> {
  const products = collection(firestore(), "products");
  /* Ask for one extra to learn whether there is another page */
  const pageQuery = after
    ? query(products, orderBy("createdAt", "desc"), startAfter(after), limit(pageSize + 1))
    : query(products, orderBy("createdAt", "desc"), limit(pageSize + 1));

  const snapshot = await getDocs(pageQuery);
  const docs = snapshot.docs.slice(0, pageSize);

  return {
    products: docs.map(toProduct),
    cursor: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snapshot.docs.length > pageSize,
  };
}

/* Every product, newest first (for the admin dashboard). */
export async function fetchAllProducts(): Promise<Product[]> {
  const snapshot = await getDocs(
    query(collection(firestore(), "products"), orderBy("createdAt", "desc")),
  );
  return snapshot.docs.map(toProduct);
}

/* How many orders exist. Admins only. */
export async function countOrders(): Promise<number> {
  const snapshot = await getCountFromServer(collection(firestore(), "orders"));
  return snapshot.data().count;
}

export type NewProduct = {
  sku: string;
  name: string;
  description: string;
  categorySlug: string;
  /* Leave out when no subcategory was chosen */
  subcategorySlug?: string;
  price: number;
  /* How many are in the warehouse right now */
  stock: number;
};

/* Thrown by createProduct when the photo could not be uploaded */
export class ImageUploadError extends Error {}

/* "APC Easy UPS" + "TK-2001" -> "apc-easy-ups-tk-2001" */
function makeSlug(name: string, sku: string): string {
  return `${name} ${sku}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Uploads the photo (if there is one), then saves the product. Admins only. */
export async function createProduct(
  input: NewProduct,
  imageFile: File | null,
): Promise<Product> {
  const reference = doc(collection(firestore(), "products"));

  let image: string | undefined;
  if (imageFile) {
    try {
      const safeName = imageFile.name.replace(/[^a-zA-Z0-9.]+/g, "-").slice(-60);
      const fileReference = ref(
        firebaseStorage(),
        `products/${reference.id}/${Date.now()}-${safeName}`,
      );
      await uploadBytes(fileReference, imageFile, {
        contentType: imageFile.type,
      });
      image = await getDownloadURL(fileReference);
    } catch (error) {
      console.error("Image upload failed:", error);
      throw new ImageUploadError("Image upload failed");
    }
  }

  const slug = makeSlug(input.name, input.sku) || reference.id;

  const inStock = input.stock > 0;

  await setDoc(reference, {
    ...input,
    /* Firestore does not accept "undefined", so an empty choice is saved as null */
    subcategorySlug: input.subcategorySlug ?? null,
    slug,
    inStock,
    image: image ?? null,
    createdAt: serverTimestamp(),
  });

  return { id: reference.id, slug, ...input, inStock, image };
}

export type StockChange = { id: string; stock: number };

/*
  Saves new stock quantities (from a 1C file) for many products. Admins only.
  Firestore accepts at most 500 changes in one go, so they are sent in groups.
*/
export async function updateStock(changes: StockChange[]): Promise<void> {
  const GROUP_SIZE = 400;

  for (let start = 0; start < changes.length; start += GROUP_SIZE) {
    const batch = writeBatch(firestore());
    for (const change of changes.slice(start, start + GROUP_SIZE)) {
      batch.update(doc(firestore(), "products", change.id), {
        stock: change.stock,
        inStock: change.stock > 0,
        stockUpdatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}
