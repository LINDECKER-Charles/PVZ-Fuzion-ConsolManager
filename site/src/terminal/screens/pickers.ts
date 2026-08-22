/** The four selection screens, shared by the autoplay scripts and the live session. */

import {
  CATEGORY_MENU,
  CATEGORY_MENU_TAIL,
  DOCS_MENU,
  LOCALE_MENU,
  LOCALE_MENU_HINT,
  LOCALE_MENU_TAIL,
  TOOLS_MENU,
} from "../catalog.js";
import type { Line } from "../models.js";
import { pickScreen } from "./screens.js";

export const localePicker = (selection: number): Line[] =>
  pickScreen({
    title: "Which locale?",
    hint: LOCALE_MENU_HINT,
    items: LOCALE_MENU,
    selection,
    tail: LOCALE_MENU_TAIL,
  });

export const categoryPicker = (selection: number): Line[] =>
  pickScreen({
    title: "Which category?",
    items: CATEGORY_MENU,
    selection,
    tail: CATEGORY_MENU_TAIL,
  });

export const toolsPicker = (selection: number): Line[] =>
  pickScreen({ title: "Translator tools", items: TOOLS_MENU, selection });

export const docsPicker = (selection: number): Line[] =>
  pickScreen({ title: "Documentation", items: DOCS_MENU, selection });
