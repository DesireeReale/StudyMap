export type SectionSlug = "mappe" | "flashcard" | "quiz" | "riassunti" | "documenti";

export const SECTIONS: { slug: SectionSlug; label: string; one: string; detail: string; prefixes: string[] }[] = [
  { slug: "mappe", label: "Mappe", one: "mappa concettuale", detail: "mappe concettuali", prefixes: ["/maps"] },
  { slug: "flashcard", label: "Flashcard", one: "mazzo di flashcard", detail: "mazzi di flashcard", prefixes: ["/decks"] },
  { slug: "quiz", label: "Quiz", one: "quiz", detail: "quiz", prefixes: ["/quizzes"] },
  { slug: "riassunti", label: "Riassunti", one: "riassunto", detail: "riassunti", prefixes: [] },
  { slug: "documenti", label: "Documenti", one: "documento caricato", detail: "documenti caricati", prefixes: ["/documents"] },
];

export const SUMMARY_PREFIX = "Riassunto · ";

export const isSummary = (title: string) => title.startsWith(SUMMARY_PREFIX);

export const sectionHref = (slug: SectionSlug) => `/studia/${slug}`;
