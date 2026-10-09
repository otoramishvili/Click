/*
  The PDF invoice. It follows your invoice Excel file: your company and logo at
  the top, the buyer on the left, your bank details in the box on the right,
  the table of products, the VAT totals, the payment note and the delivery time.

  It is filled in from the order and attached to both order emails.
  Your company details come from `seller` in lib/site.ts.
  The wording and the layout are in this file.

  All sizes are in points: an A4 page is 595 wide and 842 high.
*/
import { toTetri } from "@/lib/format";
import type { Order } from "@/lib/orders";
import { logo } from "@/lib/server/pdf/logo";
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PdfDocument,
  textWidth,
  wrapText,
  type PdfPage,
  type TextStyle,
} from "@/lib/server/pdf/pdf-writer";
import { seller } from "@/lib/site";

/* The colours of the Excel file */
const BLUE = "0070C0";
const LINE = "95B3D7";
const TINT = "DCE6F1";
const INK = "262626";
const MUTED = "595959";

const MARGIN = 36;
const RIGHT = PAGE_WIDTH - MARGIN;
const CONTENT = RIGHT - MARGIN;
/* Nothing is drawn below this line, except the page number */
const BOTTOM = PAGE_HEIGHT - 48;

/* The columns of the product table. The widths add up to the content width. */
type Column = {
  title: string;
  width: number;
  align: "left" | "center" | "right";
};
const COLUMNS: Column[] = [
  { title: "№", width: 22, align: "center" },
  { title: "პროდუქტი", width: 70, align: "center" },
  { title: "პროდუქტის დასახელება", width: 200, align: "left" },
  { title: "ზომის ერთ.", width: 55, align: "center" },
  { title: "რ-ბა", width: 37, align: "center" },
  { title: "ერთ. ფასი (ლარი)", width: 62, align: "right" },
  { title: "მთლ. ღირ-ბა (ლარი)", width: CONTENT - 446, align: "right" },
];
const UNIT = "ცალი";
const CELL_PAD = 4;

/* The name of the file attached to the emails */
export function invoiceFileName(order: Order): string {
  return `invoice-${order.number}.pdf`;
}

/* 1234.5 -> "1,234.50" */
function money(amount: number): string {
  const [whole, decimals] = amount.toFixed(2).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decimals}`;
}

/* 05.10.2026, in Georgian time */
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

/*
  The total already includes VAT. This splits it the way the Excel file does:
  total / 1.18 is the amount without VAT, the rest is the VAT.
*/
export function splitVat(total: number): { withoutVat: number; vat: number } {
  const totalTetri = toTetri(total);
  const withoutVatTetri = Math.round(totalTetri / (1 + seller.vatPercent / 100));
  return {
    withoutVat: withoutVatTetri / 100,
    vat: (totalTetri - withoutVatTetri) / 100,
  };
}

/* A big number is printed smaller, so that it always stays inside its cell */
function fitted(text: string, width: number, style: TextStyle): TextStyle {
  const natural = textWidth(text, style.size, style.bold);
  return natural <= width ? style : { ...style, size: (style.size * width) / natural };
}

/* Draws lines of text one under another and returns the y after the last one */
function drawLines(
  page: PdfPage,
  lines: string[],
  x: number,
  y: number,
  style: TextStyle,
  lineHeight: number,
): number {
  let at = y;
  for (const line of lines) {
    page.text(line, x, at, style);
    at += lineHeight;
  }
  return at;
}

/* Text placed in a table cell according to the column's alignment */
function drawInCell(
  page: PdfPage,
  text: string,
  left: number,
  width: number,
  y: number,
  align: Column["align"],
  style: TextStyle,
): void {
  if (align === "right") {
    page.textRight(text, left + width - CELL_PAD, y, style);
  } else if (align === "center") {
    page.textCenter(text, left + width / 2, y, style);
  } else {
    page.text(text, left + CELL_PAD, y, style);
  }
}

/* The blue header row of the product table. Returns the y under it. */
function drawTableHeader(page: PdfPage, y: number): number {
  const style: TextStyle = { size: 8.5, color: BLUE };
  const lineHeight = 11;
  const wrapped = COLUMNS.map((column) =>
    wrapText(column.title, column.width - CELL_PAD * 2, style.size),
  );
  const height = Math.max(...wrapped.map((lines) => lines.length)) * lineHeight + 12;

  let left = MARGIN;
  COLUMNS.forEach((column, index) => {
    page.box(left, y, column.width, height, { fill: TINT, border: LINE });
    const lines = wrapped[index];
    let at = y + (height - lines.length * lineHeight) / 2 + 8;
    for (const line of lines) {
      page.textCenter(line, left + column.width / 2, at, style);
      at += lineHeight;
    }
    left += column.width;
  });

  return y + height;
}

/* A full-width blue bar with centred text, like the note rows of the Excel file */
function drawBar(page: PdfPage, text: string, y: number, style: TextStyle): number {
  const lineHeight = style.size + 3.5;
  const lines = wrapText(text, CONTENT - 24, style.size, style.bold);
  const height = lines.length * lineHeight + 12;

  page.box(MARGIN, y, CONTENT, height, { fill: TINT, border: LINE });
  let at = y + 6 + style.size;
  for (const line of lines) {
    page.textCenter(line, MARGIN + CONTENT / 2, at, style);
    at += lineHeight;
  }
  return y + height;
}

/* Your company, logo, invoice number, date, buyer and bank details. Returns the y under them. */
function drawTop(page: PdfPage, order: Order): number {
  const { customer } = order;

  /* Your company, top left */
  page.text(seller.legalName, MARGIN, 52, { size: 16, bold: true, color: BLUE });
  drawLines(
    page,
    [seller.address, `ტელ: ${seller.phone}`, `ელ. ფოსტა: ${seller.email}`],
    MARGIN,
    70,
    { size: 9, color: BLUE },
    13,
  );

  /* Logo, top right */
  const logoWidth = 92;
  const logoHeight = (logoWidth * logo.height) / logo.width;
  page.picture(RIGHT - logoWidth, 30, logoWidth, logoHeight);

  /* Invoice number and date */
  page.textCenter(`ინვოისი № ${order.number}`, PAGE_WIDTH / 2, 142, {
    size: 18,
    bold: true,
    color: INK,
  });
  const date = formatDate(order.placedAt);
  page.textRight(date, RIGHT, 168, { size: 11, color: INK });
  page.textRight("თარიღი:", RIGHT - textWidth(date, 11) - 10, 168, {
    size: 10,
    color: MUTED,
  });

  /* The box with your bank details, on the right */
  const boxWidth = 268;
  const boxLeft = RIGHT - boxWidth;
  const boxTop = 186;
  const labelWidth = 86;
  const rows: [string, string][] = [
    ["მიმწოდებელი:", seller.legalName],
    ["კოდი:", seller.idCode],
    ["ბანკი:", seller.bankName],
    ["ბანკის კოდი:", seller.bankCode],
    ["ანგარიშის №:", seller.iban],
  ];
  let rowY = boxTop + 18;
  for (const [label, value] of rows) {
    page.text(label, boxLeft + 10, rowY, { size: 9, bold: true, color: INK });
    const lines = wrapText(value, boxWidth - labelWidth - 20, 9.5);
    rowY = drawLines(page, lines, boxLeft + 10 + labelWidth, rowY, { size: 9.5, color: INK }, 12) + 3;
  }
  const boxBottom = rowY - 5;
  page.box(boxLeft, boxTop, boxWidth, boxBottom - boxTop, { border: LINE });

  /* The buyer, on the left */
  const buyerWidth = boxLeft - MARGIN - 18;
  const isBusiness = customer.type === "business";
  const name = isBusiness ? customer.companyName : customer.fullName;
  const idNumber = isBusiness ? customer.companyId : customer.personalId;

  page.text("მყიდველი:", MARGIN, boxTop + 12, { size: 9, bold: true, color: BLUE });
  let buyerY = drawLines(
    page,
    wrapText(name, buyerWidth, 10.5, true),
    MARGIN,
    boxTop + 28,
    { size: 10.5, bold: true, color: INK },
    13.5,
  );

  const details: string[] = [];
  if (idNumber) {
    details.push(`${isBusiness ? "საიდენტიფიკაციო კოდი" : "პირადი ნომერი"}: ${idNumber}`);
  }
  if (isBusiness) details.push(`საკონტაქტო პირი: ${customer.fullName}`);
  details.push(`მისამართი: ${customer.city}, ${customer.address}`);
  details.push(`ტელ: ${customer.phone}`);
  for (const detail of details) {
    buyerY = drawLines(
      page,
      wrapText(detail, buyerWidth, 9),
      MARGIN,
      buyerY + 1,
      { size: 9, color: INK },
      12,
    );
  }

  return Math.max(boxBottom, buyerY - 8) + 22;
}

/* Builds the invoice for an order and returns the bytes of the PDF file */
export function buildInvoicePdf(order: Order): Uint8Array {
  const document = new PdfDocument(`ინვოისი № ${order.number}`);
  document.setPicture(logo.jpeg, logo.width, logo.height);

  let page = document.addPage();
  let y = drawTop(page, order);
  y = drawTableHeader(page, y);

  /* The products. A row that does not fit goes to a new page, under a new header. */
  const cellStyle: TextStyle = { size: 9, color: INK };
  const lineHeight = 11.5;

  order.lines.forEach((line, index) => {
    const cells = [
      String(index + 1),
      line.category ?? "",
      line.name,
      UNIT,
      String(line.quantity),
      money(line.price),
      money(line.sum),
    ];
    /* Words wrap onto more lines. Numbers (the last three columns) never do. */
    const wrapped = cells.map((cell, column) =>
      column >= 4
        ? [cell]
        : wrapText(cell, COLUMNS[column].width - CELL_PAD * 2, cellStyle.size),
    );
    const height = Math.max(...wrapped.map((lines) => lines.length)) * lineHeight + 7;

    if (y + height > BOTTOM) {
      page = document.addPage();
      y = drawTableHeader(page, MARGIN);
    }

    let left = MARGIN;
    COLUMNS.forEach((column, columnIndex) => {
      page.box(left, y, column.width, height, { border: LINE });
      let at = y + 12.5;
      for (const text of wrapped[columnIndex]) {
        const style = fitted(text, column.width - CELL_PAD * 2, cellStyle);
        drawInCell(page, text, left, column.width, at, column.align, style);
        at += lineHeight;
      }
      left += column.width;
    });
    y += height;
  });

  /* Totals, the notes and the delivery time stay together on one page */
  if (y + 200 > BOTTOM) {
    page = document.addPage();
    y = MARGIN;
  }

  const valueWidth = COLUMNS[COLUMNS.length - 1].width;
  const labelWidth = COLUMNS[3].width + COLUMNS[4].width + COLUMNS[5].width;
  const totalsLeft = RIGHT - valueWidth - labelWidth;
  const { withoutVat, vat } = splitVat(order.total);

  const totals: { label: string; value: string; strong: boolean }[] = [];
  if (seller.vatPercent > 0) {
    totals.push({ label: "სულ თანხა დღგ-ს გარეშე", value: money(withoutVat), strong: false });
    totals.push({
      label: `დღგ-ს თანხა ${seller.vatPercent}%`,
      value: money(vat),
      strong: false,
    });
  }
  totals.push({
    label: seller.vatPercent > 0 ? "სულ თანხა დღგ-ს ჩათვლით (ლარი)" : "სულ თანხა (ლარი)",
    value: money(order.total),
    strong: true,
  });

  y += 14;
  for (const row of totals) {
    const style: TextStyle = { size: row.strong ? 9 : 8.5, bold: row.strong, color: INK };
    const labelLines = wrapText(row.label, labelWidth - CELL_PAD * 2, style.size, style.bold);
    const height = labelLines.length * 11 + (row.strong ? 12 : 7);

    page.box(totalsLeft, y, labelWidth, height, { border: LINE });
    page.box(totalsLeft + labelWidth, y, valueWidth, height, { border: LINE });

    let at = y + (height - labelLines.length * 11) / 2 + 8.5;
    for (const text of labelLines) {
      page.text(text, totalsLeft + CELL_PAD, at, style);
      at += 11;
    }
    page.textRight(
      row.value,
      RIGHT - CELL_PAD,
      y + height / 2 + 3.5,
      fitted(row.value, valueWidth - CELL_PAD * 2, {
        size: row.strong ? 10.5 : 9,
        bold: row.strong,
        color: INK,
      }),
    );
    y += height;
  }

  /* The blue payment note, and what to write when paying */
  y += 22;
  y = drawBar(page, seller.invoiceNote, y, { size: 9.5, bold: true, italic: true, color: BLUE });
  y += 15;
  page.textCenter(
    `გადახდის დანიშნულებაში მიუთითეთ ინვოისის ნომერი: № ${order.number}`,
    PAGE_WIDTH / 2,
    y,
    { size: 9, color: INK },
  );

  /* Delivery time */
  y += 22;
  y = drawBar(page, "მიწოდების ვადა", y, { size: 10.5, bold: true, italic: true, color: BLUE });
  page.textCenter(seller.deliveryTerm, PAGE_WIDTH / 2, y + 18, { size: 11, color: INK });

  /* Page numbers, when there is more than one page */
  if (document.pageCount > 1) {
    for (let index = 0; index < document.pageCount; index += 1) {
      document
        .getPage(index)
        .textCenter(`გვერდი ${index + 1} / ${document.pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 24, {
          size: 8,
          color: MUTED,
        });
    }
  }

  return document.toBytes();
}
