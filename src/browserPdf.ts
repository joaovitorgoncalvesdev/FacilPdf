import PizZip from "pizzip";
import type {
  Content,
  ContentText,
  ContentTable,
  TDocumentDefinitions,
  CustomTableLayout,
} from "pdfmake/interfaces";
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const children = (node: Element, name: string) =>
  Array.from(node.children).filter((child) => child.localName === name);
const child = (node: Element | undefined, name: string) =>
  node ? children(node, name)[0] : undefined;
const attr = (node: Element | undefined, name: string) =>
  node?.getAttributeNS(W, name) ?? undefined;
const number = (value: string | undefined, fallback: number) =>
  value !== undefined && Number.isFinite(Number(value))
    ? Number(value)
    : fallback;
const yes = (node: Element | undefined) =>
  !!node && !["0", "false", "off"].includes(attr(node, "val") || "");
const fontFamily = (name: string | undefined) =>
  name && /calibri|carlito|arial/i.test(name) ? "Carlito" : "Tinos";

// This adapter handles the paragraphs and single-cell signature tables of our
// own template. It is not a general converter for arbitrary uploaded Word files.
export function definitionFromXml(
  xml: string,
  stylesXml: string,
): TDocumentDefinitions {
  const parse = (value: string) => {
    const result = new DOMParser().parseFromString(value, "application/xml");
    if (result.getElementsByTagName("parsererror").length)
      throw Error("Não foi possível ler a formatação do modelo.");
    return result;
  };
  const doc = parse(xml),
    styles = parse(stylesXml);
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) throw Error("Modelo de documento inválido.");
  const sect = child(body, "sectPr"),
    page = child(sect, "pgSz"),
    margins = child(sect, "pgMar");
  const width = number(attr(page, "w"), 11906) / 20,
    height = number(attr(page, "h"), 16838) / 20;
  const left = number(attr(margins, "left"), 1701) / 20,
    right = number(attr(margins, "right"), 1701) / 20;
  // Word reserves header clearance even though this template declares top=0.
  // Match the measured title position in its Word PDF export (points).
  const top = Math.max(
      number(attr(margins, "top"), 0) / 20,
      child(sect, "headerReference") ? 58.4 : 0,
    ),
    bottom = number(attr(margins, "bottom"), 1417) / 20;
  const defaults = styles.getElementsByTagNameNS(W, "docDefaults")[0];
  const defaultP = child(child(defaults, "pPrDefault"), "pPr"),
    defaultR = child(child(defaults, "rPrDefault"), "rPr");
  const defaultSpacing = child(defaultP, "spacing");
  const noBorders: CustomTableLayout = {
    hLineWidth: () => 0,
    vLineWidth: () => 0,
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  };
  function paragraph(p: Element): ContentText {
    const props = child(p, "pPr"),
      spacing = child(props, "spacing"),
      paragraphR = child(props, "rPr");
    const baseSize =
      number(
        attr(child(paragraphR, "sz"), "val"),
        number(attr(child(defaultR, "sz"), "val"), 22),
      ) / 2;
    const text: ContentText[] = [];
    for (const r of Array.from(p.getElementsByTagNameNS(W, "r"))) {
      const run = child(r, "rPr");
      let value = "";
      for (const node of Array.from(r.children))
        if (node.localName === "t") value += node.textContent || "";
        else if (node.localName === "tab") value += "    ";
        else if (node.localName === "br" && attr(node, "type") !== "page")
          value += "\n";
      if (!value) continue;
      const family = fontFamily(
        attr(child(run, "rFonts"), "ascii") ||
          attr(child(paragraphR, "rFonts"), "ascii"),
      );
      text.push({
        text: value,
        font: family,
        fontSize: number(attr(child(run, "sz"), "val"), baseSize * 2) / 2,
        bold: yes(child(run, "b")),
        italics: yes(child(run, "i")),
      });
    }
    const align = attr(child(props, "jc"), "val");
    const line = number(
      attr(spacing, "line"),
      number(attr(defaultSpacing, "line"), 259),
    );
    const before = number(attr(spacing, "before"), 0) / 20,
      after =
        number(
          attr(spacing, "after"),
          number(attr(defaultSpacing, "after"), 160),
        ) / 20;
    return {
      text: text.length ? text : " ",
      font: "Tinos",
      fontSize: baseSize,
      alignment:
        align === "both"
          ? "justify"
          : align === "center"
            ? "center"
            : align === "right"
              ? "right"
              : "left",
      lineHeight: line > 0 ? line / 240 : 1,
      margin: [0, before, 0, after],
      ...(child(props, "pageBreakBefore")
        ? { pageBreak: "before" as const }
        : {}),
    };
  }
  function table(element: Element, available: number): ContentTable {
    const props = child(element, "tblPr");
    const tableWidth = Math.min(
      available,
      number(attr(child(props, "tblW"), "w"), available * 20) / 20,
    );
    const rows = children(element, "tr");
    const square =
      !!child(props, "tblBorders") &&
      yes(child(child(props, "tblBorders"), "top")) &&
      attr(child(child(props, "tblBorders"), "top"), "val") !== "nil";
    if (square) {
      const size = Math.min(
        tableWidth,
        number(attr(child(child(rows[0], "trPr"), "trHeight"), "val"), 2000) /
          20,
      );
      return {
        margin: [Math.max(0, (available - size) / 2), 0, 0, 0],
        table: {
          widths: [size],
          heights: size,
          body: [[{ text: " ", fontSize: 0.1, lineHeight: 0.1 }]],
          dontBreakRows: true,
        },
        layout: {
          ...noBorders,
          hLineWidth: () => 0.75,
          vLineWidth: () => 0.75,
        },
      };
    }
    const contents: Content[][] = rows.map((row) =>
      children(row, "tc").map((cell) => ({
        stack: Array.from(cell.children).flatMap<Content>((node) =>
          node.localName === "p"
            ? [paragraph(node)]
            : node.localName === "tbl"
              ? [table(node, tableWidth)]
              : [],
        ),
      })),
    );
    if (contents.some((row) => row.length !== 1))
      throw Error(
        "A estrutura do modelo mudou. Baixe o Word editável e abra em um editor compatível para exportar este documento.",
      );
    return {
      table: { widths: [tableWidth], body: contents, dontBreakRows: true },
      layout: noBorders,
      margin: [Math.max(0, (available - tableWidth) / 2), 0, 0, 0],
    };
  }
  const elements = Array.from(body.children);
  const witnessStart = elements.findIndex(
    (element) =>
      element.localName === "p" &&
      element.textContent?.trim() === "TESTEMUNHAS",
  );
  const convertElements = (nodes: Element[]) =>
    nodes.flatMap<Content>((element) =>
      element.localName === "p"
        ? [paragraph(element)]
        : element.localName === "tbl"
          ? [table(element, width - left - right)]
          : [],
    );
  const content: Content[] =
    witnessStart < 0
      ? convertElements(elements)
      : [
          ...convertElements(elements.slice(0, witnessStart)),
          {
            stack: convertElements(elements.slice(witnessStart)),
            unbreakable: true,
          },
        ];
  return {
    pageSize: { width, height },
    pageMargins: [left, top, right, bottom],
    defaultStyle: { font: "Tinos", fontSize: 11, color: "#000000" },
    content,
    info: {
      title: "Instrumento particular de doação",
      creator: "FácilPDF",
      producer: "FácilPDF · PDF pelo site",
    },
    compress: true,
  };
}

export async function browserPdf(docx: Blob): Promise<Blob> {
  const zip = new PizZip(await docx.arrayBuffer());
  const xml = zip.file("word/document.xml")?.asText(),
    styles = zip.file("word/styles.xml")?.asText();
  if (!xml || !styles)
    throw Error("Não foi possível abrir o modelo para gerar o PDF.");
  const { default: pdfMake } = await import("pdfmake/build/pdfmake");
  const url = (file: string) =>
    new URL(`${import.meta.env.BASE_URL}fonts/${file}`, window.location.origin)
      .href;
  pdfMake.addFonts({
    Tinos: {
      normal: url("Tinos-Regular.ttf"),
      bold: url("Tinos-Bold.ttf"),
      italics: url("Tinos-Italic.ttf"),
      bolditalics: url("Tinos-BoldItalic.ttf"),
    },
    Carlito: {
      normal: url("Carlito-Regular.ttf"),
      bold: url("Carlito-Regular.ttf"),
      italics: url("Carlito-Regular.ttf"),
      bolditalics: url("Carlito-Regular.ttf"),
    },
  });
  try {
    return await pdfMake.createPdf(definitionFromXml(xml, styles)).getBlob();
  } catch (error) {
    throw new Error(
      `Não foi possível gerar o PDF no site. Confira a conexão e tente novamente.${error instanceof Error ? " " + error.message : ""}`,
    );
  }
}
