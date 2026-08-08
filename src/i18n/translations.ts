import type { Dictionary } from "../types/i18n";
import type { Language } from "../types/appState";

/**
 * UI chrome strings only — station and destination names come from the API
 * verbatim and are never run through this dictionary (e.g. "Genève" must
 * never become "Geneva"). Wording below follows conventional SBB/CFF/FFS
 * phrasing verified against the /docs reference images where an image
 * exists (fr/de/it); English has no reference image so these are the
 * conventional equivalents.
 */
const en: Dictionary = {
  columnDestination: "Destination",
  columnTrack: "Track",
  columnRemarks: "Remarks",
  via: "via",
  disruptionLabel: "Disruption:",
  cancelled: "Cancelled",
  delayTemplate: "Delay approx. {n} min",
};

const fr: Dictionary = {
  columnDestination: "Destination",
  columnTrack: "Voie",
  columnRemarks: "Remarques",
  via: "via",
  disruptionLabel: "Perturbation:",
  cancelled: "Supprimé",
  delayTemplate: "Retard env. {n} min",
};

const de: Dictionary = {
  columnDestination: "Nach",
  columnTrack: "Gleis",
  columnRemarks: "Hinweis",
  via: "via",
  disruptionLabel: "Störung:",
  cancelled: "Ausfall",
  delayTemplate: "Verspätung ca. {n} Min",
};

const it: Dictionary = {
  columnDestination: "Destinazione",
  columnTrack: "Binario",
  columnRemarks: "Informazioni",
  via: "via",
  disruptionLabel: "Perturbazione:",
  cancelled: "Soppresso",
  delayTemplate: "ca. {n} min di ritardo",
};

export const translations: Record<Language, Dictionary> = { en, fr, de, it };
