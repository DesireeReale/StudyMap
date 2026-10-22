import { extractText, getDocumentProxy } from "unpdf";
import { MIN_PAGE_CHARS } from "@/core/files";

export const RENDER_SCALE = 1.5;
export const SCAN_JPEG_QUALITY = 0.5;

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

export async function scannedPages(pdf: Pdf): Promise<boolean[]> {
  const { text } = await extractText(pdf, { mergePages: false });
  return text.map((t) => t.trim().length < MIN_PAGE_CHARS);
}

export async function rebuildAsJpeg(
  pdf: Pdf,
  range: { from: number; to: number },
  onPage: (done: number, total: number) => void,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  let out: InstanceType<typeof jsPDF> | null = null;
  const total = range.to - range.from + 1;
  for (let n = range.from; n <= range.to; n++) {
    onPage(n - range.from, total);
    const size = (await pdf.getPage(n)).getViewport({ scale: 1 });
    const format: [number, number] = [size.width, size.height];
    const orientation = size.width > size.height ? "landscape" : "portrait";
    const canvas = await renderPage(pdf, n);
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", SCAN_JPEG_QUALITY));
    if (!jpeg) throw new Error("JPEG encoding failed");
    if (out) out.addPage(format, orientation);
    else out = new jsPDF({ unit: "pt", format, orientation, compress: true });
    out.addImage(new Uint8Array(await jpeg.arrayBuffer()), "JPEG", 0, 0, size.width, size.height);
    canvas.width = canvas.height = 0;
  }
  onPage(total, total);
  return out!.output("blob");
}
