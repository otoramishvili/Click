/*
  A small PDF writer: just enough to draw an invoice.
  It can put text (in the built-in Georgian/Latin font), boxes, lines and one
  JPEG picture on A4 pages. It needs no extra packages.

  You normally never change this file. The look of the invoice is in
  lib/server/invoice-pdf.ts.

  Positions are in points (1 point = 1/72 inch; an A4 page is 595 x 842),
  measured from the TOP LEFT corner of the page, like on a screen.
*/
import { deflateSync } from "node:zlib";
import { bold, regular, type FontData } from "@/lib/server/pdf/font-data";

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;

/* A colour as six hex digits, for example "0070C0" */
export type Color = string;

export type TextStyle = {
  size: number;
  bold?: boolean;
  /* Slanted text. The font has no italic cut, so the letters are leaned over. */
  italic?: boolean;
  color?: Color;
};

type Font = {
  data: FontData;
  /* Unicode character code -> glyph number */
  glyphOf: Map<number, number>;
  /* glyph number -> the character it was used for (for copy and search) */
  used: Map<number, number>;
};

function loadFont(data: FontData): Font {
  const glyphOf = new Map<number, number>();
  data.codes.forEach((code, index) => glyphOf.set(code, data.glyphs[index]));
  return { data, glyphOf, used: new Map() };
}

/* Read-only copies for measuring. Each document keeps its own (see below). */
const measureFonts = { regular: loadFont(regular), bold: loadFont(bold) };
const QUESTION_MARK = 63;

/*
  The glyph for a character. Line breaks and tabs become a space; a character
  the font does not have (an emoji, Chinese...) becomes "?".
*/
function glyphFor(font: Font, code: number): { glyph: number; code: number } {
  const wanted = code < 32 || code === 0xa0 ? 32 : code;
  const glyph = font.glyphOf.get(wanted);
  if (glyph !== undefined) return { glyph, code: wanted };
  return { glyph: font.glyphOf.get(QUESTION_MARK) ?? 0, code: QUESTION_MARK };
}

/* How wide a piece of text is, in points */
export function textWidth(text: string, size: number, isBold = false): number {
  const font = isBold ? measureFonts.bold : measureFonts.regular;
  let total = 0;
  for (const character of text.normalize("NFC")) {
    const { glyph } = glyphFor(font, character.codePointAt(0) ?? 32);
    total += font.data.widths[glyph] ?? 0;
  }
  return (total * size) / 1000;
}

/*
  Splits text into lines no wider than maxWidth. Breaks between words; a single
  word that is too long (a serial number, a link) is broken where it must be.
*/
export function wrapText(
  text: string,
  maxWidth: number,
  size: number,
  isBold = false,
): string[] {
  const lines: string[] = [];
  let line = "";

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size, isBold) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";

    /* The word alone does not fit: cut it into pieces that do */
    let piece = "";
    for (const character of word) {
      if (piece && textWidth(piece + character, size, isBold) > maxWidth) {
        lines.push(piece);
        piece = character;
      } else {
        piece += character;
      }
    }
    line = piece;
  }
  if (line) lines.push(line);

  return lines.length > 0 ? lines : [""];
}

/* 12.5 -> "12.5", 3 -> "3", 0.3333 -> "0.333" */
function num(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function rgb(color: Color): string {
  const value = Number.parseInt(color, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
    .map((part) => num(part / 255))
    .join(" ");
}

function hex4(value: number): string {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

/* Text -> bytes, one byte per character (PDF's own syntax is plain ASCII) */
function ascii(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index) & 255;
  }
  return bytes;
}

function fromBase64(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/* A PDF text string that can hold any alphabet: UTF-16 written as hex */
function unicodeString(text: string): string {
  let out = "FEFF";
  for (let index = 0; index < text.length; index += 1) {
    out += hex4(text.charCodeAt(index));
  }
  return `<${out}>`;
}

/* One character as UTF-16 hex, for the "which letter is this glyph" table */
function utf16Hex(code: number): string {
  if (code < 0x10000) return hex4(code);
  const offset = code - 0x10000;
  return hex4(0xd800 + (offset >> 10)) + hex4(0xdc00 + (offset & 0x3ff));
}

export class PdfPage {
  /* The drawing commands of this page, in PDF's own language */
  readonly commands: string[] = [];

  constructor(private readonly document: PdfDocument) {}

  /* Writes one line of text. x is its left edge, y its baseline (the line the letters stand on). */
  text(text: string, x: number, y: number, style: TextStyle): void {
    if (!text) return;
    const fontName = style.bold ? "F2" : "F1";
    const encoded = this.document.encode(text, Boolean(style.bold));
    const slant = style.italic ? 0.2 : 0;

    this.commands.push(
      `BT /${fontName} ${num(style.size)} Tf ${rgb(style.color ?? "000000")} rg ` +
        `1 0 ${num(slant)} 1 ${num(x)} ${num(PAGE_HEIGHT - y)} Tm <${encoded}> Tj ET`,
    );
  }

  /* Text that ends at x */
  textRight(text: string, x: number, y: number, style: TextStyle): void {
    this.text(text, x - textWidth(text, style.size, style.bold), y, style);
  }

  /* Text centred on x */
  textCenter(text: string, x: number, y: number, style: TextStyle): void {
    this.text(text, x - textWidth(text, style.size, style.bold) / 2, y, style);
  }

  /* A box. x, y is its top left corner. Give it a fill colour, a border colour, or both. */
  box(
    x: number,
    y: number,
    width: number,
    height: number,
    look: { fill?: Color; border?: Color; borderWidth?: number },
  ): void {
    const shape = `${num(x)} ${num(PAGE_HEIGHT - y - height)} ${num(width)} ${num(height)} re`;
    if (look.fill) {
      this.commands.push(`${rgb(look.fill)} rg ${shape} f`);
    }
    if (look.border) {
      this.commands.push(
        `${rgb(look.border)} RG ${num(look.borderWidth ?? 0.6)} w ${shape} S`,
      );
    }
  }

  /* The picture added with document.setPicture(). x, y is its top left corner. */
  picture(x: number, y: number, width: number, height: number): void {
    this.commands.push(
      `q ${num(width)} 0 0 ${num(height)} ${num(x)} ${num(PAGE_HEIGHT - y - height)} cm /Im1 Do Q`,
    );
  }
}

export class PdfDocument {
  private readonly pages: PdfPage[] = [];
  private readonly fonts = { regular: loadFont(regular), bold: loadFont(bold) };
  private pictureData: { jpeg: Uint8Array; width: number; height: number } | null = null;

  /* title is what a PDF program shows in its window bar */
  constructor(private readonly title: string) {}

  addPage(): PdfPage {
    const page = new PdfPage(this);
    this.pages.push(page);
    return page;
  }

  get pageCount(): number {
    return this.pages.length;
  }

  getPage(index: number): PdfPage {
    return this.pages[index];
  }

  /* The one JPEG picture pages can show (the logo). width and height are its size in pixels. */
  setPicture(jpegBase64: string, width: number, height: number): void {
    this.pictureData = { jpeg: fromBase64(jpegBase64), width, height };
  }

  /* Used by PdfPage: turns text into glyph numbers and remembers which were used */
  encode(text: string, isBold: boolean): string {
    const font = isBold ? this.fonts.bold : this.fonts.regular;
    let out = "";
    for (const character of text.normalize("NFC")) {
      const { glyph, code } = glyphFor(font, character.codePointAt(0) ?? 32);
      if (!font.used.has(glyph)) font.used.set(glyph, code);
      out += hex4(glyph);
    }
    return out;
  }

  /* Puts the whole file together and returns its bytes */
  toBytes(): Uint8Array {
    /* A PDF file is a numbered list of "objects" that point at each other. */
    const objects: Uint8Array[][] = [];
    const add = (...parts: (string | Uint8Array)[]): number => {
      objects.push(parts.map((part) => (typeof part === "string" ? ascii(part) : part)));
      return objects.length;
    };
    const reserve = (): number => {
      objects.push([]);
      return objects.length;
    };
    const fill = (id: number, ...parts: (string | Uint8Array)[]): void => {
      objects[id - 1] = parts.map((part) => (typeof part === "string" ? ascii(part) : part));
    };
    const stream = (dictionary: string, data: Uint8Array): number => {
      const packed = new Uint8Array(deflateSync(data));
      return add(
        `<< ${dictionary} /Filter /FlateDecode /Length ${packed.length} >>\nstream\n`,
        packed,
        "\nendstream",
      );
    };

    const catalogId = reserve();
    const pagesId = reserve();

    const fontIds = [this.fonts.regular, this.fonts.bold].map((font, index) => {
      const name = `${index === 0 ? "CLICKA" : "CLICKB"}+${font.data.name}`;
      const glyphs = [...font.used.keys()].sort((a, b) => a - b);

      const fileBytes = fromBase64(font.data.file);
      const fileId = stream(`/Length1 ${fileBytes.length}`, fileBytes);

      const descriptorId = add(
        `<< /Type /FontDescriptor /FontName /${name} /Flags 4 ` +
          `/FontBBox [${font.data.bbox.join(" ")}] /ItalicAngle 0 ` +
          `/Ascent ${font.data.ascent} /Descent ${font.data.descent} ` +
          `/CapHeight ${font.data.capHeight} /StemV ${font.data.stemV} ` +
          `/FontFile2 ${fileId} 0 R >>`,
      );

      const widths = glyphs.map((glyph) => `${glyph} [${font.data.widths[glyph]}]`).join(" ");
      const innerId = add(
        `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${name} ` +
          `/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> ` +
          `/FontDescriptor ${descriptorId} 0 R /DW 600 /W [${widths}] /CIDToGIDMap /Identity >>`,
      );

      /* Says which letter each glyph is, so text can be copied and searched */
      const mappings: string[] = [];
      for (let start = 0; start < glyphs.length; start += 100) {
        const group = glyphs.slice(start, start + 100);
        mappings.push(
          `${group.length} beginbfchar\n` +
            group
              .map((glyph) => `<${hex4(glyph)}> <${utf16Hex(font.used.get(glyph) ?? 32)}>`)
              .join("\n") +
            "\nendbfchar",
        );
      }
      const lettersId = stream(
        "",
        ascii(
          "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n" +
            "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n" +
            "/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n" +
            "1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n" +
            mappings.join("\n") +
            "\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n",
        ),
      );

      return add(
        `<< /Type /Font /Subtype /Type0 /BaseFont /${name} /Encoding /Identity-H ` +
          `/DescendantFonts [${innerId} 0 R] /ToUnicode ${lettersId} 0 R >>`,
      );
    });

    let pictures = "";
    if (this.pictureData) {
      const { jpeg, width, height } = this.pictureData;
      const pictureId = add(
        `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
        jpeg,
        "\nendstream",
      );
      pictures = ` /XObject << /Im1 ${pictureId} 0 R >>`;
    }

    const resourcesId = add(
      `<< /Font << /F1 ${fontIds[0]} 0 R /F2 ${fontIds[1]} 0 R >>${pictures} >>`,
    );

    const pageIds = this.pages.map((page) => {
      const contentId = stream("", ascii(page.commands.join("\n")));
      return add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
          `/Resources ${resourcesId} 0 R /Contents ${contentId} 0 R >>`,
      );
    });

    fill(
      pagesId,
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`,
    );
    fill(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const infoId = add(
      `<< /Title ${unicodeString(this.title)} /Producer (Storefront invoice) /CreationDate (D:${stamp}Z) >>`,
    );

    /* Write the objects one after another, noting where each one starts */
    const chunks: Uint8Array[] = [ascii("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
    let length = chunks[0].length;
    const offsets: number[] = [];
    const push = (chunk: Uint8Array) => {
      chunks.push(chunk);
      length += chunk.length;
    };

    objects.forEach((parts, index) => {
      offsets.push(length);
      push(ascii(`${index + 1} 0 obj\n`));
      parts.forEach(push);
      push(ascii("\nendobj\n"));
    });

    const tableStart = length;
    push(
      ascii(
        `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
          offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("") +
          `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\n` +
          `startxref\n${tableStart}\n%%EOF\n`,
      ),
    );

    const file = new Uint8Array(length);
    let position = 0;
    for (const chunk of chunks) {
      file.set(chunk, position);
      position += chunk.length;
    }
    return file;
  }
}
