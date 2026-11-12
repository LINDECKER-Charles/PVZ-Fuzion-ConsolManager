/** The `--lang` option and the checks every locale-taking command shares. */

import { listLocalizations } from "../../parsers/loaders";
import type { AppContext } from "../context";
import type { OptionSpec } from "./command";

export const LANG_OPTION_NAME = "--lang";

export const LANG_OPTION: OptionSpec = {
  name: LANG_OPTION_NAME,
  value: "LOCALE",
  required: true,
  description: "Locale folder under Localization/ (case-sensitive).",
};

/** Why `lang` is not a locale of the project, or `null` when it is. */
export function rejectUnknownLocale(app: AppContext, lang: string): string | null {
  const locales = listLocalizations(app.projectRoot());
  if (locales.includes(lang)) {
    return null;
  }
  return `locale '${lang}' not found.\navailable: ${locales.join(", ")}`;
}

/** Same as {@link rejectUnknownLocale}, and also refuses the source locale. */
export function rejectTargetLocale(app: AppContext, lang: string): string | null {
  const unknown = rejectUnknownLocale(app, lang);
  if (unknown !== null) {
    return unknown;
  }
  const source = app.sourceLocale();
  return lang === source
    ? `'${lang}' is the source locale (${source}); pick a target locale.`
    : null;
}
