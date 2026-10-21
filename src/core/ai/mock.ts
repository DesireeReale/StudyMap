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
  figure: { markdown: "Grafico velocità-tempo: retta orizzontale, la velocità resta costante." },
  chat: { answer: "Secondo il materiale, lo scompenso si manifesta con dispnea ed edemi declivi.", pages: [1, 99] },
  summary: {
    sections: [
      { heading: "Che cos'è", points: ["Lo scompenso cardiaco è l'incapacità del cuore di garantire una gittata adeguata."] },
      { heading: "Segni e sintomi", points: ["Dispnea da sforzo e ortopnea.", "Edemi declivi e turgore giugulare."] },
    ],
  },
  quiz: {
    questions: [
      {
        question: "Quale segno è tipico dello scompenso destro?",
        type: "scelta",
        options: ["Edemi declivi", "Febbre", "Ipoglicemia", "Rash cutaneo"],
        correct: 0,
        answer: "",
        explanation: "Nello scompenso destro il ristagno venoso causa edemi declivi.",
        topic: "Segni e sintomi",
      },
      {
        type: "vero_falso",
        question: "Un aumento rapido del peso può indicare ritenzione idrica.",
        options: ["Vero", "Falso"],
        correct: 0,
        answer: "",
        explanation: "Un aumento rapido del peso indica ritenzione di liquidi.",
        topic: "Assistenza",
      },
      {
        type: "completamento",
        question: "La posizione ___ riduce la dispnea sollevando il busto.",
        options: [],
        correct: 0,
        answer: "semi-Fowler",
        explanation: "La semi-Fowler, con il busto sollevato, riduce la dispnea.",
        topic: "Assistenza",
      },
    ],
  },
};

export const mockChat: ChatFn = async ({ task, messages }) => ({
  content: JSON.stringify(MOCK_OUTPUTS[task]),
  inputTokens: Math.ceil(JSON.stringify(messages).length / 4),
  outputTokens: 200,
});
