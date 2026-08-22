/** Highlights the nav link of the section currently under the reader's eye. */

const ACTIVE_CLASS = "is-active";
/** Only the band between 30% and 45% of the viewport counts as "being read". */
const READING_BAND = "-30% 0px -55% 0px";

export const initScrollSpy = (links: readonly HTMLElement[]): void => {
  if (!("IntersectionObserver" in window)) return;
  const sectionOf = new Map<Element, HTMLElement>();
  for (const link of links) {
    const section = document.getElementById(link.dataset.nav ?? "");
    if (section) sectionOf.set(section, link);
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const active = sectionOf.get(entry.target);
        for (const link of links) link.classList.toggle(ACTIVE_CLASS, link === active);
      }
    },
    { rootMargin: READING_BAND },
  );
  for (const section of sectionOf.keys()) observer.observe(section);
};
