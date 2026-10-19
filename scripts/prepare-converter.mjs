import { readFile, writeFile, mkdir } from "node:fs/promises";
import PizZip from "pizzip";
const zip = new PizZip();
for (const file of [
  "ABRIR-SITE.cmd",
  "iniciar-online.ps1",
  "server/server.mjs",
  "server/convert-word.ps1",
]) {
  const bytes = await readFile(file);
  zip.file(
    file,
    file.endsWith(".ps1")
      ? Buffer.concat([
          Buffer.from([239, 187, 191]),
          bytes[0] === 239 ? bytes.subarray(3) : bytes,
        ])
      : bytes,
  );
}
zip.file(
  "package.json",
  JSON.stringify(
    {
      name: "facilpdf-conversor-local",
      private: true,
      type: "module",
      dependencies: { pizzip: "3.2.0" },
    },
    null,
    2,
  ),
);
zip.file(
  "LEIA-ME.txt",
  "CONVERSOR LOCAL DO FACILPDF\r\n\r\n1. Requer Windows, Microsoft Word instalado e Node.js 22 LTS com npm (https://nodejs.org/).\r\n2. Extraia todos os arquivos antes de abrir ABRIR-SITE.cmd. Na primeira vez, as dependencias sao instaladas.\r\n3. Mantenha a janela aberta durante o uso do site. Permita acesso a rede local quando o navegador pedir.\r\n4. No site clique em Verificar conexao, depois gere a previa ou salve o PDF.\r\n\r\nO Word gera o PDF neste computador. O conversor atende somente em 127.0.0.1. Nao envia contratos a hospedagem.\r\n",
);
await mkdir("public/downloads", { recursive: true });
await writeFile(
  "public/downloads/Conversor-FacilPDF.zip",
  zip.generate({ type: "nodebuffer", compression: "DEFLATE" }),
);
console.log("Conversor local pronto para download.");
