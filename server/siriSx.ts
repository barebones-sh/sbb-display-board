import { XMLParser } from "fast-xml-parser";
import { getServicePointLookup } from "./servicePoints.ts";

/** Duplicated from src/types/appState.ts rather than imported: that file is
 * type-checked under tsconfig.app.json's bundler-mode resolution (no
 * extension required on its own relative imports), while server/ uses
 * `nodenext` resolution (extensions required) — importing across that
 * boundary pulls appState.ts's checking under the wrong project's rules.
 * A one-line union type is cheap enough to keep in sync by hand. */
export type Language = "en" | "fr" | "de" | "it";

/** Matches src/mock/disruptions.ts's MockDisruption shape exactly, so the
 * frontend hook needs no translation step between what the proxy returns
 * and what DisruptionBanner already expects. */
export interface NormalizedDisruption {
  id: string;
  text: Record<Language, string>;
}

const SIRI_SX_URLS = {
  complete: "https://api.opentransportdata.swiss/la/siri-sx",
  unplanned: "https://api.opentransportdata.swiss/la/siri-sx-unplanned",
} as const;

type SiriSxEndpoint = keyof typeof SIRI_SX_URLS;

// Tags that must always be treated as arrays, even when only one instance
// is present — fast-xml-parser otherwise collapses a lone repeat into a
// bare object, which would silently drop later ones on the next poll tick.
const ALWAYS_ARRAY = new Set([
  "PtSituationElement",
  "Summary",
  "Description",
  "AffectedStopPlace",
  "AffectedStopPoint",
  "AffectedLine",
  "AffectedNetwork",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (tagName) => ALWAYS_ARRAY.has(tagName),
});

const XML_LANG_TO_LANGUAGE: Record<string, Language> = {
  DE: "de",
  EN: "en",
  FR: "fr",
  IT: "it",
};

/** Recursively walks a parsed situation's `Affects` subtree collecting every
 * `StopPlaceRef` value found, regardless of how deeply it's nested —
 * confirmed by hand that real payloads carry stop refs both directly under
 * `Affects.StopPlaces` (stop-scoped situations) and nested under
 * `Affects.Networks.AffectedNetwork.AffectedLine.StopPlaces` (line-scoped
 * ones), so a fixed-depth path would miss the second shape. */
function collectStopPlaceRefs(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectStopPlaceRefs(item, out);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "StopPlaceRef" && typeof value === "string") {
        out.push(value);
      } else {
        collectStopPlaceRefs(value, out);
      }
    }
  }
}

/** `Summary`/`SummaryText`/etc. elements parse to either a plain string (no
 * attributes) or `{ "#text": string, "@_xml:lang": string }` depending on
 * fast-xml-parser's attribute handling — both shapes seen in practice. */
function textOf(node: unknown): string {
  if (typeof node === "string") return node;
  if (node && typeof node === "object" && "#text" in node) {
    return String((node as Record<string, unknown>)["#text"]);
  }
  return "";
}

function langOf(node: unknown): string | null {
  if (node && typeof node === "object" && "@_xml:lang" in node) {
    return String((node as Record<string, unknown>)["@_xml:lang"]);
  }
  return null;
}

/**
 * Real payloads carry (at least) two different situation shapes depending
 * on the publishing operator — confirmed by hand, not just from docs:
 * - The simpler one (e.g. source "EMS"/SBB) puts `Summary`/`Affects`
 *   directly on `PtSituationElement`.
 * - A richer one (e.g. source "PostAuto AG" — 1,216 of 1,453 published
 *   situations in the sample pulled, i.e. the *majority*) nests everything
 *   under `PublishingActions > PublishingAction`: stop refs under
 *   `PublishAtScope.Affects`, and text split into `TextualContent`'s
 *   `SummaryContent`/`ReasonContent`/`ConsequenceContent`/`DurationContent`
 *   (each a `*Text` element per language) instead of a single `Summary`.
 *
 * Rather than hardcode both full paths (and risk missing a third shape
 * from some other operator on this feed), this walks the *whole* situation
 * once per tag-name bucket — `StopPlaceRef` can be found anywhere, and so
 * can each text component, regardless of which wrapper it's nested under.
 */
function collectTextsByTag(
  node: unknown,
  tagNames: Set<string>,
  into: Partial<Record<Language, string>>,
): void {
  if (Array.isArray(node)) {
    for (const item of node) collectTextsByTag(item, tagNames, into);
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    if (tagNames.has(key)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        const lang = langOf(item);
        const language = lang ? XML_LANG_TO_LANGUAGE[lang] : null;
        // First occurrence per language wins — a situation with multiple
        // PublishingActions repeating the same text would otherwise let a
        // later duplicate silently overwrite the first.
        if (language && !into[language]) into[language] = textOf(item);
      }
    } else {
      collectTextsByTag(value, tagNames, into);
    }
  }
}

const SUMMARY_TAGS = new Set(["Summary", "SummaryText"]);
const REASON_TAGS = new Set(["ReasonText"]);
const CONSEQUENCE_TAGS = new Set(["ConsequenceText"]);
const DURATION_TAGS = new Set(["DurationText"]);
const LANGUAGES: Language[] = ["de", "en", "fr", "it"];

function buildLanguageText(situation: unknown): Record<Language, string> | null {
  const summary: Partial<Record<Language, string>> = {};
  collectTextsByTag(situation, SUMMARY_TAGS, summary);
  // The summary is the one required component — DisruptionBanner reads
  // `text[language]` for whatever language is currently selected, so every
  // UI language needs at least this much text to be usable at all.
  if (!summary.de || !summary.en || !summary.fr || !summary.it) return null;

  const reason: Partial<Record<Language, string>> = {};
  collectTextsByTag(situation, REASON_TAGS, reason);
  const consequence: Partial<Record<Language, string>> = {};
  collectTextsByTag(situation, CONSEQUENCE_TAGS, consequence);
  const duration: Partial<Record<Language, string>> = {};
  collectTextsByTag(situation, DURATION_TAGS, duration);

  const text = {} as Record<Language, string>;
  for (const language of LANGUAGES) {
    // Mirrors the mocked text's own shape (reason + consequence + duration
    // appended to the headline) rather than showing the bare SummaryText
    // alone, which on its own is often too terse (e.g. just "stop moved").
    text[language] = [summary[language], reason[language], consequence[language], duration[language]]
      .filter(Boolean)
      .join(" ");
  }
  return text;
}

interface ParsedSituation {
  situationNumber: string;
  text: Record<Language, string>;
  stopPlaceRefs: string[];
}

function parseSituations(xml: string): ParsedSituation[] {
  const doc = parser.parse(xml);
  const situations: unknown[] =
    doc?.Siri?.ServiceDelivery?.SituationExchangeDelivery?.Situations?.PtSituationElement ?? [];

  const parsed: ParsedSituation[] = [];
  for (const situation of situations as Record<string, unknown>[]) {
    // "published" is the only state that should ever reach the banner —
    // not verified against a real "closed"/withdrawn situation yet, kept
    // defensive rather than assuming the feed never sends one.
    if (situation.Progress !== "published") continue;

    const text = buildLanguageText(situation);
    if (!text) continue;

    // Searches the whole situation, not just a fixed `situation.Affects`
    // path — see collectTextsByTag's comment above for why a fixed path
    // isn't safe across the shapes actually observed.
    const stopPlaceRefs: string[] = [];
    collectStopPlaceRefs(situation, stopPlaceRefs);
    if (stopPlaceRefs.length === 0) continue;

    parsed.push({
      situationNumber: String(situation.SituationNumber),
      text,
      stopPlaceRefs,
    });
  }
  return parsed;
}

async function fetchSiriSx(endpoint: SiriSxEndpoint, apiKey: string): Promise<string> {
  const response = await fetch(SIRI_SX_URLS[endpoint], {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "sbb-display-board/0.1 (+https://github.com)",
    },
  });
  if (!response.ok) {
    throw new Error(`${endpoint} request failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

/**
 * Fetches one SIRI-SX endpoint and returns disruptions grouped by the
 * UIC/DIDOK station id (`SavedStation.id`-comparable) each one affects —
 * translating each situation's `sloid` stop refs via
 * getServicePointLookup(). A station with no key in the returned map has no
 * known disruption, matching DisruptionBanner's existing empty-array
 * behavior.
 */
export async function fetchDisruptionsByStation(
  endpoint: SiriSxEndpoint,
  apiKey: string,
): Promise<Map<string, NormalizedDisruption[]>> {
  const [xml, sloidToUic] = await Promise.all([
    fetchSiriSx(endpoint, apiKey),
    getServicePointLookup(),
  ]);
  const situations = parseSituations(xml);

  const byStation = new Map<string, NormalizedDisruption[]>();
  for (const situation of situations) {
    // A ref is either a sloid (translate via the lookup) or already a bare
    // UIC number (foreign cross-border stops, which have no sloid) — pass
    // those through as-is, matching what was observed in real payloads.
    const uicIds = new Set(
      situation.stopPlaceRefs.map((ref) => sloidToUic.get(ref) ?? ref),
    );
    for (const uicId of uicIds) {
      const entry: NormalizedDisruption = { id: situation.situationNumber, text: situation.text };
      const existing = byStation.get(uicId);
      if (existing) existing.push(entry);
      else byStation.set(uicId, [entry]);
    }
  }
  return byStation;
}
