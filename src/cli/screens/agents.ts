/** "AI agents" — install the pvzf-console Agent Skill into the coding agents found here. */

import { REMOTE_INSTALL_COMMAND, SKILL_NAME } from "../../tools/agent-skills/bundled-skill";
import type {
  AgentSkillsGateway,
  DetectedAgent,
  GatewayLoader,
  SkillInstallReport,
  SkillScope,
} from "../../tools/agent-skills/gateway";
import { loadAgentSkillsGateway } from "../../tools/agent-skills/skills-library";
import { describeError } from "../../core/text";
import type { AppContext } from "../context";
import type { MenuOption } from "../menus";
import type { MenuAction } from "./menu-loop";

const TITLE = "AI agents";
const SUBTITLE =
  "Installs the pvzf-console skill (Agent Skills standard) so coding agents " +
  "such as Claude Code, Codex or Cursor know how to drive this CLI.";
const GLOBAL_KEY = 1;
const PROJECT_KEY = 2;
const NAME_COLUMN_PADDING = 2;

function scopeOptions(cwd: string): MenuOption[] {
  return [
    { key: String(GLOBAL_KEY), label: "Every project", hint: "your user folder" },
    { key: String(PROJECT_KEY), label: "This folder only", hint: cwd },
  ];
}

/** `null` when the menu is escaped. */
async function askScope(app: AppContext): Promise<SkillScope | null> {
  const choice = await app.deps.askChoice("Install the skill for", scopeOptions(app.cwd));
  if (choice === GLOBAL_KEY) return "global";
  if (choice === PROJECT_KEY) return "project";
  return null;
}

/** Explain why nothing can be installed from here, and the shell alternative. */
async function showFallback(app: AppContext, problem: string): Promise<void> {
  app.deps.warn(problem);
  app.deps.info(`From a shell instead: ${REMOTE_INSTALL_COMMAND}`);
  await app.deps.pressEnterToContinue();
}

function printAgents(app: AppContext, agents: readonly DetectedAgent[]): void {
  const width = Math.max(...agents.map((agent) => agent.name.length)) + NAME_COLUMN_PADDING;
  app.deps.panel(
    agents.map(
      (agent) => `${agent.name.padEnd(width)}${agent.hasSkill ? "installed" : "not installed"}`,
    ),
    "Detected agents",
  );
}

/** Tick the agents still missing the skill; when none is, tick all (update). */
function preselected(agents: readonly DetectedAgent[]): string[] {
  const missing = agents.filter((agent) => !agent.hasSkill);
  return (missing.length > 0 ? missing : agents).map((agent) => agent.id);
}

function printReport(app: AppContext, report: SkillInstallReport): void {
  for (const { agent, path } of report.installed) {
    app.deps.success(`${agent} → ${path}`);
  }
  for (const { agent, message } of report.failed) {
    app.deps.error(`${agent}: ${message}`);
  }
  if (report.installed.length > 0) {
    app.deps.info("Agents load skills when a session starts: restart the open ones.");
  }
}

async function installFlow(app: AppContext, gateway: AgentSkillsGateway): Promise<void> {
  const scope = await askScope(app);
  if (scope === null) return;

  const agents = await gateway.detectAgents(scope, app.cwd);
  if (agents.length === 0) {
    await showFallback(app, "No coding agent detected on this machine.");
    return;
  }
  printAgents(app, agents);

  const options = agents.map((agent) => ({ value: agent.id, label: agent.name }));
  const chosen = await app.deps.askMultiSelect(
    `Install ${SKILL_NAME} for`,
    options,
    preselected(agents),
  );
  if (chosen === null) return;

  printReport(app, await gateway.installSkill({ agentIds: chosen, scope, cwd: app.cwd }));
  await app.deps.pressEnterToContinue();
}

/** Build the screen; `loadGateway` is injectable so tests never touch the real home. */
export function agentsScreen(loadGateway: GatewayLoader = loadAgentSkillsGateway): MenuAction {
  return async (app) => {
    app.deps.header(TITLE, SUBTITLE);
    const availability = await loadGateway();
    if (!availability.available) {
      await showFallback(app, `Cannot install from here: ${availability.reason}`);
      return;
    }
    try {
      await installFlow(app, availability.gateway);
    } catch (error) {
      await showFallback(app, `Installation failed: ${describeError(error)}`);
    }
  };
}
