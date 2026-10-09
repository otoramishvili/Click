/*
  Everything about the store itself lives here: change a value once and the
  header, footer, contact page, page titles and emails all update.
  The contact details below were copied from click.ge on 3 October 2026.
*/

/* The first number is the main one: it is shown in the header and in emails. */
const phones = ["+995 577 994 299", "+995 577 022 414"];

export type StoreLocation = {
  name: string;
  address: string;
  /* Leave out what you do not want to show */
  hours?: string;
  mapUrl?: string;
};

/* The first location is the main one: it is shown in the footer. */
const locations: StoreLocation[] = [
  {
    name: "Vazha-Pshavela",
    address: "71 Vazha-Pshavela Avenue, Tbilisi 0186",
    /* click.ge gives the days only. Add the hours, for example "Monday to Friday, 10:00 to 19:00". */
    hours: "Monday to Friday",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=71+Vazha-Pshavela+Avenue%2C+Tbilisi",
  },
  {
    name: "Zaldastanishvili",
    address: "29 Zaldastanishvili Street, Tbilisi 0108",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=29+Zaldastanishvili+Street%2C+Tbilisi",
  },
];

export const site = {
  name: "Click",
  description:
    "Computers, network and power equipment. Order online and get the invoice by email.",
  phone: phones[0],
  phones,
  email: "info@click.ge",
  address: locations[0].address,
  locations,
};

/* "+995 577 994 299" -> "tel:+995577994299", for phone links */
export function phoneLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/*
  YOUR COMPANY, as it is printed on every invoice (the PDF and the email).
  These values were copied from your invoice Excel file. Check them once.
*/
export const seller = {
  legalName: 'შპს "click.ge"',
  idCode: "405 361 549",
  address: "საქართველო, თბილისი",
  /* The phone and email printed at the top of the PDF invoice */
  phone: "+995 555 988 949",
  email: "ano.otiashvili@gmail.com",
  bankName: "ს/ს თიბისი ბანკი",
  bankCode: "TBCBGE22",
  iban: "GE30TB7638936080100007",
  /* Prices on the site include VAT. The invoice shows how much of the total is VAT. */
  vatPercent: 18,
  /* The blue line under the totals of the PDF invoice */
  invoiceNote:
    "გადახდა ეროვნულ ვალუტაში, გადმორიცხვის დღეს დაფიქსირებული ეროვნული ბანკის კურსით.",
  /* Printed under "მიწოდების ვადა" (delivery time) on the PDF invoice */
  deliveryTerm: "შეკვეთიდან 3 დღე",
  /* Printed under the bank details in the email. Say how and when you expect to be paid. */
  paymentNote:
    "Please pay by bank transfer and write the invoice number in the payment description.",
};

/* id of the checkbox that opens and closes the mobile menu (daisyUI drawer) */
export const DRAWER_ID = "site-menu";

/* Filters of the product list page (/shop). Leave out what is not set. */
export type ShopFilters = {
  q?: string;
  category?: string;
  sub?: string;
  page?: number;
};

function shopUrl(filters: ShopFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.category && filters.sub) params.set("sub", filters.sub);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}

/* One place for every URL in the site. */
export const routes = {
  home: "/",
  /* The product list. shop() is all products; pass filters to narrow it down. */
  shop: shopUrl,
  category: (slug: string) => shopUrl({ category: slug }),
  subcategory: (slug: string, sub: string) => shopUrl({ category: slug, sub }),
  /* The search box sends ?q=... here */
  search: "/shop",
  product: (id: string) => `/product/${id}`,
  cart: "/cart",
  checkout: "/checkout",
  login: "/login",
  signup: "/signup",
  contact: "/contact",
  admin: "/admin",
  adminOrders: "/admin/orders",
  terms: "/terms",
  privacy: "/privacy",
};
