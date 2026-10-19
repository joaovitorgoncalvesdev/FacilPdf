import { useEffect, useRef, useState } from "react";
import { Button } from "@radix-ui/themes";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import type { PDFDocumentProxy } from "pdfjs-dist";
export default function PdfPreview({ blob }: { blob: Blob }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(400);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | undefined;
    let task: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
    setDocument(undefined);
    setPage(1);
    setError("");
    setLoading(true);
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).href;
      if (cancelled) return;
      task = pdfjs.getDocument({
        data: new Uint8Array(await blob.arrayBuffer()),
      });
      loaded = await task.promise;
      if (!cancelled) setDocument(loaded);
    })().catch(() => {
      if (!cancelled) {
        setError(
          "Não foi possível mostrar a prévia. Você ainda pode abrir ou baixar o PDF original.",
        );
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [blob]);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(100, entries[0].contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let cancelled = false;
    let render: import("pdfjs-dist").RenderTask | undefined;
    setLoading(true);
    setError("");
    (async () => {
      const pdfPage = await document.getPage(page);
      if (cancelled || !canvas.current) return;
      const natural = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(width, 1000) / natural.width;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({ scale: scale * ratio });
      const target = canvas.current;
      target.width = Math.ceil(viewport.width);
      target.height = Math.ceil(viewport.height);
      target.style.width = `${viewport.width / ratio}px`;
      target.style.height = `${viewport.height / ratio}px`;
      render = pdfPage.render({
        canvas: target,
        viewport,
        background: "white",
      });
      await render.promise;
      if (!cancelled) setLoading(false);
    })().catch((error) => {
      if (!cancelled && error.name !== "RenderingCancelledException") {
        setError(
          "A página não pôde ser exibida. Abra o PDF original para conferir.",
        );
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      render?.cancel();
    };
  }, [document, page, width]);
  return (
    <div
      className="pdf-viewer"
      aria-label="PDF gerado a partir do Word original"
    >
      {document && (
        <div className="pdf-navigation">
          <Button
            variant="soft"
            size="1"
            aria-label="Página anterior do PDF"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <CaretLeft />
          </Button>
          <span aria-live="polite">
            Página {page} de {document.numPages}
          </span>
          <Button
            variant="soft"
            size="1"
            aria-label="Próxima página do PDF"
            disabled={page === document.numPages}
            onClick={() => setPage(page + 1)}
          >
            <CaretRight />
          </Button>
        </div>
      )}
      {loading && <p role="status">Carregando página…</p>}
      {error && <p role="alert">{error}</p>}
      <div ref={container} className="pdf-canvas-stage">
        <canvas
          ref={canvas}
          aria-label={`Página ${page} do documento`}
          hidden={!!error}
        />
      </div>
    </div>
  );
}
