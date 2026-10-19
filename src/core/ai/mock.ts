import type { TaskId } from "@/config/ai";
import type { ChatFn } from "./client";

export const MOCK_OUTPUTS: Record<TaskId, unknown> = {
  mindmap: {
    nodes: [
      { id: "n1", label: "Scompenso cardiaco", parentId: null, relation: null },
      { id: "n2", label: "Cause", parentId: "n1", relation: "comprende" },
      { id: "n3", label: "Cardiopatia ischemica", parentId: "n2", relation: null },
      { id: "n4", label: "Segni e sintomi", parentId: "n1", relation: "si manifesta con" },
      { id: "n5", label: "Dispnea", parentId: "n4", relation: null },
      { id: "n6", label: "Edemi declivi", parentId: "n4", relation: null },
      { id: "n7", label: "Interventi infermieristici", parentId: "n1", relation: "richiede" },
      { id: "n8", label: "Bilancio idrico e peso quotidiano", parentId: "n7", relation: null },
    ],
  },
  flashcards: {
    cards: [
      { front: "Che cos'è lo scompenso cardiaco?", back: "Incapacità del cuore di garantire una gittata adeguata ai fabbisogni dell'organismo." },
      { front: "Quali sono i segni tipici dello scompenso destro?", back: "Edemi declivi, turgore giugulare, epatomegalia." },
      { front: "Perché si monitora il peso quotidiano?", back: "Un aumento rapido del peso indica ritenzione idrica." },
    ],
  },
  transcribe: { markdown: "# Appunti\nTesto trascritto di prova." },
};

export const mockChat: ChatFn = async ({ task, messages }) => ({
  content: JSON.stringify(MOCK_OUTPUTS[task]),
  inputTokens: Math.ceil(JSON.stringify(messages).length / 4),
  outputTokens: 200,
});
