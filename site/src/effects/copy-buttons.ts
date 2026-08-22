/** `[data-copy]` buttons: copy their payload, flash the label and announce the outcome. */

import { queryAll } from "../dom.js";

const FEEDBACK_MS = 1400;
const COPIED_LABEL = "copied ✓";
const FAILED_LABEL = "copy failed";
const COPIED_CLASS = "is-copied";
const ANNOUNCEMENT = { copied: "Copied to clipboard.", failed: "Copy failed." } as const;

const writeClipboard = async (text: string): Promise<boolean> => {
  if (!navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const bindCopyButton = (button: HTMLElement, status: HTMLElement | null): void => {
  const label = button.querySelector<HTMLElement>("[data-copy-label]") ?? button;
  const idleLabel = label.textContent ?? "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  button.addEventListener("click", async () => {
    const isCopied = await writeClipboard(button.dataset.copy ?? "");
    label.textContent = isCopied ? COPIED_LABEL : FAILED_LABEL;
    button.classList.toggle(COPIED_CLASS, isCopied);
    if (status) status.textContent = isCopied ? ANNOUNCEMENT.copied : ANNOUNCEMENT.failed;
    clearTimeout(timer);
    timer = setTimeout(() => {
      label.textContent = idleLabel;
      button.classList.remove(COPIED_CLASS);
    }, FEEDBACK_MS);
  });
};

/** `status` is the shared live region screen readers hear the result through. */
export const initCopyButtons = (status: HTMLElement | null): void => {
  for (const button of queryAll("[data-copy]")) bindCopyButton(button, status);
};
