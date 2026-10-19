export const converterUrl = (
  (import.meta.env.VITE_CONVERTER_URL as string | undefined) ||
  "http://127.0.0.1:8788"
).replace(/\/$/, "");
export async function checkConverter() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`${converterUrl}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(
        "O conversor local recusou a conexão. Reabra ABRIR-SITE.cmd.",
      );
    const result = await response.json();
    if (result.app !== "facilpdf" || !result.ready)
      throw new Error(
        "O Word não está disponível no conversor. Confira a instalação do Microsoft Word.",
      );
    return result.engine as string;
  } catch (error) {
    if (
      error instanceof Error &&
      !["TypeError", "AbortError"].includes(error.name)
    )
      throw error;
    throw new Error(
      "Word local desconectado. Abra ABRIR-SITE.cmd neste computador e permita o acesso à rede local quando o navegador solicitar. Depois clique em Verificar conexão.",
    );
  } finally {
    clearTimeout(timer);
  }
}
