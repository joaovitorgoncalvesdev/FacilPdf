import { useRef, useState, useEffect } from "react";
import { Button, Checkbox, TextField } from "@radix-ui/themes";
import {
  Scan,
  Plus,
  FileText,
  CheckCircle,
  MagnifyingGlass,
  X,
  ArrowClockwise,
} from "@phosphor-icons/react";
import {
  readDocumentDetailed,
  extract,
  mergeFindings,
  personKeys,
  type Finding,
} from "./scanner";
import {
  activePeople,
  personLabels,
  personFields,
  landFields,
  validCPF,
  validDate,
  dateInput,
  formatCPF,
  type FormData,
  type PersonKey,
} from "./model";
type Props = {
  data: FormData;
  onApply: (
    findings: Finding[],
    mapping: Record<string, PersonKey>,
    overwrite: boolean,
  ) => boolean;
  announce: (message: string) => void;
  onDonorCountChange: (count: 1 | 2) => void;
  onRecipientCountChange: (count: number) => void;
};
export default function ScannerView({
  data,
  onApply,
  announce,
  onDonorCountChange,
  onRecipientCountChange,
}: Props) {
  const [findings, setFindings] = useState<Finding[]>([]),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [warnings, setWarnings] = useState<string[]>([]),
    [texts, setTexts] = useState<{ name: string; text: string }[]>([]),
    [mapping, setMapping] = useState<Record<string, PersonKey>>({}),
    [overwrite, setOverwrite] = useState(false),
    [samePerson, setSamePerson] = useState(true),
    [rotation, setRotation] = useState("0"),
    [enhanced, setEnhanced] = useState(true);
  const upload = useRef<HTMLInputElement>(null),
    controller = useRef<AbortController | null>(null),
    lastFiles = useRef<File[]>([]);
  const [sourcePreview, setSourcePreview] = useState("");
  const [reviewOnly, setReviewOnly] = useState(false);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(
    () => () => {
      if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    },
    [sourcePreview],
  );
  const groups = [...new Set(findings.map((f) => f.group))];
  const destination = (group: string): PersonKey => {
    const suggested = findings.find(
      (f) => f.group === group && f.suggestedTarget,
    )?.suggestedTarget;
    const chosen = mapping[group] || suggested || "recipient";
    return activePeople(data).includes(chosen) ? chosen : "recipient";
  };
  function applyResults() {
    const invalid = findings.find(
      (f) =>
        f.selected &&
        ((f.field === "cpf" && !validCPF(f.value)) ||
          (f.field === "birth" && !validDate(dateInput(f.value)))),
    );
    if (invalid) {
      announce(
        `Confira ${invalid.label}: ${invalid.value}. Corrija o valor ou desmarque antes de importar.`,
      );
      return;
    }
    const resolved = Object.fromEntries(
      groups.filter((g) => g !== "property").map((g) => [g, destination(g)]),
    ) as Record<string, PersonKey>;
    const duplicate = new Set<string>();
    for (const item of findings.filter((f) => f.selected)) {
      const key =
        (item.group !== "property" && personKeys.has(item.field)
          ? resolved[item.group]
          : "property") +
        ":" +
        item.field;
      if (duplicate.has(key)) {
        announce(
          "Há dois valores para o mesmo campo e pessoa. Escolha um valor ou ajuste quem recebe os dados.",
        );
        return;
      }
      duplicate.add(key);
    }
    onApply(findings, resolved, overwrite);
  }
  async function scan(files: File[], append = false) {
    if (!files.length) return;
    if (append) {
      files = files.filter(
        (file) =>
          !lastFiles.current.some(
            (old) =>
              old.name === file.name &&
              old.size === file.size &&
              old.lastModified === file.lastModified,
          ),
      );
      if (!files.length) {
        announce(
          "Esses arquivos já foram lidos. Use Refazer leitura para analisar novamente.",
        );
        return;
      }
    }
    const sourceFiles = append
      ? [
          ...lastFiles.current,
          ...files.filter(
            (file) =>
              !lastFiles.current.some(
                (old) =>
                  old.name === file.name &&
                  old.size === file.size &&
                  old.lastModified === file.lastModified,
              ),
          ),
        ]
      : files;
    if (sourceFiles.length > 10) {
      announce("Selecione no máximo 10 arquivos por vez.");
      return;
    }
    if (sourceFiles.reduce((sum, f) => sum + f.size, 0) > 100 * 1024 * 1024) {
      announce("O conjunto de arquivos deve ter até 100 MB.");
      return;
    }
    lastFiles.current = sourceFiles;
    const photo = files.find(
      (f) => /^image\//.test(f.type) || /\.(png|jpe?g|webp)$/i.test(f.name),
    );
    if (photo) setSourcePreview(URL.createObjectURL(photo));
    setBusy(true);
    if (!append) {
      setFindings([]);
      setTexts([]);
      setWarnings([]);
      setMapping({});
    }
    const abort = new AbortController();
    controller.current = abort;
    let all = append ? findings : [];
    let count = 0;
    try {
      for (const [index, file] of files.entries()) {
        if (abort.signal.aborted) break;
        setProgress(`Arquivo ${index + 1} de ${files.length}: ${file.name}`);
        try {
          const result = await readDocumentDetailed(
            file,
            (s) => setProgress(`${file.name} · ${s}`),
            { enhanced, rotation: Number(rotation), signal: abort.signal },
          );
          all = mergeFindings(all, result.findings, samePerson);
          setFindings([...all]);
          setTexts((old) => [...old, { name: file.name, text: result.text }]);
          setWarnings((old) => [
            ...old,
            ...result.warnings.map((w) => `${file.name}: ${w}`),
          ]);
          count++;
        } catch (e) {
          if (abort.signal.aborted) throw e;
          setWarnings((old) => [
            ...old,
            `${file.name}: ${e instanceof Error ? e.message : "Falha na leitura"}`,
          ]);
        }
      }
      setProgress(
        `${count} arquivo${count === 1 ? "" : "s"} lido${count === 1 ? "" : "s"}. Confira os dados antes de importar.`,
      );
    } catch (e) {
      if (abort.signal.aborted)
        setProgress(
          "Leitura cancelada. Os resultados já encontrados foram mantidos.",
        );
      else
        announce(
          e instanceof Error ? e.message : "Não foi possível ler os arquivos.",
        );
    } finally {
      setBusy(false);
      controller.current = null;
      if (upload.current) upload.current.value = "";
    }
  }
  function choose(id: string, checked: boolean) {
    const chosen = findings.find((f) => f.id === id)!;
    setFindings(
      findings.map((f) => ({
        ...f,
        selected:
          f.id === id
            ? checked
            : checked && f.group === chosen.group && f.field === chosen.field
              ? false
              : f.selected,
      })),
    );
  }
  function update(id: string, patch: Partial<Finding>) {
    setFindings(findings.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  const selected = findings.filter((f) => f.selected).length;
  return (
    <div className="scanner-workbench">
      <section className="scanner-upload-panel">
        <input
          ref={upload}
          id="scanner-upload"
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.webp,.pdf,.docx"
          hidden
          onChange={(e) =>
            void scan(Array.from(e.target.files || []), findings.length > 0)
          }
        />
        <div
          className={`dropzone ${busy ? "is-busy" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy)
              void scan(Array.from(e.dataTransfer.files), findings.length > 0);
          }}
        >
          <Scan size={42} weight="thin" />
          <h2>{busy ? "Conferindo seu documento…" : "Ler documentos"}</h2>
          <p>
            {busy ? progress : "Arraste os arquivos aqui ou selecione abaixo."}
          </p>
          <div className="scan-buttons">
            <Button disabled={busy} onClick={() => upload.current?.click()}>
              <Plus />
              {findings.length ? "Adicionar arquivos" : "Selecionar arquivos"}
            </Button>
            {busy && (
              <Button
                variant="outline"
                onClick={() => controller.current?.abort()}
              >
                <X /> Cancelar leitura
              </Button>
            )}
            {!busy && lastFiles.current.length > 0 && (
              <Button
                variant="outline"
                onClick={() => void scan(lastFiles.current)}
              >
                <ArrowClockwise /> Refazer leitura
              </Button>
            )}
          </div>
          <small>
            PNG, JPG, WEBP, PDF e DOCX · Até 10 arquivos · 20 MB por arquivo
          </small>
        </div>
        <details className="scan-options-advanced">
          <summary>Ajustes de leitura e orientação</summary>
          <div className="scan-options">
            <label>
              <Checkbox
                checked={enhanced}
                onCheckedChange={(v) => setEnhanced(v === true)}
                disabled={busy}
              />{" "}
              Leitura aprofundada{" "}
              <small>Mais tentativas para documentos difíceis</small>
            </label>
            <label>
              <Checkbox
                checked={samePerson}
                onCheckedChange={(v) => setSamePerson(v === true)}
                disabled={busy}
              />{" "}
              Juntar frente e verso da mesma pessoa
            </label>
            <label>
              Orientação da imagem
              <select
                value={rotation}
                disabled={busy}
                onChange={(e) => setRotation(e.target.value)}
              >
                <option value="0">Original</option>
                <option value="90">Girar 90°</option>
                <option value="180">Girar 180°</option>
                <option value="270">Girar 270°</option>
              </select>
            </label>
          </div>
        </details>
        {sourcePreview && (
          <details className="scan-image-preview">
            <summary>Conferir imagem e orientação</summary>
            <div>
              <img
                src={sourcePreview}
                alt="Documento selecionado para leitura"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            </div>
            <p>
              Ao mudar a orientação, use “Refazer leitura” para atualizar os
              resultados.
            </p>
          </details>
        )}
        {!busy && progress && (
          <p className="scan-complete" role="status">
            {progress}
          </p>
        )}
        {warnings.length > 0 && (
          <div className="scan-warnings" role="status">
            <strong>Atenção à leitura</strong>
            {warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}
        {texts.length > 0 && (
          <details className="source-texts">
            <summary>Conferir ou corrigir o texto extraído</summary>
            {texts.map((entry, i) => (
              <div key={i}>
                <h4>
                  <FileText size={16} />
                  {entry.name}
                </h4>
                <textarea
                  aria-label={`Texto extraído de ${entry.name}`}
                  value={entry.text}
                  onChange={(e) =>
                    setTexts(
                      texts.map((t, j) =>
                        i === j ? { ...t, text: e.target.value } : t,
                      ),
                    )
                  }
                  rows={10}
                />
                <Button
                  size="1"
                  variant="soft"
                  onClick={() => {
                    let next: Finding[] = [];
                    for (const t of texts)
                      next = mergeFindings(
                        next,
                        extract(t.text, t.name),
                        samePerson,
                      );
                    setFindings(next);
                    announce(
                      "Os campos foram analisados novamente a partir do texto corrigido.",
                    );
                  }}
                >
                  Reanalisar texto corrigido
                </Button>
              </div>
            ))}
          </details>
        )}
      </section>
      <section className="scan-review-panel">
        {findings.length > 0 && (
          <p className="scan-summary" role="status">
            {groups.filter((group) => group !== "property").length} pessoa(s)
            identificada(s) ·{" "}
            {
              new Set(
                findings
                  .filter(
                    (item) => item.field === "cpf" && validCPF(item.value),
                  )
                  .map((item) => item.value),
              ).size
            }{" "}
            CPF(s) válido(s). Confira o destino de cada pessoa abaixo.
          </p>
        )}
        <div className="scan-contract-count">
          <label>
            Doadores neste contrato
            <select
              aria-label="Quantidade de doadores no scanner"
              value={data.donorCount}
              onChange={(e) =>
                onDonorCountChange(Number(e.target.value) as 1 | 2)
              }
            >
              <option value="1">1 doador</option>
              <option value="2">2 doadores</option>
            </select>
          </label>
          <label>
            Donatários neste contrato
            <select
              aria-label="Quantidade de donatários no scanner"
              value={data.recipientCount}
              onChange={(e) => onRecipientCountChange(Number(e.target.value))}
            >
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} {i === 0 ? "donatário" : "donatários"}
                </option>
              ))}
            </select>
          </label>
          {findings.length > 0 && (
            <Button
              size="2"
              disabled={busy || !selected}
              onClick={applyResults}
            >
              <CheckCircle /> Aplicar selecionados
            </Button>
          )}
        </div>
        <div className="review-heading">
          <div>
            <h2>Revisar e preencher</h2>
            <p>
              {findings.length
                ? `${findings.length} informações encontradas. ${selected} selecionadas.`
                : "Os dados aparecem aqui durante a leitura."}
            </p>
          </div>
          {findings.length > 0 && (
            <Button
              variant="ghost"
              size="1"
              disabled={busy}
              onClick={() => {
                setFindings([]);
                setTexts([]);
                setWarnings([]);
                setProgress("");
                setMapping({});
                setSourcePreview("");
                lastFiles.current = [];
              }}
            >
              Limpar resultados
            </Button>
          )}
        </div>
        {findings.length === 0 ? (
          <div className="small-empty">
            <MagnifyingGlass size={44} weight="thin" />
            <h3>Uma pessoa por vez, tudo separado.</h3>
            <p>
              Identificação, endereço, filiação e dados da terra. Revise os
              valores e escolha o destino no contrato.
            </p>
          </div>
        ) : (
          <>
            <div className="review-filter">
              <label>
                <Checkbox
                  checked={reviewOnly}
                  onCheckedChange={(value) => setReviewOnly(value === true)}
                />
                Mostrar apenas dados com aviso ou conflito
              </label>
              <span>O filtro não altera a seleção.</span>
            </div>
            {groups.map((group, index) => {
              const items = findings.filter((f) => f.group === group);
              const name =
                items.find((f) => f.field === "name" && f.selected)?.value ||
                items.find((f) => f.field === "name")?.value;
              const property = group === "property";
              const dest = destination(group);
              return (
                <section key={group} className="scan-person">
                  <div className="scan-person-header">
                    <div>
                      <h3>
                        {property
                          ? "Informações do imóvel"
                          : name || `Pessoa ${index + 1}`}
                      </h3>
                      <span>
                        {property
                          ? "Preenchimento dos dados da terra"
                          : "Confira se todos os campos abaixo pertencem a esta pessoa."}
                      </span>
                    </div>
                    {!property && (
                      <label>
                        Usar no contrato como
                        <select
                          value={dest}
                          onChange={(e) =>
                            setMapping({
                              ...mapping,
                              [group]: e.target.value as PersonKey,
                            })
                          }
                        >
                          {activePeople(data).map((key) => (
                            <option key={key} value={key}>
                              {personLabels[key]}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <div className="group-selection">
                    <span>
                      {items.filter((item) => item.selected).length} de{" "}
                      {items.length} campos selecionados
                    </span>
                    <Button
                      variant="ghost"
                      size="1"
                      disabled={busy}
                      onClick={() => {
                        const select = !items.every((item) => item.selected);
                        setFindings((old) =>
                          old.map((item) =>
                            item.group === group
                              ? { ...item, selected: select }
                              : item,
                          ),
                        );
                      }}
                    >
                      {items.every((item) => item.selected)
                        ? "Desmarcar pessoa"
                        : "Selecionar pessoa"}
                    </Button>
                  </div>
                  <div className="finding-list">
                    {items.map((item) => {
                      const existing = property
                        ? String(
                            (data as unknown as Record<string, unknown>)[
                              item.field
                            ] || "",
                          )
                        : String(
                            data[dest][
                              item.field as keyof typeof data.recipient
                            ] || "",
                          );
                      if (
                        reviewOnly &&
                        !item.warning &&
                        !(existing && existing !== item.value)
                      )
                        return null;
                      return (
                        <div
                          className={`finding-row ${item.warning ? "needs-review" : ""}`}
                          key={item.id}
                        >
                          <Checkbox
                            aria-label={`Importar ${item.label}: ${item.value}`}
                            checked={item.selected}
                            disabled={busy}
                            onCheckedChange={(v) => choose(item.id, v === true)}
                          />
                          <div className="finding-content">
                            <div className="finding-title">
                              <select
                                aria-label={`Campo para ${item.value}`}
                                value={item.field}
                                disabled={busy}
                                onChange={(e) =>
                                  update(item.id, {
                                    field: e.target.value,
                                    label:
                                      [...personFields, ...landFields].find(
                                        ([k]) => k === e.target.value,
                                      )?.[1] || e.target.value,
                                  })
                                }
                              >
                                {(property
                                  ? landFields
                                  : ([
                                      ...personFields,
                                      ["address", "Endereço completo"],
                                    ] as [string, string][])
                                ).map(([field, label]) => (
                                  <option key={field} value={field}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                              {item.field === "cpf" && validCPF(item.value) && (
                                <span className="cpf-valid">
                                  <CheckCircle size={14} />
                                  CPF válido
                                </span>
                              )}
                            </div>
                            <TextField.Root
                              aria-label={item.label}
                              disabled={busy}
                              value={item.value}
                              onChange={(e) => {
                                const value =
                                  item.field === "cpf"
                                    ? formatCPF(e.target.value)
                                    : e.target.value;
                                update(item.id, {
                                  value,
                                  ...(item.field === "cpf"
                                    ? {
                                        warning: validCPF(value)
                                          ? undefined
                                          : "CPF inválido. Confira os números no documento.",
                                      }
                                    : {}),
                                });
                              }}
                            />
                            {item.warning && (
                              <small className="review-warning">
                                {item.warning}
                              </small>
                            )}
                            {existing && existing !== item.value && (
                              <small className="existing-value">
                                Já preenchido: {existing}
                                {!overwrite ? " · Será mantido." : ""}
                              </small>
                            )}
                            <details>
                              <summary>
                                Ver origem
                                {item.source ? " · " + item.source : ""}
                              </summary>
                              <p>{item.context}</p>
                            </details>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="1"
                    onClick={() =>
                      setFindings([
                        ...findings,
                        {
                          id: crypto.randomUUID(),
                          field: property ? "land" : "name",
                          label: property ? "Nome da terra" : "Nome completo",
                          value: "",
                          selected: false,
                          confidence: 0,
                          group,
                          context: "Adicionado manualmente",
                        },
                      ])
                    }
                  >
                    <Plus /> Completar informação manualmente
                  </Button>
                </section>
              );
            })}
            <div className="scan-apply">
              <label>
                <Checkbox
                  checked={overwrite}
                  onCheckedChange={(v) => setOverwrite(v === true)}
                />{" "}
                Substituir os campos que já estão preenchidos
              </label>
              <p>
                Sem esta opção, apenas campos vazios recebem os dados
                selecionados.
              </p>
              <Button disabled={busy || !selected} onClick={applyResults}>
                <CheckCircle /> Aplicar {selected} campo
                {selected === 1 ? "" : "s"} no contrato
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
