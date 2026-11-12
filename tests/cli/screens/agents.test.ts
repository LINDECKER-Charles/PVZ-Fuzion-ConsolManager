import { describe, expect, it } from "vitest";

import { App } from "../../../src/cli/app";
import { MENU_CANCELLED } from "../../../src/cli/menus";
import { agentsScreen } from "../../../src/cli/screens/agents";
import { REMOTE_INSTALL_COMMAND } from "../../../src/tools/agent-skills/bundled-skill";
import type {
  AgentSkillsGateway,
  DetectedAgent,
  GatewayLoader,
  SkillInstallReport,
  SkillInstallRequest,
} from "../../../src/tools/agent-skills/gateway";
import { AppSettings } from "../../../src/settings";
import { fakeDeps } from "../_fakes";

const GLOBAL = 1;
const PROJECT = 2;
const CWD = "/work/translations";

const CLAUDE: DetectedAgent = { id: "claude-code", name: "Claude Code", hasSkill: true };
const CODEX: DetectedAgent = { id: "codex", name: "Codex", hasSkill: false };

class FakeGateway implements AgentSkillsGateway {
  readonly requests: SkillInstallRequest[] = [];
  detectedScope: string | null = null;

  constructor(
    private readonly agents: DetectedAgent[],
    private readonly report: SkillInstallReport = { installed: [], failed: [] },
  ) {}

  detectAgents(scope: string): Promise<DetectedAgent[]> {
    this.detectedScope = scope;
    return Promise.resolve(this.agents);
  }

  installSkill(request: SkillInstallRequest): Promise<SkillInstallReport> {
    this.requests.push(request);
    return Promise.resolve(this.report);
  }
}

const available =
  (gateway: AgentSkillsGateway): GatewayLoader =>
  () =>
    Promise.resolve({ available: true, gateway });

interface Recorder {
  warns: string[];
  infos: string[];
  successes: string[];
  errors: string[];
}

function makeApp(
  overrides: Parameters<typeof fakeDeps>[0] = {},
): { app: App; out: Recorder } {
  const out: Recorder = { warns: [], infos: [], successes: [], errors: [] };
  const deps = fakeDeps({
    askChoice: () => Promise.resolve(GLOBAL),
    warn: (m) => out.warns.push(m),
    info: (m) => out.infos.push(m),
    success: (m) => out.successes.push(m),
    error: (m) => out.errors.push(m),
    ...overrides,
  });
  return { app: new App({ settings: new AppSettings(), deps, cwd: CWD }), out };
}

describe("AI agents screen", () => {
  it("falls back to the shell command when the installer is unavailable", async () => {
    const { app, out } = makeApp();
    const loader: GatewayLoader = () =>
      Promise.resolve({ available: false, reason: "needs Node.js 22.20" });

    await agentsScreen(loader)(app);

    expect(out.warns.join()).toContain("needs Node.js 22.20");
    expect(out.infos.join()).toContain(REMOTE_INSTALL_COMMAND);
  });

  it("falls back when no agent is detected", async () => {
    const gateway = new FakeGateway([]);
    const { app, out } = makeApp();

    await agentsScreen(available(gateway))(app);

    expect(out.warns.join()).toContain("No coding agent detected");
    expect(gateway.requests).toHaveLength(0);
  });

  it("preselects the agents missing the skill and reports the install", async () => {
    const report = { installed: [{ agent: "codex", path: "/home/.codex/skills" }], failed: [] };
    const gateway = new FakeGateway([CLAUDE, CODEX], report);
    let checked: readonly string[] = [];
    const { app, out } = makeApp({
      askMultiSelect: (_l, _o, initial) => {
        checked = initial;
        return Promise.resolve([...initial]);
      },
    });

    await agentsScreen(available(gateway))(app);

    expect(checked).toEqual(["codex"]);
    expect(gateway.requests).toEqual([{ agentIds: ["codex"], scope: "global", cwd: CWD }]);
    expect(out.successes.join()).toContain("codex → /home/.codex/skills");
    expect(out.infos.join()).toContain("restart");
  });

  it("preselects every agent when all already have the skill", async () => {
    const gateway = new FakeGateway([CLAUDE, { ...CODEX, hasSkill: true }]);
    const { app } = makeApp({ askChoice: () => Promise.resolve(PROJECT) });

    await agentsScreen(available(gateway))(app);

    expect(gateway.detectedScope).toBe("project");
    expect(gateway.requests[0]?.agentIds).toEqual(["claude-code", "codex"]);
  });

  it("reports the agents the installer could not reach", async () => {
    const report = { installed: [], failed: [{ agent: "codex", message: "read-only" }] };
    const { app, out } = makeApp();

    await agentsScreen(available(new FakeGateway([CODEX], report)))(app);

    expect(out.errors.join()).toContain("codex: read-only");
    expect(out.infos.join()).not.toContain("restart");
  });

  it("installs nothing when the scope menu is escaped", async () => {
    const gateway = new FakeGateway([CODEX]);
    const { app } = makeApp({ askChoice: () => Promise.resolve(MENU_CANCELLED) });

    await agentsScreen(available(gateway))(app);

    expect(gateway.detectedScope).toBeNull();
  });

  it("installs nothing when the agent selection is cancelled", async () => {
    const gateway = new FakeGateway([CODEX]);
    const { app } = makeApp({ askMultiSelect: () => Promise.resolve(null) });

    await agentsScreen(available(gateway))(app);

    expect(gateway.requests).toHaveLength(0);
  });

  it("turns an installer crash into the fallback", async () => {
    const gateway = new FakeGateway([CODEX]);
    gateway.installSkill = () => Promise.reject(new Error("EACCES"));
    const { app, out } = makeApp();

    await agentsScreen(available(gateway))(app);

    expect(out.warns.join()).toContain("Installation failed: EACCES");
    expect(out.infos.join()).toContain(REMOTE_INSTALL_COMMAND);
  });
});
