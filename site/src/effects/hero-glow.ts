/** Cyan radial glow that follows the pointer across the hero (drawn by CSS from two variables). */

export const initHeroGlow = (hero: HTMLElement, glow: HTMLElement): void => {
  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    glow.style.setProperty("--glow-x", `${event.clientX - rect.left}px`);
    glow.style.setProperty("--glow-y", `${event.clientY - rect.top}px`);
  });
};
