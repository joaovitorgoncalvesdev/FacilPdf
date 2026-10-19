import {
  dateInput,
  formatCPF,
  validCPF,
  validDate,
  states,
  type PersonKey,
} from "./model";
export type Finding = {
  id: string;
  label: string;
  field: string;
  value: string;
  selected: boolean;
  group: string;
  confidence: number;
  warning?: string;
  source?: string;
  context: string;
  suggestedTarget?: PersonKey;
};
const labels: Record<string, string> = {
  name: "Nome completo",
  cpf: "CPF",
  rg: "RG",
  issuer: "Órgão expedidor",
  issuerState: "UF do RG",
  birth: "Data de nascimento",
  birthCity: "Município de nascimento",
  birthState: "UF de nascimento",
  mother: "Nome da mãe",
  father: "Nome do pai",
  nationality: "Nacionalidade",
  marital: "Estado civil",
  occupation: "Profissão",
  address: "Endereço",
  street: "Rua ou localidade",
  number: "Número",
  district: "Bairro ou região",
  city: "Município",
  state: "UF do endereço",
  postalCode: "CEP",
  complement: "Complemento",
  land: "Nome da terra",
  registry: "Matrícula",
  registryOffice: "Cartório",
  totalArea: "Área total (ha)",
  donatedArea: "Área doada (ha)",
  lot: "Nome do lote",
  region: "Região do imóvel",
  landCity: "Município do imóvel",
  landState: "UF do imóvel",
  car: "CAR",
  ccir: "CCIR",
  signState: "UF da assinatura",
  date: "Data do contrato",
};
const propertyFields = new Set([
  "land",
  "registry",
  "registryOffice",
  "totalArea",
  "donatedArea",
  "lot",
  "region",
  "landCity",
  "landState",
  "car",
  "ccir",
]);
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const stopLabels =
  /\b(?:CPF|R\.?\s*G\.?|REGISTRO GERAL|DOC(?:UMENTO)?[. ]+IDENTIDADE|NOME(?: COMPLETO| E SOBRENOME)?|DATA(?: DE| E LOCAL DE)? NASCIMENTO|NASCIMENTO|NATURALIDADE|FILIA[ÇC][ÃA]O|M[ÃA]E|PAI|NACIONALIDADE|ESTADO CIVIL|PROFISS[ÃA]O|ENDERE[ÇC]O|CEP|EXPEDI[ÇC][ÃA]O|VALIDADE|CATEGORIA|PERMISS[ÃA]O|HABILITA[ÇC][ÃA]O|ASSINATURA|OBSERVA[ÇC][ÕO]ES)\b/i;
function cleanName(value: string) {
  return value
    .replace(/^\s*(?:\d+[a-z]?[.\-/]?\s*)+/i, "")
    .replace(/[\[\]{}<>_=]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[.,;:\s-]+$/, "")
    .trim();
}
function isName(value: string) {
  const name = cleanName(value);
  return (
    name.length >= 5 &&
    name.length <= 100 &&
    /^[\p{L}'’ -]+$/u.test(name) &&
    name.split(/\s+/).length >= 2 &&
    !/\b(?:NOME|SOBRENOME|REPUBLICA|FEDERATIVA|BRASIL|ESTADO|SECRETARIA|CARTEIRA|IDENTIDADE|DOCUMENTO|FILIA[ÇC][ÃA]O|NASCIMENTO|VALIDADE|DOADORES|DONATARIO|TERRA|IMOVEL|ORGAO|EXPEDIDOR|REGISTRO|GERAL)\b/i.test(
      fold(name).toUpperCase(),
    )
  );
}
function labeledValue(text: string, re: RegExp) {
  const values: { value: string; index: number }[] = [];
  for (const m of text.matchAll(re)) {
    let tail = text.slice(m.index! + m[0].length);
    tail = tail.replace(/^[\s:º°=.-]+/, "");
    const lines = tail
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const first = lines[0] || "";
    const stop = first.search(stopLabels);
    const value = (stop > 0 ? first.slice(0, stop) : first)
      .replace(/\s*\d[a-z]\s*[-/]\s*$/, "")
      .trim();
    if (value && stop !== 0) values.push({ value, index: m.index! });
  }
  return values;
}
export function extract(input: string, source?: string): Finding[] {
  const text = input
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\t]/g, " ")
    .replace(/[：]/g, ":")
    .replace(/[‐‑–—]/g, "-")
    .replace(/\bC[ .]*P[ .]*F\b/gi, "CPF")
    .replace(/\bR[ .]*G\b/gi, "RG");
  const anchors: { index: number; name: string }[] = [];
  for (const m of text.matchAll(
    /(?:^|\n|:\s*|;\s*(?:e\s+)?|\be\s+)([\p{Lu}][\p{L}'’ -]{4,100}),\s*(?:(?:brasileir[oa]|estrangeir[oa]|portugu[eê]s[a]?)[,\s]|(?=CPF\s*:|portador[ae]?\b|nascid[oa]\b))/gu,
  )) {
    if (isName(m[1]))
      anchors.push({
        index: m.index! + m[0].indexOf(m[1]),
        name: cleanName(m[1]),
      });
  }
  for (const x of labeledValue(
    text,
    /(?:^|\n)\s*(?:\d+[a-z]?\s*[-./]?\s*)?(?:NOME(?:\s+COMPLETO|\s+E\s+SOBRENOME)?|NOME\s+DO\s+(?:TITULAR|PORTADOR)|NOME\s+CIVIL|DONAT[ÁA]RIO|DOADOR(?:A)?)\s*(?=[:\n-]|$)[: -]*/gim,
  )) {
    if (isName(x.value))
      anchors.push({
        index: Math.max(x.index, text.indexOf(cleanName(x.value), x.index)),
        name: cleanName(x.value),
      });
  }
  // Unlabelled name line in a Brazilian identity card, excluding issuer/header lines.
  if (!anchors.length) {
    const lines = text.split("\n");
    let pos = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (
        isName(line) &&
        line === line.toUpperCase() &&
        /CPF|RG|NASC|FILIA|DOC.*IDENT/i.test(
          lines.slice(Math.max(0, i - 2), i + 5).join(" "),
        )
      ) {
        anchors.push({ index: pos, name: line });
        break;
      }
      pos += lines[i].length + 1;
    }
  }
  anchors.sort((a, b) => a.index - b.index);
  const unique = anchors.filter(
    (a, i) => !anchors.slice(0, i).some((b) => fold(b.name) === fold(a.name)),
  );
  const roleMarkers = [
    ...text.matchAll(
      /\b(DOADORES|DOADORAS|DOADOR|DOADORA|DONATÁRIOS|DONATÁRIAS|DONATÁRIO|DONATÁRIA)\s*:/gi,
    ),
  ];
  const roles: Record<string, PersonKey> = {};
  unique.forEach((anchor, i) => {
    const marker = roleMarkers.filter((m) => m.index! <= anchor.index).at(-1);
    if (!marker) return;
    const role = fold(marker[1]);
    if (role.startsWith("donat")) {
      const index = unique.filter(
        (a) => a.index >= marker.index! && a.index <= anchor.index,
      ).length;
      roles[`person-${i + 1}`] =
        index === 1 ? "recipient" : `recipient${Math.min(index, 10)}`;
    } else {
      const index = unique.filter(
        (a) => a.index >= marker.index! && a.index <= anchor.index,
      ).length;
      roles[`person-${i + 1}`] = index === 1 ? "donor1" : "donor2";
    }
  });
  // Repeated standalone names in signature blocks point back to the same person.
  // Without these markers, the last identified person inherits everyone's RG/CPF.
  const markers = anchors.map((anchor) => ({
    index: anchor.index,
    group: unique.findIndex((u) => fold(u.name) === fold(anchor.name)) + 1,
  }));
  unique.forEach((anchor, index) => {
    const name = anchor.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const match of text.matchAll(
      new RegExp("(?:^|\\n)[ \\t]*" + name + "[ \\t]*(?=\\n|$)", "gi"),
    ))
      markers.push({ index: match.index!, group: index + 1 });
  });
  markers.sort((a, b) => a.index - b.index);
  const groupAt = (index: number) => {
    if (!unique.length) return "person-1";
    return `person-${markers.filter((marker) => index >= marker.index).at(-1)?.group || 1}`;
  };
  const result: Finding[] = [];
  const add = (
    field: string,
    value: string,
    index: number,
    confidence = 90,
    warning?: string,
    group?: string,
  ) => {
    const v = value
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[;,\s]+$/, "");
    if (!v) return;
    const g =
      group || (propertyFields.has(field) ? "property" : groupAt(index));
    const duplicate = result.find(
      (r) => r.group === g && r.field === field && fold(r.value) === fold(v),
    );
    if (duplicate) {
      if (confidence > duplicate.confidence) {
        duplicate.confidence = confidence;
        duplicate.warning = warning;
      }
      return;
    }
    result.push({
      id: `finding-${result.length}`,
      label: labels[field] || field,
      field,
      value: v,
      group: g,
      confidence,
      warning,
      selected: !warning,
      source,
      context: text
        .slice(Math.max(0, index - 35), Math.min(text.length, index + 130))
        .replace(/\s+/g, " "),
      suggestedTarget: roles[g],
    });
  };
  unique.forEach((a, i) =>
    add("name", a.name, a.index, 95, undefined, `person-${i + 1}`),
  );
  // Correct only visual OCR confusions inside a candidate with an explicit CPF label.
  const cpfToken = /[0-9OolI|SBZG][0-9OolI|SBZG .-]{8,24}[0-9OolI|SBZG]/g;
  for (const m of text.matchAll(
    /\bCPF\s*(?:n[º°o.]*)?\s*[: -]?\s*([^\n]{0,55})/gi,
  )) {
    const token = m[1].match(cpfToken)?.[0];
    if (!token) continue;
    const compact = token.replace(/[.\s-]/g, "");
    const replacements: Record<string, string> = {
      O: "0",
      o: "0",
      l: "1",
      I: "1",
      "|": "1",
      S: "5",
      B: "8",
      Z: "2",
      G: "6",
    };
    const corrected = compact.replace(/[OolI|SBZG]/g, (c) => replacements[c]);
    if (corrected.length === 11) {
      const changed = corrected !== compact;
      add(
        "cpf",
        formatCPF(corrected),
        m.index!,
        validCPF(corrected) ? (changed ? 84 : 99) : 30,
        !validCPF(corrected)
          ? "Dígitos verificadores inválidos. Confira no documento."
          : changed
            ? "Caracteres do OCR corrigidos; confira o CPF."
            : undefined,
      );
    }
  }
  for (const m of text.matchAll(
    /(?<!\d)\d{3}[. ]?\d{3}[. ]?\d{3}[- ]?\d{2}(?!\d)/g,
  )) {
    const value = m[0].replace(/\D/g, "");
    if (validCPF(value)) add("cpf", formatCPF(value), m.index!, 98);
    else if (/[.-]/.test(m[0]))
      add(
        "cpf",
        formatCPF(value),
        m.index!,
        25,
        "CPF não validado. Confira os números.",
      );
  }
  const specs: [string, RegExp, number][] = [
    [
      "rg",
      /(?:\bRG|REGISTRO\s+GERAL|DOC(?:UMENTO)?\.?\s*(?:DE\s+)?IDENTIDADE)(?:\s*\/\s*[ÓO]RG\.?\s*EMISSOR\s*\/\s*UF)?\s*(?:N[º°o.]*)?\s*[: -]?\s*((?:\d[. -]?){5,12}[\dXx]?)/gi,
      94,
    ],
    [
      "birth",
      /(?:DATA\s*(?:DE|E\s+LOCAL\s+DE)?\s*NASCIMENTO|NASCIMENTO|NASC\.?|NASCID[OA]\s+EM)\s*[: -]?\s*(\d{1,2}\s*[/.\-]\s*\d{1,2}\s*[/.\-]\s*\d{4})/gi,
      96,
    ],
    [
      "mother",
      /(?:NOME\s+DA\s+M[ÃA]E|M[ÃA]E)\s*[: -]?\s*([^\n,;]{5,100})/gi,
      92,
    ],
    ["father", /(?:NOME\s+DO\s+PAI|PAI)\s*[: -]?\s*([^\n,;]{5,100})/gi, 92],
    ["nationality", /\bNACIONALIDADE\s*[: -]?\s*([^\n,;]{3,35})/gi, 92],
    [
      "marital",
      /\bESTADO\s+CIVIL\s*[: -]?\s*(solteir[oa]|casad[oa]|divorciad[oa]|vi[uú]v[oa]|separad[oa]|uni[ãa]o est[áa]vel)/gi,
      94,
    ],
    ["occupation", /\bPROFISS[ÃA]O\s*[: -]?\s*([^\n,;]{3,65})/gi, 92],
    ["postalCode", /\bCEP\s*[: -]?\s*(\d{5}[- .]?\d{3})/gi, 95],
    ["street", /(?:LOGRADOURO|RUA|ENDERE[ÇC]O)\s*:\s*([^\n;]{3,160})/gi, 90],
    ["number", /\bN[ÚU]MERO\s*:\s*(\d+[A-Z]?|S\/?N)\b/gi, 94],
    ["district", /\b(?:BAIRRO|DISTRITO)\s*:\s*([^\n,;]{3,70})/gi, 92],
    ["city", /\b(?:MUNIC[ÍI]PIO|CIDADE)\s*:\s*([^\n,;/-]{3,70})/gi, 88],
    ["state", /\bUF\s*(?:DO\s+ENDERE[ÇC]O)?\s*:\s*([A-Z]{2})\b/gi, 90],
    [
      "land",
      /(?:NOME\s+(?:DA\s+TERRA|DO\s+IM[ÓO]VEL)|DENOMINA[ÇC][ÃA]O\s+(?:DO\s+IM[ÓO]VEL)?|IM[ÓO]VEL(?:\s+RURAL)?)\s*[:,]\s*([^\n,;]{3,90})/gi,
      93,
    ],
    [
      "registry",
      /\bMATR[ÍI]CULA\s*(?:N[º°o.]*)?\s*[: -]?\s*([\d][\d.\/-]*)/gi,
      96,
    ],
    [
      "registryOffice",
      /\bCART[ÓO]RIO(?:\s+DE\s+REGISTRO\s+DE\s+IM[ÓO]VEIS)?\s*:\s*([^\n;]{3,100})/gi,
      93,
    ],
    ["region", /\bREGI[ÃA]O\s*:\s*([^\n,;]{3,70})/gi, 90],
    [
      "totalArea",
      /[ÁA]REA\s+TOTAL\s*(?:DE|:)?\s*([\d.,]+)\s*(?:HECTARES|HA)\b/gi,
      97,
    ],
    [
      "donatedArea",
      /(?:CORRESPONDENDO\s+[ÀA]|[ÁA]REA\s+DOADA\s*:?)\s*([\d.,]+)\s*(?:HECTARES|HA)\b/gi,
      97,
    ],
    ["lot", /(?:CHAMAR|NOME\s+DO\s+LOTE\s*:)\s*([^\n.;]{3,100})/gi, 92],
    [
      "car",
      /\bCAR\s*(?:N[º°o.]*)?\s*[: -]?\s*([A-Z]{2}[- .]?\d[\dA-F. -]{15,65})/gi,
      90,
    ],
    ["ccir", /\bCCIR\s*(?:N[º°o.]*)?\s*[: -]?\s*([\d. -]{6,25})/gi, 92],
    ["address", /\bresidente(?:s)?\s+(?:em|[àa])\s+([^\n;]{5,180})/gi, 90],
  ];
  for (const [field, re, confidence] of specs)
    for (const m of text.matchAll(re)) {
      let value = m[1].trim();
      let warning: string | undefined;
      if (field === "birth") {
        value = value.replace(/\s/g, "");
        const date = dateInput(value);
        if (!validDate(date) || date > new Date().toLocaleDateString("sv-SE"))
          warning = "Data de nascimento inválida; confira dia, mês e ano.";
      }
      if (field === "rg") {
        value = value.trim().replace(/\s/g, "");
        const digits = value.replace(/\D/g, "");
        if (digits.length === 11 && validCPF(digits)) continue;
        if (value.length < 5) continue;
      }
      if (["mother", "father"].includes(field)) {
        const stop = value.search(stopLabels);
        if (stop > 0) value = value.slice(0, stop).trim();
        if (!isName(value)) continue;
      }
      if (
        field === "land" &&
        /^(?:acima|abaixo|doado|descrit[oa]|situad[oa])/i.test(value)
      )
        continue;
      add(field, value, m.index!, warning ? 25 : confidence, warning);
    }
  for (const m of text.matchAll(
    /\b(SSP|SSPDS|SSDS|SDS|SESP|PC|DIC|DETRAN|IFP|ITEP|IGP|SPTC|DGPC)\s*[/. -]?\s*([A-Z]{2})\b/gi,
  )) {
    if (!states.includes(m[2].toUpperCase())) continue;
    add("issuer", m[1].toUpperCase(), m.index!, 96);
    add("issuerState", m[2].toUpperCase(), m.index!, 96);
  }
  const months: Record<string, string> = {
    janeiro: "01",
    fevereiro: "02",
    marco: "03",
    abril: "04",
    maio: "05",
    junho: "06",
    julho: "07",
    agosto: "08",
    setembro: "09",
    outubro: "10",
    novembro: "11",
    dezembro: "12",
  };
  for (const m of text.matchAll(
    /(?:NASCIMENTO|NASCID[OA]\s+EM)\s*[: -]?\s*(\d{1,2})\s+de\s+([\p{L}]+)\s+de\s+(\d{4})/giu,
  )) {
    const month = months[fold(m[2])];
    if (!month) continue;
    const value = `${m[1].padStart(2, "0")}/${month}/${m[3]}`;
    add(
      "birth",
      value,
      m.index!,
      validDate(dateInput(value)) ? 96 : 20,
      validDate(dateInput(value)) ? undefined : "Data de nascimento inválida.",
    );
  }
  for (const m of text.matchAll(
    /(?:^|\n)\s*([\p{L} .'-]{3,70})\s*[-/]\s*([A-Z]{2}),\s*(\d{1,2})\s+de\s+([\p{L}]+)\s+de\s+(\d{4})/giu,
  )) {
    const month = months[fold(m[4])];
    if (!month || !states.includes(m[2].toUpperCase())) continue;
    const date = `${m[5]}-${month}-${m[3].padStart(2, "0")}`;
    add("city", m[1].trim(), m.index!, 94, undefined, "property");
    add("signState", m[2].toUpperCase(), m.index!, 96, undefined, "property");
    add(
      "date",
      date,
      m.index!,
      validDate(date) ? 96 : 20,
      validDate(date) ? undefined : "Data inválida.",
      "property",
    );
  }
  for (const m of text.matchAll(
    /situad[oa]\s+(?:na|em)\s+([^\n]+?),\s*com\s+[áa]rea/gi,
  )) {
    const parts = m[1].split(",").map((x) => x.trim());
    const last = parts.at(-1)?.match(/^(.+?)\s*[-/]\s*([A-Z]{2})$/i);
    if (last) {
      add("landCity", last[1], m.index!, 93);
      add("landState", last[2].toUpperCase(), m.index!, 95);
      parts.pop();
    }
    if (parts.length) add("region", parts.join(", "), m.index!, 92);
  }
  // Qualifications in a contract do not usually repeat field labels.
  for (const a of unique) {
    const tail = text.slice(
      a.index + a.name.length,
      a.index + a.name.length + 240,
    );
    const m = tail.match(
      /^,\s*([^,]+),\s*(solteir[oa]|casad[oa]|divorciad[oa]|vi[uú]v[oa]|separad[oa]),\s*([^,]+),/i,
    );
    if (m) {
      add("nationality", m[1], a.index, 95);
      add("marital", m[2], a.index, 95);
      add("occupation", m[3], a.index, 95);
    }
  }
  for (const x of labeledValue(
    text,
    /\b(?:NATURALIDADE|MUNIC[ÍI]PIO\s+DE\s+NASCIMENTO)\s*[: -]*/gi,
  )) {
    const m = x.value.match(/^(.+?)\s*[-/]\s*([A-Z]{2})\b/);
    add("birthCity", m ? m[1] : x.value, x.index, 90);
    if (m) add("birthState", m[2].toUpperCase(), x.index, 94);
  }
  // In identity cards, filiação consists of two name lines; parent order is not guaranteed.
  for (const m of text.matchAll(
    /\bFILIA[ÇC][ÃA]O\s*[: -]?\s*([^\n]+)\n([^\n]+)/gi,
  )) {
    for (const [field, value] of [
      ["mother", m[1]],
      ["father", m[2]],
    ])
      if (
        isName(value) &&
        !result.some((r) => r.group === groupAt(m.index!) && r.field === field)
      )
        add(
          field,
          cleanName(value),
          m.index!,
          55,
          "Filiação sem rótulo individual. Confirme se este nome é da mãe ou do pai.",
        );
  }
  // Choose one best candidate per field per person. Conflicts remain visible.
  const buckets = new Map<string, Finding[]>();
  for (const item of result) {
    const key = item.group + ":" + item.field;
    buckets.set(key, [...(buckets.get(key) || []), item]);
  }
  for (const items of buckets.values()) {
    items.sort((a, b) => b.confidence - a.confidence);
    items.forEach((item, i) => {
      item.selected = i === 0 && !item.warning;
      if (i > 0) {
        item.selected = false;
        item.warning =
          item.warning || "Outro valor encontrado para este campo.";
      }
    });
  }
  return result;
}
export function mergeFindings(
  previous: Finding[],
  next: Finding[],
  samePerson = false,
  sameImage = false,
): Finding[] {
  const result = previous.map((x) => ({ ...x }));
  const groups = [
    ...new Set(
      previous.filter((x) => x.group !== "property").map((x) => x.group),
    ),
  ];
  const incoming = [
    ...new Set(next.filter((x) => x.group !== "property").map((x) => x.group)),
  ];
  const map = new Map<string, string>();
  for (const group of incoming) {
    const name = next.find(
      (x) => x.group === group && x.field === "name",
    )?.value;
    const cpf = next.find(
      (x) => x.group === group && x.field === "cpf" && !x.warning,
    )?.value;
    const match =
      previous.find(
        (x) =>
          x.group !== "property" && x.field === "cpf" && cpf && x.value === cpf,
      ) ||
      previous.find((x) => {
        if (
          x.group === "property" ||
          x.field !== "name" ||
          !name ||
          fold(x.value) !== fold(name)
        )
          return false;
        const existing = previous.find(
          (item) =>
            item.group === x.group && item.field === "cpf" && !item.warning,
        )?.value;
        return !cpf || !existing || cpf === existing;
      });
    const existingName = previous.find(
      (x) => x.group === groups[0] && x.field === "name",
    )?.value;
    const existingCPF = previous.find(
      (x) => x.group === groups[0] && x.field === "cpf" && !x.warning,
    )?.value;
    const conflicts = Boolean(
      (name && existingName && fold(name) !== fold(existingName)) ||
      (cpf && existingCPF && cpf !== existingCPF),
    );
    map.set(
      group,
      match?.group ||
        (samePerson &&
        incoming.length === 1 &&
        groups.length === 1 &&
        (!conflicts || sameImage)
          ? groups[0]
          : `person-${groups.length + map.size + 1}`),
    );
  }
  for (const item of next) {
    const group = map.get(item.group) || item.group;
    const old = result.find(
      (x) =>
        x.group === group &&
        x.field === item.field &&
        fold(x.value) === fold(item.value),
    );
    if (old) {
      old.source = [...new Set([old.source, item.source].filter(Boolean))].join(
        " • ",
      );
      continue;
    }
    const conflict = result.some(
      (x) => x.group === group && x.field === item.field && x.selected,
    );
    result.push({
      ...item,
      id: crypto.randomUUID(),
      group,
      selected: conflict ? false : item.selected,
      warning: conflict
        ? "Valor diferente do arquivo anterior; escolha qual usar."
        : item.warning,
    });
  }
  return result;
}
