/** Board time is always shown 24h regardless of UI language or browser
 * locale — avoids Intl locale surprises (e.g. en-US defaulting to 12h). */
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatHHMM(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatHHMMSS(date: Date): string {
  return `${formatHHMM(date)}:${pad(date.getSeconds())}`;
}
