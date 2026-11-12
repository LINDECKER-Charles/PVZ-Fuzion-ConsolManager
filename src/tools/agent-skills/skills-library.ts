/**
 * {@link AgentSkillsGateway} backed by the `skills` library (vercel-labs/skills),
 * the reference installer of the Agent Skills ecosystem: it knows where each of
 * its ~80 supported agents reads skills from, so this package keeps no such table.
 *
 * Loaded lazily: the library requires Node.js 22.20+, while the rest of the
 * CLI still runs on Node.js 20.
 */

import type * as SkillsLibrary from "skills";

import { describeError } from "../../core/text";
import { SKILL_NAME, bundledSkillDir } from "./bundled-skill";
import type {
  AgentSkillsGateway,
  DetectedAgent,
  GatewayAvailability,
  SkillInstallReport,
  SkillInstallRequest,
  SkillScope,
} from "./gateway";

type Skills = typeof SkillsLibrary;

const MIN_NODE_MAJOR = 22;
const MIN_NODE_MINOR = 20;
const SKIPPED_MESSAGE = "agent folder not found";

/** Whether `nodeVersion` (`process.versions.node`) can load the `skills` library. */
export function supportsSkillsLibrary(nodeVersion: string): boolean {
  const [major = 0, minor = 0] = nodeVersion.split(".").map(Number);
  return major > MIN_NODE_MAJOR || (major === MIN_NODE_MAJOR && minor >= MIN_NODE_MINOR);
}

class SkillsLibraryGateway implements AgentSkillsGateway {
  private readonly library: Skills;

  constructor(library: Skills) {
    this.library = library;
  }

  async detectAgents(scope: SkillScope, cwd: string): Promise<DetectedAgent[]> {
    const [{ agents }, { skills }] = await Promise.all([
      this.library.detectAgents({ cwd }),
      this.library.listSkills({ cwd, scope }),
    ]);
    const owners = new Set(
      skills.filter((skill) => skill.name === SKILL_NAME).flatMap((skill) => skill.agents),
    );
    return agents.map(({ id, name }) => ({ id, name, hasSkill: owners.has(id) }));
  }

  /**
   * Copy the bundled skill into each agent's folder.
   *
   * Copies rather than symlinks (Windows needs elevated rights for those), and
   * leaves no lock file nor telemetry behind: this CLI is the update path.
   */
  async installSkill(request: SkillInstallRequest): Promise<SkillInstallReport> {
    const result = await this.library.installSkills(bundledSkillDir(), {
      cwd: request.cwd,
      scope: request.scope,
      agents: request.agentIds,
      skills: [SKILL_NAME],
      mode: "copy",
      lockfile: false,
      telemetry: false,
    });
    return {
      installed: result.installed.map(({ agent, path }) => ({ agent, path })),
      failed: [
        ...result.failed.map(({ agent, message }) => ({ agent, message })),
        ...result.skipped.map(({ agent }) => ({ agent, message: SKIPPED_MESSAGE })),
      ],
    };
  }
}

export async function loadAgentSkillsGateway(): Promise<GatewayAvailability> {
  const nodeVersion = process.versions.node;
  if (!supportsSkillsLibrary(nodeVersion)) {
    const required = `${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}`;
    return {
      available: false,
      reason: `installing skills needs Node.js ${required} or newer (running ${nodeVersion}).`,
    };
  }
  try {
    return { available: true, gateway: new SkillsLibraryGateway(await import("skills")) };
  } catch (error) {
    const reason = `the skills library could not load: ${describeError(error)}`;
    return { available: false, reason };
  }
}
