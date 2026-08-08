export type BadgeVariant = "sbahn" | "regio" | "intercity" | "default";

/**
 * Maps the API's open-ended `category` string to a rendering variant rather
 * than a hardcoded per-line lookup — SBB and its regional partner operators
 * use categories this app can't enumerate in advance, so unknown values
 * fall through to a neutral badge instead of breaking.
 */
export function getBadgeVariant(category: string): BadgeVariant {
  if (category.startsWith("S")) return "sbahn"; // S, SN, ...
  if (category === "RE") return "regio";
  if (["IC", "IR", "EC", "ICE", "EN", "TGV"].includes(category)) return "intercity";
  return "default";
}
