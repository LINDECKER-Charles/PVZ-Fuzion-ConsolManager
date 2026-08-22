/** Fades `[data-reveal]` blocks in as they enter the viewport; above-the-fold ones stay put. */

import { queryAll } from "../dom.js";

const BELOW_FOLD_RATIO = 0.92;
const VISIBLE_RATIO = 0.12;
const PENDING_CLASS = "reveal-pending";
const REVEALED_CLASS = "is-revealed";

export const initReveal = (): void => {
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add(REVEALED_CLASS);
        observer.unobserve(entry.target);
      }
    },
    { threshold: VISIBLE_RATIO },
  );
  const foldLine = window.innerHeight * BELOW_FOLD_RATIO;
  for (const element of queryAll("[data-reveal]")) {
    if (element.getBoundingClientRect().top <= foldLine) continue;
    element.classList.add(PENDING_CLASS);
    observer.observe(element);
  }
};
