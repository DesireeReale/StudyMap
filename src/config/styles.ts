export const STYLE_COOKIE = "studymap-style";

export const APP_STYLES = [
  {
    id: "corsia",
    name: "Corsia",
    description: "Blu calmo, superfici chiare e concetti a capsula.",
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

export const FONTS = [
  { id: "stile", name: "Quello dello stile" },
  { id: "lexend", name: "Lexend" },
  { id: "atkinson", name: "Atkinson Hyperlegible Next" },
  { id: "bricolage", name: "Bricolage Grotesque" },
] as const;

export const TEXT_SIZES = [
  { id: "normale", name: "Normale" },
  { id: "grande", name: "Grande" },
  { id: "molto-grande", name: "Molto grande" },
] as const;

export const SPACINGS = [
  { id: "normale", name: "Normale" },
  { id: "ampia", name: "Ampia" },
] as const;

export const FOLDER_COLORS = ["folder-1", "folder-2", "folder-3", "folder-4", "folder-5", "folder-6"] as const;

export const FOLDER_ICONS = [
  { id: "folder", name: "Cartella" },
  { id: "book", name: "Libro" },
  { id: "flask", name: "Laboratorio" },
  { id: "scale", name: "Diritto" },
  { id: "calc", name: "Calcolo" },
  { id: "code", name: "Codice" },
  { id: "heart", name: "Salute" },
  { id: "globe", name: "Lingue e mondo" },
] as const;

export type FolderColor = (typeof FOLDER_COLORS)[number];
export type FolderIcon = (typeof FOLDER_ICONS)[number]["id"];
