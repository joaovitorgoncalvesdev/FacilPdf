import PizZip from "pizzip";
import { saveRecord, type RecordEntry } from "./storage";
import { validate, normalizeForm } from "./model";
export async function exportBackup(records: RecordEntry[]) {
  const zip = new PizZip();
  const items = [];
  for (const record of records) {
    zip.file(`${record.id}.pdf`, await record.pdf.arrayBuffer());
    const { pdf, ...metadata } = record;
    items.push(metadata);
  }
  zip.file("manifest.json", JSON.stringify({ version: 1, records: items }));
  return zip.generate({ type: "blob", mimeType: "application/zip" });
}
export async function restoreBackup(file: File) {
  if (file.size > 100 * 1024 * 1024) throw new Error("Backup muito grande");
  const zip = new PizZip(await file.arrayBuffer());
  const manifest = JSON.parse(zip.file("manifest.json")?.asText() || "{}");
  if (
    manifest.version !== 1 ||
    !Array.isArray(manifest.records) ||
    manifest.records.length > 500
  )
    throw new Error("Backup inválido");
  const verified = [];
  for (const record of manifest.records) {
    if (!record.data || validate(normalizeForm(record.data)).length)
      throw new Error("Dados inválidos");
    const item = zip.file(`${record.id}.pdf`);
    if (!item) throw new Error("PDF ausente");
    const bytes = item.asUint8Array();
    if (
      bytes.byteLength > 20 * 1024 * 1024 ||
      new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
    )
      throw new Error("PDF inválido");
    verified.push({
      data: normalizeForm(record.data),
      pdf: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    });
  }
  for (const record of verified) await saveRecord(record.data, record.pdf);
}
