export const STYLE_COOKIE = "studymap-style";

export const APP_STYLES = [
  {
    id: "corsia",
    name: "Corsia",
    description: "Blu ospedaliero, superfici chiare e concetti a capsula.",
    colors: ["blu", "pesca", "azzurro", "menta", "grigio"],
  },
  {
    id: "evidenziatore",
    name: "Evidenziatore",
    description: "Colori da evidenziatore, contorni a inchiostro e titoli decisi.",
    colors: ["giallo", "menta", "lilla", "corallo", "carta"],
  },
] as const;

export type AppStyle = (typeof APP_STYLES)[number]["id"];
