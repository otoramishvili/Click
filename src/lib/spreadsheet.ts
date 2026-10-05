/*
  Reads a table out of a file exported from 1C or Excel, in the browser.
    .xlsx          Excel workbook (the first sheet is read)
    .csv / .txt    text with tabs, semicolons or commas between the columns
  The result is always the same: a list of rows, each row a list of cell texts.
*/
export type Sheet = string[][];

/* Thrown with a message that can be shown to the user as it is */
export class UnreadableFileError extends Error {}

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export async function readSpreadsheetFile(file: File): Promise<Sheet> {
  if (file.size === 0) {
    throw new UnreadableFileError("That file is empty.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new UnreadableFileError(
      "That file is larger than 15 MB. Export only the stock report and try again.",
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  /* Every .xlsx file is a zip archive, and zip archives start with "PK" */
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return readXlsx(bytes);
  }
  /* The old .xls format starts with D0 CF */
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
    throw new UnreadableFileError(
      "This is the old Excel format (.xls). Save the report as .xlsx and choose it again, or copy the rows and paste them below.",
    );
  }

  return parseDelimitedText(decodeText(bytes));
}

/* ---------------------------------------------------------------- text --- */

/* 1C text exports are UTF-8, UTF-16 or (older ones) Windows-1251 */
function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1251").decode(bytes);
  }
}

/*
  Splits text into rows and cells. Also used for rows pasted from 1C or Excel,
  which arrive with tabs between the cells.
*/
export function parseDelimitedText(text: string): Sheet {
  const clean = text.replace(/^\uFEFF/, "");

  /* Work out what separates the columns from the first lines */
  const sample = clean.split(/\r?\n/).slice(0, 20).join("\n");
  const count = (separator: string) => sample.split(separator).length - 1;
  const delimiter =
    count("\t") > 0 ? "\t" : count(";") > 0 && count(";") >= count(",") ? ";" : ",";

  const rows: Sheet = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < clean.length; index++) {
    const char = clean[index];

    if (inQuotes) {
      if (char === '"' && clean[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === "") {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && clean[index + 1] === "\n") index++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((value) => value.trim() !== ""));
}

/* ---------------------------------------------------------------- xlsx --- */

type ZipEntry = { method: number; start: number; compressedSize: number };

/* Finds every file inside the zip archive by reading its table of contents */
function listZipEntries(bytes: Uint8Array): Map<string, ZipEntry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = new Map<string, ZipEntry>();

  /* The table of contents is pointed to by a record at the very end */
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) return entries;

  const total = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);

  for (let n = 0; n < total; n++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) break;

    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder("utf-8").decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
    );

    if (localOffset + 30 <= bytes.length) {
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      entries.set(name.replace(/\\/g, "/").toLowerCase(), {
        method,
        start: localOffset + 30 + localNameLength + localExtraLength,
        compressedSize,
      });
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function readZipEntry(
  bytes: Uint8Array,
  entry: ZipEntry | undefined,
): Promise<string | null> {
  if (!entry) return null;
  const data = bytes.slice(entry.start, entry.start + entry.compressedSize);

  /* 0 = stored as it is, 8 = compressed (deflate) */
  if (entry.method === 0) return new TextDecoder("utf-8").decode(data);
  if (entry.method !== 8) return null;

  const stream = new Blob([data])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new TextDecoder("utf-8").decode(await new Response(stream).arrayBuffer());
}

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}

/* All the text inside one <si> or <is> element (it can be split into runs) */
function joinedText(element: Element): string {
  let result = "";
  for (const node of Array.from(element.getElementsByTagNameNS("*", "t"))) {
    /* Skip phonetic hints, which repeat the text */
    if (node.parentElement?.localName === "rPh") continue;
    result += node.textContent ?? "";
  }
  return result;
}

/* "C7" -> 2, "AA1" -> 26 */
function columnIndex(reference: string): number {
  let index = 0;
  for (const char of reference.toUpperCase()) {
    const code = char.charCodeAt(0);
    if (code < 65 || code > 90) break;
    index = index * 26 + (code - 64);
  }
  return index - 1;
}

const NOT_A_WORKBOOK =
  "That file could not be read as an Excel workbook. Save the report as .xlsx again, or copy the rows and paste them below.";

async function readXlsx(bytes: Uint8Array): Promise<Sheet> {
  const entries = listZipEntries(bytes);
  const read = (name: string) => readZipEntry(bytes, entries.get(name.toLowerCase()));

  /* Which file holds the first sheet? Ask the workbook, fall back to the usual name. */
  let sheetPath = "xl/worksheets/sheet1.xml";
  const workbook = await read("xl/workbook.xml");
  const relations = await read("xl/_rels/workbook.xml.rels");
  if (workbook && relations) {
    const firstSheet = parseXml(workbook).getElementsByTagNameNS("*", "sheet")[0];
    const relationId = firstSheet
      ? Array.from(firstSheet.attributes).find((attribute) => attribute.localName === "id")?.value
      : undefined;
    const relation = Array.from(
      parseXml(relations).getElementsByTagNameNS("*", "Relationship"),
    ).find((element) => element.getAttribute("Id") === relationId);
    const target = relation?.getAttribute("Target");
    if (target) {
      sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    }
  }
  if (!entries.has(sheetPath.toLowerCase())) {
    const anySheet = [...entries.keys()].find((name) =>
      /^xl\/worksheets\/[^/]+\.xml$/.test(name),
    );
    if (!anySheet) throw new UnreadableFileError(NOT_A_WORKBOOK);
    sheetPath = anySheet;
  }

  const sheetXml = await read(sheetPath);
  if (!sheetXml) throw new UnreadableFileError(NOT_A_WORKBOOK);

  /* Texts are usually kept once in a shared list and referred to by number */
  const sharedXml = await read("xl/sharedStrings.xml");
  const shared = sharedXml
    ? Array.from(parseXml(sharedXml).getElementsByTagNameNS("*", "si")).map(joinedText)
    : [];

  const rows: Sheet = [];
  for (const rowElement of Array.from(
    parseXml(sheetXml).getElementsByTagNameNS("*", "row"),
  )) {
    const row: string[] = [];
    let next = 0;

    for (const cellElement of Array.from(rowElement.children)) {
      if (cellElement.localName !== "c") continue;

      const reference = cellElement.getAttribute("r");
      const column = reference ? columnIndex(reference) : next;
      next = column + 1;

      const type = cellElement.getAttribute("t");
      const raw =
        Array.from(cellElement.children).find((child) => child.localName === "v")
          ?.textContent ?? "";

      let value: string;
      if (type === "s") {
        value = shared[Number(raw)] ?? "";
      } else if (type === "inlineStr") {
        value = joinedText(cellElement);
      } else {
        value = raw;
      }

      while (row.length < column) row.push("");
      row[column] = value;
    }

    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }

  return rows;
}
