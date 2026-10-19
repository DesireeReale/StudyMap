export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkPages(pages: string[], maxTokens: number): string[] {
  const maxChars = maxTokens * 4;
  const chunks: string[] = [];
  let current = "";

  pages.forEach((page, i) => {
    const text = page.trim();
    if (!text) return;
    const block = `[Pagina ${i + 1}]\n${text}\n\n`;
    for (let start = 0; start < block.length; start += maxChars) {
      const piece = block.slice(start, start + maxChars);
      if (current && current.length + piece.length > maxChars) {
        chunks.push(current);
        current = "";
      }
      current += piece;
    }
  });
  if (current) chunks.push(current);
  return chunks;
}
