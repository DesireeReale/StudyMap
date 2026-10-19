const TZ = "Europe/Rome";

export function greeting(d = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("it-IT", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(d));
  if (hour < 5 || hour >= 18) return "Buonasera";
  if (hour < 13) return "Buongiorno";
  return "Buon pomeriggio";
}

export function longDate(d = new Date()): string {
  const s = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso));
}

export function monthName(d = new Date()): string {
  return new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: TZ }).format(d);
}

export function nextMonthStart(d = new Date()): string {
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "UTC" }).format(next);
}
