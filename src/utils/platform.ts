/**
 * transport.opendata.ch returns platform as one string that can carry a
 * boarding-sector suffix baked in (verified live: "7A-D", "33AB"). The
 * reference images show the sector as a small secondary badge next to the
 * main track number (e.g. Bern's "13 AB"), so split it back out here.
 */
export function parsePlatform(
  raw: string | null,
): { track: string | null; sector: string | null } {
  if (!raw) return { track: null, sector: null };
  const match = raw.match(/^(\d+)\s*([A-Z](?:-?[A-Z])*)?$/);
  if (!match) return { track: raw, sector: null };
  return { track: match[1], sector: match[2] ?? null };
}
