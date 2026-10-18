import { mkdir, copyFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";
const target = path.resolve("public/ocr/v3");
await mkdir(target, { recursive: true });
await copyFile(
  "node_modules/tesseract.js/dist/worker.min.js",
  path.join(target, "worker.min.js"),
);
for (const name of await readdir("node_modules/tesseract.js-core"))
  if (/-lstm\.wasm(?:\.js)?$/.test(name))
    await copyFile(
      path.join("node_modules/tesseract.js-core", name),
      path.join(target, name),
    );
for (const lang of ["por", "eng"])
  await copyFile(
    `node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`,
    path.join(target, `${lang}.traineddata.gz`),
  );
console.log("OCR local pronto: português, inglês e WebAssembly.");
for (const entry of await readdir("public/ocr", { withFileTypes: true }))
  if (
    entry.isFile() &&
    /^(?:worker\.min\.js|tesseract-core.*\.wasm(?:\.js)?|(?:por|eng)\.traineddata\.gz)$/.test(
      entry.name,
    )
  )
    await unlink(path.join("public/ocr", entry.name));
