# Storefront

Next.js (App Router, TypeScript) + Tailwind CSS v4 + daisyUI 5, with Firebase
(accounts, products, orders, photos) and Resend (emails).

A customer adds products to the cart, fills in the checkout form as a person or
a company, and presses "Place order". The order is saved, the customer gets an
invoice by email, and the store gets a "new order" email. There is no online payment.

## Setup (about 20 minutes, once)

Needs Node.js 20.9 or newer.

### 1. Install

```bash
npm install
```

Copy `.env.example` to a new file named `.env.local`. The next steps fill it in.

### 2. Firebase project

1. Go to https://console.firebase.google.com and create a project.
2. **Web app config.** Project settings > General > Your apps > add a Web app (`</>`).
   Copy the six values from the config it shows into the `NEXT_PUBLIC_FIREBASE_...`
   lines of `.env.local`.
3. **Accounts.** Authentication > Sign-in method > enable **Email/Password**.
4. **Database.** Firestore Database > Create database (production mode, any nearby
   region). Then open its **Rules** tab, replace everything with the contents of
   `firestore.rules` from this project, and press Publish.
5. **Server key.** Project settings > Service accounts > Generate new private key.
   A JSON file downloads. Copy `project_id`, `client_email` and `private_key` from it
   into `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.
   Keep the quotes around the private key and leave its `\n` characters as they are.
   This file is a password to your whole database: never share it or commit it.
6. **Product photos (optional).** Storage > Get started, then paste `storage.rules`
   into its Rules tab and Publish. Firebase only offers Storage on the pay-as-you-go
   "Blaze" plan, which needs a payment card (there is a free allowance). Without it
   everything else works; products just have no photo.

### 3. Resend (email)

1. Sign up at https://resend.com and create an API key. Put it in `RESEND_API_KEY`.
2. Set `ORDER_NOTIFICATION_EMAIL` to the inbox where the store should hear about
   orders (your Gmail).
3. Set `EMAIL_FROM`:
   - **For testing:** `Your Store <onboarding@resend.dev>`. Resend then delivers
     only to the email address you signed up to Resend with, so place test orders
     with that address.
   - **For real customers:** add and verify your own domain in Resend (Domains >
     Add domain; it gives you DNS records to add), then use an address on it, for
     example `Your Store <orders@yourdomain.ge>`. Until a domain is verified,
     customers do not receive their invoices.

### 4. Your company details on the invoice

Open `src/lib/site.ts`:

- `site`, `phones` and `locations`: store name, phone numbers, email, store
  addresses and working hours (header, footer, contact page, emails). These are
  already filled in from click.ge; check them and add the opening hours.
- `seller`: legal name, ID code, address, the phone and email printed on the
  invoice, bank, bank code, account (IBAN), VAT percent, the payment note and the
  delivery time. These are printed on every invoice. They are already filled in
  from your invoice Excel file; **check them once**.

### 5. Run it and make yourself the admin

```bash
npm run dev
```

1. Open http://localhost:3000/signup and create your account.
2. Open http://localhost:3000/admin. It says the account is not an admin and shows
   your user ID.
3. In the Firebase console: Firestore Database > Start collection > collection ID
   `admins` > document ID = that user ID > Save (no fields needed).
4. Reload `/admin`. Add a product, then place a test order from the store.

### Check before going online

```bash
npm run build
```

This type-checks and builds the whole site the way the hosting service will. If it
prints an error, fix that first; `npm run dev` does not run these checks.

### Going online

On the hosting service (Vercel, for example) add every line of `.env.local` as an
environment variable. In Firebase > Authentication > Settings > Authorized domains,
add your site's domain.

## Managing orders and order status

The admin panel's Orders page (`/admin/orders`) has two lists:

- **Invoices**: orders that are not delivered yet, newest first.
- **Delivered**: orders with the status "Delivered", latest delivery first.

Click an order to open it. Its status is set by hand with the buttons there:
Received (every new order), Paid, On the way, Delivered, Cancelled. "Delivered"
moves the order to the Delivered list; any other status moves it back. "Delete order"
asks for confirmation and then removes the order for good; its number is not reused.

Customers follow their order at `/order-status` (linked in the header, the footer and
on the "order received" page). They enter the order number from the invoice and the
email they ordered with, and see the status, the products and the total. The order is
shown only when both match. No email is sent when a status changes.

The status names and the sentences customers read are in `src/lib/order-status.ts`.

The status buttons and the delete button need the rules in `firestore.rules` to be
published in the Firebase console. With older rules they answer "not allowed to
change orders".

How it is stored: `status` holds the status. An order also has `createdAt` while it
is not delivered and `deliveredAt` once delivered, never both; each list simply asks
for the orders that have its field. The date the order was placed is always in `placedAt`.

## Finding products

- `/shop` is the full product list. It has a search box, category buttons and, inside
  a category, subcategory buttons. The header search box and the category menu lead there.
- Search looks in the name, SKU, description and category names. Every word typed must
  be found, in any order.
- The filters live in the address (`/shop?category=network&sub=routers&q=tp-link`), so a
  filtered list can be bookmarked or sent to someone.
- `/product/<id>` is the page of one product. The id is the product's Firestore document ID.
- A product's category and (optional) subcategory are chosen when it is added in the admin panel.

`/shop` and `/product/...` are built on the server, so they need the three `FIREBASE_...`
server values in `.env.local`. To keep database reads low, the server remembers the
product list for one minute: a new product or a stock change can take up to a minute
to show on `/shop`. The home page, the product page and the checkout read fresh data.

## Updating stock from 1C

Stock is updated by hand from a 1C export, in the admin panel ("Update stock from 1C"):

1. In 1C, open a stock report or list that shows, for each product, its **SKU**
   (article/code) and its **quantity**. Save it as Excel (.xlsx). Text files (.csv,
   .txt) work too, and so does copying the rows in 1C and pasting them.
2. Choose the file in the admin panel. It finds the SKU and quantity columns itself;
   change them if it guessed wrong.
3. Check the preview of what will change, then press "Update stock".

Rules it follows:

- Products are matched by SKU, so the SKU typed on the site must be the product's
  code in 1C. Capital letters and spaces around it do not matter.
- Rows that are not products on the site (titles, group rows, other products) are skipped.
- If a SKU is on several rows (several warehouses), the quantities are added together.
- Products that are not in the file are marked out of stock, unless you untick that
  option. 1C reports usually leave out products with zero stock.
- A product with stock 0 shows "Out of stock" in the store and cannot be ordered.

Between two updates the site does not know what was sold, and an order placed on the
site does not reduce the stock number. The old .xls format is not read: save as .xlsx.

## How an order works

1. The browser sends only product IDs, quantities and the customer's details.
2. The server (`src/lib/server/place-order.ts`) looks up the real prices and stock in
   Firestore. If a price changed or a product is gone, the customer's cart is updated
   and they are asked to confirm.
3. The order gets the next number (1001, 1002, ...) and is saved in the `orders`
   collection. The number is also the invoice number.
4. The invoice is made as a PDF file (`invoice-1001.pdf`).
5. Two emails go out through Resend, both with the PDF attached: the invoice to the
   customer, and the order to `ORDER_NOTIFICATION_EMAIL`. The store's email says
   whether the invoice was delivered to Resend. If an email or the PDF fails the order
   is still saved, and the reason is printed in the server log.

The emails are built in `src/lib/server/email-templates.ts`. Change wording or layout there.

## The PDF invoice

The PDF follows your invoice Excel file: your company and logo at the top, the buyer
on the left, your bank details in the box on the right, the product table, the totals
with VAT, the payment note and the delivery time. It is filled in from the order:

| On the invoice | Comes from |
|---|---|
| Invoice number and date | the order number and the day it was placed (Georgian time) |
| Buyer | a company: company name, ID code, contact person. A person: full name and, if they typed it at checkout, their personal ID number. Then address and phone |
| "პროდუქტი" column | the product's category (its subcategory when it has one) |
| Name, quantity, price, line total | the products in the order, at the prices in the database |
| Totals | prices on the site include VAT, so: total / 1.18 = amount without VAT, the rest is VAT |
| Your company, bank details, notes | `seller` in `src/lib/site.ts` |

- To change wording, columns or sizes: `src/lib/server/invoice-pdf.ts`.
- To change the logo: `src/lib/server/pdf/logo.ts` (the steps are written at its top).
- If you are not a VAT payer, set `vatPercent: 0` in `seller` and the two VAT rows
  disappear.
- The PDF is written by the site's own code (`src/lib/server/pdf/`), with a Georgian
  font built in. There is nothing extra to install.
- The lari sign (₾) is written as the word "ლარი", because the built-in font does not
  have that sign.

## Where things are

```
firestore.rules            who may read and write what in the database
storage.rules              who may upload product photos
.env.example               the settings the site needs (copy to .env.local)
src/
  app/
    layout.tsx             root of every page: fonts, theme, login and cart state
    not-found.tsx          shown for any address the site does not have
    globals.css            the theme: colours, radius, fonts
    (store)/               the shop. The brackets keep "(store)" out of the URL.
      layout.tsx           header, footer and mobile menu for every store page
      page.tsx             /                home: latest products
      shop/page.tsx        /shop            all products, search, category filters
      product/[id]/        /product/<id>    one product (page.tsx, not-found.tsx)
      cart/page.tsx        /cart
      checkout/            /checkout        (page.tsx + actions.ts, the server function it calls)
      contact/             /contact         (page.tsx + actions.ts, the server function it calls)
      order-status/        /order-status    (page.tsx + actions.ts, the server function it calls)
      login/page.tsx       /login
      signup/page.tsx      /signup
    admin/
      layout.tsx           top bar, Dashboard / Orders tabs, admin-only gate
      page.tsx             /admin           dashboard, add product, stock update
      orders/page.tsx      /admin/orders    Invoices and Delivered lists
  lib/
    site.ts                store name, contacts, YOUR COMPANY DETAILS, every URL
    catalog.ts             the category list and the shape of a product
    products.ts            read and add products, save stock (browser, Firestore + Storage)
    product-search.ts      search and category filtering
    order-list.ts          read orders, change status, delete (browser, admins only)
    order-status.ts        the order statuses, their wording, the customer lookup rules
    spreadsheet.ts         reads .xlsx / .csv / pasted rows into a table
    stock-import.ts        matches a 1C table to the products by SKU
    auth.ts                log in, sign up, log out (Firebase Authentication)
    orders.ts              the shape of an order and the rules for a valid one
    contact.ts             the contact form's fields and rules
    format.ts              price formatting and exact money maths
    validation.ts          email and password checks
    firebase/client.ts     Firebase for the browser
    server/                SERVER ONLY, uses the secret keys
      firebase-admin.ts    Firebase for the server
      products.ts          reads products for /shop and /product
      place-order.ts       saves an order, makes the PDF invoice, sends the emails
      contact.ts           sends a contact form message to the store
      order-status.ts      finds an order for the customer's Order status page
      email.ts             sends one email through Resend, with attached files
      email-templates.ts   the invoice, the "new order" email, the contact email
      invoice-pdf.ts       the PDF invoice: its wording and layout
      pdf/                 what the PDF is written with: pdf-writer.ts (draws text, boxes,
                           the logo), font-data.ts (the font), logo.ts (your logo)
  components/
    layout/                header, footer, menus, search, logo, account menu
    home/                  the home page product grid
    product/               product card, thumbnail, add-to-cart button, stock label
    cart/                  cart state, header cart button, cart page
    checkout/              checkout form and confirmation
    contact/               contact form
    order-status/          the customer's order status form and result
    auth/                  login state, login and signup forms
    admin/                 gate, tabs, dashboard, stat tiles, stock import, category chart,
                           product table, add-product form, order list
```

## Not built yet

- Stock is updated by uploading a 1C export, not automatically. An automatic link needs
  someone who can add a scheduled task inside 1C.
- The admin panel can add products but not edit or delete them (use the Firebase
  console for that).
- Customers are not emailed when an order's status changes; they have to look it up.
- The PDF invoice is only sent by email when the order is placed. It cannot be
  downloaded again from the admin panel.
- Orders are not linked to customer accounts. Anyone can order without logging in.
- Nothing limits how many orders, contact messages or status lookups one visitor can
  send. Add a rate limit or a captcha before the site is public: orders and messages
  each send email, and every lookup reads the database.
- The footer links to `/terms` and `/privacy`, which do not exist yet.
