import type { FolderColor, FolderIcon } from "@/config/styles";
import type { Graph } from "@/core/graph";

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Profile = {
  id: string;
  plan: "free" | "pro";
  ai_data_sharing_consent_at: string | null;
  exam_date: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
};

export type FolderRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  color: FolderColor;
  icon: FolderIcon;
  position: number;
  created_at: string;
};

export type NoteRow = {
  id: string;
  user_id: string;
  folder_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type DocumentRow = {
  id: string;
  user_id: string;
  folder_id: string;
  title: string;
  kind: "pdf" | "image" | "text";
  storage_path: string | null;
  page_count: number;
  pages: string[];
  created_at: string;
};

export type MapRow = {
  id: string;
  user_id: string;
  folder_id: string;
  document_id: string | null;
  title: string;
  graph: Graph;
  created_at: string;
  updated_at: string;
};

export type DeckRow = {
  id: string;
  user_id: string;
  folder_id: string;
  document_id: string | null;
  title: string;
  created_at: string;
};

export type FlashcardRow = {
  id: string;
  deck_id: string;
  user_id: string;
  front: string;
  back: string;
  position: number;
  last_result: "known" | "unknown" | null;
  reviewed_at: string | null;
};

export type AiUsageRow = {
  id: number;
  user_id: string;
  task: string;
  provider: string;
  model: string;
  prompt_version: string | null;
  input_tokens: number;
  output_tokens: number;
  ocr_pages: number;
  cost_usd: number;
  ok: boolean;
  error: string | null;
  created_at: string;
};

export type QuotaCounterRow = { user_id: string; period: string; kind: string; count: number };

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, "id">;
      folders: Table<FolderRow, "name">;
      notes: Table<NoteRow, "title">;
      documents: Table<DocumentRow, "title" | "kind">;
      maps: Table<MapRow, "title" | "graph">;
      decks: Table<DeckRow, "title">;
      flashcards: Table<FlashcardRow, "deck_id" | "front" | "back">;
      ai_usage: Table<AiUsageRow, "user_id" | "task" | "provider" | "model" | "ok">;
      quota_counters: Table<QuotaCounterRow, "user_id" | "period" | "kind">;
    };
    Views: { [_ in never]: never };
    Functions: {
      move_document: { Args: { p_document: string; p_folder: string }; Returns: undefined };
      consume_quota: {
        Args: { p_user: string; p_kind: string; p_period: string; p_amount?: number; p_limit?: number | null };
        Returns: boolean;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
