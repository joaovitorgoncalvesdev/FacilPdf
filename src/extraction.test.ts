import { describe, it, expect } from "vitest";
import { extract, mergeFindings } from "./extraction";
import { emptyForm, normalizeForm, validate, validDate, person } from "./model";
const selected = (text: string, field: string) =>
  extract(text).find((f) => f.field === field && f.selected)?.value;
describe("Documentos de identidade reais em formatos variados", () => {
  it("lê campos em linhas separadas, incluindo nomes acentuados", () => {
    const t =
      "REPÚBLICA FEDERATIVA DO BRASIL\nNOME\nJOÃO ANTÔNIO DA SILVA\nREGISTRO GERAL\n12.345.678-9\nCPF\n52998224725\nDATA DE NASCIMENTO\n20.08.1990\nSSP BA";
    expect(selected(t, "name")).toBe("JOÃO ANTÔNIO DA SILVA");
    expect(selected(t, "rg")).toBe("12.345.678-9");
    expect(selected(t, "cpf")).toBe("529.982.247-25");
    expect(selected(t, "birth")).toBe("20.08.1990");
    expect(selected(t, "issuerState")).toBe("BA");
  });
  it("lê rótulos de CNH, sem confundir expedição com nascimento", () => {
    const t =
      "2 e 1 NOME E SOBRENOME\nMARIA DE SOUZA\n3 DATA E LOCAL DE NASCIMENTO\n20/08/1990\n4a DATA DE EMISSÃO\n15/09/2023\n4c DOC IDENTIDADE / ÓRG. EMISSOR / UF\n123456789 SSP BA\n4d CPF\n529.982.247-25";
    expect(selected(t, "name")).toBe("MARIA DE SOUZA");
    expect(selected(t, "birth")).toBe("20/08/1990");
    expect(selected(t, "rg")).toBe("123456789");
  });
  it("não aceita uma data impossível nem a seleciona automaticamente", () => {
    const f = extract("DATA DE NASCIMENTO: 31/02/1990").find(
      (f) => f.field === "birth",
    );
    expect(f?.warning).toBeTruthy();
    expect(f?.selected).toBe(false);
    expect(validDate("1990-02-31")).toBe(false);
  });
  it("não inventa dígitos verificadores de CPF", () => {
    const f = extract("CPF: 529.982.247-24").find((f) => f.field === "cpf");
    expect(f?.value).toBe("529.982.247-24");
    expect(f?.warning).toBeTruthy();
    expect(f?.selected).toBe(false);
  });
  it("corrige uma confusão visual explícita no CPF, mas exige revisão", () => {
    const f = extract("CPF: 529.982.247-2S").find((f) => f.field === "cpf");
    expect(f?.value).toBe("529.982.247-25");
    expect(f?.warning).toBeTruthy();
    expect(f?.selected).toBe(false);
  });
  it("não usa nome de fazenda como nome de pessoa", () => {
    expect(
      extract("Nome da terra: Fazenda Boa Vista\nMatrícula: 12345").some(
        (f) => f.field === "name",
      ),
    ).toBe(false);
  });
  it("não associa nome da mãe ao titular", () => {
    const f = extract(
      "NOME: JOÃO DA SILVA\nNOME DA MÃE: MARIA DA SILVA\nCPF: 529.982.247-25",
    );
    expect(f.find((x) => x.field === "name")?.value).toBe("JOÃO DA SILVA");
    expect(f.find((x) => x.field === "mother")?.value).toBe("MARIA DA SILVA");
  });
  it("separa três pessoas qualificadas no mesmo contrato", () => {
    const t =
      "DOADORES: JOÃO DA SILVA, brasileiro, casado, lavrador, portador do RG nº 12345678 SSP/BA e CPF: 529.982.247-25, e MARIA DE SOUZA, brasileira, casada, lavradora, portadora do RG nº 87654321 SSP/BA e CPF: 111.444.777-35.\nDONATÁRIO: PEDRO DE SOUZA, brasileiro, solteiro, lavrador, CPF: 123.456.789-09.";
    const f = extract(t);
    const groups = [
      ...new Set(f.filter((x) => x.field === "name").map((x) => x.group)),
    ];
    expect(groups).toHaveLength(3);
    expect(
      f.find((x) => x.field === "name" && x.value === "MARIA DE SOUZA")?.group,
    ).toBe(
      f.find((x) => x.field === "cpf" && x.value === "111.444.777-35")?.group,
    );
  });
  it("junta frente e verso sem repetir CPF", () => {
    const a = extract(
        "NOME: MARIA DE SOUZA\nCPF: 529.982.247-25",
        "frente.png",
      ),
      b = extract("CPF: 52998224725\nNASCIMENTO: 20/08/1990", "verso.png");
    const joined = mergeFindings(a, b, true);
    expect(joined.filter((x) => x.field === "cpf")).toHaveLength(1);
    expect(new Set(joined.map((x) => x.group)).size).toBe(1);
  });
  it("não junta identidades diferentes ao importar vários arquivos", () => {
    const a = extract("NOME: MARIA DE SOUZA\nCPF: 529.982.247-25"),
      b = extract("NOME: JOÃO DA SILVA\nCPF: 111.444.777-35");
    const joined = mergeFindings(a, b, true);
    expect(
      new Set(joined.filter((x) => x.field === "name").map((x) => x.group))
        .size,
    ).toBe(2);
  });
  it("extrai informações de imóvel e filiação em campos separados", () => {
    const f = extract(
      "NOME: MARIA DE SOUZA\nNome do pai: PEDRO DE SOUZA\nNaturalidade: Anagé - BA\nNome da terra: Boa Vista\nMatrícula nº 4.549\nÁrea total de 51 hectares\nÁrea doada: 4,2 hectares\nCCIR: 123456789",
    );
    for (const field of [
      "father",
      "birthCity",
      "birthState",
      "land",
      "registry",
      "totalArea",
      "donatedArea",
      "ccir",
    ])
      expect(
        f.some((x) => x.field === field),
        field,
      ).toBe(true);
  });
});
describe('Dados repetidos nas assinaturas',()=>{
 it('não atribui RG e CPF do doador ao último participante do documento',()=>{
  const text='DOADOR: JOÃO DA SILVA, brasileiro, casado, lavrador, portador do RG nº 12345678 e CPF: 529.982.247-25.\nDONATÁRIO: PEDRO DE SOUZA, brasileiro, solteiro, lavrador, portador do RG nº 87654321 e CPF: 111.444.777-35.\nJOÃO DA SILVA\nCPF: 529.982.247-25\nRG: 12345678\nDoador\nPEDRO DE SOUZA\nCPF: 111.444.777-35\nRG: 87654321\nDonatário';
  const results=extract(text);const recipient=results.find(f=>f.field==='name'&&f.value==='PEDRO DE SOUZA')!.group;
  expect(results.filter(f=>f.group===recipient&&f.field==='cpf')).toHaveLength(1);
  expect(results.find(f=>f.group===recipient&&f.field==='rg'&&f.selected)?.value).toBe('87654321');
 });
});
describe("Contrato flexível e migração", () => {
  it("não exige dados do segundo doador quando existe apenas um", () => {
    const d = emptyForm();
    d.donorCount = 1;
    expect(validate(d).some((x) => x.startsWith("Doador 2"))).toBe(false);
    d.donorCount = 2;
    expect(validate(d).some((x) => x.startsWith("Doador 2"))).toBe(true);
  });
  it("separa UF de órgão expedidor e cidade sem apagar os dados antigos", () => {
    const d = normalizeForm({
      donor1: {
        ...person(),
        issuer: "SSP/BA",
        address: "Fazenda Boa Sorte, Lagoa de Anta, Anagé - BA",
      },
      city: "Anagé - BA",
    });
    expect(d.donor1.issuer).toBe("SSP");
    expect(d.donor1.issuerState).toBe("BA");
    expect(d.donor1.city).toBe("Anagé");
    expect(d.signState).toBe("BA");
  });
});
