import { openDB } from "idb";
import type { FormData } from "./model";
export type RecordEntry = {
  id: string;
  name: string;
  land: string;
  createdAt: string;
  data: FormData;
  pdf: Blob;
};
const db = openDB("facilpdf", 1, {
  upgrade(db) {
    db.createObjectStore("documents", { keyPath: "id" });
    db.createObjectStore("settings");
  },
});
export async function listRecords(): Promise<RecordEntry[]> {
  return (await (await db).getAll("documents")).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}
export async function saveRecord(data: FormData, pdf: Blob) {
  const record: RecordEntry = {
    id: crypto.randomUUID(),
    name: data.recipient.name,
    land: data.land,
    createdAt: new Date().toISOString(),
    data: structuredClone(data),
    pdf,
  };
  await (await db).put("documents", record);
  return record;
}
export async function deleteRecord(id: string) {
  await (await db).delete("documents", id);
}
export async function saveDraft(data: FormData) {
  await (await db).put("settings", data, "draft");
}
export async function loadDraft(): Promise<FormData | undefined> {
  return (await db).get("settings", "draft");
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
