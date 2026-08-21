const fallbackTimeZones = [
  "UTC", "Africa/Cairo", "Africa/Johannesburg", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/New_York",
  "America/Sao_Paulo", "Asia/Dhaka", "Asia/Dubai", "Asia/Hong_Kong", "Asia/Karachi", "Asia/Kathmandu", "Asia/Kolkata",
  "Asia/Riyadh", "Asia/Singapore", "Asia/Tokyo", "Australia/Brisbane", "Australia/Sydney", "Europe/Berlin", "Europe/London",
  "Europe/Paris", "Pacific/Auckland",
];

export function supportedTimeZones() {
  try {
    const zones = (Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] }).supportedValuesOf?.("timeZone") ?? fallbackTimeZones;
    return ["UTC", ...Array.from(new Set([...fallbackTimeZones.filter(zone=>zone!=="UTC"),...zones])).sort()];
  } catch {
    return fallbackTimeZones;
  }
}

export function validTimeZone(value: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return value; }
  catch { return "UTC"; }
}

function offsetAt(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second)) - date.getTime();
}

export function zonedLocalToUtc(localValue: string, requestedTimeZone: string) {
  const match = localValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  const timeZone = validTimeZone(requestedTimeZone);
  const localAsUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  let instant = localAsUtc;
  for (let iteration = 0; iteration < 3; iteration += 1) instant = localAsUtc - offsetAt(new Date(instant), timeZone);
  const result = new Date(instant);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

export function dateKeyInTimeZone(value: string | Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: validTimeZone(timeZone), year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
