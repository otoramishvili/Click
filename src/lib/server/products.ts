/*
  Reading products on the SERVER, for the product list (/shop) and the
  product page. Uses the admin connection, so it must stay in lib/server.
*/
import { productFromData, type Product } from "@/lib/catalog";
import { getAdminDb } from "@/lib/server/firebase-admin";

/*
  The whole product list is kept in memory for a minute. Searching and
  filtering then cost no database reads, however many customers are browsing.
  The price of this: a new product or a stock change can take up to a minute
  to show on /shop. (The checkout always checks the database itself.)
*/
const KEEP_FOR_MS = 60 * 1000;
let remembered: { at: number; products: Product[] } | null = null;

/* Every product, newest first. */
export async function getAllProducts(): Promise<Product[]> {
  if (remembered && Date.now() - remembered.at < KEEP_FOR_MS) {
    return remembered.products;
  }

  const snapshot = await getAdminDb()
    .collection("products")
    .orderBy("createdAt", "desc")
    .get();
  const products = snapshot.docs.map((document) =>
    productFromData(document.id, document.data()),
  );

  remembered = { at: Date.now(), products };
  return products;
}

/* One product, read fresh from the database. null when there is no such product. */
export async function getProductById(id: string): Promise<Product | null> {
  /* Firestore IDs are letters, digits, "-" and "_". Anything else cannot exist. */
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;

  const document = await getAdminDb().collection("products").doc(id).get();
  const data = document.data();
  return data ? productFromData(document.id, data) : null;
}
