/** The visitor's OS-level motion preference, read once at start-up. */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
