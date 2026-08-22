/**
 * Counts the key figures up from zero the first time the stats band scrolls into view.
 * The markup carries the real numbers, so readers without JavaScript see them as is.
 */

import { queryAll } from "../dom.js";

const DURATION_MS = 1100;
const VISIBLE_RATIO = 0.4;

interface Counter {
  readonly element: HTMLElement;
  readonly target: number;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

const paint = (counters: readonly Counter[], progress: number): void => {
  for (const counter of counters) {
    counter.element.textContent = String(Math.round(counter.target * progress));
  }
};

const animate = (counters: readonly Counter[]): void => {
  const startedAt = performance.now();
  const tick = (now: number): void => {
    const t = Math.min(1, (now - startedAt) / DURATION_MS);
    paint(counters, easeOutCubic(t));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

export const initStatsCounter = (section: HTMLElement): void => {
  if (!("IntersectionObserver" in window)) return;
  const counters = queryAll("[data-count-up]", section).map((element) => ({
    element,
    target: Number(element.textContent),
  }));
  paint(counters, 0);
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      animate(counters);
    },
    { threshold: VISIBLE_RATIO },
  );
  observer.observe(section);
};
