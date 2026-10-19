import http from "node:http";
import { readFile, writeFile, mkdtemp, rm, access } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import PizZip from "pizzip";
const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.CONVERTER_PORT || 8788);
const word =
  process.platform === "win32" &&
  [
    String.raw`C:\Program Files (x86)\Microsoft Office\root\Office16\WINWORD.EXE`,
    String.raw`C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE`,
  ].some(existsSync);
const office = process.env.SOFFICE_PATH || "/usr/bin/libreoffice";
const ready = word || existsSync(office);
const origins = new Set(
  [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5174",
    "http://localhost:5174",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
    "https://joaovitorgoncalvesdev.github.io",
    process.env.APP_ORIGIN,
  ].filter(Boolean),
);
let active = 0;
function allowedOrigin(origin) {
  if (origins.has(origin)) return true;
  try {
    const list = JSON.parse(
      readFileSync(
        path.join(root, ".local", "allowed-origins.json"),
        "utf8",
      ).replace(/^\uFEFF/, ""),
    );
    return Array.isArray(list) && list.includes(origin);
  } catch {
    return false;
  }
}
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
  };
  if (allowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  const send = (code, body, type = "application/json") => {
    res.writeHead(code, { ...headers, "Content-Type": type });
    res.end(body);
  };
  if (req.method === "GET" && req.url === "/health")
    return send(
      200,
      JSON.stringify({
        app: "facilpdf",
        ready,
        engine: word ? "Microsoft Word" : "LibreOffice",
      }),
    );
  if (!allowedOrigin(origin))
    return send(403, '{"error":"Origin not allowed"}');
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...headers,
      "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Private-Network": "true",
    });
    return res.end();
  }
  if (req.method !== "POST" || req.url !== "/convert") return send(404, "{}");
  if (!ready) return send(503, '{"error":"Conversion engine unavailable"}');
  if (active >= 1) return send(429, '{"error":"Try again shortly"}');
  if (Number(req.headers["content-length"]) > 10 * 1024 * 1024)
    return send(413, "{}");
  active++;
  let folder;
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 10 * 1024 * 1024) {
        send(413, "{}");
        req.destroy();
        return;
      }
      chunks.push(chunk);
    }
    const input = new Request("http://localhost/convert", {
      method: "POST",
      headers: { "Content-Type": req.headers["content-type"] || "" },
      body: Buffer.concat(chunks),
    });
    const form = await input.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return send(400, "{}");
    const bytes = Buffer.from(await file.arrayBuffer());
    const zip = new PizZip(bytes);
    if (!zip.file("word/document.xml")) return send(400, "{}");
    let expanded = 0;
    for (const entry of Object.values(zip.files)) {
      expanded += entry._data?.uncompressedSize || 0;
      if (expanded > 40 * 1024 * 1024 || /vbaProject/i.test(entry.name))
        return send(400, "{}");
    }
    for (const entry of Object.values(zip.files)) {
      if (
        entry.name.endsWith(".rels") &&
        /TargetMode\s*=\s*["']External["']/i.test(entry.asText())
      )
        return send(400, '{"error":"External relationships refused"}');
    }
    folder = await mkdtemp(path.join(os.tmpdir(), "facilpdf-"));
    const docx = path.join(folder, "documento.docx"),
      pdf = path.join(folder, "documento.pdf");
    await writeFile(docx, bytes);
    if (word)
      await run(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          path.join(root, "server", "convert-word.ps1"),
          "-InputFile",
          docx,
          "-OutputFile",
          pdf,
        ],
        { timeout: 75000, windowsHide: true },
      );
    else
      await run(
        office,
        [
          "--headless",
          "--nologo",
          "--nodefault",
          "--norestore",
          `-env:UserInstallation=file://${folder.replaceAll("\\", "/")}/profile`,
          "--convert-to",
          "pdf:writer_pdf_Export",
          "--outdir",
          folder,
          docx,
        ],
        { timeout: 75000 },
      );
    const output = await readFile(pdf);
    if (output.subarray(0, 5).toString() !== "%PDF-")
      throw Error("Invalid PDF");
    send(200, output, "application/pdf");
  } catch (error) {
    console.error("Conversão falhou:", error.code || error.name);
    if (!res.headersSent) send(500, '{"error":"Conversion failed"}');
  } finally {
    active--;
    if (folder)
      await rm(folder, { recursive: true, force: true }).catch(() => {});
  }
});
server.requestTimeout = 90000;
server.headersTimeout = 10000;
server.listen(port, process.env.CONVERTER_HOST || "127.0.0.1", () =>
  console.log(
    `Conversor: http://127.0.0.1:${port} | ${word ? "Microsoft Word" : "LibreOffice"} | ${ready ? "pronto" : "motor não encontrado"}`,
  ),
);
