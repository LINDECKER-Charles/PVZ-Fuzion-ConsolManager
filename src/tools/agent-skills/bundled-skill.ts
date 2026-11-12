/** The Agent Skill shipped inside this package (`skills/pvzf-console/SKILL.md`). */

import path from "node:path";

import { REPO_ROOT } from "../../config";

export const SKILL_NAME = "pvzf-console";

/** Same install from a shell, without this CLI: fetches the skill from GitHub. */
export const REMOTE_INSTALL_COMMAND =
  "npx skills add LINDECKER-Charles/PVZ-Fuzion-ConsolManager --skill pvzf-console";

/**
 * Folder of the bundled skill. Installing from it, rather than from GitHub,
 * gives every agent the skill that matches this exact version of the CLI and
 * needs no network access.
 */
export function bundledSkillDir(): string {
  return path.join(REPO_ROOT, "skills", SKILL_NAME);
}
