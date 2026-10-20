export type SrsState = { ease: number; interval_days: number; repetitions: number };
export type Scheduled = SrsState & { due_at: string };

const DAY = 24 * 60 * 60 * 1000;
const RELEARN_MS = 10 * 60 * 1000;

export function schedule(card: SrsState, result: "known" | "unknown", now = new Date()): Scheduled {
  if (result === "unknown") {
    return {
      ease: Math.max(1.3, Math.round((card.ease - 0.2) * 100) / 100),
      interval_days: 0,
      repetitions: 0,
      due_at: new Date(now.getTime() + RELEARN_MS).toISOString(),
    };
  }
  const repetitions = card.repetitions + 1;
  const interval =
    repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.min(3650, Math.round(Math.max(1, card.interval_days) * card.ease));
  return {
    ease: card.ease,
    interval_days: interval,
    repetitions,
    due_at: new Date(now.getTime() + interval * DAY).toISOString(),
  };
}

export function isDue(card: { due_at: string }, now = new Date()): boolean {
  return new Date(card.due_at).getTime() <= now.getTime();
}
