import { canonicalCity } from "./locations";
export type PersonKey = "donor1" | "donor2" | "recipient";
export type SignatureMode = "signature" | "fingerprint";
export type Person = {
  name: string;
  nationality: string;
  marital: string;
  occupation: string;
  rg: string;
  issuer: string;
  issuerState: string;
  cpf: string;
  address: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  complement: string;
  birth: string;
  birthCity: string;
  birthState: string;
  mother: string;
  father: string;
  gender: "male" | "female";
  signature: SignatureMode;
};
export type FormData = {
  donorCount: 1 | 2;
  donor1: Person;
  donor2: Person;
  recipient: Person;
  land: string;
  registry: string;
  registryOffice: string;
  location: string;
  region: string;
  landCity: string;
  landState: string;
  totalArea: string;
  donatedArea: string;
  lot: string;
  city: string;
  signState: string;
  date: string;
  car: string;
  ccir: string;
  additionalClause: string;
};
export const person = (gender: Person["gender"] = "male"): Person => ({
  name: "",
  nationality: "",
  marital: "",
  occupation: "",
  rg: "",
  issuer: "",
  issuerState: "",
  cpf: "",
  address: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state: "",
  postalCode: "",
  complement: "",
  birth: "",
  birthCity: "",
  birthState: "",
  mother: "",
  father: "",
  gender,
  signature: "signature",
});
export const emptyForm = (): FormData => ({
  donorCount: 1,
  donor1: person(),
  donor2: person("female"),
  recipient: person(),
  land: "",
  registry: "",
  registryOffice: "",
  location: "",
  region: "",
  landCity: "",
  landState: "",
  totalArea: "",
  donatedArea: "",
  lot: "",
  city: "",
  signState: "",
  date: new Date().toLocaleDateString("sv-SE"),
  car: "",
  ccir: "",
  additionalClause: "",
});
export const states = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
export const personLabels: Record<PersonKey, string> = {
  donor1: "Doador 1",
  donor2: "Doador 2",
  recipient: "Donatário",
};
export const activePeople = (d: FormData): PersonKey[] =>
  d.donorCount === 1
    ? ["donor1", "recipient"]
    : ["donor1", "donor2", "recipient"];
export function normalizeForm(input: Partial<FormData>): FormData {
  const data = {
    ...emptyForm(),
    ...input,
    donorCount: input.donorCount === 1 ? 1 : 2,
  } as FormData;
  for (const who of ["donor1", "donor2", "recipient"] as const) {
    data[who] = {
      ...person(who === "donor2" ? "female" : "male"),
      ...input[who],
    };
    const p = data[who];
    if (!p.issuerState) {
      const m = p.issuer.match(/^(.+?)[/\s-]+([A-Z]{2})$/i);
      if (m) {
        p.issuer = m[1].trim();
        p.issuerState = m[2].toUpperCase();
      }
    }
    if (p.address && !p.street) {
      const parts = p.address.split(",").map((x) => x.trim());
      p.street = parts.shift() || "";
      const last = parts.at(-1)?.match(/^(.+?)\s*[-/]\s*([A-Z]{2})\.?$/i);
      if (last) {
        p.city = last[1].trim();
        p.state = last[2].toUpperCase();
        parts.pop();
      }
      p.district = parts.join(", ");
    }
  }
  if (data.location && !data.region) {
    const parts = data.location.split(",").map((x) => x.trim());
    const m = parts.at(-1)?.match(/^(.+?)\s*[-/]\s*([A-Z]{2})$/i);
    if (m) {
      data.landCity = m[1].trim();
      data.landState = m[2].toUpperCase();
      parts.pop();
    }
    data.region = parts.join(", ");
  }
  if (!data.signState) {
    const m = data.city.match(/^(.+?)\s*[-/]\s*([A-Z]{2})$/i);
    if (m) {
      data.city = m[1].trim();
      data.signState = m[2].toUpperCase();
    }
  }
  return data;
}
export function addressOf(p: Person) {
  return (
    [
      p.street ? p.street + (p.number ? ", nº " + p.number : "") : "",
      p.complement,
      p.district,
      p.city ? `${p.city}${p.state ? " - " + p.state : ""}` : p.state,
      p.postalCode ? "CEP " + p.postalCode : "",
    ]
      .filter(Boolean)
      .join(", ") || p.address
  );
}
export function locationOf(d: FormData) {
  return (
    [
      d.region,
      d.landCity
        ? `${d.landCity}${d.landState ? " - " + d.landState : ""}`
        : d.landState,
    ]
      .filter(Boolean)
      .join(", ") || d.location
  );
}
export const personFields: [keyof Person, string][] = [
  ["name", "Nome completo"],
  ["cpf", "CPF"],
  ["rg", "RG"],
  ["issuer", "Órgão expedidor"],
  ["issuerState", "UF do RG"],
  ["birth", "Data de nascimento"],
  ["nationality", "Nacionalidade"],
  ["marital", "Estado civil"],
  ["occupation", "Profissão"],
  ["street", "Rua, fazenda ou localidade"],
  ["number", "Número"],
  ["district", "Bairro ou região"],
  ["city", "Município"],
  ["state", "UF do endereço"],
  ["postalCode", "CEP"],
  ["complement", "Complemento"],
  ["birthCity", "Município de nascimento"],
  ["birthState", "UF de nascimento"],
  ["mother", "Nome da mãe"],
  ["father", "Nome do pai"],
];
export const landFields: [keyof FormData, string][] = [
  ["land", "Nome da terra"],
  ["registry", "Matrícula"],
  ["region", "Região do imóvel"],
  ["landCity", "Município do imóvel"],
  ["landState", "UF do imóvel"],
  ["totalArea", "Área total (hectares)"],
  ["donatedArea", "Área doada (hectares)"],
  ["lot", "Nome do lote doado"],
  ["city", "Cidade da assinatura"],
  ["signState", "UF da assinatura"],
  ["date", "Data do contrato"],
  ["registryOffice", "Cartório de registro"],
  ["car", "CAR"],
  ["ccir", "CCIR"],
  ["additionalClause", "Informações complementares"],
];
export function validCPF(value: string) {
  const s = value.replace(/\D/g, "");
  if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
  return [9, 10].every((n) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Number(s[i]) * (n + 1 - i);
    return ((sum * 10) % 11) % 10 === Number(s[n]);
  });
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return !isNaN(+date) && date.toISOString().slice(0, 10) === value;
}
export function dateInput(value: string) {
  if (validDate(value)) return value;
  const m = value.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\b/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : "";
}
export function formatCPF(v: string) {
  const s = v.replace(/\D/g, "").slice(0, 11);
  return s
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3}\.\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3}\.\d{3}\.\d{3})(\d)/, "$1-$2");
}
export function validate(data: FormData) {
  const errors: string[] = [];
  for (const key of activePeople(data)) {
    const p = data[key];
    for (const [field, label] of [
      ["name", "Nome completo"],
      ["cpf", "CPF"],
    ] as const)
      if (!p[field]?.trim()) errors.push(`${personLabels[key]}: ${label}`);
    if (p.cpf && !validCPF(p.cpf))
      errors.push(`${personLabels[key]}: CPF inválido`);
    for (const [city, state, label] of [
      [p.city, p.state, "endereço"],
      [p.birthCity, p.birthState, "nascimento"],
    ])
      if (city && state && !canonicalCity(city, state))
        errors.push(`${personLabels[key]}: confira município e UF de ${label}`);
    if (
      p.birth &&
      (!validDate(p.birth) || p.birth > new Date().toLocaleDateString("sv-SE"))
    )
      errors.push(`${personLabels[key]}: data de nascimento inválida`);
  }
  for (const [key, label] of [
    ["land", "Nome da terra"],
    ["registry", "Matrícula"],
    ["totalArea", "Área total"],
    ["donatedArea", "Área doada"],
    ["lot", "Nome do lote"],
    ["city", "Cidade da assinatura"],
    ["signState", "UF da assinatura"],
    ["date", "Data do contrato"],
  ] as const)
    if (!data[key]?.trim()) errors.push(label);
  if (!locationOf(data)) errors.push("Localização do imóvel");
  if (
    data.landCity &&
    data.landState &&
    !canonicalCity(data.landCity, data.landState)
  )
    errors.push("Município do imóvel não pertence à UF selecionada");
  if (data.city && data.signState && !canonicalCity(data.city, data.signState))
    errors.push("Cidade da assinatura não pertence à UF selecionada");
  const total = Number(data.totalArea.replace(",", ".")),
    part = Number(data.donatedArea.replace(",", "."));
  if (!(total > 0 && part > 0 && part <= total))
    errors.push(
      "A área doada precisa ser maior que zero e não pode superar a área total.",
    );
  if (!validDate(data.date)) errors.push("Data do contrato inválida");
  return errors;
}
export function filename(name: string, ext: string) {
  return (
    (name
      .normalize("NFC")
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
      .replace(/\.+$/, "")
      .trim()
      .slice(0, 120) || "Documento") +
    "." +
    ext
  );
}
