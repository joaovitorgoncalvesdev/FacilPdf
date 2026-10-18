import PizZip from "pizzip";
import {
  activePeople,
  addressOf,
  locationOf,
  normalizeForm,
  type FormData,
  type Person,
} from "./model";
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export function values(input: FormData) {
  const data = normalizeForm(input);
  const out: Record<string, string> = {
    lot_start: data.lot.slice(0, 15),
    lot_end: data.lot.slice(15),
  };
  for (const who of ["donor1", "donor2", "recipient"] as const)
    for (const [field, value] of Object.entries(data[who]))
      out[`${who}_${field}`] = String(value);
  for (const [key, value] of Object.entries(data))
    if (typeof value === "string") out[key] = value;
  out.location = locationOf(data);
  out.city = [data.city, data.signState].filter(Boolean).join(" - ");
  out.date = longDate(data.date);
  return out;
}
function longDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
export function qualification(p: Person) {
  const female = p.gender === "female";
  const parts = [
    p.name.toLocaleUpperCase("pt-BR"),
    p.nationality,
    p.marital,
    p.occupation,
  ];
  if (p.birth)
    parts.push(`${female ? "nascida" : "nascido"} em ${longDate(p.birth)}`);
  if (p.birthCity)
    parts.push(
      `natural de ${p.birthCity}${p.birthState ? " - " + p.birthState : ""}`,
    );
  if (p.mother || p.father)
    parts.push(
      `${female ? "filha" : "filho"} de ${[p.mother, p.father].filter(Boolean).join(" e ")}`,
    );
  if (p.rg)
    parts.push(
      `${female ? "portadora" : "portador"} do R.G. nº ${p.rg}${p.issuer ? " " + p.issuer : ""}${p.issuerState ? "/" + p.issuerState : ""}`,
    );
  if (p.cpf) parts.push(`CPF: ${p.cpf}`);
  if (addressOf(p)) parts.push(`residente em ${addressOf(p)}`);
  return parts.filter(Boolean).join(", ");
}
export function buildDocumentXml(xml: string, input: FormData) {
  const data = normalizeForm(input);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length)
    throw new Error("O modelo Word está inválido.");
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  const elements = Array.from(body.children);
  const paragraphs = elements.filter((x) => x.localName === "p");
  const txt = (p: Element) =>
    Array.from(p.getElementsByTagNameNS(W, "t"))
      .map((t) => t.textContent || "")
      .join("");
  const el = (tag: string, attrs: Record<string, string> = {}) => {
    const node = doc.createElementNS(W, "w:" + tag);
    for (const [key, value] of Object.entries(attrs))
      node.setAttributeNS(W, "w:" + key, value);
    return node;
  };
  const textRun = (
    text: string,
    bold = false,
    font = "Times New Roman",
    size = "22",
  ) => {
    const r = el("r"),
      pr = el("rPr");
    pr.append(el("rFonts", { ascii: font, hAnsi: font, cs: font }));
    if (bold) pr.append(el("b"));
    pr.append(el("sz", { val: size }));
    r.append(pr);
    const t = el("t");
    t.setAttribute("xml:space", "preserve");
    t.textContent = text;
    r.append(t);
    return r;
  };
  const setParagraph = (
    p: Element,
    segments: { text: string; bold?: boolean }[],
  ) => {
    const pPr = Array.from(p.children)
      .find((x) => x.localName === "pPr")
      ?.cloneNode(true);
    while (p.firstChild) p.removeChild(p.firstChild);
    if (pPr) p.append(pPr);
    for (const segment of segments)
      p.append(textRun(segment.text, segment.bold));
  };
  const donorTerm =
    data.donorCount === 2
      ? data.donor1.gender === "female" && data.donor2.gender === "female"
        ? "DOADORAS"
        : "DOADORES"
      : data.donor1.gender === "female"
        ? "DOADORA"
        : "DOADOR";
  const plural = data.donorCount === 2;
  const female = donorTerm.endsWith("A") || donorTerm.endsWith("AS");
  const article = plural ? (female ? "As" : "Os") : female ? "A" : "O";
  const contraction = plural ? (female ? "das" : "dos") : female ? "da" : "do";
  const receiver =
    data.recipient.gender === "female" ? "DONATÁRIA" : "DONATÁRIO";
  const receiverArticle = data.recipient.gender === "female" ? "A" : "O";
  const receiverTo = data.recipient.gender === "female" ? "à" : "ao";
  const donors = paragraphs.find((p) => txt(p).startsWith("DOADORES:"));
  const recipient = paragraphs.find((p) => txt(p).startsWith("DONATÁRIO:"));
  if (!donors || !recipient)
    throw new Error("O modelo não contém a identificação esperada.");
  setParagraph(donors, [
    { text: donorTerm + ": ", bold: true },
    {
      text:
        qualification(data.donor1) +
        (plural ? "; e " + qualification(data.donor2) : "") +
        ".",
    },
  ]);
  setParagraph(recipient, [
    { text: receiver + ": ", bold: true },
    { text: qualification(data.recipient) + "." },
  ]);
  const c1 = paragraphs.find((p) => txt(p).startsWith("CLÁUSULA 1"));
  const c2 = paragraphs.find((p) => txt(p).startsWith("CLÁUSULA 2"));
  const c3 = paragraphs.find((p) => txt(p).startsWith("CLÁUSULA 3"));
  const owner = plural
    ? female
      ? "proprietárias legítimas"
      : "proprietários legítimos"
    : female
      ? "proprietária legítima"
      : "proprietário legítimo";
  if (c1)
    setParagraph(c1, [
      { text: "CLÁUSULA 1ª", bold: true },
      {
        text: ` - ${article} ${donorTerm} ${plural ? "declaram ser as" : "declara ser a"} ${owner} do imóvel, ${data.land}, matrícula nº ${data.registry}${data.registryOffice ? ", registrada no cartório " + data.registryOffice : ""}, situado na ${locationOf(data)}, com área total de ${data.totalArea} hectares.${data.car ? " CAR: " + data.car + "." : ""}${data.ccir ? " CCIR: " + data.ccir + "." : ""}`,
      },
    ]);
  // Fix article agreement for male and mixed owners, independently of participant count.
  if (c1) {
    const nodes = Array.from(c1.getElementsByTagNameNS(W, "t"));
    for (const node of nodes)
      node.textContent =
        node.textContent
          ?.replace(
            "declaram ser as proprietários",
            "declaram ser os proprietários",
          )
          .replace(
            "declara ser a proprietário",
            "declara ser o proprietário",
          ) || "";
  }
  if (c2)
    setParagraph(c2, [
      { text: "CLÁUSULA 2ª", bold: true },
      {
        text: ` - É de livre e espontânea vontade ${contraction} ${donorTerm}, não existindo vício de vontade de qualquer pessoa, fazer a DOAÇÃO, inter vivos, ${receiverTo} ${receiver}, a título gratuito, sem encargos ou condições impostos, de uma parte do imóvel acima descrito, correspondendo a ${data.donatedArea} hectares. Que passará a se chamar ${data.lot}. Transferindo desde já e irrevogavelmente ${receiverTo} ${receiver} todos os direitos de propriedade e domínio sobre essa fração do imóvel.`,
      },
    ]);
  if (c3)
    setParagraph(c3, [
      { text: "CLÁUSULA 3ª", bold: true },
      {
        text: ` - ${receiverArticle} ${receiver} afirma aceitar esta doação como rezado neste instrumento, para que lhe fique pertencendo o imóvel doado ${plural ? (female ? "pelas" : "pelos") : female ? "pela" : "pelo"} ${donorTerm}, sem qualquer condição.`,
      },
    ]);
  if (data.additionalClause.trim() && c3) {
    const extra = c3.cloneNode(true) as Element;
    setParagraph(extra, [
      { text: "INFORMAÇÕES COMPLEMENTARES: ", bold: true },
      { text: data.additionalClause.trim() },
    ]);
    c3.after(extra);
  }
  const dateP = paragraphs.find((p) => txt(p).includes("{{city}}"));
  if (!dateP) throw new Error("Data não encontrada no modelo.");
  setParagraph(dateP, [
    { text: `${data.city} - ${data.signState}, ${longDate(data.date)}` },
  ]);
  // Remove the old fixed signature area, including the original empty paragraphs
  // and fingerprint table. Rebuild only the active participants as atomic blocks.
  let sibling = dateP.nextElementSibling;
  while (sibling && sibling.localName !== "sectPr") {
    const next = sibling.nextElementSibling;
    sibling.remove();
    sibling = next;
  }
  const sect = Array.from(body.children).find((x) => x.localName === "sectPr")!;
  const makeP = (text: string, center = true, size = "22") => {
    const p = el("p"),
      pr = el("pPr");
    pr.append(
      el("spacing", {
        before: "0",
        after: "65",
        line: "240",
        lineRule: "auto",
      }),
    );
    if (center) pr.append(el("jc", { val: "center" }));
    p.append(pr, textRun(text, false, "Calibri", size));
    return p;
  };
  const pageStart = makeP("");
  pageStart.firstChild!.appendChild(el("pageBreakBefore"));
  const setSpacing = (p: Element, attrs: Record<string, string>) => {
    const props = p.getElementsByTagNameNS(W, "pPr")[0];
    for (const child of Array.from(props.children))
      if (child.localName === "spacing") child.remove();
    props.append(el("spacing", attrs));
  };
  setSpacing(pageStart, { before: "0", after: "0" });
  body.insertBefore(pageStart, sect);
  function fingerprint() {
    const table = el("tbl");
    const pr = el("tblPr");
    pr.append(
      el("tblW", { w: "2000", type: "dxa" }),
      el("jc", { val: "center" }),
      el("tblLayout", { type: "fixed" }),
    );
    const borders = el("tblBorders");
    for (const side of ["top", "left", "bottom", "right"])
      borders.append(el(side, { val: "single", sz: "6", color: "000000" }));
    pr.append(borders);
    table.append(pr);
    const grid = el("tblGrid");
    grid.append(el("gridCol", { w: "2000" }));
    table.append(grid);
    const tr = el("tr"),
      trpr = el("trPr");
    trpr.append(
      el("trHeight", { val: "2000", hRule: "exact" }),
      el("cantSplit"),
    );
    tr.append(trpr);
    const td = el("tc"),
      tdpr = el("tcPr");
    tdpr.append(el("tcW", { w: "2000", type: "dxa" }));
    td.append(tdpr, makeP(""));
    tr.append(td);
    table.append(tr);
    return table;
  }
  for (const who of activePeople(data)) {
    const p = data[who],
      table = el("tbl"),
      pr = el("tblPr");
    pr.append(
      el("tblW", { w: "8504", type: "dxa" }),
      el("jc", { val: "center" }),
    );
    const borders = el("tblBorders");
    for (const side of ["top", "left", "bottom", "right", "insideH", "insideV"])
      borders.append(el(side, { val: "nil" }));
    pr.append(borders);
    table.append(pr);
    const row = el("tr"),
      rowpr = el("trPr");
    rowpr.append(el("cantSplit"));
    row.append(rowpr);
    const cell = el("tc");
    const cellpr = el("tcPr");
    cellpr.append(el("tcW", { w: "8504", type: "dxa" }));
    cell.append(cellpr);
    if (p.signature === "fingerprint") {
      cell.append(fingerprint(), makeP("Impressão digital", true, "18"));
    } else {
      const line = makeP("_______________________________________________");
      const linepr = line.firstChild!;
      setSpacing(line, { before: "360", after: "80" });
      cell.append(line);
    }
    cell.append(
      makeP(p.name.toLocaleUpperCase("pt-BR")),
      makeP("CPF: " + p.cpf),
    );
    if (p.rg) cell.append(makeP("RG: " + p.rg));
    cell.append(
      makeP(
        who === "recipient"
          ? p.gender === "female"
            ? "Donatária"
            : "Donatário"
          : p.gender === "female"
            ? "Doadora"
            : "Doador",
      ),
    );
    row.append(cell);
    table.append(row);
    body.insertBefore(table, sect);
    const gap = makeP("");
    setSpacing(gap, { after: "180" });
    body.insertBefore(gap, sect);
  }
  body.insertBefore(makeP("TESTEMUNHAS", false), sect);
  for (let i = 0; i < 2; i++) {
    body.insertBefore(
      makeP("________________________________________________________", false),
      sect,
    );
    body.insertBefore(
      makeP("Nome:                                      CPF:", false, "20"),
      sect,
    );
  }
  const result = new XMLSerializer().serializeToString(doc);
  if (/\{\{\w+\}\}/.test(result))
    throw new Error("Restaram campos não preenchidos no documento.");
  return result;
}
export async function generateDocx(data: FormData) {
  const response = await fetch(
    `${import.meta.env.BASE_URL}templates/doacao.docx`,
  );
  if (!response.ok)
    throw new Error("Não foi possível abrir o modelo original.");
  const zip = new PizZip(await response.arrayBuffer());
  const xml = zip.file("word/document.xml")?.asText();
  if (!xml) throw new Error("Modelo inválido.");
  zip.file("word/document.xml", buildDocumentXml(xml, data));
  return zip.generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
export async function convertPdf(docx: Blob) {
  const endpoint =
    (import.meta.env.VITE_CONVERTER_URL as string | undefined) ||
    "http://127.0.0.1:8788";
  const form = new FormData();
  form.append("file", docx, "documento.docx");
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/convert`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "O conversor está ocupado. Aguarde e tente novamente."
          : "Não foi possível gerar o PDF. Verifique se o conversor e o Word estão disponíveis.",
      );
    const blob = await response.blob();
    if ((await blob.slice(0, 5).text()) !== "%PDF-")
      throw new Error("O conversor retornou um arquivo inválido.");
    return new Blob([blob], { type: "application/pdf" });
  } catch (error) {
    if (error instanceof TypeError)
      throw new Error(
        "Não foi possível acessar o Word local. Abra ABRIR-SITE.cmd ou INICIAR.cmd e, se o navegador pedir, permita o acesso à rede local.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
