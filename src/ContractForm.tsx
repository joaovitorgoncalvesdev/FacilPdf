import LocationFields from "./LocationFields";
import { useId } from "react";
import { TextField, Button } from "@radix-ui/themes";
import {
  formatCPF,
  validCPF,
  states,
  type Person,
  type FormData,
  type PersonKey,
} from "./model";
type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  wide?: boolean;
  type?: "text" | "date" | "number";
  placeholder?: string;
  options?: string[];
  suggestions?: string[];
  hint?: string;
};
export function Field({
  label,
  value,
  onChange,
  required = false,
  wide = false,
  type = "text",
  placeholder,
  options,
  suggestions,
  hint,
}: FieldProps) {
  const id = useId();
  return (
    <label className={wide ? "wide" : ""}>
      <span className="field-title">
        {label}
        {required && <span aria-label="obrigatório"> *</span>}
      </span>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Selecione</option>
          {options.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      ) : (
        <TextField.Root
          type={type}
          value={value}
          placeholder={placeholder}
          maxLength={label === "CPF" ? 14 : 300}
          inputMode={
            label === "CPF" || label === "CEP"
              ? "numeric"
              : label.includes("hectares")
                ? "decimal"
                : undefined
          }
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          list={suggestions ? id : undefined}
        />
      )}
      {suggestions && (
        <datalist id={id}>
          {suggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function PersonEditor({
  person,
  onChange,
  who,
  copyAddress,
  addressSources = [],
}: {
  person: Person;
  onChange: (person: Person) => void;
  who: PersonKey;
  copyAddress?: () => void;
  addressSources?: { key: PersonKey; label: string; person: Person }[];
}) {
  const set = (key: keyof Person, value: string) =>
    onChange({
      ...person,
      [key]: value,
      ...([
        "street",
        "number",
        "district",
        "city",
        "state",
        "postalCode",
        "complement",
      ].includes(key)
        ? { address: "" }
        : {}),
    });
  const cpfBad =
    person.cpf.replace(/\D/g, "").length === 11 && !validCPF(person.cpf);
  return (
    <div className="person-editor">
      <div className="form-group">
        <h4>Identificação</h4>
        <p>
          Nome e CPF são obrigatórios. Os demais dados entram no contrato quando
          preenchidos.
        </p>
        <div className="field-grid">
          <Field
            label="Nome completo"
            value={person.name}
            onChange={(v) => set("name", v)}
            wide
            required
            placeholder="Nome conforme o documento"
          />
          <Field
            label="CPF"
            value={person.cpf}
            onChange={(v) => set("cpf", formatCPF(v))}
            required
            hint={cpfBad ? "CPF inválido. Confira os números." : undefined}
          />
          <Field
            label="Data de nascimento"
            value={person.birth}
            onChange={(v) => set("birth", v)}
            type="date"
          />
          <Field
            label="Número do RG"
            value={person.rg}
            onChange={(v) => set("rg", v)}
            placeholder="Somente o número"
          />
          <Field
            label="Órgão expedidor"
            value={person.issuer}
            onChange={(v) => set("issuer", v)}
            suggestions={[
              "SSP",
              "SSPDS",
              "SDS",
              "SESP",
              "DETRAN",
              "PC",
              "DIC",
              "IGP",
              "ITEP",
              "SPTC",
            ]}
          />
          <Field
            label="UF do RG"
            value={person.issuerState}
            onChange={(v) => set("issuerState", v)}
            options={states}
          />
          <label>
            <span className="field-title">Tratamento no contrato</span>
            <select
              value={person.gender}
              onChange={(e) => set("gender", e.target.value)}
            >
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>
          </label>
        </div>
      </div>
      <div className="form-group">
        <h4>Como esta pessoa vai assinar?</h4>
        <fieldset className="signature-options">
          <legend className="sr-only">Forma de assinatura</legend>
          <label className={person.signature === "signature" ? "chosen" : ""}>
            <input
              type="radio"
              name={`${who}-signature`}
              value="signature"
              checked={person.signature === "signature"}
              onChange={() => set("signature", "signature")}
            />
            <span>
              <strong>Assinatura à mão</strong>
              <small>Linha com os dados abaixo</small>
            </span>
            <span className="signature-mini" aria-hidden="true" />
          </label>
          <label className={person.signature === "fingerprint" ? "chosen" : ""}>
            <input
              type="radio"
              name={`${who}-signature`}
              value="fingerprint"
              checked={person.signature === "fingerprint"}
              onChange={() => set("signature", "fingerprint")}
            />
            <span>
              <strong>Impressão digital</strong>
              <small>Quadrado para carimbar o dedo</small>
            </span>
            <span className="fingerprint-mini" aria-hidden="true" />
          </label>
        </fieldset>
      </div>
      <details className="form-details">
        <summary>
          Qualificação e filiação <span>opcional</span>
        </summary>
        <div className="field-grid">
          <Field
            label="Nacionalidade"
            value={person.nationality}
            onChange={(v) => set("nationality", v)}
            suggestions={
              person.gender === "female"
                ? [
                    "brasileira",
                    "portuguesa",
                    "argentina",
                    "boliviana",
                    "paraguaia",
                  ]
                : [
                    "brasileiro",
                    "português",
                    "argentino",
                    "boliviano",
                    "paraguaio",
                  ]
            }
          />
          <Field
            label="Estado civil"
            value={person.marital}
            onChange={(v) => set("marital", v)}
            options={
              person.gender === "female"
                ? [
                    "solteira",
                    "casada",
                    "divorciada",
                    "viúva",
                    "separada",
                    "união estável",
                  ]
                : [
                    "solteiro",
                    "casado",
                    "divorciado",
                    "viúvo",
                    "separado",
                    "união estável",
                  ]
            }
          />
          <Field
            label="Profissão"
            suggestions={
              person.gender === "female"
                ? [
                    "lavradora",
                    "agricultora",
                    "comerciante",
                    "aposentada",
                    "autônoma",
                    "servidora pública",
                  ]
                : [
                    "lavrador",
                    "agricultor",
                    "comerciante",
                    "aposentado",
                    "autônomo",
                    "servidor público",
                  ]
            }
            value={person.occupation}
            onChange={(v) => set("occupation", v)}
            wide
          />
          <LocationFields
            state={person.birthState}
            city={person.birthCity}
            cityLabel="Município de nascimento"
            stateLabel="UF de nascimento"
            onChange={({ state, city }) =>
              onChange({
                ...person,
                birthState: state,
                birthCity: city,
                address: person.address,
              })
            }
          />
          <Field
            label="Nome da mãe"
            value={person.mother}
            onChange={(v) => set("mother", v)}
            wide
          />
          <Field
            label="Nome do pai"
            value={person.father}
            onChange={(v) => set("father", v)}
            wide
          />
        </div>
      </details>
      <details className="form-details">
        <summary>
          Endereço <span>opcional</span>
        </summary>
        {addressSources.length > 0 ? (
          <label className="reuse-person">
            <span>Copiar endereço de outra pessoa</span>
            <select
              value=""
              onChange={(event) => {
                const source = addressSources.find(
                  (item) => item.key === event.target.value,
                )?.person;
                if (!source) return;
                const next = { ...person };
                for (const key of [
                  "address",
                  "street",
                  "number",
                  "district",
                  "city",
                  "state",
                  "postalCode",
                  "complement",
                ] as const)
                  next[key] = source[key];
                onChange(next);
              }}
            >
              <option value="">Escolha de quem copiar</option>
              {addressSources.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                  {item.person.name ? ` · ${item.person.name}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          copyAddress && (
            <Button variant="soft" size="1" onClick={copyAddress}>
              Usar endereço do doador 1
            </Button>
          )
        )}
        <div className="field-grid">
          <Field
            label="Rua, fazenda ou localidade"
            value={person.street}
            onChange={(v) => set("street", v)}
            wide
          />
          <Field
            label="Número"
            value={person.number}
            onChange={(v) => set("number", v)}
            placeholder="Ex.: 25 ou S/N"
          />
          <Field
            label="CEP"
            value={person.postalCode}
            onChange={(v) =>
              set(
                "postalCode",
                v
                  .replace(/\D/g, "")
                  .slice(0, 8)
                  .replace(/^(\d{5})(\d)/, "$1-$2"),
              )
            }
            placeholder="00000-000"
          />
          <Field
            label="Bairro ou região"
            value={person.district}
            onChange={(v) => set("district", v)}
            wide
          />
          <LocationFields
            state={person.state}
            city={person.city}
            cityLabel="Município do endereço"
            stateLabel="UF do endereço"
            onChange={({ state, city }) =>
              onChange({ ...person, state: state, city: city, address: "" })
            }
          />
          <Field
            label="Complemento"
            value={person.complement}
            onChange={(v) => set("complement", v)}
            wide
          />
        </div>
      </details>
    </div>
  );
}
export function PropertyEditor({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (data: FormData) => void;
}) {
  const set = (key: keyof FormData, value: string) =>
    onChange({
      ...data,
      [key]: value,
      ...(["region", "landCity", "landState"].includes(key)
        ? { location: "" }
        : {}),
    });
  return (
    <div className="person-editor">
      <div className="form-group">
        <h4>Terra e área doada</h4>
        <div className="field-grid">
          <Field
            label="Nome da terra"
            value={data.land}
            onChange={(v) => set("land", v)}
            required
            wide
          />
          <Field
            label="Matrícula"
            value={data.registry}
            onChange={(v) => set("registry", v)}
            required
          />
          <Field
            label="Área total (hectares)"
            value={data.totalArea}
            onChange={(v) => set("totalArea", v)}
            required
          />
          <Field
            label="Área doada (hectares)"
            value={data.donatedArea}
            onChange={(v) => set("donatedArea", v)}
            required
          />
          <Field
            label="Nome do lote doado"
            value={data.lot}
            onChange={(v) => set("lot", v)}
            required
            wide
          />
        </div>
      </div>
      <div className="form-group">
        <h4>Localização do imóvel</h4>
        {data.recipient.city && data.recipient.state && (
          <div className="field-shortcuts">
            <Button
              size="1"
              variant="soft"
              onClick={() =>
                onChange({
                  ...data,
                  landCity: data.recipient.city,
                  landState: data.recipient.state,
                  location: "",
                })
              }
            >
              Usar município do donatário
            </Button>
          </div>
        )}
        <div className="field-grid">
          <Field
            label="Região do imóvel"
            value={data.region}
            onChange={(v) => set("region", v)}
            wide
          />
          <LocationFields
            state={data.landState}
            city={data.landCity}
            cityLabel="Município do imóvel"
            stateLabel="UF do imóvel"
            onChange={({ state, city }) =>
              onChange({
                ...data,
                landState: state,
                landCity: city,
                location: "",
              })
            }
          />
        </div>
      </div>
      <div className="form-group">
        <h4>Local e data da assinatura</h4>
        <div className="field-shortcuts">
          {data.landCity && data.landState && (
            <Button
              size="1"
              variant="soft"
              onClick={() =>
                onChange({
                  ...data,
                  city: data.landCity,
                  signState: data.landState,
                })
              }
            >
              Usar município do imóvel
            </Button>
          )}
          <Button
            size="1"
            variant="soft"
            onClick={() => set("date", new Date().toLocaleDateString("sv-SE"))}
          >
            Data de hoje
          </Button>
        </div>
        <div className="field-grid">
          <LocationFields
            state={data.signState}
            city={data.city}
            cityLabel="Cidade da assinatura"
            stateLabel="UF da assinatura"
            required
            onChange={({ state, city }) =>
              onChange({ ...data, signState: state, city: city })
            }
          />
          <Field
            label="Data do contrato"
            value={data.date}
            onChange={(v) => set("date", v)}
            type="date"
            required
          />
        </div>
      </div>
      <details className="form-details">
        <summary>
          Registros e informações adicionais <span>opcional</span>
        </summary>
        <div className="field-grid">
          <Field
            label="Cartório de registro"
            value={data.registryOffice}
            onChange={(v) => set("registryOffice", v)}
            wide
          />
          <Field label="CAR" value={data.car} onChange={(v) => set("car", v)} />
          <Field
            label="CCIR"
            value={data.ccir}
            onChange={(v) => set("ccir", v)}
          />
          <label className="wide">
            <span className="field-title">
              Informações complementares do contrato
            </span>
            <textarea
              value={data.additionalClause}
              onChange={(e) => set("additionalClause", e.target.value)}
              maxLength={3000}
              rows={4}
            />
            <small>
              Este texto será incluído no documento. Revise antes de gerar.
            </small>
          </label>
        </div>
      </details>
    </div>
  );
}
