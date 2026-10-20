export type JobStatus = "queued" | "running" | "done" | "error";
export type JobType = "ingest" | "mindmap" | "flashcards" | "summary" | "quiz";
export type JobPhase = "queued" | "read" | "transcribe" | "generate" | "merge" | "done" | "error";
export type Progress = (phase: JobPhase, done?: number, total?: number) => void;

export type JobView = {
  id: string;
  type: JobType;
  status: JobStatus;
  phase: JobPhase;
  done: number;
  total: number;
  title: string;
  href: string | null;
  error: string | null;
  document_id: string | null;
  note_id: string | null;
};

export const JOB_STALE_MS = 6 * 60_000;

export const JOB_STALE_ERROR = "La generazione si è interrotta. Riprova: non ti è stata conteggiata.";

export function isStale(job: { status: JobStatus; updated_at: string }, now = Date.now()): boolean {
  return (job.status === "queued" || job.status === "running") && now - Date.parse(job.updated_at) > JOB_STALE_MS;
}

const CREATING: Record<JobType, string> = {
  ingest: "Preparo il documento",
  mindmap: "Creo la mappa",
  flashcards: "Creo le flashcard",
  summary: "Scrivo il riassunto",
  quiz: "Preparo il quiz",
};

const OPEN: Record<JobType, string> = {
  ingest: "Apri il documento",
  mindmap: "Apri la mappa",
  flashcards: "Apri le flashcard",
  summary: "Apri il riassunto",
  quiz: "Apri il quiz",
};

const READY: Record<JobType, string> = {
  ingest: "Documento pronto",
  mindmap: "Mappa pronta",
  flashcards: "Flashcard pronte",
  summary: "Riassunto pronto",
  quiz: "Quiz pronto",
};

const current = (j: Pick<JobView, "done" | "total">) => Math.min(j.done + 1, j.total);

export function phaseText(j: Pick<JobView, "type" | "status" | "phase" | "done" | "total" | "error">): string {
  if (j.status === "done") return READY[j.type];
  if (j.status === "error") return j.error ?? "Non è riuscito. Riprova.";
  switch (j.phase) {
    case "read":
      return "Leggo il testo del file…";
    case "transcribe":
      return j.total > 0 ? `Sto leggendo pagina ${current(j)} di ${j.total}` : "Leggo le pagine scansionate…";
    case "generate":
      return j.total > 1 ? `${CREATING[j.type]}: parte ${current(j)} di ${j.total}` : `${CREATING[j.type]}…`;
    case "merge":
      return "Metto insieme le parti…";
    default:
      return "In attesa di iniziare…";
  }
}

export const openLabel = (type: JobType) => OPEN[type];

export function progressRatio(j: Pick<JobView, "status" | "done" | "total">): number | null {
  if (j.status === "done") return 1;
  return j.total > 0 ? Math.min(j.done / j.total, 1) : null;
}
