export type TranslationKey =
  | "columnDestination"
  | "columnTrack"
  | "columnRemarks"
  | "via"
  | "disruptionLabel"
  | "cancelled"
  | "delayTemplate";

export type Dictionary = Record<TranslationKey, string>;
