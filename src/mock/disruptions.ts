import type { Language } from "../types/appState";

/**
 * ⚠️ MOCK DATA — kept as a fixture/fallback, no longer the default feed.
 *
 * transport.opendata.ch itself has no disruption endpoint, but
 * `DisruptionBanner` is now wired to a real one: opentransportdata.swiss's
 * `siri-sx` API via the local proxy in [server/](../../server) — see
 * docs/DATA.md's "Live disruption feed (SIRI-SX)" section for the full
 * design. This file's exports are no longer passed to `DisruptionBanner`
 * by default in the running app (see src/components/Board/Board.tsx); it's
 * kept around for offline dev and for exercising the banner's
 * empty-state/multi-entry-rotation UI without waiting for a live
 * disruption to exist somewhere on the network.
 *
 * Per-row rerouting text (the second export below) is a separate, still
 * genuinely open gap — see docs/DATA.md's "No per-row rerouting text field
 * either" section.
 *
 * Sample text below is adapted (translated across all four UI languages)
 * from the real wording visible in the /docs reference images, so the
 * banner reads like a plausible real disruption rather than lorem ipsum.
 */
export interface MockDisruption {
  id: string;
  text: Record<Language, string>;
}

export const mockDisruptions: MockDisruption[] = [
  {
    id: "lausanne-morges-power",
    text: {
      fr: "Trafic ferroviaire restreint entre Lausanne et Morges. Motif: Défaut d'alimentation électrique. Il faut s'attendre à des retards et des suppressions de trains. Durée: jusqu'à 14:00.",
      de: "Eingeschränkter Zugverkehr zwischen Lausanne und Morges. Grund: Störung der Stromversorgung. Es ist mit Verspätungen und Zugausfällen zu rechnen. Dauer: bis 14:00 Uhr.",
      it: "Traffico ferroviario limitato tra Losanna e Morges. Motivo: guasto all'alimentazione elettrica. Sono previsti ritardi e soppressioni di treni. Durata: fino alle 14:00.",
      en: "Restricted rail traffic between Lausanne and Morges. Reason: power supply fault. Expect delays and train cancellations. Duration: until 14:00.",
    },
  },
  {
    id: "bern-europaplatz-incident",
    text: {
      fr: "Perturbation à la gare de Berne Europaplatz, sur le tronçon Berne–Berne Bümpliz Süd. Motif: incident impliquant un véhicule routier. Il faut s'attendre à des retards, des suppressions et des déviations. Durée: jusqu'au 14.03.2023, 18:00.",
      de: "Beeinträchtigung im Bahnhof Bern Europaplatz, auf der Strecke Bern – Bern Bümpliz Süd. Grund: Vorfall mit einem Strassenfahrzeug. Es ist mit Verspätungen, Zugausfällen und Umleitungen zu rechnen. Dauer: bis 14.03.2023, 18:00 Uhr.",
      it: "Perturbazione alla stazione di Berna Europaplatz, sulla tratta Berna–Berna Bümpliz Süd. Motivo: incidente con un veicolo stradale. Sono previsti ritardi, soppressioni e deviazioni. Durata: fino al 14.03.2023, ore 18:00.",
      en: "Disruption at Bern Europaplatz station, on the Bern–Bern Bümpliz Süd section. Reason: incident involving a road vehicle. Expect delays, cancellations and diversions. Duration: until 14.03.2023, 18:00.",
    },
  },
];

/**
 * MOCKED — see the module comment above. transport.opendata.ch also has no
 * field at all for per-row rerouting instructions (the yellow sub-row shown
 * under a cancelled/rerouted service), independent of the banner-level gap.
 * Matched against a DisplayRow by a case-insensitive substring on its
 * destination name; real data would presumably key off a trip/journey id.
 */
export interface MockReroute {
  destinationMatch: string;
  text: Record<Language, string>;
}

export const mockReroutes: MockReroute[] = [
  {
    destinationMatch: "genève-aéroport",
    text: {
      fr: "Pour Genève-Aéroport: bus de remplacement de la place de la gare.",
      de: "Nach Genève-Aéroport: Ersatzbus ab Bahnhofplatz.",
      it: "Per Genève-Aéroport: bus sostitutivo dalla piazza della stazione.",
      en: "For Genève-Aéroport: replacement bus from the station square.",
    },
  },
  {
    destinationMatch: "fribourg/freiburg",
    text: {
      fr: "Pour Fribourg/Freiburg: tram 7 direction Bümpliz, changement à Berne Europaplatz.",
      de: "Nach Fribourg/Freiburg: Tram 7 Richtung Bümpliz, umsteigen in Bern Europaplatz.",
      it: "Per Fribourg/Freiburg: tram 7 direzione Bümpliz, cambio a Berna Europaplatz.",
      en: "For Fribourg/Freiburg: tram 7 towards Bümpliz, change at Bern Europaplatz.",
    },
  },
  {
    destinationMatch: "giubiasco",
    text: {
      fr: "Pour Giubiasco: bus de remplacement. Infos sur le lieu de départ au guichet d'information.",
      de: "Nach Giubiasco: Ersatzbus. Informationen zum Abfahrtsort am Infoschalter.",
      it: "Per Giubiasco: bus sostitutivo. Info sul luogo di partenza presso la tavola info.",
      en: "For Giubiasco: replacement bus. Departure point info at the information desk.",
    },
  },
];
