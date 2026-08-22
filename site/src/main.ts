/** Landing page entry point — runs after parsing (module scripts are deferred). */

import { queryAll, requireElement } from "./dom.js";
import { initCopyButtons } from "./effects/copy-buttons.js";
import { initHeroGlow } from "./effects/hero-glow.js";
import { prefersReducedMotion } from "./effects/motion.js";
import { initReveal } from "./effects/reveal.js";
import { initScrollSpy } from "./effects/scroll-spy.js";
import { initStatsCounter } from "./effects/stats-counter.js";
import { initTerminal } from "./terminal/terminal-bindings.js";

const isMotionReduced = prefersReducedMotion();

if (!isMotionReduced) {
  initHeroGlow(requireElement("[data-hero]"), requireElement("[data-hero-glow]"));
  initStatsCounter(requireElement("[data-stats]"));
  initReveal();
}
initScrollSpy(queryAll("[data-nav]"));
initCopyButtons(document.querySelector("[data-copy-status]"));
initTerminal({ shouldAutoplay: !isMotionReduced });
