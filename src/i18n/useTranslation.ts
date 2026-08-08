import { useCallback } from "react";
import { translations } from "./translations";
import type { TranslationKey } from "../types/i18n";
import type { Language } from "../types/appState";
import { useAppState } from "../context/AppStateContext";

/** `{n}`-style template substitution — the only placeholder shape this
 * dictionary needs today (delayTemplate). */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function t(
  key: TranslationKey,
  language: Language,
  vars?: Record<string, string | number>,
): string {
  return interpolate(translations[language][key], vars);
}

/** Convenience hook: reads language from context so components don't have
 * to thread it through props just to call t(). */
export function useTranslation() {
  const { language } = useAppState();
  const translate = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      t(key, language, vars),
    [language],
  );
  return { t: translate, language };
}
