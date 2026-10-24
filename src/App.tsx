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
import { generateDocx } from "./template";
import { personKeys, type Finding } from "./scanner";
import { PersonEditor, PropertyEditor } from "./ContractForm";
import ScannerView from "./ScannerView";
import PdfPreview from "./PdfPreview";

import { ValidationContext } from "./ValidationContext";
type View = "editor" | "scanner" | "history" | "settings";
const titles = {
  editor: "Contrato de doação",
  scanner: "Scanner de documentos",
  history: "Seu histórico",
  settings: "Configuração",
};
export default function App() {
  const { dark, preference, setPreference } = useAppearance();
  const [view, updateView] = useState<View>("editor");
  const [mobilePane, setMobilePane] = useState<"form" | "preview">("form");
  const [attempted, setAttempted] = useState(false);
  const [draftStatus, setDraftStatus] = useState("Carregando rascunho…");
  const [undoDraft, setUndoDraft] = useState<{
    data: FormData;
    pdf?: Blob;
    section: string;
  }>();
  const completion = useRef<HTMLDetailsElement>(null);
  function setView(next: View) {
    if (next !== view) setMessage("");
    updateView(next);
    setMobilePane("form");
  }
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document
      .querySelector<HTMLElement>(".page-heading h1")
      ?.focus({ preventScroll: true });
  }, [view]);
  const previousPane = useRef(mobilePane);
  useEffect(() => {
    if (previousPane.current === mobilePane) return;
    previousPane.current = mobilePane;
    if (view === "editor") {
      document
        .querySelector(".editor-layout")
        ?.scrollIntoView({ block: "start" });
    }
  }, [mobilePane, view]);
  const [data, setData] = useState<FormData>(emptyForm);
  const currentData = useRef(data);
  currentData.current = data;
  const [section, setSection] = useState("recipient");
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");

  const [busy, setBusy] = useState(false);
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
    let active = true;
    setDraftStatus("Salvando…");
    const timer = setTimeout(() => {
      saveDraft(data)
        .then(() => {
          if (active) setDraftStatus("Salvo neste navegador");
        })
        .catch(() => {
          if (active) {
            setDraftStatus("Rascunho não salvo");
            setMessage(
              "Não foi possível salvar o rascunho. Verifique o espaço disponível.",
            );
          }
        });
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
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
    setMessage("");
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
    if (issues.length) {
      setAttempted(true);
      setMobilePane("form");
      if (completion.current) completion.current.open = true;
      reviewIssue(issues[0]);
      return;
    }
    setMessage("");
    setBusy(true);
    try {
      const docx = await generateDocx(data);
      const blob = await (await import("./browserPdf")).browserPdf(docx);
      setPdf(blob);
      setMobilePane("preview");
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
    if (issues.length) {
      setAttempted(true);
      setMobilePane("form");
      if (completion.current) completion.current.open = true;
      reviewIssue(issues[0]);
      return;
    }
    setMessage("");
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
    setUndoDraft({ data: structuredClone(data), pdf, section });
    edit(emptyForm());
    setPdf(undefined);
    setView("editor");
    setSection("recipient");
    setAttempted(false);
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
  const currentIssues = issues.filter((issue) =>
    currentPerson
      ? issue.startsWith(personLabels[currentPerson] + ":")
      : !activePeople(data).some((key) =>
          issue.startsWith(personLabels[key] + ":"),
        ),
  );
  function continueSection() {
    if (currentIssues.length) {
      setAttempted(true);
      reviewIssue(currentIssues[0]);
      return;
    }
    setAttempted(false);
    setSection(
      sections[sections.findIndex(([id]) => id === section) + 1]?.[0] || "land",
    );
  }
  const previousSection = useRef(section);
  useEffect(() => {
    if (previousSection.current === section) return;
    previousSection.current = section;
    document
      .querySelector(".person-navigation")
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [section]);
  function reviewIssue(issue: string) {
    const who = activePeople(data).find((key) =>
      issue.startsWith(personLabels[key] + ":"),
    );
    setSection(who || "land");
    requestAnimationFrame(() => {
      let term = issue
        .split(":")
        .pop()!
        .trim()
        .replace(/ inválid[oa].*$/, "");
      if (term === "Localização do imóvel") term = "UF do imóvel";
      if (term.startsWith("A área doada")) term = "Área doada";
      if (term.startsWith("confira município")) term = "Município";
      const label = [
        ...document.querySelectorAll<HTMLLabelElement>(".person-editor label"),
      ].find((label) =>
        label.textContent
          ?.toLocaleLowerCase()
          .includes(term.toLocaleLowerCase()),
      );
      const target = label?.querySelector<HTMLElement>("input,select,textarea");
      if (target) {
        const details = target.closest("details");
        if (details) details.open = true;
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      } else
        document
          .querySelector(".form-intro")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
  return (
    <div className="app-shell simple-app">
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

        <nav aria-label="Navegação principal">
          {(
            [
              ["editor", FileText, "Preencher"],
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
          <div className="topbar-actions">
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
              <h1 tabIndex={-1}>{titles[view]}</h1>
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
              <div className="start-tools" hidden={mobilePane !== "form"}>
                <Button variant="outline" onClick={() => setView("scanner")}>
                  <Scan /> Preencher com documentos
                </Button>
              </div>
              <details
                className="document-setup"
                hidden={mobilePane !== "form"}
              >
                <summary>
                  Adicionar ou remover pessoas{" "}
                  <span>
                    {data.recipientCount}{" "}
                    {data.recipientCount === 1 ? "recebe" : "recebem"} ·{" "}
                    {data.donorCount} {data.donorCount === 1 ? "doa" : "doam"}
                  </span>
                </summary>
                <div className="setup-content">
                  <div className="participant-config">
                    <div>
                      <strong>Quantas pessoas estão doando?</strong>
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
                    </div>
                    <select
                      aria-label="Quantidade de donatários"
                      value={data.recipientCount}
                      onChange={(e) =>
                        changeRecipientCount(Number(e.target.value))
                      }
                    >
                      {Array.from({ length: 10 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {i === 0 ? "donatário" : "donatários"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </details>
              <div className={`editor-layout pane-${mobilePane}`}>
                <section className="form-panel" aria-label="Preenchimento">
                  <div className="panel-header">
                    <h2>
                      {section.startsWith("recipient")
                        ? "Quem recebe a doação?"
                        : section === "land"
                          ? "Qual é o imóvel?"
                          : "Quem está doando?"}
                    </h2>
                    <span className="step-count">
                      {sections.findIndex(([id]) => id === section) + 1} de{" "}
                      {sections.length}
                    </span>
                  </div>
                  <details className="person-navigation">
                    <summary>Trocar pessoa ou ir ao imóvel</summary>
                    <label>
                      <span>Ir para outra pessoa ou imóvel</span>
                      <select
                        aria-label="Pessoa ou etapa"
                        value={section}
                        onChange={(event) => setSection(event.target.value)}
                      >
                        {sections.map(([id, label]) => {
                          const person =
                            id !== "land" ? data[id as PersonKey] : undefined;
                          return (
                            <option key={id} value={id}>
                              {person?.name ? person.name + " · " : ""}
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  </details>
                  {attempted && currentIssues.length > 0 && (
                    <details ref={completion} open className="completion-check">
                      <summary>Confira antes de continuar</summary>
                      <ul>
                        {currentIssues.map((issue) => (
                          <li key={issue}>
                            <button onClick={() => reviewIssue(issue)}>
                              {issue}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <div className="form-intro">
                    {currentPerson && savedPeople.length > 0 && (
                      <details className="reuse-saved">
                        <summary>Usar pessoa do histórico</summary>
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
                      </details>
                    )}
                  </div>
                  <ValidationContext.Provider value={attempted}>
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
                  </ValidationContext.Provider>
                  <div className="form-footer">
                    <button
                      className="text-button"
                      disabled={section === sections[0][0] || busy}
                      onClick={() => {
                        setAttempted(false);
                        setSection(
                          sections[
                            sections.findIndex(([id]) => id === section) - 1
                          ][0],
                        );
                      }}
                    >
                      Voltar
                    </button>
                    {section !== "land" ? (
                      <Button onClick={continueSection}>
                        Continuar <ArrowRight />
                      </Button>
                    ) : (
                      <Button disabled={busy} onClick={() => void makePDF()}>
                        {busy ? "Preparando…" : "Conferir documento"}
                        <ArrowRight />
                      </Button>
                    )}
                  </div>
                </section>
                <section className="preview-panel" aria-label="Prévia do PDF">
                  <div className="preview-header">
                    <div>
                      <h2>Prévia</h2>
                      {pdfUrl && (
                        <span>
                          {dirty
                            ? "Dados alterados. Atualize a prévia."
                            : "Confira todas as páginas antes de salvar."}
                        </span>
                      )}
                    </div>
                    <span className="a4">A4</span>
                    {pdfUrl && dirty && (
                      <Button
                        variant="ghost"
                        size="1"
                        disabled={busy}
                        onClick={() => void makePDF()}
                      >
                        Atualizar prévia
                      </Button>
                    )}
                  </div>
                  <div className="preview-stage">
                    {pdfUrl ? (
                      <PdfPreview blob={pdf!} />
                    ) : (
                      <div className="preview-placeholder">
                        <FileText size={38} weight="light" aria-hidden="true" />
                        <p>Preencha os dados e clique em Conferir documento.</p>
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
                  {pdfUrl && (
                    <div className="review-actions">
                      <button
                        className="text-button edit-preview-data"
                        onClick={() => setMobilePane("form")}
                      >
                        Editar dados
                      </button>
                      <Button
                        disabled={busy || !ready || dirty}
                        onClick={savePDF}
                      >
                        <DownloadSimple />
                        {busy ? "Salvando…" : "Salvar PDF"}
                      </Button>
                    </div>
                  )}
                </section>
              </div>
              {undoDraft && (
                <div className="undo-draft" role="status">
                  <span>O documento anterior pode ser recuperado.</span>
                  <Button
                    variant="soft"
                    onClick={() => {
                      edit(undoDraft.data);
                      setPdf(undoDraft.pdf);
                      setSection(undoDraft.section);
                      setAttempted(false);
                      setUndoDraft(undefined);
                      setMessage("Documento anterior recuperado.");
                    }}
                  >
                    Desfazer novo documento
                  </Button>
                </div>
              )}
              <div className="quiet-footer">
                <span className="draft-label" role="status">
                  {draftStatus}
                </span>
                <details className="more-actions">
                  <summary>Outras opções</summary>
                  <div>
                    <Button variant="ghost" onClick={word} disabled={busy}>
                      Baixar Word editável
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={newDocument}
                      disabled={busy}
                    >
                      Começar outro documento
                    </Button>
                  </div>
                </details>
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
                          setMobilePane("preview");
                          announce(
                            "Documento reaberto. Alterações serão salvas como uma nova versão.",
                          );
                        }}
                      >
                        Reabrir
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setUndoDraft({
                            data: structuredClone(data),
                            pdf,
                            section,
                          });
                          edit(normalizeForm(record.data));
                          setPdf(undefined);
                          setSection("recipient");
                          setAttempted(false);
                          setView("editor");
                          announce(
                            "Cópia criada. Edite os dados e salve como um novo documento.",
                          );
                        }}
                      >
                        Duplicar
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
                    Nenhum documento encontrado para essa busca.{" "}
                    <button
                      className="text-button"
                      onClick={() => setSearch("")}
                    >
                      Limpar busca
                    </button>
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
              <h2>Sem instalação e sem conexão com o Word</h2>
              <p>
                Gere o PDF diretamente no site. Para editar o contrato em outro
                programa, use Baixar Word. Nenhum conversor local é necessário.
                A prévia, o download e o histórico usam o mesmo PDF.
              </p>
              <dl>
                <dt>Modelo</dt>
                <dd>
                  Instrumento particular de doação, baseado no documento
                  fornecido.
                </dd>
                <dt>Forma de gerar PDF</dt>
                <dd>
                  PDF pelo site, sem instalação. Word editável em DOCX como
                  alternativa.
                </dd>
                <dt>Histórico</dt>
                <dd>
                  IndexedDB neste navegador. Sem sincronização entre
                  dispositivos.
                </dd>
                <dt>Fonte do documento</dt>
                <dd>
                  No site, Tinos e Carlito são fontes incorporadas equivalentes
                  às do modelo. O DOCX preserva as fontes do documento original
                  para abertura em um editor compatível.
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
        </div>
      </main>
    </div>
  );
}
