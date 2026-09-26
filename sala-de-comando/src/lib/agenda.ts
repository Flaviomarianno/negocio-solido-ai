// Os horários da agenda são sempre interpretados e exibidos em Brasília
// (UTC-3, sem horário de verão desde 2019).
export const AGENDA_TZ = "America/Sao_Paulo";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Converte o valor de um <input type="datetime-local"> (sem fuso) em ISO UTC.
export function localToIso(local: string): string | null {
  const match = local.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const date = new Date(`${match[1]}T${match[2]}:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: AGENDA_TZ });
const dayLabelFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: AGENDA_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: AGENDA_TZ,
  hour: "2-digit",
  minute: "2-digit",
});
const fullFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: AGENDA_TZ,
  dateStyle: "short",
  timeStyle: "short",
});

const longFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: AGENDA_TZ,
  dateStyle: "full",
  timeStyle: "short",
});

export const slotLong = (iso: string) => longFormat.format(new Date(iso));
export const slotDayKey = (iso: string) => dayKeyFormat.format(new Date(iso));
export const slotDayLabel = (iso: string) => dayLabelFormat.format(new Date(iso));
export const slotTime = (iso: string) => timeFormat.format(new Date(iso));
export const slotFull = (iso: string) => fullFormat.format(new Date(iso));
