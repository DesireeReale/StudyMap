import { getDocumentProxy } from "unpdf";

export const RENDER_SCALE = 1.5;

export type Pdf = Awaited<ReturnType<typeof getDocumentProxy>>;

export const openPdf = (bytes: ArrayBuffer | Uint8Array) => getDocumentProxy(new Uint8Array(bytes.slice(0)));

export async function renderPage(pdf: Pdf, pageNumber: number, scale = RENDER_SCALE): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas;
}
