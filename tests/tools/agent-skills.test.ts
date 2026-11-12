import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { SKILL_NAME, bundledSkillDir } from "../../src/tools/agent-skills/bundled-skill";
import {
  loadAgentSkillsGateway,
  supportsSkillsLibrary,
} from "../../src/tools/agent-skills/skills-library";

const CLAUDE_CODE = "claude-code";
const canLoadLibrary = supportsSkillsLibrary(process.versions.node);

describe("supportsSkillsLibrary", () => {
  it.each([
    ["20.19.0", false],
    ["22.19.9", false],
    ["22.20.0", true],
    ["22.23.4", true],
    ["24.0.0", true],
    ["garbage", false],
  ])("Node.js %s → %s", (version, expected) => {
    expect(supportsSkillsLibrary(version)).toBe(expected);
  });
});

describe("bundled skill", () => {
  it("ships a SKILL.md whose frontmatter names the skill", () => {
    const skill = readFileSync(path.join(bundledSkillDir(), "SKILL.md"), "utf-8").replaceAll(
      "\r\n",
      "\n",
    );
    const frontmatter = skill.split(/^---$/m)[1] ?? "";
    expect(frontmatter).toContain(`\nname: ${SKILL_NAME}\n`);
    expect(frontmatter).toContain("\ndescription: ");
  });
});

describe("loadAgentSkillsGateway", () => {
  it.skipIf(canLoadLibrary)("reports the installer unavailable on old Node.js", async () => {
    const availability = await loadAgentSkillsGateway();
    expect(availability).toMatchObject({ available: false });
  });
});

// Project scope only: the global scope writes under the real home directory.
describe.skipIf(!canLoadLibrary)("skills library gateway (project scope)", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "pvzf-skills-"));
  });
  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  async function gateway() {
    const availability = await loadAgentSkillsGateway();
    if (!availability.available) {
      throw new Error(availability.reason);
    }
    return availability.gateway;
  }

  it("copies the bundled skill into the agent's project folder", async () => {
    const report = await (
      await gateway()
    ).installSkill({ agentIds: [CLAUDE_CODE], scope: "project", cwd });

    expect(report.failed).toEqual([]);
    expect(report.installed.map(({ agent }) => agent)).toEqual([CLAUDE_CODE]);
    expect(existsSync(path.join(cwd, ".claude", "skills", SKILL_NAME, "SKILL.md"))).toBe(true);
  });

  it("flags the detected agents that already have the skill", async () => {
    const skills = await gateway();
    await skills.installSkill({ agentIds: [CLAUDE_CODE], scope: "project", cwd });

    const agents = await skills.detectAgents("project", cwd);

    // Detection depends on the machine; only an agent that is present can be checked.
    for (const agent of agents.filter(({ id }) => id === CLAUDE_CODE)) {
      expect(agent.hasSkill).toBe(true);
    }
    expect(agents.every(({ hasSkill }) => typeof hasSkill === "boolean")).toBe(true);
  });
});
