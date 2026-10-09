/*
  The emails the site sends:
    invoiceEmail     -> to the customer, after an order
    storeOrderEmail  -> to the store's own inbox, after an order
  Both order emails also carry the invoice as a PDF file. The PDF is made in
  lib/server/invoice-pdf.ts; this file is only the text of the email itself.
    contactEmail     -> to the store's own inbox, from the contact form
  The order emails are filled in automatically from the order. Your company details come
  from `seller` in lib/site.ts. Change the wording or layout here.

  Email programs ignore most modern CSS, so the layout is tables with the
  styles written on each element.
*/
import type { ContactMessage } from "@/lib/contact";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/orders";
import { invoiceFileName } from "@/lib/server/invoice-pdf";
import { seller, site } from "@/lib/site";

export type RenderedEmail = { subject: string; html: string; text: string };

const INK = "#0f1b3d";
const MUTED = "#5b6478";
const LINE = "#dfe4ee";
const SOFT = "#f3f5fa";
const FONT = "font-family:Arial,Helvetica,sans-serif;";

/* Anything typed by a customer goes through this before it is put into HTML */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* 02.10.2026, in Georgian time */
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tbilisi",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date(iso))
    .replace(/\//g, ".");
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${SOFT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};">
<tr><td align="center" style="padding:16px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid ${LINE};border-radius:12px;">
<tr><td style="padding:24px 16px 20px;${FONT}color:${INK};font-size:14px;line-height:1.5;">
${body}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/* The buyer block: a person, or a company with its contact person */
function buyerLines(order: Order): string[] {
  const { customer } = order;
  const lines: string[] = [];

  if (customer.type === "business") {
    lines.push(customer.companyName);
    lines.push(`ID code: ${customer.companyId}`);
    lines.push(`Contact: ${customer.fullName}`);
  } else {
    lines.push(customer.fullName);
    if (customer.personalId) lines.push(`Personal ID: ${customer.personalId}`);
  }
  lines.push(`${customer.address}, ${customer.city}`);
  lines.push(customer.phone);
  lines.push(customer.email);

  return lines;
}

function itemsTable(order: Order): string {
  const cell = `padding:10px 5px;border-bottom:1px solid ${LINE};${FONT}font-size:14px;color:${INK};vertical-align:top;`;
  const head = `padding:8px 5px;background:${SOFT};${FONT}font-size:12px;color:${MUTED};text-align:left;font-weight:normal;`;

  const rows = order.lines
    .map(
      (line, index) => `<tr>
<td style="${cell}color:${MUTED};">${index + 1}</td>
<td style="${cell}">${escapeHtml(line.name)}<br><span style="font-size:12px;color:${MUTED};">SKU ${escapeHtml(line.sku)}</span></td>
<td style="${cell}text-align:right;white-space:nowrap;">${line.quantity}</td>
<td style="${cell}text-align:right;white-space:nowrap;">${formatPrice(line.price)}</td>
<td style="${cell}text-align:right;white-space:nowrap;">${formatPrice(line.sum)}</td>
</tr>`,
    )
    .join("\n");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:24px;">
<tr>
<th style="${head}">#</th>
<th style="${head}">Product</th>
<th style="${head}text-align:right;">Qty</th>
<th style="${head}text-align:right;">Price</th>
<th style="${head}text-align:right;">Sum</th>
</tr>
${rows}
<tr>
<td colspan="4" style="padding:14px 5px;${FONT}font-size:14px;color:${INK};text-align:right;font-weight:bold;">Total to pay</td>
<td style="padding:14px 5px;${FONT}font-size:18px;color:${INK};text-align:right;font-weight:bold;white-space:nowrap;">${formatPrice(order.total)}</td>
</tr>
</table>`;
}

function itemsText(order: Order): string {
  return order.lines
    .map(
      (line, index) =>
        `${index + 1}. ${line.name} (SKU ${line.sku}) x ${line.quantity} = ${formatPrice(line.sum)}`,
    )
    .join("\n");
}

/*
  The invoice the customer receives.
  hasPdf says whether the PDF invoice is attached to the email.
*/
export function invoiceEmail(order: Order, hasPdf: boolean): RenderedEmail {
  const pdfNote = hasPdf
    ? `Your invoice is attached to this email as a PDF file (${invoiceFileName(order)}).`
    : "";
  const label = `font-size:12px;color:${MUTED};margin:0 0 6px;`;
  const block = (lines: string[]) =>
    lines
      .map((line, index) =>
        index === 0
          ? `<strong>${escapeHtml(line)}</strong>`
          : escapeHtml(line),
      )
      .join("<br>");

  const sellerLines = [
    seller.legalName,
    `ID code: ${seller.idCode}`,
    seller.address,
    site.phone,
    site.email,
  ];

  const note = order.customer.note
    ? `<p style="margin:20px 0 0;"><span style="color:${MUTED};">Your note:</span> ${escapeHtml(order.customer.note)}</p>`
    : "";

  const body = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="${FONT}font-size:22px;font-weight:bold;color:${INK};">${escapeHtml(site.name)}</td>
<td align="right" style="${FONT}font-size:14px;color:${INK};">
<strong style="font-size:18px;">Invoice № ${order.number}</strong><br>
<span style="color:${MUTED};">${formatDate(order.placedAt)}</span>
</td>
</tr>
</table>
${pdfNote ? `<p style="margin:16px 0 0;padding:10px 14px;background:${SOFT};border-radius:8px;">${escapeHtml(pdfNote)}</p>` : ""}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid ${LINE};">
<tr>
<td width="50%" style="padding:18px 8px 0 0;${FONT}font-size:14px;line-height:1.5;color:${INK};vertical-align:top;word-break:break-word;">
<p style="${label}">Seller</p>
${block(sellerLines)}
</td>
<td width="50%" style="padding:18px 0 0 8px;${FONT}font-size:14px;line-height:1.5;color:${INK};vertical-align:top;word-break:break-word;">
<p style="${label}">Buyer</p>
${block(buyerLines(order))}
</td>
</tr>
</table>

${itemsTable(order)}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background:${SOFT};border-radius:8px;">
<tr><td style="padding:14px 14px;${FONT}font-size:14px;line-height:1.6;color:${INK};word-break:break-word;">
<p style="${label}">Payment details</p>
Recipient: <strong>${escapeHtml(seller.legalName)}</strong><br>
Bank: ${escapeHtml(seller.bankName)} (${escapeHtml(seller.bankCode)})<br>
Account: <strong style="word-break:break-all;">${escapeHtml(seller.iban)}</strong><br>
Payment description: Invoice № ${order.number}
<p style="margin:10px 0 0;color:${MUTED};">${escapeHtml(seller.paymentNote)}</p>
</td></tr>
</table>
${note}
<p style="margin:24px 0 0;color:${MUTED};font-size:13px;">Questions about this order? Reply to this email or call ${escapeHtml(site.phone)}.</p>`;

  const text = [
    `${site.name} - Invoice № ${order.number} (${formatDate(order.placedAt)})`,
    ...(pdfNote ? ["", pdfNote] : []),
    "",
    "SELLER",
    ...sellerLines,
    "",
    "BUYER",
    ...buyerLines(order),
    "",
    itemsText(order),
    "",
    `TOTAL TO PAY: ${formatPrice(order.total)}`,
    "",
    "PAYMENT DETAILS",
    `Recipient: ${seller.legalName}`,
    `Bank: ${seller.bankName} (${seller.bankCode})`,
    `Account: ${seller.iban}`,
    `Payment description: Invoice № ${order.number}`,
    seller.paymentNote,
    ...(order.customer.note ? ["", `Your note: ${order.customer.note}`] : []),
  ].join("\n");

  return {
    subject: `Invoice № ${order.number} from ${site.name}`,
    html: page(`Invoice № ${order.number}`, body),
    text,
  };
}

/*
  The "new order" email the store receives.
  invoiceSent says whether the customer's invoice email went out.
  hasPdf says whether the PDF invoice is attached to this email.
*/
export function storeOrderEmail(
  order: Order,
  invoiceSent: boolean,
  hasPdf: boolean,
): RenderedEmail {
  const invoiceStatus = invoiceSent
    ? `Invoice № ${order.number} was emailed to the customer.`
    : `Invoice № ${order.number} could NOT be emailed to the customer. Send it to them yourself.`;
  const pdfStatus = hasPdf
    ? `The invoice is attached to this email as a PDF file (${invoiceFileName(order)}).${invoiceSent ? "" : " You can forward it to the customer."}`
    : "The PDF invoice could not be made for this order, so nothing is attached.";
  const { customer } = order;
  const units = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const kind = customer.type === "business" ? "Company order" : "Personal order";

  const note = customer.note
    ? `<p style="margin:20px 0 0;padding:12px 14px;background:${SOFT};border-radius:8px;"><span style="color:${MUTED};">Customer's note:</span><br>${escapeHtml(customer.note)}</p>`
    : "";

  const body = `<p style="margin:0;font-size:12px;color:${MUTED};">${kind}, ${formatDate(order.placedAt)}</p>
<p style="margin:4px 0 0;font-size:22px;font-weight:bold;">New order № ${order.number}</p>
<p style="margin:6px 0 0;font-size:16px;">${units} ${units === 1 ? "item" : "items"}, ${formatPrice(order.total)}</p>

<p style="margin:22px 0 6px;font-size:12px;color:${MUTED};">Customer</p>
${buyerLines(order)
  .map((line, index) => (index === 0 ? `<strong>${escapeHtml(line)}</strong>` : escapeHtml(line)))
  .join("<br>")}

${itemsTable(order)}
${note}
<p style="margin:24px 0 0;font-size:13px;color:${invoiceSent ? MUTED : "#d12b3f"};${invoiceSent ? "" : "font-weight:bold;"}">${invoiceStatus}</p>
<p style="margin:6px 0 0;font-size:13px;color:${hasPdf ? MUTED : "#d12b3f"};">${escapeHtml(pdfStatus)}</p>
<p style="margin:6px 0 0;color:${MUTED};font-size:13px;">Reply to this email to write to the customer.</p>`;

  const text = [
    `New order № ${order.number} (${kind}, ${formatDate(order.placedAt)})`,
    `${units} ${units === 1 ? "item" : "items"}, ${formatPrice(order.total)}`,
    "",
    "CUSTOMER",
    ...buyerLines(order),
    "",
    itemsText(order),
    "",
    `TOTAL: ${formatPrice(order.total)}`,
    ...(customer.note ? ["", `Customer's note: ${customer.note}`] : []),
    "",
    invoiceStatus,
    pdfStatus,
  ].join("\n");

  return {
    subject: `New order № ${order.number}: ${units} ${units === 1 ? "item" : "items"}, ${formatPrice(order.total)}`,
    html: page(`New order № ${order.number}`, body),
    text,
  };
}

/* A message from the contact form, sent to the store */
export function contactEmail(contact: ContactMessage): RenderedEmail {
  const body = `<p style="margin:0;font-size:12px;color:${MUTED};">Contact form on ${escapeHtml(site.name)}</p>
<p style="margin:4px 0 0;font-size:22px;font-weight:bold;">Message from ${escapeHtml(contact.name)}</p>
<p style="margin:6px 0 0;">${escapeHtml(contact.email)}</p>
<p style="margin:20px 0 0;padding:14px 16px;background:${SOFT};border-radius:8px;white-space:pre-wrap;">${escapeHtml(contact.message)}</p>
<p style="margin:24px 0 0;color:${MUTED};font-size:13px;">Reply to this email to answer them.</p>`;

  return {
    subject: `Message from ${contact.name} (${site.name} contact form)`,
    html: page(`Message from ${contact.name}`, body),
    text: [`Message from ${contact.name} <${contact.email}>`, "", contact.message].join("\n"),
  };
}
