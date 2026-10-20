const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function sameAnswer(typed: string, answer: string): boolean {
  const t = normalize(typed);
  return t.length > 0 && answer.split("/").some((a) => normalize(a) === t);
}
