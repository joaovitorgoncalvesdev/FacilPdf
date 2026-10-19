import { extract, mergeFindings, type Finding } from "./extraction";
import { validCPF } from "./model";
export { extract, mergeFindings, type Finding } from "./extraction";
export type ReadOptions = {
  rotation?: number;
  enhanced?: boolean;
  signal?: AbortSignal;
};
export type ReadResult = {
  text: string;
  findings: Finding[];
  warnings: string[];
  pages: number;
  confidence?: number;
};
const abort = (signal?: AbortSignal) => {
  if (signal?.aborted)
    throw new DOMException("Leitura cancelada", "AbortError");
};
function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}
async function prepareImage(input: File | HTMLCanvasElement, rotation = 0) {
  const bitmap = input instanceof File ? await createImageBitmap(input) : input;
  try {
    const angle = ((rotation % 360) + 360) % 360;
    const swap = angle === 90 || angle === 270;
    const sourceW = swap ? bitmap.height : bitmap.width,
      sourceH = swap ? bitmap.width : bitmap.height;
    const scale = Math.min(
      2.8,
      Math.max(1, 2300 / Math.max(sourceW, sourceH)),
      Math.sqrt(8000000 / (sourceW * sourceH)),
    );
    const canvas = createCanvas(sourceW * scale + 40, sourceH * scale + 40);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(
      bitmap,
      (-bitmap.width * scale) / 2,
      (-bitmap.height * scale) / 2,
      bitmap.width * scale,
      bitmap.height * scale,
    );
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return canvas;
  } finally {
    if (bitmap instanceof ImageBitmap) bitmap.close();
  }
}
function enhance(canvas: HTMLCanvasElement, adaptive = false) {
  const output = createCanvas(canvas.width, canvas.height);
  const ctx = output.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(canvas, 0, 0);
  const image = ctx.getImageData(0, 0, output.width, output.height);
  const pixels = image.data,
    count = output.width * output.height;
  const gray = new Uint8Array(count),
    histogram = new Uint32Array(256);
  for (let i = 0; i < count; i++) {
    const j = i * 4;
    gray[i] = Math.round(
      0.299 * pixels[j] + 0.587 * pixels[j + 1] + 0.114 * pixels[j + 2],
    );
    histogram[gray[i]]++;
  }
  let low = 0,
    high = 255,
    cum = 0;
  for (let i = 0; i < 256; i++) {
    cum += histogram[i];
    if (cum > count * 0.01) {
      low = i;
      break;
    }
  }
  cum = 0;
  for (let i = 255; i >= 0; i--) {
    cum += histogram[i];
    if (cum > count * 0.01) {
      high = i;
      break;
    }
  }
  const range = Math.max(35, high - low);
  let integral: Uint32Array | undefined;
  const width = output.width,
    height = output.height,
    stride = width + 1;
  if (adaptive) {
    integral = new Uint32Array((width + 1) * (height + 1));
    for (let y = 0; y < height; y++) {
      let row = 0;
      for (let x = 0; x < width; x++) {
        row += gray[y * width + x];
        integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
      }
    }
  }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let value = Math.max(0, Math.min(255, ((gray[i] - low) * 255) / range));
      if (integral) {
        const x0 = Math.max(0, x - 24),
          x1 = Math.min(width, x + 25),
          y0 = Math.max(0, y - 24),
          y1 = Math.min(height, y + 25);
        const mean =
          (integral[y1 * stride + x1] -
            integral[y0 * stride + x1] -
            integral[y1 * stride + x0] +
            integral[y0 * stride + x0]) /
          ((x1 - x0) * (y1 - y0));
        value = gray[i] < mean * 0.91 ? 0 : 255;
      }
      const j = i * 4;
      pixels[j] = pixels[j + 1] = pixels[j + 2] = value;
      pixels[j + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  return output;
}
export function textQuality(text: string) {
  const fields = extract(text);
  return (
    fields.reduce(
      (score, f) =>
        score +
        (f.field === "cpf" && validCPF(f.value)
          ? 35
          : f.field === "name"
            ? 8
            : f.field === "birth"
              ? 9
              : f.field === "rg"
                ? 7
                : 2),
      0,
    ) +
    Math.min(text.replace(/\s/g, "").length, 1200) / 120
  );
}
export async function readDocumentDetailed(
  file: File,
  onProgress: (s: string) => void,
  options: ReadOptions = {},
): Promise<ReadResult> {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("O limite é 20 MB por arquivo.");
  abort(options.signal);
  const extension = file.name.split(".").pop()?.toLowerCase();
  const warnings: string[] = [];
  let worker:
    Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | undefined;
  const onAbort = () => {
    void worker?.terminate();
  };
  options.signal?.addEventListener("abort", onAbort, { once: true });
  async function recognize(
    input: File | HTMLCanvasElement,
  ): Promise<{ text: string; findings: Finding[]; confidence: number }> {
    abort(options.signal);
    if (!worker) {
      onProgress("Carregando o leitor de documentos…");
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("por+eng", 1, {
        workerPath: `${import.meta.env.BASE_URL}ocr/v3/worker.min.js`,
        corePath: `${import.meta.env.BASE_URL}ocr/v3`,
        langPath: `${import.meta.env.BASE_URL}ocr/v3`,
        cachePath: "facilpdf-best-v2",
        logger: (m) => {
          if (m.status === "recognizing text")
            onProgress(`Reconhecendo texto: ${Math.round(m.progress * 100)}%`);
        },
      });
      await worker.setParameters({
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
    }
    const original = await prepareImage(input, options.rotation || 0);
    const normalized = enhance(original);
    const passes: { text: string; confidence: number; score: number }[] = [];
    const run = async (canvas: HTMLCanvasElement, mode: "3" | "6" | "11") => {
      abort(options.signal);
      await worker!.setParameters({
        tessedit_pageseg_mode: mode as import("tesseract.js").PSM,
      });
      const r = await worker!.recognize(canvas, { rotateAuto: true });
      passes.push({
        text: r.data.text,
        confidence: r.data.confidence,
        score: textQuality(r.data.text) + r.data.confidence / 12,
      });
    };
    try {
      onProgress("Leitura principal com correção de contraste…");
      await run(normalized, "3");
      if (options.enhanced !== false) {
        onProgress("Conferindo campos com uma segunda leitura…");
        await run(original, "11");
        const best = Math.max(...passes.map((p) => p.confidence));
        const found = passes.flatMap((pass) => extract(pass.text));
        const missingName = !found.some(
          (field) => field.field === "name" && !field.warning,
        );
        const missingBirth =
          /NASC(?:IMENTO|ID[OA])|BIRTH|DATA E LOCAL/i.test(
            passes.map((pass) => pass.text).join(" "),
          ) &&
          !found.some((field) => field.field === "birth" && !field.warning);
        if (
          best < 80 ||
          missingName ||
          missingBirth ||
          !passes.some((p) =>
            extract(p.text).some((f) => f.field === "cpf" && !f.warning),
          )
        ) {
          onProgress("Reforçando a leitura de sombras e texto pequeno…");
          const adaptive = enhance(original, true);
          try {
            await run(adaptive, "6");
          } finally {
            adaptive.width = 0;
          }
        }
        if (
          Math.max(...passes.map((p) => p.score)) < 12 ||
          !passes.some((pass) =>
            extract(pass.text).some(
              (field) =>
                field.field === "name" ||
                (field.field === "cpf" && validCPF(field.value)),
            ),
          )
        ) {
          onProgress("Conferindo orientação da imagem…");
          for (const rotation of [90, 180, 270]) {
            const rotated = await prepareImage(original, rotation);
            try {
              await run(rotated, "3");
            } finally {
              rotated.width = 0;
            }
            if (Math.max(...passes.map((p) => p.score)) > 25) break;
          }
        }
      }
      passes.sort((a, b) => b.score - a.score);
      let findings = extract(passes[0].text, file.name);
      for (const p of passes.slice(1))
        findings = mergeFindings(
          findings,
          extract(p.text, file.name),
          true,
          true,
        );
      return {
        text: passes[0].text,
        findings,
        confidence: passes[0].confidence,
      };
    } finally {
      original.width = 0;
      normalized.width = 0;
    }
  }
  try {
    if (extension === "docx") {
      onProgress("Lendo parágrafos, tabelas e imagens do Word…");
      const mammoth = await import("mammoth");
      const buffer = await file.arrayBuffer();
      const raw = (await mammoth.extractRawText({ arrayBuffer: buffer })).value;
      let findings = extract(raw, file.name),
        text = raw;
      // Read embedded scans, not just the surrounding Word paragraphs.
      const { default: PizZip } = await import("pizzip");
      const zip = new PizZip(buffer);
      const images = Object.values(zip.files).filter(
        (f) => /^word\/media\/.*\.(png|jpe?g)$/i.test(f.name) && !f.dir,
      );
      if (images.length > 12)
        warnings.push(
          "O Word tem muitas imagens. Foram lidas as primeiras 12.",
        );
      let expanded = 0;
      for (const image of images.slice(0, 12)) {
        abort(options.signal);
        const declared =
          (image as unknown as { _data?: { uncompressedSize?: number } })._data
            ?.uncompressedSize || 0;
        expanded += declared;
        if (expanded > 30 * 1024 * 1024) {
          warnings.push("Imagens internas excedem o limite de leitura.");
          break;
        }
        const bytes = image.asUint8Array();
        const result = await recognize(
          new File([new Uint8Array(bytes)], image.name, {
            type: /png$/i.test(image.name) ? "image/png" : "image/jpeg",
          }),
        );
        text += "\n" + result.text;
        findings = mergeFindings(
          findings,
          result.findings,
          images.length === 1,
        );
      }
      if (!text.trim())
        throw new Error("Não foi encontrado texto legível neste Word.");
      return { text, findings, warnings, pages: 1 };
    }
    if (["png", "jpg", "jpeg", "webp"].includes(extension || "")) {
      const result = await recognize(file);
      if (result.confidence < 65)
        warnings.push(
          "Leitura com baixa confiança. Confira a foto e os campos sinalizados.",
        );
      if (!result.text.trim())
        warnings.push(
          "Não foi encontrado texto legível. Experimente girar a imagem ou aproximar o documento.",
        );
      return { ...result, warnings, pages: 1 };
    }
    if (extension === "pdf") {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).href;
      const task = pdfjs.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
      });
      const doc = await task.promise;
      try {
        if (doc.numPages > 30)
          throw new Error("Use um PDF com até 30 páginas.");
        let text = "",
          findings: Finding[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          abort(options.signal);
          onProgress(`Lendo página ${i} de ${doc.numPages}…`);
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          // Rebuild visual rows by coordinates. Stream order often scrambles identity cards.
          const items = content.items.filter(
            (x): x is import("pdfjs-dist/types/src/display/api").TextItem =>
              "str" in x,
          );
          const rows: { y: number; items: typeof items }[] = [];
          for (const item of items) {
            const y = item.transform[5];
            let row = rows.find(
              (r) => Math.abs(r.y - y) < Math.max(2, item.height * 0.35),
            );
            if (!row) {
              row = { y, items: [] };
              rows.push(row);
            }
            row.items.push(item);
          }
          rows.sort((a, b) => b.y - a.y);
          const direct = rows
            .map((row) =>
              row.items
                .sort((a, b) => a.transform[4] - b.transform[4])
                .map((x) => x.str)
                .join(" "),
            )
            .join("\n");
          let pageText = direct,
            pageFindings = extract(direct, `${file.name} · p. ${i}`);
          const hasImage = Boolean(
            (await page.getOperatorList()).fnArray.some((op) =>
              [
                pdfjs.OPS.paintImageXObject,
                pdfjs.OPS.paintInlineImageXObject,
                pdfjs.OPS.paintImageMaskXObject,
              ].includes(op),
            ),
          );
          if (
            direct.replace(/\s/g, "").length < 80 ||
            (hasImage &&
              !pageFindings.some((f) => f.field === "cpf" && !f.warning)) ||
            textQuality(direct) < 5 ||
            (hasImage &&
              options.enhanced !== false &&
              !pageFindings.some((f) => f.field === "name" && !f.warning))
          ) {
            const base = page.getViewport({ scale: 1 });
            const scale = Math.min(
              3,
              Math.sqrt(8000000 / (base.width * base.height)),
            );
            const viewport = page.getViewport({ scale });
            const canvas = createCanvas(viewport.width, viewport.height);
            try {
              await page.render({
                canvas,
                canvasContext: canvas.getContext("2d")!,
                viewport,
              }).promise;
              const result = await recognize(canvas);
              if (textQuality(result.text) > textQuality(direct))
                pageText = result.text;
              pageFindings = mergeFindings(pageFindings, result.findings, true);
              if (result.confidence < 60)
                warnings.push(`Página ${i}: baixa confiança no OCR.`);
            } finally {
              canvas.width = 0;
            }
          }
          text += pageText + "\n\n";
          findings = mergeFindings(findings, pageFindings, doc.numPages <= 2);
          page.cleanup();
        }
        return { text, findings, warnings, pages: doc.numPages };
      } finally {
        await doc.destroy();
      }
    }
    throw new Error("Escolha PNG, JPG, WEBP, PDF ou DOCX.");
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
    await worker?.terminate().catch(() => {});
  }
}
export async function readDocument(
  file: File,
  onProgress: (s: string) => void,
  options: ReadOptions = {},
) {
  return (await readDocumentDetailed(file, onProgress, options)).text;
}
export const personKeys = new Set([
  "name",
  "cpf",
  "rg",
  "issuer",
  "issuerState",
  "address",
  "street",
  "number",
  "district",
  "city",
  "state",
  "postalCode",
  "complement",
  "birth",
  "birthCity",
  "birthState",
  "mother",
  "father",
  "marital",
  "nationality",
  "occupation",
]);
