/** Static content of the fake console: menus and the rows each tool prints while running. */

import type { MenuItem, RunId, RunSpec } from "./models.js";
import { GLYPH, span } from "./screens/spans.js";

const item = (label: string, hint = ""): MenuItem => ({ label, hint });

export const MAIN_MENU: readonly MenuItem[] = [
  item("Show what's missing", `diff locales ${GLYPH.dot} write reports`),
  item("Translator tools", `migrate ${GLYPH.dot} trello ${GLYPH.dot} duplicates`),
  item("Documentation", `PR recap ${GLYPH.arrowRight} contributor docs`),
  item("Settings"),
  item("Exit"),
];

/** Index of each main-menu entry, so scripts and the live reducer never rely on magic offsets. */
export const MAIN_ENTRY = { missing: 0, tools: 1, docs: 2, settings: 3, exit: 4 } as const;

/** What the demo pretends to be working on — shown in the status box and the settings screen. */
export const DEMO_PROJECT = {
  path: `${GLYPH.ellipsis}/PvZ_Fusion_Translator`,
  sourceLocale: "English",
  reportsDir: "reports/",
} as const;

export const LOCALE_MENU: readonly MenuItem[] = [
  item("French"),
  item("German"),
  item("Spanish"),
  item("Italian"),
  item("Polish"),
  item("* All locales", "run the whole set"),
];
export const LOCALE_ENTRY = { french: 0, german: 1 } as const;
export const LOCALE_MENU_HINT = `(type to filter ${GLYPH.dash} 19 locales)`;
export const LOCALE_MENU_TAIL = `${GLYPH.ellipsis} 13 more`;

export const CATEGORY_MENU: readonly MenuItem[] = [
  item("[0] All types", "every category, back to back"),
  item("[1] Plants"),
  item("[2] Zombies"),
  item("[3] Achievements"),
  item("[4] Strings (UI)"),
];
export const CATEGORY_MENU_TAIL = [
  GLYPH.ellipsis,
  "[5] Regex",
  GLYPH.dot,
  "[6] Tips",
  GLYPH.dot,
  "[7] Abyss",
  GLYPH.dot,
  "[8] Travel",
].join(" ");

export const TOOLS_MENU: readonly MenuItem[] = [
  item("[1] Migrate tips & buffs", "one locale"),
  item("[2] Migrate custom levels", "one locale"),
  item("[3] Export Trello CSV", "one locale"),
  item("[4] Check duplicates", "one locale or all"),
  item("[0] Back"),
];
/** Tool launched by each TOOLS_MENU entry; the last entry is "Back". */
export const TOOL_RUNS: readonly RunId[] = ["migrate", "custom", "trello", "dups"];

export const DOCS_MENU: readonly MenuItem[] = [
  item(`[1] PR recap ${GLYPH.arrowRight} contributor summary`, "renders before writing"),
  item("[0] Back"),
];
export const DOCS_ENTRY = { prRecap: 0, back: 1 } as const;

const missing = (count: string) => [span.muted(`${GLYPH.dash} ${count}`)];
const clean = (note = "") => [span.green("clean"), span.muted(note)];

export const RUNS: Readonly<Record<RunId, RunSpec>> = {
  diff: {
    title: `Diffing French ${GLYPH.dash} 8 categories`,
    rows: [
      { name: "Plants", detail: missing("12 missing") },
      { name: "Zombies", detail: missing("4 missing") },
      { name: "Achievements", detail: missing("9 missing") },
      { name: "Strings (UI)", detail: missing(`143 missing ${GLYPH.dot} 2 empty`) },
      { name: "Regex", detail: clean(` ${GLYPH.dash} no file written`) },
      { name: "Tips (IZ + FS)", detail: missing("87 missing") },
      { name: "Abyss buffs", detail: missing("21 missing") },
      { name: "Travel buffs", detail: missing("36 missing") },
    ],
    summaryTitle: "312 entries to translate",
    summaryNote: `reports/French/ ${GLYPH.dash} one Markdown report per category`,
  },
  migrate: {
    title: `Migrating tips & buffs ${GLYPH.dash} French`,
    rows: [
      { name: "tips_iz.json", detail: missing("128/402 translated") },
      { name: "tips_fs.json", detail: missing("61/204 translated") },
      { name: "abyss_buffs.json", detail: missing("21/58 translated") },
      {
        name: "travel_buffs.json",
        detail: [span.lime("skipped"), span.muted(` ${GLYPH.dash} already exists, left alone`)],
      },
    ],
    summaryTitle: `3 files created ${GLYPH.dot} 1 untouched`,
    summaryNote: "run a diff to list what is still missing",
  },
  custom: {
    title: `Migrating custom levels ${GLYPH.dash} French`,
    rows: [
      { name: "customlevel_strings.json", detail: missing("88/140 translated") },
      { name: "customlevel_regexs.json", detail: missing("12/19 translated") },
      { name: "custom_level_data.json", detail: missing("5/9 translated") },
    ],
    summaryTitle: "3 files created",
    summaryNote: `keys from source locale ${GLYPH.dot} values from translation_strings.json`,
  },
  trello: {
    title: `Exporting Trello CSV ${GLYPH.dash} French`,
    rows: [
      { name: "trello_plants.csv", detail: missing("212 cards") },
      { name: "trello_zombies.csv", detail: missing("96 cards") },
      { name: "trello_strings.csv", detail: missing("1,043 cards") },
      { name: "trello_tips.csv", detail: missing("87 cards") },
      { name: "trello_README.md", detail: missing("import guide, labels & lists") },
    ],
    summaryTitle: `5 files ${GLYPH.arrowRight} exports/French/`,
    summaryNote: "one CSV per category keeps Trello responsive",
  },
  dups: {
    title: `Scanning for duplicates ${GLYPH.dash} French`,
    rows: [
      { name: "translation_strings.json", detail: [span.lime("2 duplicate keys")] },
      { name: "translation_regexs.json", detail: clean() },
      { name: "tips_iz.json", detail: [span.lime("1 translation reused across keys")] },
      { name: "tips_fs.json", detail: clean() },
      { name: "abyss_buffs.json", detail: clean() },
      { name: "travel_buffs.json", detail: clean() },
    ],
    summaryTitle: `duplicates.md ${GLYPH.arrowRight} reports/French/`,
    summaryNote: "clean locales write no file at all",
  },
  pr: {
    title: `PR recap ${GLYPH.arrowRight} contributor summary`,
    preamble: [span.muted(`recap.md ${GLYPH.dash} 2026-04-01..2026-04-07 ${GLYPH.dot} PR #123`)],
    rows: [
      { name: "@lafourmiedugaming-collab", detail: missing(`5 new ${GLYPH.dot} 2 mod`) },
      { name: "@Kurodatenshi", detail: missing(`3 new ${GLYPH.dot} 4 mod`) },
      {
        name: `@lead ${GLYPH.dash} Reviews`,
        detail: [span.cyan("derived"), span.muted(` ${GLYPH.dash} 14 items mirrored`)],
      },
    ],
    summaryTitle: "contribution-summary.md written",
    summaryNote: `rendered on screen first ${GLYPH.dash} nothing saved until confirmed`,
  },
};
