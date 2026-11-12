/**
 * Port to the Agent Skills installer.
 *
 * The TUI depends on this contract only; the implementation backed by the
 * `skills` library lives in `skills-library.ts`, and tests substitute a fake.
 */

/** `global`: the user's home, every project. `project`: the working directory only. */
export type SkillScope = "global" | "project";

/** A coding agent found on this machine, and whether our skill is already there. */
export interface DetectedAgent {
  /** Identifier understood by the installer, e.g. `claude-code`. */
  id: string;
  /** Display name, e.g. `Claude Code`. */
  name: string;
  hasSkill: boolean;
}

export interface SkillInstallRequest {
  agentIds: readonly string[];
  scope: SkillScope;
  /** Project directory, used by the `project` scope. */
  cwd: string;
}

export interface SkillInstallReport {
  installed: ReadonlyArray<{ agent: string; path: string }>;
  failed: ReadonlyArray<{ agent: string; message: string }>;
}

export interface AgentSkillsGateway {
  detectAgents(scope: SkillScope, cwd: string): Promise<DetectedAgent[]>;
  installSkill(request: SkillInstallRequest): Promise<SkillInstallReport>;
}

/** The installer, or why it cannot run here (Node.js too old, library missing). */
export type GatewayAvailability =
  | { available: true; gateway: AgentSkillsGateway }
  | { available: false; reason: string };

export type GatewayLoader = () => Promise<GatewayAvailability>;
