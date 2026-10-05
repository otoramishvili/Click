/*
  The category list and the shape of a product.
  Categories are fixed here in code. Products live in Firestore (see lib/products.ts).
*/
import type { IconType } from "react-icons";
import {
  LuBatteryCharging,
  LuCctv,
  LuHardDrive,
  LuKeyboard,
  LuLaptop,
  LuMonitor,
  LuPrinter,
  LuRouter,
  LuServer,
} from "react-icons/lu";

export type Subcategory = {
  slug: string;
  name: string;
};

export type Category = {
  slug: string;
  name: string;
  icon: IconType;
  children: Subcategory[];
};

export type Product = {
  /* Firestore document ID */
  id: string;
  slug: string;
  /* Stock keeping unit: the code the product has in the warehouse system */
  sku: string;
  name: string;
  /* Shown on the product card (first two lines) and on the product page */
  description: string;
  /* slug of one of the categories below */
  categorySlug: string;
  /* slug of one of that category's children, when one was chosen */
  subcategorySlug?: string;
  /* Price in lari */
  price: number;
  /* How many are in the warehouse, from the last stock update. Unknown for older products. */
  stock?: number;
  /* True when stock is above zero. This is what the store and the checkout look at. */
  inStock: boolean;
  /* Image URL. Without one the card shows the category icon. */
  image?: string;
};

export const categories: Category[] = [
  {
    slug: "notebooks",
    name: "Notebooks",
    icon: LuLaptop,
    children: [
      { slug: "notebooks", name: "Notebooks" },
      { slug: "gaming-notebooks", name: "Gaming notebooks" },
      { slug: "chargers", name: "Chargers" },
      { slug: "memory", name: "Memory" },
      { slug: "batteries", name: "Batteries" },
      { slug: "bags", name: "Bags" },
    ],
  },
  {
    slug: "computers",
    name: "Computers and parts",
    icon: LuMonitor,
    children: [
      { slug: "desktops", name: "Desktop computers" },
      { slug: "all-in-one", name: "All-in-one computers" },
      { slug: "monitors", name: "Monitors" },
      { slug: "processors", name: "Processors" },
      { slug: "motherboards", name: "Motherboards" },
      { slug: "ram", name: "RAM" },
      { slug: "ssd-hdd", name: "SSD and HDD" },
      { slug: "video-cards", name: "Video cards" },
      { slug: "power-supplies", name: "Power supplies" },
      { slug: "cases", name: "Cases" },
    ],
  },
  {
    slug: "printers",
    name: "Printers and scanners",
    icon: LuPrinter,
    children: [
      { slug: "all-in-one", name: "All-in-one printers" },
      { slug: "colour", name: "Colour printers" },
      { slug: "black-and-white", name: "Black and white printers" },
      { slug: "scanners", name: "Scanners" },
      { slug: "cartridges", name: "Cartridges" },
    ],
  },
  {
    slug: "network",
    name: "Network equipment",
    icon: LuRouter,
    children: [
      { slug: "routers", name: "Routers" },
      { slug: "switches", name: "Switches" },
      { slug: "wireless", name: "Wireless devices" },
      { slug: "cables", name: "Network cables" },
      { slug: "tools", name: "Network tools" },
    ],
  },
  {
    slug: "cameras",
    name: "Cameras and recorders",
    icon: LuCctv,
    children: [
      { slug: "ip-cameras", name: "IP cameras" },
      { slug: "nvr", name: "NVR recorders" },
    ],
  },
  {
    slug: "accessories",
    name: "Accessories",
    icon: LuKeyboard,
    children: [
      { slug: "mice", name: "Mice" },
      { slug: "mouse-pads", name: "Mouse pads" },
      { slug: "keyboards", name: "Keyboards" },
      { slug: "headphones", name: "Headphones" },
      { slug: "microphones", name: "Microphones" },
      { slug: "speakers", name: "Speakers" },
      { slug: "cables", name: "Cables" },
    ],
  },
  {
    slug: "power",
    name: "Power systems",
    icon: LuBatteryCharging,
    children: [
      { slug: "ups", name: "UPS" },
      { slug: "pdu", name: "PDU" },
      { slug: "power-cables", name: "Power cables" },
    ],
  },
  {
    slug: "storage",
    name: "Storage and media",
    icon: LuHardDrive,
    children: [
      { slug: "external-drives", name: "External HDD and SSD" },
      { slug: "flash-drives", name: "USB flash drives" },
      { slug: "memory-cards", name: "Memory cards" },
      { slug: "power-banks", name: "Power banks" },
    ],
  },
  {
    slug: "servers",
    name: "Servers",
    icon: LuServer,
    children: [
      { slug: "servers", name: "Servers" },
      { slug: "storage", name: "Storage systems" },
      { slug: "racks", name: "Racks and cabinets" },
    ],
  },
];

export function getCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getSubcategory(
  categorySlug: string,
  subcategorySlug: string | undefined,
): Subcategory | undefined {
  return getCategory(categorySlug)?.children.find(
    (child) => child.slug === subcategorySlug,
  );
}

/*
  Builds a Product from a Firestore document. Used by the browser and by the
  server, so both read products the same way. Missing fields get safe values.
*/
export function productFromData(id: string, data: Record<string, unknown>): Product {
  const text = (value: unknown) => (typeof value === "string" ? value : "");

  return {
    id,
    slug: text(data.slug) || id,
    sku: text(data.sku),
    name: text(data.name),
    description: text(data.description),
    categorySlug: text(data.categorySlug),
    subcategorySlug: text(data.subcategorySlug) || undefined,
    price: typeof data.price === "number" ? data.price : 0,
    stock: typeof data.stock === "number" ? data.stock : undefined,
    inStock: data.inStock !== false,
    image: text(data.image) || undefined,
  };
}
