import { useEffect, useRef, useState } from "react";
import { Button, Checkbox, TextField, Select } from "@radix-ui/themes";
import {
  FileText,
  Scan,
  ClockCounterClockwise,
  GearSix,
  ArrowRight,
  DownloadSimple,
  Plus,
  Trash,
  CheckCircle,
  ArrowSquareOut,
  ShieldCheck,
  FolderOpen,
  MagnifyingGlass,
  ArrowCounterClockwise,
  CloudSlash,
  Moon,
  Sun,
} from "@phosphor-icons/react";
import { useAppearance } from "./Appearance";
import {
  emptyForm,
  normalizeForm,
  dateInput,
  personLabels,
  activePeople,
  recipientKeys,
  type PersonKey,
  personFields,
  landFields,
  validate,
  filename,
  type FormData,
  type Person,
} from "./model";
import {
  download,
  listRecords,
  saveRecord,
  deleteRecord,
  saveDraft,
  loadDraft,
  type RecordEntry,
} from "./storage";
import { generateDocx, convertPdf } from "./template";
import { personKeys, type Finding } from "./scanner";
import { PersonEditor, PropertyEditor } from "./ContractForm";
import ScannerView from "./ScannerView";
import PdfPreview from "./PdfPreview";
import { checkConverter } from "./converter";
type View = "editor" | "scanner" | "history" | "settings";
const titles = {
  editor: "Novo documento",
  scanner: "Scanner de documentos",
  history: "Seu histórico",
  settings: "Configuração",
};
export default function App() {
  const [pdfMethod, setPdfMethod] = useState<"browser" | "word">(() => {
    try {
      return localStorage.getItem("facilpdf-pdf-method") === "word"
        ? "word"
        : "browser";
    } catch {
      return "browser";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("facilpdf-pdf-method", pdfMethod);
    } catch {}
  }, [pdfMethod]);
  const { dark, preference, setPreference } = useAppearance();
  const [view, setView] = useState<View>("editor");
  const [data, setData] = useState<FormData>(emptyForm);
  const currentData = useRef(data);
  currentData.current = data;
  const [section, setSection] = useState("recipient");
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<
    "unknown" | "checking" | "connected" | "failed"
  >("unknown");
  const [connectionError, setConnectionError] = useState("");
  async function connectWord() {
    setConnection("checking");
    setConnectionError("");
    try {
      await checkConverter();
      setConnection("connected");
    } catch (error) {
      setConnection("failed");
      setConnectionError(
        error instanceof Error
          ? error.message
          : "Não foi possível conectar ao Word.",
      );
    }
  }
  const [pdf, setPdf] = useState<Blob>();
  const [pdfUrl, setPdfUrl] = useState("");
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState("");
  useEffect(() => {
    Promise.all([loadDraft(), listRecords()])
      .then(([draft, items]) => {
        if (draft) setData(normalizeForm(draft));
        setRecords(items);
        setReady(true);
      })
      .catch(() => {
        setMessage(
          "Não foi possível abrir o armazenamento. Verifique se o navegador permite dados locais.",
        );
        setReady(true);
      });
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      saveDraft(data).catch(() =>
        setMessage(
          "Não foi possível salvar o rascunho. Verifique o espaço disponível.",
        ),
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [data, ready]);
  useEffect(() => {
    if (!pdf) {
      setPdfUrl("");
      return;
    }
    const url = URL.createObjectURL(pdf);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdf]);
  const edit = (next: FormData) => {
    setData(structuredClone(next));
    setDirty(true);
    setErrors([]);
  };
  const announce = (s: string) => setMessage(s);
  async function persistPDF(blob: Blob, savedData: FormData) {
    download(blob, filename(savedData.recipient.name, "pdf"));
    try {
      await saveRecord(savedData, blob);
      setRecords(await listRecords());
      announce("PDF baixado e salvo no histórico.");
    } catch {
      announce(
        "PDF enviado para download. O histórico não pôde ser salvo; confira o espaço disponível neste navegador.",
      );
    }
  }
  async function makePDF(save = false) {
    const snapshot = JSON.stringify(data);
    const issues = validate(data);
    setErrors(issues);
    if (issues.length) {
      announce("Revise os campos indicados antes de gerar.");
      return;
    }
    setBusy(true);
    try {
      const docx = await generateDocx(data);
      const blob =
        pdfMethod === "browser"
          ? await (await import("./browserPdf")).browserPdf(docx)
          : await convertPdf(docx);
      if (pdfMethod === "word") {
        setConnection("connected");
        setConnectionError("");
      }
      setPdf(blob);
      const changed = JSON.stringify(currentData.current) !== snapshot;
      setDirty(changed);
      if (save && !changed)
        await persistPDF(blob, JSON.parse(snapshot) as FormData);
      else
        announce(
          changed
            ? "Os dados mudaram durante a conversão. Atualize a prévia antes de salvar."
            : "PDF pronto. Confira o documento e salve no histórico.",
        );
    } catch (e) {
      if (pdfMethod === "word") {
        setConnection("failed");
        setConnectionError(
          e instanceof Error ? e.message : "Não foi possível gerar o PDF.",
        );
      }
      announce(
        e instanceof Error ? e.message : "Não foi possível gerar o PDF.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function savePDF() {
    if (!pdf || dirty) {
      await makePDF(true);
      return;
    }
    setBusy(true);
    try {
      await persistPDF(pdf, structuredClone(data));
    } catch {
      announce(
        "Não foi possível salvar o histórico. Verifique o espaço disponível.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function word() {
    const issues = validate(data);
    setErrors(issues);
    if (issues.length) {
      announce("Preencha os campos obrigatórios para baixar o Word.");
      return;
    }
    try {
      download(await generateDocx(data), filename(data.recipient.name, "docx"));
      announce("Word preenchido com o modelo original.");
    } catch (e) {
      announce(String(e));
    }
  }
  function applyScan(
    findings: Finding[],
    mapping: Record<string, PersonKey>,
    overwrite: boolean,
  ) {
    const next = structuredClone(data);
    let changed = 0,
      skipped = 0;
    for (const item of findings.filter((f) => f.selected && f.value.trim())) {
      if (item.group !== "property" && personKeys.has(item.field)) {
        const target = mapping[item.group] || "recipient";
        if (!activePeople(data).includes(target)) continue;
        const object = next[target] as unknown as Record<string, string>;
        if (object[item.field] && !overwrite) {
          skipped++;
          continue;
        }
        object[item.field] =
          item.field === "birth" ? dateInput(item.value) : item.value;
        if (item.field === "address") {
          const migrated = normalizeForm({
            ...next,
            [target]: {
              ...next[target],
              address: item.value,
              street: "",
              city: "",
              state: "",
              district: "",
            },
          });
          for (const key of ["street", "city", "state", "district"] as const)
            if (overwrite || !next[target][key])
              next[target][key] = migrated[target][key];
        }
      } else {
        const object = next as unknown as Record<string, unknown>;
        if (!landFields.some(([key]) => key === item.field)) continue;
        if (object[item.field] && !overwrite) {
          skipped++;
          continue;
        }
        object[item.field] = item.value;
      }
      changed++;
    }
    if (!changed) {
      announce(
        "Nenhum campo novo foi aplicado. Confira os selecionados ou habilite a substituição de campos preenchidos.",
      );
      return false;
    }
    edit(next);
    setView("editor");
    setSection(Object.values(mapping)[0] || "recipient");
    announce(
      `${changed} campos preenchidos.${skipped ? " " + skipped + " campos existentes foram mantidos." : ""} Confira os dados e escolha a assinatura de cada pessoa.`,
    );
    return true;
  }
  const newDocument = () => {
    edit(emptyForm());
    setPdf(undefined);
    setView("editor");
    setSection("recipient");
    announce("Novo documento iniciado.");
  };
  const currentPerson =
    section in personLabels
      ? (section as keyof typeof personLabels)
      : undefined;
  const sections = [
    ...recipientKeys(data).map((key) => [key, personLabels[key]]),
    ["donor1", "Doador 1"],
    ...(data.donorCount === 2 ? [["donor2", "Doador 2"]] : []),
    ["land", "Imóvel e data"],
  ];
  function changeRecipientCount(count: number) {
    const next = normalizeForm({ ...data, recipientCount: count });
    edit(next);
    if (
      section.startsWith("recipient") &&
      !recipientKeys(next).includes(section as PersonKey)
    )
      setSection("recipient");
  }
  const savedPeople = [
    ...new Map(
      records
        .flatMap((record) =>
          activePeople(normalizeForm(record.data)).map(
            (key) => normalizeForm(record.data)[key],
          ),
        )
        .filter((person) => person.name && person.cpf)
        .map((person) => [person.cpf.replace(/\D/g, ""), person]),
    ).values(),
  ];
  const issues = validate(data);
  function reviewIssue(issue: string) {
    const who = activePeople(data).find((key) =>
      issue.startsWith(personLabels[key] + ":"),
    );
    setSection(who || "land");
    requestAnimationFrame(() => {
      const term = issue
        .split(":")
        .pop()!
        .trim()
        .replace(/ inválid[oa].*$/, "");
      const label = [
        ...document.querySelectorAll<HTMLLabelElement>(".person-editor label"),
      ].find((label) => label.textContent?.includes(term));
      const target = label?.querySelector<HTMLElement>("input,select,textarea");
      if (target) target.focus();
      else
        document
          .querySelector(".form-intro")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("editor");
          }}
        >
          <FileText size={30} weight="duotone" />
          <span>
            Fácil<span className="brand-light">PDF</span>
          </span>
        </a>
        <div className="mobile-header-actions">
          <button
            className="theme-toggle"
            aria-label="Configuração"
            onClick={() => setView("settings")}
          >
            <GearSix size={18} />
          </button>
          <button
            className="theme-toggle"
            onClick={() => setPreference(dark ? "light" : "dark")}
            aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <div className="workspace-label">Seu espaço de documentos</div>
        <nav aria-label="Navegação principal">
          {(
            [
              ["editor", FileText, "Novo documento"],
              ["scanner", Scan, "Scanner"],
              ["history", ClockCounterClockwise, "Histórico"],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              className={`nav-item ${view === key ? "active" : ""}`}
              onClick={() => setView(key)}
            >
              <Icon size={21} />
              <span>{label}</span>
              {key === "history" && records.length > 0 && (
                <span className="count">{records.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <ShieldCheck size={23} />
            <div>
              <strong>Seu arquivo, seu controle.</strong>
              <p>Histórico salvo neste navegador.</p>
            </div>
          </div>
          <button
            className={`nav-item ${view === "settings" ? "active" : ""}`}
            onClick={() => setView("settings")}
          >
            <GearSix size={21} />
            Configuração
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            Área de trabalho{" "}
            <span className="breadcrumb">/ {titles[view]}</span>
          </span>
          <div className="topbar-actions">
            <span className="local-status">
              <CloudSlash size={17} /> Armazenamento local
            </span>
            <button
              className="theme-toggle"
              onClick={() => setPreference(dark ? "light" : "dark")}
              aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
              <span>{dark ? "Modo claro" : "Modo escuro"}</span>
            </button>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <h1>{titles[view]}</h1>
              <p>
                {view === "editor"
                  ? "Do preenchimento à assinatura, tudo no lugar."
                  : view === "scanner"
                    ? "Transforme documentos em dados, com uma revisão sua."
                    : view === "history"
                      ? "Documentos gerados, organizados por pessoa."
                      : "Tudo o que precisa para testar com fidelidade."}
              </p>
            </div>
            {view !== "editor" && (
              <Button onClick={newDocument}>
                <Plus /> Novo documento
              </Button>
            )}
          </div>
          {message && (
            <div className="notice" role="status">
              <span>{message}</span>
              <button
                aria-label="Fechar mensagem"
                onClick={() => setMessage("")}
              >
                Fechar
              </button>
            </div>
          )}
          {view === "editor" && (
            <>
              <div className="document-bar">
                <div className="document-kind">
                  <span className="document-icon">
                    <FileText size={23} />
                  </span>
                  <div>
                    <strong>Instrumento particular de doação</strong>
                    <span>
                      Modelo original · {data.donorCount}{" "}
                      {data.donorCount === 1 ? "doador" : "doadores"} ·{" "}
                      {data.recipientCount}{" "}
                      {data.recipientCount === 1 ? "donatário" : "donatários"}
                    </span>
                  </div>
                </div>
                <Button variant="soft" onClick={() => setView("scanner")}>
                  <Scan /> Importar dados <ArrowRight />
                </Button>
              </div>
              <div className="pdf-method">
                <label>
                  <strong>Como gerar o PDF?</strong>
                  <select
                    aria-label="Forma de gerar o PDF"
                    value={pdfMethod}
                    disabled={busy}
                    onChange={(event) => {
                      setPdfMethod(event.target.value as "browser" | "word");
                      setDirty(true);
                    }}
                  >
                    <option value="browser">
                      PDF pelo site · sem instalação
                    </option>
                    <option value="word">PDF pelo Word · opcional</option>
                  </select>
                </label>
                <div className="pdf-method-benefits" aria-live="polite">
                  <strong>
                    {pdfMethod === "browser"
                      ? "Mais prático para o dia a dia"
                      : "Maior fidelidade ao modelo do Word"}
                  </strong>
                  <p>
                    {pdfMethod === "browser"
                      ? "Gere, confira e salve aqui mesmo, no computador ou celular. Sem instalar programas nem abrir um conversor. Os dados são processados no navegador."
                      : "O próprio Word exporta o contrato, preservando suas fontes e regras de paginação. Ideal quando a aparência do modelo original é a prioridade."}
                  </p>
                  <p>
                    {pdfMethod === "browser"
                      ? "Usa fontes equivalentes às do modelo; as quebras de linha e de página podem variar em relação ao Word."
                      : "Requer Windows, Microsoft Word instalado e o conversor local aberto neste computador."}
                  </p>
                  <p>
                    As duas opções geram PDF. Para editar o texto depois, use{" "}
                    <strong>Baixar Word</strong>.
                  </p>
                </div>
              </div>
              {pdfMethod === "word" && (
                <section
                  className="converter-status"
                  aria-label="Conexão com o Word local"
                >
                  <div>
                    <strong>
                      {connection === "connected"
                        ? "Word conectado · PDF disponível"
                        : connection === "checking"
                          ? "Verificando o Word…"
                          : "Ative o Word local para gerar PDF"}
                    </strong>
                    <p>
                      O scanner e o Word preenchido funcionam sem conexão com o
                      conversor. Para gerar PDF com a formatação original, abra
                      ABRIR-SITE.cmd neste computador.
                    </p>
                    {connectionError && <p role="alert">{connectionError}</p>}
                  </div>
                  <div className="converter-actions">
                    <Button
                      variant="soft"
                      disabled={connection === "checking" || busy}
                      onClick={() => void connectWord()}
                    >
                      Verificar conexão
                    </Button>
                    <a
                      href={`${import.meta.env.BASE_URL}downloads/Conversor-FacilPDF.zip`}
                      download
                    >
                      Baixar conversor do Word
                    </a>
                  </div>
                  <details>
                    <summary>Como ativar o PDF</summary>
                    <ol>
                      <li>
                        Baixe o conversor, extraia a pasta e abra ABRIR-SITE.cmd
                        no Windows com Word instalado.
                      </li>
                      <li>
                        Mantenha a janela aberta durante o uso. Quando
                        solicitado pelo navegador, permita o acesso à rede local
                        para este site.
                      </li>
                      <li>
                        Clique em Verificar conexão. Depois use Gerar prévia ou
                        Salvar PDF e histórico.
                      </li>
                    </ol>
                    <p>
                      Em celular ou computador sem Word, baixe o Word preenchido
                      e abra-o em um computador com o conversor.
                    </p>
                  </details>
                </section>
              )}
              <div className="participant-config">
                <div>
                  <strong>Quantas pessoas estão doando?</strong>
                  <span>
                    O texto e as assinaturas se ajustam à sua escolha.
                  </span>
                </div>
                <select
                  aria-label="Quantidade de doadores"
                  value={data.donorCount}
                  onChange={(e) => {
                    edit({
                      ...data,
                      donorCount: Number(e.target.value) as 1 | 2,
                    });
                    if (e.target.value === "1" && section === "donor2")
                      setSection("donor1");
                  }}
                >
                  <option value="1">1 doador</option>
                  <option value="2">2 doadores</option>
                </select>
              </div>
              <div className="participant-config">
                <div>
                  <strong>Quantas pessoas recebem a doação?</strong>
                  <span>
                    Cada donatário terá seus próprios dados e sua forma de
                    assinar.
                  </span>
                </div>
                <select
                  aria-label="Quantidade de donatários"
                  value={data.recipientCount}
                  onChange={(e) => changeRecipientCount(Number(e.target.value))}
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} {i === 0 ? "donatário" : "donatários"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="editor-layout">
                <section className="form-panel" aria-label="Preenchimento">
                  <div className="panel-header">
                    <h2>Preencher documento</h2>
                    <span className="draft-label">Rascunho local</span>
                  </div>
                  <div
                    className="section-tabs"
                    role="tablist"
                    aria-label="Seções do formulário"
                  >
                    {sections.map(([id, label]) => (
                      <button
                        role="tab"
                        aria-selected={section === id}
                        key={id}
                        onClick={() => setSection(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <details className="completion-check">
                    <summary>
                      {issues.length
                        ? `${issues.length} ${issues.length === 1 ? "ajuste para concluir" : "ajustes para concluir"}`
                        : "Tudo preenchido para gerar a prévia"}
                    </summary>
                    {issues.length > 0 ? (
                      <>
                        <p>Toque em um item para ir à seção correspondente.</p>
                        <ul>
                          {issues.map((issue) => (
                            <li key={issue}>
                              <button onClick={() => reviewIssue(issue)}>
                                {issue}
                                <ArrowRight size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p>
                        Confira os dados e gere a prévia para revisar o
                        documento.
                      </p>
                    )}
                  </details>
                  <div className="form-intro">
                    <h3>
                      {currentPerson
                        ? personLabels[currentPerson]
                        : "Imóvel e assinatura"}
                    </h3>
                    <p>
                      {section.startsWith("recipient")
                        ? data.recipientCount === 1
                          ? "Quem recebe a doação. O arquivo será salvo com este nome."
                          : "Quem recebe a doação. O arquivo será salvo com o nome do primeiro donatário."
                        : section === "land"
                          ? "Identificação da terra e da fração que será doada."
                          : "Dados de quem transfere a propriedade."}
                    </p>
                    {currentPerson && savedPeople.length > 0 && (
                      <label className="reuse-person">
                        <span>Reutilizar pessoa do histórico</span>
                        <select
                          value=""
                          onChange={(event) => {
                            const person = savedPeople.find(
                              (item) => item.cpf === event.target.value,
                            );
                            if (person) {
                              edit({
                                ...data,
                                [currentPerson]: {
                                  ...person,
                                  signature: data[currentPerson].signature,
                                },
                              });
                              announce(
                                "Cadastro recuperado. Confira os dados antes de gerar.",
                              );
                            }
                          }}
                        >
                          <option value="">Escolha um cadastro salvo</option>
                          {savedPeople.map((person) => (
                            <option key={person.cpf} value={person.cpf}>
                              {person.name} · {person.cpf}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  {currentPerson ? (
                    <PersonEditor
                      key={currentPerson}
                      person={data[currentPerson]}
                      who={currentPerson}
                      addressSources={activePeople(data)
                        .filter(
                          (key) =>
                            key !== currentPerson &&
                            !!(
                              data[key].street ||
                              data[key].address ||
                              data[key].city
                            ),
                        )
                        .map((key) => ({
                          key,
                          label: personLabels[key],
                          person: data[key],
                        }))}
                      onChange={(person) =>
                        edit({ ...data, [currentPerson]: person })
                      }
                      copyAddress={
                        currentPerson === "donor2"
                          ? () => {
                              const next = structuredClone(data);
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
                                next.donor2[key] = next.donor1[key];
                              edit(next);
                            }
                          : undefined
                      }
                    />
                  ) : (
                    <PropertyEditor data={data} onChange={edit} />
                  )}
                  {errors.length > 0 && (
                    <div className="validation" role="alert">
                      <strong>Confira os seguintes campos</strong>
                      <ul>
                        {errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="form-footer">
                    <span>* Campos obrigatórios</span>
                    {section !== "land" ? (
                      <Button
                        variant="soft"
                        onClick={() =>
                          setSection(
                            sections[
                              sections.findIndex(([key]) => key === section) + 1
                            ]?.[0] || "land",
                          )
                        }
                      >
                        Próxima seção <ArrowRight />
                      </Button>
                    ) : (
                      <Button disabled={busy} onClick={() => void makePDF()}>
                        Gerar prévia <ArrowRight />
                      </Button>
                    )}
                  </div>
                </section>
                <section className="preview-panel" aria-label="Prévia do PDF">
                  <div className="preview-header">
                    <div>
                      <h2>Prévia do documento</h2>
                      <span>
                        {pdfUrl
                          ? dirty
                            ? "Dados ou modo alterados. Gere uma nova prévia."
                            : "Este é o PDF que será baixado."
                          : "A prévia mostra o PDF que será salvo."}
                      </span>
                    </div>
                    <span className="a4">A4</span>
                  </div>
                  <div className="preview-stage">
                    {pdfUrl ? (
                      <PdfPreview blob={pdf!} />
                    ) : (
                      <div className="preview-empty">
                        <div className="paper-sample">
                          <FileText size={60} weight="thin" />
                          <div className="sample-lines">
                            <i />
                            <i />
                            <i />
                            <i />
                            <i />
                          </div>
                          <span>MODELO ORIGINAL</span>
                        </div>
                        <h3>Seu documento começa aqui.</h3>
                        <p>
                          Preencha os dados e gere a prévia para conferir o PDF
                          com a formatação do modelo.
                        </p>
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => void makePDF()}
                        >
                          {busy
                            ? "Convertendo documento…"
                            : "Gerar prévia do PDF"}
                          <ArrowRight />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="preview-footer">
                    <ShieldCheck size={18} />
                    <span>Confira todas as páginas antes de salvar.</span>
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Abrir PDF em nova aba"
                      >
                        <ArrowSquareOut size={20} />
                      </a>
                    )}
                  </div>
                </section>
              </div>
              <div className="action-bar">
                <button className="text-button" onClick={newDocument}>
                  <ArrowCounterClockwise size={18} /> Começar outro documento
                </button>
                <div>
                  <Button variant="outline" onClick={word} disabled={busy}>
                    <DownloadSimple /> Baixar Word
                  </Button>
                  <Button disabled={busy} onClick={() => void makePDF()}>
                    {busy ? "Gerando…" : "Atualizar prévia"}
                  </Button>
                  <Button disabled={busy || !ready} onClick={savePDF}>
                    <DownloadSimple /> Salvar PDF e histórico
                  </Button>
                </div>
              </div>
            </>
          )}
          <div hidden={view !== "scanner"}>
            <ScannerView
              data={data}
              onApply={applyScan}
              announce={announce}
              onDonorCountChange={(donorCount) => edit({ ...data, donorCount })}
              onRecipientCountChange={changeRecipientCount}
            />
          </div>
          {view === "history" && (
            <section className="history-panel">
              <div className="history-toolbar">
                <TextField.Root
                  aria-label="Buscar histórico"
                  placeholder="Buscar por nome ou imóvel"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                >
                  <TextField.Slot>
                    <MagnifyingGlass />
                  </TextField.Slot>
                </TextField.Root>
                <span>
                  {records.length} documento{records.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="storage-hint">
                Este histórico fica neste navegador. Limpar os dados do site
                remove os arquivos. Exporte um backup para guardá-los.
              </p>
              {records.length > 0 && (
                <div className="backup-actions">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const { exportBackup } = await import("./backup");
                        download(
                          await exportBackup(records),
                          `FacilPDF-backup-${new Date().toISOString().slice(0, 10)}.zip`,
                        );
                      } catch {
                        announce("Não foi possível exportar o backup.");
                      }
                    }}
                  >
                    Exportar backup completo
                  </Button>
                  <label className="backup-label">
                    Restaurar backup
                    <input
                      type="file"
                      accept=".zip"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const { restoreBackup } = await import("./backup");
                          await restoreBackup(file);
                          setRecords(await listRecords());
                          announce("Backup restaurado.");
                        } catch {
                          announce("Backup inválido ou espaço insuficiente.");
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              )}
              {records
                .filter((r) =>
                  (r.name + " " + r.land)
                    .toLocaleLowerCase()
                    .includes(search.toLocaleLowerCase()),
                )
                .map((record) => (
                  <article className="history-row" key={record.id}>
                    <span className="record-icon">
                      <FileText size={25} />
                    </span>
                    <div className="record-info">
                      <h3>{record.name}</h3>
                      <p>
                        {record.land} ·{" "}
                        {new Date(record.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="record-actions">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setData(normalizeForm(record.data));
                          setPdf(record.pdf);
                          setDirty(false);
                          setView("editor");
                          announce(
                            "Documento reaberto. Alterações serão salvas como uma nova versão.",
                          );
                        }}
                      >
                        Reabrir
                      </Button>
                      <Button
                        variant="soft"
                        aria-label={`Baixar PDF de ${record.name}`}
                        onClick={() =>
                          download(record.pdf, filename(record.name, "pdf"))
                        }
                      >
                        <DownloadSimple />
                      </Button>
                      {deleteId === record.id ? (
                        <>
                          <Button
                            color="red"
                            onClick={async () => {
                              await deleteRecord(record.id);
                              setRecords(await listRecords());
                              setDeleteId("");
                            }}
                          >
                            Excluir
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setDeleteId("")}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <Button
                          color="red"
                          variant="ghost"
                          aria-label={`Excluir documento de ${record.name}`}
                          onClick={() => setDeleteId(record.id)}
                        >
                          <Trash />
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              {records.length === 0 && (
                <div className="history-empty">
                  <FolderOpen size={64} weight="thin" />
                  <h2>Um lugar para cada documento.</h2>
                  <p>
                    Ao salvar um PDF, ele aparece aqui com o nome do donatário,
                    pronto para consultar e baixar.
                  </p>
                  <Button onClick={() => setView("editor")}>
                    Criar primeiro documento <ArrowRight />
                  </Button>
                  <label className="backup-label">
                    Ou restaurar backup
                    <input
                      type="file"
                      accept=".zip"
                      onChange={async (e) => {
                        try {
                          const file = e.target.files?.[0];
                          if (file) {
                            const { restoreBackup } = await import("./backup");
                            await restoreBackup(file);
                            setRecords(await listRecords());
                          }
                        } catch {
                          announce("Não foi possível restaurar o backup.");
                        }
                      }}
                    />
                  </label>
                </div>
              )}
              {records.length > 0 &&
                search &&
                !records.some((r) =>
                  (r.name + " " + r.land)
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                ) && (
                  <p className="no-results">
                    Nenhum documento encontrado para essa busca.
                  </p>
                )}
            </section>
          )}
          {view === "settings" && (
            <section className="settings-panel">
              <h2>Aparência</h2>
              <label className="appearance-choice">
                <span>Tema do site</span>
                <select
                  value={preference}
                  onChange={(event) =>
                    setPreference(
                      event.target.value as "light" | "dark" | "system",
                    )
                  }
                >
                  <option value="system">Acompanhar o dispositivo</option>
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                </select>
              </label>
              <p>
                A escolha fica salva neste navegador. O tema não altera o PDF.
              </p>
              <h2>Seu PDF, de duas formas.</h2>
              <p>
                PDF pelo site funciona sem instalar nada e mantém os dados neste
                navegador. PDF pelo Word é uma alternativa opcional para
                exportar pelo Word deste computador. A prévia, o download e o
                histórico usam o mesmo PDF gerado.
              </p>
              <dl>
                <dt>Modelo</dt>
                <dd>
                  Instrumento particular de doação, baseado no documento
                  fornecido.
                </dd>
                <dt>Forma de gerar PDF</dt>
                <dd>
                  Escolha no formulário: PDF pelo site, sem instalação, ou PDF
                  pelo Word, com conversor local opcional.
                </dd>
                <dt>Histórico</dt>
                <dd>
                  IndexedDB neste navegador. Sem sincronização entre
                  dispositivos.
                </dd>
                <dt>Fonte do documento</dt>
                <dd>
                  No site, Tinos e Carlito são fontes incorporadas equivalentes
                  às do modelo. Na opção Word, são utilizadas as fontes do
                  documento original.
                </dd>
              </dl>
              <h3>Antes de salvar</h3>
              <p>
                Confira a prévia inteira. Nomes e endereços maiores podem
                aumentar o número de linhas e páginas; o texto não é comprimido
                nem sobreposto para caber.
              </p>
              <h3>Leitura de documentos</h3>
              <p>
                PDFs com texto são lidos diretamente. Páginas digitalizadas e
                imagens usam OCR com tratamento de contraste e leituras
                complementares. DOCX também permite a leitura das imagens
                internas. Revise resultados sinalizados e use a rotação quando
                necessário.
              </p>
              <h3>Cópia de segurança</h3>
              <p>
                No histórico, exporte o backup completo com PDFs e campos
                preenchidos. Você pode restaurá-lo neste navegador ou em outro
                computador.
              </p>
            </section>
          )}
          <footer className="page-footer">
            <span>FácilPDF</span>
            <span>Menos digitação. Mais tempo para o que importa.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
